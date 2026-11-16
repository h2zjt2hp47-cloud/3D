/**
 * Bouwdelen: wandvlak, vloervlak, dakvlak (plat of hellend), paal, ligger en spant. Elk bouwdeel maakt uit maten en
 * een opbouw (opbouw.ts) zijn eigen stukken en lagen, als gewone gegevens (`Bouwdeel`). Uit dat ene bouwdeel komen:
 *   - de blokken voor de 3D, in twee weergaven (`bouwdeelBlokken`): afgewerkt en constructie;
 *   - de meetstaat (`meetstaat`): hout per doorsnede, latten, platen, isolatie, folie en bekleding. Zonder prijzen.
 * Zo tekent de 3D altijd dezelfde stukken als de meetstaat telt.
 *
 * Dit is een **voorstelling, geen berekening**: de afstanden en doorsneden zijn regels van goed vakmanschap uit de
 * opbouw, geen stabiliteitsstudie. Er wordt hier niets nagerekend. De aanwijzing voor EPB (U-waarde uit de lagen) staat
 * in `warmte.ts`, de schatting of een balk, keper of latei volstaat in `stabiliteit.ts`; beide rekenen op een bouwdeel van hier.
 *
 * Eenheden: de maten van een bouwdeel en alle blokken in **cm** (zoals de plattegrond en de 3D); doorsneden van hout en
 * de diktes in een opbouw in **mm**.
 *
 * Plaatselijke assen. Elk bouwdeel ligt met zijn minimumhoek in de oorsprong: alles zit tussen 0 en `maten` (b langs
 * x, h langs y, d langs z). y is altijd de hoogte.
 *   wandvlak   x = langs de wand, van links naar rechts gezien van binnen (zoals een raam, raam3d.ts); y = hoogte vanaf
 *              de onderkant; z = dikte, met z = 0 de buitenkant en z = d de binnenkant. Een raam past er dus in met
 *              dezelfde draaiing als in de plattegrond.
 *   vloervlak  x = lengte, z = breedte, y = dikte (0 = onderkant van de opbouw).
 *   dakvlak    plat: zoals een vloer. Hellend: x = langs de dakvoet, z = horizontaal van de dakvoet (z = 0) naar de nok
 *              (z = d), y = hoogte; de onderkant van de opbouw gaat bij de dakvoet door y = 0 en stijgt met de helling.
 *              De randen zijn te lood (verticaal) afgesneden, zoals het dak in dak.ts.
 *   paal       x en z = de doorsnede, y = hoogte.
 *   ligger     x = lengte, y = hoogte van de doorsnede, z = breedte van de doorsnede.
 *   spant      x = overspanning (voet links op x = 0, nok in het midden), y = hoogte, z = dikte van het spant.
 *
 * In een woning zetten: `plaatsBouwdeel` (niet `plaatsBlokken`: dat laat de doorsnede van een prisma staan, en kepers,
 * spantbenen en de lagen van een hellend dak zijn prisma's).
 */
import { prisma } from './dak.js';
import { dragendeLaag, laagPlaatsen, type BouwMateriaal, type LaagHout, type LaagRol, type Opbouw } from './opbouw.js';
import { plaatsBlokken, type Blok, type BlokSoort } from './ruimtelijk.js';

export type BouwWeergave = 'afgewerkt' | 'constructie';
export type BouwdeelSoort = 'wandvlak' | 'vloervlak' | 'dakvlak' | 'paal' | 'ligger' | 'spant';
export type StukRol =
  | 'stijl' | 'draagstijl' | 'korte_stijl' | 'onderregel' | 'bovenregel' | 'latei' | 'raamregel'
  | 'balk' | 'randbalk' | 'keper' | 'paal' | 'ligger' | 'trekbalk' | 'spantbeen';

/**
 * Doorsnede van een stuk, in mm. Vandaag alleen een rechthoek (hout). Een staalprofiel wordt later een extra vorm
 * (bv. een I-profiel met flens en lijf); de rest van een stuk blijft dan gelijk.
 */
export interface StukDoorsnede {
  vorm: 'rechthoek';
  breedte: number;
  hoogte: number;
}

/** Eén stuk van het skelet: een stijl, regel, balk, keper … Het is één blok in de 3D en één stuk in de meetstaat. */
export interface Stuk {
  /** Code van het blok in de 3D, uniek binnen het bouwdeel: `skelet.<rol>.<nummer>`. */
  code: string;
  rol: StukRol;
  /** Code van het materiaal in de materialenlijst. */
  materiaal: string;
  doorsnede: StukDoorsnede;
  /** Lengte in cm, netto (zonder snijverlies). Bij een schuin stuk (keper, spantbeen): gemeten langs de helling. */
  lengte: number;
  blok: Blok;
}

