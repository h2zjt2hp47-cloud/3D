/**
 * Plattegrond-editor: ruimtes tekenen en indelen, wanden verschuiven, ramen en deuren in de
 * muren zetten (gekoppeld aan offerteposities), meubels plaatsen, eigenschappen, controles en 3D.
 */
import {
  asVan,
  binnenRand,
  controleerPlan,
  DAKLICHT_GLAS,
  dakOpbouw,
  kantVan,
  planMetDak,
  openKantVan,
  ruimteVanBinnen,
  type GevelKant,
  zonderOndergrond,
  delenVan,
  meubelAfstanden,
  openingAfstanden,
  dichtsteMuur,
  heeftVrijeVorm,
  niveauPlan,
  niveauVan,
  splitsRuimtes,
  tekenRuimteIn,
  verdiepingenVan,
  verwijderStrook,
  meubelVoetafdruk,
  langsAs,
  murenVan,
  muurVanOpening,
  opAs,
  opMuur,
  verzetOpeningen,
  vormFouten,
  vormVanDeel,
  zetOmtrek,
  planKader,
  planKaderMetTechniek,
  plattegrond3D,
  RUIMTE_TYPES,
  ruimteMaten,
  ruimteOp,
  tekenPlattegrond,
  type DakLicht,
  type Keuzes,
  type Meubel,
  type Opening,
  type OpeningSoort,
  type Plattegrond,
  type Punt,
  type Ruimte,
  type RuimteType,
  type Scene3D,
  type Scene3DMetMaten,
  gebouwMaatlijnen,
  raamMaatlijnen,
  dwarsVerschoven,
  kleefAanWand,
  LOSSE_WAND_MIN,
  losseWandAfstanden,
  losseWandDoorMuur,
  losseWandLengte,
  losseWandMidden,
  losseWandRuimte,
  losseWandVlak,
  metLengte,
  type LosseWand,
} from '../../core/src/index.js';
import { planCatalogus as cat } from '../../core/voorbeelden/inrichting.js';
import { maak3D, type Kwaliteit, type Standpunt, type Viewer3D } from '../../demo-web/src/drie-d.js';
import { isDing, maakVariant, stijlRij, toonDing } from './ding-ui.js';
import { grootSchermKnop, Zoom, type Kader } from '../../demo-web/src/zoom.js';
import { $, aanraak, el, eur, getal, getalVeld, keuzelijst, PRIJZEN, schakelaar, voorVinger } from './hulp.js';
import { berekenHuidigeOfferte } from './offerte-ui.js';
import { openingInfo, openingInhoud, prijsTekst } from './positie-3d.js';
import { gevelNaWijziging, gevelToets, kiesStrookInGevel, startGevels } from './gevel-ui.js';
import { dakLijnen, dakraamZonweringVan, heeftDak, LICHTSTRATEN, metDak, toonDak } from './dak-ui.js';
import { lichtinvalAan, startZon, toonZon, zonVoorKijker } from './zon-ui.js';
import { dagNachtKnop, nachtGekozen, toonDagNacht } from './nacht-ui.js';
import { toonVerlichting, verlichtingIn3D } from './verlichting-ui.js';
import { familie } from './meegeven.js';
import { cmVeld, leesCm, maatVraagBezig, startMaten, matenKader, matenPaneelOpen, matenTik, matenVoorbeeld, maatVraagOpen, openMatenPaneel, plaatsMaatVraag, sluitMaatVraag, sluitMatenPaneel, vraagMaat, type MatenOmgeving } from './maten-ui.js';
import { gevelCatalogus } from '../../core/voorbeelden/inrichting.js';
import { constructieAan, constructieScene, opbouwKeuze, startConstructie, toonOpbouwVanDing, zetWeergave as zetConstructieWeergave } from './constructie-ui.js';
import { startDoorsnede, toonDoorsnede } from './doorsnede-ui.js';
import { binnenKaart, binnenKeuzes, sfeerRij, toonSferen } from './binnen-ui.js';
import { vouwbaar } from './vouw-ui.js';
import {
  draaiToestel, maakZichtbaar, startTechniek, techniek3DOpties, techniekAan, techniekHint, techniekInWoning, techniekMetRuimte, techniekNaTekenen, techniekPlan, techniekPointerDown,
  techniekPointerMove, techniekPointerUp, techniekSelecteren, techniekTekenOpties, techniekUitgezet, techniekVoorbeeld, toonBalk3D, toonTechniekEigenschappen,
  toonTechniekZonderKeuze, verschuifToestel, verwijderTechniek, zetTechniek, type TechniekSelectie,
} from './techniek-ui.js';

export { gevelSvgs } from './gevel-ui.js';
import {
  kanOngedaan,
  momentopname,
  nieuweId,
  nieuwePositie,
  ongedaan,
  opWijziging,
  positieVan,
  resultaat,
  toestand,
  wijzig,
} from './staat.js';

type Gereedschap = 'kies' | 'ruimte' | 'maten' | 'wand' | 'losse_wand' | 'wand_v' | 'wand_h' | 'raam' | 'buitendeur' | 'schuifraam' | 'garagepoort' | 'binnendeur' | 'doorgang' | 'meubel' | 'daklicht';
type Selectie = { soort: 'ruimte' | 'opening' | 'meubel' | 'daklicht' | 'wand' | 'toestel' | 'leiding'; id: string } | undefined;

/**
 * Het gereedschap. `kort` staat op de knop (op een tablet in twee kolommen naast de tekening), `label` in de titel; de
 * uitleg (`hint`) staat onder de tekening, met "tik" in plaats van "klik" op een aanraakscherm (`voorVinger`).
 */
const GEREEDSCHAP: { code: Gereedschap; kort: string; label: string; toets: string; hint: string }[] = [
  { code: 'kies', kort: 'Selecteren', label: 'Selecteren en verplaatsen', toets: 'V', hint: 'Klik om te selecteren. Sleep een ruimte, raam, deur of meubel. Sleep de blauwe bolletjes om een wand te verschuiven.' },
  { code: 'ruimte', kort: 'Ruimte tekenen', label: 'Ruimte tekenen', toets: 'T', hint: 'Sleep een rechthoek, ook binnen een bestaande ruimte ("ruimte in ruimte"): wat overlapt wordt uit de oude ruimte gesneden. Muren volgen automatisch.' },
  { code: 'maten', kort: 'Ruimte met maten', label: 'Ruimte met maten', toets: 'N', hint: 'Typ de maten van de muren in cm (rechthoek, of vier zijden en een diagonaal voor schuine muren) en kies waar de ruimte komt: tegen een gevel (tik op de muur), los of als nieuw project.' },
  { code: 'wand', kort: 'Wand (indelen)', label: 'Wand tekenen (indelen)', toets: 'W', hint: 'Sleep een wand door een of meer ruimtes: elke ruimte die de wand kruist, wordt in twee gedeeld (er komt een ruimte bij). Een muur die niets opdeelt (een muurtje, een muur die halverwege stopt, een tuinmuur)? Kies Losse wand.' },
  { code: 'losse_wand', kort: 'Losse wand', label: 'Losse wand (deelt niets)', toets: 'L', hint: 'Sleep van het begin naar het einde van de muur, ook schuin; ze kleeft aan muren en hoekpunten. Een losse wand deelt niets: de ruimte blijft één ruimte (een muurtje, een muur die halverwege stopt, buiten een tuinmuur). Daarna typ je lengte, afstand tot de muur en hoogte.' },
  { code: 'wand_v', kort: 'Indelen │', label: 'Indelen │ (staande wand)', toets: '', hint: 'Klik in een ruimte om ze met een staande wand in twee te delen.' },
  { code: 'wand_h', kort: 'Indelen ─', label: 'Indelen ─ (liggende wand)', toets: '', hint: 'Klik in een ruimte om ze met een liggende wand in twee te delen.' },
  { code: 'raam', kort: 'Raam', label: 'Raam', toets: 'R', hint: 'Klik op een buitenmuur. Er komt ook een regel in het overzicht bij.' },
  { code: 'buitendeur', kort: 'Buitendeur', label: 'Buitendeur', toets: '', hint: 'Klik op een buitenmuur. In een hal wordt het een voordeur, anders een terrasdeur.' },
  { code: 'schuifraam', kort: 'Schuifraam', label: 'Schuifraam', toets: '', hint: 'Klik op een buitenmuur.' },
  { code: 'garagepoort', kort: 'Garagepoort', label: 'Garagepoort', toets: '', hint: 'Klik op een buitenmuur. Belijning, vensters en kleur kies je in de configurator.' },
  { code: 'binnendeur', kort: 'Binnendeur', label: 'Binnendeur', toets: 'D', hint: 'Klik op een binnenmuur. Draairichting wissel je in de eigenschappen.' },
  { code: 'doorgang', kort: 'Doorgang', label: 'Doorgang (zonder deur)', toets: '', hint: 'Klik op een binnenmuur.' },
  { code: 'meubel', kort: 'Meubel', label: 'Meubel of trap', toets: 'M', hint: 'Kies een meubel in het palet en klik in de plattegrond; daarna kun je het verslepen. Voor nog een kies je opnieuw een meubel.' },
  { code: 'daklicht', kort: 'Daklicht', label: 'Daklicht: lichtkoepel, lichtstraat of plat dakraam', toets: 'K', hint: 'Kies een daklicht in het palet en klik in een ruimte zonder verdieping erboven. Het dak moet daar plat zijn.' },
];
/**
 * Ronde 16 (17/11): het gereedschap in groepen, in de volgorde van het werk, elk met een korte kop (Jonas: *"alle
 * mogelijkheden mooi groeperen in de menu's"*). Selecteren staat bovenaan zonder kop. `paar`: twee knoppen naast elkaar
 * (met een muis staat het gereedschap in één kolom; zo blijft alles naast de tekening). Bij *Inrichting* komt de knop
 * *Trap* (het meubelpalet op Trappen, zie `trapKnop`), bij *Techniek* de knop van de installateur (`startTechniek`).
 * Alleen de schikking: de knoppen, hun `data-gereedschap` en de sneltoetsen zijn dezelfde (zie `docs/menu-indeling-bouw.md`).
 */
type GereedschapKnop = Gereedschap | 'trap';
const GEREEDSCHAP_GROEPEN: { kop?: string; rijen: (GereedschapKnop | [GereedschapKnop, GereedschapKnop])[] }[] = [
  { rijen: ['kies'] },
  { kop: 'Ruimtes', rijen: ['ruimte', 'maten'] },
  { kop: 'Muren', rijen: ['wand', 'losse_wand', ['wand_v', 'wand_h']] },
  { kop: 'Ramen en deuren', rijen: ['raam', 'buitendeur', 'schuifraam', 'garagepoort', 'binnendeur', 'doorgang'] },
  { kop: 'Dak', rijen: ['daklicht'] },
  { kop: 'Inrichting', rijen: [['meubel', 'trap']] },
];
/** Het type van de trap in de meubelcatalogus (de knop *Trap* bij Inrichting), of geen. */
const TRAP = Object.entries(cat.meubels).find(([, m]) => m.vorm === 'trap')?.[0];
/** Gereedschap met een palet: het palet staat dan op de plaats van het gereedschap, naast de tekening. */
type Palet = 'meubel' | 'daklicht';
const PALET_TITEL: Record<Palet, string> = { meubel: 'Meubel of trap', daklicht: 'Daklicht' };

let gereedschap: Gereedschap = 'kies';
let meubelType = 'bank3';
let daklichtType = 'koepel_100';
/**
 * Het palet dat open staat (Meubel of Daklicht), of geen. Het blijft open na het plaatsen (dan staat Selecteren aan: wat
 * je plaatste, kun je meteen verslepen); *← Terug* of een ander gereedschap sluit het.
 */
let palet: Palet | undefined;
/** De groep van het meubelpalet die open staat (Zitten, Slapen, …, Trappen). */
let meubelGroep: string | undefined;
/** De knop *Ongedaan maken* (`#pl-ongedaan`): verhuist tussen de rij van het zoomen en de hoek van de 3D. */
let ongedaanKnop: HTMLButtonElement | undefined;
/** Dak op de bovenste verdieping tonen in de 3D (uit = erin kijken). */
let toonDakIn3D = true;
let selectie: Selectie;
let viewBox: { x: number; y: number; b: number; d: number } | undefined;
let zoom: Zoom | undefined;
/** Slepen op een leeg stuk verschuift het beeld (een klik zonder bewegen deselecteert). */
let pannen: { bewogen: boolean; x: number; y: number } | undefined;
/**
 * Een tik die pas bij het loslaten telt (zoals in de gevel-editor): op een maat (Selecteren) of op een muur (Ruimte met
 * maten). Schuift de vinger meer dan 8 beeldpunten, dan was het verschuiven van het beeld.
 */
let tikWacht: { soort: 'maat'; doel: string; el: Element } | { soort: 'gevel'; x: number; y: number } | undefined;
/** Een maat boven een ruimte, raam of meubel: na het loslaten zonder slepen de maatvraag (anders was het verslepen). */
let maatNaKlik: { doel: string; x: number; y: number } | undefined;
let voorbeeld: { x: number; y: number; b: number; d: number } | undefined;
let voorbeeldOpening: Opening | undefined;
let weergave: 'plan' | 'gevels' | '3d' | 'doorsnede' = 'plan';
let niveau = 0;
let alleNiveaus = true;
let voorbeeldWand: { x1: number; y1: number; x2: number; y2: number } | undefined;
/** Een losse wand die getekend wordt (gereedschap *Losse wand*). */
let voorbeeldLosseWand: LosseWand | undefined;
let viewer: Viewer3D | null | undefined;
let laag = false;
let toonMeubels = true;
let melding = '';
let naarPositie: (id: string) => void = () => {};
let naarOfferte: () => void = () => {};
let naarProjecten: () => void = () => {};
let naarVarianten: () => void = () => {};
/** Maatlijnen in de 3D (keuze *Maten tonen*): de hoofdmaten van het gebouw, en van het aangetikte raam. */
let toonMaten = false;
/** Het ding dat in de 3D aangetikt is (zie ding-ui.ts), of null. */
let gekozenDing: string | null = null;
/** Standpunt om te zetten zodra de volgende scène in de 3D staat (na de snelstart: een mooier beginbeeld). */
let volgendStandpunt: Standpunt | undefined;
/** Ruimer kader voor de camera (na de snelstart), tot je zelf een standpunt kiest. */
let ruimKader = false;
/**
 * Ronde 12: één ruimte van binnen in de 3D (met haar plafond), de kant `open` weg, of null (de woning). Zie
 * `ruimteVanBinnen` in de motor; het blijft tot *Terug naar de woning*, een andere weergave, verdieping of project, de
 * constructie, de techniek of *Toon in 3D*.
 */
let binnen: { ruimte: string; open: GevelKant } | null = null;
/** Hoeveel stops lichter de ruimte van binnen getoond wordt (het plafond krijgt alleen licht van onder). */
const BINNEN_HELDERHEID = 0.5;
/**
 * Het kader van de woning breder gemaakt (zelfde midden): de kijker zet de camera op anderhalve keer de breedte of de
 * diepte, wat op ooghoogte de bovenkant van een woning met een hellend dak afsnijdt. Zo staat ze er helemaal op, met
 * lucht erboven en gras ervoor.
 */
function ruimKaderVan(s: Scene3D): Scene3D {
  const k = s.kader, b = Math.max(k.b * 1.8, k.h * 1.8, k.d * 1.2);
  return { ...s, kader: { ...k, x: k.x - (b - k.b) / 2, b }, ruimKader: true };
}

interface Sleep {
  soort: 'teken' | 'wand' | 'ruimte' | 'greep' | 'hoek' | 'opening' | 'meubel' | 'daklicht' | 'losse' | 'lossewand' | 'wandeind';
  /** Een hoekpunt van een vrije vorm (greep `data-hoekgreep`). */
  hoek?: number;
  /** Een eindpunt van een losse wand (greep `data-wandgreep`). */
  eind?: 'van' | 'tot';
  /**
   * Een losse wand: waar het slepen begon, op het scherm en op het plan. Elke volgende plaats rekent vanaf daar met de
   * schaal van de tekening, niet met de ligging van de tekening op het scherm: die kan tijdens het slepen verschuiven
   * (in een proef 58 beeldpunten bij de eerste wijziging na het herladen), en dan zou de wand een stuk mee springen.
   */
  scherm?: { x: number; y: number; px: number; py: number };
  start: { x: number; y: number };
  id?: string;
  kant?: 'n' | 's' | 'w' | 'o';
  bewogen: boolean;
  orig?: string;
}
let sleep: Sleep | undefined;

/** De actieve verdieping (alleen-lezen kopie); wijzigen gebeurt via wijzig() op id. */
const plan = () => niveauPlan(toestand().plan, niveau);
/** Raster volgens de zoom: 10 cm, 5 cm of 1 cm als je ver inzoomt. */
/** Centimeter per schermpixel voor het huidige beeld (het tekenvlak is 100 % breed, hoogstens 72 % van het scherm hoog). */
function schaalNu(): number {
  // Als het tekenvlak er al staat: de echte schaal (ook bij groot scherm met witte randen).
  const svgNu = document.querySelector('#pl-canvas svg') as SVGSVGElement | null;
  if (zoom && svgNu?.getScreenCTM()?.a) return zoom.eenhedenPerPixel();
  const houder = document.getElementById('pl-canvas');
  const vb = zoom ? zoom.kijkvak() : passendKader();
  const w = houder?.clientWidth || 900;
  const h = Math.min((w * vb.d) / vb.b, window.innerHeight * 0.72);
  return Math.max(vb.b / w, vb.d / Math.max(1, h));
}
const rasterStap = () => {
  const e = schaalNu();
  return e < 0.35 ? 1 : e < 0.9 ? 5 : 10;
};
const fijn = () => Math.min(5, rasterStap());
const snap = (v: number, s = rasterStap()) => Math.round(v / s) * s;

/** Passend beeld: de verdieping, samen met de verdieping eronder (om erop te tekenen). */
function passendKader(): Kader {
  // Met de techniek aan ook wat buiten de woning staat (een buitenunit, een leiding naar de straat).
  const a = metVoorbeeld((techniekAan() ? planKaderMetTechniek : planKader)(plan(), 140));
  const onder = niveau > 0 ? niveauPlan(toestand().plan, niveau - 1) : undefined;
  if (!onder?.ruimtes.length) return a;
  const b = planKader(onder, 140);
  if (!plan().ruimtes.length) return b;
  const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
  return { x: x0, y: y0, b: Math.max(a.x + a.b, b.x + b.b) - x0, d: Math.max(a.y + a.d, b.y + b.d) - y0 };
}

/** Het voorbeeld van een ruimte met maten mee in beeld (met ruimte voor de maten). */
function metVoorbeeld(a: Kader): Kader {
  const v = matenKader();
  if (!v) return a;
  const x0 = Math.min(a.x, v.x - 140), y0 = Math.min(a.y, v.y - 140);
  return { x: x0, y: y0, b: Math.max(a.x + a.b, v.x + v.b + 140) - x0, d: Math.max(a.y + a.d, v.y + v.d + 140) - y0 };
}

/** Kader rond de selectie (om erop in te zoomen). */
function selectieKader(): Kader | undefined {
  const s = selectie;
  if (!s) return undefined;
  const pl = plan();
  if (s.soort === 'ruimte') {
    const r = pl.ruimtes.find((x) => x.id === s.id);
    if (!r) return undefined;
    const d = delenVan(r);
    const x0 = Math.min(...d.map((p) => p.x)), y0 = Math.min(...d.map((p) => p.y));
    return { x: x0, y: y0, b: Math.max(...d.map((p) => p.x + p.b)) - x0, d: Math.max(...d.map((p) => p.y + p.d)) - y0 };
  }
  if (s.soort === 'meubel') {
    const m = pl.meubels.find((x) => x.id === s.id);
    return m ? meubelVoetafdruk(m) : undefined;
  }
  if (s.soort === 'daklicht') {
    const l = pl.daklichten?.find((x) => x.id === s.id);
    return l ? { x: l.x, y: l.y, b: l.b, d: l.d } : undefined;
  }
  if (s.soort === 'toestel') {
    const t = pl.toestellen?.find((x) => x.id === s.id);
    return t ? { x: t.x - 60, y: t.y - 60, b: 120, d: 120 } : undefined;
  }
  if (s.soort === 'leiding') {
    const l = pl.leidingen?.find((x) => x.id === s.id);
    if (!l) return undefined;
    const xs = l.punten.map((q) => q[0]), ys = l.punten.map((q) => q[1]);
    return { x: Math.min(...xs) - 40, y: Math.min(...ys) - 40, b: Math.max(...xs) - Math.min(...xs) + 80, d: Math.max(...ys) - Math.min(...ys) + 80 };
  }
  if (s.soort === 'wand') {
    const w = pl.losseWanden?.find((x) => x.id === s.id);
    if (!w) return undefined;
    const xs = [w.van[0], w.tot[0]], ys = [w.van[1], w.tot[1]];
    return { x: Math.min(...xs) - 40, y: Math.min(...ys) - 40, b: Math.max(...xs) - Math.min(...xs) + 80, d: Math.max(...ys) - Math.min(...ys) + 80 };
  }
  const o = pl.openingen.find((x) => x.id === s.id);
  if (!o) return undefined;
  if (o.as === 's') {
    // Schuine muur: de hoeken van de opening (± 40 cm dwars) op het plan.
    const hoeken = [-1, 1].flatMap((a) => [-40, 40].map((w) => langsAs(o, o.midden + (a * o.breedte) / 2, o.lijn + w)));
    const xs = hoeken.map((q) => q[0]), ys = hoeken.map((q) => q[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), b: Math.max(...xs) - Math.min(...xs), d: Math.max(...ys) - Math.min(...ys) };
  }
  return o.as === 'h' ? { x: o.midden - o.breedte / 2, y: o.lijn - 40, b: o.breedte, d: 80 } : { x: o.lijn - 40, y: o.midden - o.breedte / 2, b: 80, d: o.breedte };
}

// ---------- tekenen ----------
function raamInfo(o: Opening) {
  return openingInfo(o);
}

function fouten(): Set<string> {
  const s = new Set<string>();
  for (const m of controleerPlan(toestand().plan, cat)) if (m.ernst === 'fout') { if (m.ruimte) s.add(m.ruimte); if (m.opening) s.add(m.opening); if (m.daklicht) s.add(m.daklicht); if (m.toestel) s.add(m.toestel); if (m.leiding) s.add(m.leiding); }
  for (const o of plan().openingen) {
    const p = positieVan(o);
    if (p && !resultaat(p).geldig) s.add(o.id);
  }
  return s;
}

