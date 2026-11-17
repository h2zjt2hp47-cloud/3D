// De motor van de tijdperken: een tijdperk starten, en overgaan naar het volgende.
//
// Bij een overgang krijgt elk tijdperk zijn eigen machten en grenzen (de grote lijn van de
// geschiedenis), maar het land van de speler blijft van de speler, onder de opvolger die hij kiest.
// Bevolking en gebouwen gaan mee.
import { kaart as standaardKaart, naarKaart, TERREIN, vakBij, type Kaart } from '../kaart/kaart';
import { dagnummerVan, type Datum } from './kalender';
import {
  meld, paar, sluitBond, sterkteVan, vakkenVan, verklaarOorlog, wie,
  type Buitenmacht, type Factie, type Soort, type Toestand, type VakToestand,
} from './toestand';
import { maakVorst } from './vorsten';
import { rang, TIJDPERKEN, type TijdperkId } from './volgorde';

export interface FactieDef {
  id: string;
  naam: string;
  kleur: string;
  soort: Soort;
  kwaliteit?: number;
  heerser: string;
  /** leeftijd van de heerser bij de start (ruw) */
  leeftijd?: number;
  titel?: string;
  dynastie?: string;
  beschrijving: string;
  /** [breedte, lengte]; het eerste punt is de hoofdplaats */
  kernen: [number, number][];
  /** hele gebieden van nu die bij deze macht horen (gaan voor op de kernen) */
  gebieden?: string[];
  buiten?: Buitenmacht;
  /** deel van de bevolking dat bij de start onder de wapens staat (standaard 0,04) */
  leger?: number;
  startLegers?: { sterkte: number; naam: string; bij?: [number, number] }[];
  /** groep op het keuzescherm */
  groep: string;
  /** geen vorstenhuis (stammen, republieken) */
  geenVorst?: boolean;
  /** kan niet gekozen worden als speler */
  nietKiesbaar?: boolean;
  /** duikt pas later in het tijdperk op (via een gebeurtenis) */
  laat?: boolean;
}

export interface GebeurtenisDef {
  id: string;
  datum: Datum;
  titel: string;
  tekst: string | ((t: Toestand) => string);
  /** nog niet nagekeken of omstreden */
  onzeker?: boolean;
  voorwaarde?: (t: Toestand) => boolean;
  doe?: (t: Toestand, k: Kaart) => void;
  /** enkel een bericht, geen venster */
  stil?: boolean;
  opties?: { tekst: string; doe?: (t: Toestand, k: Kaart) => void; uitleg?: string }[];
  /** wie mag kiezen (anders gebeurt de eerste optie vanzelf); zonder lijst kiest de speler altijd */
  keuzeVoor?: string[];
}

export interface Tijdperk {
  id: TijdperkId;
  naam: string;
  van: Datum;
  tot: Datum;
  beschrijving: string;
  /** totale bevolking van het speelgebied bij de start (ruwe schatting) */
  bevolking: number;
  facties: FactieDef[];
  oorlog?: [string, string][];
  bond?: [string, string][];
  /** [onderworpen, heer] */
  heer?: [string, string][];
  /** [leenman, leenheer]: verband in naam, de leenman blijft zelfstandig */
  leen?: [string, string][];
  versterkingen: { naam: string; ligging: [number, number]; bezetting: number }[];
  /** voornamen voor verzonnen opvolgers */
  namen: string[];
  gebeurtenissen: GebeurtenisDef[];
  /** mogen computerspelers zelf oorlogen beginnen? */
  kiOorlog?: boolean;
  /** oorlogen tussen computerspelers eindigen alleen door gebeurtenissen (bv. de wereldoorlogen) */
  geenVredeTussenComputers?: boolean;
  /** kan je huwelijken sluiten? */
  huwelijken?: boolean;
  /** iets dat elke maand gebeurt in dit tijdperk */
  maandelijks?: (t: Toestand, k: Kaart) => void;
  /** extra startregels, bv. Caesar met zijn legioenen */
  bijStart?: (t: Toestand, k: Kaart) => void;
}

const register = new Map<string, Tijdperk>();
export function registreer(tp: Tijdperk) { register.set(tp.id, tp); }
export function tijdperk(id: string): Tijdperk {
  const tp = register.get(id);
  if (!tp) throw new Error(`Onbekend tijdperk ${id}`);
  return tp;
}
export function alleTijdperken(): Tijdperk[] {
  return TIJDPERKEN.filter((id) => register.has(id)).map((id) => register.get(id)!);
}
export function volgendTijdperk(id: string): Tijdperk | null {
  const r = rang(id);
  for (let i = r + 1; i < TIJDPERKEN.length; i++) if (register.has(TIJDPERKEN[i])) return register.get(TIJDPERKEN[i])!;
  return null;
}
export const startdag = (tp: Tijdperk) => dagnummerVan(tp.van);
export const einddag = (tp: Tijdperk) => dagnummerVan(tp.tot);

