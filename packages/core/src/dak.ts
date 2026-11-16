/**
 * Dak van de woning als gegevens: vorm, helling, richting, oversteek en bedekking (codes uit de dakcatalogus), en
 * lichtkoepels en lichtstraten op een plat dak.
 *
 * Hier staat alleen de zuivere meetkunde van een hellend dak op één rechthoek (lessenaar of zadel) en de blokken die
 * eruit volgen. Wat bij het plan hoort (welk deel hellend is, de platte stukken, de dakrand, de controles) staat in
 * plattegrond.ts (`dakOpbouw`). Maten in cm, zoals de plattegrond: x naar rechts, plan-y is in 3D de z-as.
 */
import type { GevelKant, Rechthoek } from './plattegrond.js';
import type { Blok, BlokSoort } from './ruimtelijk.js';

export type DakVorm = 'plat' | 'lessenaar' | 'zadel';

/** Gekozen dakbedekking (codes uit de dakcatalogus van de klant). */
export interface DakBedekking {
  materiaal: string;
  kleur: string;
}

/** Het dak van de woning. Ontbreekt deze keuze in het plan, dan blijft alles zoals vóór het dak erbij kwam. */
export interface DakKeuze {
  vorm: DakVorm;
  /** Helling in graden (lessenaar en zadel). */
  helling: number;
  /**
   * Lessenaar: de kant van de woning waar het dak naar afloopt (de lage kant). Zadel: een van de twee kanten met een
   * dakvoet; de nok loopt evenwijdig met die kant (boven en onder geven dus hetzelfde dak, links en rechts ook).
   */
  richting: GevelKant;
  /** Oversteek buiten de gevel, rondom (cm). */
  oversteek: number;
  /** Bedekking van het dak: bij een plat dak EPDM, roofing, grind of groendak; bij een hellend dak pannen, leien of zink. */
  bedekking: DakBedekking;
  /** Bedekking van de platte delen naast een hellend dak (lagere daken, of alles als het hellende dak niet kan). */
  plat?: DakBedekking;
}

/** Lichtkoepel of lichtstraat in een plat dak: de opening (dagmaat) boven een ruimte van die verdieping. */
export interface DakLicht {
  id: string;
  /** Code in de catalogus (`cat.daklichten`). */
  type: string;
  /** Linkerbovenhoek en maten van de opening (cm). */
  x: number;
  y: number;
  b: number;
  d: number;
  /** Verdieping van de ruimte eronder (0 = gelijkvloers). */
  niveau?: number;
  /**
   * Buitenzonwering op een plat dakraam (ronde 11b): een screen boven het glas. Ontbreekt = geen. Telt alleen als het type in
   * de catalogus zonwering kent (`DakLichtType.zonwering`); een koepel of lichtstraat toont ze niet.
   */
  zonwering?: 'screen';
  /** Hoe ver dat screen dicht is in de 3D en de tekening (alleen voor het beeld): half (standaard) of helemaal. */
  zonweringStand?: 'half' | 'dicht';
}

/** Een dakbedekking in de catalogus: soort voor 3D en tekening, kleuren en prijs per m² (zelfde patroon als de gevel). */
export interface DakMateriaal {
  label: string;
  /** Groep in de keuzelijst (Plat dak, Pannen, Leien …). */
  groep: string;
  soort: BlokSoort;
  /** Waar de bedekking past: op een plat of op een hellend dak. */
  voor: 'plat' | 'hellend';
  kleuren: Record<string, { label: string; hex: string }>;
  eenheid: 'm²';
  /** Verkoop- en kostprijs per m², geplaatst (demo). */
  prijs: number;
  kost: number;
  artikel?: string;
  /** Kleinste helling in graden waarop deze bedekking mag (richtwaarde). */
  minHelling?: number;
  /** Korte uitleg voor de klant. */
  uitleg?: string;
}

/**
 * Een lichtkoepel, lichtstraat of plat dakraam in de catalogus, met een vaste dagmaat. Een plat dakraam (ronde 11b) is vlak
 * glas op een opstand die licht helt (geen koepel).
 */
