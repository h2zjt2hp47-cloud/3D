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
   * loungedeel van Doha). Hoe groter het verschil, hoe breder de overgang: 1,15 × het verschil aan elke kant, tussen 25 en
   * 70 cm, hooguit de helft van elk element en niet in de ronde voorhoeken. (Tot 10/11 was dat 1,6 ×: op de foto's van
   * Doha is de S-bocht tussen het loungedeel en de rest korter en duidelijker.)
   */
  const overgangen = rij.slice(0, -1).flatMap((e, i) => {
    const volgende = rij[i + 1]!, grens = e.x + e.breedte, a = e.diepte, b = volgende.diepte;
    if (a === b) return [];
    const T = Math.min(70, Math.max(25, 1.15 * Math.abs(b - a)), e.breedte / 2, volgende.breedte / 2, grens - (X0 + hL.voor + 2), X1 - hR.voor - 2 - grens);
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
  // De rug bij een afgerond uiteinde: met "Rug loopt rond het uiteinde" draait hij kort om de achterhoek naar voren, als
  // een armleuning (Doha: armhoogte 65, armbreedte 20); anders stopt hij waar de achterkant recht wordt en loopt de
  // zitting verder dan de rug (Montego links).
  const rugRond = (e: OntwerpElement) => gekozenOpties(ontwerp, catalogus, e).get('rug_rond')?.teken?.rond === true;
  const omL = rondL && rugRond(eerste), omR = rondR && rugRond(laatste);

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
  // Twee banden, zoals op de foto's van Doha: buiten de zitting (het zitkussen, rondom), de onderbouw 3 cm terug, allebei
  // dik en rond met een diepe naad ertussen. Een vaste zitting (Montego) is één ronde vorm van de voet tot de zitting.
  const metKussen = kussenDik > 0;
  const insetBasis = metKussen ? 3.5 : 0.5, hb = zitOnder - P;
  const rondBasis = Math.max(2, Math.min(hb / 2 - 0.01, hb * (metKussen ? 0.47 : 0.36) * (0.6 + 0.04 * v.zachtheid)));
  // Voet: verdekt (donker, ver naar binnen) of een plint; met een hoes loopt de onderbouw tot op de vloer. De voet staat
  // in de schaduw onder de zetel: de gewone vorm volstaat (geen zachte vorm nodig, dat spaart rekentijd).
  if (potVorm === 'verdekt' || potVorm === 'plint') {
    const hout = String(zetel.get('hout')?.teken?.kleur ?? '#c8a27a');
    omtrekBlok('voet', potVorm === 'plint' ? 'hout' : 'donker', 0, P, potVorm === 'plint' ? hout : donkerder(stof, 0.3), omtrek((potVorm === 'plint' ? 1.5 : 7.5) + insetBasis), { afronding: 1, glad: false });
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
  omtrekBlok('basis', 'stof', P, hb, stof, omtrek(insetBasis), { afronding: rond1(rondBasis), ...stofExtra });
  // Het zitkussen rondom (ook onder de rug, zoals de band op de foto), met een platte bovenkant en een ronde rand.
  if (metKussen) omtrekBlok('zitkussen', 'kussen', zitOnder, kussenDik, stof, omtrek(0.5), { afronding: rond1(Math.min(zacht, kussenDik * 0.42)), naad, ...stofExtra });
  // De rug: middenlijn langs de achterkant. Met een zitkussen staat hij erachter op de onderbouw, net binnen de rand van
  // het kussen (zoals op de foto loopt de zitting eronder door); bij een vaste zitting vanaf de voet, één vorm.
  // Bij een afgerond uiteinde: een korte omloop om de achterhoek tot ±32 % van de diepte, op volle hoogte met een ronde
  // kop (de armleuning van Doha), of de rug stopt met een ronde kop waar de achterkant recht wordt (minstens 40 % van het
  // eindelement ver, Montego).
  const w = RUG / 2, wi = w + (metKussen ? 1 : 0), rugOnder = metKussen ? zitOnder : P;
  // Met losse rugkussens is de rug een laag karkas dat aan een afgerond uiteinde in een kwartronde naar de zitting zakt,
  // zoals de armleuning van Doha op de foto's (10/11). Een vaste, hoge rug (Montego) houdt een rechte, ronde kop.
  const zakt = losseRug && frameRug - hg.zithoogte >= 8;
  // Waarover de rug zakt: ±1,3 × de hoogte boven de zitting (een kwartronde, zoals op de foto's), tussen 20 en 45 cm.
  const ZAK = Math.min(45, Math.max(20, 1.3 * (frameRug - hg.zithoogte)));
  let rugBeginX = X0, rugEindX = X1;
  {
    const st = omtrekStukken(wi);
    // Een zakkende omloop komt verder naar voren (het lage stuk telt mee): tot ±42 % van de diepte, anders 32 %.
    const tot = (d: number) => Y0 + d * (zakt ? 0.42 : 0.32);
    const pad: P2[] = [];
    const hoog: number[] = [];
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
    // Waar de rug begint en eindigt op de rechte achterkant (als hij niet om het uiteinde loopt).
    const beginX = omL || (zakt && rondL) ? st.xa + st.aL : rondL ? Math.max(st.xa + st.aL, X0 + 0.4 * eerste.breedte) : st.xa;
    const eindX = omR || (zakt && rondR) ? st.xb - st.aR : rondR ? Math.min(st.xb - st.aR, X1 - 0.4 * laatste.breedte) : st.xb;
    rugBeginX = beginX; rugEindX = eindX;
    // Links: van de achterhoek langs de zijkant tot ±32 % van de diepte; dan omgekeerd (van vooraan naar achter), zodat
    // de rug van links naar rechts loopt. Overal op karkashoogte: de ronde kop komt van de wand zelf.
    const wrapL: P2[] = omL ? totGrens(zonderDubbel([...st.links, ...st.achterL].reverse().concat([...st.voorL].reverse()), false), tot(dL)).reverse() : [[beginX, st.yb]];
    // Een zakkende rug zonder omloop loopt nog een klein stuk de achterhoek in (±7 % van de diepte), zodat het lage
    // eind voorbij het laatste rugkussen te zien is (Doha rechts).
    const stukje = (d: number) => Y0 + wi + d * 0.07;
    if (zakt && rondL && !omL) wrapL.splice(0, wrapL.length, ...totGrens(zonderDubbel([...st.achterL].reverse(), false), stukje(dL)).reverse());
    const wrapR: P2[] = omR ? totGrens(zonderDubbel([...st.achterR, ...st.rechts, ...st.voorR], false), tot(dR))
      : zakt && rondR ? totGrens(zonderDubbel([...st.achterR], false), stukje(dR)) : [[eindX, st.yb]];
    for (const p of wrapL) { pad.push(p); hoog.push(frameRug); }
    for (const p of st.achterkant) if (p[0] > beginX + 0.5 && p[0] < eindX - 0.5) { pad.push(p); hoog.push(frameRug); }
    for (const p of wrapR) { pad.push(p); hoog.push(frameRug); }
    // Dubbele punten weg (de stukken raken elkaar).
    const padSchoon: P2[] = [], hoogSchoon: number[] = [];
    pad.forEach((p, i) => {
      const q = padSchoon[padSchoon.length - 1];
      if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5) { padSchoon.push(p); hoogSchoon.push(hoog[i]!); }
    });
    // Zakken naar de zitting aan een afgerond uiteinde: een kwartronde over de laatste ZAK cm van het pad (hooguit een
    // derde van de rug). Het uiteinde duikt 4 cm onder de bovenkant van de zitting: zo loopt de rug in de zitting weg,
    // zonder knobbel aan de punt (een eind net bóven de zitting gaf een bolletje).
    if (zakt && padSchoon.length > 3) {
      const lengte = [0];
      for (let i = 1; i < padSchoon.length; i++) lengte.push(lengte[i - 1]! + Math.hypot(padSchoon[i]![0] - padSchoon[i - 1]![0], padSchoon[i]![1] - padSchoon[i - 1]![1]));
      const totaal = lengte[lengte.length - 1]!, zak = Math.min(ZAK, totaal / 3), laag = Math.max(rugOnder + 2, hg.zithoogte - 4);
      // Een kwart sinus in plaats van een kwart cirkel: bijna dezelfde ronding, maar aan de punt niet loodrecht (een
      // loodrechte punt gaf rafels in de zachte vorm).
      const kwart = (afstand: number) => laag + (frameRug - laag) * Math.sin((Math.min(1, afstand / zak) * Math.PI) / 2);
      padSchoon.forEach((_, i) => {
        if (rondL) hoogSchoon[i] = Math.min(hoogSchoon[i]!, kwart(lengte[i]!));
        if (rondR) hoogSchoon[i] = Math.min(hoogSchoon[i]!, kwart(totaal - lengte[i]!));
      });
    }
    const padW = gebogen(padSchoon);
    const k = kaderVan(padW);
    nieuw.push({
      code: `${id}.rug`, soort: 'stof', vorm: 'kuipwand', x: r2(k.x - w), z: r2(k.z - w), b: r2(k.b + RUG), d: r2(k.d + RUG),
      y: r2(rugOnder), h: r2(Math.max(...hoogSchoon) - rugOnder), kleur: stof, pad: padW, hoogtes: hoogSchoon, dikte: r2(RUG), glad: true, ...stofExtra,
    });
  }
  // Losse rugkussens langs het rechte deel van de rug, elk naar de rug gedraaid in een boog.
  if (losseRug) {
    // Van de omloop (of het begin van de rug) tot de andere kant, tegen de binnenkant van de rug.
    const st = omtrekStukken(0);
    // Bij een zakkende rug: in de hoek van de omloop, vlak naast de arm; aan een uiteinde zonder omloop tot waar de
    // achterkant recht is (het lage eind van de rug steekt er nog voorbij, zoals op de foto's van Doha).
    const x0 = omL ? (zakt ? st.xa + Math.max(RUG + 6, hL.achter * 0.45) : st.xa + hL.achter * 0.75) : rondL ? (zakt ? rugBeginX + 2 : Math.max(X0 + hL.achter, X0 + 0.4 * eerste.breedte)) : st.xa + 2;
    const x1 = omR ? (zakt ? st.xb - Math.max(RUG + 6, hR.achter * 0.45) : st.xb - hR.achter * 0.75) : rondR ? (zakt ? rugEindX - 2 : Math.min(X1 - hR.achter, X1 - 0.4 * laatste.breedte)) : st.xb - 2;
    const n = Math.max(1, Math.round((x1 - x0) / 75)), breed = (x1 - x0) / n;
    const kantel = { graden: rond1(v.rugvorm === 'hellend' ? 14 : 2 + v.zachtheid * 0.8), richting: 'z-' as const };
    for (let i = 0; i < n; i++) {
      const cx = x0 + breed * (i + 0.5), cy = Y0 + wi + w - 2 + RKD / 2;
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
