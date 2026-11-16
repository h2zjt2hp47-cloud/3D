/**
 * De 3D en de meetstaat van de loods (zie loods.ts): uit het resultaat van de motor een samenstelling van bouwdelen
 * (src/bouwdelen.ts), en daaruit de scène in twee weergaven en de meetstaat, zoals de bijgebouwen in hout.
 *
 * Het recept: een stalen portaal (twee kolommen en een spant, of één schuin spant bij een lessenaarsdak) op elke
 * portaalas, gordingen per travee op de spanten, wandregels per travee op de kolommen, gevelkolommen in de kopgevels
 * (twee naast elke poort, en ertussen zodat ze hoogstens 6 m uit elkaar staan), poortstijlen en een latei rond elke
 * opening in een zijgevel, windverbanden in rond staal in de eindvelden (dak en zijgevels). Daarop de bekleding:
 * wandvlakken van sandwichpaneel of plaat, betonpanelen onderaan, een topgevel, dakvlakken met lichtplaten of een
 * lichtstraat. Afwerking zonder meetstaat: poorten, loopdeur, omkasting, goten, afvoeren, nokkap, kantstukken,
 * hoekprofielen en de naden tussen de panelen.
 *
 * **Een voorstelling, geen berekening** (zie bovenaan loods.ts): niets is nagerekend; een staalbouwer rekent.
 *
 * Assen in cm: x = breedte (de overspanning), van links naar rechts gezien van voor; z = lengte, met de achtergevel op
 * z = 0 en de voorgevel op z = lengte; y = hoogte. De portalen staan op z = 0, afstand, 2 × afstand …; de kolommen hebben
 * hun buitenkant op x = 0 en x = breedte. De vloerplaat ligt op de grond (0 tot 15 cm); alles staat erop.
 *
 * Twee weergaven:
 *   afgewerkt    De bekleding, de poorten en de deur, met de afwerking. Het staal zit erachter en wordt niet getekend.
 *   constructie  Al het staal, en de bekleding alleen als staal achteraan: de achtergevel en de laatste travee (dak en
 *                zijgevels). Zonder poorten en deur. De buitenmaten zijn dezelfde (de vloerplaat en de nok bepalen ze).
 */
import {
  berekenConfiguratie, bouwdeelOpPlaats, dakvlak, kaderVan, prisma, profielDraaiing, profielKader, staalStuk, vloervlak, wandvlak,
  type Blok, type BlokSoort, type BouwWeergave, type ConfiguratieResultaat, type MeetstaatRegel, type Opbouw, type Scene3D,
  type Staalprofiel, type Waarde, type WandOpening,
} from '../src/index.js';
import { garagepoort } from './garagepoort.js';
import { poortBlokken } from './garagepoort3d.js';
import { BETONPANEEL, LOODS_KLEUREN, LOODS_VLOER, LOOPDEUR, PANEEL_BREEDTE, loodsBekleding, loodsBeton, loodsLichtplaat, loodsMaterialen as M, loodsVloer } from './loods.js';
import { RAL_KLEUREN } from './raam.js';
import { Samensteller, samenstellingBlokken, samenstellingMeetstaat, sceneVan, vlakDeel, type Draai, type Samenstelling } from './samenstelling.js';
import { koker, rond, staalprofiel, staalprofielen } from './staalprofielen.js';

/** Grootste afstand tussen twee gordingen, langs de helling (cm). Eigen keuze. */
export const GORDING_AFSTAND = 180;
/** Grootste afstand tussen twee wandregels (cm). Eigen keuze. */
export const REGEL_AFSTAND = 180;
/** Grootste afstand tussen twee gevelkolommen in een kopgevel (cm). Eigen keuze. */
export const GEVELKOLOM_AFSTAND = 600;
/** Oversteek van het dak over de gevel: aan de goot en aan de kopgevel (cm). Eigen keuze. */
const OVERSTEEK = { goot: 10, kop: 10 };
/** Zoveel steekt de vloerplaat buiten de bekleding (cm): ze bepaalt de buitenmaten in beide weergaven. */
export const VLOERRAND = 30;
/** Poortstijl en latei rond een opening in een zijgevel, stijl naast een loopdeur, windverband. Eigen keuze. */
const STIJL = koker(120, 120, 5), DEURSTIJL = koker(80, 80, 4), WINDVERBAND = rond(20);
const DONKER = '#262626';

const r2 = (x: number) => Math.round(x * 100) / 100 + 0;
const num = (v: unknown, standaard = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : standaard);
const tekst = (v: unknown, standaard: string) => (typeof v === 'string' && v ? v : standaard);
const waarden = (r: ConfiguratieResultaat): Record<string, Waarde> => Object.fromEntries(r.kenmerken.map((k) => [k.code, k.waarde]));
const dikteCm = (o: Opbouw) => o.lagen.reduce((som, l) => som + l.dikte, 0) / 10;
const profiel = (v: unknown, standaard: string): Staalprofiel => staalprofielen[tekst(v, standaard)] ?? staalprofiel(standaard);

/** Een donkerdere (f < 1) of lichtere tint van een kleur. */
function tint(hex: string, f: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const k = (i: number) => {
    const v = parseInt(m[1]!.slice(i, i + 2), 16);
    return Math.max(0, Math.min(255, Math.round(f <= 1 ? v * f : v + (255 - v) * (f - 1)))).toString(16).padStart(2, '0');
  };
  return `#${k(0)}${k(2)}${k(4)}`;
}
/** De kleur van een naad: donkerder op een lichte kleur, lichter op een donkere. */
function naadKleur(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return DONKER;
  const n = parseInt(m[1]!, 16), helder = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return helder > 0.4 ? tint(hex, 0.7) : tint(hex, 1.25);
}

type Gevel = 'voor' | 'achter' | 'links' | 'rechts';
/** Een opening in een gevel: `a0`, `a1` langs de gevel in de assen van de loods (x in een kopgevel, z in een zijgevel). */
export interface LoodsOpening {
  gevel: Gevel;
  wat: 'sectionaal' | 'roldeur' | 'loopdeur';
  /** Nummer van de poort (0 = de loopdeur). */
  nr: number;
  a0: number;
  a1: number;
  hoogte: number;
}

/**
 * Waar de poorten en de loopdeur komen. Zijgevel: in het midden van hun travee (geteld van voor); een poort en de deur in
 * dezelfde travee staan naast elkaar. Kopgevel: de loopdeur links (gezien van buiten) op 1 m van de hoek, de poorten
 * met gelijke tussenruimte over de rest van de breedte.
 */