export function render() {
  const houder = $('#pl-canvas');
  // Een ander project kan minder verdiepingen hebben.
  niveau = Math.min(niveau, Math.max(0, verdiepingenVan(toestand().plan).length - 1));
  const onderlegger = niveau > 0 ? niveauPlan(toestand().plan, niveau - 1) : undefined;
  viewBox = zoom ? zoom.kijkvak() : passendKader();
  houder.innerHTML = tekenPlattegrond(techniekPlan(plan()), cat, {
    selectie, voorbeeld, voorbeeldOpening, voorbeeldWand, voorbeeldLosseWand, onderlegger, raamInfo, fouten: fouten(), viewBox, fijnRaster: rasterStap() < 10, schaal: schaalNu(),
    dakLijnen: dakLijnen(niveau), lichtstraten: LICHTSTRATEN, noordpijl: true,
    // Maten aantikken om ze te wijzigen, en het voorbeeld van een ruimte met maten. Met de techniek aan tik je op toestellen
    // en leidingen, niet op maten; de tekens en leidingen alleen dan (techniek-ui.ts).
    maatDoelen: !techniekAan(), voorbeeldVorm: matenVoorbeeld(), ...techniekTekenOpties(),
  });
  techniekNaTekenen();
  plaatsMaatVraag();
  zoom?.bijwerken();
  const zi = document.getElementById('pl-zoomhint');
  if (zi) zi.textContent = aanraak()
    ? `Zoomen: knijp met twee vingers of tik op + − · verschuiven: sleep op een leeg stuk · raster ${rasterStap()} cm`
    : `Zoomen: Ctrl (⌘) + scrollen of + − (in het groot scherm volstaat scrollen) · verschuiven: sleep op een leeg stuk · raster ${rasterStap()} cm`;
  houder.dataset.gereedschap = gereedschap;
  // Met de techniek aan staan de meubels lichter (de tekens en leidingen op de voorgrond).
  houder.toggleAttribute('data-techniek', techniekAan());
  toonGereedschapKaart();
  // Lege plattegrond: zeg wat je eerst doet (op het tekenvlak zelf, niet alleen in de hulpregel).
  const leeg = !toestand().plan.ruimtes.length;
  let kaart = document.getElementById('pl-leeg-kaart');
  if (leeg && !kaart) {
    kaart = el('div', { id: 'pl-leeg-kaart', class: 'leeg-kaart', role: 'note' });
    kaart.append(el('strong', {}, 'Begin met de eerste ruimte'), el('span', {}, 'Typ de maten van de muren in cm, of sleep op het raster een rechthoek (bv. 4 × 3 m). De muren volgen vanzelf; daarna plaats je ramen en deuren.'));
    const metMaten = el('button', { type: 'button', 'data-leeg-maten': '' }, 'Ruimte met maten');
    metMaten.addEventListener('click', () => kiesGereedschap('maten'));
    const proef = el('button', { type: 'button', class: 'tweede' }, 'Of start met de voorbeeldwoning');
    proef.addEventListener('click', () => naarProjecten());
    const rij = el('div', { class: 'knoppenrij' });
    rij.append(metMaten, proef);
    kaart.append(rij);
    houder.before(kaart);
  }
  if (kaart) kaart.hidden = !leeg || weergave !== 'plan';
  toonNiveaus();
  if (weergave === '3d') plan3D();
  if (weergave === 'gevels') gevelNaWijziging();
  if (weergave === 'doorsnede') toonDoorsnede();
}

function toonNiveaus() {
  const lijst = verdiepingenVan(toestand().plan);
  const vak = $('#pl-niveaus');
  vak.replaceChildren(...lijst.map((v, i) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(i === niveau) }, v.naam);
    b.addEventListener('click', () => { sluitMaatVraag(true); stopBinnen(false); niveau = i; selectie = undefined; render(); toonEigenschappen(); });
    return b;
  }));
  const plus = el('button', { type: 'button', class: 'tweede' }, '+ Verdieping');
  plus.addEventListener('click', nieuweVerdieping);
  vak.append(plus);
  if (lijst.length > 1 && niveau === lijst.length - 1) {
    const weg = el('button', { type: 'button', class: 'gevaar' }, 'Verdieping verwijderen') as HTMLButtonElement;
    zekerKnop(weg, 'Zeker? Alles op deze verdieping verdwijnt', () => {
      const n = niveau;
      wijzig('plan', (t) => {
        const weg = new Set(t.plan.openingen.filter((o) => niveauVan(o) === n).map((o) => o.positie).filter(Boolean));
        t.posities = t.posities.filter((p) => !weg.has(p.id));
        t.plan.ruimtes = t.plan.ruimtes.filter((r) => niveauVan(r) !== n);
        t.plan.openingen = t.plan.openingen.filter((o) => niveauVan(o) !== n);
        t.plan.meubels = t.plan.meubels.filter((m) => niveauVan(m) !== n);
        if (t.plan.daklichten) t.plan.daklichten = t.plan.daklichten.filter((l) => niveauVan(l) !== n);
        if (t.plan.losseWanden) t.plan.losseWanden = t.plan.losseWanden.filter((w) => niveauVan(w) !== n);
        if (t.plan.toestellen) t.plan.toestellen = t.plan.toestellen.filter((x) => niveauVan(x) !== n);
        if (t.plan.leidingen) t.plan.leidingen = t.plan.leidingen.filter((x) => niveauVan(x) !== n);
        // Stroken op die verdieping (ronde 14); een strook over de hele gevel blijft.
        for (const s of (t.plan.gevelOntwerp?.stroken ?? []).filter((x) => x.niveau === n)) verwijderStrook(t.plan, s.id);
        t.plan.verdiepingen = verdiepingenVan(t.plan).slice(0, n);
      });
      niveau = n - 1;
      selectie = undefined;
      render();
      toonEigenschappen();
    });
    vak.append(weg);
  }
}

/**
 * Nieuwe verdieping: één ruimte boven de hele verdieping eronder, om daarna in te delen. Is de verdieping eronder geen
 * rechthoek (een L-vorm, een schuine aanbouw), dan stak die ene rechthoek uit boven niets (doorloop A4): dan komt er
 * boven elke ruimte van beneden een ruimte met dezelfde vorm.
 */
function nieuweVerdieping() {
  const t = toestand();
  const lijst = verdiepingenVan(t.plan);
  const n = lijst.length;
  const onderRuimtes = niveauPlan(t.plan, n - 1).ruimtes;
  const onder = onderRuimtes.flatMap(delenVan);
  let gevolgd = false;
  wijzig('plan', (tt) => {
    tt.plan.verdiepingen = [...lijst, { naam: `Verdieping ${n}` }];
    if (onder.length) {
      const x0 = Math.min(...onder.map((p) => p.x)), y0 = Math.min(...onder.map((p) => p.y));
      const x1 = Math.max(...onder.map((p) => p.x + p.b)), y1 = Math.max(...onder.map((p) => p.y + p.d));
      const geheel: Ruimte = { id: nieuweId('r'), naam: 'Nieuwe verdieping', type: 'hal', x: x0, y: y0, b: x1 - x0, d: y1 - y0, vloer: 'parket_eik', wand: 'wit', niveau: n };
      if (zonderOndergrond(tt.plan, geheel, n) < 0.5) tt.plan.ruimtes.push(geheel);
      else {
        gevolgd = true;
        for (const r of onderRuimtes) {
          const kopie: Ruimte = structuredClone(r);
          delete kopie.bestaand;
          tt.plan.ruimtes.push({ ...kopie, id: nieuweId('r'), naam: `Boven ${r.naam.toLowerCase()}`, type: 'hal', vloer: 'parket_eik', wand: 'wit', niveau: n });
        }
      }
    }
  });
  niveau = n;
  selectie = undefined;
  melding = 'Nieuwe verdieping: deel ze in met "Wand tekenen" of teken ruimtes erin. Plaats beneden een trap (Inrichting → Trap).';
  if (gevolgd) melding = `Nieuwe verdieping met dezelfde vorm als beneden (${onderRuimtes.length} ruimtes). ${melding.replace(/^Nieuwe verdieping: d/, 'D')}`;
  kiesGereedschap('wand');
}

/**
 * De namen van de knoppen Voorgevel en Achtergevel volgen de voordeur (16/11, doorloop A5): de 3D kijkt met *Voorgevel*
 * altijd naar de onderkant van het plan. Staat de voordeur aan de bovenkant (een aanbouw achteraan, onderaan getekend),
 * dan is dat de achtergevel, en dan heten de knoppen zo, zoals in de gevel-editor.
 */
function zetStandpuntNamen() {
  const plan = toestand().plan;
  const voordeur = plan.openingen.find((o) => niveauVan(o) === 0 && positieVan(o)?.keuzes.type === 'voordeur');
  const omgekeerd = !!voordeur && kantVan(plan, voordeur) === 'boven';
  const voor = document.querySelector<HTMLButtonElement>('[data-pl-standpunt="voor"]'), achter = document.querySelector<HTMLButtonElement>('[data-pl-standpunt="achter"]');
  if (voor) voor.textContent = omgekeerd ? 'Achtergevel' : 'Voorgevel';
  if (achter) achter.textContent = omgekeerd ? 'Voorgevel' : 'Achtergevel';
}

let wachtend3D = false;
function plan3D() {
  zetStandpuntNamen();
  // De schakelaar "Dak tonen" heeft alleen zin met een dakkeuze (de constructie heeft altijd een dak).
  $('#pl-toon-dak-label').hidden = !heeftDak() && !constructieAan();
  // De knop Techniek (alleen met techniek in het plan of aan) en de balk eronder.
  toonBalk3D();
  if (!viewer || wachtend3D) return;
  wachtend3D = true;
  requestAnimationFrame(() => {
    wachtend3D = false;
    // Ronde 12: één ruimte van binnen (het plafond, de plint, de accentmuur), van op ooghoogte door de open kant.
    if (binnen && toonBinnen3D()) return;
    // Lichtinval: de zon uit de gekozen richting, en wat verborgen is werpt nog schaduw.
    viewer?.zon?.(zonVoorKijker());
    // Techniek in de woning: de verdieping waarop je werkt met lage muren en zonder dak, anders zie je niets (16/11).
    const tw = techniekInWoning(), muurLaag = laag || tw;
    // Zonder dakkeuze het standaard platte dak, zoals in de constructie, de doorsnede en het bestand voor de klant (doorloop A3).
    const scene = plattegrond3D(planMetDak(toestand().plan), cat, {
      laag: muurLaag ? 110 : undefined,
      meubels: toonMeubels,
      dak: toonDakIn3D && !tw,
      lichtinval: lichtinvalAan(),
      // Terras en pad horen bij de woning (gegevens); lucht, gras en horizon tekent de kijker (omgeving 'buiten').
      aanleg: true,
      gevelkoppen: true,
      // Elk blok zegt bij welk ding het hoort: tik op het dak, een raam of een gevel (zie ding-ui.ts).
      dingen: true,
      totNiveau: alleNiveaus && !muurLaag ? undefined : niveau,
      inhoud: openingInhoud,
      // Techniek (ronde 10b): de installaties, in de woning of uitgezet (alleen als de techniek aan staat); uitgezet
      // alleen de verdieping waarop je werkt.
      ...techniek3DOpties(niveau),
      // Ronde 10c: in Afgewerkt wat je van de techniek buiten ziet (buitenunit, laadpaal, dakdoorvoer …), op ware grootte.
      techniekBuiten: true,
      // Ronde 15: de ledstrips als dun profiel, en wat 's nachts licht geeft (ramen, lampen, strips) voor de nachtweergave.
      verlichting: true,
    });
    // Constructie (ronde 6): wanden, vloeren en dak als skelet, met het kader van de afgewerkte woning (de camera springt niet).
    const constructie = constructieAan();
    const getoond = constructie ? constructieScene({ laag: laag ? 110 : undefined, dak: toonDakIn3D, totNiveau: alleNiveaus && !laag ? undefined : niveau, kader: scene.kader, dingen: true }) : scene;
    // Maten tonen: breedte, diepte, hoogte en nok van het gebouw, en breedte en hoogte van het aangetikte raam of de deur.
    // De maten komen altijd van de afgewerkte woning.
    const metMaten: Scene3DMetMaten = toonMaten && !(techniekAan() && techniekUitgezet()) ? {
      ...getoond,
      maatlijnen: [...gebouwMaatlijnen(scene, { hoogtes: !laag }), ...(!constructie && gekozenDing?.startsWith('opening:') ? raamMaatlijnen(scene.blokken, { ding: gekozenDing }) : [])],
    } : getoond;
    // Na de snelstart een ruimer kader: de camera staat verder, zodat de hele woning met lucht erboven in beeld komt.
    // Met de techniek aan het krappe kader: de toestellen zo groot mogelijk in beeld.
    viewer?.toon(ruimKader && !techniekAan() ? ruimKaderVan(metMaten) : metMaten);
    // Het beeld in het overzicht (Het ontwerp) is dat van de afgewerkte woning, niet van het skelet.
    beeldActueel = !!viewer && !constructie && !techniekAan();
    // Dag of nacht (ronde 15): alleen in Afgewerkt; de constructie en de techniek tonen de dag.
    nachtIn3D();
    if (volgendStandpunt) { viewer?.standpunt(volgendStandpunt); volgendStandpunt = undefined; }
  });
  toonDingKeuzes();
}

/**
 * Ronde 12: de ruimte van binnen tonen (zie `binnen`). Geeft false als dat niet meer kan (de ruimte is weg, de constructie
 * of de techniek staat aan): dan terug naar de woning. Het beeld is niet dat van de woning (`beeldActueel` blijft uit).
 */
function toonBinnen3D(): boolean {
  const r = binnen && toestand().plan.ruimtes.find((x) => x.id === binnen!.ruimte);
  if (!binnen || !r || constructieAan() || techniekAan()) { stopBinnen(false); return false; }
  const scene = ruimteVanBinnen(planMetDak(toestand().plan), cat, r.id, { open: binnen.open, inhoud: openingInhoud, meubels: toonMeubels, dingen: true });
  if (!scene) { stopBinnen(false); return false; }
  // Zonder lichtinval, en zonder lucht en gras: buiten kleurt het gras het plafond groen (het licht dat van onder komt) en
  // lijkt een wit plafond olijfgrijs. Op de effen achtergrond, met het zachte licht van een bewolkte dag en een halve stop
  // lichter, leest de ruimte als een maquette en is het plafond lichtgrijs in plaats van donker (de kijker kent geen licht
  // dat via de vloer en de muren weerkaatst). Bij het verlaten gaat alles terug (`stopBinnen`).
  viewer?.zon?.(null);
  viewer?.omgeving?.('geen');
  viewer?.licht?.('bewolkt');
  viewer?.instellen?.({ helderheid: BINNEN_HELDERHEID });
  viewer?.toon(scene);
  beeldActueel = false;
  if (volgendStandpunt) { viewer?.standpunt(volgendStandpunt); volgendStandpunt = undefined; }
  toonBinnenBalk();
  return true;
}

/** De balk boven de 3D van binnen: welke ruimte, de open kant draaien, terug naar de woning. */
function toonBinnenBalk() {
  const balk = $('#pl-binnenbalk');
  const r = binnen && toestand().plan.ruimtes.find((x) => x.id === binnen!.ruimte);
  balk.hidden = !r || weergave !== '3d';
  if (!r || !binnen) { balk.replaceChildren(); return; }
  const draai = el('button', { type: 'button', class: 'tweede', 'data-binnen-draai': '', title: 'Een andere muur open: zo kijk je naar een andere kant van de ruimte' }, '↻ Andere kant');
  draai.addEventListener('click', () => {
    if (!binnen) return;
    const volgorde: GevelKant[] = ['onder', 'links', 'boven', 'rechts'];
    binnen = { ...binnen, open: volgorde[(volgorde.indexOf(binnen.open) + 1) % 4]! };
    volgendStandpunt = 'ooghoogte';
    plan3D();
  });
  const terug = el('button', { type: 'button', 'data-binnen-terug': '' }, '← Terug naar de woning');
  terug.addEventListener('click', () => stopBinnen(true));
  balk.replaceChildren(el('span', {}, `Van binnen: ${r.naam}`), draai, terug);
}

/** Een ruimte van binnen bekijken (ronde 12): de 3D toont alleen die ruimte, met het plafond, op ooghoogte. */
export function bekijkVanBinnen(id: string, open?: GevelKant) {
  const r = toestand().plan.ruimtes.find((x) => x.id === id);
  if (!r) return;
  if (constructieAan()) zetConstructieWeergave('afgewerkt');
  if (techniekAan()) zetTechniek(false, { stil: true });
  binnen = { ruimte: id, open: open ?? openKantVan(r) };
  niveau = niveauVan(r);
  selectie = undefined;
  toonEigenschappen();
  volgendStandpunt = 'ooghoogte';
  ruimKader = false;
  if (weergave !== '3d') toonWeergave('3d');
  // Het paneel van de ruimte blijft onder de 3D open: wat je kiest, zie je meteen van binnen. Expliciet getoond: kwam je
  // uit de plattegrond, dan wacht `plan3D` al op het volgende beeld en toont het het paneel niet nog eens.
  gekozenDing = `ruimte:${id}`;
  viewer?.markeer?.(null);
  plan3D();
  toonDingKeuzes();
}

/** Terug van de ruimte van binnen naar de woning (`opnieuw`: de 3D meteen opnieuw tekenen, schuin). */
function stopBinnen(opnieuw: boolean) {
  if (!binnen) return;
  binnen = null;
  $('#pl-binnenbalk').hidden = true;
  // De woning staat weer buiten (lucht, gras, horizon), met het licht en de helderheid van altijd.
  viewer?.licht?.('studio');
  viewer?.instellen?.({ helderheid: 0 });
  viewer?.omgeving?.('buiten');
  if (opnieuw) { gekozenDing = null; viewer?.markeer?.(null); volgendStandpunt = 'schuin'; plan3D(); }
}

