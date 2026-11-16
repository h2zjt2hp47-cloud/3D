/**
 * Een ruimte maken uit gemeten maten (zuivere functies voor het scherm *Ruimte met maten*): een rechthoek (breedte en
 * diepte) of een vrije vorm (vier zijden en een diagonaal, zoals een inmeter meet), gemeten aan de buitenkant of de
 * binnenkant van de muren, en geplaatst tegen een gevel van de woning, los ervan op een afstand, of als enige gebouw van
 * een nieuw project. De uitkomst ligt op de as van de muren, zoals elke `Ruimte`.
 *
 * Assen van een gevel (`Gevellijn`): u loopt van links naar rechts zoals je de gevel van buiten ziet, o wijst naar buiten.
 * Een nieuwe vorm ligt met haar eerste zijde AB langs de gevel (A links), de rest ligt aan de buitenkant (langs o).
 */
import {
  binnenVeelhoek,
  binnenVorm,
  buitenKant,
  delenVan,
  dichtsteMuur,
  langsAs,
  opMuur,
  hoekenVan,
  murenVan,
  niveauPlan,
  niveauVan,
  snijVeelhoek,
  veelhoekOppervlakte,
  verschuifZijden,
  vierhoekUitZijden,
  vormFouten,
  vormVanDeel,
  zetOmtrek,
  type GevelKant,
  type Muur,
  type Opening,
  type Plattegrond,
  type Punt,
  type Rechthoek,
  type Ruimte,
} from './plattegrond.js';

/** Een gevel: aaneensluitende buitenmuren op één lijn met dezelfde buitenkant (op één verdieping). */
export interface Gevellijn {
  /** Vaste naam voor het scherm. */
  id: string;
  niveau: number;
  /** De kant van de woning (zoals de gevels): boven, onder, links of rechts; bij een schuine gevel de dichtste. */
  kant?: GevelKant;
  /** Schuine gevel? */
  schuin: boolean;
  /** De muren (ids) van deze gevel. */
  muren: string[];
  /** De linkerhoek op de as (gezien van buiten), de richting naar rechts (u) en naar buiten (o), de lengte op de as. */
  p: Punt;
  u: Punt;
  o: Punt;
  lengte: number;
  /** Dikte van de muur. */
  dikte: number;
  /**
   * De buitenhoeken langs u, gemeten vanaf p: links meestal −½ dikte (de dwarsmuur steekt voorbij de as), rechts
   * lengte + ½ dikte; bij een binnenhoek (de dwarsmuur loopt naar buiten) net andersom.
   */
  hoekLinks: number;
  hoekRechts: number;
}

const dot = (a: Punt, b: Punt) => a[0] * b[0] + a[1] * b[1];
const r2 = (x: number) => { const y = Math.round(x * 100) / 100; return y === 0 ? 0 : y; };
const GRAAD = 180 / Math.PI;

/** Begin- en eindpunt van de as van een muur. */
export function muurPunten(m: Muur): [Punt, Punt] {
  if (m.as === 's') return m.punten!;
  return m.as === 'h' ? [[m.van, m.lijn], [m.tot, m.lijn]] : [[m.lijn, m.van], [m.lijn, m.tot]];
}

/** Waar de buitenkant van een buitenmuur naar wijst (eenheidsvector op het plan). */
export function buitenNormaal(m: Muur): Punt {
  if (m.as === 'h') return m.min ? [0, 1] : [0, -1];
  if (m.as === 'v') return m.min ? [1, 0] : [-1, 0];
  const [dx, dy] = m.richting!;
  const n: Punt = [dy, -dx];
  return m.plus ? [-n[0], -n[1]] : n;
}

