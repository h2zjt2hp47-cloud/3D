/**
 * Techniek voor de installateur (ronde 10, 16/11/2026): wat een installateur in een woning plaatst, als gegevens in het
 * plan. Alles valt in twee soorten (zie docs/analyse-bouw-3d-voor-klanten.md, hoofdstuk 11):
 *   - **toestellen**: een ding op een plaats (tellerkast, stopcontact, lichtpunt, airco, warmtepomp, boiler, ventilatie-
 *     unit, mond …), met een type uit de catalogus, een plaats op het plan, een hoogte, een draaiing en waar het aan hangt;
 *   - **leidingen**: een lijn van A naar B (kabel, koelleiding, aanvoer en retour, lussen vloerverwarming, gas, kanaal,
 *     warm en koud water, afvoer, regenwater), met een soort, een diameter, punten op het plan en een hoogte.
 *
 * Dit bestand is zuiver: de soorten gegevens, de vormen in 3D, het verloop van een leiding en de telling. Het kent de
 * plattegrond alleen als soort (geen functies), zodat `plattegrond.ts` het kan gebruiken zonder kringverwijzing. Plaatsen
 * tegen een wand, een leiding langs de wanden en de technische ruimte staan in `techniekplaatsen.ts`; de 3D van de
 * woning (`plattegrond3D`, optie `techniek`), de controles (`controleerPlan`) en de tekening (`tekenPlattegrond`, optie
 * `techniek`) lezen dit.
 *
 * **Toont en telt, rekent niet.** Geen vermogen, debiet of diameter wordt berekend en niets wordt aan een regel getoetst:
 * de installateur dimensioneert (`TECHNIEK_VOORBEHOUD`, op elk blad en scherm). Alle maten en hoogtes in de catalogus
 * zijn richtwaarden met hun herkomst (`nagelezen: false`).
 */
import type { OpbouwHerkomst } from './opbouw.js';
import type { Plattegrond, Punt } from './plattegrond.js';
import type { Richtwaarde } from './richtwaarde.js';
import type { Blok, BlokSoort } from './ruimtelijk.js';

/** De vaste zin bij alles over techniek: op elk blad en elk scherm mee te tonen. */
export const TECHNIEK_VOORBEHOUD = 'De installateur dimensioneert; dit is geen berekening en geen controle op de regels.';

/** De vakken van de installateur. Zonwering hoort er niet bij: die zit al bij de ramen. */
export type TechniekVak = 'elektriciteit' | 'klimaat' | 'ventilatie' | 'sanitair';

/** Naam en kleur per vak (de kleur van de tekens in de tekening). */
export const TECHNIEK_VAKKEN: Record<TechniekVak, { label: string; kleur: string }> = {
  elektriciteit: { label: 'Elektriciteit', kleur: '#6a2fa0' },
  klimaat: { label: 'Koeling en verwarming', kleur: '#a33a26' },
  ventilatie: { label: 'Ventilatie', kleur: '#3f7a22' },
  sanitair: { label: 'Sanitair', kleur: '#1d5fa8' },
};

/** Alle vakken, in de vaste volgorde (tekening, telling, 3D). */
export const ALLE_VAKKEN: TechniekVak[] = ['elektriciteit', 'klimaat', 'ventilatie', 'sanitair'];

/**
 * De vakken in de woorden van de klant (ronde 10c, 17/11): wat de klant te zien krijgt in het bestand voor de klant, de
 * klantweergave en het blad. De namen van `TECHNIEK_VAKKEN` blijven voor de verkoper en de installateur (palet, telling,
 * posten). Dezelfde kleur als het vak.
 */
export const TECHNIEK_KLANT_VAKKEN: Record<TechniekVak, { naam: string; uitleg: string }> = {
  elektriciteit: { naam: 'Elektriciteit', uitleg: 'Stopcontacten, schakelaars, licht en de kabels ernaartoe.' },
  klimaat: { naam: 'Verwarming en koeling', uitleg: 'Wat de woning verwarmt of koelt (bijvoorbeeld een warmtepomp, airco, vloerverwarming of radiatoren) en de buizen ertussen.' },
  ventilatie: { naam: 'Ventilatie', uitleg: 'Verse lucht in de woning, vochtige lucht eruit.' },
  sanitair: { naam: 'Water en afvoer', uitleg: 'Het water in de woning (warm, koud, eventueel regenwater) en de afvoer naar de riolering.' },
};

/** Hoe de klant een toestel of een soort leiding noemt, en wat het is in één gewone zin (ronde 10c). */
export interface KlantWoorden {
  naam: string;
  uitleg: string;
}

/**
 * Waar een toestel aan hangt: aan een wand (binnen of op de gevel), aan het plafond, op de vloer, buiten op de grond
 * (een buitenunit naast de woning) of op en door het dak (een dakdoorvoer, alleen op een plat dak juist getekend).
 */
export type Bevestiging = 'wand' | 'plafond' | 'vloer' | 'buiten' | 'dak';

/**
 * Het teken in de tekening. Voor elektriciteit zo dicht mogelijk bij de gewoonte van het vak (te bevestigen naast de
 * lijst van Volta, zie docs/onderzoek-bouw-constructies.md 5.3): lichtpunt = kruisje, armatuur = cirkel met kruis,
 * stopcontact = halve cirkel met een streepje naar de muur en een dwarsstreep voor de aarding, schakelaar = rondje met
 * een schuin streepje en een haakje, verdeelbord = rechthoek half gevuld. De andere vakken hebben geen vaste tekens:
 * een kader of cirkel op ware grootte met een afkorting, een radiator met ribben, een mond met een pijl (toevoer naar
 * binnen, afvoer naar buiten), een rooster met lamellen.
 */
export type ToestelTeken =
  | 'lichtpunt' | 'armatuur' | 'spot' | 'wandlamp' | 'stopcontact' | 'schakelaar' | 'datapunt' | 'thermostaat'
  | 'verdeelbord' | 'kader' | 'rond' | 'radiator' | 'toevoermond' | 'afvoermond' | 'rooster' | 'doorvoer' | 'kraan';

/** De vorm in 3D, uit eenvoudige blokken (zie `toestelVorm`). */
export type ToestelVorm =
  | 'kast' | 'stopcontact' | 'schakelaar' | 'plaatje' | 'lichtpunt' | 'spot' | 'pendel' | 'wandlamp' | 'wandunit'
  | 'cassette' | 'buitenunit' | 'kolom' | 'boiler' | 'radiator' | 'unit' | 'mond' | 'rooster' | 'doorvoer' | 'laadpaal'
  | 'kraan' | 'pomp' | 'collector'
  // Buitenverlichting (ronde 15): een lamp aan de gevel die op en neer schijnt, een paaltje in de tuin.
  | 'buitenlamp' | 'paaltje';

