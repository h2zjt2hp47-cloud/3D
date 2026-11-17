/**
 * Plattegrond: ruimtes (rechthoeken), muren die daaruit volgen, openingen (ramen, deuren) in de
 * muren en meubels. Maten in cm, x naar rechts, y naar onder (zoals op papier).
 *
 * De muren teken je niet zelf: elke rand van een ruimte is een muur. Grenst een rand aan
 * een andere ruimte, dan is het een binnenmuur; anders een buitenmuur. Zo blijft de tekening
 * altijd sluitend, ook na het indelen (splitsen) of verschuiven van ruimtes.
 */
import {
  dakBlokken, dakHoogte, daklichtBlokken, DAKLICHT_GLAS, gevelOnderDak, hellendDak, oppervlakOnderDak, prisma,
  type DakBedekking, type DakKeuze, type DakLicht, type DakLichtType, type DakMateriaal, type HellendDak,
} from './dak.js';
import { kaderVan, plaatsBlokken, type Blok, type BlokSoort, type Scene3D } from './ruimtelijk.js';
import type { WoningOpbouw, WoningOpbouwCatalogus } from './opbouw.js';
import { controleerLosseWanden, losseWandBlokken, losseWandRuimte, type LosseWand } from './lossewand.js';
import { strokenVan, strookBlokken, type GevelStrook } from './gevelstroken.js';
import { daklichtLicht, ledstripBlokken, raamLicht, toestelLicht } from './nacht.js';
import { binnenKant, draaiKwart, isAccent, meubelIn, plafondBlokken, plintBlokken } from './binnenafwerking.js';
import { techniekBinnenBlokken, techniekVanBinnen } from './techniekbinnen.js';
import {
  toestelMaten, leidingVerloop, techniekBlokken, toestelBlokken, toestelVoetafdruk, voorRichting,
  type Leiding, type TechniekCatalogus, type TechniekWeergave, type Toestel, type ToestelType,
} from './techniek.js';

// Techniek voor de installateur (toestellen en leidingen): zie techniek.ts. Hier alleen de velden in het plan, de 3D en
// de controles; zo komt alles mee met `export * from './plattegrond.js'` in index.ts.
export * from './techniek.js';

export type RuimteType = 'leefruimte' | 'keuken' | 'slaapkamer' | 'bureau' | 'badkamer' | 'wc' | 'hal' | 'berging' | 'garage';

export const RUIMTE_TYPES: Record<RuimteType, { label: string; daglicht: boolean; nat: boolean }> = {
  leefruimte: { label: 'Leefruimte', daglicht: true, nat: false },
  keuken: { label: 'Keuken', daglicht: true, nat: true },
  slaapkamer: { label: 'Slaapkamer', daglicht: true, nat: false },
  bureau: { label: 'Bureau', daglicht: true, nat: false },
  badkamer: { label: 'Badkamer', daglicht: false, nat: true },
  wc: { label: 'Wc', daglicht: false, nat: true },
  hal: { label: 'Hal', daglicht: false, nat: false },
  berging: { label: 'Berging', daglicht: false, nat: false },
  garage: { label: 'Garage', daglicht: false, nat: false },
};

export interface Ruimte {
  id: string;
  naam: string;
  type: RuimteType;
  /** Linkerbovenhoek en maten (cm), gemeten op de as van de muren. */
  x: number;
  y: number;
  b: number;
  d: number;
  /** Code van de vloer en de wandafwerking (zie de plancatalogus). */
  vloer: string;
  wand: string;
  /** Verdieping (0 = gelijkvloers). */
  niveau?: number;
  /** Extra rechthoeken van dezelfde ruimte (L- of U-vorm); tussen de delen staat geen muur. Een deel kan ook een vrije vorm zijn. */
  delen?: Deel[];
  /**
   * Vrije vorm (schuine muren): de hoekpunten [x, y] in cm op de as van de muren, met de klok mee zoals op de tekening
   * (een omtrek in de andere zin wordt omgedraaid). Ontbreekt = de rechthoek x, y, b, d, zoals altijd. Met een omtrek
   * zijn x, y, b, d het omsluitende kader (zie `zetOmtrek`). Klopt dat kader niet met de omtrek, dan is het kader de baas
   * over plaats en maat: de omtrek schuift en rekt mee (zo werkt slepen in een scherm dat alleen x, y, b, d kent).
   * Een convexe veelhoek (vierhoek, vijfhoek); zie `vormFouten`.
   */
  omtrek?: Punt[];
  /**
   * Bestaand (ronde 11): de ruimte bestaat al en blijft (de woning waar een uitbouw tegen komt). Ze staat neutraal in plan,
   * gevels en 3D en telt niet mee in de meetstaat, de constructie, de aanwijzing voor EPB, de schatting van de stabiliteit,
   * de telling van de techniek, de controles op nieuw werk en het overzicht. Een muur tussen bestaand en nieuw is de
   * bestaande gevel: niet gebouwd (een opening erin wel). Alleen `true` telt; ontbreekt = nieuw, zoals altijd.
   */
  bestaand?: boolean;
  /**
   * Binnenafwerking (ronde 12), alle drie optioneel; ontbreekt = zoals vroeger (geen plint, geen eigen plafond, geen
   * accentmuur). `plafond` en `plint`: codes uit `PlanCatalogus.plafonds` en `.plinten`.
   */
  plafond?: string;
  plint?: string;
  /** Eén kant van de ruimte in een andere wandafwerking (een accentmuur), zie `RuimteAccent`. */
  accent?: RuimteAccent;
}

/**
 * Accentmuur (ronde 12): de muren aan één kant van de ruimte (`kant` zoals op het plan: boven, onder, links of rechts;
 * een schuine muur telt bij de dichtste kant, zoals `buitenKant`) krijgen aan de binnenkant de afwerking `wand` (een code
 * uit `PlanCatalogus.wanden`). Zie `binnenKant`.
 */
export interface RuimteAccent { kant: GevelKant; wand: string }

export interface Rechthoek { x: number; y: number; b: number; d: number }
/** Een punt op het plan [x, y] (cm). */
export type Punt = [number, number];
/** Een deel van een ruimte: een rechthoek, of een vrije vorm in het kader x, y, b, d (zie `Ruimte.omtrek`). */
export interface Deel extends Rechthoek { omtrek?: Punt[] }

export type OpeningSoort = 'raam' | 'buitendeur' | 'schuifraam' | 'binnendeur' | 'doorgang' | 'garagepoort';

export interface Opening {
  id: string;
  soort: OpeningSoort;
  /**
   * Muur waarin de opening zit: horizontaal (as 'h', lijn = y) of verticaal (as 'v', lijn = x), of schuin (as 's', met
   * `richting`; lijn en midden zoals bij de schuine muur, zie `Muur`).
   */
  as: 'h' | 'v' | 's';
  lijn: number;
  /** Midden van de opening langs de muur (cm). */
  midden: number;
  /** Schuine muur (as 's'): de richting van haar as als eenheidsvector [dx, dy] met dy > 0, zoals `Muur.richting`. */
  richting?: Punt;
  breedte: number;
  hoogte: number;
  /** Hoogte van de onderkant boven de vloer (cm); 0 bij deuren. */
  borstwering: number;
  /** Scharnieren aan het begin (kleinste coördinaat langs de muur) of het einde van de opening. */
  scharnier: 'begin' | 'einde';
  /** Draait de deur naar de plus-kant (onder of rechts op de tekening; bij een schuine muur: zie `Muur`)? */
  naarPlus: boolean;
  /** Offertepositie (raam of buitendeur) die bij deze opening hoort. */
  positie?: string;
  /** Type binnendeur (zie de plancatalogus). */
  deurtype?: string;
  niveau?: number;
}

export interface Meubel {
  id: string;
  type: string;
  /** Linkerbovenhoek van de (gedraaide) voetafdruk. */
  x: number;
  y: number;
  /** Maten zonder draaiing: b = breedte, d = diepte (voorkant naar onder bij rotatie 0). */
  b: number;
  d: number;
  rotatie: 0 | 90 | 180 | 270;
  kleur?: string;
  niveau?: number;
}

export interface Plattegrond {
  ruimtes: Ruimte[];
  openingen: Opening[];
  meubels: Meubel[];
  muurhoogte: number;
  buitenmuur: number;
  binnenmuur: number;
  /** Gevelafwerking buiten (eenvoudig: één materiaal voor de hele woning; zie ook gevelOntwerp). */
  gevel: { soort: BlokSoort; kleur: string };
  /** Gevelmaterialen uit de catalogus: hele woning, per muurvlak en een sokkel. Gaat voor op `gevel`. */
  gevelOntwerp?: GevelOntwerp;
  /** Namen van de verdiepingen (index = niveau). Leeg = alleen gelijkvloers. */
  verdiepingen?: { naam: string }[];
  /** Het dak: vorm, helling, richting, oversteek en bedekking. Ontbreekt = zoals vroeger (plat, zonder keuze). */
  dak?: DakKeuze;
  /** Lichtkoepels en lichtstraten in een plat dak. */
  daklichten?: DakLicht[];
  /**
   * Waar het noorden ligt op het plan: graden met de klok mee vanaf de bovenkant van het plan (90 = noord ligt rechts).
   * Ontbreekt = de bovenkant van het plan is het noorden. Voor de lichtinval (zie zon.ts) en de noordpijl.
   */
  noord?: number;
  /**
   * Techniek (ronde 10): toestellen van de installateur (tellerkast, stopcontact, airco, boiler, ventilatie-unit …) en
   * leidingen (kabel, koelleiding, water, afvoer, kanaal …), elk met een `niveau`. Zie techniek.ts. Ontbreken ze, dan is
   * alles zoals vroeger.
   */
  toestellen?: Toestel[];
  leidingen?: Leiding[];
  /**
   * De opbouw van wanden, vloeren en daken voor de constructieweergave, de doorsnede, de meetstaat, de aanwijzing voor
   * EPB en de schatting van de stabiliteit (ronde 6, zie constructie.ts). Ontbreekt = de standaarden van de catalogus;
   * de afgewerkte weergave, de gevels en de offerte lezen dit veld niet.
   */
  opbouw?: WoningOpbouw;
  /**
   * Losse wanden (ronde 2d): muren die geen ruimte opdelen (een muur die halverwege stopt, een halfhoog muurtje, een
   * tuinmuur), elk met een `niveau`. Ze komen niet in `murenVan`: de ruimtes, hun oppervlakte, de muren en de controles
   * blijven zoals ze zijn. Zie lossewand.ts. Ontbreekt = alles zoals vroeger.
   */
  losseWanden?: LosseWand[];
  /**
   * Tegen de buren (ronde 11): muurvlakken (sleutel zoals `vlakSleutel`, bv. `uitbouw:links`) die een bestaande
   * scheidingsmuur van de buren zijn. Ze worden niet gebouwd (niet in meetstaat, constructie of gevel), staan neutraal in
   * de 3D, met een eenvoudig volume van de buren erachter. Ontbreekt = geen buren, zoals altijd.
   */
  tegenBuren?: string[];
}

/** Kant van de woning (op de plattegrond): boven, onder, links of rechts. */
export type GevelKant = 'boven' | 'onder' | 'links' | 'rechts';

/** Gekozen gevelmateriaal (codes uit de catalogus van de klant). */
export interface GevelKeuze {
  materiaal: string;
  kleur: string;
  /** Voegkleur (bij metselwerk). */
  voeg?: string;
}

/** Gevelafwerking van de woning, zoals "geschilderd" in de gevel-editor. */
export interface GevelOntwerp {
  /** Materiaal voor de hele woning. */
  standaard: GevelKeuze;
  /** Per muurvlak, sleutel `ruimte-id:kant` (zie vlakSleutel). Gaat voor op de standaard. */
  vlakken?: Record<string, GevelKeuze>;
  /** Plint onderaan de gevel van het gelijkvloers (hoogte in cm; 0 = geen). */
  sokkel?: GevelKeuze & { hoogte: number };
  /**
   * Stroken (ronde 14): een materiaal op een deel van een gevel (een band, een strook naast een deur, een kader rond een
   * raam), in de volgorde waarin ze gemaakt zijn (een latere gaat voor). Zie gevelstroken.ts. Ontbreekt = geen.
   */
  stroken?: GevelStrook[];
}

/** Een gevelmateriaal in de catalogus: soort voor 3D en tekening, kleuren (stalen) en prijs per m². */
export interface GevelMateriaal {
  label: string;
  /** Groep in het palet (Baksteen, Pleister, Hout …). */
  groep: string;
  soort: BlokSoort;
  kleuren: Record<string, { label: string; hex: string }>;
  /** Voegkleuren (metselwerk). */
  voegen?: Record<string, { label: string; hex: string }>;
  /** Verkoop- en kostprijs per m², geplaatst (demo). */
  prijs: number;
  kost: number;
  artikel?: string;
  /** Korte uitleg voor de klant. */
  uitleg?: string;
}

/** Afwerking zoals de 3D en de tekening ze nodig hebben. */
export interface GevelAfwerking { soort: BlokSoort; kleur: string; voeg?: string }

/** Naar welke kant van de woning kijkt de buitenkant van een buitenmuur? Bij een schuine muur: de dichtste kant. */
export function buitenKant(m: Muur): GevelKant | undefined {
  if (m.soort !== 'buiten') return undefined;
  if (m.as === 'h') return m.min ? 'onder' : 'boven';
  if (m.as === 's') return (['boven', 'rechts', 'onder', 'links'] as const)[Math.round(buitenRichting(m)! / 90) % 4];
  return m.min ? 'rechts' : 'links';
}

/**
 * Waar de buitenkant van een buitenmuur naar kijkt, in graden met de klok mee vanaf de bovenkant van het plan (0 = boven,
 * 90 = rechts), zoals de noordrichting in zon.ts. Een schuine muur kijkt schuin, bv. 104°.
 */
export function buitenRichting(m: Muur): number | undefined {
  if (m.soort !== 'buiten') return undefined;
  const { n } = asVan(m), z = m.plus ? -1 : 1;
  const k = Math.round((Math.atan2(z * n[0], -z * n[1]) * GRAAD) * 1e6) / 1e6;
  return ((k % 360) + 360) % 360;
}

/**
 * Sleutel van een muurvlak: de ruimte binnen en de kant van de woning. Blijft gelijk als de ruimte verschuift. Een schuine
 * muur: de ruimte en de richting waarin ze kijkt (`ruimte:s104`), zodat ze los van de rechte muren te verven is.
 */
export function vlakSleutel(m: Muur): string {
  if (m.as === 's' && m.soort === 'buiten') return `${m.plus ?? m.min}:s${Math.round(buitenRichting(m)!)}`;
  return `${m.plus ?? m.min}:${buitenKant(m)}`;
}

/** Het gekozen materiaal voor een buitenmuur (of undefined zonder gevelontwerp). */
export function gevelKeuzeVan(plan: Plattegrond, m: Muur): GevelKeuze | undefined {
  const o = plan.gevelOntwerp;
  if (!o) return undefined;
  return o.vlakken?.[vlakSleutel(m)] ?? o.standaard;
}

/** Zet een keuze om naar soort en kleuren (valt terug op plan.gevel als het materiaal onbekend is). */
export function gevelAfwerking(plan: Plattegrond, cat: PlanCatalogus | undefined, keuze: GevelKeuze | undefined): GevelAfwerking {
  const mat = keuze ? cat?.gevels?.[keuze.materiaal] : undefined;
  if (!keuze || !mat) return plan.gevel;
  const kleur = mat.kleuren[keuze.kleur] ?? Object.values(mat.kleuren)[0];
  const voeg = keuze.voeg ? mat.voegen?.[keuze.voeg] : mat.voegen ? Object.values(mat.voegen)[0] : undefined;
  return { soort: mat.soort, kleur: kleur?.hex ?? plan.gevel.kleur, voeg: voeg?.hex };
}

// ---------- bestaand en tegen de buren (ronde 11) ----------

/**
 * Neutrale tinten (effen en licht) voor wat al bestaat of van de buren is: zichtbaar, maar ondergeschikt aan het nieuwe
 * werk, dat in zijn eigen materialen en kleuren staat.
 */
export const NEUTRAAL = { gevel: '#cdcfcd', binnen: '#e2e3e0', vloer: '#d5d6d2', dak: '#8e908f', buren: '#aeb1b0' } as const;

/** Heeft het plan een bestaande ruimte of een muurvlak tegen de buren? Zo niet, dan rekent alles zoals vroeger. */
export const heeftBestaand = (plan: Plattegrond) => plan.ruimtes.some((r) => r.bestaand === true) || !!plan.tegenBuren?.length;

/** Is de ruimte met deze id bestaand (zie `Ruimte.bestaand`)? */
export const isBestaand = (plan: Plattegrond, id?: string) => !!id && plan.ruimtes.some((r) => r.id === id && r.bestaand === true);

/** Is alles op deze verdieping bestaand (en staat er iets)? Dan is het dak erop ook bestaand. */
export function alleBestaand(plan: Plattegrond, n: number): boolean {
  const r = plan.ruimtes.filter((x) => niveauVan(x) === n);
  return r.length > 0 && r.every((x) => x.bestaand === true);
}

/**
 * Wat een muur is voor het werk: `nieuw` (wordt gebouwd), `bestaand` (een muur van een bestaande ruimte, of de bestaande
 * gevel tussen bestaand en nieuw: niet gebouwd, een opening erin wel) of `buren` (een muurvlak tegen de buren, zie
 * `Plattegrond.tegenBuren`: de scheidingsmuur bestaat al).
 */
export type MuurStatus = 'nieuw' | 'bestaand' | 'buren';
export function muurStatus(plan: Plattegrond, m: Muur): MuurStatus {
  if (m.soort === 'binnen') return isBestaand(plan, m.plus) || isBestaand(plan, m.min) ? 'bestaand' : 'nieuw';
  // Ook een bestaande woning kan tussen de buren staan: dan is haar zijmuur een scheidingsmuur (met de buren erachter).
  if (plan.tegenBuren?.includes(vlakSleutel(m))) return 'buren';
  return isBestaand(plan, m.plus ?? m.min) ? 'bestaand' : 'nieuw';
}

/** De buitenkant van een buitenmuur: neutraal als ze bestaat of van de buren is, anders het gekozen gevelmateriaal. */
export function buitenAfwerking(plan: Plattegrond, cat: PlanCatalogus | undefined, m: Muur): GevelAfwerking {
  const s = muurStatus(plan, m);
  if (s !== 'nieuw') return { soort: 'gevel', kleur: s === 'buren' ? NEUTRAAL.buren : NEUTRAAL.gevel };
  return gevelAfwerking(plan, cat, gevelKeuzeVan(plan, m));
}

/**
 * Het plan met alleen de techniek van het nieuwe werk (ronde 11), voor de telling: zonder de toestellen in een bestaande
 * ruimte en zonder de leidingen die helemaal in bestaande ruimtes liggen. Zonder bestaande ruimte: hetzelfde plan.
 */
export function nieuweTechniek(plan: Plattegrond): Plattegrond {
  if (!plan.ruimtes.some((r) => r.bestaand === true) || !(plan.toestellen?.length || plan.leidingen?.length)) return plan;
  const oud = (x: number, y: number, n?: number) => ruimteOp(plan, x, y, n ?? 0)?.bestaand === true;
  return {
    ...plan,
    ...(plan.toestellen ? { toestellen: plan.toestellen.filter((t) => !oud(t.x, t.y, t.niveau)) } : {}),
    ...(plan.leidingen ? { leidingen: plan.leidingen.filter((l) => !l.punten.every(([x, y]) => oud(x, y, l.niveau))) } : {}),
  };
}

/** Zet een muurvlak tegen de buren of niet (het veld verdwijnt als er geen meer is). */
export function zetTegenBuren(plan: Plattegrond, sleutel: string, aan: boolean) {
  const lijst = new Set(plan.tegenBuren ?? []);
  if (aan) lijst.add(sleutel); else lijst.delete(sleutel);
  if (lijst.size) plan.tegenBuren = [...lijst]; else delete plan.tegenBuren;
}

export type VerfBereik = 'vlak' | 'gevel' | 'verdieping' | 'woning';

/**
 * "Verven" van de gevel (zoals in de gevel-editor): één muurvlak, een hele gevelkant (alle verdiepingen),
 * een hele verdieping of de hele woning. Wijzigt het plan; het gevelontwerp moet al bestaan.
 */
export function verfGevel(plan: Plattegrond, keuze: GevelKeuze, bereik: VerfBereik, doel: { sleutel?: string; kant?: GevelKant; niveau?: number } = {}) {
  const o = plan.gevelOntwerp;
  if (!o) return;
  const k = { ...keuze };
  if (bereik === 'woning') {
    o.standaard = k;
    delete o.vlakken;
    return;
  }
  o.vlakken ??= {};
  if (bereik === 'vlak') {
    if (doel.sleutel) o.vlakken[doel.sleutel] = k;
    return;
  }
  for (let n = 0; n < verdiepingenVan(plan).length; n++) {
    if (bereik === 'verdieping' && n !== doel.niveau) continue;
    for (const m of murenVan(niveauPlan(plan, n))) {
      if (m.soort !== 'buiten') continue;
      if (bereik === 'gevel' && buitenKant(m) !== doel.kant) continue;
      o.vlakken[vlakSleutel(m)] = { ...k };
    }
  }
}

/** Dikte van de vloerplaat tussen twee verdiepingen (cm). */
export const VLOERDIKTE = 30;
/** Dikte van de laag bedekking bovenop een plat dak met dakkeuze (cm, binnen de dikte van de dakplaat). */
const DAK_LAAG = 8;

/**
 * Een muur, afgeleid uit de randen van de ruimtes. Horizontaal (as 'h': lijn = y, van–tot langs x), verticaal (as 'v':
 * lijn = x, van–tot langs y) of schuin (as 's'). Een schuine muur is een gekantelde verticale muur: haar as loopt in de
 * richting d = `richting` (eenheidsvector, dy > 0, dus van boven naar onder op de tekening), haar plus-kant ligt langs
 * n = (dy, −dx) (bij een verticale muur is dat rechts). Een punt van de muur is p = s·d + w·n: `lijn` = w van de as,
 * `van` en `tot` = s van de eindpunten (`punten`). Zo blijft tot − van de lengte, ook bij een schuine muur.
 */
export interface Muur {
  id: string;
  as: 'h' | 'v' | 's';
  lijn: number;
  van: number;
  tot: number;
  soort: 'buiten' | 'binnen';
  dikte: number;
  /** Ruimte aan de kant met de grotere coördinaat (onder/rechts; bij een schuine muur langs n) en aan de andere kant. */
  plus?: string;
  min?: string;
  /** Schuine muur: richting van de as (eenheidsvector, dy > 0). */
  richting?: Punt;
  /** Schuine muur: begin- en eindpunt van de as (cm). */
  punten?: [Punt, Punt];
}

/** Afwerkingen en meubels die de plattegrond kent (komt uit de catalogus van de klant). */
export interface PlanCatalogus {
  vloeren: Record<string, { label: string; soort: BlokSoort; kleur: string }>;
  wanden: Record<string, { label: string; soort: BlokSoort; kleur: string }>;
  binnendeuren: Record<string, { label: string; soort: BlokSoort; kleur: string }>;
  meubels: Record<string, MeubelType>;
  /** Gevelmaterialen (gevel-editor); zonder deze lijst geldt plan.gevel. */
  gevels?: Record<string, GevelMateriaal>;
  /** Dakbedekkingen (plat en hellend) en lichtkoepels; zonder deze lijsten is het dak effen donker. */
  daken?: Record<string, DakMateriaal>;
  daklichten?: Record<string, DakLichtType>;
  /** Toestellen en leidingsoorten van de installateur (zie techniek.ts); zonder deze catalogus wordt geen techniek getoond. */
  techniek?: TechniekCatalogus;
  /** Opbouwen van wanden, vloeren en daken (constructie.ts); zonder deze catalogus is er geen constructieweergave. */
  opbouw?: WoningOpbouwCatalogus;
  /** Plafonds en plinten (ronde 12, binnenafwerking); zonder deze lijsten tellen `Ruimte.plafond` en `.plint` niet. */
  plafonds?: Record<string, PlafondType>;
  plinten?: Record<string, PlintType>;
}

/**
 * Een plafond (ronde 12): soort en kleur zoals een wand. `verlaagd` = zoveel cm onder de muurhoogte (een verlaagd plafond,
 * de ruimte erboven blijft leeg); `spots` = inbouwspots in een raster (alleen in de 3D van binnen).
 */
export interface PlafondType { label: string; soort: BlokSoort; kleur: string; verlaagd?: number; spots?: boolean }

/**
 * Een plint (ronde 12): een lijst onderaan de binnenkant van de muren, `hoogte` in cm. `zoalsVloer`: in de soort en de
 * kleur van de vloer als die vloer die soort heeft (een houten plint bij parket, een tegelplint bij een tegelvloer), anders
 * in de eigen soort en kleur.
 */
export interface PlintType { label: string; soort: BlokSoort; kleur: string; hoogte: number; zoalsVloer?: boolean }

export type MeubelVorm =
  | 'bank' | 'fauteuil' | 'tafel' | 'stoel' | 'bed' | 'nachtkast' | 'kast' | 'keuken' | 'eiland' | 'koelkast'
  | 'bad' | 'douche' | 'wc' | 'lavabo' | 'tv' | 'plant' | 'tapijt' | 'trap';

export interface MeubelType {
  label: string;
  vorm: MeubelVorm;
  b: number;
  d: number;
  h: number;
  kleur: string;
  /** Richtprijs (excl. btw), alleen voor een indicatieve inrichting. */
  prijs?: number;
  groep: string;
}

const r2 = (x: number) => Math.round(x * 100) / 100;
const gelijk = (a: number, b: number) => Math.abs(a - b) < 0.5;

// ---------- vrije vorm: veelhoeken ----------

/** Rekenfoutjes van berekende punten wegwerken (op 0,01 µm): 300,00000000000006 wordt 300. */
const fijn = (x: number) => { const y = Math.round(x * 1e6) / 1e6; return y === 0 ? 0 : y; };
const fijnPunt = ([x, y]: Punt): Punt => [fijn(x), fijn(y)];
const GRAAD = 180 / Math.PI;

/** Dubbele oppervlakte met teken: positief = met de klok mee op de tekening (y naar onder). */
function dubbeleOppervlakte(v: Punt[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    const [x0, y0] = v[i]!, [x1, y1] = v[(i + 1) % v.length]!;
    s += x0 * y1 - x1 * y0;
  }
  return s;
}

/** Oppervlakte van een veelhoek (cm²). */
export const veelhoekOppervlakte = (v: Punt[]) => Math.abs(dubbeleOppervlakte(v)) / 2;

/** De punten met de klok mee (de vaste draairichting), zonder punten die samenvallen met het vorige. */
export function metDeKlok(v: Punt[]): Punt[] {
  const uit = v.filter((p, i) => {
    const q = v[(i + v.length - 1) % v.length]!;
    return v.length < 2 || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.01;
  });
  return dubbeleOppervlakte(uit) < 0 ? uit.reverse() : uit;
}

/** Omsluitend kader van punten. */
export function kaderVanPunten(v: Punt[]): Rechthoek {
  const xs = v.map((p) => p[0]), ys = v.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, b: Math.max(...xs) - x, d: Math.max(...ys) - y };
}

/**
 * De vorm van een deel als veelhoek, met de klok mee. Een rechthoek geeft haar vier hoeken (vanaf linksboven); een vrije
 * vorm haar omtrek, in het kader x, y, b, d gezet (zie `Ruimte.omtrek`: klopt het kader niet, dan schuift en rekt ze mee).
 */
export function vormVanDeel(q: Deel): Punt[] {
  if (!q.omtrek || q.omtrek.length < 3) return [[q.x, q.y], [q.x + q.b, q.y], [q.x + q.b, q.y + q.d], [q.x, q.y + q.d]];
  const v = metDeKlok(q.omtrek);
  const k = kaderVanPunten(v);
  const zelfde = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  if (zelfde(k.x, q.x) && zelfde(k.y, q.y) && zelfde(k.b, q.b) && zelfde(k.d, q.d)) return v;
  // Een kader zonder breedte of diepte (nog niet ingevuld): de omtrek zelf.
  if (!(q.b > 0) || !(q.d > 0)) return v;
  const fx = k.b > 1e-6 ? q.b / k.b : 1, fy = k.d > 1e-6 ? q.d / k.d : 1;
  return v.map(([x, y]) => fijnPunt([q.x + (x - k.x) * fx, q.y + (y - k.y) * fy]));
}

/** Alle delen van een ruimte als veelhoek (hoofddeel eerst). */
export const vormenVan = (r: Ruimte): Punt[][] => delenVan(r).map(vormVanDeel);

/** Heeft de ruimte (of een van haar delen) een vrije vorm? */
export const heeftVrijeVorm = (r: Ruimte) => !!r.omtrek || !!r.delen?.some((q) => q.omtrek);

/** Zet de omtrek van een ruimte (of een deel) en werk het kader x, y, b, d bij. Punten met de klok mee of tegen. */
export function zetOmtrek(r: Deel, punten: Punt[]): void {
  const v = metDeKlok(punten.map(fijnPunt));
  r.omtrek = v;
  Object.assign(r, kaderVanPunten(v));
}

