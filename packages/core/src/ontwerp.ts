/**
 * Vrij zetelontwerp: de gebruiker tekent zelf een opstelling uit elementen
 * (zitelement, hoekelement, chaise longue, arm, poef …) op een bovenaanzicht.
 * Elk element heeft eigen maten per cm, een draaiing en eventueel een eigen materiaal.
 *
 * berekenOntwerp() controleert het ontwerp (maten, overlap, losse elementen) en
 * berekent prijs, stofverbruik per materiaal, stuklijst en tekening.
 */
import type { Echt3D } from './echt3d.js';
import { gebruiksklasse, materiaalArtikel, patroonfactor, type Materiaal } from './materialen.js';
import { kuipOpbouw, kuipParameters } from './kuip.js';
import type { Melding, StuklijstResultaat, TekeningResultaat, VormResultaat } from './types.js';

export type Rotatie = 0 | 90 | 180 | 270;

export interface Bereik {
  min: number;
  max: number;
  standaard: number;
}

/** Hoe een element getekend wordt (waar de rug zit, afgerond of niet). */
export type Tekenstijl = 'zit' | 'hoek' | 'chaise' | 'arm' | 'poef' | 'zit_zonder_rug' | 'console' | 'rond' | 'kuip' | 'rugleuning' | 'kussen' | 'rolkussen';

/** Eén keuze binnen een optiegroep (bv. poten: "Conische poot"). */
export interface OptieKeuze {
  code: string;
  label: string;
  uitleg?: string;
  /** Vaste meerprijs (per element als de groep per element telt, anders per zetel). */
  prijs?: number;
  /** Meerprijs per meter breedte van het element. */
  prijsPerM?: number;
  /** Meerprijs in % op de basisprijs (van het element, of van alle elementen). */
  pct?: number;
  /** Kostprijs: vast en per meter breedte. */
  kost?: number;
  kostPerM?: number;
  /** Extra stofverbruik in %. */
  stofPct?: number;
  /** Gegevens voor de tekening (kleur, vorm, hoogte …). */
  teken?: Record<string, number | string | boolean>;
  /** Alleen mogelijk als andere groepen één van deze keuzes hebben, bv. { poothoogte: ['laag'] }. */
  alleenMet?: Record<string, string[]>;
  /** Uitleg als de combinatie niet kan. */
  reden?: string;
}

export interface OptieGroep {
  code: string;
  label: string;
  /** 'ontwerp' = één keuze voor de hele zetel; 'element' = per element te kiezen. */
  niveau: 'ontwerp' | 'element';
  /** Bij niveau 'ontwerp': wordt de prijs per element aangerekend (bv. poten per element)? */
  perElement?: boolean;
  /** Alleen voor deze elementtypes (bv. armstijl alleen voor armleuningen). */
  voorTypen?: string[];
  standaard: string;
  keuzes: OptieKeuze[];
}

export interface ElementType {
  code: string;
  label: string;
  /** Breedte (cm) = de kant met de rug; diepte (cm) = van rug naar voorkant. */
  breedte: Bereik;
  diepte: Bereik;
  tekenstijl: Tekenstijl;
  /**
   * Opzet-element: ligt bovenop een ander element (rugleuning, rugkussen, sierkussen, rolkussen).
   * Mag overlappen met het element eronder, maar moet er wel op liggen.
   */
  opzet?: boolean;
  /** Staande hoogte (cm) van een kussen; standaard 0,9 × de breedte. */
  hoogte?: number;
  /** Verkoopprijs bij minimale breedte en standaarddiepte, per prijsgroep. */
  prijs: Record<string, number>;
  /** Meerprijs per begonnen 10 cm boven de minimale breedte, per prijsgroep. */
  per10cm: Record<string, number>;
  /** Stofverbruik (m bij 140 cm rolbreedte): vast + per meter breedte. */
  stofVast: number;
  stofPerM: number;
  /** Kostprijs frame en vulling: vast + per meter breedte. */
  kostVast: number;
  kostPerM: number;
  /** Atelieruren: vast + per meter breedte. */
  uren: number;
  urenPerM: number;
}

/**
 * Vormgeving: de vorm van een element zelf. Instelbaar voor het hele model (Ontwerp.vormgeving)
 * en per element (OntwerpElement.vorm) in de ontwerpmodus.
 */
export interface Vormgeving {
  /** Dikte van de rug in cm. */
  rugdikte: number;
  /** Dikte van de zitkussens in cm. */
  kussendikte: number;
  /** Aantal zitkussens op één element. */
  zitkussens: number;
  /** Zachtheid: afronding van kussens en randen (0 = strak, 10 = heel zacht). */
  zachtheid: number;
  /** Vorm van de rug. */
  rugvorm: 'recht' | 'hellend' | 'rond';
  /** Zichtbaar houten frame rond de zitting. */
  houtframe: 'geen' | 'zijkant' | 'rondom';
  /** Dikte (diepte) van de losse rugkussens in cm. */
  rugkussendikte: number;
  /** Aantal losse rugkussens per element; leeg = evenveel als zitkussens (bv. één lang zitkussen met twee rugkussens). */
  rugkussens?: number;
  /**
   * Hoogte van het karkas (rug en armen) bij losse rugkussens, in cm; de rugkussens steken erboven uit tot de
   * rughoogte. Leeg = 10 cm onder de rughoogte. Bij de modellen van de klant: "totale hoogte corpus" van de website.
   */
  karkashoogte?: number;
  /**
   * Opbouw van een rij zitelementen in de 3D: per element (zoals altijd) of doorlopend: één onderbouw, één zitting en één
   * lage rug die rond de afgeronde uiteinden loopt (zoals Doha en Montego), zie doorlopend.ts. Prijs en tekeningen blijven
   * per element.
   */
  opbouw?: 'elementen' | 'doorlopend';
  /** Bij een doorlopende opbouw: hoeveel cm de uiteinden naar voren komen (een boog, zoals Montego); 0 = recht. */
  bocht: number;
  /**
   * Eigen vorm van de kuipfauteuil van dit model: velden die de gekozen kuipvorm overschrijven (zie KuipParameters in
   * kuip.ts: dikte, boog, voorBoven, profiel, zitTrommel, zitRand, schaalOp …). Zo is de vorm van een model gegevens in
   * het modelbestand, geen code in de motor. Benadering uit de productfoto's; de prijs leest dit niet.
   */
  kuip?: Record<string, unknown>;
  /**
   * Vrije hoogtes in cm (bv. getekend in het vooraanzicht). Leeg = volgens de gekozen opties.
   * Rughoogte en armhoogte gelden per element; zithoogte en poothoogte voor de hele zetel.
   */
  rughoogte?: number;
  armhoogte?: number;
  zithoogte?: number;
  poothoogte?: number;
}

export const HOOGTE_BEREIK = {
  rughoogte: { min: 55, max: 110 },
  karkashoogte: { min: 40, max: 95 },
  armhoogte: { min: 40, max: 85 },
  zithoogte: { min: 35, max: 55 },
  poothoogte: { min: 0, max: 30 },
} as const;

/**
 * De hoogtes van een element in cm: vrij getekende waarden (vormgeving) of anders de gekozen opties.
 * Zithoogte en poothoogte komen van de zetel (Ontwerp.vormgeving), rug- en armhoogte van het element.
 */
