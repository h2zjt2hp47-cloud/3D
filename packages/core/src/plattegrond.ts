/**
 * Plattegrond: ruimtes (rechthoeken), muren die daaruit volgen, openingen (ramen, deuren) in de
 * muren en meubels. Maten in cm, x naar rechts, y naar onder (zoals op papier).
 *
 * De muren teken je niet zelf: elke rand van een ruimte is een muur. Grenst een rand aan
 * een andere ruimte, dan is het een binnenmuur; anders een buitenmuur. Zo blijft de tekening
 * altijd sluitend, ook na het indelen (splitsen) of verschuiven van ruimtes.
 */
import {
  dakBlokken, dakHoogte, daklichtBlokken, DAKLICHT_GLAS, gevelOnderDak, hellendDak, oppervlakOnderDak, prisma,
  type DakBedekking, type DakKeuze, type DakLicht, type DakLichtType, type DakMateriaal, type HellendDak,
} from './dak.js';
import { kaderVan, plaatsBlokken, type Blok, type BlokSoort, type Scene3D } from './ruimtelijk.js';

export type RuimteType = 'leefruimte' | 'keuken' | 'slaapkamer' | 'bureau' | 'badkamer' | 'wc' | 'hal' | 'berging' | 'garage';

export const RUIMTE_TYPES: Record<RuimteType, { label: string; daglicht: boolean; nat: boolean }> = {
  leefruimte: { label: 'Leefruimte', daglicht: true, nat: false },
  keuken: { label: 'Keuken', daglicht: true, nat: true },
  slaapkamer: { label: 'Slaapkamer', daglicht: true, nat: false },
  bureau: { label: 'Bureau', daglicht: true, nat: false },
  badkamer: { label: 'Badkamer', daglicht: false, nat: true },
  wc: { label: 'Wc', daglicht: false, nat: true },
  hal: { label: 'Hal', daglicht: false, nat: false },
  berging: { label: 'Berging', daglicht: false, nat: false },
  garage: { label: 'Garage', daglicht: false, nat: false },
};

export interface Ruimte {
  id: string;
  naam: string;
  type: RuimteType;
  /** Linkerbovenhoek en maten (cm), gemeten op de as van de muren. */
  x: number;
  y: number;
  b: number;
  d: number;
  /** Code van de vloer en de wandafwerking (zie de plancatalogus). */
  vloer: string;
  wand: string;
  /** Verdieping (0 = gelijkvloers). */
  niveau?: number;
  /** Extra rechthoeken van dezelfde ruimte (L- of U-vorm); tussen de delen staat geen muur. */
  delen?: Rechthoek[];
}

export interface Rechthoek { x: number; y: number; b: number; d: number }

export type OpeningSoort = 'raam' | 'buitendeur' | 'schuifraam' | 'binnendeur' | 'doorgang' | 'garagepoort';

export interface Opening {
  id: string;
  soort: OpeningSoort;
  /** Muur waarin de opening zit: horizontaal (as 'h', lijn = y) of verticaal (as 'v', lijn = x). */
  as: 'h' | 'v';
  lijn: number;
  /** Midden van de opening langs de muur (cm). */
  midden: number;
  breedte: number;
  hoogte: number;
  /** Hoogte van de onderkant boven de vloer (cm); 0 bij deuren. */
  borstwering: number;
  /** Scharnieren aan het begin (kleinste coördinaat) of het einde van de opening. */
  scharnier: 'begin' | 'einde';
  /** Draait de deur naar de kant met de grotere coördinaat (onder of rechts op de tekening)? */
  naarPlus: boolean;
  /** Offertepositie (raam of buitendeur) die bij deze opening hoort. */
  positie?: string;
  /** Type binnendeur (zie de plancatalogus). */
  deurtype?: string;
  niveau?: number;
}

export interface Meubel {
  id: string;
  type: string;
  /** Linkerbovenhoek van de (gedraaide) voetafdruk. */
  x: number;
  y: number;
  /** Maten zonder draaiing: b = breedte, d = diepte (voorkant naar onder bij rotatie 0). */
  b: number;
  d: number;
  rotatie: 0 | 90 | 180 | 270;
  kleur?: string;
  niveau?: number;
}

export interface Plattegrond {
  ruimtes: Ruimte[];
  openingen: Opening[];
  meubels: Meubel[];
  muurhoogte: number;
  buitenmuur: number;
  binnenmuur: number;
  /** Gevelafwerking buiten (eenvoudig: één materiaal voor de hele woning; zie ook gevelOntwerp). */
  gevel: { soort: BlokSoort; kleur: string };
  /** Gevelmaterialen uit de catalogus: hele woning, per muurvlak en een sokkel. Gaat voor op `gevel`. */
  gevelOntwerp?: GevelOntwerp;
  /** Namen van de verdiepingen (index = niveau). Leeg = alleen gelijkvloers. */
  verdiepingen?: { naam: string }[];
  /** Het dak: vorm, helling, richting, oversteek en bedekking. Ontbreekt = zoals vroeger (plat, zonder keuze). */
  dak?: DakKeuze;
  /** Lichtkoepels en lichtstraten in een plat dak. */
  daklichten?: DakLicht[];
  /**
   * Waar het noorden ligt op het plan: graden met de klok mee vanaf de bovenkant van het plan (90 = noord ligt rechts).
   * Ontbreekt = de bovenkant van het plan is het noorden. Voor de lichtinval (zie zon.ts) en de noordpijl.
   */
  noord?: number;
}

/** Kant van de woning (op de plattegrond): boven, onder, links of rechts. */
export type GevelKant = 'boven' | 'onder' | 'links' | 'rechts';

/** Gekozen gevelmateriaal (codes uit de catalogus van de klant). */
export interface GevelKeuze {
  materiaal: string;
  kleur: string;
  /** Voegkleur (bij metselwerk). */
  voeg?: string;
}

/** Gevelafwerking van de woning, zoals "geschilderd" in de gevel-editor. */
export interface GevelOntwerp {
  /** Materiaal voor de hele woning. */
  standaard: GevelKeuze;
  /** Per muurvlak, sleutel `ruimte-id:kant` (zie vlakSleutel). Gaat voor op de standaard. */
  vlakken?: Record<string, GevelKeuze>;
  /** Plint onderaan de gevel van het gelijkvloers (hoogte in cm; 0 = geen). */
  sokkel?: GevelKeuze & { hoogte: number };
}

/** Een gevelmateriaal in de catalogus: soort voor 3D en tekening, kleuren (stalen) en prijs per m². */
export interface GevelMateriaal {
  label: string;
  /** Groep in het palet (Baksteen, Pleister, Hout …). */
  groep: string;
  soort: BlokSoort;
  kleuren: Record<string, { label: string; hex: string }>;
  /** Voegkleuren (metselwerk). */
  voegen?: Record<string, { label: string; hex: string }>;
  /** Verkoop- en kostprijs per m², geplaatst (demo). */
  prijs: number;
  kost: number;
  artikel?: string;
  /** Korte uitleg voor de klant. */
  uitleg?: string;
}

/** Afwerking zoals de 3D en de tekening ze nodig hebben. */
export interface GevelAfwerking { soort: BlokSoort; kleur: string; voeg?: string }

/** Naar welke kant van de woning kijkt de buitenkant van een buitenmuur? */
export function buitenKant(m: Muur): GevelKant | undefined {
  if (m.soort !== 'buiten') return undefined;
  if (m.as === 'h') return m.min ? 'onder' : 'boven';
  return m.min ? 'rechts' : 'links';
}

/** Sleutel van een muurvlak: de ruimte binnen en de kant van de woning. Blijft gelijk als de ruimte verschuift. */
export function vlakSleutel(m: Muur): string {
  return `${m.plus ?? m.min}:${buitenKant(m)}`;
}

/** Het gekozen materiaal voor een buitenmuur (of undefined zonder gevelontwerp). */
export function gevelKeuzeVan(plan: Plattegrond, m: Muur): GevelKeuze | undefined {
  const o = plan.gevelOntwerp;
  if (!o) return undefined;
  return o.vlakken?.[vlakSleutel(m)] ?? o.standaard;
}

/** Zet een keuze om naar soort en kleuren (valt terug op plan.gevel als het materiaal onbekend is). */
export function gevelAfwerking(plan: Plattegrond, cat: PlanCatalogus | undefined, keuze: GevelKeuze | undefined): GevelAfwerking {
  const mat = keuze ? cat?.gevels?.[keuze.materiaal] : undefined;
  if (!keuze || !mat) return plan.gevel;
  const kleur = mat.kleuren[keuze.kleur] ?? Object.values(mat.kleuren)[0];
  const voeg = keuze.voeg ? mat.voegen?.[keuze.voeg] : mat.voegen ? Object.values(mat.voegen)[0] : undefined;
  return { soort: mat.soort, kleur: kleur?.hex ?? plan.gevel.kleur, voeg: voeg?.hex };
}

export type VerfBereik = 'vlak' | 'gevel' | 'verdieping' | 'woning';

/**
 * "Verven" van de gevel (zoals in de gevel-editor): één muurvlak, een hele gevelkant (alle verdiepingen),
 * een hele verdieping of de hele woning. Wijzigt het plan; het gevelontwerp moet al bestaan.
 */
export function verfGevel(plan: Plattegrond, keuze: GevelKeuze, bereik: VerfBereik, doel: { sleutel?: string; kant?: GevelKant; niveau?: number } = {}) {
  const o = plan.gevelOntwerp;
  if (!o) return;
  const k = { ...keuze };
  if (bereik === 'woning') {
    o.standaard = k;
    delete o.vlakken;
    return;
  }
  o.vlakken ??= {};
  if (bereik === 'vlak') {
    if (doel.sleutel) o.vlakken[doel.sleutel] = k;
    return;
  }
  for (let n = 0; n < verdiepingenVan(plan).length; n++) {
    if (bereik === 'verdieping' && n !== doel.niveau) continue;
    for (const m of murenVan(niveauPlan(plan, n))) {
      if (m.soort !== 'buiten') continue;
      if (bereik === 'gevel' && buitenKant(m) !== doel.kant) continue;
      o.vlakken[vlakSleutel(m)] = { ...k };
    }
  }
}

/** Dikte van de vloerplaat tussen twee verdiepingen (cm). */
export const VLOERDIKTE = 30;
/** Dikte van de laag bedekking bovenop een plat dak met dakkeuze (cm, binnen de dikte van de dakplaat). */
const DAK_LAAG = 8;

export interface Muur {
  id: string;
  as: 'h' | 'v';
  lijn: number;
  van: number;
  tot: number;
  soort: 'buiten' | 'binnen';
  dikte: number;
  /** Ruimte aan de kant met de grotere coördinaat (onder/rechts) en aan de andere kant. */
  plus?: string;
  min?: string;
}

/** Afwerkingen en meubels die de plattegrond kent (komt uit de catalogus van de klant). */
export interface PlanCatalogus {
  vloeren: Record<string, { label: string; soort: BlokSoort; kleur: string }>;
  wanden: Record<string, { label: string; soort: BlokSoort; kleur: string }>;
  binnendeuren: Record<string, { label: string; soort: BlokSoort; kleur: string }>;
  meubels: Record<string, MeubelType>;
  /** Gevelmaterialen (gevel-editor); zonder deze lijst geldt plan.gevel. */
  gevels?: Record<string, GevelMateriaal>;
  /** Dakbedekkingen (plat en hellend) en lichtkoepels; zonder deze lijsten is het dak effen donker. */
  daken?: Record<string, DakMateriaal>;
  daklichten?: Record<string, DakLichtType>;
}

export type MeubelVorm =
  | 'bank' | 'fauteuil' | 'tafel' | 'stoel' | 'bed' | 'nachtkast' | 'kast' | 'keuken' | 'eiland' | 'koelkast'
  | 'bad' | 'douche' | 'wc' | 'lavabo' | 'tv' | 'plant' | 'tapijt' | 'trap';

export interface MeubelType {
  label: string;
  vorm: MeubelVorm;
  b: number;
  d: number;
  h: number;
  kleur: string;
  /** Richtprijs (excl. btw), alleen voor een indicatieve inrichting. */
  prijs?: number;
  groep: string;
}

const r2 = (x: number) => Math.round(x * 100) / 100;
const gelijk = (a: number, b: number) => Math.abs(a - b) < 0.5;

// ---------- verdiepingen en samengestelde ruimtes ----------

export const niveauVan = (x: { niveau?: number }) => x.niveau ?? 0;

/** Namen van alle verdiepingen (minstens het gelijkvloers). */
export function verdiepingenVan(plan: Plattegrond): { naam: string }[] {
  const n = Math.max(1, plan.verdiepingen?.length ?? 0, ...plan.ruimtes.map((r) => niveauVan(r) + 1));
  return Array.from({ length: n }, (_, i) => plan.verdiepingen?.[i] ?? { naam: i === 0 ? 'Gelijkvloers' : `Verdieping ${i}` });
}