/** Afstand van een punt tot een lijnstuk. */
function afstandTotStuk([px, py]: Punt, [ax, ay]: Punt, [bx, by]: Punt): number {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/**
 * Ligt een punt binnen de veelhoek? Een punt op (of binnen `marge` cm van) de rand telt niet mee; met een negatieve marge
 * telt het wel mee (bv. −1: tot 1 cm buiten de rand is nog binnen).
 */
export function binnenVeelhoek(v: Punt[], x: number, y: number, marge = 0.01): boolean {
  let binnen = false, rand = Infinity;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const [xi, yi] = v[i]!, [xj, yj] = v[j]!;
    rand = Math.min(rand, afstandTotStuk([x, y], v[j]!, v[i]!));
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) binnen = !binnen;
  }
  return rand <= Math.abs(marge) ? marge < 0 : binnen;
}

/** Knipt een veelhoek af op het halfvlak a·x + b·y ≤ c (Sutherland–Hodgman); de draairichting blijft. */
export function knipVeelhoek(v: Punt[], a: number, b: number, c: number): Punt[] {
  const uit: Punt[] = [];
  const f = ([x, y]: Punt) => a * x + b * y - c;
  for (let i = 0; i < v.length; i++) {
    const p = v[i]!, q = v[(i + 1) % v.length]!;
    const fp = f(p), fq = f(q);
    if (fp <= 1e-9) uit.push(p);
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) {
      const t = fp / (fp - fq);
      uit.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return uit.filter((p, i) => { const q = uit[(i + uit.length - 1) % uit.length]!; return uit.length < 2 || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6; });
}

/** De halfvlakken van een bolle veelhoek met de klok mee: binnen = a·x + b·y ≤ c (a, b = de normaal naar buiten). */
function halfvlakken(v: Punt[]): [number, number, number][] {
  return v.map((p, i) => {
    const q = v[(i + 1) % v.length]!;
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
    const a = dy / l, b = -dx / l;
    return [a, b, a * p[0] + b * p[1]];
  });
}

/** Doorsnede van een veelhoek met een bolle veelhoek (beide met de klok mee). */
export function snijVeelhoek(a: Punt[], b: Punt[]): Punt[] {
  return halfvlakken(b).reduce((v, [x, y, c]) => (v.length ? knipVeelhoek(v, x, y, c) : v), a);
}

/** Veelhoek a min een bolle veelhoek b (beide met de klok mee): hoogstens één stuk per zijde van b, elk bol als a bol is. */
export function trekVeelhoekAf(a: Punt[], b: Punt[]): Punt[][] {
  if (veelhoekOppervlakte(snijVeelhoek(a, b)) < 0.5) return [a];
  const uit: Punt[][] = [];
  let rest = a;
  for (const [x, y, c] of halfvlakken(b)) {
    if (rest.length < 3) break;
    const stuk = knipVeelhoek(rest, -x, -y, -c);
    if (stuk.length >= 3 && veelhoekOppervlakte(stuk) > 0.5) uit.push(stuk);
    rest = knipVeelhoek(rest, x, y, c);
  }
  return uit;
}

/** Is de veelhoek bol (convex)? Een gestrekte hoek (een punt midden op een rechte zijde) mag. */
export function isBol(v: Punt[]): boolean {
  const w = metDeKlok(v);
  return w.every((p, i) => {
    const o = w[(i + w.length - 1) % w.length]!, q = w[(i + 1) % w.length]!;
    const kruis = (p[0] - o[0]) * (q[1] - p[1]) - (p[1] - o[1]) * (q[0] - p[0]);
    return kruis >= -1e-6 * Math.hypot(p[0] - o[0], p[1] - o[1]) * Math.hypot(q[0] - p[0], q[1] - p[1]);
  });
}

/** Lengte van elke zijde (zijde i loopt van punt i naar punt i + 1), in cm. */
export const zijdenVan = (v: Punt[]) => v.map((p, i) => { const q = v[(i + 1) % v.length]!; return Math.hypot(q[0] - p[0], q[1] - p[1]); });

/** Binnenhoek bij elk punt (graden), voor een veelhoek met de klok mee. */
export function hoekenVan(v: Punt[]): number[] {
  return v.map((p, i) => {
    const o = v[(i + v.length - 1) % v.length]!, q = v[(i + 1) % v.length]!;
    const inn = Math.atan2(p[1] - o[1], p[0] - o[0]), uit = Math.atan2(q[1] - p[1], q[0] - p[0]);
    // Met de klok mee (y naar onder) draai je op een bolle hoek naar rechts: de buitenhoek is uit − in.
    let buiten = (uit - inn) * GRAAD;
    while (buiten <= -180) buiten += 360;
    while (buiten > 180) buiten -= 360;
    return 180 - buiten;
  });
}

/** Snijden twee lijnstukken elkaar (niet alleen in een gemeenschappelijk eindpunt)? */
function snijden(a: Punt, b: Punt, c: Punt, d: Punt): boolean {
  const kant = (p: Punt, q: Punt, r: Punt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = kant(c, d, a), d2 = kant(c, d, b), d3 = kant(a, b, c), d4 = kant(a, b, d);
  return ((d1 > 1e-6 && d2 < -1e-6) || (d1 < -1e-6 && d2 > 1e-6)) && ((d3 > 1e-6 && d4 < -1e-6) || (d3 < -1e-6 && d4 > 1e-6));
}

/** Wat er niet klopt aan een vrije vorm, in gewone taal (leeg = in orde). */
export function vormFouten(punten: Punt[]): string[] {
  const v = metDeKlok(punten);
  if (v.length < 3) return ['De vorm heeft minstens drie hoekpunten nodig.'];
  for (let i = 0; i < v.length; i++) for (let j = i + 2; j < v.length; j++) {
    if (i === 0 && j === v.length - 1) continue;
    if (snijden(v[i]!, v[(i + 1) % v.length]!, v[j]!, v[(j + 1) % v.length]!)) return ['De muren van de vorm kruisen elkaar: kijk de volgorde van de hoekpunten na.'];
  }
  if (zijdenVan(v).some((l) => l < 20)) return ['Een muur van de vorm is korter dan 20 cm.'];
  if (veelhoekOppervlakte(v) < 1e4) return ['De vorm is kleiner dan 1 m².'];
  if (!isBol(v)) return ['De vorm heeft een inspringende hoek: dat kan nog niet in één vrije vorm (maak er twee delen van).'];
  return [];
}

/** Snijpunt van twee lijnen (punt + richting); undefined als ze evenwijdig zijn. */
function snijpunt([px, py]: Punt, [dx, dy]: Punt, [qx, qy]: Punt, [ex, ey]: Punt): Punt | undefined {
  const det = dx * ey - dy * ex;
  if (Math.abs(det) < 1e-9) return undefined;
  const t = ((qx - px) * ey - (qy - py) * ex) / det;
  return [px + t * dx, py + t * dy];
}

/**
 * De zijden van een veelhoek een eind naar buiten (positief) of naar binnen (negatief) verschuiven, per zijde (zijde i
 * loopt van punt i naar i + 1, met de klok mee); de nieuwe hoekpunten zijn de snijpunten. Bv. van de binnenmaten naar
 * de as van de muren (+ een halve muurdikte), of van de as naar het binnenvlak (− een halve muurdikte).
 */
export function verschuifZijden(punten: Punt[], afstand: number | number[]): Punt[] {
  const v = metDeKlok(punten);
  const n = v.length;
  const lijnen = v.map((p, i) => {
    const q = v[(i + 1) % n]!;
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
    const t = typeof afstand === 'number' ? afstand : afstand[i] ?? 0;
    // De normaal naar buiten: met de klok mee op de tekening ligt de ruimte rechts van de looprichting.
    return { p: [p[0] + (dy / l) * t, p[1] - (dx / l) * t] as Punt, d: [dx / l, dy / l] as Punt };
  });
  return v.map((_, i) => {
    const a = lijnen[(i + n - 1) % n]!, b = lijnen[i]!;
    return snijpunt(a.p, a.d, b.p, b.d) ?? b.p;
  });
}

// ---------- vrije vorm uit gemeten maten ----------

/** Een vierhoek uit gemeten maten (zie `vierhoekUitZijden` en `vierhoekUitHoeken`). */
export interface VormUitMaten {
  /** Hoekpunten A, B, C, D (cm), met de klok mee: A = (0, 0), B rechts ervan op de x-as, C en D eronder. Leeg als het niet kan. */
  punten: Punt[];
  /** Binnenhoeken bij A, B, C en D (graden, op 0,1°). */
  hoeken: number[];
  /** De zijden AB, BC, CD en DA (cm, op 0,1 cm). */
  zijden: number[];
  /** De diagonalen AC en BD (cm, op 0,1 cm): meet de tweede na als controle. */
  diagonalen: [number, number];
  /** Waarom de maten niet kunnen, in gewone taal. Leeg = in orde. */
  fouten: string[];
  /** Wat je best nakijkt (een inspringende of bijna gestrekte hoek). */
  waarschuwingen: string[];
}

const cm1 = (x: number) => Math.round(x * 10) / 10;
const tekstCm = (x: number) => `${String(cm1(x)).replace('.', ',')} cm`;

function uitkomst(punten: Punt[], fouten: string[]): VormUitMaten {
  if (fouten.length) return { punten: [], hoeken: [], zijden: [], diagonalen: [0, 0], fouten, waarschuwingen: [] };
  const p = punten.map(fijnPunt);
  const hoeken = hoekenVan(p).map(cm1);
  const waarschuwingen: string[] = [];
  'ABCD'.split('').forEach((naam, i) => {
    if (hoeken[i]! > 180.05) waarschuwingen.push(`De hoek bij ${naam} is ${String(hoeken[i]).replace('.', ',')}°: een inspringende hoek. Kijk de diagonaal na; zo'n vorm kan nog niet als één vrije vorm.`);
    else if (hoeken[i]! > 178) waarschuwingen.push(`De hoek bij ${naam} is ${String(hoeken[i]).replace('.', ',')}°, bijna gestrekt: is dat wel een hoek?`);
  });
  const afst = (a: Punt, b: Punt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  return { punten: p, hoeken, zijden: zijdenVan(p).map(cm1), diagonalen: [cm1(afst(p[0]!, p[2]!)), cm1(afst(p[1]!, p[3]!))], fouten: [], waarschuwingen };
}

/**
 * Een vierhoek ABCD uit vier gemeten zijden en één diagonaal, zoals een inmeter meet: AB, BC, CD, DA en de diagonaal AC.
 * De diagonaal deelt de vierhoek in twee driehoeken (ABC en ACD); elke driehoek moet kunnen bestaan (de som van twee
 * zijden is groter dan de derde). A ligt op (0, 0), B rechts ervan; de vorm loopt met de klok mee. Verschuif of draai
 * de punten daarna naar hun plaats (zie `plaatsVorm`). Maten in cm, op dezelfde plaats gemeten (bv. op de as van de muren).
 */
export function vierhoekUitZijden(ab: number, bc: number, cd: number, da: number, ac: number): VormUitMaten {
  const fouten: string[] = [];
  for (const [naam, l] of [['AB', ab], ['BC', bc], ['CD', cd], ['DA', da], ['De diagonaal AC', ac]] as const) {
    if (!(l > 0)) fouten.push(`${naam.startsWith('De') ? naam : `Zijde ${naam}`} moet langer zijn dan 0 cm.`);
  }
  if (fouten.length) return uitkomst([], fouten);
  const driehoek = (p: string, lp: number, q: string, lq: number) => {
    if (lp + lq <= ac + 0.05) fouten.push(`${p} en ${q} samen (${tekstCm(lp + lq)}) zijn niet langer dan de diagonaal AC (${tekstCm(ac)}): zo'n driehoek bestaat niet. Meet de diagonaal of een van die zijden na.`);
    else if (lp + ac <= lq + 0.05) fouten.push(`${q} (${tekstCm(lq)}) is langer dan ${p} en de diagonaal AC samen (${tekstCm(lp + ac)}): zo'n driehoek bestaat niet. Meet ${q} na.`);
    else if (lq + ac <= lp + 0.05) fouten.push(`${p} (${tekstCm(lp)}) is langer dan ${q} en de diagonaal AC samen (${tekstCm(lq + ac)}): zo'n driehoek bestaat niet. Meet ${p} na.`);
  };
  driehoek('AB', ab, 'BC', bc);
  driehoek('DA', da, 'CD', cd);
  if (fouten.length) return uitkomst([], fouten);
  // Hoek bij A tussen AB en AC (driehoek ABC) en tussen AC en AD (driehoek ACD): de cosinusregel.
  const hoek = (naast1: number, naast2: number, over: number) => Math.acos(Math.max(-1, Math.min(1, (naast1 * naast1 + naast2 * naast2 - over * over) / (2 * naast1 * naast2))));
  const t = hoek(ab, ac, bc), f = hoek(ac, da, cd);
  // Met de klok mee op de tekening (y naar onder): C en D liggen onder AB, D aan de andere kant van AC dan B.
  return uitkomst([[0, 0], [ab, 0], [ac * Math.cos(t), ac * Math.sin(t)], [da * Math.cos(t + f), da * Math.sin(t + f)]], []);
}

/**
 * Een vierhoek ABCD uit drie zijden en de twee hoeken ertussen: AB, BC, CD en de binnenhoeken bij B en C (graden). De
 * vierde zijde DA volgt eruit. A ligt op (0, 0), B rechts ervan; de vorm loopt met de klok mee.
 */
export function vierhoekUitHoeken(ab: number, bc: number, cd: number, hoekB: number, hoekC: number): VormUitMaten {
  const fouten: string[] = [];
  for (const [naam, l] of [['AB', ab], ['BC', bc], ['CD', cd]] as const) if (!(l > 0)) fouten.push(`Zijde ${naam} moet langer zijn dan 0 cm.`);
  for (const [naam, h] of [['B', hoekB], ['C', hoekC]] as const) if (!(h > 0 && h < 180)) fouten.push(`De hoek bij ${naam} moet tussen 0° en 180° liggen.`);
  if (fouten.length) return uitkomst([], fouten);
  // Lopen langs de omtrek: op elke hoek draai je (met de klok mee) 180° min de binnenhoek.
  const koers1 = (180 - hoekB) / GRAAD, koers2 = koers1 + (180 - hoekC) / GRAAD;
  const A: Punt = [0, 0], B: Punt = [ab, 0];
  const C: Punt = [B[0] + bc * Math.cos(koers1), B[1] + bc * Math.sin(koers1)];
  const D: Punt = [C[0] + cd * Math.cos(koers2), C[1] + cd * Math.sin(koers2)];
  const da = Math.hypot(D[0], D[1]);
  if (da < 1) fouten.push('Met deze maten komt D op A uit: er blijft geen vierde muur over.');
  else if (snijden(A, B, C, D) || snijden(B, C, D, A)) fouten.push('Met deze maten kruisen de muren elkaar: kijk de hoeken na (gemeten aan de binnenkant van de vorm?).');
  else {
    // De hoeken bij A en D moeten ook binnen de vorm liggen (de vorm loopt met de klok mee).
    if (dubbeleOppervlakte([A, B, C, D]) <= 0) fouten.push('Met deze maten draait de vorm de verkeerde kant op: kijk de hoeken na (gemeten aan de binnenkant van de vorm?).');
  }
  return uitkomst([A, B, C, D], fouten);
}

/**
 * Zet een vorm op haar plaats: het eerste punt op `naar`, en (met `richting`, graden met de klok mee vanaf de x-as) de
 * eerste zijde in die richting. Zo komt een gemeten vierhoek bv. met AB tegen de gevel van de woning.
 */
export function plaatsVorm(punten: Punt[], naar: Punt, richting = 0): Punt[] {
  if (!punten.length) return [];
  const [ox, oy] = punten[0]!;
  const nu = punten.length > 1 ? Math.atan2(punten[1]![1] - oy, punten[1]![0] - ox) : 0;
  const a = richting / GRAAD - nu, c = Math.cos(a), s = Math.sin(a);
  return punten.map(([x, y]) => fijnPunt([naar[0] + (x - ox) * c - (y - oy) * s, naar[1] + (x - ox) * s + (y - oy) * c]));
}

// ---------- verdiepingen en samengestelde ruimtes ----------

export const niveauVan = (x: { niveau?: number }) => x.niveau ?? 0;

/** Namen van alle verdiepingen (minstens het gelijkvloers). */
export function verdiepingenVan(plan: Plattegrond): { naam: string }[] {
  const n = Math.max(1, plan.verdiepingen?.length ?? 0, ...plan.ruimtes.map((r) => niveauVan(r) + 1));
  return Array.from({ length: n }, (_, i) => plan.verdiepingen?.[i] ?? { naam: i === 0 ? 'Gelijkvloers' : `Verdieping ${i}` });
}

/** Alleen de ruimtes, openingen en meubels van één verdieping. */
export function niveauPlan(plan: Plattegrond, niveau: number): Plattegrond {
  return {
    ...plan,
    ruimtes: plan.ruimtes.filter((r) => niveauVan(r) === niveau),
    openingen: plan.openingen.filter((o) => niveauVan(o) === niveau),
    meubels: plan.meubels.filter((m) => niveauVan(m) === niveau),
    ...(plan.daklichten ? { daklichten: plan.daklichten.filter((l) => niveauVan(l) === niveau) } : {}),
    ...(plan.toestellen ? { toestellen: plan.toestellen.filter((t) => niveauVan(t) === niveau) } : {}),
    ...(plan.leidingen ? { leidingen: plan.leidingen.filter((l) => niveauVan(l) === niveau) } : {}),
    ...(plan.losseWanden ? { losseWanden: plan.losseWanden.filter((w) => niveauVan(w) === niveau) } : {}),
  };
}

/** Hoogte van de vloer van een verdieping boven het maaiveld (cm). */
export const vloerHoogte = (plan: Plattegrond, niveau: number) => niveau * (plan.muurhoogte + VLOERDIKTE);

/**
 * Alle delen van een ruimte (hoofddeel eerst), als rechthoek: bij een vrije vorm is dat haar omsluitende kader, met de
 * omtrek erbij (`omtrek`; de vorm zelf geeft `vormVanDeel`).
 */
export function delenVan(r: Ruimte): Deel[] {
  return [r.omtrek ? { x: r.x, y: r.y, b: r.b, d: r.d, omtrek: r.omtrek } : { x: r.x, y: r.y, b: r.b, d: r.d }, ...(r.delen ?? [])];
}

const binnen = (p: Deel, x: number, y: number) => (p.omtrek ? binnenVeelhoek(vormVanDeel(p), x, y) : x > p.x && x < p.x + p.b && y > p.y && y < p.y + p.d);

/** Rechthoek a min rechthoek r: hoogstens 4 stukken (boven, onder, links, rechts). */
export function trekAf(a: Rechthoek, r: Rechthoek): Rechthoek[] {
  const x0 = Math.max(a.x, r.x), x1 = Math.min(a.x + a.b, r.x + r.b);
  const y0 = Math.max(a.y, r.y), y1 = Math.min(a.y + a.d, r.y + r.d);
  if (x1 - x0 < 0.5 || y1 - y0 < 0.5) return [a];
  const uit: Rechthoek[] = [];
  if (y0 > a.y + 0.5) uit.push({ x: a.x, y: a.y, b: a.b, d: y0 - a.y });
  if (y1 < a.y + a.d - 0.5) uit.push({ x: a.x, y: y1, b: a.b, d: a.y + a.d - y1 });
  if (x0 > a.x + 0.5) uit.push({ x: a.x, y: y0, b: x0 - a.x, d: y1 - y0 });
  if (x1 < a.x + a.b - 0.5) uit.push({ x: x1, y: y0, b: a.x + a.b - x1, d: y1 - y0 });
  return uit;
}

/** Zet de delen van een ruimte: het grootste deel wordt het hoofddeel (met zijn omtrek als het een vrije vorm is). */
function zetDelen(r: Ruimte, delen: Deel[]) {
  const s = [...delen].sort((a, b) => deelOppervlakte(b) - deelOppervlakte(a));
  const [hoofd, ...rest] = s;
  Object.assign(r, { x: hoofd!.x, y: hoofd!.y, b: hoofd!.b, d: hoofd!.d });
  if (hoofd!.omtrek) r.omtrek = hoofd!.omtrek; else delete r.omtrek;
  if (rest.length) r.delen = rest; else delete r.delen;
}

/** Het omsluitende kader van de delen van een ruimte. */
function delenKader(delen: Deel[]): Rechthoek {
  const x = Math.min(...delen.map((p) => p.x)), y = Math.min(...delen.map((p) => p.y));
  return { x, y, b: Math.max(...delen.map((p) => p.x + p.b)) - x, d: Math.max(...delen.map((p) => p.y + p.d)) - y };
}

/** Ligt kader `a` nog aan dezelfde kant als kader `oud` (dezelfde rand)? */
function aanKant(a: Rechthoek, oud: Rechthoek, kant: GevelKant): boolean {
  if (kant === 'boven') return gelijk(a.y, oud.y);
  if (kant === 'onder') return gelijk(a.y + a.d, oud.y + oud.d);
  if (kant === 'links') return gelijk(a.x, oud.x);
  return gelijk(a.x + a.b, oud.x + oud.b);
}

/**
 * Tekent een nieuwe ruimte, ook bovenop bestaande ruimtes: wat overlapt, wordt uit die ruimtes
 * weggesneden ("ruimte in ruimte"). De rest van een ruimte kan zo een L- of U-vorm krijgen.
 */
export function tekenRuimteIn(plan: Plattegrond, nieuw: Ruimte): void {
  const n = niveauVan(nieuw);
  const opp = (x: Deel[]) => x.reduce((t, p) => t + deelOppervlakte(p), 0);
  const geraakt: { id: string; overlap: number }[] = [];
  // Een vrije vorm: de rechthoek eruit knippen; wat overblijft, zijn bolle stukken (delen van dezelfde ruimte).
  const zonder = (p: Deel): Deel[] => {
    if (!p.omtrek) return trekAf(p, nieuw);
    const v = vormVanDeel(p), stukken = trekVeelhoekAf(v, rechthoekVorm(nieuw));
    return stukken.length === 1 && stukken[0] === v ? [p] : stukken.map(alsDeel);
  };
  for (const r of [...plan.ruimtes]) {
    if (niveauVan(r) !== n) continue;
    const oud = delenVan(r);
    const rest = oud.flatMap(zonder).filter((p) => p.b >= 1 && p.d >= 1);
    if (rest.length === oud.length && rest.every((p, i) => p === oud[i])) continue;
    geraakt.push({ id: r.id, overlap: opp(oud) - opp(rest) });
    if (!rest.length) plan.ruimtes.splice(plan.ruimtes.indexOf(r), 1);
    else zetDelen(r, rest);
  }
  plan.ruimtes.push(nieuw);
  // De gevel van de ruimte waaruit het meest gesneden werd, gaat mee naar de nieuwe ruimte.
  for (const g of geraakt.sort((a, b) => b.overlap - a.overlap)) erfGevel(plan, g.id, nieuw.id, false);
}

/**
 * Een nieuwe ruimte (na indelen of "ruimte in ruimte") neemt de gevelkeuzes per kant over van de ruimte
 * waaruit ze komt; anders valt haar buitenmuur terug op de standaardgevel.
 */
export function erfGevel(plan: Plattegrond, van: string, naar: string, overschrijven = true) {
  // Tegen de buren (ronde 11): een muurvlak van de nieuwe ruimte aan dezelfde kant staat ook tegen de buren.
  if (plan.tegenBuren?.length) {
    for (const sleutel of plan.tegenBuren.filter((x) => x.startsWith(`${van}:`))) zetTegenBuren(plan, `${naar}:${sleutel.slice(van.length + 1)}`, true);
  }
  const v = plan.gevelOntwerp?.vlakken;
  if (!v) return;
  for (const kant of ['boven', 'onder', 'links', 'rechts'] as const) {
    const k = v[`${van}:${kant}`];
    if (k && (overschrijven || !v[`${naar}:${kant}`])) v[`${naar}:${kant}`] = { ...k };
  }
  // Schuine muurvlakken (`ruimte:s104`) ook.
  for (const sleutel of Object.keys(v).filter((x) => x.startsWith(`${van}:s`))) {
    const doel = `${naar}:${sleutel.slice(van.length + 1)}`;
    if (overschrijven || !v[doel]) v[doel] = { ...v[sleutel]! };
  }
}

/**
 * Deelt ruimtes met een wand: een staande (as 'v', op x = lijn) of liggende (as 'h', op y = lijn) wand
 * van `van` tot `tot`. Elke ruimte(deel) dat de wand kruist, wordt gesplitst; de stukken aan de
 * grote kant (rechts of onder) worden een nieuwe ruimte. Geeft de nieuwe ruimtes terug.
 */
export function splitsRuimtes(
  plan: Plattegrond, niveau: number, as: 'h' | 'v', lijn: number, van: number, tot: number,
  nieuweRuimte: (oud: Ruimte) => Ruimte, minimum = 30,
): Ruimte[] {
  const nieuw: Ruimte[] = [];
  for (const r of [...plan.ruimtes]) {
    if (niveauVan(r) !== niveau) continue;
    const blijft: Deel[] = [], gaat: Deel[] = [];
    for (const p of delenVan(r)) {
      if (p.omtrek) {
        // Vrije vorm: de wand knipt de veelhoek in twee (bij een bolle vorm zijn beide stukken weer bol).
        const v = vormVanDeel(p), i = as === 'v' ? 0 : 1;
        const langs = v.map((q) => q[i]!);
        // Waar de wand de vorm snijdt (van–tot langs de wand).
        const snij: number[] = [];
        v.forEach((q, k) => {
          const w = v[(k + 1) % v.length]!;
          if ((q[i]! - lijn) * (w[i]! - lijn) > 0 || q[i] === w[i]) return;
          const t = (lijn - q[i]!) / (w[i]! - q[i]!);
          snij.push(q[1 - i]! + t * (w[1 - i]! - q[1 - i]!));
        });
        const d0 = Math.min(...snij), d1 = Math.max(...snij);
        const raakt = snij.length > 0 && (van === tot ? van > d0 && van < d1 : Math.min(tot, d1) - Math.max(van, d0) > 1);
        if (!(lijn > Math.min(...langs) + minimum && lijn < Math.max(...langs) - minimum && raakt)) { blijft.push(p); continue; }
        const [a, b] = as === 'v' ? [1, 0] : [0, 1];
        blijft.push(alsDeel(knipVeelhoek(v, a, b, lijn)));
        gaat.push(alsDeel(knipVeelhoek(v, -a, -b, -lijn)));
        continue;
      }
      const [a0, a1, d0, d1] = as === 'v' ? [p.x, p.x + p.b, p.y, p.y + p.d] : [p.y, p.y + p.d, p.x, p.x + p.b];
      // Een klik (van = tot) moet in het deel liggen; een getekende wand moet het deel echt overlappen.
      const raakt = van === tot ? van > d0 && van < d1 : Math.min(tot, d1) - Math.max(van, d0) > 1;
      const kruist = lijn > a0 + minimum && lijn < a1 - minimum && raakt;
      if (!kruist) { blijft.push(p); continue; }
      if (as === 'v') { blijft.push({ ...p, b: lijn - p.x }); gaat.push({ ...p, x: lijn, b: p.x + p.b - lijn }); }
      else { blijft.push({ ...p, d: lijn - p.y }); gaat.push({ ...p, y: lijn, d: p.y + p.d - lijn }); }
    }
    if (!gaat.length) continue;
    const oudKader = delenKader(delenVan(r));
    zetDelen(r, blijft);
    const b = nieuweRuimte(r);
    b.niveau = niveau;
    zetDelen(b, gaat);
    // Ronde 12: een accentmuur blijft alleen bij het stuk dat nog aan die kant van de oude ruimte ligt (anders zou de
    // nieuwe wand ze krijgen).
    for (const x of [r, b]) if (x.accent && !aanKant(delenKader(delenVan(x)), oudKader, x.accent.kant)) delete x.accent;
    plan.ruimtes.push(b);
    erfGevel(plan, r.id, b.id);
    nieuw.push(b);
  }
  return nieuw;
}

// ---------- muren afleiden ----------

/** Richting d langs de as en normaal n naar de plus-kant van een muur of opening (h: x en y, v: y en x, s: zie `Muur`). */
export function asVan(x: { as: 'h' | 'v' | 's'; richting?: Punt }): { d: Punt; n: Punt } {
  if (x.as === 'h') return { d: [1, 0], n: [0, 1] };
  if (x.as === 'v' || !x.richting) return { d: [0, 1], n: [1, 0] };
  const [dx, dy] = x.richting;
  return { d: [dx, dy], n: [dy, -dx] };
}

/** Het punt op het plan bij s langs de as en w dwars erop (w = `lijn` is de as zelf). */
export function langsAs(x: { as: 'h' | 'v' | 's'; richting?: Punt }, s: number, w: number): Punt {
  const { d, n } = asVan(x);
  return [s * d[0] + w * n[0], s * d[1] + w * n[1]];
}

/** Omgekeerd: s (langs de as) en w (dwars) van een punt op het plan. */
export function opAs(x: { as: 'h' | 'v' | 's'; richting?: Punt }, [px, py]: Punt): [number, number] {
  const { d, n } = asVan(x);
  return [px * d[0] + py * d[1], px * n[0] + py * n[1]];
}

/** Alle muren van de plattegrond, afgeleid uit de randen van de ruimtes. */
export function murenVan(plan: Plattegrond): Muur[] {
  interface Rand { as: 'h' | 'v'; lijn: number; van: number; tot: number; kant: '+' | '-'; ruimte: string }
  const randen: Rand[] = [];
  /** Schuine randen van een vrije vorm: richting d (dy > 0), begin- en eindpunt, kant van de ruimte. */
  const schuin: { d: Punt; a: Punt; b: Punt; kant: '+' | '-'; ruimte: string }[] = [];
  for (const r of plan.ruimtes) {
    for (const p of delenVan(r)) {
      if (!p.omtrek) {
        randen.push({ as: 'h', lijn: p.y, van: p.x, tot: p.x + p.b, kant: '+', ruimte: r.id });
        randen.push({ as: 'h', lijn: p.y + p.d, van: p.x, tot: p.x + p.b, kant: '-', ruimte: r.id });
        randen.push({ as: 'v', lijn: p.x, van: p.y, tot: p.y + p.d, kant: '+', ruimte: r.id });
        randen.push({ as: 'v', lijn: p.x + p.b, van: p.y, tot: p.y + p.d, kant: '-', ruimte: r.id });
        continue;
      }
      // Vrije vorm (met de klok mee: de ruimte ligt rechts van de looprichting). Een rand die toch horizontaal of
      // verticaal ligt, gaat de gewone weg, zodat ze een muur deelt met een rechthoekige ruimte ernaast.
      const v = vormVanDeel(p);
      v.forEach((a, i) => {
        const b = v[(i + 1) % v.length]!;
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
        if (l < 0.5) return;
        if (Math.abs(dy) < 0.5) randen.push({ as: 'h', lijn: (a[1] + b[1]) / 2, van: Math.min(a[0], b[0]), tot: Math.max(a[0], b[0]), kant: dx > 0 ? '+' : '-', ruimte: r.id });
        else if (Math.abs(dx) < 0.5) randen.push({ as: 'v', lijn: (a[0] + b[0]) / 2, van: Math.min(a[1], b[1]), tot: Math.max(a[1], b[1]), kant: dy < 0 ? '+' : '-', ruimte: r.id });
        else {
          const d: Punt = dy > 0 ? [dx / l, dy / l] : [-dx / l, -dy / l];
          // De ruimte ligt langs (−dy, dx); de plus-kant van de muur langs n = (d.y, −d.x).
          schuin.push({ d, a, b, kant: (-dy * d[1] - dx * d[0]) / l > 0 ? '+' : '-', ruimte: r.id });
        }
      });
    }
  }
  const groepen = new Map<string, Rand[]>();
  for (const r of randen) {
    const sleutel = `${r.as}:${Math.round(r.lijn)}`;
    groepen.set(sleutel, [...(groepen.get(sleutel) ?? []), r]);
  }
  const muren: Muur[] = [];
  for (const groep of groepen.values()) {
    const { as, lijn } = groep[0]!;
    const punten = [...new Set(groep.flatMap((r) => [r.van, r.tot]))].sort((a, b) => a - b);
    let huidig: Muur | undefined;
    for (let i = 0; i + 1 < punten.length; i++) {
      const a = punten[i]!, b = punten[i + 1]!;
      if (b - a < 0.5) continue;
      const dekt = (kant: '+' | '-') => groep.find((r) => r.kant === kant && r.van <= a + 0.01 && r.tot >= b - 0.01)?.ruimte;
      const plus = dekt('+'), min = dekt('-');
      // Geen muur tussen twee delen van dezelfde ruimte.
      if ((!plus && !min) || plus === min) {
        huidig = undefined;
        continue;
      }
      const soort = plus && min ? 'binnen' : 'buiten';
      if (huidig && gelijk(huidig.tot, a) && huidig.soort === soort && huidig.plus === plus && huidig.min === min) {
        huidig.tot = b;
        continue;
      }
      huidig = { id: '', as, lijn, van: a, tot: b, soort, dikte: soort === 'buiten' ? plan.buitenmuur : plan.binnenmuur, plus, min };
      muren.push(huidig);
    }
  }
  muren.forEach((m) => (m.id = `${m.as}${Math.round(m.lijn)}_${Math.round(m.van)}`));
  // Schuine muren: per lijn (zelfde richting en zelfde afstand tot de oorsprong, met wat speling voor afrondingen),
  // en dan net zoals hierboven in stukken geknipt op alle eindpunten.
  const lijnen: { d: Punt; n: Punt; lijn: number; randen: { van: number; tot: number; kant: '+' | '-'; ruimte: string }[] }[] = [];
  for (const s of schuin) {
    const w = (q: Punt, n: Punt) => q[0] * n[0] + q[1] * n[1];
    let g = lijnen.find((x) => Math.abs(x.d[0] * s.d[1] - x.d[1] * s.d[0]) < 1e-3 && Math.abs(w(s.a, x.n) - x.lijn) < 0.5 && Math.abs(w(s.b, x.n) - x.lijn) < 0.5);
    if (!g) {
      const n: Punt = [s.d[1], -s.d[0]];
      g = { d: s.d, n, lijn: w(s.a, n), randen: [] };
      lijnen.push(g);
    }
    const ta = w(s.a, g.d), tb = w(s.b, g.d);
    g.randen.push({ van: Math.min(ta, tb), tot: Math.max(ta, tb), kant: s.kant, ruimte: s.ruimte });
  }
  const ids = new Set(muren.map((m) => m.id));
  for (const g of lijnen) {
    const punten = g.randen.flatMap((r) => [r.van, r.tot]).sort((a, b) => a - b).filter((x, i, l) => !i || x - l[i - 1]! > 0.01);
    const hoek = Math.round(Math.atan2(g.d[1], g.d[0]) * GRAAD);
    let huidig: Muur | undefined;
    for (let i = 0; i + 1 < punten.length; i++) {
      const a = punten[i]!, b = punten[i + 1]!;
      if (b - a < 0.5) continue;
      const dekt = (kant: '+' | '-') => g.randen.find((r) => r.kant === kant && r.van <= a + 0.05 && r.tot >= b - 0.05)?.ruimte;
      const plus = dekt('+'), min = dekt('-');
      if ((!plus && !min) || plus === min) { huidig = undefined; continue; }
      const soort = plus && min ? 'binnen' : 'buiten';
      if (huidig && gelijk(huidig.tot, a) && huidig.soort === soort && huidig.plus === plus && huidig.min === min) {
        huidig.tot = b;
        huidig.punten![1] = langsAs(huidig, b, g.lijn);
        continue;
      }
      huidig = { id: '', as: 's', lijn: g.lijn, van: a, tot: b, soort, dikte: soort === 'buiten' ? plan.buitenmuur : plan.binnenmuur, plus, min, richting: g.d, punten: [[0, 0], [0, 0]] };
      huidig.punten = [langsAs(huidig, a, g.lijn), langsAs(huidig, b, g.lijn)];
      let id = `s${hoek}_${Math.round(g.lijn)}_${Math.round(a)}`;
      for (let k = 2; ids.has(id); k++) id = `s${hoek}_${Math.round(g.lijn)}_${Math.round(a)}_${k}`;
      ids.add(id);
      huidig.id = id;
      muren.push(huidig);
    }
  }
  return muren;
}

/**
 * Vlak van een muur in de plattegrond, met hoeken netjes aangesloten. Een rechte muur is een rechthoek (x, y, b, d); een
 * schuine muur heeft daarnaast haar grondvlak als veelhoek (`punten`, x, y, b, d is dan het omsluitende kader) en per zijde
 * van die veelhoek wat ze is (`randen`, voor het materiaal in de 3D).
 */
export interface MuurVlak {
  x: number; y: number; b: number; d: number; verlengdBegin: boolean; verlengdEinde: boolean;
  punten?: Punt[];
  randen?: MuurRand[];
}

/**
 * Wat een zijde van het grondvlak van een schuine muur is: haar min- of plus-kant, een kopse kant tegen een andere muur
 * (`kop`, niet te zien), een naad waar dezelfde muur verder loopt (`naad`), een snede bij een opening (`snede`, de dagkant),
 * of de voortzetting van een zijde van een rechte muur op de hoek (die zijde van die muur: zelfde materiaal).
 */
export type MuurRand = 'min' | 'plus' | 'kop' | 'naad' | 'snede' | { muur: string; kant: 'min' | 'plus' };

export function muurVlak(m: Muur, muren: Muur[]): MuurVlak {
  if (m.as === 's') return schuinVlak(m, muren);
  const half = m.dikte / 2;
  let begin = m.van, einde = m.tot, verlengdBegin = false, verlengdEinde = false;
  const loodrecht = muren.filter((x) => x.as !== m.as && x.as !== 's');
  if (m.as === 'h') {
    for (const [p, isBegin] of [[m.van, true], [m.tot, false]] as const) {
      const verder = muren.some((x) => x !== m && x.as === 'h' && gelijk(x.lijn, m.lijn) && (isBegin ? gelijk(x.tot, p) : gelijk(x.van, p)));
      if (verder) continue;
      const door = loodrecht.filter((v) => gelijk(v.lijn, p) && v.van < m.lijn - 0.5 && v.tot > m.lijn + 0.5);
      const eindigt = loodrecht.filter((v) => gelijk(v.lijn, p) && (gelijk(v.van, m.lijn) || gelijk(v.tot, m.lijn)));
      if (door.length) {
        const t = Math.max(...door.map((v) => v.dikte)) / 2;
        if (isBegin) begin = p + t; else einde = p - t;
      } else if (eindigt.length) {
        const t = Math.max(...eindigt.map((v) => v.dikte)) / 2;
        if (isBegin) { begin = p - t; verlengdBegin = true; } else { einde = p + t; verlengdEinde = true; }
      } else {
        const tot = totSchuin(m, p, isBegin, muren);
        if (tot !== undefined) { if (isBegin) begin = tot; else einde = tot; }
      }
    }
    return { x: begin, y: m.lijn - half, b: einde - begin, d: m.dikte, verlengdBegin, verlengdEinde };
  }
  for (const [p, isBegin] of [[m.van, true], [m.tot, false]] as const) {
    const h = loodrecht.filter((x) => gelijk(x.lijn, p) && x.van <= m.lijn + 0.5 && x.tot >= m.lijn - 0.5);
    if (h.length) {
      const t = Math.max(...h.map((x) => x.dikte)) / 2;
      if (isBegin) begin = p + t; else einde = p - t;
    } else if (!muren.some((x) => x !== m && x.as === 'v' && gelijk(x.lijn, m.lijn) && (isBegin ? gelijk(x.tot, p) : gelijk(x.van, p)))) {
      const tot = totSchuin(m, p, isBegin, muren);
      if (tot !== undefined) { if (isBegin) begin = tot; else einde = tot; }
    }
  }
  return { x: m.lijn - half, y: begin, b: m.dikte, d: einde - begin, verlengdBegin, verlengdEinde };
}

/** Schuine muren die door punt q lopen (q ligt binnen hun as, niet op een eindpunt van de hele lijn). */
function schuinDoor(q: Punt, muren: Muur[], behalve?: Muur): Muur | undefined {
  return muren.find((x) => {
    if (x.as !== 's' || x === behalve) return false;
    const [s, w] = opAs(x, q);
    if (!gelijk(w, x.lijn)) return false;
    if (s > x.van + 0.5 && s < x.tot - 0.5) return true;
    // Op een eindpunt: loopt dezelfde lijn daar verder (de muur is daar alleen in stukken geknipt)?
    const randpunt = gelijk(s, x.van) ? x.van : gelijk(s, x.tot) ? x.tot : undefined;
    return randpunt !== undefined && muren.some((y) => y !== x && y !== behalve && y.as === 's' && gelijk(y.lijn, x.lijn)
      && Math.abs(y.richting![0] * x.richting![1] - y.richting![1] * x.richting![0]) < 1e-3 && (gelijk(y.tot, randpunt) || gelijk(y.van, randpunt)));
  });
}

/** Waar het binnenvlak (plus- of min-kant) van een rechte muur het vlak van een schuine muur raakt (langs de muur). */
function binnenTotSchuin(m: Muur, p: number, isBegin: boolean, binnenPlus: boolean, muren: Muur[]): number | undefined {
  const s = schuinDoor(langsAs(m, p, m.lijn), muren) ?? muren.find((x) => x.as === 's' && x.punten!.some((q) => Math.hypot(q[0] - langsAs(m, p, m.lijn)[0], q[1] - langsAs(m, p, m.lijn)[1]) < 0.5));
  if (!s) return undefined;
  const { d } = asVan(m), as = asVan(s);
  const naarLijf: Punt = isBegin ? d : [-d[0], -d[1]];
  const kant = naarLijf[0] * as.n[0] + naarLijf[1] * as.n[1] > 0 ? 1 : -1;
  const x = snijpunt(langsAs(m, p, m.lijn + ((binnenPlus ? 1 : -1) * m.dikte) / 2), d, langsAs(s, 0, s.lijn + (kant * s.dikte) / 2), as.d);
  return x ? x[0] * d[0] + x[1] * d[1] : undefined;
}

/**
 * Een rechte muur die midden op een schuine muur eindigt (bv. een binnenwand in een vrije vorm): tot waar loopt ze door?
 * Tot de verste van de twee plaatsen waar haar zijvlakken het vlak van de schuine muur raken, zodat er geen spleet is
 * (het stukje dat in de schuine muur steekt, valt binnen die muur).
 */
function totSchuin(m: Muur, p: number, isBegin: boolean, muren: Muur[]): number | undefined {
  const q = langsAs(m, p, m.lijn);
  const s = schuinDoor(q, muren);
  if (!s) return undefined;
  const { d, n } = asVan(m), as = asVan(s);
  // Het vlak van de schuine muur aan de kant van deze muur.
  const naarLijf: Punt = isBegin ? d : [-d[0], -d[1]];
  const kant = naarLijf[0] * as.n[0] + naarLijf[1] * as.n[1] > 0 ? 1 : -1;
  const vlakPunt = langsAs(s, 0, s.lijn + (kant * s.dikte) / 2);
  const raak = [-1, 1].map((z) => {
    const start = langsAs(m, p, m.lijn + (z * m.dikte) / 2);
    const x = snijpunt(start, d, vlakPunt, as.d);
    return x ? x[0] * d[0] + x[1] * d[1] : p;
  });
  return isBegin ? Math.min(...raak) : Math.max(...raak);
}

/**
 * Het grondvlak van een schuine muur: een strook langs haar as, met aan elk einde een aansluiting op wat daar staat.
 *   - een muur die er doorloopt (T): afgeknipt op het vlak van die muur;
 *   - dezelfde lijn loopt verder: recht afgeknipt (`naad`);
 *   - één andere schuine muur eindigt er: verstek (de zijvlakken snijden elkaar);
 *   - één rechte muur eindigt er: die blijft een rechthoek die recht stopt op de hoek; de schuine muur vult de hoek op
 *     (in een trapje rond het einde van de rechte muur), zodat er geen gat en geen overlap is;
 *   - niets: recht afgeknipt.
 * `extra` maakt de muur (en de muren waarop ze aansluit) aan elke kant zoveel breder (de muurkap van de dakrand).
 */
function schuinVlak(m: Muur, muren: Muur[], extra = 0): MuurVlak {
  const { d, n } = asVan(m);
  const half = m.dikte / 2 + extra;
  const zijde = (w: number) => ({ p: langsAs(m, 0, m.lijn + w), d });
  const zMin = zijde(-half), zPlus = zijde(half);
  type Kap = { punten: Punt[]; randen: MuurRand[] };
  const recht = (s: number, rand: MuurRand): Kap => ({ punten: [langsAs(m, s, m.lijn - half), langsAs(m, s, m.lijn + half)], randen: [rand] });
  const kap = (s: number, isBegin: boolean): Kap => {
    const P = langsAs(m, s, m.lijn);
    const naarLijf: Punt = isBegin ? d : [-d[0], -d[1]];
    const op = (x: Muur) => { const [t, w] = opAs(x, P); return gelijk(w, x.lijn) && t > x.van - 0.5 && t < x.tot + 0.5; };
    // (op id: `muren` kan een andere lijst zijn dan die waar m uit komt)
    const rond = muren.filter((x) => x.id !== m.id && op(x));
    // Loopt er een muur door dit punt (ook als ze daar in stukken geknipt is)? Wisselt ze daar van dikte (binnen- naar
    // buitenmuur), dan de dunste: dan blijft er geen spleet, en wat in de dikkere muur steekt, valt erbinnen.
    const door = rond.filter((x) => {
      const t = opAs(x, P)[0];
      if (t > x.van + 0.5 && t < x.tot - 0.5) return true;
      return rond.some((y) => y !== x && y.as === x.as && gelijk(y.lijn, x.lijn) && (x.as !== 's' || Math.abs(y.richting![0] * x.richting![1] - y.richting![1] * x.richting![0]) < 1e-3)
        && ((gelijk(t, x.van) && gelijk(opAs(y, P)[0], y.tot)) || (gelijk(t, x.tot) && gelijk(opAs(y, P)[0], y.van))));
    }).sort((x, y) => x.dikte - y.dikte)[0];
    const zelfdeLijn = (x: Muur) => x.as === 's' && gelijk(x.lijn, m.lijn) && Math.abs(x.richting![0] * d[1] - x.richting![1] * d[0]) < 1e-3;
    if (door && !zelfdeLijn(door)) {
      // T: afknippen op het vlak van de doorlopende muur aan deze kant.
      const ax = asVan(door);
      const kant = naarLijf[0] * ax.n[0] + naarLijf[1] * ax.n[1] > 0 ? 1 : -1;
      const vlak = { p: langsAs(door, 0, door.lijn + kant * (door.dikte / 2 + extra)), d: ax.d };
      const a = snijpunt(zMin.p, d, vlak.p, vlak.d), b = snijpunt(zPlus.p, d, vlak.p, vlak.d);
      return a && b ? { punten: [a, b], randen: ['kop'] } : recht(s, 'kop');
    }
    if (rond.some(zelfdeLijn)) return recht(s, 'naad');
    const eindigen = rond.filter((x) => !zelfdeLijn(x));
    if (eindigen.length !== 1) return recht(s, 'kop');
    const R = eindigen[0]!;
    const ar = asVan(R), tR = opAs(R, P)[0];
    const naarR: Punt = gelijk(tR, R.van) ? ar.d : [-ar.d[0], -ar.d[1]];
    const hR = R.dikte / 2 + extra;
    // Kant van deze muur naar R toe (σS) en kant van R naar deze muur toe (σR).
    const sS = naarR[0] * n[0] + naarR[1] * n[1] > 0 ? 1 : -1;
    const sR = naarLijf[0] * ar.n[0] + naarLijf[1] * ar.n[1] > 0 ? 1 : -1;
    const vlakR = (z: number) => ({ p: langsAs(R, 0, R.lijn + z * hR), d: ar.d });
    const I = snijpunt(zijde(sS * half).p, d, vlakR(sR).p, ar.d), O = snijpunt(zijde(-sS * half).p, d, vlakR(-sR).p, ar.d);
    const ver = (q?: Punt) => !q || Math.hypot(q[0] - P[0], q[1] - P[1]) > 6 * Math.max(half, hR);
    if (ver(I) || ver(O)) return recht(s, 'kop');
    const rKant = (z: number): MuurRand => ({ muur: R.id, kant: z * sR > 0 ? 'plus' : 'min' });
    let punten: Punt[], randen: MuurRand[];
    if (R.as === 's') {
      // Verstek: de zijvlakken van beide muren snijden elkaar.
      punten = [I!, O!];
      randen = ['kop'];
    } else {
      // Rechte muur R stopt recht op de hoek: A en B zijn haar twee hoeken daar.
      const A = langsAs(R, tR, R.lijn + sR * hR), B = langsAs(R, tR, R.lijn - sR * hR);
      const dieper = (q: Punt) => (q[0] - P[0]) * naarR[0] + (q[1] - P[1]) * naarR[1];
      if (dieper(I!) > 0.01 && dieper(O!) > 0.01) {
        // Beide snijpunten liggen in R: afknippen op het vlak van R aan deze kant.
        const a = snijpunt(zijde(sS * half).p, d, A, ar.d)!, b = snijpunt(zijde(-sS * half).p, d, A, ar.d)!;
        punten = [a, b];
        randen = ['kop'];
      } else {
        punten = [I!, A, B, O!];
        randen = [dieper(I!) < -0.01 ? rKant(1) : 'kop', 'kop', dieper(O!) < -0.01 ? rKant(-1) : 'kop'];
      }
    }
    // Van de kant naar R (σS) naar de andere kant; de kap gaat van de min- naar de plus-kant.
    return sS > 0 ? { punten: [...punten].reverse(), randen: [...randen].reverse() } : { punten, randen };
  };
  const a = kap(m.van, true), b = kap(m.tot, false);
  // Rondom: de min-kant van begin tot einde, de kap aan het einde, de plus-kant terug, de kap aan het begin terug.
  const punten: Punt[] = [a.punten[0]!, ...b.punten, ...[...a.punten].reverse().slice(0, -1)];
  const randen: MuurRand[] = ['min', ...b.randen, 'plus', ...[...a.randen].reverse()];
  // Samenvallende punten weg (met de zijde die erop volgt).
  const p2: Punt[] = [], r2l: MuurRand[] = [];
  punten.forEach((p, i) => {
    const q = punten[(i + 1) % punten.length]!;
    if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.01) return;
    p2.push(p.map(fijn) as Punt);
    r2l.push(randen[i]!);
  });
  const k = kaderVanPunten(p2);
  return { ...k, verlengdBegin: false, verlengdEinde: false, punten: p2, randen: r2l };
}

/** De muur waarin een opening zit (of undefined als ze niet (meer) op een muur staat). */
export function muurVanOpening(o: Opening, muren: Muur[]): Muur | undefined {
  if (o.as === 's') {
    return muren.find((m) => m.as === 's' && gelijk(m.lijn, o.lijn) && (!o.richting || Math.abs(m.richting![0] * o.richting[1] - m.richting![1] * o.richting[0]) < 1e-3)
      && m.van <= o.midden - o.breedte / 2 + 0.5 && m.tot >= o.midden + o.breedte / 2 - 0.5);
  }
  return muren.find((m) => m.as === o.as && gelijk(m.lijn, o.lijn) && m.van <= o.midden - o.breedte / 2 + 0.5 && m.tot >= o.midden + o.breedte / 2 - 0.5);
}

/** Dichtstbijzijnde muur bij een punt (voor het plaatsen van ramen en deuren); `midden` = de plaats langs die muur. */
export function dichtsteMuur(muren: Muur[], x: number, y: number, maxAfstand = 40): { muur: Muur; midden: number; afstand: number } | undefined {
  let beste: { muur: Muur; midden: number; afstand: number } | undefined;
  for (const m of muren) {
    const [langs, dwars] = m.as === 's' ? opAs(m, [x, y]) : m.as === 'h' ? [x, y] : [y, x];
    if (langs < m.van || langs > m.tot) continue;
    const afstand = Math.abs(dwars - m.lijn);
    if (afstand <= maxAfstand && (!beste || afstand < beste.afstand)) beste = { muur: m, midden: langs, afstand };
  }
  return beste;
}

/** Een opening op deze muur, op plaats `midden` langs de muur (zet as, lijn en bij een schuine muur de richting). */
export function opMuur(m: Muur, midden: number): Pick<Opening, 'as' | 'lijn' | 'midden' | 'richting'> {
  return m.as === 's' ? { as: 's', lijn: m.lijn, midden, richting: m.richting } : { as: m.as, lijn: m.lijn, midden };
}

// ---------- oppervlaktes ----------

export interface RuimteMaten {
  /** Bruto (op de as van de muren) en netto vloeroppervlakte (m²). */
  bruto: number;
  netto: number;
  /** Netto binnenmaten (cm) en omtrek (m). */
  nb: number;
  nd: number;
  omtrek: number;
  /** Wandoppervlakte binnen (m²), zonder de openingen. */
  wand: number;
  /** Glasoppervlakte van ramen en buitendeuren (m², ongeveer 70 % van de opening). */
  glas: number;
  /** Glasoppervlakte van lichtkoepels en lichtstraten boven de ruimte (m², ongeveer 80 % van de dagmaat). */
  daklicht: number;
}

export function ruimteMaten(plan: Plattegrond, r: Ruimte, muren = murenVan(niveauPlan(plan, niveauVan(r)))): RuimteMaten {
  const eigen = muren.filter((m) => m.plus === r.id || m.min === r.id);
  const openingen = openingenVanRuimte(plan, r, muren);
  const openingM2 = openingen.reduce((t, o) => t + (o.breedte * o.hoogte) / 10000, 0);
  // Daglicht telt alleen via ramen en deuren in een buitenmuur.
  const glas = openingen.filter((o) => ['raam', 'buitendeur', 'schuifraam'].includes(o.soort) && muurVanOpening(o, muren)?.soort === 'buiten').reduce((t, o) => t + (o.breedte * o.hoogte * (o.soort === 'buitendeur' ? 0.3 : 0.7)) / 10000, 0);
  const delen = delenVan(r);
  const bruto = delen.reduce((t, p) => t + deelOppervlakte(p), 0);
  let netto: number, nb: number, nd: number, binnenOmtrek: number | undefined;
  if (delen.length === 1 && delen[0]!.omtrek) {
    // Vrije vorm: elke zijde schuift een halve muurdikte naar binnen (de dikste muur op die rand), zoals bij een rechthoek.
    const v = vormVanDeel(delen[0]!);
    const binnen = binnenVorm(v, muren);
    netto = veelhoekOppervlakte(binnen);
    const k = kaderVanPunten(binnen);
    nb = k.b;
    nd = k.d;
    binnenOmtrek = zijdenVan(binnen).reduce((t, l) => t + l, 0);
  } else if (delen.length === 1) {
    const dikte = (as: 'h' | 'v', lijn: number, van: number, tot: number) => {
      const op = muren.filter((m) => m.as === as && gelijk(m.lijn, lijn) && m.tot > van + 0.5 && m.van < tot - 0.5);
      return op.length ? Math.max(...op.map((m) => m.dikte)) : 0;
    };
    const tb = dikte('h', r.y, r.x, r.x + r.b), to = dikte('h', r.y + r.d, r.x, r.x + r.b);
    const tl = dikte('v', r.x, r.y, r.y + r.d), tr = dikte('v', r.x + r.b, r.y, r.y + r.d);
    nb = Math.max(0, r.b - (tl + tr) / 2);
    nd = Math.max(0, r.d - (tb + to) / 2);
    netto = nb * nd;
  } else {
    // Samengestelde ruimte: bruto min een halve muurdikte langs elke muur (benadering).
    netto = Math.max(0, bruto - eigen.reduce((t, m) => t + (m.tot - m.van) * (m.dikte / 2), 0));
    nb = r.b;
    nd = r.d;
  }
  const omtrek = binnenOmtrek !== undefined ? binnenOmtrek / 100 : delen.length === 1 ? (2 * (nb + nd)) / 100 : eigen.reduce((t, m) => t + (m.tot - m.van), 0) / 100;
  return {
    bruto: r2(bruto / 10000),
    netto: r2(netto / 10000),
    nb: r2(nb),
    nd: r2(nd),
    omtrek: r2(omtrek),
    wand: r2(Math.max(0, omtrek * (plan.muurhoogte / 100) - openingM2)),
    glas: r2(glas),
    daklicht: r2(daklichtenBoven(plan, r).reduce((t, l) => t + (l.b * l.d * DAKLICHT_GLAS) / 10000, 0)),
  };
}

/** Dikte van de dikste muur op de rand van p naar q (0 als er geen is), voor een rand in elke richting. */
function randDikte(p: Punt, q: Punt, muren: Muur[]): number {
  const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, e: Punt = [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
  const op = muren.filter((m) => {
    const { d } = asVan(m);
    if (Math.abs(d[0] * e[1] - d[1] * e[0]) > 1e-3) return false;
    const [sp, wp] = opAs(m, p), sq = opAs(m, q)[0];
    return gelijk(wp, m.lijn) && Math.min(m.tot, Math.max(sp, sq)) - Math.max(m.van, Math.min(sp, sq)) > 0.5;
  });
  return op.length ? Math.max(...op.map((m) => m.dikte)) : 0;
}

/** Het binnenvlak van een vrije vorm (elke zijde een halve muurdikte naar binnen), op de as als er geen muren zijn. */
export function binnenVorm(v: Punt[], muren: Muur[]): Punt[] {
  return verschuifZijden(v, v.map((p, i) => -randDikte(p, v[(i + 1) % v.length]!, muren) / 2));
}

/** Lichtkoepels en lichtstraten waarvan het midden boven deze ruimte ligt. */
export function daklichtenBoven(plan: Plattegrond, r: Ruimte): DakLicht[] {
  return (plan.daklichten ?? []).filter((l) => niveauVan(l) === niveauVan(r) && delenVan(r).some((p) => binnen(p, l.x + l.b / 2, l.y + l.d / 2)));
}

/** Openingen in de muren rond een ruimte. */
export function openingenVanRuimte(plan: Plattegrond, r: Ruimte, muren = murenVan(niveauPlan(plan, niveauVan(r)))): Opening[] {
  return plan.openingen.filter((o) => {
    if (niveauVan(o) !== niveauVan(r)) return false;
    const m = muurVanOpening(o, muren);
    return !!m && (m.plus === r.id || m.min === r.id);
  });
}

/** De ruimte aan de binnenkant van een opening in een buitenmuur (of de ruimtes aan beide kanten). */
export function ruimtesBijOpening(plan: Plattegrond, o: Opening, muren = murenVan(niveauPlan(plan, niveauVan(o)))): Ruimte[] {
  const m = muurVanOpening(o, muren);
  if (!m) return [];
  return [m.min, m.plus].filter(Boolean).map((id) => plan.ruimtes.find((r) => r.id === id)!).filter(Boolean);
}

/** Ruimte op een punt (op de gegeven verdieping, of in het hele plan als het al gefilterd is). */
export function ruimteOp(plan: Plattegrond, x: number, y: number, niveau?: number): Ruimte | undefined {
  return plan.ruimtes.find((r) => (niveau === undefined || niveauVan(r) === niveau) && delenVan(r).some((p) => binnen(p, x, y)));
}

/**
 * Hoeveel m² van ruimte `r` boven niets ligt: niet boven een ruimte van de verdieping eronder (16/11, doorloop A4: een
 * verdieping boven een L-vorm of een schuine aanbouw stak uit boven de lege hoek, zonder melding). Een raster van punten
 * om de 20 cm; een punt telt als gedragen als er binnen de dikte van een muur een ruimte onder ligt (een muur tussen twee
 * ruimtes draagt ook). Op het gelijkvloers altijd 0.
 */
export function zonderOndergrond(plan: Plattegrond, r: Ruimte, niveau = niveauVan(r)): number {
  if (niveau <= 0) return 0;
  const onder = niveauPlan(plan, niveau - 1).ruimtes.flatMap(delenVan);
  const m = Math.max(plan.buitenmuur, plan.binnenmuur) + 1, S = 20;
  const opzij: Punt[] = [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m], [m, m], [m, -m], [-m, m], [-m, -m]];
  let los = 0;
  for (const deel of delenVan(r)) {
    for (let x = deel.x + S / 2; x < deel.x + deel.b; x += S) for (let y = deel.y + S / 2; y < deel.y + deel.d; y += S) {
      if (binnen(deel, x, y) && !opzij.some(([dx, dy]) => onder.some((q) => binnen(q, x + dx, y + dy)))) los++;
    }
  }
  return (los * S * S) / 10000;
}

// ---------- controles ----------

export interface PlanMelding {
  ernst: 'fout' | 'waarschuwing';
  melding: string;
  ruimte?: string;
  opening?: string;
  daklicht?: string;
  /** Techniek: het toestel of de leiding waar de melding over gaat. */
  toestel?: string;
  leiding?: string;
  /** Een losse wand (ronde 2d). */
  wand?: string;
}

const BUITEN: OpeningSoort[] = ['raam', 'buitendeur', 'schuifraam', 'garagepoort'];

export function controleerPlan(plan: Plattegrond, cat?: PlanCatalogus): PlanMelding[] {
  const uit: PlanMelding[] = [];
  const niveaus = verdiepingenVan(plan);
  const ingang = new Set<string>();
  const buren = new Map<string, Set<string>>();
  const verbind = (a: string, b: string) => {
    buren.set(a, new Set([...(buren.get(a) ?? []), b]));
    buren.set(b, new Set([...(buren.get(b) ?? []), a]));
  };
  niveaus.forEach((nv, n) => {
    const p = niveauPlan(plan, n);
    const pre = niveaus.length > 1 && n > 0 ? `${nv.naam}: ` : '';
    controleerNiveau(p, pre, uit, ingang, verbind);
    // Een ruimte die (deels) boven niets ligt: een verdieping hangt in de lucht (doorloop A4). Een uitkraging kan, maar
    // dan weet de verkoper het.
    if (n > 0) {
      for (const r of p.ruimtes) {
        const los = zonderOndergrond(plan, r, n);
        if (los >= 0.5) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}${r.naam} ligt voor ${los.toFixed(1).replace('.', ',')} m² boven niets: er staat beneden geen ruimte onder. Pas de ruimte aan, of teken beneden een ruimte.` });
      }
    }
    // Trap: verbindt de ruimte met de trap met de ruimte erboven.
    if (n + 1 < niveaus.length) {
      for (const t of p.meubels.filter((m) => m.type === 'trap')) {
        const v = meubelVoetafdruk(t);
        const onder = ruimteOp(p, v.x + v.b / 2, v.y + v.d / 2);
        const boven = ruimteOp(plan, v.x + v.b / 2, v.y + v.d / 2, n + 1);
        if (onder && boven) verbind(onder.id, boven.id);
        else if (onder) uit.push({ ernst: 'waarschuwing', ruimte: onder.id, melding: `De trap in ${onder.naam} komt boven niet in een ruimte uit.` });
      }
    }
    if (n > 0 && p.ruimtes.length && !plan.meubels.some((m) => m.type === 'trap' && niveauVan(m) === n - 1)) {
      uit.push({ ernst: 'waarschuwing', melding: `${nv.naam}: er is nog geen trap naar deze verdieping (plaats een trap op de verdieping eronder).` });
    }
  });
  if (plan.ruimtes.length && !plan.openingen.some((o) => o.soort === 'buitendeur' && niveauVan(o) === 0)) uit.push({ ernst: 'waarschuwing', melding: 'Er is nog geen voordeur of buitendeur.' });
  const bereikt = new Set(ingang);
  const rij = [...ingang];
  while (rij.length) for (const b of buren.get(rij.shift()!) ?? []) if (!bereikt.has(b)) { bereikt.add(b); rij.push(b); }
  if (ingang.size) {
    for (const r of plan.ruimtes) if (!bereikt.has(r.id)) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${r.naam} is niet bereikbaar: voeg een deur of doorgang toe.` });
  }
  controleerDak(plan, cat, uit);
  if (plan.toestellen?.length || plan.leidingen?.length) controleerTechniek(plan, cat, uit);
  if (plan.losseWanden?.length) uit.push(...controleerLosseWanden(plan));
  return uit;
}

/** Dak en daklichten: de terugval op plat, een bedekking die niet past, en koepels die niet op een plat dak liggen. */
function controleerDak(plan: Plattegrond, cat: PlanCatalogus | undefined, uit: PlanMelding[]) {
  const o = dakOpbouw(plan, cat);
  if (!o) return;
  if (o.terugval) uit.push({ ernst: 'waarschuwing', melding: o.terugval });
  const hellend = o.keuze.vorm !== 'plat';
  const mat = cat?.daken?.[o.keuze.bedekking.materiaal];
  if (cat?.daken && !mat) uit.push({ ernst: 'waarschuwing', melding: 'Dak: de gekozen bedekking staat niet in de catalogus. Kies een andere bedekking.' });
  if (mat && (mat.voor === 'hellend') !== hellend) {
    uit.push({ ernst: 'waarschuwing', melding: `Dak: ${mat.label.toLowerCase()} past niet op een ${hellend ? 'hellend' : 'plat'} dak. Kies een andere bedekking.` });
  } else if (mat?.minHelling && hellend && o.keuze.helling < mat.minHelling) {
    uit.push({ ernst: 'waarschuwing', melding: `Dak: ${o.keuze.helling}° is te vlak voor ${mat.label.toLowerCase()} (minstens ${mat.minHelling}°; richtwaarde, te verifiëren).` });
  }
  // Een grote oversteek op een steil dak zakt tot voor de ramen (de onderkant van het dak gaat door de muurkop).
  const zakt = o.hellend ? Math.round(o.hellend.oversteek * o.hellend.tan) : 0;
  if (zakt > 60) uit.push({ ernst: 'waarschuwing', melding: `Dak: met ${o.hellend!.oversteek} cm oversteek op ${o.hellend!.helling}° hangt de dakvoet ${zakt} cm onder de bovenkant van de muur, tot voor de ramen. Verklein de oversteek of de helling.` });
  const naam = (l: DakLicht) => cat?.daklichten?.[l.type]?.label ?? 'Lichtkoepel';
  for (const { licht, reden, rand } of o.daklichten) {
    if (reden) uit.push({ ernst: 'fout', daklicht: licht.id, melding: `${naam(licht)} ${reden}` });
    else if (rand < 30) uit.push({ ernst: 'waarschuwing', daklicht: licht.id, melding: `${naam(licht)} ligt minder dan 30 cm van een muur: te weinig plaats voor de opstand en de dakrand.` });
  }
  const lijst = plan.daklichten ?? [];
  for (let i = 0; i < lijst.length; i++) {
    for (let j = i + 1; j < lijst.length; j++) {
      const a = lijst[i]!, b = lijst[j]!;
      if (niveauVan(a) !== niveauVan(b)) continue;
      const ox = Math.min(a.x + a.b, b.x + b.b) - Math.max(a.x, b.x), oy = Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y);
      if (ox > -20 && oy > -20) uit.push({ ernst: 'fout', daklicht: b.id, melding: `${naam(b)}: twee daklichten overlappen elkaar of liggen minder dan 20 cm van elkaar.` });
    }
  }
}

/** Meubels waar een sanitaire leiding (water, afvoer) of gas mag beginnen of eindigen. */
const SANITAIRE_MEUBELS: MeubelVorm[] = ['wc', 'lavabo', 'douche', 'bad', 'keuken', 'eiland', 'koelkast'];

/** De vorm van een muur op het plan, als veelhoek met de klok mee. */
function muurVorm(m: Muur, muren: Muur[]): Punt[] {
  const v = muurVlak(m, muren);
  return v.punten ? metDeKlok(v.punten) : rechthoekVorm(v);
}

/** Afstand van een punt tot een veelhoek (0 als het erin ligt). */
function afstandTotVeelhoek(v: Punt[], p: Punt): number {
  if (binnenVeelhoek(v, p[0], p[1], -0.01)) return 0;
  return Math.min(...v.map((q, i) => afstandTotStuk(p, q, v[(i + 1) % v.length]!)));
}

/**
 * De wand waar een toestel met zijn achterkant tegen staat (binnen `speling` cm van een muurvlak), met de plaats langs
 * die muur van zijn voetafdruk (van tot tot).
 */
function wandAchter(t: Toestel, type: ToestelType, muren: Muur[], speling = 3): { muur: Muur; van: number; tot: number } | undefined {
  const m3 = toestelMaten(type, t.aan);
  const [vx, vy] = voorRichting(t.draai);
  const achter: Punt = [t.x - (vx * m3.d) / 2, t.y - (vy * m3.d) / 2];
  for (const m of muren) {
    const [s, w] = opAs(m, achter);
    if (s < m.van - 1 || s > m.tot + 1) continue;
    const afstand = Math.abs(w - m.lijn) - m.dikte / 2;
    if (afstand < -1 || afstand > speling) continue;
    const langs = toestelVoetafdruk(t, type).map((q) => opAs(m, q)[0]);
    return { muur: m, van: Math.min(...langs), tot: Math.max(...langs) };
  }
  return undefined;
}

/**
 * Controles op de techniek, als signaal in gewone taal en nooit als berekening (zie `TECHNIEK_VOORBEHOUD`): een toestel
 * zonder de vrije ruimte die het vraagt (buitenunit, warmtepomp, tellerkast …), een toestel dat in een raam of deur hangt,
 * een toestel dat niet hangt waar het hoort (niet tegen een wand, buiten de woning, een buitenunit binnen), een leiding die
 * nergens begint of eindigt, een leiding langer dan de richtwaarde van haar soort, en (zodra er sanitair in het plan
 * zit) een natte ruimte zonder afvoer. Zonder catalogus techniek wordt niets nagekeken.
 */
function controleerTechniek(plan: Plattegrond, cat: PlanCatalogus | undefined, uit: PlanMelding[]) {
  const tc = cat?.techniek;
  if (!tc) return;
  const niveaus = verdiepingenVan(plan);
  const alle = plan.toestellen ?? [];
  const metSanitair = alle.some((t) => tc.toestellen[t.type]?.vak === 'sanitair') || (plan.leidingen ?? []).some((l) => tc.leidingen[l.soort]?.vak === 'sanitair');
  const vh = (n: number) => vloerHoogte(plan, n);
  niveaus.forEach((nv, n) => {
    const pre = niveaus.length > 1 && n > 0 ? `${nv.naam}: ` : '';
    const p = niveauPlan(plan, n);
    const muren = murenVan(p);
    const wandVormen = muren.map((m) => muurVorm(m, muren));
    const toestellen = p.toestellen ?? [], leidingen = p.leidingen ?? [];
    const naamVan = (t: Toestel, type?: ToestelType) => `${type?.label ?? 'Toestel'}${t.naam ? ` (${t.naam})` : ''}`;
    // Wat in de weg kan staan, met van welke tot welke hoogte: muren, grote toestellen (niet een stopcontact of een
    // lichtpunt) en meubels.
    interface Hinder { vorm: Punt[]; van: number; tot: number; toestel?: Toestel }
    const hinderlijk: Hinder[] = [
      ...wandVormen.map((vorm) => ({ vorm, van: -Infinity, tot: Infinity })),
      ...toestellen.flatMap((x) => {
        const ty = tc.toestellen[x.type];
        if (!ty || x.aan === 'dak' || toestelMaten(ty, x.aan).d < 15) return [];
        return [{ vorm: toestelVoetafdruk(x, ty), van: x.hoogte, tot: x.hoogte + toestelMaten(ty, x.aan).h, toestel: x }];
      }),
      ...p.meubels.filter((mb) => mb.type !== 'tapijt').map((mb) => ({ vorm: rechthoekVorm(meubelVoetafdruk(mb)), van: 0, tot: cat?.meubels[mb.type]?.h ?? 100 })),
    ];

    for (const t of toestellen) {
      const type = tc.toestellen[t.type];
      if (!type) { uit.push({ ernst: 'fout', toestel: t.id, melding: `${pre}Techniek: een toestel van een onbekend type (${t.type}).` }); continue; }
      const naam = naamVan(t, type);
      const binnen = ruimteOp(p, t.x, t.y);
      // Hangt het waar het hoort? Een toestel op de vloer of buiten staat tegen een muur als het er hoogstens zijn vrije
      // ruimte achter plus 25 cm van staat.
      const tegen = t.aan === 'wand' || t.aan === 'buiten' || t.aan === 'vloer' ? wandAchter(t, type, muren, t.aan === 'wand' ? 3 : 25 + (type.vrij?.achter ?? 0)) : undefined;
      if (t.aan === 'wand' && !tegen) uit.push({ ernst: 'waarschuwing', toestel: t.id, melding: `${pre}${naam} hangt niet tegen een wand. Zet het tegen de dichtste wand.` });
      if ((t.aan === 'plafond' || t.aan === 'vloer' || t.aan === 'dak') && !binnen) uit.push({ ernst: 'waarschuwing', toestel: t.id, melding: `${pre}${naam} staat buiten de woning.` });
      if (t.aan === 'buiten' && binnen) uit.push({ ernst: 'waarschuwing', toestel: t.id, ruimte: binnen.id, melding: `${pre}${naam} staat binnen, in ${binnen.naam}; het hoort buiten.` });
      // Vrije ruimte: per kant een strook rond de voetafdruk waar niets in mag staan (muren, grote toestellen, meubels), in
      // de hoogte van de vloer tot boven het toestel (je staat ervoor), of bij een toestel aan het plafond van het toestel
      // tot het plafond.
      if (type.vrij) {
        const eigen = toestelVoetafdruk(t, type);
        const v = type.vrij, hoog = toestelMaten(type, t.aan).h;
        const [z0, z1] = t.aan === 'plafond' ? [t.hoogte, plan.muurhoogte] : [0, Math.max(t.hoogte + hoog, 200)];
        // Een centimeter speling: een toestel dat precies op zijn vrije ruimte staat (afgerond, of tegen een schuine muur) is goed.
        const kanten: [string, number, Punt[]][] = [];
        if (v.voor) kanten.push(['voor', v.voor, toestelVoetafdruk(t, type, { voor: v.voor - 1 })]);
        if (v.achter) kanten.push(['achter', v.achter, toestelVoetafdruk(t, type, { achter: v.achter - 1 })]);
        if (v.opzij) kanten.push(['opzij', v.opzij, toestelVoetafdruk(t, type, { opzij: v.opzij - 1 })]);
        const hinder = hinderlijk.filter((h) => h.toestel !== t && Math.min(z1, h.tot) - Math.max(z0, h.van) > 1).map((h) => h.vorm);
        // Alleen wat in de strook ligt telt, niet wat onder het toestel zelf ligt (de strook min de voetafdruk).
        const te = kanten.filter(([, , zone]) => hinder.some((h) => {
          const inZone = veelhoekOppervlakte(snijVeelhoek(h, zone));
          return inZone > 1 && inZone - veelhoekOppervlakte(snijVeelhoek(snijVeelhoek(h, zone), eigen)) > 1;
        }));
        if (te.length) {
          uit.push({
            ernst: 'waarschuwing', toestel: t.id,
            melding: `${pre}${naam}: te weinig vrije ruimte ${te.map(([k, cm]) => `${k} (vraagt ${cm} cm)`).join(', ')}. Richtwaarde; de handleiding van het toestel beslist.`,
          });
        }
      }
      // Hangt het in een raam of deur? Alleen voor een toestel tegen een muur: overlap langs de muur en in de hoogte.
      if (tegen) {
        const m3 = toestelMaten(type, t.aan);
        for (const o of p.openingen) {
          if (muurVanOpening(o, [tegen.muur]) !== tegen.muur) continue;
          const langs = Math.min(tegen.tot, o.midden + o.breedte / 2) - Math.max(tegen.van, o.midden - o.breedte / 2);
          const hoog = Math.min(t.hoogte + m3.h, o.borstwering + o.hoogte) - Math.max(t.hoogte, o.borstwering);
          if (langs > 1 && hoog > 1) {
            const wat = o.soort === 'raam' || o.soort === 'schuifraam' ? 'een raam' : o.soort === 'garagepoort' ? 'een garagepoort' : o.soort === 'doorgang' ? 'een doorgang' : 'een deur';
            const melding = t.aan === 'wand' ? `hangt in ${wat}. Verschuif het langs de muur of zet het hoger of lager.` : `staat voor ${wat}. Verschuif het langs de muur.`;
            uit.push({ ernst: 'waarschuwing', toestel: t.id, opening: o.id, melding: `${pre}${naam} ${melding}` });
          }
        }
      }
    }

    // Leidingen: begint en eindigt elke leiding ergens?
    const toestelOp = (q: Punt) => toestellen.some((x) => { const ty = tc.toestellen[x.type]; return !!ty && afstandTotVeelhoek(toestelVoetafdruk(x, ty), q) <= 30; });
    for (const l of leidingen) {
      const soort = tc.leidingen[l.soort];
      if (!soort) { uit.push({ ernst: 'fout', leiding: l.id, melding: `${pre}Techniek: een leiding van een onbekende soort (${l.soort}).` }); continue; }
      const naam = `${soort.label}${l.kring ? ` (${l.kring})` : ''}`;
      if (l.punten.length < 2) { uit.push({ ernst: 'fout', leiding: l.id, melding: `${pre}${naam} heeft geen lengte: geef minstens twee punten.` }); continue; }
      // Een ledstrip (ronde 15) begint en eindigt waar je wil: geen los einde.
      for (const [kant, id, q] of soort.ledstrip ? [] : [['begin', l.van, l.punten[0]!], ['einde', l.naar, l.punten[l.punten.length - 1]!]] as const) {
        if (id) {
          if (!alle.some((x) => x.id === id)) uit.push({ ernst: 'fout', leiding: l.id, melding: `${pre}${naam}: het toestel aan het ${kant} bestaat niet meer.` });
          continue;
        }
        const aftakking = leidingen.some((x) => x !== l && tc.leidingen[x.soort]?.vak === soort.vak && x.punten.some((a, i) => i > 0 && afstandTotStuk(q, x.punten[i - 1]!, a) <= 10));
        const meubel = (soort.vak === 'sanitair' || l.soort === 'gas') && p.meubels.some((mb) => {
          const vorm = cat?.meubels[mb.type]?.vorm;
          return !!vorm && SANITAIRE_MEUBELS.includes(vorm) && afstandTotVeelhoek(rechthoekVorm(meubelVoetafdruk(mb)), q) <= 30;
        });
        const buiten = !!soort.naarBuiten && !ruimteOp(p, q[0], q[1]) && !wandVormen.some((w) => binnenVeelhoek(w, q[0], q[1], -0.5));
        if (!toestelOp(q) && !aftakking && !meubel && !buiten) {
          uit.push({ ernst: 'waarschuwing', leiding: l.id, melding: `${pre}${naam}: het ${kant} is nergens aangesloten (geen toestel, meubel of andere leiding binnen 30 cm${soort.naarBuiten ? ', en niet buiten de woning' : ''}).` });
        }
      }
      if (soort.maxLengte) {
        const lengte = leidingVerloop(l, plan, tc, { vloerHoogte: vh }).lengte;
        if (lengte > soort.maxLengte.waarde) {
          const waarom = soort.maxLengte.uitleg ? ` (${soort.maxLengte.uitleg})` : '';
          uit.push({ ernst: 'waarschuwing', leiding: l.id, melding: `${pre}${naam} is ${String(lengte).replace('.', ',')} m lang, meer dan ${soort.maxLengte.waarde} m${waarom}. Richtwaarde; de installateur beslist.` });
        }
      }
    }

    // Natte ruimte zonder afvoer: alleen zodra er sanitair in het plan zit (anders meldt elk plan zonder techniek dit).
    if (metSanitair) {
      const afvoeren = leidingen.filter((l) => tc.leidingen[l.soort]?.afvoer);
      const raakt = (r: Ruimte, l: Leiding) => l.punten.some((q, i) => {
        if (ruimteOp(p, q[0], q[1])?.id === r.id) return true;
        const a = l.punten[i - 1];
        if (!a) return false;
        const stappen = Math.ceil(Math.hypot(q[0] - a[0], q[1] - a[1]) / 10);
        for (let k = 1; k < stappen; k++) if (ruimteOp(p, a[0] + ((q[0] - a[0]) * k) / stappen, a[1] + ((q[1] - a[1]) * k) / stappen)?.id === r.id) return true;
        return false;
      });
      for (const r of p.ruimtes.filter((x) => RUIMTE_TYPES[x.type].nat && x.bestaand !== true)) {
        if (!afvoeren.some((l) => raakt(r, l))) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}${r.naam}: natte ruimte zonder afvoer (er loopt nog geen afvoerleiding).` });
      }
    }
  });
}

function controleerNiveau(plan: Plattegrond, pre: string, uit: PlanMelding[], ingang: Set<string>, verbind: (a: string, b: string) => void) {
  const muren = murenVan(plan);
  // Bestaande ruimtes (ronde 11): de controles op het daglicht en de verluchting gaan over nieuw werk.
  const oud = heeftBestaand(plan);
  const naam = (id?: string) => plan.ruimtes.find((r) => r.id === id)?.naam ?? '?';

  // Overlappende ruimtes.
  for (let i = 0; i < plan.ruimtes.length; i++) {
    for (let j = i + 1; j < plan.ruimtes.length; j++) {
      const a = plan.ruimtes[i]!, b = plan.ruimtes[j]!;
      const overlap = delenVan(a).some((p) => delenVan(b).some((q) => {
        const ox = Math.min(p.x + p.b, q.x + q.b) - Math.max(p.x, q.x), oy = Math.min(p.y + p.d, q.y + q.d) - Math.max(p.y, q.y);
        // Een vrije vorm: de veelhoeken zelf (een rand van 1 cm breed telt niet, zoals bij twee rechthoeken).
        if (ox > 1 && oy > 1 && (p.omtrek || q.omtrek)) return veelhoekOppervlakte(snijVeelhoek(vormVanDeel(p), vormVanDeel(q))) > Math.max(ox, oy);
        return ox > 1 && oy > 1;
      }));
      if (overlap) uit.push({ ernst: 'fout', ruimte: a.id, melding: `${pre}${a.naam} en ${b.naam} overlappen elkaar.` });
    }
  }

  // Openingen: op een muur, juiste soort muur, niet over elkaar.
  for (const o of plan.openingen) {
    const m = muurVanOpening(o, muren);
    const wat = o.soort === 'binnendeur' ? 'Binnendeur' : o.soort === 'doorgang' ? 'Doorgang' : o.soort === 'raam' ? 'Raam' : o.soort === 'schuifraam' ? 'Schuifraam' : o.soort === 'garagepoort' ? 'Garagepoort' : 'Buitendeur';
    if (!m) {
      uit.push({ ernst: 'fout', opening: o.id, melding: `${pre}${wat} staat niet (volledig) op een muur. Verschuif of verklein de opening.` });
      continue;
    }
    if (BUITEN.includes(o.soort) && m.soort === 'binnen') uit.push({ ernst: 'fout', opening: o.id, melding: `${pre}${wat} tussen ${naam(m.min)} en ${naam(m.plus)} staat in een binnenmuur.` });
    if (!BUITEN.includes(o.soort) && m.soort === 'buiten') uit.push({ ernst: 'waarschuwing', opening: o.id, melding: `${pre}${wat} in een buitenmuur (${naam(m.min ?? m.plus)}): gebruik een buitendeur.` });
    const vrij = Math.min(o.midden - o.breedte / 2 - m.van, m.tot - o.midden - o.breedte / 2);
    // Een raam dat al in een bestaande muur zit (ronde 11), plaatst niemand opnieuw.
    if (vrij < 10 && !(oud && muurStatus(plan, m) === 'bestaand')) uit.push({ ernst: 'waarschuwing', opening: o.id, melding: `${pre}${wat} staat tegen een hoek (minder dan 10 cm muur): moeilijk te plaatsen en af te werken.` });
    if (o.borstwering + o.hoogte > plan.muurhoogte - 15) uit.push({ ernst: 'fout', opening: o.id, melding: `${pre}${wat} is te hoog voor de muur (latei nodig boven de opening).` });
    if ((o.soort === 'buitendeur' || o.soort === 'schuifraam' || o.soort === 'garagepoort') && m.soort === 'buiten') ingang.add((m.min ?? m.plus)!);
    if ((o.soort === 'binnendeur' || o.soort === 'doorgang') && m.plus && m.min) verbind(m.plus, m.min);
  }
  for (let i = 0; i < plan.openingen.length; i++) {
    for (let j = i + 1; j < plan.openingen.length; j++) {
      const a = plan.openingen[i]!, b = plan.openingen[j]!;
      if (a.as !== b.as || !gelijk(a.lijn, b.lijn)) continue;
      if (a.as === 's' && a.richting && b.richting && Math.abs(a.richting[0] * b.richting[1] - a.richting[1] * b.richting[0]) > 1e-3) continue;
      if (Math.abs(a.midden - b.midden) < (a.breedte + b.breedte) / 2 + 5) uit.push({ ernst: 'fout', opening: b.id, melding: `${pre}Twee openingen overlappen elkaar of staan te dicht bij elkaar.` });
    }
  }

  // Vrije vormen: de vorm zelf, en meubels die (deels) buiten de muren staan.
  for (const r of plan.ruimtes.filter(heeftVrijeVorm)) {
    for (const q of delenVan(r).filter((x) => x.omtrek)) {
      for (const f of vormFouten(vormVanDeel(q))) uit.push({ ernst: f.includes('inspringende') ? 'waarschuwing' : 'fout', ruimte: r.id, melding: `${pre}${r.naam}: ${f.charAt(0).toLowerCase()}${f.slice(1)}` });
    }
  }
  for (const mb of plan.meubels) {
    if (mb.type === 'tapijt') continue;
    const v = meubelVoetafdruk(mb);
    const r = ruimteOp(plan, v.x + v.b / 2, v.y + v.d / 2);
    if (!r || !heeftVrijeVorm(r)) continue;
    const vormen = vormenVan(r).map((x) => binnenVorm(x, muren));
    const buiten = rechthoekVorm(v).some(([x, y]) => !vormen.some((w) => binnenVeelhoek(w, x, y, -1)));
    if (buiten) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}Een meubel in ${r.naam} staat (deels) in of buiten een muur. Verschuif het.` });
  }

  // Daglicht en ventilatie.
  for (const r of plan.ruimtes) {
    if (oud && r.bestaand) continue;
    const t = RUIMTE_TYPES[r.type];
    const maten = ruimteMaten(plan, r, muren);
    if (t.daglicht) {
      // Een lichtkoepel of lichtstraat telt mee voor het daglicht (niet voor de verluchting hieronder).
      const licht = maten.glas + maten.daklicht;
      if (licht === 0) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}${r.naam} heeft geen raam (daglicht).` });
      else if (licht < maten.netto / 10) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}${r.naam}: weinig daglicht (glas ${maten.daklicht ? 'en daklicht ' : ''}${licht.toFixed(1)} m² is minder dan 1/10 van de vloer; richtwaarde, te verifiëren).` });
    }
    if ((r.type === 'badkamer' || r.type === 'wc') && maten.glas === 0) uit.push({ ernst: 'waarschuwing', ruimte: r.id, melding: `${pre}${r.naam} zonder raam: mechanische afzuiging voorzien.` });
  }
}

