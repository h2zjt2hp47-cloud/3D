/// <reference path="./three.d.ts" />
/**
 * "In mijn kamer" (06-11): de geconfigureerde zetel in een foto van de eigen kamer, op de juiste schaal en in de gekozen
 * stof. Manier A uit "Analyse - zetel in eigen kamer": de gebruiker klikt de vier hoeken aan van iets met een gekende
 * maat op de vloer (A4, tegel, tapijt); de motor (`core/src/kamerfoto.ts`) rekent daaruit de camera van de foto terug.
 *
 * Alles gebeurt in de browser: de foto verlaat het toestel niet (geen upload, geen opslag in localStorage) en er is
 * geen server of AI-dienst. De 3D is een eigen, kleine weergave met een doorzichtige achtergrond boven de foto; de zetel
 * is een kopie uit de 3D van de ontwerper (`Viewer3D.kopie`), de opbouw in `core/src/ruimtelijk.ts` blijft dezelfde.
 *
 * Niet in deze eerste versie (zie de analyse, "Later"): automatische vloerherkenning, een "mooi beeld" met een
 * beeldmodel, echte AR op de gsm, voorwerpen voor de zetel uitknippen, meerdere meubels, het beeld op de offerte.
 */
import * as THREE_ from 'three';
import { WebGPURenderer } from 'three/webgpu';
import {
  afstand, cameraAssen, hoogteBoven, kalibreer, vloerpunt, KALIBRATIE_FOUT, LENS_BEREIK, type Kalibratie, type Punt2, type Vec3,
} from '../../core/src/kamerfoto.js';
import type { Viewer3D, ZetelKopie } from './drie-d.js';
import { bewaarBestand } from './bewaren.js';
import { el, svgEl } from './staat.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const THREE: any = THREE_;

/** De zin op het bewaarde beeld (advies uit de analyse; Jonas kan een andere kiezen). */
export const ZIN_OP_BEELD = 'Indicatief beeld. Controleer de maten ter plaatse.';
/** De foto wordt verkleind tot hoogstens zoveel pixels aan de lange zijde (ook de maat van het bewaarde beeld). */
const MAX_FOTO = 2560;
const MAATVOORWERPEN = {
  a4: { label: 'A4-blad (29,7 × 21 cm)', b: 29.7, d: 21 },
  tegel: { label: 'Vloertegel 60 × 60 cm', b: 60, d: 60 },
  eigen: { label: 'Eigen maat (tapijt, tegel …)', b: 200, d: 140 },
} as const;
type Maatvoorwerp = keyof typeof MAATVOORWERPEN;
const fmt = (x: number, d = 1) => x.toLocaleString('nl-BE', { maximumFractionDigits: d });

interface Weergave {
  renderer: any;
  scene: any;
  camera: any;
  zon: any;
  hemel: any;
  vul: any;
  houder: any;
  klaar: Promise<void>;
}

let venster: HTMLElement | null = null;
let w: Weergave | null = null;
/** Werkfoto (hoogstens MAX_FOTO px) en de aangeklikte hoeken in fotopixels. */
let foto: HTMLCanvasElement | null = null;
let punten: Punt2[] = [];
let kal: Kalibratie | null = null;
/** Lens van de schuifknop "Afstand tot de foto" (mm kleinbeeld); null = schatten uit de foto. */
let vasteLens: number | null = null;
let kopie: ZetelKopie | null = null;
let modus: 'hoeken' | 'zetel' | 'meten' = 'hoeken';
let meetpunten: Punt2[] = [];
const zetel = { x: 0, z: 0, hoek: 0, geplaatst: false };
let schaduwRichting = 135;
const proefdoos = { aan: false, b: 60, d: 40, h: 40 };

const q = <T extends Element = HTMLElement>(sel: string) => venster!.querySelector(sel) as T;

/** Opent het venster "In mijn kamer" met de zetel zoals hij nu in de 3D staat. */
export function openKamer(viewer: Viewer3D | null | undefined) {
  if (!venster) venster = bouwVenster();
  kopie = viewer?.kopie?.() ?? null;
  venster.hidden = false;
  document.body.classList.add('heeft-kamer');
  zetMelding(kopie ? '' : 'Er staat nog geen zetel in de 3D. Kies eerst een model of teken een zetel.', !kopie);
  if (w && kopie) zetZetel();
  pasAan();
  (q<HTMLButtonElement>(foto ? '#kamer-sluit' : '#kamer-kies')).focus();
}

function sluit() {
  if (!venster) return;
  venster.hidden = true;
  document.body.classList.remove('heeft-kamer');
  // De foto niet bewaren: weg bij het sluiten.
  foto = null;
  punten = [];
  kal = null;
  vasteLens = null;
  meetpunten = [];
  zetel.geplaatst = false;
  q('#kamer-foto').replaceChildren();
  if (w) { w.houder.clear(); w.houder.userData.inhoud = ''; }
  kopie = null;
  toonStappen();
  teken();
}

// ---------- venster ----------

