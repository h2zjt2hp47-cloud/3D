/**
 * Losse wand (ronde 2d): een muur die geen ruimte opdeelt. Vraag van Jonas: *"Hoe teken ik gewoon een muur zonder dat dit
 * meteen een aparte ruimte wordt?"* Een muur die halverwege stopt, een halfhoog muurtje tussen twee zones, een tuinmuur.
 *
 * De muren van de plattegrond volgen uit de randen van de ruimtes (`murenVan`) en blijven dat doen: een losse wand staat in
 * een eigen lijst (`Plattegrond.losseWanden`) en komt **niet** in `murenVan`. Zo veranderen de ruimtes, hun oppervlakte,
 * de afgeleide muren, de gevelvlakken, de controles en de offerteregels van een plan niet. Een plan zonder losse wanden is
 * exact zoals vroeger.
 *
 * Afspraken (eigen keuzes):
 *   - Een losse wand is een as van punt `van` tot punt `tot` (cm op het plan, ook schuin), met een dikte en een hoogte
 *     (ontbreekt = de volle muurhoogte, tot het plafond).
 *   - Binnen of buiten volgt uit de plaats: ligt het midden van de as in een ruimte (op dezelfde verdieping), dan is ze
 *     binnen en krijgt ze de wandafwerking van die ruimte of een eigen keuze (`wand`); anders is ze buiten (tuinmuur,
 *     keermuur) en krijgt ze een gevelmateriaal (`gevel`, standaard dat van de woning).
 *   - Een eindpunt dat tegen een muur aansluit, ligt op de **as** van die muur. Het grondvlak (`losseWandVlak`) stopt op
 *     het vlak van die muur, ook als de losse wand er schuin op toekomt: geen gat en geen overlap, en de muur zelf blijft
 *     zoals ze was. Twee losse wanden met een gemeenschappelijk eindpunt sluiten in verstek; een eindpunt midden op een
 *     andere losse wand stopt op haar vlak.
 *   - De **lengte** van een losse wand is wat er gebouwd wordt: van het vlak van de muur waartegen ze staat tot haar vrije
 *     einde (gemeten op haar as). De **afstand tot een muur** is de vrije maat, loodrecht van het vlak van de muur tot het
 *     vlak van de losse wand.
 *
 * Maten in cm.
 */
import type { Blok } from './ruimtelijk.js';
import {
  asVan, gevelAfwerking, grondPrisma, kaderVanPunten, langsAs, metDeKlok, murenVan, muurVanOpening, muurVlak, niveauPlan, ruimteOp, snijVeelhoek,
  veelhoekOppervlakte, verdiepingenVan,
  type GevelAfwerking, type GevelKeuze, type Muur, type PlanCatalogus, type PlanMelding, type Plattegrond, type Punt, type Ruimte,
} from './plattegrond.js';

/** Een losse wand: een muur die geen ruimte opdeelt. Zie bovenaan dit bestand. */
export interface LosseWand {
  id: string;
  /** Begin en einde van haar as (cm op het plan). Een eindpunt tegen een muur ligt op de as van die muur. */
  van: Punt;
  tot: Punt;
  /** Dikte (cm). */
  dikte: number;
  /** Hoogte boven de vloer (cm). Ontbreekt = de volle muurhoogte (tot het plafond). */
  hoogte?: number;
  /** Binnen: de wandafwerking (code uit `cat.wanden`). Ontbreekt = die van de ruimte waarin ze staat. */
  wand?: string;
  /** Buiten: het gevelmateriaal. Ontbreekt = de gevel van de woning (`gevelOntwerp.standaard`, anders `plan.gevel`). */
  gevel?: GevelKeuze;
  /** Verdieping (0 = gelijkvloers). */
  niveau?: number;
}

/** Kortste losse wand (cm, gebouwde lengte). */
export const LOSSE_WAND_MIN = 20;
/** Een eindpunt dat tot zoveel cm naast het vlak van een muur ligt, sluit er nog op aan (dicht een spleetje). */
const SPELING = 2;