export function loodsOpeningen(r: ConfiguratieResultaat): LoodsOpening[] {
  const k = waarden(r);
  const B = num(k.breedte, 1500), A = num(k.afstand, 600), n = Math.max(1, Math.round(num(k.traveeen, 5))), L = n * A;
  const gevel = (v: unknown): Gevel | null => (v === 'voor' || v === 'achter' || v === 'links' || v === 'rechts' ? v : null);
  const travee = (v: unknown) => Math.min(n, Math.max(1, Math.round(num(v, 1))));
  const poorten = [1, 2, 3].flatMap((nr) => {
    const g = gevel(k[`poort${nr}_gevel`]);
    if (!g) return [];
    return [{ nr, gevel: g, wat: k[`poort${nr}_soort`] === 'roldeur' ? 'roldeur' as const : 'sectionaal' as const, b: num(k[`poort${nr}_breedte`], 400), h: num(k[`poort${nr}_hoogte`], 400), t: travee(k[`poort${nr}_travee`]) }];
  });
  const deurGevel = gevel(k.loopdeur_gevel), deurTravee = travee(k.loopdeur_travee);
  const uit: LoodsOpening[] = [];
  const D = LOOPDEUR;
  for (const g of ['links', 'rechts'] as const) {
    for (let t = 1; t <= n; t++) {
      const hier = [
        ...poorten.filter((p) => p.gevel === g && p.t === t).map((p) => ({ wat: p.wat, nr: p.nr, b: p.b, h: p.h })),
        ...(deurGevel === g && deurTravee === t ? [{ wat: 'loopdeur' as const, nr: 0, b: D.breedte, h: D.hoogte }] : []),
      ];
      if (!hier.length) continue;
      const tussen = 40, totaal = hier.reduce((s, x) => s + x.b, 0) + tussen * (hier.length - 1), midden = L - (t - 0.5) * A;
      let a = midden - totaal / 2;
      for (const x of hier) {
        uit.push({ gevel: g, wat: x.wat, nr: x.nr, a0: r2(a), a1: r2(a + x.b), hoogte: x.h });
        a += x.b + tussen;
      }
    }
  }
  for (const g of ['voor', 'achter'] as const) {
    const ps = poorten.filter((p) => p.gevel === g), deur = deurGevel === g;
    // Gezien van buiten ligt links bij de voorgevel aan x = 0, bij de achtergevel aan x = breedte.
    const voor = g === 'voor';
    if (deur) uit.push({ gevel: g, wat: 'loopdeur', nr: 0, a0: voor ? D.rand : B - D.rand - D.breedte, a1: voor ? D.rand + D.breedte : B - D.rand, hoogte: D.hoogte });
    if (!ps.length) continue;
    const s0 = deur && voor ? D.rand + D.breedte : 0, s1 = deur && !voor ? B - D.rand - D.breedte : B;
    const tussen = (s1 - s0 - ps.reduce((s, p) => s + p.b, 0)) / (ps.length + 1);
    let a = voor ? s0 + tussen : s1 - tussen;
    for (const p of ps) {
      const [a0, a1] = voor ? [a, a + p.b] : [a - p.b, a];
      uit.push({ gevel: g, wat: p.wat, nr: p.nr, a0: r2(a0), a1: r2(a1), hoogte: p.h });
      a = voor ? a1 + tussen : a0 - tussen;
    }
  }
  return uit;
}

/** Stukken van [a, b] zonder de stukken in `weg`, elk minstens `min` lang. */
function zonder(a: number, b: number, weg: [number, number][], min = 20): [number, number][] {
  let stukken: [number, number][] = [[a, b]];
  for (const [w0, w1] of weg) stukken = stukken.flatMap(([s0, s1]) => (w1 <= s0 || w0 >= s1 ? [[s0, s1]] : [[s0, Math.min(s1, w0)], [Math.max(s0, w1), s1]] as [number, number][]));
  return stukken.filter(([s0, s1]) => s1 - s0 >= min);
}

/** Plaatsen op gelijke afstand van `van` tot `tot`, met tussenruimtes van hoogstens `max` (minstens twee plaatsen). */
function verdeel(van: number, tot: number, max: number): number[] {
  const n = Math.max(1, Math.ceil((tot - van) / max - 1e-6));
  return Array.from({ length: n + 1 }, (_, i) => van + ((tot - van) * i) / n);
}

