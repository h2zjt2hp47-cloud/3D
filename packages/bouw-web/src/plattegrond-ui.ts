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
} from '../../core/src/index.js';
import { planCatalogus as cat } from '../../core/voorbeelden/inrichting.js';
import { maak3D, type Kwaliteit, type Standpunt, type Viewer3D } from '../../demo-web/src/drie-d.js';
import { isDing, maakVariant, stijlRij, toonDing } from './ding-ui.js';
import { grootSchermKnop, Zoom, type Kader } from '../../demo-web/src/zoom.js';
import { $, el, eur, getal, getalVeld, keuzelijst, PRIJZEN } from './hulp.js';
import { berekenHuidigeOfferte } from './offerte-ui.js';
import { openingInfo, openingInhoud, prijsTekst } from './positie-3d.js';
import { gevelNaWijziging, gevelToets, startGevels } from './gevel-ui.js';
import { dakLijnen, heeftDak, LICHTSTRATEN, metDak, toonDak } from './dak-ui.js';
import { lichtinvalAan, startZon, toonZon, zonVoorKijker } from './zon-ui.js';
import { familie } from './meegeven.js';
import { cmVeld, leesCm, maatVraagBezig, startMaten, matenKader, matenPaneelOpen, matenTik, matenVoorbeeld, maatVraagOpen, openMatenPaneel, plaatsMaatVraag, sluitMaatVraag, sluitMatenPaneel, vraagMaat, type MatenOmgeving } from './maten-ui.js';
import { gevelCatalogus } from '../../core/voorbeelden/inrichting.js';

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

type Gereedschap = 'kies' | 'ruimte' | 'maten' | 'wand' | 'wand_v' | 'wand_h' | 'raam' | 'buitendeur' | 'schuifraam' | 'garagepoort' | 'binnendeur' | 'doorgang' | 'meubel' | 'daklicht';
type Selectie = { soort: 'ruimte' | 'opening' | 'meubel' | 'daklicht'; id: string } | undefined;

const GEREEDSCHAP: { code: Gereedschap; label: string; toets: string; hint: string }[] = [
  { code: 'kies', label: 'Selecteren en verplaatsen', toets: 'V', hint: 'Klik om te selecteren. Sleep een ruimte, raam, deur of meubel. Sleep de blauwe bolletjes om een wand te verschuiven.' },
  { code: 'ruimte', label: 'Ruimte tekenen', toets: 'T', hint: 'Sleep een rechthoek, ook binnen een bestaande ruimte ("ruimte in ruimte"): wat overlapt wordt uit de oude ruimte gesneden. Muren volgen automatisch.' },
  { code: 'maten', label: 'Ruimte met maten', toets: 'N', hint: 'Typ de maten van de muren in cm (rechthoek, of vier zijden en een diagonaal voor schuine muren) en kies waar de ruimte komt: tegen een gevel (tik op de muur), los of als nieuw project.' },
  { code: 'wand', label: 'Wand tekenen (indelen)', toets: 'W', hint: 'Sleep een wand door een of meer ruimtes: elke ruimte die de wand kruist, wordt in twee gedeeld.' },
  { code: 'wand_v', label: 'Indelen │ (staande wand)', toets: '', hint: 'Klik in een ruimte om ze met een staande wand in twee te delen.' },
  { code: 'wand_h', label: 'Indelen ─ (liggende wand)', toets: '', hint: 'Klik in een ruimte om ze met een liggende wand in twee te delen.' },
  { code: 'raam', label: 'Raam', toets: 'R', hint: 'Klik op een buitenmuur. Er komt ook een regel in het overzicht bij.' },
  { code: 'buitendeur', label: 'Buitendeur', toets: '', hint: 'Klik op een buitenmuur. In een hal wordt het een voordeur, anders een terrasdeur.' },
  { code: 'schuifraam', label: 'Schuifraam', toets: '', hint: 'Klik op een buitenmuur.' },
  { code: 'garagepoort', label: 'Garagepoort', toets: '', hint: 'Klik op een buitenmuur. Belijning, vensters en kleur kies je in de configurator.' },
  { code: 'binnendeur', label: 'Binnendeur', toets: 'D', hint: 'Klik op een binnenmuur. Draairichting wissel je in de eigenschappen.' },
  { code: 'doorgang', label: 'Doorgang (zonder deur)', toets: '', hint: 'Klik op een binnenmuur.' },
  { code: 'meubel', label: 'Meubel', toets: 'M', hint: 'Kies een meubel hieronder en klik in de plattegrond.' },
  { code: 'daklicht', label: 'Lichtkoepel of lichtstraat', toets: 'K', hint: 'Kies een maat hieronder en klik in een ruimte zonder verdieping erboven. Het dak moet daar plat zijn.' },
];