function bouwVenster() {
  const v = el('div', { id: 'kamer', class: 'kamer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'kamer-titel' });
  v.hidden = true;
  v.innerHTML = `
    <div class="kamer-kop">
      <h2 id="kamer-titel">In mijn kamer</h2>
      <span class="kamer-uitleg">Je zetel in een foto van je eigen kamer. De foto blijft op dit toestel.</span>
      <button type="button" class="tweede" id="kamer-sluit">Sluiten</button>
    </div>
    <div class="kamer-inhoud">
      <div class="kamer-podium-vak">
        <div class="kamer-podium" id="kamer-podium">
          <div id="kamer-foto" class="kamer-laag"></div>
          <div id="kamer-3d" class="kamer-laag"></div>
          <svg id="kamer-lagen" class="kamer-laag" aria-hidden="true"></svg>
          <canvas id="kamer-loep" class="kamer-loep" width="150" height="150" hidden></canvas>
          <div id="kamer-leeg" class="kamer-leeg">
            <p><strong>Kies een foto van je kamer.</strong></p>
            <p>Maak de foto liefst van een lege plek, rechtstaand, met de vloer goed in beeld. Leg een A4-blad of iets anders met een gekende maat op de vloer, op de plaats van de zetel.</p>
          </div>
        </div>
      </div>
      <div class="kamer-paneel">
        <div id="kamer-melding" class="kamer-melding" role="status" aria-live="polite" hidden></div>
        <section>
          <h3>1 · Foto</h3>
          <label class="kamer-bestand"><input type="file" id="kamer-bestand" accept="image/jpeg,image/png"><button type="button" id="kamer-kies">Foto kiezen</button></label>
          <p class="kamer-klein">JPG of PNG. Maak de foto liefst van een lege plek: een tafel vóór de zetel komt in het beeld achter de zetel.</p>
        </section>
        <section id="kamer-stap-maat" class="kamer-stap">
          <h3>2 · Maatvoorwerp op de vloer</h3>
          <label><span>Wat ligt er op de vloer?</span><select id="kamer-voorwerp"></select></label>
          <div class="kamer-rij">
            <label><span>Lange zijde (cm)</span><input type="number" id="kamer-b" min="5" max="1000" step="0.1"></label>
            <label><span>Korte zijde (cm)</span><input type="number" id="kamer-d" min="5" max="1000" step="0.1"></label>
          </div>
          <p class="kamer-klein" id="kamer-hoeken-uitleg">Klik de vier hoeken aan, de ene na de andere rond de rand, en begin met de lange zijde. Houd ingedrukt om met het vergrootglas precies te mikken; sleep een hoek om hem bij te stellen.</p>
          <div class="kamer-rij"><span id="kamer-teller" class="kamer-teller">0 van 4 hoeken</span><button type="button" class="tweede" id="kamer-opnieuw">Hoeken opnieuw</button></div>
          <label id="kamer-lens-vak" hidden><span>Afstand tot de foto <output id="kamer-lens-waarde"></output></span><input type="range" id="kamer-lens" min="${LENS_BEREIK.min}" max="${LENS_BEREIK.max}" step="1"><button type="button" class="tweede" id="kamer-lens-auto">Automatisch</button></label>
        </section>
        <section id="kamer-stap-zetel" class="kamer-stap">
          <h3>3 · Zetel plaatsen</h3>
          <p class="kamer-klein">Sleep de zetel over de vloer, of klik waar hij moet staan. De grootte ligt vast: die volgt uit de maat.</p>
          <label><span>Draaien <output id="kamer-hoek-waarde"></output></span><input type="range" id="kamer-hoek" min="-180" max="180" step="5"></label>
          <div class="kamer-rij"><button type="button" class="tweede" id="kamer-links" aria-label="15 graden naar links draaien">↺ 15°</button><button type="button" class="tweede" id="kamer-rechts" aria-label="15 graden naar rechts draaien">↻ 15°</button><button type="button" class="tweede" id="kamer-midden">Opnieuw plaatsen</button></div>
          <label><span>Licht: richting van de schaduw</span><input type="range" id="kamer-schaduw" min="0" max="345" step="15"></label>
          <label class="vink"><input type="checkbox" id="kamer-toon-hoeken" checked> Hoeken van het maatvoorwerp tonen</label>
        </section>
        <section id="kamer-stap-bewaar" class="kamer-stap">
          <h3>4 · Bewaren</h3>
          <button type="button" id="kamer-bewaar">Beeld bewaren (PNG)</button>
          <p class="kamer-klein">Met de zin "${ZIN_OP_BEELD}" Het licht van de foto komt niet mee: de stofkleur is indicatief.</p>
        </section>
        <details class="kamer-proef" id="kamer-proef">
          <summary>Maatproef (voor de test)</summary>
          <p class="kamer-klein">Een doos van gekende maat in de plaats van de zetel: zet hem op de echte doos in de foto en vergelijk. Of meet: klik twee punten op de vloer (afstand) en daarna een punt recht boven het tweede (hoogte).</p>
          <label class="vink"><input type="checkbox" id="kamer-doos"> Proefdoos in plaats van de zetel</label>
          <div class="kamer-rij">
            <label><span>Breedte</span><input type="number" id="kamer-doos-b" min="5" max="400" step="1"></label>
            <label><span>Diepte</span><input type="number" id="kamer-doos-d" min="5" max="400" step="1"></label>
            <label><span>Hoogte</span><input type="number" id="kamer-doos-h" min="5" max="300" step="1"></label>
          </div>
          <div class="kamer-rij"><button type="button" class="tweede" id="kamer-meet">Meten</button><span id="kamer-meting" class="kamer-teller"></span></div>
        </details>
      </div>
    </div>`;
  document.body.append(v);
  const keuze = v.querySelector<HTMLSelectElement>('#kamer-voorwerp')!;
  keuze.replaceChildren(...Object.entries(MAATVOORWERPEN).map(([k, m]) => el('option', { value: k }, m.label)));
  const b = v.querySelector<HTMLInputElement>('#kamer-b')!, d = v.querySelector<HTMLInputElement>('#kamer-d')!;
  const zetMaat = () => { const m = MAATVOORWERPEN[keuze.value as Maatvoorwerp]; b.value = String(m.b); d.value = String(m.d); };
  zetMaat();
  keuze.addEventListener('change', () => { zetMaat(); herreken(); });
  for (const i of [b, d]) i.addEventListener('input', () => { keuze.value = 'eigen'; herreken(); });
  v.querySelector('#kamer-sluit')!.addEventListener('click', sluit);
  v.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); sluit(); } });
  const bestand = v.querySelector<HTMLInputElement>('#kamer-bestand')!;
  v.querySelector('#kamer-kies')!.addEventListener('click', () => bestand.click());
  bestand.addEventListener('change', () => { const f = bestand.files?.[0]; bestand.value = ''; if (f) void laadFoto(f); });
  v.querySelector('#kamer-opnieuw')!.addEventListener('click', () => { punten = []; kal = null; modus = 'hoeken'; meetpunten = []; zetel.geplaatst = false; herreken(); });
  const lens = v.querySelector<HTMLInputElement>('#kamer-lens')!;
  lens.addEventListener('input', () => { vasteLens = Number(lens.value); herreken(); });
  v.querySelector('#kamer-lens-auto')!.addEventListener('click', () => { vasteLens = null; herreken(); });
  const hoek = v.querySelector<HTMLInputElement>('#kamer-hoek')!;
  hoek.addEventListener('input', () => { zetel.hoek = Number(hoek.value); zetZetel(); });
  const draai = (g: number) => { zetel.hoek = ((((zetel.hoek + g + 180) % 360) + 360) % 360) - 180; zetZetel(); };
  v.querySelector('#kamer-links')!.addEventListener('click', () => draai(-15));
  v.querySelector('#kamer-rechts')!.addEventListener('click', () => draai(15));
  v.querySelector('#kamer-midden')!.addEventListener('click', () => { zetel.geplaatst = false; zetZetel(); });
  const schaduw = v.querySelector<HTMLInputElement>('#kamer-schaduw')!;
  schaduw.value = String(schaduwRichting);
  schaduw.addEventListener('input', () => { schaduwRichting = Number(schaduw.value); zetZon(); teken(); });
  v.querySelector('#kamer-toon-hoeken')!.addEventListener('change', tekenLagen);
  v.querySelector('#kamer-bewaar')!.addEventListener('click', () => void bewaarBeeld());
  // Maatproef: proefdoos en meten.
  const doos = v.querySelector<HTMLInputElement>('#kamer-doos')!;
  const db = v.querySelector<HTMLInputElement>('#kamer-doos-b')!, dd = v.querySelector<HTMLInputElement>('#kamer-doos-d')!, dh = v.querySelector<HTMLInputElement>('#kamer-doos-h')!;
  db.value = String(proefdoos.b); dd.value = String(proefdoos.d); dh.value = String(proefdoos.h);
  const leesDoos = () => {
    proefdoos.aan = doos.checked;
    proefdoos.b = Number(db.value) || proefdoos.b; proefdoos.d = Number(dd.value) || proefdoos.d; proefdoos.h = Number(dh.value) || proefdoos.h;
    zetZetel();
  };
  for (const i of [doos, db, dd, dh]) i.addEventListener('input', leesDoos);
  v.querySelector('#kamer-meet')!.addEventListener('click', () => {
    if (!kal) return;
    modus = modus === 'meten' ? 'zetel' : 'meten';
    meetpunten = [];
    toonStappen();
    tekenLagen();
  });
  startPodium(v);
  new ResizeObserver(() => pasAan()).observe(v.querySelector('.kamer-podium-vak')!);
  window.addEventListener('resize', () => { if (!v.hidden) pasAan(); });
  // Voor geautomatiseerde tests (alleen lezen en hoeken zetten zoals een klik).
  (window as unknown as { __kamer?: unknown }).__kamer = {
    kalibratie: () => kal,
    foto: () => (foto ? { breedte: foto.width, hoogte: foto.height } : null),
    zetPunten: (p: Punt2[]) => { punten = p.slice(0, 4); herreken(); },
    zetZetel: (x: number, z: number, hoek: number) => { zetel.x = x; zetel.z = z; zetel.hoek = hoek; zetel.geplaatst = true; zetZetel(); },
    vloerpunt: (p: Punt2) => (kal ? vloerpunt(kal.camera, p) : null),
    beeld: () => samengesteld()?.toDataURL('image/png') ?? null,
  };
  return v;
}