/** Alleen de ruimtes, openingen en meubels van één verdieping. */
export function niveauPlan(plan: Plattegrond, niveau: number): Plattegrond {
  return {
    ...plan,
    ruimtes: plan.ruimtes.filter((r) => niveauVan(r) === niveau),
    openingen: plan.openingen.filter((o) => niveauVan(o) === niveau),
    meubels: plan.meubels.filter((m) => niveauVan(m) === niveau),
    ...(plan.daklichten ? { daklichten: plan.daklichten.filter((l) => niveauVan(l) === niveau) } : {}),
  };
}

/** Hoogte van de vloer van een verdieping boven het maaiveld (cm). */
export const vloerHoogte = (plan: Plattegrond, niveau: number) => niveau * (plan.muurhoogte + VLOERDIKTE);

/** Alle rechthoeken van een ruimte (hoofddeel eerst). */
export function delenVan(r: Ruimte): Rechthoek[] {
  return [{ x: r.x, y: r.y, b: r.b, d: r.d }, ...(r.delen ?? [])];
}

const binnen = (p: Rechthoek, x: number, y: number) => x > p.x && x < p.x + p.b && y > p.y && y < p.y + p.d;

/** Rechthoek a min rechthoek r: hoogstens 4 stukken (boven, onder, links, rechts). */
export function trekAf(a: Rechthoek, r: Rechthoek): Rechthoek[] {
  const x0 = Math.max(a.x, r.x), x1 = Math.min(a.x + a.b, r.x + r.b);
  const y0 = Math.max(a.y, r.y), y1 = Math.min(a.y + a.d, r.y + r.d);
  if (x1 - x0 < 0.5 || y1 - y0 < 0.5) return [a];
  const uit: Rechthoek[] = [];
  if (y0 > a.y + 0.5) uit.push({ x: a.x, y: a.y, b: a.b, d: y0 - a.y });
  if (y1 < a.y + a.d - 0.5) uit.push({ x: a.x, y: y1, b: a.b, d: a.y + a.d - y1 });
  if (x0 > a.x + 0.5) uit.push({ x: a.x, y: y0, b: x0 - a.x, d: y1 - y0 });
  if (x1 < a.x + a.b - 0.5) uit.push({ x: x1, y: y0, b: a.x + a.b - x1, d: y1 - y0 });
  return uit;
}

/** Zet de delen van een ruimte: het grootste deel wordt het hoofddeel. */
function zetDelen(r: Ruimte, delen: Rechthoek[]) {
  const s = [...delen].sort((a, b) => b.b * b.d - a.b * a.d);
  const [hoofd, ...rest] = s;
  Object.assign(r, { x: hoofd!.x, y: hoofd!.y, b: hoofd!.b, d: hoofd!.d });
  if (rest.length) r.delen = rest; else delete r.delen;
}

/**
 * Tekent een nieuwe ruimte, ook bovenop bestaande ruimtes: wat overlapt, wordt uit die ruimtes
 * weggesneden ("ruimte in ruimte"). De rest van een ruimte kan zo een L- of U-vorm krijgen.
 */
export function tekenRuimteIn(plan: Plattegrond, nieuw: Ruimte): void {
  const n = niveauVan(nieuw);
  const opp = (x: Rechthoek[]) => x.reduce((t, p) => t + p.b * p.d, 0);
  const geraakt: { id: string; overlap: number }[] = [];
  for (const r of [...plan.ruimtes]) {
    if (niveauVan(r) !== n) continue;
    const oud = delenVan(r);
    const rest = oud.flatMap((p) => trekAf(p, nieuw)).filter((p) => p.b >= 1 && p.d >= 1);
    if (rest.length === oud.length && rest.every((p, i) => p === oud[i])) continue;
    geraakt.push({ id: r.id, overlap: opp(oud) - opp(rest) });
    if (!rest.length) plan.ruimtes.splice(plan.ruimtes.indexOf(r), 1);
    else zetDelen(r, rest);
  }
  plan.ruimtes.push(nieuw);
  // De gevel van de ruimte waaruit het meest gesneden werd, gaat mee naar de nieuwe ruimte.
  for (const g of geraakt.sort((a, b) => b.overlap - a.overlap)) erfGevel(plan, g.id, nieuw.id, false);
}

/**
 * Een nieuwe ruimte (na indelen of "ruimte in ruimte") neemt de gevelkeuzes per kant over van de ruimte
 * waaruit ze komt; anders valt haar buitenmuur terug op de standaardgevel.
 */
export function erfGevel(plan: Plattegrond, van: string, naar: string, overschrijven = true) {
  const v = plan.gevelOntwerp?.vlakken;
  if (!v) return;
  for (const kant of ['boven', 'onder', 'links', 'rechts'] as const) {
    const k = v[`${van}:${kant}`];
    if (k && (overschrijven || !v[`${naar}:${kant}`])) v[`${naar}:${kant}`] = { ...k };
  }
}

/**
 * Deelt ruimtes met een wand: een staande (as 'v', op x = lijn) of liggende (as 'h', op y = lijn) wand
 * van `van` tot `tot`. Elke ruimte(deel) dat de wand kruist, wordt gesplitst; de stukken aan de
 * grote kant (rechts of onder) worden een nieuwe ruimte. Geeft de nieuwe ruimtes terug.
 */
export function splitsRuimtes(
  plan: Plattegrond, niveau: number, as: 'h' | 'v', lijn: number, van: number, tot: number,
  nieuweRuimte: (oud: Ruimte) => Ruimte, minimum = 30,
): Ruimte[] {
  const nieuw: Ruimte[] = [];
  for (const r of [...plan.ruimtes]) {
    if (niveauVan(r) !== niveau) continue;
    const blijft: Rechthoek[] = [], gaat: Rechthoek[] = [];
    for (const p of delenVan(r)) {
      const [a0, a1, d0, d1] = as === 'v' ? [p.x, p.x + p.b, p.y, p.y + p.d] : [p.y, p.y + p.d, p.x, p.x + p.b];
      // Een klik (van = tot) moet in het deel liggen; een getekende wand moet het deel echt overlappen.
      const raakt = van === tot ? van > d0 && van < d1 : Math.min(tot, d1) - Math.max(van, d0) > 1;
      const kruist = lijn > a0 + minimum && lijn < a1 - minimum && raakt;
      if (!kruist) { blijft.push(p); continue; }
      if (as === 'v') { blijft.push({ ...p, b: lijn - p.x }); gaat.push({ ...p, x: lijn, b: p.x + p.b - lijn }); }
      else { blijft.push({ ...p, d: lijn - p.y }); gaat.push({ ...p, y: lijn, d: p.y + p.d - lijn }); }
    }
    if (!gaat.length) continue;
    zetDelen(r, blijft);
    const b = nieuweRuimte(r);
    b.niveau = niveau;
    zetDelen(b, gaat);
    plan.ruimtes.push(b);
    erfGevel(plan, r.id, b.id);
    nieuw.push(b);
  }
  return nieuw;
}

// ---------- muren afleiden ----------

/** Alle muren van de plattegrond, afgeleid uit de randen van de ruimtes. */
export function murenVan(plan: Plattegrond): Muur[] {
  interface Rand { as: 'h' | 'v'; lijn: number; van: number; tot: number; kant: '+' | '-'; ruimte: string }
  const randen: Rand[] = [];
  for (const r of plan.ruimtes) {
    for (const p of delenVan(r)) {
      randen.push({ as: 'h', lijn: p.y, van: p.x, tot: p.x + p.b, kant: '+', ruimte: r.id });
      randen.push({ as: 'h', lijn: p.y + p.d, van: p.x, tot: p.x + p.b, kant: '-', ruimte: r.id });
      randen.push({ as: 'v', lijn: p.x, van: p.y, tot: p.y + p.d, kant: '+', ruimte: r.id });
      randen.push({ as: 'v', lijn: p.x + p.b, van: p.y, tot: p.y + p.d, kant: '-', ruimte: r.id });
    }
  }
  const groepen = new Map<string, Rand[]>();
  for (const r of randen) {
    const sleutel = `${r.as}:${Math.round(r.lijn)}`;
    groepen.set(sleutel, [...(groepen.get(sleutel) ?? []), r]);
  }
  const muren: Muur[] = [];
  for (const groep of groepen.values()) {
    const { as, lijn } = groep[0]!;
    const punten = [...new Set(groep.flatMap((r) => [r.van, r.tot]))].sort((a, b) => a - b);
    let huidig: Muur | undefined;
    for (let i = 0; i + 1 < punten.length; i++) {
      const a = punten[i]!, b = punten[i + 1]!;
      if (b - a < 0.5) continue;
      const dekt = (kant: '+' | '-') => groep.find((r) => r.kant === kant && r.van <= a + 0.01 && r.tot >= b - 0.01)?.ruimte;
      const plus = dekt('+'), min = dekt('-');
      // Geen muur tussen twee delen van dezelfde ruimte.
      if ((!plus && !min) || plus === min) {
        huidig = undefined;
        continue;
      }
      const soort = plus && min ? 'binnen' : 'buiten';
      if (huidig && gelijk(huidig.tot, a) && huidig.soort === soort && huidig.plus === plus && huidig.min === min) {
        huidig.tot = b;
        continue;
      }
      huidig = { id: '', as, lijn, van: a, tot: b, soort, dikte: soort === 'buiten' ? plan.buitenmuur : plan.binnenmuur, plus, min };
      muren.push(huidig);
    }
  }
  muren.forEach((m) => (m.id = `${m.as}${Math.round(m.lijn)}_${Math.round(m.van)}`));
  return muren;
}

/** Rechthoek van een muur in de plattegrond, met hoeken netjes aangesloten. */
export interface MuurVlak { x: number; y: number; b: number; d: number; verlengdBegin: boolean; verlengdEinde: boolean }

export function muurVlak(m: Muur, muren: Muur[]): MuurVlak {
  const half = m.dikte / 2;
  let begin = m.van, einde = m.tot, verlengdBegin = false, verlengdEinde = false;
  const loodrecht = muren.filter((x) => x.as !== m.as);
  if (m.as === 'h') {
    for (const [p, isBegin] of [[m.van, true], [m.tot, false]] as const) {
      const verder = muren.some((x) => x !== m && x.as === 'h' && gelijk(x.lijn, m.lijn) && (isBegin ? gelijk(x.tot, p) : gelijk(x.van, p)));
      if (verder) continue;
      const door = loodrecht.filter((v) => gelijk(v.lijn, p) && v.van < m.lijn - 0.5 && v.tot > m.lijn + 0.5);
      const eindigt = loodrecht.filter((v) => gelijk(v.lijn, p) && (gelijk(v.van, m.lijn) || gelijk(v.tot, m.lijn)));
      if (door.length) {
        const t = Math.max(...door.map((v) => v.dikte)) / 2;
        if (isBegin) begin = p + t; else einde = p - t;
      } else if (eindigt.length) {
        const t = Math.max(...eindigt.map((v) => v.dikte)) / 2;
        if (isBegin) { begin = p - t; verlengdBegin = true; } else { einde = p + t; verlengdEinde = true; }
      }
    }
    return { x: begin, y: m.lijn - half, b: einde - begin, d: m.dikte, verlengdBegin, verlengdEinde };
  }
  for (const [p, isBegin] of [[m.van, true], [m.tot, false]] as const) {
    const h = loodrecht.filter((x) => gelijk(x.lijn, p) && x.van <= m.lijn + 0.5 && x.tot >= m.lijn - 0.5);
    if (h.length) {
      const t = Math.max(...h.map((x) => x.dikte)) / 2;
      if (isBegin) begin = p + t; else einde = p - t;
    }
  }
  return { x: m.lijn - half, y: begin, b: m.dikte, d: einde - begin, verlengdBegin, verlengdEinde };
}

/** De muur waarin een opening zit (of undefined als ze niet (meer) op een muur staat). */
export function muurVanOpening(o: Opening, muren: Muur[]): Muur | undefined {
  return muren.find((m) => m.as === o.as && gelijk(m.lijn, o.lijn) && m.van <= o.midden - o.breedte / 2 + 0.5 && m.tot >= o.midden + o.breedte / 2 - 0.5);
}

/** Dichtstbijzijnde muur bij een punt (voor het plaatsen van ramen en deuren). */
export function dichtsteMuur(muren: Muur[], x: number, y: number, maxAfstand = 40): { muur: Muur; midden: number; afstand: number } | undefined {
  let beste: { muur: Muur; midden: number; afstand: number } | undefined;
  for (const m of muren) {
    const langs = m.as === 'h' ? x : y, dwars = m.as === 'h' ? y : x;
    if (langs < m.van || langs > m.tot) continue;
    const afstand = Math.abs(dwars - m.lijn);
    if (afstand <= maxAfstand && (!beste || afstand < beste.afstand)) beste = { muur: m, midden: langs, afstand };
  }
  return beste;
}

// ---------- oppervlaktes ----------