/** welke factie krijgt welk vak bij de start van een tijdperk */
export function verdeel(tp: Tijdperk, k: Kaart): string[] {
  const facties = tp.facties.filter((f) => !f.laat);
  const kernen = facties.flatMap((f) => f.kernen.map((p) => ({ id: f.id, p: naarKaart(k, p[0], p[1]) })));
  return k.vakken.map((v) => {
    const kandidaten = facties.filter((f) => f.gebieden?.includes(v.gebied));
    const ids = kandidaten.length ? new Set(kandidaten.map((f) => f.id)) : null;
    let beste = '', min = Infinity;
    for (const kern of kernen) {
      if (ids && !ids.has(kern.id)) continue;
      if (!ids && facties.find((f) => f.id === kern.id)?.gebieden?.length) continue;
      const d = Math.hypot(kern.p[0] - v.midden[0], kern.p[1] - v.midden[1]);
      if (d < min) { min = d; beste = kern.id; }
    }
    if (!beste && kandidaten.length) beste = kandidaten[0].id;
    if (!beste) {
      // geen kern in de buurt: dichtste kern van wie dan ook
      for (const kern of kernen) {
        const d = Math.hypot(kern.p[0] - v.midden[0], kern.p[1] - v.midden[1]);
        if (d < min) { min = d; beste = kern.id; }
      }
    }
    return beste;
  });
}

function nieuweFactie(t: Toestand, tp: Tijdperk, d: FactieDef, k: Kaart): Factie {
  return {
    id: d.id, naam: d.naam, kleur: d.kleur, kwaliteit: d.kwaliteit ?? 1, soort: d.soort, heerser: d.heerser,
    titel: d.titel ?? '', dynastie: d.dynastie ?? '', beschrijving: d.beschrijving,
    vorst: d.geenVorst ? null : { ...maakVorst(t, d.heerser, d.leeftijd ?? 35, false), erfgenaam: true },
    hoofdstad: d.kernen.length ? vakBij(k, d.kernen[0][0], d.kernen[0][1]) : null,
    mankracht: 0, heer: null, bestaat: true, vakkenBijStart: 0, schat: 0, belasting: 'gewoon', inkomenVorigeMaand: 0,
    moeheid: 0, buiten: d.buiten ?? null, tijdperk: tp.id,
  };
}

export function nieuwLeger(t: Toestand, factie: string, vak: number, sterkte: number, naam?: string) {
  const id = t.volgendLeger++;
  t.legers.push({
    id, naam: naam ?? `${t.facties[factie].naam}, leger ${id}`, factie, vak, sterkte: Math.round(sterkte), moraal: 1,
    pad: [], voortgang: 0, overgestoken: 0, inStrijd: false,
  });
  return t.legers[t.legers.length - 1];
}

/** grensvak waar een buitenmacht binnenkomt: eigen of bevriend, zonder vijand, dichtst bij de ingang */
export function ingang(t: Toestand, f: string, k: Kaart = standaardKaart): number {
  const fac = t.facties[f];
  const doel = fac.buiten ? naarKaart(k, fac.buiten.ingang[0], fac.buiten.ingang[1]) : k.vakken[fac.hoofdstad ?? 0].midden;
  const afstand = (i: number) => Math.hypot(k.vakken[i].midden[0] - doel[0], k.vakken[i].midden[1] - doel[1]);
  const vrij = (i: number) => !t.legers.some((l) => l.vak === i && t.oorlog.includes(paar(l.factie, f)));
  const grens = k.vakken.filter((v) => v.grens || v.kust).map((v) => v.id);
  const eigen = grens.filter((i) => {
    const e = t.vakken[i].eigenaar;
    return (e === f || t.facties[e]?.heer === f || t.bond.includes(paar(e, f))) && vrij(i);
  });
  const lijst = eigen.length ? eigen : grens.filter(vrij);
  return (lijst.length ? lijst : grens).sort((a, b) => afstand(a) - afstand(b))[0];
}

