/**
 * Doorlopende opbouw (vormgeving.opbouw = 'doorlopend'), zoals Doha en Montego op de foto's: een rij zitelementen
 * (zitelement, afgerond eindelement, zitbank) wordt in 3D één zetel. Dat geeft:
 * - één onderbouw in de stof, op een verdekte voet, een hoes of poten;
 * - één zitkussen (of een vaste zitting) over de hele lengte;
 * - één lage rug die achteraan loopt en rond de afgeronde uiteinden naar voren zakt;
 * - losse rugkussens langs de rug.
 * Een dieper element (bv. een loungedeel) loopt met een zachte overgang over in de rest. Met `bocht` buigt de hele zetel
 * in een boog: de uiteinden komen naar voren, de kussens erop draaien mee.
 *
 * Prijs, bovenaanzicht en vooraanzicht blijven per element: dit verandert alleen de 3D.
 */
import { weefselVan, type Materiaal } from './materialen.js';
import {
  dragerVan,
  gekozenOpties,
  hoogtesVan,
  karkasHoogteVan,
  materiaalVan,
  vormgevingVan,
  type Ontwerp,
  type OntwerpCatalogus,
  type OntwerpElement,
} from './ontwerp.js';
import type { Blok, BlokSoort } from './ruimtelijk.js';