function zetMelding(tekst: string, fout = false) {
  const m = q('#kamer-melding');
  m.hidden = !tekst;
  m.textContent = tekst;
  m.classList.toggle('fout', fout);
}

/** Welke stappen bruikbaar zijn, tellers en waarden van de knoppen. */
function toonStappen() {
  if (!venster) return;
  const heeftFoto = !!foto;
  q('#kamer-leeg').hidden = heeftFoto;
  q('#kamer-stap-maat').classList.toggle('uit', !heeftFoto);
  q('#kamer-stap-zetel').classList.toggle('uit', !kal);
  q('#kamer-stap-bewaar').classList.toggle('uit', !kal);
  for (const k of venster.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('#kamer-stap-maat input, #kamer-stap-maat select, #kamer-stap-maat button')) k.disabled = !heeftFoto;
  for (const k of venster.querySelectorAll<HTMLInputElement | HTMLButtonElement>('#kamer-stap-zetel input, #kamer-stap-zetel button, #kamer-stap-bewaar button, #kamer-meet')) k.disabled = !kal || (!kopie && !proefdoos.aan && k.id !== 'kamer-meet');
  q('#kamer-teller').textContent = `${punten.length} van 4 hoeken`;
  q<HTMLInputElement>('#kamer-hoek').value = String(Math.round(zetel.hoek));
  q('#kamer-hoek-waarde').textContent = `${Math.round(zetel.hoek)}°`;
  const lensVak = q('#kamer-lens-vak');
  lensVak.hidden = !kal || !(vasteLens !== null || kal.aanwijzingen.includes('standaardlens') || kal.aanwijzingen.includes('onzeker'));
  if (kal) {
    q<HTMLInputElement>('#kamer-lens').value = String(Math.round(vasteLens ?? kal.camera.mm));
    q('#kamer-lens-waarde').textContent = `(lens ${Math.round(vasteLens ?? kal.camera.mm)} mm)`;
  }
  q<HTMLButtonElement>('#kamer-lens-auto').hidden = vasteLens === null;
  q('#kamer-meet').textContent = modus === 'meten' ? 'Stoppen met meten' : 'Meten';
  q('#kamer-podium').dataset.modus = modus;
}