/** Alle gevels van een verdieping: buitenmuren op één lijn met dezelfde buitenkant, aaneengesloten tot één gevel. */
export function gevelLijnen(plan: Plattegrond, niveau = 0): Gevellijn[] {
  const muren = murenVan(niveauPlan(plan, niveau)).filter((m) => m.soort === 'buiten');
  const groepen: { o: Punt; c: number; stukken: { m: Muur; a: number; b: number }[] }[] = [];
  for (const m of muren) {
    const o = buitenNormaal(m), u: Punt = [o[1] || 0, -o[0] || 0];
    const [p, q] = muurPunten(m);
    const c = dot(p, o);
    const [a, b] = [dot(p, u), dot(q, u)].sort((x, y) => x - y) as [number, number];
    const g = groepen.find((x) => Math.abs(x.o[0] - o[0]) < 1e-3 && Math.abs(x.o[1] - o[1]) < 1e-3 && Math.abs(x.c - c) < 0.5);
    if (g) g.stukken.push({ m, a, b }); else groepen.push({ o, c, stukken: [{ m, a, b }] });
  }
  const uit: Gevellijn[] = [];
  for (const g of groepen) {
    const u: Punt = [g.o[1] || 0, -g.o[0] || 0];
    const stukken = [...g.stukken].sort((x, y) => x.a - y.a);
    const reeksen: { a: number; b: number; muren: Muur[] }[] = [];
    for (const s of stukken) {
      const laatste = reeksen[reeksen.length - 1];
      if (laatste && s.a <= laatste.b + 0.5) { laatste.b = Math.max(laatste.b, s.b); laatste.muren.push(s.m); } else reeksen.push({ a: s.a, b: s.b, muren: [s.m] });
    }
    for (const r of reeksen) {
      const punt = (s: number): Punt => [s * u[0] + g.c * g.o[0], s * u[1] + g.c * g.o[1]];
      const p = punt(r.a), e = punt(r.b);
      const dikte = r.muren[0]!.dikte;
      /** De buitenhoek aan een uiteinde: een dwarsmuur die naar buiten loopt, maakt er een binnenhoek van. */
      const hoek = (h: Punt, links: boolean): number => {
        let binnen: Muur | undefined, dwars: Muur | undefined;
        for (const m of muren) {
          if (r.muren.includes(m)) continue;
          const [a, b] = muurPunten(m);
          const ander = Math.hypot(a[0] - h[0], a[1] - h[1]) < 1 ? b : Math.hypot(b[0] - h[0], b[1] - h[1]) < 1 ? a : undefined;
          if (!ander) continue;
          dwars ??= m;
          if (dot([ander[0] - h[0], ander[1] - h[1]], g.o) > 1) binnen = m;
        }
        const t = (binnen ?? dwars)?.dikte ?? dikte;
        return (links ? -1 : 1) * (binnen ? -t / 2 : t / 2);
      };
      const eerste = r.muren[0]!;
      uit.push({
        id: `${niveau}:${eerste.as}:${Math.round(g.o[0] * 1000)}:${Math.round(g.o[1] * 1000)}:${Math.round(g.c)}:${Math.round(r.a)}`,
        niveau, kant: buitenKant(eerste), schuin: eerste.as === 's', muren: r.muren.map((m) => m.id),
        p: [r2(p[0]), r2(p[1])], u, o: g.o, lengte: r2(r.b - r.a), dikte,
        hoekLinks: r2(hoek(p, true)), hoekRechts: r2(r.b - r.a + hoek(e, false)),
      });
    }
  }
  return uit;
}

/** De gevel waarin een muur zit. */
export const gevelVanMuur = (lijnen: Gevellijn[], muurId: string) => lijnen.find((g) => g.muren.includes(muurId));

/** De gemeten vorm: een rechthoek (breedte langs de gevel, diepte ervan weg) of vier zijden en de diagonaal AC. */
export type MaatVorm =
  | { soort: 'rechthoek'; breedte: number; diepte: number }
  | { soort: 'vierhoek'; ab: number; bc: number; cd: number; da: number; ac: number };

/** Gemeten aan de buitenkant of de binnenkant van de muren. */
export type Gemeten = 'buiten' | 'binnen';