// ---------- dak ----------

/** Dak zonder verdere keuze: plat met EPDM (zoals het platte dak er altijd uitzag). */
export const standaardDak = (): DakKeuze => ({ vorm: 'plat', helling: 35, richting: 'onder', oversteek: 40, bedekking: { materiaal: 'epdm', kleur: 'zwart' } });

/** De dakkeuze van het plan. Een plan met daklichten maar zonder keuze heeft een plat dak. */
export function dakVan(plan: Plattegrond): DakKeuze | undefined {
  return plan.dak ?? (plan.daklichten?.length ? standaardDak() : undefined);
}

/**
 * Het plan zoals het getoond wordt: zonder dakkeuze met het standaard platte dak (16/11, doorloop A3). De afgewerkte 3D
 * liet de bovenste verdieping dan open, terwijl de constructie, de doorsnede en het bestand voor de klant al een plat dak
 * toonden: de verkoper toonde een open doos en de klant kreeg een gebouw met dak. Alle weergaven gebruiken nu dit. De
 * rekenmotor (offerte, controles) blijft bij `dakVan`: daar telt het dak pas mee met een keuze.
 */
export function planMetDak(plan: Plattegrond): Plattegrond {
  return dakVan(plan) || !plan.ruimtes.length ? plan : { ...plan, dak: standaardDak() };
}