/** Een soort toestel in de catalogus. Maten in cm; alles is een richtwaarde (zie `herkomst`). */
export interface ToestelType {
  label: string;
  vak: TechniekVak;
  /** Breedte (langs de wand), diepte (van de wand af) en hoogte, in cm. Bij een cilinder (boiler) is b = d de doorsnede. */
  b: number;
  d: number;
  h: number;
  /**
   * Gangbare hoogte van de onderkant boven de afgewerkte vloer (cm), als voorstel. Ontbreekt bij een toestel aan het
   * plafond: dan hangt het er tegen (muurhoogte − h). Buiten: boven het maaiveld.
   */
  hoogte?: number;
  bevestiging: Bevestiging;
  teken: ToestelTeken;
  /** Korte tekst in het teken (bij `kader` en `rond`), bv. "kWh" of "WP". */
  afkorting?: string;
  vorm: ToestelVorm;
  kleur: string;
  /** Hoeveel stuks in één toestel (een dubbel stopcontact = 2): het getal komt bij het teken. */
  stuks?: number;
  /**
   * Vrije ruimte die het toestel vraagt voor onderhoud of lucht (cm): voor (aan de voorkant), opzij (links en rechts),
   * achter (tussen toestel en muur). Richtwaarden; de handleiding van het gekozen toestel beslist.
   */
  vrij?: { voor?: number; opzij?: number; achter?: number };
  /** Hoort bij de technische ruimte (zie `technischeOpstelling` in techniekplaatsen.ts). */
  technisch?: boolean;
  /** Waar maten en hoogte vandaan komen; `nagelezen: false` zolang een installateur ze niet nalas. */
  herkomst: OpbouwHerkomst;
  uitleg?: string;
  /** Voor de klant: hoe hij het noemt en wat het is (ontbreekt = het label zonder de uitleg tussen haakjes). */
  klant?: KlantWoorden;
  /**
   * Een lamp (ronde 15): haar kap licht 's nachts op (zie nacht.ts), in deze kleur (een code uit `LICHTKLEUREN`,
   * standaard warm wit) en sterkte; met `bereik` (cm) verlicht ze ook echt wat errond ligt, als ze buiten hangt of staat.
   */
  licht?: { kleur?: string; sterkte?: number; bereik?: number };
  /**
   * Mag ook buiten aan de gevel hangen (ronde 15: een buitenlamp, een laadpaal, een buitenkraan, een gevelrooster): een
   * tik buiten de woning zet het tegen de buitenkant van de dichtste gevel.
   */
  gevel?: boolean;
}

/**
 * Een maat van een leiding in mm: een getal is een doorsnede (buis, kabel in een buis, rond kanaal); een paar is bij
 * een dubbele leiding de twee doorsneden (koelleiding: vloeistof en gas) en bij een plat kanaal breedte × hoogte.
 */
export type LeidingMaat = number | [number, number];

/**
 * Waar een leiding loopt: in de vloeropbouw, in de wand (op de hoogte van de stopcontacten), tegen het plafond, of op een
 * eigen hoogte (cm boven de afgewerkte vloer). Zie `liggingHoogte`.
 */
export type LeidingHoogte = 'vloer' | 'wand' | 'plafond' | number;

/** Een soort leiding in de catalogus: een vaste kleur per soort, de maten om uit te kiezen en waar ze gewoonlijk loopt. */
export interface LeidingSoortType {
  label: string;
  vak: TechniekVak;
  /** Vaste kleur van de soort, in de tekening en in de 3D. */
  kleur: string;
  /** rond = buis of kabel; paar = twee buizen naast elkaar (koelleiding); plat = plat kanaal (breedte × hoogte). */
  vorm: 'rond' | 'paar' | 'plat';
  /** De maten om uit te kiezen (mm); de eerste is de standaard. */
  maten: LeidingMaat[];
  /** Waar ze standaard loopt. */
  hoogte: LeidingHoogte;
  /** Mag beginnen of eindigen buiten de woning (afvoer naar de riolering, regenwater uit de put, gas van de meter). */
  naarBuiten?: boolean;
  /** Een afvoer van water (voor de controle "natte ruimte zonder afvoer"). */
  afvoer?: boolean;
  /** Een richtwaarde voor de grootste lengte in m (bv. koelleiding van een gewoon toestel): alleen een signaal. */
  maxLengte?: Richtwaarde;
  herkomst: OpbouwHerkomst;
  uitleg?: string;
  /** Voor de klant: hoe hij het noemt en wat het is (zie `ToestelType.klant`). */
  klant?: KlantWoorden;
  /**
   * Een ledstrip (ronde 15): geen leiding die je verstopt maar licht dat je ziet. In de afgewerkte woning een dun profiel
   * (`ledstripBlokken` in nacht.ts) dat 's nachts oplicht in de kleur van de strip (`Leiding.lichtkleur`); ze begint en
   * eindigt waar je wil (geen melding over een los einde); de telling geeft ook de voedingen.
   */
  ledstrip?: boolean;
}

/** De catalogus techniek: zoals de plancatalogus, gegevens en geen programma. Zie core/voorbeelden/techniek.ts. */
export interface TechniekCatalogus {
  toestellen: Record<string, ToestelType>;
  leidingen: Record<string, LeidingSoortType>;
}

/** Een toestel in het plan. */
export interface Toestel {
  id: string;
  /** Code van het type in de catalogus. */
  type: string;
  /** Midden van de voetafdruk op het plan (cm). */
  x: number;
  y: number;
  /** Onderkant boven de afgewerkte vloer van zijn verdieping (cm); buiten: boven het maaiveld. */
  hoogte: number;
  /**
   * Draaiing in graden (zoals een meubel, maar elke hoek, ook voor een schuine wand): 0 = de voorkant kijkt naar onder op
   * de tekening, 90 = naar links, 180 = naar boven, 270 = naar rechts. Een toestel tegen een wand kijkt van de wand weg.
   */
  draai: number;
  /** Waar het aan hangt (standaard die van het type). */
  aan: Bevestiging;
  niveau?: number;
  /** Eigen naam of kring (bv. "kring 3"), optioneel. */
  naam?: string;
}

/** Een leiding in het plan: een lijn op één verdieping, van toestel naar toestel. */
export interface Leiding {
  id: string;
  /** Code van de soort in de catalogus. */
  soort: string;
  /** Maat in mm (standaard de eerste maat van de soort). */
  maat?: LeidingMaat;
  /** De punten op het plan (cm), minstens twee. */
  punten: Punt[];
  /** Waar ze loopt (standaard die van de soort). */
  hoogte: LeidingHoogte;
  /**
   * Een eigen hoogte per punt (cm boven de afgewerkte vloer van haar verdieping; mag negatief, tot onder een lagere
   * vloer), in plaats van `hoogte`. Twee punten op dezelfde plaats met een andere hoogte zijn een stuk op of neer: een
   * condensafvoer die langs de gevel naar beneden loopt, een standleiding naar het gelijkvloers.
   */
  hoogtes?: number[];
  /**
   * Het toestel aan het begin en aan het einde (id). Daar komt in de 3D en in de lengte een stuk op of neer bij, van de
   * hoogte van de leiding tot de aansluiting van het toestel, ook als dat op een andere verdieping staat.
   */
  van?: string;
  naar?: string;
  niveau?: number;
  /** Naam van de kring (elektriciteit) of een eigen naam. */
  kring?: string;
  /** Een ledstrip (ronde 15): de kleur van haar licht, een code uit `LICHTKLEUREN` in nacht.ts (standaard warm wit). */
  lichtkleur?: string;
}

