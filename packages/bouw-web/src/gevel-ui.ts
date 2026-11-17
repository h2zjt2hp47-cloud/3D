/**
 * Gevel-editor: de gevel "verven" met materialen en kleurstalen, en ramen verschuiven of toevoegen
 * in het gevelaanzicht. Werkwijze naar het voorbeeld van de bouwmodus in een bouwspel:
 * kies een materiaal en een kleur, klik op een muurvlak (Shift = de hele gevel), pipet om een
 * materiaal over te nemen, en een voorbeeld onder de muis vóór je klikt.
 * Alles gaat via wijzig(), dus "ongedaan maken" werkt ook hier; de 3D en de offerte volgen vanzelf.
 */
import {
  gevelAanzichten,
  gevelAfwerking,
  gevelOppervlaktes,
  muurVanOpening,
  murenVan,
  nieuweStrookId,
  niveauPlan,
  dakOpbouw,
  strookOppervlaktes,
  niveauVan,
  strookPlaats,
  tekenSvg,
  verdiepingenVan,
  verfGevel,
  verwijderStrook,
  vloerHoogte,
  VLOERDIKTE,
  voegStrookToe,
  zetTegenBuren,
  type Gevel,
  type GevelKant,
  type GevelKeuze,
  type GevelStrook,
  type Opening,
  type Plattegrond,
  type VerfBereik,
} from '../../core/src/index.js';
import { gevelCatalogus, gevelOntwerpVan, planCatalogus } from '../../core/voorbeelden/inrichting.js';
import { openingenVan } from '../../core/voorbeelden/raamraster.js';
import { Zoom, type Kader } from '../../demo-web/src/zoom.js';
import { $, aanraak, el, eur, getal, getalVeld, PRIJZEN, schakelaar, voorVinger } from './hulp.js';
import { kanOngedaan, momentopname, ongedaan, positieVan, resultaat, toestand, wijzig, type Toestand } from './staat.js';

type Gereedschap = 'verf' | 'pipet' | 'ramen' | 'raam' | 'strook';

/**
 * `vinger`: de uitleg op een aanraakscherm (zonder Shift en Alt; "tik" in plaats van "klik" doet `voorVinger`). Ronde 16:
 * in twee groepen (`GEREEDSCHAP_GROEPEN`): eerst kleur en materiaal (verven, pipet, strook), dan de ramen.
 */
const GEREEDSCHAP: { code: Gereedschap; label: string; toets: string; hint: string; vinger?: string }[] = [
  { code: 'verf', label: 'Verven', toets: 'B', hint: 'Kies een materiaal en een kleur, en klik op een muurvlak. Shift+klik verft de hele gevel, Alt+klik neemt een materiaal over (pipet). Klik op de sokkel om die te verven.', vinger: 'Kies een materiaal en een kleur, en tik op een muurvlak (of kies hierboven wat je met één tik verft). Tik op de sokkel om die te verven.' },
  { code: 'pipet', label: 'Pipet', toets: 'I', hint: 'Klik op een muurvlak of de sokkel om het materiaal en de kleur over te nemen.' },
  { code: 'strook', label: 'Strook', toets: 'S', hint: 'Een materiaal op een deel van de gevel: kies hieronder wat voor strook en een materiaal, en klik op de gevel.' },
  { code: 'ramen', label: 'Ramen verschuiven', toets: 'V', hint: 'Sleep een raam opzij of in de hoogte (deuren alleen opzij). De maten eronder volgen mee. Shift = per cm.', vinger: 'Sleep een raam opzij of in de hoogte (deuren alleen opzij). De maten eronder volgen mee.' },
  { code: 'raam', label: 'Raam toevoegen', toets: 'R', hint: 'Klik op een muurvlak: er komt een raam (en een regel in het overzicht) op die plaats.' },
];
/** Ronde 16: de groepen van het gevelpalet, elk met een kop (dezelfde soort kop als in het gereedschap van de plattegrond). */
const GEREEDSCHAP_GROEPEN: { kop: string; codes: Gereedschap[] }[] = [
  { kop: 'Kleur en materiaal', codes: ['verf', 'pipet', 'strook'] },
  { kop: 'Ramen', codes: ['ramen', 'raam'] },
];
/**
 * Ronde 14: een strook in één tik. Wat de tik doet, hangt af van de soort: een band op die hoogte over de hele breedte van
 * de verdieping, een staande strook naast het raam of de deur (aan de kant waar je tikt), een kader rond een raam, of vrij
 * een rechthoek slepen. Daarna staan de maten in cm in het paneel ernaast.
 */
type StrookVorm = 'band' | 'naast' | 'kader' | 'vrij';
const STROOK_VORMEN: { code: StrookVorm; label: string; hint: string }[] = [
  { code: 'band', label: 'Band', hint: 'Klik op de gevel, op de hoogte van de band: een band van 60 cm over de hele breedte van die verdieping. De maten pas je daarna aan.' },
  { code: 'naast', label: 'Naast raam', hint: 'Klik op een raam of deur, aan de kant waar de strook moet komen: een staande strook van 40 cm over de hele hoogte van de gevel.' },
  { code: 'kader', label: 'Kader', hint: 'Klik op een raam of deur: een kader van 15 cm rondom (bij een deur niet onder de dorpel).' },
  { code: 'vrij', label: 'Vrij', hint: 'Sleep een rechthoek op de gevel; de maten staan erbij. Klik op een strook om ze te kiezen.' },
];
/** Met Strook aan staan de materialen in deze volgorde (wat het vaakst een strook wordt, eerst). */
const STROOK_GROEPEN = ['Hout', 'Metaal', 'Pleister', 'Leien en platen', 'Natuursteen', 'Baksteen'];
/** Standaardmaten van een nieuwe strook (cm). */
const BAND = 60, NAAST = 40, KADER = 15;
const BEREIK: { code: VerfBereik; label: string }[] = [
  { code: 'vlak', label: 'Muurvlak' },
  { code: 'gevel', label: 'Hele gevel' },
  { code: 'verdieping', label: 'Verdieping' },
  { code: 'woning', label: 'Hele woning' },
];
const KANT_NAAM: Record<GevelKant, string> = { boven: 'bovenkant', onder: 'onderkant', links: 'linkerkant', rechts: 'rechterkant' };