/** Soort en kleur van een dakbedekking voor de 3D en de tekening (onbekend = effen donker, zoals EPDM). */
export function dakAfwerking(cat: PlanCatalogus | undefined, keuze: DakBedekking | undefined): { soort: BlokSoort; kleur: string } {
  const mat = keuze ? cat?.daken?.[keuze.materiaal] : undefined;
  if (!keuze || !mat) return { soort: 'dak', kleur: '#2e2e2e' };
  const kleur = mat.kleuren[keuze.kleur] ?? Object.values(mat.kleuren)[0];
  return { soort: mat.soort, kleur: kleur?.hex ?? '#2e2e2e' };
}

/** Delen van een verdieping waar geen ruimte van de verdieping erboven op ligt: daar ligt een plat dak. */
function vrijeDakstukken(plan: Plattegrond, n: number): { ruimte: Ruimte; stuk: Deel }[] {
  const boven = niveauPlan(plan, n + 1).ruimtes.flatMap(delenVan);
  const uit: { ruimte: Ruimte; stuk: Deel }[] = [];
  const vrijBoven = boven.some((q) => q.omtrek);
  for (const r of niveauPlan(plan, n).ruimtes) for (const deel of delenVan(r)) {
    if (deel.omtrek || vrijBoven) {
      // Een vrije vorm (hier of erboven): de veelhoeken van de verdieping erboven eruit knippen.
      const vrij = boven.reduce<Punt[][]>((stukken, q) => stukken.flatMap((v) => trekVeelhoekAf(v, vormVanDeel(q))), [vormVanDeel(deel)]);
      for (const v of vrij) uit.push({ ruimte: r, stuk: alsDeel(v) });
      continue;
    }
    const vrij = boven.reduce<Rechthoek[]>((stukken, q) => stukken.flatMap((s) => trekAf(s, q)), [deel]);
    for (const s of vrij) uit.push({ ruimte: r, stuk: s });
  }
  return uit;
}

