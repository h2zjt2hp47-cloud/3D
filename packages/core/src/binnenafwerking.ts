/**
 * Binnenafwerking (ronde 12): per ruimte een plafond, een plint en eventueel één accentmuur, naast de vloer en de wand
 * die er al waren. Jonas (17/11): *"eventueel beknopte binnenafwerking"*: weinig keuzes, goed gekozen; de sferen (één tik
 * voor de hele woning) staan als gegevens in `core/voorbeelden/sferen.ts`.
 *
 * Alles is optioneel: een ruimte zonder `plafond`, `plint` of `accent` (elk plan van vroeger) geeft exact dezelfde 3D,
 * regels en posten als vroeger.
 *
 * - **Accentmuur**: de muren aan één kant van de ruimte (`binnenKant`) krijgen aan de binnenkant een andere afwerking.
 * - **Plint**: een dunne lijst vóór de binnenkant van de muren (niet erin: geen vlakken die samenvallen), op de vloer,
 *   onderbroken waar een deur of een raam tot op de vloer zit (`plintBlokken`). Gemeten: de netto omtrek min die openingen.
 * - **Plafond**: in de gewone 3D van de woning zie je het niet (dicht dak, of lage muren zonder plafond); het staat in
 *   de 3D van één ruimte *van binnen* (`ruimteVanBinnen` in plattegrond.ts, met `plafondBlokken`).
 */
import { plaatsBlokken, type Blok, type BlokSoort } from './ruimtelijk.js';
import {
  asVan, binnenVorm, delenVan, draaiBlokken, meubelVoetafdruk, muurVanOpening, muurVlak, niveauVan, opAs, openingenVanRuimte,
  ruimteMaten, trekAf, VLOERDIKTE, vormVanDeel, grondPrisma,
  type GevelKant, type Meubel, type Muur, type PlanCatalogus, type Plattegrond, type Punt, type Rechthoek, type Ruimte,
} from './plattegrond.js';

/** De vier kanten van een ruimte op het plan, met de klok mee vanaf boven (zoals `buitenRichting`). */
export const RUIMTE_KANTEN: GevelKant[] = ['boven', 'rechts', 'onder', 'links'];

const r2 = (x: number) => Math.round(x * 100) / 100;
const GRAAD = 180 / Math.PI;

/** Dikte van een plint (cm), vóór het binnenvlak van de muur. */
export const PLINT_DIKTE = 1.2;
/** Dikte van de laag van het plafond (cm) in de 3D van binnen. */
export const PLAFOND_DIKTE = 1.5;
/** De bovenkant van de vloer in de 3D (de vloer is een blok van 1,5 cm, zoals in `niveau3D`). */
const VLOER_BOVEN = 1.5;

/**
 * Aan welke kant van ruimte `id` staat muur `m`, gezien op het plan (boven = naar de bovenkant van de tekening)?
 * Een schuine muur telt bij de dichtste kant, zoals `buitenKant`. Undefined als de muur niet aan de ruimte grenst.
 */
export function binnenKant(m: Muur, id: string): GevelKant | undefined {
  if (m.plus !== id && m.min !== id) return undefined;
  const plus = m.plus === id;
  if (m.as === 'h') return plus ? 'boven' : 'onder';
  if (m.as === 'v') return plus ? 'links' : 'rechts';
  // Van de ruimte naar de muur: ligt de ruimte aan de plus-kant, dan ligt de muur tegen n in.
  const { n } = asVan(m);
  const [dx, dy] = plus ? [-n[0], -n[1]] : n;
  const hoek = ((Math.atan2(dx, -dy) * GRAAD) % 360 + 360) % 360;
  return RUIMTE_KANTEN[Math.round(hoek / 90) % 4];
}

/** Krijgt de binnenkant van muur `m` in ruimte `r` de afwerking van de accentmuur? */
export const isAccent = (r: Ruimte, m: Muur) => !!r.accent && binnenKant(m, r.id) === r.accent.kant;

/** Heeft de verkoper de binnenafwerking van deze ruimte gekozen (een plafond of een plint)? Dan laat een stijl ze staan. */
export const binnenGekozen = (r: Ruimte) => r.plafond !== undefined || r.plint !== undefined;

/** De plint van een ruimte zoals de 3D ze tekent (soort, kleur, hoogte), of niets (geen plint, een bestaande ruimte). */
export function plintAfwerking(cat: PlanCatalogus, r: Ruimte): { soort: BlokSoort; kleur: string; hoogte: number } | undefined {
  const p = r.plint && r.bestaand !== true ? cat.plinten?.[r.plint] : undefined;
  if (!p) return undefined;
  const v = cat.vloeren[r.vloer];
  // Zoals de vloer: een houten plint bij parket, een tegelplint bij tegels; anders de eigen kleur van de plint.
  const past = !!p.zoalsVloer && !!v && (v.soort === p.soort || (p.soort === 'hout' && v.soort === 'parket'));
  return { soort: p.soort, kleur: past ? v!.kleur : p.kleur, hoogte: p.hoogte };
}

