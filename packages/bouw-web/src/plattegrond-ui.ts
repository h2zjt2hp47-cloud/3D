/**
 * Plattegrond-editor: ruimtes tekenen en indelen, wanden verschuiven, ramen en deuren in de
 * muren zetten (gekoppeld aan offerteposities), meubels plaatsen, eigenschappen, controles en 3D.
 */
import {
  controleerPlan,
  delenVan,
  meubelAfstanden,
  openingAfstanden,
  dichtsteMuur,
  niveauPlan,
  niveauVan,
  splitsRuimtes,
  tekenRuimteIn,
  verdiepingenVan,
  meubelVoetafdruk,
  murenVan,
  muurVanOpening,
  planKader,
  plattegrond3D,
  RUIMTE_TYPES,
  ruimteMaten,
  ruimteOp,
  tekenPlattegrond,
  type Keuzes,
  type Meubel,
  type Opening,
  type OpeningSoort,
  type Plattegrond,
  type Ruimte,
  type RuimteType,
} from '../../core/src/index.js';
import { planCatalogus as cat } from '../../core/voorbeelden/inrichting.js';
import { raamBlokken } from '../../core/voorbeelden/raam3d.js';
import { maak3D, type Viewer3D } from '../../demo-web/src/drie-d.js';
import { grootSchermKnop, Zoom, type Kader } from '../../demo-web/src/zoom.js';
import { $, el, eur, getal, getalVeld, keuzelijst } from './hulp.js';
import { berekenHuidigeOfferte } from './offerte-ui.js';
import { gevelNaWijziging, gevelToets, startGevels } from './gevel-ui.js';
import { gevelCatalogus } from '../../core/voorbeelden/inrichting.js';

export { gevelSvgs } from './gevel-ui.js';
import {
  kanOngedaan,
  momentopname,
  nieuweId,
  nieuwePositie,
  ongedaan,
  positieVan,
  resultaat,
  toestand,
  wijzig,
} from './staat.js';

type Gereedschap = 'kies' | 'ruimte' | 'wand' | 'wand_v' | 'wand_h' | 'raam' | 'buitendeur' | 'schuifraam' | 'binnendeur' | 'doorgang' | 'meubel';
type Selectie = { soort: 'ruimte' | 'opening' | 'meubel'; id: string } | undefined;

const GEREEDSCHAP: { code: Gereedschap; label: string; toets: string; hint: string }[] = [
  { code: 'kies', label: 'Selecteren en verplaatsen', toets: 'V', hint: 'Klik om te selecteren. Sleep een ruimte, raam, deur of meubel. Sleep de blauwe bolletjes om een wand te verschuiven.' },
  { code: 'ruimte', label: 'Ruimte tekenen', toets: 'T', hint: 'Sleep een rechthoek, ook binnen een bestaande ruimte ("ruimte in ruimte"): wat overlapt wordt uit de oude ruimte gesneden. Muren volgen automatisch.' },
  { code: 'wand', label: 'Wand tekenen (indelen)', toets: 'W', hint: 'Sleep een wand door een of meer ruimtes: elke ruimte die de wand kruist, wordt in twee gedeeld.' },
  { code: 'wand_v', label: 'Indelen │ (staande wand)', toets: '', hint: 'Klik in een ruimte om ze met een staande wand in twee te delen.' },
  { code: 'wand_h', label: 'Indelen ─ (liggende wand)', toets: '', hint: 'Klik in een ruimte om ze met een liggende wand in twee te delen.' },
  { code: 'raam', label: 'Raam', toets: 'R', hint: 'Klik op een buitenmuur. Er komt ook een positie in de offerte bij.' },
  { code: 'buitendeur', label: 'Buitendeur', toets: '', hint: 'Klik op een buitenmuur. In een hal wordt het een voordeur, anders een terrasdeur.' },
  { code: 'schuifraam', label: 'Schuifraam', toets: '', hint: 'Klik op een buitenmuur.' },
  { code: 'binnendeur', label: 'Binnendeur', toets: 'D', hint: 'Klik op een binnenmuur. Draairichting wissel je in de eigenschappen.' },
  { code: 'doorgang', label: 'Doorgang (zonder deur)', toets: '', hint: 'Klik op een binnenmuur.' },
  { code: 'meubel', label: 'Meubel', toets: 'M', hint: 'Kies een meubel hieronder en klik in de plattegrond.' },
];