/** Een veelhoek als deel: een rechthoek als ze er een is (vier hoeken langs x en y), anders met haar omtrek. */
function alsDeel(v: Punt[]): Deel {
  const k = kaderVanPunten(v);
  const recht = v.length === 4 && Math.abs(veelhoekOppervlakte(v) - k.b * k.d) < 0.5;
  return recht ? { x: fijn(k.x), y: fijn(k.y), b: fijn(k.b), d: fijn(k.d) } : { ...k, omtrek: v.map(fijnPunt) };
}

/** Oppervlakte van een deel (cm²). */
const deelOppervlakte = (q: Deel) => (q.omtrek ? veelhoekOppervlakte(vormVanDeel(q)) : q.b * q.d);
/** De vier hoeken van een rechthoek, met de klok mee. */
const rechthoekVorm = (q: Rechthoek): Punt[] => [[q.x, q.y], [q.x + q.b, q.y], [q.x + q.b, q.y + q.d], [q.x, q.y + q.d]];

/** Voegt rechthoeken die aan elkaar sluiten samen tot zo weinig mogelijk stroken (liggend, van boven naar onder). */
export function voegSamen(stukken: Rechthoek[]): Rechthoek[] {
  const ys = [...new Set(stukken.flatMap((s) => [s.y, s.y + s.d]))].sort((a, b) => a - b);
  const uit: Rechthoek[] = [];
  for (let i = 0; i + 1 < ys.length; i++) {
    const y0 = ys[i]!, y1 = ys[i + 1]!;
    if (y1 - y0 < 0.01) continue;
    // De stukken die deze strook bedekken, als aaneengesloten intervallen in x.
    const stroken: [number, number][] = [];
    for (const s of stukken.filter((q) => q.y <= y0 + 0.01 && q.y + q.d >= y1 - 0.01).sort((a, b) => a.x - b.x)) {
      const laatste = stroken[stroken.length - 1];
      if (laatste && s.x <= laatste[1] + 0.01) laatste[1] = Math.max(laatste[1], s.x + s.b); else stroken.push([s.x, s.x + s.b]);
    }
    for (const [a, b] of stroken) {
      // Zelfde breedte als de strook erboven: die loopt gewoon door.
      const boven = uit.find((r) => Math.abs(r.x - a) < 0.01 && Math.abs(r.x + r.b - b) < 0.01 && Math.abs(r.y + r.d - y0) < 0.01);
      if (boven) boven.d = y1 - boven.y; else uit.push({ x: a, y: y0, b: b - a, d: y1 - y0 });
    }
  }
  return uit;
}

/** Een stuk buitenmuur zonder muur van de verdieping erboven: daar komt de dakrand (opstand met muurkap). */
export interface DakrandStuk { muur: Muur; vlak: MuurVlak; van: number; tot: number }

function dakrandStukken(plan: Plattegrond, n: number): DakrandStuk[] {
  const hier = murenVan(niveauPlan(plan, n)), boven = murenVan(niveauPlan(plan, n + 1));
  const uit: DakrandStuk[] = [];
  const zonder = (vrij: [number, number][], b0: number, b1: number) =>
    vrij.flatMap(([x, y]): [number, number][] => (b1 <= x || b0 >= y ? [[x, y]] : ([[x, Math.max(x, b0)], [Math.min(y, b1), y]] as [number, number][]).filter(([u, v]) => v - u > 0.5)));
  for (const m of hier.filter((x) => x.soort === 'buiten')) {
    const vlak = muurVlak(m, hier);
    if (m.as === 's' || boven.some((b) => b.as === 's')) {
      // Met een schuine muur (hier of erboven): langs de as van deze muur, met de grondvlakken als veelhoek.
      const vorm = vlak.punten ?? rechthoekVorm(vlak);
      const langs = vorm.map((q) => opAs(m, q)[0]);
      let vrij: [number, number][] = [[Math.min(...langs), Math.max(...langs)]];
      for (const b of boven) {
        const vb = muurVlak(b, boven);
        // Wat de muur erboven van deze muur bedekt: de doorsnede van de twee grondvlakken (een van beide moet bol zijn; anders
        // de strook rond de as van de schuine muur erboven).
        const bv = metDeKlok(vb.punten ?? rechthoekVorm(vb)), hier = metDeKlok(vorm);
        if (m.as === 's' && b.as === 's' && gelijk(b.lijn, m.lijn) && Math.abs(b.richting![0] * m.richting![1] - b.richting![1] * m.richting![0]) < 1e-3) {
          // Dezelfde schuine muur erboven: wat haar grondvlak langs de as beslaat.
          const sb = bv.map((q) => opAs(m, q)[0]);
          vrij = zonder(vrij, Math.min(...sb), Math.max(...sb));
          continue;
        }
        const samen = isBol(bv) ? snijVeelhoek(hier, bv) : isBol(hier) ? snijVeelhoek(bv, hier)
          : snijVeelhoek(hier, metDeKlok([langsAs(b, b.van, b.lijn - b.dikte / 2), langsAs(b, b.tot, b.lijn - b.dikte / 2), langsAs(b, b.tot, b.lijn + b.dikte / 2), langsAs(b, b.van, b.lijn + b.dikte / 2)]));
        if (samen.length < 3 || veelhoekOppervlakte(samen) < 1) continue;
        const s = samen.map((q) => opAs(m, q)[0]);
        vrij = zonder(vrij, Math.min(...s), Math.max(...s));
      }
      for (const [x, y] of vrij) uit.push({ muur: m, vlak, van: x, tot: y });
      continue;
    }
    const a0 = m.as === 'h' ? vlak.x : vlak.y, a1 = a0 + (m.as === 'h' ? vlak.b : vlak.d);
    let vrij: [number, number][] = [[a0, a1]];
    // Alle muren van de verdieping erboven die op deze muur staan (ook loodrechte, op een hoek).
    for (const b of boven) {
      const vb = muurVlak(b, boven);
      const ox = Math.min(vlak.x + vlak.b, vb.x + vb.b) - Math.max(vlak.x, vb.x), oz = Math.min(vlak.y + vlak.d, vb.y + vb.d) - Math.max(vlak.y, vb.y);
      if (ox <= 0.5 || oz <= 0.5) continue;
      const b0 = m.as === 'h' ? Math.max(vlak.x, vb.x) : Math.max(vlak.y, vb.y), b1 = b0 + (m.as === 'h' ? ox : oz);
      vrij = zonder(vrij, b0, b1);
    }
    for (const [x, y] of vrij) uit.push({ muur: m, vlak, van: x, tot: y });
  }
  return uit;
}

/** Alles wat uit de dakkeuze volgt; de 3D, de gevelaanzichten, de oppervlaktes, de offerte en de controles lezen dit. */
export interface DakOpbouw {
  keuze: DakKeuze;
  /** Hoogste verdieping met ruimtes: daar ligt het hoofddak. */
  top: number;
  /** Het hellende dak op de bovenste verdieping; ontbreekt bij een plat dak of als het hellende dak niet kan. */
  hellend?: HellendDak;
  /** Waarom het gevraagde hellende dak niet kan: de 3D, de gevels en de offerte rekenen dan met een plat dak. */
  terugval?: string;
  /** Bedekking van de platte stukken. */
  platBedekking: DakBedekking;
  /**
   * Platte dakstukken (op de as van de muren) per verdieping en ruimte; de openingen van de daklichten zitten er nog in.
   * Een stuk van een vrije vorm heeft zijn `omtrek` (x, y, b, d is dan het kader).
   */
  plat: (Deel & { niveau: number; ruimte: string })[];
  /** Dakrand: de stukken buitenmuur onder een plat dak, per verdieping. */
  dakranden: (DakrandStuk & { niveau: number })[];
  /**
   * Alle daklichten. Met een `reden` ligt het daklicht niet op een plat dak: het wordt niet getekend of geteld.
   * `rand` = kleinste afstand tot de as van een muur van de ruimte (cm).
   */
  daklichten: { licht: DakLicht; reden?: string; rand: number }[];
  /** Hoeveelheden: bedekking hellend en plat (m²; plat zonder de openingen van de daklichten) en dakrand (m). */
  m2Hellend: number;
  m2Plat: number;
  mDakrand: number;
}

/**
 * De opbouw van het dak. Grens van deze ronde: een hellend dak (lessenaar of zadel) komt op de **bovenste verdieping**,
 * en alleen als die één rechthoek is. Lagere delen zonder verdieping erboven blijven plat (daar kunnen koepels).
 * Is de bovenste verdieping geen rechthoek (L- of U-vorm), dan valt alles terug op plat, met een melding.
 */
export function dakOpbouw(plan: Plattegrond, cat?: Pick<PlanCatalogus, 'daklichten'>): DakOpbouw | undefined {
  const keuze = dakVan(plan);
  if (!keuze || !plan.ruimtes.length) return undefined;
  const top = Math.max(...plan.ruimtes.map(niveauVan));
  let hellend: HellendDak | undefined, terugval: string | undefined;
  if (keuze.vorm !== 'plat') {
    const delen = niveauPlan(plan, top).ruimtes.flatMap(delenVan);
    const x0 = Math.min(...delen.map((q) => q.x)), y0 = Math.min(...delen.map((q) => q.y));
    const x1 = Math.max(...delen.map((q) => q.x + q.b)), y1 = Math.max(...delen.map((q) => q.y + q.d));
    // Eén rechthoek: de delen van alle ruimtes vullen samen hun omsluitende kader (een vrije vorm telt met haar omtrek).
    const kader = { x: x0, y: y0, b: x1 - x0, d: y1 - y0 };
    const open = delen.some((q) => q.omtrek)
      ? delen.reduce<Punt[][]>((st, q) => st.flatMap((v) => trekVeelhoekAf(v, vormVanDeel(q))), [rechthoekVorm(kader)]).filter((v) => veelhoekOppervlakte(v) > 100)
      : delen.reduce<Rechthoek[]>((st, q) => st.flatMap((s) => trekAf(s, q)), [kader]).filter((s) => s.b > 1 && s.d > 1);
    if (open.length) {
      terugval = `Het ${keuze.vorm === 'zadel' ? 'zadeldak' : 'lessenaarsdak'} kan nog niet op deze vorm: ${top > 0 ? `de bovenste verdieping (${verdiepingenVan(plan)[top]?.naam})` : 'de woning'} is geen rechthoek. De 3D, de gevels en de offerte tonen een plat dak.`;
    } else {
      const t = plan.buitenmuur / 2;
      hellend = hellendDak({ x: x0 - t, y: y0 - t, b: x1 - x0 + 2 * t, d: y1 - y0 + 2 * t }, keuze);
    }
  }
  const plat: DakOpbouw['plat'] = [], dakranden: DakOpbouw['dakranden'] = [];
  for (let n = 0; n <= top; n++) {
    if (n === top && hellend) continue;
    for (const { ruimte, stuk } of vrijeDakstukken(plan, n)) plat.push({ ...stuk, niveau: n, ruimte: ruimte.id });
    for (const s of dakrandStukken(plan, n)) dakranden.push({ ...s, niveau: n });
  }
  // Het juiste woord in de uitleg: met de catalogus is een plat dakraam geen koepel (zonder catalogus zoals vroeger).
  const vorm = (l: DakLicht) => cat?.daklichten?.[l.type]?.vorm ?? 'koepel';
  const WOORD: Record<string, { een: string; naam: string; hem: string }> = {
    koepel: { een: 'een koepel', naam: 'lichtkoepel', hem: 'hem' },
    lichtstraat: { een: 'een lichtstraat', naam: 'lichtstraat', hem: 'ze' },
    dakraam: { een: 'een dakraam', naam: 'plat dakraam', hem: 'het' },
  };
  const woord = (l: DakLicht) => WOORD[vorm(l)] ?? WOORD.koepel!;
  const overlapt = (a: Rechthoek, b: Rechthoek) => Math.min(a.x + a.b, b.x + b.b) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y) > 0.5;
  const daklichten = (plan.daklichten ?? []).map((licht) => {
    const n = niveauVan(licht);
    const vak: Rechthoek = { x: licht.x, y: licht.y, b: licht.b, d: licht.d };
    const r = ruimteOp(plan, licht.x + licht.b / 2, licht.y + licht.d / 2, n);
    let reden: string | undefined, rand = Infinity;
    if (!r) reden = 'ligt niet boven een ruimte.';
    else if (hellend && n === top) reden = `ligt onder het hellende dak: daar kan geen ${woord(licht).naam} (dakramen zijn voor later). Verwijder ${woord(licht).hem} of kies een plat dak.`;
    else {
      // Volledig op de platte dakstukken van één ruimte?
      const stukken = plat.filter((s) => s.niveau === n && s.ruimte === r.id);
      const rest = stukken.some((q) => q.omtrek)
        ? stukken.reduce<Punt[][]>((st, q) => st.flatMap((v) => trekVeelhoekAf(v, vormVanDeel(q))), [rechthoekVorm(vak)]).filter((v) => veelhoekOppervlakte(v) > 0.5)
        : stukken.reduce<Rechthoek[]>((st, q) => st.flatMap((s) => trekAf(s, q)), [vak]).filter((s) => s.b > 0.5 && s.d > 0.5);
      if (rest.length) {
        reden = niveauPlan(plan, n + 1).ruimtes.flatMap(delenVan).some((q) => overlapt(q, vak))
          ? `ligt onder een verdieping; ${woord(licht).een} kan alleen in een dak.`
          : 'ligt over een muur of buiten de ruimte. Verschuif hem tot hij volledig boven één ruimte ligt.';
      } else {
        for (const m of murenVan(niveauPlan(plan, n))) {
          if (m.plus !== r.id && m.min !== r.id) continue;
          if (m.as === 's') {
            // Schuine muur: de kleinste afstand van een hoek van het daklicht tot haar as, als die hoek naast de muur ligt.
            for (const q of rechthoekVorm(vak)) {
              const [t, w] = opAs(m, q);
              if (t > m.van - 0.5 && t < m.tot + 0.5) rand = Math.min(rand, Math.abs(w - m.lijn));
            }
            continue;
          }
          const [a, b, v0, v1] = m.as === 'h' ? [vak.x, vak.x + vak.b, vak.y, vak.y + vak.d] : [vak.y, vak.y + vak.d, vak.x, vak.x + vak.b];
          if (Math.min(b, m.tot) - Math.max(a, m.van) > 0.5) rand = Math.min(rand, Math.abs(v0 - m.lijn), Math.abs(v1 - m.lijn));
        }
      }
    }
    return { licht, reden, rand };
  });
  const m2 = (x: Deel) => deelOppervlakte(x) / 10000;
  return {
    keuze, top, hellend, terugval,
    platBedekking: keuze.vorm === 'plat' ? keuze.bedekking : keuze.plat ?? standaardDak().bedekking,
    plat, dakranden, daklichten,
    m2Hellend: hellend?.oppervlakte ?? 0,
    m2Plat: Math.max(0, plat.reduce((t, s) => t + m2(s), 0) - daklichten.filter((l) => !l.reden).reduce((t, l) => t + m2(l.licht), 0)),
    mDakrand: dakranden.reduce((t, s) => t + (s.tot - s.van), 0) / 100,
  };
}

/**
 * Bestaand (ronde 11): de m² plat dak boven nieuwe ruimtes, zonder de openingen van de daklichten erin (zoals `m2Plat`,
 * maar zonder het dak van een bestaande ruimte). Een daklicht in een bestaand dak is wel nieuw werk, maar zijn opening
 * zit dan niet in deze oppervlakte.
 */
export function nieuwPlatDak(plan: Plattegrond, dak: DakOpbouw): number {
  const nieuw = (id: string) => !isBestaand(plan, id);
  const stukken = dak.plat.filter((s) => nieuw(s.ruimte));
  const lichten = dak.daklichten.filter((l) => !l.reden && stukken.some((s) => s.niveau === niveauVan(l.licht) && binnen(s, l.licht.x + l.licht.b / 2, l.licht.y + l.licht.d / 2)));
  return Math.max(0, stukken.reduce((t, s) => t + deelOppervlakte(s), 0) / 10000 - lichten.reduce((t, l) => t + (l.licht.b * l.licht.d) / 10000, 0));
}

/** Hellend dak in 3D: de dakvlakken, en de buitenmuren van de bovenste verdieping doorgetrokken tot onder het dak. */
function hellendDak3D(plan: Plattegrond, cat: PlanCatalogus, p: Plattegrond, d: HellendDak, yb: number, bedekking: { soort: BlokSoort; kleur: string }): Blok[] {
  const uit = dakBlokken(d, yb, bedekking);
  const muren = murenVan(p);
  const pleister: GevelAfwerking = { soort: 'gevel', kleur: '#efeee9' };
  const wandVan = (id?: string): GevelAfwerking => {
    const r = p.ruimtes.find((x) => x.id === id);
    if (r?.bestaand === true) return { soort: 'gevel', kleur: NEUTRAAL.binnen };
    const w = cat.wanden[r?.wand ?? ''];
    return w ? { soort: w.soort, kleur: w.kleur } : pleister;
  };
  // Langs de muur (a) en dwars door haar dikte (t), per rechte buitenmuur.
  const maten = new Map(muren.filter((m) => m.soort === 'buiten' && m.as !== 's').map((m) => {
    const v = muurVlak(m, muren);
    const r: [number, number, number, number] = m.as === 'h' ? [v.x, v.x + v.b, v.y, v.y + v.d] : [v.y, v.y + v.d, v.x, v.x + v.b];
    return [m, r] as const;
  }));
  /**
   * Waar een binnenmuur tegen de gevel komt, is de buitenmuur in twee stukken gedeeld; tot de muurhoogte vult de kop van
   * de binnenmuur de spleet. De topgevel erboven sloot er niet: een spleet ter dikte van de binnenmuur, als witte of grijze
   * lijn in de gevel (17/11). Daarom loopt elk stuk tot halfweg die spleet, zonder te overlappen (anders flikkert het vlak).
   */
  const spleet = (m: Muur, a: number, kant: -1 | 1): number => {
    const [, , t0, t1] = maten.get(m)!;
    let beste = a;
    for (const [n, [b0, b1, u0, u1]] of maten) {
      if (n === m || n.as !== m.as || !gelijk(u0, t0) || !gelijk(u1, t1)) continue;
      const rand = kant < 0 ? b1 : b0, gat = kant < 0 ? a - rand : rand - a;
      if (gat > 0.05 && gat <= Math.max(plan.binnenmuur, 1) + 1) beste = (a + rand) / 2;
    }
    return beste;
  };
  for (const m of muren) {
    if (m.soort !== 'buiten') continue;
    const vlak = muurVlak(m, muren);
    // Bestaand of tegen de buren (ronde 11): neutraal; anders het gekozen gevelmateriaal (zoals vroeger).
    const buiten = buitenAfwerking(plan, cat, m), binnen = wandVan(m.plus ?? m.min);
    // Langs de muur (a) en dwars door haar dikte (t).
    const [a0, a1, t0, t1] = m.as === 'h' ? [vlak.x, vlak.x + vlak.b, vlak.y, vlak.y + vlak.d] : [vlak.y, vlak.y + vlak.d, vlak.x, vlak.x + vlak.b];
    const buitenMin = !m.min;
    const [aMin, aPlus] = buitenMin ? [buiten, binnen] : [binnen, buiten];
    const zijden: Blok['zijden'] = m.as === 'h' ? { 'z-': aMin, 'z+': aPlus } : { 'x-': aMin, 'x+': aPlus };
    if ((m.as === 'h') !== (d.nokAs === 'x')) {
      // Topgevel: de muur staat dwars op de nok, haar bovenrand volgt het dak.
      // Elk stuk grijpt 1 cm over de muurkop (anders schemert haar witte bovenkant door de naad).
      const punten = m.as === 's' ? gevelOnderDak(d, a0, a1) : gevelOnderDak(d, spleet(m, a0, -1), spleet(m, a1, 1));
      if (punten.length) uit.push(prisma(`topgevel_${m.id}`, buiten.soort, buiten.kleur, m.as === 'h' ? 'z' : 'x', t0, t1, punten.map(([a, h]): [number, number] => [a, yb + (h === 0 ? -1 : h)]), { zijden, voeg: buiten.voeg }));
      continue;
    }
    // Muur evenwijdig met de nok: een recht stuk tot de laagste kant van het dak (de hoge gevel van een lessenaar),
    // en daarop een wig die de schuine onderkant van het dak volgt, dwars door de dikte van de muur.
    const hA = Math.max(0, dakHoogte(d, t0)), hB = Math.max(0, dakHoogte(d, t1));
    const laag = Math.min(hA, hB), hoog = Math.max(hA, hB);
    if (laag > 0.1) {
      const basis = { code: `dakmuur_${m.id}`, soort: buiten.soort, vorm: 'blok' as const, kleur: buiten.kleur, voeg: buiten.voeg, zijden, y: yb - 1, h: r2(laag + 1) };
      uit.push(m.as === 'h' ? { ...basis, x: a0, z: t0, b: a1 - a0, d: t1 - t0 } : { ...basis, x: t0, z: a0, b: t1 - t0, d: a1 - a0 });
    }
    if (hoog - laag > 0.1) {
      // Ligt de hoge kant van de wig buiten, dan zie je ze in de gevel; anders alleen van binnen.
      const zichtbaar = (hA > hB) === buitenMin;
      const afw = zichtbaar ? buiten : pleister;
      const koppen: Blok['zijden'] = m.as === 'h' ? { 'x-': buiten, 'x+': buiten } : { 'z-': buiten, 'z+': buiten };
      uit.push(prisma(`dakwig_${m.id}`, afw.soort, afw.kleur, m.as === 'h' ? 'x' : 'z', a0, a1, [[t0, yb + laag], [t1, yb + laag], [hA > hB ? t0 : t1, yb + hoog]], { zijden: koppen, voeg: afw.voeg }));
    }
  }
  return uit;
}

// ---------- 3D ----------

/**
 * Een prisma dat verticaal doorgetrokken is (`as: 'y'`): het grondvlak `punten` [x, z] in planmaat (plan-y is de z-as),
 * van y tot y + h. Voor een schuine muur, en voor de vloer en het dak van een vrije vorm.
 */
export function grondPrisma(code: string, soort: BlokSoort, kleur: string, punten: Punt[], y: number, h: number, extra: Partial<Blok> = {}): Blok {
  const k = kaderVanPunten(punten);
  return {
    code, soort, vorm: 'prisma', as: 'y', kleur,
    x: r2(k.x), y: r2(y), z: r2(k.y), b: r2(k.b), h: r2(h), d: r2(k.d),
    doorsnede: punten.map(([x, z]) => [fijn(x), fijn(z)]),
    ...extra,
  };
}

/**
 * Draait blokken rond de verticale as over `graden` (van x naar z, zoals `Blok.draai`), rond het punt `rond` [x, z]: het
 * midden van elk blok draait mee en het blok krijgt die draaiing erbij. Voor een raam, deur of meubel in een schuine
 * muur. Een prisma met as 'y' draait zijn grondvlak mee. Vormen die in wereldmaat staan en niet om hun midden kunnen
 * draaien (een liggend prisma, een omtrek, een kuipwand, een schuine poot) gebruikt de woning hier niet; ze blijven staan.
 */
export function draaiBlokken(blokken: Blok[], graden: number, rond: Punt = [0, 0]): Blok[] {
  if (!graden) return blokken;
  const a = graden / GRAAD, c = Math.cos(a), s = Math.sin(a);
  const draai = ([x, z]: Punt): Punt => [rond[0] + (x - rond[0]) * c - (z - rond[1]) * s, rond[1] + (x - rond[0]) * s + (z - rond[1]) * c];
  return blokken.map((b) => {
    if (b.vorm === 'prisma' && b.as === 'y' && b.doorsnede) {
      const p = b.doorsnede.map((q) => draai(q));
      const k = kaderVanPunten(p);
      return { ...b, x: r2(k.x), z: r2(k.y), b: r2(k.b), d: r2(k.d), doorsnede: p.map(([x, z]) => [fijn(x), fijn(z)]) };
    }
    if (b.vorm === 'prisma' || b.omtrek || b.pad || b.schuin) return b;
    const [cx, cz] = draai([b.x + b.b / 2, b.z + b.d / 2]);
    const totaal = (((b.draai ?? 0) + graden) % 360 + 360) % 360;
    return { ...b, x: fijn(cx - b.b / 2), z: fijn(cz - b.d / 2), draai: fijn(totaal) };
  });
}

/** Knipt een grondvlak met zijden af op het halfvlak a·x + b·y ≤ c; de nieuwe zijde langs de snede krijgt `nieuw`. */
function knipMetRanden<T>(punten: Punt[], randen: T[], a: number, b: number, c: number, nieuw: T): [Punt[], T[]] {
  const p: Punt[] = [], r: T[] = [];
  const f = ([x, y]: Punt) => a * x + b * y - c;
  for (let i = 0; i < punten.length; i++) {
    const v = punten[i]!, w = punten[(i + 1) % punten.length]!, fv = f(v), fw = f(w);
    const snij = (): Punt => { const t = fv / (fv - fw); return [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])]; };
    if (fv <= 1e-9) {
      p.push(v); r.push(randen[i]!);
      if (fw > 1e-9 && fv < -1e-9) { p.push(snij()); r.push(nieuw); }
      else if (fw > 1e-9) r[r.length - 1] = nieuw;
    } else if (fw < -1e-9) { p.push(snij()); r.push(randen[i]!); }
  }
  // Samenvallende punten weg.
  const pp: Punt[] = [], rr: T[] = [];
  p.forEach((q, i) => { const n = p[(i + 1) % p.length]!; if (Math.hypot(n[0] - q[0], n[1] - q[1]) > 1e-6) { pp.push(q); rr.push(r[i]!); } });
  return [pp, rr];
}

/** Richting van de textuur op de vloer van een vrije vorm: die van haar langste zijde, tot op 45° bij x (zoals een rechthoek). */
function vloerRichting(v: Punt[]): number {
  let lang = 0, hoek = 0;
  v.forEach((p, i) => {
    const q = v[(i + 1) % v.length]!, l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l > lang + 0.5) { lang = l; hoek = Math.atan2(q[1] - p[1], q[0] - p[0]) * GRAAD; }
  });
  hoek = ((hoek % 90) + 90) % 90;
  if (hoek > 45) hoek -= 90;
  return Math.abs(hoek) < 0.01 ? 0 : fijn(hoek);
}

export interface OpeningInhoud {
  /** Blokken van raam of deur in lokale coördinaten (x langs de muur vanaf het begin van de opening, z = 0 buitenkant kader). */
  blokken: Blok[];
  /** Totale hoogte van de opening in de muur (kader + zonweringskast), in cm. */
  hoogte: number;
}

