/**
 * De 3D en de meetstaat van het staalwerk rond de woning (zie staalwerk.ts): balustrade, luifel en rechte trap, elk als
 * samenstelling van bouwdelen (src/bouwdelen.ts), in twee weergaven en met een meetstaat.
 *
 * **Een voorstelling, geen berekening** (zie bovenaan staalwerk.ts).
 *
 * Elk model staat in een klein stuk omgeving dat alleen voor het beeld dient en niet in de meetstaat zit: een verhoogd
 * terras (balustrade), een stuk gevel met een deur en een stoep (luifel), een verdiepingsvloer met een muur erachter (trap).
 *
 * Twee weergaven:
 *   afgewerkt    Alles, met de vulling (spijlen, staven, glas, plaat) en de treden.
 *   constructie  Het staal dat draagt (staanders, leuning, kader, ophanging, trapbomen, dragers); de vulling alleen in
 *                het laatste veld en de treden alleen onderaan, als staal. De buitenmaten zijn dezelfde.
 *
 * Assen in cm, y = hoogte vanaf de grond.
 *   balustrade  x = langs de balustrade (0 tot de lengte), z = 0 de rand van het terras, het terras ligt naar -z (de
 *               kant van de woning); de val is naar +z, naar wie van voren kijkt.
 *   luifel      x = langs de gevel (0 tot de breedte), z = 0 de gevel, de luifel steekt naar +z uit.
 *   trap        x = breedte; de trap loopt op van z = lengte (onderaan) naar z = 0, waar de vloer erboven begint
 *               (dezelfde assen als een trap in de plattegrond, core/src/plattegrond.ts).
 */
import {
  ligger, staalStuk, type Blok, type BouwWeergave, type ConfiguratieResultaat, type MeetstaatRegel, type Scene3D,
  type Staalprofiel, type StukRol, type Waarde,
} from '../src/index.js';
import { Samensteller, samenstellingBlokken, samenstellingMeetstaat, sceneVan, vlakDeel, type GeplaatstDeel, type Samenstelling } from './samenstelling.js';
import { BALUSTRADE, LUIFEL, staalwerkMaterialen as M } from './staalwerk.js';
import { buis, hoekprofiel, koker, plat, rond } from './staalprofielen.js';

const r2 = (x: number) => Math.round(x * 100) / 100 + 0;
const num = (v: unknown, standaard = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : standaard);
const tekst = (v: unknown, standaard: string) => (typeof v === 'string' && v ? v : standaard);
const waarden = (r: ConfiguratieResultaat): Record<string, Waarde> => Object.fromEntries(r.kenmerken.map((k) => [k.code, k.waarde]));
const cm = (p: Staalprofiel) => ({ h: p.hoogte / 10, b: p.breedte / 10 });
/** Alleen in de afgewerkte weergave. */
const AFGEWERKT = { alleen: 'afgewerkt' as BouwWeergave };

/** Een stuk staal langs een as, met zijn minimumhoek op (x, y, z). */
function staal(S: Samensteller, basis: string, rol: StukRol, profiel: Staalprofiel, materiaal: string, as: 'x' | 'y' | 'z', lengte: number, x: number, y: number, z: number, extra: Partial<GeplaatstDeel> = {}, draai = 0) {
  if (lengte < 1) return null;
  return S.zet(basis, staalStuk({ profiel, materiaal, lengte, as, rol, draai }, M), x, y, z, 0, extra);
}

/** Een los blok van de omgeving (niet in de meetstaat), in beide weergaven. */
function omgeving(S: Samensteller, code: string, materiaal: string, x: number, y: number, z: number, b: number, h: number, d: number) {
  const m = M[materiaal]!;
  S.blok(S.vast, code, m.soort, m.kleur, x, y, z, b, h, d, m.voeg ? { voeg: m.voeg } : {});
}

/** Een vlak (glas, plaat) als bouwdeel voor de meetstaat, met zijn blok. */
function vlak(S: Samensteller, basis: string, naam: string, materiaal: string, dikteMm: number, blok: Omit<Blok, 'code' | 'soort' | 'kleur' | 'vorm'>, extra: Partial<GeplaatstDeel> = {}) {
  const m = M[materiaal]!;
  const m2 = (Math.max(blok.b * blok.h, blok.b * blok.d, blok.d * blok.h)) / 10000;
  S.zet(basis, vlakDeel(naam, materiaal, M, dikteMm, m2), 0, 0, 0, 0, { ...extra, blokken: [{ code: 'vlak', soort: m.soort, kleur: m.kleur, vorm: 'blok', ...blok }] });
}