export interface RuimteMaten {
  /** Bruto (op de as van de muren) en netto vloeroppervlakte (m²). */
  bruto: number;
  netto: number;
  /** Netto binnenmaten (cm) en omtrek (m). */
  nb: number;
  nd: number;
  omtrek: number;
  /** Wandoppervlakte binnen (m²), zonder de openingen. */
  wand: number;
  /** Glasoppervlakte van ramen en buitendeuren (m², ongeveer 70 % van de opening). */
  glas: number;
  /** Glasoppervlakte van lichtkoepels en lichtstraten boven de ruimte (m², ongeveer 80 % van de dagmaat). */
  daklicht: number;
}

export function ruimteMaten(plan: Plattegrond, r: Ruimte, muren = murenVan(niveauPlan(plan, niveauVan(r)))): RuimteMaten {
  const eigen = muren.filter((m) => m.plus === r.id || m.min === r.id);
  const openingen = openingenVanRuimte(plan, r, muren);
  const openingM2 = openingen.reduce((t, o) => t + (o.breedte * o.hoogte) / 10000, 0);
  // Daglicht telt alleen via ramen en deuren in een buitenmuur.
  const glas = openingen.filter((o) => ['raam', 'buitendeur', 'schuifraam'].includes(o.soort) && muurVanOpening(o, muren)?.soort === 'buiten').reduce((t, o) => t + (o.breedte * o.hoogte * (o.soort === 'buitendeur' ? 0.3 : 0.7)) / 10000, 0);
  const delen = delenVan(r);
  const bruto = delen.reduce((t, p) => t + p.b * p.d, 0);
  let netto: number, nb: number, nd: number;
  if (delen.length === 1) {
    const dikte = (as: 'h' | 'v', lijn: number, van: number, tot: number) => {
      const op = muren.filter((m) => m.as === as && gelijk(m.lijn, lijn) && m.tot > van + 0.5 && m.van < tot - 0.5);
      return op.length ? Math.max(...op.map((m) => m.dikte)) : 0;
    };
    const tb = dikte('h', r.y, r.x, r.x + r.b), to = dikte('h', r.y + r.d, r.x, r.x + r.b);
    const tl = dikte('v', r.x, r.y, r.y + r.d), tr = dikte('v', r.x + r.b, r.y, r.y + r.d);
    nb = Math.max(0, r.b - (tl + tr) / 2);
    nd = Math.max(0, r.d - (tb + to) / 2);
    netto = nb * nd;
  } else {
    // Samengestelde ruimte: bruto min een halve muurdikte langs elke muur (benadering).
    netto = Math.max(0, bruto - eigen.reduce((t, m) => t + (m.tot - m.van) * (m.dikte / 2), 0));
    nb = r.b;
    nd = r.d;
  }
  const omtrek = delen.length === 1 ? (2 * (nb + nd)) / 100 : eigen.reduce((t, m) => t + (m.tot - m.van), 0) / 100;
  return {
    bruto: r2(bruto / 10000),
    netto: r2(netto / 10000),
    nb: r2(nb),
    nd: r2(nd),
    omtrek: r2(omtrek),
    wand: r2(Math.max(0, omtrek * (plan.muurhoogte / 100) - openingM2)),
    glas: r2(glas),
    daklicht: r2(daklichtenBoven(plan, r).reduce((t, l) => t + (l.b * l.d * DAKLICHT_GLAS) / 10000, 0)),
  };
}

/** Lichtkoepels en lichtstraten waarvan het midden boven deze ruimte ligt. */
export function daklichtenBoven(plan: Plattegrond, r: Ruimte): DakLicht[] {
  return (plan.daklichten ?? []).filter((l) => niveauVan(l) === niveauVan(r) && delenVan(r).some((p) => binnen(p, l.x + l.b / 2, l.y + l.d / 2)));
}

/** Openingen in de muren rond een ruimte. */
export function openingenVanRuimte(plan: Plattegrond, r: Ruimte, muren = murenVan(niveauPlan(plan, niveauVan(r)))): Opening[] {
  return plan.openingen.filter((o) => {
    if (niveauVan(o) !== niveauVan(r)) return false;
    const m = muurVanOpening(o, muren);
    return !!m && (m.plus === r.id || m.min === r.id);
  });
}

/** De ruimte aan de binnenkant van een opening in een buitenmuur (of de ruimtes aan beide kanten). */
export function ruimtesBijOpening(plan: Plattegrond, o: Opening, muren = murenVan(niveauPlan(plan, niveauVan(o)))): Ruimte[] {
  const m = muurVanOpening(o, muren);
  if (!m) return [];
  return [m.min, m.plus].filter(Boolean).map((id) => plan.ruimtes.find((r) => r.id === id)!).filter(Boolean);
}

/** Ruimte op een punt (op de gegeven verdieping, of in het hele plan als het al gefilterd is). */
export function ruimteOp(plan: Plattegrond, x: number, y: number, niveau?: number): Ruimte | undefined {
  return plan.ruimtes.find((r) => (niveau === undefined || niveauVan(r) === niveau) && delenVan(r).some((p) => binnen(p, x, y)));
}

// ---------- controles ----------

export interface PlanMelding {
  ernst: 'fout' | 'waarschuwing';
  melding: string;
  ruimte?: string;
  opening?: string;
  daklicht?: string;
}

const BUITEN: OpeningSoort[] = ['raam', 'buitendeur', 'schuifraam', 'garagepoort'];

export function controleerPlan(plan: Plattegrond, cat?: PlanCatalogus): PlanMelding[] {
  const uit: PlanMelding[] = [];
  const niveaus = verdiepingenVan(plan);
  const ingang = new Set<string>();
  const buren = new Map<string, Set<string>>();
  const verbind = (a: string, b: string) => {
    buren.set(a, new Set([...(buren.get(a) ?? []), b]));
    buren.set(b, new Set([...(buren.get(b) ?? []), a]));
  };
  niveaus.forEach((nv, n) => {
    const p = niveauPlan(plan, n);
    const pre = niveaus.length > 1 && n > 0 ? `${nv.naam}: ` : '';
    controleerNiveau(p, pre, uit, ingang, verbind);
    // Trap: verbindt de ruimte met de trap met de ruimte erboven.
    if (n + 1 < niveaus.length) {
      for (const t of p.meubels.filter((m) => m.type === 'trap')) {
        const v = meubelVoetafdruk(t);
        const onder = ruimteOp(p, v.x + v.b / 2, v.y + v.d / 2);
        const boven = ruimteOp(plan, v.x + v.b / 2, v.y + v.d / 2, n + 1);
        if (onder && boven) verbind(onder.id, boven.id);
        else if (onder) uit.push({ ernst: 'waarschuwing', ruimte: onder.id, melding: `De trap in ${onder.naam} komt boven niet in een ruimte uit.` });
      }
    }
    if (n > 0 && p.ruimtes.length && !plan.meubels.some((m) => m.type === 'trap' && niveauVan(m) === n - 1)) {
      uit.push({ ernst: 'waarschuwing', melding: `${nv.naam}: er is nog geen trap naar deze verdieping (plaats een trap op de verdieping eronder).` });
    }
  });
  if (plan.ruimtes.length && !plan.openingen.some((o) => o.soort === 'buitendeur' && niveauVan(o) === 0)) uit.push({ ernst: 'waarschuwing', melding: 'Er is nog geen voordeur of buitendeur.' });
  const bereikt = new Set(ingang);
  const rij = [...ingang];
  while (rij.length) for (const b of buren.get(rij.shift()!) ?? []) if (!bereikt.has(b)) { bereikt.add(b); rij.push(b); }
  if (ingang.size) {
    for (const r of plan.ruimtes) if (!bereikt.has(r.id)) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${r.naam} is niet bereikbaar: voeg een deur of doorgang toe.` });
  }
  controleerDak(plan, cat, uit);
  return uit;
}

/** Dak en daklichten: de terugval op plat, een bedekking die niet past, en koepels die niet op een plat dak liggen. */
function controleerDak(plan: Plattegrond, cat: PlanCatalogus | undefined, uit: PlanMelding[]) {
  const o = dakOpbouw(plan);
  if (!o) return;
  if (o.terugval) uit.push({ ernst: 'waarschuwing', melding: o.terugval });
  const hellend = o.keuze.vorm !== 'plat';
  const mat = cat?.daken?.[o.keuze.bedekking.materiaal];
  if (cat?.daken && !mat) uit.push({ ernst: 'waarschuwing', melding: 'Dak: de gekozen bedekking staat niet in de catalogus. Kies een andere bedekking.' });
  if (mat && (mat.voor === 'hellend') !== hellend) {
    uit.push({ ernst: 'waarschuwing', melding: `Dak: ${mat.label.toLowerCase()} past niet op een ${hellend ? 'hellend' : 'plat'} dak. Kies een andere bedekking.` });
  } else if (mat?.minHelling && hellend && o.keuze.helling < mat.minHelling) {
    uit.push({ ernst: 'waarschuwing', melding: `Dak: ${o.keuze.helling}° is te vlak voor ${mat.label.toLowerCase()} (minstens ${mat.minHelling}°; richtwaarde, te verifiëren).` });
  }
  // Een grote oversteek op een steil dak zakt tot voor de ramen (de onderkant van het dak gaat door de muurkop).
  const zakt = o.hellend ? Math.round(o.hellend.oversteek * o.hellend.tan) : 0;
  if (zakt > 60) uit.push({ ernst: 'waarschuwing', melding: `Dak: met ${o.hellend!.oversteek} cm oversteek op ${o.hellend!.helling}° hangt de dakvoet ${zakt} cm onder de bovenkant van de muur, tot voor de ramen. Verklein de oversteek of de helling.` });
  const naam = (l: DakLicht) => cat?.daklichten?.[l.type]?.label ?? 'Lichtkoepel';
  for (const { licht, reden, rand } of o.daklichten) {
    if (reden) uit.push({ ernst: 'fout', daklicht: licht.id, melding: `${naam(licht)} ${reden}` });
    else if (rand < 30) uit.push({ ernst: 'waarschuwing', daklicht: licht.id, melding: `${naam(licht)} ligt minder dan 30 cm van een muur: te weinig plaats voor de opstand en de dakrand.` });
  }
  const lijst = plan.daklichten ?? [];
  for (let i = 0; i < lijst.length; i++) {
    for (let j = i + 1; j < lijst.length; j++) {
      const a = lijst[i]!, b = lijst[j]!;
      if (niveauVan(a) !== niveauVan(b)) continue;
      const ox = Math.min(a.x + a.b, b.x + b.b) - Math.max(a.x, b.x), oy = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y);
      if (ox > -20 && oy > -20) uit.push({ ernst: 'fout', daklicht: b.id, melding: `${naam(b)}: twee daklichten overlappen elkaar of liggen minder dan 20 cm van elkaar.` });
    }
  }
}

function controleerNiveau(plan: Plattegrond, pre: string, uit: PlanMelding[], ingang: Set<string>, verbind: (a: string, b: string) => void) {
  const muren = murenVan(plan);
  const naam = (id?: string) => plan.ruimtes.find((r) => r.id === id)?.naam ?? '?';

  // Overlappende ruimtes.
  for (let i = 0; i < plan.ruimtes.length; i++) {
    for (let j = i + 1; j < plan.ruimtes.length; j++) {
      const a = plan.ruimtes[i]!, b = plan.ruimtes[j]!;
      const overlap = delenVan(a).some((p) => delenVan(b).some((q) => {
        const ox = Math.min(p.x + p.b, q.x + q.b) - Math.max(p.x, q.x), oy = Math.min(p.y + p.d, q.y + q.d) - Math.max(p.y, q.y);
        return ox > 1 && oy > 1;
      }));
      if (overlap) uit.push({ ernst: 'fout', ruimte: a.id, melding: `${pre}${a.naam} en ${b.naam} overlappen elkaar.` });
    }
  }

  // Openingen: op een muur, juiste soort muur, niet over elkaar.
  for (const o of plan.openingen) {
    const m = muurVanOpening(o, muren);
    const wat = o.soort === 'binnendeur' ? 'Binnendeur' : o.soort === 'doorgang' ? 'Doorgang' : o.soort === 'raam' ? 'Raam' : o.soort === 'schuifraam' ? 'Schuifraam' : o.soort === 'garagepoort' ? 'Garagepoort' : 'Buitendeur';
    if (!m) {
      uit.push({ ernst: 'fout', opening: o.id, melding: `${pre}${wat} staat niet (volledig) op een muur. Verschuif of verklein de opening.` });
      continue;
    }
    if (BUITEN.includes(o.soort) && m.soort === 'binnen') uit.push({ ernst: 'fout', opening: o.id, melding: `${pre}${wat} tussen ${naam(m.min)} en ${naam(m.plus)} staat in een binnenmuur.` });
    if (!BUITEN.includes(o.soort) && m.soort === 'buiten') uit.push({ ernst: 'waarschuwing', opening: o.id, melding: `${pre}${wat} in een buitenmuur (${naam(m.min ?? m.plus)}): gebruik een buitendeur.` });
    const vrij = Math.min(o.midden - o.breedte / 2 - m.van, m.tot - o.midden - o.breedte / 2);
    if (vrij < 10) uit.push({ ernst: 'waarschuwing', opening: o.id, melding: `${pre}${wat} staat tegen een hoek (minder dan 10 cm muur): moeilijk te plaatsen en af te werken.` });
    if (o.borstwering + o.hoogte > plan.muurhoogte - 15) uit.push({ ernst: 'fout', opening: o.id, melding: `${pre}${wat} is te hoog voor de muur (latei nodig boven de opening).` });
    if ((o.soort === 'buitendeur' || o.soort === 'schuifraam' || o.soort === 'garagepoort') && m.soort === 'buiten') ingang.add((m.min ?? m.plus)!);
    if ((o.soort === 'binnendeur' || o.soort === 'doorgang') && m.plus && m.min) verbind(m.plus, m.min);
  }
  for (let i = 0; i < plan.openingen.length; i++) {
    for (let j = i + 1; j < plan.openingen.length; j++) {
      const a = plan.openingen[i]!, b = plan.openingen[j]!;
      if (a.as !== b.as || !gelijk(a.lijn, b.lijn)) continue;
      if (Math.abs(a.midden - b.midden) < (a.breedte + b.breedte) / 2 + 5) uit.push({ ernst: 'fout', opening: b.id, melding: `${pre}Twee openingen overlappen elkaar of staan te dicht bij elkaar.` });
    }
  }

  // Daglicht en ventilatie.
  for (const r of plan.ruimtes) {
    const t = RUIMTE_TYPES[r.type];
    const maten = ruimteMaten(plan, r, muren);
    if (t.daglicht) {
      // Een lichtkoepel of lichtstraat telt mee voor het daglicht (niet voor de verluchting hieronder).
      const licht = maten.glas + maten.daklicht;
      if (licht === 0) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}${r.naam} heeft geen raam (daglicht).` });
      else if (licht < maten.netto / 10) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}${r.naam}: weinig daglicht (glas ${maten.daklicht ? 'en daklicht ' : ''}${licht.toFixed(1)} m² is minder dan 1/10 van de vloer; richtwaarde, te verifiëren).` });
    }
    if ((r.type === 'badkamer' || r.type === 'wc') && maten.glas === 0) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}${r.naam} zonder raam: mechanische afzuiging voorzien.` });
  }
}