let gereedschap: Gereedschap = 'verf';
let bereik: VerfBereik = 'vlak';
let kwast: GevelKeuze = { materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' };
/** Het materiaal van een nieuwe strook (een strook in de steen van de gevel zie je niet: standaard hout). */
let strookKwast: GevelKeuze = { materiaal: 'hout_staand', kleur: 'naturel' };
let strookVorm: StrookVorm = 'band';
/** De gekozen strook (id), met haar maten in het paneel. */
let gekozenStrook: string | undefined;
/** Een rechthoek die gesleept wordt (soort Vrij), in de maat van de tekening. */
let trek: { start: { x: number; y: number }; nu: { x: number; y: number }; code?: string } | undefined;
let kant: GevelKant | undefined;
/** De gekozen gevel: de kant, of bij een schuine gevel de richting waarin ze kijkt (`s` + tienden van een graad). */
let gevelId: string | undefined;
const idVan = (g: Gevel) => (g.schuin ? `s${Math.round(g.schuin.kijkt * 10)}` : g.kant);
const huidigeGevel = () => gevels.find((x) => idVan(x) === gevelId);
/** Vorm onder de muis (voor het voorbeeld) en of Shift ingedrukt is. */
let onderMuis: { code: string; shift: boolean } | undefined;
let gekozen: string | undefined;
let gevels: Gevel[] = [];
let passend: Kader = { x: 0, y: 0, b: 1000, d: 500 };
let zoom: Zoom | undefined;
let sleep: { id: string; start: { x: number; y: number }; midden: number; borstwering: number; bewogen: boolean; min: number; max: number; hoogteMax: number; zijwaarts: number; verticaal: boolean } | undefined;
let pannen: { x: number; y: number; bewogen: boolean } | undefined;
/**
 * Verven, pipet of raam toevoegen gebeurt pas bij het loslaten (zoals een klik), en niet als de vinger
 * verschoof of er een tweede vinger bijkwam (knijpen om te zoomen mag de gevel niet verven).
 */
let wacht: { code: string; shift: boolean; alt: boolean; x: number; y: number; u: number; h: number; muur?: string } | undefined;
let terug: { voegRaamToe: (niveau: number, muur: string, midden: number) => string | undefined; naarPositie: (id: string) => void; naarPlan: (openingId: string) => void; naar3D: () => void } | undefined;

/** Info per opening voor de gevelaanzichten (kleur, vakken, zonweringskast). */
export function gevelInfo(o: Opening) {
  const p = positieVan(o);
  if (!p || p.model === 'AANBOUW') return undefined;
  const r = resultaat(p);
  const a = r.afgeleid;
  // Garagepoort: één dicht vlak in de kleur van de poort (het aanzicht tekent geen belijning).
  if (p.model === 'POORT') return { label: p.code, kleur: String(a.kleur_hex ?? '#383e42'), vakken: ['vast'], paneel: true };
  return {
    label: p.code,
    kleur: String(a.kb ?? '#383e42'),
    vakken: openingenVan(r),
    // De zonweringskast, of de opzetkast van een raamventilator (ronde 11b; van buiten een rooster over de breedte).
    kast: Math.max(Number(a.zon_kast) || 0, Number(a.vent_h) || 0) / 10,
    paneel: p.keuzes.type === 'voordeur' && p.keuzes.paneel !== 'glasstrook',
    voordeur: p.keuzes.type === 'voordeur',
  };
}

/** Alle gevels als SVG (voor de afdruk van de offerte). */
export function gevelSvgs(breedtePx = 600): { naam: string; svg: string }[] {
  return gevelAanzichten(toestand().plan, gevelInfo, planCatalogus).map((g) => ({ naam: g.naam, svg: tekenSvg(g.tekening, { breedtePx, lijnkleur: '#222', maatkleur: '#34505f' }) }));
}

// ---------- verven ----------
/** Zorgt dat er een gevelontwerp is (oudere projecten hebben alleen plan.gevel). */
function metOntwerp(t: Toestand) {
  t.plan.gevelOntwerp ??= gevelOntwerpVan(t.plan);
  if (t.meta.regels.gevel === undefined) t.meta.regels.gevel = true;
}
/** Houdt de eenvoudige gevelkeuze gelijk met de standaard (voor oudere schermen en de afdruk). */
function volgStandaard(plan: Plattegrond) {
  if (!plan.gevelOntwerp) return;
  const a = gevelAfwerking(plan, planCatalogus, plan.gevelOntwerp.standaard);
  plan.gevel = { soort: a.soort, kleur: a.kleur };
}

interface Doel { soort: 'vlak' | 'sokkel' | 'strook'; bereik: VerfBereik; sleutel: string; niveau: number; strook?: string }
/** De strook van een vorm in het aanzicht (`strook.<id>.<n>.<k>`). */
const strookVanCode = (code?: string) => (code ? /^strook\.([^.]+)\./.exec(code)?.[1] : undefined);
const zetKeuze = (s: GevelStrook, k: GevelKeuze) => { s.materiaal = k.materiaal; s.kleur = k.kleur; if (k.voeg) s.voeg = k.voeg; else delete s.voeg; };
function doelVan(code: string, shift: boolean): Doel | undefined {
  const g = huidigeGevel();
  const st = g?.stroken?.find((x) => x.code === code);
  if (st) return { soort: 'strook', bereik: 'vlak', sleutel: '', niveau: st.niveau, strook: st.strook };
  const v = g?.vlakken.find((x) => x.code === code);
  if (!v) return undefined;
  return { soort: v.sokkel ? 'sokkel' : 'vlak', bereik: shift ? 'gevel' : bereik, sleutel: v.sleutel, niveau: v.niveau };
}
function verf(plan: Plattegrond, d: Doel) {
  if (d.soort === 'strook') {
    const s = plan.gevelOntwerp?.stroken?.find((x) => x.id === d.strook);
    if (s) zetKeuze(s, kwast);
    return;
  }
  if (d.soort === 'sokkel') {
    plan.gevelOntwerp!.sokkel = { ...kwast, hoogte: plan.gevelOntwerp!.sokkel?.hoogte || 30 };
    return;
  }
  const g = huidigeGevel();
  // Een schuine gevel: "hele gevel" = elk muurvlak van dit aanzicht (een kant zou ook de rechte muren verven).
  if (d.bereik === 'gevel' && g?.schuin) for (const v of g.vlakken.filter((x) => !x.sokkel)) verfGevel(plan, kwast, 'vlak', { sleutel: v.sleutel });
  else verfGevel(plan, kwast, d.bereik, { sleutel: d.sleutel, kant, niveau: d.niveau });
  volgStandaard(plan);
}
/** Codes van de vormen die een klik zou verven (voor de markering). */
function getroffen(g: Gevel, d: Doel): Set<string> {
  if (d.soort === 'strook') return new Set((g.stroken ?? []).filter((x) => x.strook === d.strook).map((x) => x.code));
  if (d.soort === 'sokkel') return new Set(g.vlakken.filter((v) => v.sokkel).map((v) => v.code));
  const muren = g.vlakken.filter((v) => !v.sokkel);
  if (d.bereik === 'vlak') return new Set(muren.filter((v) => v.sleutel === d.sleutel).map((v) => v.code));
  if (d.bereik === 'verdieping') return new Set(muren.filter((v) => v.niveau === d.niveau).map((v) => v.code));
  return new Set(muren.map((v) => v.code));
}
function keuzeVan(plan: Plattegrond, d: Doel): GevelKeuze | undefined {
  const o = plan.gevelOntwerp ?? gevelOntwerpVan(plan);
  if (d.soort === 'strook') { const s = o.stroken?.find((x) => x.id === d.strook); return s && { materiaal: s.materiaal, kleur: s.kleur, ...(s.voeg ? { voeg: s.voeg } : {}) }; }
  if (d.soort === 'sokkel') return o.sokkel;
  return o.vlakken?.[d.sleutel] ?? o.standaard;
}

// ---------- tekenen ----------
export function toonGevelEditor() {
  const t = toestand();
  let plan = t.plan;
  // Voorbeeld: zo zou het eruitzien na een klik (zoals een verfborstel boven de muur).
  const doel = gereedschap === 'verf' && onderMuis && !sleep ? doelVan(onderMuis.code, onderMuis.shift) : undefined;
  if (doel) {
    plan = structuredClone(plan);
    plan.gevelOntwerp ??= gevelOntwerpVan(plan);
    verf(plan, doel);
  }
  // Met een eigen aanzicht per schuine gevel (recht ervoor bekeken), na de vier kanten.
  gevels = gevelAanzichten(plan, gevelInfo, planCatalogus, { schuin: true });
  const vak = $('#gv-canvas');
  if (!gevels.length) {
    vak.replaceChildren(el('p', { class: 'klein' }, 'Teken eerst ruimtes; de gevels volgen vanzelf.'));
    $('#gv-kanten').replaceChildren();
    $('#gv-legende').replaceChildren();
    toonEigenschappen();
    return;
  }
  if (!gevelId || !huidigeGevel()) gevelId = idVan(gevels.find((g) => g.naam.startsWith('Voorgevel') && !g.schuin) ?? gevels[0]!);
  const g = huidigeGevel()!;
  kant = g.kant;

  // Tabs per gevel.
  $('#gv-kanten').replaceChildren(...gevels.map((x) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(idVan(x) === gevelId), title: x.naam, 'data-gevel': idVan(x) }, x.schuin ? x.naam : x.naam.replace(/ \(.*\)$/, '') + ` · ${KANT_NAAM[x.kant]}`);
    // Een andere gevel: ook de gekozen strook los (een materiaal in het palet mag geen strook buiten beeld veranderen).
    b.addEventListener('click', () => { gevelId = idVan(x); gekozen = undefined; gekozenStrook = undefined; zoom?.passendMaken(); toonGevelEditor(); });
    return b;
  }));

  vak.innerHTML = tekenSvg(g.tekening, { breedtePx: 900, lijnkleur: '#2b2b28', maatkleur: '#34505f' });
  const svg = vak.querySelector('svg') as SVGSVGElement | null;
  if (svg) {
    const vb = svg.viewBox.baseVal;
    passend = { x: vb.x, y: vb.y, b: vb.width, d: vb.height };
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    const k = zoom ? zoom.kijkvak() : passend;
    svg.setAttribute('viewBox', `${k.x} ${k.y} ${k.b} ${k.d}`);
    const markeer = (codes: Iterable<string>, klasse: string) => {
      for (const c of codes) for (const r of svg.querySelectorAll(`[data-code="${CSS.escape(c)}"]`)) r.classList.add(klasse);
    };
    if (doel) markeer(getroffen(g, doel), 'gv-doel');
    else if (onderMuis && (gereedschap === 'pipet' || gereedschap === 'raam') && g.vlakken.some((v) => v.code === onderMuis!.code)) markeer([onderMuis.code], 'gv-doel');
    else if (onderMuis && gereedschap === 'pipet' && strookVanCode(onderMuis.code)) markeer(getroffen(g, doelVan(onderMuis.code, false)!), 'gv-doel');
    if (gekozen) markeer(g.tekening.vormen.filter((v) => v.code === `kader.${gekozen}`).map((v) => v.code), 'gv-gekozen');
    if (gekozenStrook) markeer((g.stroken ?? []).filter((x) => x.strook === gekozenStrook).map((x) => x.code), 'gv-gekozen');
    // Een losse muur buiten (tuinmuur) staat voor de gevel: in de editor half doorzichtig en niet aan te tikken, zodat je
    // de gevel en de ramen erachter nog kan verven en verschuiven (de afdruk toont ze vol).
    for (const r of svg.querySelectorAll<SVGElement>('[data-code^="wand."]')) {
      for (const x of [r, r.nextElementSibling?.classList.contains('patroon') ? r.nextElementSibling as SVGElement : undefined]) if (x) { x.style.opacity = '0.55'; x.style.pointerEvents = 'none'; }
    }
  }
  zoom?.bijwerken();
  vak.dataset.gereedschap = gereedschap;
  toonLegende(t.plan, g);
  toonEigenschappen();
}