/** Hoe de 3D de techniek toont (zie `Plan3DOpties.techniek` in plattegrond.ts). */
export interface TechniekWeergave {
  /** Welke vakken (standaard alle). */
  vakken?: TechniekVak[];
  /**
   * 'gewoon' = de woning zoals altijd, met de toestellen en leidingen erin op hun plaats (een leiding in de vloer of de wand
   * zit dan ook echt verstopt). 'uitgezet' = de woning wordt uitgezet tot vloeren, lage wanden en een dunne lijn op
   * plafondhoogte, zodat je vooral de installaties ziet; een leiding in de vloer ligt dan zichtbaar op de vloer.
   */
  weergave?: 'gewoon' | 'uitgezet';
  /** Alleen deze verdieping (uitgezet): de andere verdiepingen vallen weg. */
  niveau?: number;
  /**
   * Kleine toestellen groter, in de kleur van hun vak en met een merkteken op de vloer (zie `toestelBlokken`). Standaard
   * alleen in de uitgezette weergave; het scherm zet het ook aan in de woning (16/11: anders zie je geen stopcontact).
   */
  opvallend?: boolean;
}

// ---------- maten en hoogtes ----------

const r2 = (x: number) => Math.round(x * 100) / 100;
const fijn = (x: number) => { const y = Math.round(x * 1e6) / 1e6; return y === 0 ? 0 : y; };
const GRAAD = 180 / Math.PI;
const getal = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Hoogtes van de vaste liggingen (cm, het midden van de leiding boven de afgewerkte vloer); richtwaarden. */
export const LEIDING_LIGGING = {
  /** In de vloeropbouw (chape): onder de afgewerkte vloer. */
  vloer: -5,
  /** In de wand: op de hoogte van de stopcontacten. */
  wand: 30,
  /** Tegen het plafond: zoveel cm onder de muurhoogte. */
  plafond: 6,
} as const;

/** In de 3D is elke leiding minstens zo dik (cm): een kabel van 16 mm zie je anders niet op een hele woning. */
export const LEIDING_MIN_DIK = 4;

/** Hoogte van het midden van een leiding boven de afgewerkte vloer (cm). */
export function liggingHoogte(h: LeidingHoogte, muurhoogte: number): number {
  if (getal(h)) return h;
  if (h === 'vloer') return LEIDING_LIGGING.vloer;
  if (h === 'wand') return LEIDING_LIGGING.wand;
  return muurhoogte - LEIDING_LIGGING.plafond;
}

/** De maat van een leiding: haar eigen maat, anders de eerste van de soort. */
export function maatVan(l: Leiding, soort: LeidingSoortType | undefined): LeidingMaat {
  return l.maat ?? soort?.maten[0] ?? 20;
}

const mmTekst = (x: number) => String(Math.round(x * 100) / 100).replace('.', ',');

/** De maat in woorden: "Ø 16 mm", "Ø 6,35 + 9,52 mm" (koelleiding) of "140 × 64 mm" (plat kanaal). */
export function maatTekst(soort: LeidingSoortType | undefined, maat: LeidingMaat): string {
  if (!Array.isArray(maat)) return `Ø ${mmTekst(maat)} mm`;
  return soort?.vorm === 'plat' ? `${mmTekst(maat[0])} × ${mmTekst(maat[1])} mm` : `Ø ${mmTekst(maat[0])} + ${mmTekst(maat[1])} mm`;
}

/** De standaardhoogte van een toestel (cm, onderkant): die van het type, of tegen het plafond. */
export function standaardToestelHoogte(type: ToestelType, muurhoogte: number, aan: Bevestiging = type.bevestiging): number {
  if (aan === 'plafond') return r2(muurhoogte - toestelMaten(type, aan).h);
  if (aan === 'dak') return 0;
  return type.hoogte ?? 0;
}

/** Breedte, diepte en hoogte zoals het toestel hangt (een mond aan de wand staat recht op: haar dikte wordt de diepte). */
export function toestelMaten(type: ToestelType, aan: Bevestiging): { b: number; d: number; h: number } {
  if (type.vorm === 'mond' && aan === 'wand' && type.bevestiging !== 'wand') return { b: type.b, d: type.h, h: type.d };
  return { b: type.b, d: type.d, h: type.h };
}

/** Een nieuw toestel met de standaardwaarden van zijn type (hoogte, bevestiging), op (x, y). */
export function nieuwToestel(cat: TechniekCatalogus, type: string, id: string, x: number, y: number, muurhoogte: number, extra: Partial<Toestel> = {}): Toestel {
  const t = cat.toestellen[type];
  const aan = extra.aan ?? t?.bevestiging ?? 'wand';
  return { id, type, x, y, hoogte: t ? standaardToestelHoogte(t, muurhoogte, aan) : 0, draai: 0, aan, ...extra };
}

/** Richting van de voorkant op het plan (eenheidsvector [x, y]) bij een draaiing. */
export function voorRichting(draai: number): Punt {
  const a = draai / GRAAD;
  return [fijn(-Math.sin(a)), fijn(Math.cos(a))];
}

/** De draaiing waarbij de voorkant in richting [x, y] kijkt (graden, 0 tot 360). */
export function draaiNaar([x, y]: Punt): number {
  const g = fijn(Math.atan2(-x, y) * GRAAD);
  return fijn(((g % 360) + 360) % 360);
}

/** De voetafdruk van een toestel op het plan: vier hoeken (achter-links, achter-rechts, voor-rechts, voor-links). */
export function toestelVoetafdruk(t: Toestel, type: ToestelType, extra: { voor?: number; opzij?: number; achter?: number } = {}): Punt[] {
  const m = toestelMaten(type, t.aan);
  const [vx, vy] = voorRichting(t.draai), [zx, zy] = [vy, -vx];
  const z0 = -m.d / 2 - (extra.achter ?? 0), z1 = m.d / 2 + (extra.voor ?? 0), x0 = -m.b / 2 - (extra.opzij ?? 0), x1 = m.b / 2 + (extra.opzij ?? 0);
  const p = (a: number, c: number): Punt => [fijn(t.x + a * zx + c * vx), fijn(t.y + a * zy + c * vy)];
  return [p(x0, z0), p(x1, z0), p(x1, z1), p(x0, z1)];
}

/** Hoogte van de aansluiting van een toestel boven de vloer van zijn verdieping (cm): het midden van het toestel. */
export function aansluitHoogte(t: Toestel, type: ToestelType | undefined, muurhoogte: number): number {
  if (!type) return t.hoogte;
  const m = toestelMaten(type, t.aan);
  // Een dakdoorvoer sluit onderaan aan, tegen het plafond.
  if (t.aan === 'dak') return muurhoogte + t.hoogte;
  return t.hoogte + m.h / 2;
}

// ---------- het verloop van een leiding ----------

/** Een punt in de ruimte (cm): x en z zoals het plan (z = y op het plan), y = hoogte boven het maaiveld. */
export type Punt3D = [number, number, number];

