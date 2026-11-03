/**
 * Zonnepanelen: gebouwen en dakvlakken → legplan → stringplan → opbrengst en terugverdientijd → offerteregels.
 *
 * Bedoeld voor het verkoopgesprek van een installateur. Alle technische waarden zijn benaderingen:
 * de definitieve opbrengst (PVGIS), het stringplan (tool van de omvormerfabrikant) en de keuring (AREI)
 * gebeuren door de installateur. Maten in cm (gebouw en dak) en mm (paneel), hoeken in graden.
 *
 * Oriëntatie (azimut): 0 = zuid, −90 = oost, +90 = west, ±180 = noord (zoals PVGIS).
 * 3D-assen in cm: x = breedte van het gebouw, y = hoogte, z = diepte (+z = voorgevel).
 */
import { berekenOfferte, type OfferteRegel, type OfferteResultaat } from './offerte.js';

// ───────────────────────── Types ─────────────────────────

export type Dakvorm = 'zadel' | 'lessenaar' | 'plat';
export type Bedekking = 'pannen' | 'leien' | 'golfplaat' | 'plat';
export type Ligging = 'staand' | 'liggend';
export type Schaduw = 'geen' | 'licht' | 'matig' | 'sterk';
export type PlatOpstelling = 'zuid' | 'oostwest';
/** Richting waarin een paneel op een plat dak kijkt, in de assen van het gebouw. */
export type Richting = '+z' | '-z' | '+x' | '-x';
export type ObstakelSoort = 'dakraam' | 'schoorsteen' | 'dakkapel' | 'verluchting';

export interface Gebouw {
  id: string;
  naam: string;
  dakvorm: Dakvorm;
  /** Breedte van de voorgevel (cm). */
  breedte: number;
  /** Diepte (cm). */
  diepte: number;
  /** Hoogte tot de dakgoot of dakrand (cm). */
  goothoogte: number;
  /** Dakhelling (graden), niet gebruikt bij een plat dak. */
  helling: number;
  /** Plaats van het midden van het gebouw op het terrein (cm). */
  x: number;
  z: number;
}

/** Hindernis op een dakvlak, gemeten vanaf de linkerbenedenhoek (gezien van buiten, goot onderaan). */
export interface Obstakel {
  id: string;
  soort: ObstakelSoort;
  x: number;
  y: number;
  b: number;
  h: number;
}

export interface DakvlakInstelling {
  actief: boolean;
  bedekking: Bedekking;
  ligging: Ligging;
  schaduw: Schaduw;
  /** Vrije rand rond de panelen (cm). */
  rand: number;
  obstakels: Obstakel[];
  /** Sleutels van panelen die de gebruiker uitgezet heeft ("rij-kolom"). */
  uit: string[];
  /** Enkel plat dak. */
  opstelling: PlatOpstelling;
  /** Enkel plat dak: hellingshoek van de panelen (graden). */
  kanteling: number;
}

export interface Paneel {
  code: string;
  naam: string;
  merk: string;
  wp: number;
  /** Lange zijde (mm). */
  lengte: number;
  /** Korte zijde (mm). */
  breedte: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  /** Temperatuurcoëfficiënt van Voc (%/°C, negatief). */
  tkVoc: number;
  /** Temperatuurcoëfficiënt van het vermogen (%/°C, negatief). */
  tkP: number;
  uitzicht: string;
  garantie: number;
  prijs: number;
  kost: number;
}

export interface Omvormer {
  code: string;
  naam: string;
  merk: string;
  soort: 'string' | 'hybride' | 'micro';
  fasen: 1 | 3;
  /** AC-vermogen (W); bij micro per stuk. */
  ac: number;
  /** Aantal MPPT-ingangen (micro: 1 per paneel). */
  mppt: number;
  mpptMin: number;
  mpptMax: number;
  maxVdc: number;
  /** Maximale kortsluitstroom per MPPT-ingang (A). */
  maxStroom: number;
  /** Enkel micro: grootste paneel (Wp) per omvormer. */
  maxWp?: number;
  garantie: number;
  prijs: number;
  kost: number;
}

export interface Batterij {
  code: string;
  naam: string;
  merk: string;
  kwh: number;
  prijs: number;
  kost: number;
}

export interface PrijsKost {
  prijs: number;
  kost: number;
}

export interface ZonCatalogus {
  panelen: Paneel[];
  omvormers: Omvormer[];
  batterijen: Batterij[];
  prijzen: {
    /** Montagesysteem per paneel, volgens de dakbedekking. */
    montage: Record<Bedekking, PrijsKost>;
    arbeidPaneel: PrijsKost;
    plaatsingOmvormer: PrijsKost;
    plaatsingBatterij: PrijsKost;
    bekabeling: PrijsKost;
    stellingHellend: PrijsKost;
    stellingPlat: PrijsKost;
    keuring: PrijsKost;
    aanmelding: PrijsKost;
    optimizer: PrijsKost;
    laadpaal: PrijsKost;
    monitoring: PrijsKost;
  };
}

export interface ZonProject {
  klant: { naam: string; adres: string; telefoon: string; email: string };
  /** Verbruik per jaar (kWh). */
  verbruik: number;
  /** Bijkomend verbruik in de toekomst, bv. elektrische wagen of warmtepomp (kWh/jaar). */
  extraVerbruik: number;
  aansluiting: 'mono' | 'drie';
  /** Privéwoning ouder dan 10 jaar: 6 % btw (anders 21 %). */
  woningOuderDan10: boolean;
  /** Oriëntatie van de voorgevel (azimut). */
  orientatie: number;
  gebouwen: Gebouw[];
  vlakken: Record<string, DakvlakInstelling>;
  paneel: string;
  /** Code of 'auto'. */
  omvormer: string;
  /** Code of '' (geen). */
  batterij: string;
  optimizers: boolean;
  laadpaal: boolean;
  monitoring: boolean;
  /** Prijs elektriciteit afname (€/kWh, incl. btw en heffingen). */
  afnameprijs: number;
  /** Vergoeding voor injectie (€/kWh). */
  injectieprijs: number;
  /** Jaarlijkse stijging van de energieprijs (%). */
  prijsstijging: number;
  korting: number;
  /** Voorzichtigheidsmarge op de opbrengst van PVGIS (%), bv. 5. */
  opbrengstMarge: number;
  /** Gewenst aantal panelen (de beste plaatsen eerst); null = alle plaatsen die aan staan. */
  doelAantal: number | null;
  /** Bewaarde varianten om naast elkaar te tonen. */
  varianten: Variant[];
}

/** Een variant: dezelfde woning, een andere installatie (panelen, omvormer, batterij, opties). */
export interface Variant {
  id: string;
  naam: string;
  paneel: string;
  omvormer: string;
  batterij: string;
  optimizers: boolean;
  laadpaal: boolean;
  monitoring: boolean;
  doelAantal: number | null;
  vlakken: Record<string, DakvlakInstelling>;
}