function toonLegende(plan: Plattegrond, g: Gevel) {
  const opp = gevelOppervlaktes(plan);
  const naam = (k?: GevelKeuze) => {
    const m = k ? gevelCatalogus[k.materiaal] : undefined;
    if (!k || !m) return { tekst: 'Gevel', hex: plan.gevel.kleur, prijs: 0 };
    const voeg = m.voegen ? (m.voegen[k.voeg ?? ''] ?? Object.values(m.voegen)[0]) : undefined;
    return { tekst: `${m.label}, ${(m.kleuren[k.kleur]?.label ?? k.kleur).toLowerCase()}${voeg ? `, voeg ${voeg.label.toLowerCase()}` : ''}`, hex: m.kleuren[k.kleur]?.hex ?? '#999', prijs: m.prijs };
  };
  const som = new Map<string, { tekst: string; hex: string; m2: number; prijs: number }>();
  const tel = (sleutel: string, k: GevelKeuze | undefined, m2: number, voor = '') => {
    if (m2 <= 0) return;
    const n = naam(k);
    const x = som.get(sleutel) ?? { tekst: voor + n.tekst, hex: n.hex, m2: 0, prijs: n.prijs };
    x.m2 += m2;
    som.set(sleutel, x);
  };
  // Een schuine gevel: alleen de vlakken die in haar richting kijken.
  for (const v of opp.filter((x) => (g.schuin ? x.kijkt !== undefined && Math.round(x.kijkt * 10) === Math.round(g.schuin.kijkt * 10) : x.kant === g.kant))) {
    tel(JSON.stringify(v.keuze ?? {}), v.keuze, v.netto);
    const s = plan.gevelOntwerp?.sokkel;
    if (s) tel(`sokkel:${JSON.stringify(s)}`, s, v.sokkel, `Sokkel ${s.hoogte} cm: `);
  }
  const totaal = opp.reduce((t, v) => t + v.netto + v.sokkel, 0);
  const lijst = el('ul', { class: 'legende' });
  for (const x of som.values()) {
    const li = el('li');
    const blok = el('span', { class: 'staal' });
    blok.style.background = x.hex;
    li.append(blok, el('span', {}, `${x.tekst}: ${getal(x.m2, 1)} m²`));
    if (PRIJZEN && x.prijs) li.append(el('span', { class: 'klein intern prijsdeel' }, ` · ${eur(x.prijs * x.m2)}`));
    lijst.append(li);
  }
  $('#gv-legende').replaceChildren(
    el('p', { class: 'klein' }, `Deze gevel (netto, zonder ramen en deuren):`),
    lijst,
    el('p', { class: 'klein' }, `Hele woning: ${getal(totaal, 1)} m² gevel. ${toestand().meta.regels.gevel ? 'Staat in het overzicht (groep Gevel).' : 'Zet "Gevelafwerking" aan in het overzicht om ze mee te tellen.'}`),
    burenSchakelaar(plan, g),
  );
}

/**
 * Ronde 11: de hele gevel (alle muurvlakken van deze kant, op elke verdieping) tegen de buren of niet. Een muurvlak apart:
 * tik erop in de 3D. Tegen de buren = een bestaande scheidingsmuur: niet gebouwd, niet in de m² hierboven.
 */
function burenSchakelaar(plan: Plattegrond, g: Gevel): HTMLElement {
  const sleutels = [...new Set(g.vlakken.filter((v) => !v.sokkel).map((v) => v.sleutel))];
  const aan = sleutels.length > 0 && sleutels.every((s) => plan.tegenBuren?.includes(s));
  return schakelaar('Deze gevel staat tegen de buren', aan, (nu) => wijzig('plan', (t) => { for (const s of sleutels) zetTegenBuren(t.plan, s, nu); }), { 'data-gevel-buren': g.kant });
}