/** Tik in de 3D: het ding aanduiden en alleen zijn keuzes tonen (een tik naast de woning sluit het paneel). */
function tikIn3D(id: string | null) {
  const vorig = gekozenDing;
  gekozenDing = isDing(id) && !id.startsWith('schaduw_') ? id : null;
  viewer?.markeer?.(gekozenDing);
  // Met de maten aan: de maten van het nieuw gekozen raam (of geen raam meer).
  if (toonMaten && vorig !== gekozenDing && (vorig?.startsWith('opening:') || gekozenDing?.startsWith('opening:'))) plan3D();
  toonDingKeuzes();
  if (gekozenDing) $('#pl-3d-keuze').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function toonDingKeuzes() {
  const vak = $('#pl-3d-keuze');
  if (weergave !== '3d') { vak.hidden = true; return; }
  // In de constructie: de opbouw van wat je aantikt (een buitenmuur kan een eigen opbouw krijgen).
  if (constructieAan()) {
    toonOpbouwVanDing(vak, gekozenDing, () => tikIn3D(null));
    if (gekozenDing && vak.hidden) { gekozenDing = null; viewer?.markeer?.(null); }
    return;
  }
  toonDing(vak, gekozenDing, {
    sluit: () => tikIn3D(null), naarPositie: (id) => naarPositie(id), metMaten: (muur) => { tikIn3D(null); openRuimteMetMaten({ gevelMuur: muur }); }, naarGevel: (strook) => { tikIn3D(null); kiesStrookInGevel(strook); toonWeergave('gevels'); },
    // Ronde 12: het plafond zie je in de ruimte van binnen (in de ruimte van binnen zelf staat die knop er niet).
    vanBinnen: binnen ? undefined : (id) => bekijkVanBinnen(id),
  });
  // Bestaat het ding niet meer (verwijderd, ongedaan gemaakt): ook de aanduiding weg.
  if (gekozenDing && vak.hidden) { gekozenDing = null; viewer?.markeer?.(null); }
}

/** Na de snelstart: de woning in 3D, vanaf de eerste verdieping, met een beginbeeld waarop lucht en voorgevel te zien zijn. */
export function toonWoning3D(standpunt: Standpunt = 'ooghoogte') {
  stopBinnen(false);
  niveau = 0;
  selectie = undefined;
  gekozenDing = null;
  viewer?.markeer?.(null);
  zoom?.passendMaken();
  volgendStandpunt = standpunt;
  ruimKader = true;
  toonWeergave('3d');
}

/**
 * Ronde 11: de delen van een post van het werk (kaart *Werken* in het overzicht) aanduiden in de 3D van de woning, één
 * kader per groep (zie `markeer('~…')` in de kijker), vanuit een standpunt waarin ze te zien zijn. De volgende tik in de
 * 3D haalt de aanduiding weg.
 */
export function toonDingenIn3D(groepen: string[][], standpunt?: Standpunt, opties: { techniek?: boolean } = {}) {
  stopBinnen(false);
  selectie = undefined;
  gekozenDing = null;
  if (standpunt) volgendStandpunt = standpunt;
  // De namen van de blokken zijn die van de afgewerkte woning; de toestellen en leidingen staan alleen in de techniek.
  if (constructieAan()) zetConstructieWeergave('afgewerkt');
  if (!!opties.techniek !== techniekAan()) zetTechniek(!!opties.techniek, { stil: true });
  toonWeergave('3d');
  viewer?.markeer?.(groepen.length ? `~${groepen.map((g) => g.join(',')).join('|')}` : null);
}

function punt(ev: PointerEvent | MouseEvent): { x: number; y: number } {
  const svg = $('#pl-canvas').querySelector('svg') as SVGSVGElement | null;
  if (!svg) return { x: 0, y: 0 };
  const p = svg.createSVGPoint();
  p.x = ev.clientX;
  p.y = ev.clientY;
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const q = p.matrixTransform(m.inverse());
  return { x: q.x, y: q.y };
}

/** Kleef een waarde aan de dichtste bestaande lijn (randen van ruimtes) binnen een marge. */
function kleef(v: number, as: 'x' | 'y', marge = 18, behalve?: string): number {
  let beste = snap(v), afstand = marge;
  const onder = niveau > 0 ? niveauPlan(toestand().plan, niveau - 1).ruimtes : [];
  for (const r of [...plan().ruimtes, ...onder]) {
    if (r.id === behalve) continue;
    for (const p of delenVan(r)) {
      for (const l of as === 'x' ? [p.x, p.x + p.b] : [p.y, p.y + p.d]) {
        if (Math.abs(l - v) < afstand) { afstand = Math.abs(l - v); beste = l; }
      }
    }
  }
  return beste;
}

// ---------- nieuwe elementen ----------
function nieuweRuimteNaam(): string {
  let i = plan().ruimtes.length + 1;
  while (plan().ruimtes.some((r) => r.naam === `Ruimte ${i}`)) i++;
  return `Ruimte ${i}`;
}

function standaardOpening(soort: OpeningSoort, type?: RuimteType): { b: number; h: number; borst: number; extra: Keuzes } {
  switch (soort) {
    case 'raam':
      if (type === 'badkamer' || type === 'wc') return { b: 80, h: 80, borst: 140, extra: { vak1: 'kip', glas: 'mat_gelaagd', vensterbank: 'composiet' } };
      if (type === 'keuken') return { b: 160, h: 120, borst: 105, extra: { vakken: 'v2', vak1: 'vast', vak2: 'draaikip_r', vensterbank: 'geen' } };
      return { b: 120, h: 140, borst: 90, extra: { vak1: 'draaikip_l' } };
    case 'buitendeur':
      return type === 'hal'
        ? { b: 100, h: 230, borst: 0, extra: { type: 'voordeur', glas: 'dubbel_gelaagd' } }
        : { b: 90, h: 230, borst: 0, extra: { type: 'terrasdeur', vak1: 'draai_l', glas: 'dubbel_gelaagd' } };
    case 'schuifraam':
      return { b: 300, h: 230, borst: 0, extra: { type: 'schuif', glas: 'dubbel_gelaagd' } };
    case 'garagepoort':
      return { b: 250, h: 215, borst: 0, extra: {} };
    case 'binnendeur':
      return { b: 90, h: 211, borst: 0, extra: {} };
    default:
      return { b: 120, h: 220, borst: 0, extra: {} };
  }
}

/** Opening op de muur onder de muisaanwijzer (nog niet toegevoegd). */
function openingOp(soort: OpeningSoort, x: number, y: number): { opening: Opening; fout?: string; ruimte?: Ruimte } | undefined {
  const muren = murenVan(plan());
  const d = dichtsteMuur(muren, x, y, 45);
  if (!d) return undefined;
  const m = d.muur;
  const buiten = soort === 'raam' || soort === 'buitendeur' || soort === 'schuifraam' || soort === 'garagepoort';
  // Aan welke kant van de muur getikt werd (ook bij een schuine muur: dwars op haar as).
  const plusKant = opAs(m, [x, y])[1] > m.lijn;
  const binnenRuimteId = m.soort === 'buiten' ? (m.plus ?? m.min) : (plusKant ? m.plus : m.min);
  const ruimte = plan().ruimtes.find((r) => r.id === binnenRuimteId);
  const std = standaardOpening(soort, ruimte?.type);
  const lengte = m.tot - m.van;
  const breedte = Math.min(std.b, Math.max(40, lengte - 30));
  const midden = Math.min(m.tot - breedte / 2 - 10, Math.max(m.van + breedte / 2 + 10, snap(d.midden, fijn())));
  const binnenPlus = m.soort === 'buiten' ? !!m.plus : plusKant;
  const opening: Opening = {
    niveau,
    id: nieuweId('o'), soort, ...opMuur(m, midden), breedte, hoogte: std.h, borstwering: std.borst,
    scharnier: 'begin', naarPlus: binnenPlus, deurtype: soort === 'binnendeur' ? 'schilder' : undefined,
  };
  // Een halve rasterstap van het midden van de vrije muur: precies in het midden (anders blijft wat je tikte).
  const af = openingAfstanden({ ...plan(), openingen: [...plan().openingen, opening] }, opening, muren);
  if (af && Math.abs(opening.midden - (af.vlakBegin + af.vlakEinde) / 2) < fijn() / 2) opening.midden = Math.round(((af.vlakBegin + af.vlakEinde) / 2) * 10) / 10;
  let fout: string | undefined;
  if (buiten && m.soort !== 'buiten') fout = 'Ramen en buitendeuren horen in een buitenmuur.';
  if (!buiten && m.soort !== 'binnen') fout = 'Binnendeuren en doorgangen horen in een binnenmuur.';
  return { opening, fout, ruimte };
}

// ---------- de uitleg na een tik, bij de tik (doorloop A14) ----------

let tikMeldingKlok = 0;
/**
 * De uitleg na een tik die niet kan bij de tik zelf, in het zichtbare deel van de tekening; wat een tik met de techniek
 * deed (`info`: de technische ruimte, een leiding) onderaan dat deel, zodat ze het resultaat niet bedekt. Vroeger stond
 * de uitleg alleen bovenaan de eigenschappen: op een tablet tot 340 beeldpunten onder het scherm, en de verkoper zag
 * alleen dat zijn tik niets deed. Ze vangt zelf geen tik (`pointer-events: none`) en verdwijnt bij de volgende tik op de
 * tekening, bij een ander gereedschap of na een tijd die met de lengte van de tekst meegroeit. De melding blijft ook bij
 * de eigenschappen staan, zoals vroeger.
 */
export function tikMelding(tekst: string, bij?: Punt, soort: 'weiger' | 'info' = 'weiger') {
  const vlak = $('#pl-canvas').parentElement;
  if (!vlak || !tekst) return;
  let m = vlak.querySelector<HTMLElement>('.tikmelding');
  if (!m) {
    m = el('div', { class: 'tikmelding', role: 'status', 'aria-live': 'polite' });
    vlak.append(m);
  }
  m.textContent = tekst;
  m.classList.toggle('info', soort === 'info');
  m.hidden = false;
  plaatsTikMelding(m, soort === 'info' ? undefined : bij);
  window.clearTimeout(tikMeldingKlok);
  const doos = m;
  tikMeldingKlok = window.setTimeout(() => { doos.hidden = true; }, Math.max(5000, tekst.length * 70));
}

function verbergTikMelding() {
  const m = $('#pl-canvas').parentElement?.querySelector<HTMLElement>('.tikmelding');
  if (m) m.hidden = true;
}

/** Boven de tik (anders eronder), of zonder tik onderaan; binnen het deel van de tekening dat op het scherm staat. */
function plaatsTikMelding(m: HTMLElement, bij?: Punt) {
  const vlak = m.parentElement!, svg = $('#pl-canvas').querySelector('svg');
  const v = vlak.getBoundingClientRect(), s = (svg ?? vlak).getBoundingClientRect();
  const boven = Math.max(s.top, 0), onder = Math.min(s.bottom, window.innerHeight);
  const b = m.offsetWidth, h = m.offsetHeight;
  let x = (s.left + s.right) / 2, t = onder - h - 6;
  const ctm = svg?.getScreenCTM();
  if (bij && ctm) {
    const q = new DOMPoint(bij[0], bij[1]).matrixTransform(ctm);
    x = q.x;
    t = q.y - h - 22;
    if (t < boven + 6) t = q.y + 22;
  }
  const l = Math.min(s.right - b - 6, Math.max(s.left + 6, x - b / 2));
  t = Math.max(boven + 6, Math.min(onder - h - 6, t));
  m.style.left = `${Math.round(l - v.left)}px`;
  m.style.top = `${Math.round(t - v.top)}px`;
}

/** Een tik die niet kan: de uitleg bij de tik en bij de eigenschappen. */
function weiger(tekst: string, bij?: Punt) {
  melding = tekst;
  render();
  toonEigenschappen();
  tikMelding(tekst, bij);
}

function plaatsOpening(soort: OpeningSoort, x: number, y: number) {
  const r = openingOp(soort, x, y);
  // In een plan zonder ruimte is er nog geen muur: zeg wat eerst moet (niet "dichter bij een muur").
  if (!r) { weiger(plan().ruimtes.length ? voorVinger('Klik dichter bij een muur.') : 'Teken eerst een ruimte: ramen en deuren komen in haar muren.', [x, y]); return; }
  if (r.fout) { weiger(r.fout, [x, y]); return; }
  bewaarNieuweOpening(soort, r.opening, r.ruimte);
  melding = '';
  selectie = { soort: 'opening', id: r.opening.id };
  kiesGereedschap('kies');
  // Meteen de maten: breedte en afstand tot de dichtste hoek (wie niets typt, houdt wat hij tikte).
  vraagOpening(r.opening.id);
}

/** Voegt een nieuwe opening toe; een raam of buitendeur krijgt meteen een offertepositie. */
function bewaarNieuweOpening(soort: OpeningSoort, o: Opening, ruimte: Ruimte | undefined) {
  const r = { ruimte };
  wijzig('plan', (t) => {
    if (soort === 'garagepoort') {
      const p = nieuwePositie('POORT', { breedte: o.breedte * 10, hoogte: o.hoogte * 10 }, `Garagepoort ${r.ruimte?.naam.toLowerCase() ?? ''}`.trim());
      o.positie = p.id;
      t.posities.push(p);
    }
    if (soort === 'raam' || soort === 'buitendeur' || soort === 'schuifraam') {
      const std = standaardOpening(soort, r.ruimte?.type);
      const naam = `${soort === 'raam' ? 'Raam' : soort === 'schuifraam' ? 'Schuifraam' : std.extra.type === 'voordeur' ? 'Voordeur' : 'Terrasdeur'} ${r.ruimte?.naam.toLowerCase() ?? ''}`.trim();
      const droog = r.ruimte && ['leefruimte', 'slaapkamer', 'bureau'].includes(r.ruimte.type);
      const p = nieuwePositie('RAAM', {
        ...std.extra, breedte: o.breedte * 10, hoogte: o.hoogte * 10, borstwering: o.borstwering * 10,
        rooster: !!droog && std.extra.type !== 'voordeur',
        ...(o.borstwering < 85 && !std.extra.glas ? { glas: 'dubbel_gelaagd' } : {}),
      }, naam);
      o.positie = p.id;
      t.posities.push(p);
    }
    t.plan.openingen.push(o);
  });
  // Buigt de tussenstijl te ver door bij de winddruk van die plaats (een breed schuifraam), dan meteen een versterkte
  // tussenstijl of een koppelprofiel (16/11, doorloop A22: de verkoper kreeg een fout voor iets wat hij niet koos).
  const nieuw = o.positie;
  for (const sterker of ['versterkt', 'koppel']) {
    const p = nieuw ? toestand().posities.find((x) => x.id === nieuw) : undefined;
    if (!p || p.model !== 'RAAM' || !resultaat(p).meldingen.some((m) => m.code === 'statiek')) break;
    wijzig('plan', (t) => { const q = t.posities.find((x) => x.id === nieuw); if (q) q.keuzes = { ...q.keuzes, tussenstijl: sterker }; }, { zonderOngedaan: true });
  }
}

/** Raam toevoegen vanuit de gevel-editor: op een buitenmuur van een verdieping, op een plaats langs de muur. */
function voegRaamToe(n: number, muurId: string, midden: number): string | undefined {
  const pl = niveauPlan(toestand().plan, n);
  const m = murenVan(pl).find((x) => x.id === muurId);
  if (!m || m.soort !== 'buiten') return undefined;
  const ruimte = pl.ruimtes.find((r) => r.id === (m.plus ?? m.min));
  const std = standaardOpening('raam', ruimte?.type);
  const breedte = Math.min(std.b, Math.max(40, m.tot - m.van - 30));
  const mid = Math.min(m.tot - breedte / 2 - 10, Math.max(m.van + breedte / 2 + 10, Math.round(midden / 5) * 5));
  const o: Opening = {
    niveau: n, id: nieuweId('o'), soort: 'raam', ...opMuur(m, mid), breedte, hoogte: std.h, borstwering: std.borst,
    scharnier: 'begin', naarPlus: !!m.plus,
  };
  bewaarNieuweOpening('raam', o, ruimte);
  return o.id;
}

function splits(x: number, y: number, staand: boolean) {
  const r = ruimteOp(plan(), x, y);
  if (!r) { weiger(voorVinger('Klik in een ruimte om ze in twee te delen.'), [x, y]); return; }
  const lijn = staand ? kleef(x, 'x', 10, r.id) : kleef(y, 'y', 10, r.id);
  // Het binnenvlak van de ruimte op die plaats en het plan vóór het indelen (om de wand op een gemeten plaats te zetten).
  const rand = binnenRand(toestand().plan, r, staand ? 'v' : 'h', [x, y]);
  const voor = structuredClone(toestand().plan);
  if (!deelMetWand(staand ? 'v' : 'h', lijn, staand ? y : x, staand ? y : x) || !rand) return;
  vraagWand(staand, lijn, [x, y], rand, voor);
}

/** "hij" (de koepel), "ze" (de lichtstraat) of "het" (het dakraam), voor de uitleg bij een daklicht. */
const daklichtHij = (type: string) => ({ dakraam: 'het', lichtstraat: 'ze' } as Record<string, string>)[cat.daklichten?.[type]?.vorm ?? ''] ?? 'hij';

/**
 * Een ander daklicht op dezelfde verdieping dat over dit daklicht ligt of er minder dan 20 cm naast (doorloop A19). Zelfde
 * regel als de controle (`controleerPlan`): wat hier geweigerd wordt, zou er meteen als fout staan.
 */
function daklichtTeDicht(l: Pick<DakLicht, 'id' | 'x' | 'y' | 'b' | 'd'> & { niveau?: number }): DakLicht | undefined {
  return (toestand().plan.daklichten ?? []).find((a) => a.id !== l.id && niveauVan(a) === (l.niveau ?? 0)
    && Math.min(a.x + a.b, l.x + l.b) - Math.max(a.x, l.x) > -20 && Math.min(a.y + a.d, l.y + l.d) - Math.max(a.y, l.y) > -20);
}

/** De uitleg als een daklicht te dicht bij een ander komt. */
const teDichtTekst = (type: string, ander: DakLicht) =>
  `Hier kan geen ${(cat.daklichten?.[type]?.label ?? 'daklicht').toLowerCase()}: ${daklichtHij(type)} ligt over of minder dan 20 cm naast een ander daklicht (${(cat.daklichten?.[ander.type]?.label ?? 'daklicht').toLowerCase()}). Tik verder weg, of versleep het andere.`;

/**
 * Plaatst een daklicht (lichtkoepel, lichtstraat of plat dakraam) met het midden op de tik; alleen op een plat dak,
 * volledig boven één ruimte, en niet over of tegen een ander daklicht.
 */
function plaatsDaklicht(x: number, y: number) {
  const type = cat.daklichten?.[daklichtType];
  if (!type) return;
  const l: DakLicht = { id: nieuweId('k'), type: daklichtType, x: snap(x - type.b / 2, fijn()), y: snap(y - type.d / 2, fijn()), b: type.b, d: type.d, niveau };
  // Proef op een kopie: ligt hij op een plat dak?
  const proef = structuredClone(toestand().plan);
  (proef.daklichten ??= []).push(l);
  const reden = dakOpbouw(proef, cat)?.daklichten.find((q) => q.licht.id === l.id)?.reden;
  voorbeeld = undefined;
  if (reden) { weiger(`Hier kan geen ${type.label.toLowerCase()}: ${daklichtHij(daklichtType)} ${reden}`, [x, y]); return; }
  const ander = daklichtTeDicht(l);
  if (ander) { weiger(teDichtTekst(daklichtType, ander), [x, y]); return; }
  wijzig('plan', (t) => { metDak(t); (t.plan.daklichten ??= []).push(l); });
  selectie = { soort: 'daklicht', id: l.id };
  melding = '';
  kiesGereedschap('kies');
}

/**
 * Deelt alle ruimtes die een wand kruist; minstens 60 cm aan elke kant. `getekend` = de wand werd getrokken (gereedschap
 * *Wand tekenen*), van `van` tot `tot`; anders een tik met *Indelen* (de hele ruimte).
 */
function deelMetWand(as: 'h' | 'v', lijn: number, van: number, tot: number, getekend = false): boolean {
  // Eerst op een kopie: komt de nieuwe wand uit op een raam, deur of poort, dan staat die niet meer op één muur
  // (16/11, doorloop A21: de garagepoort werd ongeldig zonder uitleg). Dan niet indelen, met de reden.
  const proef = structuredClone(toestand().plan);
  const voor = murenVan(niveauPlan(proef, niveau));
  splitsRuimtes(proef, niveau, as, lijn, Math.min(van, tot), Math.max(van, tot), (oud) => ({ ...oud, id: nieuweId('r'), delen: undefined }), 60);
  const na = murenVan(niveauPlan(proef, niveau));
  const geraakt = proef.openingen.find((o) => niveauVan(o) === niveau && muurVanOpening(o, voor) && !muurVanOpening(o, na));
  if (geraakt) {
    const naam = ({ raam: 'een raam', buitendeur: 'een buitendeur', schuifraam: 'een schuifraam', binnendeur: 'een binnendeur', doorgang: 'een doorgang', garagepoort: 'een garagepoort' } as Record<OpeningSoort, string>)[geraakt.soort];
    const bij: Punt = as === 'v' ? [lijn, (van + tot) / 2] : [(van + tot) / 2, lijn];
    // Een wand die indeelt, loopt door de hele ruimte tot tegen de overkant. Stopte de getrokken wand ver vóór de opening
    // (17/11, melding van Jonas: "het schuifraam was aan de andere kant van de kamer"), dan wilde de verkoper een muur
    // die halverwege stopt: dan een losse wand zoals hij ze trok (de ruimte blijft één ruimte).
    const a0 = Math.min(van, tot), a1 = Math.max(van, tot);
    const afstand = geraakt.lijn < a0 ? a0 - geraakt.lijn : geraakt.lijn > a1 ? geraakt.lijn - a1 : 0;
    if (getekend && geraakt.as !== as && afstand >= 30) {
      const w = nieuweLosseWand(as === 'v' ? [lijn, a0] : [a0, lijn], as === 'v' ? [lijn, a1] : [a1, lijn], nieuweId('w'));
      plaatsLosseWand(w);
      melding = `Dit is een losse wand geworden: een wand die indeelt, loopt door tot tegen de overkant en zou daar uitkomen op ${naam}. De ruimte blijft één ruimte; schuif de wand op als je toch twee ruimtes wilt.`;
      toonEigenschappen();
      tikMelding(melding, bij, 'info');
      return true;
    }
    weiger(`Een wand die indeelt, loopt door de hele ruimte en komt hier uit op ${naam}: schuif de wand een stukje op, verschuif eerst de opening, of kies *Losse wand* voor een muur die halverwege stopt.`.replace(/\*/g, ''), bij);
    return false;
  }
  let nieuw: Ruimte[] = [];
  wijzig('plan', (t) => {
    nieuw = splitsRuimtes(t.plan, niveau, as, lijn, Math.min(van, tot), Math.max(van, tot), (oud) => ({ ...oud, id: nieuweId('r'), naam: nieuweRuimteNaam(), delen: undefined }), 60);
  });
  if (!nieuw.length) {
    weiger('Geen ruimte gedeeld: de wand moet door een ruimte lopen, minstens 60 cm van de rand.', as === 'v' ? [lijn, (van + tot) / 2] : [(van + tot) / 2, lijn]);
    return false;
  }
  selectie = { soort: 'ruimte', id: nieuw[0]!.id };
  melding = `${nieuw.length === 1 ? 'Ruimte' : `${nieuw.length} ruimtes`} ingedeeld. Vergeet geen deur of doorgang naar de nieuwe ruimte.`;
  kiesGereedschap('kies');
  return true;
}

// ---------- losse wand (ronde 2d): een muur die niets opdeelt ----------

/** De losse wanden van de actieve verdieping, behalve één (die gesleept of gemeten wordt). */
const andereWanden = (behalve?: string) => (plan().losseWanden ?? []).filter((w) => w.id !== behalve);
/** Tot hoever naast een muur een eindpunt eraan kleeft: 14 beeldpunten. */
const wandMarge = () => Math.max(6, 14 * schaalNu());

/**
 * Een eindpunt van een losse wand: op de as van een muur of een andere losse wand als je er tot 14 beeldpunten naast tikt
 * (daar sluit ze aan), anders aan de lijnen van de ruimtes en het raster, zoals een ruimte tekenen.
 */
function wandPunt(x: number, y: number, behalve?: string): Punt {
  const k = kleefAanWand([x, y], murenVan(plan()), andereWanden(behalve), wandMarge());
  return k ? k.punt : [kleef(x, 'x', 12), kleef(y, 'y', 12)];
}

/**
 * Het tweede eindpunt tijdens het slepen: bijna liggend of staand (binnen 6°) wordt recht (een vinger sleept nooit helemaal
 * recht), en het kleeft aan een muur als dat op die rechte lijn kan. Schuin: op het raster.
 */
function wandEind(start: Punt, x: number, y: number, behalve?: string): Punt {
  const dx = x - start[0], dy = y - start[1];
  const hoek = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
  const recht = Math.hypot(dx, dy) < 1 ? undefined : hoek < 6 ? 'h' : hoek > 84 ? 'v' : undefined;
  const los: Punt = recht === 'h' ? [x, start[1]] : recht === 'v' ? [start[0], y] : [x, y];
  const k = kleefAanWand(los, murenVan(plan()), andereWanden(behalve), wandMarge());
  if (k && (!recht || Math.abs(recht === 'h' ? k.punt[1] - start[1] : k.punt[0] - start[0]) < 0.5)) return k.punt;
  if (recht === 'h') return [kleef(los[0], 'x', 12), start[1]];
  if (recht === 'v') return [start[0], kleef(los[1], 'y', 12)];
  return [snap(los[0], fijn()), snap(los[1], fijn())];
}

/** Een nieuwe losse wand: binnen zo dik als een binnenmuur en tot het plafond, buiten 20 cm dik en 180 cm hoog (een tuinmuur). */
function nieuweLosseWand(van: Punt, tot: Punt, id: string): LosseWand {
  const w: LosseWand = { id, van, tot, dikte: plan().binnenmuur, niveau };
  return losseWandRuimte(plan(), w) ? w : { ...w, dikte: 20, hoogte: 180 };
}

/** Bewaart een net getekende losse wand en vraagt haar maten (wie niets typt, houdt wat hij sleepte). */
function plaatsLosseWand(w: LosseWand) {
  const v = losseWandVlak(w, murenVan(plan()), andereWanden());
  if (losseWandLengte(v) < LOSSE_WAND_MIN) {
    weiger(`Sleep van het begin naar het einde van de muur (minstens ${LOSSE_WAND_MIN} cm).`, w.van);
    return;
  }
  wijzig('plan', (t) => { (t.plan.losseWanden ??= []).push(w); });
  selectie = { soort: 'wand', id: w.id };
  melding = losseWandRuimte(plan(), w) ? 'Losse wand geplaatst: de ruimte blijft één ruimte.' : 'Losse muur buiten geplaatst (bv. een tuinmuur).';
  kiesGereedschap('kies');
  vraagLosseWand(w.id);
}

/**
 * De maten van een losse wand, na het tekenen of na een tik op haar maat: de lengte (wat gebouwd wordt, vanaf de muur
 * waartegen ze staat; het vrije einde schuift), de vrije maat tot de evenwijdige muur aan een gekozen kant (de wand
 * schuift dwars) en de hoogte. Wat je typt, zie je meteen; één keer *Ongedaan maken* zet alles terug. `opMaat` = geopend
 * met een tik op een maat (dan meteen typen).
 */
function vraagLosseWand(id: string, opMaat = false, kant?: string) {
  const pl = plan();
  const w0 = pl.losseWanden?.find((x) => x.id === id);
  if (!w0) return;
  const muren = murenVan(pl), andere = andereWanden(id);
  const v0 = losseWandVlak(w0, muren, andere);
  const af = losseWandAfstanden(w0, muren);
  const kanten = (['min', 'plus'] as const).filter((k) => af[k]);
  const kant0 = kanten.find((k) => k === kant) ?? [...kanten].sort((a, b) => af[a]!.vrij - af[b]!.vrij)[0];
  // Het vrije einde schuift als de lengte verandert; een einde tegen een muur blijft staan.
  const welk = v0.aan[1].soort === 'vrij' || v0.aan[0].soort !== 'vrij' ? 'einde' : 'begin';
  const binnen = !!losseWandRuimte(pl, w0), H = pl.muurhoogte;
  const alDoor = !!losseWandDoorMuur(w0, muren, andere, v0);
  const nieuw = (w: Record<string, number>, k: string | undefined): LosseWand => {
    let x = metLengte(w0, v0, w.lengte!, welk);
    if ((k === 'min' || k === 'plus') && w.afstand !== undefined) {
      const nu = losseWandAfstanden(x, muren)[k];
      if (nu) x = dwarsVerschoven(x, (k === 'min' ? 1 : -1) * (w.afstand - nu.vrij));
    }
    const rest: LosseWand = { ...x };
    delete rest.hoogte;
    return binnen && w.hoogte! >= H - 0.5 ? rest : { ...rest, hoogte: w.hoogte! };
  };
  vraagMaat({
    titel: binnen ? 'Losse wand: maten' : 'Losse muur buiten: maten',
    velden: [
      { code: 'lengte', label: 'Lengte', waarde: Math.round(losseWandLengte(v0) * 10) / 10, min: LOSSE_WAND_MIN },
      ...(kant0 ? [{ code: 'afstand', label: 'Vrij tot de muur', waarde: af[kant0]!.vrij, min: 0 }] : []),
      { code: 'hoogte', label: 'Hoogte', waarde: w0.hoogte ?? H, min: 20, max: binnen ? H : 600 },
    ],
    ...(kant0 ? { kanten: { label: 'Tot de muur', opties: kanten.map((k): [string, string] => [k, af[k]!.naam]), gekozen: kant0 } } : {}),
    bijKant: (k): Record<string, number> => {
      const x = plan().losseWanden?.find((q) => q.id === id);
      const a = x && (k === 'min' || k === 'plus') ? losseWandAfstanden(x, muren)[k] : undefined;
      return a ? { afstand: a.vrij } : {};
    },
    knoppen: binnen ? [{ label: 'Tot het plafond', waarden: () => ({ hoogte: H }) }] : [],
    uitleg: `Lengte: wat gebouwd wordt${v0.aan.some((a) => a.soort !== 'vrij') ? ', vanaf de muur waartegen ze staat' : ''}. Vrij tot de muur: van het vlak van de muur tot de wand. Een losse wand deelt de ruimte niet.`,
    meteenTypen: opMaat,
    toepassen: (w, k, eerste) => {
      const x = nieuw(w, k);
      const v = losseWandVlak(x, muren, andere);
      if (Math.abs(losseWandLengte(v) - w.lengte!) > 0.5 || (!alDoor && losseWandDoorMuur(x, muren, andere, v))) return 'Zo kan het niet: de wand zou door een muur lopen.';
      if (eerste) momentopname();
      wijzig('plan', (t) => { const i = t.plan.losseWanden?.findIndex((q) => q.id === id) ?? -1; if (i >= 0) t.plan.losseWanden![i] = x; }, { zonderOngedaan: true });
      return undefined;
    },
    terug: () => ongedaan(),
  });
}

// ---------- maten typen: na een tik, en op de tekening ----------

/** Namen van de twee uiteinden van een muur: links en rechts (liggend), boven en onder (staand of schuin). */
const eindNamen = (as: 'h' | 'v' | 's'): [string, string] => (as === 'h' ? ['links', 'rechts'] : ['boven', 'onder']);

/** Een raam of deur net geplaatst (of aangetikt): breedte en afstand tot de dichtste hoek, in cm. */
function vraagOpening(id: string) {
  const o = plan().openingen.find((x) => x.id === id);
  const af = o && openingAfstanden(toestand().plan, o);
  if (!o || !af) return;
  const vrij = af.vlakEinde - af.vlakBegin;
  const kant = af.begin <= af.einde ? 'begin' : 'einde';
  const [a, b] = eindNamen(o.as);
  const titels: Record<OpeningSoort, string> = { raam: 'Raam', buitendeur: 'Buitendeur', schuifraam: 'Schuifraam', binnendeur: 'Binnendeur', doorgang: 'Doorgang', garagepoort: 'Garagepoort' };
  const nu = () => { const x = plan().openingen.find((q) => q.id === id); return x && openingAfstanden(toestand().plan, x); };
  vraagMaat({
    titel: `${titels[o.soort]}: maten`,
    velden: [
      { code: 'breedte', label: 'Breedte', waarde: o.breedte, min: 40, max: vrij },
      { code: 'afstand', label: 'Van de hoek', waarde: Math.round((kant === 'begin' ? af.begin : af.einde) * 10) / 10, min: 0 },
    ],
    kanten: { label: 'Gemeten vanaf de hoek', opties: [['begin', a], ['einde', b]], gekozen: kant },
    bijKant: (k): Record<string, number> => { const x = nu(); return x ? { afstand: Math.round((k === 'begin' ? x.begin : x.einde) * 10) / 10 } : {}; },
    knoppen: [{ label: 'Midden', waarden: (h) => ({ afstand: Math.round(((vrij - (h.breedte ?? o.breedte)) / 2) * 10) / 10 }) }],
    uitleg: 'Vrije muur van het binnenvlak van de hoek tot de opening.',
    meteenTypen: false,
    toepassen: (w, k, eerste) => {
      if (w.breedte! + w.afstand! > vrij + 0.5) return `Past niet: de vrije muur is ${getal(vrij)} cm, en ${getal(w.breedte!)} + ${getal(w.afstand!)} = ${getal(w.breedte! + w.afstand!)} cm.`;
      if (eerste) momentopname();
      wijzig('plan', (t) => {
        const x = t.plan.openingen.find((q) => q.id === id);
        if (!x) return;
        x.breedte = w.breedte!;
        x.midden = k === 'einde' ? af.vlakEinde - w.afstand! - w.breedte! / 2 : af.vlakBegin + w.afstand! + w.breedte! / 2;
      }, { zonderOngedaan: true });
      return undefined;
    },
    terug: () => ongedaan(),
  });
}

/**
 * Een wand net geplaatst met Indelen: de vrije maat tot de muur links of rechts (boven of onder), in cm. Typen zet de wand
 * opnieuw op de gemeten plaats (het indelen van daarnet wordt ongedaan gemaakt en opnieuw gedaan, op de nieuwe lijn).
 */
function vraagWand(staand: boolean, lijn: number, p: Punt, rand: [number, number], voor: Plattegrond) {
  const half = toestand().plan.binnenmuur / 2;
  const as = staand ? 'v' : 'h';
  const [a, b] = staand ? ['links', 'rechts'] : ['boven', 'onder'];
  const vanBegin = lijn - half - rand[0];
  // Standaard vanaf de linker- of bovenmuur (een andere kant kies je met één tik).
  const kant = 'begin';
  const w0 = staand ? p[1] : p[0];
  let huidig = lijn;
  const zet = (nieuw: number): string | undefined => {
    // Eerst op een kopie: kan het (minstens 60 cm aan elke kant)?
    const proef = structuredClone(voor);
    if (!splitsRuimtes(proef, niveau, as, nieuw, w0, w0, (oud) => ({ ...oud, id: 'proef' }), 60).length) {
      return 'Zo dicht bij de muur kan de wand niet: elke ruimte moet minstens 60 cm breed blijven.';
    }
    if (Math.abs(nieuw - huidig) < 0.05) return undefined;
    ongedaan();
    deelMetWand(as, nieuw, w0, w0);
    huidig = nieuw;
    return undefined;
  };
  vraagMaat({
    titel: 'Wand: afstand tot de muur',
    velden: [{ code: 'afstand', label: 'Vrij tot de muur', waarde: Math.round(vanBegin * 10) / 10, min: 0 }],
    kanten: { label: 'Gemeten vanaf', opties: [['begin', a], ['einde', b]], gekozen: kant },
    bijKant: (k) => ({ afstand: Math.round((k === 'begin' ? huidig - half - rand[0] : rand[1] - huidig - half) * 10) / 10 }),
    uitleg: 'Vrije maat van het binnenvlak van de muur tot de nieuwe wand.',
    meteenTypen: false,
    toepassen: (w, k) => zet(k === 'einde' ? rand[1] - w.afstand! - half : rand[0] + w.afstand! + half),
    terug: () => { zet(lijn); },
  });
}

/** Wat een maat op de tekening is (zie `maatDoelen` in tekenPlattegrond) en wat er gebeurt als je ze wijzigt. */
function tikOpMaat(doel: string) {
  const [soort, id, extra] = doel.split(':') as [string, string, string | undefined];
  // Een losse wand: haar lengte of de vrije maat tot een muur (de maatvraag kent alle drie de maten).
  if (soort === 'wand' || soort === 'wandafstand') {
    if (selectie?.soort !== 'wand' || selectie.id !== id) { selectie = { soort: 'wand', id }; melding = ''; render(); toonEigenschappen(); }
    vraagLosseWand(id, true, extra);
    return;
  }
  const pl = plan();
  const oud = JSON.parse(JSON.stringify(pl)) as Plattegrond;
  /** Een wijziging op het plan (zoals slepen): telkens vanaf het plan van toen je de maat aantikte; eerst op een kopie. */
  const pas = (eerste: boolean, f: (t: Plattegrond) => string | undefined): string | undefined => {
    // Telkens vanaf de toestand van toen (een andere kant kiezen mag de vorige wijziging niet laten staan).
    const herstel = (t: Plattegrond) => {
      for (const r of oud.ruimtes) { const i = t.ruimtes.findIndex((x) => x.id === r.id); if (i >= 0) t.ruimtes[i] = structuredClone(r); }
      for (const o of oud.openingen) { const i = t.openingen.findIndex((x) => x.id === o.id); if (i >= 0) t.openingen[i] = structuredClone(o); }
    };
    const proef = structuredClone(toestand().plan);
    herstel(proef);
    const fout = f(proef);
    if (fout) return fout;
    if (eerste) momentopname();
    wijzig('plan', (t) => { herstel(t.plan); f(t.plan); }, { zonderOngedaan: true });
    return undefined;
  };
  const dikteOp = (as: 'h' | 'v', lijn: number, van: number, tot: number) => {
    const m = murenVan(pl).filter((x) => x.as === as && Math.abs(x.lijn - lijn) < 0.5 && Math.min(x.tot, tot) - Math.max(x.van, van) > 1);
    return m.length ? Math.max(...m.map((x) => x.dikte)) : 0;
  };
  if (soort === 'ruimte') maatRuimte(pl, oud, id, extra === 'b', pas, dikteOp);
  else if (soort === 'zijde' || soort === 'muur') maatZijde(pl, oud, soort, id, Number(extra), pas);
  else if (soort === 'ketting') maatKetting(pl, id, Number(extra), pas);
  else if (soort === 'totaal') maatTotaal(pl, oud, id === 'b', pas);
}

type Pas = (eerste: boolean, f: (t: Plattegrond) => string | undefined) => string | undefined;

/** Breedte of diepte van een rechthoekige ruimte: een muur schuift, met de buurruimtes (zoals de grepen). */
function maatRuimte(pl: Plattegrond, oud: Plattegrond, id: string, breed: boolean, pas: Pas, dikteOp: (as: 'h' | 'v', lijn: number, van: number, tot: number) => number) {
  const r = pl.ruimtes.find((x) => x.id === id);
  if (!r) return;
  // Welke muur schuift: standaard rechts (of onder), tenzij daar een buurruimte ligt en aan de andere kant niet.
  const buur = (lijn: number) => pl.ruimtes.some((q) => q.id !== r.id && delenVan(q).some((d) => (breed ? Math.abs(d.x + d.b - lijn) < 0.5 || Math.abs(d.x - lijn) < 0.5 : Math.abs(d.y + d.d - lijn) < 0.5 || Math.abs(d.y - lijn) < 0.5)));
  const [begin, einde] = breed ? [r.x, r.x + r.b] : [r.y, r.y + r.d];
  const kant = buur(einde) && !buur(begin) ? (breed ? 'w' : 'n') : breed ? 'o' : 's';
  const [t0, t1] = breed ? [dikteOp('v', r.x, r.y, r.y + r.d), dikteOp('v', r.x + r.b, r.y, r.y + r.d)] : [dikteOp('h', r.y, r.x, r.x + r.b), dikteOp('h', r.y + r.d, r.x, r.x + r.b)];
  const maat = breed ? r.b : r.d;
  vraagMaat({
    titel: `${r.naam}: ${breed ? 'breedte' : 'diepte'}`,
    velden: [{ code: 'maat', label: breed ? 'Breedte' : 'Diepte', waarde: maat, min: 60 }],
    kanten: { label: 'Deze muur schuift', opties: breed ? [['w', '◀ links'], ['o', 'rechts ▶']] : [['n', '▲ boven'], ['s', 'onder ▼']], gekozen: kant },
    uitleg: `Op de as van de muren (binnen ${getal(maat - t0 / 2 - t1 / 2)} cm, buiten ${getal(maat + t0 / 2 + t1 / 2)} cm). Typ +30 om 30 cm bij te tellen.`,
    toepassen: (w, k, eerste) => pas(eerste, (t) => {
      const gewenst = k === 'w' || k === 'n' ? einde - w.maat! : begin + w.maat!;
      const echt = verschuifWandNaar(oud, t, r.id, k as 'n' | 's' | 'w' | 'o', gewenst);
      return Math.abs(echt - gewenst) > 0.5 ? 'Zo kan het niet: een ruimte ernaast zou smaller worden dan 60 cm.' : undefined;
    }),
    terug: () => ongedaan(),
  });
}

/** Een zijde van een vrije vorm of een schuine muur: een uiteinde schuift langs de zijde, de muur ernaast draait mee. */
function maatZijde(pl: Plattegrond, oud: Plattegrond, soort: string, id: string, zijde: number, pas: Pas) {
  let r: Ruimte | undefined, i = zijde, verschil = 0;
  if (soort === 'muur') {
    const m = murenVan(pl).find((x) => x.id === id);
    if (!m?.punten) return;
    const kandidaten = [m.plus, m.min].map((x) => pl.ruimtes.find((q) => q.id === x)).filter((q): q is Ruimte => !!q?.omtrek);
    r = kandidaten.find((q) => q.id === selectie?.id) ?? kandidaten[0];
    if (!r) return;
    const v = vormVanDeel(delenVan(r)[0]!);
    i = v.findIndex((a, j) => {
      const b = v[(j + 1) % v.length]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const op = (q: Punt) => Math.abs((q[0] - a[0]) * (b[1] - a[1]) - (q[1] - a[1]) * (b[0] - a[0])) / l < 1;
      return op(m.punten![0]) && op(m.punten![1]);
    });
    if (i < 0) return;
    const a = v[i]!, b = v[(i + 1) % v.length]!;
    // De muur kan korter zijn dan de zijde (een buurruimte ertegen): het verschil blijft.
    verschil = Math.hypot(b[0] - a[0], b[1] - a[1]) - (m.tot - m.van);
  } else r = pl.ruimtes.find((x) => x.id === id);
  if (!r) return;
  const ruimte = r;
  const v = vormVanDeel(delenVan(ruimte)[0]!);
  const a = v[i]!, b = v[(i + 1) % v.length]!;
  const lengte = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const letter = (j: number) => 'ABCDEFGH'[j % v.length] ?? '?';
  vraagMaat({
    titel: `${ruimte.naam}: muur ${letter(i)}${letter(i + 1)}`,
    velden: [{ code: 'maat', label: 'Lengte', waarde: Math.round((lengte - verschil) * 10) / 10, min: 20 }],
    kanten: { label: 'Dit hoekpunt schuift', opties: [['begin', letter(i)], ['einde', letter(i + 1)]], gekozen: 'einde' },
    uitleg: 'Op de as van de muren. Het hoekpunt schuift langs deze muur; de muur ernaast draait mee.',
    toepassen: (w, k, eerste) => pas(eerste, (t) => {
      const L = w.maat! + verschil;
      const d: Punt = [(b[0] - a[0]) / lengte, (b[1] - a[1]) / lengte];
      const nieuw = v.map((q) => [...q] as Punt);
      if (k === 'begin') nieuw[i] = [b[0] - d[0] * L, b[1] - d[1] * L]; else nieuw[(i + 1) % v.length] = [a[0] + d[0] * L, a[1] + d[1] * L];
      const fout = vormFouten(nieuw)[0];
      if (fout) return fout;
      zetOmtrek(t.ruimtes.find((q) => q.id === ruimte.id)!, nieuw);
      verzetOpeningen(oud, t, ruimte.id);
      return undefined;
    }),
    terug: () => ongedaan(),
  });
}

/** Een stuk van de kettingmaat langs het gekozen raam: de afstand tot de hoek of een ander raam, of de breedte. */
function maatKetting(pl: Plattegrond, id: string, j: number, pas: Pas) {
  const o = pl.openingen.find((x) => x.id === id);
  const af = o && openingAfstanden(toestand().plan, o);
  if (!o || !af) return;
  const p = af.ketting[j]!, q = af.ketting[j + 1]!;
  const a = o.midden - o.breedte / 2, e = o.midden + o.breedte / 2;
  const zelf = Math.abs(p - a) < 0.2 && Math.abs(q - e) < 0.2;
  const ervoor = Math.abs(q - a) < 0.2, erna = Math.abs(p - e) < 0.2;
  if (!zelf && !ervoor && !erna) { melding = 'Tik op een maat naast het gekozen raam of de gekozen deur (of kies het andere raam).'; toonEigenschappen(); return; }
  const [n1, n2] = eindNamen(o.as);
  vraagMaat({
    titel: zelf ? 'Breedte van de opening' : 'Afstand',
    velden: [{ code: 'maat', label: zelf ? 'Breedte' : 'Afstand', waarde: Math.round((q - p) * 10) / 10, min: zelf ? 40 : 0 }],
    ...(zelf ? { kanten: { label: 'Deze kant schuift', opties: [['begin', n1], ['einde', n2]] as [string, string][], gekozen: 'einde' } } : {}),
    uitleg: zelf ? 'De breedte van de opening; de andere kant blijft staan.' : 'Vrije maat langs de muur; de opening schuift, haar breedte blijft.',
    toepassen: (w, k, eerste) => pas(eerste, (t) => {
      const x = t.openingen.find((z) => z.id === id);
      if (!x) return undefined;
      if (zelf) {
        x.breedte = w.maat!;
        x.midden = k === 'begin' ? e - w.maat! / 2 : a + w.maat! / 2;
      } else x.midden = ervoor ? p + w.maat! + o.breedte / 2 : q - w.maat! - o.breedte / 2;
      const lo = x.midden - x.breedte / 2, hi = x.midden + x.breedte / 2;
      return lo < af.vlakBegin - 0.5 || hi > af.vlakEinde + 0.5 ? `Past niet: de vrije muur is ${getal(af.vlakEinde - af.vlakBegin)} cm.` : undefined;
    }),
    terug: () => ongedaan(),
  });
}

/** De totale buitenmaat: de buitenste muur aan één kant schuift, met alle ruimtes en ramen ertegen. */
function maatTotaal(pl: Plattegrond, oud: Plattegrond, breed: boolean, pas: Pas) {
  const delen = pl.ruimtes.flatMap(delenVan);
  if (!delen.length) return;
  const x0 = Math.min(...delen.map((q) => q.x)), y0 = Math.min(...delen.map((q) => q.y));
  const x1 = Math.max(...delen.map((q) => q.x + q.b)), y1 = Math.max(...delen.map((q) => q.y + q.d));
  const t = pl.buitenmuur;
  const [begin, einde] = breed ? [x0, x1] : [y0, y1];
  vraagMaat({
    titel: breed ? 'Totale breedte (buiten)' : 'Totale diepte (buiten)',
    velden: [{ code: 'maat', label: breed ? 'Breedte' : 'Diepte', waarde: Math.round(einde - begin + t), min: 60 + t }],
    kanten: { label: 'Deze kant schuift', opties: breed ? [['begin', '◀ links'], ['einde', 'rechts ▶']] : [['begin', '▲ boven'], ['einde', 'onder ▼']], gekozen: 'einde' },
    uitleg: 'Buitenmaat, van buitenkant tot buitenkant. De buitenste muur schuift met alle ruimtes en ramen ertegen.',
    toepassen: (w, k, eerste) => pas(eerste, (tt) => {
      const as = w.maat! - t;
      const [lijn0, gewenst] = k === 'begin' ? [begin, einde - as] : [einde, begin + as];
      const echt = verschuifRand(oud, tt, breed, lijn0, -1e9, 1e9, gewenst);
      return Math.abs(echt - gewenst) > 0.5 ? 'Zo kan het niet: een ruimte aan die kant zou smaller worden dan 60 cm.' : undefined;
    }),
    terug: () => ongedaan(),
  });
}

// ---------- muis ----------
function naPointerDown(ev: PointerEvent) {
  if (ev.button !== 0) return;
  verbergTikMelding();
  const p = punt(ev);
  const doel = ev.target as Element;
  const houder = $('#pl-canvas');
  // Techniek (ronde 10b): alleen toestellen en leidingen kiezen, plaatsen en slepen; op een leeg stuk verschuift het beeld.
  if (techniekAan()) {
    if (maatVraagOpen()) sluitMaatVraag(true);
    zoom?.vastzetten();
    if (techniekPointerDown(ev, [p.x, p.y], doel) === 'pan') {
      pannen = { bewogen: false, x: ev.clientX, y: ev.clientY };
      zoom?.startPan(ev);
    }
    houder.setPointerCapture(ev.pointerId);
    return;
  }
  // Een maat aangetikt (met Selecteren): een veld om ze in cm te typen. Met een ander gereedschap telt de tik voor dat
  // gereedschap (een raam op de muur, ook waar een maat staat).
  const maat = doel.closest('[data-maat]') as SVGElement | null;
  // Een tik ernaast sluit de maatvraag (wat getypt is, blijft).
  if (maatVraagOpen()) sluitMaatVraag(true);
  // Ligt er onder de maat een ruimte, raam of meubel: slepen versleept dat (zoals vroeger), een tik zonder schuiven opent
  // de maat. Het vlak van de maat onthouden we nu: render() vervangt de tekening.
  const onderMaat = maat && gereedschap === 'kies'
    ? (document.elementsFromPoint(ev.clientX, ev.clientY).find((e) => e !== maat && e.closest('#pl-canvas') && e.closest('[data-soort]:not([data-soort="leeg"]):not([data-soort="muur"])'))?.closest('[data-soort]') as SVGElement | undefined)
    : undefined;
  // Een korte losse wand ligt onder haar eigen lengtemaat: de eerste tik kiest de wand (geen maatvraag over de tekening),
  // een tik op haar maat als ze gekozen is, opent de maatvraag.
  const eersteTikOpWand = onderMaat?.dataset.soort === 'wand' && !(selectie?.soort === 'wand' && selectie.id === onderMaat.dataset.id);
  maatNaKlik = onderMaat && maat && !eersteTikOpWand ? { doel: maat.dataset.maat!, x: ev.clientX, y: ev.clientY } : undefined;
  if (((maat && gereedschap === 'kies') || gereedschap === 'maten') && !onderMaat) {
    // Pas bij het loslaten (als de vinger niet schoof): de maat aantikken, of met Ruimte met maten de gevel kiezen.
    // Slepen verschuift het beeld, zoals op een leeg stuk.
    tikWacht = maat && gereedschap === 'kies' ? { soort: 'maat', doel: maat.dataset.maat!, el: maat } : { soort: 'gevel', x: p.x, y: p.y };
    pannen = { bewogen: false, x: ev.clientX, y: ev.clientY };
    zoom?.startPan(ev);
    houder.setPointerCapture(ev.pointerId);
    return;
  }
  zoom?.vastzetten();
  if (gereedschap === 'ruimte') {
    sleep = { soort: 'teken', start: { x: kleef(p.x, 'x'), y: kleef(p.y, 'y') }, bewogen: false };
    houder.setPointerCapture(ev.pointerId);
    return;
  }
  if (gereedschap === 'wand_v' || gereedschap === 'wand_h') { splits(p.x, p.y, gereedschap === 'wand_v'); return; }
  if (gereedschap === 'wand') {
    sleep = { soort: 'wand', start: { x: kleef(p.x, 'x', 12), y: kleef(p.y, 'y', 12) }, bewogen: false };
    houder.setPointerCapture(ev.pointerId);
    return;
  }
  if (gereedschap === 'losse_wand') {
    const [x, y] = wandPunt(p.x, p.y);
    sleep = { soort: 'losse', start: { x, y }, bewogen: false, scherm: { x: ev.clientX, y: ev.clientY, px: p.x, py: p.y } };
    houder.setPointerCapture(ev.pointerId);
    return;
  }
  if (gereedschap === 'meubel') {
    const t = cat.meubels[meubelType];
    if (!t) return;
    const m: Meubel = { niveau, id: nieuweId('m'), type: meubelType, x: snap(p.x - t.b / 2, fijn()), y: snap(p.y - t.d / 2, fijn()), b: t.b, d: t.d, rotatie: 0 };
    wijzig('plan', (tt) => { tt.plan.meubels.push(m); });
    selectie = { soort: 'meubel', id: m.id };
    kiesGereedschap('kies');
    return;
  }
  if (gereedschap === 'daklicht') { plaatsDaklicht(p.x, p.y); return; }
  if (gereedschap !== 'kies' && gereedschap !== 'maten') { plaatsOpening(gereedschap, p.x, p.y); return; }

  const greep = doel.closest('[data-greep]') as SVGElement | null;
  const hoekgreep = doel.closest('[data-hoekgreep]') as SVGElement | null;
  const wandgreep = doel.closest('[data-wandgreep]') as SVGElement | null;
  const item = (onderMaat ?? doel.closest('[data-soort]')) as SVGElement | null;
  const orig = JSON.stringify(plan());
  if (greep && selectie?.soort === 'ruimte') {
    sleep = { soort: 'greep', start: p, id: selectie.id, kant: greep.dataset.greep as Sleep['kant'], bewogen: false, orig };
  } else if (hoekgreep && selectie?.soort === 'ruimte') {
    sleep = { soort: 'hoek', start: p, id: selectie.id, hoek: Number(hoekgreep.dataset.hoekgreep), bewogen: false, orig };
  } else if (wandgreep && selectie?.soort === 'wand') {
    sleep = { soort: 'wandeind', start: p, id: selectie.id, eind: wandgreep.dataset.wandgreep === 'van' ? 'van' : 'tot', bewogen: false, orig, scherm: { x: ev.clientX, y: ev.clientY, px: p.x, py: p.y } };
  } else if (item && ['ruimte', 'opening', 'meubel', 'daklicht', 'wand'].includes(item.dataset.soort ?? '')) {
    const soort = item.dataset.soort as 'ruimte' | 'opening' | 'meubel' | 'daklicht' | 'wand';
    selectie = { soort, id: item.dataset.id! };
    sleep = { soort: soort === 'wand' ? 'lossewand' : soort, start: p, id: item.dataset.id!, bewogen: false, orig, ...(soort === 'wand' ? { scherm: { x: ev.clientX, y: ev.clientY, px: p.x, py: p.y } } : {}) };
    melding = '';
    render();
    toonEigenschappen();
  } else {
    // Leeg stuk: slepen verschuift het beeld; een klik zonder bewegen deselecteert.
    pannen = { bewogen: false, x: ev.clientX, y: ev.clientY };
    zoom?.startPan(ev);
    houder.setPointerCapture(ev.pointerId);
    return;
  }
  houder.setPointerCapture(ev.pointerId);
}

function naPointerMove(ev: PointerEvent) {
  if (pannen) {
    if (!pannen.bewogen && Math.hypot(ev.clientX - pannen.x, ev.clientY - pannen.y) < 4) return;
    pannen.bewogen = true;
    zoom?.beweegPan(ev);
    return;
  }
  if (techniekPointerMove(ev)) return;
  // Een losse wand: vanaf het begin van het slepen met de schaal van de tekening (zie `Sleep.scherm`).
  const sch = sleep?.scherm, eenheid = 1 / (($('#pl-canvas').querySelector('svg') as SVGSVGElement | null)?.getScreenCTM()?.a || 1);
  const p = sch ? { x: sch.px + (ev.clientX - sch.x) * eenheid, y: sch.py + (ev.clientY - sch.y) * eenheid } : punt(ev);
  if (!sleep) {
    // Techniek: het toestel dat zou komen, onder de muis.
    if (techniekAan()) { if (ev.pointerType === 'mouse' && techniekVoorbeeld([p.x, p.y])) render(); return; }
    // Voorbeeld van een nieuwe opening onder de muisaanwijzer.
    if (['raam', 'buitendeur', 'schuifraam', 'garagepoort', 'binnendeur', 'doorgang'].includes(gereedschap)) {
      const r = openingOp(gereedschap as OpeningSoort, p.x, p.y);
      voorbeeldOpening = r && !r.fout ? r.opening : undefined;
      render();
    }
    // Voorbeeld van een lichtkoepel onder de muisaanwijzer.
    if (gereedschap === 'daklicht') {
      const type = cat.daklichten?.[daklichtType];
      voorbeeld = type ? { x: snap(p.x - type.b / 2, fijn()), y: snap(p.y - type.d / 2, fijn()), b: type.b, d: type.d } : undefined;
      render();
    }
    return;
  }
  const dx = p.x - sleep.start.x, dy = p.y - sleep.start.y;
  if (!sleep.bewogen && Math.hypot(dx, dy) < 4) return;
  // Gestart op een maat: pas slepen als de vinger meer dan 8 beeldpunten schoof (anders is het een tik op de maat).
  if (!sleep.bewogen && maatNaKlik && Math.hypot(ev.clientX - maatNaKlik.x, ev.clientY - maatNaKlik.y) < 8) return;
  // Tekenen (een ruimte of een losse wand) bewaart pas bij het loslaten: geen extra stap voor ongedaan maken.
  if (!sleep.bewogen && sleep.soort !== 'teken' && sleep.soort !== 'losse') momentopname();
  sleep.bewogen = true;
  if (sleep.soort === 'wand') {
    // Recht: horizontaal of verticaal, volgens de grootste beweging.
    const staand = Math.abs(dy) > Math.abs(dx);
    voorbeeldWand = staand
      ? { x1: sleep.start.x, y1: sleep.start.y, x2: sleep.start.x, y2: snap(p.y) }
      : { x1: sleep.start.x, y1: sleep.start.y, x2: snap(p.x), y2: sleep.start.y };
    render();
    return;
  }
  if (sleep.soort === 'losse') {
    const start: Punt = [sleep.start.x, sleep.start.y];
    voorbeeldLosseWand = nieuweLosseWand(start, wandEind(start, p.x, p.y), 'voorbeeld');
    render();
    return;
  }
  if (sleep.soort === 'teken') {
    const x2 = kleef(p.x, 'x'), y2 = kleef(p.y, 'y');
    voorbeeld = { x: Math.min(sleep.start.x, x2), y: Math.min(sleep.start.y, y2), b: Math.abs(x2 - sleep.start.x), d: Math.abs(y2 - sleep.start.y) };
    render();
    return;
  }
  const oud = JSON.parse(sleep.orig!) as Plattegrond;
  const id = sleep.id!;
  wijzig('plan', (t) => {
    const pl = t.plan;
    if (sleep!.soort === 'meubel') {
      const m0 = oud.meubels.find((m) => m.id === id)!, m = pl.meubels.find((x) => x.id === id)!;
      m.x = snap(m0.x + dx, fijn()); m.y = snap(m0.y + dy, fijn());
    }
    if (sleep!.soort === 'daklicht') {
      const l0 = oud.daklichten?.find((l) => l.id === id), l = pl.daklichten?.find((x) => x.id === id);
      if (l0 && l) { l.x = snap(l0.x + dx, fijn()); l.y = snap(l0.y + dy, fijn()); }
    }
    if (sleep!.soort === 'opening') {
      const o0 = oud.openingen.find((o) => o.id === id)!, o = pl.openingen.find((x) => x.id === id)!;
      const muur = muurVanOpening(o0, murenVan(oud));
      // Langs de muur: bij een schuine muur de beweging langs haar richting.
      const d = asVan(o0.richting ? o0 : muur ?? o0).d;
      let midden = snap(o0.midden + (o0.as === 'h' ? dx : o0.as === 'v' ? dy : dx * d[0] + dy * d[1]), fijn());
      if (muur) midden = Math.min(muur.tot - o.breedte / 2 - 5, Math.max(muur.van + o.breedte / 2 + 5, midden));
      o.midden = midden;
    }
    if (sleep!.soort === 'ruimte') {
      const r0 = oud.ruimtes.find((r) => r.id === id)!, r = pl.ruimtes.find((x) => x.id === id)!;
      const nx = kleef(r0.x + dx, 'x', 18, id), ny = kleef(r0.y + dy, 'y', 18, id);
      const ddx = nx - r0.x, ddy = ny - r0.y;
      r.x = nx; r.y = ny;
      if (r0.delen) r.delen = r0.delen.map((q) => ({ ...q, x: q.x + ddx, y: q.y + ddy, ...(q.omtrek ? { omtrek: q.omtrek.map(([x, y]) => [x + ddx, y + ddy] as Punt) } : {}) }));
      if (r0.omtrek) zetOmtrek(r, vormVanDeel(delenVan(r0)[0]!).map(([x, y]) => [x + ddx, y + ddy] as Punt));
      const binnenR0 = (x: number, y: number) => delenVan(r0).some((q) => x > q.x && x < q.x + q.b && y > q.y && y < q.y + q.d);
      // Meubels in de ruimte en openingen op de randen gaan mee.
      for (const m0 of oud.meubels) {
        const v = meubelVoetafdruk(m0);
        const cx = v.x + v.b / 2, cy = v.y + v.d / 2;
        if (binnenR0(cx, cy)) {
          const m = pl.meubels.find((x) => x.id === m0.id)!;
          m.x = m0.x + ddx; m.y = m0.y + ddy;
        }
      }
      // Lichtkoepels boven de ruimte ook.
      for (const l0 of oud.daklichten ?? []) {
        if (!binnenR0(l0.x + l0.b / 2, l0.y + l0.d / 2)) continue;
        const l = pl.daklichten?.find((x) => x.id === l0.id);
        if (l) { l.x = l0.x + ddx; l.y = l0.y + ddy; }
      }
      // Losse wanden in de ruimte (het midden van hun as) ook; anders bleef een muurtje achter en werd het een tuinmuur.
      for (const w0 of oud.losseWanden ?? []) {
        if (!binnenR0((w0.van[0] + w0.tot[0]) / 2, (w0.van[1] + w0.tot[1]) / 2)) continue;
        const w = pl.losseWanden?.find((x) => x.id === w0.id);
        if (w) { w.van = [w0.van[0] + ddx, w0.van[1] + ddy]; w.tot = [w0.tot[0] + ddx, w0.tot[1] + ddy]; }
      }
      // Toestellen en leidingen (ronde 10b) ook: wat erin staat, en wat buiten tegen haar gevel staat (techniek-ui.ts).
      techniekMetRuimte(oud, pl, id, ddx, ddy);
      // Een vrije vorm: de ramen en deuren in haar muren (ook schuine) gaan mee.
      if (heeftVrijeVorm(r0)) verzetOpeningen(oud, pl, id);
      else for (const o0 of oud.openingen) {
        const opRand = delenVan(r0).some((q) => (o0.as === 'h'
          ? (Math.abs(o0.lijn - q.y) < 0.5 || Math.abs(o0.lijn - (q.y + q.d)) < 0.5) && o0.midden > q.x && o0.midden < q.x + q.b
          : (Math.abs(o0.lijn - q.x) < 0.5 || Math.abs(o0.lijn - (q.x + q.b)) < 0.5) && o0.midden > q.y && o0.midden < q.y + q.d));
        if (!opRand) continue;
        const o = pl.openingen.find((x) => x.id === o0.id)!;
        o.lijn = o0.lijn + (o0.as === 'h' ? ddy : ddx);
        o.midden = o0.midden + (o0.as === 'h' ? ddx : ddy);
      }
    }
    if (sleep!.soort === 'lossewand') {
      // Een losse wand verslepen: kleeft een eindpunt aan een muur, dan dat; anders kleeft het begin aan de lijnen en het
      // raster. Het andere eindpunt gaat even ver mee (de wand draait niet).
      const w0 = oud.losseWanden?.find((x) => x.id === id), w = pl.losseWanden?.find((x) => x.id === id);
      if (w0 && w) {
        const los0: Punt = [w0.van[0] + dx, w0.van[1] + dy], los1: Punt = [w0.tot[0] + dx, w0.tot[1] + dy];
        const muren = murenVan(oud), andere = (oud.losseWanden ?? []).filter((x) => x.id !== id);
        const k0 = kleefAanWand(los0, muren, andere, wandMarge()), k1 = k0 ? undefined : kleefAanWand(los1, muren, andere, wandMarge());
        const [naar, van]: [Punt, Punt] = k0 ? [k0.punt, los0] : k1 ? [k1.punt, los1] : [[kleef(los0[0], 'x', 12), kleef(los0[1], 'y', 12)], los0];
        const sx = naar[0] - van[0], sy = naar[1] - van[1];
        w.van = [los0[0] + sx, los0[1] + sy];
        w.tot = [los1[0] + sx, los1[1] + sy];
      }
    }
    if (sleep!.soort === 'wandeind') {
      // Een eindpunt verslepen: recht als het bijna liggend of staand is, kleven aan muren en het raster.
      const w0 = oud.losseWanden?.find((x) => x.id === id), w = pl.losseWanden?.find((x) => x.id === id);
      if (w0 && w) {
        const [vast, eind] = sleep!.eind === 'van' ? [w0.tot, w0.van] : [w0.van, w0.tot];
        const q = wandEind(vast, eind[0] + dx, eind[1] + dy, id);
        if (sleep!.eind === 'van') w.van = q; else w.tot = q;
      }
    }
    if (sleep!.soort === 'greep') verschuifWand(oud, pl, id, sleep!.kant!, p);
    if (sleep!.soort === 'hoek') {
      // Een hoekpunt van een vrije vorm: het kleeft aan de lijnen van de andere ruimtes en aan het raster.
      const r0 = oud.ruimtes.find((r) => r.id === id)!, r = pl.ruimtes.find((x) => x.id === id)!;
      const v = vormVanDeel(delenVan(r0)[0]!).map((q) => [...q] as Punt);
      const i = sleep!.hoek!;
      if (v[i]) {
        const los: Punt = [v[i]![0] + dx, v[i]![1] + dy];
        let q: Punt = [kleef(los[0], 'x', 12, id), kleef(los[1], 'y', 12, id)];
        // Kleven aan een hoekpunt van een andere ruimte (binnen 15 cm), ook van een vrije vorm.
        let best = 15;
        for (const andere of oud.ruimtes) {
          if (andere.id === id) continue;
          for (const h of delenVan(andere).flatMap(vormVanDeel)) { const a = Math.hypot(h[0] - los[0], h[1] - los[1]); if (a < best) { best = a; q = h; } }
        }
        v[i] = q;
        if (!vormFouten(v).length) { zetOmtrek(r, v); verzetOpeningen(oud, pl, id); }
      }
    }
  }, { zonderOngedaan: true });
}

/** Verschuift één rand van een ruimte; aangrenzende ruimtes(delen) en openingen op die rand schuiven mee. */
function verschuifWand(oud: Plattegrond, pl: Plattegrond, id: string, kant: 'n' | 's' | 'w' | 'o', p: { x: number; y: number }) {
  const staand = kant === 'w' || kant === 'o';
  verschuifWandNaar(oud, pl, id, kant, kleef(staand ? p.x : p.y, staand ? 'x' : 'y', 12, id));
}

/** Zoals `verschuifWand`, naar een gemeten lijn; geeft de lijn waar de wand komt (elke ruimte blijft minstens 60 cm). */
function verschuifWandNaar(oud: Plattegrond, pl: Plattegrond, id: string, kant: 'n' | 's' | 'w' | 'o', gewenst: number): number {
  const r0 = oud.ruimtes.find((r) => r.id === id)!;
  const staand = kant === 'w' || kant === 'o';
  const lijn0 = kant === 'w' ? r0.x : kant === 'o' ? r0.x + r0.b : kant === 'n' ? r0.y : r0.y + r0.d;
  const [van, tot] = staand ? [r0.y, r0.y + r0.d] : [r0.x, r0.x + r0.b];
  return verschuifRand(oud, pl, staand, lijn0, van, tot, gewenst);
}

/**
 * Verschuift de rand op `lijn0` (staand: x, liggend: y) tussen `van` en `tot` naar `gewenst`: alle ruimtes(delen) met een
 * rand op die lijn in dat stuk schuiven mee, en de openingen erop. Geeft de lijn waar de rand werkelijk komt.
 */
function verschuifRand(oud: Plattegrond, pl: Plattegrond, staand: boolean, lijn0: number, van: number, tot: number, gewenst: number): number {
  let lijn = gewenst;
  // Alle delen met een rand op dezelfde lijn binnen hetzelfde stuk schuiven mee (min. 60 cm).
  const betrokken: { ruimte: string; deel: number; q: { x: number; y: number; b: number; d: number } }[] = [];
  // Een vrije vorm met hoekpunten op die lijn: die hoekpunten schuiven mee (de vorm rekt niet).
  const vrij: { ruimte: string; deel: number; v: Punt[] }[] = [];
  const c = staand ? 0 : 1, c2 = staand ? 1 : 0;
  for (const r of oud.ruimtes) {
    delenVan(r).forEach((q, deel) => {
      if (q.omtrek) {
        const v = vormVanDeel(q);
        if (v.some((p) => Math.abs(p[c] - lijn0) < 0.5 && p[c2] >= van - 0.5 && p[c2] <= tot + 0.5)) vrij.push({ ruimte: r.id, deel, v });
        return;
      }
      const [a, b] = staand ? [q.y, q.y + q.d] : [q.x, q.x + q.b];
      const overlap = Math.min(b, tot) - Math.max(a, van) > 1;
      const opLijn = staand ? Math.abs(q.x - lijn0) < 0.5 || Math.abs(q.x + q.b - lijn0) < 0.5 : Math.abs(q.y - lijn0) < 0.5 || Math.abs(q.y + q.d - lijn0) < 0.5;
      if (overlap && opLijn) betrokken.push({ ruimte: r.id, deel, q });
    });
  }
  for (const { q } of betrokken) {
    const begin = staand ? q.x : q.y, einde = staand ? q.x + q.b : q.y + q.d;
    if (Math.abs(begin - lijn0) < 0.5) lijn = Math.min(lijn, einde - 60);
    else lijn = Math.max(lijn, begin + 60);
  }
  for (const { ruimte, deel, q } of betrokken) {
    const r = pl.ruimtes.find((x) => x.id === ruimte)!;
    const doel = deel === 0 ? r : r.delen![deel - 1]!;
    if (staand) {
      if (Math.abs(q.x - lijn0) < 0.5) { doel.x = lijn; doel.b = q.x + q.b - lijn; } else { doel.b = lijn - q.x; }
    } else if (Math.abs(q.y - lijn0) < 0.5) { doel.y = lijn; doel.d = q.y + q.d - lijn; } else { doel.d = lijn - q.y; }
  }
  for (const o0 of oud.openingen) {
    if ((o0.as === 'v') !== staand || Math.abs(o0.lijn - lijn0) > 0.5 || o0.midden < van || o0.midden > tot) continue;
    pl.openingen.find((x) => x.id === o0.id)!.lijn = lijn;
  }
  for (const { ruimte, deel, v } of vrij) {
    const w = v.map((p): Punt => (Math.abs(p[c] - lijn0) < 0.5 ? (staand ? [lijn, p[1]] : [p[0], lijn]) : p));
    if (vormFouten(w).length) continue;
    const r = pl.ruimtes.find((x) => x.id === ruimte)!;
    zetOmtrek(deel === 0 ? r : r.delen![deel - 1]!, w);
    verzetOpeningen(oud, pl, ruimte);
  }
  return lijn;
}

function naPointerUp(ev: PointerEvent) {
  const s = sleep;
  sleep = undefined;
  $('#pl-canvas').releasePointerCapture?.(ev.pointerId);
  zoom?.losmaken();
  if (techniekPointerUp()) return;
  if (pannen) {
    const klik = !pannen.bewogen || Math.hypot(ev.clientX - pannen.x, ev.clientY - pannen.y) < 8;
    pannen = undefined;
    zoom?.stopPan();
    const t = tikWacht;
    tikWacht = undefined;
    if (t && klik) {
      if (t.soort === 'maat') { if (t.el.isConnected) tikOpMaat(t.doel); }
      else matenTik(t.x, t.y);
      return;
    }
    if (t) return;
    if (klik) { selectie = undefined; render(); toonEigenschappen(); }
    return;
  }
  if (s?.soort === 'wand') {
    const w = voorbeeldWand;
    voorbeeldWand = undefined;
    if (w && Math.hypot(w.x2 - w.x1, w.y2 - w.y1) >= 30) {
      const staand = w.x1 === w.x2;
      deelMetWand(staand ? 'v' : 'h', staand ? w.x1 : w.y1, staand ? w.y1 : w.x1, staand ? w.y2 : w.x2, true);
      return;
    }
    render();
    return;
  }
  if (s?.soort === 'losse') {
    const w = voorbeeldLosseWand;
    voorbeeldLosseWand = undefined;
    if (w && s.bewogen) { plaatsLosseWand({ ...w, id: nieuweId('w') }); return; }
    weiger('Sleep van het begin naar het einde van de muur.', [s.start.x, s.start.y]);
    return;
  }
  if (s?.soort === 'teken') {
    const v = voorbeeld;
    voorbeeld = undefined;
    if (v && v.b >= 80 && v.d >= 80) {
      // Binnen een bestaande ruimte: zelfde vloer en wanden overnemen.
      const ouder = ruimteOp(plan(), v.x + v.b / 2, v.y + v.d / 2);
      const r: Ruimte = { id: nieuweId('r'), naam: nieuweRuimteNaam(), type: ouder ? 'berging' : 'leefruimte', ...v, vloer: ouder?.vloer ?? 'parket_eik', wand: ouder?.wand ?? 'wit', niveau };
      wijzig('plan', (t) => { tekenRuimteIn(t.plan, r); });
      selectie = { soort: 'ruimte', id: r.id };
      melding = ouder ? `Ruimte getekend in ${ouder.naam}; die ruimte is aangepast. Voeg een deur of doorgang toe.` : '';
      kiesGereedschap('kies');
      return;
    }
    if (v && (v.b || v.d)) { weiger('Te klein: een ruimte moet minstens 80 × 80 cm zijn.', [v.x + v.b / 2, v.y + v.d / 2]); return; }
  }
  render();
  toonEigenschappen();
  // Een tik (zonder slepen) op een maat boven een ruimte of raam: de maatvraag.
  const m = maatNaKlik;
  maatNaKlik = undefined;
  if (m && s && !s.bewogen) tikOpMaat(m.doel);
}

// ---------- eigenschappen ----------
function verwijderSelectie() {
  if (!selectie) return;
  const s = selectie;
  if (s.soort === 'toestel' || s.soort === 'leiding') {
    let tekst = '';
    wijzig('plan', (t) => { tekst = verwijderTechniek(t, s as TechniekSelectie); });
    selectie = undefined;
    melding = tekst;
    toonEigenschappen();
    return;
  }
  wijzig('plan', (t) => {
    if (s.soort === 'ruimte') t.plan.ruimtes = t.plan.ruimtes.filter((r) => r.id !== s.id);
    if (s.soort === 'meubel') t.plan.meubels = t.plan.meubels.filter((m) => m.id !== s.id);
    if (s.soort === 'daklicht') t.plan.daklichten = t.plan.daklichten?.filter((l) => l.id !== s.id);
    if (s.soort === 'wand') {
      t.plan.losseWanden = t.plan.losseWanden?.filter((w) => w.id !== s.id);
      // De laatste weg: het plan is weer een plan zonder losse wanden.
      if (!t.plan.losseWanden?.length) delete t.plan.losseWanden;
    }
    if (s.soort === 'opening') {
      const o = t.plan.openingen.find((x) => x.id === s.id);
      if (o?.positie) t.posities = t.posities.filter((p) => p.id !== o.positie);
      t.plan.openingen = t.plan.openingen.filter((x) => x.id !== s.id);
    }
  });
  selectie = undefined;
  toonEigenschappen();
}

function draaiMeubel() {
  if (selectie?.soort !== 'meubel') return;
  const id = selectie.id;
  wijzig('plan', (t) => {
    const m = t.plan.meubels.find((x) => x.id === id);
    if (!m) return;
    const v = meubelVoetafdruk(m);
    const cx = v.x + v.b / 2, cy = v.y + v.d / 2;
    m.rotatie = ((m.rotatie + 90) % 360) as Meubel['rotatie'];
    const n = meubelVoetafdruk(m);
    m.x = snap(cx - n.b / 2, 5);
    m.y = snap(cy - n.d / 2, 5);
  });
}

/** Een maatveld in cm voor de eigenschappen: typen (ook 4,5 m of +30) en Enter of uit het veld gaan past toe. */
function cmMaatveld(label: string, waarde: number, bij: (w: number) => void, min = 20): HTMLElement {
  const wrap = el('label', { class: 'maatveld' });
  const i = cmVeld(waarde, { 'aria-label': `${label} in cm`, enterkeyhint: 'done' });
  i.addEventListener('change', () => {
    const w = leesCm(i.value, waarde);
    if (w === undefined || w < min) { melding = w === undefined ? `"${i.value}" is geen maat: typ bv. 450, 4,5 m of 300+150.` : `${label}: minstens ${min} cm.`; toonEigenschappen(); return; }
    if (Math.abs(w - waarde) >= 0.05) bij(w);
  });
  i.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); i.blur(); } });
  wrap.append(el('span', {}, label), i, el('span', { class: 'eenheid' }, 'cm'));
  return wrap;
}