function startLegers(t: Toestand, tp: Tijdperk, k: Kaart) {
  for (const d of tp.facties) {
    const f = t.facties[d.id];
    if (d.laat) continue;
    if (d.startLegers) {
      for (const l of d.startLegers) {
        const vak = l.bij ? vakBij(k, l.bij[0], l.bij[1]) : f.hoofdstad ?? ingang(t, d.id, k);
        nieuwLeger(t, d.id, vak, l.sterkte, l.naam);
      }
      continue;
    }
    if (d.buiten && !d.kernen.length) continue;
    const eigen = vakkenVan(t, d.id);
    if (!eigen.length || f.hoofdstad === null) continue;
    const volk = eigen.reduce((s, i) => s + t.vakken[i].bevolking, 0);
    const sterkte = Math.round((volk * (d.leger ?? 0.04)) / 100) * 100;
    if (sterkte < 500) continue;
    const plek = eigen.includes(f.hoofdstad) ? f.hoofdstad : eigen[0];
    if (sterkte > 9000) {
      nieuwLeger(t, d.id, plek, Math.round((sterkte * 0.6) / 100) * 100, `Leger van ${f.naam}`);
      const tweede = k.vakken[plek].buren.find((b) => t.vakken[b].eigenaar === d.id) ?? plek;
      nieuwLeger(t, d.id, tweede, Math.round((sterkte * 0.4) / 100) * 100, `Tweede leger van ${f.naam}`);
    } else nieuwLeger(t, d.id, plek, sterkte, `Leger van ${f.naam}`);
  }
}

function lege(): Omit<VakToestand, 'eigenaar' | 'oorsprong' | 'bevolking'> {
  return {
    fort: 0, fortNaam: null, garnizoen: 0, bezetting: 0, bezetter: null, tevredenheid: 65, sindsVerovering: 0,
    landbouw: 0, markt: 0, weg: 0, haven: 0, nijverheid: 0, bouw: null,
  };
}

/** een spel beginnen in een tijdperk, als een gekozen factie */
export function nieuwSpelIn(tpId: string, speler: string, zaad: number, k: Kaart = standaardKaart): Toestand {
  const tp = tijdperk(tpId);
  const t: Toestand = {
    versie: 3, dag: startdag(tp), zaad, speler, tijdperk: tp.id, facties: {}, vakken: [], legers: [], volgendLeger: 1,
    oorlog: [], oorlogen: {}, bond: [], huwelijk: [], bestand: {}, opinie: {}, berichten: [], gedaan: [], wachtend: [],
    onderwerpVraagNa: 0, scores: [],
  };
  const verdeling = verdeel(tp, k);
  const totaal = k.vakken.reduce((s, v) => s + TERREIN[v.terrein].bevolking * (v.oppervlakte / 235) * (v.rivier ? 1.15 : 1), 0);
  t.vakken = k.vakken.map((v, i) => ({
    ...lege(), eigenaar: verdeling[i], oorsprong: verdeling[i],
    bevolking: Math.round((TERREIN[v.terrein].bevolking * (v.oppervlakte / 235) * (v.rivier ? 1.15 : 1) * (tp.bevolking / totaal)) / 100) * 100,
  }));
  vulTijdperk(t, tp, k);
  return t;
}

/** facties, versterkingen, relaties en legers van een tijdperk invullen (vakken zijn al verdeeld) */
function vulTijdperk(t: Toestand, tp: Tijdperk, k: Kaart) {
  t.facties = {};
  for (const d of tp.facties) t.facties[d.id] = nieuweFactie(t, tp, d, k);
  for (const f of tp.versterkingen) {
    const v = vakBij(k, f.ligging[0], f.ligging[1]);
    Object.assign(t.vakken[v], { fort: f.bezetting, fortNaam: f.naam, garnizoen: f.bezetting });
  }
  for (const f of Object.values(t.facties)) {
    const eigen = vakkenVan(t, f.id);
    const volk = eigen.reduce((s, i) => s + t.vakken[i].bevolking, 0);
    f.vakkenBijStart = eigen.length;
    f.mankracht = Math.round(volk * 0.02) + (f.buiten ? f.buiten.doelSterkte * 0.2 : 0);
    f.schat = Math.round((volk / 1000) * 0.5 * 3 + (f.buiten ? f.buiten.steun * 3 : 0));
    if (f.hoofdstad !== null && t.vakken[f.hoofdstad].eigenaar !== f.id && eigen.length) f.hoofdstad = eigen[0];
    if (!eigen.length && !f.buiten) f.hoofdstad = null;
  }
  for (const [a, b] of tp.bond ?? []) sluitBond(t, a, b);
  for (const [a, b] of tp.oorlog ?? []) verklaarOorlog(t, a, b);
  for (const [v, h] of tp.heer ?? []) if (t.facties[v]) t.facties[v].heer = h;
  for (const [v, h] of tp.leen ?? []) if (t.facties[v]) t.facties[v].leenheer = h;
  startLegers(t, tp, k);
  tp.bijStart?.(t, k);
  // wie bij de start geen land en geen legers heeft en niet van buiten komt, bestaat (nog) niet
  for (const f of Object.values(t.facties)) {
    if (!vakkenVan(t, f.id).length && !f.buiten && sterkteVan(t, f.id) === 0) f.bestaat = false;
    if (tp.facties.find((d) => d.id === f.id)?.laat) f.bestaat = false;
  }
  t.wachtend.push({
    id: `intro-${tp.id}`, titel: tp.naam,
    tekst: `${tp.beschrijving}\n\nJe speelt ${wie(t, t.speler)}${t.facties[t.speler].heerser ? ` (${t.facties[t.speler].heerser})` : ''}. ${t.facties[t.speler].beschrijving}`,
    opties: [{ tekst: 'Begin', gevolg: 'niets' }],
  });
}