function bouwLoods(r: ConfiguratieResultaat): Samenstelling {
  const S = new Samensteller();
  const k = waarden(r), a = r.afgeleid;
  const B = Math.max(300, num(k.breedte, 1500)), A = Math.max(200, num(k.afstand, 600)), n = Math.max(1, Math.round(num(k.traveeen, 5))), L = n * A;
  const zh = Math.max(150, num(k.zijhoogte, 450)), zadel = k.dakvorm !== 'lessenaar';
  const graden = num(a.graden, 10), tan = num(a.tan, Math.tan((graden * Math.PI) / 180)), cos = num(a.cos, Math.cos((graden * Math.PI) / 180));
  const staal = `staal_${tekst(k.staal, 'verzinkt')}`;
  const kolom = profiel(a.kolom_profiel, 'HEA 240'), spant = profiel(a.spant_profiel, 'IPE 300'), gording = profiel(a.gording_profiel, 'Z 200 × 2');
  const regel = profiel(a.wandregel_profiel, 'Z 150 × 2'), gevelkolom = profiel(a.gevelkolom_profiel, 'HEA 160');
  const hk = kolom.hoogte / 10, bk = kolom.breedte / 10, hs = spant.hoogte / 10, bs = spant.breedte / 10;
  const gH = gording.hoogte / 10, gW = profielKader(gording).breedte / 10;
  const rH = regel.hoogte / 10, rW = profielKader(regel).breedte / 10;
  const gkx = gevelkolom.breedte / 10, gkz = gevelkolom.hoogte / 10, st = STIJL.breedte / 10, ds = DEURSTIJL.breedte / 10;
  const wandKleur = tekst(k.wand_kleur, 'ral9002'), dakKleur = tekst(k.dak_kleur, 'ral9002');
  const kleurVan = (code: string) => LOODS_KLEUREN.find((x) => x.code === code)?.kleur ?? '#cccccc';
  const dak = loodsBekleding('dak', tekst(k.dak_bekleding, 's60'), dakKleur), td = dikteCm(dak);
  const wandBekleding = tekst(k.wand_bekleding, 's60'), wand = loodsBekleding('wand', wandBekleding, wandKleur), tw = dikteCm(wand);
  const beton = Math.max(0, Math.min(num(a.beton_h), zh - 50)), tb = BETONPANEEL.dikte / 10;
  const y0 = LOODS_VLOER, constructie = { alleen: 'constructie' as BouwWeergave };
  const ops = loodsOpeningen(r);

  // De eindportalen zijn zo diep als het diepste van kolom, gevelkolom en spant; de wandregels en de bekleding van de
  // kopgevels liggen daarbuiten, die van de zijgevels buiten de kolommen.
  const dk = Math.max(bk, gkz, bs) / 2;
  const X0 = -rH - tw, X1 = B + rH + tw, Z0 = -dk - rH - tw, Z1 = L + dk + rH + tw;
  /** Onderkant van het spant (ys), onderkant van het dak (yo) en bovenkant van het dak (yt) boven x. */
  const ys = (x: number) => y0 + zh + tan * (zadel ? Math.min(x, B - x) : B - x);
  const yo = (x: number) => ys(x) + (hs + gH) / cos;
  const yt = (x: number) => yo(x) + td / cos;
  /** Wat achteraan ligt (tot de eerste portaalas na de achtergevel), toont de constructieweergave als staal van de bekleding. */
  const inStaal = (z1: number) => z1 <= A + 0.01;
  const detail = (b: Blok) => (inStaal(b.z + b.d) ? S.vast : S.afwerking).push(b);
  /** Een los detail langs z van z0 tot z1, gesplitst op de grens van het staal. */
  const langsZ = (code: string, z0: number, z1: number, maak: (code: string, z0: number, z1: number) => Blok) => {
    if (z0 < A && z1 > A) { detail(maak(`${code}.1`, z0, A)); detail(maak(`${code}.2`, A, z1)); } else detail(maak(code, z0, z1));
  };

  // ----- vloerplaat -----
  S.zet('vloer', vloervlak({ lengte: X1 - X0 + 2 * VLOERRAND, breedte: Z1 - Z0 + 2 * VLOERRAND, opbouw: loodsVloer, richting: 'x' }, M), X0 - VLOERRAND, 0, Z0 - VLOERRAND);

  // ----- portalen -----
  for (let i = 0; i <= n; i++) {
    const z = i * A;
    S.zet('kolom', staalStuk({ profiel: kolom, materiaal: staal, lengte: zadel ? zh : zh + B * tan, as: 'y', kop: zadel ? graden : -graden, rol: 'kolom' }, M), 0, y0, z - bk / 2, 0, constructie);
    S.zet('kolom', staalStuk({ profiel: kolom, materiaal: staal, lengte: zh + hk * tan, as: 'y', kop: -graden, rol: 'kolom' }, M), B - hk, y0, z - bk / 2, 0, constructie);
    if (zadel) {
      const s = staalStuk({ profiel: spant, materiaal: staal, lengte: B / 2 / cos, as: 'x', helling: graden, einden: 'lood', rol: 'spant' }, M);
      S.zet('spant', s, 0, y0 + zh, z - bs / 2, 0, constructie);
      S.zet('spant', s, B / 2, y0 + zh, z - bs / 2, 180, constructie);
    } else {
      S.zet('spant', staalStuk({ profiel: spant, materiaal: staal, lengte: B / cos, as: 'x', helling: graden, einden: 'lood', rol: 'spant' }, M), 0, y0 + zh, z - bs / 2, 180, constructie);
    }
  }

  // ----- gordingen: per travee, op de spanten, met de helling mee gedraaid -----
  const travee: [number, number][] = Array.from({ length: n }, (_, i) => [i === 0 ? -dk : i * A, i === n - 1 ? L + dk : (i + 1) * A]);
  /** Gordingen op een dakvlak van xa tot xb; `stijgend` = het dak stijgt naar +x. */
  const gordingen = (xa: number, xb: number, stijgend: boolean) => {
    const draai = stijgend ? graden : -graden, rot = profielDraaiing(gording, draai), breed = gW * cos;
    for (const xl of verdeel(xa + 2, xb - 3 - breed, GORDING_AFSTAND * cos)) {
      // De hoek (0, 0) van het profiel ligt op de bovenkant van het spant, aan de kant met de kleinste x.
      const px = xl, py = ys(xl) + hs / cos;
      for (const [za, zb] of travee) {
        S.zet('gording', staalStuk({ profiel: gording, materiaal: staal, lengte: zb - za, as: 'z', draai, rol: 'gording' }, M), px - rot.oorsprong[0], py - rot.oorsprong[1], za, 0, constructie);
      }
    }
  };
  if (zadel) { gordingen(0, B / 2, true); gordingen(B / 2, B, false); } else gordingen(0, B, false);

  // ----- zijgevels: wandregels, poortstijlen en lateien -----
  const betonTop = y0 + beton, regelOnder = betonTop + (beton > 0 ? 5 : 15);
  /** Een stijl en een latei rond een opening; `x0` = de kant van de stijl die het dichtst bij de buitenkant ligt. */
  for (const [g, xIn, uitwaarts] of [['links', 0, -1], ['rechts', B, 1]] as const) {
    const hier = ops.filter((o) => o.gevel === g);
    const top = ys(g === 'links' ? 0 : B) - 10;
    const draai = g === 'links' ? 90 : 270;
    for (const y of verdeel(regelOnder, top - rW, REGEL_AFSTAND)) {
      for (const [za, zb] of travee.map(([p, q], i): [number, number] => [i === 0 ? -dk - rH : p, i === n - 1 ? L + dk + rH : q])) {
        const weg = hier.filter((o) => y < y0 + o.hoogte + 5).map((o): [number, number] => [o.a0 - (o.wat === 'loopdeur' ? ds : st), o.a1 + (o.wat === 'loopdeur' ? ds : st)]);
        for (const [s0, s1] of zonder(za, zb, weg)) {
          S.zet('wandregel', staalStuk({ profiel: regel, materiaal: staal, lengte: s1 - s0, as: 'z', draai, rol: 'wandregel' }, M), uitwaarts < 0 ? -rH : B, y, s0, 0, constructie);
        }
      }
    }
    for (const o of hier) {
      const p = o.wat === 'loopdeur' ? DEURSTIJL : STIJL, w = p.breedte / 10, x = uitwaarts < 0 ? xIn - w : xIn;
      for (const z of [o.a0 - w, o.a1]) S.zet('stijl', staalStuk({ profiel: p, materiaal: staal, lengte: o.hoogte, as: 'y', rol: 'kader' }, M), x, y0, z, 0, constructie);
      S.zet('latei', staalStuk({ profiel: p, materiaal: staal, lengte: o.a1 - o.a0 + 2 * w, as: 'z', rol: 'latei' }, M), x, y0 + o.hoogte, o.a0 - w, 0, constructie);
    }
  }

  // ----- kopgevels: gevelkolommen, lateien, wandregels -----
  for (const [g, zg] of [['achter', 0], ['voor', L]] as const) {
    const hier = ops.filter((o) => o.gevel === g), poorten = hier.filter((o) => o.wat !== 'loopdeur'), deuren = hier.filter((o) => o.wat === 'loopdeur');
    // De staande stukken langs de gevel: de kolommen van het eindportaal, een gevelkolom naast elke poort, en ertussen
    // zoveel gevelkolommen dat ze hoogstens 6 m uit elkaar staan (niet in een poort, niet voor de loopdeur).
    const leden: { x: number; gevel: boolean; poort?: boolean }[] = [{ x: hk / 2, gevel: false }, { x: B - hk / 2, gevel: false }];
    for (const o of poorten) leden.push({ x: o.a0 - gkx / 2 - 2, gevel: true, poort: true }, { x: o.a1 + gkx / 2 + 2, gevel: true, poort: true });
    leden.sort((p, q) => p.x - q.x);
    const inPoort = (x: number) => poorten.some((o) => x > o.a0 - gkx && x < o.a1 + gkx);
    const extra: number[] = [];
    for (let i = 0; i < leden.length - 1; i++) {
      const p = leden[i]!, q = leden[i + 1]!;
      if (inPoort((p.x + q.x) / 2) || q.x - p.x <= GEVELKOLOM_AFSTAND) continue;
      for (let x of verdeel(p.x, q.x, GEVELKOLOM_AFSTAND).slice(1, -1)) {
        for (const d of deuren) if (x > d.a0 - ds - gkx && x < d.a1 + ds + gkx) x = x < (d.a0 + d.a1) / 2 ? d.a0 - ds - gkx : d.a1 + ds + gkx;
        extra.push(x);
      }
    }
    for (const x of extra) leden.push({ x, gevel: true });
    leden.sort((p, q) => p.x - q.x);
    for (const l of leden.filter((x) => x.gevel)) {
      const x0 = l.x - gkx / 2, x1 = l.x + gkx / 2;
      const nok = zadel && x0 < B / 2 && x1 > B / 2;
      const kop = nok ? 0 : zadel ? (l.x < B / 2 ? graden : -graden) : -graden;
      const lengte = (nok ? Math.min(ys(x0), ys(x1)) : ys(x0)) - y0;
      S.zet('gevelkolom', staalStuk({ profiel: gevelkolom, materiaal: staal, lengte, as: 'y', draai: 90, kop, rol: 'kolom' }, M), x0, y0, zg - gkz / 2, 0, constructie);
    }
    for (const o of poorten) S.zet('latei', staalStuk({ profiel: STIJL, materiaal: staal, lengte: o.a1 - o.a0 + 4, as: 'x', rol: 'latei' }, M), o.a0 - 2, y0 + o.hoogte, zg - st / 2, 0, constructie);
    const zRegel = g === 'achter' ? -dk - rH : L + dk;
    for (const d of deuren) {
      for (const x of [d.a0 - ds, d.a1]) S.zet('stijl', staalStuk({ profiel: DEURSTIJL, materiaal: staal, lengte: d.hoogte, as: 'y', rol: 'kader' }, M), x, y0, g === 'achter' ? -dk - ds : L + dk, 0, constructie);
      S.zet('latei', staalStuk({ profiel: DEURSTIJL, materiaal: staal, lengte: d.a1 - d.a0 + 2 * ds, as: 'x', rol: 'latei' }, M), d.a0 - ds, y0 + d.hoogte, g === 'achter' ? -dk - ds : L + dk, 0, constructie);
    }
    // Wandregels tot onder het dak, in stukken van gevelkolom tot gevelkolom, onderbroken bij een poort of de deur.
    const hoogste = (zadel ? ys(B / 2) : ys(0)) - rW - 15;
    const grenzen = leden.map((l) => l.x);
    for (const y of verdeel(regelOnder, hoogste, REGEL_AFSTAND)) {
      const vrij = (y + rW + 3 - y0 - zh) / tan;
      const [xl, xr] = zadel ? [Math.max(0, vrij), Math.min(B, B - vrij)] : [0, Math.min(B, B - vrij)];
      if (xr - xl < 20) continue;
      const weg = hier.filter((o) => y < y0 + o.hoogte + 5).map((o): [number, number] => (o.wat === 'loopdeur' ? [o.a0 - ds, o.a1 + ds] : [o.a0 - 2, o.a1 + 2]));
      for (let i = 0; i < grenzen.length - 1; i++) {
        const a0 = Math.max(xl, i === 0 ? 0 : grenzen[i]!), a1 = Math.min(xr, i === grenzen.length - 2 ? B : grenzen[i + 1]!);
        for (const [s0, s1] of zonder(a0, a1, weg)) {
          S.zet('wandregel', staalStuk({ profiel: regel, materiaal: staal, lengte: s1 - s0, as: 'x', draai: g === 'achter' ? 90 : 270, rol: 'wandregel' }, M), s0, y, zRegel, 0, constructie);
        }
      }
    }
  }

  // ----- windverbanden in rond staal, in de eindvelden -----
  /** Twee kruisende staven tussen (a0, b0) en (a1, b1), in een vlak dat `punt` beschrijft. */
  const kruis = (p: (u: number, v: number) => [number, number, number], u0: number, u1: number, v0: number, v1: number) => {
    S.staaf('windverband', WINDVERBAND, staal, M, p(u0, v0), p(u1, v1), 'windverband', constructie);
    S.staaf('windverband', WINDVERBAND, staal, M, p(u0, v1), p(u1, v0), 'windverband', constructie);
  };
  const eindvelden = n >= 2 ? [0, n - 1] : [0];
  for (const i of eindvelden) {
    const za = i * A, zb = (i + 1) * A;
    const vlakken: [number, number][] = zadel ? [[hk / 2, B / 2 - 6], [B / 2 + 6, B - hk / 2]] : [[hk / 2, B - hk / 2]];
    for (const [xa, xb] of vlakken) {
      const m = Math.max(1, Math.round((xb - xa) / cos / A));
      for (let s = 0; s < m; s++) {
        const x1 = xa + ((xb - xa) * s) / m, x2 = xa + ((xb - xa) * (s + 1)) / m;
        kruis((x, z) => [x, ys(x) + hs / cos / 2, z], x1, x2, za + 2, zb - 2);
      }
    }
  }
  // In de zijgevels: in het eerste vrije veld aan elk einde (zonder poort of deur).
  for (const [g, x] of [['links', hk / 2], ['rechts', B - hk / 2]] as const) {
    const bezet = (i: number) => ops.some((o) => o.gevel === g && o.a1 > i * A && o.a0 < (i + 1) * A);
    const velden = new Set<number>();
    for (const reeks of [[0, 1], [n - 1, n - 2]]) { const v = reeks.find((i) => i >= 0 && i < n && !bezet(i)); if (v !== undefined) velden.add(v); }
    const ya = y0 + 30, yb = ys(g === 'links' ? 0 : B) - 25, m = Math.max(1, Math.round((yb - ya) / A));
    for (const i of velden) for (let s = 0; s < m; s++) kruis((z, y) => [x, y, z], i * A + bk / 2 + 2, (i + 1) * A - bk / 2 - 2, ya + ((yb - ya) * s) / m, ya + ((yb - ya) * (s + 1)) / m);
  }

  // ----- bekleding: zijgevels -----
  /**
   * De opening in één stuk wand (van `onder` tot `onder + hoogte`). In de betonpanelen loopt een hogere poort over de hele
   * hoogte door (`bovenaan` = er komt nog wand boven); in de bovenste wand houdt een opening die tot boven de wand reikt
   * (een te hoge poort: het model meldt het) 2 cm wand boven zich: precies tot de rand gaf een strook van 0 cm hoog.
   */
  const deurOpening = (o: LoodsOpening, za: number, zb: number, onder: number, hoogte: number, u: (z: number) => number, bovenaan = true): WandOpening[] => {
    const a0 = Math.max(o.a0, za), a1 = Math.min(o.a1, zb), h = Math.min(bovenaan ? hoogte - 2 : hoogte, y0 + o.hoogte - onder);
    if (a1 - a0 < 1 || h < 1 || y0 + o.hoogte <= onder) return [];
    const [u0, u1] = [u(a0), u(a1)].sort((p, q) => p - q) as [number, number];
    return [{ soort: 'deur', x: r2(u0), breedte: r2(u1 - u0), hoogte: r2(h) }];
  };
  const stukken: [number, number, BouwWeergave | undefined][] = [[Z0, A, undefined], [A, Z1, 'afgewerkt']];
  for (const g of ['links', 'rechts'] as const) {
    const hier = ops.filter((o) => o.gevel === g), xb = g === 'links' ? X0 : X1, draai: Draai = g === 'links' ? 270 : 90;
    const hoog = yo(xb) - betonTop;
    for (const [za, zb, alleen] of stukken) {
      const u = (z: number) => (g === 'links' ? zb - z : z - za);
      const extra = alleen ? { alleen } : {};
      if (beton > 0) {
        const o = hier.flatMap((x) => deurOpening(x, za, zb, y0, beton, u, false));
        S.zet(`beton.${g}`, wandvlak({ lengte: zb - za, hoogte: beton, opbouw: loodsBeton, openingen: o }, M), g === 'links' ? X0 : X1 - tb, y0, za, draai, extra);
      }
      const o = hier.flatMap((x) => deurOpening(x, za, zb, betonTop, hoog, u));
      S.zet(`wand.${g}`, wandvlak({ lengte: zb - za, hoogte: hoog, opbouw: wand, openingen: o }, M), g === 'links' ? X0 : B + rH, betonTop, za, draai, extra);
    }
  }

  // ----- bekleding: kopgevels (een rechthoek, met daarboven de topgevel) -----
  const xa = -rH, xe = B + rH, yR = Math.min(yo(xa), yo(xe));
  for (const [g, zMin, alleen] of [['achter', Z0, undefined], ['voor', Z1 - tw, 'afgewerkt']] as const) {
    const hier = ops.filter((o) => o.gevel === g), draai: Draai = g === 'achter' ? 0 : 180, extra = alleen ? { alleen } : {};
    if (beton > 0) {
      // Tussen de betonpanelen van de zijgevels.
      const b0 = X0 + tb, b1 = X1 - tb, u = (x: number) => (g === 'achter' ? x - b0 : b1 - x);
      const o = hier.flatMap((x) => deurOpening(x, b0, b1, y0, beton, u, false));
      S.zet(`beton.${g}`, wandvlak({ lengte: b1 - b0, hoogte: beton, opbouw: loodsBeton, openingen: o }, M), b0, y0, g === 'achter' ? Z0 : Z1 - tb, draai, extra);
    }
    const u = (x: number) => (g === 'achter' ? x - xa : xe - x);
    const o = hier.flatMap((x) => deurOpening(x, xa, xe, betonTop, yR - betonTop, u));
    S.zet(`wand.${g}`, wandvlak({ lengte: xe - xa, hoogte: yR - betonTop, opbouw: wand, openingen: o }, M), xa, betonTop, zMin, draai, extra);
    const punten: [number, number][] = zadel ? [[xa, yR], [xe, yR], [B / 2, yo(B / 2)]] : [[xa, yR], [xe, yR], [xa, yo(xa)]];
    const m2 = Math.abs((punten[1]![0] - punten[0]![0]) * (punten[2]![1] - punten[0]![1])) / 2 / 10000;
    const mat = M[wand.lagen[0]!.materiaal]!;
    S.zet(`topgevel.${g}`, vlakDeel('Topgevel', wand.lagen[0]!.materiaal, M, wand.lagen[0]!.dikte, m2), 0, 0, 0, 0, { ...extra, blokken: [prisma('topgevel', mat.soort, mat.kleur, 'z', zMin, zMin + tw, punten)] });
  }

  // ----- bekleding: dak, met lichtplaten of een lichtstraat -----
  const ov = OVERSTEEK.goot, Zr0 = Z0 - OVERSTEEK.kop, Zr1 = Z1 + OVERSTEEK.kop;
  const vlakken: { voet: number; nok: number; draai: Draai }[] = zadel
    ? [{ voet: X0 - ov, nok: B / 2, draai: 270 }, { voet: X1 + ov, nok: B / 2, draai: 90 }]
    : [{ voet: X1 + ov, nok: X0 - ov, draai: 90 }];
  const licht = tekst(k.daklicht, 'geen'), lichtplaat = loodsLichtplaat(td * 10);
  for (const v of vlakken) {
    const D = Math.abs(v.nok - v.voet), yVoet = yo(v.voet);
    // De lichte stukken in (u, v): u langs z, v horizontaal van de dakvoet naar de nok.
    const lichten: [number, number, number, number][] = [];
    if (licht === 'lichtstraat') {
      const breed = 150 * cos, [v0, v1] = zadel ? [D - 30 - breed, D - 30] : [D / 2 - breed / 2, D / 2 + breed / 2];
      const [u0, u1] = n >= 3 ? [A + 60, L - A - 60] : [A / 2, L - A / 2];
      if (u1 - u0 > 50) lichten.push([u0, u1, v0, v1]);
    } else if (licht === 'lichtplaten') {
      for (let i = 0; i < n; i++) lichten.push([i * A + A / 2 - PANEEL_BREEDTE / 2, i * A + A / 2 + PANEEL_BREEDTE / 2, 0.2 * D, 0.85 * D]);
    }
    const vGrenzen = [...new Set([0, D, ...lichten.flatMap((q) => [q[2], q[3]])])].sort((p, q) => p - q);
    for (let j = 0; j < vGrenzen.length - 1; j++) {
      const va = vGrenzen[j]!, vb = vGrenzen[j + 1]!;
      const hier = lichten.filter((q) => q[2] < vb - 0.01 && q[3] > va + 0.01);
      const uGrenzen = [...new Set([Zr0, Zr1, A, ...hier.flatMap((q) => [q[0], q[1]])])].sort((p, q) => p - q);
      // Aaneengesloten panelen samen, behalve op de grens van het staal.
      const cellen: { u0: number; u1: number; licht: boolean }[] = [];
      for (let i = 0; i < uGrenzen.length - 1; i++) {
        const u0 = uGrenzen[i]!, u1 = uGrenzen[i + 1]!, l = hier.some((q) => q[0] <= u0 + 0.01 && q[1] >= u1 - 0.01);
        const vorige = cellen[cellen.length - 1];
        if (vorige && !vorige.licht && !l && Math.abs(u0 - A) > 0.01) vorige.u1 = u1;
        else cellen.push({ u0, u1, licht: l });
      }
      for (const c of cellen) {
        const deel = dakvlak({ lengte: c.u1 - c.u0, diepte: vb - va, helling: graden, opbouw: c.licht ? lichtplaat : dak }, M);
        const x = v.draai === 270 ? v.voet + va : v.voet - vb;
        S.zet(c.licht ? 'lichtplaat' : 'dak', deel, x, yVoet + va * tan, c.u0, v.draai, inStaal(c.u1) ? {} : { alleen: 'afgewerkt' });
      }
    }
  }

  // ----- afwerking van het dak: goot, afvoer, nokkap, dakrand, kantstukken -----
  const dakTint = kleurVan(dakKleur), wandTint = kleurVan(wandKleur), rand = tint(wandTint, 0.92);
  const goten = zadel ? [X0 - ov, X1 + ov] : [X1 + ov];
  for (const x of goten) {
    const links = x < B / 2, yg = yo(x);
    langsZ(`goot.${links ? 'links' : 'rechts'}`, Zr0, Zr1, (c, z0, z1) => ({ code: c, soort: 'lak_mat', vorm: 'blok', kleur: dakTint, x: r2(links ? x - 14 : x - 1), y: r2(yg - 13), z: r2(z0), b: 15, h: 14, d: r2(z1 - z0) }));
    for (const z of [Z0 + 18, Z1 - 18]) {
      detail({ code: `afvoer.${links ? 'links' : 'rechts'}.${z < A ? 'achter' : 'voor'}`, soort: 'lak_mat', vorm: 'cilinder', kleur: dakTint, x: r2(links ? x - 12 : x + 2), y: r2(y0), z: r2(z - 5), b: 10, h: r2(yg - 13 - y0), d: 10 });
    }
  }
  if (zadel) {
    const m = B / 2, w = 22;
    langsZ('nokkap', Zr0, Zr1, (c, z0, z1) => prisma(c, 'lak_mat', dakTint, 'z', z0, z1, [[m - w, yt(m - w) - 1], [m + w, yt(m + w) - 1], [m + w, yt(m + w) + 0.8], [m, yt(m) + 4], [m - w, yt(m - w) + 0.8]]));
  } else {
    const x = X0 - ov;
    langsZ('dakrand', Zr0, Zr1, (c, z0, z1) => ({ code: c, soort: 'lak_mat', vorm: 'blok', kleur: dakTint, x: r2(x - 1.5), y: r2(yo(x) - 6), z: r2(z0), b: 1.5, h: r2(yt(x) + 3 - yo(x) + 6), d: r2(z1 - z0) }));
  }
  for (const v of vlakken) {
    const [p, q] = [v.voet, v.nok];
    for (const [kant, z0] of [['achter', Zr0 - 1.2], ['voor', Zr1]] as const) {
      detail(prisma(`kantstuk.${kant}.${v.draai}`, 'lak_mat', dakTint, 'z', z0, z0 + 1.2, [[p, yo(p) - 6], [q, yo(q) - 6], [q, yt(q) + 2], [p, yt(p) + 2]]));
    }
  }

  // ----- afwerking van de wanden: hoekprofielen en naden -----
  for (const [x, zx] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]] as const) {
    const sx = x < B / 2 ? -1 : 1, sz = zx < L / 2 ? -1 : 1, top = yo(x) - 1, h = top - betonTop;
    const xBuiten = sx < 0 ? x - 1 : x, zBuiten = sz < 0 ? zx - 1 : zx;
    detail({ code: `hoek.${sx < 0 ? 'links' : 'rechts'}.${sz < 0 ? 'achter' : 'voor'}.a`, soort: 'lak_mat', vorm: 'blok', kleur: rand, x: r2(sx < 0 ? x - 1 : x - 10), y: r2(betonTop), z: r2(zBuiten), b: 11, h: r2(h), d: 1 });
    detail({ code: `hoek.${sx < 0 ? 'links' : 'rechts'}.${sz < 0 ? 'achter' : 'voor'}.b`, soort: 'lak_mat', vorm: 'blok', kleur: rand, x: r2(xBuiten), y: r2(betonTop), z: r2(sz < 0 ? zx : zx - 10), b: 1, h: r2(h), d: 10 });
  }
  /** Naden: dunne lijnen op het buitenvlak, onderbroken bij een opening. `vlak` zet een stuk langs de gevel om in een blok. */
  const naden = (code: string, kleur: string, hoogtes: number[], stuk: (y: number) => [number, number] | null, gaten: LoodsOpening[], vlak: (code: string, a0: number, a1: number, y: number) => Blok) => {
    let i = 0;
    for (const y of hoogtes) {
      const bereik = stuk(y);
      if (!bereik) continue;
      const weg = gaten.filter((o) => y < y0 + o.hoogte + 1).map((o): [number, number] => [o.a0 - 1, o.a1 + 1]);
      for (const [a0, a1] of zonder(bereik[0], bereik[1], weg, 5)) {
        for (const [p, q] of a0 < A && a1 > A && code.includes('zij') ? [[a0, A], [A, a1]] as [number, number][] : [[a0, a1] as [number, number]]) {
          detail({ ...vlak(`${code}.${++i}`, p, q, y), kleur });
        }
      }
    }
  };
  const lijn = (code: string, soort: BlokSoort, x: number, y: number, z: number, b: number, h: number, d: number): Blok => ({ code, soort, vorm: 'blok', kleur: DONKER, x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d) });
  const dik = 0.6, uit = 0.15;
  if (wandBekleding !== 'plaat') {
    const nk = naadKleur(wandTint);
    for (const g of ['links', 'rechts'] as const) {
      const x = g === 'links' ? X0 - uit : X1 - 0.1, top = yo(g === 'links' ? X0 : X1);
      const hoogtes = verdeel(betonTop, top, PANEEL_BREEDTE).slice(1, -1);
      naden(`naad.zij.${g}`, nk, hoogtes, () => [Z0 + 1, Z1 - 1], ops.filter((o) => o.gevel === g), (c, a0, a1, y) => lijn(c, 'donker', x, y - dik / 2, a0, uit + 0.1, dik, a1 - a0));
    }
    for (const g of ['achter', 'voor'] as const) {
      const z = g === 'achter' ? Z0 - uit : Z1 - 0.1;
      const hoogtes: number[] = [];
      for (let y = betonTop + PANEEL_BREEDTE; y < (zadel ? yo(B / 2) : yo(xa)) - 5; y += PANEEL_BREEDTE) hoogtes.push(y);
      const breedte = (y: number): [number, number] | null => {
        if (y <= yR) return [xa + 1, xe - 1];
        const d = (y - yR) / tan + 3;
        return zadel ? (xe - xa - 2 * d > 10 ? [xa + d, xe - d] : null) : (xe - xa - d > 10 ? [xa + 1, xe - d] : null);
      };
      naden(`naad.kop.${g}`, nk, hoogtes, breedte, ops.filter((o) => o.gevel === g), (c, a0, a1, y) => lijn(c, 'donker', a0, y - dik / 2, z, a1 - a0, dik, uit + 0.1));
    }
  }
  if (beton > 0) {
    const nb = '#8c887f', hoogtes = verdeel(y0, betonTop, BETONPANEEL.hoogte).slice(1, -1);
    for (const g of ['links', 'rechts'] as const) {
      const x = g === 'links' ? X0 - uit : X1 - 0.1;
      // Alleen liggende naden: een staande naad die voor de wand uitsteekt, vangt de zon op haar kant (een witte streep).
      naden(`betonnaad.zij.${g}`, nb, hoogtes, () => [Z0 + 1, Z1 - 1], ops.filter((o) => o.gevel === g), (c, a0, a1, y) => lijn(c, 'donker', x, y - dik / 2, a0, uit + 0.1, dik, a1 - a0));
    }
    for (const g of ['achter', 'voor'] as const) {
      const z = g === 'achter' ? Z0 - uit : Z1 - 0.1;
      naden(`betonnaad.kop.${g}`, nb, hoogtes, () => [X0 + 1, X1 - 1], ops.filter((o) => o.gevel === g), (c, a0, a1, y) => lijn(c, 'donker', a0, y - dik / 2, z, a1 - a0, dik, uit + 0.1));
    }
  }

  // ----- poorten, loopdeur en hun omkasting -----
  const poortKleur = RAL_KLEUREN.find((x) => x.code === k.poort_kleur) ?? RAL_KLEUREN.find((x) => x.code === 'antraciet')!;
  const deurKleur = tekst(a.deur_kleur_hex, '#3d4347');
  for (const o of ops) {
    const kleur = o.wat === 'loopdeur' ? deurKleur : poortKleur.hex;
    const b = o.a1 - o.a0, h = o.hoogte, code = o.wat === 'loopdeur' ? `deur.${o.gevel}` : `poort${o.nr}`;
    let lokaal: Blok[];
    if (o.wat === 'sectionaal') {
      const res = berekenConfiguratie(garagepoort, { breedte: Math.round(b * 10), hoogte: Math.round(h * 10), belijning: 'lijnen', vensters: k.poort_vensters === true, kleur: poortKleur.code }, {});
      lokaal = poortBlokken(res).blokken;
    } else if (o.wat === 'roldeur') lokaal = roldeurBlokken(b, h, kleur);
    else lokaal = loopdeurBlokken(b, h, kleur);
    const kd = kaderVan(lokaal), maten = { b: kd.x + kd.b - Math.min(0, kd.x), h: kd.h, d: kd.z + kd.d - Math.min(0, kd.z) };
    const verschoven = lokaal.map((x) => ({ ...x, code: `${code}.${x.code}`, x: r2(x.x - Math.min(0, kd.x)), z: r2(x.z - Math.min(0, kd.z)) }));
    // In het vlak van de binnenkant van de wandregels (de buitenkant van de kolommen), achter de omkasting.
    const plaats = o.gevel === 'links' ? { x: 0, z: o.a0, draai: 270 as const } : o.gevel === 'rechts' ? { x: B - maten.d, z: o.a0, draai: 90 as const }
      : o.gevel === 'achter' ? { x: o.a0, z: -dk, draai: 0 as const } : { x: o.a0, z: L + dk - maten.d, draai: 180 as const };
    S.afwerking.push(...bouwdeelOpPlaats(verschoven, maten, { ...plaats, y: y0 }));
    // Omkasting: de dagkanten bekleed en een kader rond de opening op het buitenvlak.
    const kk = 'lak_mat' as const, w = 6;
    const zijg = o.gevel === 'links' || o.gevel === 'rechts';
    const buiten = o.gevel === 'links' ? X0 : o.gevel === 'rechts' ? X1 : o.gevel === 'achter' ? Z0 : Z1;
    const binnen = o.gevel === 'links' ? 0 : o.gevel === 'rechts' ? B : o.gevel === 'achter' ? -dk : L + dk;
    const [d0, d1] = [Math.min(buiten, binnen), Math.max(buiten, binnen)];
    const voor = buiten < binnen ? buiten - 1 : buiten;
    const vak = (deel: string, a0: number, a1: number, ya: number, yb: number, p0: number, p1: number) => {
      const blok: Blok = zijg
        ? { code: `${code}.omkasting.${deel}`, soort: kk, vorm: 'blok', kleur, x: r2(p0), y: r2(ya), z: r2(a0), b: r2(p1 - p0), h: r2(yb - ya), d: r2(a1 - a0) }
        : { code: `${code}.omkasting.${deel}`, soort: kk, vorm: 'blok', kleur, x: r2(a0), y: r2(ya), z: r2(p0), b: r2(a1 - a0), h: r2(yb - ya), d: r2(p1 - p0) };
      S.afwerking.push(blok);
    };
    vak('links', o.a0, o.a0 + 1, y0, y0 + h, d0, d1);
    vak('rechts', o.a1 - 1, o.a1, y0, y0 + h, d0, d1);
    vak('boven', o.a0, o.a1, y0 + h - 1, y0 + h, d0, d1);
    vak('kader.links', o.a0 - w, o.a0 + 1, y0, y0 + h + w, voor, voor + 1);
    vak('kader.rechts', o.a1 - 1, o.a1 + w, y0, y0 + h + w, voor, voor + 1);
    vak('kader.boven', o.a0 + 1, o.a1 - 1, y0 + h - 1, y0 + h + w, voor, voor + 1);
  }
  return S.klaar();
}