/** De lengte van zijde i van een vrije vorm (op de as): het tweede hoekpunt schuift langs de zijde. */
function zijdeLengte(id: string, i: number, lengte: number) {
  const oud = JSON.parse(JSON.stringify(plan())) as Plattegrond;
  const r = oud.ruimtes.find((x) => x.id === id);
  if (!r) return;
  const v = vormVanDeel(delenVan(r)[0]!).map((q) => [...q] as Punt);
  const a = v[i]!, b = v[(i + 1) % v.length]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  v[(i + 1) % v.length] = [a[0] + ((b[0] - a[0]) * lengte) / l, a[1] + ((b[1] - a[1]) * lengte) / l];
  const fout = vormFouten(v)[0];
  if (fout) { melding = fout; toonEigenschappen(); return; }
  wijzig('plan', (t) => { zetOmtrek(t.plan.ruimtes.find((x) => x.id === id)!, v); verzetOpeningen(oud, t.plan, id); });
}

function knop(tekst: string, f: () => void, cls = 'tweede'): HTMLButtonElement {
  const b = el('button', { type: 'button', class: cls }, tekst) as HTMLButtonElement;
  b.addEventListener('click', f);
  return b;
}

/**
 * Een knop die iets wist: de eerste tik vraagt "Zeker?", de tweede doet het. Een tweede tik binnen 0,6 s (een dubbeltik of
 * een vinger die twee keer raakt) telt niet: die moet bewust zijn. Na 6 s zonder tweede tik staat de knop weer zoals eerst.
 */