export function hoogtesVan(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, e?: OntwerpElement) {
  const zetel = gekozenOpties(ontwerp, catalogus);
  const opt = e ? gekozenOpties(ontwerp, catalogus, e) : zetel;
  const v = vormgevingVan(ontwerp, e);
  const getal = (x: unknown, s: number) => (typeof x === 'number' && Number.isFinite(x) ? x : s);
  return {
    zithoogte: getal(ontwerp.vormgeving?.zithoogte, getal(zetel.get('zithoogte')?.teken?.hoogte, 45)),
    poothoogte: getal(ontwerp.vormgeving?.poothoogte, getal(opt.get('poothoogte')?.teken?.hoogte ?? zetel.get('poothoogte')?.teken?.hoogte, 12)),
    rughoogte: getal(v.rughoogte, getal(opt.get('rughoogte')?.teken?.hoogte, 80)),
    armhoogte: getal(v.armhoogte, getal(opt.get('armhoogte')?.teken?.hoogte, 62)),
  };
}

export const STANDAARD_VORMGEVING: Vormgeving = { rugdikte: 18, kussendikte: 14, zitkussens: 1, zachtheid: 4, rugvorm: 'recht', houtframe: 'geen', rugkussendikte: 14, bocht: 0 };

export const VORMGEVING_BEREIK = {
  rugdikte: { min: 10, max: 30 },
  kussendikte: { min: 8, max: 22 },
  zitkussens: { min: 1, max: 3 },
  zachtheid: { min: 0, max: 10 },
  rugkussendikte: { min: 10, max: 30 },
  bocht: { min: 0, max: 60 },
} as const;

/** Meerprijzen voor de vormgeving (per element). */
export interface VormgevingPrijzen {
  /** Per extra zitkussen boven 1. */
  extraKussen: number;
  /** Meerprijs in % voor een hellende of ronde rug. */
  hellendeRugPct: number;
  rondeRugPct: number;
  /** Per cm rugdikte boven de standaard, per meter breedte. */
  dikkereRugPerCmPerM: number;
  /** Houten frame, per meter breedte. */
  houtframeZijkant: number;
  houtframeRondomPerM: number;
}

/** Een model uit de collectie: een vertrekopstelling met eigen vormgeving en opties. */
export interface ModelDefinitie {
  code: string;
  naam: string;
  familie: string;
  omschrijving: string;
  /** Uitleg over hoe zeker de gegevens zijn (bv. "benadering op basis van foto"). */
  bron?: string;
  /** Sleutel van de productfoto (de demo laadt de foto's apart). */
  foto?: string;
  /** Bijschrift bij de foto (standaard "foto website"). */
  fotoBijschrift?: string;
  ontwerp: Ontwerp;
  /** Echt 3D-bestand voor de 3D-weergave (anders de benadering met blokken). */
  echt3d?: Echt3D;
}

export interface OntwerpCatalogus {
  naam: string;
  /** Prijsgroepen, bv. A, B, C, EIGEN. */
  groepen: string[];
  typen: ElementType[];
  /** Meerprijs in % per begonnen 10 cm extra diepte boven de standaarddiepte. */
  diepteToeslagPctPer10cm: number;
  uurloon: number;
  btwProcent: number;
  /** Totale breedte waarboven een waarschuwing voor levering verschijnt. */
  leveringWaarschuwingVanaf?: number;
  /** Aanpassingen: poten, armstijl, rug, comfort, naden, hout, extra's … */
  opties?: OptieGroep[];
  vormgevingPrijzen?: VormgevingPrijzen;
}

export interface OntwerpElement {
  id: string;
  type: string;
  /** Linkerbovenhoek van de voetafdruk in het bovenaanzicht (cm). */
  x: number;
  y: number;
  breedte: number;
  diepte: number;
  /** 0 = rug boven, 90 = rug rechts, 180 = rug onder, 270 = rug links. */
  rotatie: Rotatie;
  /** Eigen materiaal voor dit element; anders het hoofdmateriaal. */
  materiaal?: string;
  /** Keuzes voor optiegroepen op elementniveau (groepcode → keuzecode). */
  opties?: Record<string, string>;
  /** Eigen vormgeving van dit element (ontwerpmodus); overschrijft die van het model. */
  vorm?: Partial<Vormgeving>;
}

export interface Ontwerp {
  hoofdmateriaal: string;
  elementen: OntwerpElement[];
  /** Keuzes voor optiegroepen op zetelniveau (groepcode → keuzecode). */
  opties?: Record<string, string>;
  /** Vormgeving voor het hele model. */
  vormgeving?: Partial<Vormgeving>;
  /** Code van het model waarvan dit ontwerp vertrok (informatief). */
  model?: string;
}

/** Oppervlak (cm²) waarmee twee elementen elkaar overlappen. */
export function overlapOppervlak(a: OntwerpElement, b: OntwerpElement): number {
  const p = voetafdruk(a), q = voetafdruk(b);
  const ox = Math.min(p.x + p.b, q.x + q.b) - Math.max(p.x, q.x);
  const oy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
  return ox > 0 && oy > 0 ? ox * oy : 0;
}

/** Soorten elementen waarop een rugleuning of kussen kan liggen (niet op een arm of houten tussenstuk). */
export const DRAGER_STIJLEN: Tekenstijl[] = ['zit', 'hoek', 'chaise', 'zit_zonder_rug', 'rond', 'kuip', 'poef'];
/** Deel van een opzet-element dat op zittingen moet liggen; anders "ligt niet op een zitting". */
const OPZET_MIN_OP_ZITTING = 0.6;

/**
 * Het element waarop een opzet-element (rugleuning, kussen) ligt: de zitting met de grootste overlap. Het moet voor
 * meer dan de helft op zittingen liggen: een rugleuning die 1 cm op een zit ligt, zweefde vroeger in de lucht.
 */
export function dragerVan(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, e: OntwerpElement): OntwerpElement | undefined {
  const dragers = new Set(catalogus.typen.filter((t) => !t.opzet && DRAGER_STIJLEN.includes(t.tekenstijl)).map((t) => t.code));
  let beste: OntwerpElement | undefined;
  let max = 0;
  let totaal = 0;
  for (const o of ontwerp.elementen) {
    if (o === e || !dragers.has(o.type)) continue;
    const opp = overlapOppervlak(e, o);
    totaal += opp;
    if (opp > max) { max = opp; beste = o; }
  }
  const eigen = e.breedte * e.diepte;
  return eigen > 0 && totaal >= OPZET_MIN_OP_ZITTING * eigen ? beste : undefined;
}

/**
 * Hoogte (cm) waarop een opzet-element (rugleuning, kussen) rust: de bovenkant van de basis van het element eronder
 * (bij een poef de bovenkant van de poef), of de poothoogte als het nergens op ligt. Eén bron voor het vooraanzicht,
 * de 3D en het hoogteveld in de ontwerper.
 */
export function draagHoogteVan(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, e: OntwerpElement): number {
  const h = hoogtesVan(ontwerp, catalogus);
  const d = dragerVan(ontwerp, catalogus, e);
  if (!d) return h.poothoogte;
  if (catalogus.typen.find((t) => t.code === d.type)?.tekenstijl === 'poef') return h.zithoogte - 2;
  const vaste = gekozenOpties(ontwerp, catalogus, d).get('zitting')?.code === 'vaste_zitting';
  return h.zithoogte - (vaste ? 0 : vormgevingVan(ontwerp, d).kussendikte);
}

/**
 * Hoogte (cm) van het karkas (de vaste rug achter de kussens). Met losse rugkussens: de karkashoogte uit de vormgeving
 * (anders 10 cm onder de rughoogte), tussen 5 cm boven de zitting en de rughoogte; de kussens steken erboven uit.
 * Zonder losse rugkussens is het karkas de rug zelf. Eén bron voor de 3D en het vooraanzicht.
 */