// ---------- foto ----------

async function laadFoto(bestand: File) {
  if (!/^image\/(jpeg|png)$/.test(bestand.type)) { zetMelding('Kies een foto in JPG of PNG.', true); return; }
  // Alleen lokaal: een tijdelijk adres in de browser, meteen weer vrijgegeven. De browser past de EXIF-oriëntatie toe
  // (staande gsm-foto's staan rechtop); de metadata gaan niet mee naar de werkfoto en dus ook niet naar het bewaarde beeld.
  const adres = URL.createObjectURL(bestand);
  try {
    const img = new Image();
    img.src = adres;
    await img.decode();
    const s = Math.min(1, MAX_FOTO / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    const g = c.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    foto = c;
  } catch {
    zetMelding('Deze foto kan niet gelezen worden. Kies een andere foto (JPG of PNG).', true);
    return;
  } finally {
    URL.revokeObjectURL(adres);
  }
  foto.className = 'kamer-fotobeeld';
  q('#kamer-foto').replaceChildren(foto);
  punten = []; kal = null; vasteLens = null; modus = 'hoeken'; meetpunten = []; zetel.geplaatst = false;
  zetMelding(window.innerWidth < 600 ? 'Op een gsm is het aanklikken klein: houd ingedrukt en mik met het vergrootglas, of gebruik een computer of tablet.' : '');
  pasAan();
  herreken();
}

// ---------- podium: schaal, aanklikken, slepen ----------

/** Schaal van fotopixels naar schermpixels. */
let schaal = 1;

/** Het podium zo groot als past, in de verhouding van de foto. */
function pasAan() {
  if (!venster || venster.hidden) return;
  const vak = q('.kamer-podium-vak'), podium = q('#kamer-podium');
  const fw = foto?.width ?? 1600, fh = foto?.height ?? 1000;
  // Beschikbare ruimte zonder de binnenrand; op een smal scherm (onder elkaar) bepaalt de foto zelf de hoogte.
  const st = getComputedStyle(vak), smal = window.innerWidth <= 900;
  const bw = Math.max(200, vak.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight));
  const bh = Math.max(200, smal ? window.innerHeight * 0.62 : vak.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom));
  schaal = Math.min(bw / fw, bh / fh);
  const cw = Math.floor(fw * schaal), ch = Math.floor(fh * schaal);
  podium.style.width = `${cw}px`;
  podium.style.height = `${ch}px`;
  if (w) {
    w.renderer.setSize(cw, ch);
    w.camera.aspect = fw / fh;
    w.camera.updateProjectionMatrix();
  }
  tekenLagen();
  teken();
}

/** Schermpositie (event) → fotopixels. */
function inFoto(e: PointerEvent): Punt2 {
  const r = q('#kamer-podium').getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * foto!.width, y: ((e.clientY - r.top) / r.height) * foto!.height };
}

function startPodium(v: HTMLElement) {
  const podium = v.querySelector<HTMLElement>('#kamer-podium')!;
  podium.style.touchAction = 'none';
  let sleep: { soort: 'hoek'; i: number } | { soort: 'zetel'; dx: number; dz: number } | null = null;
  podium.addEventListener('pointerdown', (e) => {
    if (!foto || e.button > 0) return;
    const p = inFoto(e);
    const doel = (e.target as Element).closest?.('[data-hoek]');
    if (doel) {
      sleep = { soort: 'hoek', i: Number((doel as HTMLElement).dataset.hoek) };
    } else if (modus === 'hoeken' && punten.length < 4) {
      punten.push(p);
      sleep = { soort: 'hoek', i: punten.length - 1 };
      herreken();
    } else if (modus === 'meten' && kal) {
      meetpunten = meetpunten.length >= 3 ? [p] : [...meetpunten, p];
      toonMeting();
      tekenLagen();
      return;
    } else if (kal) {
      // Zetel slepen: geraakt = met de greep waar je hem nam, ernaast = de zetel springt naar die plaats.
      const v0 = vloerpunt(kal.camera, p);
      if (!v0) return;
      const raak = raaktZetel(e);
      sleep = raak ? { soort: 'zetel', dx: zetel.x - v0[0], dz: zetel.z - v0[2] } : { soort: 'zetel', dx: 0, dz: 0 };
      podium.classList.add('sleept');
      if (!raak) { zetel.x = v0[0]; zetel.z = v0[2]; zetel.geplaatst = true; zetZetel(); }
    }
    if (sleep) {
      podium.setPointerCapture(e.pointerId);
      if (sleep.soort === 'hoek') toonLoep(p, e);
      e.preventDefault();
    }
  });
  podium.addEventListener('pointermove', (e) => {
    if (!sleep || !foto) return;
    const p = inFoto(e);
    if (sleep.soort === 'hoek') {
      punten[sleep.i] = { x: Math.max(0, Math.min(foto.width, p.x)), y: Math.max(0, Math.min(foto.height, p.y)) };
      toonLoep(punten[sleep.i]!, e);
      herreken();
    } else if (kal) {
      const v0 = vloerpunt(kal.camera, p);
      if (!v0) return;
      zetel.x = v0[0] + sleep.dx; zetel.z = v0[2] + sleep.dz; zetel.geplaatst = true;
      zetZetel();
    }
  });
  const stop = () => { sleep = null; q('#kamer-loep').hidden = true; podium.classList.remove('sleept'); };
  podium.addEventListener('pointerup', stop);
  podium.addEventListener('pointercancel', stop);
}