let gereedschap: Gereedschap = 'kies';
let meubelType = 'bank3';
let selectie: Selectie;
let viewBox: { x: number; y: number; b: number; d: number } | undefined;
let zoom: Zoom | undefined;
/** Slepen op een leeg stuk verschuift het beeld (een klik zonder bewegen deselecteert). */
let pannen: { bewogen: boolean; x: number; y: number } | undefined;
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

interface Sleep {
  soort: 'teken' | 'wand' | 'ruimte' | 'greep' | 'opening' | 'meubel';
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
  const a = planKader(plan(), 140);
  const onder = niveau > 0 ? niveauPlan(toestand().plan, niveau - 1) : undefined;
  if (!onder?.ruimtes.length) return a;
  const b = planKader(onder, 140);
  if (!plan().ruimtes.length) return b;
  const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
  return { x: x0, y: y0, b: Math.max(a.x + a.b, b.x + b.b) - x0, d: Math.max(a.y + a.d, b.y + b.d) - y0 };
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
  const o = pl.openingen.find((x) => x.id === s.id);
  if (!o) return undefined;
  return o.as === 'h' ? { x: o.midden - o.breedte / 2, y: o.lijn - 40, b: o.breedte, d: 80 } : { x: o.lijn - 40, y: o.midden - o.breedte / 2, b: 80, d: o.breedte };
}

// ---------- tekenen ----------
function raamInfo(o: Opening) {
  const p = positieVan(o);
  if (!p) return undefined;
  if (p.model !== 'RAAM') return { label: p.code };
  const r = resultaat(p);
  const n = Math.max(1, Number(r.afgeleid.n) || 1);
  return { label: p.code, vakken: [r.afgeleid.op1, r.afgeleid.op2, r.afgeleid.op3].slice(0, n).map(String) };
}

function fouten(): Set<string> {
  const s = new Set<string>();
  for (const m of controleerPlan(toestand().plan)) if (m.ernst === 'fout') { if (m.ruimte) s.add(m.ruimte); if (m.opening) s.add(m.opening); }
  for (const o of plan().openingen) {
    const p = positieVan(o);
    if (p && !resultaat(p).geldig) s.add(o.id);
  }
  return s;
}