/** Raakt een opening de plint (een deur, een raam tot op de vloer)? */
const onderbreektPlint = (o: { borstwering: number }, hoogte: number) => o.borstwering < hoogte;

/**
 * De plint van ruimte `r` in de 3D: per muur rond de ruimte (niet aan de kanten in `open`) een lijst van `PLINT_DIKTE` vóór
 * het binnenvlak, op de vloer (1,5 cm), onderbroken door de openingen tot op de vloer. Ze raakt de muur en de vloer zonder
 * erin te steken: haar achterkant en onderkant kijken weg van wat ze raken, dus niets flikkert. Langs de hele muur, ook het
 * stukje in de hoek (daar zit het in de muur ernaast, onzichtbaar). Een schuine muur: zoals een staande muur op dezelfde
 * lijn, dan gedraaid (zoals een raam in een schuine muur).
 */
export function plintBlokken(plan: Plattegrond, cat: PlanCatalogus, r: Ruimte, muren: Muur[], opties: { open?: GevelKant[]; code?: (code: string) => string } = {}): Blok[] {
  const afw = plintAfwerking(cat, r);
  if (!afw) return [];
  const uit: Blok[] = [];
  for (const m of muren) {
    const kant = binnenKant(m, r.id);
    if (!kant || opties.open?.includes(kant)) continue;
    const plus = m.plus === r.id;
    const vlak = muurVlak(m, muren);
    let begin: number, einde: number;
    if (m.as === 's') {
      // Het binnenvlak van een schuine muur is de zijde van haar grondvlak aan de kant van de ruimte.
      const i = vlak.randen?.findIndex((x) => x === (plus ? 'plus' : 'min')) ?? -1;
      if (i < 0 || !vlak.punten) continue;
      const a = opAs(m, vlak.punten[i]!)[0], b = opAs(m, vlak.punten[(i + 1) % vlak.punten.length]!)[0];
      begin = Math.min(a, b);
      einde = Math.max(a, b);
    } else if (m.as === 'h') { begin = vlak.x; einde = vlak.x + vlak.b; }
    else { begin = vlak.y; einde = vlak.y + vlak.d; }
    const gaten = plan.openingen
      .filter((o) => niveauVan(o) === niveauVan(r) && onderbreektPlint(o, afw.hoogte) && muurVanOpening(o, [m]) === m)
      .map((o) => [o.midden - o.breedte / 2, o.midden + o.breedte / 2] as const)
      .sort((a, b) => a[0] - b[0]);
    const stukken: [number, number][] = [];
    let c = begin;
    for (const [a, b] of gaten) {
      if (a > c) stukken.push([c, Math.min(a, einde)]);
      c = Math.max(c, b);
    }
    if (einde > c) stukken.push([c, einde]);
    // Dwars op de muur: van het binnenvlak tot een plintdikte de ruimte in.
    const w0 = plus ? m.lijn + m.dikte / 2 : m.lijn - m.dikte / 2 - PLINT_DIKTE;
    stukken.forEach(([a, b], k) => {
      if (b - a < 0.5) return;
      const code = `plint_${r.id}_${m.id}_${k}`;
      const basis = { code: opties.code ? opties.code(code) : code, soort: afw.soort, vorm: 'blok' as const, kleur: afw.kleur, y: VLOER_BOVEN, h: afw.hoogte };
      if (m.as === 'h') uit.push({ ...basis, x: r2(a), z: r2(w0), b: r2(b - a), d: PLINT_DIKTE });
      else if (m.as === 'v') uit.push({ ...basis, x: r2(w0), z: r2(a), b: PLINT_DIKTE, d: r2(b - a) });
      else {
        const { n } = asVan(m);
        uit.push(...draaiBlokken([{ ...basis, x: r2(w0), z: r2(a), b: PLINT_DIKTE, d: r2(b - a) }], Math.atan2(n[1], n[0]) * GRAAD));
      }
    });
  }
  return uit;
}

/** Hoeveelheden van de binnenafwerking van één ruimte: m² plafond, lopende meter plint, m² accentmuur. */
export interface BinnenMaten {
  /** Netto vloeroppervlakte (m²), als de ruimte een plafond uit de catalogus heeft; anders 0. */
  plafond: number;
  /** Netto omtrek min de openingen tot op de vloer (m), als de ruimte een plint heeft; anders 0. */
  plint: number;
  /** De muren aan de kant van de accentmuur (m², netto, zonder de openingen); 0 zonder accentmuur. */
  accent: number;
}