const r2 = (x: number) => Math.round(x * 100) / 100 + 0;
const fijn = (x: number) => { const y = Math.round(x * 1e6) / 1e6; return y === 0 ? 0 : y; };
const punt = (a: Punt, s: number, d: Punt): Punt => [a[0] + s * d[0], a[1] + s * d[1]];
const dot = (a: Punt, b: Punt) => a[0] * b[0] + a[1] * b[1];
const kruis = (a: Punt, b: Punt) => a[0] * b[1] - a[1] * b[0];

/** Richting d (eenheid, van `van` naar `tot`), normaal n = (dy, −dx) (de plus-kant) en de lengte van de as. */
export function losseWandAs(w: Pick<LosseWand, 'van' | 'tot'>): { d: Punt; n: Punt; lengte: number } {
  const dx = w.tot[0] - w.van[0], dy = w.tot[1] - w.van[1], l = Math.hypot(dx, dy);
  const d: Punt = l > 1e-9 ? [dx / l, dy / l] : [1, 0];
  return { d, n: [d[1], -d[0]], lengte: l };
}

/** De ruimte waarin een losse wand staat (het midden van haar as, op haar verdieping), of niets: dan staat ze buiten. */
export function losseWandRuimte(plan: Plattegrond, w: LosseWand): Ruimte | undefined {
  return ruimteOp(plan, (w.van[0] + w.tot[0]) / 2, (w.van[1] + w.tot[1]) / 2, w.niveau ?? 0);
}

/** De hoogte van een losse wand (cm): haar eigen hoogte of de volle muurhoogte. */
export const losseWandHoogte = (plan: Plattegrond, w: LosseWand) => w.hoogte ?? plan.muurhoogte;

/** De afwerking van een losse wand in de 3D en de tekening: binnen de wandafwerking, buiten het gevelmateriaal. */
export function losseWandAfwerking(plan: Plattegrond, cat: PlanCatalogus, w: LosseWand, ruimte = losseWandRuimte(plan, w)): GevelAfwerking {
  if (!ruimte) return gevelAfwerking(plan, cat, w.gevel ?? plan.gevelOntwerp?.standaard);
  const a = cat.wanden[w.wand ?? ''] ?? cat.wanden[ruimte.wand];
  return a ? { soort: a.soort, kleur: a.kleur } : { soort: 'gevel', kleur: '#efeee9' };
}

/** Waar een uiteinde van een losse wand op aansluit. */
export interface Aansluiting {
  /** `muur`: tegen een muur van de plattegrond; `wand`: tegen (het vlak van) een andere losse wand; `verstek`: een hoek
   *  met een andere losse wand; `door`: dezelfde lijn loopt in een andere losse wand verder; `vrij`: niets. */
  soort: 'muur' | 'wand' | 'verstek' | 'door' | 'vrij';
  /** De muur (id uit `murenVan`) of losse wand waarop het uiteinde aansluit. */
  id?: string;
}

/** Wat een zijde van het grondvlak is: een zijvlak (min of plus), een vrij uiteinde (kop) of een vlak tegen iets anders. */
export type LosseWandRand = 'min' | 'plus' | 'kop' | 'tegen';

export interface LosseWandVlak {
  /** Het grondvlak (cm op het plan): een bolle veelhoek, met de klok mee op de tekening. */
  punten: Punt[];
  /** Per zijde (van punt i naar i + 1) wat ze is. */
  randen: LosseWandRand[];
  /** Wat er gebouwd wordt, op haar as: van `begin` tot `einde` (cm vanaf `van`, langs de richting naar `tot`). */
  begin: number;
  einde: number;
  /** De aansluiting aan het begin (`van`) en aan het einde (`tot`). */
  aan: [Aansluiting, Aansluiting];
}