function zekerKnop(b: HTMLButtonElement, vraag: string, doe: () => void) {
  const gewoon = b.textContent ?? '';
  let sinds = 0, terug = 0;
  const herstel = () => { window.clearTimeout(terug); b.dataset.zeker = ''; b.textContent = gewoon; };
  b.addEventListener('click', () => {
    const nu = performance.now();
    if (b.dataset.zeker !== '1') {
      b.dataset.zeker = '1';
      b.textContent = vraag;
      sinds = nu;
      window.clearTimeout(terug);
      terug = window.setTimeout(herstel, 6000);
      return;
    }
    if (nu - sinds < 600) return;
    herstel();
    doe();
  });
}

function toonEigenschappen() {
  const vak = $('#pl-eigenschappen');
  vak.replaceChildren();
  if (melding) vak.append(el('p', { class: 'melding' }, melding));
  const pl = plan();
  const s = selectie;
  if (s?.soort === 'ruimte') {
    const r = pl.ruimtes.find((x) => x.id === s.id);
    if (!r) { selectie = undefined; return toonEigenschappen(); }
    const m = ruimteMaten(pl, r);
    const zet = (f: (x: Ruimte) => void) => wijzig('plan', (t) => { const x = t.plan.ruimtes.find((y) => y.id === r.id); if (x) f(x); });
    vak.append(el('h3', {}, 'Ruimte'));
    const naam = el('input', { type: 'text', 'aria-label': 'Naam' }) as HTMLInputElement;
    naam.value = r.naam;
    naam.addEventListener('change', () => zet((x) => { x.naam = naam.value.trim() || x.naam; }));
    const rij = (label: string, inhoud: HTMLElement) => { const l = el('label', { class: 'eig' }); l.append(el('span', {}, label), inhoud); return l; };
    vak.append(
      rij('Naam', naam),
      rij('Soort', keuzelijst('pl-type', Object.entries(RUIMTE_TYPES).map(([k, v]) => [k, v.label]), r.type, (w) => zet((x) => {
        const oudLabel = RUIMTE_TYPES[x.type].label;
        x.type = w as RuimteType;
        if (x.naam === oudLabel || /^Ruimte \d+$/.test(x.naam)) x.naam = RUIMTE_TYPES[x.type].label;
        if (w === 'badkamer' || w === 'wc') { x.vloer = 'tegel_wit'; x.wand = 'tegels_wit'; }
      }))),
      rij('Vloer', keuzelijst('pl-vloer', Object.entries(cat.vloeren).map(([k, v]) => [k, v.label]), r.vloer, (w) => zet((x) => { x.vloer = w; }))),
      rij('Wanden', keuzelijst('pl-wand', Object.entries(cat.wanden).map(([k, v]) => [k, v.label]), r.wand, (w) => zet((x) => { x.wand = w; }))),
    );
    // Ronde 12: plafond, plint en accentmuur, en de ruimte van binnen bekijken (daar zie je het plafond).
    binnenKeuzes(vak, r.id, { vanBinnen: () => bekijkVanBinnen(r.id) });
    vak.append(
      // Ronde 11: een bestaande ruimte blijft; ze staat neutraal en telt niet mee in het werk.
      schakelaar('Bestaand (blijft)', r.bestaand === true, (aan) => zet((x) => { if (aan) x.bestaand = true; else delete x.bestaand; }), { 'data-ruimte-bestaand': '' }),
    );
    if (r.bestaand === true) vak.append(el('p', { class: 'klein' }, 'Bestaat al: neutraal in plan en 3D, niet in de meetstaat, de constructie of het overzicht. De muur naar het nieuwe deel is de bestaande gevel.'));
    if (r.delen?.length) {
      vak.append(el('p', { class: 'klein' }, `Samengestelde ruimte (${r.delen.length + 1} delen, L- of U-vorm). Verplaatsen kan; maten wijzig je door een wand te tekenen of een ruimte erin te tekenen.`));
    } else if (r.omtrek) {
      // Vrije vorm: de lengte van elke muur (op de as). Typen schuift het tweede hoekpunt langs de muur.
      const v = vormVanDeel(delenVan(r)[0]!);
      const maten = el('div', { class: 'maten' });
      v.forEach((a, i) => {
        const b = v[(i + 1) % v.length]!;
        const letter = (j: number) => 'ABCDEFGH'[j % v.length];
        maten.append(cmMaatveld(`Muur ${letter(i)}${letter(i + 1)}`, Math.hypot(b[0] - a[0], b[1] - a[1]), (w) => zijdeLengte(r.id, i, w)));
      });
      vak.append(el('p', { class: 'klein' }, 'Vrije vorm met schuine muren. Typ een lengte (het tweede hoekpunt schuift langs die muur), sleep een hoekpunt, of tik op een maat in de tekening.'), maten);
    } else {
      // Breedte en diepte: de muur rechts (of onder) schuift, met de buurruimtes, zoals met de grepen.
      const maten = el('div', { class: 'maten' });
      const schuif = (kant: 'o' | 's', w: number) => {
        const oud = JSON.parse(JSON.stringify(pl)) as Plattegrond;
        const gewenst = kant === 'o' ? r.x + w : r.y + w;
        let echt = gewenst;
        wijzig('plan', (t) => { echt = verschuifWandNaar(oud, t.plan, r.id, kant, gewenst); });
        if (Math.abs(echt - gewenst) > 0.5) { melding = 'Niet helemaal: een ruimte ernaast mag niet smaller worden dan 60 cm.'; toonEigenschappen(); }
      };
      maten.append(cmMaatveld('Breedte', r.b, (w) => schuif('o', w)), cmMaatveld('Diepte', r.d, (w) => schuif('s', w)));
      vak.append(maten);
    }
    const dl = el('dl', { class: 'detail' });
    const daglicht = m.netto ? (m.glas / m.netto) * 100 : 0;
    for (const [a, b] of [
      ['Netto vloer', `${getal(m.netto, 1)} m² (${getal(m.nb)} × ${getal(m.nd)} cm)`],
      ['Wanden (zonder openingen)', `${getal(m.wand, 1)} m²`],
      ['Glas', `${getal(m.glas, 2)} m² · ${getal(daglicht)} % van de vloer`],
    ]) dl.append(el('dt', {}, a!), el('dd', {}, b!));
    vak.append(dl, el('div', { class: 'knoppenrij' }));
    vak.lastElementChild!.append(knop('Verwijderen', verwijderSelectie, 'gevaar'));
    vak.append(el('p', { class: 'klein' }, r.omtrek ? 'Tip: sleep een hoekpunt, of tik op een maat in de tekening om ze te typen.' : 'Tip: tik op een maat in de tekening om ze te typen, of sleep de blauwe bolletjes; de buurruimte schuift mee.'));
  } else if (s?.soort === 'opening') {
    const o = pl.openingen.find((x) => x.id === s.id);
    if (!o) { selectie = undefined; return toonEigenschappen(); }
    const zet = (f: (x: Opening) => void) => wijzig('plan', (t) => { const x = t.plan.openingen.find((y) => y.id === o.id); if (x) f(x); });
    const titel: Record<OpeningSoort, string> = { raam: 'Raam', buitendeur: 'Buitendeur', schuifraam: 'Schuifraam', binnendeur: 'Binnendeur', doorgang: 'Doorgang', garagepoort: 'Garagepoort' };
    const p = positieVan(o);
    vak.append(el('h3', {}, `${titel[o.soort]}${p ? ` · ${p.code}` : ''}`));
    const maten = el('div', { class: 'maten' });
    maten.append(
      getalVeld('Breedte', o.breedte, (w) => zet((x) => { x.breedte = Math.max(40, w); }), { min: 40, stap: 5, eenheid: 'cm' }),
      getalVeld('Hoogte', o.hoogte, (w) => zet((x) => { x.hoogte = Math.max(40, w); }), { min: 40, stap: 5, eenheid: 'cm' }),
    );
    if (o.soort === 'raam') maten.append(getalVeld('Borstwering', o.borstwering, (w) => zet((x) => { x.borstwering = Math.max(0, w); }), { min: 0, stap: 5, eenheid: 'cm' }));
    vak.append(maten);
    // Plaats in de muur: vrije muur tot het binnenvlak van de dwarsmuren (intypen verschuift de opening).
    const af = openingAfstanden(toestand().plan, o);
    if (af) {
      const [l1, l2] = o.as === 'h' ? ['Muur links', 'Muur rechts'] : ['Muur boven', 'Muur onder'];
      const plaats = el('div', { class: 'maten' });
      plaats.append(
        getalVeld(l1, af.begin, (w) => zet((x) => { x.midden = af.vlakBegin + Math.max(0, w) + x.breedte / 2; }), { min: 0, stap: 1, eenheid: 'cm' }),
        getalVeld(l2, af.einde, (w) => zet((x) => { x.midden = af.vlakEinde - Math.max(0, w) - x.breedte / 2; }), { min: 0, stap: 1, eenheid: 'cm' }),
      );
      vak.append(el('p', { class: 'klein' }, 'Plaats in de muur (vrije muur tot het binnenvlak; typ een maat om te verschuiven)'), plaats);
    }
    if (o.soort === 'binnendeur' || o.soort === 'buitendeur') {
      const r = el('div', { class: 'knoppenrij' });
      r.append(
        knop('Scharnier wisselen', () => zet((x) => { x.scharnier = x.scharnier === 'begin' ? 'einde' : 'begin'; })),
        knop('Andere kant opendraaien', () => zet((x) => { x.naarPlus = !x.naarPlus; })),
      );
      vak.append(el('p', { class: 'klein' }, 'Draairichting'), r);
    }
    if (o.soort === 'binnendeur') {
      const l = el('label', { class: 'eig' });
      l.append(el('span', {}, 'Deur'), keuzelijst('pl-deur', Object.entries(cat.binnendeuren).map(([k, v]) => [k, v.label]), o.deurtype ?? 'schilder', (w) => zet((x) => { x.deurtype = w; })));
      vak.append(l);
    }
    if (p) {
      const r = resultaat(p);
      const kaart = el('div', { class: 'gekoppeld' });
      kaart.append(
        el('strong', {}, `${p.code} · ${p.naam}`),
        el('p', { class: 'klein' }, r.kenmerken.filter((k) => k.zichtbaar && ['type', 'profiel', 'glas', 'zonwering'].includes(k.code)).map((k) => k.weergave).join(' · ')),
        el('p', {}, PRIJZEN ? `${prijsTekst(p)} ${r.geldig ? '' : '· heeft fouten'}` : r.geldig ? 'In orde' : 'Heeft fouten: zie de controles'),
      );
      for (const mm of r.meldingen.slice(0, 3)) kaart.append(el('p', { class: `kleinmelding ${mm.ernst}` }, mm.melding));
      kaart.append(knop('Configureren: draairichting, glas, zonwering …', () => naarPositie(p.id), ''));
      vak.append(kaart);
    }
    const r = el('div', { class: 'knoppenrij' });
    r.append(knop('Verwijderen', verwijderSelectie, 'gevaar'));
    vak.append(r);
  } else if (s?.soort === 'meubel') {
    const m = pl.meubels.find((x) => x.id === s.id);
    if (!m) { selectie = undefined; return toonEigenschappen(); }
    const t = cat.meubels[m.type];
    const zet = (f: (x: Meubel) => void) => wijzig('plan', (tt) => { const x = tt.plan.meubels.find((y) => y.id === m.id); if (x) f(x); });
    vak.append(el('h3', {}, t?.label ?? 'Meubel'));
    const maten = el('div', { class: 'maten' });
    maten.append(
      getalVeld('Breedte', m.b, (w) => zet((x) => { x.b = Math.max(10, w); }), { min: 10, stap: 5, eenheid: 'cm' }),
      getalVeld('Diepte', m.d, (w) => zet((x) => { x.d = Math.max(10, w); }), { min: 10, stap: 5, eenheid: 'cm' }),
    );
    vak.append(maten);
    const kleur = el('input', { type: 'color', 'aria-label': 'Kleur' }) as HTMLInputElement;
    kleur.value = m.kleur ?? t?.kleur ?? '#888888';
    kleur.addEventListener('change', () => zet((x) => { x.kleur = kleur.value; }));
    const l = el('label', { class: 'eig' });
    l.append(el('span', {}, 'Kleur'), kleur);
    vak.append(l);
    const af = meubelAfstanden(toestand().plan, m);
    if (af) vak.append(el('p', { class: 'klein' }, `Tot de muren: links ${getal(af.links)} · rechts ${getal(af.rechts)} · boven ${getal(af.boven)} · onder ${getal(af.onder)} cm`));
    if (PRIJZEN && t?.prijs) vak.append(el('p', { class: 'klein prijsdeel' }, `Richtprijs ${eur(t.prijs)} (alleen in de offerte als "Inrichting" aan staat).`));
    const r = el('div', { class: 'knoppenrij' });
    r.append(knop(aanraak() ? 'Draaien 90°' : 'Draaien 90° (Q)', draaiMeubel), knop('Verwijderen', verwijderSelectie, 'gevaar'));
    vak.append(r);
  } else if (s?.soort === 'wand') {
    if (!toonLosseWand(vak, pl, s.id)) { selectie = undefined; return toonEigenschappen(); }
  } else if (s?.soort === 'toestel' || s?.soort === 'leiding') {
    if (!toonTechniekEigenschappen(vak, s as TechniekSelectie, verwijderSelectie)) { selectie = undefined; return toonEigenschappen(); }
  } else if (s?.soort === 'daklicht') {
    const l = pl.daklichten?.find((x) => x.id === s.id);
    if (!l) { selectie = undefined; return toonEigenschappen(); }
    const type = cat.daklichten?.[l.type];
    const zet = (f: (x: DakLicht) => void) => wijzig('plan', (tt) => { const x = tt.plan.daklichten?.find((y) => y.id === l.id); if (x) f(x); });
    // De naam van wat er ligt: een lichtkoepel, een lichtstraat of een plat dakraam (doorloop A18).
    vak.append(el('h3', {}, type?.vorm === 'lichtstraat' ? 'Lichtstraat' : type?.vorm === 'dakraam' ? 'Plat dakraam' : 'Lichtkoepel'));
    const rij = el('label', { class: 'eig' });
    rij.append(el('span', {}, 'Maat'), keuzelijst('pl-daklicht-type', Object.entries(cat.daklichten ?? {}).map(([k, v]) => [k, v.label]), l.type, (w) => {
      // Andere maat: het midden blijft op zijn plaats; niet als het dan over een ander daklicht valt.
      const nieuw = cat.daklichten?.[w];
      if (!nieuw) return;
      const cx = l.x + l.b / 2, cy = l.y + l.d / 2;
      const maat = { x: snap(cx - nieuw.b / 2, 5), y: snap(cy - nieuw.d / 2, 5), b: nieuw.b, d: nieuw.d };
      const ander = daklichtTeDicht({ ...maat, id: l.id, niveau: niveauVan(l) });
      if (ander) { weiger(teDichtTekst(w, ander), [cx, cy]); return; }
      zet((x) => { Object.assign(x, { type: w, ...maat }); });
    }));
    vak.append(rij);
    const reden = dakOpbouw(toestand().plan, cat)?.daklichten.find((x) => x.licht.id === l.id)?.reden;
    if (reden) vak.append(el('p', { class: 'kleinmelding fout' }, `Kan hier niet: ${daklichtHij(l.type)} ${reden}`));
    // Een plat dakraam: de buitenzonwering (screen) en hoe ver ze in de 3D dicht is, zoals in de kaart Dak.
    const zon = dakraamZonweringVan(l.id);
    if (zon) vak.append(zon);
    const onder = ruimteOp(pl, l.x + l.b / 2, l.y + l.d / 2);
    vak.append(el('p', { class: 'klein' }, `Opening ${getal(l.b)} × ${getal(l.d)} cm${onder ? ` boven ${onder.naam}` : ''}. Telt mee voor het daglicht: ongeveer ${getal((l.b * l.d * DAKLICHT_GLAS) / 10000, 2)} m² glas.`));
    const r = el('div', { class: 'knoppenrij' });
    if (l.b !== l.d) r.append(knop('Draaien 90°', () => zet((x) => {
      const cx = x.x + x.b / 2, cy = x.y + x.d / 2;
      Object.assign(x, { b: x.d, d: x.b, x: snap(cx - x.d / 2, 5), y: snap(cy - x.b / 2, 5) });
    })));
    r.append(knop('Verwijderen', verwijderSelectie, 'gevaar'));
    vak.append(r);
  } else if (techniekAan()) {
    toonTechniekZonderKeuze(vak);
  } else {
    vak.append(el('h3', {}, 'Woning'));
    const zet = (f: (p: Plattegrond) => void) => wijzig('plan', (t) => f(t.plan));
    const maten = el('div', { class: 'maten' });
    maten.append(
      getalVeld('Muurhoogte', pl.muurhoogte, (w) => zet((p) => { p.muurhoogte = Math.min(400, Math.max(200, w)); }), { min: 200, max: 400, stap: 5, eenheid: 'cm' }),
      getalVeld('Buitenmuur', pl.buitenmuur, (w) => zet((p) => { p.buitenmuur = Math.min(60, Math.max(15, w)); }), { min: 15, max: 60, eenheid: 'cm' }),
      getalVeld('Binnenmuur', pl.binnenmuur, (w) => zet((p) => { p.binnenmuur = Math.min(30, Math.max(5, w)); }), { min: 5, max: 30, eenheid: 'cm' }),
      // Oriëntatie: waar het noorden ligt (0 = de bovenkant van het plan; dan blijft het veld uit het plan weg).
      getalVeld('Noord', pl.noord ?? 0, (w) => zet((p) => {
        const hoek = ((Math.round(w) % 360) + 360) % 360;
        if (hoek) p.noord = hoek; else delete p.noord;
      }), { min: 0, max: 359, stap: 15, eenheid: '°' }),
    );
    vak.append(maten, el('p', { class: 'klein' }, 'Noord: graden met de klok mee vanaf de bovenkant van het plan (0 = boven, 90 = rechts, 180 = onder). De noordpijl staat linksboven; de lichtinval in de 3D rekent ermee.'));
    // Gevel: materialen kies je in de gevel-editor (tab Gevels).
    const st = toestand().plan.gevelOntwerp?.standaard;
    const mat = st ? gevelCatalogus[st.materiaal] : undefined;
    const gevelTekst = mat ? `${mat.label}, ${(mat.kleuren[st!.kleur]?.label ?? st!.kleur).toLowerCase()}${toestand().plan.gevelOntwerp?.vlakken && Object.keys(toestand().plan.gevelOntwerp!.vlakken!).length ? ' (en andere materialen per vlak)' : ''}` : 'Gevelsteen (standaard)';
    const g = el('div', { class: 'eig' });
    const gk = knop('Gevel ontwerpen', () => toonWeergave('gevels'));
    g.append(el('span', {}, 'Gevel'), el('span', { class: 'klein' }, gevelTekst));
    vak.append(g, gk, el('p', { class: 'klein' }, 'Selecteer een ruimte, raam, deur of meubel om het aan te passen.'));
    // De opbouw van wanden, vloeren en dak (constructie, detail): dicht tot je hem openklapt.
    vak.append(opbouwKeuze());
  }
  toonOverzicht();
}

