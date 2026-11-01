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
  niveauPlan,
  niveauVan,
  tekenSvg,
  verfGevel,
  type Gevel,
  type GevelKant,
  type GevelKeuze,
  type Opening,
  type Plattegrond,
  type VerfBereik,
} from '../../core/src/index.js';
import { gevelCatalogus, gevelOntwerpVan, planCatalogus } from '../../core/voorbeelden/inrichting.js';
import { Zoom, type Kader } from '../../demo-web/src/zoom.js';
import { $, el, eur, getal, getalVeld } from './hulp.js';
import { momentopname, positieVan, resultaat, toestand, wijzig, type Toestand } from './staat.js';

type Gereedschap = 'verf' | 'pipet' | 'ramen' | 'raam';

const GEREEDSCHAP: { code: Gereedschap; label: string; toets: string; hint: string }[] = [
  { code: 'verf', label: 'Verven', toets: 'B', hint: 'Kies een materiaal en een kleur, en klik op een muurvlak. Shift+klik verft de hele gevel, Alt+klik neemt een materiaal over (pipet). Klik op de sokkel om die te verven.' },
  { code: 'pipet', label: 'Pipet', toets: 'I', hint: 'Klik op een muurvlak of de sokkel om het materiaal en de kleur over te nemen.' },
  { code: 'ramen', label: 'Ramen verschuiven', toets: 'V', hint: 'Sleep een raam opzij of in de hoogte (deuren alleen opzij). De maten eronder volgen mee. Shift = per cm.' },
  { code: 'raam', label: 'Raam toevoegen', toets: 'R', hint: 'Klik op een muurvlak: er komt een raam (en een positie in de offerte) op die plaats.' },
];
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
let kant: GevelKant | undefined;
/** Vorm onder de muis (voor het voorbeeld) en of Shift ingedrukt is. */
let onderMuis: { code: string; shift: boolean } | undefined;
let gekozen: string | undefined;
let gevels: Gevel[] = [];
let passend: Kader = { x: 0, y: 0, b: 1000, d: 500 };
let zoom: Zoom | undefined;
let sleep: { id: string; start: { x: number; y: number }; midden: number; borstwering: number; bewogen: boolean; min: number; max: number; hoogteMax: number; zijwaarts: number; verticaal: boolean } | undefined;
let pannen: { x: number; y: number; bewogen: boolean } | undefined;
let terug: { voegRaamToe: (niveau: number, muur: string, midden: number) => string | undefined; naarPositie: (id: string) => void; naarPlan: (openingId: string) => void; naar3D: () => void } | undefined;