/** Knipt een veelhoek met zijden af op het halfvlak a·x + b·y ≥ c; de nieuwe zijde krijgt `nieuw`. */
function houdOver<T>(punten: Punt[], randen: T[], a: number, b: number, c: number, nieuw: T): [Punt[], T[]] {
  const p: Punt[] = [], r: T[] = [];
  const f = ([x, y]: Punt) => a * x + b * y - c;
  for (let i = 0; i < punten.length; i++) {
    const v = punten[i]!, w = punten[(i + 1) % punten.length]!, fv = f(v), fw = f(w);
    const snij = (): Punt => { const t = fv / (fv - fw); return [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])]; };
    if (fv >= -1e-9) {
      p.push(v); r.push(randen[i]!);
      if (fw < -1e-9 && fv > 1e-9) { p.push(snij()); r.push(nieuw); }
      else if (fw < -1e-9) r[r.length - 1] = nieuw;
    } else if (fw > 1e-9) { p.push(snij()); r.push(randen[i]!); }
  }
  const pp: Punt[] = [], rr: T[] = [];
  p.forEach((q, i) => { const n = p[(i + 1) % p.length]!; if (Math.hypot(n[0] - q[0], n[1] - q[1]) > 1e-6) { pp.push(q); rr.push(r[i]!); } });
  return [pp, rr];
}

/** Snijpunt van twee lijnen (punt + richting), of niets als ze (bijna) evenwijdig zijn. */
function snijpunt(p: Punt, d: Punt, q: Punt, e: Punt): Punt | undefined {
  const k = kruis(d, e);
  if (Math.abs(k) < 1e-9) return undefined;
  const t = kruis([q[0] - p[0], q[1] - p[1]], e) / k;
  return punt(p, t, d);
}

/** Een halfvlak om op af te knippen (a·x + b·y ≥ c) en hoe ver de strook voorbij het eindpunt moet om het te raken. */
interface Snede { a: number; b: number; c: number; verder: number }

/** Een obstakel waarop een eindpunt kan aansluiten: een muur van de plattegrond of een andere losse wand, als strook. */
interface Strook { id: string; soort: 'muur' | 'wand'; d: Punt; n: Punt; lijn: number; van: number; tot: number; half: number }

const strookVanMuur = (m: Muur): Strook => {
  const { d, n } = asVan(m);
  return { id: m.id, soort: 'muur', d, n, lijn: m.lijn, van: m.van - m.dikte / 2, tot: m.tot + m.dikte / 2, half: m.dikte / 2 };
};
const strookVanWand = (w: LosseWand): Strook => {
  const { d, n, lengte } = losseWandAs(w);
  const s0 = dot(w.van, d);
  return { id: w.id, soort: 'wand', d, n, lijn: dot(w.van, n), van: s0, tot: s0 + lengte, half: w.dikte / 2 };
};

/**
 * Het grondvlak van een losse wand, met haar uiteinden netjes aangesloten (zie bovenaan dit bestand). `muren` = de muren
 * van haar verdieping (`murenVan`), `andere` = de losse wanden van die verdieping (zij zelf mag erbij zitten).
 */