/** Eigenschappen van een losse wand: maten in cm, de afwerking (binnen) of het gevelmateriaal (buiten), verwijderen. */
function toonLosseWand(vak: HTMLElement, pl: Plattegrond, id: string): boolean {
  const w = pl.losseWanden?.find((x) => x.id === id);
  if (!w) return false;
  const muren = murenVan(pl), andere = andereWanden(id);
  const v = losseWandVlak(w, muren, andere), r = losseWandRuimte(pl, w);
  const zet = (f: (x: LosseWand) => void) => wijzig('plan', (t) => { const x = t.plan.losseWanden?.find((y) => y.id === id); if (x) f(x); });
  vak.append(el('h3', {}, r ? 'Losse wand' : 'Losse muur buiten'));
  vak.append(el('p', { class: 'klein' }, r
    ? `In ${r.naam}. Ze deelt de ruimte niet: de ruimte, haar oppervlakte en de controles blijven zoals ze zijn.`
    : 'Buiten de woning (een tuinmuur of keermuur), in een gevelmateriaal. Ze deelt niets op.'));
  const H = pl.muurhoogte;
  const welk = v.aan[1].soort === 'vrij' || v.aan[0].soort !== 'vrij' ? 'einde' : 'begin';
  const maten = el('div', { class: 'maten' });
  maten.append(
    cmMaatveld('Lengte', losseWandLengte(v), (L) => {
      const x = metLengte(w, v, L, welk);
      if (Math.abs(losseWandLengte(losseWandVlak(x, muren, andere)) - L) > 0.5) { melding = 'Zo lang kan ze niet: ze zou door een muur lopen.'; toonEigenschappen(); return; }
      zet((y) => { y.van = x.van; y.tot = x.tot; });
    }, LOSSE_WAND_MIN),
    cmMaatveld('Hoogte', w.hoogte ?? H, (h) => zet((y) => { if (r && h >= H - 0.5) delete y.hoogte; else y.hoogte = Math.min(r ? H : 600, h); })),
    cmMaatveld('Dikte', w.dikte, (d) => zet((y) => { y.dikte = Math.min(60, d); }), 5),
  );
  vak.append(maten);
  if (r) {
    const hoog = el('div', { class: 'knoppenrij' });
    hoog.append(
      knop(w.hoogte === undefined ? 'Tot het plafond ✓' : 'Tot het plafond', () => zet((y) => { delete y.hoogte; })),
      knop(w.hoogte === 110 ? 'Halfhoog, 110 cm ✓' : 'Halfhoog, 110 cm', () => zet((y) => { y.hoogte = 110; })),
    );
    vak.append(hoog);
  }
  // De vrije maat tot de evenwijdige muren: typen verschuift de wand dwars.
  const af = losseWandAfstanden(w, muren);
  const plaats = el('div', { class: 'maten' });
  for (const k of ['min', 'plus'] as const) {
    const a = af[k];
    if (a) plaats.append(cmMaatveld(`Vrij tot de muur ${a.naam}`, a.vrij, (nieuw) => zet((y) => {
      const x = dwarsVerschoven(y, (k === 'min' ? 1 : -1) * (nieuw - a.vrij));
      y.van = x.van;
      y.tot = x.tot;
    }), 0));
  }
  if (plaats.childElementCount) vak.append(plaats);
  const rij = (label: string, inhoud: HTMLElement) => { const l = el('label', { class: 'eig' }); l.append(el('span', {}, label), inhoud); return l; };
  if (r) {
    const eigen = cat.wanden[r.wand]?.label ?? r.wand;
    vak.append(rij('Afwerking', keuzelijst('pl-losse-afwerking', [['', `Zoals de ruimte (${eigen.toLowerCase()})`], ...Object.entries(cat.wanden).map(([k, x]): [string, string] => [k, x.label])], w.wand ?? '', (k) => zet((y) => { if (k) y.wand = k; else delete y.wand; }))));
  } else {
    const st = toestand().plan.gevelOntwerp?.standaard, stMat = st ? gevelCatalogus[st.materiaal] : undefined;
    const zoals = stMat ? `Zoals de gevel (${stMat.label.toLowerCase()})` : 'Zoals de gevel';
    vak.append(rij('Materiaal', keuzelijst('pl-losse-gevel', [['', zoals], ...Object.entries(gevelCatalogus).map(([k, m]): [string, string] => [k, m.label])], w.gevel?.materiaal ?? '', (k) => zet((y) => {
      const m = gevelCatalogus[k];
      if (!m) { delete y.gevel; return; }
      y.gevel = { materiaal: k, kleur: Object.keys(m.kleuren)[0]!, ...(m.voegen ? { voeg: Object.keys(m.voegen)[0]! } : {}) };
    }))));
    const m = w.gevel ? gevelCatalogus[w.gevel.materiaal] : undefined;
    if (w.gevel && m) vak.append(rij('Kleur', keuzelijst('pl-losse-kleur', Object.entries(m.kleuren).map(([k, x]): [string, string] => [k, x.label]), w.gevel.kleur, (k) => zet((y) => { if (y.gevel) y.gevel.kleur = k; }))));
  }
  const knoppen = el('div', { class: 'knoppenrij' });
  knoppen.append(knop('Maten typen', () => vraagLosseWand(id)), knop('Verwijderen', verwijderSelectie, 'gevaar'));
  vak.append(knoppen, el('p', { class: 'klein' }, 'Tip: sleep de wand of een eindpunt (de blauwe bolletjes), of tik op een maat in de tekening om ze te typen.'));
  return true;
}