export interface Plan3DOpties {
  /** Muren laag afsnijden (cm) om binnen te kijken; undefined = volledige hoogte. */
  laag?: number;
  meubels?: boolean;
  /** Raam of buitendeur van een offertepositie. */
  inhoud?: (o: Opening) => OpeningInhoud | undefined;
  /** Alleen de verdiepingen tot en met dit niveau tonen (de bovenste zonder dak). */
  totNiveau?: number;
  /**
   * Het dak op de bovenste verdieping tonen (alleen met een dakkeuze in het plan, als alle verdiepingen getoond worden
   * en de muren niet laag staan). false = de bovenste verdieping open laten, om erin te kijken.
   */
  dak?: boolean;
  /**
   * Lichtinval: wat hierboven verborgen is (het dak, de verdiepingen erboven, de muren boven de snijhoogte) komt er
   * toch bij als blokken die alleen schaduw werpen (`alleenSchaduw`). Zo kijk je van boven in de kamers en valt de zon
   * er toch alleen door de ramen en de lichtkoepels in. Zonder dakkeuze rekent de schaduw met een plat dak.
   */
  lichtinval?: boolean;
  /**
   * Aanleg rond de woning: een terras voor elk schuifraam en elke buitendeur van het gelijkvloers, en een pad naar een
   * buitendeur in een hal (de voordeur). Hoort bij het gebouw en is dus gegevens (code `terras_…`, `pad_…`); lucht,
   * gras en horizon zijn weergave en komen van de kijker. Het kader (camera) blijft dat van de woning zelf.
   * Een benadering om het beeld af te maken: maten en plaats zijn niet door de gebruiker getekend.
   */
  aanleg?: boolean;
  /**
   * Een binnenmuur die tegen de gevel aansluit, loopt in de 3D door tot in het gevelvlak: haar kopse kant was daar een
   * witte streep van boven tot onder in de gevel. Met deze optie krijgt die kopse kant het materiaal van de gevel (en
   * van de sokkel), op een verdieping ook het stukje voor de rand van de vloerplaat, en de dakrand loopt er door. Uit = de blokken van vroeger
   * (de vingerafdrukken van bestaande projecten in de tests blijven gelijk).
   */
  gevelkoppen?: boolean;
  /**
   * Aantikken in de 3D: elk blok zegt bij welk ding het hoort, met de code `<ding>.<code>` (zoals de elementen van een
   * zetel). Dingen: `dak` (dak, dakrand, daklichten), `gevel:<ruimte>:<kant>` (het muurvlak, zie `vlakSleutel`; ook de
   * sokkel en de topgevel), `opening:<id>` (raam, buitendeur of poort met een positie), `ruimte:<id>` (vloer) en
   * `meubel:<id>`. De kijker meldt bij een tik het ding (`opKlik`) en kan het aanduiden (`markeer`). Binnenmuren,
   * binnendeuren en de aanleg horen bij geen ding. Uit = de codes van vroeger (vingerafdrukken en het 3D-pakket blijven gelijk).
   */
  dingen?: boolean;
  /**
   * Techniek (ronde 10): de toestellen en leidingen van het plan tonen, per vak aan of uit (`vakken`, standaard alle), in
   * de gewone woning of in de uitgezette weergave (`weergave: 'uitgezet'`: vloeren, lage wanden en een lijn op
   * plafondhoogte, zonder dak, ramen of meubels, zodat je vooral de installaties ziet). Vraagt `cat.techniek`.
   * Ontbreekt = de blokken van vroeger. Zie techniek.ts.
   */
  techniek?: TechniekWeergave;
  /**
   * Wat je van de techniek in werkelijkheid buiten ziet (ronde 10c, 17/11), in de afgewerkte woning: de toestellen buiten
   * (de buitenunit van een airco of een warmtepomp), op het dak (een dakdoorvoer) en aan de buitenkant van een gevel (een
   * laadpaal, een buitenkraan, een gevelrooster), zie `toestelBuiten`. Op hun echte maat, in hun eigen kleur, zonder
   * merkteken, na het kader (de camera verandert niet). Geen leidingen. Telt niet als `techniek` gezet is (dan staan ze er
   * al). Uit = de blokken van vroeger; een plan zonder toestellen verandert nooit.
   */
  techniekBuiten?: boolean;
  /**
   * De techniek binnen in de afgewerkte woning (ronde 17, zie techniekbinnen.ts): elk toestel dat binnen hangt of staat
   * (stopcontact, schakelaar, airco, radiator, lampen, warmtepomp …) op zijn plaats en echte maat, in zijn eigen kleur,
   * zonder merkteken en zonder leidingen; met lage muren wat boven de snijhoogte aan de muur hangt met een stukje muur
   * erachter, en niets aan het plafond. Na het kader. Niet als `techniek` gezet is. Uit = de blokken van vroeger.
   */
  techniekBinnen?: boolean;
  /**
   * De verlichting (ronde 15, zie nacht.ts): de ledstrips als dun profiel in de afgewerkte woning (na het kader), en wat
   * 's nachts licht geeft krijgt `licht`: het glas van de ramen, buitendeuren en daklichten, de lampen die buiten hangen
   * of staan. De kijker toont dat alleen in de nachtweergave. Uit = de blokken van vroeger.
   */
  verlichting?: boolean;
}

/**
 * Staat of hangt dit toestel buiten, waar je het in werkelijkheid ziet (ronde 10c)? Buiten of op het dak (zijn
 * bevestiging), of aan een wand buiten elke ruimte van zijn verdieping: tegen de buitenkant van een gevel (zoals
 * `toestelVlak` in techniekplaatsen.ts). Een toestel aan het plafond of op de vloer buiten de woning is een fout in het
 * plan (de controles melden het) en telt niet.
 */
export function toestelBuiten(plan: Plattegrond, t: Toestel): boolean {
  if (t.aan === 'buiten' || t.aan === 'dak') return true;
  return t.aan === 'wand' && !ruimteOp(plan, t.x, t.y, t.niveau ?? 0);
}

/** Code van een blok met het ding waar het bij hoort (zie `Plan3DOpties.dingen`). */
const metDing = (opties: Plan3DOpties, ding: string | undefined, code: string) => (opties.dingen && ding ? `${ding}.${code}` : code);

/** Hele woning: alle verdiepingen op elkaar, met vloerplaten, trapgaten en platte daken. */
export function plattegrond3D(plan: Plattegrond, cat: PlanCatalogus, opties: Plan3DOpties = {}): Scene3D {
  // Techniek in de uitgezette weergave: een eigen, eenvoudige woning (zie `uitgezet3D`).
  if (opties.techniek?.weergave === 'uitgezet') return uitgezet3D(plan, cat, opties);
  const blokken: Blok[] = [];
  const niveaus = verdiepingenVan(plan).length;
  const laatste = Math.min(niveaus - 1, opties.totNiveau ?? niveaus - 1);
  const H = plan.muurhoogte;
  // Dak op de bovenste verdieping: alleen met een dakkeuze, als alles getoond wordt en de muren niet laag staan.
  const opbouw = dakOpbouw(plan);
  const topDak = !!opbouw && opties.dak !== false && !opties.laag && opties.totNiveau === undefined;
  const platAfw = dakAfwerking(cat, opbouw?.platBedekking);
  for (let n = 0; n <= laatste; n++) {
    const y0 = vloerHoogte(plan, n);
    const p = niveauPlan(plan, n);
    // Trapgaten: voetafdruk van de trappen op de verdieping eronder.
    const gaten = n > 0 ? plan.meubels.filter((m) => m.type === 'trap' && niveauVan(m) === n - 1).map(meubelVoetafdruk) : [];
    const zonderGaten = (r: Rechthoek) => gaten.reduce<Rechthoek[]>((stukken, g) => stukken.flatMap((s) => trekAf(s, g)), [r]);
    const zonderGatenVorm = (v: Punt[]) => gaten.reduce<Punt[][]>((stukken, g) => stukken.flatMap((q) => trekVeelhoekAf(q, rechthoekVorm(g))), [v]);
    if (n > 0) {
      for (const r of p.ruimtes) for (const deel of delenVan(r)) {
        if (deel.omtrek) {
          for (const v of zonderGatenVorm(vormVanDeel(deel))) blokken.push(grondPrisma(metDing(opties, `ruimte:${r.id}`, `plaat_${r.id}`), 'gevel', '#c9c6bf', v, y0 - VLOERDIKTE, VLOERDIKTE));
          continue;
        }
        for (const s of zonderGaten(deel)) {
          blokken.push({ code: metDing(opties, `ruimte:${r.id}`, `plaat_${r.id}`), soort: 'gevel', vorm: 'blok', x: s.x, y: y0 - VLOERDIKTE, z: s.y, b: s.b, h: VLOERDIKTE, d: s.d, kleur: '#c9c6bf' });
        }
      }
    }
    const isTop = !!opbouw && n === opbouw.top;
    const hellendHier = isTop && topDak && !!opbouw.hellend;
    const scene = niveau3D(p, cat, { ...opties, laag: n === laatste ? opties.laag : undefined }, zonderGaten, n, hellendHier, zonderGatenVorm);
    for (const b of scene) blokken.push({ ...b, y: r2(b.y + y0) });
    // Stroken op de gevel (ronde 14): een bekleding vóór de muur, ook in de topgevel. Zonder stroken: niets.
    if (strokenVan(plan).length) blokken.push(...strookBlokken(plan, cat, n, { uitsparing: muurUitsparing(opties), dak: hellendHier ? opbouw.hellend : undefined, laag: n === laatste ? opties.laag : undefined, code: (s, c) => metDing(opties, `strook:${s}`, c) }));
    // Plat dak: boven de delen die niet onder een hogere (getoonde) verdieping liggen, en met een dakkeuze ook
    // op de bovenste verdieping.
    const platHier = !hellendHier && (n < laatste || (isTop && topDak));
    // Dakrand (opstand met muurkap) op de buitenmuren waar geen muur van de verdieping erboven op staat.
    if (platHier) {
      // Sluit op dit punt een binnenmuur tegen deze (staande) buitenmuur aan? Dan is de buitenmuur daar onderbroken
      // over de dikte van de binnenmuur, en de dakrand ook. Met `gevelkoppen` loopt de dakrand er door.
      const murenHier = opties.gevelkoppen ? murenVan(p) : [];
      const onderbroken = (m: Muur, punt: number) => m.as === 'v'
        && murenHier.some((h) => h.as === 'h' && h.soort === 'binnen' && gelijk(h.lijn, punt) && (gelijk(h.van, m.lijn) || gelijk(h.tot, m.lijn)))
        && !murenHier.some((h) => h.as === 'h' && h.soort === 'buiten' && gelijk(h.lijn, punt) && h.van <= m.lijn + 0.5 && h.tot >= m.lijn - 0.5);
      const murenN = murenVan(p);
      for (const { muur: m, vlak, van, tot } of dakrandStukken(plan, n)) {
        if (m.as === 's') {
          // Schuine muur: haar grondvlak (met dakkeuze 1,5 cm breder aan elke kant, zoals de muurkap) tussen van en tot. Aan
          // een einde van de muur zelf niet afknippen: daar loopt de bredere kap tot in de hoek (anders een gat in de hoek).
          const g = schuinVlak(m, murenN, opbouw ? 1.5 : 0), { d } = asVan(m);
          const langs = vlak.punten!.map((q) => opAs(m, q)[0]);
          let [pts] = gelijk(van, Math.min(...langs)) ? [g.punten!] : knipMetRanden(g.punten!, g.randen!, -d[0], -d[1], -van, 'snede' as MuurRand);
          if (!gelijk(tot, Math.max(...langs))) [pts] = knipMetRanden(pts, pts.map(() => 'snede' as MuurRand), d[0], d[1], tot, 'snede');
          if (pts.length >= 3) blokken.push(grondPrisma(`dakrand_${m.id}_${r2(van)}`, 'kunststof', '#2b2b2b', pts, opbouw ? y0 + H - 1 : y0 + H, opbouw ? VLOERDIKTE + 3 : VLOERDIKTE + 2));
          continue;
        }
        const x = gelijk(van, vlak.y) && onderbroken(m, m.van) ? m.van : van, y = gelijk(tot, vlak.y + vlak.d) && onderbroken(m, m.tot) ? m.tot : tot;
        const basis = { code: metDing(opties, 'dak', `dakrand_${m.id}_${van}`), soort: 'kunststof' as BlokSoort, vorm: 'blok' as const, kleur: '#2b2b2b', y: y0 + H, h: VLOERDIKTE + 2 };
        if (!opbouw) {
          blokken.push(m.as === 'h' ? { ...basis, x, z: vlak.y, b: y - x, d: vlak.d } : { ...basis, x: vlak.x, z: x, b: vlak.b, d: y - x });
          continue;
        }
        // Met dakkeuze: een muurkap die 1,5 cm buiten de muur steekt en 1 cm over de muurkop grijpt. Zo vallen er geen
        // vlakken samen en schemert de witte bovenkant van de muur niet als een stippellijn door de naad.
        const kap = { ...basis, y: y0 + H - 1, h: VLOERDIKTE + 3 }, u = 1.5;
        blokken.push(m.as === 'h' ? { ...kap, x, z: vlak.y - u, b: y - x, d: vlak.d + 2 * u } : { ...kap, x: vlak.x - u, z: x, b: vlak.b + 2 * u, d: y - x });
      }
    }
    if (platHier) {
      const lichten = opbouw ? opbouw.daklichten.filter((l) => !l.reden && niveauVan(l.licht) === n).map((l) => l.licht) : [];
      const bedekt: Rechthoek[] = [], bedektVorm: Punt[][] = [];
      // Het platte dak van een bestaande ruimte (ronde 11): neutraal, in zijn eigen laag.
      const oudBedekt: Rechthoek[] = [], oudBedektVorm: Punt[][] = [];
      const oudAfw = { soort: 'gevel' as BlokSoort, kleur: NEUTRAAL.dak };
      for (const { ruimte: r, stuk } of vrijeDakstukken(plan, n)) {
        const oudDak = r.bestaand === true;
        const afw = oudDak ? oudAfw : platAfw;
        if (stuk.omtrek) {
          // Vrije vorm: dezelfde opbouw, als prisma's met het grondvlak van het stuk (min de openingen van de daklichten).
          const v = vormVanDeel(stuk);
          if (!opbouw) { blokken.push(grondPrisma(metDing(opties, 'dak', `dak_${r.id}`), 'dak', oudDak ? NEUTRAAL.dak : '#2e2e2e', v, y0 + H, VLOERDIKTE)); continue; }
          for (const q of lichten.reduce<Punt[][]>((st, l) => st.flatMap((x) => trekVeelhoekAf(x, rechthoekVorm(l))), [v])) {
            blokken.push(grondPrisma(metDing(opties, 'dak', `dakplaat_${r.id}`), 'gevel', '#c9c6bf', q, y0 + H, VLOERDIKTE - DAK_LAAG, { zijden: { 'y+': afw }, randen: q.map(() => afw) }));
            (oudDak ? oudBedektVorm : bedektVorm).push(q);
          }
          continue;
        }
        if (!opbouw) {
          // Zonder dakkeuze: het effen donkere blok van altijd.
          blokken.push({ code: metDing(opties, 'dak', `dak_${r.id}`), soort: 'dak', vorm: 'blok', x: stuk.x, y: y0 + H, z: stuk.y, b: stuk.b, h: VLOERDIKTE, d: stuk.d, kleur: oudDak ? NEUTRAAL.dak : '#2e2e2e' });
          continue;
        }
        // Met dakkeuze: per ruimte een dakplaat met een lichte onderkant (het plafond), en een opening per daklicht.
        // Haar zijkanten en bovenkant krijgen de kleur van de bedekking: een staand vlak vlak onder het dak schemert
        // onder een schuine kijkhoek als een stippellijn door het dakvlak (zo zie je het niet).
        for (const s of lichten.reduce<Rechthoek[]>((st, l) => st.flatMap((q) => trekAf(q, l)), [stuk])) {
          blokken.push({
            code: metDing(opties, 'dak', `dakplaat_${r.id}`), soort: 'gevel', vorm: 'blok', x: s.x, y: y0 + H, z: s.y, b: s.b, h: VLOERDIKTE - DAK_LAAG, d: s.d, kleur: '#c9c6bf',
            zijden: { 'y+': afw, 'x-': afw, 'x+': afw, 'z-': afw, 'z+': afw },
          });
          (oudDak ? oudBedekt : bedekt).push(s);
        }
      }
      // Daarop de bedekking als één laag voor de hele verdieping, in zo weinig mogelijk stroken: geen naad boven elke
      // binnenmuur. Waar twee stroken toch aan elkaar sluiten, grijpen ze een halve centimeter in elkaar.
      for (const s of voegSamen(bedekt)) {
        blokken.push({ code: metDing(opties, 'dak', `dak_${n}`), soort: platAfw.soort, vorm: 'blok', x: s.x - 0.5, y: y0 + H + VLOERDIKTE - DAK_LAAG, z: s.y - 0.5, b: s.b + 1, h: DAK_LAAG, d: s.d + 1, kleur: platAfw.kleur });
      }
      for (const v of bedektVorm) blokken.push(grondPrisma(metDing(opties, 'dak', `dak_${n}`), platAfw.soort, platAfw.kleur, verschuifZijden(v, 0.5), y0 + H + VLOERDIKTE - DAK_LAAG, DAK_LAAG));
      for (const s of voegSamen(oudBedekt)) {
        blokken.push({ code: metDing(opties, 'dak', `dak_bestaand_${n}`), soort: oudAfw.soort, vorm: 'blok', x: s.x - 0.5, y: y0 + H + VLOERDIKTE - DAK_LAAG, z: s.y - 0.5, b: s.b + 1, h: DAK_LAAG, d: s.d + 1, kleur: oudAfw.kleur });
      }
      for (const v of oudBedektVorm) blokken.push(grondPrisma(metDing(opties, 'dak', `dak_bestaand_${n}`), oudAfw.soort, oudAfw.kleur, verschuifZijden(v, 0.5), y0 + H + VLOERDIKTE - DAK_LAAG, DAK_LAAG));
      for (const l of lichten) {
        const lb = daklichtBlokken(l, cat.daklichten?.[l.type]?.vorm ?? 'koepel', y0 + H + VLOERDIKTE, VLOERDIKTE);
        blokken.push(...(opties.verlichting ? daklichtLicht(lb) : lb).map((b) => ({ ...b, code: metDing(opties, 'dak', b.code) })));
      }
    }
    if (hellendHier) {
      // Het hellende dak van een bestaande woning (ronde 11): neutraal, zoals haar muren.
      const bedekking = alleBestaand(plan, n) ? { soort: 'gevel' as BlokSoort, kleur: NEUTRAAL.dak } : dakAfwerking(cat, opbouw.keuze.bedekking);
      const dak = hellendDak3D(plan, cat, p, opbouw.hellend!, y0 + H, bedekking);
      // De topgevel en de hoge gevel van een lessenaar horen bij het muurvlak eronder, de rest bij het dak.
      const muurVan = opties.dingen ? new Map(murenVan(p).map((m) => [m.id, m])) : undefined;
      const gevelVan = (code: string) => {
        const m = muurVan?.get(/^(?:topgevel|dakmuur|dakwig)_(.+)$/.exec(code)?.[1] ?? '');
        return m?.soort === 'buiten' ? `gevel:${vlakSleutel(m)}` : 'dak';
      };
      blokken.push(...(opties.dingen ? dak.map((b) => ({ ...b, code: metDing(opties, gevelVan(b.code), b.code) })) : dak));
    }
  }
  if (opties.lichtinval && plan.ruimtes.length) {
    // De hele woning, met dak (zonder dakkeuze een plat dak): alles wat daarvan niet getoond wordt, werpt alleen schaduw.
    // Glas laat het licht door. Het kader (voor de camera) blijft dat van wat je ziet.
    const vol = plattegrond3D(plan.dak ? plan : { ...plan, dak: standaardDak() }, cat, { meubels: opties.meubels, inhoud: opties.inhoud, dingen: opties.dingen }).blokken;
    // De buren (ronde 11) worden getoond (na het kader, hieronder): hun volume hoeft er niet nog eens als schaduw bij.
    const buren = burenBlokken(plan, opties, laatste, opbouw, topDak);
    const getoond = new Set([...blokken, ...buren].map((b) => JSON.stringify(b)));
    const kader = kaderVan(blokken);
    for (const b of vol) {
      if (b.soort === 'glas' || b.soort === 'matglas' || getoond.has(JSON.stringify(b))) continue;
      blokken.push({ ...b, code: `schaduw_${b.code}`, alleenSchaduw: true });
    }
    if (opties.aanleg) blokken.push(...aanlegBlokken(plan));
    blokken.push(...buren);
    blokken.push(...techniek3D(plan, cat, opties));
    blokken.push(...techniekBuiten3D(plan, cat, opties, laatste, opbouw, topDak));
    blokken.push(...techniekBinnen3D(plan, cat, opties, laatste, topDak));
    blokken.push(...ledstrips3D(plan, cat, opties, laatste));
    return { blokken, kader };
  }
  // Het kader is dat van de woning zelf: met terras en pad erbij zou de camera verder weg gaan staan.
  const kader = kaderVan(blokken);
  if (opties.aanleg) blokken.push(...aanlegBlokken(plan));
  // De buren (ronde 11): na het kader, zoals de aanleg, zodat de camera niet verder weg gaat staan.
  blokken.push(...burenBlokken(plan, opties, laatste, opbouw, topDak));
  // Techniek (alleen met de optie): na het kader, zoals de aanleg (een buitenunit naast de woning verzet de camera niet).
  blokken.push(...techniek3D(plan, cat, opties));
  // Wat je van de techniek buiten ziet, in de afgewerkte woning (ronde 10c): ook na het kader.
  blokken.push(...techniekBuiten3D(plan, cat, opties, laatste, opbouw, topDak));
  // Ronde 17: de techniek binnen (stopcontacten, airco, radiatoren, lampen …), ook na het kader.
  blokken.push(...techniekBinnen3D(plan, cat, opties, laatste, topDak));
  // De ledstrips (ronde 15): een dun profiel, ook na het kader.
  blokken.push(...ledstrips3D(plan, cat, opties, laatste));
  return { blokken, kader };
}

/** Opties voor één ruimte van binnen (ronde 12). */
export interface BinnenOpties {
  /** De kant die open blijft (daar kijkt de camera door naar binnen); standaard tegenover de accentmuur, anders onder. */
  open?: GevelKant;
  inhoud?: (o: Opening) => OpeningInhoud | undefined;
  meubels?: boolean;
  /** Aantikken: vloer, plafond en plint horen bij `ruimte:<id>`, een muur bij `ruimte:<id>:<kant>` (de kant van de ruimte). */
  dingen?: boolean;
  /** De toestellen van de techniek in deze ruimte (ronde 17, zie `techniekVanBinnen`). */
  techniek?: boolean;
}

/** De kant die standaard open blijft: tegenover de accentmuur (zodat je ze ziet), anders de onderkant van het plan. */
export function openKantVan(r: Ruimte): GevelKant {
  const tegen: Record<GevelKant, GevelKant> = { boven: 'onder', onder: 'boven', links: 'rechts', rechts: 'links' };
  return r.accent ? tegen[r.accent.kant] : 'onder';
}

/**
 * Eén ruimte van binnen (ronde 12): haar vloer, haar muren in hun afwerking (ook de accentmuur), de ramen en deuren
 * erin, de plint, de meubels, en het plafond met de plaat erboven; de muren aan één kant (`open`) weg, zoals een snede.
 * De scène is gedraaid zodat die open kant naar de camera van *Ooghoogte* kijkt (de +z-kant): wie ze toont, zet daarna
 * dat standpunt en ziet zo de vloer, de muren en het plafond van onder. Op de vloer gezet (een verdieping zakt), zonder de
 * rand van de vloerplaat. Hetzelfde `niveau3D` als de woning, met een filter: er is geen tweede manier van tekenen.
 * Een vereenvoudiging: onder een hellend dak een vlak plafond op de muurhoogte.
 */
export function ruimteVanBinnen(plan: Plattegrond, cat: PlanCatalogus, id: string, opties: BinnenOpties = {}): Scene3D | undefined {
  const r = plan.ruimtes.find((x) => x.id === id);
  if (!r) return undefined;
  const n = niveauVan(r);
  const p = niveauPlan(plan, n);
  const open = opties.open ?? openKantVan(r);
  const o3: Plan3DOpties = { meubels: opties.meubels, inhoud: opties.inhoud, dingen: opties.dingen };
  const blokken = niveau3D(p, cat, o3, (x) => [x], n, false, (v) => [v], { ruimte: id, open: [open] });
  // Een trap in de ruimte gaat door het plafond: daar een gat.
  const gaten = p.meubels.filter((m) => m.type === 'trap' && meubelIn(r, m)).map(meubelVoetafdruk);
  const muren = murenVan(p).filter((m) => binnenKant(m, id) && binnenKant(m, id) !== open);
  const dikte = muren.length ? Math.max(...muren.map((m) => m.dikte)) : plan.buitenmuur;
  blokken.push(...plafondBlokken(p, cat, r, { open: [open], gaten, dikte, code: (c) => metDing(o3, `ruimte:${id}`, c) }));
  // Ronde 17: de stopcontacten, de airco, de lampen aan het plafond … van deze ruimte.
  if (opties.techniek) blokken.push(...techniekVanBinnen(plan, cat, r, [open], { dingen: opties.dingen }));
  // Draaien: de open kant naar +z (onder op het plan), rond het midden van de ruimte.
  const kwart: Record<GevelKant, number> = { onder: 0, rechts: 1, boven: 2, links: 3 };
  const gedraaid = draaiKwart(blokken, kwart[open], [r.x + r.b / 2, r.y + r.d / 2]);
  // Het kader (de camera) iets kleiner en hoger dan de ruimte, rond hetzelfde midden: zo staat de camera van Ooghoogte
  // dichterbij en kijkt ze bijna recht vooruit, met de vloer én het plafond in beeld (de kijker zet het doel op 35 % van
  // de hoogte van het kader en de afstand op anderhalve keer zijn breedte).
  // Het kader van de ruimte zelf (met haar muren), niet van alles wat uitsteekt (een open deur): anders staat ze scheef in beeld.
  const rk = delenKader(delenVan(r)), cx = r.x + r.b / 2, cz = r.y + r.d / 2, k = kwart[open]!;
  // Het midden van de ruimte, even veel kwartslagen gedraaid als de blokken (elke kwartslag: (x, z) → (−z, x)).
  let [dx, dz] = [rk.x + rk.b / 2 - cx, rk.y + rk.d / 2 - cz];
  for (let i = 0; i < k; i++) [dx, dz] = [-dz, dx];
  const [b, d] = k % 2 ? [rk.d + dikte, rk.b + dikte] : [rk.b + dikte, rk.d + dikte];
  const kader = { x: cx + dx - b * 0.46, z: cz + dz - d * 0.46, b: b * 0.92, d: d * 0.92, h: plan.muurhoogte * 1.5 };
  return { blokken: gedraaid, kader };
}

/**
 * De toestellen die je buiten ziet (`Plan3DOpties.techniekBuiten`, `toestelBuiten`), op hun echte maat en zonder
 * merkteken. Wat niet getoond wordt: een verdieping boven `totNiveau`; op de bovenste getoonde verdieping met lage muren
 * een toestel aan de gevel dat boven de snijhoogte uitkomt (een laadpaal naast een muur van 110 cm zou zweven; een
 * buitenunit staat op de grond en blijft); een toestel op het
 * dak waar geen plat dak getekend wordt (de bovenste verdieping zonder dak, onder een hellend dak).
 */
function techniekBuiten3D(plan: Plattegrond, cat: PlanCatalogus, opties: Plan3DOpties, laatste: number, opbouw: DakOpbouw | undefined, topDak: boolean): Blok[] {
  const tc = cat.techniek;
  if (!opties.techniekBuiten || opties.techniek || !tc || !plan.toestellen?.length) return [];
  const uit: Blok[] = [];
  for (const t of plan.toestellen) {
    const type = tc.toestellen[t.type], n = t.niveau ?? 0;
    if (!type || n > laatste || !toestelBuiten(plan, t)) continue;
    if (t.aan === 'dak' && !(n < laatste || (topDak && !!opbouw && n === opbouw.top && !opbouw.hellend))) continue;
    if (t.aan === 'wand' && n === laatste && opties.laag !== undefined && t.hoogte + toestelMaten(type, t.aan).h > opties.laag) continue;
    const code = `toestel_${t.id}`;
    const blokken = toestelBlokken(t, type, vloerHoogte(plan, n), plan.muurhoogte, code, false);
    // Een lamp (ronde 15) licht 's nachts op en verlicht de gevel errond.
    uit.push(...(opties.verlichting ? toestelLicht(blokken, type, t) : blokken).map((b) => ({ ...b, code: metDing(opties, `toestel:${t.id}`, b.code) })));
  }
  return uit;
}

/** De techniek binnen in de afgewerkte woning (ronde 17, `Plan3DOpties.techniekBinnen`); niet als de techniek getoond wordt. */
function techniekBinnen3D(plan: Plattegrond, cat: PlanCatalogus, opties: Plan3DOpties, laatste: number, topDak: boolean): Blok[] {
  if (!opties.techniekBinnen || opties.techniek || !plan.toestellen?.length) return [];
  return techniekBinnenBlokken(plan, cat, { laag: opties.laag, laatste, dakErop: topDak, dingen: opties.dingen, verlichting: opties.verlichting });
}

/** De ledstrips in de afgewerkte woning (ronde 15, `Plan3DOpties.verlichting`); niet als de techniek getoond wordt (dan staan ze er al). */
function ledstrips3D(plan: Plattegrond, cat: PlanCatalogus, opties: Plan3DOpties, laatste: number): Blok[] {
  if (!opties.verlichting || opties.techniek || !plan.leidingen?.length) return [];
  return ledstripBlokken(plan, cat.techniek, { laag: opties.laag, totNiveau: laatste, laatste, dingen: opties.dingen });
}

/** De toestellen en leidingen voor de 3D (zie `Plan3DOpties.techniek`); leeg zonder de optie of zonder catalogus. */
function techniek3D(plan: Plattegrond, cat: PlanCatalogus, opties: Plan3DOpties): Blok[] {
  if (!opties.techniek || !cat.techniek) return [];
  return techniekBlokken(plan, cat.techniek, {
    vakken: opties.techniek.vakken, niveau: opties.techniek.niveau, totNiveau: opties.totNiveau, dingen: opties.dingen,
    vloerHoogte: (n) => vloerHoogte(plan, n),
    // Opvallend (ook in de woning, op het scherm): wat in de vloer zit, ligt zichtbaar op de vloer, zoals uitgezet
    // (16/11, doorloop A20: de vloerverwarming bleef onder het parket onzichtbaar).
    vloerBoven: opties.techniek.weergave === 'uitgezet' || !!opties.techniek.opvallend, opvallend: opties.techniek.opvallend ?? opties.techniek.weergave === 'uitgezet',
  });
}

