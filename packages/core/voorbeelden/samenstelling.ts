/**
 * Een samenstelling van bouwdelen voor een vast model in staal (de loods in loods3d.ts, het staalwerk rond de woning in
 * staalwerk3d.ts): bouwdelen op hun plaats, met losse blokken erbij, in twee weergaven, en de meetstaat van die ene
 * samenstelling. Zo tekent de 3D dezelfde stukken als de meetstaat telt, zoals bij de bijgebouwen in hout.
 *
 * Verschil met de bijgebouwen: een bouwdeel kan **alleen in één weergave** staan (`alleen`). De loods toont het staal
 * alleen in de constructieweergave (afgewerkt zit het achter de bekleding), en de bekleding in de constructieweergave
 * alleen als staal achteraan. De meetstaat telt altijd alles.
 */
import {
  blokOmvang, bouwdeelBlokken, bouwdeelOpPlaats, meetstaat, profielKader, staalStaaf,
  type Blok, type BlokSoort, type BouwMateriaal, type Bouwdeel, type BouwWeergave, type LaagRol, type MeetstaatOpties, type MeetstaatRegel,
  type Scene3D, type Staalprofiel, type StukRol,
} from '../src/index.js';

export type Draai = 0 | 90 | 180 | 270;

/** Een bouwdeel op zijn plaats in het geheel. */
export interface GeplaatstDeel {
  /** Voorvoegsel van zijn blokken in de 3D, uniek binnen het geheel (bv. `kolom.3`, `wand.links.1`). */
  code: string;
  deel: Bouwdeel;
  /** Minimumhoek van het bouwdeel in het geheel (cm), ná de draaiing. */
  x: number;
  y: number;
  z: number;
  draai: Draai;
  /** Alleen in deze weergave tekenen; leeg = in beide. De meetstaat telt het altijd. */
  alleen?: BouwWeergave;
  /** Eigen blokken, al op hun plaats (bv. een topgevel als prisma): getekend in plaats van de blokken van het bouwdeel. */
  blokken?: Blok[];
}

export interface Samenstelling {
  delen: GeplaatstDeel[];
  /** Losse blokken in beide weergaven. */
  vast: Blok[];
  /** Losse blokken alleen in de afgewerkte weergave (poorten, deuren, goten, naden …). Niet in de meetstaat. */
  afwerking: Blok[];
  /** Wat de bouwdelen aangepast of weggelaten hebben, in gewone taal (hoort leeg te zijn bij een geldige configuratie). */
  meldingen: string[];
}

const r2 = (x: number) => Math.round(x * 100) / 100 + 0;

/** Houdt de bouwdelen en de losse blokken van één geheel bij. */
export class Samensteller {
  delen: GeplaatstDeel[] = [];
  vast: Blok[] = [];
  afwerking: Blok[] = [];
  private tellers = new Map<string, number>();

  private code(basis: string): string {
    const n = (this.tellers.get(basis) ?? 0) + 1;
    this.tellers.set(basis, n);
    return `${basis}.${n}`;
  }

  /** Zet een bouwdeel met zijn minimumhoek op (x, y, z), na de draaiing. */
  zet(basis: string, deel: Bouwdeel, x: number, y: number, z: number, draai: Draai = 0, extra: Partial<GeplaatstDeel> = {}): GeplaatstDeel {
    const g: GeplaatstDeel = { code: this.code(basis), deel, x: r2(x), y: r2(y), z: r2(z), draai, ...extra };
    this.delen.push(g);
    return g;
  }

  /** Een staaf tussen twee punten (cm, in de assen van het geheel), zie `staalStaaf`. */
  staaf(basis: string, profiel: Staalprofiel, materiaal: string, materialen: Record<string, BouwMateriaal>, van: [number, number, number], tot: [number, number, number], rol?: StukRol, extra: Partial<GeplaatstDeel> = {}) {
    const deel = staalStaaf({ profiel, materiaal, van, tot, ...(rol ? { rol } : {}) }, materialen);
    const k = profielKader(profiel), R = Math.max(k.hoogte, k.breedte) / 20;
    return this.zet(basis, deel, Math.min(van[0], tot[0]) - R, Math.min(van[1], tot[1]) - R, Math.min(van[2], tot[2]) - R, 0, extra);
  }