// ---------- balustrade ----------

/** Hoogte van het terras onder de balustrade (cm): alleen voor het beeld. */
const TERRAS = 62;

function bouwBalustrade(r: ConfiguratieResultaat): Samenstelling {
  const S = new Samensteller();
  const k = waarden(r), a = r.afgeleid;
  const L = Math.max(50, num(k.lengte, 300)), H = Math.max(80, num(k.hoogte, 110)), y0 = TERRAS;
  const mat = tekst(a.materiaal_staal, 'staal_ral9005'), vulling = tekst(k.vulling, 'spijlen'), zijkant = k.bevestiging === 'zijkant';
  const glas = vulling === 'glas', leuningKeuze = glas ? tekst(k.leuning, 'rond') : tekst(k.leuning, 'plat') === 'geen' ? 'plat' : tekst(k.leuning, 'plat');
  // De omgeving: een verhoogd terras met tegels tegen een stuk gevel, de rand op z = 0.
  omgeving(S, 'terras.onder', 'beton', -40, 0, -180, L + 80, y0 - 2, 180);
  omgeving(S, 'terras.tegels', 'terrastegels', -40, y0 - 2, -180, L + 80, 2, 180);
  omgeving(S, 'gevel', 'gevelsteen', -40, 0, -210, L + 80, y0 + 270, 30);

  const staander = koker(40, 40, 3), regel = koker(30, 30, 2), spijl = koker(20, 20, 2), staaf = rond(12);
  const leuning = leuningKeuze === 'koker' ? koker(40, 40, 3) : leuningKeuze === 'rond' ? buis(42.4, 2) : leuningKeuze === 'plat' ? plat(60, 10) : null;
  const lh = leuning ? cm(leuning).h : 0, lb = leuning ? cm(leuning).b : 0, s = cm(staander).b;
  // Het vlak van de balustrade: het midden van de staanders, 6 cm achter de rand op de vloer, of 3,5 cm voor de rand.
  const zc = zijkant ? 3.5 : -6;
  const top = y0 + H - lh;

  if (glas) {
    // Glas in een bodemprofiel (een koker op de vloer of tegen de rand), panelen met een kier van 1 cm, leuning op het glas.
    const bodem = koker(110, 60, 4), bb = cm(bodem);
    const yb = zijkant ? y0 - bb.h + 3 : y0;
    staal(S, 'bodemprofiel', 'regel', bodem, mat, 'x', L, 0, yb, zc - bb.b / 2);
    const n = Math.max(1, Math.round(num(a.panelen, Math.ceil(L / BALUSTRADE.glas)))), w = (L - (n - 1)) / n;
    const glasMat = tekst(a.materiaal_glas, 'glas_helder'), dikte = 1.8;
    for (let i = 0; i < n; i++) {
      vlak(S, 'glas', 'Glaspaneel', glasMat, 18, { x: r2(i * (w + 1)), y: r2(yb + bb.h - 8), z: r2(zc - dikte / 2), b: r2(w), h: r2(top - (yb + bb.h - 8)), d: dikte }, i === n - 1 ? {} : AFGEWERKT);
    }
    if (leuning) staal(S, 'leuning', 'leuning', leuning, mat, 'x', L, 0, top, zc - lb / 2);
    return S.klaar();
  }

  // Staanders, leuning en de vulling per veld.
  const velden = Math.max(1, Math.round(num(a.velden, Math.ceil(L / BALUSTRADE.veld)))), xs = Array.from({ length: velden + 1 }, (_, i) => (i * (L - s)) / velden);
  const voet = zijkant ? y0 - 18 : y0;
  for (const x of xs) staal(S, 'staander', 'staander', staander, mat, 'y', top - voet, x, voet, zc - s / 2);
  if (leuning) staal(S, 'leuning', 'leuning', leuning, mat, 'x', L, 0, top, zc - lb / 2);
  const onder = y0 + 8;
  for (let i = 0; i < velden; i++) {
    const x0 = xs[i]! + s, x1 = xs[i + 1]!, w = x1 - x0, laatste = i === velden - 1, extra = laatste ? {} : AFGEWERKT;
    if (vulling === 'spijlen') {
      // Een onderregel (in beide weergaven: ze draagt) en spijlen van 2 × 2 cm met hoogstens 10 cm ertussen.
      staal(S, 'regel', 'regel', regel, mat, 'x', w, x0, onder, zc - cm(regel).b / 2);
      const n = Math.max(1, Math.ceil((w - BALUSTRADE.opening) / (cm(spijl).b + BALUSTRADE.opening))), gat = (w - n * cm(spijl).b) / (n + 1);
      for (let j = 0; j < n; j++) staal(S, 'spijl', 'spijl', spijl, mat, 'y', top - onder - cm(regel).h, x0 + gat + j * (gat + cm(spijl).b), onder + cm(regel).h, zc - cm(spijl).b / 2, extra);
    } else if (vulling === 'staven') {
      // Horizontale staven van onderaan tot onder de leuning, met hoogstens 10 cm ertussen (ook tot de leuning).
      const d = cm(staaf).h, n = Math.max(2, Math.ceil((top - onder) / (d + BALUSTRADE.opening) - 1e-9));
      const gat = (top - onder - n * d) / n;
      for (let j = 0; j < n; j++) staal(S, 'staaf', 'regel', staaf, mat, 'x', w, x0, onder + j * (gat + d), zc - d / 2, extra);
    } else {
      // Een volle plaat van 3 mm tussen de staanders.
      vlak(S, 'plaat', 'Volle plaat', tekst(a.materiaal_staal, 'staal_ral9005').replace('staal_', 'staalplaat_'), 3, { x: r2(x0), y: r2(onder), z: r2(zc - 0.15), b: r2(w), h: r2(top - onder - 1), d: 0.3 }, extra);
    }
  }
  return S.klaar();
}