/** Maten van de uitgezette weergave (cm): de lage wanden, de lijn op plafondhoogte en de kleuren. */
const UITGEZET = { wand: 12, lijn: 2, staander: 4, vloer: 1, kleurVloer: '#e6e4de', kleurWand: '#bab7af', kleurLijn: '#8a8781' };

/**
 * De woning uitgezet, om de installaties te zien (`Plan3DOpties.techniek` met `weergave: 'uitgezet'`): per verdieping de
 * muren als lage wand (12 cm, met de deuropeningen eruit), de buitenmuren ook als dunne lijn op plafondhoogte met een
 * staander op de hoeken (een draadmodel van de verdieping), de vloeren
 * alleen op de onderste getoonde verdieping (een vloer erboven zou de installaties eronder verbergen), zonder dak,
 * vloerplaten, ramen, meubels en aanleg. Alles in effen, lichte kleuren, zodat de kleuren van de leidingen opvallen; een
 * leiding in de vloer ligt zichtbaar op de vloer en kleine toestellen zijn groter (zie `toestelBlokken`). De kijker kent
 * geen doorschijnend materiaal (behalve glas): dit is de weergave die zonder dat kan.
 */
function uitgezet3D(plan: Plattegrond, cat: PlanCatalogus, opties: Plan3DOpties): Scene3D {
  const blokken: Blok[] = [];
  const t = opties.techniek ?? {};
  const niveaus = verdiepingenVan(plan).length;
  const laatste = Math.min(niveaus - 1, opties.totNiveau ?? niveaus - 1);
  const eerste = t.niveau ?? 0, tot = t.niveau ?? laatste;
  const H = plan.muurhoogte, U = UITGEZET;
  const effen = (code: string, kleur: string, b: Omit<Blok, 'code' | 'soort' | 'kleur' | 'vorm'>): Blok =>
    ({ code, soort: 'gevel', vorm: 'blok', kleur, ...b, x: r2(b.x), y: r2(b.y), z: r2(b.z), b: r2(b.b), h: r2(b.h), d: r2(b.d) });
  for (let n = eerste; n <= tot; n++) {
    const y0 = vloerHoogte(plan, n), p = niveauPlan(plan, n), muren = murenVan(p);
    if (n === eerste) {
      for (const r of p.ruimtes) for (const deel of delenVan(r)) {
        blokken.push(deel.omtrek
          ? grondPrisma(`uitgezet_vloer_${r.id}`, 'gevel', U.kleurVloer, vormVanDeel(deel), y0, U.vloer)
          : effen(`uitgezet_vloer_${r.id}`, U.kleurVloer, { x: deel.x, y: y0, z: deel.y, b: deel.b, h: U.vloer, d: deel.d }));
      }
    }
    for (const m of muren) {
      const vlak = muurVlak(m, muren);
      const langs = vlak.punten?.map((q) => opAs(m, q)[0]);
      const begin = langs ? Math.min(...langs) : m.as === 'h' ? vlak.x : vlak.y, einde = langs ? Math.max(...langs) : begin + (m.as === 'h' ? vlak.b : vlak.d);
      // De lage wand, zonder de openingen tot op de vloer (deuren, doorgangen, schuiframen): zo zie je waar je binnenkomt.
      const gaten = p.openingen.filter((o) => o.borstwering < U.wand && muurVanOpening(o, [m]) === m)
        .map((o) => [o.midden - o.breedte / 2, o.midden + o.breedte / 2] as const).sort((a, b) => a[0] - b[0]);
      const stukken: [number, number][] = [];
      let c = begin;
      for (const [a, b] of gaten) { if (a > c + 0.1) stukken.push([c, a]); c = Math.max(c, b); }
      if (einde > c + 0.1) stukken.push([c, einde]);
      const stuk = (code: string, a: number, b: number, y: number, h: number) => {
        if (m.as === 's') {
          const { d } = asVan(m);
          let [pts] = knipMetRanden<MuurRand>(vlak.punten!, vlak.randen!, -d[0], -d[1], -a, 'snede');
          [pts] = knipMetRanden(pts, pts.map(() => 'snede' as MuurRand), d[0], d[1], b, 'snede');
          if (pts.length >= 3) blokken.push(grondPrisma(code, 'gevel', y === y0 ? U.kleurWand : U.kleurLijn, pts, y, h));
          return;
        }
        const kleur = y === y0 ? U.kleurWand : U.kleurLijn;
        blokken.push(m.as === 'h' ? effen(code, kleur, { x: a, y, z: vlak.y, b: b - a, h, d: vlak.d }) : effen(code, kleur, { x: vlak.x, y, z: a, b: vlak.b, h, d: b - a }));
      };
      for (const [a, b] of stukken) stuk(`uitgezet_wand_${n}_${m.id}_${r2(a)}`, a, b, y0, U.wand);
      // De lijn op plafondhoogte alleen langs de buitenmuren: de omtrek van de verdieping, zonder een raster van binnenmuren.
      if (m.soort === 'buiten') stuk(`uitgezet_lijn_${n}_${m.id}`, begin, einde, y0 + H - U.lijn, U.lijn);
    }
    // Een dunne staander op elke hoek van de buitenmuren (16/11, doorloop A9): zonder hing de lijn op plafondhoogte als
    // een los kader boven de woning; zo leest ze als een draadmodel van de verdieping. Alleen waar een liggende en een
    // staande buitenmuur samenkomen (een schuine muur krijgt er geen).
    const hoog = H - U.lijn - U.wand, S = U.staander;
    if (hoog > 0) {
      const liggend = muren.filter((m) => m.soort === 'buiten' && m.as === 'h'), staand = muren.filter((m) => m.soort === 'buiten' && m.as === 'v');
      const hoeken: Punt[] = [];
      for (const h of liggend) for (const v of staand) {
        const tol = Math.max(h.dikte, v.dikte);
        const raakt = (Math.abs(v.lijn - h.van) <= tol || Math.abs(v.lijn - h.tot) <= tol) && (Math.abs(h.lijn - v.van) <= tol || Math.abs(h.lijn - v.tot) <= tol);
        if (raakt && !hoeken.some(([x, y]) => Math.abs(x - v.lijn) < 1 && Math.abs(y - h.lijn) < 1)) hoeken.push([v.lijn, h.lijn]);
      }
      for (const [x, y] of hoeken) blokken.push(effen(`uitgezet_staander_${n}_${r2(x)}_${r2(y)}`, U.kleurLijn, { x: x - S / 2, y: y0 + U.wand, z: y - S / 2, b: S, h: hoog, d: S }));
    }
  }
  const kader = kaderVan(blokken);
  blokken.push(...techniek3D(plan, cat, opties));
  return { blokken, kader };
}

/** Hoe diep het volume van de buren is (cm), van de buitenkant van de scheidingsmuur naar buiten. Een benadering om het beeld af te maken. */
const BUREN_DIEP = 450;

/**
 * De buren (ronde 11): achter elk muurvlak tegen de buren een eenvoudig, neutraal volume, zodat je ziet dat het een
 * rijwoning is. Per verdieping zo hoog als de muur (op een verdieping ook de vloerplaat eronder), bovenaan de rand van
 * een plat dak, en onder een hellend dak dat dwars op die muur staat de vorm van de topgevel. Geen ding (een tik erop
 * kiest niets) en codes die niet met `muur_` of `dakrand_` beginnen (de maten van het gebouw lezen die). Alleen voor
 * rechte muren; een schuine muur tegen de buren krijgt geen volume.
 */
function burenBlokken(plan: Plattegrond, opties: Plan3DOpties, laatste: number, opbouw: DakOpbouw | undefined, topDak: boolean): Blok[] {
  if (!plan.tegenBuren?.length) return [];
  const uit: Blok[] = [];
  const H = plan.muurhoogte;
  /** Staat er op verdieping n ook een muur tegen de buren op dezelfde lijn (dan hebben de buren daar nog een verdieping)? */
  const erboven = (n: number, onder: Muur) => n <= laatste && murenVan(niveauPlan(plan, n)).some((m) =>
    m.soort === 'buiten' && m.as === onder.as && gelijk(m.lijn, onder.lijn) && Math.min(m.tot, onder.tot) - Math.max(m.van, onder.van) > 1 && muurStatus(plan, m) === 'buren');
  for (let n = 0; n <= laatste; n++) {
    const p = niveauPlan(plan, n), muren = murenVan(p);
    const y0 = vloerHoogte(plan, n);
    const hellend = opbouw?.hellend && n === opbouw.top && topDak ? opbouw.hellend : undefined;
    for (const m of muren) {
      if (m.soort !== 'buiten' || m.as === 's' || muurStatus(plan, m) !== 'buren') continue;
      const vlak = muurVlak(m, muren);
      // Langs de muur (a0 tot a1) en naar buiten (t0 tot t1, vanaf de buitenkant van de muur).
      const [a0, a1] = m.as === 'h' ? [vlak.x, vlak.x + vlak.b] : [vlak.y, vlak.y + vlak.d];
      const buitenMin = !m.min;
      const vlakT = m.as === 'h' ? [vlak.y, vlak.y + vlak.d] : [vlak.x, vlak.x + vlak.b];
      const [t0, t1] = buitenMin ? [vlakT[0]! - BUREN_DIEP, vlakT[0]!] : [vlakT[1]!, vlakT[1]! + BUREN_DIEP];
      // Bovenaan: de rand van een plat dak, tenzij de buren erboven nog een verdieping hebben (of er een hellend dak op staat).
      const boven = n === laatste && opties.laag ? 0 : hellend || erboven(n + 1, m) ? 0 : VLOERDIKTE + 2;
      const ya = n > 0 ? y0 - VLOERDIKTE : 0, yb = n === laatste && opties.laag ? y0 + Math.min(opties.laag, H) : y0 + H + boven;
      const code = `buren_${m.id}_${n}`;
      const basis = { code, soort: 'gevel' as BlokSoort, vorm: 'blok' as const, kleur: NEUTRAAL.buren, y: r2(ya), h: r2(yb - ya) };
      uit.push(m.as === 'h' ? { ...basis, x: r2(a0), z: r2(t0), b: r2(a1 - a0), d: BUREN_DIEP } : { ...basis, x: r2(t0), z: r2(a0), b: BUREN_DIEP, d: r2(a1 - a0) });
      // Onder een hellend dak dwars op deze muur: de vorm van de topgevel, doorgetrokken over het volume van de buren.
      if (hellend && (m.as === 'h') !== (hellend.nokAs === 'x')) {
        const punten = gevelOnderDak(hellend, a0, a1);
        if (punten.length) uit.push(prisma(`${code}_dak`, 'gevel', NEUTRAAL.buren, m.as === 'h' ? 'z' : 'x', r2(t0), r2(t1), punten.map(([a, h]): [number, number] => [a, y0 + H + (h === 0 ? -1 : h)])));
      }
    }
  }
  return uit;
}

/** Maten van de aanleg (cm): diepte van een terras, lengte van het pad naar de voordeur, en hoe ver ze naast de opening uitsteken. */
const AANLEG = { terrasDiep: 320, terrasNaast: 110, stoepDiep: 160, stoepNaast: 40, padLang: 520, padNaast: 25, boven: 1.2, dik: 8 };

/**
 * Terras en pad bij de woning (zie `Plan3DOpties.aanleg`), als blokken op het maaiveld. Per opening in een buitenmuur
 * van het gelijkvloers: een schuifraam krijgt een terras in tegels, een buitendeur in een hal (de voordeur) een pad in
 * grind met een stoep, een andere buitendeur een kleine stoep. Wat onder de woning zou vallen of een eerder stuk
 * overlapt, valt weg: zo liggen er nooit twee vlakken op dezelfde plaats.
 */
function aanlegBlokken(plan: Plattegrond): Blok[] {
  const p = niveauPlan(plan, 0);
  const muren = murenVan(p);
  const ruimte = new Map(p.ruimtes.map((r) => [r.id, r]));
  const half = plan.buitenmuur / 2;
  // Voetafdruk van de woning: elke ruimte tot aan de buitenkant van de buitenmuur.
  const woning: Rechthoek[] = p.ruimtes.flatMap(delenVan).map((d) => ({ x: d.x - half, y: d.y - half, b: d.b + 2 * half, d: d.d + 2 * half }));
  const gelegd: Rechthoek[] = [];
  const uit: Blok[] = [];
  const leg = (code: string, soort: BlokSoort, kleur: string, r: Rechthoek) => {
    const stukken = [...woning, ...gelegd].reduce<Rechthoek[]>((st, w) => st.flatMap((s) => trekAf(s, w)), [r]);
    stukken.forEach((s, i) => {
      if (s.b < 5 || s.d < 5) return;
      uit.push({ code: stukken.length > 1 ? `${code}_${i}` : code, soort, vorm: 'blok', x: r2(s.x), y: AANLEG.boven - AANLEG.dik, z: r2(s.y), b: r2(s.b), h: AANLEG.dik, d: r2(s.d), kleur });
      gelegd.push(s);
    });
  };
  // Vlak tegen de gevel: `naast` cm voorbij de opening aan elke kant, `diep` cm naar buiten vanaf `vanaf` cm van de gevel.
  const vlak = (o: Opening, m: Muur, naast: number, vanaf: number, diep: number): Rechthoek => {
    const naarPlus = !!m.min, rand = m.lijn + (naarPlus ? m.dikte / 2 : -m.dikte / 2);
    const a = o.midden - o.breedte / 2 - naast, lang = o.breedte + 2 * naast;
    const b0 = naarPlus ? rand + vanaf : rand - vanaf - diep;
    return m.as === 'h' ? { x: a, y: b0, b: lang, d: diep } : { x: b0, y: a, b: diep, d: lang };
  };
  if (p.ruimtes.some(heeftVrijeVorm)) {
    // Met een vrije vorm: alles als veelhoek (een terras voor een schuine gevel ligt schuin, in de richting van de gevel).
    const woningV = p.ruimtes.flatMap(vormenVan).map((v) => verschuifZijden(v, half));
    const gelegdV: Punt[][] = [];
    const legV = (code: string, soort: BlokSoort, kleur: string, v: Punt[], m: Muur) => {
      const stukken = [...woningV, ...gelegdV].reduce<Punt[][]>((st, w) => st.flatMap((x) => trekVeelhoekAf(x, w)), [metDeKlok(v)]);
      // De richting van de gevel (tussen −90° en 90°: een tegel of plank ligt in beide zinnen even goed).
      let hoek = ((Math.atan2(asVan(m).d[1], asVan(m).d[0]) * GRAAD) % 180 + 180) % 180;
      if (hoek > 90) hoek -= 180;
      stukken.forEach((x, i) => {
        if (veelhoekOppervlakte(x) < 25) return;
        uit.push(grondPrisma(stukken.length > 1 ? `${code}_${i}` : code, soort, kleur, x, AANLEG.boven - AANLEG.dik, AANLEG.dik, m.as === 'h' ? {} : { vlakRichting: fijn(hoek) }));
        gelegdV.push(x);
      });
    };
    // Vlak tegen de gevel, in de assen van de muur (s langs, w dwars), naar buiten.
    const vlakV = (o: Opening, m: Muur, naast: number, vanaf: number, diep: number): Punt[] => {
      const naarPlus = !!m.min, rand = m.lijn + (naarPlus ? m.dikte / 2 : -m.dikte / 2);
      const a = o.midden - o.breedte / 2 - naast, b = a + o.breedte + 2 * naast;
      const w0 = naarPlus ? rand + vanaf : rand - vanaf - diep, w1 = w0 + diep;
      return [langsAs(m, a, w0), langsAs(m, b, w0), langsAs(m, b, w1), langsAs(m, a, w1)];
    };
    const buitenV = p.openingen
      .map((o) => ({ o, m: muurVanOpening(o, muren) }))
      .filter((x): x is { o: Opening; m: Muur } => !!x.m && x.m.soort === 'buiten' && (x.o.soort === 'schuifraam' || x.o.soort === 'buitendeur'));
    for (const { o, m } of buitenV) if (o.soort === 'schuifraam') legV(`terras_${o.id}`, 'tegel', '#b5b0a6', vlakV(o, m, AANLEG.terrasNaast, 0, AANLEG.terrasDiep), m);
    for (const { o, m } of buitenV) {
      if (o.soort !== 'buitendeur') continue;
      legV(`terras_${o.id}`, 'tegel', '#b5b0a6', vlakV(o, m, AANLEG.stoepNaast, 0, AANLEG.stoepDiep), m);
      if (ruimte.get(m.plus ?? m.min ?? '')?.type === 'hal') legV(`pad_${o.id}`, 'grind', '#b9b1a0', vlakV(o, m, AANLEG.padNaast, AANLEG.stoepDiep, AANLEG.padLang - AANLEG.stoepDiep), m);
    }
    return uit;
  }
  const buiten = p.openingen
    .map((o) => ({ o, m: muurVanOpening(o, muren) }))
    .filter((x): x is { o: Opening; m: Muur } => !!x.m && x.m.soort === 'buiten' && (x.o.soort === 'schuifraam' || x.o.soort === 'buitendeur'));
  // Eerst de terrassen (het grootste vlak), dan stoepen en paden: wat later komt, wijkt voor wat er al ligt.
  for (const { o, m } of buiten) if (o.soort === 'schuifraam') leg(`terras_${o.id}`, 'tegel', '#b5b0a6', vlak(o, m, AANLEG.terrasNaast, 0, AANLEG.terrasDiep));
  for (const { o, m } of buiten) {
    if (o.soort !== 'buitendeur') continue;
    const voordeur = ruimte.get(m.plus ?? m.min ?? '')?.type === 'hal';
    leg(`terras_${o.id}`, 'tegel', '#b5b0a6', vlak(o, m, AANLEG.stoepNaast, 0, AANLEG.stoepDiep));
    if (voordeur) leg(`pad_${o.id}`, 'grind', '#b9b1a0', vlak(o, m, AANLEG.padNaast, AANLEG.stoepDiep, AANLEG.padLang - AANLEG.stoepDiep));
  }
  return uit;
}

/** Eén verdieping (vloer op y = 0). */
/**
 * Eén ruimte van binnen (ronde 12): alleen haar vloer, haar muren (niet die aan de kanten in `open`), de ramen en deuren
 * erin, haar plint en haar meubels. Zie `ruimteVanBinnen`.
 */
interface BinnenFilter { ruimte: string; open: GevelKant[] }

function niveau3D(plan: Plattegrond, cat: PlanCatalogus, opties: Plan3DOpties, zonderGaten: (r: Rechthoek) => Rechthoek[], n = 0, onderHellendDak = false, zonderGatenVorm: (v: Punt[]) => Punt[][] = (v) => [v], binnen?: BinnenFilter): Blok[] {
  const blokken: Blok[] = [];
  const muren = murenVan(plan);
  const H = plan.muurhoogte;
  const top = opties.laag ? Math.min(opties.laag, H) : H;
  const pleister = '#efeee9';
  const ruimte = new Map(plan.ruimtes.map((r) => [r.id, r]));
  // Bestaand en tegen de buren (ronde 11): neutraal. Zonder bestaande ruimte of buren is alles zoals vroeger.
  const oud = heeftBestaand(plan);
  const wandVan = (id?: string, m?: Muur): GevelAfwerking => {
    const r = id ? ruimte.get(id) : undefined;
    if (!r) return plan.gevel;
    if (r.bestaand === true) return { soort: 'gevel', kleur: NEUTRAAL.binnen };
    // Ronde 12: de accentmuur van de ruimte (de muren aan één kant) in haar eigen afwerking. Zonder: zoals vroeger.
    const w = cat.wanden[m && isAccent(r, m) ? r.accent!.wand : r.wand] ?? cat.wanden[r.wand];
    return w ? { soort: w.soort, kleur: w.kleur } : { soort: 'gevel' as BlokSoort, kleur: pleister };
  };
  const knip = (b: Blok): Blok | undefined => {
    if (b.y >= top) return undefined;
    return b.y + b.h > top ? { ...b, h: r2(top - b.y) } : b;
  };
  const voeg = (b: Blok | undefined, afsnijden = true) => {
    const k = b && (afsnijden ? knip(b) : b);
    if (k && k.b > 0.05 && k.h > 0.05 && k.d > 0.05) blokken.push(k);
  };

  // Vloeren (met trapgat). Een vrije vorm is een prisma met haar grondvlak; de textuur volgt haar langste muur.
  for (const r of plan.ruimtes) {
    if (binnen && r.id !== binnen.ruimte) continue;
    const v = r.bestaand === true ? { soort: 'gevel' as BlokSoort, kleur: NEUTRAAL.vloer } : cat.vloeren[r.vloer];
    for (const deel of delenVan(r)) {
      if (deel.omtrek) {
        const vorm = vormVanDeel(deel);
        for (const stuk of zonderGatenVorm(vorm)) voeg(grondPrisma(metDing(opties, `ruimte:${r.id}`, `vloer_${r.id}`), v?.soort ?? 'gevel', v?.kleur ?? '#cfccc4', stuk, 0, 1.5, { vlakRichting: vloerRichting(vorm) }));
        continue;
      }
      for (const s of zonderGaten(deel)) {
        voeg({ code: metDing(opties, `ruimte:${r.id}`, `vloer_${r.id}`), soort: v?.soort ?? 'gevel', vorm: 'blok', x: s.x, y: 0, z: s.y, b: s.b, h: 1.5, d: s.d, kleur: v?.kleur ?? '#cfccc4' });
      }
    }
  }

  // Gevelafwerking: per muurvlak (gevelontwerp) en een sokkel onderaan het gelijkvloers.
  // Eén ruimte van binnen (ronde 12): geen sokkel (je ziet de buitenkant niet; de naad op de sokkelhoogte liet tegen de
  // achtergrond een lijn van stipjes door).
  const sokkel = n === 0 && !binnen && plan.gevelOntwerp?.sokkel && plan.gevelOntwerp.sokkel.hoogte > 0 ? plan.gevelOntwerp.sokkel : undefined;
  const sokkelAfw = sokkel ? gevelAfwerking(plan, cat, sokkel) : undefined;
  /** Een bestaande muur of een muur tegen de buren: neutraal, zonder sokkel. */
  const neutraal = (m: Muur) => (oud && m.soort === 'buiten' && muurStatus(plan, m) !== 'nieuw' ? buitenAfwerking(plan, cat, m) : undefined);
  const buitenAfw = (m: Muur, y: number) => neutraal(m) ?? (sokkel && sokkelAfw && y < sokkel.hoogte ? sokkelAfw : gevelAfwerking(plan, cat, gevelKeuzeVan(plan, m)));
  // Kopse kant op een buitenhoek: het materiaal van de gevel ernaast (de loodrechte buitenmuur die daar eindigt).
  const hoekMuur = (m: Muur, p: number) => muren.find((v) => v.as !== m.as && v.as !== 's' && v.soort === 'buiten' && gelijk(v.lijn, p) && (gelijk(v.van, m.lijn) || gelijk(v.tot, m.lijn)));

  // Muren met openingen.
  const muurAfw = new Map(muren.map((x) => [x.id, x]));
  for (const m of muren) {
    // Eén ruimte van binnen: alleen haar muren, niet die aan een open kant.
    const kantBinnen = binnen ? binnenKant(m, binnen.ruimte) : undefined;
    if (binnen && (!kantBinnen || binnen.open.includes(kantBinnen))) continue;
    const vlak = muurVlak(m, muren);
    const plusWand = wandVan(m.plus, m), minWand = wandVan(m.min, m);
    // Een schuine muur: begin en einde van haar grondvlak langs haar as.
    const langs = vlak.punten?.map((q) => opAs(m, q)[0]);
    const begin = langs ? Math.min(...langs) : m.as === 'h' ? vlak.x : vlak.y, einde = langs ? Math.max(...langs) : begin + (m.as === 'h' ? vlak.b : vlak.d);
    // Op een verdieping loopt de buitenmuur door voor de rand van de vloerplaat.
    const onderkant = n > 0 && m.soort === 'buiten' && !binnen ? -VLOERDIKTE : 0;
    const stuk = (code: string, a: number, b: number, y0: number, y1: number) => {
      // Eerst verlengen (ook onder een deur op de verdieping komt de rand van de vloerplaat), dan pas de maat controleren.
      if (m.soort === 'buiten' && y0 === 0 && onderkant < 0) y0 = onderkant;
      if (b - a < 0.1 || y1 - y0 < 0.1) return;
      // Sokkel: het stuk onder de sokkelhoogte apart, met het sokkelmateriaal buiten.
      if (m.soort === 'buiten' && sokkel && y0 < sokkel.hoogte - 0.1 && y1 > sokkel.hoogte + 0.1 && !neutraal(m)) {
        stuk(`${code}_sokkel`, a, b, y0, sokkel.hoogte);
        stuk(code, a, b, sokkel.hoogte, y1);
        return;
      }
      const buiten = m.soort === 'buiten' ? buitenAfw(m, y0) : undefined;
      if (m.as === 's') {
        // Schuine muur: haar grondvlak tussen a en b langs de as, als prisma; elke zijde haar eigen materiaal.
        const { d } = asVan(m);
        let [pts, rnd] = knipMetRanden<MuurRand>(vlak.punten!, vlak.randen!, -d[0], -d[1], -a, 'snede');
        [pts, rnd] = knipMetRanden(pts, rnd, d[0], d[1], b, 'snede');
        if (pts.length < 3) return;
        const plusAfw = m.plus || !buiten ? plusWand : buiten, minAfw = m.min || !buiten ? minWand : buiten;
        const afw = (r: MuurRand): GevelAfwerking | null => {
          if (r === 'min') return minAfw;
          if (r === 'plus') return plusAfw;
          if (r === 'snede') return binnen ? (binnen.ruimte === m.plus ? plusAfw : minAfw) : null;
          if (r === 'kop' || r === 'naad') return buiten ?? null;
          // De voortzetting van een zijde van de rechte muur op de hoek: het materiaal van die zijde.
          const R = muurAfw.get(r.muur);
          if (!R) return null;
          const ruimte = R[r.kant];
          return ruimte ? wandVan(ruimte, R) : R.soort === 'buiten' ? buitenAfw(R, y0) : null;
        };
        const top = onderHellendDak && buiten && y1 >= H - 0.1 ? { zijden: { 'y+': buiten } } : {};
        // Met `dingen`: een schuine buitenmuur hoort bij haar muurvlak, zoals een rechte (tik op de gevel in de 3D).
        voeg(grondPrisma(metDing(opties, binnen ? `ruimte:${binnen.ruimte}:${kantBinnen}` : m.soort === 'buiten' ? `gevel:${vlakSleutel(m)}` : undefined, code), 'gevel', pleister, pts, y0, y1 - y0, { randen: rnd.map(afw), ...top }));
        return;
      }
      // Binnenmuur die tot in het gevelvlak loopt (zie `Plan3DOpties.gevelkoppen`): de buitenmuur aan haar begin en einde.
      const kopIn = opties.gevelkoppen && m.soort === 'binnen' && m.as === 'h'
        ? [vlak.verlengdBegin && gelijk(a, begin) ? hoekMuur(m, m.van) : undefined, vlak.verlengdEinde && gelijk(b, einde) ? hoekMuur(m, m.tot) : undefined]
        : [];
      if (kopIn.some(Boolean) && sokkel && y0 < sokkel.hoogte - 0.1 && y1 > sokkel.hoogte + 0.1) {
        stuk(`${code}_sokkel`, a, b, y0, sokkel.hoogte);
        stuk(code, a, b, sokkel.hoogte, y1);
        return;
      }
      const zijden: Blok['zijden'] = m.as === 'h'
        ? { 'z+': m.plus || !buiten ? plusWand : buiten, 'z-': m.min || !buiten ? minWand : buiten }
        : { 'x+': m.plus || !buiten ? plusWand : buiten, 'x-': m.min || !buiten ? minWand : buiten };
      // Kopse kant waar de buitenmuur in een volgend stuk doorloopt (bv. waar een binnenmuur aansluit):
      // ook gevelmateriaal, anders schemert de witte snijkant als een haarlijn door de naad.
      if (buiten) {
        const [za, zb] = m.as === 'h' ? (['x-', 'x+'] as const) : (['z-', 'z+'] as const);
        if (gelijk(a, begin) && !vlak.verlengdBegin) zijden[za] = buiten;
        if (gelijk(b, einde) && !vlak.verlengdEinde) zijden[zb] = buiten;
      }
      // Kopse kant van een buitenmuur op een buitenhoek: gevelafwerking van de gevel ernaast.
      if (buiten && m.as === 'h') {
        const hoek = (p: number) => { const v = hoekMuur(m, p); return v ? buitenAfw(v, y0) : buiten; };
        if (vlak.verlengdBegin && gelijk(a, begin)) zijden['x-'] = hoek(m.van);
        if (vlak.verlengdEinde && gelijk(b, einde)) zijden['x+'] = hoek(m.tot);
      }
      if (kopIn[0]) zijden['x-'] = buitenAfw(kopIn[0], y0);
      if (kopIn[1]) zijden['x+'] = buitenAfw(kopIn[1], y0);
      // Eén ruimte van binnen (ronde 12): de kopse kanten tussen de stukken (naast een raam of deur) in de afwerking van de
      // ruimte; anders schemerde de lichte kop als een haarlijn door de naad tussen twee stukken (van boven tot onder).
      if (binnen) {
        const eigen = binnen.ruimte === m.plus ? plusWand : minWand;
        const [za, zb] = m.as === 'h' ? (['x-', 'x+'] as const) : (['z-', 'z+'] as const);
        if (!gelijk(a, begin)) zijden[za] = eigen;
        if (!gelijk(b, einde)) zijden[zb] = eigen;
      }
      // Op een verdieping begint de buitenmuur lager, voor de rand van de vloerplaat: daar ook een stukje gevel onder de kop.
      if (n > 0 && y0 === 0) {
        for (const [gevelMuur, x0] of [[kopIn[0], a], [kopIn[1], b - (kopIn[1]?.dikte ?? 0) / 2]] as const) {
          if (!gevelMuur) continue;
          const afw = buitenAfw(gevelMuur, -VLOERDIKTE);
          voeg({ code: `${code}_kop`, soort: afw.soort, vorm: 'blok', kleur: afw.kleur, voeg: afw.voeg, x: x0, y: -VLOERDIKTE, z: vlak.y, b: gevelMuur.dikte / 2, h: VLOERDIKTE, d: vlak.d });
        }
      }
      // Onder een hellend dak staat op de muurkop nog een stuk gevel (topgevel): de kop krijgt dan ook gevelmateriaal,
      // anders schemert zijn witte bovenkant als een stippellijn door de naad.
      if (onderHellendDak && buiten && y1 >= H - 0.1) zijden['y+'] = buiten;
      const base = { code: metDing(opties, binnen ? `ruimte:${binnen.ruimte}:${kantBinnen}` : m.soort === 'buiten' ? `gevel:${vlakSleutel(m)}` : undefined, code), soort: 'gevel' as BlokSoort, vorm: 'blok' as const, kleur: pleister, zijden, y: y0, h: y1 - y0 };
      voeg(m.as === 'h' ? { ...base, x: a, z: vlak.y, b: b - a, d: vlak.d } : { ...base, x: vlak.x, z: a, b: vlak.b, d: b - a });
    };
    const openingen = plan.openingen.filter((o) => muurVanOpening(o, [m]) === m).sort((a, b) => a.midden - b.midden);
    let cursor = begin;
    for (const o of openingen) {
      const a = o.midden - o.breedte / 2, b = o.midden + o.breedte / 2;
      stuk(`muur_${m.id}_${cursor}`, cursor, a, 0, H);
      const inhoud = opties.inhoud?.(o);
      const hoogte = inhoud?.hoogte ?? (o.soort === 'doorgang' ? o.hoogte : o.hoogte + 4);
      // Vensterbank of dorpel: de muur eronder stopt onder de dunste ervan. Anders vallen de bovenvlakken van
      // muur en vensterbank samen en flikkert de vensterbank in witte en donkere strepen.
      const dorpels = (inhoud?.blokken ?? []).filter((x) => (x.code === 'vensterbank' || x.code === 'dorpel') && x.y < 0).map((x) => -x.y);
      stuk(`onder_${o.id}`, a, b, 0, o.borstwering - (dorpels.length ? Math.min(...dorpels) : 0));
      stuk(`boven_${o.id}`, a, b, Math.min(H, o.borstwering + hoogte), H);
      const raam = openingBlokken(o, m, inhoud, cat);
      // Ronde 15: het glas licht 's avonds op (`verlichting`).
      for (const blok of opties.verlichting ? raamLicht(raam, plan, m, o) : raam) voeg(o.positie ? { ...blok, code: metDing(opties, `opening:${o.id}`, blok.code) } : blok);
      cursor = b;
    }
    stuk(`muur_${m.id}_eind`, cursor, einde, 0, H);
  }

  // Plinten (ronde 12): een lijst vóór de binnenkant van de muren, alleen in een ruimte met een plint.
  if (cat.plinten) {
    for (const r of plan.ruimtes) {
      if (!r.plint || (binnen && r.id !== binnen.ruimte)) continue;
      for (const b of plintBlokken(plan, cat, r, muren, { open: binnen?.open, code: (c) => metDing(opties, `ruimte:${r.id}`, c) })) voeg(b);
    }
  }

  // Losse wanden (ronde 2d): op hun eigen hoogte, in hun afwerking; ze delen niets op. Met `dingen`: het ding `wand:<id>`.
  for (const w of plan.losseWanden ?? []) {
    if (binnen && losseWandRuimte(plan, w)?.id !== binnen.ruimte) continue;
    for (const b of losseWandBlokken(plan, cat, w, muren)) voeg({ ...b, code: metDing(opties, `wand:${w.id}`, b.code) });
  }

  // Meubels.
  if (opties.meubels !== false) {
    for (const mb of plan.meubels) {
      const t = cat.meubels[mb.type];
      if (!t) continue;
      if (binnen && !meubelIn(ruimte.get(binnen.ruimte)!, mb)) continue;
      // Een trap loopt altijd tot de vloer van de verdieping erboven.
      for (const b of meubelIn3D(mb, mb.type === 'trap' ? { ...t, h: H + VLOERDIKTE } : t)) voeg({ ...b, code: metDing(opties, `meubel:${mb.id}`, b.code), y: b.y + 1.5 }, false);
    }
  }
  return blokken;
}