export interface DakLichtType {
  label: string;
  groep: string;
  vorm: 'koepel' | 'lichtstraat' | 'dakraam';
  /** Dagmaat van de opening (cm). */
  b: number;
  d: number;
  /** Verkoop- en kostprijs per stuk, geplaatst met opstand (demo). */
  prijs: number;
  kost: number;
  artikel?: string;
  /** Buitenzonwering die op dit daklicht past (een screen boven het glas), per stuk met motor (demo: prijs verzonnen). */
  zonwering?: { label: string; prijs: number; kost: number; artikel?: string };
}

/** Dikte van de dakopbouw onder de bedekking en van de bedekking zelf, loodrecht op het dakvlak (cm). */
export const DAK_OPBOUW = 16;
export const DAK_BEDEKKING = 6;
/** Hoogte en breedte van de opstand rond een lichtkoepel (cm). */
export const OPSTAND_HOOGTE = 15;
export const OPSTAND_RAND = 6;
/** Deel van de dagmaat van een koepel dat als glas telt voor het daglicht (richtwaarde). */
export const DAKLICHT_GLAS = 0.8;

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Meetkunde van een hellend dak (lessenaar of zadel) op één rechthoek. */
export interface HellendDak {
  vorm: 'lessenaar' | 'zadel';
  /** As waarlangs de nok loopt: 'x' (links–rechts op het plan) of 'z' (boven–onder). */
  nokAs: 'x' | 'z';
  /** Buitenkant van de gevels dwars op de nok (p0 < p1) en langs de nok (q0 < q1). */
  p0: number;
  p1: number;
  q0: number;
  q1: number;
  /** Helling in graden (begrensd) en haar tangens. */
  helling: number;
  tan: number;
  oversteek: number;
  /** Plaats van de nok dwars op de nok-as: het midden (zadel) of de hoge gevel (lessenaar). */
  nokP: number;
  /** Lessenaar: de buitenkant van de lage gevel (de dakvoet). Zadel: p0. */
  voetP: number;
  /** Hoogte van de onderkant van het dak bij de nok, boven de dakvoet (bovenkant van de muren). */
  nok: number;
  /** Hoogste punt van de bedekking boven de dakvoet. */
  top: number;
  /** Oppervlakte van de bedekking in m², gemeten langs de helling, met de oversteek. */
  oppervlakte: number;
}

/** Het hellende dak op een rechthoek (`buiten` = buitenkant van de gevels, in planmaat). */
export function hellendDak(buiten: Rechthoek, keuze: DakKeuze): HellendDak {
  const vorm = keuze.vorm === 'zadel' ? 'zadel' : 'lessenaar';
  const helling = Math.min(70, Math.max(3, Number(keuze.helling) || 0));
  const oversteek = Math.min(150, Math.max(0, Number(keuze.oversteek) || 0));
  const tan = Math.tan((helling * Math.PI) / 180), cos = Math.cos((helling * Math.PI) / 180);
  // Loopt het dak af naar boven of onder (plan-y), dan ligt de nok langs x; anders langs z.
  const nokAs = keuze.richting === 'boven' || keuze.richting === 'onder' ? 'x' : 'z';
  const [p0, p1, q0, q1] = nokAs === 'x'
    ? [buiten.y, buiten.y + buiten.d, buiten.x, buiten.x + buiten.b]
    : [buiten.x, buiten.x + buiten.b, buiten.y, buiten.y + buiten.d];
  const laagBijP0 = keuze.richting === 'boven' || keuze.richting === 'links';
  const S = p1 - p0, L = q1 - q0;
  const nokP = vorm === 'zadel' ? (p0 + p1) / 2 : laagBijP0 ? p1 : p0;
  const voetP = vorm === 'zadel' ? p0 : laagBijP0 ? p0 : p1;
  const nok = tan * (vorm === 'zadel' ? S / 2 : S);
  const langsHelling = (vorm === 'zadel' ? 2 * (S / 2 + oversteek) : S + 2 * oversteek) / cos;
  // Hoogste punt: bij een lessenaar loopt het vlak nog door in de oversteek aan de hoge kant.
  const top = nok + (vorm === 'zadel' ? 0 : oversteek * tan) + (DAK_OPBOUW + DAK_BEDEKKING) / cos;
  return {
    vorm, nokAs, p0, p1, q0, q1, helling, tan, oversteek, nokP, voetP, nok: r2(nok), top: r2(top),
    oppervlakte: (langsHelling * (L + 2 * oversteek)) / 10000,
  };
}