/** Het verloop van een leiding in de ruimte: de lijn met de stukken op en neer naar de toestellen, en haar lengte. */
export interface LeidingVerloop {
  /** De punten in de ruimte (cm), in volgorde; elk stuk is horizontaal of loodrecht. */
  punten: Punt3D[];
  /** De lengte in m: de stukken op het plan en de stukken op en neer. */
  lengte: number;
  /** Alleen de lengte op het plan (m). */
  lengtePlan: number;
}

export interface VerloopOpties {
  /** Hoogte van de vloer van een verdieping boven het maaiveld (cm). */
  vloerHoogte: (niveau: number) => number;
  /** Een leiding in de vloer zichtbaar op de vloer leggen (de uitgezette weergave). */
  vloerBoven?: boolean;
}

/**
 * Het verloop van een leiding: de punten op haar hoogte, en aan het begin en het einde een stuk op of neer tot de
 * aansluiting van het toestel (`van`, `naar`), ook naar een andere verdieping. Eén functie voor de 3D, de tekening, de
 * telling en de controles: wat getekend wordt, is wat geteld wordt.
 */
export function leidingVerloop(l: Leiding, plan: Plattegrond, cat: TechniekCatalogus, opties: VerloopOpties): LeidingVerloop {
  const n = l.niveau ?? 0, H = plan.muurhoogte;
  const soort = cat.leidingen[l.soort];
  const h = liggingHoogte(l.hoogte, H), vloer = opties.vloerHoogte(n);
  // Uitgezet: wat in een vloer zit (tot een vloerdikte onder een vloer), ligt zichtbaar op die vloer.
  const periode = opties.vloerHoogte(1) - opties.vloerHoogte(0) || H + 30, boven = dikte(soort, maatVan(l, soort)).h / 2 + 1.5;
  const zichtbaar = (y: number) => {
    if (!opties.vloerBoven) return y;
    const k = Math.ceil(y / periode - 1e-9), vk = opties.vloerHoogte(k);
    return y < vk && y >= vk - (periode - H) ? vk + boven : y;
  };
  const punten: Punt3D[] = l.punten.map(([x, z], i) => [x, r2(zichtbaar(vloer + (l.hoogtes?.[i] ?? h))), z]);
  const toestel = (id?: string) => (id ? plan.toestellen?.find((t) => t.id === id) : undefined);
  const aansluiting = (t: Toestel): number => r2(zichtbaar(opties.vloerHoogte(t.niveau ?? 0) + aansluitHoogte(t, cat.toestellen[t.type], H)));
  const a = toestel(l.van), b = toestel(l.naar);
  if (a && punten.length) { const p = punten[0]!, ya = aansluiting(a); if (Math.abs(ya - p[1]) > 0.5) punten.unshift([p[0], ya, p[2]]); }
  if (b && punten.length) { const p = punten[punten.length - 1]!, yb = aansluiting(b); if (Math.abs(yb - p[1]) > 0.5) punten.push([p[0], yb, p[2]]); }
  let lengte = 0, lengtePlan = 0;
  for (let i = 1; i < punten.length; i++) {
    const p = punten[i - 1]!, q = punten[i]!;
    lengte += Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    lengtePlan += Math.hypot(q[0] - p[0], q[2] - p[2]);
  }
  return { punten, lengte: r2(lengte / 100), lengtePlan: r2(lengtePlan / 100) };
}

/** De dikte zoals de 3D ze tekent (cm): minstens `LEIDING_MIN_DIK`; b = breedte op het plan, h = hoogte. */
function dikte(soort: LeidingSoortType | undefined, maat: LeidingMaat): { b: number; h: number; d1: number; d2: number } {
  const cm = (mm: number) => Math.max(LEIDING_MIN_DIK, mm / 10);
  if (!Array.isArray(maat)) return { b: cm(maat), h: cm(maat), d1: cm(maat), d2: 0 };
  if (soort?.vorm === 'plat') return { b: Math.max(LEIDING_MIN_DIK, maat[0] / 10), h: Math.max(LEIDING_MIN_DIK / 2, maat[1] / 10), d1: 0, d2: 0 };
  // Koelleiding: twee buizen met hun isolatie (± 1 cm rondom, richtwaarde), naast elkaar.
  const d1 = Math.max(LEIDING_MIN_DIK / 2, maat[0] / 10 + 2), d2 = Math.max(LEIDING_MIN_DIK / 2, maat[1] / 10 + 2);
  return { b: d1 + d2 + 0.5, h: Math.max(d1, d2), d1, d2 };
}