function toonOverzicht() {
  toonDak();
  toonSferen();
  toonZon();
  const pl = plan();
  const muren = murenVan(pl);
  const tb = $('#pl-ruimtes tbody');
  let netto = 0, bruto = 0;
  tb.replaceChildren(...pl.ruimtes.map((r) => {
    const m = ruimteMaten(pl, r, muren);
    netto += m.netto;
    bruto += m.bruto;
    const tr = el('tr', { class: selectie?.id === r.id ? 'gekozen' : '' });
    tr.append(el('td', {}, r.naam), el('td', {}, RUIMTE_TYPES[r.type].label), el('td', { class: 'num' }, getal(m.netto, 1)));
    tr.addEventListener('click', () => { selectie = { soort: 'ruimte', id: r.id }; render(); toonEigenschappen(); });
    return tr;
  }));
  const alles = toestand().plan;
  const totaal = alles.ruimtes.reduce((t, r) => t + ruimteMaten(alles, r).netto, 0);
  const n = verdiepingenVan(alles).length;
  $('#pl-totaal').textContent = `${verdiepingenVan(alles)[niveau]?.naam}: ${getal(netto, 1)} m² netto · ${getal(bruto, 1)} m² bruto${n > 1 ? ` · woning ${getal(totaal, 1)} m² netto` : ''} · ${alles.openingen.filter((o) => o.positie).length} ramen en buitendeuren`;
  const meldingen = controleerPlan(alles, cat);
  for (const o of alles.openingen) {
    const p = positieVan(o);
    // Een raam met aantal 0 blijft zoals het is (bestaand): geen meldingen over iets wat niet gebouwd wordt (doorloop A25).
    if (p && p.aantal > 0) for (const m of resultaat(p).meldingen) meldingen.push({ ernst: m.ernst, melding: `${p.code}: ${m.melding}`, opening: o.id });
  }
  meldingen.sort((a, b) => (a.ernst === b.ernst ? 0 : a.ernst === 'fout' ? -1 : 1));
  $('#pl-meldingen').replaceChildren(...meldingen.map((m) => {
    const li = el('li', { class: m.ernst }, m.melding);
    const id = m.toestel ?? m.leiding ?? m.wand ?? m.opening ?? m.daklicht ?? m.ruimte;
    if (id) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        // Een melding over de techniek: de techniek aan, zijn vak getoond, het toestel of de leiding gekozen.
        const tech = m.toestel ? alles.toestellen?.find((x) => x.id === id) : m.leiding ? alles.leidingen?.find((x) => x.id === id) : undefined;
        if (tech) {
          niveau = niveauVan(tech);
          const s: TechniekSelectie = { soort: m.toestel ? 'toestel' : 'leiding', id };
          selectie = s;
          maakZichtbaar(s);
          if (weergave !== 'plan') toonWeergave('plan');
          kiesGereedschap('kies');
          return;
        }
        const item = m.wand ? alles.losseWanden?.find((w) => w.id === id) : m.opening ? alles.openingen.find((o) => o.id === id) : m.daklicht ? alles.daklichten?.find((l) => l.id === id) : alles.ruimtes.find((r) => r.id === id);
        if (item) niveau = niveauVan(item);
        selectie = { soort: m.wand ? 'wand' : m.opening ? 'opening' : m.daklicht ? 'daklicht' : 'ruimte', id };
        render();
        toonEigenschappen();
      });
    }
    return li;
  }));
  $('#pl-meldingen-leeg').hidden = meldingen.length > 0;
  const nF = meldingen.filter((m) => m.ernst === 'fout').length;
  $('#pl-controle-status').textContent = nF ? `${nF} fout${nF === 1 ? '' : 'en'}` : meldingen.length ? `${meldingen.length} aandachtspunt${meldingen.length === 1 ? '' : 'en'}` : 'alles in orde';
  $('#pl-controle-status').className = `status ${nF ? 'fout' : meldingen.length ? 'let-op' : 'ok'}`;
  $('#pl-offerte').textContent = PRIJZEN ? `${eur(berekenHuidigeOfferte().excl)} excl. btw` : '';
  if (ongedaanKnop) ongedaanKnop.disabled = !kanOngedaan();
}

// ---------- gereedschap ----------
function kiesGereedschap(g: Gereedschap, begin?: Parameters<typeof openMatenPaneel>[1]) {
  // Ruimte met maten: het paneel boven de tekening; een ander gereedschap sluit het.
  if (g !== 'maten' && matenPaneelOpen()) sluitMatenPaneel();
  // Een gewoon gereedschap (een sneltoets) zet de techniek uit.
  if (g !== 'kies' && techniekAan()) zetTechniek(false, { stil: true });
  // Meubel en Daklicht openen hun palet (op de plaats van het gereedschap); een ander gereedschap sluit het, Selecteren
  // niet (na het plaatsen blijft het palet open, zodat je meteen een volgend meubel kiest).
  if (g === 'meubel' || g === 'daklicht') palet = g;
  else if (g !== 'kies') palet = undefined;
  if (g !== gereedschap) verbergTikMelding();
  gereedschap = g;
  voorbeeldOpening = undefined;
  voorbeeldLosseWand = undefined;
  if (g === 'maten') {
    if (weergave !== 'plan') toonWeergave('plan');
    openMatenPaneel(matenOmgeving, begin);
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gereedschap]')) b.setAttribute('aria-pressed', String(b.dataset.gereedschap === g));
  toonGereedschapKaart();
  voorbeeld = undefined;
  render();
  toonEigenschappen();
}

/**
 * Met de techniek aan staat het palet van de techniek in de plaats van het gereedschap (zie techniek-ui.ts); met een open
 * palet van Meubel of Daklicht dat palet. Zo staat wat je kiest altijd naast de tekening (doorloop A6: vroeger stond het
 * palet onder 15 knoppen, tot 1175 beeldpunten diep).
 */
let paletSleutel = '';
function toonGereedschapKaart() {
  const tech = techniekAan();
  const open = tech ? undefined : palet;
  // Het palet alleen opnieuw opbouwen als er iets veranderde (render() roept dit bij elke beweging op).
  const sleutel = `${open}|${gereedschap}|${meubelType}|${daklichtType}|${meubelGroep}`;
  const nieuw = sleutel !== paletSleutel;
  paletSleutel = sleutel;
  const hint = tech ? techniekHint() : open && gereedschap === 'kies'
    ? `Klik op wat je plaatste om het te verslepen, of kies hiernaast ${open === 'meubel' ? 'een meubel' : 'een daklicht'} om nog een te plaatsen. ← Terug brengt het gereedschap terug.`
    : GEREEDSCHAP.find((x) => x.code === gereedschap)?.hint ?? '';
  $('#pl-hint').textContent = voorVinger(hint);
  $('#pl-gereedschap').hidden = tech || !!open;
  const kop = $('#pl-gereedschap').previousElementSibling;
  if (kop) kop.textContent = tech ? 'Techniek' : open ? PALET_TITEL[open] : 'Gereedschap';
  $('#pl-meubels').hidden = open !== 'meubel';
  $('#pl-daklichten').hidden = open !== 'daklicht';
  if (!nieuw) return;
  // Het open palet opnieuw opbouwen; een dicht palet leeg (zijn knoppen staan dan niet dubbel in de pagina).
  if (open === 'meubel') toonMeubelPalet(); else $('#pl-meubels').replaceChildren();
  if (open === 'daklicht') toonDaklichtPalet(); else $('#pl-daklichten').replaceChildren();
}

/** De kop van een palet: terug naar het gereedschap, en Selecteren (om wat je plaatste te verslepen). */
function paletKop(): HTMLElement {
  const kop = el('div', { class: 'knoppenrij tkop' });
  const terug = el('button', { type: 'button', class: 'tweede', 'data-palet-terug': '', title: 'Terug naar het gereedschap' }, '← Terug');
  terug.addEventListener('click', () => { palet = undefined; kiesGereedschap('kies'); });
  const kies = el('button', { type: 'button', 'data-palet-kies': '', 'aria-pressed': String(gereedschap === 'kies') }, 'Selecteren');
  kies.addEventListener('click', () => kiesGereedschap('kies'));
  kop.append(terug, kies);
  return kop;
}

/**
 * Het meubelpalet: de groepen als tabs (Zitten, Eten, …, Trappen) en de meubels van de open groep als tegels, zodat het
 * hele palet naast de tekening past (vroeger 24 knoppen onder elkaar, de trap helemaal onderaan).
 */
function toonMeubelPalet() {
  const vak = $('#pl-meubels');
  const groepen = [...new Set(Object.values(cat.meubels).map((m) => m.groep))];
  meubelGroep = meubelGroep && groepen.includes(meubelGroep) ? meubelGroep : cat.meubels[meubelType]?.groep ?? groepen[0];
  const tabs = el('div', { class: 'tabs paletgroepen', role: 'group', 'aria-label': 'Soort meubel' });
  for (const g of groepen) {
    const b = el('button', { type: 'button', 'data-meubel-groep': g, 'aria-pressed': String(g === meubelGroep) }, g);
    b.addEventListener('click', () => { meubelGroep = g; toonMeubelPalet(); });
    tabs.append(b);
  }
  const tegels = el('div', { class: 'ttegels', role: 'group', 'aria-label': meubelGroep ?? 'Meubels' });
  for (const [code, m] of Object.entries(cat.meubels).filter(([, m]) => m.groep === meubelGroep)) {
    const actief = gereedschap === 'meubel' && code === meubelType;
    const b = el('button', { type: 'button', class: 'ttegel', 'data-meubel': code, 'aria-pressed': String(actief) }, m.label);
    b.addEventListener('click', () => { meubelType = code; kiesGereedschap('meubel'); });
    tegels.append(b);
  }
  vak.className = 'paletlade';
  vak.replaceChildren(paletKop(), tabs, tegels);
}

/**
 * Ronde 16: de knop *Trap* bij Inrichting. Dezelfde weg als Meubel → Trappen → de trap (het meubelpalet opent op
 * Trappen met de trap klaar), maar zonder te zoeken: een trap is voor een verkoper geen meubel.
 */
function trapKnop(): HTMLButtonElement {
  const t = TRAP ? cat.meubels[TRAP] : undefined;
  const b = el('button', { type: 'button', 'data-gereedschap-trap': '', title: t?.label ?? 'Trap' }) as HTMLButtonElement;
  b.append(el('span', {}, 'Trap'));
  b.addEventListener('click', () => {
    if (!TRAP || !t) return;
    sluitMaatVraag(true);
    meubelType = TRAP;
    meubelGroep = t.groep;
    kiesGereedschap('meubel');
  });
  return b;
}

/** Het palet van de daklichten: lichtkoepels, lichtstraten en platte dakramen (vaste maten uit de catalogus). */
function toonDaklichtPalet() {
  const vak = $('#pl-daklichten');
  const groepen = [...new Set(Object.values(cat.daklichten ?? {}).map((t) => t.groep))];
  const delen: HTMLElement[] = [paletKop()];
  for (const g of groepen) {
    const tegels = el('div', { class: 'ttegels', role: 'group', 'aria-label': g });
    for (const [code, t] of Object.entries(cat.daklichten ?? {}).filter(([, t]) => t.groep === g)) {
      const actief = gereedschap === 'daklicht' && code === daklichtType;
      const b = el('button', { type: 'button', class: 'ttegel', 'data-daklicht': code, 'aria-pressed': String(actief) }, t.label);
      b.addEventListener('click', () => { daklichtType = code; kiesGereedschap('daklicht'); });
      tegels.append(b);
    }
    delen.push(el('p', { class: 'tsub' }, g), tegels);
  }
  vak.className = 'paletlade';
  vak.replaceChildren(...delen);
}