export function losseWandVlak(w: LosseWand, muren: Muur[], andere: LosseWand[] = []): LosseWandVlak {
  const { d, n, lengte: L } = losseWandAs(w);
  const half = w.dikte / 2;
  const anderen = andere.filter((x) => x.id !== w.id && (x.niveau ?? 0) === (w.niveau ?? 0));
  const stroken = [...muren.map(strookVanMuur), ...anderen.map(strookVanWand)];
  const aan: [Aansluiting, Aansluiting] = [{ soort: 'vrij' }, { soort: 'vrij' }];
  const sneden: [Snede[], Snede[]] = [[], []];
  const ver: [number, number] = [0, 0];
  for (const k of [0, 1] as const) {
    const E = k === 0 ? w.van : w.tot;
    const u: Punt = k === 0 ? d : [-d[0], -d[1]];
    // Een andere losse wand met een eindpunt op dit eindpunt: verstek (of dezelfde lijn loopt verder).
    let hoek: { x: LosseWand; uB: Punt } | undefined;
    for (const x of anderen) {
      const { d: dB, lengte: LB } = losseWandAs(x);
      if (LB < 1) continue;
      if (Math.hypot(x.van[0] - E[0], x.van[1] - E[1]) < 1) { hoek = { x, uB: dB }; break; }
      if (Math.hypot(x.tot[0] - E[0], x.tot[1] - E[1]) < 1) { hoek = { x, uB: [-dB[0], -dB[1]] }; break; }
    }
    if (hoek) {
      const { x, uB } = hoek, nB: Punt = [uB[1], -uB[0]], hB = x.dikte / 2;
      const sin = kruis(u, uB);
      if (Math.abs(sin) < 0.03) { aan[k] = { soort: dot(u, uB) < 0 ? 'door' : 'vrij', id: x.id }; continue; }
      // De zijde van deze wand naar de andere toe (σA) en die van de andere naar deze toe (σB).
      const nA: Punt = [u[1], -u[0]];
      const sA = dot(uB, nA) > 0 ? 1 : -1, sB = dot(u, nB) > 0 ? 1 : -1;
      const I = snijpunt(punt(E, sA * half, nA), u, punt(E, sB * hB, nB), uB);
      const O = snijpunt(punt(E, -sA * half, nA), u, punt(E, -sB * hB, nB), uB);
      if (!I || !O || Math.hypot(I[0] - E[0], I[1] - E[1]) > 8 * Math.max(half, hB) || Math.hypot(O[0] - E[0], O[1] - E[1]) > 8 * Math.max(half, hB)) continue;
      // Het halfvlak aan de kant van het lijf van deze wand, begrensd door de lijn IO.
      const lijn: Punt = [O[0] - I[0], O[1] - I[1]];
      let a = -lijn[1], b = lijn[0];
      const lijf = punt(E, Math.min(L / 2, 10), u);
      if (a * lijf[0] + b * lijf[1] < a * I[0] + b * I[1]) { a = -a; b = -b; }
      sneden[k].push({ a, b, c: a * I[0] + b * I[1], verder: Math.max(0, -dot([I[0] - E[0], I[1] - E[1]], u), -dot([O[0] - E[0], O[1] - E[1]], u)) + 1 });
      aan[k] = { soort: 'verstek', id: x.id };
      continue;
    }
    // Een muur of losse wand waarin (of tot op 2 cm waarnaast) het eindpunt ligt: afknippen op haar vlak aan deze kant.
    for (const s of stroken) {
      const sE = dot(E, s.d), wE = dot(E, s.n);
      if (sE < s.van - SPELING || sE > s.tot + SPELING || Math.abs(wE - s.lijn) > s.half + SPELING) continue;
      const un = dot(u, s.n);
      if (Math.abs(un) < 0.1) continue;
      const z = un > 0 ? 1 : -1;
      // Houd z·(p·n − lijn) ≥ half: aan de kant van het lijf, voorbij het vlak.
      sneden[k].push({ a: z * s.n[0], b: z * s.n[1], c: z * s.lijn + s.half, verder: (2 * s.half + SPELING + half + 1) / Math.abs(un) });
      if (aan[k].soort === 'vrij') aan[k] = { soort: s.soort, id: s.id };
    }
  }
  for (const k of [0, 1] as const) ver[k] = sneden[k].length ? Math.max(...sneden[k].map((s) => s.verder)) : 0;
  // De strook, aan een aangesloten einde verlengd tot voorbij wat er staat, en dan afgeknipt.
  const a = punt(w.van, -ver[0], d), b = punt(w.tot, ver[1], d);
  const rand = (k: 0 | 1): LosseWandRand => (aan[k].soort === 'vrij' ? 'kop' : 'tegen');
  // Met de klok mee op de tekening (zoals de vormen van de ruimtes): eerst de plus-kant van begin naar einde.
  let pts: Punt[] = [punt(a, half, n), punt(b, half, n), punt(b, -half, n), punt(a, -half, n)];
  let rnd: LosseWandRand[] = ['plus', rand(1), 'min', rand(0)];
  for (const k of [0, 1] as const) for (const s of sneden[k]) [pts, rnd] = houdOver(pts, rnd, s.a, s.b, s.c, 'tegen');
  // Wat er op de as gebouwd wordt: waar de as de veelhoek snijdt.
  const op: number[] = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    const tp = dot([p[0] - w.van[0], p[1] - w.van[1]], n), tq = dot([q[0] - w.van[0], q[1] - w.van[1]], n);
    if ((tp > 1e-9 && tq > 1e-9) || (tp < -1e-9 && tq < -1e-9)) return;
    const sp = dot([p[0] - w.van[0], p[1] - w.van[1]], d), sq = dot([q[0] - w.van[0], q[1] - w.van[1]], d);
    if (Math.abs(tp - tq) < 1e-9) { op.push(sp, sq); return; }
    op.push(sp + ((sq - sp) * tp) / (tp - tq));
  });
  const begin = op.length ? Math.min(...op) : 0, einde = op.length ? Math.max(...op) : L;
  return { punten: pts.map(([x, y]) => [fijn(x), fijn(y)]), randen: rnd, begin: fijn(begin), einde: fijn(einde), aan };
}