/** Vergrootglas (3 × de schermgrootte) naast de vinger of muis, met een kruisje op het punt. */
function toonLoep(p: Punt2, e: PointerEvent) {
  const loep = q<HTMLCanvasElement>('#kamer-loep');
  if (!foto) return;
  const pr = Math.min(2, window.devicePixelRatio || 1), maat = 150;
  if (loep.width !== maat * pr) { loep.width = loep.height = maat * pr; }
  const g = loep.getContext('2d')!;
  const zicht = maat / (schaal * 3);
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#000';
  g.fillRect(0, 0, loep.width, loep.height);
  g.drawImage(foto, p.x - zicht / 2, p.y - zicht / 2, zicht, zicht, 0, 0, loep.width, loep.height);
  g.strokeStyle = '#ff3b30';
  g.lineWidth = pr;
  const m = loep.width / 2;
  g.beginPath(); g.moveTo(m, 0); g.lineTo(m, m - 6 * pr); g.moveTo(m, m + 6 * pr); g.lineTo(m, loep.width); g.moveTo(0, m); g.lineTo(m - 6 * pr, m); g.moveTo(m + 6 * pr, m); g.lineTo(loep.width, m); g.stroke();
  const r = q('#kamer-podium').getBoundingClientRect();
  // Boven-links van het punt (niet onder de vinger); aan de rand naar de andere kant.
  let x = e.clientX - r.left - maat - 30, y = e.clientY - r.top - maat - 30;
  if (x < 0) x = e.clientX - r.left + 30;
  if (y < 0) y = e.clientY - r.top + 30;
  loep.style.left = `${x}px`;
  loep.style.top = `${y}px`;
  loep.hidden = false;
}

/** Hoeken, randen met hun maat, meetlijnen. */
function tekenLagen() {
  if (!venster) return;
  const svg = q<SVGSVGElement>('#kamer-lagen');
  svg.replaceChildren();
  if (!foto) return;
  svg.setAttribute('viewBox', `0 0 ${foto.width} ${foto.height}`);
  const px = 1 / schaal;
  const tonen = q<HTMLInputElement>('#kamer-toon-hoeken').checked || !kal;
  if (tonen && punten.length) {
    const lijn = kal ? kal.punten : punten;
    // Na het berekenen lichter: de zetel staat er vaak bovenop.
    const laag = svgEl('g', { class: kal ? 'kamer-klaar' : '' });
    svg.append(laag);
    if (lijn.length > 1) laag.append(svgEl(lijn.length === 4 ? 'polygon' : 'polyline', { points: lijn.map((p) => `${p.x},${p.y}`).join(' '), class: 'kamer-vorm', 'stroke-width': 2 * px }));
    // Midden van de punten: nummers en maten naar buiten toe, weg van de vorm.
    const mx = lijn.reduce((t, p) => t + p.x, 0) / lijn.length, my = lijn.reduce((t, p) => t + p.y, 0) / lijn.length;
    const naarBuiten = (x: number, y: number, afstandPx: number) => {
      const dx = x - mx, dy = y - my, l = Math.hypot(dx, dy) || 1;
      return { x: x + (dx / l) * afstandPx * px, y: y + (dy / l) * afstandPx * px };
    };
    // Maat bij de randen: de eerste rand is de lange zijde (of wat de berekening koos).
    const m1 = Number(q<HTMLInputElement>('#kamer-b').value), m2 = Number(q<HTMLInputElement>('#kamer-d').value);
    const lang = Math.max(m1, m2), kort = Math.min(m1, m2);
    const eerste = !kal || kal.eersteZijdeB ? lang : kort, tweede = eerste === lang ? kort : lang;
    for (let i = 0; i < Math.min(lijn.length - 1, 2); i++) {
      const a = lijn[i]!, c = lijn[i + 1]!;
      const plek = lijn.length > 2 ? naarBuiten((a.x + c.x) / 2, (a.y + c.y) / 2, 16) : { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 - 14 * px };
      const t = svgEl('text', { x: plek.x, y: plek.y, class: 'kamer-maat', 'font-size': 13 * px, 'stroke-width': 3 * px, 'dominant-baseline': 'middle' });
      t.textContent = `${fmt(i === 0 ? eerste : tweede)} cm`;
      laag.append(t);
    }
    // Greep van 16 px rond elke hoek, kleiner als de hoeken dicht bij elkaar liggen (een klein A4 op een gsm): anders
    // raakt een nieuwe tik de greep van een vorige hoek.
    let kortste = Infinity;
    for (let i = 0; i < punten.length; i++) for (let j = i + 1; j < punten.length; j++) kortste = Math.min(kortste, Math.hypot(punten[i]!.x - punten[j]!.x, punten[i]!.y - punten[j]!.y));
    // Zolang er nog hoeken bij moeten, alleen de stip zelf: een tik ernaast is een nieuwe hoek.
    const greep = punten.length < 4 ? 5 * px : Math.max(4 * px, Math.min(16 * px, kortste * 0.4));
    punten.forEach((p, i) => {
      const g = svgEl('g', { 'data-hoek': i, class: 'kamer-hoek' });
      g.append(svgEl('circle', { cx: p.x, cy: p.y, r: greep, class: 'kamer-greep' }), svgEl('circle', { cx: p.x, cy: p.y, r: 4 * px, class: 'kamer-stip', 'stroke-width': 1.5 * px }));
      const plek = punten.length > 2 ? naarBuiten(p.x, p.y, 14) : { x: p.x - 12 * px, y: p.y - 12 * px };
      const t = svgEl('text', { x: plek.x, y: plek.y, class: 'kamer-nummer', 'font-size': 12 * px, 'stroke-width': 3 * px, 'dominant-baseline': 'middle' });
      t.textContent = String(i + 1);
      g.append(t);
      laag.append(g);
    });
  }
  if (modus === 'meten' && kal) {
    meetpunten.forEach((p) => svg.append(svgEl('circle', { cx: p.x, cy: p.y, r: 4 * px, class: 'kamer-meetpunt', 'stroke-width': 1.5 * px })));
    if (meetpunten.length >= 2) svg.append(svgEl('line', { x1: meetpunten[0]!.x, y1: meetpunten[0]!.y, x2: meetpunten[1]!.x, y2: meetpunten[1]!.y, class: 'kamer-meetlijn', 'stroke-width': 2 * px }));
    if (meetpunten.length === 3) svg.append(svgEl('line', { x1: meetpunten[1]!.x, y1: meetpunten[1]!.y, x2: meetpunten[2]!.x, y2: meetpunten[2]!.y, class: 'kamer-meetlijn', 'stroke-width': 2 * px }));
  }
}

