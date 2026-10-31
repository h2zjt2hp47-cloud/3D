/**
 * Vrije zetelontwerper: elementen tekenen, verslepen, vergroten en draaien
 * op een bovenaanzicht in cm. Prijs, stof en meldingen rekenen live mee.
 */
import {
  berekenOntwerp,
  bouw3D,
  tekenSvg,
  tekenVooraanzicht,
  voetafdruk,
  type ElementType,
  type OptieGroep,
  type OptieKeuze,
  type Ontwerp,
  type OntwerpElement,
  type OntwerpResultaat,
  type Rotatie,
} from '../../core/src/index.js';
import { startOntwerpen, zetelCatalogus } from '../../core/voorbeelden/vrij-ontwerp.js';
import { maak3D, type Viewer3D } from './drie-d.js';
import { $, bevestigKnop, bewaar, el, eur, getal, getKorting, getMaterialen, kopieer, laad, opWijziging, svgEl } from './staat.js';

const SLEUTEL = 'configurator-demo.ontwerp.v1';
const MAGNEET = 6; // cm
const typen = new Map(zetelCatalogus.typen.map((t) => [t.code, t]));

let ontwerp: Ontwerp = laadOntwerp();
let geselecteerd: string | null = null;
let gereedschap: string = 'selecteren'; // of een elementtype
let resultaat: OntwerpResultaat;
let weergave: 'boven' | 'voor' | '3d' = 'boven';
let viewer: Viewer3D | null | undefined;
const geschiedenis: string[] = [];
let volgendeId = 1;

type Actie =
  | { soort: 'slepen'; id: string; dx: number; dy: number; voor: string }
  | { soort: 'vergroten'; id: string; voor: string }
  | { soort: 'tekenen'; type: string; x0: number; y0: number; x1: number; y1: number }
  | null;
let actie: Actie = null;
let kijkvak = { x: -40, y: -40, b: 480, h: 360 };

function laadOntwerp(): Ontwerp {
  try {
    const o = JSON.parse(laad(SLEUTEL) ?? '') as Ontwerp;
    if (o && Array.isArray(o.elementen) && typeof o.hoofdmateriaal === 'string') return o;
  } catch {
    /* geen opgeslagen ontwerp */
  }
  return structuredClone(startOntwerpen.hoek!.ontwerp);
}

function nieuwId() {
  const bestaand = new Set(ontwerp.elementen.map((e) => e.id));
  while (bestaand.has(`e${volgendeId}`)) volgendeId++;
  return `e${volgendeId++}`;
}

/** Bewaar de toestand vóór een wijziging, voor "ongedaan maken". */
function onthoud(voor = JSON.stringify(ontwerp)) {
  if (geschiedenis[geschiedenis.length - 1] !== voor) geschiedenis.push(voor);
  if (geschiedenis.length > 60) geschiedenis.shift();
  $<HTMLButtonElement>('#o-ongedaan').disabled = geschiedenis.length === 0;
}

function gewijzigd() {
  bewaar(SLEUTEL, JSON.stringify(ontwerp));
  herbereken();
}

const klem = (w: number, min: number, max: number) => Math.min(max, Math.max(min, w));
const elementVan = (id: string | null) => ontwerp.elementen.find((e) => e.id === id);

// ---------- magneet: randen van andere elementen aantrekken ----------
function magneet(e: OntwerpElement, x: number, y: number) {
  const p = { ...voetafdruk({ ...e, x, y }) };
  let besteX: number | null = null, besteY: number | null = null;
  let dX = MAGNEET + 1, dY = MAGNEET + 1;
  for (const o of ontwerp.elementen) {
    if (o.id === e.id) continue;
    const q = voetafdruk(o);
    for (const [mijn, doel] of [[p.x, q.x + q.b], [p.x + p.b, q.x], [p.x, q.x], [p.x + p.b, q.x + q.b]] as const) {
      const d = Math.abs(mijn - doel);
      if (d < dX) { dX = d; besteX = x + (doel - mijn); }
    }
    for (const [mijn, doel] of [[p.y, q.y + q.h], [p.y + p.h, q.y], [p.y, q.y], [p.y + p.h, q.y + q.h]] as const) {
      const d = Math.abs(mijn - doel);
      if (d < dY) { dY = d; besteY = y + (doel - mijn); }
    }
  }
  return { x: besteX ?? x, y: besteY ?? y };
}

