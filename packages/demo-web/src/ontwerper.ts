/**
 * Vrije zetelontwerper: elementen tekenen, verslepen, vergroten en draaien
 * op een bovenaanzicht in cm. Prijs, stof en meldingen rekenen live mee.
 */
import {
  berekenOntwerp,
  bouw3D,
  dragerVan,
  gekozenOpties,
  HOOGTE_BEREIK,
  hoogtesVan,
  lokaalNaarWereld,
  VORMGEVING_BEREIK,
  vormgevingVan,
  type Vormgeving,
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
import { startOntwerpen } from '../../core/voorbeelden/vrij-ontwerp.js';
import { maak3D, type Viewer3D } from './drie-d.js';
import { Zoom } from './zoom.js';
import { $, bevestigKnop, bewaar, el, eur, getal, getCatalogus, getKorting, getMaterialen, getModellen, kopieer, laad, opWijziging, svgEl } from './staat.js';

const SLEUTEL = 'configurator-demo.ontwerp.v1';
const MAGNEET = 6; // cm
/** Elementtypes uit de actuele (aanpasbare) catalogus. */
const typen = { get: (code: string) => getCatalogus().typen.find((t) => t.code === code) };

let ontwerp: Ontwerp = laadOntwerp();
let geselecteerd: string | null = null;
let gereedschap: string = 'selecteren'; // of een elementtype
let resultaat: OntwerpResultaat;
let weergave: 'boven' | 'voor' | '3d' = 'boven';
let viewer: Viewer3D | null | undefined;
const geschiedenis: string[] = [];
let volgendeId = 1;

type Actie =
  | { soort: 'slepen'; id: string; dx: number; dy: number; voor: string; kinderen: Kind[] }
  | { soort: 'vergroten'; id: string; voor: string }
  | { soort: 'tekenen'; type: string; x0: number; y0: number; x1: number; y1: number }
  | null;
let actie: Actie = null;

/** Rugleuningen en kussens die op een element liggen, met hun positie t.o.v. dat element (ze verhuizen mee). */
interface Kind { id: string; dx: number; dy: number }
function kinderenVan(e: OntwerpElement): Kind[] {
  if (typen.get(e.type)?.opzet) return [];
  return ontwerp.elementen
    .filter((o) => o !== e && typen.get(o.type)?.opzet && dragerVan(ontwerp, getCatalogus(), o)?.id === e.id)
    .map((o) => ({ id: o.id, dx: o.x - e.x, dy: o.y - e.y }));
}
function verhuisKinderen(e: OntwerpElement, kinderen: Kind[]) {
  for (const k of kinderen) {
    const o = elementVan(k.id);
    if (o) {
      o.x = e.x + k.dx;
      o.y = e.y + k.dy;
    }
  }
}
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
  const zelfOpzet = typen.get(e.type)?.opzet;
  for (const o of ontwerp.elementen) {
    if (o.id === e.id) continue;
    // Een basiselement trekt niet naar rugleuningen/kussens (die liggen erop of erop een ander).
    if (!zelfOpzet && typen.get(o.type)?.opzet) continue;
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

/** Passend beeld rond alle elementen (bovenaanzicht). */
function passendBoven() {
  const afdrukken = ontwerp.elementen.map(voetafdruk);
  const x0 = Math.min(0, ...afdrukken.map((p) => p.x));
  const y0 = Math.min(0, ...afdrukken.map((p) => p.y));
  const x1 = Math.max(400, ...afdrukken.map((p) => p.x + p.b));
  const y1 = Math.max(280, ...afdrukken.map((p) => p.y + p.h));
  return { x: x0 - 50, y: y0 - 50, b: x1 - x0 + 110, d: y1 - y0 + 100 };
}

let zoomBoven: Zoom | undefined;
let zoomVoor: Zoom | undefined;
/** Slepen op een leeg stuk verschuift het beeld. */
let pannen: { zoom: Zoom; bewogen: boolean } | undefined;

function selectieKader() {
  const e = elementVan(geselecteerd);
  if (!e) return undefined;
  const f = voetafdruk(e);
  return { x: f.x, y: f.y, b: f.b, d: f.h };
}

function tekenCanvas() {
  const s = svg();
  const k = zoomBoven ? zoomBoven.kijkvak() : passendBoven();
  kijkvak = { x: k.x, y: k.y, b: k.b, h: k.d };
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

  // Opzet-elementen (rugleuning, kussens) bovenop tekenen, zodat ze aanklikbaar blijven.
  const volgorde = ontwerp.elementen.map((e, n) => ({ e, n })).sort((a, b) => Number(typen.get(a.e.type)?.opzet ?? false) - Number(typen.get(b.e.type)?.opzet ?? false));
  volgorde.forEach(({ e, n }) => {
    const g = svgEl('g', { class: 'element', 'data-id': e.id });
    for (const v of resultaat.tekening.vormen.filter((v) => v.code.startsWith(`${e.id}.`))) {
      g.append(
        v.pad
          ? svgEl('path', { d: v.pad, fill: v.vulling ?? 'none', class: 'vorm' })
          : svgEl('rect', { x: v.x, y: v.y, width: v.breedte, height: v.hoogte, rx: v.afronding ?? 0, fill: v.vulling ?? 'none', class: 'vorm' }),
      );
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
  zoomBoven?.vastzetten();

  if (rol === 'greep') {
    actie = { soort: 'vergroten', id: doel.getAttribute('data-id')!, voor: JSON.stringify(ontwerp) };
  } else if (rol === 'element' && (gereedschap === 'selecteren' || !typen.get(gereedschap)?.opzet)) {
    // Op een bestaand element: selecteren en verplaatsen (ook als er nog een tekengereedschap actief is).
    // Rugleuningen en kussens teken je wel bewust bovenop een element.
    if (gereedschap !== 'selecteren') kiesGereedschap('selecteren');
    const e = elementVan(doel.getAttribute('data-id'))!;
    geselecteerd = e.id;
    actie = { soort: 'slepen', id: e.id, dx: p.x - e.x, dy: p.y - e.y, voor: JSON.stringify(ontwerp), kinderen: kinderenVan(e) };
    toonEigenschappen();
  } else if (gereedschap !== 'selecteren') {
    actie = { soort: 'tekenen', type: gereedschap, x0: Math.round(p.x), y0: Math.round(p.y), x1: Math.round(p.x), y1: Math.round(p.y) };
  } else {
    geselecteerd = null;
    toonEigenschappen();
    // Leeg stuk: slepen verschuift het beeld.
    if (zoomBoven) { pannen = { zoom: zoomBoven, bewogen: false }; zoomBoven.startPan(ev); }
  }
  svg().setPointerCapture(ev.pointerId);
  tekenCanvas();
}

function opPointerMove(ev: PointerEvent) {
  if (pannen) { pannen.bewogen = true; pannen.zoom.beweegPan(ev); return; }
  if (!actie) return;
  const p = punt(ev);
  if (actie.soort === 'slepen') {
    const e = elementVan(actie.id)!;
    const m = ev.altKey ? { x: Math.round(p.x - actie.dx), y: Math.round(p.y - actie.dy) } : magneet(e, Math.round(p.x - actie.dx), Math.round(p.y - actie.dy));
    e.x = m.x;
    e.y = m.y;
    verhuisKinderen(e, actie.kinderen);
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
  zoomBoven?.losmaken();
  if (pannen) { pannen.zoom.stopPan(); pannen = undefined; return; }
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
    // Na het plaatsen terug naar selecteren, zodat je het element meteen kunt verplaatsen.
    kiesGereedschap('selecteren');
  } else if (JSON.stringify(ontwerp) !== a.voor) {
    onthoud(a.voor);
  }
  toonEigenschappen();
  gewijzigd();
}

function opToets(ev: KeyboardEvent) {
  const z = ev.currentTarget === voorvlak() ? zoomVoor : zoomBoven;
  if (z?.toets(ev)) { ev.preventDefault(); return; }
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
  toonModelVormgeving();
  toonModelNaam();
  $<HTMLButtonElement>('#o-ongedaan').disabled = geschiedenis.length === 0;
  vulHoofdmateriaal();
  toonEigenschappen();
  gewijzigd();
}
function kiesGereedschap(code: string) {
  gereedschap = code;
  document.querySelectorAll<HTMLButtonElement>('[data-gereedschap]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gereedschap === code)));
  svg().classList.toggle('tekenmodus', code !== 'selecteren');
  voorvlak().classList.toggle('tekenmodus', code !== 'selecteren');
  const t = typen.get(code);
  $('#o-hint').textContent = weergave === 'voor'
    ? t
      ? `Sleep in het vooraanzicht een kader: de breedte wordt de breedte van de ${t.label.toLowerCase()}, de hoogte de rug- of armhoogte. Klik voor de standaardmaat. Esc stopt.`
      : 'Sleep een element om het zijwaarts te verplaatsen. Sleep de grepen: zijkant = breedte (de rest schuift mee), bovenkant = rug-, arm- of zithoogte, onderaan = poothoogte.'
    : t
      ? `Sleep op het tekenvlak om een ${t.label.toLowerCase()} te tekenen (${t.breedte.min}–${t.breedte.max} × ${t.diepte.min}–${t.diepte.max} cm), of klik voor de standaardmaat. Esc stopt.`
      : 'Sleep elementen om ze te verplaatsen (rugleuningen en kussens verhuizen mee); ze klikken vast aan elkaar (Alt = zonder magneet). Sleep het hoekje rechtsonder om te vergroten.';
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

// ---------- ontwerpmodus: vormgeving ----------
const VORM_LABELS: Record<keyof Vormgeving, string> = {
  rugdikte: 'Rugdikte (cm)',
  kussendikte: 'Kussendikte (cm)',
  zitkussens: 'Zitkussens per element',
  zachtheid: 'Zachtheid (0 = strak, 10 = heel zacht)',
  rugvorm: 'Rugvorm',
  houtframe: 'Houten frame',
  rughoogte: 'Rughoogte (cm)',
  armhoogte: 'Armhoogte (cm)',
  zithoogte: 'Zithoogte (cm)',
  poothoogte: 'Poothoogte (cm)',
};
const KEUZE_LABELS: Record<string, string> = {
  recht: 'Recht', hellend: 'Achterover hellend', rond: 'Afgerond',
  geen: 'Geen', zijkant: 'Zijkanten', rondom: 'Zijkanten + voorkant',
};

/**
 * Bedieningselementen voor de vormgeving. `huidig` is de volledige vormgeving,
 * `pas` past één waarde aan, `eigen` geeft aan welke velden afwijken (voor de markering).
 */
function vormgevingVelden(idVoorvoegsel: string, huidig: Vormgeving, eigen: Partial<Vormgeving>, pas: (veld: keyof Vormgeving, w: Vormgeving[keyof Vormgeving]) => void): HTMLElement {
  const raster = el('div', { class: 'vormraster' });
  for (const veld of Object.keys(VORMGEVING_BEREIK) as (keyof typeof VORMGEVING_BEREIK)[]) {
    const b = VORMGEVING_BEREIK[veld];
    const id = `${idVoorvoegsel}-${veld}`;
    const wrap = el('label', { for: id, class: `vormveld${veld in eigen ? ' afwijkend' : ''}` });
    const waarde = el('output', { for: id }, String(huidig[veld]));
    const schuif = el('input', { type: 'range', id, min: String(b.min), max: String(b.max), step: '1', value: String(huidig[veld]) }) as HTMLInputElement;
    schuif.addEventListener('input', () => {
      waarde.textContent = schuif.value;
      pas(veld, Number(schuif.value));
    });
    const kop = el('span', { class: 'vormkop' });
    kop.append(el('span', {}, VORM_LABELS[veld]), waarde);
    wrap.append(kop, schuif);
    raster.append(wrap);
  }
  for (const [veld, keuzes] of [['rugvorm', ['recht', 'hellend', 'rond']], ['houtframe', ['geen', 'zijkant', 'rondom']]] as const) {
    const fs = el('fieldset', { class: `optiegroep${veld in eigen ? ' afwijkend' : ''}` });
    fs.append(el('legend', {}, VORM_LABELS[veld]));
    const chips = el('div', { class: 'chips' });
    for (const k of keuzes) {
      const id = `${idVoorvoegsel}-${veld}-${k}`;
      const chip = el('label', { class: 'chip', for: id });
      const r = el('input', { type: 'radio', name: `${idVoorvoegsel}-${veld}`, id, value: k }) as HTMLInputElement;
      r.checked = huidig[veld] === k;
      r.addEventListener('change', () => pas(veld, k));
      chip.append(r, el('span', {}, KEUZE_LABELS[k] ?? k));
      chips.append(chip);
    }
    fs.append(chips);
    raster.append(fs);
  }
  return raster;
}

let vormTimer: number | undefined;
/** Schuifbalken: niet bij elke pixel een stap in "ongedaan maken". */
function vormWijziging(f: () => void) {
  if (vormTimer === undefined) onthoud();
  window.clearTimeout(vormTimer);
  vormTimer = window.setTimeout(() => (vormTimer = undefined), 600);
  f();
  gewijzigd();
}

function toonModelVormgeving() {
  const vak = $('#o-vormgeving');
  const delen: HTMLElement[] = [
    vormgevingVelden('ov', vormgevingVan(ontwerp), ontwerp.vormgeving ?? {}, (veld, w) =>
      vormWijziging(() => (ontwerp.vormgeving = { ...(ontwerp.vormgeving ?? {}), [veld]: w })),
    ),
  ];
  const vrij = (['zithoogte', 'poothoogte'] as const).filter((k) => ontwerp.vormgeving?.[k] !== undefined);
  if (vrij.length) {
    const rij = el('div', { class: 'knoppenrij' });
    rij.append(el('span', { class: 'klein' }, vrij.map((k) => `${VORM_LABELS[k].replace(' (cm)', '')} ${ontwerp.vormgeving![k]} cm (getekend in het vooraanzicht)`).join(' · ')));
    const terug = el('button', { type: 'button', class: 'tweede klein-knop' }, 'Terug volgens opties') as HTMLButtonElement;
    terug.addEventListener('click', () => {
      onthoud();
      for (const k of vrij) delete ontwerp.vormgeving![k];
      toonModelVormgeving();
      gewijzigd();
    });
    rij.append(terug);
    delen.push(rij);
  }
  vak.replaceChildren(...delen);
}

/** Het huidige ontwerp (kopie), bv. om als model te bewaren. */
export const huidigOntwerp = () => structuredClone(ontwerp);

/** Laadt een ontwerp (bv. een model uit de collectie) in de ontwerper. */
export function laadInOntwerper(nieuw: Ontwerp) {
  onthoud();
  ontwerp = structuredClone(nieuw);
  geselecteerd = null;
  vulHoofdmateriaal();
  toonAanpassingen();
  toonModelVormgeving();
  toonEigenschappen();
  toonModelNaam();
  kiesGereedschap('selecteren');
  gewijzigd();
}

function toonModelNaam() {
  const m = getModellen().find((x) => x.code === ontwerp.model);
  $('#o-model').textContent = m ? `Vertrokken van model ${m.naam}` : 'Eigen ontwerp';
}

function toonAanpassingen() {
  const vak = $('#o-aanpassingen');
  vak.replaceChildren(
    ...(getCatalogus().opties ?? [])
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
export function kiesWeergave(w: typeof weergave) {
  weergave = w;
  document.querySelectorAll<HTMLButtonElement>('[data-o-weergave]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.oWeergave === w)));
  svg().toggleAttribute('hidden', w !== 'boven');
  $('#o-voor').toggleAttribute('hidden', w !== 'voor');
  $('#o-3d').hidden = w !== '3d';
  $('#o-3d-knoppen').hidden = w !== '3d';
  $('#o-weergave-uitleg').textContent = w === 'boven' ? 'raster 10 cm · maten in cm' : w === 'voor' ? 'klik een element · sleep de grepen · maten in cm' : 'draai en zoom met muis of vinger';
  kiesGereedschap(gereedschap);
  if (w === '3d' && viewer === undefined) viewer = maak3D($('#o-3d'));
  toonWeergave();
}

function toonWeergave() {
  if (weergave === 'voor') tekenVoorvlak();
  if (weergave === '3d' && viewer) {
    viewer.formaat();
    viewer.toon(bouw3D(ontwerp, getCatalogus(), getMaterialen()));
  }
}

// ---------- vooraanzicht: klikken, grepen slepen en tekenen ----------
type VoorActie =
  | { soort: 'breedte'; id: string; voor: string; rechts0: number; breedte0: number }
  | { soort: 'hoogte'; id: string; voor: string }
  | { soort: 'poot'; id: string; voor: string }
  | { soort: 'teken'; x0: number; y0: number; x1: number; y1: number }
  | { soort: 'verplaats'; id: string; voor: string; dx: number; kinderen: Kind[] }
  | null;
let voorActie: VoorActie = null;
let voorKijkvak = { x: -40, y: -120, b: 400, h: 170 };
const voorvlak = () => $<SVGSVGElement>('#o-voor');
const RUGTYPES = ['zit', 'hoek', 'rond', 'kuip', 'rugleuning'];

/** Wat de greep bovenaan een element aanpast. */
function hoogteSoort(e: OntwerpElement): 'rughoogte' | 'armhoogte' | 'zithoogte' | null {
  const stijl = typen.get(e.type)?.tekenstijl ?? '';
  if (RUGTYPES.includes(stijl)) return 'rughoogte';
  if (stijl === 'arm') return 'armhoogte';
  if (['chaise', 'zit_zonder_rug', 'poef'].includes(stijl)) return 'zithoogte';
  return null;
}

function voorPunt(ev: PointerEvent) {
  const m = voorvlak().getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

/** Passend beeld rond het vooraanzicht. */
function passendVoor() {
  const t = tekenVooraanzicht(ontwerp, getCatalogus(), getMaterialen());
  const vormen = t.vormen.filter((v) => v.code !== 'vloer');
  const x0 = Math.min(0, ...vormen.map((v) => v.x));
  const x1 = Math.max(300, ...vormen.map((v) => v.x + v.breedte));
  const y0 = Math.min(-110, ...vormen.map((v) => v.y));
  return { x: x0 - 45, y: y0 - 25, b: x1 - x0 + 110, d: -y0 + 25 + 40 };
}

function tekenVoorvlak() {
  const s = voorvlak();
  const t = tekenVooraanzicht(ontwerp, getCatalogus(), getMaterialen());
  const vormen = t.vormen.filter((v) => v.code !== 'vloer');
  const k = zoomVoor ? zoomVoor.kijkvak() : passendVoor();
  voorKijkvak = { x: k.x, y: k.y, b: k.b, h: k.d };
  s.setAttribute('viewBox', `${voorKijkvak.x} ${voorKijkvak.y} ${voorKijkvak.b} ${voorKijkvak.h}`);
  s.replaceChildren();
  s.append(svgEl('rect', { x: voorKijkvak.x, y: voorKijkvak.y, width: voorKijkvak.b, height: voorKijkvak.h, fill: 'transparent', 'data-rol': 'achtergrond' }));
  s.append(svgEl('line', { x1: voorKijkvak.x + 10, y1: 0, x2: voorKijkvak.x + voorKijkvak.b - 10, y2: 0, class: 'vloer' }));
  for (const v of vormen) {
    const id = v.code.split('.')[0]!;
    const attr = { fill: v.vulling ?? 'none', 'stroke-width': 0.6 * (v.lijndikte ?? 1), class: 'vorm', 'data-id': id, ...(v.lijn ? { stroke: v.lijn } : {}) };
    s.append(v.pad ? svgEl('path', { d: v.pad, ...attr }) : svgEl('rect', { x: v.x, y: v.y, width: v.breedte, height: v.hoogte, rx: v.afronding ?? 0, ...attr }));
  }
  // Maten.
  const w = t.maatlijnen.find((m) => m.code === 'breedte');
  const h = t.maatlijnen.find((m) => m.code === 'hoogte');
  const z = t.maatlijnen.find((m) => m.code === 'zithoogte');
  if (w) tekenMaatlijn(s, w.x1, 16, w.x2, 16, `${w.tekst} cm`, false);
  if (h) tekenMaatlijn(s, h.x1 + 16, h.y2, h.x1 + 16, 0, `${h.tekst} cm`, true);
  if (z) tekenMaatlijn(s, z.x1 - 16, z.y1, z.x1 - 16, 0, z.tekst, true);

  // Geselecteerd element: kader en grepen.
  const e = elementVan(geselecteerd);
  if (e && gereedschap === 'selecteren') {
    const eigen = vormen.filter((v) => v.code.startsWith(`${e.id}.`));
    if (eigen.length) {
      const ex0 = Math.min(...eigen.map((v) => v.x)), ex1 = Math.max(...eigen.map((v) => v.x + v.breedte));
      const top = Math.min(...eigen.map((v) => v.y));
      s.append(svgEl('rect', { x: ex0 - 1, y: top - 1, width: ex1 - ex0 + 2, height: -top + 1, class: 'selectie' }));
      s.append(svgEl('rect', { x: ex1 - 3, y: top / 2 - 6, width: 6, height: 12, rx: 1.5, class: 'greep h', 'data-rol': 'v-breedte', 'data-id': e.id }));
      const soort = hoogteSoort(e);
      const hg = hoogtesVan(ontwerp, getCatalogus(), e);
      if (soort) {
        const hy = soort === 'zithoogte' ? -hg.zithoogte : top;
        s.append(svgEl('rect', { x: (ex0 + ex1) / 2 - 6, y: hy - 3, width: 12, height: 6, rx: 1.5, class: 'greep v', 'data-rol': 'v-hoogte', 'data-id': e.id }));
        const lbl = svgEl('text', { x: (ex0 + ex1) / 2 + 9, y: hy - 4, class: 'greeplabel' });
        lbl.textContent = soort === 'rughoogte' ? `rug ${Math.round(-top)}` : soort === 'armhoogte' ? `arm ${Math.round(-top)}` : `zit ${hg.zithoogte}`;
        s.append(lbl);
      }
      const potVorm = String(gekozenOptiesUi(e).get('poten')?.teken?.vorm ?? '');
      if (!typen.get(e.type)?.opzet && !['plint', 'housse'].includes(potVorm)) {
        const py = -hg.poothoogte;
        s.append(svgEl('rect', { x: ex0 + 4, y: py - 3, width: 10, height: 6, rx: 1.5, class: 'greep v', 'data-rol': 'v-poot', 'data-id': e.id }));
        const lbl = svgEl('text', { x: ex0 + 16, y: py + 3, class: 'greeplabel' });
        lbl.textContent = `poot ${hg.poothoogte}`;
        s.append(lbl);
      }
    }
  }
  if (voorActie?.soort === 'teken') {
    const x = Math.min(voorActie.x0, voorActie.x1), y = Math.min(voorActie.y0, voorActie.y1, 0);
    const b = Math.abs(voorActie.x1 - voorActie.x0), hh = Math.max(Math.abs(Math.min(voorActie.y0, voorActie.y1)), 1);
    s.append(svgEl('rect', { x, y, width: b, height: hh, class: 'tekenkader' }));
    const lbl = svgEl('text', { x: x + b / 2, y: y - 4, class: 'greeplabel', 'text-anchor': 'middle' });
    lbl.textContent = `${Math.round(b)} × ${Math.round(hh)} cm`;
    s.append(lbl);
  }
}

function gekozenOptiesUi(e: OntwerpElement) {
  return gekozenOpties(ontwerp, getCatalogus(), e);
}

/** Breedte zoals in het vooraanzicht (x-richting): breedte of diepte, afhankelijk van de draaiing. */
function xMaat(e: OntwerpElement): 'breedte' | 'diepte' {
  return e.rotatie === 0 || e.rotatie === 180 ? 'breedte' : 'diepte';
}

function opVoorDown(ev: PointerEvent) {
  if (ev.button !== 0) return;
  const doel = ev.target as SVGElement;
  const rol = doel.getAttribute('data-rol');
  const id = doel.getAttribute('data-id');
  const p = voorPunt(ev);
  voorvlak().focus({ preventScroll: true });
  zoomVoor?.vastzetten();
  if (rol === 'v-breedte' && id) {
    const e = elementVan(id)!;
    const f = voetafdruk(e);
    voorActie = { soort: 'breedte', id, voor: JSON.stringify(ontwerp), rechts0: f.x + f.b, breedte0: e[xMaat(e)] };
  } else if (rol === 'v-hoogte' && id) voorActie = { soort: 'hoogte', id, voor: JSON.stringify(ontwerp) };
  else if (rol === 'v-poot' && id) voorActie = { soort: 'poot', id, voor: JSON.stringify(ontwerp) };
  else if (id && elementVan(id) && (gereedschap === 'selecteren' || !typen.get(gereedschap)?.opzet)) {
    // Op een bestaand element: selecteren en zijwaarts verplaatsen.
    if (gereedschap !== 'selecteren') kiesGereedschap('selecteren');
    const e = elementVan(id)!;
    geselecteerd = id;
    voorActie = { soort: 'verplaats', id, voor: JSON.stringify(ontwerp), dx: p.x - e.x, kinderen: kinderenVan(e) };
    toonEigenschappen();
    herbereken();
  } else if (gereedschap !== 'selecteren') voorActie = { soort: 'teken', x0: Math.round(p.x), y0: Math.round(p.y), x1: Math.round(p.x), y1: Math.round(p.y) };
  else {
    geselecteerd = null;
    toonEigenschappen();
    herbereken();
    // Leeg stuk: slepen verschuift het beeld.
    if (zoomVoor) { pannen = { zoom: zoomVoor, bewogen: false }; zoomVoor.startPan(ev); voorvlak().setPointerCapture(ev.pointerId); }
    return;
  }
  voorvlak().setPointerCapture(ev.pointerId);
}

function opVoorMove(ev: PointerEvent) {
  if (pannen) { pannen.bewogen = true; pannen.zoom.beweegPan(ev); return; }
  if (!voorActie) return;
  const p = voorPunt(ev);
  const klemB = (w: number, b: { min: number; max: number }) => Math.round(Math.min(b.max, Math.max(b.min, w)));
  if (voorActie.soort === 'teken') {
    voorActie.x1 = Math.round(p.x);
    voorActie.y1 = Math.round(p.y);
  } else {
    const e = elementVan(voorActie.id);
    if (!e) return;
    const t = typen.get(e.type)!;
    if (voorActie.soort === 'verplaats') {
      const doelX = Math.round(p.x - voorActie.dx);
      e.x = ev.altKey ? doelX : magneet(e, doelX, e.y).x;
      verhuisKinderen(e, voorActie.kinderen);
    } else if (voorActie.soort === 'breedte') {
      const veld = xMaat(e);
      const bereik = veld === 'breedte' ? t.breedte : t.diepte;
      const f = voetafdruk(e);
      const nieuw = klemB(p.x - f.x, bereik);
      // Herstel vanaf de begintoestand en pas dan toe, zodat herhaald slepen niet optelt.
      ontwerp = JSON.parse(voorActie.voor) as Ontwerp;
      const e2 = elementVan(voorActie.id)!;
      const delta = nieuw - voorActie.breedte0;
      const f2 = voetafdruk(e2);
      e2[veld] = nieuw;
      // Elementen rechts in dezelfde rij schuiven mee; rugleuningen/kussens over de volle breedte groeien mee.
      for (const o of ontwerp.elementen) {
        if (o === e2) continue;
        const q = voetafdruk(o);
        const zelfdeRij = Math.min(q.y + q.h, f2.y + f2.h) - Math.max(q.y, f2.y) > 0;
        const opDit = typen.get(o.type)?.opzet && dragerVan(ontwerp, getCatalogus(), o)?.id === e2.id;
        if (opDit && Math.abs(q.b - f2.b) <= 1 && xMaat(o) === xMaat(e2)) o[xMaat(o)] = Math.max(1, o[xMaat(o)] + delta);
        else if (zelfdeRij && q.x >= voorActie.rechts0 - 1) o.x += delta;
      }
    } else if (voorActie.soort === 'hoogte') {
      const soort = hoogteSoort(e);
      const h = Math.round(-p.y);
      if (soort === 'rughoogte') e.vorm = { ...(e.vorm ?? {}), rughoogte: klemB(h, HOOGTE_BEREIK.rughoogte) };
      if (soort === 'armhoogte') e.vorm = { ...(e.vorm ?? {}), armhoogte: klemB(h, HOOGTE_BEREIK.armhoogte) };
      if (soort === 'zithoogte') ontwerp.vormgeving = { ...(ontwerp.vormgeving ?? {}), zithoogte: klemB(h + (t.tekenstijl === 'poef' ? 2 : 0), HOOGTE_BEREIK.zithoogte) };
    } else if (voorActie.soort === 'poot') {
      ontwerp.vormgeving = { ...(ontwerp.vormgeving ?? {}), poothoogte: klemB(-p.y, HOOGTE_BEREIK.poothoogte) };
    }
  }
  herbereken(false);
  tekenVoorvlak();
}

function opVoorUp() {
  zoomVoor?.losmaken();
  if (pannen) { pannen.zoom.stopPan(); pannen = undefined; return; }
  if (!voorActie) return;
  const a = voorActie;
  voorActie = null;
  if (a.soort === 'teken') {
    const t = typen.get(gereedschap);
    if (t) {
      const x = Math.min(a.x0, a.x1), b = Math.abs(a.x1 - a.x0);
      const h = Math.round(-Math.min(a.y0, a.y1, 0));
      const klik = b < 8;
      const breed = Math.round(Math.min(t.breedte.max, Math.max(t.breedte.min, klik ? t.breedte.standaard : b)));
      const x0 = Math.round(klik ? x - breed / 2 : x);
      let nieuw: OntwerpElement;
      if (t.opzet) {
        // Op het element met de meeste overlap in de breedte.
        const basis = ontwerp.elementen.filter((o) => !typen.get(o.type)?.opzet);
        const overlap = (o: OntwerpElement) => {
          const q = voetafdruk(o);
          return Math.min(q.x + q.b, x0 + breed) - Math.max(q.x, x0);
        };
        const drager = basis.sort((p1, p2) => overlap(p2) - overlap(p1))[0];
        if (!drager || overlap(drager) <= 0) {
          $('#o-hint').textContent = `Een ${t.label.toLowerCase()} moet op een element liggen: teken over een bestaand element.`;
          tekenVoorvlak();
          return;
        }
        const B = drager.breedte;
        const lx = drager.rotatie === 180 ? drager.x + B - x0 - breed : x0 - drager.x;
        const ly = t.tekenstijl === 'rugleuning' ? 0 : voorkantRug(drager);
        nieuw = plaatsOp(drager, t.code, Math.max(0, Math.min(lx, B - 4)), ly, Math.min(breed, B), t.diepte.standaard, 0);
      } else {
        const basis = ontwerp.elementen.filter((o) => !typen.get(o.type)?.opzet);
        const yRij = basis.length ? Math.min(...basis.map((o) => voetafdruk(o).y)) : 0;
        nieuw = { id: nieuwId(), type: t.code, x: x0, y: yRij, breedte: breed, diepte: t.diepte.standaard, rotatie: 0 };
        const m = magneet(nieuw, nieuw.x, nieuw.y);
        nieuw.x = m.x;
      }
      const soort = hoogteSoort(nieuw);
      if (!klik && h > 0) {
        if (soort === 'rughoogte' && Math.abs(h - hoogtesVan(ontwerp, getCatalogus(), nieuw).rughoogte) > 2)
          nieuw.vorm = { rughoogte: Math.round(Math.min(HOOGTE_BEREIK.rughoogte.max, Math.max(HOOGTE_BEREIK.rughoogte.min, h))) };
        if (soort === 'armhoogte' && Math.abs(h - hoogtesVan(ontwerp, getCatalogus(), nieuw).armhoogte) > 2)
          nieuw.vorm = { armhoogte: Math.round(Math.min(HOOGTE_BEREIK.armhoogte.max, Math.max(HOOGTE_BEREIK.armhoogte.min, h))) };
      }
      onthoud();
      ontwerp.elementen.push(nieuw);
      geselecteerd = nieuw.id;
      kiesGereedschap('selecteren');
    }
  } else if (JSON.stringify(ontwerp) !== a.voor) {
    onthoud(a.voor);
  }
  toonEigenschappen();
  toonModelVormgeving();
  gewijzigd();
}

// ---------- rugleuningen en kussens toevoegen op een element ----------
const DRAGERS = ['zit', 'hoek', 'chaise', 'zit_zonder_rug', 'rond', 'kuip', 'poef'];

/** Plaatst een opzet-element op een rechthoek in de lokale coördinaten van de drager. */
function plaatsOp(drager: OntwerpElement, type: string, lx: number, ly: number, lb: number, ld: number, extraRotatie: 0 | 90 | 270): OntwerpElement {
  const w = lokaalNaarWereld(drager, lx, ly, lb, ld);
  const r = ((drager.rotatie + extraRotatie) % 360) as Rotatie;
  const liggend = r === 0 || r === 180;
  return { id: nieuwId(), type, x: Math.round(w.x), y: Math.round(w.y), breedte: Math.round(liggend ? w.b : w.h), diepte: Math.round(liggend ? w.h : w.b), rotatie: r };
}

function voegOpzetToe(drager: OntwerpElement, wat: 'rug-achter' | 'rug-links' | 'rug-rechts' | 'rugkussen' | 'sierkussen' | 'rolkussen') {
  const B = drager.breedte, D = drager.diepte;
  const t = (code: string) => typen.get(code)!;
  const opDrager = ontwerp.elementen.filter((o) => o !== drager && typen.get(o.type)?.opzet && voetafdrukOverlapt(o, drager));
  const voor = voorkantRug(drager);
  let nieuw: OntwerpElement;
  const dik = t('rugleuning').diepte.standaard;
  if (wat === 'rug-achter') nieuw = plaatsOp(drager, 'rugleuning', 0, 0, B, dik, 0);
  else if (wat === 'rug-links') nieuw = plaatsOp(drager, 'rugleuning', 0, voor, dik, D - voor, 270);
  else if (wat === 'rug-rechts') nieuw = plaatsOp(drager, 'rugleuning', B - dik, voor, dik, D - voor, 90);
  else if (wat === 'rolkussen') {
    const rk = t('rolkussen');
    nieuw = plaatsOp(drager, 'rolkussen', 2, voor + 4, rk.diepte.standaard, Math.min(rk.breedte.standaard, D - voor - 8), 270);
  } else {
    const k = t(wat);
    const zelfde = opDrager.filter((o) => o.type === wat).length;
    const b = Math.min(k.breedte.standaard, B - 4);
    const lx = Math.min(B - b - 2, 2 + zelfde * (b + 2));
    nieuw = plaatsOp(drager, wat, Math.max(0, lx), voor + (wat === 'sierkussen' ? k.diepte.standaard + 2 : 0), b, k.diepte.standaard, 0);
  }
  onthoud();
  ontwerp.elementen.push(nieuw);
  geselecteerd = nieuw.id;
  toonEigenschappen();
  gewijzigd();
}

/** Afstand van de achterkant van een element tot de voorkant van zijn rug (eigen rug of losse rugleuning achteraan). */
function voorkantRug(drager: OntwerpElement): number {
  if (['zit', 'hoek', 'rond', 'kuip'].includes(typen.get(drager.type)?.tekenstijl ?? '')) return vormgevingVan(ontwerp, drager).rugdikte;
  const rug = ontwerp.elementen.find(
    (o) => o.type !== drager.type && typen.get(o.type)?.tekenstijl === 'rugleuning' && o.rotatie === drager.rotatie && voetafdrukOverlapt(o, drager),
  );
  return rug ? rug.diepte : 0;
}

function voetafdrukOverlapt(a: OntwerpElement, b: OntwerpElement) {
  const p = voetafdruk(a), q = voetafdruk(b);
  return Math.min(p.x + p.b, q.x + q.b) - Math.max(p.x, q.x) > 0 && Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y) > 0;
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
  for (const g of (getCatalogus().opties ?? []).filter((g) => g.niveau === 'element' && (!g.voorTypen || g.voorTypen.includes(e.type)))) {
    elementOpties.append(
      optieGroepVeld(g, e.opties?.[g.code] ?? g.standaard, `oe-${e.id}`, (code) => {
        onthoud();
        e.opties = { ...(e.opties ?? {}), [g.code]: code };
        gewijzigd();
      }),
    );
  }
  const delen: HTMLElement[] = [kop, rij];
  const vormbaar = ['zit', 'hoek', 'chaise', 'zit_zonder_rug', 'rond'].includes(t.tekenstijl);
  let ontwerpVak: HTMLElement | null = null;
  if (vormbaar) {
    ontwerpVak = el('details', { class: 'ontwerpmodus', ...(e.vorm && Object.keys(e.vorm).length ? { open: '' } : {}) });
    const sam = el('summary', {}, `Ontwerpmodus: dit element herontwerpen${e.vorm && Object.keys(e.vorm).length ? ' (aangepast)' : ''}`);
    ontwerpVak.append(sam);
    ontwerpVak.append(
      vormgevingVelden(`oe-${e.id}-v`, vormgevingVan(ontwerp, e), e.vorm ?? {}, (veld, w) =>
        vormWijziging(() => (e.vorm = { ...(e.vorm ?? {}), [veld]: w })),
      ),
    );
    const vk = el('div', { class: 'knoppenrij' });
    const alle = el('button', { type: 'button', class: 'tweede' }, `Toepassen op alle elementen "${t.label.toLowerCase()}"`) as HTMLButtonElement;
    alle.addEventListener('click', () => {
      onthoud();
      for (const o of ontwerp.elementen) if (o.type === e.type && o !== e) o.vorm = { ...(e.vorm ?? {}) };
      gewijzigd();
    });
    const herstel = el('button', { type: 'button', class: 'tweede' }, 'Terug naar vormgeving van het model') as HTMLButtonElement;
    herstel.addEventListener('click', () => {
      onthoud();
      delete e.vorm;
      toonEigenschappen();
      gewijzigd();
    });
    vk.append(alle, herstel);
    ontwerpVak.append(vk, el('p', { class: 'klein' }, 'Tip: bekijk het resultaat in 3D of in het vooraanzicht.'));
  }
  if (t.tekenstijl !== 'console') delen.push(matLabel);
  delen.push(el('p', { class: 'klein' }, t.tekenstijl === 'zit' || t.tekenstijl === 'hoek' ? `Rug aan de ${rugTekst}kant.` : t.tekenstijl === 'console' ? 'Houten tussenstuk in de gekozen houtafwerking.' : ''));
  if (DRAGERS.includes(t.tekenstijl)) {
    const vak = el('div', { class: 'toevoegen' });
    vak.append(el('span', { class: 'klein' }, 'Toevoegen op dit element:'));
    const rij2 = el('div', { class: 'knoppenrij' });
    for (const [wat, tekst] of [
      ['rug-achter', '+ Rugleuning achter'], ['rug-links', '+ Rugleuning links'], ['rug-rechts', '+ Rugleuning rechts'],
      ['rugkussen', '+ Rugkussen'], ['sierkussen', '+ Sierkussen'], ['rolkussen', '+ Rolkussen'],
    ] as const) {
      const b = el('button', { type: 'button', class: 'tweede klein-knop' }, tekst) as HTMLButtonElement;
      b.addEventListener('click', () => voegOpzetToe(e, wat));
      rij2.append(b);
    }
    vak.append(rij2);
    delen.push(vak);
  }
  if (elementOpties.childElementCount) delen.push(elementOpties);
  // Vrij getekende hoogtes (vooraanzicht): tonen met terugzetknop.
  const vrij = (['rughoogte', 'armhoogte'] as const).filter((k) => e.vorm?.[k] !== undefined);
  if (vrij.length) {
    const rij3 = el('div', { class: 'knoppenrij' });
    rij3.append(el('span', { class: 'klein' }, vrij.map((k) => `${VORM_LABELS[k].replace(' (cm)', '')} ${e.vorm![k]} cm (getekend)`).join(' · ')));
    const terug = el('button', { type: 'button', class: 'tweede klein-knop' }, 'Terug volgens opties') as HTMLButtonElement;
    terug.addEventListener('click', () => {
      onthoud();
      for (const k of vrij) delete e.vorm![k];
      toonEigenschappen();
      gewijzigd();
    });
    rij3.append(terug);
    delen.push(rij3);
  }
  if (ontwerpVak) delen.push(ontwerpVak);
  delen.push(knoppen);
  vak.replaceChildren(...delen);
}

function herbereken(alles = true) {
  resultaat = berekenOntwerp(ontwerp, getCatalogus(), getMaterialen(), { kortingProcent: getKorting() });
  tekenCanvas();
  if (!alles) return;
  const r = resultaat;
  const status = $('#o-status');
  const fouten = r.meldingen.filter((m) => m.ernst === 'fout').length;
  status.textContent = r.geldig ? 'Klaar voor offerte' : `${fouten} ${fouten === 1 ? 'fout' : 'fouten'} op te lossen`;
  status.className = `status ${r.geldig ? 'ok' : 'fout'}`;
  $('#o-prijs-excl').textContent = eur(r.prijs.verkoopprijsExcl);
  $('#o-prijs-incl').textContent = `${eur(r.prijs.verkoopprijsIncl)} incl. ${getCatalogus().btwProcent}% btw`;
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
  const bouwGereedschap = () => {
    const balk = $('#o-gereedschap');
    balk.replaceChildren();
    const knop = (code: string, tekst: string) => {
      const b = el('button', { type: 'button', 'data-gereedschap': code, 'aria-pressed': String(code === gereedschap) }, tekst) as HTMLButtonElement;
      b.addEventListener('click', () => kiesGereedschap(code));
      balk.append(b);
    };
    knop('selecteren', 'Selecteren en verplaatsen');
    for (const t of getCatalogus().typen) knop(t.code, `+ ${t.label}`);
  };
  bouwGereedschap();
  opWijziging('catalogus', () => {
    if (!typen.get(gereedschap)) gereedschap = 'selecteren';
    bouwGereedschap();
    toonAanpassingen();
    toonEigenschappen();
    herbereken();
  });

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
      toonModelVormgeving();
      toonModelNaam();
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
      ...(getCatalogus().opties ?? [])
        .filter((g) => g.niveau === 'ontwerp')
        .map((g) => `- ${g.label}: ${g.keuzes.find((k) => k.code === (ontwerp.opties?.[g.code] ?? g.standaard))?.label ?? ''}`),
      `Prijs: ${eur(r.prijs.verkoopprijsExcl)} excl. btw (${eur(r.prijs.verkoopprijsIncl)} incl. btw)`,
    ].join('\n');
    void kopieer(tekst, $('#o-kopieer-melding'));
  });

  const vv = voorvlak();
  zoomVoor = new Zoom({
    doel: vv, svg: voorvlak, passend: passendVoor, opnieuw: tekenVoorvlak, minBreedte: 40,
    opKnijpen: () => { voorActie = null; pannen = undefined; },
  });
  const sb = svg();
  zoomBoven = new Zoom({
    doel: sb, svg, passend: passendBoven, opnieuw: tekenCanvas, minBreedte: 40,
    opKnijpen: () => { actie = null; pannen = undefined; },
  });
  for (const [vlak, z, sel] of [[sb, zoomBoven, true], [vv, zoomVoor, false]] as const) {
    const wrap = document.createElement('div');
    wrap.className = 'zoomvlak';
    vlak.before(wrap);
    wrap.append(vlak, z.knoppen(sel ? { selectie: selectieKader, grootScherm: $('#view-ontwerp') } : { grootScherm: $('#view-ontwerp') }));
  }
  vv.addEventListener('pointerdown', opVoorDown);
  vv.addEventListener('pointermove', opVoorMove);
  vv.addEventListener('pointerup', opVoorUp);
  vv.addEventListener('pointercancel', opVoorUp);
  vv.addEventListener('keydown', opToets);

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
  toonModelVormgeving();
  toonModelNaam();
  kiesGereedschap('selecteren');
  $<HTMLButtonElement>('#o-ongedaan').disabled = true;
  herbereken();
  toonEigenschappen();
}