function toonMeting() {
  const uit = q('#kamer-meting');
  if (!kal || modus !== 'meten') { uit.textContent = ''; return; }
  if (meetpunten.length < 2) { uit.textContent = meetpunten.length ? 'Klik het tweede punt op de vloer.' : 'Klik een punt op de vloer.'; return; }
  const a = vloerpunt(kal.camera, meetpunten[0]!), b = vloerpunt(kal.camera, meetpunten[1]!);
  if (!a || !b) { uit.textContent = 'Dat punt ligt niet op de vloer.'; return; }
  let tekst = `Afstand op de vloer: ${fmt(afstand(a, b))} cm`;
  if (meetpunten.length === 3) tekst += ` · hoogte boven het tweede punt: ${fmt(hoogteBoven(kal.camera, b, meetpunten[2]!))} cm`;
  else tekst += ' · klik een punt recht erboven voor de hoogte.';
  uit.textContent = tekst;
}

// ---------- berekenen ----------

/** Na elke wijziging van de hoeken, de maat of de lens. */
function herreken() {
  if (!venster) return;
  const b = Number(q<HTMLInputElement>('#kamer-b').value), d = Number(q<HTMLInputElement>('#kamer-d').value);
  kal = null;
  let melding = '', fout = false;
  if (foto && punten.length === 4) {
    // Eerst langs de lange zijde geklikt (zo staat het in de uitleg): een voorkeur, de foto kan anders beslissen.
    const k = kalibreer(punten, { b: Math.max(b, d), d: Math.min(b, d) }, { breedte: foto.width, hoogte: foto.height }, { ...(vasteLens ? { mm: vasteLens } : {}), eersteZijdeB: true });
    if (typeof k === 'string') { melding = KALIBRATIE_FOUT[k]; fout = true; }
    else {
      kal = k;
      if (modus === 'hoeken') modus = 'zetel';
      const deel: string[] = [];
      if (k.aanwijzingen.includes('klein')) deel.push(`Kies iets groters: het maatvoorwerp beslaat maar ${fmt(k.vlak * 100)} % van de foto. Een vloertegel of een tapijt geeft een betere maat.`);
      if (k.aanwijzingen.includes('onzeker')) deel.push('De hoeken passen niet goed bij een rechthoek van deze maat. Controleer de hoeken en de maat, of stel de afstand tot de foto bij.');
      if (k.aanwijzingen.includes('standaardlens')) deel.push(`De lens van de foto is niet te bepalen: we rekenen met ${LENS_BEREIK.standaard} mm. Is de zetel te groot of te klein, stel dan de afstand tot de foto bij.`);
      // Op een gsm: een maatvoorwerp van een paar pixels is niet precies aan te klikken.
      const kortsteZijde = Math.min(...k.punten.map((p, i) => Math.hypot(p.x - k.punten[(i + 1) % 4]!.x, p.y - k.punten[(i + 1) % 4]!.y))) * schaal;
      if (window.innerWidth < 600 && kortsteZijde < 24) deel.unshift('Het maatvoorwerp is op dit scherm te klein om precies aan te klikken. Gebruik liever een computer of tablet, of iets groters (een tegel of tapijt).');
      melding = deel.join(' ');
    }
  } else if (foto) modus = 'hoeken';
  zetMelding(melding || (!kopie && foto ? 'Er staat nog geen zetel in de 3D. Kies eerst een model of teken een zetel.' : ''), fout);
  toonStappen();
  tekenLagen();
  toonMeting();
  if (kal) zorgWeergave().then(() => { zetCamera(); zetZetel(); }).catch(() => undefined);
  else teken();
}