/** Een leiding als blokken (cilinders en bollen, of balken bij een plat kanaal), in de wereld. */
export function leidingBlokken(l: Leiding, soort: LeidingSoortType | undefined, verloop: LeidingVerloop, code: string): Blok[] {
  const kleur = soort?.kleur ?? '#777777', vorm = soort?.vorm ?? 'rond';
  const dk = dikte(soort, maatVan(l, soort));
  const pt = verloop.punten;
  const uit: Blok[] = [];
  let k = 0;
  const blok = (b: Omit<Blok, 'code' | 'soort' | 'kleur'>, kl = kleur) => uit.push({ code: `${code}_${k++}`, soort: 'kunststof' as BlokSoort, kleur: kl, ...b, x: r2(b.x), y: r2(b.y), z: r2(b.z), b: r2(b.b), h: r2(b.h), d: r2(b.d) });
  /** Een buis van p naar q met doorsnede D, verschoven over `opzij` cm dwars op het plan (voor de tweede buis van een paar). */
  const buis = (p: Punt3D, q: Punt3D, D: number, opzij: Punt = [0, 0]) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2];
    const L = Math.hypot(dx, dy, dz);
    if (L < 0.1) return;
    const mx = (p[0] + q[0]) / 2 + opzij[0], my = (p[1] + q[1]) / 2, mz = (p[2] + q[2]) / 2 + opzij[1];
    if (Math.abs(dy) > 0.1 && Math.hypot(dx, dz) < 0.1) {
      blok({ vorm: 'cilinder', x: mx - D / 2, y: Math.min(p[1], q[1]), z: mz - D / 2, b: D, h: Math.abs(dy), d: D });
      return;
    }
    if (Math.abs(dz) < 0.01) { blok({ vorm: 'cilinder', as: 'x', x: mx - L / 2, y: my - D / 2, z: mz - D / 2, b: L, h: D, d: D }); return; }
    if (Math.abs(dx) < 0.01) { blok({ vorm: 'cilinder', as: 'z', x: mx - D / 2, y: my - D / 2, z: mz - L / 2, b: D, h: D, d: L }); return; }
    blok({ vorm: 'cilinder', as: 'x', x: mx - L / 2, y: my - D / 2, z: mz - D / 2, b: L, h: D, d: D, draai: fijn(Math.atan2(dz, dx) * GRAAD) });
  };
  const knoop = (p: Punt3D, D: number, opzij: Punt = [0, 0]) => blok({ vorm: 'bol', x: p[0] + opzij[0] - D / 2, y: p[1] - D / 2, z: p[2] + opzij[1] - D / 2, b: D, h: D, d: D });
  /** De richting dwars op het plan bij punt i (voor een paar): loodrecht op het stuk op het plan ervoor of erna. */
  const dwars = (i: number): Punt => {
    for (const [a, b] of [[i, i + 1], [i - 1, i], [i - 2, i - 1], [i + 1, i + 2]] as const) {
      const p = pt[a], q = pt[b];
      if (!p || !q) continue;
      const dx = q[0] - p[0], dz = q[2] - p[2], L = Math.hypot(dx, dz);
      if (L > 0.1) return [-dz / L, dx / L];
    }
    return [1, 0];
  };
  if (vorm === 'plat') {
    for (let i = 1; i < pt.length; i++) {
      const p = pt[i - 1]!, q = pt[i]!;
      const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], L = Math.hypot(dx, dz);
      if (Math.abs(dy) > 0.1 && L < 0.1) {
        // Een stuk op of neer: staand, met de platte kant zoals het stuk ernaast.
        const [nx, nz] = dwars(i), langsX = Math.abs(nz) < Math.abs(nx);
        const [bb, dd] = langsX ? [dk.h, dk.b] : [dk.b, dk.h];
        blok({ vorm: 'blok', x: p[0] - bb / 2, y: Math.min(p[1], q[1]) - dk.h / 2, z: p[2] - dd / 2, b: bb, h: Math.abs(dy) + dk.h, d: dd });
        continue;
      }
      if (L < 0.1) continue;
      // Liggend: aan elk einde een halve breedte langer, zodat de hoeken dicht zijn.
      const Lx = L + dk.b, mx = (p[0] + q[0]) / 2, mz = (p[2] + q[2]) / 2;
      const hoek = fijn(Math.atan2(dz, dx) * GRAAD);
      const recht = Math.abs(dz) < 0.01 || Math.abs(dx) < 0.01;
      if (recht && Math.abs(dx) < 0.01) blok({ vorm: 'blok', x: mx - dk.b / 2, y: p[1] - dk.h / 2, z: mz - Lx / 2, b: dk.b, h: dk.h, d: Lx });
      else blok({ vorm: 'blok', x: mx - Lx / 2, y: p[1] - dk.h / 2, z: mz - dk.b / 2, b: Lx, h: dk.h, d: dk.b, ...(recht ? {} : { draai: hoek }) });
    }
    return uit;
  }
  if (vorm === 'paar') {
    // Twee buizen naast elkaar, elk een halve tussenafstand opzij van de lijn.
    const af = (dk.d1 + dk.d2) / 4 + 0.25;
    for (let i = 1; i < pt.length; i++) {
      const p = pt[i - 1]!, q = pt[i]!, [nx, nz] = dwars(Math.abs(q[1] - p[1]) > 0.1 && Math.hypot(q[0] - p[0], q[2] - p[2]) < 0.1 ? i : i - 1);
      buis(p, q, dk.d1, [nx * af, nz * af]);
      buis(p, q, dk.d2, [-nx * af, -nz * af]);
    }
    for (let i = 1; i + 1 < pt.length; i++) {
      const [nx, nz] = dwars(i);
      knoop(pt[i]!, dk.d1, [nx * af, nz * af]);
      knoop(pt[i]!, dk.d2, [-nx * af, -nz * af]);
    }
    return uit;
  }
  for (let i = 1; i < pt.length; i++) buis(pt[i - 1]!, pt[i]!, dk.d1);
  for (let i = 1; i + 1 < pt.length; i++) knoop(pt[i]!, dk.d1);
  return uit;
}

// ---------- toestellen in 3D ----------

const WIT = '#f2f1ec', GRIJS = '#c9cbc8', DONKER = '#2c2d2e', METAAL = '#9fa3a6';

/**
 * De vorm van een toestel in eigen assen: x van 0 tot b (breedte), z van 0 (achterkant, tegen de wand) tot d (voorkant),
 * y van 0 (onderkant) tot h. Eenvoudige blokken: een benadering om te tonen waar het komt, geen product.
 */