/**
 * Roldeur in de eigen assen van een raam (x = breedte, links naar rechts gezien van binnen; z = 0 buiten): een pantser
 * van smalle lamellen tussen twee geleiders, met een onderlat. De oprolkast zit binnen en is van buiten niet te zien.
 */
function roldeurBlokken(b: number, h: number, kleur: string): Blok[] {
  const uit: Blok[] = [];
  const blok = (code: string, soort: BlokSoort, x: number, y: number, z: number, bb: number, hh: number, dd: number, kl: string) => {
    if (bb > 0.05 && hh > 0.05 && dd > 0.05) uit.push({ code, soort, vorm: 'blok', kleur: kl, x: r2(x), y: r2(y), z: r2(z), b: r2(bb), h: r2(hh), d: r2(dd) });
  };
  const geleider = 7, lamel = 10, nk = naadKleur(kleur);
  blok('pantser', 'kunststof', geleider - 2, 6, 1.5, b - 2 * geleider + 4, h - 6, 2, kleur);
  for (let y = 6 + lamel; y < h - 2; y += lamel) blok(`lamel.${Math.round(y)}`, 'donker', geleider, y - 0.3, 1.35, b - 2 * geleider, 0.6, 0.3, nk);
  blok('onderlat', 'metaal', geleider - 2, 0, 1, b - 2 * geleider + 4, 6, 3, '#b8bcbe');
  blok('geleider.links', 'lak_mat', 0, 0, 0.5, geleider, h, 6, tint(kleur, 0.85));
  blok('geleider.rechts', 'lak_mat', b - geleider, 0, 0.5, geleider, h, 6, tint(kleur, 0.85));
  return uit;
}