// ---------- palet ----------
function staalSvg(soort: string, hex: string, lijn: string): string {
  const paden: Record<string, [number, number, string]> = {
    steen: [22, 13, 'M0 0H22M0 6.5H22M0 0V6.5M11 6.5V13'],
    leien: [20, 12, 'M0 0H20M0 6H20M0 0V6M10 6V12'],
    natuursteen: [40, 20, 'M0 0H40M0 10H40M0 0V10M20 10V20'],
    planken: [8, 40, 'M0 0V40'],
    planken_h: [40, 8, 'M0 0H40'],
    zink: [14, 40, 'M0 0V40'],
  };
  const p = paden[soort];
  const id = `staal-${soort}-${hex.slice(1)}-${lijn.slice(1)}`;
  return `<svg viewBox="0 0 44 30" width="44" height="30" aria-hidden="true">${p ? `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${p[0]}" height="${p[1]}"><path d="${p[2]}" stroke="${lijn}" stroke-width="1" fill="none"/></pattern></defs>` : ''}<rect width="44" height="30" fill="${hex}"/>${p ? `<rect width="44" height="30" fill="url(#${id})"/>` : ''}</svg>`;
}
const lijnVan = (soort: string, hex: string, voeg?: string) => voeg ?? (soort === 'steen' ? '#cfc8bb' : `#${hex.slice(1).match(/../g)!.map((x) => Math.round(parseInt(x, 16) * 0.62).toString(16).padStart(2, '0')).join('')}`);

/** Staal (klein beeld, 44 × 30) van een gevelmateriaal in een kleur en met een voeg, zoals in het palet. Leeg als de code niet bestaat. */
export function gevelStaal(materiaal: string, kleur: string, voeg?: string): string {
  const m = gevelCatalogus[materiaal];
  if (!m) return '';
  const k = m.kleuren[kleur] ?? Object.values(m.kleuren)[0]!;
  const v = m.voegen ? (m.voegen[voeg ?? ''] ?? Object.values(m.voegen)[0]) : undefined;
  return staalSvg(m.soort, k.hex, lijnVan(m.soort, k.hex, v?.hex));
}

function toonPalet() {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gv-gereedschap]')) b.setAttribute('aria-pressed', String(b.dataset.gvGereedschap === gereedschap));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gv-bereik]')) b.setAttribute('aria-pressed', String(b.dataset.gvBereik === bereik));
  const g = GEREEDSCHAP.find((x) => x.code === gereedschap);
  const strook = gereedschap === 'strook';
  $('#gv-hint').textContent = voorVinger(strook ? STROOK_VORMEN.find((x) => x.code === strookVorm)!.hint : (aanraak() ? g?.vinger : undefined) ?? g?.hint ?? '');
  $<HTMLButtonElement>('#gv-ongedaan').disabled = !kanOngedaan();
  const verven = gereedschap === 'verf' || gereedschap === 'pipet' || strook;
  $('#gv-bereik').hidden = $('#gv-bereik-kop').hidden = gereedschap !== 'verf';
  $('#gv-strookvorm').hidden = $('#gv-strookvorm-kop').hidden = !strook;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gv-strookvorm]')) b.setAttribute('aria-pressed', String(b.dataset.gvStrookvorm === strookVorm));
  $('#gv-materialen').hidden = !verven;

  // Met Strook aan: het materiaal van de strook (en van de gekozen strook); anders de kwast van het verven.
  const nu = strook ? strookKwast : kwast;
  const zet = (k: GevelKeuze) => {
    if (!strook) { kwast = k; return; }
    strookKwast = k;
    const id = gekozenStrook;
    if (id) wijzig('plan', (t) => { const s = t.plan.gevelOntwerp?.stroken?.find((x) => x.id === id); if (s) zetKeuze(s, k); });
  };
  const alle = [...new Set(Object.values(gevelCatalogus).map((m) => m.groep))];
  const groepen = strook ? [...STROOK_GROEPEN.filter((g) => alle.includes(g)), ...alle.filter((g) => !STROOK_GROEPEN.includes(g))] : alle;
  const mat = gevelCatalogus[nu.materiaal]!;
  const vak = $('#gv-materialen');
  // Kleurstalen van het gekozen materiaal (en voegen bij metselwerk).
  const stalen = (titel: string, lijst: Record<string, { label: string; hex: string }>, waarde: string | undefined, kies: (k: string) => void) => {
    const d = el('div', { class: 'gv-stalen' });
    d.append(el('p', { class: 'klein' }, titel));
    const rij = el('div', { class: 'gv-rij', role: 'group', 'aria-label': titel });
    for (const [k, x] of Object.entries(lijst)) {
      const b = el('button', { type: 'button', class: 'gv-kleur', 'aria-pressed': String(k === waarde), title: x.label, 'aria-label': x.label, 'data-gv-kleur': k });
      b.style.background = x.hex;
      b.addEventListener('click', () => { kies(k); toonPalet(); });
      rij.append(b);
    }
    d.append(rij, el('p', { class: 'klein gv-kleurnaam' }, lijst[waarde ?? '']?.label ?? ''));
    return d;
  };
  // Ronde 16: een kop boven de materialen (met Strook aan: die van de strook), zoals de groepen erboven.
  vak.replaceChildren(el('p', { class: 'groepkop' }, strook ? 'Materiaal van de strook' : 'Materiaal en kleur'), ...groepen.map((groep) => {
    const d = el('div', { class: 'gv-groep' });
    d.append(el('p', { class: 'klein' }, groep));
    const rij = el('div', { class: 'gv-tegels' });
    for (const [code, m] of Object.entries(gevelCatalogus).filter(([, m]) => m.groep === groep)) {
      const kleur = code === nu.materiaal ? (m.kleuren[nu.kleur] ?? Object.values(m.kleuren)[0]!) : Object.values(m.kleuren)[0]!;
      const voeg = m.voegen ? (code === nu.materiaal ? m.voegen[nu.voeg ?? ''] : undefined) ?? Object.values(m.voegen)[0] : undefined;
      const b = el('button', { type: 'button', class: 'gv-tegel', 'aria-pressed': String(code === nu.materiaal), title: m.uitleg ?? m.label, 'data-gv-materiaal': code });
      const s = el('span', { class: 'gv-staal' });
      s.innerHTML = staalSvg(m.soort, kleur.hex, lijnVan(m.soort, kleur.hex, voeg?.hex));
      const tekst = el('span', { class: 'gv-naam' });
      tekst.append(el('span', {}, m.label));
      if (PRIJZEN) tekst.append(el('span', { class: 'klein intern prijsdeel' }, `${eur(m.prijs)}/m²`));
      b.append(s, tekst);
      b.addEventListener('click', () => {
        const k = Object.keys(m.kleuren);
        zet({ materiaal: code, kleur: k.includes(nu.kleur) ? nu.kleur : k[0]!, voeg: m.voegen ? (nu.voeg && m.voegen[nu.voeg] ? nu.voeg : Object.keys(m.voegen)[0]) : undefined });
        // Met Strook aan blijft de strook het gereedschap (een materiaal kiezen is dan voor de strook).
        if (gereedschap !== 'verf' && !strook) kiesGereedschap('verf'); else toonPalet();
      });
      rij.append(b);
      // Met Strook aan: de kleuren (en voegen) meteen onder het gekozen materiaal, zodat ze op een tablet in beeld staan.
      if (strook && code === nu.materiaal) rij.append(...kleurStalen());
    }
    d.append(rij);
    return d;
  }));
  function kleurStalen(): HTMLElement[] {
    return [stalen(`Kleur · ${mat.label}`, mat.kleuren, nu.kleur, (k) => zet({ ...nu, kleur: k })), ...(mat.voegen ? [stalen('Voeg', mat.voegen, nu.voeg, (k) => zet({ ...nu, voeg: k }))] : [])];
  }
  if (!strook) vak.append(...kleurStalen());

  // Sokkel.
  const plan = toestand().plan;
  const sokkel = plan.gevelOntwerp?.sokkel;
  const sk = $('#gv-sokkel');
  sk.replaceChildren(el('p', { class: 'groepkop' }, 'Sokkel'), el('p', { class: 'klein' }, 'De onderste strook van de gevel van het gelijkvloers'));
  const rij = el('div', { class: 'tabs klein', role: 'group', 'aria-label': 'Hoogte sokkel' });
  for (const h of [0, 20, 30, 50, 80]) {
    const b = el('button', { type: 'button', 'aria-pressed': String((sokkel?.hoogte ?? 0) === h) }, h ? `${h} cm` : 'Geen');
    b.addEventListener('click', () => wijzig('plan', (t) => {
      metOntwerp(t);
      const o = t.plan.gevelOntwerp!;
      if (!h) delete o.sokkel;
      else o.sokkel = { ...(o.sokkel ?? { materiaal: 'natuursteen', kleur: 'blauwgrijs' }), hoogte: h };
    }));
    rij.append(b);
  }
  sk.append(rij);
  if (sokkel?.hoogte) {
    const m = gevelCatalogus[sokkel.materiaal];
    sk.append(el('p', { class: 'klein' }, `Nu: ${m?.label ?? sokkel.materiaal}, ${(m?.kleuren[sokkel.kleur]?.label ?? sokkel.kleur).toLowerCase()}. ${voorVinger('Klik')} met het verfgereedschap op de sokkel om hem in het gekozen materiaal te zetten.`));
  }
}

function kiesGereedschap(g: Gereedschap) {
  gereedschap = g;
  onderMuis = undefined;
  if (g !== 'ramen') sleep = undefined;
  if (g !== 'strook') { gekozenStrook = undefined; trek = undefined; }
  toonPalet();
  toonGevelEditor();
}