/**
 * Hoeveelheden (zie `BinnenMaten`). De lengte van de accentmuur: bij een rechthoekige ruimte de netto binnenmaat van die
 * kant (zoals `ruimteMaten`), bij een vrije vorm de zijden van het binnenvlak aan die kant, bij een samengestelde ruimte de
 * muren aan die kant op de as min één muurdikte (een benadering, zoals haar netto oppervlakte).
 */
export function binnenMaten(plan: Plattegrond, cat: PlanCatalogus, r: Ruimte, muren: Muur[]): BinnenMaten {
  const leeg = { plafond: 0, plint: 0, accent: 0 };
  if (r.bestaand === true) return leeg;
  const m = ruimteMaten(plan, r, muren);
  const uit = { ...leeg };
  if (r.plafond && cat.plafonds?.[r.plafond]) uit.plafond = m.netto;
  const plint = plintAfwerking(cat, r);
  if (plint) {
    const deuren = openingenVanRuimte(plan, r, muren).filter((o) => onderbreektPlint(o, plint.hoogte)).reduce((t, o) => t + o.breedte, 0);
    uit.plint = r2(Math.max(0, m.omtrek - deuren / 100));
  }
  if (r.accent) {
    const kant = r.accent.kant;
    const eigen = muren.filter((x) => binnenKant(x, r.id) === kant);
    const delen = delenVan(r);
    let lengte: number;
    if (delen.length === 1 && !delen[0]!.omtrek) lengte = kant === 'boven' || kant === 'onder' ? m.nb : m.nd;
    else if (delen.length === 1) {
      // Vrije vorm: de zijden van het binnenvlak waarvan de buitenkant naar die kant kijkt.
      const v = binnenVorm(vormVanDeel(delen[0]!), muren);
      lengte = v.reduce((t, p, i) => {
        const q = v[(i + 1) % v.length]!, dx = q[0] - p[0], dy = q[1] - p[1];
        // Met de klok mee (y naar onder): de buitenkant van de zijde ligt links van de looprichting, (dy, −dx).
        const hoek = ((Math.atan2(dy, dx) * GRAAD) % 360 + 360) % 360;
        return RUIMTE_KANTEN[Math.round(hoek / 90) % 4] === kant ? t + Math.hypot(dx, dy) : t;
      }, 0);
    } else lengte = Math.max(0, eigen.reduce((t, x) => t + (x.tot - x.van), 0) - (eigen[0]?.dikte ?? 0));
    const open = plan.openingen.filter((o) => niveauVan(o) === niveauVan(r) && eigen.some((x) => muurVanOpening(o, [x]) === x)).reduce((t, o) => t + o.breedte * o.hoogte, 0);
    uit.accent = r2(Math.max(0, (lengte * plan.muurhoogte - open) / 10000));
  }
  return uit;
}

/** Waar een ruimte op haar verdieping ligt (de delen als rechthoek of vorm). */
function ligtIn(r: Ruimte, x: number, y: number): boolean {
  return delenVan(r).some((p) => {
    if (!p.omtrek) return x > p.x && x < p.x + p.b && y > p.y && y < p.y + p.d;
    const v = vormVanDeel(p);
    let binnen = false;
    for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
      const [xi, yi] = v[i]!, [xj, yj] = v[j]!;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) binnen = !binnen;
    }
    return binnen;
  });
}

/** Staat het meubel (met het midden van zijn voetafdruk) in deze ruimte? */
export function meubelIn(r: Ruimte, m: Meubel): boolean {
  if (niveauVan(m) !== niveauVan(r)) return false;
  const v = meubelVoetafdruk(m);
  return ligtIn(r, v.x + v.b / 2, v.y + v.d / 2);
}

/**
 * Het plafond van een ruimte in de 3D van binnen: de laag van het plafond (in zijn afwerking, `PLAFOND_DIKTE`, onder de
 * muurhoogte of lager bij een verlaagd plafond), met inbouwspots als het plafond ze heeft, en daarboven de vloerplaat of
 * het dak als een effen plaat (zo leest de snede als een snede). Per deel van de ruimte, op de as van de muren (het
 * plafond loopt tot in de muren: geen naad); aan een open kant tot de as. `gaten`: de trapgaten (een trap in de ruimte).
 * Zonder plafond in de ruimte: geschilderd wit, zoals de wanden van vroeger.
 */
