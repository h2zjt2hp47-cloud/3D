/**
 * Plattegrond: ruimtes (rechthoeken), muren die daaruit volgen, openingen (ramen, deuren) in de
 * muren en meubels. Maten in cm, x naar rechts, y naar onder (zoals op papier).
 *
 * De muren teken je niet zelf: elke rand van een ruimte is een muur. Grenst een rand aan
 * een andere ruimte, dan is het een binnenmuur; anders een buitenmuur. Zo blijft de tekening
 * altijd sluitend, ook na het indelen (splitsen) of verschuiven van ruimtes.
 */
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

export type OpeningSoort = 'raam' | 'buitendeur' | 'schuifraam' | 'binnendeur' | 'doorgang';

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
  };
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
}

const BUITEN: OpeningSoort[] = ['raam', 'buitendeur', 'schuifraam'];

export function controleerPlan(plan: Plattegrond): PlanMelding[] {
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
  return uit;
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
    const wat = o.soort === 'binnendeur' ? 'Binnendeur' : o.soort === 'doorgang' ? 'Doorgang' : o.soort === 'raam' ? 'Raam' : o.soort === 'schuifraam' ? 'Schuifraam' : 'Buitendeur';
    if (!m) {
      uit.push({ ernst: 'fout', opening: o.id, melding: `${pre}${wat} staat niet (volledig) op een muur. Verschuif of verklein de opening.` });
      continue;
    }
    if (BUITEN.includes(o.soort) && m.soort === 'binnen') uit.push({ ernst: 'fout', opening: o.id, melding: `${pre}${wat} tussen ${naam(m.min)} en ${naam(m.plus)} staat in een binnenmuur.` });
    if (!BUITEN.includes(o.soort) && m.soort === 'buiten') uit.push({ ernst: 'waarschuwing', opening: o.id, melding: `${pre}${wat} in een buitenmuur (${naam(m.min ?? m.plus)}): gebruik een buitendeur.` });
    const vrij = Math.min(o.midden - o.breedte / 2 - m.van, m.tot - o.midden - o.breedte / 2);
    if (vrij < 10) uit.push({ ernst: 'waarschuwing', opening: o.id, melding: `${pre}${wat} staat tegen een hoek (minder dan 10 cm muur): moeilijk te plaatsen en af te werken.` });
    if (o.borstwering + o.hoogte > plan.muurhoogte - 15) uit.push({ ernst: 'fout', opening: o.id, melding: `${pre}${wat} is te hoog voor de muur (latei nodig boven de opening).` });
    if ((o.soort === 'buitendeur' || o.soort === 'schuifraam') && m.soort === 'buiten') ingang.add((m.min ?? m.plus)!);
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
      if (maten.glas === 0) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}${r.naam} heeft geen raam (daglicht).` });
      else if (maten.glas < maten.netto / 10) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}${r.naam}: weinig daglicht (glas ${maten.glas.toFixed(1)} m² is minder dan 1/10 van de vloer; richtwaarde, te verifiëren).` });
    }
    if ((r.type === 'badkamer' || r.type === 'wc') && maten.glas === 0) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}${r.naam} zonder raam: mechanische afzuiging voorzien.` });
  }
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
}

/** Hele woning: alle verdiepingen op elkaar, met vloerplaten, trapgaten en platte daken. */
export function plattegrond3D(plan: Plattegrond, cat: PlanCatalogus, opties: Plan3DOpties = {}): Scene3D {
  const blokken: Blok[] = [];
  const niveaus = verdiepingenVan(plan).length;
  const laatste = Math.min(niveaus - 1, opties.totNiveau ?? niveaus - 1);
  const H = plan.muurhoogte;
  for (let n = 0; n <= laatste; n++) {
    const y0 = vloerHoogte(plan, n);
    const p = niveauPlan(plan, n);
    // Trapgaten: voetafdruk van de trappen op de verdieping eronder.
    const gaten = n > 0 ? plan.meubels.filter((m) => m.type === 'trap' && niveauVan(m) === n - 1).map(meubelVoetafdruk) : [];
    const zonderGaten = (r: Rechthoek) => gaten.reduce<Rechthoek[]>((stukken, g) => stukken.flatMap((s) => trekAf(s, g)), [r]);
    if (n > 0) {
      for (const r of p.ruimtes) for (const deel of delenVan(r)) for (const s of zonderGaten(deel)) {
        blokken.push({ code: `plaat_${r.id}`, soort: 'gevel', vorm: 'blok', x: s.x, y: y0 - VLOERDIKTE, z: s.y, b: s.b, h: VLOERDIKTE, d: s.d, kleur: '#c9c6bf' });
      }
    }
    const scene = niveau3D(p, cat, { ...opties, laag: n === laatste ? opties.laag : undefined }, zonderGaten, n);
    for (const b of scene) blokken.push({ ...b, y: r2(b.y + y0) });
    // Dakrand (opstand met muurkap) op de buitenmuren waar geen muur van de verdieping erboven op staat.
    if (n < laatste) {
      const hier = murenVan(p), boven = murenVan(niveauPlan(plan, n + 1));
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
        for (const [x, y] of vrij) {
          const basis = { code: `dakrand_${m.id}_${x}`, soort: 'kunststof' as BlokSoort, vorm: 'blok' as const, kleur: '#2b2b2b', y: y0 + H, h: VLOERDIKTE + 2 };
          blokken.push(m.as === 'h' ? { ...basis, x, z: vlak.y, b: y - x, d: vlak.d } : { ...basis, x: vlak.x, z: x, b: vlak.b, d: y - x });
        }
      }
    }
    // Plat dak boven delen die niet onder een hogere (getoonde) verdieping liggen.
    if (n < laatste) {
      const boven = niveauPlan(plan, n + 1).ruimtes.flatMap(delenVan);
      for (const r of p.ruimtes) for (const deel of delenVan(r)) {
        const vrij = boven.reduce<Rechthoek[]>((stukken, q) => stukken.flatMap((s) => trekAf(s, q)), [deel]);
        for (const s of vrij) blokken.push({ code: `dak_${r.id}`, soort: 'dak', vorm: 'blok', x: s.x, y: y0 + H, z: s.y, b: s.b, h: VLOERDIKTE, d: s.d, kleur: '#2e2e2e' });
      }
    }
  }
  return { blokken, kader: kaderVan(blokken) };
}

/** Eén verdieping (vloer op y = 0). */
function niveau3D(plan: Plattegrond, cat: PlanCatalogus, opties: Plan3DOpties, zonderGaten: (r: Rechthoek) => Rechthoek[], n = 0): Blok[] {
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
      voeg({ code: `vloer_${r.id}`, soort: v?.soort ?? 'gevel', vorm: 'blok', x: s.x, y: 0, z: s.y, b: s.b, h: 1.5, d: s.d, kleur: v?.kleur ?? '#cfccc4' });
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
      const base = { code, soort: 'gevel' as BlokSoort, vorm: 'blok' as const, kleur: pleister, zijden, y: y0, h: y1 - y0 };
      voeg(m.as === 'h' ? { ...base, x: a, z: vlak.y, b: b - a, d: vlak.d } : { ...base, x: vlak.x, z: a, b: vlak.b, d: b - a });
    };
    const openingen = plan.openingen.filter((o) => muurVanOpening(o, [m]) === m).sort((a, b) => a.midden - b.midden);
    let cursor = begin;
    for (const o of openingen) {
      const a = o.midden - o.breedte / 2, b = o.midden + o.breedte / 2;
      stuk(`muur_${m.id}_${cursor}`, cursor, a, 0, H);
      const inhoud = opties.inhoud?.(o);
      const hoogte = inhoud?.hoogte ?? (o.soort === 'doorgang' ? o.hoogte : o.hoogte + 4);
      stuk(`onder_${o.id}`, a, b, 0, o.borstwering);
      stuk(`boven_${o.id}`, a, b, Math.min(H, o.borstwering + hoogte), H);
      for (const blok of openingBlokken(o, m, inhoud, cat)) voeg(blok);
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
      for (const b of meubelIn3D(mb, mb.type === 'trap' ? { ...t, h: H + VLOERDIKTE } : t)) voeg({ ...b, y: b.y + 1.5 }, false);
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