// ---------- eigenschappen ----------
function toonEigenschappen() {
  const vak = $('#gv-eigenschappen');
  vak.replaceChildren();
  const plan = toestand().plan;
  const strook = gekozenStrook ? plan.gevelOntwerp?.stroken?.find((x) => x.id === gekozenStrook) : undefined;
  // Smal (tablet): de kolom met de eigenschappen staat onder de tekening, buiten beeld; de maten van de strook komen dan in
  // het palet, vlak onder de soort strook (naast de tekening).
  const inPalet = $('#gv-strookmaten');
  inPalet.replaceChildren();
  inPalet.hidden = !(strook && smal());
  if (strook && smal()) strookEigenschappen(inPalet, plan, strook);
  else if (strook) { strookEigenschappen(vak, plan, strook); return; }
  const o = gekozen ? plan.openingen.find((x) => x.id === gekozen) : undefined;
  if (o) {
    const p = positieVan(o);
    vak.append(el('h3', {}, p ? `${p.code} · ${p.naam}` : o.soort === 'raam' ? 'Raam' : 'Deur'));
    const zet = (f: (x: Opening) => void) => wijzig('plan', (t) => { const x = t.plan.openingen.find((y) => y.id === o.id); if (x) f(x); });
    const maten = el('div', { class: 'maten' });
    maten.append(
      getalVeld('Breedte', o.breedte, (w) => zet((x) => { x.breedte = Math.max(40, w); }), { min: 40, eenheid: 'cm' }),
      getalVeld('Hoogte', o.hoogte, (w) => zet((x) => { x.hoogte = Math.max(40, Math.min(plan.muurhoogte - x.borstwering, w)); }), { min: 40, eenheid: 'cm' }),
      getalVeld('Borstwering', o.borstwering, (w) => zet((x) => { x.borstwering = Math.max(0, Math.min(plan.muurhoogte - x.hoogte, w)); }), { min: 0, eenheid: 'cm' }),
    );
    vak.append(maten, el('p', { class: 'klein' }, 'De maten tussen de ramen staan onder de tekening (kettingmaten).'));
    const r = el('div', { class: 'knoppenrij' });
    const knop = (tekst: string, f: () => void, cls = 'tweede') => { const b = el('button', { type: 'button', class: cls }, tekst); b.addEventListener('click', f); return b; };
    if (p) r.append(knop('Configureren', () => terug?.naarPositie(p.id), ''));
    r.append(knop('Toon in plattegrond', () => terug?.naarPlan(o.id)));
    r.append(knop('Verwijderen', () => {
      gekozen = undefined;
      wijzig('plan', (t) => {
        t.plan.openingen = t.plan.openingen.filter((x) => x.id !== o.id);
        if (o.positie) t.posities = t.posities.filter((x) => x.id !== o.positie);
      });
    }, 'gevaar'));
    vak.append(r);
    return;
  }
  const m = gevelCatalogus[kwast.materiaal];
  // Ronde 16: de kaart heet naar wat ze toont (de kwast); *Gevel ontwerpen* is het palet links.
  vak.append(el('h3', {}, 'Kwast'));
  if (m) {
    const kleur = m.kleuren[kwast.kleur]?.label ?? kwast.kleur;
    vak.append(el('p', {}, `${m.label}, ${kleur.toLowerCase()}${m.voegen && kwast.voeg ? `, voeg ${(m.voegen[kwast.voeg]?.label ?? '').toLowerCase()}` : ''}.`));
    if (m.uitleg) vak.append(el('p', { class: 'klein' }, m.uitleg));
  }
  vak.append(el('p', { class: 'klein' }, `Tip: ${aanraak() ? 'Ongedaan staat bovenaan het palet' : 'Ctrl+Z maakt ongedaan'}. In 3D en in het overzicht zie je het resultaat meteen. De kleuren zijn voorbeelden.`));
  const b = el('button', { type: 'button', class: 'tweede' }, 'Bekijk in 3D');
  b.addEventListener('click', () => terug?.naar3D());
  vak.append(b);
}

// ---------- stroken (ronde 14) ----------

const rond5 = (x: number) => Math.round(x / 5) * 5;
/** Staat de kolom met de eigenschappen onder de tekening (tablet staand, smal venster)? */
const smal = () => {
  const r = document.querySelector('#view-plan .planraster');
  return !!r && getComputedStyle(r).gridTemplateColumns.split(' ').length < 3;
};
/** Van–tot van de muren van de gekozen gevel in het aanzicht (op één verdieping, of de hele gevel). */
function gevelBreedte(g: Gevel, niveau?: number): [number, number] {
  const muren = g.tekening.vormen.filter((v) => v.code.startsWith(niveau === undefined ? 'muur.' : `muur.${niveau}.`));
  const lijst = muren.length ? muren : g.tekening.vormen.filter((v) => v.code.startsWith('muur.'));
  return [Math.min(...lijst.map((v) => v.x)), Math.max(...lijst.map((v) => v.x + v.breedte))];
}
/** Op welke verdieping ligt een hoogte boven het maaiveld (cm)? Op een verdieping hoort de rand van de vloerplaat erbij. */
function niveauOpHoogte(plan: Plattegrond, h: number): number {
  let n = 0;
  for (let i = 1; i < verdiepingenVan(plan).length; i++) if (h >= vloerHoogte(plan, i) - VLOERDIKTE) n = i;
  return n;
}
/** Langs de gevel: van–tot in het aanzicht (u) naar van–tot op het plan. */
function opPlan(g: Gevel, u0: number, u1: number): { van: number; tot: number } {
  const a = Math.round(g.vanU(u0)), b = Math.round(g.vanU(u1));
  return { van: Math.min(a, b), tot: Math.max(a, b) };
}
/** Maakt een strook op de gekozen gevel (met het materiaal van de strook) en kiest ze; de maten staan dan in het paneel. */
function maakStrook(s: Omit<GevelStrook, 'id' | 'kant' | 'materiaal' | 'kleur'>) {
  const g = huidigeGevel();
  if (!g) return;
  const id = nieuweStrookId(toestand().plan);
  const strook: GevelStrook = { id, kant: g.kant, ...s, materiaal: strookKwast.materiaal, kleur: strookKwast.kleur, ...(strookKwast.voeg ? { voeg: strookKwast.voeg } : {}) };
  // Ligt er niets van op de gevel (naast de woning, op een bestaande muur of tegen de buren): geen onzichtbare strook.
  const proef = structuredClone(toestand().plan);
  proef.gevelOntwerp ??= gevelOntwerpVan(proef);
  voegStrookToe(proef, strook);
  if (!strookOppervlaktes(proef, dakOpbouw(proef)).some((x) => x.strook.id === id)) {
    $('#gv-hint').textContent = 'Daar ligt geen nieuwe gevel: de strook kwam er niet. Tik op de gevel zelf (niet op een bestaande muur of een muur tegen de buren).';
    return;
  }
  gekozenStrook = id;
  gekozen = undefined;
  wijzig('plan', (t) => {
    metOntwerp(t);
    voegStrookToe(t.plan, strook);
  });
}