/** Hoogte van de onderkant van het dak boven de dakvoet, op plaats p dwars op de nok (negatief in de oversteek). */
export function dakHoogte(d: HellendDak, p: number): number {
  if (d.vorm === 'zadel') return d.tan * Math.min(p - d.p0, d.p1 - p);
  // Lessenaar: één vlak dat van de dakvoet naar de hoge gevel stijgt (en in de oversteek gewoon doorloopt).
  return d.tan * (p - d.voetP) * (d.nokP > d.voetP ? 1 : -1);
}

/**
 * Het stuk gevel tussen de dakvoet en de onderkant van het dak, langs een muur die dwars op de nok staat (de topgevel),
 * van a0 tot a1: punten [p, hoogte boven de dakvoet], rondom. Leeg als er niets boven de dakvoet uitkomt.
 */
export function gevelOnderDak(d: HellendDak, a0: number, a1: number): [number, number][] {
  const h = (p: number) => Math.max(0, dakHoogte(d, p));
  const punten: [number, number][] = [[a0, 0], [a1, 0], [a1, h(a1)]];
  if (d.vorm === 'zadel' && d.nokP > a0 + 0.01 && d.nokP < a1 - 0.01) punten.push([d.nokP, d.nok]);
  punten.push([a0, h(a0)]);
  if (Math.max(...punten.map((q) => q[1])) < 0.5) return [];
  // Samenvallende punten weglaten (een driehoek heeft aan de lage kant geen hoogte).
  return punten.filter((q, i) => {
    const v = punten[(i + punten.length - 1) % punten.length]!;
    return Math.abs(q[0] - v[0]) > 0.01 || Math.abs(q[1] - v[1]) > 0.01;
  }).map(([p, y]) => [r2(p), r2(y)]);
}