export function toestelVorm(vorm: ToestelVorm, B: number, D: number, H: number, kleur: string, aan: Bevestiging): Blok[] {
  const uit: Blok[] = [];
  const blok = (code: string, soort: BlokSoort, x: number, y: number, z: number, b: number, h: number, d: number, k: string, extra: Partial<Blok> = {}) => {
    if (b > 0.05 && h > 0.05 && d > 0.05) uit.push({ code, soort, vorm: 'blok', x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d), kleur: k, ...extra });
  };
  const schijfVoor = (code: string, soort: BlokSoort, cx: number, cy: number, z: number, Ø: number, dik: number, k: string) =>
    blok(code, soort, cx - Ø / 2, cy - Ø / 2, z, Ø, Ø, dik, k, { vorm: 'cilinder', as: 'z' });
  const staand = (code: string, soort: BlokSoort, cx: number, y: number, cz: number, Ø: number, h: number, k: string, extra: Partial<Blok> = {}) =>
    blok(code, soort, cx - Ø / 2, y, cz - Ø / 2, Ø, h, Ø, k, { vorm: 'cilinder', ...extra });
  switch (vorm) {
    case 'kast': {
      blok('kast', 'kunststof', 0, 0, 0, B, H, D - 0.4, kleur);
      blok('deur', 'kunststof', 1, 1, D - 0.4, B - 2, H - 2, 0.4, kleur);
      blok('greep', 'donker', B - 4, H / 2 - 4, D, 1.2, 8, 0.8, DONKER);
      break;
    }
    case 'stopcontact':
      blok('plaat', 'kunststof', 0, 0, 0, B, H, D, kleur);
      schijfVoor('kom', 'donker', B / 2, H / 2, D, Math.min(B, H) * 0.62, 0.3, '#8e8f8c');
      break;
    case 'schakelaar':
      blok('plaat', 'kunststof', 0, 0, 0, B, H, D, kleur);
      blok('wip', 'kunststof', B * 0.2, H * 0.2, D, B * 0.6, H * 0.6, 0.5, '#e6e4de');
      break;
    case 'plaatje':
      blok('plaat', 'kunststof', 0, 0, 0, B, H, D, kleur);
      blok('venster', 'donker', B * 0.2, H * 0.45, D, B * 0.6, H * 0.3, 0.3, DONKER);
      break;
    case 'lichtpunt':
      staand('rozet', 'kunststof', B / 2, H - 2, D / 2, Math.min(B, D), 2, WIT);
      staand('snoer', 'donker', B / 2, H - 14, D / 2, 0.8, 12, DONKER);
      blok('lamp', 'kunststof', B / 2 - 4, 0, D / 2 - 4, 8, 8, 8, '#fff3c4', { vorm: 'bol' });
      blok('fitting', 'donker', B / 2 - 2, 6, D / 2 - 2, 4, 4, 4, DONKER);
      break;
    case 'spot':
      staand('rand', 'kunststof', B / 2, H - 1.5, D / 2, Math.min(B, D), 1.5, kleur);
      staand('licht', 'kunststof', B / 2, 0, D / 2, Math.min(B, D) * 0.6, H - 1.5, '#fff3c4');
      break;
    case 'pendel': {
      const kap = Math.min(25, H * 0.4);
      staand('rozet', 'kunststof', B / 2, H - 2, D / 2, 12, 2, kleur);
      staand('snoer', 'donker', B / 2, kap, D / 2, 0.8, H - kap - 2, DONKER);
      // Kap: een kegel die naar onder wijder wordt (taps = onderste / bovenste straal).
      staand('kap', 'kunststof', B / 2, 0, D / 2, Math.min(B, D) * 0.35, kap, kleur, { vorm: 'kegel', taps: 2.8 });
      break;
    }
    case 'wandlamp':
      blok('voet', 'kunststof', B * 0.3, H * 0.2, 0, B * 0.4, H * 0.6, 2, kleur);
      blok('kap', 'kunststof', 0, 0, 2, B, H, D - 2, '#fff3c4', { afronding: Math.min(B, H, D - 2) / 3 });
      break;
    case 'buitenlamp':
      // Ronde 15: een donkere koker tegen de gevel, open aan de boven- en onderkant (het licht schijnt op en neer langs de muur).
      blok('kast', 'metaal', 0, 2, 0, B, H - 4, D, kleur);
      blok('licht_onder', 'kunststof', 1, 0.6, 1, B - 2, 1.4, D - 2, '#fff3c4');
      blok('licht_boven', 'kunststof', 1, H - 2, 1, B - 2, 1.4, D - 2, '#fff3c4');
      break;
    case 'paaltje':
      // Ronde 15: een paaltje in de tuin met een lichtband onder een platte kap.
      staand('paal', 'metaal', B / 2, 0, D / 2, Math.min(B, D) * 0.8, H - 14, kleur);
      staand('licht', 'kunststof', B / 2, H - 14, D / 2, Math.min(B, D) * 0.72, 10, '#fff3c4');
      staand('kap', 'metaal', B / 2, H - 4, D / 2, Math.min(B, D), 4, kleur);
      break;
    case 'wandunit':
      blok('kast', 'kunststof', 0, 0, 0, B, H, D, kleur, { afronding: 3 });
      blok('uitblaas', 'donker', 6, 3, D - 0.5, B - 12, 3, 0.6, '#55585a');
      blok('streep', 'kunststof', 4, H * 0.55, D - 0.2, B - 8, 0.6, 0.4, '#dcdad4');
      break;
    case 'cassette':
      blok('paneel', 'kunststof', 0, 0, 0, B, H, D, kleur);
      for (const [x, z, b, d] of [[6, 6, B - 12, 4], [6, D - 10, B - 12, 4], [6, 12, 4, D - 24], [B - 10, 12, 4, D - 24]] as const) blok(`rooster_${x}_${z}`, 'donker', x, -0.3, z, b, 0.4, d, '#55585a');
      staand('midden', 'kunststof', B / 2, -0.3, D / 2, Math.min(B, D) * 0.35, 0.4, '#e3e1db');
      break;
    case 'buitenunit': {
      blok('kast', 'kunststof', 0, 4, 0, B, H - 4, D, kleur);
      const Ø = Math.min(B * 0.55, (H - 4) * 0.8);
      schijfVoor('ventilator', 'donker', B * 0.38, 4 + (H - 4) / 2, D, Ø, 0.6, '#3a3c3e');
      schijfVoor('naaf', 'kunststof', B * 0.38, 4 + (H - 4) / 2, D + 0.6, Ø * 0.18, 0.5, kleur);
      for (let i = 0; i < 6; i++) blok(`rooster${i}`, 'donker', B * 0.78, 10 + i * ((H - 20) / 6), D, B * 0.16, 1, 0.4, '#5d6062');
      blok('voet_l', 'metaal', 4, 0, 2, 6, 4, D - 4, METAAL);
      blok('voet_r', 'metaal', B - 10, 0, 2, 6, 4, D - 4, METAAL);
      break;
    }
    case 'kolom':
      blok('kast', 'kunststof', 0, 0, 0, B, H, D - 0.4, kleur);
      blok('voorkant', 'kunststof', 1, 6, D - 0.4, B - 2, H - 7, 0.4, kleur);
      blok('scherm', 'donker', B / 2 - 7, H - 30, D, 14, 9, 0.4, DONKER);
      break;
    case 'boiler':
      staand('vat', 'kunststof', B / 2, 0, D / 2, Math.min(B, D), H - 6, kleur);
      staand('kap', 'kunststof', B / 2, H - 6, D / 2, Math.min(B, D) * 0.92, 6, GRIJS);
      staand('warm', 'kunststof', B / 2 - 8, H, D / 2, 3, 8, '#e53935');
      staand('koud', 'kunststof', B / 2 + 8, H, D / 2, 3, 8, '#1e88e5');
      break;
    case 'radiator': {
      blok('achter', 'kunststof', 0, 0, 1, B, H, D - 2, kleur);
      const n = Math.max(2, Math.round(B / 5));
      for (let i = 0; i < n; i++) blok(`rib${i}`, 'kunststof', (i + 0.15) * (B / n), 1, D - 1, (B / n) * 0.7, H - 2, 1, kleur);
      break;
    }
    case 'unit': {
      blok('kast', 'kunststof', 0, 0, 0, B, H, D, kleur);
      blok('scherm', 'donker', B / 2 - 5, H * 0.6, D, 10, 6, 0.4, DONKER);
      // Aansluitingen bovenop: vier bij een unit met toevoer en afvoer.
      for (let i = 0; i < 4; i++) staand(`stomp${i}`, 'metaal', (i + 0.5) * (B / 4), H, D / 2, Math.min(B / 4 - 2, 16), 8, METAAL);
      break;
    }
    case 'mond':
      if (aan === 'wand') {
        // Recht op tegen de wand: een ronde plaat met een middenstuk.
        schijfVoor('rand', 'kunststof', B / 2, H / 2, 0, Math.min(B, H), D * 0.5, kleur);
        schijfVoor('kern', 'kunststof', B / 2, H / 2, D * 0.5, Math.min(B, H) * 0.55, D * 0.5, '#e3e1db');
      } else {
        staand('rand', 'kunststof', B / 2, H * 0.5, D / 2, Math.min(B, D), H * 0.5, kleur);
        staand('kern', 'kunststof', B / 2, 0, D / 2, Math.min(B, D) * 0.55, H * 0.5, '#e3e1db');
      }
      break;
    case 'rooster': {
      blok('kader', 'kunststof', 0, 0, 0, B, H, D, kleur);
      const n = Math.max(3, Math.round(H / 3));
      for (let i = 0; i < n; i++) blok(`lamel${i}`, 'donker', 2, 2 + i * ((H - 4) / n), D, B - 4, 0.8, 0.4, '#55585a');
      break;
    }
    case 'doorvoer':
      staand('buis', 'kunststof', B / 2, 0, D / 2, Math.min(B, D) * 0.7, H - 4, kleur);
      staand('kap', 'kunststof', B / 2, H - 4, D / 2, Math.min(B, D), 4, '#3a3c3e');
      break;
    case 'laadpaal':
      blok('kast', 'kunststof', 0, 0, 0, B, H, D, kleur, { afronding: 2 });
      blok('scherm', 'donker', B * 0.25, H * 0.62, D - 0.2, B * 0.5, H * 0.18, 0.4, DONKER);
      blok('houder', 'donker', B * 0.35, H * 0.15, D - 0.2, B * 0.3, H * 0.25, 2.5, '#3a3c3e');
      break;
    case 'kraan':
      blok('buis', 'metaal', B / 2 - 1.5, H / 2 - 1.5, 0, 3, 3, D, METAAL, { vorm: 'cilinder', as: 'z' });
      blok('greep', 'kunststof', B / 2 - 3, H / 2 + 1.5, D * 0.4, 6, 2, 2, '#b23b2e');
      break;
    case 'pomp':
      blok('voet', 'kunststof', 0, 0, 0, B, H * 0.25, D, GRIJS);
      blok('motor', 'kunststof', 0, H * 0.25, D * 0.1, B * 0.7, H * 0.6, D * 0.8, kleur, { vorm: 'cilinder', as: 'x' });
      blok('pomphuis', 'metaal', B * 0.7, H * 0.25, D * 0.15, B * 0.3, H * 0.7, D * 0.7, METAAL);
      break;
    case 'collector': {
      blok('plaat', 'kunststof', 0, 0, 0, B, H, 1, GRIJS);
      blok('balk_warm', 'metaal', 2, H * 0.62, 2, B - 4, 4, 4, '#c8a046', { vorm: 'cilinder', as: 'x' });
      blok('balk_koud', 'metaal', 2, H * 0.22, 2, B - 4, 4, 4, '#c8a046', { vorm: 'cilinder', as: 'x' });
      const n = Math.max(2, Math.round((B - 8) / 8));
      for (let i = 0; i < n; i++) {
        const x = 6 + i * ((B - 12) / Math.max(1, n - 1));
        blok(`kraan_w${i}`, 'kunststof', x - 1, H * 0.62 + 4, 3, 2, 3, 2, '#e53935');
        blok(`kraan_k${i}`, 'kunststof', x - 1, H * 0.22 + 4, 3, 2, 3, 2, '#1e88e5');
      }
      break;
    }
  }
  return uit;
}