let gereedschap: Gereedschap = 'kies';
let meubelType = 'bank3';
let daklichtType = 'koepel_100';
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
let maatNaKlik: { doel: string; vak: DOMRect; x: number; y: number } | undefined;
let voorbeeld: { x: number; y: number; b: number; d: number } | undefined;
let voorbeeldOpening: Opening | undefined;
let weergave: 'plan' | 'gevels' | '3d' = 'plan';
let niveau = 0;
let alleNiveaus = true;
let voorbeeldWand: { x1: number; y1: number; x2: number; y2: number } | undefined;
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
 * Het kader van de woning breder gemaakt (zelfde midden): de kijker zet de camera op anderhalve keer de breedte of de
 * diepte, wat op ooghoogte de bovenkant van een woning met een hellend dak afsnijdt. Zo staat ze er helemaal op, met
 * lucht erboven en gras ervoor.
 */
function ruimKaderVan(s: Scene3D): Scene3D {
  const k = s.kader, b = Math.max(k.b * 1.8, k.h * 1.8, k.d * 1.2);
  return { ...s, kader: { ...k, x: k.x - (b - k.b) / 2, b } };
}

interface Sleep {
  soort: 'teken' | 'wand' | 'ruimte' | 'greep' | 'hoek' | 'opening' | 'meubel' | 'daklicht';
  /** Een hoekpunt van een vrije vorm (greep `data-hoekgreep`). */
  hoek?: number;
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
  const a = metVoorbeeld(planKader(plan(), 140));
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
  for (const m of controleerPlan(toestand().plan, cat)) if (m.ernst === 'fout') { if (m.ruimte) s.add(m.ruimte); if (m.opening) s.add(m.opening); if (m.daklicht) s.add(m.daklicht); }
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
  houder.innerHTML = tekenPlattegrond(plan(), cat, {
    selectie, voorbeeld, voorbeeldOpening, voorbeeldWand, onderlegger, raamInfo, fouten: fouten(), viewBox, fijnRaster: rasterStap() < 10, schaal: schaalNu(),
    dakLijnen: dakLijnen(niveau), lichtstraten: LICHTSTRATEN, noordpijl: true,
    // Maten aantikken om ze te wijzigen, en het voorbeeld van een ruimte met maten.
    maatDoelen: true, voorbeeldVorm: matenVoorbeeld(),
  });
  plaatsMaatVraag();
  zoom?.bijwerken();
  const zi = document.getElementById('pl-zoomhint');
  if (zi) zi.textContent = `Zoomen: Ctrl (⌘) + scrollen, knijpen of + − (in het groot scherm volstaat scrollen) · verschuiven: sleep op een leeg stuk · raster ${rasterStap()} cm`;
  houder.dataset.gereedschap = gereedschap;
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
}