/** Een tik met Strook: een strook kiezen, of een nieuwe maken volgens de soort. */
function strookTik(w: NonNullable<typeof wacht>) {
  const g = huidigeGevel();
  if (!g) return;
  const plan = toestand().plan;
  const bestaand = strookVanCode(w.code);
  if (bestaand) { gekozenStrook = bestaand; gekozen = undefined; toonGevelEditor(); return; }
  // Naast de gevel: niets maken, de gekozen strook los.
  if (!w.code) { gekozenStrook = undefined; toonGevelEditor(); return; }
  if (g.schuin) { $('#gv-hint').textContent = 'Op een schuine gevel kan (nog) geen strook: alleen op de vier rechte gevels.'; return; }
  const oid = /^(?:kader|vak|label|kast)\.([^.]+)/.exec(w.code)?.[1];
  const o = oid ? plan.openingen.find((x) => x.id === oid) : undefined;
  const H = plan.muurhoogte;
  if (strookVorm === 'band') {
    const n = niveauOpHoogte(plan, w.h), laag = n > 0 ? -VLOERDIKTE : 0;
    const onder = Math.min(H - BAND, Math.max(laag, rond5(w.h - vloerHoogte(plan, n) - BAND / 2)));
    maakStrook({ niveau: n, onder, boven: onder + BAND });
    return;
  }
  // Een raam of deur in het aanzicht: van–tot (u, gezien van buiten).
  const ou = o ? [g.naarU(o.midden - o.breedte / 2), g.naarU(o.midden + o.breedte / 2)].sort((a, b) => a - b) as [number, number] : undefined;
  if (strookVorm === 'naast') {
    const [u0, u1] = ou ? (w.u < (ou[0] + ou[1]) / 2 ? [ou[0] - NAAST, ou[0]] : [ou[1], ou[1] + NAAST]) : [w.u - NAAST / 2, w.u + NAAST / 2];
    maakStrook(opPlan(g, u0, u1));
    return;
  }
  if (strookVorm === 'kader') {
    if (!o || !ou) { $('#gv-hint').textContent = voorVinger('Klik op een raam of deur: het kader komt er rondom.'); return; }
    const kast = gevelInfo(o)?.kast ?? 0;
    maakStrook({ niveau: niveauVan(o), ...opPlan(g, ou[0] - KADER, ou[1] + KADER), onder: o.borstwering > 0 ? o.borstwering - KADER : o.borstwering, boven: o.borstwering + o.hoogte + kast + KADER });
  }
}

/** Het voorbeeld van een gesleepte rechthoek, met de maten in cm erbij. */
function toonTrek() {
  const svg = $('#gv-canvas').querySelector('svg');
  if (!svg || !trek) return;
  let r = svg.querySelector<SVGRectElement>('#gv-trek'), t = svg.querySelector<SVGTextElement>('#gv-trek-maat');
  if (!r || !t) {
    r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.id = 'gv-trek';
    t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.id = 'gv-trek-maat';
    svg.append(r, t);
  }
  const x = Math.min(trek.start.x, trek.nu.x), y = Math.min(trek.start.y, trek.nu.y);
  const b = Math.abs(trek.nu.x - trek.start.x), h = Math.abs(trek.nu.y - trek.start.y);
  for (const [k, v] of Object.entries({ x, y, width: b, height: h })) r.setAttribute(k, String(v));
  t.setAttribute('x', String(x + b / 2));
  t.setAttribute('y', String(y - 12));
  t.textContent = `${rond5(b)} × ${rond5(h)} cm`;
}
/** De gesleepte rechthoek wordt een strook (te klein = een tik: een strook eronder kiezen). */
function eindeTrek(code?: string) {
  const g = huidigeGevel(), r = trek;
  trek = undefined;
  if (!g || !r) return;
  const plan = toestand().plan;
  const u0 = rond5(Math.min(r.start.x, r.nu.x)), u1 = rond5(Math.max(r.start.x, r.nu.x));
  const h0 = rond5(g.vanY(Math.max(r.start.y, r.nu.y))), h1 = rond5(g.vanY(Math.min(r.start.y, r.nu.y)));
  if (u1 - u0 < 10 || h1 - h0 < 10) {
    gekozenStrook = strookVanCode(code);
    toonGevelEditor();
    return;
  }
  if (g.schuin) { $('#gv-hint').textContent = 'Op een schuine gevel kan (nog) geen strook: alleen op de vier rechte gevels.'; toonGevelEditor(); return; }
  // Binnen één verdieping: de hoogtes vanaf haar vloer; anders over de hele gevel (vanaf het gelijkvloers).
  const n = niveauOpHoogte(plan, h0 + 1);
  const een = niveauOpHoogte(plan, h1 - 1) === n;
  const y = een ? vloerHoogte(plan, n) : 0;
  maakStrook({ ...(een ? { niveau: n } : {}), ...opPlan(g, u0, u1), onder: Math.max(0, h0) - y, boven: h1 - y });
}

/** De maten van de gekozen strook in cm, zoals bij een raam: plaats, breedte, hoogte, verdieping; verwijderen. */
function strookEigenschappen(vak: HTMLElement, plan: Plattegrond, s: GevelStrook) {
  const g = huidigeGevel();
  const m = gevelCatalogus[s.materiaal];
  vak.append(el('h3', {}, `Strook · ${m?.label ?? s.materiaal}`));
  vak.append(el('p', { class: 'klein' }, `${(m?.kleuren[s.kleur]?.label ?? s.kleur)}; ${strookPlaats(plan, s)}.`));
  if (!g || g.kant !== s.kant || g.schuin) return;
  const id = s.id;
  const zet = (f: (x: GevelStrook) => void) => wijzig('plan', (t) => { const x = t.plan.gevelOntwerp?.stroken?.find((y) => y.id === id); if (x) f(x); });
  const knop = (tekst: string, aan: boolean, f: () => void, data: Record<string, string>) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(aan), ...data }, tekst);
    b.addEventListener('click', f);
    return b;
  };
  // Langs de gevel: van links (gezien van buiten, vanaf de buitenkant van de gevel) en de breedte.
  const [links, rechts] = gevelBreedte(g, s.niveau);
  const heleBreedte = s.van === undefined || s.tot === undefined;
  const H = plan.muurhoogte, top = s.niveau === undefined ? vloerHoogte(plan, verdiepingenVan(plan).length - 1) + H : H;
  const heleHoogte = s.onder === undefined || s.boven === undefined;
  const rij = el('div', { class: 'tabs klein', role: 'group', 'aria-label': 'Breedte en hoogte' });
  rij.append(
    knop('Hele breedte', heleBreedte, () => zet((x) => {
      if (heleBreedte) Object.assign(x, opPlan(g, links, rechts)); else { delete x.van; delete x.tot; }
    }), { 'data-gv-strook-breed': '' }),
    knop('Hele hoogte', heleHoogte, () => zet((x) => {
      if (heleHoogte) { x.onder = 0; x.boven = top; } else { delete x.onder; delete x.boven; }
    }), { 'data-gv-strook-hoog': '' }),
  );
  vak.append(rij);
  const maten = el('div', { class: 'maten' });
  if (!heleBreedte) {
    const [a, b] = [g.naarU(s.van!), g.naarU(s.tot!)].sort((p, q) => p - q) as [number, number];
    maten.append(
      getalVeld('Van links', a - links, (w) => zet((x) => Object.assign(x, opPlan(g, links + w, links + w + (b - a)))), { eenheid: 'cm' }),
      getalVeld('Breedte', b - a, (w) => zet((x) => Object.assign(x, opPlan(g, a, a + Math.max(5, w)))), { min: 5, eenheid: 'cm' }),
    );
  }
  if (!heleHoogte) {
    maten.append(
      getalVeld('Van onder', s.onder!, (w) => zet((x) => { const h = x.boven! - x.onder!; x.onder = w; x.boven = w + h; }), { eenheid: 'cm' }),
      getalVeld('Hoogte', s.boven! - s.onder!, (w) => zet((x) => { x.boven = x.onder! + Math.max(5, w); }), { min: 5, eenheid: 'cm' }),
    );
  }
  if (maten.childElementCount) vak.append(maten);
  // Verwijderen vlak onder de maten (op een tablet nog naast de tekening).
  const r = el('div', { class: 'knoppenrij' });
  const weg = el('button', { type: 'button', class: 'gevaar', 'data-gv-strook-weg': '' }, 'Verwijderen');
  weg.addEventListener('click', () => { gekozenStrook = undefined; wijzig('plan', (t) => verwijderStrook(t.plan, id)); });
  const drie = el('button', { type: 'button', class: 'tweede' }, 'Bekijk in 3D');
  drie.addEventListener('click', () => terug?.naar3D());
  r.append(weg, drie);
  vak.append(r);
  // Verdieping: de hoogtes blijven op dezelfde plaats.
  const namen = verdiepingenVan(plan);
  if (namen.length > 1) {
    const verd = el('div', { class: 'tabs klein', role: 'group', 'aria-label': 'Verdieping' });
    const keuzes: [number | undefined, string][] = [[undefined, 'Hele gevel'], ...namen.map((v, i): [number, string] => [i, v.naam])];
    for (const [w, label] of keuzes) {
      verd.append(knop(label, s.niveau === w, () => zet((x) => {
        const oud = x.niveau === undefined ? 0 : vloerHoogte(plan, x.niveau), nieuw = w === undefined ? 0 : vloerHoogte(plan, w);
        if (x.onder !== undefined) x.onder += oud - nieuw;
        if (x.boven !== undefined) x.boven += oud - nieuw;
        if (w === undefined) delete x.niveau; else x.niveau = w;
      }), { 'data-gv-strook-niveau': w === undefined ? 'gevel' : String(w) }));
    }
    vak.append(el('p', { class: 'klein' }, 'Op welke verdieping'), verd);
  }
  vak.append(el('p', { class: 'klein' }, `${voorVinger('Klik')} een materiaal of kleur in het palet om de strook te veranderen. De maten tellen vanaf de buitenkant van de gevel en vanaf de vloer${s.niveau === undefined ? ' van het gelijkvloers' : ''}.`));
}

