// Wat er boven de dagelijkse regels gebeurt: de gebeurtenissen van het tijdperk, de overgang naar het
// volgende tijdperk, en elke maand economie, diplomatie, vorsten, versterkingen van buiten,
// onderwerping, opstand en opvolging.
import { kaart as standaardKaart, type Kaart } from '../kaart/kaart';
import { datumTekst, datumVan, dagnummerVan } from './kalender';
import { kiBeurt } from './ki';
import { inkomenVak, kiEconomie, maandEconomie } from './economie';
import { kiOorlog, maandDiplomatie, sluitVredeAf, vijanden } from './diplomatie';
import { onderwerp, opstand } from './effecten';
import { dagStap, verdwijn } from './regels';
import { doeOvergang, einddag, ingang, nieuwLeger, nieuwSpelIn, opvolgers, tijdperk, volgendTijdperk } from './tijdperk';
import './tijdperken';
import {
  hoofd, inOorlog, kans, meld, mens, sterkteVan, vakkenVan, type Keuze, type Toestand,
} from './toestand';
import { lijfIn, maandVorsten } from './vorsten';
import { prijsfactor } from './volgorde';

export function nieuwSpel(speler: string, zaad = 57, tijdperkId = 'romeinen', k: Kaart = standaardKaart): Toestand {
  return nieuwSpelIn(tijdperkId, speler, zaad, k);
}

/** één dag verder; geeft false als de klok moet stoppen voor een keuze */
export function volgendeDag(t: Toestand, k: Kaart = standaardKaart): boolean {
  if (t.wachtend.length) return false;
  vasteGebeurtenissen(t, k);
  if (t.wachtend.length) return false;
  dagStap(t, k);
  if (datumVan(t.dag).dag === 1) maandelijks(t, k);
  const ids = Object.keys(t.facties);
  ids.forEach((f, i) => {
    if (!mens(t, f) && (t.dag + i) % 3 === 0) kiBeurt(t, f, k);
  });
  opvolging(t, k);
  return !t.wachtend.length;
}

/** is er nu niets aan de hand voor de speler? dan mag de klok sneller */
export function rustig(t: Toestand): boolean {
  return !vijanden(t, t.speler).length && !t.legers.some((l) => l.factie === t.speler && l.pad.length);
}

/** de volgende vaste gebeurtenis (of het einde van het tijdperk) */
export function volgendeGebeurtenis(t: Toestand): { dag: number; titel: string } | null {
  const tp = tijdperk(t.tijdperk);
  const lijst = tp.gebeurtenissen
    .filter((g) => !t.gedaan.includes(g.id) && !g.stil)
    .map((g) => ({ dag: dagnummerVan(g.datum), titel: g.titel }));
  lijst.push({ dag: einddag(tp), titel: `Einde van het tijdperk: ${tp.naam}` });
  return lijst.filter((x) => x.dag >= t.dag).sort((a, b) => a.dag - b.dag)[0] ?? null;
}

// ---------- gebeurtenissen ----------

export function vasteGebeurtenissen(t: Toestand, k: Kaart = standaardKaart) {
  const tp = tijdperk(t.tijdperk);
  for (const g of tp.gebeurtenissen) {
    if (t.gedaan.includes(g.id) || dagnummerVan(g.datum) > t.dag) continue;
    t.gedaan.push(g.id);
    if (g.voorwaarde && !g.voorwaarde(t)) continue;
    g.doe?.(t, k);
    const tekst = typeof g.tekst === 'function' ? g.tekst(t) : g.tekst;
    // kiest de speler, of gebeurt de eerste optie vanzelf?
    const kiest = !!g.opties && !t.automatisch && (!g.keuzeVoor || g.keuzeVoor.includes(t.speler) || g.keuzeVoor.includes(hoofd(t, t.speler)));
    if (g.opties && !kiest) g.opties[0].doe?.(t, k);
    if (g.stil) { meld(t, tekst, 'gebeurtenis'); continue; }
    meld(t, g.titel, 'gebeurtenis');
    t.wachtend.push({
      id: `gebeurtenis-${g.id}`, titel: g.titel,
      tekst: tekst + (g.onzeker ? '\n\n(Datum of details nog na te kijken.)' : ''),
      opties: kiest
        ? g.opties!.map((o, i) => ({ tekst: o.tekst, gevolg: `gebeurtenis:${tp.id}:${g.id}:${i}`, uitleg: o.uitleg }))
        : [{ tekst: 'Verder', gevolg: 'niets' }],
    });
  }
  // einde van het tijdperk
  const sleutel = `overgang-${tp.id}`;
  if (t.dag >= einddag(tp) && !t.gedaan.includes(sleutel)) {
    t.gedaan.push(sleutel);
    bewaarScore(t);
    const volgend = volgendTijdperk(tp.id);
    const s = score(t, t.speler);
    if (!volgend) {
      t.wachtend.push({
        id: 'einde', titel: 'Het heden',
        tekst: `Je bent aangekomen in het heden. ${eindrapport(t)}\n\nJe kan verder spelen.`,
        opties: [{ tekst: 'Verder spelen', gevolg: 'niets' }],
      });
      return;
    }
    const lijst = opvolgers(t, volgend, k);
    t.wachtend.push({
      id: `overgang-${volgend.id}`, titel: `${tp.naam} loopt af`,
      tekst: `Score van ${t.facties[t.speler].naam} in dit tijdperk: welvaart ${s.welvaart}, macht ${s.macht}, vrijheid ${s.vrijheid}.\n\nHet volgende tijdperk: ${volgend.naam} (${datumTekst(dagnummerVan(volgend.van))}). De grote lijn van de geschiedenis gaat door, maar je land blijft van jou. Onder wie speel je verder?`,
      opties: lijst.map((o) => ({ tekst: `${o.naam}`, gevolg: `overgang:${volgend.id}:${o.id}`, uitleg: o.vakken ? `${o.vakken} van je vakken liggen in hun gebied` : '' })),
    });
  }
}