function toonNiveaus() {
  const lijst = verdiepingenVan(toestand().plan);
  const vak = $('#pl-niveaus');
  vak.replaceChildren(...lijst.map((v, i) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(i === niveau) }, v.naam);
    b.addEventListener('click', () => { sluitMaatVraag(true); niveau = i; selectie = undefined; render(); toonEigenschappen(); });
    return b;
  }));
  const plus = el('button', { type: 'button', class: 'tweede' }, '+ Verdieping');
  plus.addEventListener('click', nieuweVerdieping);
  vak.append(plus);
  if (lijst.length > 1 && niveau === lijst.length - 1) {
    const weg = el('button', { type: 'button', class: 'gevaar' }, 'Verdieping verwijderen');
    weg.addEventListener('click', () => {
      if (weg.dataset.zeker !== '1') { weg.dataset.zeker = '1'; weg.textContent = 'Zeker? Alles op deze verdieping verdwijnt'; return; }
      const n = niveau;
      wijzig('plan', (t) => {
        const weg = new Set(t.plan.openingen.filter((o) => niveauVan(o) === n).map((o) => o.positie).filter(Boolean));
        t.posities = t.posities.filter((p) => !weg.has(p.id));
        t.plan.ruimtes = t.plan.ruimtes.filter((r) => niveauVan(r) !== n);
        t.plan.openingen = t.plan.openingen.filter((o) => niveauVan(o) !== n);
        t.plan.meubels = t.plan.meubels.filter((m) => niveauVan(m) !== n);
        if (t.plan.daklichten) t.plan.daklichten = t.plan.daklichten.filter((l) => niveauVan(l) !== n);
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

/** Nieuwe verdieping: één ruimte boven de hele verdieping eronder, om daarna in te delen. */
function nieuweVerdieping() {
  const t = toestand();
  const lijst = verdiepingenVan(t.plan);
  const n = lijst.length;
  const onder = niveauPlan(t.plan, n - 1).ruimtes.flatMap(delenVan);
  wijzig('plan', (tt) => {
    tt.plan.verdiepingen = [...lijst, { naam: `Verdieping ${n}` }];
    if (onder.length) {
      const x0 = Math.min(...onder.map((p) => p.x)), y0 = Math.min(...onder.map((p) => p.y));
      const x1 = Math.max(...onder.map((p) => p.x + p.b)), y1 = Math.max(...onder.map((p) => p.y + p.d));
      tt.plan.ruimtes.push({ id: nieuweId('r'), naam: 'Nieuwe verdieping', type: 'hal', x: x0, y: y0, b: x1 - x0, d: y1 - y0, vloer: 'parket_eik', wand: 'wit', niveau: n });
    }
  });
  niveau = n;
  selectie = undefined;
  melding = 'Nieuwe verdieping: deel ze in met "Wand tekenen" of teken ruimtes erin. Plaats beneden een trap (Meubel → Trappen).';
  kiesGereedschap('wand');
}

let wachtend3D = false;
function plan3D() {
  // De schakelaar "Dak tonen" heeft alleen zin met een dakkeuze.
  $('#pl-toon-dak-label').hidden = !heeftDak();
  if (!viewer || wachtend3D) return;
  wachtend3D = true;
  requestAnimationFrame(() => {
    wachtend3D = false;
    // Lichtinval: de zon uit de gekozen richting, en wat verborgen is werpt nog schaduw.
    viewer?.zon?.(zonVoorKijker());
    const scene = plattegrond3D(toestand().plan, cat, {
      laag: laag ? 110 : undefined,
      meubels: toonMeubels,
      dak: toonDakIn3D,
      lichtinval: lichtinvalAan(),
      // Terras en pad horen bij de woning (gegevens); lucht, gras en horizon tekent de kijker (omgeving 'buiten').
      aanleg: true,
      gevelkoppen: true,
      // Elk blok zegt bij welk ding het hoort: tik op het dak, een raam of een gevel (zie ding-ui.ts).
      dingen: true,
      totNiveau: alleNiveaus && !laag ? undefined : niveau,
      inhoud: openingInhoud,
    });
    // Maten tonen: breedte, diepte, hoogte en nok van het gebouw, en breedte en hoogte van het aangetikte raam of de deur.
    const metMaten: Scene3DMetMaten = toonMaten ? {
      ...scene,
      maatlijnen: [...gebouwMaatlijnen(scene, { hoogtes: !laag }), ...(gekozenDing?.startsWith('opening:') ? raamMaatlijnen(scene.blokken, { ding: gekozenDing }) : [])],
    } : scene;
    // Na de snelstart een ruimer kader: de camera staat verder, zodat de hele woning met lucht erboven in beeld komt.
    viewer?.toon(ruimKader ? ruimKaderVan(metMaten) : metMaten);
    beeldActueel = !!viewer;
    if (volgendStandpunt) { viewer?.standpunt(volgendStandpunt); volgendStandpunt = undefined; }
  });
  toonDingKeuzes();
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
  toonDing(vak, gekozenDing, { sluit: () => tikIn3D(null), naarPositie: (id) => naarPositie(id), metMaten: (muur) => { tikIn3D(null); openRuimteMetMaten({ gevelMuur: muur }); } });
  // Bestaat het ding niet meer (verwijderd, ongedaan gemaakt): ook de aanduiding weg.
  if (gekozenDing && vak.hidden) { gekozenDing = null; viewer?.markeer?.(null); }
}

/** Na de snelstart: de woning in 3D, vanaf de eerste verdieping, met een beginbeeld waarop lucht en voorgevel te zien zijn. */
export function toonWoning3D(standpunt: Standpunt = 'ooghoogte') {
  niveau = 0;
  selectie = undefined;
  gekozenDing = null;
  viewer?.markeer?.(null);
  zoom?.passendMaken();
  volgendStandpunt = standpunt;
  ruimKader = true;
  toonWeergave('3d');
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

function plaatsOpening(soort: OpeningSoort, x: number, y: number) {
  const r = openingOp(soort, x, y);
  if (!r) { melding = 'Klik dichter bij een muur.'; toonEigenschappen(); return; }
  if (r.fout) { melding = r.fout; toonEigenschappen(); return; }
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
  if (!r) return;
  const lijn = staand ? kleef(x, 'x', 10, r.id) : kleef(y, 'y', 10, r.id);
  // Het binnenvlak van de ruimte op die plaats en het plan vóór het indelen (om de wand op een gemeten plaats te zetten).
  const rand = binnenRand(toestand().plan, r, staand ? 'v' : 'h', [x, y]);
  const voor = structuredClone(toestand().plan);
  if (!deelMetWand(staand ? 'v' : 'h', lijn, staand ? y : x, staand ? y : x) || !rand) return;
  vraagWand(staand, lijn, [x, y], rand, voor);
}

/** Plaatst een lichtkoepel of lichtstraat met het midden op de klik; alleen op een plat dak, volledig boven één ruimte. */
function plaatsDaklicht(x: number, y: number) {
  const type = cat.daklichten?.[daklichtType];
  if (!type) return;
  const l: DakLicht = { id: nieuweId('k'), type: daklichtType, x: snap(x - type.b / 2, fijn()), y: snap(y - type.d / 2, fijn()), b: type.b, d: type.d, niveau };
  // Proef op een kopie: ligt hij op een plat dak?
  const proef = structuredClone(toestand().plan);
  (proef.daklichten ??= []).push(l);
  const reden = dakOpbouw(proef)?.daklichten.find((q) => q.licht.id === l.id)?.reden;
  voorbeeld = undefined;
  if (reden) {
    melding = `Hier kan geen ${type.label.toLowerCase()}: hij ${reden}`;
    render();
    toonEigenschappen();
    return;
  }
  wijzig('plan', (t) => { metDak(t); (t.plan.daklichten ??= []).push(l); });
  selectie = { soort: 'daklicht', id: l.id };
  melding = '';
  kiesGereedschap('kies');
}

/** Deelt alle ruimtes die een wand kruist; minstens 60 cm aan elke kant. */
function deelMetWand(as: 'h' | 'v', lijn: number, van: number, tot: number): boolean {
  let nieuw: Ruimte[] = [];
  wijzig('plan', (t) => {
    nieuw = splitsRuimtes(t.plan, niveau, as, lijn, Math.min(van, tot), Math.max(van, tot), (oud) => ({ ...oud, id: nieuweId('r'), naam: nieuweRuimteNaam(), delen: undefined }), 60);
  });
  if (!nieuw.length) {
    melding = 'Geen ruimte gedeeld: de wand moet door een ruimte lopen, minstens 60 cm van de rand.';
    toonEigenschappen();
    return false;
  }
  selectie = { soort: 'ruimte', id: nieuw[0]!.id };
  melding = `${nieuw.length === 1 ? 'Ruimte' : `${nieuw.length} ruimtes`} ingedeeld. Vergeet geen deur of doorgang naar de nieuwe ruimte.`;
  kiesGereedschap('kies');
  return true;
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
    anker: langsAs(o, o.midden, o.lijn),
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
    anker: p,
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
function tikOpMaat(doel: string, vak: DOMRect) {
  const [soort, id, extra] = doel.split(':') as [string, string, string | undefined];
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
  if (soort === 'ruimte') maatRuimte(pl, oud, id, extra === 'b', vak, pas, dikteOp);
  else if (soort === 'zijde' || soort === 'muur') maatZijde(pl, oud, soort, id, Number(extra), vak, pas);
  else if (soort === 'ketting') maatKetting(pl, id, Number(extra), vak, pas);
  else if (soort === 'totaal') maatTotaal(pl, oud, id === 'b', vak, pas);
}

type Pas = (eerste: boolean, f: (t: Plattegrond) => string | undefined) => string | undefined;

/** Breedte of diepte van een rechthoekige ruimte: een muur schuift, met de buurruimtes (zoals de grepen). */
function maatRuimte(pl: Plattegrond, oud: Plattegrond, id: string, breed: boolean, vak: DOMRect, pas: Pas, dikteOp: (as: 'h' | 'v', lijn: number, van: number, tot: number) => number) {
  const r = pl.ruimtes.find((x) => x.id === id);
  if (!r) return;
  // Welke muur schuift: standaard rechts (of onder), tenzij daar een buurruimte ligt en aan de andere kant niet.
  const buur = (lijn: number) => pl.ruimtes.some((q) => q.id !== r.id && delenVan(q).some((d) => (breed ? Math.abs(d.x + d.b - lijn) < 0.5 || Math.abs(d.x - lijn) < 0.5 : Math.abs(d.y + d.d - lijn) < 0.5 || Math.abs(d.y - lijn) < 0.5)));
  const [begin, einde] = breed ? [r.x, r.x + r.b] : [r.y, r.y + r.d];
  const kant = buur(einde) && !buur(begin) ? (breed ? 'w' : 'n') : breed ? 'o' : 's';
  const [t0, t1] = breed ? [dikteOp('v', r.x, r.y, r.y + r.d), dikteOp('v', r.x + r.b, r.y, r.y + r.d)] : [dikteOp('h', r.y, r.x, r.x + r.b), dikteOp('h', r.y + r.d, r.x, r.x + r.b)];
  const maat = breed ? r.b : r.d;
  vraagMaat({
    anker: vak,
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
function maatZijde(pl: Plattegrond, oud: Plattegrond, soort: string, id: string, zijde: number, vak: DOMRect, pas: Pas) {
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
    anker: vak,
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
function maatKetting(pl: Plattegrond, id: string, j: number, vak: DOMRect, pas: Pas) {
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
    anker: vak,
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
function maatTotaal(pl: Plattegrond, oud: Plattegrond, breed: boolean, vak: DOMRect, pas: Pas) {
  const delen = pl.ruimtes.flatMap(delenVan);
  if (!delen.length) return;
  const x0 = Math.min(...delen.map((q) => q.x)), y0 = Math.min(...delen.map((q) => q.y));
  const x1 = Math.max(...delen.map((q) => q.x + q.b)), y1 = Math.max(...delen.map((q) => q.y + q.d));
  const t = pl.buitenmuur;
  const [begin, einde] = breed ? [x0, x1] : [y0, y1];
  vraagMaat({
    anker: vak,
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
  const p = punt(ev);
  const doel = ev.target as Element;
  const houder = $('#pl-canvas');
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
  maatNaKlik = onderMaat && maat ? { doel: maat.dataset.maat!, vak: maat.getBoundingClientRect(), x: ev.clientX, y: ev.clientY } : undefined;
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
  const item = (onderMaat ?? doel.closest('[data-soort]')) as SVGElement | null;
  const orig = JSON.stringify(plan());
  if (greep && selectie?.soort === 'ruimte') {
    sleep = { soort: 'greep', start: p, id: selectie.id, kant: greep.dataset.greep as Sleep['kant'], bewogen: false, orig };
  } else if (hoekgreep && selectie?.soort === 'ruimte') {
    sleep = { soort: 'hoek', start: p, id: selectie.id, hoek: Number(hoekgreep.dataset.hoekgreep), bewogen: false, orig };
  } else if (item && ['ruimte', 'opening', 'meubel', 'daklicht'].includes(item.dataset.soort ?? '')) {
    const soort = item.dataset.soort as 'ruimte' | 'opening' | 'meubel' | 'daklicht';
    selectie = { soort, id: item.dataset.id! };
    sleep = { soort, start: p, id: item.dataset.id!, bewogen: false, orig };
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
  const p = punt(ev);
  if (!sleep) {
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
  if (!sleep.bewogen && sleep.soort !== 'teken') momentopname();
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
  if (pannen) {
    const klik = !pannen.bewogen || Math.hypot(ev.clientX - pannen.x, ev.clientY - pannen.y) < 8;
    pannen = undefined;
    zoom?.stopPan();
    const t = tikWacht;
    tikWacht = undefined;
    if (t && klik) {
      if (t.soort === 'maat') { if (t.el.isConnected) tikOpMaat(t.doel, t.el.getBoundingClientRect()); }
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
      deelMetWand(staand ? 'v' : 'h', staand ? w.x1 : w.y1, staand ? w.y1 : w.x1, staand ? w.y2 : w.x2);
      return;
    }
    render();
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
    if (v) melding = 'Te klein: een ruimte moet minstens 80 × 80 cm zijn.';
  }
  render();
  toonEigenschappen();
  // Een tik (zonder slepen) op een maat boven een ruimte of raam: de maatvraag.
  const m = maatNaKlik;
  maatNaKlik = undefined;
  if (m && s && !s.bewogen) tikOpMaat(m.doel, m.vak);
}

// ---------- eigenschappen ----------
function verwijderSelectie() {
  if (!selectie) return;
  const s = selectie;
  wijzig('plan', (t) => {
    if (s.soort === 'ruimte') t.plan.ruimtes = t.plan.ruimtes.filter((r) => r.id !== s.id);
    if (s.soort === 'meubel') t.plan.meubels = t.plan.meubels.filter((m) => m.id !== s.id);
    if (s.soort === 'daklicht') t.plan.daklichten = t.plan.daklichten?.filter((l) => l.id !== s.id);
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
    r.append(knop('Draaien 90° (Q)', draaiMeubel), knop('Verwijderen', verwijderSelectie, 'gevaar'));
    vak.append(r);
  } else if (s?.soort === 'daklicht') {
    const l = pl.daklichten?.find((x) => x.id === s.id);
    if (!l) { selectie = undefined; return toonEigenschappen(); }
    const type = cat.daklichten?.[l.type];
    const zet = (f: (x: DakLicht) => void) => wijzig('plan', (tt) => { const x = tt.plan.daklichten?.find((y) => y.id === l.id); if (x) f(x); });
    vak.append(el('h3', {}, type?.vorm === 'lichtstraat' ? 'Lichtstraat' : 'Lichtkoepel'));
    const rij = el('label', { class: 'eig' });
    rij.append(el('span', {}, 'Maat'), keuzelijst('pl-daklicht-type', Object.entries(cat.daklichten ?? {}).map(([k, v]) => [k, v.label]), l.type, (w) => zet((x) => {
      // Andere maat: het midden blijft op zijn plaats.
      const nieuw = cat.daklichten?.[w];
      if (!nieuw) return;
      const cx = x.x + x.b / 2, cy = x.y + x.d / 2;
      Object.assign(x, { type: w, b: nieuw.b, d: nieuw.d, x: snap(cx - nieuw.b / 2, 5), y: snap(cy - nieuw.d / 2, 5) });
    })));
    vak.append(rij);
    const reden = dakOpbouw(toestand().plan)?.daklichten.find((x) => x.licht.id === l.id)?.reden;
    if (reden) vak.append(el('p', { class: 'kleinmelding fout' }, `Kan hier niet: hij ${reden}`));
    const onder = ruimteOp(pl, l.x + l.b / 2, l.y + l.d / 2);
    vak.append(el('p', { class: 'klein' }, `Opening ${getal(l.b)} × ${getal(l.d)} cm${onder ? ` boven ${onder.naam}` : ''}. Telt mee voor het daglicht: ongeveer ${getal((l.b * l.d * DAKLICHT_GLAS) / 10000, 2)} m² glas.`));
    const r = el('div', { class: 'knoppenrij' });
    if (l.b !== l.d) r.append(knop('Draaien 90°', () => zet((x) => {
      const cx = x.x + x.b / 2, cy = x.y + x.d / 2;
      Object.assign(x, { b: x.d, d: x.b, x: snap(cx - x.d / 2, 5), y: snap(cy - x.b / 2, 5) });
    })));
    r.append(knop('Verwijderen', verwijderSelectie, 'gevaar'));
    vak.append(r);
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
  }
  toonOverzicht();
}

function toonOverzicht() {
  toonDak();
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
    if (p) for (const m of resultaat(p).meldingen) meldingen.push({ ernst: m.ernst, melding: `${p.code}: ${m.melding}`, opening: o.id });
  }
  meldingen.sort((a, b) => (a.ernst === b.ernst ? 0 : a.ernst === 'fout' ? -1 : 1));
  $('#pl-meldingen').replaceChildren(...meldingen.map((m) => {
    const li = el('li', { class: m.ernst }, m.melding);
    const id = m.opening ?? m.daklicht ?? m.ruimte;
    if (id) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        const item = m.opening ? alles.openingen.find((o) => o.id === id) : m.daklicht ? alles.daklichten?.find((l) => l.id === id) : alles.ruimtes.find((r) => r.id === id);
        if (item) niveau = niveauVan(item);
        selectie = { soort: m.opening ? 'opening' : m.daklicht ? 'daklicht' : 'ruimte', id };
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
  $<HTMLButtonElement>('#pl-ongedaan').disabled = !kanOngedaan();
}

// ---------- gereedschap ----------
function kiesGereedschap(g: Gereedschap, begin?: Parameters<typeof openMatenPaneel>[1]) {
  // Ruimte met maten: het paneel boven de tekening; een ander gereedschap sluit het.
  if (g !== 'maten' && matenPaneelOpen()) sluitMatenPaneel();
  gereedschap = g;
  voorbeeldOpening = undefined;
  if (g === 'maten') {
    if (weergave !== 'plan') toonWeergave('plan');
    openMatenPaneel(matenOmgeving, begin);
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gereedschap]')) b.setAttribute('aria-pressed', String(b.dataset.gereedschap === g));
  $('#pl-hint').textContent = GEREEDSCHAP.find((x) => x.code === g)?.hint ?? '';
  $('#pl-meubels').hidden = g !== 'meubel';
  $('#pl-daklichten').hidden = g !== 'daklicht';
  voorbeeld = undefined;
  render();
  toonEigenschappen();
}

function toonWeergave(w: 'plan' | 'gevels' | '3d') {
  if (w !== weergave) sluitMaatVraag(true);
  weergave = w;
  // In 3D op een tablet: de 3D over de hele breedte, het gereedschap (voor de plattegrond) eronder.
  $('#view-plan').classList.toggle('driedmodus', w === '3d');
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-pl-weergave]')) b.setAttribute('aria-pressed', String(b.dataset.plWeergave === w));
  // Het tekenvlak met zijn zoomknoppen.
  $('#pl-canvas').parentElement!.hidden = w !== 'plan';
  $('#pl-zoomhint').hidden = w !== 'plan';
  $('#gv-editor').hidden = w !== 'gevels';
  $('#view-plan').classList.toggle('gevelmodus', w === 'gevels');
  if (w === 'gevels') gevelNaWijziging();
  $('#pl-3d').hidden = w !== '3d';
  $('#pl-3d-knoppen').hidden = w !== '3d';
  if (w !== '3d') { gekozenDing = null; viewer?.markeer?.(null); }
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
  return beeldActueel ? viewer?.beeld?.('image/jpeg', 0.85) ?? null : null;
}

/** Kwaliteit van de 3D van de woning: de bewaarde keuze, anders Snel op een aanraakscherm en Mooi op een computer. */
const SLEUTEL_KWALITEIT = 'bouw-demo.3d-kwaliteit';
function kwaliteit3D(): Kwaliteit {
  let bewaard: string | null = null;
  try { bewaard = localStorage.getItem(SLEUTEL_KWALITEIT); } catch { /* geen opslag */ }
  return bewaard === 'snel' || bewaard === 'mooi' ? bewaard : window.matchMedia?.('(pointer: coarse)').matches ? 'snel' : 'mooi';
}

export function toonPlan(openingId?: string) {
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
  lijst.replaceChildren(...GEREEDSCHAP.map((g) => {
    const b = el('button', { type: 'button', 'data-gereedschap': g.code, 'aria-pressed': String(g.code === gereedschap) });
    b.append(el('span', {}, g.label));
    if (g.toets) b.append(el('kbd', {}, g.toets));
    b.addEventListener('click', () => { sluitMaatVraag(true); kiesGereedschap(g.code); });
    return b;
  }));
  // Meubelpalet per groep.
  const palet = $('#pl-meubels');
  const groepen = [...new Set(Object.values(cat.meubels).map((m) => m.groep))];
  palet.replaceChildren(...groepen.map((g) => {
    const d = el('div', { class: 'palet' });
    d.append(el('p', { class: 'klein' }, g));
    for (const [code, m] of Object.entries(cat.meubels).filter(([, m]) => m.groep === g)) {
      const b = el('button', { type: 'button', 'data-meubel': code, 'aria-pressed': String(code === meubelType) }, m.label);
      b.addEventListener('click', () => {
        meubelType = code;
        for (const x of palet.querySelectorAll<HTMLButtonElement>('[data-meubel]')) x.setAttribute('aria-pressed', String(x.dataset.meubel === code));
        kiesGereedschap('meubel');
      });
      d.append(b);
    }
    return d;
  }));
  // Palet met lichtkoepels en lichtstraten (vaste maten uit de catalogus).
  const koepels = $('#pl-daklichten');
  const koepelGroepen = [...new Set(Object.values(cat.daklichten ?? {}).map((t) => t.groep))];
  koepels.replaceChildren(...koepelGroepen.map((g) => {
    const d = el('div', { class: 'palet' });
    d.append(el('p', { class: 'klein' }, g));
    for (const [code, t] of Object.entries(cat.daklichten ?? {}).filter(([, t]) => t.groep === g)) {
      const b = el('button', { type: 'button', 'data-daklicht': code, 'aria-pressed': String(code === daklichtType) }, t.label);
      b.addEventListener('click', () => {
        daklichtType = code;
        for (const x of koepels.querySelectorAll<HTMLButtonElement>('[data-daklicht]')) x.setAttribute('aria-pressed', String(x.dataset.daklicht === code));
        kiesGereedschap('daklicht');
      });
      d.append(b);
    }
    return d;
  }));
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
      if (sleep?.bewogen && sleep.soort !== 'teken' && sleep.soort !== 'wand') ongedaan();
      sleep = undefined;
      pannen = undefined;
      tikWacht = undefined;
      voorbeeld = undefined;
      voorbeeldWand = undefined;
    },
  });
  const vlak = document.createElement('div');
  vlak.className = 'zoomvlak';
  houder.before(vlak);
  // Het paneel Ruimte met maten staat over de hele breedte boven het gereedschap en de tekening (op een tablet blijft
  // het zo boven het toetsenbord in beeld).
  startMaten(matenOmgeving);
  $('#view-plan .planraster').before(el('section', { id: 'pl-maatpaneel', class: 'maatpaneel', hidden: '', 'aria-label': 'Ruimte met maten' }));
  vlak.append(houder, zoom.knoppen({ selectie: selectieKader, grootScherm: $('#view-plan') }));
  houder.addEventListener('pointerdown', naPointerDown);
  houder.addEventListener('pointermove', naPointerMove);
  houder.addEventListener('pointerup', naPointerUp);
  houder.addEventListener('pointerleave', () => {
    if (voorbeeldOpening || (gereedschap === 'daklicht' && voorbeeld)) { voorbeeldOpening = undefined; voorbeeld = undefined; render(); }
  });
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-pl-weergave]')) b.addEventListener('click', () => toonWeergave(b.dataset.plWeergave as 'plan' | 'gevels' | '3d'));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-pl-standpunt]')) b.addEventListener('click', () => {
    // Een standpunt kiezen: terug naar het gewone kader van de woning.
    if (ruimKader) { ruimKader = false; plan3D(); volgendStandpunt = b.dataset.plStandpunt as Standpunt; return; }
    viewer?.standpunt(b.dataset.plStandpunt as 'schuin');
  });
  $<HTMLInputElement>('#pl-laag').addEventListener('change', (e) => { laag = (e.target as HTMLInputElement).checked; plan3D(); });
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
  // Lichtinval: aan of uit bouwt de 3D opnieuw op (verborgen delen als schaduwwerper); dag en uur verzetten alleen de zon.
  startZon({ opnieuw: () => plan3D(), zon: () => viewer?.zon?.(zonVoorKijker()) });
  $('#pl-3d-knoppen .knoppenrij').append(grootSchermKnop($('#view-plan'), () => viewer?.formaat()));
  // Stijlen (één tik zet het hele ontwerp in een stijl) en een variant (kopie om te vergelijken), onder de 3D.
  $('#pl-stijlen').replaceChildren(stijlRij());
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
    if (matenPaneelOpen()) { sluitMatenPaneel(); gereedschap = 'kies'; for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gereedschap]')) b.setAttribute('aria-pressed', String(b.dataset.gereedschap === 'kies')); }
    if (weergave === '3d') toonNaastKnop();
    niveau = 0;
    selectie = undefined;
    gekozenDing = null;
    viewer?.markeer?.(null);
    zoom?.passendMaken();
  });
  $('#pl-ongedaan').addEventListener('click', () => { sluitMaatVraag(true); ongedaan(); });
  $('#pl-voorbeeld').addEventListener('click', () => naarProjecten());
  const wis = $<HTMLButtonElement>('#pl-leeg');
  wis.addEventListener('click', () => {
    if (wis.dataset.zeker !== '1') { wis.dataset.zeker = '1'; wis.textContent = 'Zeker? (ongedaan maken kan)'; return; }
    wis.dataset.zeker = '';
    wis.textContent = 'Plattegrond wissen';
    selectie = undefined;
    niveau = 0;
    // Alleen de plattegrond van dit project; posities zonder opening blijven in de offerte.
    wijzig('plan', (t) => {
      const weg = new Set(t.plan.openingen.map((o) => o.positie).filter(Boolean));
      t.posities = t.posities.filter((p) => !weg.has(p.id));
      t.plan = { ...t.plan, ruimtes: [], openingen: [], meubels: [], verdiepingen: [{ naam: 'Gelijkvloers' }] };
      // De lichtkoepels gaan mee weg; de dakkeuze (vorm en bedekking) blijft, zoals de gevel.
      delete t.plan.daklichten;
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

  document.addEventListener('keydown', (ev) => {
    if ($('#view-plan').hidden) return;
    const doel = ev.target as HTMLElement;
    if (doel.closest('input, select, textarea')) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); ongedaan(); return; }
    if (weergave === 'gevels') { if (gevelToets(ev)) ev.preventDefault(); return; }
    if (weergave === '3d') return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') { if (selectie) { ev.preventDefault(); verwijderSelectie(); } return; }
    if (ev.key === 'Escape') { selectie = undefined; kiesGereedschap('kies'); return; }
    if (ev.key.toLowerCase() === 'q') { draaiMeubel(); return; }
    if (zoom?.toets(ev)) { ev.preventDefault(); return; }
    const sneltoets = GEREEDSCHAP.find((g) => g.toets && g.toets.toLowerCase() === ev.key.toLowerCase());
    if (sneltoets && !ev.ctrlKey && !ev.metaKey) { kiesGereedschap(sneltoets.code); return; }
    // Pijltjes: selectie 5 cm verschuiven (met Shift 1 cm).
    const stap = ev.shiftKey ? 1 : 5;
    const d: Record<string, [number, number]> = { ArrowLeft: [-stap, 0], ArrowRight: [stap, 0], ArrowUp: [0, -stap], ArrowDown: [0, stap] };
    const v = d[ev.key];
    if (v && selectie) {
      ev.preventDefault();
      const s = selectie;
      wijzig('plan', (t) => {
        if (s.soort === 'meubel') { const m = t.plan.meubels.find((x) => x.id === s.id); if (m) { m.x += v[0]; m.y += v[1]; } }
        if (s.soort === 'daklicht') { const l = t.plan.daklichten?.find((x) => x.id === s.id); if (l) { l.x += v[0]; l.y += v[1]; } }
        if (s.soort === 'opening') { const o = t.plan.openingen.find((x) => x.id === s.id); if (o) o.midden += o.as === 'h' ? v[0] : v[1]; }
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
  vlak: () => $('#pl-canvas').parentElement!,
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
  if (!sleep || sleep.soort === 'meubel' || sleep.soort === 'opening' || sleep.soort === 'daklicht') toonEigenschappen();
  else toonOverzicht();
}