export function karkasHoogteVan(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, e: OntwerpElement, losseRug: boolean): number {
  const h = hoogtesVan(ontwerp, catalogus, e);
  if (!losseRug) return h.rughoogte;
  const v = vormgevingVan(ontwerp, e);
  return Math.min(h.rughoogte, Math.max(h.zithoogte + 5, v.karkashoogte ?? h.rughoogte - 10));
}

/** Losse rugleuning: minstens zoveel cm boven waar ze op rust. */
export const RUGLEUNING_MIN_BOVEN = 20;

/** Bovenkant (cm boven de vloer) van een losse rugleuning: de rughoogte, maar minstens 20 cm boven waar ze op rust. */
export function rugleuningTop(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, e: OntwerpElement): number {
  return Math.max(hoogtesVan(ontwerp, catalogus, e).rughoogte, draagHoogteVan(ontwerp, catalogus, e) + RUGLEUNING_MIN_BOVEN);
}

/**
 * Materiaalcode van een element: eigen keuze, anders (voor rugleuning/kussen) die van het element eronder,
 * anders het hoofdmateriaal.
 */
export function materiaalVan(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, e: OntwerpElement): string {
  if (e.materiaal) return e.materiaal;
  if (catalogus.typen.find((t) => t.code === e.type)?.opzet) {
    const d = dragerVan(ontwerp, catalogus, e);
    if (d?.materiaal) return d.materiaal;
  }
  return ontwerp.hoofdmateriaal;
}

/** De vormgeving van een element: standaard ← model ← element. */
export function vormgevingVan(ontwerp: Ontwerp, e?: OntwerpElement): Vormgeving {
  return { ...STANDAARD_VORMGEVING, ...(ontwerp.vormgeving ?? {}), ...(e?.vorm ?? {}) };
}

/** De gekozen keuze per optiegroep voor een element (of voor de zetel als element ontbreekt). */
export function gekozenOpties(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, e?: OntwerpElement): Map<string, OptieKeuze> {
  const uit = new Map<string, OptieKeuze>();
  for (const g of catalogus.opties ?? []) {
    if (e && g.voorTypen && !g.voorTypen.includes(e.type)) continue;
    if (!e && g.niveau === 'element') continue;
    const code = (g.niveau === 'element' ? e?.opties?.[g.code] : ontwerp.opties?.[g.code]) ?? g.standaard;
    const k = g.keuzes.find((x) => x.code === code) ?? g.keuzes.find((x) => x.code === g.standaard);
    if (k) uit.set(g.code, k);
  }
  return uit;
}

export interface OntwerpMelding extends Melding {
  elementId?: string;
}

export interface ElementResultaat {
  id: string;
  type: string;
  label: string;
  breedte: number;
  diepte: number;
  materiaal: string;
  groep: string;
  /** Prijs inclusief opties van dit element. */
  prijs: number;
  /** Waarvan opties. */
  optieBedrag: number;
  stofM: number;
}

export interface OptieBedrag {
  groep: string;
  groepLabel: string;
  keuze: string;
  keuzeLabel: string;
  bedrag: number;
}

export interface OntwerpResultaat {
  geldig: boolean;
  meldingen: OntwerpMelding[];
  elementen: ElementResultaat[];
  afmetingen: { breedte: number; diepte: number; x: number; y: number };
  stof: { materiaal: string; naam: string; meters: number }[];
  /** Meerprijzen per optie (opgeteld over alle elementen). */
  opties: OptieBedrag[];
  stuklijst: StuklijstResultaat[];
  prijs: {
    kostprijs: number;
    brutoprijsExcl: number;
    kortingProcent: number;
    verkoopprijsExcl: number;
    margeProcent: number | null;
    btw: number;
    verkoopprijsIncl: number;
  };
  tekening: TekeningResultaat;
}

const rond = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
/** Getal in een melding: Belgische schrijfwijze (komma) en een echt minteken. */
const nl = (x: number) => rond(x, 1).toLocaleString('nl-BE', { maximumFractionDigits: 1 }).replace('-', '−');

/** De voetafdruk van een element in het bovenaanzicht (rekening houdend met draaiing). */
export function voetafdruk(e: Pick<OntwerpElement, 'x' | 'y' | 'breedte' | 'diepte' | 'rotatie'>) {
  const liggend = e.rotatie === 0 || e.rotatie === 180;
  return { x: e.x, y: e.y, b: liggend ? e.breedte : e.diepte, h: liggend ? e.diepte : e.breedte };
}

/** Overlapping (oppervlak > 0,5 cm in beide richtingen). */
function overlappen(a: OntwerpElement, b: OntwerpElement): boolean {
  const p = voetafdruk(a), q = voetafdruk(b);
  const ox = Math.min(p.x + p.b, q.x + q.b) - Math.max(p.x, q.x);
  const oy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
  return ox > 0.5 && oy > 0.5;
}

/** Raken twee elementen elkaar (afstand ≤ 1 cm, met een gemeenschappelijke rand)? */
function raken(a: OntwerpElement, b: OntwerpElement): boolean {
  const p = voetafdruk(a), q = voetafdruk(b);
  const gx = Math.max(p.x, q.x) - Math.min(p.x + p.b, q.x + q.b);
  const gy = Math.max(p.y, q.y) - Math.min(p.y + p.h, q.y + q.h);
  return gx <= 1 && gy <= 1 && !(gx > 0 && gy > 0);
}

/** Donkerdere tint voor rug en armen. */
function donkerder(hex: string, factor = 0.86): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * factor));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Zet een rechthoek in lokale coördinaten (breedte × diepte, rug boven) om naar het bovenaanzicht. */
export function lokaalNaarWereld(e: OntwerpElement, lx: number, ly: number, lb: number, lh: number) {
  const B = e.breedte, D = e.diepte;
  switch (e.rotatie) {
    case 90: // rug rechts
      return { x: e.x + (D - ly - lh), y: e.y + lx, b: lh, h: lb };
    case 180: // rug onder
      return { x: e.x + (B - lx - lb), y: e.y + (D - ly - lh), b: lb, h: lh };
    case 270: // rug links
      return { x: e.x + ly, y: e.y + (B - lx - lb), b: lh, h: lb };
    default:
      return { x: e.x + lx, y: e.y + ly, b: lb, h: lh };
  }
}

const RUG = 18;

/** Rugleuning van een chaise longue (optie "chaise_rug"): achteraan, links of rechts (lokaal), of geen. */
export function chaiseRugVan(opties: Map<string, OptieKeuze>): 'achter' | 'links' | 'rechts' | null {
  const k = opties.get('chaise_rug')?.teken?.kant;
  return k === 'achter' || k === 'links' || k === 'rechts' ? k : null;
}
/**
 * Wat de vormgeving bij dit soort element zichtbaar verandert (en dus aangerekend wordt), volgens de regels van de 3D:
 * heeft het een rug (rugopties, rughoogte), telt de rugvorm en -dikte, liggen er meerdere zitkussens naast elkaar,
 * en kan er een houten frame rond. Zo rekenen we niets aan wat de klant niet ziet, en omgekeerd.
 */