  /** Een los rechthoekig blok. */
  blok(lijst: Blok[], code: string, soort: BlokSoort, kleur: string, x: number, y: number, z: number, b: number, h: number, d: number, extra: Partial<Blok> = {}) {
    if (b > 0.01 && h > 0.01 && d > 0.01) lijst.push({ code, soort, vorm: 'blok', kleur, x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d), ...extra });
  }

  klaar(): Samenstelling {
    return { delen: this.delen, vast: this.vast, afwerking: this.afwerking, meldingen: this.delen.flatMap((g) => g.deel.meldingen.map((m) => `${g.code}: ${m}`)) };
  }
}

/** De blokken van één geplaatst bouwdeel in een weergave, op hun plaats. */
export function geplaatsteBlokken(g: GeplaatstDeel, weergave: BouwWeergave): Blok[] {
  if (g.alleen && g.alleen !== weergave) return [];
  if (g.blokken) return g.blokken.map((b) => ({ ...b, code: `${g.code}.${b.code}` }));
  return bouwdeelOpPlaats(bouwdeelBlokken(g.deel, weergave, { voorvoegsel: `${g.code}.` }), g.deel.maten, g);
}

/** Alle blokken van een samenstelling in een weergave. */
export function samenstellingBlokken(s: Samenstelling, weergave: BouwWeergave): Blok[] {
  return [...s.delen.flatMap((g) => geplaatsteBlokken(g, weergave)), ...s.vast, ...(weergave === 'afgewerkt' ? s.afwerking : [])];
}

/** De echte omvang van een lijst blokken (cm), ook van gekantelde en gedraaide staven. */
export function omvang(blokken: Blok[]) {
  const o = blokken.map(blokOmvang);
  return {
    x0: Math.min(...o.map((q) => q.x0)), x1: Math.max(...o.map((q) => q.x1)), y0: Math.min(...o.map((q) => q.y0)),
    y1: Math.max(...o.map((q) => q.y1)), z0: Math.min(...o.map((q) => q.z0)), z1: Math.max(...o.map((q) => q.z1)),
  };
}

/**
 * Een scène uit blokken, met een kader dat rondom `ruimte` × de grootste maat ruimer is dan de echte omvang: de kijker
 * kadreert op breedte en diepte, en een breed, laag gebouw valt in het schuine standpunt anders deels buiten beeld.
 */
export function sceneVan(blokken: Blok[], ruimte = 0.12): Scene3D {
  const o = omvang(blokken), b = o.x1 - o.x0, d = o.z1 - o.z0, ruim = ruimte * Math.max(b, d);
  return { blokken, kader: { x: r2(o.x0 - ruim), z: r2(o.z0 - ruim), b: r2(b + 2 * ruim), d: r2(d + 2 * ruim), h: r2(o.y1) } };
}

/** De meetstaat van een samenstelling: de som van de meetstaten van haar bouwdelen. Netto, zonder prijzen. */
export function samenstellingMeetstaat(s: Samenstelling, materialen: Record<string, BouwMateriaal>, opties: MeetstaatOpties = {}): MeetstaatRegel[] {
  return meetstaat(s.delen.map((g) => g.deel), materialen, opties);
}

/**
 * Een vlak dat geen wand-, vloer- of dakvlak is (een topgevel, een glasplaat, een trede): een bouwdeel met alleen één
 * laag en haar oppervlakte, zodat de meetstaat het telt. Zijn blokken geef je zelf mee (`GeplaatstDeel.blokken`).
 */
export function vlakDeel(naam: string, materiaal: string, materialen: Record<string, BouwMateriaal>, dikteMm: number, m2: number, rol: LaagRol = 'afwerking_buiten'): Bouwdeel {
  const m = materialen[materiaal];
  return {
    soort: 'wandvlak', maten: { b: 0, h: 0, d: 0 }, stukken: [], dragend: 0,
    meldingen: m ? [] : [`Het materiaal «${materiaal}» staat niet in de materialenlijst.`],
    lagen: [{ index: 0, naam, rol, materiaal, dikte: dikteMm, van: 0, tot: dikteMm / 10, getekend: [0, dikteMm / 10], soort: m?.soort ?? 'gevel', kleur: m?.kleur ?? '#b8b8b8', oppervlakte: r2(m2) }],
  };
}