// ---------- dak ----------

/** Dak zonder verdere keuze: plat met EPDM (zoals het platte dak er altijd uitzag). */
export const standaardDak = (): DakKeuze => ({ vorm: 'plat', helling: 35, richting: 'onder', oversteek: 40, bedekking: { materiaal: 'epdm', kleur: 'zwart' } });

/** De dakkeuze van het plan. Een plan met daklichten maar zonder keuze heeft een plat dak. */
export function dakVan(plan: Plattegrond): DakKeuze | undefined {
  return plan.dak ?? (plan.daklichten?.length ? standaardDak() : undefined);
}

/** Soort en kleur van een dakbedekking voor de 3D en de tekening (onbekend = effen donker, zoals EPDM). */
export function dakAfwerking(cat: PlanCatalogus | undefined, keuze: DakBedekking | undefined): { soort: BlokSoort; kleur: string } {
  const mat = keuze ? cat?.daken?.[keuze.materiaal] : undefined;
  if (!keuze || !mat) return { soort: 'dak', kleur: '#2e2e2e' };
  const kleur = mat.kleuren[keuze.kleur] ?? Object.values(mat.kleuren)[0];
  return { soort: mat.soort, kleur: kleur?.hex ?? '#2e2e2e' };
}

/** Delen van een verdieping waar geen ruimte van de verdieping erboven op ligt: daar ligt een plat dak. */
function vrijeDakstukken(plan: Plattegrond, n: number): { ruimte: Ruimte; stuk: Rechthoek }[] {
  const boven = niveauPlan(plan, n + 1).ruimtes.flatMap(delenVan);
  const uit: { ruimte: Ruimte; stuk: Rechthoek }[] = [];
  for (const r of niveauPlan(plan, n).ruimtes) for (const deel of delenVan(r)) {
    const vrij = boven.reduce<Rechthoek[]>((stukken, q) => stukken.flatMap((s) => trekAf(s, q)), [deel]);
    for (const s of vrij) uit.push({ ruimte: r, stuk: s });
  }
  return uit;
}

/** Voegt rechthoeken die aan elkaar sluiten samen tot zo weinig mogelijk stroken (liggend, van boven naar onder). */
export function voegSamen(stukken: Rechthoek[]): Rechthoek[] {
  const ys = [...new Set(stukken.flatMap((s) => [s.y, s.y + s.d]))].sort((a, b) => a - b);
  const uit: Rechthoek[] = [];
  for (let i = 0; i + 1 < ys.length; i++) {
    const y0 = ys[i]!, y1 = ys[i + 1]!;
    if (y1 - y0 < 0.01) continue;
    // De stukken die deze strook bedekken, als aaneengesloten intervallen in x.
    const stroken: [number, number][] = [];
    for (const s of stukken.filter((q) => q.y <= y0 + 0.01 && q.y + q.d >= y1 - 0.01).sort((a, b) => a.x - b.x)) {
      const laatste = stroken[stroken.length - 1];
      if (laatste && s.x <= laatste[1] + 0.01) laatste[1] = Math.max(laatste[1], s.x + s.b); else stroken.push([s.x, s.x + s.b]);
    }
    for (const [a, b] of stroken) {
      // Zelfde breedte als de strook erboven: die loopt gewoon door.
      const boven = uit.find((r) => Math.abs(r.x - a) < 0.01 && Math.abs(r.x + r.b - b) < 0.01 && Math.abs(r.y + r.d - y0) < 0.01);
      if (boven) boven.d = y1 - boven.y; else uit.push({ x: a, y: y0, b: b - a, d: y1 - y0 });
    }
  }
  return uit;
}

/** Een stuk buitenmuur zonder muur van de verdieping erboven: daar komt de dakrand (opstand met muurkap). */
export interface DakrandStuk { muur: Muur; vlak: MuurVlak; van: number; tot: number }

function dakrandStukken(plan: Plattegrond, n: number): DakrandStuk[] {
  const hier = murenVan(niveauPlan(plan, n)), boven = murenVan(niveauPlan(plan, n + 1));
  const uit: DakrandStuk[] = [];
  for (const m of hier.filter((x) => x.soort === 'buiten')) {
    const vlak = muurVlak(m, hier);
    const a0 = m.as === 'h' ? vlak.x : vlak.y, a1 = a0 + (m.as === 'h' ? vlak.b : vlak.d);
    let vrij: [number, number][] = [[a0, a1]];
    // Alle muren van de verdieping erboven die op deze muur staan (ook loodrechte, op een hoek).
    for (const b of boven) {
      const vb = muurVlak(b, boven);
      const ox = Math.min(vlak.x + vlak.b, vb.x + vb.b) - Math.max(vlak.x, vb.x), oz = Math.min(vlak.y + vlak.d, vb.y + vb.d) - Math.max(vlak.y, vb.y);
      if (ox <= 0.5 || oz <= 0.5) continue;
      const b0 = m.as === 'h' ? Math.max(vlak.x, vb.x) : Math.max(vlak.y, vb.y), b1 = b0 + (m.as === 'h' ? ox : oz);
      vrij = vrij.flatMap(([x, y]): [number, number][] => (b1 <= x || b0 >= y ? [[x, y]] : ([[x, Math.max(x, b0)], [Math.min(y, b1), y]] as [number, number][]).filter(([u, v]) => v - u > 0.5)));
    }
    for (const [x, y] of vrij) uit.push({ muur: m, vlak, van: x, tot: y });
  }
  return uit;
}

/** Alles wat uit de dakkeuze volgt; de 3D, de gevelaanzichten, de oppervlaktes, de offerte en de controles lezen dit. */
export interface DakOpbouw {
  keuze: DakKeuze;
  /** Hoogste verdieping met ruimtes: daar ligt het hoofddak. */
  top: number;
  /** Het hellende dak op de bovenste verdieping; ontbreekt bij een plat dak of als het hellende dak niet kan. */
  hellend?: HellendDak;
  /** Waarom het gevraagde hellende dak niet kan: de 3D, de gevels en de offerte rekenen dan met een plat dak. */
  terugval?: string;
  /** Bedekking van de platte stukken. */
  platBedekking: DakBedekking;
  /** Platte dakstukken (op de as van de muren) per verdieping en ruimte; de openingen van de daklichten zitten er nog in. */
  plat: (Rechthoek & { niveau: number; ruimte: string })[];
  /** Dakrand: de stukken buitenmuur onder een plat dak, per verdieping. */
  dakranden: (DakrandStuk & { niveau: number })[];
  /**
   * Alle daklichten. Met een `reden` ligt het daklicht niet op een plat dak: het wordt niet getekend of geteld.
   * `rand` = kleinste afstand tot de as van een muur van de ruimte (cm).
   */
  daklichten: { licht: DakLicht; reden?: string; rand: number }[];
  /** Hoeveelheden: bedekking hellend en plat (m²; plat zonder de openingen van de daklichten) en dakrand (m). */
  m2Hellend: number;
  m2Plat: number;
  mDakrand: number;
}

/**
 * De opbouw van het dak. Grens van deze ronde: een hellend dak (lessenaar of zadel) komt op de **bovenste verdieping**,
 * en alleen als die één rechthoek is. Lagere delen zonder verdieping erboven blijven plat (daar kunnen koepels).
 * Is de bovenste verdieping geen rechthoek (L- of U-vorm), dan valt alles terug op plat, met een melding.
 */
export function dakOpbouw(plan: Plattegrond): DakOpbouw | undefined {
  const keuze = dakVan(plan);
  if (!keuze || !plan.ruimtes.length) return undefined;
  const top = Math.max(...plan.ruimtes.map(niveauVan));
  let hellend: HellendDak | undefined, terugval: string | undefined;
  if (keuze.vorm !== 'plat') {
    const delen = niveauPlan(plan, top).ruimtes.flatMap(delenVan);
    const x0 = Math.min(...delen.map((q) => q.x)), y0 = Math.min(...delen.map((q) => q.y));
    const x1 = Math.max(...delen.map((q) => q.x + q.b)), y1 = Math.max(...delen.map((q) => q.y + q.d));
    // Eén rechthoek: de delen van alle ruimtes vullen samen hun omsluitende kader.
    const open = delen.reduce<Rechthoek[]>((st, q) => st.flatMap((s) => trekAf(s, q)), [{ x: x0, y: y0, b: x1 - x0, d: y1 - y0 }]).filter((s) => s.b > 1 && s.d > 1);
    if (open.length) {
      terugval = `Het ${keuze.vorm === 'zadel' ? 'zadeldak' : 'lessenaarsdak'} kan nog niet op deze vorm: ${top > 0 ? `de bovenste verdieping (${verdiepingenVan(plan)[top]?.naam})` : 'de woning'} is geen rechthoek. De 3D, de gevels en de offerte tonen een plat dak.`;
    } else {
      const t = plan.buitenmuur / 2;
      hellend = hellendDak({ x: x0 - t, y: y0 - t, b: x1 - x0 + 2 * t, d: y1 - y0 + 2 * t }, keuze);
    }
  }
  const plat: DakOpbouw['plat'] = [], dakranden: DakOpbouw['dakranden'] = [];
  for (let n = 0; n <= top; n++) {
    if (n === top && hellend) continue;
    for (const { ruimte, stuk } of vrijeDakstukken(plan, n)) plat.push({ ...stuk, niveau: n, ruimte: ruimte.id });
    for (const s of dakrandStukken(plan, n)) dakranden.push({ ...s, niveau: n });
  }
  const overlapt = (a: Rechthoek, b: Rechthoek) => Math.min(a.x + a.b, b.x + b.b) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y) > 0.5;
  const daklichten = (plan.daklichten ?? []).map((licht) => {
    const n = niveauVan(licht);
    const vak: Rechthoek = { x: licht.x, y: licht.y, b: licht.b, d: licht.d };
    const r = ruimteOp(plan, licht.x + licht.b / 2, licht.y + licht.d / 2, n);
    let reden: string | undefined, rand = Infinity;
    if (!r) reden = 'ligt niet boven een ruimte.';
    else if (hellend && n === top) reden = 'ligt onder het hellende dak: daar kan geen lichtkoepel (dakramen zijn voor later). Verwijder hem of kies een plat dak.';
    else {
      // Volledig op de platte dakstukken van één ruimte?
      const rest = plat.filter((s) => s.niveau === n && s.ruimte === r.id)
        .reduce<Rechthoek[]>((st, q) => st.flatMap((s) => trekAf(s, q)), [vak]).filter((s) => s.b > 0.5 && s.d > 0.5);
      if (rest.length) {
        reden = niveauPlan(plan, n + 1).ruimtes.flatMap(delenVan).some((q) => overlapt(q, vak))
          ? 'ligt onder een verdieping; een koepel kan alleen in een dak.'
          : 'ligt over een muur of buiten de ruimte. Verschuif hem tot hij volledig boven één ruimte ligt.';
      } else {
        for (const m of murenVan(niveauPlan(plan, n))) {
          if (m.plus !== r.id && m.min !== r.id) continue;
          const [a, b, v0, v1] = m.as === 'h' ? [vak.x, vak.x + vak.b, vak.y, vak.y + vak.d] : [vak.y, vak.y + vak.d, vak.x, vak.x + vak.b];
          if (Math.min(b, m.tot) - Math.max(a, m.van) > 0.5) rand = Math.min(rand, Math.abs(v0 - m.lijn), Math.abs(v1 - m.lijn));
        }
      }
    }
    return { licht, reden, rand };
  });
  const m2 = (x: Rechthoek) => (x.b * x.d) / 10000;
  return {
    keuze, top, hellend, terugval,
    platBedekking: keuze.vorm === 'plat' ? keuze.bedekking : keuze.plat ?? standaardDak().bedekking,
    plat, dakranden, daklichten,
    m2Hellend: hellend?.oppervlakte ?? 0,
    m2Plat: Math.max(0, plat.reduce((t, s) => t + m2(s), 0) - daklichten.filter((l) => !l.reden).reduce((t, l) => t + m2(l.licht), 0)),
    mDakrand: dakranden.reduce((t, s) => t + (s.tot - s.van), 0) / 100,
  };
}