/** wie kan de speler opvolgen in het volgende tijdperk? (meeste overlap met zijn land) */
export function opvolgers(t: Toestand, volgend: Tijdperk, k: Kaart = standaardKaart): { id: string; naam: string; vakken: number }[] {
  const verdeling = verdeel(volgend, k);
  const mijn = vakkenVan(t, t.speler);
  const basis = mijn.length ? mijn : t.vakken.map((_, i) => i).filter((i) => t.vakken[i].oorsprong === t.speler);
  const telling = new Map<string, number>();
  for (const i of basis) telling.set(verdeling[i], (telling.get(verdeling[i]) ?? 0) + 1);
  const lijst = [...telling.entries()]
    .map(([id, n]) => ({ id, n, d: volgend.facties.find((f) => f.id === id)! }))
    .filter((x) => x.d && !x.d.nietKiesbaar)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((x) => ({ id: x.id, naam: x.d.naam, vakken: x.n }));
  if (!lijst.length) {
    const d = volgend.facties.find((f) => !f.nietKiesbaar)!;
    lijst.push({ id: d.id, naam: d.naam, vakken: 0 });
  }
  return lijst;
}

/** naar het volgende tijdperk, als de gekozen opvolger */
export function doeOvergang(t: Toestand, volgendId: string, opvolger: string, k: Kaart = standaardKaart) {
  const volgend = tijdperk(volgendId);
  const oudeSpeler = t.facties[t.speler];
  const mijnLand = new Set(vakkenVan(t, t.speler));
  const mijnLeger = sterkteVan(t, t.speler);
  const mijnSchat = Math.max(0, oudeSpeler.schat);
  const vrij = !oudeSpeler.heer;
  const verdeling = verdeel(volgend, k);
  // het land van de speler blijft van de speler (als hij vrij was)
  if (vrij) for (const i of mijnLand) verdeling[i] = opvolger;
  // bevolking schalen naar de schatting van het nieuwe tijdperk; gebouwen blijven
  const nu = t.vakken.reduce((s, v) => s + v.bevolking, 0);
  const factor = volgend.bevolking / Math.max(1, nu);
  t.vakken = t.vakken.map((v, i) => ({
    ...v,
    eigenaar: verdeling[i], oorsprong: verdeling[i],
    bevolking: Math.round((v.bevolking * factor) / 100) * 100,
    tevredenheid: 60, sindsVerovering: t.dag, bezetter: null, bezetting: 0, bouw: null,
    // oude versterkingen vervallen, behalve in het land van de speler
    fort: vrij && mijnLand.has(i) ? v.fort : 0,
    fortNaam: vrij && mijnLand.has(i) ? v.fortNaam : null,
    garnizoen: vrij && mijnLand.has(i) ? v.fort : 0,
  }));
  t.legers = [];
  t.oorlog = []; t.oorlogen = {}; t.bond = []; t.huwelijk = []; t.bestand = {}; t.opinie = {};
  t.wachtend = t.wachtend.filter((w) => w.id.startsWith('overgang'));
  t.speler = opvolger;
  t.tijdperk = volgend.id;
  vulTijdperk(t, volgend, k);
  // de opvolger erft een deel van de kracht van de speler
  const f = t.facties[opvolger];
  f.bestaat = true;
  f.schat += Math.round(mijnSchat * 0.5);
  if (mijnLeger > 0) {
    const plek = f.hoofdstad !== null && t.vakken[f.hoofdstad].eigenaar === opvolger ? f.hoofdstad : vakkenVan(t, opvolger)[0] ?? ingang(t, opvolger, k);
    nieuwLeger(t, opvolger, plek, Math.round((mijnLeger * 0.5) / 100) * 100, `Veteranen van ${oudeSpeler.naam}`);
  }
  if (f.hoofdstad === null || t.vakken[f.hoofdstad].eigenaar !== opvolger) f.hoofdstad = vakkenVan(t, opvolger)[0] ?? f.hoofdstad;
  f.vakkenBijStart = vakkenVan(t, opvolger).length;
  meld(t, `Een nieuw tijdperk: ${volgend.naam}. Je speelt verder als ${f.naam}.`, 'gebeurtenis');
}

export { register as tijdperkRegister };