/** De gebouwde lengte van een losse wand (cm): van het vlak van de muur waartegen ze staat tot haar vrije einde. */
export const losseWandLengte = (v: LosseWandVlak) => r2(v.einde - v.begin);

/** Is het grondvlak een rechthoek met zijden langs x en y? */
function rechthoekig(v: Punt[]): boolean {
  if (v.length !== 4) return false;
  return v.every((p, i) => { const q = v[(i + 1) % 4]!; return Math.abs(p[0] - q[0]) < 1e-6 || Math.abs(p[1] - q[1]) < 1e-6; });
}

/**
 * De 3D van een losse wand (y = 0 is haar vloer): een balk als ze liggend of staand is en recht stopt, anders een prisma
 * met haar grondvlak (zoals een schuine muur). Code `losse_wand_<id>`; het ding (`wand:<id>`) zet de oproeper ervoor.
 */
export function losseWandBlokken(plan: Plattegrond, cat: PlanCatalogus, w: LosseWand, muren: Muur[]): Blok[] {
  const v = losseWandVlak(w, muren, plan.losseWanden ?? []);
  if (v.punten.length < 3 || v.einde - v.begin < 0.5) return [];
  const afw = losseWandAfwerking(plan, cat, w);
  const h = losseWandHoogte(plan, w), code = `losse_wand_${w.id}`;
  const voeg = afw.voeg ? { voeg: afw.voeg } : {};
  if (rechthoekig(v.punten)) {
    const k = kaderVanPunten(v.punten);
    return [{ code, soort: afw.soort, vorm: 'blok', kleur: afw.kleur, ...voeg, x: r2(k.x), y: 0, z: r2(k.y), b: r2(k.b), h: r2(h), d: r2(k.d) }];
  }
  return [grondPrisma(code, afw.soort, afw.kleur, v.punten, 0, h, { ...voeg, randen: v.punten.map(() => afw), zijden: { 'y+': afw } })];
}

/** De vrije maat van een losse wand tot een evenwijdige muur aan één kant (zie `losseWandAfstanden`). */
export interface WandAfstand {
  /** Aan welke kant van de losse wand (min = tegen n in, plus = langs n, zie `losseWandAs`). */
  kant: 'min' | 'plus';
  muur: Muur;
  /** Vrije maat (cm), loodrecht van het vlak van de muur tot het vlak van de losse wand. */
  vrij: number;
  /** Waar de kant ligt op de tekening: links, rechts, boven of onder (de dichtste). */
  naam: 'links' | 'rechts' | 'boven' | 'onder';
}

/** Naam van een richting op de tekening (x naar rechts, y naar onder): de dichtste van de vier. */
const richtingNaam = ([x, y]: Punt): WandAfstand['naam'] => (Math.abs(x) >= Math.abs(y) ? (x > 0 ? 'rechts' : 'links') : y > 0 ? 'onder' : 'boven');

/**
 * De dichtste evenwijdige muur aan elke kant van een losse wand, die naast haar loopt (langs de wand gemeten overlappen
 * ze), met de vrije maat. Voor "300 cm van de linkermuur" en "1 m van de zijgevel".
 */