/** Loopdeur: een kader, een dicht deurblad en een kruk (eigen assen zoals een raam, z = 0 buiten). */
function loopdeurBlokken(b: number, h: number, kleur: string): Blok[] {
  const uit: Blok[] = [];
  const blok = (code: string, soort: BlokSoort, x: number, y: number, z: number, bb: number, hh: number, dd: number, kl: string) => {
    if (bb > 0.05 && hh > 0.05 && dd > 0.05) uit.push({ code, soort, vorm: 'blok', kleur: kl, x: r2(x), y: r2(y), z: r2(z), b: r2(bb), h: r2(hh), d: r2(dd) });
  };
  const k = 5;
  blok('kader.links', 'lak_mat', 0, 0, 0, k, h, 7, tint(kleur, 0.85));
  blok('kader.rechts', 'lak_mat', b - k, 0, 0, k, h, 7, tint(kleur, 0.85));
  blok('kader.boven', 'lak_mat', k - 0.4, h - k, 0, b - 2 * k + 0.8, k, 7, tint(kleur, 0.85));
  blok('blad', 'lak_mat', k - 0.4, 0.8, 1.5, b - 2 * k + 0.8, h - k - 0.4, 4.5, kleur);
  blok('kruk', 'metaal', b - k - 10, 100, -1.5, 12, 2.5, 3.5, '#c4c7c8');
  blok('rozet', 'metaal', b - k - 9, 96, -0.4, 3.5, 12, 2.3, '#c4c7c8');
  return uit;
}

// ---------- wat de schermen oproepen ----------

/** De loods als samenstelling van bouwdelen, uit het resultaat van de motor (`berekenConfiguratie` met het model `loods`). */
export function loodsSamenstelling(r: ConfiguratieResultaat): Samenstelling {
  return bouwLoods(r);
}

/** De 3D van de loods in de afgewerkte weergave of in de constructieweergave. */
export function loods3D(r: ConfiguratieResultaat, weergave: BouwWeergave = 'afgewerkt'): Scene3D {
  return sceneVan(samenstellingBlokken(bouwLoods(r), weergave), 0.08);
}

/**
 * De meetstaat van de loods: staal per rol en profiel (aantal, lengte, gewicht als richtwaarde), bekleding, beton,
 * lichtplaten en de vloer in m². Netto, zonder prijzen. Poorten, deur, goten en afwerking zitten er niet in.
 */
export function loodsMeetstaat(r: ConfiguratieResultaat): MeetstaatRegel[] {
  return samenstellingMeetstaat(bouwLoods(r), M, { perRol: true });
}