/**
 * Waar de nieuwe ruimte komt: tegen een gevel (AB tegen de gevel, `afstand` = van de linker buitenhoek van de gevel tot
 * de buitenkant van de nieuwe linkermuur, gemeten langs de gevel), los ervan (`tussenruimte` = van de gevel tot de
 * buitenkant van het nieuwe gebouw), of in een nieuw project (linksboven op 0, 0; AB is dan de bovenkant van het plan).
 */
export type MaatPlaats =
  | { soort: 'tegen'; gevel: Gevellijn; afstand: number }
  | { soort: 'los'; gevel: Gevellijn; afstand: number; tussenruimte: number }
  | { soort: 'nieuw' };

export interface MaatRuimte {
  /** Hoekpunten A, B, C, D op de as van de muren, op het plan (leeg als het niet kan). */
  punten: Punt[];
  /** Als alle muren liggend of staand zijn: de rechthoek (dan zonder vrije vorm). */
  rechthoek?: Rechthoek;
  /** De omtrek waarop gemeten is (buiten- of binnenkant), op het plan: voor de schets en het voorbeeld. */
  gemeten: Punt[];
  /** Binnenhoeken bij A, B, C en D (graden, op 0,1°) en de diagonalen AC en BD van de gemeten vorm (cm, op 0,1 cm). */
  hoeken: number[];
  diagonalen: [number, number];
  /** De afstand tot de linkerhoek als de ruimte links, in het midden of rechts tegen de gevel staat. */
  uitlijning: { links: number; midden: number; rechts: number };
  /** Waarom het niet kan, en wat je best nakijkt; in gewone taal. */
  fouten: string[];
  waarschuwingen: string[];
}

/** Grenzen voor een gemeten muur (cm). */
export const MAAT_MIN = 60;
export const MAAT_MAX = 5000;

const cm = (x: number) => `${String(Math.round(x * 10) / 10).replace('.', ',')} cm`;

/** De gemeten vorm in haar eigen assen: A = (0, 0), B = (ab, 0), C en D eronder (met de klok mee). */
function vormLokaal(vorm: MaatVorm, fouten: string[]): Punt[] {
  const grens = (naam: string, l: number) => {
    if (!(l > 0)) fouten.push(`${naam} ontbreekt.`);
    else if (l < MAAT_MIN) fouten.push(`${naam} is ${cm(l)}: dat is te kort (minstens ${MAAT_MIN} cm).`);
    else if (l > MAAT_MAX) fouten.push(`${naam} is ${cm(l)}: dat is langer dan ${MAAT_MAX / 100} m. Klopt de maat (in cm)?`);
  };
  if (vorm.soort === 'rechthoek') {
    grens('De breedte', vorm.breedte);
    grens('De diepte', vorm.diepte);
    if (fouten.length) return [];
    return [[0, 0], [vorm.breedte, 0], [vorm.breedte, vorm.diepte], [0, vorm.diepte]];
  }
  for (const [naam, l] of [['Zijde AB', vorm.ab], ['Zijde BC', vorm.bc], ['Zijde CD', vorm.cd], ['Zijde DA', vorm.da], ['De diagonaal AC', vorm.ac]] as const) grens(naam, l);
  if (fouten.length) return [];
  const v = vierhoekUitZijden(vorm.ab, vorm.bc, vorm.cd, vorm.da, vorm.ac);
  fouten.push(...v.fouten);
  return v.punten;
}