/** Opent de gevel van een strook met die strook gekozen (vanuit het keuzepaneel van de 3D). */
export function kiesStrookInGevel(id: string) {
  const s = toestand().plan.gevelOntwerp?.stroken?.find((x) => x.id === id);
  if (!s) return;
  gevelId = s.kant;
  gekozenStrook = id;
  gekozen = undefined;
  if (gereedschap !== 'strook') { gereedschap = 'strook'; onderMuis = undefined; sleep = undefined; }
  zoom?.passendMaken();
}

// ---------- muis ----------
function punt(ev: PointerEvent): { x: number; y: number } {
  const svg = $('#gv-canvas').querySelector('svg') as SVGSVGElement | null;
  const m = svg?.getScreenCTM();
  if (!svg || !m) return { x: 0, y: 0 };
  const q = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
  return { x: q.x, y: q.y };
}
const codeOnder = (ev: Event) => ((ev.target as Element).closest?.('[data-code]') as SVGElement | null)?.dataset.code;
/**
 * Wat er op die plaats van de gevel ligt, ook onder de lijnen van een raamsymbool of een tekst (die geen code hebben):
 * een muurvlak, sokkel, topgevel, strook, raam of deur. Geen maatlijn, maaiveld of dakrand.
 */
const codeOpPunt = (ev: PointerEvent) => codeOnder(ev) ?? document.elementsFromPoint(ev.clientX, ev.clientY)
  .map((e) => (e as SVGElement).dataset?.code).find((c) => !!c && /^(muur|sokkel|topgevel|strook|kader|vak|label|kast)\./.test(c));
const openingVanCode = (code?: string) => (code ? /^(?:kader|vak|label|kast)\.([^.]+)/.exec(code)?.[1] : undefined);

function naDown(ev: PointerEvent) {
  if (ev.button !== 0 || zoom?.bezig) return;
  const code = codeOnder(ev);
  const houder = $('#gv-canvas');
  const g = huidigeGevel();
  if (!g) return;
  if (gereedschap === 'strook') {
    // Vrij: een rechthoek slepen (ook over een raam heen). Anders gebeurt de tik bij het loslaten (niet bij knijpen).
    if (strookVorm === 'vrij') {
      const p = punt(ev);
      trek = { start: p, nu: p, code: codeOpPunt(ev) };
      zoom?.vastzetten();
    } else {
      const p = punt(ev);
      wacht = { code: codeOpPunt(ev) ?? '', shift: false, alt: false, x: ev.clientX, y: ev.clientY, u: p.x, h: g.vanY(p.y) };
    }
    houder.setPointerCapture(ev.pointerId);
    return;
  }
  const oid = openingVanCode(code);
  if (oid && gereedschap !== 'ramen') {
    // Raam aanklikken met een ander gereedschap: alleen selecteren (eigenschappen rechts).
    gekozen = oid;
    toonGevelEditor();
    return;
  }
  if (oid) {
    gekozen = oid;
    const plan = toestand().plan;
    const o = plan.openingen.find((x) => x.id === oid);
    if (!o) return;
    const m = muurVanOpening(o, murenVan(niveauPlan(plan, niveauVan(o))));
    if (m?.as === 's' && !g.schuin) {
      // In verkort is een plaats in het aanzicht geen plaats langs de schuine muur: verschuiven in haar eigen aanzicht.
      $('#gv-hint').textContent = 'Dit raam staat in een schuine muur: hier zie je ze in verkort. Verschuif het in het aanzicht van die schuine gevel (tab hierboven).';
      toonGevelEditor();
      return;
    }
    zoom?.vastzetten();
    sleep = {
      id: oid, start: punt(ev), midden: o.midden, borstwering: o.borstwering, bewogen: false,
      min: (m?.van ?? -Infinity) + o.breedte / 2 + 5, max: (m?.tot ?? Infinity) - o.breedte / 2 - 5,
      hoogteMax: plan.muurhoogte - o.hoogte, zijwaarts: g.vanU(1) - g.vanU(0), verticaal: o.soort === 'raam',
    };
    houder.setPointerCapture(ev.pointerId);
    toonGevelEditor();
    return;
  }
  // Raam toevoegen op een strook: het muurvlak eronder (de strook ligt vóór de muur).
  const muurOnder = gereedschap === 'raam' && strookVanCode(code)
    ? document.elementsFromPoint(ev.clientX, ev.clientY).map((e) => (e as SVGElement).dataset?.code).find((c) => !!c && g.vlakken.some((v) => v.code === c && !v.sokkel))
    : undefined;
  const doel = code ? doelVan(muurOnder ?? code, ev.shiftKey) : undefined;
  if (code && doel && (gereedschap === 'pipet' || gereedschap === 'verf' || (gereedschap === 'raam' && doel.soort === 'vlak'))) {
    wacht = { code: muurOnder ?? code, shift: ev.shiftKey, alt: ev.altKey, x: ev.clientX, y: ev.clientY, u: punt(ev).x, h: 0 };
    houder.setPointerCapture(ev.pointerId);
    return;
  }
  // Leeg stuk: slepen verschuift het beeld, een klik deselecteert.
  pannen = { x: ev.clientX, y: ev.clientY, bewogen: false };
  zoom?.startPan(ev);
  houder.setPointerCapture(ev.pointerId);
}

function naMove(ev: PointerEvent) {
  if (trek) {
    trek.nu = punt(ev);
    toonTrek();
    return;
  }
  if (wacht) {
    // Verschoven: geen klik meer.
    if (Math.hypot(ev.clientX - wacht.x, ev.clientY - wacht.y) > 8) wacht = undefined;
    return;
  }
  if (pannen) {
    if (Math.hypot(ev.clientX - pannen.x, ev.clientY - pannen.y) > 3) pannen.bewogen = true;
    zoom?.beweegPan(ev);
    return;
  }
  if (sleep) {
    const p = punt(ev);
    const s = sleep;
    const stap = ev.shiftKey ? 1 : 5;
    const dx = p.x - s.start.x, dy = p.y - s.start.y;
    if (!s.bewogen && Math.hypot(dx, dy) < 2) return;
    if (!s.bewogen) { momentopname(); s.bewogen = true; }
    const midden = Math.min(s.max, Math.max(s.min, Math.round((s.midden + dx * s.zijwaarts) / stap) * stap));
    const borst = s.verticaal ? Math.min(s.hoogteMax, Math.max(0, Math.round((s.borstwering - dy) / stap) * stap)) : s.borstwering;
    wijzig('plan', (t) => { const o = t.plan.openingen.find((x) => x.id === s.id); if (o) { o.midden = midden; o.borstwering = borst; } }, { zonderOngedaan: true });
    return;
  }
  const code = codeOnder(ev);
  const nieuw = code && (huidigeGevel()?.vlakken.some((v) => v.code === code) || huidigeGevel()?.stroken?.some((v) => v.code === code)) ? { code, shift: ev.shiftKey } : undefined;
  if (nieuw?.code !== onderMuis?.code || nieuw?.shift !== onderMuis?.shift) {
    onderMuis = nieuw;
    if (gereedschap !== 'ramen' && gereedschap !== 'strook') toonGevelEditor();
  }
}