function toonWeergave(w: 'plan' | 'gevels' | '3d' | 'doorsnede') {
  if (w !== weergave) sluitMaatVraag(true);
  weergave = w;
  try { sessionStorage.setItem(SLEUTEL_WEERGAVE, w); } catch { /* geen opslag */ }
  // In 3D op een tablet: de 3D over de hele breedte, het gereedschap (voor de plattegrond) eronder.
  $('#view-plan').classList.toggle('driedmodus', w === '3d' || w === 'doorsnede');
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-pl-weergave]')) b.setAttribute('aria-pressed', String(b.dataset.plWeergave === w));
  // Het tekenvlak met zijn zoomknoppen.
  $('#pl-canvas').parentElement!.hidden = w !== 'plan';
  $('#pl-zoomhint').hidden = w !== 'plan';
  $('#gv-editor').hidden = w !== 'gevels';
  $('#view-plan').classList.toggle('gevelmodus', w === 'gevels');
  if (w === 'gevels') gevelNaWijziging();
  $('#pl-3d').hidden = w !== '3d';
  $('#pl-3d-knoppen').hidden = w !== '3d';
  // De doorsnede (ronde 6): een tekening uit de constructie, onder de knoppen van de weergave.
  $('#pl-doorsnede').hidden = w !== 'doorsnede';
  if (w === 'doorsnede') toonDoorsnede();
  if (w !== '3d') { gekozenDing = null; viewer?.markeer?.(null); stopBinnen(false); }
  toonDingKeuzes();
  $('#pl-hint').hidden = w !== 'plan';
  if (w === '3d') {
    if (viewer === undefined) {
      viewer = maak3D($('#pl-3d'), { opKlik: tikIn3D });
      // De woning staat buiten: lucht, gras en horizon. Snel of Mooi volgens de keuze (op een aanraakscherm eerst Snel).
      viewer?.omgeving?.('buiten');
      viewer?.kwaliteit?.(kwaliteit3D());
      // Voor geautomatiseerde tests en metingen: de kijker van de woning bereikbaar.
      (window as unknown as { __bouw3d?: Viewer3D | null }).__bouw3d = viewer;
    }
    viewer?.formaat();
    plan3D();
    toonNaastKnop();
  }
  // Ongedaan maken staat bij wat je ziet: in de hoek van de 3D (meteen terug na een stijl of een keuze in het keuzepaneel),
  // anders in de rij van het zoomen boven de tekening. Bij de gevels en de doorsnede staat ze in een verborgen vak.
  if (ongedaanKnop) {
    if (w === '3d') $('#pl-3d').append(ongedaanKnop);
    else if (w === 'plan') $('#pl-zoomvlak').append(ongedaanKnop);
  }
  // Dag of nacht (ronde 15): rechtsboven op de 3D, één tik; eronder de verlichting in één tik (ronde 15b).
  if (w === '3d') $('#pl-3d').append(dagNachtKnop(wisselNacht), ...verlichtingIn3D());
}

/** De knop *Varianten naast elkaar* alleen als dit ontwerp varianten heeft. */
function toonNaastKnop() {
  $('#pl-naast').hidden = familie().length < 2;
}

/** Toont de 3D het huidige ontwerp? Na elke wijziging (of een ander project) niet meer, tot de 3D opnieuw getekend is. */
let beeldActueel = false;

/**
 * Het beeld van de 3D van de woning zoals ze laatst getoond werd (JPEG als data-URL), of null als de 3D nog niet open
 * was of sindsdien iets veranderde (dan zou het een ander ontwerp tonen).
 */
export function ontwerpBeeld(): string | null {
  // Bij nacht (ronde 15) niet: het overzicht toont de woning overdag (dan tekent het overzicht het beeld zelf).
  return beeldActueel && !nachtGekozen() ? viewer?.beeld?.('image/jpeg', 0.85) ?? null : null;
}

/** De nacht in de 3D (ronde 15): zoals gekozen, maar alleen in Afgewerkt (niet in de constructie of de techniek). */
function nachtIn3D() {
  const getoond = nachtGekozen() && !constructieAan() && !techniekAan();
  toonDagNacht(getoond);
  toonVerlichting(getoond);
  viewer?.nacht?.(getoond);
}

/** Een tik op Dag of Nacht: bij Nacht vanuit de constructie of de techniek eerst terug naar Afgewerkt (dat tekent opnieuw). */
function wisselNacht(aan: boolean) {
  if (aan && (constructieAan() || techniekAan())) zetConstructieWeergave('afgewerkt');
  else nachtIn3D();
}

/** Kwaliteit van de 3D van de woning: de bewaarde keuze, anders Snel op een aanraakscherm en Mooi op een computer. */
const SLEUTEL_KWALITEIT = 'bouw-demo.3d-kwaliteit';
function kwaliteit3D(): Kwaliteit {
  let bewaard: string | null = null;
  try { bewaard = localStorage.getItem(SLEUTEL_KWALITEIT); } catch { /* geen opslag */ }
  return bewaard === 'snel' || bewaard === 'mooi' ? bewaard : window.matchMedia?.('(pointer: coarse)').matches ? 'snel' : 'mooi';
}

/**
 * Na herladen terug in de weergave waarin je zat (16/11, doorloop A26: na herladen in de 3D stond de plattegrond open).
 * Alleen de eerste keer na het laden; daarna toont de hoofdknop "Plattegrond" de plattegrond zelf, zoals altijd.
 */
const SLEUTEL_WEERGAVE = 'bouw-demo.plattegrond-weergave';
let weergaveNaHerladen: string | null = null;
try { weergaveNaHerladen = sessionStorage.getItem(SLEUTEL_WEERGAVE); } catch { /* geen opslag */ }

export function toonPlan(openingId?: string) {
  const terug = weergaveNaHerladen;
  weergaveNaHerladen = null;
  if (!openingId && (terug === '3d' || terug === 'gevels' || terug === 'doorsnede') && toestand().plan.ruimtes.length) {
    toonWeergave(terug);
    return;
  }
  // De hoofdknop "Plattegrond" toont de plattegrond zelf (niet de laatst geopende sub-weergave Gevels of 3D).
  if (weergave !== 'plan') toonWeergave('plan');
  // Leeg plan: meteen het gereedschap om een ruimte te tekenen.
  if (!toestand().plan.ruimtes.length && gereedschap === 'kies') kiesGereedschap('ruimte');
  if (openingId) {
    selectie = { soort: 'opening', id: openingId };
    const o = toestand().plan.openingen.find((x) => x.id === openingId);
    if (o) niveau = niveauVan(o);
  }
  render();
  toonEigenschappen();
}

export function startPlattegrond(nav: { naarPositie: (id: string) => void; naarOfferte: () => void; naarProjecten: () => void; naarVarianten: () => void }) {
  naarPositie = nav.naarPositie;
  naarOfferte = nav.naarOfferte;
  naarProjecten = nav.naarProjecten;
  naarVarianten = nav.naarVarianten;
  const lijst = $('#pl-gereedschap');
  // Ronde 16: in groepen met een kop (GEREEDSCHAP_GROEPEN); dezelfde knoppen als vroeger. Een kop of een paar is een eigen
  // element in het rooster (`.groepkop` over de hele breedte, `.gpaar` twee naast elkaar); de knop Techniek komt erna.
  const knopVan = (code: GereedschapKnop) => {
    if (code === 'trap') return trapKnop();
    const g = GEREEDSCHAP.find((x) => x.code === code)!;
    const b = el('button', { type: 'button', 'data-gereedschap': g.code, 'aria-pressed': String(g.code === gereedschap), title: g.toets ? `${g.label} (${g.toets})` : g.label });
    b.append(el('span', {}, g.kort));
    if (g.toets) b.append(el('kbd', {}, g.toets));
    b.addEventListener('click', () => { sluitMaatVraag(true); kiesGereedschap(g.code); });
    return b;
  };
  const delen: HTMLElement[] = [];
  for (const groep of GEREEDSCHAP_GROEPEN) {
    if (groep.kop) delen.push(el('p', { class: 'groepkop' }, groep.kop));
    for (const rij of groep.rijen) {
      const knoppen = (typeof rij === 'string' ? [rij] : rij).filter((c) => c !== 'trap' || TRAP).map(knopVan);
      if (knoppen.length === 1) { delen.push(knoppen[0]!); continue; }
      const paar = el('div', { class: 'gpaar' });
      paar.append(...knoppen);
      delen.push(paar);
    }
  }
  delen.push(el('p', { class: 'groepkop' }, 'Techniek'));
  // Een groep van één knop over de hele breedte (op een tablet staat het gereedschap in twee kolommen).
  for (const code of ['kies', 'daklicht'] as Gereedschap[]) delen.find((x) => x.dataset?.gereedschap === code)?.classList.add('gbreed');
  lijst.replaceChildren(...delen);
  // De paletten van Meubel en Daklicht worden opgebouwd als ze opengaan (toonGereedschapKaart).
  const houder = $('#pl-canvas');
  zoom = new Zoom({
    doel: houder,
    svg: () => houder.querySelector('svg'),
    passend: passendKader,
    opnieuw: render,
    minBreedte: 60,
    wielZoomt: () => document.body.classList.contains('heeft-groot-scherm'),
    opKnijpen: () => {
      // Tweede vinger: de lopende actie annuleren (en een begonnen verplaatsing terugdraaien).
      if (sleep?.bewogen && sleep.soort !== 'teken' && sleep.soort !== 'wand' && sleep.soort !== 'losse') ongedaan();
      sleep = undefined;
      pannen = undefined;
      tikWacht = undefined;
      voorbeeld = undefined;
      voorbeeldWand = undefined;
      voorbeeldLosseWand = undefined;
    },
  });
  const vlak = document.createElement('div');
  vlak.className = 'zoomvlak';
  vlak.id = 'pl-zoomvlak';
  houder.before(vlak);
  // Het paneel Ruimte met maten staat over de hele breedte boven het gereedschap en de tekening (op een tablet blijft
  // het zo boven het toetsenbord in beeld).
  startMaten(matenOmgeving);
  $('#view-plan .planraster').before(el('section', { id: 'pl-maatpaneel', class: 'maatpaneel', hidden: '', 'aria-label': 'Ruimte met maten' }));
  // Ongedaan maken links in de rij van het zoomen (in de 3D gaat de knop naar de hoek van de 3D, zie toonWeergave).
  ongedaanKnop = $<HTMLButtonElement>('#pl-ongedaan');
  vlak.append(houder, zoom.knoppen({ selectie: selectieKader, grootScherm: $('#view-plan') }), ongedaanKnop);
  houder.addEventListener('pointerdown', naPointerDown);
  houder.addEventListener('pointermove', naPointerMove);
  houder.addEventListener('pointerup', naPointerUp);
  houder.addEventListener('pointerleave', () => {
    if (voorbeeldOpening || (gereedschap === 'daklicht' && voorbeeld)) { voorbeeldOpening = undefined; voorbeeld = undefined; render(); }
    if (techniekVoorbeeld(undefined)) render();
  });
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-pl-weergave]')) b.addEventListener('click', () => toonWeergave(b.dataset.plWeergave as 'plan' | 'gevels' | '3d' | 'doorsnede'));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-pl-standpunt]')) b.addEventListener('click', () => {
    // Een standpunt kiezen: terug naar het gewone kader van de woning.
    if (ruimKader) { ruimKader = false; plan3D(); volgendStandpunt = b.dataset.plStandpunt as Standpunt; return; }
    viewer?.standpunt(b.dataset.plStandpunt as 'schuin');
  });
  $<HTMLInputElement>('#pl-laag').addEventListener('change', (e) => {
    laag = (e.target as HTMLInputElement).checked;
    stopBinnen(false);
    // Binnenkijken: van schuin boven en dichterbij, anders blijft het huis op ooghoogte een strook aan de horizon (doorloop A12).
    if (laag) { ruimKader = false; volgendStandpunt = 'schuin'; }
    plan3D();
  });
  $<HTMLInputElement>('#pl-toon-meubels').addEventListener('change', (e) => { toonMeubels = (e.target as HTMLInputElement).checked; plan3D(); });
  $<HTMLInputElement>('#pl-alle-niveaus').addEventListener('change', (e) => { alleNiveaus = (e.target as HTMLInputElement).checked; plan3D(); });
  $<HTMLInputElement>('#pl-toon-dak').addEventListener('change', (e) => { toonDakIn3D = (e.target as HTMLInputElement).checked; plan3D(); });
  const kwaliteit = $<HTMLSelectElement>('#pl-3d-kwaliteit');
  kwaliteit.value = kwaliteit3D();
  kwaliteit.addEventListener('change', () => {
    const k: Kwaliteit = kwaliteit.value === 'snel' ? 'snel' : 'mooi';
    try { localStorage.setItem(SLEUTEL_KWALITEIT, k); } catch { /* geen opslag */ }
    viewer?.kwaliteit?.(k);
  });
  // Afgewerkt of Constructie (ronde 6): de knop boven de knoppen van de 3D.
  startConstructie({ opnieuw: () => plan3D(), bijWeergave: () => { if (techniekAan()) zetTechniek(false); } });
  // Ronde 16: de kwaliteit en de bediening (slepen = draaien …) in de rij Weergave, geen eigen rij.
  document.querySelector('#pl-3d-knoppen .constructiebalk')?.append($('#pl-beeldkeuze'));
  // Techniek voor de installateur (ronde 10b): het palet, de knop in het gereedschap en *Techniek* bij de 3D.
  startTechniek({
    niveau: () => niveau,
    schaal: schaalNu,
    snap: (v) => snap(v, fijn()),
    selectie: () => selectie,
    kies: (s) => { selectie = s; melding = ''; render(); toonEigenschappen(); },
    opnieuw: () => render(),
    eigenschappen: () => toonEigenschappen(),
    melding: (tekst, bij, weigering) => { melding = tekst; toonEigenschappen(); if (bij) tikMelding(tekst, bij, weigering ? 'weiger' : 'info'); },
    gewisseld: () => { selectie = undefined; melding = ''; if (techniekAan()) palet = undefined; kiesGereedschap('kies'); if (weergave === '3d') plan3D(); },
    drieD: () => plan3D(),
    svg: () => $('#pl-canvas').querySelector('svg'),
    naarPlan: (s) => {
      const x = s.soort === 'toestel' ? toestand().plan.toestellen?.find((y) => y.id === s.id) : toestand().plan.leidingen?.find((y) => y.id === s.id);
      if (x) niveau = niveauVan(x);
      toonWeergave('plan');
      selectie = s;
      maakZichtbaar(s);
      kiesGereedschap('kies');
    },
  });
  startDoorsnede();
  // Ronde 16: de kaarten rechts klappen dicht tot hun kop (standaard open, de keuze blijft in de browser).
  vouwbaar(document.getElementById('pl-dak'), 'dak', 'Dak');
  vouwbaar(document.getElementById('pl-binnen'), 'binnen', 'Binnenafwerking');
  vouwbaar(document.getElementById('pl-controles-kaart'), 'controles', 'Controles');
  vouwbaar(document.getElementById('pl-ruimtes-kaart'), 'ruimtes', 'Ruimtes');
  // Lichtinval: aan of uit bouwt de 3D opnieuw op (verborgen delen als schaduwwerper); dag en uur verzetten alleen de zon.
  startZon({ opnieuw: () => plan3D(), zon: () => viewer?.zon?.(zonVoorKijker()) });
  $('#pl-standpunten').append(grootSchermKnop($('#view-plan'), () => viewer?.formaat()));
  // Stijlen (één tik zet het hele ontwerp in een stijl) en een variant (kopie om te vergelijken), onder de 3D.
  $('#pl-stijlen').replaceChildren(stijlRij());
  // Ronde 12: de sferen voor binnen, onder de stijlen en in de kaart Binnenafwerking naast de plattegrond.
  $('#pl-sferen').replaceChildren(sfeerRij());
  binnenKaart($('#pl-binnen'));
  $('#pl-variant').addEventListener('click', () => {
    const naam = maakVariant();
    $('#pl-variant-melding').textContent = `Je werkt nu in "${naam}". Het origineel staat bij Projecten.`;
    toonNaastKnop();
  });
  $('#pl-naast').addEventListener('click', () => naarVarianten());
  $<HTMLInputElement>('#pl-maten').addEventListener('change', (e) => { toonMaten = (e.target as HTMLInputElement).checked; plan3D(); });
  // Een ander project (snelstart, variant, openen): beginnen op het gelijkvloers, zonder keuze, passend in beeld.
  opWijziging((bron) => {
    beeldActueel = false;
    if (bron !== 'vervang') return;
    // Een ander project: het paneel Ruimte met maten en een open maatvraag horen bij het vorige.
    sluitMaatVraag(true);
    // De techniek ook: een nieuw ontwerp (de snelstart) begint met het gewone beeld (het voorbeeld met techniek zet ze daarna weer aan).
    if (techniekAan()) zetTechniek(false, { stil: true });
    if (matenPaneelOpen()) { sluitMatenPaneel(); gereedschap = 'kies'; for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gereedschap]')) b.setAttribute('aria-pressed', String(b.dataset.gereedschap === 'kies')); }
    // Een open palet hoort ook bij het vorige project: het nieuwe begint met het gereedschap.
    if (palet) palet = undefined;
    if (gereedschap === 'meubel' || gereedschap === 'daklicht') {
      gereedschap = 'kies';
      for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gereedschap]')) b.setAttribute('aria-pressed', String(b.dataset.gereedschap === 'kies'));
    }
    verbergTikMelding();
    if (weergave === '3d') toonNaastKnop();
    stopBinnen(false);
    niveau = 0;
    selectie = undefined;
    gekozenDing = null;
    viewer?.markeer?.(null);
    zoom?.passendMaken();
  });
  $('#pl-ongedaan').addEventListener('click', () => { sluitMaatVraag(true); ongedaan(); });
  $('#pl-voorbeeld').addEventListener('click', () => naarProjecten());
  // Wissen vraagt een tweede, bewuste tik (een dubbeltik wist niet meer: doorloop A23).
  zekerKnop($<HTMLButtonElement>('#pl-leeg'), 'Zeker? (ongedaan maken kan)', () => {
    selectie = undefined;
    niveau = 0;
    // Alleen de plattegrond van dit project; posities zonder opening blijven in de offerte.
    wijzig('plan', (t) => {
      const weg = new Set(t.plan.openingen.map((o) => o.positie).filter(Boolean));
      t.posities = t.posities.filter((p) => !weg.has(p.id));
      t.plan = { ...t.plan, ruimtes: [], openingen: [], meubels: [], verdiepingen: [{ naam: 'Gelijkvloers' }] };
      // De lichtkoepels en de losse wanden gaan mee weg; de dakkeuze (vorm en bedekking) blijft, zoals de gevel.
      delete t.plan.daklichten;
      delete t.plan.losseWanden;
      delete t.plan.toestellen;
      delete t.plan.leidingen;
      // De stroken op de gevel (ronde 14) hangen aan een kant en maten, niet aan een ruimte: ze gaan mee weg.
      if (t.plan.gevelOntwerp?.stroken) t.plan.gevelOntwerp = (({ stroken: _, ...o }) => o)(t.plan.gevelOntwerp);
    });
    kiesGereedschap('ruimte');
  });
  $('#pl-naarofferte').addEventListener('click', () => naarOfferte());
  startGevels({
    voegRaamToe,
    naarPositie: (id) => naarPositie(id),
    naarPlan: (id) => { toonWeergave('plan'); toonPlan(id); },
    naar3D: () => toonWeergave('3d'),
  });

  // Esc sluit eerst het maatvenster (zoals ×: wat getypt was, gaat terug), ook als de focus niet in het venster staat (na
  // een tik op de tekening); het gereedschap en het groot scherm blijven dan zoals ze zijn (doorloop A7). Vóór alle andere
  // luisteraars, ook die van het groot scherm.
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !maatVraagOpen() || $('#view-plan').hidden) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    sluitMaatVraag(false);
  }, true);

  document.addEventListener('keydown', (ev) => {
    if ($('#view-plan').hidden) return;
    const doel = ev.target as HTMLElement;
    if (doel.closest('input, select, textarea')) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); ongedaan(); return; }
    if (weergave === 'gevels') { if (gevelToets(ev)) ev.preventDefault(); return; }
    if (weergave === '3d') return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') { if (selectie) { ev.preventDefault(); verwijderSelectie(); } return; }
    if (ev.key === 'Escape') { selectie = undefined; if (techniekAan()) techniekSelecteren(); kiesGereedschap('kies'); return; }
    if (ev.key.toLowerCase() === 'q') { if (selectie?.soort === 'toestel') draaiToestel(selectie.id); else draaiMeubel(); return; }
    if (zoom?.toets(ev)) { ev.preventDefault(); return; }
    const sneltoets = GEREEDSCHAP.find((g) => g.toets && g.toets.toLowerCase() === ev.key.toLowerCase());
    if (sneltoets && !ev.ctrlKey && !ev.metaKey) { kiesGereedschap(sneltoets.code); return; }
    // Pijltjes: selectie 5 cm verschuiven (met Shift 1 cm).
    const stap = ev.shiftKey ? 1 : 5;
    const d: Record<string, [number, number]> = { ArrowLeft: [-stap, 0], ArrowRight: [stap, 0], ArrowUp: [0, -stap], ArrowDown: [0, stap] };
    const v = d[ev.key];
    if (v && selectie?.soort === 'toestel') { ev.preventDefault(); verschuifToestel(selectie.id, v[0], v[1]); return; }
    if (v && selectie) {
      ev.preventDefault();
      const s = selectie;
      wijzig('plan', (t) => {
        if (s.soort === 'meubel') { const m = t.plan.meubels.find((x) => x.id === s.id); if (m) { m.x += v[0]; m.y += v[1]; } }
        if (s.soort === 'daklicht') { const l = t.plan.daklichten?.find((x) => x.id === s.id); if (l) { l.x += v[0]; l.y += v[1]; } }
        if (s.soort === 'opening') { const o = t.plan.openingen.find((x) => x.id === s.id); if (o) o.midden += o.as === 'h' ? v[0] : v[1]; }
        if (s.soort === 'wand') { const w = t.plan.losseWanden?.find((x) => x.id === s.id); if (w) { w.van = [w.van[0] + v[0], w.van[1] + v[1]]; w.tot = [w.tot[0] + v[0], w.tot[1] + v[1]]; } }
      });
    }
  });
  kiesGereedschap('kies');
}

/** Wat het paneel Ruimte met maten van de plattegrond nodig heeft. */
const matenOmgeving: MatenOmgeving = {
  plan, niveau: () => niveau,
  opnieuw: () => render(),
  geplaatst: (id, tekst) => {
    melding = tekst;
    selectie = { soort: 'ruimte', id };
    kiesGereedschap('kies');
    // De nieuwe ruimte in beeld.
    zoom?.passendMaken();
  },
  kaart: () => $('#pl-werkvlak'),
  svg: () => $('#pl-canvas').querySelector('svg'),
  dicht: () => kiesGereedschap('kies'),
  naar3D: () => toonWeergave('3d'),
};

/** Ruimte met maten openen van buiten de plattegrond (de 3D, de snelstart): eventueel tegen een gekozen muur. */
export function openRuimteMetMaten(begin?: Parameters<typeof openMatenPaneel>[1]) {
  kiesGereedschap('maten', begin);
}

/** Wordt opgeroepen na elke wijziging in de toestand. */
export function naWijziging() {
  // Een wijziging die niet van de open maatvraag komt (een veld, een ander gereedschap, slepen): de vraag hoort bij de
  // toestand van daarnet, dus dicht (wat er getypt was, blijft).
  if (maatVraagOpen() && !maatVraagBezig()) sluitMaatVraag(true);
  render();
  if (!sleep || sleep.soort === 'meubel' || sleep.soort === 'opening' || sleep.soort === 'daklicht' || sleep.soort === 'lossewand' || sleep.soort === 'wandeind') toonEigenschappen();
  else toonOverzicht();
}