/** Snijpunt van de lijn door a en b met de liggende lijn y = Y (in de eigen assen van de vorm). */
function opHoogte(a: Punt, b: Punt, Y: number): number {
  if (Math.abs(b[1] - a[1]) < 1e-9) return Math.min(a[0], b[0]);
  return a[0] + ((Y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
}

/**
 * De nieuwe ruimte uit gemeten maten: de hoekpunten op de as van de muren, op hun plaats in het plan. Gemeten aan de
 * buitenkant: elke vrije zijde schuift een halve buitenmuur naar binnen, de zijde tegen de woning een halve muur (de
 * gevel) naar de woning toe, tot op de as van die gevel (die muur wordt een binnenmuur). Gemeten aan de binnenkant: een
 * halve buitenmuur naar buiten, en tegen de woning een halve binnenmuur.
 */
export function ruimteUitMaten(plan: Plattegrond, vorm: MaatVorm, gemeten: Gemeten, plaats: MaatPlaats, niveau = 0): MaatRuimte {
  const fouten: string[] = [], waarschuwingen: string[] = [];
  const leeg: MaatRuimte = { punten: [], gemeten: [], hoeken: [], diagonalen: [0, 0], uitlijning: { links: 0, midden: 0, rechts: 0 }, fouten, waarschuwingen };
  const M = vormLokaal(vorm, fouten);
  if (fouten.length || M.length !== 4) return leeg;
  const t = plan.buitenmuur, tb = plan.binnenmuur;
  const th = plaats.soort === 'nieuw' ? t : plaats.gevel.dikte;
  const tegen = plaats.soort === 'tegen';
  const vrij = gemeten === 'buiten' ? -t / 2 : t / 2;
  const ab = tegen ? (gemeten === 'buiten' ? th / 2 : tb / 2) : vrij;
  // De as van de muren, en de buitenkant van de vrije muren (voor de plaats langs de gevel).
  const Q = verschuifZijden(M, [ab, vrij, vrij, vrij]);
  const O = verschuifZijden(Q, [tegen ? 0 : t / 2, t / 2, t / 2, t / 2]);
  // Van de eigen assen naar die van de gevel (x langs u vanaf de linkerhoek op de as, y naar buiten vanaf de as).
  let dx = 0, dy = 0, Y = 0;
  let uitlijning = { links: 0, midden: 0, rechts: 0 };
  if (plaats.soort !== 'nieuw') {
    const g = plaats.gevel;
    if (tegen) { dy = -Q[0]![1]; Y = th / 2 - dy; } else { dy = th / 2 + Math.max(0, plaats.tussenruimte) - O[0]![1]; Y = O[0]![1]; }
    const xDA = opHoogte(O[3]!, O[0]!, Y), xBC = opHoogte(O[1]!, O[2]!, Y);
    const W = g.hoekRechts - g.hoekLinks, w = xBC - xDA;
    uitlijning = { links: 0, midden: r2((W - w) / 2), rechts: r2(W - w) };
    dx = g.hoekLinks + plaats.afstand - xDA;
  }
  const naarPlan = ([x, y]: Punt): Punt => {
    if (plaats.soort === 'nieuw') return [x, y];
    const { p, u, o } = plaats.gevel;
    const a = x + dx, b = y + dy;
    return [r2(p[0] + a * u[0] + b * o[0]), r2(p[1] + a * u[1] + b * o[1])];
  };
  let punten = Q.map(naarPlan);
  let gemetenPlan = M.map(naarPlan);
  if (plaats.soort === 'nieuw') {
    // Linksboven op (0, 0).
    const x0 = Math.min(...punten.map((q) => q[0])), y0 = Math.min(...punten.map((q) => q[1]));
    punten = punten.map(([x, y]) => [r2(x - x0), r2(y - y0)]);
    gemetenPlan = gemetenPlan.map(([x, y]) => [r2(x - x0), r2(y - y0)]);
  }
  fouten.push(...vormFouten(punten));
  // Scheve muren: bijna liggend of staand (ten opzichte van AB), maar net niet. Bij echte maten gebeurt dat altijd.
  const namen = plaats.soort === 'nieuw' ? ['bovenkant (AB)', 'rechterkant (BC)', 'onderkant (CD)', 'linkerkant (DA)'] : ['muur tegen de woning (AB)', 'rechtermuur (BC)', 'overkant (CD)', 'linkermuur (DA)'];
  if (vorm.soort === 'vierhoek') {
    M.forEach((a, i) => {
      const b = M[(i + 1) % 4]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let hoek = Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0]) * GRAAD) % 90;
      hoek = Math.min(hoek, 90 - hoek);
      if (hoek > 0.05 && hoek < 3) {
        waarschuwingen.push(`De ${namen[i]} staat ${String(Math.round(hoek * 10) / 10).replace('.', ',')}° scheef (${cm(Math.sin(hoek / GRAAD) * l)} over ${cm(l)}). Is dat zo gemeten? Kijk anders de diagonaal na.`);
      }
    });
  }
  // Overlap met een bestaande ruimte op dezelfde verdieping (raken mag).
  if (plaats.soort !== 'nieuw' && !fouten.length) {
    for (const r of plan.ruimtes.filter((x) => niveauVan(x) === niveau)) {
      if (delenVan(r).some((q) => veelhoekOppervlakte(snijVeelhoek(vormVanDeel(q), punten)) > 100)) {
        fouten.push(`De nieuwe ruimte overlapt met ${r.naam}. Kies een andere gevel of plaats, of kleinere maten.`);
        break;
      }
    }
  }
  const rechthoek = punten.every((a, i) => { const b = punten[(i + 1) % 4]!; return Math.abs(a[0] - b[0]) < 1e-6 || Math.abs(a[1] - b[1]) < 1e-6; })
    ? { x: Math.min(...punten.map((q) => q[0])), y: Math.min(...punten.map((q) => q[1])), b: r2(Math.max(...punten.map((q) => q[0])) - Math.min(...punten.map((q) => q[0]))), d: r2(Math.max(...punten.map((q) => q[1])) - Math.min(...punten.map((q) => q[1]))) }
    : undefined;
  const afst = (a: Punt, b: Punt) => Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 10) / 10;
  return {
    punten, ...(rechthoek ? { rechthoek } : {}), gemeten: gemetenPlan,
    hoeken: hoekenVan(M).map((h) => Math.round(h * 10) / 10), diagonalen: [afst(M[0]!, M[2]!), afst(M[1]!, M[3]!)],
    uitlijning, fouten, waarschuwingen,
  };
}