/** de speler kiest een optie */
export function kies(t: Toestand, k: Kaart, keuzeId: string, optie: number) {
  const i = t.wachtend.findIndex((x) => x.id === keuzeId);
  if (i < 0) return;
  const keuze = t.wachtend[i];
  t.wachtend.splice(i, 1);
  const gevolg = keuze.opties[optie]?.gevolg ?? 'niets';
  const [soort, a, b, c] = gevolg.split(':');
  if (soort === 'onderwerpen') onderwerp(t, t.speler, a);
  else if (soort === 'doorvechten') t.onderwerpVraagNa = t.dag + 180;
  else if (soort === 'vrede') { if (t.facties[a] && inOorlog(t, t.speler, a)) sluitVredeAf(t, a, hoofd(t, t.speler)); }
  else if (soort === 'gebeurtenis') {
    const g = tijdperk(a).gebeurtenissen.find((x) => x.id === b);
    g?.opties?.[Number(c)]?.doe?.(t, k);
  } else if (soort === 'overgang') {
    // eerst het tijdperk verder zetten tot de start van het volgende
    const volgend = tijdperk(a);
    t.dag = Math.max(t.dag, dagnummerVan(volgend.van));
    doeOvergang(t, a, b, k);
  }
}

// ---------- maandelijks ----------

function maandelijks(t: Toestand, k: Kaart) {
  const tp = tijdperk(t.tijdperk);
  const d = datumVan(t.dag);
  maandEconomie(t, k);
  maandDiplomatie(t, k, !!tp.geenVredeTussenComputers);
  maandVorsten(t, tp.namen);
  tp.maandelijks?.(t, k);
  for (const f of Object.keys(t.facties)) {
    if (mens(t, f)) continue;
    kiEconomie(t, f, k);
    if (tp.kiOorlog) kiOorlog(t, f, k);
  }
  // machten van buiten krijgen elk voorjaar versterking als ze in oorlog zijn
  if (d.maand === 3) {
    for (const f of Object.values(t.facties)) {
      if (!f.bestaat || !f.buiten || f.heer || !vijanden(t, f.id).length) continue;
      const nu = sterkteVan(t, f.id);
      const tekort = f.buiten.doelSterkte - nu;
      if (tekort < 2000) continue;
      const extra = Math.round(Math.min(f.buiten.doelSterkte * 0.4, tekort) / 1000) * 1000;
      const v = ingang(t, f.id, k);
      nieuwLeger(t, f.id, v, extra, f.buiten.naam);
      if (f.id === t.speler || inOorlog(t, f.id, t.speler)) meld(t, `${f.buiten.naam}: ${extra} man komen het land binnen.`, 'info', v);
    }
  }
  onderwerping(t);
  vazallen(t, k);
}

/** een verslagen volk onderwerpt zich aan wie zijn hoofdplaats heeft */
function onderwerping(t: Toestand) {
  for (const f of Object.values(t.facties)) {
    if (!f.bestaat || f.soort === 'rijk' || f.heer || f.hoofdstad === null) continue;
    const eigenaar = hoofd(t, t.vakken[f.hoofdstad].eigenaar);
    if (eigenaar === f.id || !inOorlog(t, f.id, eigenaar)) continue;
    const eigen = vakkenVan(t, f.id);
    const klaar = eigen.length <= f.vakkenBijStart * 0.5 && sterkteVan(t, f.id) < 3000 * prijsfactor(t.tijdperk);
    if (!klaar) continue;
    if (mens(t, f.id)) {
      if (t.dag < t.onderwerpVraagNa) continue;
      t.onderwerpVraagNa = t.dag + 180;
      t.wachtend.push({
        id: 'onderwerp-' + t.dag, titel: `Onderwerpen aan ${t.facties[eigenaar].naam}?`,
        tekst: `Je hoofdplaats is gevallen en je hebt nog maar ${eigen.length} van de ${f.vakkenBijStart} vakken. Als je je onderwerpt, blijft je volk bestaan onder ${t.facties[eigenaar].naam}, maar je verliest je vrijheid, een derde van je inkomsten en het grootste deel van je leger. Je kan later in opstand komen.`,
        opties: [{ tekst: 'Onderwerpen', gevolg: `onderwerpen:${eigenaar}` }, { tekst: 'Doorvechten', gevolg: 'doorvechten' }],
      });
    } else if (kans(t) < 0.5) onderwerp(t, f.id, eigenaar);
  }
}