/**
 * Draait blokken in eigen assen (midden op 0) over `graden` (van x naar z, zoals `Blok.draai`) en zet ze op (x, y, z).
 * Een veelvoud van 90° blijft een gewoon blok langs x en z; een andere hoek draait het midden mee en zet `draai`.
 */
function zetOp(blokken: Blok[], graden: number, x: number, y: number, z: number): Blok[] {
  const g = ((Math.round(graden * 1e6) / 1e6) % 360 + 360) % 360;
  if (g % 90 === 0) {
    return blokken.map((b) => {
      const x0 = b.x, x1 = b.x + b.b, z0 = b.z, z1 = b.z + b.d;
      const [nx, nz, wissel] = g === 90 ? [-z1, x0, true] : g === 180 ? [-x1, -z1, false] : g === 270 ? [z0, -x1, true] : [x0, z0, false];
      const n: Blok = { ...b, x: r2(nx + x), y: r2(b.y + y), z: r2(nz + z), b: wissel ? b.d : b.b, d: wissel ? b.b : b.d };
      if (wissel && b.as && b.as !== 'y') n.as = b.as === 'x' ? 'z' : 'x';
      return n;
    });
  }
  const a = g / GRAAD, c = Math.cos(a), s = Math.sin(a);
  return blokken.map((b) => {
    const mx = b.x + b.b / 2, mz = b.z + b.d / 2;
    const cx = mx * c - mz * s, cz = mx * s + mz * c;
    return { ...b, x: fijn(x + cx - b.b / 2), y: r2(b.y + y), z: fijn(z + cz - b.d / 2), draai: fijn((((b.draai ?? 0) + g) % 360 + 360) % 360) };
  });
}

/**
 * In de uitgezette weergave is een klein toestel (stopcontact, schakelaar, lichtpunt) minstens zo groot (cm), in de kleur
 * van zijn vak. 16/11: van 20 naar 30 cm; met 20 cm was een stopcontact op een hele verdieping een stipje.
 */
export const KLEIN_TOESTEL = 30;

/**
 * Het merkteken onder een klein toestel in de uitgezette weergave (cm): een schijf op de vloer in de kleur van zijn vak,
 * met een dun staafje naar het toestel als dat hoger hangt. Zo vind je een stopcontact of een lichtpunt op een hele
 * verdieping, ook van ver en van boven; een tik op het merkteken kiest het toestel.
 */
export const MERKTEKEN = { schijf: 50, dik: 1.2, staaf: 1.4, vanaf: 20 };

/**
 * Een toestel als blokken in de wereld; `vloer` = hoogte van de vloer van zijn verdieping boven het maaiveld (cm). Met
 * `opvallend` (de uitgezette weergave) wordt een toestel kleiner dan `KLEIN_TOESTEL` vergroot rond zijn midden (de
 * achterkant blijft tegen de wand) en krijgt het de kleur van zijn vak: op een hele woning zie je anders geen
 * stopcontact. De telling en de controles gebruiken altijd de echte maat.
 */
export function toestelBlokken(t: Toestel, type: ToestelType, vloer: number, muurhoogte: number, code: string, opvallend = false): Blok[] {
  const echt = toestelMaten(type, t.aan);
  const f = opvallend ? Math.max(1, KLEIN_TOESTEL / Math.max(echt.b, echt.d, echt.h)) : 1;
  const m = { b: echt.b * f, d: echt.d * f, h: echt.h * f };
  const kleur = f > 1 ? TECHNIEK_VAKKEN[type.vak].kleur : type.kleur;
  const lokaal = toestelVorm(type.vorm, m.b, m.d, m.h, kleur, t.aan).map((b) => ({ ...b, code: `${code}_${b.code}`, x: b.x - m.b / 2, z: b.z - m.d / 2 }));
  // Vergroot: de achterkant blijft waar ze was (het midden schuift naar voor), de hoogte groeit rond het midden.
  const [vx, vy] = voorRichting(t.draai), naarVoor = (m.d - echt.d) / 2;
  const groei = t.aan === 'plafond' ? echt.h - m.h : t.aan === 'vloer' || t.aan === 'buiten' ? 0 : (echt.h - m.h) / 2;
  const onder = (t.aan === 'dak' ? muurhoogte + t.hoogte : t.hoogte) + groei;
  const blokken = zetOp(lokaal, t.draai, t.x + vx * naarVoor, vloer + onder, t.y + vy * naarVoor);
  // Het merkteken (zie MERKTEKEN): alleen bij een vergroot toestel, niet op het dak. Een toestel aan de wand: de schijf
  // ligt voor de wand, het staafje staat onder het midden van het toestel.
  if (f > 1 && t.aan !== 'dak') {
    const M = MERKTEKEN, kleurMerk = TECHNIEK_VAKKEN[type.vak].kleur;
    const wand = t.aan === 'wand' ? M.schijf / 2 : 0;
    const sx = t.x + vx * wand, sz = t.y + vy * wand, mx = t.x + vx * naarVoor, mz = t.y + vy * naarVoor;
    blokken.push({ code: `${code}_merk_schijf`, soort: 'kunststof', vorm: 'cilinder', kleur: kleurMerk, x: fijn(sx - M.schijf / 2), y: r2(vloer + 1), z: fijn(sz - M.schijf / 2), b: M.schijf, h: M.dik, d: M.schijf });
    const hoog = onder - 1 - M.dik;
    if (hoog > M.vanaf) blokken.push({ code: `${code}_merk_staaf`, soort: 'kunststof', vorm: 'cilinder', kleur: kleurMerk, x: fijn(mx - M.staaf / 2), y: r2(vloer + 1 + M.dik), z: fijn(mz - M.staaf / 2), b: M.staaf, h: r2(hoog), d: M.staaf });
  }
  return blokken;
}