/** Hellend dak in 3D: de dakvlakken, en de buitenmuren van de bovenste verdieping doorgetrokken tot onder het dak. */
function hellendDak3D(plan: Plattegrond, cat: PlanCatalogus, p: Plattegrond, d: HellendDak, yb: number, bedekking: { soort: BlokSoort; kleur: string }): Blok[] {
  const uit = dakBlokken(d, yb, bedekking);
  const muren = murenVan(p);
  const pleister: GevelAfwerking = { soort: 'gevel', kleur: '#efeee9' };
  const wandVan = (id?: string): GevelAfwerking => {
    const w = cat.wanden[p.ruimtes.find((r) => r.id === id)?.wand ?? ''];
    return w ? { soort: w.soort, kleur: w.kleur } : pleister;
  };
  for (const m of muren) {
    if (m.soort !== 'buiten') continue;
    const vlak = muurVlak(m, muren);
    const buiten = gevelAfwerking(plan, cat, gevelKeuzeVan(plan, m)), binnen = wandVan(m.plus ?? m.min);
    // Langs de muur (a) en dwars door haar dikte (t).
    const [a0, a1, t0, t1] = m.as === 'h' ? [vlak.x, vlak.x + vlak.b, vlak.y, vlak.y + vlak.d] : [vlak.y, vlak.y + vlak.d, vlak.x, vlak.x + vlak.b];
    const buitenMin = !m.min;
    const [aMin, aPlus] = buitenMin ? [buiten, binnen] : [binnen, buiten];
    const zijden: Blok['zijden'] = m.as === 'h' ? { 'z-': aMin, 'z+': aPlus } : { 'x-': aMin, 'x+': aPlus };
    if ((m.as === 'h') !== (d.nokAs === 'x')) {
      // Topgevel: de muur staat dwars op de nok, haar bovenrand volgt het dak.
      // Elk stuk grijpt 1 cm over de muurkop (anders schemert haar witte bovenkant door de naad).
      const punten = gevelOnderDak(d, a0, a1);
      if (punten.length) uit.push(prisma(`topgevel_${m.id}`, buiten.soort, buiten.kleur, m.as === 'h' ? 'z' : 'x', t0, t1, punten.map(([a, h]): [number, number] => [a, yb + (h === 0 ? -1 : h)]), { zijden, voeg: buiten.voeg }));
      continue;
    }
    // Muur evenwijdig met de nok: een recht stuk tot de laagste kant van het dak (de hoge gevel van een lessenaar),
    // en daarop een wig die de schuine onderkant van het dak volgt, dwars door de dikte van de muur.
    const hA = Math.max(0, dakHoogte(d, t0)), hB = Math.max(0, dakHoogte(d, t1));
    const laag = Math.min(hA, hB), hoog = Math.max(hA, hB);
    if (laag > 0.1) {
      const basis = { code: `dakmuur_${m.id}`, soort: buiten.soort, vorm: 'blok' as const, kleur: buiten.kleur, voeg: buiten.voeg, zijden, y: yb - 1, h: r2(laag + 1) };
      uit.push(m.as === 'h' ? { ...basis, x: a0, z: t0, b: a1 - a0, d: t1 - t0 } : { ...basis, x: t0, z: a0, b: t1 - t0, d: a1 - a0 });
    }
    if (hoog - laag > 0.1) {
      // Ligt de hoge kant van de wig buiten, dan zie je ze in de gevel; anders alleen van binnen.
      const zichtbaar = (hA > hB) === buitenMin;
      const afw = zichtbaar ? buiten : pleister;
      const koppen: Blok['zijden'] = m.as === 'h' ? { 'x-': buiten, 'x+': buiten } : { 'z-': buiten, 'z+': buiten };
      uit.push(prisma(`dakwig_${m.id}`, afw.soort, afw.kleur, m.as === 'h' ? 'x' : 'z', a0, a1, [[t0, yb + laag], [t1, yb + laag], [hA > hB ? t0 : t1, yb + hoog]], { zijden: koppen, voeg: afw.voeg }));
    }
  }
  return uit;
}

// ---------- 3D ----------

export interface OpeningInhoud {
  /** Blokken van raam of deur in lokale coördinaten (x langs de muur vanaf het begin van de opening, z = 0 buitenkant kader). */
  blokken: Blok[];
  /** Totale hoogte van de opening in de muur (kader + zonweringskast), in cm. */
  hoogte: number;
}

export interface Plan3DOpties {
  /** Muren laag afsnijden (cm) om binnen te kijken; undefined = volledige hoogte. */
  laag?: number;
  meubels?: boolean;
  /** Raam of buitendeur van een offertepositie. */
  inhoud?: (o: Opening) => OpeningInhoud | undefined;
  /** Alleen de verdiepingen tot en met dit niveau tonen (de bovenste zonder dak). */
  totNiveau?: number;
  /**
   * Het dak op de bovenste verdieping tonen (alleen met een dakkeuze in het plan, als alle verdiepingen getoond worden
   * en de muren niet laag staan). false = de bovenste verdieping open laten, om erin te kijken.
   */
  dak?: boolean;
  /**
   * Lichtinval: wat hierboven verborgen is (het dak, de verdiepingen erboven, de muren boven de snijhoogte) komt er
   * toch bij als blokken die alleen schaduw werpen (`alleenSchaduw`). Zo kijk je van boven in de kamers en valt de zon
   * er toch alleen door de ramen en de lichtkoepels in. Zonder dakkeuze rekent de schaduw met een plat dak.
   */
  lichtinval?: boolean;
  /**
   * Aanleg rond de woning: een terras voor elk schuifraam en elke buitendeur van het gelijkvloers, en een pad naar een
   * buitendeur in een hal (de voordeur). Hoort bij het gebouw en is dus gegevens (code `terras_…`, `pad_…`); lucht,
   * gras en horizon zijn weergave en komen van de kijker. Het kader (camera) blijft dat van de woning zelf.
   * Een benadering om het beeld af te maken: maten en plaats zijn niet door de gebruiker getekend.
   */
  aanleg?: boolean;
  /**
   * Een binnenmuur die tegen de gevel aansluit, loopt in de 3D door tot in het gevelvlak: haar kopse kant was daar een
   * witte streep van boven tot onder in de gevel. Met deze optie krijgt die kopse kant het materiaal van de gevel (en
   * van de sokkel), op een verdieping ook het stukje voor de rand van de vloerplaat, en de dakrand loopt er door. Uit = de blokken van vroeger
   * (de vingerafdrukken van bestaande projecten in de tests blijven gelijk).
   */
  gevelkoppen?: boolean;
  /**
   * Aantikken in de 3D: elk blok zegt bij welk ding het hoort, met de code `<ding>.<code>` (zoals de elementen van een
   * zetel). Dingen: `dak` (dak, dakrand, daklichten), `gevel:<ruimte>:<kant>` (het muurvlak, zie `vlakSleutel`; ook de
   * sokkel en de topgevel), `opening:<id>` (raam, buitendeur of poort met een positie), `ruimte:<id>` (vloer) en
   * `meubel:<id>`. De kijker meldt bij een tik het ding (`opKlik`) en kan het aanduiden (`markeer`). Binnenmuren,
   * binnendeuren en de aanleg horen bij geen ding. Uit = de codes van vroeger (vingerafdrukken en het 3D-pakket blijven gelijk).
   */
  dingen?: boolean;
}

/** Code van een blok met het ding waar het bij hoort (zie `Plan3DOpties.dingen`). */
const metDing = (opties: Plan3DOpties, ding: string | undefined, code: string) => (opties.dingen && ding ? `${ding}.${code}` : code);