/**
 * Het gat dat een opening in een strook op de gevel maakt (ronde 14), zoals in de muur zelf (`niveau3D`): van onder de
 * dunste dorpel of vensterbank tot boven de zonweringskast. Anders vallen bovenvlak van de dorpel en de strook samen.
 */
function muurUitsparing(opties: Plan3DOpties): (o: Opening) => [number, number] {
  return (o) => {
    const inhoud = opties.inhoud?.(o);
    const hoogte = inhoud?.hoogte ?? (o.soort === 'doorgang' ? o.hoogte : o.hoogte + 4);
    const dorpels = (inhoud?.blokken ?? []).filter((x) => (x.code === 'vensterbank' || x.code === 'dorpel') && x.y < 0).map((x) => -x.y);
    return [o.borstwering - (dorpels.length ? Math.min(...dorpels) : 0), o.borstwering + hoogte];
  };
}

/** Raam, deur of doorgang op de juiste plaats en in de juiste richting in de muur. */
function openingBlokken(o: Opening, m: Muur, inhoud: OpeningInhoud | undefined, cat: PlanCatalogus): Blok[] {
  if (m.as === 's') {
    // Schuine muur: zoals in een staande muur op dezelfde lijn (die heeft d = (0, 1) en n = (1, 0)), en dan gedraaid tot
    // n en d van de schuine muur, rond de oorsprong.
    const { n } = asVan(m);
    return draaiBlokken(openingBlokken({ ...o, as: 'v' }, { ...m, as: 'v' }, inhoud, cat), Math.atan2(n[1], n[0]) * GRAAD);
  }
  const a = o.midden - o.breedte / 2, b = o.midden + o.breedte / 2;
  const half = m.dikte / 2;
  if (o.soort === 'doorgang') return [];
  if (o.soort === 'binnendeur' || !inhoud) {
    // Lokaal: x langs de muur, z van de min-kant (0) naar de plus-kant (dikte).
    const lokaal = binnendeurBlokken(o, m.dikte, cat, m.as === 'v');
    return m.as === 'h'
      ? plaatsBlokken(lokaal, { x: a, z: m.lijn - half, y: o.borstwering })
      : plaatsBlokken(lokaal, { x: m.lijn - half, z: b, y: o.borstwering, draai: 270 });
  }
  // Buitenmuur: het kader staat 10 cm achter de buitenkant van de muur.
  const buitenIsMin = m.soort === 'binnen' ? !o.naarPlus : !m.min;
  const y = o.borstwering;
  if (m.as === 'h') {
    return buitenIsMin
      ? plaatsBlokken(inhoud.blokken, { x: a, z: m.lijn - half + 10, y })
      : plaatsBlokken(inhoud.blokken, { x: b, z: m.lijn + half - 10, y, draai: 180 });
  }
  return buitenIsMin
    ? plaatsBlokken(inhoud.blokken, { x: m.lijn - half + 10, z: b, y, draai: 270 })
    : plaatsBlokken(inhoud.blokken, { x: m.lijn + half - 10, z: a, y, draai: 90 });
}

/** Binnendeur in lokale coördinaten: kader in de muur, deurblad 90° open naar de draaikant. */
function binnendeurBlokken(o: Opening, dikte: number, cat: PlanCatalogus, omgekeerd: boolean): Blok[] {
  const t = cat.binnendeuren[o.deurtype ?? ''] ?? { label: '', soort: 'kunststof' as BlokSoort, kleur: '#f3f2ee' };
  const B = o.breedte, H = o.hoogte, k = 4;
  const uit: Blok[] = [];
  const blok = (code: string, soort: BlokSoort, x: number, y: number, z: number, b: number, h: number, d: number, kleur: string) =>
    uit.push({ code: `${code}_${o.id}`, soort, vorm: 'blok', x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d), kleur });
  const kader = t.soort === 'metaal' ? '#2a2a2a' : '#f3f2ee';
  blok('kader_l', 'kunststof', 0, 0, -1, k, H + k, dikte + 2, kader);
  blok('kader_r', 'kunststof', B - k, 0, -1, k, H + k, dikte + 2, kader);
  blok('kader_b', 'kunststof', k, H, -1, B - 2 * k, k, dikte + 2, kader);
  if (o.deurtype === 'schuif') {
    // Schuifdeur in de wand: blad half in de muur geschoven.
    blok('blad', t.soort, -B * 0.45, 0, dikte / 2 - 2, B - 2 * k, H - 1, 4, t.kleur);
    return uit;
  }
  // Scharnier: lokaal x = 0 is het begin van de muur bij een h-muur; bij een v-muur is dat omgekeerd.
  const scharnierBijNul = (o.scharnier === 'begin') !== omgekeerd;
  const bladB = B - 2 * k;
  const x = scharnierBijNul ? k : B - k - 4;
  const z = o.naarPlus ? dikte : -bladB;
  if (t.soort === 'glas') {
    blok('blad', 'glas', x + 0.5, 0.5, z, 3, H - 1.5, bladB, '#c5d5da');
    blok('blad_rand', 'metaal', x, 0.5, z, 4, 3, bladB, '#2a2a2a');
  } else {
    blok('blad', t.soort, x, 0.5, z, 4, H - 1.5, bladB, t.kleur);
  }
  const kz = o.naarPlus ? dikte + bladB - 10 : -bladB + 6;
  blok('klink', 'metaal', scharnierBijNul ? x + 4 : x - 2, 100, kz, 2, 2, 4, '#b9b9b4');
  return uit;
}

// ---------- meubels ----------

/** Meubel als blokken in de wereld (gedraaid en op zijn plaats). */
export function meubelIn3D(m: Meubel, t: MeubelType): Blok[] {
  const lokaal = meubelBlokken(t.vorm, m.b, m.d, t.h, m.kleur ?? t.kleur).map((b) => ({ ...b, code: `${m.id}_${b.code}` }));
  const verschuif: Record<number, [number, number]> = { 0: [0, 0], 90: [m.d, 0], 180: [m.b, m.d], 270: [0, m.b] };
  const [dx, dz] = verschuif[m.rotatie] ?? [0, 0];
  return plaatsBlokken(lokaal, { x: m.x + dx, z: m.y + dz, draai: m.rotatie });
}

/** Voetafdruk van een meubel op de plattegrond (na draaien). */
export function meubelVoetafdruk(m: Meubel): { x: number; y: number; b: number; d: number } {
  const gedraaid = m.rotatie === 90 || m.rotatie === 270;
  return { x: m.x, y: m.y, b: gedraaid ? m.d : m.b, d: gedraaid ? m.b : m.d };
}

function donker(hex: string, f = 0.75): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('')}`;
}

/** Eenvoudige meubelvormen in lokale coördinaten (voorkant = z groot). */
export function meubelBlokken(vorm: MeubelVorm, B: number, D: number, H: number, kleur: string): Blok[] {
  const uit: Blok[] = [];
  const blok = (code: string, soort: BlokSoort, x: number, y: number, z: number, b: number, h: number, d: number, k: string, extra: Partial<Blok> = {}) => {
    if (b > 0.05 && h > 0.05 && d > 0.05) uit.push({ code, soort, vorm: 'blok', x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d), kleur: k, ...extra });
  };
  const poten = (soort: BlokSoort, k: string, h: number, inspring = 4, dikte = 5) => {
    for (const [x, z] of [[inspring, inspring], [B - inspring - dikte, inspring], [inspring, D - inspring - dikte], [B - inspring - dikte, D - inspring - dikte]] as const)
      blok(`poot_${x}_${z}`, soort, x, 0, z, dikte, h, dikte, k);
  };
  const wit = '#f4f4f1', eik = '#b48a5a', zwart = '#2a2a2a';
  switch (vorm) {
    case 'bank':
    case 'fauteuil': {
      const arm = Math.min(18, B * 0.15), rug = Math.min(20, D * 0.22);
      poten('hout', eik, 10, 6, 4);
      blok('onderstel', 'stof', 0, 10, 0, B, 30, D, kleur, { afronding: 3 });
      blok('rug', 'stof', 0, 10, 0, B, H - 10, rug, kleur, { afronding: 6 });
      blok('arm_l', 'stof', 0, 10, 0, arm, 52, D, kleur, { afronding: 6 });
      blok('arm_r', 'stof', B - arm, 10, 0, arm, 52, D, kleur, { afronding: 6 });
      const n = vorm === 'fauteuil' ? 1 : Math.max(2, Math.round((B - 2 * arm) / 80));
      const kb = (B - 2 * arm) / n;
      for (let i = 0; i < n; i++) {
        blok(`zit${i}`, 'kussen', arm + i * kb + 0.5, 40, rug, kb - 1, 12, D - rug - 2, kleur, { afronding: 5 });
        blok(`rugkussen${i}`, 'kussen', arm + i * kb + 0.5, 50, rug - 2, kb - 1, H - 55, 14, kleur, { afronding: 6, kantel: { graden: 8, richting: 'z-' } });
      }
      break;
    }
    case 'tafel':
      blok('blad', 'hout', 0, H - 4, 0, B, 4, D, kleur);
      poten('metaal', zwart, H - 4, 6, 5);
      break;
    case 'stoel':
      blok('zit', 'hout', 0, 44, 0, B, 4, D, kleur);
      blok('rug', 'hout', 0, 48, 0, B, H - 48, 4, kleur);
      poten('metaal', zwart, 44, 2, 3);
      break;
    case 'bed': {
      blok('kader', 'stof', 0, 10, 0, B, 25, D, kleur, { afronding: 2 });
      blok('hoofdbord', 'stof', 0, 10, 0, B, H - 10, 8, kleur, { afronding: 3 });
      blok('matras', 'kussen', 3, 35, 9, B - 6, 20, D - 12, wit, { afronding: 4 });
      blok('dekbed', 'stof', 2, 50, D * 0.38, B - 4, 7, D * 0.62 - 2, '#d9d4c9', { afronding: 3 });
      const n = B > 120 ? 2 : 1;
      for (let i = 0; i < n; i++) blok(`kussen${i}`, 'kussen', 8 + (i * (B - 16)) / n, 55, 12, (B - 16) / n - 4, 12, 35, wit, { afronding: 5 });
      poten('hout', eik, 10, 5, 5);
      break;
    }
    case 'nachtkast':
      blok('kast', 'hout', 0, 0, 0, B, H, D, kleur);
      blok('lade', 'donker', 2, H - 14, D, B - 4, 1, 0.3, donker(kleur));
      break;
    case 'kast': {
      blok('kast', 'kunststof', 0, 0, 0, B, H, D, kleur);
      const deuren = Math.max(1, Math.round(B / 50));
      for (let i = 1; i < deuren; i++) blok(`naad${i}`, 'donker', (i * B) / deuren - 0.3, 2, D, 0.6, H - 4, 0.3, donker(kleur, 0.6));
      for (let i = 0; i < deuren; i++) blok(`greep${i}`, 'metaal', (i + 0.5) * (B / deuren) + (i % 2 ? -B / deuren / 2 + 4 : B / deuren / 2 - 6), H / 2 - 15, D, 2, 30, 2, '#9a9a96');
      break;
    }
    case 'keuken': {
      blok('plint', 'donker', 0, 0, 0, B, 10, D - 5, '#2b2b2b');
      blok('onderkasten', 'kunststof', 0, 10, 0, B, 76, D - 2, kleur);
      blok('werkblad', 'gevel', 0, 86, 0, B, 4, D + 2, '#e6e3dc');
      const kasten = Math.max(1, Math.round(B / 60));
      for (let i = 1; i < kasten; i++) blok(`naad${i}`, 'donker', (i * B) / kasten - 0.3, 12, D - 2, 0.6, 72, 0.3, donker(kleur, 0.6));
      blok('kookplaat', 'donker', B * 0.2, 90, 6, 60, 0.6, 50, '#151515');
      blok('spoelbak', 'metaal', B * 0.62, 88.5, 8, 50, 2, 40, '#b9bcbd');
      blok('kraan', 'metaal', B * 0.62 + 23, 90, 3, 4, 30, 4, '#b9bcbd', { vorm: 'cilinder' });
      blok('bovenkasten', 'kunststof', 0, 150, 0, B, 70, 35, kleur);
      for (let i = 1; i < kasten; i++) blok(`bnaad${i}`, 'donker', (i * B) / kasten - 0.3, 152, 35, 0.6, 66, 0.3, donker(kleur, 0.6));
      break;
    }
    case 'eiland':
      blok('plint', 'donker', 5, 0, 5, B - 10, 10, D - 10, '#2b2b2b');
      blok('kasten', 'kunststof', 0, 10, 0, B, 76, D - 25, kleur);
      blok('werkblad', 'gevel', 0, 86, 0, B, 4, D, '#e6e3dc');
      break;
    case 'koelkast':
      blok('kolom', 'kunststof', 0, 0, 0, B, H, D, kleur);
      blok('naad', 'donker', 1, H * 0.62, D, B - 2, 0.6, 0.3, donker(kleur, 0.6));
      blok('greep', 'metaal', B - 6, H * 0.65, D, 2, 40, 2, '#9a9a96');
      break;
    case 'bad':
      blok('bad', 'gevel', 0, 0, 0, B, H, D, wit, { afronding: 4 });
      blok('water', 'glas', 6, H - 6, 6, B - 12, 2, D - 12, '#9cc6d6');
      blok('kraan', 'metaal', B / 2 - 2, H, 1, 4, 14, 4, '#b9bcbd', { vorm: 'cilinder' });
      break;
    case 'douche':
      blok('bak', 'gevel', 0, 0, 0, B, 4, D, wit);
      blok('wand', 'glas', B - 1, 4, 0, 1, H - 4, D * 0.7, '#c5d5da');
      blok('stang', 'metaal', B / 2 - 1, 4, 2, 2, H - 20, 2, '#b9bcbd', { vorm: 'cilinder' });
      blok('kop', 'metaal', B / 2 - 10, H - 18, 3, 20, 2, 20, '#b9bcbd');
      break;
    case 'wc':
      blok('reservoir', 'gevel', 4, 40, 0, B - 8, 40, 16, wit, { afronding: 3 });
      blok('pot', 'gevel', 4, 0, 14, B - 8, 40, D - 14, wit, { afronding: 8 });
      blok('bril', 'gevel', 3, 40, 16, B - 6, 3, D - 17, wit, { afronding: 8 });
      break;
    case 'lavabo':
      blok('meubel', 'hout', 0, 50, 0, B, 35, D, kleur);
      blok('wastafel', 'gevel', 0, 85, 0, B, 5, D + 1, wit);
      blok('kraan', 'metaal', B / 2 - 2, 90, 4, 4, 20, 4, '#b9bcbd', { vorm: 'cilinder' });
      blok('spiegel', 'glas', 4, 110, 0, B - 8, 70, 1.5, '#dfe8ea');
      break;
    case 'tv':
      blok('meubel', 'hout', 0, 0, 0, B, 45, D, kleur);
      blok('scherm', 'donker', B * 0.15, 70, D / 2 - 2, B * 0.7, 75, 3, '#111111');
      blok('voet', 'metaal', B / 2 - 15, 45, D / 2 - 10, 30, 25, 4, '#333333');
      break;
    case 'plant':
      blok('pot', 'donker', B / 2 - 18, 0, D / 2 - 18, 36, 40, 36, '#3b3a37', { vorm: 'cilinder', taps: 0.8 });
      blok('blad', 'stof', B / 2 - 30, 40, D / 2 - 30, 60, H - 40, 60, kleur, { vorm: 'bol' });
      break;
    case 'tapijt':
      blok('tapijt', 'stof', 0, 0, 0, B, 1, D, kleur);
      break;
    case 'trap': {
      // Rechte trap: loopt op van voor (z = D) naar achter (z = 0), tot de vloer erboven.
      const n = Math.max(8, Math.round(H / 18));
      const op = H / n, aan = D / n;
      for (let i = 0; i < n; i++) blok(`trede${i}`, 'hout', 0, i * op, D - (i + 1) * aan, B, op, aan + 2, kleur);
      blok('paal', 'metaal', B - 4, 0, D - 4, 4, 95, 4, '#2a2a2a');
      break;
    }
  }
  return uit;
}

// ---------- afstanden (maatvoering bij plaatsen en verslepen) ----------

/** Dikte van de dwarsmuur op een punt van een muur (0 als er geen is). */
function dwarsDikte(m: Muur, p: number, muren: Muur[]): number {
  const loodrecht = muren.filter((x) => x.as !== m.as && x.as !== 's' && gelijk(x.lijn, p) && x.van <= m.lijn + 0.5 && x.tot >= m.lijn - 0.5);
  return loodrecht.length ? Math.max(...loodrecht.map((x) => x.dikte)) : 0;
}

export interface OpeningAfstanden {
  muur: Muur;
  /** Binnenvlak van de dwarsmuur aan het begin en het einde van de muur (coördinaat langs de muur). */
  vlakBegin: number;
  vlakEinde: number;
  /** Vrije muur tussen het binnenvlak en de opening, aan het begin en aan het einde (cm). */
  begin: number;
  einde: number;
  /** Kettingmaat langs de muur: binnenvlak, randen van alle openingen in die muur, binnenvlak. */
  ketting: number[];
  /** Ligt de ruimte (binnenkant) aan de plus-kant van de muur? */
  binnenPlus: boolean;
}

/** Afstanden van een opening tot de muren en de andere openingen in dezelfde muur. */
export function openingAfstanden(plan: Plattegrond, o: Opening, muren = murenVan(niveauPlan(plan, niveauVan(o)))): OpeningAfstanden | undefined {
  const m = muurVanOpening(o, muren);
  if (!m) return undefined;
  const binnenPlus = m.soort === 'buiten' ? !!m.plus : o.naarPlus;
  let vlakBegin = m.van + dwarsDikte(m, m.van, muren) / 2, vlakEinde = m.tot - dwarsDikte(m, m.tot, muren) / 2;
  if (m.as === 's') {
    // Schuine muur: het binnenvlak loopt van hoek tot hoek in haar grondvlak (de zijde aan de kant van de ruimte), en stopt
    // eerder waar een andere muur er aan de binnenkant op uitkomt (zoals de dwarsmuur bij een rechte muur).
    const v = muurVlak(m, muren), i = v.randen!.indexOf(binnenPlus ? 'plus' : 'min');
    const s1 = opAs(m, v.punten![i]!)[0], s2 = opAs(m, v.punten![(i + 1) % v.punten!.length]!)[0];
    [vlakBegin, vlakEinde] = [Math.min(s1, s2), Math.max(s1, s2)];
    const { d } = asVan(m), binnenLijn = langsAs(m, 0, m.lijn + ((binnenPlus ? 1 : -1) * m.dikte) / 2);
    for (const [p, isBegin] of [[m.van, true], [m.tot, false]] as const) {
      const P = langsAs(m, p, m.lijn);
      for (const x of muren) {
        if (x === m || (x.as === 's' && gelijk(x.lijn, m.lijn) && Math.abs(x.richting![0] * d[1] - x.richting![1] * d[0]) < 1e-3)) continue;
        const [t, w] = opAs(x, P);
        if (!gelijk(w, x.lijn) || t < x.van - 0.5 || t > x.tot + 0.5) continue;
        const ax = asVan(x);
        if (Math.abs(ax.d[0] * d[1] - ax.d[1] * d[0]) < 1e-3) continue;
        // Het vlak van die muur aan de kant van deze muur.
        const naarLijf: Punt = isBegin ? d : [-d[0], -d[1]];
        const kant = naarLijf[0] * ax.n[0] + naarLijf[1] * ax.n[1] > 0 ? 1 : -1;
        const q = snijpunt(binnenLijn, d, langsAs(x, 0, x.lijn + (kant * x.dikte) / 2), ax.d);
        // Alleen als het binnenvlak die muur ook echt raakt (niet het stuk ernaast, bv. een dikkere buitenmuur voorbij de hoek).
        if (!q) continue;
        const tq = opAs(x, q)[0];
        if (tq < x.van - 0.5 || tq > x.tot + 0.5) continue;
        const sq = q[0] * d[0] + q[1] * d[1];
        if (isBegin) vlakBegin = Math.max(vlakBegin, sq); else vlakEinde = Math.min(vlakEinde, sq);
      }
    }
  } else {
    // Een rechte muur die op een schuine muur uitkomt: tot waar haar binnenvlak het vlak van die muur raakt.
    for (const [p, isBegin] of [[m.van, true], [m.tot, false]] as const) {
      if (dwarsDikte(m, p, muren)) continue;
      const tot = binnenTotSchuin(m, p, isBegin, binnenPlus, muren);
      if (tot !== undefined) { if (isBegin) vlakBegin = tot; else vlakEinde = tot; }
    }
  }
  const a = o.midden - o.breedte / 2, b = o.midden + o.breedte / 2;
  const anderen = plan.openingen.filter((x) => x.id !== o.id && niveauVan(x) === niveauVan(o) && muurVanOpening(x, [m]) === m);
  const punten = [vlakBegin, vlakEinde, a, b, ...anderen.flatMap((x) => [x.midden - x.breedte / 2, x.midden + x.breedte / 2])]
    .map((x) => Math.round(x * 10) / 10).filter((x, i, l) => l.indexOf(x) === i).sort((p, q) => p - q);
  return { muur: m, vlakBegin, vlakEinde, begin: a - vlakBegin, einde: vlakEinde - b, ketting: punten, binnenPlus };
}

export interface MeubelAfstanden {
  /** Binnenvlakken van de ruimte rond het meubel. */
  x0: number; x1: number; y0: number; y1: number;
  links: number; rechts: number; boven: number; onder: number;
}

/** Afstanden van een meubel tot de binnenvlakken van de muren van de ruimte waarin het staat. */
export function meubelAfstanden(plan: Plattegrond, m: Meubel, muren = murenVan(niveauPlan(plan, niveauVan(m)))): MeubelAfstanden | undefined {
  const v = meubelVoetafdruk(m);
  const cx = v.x + v.b / 2, cy = v.y + v.d / 2;
  const r = ruimteOp(plan, cx, cy, niveauVan(m));
  if (!r) return undefined;
  const deel = delenVan(r).find((p) => binnen(p, cx, cy)) ?? delenVan(r)[0]!;
  if (deel.omtrek) {
    // Vrije vorm: vanuit het midden van het meubel recht naar links, rechts, boven en onder tot het binnenvlak van de muren
    // (bij een schuine muur dus niet loodrecht op die muur gemeten).
    const w = binnenVorm(vormVanDeel(deel), muren);
    const snij = (i: 0 | 1, lijn: number) => w.flatMap((q, k) => {
      const z = w[(k + 1) % w.length]!;
      if ((q[i] - lijn) * (z[i] - lijn) > 0 || q[i] === z[i]) return [];
      return [q[1 - i]! + ((lijn - q[i]) / (z[i] - q[i])) * (z[1 - i]! - q[1 - i]!)];
    });
    const hor = snij(1, cy), ver = snij(0, cx);
    if (!hor.length || !ver.length) return undefined;
    const x0 = Math.max(...hor.filter((x) => x <= v.x + 0.01), Math.min(...hor)), x1 = Math.min(...hor.filter((x) => x >= v.x + v.b - 0.01), Math.max(...hor));
    const y0 = Math.max(...ver.filter((y) => y <= v.y + 0.01), Math.min(...ver)), y1 = Math.min(...ver.filter((y) => y >= v.y + v.d - 0.01), Math.max(...ver));
    return { x0, x1, y0, y1, links: v.x - x0, rechts: x1 - (v.x + v.b), boven: v.y - y0, onder: y1 - (v.y + v.d) };
  }
  const dikte = (as: 'h' | 'v', lijn: number, van: number, tot: number) => {
    const op = muren.filter((x) => x.as === as && gelijk(x.lijn, lijn) && x.tot > van + 0.5 && x.van < tot - 0.5);
    return op.length ? Math.max(...op.map((x) => x.dikte)) : 0;
  };
  const x0 = deel.x + dikte('v', deel.x, v.y, v.y + v.d) / 2, x1 = deel.x + deel.b - dikte('v', deel.x + deel.b, v.y, v.y + v.d) / 2;
  const y0 = deel.y + dikte('h', deel.y, v.x, v.x + v.b) / 2, y1 = deel.y + deel.d - dikte('h', deel.y + deel.d, v.x, v.x + v.b) / 2;
  return { x0, x1, y0, y1, links: v.x - x0, rechts: x1 - (v.x + v.b), boven: v.y - y0, onder: y1 - (v.y + v.d) };
}