/** Info per opening voor de gevelaanzichten (kleur, vakken, zonweringskast). */
export function gevelInfo(o: Opening) {
  const p = positieVan(o);
  if (!p || p.model !== 'RAAM') return undefined;
  const r = resultaat(p);
  const a = r.afgeleid;
  const n = Math.max(1, Number(a.n) || 1);
  return {
    label: p.code,
    kleur: String(a.kb ?? '#383e42'),
    vakken: [a.op1, a.op2, a.op3].slice(0, n).map(String),
    kast: (Number(a.zon_kast) || 0) / 10,
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

interface Doel { soort: 'vlak' | 'sokkel'; bereik: VerfBereik; sleutel: string; niveau: number }
function doelVan(code: string, shift: boolean): Doel | undefined {
  const g = gevels.find((x) => x.kant === kant);
  const v = g?.vlakken.find((x) => x.code === code);
  if (!v) return undefined;
  return { soort: v.sokkel ? 'sokkel' : 'vlak', bereik: shift ? 'gevel' : bereik, sleutel: v.sleutel, niveau: v.niveau };
}
function verf(plan: Plattegrond, d: Doel) {
  if (d.soort === 'sokkel') {
    plan.gevelOntwerp!.sokkel = { ...kwast, hoogte: plan.gevelOntwerp!.sokkel?.hoogte || 30 };
    return;
  }
  verfGevel(plan, kwast, d.bereik, { sleutel: d.sleutel, kant, niveau: d.niveau });
  volgStandaard(plan);
}
/** Codes van de vormen die een klik zou verven (voor de markering). */
function getroffen(g: Gevel, d: Doel): Set<string> {
  if (d.soort === 'sokkel') return new Set(g.vlakken.filter((v) => v.sokkel).map((v) => v.code));
  const muren = g.vlakken.filter((v) => !v.sokkel);
  if (d.bereik === 'vlak') return new Set(muren.filter((v) => v.sleutel === d.sleutel).map((v) => v.code));
  if (d.bereik === 'verdieping') return new Set(muren.filter((v) => v.niveau === d.niveau).map((v) => v.code));
  return new Set(muren.map((v) => v.code));
}
function keuzeVan(plan: Plattegrond, d: Doel): GevelKeuze | undefined {
  const o = plan.gevelOntwerp ?? gevelOntwerpVan(plan);
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
  gevels = gevelAanzichten(plan, gevelInfo, planCatalogus);
  const vak = $('#gv-canvas');
  if (!gevels.length) {
    vak.replaceChildren(el('p', { class: 'klein' }, 'Teken eerst ruimtes; de gevels volgen vanzelf.'));
    $('#gv-kanten').replaceChildren();
    $('#gv-legende').replaceChildren();
    toonEigenschappen();
    return;
  }
  if (!kant || !gevels.some((g) => g.kant === kant)) kant = (gevels.find((g) => g.naam.startsWith('Voorgevel')) ?? gevels[0]!).kant;
  const g = gevels.find((x) => x.kant === kant)!;

  // Tabs per gevel.
  $('#gv-kanten').replaceChildren(...gevels.map((x) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(x.kant === kant), title: x.naam }, x.naam.replace(/ \(.*\)$/, '') + ` · ${KANT_NAAM[x.kant]}`);
    b.addEventListener('click', () => { kant = x.kant; gekozen = undefined; zoom?.passendMaken(); toonGevelEditor(); });
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
    if (gekozen) markeer(g.tekening.vormen.filter((v) => v.code === `kader.${gekozen}`).map((v) => v.code), 'gv-gekozen');
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
  for (const v of opp.filter((x) => x.kant === g.kant)) {
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
    if (x.prijs) li.append(el('span', { class: 'klein intern' }, ` · ${eur(x.prijs * x.m2)}`));
    lijst.append(li);
  }
  $('#gv-legende').replaceChildren(
    el('p', { class: 'klein' }, `Deze gevel (netto, zonder ramen en deuren):`),
    lijst,
    el('p', { class: 'klein' }, `Hele woning: ${getal(totaal, 1)} m² gevel. ${toestand().meta.regels.gevel ? 'Staat in de offerte (groep Gevel).' : 'Zet "Gevelafwerking" aan in de offerte om ze mee te rekenen.'}`),
  );
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

function toonPalet() {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gv-gereedschap]')) b.setAttribute('aria-pressed', String(b.dataset.gvGereedschap === gereedschap));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-gv-bereik]')) b.setAttribute('aria-pressed', String(b.dataset.gvBereik === bereik));
  $('#gv-hint').textContent = GEREEDSCHAP.find((g) => g.code === gereedschap)?.hint ?? '';
  const verven = gereedschap === 'verf' || gereedschap === 'pipet';
  $('#gv-bereik').hidden = gereedschap !== 'verf';
  $('#gv-materialen').hidden = !verven;

  const groepen = [...new Set(Object.values(gevelCatalogus).map((m) => m.groep))];
  const mat = gevelCatalogus[kwast.materiaal]!;
  const vak = $('#gv-materialen');
  vak.replaceChildren(...groepen.map((groep) => {
    const d = el('div', { class: 'gv-groep' });
    d.append(el('p', { class: 'klein' }, groep));
    const rij = el('div', { class: 'gv-tegels' });
    for (const [code, m] of Object.entries(gevelCatalogus).filter(([, m]) => m.groep === groep)) {
      const kleur = code === kwast.materiaal ? (m.kleuren[kwast.kleur] ?? Object.values(m.kleuren)[0]!) : Object.values(m.kleuren)[0]!;
      const voeg = m.voegen ? (code === kwast.materiaal ? m.voegen[kwast.voeg ?? ''] : undefined) ?? Object.values(m.voegen)[0] : undefined;
      const b = el('button', { type: 'button', class: 'gv-tegel', 'aria-pressed': String(code === kwast.materiaal), title: m.uitleg ?? m.label });
      const s = el('span', { class: 'gv-staal' });
      s.innerHTML = staalSvg(m.soort, kleur.hex, lijnVan(m.soort, kleur.hex, voeg?.hex));
      const tekst = el('span', { class: 'gv-naam' });
      tekst.append(el('span', {}, m.label), el('span', { class: 'klein intern' }, `${eur(m.prijs)}/m²`));
      b.append(s, tekst);
      b.addEventListener('click', () => {
        const k = Object.keys(m.kleuren);
        kwast = { materiaal: code, kleur: k.includes(kwast.kleur) ? kwast.kleur : k[0]!, voeg: m.voegen ? (kwast.voeg && m.voegen[kwast.voeg] ? kwast.voeg : Object.keys(m.voegen)[0]) : undefined };
        if (gereedschap !== 'verf') kiesGereedschap('verf'); else toonPalet();
      });
      rij.append(b);
    }
    d.append(rij);
    return d;
  }));
  // Kleurstalen van het gekozen materiaal (en voegen bij metselwerk).
  const stalen = (titel: string, lijst: Record<string, { label: string; hex: string }>, waarde: string | undefined, kies: (k: string) => void) => {
    const d = el('div', { class: 'gv-stalen' });
    d.append(el('p', { class: 'klein' }, titel));
    const rij = el('div', { class: 'gv-rij', role: 'group', 'aria-label': titel });
    for (const [k, x] of Object.entries(lijst)) {
      const b = el('button', { type: 'button', class: 'gv-kleur', 'aria-pressed': String(k === waarde), title: x.label, 'aria-label': x.label });
      b.style.background = x.hex;
      b.addEventListener('click', () => { kies(k); toonPalet(); });
      rij.append(b);
    }
    d.append(rij, el('p', { class: 'klein gv-kleurnaam' }, lijst[waarde ?? '']?.label ?? ''));
    return d;
  };
  vak.append(stalen(`Kleur · ${mat.label}`, mat.kleuren, kwast.kleur, (k) => { kwast = { ...kwast, kleur: k }; }));
  if (mat.voegen) vak.append(stalen('Voeg', mat.voegen, kwast.voeg, (k) => { kwast = { ...kwast, voeg: k }; }));

  // Sokkel.
  const plan = toestand().plan;
  const sokkel = plan.gevelOntwerp?.sokkel;
  const sk = $('#gv-sokkel');
  sk.replaceChildren(el('p', { class: 'klein' }, 'Sokkel (plint onderaan het gelijkvloers)'));
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
    sk.append(el('p', { class: 'klein' }, `Nu: ${m?.label ?? sokkel.materiaal}, ${(m?.kleuren[sokkel.kleur]?.label ?? sokkel.kleur).toLowerCase()}. Klik met het verfgereedschap op de sokkel om hem in het gekozen materiaal te zetten.`));
  }
}