/** Hele woning: alle verdiepingen op elkaar, met vloerplaten, trapgaten en platte daken. */
export function plattegrond3D(plan: Plattegrond, cat: PlanCatalogus, opties: Plan3DOpties = {}): Scene3D {
  const blokken: Blok[] = [];
  const niveaus = verdiepingenVan(plan).length;
  const laatste = Math.min(niveaus - 1, opties.totNiveau ?? niveaus - 1);
  const H = plan.muurhoogte;
  // Dak op de bovenste verdieping: alleen met een dakkeuze, als alles getoond wordt en de muren niet laag staan.
  const opbouw = dakOpbouw(plan);
  const topDak = !!opbouw && opties.dak !== false && !opties.laag && opties.totNiveau === undefined;
  const platAfw = dakAfwerking(cat, opbouw?.platBedekking);
  for (let n = 0; n <= laatste; n++) {
    const y0 = vloerHoogte(plan, n);
    const p = niveauPlan(plan, n);
    // Trapgaten: voetafdruk van de trappen op de verdieping eronder.
    const gaten = n > 0 ? plan.meubels.filter((m) => m.type === 'trap' && niveauVan(m) === n - 1).map(meubelVoetafdruk) : [];
    const zonderGaten = (r: Rechthoek) => gaten.reduce<Rechthoek[]>((stukken, g) => stukken.flatMap((s) => trekAf(s, g)), [r]);
    if (n > 0) {
      for (const r of p.ruimtes) for (const deel of delenVan(r)) for (const s of zonderGaten(deel)) {
        blokken.push({ code: metDing(opties, `ruimte:${r.id}`, `plaat_${r.id}`), soort: 'gevel', vorm: 'blok', x: s.x, y: y0 - VLOERDIKTE, z: s.y, b: s.b, h: VLOERDIKTE, d: s.d, kleur: '#c9c6bf' });
      }
    }
    const isTop = !!opbouw && n === opbouw.top;
    const hellendHier = isTop && topDak && !!opbouw.hellend;
    const scene = niveau3D(p, cat, { ...opties, laag: n === laatste ? opties.laag : undefined }, zonderGaten, n, hellendHier);
    for (const b of scene) blokken.push({ ...b, y: r2(b.y + y0) });
    // Plat dak: boven de delen die niet onder een hogere (getoonde) verdieping liggen, en met een dakkeuze ook
    // op de bovenste verdieping.
    const platHier = !hellendHier && (n < laatste || (isTop && topDak));
    // Dakrand (opstand met muurkap) op de buitenmuren waar geen muur van de verdieping erboven op staat.
    if (platHier) {
      // Sluit op dit punt een binnenmuur tegen deze (staande) buitenmuur aan? Dan is de buitenmuur daar onderbroken
      // over de dikte van de binnenmuur, en de dakrand ook. Met `gevelkoppen` loopt de dakrand er door.
      const murenHier = opties.gevelkoppen ? murenVan(p) : [];
      const onderbroken = (m: Muur, punt: number) => m.as === 'v'
        && murenHier.some((h) => h.as === 'h' && h.soort === 'binnen' && gelijk(h.lijn, punt) && (gelijk(h.van, m.lijn) || gelijk(h.tot, m.lijn)))
        && !murenHier.some((h) => h.as === 'h' && h.soort === 'buiten' && gelijk(h.lijn, punt) && h.van <= m.lijn + 0.5 && h.tot >= m.lijn - 0.5);
      for (const { muur: m, vlak, van, tot } of dakrandStukken(plan, n)) {
        const x = gelijk(van, vlak.y) && onderbroken(m, m.van) ? m.van : van, y = gelijk(tot, vlak.y + vlak.d) && onderbroken(m, m.tot) ? m.tot : tot;
        const basis = { code: metDing(opties, 'dak', `dakrand_${m.id}_${van}`), soort: 'kunststof' as BlokSoort, vorm: 'blok' as const, kleur: '#2b2b2b', y: y0 + H, h: VLOERDIKTE + 2 };
        if (!opbouw) {
          blokken.push(m.as === 'h' ? { ...basis, x, z: vlak.y, b: y - x, d: vlak.d } : { ...basis, x: vlak.x, z: x, b: vlak.b, d: y - x });
          continue;
        }
        // Met dakkeuze: een muurkap die 1,5 cm buiten de muur steekt en 1 cm over de muurkop grijpt. Zo vallen er geen
        // vlakken samen en schemert de witte bovenkant van de muur niet als een stippellijn door de naad.
        const kap = { ...basis, y: y0 + H - 1, h: VLOERDIKTE + 3 }, u = 1.5;
        blokken.push(m.as === 'h' ? { ...kap, x, z: vlak.y - u, b: y - x, d: vlak.d + 2 * u } : { ...kap, x: vlak.x - u, z: x, b: vlak.b + 2 * u, d: y - x });
      }
    }
    if (platHier) {
      const lichten = opbouw ? opbouw.daklichten.filter((l) => !l.reden && niveauVan(l.licht) === n).map((l) => l.licht) : [];
      const bedekt: Rechthoek[] = [];
      for (const { ruimte: r, stuk } of vrijeDakstukken(plan, n)) {
        if (!opbouw) {
          // Zonder dakkeuze: het effen donkere blok van altijd.
          blokken.push({ code: metDing(opties, 'dak', `dak_${r.id}`), soort: 'dak', vorm: 'blok', x: stuk.x, y: y0 + H, z: stuk.y, b: stuk.b, h: VLOERDIKTE, d: stuk.d, kleur: '#2e2e2e' });
          continue;
        }
        // Met dakkeuze: per ruimte een dakplaat met een lichte onderkant (het plafond), en een opening per daklicht.
        // Haar zijkanten en bovenkant krijgen de kleur van de bedekking: een staand vlak vlak onder het dak schemert
        // onder een schuine kijkhoek als een stippellijn door het dakvlak (zo zie je het niet).
        for (const s of lichten.reduce<Rechthoek[]>((st, l) => st.flatMap((q) => trekAf(q, l)), [stuk])) {
          blokken.push({
            code: metDing(opties, 'dak', `dakplaat_${r.id}`), soort: 'gevel', vorm: 'blok', x: s.x, y: y0 + H, z: s.y, b: s.b, h: VLOERDIKTE - DAK_LAAG, d: s.d, kleur: '#c9c6bf',
            zijden: { 'y+': platAfw, 'x-': platAfw, 'x+': platAfw, 'z-': platAfw, 'z+': platAfw },
          });
          bedekt.push(s);
        }
      }
      // Daarop de bedekking als één laag voor de hele verdieping, in zo weinig mogelijk stroken: geen naad boven elke
      // binnenmuur. Waar twee stroken toch aan elkaar sluiten, grijpen ze een halve centimeter in elkaar.
      for (const s of voegSamen(bedekt)) {
        blokken.push({ code: metDing(opties, 'dak', `dak_${n}`), soort: platAfw.soort, vorm: 'blok', x: s.x - 0.5, y: y0 + H + VLOERDIKTE - DAK_LAAG, z: s.y - 0.5, b: s.b + 1, h: DAK_LAAG, d: s.d + 1, kleur: platAfw.kleur });
      }
      for (const l of lichten) blokken.push(...daklichtBlokken(l, cat.daklichten?.[l.type]?.vorm ?? 'koepel', y0 + H + VLOERDIKTE, VLOERDIKTE).map((b) => ({ ...b, code: metDing(opties, 'dak', b.code) })));
    }
    if (hellendHier) {
      const dak = hellendDak3D(plan, cat, p, opbouw.hellend!, y0 + H, dakAfwerking(cat, opbouw.keuze.bedekking));
      // De topgevel en de hoge gevel van een lessenaar horen bij het muurvlak eronder, de rest bij het dak.
      const muurVan = opties.dingen ? new Map(murenVan(p).map((m) => [m.id, m])) : undefined;
      const gevelVan = (code: string) => {
        const m = muurVan?.get(/^(?:topgevel|dakmuur|dakwig)_(.+)$/.exec(code)?.[1] ?? '');
        return m?.soort === 'buiten' ? `gevel:${vlakSleutel(m)}` : 'dak';
      };
      blokken.push(...(opties.dingen ? dak.map((b) => ({ ...b, code: metDing(opties, gevelVan(b.code), b.code) })) : dak));
    }
  }
  if (opties.lichtinval && plan.ruimtes.length) {
    // De hele woning, met dak (zonder dakkeuze een plat dak): alles wat daarvan niet getoond wordt, werpt alleen schaduw.
    // Glas laat het licht door. Het kader (voor de camera) blijft dat van wat je ziet.
    const vol = plattegrond3D(plan.dak ? plan : { ...plan, dak: standaardDak() }, cat, { meubels: opties.meubels, inhoud: opties.inhoud, dingen: opties.dingen }).blokken;
    const getoond = new Set(blokken.map((b) => JSON.stringify(b)));
    const kader = kaderVan(blokken);
    for (const b of vol) {
      if (b.soort === 'glas' || b.soort === 'matglas' || getoond.has(JSON.stringify(b))) continue;
      blokken.push({ ...b, code: `schaduw_${b.code}`, alleenSchaduw: true });
    }
    if (opties.aanleg) blokken.push(...aanlegBlokken(plan));
    return { blokken, kader };
  }
  // Het kader is dat van de woning zelf: met terras en pad erbij zou de camera verder weg gaan staan.
  const kader = kaderVan(blokken);
  if (opties.aanleg) blokken.push(...aanlegBlokken(plan));
  return { blokken, kader };
}

/** Maten van de aanleg (cm): diepte van een terras, lengte van het pad naar de voordeur, en hoe ver ze naast de opening uitsteken. */
const AANLEG = { terrasDiep: 320, terrasNaast: 110, stoepDiep: 160, stoepNaast: 40, padLang: 520, padNaast: 25, boven: 1.2, dik: 8 };

/**
 * Terras en pad bij de woning (zie `Plan3DOpties.aanleg`), als blokken op het maaiveld. Per opening in een buitenmuur
 * van het gelijkvloers: een schuifraam krijgt een terras in tegels, een buitendeur in een hal (de voordeur) een pad in
 * grind met een stoep, een andere buitendeur een kleine stoep. Wat onder de woning zou vallen of een eerder stuk
 * overlapt, valt weg: zo liggen er nooit twee vlakken op dezelfde plaats.
 */
function aanlegBlokken(plan: Plattegrond): Blok[] {
  const p = niveauPlan(plan, 0);
  const muren = murenVan(p);
  const ruimte = new Map(p.ruimtes.map((r) => [r.id, r]));
  const half = plan.buitenmuur / 2;
  // Voetafdruk van de woning: elke ruimte tot aan de buitenkant van de buitenmuur.
  const woning: Rechthoek[] = p.ruimtes.flatMap(delenVan).map((d) => ({ x: d.x - half, y: d.y - half, b: d.b + 2 * half, d: d.d + 2 * half }));
  const gelegd: Rechthoek[] = [];
  const uit: Blok[] = [];
  const leg = (code: string, soort: BlokSoort, kleur: string, r: Rechthoek) => {
    const stukken = [...woning, ...gelegd].reduce<Rechthoek[]>((st, w) => st.flatMap((s) => trekAf(s, w)), [r]);
    stukken.forEach((s, i) => {
      if (s.b < 5 || s.d < 5) return;
      uit.push({ code: stukken.length > 1 ? `${code}_${i}` : code, soort, vorm: 'blok', x: r2(s.x), y: AANLEG.boven - AANLEG.dik, z: r2(s.y), b: r2(s.b), h: AANLEG.dik, d: r2(s.d), kleur });
      gelegd.push(s);
    });
  };
  // Vlak tegen de gevel: `naast` cm voorbij de opening aan elke kant, `diep` cm naar buiten vanaf `vanaf` cm van de gevel.
  const vlak = (o: Opening, m: Muur, naast: number, vanaf: number, diep: number): Rechthoek => {
    const naarPlus = !!m.min, rand = m.lijn + (naarPlus ? m.dikte / 2 : -m.dikte / 2);
    const a = o.midden - o.breedte / 2 - naast, lang = o.breedte + 2 * naast;
    const b0 = naarPlus ? rand + vanaf : rand - vanaf - diep;
    return m.as === 'h' ? { x: a, y: b0, b: lang, d: diep } : { x: b0, y: a, b: diep, d: lang };
  };
  const buiten = p.openingen
    .map((o) => ({ o, m: muurVanOpening(o, muren) }))
    .filter((x): x is { o: Opening; m: Muur } => !!x.m && x.m.soort === 'buiten' && (x.o.soort === 'schuifraam' || x.o.soort === 'buitendeur'));
  // Eerst de terrassen (het grootste vlak), dan stoepen en paden: wat later komt, wijkt voor wat er al ligt.
  for (const { o, m } of buiten) if (o.soort === 'schuifraam') leg(`terras_${o.id}`, 'tegel', '#b5b0a6', vlak(o, m, AANLEG.terrasNaast, 0, AANLEG.terrasDiep));
  for (const { o, m } of buiten) {
    if (o.soort !== 'buitendeur') continue;
    const voordeur = ruimte.get(m.plus ?? m.min ?? '')?.type === 'hal';
    leg(`terras_${o.id}`, 'tegel', '#b5b0a6', vlak(o, m, AANLEG.stoepNaast, 0, AANLEG.stoepDiep));
    if (voordeur) leg(`pad_${o.id}`, 'grind', '#b9b1a0', vlak(o, m, AANLEG.padNaast, AANLEG.stoepDiep, AANLEG.padLang - AANLEG.stoepDiep));
  }
  return uit;
}