export function losseWandAfstanden(w: LosseWand, muren: Muur[]): Partial<Record<'min' | 'plus', WandAfstand>> {
  const { d, n, lengte: L } = losseWandAs(w);
  const uit: Partial<Record<'min' | 'plus', WandAfstand>> = {};
  for (const m of muren) {
    const am = asVan(m);
    if (Math.abs(kruis(d, am.d)) > 0.01) continue;
    const p = langsAs(m, m.van, m.lijn), q = langsAs(m, m.tot, m.lijn);
    const sp = dot([p[0] - w.van[0], p[1] - w.van[1]], d), sq = dot([q[0] - w.van[0], q[1] - w.van[1]], d);
    if (Math.min(Math.max(sp, sq), L) - Math.max(Math.min(sp, sq), 0) < 1) continue;
    const t = dot([p[0] - w.van[0], p[1] - w.van[1]], n);
    const vrij = Math.abs(t) - m.dikte / 2 - w.dikte / 2;
    if (vrij < -0.5) continue;
    const kant = t < 0 ? 'min' : 'plus';
    const nu = uit[kant];
    if (!nu || vrij < nu.vrij) uit[kant] = { kant, muur: m, vrij: r2(vrij), naam: richtingNaam(kant === 'plus' ? n : [-n[0], -n[1]]) };
  }
  return uit;
}

/**
 * Kleven aan een muur (of een andere losse wand): ligt het punt tot `marge` cm naast een muur, dan het punt op de as van die
 * muur (daar sluit een eindpunt aan, zie `losseWandVlak`). Een eindpunt van een andere losse wand gaat voor (verstek).
 */
export function kleefAanWand(p: Punt, muren: Muur[], andere: LosseWand[] = [], marge = 15): { punt: Punt; id: string; soort: 'muur' | 'wand' | 'hoek' } | undefined {
  let beste: { punt: Punt; id: string; soort: 'muur' | 'wand' | 'hoek' } | undefined, afstand = marge;
  for (const x of andere) for (const q of [x.van, x.tot]) {
    const a = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (a < afstand) { afstand = a; beste = { punt: [...q], id: x.id, soort: 'hoek' }; }
  }
  if (beste) return beste;
  afstand = marge;
  for (const s of [...muren.map(strookVanMuur), ...andere.map(strookVanWand)]) {
    const sp = dot(p, s.d), wp = dot(p, s.n);
    if (sp < s.van || sp > s.tot) continue;
    const a = Math.max(0, Math.abs(wp - s.lijn) - s.half);
    if (a > afstand || (beste && a === afstand)) continue;
    afstand = a;
    // Op de as, maar niet voorbij het einde van de as (een hoek van de woning: daar ligt ook de dwarsmuur).
    const op = Math.min(s.tot - s.half, Math.max(s.van + s.half, sp));
    beste = { punt: [fijn(op * s.d[0] + s.lijn * s.n[0]), fijn(op * s.d[1] + s.lijn * s.n[1])], id: s.id, soort: s.soort };
  }
  return beste;
}

/**
 * Een losse wand met een andere gebouwde lengte: het vrije einde schuift langs de wand (`einde` = het eindpunt `tot`,
 * `begin` = `van`). De gebouwde lengte is die van `losseWandVlak`, dus vanaf het vlak van de muur waartegen ze staat.
 */
export function metLengte(w: LosseWand, vlak: LosseWandVlak, lengte: number, welk: 'begin' | 'einde'): LosseWand {
  const { d, lengte: L } = losseWandAs(w);
  if (welk === 'einde') return { ...w, tot: [fijn(w.van[0] + d[0] * (vlak.begin + lengte)), fijn(w.van[1] + d[1] * (vlak.begin + lengte))] };
  const terug = L - vlak.einde + lengte;
  return { ...w, van: [fijn(w.tot[0] - d[0] * terug), fijn(w.tot[1] - d[1] * terug)] };
}

/** Een losse wand dwars verschoven (langs n, zie `losseWandAs`) over `afstand` cm. */
export function dwarsVerschoven(w: LosseWand, afstand: number): LosseWand {
  const { n } = losseWandAs(w);
  return { ...w, van: [fijn(w.van[0] + n[0] * afstand), fijn(w.van[1] + n[1] * afstand)], tot: [fijn(w.tot[0] + n[0] * afstand), fijn(w.tot[1] + n[1] * afstand)] };
}