/** Een dakvlak zoals afgeleid uit een gebouw, met zijn plaats in 3D. */
export interface Dakvlak {
  id: string;
  gebouw: string;
  zijde: 'voor' | 'achter' | 'plat';
  naam: string;
  /** Breedte langs de goot (cm). */
  breedte: number;
  /** Lengte van goot tot nok, langs de helling (cm). Bij een plat dak: de diepte. */
  lengte: number;
  helling: number;
  /** Oriëntatie van het dakvlak; bij een plat dak die van de voorgevel. */
  azimut: number;
  oorsprong: Punt;
  /** Eenheidsvector langs de goot. */
  u: Punt;
  /** Eenheidsvector van goot naar nok. */
  v: Punt;
  /** Normaal (naar buiten). */
  n: Punt;
}

export interface Punt {
  x: number;
  y: number;
  z: number;
}

export interface GelegdPaneel {
  sleutel: string;
  rij: number;
  kolom: number;
  /** Voetafdruk op het dakvlak (cm). */
  u: number;
  v: number;
  b: number;
  d: number;
  /** Hellingshoek van het paneel (graden). */
  helling: number;
  azimut: number;
  /** Enkel plat dak. */
  richting: Richting | null;
  actief: boolean;
}

export interface VlakLegplan {
  vlak: Dakvlak;
  instelling: DakvlakInstelling;
  panelen: GelegdPaneel[];
  aantal: number;
  /** Aantal plaatsen dat wegvalt door een obstakel. */
  geblokkeerd: number;
}

export interface Controle {
  code: string;
  label: string;
  status: 'ok' | 'let-op' | 'fout';
  waarde?: string;
  uitleg?: string;
}

export interface StringGroep {
  id: string;
  naam: string;
  vlak: string;
  azimut: number;
  helling: number;
  panelen: number;
  /** Lengtes van de strings (panelen per string). */
  strings: number[];
  mppts: number;
  /** Specifieke opbrengst (kWh per kWp per jaar). */
  kwhPerKwp: number;
  kwh: number;
}

export interface ZonResultaat {
  legplan: VlakLegplan[];
  paneel: Paneel;
  aantal: number;
  /** Aantal vrije plaatsen op de dakvlakken die aan staan (het maximum voor het gewenste aantal). */
  beschikbaar: number;
  kwp: number;
  omvormer: Omvormer | null;
  aantalOmvormers: number;
  omvormerAuto: boolean;
  batterij: Batterij | null;
  groepen: StringGroep[];
  vocKoud: number;
  vmpWarm: number;
  nMin: number;
  nMax: number;
  dcAc: number | null;
  acVermogen: number;
  /** Productie per jaar (kWh). */
  productie: number;
  productiePerMaand: number[];
  verbruik: number;
  verbruikPerMaand: number[];
  zelfverbruik: number;
  zelfverbruikZonderBatterij: number;
  injectie: number;
  afname: number;
  /** Deel van het verbruik dat zelf opgewekt wordt (%). */
  autarkie: number;
  /** Productie t.o.v. het verbruik (%). */
  dekking: number;
  besparingJaar1: number;
  terugverdientijd: number | null;
  /** Cumulatieve winst per jaar (jaar 0 = −investering). */
  cumulatief: number[];
  winst25: number;
  co2: number;
  regels: OfferteRegel[];
  offerte: OfferteResultaat;
  bestellijst: BestelRegel[];
  controles: Controle[];
  geldig: boolean;
}

export interface BestelRegel {
  leverancier: string;
  artikel: string;
  omschrijving: string;
  aantal: number;
  eenheid: string;
}

// ───────────────────────── Hulp ─────────────────────────

const rad = (g: number) => (g * Math.PI) / 180;
const rond = (x: number, d = 0) => Math.round(x * 10 ** d) / 10 ** d;
const begrens = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
/** Hoek naar (−180, 180]. */
export const normHoek = (g: number) => {
  let a = ((g + 180) % 360 + 360) % 360 - 180;
  if (a === -180) a = 180;
  return a;
};
const p = (x: number, y: number, z: number): Punt => ({ x, y, z });

const WINDSTREKEN: [number, string][] = [
  [0, 'Z'], [-45, 'ZO'], [-90, 'O'], [-135, 'NO'], [180, 'N'], [135, 'NW'], [90, 'W'], [45, 'ZW'],
];
/** Windstreek bij een azimut (Z, ZO, O, …). */
export function windstreek(azimut: number): string {
  const a = normHoek(azimut);
  let beste = WINDSTREKEN[0]!;
  for (const w of WINDSTREKEN) if (Math.abs(normHoek(a - w[0])) < Math.abs(normHoek(a - beste[0]))) beste = w;
  return beste[1];
}

export const STANDAARD_VLAK: DakvlakInstelling = {
  actief: true, bedekking: 'pannen', ligging: 'staand', schaduw: 'geen', rand: 30,
  obstakels: [], uit: [], opstelling: 'zuid', kanteling: 13,
};

export function instellingVan(project: ZonProject, vlak: Dakvlak): DakvlakInstelling {
  const eigen = project.vlakken[vlak.id];
  const basis: DakvlakInstelling = vlak.zijde === 'plat'
    ? { ...STANDAARD_VLAK, bedekking: 'plat', ligging: 'liggend', rand: 80 }
    : { ...STANDAARD_VLAK, actief: vlak.zijde === 'voor' || Math.abs(normHoek(vlak.azimut)) <= 100 };
  return { ...basis, ...eigen, obstakels: eigen?.obstakels ?? [], uit: eigen?.uit ?? [] };
}

// ───────────────────────── Dakvlakken ─────────────────────────