/** Eén verdieping (vloer op y = 0). */
function niveau3D(plan: Plattegrond, cat: PlanCatalogus, opties: Plan3DOpties, zonderGaten: (r: Rechthoek) => Rechthoek[], n = 0, onderHellendDak = false): Blok[] {
  const blokken: Blok[] = [];
  const muren = murenVan(plan);
  const H = plan.muurhoogte;
  const top = opties.laag ? Math.min(opties.laag, H) : H;
  const pleister = '#efeee9';
  const ruimte = new Map(plan.ruimtes.map((r) => [r.id, r]));
  const wandVan = (id?: string): GevelAfwerking => {
    const r = id ? ruimte.get(id) : undefined;
    if (!r) return plan.gevel;
    const w = cat.wanden[r.wand];
    return w ? { soort: w.soort, kleur: w.kleur } : { soort: 'gevel' as BlokSoort, kleur: pleister };
  };
  const knip = (b: Blok): Blok | undefined => {
    if (b.y >= top) return undefined;
    return b.y + b.h > top ? { ...b, h: r2(top - b.y) } : b;
  };
  const voeg = (b: Blok | undefined, afsnijden = true) => {
    const k = b && (afsnijden ? knip(b) : b);
    if (k && k.b > 0.05 && k.h > 0.05 && k.d > 0.05) blokken.push(k);
  };

  // Vloeren (met trapgat).
  for (const r of plan.ruimtes) {
    const v = cat.vloeren[r.vloer];
    for (const s of delenVan(r).flatMap(zonderGaten)) {
      voeg({ code: metDing(opties, `ruimte:${r.id}`, `vloer_${r.id}`), soort: v?.soort ?? 'gevel', vorm: 'blok', x: s.x, y: 0, z: s.y, b: s.b, h: 1.5, d: s.d, kleur: v?.kleur ?? '#cfccc4' });
    }
  }

  // Gevelafwerking: per muurvlak (gevelontwerp) en een sokkel onderaan het gelijkvloers.
  const sokkel = n === 0 && plan.gevelOntwerp?.sokkel && plan.gevelOntwerp.sokkel.hoogte > 0 ? plan.gevelOntwerp.sokkel : undefined;
  const sokkelAfw = sokkel ? gevelAfwerking(plan, cat, sokkel) : undefined;
  const buitenAfw = (m: Muur, y: number) => (sokkel && sokkelAfw && y < sokkel.hoogte ? sokkelAfw : gevelAfwerking(plan, cat, gevelKeuzeVan(plan, m)));
  // Kopse kant op een buitenhoek: het materiaal van de gevel ernaast (de loodrechte buitenmuur die daar eindigt).
  const hoekMuur = (m: Muur, p: number) => muren.find((v) => v.as !== m.as && v.soort === 'buiten' && gelijk(v.lijn, p) && (gelijk(v.van, m.lijn) || gelijk(v.tot, m.lijn)));

  // Muren met openingen.
  for (const m of muren) {
    const vlak = muurVlak(m, muren);
    const plusWand = wandVan(m.plus), minWand = wandVan(m.min);
    const begin = m.as === 'h' ? vlak.x : vlak.y, einde = begin + (m.as === 'h' ? vlak.b : vlak.d);
    // Op een verdieping loopt de buitenmuur door voor de rand van de vloerplaat.
    const onderkant = n > 0 && m.soort === 'buiten' ? -VLOERDIKTE : 0;
    const stuk = (code: string, a: number, b: number, y0: number, y1: number) => {
      // Eerst verlengen (ook onder een deur op de verdieping komt de rand van de vloerplaat), dan pas de maat controleren.
      if (m.soort === 'buiten' && y0 === 0 && onderkant < 0) y0 = onderkant;
      if (b - a < 0.1 || y1 - y0 < 0.1) return;
      // Sokkel: het stuk onder de sokkelhoogte apart, met het sokkelmateriaal buiten.
      if (m.soort === 'buiten' && sokkel && y0 < sokkel.hoogte - 0.1 && y1 > sokkel.hoogte + 0.1) {
        stuk(`${code}_sokkel`, a, b, y0, sokkel.hoogte);
        stuk(code, a, b, sokkel.hoogte, y1);
        return;
      }
      const buiten = m.soort === 'buiten' ? buitenAfw(m, y0) : undefined;
      // Binnenmuur die tot in het gevelvlak loopt (zie `Plan3DOpties.gevelkoppen`): de buitenmuur aan haar begin en einde.
      const kopIn = opties.gevelkoppen && m.soort === 'binnen' && m.as === 'h'
        ? [vlak.verlengdBegin && gelijk(a, begin) ? hoekMuur(m, m.van) : undefined, vlak.verlengdEinde && gelijk(b, einde) ? hoekMuur(m, m.tot) : undefined]
        : [];
      if (kopIn.some(Boolean) && sokkel && y0 < sokkel.hoogte - 0.1 && y1 > sokkel.hoogte + 0.1) {
        stuk(`${code}_sokkel`, a, b, y0, sokkel.hoogte);
        stuk(code, a, b, sokkel.hoogte, y1);
        return;
      }
      const zijden: Blok['zijden'] = m.as === 'h'
        ? { 'z+': m.plus || !buiten ? plusWand : buiten, 'z-': m.min || !buiten ? minWand : buiten }
        : { 'x+': m.plus || !buiten ? plusWand : buiten, 'x-': m.min || !buiten ? minWand : buiten };
      // Kopse kant waar de buitenmuur in een volgend stuk doorloopt (bv. waar een binnenmuur aansluit):
      // ook gevelmateriaal, anders schemert de witte snijkant als een haarlijn door de naad.
      if (buiten) {
        const [za, zb] = m.as === 'h' ? (['x-', 'x+'] as const) : (['z-', 'z+'] as const);
        if (gelijk(a, begin) && !vlak.verlengdBegin) zijden[za] = buiten;
        if (gelijk(b, einde) && !vlak.verlengdEinde) zijden[zb] = buiten;
      }
      // Kopse kant van een buitenmuur op een buitenhoek: gevelafwerking van de gevel ernaast.
      if (buiten && m.as === 'h') {
        const hoek = (p: number) => { const v = hoekMuur(m, p); return v ? buitenAfw(v, y0) : buiten; };
        if (vlak.verlengdBegin && gelijk(a, begin)) zijden['x-'] = hoek(m.van);
        if (vlak.verlengdEinde && gelijk(b, einde)) zijden['x+'] = hoek(m.tot);
      }
      if (kopIn[0]) zijden['x-'] = buitenAfw(kopIn[0], y0);
      if (kopIn[1]) zijden['x+'] = buitenAfw(kopIn[1], y0);
      // Op een verdieping begint de buitenmuur lager, voor de rand van de vloerplaat: daar ook een stukje gevel onder de kop.
      if (n > 0 && y0 === 0) {
        for (const [gevelMuur, x0] of [[kopIn[0], a], [kopIn[1], b - (kopIn[1]?.dikte ?? 0) / 2]] as const) {
          if (!gevelMuur) continue;
          const afw = buitenAfw(gevelMuur, -VLOERDIKTE);
          voeg({ code: `${code}_kop`, soort: afw.soort, vorm: 'blok', kleur: afw.kleur, voeg: afw.voeg, x: x0, y: -VLOERDIKTE, z: vlak.y, b: gevelMuur.dikte / 2, h: VLOERDIKTE, d: vlak.d });
        }
      }
      // Onder een hellend dak staat op de muurkop nog een stuk gevel (topgevel): de kop krijgt dan ook gevelmateriaal,
      // anders schemert zijn witte bovenkant als een stippellijn door de naad.
      if (onderHellendDak && buiten && y1 >= H - 0.1) zijden['y+'] = buiten;
      const base = { code: metDing(opties, m.soort === 'buiten' ? `gevel:${vlakSleutel(m)}` : undefined, code), soort: 'gevel' as BlokSoort, vorm: 'blok' as const, kleur: pleister, zijden, y: y0, h: y1 - y0 };
      voeg(m.as === 'h' ? { ...base, x: a, z: vlak.y, b: b - a, d: vlak.d } : { ...base, x: vlak.x, z: a, b: vlak.b, d: b - a });
    };
    const openingen = plan.openingen.filter((o) => muurVanOpening(o, [m]) === m).sort((a, b) => a.midden - b.midden);
    let cursor = begin;
    for (const o of openingen) {
      const a = o.midden - o.breedte / 2, b = o.midden + o.breedte / 2;
      stuk(`muur_${m.id}_${cursor}`, cursor, a, 0, H);
      const inhoud = opties.inhoud?.(o);
      const hoogte = inhoud?.hoogte ?? (o.soort === 'doorgang' ? o.hoogte : o.hoogte + 4);
      // Vensterbank of dorpel: de muur eronder stopt onder de dunste ervan. Anders vallen de bovenvlakken van
      // muur en vensterbank samen en flikkert de vensterbank in witte en donkere strepen.
      const dorpels = (inhoud?.blokken ?? []).filter((x) => (x.code === 'vensterbank' || x.code === 'dorpel') && x.y < 0).map((x) => -x.y);
      stuk(`onder_${o.id}`, a, b, 0, o.borstwering - (dorpels.length ? Math.min(...dorpels) : 0));
      stuk(`boven_${o.id}`, a, b, Math.min(H, o.borstwering + hoogte), H);
      for (const blok of openingBlokken(o, m, inhoud, cat)) voeg(o.positie ? { ...blok, code: metDing(opties, `opening:${o.id}`, blok.code) } : blok);
      cursor = b;
    }
    stuk(`muur_${m.id}_eind`, cursor, einde, 0, H);
  }

  // Meubels.
  if (opties.meubels !== false) {
    for (const mb of plan.meubels) {
      const t = cat.meubels[mb.type];
      if (!t) continue;
      // Een trap loopt altijd tot de vloer van de verdieping erboven.
      for (const b of meubelIn3D(mb, mb.type === 'trap' ? { ...t, h: H + VLOERDIKTE } : t)) voeg({ ...b, code: metDing(opties, `meubel:${mb.id}`, b.code), y: b.y + 1.5 }, false);
    }
  }
  return blokken;
}

/** Raam, deur of doorgang op de juiste plaats en in de juiste richting in de muur. */
function openingBlokken(o: Opening, m: Muur, inhoud: OpeningInhoud | undefined, cat: PlanCatalogus): Blok[] {
  const a = o.midden - o.breedte / 2, b = o.midden + o.breedte / 2;
  const half = m.dikte / 2;
  if (o.soort === 'doorgang') return [];
  if (o.soort === 'binnendeur' || !inhoud) {
    // Lokaal: x langs de muur, z van de min-kant (0) naar de plus-kant (dikte).
    const lokaal = binnendeurBlokken(o, m.dikte, cat, m.as === 'v');
    return m.as === 'h'
      ? plaatsBlokken(lokaal, { x: a, z: m.lijn - half, y: o.borstwering })
      : plaatsBlokken(lokaal, { x: m.lijn - half, z: b, y: o.borstwering, draai: 270 });
  }
  // Buitenmuur: het kader staat 10 cm achter de buitenkant van de muur.
  const buitenIsMin = m.soort === 'binnen' ? !o.naarPlus : !m.min;
  const y = o.borstwering;
  if (m.as === 'h') {
    return buitenIsMin
      ? plaatsBlokken(inhoud.blokken, { x: a, z: m.lijn - half + 10, y })
      : plaatsBlokken(inhoud.blokken, { x: b, z: m.lijn + half - 10, y, draai: 180 });
  }
  return buitenIsMin
    ? plaatsBlokken(inhoud.blokken, { x: m.lijn - half + 10, z: b, y, draai: 270 })
    : plaatsBlokken(inhoud.blokken, { x: m.lijn + half - 10, z: a, y, draai: 90 });
}

/** Binnendeur in lokale coördinaten: kader in de muur, deurblad 90° open naar de draaikant. */
function binnendeurBlokken(o: Opening, dikte: number, cat: PlanCatalogus, omgekeerd: boolean): Blok[] {
  const t = cat.binnendeuren[o.deurtype ?? ''] ?? { label: '', soort: 'kunststof' as BlokSoort, kleur: '#f3f2ee' };
  const B = o.breedte, H = o.hoogte, k = 4;
  const uit: Blok[] = [];
  const blok = (code: string, soort: BlokSoort, x: number, y: number, z: number, b: number, h: number, d: number, kleur: string) =>
    uit.push({ code: `${code}_${o.id}`, soort, vorm: 'blok', x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d), kleur });
  const kader = t.soort === 'metaal' ? '#2a2a2a' : '#f3f2ee';
  blok('kader_l', 'kunststof', 0, 0, -1, k, H + k, dikte + 2, kader);
  blok('kader_r', 'kunststof', B - k, 0, -1, k, H + k, dikte + 2, kader);
  blok('kader_b', 'kunststof', k, H, -1, B - 2 * k, k, dikte + 2, kader);
  if (o.deurtype === 'schuif') {
    // Schuifdeur in de wand: blad half in de muur geschoven.
    blok('blad', t.soort, -B * 0.45, 0, dikte / 2 - 2, B - 2 * k, H - 1, 4, t.kleur);
    return uit;
  }
  // Scharnier: lokaal x = 0 is het begin van de muur bij een h-muur; bij een v-muur is dat omgekeerd.
  const scharnierBijNul = (o.scharnier === 'begin') !== omgekeerd;
  const bladB = B - 2 * k;
  const x = scharnierBijNul ? k : B - k - 4;
  const z = o.naarPlus ? dikte : -bladB;
  if (t.soort === 'glas') {
    blok('blad', 'glas', x + 0.5, 0.5, z, 3, H - 1.5, bladB, '#c5d5da');
    blok('blad_rand', 'metaal', x, 0.5, z, 4, 3, bladB, '#2a2a2a');
  } else {
    blok('blad', t.soort, x, 0.5, z, 4, H - 1.5, bladB, t.kleur);
  }
  const kz = o.naarPlus ? dikte + bladB - 10 : -bladB + 6;
  blok('klink', 'metaal', scharnierBijNul ? x + 4 : x - 2, 100, kz, 2, 2, 4, '#b9b9b4');
  return uit;
}

// ---------- meubels ----------

/** Meubel als blokken in de wereld (gedraaid en op zijn plaats). */
export function meubelIn3D(m: Meubel, t: MeubelType): Blok[] {
  const lokaal = meubelBlokken(t.vorm, m.b, m.d, t.h, m.kleur ?? t.kleur).map((b) => ({ ...b, code: `${m.id}_${b.code}` }));
  const verschuif: Record<number, [number, number]> = { 0: [0, 0], 90: [m.d, 0], 180: [m.b, m.d], 270: [0, m.b] };
  const [dx, dz] = verschuif[m.rotatie] ?? [0, 0];
  return plaatsBlokken(lokaal, { x: m.x + dx, z: m.y + dz, draai: m.rotatie });
}

/** Voetafdruk van een meubel op de plattegrond (na draaien). */
export function meubelVoetafdruk(m: Meubel): { x: number; y: number; b: number; d: number } {
  const gedraaid = m.rotatie === 90 || m.rotatie === 270;
  return { x: m.x, y: m.y, b: gedraaid ? m.d : m.b, d: gedraaid ? m.b : m.d };
}