export interface TechniekBlokOpties extends VerloopOpties {
  vakken?: TechniekVak[];
  /** Alleen tot en met deze verdieping (zoals `Plan3DOpties.totNiveau`). */
  totNiveau?: number;
  /** Alleen deze verdieping. */
  niveau?: number;
  /** Codes met het ding erbij (`toestel:<id>.` en `leiding:<id>.`), zoals `Plan3DOpties.dingen`. */
  dingen?: boolean;
  /** Kleine toestellen groter en in de kleur van hun vak (de uitgezette weergave, zie `toestelBlokken`). */
  opvallend?: boolean;
}

/** Alle toestellen en leidingen van de gekozen vakken als blokken in de wereld. */
export function techniekBlokken(plan: Plattegrond, cat: TechniekCatalogus, opties: TechniekBlokOpties): Blok[] {
  const vakken = new Set(opties.vakken ?? ALLE_VAKKEN);
  const zichtbaar = (n: number) => (opties.niveau === undefined || n === opties.niveau) && (opties.totNiveau === undefined || n <= opties.totNiveau);
  const uit: Blok[] = [];
  for (const t of plan.toestellen ?? []) {
    const type = cat.toestellen[t.type];
    if (!type || !vakken.has(type.vak) || !zichtbaar(t.niveau ?? 0)) continue;
    const code = `toestel_${t.id}`;
    const blokken = toestelBlokken(t, type, opties.vloerHoogte(t.niveau ?? 0), plan.muurhoogte, code, opties.opvallend);
    uit.push(...(opties.dingen ? blokken.map((b) => ({ ...b, code: `toestel:${t.id}.${b.code}` })) : blokken));
  }
  // Een stuk naar een verdieping die niet getoond wordt, stopt in de vloer ertussen (anders steekt het in de lucht).
  const hoogste = Math.max(0, (plan.verdiepingen?.length ?? 1) - 1, ...plan.ruimtes.map((r) => r.niveau ?? 0));
  const boven = Math.min(opties.totNiveau ?? hoogste, opties.niveau ?? hoogste), onder = opties.niveau ?? 0;
  const plaat = opties.vloerHoogte(1) - opties.vloerHoogte(0) - plan.muurhoogte;
  const maxY = boven < hoogste ? opties.vloerHoogte(boven + 1) : Infinity, minY = onder > 0 ? opties.vloerHoogte(onder) - plaat : -Infinity;
  for (const l of plan.leidingen ?? []) {
    const soort = cat.leidingen[l.soort];
    if (!soort || !vakken.has(soort.vak) || !zichtbaar(l.niveau ?? 0) || l.punten.length < 2) continue;
    const v = leidingVerloop(l, plan, cat, opties);
    const geknipt = { ...v, punten: v.punten.map(([x, y, z]): Punt3D => [x, Math.min(maxY, Math.max(minY, y)), z]) };
    const blokken = leidingBlokken(l, soort, geknipt, `leiding_${l.id}`);
    uit.push(...(opties.dingen ? blokken.map((b) => ({ ...b, code: `leiding:${l.id}.${b.code}` })) : blokken));
  }
  return uit;
}

// ---------- tellen ----------

/**
 * Eén regel van de telling, in de vorm van een regel van de meetstaat van de bouwdelen (`MeetstaatRegel`: groep,
 * materiaal, label, doorsnede, aantal, lengte), zodat het overzicht ze samen kan tonen. `groep` is hier het vak.
 * Zonder prijzen.
 */
export interface TechniekRegel {
  groep: TechniekVak;
  /** Een toestel (stuks) of een leiding (lopende meter). */
  soort: 'toestel' | 'leiding';
  /** Code van het type of de leidingsoort. */
  materiaal: string;
  label: string;
  /** Leiding: de maat in woorden (bv. "Ø 16 mm"). */
  doorsnede?: string;
  /** Toestellen: het aantal stuks. Leidingen: het aantal leidingen. */
  aantal: number;
  /** Leidingen: de lopende meter (m), met de stukken op en neer naar de toestellen; netto, zonder snijverlies. */
  lengte?: number;
}

/**
 * De telling: per vak het aantal toestellen per type en de lopende meters leiding per soort en maat. Met `niveau` alleen
 * die verdieping. Netto, zonder snijverlies of reserve, en zonder prijzen.
 */
export function telTechniek(plan: Plattegrond, cat: TechniekCatalogus, opties: { vakken?: TechniekVak[]; niveau?: number; vloerHoogte?: (n: number) => number } = {}): TechniekRegel[] {
  const vakken = new Set(opties.vakken ?? ALLE_VAKKEN);
  const op = (n?: number) => opties.niveau === undefined || (n ?? 0) === opties.niveau;
  const vloerHoogte = opties.vloerHoogte ?? ((n: number) => n * (plan.muurhoogte + 30));
  const regels = new Map<string, TechniekRegel>();
  for (const t of plan.toestellen ?? []) {
    const type = cat.toestellen[t.type];
    if (!type || !vakken.has(type.vak) || !op(t.niveau)) continue;
    const k = `t|${t.type}`;
    if (!regels.has(k)) regels.set(k, { groep: type.vak, soort: 'toestel', materiaal: t.type, label: type.label, aantal: 0 });
    regels.get(k)!.aantal++;
  }
  for (const l of plan.leidingen ?? []) {
    const soort = cat.leidingen[l.soort];
    if (!soort || !vakken.has(soort.vak) || !op(l.niveau) || l.punten.length < 2) continue;
    const doorsnede = maatTekst(soort, maatVan(l, soort));
    const k = `l|${l.soort}|${doorsnede}`;
    if (!regels.has(k)) regels.set(k, { groep: soort.vak, soort: 'leiding', materiaal: l.soort, label: soort.label, doorsnede, aantal: 0, lengte: 0 });
    const r = regels.get(k)!;
    r.aantal++;
    r.lengte = (r.lengte ?? 0) + leidingVerloop(l, plan, cat, { vloerHoogte }).lengte;
  }
  return [...regels.values()]
    .map((r) => (r.lengte !== undefined ? { ...r, lengte: r2(r.lengte) } : r))
    .sort((a, b) => ALLE_VAKKEN.indexOf(a.groep) - ALLE_VAKKEN.indexOf(b.groep) || (a.soort === b.soort ? 0 : a.soort === 'toestel' ? -1 : 1)
      || a.label.localeCompare(b.label, 'nl') || (a.doorsnede ?? '').localeCompare(b.doorsnede ?? '', 'nl', { numeric: true }));
}