// ---------- luifel ----------

function bouwLuifel(r: ConfiguratieResultaat): Samenstelling {
  const S = new Samensteller();
  const k = waarden(r), a = r.afgeleid;
  const B = Math.max(60, num(k.breedte, 250)), U = Math.max(40, num(k.uitkraging, 120)), Y = Math.max(150, num(k.hoogte, 250));
  const rh = Math.max(4, num(a.rand_h, 12)), mat = tekst(a.materiaal_staal, 'staal_ral7016'), trekstangen = k.ophanging !== 'consoles';
  const rand = koker(rh * 10, 50, 4), rb = cm(rand).b;
  // De omgeving: een stuk gevel met een deur onder de luifel, en een stoep.
  const deurB = Math.min(100, B - 30), deurH = Math.min(220, Y - 15), dx = (B - deurB) / 2, gevelH = Y + rh + (trekstangen ? Math.max(60, U * 0.8) : 0) + 90;
  omgeving(S, 'gevel.links', 'gevelsteen', -150, 0, -30, 150 + dx, gevelH, 30);
  omgeving(S, 'gevel.rechts', 'gevelsteen', dx + deurB, 0, -30, B + 150 - dx - deurB, gevelH, 30);
  omgeving(S, 'gevel.boven', 'gevelsteen', dx, deurH, -30, deurB, gevelH - deurH, 30);
  S.blok(S.vast, 'deur.blad', 'lak_mat', '#3a3f43', dx, 0, -22, deurB, deurH, 6);
  S.blok(S.vast, 'deur.kruk', 'metaal', '#c4c7c8', dx + deurB - 14, 100, -16.5, 12, 2.5, 3);
  omgeving(S, 'stoep', 'terrastegels', -150, 0, 0, B + 300, 2, U + 90);

  // Het kader: een regel tegen de gevel, een voorregel, zijregels en dwarsregels op elk ophangpunt.
  const velden = Math.max(1, Math.round(num(a.velden, Math.ceil(B / LUIFEL.veld)))), xs = Array.from({ length: velden + 1 }, (_, i) => (i * (B - rb)) / velden);
  staal(S, 'kader', 'kader', rand, mat, 'x', B, 0, Y, 0);
  staal(S, 'kader', 'kader', rand, mat, 'x', B, 0, Y, U - rb);
  for (const x of xs) staal(S, 'kader', 'kader', rand, mat, 'z', U - 2 * rb, x, Y, rb);
  // De vulling ligt op het kader, per veld, met een kier van 1 cm.
  const vulMat = tekst(a.materiaal_vulling, 'glas_helder'), plaat = k.vulling === 'plaat', t = plaat ? 0.4 : 1.4;
  for (let i = 0; i < velden; i++) {
    const x0 = i === 0 ? 0 : (xs[i]! + rb / 2) + 0.5, x1 = i === velden - 1 ? B : xs[i + 1]! + rb / 2 - 0.5;
    vlak(S, 'vulling', plaat ? 'Volle plaat' : 'Glas', vulMat, plaat ? 4 : 14, { x: r2(x0), y: r2(Y + rh), z: 0, b: r2(x1 - x0), h: t, d: r2(U) }, i === velden - 1 ? {} : AFGEWERKT);
  }
  // De ophanging, op elk ophangpunt: een trekstang van de gevel naar de voorregel, of een console eronder.
  const muurplaat = plat(100, 10);
  for (const x of xs) {
    const xc = x + rb / 2;
    if (trekstangen) {
      const hoog = Y + rh + Math.max(60, U * 0.8);
      S.staaf('trekstang', rond(16), mat, M, [xc, hoog, 1.5], [xc, Y + rh * 0.6, U - rb], 'trekstang');
      staal(S, 'muurplaat', 'kader', muurplaat, mat, 'y', 16, xc - 5, hoog - 8, 0, {}, 90);
    } else {
      const arm = U * 0.75, val = Math.min(U * 0.6, Y - 60), helling = (Math.atan2(val, arm) * 180) / Math.PI;
      const console = staalStuk({ profiel: koker(60, 40, 3), materiaal: mat, lengte: Math.hypot(arm, val), as: 'z', helling, einden: 'lood', rol: 'console' }, M);
      S.zet('console', console, xc - 2, Y - val, 0);
      staal(S, 'muurplaat', 'kader', muurplaat, mat, 'y', 16, xc - 5, Y - val - 4, 0, {}, 90);
    }
  }
  return S.klaar();
}