/** Het midden van een losse wand op de as van haar gebouwde deel (voor een maat of een label). */
export function losseWandMidden(w: LosseWand, vlak: LosseWandVlak): Punt {
  const { d } = losseWandAs(w);
  return punt(w.van, (vlak.begin + vlak.einde) / 2, d);
}

/** Een losse wand op een plaats langs haar as (s cm vanaf `van`) en dwars erop (t cm langs n). */
export function opLosseWand(w: LosseWand, s: number, t = 0): Punt {
  const { d, n } = losseWandAs(w);
  return [w.van[0] + s * d[0] + t * n[0], w.van[1] + s * d[1] + t * n[1]];
}

/** Plaats op een losse wand: s langs haar as (vanaf `van`) en t dwars erop. */
export function opLosseWandAs(w: LosseWand, p: Punt): [number, number] {
  const { d, n } = losseWandAs(w);
  return [dot([p[0] - w.van[0], p[1] - w.van[1]], d), dot([p[0] - w.van[0], p[1] - w.van[1]], n)];
}


/** De muur waar een losse wand door loopt (meer dan 1 cm² van haar grondvlak ligt in die muur), of niets. */
export function losseWandDoorMuur(w: LosseWand, muren: Muur[], andere: LosseWand[] = [], vlak = losseWandVlak(w, muren, andere)): Muur | undefined {
  if (vlak.punten.length < 3) return undefined;
  return muren.find((m) => {
    const v = muurVlak(m, muren);
    const s = snijVeelhoek(metDeKlok(v.punten ?? [[v.x, v.y], [v.x + v.b, v.y], [v.x + v.b, v.y + v.d], [v.x, v.y + v.d]]), vlak.punten);
    return s.length >= 3 && veelhoekOppervlakte(s) > 1;
  });
}

/**
 * Controles van de losse wanden (alleen als er zijn: een plan zonder losse wanden krijgt geen enkele melding meer of
 * minder). Een wand die door een muur loopt, die voor een raam of deur staat, of die te kort is.
 */
export function controleerLosseWanden(plan: Plattegrond): PlanMelding[] {
  const uit: PlanMelding[] = [];
  const namen = verdiepingenVan(plan);
  for (let n = 0; n < namen.length; n++) {
    const p = niveauPlan(plan, n), muren = murenVan(p), lijst = p.losseWanden ?? [];
    const pre = namen.length > 1 && n > 0 ? `${namen[n]!.naam}: ` : '';
    for (const w of lijst) {
      const v = losseWandVlak(w, muren, lijst), r = losseWandRuimte(p, w);
      const wat = `${pre}De losse wand ${r ? `in ${r.naam}` : 'buiten'}`;
      if (losseWandLengte(v) < LOSSE_WAND_MIN - 0.5) uit.push({ ernst: 'waarschuwing', wand: w.id, melding: `${wat} is korter dan ${LOSSE_WAND_MIN} cm.` });
      if (losseWandDoorMuur(w, muren, lijst, v)) uit.push({ ernst: 'waarschuwing', wand: w.id, melding: `${wat} loopt door een muur: verkort of verschuif ze.` });
      // Een uiteinde tegen een muur, op de plaats van een raam of deur in die muur.
      for (const [k, a] of v.aan.entries()) {
        const m = a.soort === 'muur' ? muren.find((x) => x.id === a.id) : undefined;
        if (!m) continue;
        const q = k === 0 ? w.van : w.tot, s = dot(q, asVan(m).d);
        const voor = p.openingen.find((o) => muurVanOpening(o, [m]) === m && Math.abs(o.midden - s) < o.breedte / 2 + w.dikte / 2 - 0.5);
        if (voor) uit.push({ ernst: 'waarschuwing', wand: w.id, opening: voor.id, melding: `${wat} staat voor ${voor.soort === 'raam' || voor.soort === 'schuifraam' ? 'een raam' : voor.soort === 'doorgang' ? 'een doorgang' : 'een deur'}.` });
      }
    }
  }
  return uit;
}