export interface VormEffect { rug: boolean; rugvorm: boolean; kussens: boolean; houtframe: boolean }
export function vormEffect(stijl: Tekenstijl, opties: Map<string, OptieKeuze>): VormEffect {
  switch (stijl) {
    case 'zit': return { rug: true, rugvorm: true, kussens: true, houtframe: true };
    case 'hoek': return { rug: true, rugvorm: true, kussens: true, houtframe: false };
    case 'rond': return { rug: true, rugvorm: true, kussens: false, houtframe: false };
    case 'zit_zonder_rug': return { rug: false, rugvorm: false, kussens: true, houtframe: true };
    case 'chaise': {
      const kant = chaiseRugVan(opties);
      return { rug: kant !== null, rugvorm: kant !== null, kussens: kant !== 'links' && kant !== 'rechts', houtframe: kant === null || kant === 'achter' };
    }
    // De gebogen kuipwand volgt de rughoogte, niet de rugvorm (behalve bij de hoekige fauteuil).
    case 'kuip': return { rug: true, rugvorm: !kuipParameters(opties.get('kuipvorm')?.teken), kussens: false, houtframe: false };
    case 'rugleuning': return { rug: true, rugvorm: false, kussens: false, houtframe: false };
    default: return { rug: false, rugvorm: false, kussens: false, houtframe: false };
  }
}

/** Optiegroepen over de rug: niet aan te rekenen op een element zonder rug (chaise longue zonder rugleuning). */
const RUGGROEPEN = ['rug', 'rughoogte', 'nekrol'];

/** Een vrij getekende hoogte vervangt de gekozen maat; voor de prijs telt de keuze met de dichtstbijzijnde hoogte. */
function keuzeBijHoogte(g: OptieGroep, h: number): OptieKeuze | undefined {
  let beste: OptieKeuze | undefined;
  let afstand = Infinity;
  for (const k of g.keuzes) {
    const kh = k.teken?.hoogte;
    if (typeof kh !== 'number') continue;
    const d = Math.abs(kh - h);
    // Bij gelijke afstand de hogere keuze (een hogere zetel is nooit goedkoper).
    if (d < afstand - 1e-9 || (Math.abs(d - afstand) < 1e-9 && kh > Number(beste?.teken?.hoogte))) { beste = k; afstand = d; }
  }
  return beste;
}

/** Rechthoek (lokaal) van de rugleuning van een chaise longue, en het zitvlak dat overblijft. */
export function chaiseRugVlak(B: number, D: number, R: number, kant: 'achter' | 'links' | 'rechts') {
  if (kant === 'achter') return { rug: { lx: 0, ly: 0, lb: B, ld: R }, zit: { lx: 0, ly: R, lb: B, ld: D - R } };
  if (kant === 'links') return { rug: { lx: 0, ly: 0, lb: R, ld: D }, zit: { lx: R, ly: 0, lb: B - R, ld: D } };
  return { rug: { lx: B - R, ly: 0, lb: R, ld: D }, zit: { lx: 0, ly: 0, lb: B - R, ld: D } };
}