/** De klik uitvoeren die bij het indrukken klaargezet werd. */
function voerUit(w: NonNullable<typeof wacht>) {
  if (gereedschap === 'strook') { strookTik(w); return; }
  const g = huidigeGevel();
  const doel = doelVan(w.code, w.shift);
  if (!g || !doel) return;
  if (gereedschap === 'pipet' || (gereedschap === 'verf' && w.alt)) {
    const k = keuzeVan(toestand().plan, doel);
    if (k) kwast = { ...k };
    kiesGereedschap('verf');
    return;
  }
  if (gereedschap === 'verf') {
    wijzig('plan', (t) => { metOntwerp(t); verf(t.plan, doel); });
    return;
  }
  if (gereedschap === 'raam' && doel.soort === 'vlak') {
    const v = g.vlakken.find((x) => x.code === w.code)!;
    if (!g.schuin && murenVan(niveauPlan(toestand().plan, v.niveau)).find((m) => m.id === v.muur)?.as === 's') {
      $('#gv-hint').textContent = 'Een schuine muur zie je hier in verkort: voeg het raam toe in het aanzicht van die schuine gevel (tab hierboven).';
      return;
    }
    const id = terug?.voegRaamToe(v.niveau, v.muur, Math.round(g.vanU(w.u)));
    if (id) { gekozen = id; kiesGereedschap('ramen'); }
  }
}

function naUp(ev: PointerEvent) {
  if (trek) {
    zoom?.losmaken();
    eindeTrek(trek.code);
    return;
  }
  if (wacht) {
    const w = wacht;
    wacht = undefined;
    voerUit(w);
    return;
  }
  if (pannen) {
    zoom?.stopPan();
    if (!pannen.bewogen) { gekozen = undefined; toonGevelEditor(); }
    pannen = undefined;
    return;
  }
  if (sleep) {
    sleep = undefined;
    zoom?.losmaken();
    toonGevelEditor();
  }
  void ev;
}

/** Sneltoetsen in de gevel-editor (geeft true als de toets gebruikt werd). */
export function gevelToets(ev: KeyboardEvent): boolean {
  if (zoom?.toets(ev)) return true;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
  const g = GEREEDSCHAP.find((x) => x.toets.toLowerCase() === ev.key.toLowerCase());
  if (g) { kiesGereedschap(g.code); return true; }
  if (ev.key === 'Escape') { gekozen = undefined; gekozenStrook = undefined; kiesGereedschap('verf'); return true; }
  if ((ev.key === 'Delete' || ev.key === 'Backspace') && gekozenStrook) {
    const id = gekozenStrook;
    gekozenStrook = undefined;
    wijzig('plan', (t) => verwijderStrook(t.plan, id));
    return true;
  }
  if ((ev.key === 'Delete' || ev.key === 'Backspace') && gekozen) {
    const id = gekozen;
    gekozen = undefined;
    wijzig('plan', (t) => {
      const o = t.plan.openingen.find((x) => x.id === id);
      t.plan.openingen = t.plan.openingen.filter((x) => x.id !== id);
      if (o?.positie) t.posities = t.posities.filter((x) => x.id !== o.positie);
    });
    return true;
  }
  return false;
}

/** Na elke wijziging (ook ongedaan maken). */
export function gevelNaWijziging() {
  if (gekozen && !toestand().plan.openingen.some((o) => o.id === gekozen)) gekozen = undefined;
  if (gekozenStrook && !toestand().plan.gevelOntwerp?.stroken?.some((s) => s.id === gekozenStrook)) gekozenStrook = undefined;
  toonPalet();
  toonGevelEditor();
}

export function startGevels(nav: NonNullable<typeof terug>) {
  terug = nav;
  $('#gv-gereedschap').replaceChildren(...GEREEDSCHAP_GROEPEN.flatMap((groep) => [el('p', { class: 'groepkop' }, groep.kop), ...groep.codes.map((code) => {
    const g = GEREEDSCHAP.find((x) => x.code === code)!;
    const b = el('button', { type: 'button', 'data-gv-gereedschap': g.code, 'aria-pressed': String(g.code === gereedschap), title: `${g.label} (${g.toets})` });
    b.append(el('span', {}, g.label), el('kbd', {}, g.toets));
    b.addEventListener('click', () => kiesGereedschap(g.code));
    return b;
  })]));
  $('#gv-bereik').replaceChildren(...BEREIK.map((x) => {
    const b = el('button', { type: 'button', 'data-gv-bereik': x.code, 'aria-pressed': String(x.code === bereik) }, x.label);
    b.addEventListener('click', () => { bereik = x.code; toonPalet(); });
    return b;
  }));
  $('#gv-strookvorm').replaceChildren(...STROOK_VORMEN.map((x) => {
    const b = el('button', { type: 'button', 'data-gv-strookvorm': x.code, 'aria-pressed': String(x.code === strookVorm) }, x.label);
    // Een andere soort kiezen = een nieuwe strook maken: de gekozen strook los (anders kreeg die het materiaal van de volgende).
    b.addEventListener('click', () => { strookVorm = x.code; gekozenStrook = undefined; if (gereedschap !== 'strook') kiesGereedschap('strook'); else { toonPalet(); toonGevelEditor(); } });
    return b;
  }));
  $('#gv-ongedaan').addEventListener('click', () => ongedaan());
  const houder = $('#gv-canvas');
  zoom = new Zoom({
    doel: houder,
    svg: () => houder.querySelector('svg'),
    passend: () => passend,
    opnieuw: toonGevelEditor,
    minBreedte: 80,
    wielZoomt: () => document.body.classList.contains('heeft-groot-scherm'),
    opKnijpen: () => {
      // Tweede vinger: de klaargezette klik vervalt, een begonnen verplaatsing wordt teruggedraaid.
      if (sleep?.bewogen) ongedaan();
      sleep = undefined;
      pannen = undefined;
      wacht = undefined;
      if (trek) { trek = undefined; zoom?.losmaken(); toonGevelEditor(); }
    },
  });
  const vlak = document.createElement('div');
  vlak.className = 'zoomvlak';
  houder.before(vlak);
  vlak.append(houder, zoom.knoppen({ grootScherm: $('#view-plan') }));
  houder.addEventListener('pointerdown', naDown);
  houder.addEventListener('pointermove', naMove);
  houder.addEventListener('pointerup', naUp);
  houder.addEventListener('pointerleave', () => { if (onderMuis) { onderMuis = undefined; toonGevelEditor(); } });
  houder.addEventListener('pointercancel', () => {
    wacht = undefined; pannen = undefined;
    if (sleep) { sleep = undefined; zoom?.losmaken(); }
    if (trek) { trek = undefined; zoom?.losmaken(); toonGevelEditor(); }
  });
  // Shift indrukken of loslaten verandert het voorbeeld (muurvlak ↔ hele gevel).
  const shift = (ev: KeyboardEvent) => {
    if (ev.key !== 'Shift' || !onderMuis || $('#gv-editor').hidden) return;
    onderMuis = { ...onderMuis, shift: ev.type === 'keydown' };
    toonGevelEditor();
  };
  document.addEventListener('keydown', shift);
  document.addEventListener('keyup', shift);
  toonPalet();
}