/** De dakvlakken van een gebouw, met hun plaats in 3D. */
export function dakvlakkenVan(g: Gebouw, orientatie: number): Dakvlak[] {
  const W = g.breedte, D = g.diepte, G = g.goothoogte;
  const s = Math.sin(rad(g.helling)), c = Math.cos(rad(g.helling));
  const kruis = (a: Punt, b: Punt): Punt => p(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  const vlak = (zijde: Dakvlak['zijde'], naam: string, lengte: number, helling: number, azimut: number, oorsprong: Punt, u: Punt, v: Punt): Dakvlak =>
    ({ id: `${g.id}-${zijde}`, gebouw: g.id, zijde, naam: `${g.naam} – ${naam}`, breedte: W, lengte: rond(lengte, 1), helling, azimut: normHoek(azimut), oorsprong, u, v, n: kruis(u, v) });
  if (g.dakvorm === 'plat') {
    return [vlak('plat', 'plat dak', D, 0, orientatie, p(g.x - W / 2, G, g.z + D / 2), p(1, 0, 0), p(0, 0, -1))];
  }
  if (g.dakvorm === 'lessenaar') {
    return [vlak('voor', 'dakvlak', D / c, g.helling, orientatie, p(g.x - W / 2, G, g.z + D / 2), p(1, 0, 0), p(0, s, -c))];
  }
  return [
    vlak('voor', 'voorkant', D / 2 / c, g.helling, orientatie, p(g.x - W / 2, G, g.z + D / 2), p(1, 0, 0), p(0, s, -c)),
    vlak('achter', 'achterkant', D / 2 / c, g.helling, orientatie + 180, p(g.x + W / 2, G, g.z - D / 2), p(-1, 0, 0), p(0, s, c)),
  ];
}

export function alleDakvlakken(project: ZonProject): Dakvlak[] {
  return project.gebouwen.flatMap((g) => dakvlakkenVan(g, project.orientatie));
}

/** Punt op een dakvlak (u langs de goot, v naar de nok, n loodrecht erop) in 3D. */
export function vlakPunt(vlak: Dakvlak, u: number, v: number, n = 0): Punt {
  const o = vlak.oorsprong;
  return p(
    o.x + u * vlak.u.x + v * vlak.v.x + n * vlak.n.x,
    o.y + u * vlak.u.y + v * vlak.v.y + n * vlak.n.y,
    o.z + u * vlak.u.z + v * vlak.v.z + n * vlak.n.z,
  );
}

/** Oriëntatie van een richting in de assen van het gebouw. */
export function azimutVanRichting(r: Richting, orientatie: number): number {
  return normHoek(orientatie + ({ '+z': 0, '-z': 180, '+x': -90, '-x': 90 } as const)[r]);
}

/** Welke richting(en) een plat dak krijgt: één richting zo dicht mogelijk bij zuid, of rug aan rug oost-west. */
export function richtingenPlat(opstelling: PlatOpstelling, orientatie: number): Richting[] {
  const alle: Richting[] = ['+z', '-z', '+x', '-x'];
  if (opstelling === 'zuid') {
    return [alle.reduce((a, b) => (Math.abs(azimutVanRichting(b, orientatie)) < Math.abs(azimutVanRichting(a, orientatie)) ? b : a))];
  }
  const afwijking = (r: Richting) => Math.abs(Math.abs(azimutVanRichting(r, orientatie)) - 90);
  return afwijking('+z') + afwijking('-z') <= afwijking('+x') + afwijking('-x') ? ['+z', '-z'] : ['+x', '-x'];
}

// ───────────────────────── Legplan ─────────────────────────

const VOEG = 2; // cm tussen twee panelen (klemmen)
const OBSTAKEL_MARGE = 15; // cm vrij rond een obstakel
/** Zonnestand waarvoor rijen op een plat dak elkaar niet beschaduwen (winter, middag). */
const SCHADUWHOEK = 18;

function raakt(a: { u: number; v: number; b: number; d: number }, o: Obstakel): boolean {
  const m = OBSTAKEL_MARGE;
  return a.u < o.x + o.b + m && a.u + a.b > o.x - m && a.v < o.y + o.h + m && a.v + a.d > o.y - m;
}

/** Legt panelen op een dakvlak: zoveel mogelijk, gecentreerd, vrij van obstakels. */
export function legVlak(vlak: Dakvlak, inst: DakvlakInstelling, paneel: Paneel, orientatie: number): VlakLegplan {
  const lang = paneel.lengte / 10, kort = paneel.breedte / 10;
  const r = Math.max(0, inst.rand);
  const uit = new Set(inst.uit);
  const panelen: GelegdPaneel[] = [];
  let geblokkeerd = 0;
  const voeg = (x: Omit<GelegdPaneel, 'actief'>) => {
    if (inst.obstakels.some((o) => raakt(x, o))) { geblokkeerd++; return; }
    panelen.push({ ...x, actief: inst.actief && !uit.has(x.sleutel) });
  };

  if (vlak.zijde !== 'plat') {
    const b = inst.ligging === 'staand' ? kort : lang;
    const h = inst.ligging === 'staand' ? lang : kort;
    const kol = Math.max(0, Math.floor((vlak.breedte - 2 * r + VOEG) / (b + VOEG)));
    const rijen = Math.max(0, Math.floor((vlak.lengte - 2 * r + VOEG) / (h + VOEG)));
    const u0 = (vlak.breedte - (kol * b + (kol - 1) * VOEG)) / 2;
    const v0 = (vlak.lengte - (rijen * h + (rijen - 1) * VOEG)) / 2;
    for (let i = 0; i < rijen; i++) {
      for (let j = 0; j < kol; j++) {
        voeg({ sleutel: `${i}-${j}`, rij: i, kolom: j, u: rond(u0 + j * (b + VOEG), 1), v: rond(v0 + i * (h + VOEG), 1), b, d: h, helling: vlak.helling, azimut: vlak.azimut, richting: null });
      }
    }
  } else {
    // Plat dak: liggende panelen op driehoeken, rijen dwars op de kijkrichting.
    const t = begrens(inst.kanteling, 5, 35);
    const richtingen = richtingenPlat(inst.opstelling, orientatie);
    const diepte = kort * Math.cos(rad(t));
    const langsU = richtingen[0] === '+z' || richtingen[0] === '-z'; // rijen lopen langs de goot (u)
    const La = (langsU ? vlak.breedte : vlak.lengte) - 2 * r; // lengte van een rij
    const Lc = (langsU ? vlak.lengte : vlak.breedte) - 2 * r; // ruimte voor de rijen
    const perRij = Math.max(0, Math.floor((La + VOEG) / (lang + VOEG)));
    const eenheid = richtingen.length === 2 ? 2 * diepte : diepte;
    const tussen = richtingen.length === 2 ? 30 : kort * Math.sin(rad(t)) / Math.tan(rad(SCHADUWHOEK));
    const rijen = Math.max(0, Math.floor((Lc + tussen) / (eenheid + tussen)));
    const a0 = r + (La - (perRij * lang + (perRij - 1) * VOEG)) / 2;
    const c0 = r + (Lc - (rijen * eenheid + (rijen - 1) * tussen)) / 2;
    for (let i = 0; i < rijen; i++) {
      richtingen.forEach((richting, k) => {
        for (let j = 0; j < perRij; j++) {
          const a = a0 + j * (lang + VOEG);
          const c = c0 + i * (eenheid + tussen) + k * diepte;
          const vak = langsU ? { u: a, v: c, b: lang, d: diepte } : { u: c, v: a, b: diepte, d: lang };
          voeg({ sleutel: `${i}${richtingen.length === 2 ? 'ab'[k] : ''}-${j}`, rij: i, kolom: j, u: rond(vak.u, 1), v: rond(vak.v, 1), b: rond(vak.b, 1), d: rond(vak.d, 1), helling: t, azimut: azimutVanRichting(richting, orientatie), richting });
        }
      });
    }
  }
  return { vlak, instelling: inst, panelen, aantal: panelen.filter((x) => x.actief).length, geblokkeerd };
}

/** De vier hoeken van een paneel in 3D (onderaan links, rechts, bovenaan rechts, links), iets boven het dak. */
export function paneelHoeken(vlak: Dakvlak, x: GelegdPaneel): Punt[] {
  if (!x.richting) {
    const n = 12;
    return [vlakPunt(vlak, x.u, x.v, n), vlakPunt(vlak, x.u + x.b, x.v, n), vlakPunt(vlak, x.u + x.b, x.v + x.d, n), vlakPunt(vlak, x.u, x.v + x.d, n)];
  }
  // Plat dak: lage rand aan de kant waar het paneel naartoe kijkt (+z = voorkant = kleine v).
  const laag = 10;
  const hoog = laag + Math.tan(rad(x.helling)) * (x.richting === '+z' || x.richting === '-z' ? x.d : x.b);
  const { u, v, b, d } = x;
  const h = (uu: number, vv: number) => {
    const f = x.richting === '+z' ? (vv - v) / d : x.richting === '-z' ? (v + d - vv) / d : x.richting === '+x' ? (u + b - uu) / b : (uu - u) / b;
    return vlakPunt(vlak, uu, vv, laag + (hoog - laag) * f);
  };
  return [h(u, v), h(u + b, v), h(u + b, v + d), h(u, v + d)];
}

// ───────────────────────── Opbrengst ─────────────────────────

/**
 * Opbrengst per kWp per jaar (kWh) volgens PVGIS 5.3 (JRC), Midden-België (50,85° N, 4,35° O),
 * 14 % systeemverlies, opgevraagd op 3/11/2026. Rijen: helling 0–90° per 10°; kolommen: azimut −180…180° per 15°.
 * België is klein: tussen kust en Limburg scheelt het enkele procenten.
 */
export const PVGIS_TABEL: number[][] = [
  [872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872, 872],
  [780, 783, 793, 808, 826, 847, 869, 891, 910, 926, 938, 945, 947, 944, 935, 922, 905, 885, 864, 842, 821, 804, 790, 782, 780],
  [687, 693, 711, 740, 778, 819, 861, 900, 935, 964, 986, 998, 1002, 996, 980, 956, 925, 889, 849, 808, 768, 732, 706, 691, 687],
  [595, 605, 632, 675, 730, 788, 845, 899, 946, 985, 1013, 1030, 1034, 1026, 1005, 973, 932, 883, 829, 772, 716, 664, 625, 602, 595],
  [505, 519, 555, 613, 681, 752, 821, 885, 941, 986, 1020, 1039, 1044, 1034, 1009, 971, 923, 865, 802, 735, 666, 602, 548, 515, 505],
  [421, 438, 485, 553, 629, 708, 785, 856, 918, 968, 1004, 1026, 1030, 1019, 991, 950, 897, 834, 765, 691, 616, 544, 479, 435, 421],
  [349, 368, 421, 492, 572, 656, 737, 811, 877, 929, 967, 989, 993, 981, 953, 909, 855, 789, 717, 639, 561, 486, 419, 367, 349],
  [290, 309, 361, 431, 510, 594, 676, 753, 817, 872, 909, 930, 932, 920, 894, 851, 795, 732, 658, 580, 501, 427, 361, 310, 290],
  [242, 258, 305, 370, 446, 527, 609, 679, 745, 795, 830, 848, 850, 838, 813, 774, 724, 659, 590, 516, 440, 369, 307, 260, 242],
  [199, 213, 253, 310, 380, 454, 529, 601, 656, 703, 733, 747, 747, 736, 716, 683, 636, 581, 516, 443, 377, 311, 255, 215, 199],
];
/** Hoogste waarde in de tabel (beste stand). */
export const OPBRENGST_KWP = Math.max(...PVGIS_TABEL.flat());
/** Verdeling van de opbrengst over de maanden (%), Midden-België. */
export const MAAND_OPBRENGST = [2.5, 4.5, 8, 11.5, 13.5, 13.5, 13.5, 12, 9, 6.5, 3.5, 2];
/** Verdeling van het verbruik van een gezin over de maanden (%). */
export const MAAND_VERBRUIK = [10, 9, 9, 8, 7.5, 7, 7, 7, 7.5, 8.5, 9.5, 10];
export const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const SCHADUW: Record<Schaduw, number> = { geen: 1, licht: 0.95, matig: 0.85, sterk: 0.7 };
export const SCHADUW_LABEL: Record<Schaduw, string> = { geen: 'Geen', licht: 'Licht (−5 %)', matig: 'Matig (−15 %)', sterk: 'Sterk (−30 %)' };

/** Opbrengst per kWp per jaar (kWh) voor helling en azimut: tussenwaarden uit de PVGIS-tabel. */
export function opbrengstPerKwp(helling: number, azimut: number): number {
  const h = begrens(helling, 0, 90) / 10;
  const a = (normHoek(azimut) + 180) / 15;
  const h0 = Math.min(8, Math.floor(h)), a0 = Math.min(23, Math.floor(a));
  const fh = h - h0, fa = a - a0;
  const w = (i: number, j: number) => PVGIS_TABEL[i]![j]!;
  const onder = w(h0, a0) * (1 - fa) + w(h0, a0 + 1) * fa;
  const boven = w(h0 + 1, a0) * (1 - fa) + w(h0 + 1, a0 + 1) * fa;
  return onder * (1 - fh) + boven * fh;
}

/** Opbrengst t.o.v. de beste stand (1 = zuid, ±40°). */
export function standFactor(helling: number, azimut: number): number {
  return rond(opbrengstPerKwp(helling, azimut) / OPBRENGST_KWP, 3);
}

/** Aandeel van de productie dat meteen zelf verbruikt wordt, zonder batterij (benadering). */
export function zelfverbruikZonder(productie: number, verbruik: number): number {
  if (productie <= 0 || verbruik <= 0) return 0;
  const aandeel = begrens(0.33 * (verbruik / productie) ** 0.55, 0.08, 0.85);
  return Math.min(aandeel * productie, 0.6 * verbruik);
}

/** Extra zelfverbruik door een batterij: ±250 volle cycli per jaar, 90 % rendement. */
export function extraDoorBatterij(kwh: number, productie: number, verbruik: number, zonder: number): number {
  if (kwh <= 0) return 0;
  return Math.max(0, Math.min(kwh * 250 * 0.9, productie - zonder, verbruik - zonder));
}

// ───────────────────────── Elektrisch ─────────────────────────

/** Spanning bij −10 °C (koude ochtend) en bij 70 °C celtemperatuur (zomer). */
export function stringGrenzen(paneel: Paneel, omv: Omvormer) {
  const vocKoud = paneel.voc * (1 + (paneel.tkVoc / 100) * (-10 - 25));
  const vmpWarm = paneel.vmp * (1 + ((paneel.tkVoc - 0.05) / 100) * (70 - 25));
  return { vocKoud: rond(vocKoud, 1), vmpWarm: rond(vmpWarm, 1), nMax: Math.floor(omv.maxVdc / vocKoud), nMin: Math.ceil(omv.mpptMin / vmpWarm) };
}

/** Verdeelt n panelen over zo weinig mogelijk strings van hoogstens nMax panelen. */
export function verdeelStrings(n: number, nMax: number): number[] {
  if (n <= 0 || nMax <= 0) return [];
  const s = Math.ceil(n / nMax);
  const basis = Math.floor(n / s);
  return Array.from({ length: s }, (_, i) => basis + (i < n % s ? 1 : 0));
}

/** Kiest de goedkoopste passende omvormer: juiste aansluiting, DC/AC tussen ±0,85 en 1,3, genoeg ingangen. */
export function kiesOmvormer(cat: ZonCatalogus, kwp: number, opties: { fasen: 1 | 3; batterij: boolean; mppts: number }): Omvormer | null {
  const soorten = opties.batterij ? ['hybride'] : ['string', 'hybride'];
  const kandidaten = cat.omvormers.filter((o) => o.fasen === opties.fasen && soorten.includes(o.soort)).sort((a, b) => a.prijs - b.prijs);
  if (!kandidaten.length || kwp <= 0) return kandidaten[0] ?? null;
  const dc = kwp * 1000;
  const past = (o: Omvormer, laag: number, hoog: number, mppt: boolean) => dc / o.ac <= hoog && dc / o.ac >= laag && (!mppt || o.mppt >= opties.mppts);
  return kandidaten.find((o) => past(o, 0.85, 1.3, true))
    ?? kandidaten.find((o) => past(o, 0.7, 1.35, true))
    ?? kandidaten.find((o) => past(o, 0.85, 1.3, false))
    ?? [...kandidaten].sort((a, b) => Math.abs(dc / a.ac - 1.1) - Math.abs(dc / b.ac - 1.1))[0]!;
}

// ───────────────────────── Alles samen ─────────────────────────

const OMVORMER_SOORT = { string: 'stringomvormer', hybride: 'hybride omvormer', micro: 'micro-omvormer' } as const;
const BEDEKKING_LABEL: Record<Bedekking, string> = { pannen: 'pannendak', leien: 'leien dak', golfplaat: 'golfplaten', plat: 'plat dak (ballast)' };
/** Grens voor een monofasige aansluiting in Vlaanderen (C10/11, te controleren bij de netbeheerder). */
export const MONO_GRENS = 5000;

/**
 * Houdt alleen de n beste plaatsen aan: eerst het dakvlak met de meeste opbrengst (stand en schaduw),
 * binnen een vlak de onderste rijen en vanuit het midden, zodat de panelen een mooi blok vormen.
 */
export function beperkTot(legplan: VlakLegplan[], n: number) {
  const kandidaten = legplan.flatMap((l) => {
    const kolommen = l.panelen.map((x) => x.kolom);
    const midden = (Math.min(...kolommen) + Math.max(...kolommen)) / 2;
    return l.panelen.filter((x) => x.actief).map((x) => ({
      l, x,
      score: standFactor(x.helling, x.azimut) * SCHADUW[l.instelling.schaduw],
      rij: x.rij, afstand: Math.abs(x.kolom - midden),
    }));
  });
  kandidaten.sort((a, b) => b.score - a.score || (a.l === b.l ? 0 : legplan.indexOf(a.l) - legplan.indexOf(b.l)) || a.rij - b.rij || a.afstand - b.afstand);
  kandidaten.forEach((k, i) => { if (i >= n) k.x.actief = false; });
  for (const l of legplan) l.aantal = l.panelen.filter((x) => x.actief).length;
}

/** De installatie van een project als variant bewaren. */
export function variantVan(p: ZonProject, naam: string, id: string): Variant {
  return {
    id, naam, paneel: p.paneel, omvormer: p.omvormer, batterij: p.batterij, optimizers: p.optimizers,
    laadpaal: p.laadpaal, monitoring: p.monitoring, doelAantal: p.doelAantal, vlakken: structuredClone(p.vlakken),
  };
}

/** Het project met de installatie van een variant. */
export function metVariant(p: ZonProject, v: Variant): ZonProject {
  const { id: _id, naam: _naam, ...installatie } = v;
  return { ...p, ...structuredClone(installatie) };
}

/** Is de huidige installatie gelijk aan de variant? */
export function isVariant(p: ZonProject, v: Variant): boolean {
  return JSON.stringify(variantVan(p, v.naam, v.id)) === JSON.stringify(v);
}

export function berekenZon(project: ZonProject, cat: ZonCatalogus): ZonResultaat {
  const paneel = cat.panelen.find((x) => x.code === project.paneel) ?? cat.panelen[0]!;
  const legplan = alleDakvlakken(project).map((v) => legVlak(v, instellingVan(project, v), paneel, project.orientatie));
  const beschikbaar = legplan.reduce((t, l) => t + l.aantal, 0);
  if (project.doelAantal !== null && project.doelAantal !== undefined) beperkTot(legplan, Math.max(0, Math.round(project.doelAantal)));
  const aantal = legplan.reduce((t, l) => t + l.aantal, 0);
  const kwp = rond((aantal * paneel.wp) / 1000, 2);
  const controles: Controle[] = [];
  const fasen: 1 | 3 = project.aansluiting === 'mono' ? 1 : 3;
  const batterij = cat.batterijen.find((b) => b.code === project.batterij) ?? null;
  const metOptimizers = project.optimizers;

  // Groepen: per dakvlak en kijkrichting.
  const groepenRuw = new Map<string, { vlak: VlakLegplan; richting: Richting | null; panelen: GelegdPaneel[] }>();
  for (const l of legplan) {
    for (const x of l.panelen.filter((q) => q.actief)) {
      const id = `${l.vlak.id}${x.richting ? `:${x.richting}` : ''}`;
      if (!groepenRuw.has(id)) groepenRuw.set(id, { vlak: l, richting: x.richting, panelen: [] });
      groepenRuw.get(id)!.panelen.push(x);
    }
  }

  // Omvormer.
  const gekozen = cat.omvormers.find((o) => o.code === project.omvormer) ?? null;
  const omvormerAuto = !gekozen;
  const omvormer = gekozen ?? kiesOmvormer(cat, kwp, { fasen, batterij: !!batterij, mppts: metOptimizers ? 1 : groepenRuw.size });
  const micro = omvormer?.soort === 'micro';
  const aantalOmvormers = micro ? aantal : omvormer ? 1 : 0;
  const acVermogen = omvormer ? (micro ? aantal * omvormer.ac : omvormer.ac) : 0;
  const grenzen = omvormer && !micro ? stringGrenzen(paneel, omvormer) : { vocKoud: 0, vmpWarm: 0, nMax: 0, nMin: 0 };

  // Stringplan en opbrengst per groep.
  const perMppt = omvormer && !micro ? Math.max(1, Math.floor(omvormer.maxStroom / paneel.isc)) : 1;
  const groepen: StringGroep[] = [...groepenRuw.entries()].map(([id, g]) => {
    const azimut = g.panelen[0]!.azimut, helling = g.panelen[0]!.helling;
    let schaduw = SCHADUW[g.vlak.instelling.schaduw];
    if (metOptimizers || micro) schaduw = 1 - (1 - schaduw) / 2;
    const kwhPerKwp = rond(opbrengstPerKwp(helling, azimut) * (1 - begrens(project.opbrengstMarge ?? 0, 0, 30) / 100) * schaduw);
    const strings = micro ? [] : verdeelStrings(g.panelen.length, grenzen.nMax);
    const richtingNaam = g.richting ? ` (${windstreek(azimut)})` : '';
    return {
      id, naam: `${g.vlak.vlak.naam}${richtingNaam}`, vlak: g.vlak.vlak.id, azimut, helling,
      panelen: g.panelen.length, strings, mppts: micro ? 0 : Math.ceil(strings.length / perMppt),
      kwhPerKwp, kwh: rond((g.panelen.length * paneel.wp / 1000) * kwhPerKwp),
    };
  });

  // Controles: legplan.
  if (aantal === 0) controles.push({ code: 'geen_panelen', label: 'Panelen op het dak', status: 'fout', waarde: '0', uitleg: 'Zet minstens één dakvlak aan of maak het dak groter.' });
  else controles.push({ code: 'panelen', label: 'Panelen op het dak', status: 'ok', waarde: `${aantal} × ${paneel.wp} Wp = ${kwp.toFixed(2).replace('.', ',')} kWp` });
  for (const l of legplan) {
    if (!l.instelling.actief) continue;
    const f = standFactor(l.vlak.helling, l.vlak.azimut);
    if (l.vlak.zijde !== 'plat' && f < 0.7 && l.aantal > 0) {
      controles.push({ code: `noord_${l.vlak.id}`, label: `${l.vlak.naam}: weinig zon`, status: 'let-op', waarde: `${Math.round(f * 100)} %`, uitleg: `Dit vlak kijkt naar ${windstreek(l.vlak.azimut)} en levert ${Math.round(f * 100)} % van een zuiddak. Meestal niet rendabel.` });
    }
    if (l.vlak.zijde !== 'plat' && l.instelling.bedekking === 'plat') {
      controles.push({ code: `bedekking_${l.vlak.id}`, label: `${l.vlak.naam}: dakbedekking`, status: 'fout', uitleg: 'Kies pannen, leien of golfplaten voor een hellend dak.' });
    }
    if (l.vlak.zijde !== 'plat' && l.vlak.helling > 60) {
      controles.push({ code: `steil_${l.vlak.id}`, label: `${l.vlak.naam}: zeer steil dak`, status: 'let-op', waarde: `${l.vlak.helling}°`, uitleg: 'Montage met hoogwerker en extra valbeveiliging.' });
    }
    if (l.instelling.rand < (l.vlak.zijde === 'plat' ? 50 : 20)) {
      controles.push({ code: `rand_${l.vlak.id}`, label: `${l.vlak.naam}: smalle rand`, status: 'let-op', waarde: `${l.instelling.rand} cm`, uitleg: l.vlak.zijde === 'plat' ? 'Aan de dakrand is de windbelasting het grootst: houd minstens 50 cm vrij (of meer ballast).' : 'Houd minstens 20 cm vrij tot goot, nok en zijkant.' });
    }
  }

  // Controles: omvormer en strings.
  const dcAc = omvormer && acVermogen > 0 ? rond((kwp * 1000) / acVermogen, 2) : null;
  if (!omvormer) controles.push({ code: 'omvormer', label: 'Omvormer', status: 'fout', uitleg: 'Geen passende omvormer in de catalogus.' });
  else if (aantal > 0) {
    if (omvormer.fasen !== fasen && !micro) {
      controles.push({ code: 'fasen', label: 'Aansluiting', status: 'fout', waarde: `${omvormer.fasen === 1 ? 'monofasig' : 'driefasig'}`, uitleg: `De omvormer past niet bij een ${fasen === 1 ? 'monofasige' : 'driefasige'} aansluiting.` });
    }
    if (fasen === 1 && acVermogen > MONO_GRENS) {
      controles.push({ code: 'mono_grens', label: 'Monofasige aansluiting', status: 'fout', waarde: `${getal(acVermogen / 1000)} kVA`, uitleg: `Op een monofasige aansluiting mag het omvormervermogen hoogstens ${MONO_GRENS / 1000} kVA zijn. Kies een kleinere installatie of laat de aansluiting driefasig maken.` });
    }
    if (dcAc !== null) {
      const st = dcAc > 1.35 ? 'let-op' : dcAc < 0.8 ? 'let-op' : 'ok';
      controles.push({ code: 'dcac', label: 'Verhouding panelen / omvormer', status: st, waarde: getal(dcAc, 2), uitleg: st === 'ok' ? 'Tussen 0,8 en 1,35: goed.' : dcAc > 1.35 ? `De omvormer is te klein: op zonnige middagen gaat opbrengst verloren (afkappen).${fasen === 1 ? ` Monofasig is ${MONO_GRENS / 1000} kVA het maximum: leg minder panelen of laat de aansluiting driefasig maken.` : ''}` : 'De omvormer is groter dan nodig (duurder, iets minder rendement bij weinig licht).' });
    }
    if (batterij && omvormer.soort !== 'hybride') {
      controles.push({ code: 'batterij_omvormer', label: 'Batterij', status: 'fout', uitleg: 'Een batterij vraagt een hybride omvormer. Kies een hybride omvormer of laat de omvormer automatisch kiezen.' });
    }
    if (micro) {
      if (omvormer.maxWp && paneel.wp > omvormer.maxWp) controles.push({ code: 'micro_wp', label: 'Micro-omvormer', status: 'fout', waarde: `${paneel.wp} Wp`, uitleg: `Deze micro-omvormer neemt panelen tot ${omvormer.maxWp} Wp.` });
      else controles.push({ code: 'micro', label: 'Micro-omvormers', status: 'ok', waarde: `${aantal} stuks`, uitleg: 'Elk paneel werkt apart: geen stringplan nodig, schaduw op één paneel hindert de andere niet.' });
    } else {
      const nodig = metOptimizers ? Math.ceil(groepen.reduce((t, g) => t + g.strings.length, 0) / perMppt) : groepen.reduce((t, g) => t + g.mppts, 0);
      const kort = groepen.filter((g) => g.strings.some((s) => s < grenzen.nMin));
      if (kort.length && !metOptimizers) {
        controles.push({ code: 'string_kort', label: 'Stringlengte', status: 'fout', waarde: kort.map((g) => g.panelen).join(', '), uitleg: `${kort.map((g) => g.naam).join(', ')}: te weinig panelen voor een eigen string (minstens ${grenzen.nMin}). Leg meer panelen, zet dat vlak uit, of kies optimizers of micro-omvormers.` });
      } else if (groepen.length) {
        controles.push({ code: 'string', label: 'Stringspanning', status: 'ok', waarde: `${grenzen.nMin}–${grenzen.nMax} panelen per string`, uitleg: `Voc bij −10 °C: ${getal(grenzen.vocKoud, 1)} V per paneel (max. ${omvormer.maxVdc} V); Vmp bij 70 °C: ${getal(grenzen.vmpWarm, 1)} V (min. ${omvormer.mpptMin} V).` });
      }
      if (nodig > omvormer.mppt) {
        controles.push({ code: 'mppt', label: 'MPPT-ingangen', status: 'fout', waarde: `${nodig} nodig, ${omvormer.mppt} aanwezig`, uitleg: metOptimizers ? 'Te veel strings voor deze omvormer.' : 'Elk dakvlak met een andere richting vraagt een eigen ingang. Kies een omvormer met meer ingangen, zet een vlak uit of voeg optimizers toe.' });
      } else if (groepen.length) {
        controles.push({ code: 'mppt', label: 'MPPT-ingangen', status: 'ok', waarde: `${nodig} van ${omvormer.mppt}` });
      }
    }
  }
  const verbruik = Math.max(0, project.verbruik) + Math.max(0, project.extraVerbruik);
  if (project.laadpaal && project.aansluiting === 'mono') {
    controles.push({ code: 'laadpaal', label: 'Laadpaal', status: 'let-op', uitleg: 'Op een monofasige aansluiting laadt een wagen trager (max. ±7 kW). Controleer de hoofdzekering.' });
  }

  // Opbrengst en financieel.
  const productie = rond(groepen.reduce((t, g) => t + g.kwh, 0));
  const somO = MAAND_OPBRENGST.reduce((a, b) => a + b, 0), somV = MAAND_VERBRUIK.reduce((a, b) => a + b, 0);
  const productiePerMaand = MAAND_OPBRENGST.map((m) => rond((productie * m) / somO));
  const verbruikPerMaand = MAAND_VERBRUIK.map((m) => rond((verbruik * m) / somV));
  const zelfZonder = zelfverbruikZonder(productie, verbruik);
  const zelf = zelfZonder + extraDoorBatterij(batterij?.kwh ?? 0, productie, verbruik, zelfZonder);
  const injectie = Math.max(0, productie - zelf);
  const afname = Math.max(0, verbruik - zelf);

  // Offerte.
  const regels = offerteRegels(project, cat, { legplan, paneel, aantal, omvormer, aantalOmvormers, batterij, micro });
  const offerte = berekenOfferte({ posities: [], regels, kortingProcent: project.korting, btwProcent: project.woningOuderDan10 ? 6 : 21 });
  const investering = offerte.incl;
  const besparing = (jaar: number) => {
    const f = (1 - 0.004) ** (jaar - 1);
    const prijs = (1 + project.prijsstijging / 100) ** (jaar - 1);
    return (zelf * f * project.afnameprijs + injectie * f * project.injectieprijs) * prijs;
  };
  const cumulatief = [-investering];
  let terugverdientijd: number | null = null;
  for (let j = 1; j <= 25; j++) {
    const vorig = cumulatief[j - 1]!;
    const nu = vorig + besparing(j);
    if (terugverdientijd === null && vorig < 0 && nu >= 0) terugverdientijd = rond(j - 1 + -vorig / (nu - vorig), 1);
    cumulatief.push(rond(nu));
  }
  if (aantal > 0 && project.korting > 15) controles.push({ code: 'korting', label: 'Korting', status: 'let-op', waarde: `${project.korting} %`, uitleg: 'Hoge korting: controleer de marge.' });

  return {
    legplan, paneel, aantal, beschikbaar, kwp, omvormer, aantalOmvormers, omvormerAuto, batterij, groepen,
    ...grenzen, dcAc, acVermogen, productie, productiePerMaand, verbruik, verbruikPerMaand,
    zelfverbruik: rond(zelf), zelfverbruikZonderBatterij: rond(zelfZonder), injectie: rond(injectie), afname: rond(afname),
    autarkie: verbruik > 0 ? rond((zelf / verbruik) * 100) : 0,
    dekking: verbruik > 0 ? rond((productie / verbruik) * 100) : 0,
    besparingJaar1: rond(besparing(1)), terugverdientijd, cumulatief, winst25: cumulatief[25]!,
    co2: rond(productie * 0.2), regels, offerte, bestellijst: bestellijst(project, { legplan, paneel, omvormer, aantalOmvormers, batterij, groepen, micro }),
    controles, geldig: !controles.some((c) => c.status === 'fout'),
  };
}

const getal = (x: number, d = 0) => x.toFixed(d).replace('.', ',');

function offerteRegels(project: ZonProject, cat: ZonCatalogus, r: { legplan: VlakLegplan[]; paneel: Paneel; aantal: number; omvormer: Omvormer | null; aantalOmvormers: number; batterij: Batterij | null; micro: boolean }): OfferteRegel[] {
  const P = cat.prijzen;
  const regels: OfferteRegel[] = [];
  const regel = (code: string, groep: string, omschrijving: string, hoeveelheid: number, pk: PrijsKost, eenheid = 'st') => {
    if (hoeveelheid > 0) regels.push({ code, groep, omschrijving, eenheid, hoeveelheid, eenheidsprijs: pk.prijs, kostprijs: pk.kost });
  };
  if (r.aantal === 0) return regels;
  const pn = r.paneel;
  regel(pn.code, 'Zonnepanelen', `${pn.merk} ${pn.naam} – ${pn.wp} Wp, ${pn.uitzicht}, ${pn.lengte} × ${pn.breedte} mm, ${pn.garantie} jaar productgarantie`, r.aantal, pn);
  if (r.omvormer) {
    const o = r.omvormer;
    regel(o.code, 'Omvormer', `${o.merk} ${o.naam} – ${OMVORMER_SOORT[o.soort]}, ${o.soort === 'micro' ? `${o.ac} VA per stuk` : `${getal(o.ac / 1000, 1)} kVA, ${o.fasen === 1 ? 'monofasig' : 'driefasig'}, ${o.mppt} MPPT`}, ${o.garantie} jaar garantie`, r.aantalOmvormers, o);
  }
  if (project.optimizers && !r.micro) regel('optimizer', 'Omvormer', 'Optimizer per paneel (opbrengst per paneel, minder verlies bij schaduw)', r.aantal, P.optimizer);
  if (r.batterij) {
    regel(r.batterij.code, 'Thuisbatterij', `${r.batterij.merk} ${r.batterij.naam} – ${getal(r.batterij.kwh, 1)} kWh bruikbaar`, 1, r.batterij);
    regel('plaatsing_batterij', 'Thuisbatterij', 'Plaatsing en aansluiting thuisbatterij', 1, P.plaatsingBatterij);
  }
  // Montage per dakbedekking.
  const perBedekking = new Map<Bedekking, number>();
  for (const l of r.legplan) if (l.aantal) perBedekking.set(l.instelling.bedekking, (perBedekking.get(l.instelling.bedekking) ?? 0) + l.aantal);
  for (const [b, n] of perBedekking) regel(`montage_${b}`, 'Montage', `Montagesysteem ${BEDEKKING_LABEL[b]} (rails, haken, klemmen${b === 'plat' ? ', driehoeken en ballast' : ''})`, n, P.montage[b]);
  regel('arbeid', 'Montage', 'Plaatsing panelen op het dak', r.aantal, P.arbeidPaneel);
  const gebouwen = new Set(r.legplan.filter((l) => l.aantal).map((l) => l.vlak.gebouw));
  for (const g of gebouwen) {
    const plat = r.legplan.filter((l) => l.vlak.gebouw === g && l.aantal).every((l) => l.vlak.zijde === 'plat');
    const naam = project.gebouwen.find((x) => x.id === g)?.naam ?? g;
    regel(`stelling_${g}`, 'Montage', `Valbeveiliging en ladderlift – ${naam}${plat ? ' (plat dak)' : ''}`, 1, plat ? P.stellingPlat : P.stellingHellend, 'forfait');
  }
  regel('plaatsing_omvormer', 'Elektriciteit', r.micro ? 'Aansluiting micro-omvormers en AC-verdeelkast' : 'Plaatsing en aansluiting omvormer', 1, P.plaatsingOmvormer, 'forfait');
  regel('bekabeling', 'Elektriciteit', 'DC- en AC-bekabeling, beveiliging en aarding in de verdeelkast', 1, P.bekabeling, 'forfait');
  if (project.monitoring) regel('monitoring', 'Opties', 'Energiemeter en app (opvolging productie en verbruik)', 1, P.monitoring);
  if (project.laadpaal) regel('laadpaal', 'Opties', 'Slimme laadpaal 11 kW met laden op zonne-overschot, incl. plaatsing tot 10 m', 1, P.laadpaal);
  regel('keuring', 'Administratie', 'AREI-keuring door erkend keuringsorganisme', 1, P.keuring, 'forfait');
  regel('aanmelding', 'Administratie', 'Aanmelding bij de netbeheerder en opmaak dossier (schema’s, plan)', 1, P.aanmelding, 'forfait');
  return regels;
}

/** Wat de installateur bestelt: panelen, omvormer, montagemateriaal en kabel. */
function bestellijst(project: ZonProject, r: { legplan: VlakLegplan[]; paneel: Paneel; omvormer: Omvormer | null; aantalOmvormers: number; batterij: Batterij | null; groepen: StringGroep[]; micro: boolean }): BestelRegel[] {
  const lijst: BestelRegel[] = [];
  const voeg = (leverancier: string, artikel: string, omschrijving: string, aantal: number, eenheid = 'st') => {
    if (aantal > 0) lijst.push({ leverancier, artikel, omschrijving, aantal: rond(aantal, 1), eenheid });
  };
  const aantal = r.legplan.reduce((t, l) => t + l.aantal, 0);
  if (!aantal) return lijst;
  voeg('Groothandel PV', r.paneel.code, `${r.paneel.merk} ${r.paneel.naam}`, aantal);
  if (r.omvormer) voeg('Groothandel PV', r.omvormer.code, `${r.omvormer.merk} ${r.omvormer.naam}`, r.aantalOmvormers);
  if (project.optimizers && !r.micro) voeg('Groothandel PV', 'optimizer', 'Optimizer', aantal);
  if (r.batterij) voeg('Groothandel PV', r.batterij.code, `${r.batterij.merk} ${r.batterij.naam}`, 1);

  // Montage op een hellend dak: per rij en per aaneengesloten stuk 2 rails, eind- en middenklemmen, haken om de 120 cm.
  let railCm = 0, haken = 0, eind = 0, midden = 0, driehoeken = 0, ballast = 0;
  const haakNaam = new Set<string>();
  for (const l of r.legplan) {
    const act = l.panelen.filter((x) => x.actief);
    if (!act.length) continue;
    if (l.vlak.zijde === 'plat') {
      driehoeken += act.length;
      ballast += act.length * (l.instelling.opstelling === 'oostwest' ? 1.5 : 3);
      continue;
    }
    haakNaam.add(l.instelling.bedekking);
    const rijen = new Map<number, GelegdPaneel[]>();
    for (const x of act) rijen.set(x.rij, [...(rijen.get(x.rij) ?? []), x]);
    for (const rij of rijen.values()) {
      rij.sort((a, b) => a.kolom - b.kolom);
      let stuk: GelegdPaneel[] = [];
      const sluit = () => {
        if (!stuk.length) return;
        const lengte = stuk[stuk.length - 1]!.u + stuk[stuk.length - 1]!.b - stuk[0]!.u + 10;
        railCm += 2 * lengte;
        haken += 2 * (Math.ceil(lengte / 120) + 1);
        eind += 4;
        midden += 2 * (stuk.length - 1);
        stuk = [];
      };
      for (const x of rij) {
        if (stuk.length && x.kolom !== stuk[stuk.length - 1]!.kolom + 1) sluit();
        stuk.push(x);
      }
      sluit();
    }
  }
  const haak = [...haakNaam].map((b) => ({ pannen: 'dakhaken (pannen)', leien: 'leihaken', golfplaat: 'stokschroeven', plat: '' }[b])).join(' / ');
  voeg('Montagesystemen', 'rail', 'Aluminium montagerail, staaf 4,20 m', Math.ceil(railCm / 420));
  voeg('Montagesystemen', 'railverbinder', 'Railverbinder', Math.max(0, Math.ceil(railCm / 420) - 1));
  voeg('Montagesystemen', 'haak', haak ? haak.charAt(0).toUpperCase() + haak.slice(1) : 'Haken', haken);
  voeg('Montagesystemen', 'eindklem', 'Eindklem (zwart)', eind);
  voeg('Montagesystemen', 'middenklem', 'Middenklem (zwart)', midden);
  voeg('Montagesystemen', 'driehoek', 'Opstelling plat dak (driehoek + bak)', driehoeken);
  voeg('Montagesystemen', 'ballast', 'Ballaststeen 12,5 kg (na berekening windbelasting)', Math.ceil(ballast));
  const strings = r.groepen.reduce((t, g) => t + g.strings.length, 0);
  voeg('Elektro', 'solarkabel', 'Solarkabel 6 mm² (rood + zwart)', r.micro ? 0 : strings * 2 * 15 + 10, 'm');
  voeg('Elektro', 'mc4', 'MC4-stekkers (paar)', r.micro ? 0 : strings * 2 + 2);
  voeg('Elektro', 'ac_kabel', r.micro ? 'AC-stamkabel micro-omvormers met eindkap' : 'AC-kabel XVB 5G6 (of 3G6)', r.micro ? Math.ceil(aantal / 8) : 15, r.micro ? 'st' : 'm');
  voeg('Elektro', 'beveiliging', 'Automaat + differentieel 30 mA type A', 1);
  return lijst;
}