function tekenElement(e: OntwerpElement, stijl: Tekenstijl, kleur: string, opties: Map<string, OptieKeuze> = new Map(), v: Vormgeving = STANDAARD_VORMGEVING): VormResultaat[] {
  const B = e.breedte, D = e.diepte;
  const donker = donkerder(kleur);
  const t = (groep: string, veld: string) => opties.get(groep)?.teken?.[veld];
  const hout = String(t('hout', 'kleur') ?? '#c8a27a');
  const delen: [string, number, number, number, number, string, number][] = [];
  const R = v.rugdikte;
  const zacht = 1 + v.zachtheid * 0.8;
  const frame = v.houtframe === 'geen' ? 0 : 4;
  /** Zitkussens naast elkaar in het zitvlak (lx0..lx0+bz, ly0..ly0+dz). */
  const kussens = (lx0: number, ly0: number, bz: number, dz: number) => {
    const n = Math.max(1, Math.round(v.zitkussens));
    const kb = bz / n;
    for (let i = 0; i < n; i++) delen.push([n > 1 ? `kussen${i + 1}` : 'kussen', lx0 + i * kb + (i ? 0.5 : 0), ly0, kb - (i < n - 1 ? 1 : 0), dz, kleur, zacht]);
  };
  const houtrand = () => {
    if (!frame) return;
    delen.push(['frame-l', 0, 0, frame, D, hout, 1], ['frame-r', B - frame, 0, frame, D, hout, 1]);
    if (v.houtframe === 'rondom') delen.push(['frame-v', frame, D - frame, B - 2 * frame, frame, hout, 1]);
  };
  switch (stijl) {
    case 'zit':
      houtrand();
      delen.push(['rug', frame, 0, B - 2 * frame, R, donker, v.rugvorm === 'rond' ? R / 2 : 3]);
      kussens(frame + 1, R + 1, B - 2 * frame - 2, D - R - 2 - (v.houtframe === 'rondom' ? frame : 1));
      break;
    case 'hoek':
      delen.push(['rug', 0, 0, B, R, donker, 3], ['rug2', 0, R, R, D - R, donker, 3]);
      kussens(R + 1, R + 1, B - R - 3, D - R - 3);
      break;
    case 'chaise': {
      houtrand();
      const kant = chaiseRugVan(opties);
      if (kant) {
        const { rug, zit } = chaiseRugVlak(B, D, R, kant);
        delen.push(['rug', rug.lx, rug.ly, rug.lb, rug.ld, donker, v.rugvorm === 'rond' ? R / 2 : 3]);
        const fl = kant === 'links' ? 0 : frame, fr = kant === 'rechts' ? 0 : frame;
        kussens(zit.lx + fl + 1, zit.ly + 1, zit.lb - fl - fr - 2, zit.ld - 2 - (v.houtframe === 'rondom' ? frame : 0));
      } else kussens(frame + 1, 1, B - 2 * frame - 2, D - 2 - (v.houtframe === 'rondom' ? frame : 0));
      break;
    }
    case 'arm': {
      const vorm = String(t('armstijl', 'vorm') ?? 'strak');
      const r = vorm === 'rond' || vorm === 'engels' ? Math.min(B, D) / 2 : vorm === 'schuin' ? Math.min(B, D) / 4 : 2;
      if (vorm === 'hout') delen.push(['arm', 0, 0, B, D, hout, 2]);
      else delen.push(['arm', 0, 0, B, D, donker, r]);
      if (vorm === 'houtblad') delen.push(['blad', 1, 1, B - 2, D - 2, hout, 2]);
      break;
    }
    case 'console':
      delen.push(['console', 0, 0, B, D, hout, 1.5], ['blad', 3, 3, B - 6, D - 6, donkerder(hout, 0.93), 1]);
      break;
    case 'rond': {
      // Afgerond eindelement: halfronde buitenkant, rug alleen op het rechte deel.
      const links = String(t('ronde_kant', 'kant') ?? 'links') === 'links';
      const r = Math.min(D / 2, B);
      const rugB = Math.max(0, B - r);
      const vormen: VormResultaat[] = [];
      const lokaalPad = (code: string, punten: string, vulling: string) => {
        const w = lokaalNaarWereld(e, 0, 0, B, D);
        vormen.push({ code: `${e.id}.${code}`, x: rond(w.x), y: rond(w.y), breedte: rond(w.b), hoogte: rond(w.h), vulling, pad: punten });
      };
      // Contour in lokale coördinaten → wereld via de vier hoeken (draaiing in stappen van 90°).
      const naarW = (lx: number, ly: number) => {
        const w = lokaalNaarWereld(e, lx, ly, 0, 0);
        return `${rond(w.x)} ${rond(w.y)}`;
      };
      const boog = (cx: number, cy: number, van: number, tot: number, rr: number) => {
        const stappen = 10;
        const pts: string[] = [];
        for (let i = 0; i <= stappen; i++) {
          const a = van + ((tot - van) * i) / stappen;
          pts.push(naarW(cx + rr * Math.cos(a), cy + rr * Math.sin(a)));
        }
        return pts;
      };
      const omtrek = links
        ? [naarW(B, 0), naarW(B, D), naarW(r, D), ...boog(r, D / 2, Math.PI / 2, (3 * Math.PI) / 2, D / 2).slice(1), naarW(B, 0)]
        : [naarW(0, 0), naarW(B - r, 0), ...boog(B - r, D / 2, -Math.PI / 2, Math.PI / 2, D / 2).slice(1), naarW(0, D), naarW(0, 0)];
      lokaalPad('zit', `M${omtrek.join(' L')} Z`, kleur);
      if (rugB > 0) {
        const lx = links ? r : 0;
        const w = lokaalNaarWereld(e, lx, 0, rugB, R);
        vormen.push({ code: `${e.id}.rug`, x: rond(w.x), y: rond(w.y), breedte: rond(w.b), hoogte: rond(w.h), vulling: donker, afronding: 3 });
      }
      return vormen;
    }
    case 'poef': {
      const vorm = String(t('poefvorm', 'vorm') ?? 'kiezel');
      if (vorm === 'rond') return [ellips(e, 'poef', kleur)];
      delen.push(['poef', 0, 0, B, D, kleur, vorm === 'vierkant' ? 4 : Math.min(B, D) / 2.5]);
      break;
    }
    case 'kuip': {
      // Kuip met gebogen wand: grondvlak, zitting en de wand als band met ronde uiteinden (zie kuip.ts).
      const kp = kuipParameters(opties.get('kuipvorm')?.teken, v.kuip);
      if (kp) {
        const opb = kuipOpbouw(B, D, { P: 10, zithoogte: 45, rugH: 80, kussenDik: 12 }, kp, opties.get('rug')?.teken?.los === true);
        const naarW = (lx: number, ly: number) => { const w = lokaalNaarWereld(e, lx, ly, 0, 0); return `${rond(w.x)} ${rond(w.y)}`; };
        const w0 = lokaalNaarWereld(e, 0, 0, B, D);
        const vorm = (code: string, punten: string[], vulling: string): VormResultaat =>
          ({ code: `${e.id}.${code}`, x: rond(w0.x), y: rond(w0.y), breedte: rond(w0.b), hoogte: rond(w0.h), vulling, pad: `M${punten.join(' L')} Z` });
        const uit: VormResultaat[] = [vorm('zit', opb.plan.map(([x, y]) => naarW(x, y)), kleur), vorm('kussen', opb.zit.map(([x, y]) => naarW(x, y)), kleur)];
        // Wand: buitenkant heen, rond uiteinde, binnenkant terug, rond begin.
        const p = opb.wand.pad, h = opb.wand.dikte / 2;
        const nrm = p.map((q, i) => {
          const a = p[Math.max(0, i - 1)]!, c = p[Math.min(p.length - 1, i + 1)]!;
          const tx = c[0] - a[0], ty = c[1] - a[1], l = Math.hypot(tx, ty) || 1;
          return [ty / l, -tx / l, tx / l, ty / l] as const; // normaal (x, y) en richting (x, y)
        });
        const kap = (i: number, van: 1 | -1) => {
          const q = p[i]!, [nx, ny, tx, ty] = nrm[i]!;
          const pts: string[] = [];
          for (let k = 1; k < 8; k++) {
            const a = (k / 8) * Math.PI;
            const cx = Math.cos(a) * van, sx = Math.sin(a);
            pts.push(naarW(q[0] + (nx * cx + tx * sx * van) * h, q[1] + (ny * cx + ty * sx * van) * h));
          }
          return pts;
        };
        const buiten = p.map((q, i) => naarW(q[0] + nrm[i]![0] * h, q[1] + nrm[i]![1] * h));
        const binnen = p.map((q, i) => naarW(q[0] - nrm[i]![0] * h, q[1] - nrm[i]![1] * h)).reverse();
        uit.push(vorm('rug', [...buiten, ...kap(p.length - 1, 1), ...binnen, ...kap(0, -1)], donker));
        opb.rugkussens.forEach((k, i) => delen.push([`rugkussen${opb.rugkussens.length > 1 ? i + 1 : ''}`, k.lx, k.ly, k.lb, k.ld, kleur, 4]));
        return [...uit, ...naarWereld()];
      }
      const vorm = String(t('kuipvorm', 'vorm') ?? 'afgerond');
      const armB = Math.max(10, Math.min(20, B * 0.16));
      const uit: VormResultaat[] = [];
      if (vorm === 'rond') uit.push(ellips(e, 'zit', kleur));
      else delen.push(['zit', 0, 0, B, D, kleur, vorm === 'hoekig' ? 3 : Math.min(B, D) / 3]);
      delen.push(['rug', 0, 0, B, R, donker, R / 2]);
      delen.push(['arm-l', 0, R / 2, armB, D * 0.65, donker, armB / 2], ['arm-r', B - armB, R / 2, armB, D * 0.65, donker, armB / 2]);
      return [...uit, ...naarWereld()];
    }
    case 'rugleuning':
      delen.push(['rugleuning', 0, 0, B, D, donker, Math.min(D / 2, 2 + v.zachtheid)]);
      break;
    case 'kussen':
      delen.push(['kussen', 0, 0, B, D, kleur, Math.min(B, D) / 2.5]);
      break;
    case 'rolkussen':
      delen.push(['rol', 0, 0, B, D, kleur, D / 2]);
      break;
    case 'zit_zonder_rug':
      delen.push(['kussen', 1, 1, B - 2, D - 2, kleur, 4]);
      break;
  }
  return naarWereld();

  function naarWereld(): VormResultaat[] {
    return delen
      .filter(([, , , b, h]) => b > 0 && h > 0)
      .map(([code, lx, ly, lb, lh, vulling, afronding]) => {
        const w = lokaalNaarWereld(e, lx, ly, lb, lh);
        return { code: `${e.id}.${code}`, x: rond(w.x), y: rond(w.y), breedte: rond(w.b), hoogte: rond(w.h), vulling, afronding: rond(afronding) };
      });
  }
}

/** Ellips over de hele voetafdruk van een element (ronde poef, ronde kuipzetel). */
function ellips(e: OntwerpElement, code: string, vulling: string): VormResultaat {
  const p = voetafdruk(e);
  const rx = p.b / 2, ry = p.h / 2, cx = p.x + rx, cy = p.y + ry;
  return {
    code: `${e.id}.${code}`, x: rond(p.x), y: rond(p.y), breedte: rond(p.b), hoogte: rond(p.h), vulling,
    pad: `M${rond(cx - rx)} ${rond(cy)} a${rond(rx)} ${rond(ry)} 0 1 0 ${rond(2 * rx)} 0 a${rond(rx)} ${rond(ry)} 0 1 0 ${rond(-2 * rx)} 0 Z`,
  };
}

/**
 * Prijs, stof, stuklijst en tekening van een vrij ontwerp.
 * Prijs per element = prijs[groep] + begonnen 10 cm boven min. breedte × per10cm[groep],
 * + diepte-toeslag, × (1 + materiaaltoeslag).
 */