/** onderworpen volken komen soms in opstand; erfenissen worden na een tijd ingelijfd */
function vazallen(t: Toestand, k: Kaart) {
  for (const f of Object.values(t.facties)) {
    if (!f.bestaat || !f.heer || mens(t, f.id)) continue;
    const unie = t.gedaan.find((x) => x.startsWith(`unie:${f.id}:`));
    if (unie) {
      const sinds = Number(unie.split(':')[2]);
      if (t.dag - sinds > 20 * 365 && !mens(t, f.heer)) lijfIn(t, f.id);
      continue;
    }
    const heer = t.facties[f.heer];
    const zwak = sterkteVan(t, heer.id) < 15000 * prijsfactor(t.tijdperk) || heer.moeheid > 60;
    const eigen = vakkenVan(t, f.id);
    const ontevreden = eigen.length && eigen.reduce((s, i) => s + t.vakken[i].tevredenheid, 0) / eigen.length < 45;
    if (zwak && ontevreden && kans(t) < 0.05) {
      opstand(t, k, f.id, Math.max(1500, Math.round(eigen.reduce((s, i) => s + t.vakken[i].bevolking, 0) * 0.04)));
    }
  }
}

/** de speler kiest zelf om in opstand te komen */
export function spelerOpstand(t: Toestand, k: Kaart) {
  const fac = t.facties[t.speler];
  if (!fac.heer) return false;
  const sterkte = Math.max(1500, Math.min(8000 * prijsfactor(t.tijdperk), Math.round(fac.mankracht)));
  fac.mankracht = Math.max(0, fac.mankracht - sterkte);
  return opstand(t, k, t.speler, sterkte);
}

// ---------- opvolging ----------

/** verdwijnt het volk van de speler, dan speel je verder als wie het grootste deel van je land heeft */
function opvolging(t: Toestand, k: Kaart) {
  const f = t.facties[t.speler];
  if (f.bestaat) {
    if (f.soort !== 'rijk' && !vakkenVan(t, f.id).length && !t.legers.some((l) => l.factie === f.id)) {
      const houder = meesteLand(t, f.id);
      verdwijn(t, f.id, houder);
    } else return;
  }
  const opvolger = meesteLand(t, t.speler);
  const oud = f.naam;
  t.speler = opvolger;
  t.wachtend.push({
    id: 'opvolging-' + t.dag, titel: 'Een nieuwe macht',
    tekst: `${oud} bestaat niet meer als vrije macht. Het land is nu grotendeels in handen van ${t.facties[opvolger].naam}. Je speelt verder als ${t.facties[opvolger].naam} (${t.facties[opvolger].heerser}).`,
    opties: [{ tekst: 'Verder', gevolg: 'niets' }],
  });
  void k;
}

function meesteLand(t: Toestand, van: string): string {
  const telling: Record<string, number> = {};
  t.vakken.forEach((v) => { if (v.oorsprong === van) { const h = hoofd(t, v.eigenaar); telling[h] = (telling[h] ?? 0) + 1; } });
  const beste = Object.entries(telling).filter(([id]) => id !== van && t.facties[id]?.bestaat).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (beste) return beste;
  return Object.values(t.facties).filter((x) => x.bestaat && x.id !== van).sort((a, b) => vakkenVan(t, b.id).length - vakkenVan(t, a.id).length)[0]?.id ?? van;
}

// ---------- score ----------

export function score(t: Toestand, f: string) {
  const eigen = vakkenVan(t, f);
  const volk = eigen.reduce((s, v) => s + t.vakken[v].bevolking, 0);
  const leger = sterkteVan(t, f);
  const fac = t.facties[f];
  const p = prijsfactor(t.tijdperk);
  return {
    welvaart: Math.round(volk / 10000 / p + eigen.reduce((s, v) => s + inkomenVak(t, standaardKaart, v), 0) / 10 / p),
    macht: Math.round(leger / 1000 / p + eigen.length * 0.5),
    vrijheid: !fac.bestaat ? 0 : fac.heer ? 30 : 100,
  };
}

function bewaarScore(t: Toestand) {
  const s = score(t, t.speler);
  t.scores.push({ tijdperk: t.tijdperk, factie: t.facties[t.speler].naam, ...s });
}

export function eindrapport(t: Toestand): string {
  if (!t.scores.length) return '';
  const regels = t.scores.map((s) => `${tijdperk(s.tijdperk).naam}: ${s.factie} — welvaart ${s.welvaart}, macht ${s.macht}, vrijheid ${s.vrijheid}`);
  const totaal = t.scores.reduce((s, x) => s + x.welvaart + x.macht + x.vrijheid, 0);
  return `Jouw weg door de geschiedenis:\n${regels.join('\n')}\n\nTotaalscore: ${totaal}.`;
}

export type { Keuze };