export function plafondBlokken(plan: Plattegrond, cat: PlanCatalogus, r: Ruimte, opties: { open?: GevelKant[]; gaten?: Rechthoek[]; code?: (code: string) => string; dikte?: number } = {}): Blok[] {
  const keuze = r.plafond ? cat.plafonds?.[r.plafond] : undefined;
  const p = keuze ?? { label: '', soort: 'gevel' as BlokSoort, kleur: '#f2f1ec' };
  const H = plan.muurhoogte, onder = H - (p.verlaagd ?? 0) - PLAFOND_DIKTE;
  const dik = opties.dikte ?? plan.buitenmuur;
  const code = (c: string) => (opties.code ? opties.code(c) : c);
  const uit: Blok[] = [];
  const zonderGaten = (q: Rechthoek) => (opties.gaten ?? []).reduce<Rechthoek[]>((st, g) => st.flatMap((s) => trekAf(s, g)), [q]);
  for (const [i, deel] of delenVan(r).entries()) {
    if (deel.omtrek) {
      const v = vormVanDeel(deel);
      uit.push(grondPrisma(code(`plafond_${r.id}_${i}`), p.soort, p.kleur, v, onder, PLAFOND_DIKTE));
      uit.push(grondPrisma(code(`plafondplaat_${r.id}_${i}`), 'gevel', '#c9c6bf', v, H, VLOERDIKTE));
      continue;
    }
    // De plaat erboven rust op de muren: aan elke dichte kant een halve muurdikte breder.
    const uitzet = (k: GevelKant) => (opties.open?.includes(k) ? 0 : dik / 2);
    const plaat = { x: deel.x - uitzet('links'), y: deel.y - uitzet('boven'), b: deel.b + uitzet('links') + uitzet('rechts'), d: deel.d + uitzet('boven') + uitzet('onder') };
    zonderGaten(deel).forEach((s, k) => uit.push({ code: code(`plafond_${r.id}_${i}_${k}`), soort: p.soort, vorm: 'blok', x: s.x, y: r2(onder), z: s.y, b: s.b, h: PLAFOND_DIKTE, d: s.d, kleur: p.kleur }));
    zonderGaten(plaat).forEach((s, k) => uit.push({ code: code(`plafondplaat_${r.id}_${i}_${k}`), soort: 'gevel', vorm: 'blok', x: s.x, y: H, z: s.y, b: s.b, h: VLOERDIKTE, d: s.d, kleur: '#c9c6bf' }));
    if (p.spots) {
      // Inbouwspots: een raster van ± 1,2 m, minstens 50 cm van de muur; een ring die 3 mm onder het plafond uitsteekt.
      const nx = Math.max(1, Math.round((deel.b - 100) / 120) + 1), nz = Math.max(1, Math.round((deel.d - 100) / 120) + 1);
      for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
        const x = deel.x + (nx === 1 ? deel.b / 2 : 50 + ((deel.b - 100) * a) / (nx - 1)), z = deel.y + (nz === 1 ? deel.d / 2 : 50 + ((deel.d - 100) * b) / (nz - 1));
        if ((opties.gaten ?? []).some((g) => x > g.x - 10 && x < g.x + g.b + 10 && z > g.y - 10 && z < g.y + g.d + 10)) continue;
        uit.push({ code: code(`spot_${r.id}_${i}_${a}_${b}`), soort: 'metaal', vorm: 'cilinder', x: r2(x - 4.5), y: r2(onder - 0.3), z: r2(z - 4.5), b: 9, h: 0.6, d: 9, kleur: '#d9d8d3' });
        uit.push({ code: code(`spotlicht_${r.id}_${i}_${a}_${b}`), soort: 'kunststof', vorm: 'cilinder', x: r2(x - 2.5), y: r2(onder - 0.5), z: r2(z - 2.5), b: 5, h: 0.4, d: 5, kleur: '#fffbea' });
      }
    }
  }
  return uit;
}

/**
 * Draait blokken een aantal kwartslagen (90° per stap, met de klok mee gezien van boven) rond een punt op het plan. Een
 * balk exact (breedte en diepte wisselen, de zijden draaien mee, zoals `plaatsBlokken`), een grondvlak van een vrije vorm
 * via zijn punten (zoals `draaiBlokken`).
 */
export function draaiKwart(blokken: Blok[], kwart: number, rond: Punt): Blok[] {
  const k = ((kwart % 4) + 4) % 4;
  if (!k) return blokken;
  const graden = (k * 90) as 90 | 180 | 270;
  return blokken.map((b) => {
    if (b.vorm === 'prisma' && b.as === 'y' && b.doorsnede) {
      const [n] = draaiBlokken([b], graden, rond);
      return b.vlakRichting !== undefined ? { ...n!, vlakRichting: ((b.vlakRichting + graden) % 180) } : n!;
    }
    const [n] = plaatsBlokken([{ ...b, x: b.x - rond[0], z: b.z - rond[1] }], { x: rond[0], z: rond[1], draai: graden });
    return n!;
  });
}