export function render() {
  const houder = $('#pl-canvas');
  const onderlegger = niveau > 0 ? niveauPlan(toestand().plan, niveau - 1) : undefined;
  viewBox = zoom ? zoom.kijkvak() : passendKader();
  houder.innerHTML = tekenPlattegrond(plan(), cat, { selectie, voorbeeld, voorbeeldOpening, voorbeeldWand, onderlegger, raamInfo, fouten: fouten(), viewBox, fijnRaster: rasterStap() < 10, schaal: schaalNu() });
  zoom?.bijwerken();
  const zi = document.getElementById('pl-zoomhint');
  if (zi) zi.textContent = `Zoomen: Ctrl (⌘) + scrollen, knijpen of + − (in het groot scherm volstaat scrollen) · verschuiven: sleep op een leeg stuk · raster ${rasterStap()} cm`;
  houder.dataset.gereedschap = gereedschap;
  // Lege plattegrond: zeg wat je eerst doet (op het tekenvlak zelf, niet alleen in de hulpregel).
  const leeg = !toestand().plan.ruimtes.length;
  let kaart = document.getElementById('pl-leeg-kaart');
  if (leeg && !kaart) {
    kaart = el('div', { id: 'pl-leeg-kaart', class: 'leeg-kaart', role: 'note' });
    kaart.append(el('strong', {}, 'Begin met de eerste ruimte'), el('span', {}, 'Sleep op het raster een rechthoek (bv. 4 × 3 m). De muren volgen vanzelf; daarna plaats je ramen en deuren.'));
    const proef = el('button', { type: 'button', class: 'tweede' }, 'Of start met de voorbeeldwoning');
    proef.addEventListener('click', () => naarProjecten());
    kaart.append(proef);
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
    b.addEventListener('click', () => { niveau = i; selectie = undefined; render(); toonEigenschappen(); });
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
  if (!viewer || wachtend3D) return;
  wachtend3D = true;
  requestAnimationFrame(() => {
    wachtend3D = false;
    viewer?.toon(plattegrond3D(toestand().plan, cat, {
      laag: laag ? 110 : undefined,
      meubels: toonMeubels,
      totNiveau: alleNiveaus && !laag ? undefined : niveau,
      inhoud: (o) => {
        const p = positieVan(o);
        if (!p || p.model !== 'RAAM') return undefined;
        const rb = raamBlokken(resultaat(p));
        return { blokken: rb.blokken, hoogte: rb.h + rb.kast };
      },
    }));
  });
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
  const buiten = soort === 'raam' || soort === 'buitendeur' || soort === 'schuifraam';
  const binnenRuimteId = m.soort === 'buiten' ? (m.plus ?? m.min) : (m.as === 'h' ? (y > m.lijn ? m.plus : m.min) : (x > m.lijn ? m.plus : m.min));
  const ruimte = plan().ruimtes.find((r) => r.id === binnenRuimteId);
  const std = standaardOpening(soort, ruimte?.type);
  const lengte = m.tot - m.van;
  const breedte = Math.min(std.b, Math.max(40, lengte - 30));
  const midden = Math.min(m.tot - breedte / 2 - 10, Math.max(m.van + breedte / 2 + 10, snap(d.midden, fijn())));
  const binnenPlus = m.soort === 'buiten' ? !!m.plus : (m.as === 'h' ? y > m.lijn : x > m.lijn);
  const opening: Opening = {
    niveau,
    id: nieuweId('o'), soort, as: m.as, lijn: m.lijn, midden, breedte, hoogte: std.h, borstwering: std.borst,
    scharnier: 'begin', naarPlus: binnenPlus, deurtype: soort === 'binnendeur' ? 'schilder' : undefined,
  };
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
}

/** Voegt een nieuwe opening toe; een raam of buitendeur krijgt meteen een offertepositie. */
function bewaarNieuweOpening(soort: OpeningSoort, o: Opening, ruimte: Ruimte | undefined) {
  const r = { ruimte };
  wijzig('plan', (t) => {
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
    niveau: n, id: nieuweId('o'), soort: 'raam', as: m.as, lijn: m.lijn, midden: mid, breedte, hoogte: std.h, borstwering: std.borst,
    scharnier: 'begin', naarPlus: !!m.plus,
  };
  bewaarNieuweOpening('raam', o, ruimte);
  return o.id;
}

function splits(x: number, y: number, staand: boolean) {
  const r = ruimteOp(plan(), x, y);
  if (!r) return;
  const lijn = staand ? kleef(x, 'x', 10, r.id) : kleef(y, 'y', 10, r.id);
  deelMetWand(staand ? 'v' : 'h', lijn, staand ? y : x, staand ? y : x);
}

/** Deelt alle ruimtes die een wand kruist; minstens 60 cm aan elke kant. */
function deelMetWand(as: 'h' | 'v', lijn: number, van: number, tot: number) {
  let nieuw: Ruimte[] = [];
  wijzig('plan', (t) => {
    nieuw = splitsRuimtes(t.plan, niveau, as, lijn, Math.min(van, tot), Math.max(van, tot), (oud) => ({ ...oud, id: nieuweId('r'), naam: nieuweRuimteNaam(), delen: undefined }), 60);
  });
  if (!nieuw.length) {
    melding = 'Geen ruimte gedeeld: de wand moet door een ruimte lopen, minstens 60 cm van de rand.';
    toonEigenschappen();
    return;
  }
  selectie = { soort: 'ruimte', id: nieuw[0]!.id };
  melding = `${nieuw.length === 1 ? 'Ruimte' : `${nieuw.length} ruimtes`} ingedeeld. Vergeet geen deur of doorgang naar de nieuwe ruimte.`;
  kiesGereedschap('kies');
}

// ---------- muis ----------
function naPointerDown(ev: PointerEvent) {
  if (ev.button !== 0) return;
  const p = punt(ev);
  const doel = ev.target as Element;
  const houder = $('#pl-canvas');
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
  if (gereedschap !== 'kies') { plaatsOpening(gereedschap, p.x, p.y); return; }

  const greep = doel.closest('[data-greep]') as SVGElement | null;
  const item = doel.closest('[data-soort]') as SVGElement | null;
  const orig = JSON.stringify(plan());
  if (greep && selectie?.soort === 'ruimte') {
    sleep = { soort: 'greep', start: p, id: selectie.id, kant: greep.dataset.greep as Sleep['kant'], bewogen: false, orig };
  } else if (item && ['ruimte', 'opening', 'meubel'].includes(item.dataset.soort ?? '')) {
    const soort = item.dataset.soort as 'ruimte' | 'opening' | 'meubel';
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
    if (['raam', 'buitendeur', 'schuifraam', 'binnendeur', 'doorgang'].includes(gereedschap)) {
      const r = openingOp(gereedschap as OpeningSoort, p.x, p.y);
      voorbeeldOpening = r && !r.fout ? r.opening : undefined;
      render();
    }
    return;
  }
  const dx = p.x - sleep.start.x, dy = p.y - sleep.start.y;
  if (!sleep.bewogen && Math.hypot(dx, dy) < 4) return;
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
    if (sleep!.soort === 'opening') {
      const o0 = oud.openingen.find((o) => o.id === id)!, o = pl.openingen.find((x) => x.id === id)!;
      const muur = muurVanOpening(o0, murenVan(oud));
      let midden = snap(o0.midden + (o0.as === 'h' ? dx : dy), fijn());
      if (muur) midden = Math.min(muur.tot - o.breedte / 2 - 5, Math.max(muur.van + o.breedte / 2 + 5, midden));
      o.midden = midden;
    }
    if (sleep!.soort === 'ruimte') {
      const r0 = oud.ruimtes.find((r) => r.id === id)!, r = pl.ruimtes.find((x) => x.id === id)!;
      const nx = kleef(r0.x + dx, 'x', 18, id), ny = kleef(r0.y + dy, 'y', 18, id);
      const ddx = nx - r0.x, ddy = ny - r0.y;
      r.x = nx; r.y = ny;
      if (r0.delen) r.delen = r0.delen.map((q) => ({ ...q, x: q.x + ddx, y: q.y + ddy }));
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
      for (const o0 of oud.openingen) {
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
  }, { zonderOngedaan: true });
}

/** Verschuift één rand van een ruimte; aangrenzende ruimtes(delen) en openingen op die rand schuiven mee. */
function verschuifWand(oud: Plattegrond, pl: Plattegrond, id: string, kant: 'n' | 's' | 'w' | 'o', p: { x: number; y: number }) {
  const r0 = oud.ruimtes.find((r) => r.id === id)!;
  const staand = kant === 'w' || kant === 'o';
  const lijn0 = kant === 'w' ? r0.x : kant === 'o' ? r0.x + r0.b : kant === 'n' ? r0.y : r0.y + r0.d;
  const [van, tot] = staand ? [r0.y, r0.y + r0.d] : [r0.x, r0.x + r0.b];
  let lijn = kleef(staand ? p.x : p.y, staand ? 'x' : 'y', 12, id);
  // Alle delen met een rand op dezelfde lijn binnen hetzelfde stuk schuiven mee (min. 60 cm).
  const betrokken: { ruimte: string; deel: number; q: { x: number; y: number; b: number; d: number } }[] = [];
  for (const r of oud.ruimtes) {
    delenVan(r).forEach((q, deel) => {
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
}

function naPointerUp(ev: PointerEvent) {
  const s = sleep;
  sleep = undefined;
  $('#pl-canvas').releasePointerCapture?.(ev.pointerId);
  zoom?.losmaken();
  if (pannen) {
    const klik = !pannen.bewogen;
    pannen = undefined;
    zoom?.stopPan();
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
}

// ---------- eigenschappen ----------
function verwijderSelectie() {
  if (!selectie) return;
  const s = selectie;
  wijzig('plan', (t) => {
    if (s.soort === 'ruimte') t.plan.ruimtes = t.plan.ruimtes.filter((r) => r.id !== s.id);
    if (s.soort === 'meubel') t.plan.meubels = t.plan.meubels.filter((m) => m.id !== s.id);
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
    } else {
      const maten = el('div', { class: 'maten' });
      maten.append(
        getalVeld('Breedte', r.b, (w) => zet((x) => { x.b = Math.max(60, w); }), { min: 60, stap: 5, eenheid: 'cm' }),
        getalVeld('Diepte', r.d, (w) => zet((x) => { x.d = Math.max(60, w); }), { min: 60, stap: 5, eenheid: 'cm' }),
      );
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
    vak.append(el('p', { class: 'klein' }, 'Tip: sleep de blauwe bolletjes om een wand te verschuiven; de buurruimte schuift mee.'));
  } else if (s?.soort === 'opening') {
    const o = pl.openingen.find((x) => x.id === s.id);
    if (!o) { selectie = undefined; return toonEigenschappen(); }
    const zet = (f: (x: Opening) => void) => wijzig('plan', (t) => { const x = t.plan.openingen.find((y) => y.id === o.id); if (x) f(x); });
    const titel: Record<OpeningSoort, string> = { raam: 'Raam', buitendeur: 'Buitendeur', schuifraam: 'Schuifraam', binnendeur: 'Binnendeur', doorgang: 'Doorgang' };
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
        el('p', {}, `${eur(r.prijs.brutoprijsExcl)} excl. btw ${r.geldig ? '' : '· heeft fouten'}`),
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
    if (t?.prijs) vak.append(el('p', { class: 'klein' }, `Richtprijs ${eur(t.prijs)} (alleen in de offerte als "Inrichting" aan staat).`));
    const r = el('div', { class: 'knoppenrij' });
    r.append(knop('Draaien 90° (Q)', draaiMeubel), knop('Verwijderen', verwijderSelectie, 'gevaar'));
    vak.append(r);
  } else {
    vak.append(el('h3', {}, 'Woning'));
    const zet = (f: (p: Plattegrond) => void) => wijzig('plan', (t) => f(t.plan));
    const maten = el('div', { class: 'maten' });
    maten.append(
      getalVeld('Muurhoogte', pl.muurhoogte, (w) => zet((p) => { p.muurhoogte = Math.min(400, Math.max(200, w)); }), { min: 200, max: 400, stap: 5, eenheid: 'cm' }),
      getalVeld('Buitenmuur', pl.buitenmuur, (w) => zet((p) => { p.buitenmuur = Math.min(60, Math.max(15, w)); }), { min: 15, max: 60, eenheid: 'cm' }),
      getalVeld('Binnenmuur', pl.binnenmuur, (w) => zet((p) => { p.binnenmuur = Math.min(30, Math.max(5, w)); }), { min: 5, max: 30, eenheid: 'cm' }),
    );
    vak.append(maten);
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
  const meldingen = controleerPlan(alles);
  for (const o of alles.openingen) {
    const p = positieVan(o);
    if (p) for (const m of resultaat(p).meldingen) meldingen.push({ ernst: m.ernst, melding: `${p.code}: ${m.melding}`, opening: o.id });
  }
  meldingen.sort((a, b) => (a.ernst === b.ernst ? 0 : a.ernst === 'fout' ? -1 : 1));
  $('#pl-meldingen').replaceChildren(...meldingen.map((m) => {
    const li = el('li', { class: m.ernst }, m.melding);
    const id = m.opening ?? m.ruimte;
    if (id) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        const item = m.opening ? alles.openingen.find((o) => o.id === id) : alles.ruimtes.find((r) => r.id === id);
        if (item) niveau = niveauVan(item);
        selectie = { soort: m.opening ? 'opening' : 'ruimte', id };
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
  const o = berekenHuidigeOfferte();
  $('#pl-offerte').textContent = `${eur(o.excl)} excl. btw`;
  $<HTMLButtonElement>('#pl-ongedaan').disabled = !kanOngedaan();
}

// ---------- gereedschap ----------
function kiesGereedschap(g: Gereedschap) {
  gereedschap = g;
  voorbeeldOpening = undefined;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gereedschap]')) b.setAttribute('aria-pressed', String(b.dataset.gereedschap === g));
  $('#pl-hint').textContent = GEREEDSCHAP.find((x) => x.code === g)?.hint ?? '';
  $('#pl-meubels').hidden = g !== 'meubel';
  render();
  toonEigenschappen();
}

function toonWeergave(w: 'plan' | 'gevels' | '3d') {
  weergave = w;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-pl-weergave]')) b.setAttribute('aria-pressed', String(b.dataset.plWeergave === w));
  // Het tekenvlak met zijn zoomknoppen.
  $('#pl-canvas').parentElement!.hidden = w !== 'plan';
  $('#pl-zoomhint').hidden = w !== 'plan';
  $('#gv-editor').hidden = w !== 'gevels';
  $('#view-plan').classList.toggle('gevelmodus', w === 'gevels');
  if (w === 'gevels') gevelNaWijziging();
  $('#pl-3d').hidden = w !== '3d';
  $('#pl-3d-knoppen').hidden = w !== '3d';
  $('#pl-hint').hidden = w !== 'plan';
  if (w === '3d') {
    if (viewer === undefined) viewer = maak3D($('#pl-3d'));
    viewer?.formaat();
    plan3D();
  }
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

export function startPlattegrond(nav: { naarPositie: (id: string) => void; naarOfferte: () => void; naarProjecten: () => void }) {
  naarPositie = nav.naarPositie;
  naarOfferte = nav.naarOfferte;
  naarProjecten = nav.naarProjecten;
  const lijst = $('#pl-gereedschap');
  lijst.replaceChildren(...GEREEDSCHAP.map((g) => {
    const b = el('button', { type: 'button', 'data-gereedschap': g.code, 'aria-pressed': String(g.code === gereedschap) });
    b.append(el('span', {}, g.label));
    if (g.toets) b.append(el('kbd', {}, g.toets));
    b.addEventListener('click', () => kiesGereedschap(g.code));
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
      voorbeeld = undefined;
      voorbeeldWand = undefined;
    },
  });
  const vlak = document.createElement('div');
  vlak.className = 'zoomvlak';
  houder.before(vlak);
  vlak.append(houder, zoom.knoppen({ selectie: selectieKader, grootScherm: $('#view-plan') }));
  houder.addEventListener('pointerdown', naPointerDown);
  houder.addEventListener('pointermove', naPointerMove);
  houder.addEventListener('pointerup', naPointerUp);
  houder.addEventListener('pointerleave', () => { if (voorbeeldOpening) { voorbeeldOpening = undefined; render(); } });
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-pl-weergave]')) b.addEventListener('click', () => toonWeergave(b.dataset.plWeergave as 'plan' | 'gevels' | '3d'));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-pl-standpunt]')) b.addEventListener('click', () => viewer?.standpunt(b.dataset.plStandpunt as 'schuin'));
  $<HTMLInputElement>('#pl-laag').addEventListener('change', (e) => { laag = (e.target as HTMLInputElement).checked; plan3D(); });
  $<HTMLInputElement>('#pl-toon-meubels').addEventListener('change', (e) => { toonMeubels = (e.target as HTMLInputElement).checked; plan3D(); });
  $<HTMLInputElement>('#pl-alle-niveaus').addEventListener('change', (e) => { alleNiveaus = (e.target as HTMLInputElement).checked; plan3D(); });
  $('#pl-3d-knoppen .knoppenrij').append(grootSchermKnop($('#view-plan'), () => viewer?.formaat()));
  $('#pl-ongedaan').addEventListener('click', () => ongedaan());
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
        if (s.soort === 'opening') { const o = t.plan.openingen.find((x) => x.id === s.id); if (o) o.midden += o.as === 'h' ? v[0] : v[1]; }
      });
    }
  });
  kiesGereedschap('kies');
}

/** Wordt opgeroepen na elke wijziging in de toestand. */
export function naWijziging() {
  render();
  if (!sleep || sleep.soort === 'meubel' || sleep.soort === 'opening') toonEigenschappen();
  else toonOverzicht();
}
