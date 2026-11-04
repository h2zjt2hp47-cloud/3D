/**
 * Vrije zetelontwerper: elementen tekenen, verslepen, vergroten en draaien
 * op een bovenaanzicht in cm. Prijs, stof en meldingen rekenen live mee.
 */
import {
  berekenOntwerp,
  bouw3D,
  dragerVan,
  draagHoogteVan,
  DRAGER_STIJLEN,
  gekozenOpties,
  HOOGTE_BEREIK,
  RUGLEUNING_MIN_BOVEN,
  rugleuningTop,
  hoogtesVan,
  lokaalNaarWereld,
  ontwerpOmschrijving,
  overlapOppervlak,
  VORMGEVING_BEREIK,
  vormgevingVan,
  vormEffect,
  type VormEffect,
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
  type Scene3D,
} from '../../core/src/index.js';
import { startOntwerpen } from '../../core/voorbeelden/vrij-ontwerp.js';
import { DECORS, LICHTEN, maak3D, STANDAARD_WEERGAVE, VLOEREN, type DecorNaam, type Kwaliteit, type LichtNaam, type Standpunt, type Viewer3D, type Weergave3D } from './drie-d.js';
import { grootSchermKnop, Zoom } from './zoom.js';
import { maakStalenkaart, materiaalOptiesPerCollectie } from './stalen.js';
import { bewaarBestand, dataUrlNaarBlob } from './bewaren.js';
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
/** De opzet-elementen (rugleuning, kussens) die op dit element liggen. */
function opzetOp(drager: OntwerpElement): OntwerpElement[] {
  if (typen.get(drager.type)?.opzet) return [];
  return ontwerp.elementen.filter((o) => typen.get(o.type)?.opzet && dragerVan(ontwerp, getCatalogus(), o) === drager);
}

function verwijder(id: string) {
  const e = elementVan(id);
  if (!e) return;
  onthoud();
  // Wat erop ligt (rugleuning, kussens) gaat mee weg: anders bleef het zweven met de fout "ligt niet op een zitting".
  const weg = new Set([e, ...opzetOp(e)]);
  ontwerp.elementen = ontwerp.elementen.filter((o) => !weg.has(o));
  geselecteerd = null;
  toonEigenschappen();
  gewijzigd();
}
function dupliceer(id: string) {
  const e = elementVan(id);
  if (!e) return;
  onthoud();
  const p = voetafdruk(e);
  const opzetten = opzetOp(e);
  const basis = ontwerp.elementen.filter((o) => !typen.get(o.type)?.opzet);
  const vrij = (k: OntwerpElement) => basis.every((o) => overlapOppervlak(k, o) < 1);
  // Een vrije plaats zoeken: rechts, links, eronder, erboven, anders rechts naast de hele zetel.
  const rechtsVanAlles = Math.max(...basis.map((o) => voetafdruk(o).x + voetafdruk(o).b)) + 20;
  const kandidaten: [number, number][] = [[e.x + p.b, e.y], [e.x - p.b, e.y], [e.x, e.y + p.h], [e.x, e.y - p.h], [rechtsVanAlles, e.y]];
  let kopie = { ...e, id: nieuwId(), x: rechtsVanAlles, y: e.y };
  for (const [x, y] of kandidaten) {
    const k = { ...e, id: kopie.id, x, y };
    if (typen.get(e.type)?.opzet) { kopie = k; break; }
    Object.assign(k, magneet(k, x, y));
    if (vrij(k)) { kopie = k; break; }
  }
  ontwerp.elementen.push(kopie);
  // Rugleuning en kussens die erop liggen, gaan mee naar de kopie.
  const dx = kopie.x - e.x, dy = kopie.y - e.y;
  for (const o of opzetten) ontwerp.elementen.push({ ...o, id: nieuwId(), x: o.x + dx, y: o.y + dy });
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
  // Een keuze voor de hele zetel die per element aangerekend wordt (poten, naden …): "+€12 per element".
  if (k.prijs) delen.push(`${teken(k.prijs)}€${getal(Math.abs(k.prijs), 0)}${g.niveau === 'ontwerp' && g.perElement ? ' per element' : ''}`);
  if (k.prijsPerM) delen.push(`${teken(k.prijsPerM)}€${getal(Math.abs(k.prijsPerM), 0)}/m`);
  if (k.pct) delen.push(`${teken(k.pct)}${getal(Math.abs(k.pct), 0)}%`);
  return delen.join(' ');
}