/**
 * Welke ruimtes samen één gebouw vormen: ruimtes met een gedeelde muur op dezelfde verdieping, en ruimtes die boven
 * elkaar liggen. Geeft per ruimte het nummer van haar gebouw (0, 1, …; het gebouw met de eerste ruimte is 0). Een los
 * bijgebouw (tuinhuis, carport) is een tweede gebouw in hetzelfde plan.
 */
export function gebouwenVan(plan: Plattegrond): Map<string, number> {
  const ouder = new Map<string, string>(plan.ruimtes.map((r) => [r.id, r.id]));
  const wortel = (x: string): string => { let w = x; while (ouder.get(w) !== w) w = ouder.get(w)!; ouder.set(x, w); return w; };
  const verbind = (a: string, b: string) => { const x = wortel(a), y = wortel(b); if (x !== y) ouder.set(y, x); };
  const niveaus = [...new Set(plan.ruimtes.map(niveauVan))];
  for (const n of niveaus) for (const m of murenVan(niveauPlan(plan, n))) if (m.plus && m.min) verbind(m.plus, m.min);
  for (const a of plan.ruimtes) {
    for (const b of plan.ruimtes) {
      if (a.id >= b.id || niveauVan(a) === niveauVan(b) || wortel(a.id) === wortel(b.id)) continue;
      if (delenVan(a).some((p) => delenVan(b).some((q) => veelhoekOppervlakte(snijVeelhoek(vormVanDeel(p), vormVanDeel(q))) > 1))) verbind(a.id, b.id);
    }
  }
  const nummer = new Map<string, number>(), uit = new Map<string, number>();
  for (const r of plan.ruimtes) {
    const w = wortel(r.id);
    if (!nummer.has(w)) nummer.set(w, nummer.size);
    uit.set(r.id, nummer.get(w)!);
  }
  return uit;
}

/** Zet de uitkomst op een ruimte: een rechthoek zonder vrije vorm, of de vrije vorm (zie `zetOmtrek`). */
export function zetMaatVorm(r: Ruimte, m: MaatRuimte): void {
  if (m.rechthoek) {
    Object.assign(r, m.rechthoek);
    delete r.omtrek;
  } else zetOmtrek(r, m.punten);
}