/** Een rechthoek in het vlak van een bouwdeel (cm): u langs x, v de andere maat in het vlak. */
export interface VlakRechthoek {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

/** Het vlak van een wand, vloer of dak: hoe het ligt, zijn maten en zijn uitsparingen. */
export interface BouwdeelVlak {
  /** `staand` = wand (lagen langs z); `liggend` = vloer of plat dak (lagen langs y); `hellend` = dakvlak onder een helling. */
  ligging: 'staand' | 'liggend' | 'hellend';
  /** Maat langs x (cm). */
  lengte: number;
  /** De andere maat in het vlak (cm): bij een wand de hoogte, bij een vloer of dak de maat langs z (hellend: horizontaal gemeten). */
  breedte: number;
  /** Helling in graden (0 behalve bij `hellend`). */
  helling: number;
  /** Totale dikte van de opbouw (cm), dwars op het vlak. */
  dikte: number;
  /** Richting van balken of kepers: langs x of langs z (bij een wand staan de stijlen altijd recht). */
  richting: 'x' | 'z';
  /** Uitsparingen (bv. raam of deur), in het vlak. */
  openingen: VlakRechthoek[];
}

/** Eén laag van een bouwdeel: de laag uit de opbouw, met haar plaats, hoe ze getekend wordt en haar hoeveelheid. */
export interface BouwdeelLaag {
  /** Volgnummer in de opbouw (vanaf 0). */
  index: number;
  naam: string;
  rol: LaagRol;
  materiaal: string;
  /** Dikte in mm. */
  dikte: number;
  /** Echte plaats dwars op het vlak in cm, gemeten vanaf de eerste zijde (wand: de binnenkant; vloer en dak: de onderkant). */
  van: number;
  tot: number;
  /**
   * Plaats waar de 3D de laag tekent. Gelijk aan `van` en `tot`, behalve bij een heel dunne laag (een folie): die
   * krijgt een zichtbare dikte, ten koste van de laag ernaast. De totale dikte blijft gelijk.
   */
  getekend: [number, number];
  soort: BlokSoort;
  kleur: string;
  voeg?: string;
  /** Netto oppervlakte in m² (zonder de openingen; bij een dak langs de helling gemeten). */
  oppervlakte: number;
  /** Skelet of latten: het hout van de laag. */
  hout?: LaagHout;
  /** Latten: totale lengte in m, netto. */
  lattenLengte?: number;
  /** Wat er tussen het hout zit, met zijn oppervlakte in m² (het vlak min het hout). */
  vulling?: { materiaal: string; soort: BlokSoort; kleur: string; oppervlakte: number };
}

/** Een bouwdeel als gegevens: zijn buitenmaten, de stukken van het skelet en de lagen. */
export interface Bouwdeel {
  soort: BouwdeelSoort;
  /** Buitenmaten in de eigen assen (cm): b langs x, h langs y, d langs z. Alles ligt tussen 0 en deze maten. */
  maten: { b: number; h: number; d: number };
  stukken: Stuk[];
  /** Leeg bij een los stuk (paal, ligger, spant). */
  lagen: BouwdeelLaag[];
  /** Volgnummer van de dragende laag in `lagen` (-1 zonder lagen): het skelet, of de eerste massieve laag. */
  dragend: number;
  /** Alleen bij een wand, vloer of dak. */
  vlak?: BouwdeelVlak;
  /** Wat er aangepast of weggelaten is, in gewone taal (bv. een opening die te dicht bij de rand lag). */
  meldingen: string[];
}

/** Hoogte van de latei boven een opening in een houtskeletwand (mm), als de opbouw er geen geeft. Voorbeeldwaarde. */
export const LATEI_HOOGTE = 190;
/** Kleinste opening die nog gemaakt wordt (cm). */
const MIN_OPENING = 10;
/** Dunste laag die de 3D nog apart kan tonen (cm). */
const MIN_ZICHT = 0.6;
/** Zoveel ligt de vulling terug achter het hout (cm), zodat het hout in de 3D zichtbaar blijft. */
const VULLING_TERUG = 0.6;
/** Zoveel grijpen twee stukken van dezelfde laag in elkaar (cm), tegen een stippellijn in de naad. */
const NAAD = 0.5;
/** Kleur van wat in de afgewerkte weergave tussen de binnenste en de buitenste laag zit. */
const KERN: Teken = { soort: 'gevel', kleur: '#cfccc4' };
const ONBEKEND: Teken = { soort: 'gevel', kleur: '#b8b8b8' };
const EPS = 0.001;

interface Teken { soort: BlokSoort; kleur: string; voeg?: string }

// De + 0 maakt van een afgeronde -0 een gewone 0 (anders komt het blok anders terug uit JSON).
const r2 = (x: number) => Math.round(x * 100) / 100 + 0;
const getal = (x: unknown, standaard = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : standaard);
const rad = (graden: number) => (graden * Math.PI) / 180;
const tekenVan = (m: BouwMateriaal | undefined): Teken => (m ? { soort: m.soort, kleur: m.kleur, ...(m.voeg ? { voeg: m.voeg } : {}) } : ONBEKEND);

/** Een doos in het vlak van een bouwdeel: u en v in het vlak, w dwars erop (vanaf de eerste zijde), omgezet naar een blok. */
function doos(v: BouwdeelVlak, code: string, t: Teken, r: VlakRechthoek, w0: number, w1: number): Blok {
  const extra = t.voeg ? { voeg: t.voeg } : {};
  if (v.ligging === 'staand') {
    return { code, soort: t.soort, vorm: 'blok', kleur: t.kleur, x: r2(r.u0), y: r2(r.v0), z: r2(v.dikte - w1), b: r2(r.u1 - r.u0), h: r2(r.v1 - r.v0), d: r2(w1 - w0), ...extra };
  }
  if (v.ligging === 'liggend') {
    return { code, soort: t.soort, vorm: 'blok', kleur: t.kleur, x: r2(r.u0), y: r2(w0), z: r2(r.v0), b: r2(r.u1 - r.u0), h: r2(w1 - w0), d: r2(r.v1 - r.v0), ...extra };
  }
  // Hellend: een prisma langs x. De lagen liggen evenwijdig met de helling en zijn te lood (verticaal) afgesneden.
  const tan = Math.tan(rad(v.helling)), cos = Math.cos(rad(v.helling));
  const y = (p: number, w: number) => p * tan + w / cos;
  return prisma(code, t.soort, t.kleur, 'x', r.u0, r.u1, [[r.v0, y(r.v0, w0)], [r.v1, y(r.v1, w0)], [r.v1, y(r.v1, w1)], [r.v0, y(r.v0, w1)]], extra);
}

/**
 * Een rechthoek min de openingen: staande stroken naast elke opening en de stukken eronder en erboven.
 * Met `overlap` (alleen om te tekenen) grijpen de stukken onder en boven een opening zoveel cm in de stroken ernaast:
 * twee stukken die precies tegen elkaar liggen, laten in de 3D een stippellijn van de laag erachter door.
 */
function zonderOpeningen(r: VlakRechthoek, openingen: VlakRechthoek[], overlap = 0): VlakRechthoek[] {
  let stukken = [r];
  for (const o of openingen) {
    stukken = stukken.flatMap((p) => {
      if (o.u1 <= p.u0 + EPS || o.u0 >= p.u1 - EPS || o.v1 <= p.v0 + EPS || o.v0 >= p.v1 - EPS) return [p];
      const u0 = Math.max(p.u0, o.u0), u1 = Math.min(p.u1, o.u1);
      const a = u0 - (u0 - p.u0 > EPS ? overlap : 0), b = u1 + (p.u1 - u1 > EPS ? overlap : 0);
      return [
        { u0: p.u0, u1: u0, v0: p.v0, v1: p.v1 },
        { u0: a, u1: b, v0: p.v0, v1: o.v0 },
        { u0: a, u1: b, v0: o.v1, v1: p.v1 },
        { u0: u1, u1: p.u1, v0: p.v0, v1: p.v1 },
      ];
    });
    stukken = stukken.filter((p) => p.u1 - p.u0 > EPS && p.v1 - p.v0 > EPS);
  }
  return stukken;
}

/** Het deel van een rechthoek vanaf `u` (of niets). */
function vanaf(r: VlakRechthoek, u: number): VlakRechthoek[] {
  return r.u1 - Math.max(r.u0, u) > EPS ? [{ ...r, u0: Math.max(r.u0, u) }] : [];
}

/**
 * Plaatsen (het begin, in cm) van stukken met breedte `t` over een maat: één tegen elke rand, en daartussen om de
 * `hoh`, gemeten vanaf het begin (het hart van stuk k ligt op k × hoh). Een stuk dat de randstukken zou raken, vervalt.
 */
function raster(maat: number, t: number, hoh: number): number[] {
  if (!(maat > 0) || !(t > 0)) return [];
  if (maat < 2 * t) return [0];
  const uit = [0];
  for (let k = 1; hoh > t && k * hoh + t / 2 <= maat - t + EPS; k++) {
    if (k * hoh - t / 2 >= t - EPS) uit.push(k * hoh - t / 2);
  }
  uit.push(maat - t);
  return uit;
}

/** De grenzen van de lagen (cm), zo verschoven dat een heel dunne laag zichtbaar wordt ten koste van een buur. */
function zichtGrenzen(grenzen: number[], dragend: number): number[] {
  const g = [...grenzen];
  const dikte = (i: number) => (i >= 0 && i < g.length - 1 ? g[i + 1]! - g[i]! : 0);
  for (let i = 0; i < g.length - 1; i++) {
    const tekort = MIN_ZICHT - dikte(i);
    if (dikte(i) <= 0 || tekort <= 0) continue;
    // De dikste buur staat ruimte af; het skelet alleen als het niet anders kan (zijn hout staat op zijn echte plaats).
    const kan = [i - 1, i + 1].filter((j) => dikte(j) >= tekort + MIN_ZICHT).sort((a, b) => Number(a === dragend) - Number(b === dragend) || dikte(b) - dikte(a));
    if (!kan.length) continue;
    if (kan[0] === i - 1) g[i] = g[i]! - tekort;
    else g[i + 1] = g[i + 1]! + tekort;
  }
  return g;
}

/** De stroken van een laag latten in het vlak (zonder de openingen). */
function latStroken(v: BouwdeelVlak, hout: LaagHout): VlakRechthoek[] {
  const t = getal(hout.breedte) / 10, hoh = getal(hout.hoh) / 10;
  const cos = Math.cos(rad(v.helling)), langsV = lattenLangsV(v, hout);
  const stroken: VlakRechthoek[] = langsV
    ? raster(v.lengte, t, hoh).map((u) => ({ u0: u, u1: Math.min(v.lengte, u + t), v0: 0, v1: v.breedte }))
    // Dwars op een helling: de afstanden gelden langs de helling, het vlak rekent horizontaal.
    : raster(v.breedte / cos, t, hoh).map((s) => ({ u0: 0, u1: v.lengte, v0: s * cos, v1: Math.min(v.breedte, (s + t) * cos) }));
  // Een lat die maar half over de rand van een opening valt, wordt daar over haar hele breedte doorgezaagd: anders
  // bleef er naast de opening een smalle strook lat staan, die als een volle lat geteld en getekend werd.
  const raakt = (a0: number, a1: number, b0: number, b1: number) => a1 > b0 + EPS && a0 < b1 - EPS;
  return stroken.flatMap((s) => zonderOpeningen(s, v.openingen.map((o) => {
    if (langsV) return raakt(o.u0, o.u1, s.u0, s.u1) ? { ...o, u0: Math.min(o.u0, s.u0), u1: Math.max(o.u1, s.u1) } : o;
    return raakt(o.v0, o.v1, s.v0, s.v1) ? { ...o, v0: Math.min(o.v0, s.v0), v1: Math.max(o.v1, s.v1) } : o;
  })));
}

/**
 * Lopen de latten van deze laag langs v (staand in een wand, langs de helling op een dak)? Het skelet loopt langs v
 * (stijlen, kepers, balken langs z) of langs u (balken langs x); latten lopen mee met het skelet of dwars erop.
 */
function lattenLangsV(v: BouwdeelVlak, hout: LaagHout): boolean {
  return (hout.richting === 'mee') === (v.ligging !== 'liggend' || v.richting === 'z');
}

/** Wat een skeletbouwer krijgt: de maten van het hout en een functie om een stuk toe te voegen. */
interface SkeletKader {
  /** Breedte van het hout in het vlak en de hart-op-hartafstand (cm). */
  t: number;
  hoh: number;
  /** Dikte van de skeletlaag (mm) en de breedte van het hout (mm), voor de doorsnede. */
  laagMm: number;
  houtMm: number;
  /** Voegt een stuk toe dat langs u of langs v loopt. `hoogteMm` = een andere hoogte van de doorsnede (latei). */
  stuk(rol: StukRol, r: VlakRechthoek, langs: 'u' | 'v', hoogteMm?: number): void;
}

/** Bouwt het bouwdeel van een vlak: de lagen uit de opbouw, het skelet (via `skelet`) en de hoeveelheden. */
function maakVlak(
  soort: BouwdeelSoort,
  v0: Omit<BouwdeelVlak, 'dikte'>,
  opbouw: Opbouw,
  materialen: Record<string, BouwMateriaal>,
  meldingen: string[],
  skelet: (k: SkeletKader) => void,
): Bouwdeel {
  const plaatsen = laagPlaatsen(opbouw);
  if (!plaatsen.length) meldingen.push(`De opbouw «${opbouw.naam}» heeft geen lagen: er is niets te tekenen.`);
  if (!(v0.lengte > 0) || !(v0.breedte > 0)) meldingen.push('De maten van het bouwdeel zijn niet groter dan nul: er is niets te tekenen.');
  const dikte = plaatsen.length ? plaatsen[plaatsen.length - 1]!.tot / 10 : 0;
  const v: BouwdeelVlak = { ...v0, dikte };
  const cos = Math.cos(rad(v.helling)), tan = Math.tan(rad(v.helling));
  // Oppervlaktes langs de helling: de maat langs v is horizontaal gemeten.
  const m2 = (r: VlakRechthoek) => ((r.u1 - r.u0) * (r.v1 - r.v0)) / cos / 10000;
  const vol: VlakRechthoek = { u0: 0, u1: v.lengte, v0: 0, v1: v.breedte };
  const netto = zonderOpeningen(vol, v.openingen).reduce((som, r) => som + m2(r), 0);
  const dragend = dragendeLaag(opbouw);
  const grenzen = zichtGrenzen([0, ...plaatsen.map((p) => p.tot / 10)], dragend);

  const stukken: Stuk[] = [];
  let houtVlak = 0;
  const lagen: BouwdeelLaag[] = plaatsen.map((p) => {
    const l = p.laag;
    if (l.rol !== 'spouw' && !materialen[l.materiaal]) meldingen.push(`Het materiaal «${l.materiaal}» van de laag «${l.naam}» staat niet in de materialenlijst: de laag is grijs getekend.`);
    const laag: BouwdeelLaag = {
      index: p.index, naam: l.naam, rol: l.rol, materiaal: l.materiaal, dikte: getal(l.dikte),
      van: r2(p.van / 10), tot: r2(p.tot / 10), getekend: [r2(grenzen[p.index]!), r2(grenzen[p.index + 1]!)],
      ...tekenVan(materialen[l.materiaal]),
      oppervlakte: r2(netto),
    };
    const hout = l.hout;
    const geldig = hout && getal(hout.breedte) > 0 && getal(hout.hoh) > getal(hout.breedte);
    if (!geldig || (l.rol !== 'skelet' && l.rol !== 'latten')) return laag;
    laag.hout = hout;
    let houtM2 = 0;
    if (l.rol === 'latten') {
      const stroken = latStroken(v, hout), langsV = lattenLangsV(v, hout);
      laag.lattenLengte = r2(stroken.reduce((som, s) => som + (langsV ? (s.v1 - s.v0) / cos : s.u1 - s.u0), 0) / 100);
      houtM2 = stroken.reduce((som, s) => som + m2(s), 0);
    } else if (p.index === dragend) {
      const teken = tekenVan(materialen[l.materiaal]);
      const tellers: Partial<Record<StukRol, number>> = {};
      skelet({
        t: hout.breedte / 10, hoh: hout.hoh / 10, laagMm: getal(l.dikte), houtMm: hout.breedte,
        stuk(rol, r, langs, hoogteMm) {
          if (r.u1 - r.u0 < EPS || r.v1 - r.v0 < EPS) return;
          const nr = (tellers[rol] = (tellers[rol] ?? 0) + 1);
          const code = `skelet.${rol}.${nr}`;
          stukken.push({
            code, rol, materiaal: l.materiaal,
            doorsnede: hoogteMm ? { vorm: 'rechthoek', breedte: getal(l.dikte), hoogte: hoogteMm } : { vorm: 'rechthoek', breedte: hout.breedte, hoogte: getal(l.dikte) },
            lengte: r2(langs === 'u' ? r.u1 - r.u0 : (r.v1 - r.v0) / cos),
            blok: doos(v, code, teken, r, p.van / 10, p.tot / 10),
          });
          houtVlak += m2(r);
        },
      });
      houtM2 = houtVlak;
    }
    if (hout.vulling) {
      if (!materialen[hout.vulling]) meldingen.push(`De vulling «${hout.vulling}» van de laag «${l.naam}» staat niet in de materialenlijst: ze is grijs getekend.`);
      const t = tekenVan(materialen[hout.vulling]);
      laag.vulling = { materiaal: hout.vulling, soort: t.soort, kleur: t.kleur, oppervlakte: r2(Math.max(0, netto - houtM2)) };
    }
    return laag;
  });

  const maten = v.ligging === 'staand' ? { b: v.lengte, h: v.breedte, d: dikte }
    : v.ligging === 'liggend' ? { b: v.lengte, h: dikte, d: v.breedte }
      : { b: v.lengte, h: v.breedte * tan + dikte / cos, d: v.breedte };
  return { soort, maten: { b: r2(maten.b), h: r2(maten.h), d: r2(maten.d) }, stukken, lagen, dragend, vlak: v, meldingen };
}

/** Een raam- of deuropening in een wandvlak. */
export interface WandOpening {
  soort: 'raam' | 'deur';
  /** Afstand van het begin van de wand (x = 0) tot de linkerkant van de opening (cm). */
  x: number;
  /** Breedte en hoogte van de opening (cm). */
  breedte: number;
  hoogte: number;
  /** Raam: hoogte van de onderkant boven de onderkant van de wand (cm). Een deur begint altijd onderaan. */
  borstwering?: number;
}

export interface WandInvoer {
  /** Lengte en hoogte van het wandvlak (cm). */
  lengte: number;
  hoogte: number;
  opbouw: Opbouw;
  openingen?: WandOpening[];
}

/**
 * Wandvlak. In een houtskelet: onder- en bovenregel, een stijl aan elk einde en daartussen op het raster (gemeten vanaf
 * x = 0). Rond een opening: aan elke kant een doorlopende stijl en een draagstijl, daarop een latei, bij een raam een
 * regel eronder, en korte stijlen op het raster boven de latei en onder het raam. Onder een deur is de onderregel
 * onderbroken. Een opening die daarvoor te dicht bij een rand of bij een andere opening ligt, wordt ingekort (zie
 * `meldingen`); in beide weergaven is het dezelfde, ingekorte opening.
 * Zonder skelet (bv. een spouwmuur) zijn er alleen lagen; een latei in beton of staal wordt niet getekend.
 */
export function wandvlak(invoer: WandInvoer, materialen: Record<string, BouwMateriaal>): Bouwdeel {
  const L = Math.max(0, getal(invoer.lengte)), H = Math.max(0, getal(invoer.hoogte));
  const meldingen: string[] = [];
  const basis = invoer.opbouw.lagen?.[dragendeLaag(invoer.opbouw)];
  const hout = basis?.rol === 'skelet' && basis.hout && getal(basis.hout.breedte) > 0 ? basis.hout : undefined;
  const t = hout ? hout.breedte / 10 : 0;
  const lateiMm = hout ? getal(hout.latei, LATEI_HOOGTE) : 0, latei = lateiMm / 10;

  // De openingen, van links naar rechts, zo dat er plaats blijft voor stijlen, regels en latei.
  interface Gat extends VlakRechthoek { deur: boolean }
  const gaten: Gat[] = [];
  const genummerd = (invoer.openingen ?? []).map((o, i) => ({ o, nr: i + 1 })).sort((a, b) => getal(a.o.x) - getal(b.o.x));
  for (const { o, nr } of genummerd) {
    const deur = o.soort === 'deur', borst = deur ? 0 : Math.max(0, getal(o.borstwering));
    const vorige = gaten[gaten.length - 1];
    const wens: VlakRechthoek = { u0: getal(o.x), u1: getal(o.x) + getal(o.breedte), v0: borst, v1: borst + getal(o.hoogte) };
    const gat: Gat = {
      deur,
      u0: Math.max(wens.u0, 2 * t, vorige ? vorige.u1 + 4 * t : 0),
      u1: Math.min(wens.u1, L - 2 * t),
      v0: deur ? 0 : Math.max(wens.v0, 2 * t),
      v1: Math.min(wens.v1, H - t - latei),
    };
    const wat = `Opening ${nr} (${deur ? 'deur' : 'raam'})`;
    if (gat.u1 - gat.u0 < MIN_OPENING || gat.v1 - gat.v0 < MIN_OPENING) {
      meldingen.push(`${wat} past niet in de wand en is weggelaten: er blijft te weinig plaats over naast, onder of boven de opening.`);
      continue;
    }
    if ((['u0', 'u1', 'v0', 'v1'] as const).some((k) => Math.abs(gat[k] - wens[k]) > 0.01)) {
      meldingen.push(`${wat} is ingekort tot ${r2(gat.u1 - gat.u0)} × ${r2(gat.v1 - gat.v0)} cm: naast, onder en boven de opening is plaats nodig voor stijlen, regels en een latei.`);
    }
    gaten.push(gat);
  }

  const vlak: Omit<BouwdeelVlak, 'dikte'> = {
    ligging: 'staand', lengte: L, breedte: H, helling: 0, richting: 'z',
    openingen: gaten.map(({ u0, u1, v0, v1 }) => ({ u0: r2(u0), u1: r2(u1), v0: r2(v0), v1: r2(v1) })),
  };
  return maakVlak('wandvlak', vlak, invoer.opbouw, materialen, meldingen, (k) => {
    if (L < k.t || H < 2 * k.t) return;
    // Onderregel (onderbroken onder een deur) en bovenregel.
    let begin = 0;
    for (const g of gaten.filter((x) => x.deur)) {
      k.stuk('onderregel', { u0: begin, u1: g.u0, v0: 0, v1: k.t }, 'u');
      begin = g.u1;
    }
    k.stuk('onderregel', { u0: begin, u1: L, v0: 0, v1: k.t }, 'u');
    k.stuk('bovenregel', { u0: 0, u1: L, v0: H - k.t, v1: H }, 'u');

    // De vaste stijlen: aan elk einde, en naast elke opening een doorlopende stijl en een draagstijl onder de latei.
    // Waar al een stijl staat, komt er geen tweede (een opening tegen het einde van de wand).
    const vast: [number, number][] = [];
    const vrij = (u: number, marge = 0) => !vast.some(([a, b]) => u < b + marge - EPS && u + k.t > a - marge + EPS);
    const stijl = (u: number) => k.stuk('stijl', { u0: u, u1: u + k.t, v0: k.t, v1: H - k.t }, 'v');
    for (const u of [0, L - k.t, ...gaten.flatMap((g) => [g.u0 - 2 * k.t, g.u1 + k.t])]) {
      if (!vrij(u)) continue;
      vast.push([u, u + k.t]);
      stijl(u);
    }
    for (const g of gaten) {
      for (const u of [g.u0 - k.t, g.u1]) {
        vast.push([u, u + k.t]);
        k.stuk('draagstijl', { u0: u, u1: u + k.t, v0: k.t, v1: g.v1 }, 'v');
      }
      k.stuk('latei', { u0: g.u0 - k.t, u1: g.u1 + k.t, v0: g.v1, v1: g.v1 + latei }, 'u', lateiMm);
      if (!g.deur) k.stuk('raamregel', { u0: g.u0, u1: g.u1, v0: g.v0 - k.t, v1: g.v0 }, 'u');
    }
    // Het raster: een doorlopende stijl, of in een opening korte stijlen boven de latei en onder het raam. Een
    // rasterstijl die minder dan één stijlbreedte naast een vaste stijl zou staan, vervalt: die neemt zijn plaats in.
    for (const u of raster(L, k.t, k.hoh).slice(1, -1)) {
      if (!vrij(u, k.t)) continue;
      const g = gaten.find((x) => u >= x.u0 - EPS && u + k.t <= x.u1 + EPS);
      if (!g) { stijl(u); continue; }
      const kort = { u0: u, u1: u + k.t };
      if (H - k.t - (g.v1 + latei) > 0.5) k.stuk('korte_stijl', { ...kort, v0: g.v1 + latei, v1: H - k.t }, 'v');
      if (!g.deur && g.v0 - 2 * k.t > 0.5) k.stuk('korte_stijl', { ...kort, v0: k.t, v1: g.v0 - k.t }, 'v');
    }
  });
}

/** Balklaag van een vloer of plat dak: balken op het raster en een randbalk over de koppen van de balken. */
function balklaag(k: SkeletKader, L: number, B: number, richting: 'x' | 'z') {
  if (richting === 'z') {
    if (B <= 2 * k.t) return;
    k.stuk('randbalk', { u0: 0, u1: L, v0: 0, v1: k.t }, 'u');
    k.stuk('randbalk', { u0: 0, u1: L, v0: B - k.t, v1: B }, 'u');
    for (const u of raster(L, k.t, k.hoh)) k.stuk('balk', { u0: u, u1: Math.min(L, u + k.t), v0: k.t, v1: B - k.t }, 'v');
  } else {
    if (L <= 2 * k.t) return;
    k.stuk('randbalk', { u0: 0, u1: k.t, v0: 0, v1: B }, 'v');
    k.stuk('randbalk', { u0: L - k.t, u1: L, v0: 0, v1: B }, 'v');
    for (const w of raster(B, k.t, k.hoh)) k.stuk('balk', { u0: k.t, u1: L - k.t, v0: w, v1: Math.min(B, w + k.t) }, 'u');
  }
}

export interface VloerInvoer {
  /** Lengte (langs x) en breedte (langs z) van het vloervlak (cm). */
  lengte: number;
  breedte: number;
  opbouw: Opbouw;
  /** Richting waarin de balken lopen. Leeg = over de kortste maat. */
  richting?: 'x' | 'z';
}

/**
 * Vloervlak. Met een skelet in de opbouw: een balklaag (een balk tegen elke rand en daartussen op het raster) met een
 * randbalk over de koppen, en de lagen eronder en erboven. Zonder skelet (vloer op volle grond): alleen lagen.
 */
export function vloervlak(invoer: VloerInvoer, materialen: Record<string, BouwMateriaal>): Bouwdeel {
  const L = Math.max(0, getal(invoer.lengte)), B = Math.max(0, getal(invoer.breedte));
  const richting = invoer.richting ?? (B <= L ? 'z' : 'x');
  return maakVlak('vloervlak', { ligging: 'liggend', lengte: L, breedte: B, helling: 0, richting, openingen: [] }, invoer.opbouw, materialen, [], (k) => balklaag(k, L, B, richting));
}

export interface DakInvoer {
  /** Lengte langs de dakvoet (x) en diepte van de dakvoet naar de nok (z), horizontaal gemeten, met de oversteek erbij (cm). */
  lengte: number;
  diepte: number;
  /** Helling in graden. 0 of leeg = een plat dak. */
  helling?: number;
  opbouw: Opbouw;
  /** Plat dak: richting waarin de balken lopen. Leeg = over de kortste maat. */
  richting?: 'x' | 'z';
}

/**
 * Dakvlak. Plat: een roostering zoals een vloer (zonder afschot). Hellend: kepers van de dakvoet naar de nok, één tegen
 * elke rand en daartussen op het raster; muurplaat, gordingen en nokbalk zijn losse liggers en horen er niet bij.
 */
export function dakvlak(invoer: DakInvoer, materialen: Record<string, BouwMateriaal>): Bouwdeel {
  const L = Math.max(0, getal(invoer.lengte)), B = Math.max(0, getal(invoer.diepte));
  const helling = Math.min(75, Math.max(0, getal(invoer.helling)));
  if (helling < 0.01) {
    const richting = invoer.richting ?? (B <= L ? 'z' : 'x');
    return maakVlak('dakvlak', { ligging: 'liggend', lengte: L, breedte: B, helling: 0, richting, openingen: [] }, invoer.opbouw, materialen, [], (k) => balklaag(k, L, B, richting));
  }
  return maakVlak('dakvlak', { ligging: 'hellend', lengte: L, breedte: B, helling, richting: 'z', openingen: [] }, invoer.opbouw, materialen, [], (k) => {
    for (const u of raster(L, k.t, k.hoh)) k.stuk('keper', { u0: u, u1: Math.min(L, u + k.t), v0: 0, v1: B }, 'v');
  });
}

/** Maten van een rechthoekige doorsnede in mm. */
export interface Balkmaat {
  breedte: number;
  hoogte: number;
}

function losDeel(soort: BouwdeelSoort, maten: Bouwdeel['maten'], stukken: Stuk[], materiaal: string, materialen: Record<string, BouwMateriaal>): Bouwdeel {
  const meldingen = materialen[materiaal] ? [] : [`Het materiaal «${materiaal}» staat niet in de materialenlijst: het stuk is grijs getekend.`];
  return { soort, maten: { b: r2(maten.b), h: r2(maten.h), d: r2(maten.d) }, stukken, lagen: [], dragend: -1, meldingen };
}

/** Paal of kolom: `doorsnede.breedte` langs x, `doorsnede.hoogte` langs z (mm), `hoogte` in cm. */
export function paal(invoer: { hoogte: number; doorsnede: Balkmaat; materiaal: string }, materialen: Record<string, BouwMateriaal>): Bouwdeel {
  const b = getal(invoer.doorsnede.breedte) / 10, d = getal(invoer.doorsnede.hoogte) / 10, h = Math.max(0, getal(invoer.hoogte));
  const t = tekenVan(materialen[invoer.materiaal]);
  const stuk: Stuk = {
    code: 'skelet.paal.1', rol: 'paal', materiaal: invoer.materiaal, doorsnede: { vorm: 'rechthoek', ...invoer.doorsnede }, lengte: r2(h),
    blok: { code: 'skelet.paal.1', soort: t.soort, vorm: 'blok', kleur: t.kleur, x: 0, y: 0, z: 0, b: r2(b), h: r2(h), d: r2(d) },
  };
  return losDeel('paal', { b, h, d }, [stuk], invoer.materiaal, materialen);
}

/** Ligger of balk langs x: `doorsnede.breedte` langs z, `doorsnede.hoogte` langs y (mm), `lengte` in cm. */
export function ligger(invoer: { lengte: number; doorsnede: Balkmaat; materiaal: string }, materialen: Record<string, BouwMateriaal>): Bouwdeel {
  const d = getal(invoer.doorsnede.breedte) / 10, h = getal(invoer.doorsnede.hoogte) / 10, b = Math.max(0, getal(invoer.lengte));
  const t = tekenVan(materialen[invoer.materiaal]);
  const stuk: Stuk = {
    code: 'skelet.ligger.1', rol: 'ligger', materiaal: invoer.materiaal, doorsnede: { vorm: 'rechthoek', ...invoer.doorsnede }, lengte: r2(b),
    blok: { code: 'skelet.ligger.1', soort: t.soort, vorm: 'blok', kleur: t.kleur, x: 0, y: 0, z: 0, b: r2(b), h: r2(h), d: r2(d) },
  };
  return losDeel('ligger', { b, h, d }, [stuk], invoer.materiaal, materialen);
}

export interface SpantInvoer {
  /** Overspanning, buitenkant tot buitenkant (cm). */
  overspanning: number;
  /** Helling van de spantbenen in graden. */
  helling: number;
  /** Doorsnede van de spantbenen (mm): `breedte` = de dikte van het spant (langs z), `hoogte` in het vlak van het spant. */
  doorsnede: Balkmaat;
  /** Doorsnede van de trekbalk (mm). Leeg = zoals de spantbenen. */
  trekbalk?: Balkmaat;
  materiaal: string;
}

/**
 * Eenvoudig spant: een driehoek van twee spantbenen op een trekbalk. De benen staan met hun onderkant op de bovenkant
 * van de trekbalk (bij x = 0 en x = overspanning) en komen samen in de nok; ze zijn te lood (verticaal) afgesneden.
 * De lengte van een been is gemeten langs de helling. Geen verbindingen, geen makelaar, geen schoren.
 */
export function spant(invoer: SpantInvoer, materialen: Record<string, BouwMateriaal>): Bouwdeel {
  const S = Math.max(0, getal(invoer.overspanning)), helling = Math.min(75, Math.max(1, getal(invoer.helling)));
  const tan = Math.tan(rad(helling)), cos = Math.cos(rad(helling));
  const been = invoer.doorsnede, trek = invoer.trekbalk ?? invoer.doorsnede;
  const d = Math.max(getal(been.breedte), getal(trek.breedte)) / 10;
  const hT = getal(trek.hoogte) / 10, hB = getal(been.hoogte) / 10 / cos, stijging = (S / 2) * tan;
  const t = tekenVan(materialen[invoer.materiaal]);
  const z0 = (maat: Balkmaat) => (d - getal(maat.breedte) / 10) / 2;
  const schuin = (code: string, voet: number): Stuk => ({
    code, rol: 'spantbeen', materiaal: invoer.materiaal, doorsnede: { vorm: 'rechthoek', ...been }, lengte: r2(S / 2 / cos),
    blok: prisma(code, t.soort, t.kleur, 'z', z0(been), z0(been) + getal(been.breedte) / 10, [[voet, hT], [S / 2, hT + stijging], [S / 2, hT + stijging + hB], [voet, hT + hB]]),
  });
  const stukken: Stuk[] = [
    {
      code: 'skelet.trekbalk.1', rol: 'trekbalk', materiaal: invoer.materiaal, doorsnede: { vorm: 'rechthoek', ...trek }, lengte: r2(S),
      blok: { code: 'skelet.trekbalk.1', soort: t.soort, vorm: 'blok', kleur: t.kleur, x: 0, y: 0, z: r2(z0(trek)), b: r2(S), h: r2(hT), d: r2(getal(trek.breedte) / 10) },
    },
    schuin('skelet.spantbeen.1', 0),
    schuin('skelet.spantbeen.2', S),
  ];
  return losDeel('spant', { b: S, h: hT + stijging + hB, d }, stukken, invoer.materiaal, materialen);
}

export interface BlokOpties {
  /**
   * Constructie: toon de lagen als staal aan het einde van het bouwdeel (standaard). Met `false` blijft alleen het
   * skelet (of de dragende laag) over; het bouwdeel is dan dunner dan in de afgewerkte weergave.
   */
  lagen?: boolean;
  /**
   * Constructie: breedte van één trede van het staal in cm. Leeg = automatisch: het hele staal is ongeveer 40 % van de
   * lengte (een trede van 4 tot 30 cm; een laag staande latten krijgt minstens één hart-op-hartafstand).
   */
  stap?: number;
  /** Voorvoegsel voor de codes van de blokken (bv. de id van de muur), zodat ze uniek blijven in een woning. */
  voorvoegsel?: string;
}

/**
 * De blokken van een bouwdeel, in zijn eigen assen (zie bovenaan).
 *
 * **Afgewerkt**: de binnenste en de buitenste laag op hun echte plaats en dikte, en alles ertussen als één effen kern
 * (`kern`). Je ziet dus wat je van binnen en van buiten ziet; de randen en de dagkanten van een opening tonen de kern.
 *
 * **Constructie**: het skelet is over het hele bouwdeel te zien, elk stuk apart (`skelet.<rol>.<n>`). De lagen staan
 * ernaast als een staal aan het einde (x = lengte): elke laag begint een trede later dan de vorige, zodat je ze van
 * het skelet naar buiten en naar binnen één voor één ziet liggen; in de laatste trede is de opbouw volledig, dus de
 * buitenmaten zijn dezelfde als in de afgewerkte weergave. Latten zijn als losse latten getekend, de vulling tussen het
 * hout ligt iets terug zodat het hout zichtbaar blijft. Zonder skelet (spouwmuur, vloer op volle grond) blijft de
 * dragende laag helemaal staan en zijn de andere lagen op dezelfde manier teruggesneden.
 * Waarom zo: met alle lagen erop zie je het skelet niet, met alle lagen weg zie je niet waaruit de wand bestaat, en de
 * kijker kent geen doorzichtige materialen behalve glas.
 */
export function bouwdeelBlokken(deel: Bouwdeel, weergave: BouwWeergave, opties: BlokOpties = {}): Blok[] {
  const uit: Blok[] = [];
  const v = deel.vlak, n = deel.lagen.length;
  const klaar = () => (opties.voorvoegsel ? uit.map((b) => ({ ...b, code: opties.voorvoegsel + b.code })) : uit);
  if (!v || !n) {
    uit.push(...deel.stukken.map((s) => s.blok));
    return klaar();
  }
  const vol: VlakRechthoek = { u0: 0, u1: v.lengte, v0: 0, v1: v.breedte };
  const teken = (l: BouwdeelLaag): Teken => (l.rol === 'spouw' ? KERN : { soort: l.soort, kleur: l.kleur, ...(l.voeg ? { voeg: l.voeg } : {}) });
  // `rand` (vulling): zoveel blijft de plaat weg van de randen van het vlak en van de openingen, zodat haar kanten in
  // het hout verdwijnen en nergens in hetzelfde vlak liggen als een stijl, een regel of een latei.
  const plaat = (code: string, t: Teken, gebieden: VlakRechthoek[], w0: number, w1: number, rand = 0) => {
    if (w1 - w0 < EPS) return;
    const gaten = rand ? v.openingen.map((o) => ({ u0: o.u0 - rand, u1: o.u1 + rand, v0: o.v0 - rand, v1: o.v1 + rand })) : v.openingen;
    gebieden
      .map((g) => ({ u0: Math.max(g.u0, rand), u1: Math.min(g.u1, v.lengte - rand), v0: Math.max(g.v0, rand), v1: Math.min(g.v1, v.breedte - rand) }))
      .filter((g) => g.u1 - g.u0 > EPS && g.v1 - g.v0 > EPS)
      .flatMap((g) => zonderOpeningen(g, gaten, NAAD))
      .forEach((r, i) => uit.push(doos(v, `${code}.${i + 1}`, t, r, w0, w1)));
  };

  if (weergave === 'afgewerkt') {
    const eerste = deel.lagen[0]!, laatste = deel.lagen[n - 1]!;
    plaat(`afwerking.${eerste.index}`, teken(eerste), [vol], eerste.getekend[0], eerste.getekend[1]);
    if (n > 2) plaat('kern', KERN, [vol], eerste.getekend[1], laatste.getekend[0]);
    if (n > 1) plaat(`afwerking.${laatste.index}`, teken(laatste), [vol], laatste.getekend[0], laatste.getekend[1]);
    return klaar();
  }

  uit.push(...deel.stukken.map((s) => s.blok));
  const basis = deel.lagen[deel.dragend];
  // Zonder skelet blijft de dragende laag helemaal staan.
  if (basis && !deel.stukken.length) plaat(`laag.${basis.index}`, teken(basis), [vol], basis.getekend[0], basis.getekend[1]);
  if (opties.lagen === false || !basis) return klaar();

  // Het staal: de lagen aan weerskanten van de dragende laag, de dichtste eerst, elk een trede later.
  const buiten = deel.lagen.filter((l) => l.index > basis.index && l.rol !== 'spouw');
  const binnen = deel.lagen.filter((l) => l.index < basis.index && l.rol !== 'spouw').reverse();
  const metVulling = Boolean(basis.vulling && deel.stukken.length);
  const vul = metVulling ? 1 : 0;
  if (!buiten.length && !binnen.length && !vul) return klaar();
  // Latten die dwars op de treden lopen (staande latten, tengellatten) krijgen een trede van minstens één
  // hart-op-hartafstand, anders valt er misschien geen enkele lat in en zie je de laag niet.
  const vast = (l: BouwdeelLaag) => (l.rol === 'latten' && l.hout && lattenLangsV(v, l.hout) ? (l.hout.hoh + l.hout.breedte) / 10 : 0);
  const auto = Math.min(...[buiten, binnen].map((kant) => (v.lengte * 0.4 - kant.reduce((som, l) => som + vast(l), 0)) / (kant.filter((l) => !vast(l)).length + vul || 1)));
  const stap = getal(opties.stap) > 0 ? getal(opties.stap) : Math.min(30, Math.max(4, auto));
  const breed = (kant: BouwdeelLaag[]) => kant.reduce((som, l) => som + Math.max(stap, vast(l)), 0);
  const totaal = Math.max(breed(buiten), breed(binnen)) + vul * stap;
  // Het staal blijft binnen 90 % van de lengte: bij een kort bouwdeel worden alle treden smaller.
  const schaal = Math.min(1, (v.lengte * 0.9) / totaal);
  const laag = (l: BouwdeelLaag, begin: number) => {
    if (l.rol === 'latten' && l.hout) {
      // Latten die langs de trede lopen, worden op de trede afgekort; latten die er dwars op staan, blijven heel.
      const heel = lattenLangsV(v, l.hout);
      latStroken(v, l.hout)
        .flatMap((s) => (heel ? (s.u0 >= begin - EPS ? [s] : []) : vanaf(s, begin)))
        .forEach((s, i) => uit.push(doos(v, `lat.${l.index}.${i + 1}`, teken(l), s, l.getekend[0], l.getekend[1])));
      if (l.vulling) plaat(`vulling.${l.index}`, l.vulling, vanaf(vol, begin), l.getekend[0] + terug(l), l.getekend[1] - terug(l), terug(l));
    } else plaat(`laag.${l.index}`, teken(l), vanaf(vol, begin), l.getekend[0], l.getekend[1]);
  };
  const terug = (l: BouwdeelLaag) => Math.min(VULLING_TERUG, (l.getekend[1] - l.getekend[0]) * 0.2);
  if (metVulling) plaat(`vulling.${basis.index}`, basis.vulling!, vanaf(vol, v.lengte - totaal * schaal), basis.van + terug(basis), basis.tot - terug(basis), terug(basis));
  for (const kant of [buiten, binnen]) {
    // Van het einde terug: de laag die het verst van het skelet ligt, is het kortst.
    let begin = v.lengte;
    for (const l of [...kant].reverse()) {
      begin -= Math.max(stap, vast(l)) * schaal;
      laag(l, begin);
    }
  }
  return klaar();
}

/**
 * Zet de blokken van een bouwdeel op hun plaats: verschuiven en draaien in stappen van 90° rond de verticale as (zoals
 * `plaatsBlokken`, met de klok mee gezien van boven). Anders dan `plaatsBlokken` gaat ook de doorsnede van een prisma
 * mee (kepers, spantbenen, de lagen van een hellend dak).
 */
export function plaatsBouwdeel(blokken: Blok[], plaats: { x: number; y?: number; z: number; draai?: 0 | 90 | 180 | 270 }): Blok[] {
  const d = plaats.draai ?? 0, dy = plaats.y ?? 0;
  return plaatsBlokken(blokken, plaats).map((n, i) => {
    const oud = blokken[i]!;
    if (oud.vorm !== 'prisma' || !oud.doorsnede) return n;
    // De doorsnede staat dwars op de as: bij as x loopt p langs z, bij as z langs x. Bij een kwartslag wisselt de as.
    const langsX = oud.as !== 'z';
    const om = d === 180 || (langsX ? d === 90 : d === 270);
    const schuif = (n.as !== 'z') ? plaats.z : plaats.x;
    return { ...n, doorsnede: oud.doorsnede.map(([p, y]): [number, number] => [r2((om ? -p : p) + schuif), r2(y + dy)]) };
  });
}

export type MeetstaatGroep = 'hout' | 'latten' | 'platen' | 'isolatie' | 'folie' | 'bekleding' | 'metselwerk en beton';

/** Eén regel van de meetstaat. Hoeveelheden zijn netto: zonder snijverlies en zonder handelsmaten. Zonder prijzen. */
export interface MeetstaatRegel {
  groep: MeetstaatGroep;
  /** Code en naam van het materiaal. */
  materiaal: string;
  label: string;
  /** Hout en latten: de doorsnede in mm (kleinste maat eerst, bv. "38 × 140"). */
  doorsnede?: string;
  /** Hout: aantal stukken (gelijk aan het aantal dat de constructieweergave tekent). */
  aantal?: number;
  /** Hout en latten: totale lengte in m. */
  lengte?: number;
  /** Platen, isolatie, folie, bekleding, metselwerk en beton: dikte in mm en oppervlakte in m². */
  dikte?: number;
  m2?: number;
}

const GROEPEN: MeetstaatGroep[] = ['hout', 'latten', 'platen', 'isolatie', 'folie', 'bekleding', 'metselwerk en beton'];
const GROEP_VAN_ROL: Partial<Record<LaagRol, MeetstaatGroep>> = {
  afwerking_binnen: 'bekleding', afwerking_buiten: 'bekleding', plaat: 'platen', folie: 'folie', isolatie: 'isolatie', massief: 'metselwerk en beton',
};
const maat = (x: number) => String(Math.round(x * 100) / 100).replace('.', ',');
const doorsnedeTekst = (a: number, b: number) => `${maat(Math.min(a, b))} × ${maat(Math.max(a, b))}`;

/**
 * De meetstaat van één of meer bouwdelen: wat er nodig is, opgeteld per materiaal. Hout per doorsnede met het aantal
 * stukken en de totale lengte; latten per doorsnede in lopende meter; platen, isolatie, folie, bekleding en metselwerk
 * of beton in m² per materiaal en dikte. Netto hoeveelheden, zonder prijzen.
 */
export function meetstaat(delen: Bouwdeel | Bouwdeel[], materialen: Record<string, BouwMateriaal> = {}): MeetstaatRegel[] {
  const regels = new Map<string, MeetstaatRegel>();
  const regel = (groep: MeetstaatGroep, materiaal: string, sleutel: string, begin: Partial<MeetstaatRegel>): MeetstaatRegel => {
    const k = `${groep}|${materiaal}|${sleutel}`;
    if (!regels.has(k)) regels.set(k, { groep, materiaal, label: materialen[materiaal]?.label ?? materiaal, ...begin });
    return regels.get(k)!;
  };
  const vlak = (groep: MeetstaatGroep, materiaal: string, dikte: number, m2: number) => {
    const r = regel(groep, materiaal, String(dikte), { dikte, m2: 0 });
    r.m2 = (r.m2 ?? 0) + m2;
  };
  for (const deel of Array.isArray(delen) ? delen : [delen]) {
    for (const s of deel.stukken) {
      const tekst = doorsnedeTekst(s.doorsnede.breedte, s.doorsnede.hoogte);
      const r = regel('hout', s.materiaal, tekst, { doorsnede: tekst, aantal: 0, lengte: 0 });
      r.aantal = (r.aantal ?? 0) + 1;
      r.lengte = (r.lengte ?? 0) + s.lengte / 100;
    }
    for (const l of deel.lagen) {
      if (l.rol === 'latten' && l.hout && l.lattenLengte !== undefined) {
        const tekst = doorsnedeTekst(l.hout.breedte, l.dikte);
        const r = regel('latten', l.materiaal, tekst, { doorsnede: tekst, lengte: 0 });
        r.lengte = (r.lengte ?? 0) + l.lattenLengte;
      } else if (l.rol !== 'skelet' && l.rol !== 'spouw') {
        vlak(GROEP_VAN_ROL[l.rol] ?? 'platen', l.materiaal, l.dikte, l.oppervlakte);
      }
      if (l.vulling) vlak('isolatie', l.vulling.materiaal, l.dikte, l.vulling.oppervlakte);
    }
  }
  return [...regels.values()]
    .map((r) => ({ ...r, ...(r.lengte !== undefined ? { lengte: r2(r.lengte) } : {}), ...(r.m2 !== undefined ? { m2: r2(r.m2) } : {}) }))
    .sort((a, b) => GROEPEN.indexOf(a.groep) - GROEPEN.indexOf(b.groep) || a.label.localeCompare(b.label, 'nl') || (a.doorsnede ?? '').localeCompare(b.doorsnede ?? '', 'nl', { numeric: true }) || (a.dikte ?? 0) - (b.dikte ?? 0));
}