function donker(hex: string, f = 0.75): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('')}`;
}

/** Eenvoudige meubelvormen in lokale coördinaten (voorkant = z groot). */
export function meubelBlokken(vorm: MeubelVorm, B: number, D: number, H: number, kleur: string): Blok[] {
  const uit: Blok[] = [];
  const blok = (code: string, soort: BlokSoort, x: number, y: number, z: number, b: number, h: number, d: number, k: string, extra: Partial<Blok> = {}) => {
    if (b > 0.05 && h > 0.05 && d > 0.05) uit.push({ code, soort, vorm: 'blok', x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d), kleur: k, ...extra });
  };
  const poten = (soort: BlokSoort, k: string, h: number, inspring = 4, dikte = 5) => {
    for (const [x, z] of [[inspring, inspring], [B - inspring - dikte, inspring], [inspring, D - inspring - dikte], [B - inspring - dikte, D - inspring - dikte]] as const)
      blok(`poot_${x}_${z}`, soort, x, 0, z, dikte, h, dikte, k);
  };
  const wit = '#f4f4f1', eik = '#b48a5a', zwart = '#2a2a2a';
  switch (vorm) {
    case 'bank':
    case 'fauteuil': {
      const arm = Math.min(18, B * 0.15), rug = Math.min(20, D * 0.22);
      poten('hout', eik, 10, 6, 4);
      blok('onderstel', 'stof', 0, 10, 0, B, 30, D, kleur, { afronding: 3 });
      blok('rug', 'stof', 0, 10, 0, B, H - 10, rug, kleur, { afronding: 6 });
      blok('arm_l', 'stof', 0, 10, 0, arm, 52, D, kleur, { afronding: 6 });
      blok('arm_r', 'stof', B - arm, 10, 0, arm, 52, D, kleur, { afronding: 6 });
      const n = vorm === 'fauteuil' ? 1 : Math.max(2, Math.round((B - 2 * arm) / 80));
      const kb = (B - 2 * arm) / n;
      for (let i = 0; i < n; i++) {
        blok(`zit${i}`, 'kussen', arm + i * kb + 0.5, 40, rug, kb - 1, 12, D - rug - 2, kleur, { afronding: 5 });
        blok(`rugkussen${i}`, 'kussen', arm + i * kb + 0.5, 50, rug - 2, kb - 1, H - 55, 14, kleur, { afronding: 6, kantel: { graden: 8, richting: 'z-' } });
      }
      break;
    }
    case 'tafel':
      blok('blad', 'hout', 0, H - 4, 0, B, 4, D, kleur);
      poten('metaal', zwart, H - 4, 6, 5);
      break;
    case 'stoel':
      blok('zit', 'hout', 0, 44, 0, B, 4, D, kleur);
      blok('rug', 'hout', 0, 48, 0, B, H - 48, 4, kleur);
      poten('metaal', zwart, 44, 2, 3);
      break;
    case 'bed': {
      blok('kader', 'stof', 0, 10, 0, B, 25, D, kleur, { afronding: 2 });
      blok('hoofdbord', 'stof', 0, 10, 0, B, H - 10, 8, kleur, { afronding: 3 });
      blok('matras', 'kussen', 3, 35, 9, B - 6, 20, D - 12, wit, { afronding: 4 });
      blok('dekbed', 'stof', 2, 50, D * 0.38, B - 4, 7, D * 0.62 - 2, '#d9d4c9', { afronding: 3 });
      const n = B > 120 ? 2 : 1;
      for (let i = 0; i < n; i++) blok(`kussen${i}`, 'kussen', 8 + (i * (B - 16)) / n, 55, 12, (B - 16) / n - 4, 12, 35, wit, { afronding: 5 });
      poten('hout', eik, 10, 5, 5);
      break;
    }
    case 'nachtkast':
      blok('kast', 'hout', 0, 0, 0, B, H, D, kleur);
      blok('lade', 'donker', 2, H - 14, D, B - 4, 1, 0.3, donker(kleur));
      break;
    case 'kast': {
      blok('kast', 'kunststof', 0, 0, 0, B, H, D, kleur);
      const deuren = Math.max(1, Math.round(B / 50));
      for (let i = 1; i < deuren; i++) blok(`naad${i}`, 'donker', (i * B) / deuren - 0.3, 2, D, 0.6, H - 4, 0.3, donker(kleur, 0.6));
      for (let i = 0; i < deuren; i++) blok(`greep${i}`, 'metaal', (i + 0.5) * (B / deuren) + (i % 2 ? -B / deuren / 2 + 4 : B / deuren / 2 - 6), H / 2 - 15, D, 2, 30, 2, '#9a9a96');
      break;
    }
    case 'keuken': {
      blok('plint', 'donker', 0, 0, 0, B, 10, D - 5, '#2b2b2b');
      blok('onderkasten', 'kunststof', 0, 10, 0, B, 76, D - 2, kleur);
      blok('werkblad', 'gevel', 0, 86, 0, B, 4, D + 2, '#e6e3dc');
      const kasten = Math.max(1, Math.round(B / 60));
      for (let i = 1; i < kasten; i++) blok(`naad${i}`, 'donker', (i * B) / kasten - 0.3, 12, D - 2, 0.6, 72, 0.3, donker(kleur, 0.6));
      blok('kookplaat', 'donker', B * 0.2, 90, 6, 60, 0.6, 50, '#151515');
      blok('spoelbak', 'metaal', B * 0.62, 88.5, 8, 50, 2, 40, '#b9bcbd');
      blok('kraan', 'metaal', B * 0.62 + 23, 90, 3, 4, 30, 4, '#b9bcbd', { vorm: 'cilinder' });
      blok('bovenkasten', 'kunststof', 0, 150, 0, B, 70, 35, kleur);
      for (let i = 1; i < kasten; i++) blok(`bnaad${i}`, 'donker', (i * B) / kasten - 0.3, 152, 35, 0.6, 66, 0.3, donker(kleur, 0.6));
      break;
    }
    case 'eiland':
      blok('plint', 'donker', 5, 0, 5, B - 10, 10, D - 10, '#2b2b2b');
      blok('kasten', 'kunststof', 0, 10, 0, B, 76, D - 25, kleur);
      blok('werkblad', 'gevel', 0, 86, 0, B, 4, D, '#e6e3dc');
      break;
    case 'koelkast':
      blok('kolom', 'kunststof', 0, 0, 0, B, H, D, kleur);
      blok('naad', 'donker', 1, H * 0.62, D, B - 2, 0.6, 0.3, donker(kleur, 0.6));
      blok('greep', 'metaal', B - 6, H * 0.65, D, 2, 40, 2, '#9a9a96');
      break;
    case 'bad':
      blok('bad', 'gevel', 0, 0, 0, B, H, D, wit, { afronding: 4 });
      blok('water', 'glas', 6, H - 6, 6, B - 12, 2, D - 12, '#9cc6d6');
      blok('kraan', 'metaal', B / 2 - 2, H, 1, 4, 14, 4, '#b9bcbd', { vorm: 'cilinder' });
      break;
    case 'douche':
      blok('bak', 'gevel', 0, 0, 0, B, 4, D, wit);
      blok('wand', 'glas', B - 1, 4, 0, 1, H - 4, D * 0.7, '#c5d5da');
      blok('stang', 'metaal', B / 2 - 1, 4, 2, 2, H - 20, 2, '#b9bcbd', { vorm: 'cilinder' });
      blok('kop', 'metaal', B / 2 - 10, H - 18, 3, 20, 2, 20, '#b9bcbd');
      break;
    case 'wc':
      blok('reservoir', 'gevel', 4, 40, 0, B - 8, 40, 16, wit, { afronding: 3 });
      blok('pot', 'gevel', 4, 0, 14, B - 8, 40, D - 14, wit, { afronding: 8 });
      blok('bril', 'gevel', 3, 40, 16, B - 6, 3, D - 17, wit, { afronding: 8 });
      break;
    case 'lavabo':
      blok('meubel', 'hout', 0, 50, 0, B, 35, D, kleur);
      blok('wastafel', 'gevel', 0, 85, 0, B, 5, D + 1, wit);
      blok('kraan', 'metaal', B / 2 - 2, 90, 4, 4, 20, 4, '#b9bcbd', { vorm: 'cilinder' });
      blok('spiegel', 'glas', 4, 110, 0, B - 8, 70, 1.5, '#dfe8ea');
      break;
    case 'tv':
      blok('meubel', 'hout', 0, 0, 0, B, 45, D, kleur);
      blok('scherm', 'donker', B * 0.15, 70, D / 2 - 2, B * 0.7, 75, 3, '#111111');
      blok('voet', 'metaal', B / 2 - 15, 45, D / 2 - 10, 30, 25, 4, '#333333');
      break;
    case 'plant':
      blok('pot', 'donker', B / 2 - 18, 0, D / 2 - 18, 36, 40, 36, '#3b3a37', { vorm: 'cilinder', taps: 0.8 });
      blok('blad', 'stof', B / 2 - 30, 40, D / 2 - 30, 60, H - 40, 60, kleur, { vorm: 'bol' });
      break;
    case 'tapijt':
      blok('tapijt', 'stof', 0, 0, 0, B, 1, D, kleur);
      break;
    case 'trap': {
      // Rechte trap: loopt op van voor (z = D) naar achter (z = 0), tot de vloer erboven.
      const n = Math.max(8, Math.round(H / 18));
      const op = H / n, aan = D / n;
      for (let i = 0; i < n; i++) blok(`trede${i}`, 'hout', 0, i * op, D - (i + 1) * aan, B, op, aan + 2, kleur);
      blok('paal', 'metaal', B - 4, 0, D - 4, 4, 95, 4, '#2a2a2a');
      break;
    }
  }
  return uit;
}

// ---------- afstanden (maatvoering bij plaatsen en verslepen) ----------

/** Dikte van de dwarsmuur op een punt van een muur (0 als er geen is). */
function dwarsDikte(m: Muur, p: number, muren: Muur[]): number {
  const loodrecht = muren.filter((x) => x.as !== m.as && gelijk(x.lijn, p) && x.van <= m.lijn + 0.5 && x.tot >= m.lijn - 0.5);
  return loodrecht.length ? Math.max(...loodrecht.map((x) => x.dikte)) : 0;
}

export interface OpeningAfstanden {
  muur: Muur;
  /** Binnenvlak van de dwarsmuur aan het begin en het einde van de muur (coördinaat langs de muur). */
  vlakBegin: number;
  vlakEinde: number;
  /** Vrije muur tussen het binnenvlak en de opening, aan het begin en aan het einde (cm). */
  begin: number;
  einde: number;
  /** Kettingmaat langs de muur: binnenvlak, randen van alle openingen in die muur, binnenvlak. */
  ketting: number[];
  /** Ligt de ruimte (binnenkant) aan de plus-kant van de muur? */
  binnenPlus: boolean;
}

/** Afstanden van een opening tot de muren en de andere openingen in dezelfde muur. */
export function openingAfstanden(plan: Plattegrond, o: Opening, muren = murenVan(niveauPlan(plan, niveauVan(o)))): OpeningAfstanden | undefined {
  const m = muurVanOpening(o, muren);
  if (!m) return undefined;
  const vlakBegin = m.van + dwarsDikte(m, m.van, muren) / 2, vlakEinde = m.tot - dwarsDikte(m, m.tot, muren) / 2;
  const a = o.midden - o.breedte / 2, b = o.midden + o.breedte / 2;
  const anderen = plan.openingen.filter((x) => x.id !== o.id && niveauVan(x) === niveauVan(o) && muurVanOpening(x, [m]) === m);
  const punten = [vlakBegin, vlakEinde, a, b, ...anderen.flatMap((x) => [x.midden - x.breedte / 2, x.midden + x.breedte / 2])]
    .map((x) => Math.round(x * 10) / 10).filter((x, i, l) => l.indexOf(x) === i).sort((p, q) => p - q);
  const binnenPlus = m.soort === 'buiten' ? !!m.plus : o.naarPlus;
  return { muur: m, vlakBegin, vlakEinde, begin: a - vlakBegin, einde: vlakEinde - b, ketting: punten, binnenPlus };
}

export interface MeubelAfstanden {
  /** Binnenvlakken van de ruimte rond het meubel. */
  x0: number; x1: number; y0: number; y1: number;
  links: number; rechts: number; boven: number; onder: number;
}

/** Afstanden van een meubel tot de binnenvlakken van de muren van de ruimte waarin het staat. */
export function meubelAfstanden(plan: Plattegrond, m: Meubel, muren = murenVan(niveauPlan(plan, niveauVan(m)))): MeubelAfstanden | undefined {
  const v = meubelVoetafdruk(m);
  const cx = v.x + v.b / 2, cy = v.y + v.d / 2;
  const r = ruimteOp(plan, cx, cy, niveauVan(m));
  if (!r) return undefined;
  const deel = delenVan(r).find((p) => cx > p.x && cx < p.x + p.b && cy > p.y && cy < p.y + p.d) ?? delenVan(r)[0]!;
  const dikte = (as: 'h' | 'v', lijn: number, van: number, tot: number) => {
    const op = muren.filter((x) => x.as === as && gelijk(x.lijn, lijn) && x.tot > van + 0.5 && x.van < tot - 0.5);
    return op.length ? Math.max(...op.map((x) => x.dikte)) : 0;
  };
  const x0 = deel.x + dikte('v', deel.x, v.y, v.y + v.d) / 2, x1 = deel.x + deel.b - dikte('v', deel.x + deel.b, v.y, v.y + v.d) / 2;
  const y0 = deel.y + dikte('h', deel.y, v.x, v.x + v.b) / 2, y1 = deel.y + deel.d - dikte('h', deel.y + deel.d, v.x, v.x + v.b) / 2;
  return { x0, x1, y0, y1, links: v.x - x0, rechts: x1 - (v.x + v.b), boven: v.y - y0, onder: y1 - (v.y + v.d) };
}