// ---------- rechte trap ----------

function bouwTrap(r: ConfiguratieResultaat): Samenstelling {
  const S = new Samensteller();
  const k = waarden(r), a = r.afgeleid;
  const H = Math.max(100, num(k.hoogte, 270)), B = Math.max(40, num(k.breedte, 90)), at = Math.max(15, num(k.aantrede, 23));
  const n = Math.max(2, Math.round(num(a.optreden, Math.ceil(H / 18.5)))), op = H / n, D = (n - 1) * at;
  const tan = op / at, hoek = (Math.atan(tan) * 180) / Math.PI, cos = Math.cos(Math.atan(tan));
  const mat = tekst(a.materiaal_staal, 'staal_ral9005'), trede = tekst(a.materiaal_trede, 'eik'), houtTreden = k.treden !== 'staal';
  const midden = k.structuur === 'midden', zijden = k.leuning === 'beide' ? ['links', 'rechts'] : k.leuning === 'links' || k.leuning === 'rechts' ? [k.leuning] : [];
  /** De lijn door de neuzen van de treden: op de vloer onderaan bij z = D + aantrede, tot de vloer bovenaan bij z = 0. */
  const neus = (z: number) => op + (D - z) * tan;
  // De omgeving: een verdiepingsvloer vanaf z = 0 naar achter, op een muur.
  omgeving(S, 'vloer.boven', 'beton', -60, H - 22, -160, B + 120, 20, 160);
  omgeving(S, 'vloer.boven.afwerking', 'parket', -60, H - 2, -160, B + 120, 2, 160);
  omgeving(S, 'muur', 'pleister', -60, 0, -180, B + 120, H + 110, 20);

  const t = houtTreden ? 4 : 1;
  // De treden: tussen de trapbomen of over de hele breedte op een middenboom; elke trede 3 cm onder de volgende.
  const tx0 = midden ? 0 : 1, tx1 = midden ? B : B - 1;
  for (let i = 0; i < n - 1; i++) {
    const voor = D - i * at, achter = Math.max(0, D - (i + 1) * at - 3), y = (i + 1) * op - t;
    const extra = i < 3 ? {} : AFGEWERKT;
    if (houtTreden) S.zet('trede', ligger({ lengte: tx1 - tx0, doorsnede: { breedte: Math.round((voor - achter) * 10), hoogte: t * 10 }, materiaal: trede, rol: 'trede' }, M), tx0, y, achter, 0, extra);
    else staal(S, 'trede', 'trede', plat(Math.round((voor - achter) * 10), 10), trede, 'x', tx1 - tx0, tx0, y, achter, extra);
  }
  if (!midden) {
    // Twee trapbomen in plat staal (25 cm), 5 cm boven de neuzen, schuin afgesneden te lood; onderaan op de vloer.
    const diep = 25, dv = (diep - 5) / cos, Lh = D + (op - dv) / tan;
    const boom = staalStuk({ profiel: plat(diep * 10, 10), materiaal: mat, lengte: Lh / cos, as: 'z', helling: hoek, einden: 'lood', draai: 90, rol: 'trapboom' }, M);
    for (const x of [0, B - 1]) S.zet('trapboom', boom, x, 0, 0, 180);
    // Een hoekprofiel onder elk uiteinde van elke trede, tegen de trapboom.
    for (let i = 0; i < n - 1; i++) {
      const voor = D - i * at, achter = Math.max(0, D - (i + 1) * at), y = (i + 1) * op - t - 4;
      // Links staat het staande been tegen de trapboom en wijst het liggende naar binnen; rechts gespiegeld (een kwartslag).
      for (const [x, draai] of [[1, 0], [B - 5, 90]] as const) staal(S, 'drager', 'trededrager', hoekprofiel(40, 40, 4), mat, 'z', voor - achter - 4, x, y, achter + 2, {}, draai);
    }
  } else {
    // Eén koker van 20 × 10 cm in het midden, die de achterkant van elke trede raakt (zijn bovenkant ligt op neus(z) − dv),
    // met een drager onder elke trede. Onderaan staat hij op de vloer: daar ligt zijn onderkant op y = 0.
    const boom = koker(200, 100, 5), bh = 20, dv = op + t, Lh = D + (op - dv - bh / cos) / tan;
    const deel = staalStuk({ profiel: boom, materiaal: mat, lengte: Lh / cos, as: 'z', helling: hoek, einden: 'lood', rol: 'trapboom' }, M);
    S.zet('trapboom', deel, B / 2 - 5, 0, 0, 180);
    for (let i = 0; i < n - 1; i++) {
      const z = D - (i + 0.35) * at, onderTrede = (i + 1) * op - t, boomTop = neus(z) - dv;
      staal(S, 'drager', 'trededrager', koker(80, 80, 4), mat, 'y', onderTrede - boomTop + 2, B / 2 - 4, boomTop - 2, z - 4);
    }
  }
  // De leuning: staanders op elke derde trede, een buis 90 cm boven de neuzen en twee tussenregels.
  for (const kant of zijden) {
    const x = kant === 'links' ? (midden ? 2 : -4) : midden ? B - 6 : B, staander = koker(40, 40, 3);
    const stap = Math.max(2, Math.round(110 / at)), plaatsen: number[] = [];
    for (let i = 0; i < n - 1; i += stap) plaatsen.push(D - (i + 0.5) * at);
    if (plaatsen[plaatsen.length - 1]! > at) plaatsen.push(at / 2);
    for (const z of plaatsen) {
      const voet = midden ? Math.floor((D - z) / at + 1e-6) * op + op : neus(z) - 15;
      staal(S, 'staander', 'staander', staander, mat, 'y', neus(z) + 90 - voet, x, voet, z - 2);
    }
    const xa = x + 2, [z0, z1] = [plaatsen[0]! + 6, Math.max(0, plaatsen[plaatsen.length - 1]! - 15)];
    S.staaf('leuning', buis(42.4, 2), mat, M, [xa, neus(z0) + 92, z0], [xa, neus(z1) + 92, z1], 'leuning');
    for (const boven of [30, 60]) S.staaf('regel', rond(12), mat, M, [xa, neus(plaatsen[0]!) + boven, plaatsen[0]!], [xa, neus(plaatsen[plaatsen.length - 1]!) + boven, plaatsen[plaatsen.length - 1]!], 'regel');
  }
  return S.klaar();
}

// ---------- wat de schermen oproepen ----------

/**
 * Het staalwerk als samenstelling van bouwdelen, uit het resultaat van de motor (`berekenConfiguratie` met het model
 * `balustrade`, `luifel` of `staaltrap`). Een ongeldige configuratie wordt toch getekend, zo goed als het kan.
 */
export function staalwerkSamenstelling(r: ConfiguratieResultaat): Samenstelling {
  return r.product === 'LUIFEL' ? bouwLuifel(r) : r.product === 'STAALTRAP' ? bouwTrap(r) : bouwBalustrade(r);
}

/** De 3D van een stuk staalwerk in de afgewerkte weergave of in de constructieweergave. */
export function staalwerk3D(r: ConfiguratieResultaat, weergave: BouwWeergave = 'afgewerkt'): Scene3D {
  return sceneVan(samenstellingBlokken(staalwerkSamenstelling(r), weergave), 0.2);
}

/** De meetstaat: staal per rol en profiel (met gewicht als richtwaarde), glas en plaat in m², treden in hout. Zonder prijzen. */
export function staalwerkMeetstaat(r: ConfiguratieResultaat): MeetstaatRegel[] {
  return samenstellingMeetstaat(staalwerkSamenstelling(r), M, { perRol: true });
}