function optieGroepVeld(g: OptieGroep, huidig: string, idVoorvoegsel: string, kies: (code: string) => void): HTMLElement {
  const fs = el('fieldset', { class: 'optiegroep', 'data-groep': g.code });
  // Geen "(per element)" meer achter de naam: dat las als "per element te kiezen", terwijl het één keuze is voor de
  // hele zetel die per element aangerekend wordt. Dat staat nu bij de meerprijs.
  const legende = el('legend', {}, g.label);
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
  rugkussendikte: 'Dikte rugkussens (cm)',
  rugkussens: 'Rugkussens per element',
  karkashoogte: 'Hoogte karkas (cm)',
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
function vormgevingVelden(idVoorvoegsel: string, huidig: Vormgeving, eigen: Partial<Vormgeving>, pas: (veld: keyof Vormgeving, w: Vormgeving[keyof Vormgeving]) => void, effect?: VormEffect): HTMLElement {
  const raster = el('div', { class: 'vormraster' });
  // Voor één element: alleen wat bij dat element zichtbaar is (en aangerekend wordt), zie vormEffect in de motor.
  const toon = (veld: keyof Vormgeving) =>
    !effect || ((veld !== 'rugdikte' && veld !== 'rugvorm') || effect.rugvorm) && (veld !== 'zitkussens' || effect.kussens) && (veld !== 'houtframe' || effect.houtframe) && (veld !== 'rugkussendikte' || effect.rug);
  for (const veld of Object.keys(VORMGEVING_BEREIK) as (keyof typeof VORMGEVING_BEREIK)[]) {
    if (!toon(veld)) continue;
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
    if (!toon(veld)) continue;
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

/** Hoogtegroepen die de vormgeving kan vastleggen (maten van het model of getekend in het vooraanzicht). */
const VASTE_HOOGTES = ['zithoogte', 'poothoogte', 'rughoogte', 'armhoogte'] as const;

/**
 * Staat deze hoogte vast in de vormgeving, dan doen de keuzes van de groep niets (de vormgeving gaat voor):
 * de groep grijs tonen, met de maat en een knop om terug te gaan naar de keuzes.
 */
function hoogteVastgelegd(veld: HTMLElement, code: string) {
  if (!(VASTE_HOOGTES as readonly string[]).includes(code)) return veld;
  const maat = ontwerp.vormgeving?.[code as (typeof VASTE_HOOGTES)[number]];
  if (maat === undefined) return veld;
  veld.classList.add('vastgelegd');
  const model = getModellen().find((x) => x.code === ontwerp.model);
  const vanModel = model?.ontwerp.vormgeving?.[code as (typeof VASTE_HOOGTES)[number]] === maat;
  const rij = el('div', { class: 'knoppenrij hoogtemelding' });
  rij.append(el('span', { class: 'klein' }, `Nu ${getal(maat)} cm ${vanModel ? 'volgens het model' : 'getekend in het vooraanzicht'}; de keuzes hierboven gelden dan niet.`));
  const terug = el('button', { type: 'button', class: 'tweede klein-knop' }, 'Terug volgens keuzes') as HTMLButtonElement;
  terug.addEventListener('click', () => {
    onthoud();
    const v = { ...(ontwerp.vormgeving ?? {}) };
    delete v[code as (typeof VASTE_HOOGTES)[number]];
    ontwerp.vormgeving = v;
    toonAanpassingen();
    toonEigenschappen();
    gewijzigd();
  });
  rij.append(terug);
  veld.append(rij);
  return veld;
}

function toonAanpassingen() {
  const vak = $('#o-aanpassingen');
  vak.replaceChildren(
    ...(getCatalogus().opties ?? [])
      .filter((g) => g.niveau === 'ontwerp')
      .map((g) =>
        hoogteVastgelegd(optieGroepVeld(g, ontwerp.opties?.[g.code] ?? g.standaard, 'oz', (code) => {
          onthoud();
          ontwerp.opties = { ...(ontwerp.opties ?? {}), [g.code]: code };
          gewijzigd();
        }), g.code),
      ),
  );
}

/** Markeer optiegroepen met een foutieve combinatie. */
function markeerOptieFouten() {
  const fout = new Set(resultaat.meldingen.filter((m) => m.code.startsWith('optie.')).map((m) => m.code.split('.')[1]));
  document.querySelectorAll<HTMLElement>('.optiegroep').forEach((f) => f.classList.toggle('fout', fout.has(f.dataset.groep ?? '')));
}

// ---------- 3D-instellingen: stof, decor, licht, kwaliteit, foto, groot scherm ----------
const SLEUTEL_3D = 'configurator-demo.3d.v1';
type Instellingen3D = { decor: DecorNaam; licht: LichtNaam; kwaliteit: Kwaliteit; weergave: Weergave3D };
function instellingen3D(): Instellingen3D {
  const standaard: Instellingen3D = { decor: 'studio', licht: 'studio', kwaliteit: window.matchMedia?.('(pointer: coarse)').matches ? 'snel' : 'mooi', weergave: { ...STANDAARD_WEERGAVE } };
  try {
    const o = JSON.parse(laad(SLEUTEL_3D) ?? '{}');
    return {
      decor: o.decor in DECORS ? o.decor : standaard.decor,
      licht: o.licht in LICHTEN ? o.licht : standaard.licht,
      kwaliteit: o.kwaliteit === 'snel' || o.kwaliteit === 'mooi' ? o.kwaliteit : standaard.kwaliteit,
      weergave: { ...STANDAARD_WEERGAVE, ...(o.weergave && typeof o.weergave === 'object' ? o.weergave : {}) },
    };
  } catch {
    return standaard;
  }
}
function pas3DInstellingenToe() {
  const i = instellingen3D();
  viewer?.kwaliteit?.(i.kwaliteit);
  viewer?.instellen?.(i.weergave);
  viewer?.licht?.(i.licht);
  viewer?.decor?.(i.decor);
  viewer?.markeer?.(geselecteerd);
}
function vul3DStof() {
  materiaalOptiesPerCollectie($<HTMLSelectElement>('#o-3d-stof'), getMaterialen(), ontwerp.hoofdmateriaal);
}
function downloadBeeld(url: string, soort: string) {
  // Fouten hier niet als rode melding: de foto staat al in beeld, enkel het bewaren lukte niet.
  bewaarBestand(`zetel-${soort}-${new Date().toISOString().slice(0, 10)}.png`, dataUrlNaarBlob(url)).catch((fout) => console.error('Foto bewaren mislukt:', fout));
}
function start3DInstellingen() {
  const i = instellingen3D();
  const decor = $<HTMLSelectElement>('#o-3d-decor'), licht = $<HTMLSelectElement>('#o-3d-licht'), kwal = $<HTMLSelectElement>('#o-3d-kwaliteit');
  decor.replaceChildren(...Object.entries(DECORS).map(([k, v]) => el('option', { value: k }, v.label)));
  licht.replaceChildren(...Object.entries(LICHTEN).map(([k, v]) => el('option', { value: k }, v.label)));
  decor.value = i.decor; licht.value = i.licht; kwal.value = i.kwaliteit;
  let weergave3D: Weergave3D = i.weergave;
  const bewaarInst = () => bewaar(SLEUTEL_3D, JSON.stringify({ decor: decor.value, licht: licht.value, kwaliteit: kwal.value, weergave: weergave3D }));
  // Meer instellingen: vloer, muur, tapijt, spullen, lens, helderheid, zon, maten, draaien.
  const vloer = $<HTMLSelectElement>('#o-3d-vloer'), muur = $<HTMLSelectElement>('#o-3d-muur'), tapijt = $<HTMLSelectElement>('#o-3d-tapijt');
  const muurKleur = $<HTMLInputElement>('#o-3d-muurkleur'), tapijtKleur = $<HTMLInputElement>('#o-3d-tapijtkleur');
  const spullen = $<HTMLSelectElement>('#o-3d-spullen'), lens = $<HTMLSelectElement>('#o-3d-lens');
  const helder = $<HTMLInputElement>('#o-3d-helderheid'), zonR = $<HTMLInputElement>('#o-3d-zon');
  const maten = $<HTMLInputElement>('#o-3d-maten'), draaien = $<HTMLInputElement>('#o-3d-draaien');
  vloer.replaceChildren(el('option', { value: 'decor' }, 'Zoals het decor'), ...Object.entries(VLOEREN).map(([k, v]) => el('option', { value: k }, v.label)));
  const toonVelden = () => {
    const w = weergave3D;
    vloer.value = w.vloer;
    muur.value = /^#/.test(w.muur) ? 'kleur' : w.muur;
    if (/^#/.test(w.muur)) muurKleur.value = w.muur;
    tapijt.value = /^#/.test(w.tapijt) ? 'kleur' : w.tapijt;
    if (/^#/.test(w.tapijt)) tapijtKleur.value = w.tapijt;
    $('#o-3d-muurkleur-veld').hidden = muur.value !== 'kleur';
    $('#o-3d-tapijtkleur-veld').hidden = tapijt.value !== 'kleur';
    spullen.value = w.spullen; lens.value = String(w.lens);
    helder.value = String(w.helderheid); zonR.value = String(w.zonRichting);
    maten.checked = w.maten; draaien.checked = w.draaien;
  };
  const leesVelden = () => {
    weergave3D = {
      vloer: vloer.value as Weergave3D['vloer'],
      muur: muur.value === 'kleur' ? muurKleur.value : muur.value,
      tapijt: tapijt.value === 'kleur' ? tapijtKleur.value : tapijt.value,
      spullen: spullen.value as Weergave3D['spullen'],
      lens: Number(lens.value), helderheid: Number(helder.value), zonRichting: Number(zonR.value),
      maten: maten.checked, draaien: draaien.checked, echtModel: echtAan,
    };
    $('#o-3d-muurkleur-veld').hidden = muur.value !== 'kleur';
    $('#o-3d-tapijtkleur-veld').hidden = tapijt.value !== 'kleur';
    viewer?.instellen?.(weergave3D);
    bewaarInst();
  };
  toonVelden();
  for (const v of [vloer, muur, tapijt, spullen, lens, maten, draaien]) v.addEventListener('change', leesVelden);
  // Echt 3D-model of de benadering (vergelijken); bewaard met de andere 3D-instellingen.
  echtAan = weergave3D.echtModel !== false;
  document.querySelectorAll<HTMLButtonElement>('[data-echt]').forEach((b) => b.addEventListener('click', () => {
    echtAan = b.dataset.echt === 'aan';
    weergave3D = { ...weergave3D, echtModel: echtAan };
    viewer?.instellen?.({ echtModel: echtAan });
    bewaarInst();
    if (scene3D) toonEchtVak(scene3D);
  }));
  for (const v of [muurKleur, tapijtKleur, helder, zonR]) v.addEventListener('input', leesVelden);
  $('#o-3d-herstel').addEventListener('click', () => {
    weergave3D = { ...STANDAARD_WEERGAVE };
    echtAan = true;
    toonVelden();
    viewer?.instellen?.(weergave3D);
    bewaarInst();
    if (scene3D) toonEchtVak(scene3D);
  });
  decor.addEventListener('change', () => {
    viewer?.decor?.(decor.value as DecorNaam);
    // Elk decor heeft een eigen zonrichting (bv. door het raam): de schuif volgt mee.
    const zon = (DECORS[decor.value as DecorNaam] as { zon?: number }).zon;
    if (typeof zon === 'number') { zonR.value = String(zon); leesVelden(); }
    bewaarInst();
  });
  licht.addEventListener('change', () => { viewer?.licht?.(licht.value as LichtNaam); bewaarInst(); });
  kwal.addEventListener('change', () => { viewer?.kwaliteit?.(kwal.value as Kwaliteit); bewaarInst(); });
  // Stof kiezen zonder de zijbalk (handig in groot scherm); blijft gelijk met "Hoofdmateriaal".
  const stof = $<HTMLSelectElement>('#o-3d-stof');
  vul3DStof();
  stof.addEventListener('change', () => {
    if (stof.value === ontwerp.hoofdmateriaal) return;
    onthoud();
    ontwerp.hoofdmateriaal = stof.value;
    $<HTMLSelectElement>('#o-hoofdmateriaal').value = stof.value;
    gewijzigd();
    stalenkaart?.ververs();
  });
  $('#o-3d-foto').addEventListener('click', () => {
    const url = viewer?.foto?.();
    if (url) downloadBeeld(url, '3d');
  });
  $('#o-3d-groot').append(grootSchermKnop($('#o-tekenvlak'), () => viewer?.formaat()));
  // Fotorealistische foto: path tracing met voortgang en annuleren; meer monsters op een computer dan op een tablet.
  let bezig: AbortController | null = null;
  const voortgang = $('#o-3d-voortgang');
  $('#o-3d-annuleer').addEventListener('click', () => bezig?.abort());
  $('#o-3d-fotoreal').addEventListener('click', async () => {
    if (!viewer?.fotoRealistisch || bezig) return;
    bezig = new AbortController();
    const balk = voortgang.querySelector('progress')!;
    balk.value = 0;
    voortgang.hidden = false;
    $<HTMLButtonElement>('#o-3d-fotoreal').disabled = true;
    const tablet = window.matchMedia?.('(pointer: coarse)').matches;
    const url = await viewer.fotoRealistisch({ stappen: tablet ? 32 : 96, breedte: tablet ? 1400 : 2000, signaal: bezig.signal, opVoortgang: (d) => { balk.value = d; } });
    voortgang.hidden = true;
    $<HTMLButtonElement>('#o-3d-fotoreal').disabled = false;
    bezig = null;
    if (url) downloadBeeld(url, 'fotorealistisch');
  });
}

// ---------- weergave: bovenaanzicht, vooraanzicht, 3D ----------
export function kiesWeergave(w: typeof weergave) {
  weergave = w;
  document.querySelectorAll<HTMLButtonElement>('[data-o-weergave]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.oWeergave === w)));
  svg().toggleAttribute('hidden', w !== 'boven');
  $('#o-voor').toggleAttribute('hidden', w !== 'voor');
  $('#o-3d').hidden = w !== '3d';
  $('#o-3d-knoppen').hidden = w !== '3d';
  $('#o-3d-instellingen').hidden = w !== '3d';
  $('#o-weergave-uitleg').textContent = w === 'boven' ? 'raster 10 cm · maten in cm' : w === 'voor' ? 'klik een element · sleep de grepen · maten in cm' : 'draai en zoom met muis of vinger';
  kiesGereedschap(gereedschap);
  if (w === '3d' && viewer === undefined) {
    viewer = maak3D($('#o-3d'), {
      zetel: true,
      // Klik op een deel van de zetel in 3D: dat element kiezen (eigenschappen, stof per element).
      opKlik: (id) => {
        geselecteerd = id && elementVan(id) ? id : null;
        toonEigenschappen();
        tekenCanvas();
      },
      // Echt 3D-model in beeld: de naamsvermelding (licentie) eronder.
      opEcht: (p) => {
        const bron = $('#o-3d-bron');
        bron.hidden = !p;
        bron.textContent = p?.vermelding ?? '';
      },
    });
    // Voor geautomatiseerde tests (Playwright): de 3D-weergave rechtstreeks bereikbaar.
    (window as unknown as { __zetel3d?: unknown }).__zetel3d = viewer;
    pas3DInstellingenToe();
  }
  toonWeergave();
}

function toonWeergave() {
  if (weergave === 'voor') tekenVoorvlak();
  if (weergave === '3d' && viewer) {
    viewer.formaat();
    // Heeft het model een echt 3D-bestand, dan beslist de motor of het past bij het ontwerp zoals het nu is.
    const model = getModellen().find((x) => x.code === ontwerp.model);
    const s = bouw3D(ontwerp, getCatalogus(), getMaterialen(), { echt3d: model?.echt3d });
    scene3D = s;
    viewer.toon(s);
    toonEchtVak(s);
  }
}

/** Echt 3D-model (proef): keuze met de benadering, of waarom het niet past. */
let echtAan = true;
let scene3D: Scene3D | null = null;
function toonEchtVak(s: Scene3D) {
  $('#o-3d-echt').hidden = !s.echt && !s.echtNiet;
  $('#o-3d-echt-keuze').hidden = !s.echt;
  document.querySelectorAll<HTMLButtonElement>('[data-echt]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.echt === 'aan') === echtAan)));
  $('#o-3d-echt-tekst').textContent = s.echt
    ? echtAan ? 'Proef: echt 3D-bestand, met onze stof en poten.' : 'Onze benadering met blokken, zoals bij de andere modellen.'
    : s.echtNiet ? `Echt 3D-model niet getoond: ${s.echtNiet} We tonen de benadering.` : '';
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

type OpzetSoort = 'rug-achter' | 'rug-links' | 'rug-rechts' | 'rugkussen' | 'sierkussen' | 'rolkussen';

/**
 * Past er nog een opzet-element van deze soort op het element, en hoe groot wordt het? Kussens van dezelfde soort
 * liggen naast elkaar en delen de breedte (vroeger kwamen het 2e en 3e kussen op dezelfde plaats, of kreeg een
 * rol- of rugkussen meteen een maatfout).
 */
function opzetMaat(drager: OntwerpElement, wat: OpzetSoort): { past: boolean; b: number; bestaande: OntwerpElement[] } {
  const B = drager.breedte, D = drager.diepte;
  const voor = voorkantRug(drager);
  if (wat === 'rolkussen') {
    const rk = typen.get('rolkussen')!;
    const b = Math.floor(Math.min(rk.breedte.standaard, D - voor - 8));
    return { past: b >= rk.breedte.min, b, bestaande: [] };
  }
  if (wat === 'rugkussen' || wat === 'sierkussen') {
    const k = typen.get(wat)!;
    const bestaande = opzetOp(drager).filter((o) => o.type === wat);
    const n = bestaande.length + 1;
    const b = Math.floor(Math.min(k.breedte.standaard, (B - 4 - (n - 1) * 2) / n));
    return { past: b >= k.breedte.min, b, bestaande };
  }
  const rl = typen.get('rugleuning')!;
  const lengte = wat === 'rug-achter' ? B : D - voor;
  return { past: lengte >= rl.breedte.min && lengte <= rl.breedte.max, b: lengte, bestaande: [] };
}

function voegOpzetToe(drager: OntwerpElement, wat: OpzetSoort) {
  const B = drager.breedte, D = drager.diepte;
  const t = (code: string) => typen.get(code)!;
  const maat = opzetMaat(drager, wat);
  if (!maat.past) return;
  const voor = voorkantRug(drager);
  onthoud();
  let nieuw: OntwerpElement;
  const dik = t('rugleuning').diepte.standaard;
  if (wat === 'rug-achter') nieuw = plaatsOp(drager, 'rugleuning', 0, 0, B, dik, 0);
  else if (wat === 'rug-links') nieuw = plaatsOp(drager, 'rugleuning', 0, voor, dik, D - voor, 270);
  else if (wat === 'rug-rechts') nieuw = plaatsOp(drager, 'rugleuning', B - dik, voor, dik, D - voor, 90);
  else if (wat === 'rolkussen') nieuw = plaatsOp(drager, 'rolkussen', 2, voor + 4, t('rolkussen').diepte.standaard, maat.b, 270);
  else {
    // Alle kussens van deze soort opnieuw naast elkaar leggen, elk even breed.
    const k = t(wat);
    const ly = voor + (wat === 'sierkussen' ? k.diepte.standaard + 2 : 0);
    maat.bestaande.forEach((o, i) => {
      const p = plaatsOp(drager, wat, 2 + i * (maat.b + 2), ly, maat.b, o.diepte, 0);
      Object.assign(o, { x: p.x, y: p.y, breedte: p.breedte, diepte: p.diepte, rotatie: p.rotatie });
    });
    nieuw = plaatsOp(drager, wat, 2 + maat.bestaande.length * (maat.b + 2), ly, maat.b, k.diepte.standaard, 0);
  }
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
  // Per collectie gegroepeerd, zodat de kleuren van één stof samen staan.
  materiaalOptiesPerCollectie(select, getMaterialen(), gekozen, metHoofd ? (el('option', { value: '' }, 'Zelfde als hoofdmateriaal') as HTMLOptionElement) : undefined);
}

let stalenkaart: ReturnType<typeof maakStalenkaart> | null = null;

/** Zit dit materiaal in het huidige ontwerp (hoofdmateriaal of een element)? */
export function materiaalInOntwerp(code: string): boolean {
  return ontwerp.hoofdmateriaal === code || ontwerp.elementen.some((e) => e.materiaal === code);
}

function vulHoofdmateriaal() {
  const s = $<HTMLSelectElement>('#o-hoofdmateriaal');
  if (!getMaterialen().some((m) => m.code === ontwerp.hoofdmateriaal)) ontwerp.hoofdmateriaal = getMaterialen()[0]?.code ?? '';
  materiaalOpties(s, ontwerp.hoofdmateriaal, false);
  vul3DStof();
  // Stalenkaart onder de keuzelijst: alle stoffen per collectie, met filters.
  if (!stalenkaart) {
    stalenkaart = maakStalenkaart({
      id: 'o-stalenkaart',
      materialen: getMaterialen,
      gekozen: () => ontwerp.hoofdmateriaal,
      opKies: (code) => {
        if (code === ontwerp.hoofdmateriaal) return;
        onthoud();
        ontwerp.hoofdmateriaal = code;
        s.value = code;
        $<HTMLSelectElement>('#o-3d-stof').value = code;
        gewijzigd();
      },
    });
    $('#o-stalenplek').append(stalenkaart.kaart);
  } else stalenkaart.ververs();
}

function toonEigenschappen() {
  const vak = $('#o-eigenschappen');
  const e = elementVan(geselecteerd);
  // Het gekozen element ook in de 3D aanduiden.
  if (weergave === '3d') viewer?.markeer?.(e ? e.id : null);
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
  // Losse rugleuning: de hoogte (bovenkant vanaf de vloer) rechtstreeks in te vullen. Voordien kon dat alleen met
  // de greep in het vooraanzicht, die moeilijk te vinden was.
  if (t.tekenstijl === 'rugleuning') {
    const min = Math.max(HOOGTE_BEREIK.rughoogte.min, Math.ceil(draagHoogteVan(ontwerp, getCatalogus(), e) + RUGLEUNING_MIN_BOVEN));
    const max = HOOGTE_BEREIK.rughoogte.max;
    const wrap = el('label', { for: 'o-rugleuninghoogte', class: 'maatveld' });
    const inp = el('input', { type: 'number', id: 'o-rugleuninghoogte', min: String(min), max: String(max), step: '1', value: String(Math.round(rugleuningTop(ontwerp, getCatalogus(), e))) }) as HTMLInputElement;
    inp.addEventListener('change', () => {
      const w = Number(inp.value);
      if (!Number.isFinite(w)) return;
      onthoud();
      e.vorm = { ...(e.vorm ?? {}), rughoogte: Math.round(Math.min(max, Math.max(min, w))) };
      toonEigenschappen();
      gewijzigd();
    });
    wrap.append(el('span', {}, 'Hoogte (cm)'), inp, el('span', { class: 'klein' }, `${min}–${max}, bovenkant vanaf de vloer`));
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
      hoogteVastgelegd(optieGroepVeld(g, e.opties?.[g.code] ?? g.standaard, `oe-${e.id}`, (code) => {
        onthoud();
        e.opties = { ...(e.opties ?? {}), [g.code]: code };
        gewijzigd();
      }), g.code),
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
        vormEffect(t.tekenstijl, gekozenOpties(ontwerp, getCatalogus(), e)),
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
      // De chaise longue heeft een eigen keuze "Rugleuning" (vast frame, met prijs): geen losse rugleuning erbovenop.
      if (t.tekenstijl === 'chaise' && wat.startsWith('rug-')) continue;
      const b = el('button', { type: 'button', class: 'tweede klein-knop' }, tekst) as HTMLButtonElement;
      if (!opzetMaat(e, wat).past) {
        b.disabled = true;
        b.title = 'Past niet (meer) op dit element';
      }
      b.addEventListener('click', () => voegOpzetToe(e, wat));
      rij2.append(b);
    }
    vak.append(rij2);
    if (t.tekenstijl === 'chaise') vak.append(el('p', { class: 'klein' }, 'Een rugleuning voor de chaise kies je hieronder bij "Rugleuning" (achteraan of langs de lange zijde).'));
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

/**
 * Stap 3 · Offerte: een overzicht om aan de klant te tonen, te kopiëren of af te drukken. Gebouwd uit dezelfde
 * gegevens als het ontwerp: omschrijving (core/ontwerptekst.ts), prijs, boven- en vooraanzicht en het 3D-beeld.
 */
export function toonOfferte() {
  herbereken(false);
  const r = resultaat;
  const vak = $('#of-inhoud');
  const model = getModellen().find((x) => x.code === ontwerp.model);
  const regels = ontwerpOmschrijving(ontwerp, getCatalogus(), getMaterialen(), r, { modelNaam: model?.naam, eur, modelVormgeving: model?.ontwerp.vormgeving });
  const kaart = el('section', { class: 'kaart offertekaart' });
  // Op papier staat de merknaam bovenaan (de kop van de pagina wordt niet afgedrukt).
  const merk = document.querySelector('header .merk')?.textContent?.trim();
  if (merk) kaart.append(el('p', { class: 'alleen-afdruk merkregel' }, merk));
  const kop = el('div', { class: 'kaartkop' });
  kop.append(el('h2', {}, model ? `Offerte · ${model.naam}` : 'Offerte · eigen ontwerp'), el('span', { class: 'klein' }, new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })));
  kaart.append(kop, el('p', { class: 'offertetitel' }, regels[0] ?? ''));
  if (!ontwerp.elementen.length) {
    kaart.append(el('p', {}, 'Er is nog geen ontwerp. Kies een model bij 1 · Modellen of teken er een bij 2 · Ontwerpen.'));
    vak.replaceChildren(kaart);
    return;
  }
  // Beelden: bovenaanzicht, vooraanzicht en (als de 3D al getoond werd) het 3D-beeld zoals het nu staat.
  const beelden = el('div', { class: 'offertebeelden' });
  const figuur = (titel: string, inhoud: string | HTMLElement) => {
    const f = el('figure');
    if (typeof inhoud === 'string') f.innerHTML = inhoud; else f.append(inhoud);
    f.append(el('figcaption', {}, titel));
    beelden.append(f);
  };
  const svgOpties = { breedtePx: 520, lijnkleur: '#2b2b28', maatkleur: '#3f5a52' };
  figuur('Bovenaanzicht (cm)', tekenSvg(r.tekening, svgOpties));
  figuur('Vooraanzicht (cm)', tekenSvg(tekenVooraanzicht(ontwerp, getCatalogus(), getMaterialen()), svgOpties));
  const canvas = document.querySelector<HTMLCanvasElement>('#o-3d canvas');
  if (viewer && canvas) {
    // Staat er een echt 3D-model in beeld, dan hoort de naamsvermelding (licentie) bij het beeld.
    const bron = $('#o-3d-bron');
    const titel = bron.hidden ? '3D' : `3D, echt 3D-model (proef). ${bron.textContent}`;
    try { figuur(titel, el('img', { src: canvas.toDataURL('image/jpeg', 0.9), alt: '3D-beeld van de zetel' })); } catch { /* geen 3D-beeld */ }
  }
  kaart.append(beelden);
  // Omschrijving: hoofdstof, de elementen en de keuzes voor de hele zetel.
  const hoofdstof = regels.find((x) => x.startsWith('Hoofdstof'));
  if (hoofdstof) kaart.append(el('p', {}, hoofdstof));
  const lijst = (titel: string, items: string[]) => {
    if (!items.length) return;
    const ul = el('ul', { class: 'offertelijst' });
    for (const x of items) ul.append(el('li', {}, x.replace(/^- /, '')));
    kaart.append(el('h3', {}, titel), ul);
  };
  lijst('Elementen', regels.filter((x) => /^- \d+\. /.test(x)));
  lijst('Afwerking voor de hele zetel', regels.filter((x) => x.startsWith('- ') && !/^- \d+\. /.test(x)));
  // Prijs (kostprijs en marge intern: verborgen in de klantweergave).
  const p = r.prijs;
  const rijen: [string, string, string?][] = [];
  if (p.kortingProcent) rijen.push(['Brutoprijs excl. btw', eur(p.brutoprijsExcl)], [`Korting ${getal(p.kortingProcent)} %`, `− ${eur(p.brutoprijsExcl - p.verkoopprijsExcl)}`]);
  rijen.push(['Prijs excl. btw', eur(p.verkoopprijsExcl)], [`Btw ${getal(getCatalogus().btwProcent)} %`, eur(p.btw)], ['Totaal incl. btw', eur(p.verkoopprijsIncl), 'totaal']);
  rijen.push(['Kostprijs', eur(p.kostprijs), 'intern'], ['Marge', p.margeProcent === null ? '—' : `${getal(p.margeProcent, 1)} %`, 'intern']);
  const dl = el('dl', { class: 'prijsdetail offerteprijs' });
  for (const [a, b, soort] of rijen) dl.append(el('dt', soort ? { class: soort } : {}, a), el('dd', soort ? { class: soort } : {}, b));
  kaart.append(el('h3', {}, 'Prijs'), dl);
  // Wat nog niet in orde is.
  if (r.meldingen.length) {
    const ul = el('ul', { class: 'meldingen' });
    for (const m of r.meldingen) ul.append(el('li', { class: `${m.ernst}${m.intern ? ' intern' : ''}` }, m.melding));
    if (!r.geldig) kaart.append(el('p', { class: 'offertewaarschuwing' }, 'Dit ontwerp heeft nog fouten: los ze op bij 2 · Ontwerpen voor je de offerte doorstuurt.'));
    kaart.append(ul);
  }
  kaart.append(el('p', { class: 'klein' }, 'Demo: prijzen, maten en stofverbruik zijn voorbeelden. Modellen zijn een benadering op basis van de productfoto.'));
  const knoppen = el('div', { class: 'acties geen-afdruk' });
  const knop = (tekst: string, f: () => void, klasse = '') => {
    const b = el('button', { type: 'button', ...(klasse ? { class: klasse } : {}) }, tekst) as HTMLButtonElement;
    b.addEventListener('click', f);
    knoppen.append(b);
  };
  const melding = el('span', { class: 'klein', role: 'status' });
  knop('Afdrukken of bewaren als PDF', () => window.print());
  knop('Kopieer offertetekst', () => void kopieer(regels.join('\n'), melding), 'tweede');
  knop('← Terug naar ontwerpen', () => { location.hash = 'ontwerp'; }, 'tweede');
  knoppen.append(melding);
  kaart.append(knoppen);
  vak.replaceChildren(kaart);
}

function elementCel(label: string, stof: string) {
  const td = el('td', { class: 'elementcel' });
  td.append(el('span', {}, label), el('span', { class: 'klein' }, stof));
  return td;
}

function herbereken(alles = true) {
  resultaat = berekenOntwerp(ontwerp, getCatalogus(), getMaterialen(), { kortingProcent: getKorting() });
  // Leeg tekenvlak: de startopstellingen tonen (anders blijven ze ingeklapt).
  if (!ontwerp.elementen.length) $<HTMLDetailsElement>('#o-opnieuw').open = true;
  tekenCanvas();
  if (!alles) return;
  const r = resultaat;
  const status = $('#o-status');
  const fouten = r.meldingen.filter((m) => m.ernst === 'fout').length;
  status.textContent = r.geldig ? 'Klaar voor offerte' : `${fouten} ${fouten === 1 ? 'fout' : 'fouten'} op te lossen`;
  status.className = `status ${r.geldig ? 'ok' : 'fout'}`;
  $('#o-prijs-excl').textContent = eur(r.prijs.verkoopprijsExcl);
  // Ook in de 3D-balk (handig in groot scherm, waar de zijbalk weg is).
  $('#o-3d-prijs').textContent = `${eur(r.prijs.verkoopprijsExcl)} excl. btw`;
  $('#o-prijs-incl').textContent = `${eur(r.prijs.verkoopprijsIncl)} incl. ${getCatalogus().btwProcent}% btw`;
  // Derde waarde: intern (kostprijs, marge, stofverbruik, artikelcode), verborgen in de klantweergave.
  const regels: [string, string, boolean?][] = [];
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
  regels.push(['Kostprijs', eur(r.prijs.kostprijs), true], ['Marge', r.prijs.margeProcent === null ? '—' : `${getal(r.prijs.margeProcent, 1)}%`, true]);
  regels.push(['Totale maat', `${getal(r.afmetingen.breedte, 1)} × ${getal(r.afmetingen.diepte, 1)} cm`]);
  for (const s of r.stof) {
    regels.push([`Stof ${s.naam}`, `${getal(s.meters, 1)} m`, true]);
    const m = getMaterialen().find((x) => x.naam === s.naam);
    if (m?.artikel) regels.push([m.artikel, m.martindale ? `Martindale ${getal(m.martindale)}` : '', true]);
  }
  $('#o-prijsdetail').replaceChildren(...regels.flatMap(([a, b, intern]) => [el('dt', intern ? { class: 'intern' } : {}, a), el('dd', intern ? { class: 'intern' } : {}, b)]));
  const lijst = $('#o-meldingen');
  // Interne meldingen (bv. onder de kostprijs) zijn verborgen in de klantweergave.
  lijst.replaceChildren(...r.meldingen.map((m) => el('li', { class: `${m.ernst}${m.intern ? ' intern' : ''}` }, m.melding)));
  lijst.hidden = r.meldingen.length === 0;
  const tbody = $('#o-elementen tbody');
  const mats = new Map(getMaterialen().map((m) => [m.code, m]));
  tbody.replaceChildren(
    ...r.elementen.map((x, n) => {
      const tr = el('tr', { class: x.id === geselecteerd ? 'actief' : '' });
      tr.append(
        el('td', { class: 'num' }, String(n + 1)),
        // Element en stof in één cel (stof eronder): zo past de prijs in de smalle kolom zonder stof over drie regels.
        // Een houten tussenstuk heeft geen stof: dan de houtafwerking.
        elementCel(x.label, x.materiaal ? `${mats.get(x.materiaal)?.naam ?? '—'} · groep ${x.groep}` : gekozenOpties(ontwerp, getCatalogus()).get('hout')?.label ?? 'hout'),
        el('td', { class: 'num' }, `${getal(x.breedte, 1)} × ${getal(x.diepte, 1)}`),
        // Zelfde prijs als bij het gekozen element: na de korting van de interieurinrichter.
        el('td', { class: 'num' }, eur(x.prijs * (1 - getKorting() / 100))),
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
    const groepen: [string, (t: ElementType) => boolean][] = [
      ['Zittingen', (t) => !t.opzet && DRAGER_STIJLEN.includes(t.tekenstijl)],
      ['Armen en tussenstukken', (t) => !t.opzet && (t.tekenstijl === 'arm' || t.tekenstijl === 'console')],
      ['Op een zitting', (t) => t.opzet === true],
    ];
    const geplaatst = new Set<string>();
    const groep = (titel: string, lijst: ElementType[]) => {
      if (!lijst.length) return;
      balk.append(el('h3', { class: 'gereedschapkop' }, titel));
      for (const t of lijst) { knop(t.code, `+ ${t.label}`); geplaatst.add(t.code); }
    };
    for (const [titel, hoort] of groepen) groep(titel, getCatalogus().typen.filter((t) => hoort(t)));
    groep('Overige', getCatalogus().typen.filter((t) => !geplaatst.has(t.code)));
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
    bevestigKnop(b, 'Klik nogmaals: ontwerp vervangen', () => {
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
    }, () => ontwerp.elementen.length > 0);
    start.append(b);
  }

  document.querySelectorAll<HTMLButtonElement>('[data-o-weergave]').forEach((b) =>
    b.addEventListener('click', () => kiesWeergave(b.dataset.oWeergave as typeof weergave)),
  );
  start3DInstellingen();
  document.querySelectorAll<HTMLButtonElement>('[data-standpunt]').forEach((b) =>
    b.addEventListener('click', () => viewer?.standpunt(b.dataset.standpunt as Standpunt)),
  );

  const hoofd = $<HTMLSelectElement>('#o-hoofdmateriaal');
  hoofd.addEventListener('change', () => {
    onthoud();
    ontwerp.hoofdmateriaal = hoofd.value;
    $<HTMLSelectElement>('#o-3d-stof').value = hoofd.value;
    gewijzigd();
    stalenkaart?.ververs();
  });
  $('#o-ongedaan').addEventListener('click', ongedaan);
  $('#o-naar-offerte').addEventListener('click', () => { location.hash = 'offerte'; });
  $('#o-kopieer').addEventListener('click', () => {
    // Volledige omschrijving (ook keuzes per element, getekende hoogtes, vormgeving en korting): zie core/ontwerptekst.ts.
    const model = getModellen().find((x) => x.code === ontwerp.model);
    const tekst = ontwerpOmschrijving(ontwerp, getCatalogus(), getMaterialen(), resultaat, { modelNaam: model?.naam, eur, modelVormgeving: model?.ontwerp.vormgeving }).join('\n');
    void kopieer(tekst, $('#o-kopieer-melding'));
  });

  const vv = voorvlak();
  zoomVoor = new Zoom({
    doel: vv, svg: voorvlak, passend: passendVoor, opnieuw: tekenVoorvlak, minBreedte: 40,
    wielZoomt: () => document.body.classList.contains('heeft-groot-scherm'),
    opKnijpen: () => { voorActie = null; pannen = undefined; },
  });
  const sb = svg();
  zoomBoven = new Zoom({
    doel: sb, svg, passend: passendBoven, opnieuw: tekenCanvas, minBreedte: 40,
    wielZoomt: () => document.body.classList.contains('heeft-groot-scherm'),
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
    // Een verwijderd materiaal: elementen met die stof volgen weer het hoofdmateriaal (en niet een onbekende code).
    const codes = new Set(getMaterialen().map((m) => m.code));
    for (const e of ontwerp.elementen) if (e.materiaal && !codes.has(e.materiaal)) delete e.materiaal;
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