const r2 = (x: number) => Math.round(x * 100) / 100;
const rond1 = (x: number) => Math.round(x * 10) / 10;
function donkerder(hex: string, factor = 0.82): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * factor).toString(16).padStart(2, '0')).join('')}`;
}

/** Tekenstijlen die in de doorlopende rij meedoen. */
const RIJSTIJLEN = ['zit', 'rond', 'zit_zonder_rug'];

/** De langste rij aansluitende zitelementen: niet gedraaid (rug achteraan), op één lijn, naast elkaar. */
export function doorlopendeRij(ontwerp: Ontwerp, catalogus: OntwerpCatalogus): OntwerpElement[] {
  const typen = new Map(catalogus.typen.map((t) => [t.code, t]));
  const kand = ontwerp.elementen
    .filter((e) => e.rotatie === 0 && RIJSTIJLEN.includes(typen.get(e.type)?.tekenstijl ?? ''))
    .sort((a, b) => a.x - b.x);
  let beste: OntwerpElement[] = [], rij: OntwerpElement[] = [];
  for (const e of kand) {
    const vorig = rij[rij.length - 1];
    if (vorig && Math.abs(e.x - (vorig.x + vorig.breedte)) <= 1 && Math.abs(e.y - rij[0]!.y) <= 1) rij.push(e);
    else rij = [e];
    if (rij.length > beste.length) beste = [...rij];
  }
  return beste;
}

type P2 = [number, number];

/**
 * Vervangt de blokken van de rij door één doorlopende zetel (zie boven). Geen rij of geen doorlopende opbouw: de blokken
 * blijven zoals ze zijn.
 */
export function doorlopendeOpbouw(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, materialen: Materiaal[], blokken: Blok[]): Blok[] {
  if (vormgevingVan(ontwerp).opbouw !== 'doorlopend') return blokken;
  const rij = doorlopendeRij(ontwerp, catalogus);
  if (!rij.length) return blokken;
  const typen = new Map(catalogus.typen.map((t) => [t.code, t]));
  const eerste = rij[0]!, laatste = rij[rij.length - 1]!;
  const X0 = eerste.x, X1 = laatste.x + laatste.breedte, Y0 = eerste.y, W = X1 - X0, xc = (X0 + X1) / 2;
  const elementBij = (x: number) => rij.find((e) => x >= e.x - 0.01 && x <= e.x + e.breedte + 0.01) ?? eerste;
  const midden = elementBij(xc);

  // Opbouw, hoogtes en stof zoals bij het middelste element.
  const opt = gekozenOpties(ontwerp, catalogus, midden);
  const zetel = gekozenOpties(ontwerp, catalogus);
  const v = vormgevingVan(ontwerp, midden);
  const hg = hoogtesVan(ontwerp, catalogus, midden);
  const rugKeuze = opt.get('rug');
  const losseRug = rugKeuze?.teken?.los === true;
  const dons = rugKeuze?.code === 'los_dons';
  const frameRug = karkasHoogteVan(ontwerp, catalogus, midden, losseRug);
  const kussenDik = opt.get('zitting')?.code === 'vaste_zitting' ? 0 : v.kussendikte;
  const RUG = v.rugdikte, RKD = v.rugkussendikte, zacht = 1.5 + v.zachtheid * 0.9;
  const potVorm = String(opt.get('poten')?.teken?.vorm ?? 'conisch');
  const P = potVorm === 'housse' ? 0 : potVorm === 'plint' ? 4 : potVorm === 'verdekt' ? Math.min(hg.poothoogte, 8) : hg.poothoogte;
  const m = materialen.find((x) => x.code === materiaalVan(ontwerp, catalogus, midden)) ?? materialen.find((x) => x.code === ontwerp.hoofdmateriaal);
  const stof = m?.kleur ?? '#cccccc';
  const stofExtra: Partial<Blok> = m?.textuur ? { textuur: m.textuur, textuurCm: m.textuurCm ?? 15 } : m ? { weefsel: weefselVan(m) } : {};
  const naadTeken = opt.get('naad')?.teken;
  const naad: Blok['naad'] = naadTeken?.bies
    ? { soort: 'bies', kleur: naadTeken.contrast ? '#2b2622' : stof }
    : naadTeken?.stiksel ? { soort: 'stiksel', kleur: donkerder(stof, 0.6) } : { soort: 'naad', kleur: donkerder(stof, 0.7) };

  // ---------- vorm in het grondvlak (rechte coördinaten: x zoals het bovenaanzicht, y van de rug naar voor) ----------
  const rondeKant = (e: OntwerpElement, kant: 'links' | 'rechts') =>
    typen.get(e.type)?.tekenstijl === 'rond' && String(gekozenOpties(ontwerp, catalogus, e).get('ronde_kant')?.teken?.kant ?? 'links') === kant;
  const dL = eerste.diepte, dR = laatste.diepte;
  /** Afronding van de hoeken: een afgerond uiteinde is bijna een halve cirkel, anders een kleine afronding. */
  const hoeken = (rond: boolean, d: number, b: number) => {
    if (!rond) return { voor: 6, achter: 6 };
    const voor = Math.min(d * 0.55, b * 0.9), achter = Math.min(d * 0.4, b * 0.7);
    const schaal = Math.min(1, (d - 2) / (voor + achter));
    return { voor: voor * schaal, achter: achter * schaal };
  };
  const hL = hoeken(rondeKant(eerste, 'links'), dL, eerste.breedte), hR = hoeken(rondeKant(laatste, 'rechts'), dR, laatste.breedte);
  /**
   * Diepte bij x: die van het element daar, met een zachte overgang naar een buur met een andere diepte (zoals het
   * loungedeel van Doha). Hoe groter het verschil, hoe breder de overgang: 1,6 × het verschil aan elke kant, tussen 25 en
   * 70 cm, hooguit de helft van elk element en niet in de ronde voorhoeken.
   */
  const overgangen = rij.slice(0, -1).flatMap((e, i) => {
    const volgende = rij[i + 1]!, grens = e.x + e.breedte, a = e.diepte, b = volgende.diepte;
    if (a === b) return [];
    const T = Math.min(70, Math.max(25, 1.6 * Math.abs(b - a)), e.breedte / 2, volgende.breedte / 2, grens - (X0 + hL.voor + 2), X1 - hR.voor - 2 - grens);
    return T > 1 ? [{ grens, a, b, T }] : [];
  });
  const diepteBij = (x: number) => {
    let d = elementBij(x).diepte;
    for (const { grens, a, b, T } of overgangen) {
      if (Math.abs(x - grens) < T) {
        const u = (x - grens + T) / (2 * T);
        d = a + (b - a) * u * u * (3 - 2 * u);
      }
    }
    return d;
  };
  const rondL = hL.voor > 6, rondR = hR.voor > 6;

  /** Kwartcirkel rond c met straal r van hoek a0 tot a1 (graden; 0 = +x, 90 = naar voor). */
  const boog = (cx: number, cy: number, r: number, a0: number, a1: number, n = 10): P2[] =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as P2;
    });
  /** Punten van a naar b om de ±stap cm (zonder a). */
  const lijn = (a: P2, b: P2, stap = 6): P2[] => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / stap));
    return Array.from({ length: n }, (_, i) => [a[0] + ((b[0] - a[0]) * (i + 1)) / n, a[1] + ((b[1] - a[1]) * (i + 1)) / n] as P2);
  };
  /**
   * De omtrek, `inset` cm naar binnen (en de achterkant nog `achterIn` cm verder naar voor), in stukken: achterhoek links,
   * achterkant, achterhoek rechts, rechterkant, voorhoek rechts, voorkant, voorhoek links, linkerkant.
   */
  const omtrekStukken = (inset: number, achterIn = 0) => {
    const yb = Y0 + inset + achterIn, xa = X0 + inset, xb = X1 - inset;
    const yfL = Y0 + dL - inset, yfR = Y0 + dR - inset;
    // De hoeken passen in de zijkant: schuift de achterkant naar voor, dan worden ze kleiner (anders plooit de omtrek).
    const vL = Math.max(0.5, Math.min(hL.voor - inset, yfL - yb - 1)), vR = Math.max(0.5, Math.min(hR.voor - inset, yfR - yb - 1));
    const aL = Math.max(0.5, Math.min(hL.achter - inset, yfL - yb - vL)), aR = Math.max(0.5, Math.min(hR.achter - inset, yfR - yb - vR));
    const achterL = boog(xa + aL, yb + aL, aL, 180, 270);
    const achterkant = lijn([xa + aL, yb], [xb - aR, yb]);
    const achterR = boog(xb - aR, yb + aR, aR, 270, 360);
    const rechts = lijn([xb, yb + aR], [xb, yfR - vR]);
    const voorR = boog(xb - vR, yfR - vR, vR, 0, 90);
    const voorkant: P2[] = [];
    for (let x = xb - vR - 4; x > xa + vL; x -= 4) voorkant.push([x, Y0 + diepteBij(x) - inset]);
    const voorL = boog(xa + vL, yfL - vL, vL, 90, 180);
    const links = lijn([xa, yfL - vL], [xa, yb + aL]);
    return { achterL, achterkant, achterR, rechts, voorR, voorkant, voorL, links, yb, xa, xb, aL, aR, yfL, yfR };
  };
  /** Zonder dubbele punten (waar twee stukken elkaar raken), ook niet tussen het laatste en het eerste punt. */
  const zonderDubbel = (pts: P2[], ringvormig = true) =>
    pts.filter((p, i) => {
      const q = i ? pts[i - 1]! : ringvormig ? pts[pts.length - 1]! : undefined;
      return !q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.05;
    });
  const omtrek = (inset: number, achterIn = 0) => {
    const s = omtrekStukken(inset, achterIn);
    return zonderDubbel([...s.achterL, ...s.achterkant, ...s.achterR, ...s.rechts, ...s.voorR, ...s.voorkant, ...s.voorL, ...s.links]);
  };

  // ---------- boog: de uiteinden naar voren, langs de achterkant gemeten ----------
  const s = Math.max(0, Math.min(W / 3, v.bocht ?? 0));
  const R = s > 0.5 ? (W * W) / (8 * s) + s / 2 : Infinity;
  /** Punt (x, y) in de boog; ook de draaiing (graden) van de richting langs de zetel daar. */
  const buig = ([x, y]: P2): P2 => {
    if (!Number.isFinite(R)) return [x, y];
    const th = (x - xc) / R, r = R - (y - Y0);
    return [xc + r * Math.sin(th), Y0 + R - r * Math.cos(th)];
  };
  const draaiBij = (x: number) => (Number.isFinite(R) ? ((x - xc) / R) * (180 / Math.PI) : 0);
  const gebogen = (pts: P2[]) => pts.map((p) => { const q = buig(p); return [r2(q[0]), r2(q[1])] as P2; });
  const kaderVan = (pts: P2[]) => {
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    return { x: r2(Math.min(...xs)), z: r2(Math.min(...zs)), b: r2(Math.max(...xs) - Math.min(...xs)), d: r2(Math.max(...zs) - Math.min(...zs)) };
  };

  // ---------- de nieuwe blokken ----------
  const nieuw: Blok[] = [];
  const id = midden.id;
  const omtrekBlok = (code: string, soort: BlokSoort, y: number, h: number, kleur: string, pts: P2[], extra: Partial<Blok> = {}) => {
    if (h <= 0) return;
    const omtrekW = gebogen(pts);
    nieuw.push({ code: `${id}.${code}`, soort, vorm: 'blok', ...kaderVan(omtrekW), y: r2(y), h: r2(h), kleur, omtrek: omtrekW, glad: true, ...extra });
  };
  const zitOnder = Math.max(P + 4, hg.zithoogte - kussenDik);
  // Voet: verdekt (donker, ver naar binnen) of een plint; met een hoes loopt de onderbouw tot op de vloer. De voet staat
  // in de schaduw onder de zetel: de gewone vorm volstaat (geen zachte vorm nodig, dat spaart rekentijd).
  if (potVorm === 'verdekt' || potVorm === 'plint') {
    const hout = String(zetel.get('hout')?.teken?.kleur ?? '#c8a27a');
    omtrekBlok('voet', potVorm === 'plint' ? 'hout' : 'donker', 0, P, potVorm === 'plint' ? hout : donkerder(stof, 0.45), omtrek(potVorm === 'plint' ? 2 : 7), { afronding: 1, glad: false });
  } else if (potVorm !== 'housse' && P > 0) {
    // Poten onder de omtrek: in de hoeken en om de ±120 cm langs voor- en achterkant.
    const metaal = opt.get('poten')?.teken?.metaal === true;
    const kleur = metaal ? String(opt.get('poten')?.teken?.kleur ?? zetel.get('metaal')?.teken?.kleur ?? '#2b2b2b') : String(zetel.get('hout')?.teken?.kleur ?? '#c8a27a');
    const dik = potVorm === 'blok' ? 6 : 4.5, n = Math.max(2, Math.round(W / 120) + 1);
    for (let i = 0; i < n; i++) {
      const x = X0 + 12 + ((W - 24) * i) / (n - 1);
      for (const [k, y] of [['a', Y0 + 10], ['v', Y0 + diepteBij(x) - 10 - dik]] as const) {
        const q = buig([x + dik / 2, y + dik / 2]);
        const extra: Partial<Blok> = potVorm === 'blok' ? {} : { vorm: potVorm === 'conisch' ? 'kegel' : 'cilinder', taps: potVorm === 'conisch' ? 0.55 : 1 };
        nieuw.push({ code: `${elementBij(x).id}.poot-${k}${i}`, soort: metaal ? 'metaal' : 'hout', vorm: 'blok', x: r2(q[0] - dik / 2), y: 0, z: r2(q[1] - dik / 2), b: dik, h: r2(P), d: dik, kleur, ...extra });
      }
    }
  }
  // Onderbouw in de stof, en het zitkussen (achteraan tot net achter de rug) of een vaste zitting.
  omtrekBlok('basis', 'stof', P, zitOnder - P, stof, omtrek(0.5), { afronding: Math.min(4, (zitOnder - P) / 3), ...stofExtra });
  if (kussenDik > 0) omtrekBlok('zitkussen', 'kussen', zitOnder, kussenDik, stof, omtrek(1, RUG - 2), { afronding: zacht, naad, ...stofExtra });
  // De rug: middenlijn achteraan, rond de afgeronde uiteinden naar voren (tot ±75 % van de diepte), waar hij net boven
  // de zitting in het zitkussen verdwijnt (geen opstaande vin aan het uiteinde). De middenlijn volgt de omtrek (ook de
  // ronding vooraan), zodat de wand overal binnen de onderbouw blijft.
  {
    const w = RUG / 2, st = omtrekStukken(w);
    const tot = (d: number) => Y0 + d * 0.75;
    const pad: P2[] = [];
    const hoog: number[] = [];
    const voor = hg.zithoogte + 3;
    /** Het deel van een ketting (y loopt op) tot op hoogte `grens`, met het laatste punt precies op de grens. */
    const totGrens = (ketting: P2[], grens: number): P2[] => {
      const uit: P2[] = [];
      for (const p of ketting) {
        const q = uit[uit.length - 1];
        if (p[1] <= grens) { uit.push(p); continue; }
        if (q && p[1] > q[1]) { const u = (grens - q[1]) / (p[1] - q[1]); uit.push([q[0] + (p[0] - q[0]) * u, grens]); }
        break;
      }
      return uit;
    };
    // Links: van de achterhoek langs de zijkant en de ronding vooraan tot ±75 % van de diepte; dan omgekeerd (van
    // vooraan naar achter), zodat de rug van links naar rechts loopt.
    const wrapL: P2[] = rondL ? totGrens(zonderDubbel([...st.links, ...st.achterL].reverse().concat([...st.voorL].reverse()), false), tot(dL)).reverse() : [[st.xa, st.yb]];
    const wrapR: P2[] = rondR ? totGrens(zonderDubbel([...st.achterR, ...st.rechts, ...st.voorR], false), tot(dR)) : [[st.xb, st.yb]];
    const lengte = (pts: P2[]) => pts.reduce((l, p, i) => (i ? l + Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1]) : 0), 0);
    const LL = lengte(wrapL), LR = lengte(wrapR);
    // Hoogte: achteraan het karkas, naar het einde van de wand toe zachtjes lager.
    const zak = (u: number) => rond1(voor + (frameRug - voor) * (0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, u))));
    let l = 0;
    wrapL.forEach((p, i) => { if (i) l += Math.hypot(p[0] - wrapL[i - 1]![0], p[1] - wrapL[i - 1]![1]); pad.push(p); hoog.push(rondL ? zak(1 - l / (LL || 1)) : frameRug); });
    for (const p of st.achterkant) { pad.push(p); hoog.push(frameRug); }
    l = 0;
    wrapR.forEach((p, i) => { if (i) l += Math.hypot(p[0] - wrapR[i - 1]![0], p[1] - wrapR[i - 1]![1]); pad.push(p); hoog.push(rondR ? zak(l / (LR || 1)) : frameRug); });
    // Dubbele punten weg (de stukken raken elkaar).
    const padSchoon: P2[] = [], hoogSchoon: number[] = [];
    pad.forEach((p, i) => {
      const q = padSchoon[padSchoon.length - 1];
      if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5) { padSchoon.push(p); hoogSchoon.push(hoog[i]!); }
    });
    const padW = gebogen(padSchoon);
    const k = kaderVan(padW);
    nieuw.push({
      code: `${id}.rug`, soort: 'stof', vorm: 'kuipwand', x: r2(k.x - w), z: r2(k.z - w), b: r2(k.b + RUG), d: r2(k.d + RUG),
      y: r2(P), h: r2(Math.max(...hoogSchoon) - P), kleur: stof, pad: padW, hoogtes: hoogSchoon, dikte: r2(RUG), glad: true, ...stofExtra,
    });
  }
  // Losse rugkussens langs het rechte deel van de rug, elk naar de rug gedraaid in een boog.
  if (losseRug) {
    const st = omtrekStukken(0);
    const x0 = st.xa + (rondL ? hL.achter * 0.75 : 2), x1 = st.xb - (rondR ? hR.achter * 0.75 : 2);
    const n = Math.max(1, Math.round((x1 - x0) / 75)), breed = (x1 - x0) / n;
    const kantel = { graden: rond1(v.rugvorm === 'hellend' ? 14 : 2 + v.zachtheid * 0.8), richting: 'z-' as const };
    for (let i = 0; i < n; i++) {
      const cx = x0 + breed * (i + 0.5), cy = Y0 + RUG - 2 + RKD / 2;
      const q = buig([cx, cy]), b = breed - 2;
      nieuw.push({
        code: `${elementBij(cx).id}.rugkussen${i + 1}`, soort: 'kussen', vorm: 'blok', x: r2(q[0] - b / 2), z: r2(q[1] - RKD / 2), b: r2(b), d: r2(RKD),
        y: r2(hg.zithoogte), h: r2(Math.max(10, hg.rughoogte - hg.zithoogte)), kleur: stof, kantel,
        afronding: rond1(Math.min(RKD / 2.2, 1 + v.zachtheid * 0.9)), bol: rond1(RKD * (0.03 + v.zachtheid * 0.022) * (dons ? 1.25 : 1)),
        ...(Number.isFinite(R) ? { draai: rond1(draaiBij(cx)) } : {}), naad, ...stofExtra,
      });
    }
  }

  // De blokken van de rij weg; kussens en rugleuningen op de rij mee in de boog.
  const inRij = new Set(rij.map((e) => e.id));
  const opRij = new Set(ontwerp.elementen.filter((e) => typen.get(e.type)?.opzet && inRij.has(dragerVan(ontwerp, catalogus, e)?.id ?? '')).map((e) => e.id));
  const rest = blokken.filter((b) => !inRij.has(b.code.split('.')[0]!)).map((b) => {
    if (!Number.isFinite(R) || !opRij.has(b.code.split('.')[0]!)) return b;
    const cx = b.x + b.b / 2, cz = b.z + b.d / 2, q = buig([cx, cz]);
    return { ...b, x: r2(q[0] - b.b / 2), z: r2(q[1] - b.d / 2), draai: rond1((b.draai ?? 0) + draaiBij(cx)) };
  });
  return [...rest, ...nieuw];
}