// ---------- tekenvlak ----------
const svg = () => $<SVGSVGElement>('#o-canvas');

function punt(ev: PointerEvent) {
  const s = svg();
  const m = s.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

function pasKijkvakAan() {
  const afdrukken = ontwerp.elementen.map(voetafdruk);
  const x0 = Math.min(0, ...afdrukken.map((p) => p.x));
  const y0 = Math.min(0, ...afdrukken.map((p) => p.y));
  const x1 = Math.max(400, ...afdrukken.map((p) => p.x + p.b));
  const y1 = Math.max(280, ...afdrukken.map((p) => p.y + p.h));
  kijkvak = { x: x0 - 50, y: y0 - 50, b: x1 - x0 + 110, h: y1 - y0 + 100 };
}

function tekenCanvas() {
  const s = svg();
  if (!actie) pasKijkvakAan();
  s.setAttribute('viewBox', `${kijkvak.x} ${kijkvak.y} ${kijkvak.b} ${kijkvak.h}`);
  s.replaceChildren();

  const defs = svgEl('defs');
  const klein = svgEl('pattern', { id: 'raster10', width: 10, height: 10, patternUnits: 'userSpaceOnUse' });
  klein.append(svgEl('path', { d: 'M 10 0 L 0 0 0 10', fill: 'none', class: 'raster-klein' }));
  const groot = svgEl('pattern', { id: 'raster50', width: 50, height: 50, patternUnits: 'userSpaceOnUse' });
  groot.append(svgEl('rect', { width: 50, height: 50, fill: 'url(#raster10)' }), svgEl('path', { d: 'M 50 0 L 0 0 0 50', fill: 'none', class: 'raster-groot' }));
  defs.append(klein, groot);
  s.append(defs);
  s.append(svgEl('rect', { x: kijkvak.x, y: kijkvak.y, width: kijkvak.b, height: kijkvak.h, fill: 'url(#raster50)', class: 'achtergrond', 'data-rol': 'achtergrond' }));

  const foutIds = new Set(resultaat.meldingen.filter((m) => m.elementId && m.ernst === 'fout').map((m) => m.elementId));
  const letOpIds = new Set(resultaat.meldingen.filter((m) => m.elementId && m.ernst === 'waarschuwing').map((m) => m.elementId));

  ontwerp.elementen.forEach((e, n) => {
    const g = svgEl('g', { class: 'element', 'data-id': e.id });
    for (const v of resultaat.tekening.vormen.filter((v) => v.code.startsWith(`${e.id}.`))) {
      g.append(svgEl('rect', { x: v.x, y: v.y, width: v.breedte, height: v.hoogte, rx: v.afronding ?? 0, fill: v.vulling ?? 'none', class: 'vorm' }));
    }
    const p = voetafdruk(e);
    const klasse = ['raak', foutIds.has(e.id) ? 'fout' : letOpIds.has(e.id) ? 'let-op' : '', e.id === geselecteerd ? 'geselecteerd' : ''].join(' ');
    g.append(svgEl('rect', { x: p.x, y: p.y, width: p.b, height: p.h, class: klasse, 'data-rol': 'element', 'data-id': e.id }));
    const nr = svgEl('text', { x: p.x + p.b / 2, y: p.y + p.h / 2, class: 'nummer', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    nr.textContent = String(n + 1);
    g.append(nr);
    s.append(g);
  });

  // Vergroot-greep op het geselecteerde element.
  const sel = elementVan(geselecteerd);
  if (sel) {
    const p = voetafdruk(sel);
    s.append(svgEl('rect', { x: p.x + p.b - 5, y: p.y + p.h - 5, width: 10, height: 10, class: 'greep', 'data-rol': 'greep', 'data-id': sel.id }));
    const maat = svgEl('text', { x: p.x + p.b / 2, y: p.y + p.h + 12, class: 'elementmaat', 'text-anchor': 'middle' });
    maat.textContent = `${getal(sel.breedte, 1)} × ${getal(sel.diepte, 1)}`;
    s.append(maat);
  }

  // Rechthoek die getekend wordt.
  if (actie?.soort === 'tekenen') {
    const x = Math.min(actie.x0, actie.x1), y = Math.min(actie.y0, actie.y1);
    const b = Math.abs(actie.x1 - actie.x0), h = Math.abs(actie.y1 - actie.y0);
    s.append(svgEl('rect', { x, y, width: b, height: h, class: 'tekenkader' }));
    const t = svgEl('text', { x: x + b / 2, y: y - 6, class: 'elementmaat', 'text-anchor': 'middle' });
    t.textContent = `${Math.round(b)} × ${Math.round(h)} cm`;
    s.append(t);
  }

  // Totale maten.
  if (ontwerp.elementen.length) {
    const a = resultaat.afmetingen;
    tekenMaatlijn(s, a.x, a.y - 18, a.x + a.breedte, a.y - 18, `${getal(a.breedte, 1)} cm`, false);
    tekenMaatlijn(s, a.x + a.breedte + 18, a.y, a.x + a.breedte + 18, a.y + a.diepte, `${getal(a.diepte, 1)} cm`, true);
  }
}

function tekenMaatlijn(s: SVGSVGElement, x1: number, y1: number, x2: number, y2: number, tekst: string, verticaal: boolean) {
  const g = svgEl('g', { class: 'maatlijn' });
  g.append(svgEl('line', { x1, y1, x2, y2 }));
  for (const [x, y] of [[x1, y1], [x2, y2]] as const) g.append(svgEl('line', verticaal ? { x1: x - 4, y1: y, x2: x + 4, y2: y } : { x1: x, y1: y - 4, x2: x, y2: y + 4 }));
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const t = svgEl('text', { x: verticaal ? mx + 6 : mx, y: verticaal ? my : my - 5, 'text-anchor': verticaal ? 'start' : 'middle', 'dominant-baseline': verticaal ? 'central' : 'auto' });
  t.textContent = tekst;
  g.append(t);
  s.append(g);
}

function nieuwElementUitKader(type: ElementType, x: number, y: number, b: number, h: number): OntwerpElement {
  const klik = b < 8 && h < 8;
  if (klik) {
    const br = type.breedte.standaard, di = type.diepte.standaard;
    return { id: nieuwId(), type: type.code, x: Math.round(x - br / 2), y: Math.round(y - di / 2), breedte: br, diepte: di, rotatie: 0 };
  }
  // Kies de draaiing die het best bij de getekende rechthoek past.
  const afwijking = (br: number, di: number) =>
    Math.abs(klem(br, type.breedte.min, type.breedte.max) - br) + Math.abs(klem(di, type.diepte.min, type.diepte.max) - di);
  const rechtop = afwijking(b, h) <= afwijking(h, b);
  const br = Math.round(klem(rechtop ? b : h, type.breedte.min, type.breedte.max));
  const di = Math.round(klem(rechtop ? h : b, type.diepte.min, type.diepte.max));
  return { id: nieuwId(), type: type.code, x: Math.round(x), y: Math.round(y), breedte: br, diepte: di, rotatie: rechtop ? 0 : 90 };
}

function opPointerDown(ev: PointerEvent) {
  if (ev.button !== 0) return;
  const doel = ev.target as SVGElement;
  const rol = doel.getAttribute('data-rol');
  const p = punt(ev);
  svg().focus({ preventScroll: true });

  if (rol === 'greep') {
    actie = { soort: 'vergroten', id: doel.getAttribute('data-id')!, voor: JSON.stringify(ontwerp) };
  } else if (rol === 'element' && gereedschap === 'selecteren') {
    const e = elementVan(doel.getAttribute('data-id'))!;
    geselecteerd = e.id;
    actie = { soort: 'slepen', id: e.id, dx: p.x - e.x, dy: p.y - e.y, voor: JSON.stringify(ontwerp) };
    toonEigenschappen();
  } else if (gereedschap !== 'selecteren') {
    actie = { soort: 'tekenen', type: gereedschap, x0: Math.round(p.x), y0: Math.round(p.y), x1: Math.round(p.x), y1: Math.round(p.y) };
  } else {
    geselecteerd = null;
    toonEigenschappen();
  }
  svg().setPointerCapture(ev.pointerId);
  tekenCanvas();
}

function opPointerMove(ev: PointerEvent) {
  if (!actie) return;
  const p = punt(ev);
  if (actie.soort === 'slepen') {
    const e = elementVan(actie.id)!;
    const m = ev.altKey ? { x: Math.round(p.x - actie.dx), y: Math.round(p.y - actie.dy) } : magneet(e, Math.round(p.x - actie.dx), Math.round(p.y - actie.dy));
    e.x = m.x;
    e.y = m.y;
  } else if (actie.soort === 'vergroten') {
    const e = elementVan(actie.id)!;
    const t = typen.get(e.type)!;
    const b = Math.round(p.x - e.x), h = Math.round(p.y - e.y);
    const liggend = e.rotatie === 0 || e.rotatie === 180;
    e.breedte = klem(liggend ? b : h, t.breedte.min, t.breedte.max);
    e.diepte = klem(liggend ? h : b, t.diepte.min, t.diepte.max);
  } else {
    actie.x1 = Math.round(p.x);
    actie.y1 = Math.round(p.y);
  }
  herbereken(false);
}

function opPointerUp() {
  if (!actie) return;
  const a = actie;
  actie = null;
  if (a.soort === 'tekenen') {
    const t = typen.get(a.type)!;
    const x = Math.min(a.x0, a.x1), y = Math.min(a.y0, a.y1);
    const e = nieuwElementUitKader(t, x, y, Math.abs(a.x1 - a.x0), Math.abs(a.y1 - a.y0));
    const m = magneet(e, e.x, e.y);
    e.x = m.x;
    e.y = m.y;
    onthoud();
    ontwerp.elementen.push(e);
    geselecteerd = e.id;
  } else if (JSON.stringify(ontwerp) !== a.voor) {
    onthoud(a.voor);
  }
  toonEigenschappen();
  gewijzigd();
}

function opToets(ev: KeyboardEvent) {
  const e = elementVan(geselecteerd);
  if (ev.key === 'Escape') {
    kiesGereedschap('selecteren');
    geselecteerd = null;
    toonEigenschappen();
    tekenCanvas();
    return;
  }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
    ev.preventDefault();
    ongedaan();
    return;
  }
  if (!e) return;
  const stap = ev.shiftKey ? 10 : 1;
  const pijl: Record<string, [number, number]> = { ArrowLeft: [-stap, 0], ArrowRight: [stap, 0], ArrowUp: [0, -stap], ArrowDown: [0, stap] };
  if (pijl[ev.key]) {
    ev.preventDefault();
    onthoud();
    e.x += pijl[ev.key]![0];
    e.y += pijl[ev.key]![1];
    gewijzigd();
  } else if (ev.key === 'Delete' || ev.key === 'Backspace') {
    ev.preventDefault();
    verwijder(e.id);
  } else if (ev.key.toLowerCase() === 'r') {
    draai(e.id, ev.shiftKey ? -90 : 90);
  } else if (ev.key.toLowerCase() === 'd') {
    dupliceer(e.id);
  }
}

// ---------- acties ----------
function draai(id: string, graden: 90 | -90) {
  const e = elementVan(id);
  if (!e) return;
  onthoud();
  const voor = voetafdruk(e);
  e.rotatie = (((e.rotatie + graden) % 360) + 360) % 360 as Rotatie;
  const na = voetafdruk(e);
  e.x = Math.round(voor.x + (voor.b - na.b) / 2);
  e.y = Math.round(voor.y + (voor.h - na.h) / 2);
  toonEigenschappen();
  gewijzigd();
}
function verwijder(id: string) {
  onthoud();
  ontwerp.elementen = ontwerp.elementen.filter((e) => e.id !== id);
  geselecteerd = null;
  toonEigenschappen();
  gewijzigd();
}
function dupliceer(id: string) {
  const e = elementVan(id);
  if (!e) return;
  onthoud();
  const p = voetafdruk(e);
  const kopie = { ...e, id: nieuwId(), x: e.x + p.b };
  const m = magneet(kopie, kopie.x, kopie.y);
  Object.assign(kopie, m);
  ontwerp.elementen.push(kopie);
  geselecteerd = kopie.id;
  toonEigenschappen();
  gewijzigd();
}
function ongedaan() {
  const vorige = geschiedenis.pop();
  if (!vorige) return;
  ontwerp = JSON.parse(vorige) as Ontwerp;
  if (!elementVan(geselecteerd)) geselecteerd = null;
  toonAanpassingen();
  $<HTMLButtonElement>('#o-ongedaan').disabled = geschiedenis.length === 0;
  vulHoofdmateriaal();
  toonEigenschappen();
  gewijzigd();
}
function kiesGereedschap(code: string) {
  gereedschap = code;
  document.querySelectorAll<HTMLButtonElement>('[data-gereedschap]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gereedschap === code)));
  svg().classList.toggle('tekenmodus', code !== 'selecteren');
  const t = typen.get(code);
  $('#o-hint').textContent = t
    ? `Sleep op het tekenvlak om een ${t.label.toLowerCase()} te tekenen (${t.breedte.min}–${t.breedte.max} × ${t.diepte.min}–${t.diepte.max} cm), of klik voor de standaardmaat. Esc stopt.`
    : 'Sleep elementen om ze te verplaatsen; ze klikken vast aan elkaar (Alt = zonder magneet). Sleep het hoekje rechtsonder om te vergroten.';
}

// ---------- aanpassingen (opties) ----------
function meerprijs(g: OptieGroep, k: OptieKeuze): string {
  const delen: string[] = [];
  const teken = (x: number) => (x < 0 ? '−' : '+');
  if (k.prijs) delen.push(`${teken(k.prijs)}€${getal(Math.abs(k.prijs), 0)}${g.perElement || g.niveau === 'element' ? '' : ''}`);
  if (k.prijsPerM) delen.push(`${teken(k.prijsPerM)}€${getal(Math.abs(k.prijsPerM), 0)}/m`);
  if (k.pct) delen.push(`${teken(k.pct)}${getal(Math.abs(k.pct), 0)}%`);
  return delen.join(' ');
}

function optieGroepVeld(g: OptieGroep, huidig: string, idVoorvoegsel: string, kies: (code: string) => void): HTMLElement {
  const fs = el('fieldset', { class: 'optiegroep', 'data-groep': g.code });
  const legende = el('legend', {}, g.label + (g.perElement ? ' (per element)' : ''));
  fs.append(legende);
  const chips = el('div', { class: 'chips' });
  for (const k of g.keuzes) {
    const id = `${idVoorvoegsel}-${g.code}-${k.code}`;
    const chip = el('label', { class: 'chip', for: id, title: k.uitleg ?? '' });
    const r = el('input', { type: 'radio', name: `${idVoorvoegsel}-${g.code}`, id, value: k.code }) as HTMLInputElement;
    r.checked = k.code === huidig;
    r.addEventListener('change', () => kies(k.code));
    chip.append(r);
    const kleur = k.teken?.kleur;
    if (typeof kleur === 'string') {
      const bol = el('span', { class: 'bol', 'aria-hidden': 'true' });
      bol.style.background = kleur;
      chip.append(bol);
    }
    chip.append(el('span', {}, k.label));
    const mp = meerprijs(g, k);
    if (mp) chip.append(el('span', { class: 'meer' }, mp));
    chips.append(chip);
  }
  fs.append(chips);
  return fs;
}

function toonAanpassingen() {
  const vak = $('#o-aanpassingen');
  vak.replaceChildren(
    ...(zetelCatalogus.opties ?? [])
      .filter((g) => g.niveau === 'ontwerp')
      .map((g) =>
        optieGroepVeld(g, ontwerp.opties?.[g.code] ?? g.standaard, 'oz', (code) => {
          onthoud();
          ontwerp.opties = { ...(ontwerp.opties ?? {}), [g.code]: code };
          gewijzigd();
        }),
      ),
  );
}

/** Markeer optiegroepen met een foutieve combinatie. */
function markeerOptieFouten() {
  const fout = new Set(resultaat.meldingen.filter((m) => m.code.startsWith('optie.')).map((m) => m.code.split('.')[1]));
  document.querySelectorAll<HTMLElement>('.optiegroep').forEach((f) => f.classList.toggle('fout', fout.has(f.dataset.groep ?? '')));
}

// ---------- weergave: bovenaanzicht, vooraanzicht, 3D ----------
function kiesWeergave(w: typeof weergave) {
  weergave = w;
  document.querySelectorAll<HTMLButtonElement>('[data-o-weergave]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.oWeergave === w)));
  svg().toggleAttribute('hidden', w !== 'boven');
  $('#o-voor').hidden = w !== 'voor';
  $('#o-3d').hidden = w !== '3d';
  $('#o-3d-knoppen').hidden = w !== '3d';
  $('#o-weergave-uitleg').textContent = w === 'boven' ? 'raster 10 cm · maten in cm' : w === 'voor' ? 'poten, zithoogte, rug en armen · maten in cm' : 'draai en zoom met muis of vinger';
  if (w === '3d' && viewer === undefined) viewer = maak3D($('#o-3d'));
  toonWeergave();
}

function toonWeergave() {
  if (weergave === 'voor') {
    $('#o-voor').innerHTML = ontwerp.elementen.length
      ? tekenSvg(tekenVooraanzicht(ontwerp, zetelCatalogus, getMaterialen()), { breedtePx: 720, lijnkleur: '#2b2b28', maatkleur: '#3f5a52' })
      : '<p class="klein">Nog geen elementen.</p>';
  }
  if (weergave === '3d' && viewer) {
    viewer.formaat();
    viewer.toon(bouw3D(ontwerp, zetelCatalogus, getMaterialen()));
  }
}

// ---------- panelen ----------
function materiaalOpties(select: HTMLSelectElement, gekozen: string | undefined, metHoofd: boolean) {
  select.replaceChildren();
  if (metHoofd) select.append(el('option', { value: '' }, 'Zelfde als hoofdmateriaal'));
  for (const m of getMaterialen()) {
    const o = el('option', { value: m.code }, `${m.naam} (groep ${m.groep})`);
    if (m.code === gekozen) o.selected = true;
    select.append(o);
  }
}

function vulHoofdmateriaal() {
  const s = $<HTMLSelectElement>('#o-hoofdmateriaal');
  if (!getMaterialen().some((m) => m.code === ontwerp.hoofdmateriaal)) ontwerp.hoofdmateriaal = getMaterialen()[0]?.code ?? '';
  materiaalOpties(s, ontwerp.hoofdmateriaal, false);
}

function toonEigenschappen() {
  const vak = $('#o-eigenschappen');
  const e = elementVan(geselecteerd);
  if (!e) {
    vak.replaceChildren(el('p', { class: 'klein' }, 'Klik op een element om het aan te passen, of kies links een element om te tekenen.'));
    return;
  }
  const t = typen.get(e.type)!;
  const n = ontwerp.elementen.indexOf(e) + 1;
  const er = resultaat?.elementen.find((x) => x.id === e.id);
  const kop = el('div', { class: 'kaartkop' });
  kop.append(el('h3', {}, `${n}. ${t.label}`), el('span', { class: 'klein' }, er ? eur(er.prijs * (1 - getKorting() / 100)) : ''));
  const rij = el('div', { class: 'maatrij' });
  for (const [veld, bereik, label] of [['breedte', t.breedte, 'Breedte'], ['diepte', t.diepte, 'Diepte']] as const) {
    const id = `o-${veld}`;
    const wrap = el('label', { for: id, class: 'maatveld' });
    const inp = el('input', { type: 'number', id, min: String(bereik.min), max: String(bereik.max), step: '1', value: String(e[veld]) }) as HTMLInputElement;
    inp.addEventListener('change', () => {
      const w = Number(inp.value);
      if (!Number.isFinite(w)) return;
      onthoud();
      e[veld] = Math.round(w);
      gewijzigd();
    });
    wrap.append(el('span', {}, `${label} (cm)`), inp, el('span', { class: 'klein' }, `${bereik.min}–${bereik.max}`));
    rij.append(wrap);
  }
  const matLabel = el('label', { for: 'o-elementmateriaal', class: 'maatveld breed' });
  const mat = el('select', { id: 'o-elementmateriaal' }) as HTMLSelectElement;
  materiaalOpties(mat, e.materiaal, true);
  mat.addEventListener('change', () => {
    onthoud();
    e.materiaal = mat.value || undefined;
    gewijzigd();
  });
  matLabel.append(el('span', {}, 'Materiaal'), mat);

  const knoppen = el('div', { class: 'knoppenrij' });
  const maak = (tekst: string, titel: string, f: () => void, klasse = 'tweede') => {
    const b = el('button', { type: 'button', class: klasse, title: titel }, tekst) as HTMLButtonElement;
    b.addEventListener('click', f);
    knoppen.append(b);
  };
  maak('↺ Draai links', 'Draai 90° tegen de klok in (Shift+R)', () => draai(e.id, -90));
  maak('↻ Draai rechts', 'Draai 90° met de klok mee (R)', () => draai(e.id, 90));
  maak('Dupliceer', 'Kopie ernaast plaatsen (D)', () => dupliceer(e.id));
  maak('Verwijder', 'Verwijderen (Delete)', () => verwijder(e.id), 'gevaar');
  const rugTekst = ['boven', 'rechts', 'onder', 'links'][e.rotatie / 90]!;
  const elementOpties = el('div', { class: 'aanpassingen' });
  for (const g of (zetelCatalogus.opties ?? []).filter((g) => g.niveau === 'element' && (!g.voorTypen || g.voorTypen.includes(e.type)))) {
    elementOpties.append(
      optieGroepVeld(g, e.opties?.[g.code] ?? g.standaard, `oe-${e.id}`, (code) => {
        onthoud();
        e.opties = { ...(e.opties ?? {}), [g.code]: code };
        gewijzigd();
      }),
    );
  }
  const delen: HTMLElement[] = [kop, rij];
  if (t.tekenstijl !== 'console') delen.push(matLabel);
  delen.push(el('p', { class: 'klein' }, t.tekenstijl === 'zit' || t.tekenstijl === 'hoek' ? `Rug aan de ${rugTekst}kant.` : t.tekenstijl === 'console' ? 'Houten tussenstuk in de gekozen houtafwerking.' : ''));
  if (elementOpties.childElementCount) delen.push(elementOpties);
  delen.push(knoppen);
  vak.replaceChildren(...delen);
}

function herbereken(alles = true) {
  resultaat = berekenOntwerp(ontwerp, zetelCatalogus, getMaterialen(), { kortingProcent: getKorting() });
  tekenCanvas();
  if (!alles) return;
  const r = resultaat;
  const status = $('#o-status');
  const fouten = r.meldingen.filter((m) => m.ernst === 'fout').length;
  status.textContent = r.geldig ? 'Klaar voor offerte' : `${fouten} ${fouten === 1 ? 'fout' : 'fouten'} op te lossen`;
  status.className = `status ${r.geldig ? 'ok' : 'fout'}`;
  $('#o-prijs-excl').textContent = eur(r.prijs.verkoopprijsExcl);
  $('#o-prijs-incl').textContent = `${eur(r.prijs.verkoopprijsIncl)} incl. ${zetelCatalogus.btwProcent}% btw`;
  const regels: [string, string][] = [];
  if (r.prijs.kortingProcent) {
    regels.push(['Brutoprijs', eur(r.prijs.brutoprijsExcl)]);
    regels.push([`Korting ${getal(r.prijs.kortingProcent)}%`, `− ${eur(r.prijs.brutoprijsExcl - r.prijs.verkoopprijsExcl)}`]);
  }
  const optiesTotaal = r.opties.reduce((t, o) => t + o.bedrag, 0);
  if (optiesTotaal) {
    regels.push(['Waarvan aanpassingen', eur(optiesTotaal)]);
    for (const o of r.opties.filter((o) => o.bedrag).sort((a, b) => Math.abs(b.bedrag) - Math.abs(a.bedrag)).slice(0, 6))
      regels.push([`  ${o.groepLabel}: ${o.keuzeLabel}`, `${o.bedrag < 0 ? '−' : '+'} ${eur(Math.abs(o.bedrag))}`]);
  }
  regels.push(['Kostprijs', eur(r.prijs.kostprijs)], ['Marge', r.prijs.margeProcent === null ? '—' : `${getal(r.prijs.margeProcent, 1)}%`]);
  regels.push(['Totale maat', `${getal(r.afmetingen.breedte, 1)} × ${getal(r.afmetingen.diepte, 1)} cm`]);
  for (const s of r.stof) regels.push([`Stof ${s.naam}`, `${getal(s.meters, 1)} m`]);
  $('#o-prijsdetail').replaceChildren(...regels.flatMap(([a, b]) => [el('dt', {}, a), el('dd', {}, b)]));
  const lijst = $('#o-meldingen');
  lijst.replaceChildren(...r.meldingen.map((m) => el('li', { class: m.ernst }, m.melding)));
  lijst.hidden = r.meldingen.length === 0;
  const tbody = $('#o-elementen tbody');
  const mats = new Map(getMaterialen().map((m) => [m.code, m]));
  tbody.replaceChildren(
    ...r.elementen.map((x, n) => {
      const tr = el('tr', { class: x.id === geselecteerd ? 'actief' : '' });
      tr.append(
        el('td', { class: 'num' }, String(n + 1)),
        el('td', {}, x.label),
        el('td', { class: 'num' }, `${getal(x.breedte, 1)} × ${getal(x.diepte, 1)}`),
        el('td', {}, `${mats.get(x.materiaal)?.naam ?? '—'} (${x.groep})`),
        el('td', { class: 'num' }, eur(x.prijs)),
      );
      tr.addEventListener('click', () => {
        geselecteerd = x.id;
        toonEigenschappen();
        herbereken();
      });
      return tr;
    }),
  );
  markeerOptieFouten();
  toonWeergave();
  if (geselecteerd) {
    const er = r.elementen.find((x) => x.id === geselecteerd);
    const prijsVak = document.querySelector('#o-eigenschappen .kaartkop .klein');
    if (er && prijsVak) prijsVak.textContent = eur(er.prijs * (1 - getKorting() / 100));
  }
}

export function startOntwerper() {
  // Gereedschap
  const balk = $('#o-gereedschap');
  const knop = (code: string, tekst: string) => {
    const b = el('button', { type: 'button', 'data-gereedschap': code, 'aria-pressed': 'false' }, tekst) as HTMLButtonElement;
    b.addEventListener('click', () => kiesGereedschap(code));
    balk.append(b);
  };
  knop('selecteren', 'Selecteren en verplaatsen');
  for (const t of zetelCatalogus.typen) knop(t.code, `+ ${t.label}`);

  // Startopstellingen
  const start = $('#o-start');
  for (const [code, s] of Object.entries(startOntwerpen)) {
    const b = el('button', { type: 'button', class: 'tweede' }, s.label) as HTMLButtonElement;
    b.addEventListener('click', () => {
      onthoud();
      ontwerp = structuredClone(s.ontwerp);
      geselecteerd = null;
      vulHoofdmateriaal();
      toonAanpassingen();
      toonEigenschappen();
      kiesGereedschap(code === 'leeg' ? 'zit' : 'selecteren');
      gewijzigd();
    });
    start.append(b);
  }

  document.querySelectorAll<HTMLButtonElement>('[data-o-weergave]').forEach((b) =>
    b.addEventListener('click', () => kiesWeergave(b.dataset.oWeergave as typeof weergave)),
  );
  document.querySelectorAll<HTMLButtonElement>('[data-standpunt]').forEach((b) =>
    b.addEventListener('click', () => viewer?.standpunt(b.dataset.standpunt as 'schuin' | 'voor' | 'boven' | 'zij')),
  );

  const hoofd = $<HTMLSelectElement>('#o-hoofdmateriaal');
  hoofd.addEventListener('change', () => {
    onthoud();
    ontwerp.hoofdmateriaal = hoofd.value;
    gewijzigd();
  });
  $('#o-ongedaan').addEventListener('click', ongedaan);
  bevestigKnop($<HTMLButtonElement>('#o-wis'), 'Klik nogmaals om alles te wissen', () => {
    onthoud();
    ontwerp.elementen = [];
    geselecteerd = null;
    toonEigenschappen();
    gewijzigd();
  });
  $('#o-kopieer').addEventListener('click', () => {
    const mats = new Map(getMaterialen().map((m) => [m.code, m]));
    const r = resultaat;
    const tekst = [
      `Zetel op maat (vrij ontwerp), totaal ${getal(r.afmetingen.breedte, 1)} × ${getal(r.afmetingen.diepte, 1)} cm`,
      ...r.elementen.map((x, n) => `- ${n + 1}. ${x.label} ${getal(x.breedte, 1)} × ${getal(x.diepte, 1)} cm${x.materiaal ? `, ${mats.get(x.materiaal)?.naam ?? ''}` : ''}`),
      ...(zetelCatalogus.opties ?? [])
        .filter((g) => g.niveau === 'ontwerp')
        .map((g) => `- ${g.label}: ${g.keuzes.find((k) => k.code === (ontwerp.opties?.[g.code] ?? g.standaard))?.label ?? ''}`),
      `Prijs: ${eur(r.prijs.verkoopprijsExcl)} excl. btw (${eur(r.prijs.verkoopprijsIncl)} incl. btw)`,
    ].join('\n');
    void kopieer(tekst, $('#o-kopieer-melding'));
  });

  const s = svg();
  s.addEventListener('pointerdown', opPointerDown);
  s.addEventListener('pointermove', opPointerMove);
  s.addEventListener('pointerup', opPointerUp);
  s.addEventListener('pointercancel', opPointerUp);
  s.addEventListener('keydown', opToets);

  opWijziging('materialen', () => {
    vulHoofdmateriaal();
    toonEigenschappen();
    herbereken();
  });
  opWijziging('korting', () => herbereken());

  vulHoofdmateriaal();
  toonAanpassingen();
  kiesGereedschap('selecteren');
  $<HTMLButtonElement>('#o-ongedaan').disabled = true;
  herbereken();
  toonEigenschappen();
}