// ---------- 3D ----------

/** De kleine 3D-weergave boven de foto (WebGPU waar het kan, anders WebGL2 met een bewaard beeld, zoals de ontwerper). */
function zorgWeergave(): Promise<void> {
  if (w) return w.klaar;
  const houder = q('#kamer-3d');
  let renderer: any;
  const webgl2 = (canvas: HTMLCanvasElement) => canvas.getContext('webgl2', { antialias: true, alpha: true, depth: true, stencil: false, preserveDrawingBuffer: true });
  try {
    if ('gpu' in navigator) {
      const parameters: Record<string, unknown> = { antialias: true, alpha: true };
      renderer = new WebGPURenderer(parameters);
      const terugval = renderer._getFallback;
      if (terugval) renderer._getFallback = (fout: unknown) => { parameters.context = webgl2(renderer.domElement) ?? undefined; return terugval(fout); };
    } else {
      const canvas = document.createElement('canvas');
      const context = webgl2(canvas);
      if (!context) throw new Error('geen WebGL2');
      renderer = new WebGPURenderer({ canvas, context, antialias: true, alpha: true, forceWebGL: true });
    }
  } catch {
    zetMelding('3D wordt niet ondersteund in deze browser.', true);
    return Promise.reject(new Error('geen 3D'));
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  houder.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1.5, 5, 20000);
  const hemel = new THREE.HemisphereLight(0xffffff, 0xb8b2a7, 0.34 * Math.PI);
  const zon = new THREE.DirectionalLight(0xffffff, 0.8 * Math.PI);
  zon.castShadow = true;
  zon.shadow.mapSize.set(2048, 2048);
  zon.shadow.radius = 7;
  zon.shadow.blurSamples = 10;
  zon.shadow.bias = -0.0002;
  const vul = new THREE.DirectionalLight(0xffffff, 0.16 * Math.PI);
  // De vloer van de foto: onzichtbaar, alleen de schaduw van de zetel.
  const vloer = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.ShadowMaterial({ opacity: 0.4, color: 0x000000 }));
  vloer.rotation.x = -Math.PI / 2;
  vloer.receiveShadow = true;
  const houderZetel = new THREE.Group();
  scene.add(hemel, zon, zon.target, vul, vloer, houderZetel);
  const nieuw: Weergave = { renderer, scene, camera, zon, hemel, vul, houder: houderZetel, klaar: Promise.resolve() };
  nieuw.klaar = renderer.init().then(() => {
    renderer.domElement.dataset.backend = renderer.backend?.isWebGPUBackend ? 'webgpu' : 'webgl2';
    pasAan();
  });
  w = nieuw;
  return nieuw.klaar;
}

function zetCamera() {
  if (!w || !kal || !foto) return;
  const a = cameraAssen(kal.camera);
  const v = (x: Vec3) => new THREE.Vector3(x[0], x[1], x[2]);
  w.camera.fov = a.kijkhoek;
  w.camera.aspect = foto.width / foto.height;
  w.camera.near = 5;
  w.camera.far = 50000;
  w.camera.updateProjectionMatrix();
  new THREE.Matrix4().makeBasis(v(a.rechts), v(a.boven), v(a.achter)).setPosition(v(a.positie)).decompose(w.camera.position, w.camera.quaternion, w.camera.scale);
  w.camera.updateMatrixWorld(true);
}

/**
 * Beginplaats: waar het maatvoorwerp ligt (de uitleg vraagt het op de plaats van de zetel te leggen), met de voorkant van
 * de zetel door het midden ervan en naar de camera gekeerd.
 */
function beginplaats() {
  if (!kal || !foto) return;
  const c = kal.camera;
  const m = kal.hoeken.reduce((s, h) => [s[0] + h[0] / 4, 0, s[2] + h[2] / 4] as Vec3, [0, 0, 0] as Vec3);
  const dx = c.positie[0] - m[0], dz = c.positie[2] - m[2], l = Math.hypot(dx, dz) || 1;
  const diepte = proefdoos.aan ? proefdoos.d : kopie?.kader.d ?? 90;
  zetel.x = m[0] - (dx / l) * (diepte / 2);
  zetel.z = m[2] - (dz / l) * (diepte / 2);
  zetel.hoek = Math.round((Math.atan2(dx, dz) * 180) / Math.PI / 5) * 5;
  zetel.geplaatst = true;
}