function kiesGereedschap(g: Gereedschap) {
  gereedschap = g;
  onderMuis = undefined;
  if (g !== 'ramen') sleep = undefined;
  toonPalet();
  toonGevelEditor();
}

// ---------- eigenschappen ----------
function toonEigenschappen() {
  const vak = $('#gv-eigenschappen');
  vak.replaceChildren();
  const plan = toestand().plan;
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
  vak.append(el('h3', {}, 'Gevel ontwerpen'));
  if (m) {
    const kleur = m.kleuren[kwast.kleur]?.label ?? kwast.kleur;
    vak.append(el('p', {}, `Kwast: ${m.label}, ${kleur.toLowerCase()}${m.voegen && kwast.voeg ? `, voeg ${(m.voegen[kwast.voeg]?.label ?? '').toLowerCase()}` : ''}.`));
    if (m.uitleg) vak.append(el('p', { class: 'klein' }, m.uitleg));
  }
  vak.append(el('p', { class: 'klein' }, 'Tip: Ctrl+Z maakt ongedaan. In 3D en in de offerte zie je het resultaat meteen. Kleuren en prijzen zijn voorbeelden.'));
  const b = el('button', { type: 'button', class: 'tweede' }, 'Bekijk in 3D');
  b.addEventListener('click', () => terug?.naar3D());
  vak.append(b);
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
const openingVanCode = (code?: string) => (code ? /^(?:kader|vak|label|kast)\.([^.]+)/.exec(code)?.[1] : undefined);

function naDown(ev: PointerEvent) {
  if (ev.button !== 0 || zoom?.bezig) return;
  const code = codeOnder(ev);
  const houder = $('#gv-canvas');
  const g = gevels.find((x) => x.kant === kant);
  if (!g) return;
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
  const doel = code ? doelVan(code, ev.shiftKey) : undefined;
  if (doel && (gereedschap === 'pipet' || (gereedschap === 'verf' && ev.altKey))) {
    const k = keuzeVan(toestand().plan, doel);
    if (k) kwast = { ...k };
    kiesGereedschap('verf');
    return;
  }
  if (doel && gereedschap === 'verf') {
    wijzig('plan', (t) => { metOntwerp(t); verf(t.plan, doel); });
    return;
  }
  if (doel && doel.soort === 'vlak' && gereedschap === 'raam') {
    const v = g.vlakken.find((x) => x.code === code)!;
    const id = terug?.voegRaamToe(v.niveau, v.muur, Math.round(g.vanU(punt(ev).x)));
    if (id) { gekozen = id; kiesGereedschap('ramen'); }
    return;
  }
  // Leeg stuk: slepen verschuift het beeld, een klik deselecteert.
  pannen = { x: ev.clientX, y: ev.clientY, bewogen: false };
  zoom?.startPan(ev);
  houder.setPointerCapture(ev.pointerId);
}

function naMove(ev: PointerEvent) {
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
  const nieuw = code && gevels.find((x) => x.kant === kant)?.vlakken.some((v) => v.code === code) ? { code, shift: ev.shiftKey } : undefined;
  if (nieuw?.code !== onderMuis?.code || nieuw?.shift !== onderMuis?.shift) {
    onderMuis = nieuw;
    if (gereedschap !== 'ramen') toonGevelEditor();
  }
}

function naUp(ev: PointerEvent) {
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
  if (ev.key === 'Escape') { gekozen = undefined; kiesGereedschap('verf'); return true; }
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
  toonPalet();
  toonGevelEditor();
}

export function startGevels(nav: NonNullable<typeof terug>) {
  terug = nav;
  $('#gv-gereedschap').replaceChildren(...GEREEDSCHAP.map((g) => {
    const b = el('button', { type: 'button', 'data-gv-gereedschap': g.code, 'aria-pressed': String(g.code === gereedschap) });
    b.append(el('span', {}, g.label), el('kbd', {}, g.toets));
    b.addEventListener('click', () => kiesGereedschap(g.code));
    return b;
  }));
  $('#gv-bereik').replaceChildren(...BEREIK.map((x) => {
    const b = el('button', { type: 'button', 'data-gv-bereik': x.code, 'aria-pressed': String(x.code === bereik) }, x.label);
    b.addEventListener('click', () => { bereik = x.code; toonPalet(); });
    return b;
  }));
  const houder = $('#gv-canvas');
  zoom = new Zoom({
    doel: houder,
    svg: () => houder.querySelector('svg'),
    passend: () => passend,
    opnieuw: toonGevelEditor,
    minBreedte: 80,
    opKnijpen: () => { sleep = undefined; pannen = undefined; },
  });
  const vlak = document.createElement('div');
  vlak.className = 'zoomvlak';
  houder.before(vlak);
  vlak.append(houder, zoom.knoppen({ grootScherm: $('#view-plan') }));
  houder.addEventListener('pointerdown', naDown);
  houder.addEventListener('pointermove', naMove);
  houder.addEventListener('pointerup', naUp);
  houder.addEventListener('pointerleave', () => { if (onderMuis) { onderMuis = undefined; toonGevelEditor(); } });
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