/** Oppervlakte (cm²) van het stuk gevel onder het dak tussen a0 en a1 (zie gevelOnderDak). */
export function oppervlakOnderDak(d: HellendDak, a0: number, a1: number): number {
  const pt = gevelOnderDak(d, a0, a1);
  let som = 0;
  for (let i = 0; i < pt.length; i++) {
    const a = pt[i]!, b = pt[(i + 1) % pt.length]!;
    som += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(som) / 2;
}

function donker(hex: string, f: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const k = (i: number) => Math.round(parseInt(m[1]!.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0');
  return `#${k(0)}${k(2)}${k(4)}`;
}

/** Een prisma met zijn omsluitende kader: doorsnede [p, y] dwars op `as`, doorgetrokken van a tot b langs `as`. */
export function prisma(code: string, soort: BlokSoort, kleur: string, as: 'x' | 'z', a: number, b: number, doorsnede: [number, number][], extra: Partial<Blok> = {}): Blok {
  const ps = doorsnede.map((q) => q[0]), ys = doorsnede.map((q) => q[1]);
  const p0 = Math.min(...ps), y0 = Math.min(...ys);
  const langs = { van: r2(Math.min(a, b)), maat: r2(Math.abs(b - a)) }, dwars = { van: r2(p0), maat: r2(Math.max(...ps) - p0) };
  return {
    code, soort, vorm: 'prisma', as, kleur,
    x: as === 'x' ? langs.van : dwars.van, b: as === 'x' ? langs.maat : dwars.maat,
    z: as === 'x' ? dwars.van : langs.van, d: as === 'x' ? dwars.maat : langs.maat,
    y: r2(y0), h: r2(Math.max(...ys) - y0),
    doorsnede: doorsnede.map(([p, y]) => [r2(p), r2(y)]),
    ...extra,
  };
}

/**
 * De blokken van het hellende dak zelf: de dakopbouw (met de rand van de oversteek) en daarop de bedekking, elk als
 * één prisma langs de nok, en bij een zadeldak de nokvorst. `y` = hoogte van de dakvoet (bovenkant van de muren).
 */
export function dakBlokken(d: HellendDak, y: number, bedekking: { soort: BlokSoort; kleur: string }): Blok[] {
  const cos = Math.cos((d.helling * Math.PI) / 180);
  const pa = d.p0 - d.oversteek, pb = d.p1 + d.oversteek, qa = d.q0 - d.oversteek, qb = d.q1 + d.oversteek;
  const onder: [number, number][] = d.vorm === 'zadel'
    ? [[pa, dakHoogte(d, pa)], [d.nokP, d.nok], [pb, dakHoogte(d, pb)]]
    : [[pa, dakHoogte(d, pa)], [pb, dakHoogte(d, pb)]];
  const laag = (van: number, tot: number): [number, number][] => [
    ...onder.map(([p, h]): [number, number] => [p, y + h + van]),
    ...[...onder].reverse().map(([p, h]): [number, number] => [p, y + h + tot]),
  ];
  const v1 = DAK_OPBOUW / cos, v2 = DAK_BEDEKKING / cos;
  const uit: Blok[] = [
    prisma('dak_opbouw', 'kunststof', '#3f3e3b', d.nokAs, qa, qb, laag(0, v1)),
    prisma('dak_bedekking', bedekking.soort, bedekking.kleur, d.nokAs, qa, qb, laag(v1, v1 + v2)),
  ];
  if (d.vorm === 'zadel') {
    // Nokvorst: een ronde vorst over de naad van de twee dakvlakken.
    const dia = 16, yc = y + d.nok + v1 + v2 - 3;
    const langs = { van: r2(qa - 1), maat: r2(qb - qa + 2) }, dwars = { van: r2(d.nokP - dia / 2), maat: dia };
    uit.push({
      code: 'dak_nok', soort: 'dak', vorm: 'cilinder', as: d.nokAs, kleur: donker(bedekking.kleur, 0.82),
      x: d.nokAs === 'x' ? langs.van : dwars.van, b: d.nokAs === 'x' ? langs.maat : dwars.maat,
      z: d.nokAs === 'x' ? dwars.van : langs.van, d: d.nokAs === 'x' ? dwars.maat : langs.maat,
      y: r2(yc - dia / 2), h: dia,
    });
  }
  return uit;
}

/** Helling van het glas van een plat dakraam (graden, richtwaarde): het water loopt af naar de voorkant (de grootste plan-y). */
export const DAKRAAM_HELLING = 3;

/** Hoeveel de achterkant van een plat dakraam hoger ligt dan de voorkant (cm), over de opstand gemeten. */
export function dakraamStijging(l: Pick<DakLicht, 'd'>): number {
  return r2((l.d + 2 * OPSTAND_RAND) * Math.tan((DAKRAAM_HELLING * Math.PI) / 180));
}

/**
 * Plat dakraam (ronde 11b): een opstand die naar voren afloopt, daarop één vlakke glazen plaat met een donkere rand die over
 * de opstand steekt. Met een screen (`l.zonwering`): een kast langs de hoge kant, twee geleiders opzij en het doek net boven
 * het glas, half of helemaal dicht (`l.zonweringStand`). Alleen bestaande soorten en vormen (blok en prisma).
 */
function dakraamBlokken(l: DakLicht, y: number, dakdikte: number): Blok[] {
  const R = OPSTAND_RAND, H = OPSTAND_HOOGTE, grijs = '#cfcdc7', glas = '#cfdde1', wit = '#eceae4', rand = '#34373a', k = 1.5;
  const id = `daklicht_${l.id}`;
  // Achterkant (hoog) en voorkant (laag) van de opstand; `top(z)` = bovenkant van de opstand op plaats z.
  const z0 = l.y - R, z1 = l.y + l.d + R;
  const tan = dakraamStijging(l) / (z1 - z0);
  const top = (z: number) => y + H + (z1 - z) * tan;
  /** Een stuk dat van y0 tot de schuine bovenkant (+ op) reikt, of met `dik` een plaat die de helling volgt. */
  const tot = (code: string, soort: BlokSoort, kleur: string, xa: number, xb: number, za: number, zb: number, y0: number) =>
    prisma(`${id}_${code}`, soort, kleur, 'x', xa, xb, [[za, y0], [zb, y0], [zb, top(zb)], [za, top(za)]]);
  const plaat = (code: string, soort: BlokSoort, kleur: string, xa: number, xb: number, za: number, zb: number, op: number, dik: number) =>
    prisma(`${id}_${code}`, soort, kleur, 'x', xa, xb, [[za, top(za) + op], [zb, top(zb) + op], [zb, top(zb) + op + dik], [za, top(za) + op + dik]]);
  const uit: Blok[] = [
    tot('opstand_l', 'kunststof', grijs, l.x - R, l.x, z0, z1, y),
    tot('opstand_r', 'kunststof', grijs, l.x + l.b, l.x + l.b + R, z0, z1, y),
    tot('opstand_a', 'kunststof', grijs, l.x, l.x + l.b, z0, l.y, y),
    tot('opstand_v', 'kunststof', grijs, l.x, l.x + l.b, l.y + l.d, z1, y),
    // Lichte dagkanten in de schacht, van het plafond tot onder het glas.
    tot('dagkant_l', 'gevel', wit, l.x, l.x + k, l.y, l.y + l.d, y - dakdikte),
    tot('dagkant_r', 'gevel', wit, l.x + l.b - k, l.x + l.b, l.y, l.y + l.d, y - dakdikte),
    tot('dagkant_a', 'gevel', wit, l.x + k, l.x + l.b - k, l.y, l.y + k, y - dakdikte),
    tot('dagkant_v', 'gevel', wit, l.x + k, l.x + l.b - k, l.y + l.d - k, l.y + l.d, y - dakdikte),
  ];
  // De glazen plaat: 1,5 cm over de opstand, 3 cm dik, met een donkere rand van 7,5 cm (de bedrukte rand van het glas).
  const t = 3, w = 7.5, xo0 = l.x - R - 1.5, xo1 = l.x + l.b + R + 1.5, zo0 = z0 - 1.5, zo1 = z1 + 1.5;
  uit.push(
    plaat('rand_a', 'kunststof', rand, xo0, xo1, zo0, zo0 + w, 0, t),
    plaat('rand_v', 'kunststof', rand, xo0, xo1, zo1 - w, zo1, 0, t),
    plaat('rand_l', 'kunststof', rand, xo0, xo0 + w, zo0 + w, zo1 - w, 0, t),
    plaat('rand_r', 'kunststof', rand, xo1 - w, xo1, zo0 + w, zo1 - w, 0, t),
    plaat('glas', 'glas', glas, xo0 + w, xo1 - w, zo0 + w, zo1 - w, 0, t),
  );
  if (l.zonwering === 'screen') {
    // Screen: kast langs de hoge kant, geleiders opzij, het doek 1,2 cm boven het glas tot de helft of tot de voorkant.
    const kast = '#6a6d70', doek = '#2f3234', zs = zo0 + 10, ze = l.zonweringStand === 'dicht' ? zo1 - 0.5 : zs + (zo1 - 0.5 - zs) / 2;
    uit.push(
      plaat('zon_kast', 'metaal', kast, xo0, xo1, zo0, zs, t, 8),
      plaat('zon_geleider_l', 'metaal', kast, xo0, xo0 + 3.5, zs, zo1, t, 2.5),
      plaat('zon_geleider_r', 'metaal', kast, xo1 - 3.5, xo1, zs, zo1, t, 2.5),
      plaat('zon_doek', 'stof', doek, xo0 + 3.5, xo1 - 3.5, zs, ze - 1.5, t + 1.2, 0.4),
      plaat('zon_onderlat', 'metaal', kast, xo0 + 3, xo1 - 3, ze - 3, ze, t + 0.6, 2.2),
    );
  }
  return uit;
}

/**
 * Lichtkoepel, lichtstraat of plat dakraam op een plat dak: opstand rond de opening en daarop het glas. `y` = bovenkant van
 * het dak. De opening in het dak zelf snijdt `plattegrond3D` uit de dakplaat.
 */
export function daklichtBlokken(l: DakLicht, vorm: DakLichtType['vorm'], y: number, dakdikte = 30): Blok[] {
  if (vorm === 'dakraam') return dakraamBlokken(l, y, dakdikte);
  const R = OPSTAND_RAND, H = OPSTAND_HOOGTE, grijs = '#cfcdc7', glas = '#cfdde1', wit = '#eceae4', k = 1.5;
  const blok = (code: string, soort: BlokSoort, x: number, yy: number, z: number, b: number, h: number, d: number, kleur: string, extra: Partial<Blok> = {}): Blok =>
    ({ code: `daklicht_${l.id}_${code}`, soort, vorm: 'blok', x: r2(x), y: r2(yy), z: r2(z), b: r2(b), h: r2(h), d: r2(d), kleur, ...extra });
  const uit: Blok[] = [
    blok('opstand_l', 'kunststof', l.x - R, y, l.y - R, R, H, l.d + 2 * R, grijs),
    blok('opstand_r', 'kunststof', l.x + l.b, y, l.y - R, R, H, l.d + 2 * R, grijs),
    blok('opstand_a', 'kunststof', l.x, y, l.y - R, l.b, H, R, grijs),
    blok('opstand_v', 'kunststof', l.x, y, l.y + l.d, l.b, H, R, grijs),
    // Lichte dagkanten in de schacht, van het plafond tot de bovenkant van de opstand (de dakplaat zelf is daar donker).
    blok('dagkant_l', 'gevel', l.x, y - dakdikte, l.y, k, dakdikte + H, l.d, wit),
    blok('dagkant_r', 'gevel', l.x + l.b - k, y - dakdikte, l.y, k, dakdikte + H, l.d, wit),
    blok('dagkant_a', 'gevel', l.x + k, y - dakdikte, l.y, l.b - 2 * k, dakdikte + H, k, wit),
    blok('dagkant_v', 'gevel', l.x + k, y - dakdikte, l.y + l.d - k, l.b - 2 * k, dakdikte + H, k, wit),
  ];
  if (vorm === 'lichtstraat') {
    // Lichtstraat: een laag zadeldakje in glas over de lange kant, met een profiel op de nok.
    const langsX = l.b >= l.d;
    const [k0, k1] = langsX ? [l.y - R, l.y + l.d + R] : [l.x - R, l.x + l.b + R];
    const [a0, a1] = langsX ? [l.x - R, l.x + l.b + R] : [l.y - R, l.y + l.d + R];
    const stijging = (k1 - k0) / 2 * Math.tan((25 * Math.PI) / 180), km = (k0 + k1) / 2, yo = y + H;
    uit.push(prisma(`daklicht_${l.id}_glas`, 'glas', glas, langsX ? 'x' : 'z', a0, a1, [[k0, yo], [k1, yo], [km, yo + stijging]]));
    uit.push(langsX
      ? blok('nok', 'metaal', a0, yo + stijging - 1, km - 2, a1 - a0, 3, 4, '#2b2b2b')
      : blok('nok', 'metaal', km - 2, yo + stijging - 1, a0, 4, 3, a1 - a0, '#2b2b2b'));
  } else {
    const bol = Math.min(30, Math.max(16, Math.min(l.b, l.d) * 0.28));
    uit.push(blok('koepel', 'glas', l.x - R + 1, y + H, l.y - R + 1, l.b + 2 * R - 2, bol, l.d + 2 * R - 2, glas, { afronding: Math.min(12, bol / 2 - 1) }));
  }
  return uit;
}