export function berekenOntwerp(
  ontwerp: Ontwerp,
  catalogus: OntwerpCatalogus,
  materialen: Materiaal[],
  opties: { kortingProcent?: number } = {},
): OntwerpResultaat {
  const meldingen: OntwerpMelding[] = [];
  const typen = new Map(catalogus.typen.map((t) => [t.code, t]));
  const mats = new Map(materialen.map((m) => [m.code, m]));
  const hoofd = mats.get(ontwerp.hoofdmateriaal);
  if (!hoofd) meldingen.push({ code: 'materiaal.onbekend', ernst: 'fout', melding: 'Kies een hoofdmateriaal.' });
  // Schuurweerstand: een stof die te zwak is voor een zitting (richtwaarde, zie gebruiksklasse).
  for (const m of new Set([hoofd, ...ontwerp.elementen.map((e) => (e.materiaal ? mats.get(e.materiaal) : undefined))])) {
    const k = m && m.soort === 'stof' ? gebruiksklasse(m.martindale) : undefined;
    if (m && k && !k.zitmeubel)
      meldingen.push({ code: 'materiaal.martindale', ernst: 'waarschuwing', melding: `${m.naam}: Martindale ${m.martindale!.toLocaleString('nl-BE')} is ${k.klasse}; voor een zitmeubel minstens 15.000 (richtwaarde, te bevestigen met de leverancier).` });
  }

  if (ontwerp.elementen.length === 0)
    meldingen.push({ code: 'ontwerp.leeg', ernst: 'fout', melding: 'Voeg minstens één element toe of teken er een.' });

  const elementen: ElementResultaat[] = [];
  const vormen: VormResultaat[] = [];
  const opzetVormen: VormResultaat[] = [];
  const stofPerMat = new Map<string, number>();
  const stuk = new Map<string, StuklijstResultaat>();
  let kostprijs = 0;
  let bruto = 0;

  const optieBedragen = new Map<string, OptieBedrag>();
  const telOptie = (g: OptieGroep, k: OptieKeuze, bedrag: number) => {
    const sleutel = `${g.code}:${k.code}`;
    const b = optieBedragen.get(sleutel);
    if (b) b.bedrag = rond(b.bedrag + bedrag);
    else optieBedragen.set(sleutel, { groep: g.code, groepLabel: g.label, keuze: k.code, keuzeLabel: k.label, bedrag });
  };

  const telStuk = (artikel: string, omschrijving: string, eenheid: StuklijstResultaat['eenheid'], hoeveelheid: number, kostPerEenheid: number) => {
    const b = stuk.get(artikel);
    if (b) {
      b.hoeveelheid = rond(b.hoeveelheid + hoeveelheid, 3);
      b.aantal = b.hoeveelheid;
      b.kost = rond(b.hoeveelheid * kostPerEenheid);
    } else {
      stuk.set(artikel, {
        code: artikel, omschrijving, artikel, eenheid, aantal: rond(hoeveelheid, 3), hoeveelheid: rond(hoeveelheid, 3),
        kostprijsPerEenheid: kostPerEenheid, kost: rond(hoeveelheid * kostPerEenheid), zaaglijst: false,
      });
    }
  };

  ontwerp.elementen.forEach((e, n) => {
    const t = typen.get(e.type);
    const naam = `${t?.label ?? e.type} ${n + 1}`;
    if (!t) {
      meldingen.push({ code: 'element.type', ernst: 'fout', elementId: e.id, melding: `${naam}: onbekend elementtype.` });
      return;
    }
    const m = mats.get(materiaalVan(ontwerp, catalogus, e)) || hoofd;
    if (e.materiaal && !mats.has(e.materiaal))
      meldingen.push({ code: 'element.materiaal', ernst: 'fout', elementId: e.id, melding: `${naam}: het gekozen materiaal bestaat niet meer.` });
    for (const [veld, bereik, label] of [['breedte', t.breedte, 'breedte'], ['diepte', t.diepte, 'diepte']] as const) {
      const w = e[veld];
      if (!Number.isFinite(w) || w < bereik.min || w > bereik.max)
        meldingen.push({ code: `element.${veld}`, ernst: 'fout', elementId: e.id, melding: `${naam}: ${label} moet tussen ${bereik.min} en ${bereik.max} cm liggen (nu ${nl(w)} cm).` });
    }

    const groep = m?.groep ?? catalogus.groepen[0]!;
    const basis = t.prijs[groep];
    const per10 = t.per10cm[groep];
    let prijs = 0;
    if (basis === undefined || per10 === undefined) {
      meldingen.push({ code: 'element.prijs', ernst: 'fout', elementId: e.id, melding: `${naam}: geen prijs voor prijsgroep ${groep}.` });
    } else {
      const extra10 = Math.max(0, Math.ceil((e.breedte - t.breedte.min) / 10 - 1e-9));
      const diepte10 = Math.max(0, Math.ceil((e.diepte - t.diepte.standaard) / 10 - 1e-9));
      prijs = (basis + extra10 * per10) * (1 + (diepte10 * catalogus.diepteToeslagPctPer10cm) / 100) * (1 + (m?.toeslagPct ?? 0) / 100);
      prijs = rond(prijs);
    }
    const meterBreedte = e.breedte / 100;

    // Opties die voor dit element gelden: groepen op elementniveau en groepen op zetelniveau die per element tellen.
    const gekozen = gekozenOpties(ontwerp, catalogus, e);
    const v = vormgevingVan(ontwerp, e);
    const fx = vormEffect(t.tekenstijl, gekozen);
    let optieBedrag = 0;
    let stofPct = 0;
    for (const g of catalogus.opties ?? []) {
      const k = gekozen.get(g.code);
      if (!k) continue;
      const code = (g.niveau === 'element' ? e.opties?.[g.code] : ontwerp.opties?.[g.code]) ?? g.standaard;
      if (code !== k.code)
        meldingen.push({ code: 'optie.onbekend', ernst: 'fout', elementId: g.niveau === 'element' ? e.id : undefined, melding: `${g.label}: keuze "${code}" bestaat niet.` });
      // Combinaties die niet kunnen.
      for (const [andere, toegelaten] of Object.entries(k.alleenMet ?? {})) {
        const w = gekozen.get(andere);
        if (w && !toegelaten.includes(w.code)) {
          const al = meldingen.some((x) => x.code === `optie.${g.code}.${k.code}` && (g.niveau === 'ontwerp' || x.elementId === e.id));
          if (!al)
            meldingen.push({
              code: `optie.${g.code}.${k.code}`, ernst: 'fout', elementId: g.niveau === 'element' ? e.id : undefined,
              melding: `${g.niveau === 'element' ? `${naam}: ` : ''}${k.label} kan niet met ${w.label.toLowerCase()}${k.reden ? ` (${k.reden})` : ''}.`,
            });
        }
      }
      if (g.niveau === 'ontwerp' && !g.perElement) continue; // eenmalig, hieronder
      // Rugopties op een element zonder rug (chaise longue zonder rugleuning): niets aan te rekenen.
      if (!fx.rug && RUGGROEPEN.includes(g.code)) continue;
      // Een vrij getekende rughoogte wordt per cm aangerekend (hieronder), niet ook nog als gekozen rughoogte.
      if (g.code === 'rughoogte' && v.rughoogte !== undefined) continue;
      // Een vrij getekende armhoogte telt als de keuze met de dichtstbijzijnde hoogte.
      const vrij = g.code === 'armhoogte' ? v.armhoogte : undefined;
      const kk = vrij !== undefined ? keuzeBijHoogte(g, vrij) ?? k : k;
      const bedrag = rond((kk.prijs ?? 0) + (kk.prijsPerM ?? 0) * meterBreedte + ((kk.pct ?? 0) / 100) * prijs);
      optieBedrag += bedrag;
      stofPct += kk.stofPct ?? 0;
      kostprijs += (kk.kost ?? 0) + (kk.kostPerM ?? 0) * meterBreedte;
      telOptie(g, vrij !== undefined ? { ...kk, code: `${kk.code}.vrij`, label: `${rond(vrij, 1)} cm (op maat)` } : kk, bedrag);
    }
    // Vormgeving (ontwerpmodus): meerprijs en controle van de grenzen.
    const vp = catalogus.vormgevingPrijzen;
    for (const [veld, b] of Object.entries(VORMGEVING_BEREIK) as [keyof typeof VORMGEVING_BEREIK, { min: number; max: number }][]) {
      const w = v[veld];
      if (!Number.isFinite(w) || w < b.min || w > b.max)
        meldingen.push({ code: `vorm.${veld}`, ernst: 'fout', elementId: e.id, melding: `${naam}: ${veld} moet tussen ${b.min} en ${b.max} liggen.` });
    }
    for (const [veld, b] of Object.entries(HOOGTE_BEREIK) as [keyof typeof HOOGTE_BEREIK, { min: number; max: number }][]) {
      const w = veld === 'zithoogte' || veld === 'poothoogte' ? ontwerp.vormgeving?.[veld] : v[veld];
      if (w !== undefined && (!Number.isFinite(w) || w < b.min || w > b.max)) {
        const code = `vorm.${veld}`;
        if (!meldingen.some((x) => x.code === code && (veld === 'zithoogte' || veld === 'poothoogte' || x.elementId === e.id)))
          meldingen.push({ code, ernst: 'fout', elementId: veld === 'zithoogte' || veld === 'poothoogte' ? undefined : e.id, melding: `${veld === 'zithoogte' || veld === 'poothoogte' ? '' : `${naam}: `}${veld} moet tussen ${b.min} en ${b.max} cm liggen.` });
      }
    }
    // Vrij getekende rughoogte: meerprijs en stof per cm boven 80 cm (minder bij een lagere rug).
    if (v.rughoogte !== undefined && fx.rug) {
      // Bij een losse rugleuning telt de echte bovenkant (minstens 20 cm boven waar ze op rust).
      const verschil = (t.tekenstijl === 'rugleuning' ? rugleuningTop(ontwerp, catalogus, e) : v.rughoogte) - 80;
      const bedrag = rond(((verschil * (verschil > 0 ? 0.5 : 0.25)) / 100) * prijs);
      if (bedrag) {
        optieBedrag += bedrag;
        telOptie({ code: 'vormgeving', label: 'Vormgeving', niveau: 'element', standaard: '', keuzes: [] }, { code: 'eigen', label: 'eigen vormgeving' }, bedrag);
      }
      stofPct += verschil * 0.7;
    }
    if (vp && ['zit', 'hoek', 'chaise', 'zit_zonder_rug', 'rond', 'kuip'].includes(t.tekenstijl)) {
      // Alleen wat in de tekening en de 3D ook zichtbaar is (zie vormEffect).
      const vormBedrag = rond(
        (fx.kussens ? Math.max(0, Math.round(v.zitkussens) - 1) * vp.extraKussen : 0) +
          (fx.rugvorm
            ? ((v.rugvorm === 'hellend' ? vp.hellendeRugPct : v.rugvorm === 'rond' ? vp.rondeRugPct : 0) / 100) * prijs +
              Math.max(0, v.rugdikte - STANDAARD_VORMGEVING.rugdikte) * vp.dikkereRugPerCmPerM * meterBreedte
            : 0) +
          (fx.houtframe ? (v.houtframe === 'zijkant' ? vp.houtframeZijkant : v.houtframe === 'rondom' ? vp.houtframeRondomPerM * meterBreedte + vp.houtframeZijkant : 0) : 0),
      );
      if (vormBedrag) {
        optieBedrag += vormBedrag;
        telOptie({ code: 'vormgeving', label: 'Vormgeving', niveau: 'element', standaard: '', keuzes: [] }, { code: 'eigen', label: 'eigen vormgeving' }, vormBedrag);
      }
    }
    // Hoogtes die niet kunnen: een rug die niet boven de zitting uitkomt, een arm onder de zitting, of poten en
    // zitkussen die geen plaats laten voor de onderbouw.
    const hg = hoogtesVan(ontwerp, catalogus, e);
    const kussenDik = gekozen.get('zitting')?.code === 'vaste_zitting' ? 0 : v.kussendikte;
    if (fx.rug && t.tekenstijl !== 'kuip' && t.tekenstijl !== 'rugleuning' && hg.rughoogte < hg.zithoogte + 20)
      meldingen.push({ code: 'vorm.rug_te_laag', ernst: 'fout', elementId: e.id, melding: `${naam}: de rug (${nl(hg.rughoogte)} cm) moet minstens 20 cm boven de zitting (${nl(hg.zithoogte)} cm) uitkomen.` });
    if (t.tekenstijl === 'arm' && hg.armhoogte < hg.zithoogte)
      meldingen.push({ code: 'vorm.arm_te_laag', ernst: 'fout', elementId: e.id, melding: `${naam}: de arm (${nl(hg.armhoogte)} cm) ligt lager dan de zitting (${nl(hg.zithoogte)} cm).` });
    if (DRAGER_STIJLEN.includes(t.tekenstijl) && t.tekenstijl !== 'poef' && hg.zithoogte - kussenDik - hg.poothoogte < 5 && !meldingen.some((x) => x.code === 'vorm.geen_onderbouw'))
      meldingen.push({ code: 'vorm.geen_onderbouw', ernst: 'fout', melding: `Poothoogte (${nl(hg.poothoogte)} cm) en zitkussen (${nl(kussenDik)} cm) laten bij een zithoogte van ${nl(hg.zithoogte)} cm geen plaats voor de onderbouw.` });

    prijs = rond(prijs + optieBedrag);
    bruto += prijs;

    const stofM = m && t.tekenstijl !== 'console'
      ? (t.stofVast + t.stofPerM * meterBreedte) * (e.diepte / t.diepte.standaard) * patroonfactor(m.rapport) * (140 / m.rolbreedte) * (1 + stofPct / 100)
      : 0;
    if (m && stofM > 0) stofPerMat.set(m.code, (stofPerMat.get(m.code) ?? 0) + stofM);

    const frameKost = t.kostVast + t.kostPerM * meterBreedte;
    const uren = t.uren + t.urenPerM * meterBreedte;
    telStuk(`FRAME-${t.code.toUpperCase()}`, `${t.tekenstijl === 'console' ? 'Houten' : 'Frame en vulling'} ${t.label.toLowerCase()}`, 'stuk', 1, rond(frameKost));
    telStuk('ARB-ATELIER', 'Atelier (stofferen, naaien)', 'uur', uren, catalogus.uurloon);
    kostprijs += frameKost + uren * catalogus.uurloon;

    elementen.push({ id: e.id, type: t.code, label: t.label, breedte: e.breedte, diepte: e.diepte, materiaal: t.tekenstijl === 'console' ? '' : m?.code ?? '', groep, prijs, optieBedrag: rond(optieBedrag), stofM: rond(stofM, 2) });
    (t.opzet ? opzetVormen : vormen).push(...tekenElement(e, t.tekenstijl, m?.kleur ?? '#cccccc', gekozen, v));
  });

  // Opties op zetelniveau die eenmalig tellen (bv. houtafwerking).
  const basisTotaal = bruto;
  const zetelOpties = gekozenOpties(ontwerp, catalogus);
  for (const g of catalogus.opties ?? []) {
    if (g.niveau !== 'ontwerp' || g.perElement) continue;
    const k0 = zetelOpties.get(g.code);
    if (!k0 || ontwerp.elementen.length === 0) continue;
    // Alleen de elementen waarvoor de groep geldt (vaste zitting: −3 % op de zitelementen, niet op poef of console).
    const voor = g.voorTypen ? elementen.filter((x) => g.voorTypen!.includes(x.type)) : elementen;
    if (!voor.length) continue;
    const basis = g.voorTypen ? voor.reduce((som, x) => som + x.prijs, 0) : basisTotaal;
    // Een getekende zit- of poothoogte vervangt de gekozen maat: de keuze met de dichtstbijzijnde hoogte telt.
    const vrij = g.code === 'zithoogte' || g.code === 'poothoogte' ? ontwerp.vormgeving?.[g.code] : undefined;
    const k = vrij !== undefined ? keuzeBijHoogte(g, vrij) ?? k0 : k0;
    const bedrag = rond((k.prijs ?? 0) + ((k.pct ?? 0) / 100) * basis);
    bruto += bedrag;
    kostprijs += k.kost ?? 0;
    telOptie(g, vrij !== undefined ? { ...k, code: `${k.code}.vrij`, label: `${rond(vrij, 1)} cm (op maat)` } : k, bedrag);
  }

  // Stof per materiaal (afgerond op 0,1 m) in de stuklijst.
  const stof = [...stofPerMat].map(([code, meters]) => {
    const m = mats.get(code)!;
    const mRond = Math.ceil(meters * 10 - 1e-9) / 10;
    const artikel = materiaalArtikel(m);
    if (artikel) telStuk(artikel, `${m.soort === 'leder' ? 'Leder' : 'Stof'} ${m.naam}`, 'lm', mRond, m.kostprijsPerM);
    kostprijs += artikel ? mRond * m.kostprijsPerM : 0;
    return { materiaal: code, naam: m.naam, meters: mRond };
  });
  if ([...stofPerMat.keys()].some((c) => mats.get(c)?.groep === 'EIGEN'))
    meldingen.push({ code: 'materiaal.eigen', ernst: 'waarschuwing', melding: 'Eigen materiaal van de klant: lever minstens het berekende verbruik aan.' });

  vormen.push(...opzetVormen);

  // Overlap en losse elementen. Opzet-elementen (rugleuning, kussens) mogen op een ander element liggen.
  const el = ontwerp.elementen;
  const isOpzet = (e: OntwerpElement) => typen.get(e.type)?.opzet === true;
  for (let a = 0; a < el.length; a++) {
    for (let b = a + 1; b < el.length; b++) {
      if (isOpzet(el[a]!) || isOpzet(el[b]!)) continue;
      if (overlappen(el[a]!, el[b]!))
        meldingen.push({ code: 'ontwerp.overlap', ernst: 'fout', elementId: el[b]!.id, melding: `Element ${a + 1} en element ${b + 1} overlappen. Schuif ze uit elkaar.` });
    }
  }
  if (el.length > 1) {
    el.forEach((e, n) => {
      // Een poef mag los staan; opzet-elementen worden apart gecontroleerd.
      if (typen.get(e.type)?.tekenstijl === 'poef' || isOpzet(e)) return;
      if (!el.some((o) => o !== e && raken(e, o)))
        meldingen.push({ code: 'ontwerp.los', ernst: 'waarschuwing', elementId: e.id, melding: `Element ${n + 1} raakt geen ander element.` });
    });
  }

  el.forEach((e, n) => {
    if (!isOpzet(e)) return;
    const drager = dragerVan(ontwerp, catalogus, e);
    const t = typen.get(e.type)!;
    if (!drager) {
      meldingen.push({ code: 'opzet.los', ernst: 'fout', elementId: e.id, melding: `Element ${n + 1} (${t.label.toLowerCase()}) ligt niet op een zitting. Sleep het op een element, zodat het er voor meer dan de helft op ligt.` });
      return;
    }
    // Een losse rugleuning op een element dat al een rug heeft (zitelement, chaise met rugleuning …).
    const dt = typen.get(drager.type)!;
    if (t.tekenstijl === 'rugleuning' && dt.tekenstijl !== 'kuip' && vormEffect(dt.tekenstijl, gekozenOpties(ontwerp, catalogus, drager)).rug)
      meldingen.push({ code: 'opzet.dubbele_rug', ernst: 'waarschuwing', elementId: e.id, melding: `Element ${n + 1} (losse rugleuning) ligt op element ${el.indexOf(drager) + 1}, dat al een rug heeft.` });
    // Twee dezelfde opzet-elementen (bv. twee rugleuningen) op elkaar.
    for (let m = n + 1; m < el.length; m++) {
      const o = el[m]!;
      if (o.type !== e.type) continue;
      if (overlapOppervlak(e, o) > 0.5 * Math.min(e.breedte * e.diepte, o.breedte * o.diepte))
        meldingen.push({ code: 'opzet.op_elkaar', ernst: 'fout', elementId: o.id, melding: `Element ${n + 1} en element ${m + 1} (${t.label.toLowerCase()}) liggen op elkaar. Schuif er één opzij of verwijder het.` });
    }
  });

  // Afmetingen en maatlijnen (opzet-elementen tellen mee als ze buiten de zitting uitsteken).
  const afdrukken = el.map(voetafdruk);
  const x0 = afdrukken.length ? Math.min(...afdrukken.map((p) => p.x)) : 0;
  const y0 = afdrukken.length ? Math.min(...afdrukken.map((p) => p.y)) : 0;
  const x1 = afdrukken.length ? Math.max(...afdrukken.map((p) => p.x + p.b)) : 0;
  const y1 = afdrukken.length ? Math.max(...afdrukken.map((p) => p.y + p.h)) : 0;
  const afmetingen = { x: x0, y: y0, breedte: rond(x1 - x0, 1), diepte: rond(y1 - y0, 1) };
  if (catalogus.leveringWaarschuwingVanaf && afmetingen.breedte > catalogus.leveringWaarschuwingVanaf)
    meldingen.push({ code: 'ontwerp.levering', ernst: 'waarschuwing', melding: `Breder dan ${catalogus.leveringWaarschuwingVanaf} cm: levering in meerdere delen.` });

  const maatlijnen: TekeningResultaat['maatlijnen'] = el.length
    ? [
        { code: 'totaal_breedte', x1: x0, y1: y0, x2: x1, y2: y0, afstand: 14, tekst: `${afmetingen.breedte}` },
        { code: 'totaal_diepte', x1: x1, y1: y0, x2: x1, y2: y1, afstand: 14, tekst: `${afmetingen.diepte}` },
      ]
    : [];

  kostprijs = rond(kostprijs);
  bruto = rond(bruto);
  // Korting altijd tussen 0 en 100 %; onder de kostprijs een waarschuwing die de klant niet ziet.
  const kortingProcent = Number.isFinite(opties.kortingProcent) ? Math.min(100, Math.max(0, opties.kortingProcent!)) : 0;
  const excl = rond(bruto * (1 - kortingProcent / 100));
  const btw = rond((excl * catalogus.btwProcent) / 100);
  if (kortingProcent > 0 && excl < kostprijs)
    meldingen.push({ code: 'prijs.onder_kostprijs', ernst: 'waarschuwing', intern: true, melding: `Met ${nl(kortingProcent)} % korting ligt de prijs onder de kostprijs (${excl > 0 ? `marge ${nl(((excl - kostprijs) / excl) * 100)} %` : 'gratis'}).` });

  return {
    geldig: !meldingen.some((m) => m.ernst === 'fout'),
    meldingen,
    elementen,
    afmetingen,
    stof,
    opties: [...optieBedragen.values()],
    stuklijst: [...stuk.values()],
    prijs: {
      kostprijs,
      brutoprijsExcl: bruto,
      kortingProcent,
      verkoopprijsExcl: excl,
      margeProcent: excl > 0 ? rond(((excl - kostprijs) / excl) * 100, 1) : null,
      btw,
      verkoopprijsIncl: rond(excl + btw),
    },
    tekening: { titel: 'Vrij ontwerp — bovenaanzicht (cm)', eenheid: 'cm', vormen, maatlijnen },
  };
}