/** Zetel (of proefdoos) in de scène, op zijn plaats en in zijn draaiing. */
function zetZetel() {
  if (!w) return;
  if (kal && !zetel.geplaatst) beginplaats();
  const h = w.houder;
  const nodig = proefdoos.aan ? `doos:${proefdoos.b}x${proefdoos.d}x${proefdoos.h}` : kopie ? 'zetel' : '';
  if (h.userData.inhoud !== nodig || (nodig === 'zetel' && h.userData.kopie !== kopie)) {
    for (const c of [...h.children]) { h.remove(c); if (c.userData.eigen) c.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose?.(); }); }
    if (proefdoos.aan) h.add(maakDoos());
    else if (kopie) {
      // De zetel met zijn midden in de oorsprong van de houder (draaien rond het midden).
      const k = kopie.kader;
      kopie.groep.position.set(-(k.x + k.b / 2), 0, -(k.z + k.d / 2));
      h.add(kopie.groep);
      w.scene.environment = kopie.omgeving;
      w.scene.environmentIntensity = kopie.omgevingSterkte;
      w.renderer.toneMappingExposure = kopie.belichting;
      w.zon.intensity = kopie.licht.zon;
      w.zon.color.setHex(kopie.licht.zonKleur);
      w.hemel.intensity = kopie.licht.hemel;
      w.hemel.color.setHex(kopie.licht.hemelKleur);
      w.hemel.groundColor.setHex(kopie.licht.grondKleur);
      w.vul.intensity = kopie.licht.vul;
    }
    h.userData.inhoud = nodig;
    h.userData.kopie = kopie;
  }
  h.position.set(zetel.x, 0, zetel.z);
  h.rotation.y = (zetel.hoek * Math.PI) / 180;
  h.visible = !!kal;
  zetZon();
  toonStappen();
  teken();
}

/** Proefdoos voor de maatproef: half doorzichtig karton met donkere ribben. */
function maakDoos() {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(proefdoos.b, proefdoos.h, proefdoos.d);
  const doos = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xc9a46b, roughness: 0.9, transparent: true, opacity: 0.55 }));
  doos.position.y = proefdoos.h / 2;
  doos.castShadow = true;
  const ribben = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1b1b1b }));
  ribben.position.y = proefdoos.h / 2;
  g.add(doos, ribben);
  g.userData.eigen = true;
  return g;
}

/** Zonlicht voor de schaduw: richting van de schuifknop, schaduwkader rond de zetel. */
function zetZon() {
  if (!w) return;
  const k = proefdoos.aan ? { b: proefdoos.b, d: proefdoos.d, h: proefdoos.h } : kopie?.kader ?? { b: 200, d: 100, h: 90 };
  const grootte = Math.max(k.b, k.d, 120);
  const a = (schaduwRichting * Math.PI) / 180;
  const doel = new THREE.Vector3(zetel.x, 0, zetel.z);
  w.zon.position.set(doel.x + Math.cos(a) * grootte * 1.25, grootte * 1.5, doel.z + Math.sin(a) * grootte * 1.25);
  w.zon.target.position.copy(doel);
  w.zon.target.updateMatrixWorld();
  const sc = w.zon.shadow.camera;
  sc.left = sc.bottom = -grootte * 1.3;
  sc.right = sc.top = grootte * 1.3;
  sc.near = 1;
  sc.far = grootte * 6;
  sc.updateProjectionMatrix();
  w.zon.shadow.needsUpdate = true;
  w.vul.position.set(doel.x - grootte, grootte * 0.6, doel.z + grootte);
  w.vul.target = w.houder;
}

/** Raakt de muis of vinger de zetel? */
function raaktZetel(e: PointerEvent) {
  if (!w) return false;
  const r = q('#kamer-podium').getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  const straal = new THREE.Raycaster();
  straal.setFromCamera(ndc, w.camera);
  return straal.intersectObject(w.houder, true).length > 0;
}

let gepland = 0;
function teken() {
  if (!w || gepland) return;
  gepland = requestAnimationFrame(() => { gepland = 0; tekenNu(); });
}
function tekenNu() {
  if (!w) return;
  w.houder.visible = !!kal;
  w.renderer.render(w.scene, w.camera);
}

// ---------- bewaren ----------

/** Foto + 3D op de volle fotoresolutie (hoogstens 2560 px), met de zin onderaan. */
function samengesteld(): HTMLCanvasElement | null {
  if (!foto || !w || !kal) return null;
  const W = foto.width, H = foto.height;
  const r = w.renderer, oudPr = r.getPixelRatio();
  const podium = q('#kamer-podium');
  try {
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    tekenNu();
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    g.drawImage(foto, 0, 0);
    g.drawImage(r.domElement, 0, 0, W, H);
    // De zin: wit op een donkere band, linksonder.
    const grootte = Math.max(14, Math.round(Math.max(W, H) * 0.016));
    g.font = `500 ${grootte}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    const breedte = g.measureText(ZIN_OP_BEELD).width;
    const marge = Math.round(grootte * 0.8);
    g.fillStyle = 'rgba(20, 22, 24, 0.62)';
    g.fillRect(marge, H - marge - grootte * 1.9, breedte + grootte * 1.2, grootte * 1.9);
    g.fillStyle = '#ffffff';
    g.textBaseline = 'middle';
    g.fillText(ZIN_OP_BEELD, marge + grootte * 0.6, H - marge - grootte * 0.95);
    return c;
  } finally {
    r.setPixelRatio(oudPr);
    r.setSize(parseFloat(podium.style.width) || W * schaal, parseFloat(podium.style.height) || H * schaal);
    tekenNu();
  }
}

async function bewaarBeeld() {
  const c = samengesteld();
  if (!c) return;
  const blob = await new Promise<Blob | null>((klaar) => c.toBlob(klaar, 'image/png'));
  if (!blob) { zetMelding('Het beeld kon niet gemaakt worden.', true); return; }
  const uitkomst = await bewaarBestand(`zetel-in-mijn-kamer-${new Date().toISOString().slice(0, 10)}.png`, blob);
  if (uitkomst === 'niet') zetMelding('Bewaren lukt hier niet.', true);
}