/**
 * Hoe ver het binnenvlak van een ruimte loopt op de plaats van een nieuwe wand: voor een staande wand (`as` 'v') de
 * kleinste en grootste x van het binnenvlak op de hoogte y van `punt`, voor een liggende wand ('h') de kleinste en grootste
 * y op x. Zo is "250 cm van de linkermuur" de vrije maat van het binnenvlak tot de wand, ook bij een schuine muur.
 */
export function binnenRand(plan: Plattegrond, r: Ruimte, as: 'h' | 'v', [x, y]: Punt): [number, number] | undefined {
  const muren = murenVan(niveauPlan(plan, niveauVan(r)));
  const deel = delenVan(r).map(vormVanDeel).find((v) => binnenVeelhoek(v, x, y, -1));
  if (!deel) return undefined;
  const v = binnenVorm(deel, muren);
  const w = as === 'v' ? y : x;
  const snij: number[] = [];
  v.forEach((a, i) => {
    const b = v[(i + 1) % v.length]!;
    const [a1, a2, b1, b2] = as === 'v' ? [a[1], a[0], b[1], b[0]] : [a[0], a[1], b[0], b[1]];
    if ((a1 - w) * (b1 - w) > 0 || Math.abs(b1 - a1) < 1e-9) return;
    snij.push(a2 + ((w - a1) * (b2 - a2)) / (b1 - a1));
  });
  return snij.length >= 2 ? [Math.min(...snij), Math.max(...snij)] : undefined;
}

/**
 * Na een andere vorm (een zijde langer, een hoekpunt verschoven, de ruimte versleept): de ramen en deuren in de muren van
 * die ruimte blijven op dezelfde zijde, op dezelfde afstand van het begin van die zijde (de hoek waar de inmeter van
 * vertrok). `oud` en `nieuw` zijn hetzelfde plan vóór en na; alleen de openingen in `nieuw` veranderen.
 */
export function verzetOpeningen(oud: Plattegrond, nieuw: Plattegrond, ruimteId: string): void {
  const r0 = oud.ruimtes.find((r) => r.id === ruimteId), r1 = nieuw.ruimtes.find((r) => r.id === ruimteId);
  if (!r0 || !r1) return;
  const n = niveauVan(r0);
  const oudeVormen = delenVan(r0).map(vormVanDeel), nieuweVormen = delenVan(r1).map(vormVanDeel);
  const nieuweMuren = murenVan(niveauPlan(nieuw, niveauVan(r1)));
  for (const o0 of oud.openingen) {
    if (niveauVan(o0) !== n) continue;
    const c = langsAs(o0, o0.midden, o0.lijn);
    let plek: { deel: number; zijde: number; s: number } | undefined;
    oudeVormen.forEach((v, deel) => v.forEach((a, zijde) => {
      if (plek) return;
      const b = v[(zijde + 1) % v.length]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l < 1e-6) return;
      const s = ((c[0] - a[0]) * (b[0] - a[0]) + (c[1] - a[1]) * (b[1] - a[1])) / l;
      const dwars = Math.abs((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / l;
      if (dwars < 1 && s > -0.5 && s < l + 0.5) plek = { deel, zijde, s };
    }));
    if (!plek) continue;
    const v = nieuweVormen[plek.deel];
    if (!v || v.length !== oudeVormen[plek.deel]!.length) continue;
    const a = v[plek.zijde]!, b = v[(plek.zijde + 1) % v.length]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-6) continue;
    const p: Punt = [a[0] + ((b[0] - a[0]) * plek.s) / l, a[1] + ((b[1] - a[1]) * plek.s) / l];
    const d = dichtsteMuur(nieuweMuren, p[0], p[1], 2);
    const o = nieuw.openingen.find((x) => x.id === o0.id);
    if (!d || !o) continue;
    Object.assign(o, opMuur(d.muur, Math.round(d.midden * 100) / 100) as Partial<Opening>);
    if (d.muur.as !== 's') delete o.richting;
  }
}
