/// <reference path="./three.d.ts" />
/**
 * 3D-weergave van een vrij ontwerp met three.js (0.187, mee gebundeld in het HTML-bestand).
 * De motor levert de blokken (bouw3D); hier worden ze omgezet naar meshes.
 * Bediening: slepen = draaien, scrollen/knijpen = zoomen, knoppen = vaste standpunten.
 */
import type { Blok, Scene3D, Weefsel } from '../../core/src/index.js';
import { wielHint } from './zoom.js';
import { WEEFSEL_CM, weefselCanvas } from './weefsel.js';

import * as THREE_ from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const THREE: any = THREE_;
/** Lichtsterktes zijn sinds three.js r155 fysisch: × π geeft hetzelfde beeld als de oude waarden. */
const PI = Math.PI;

export interface Viewer3D {
  toon(scene: Scene3D): void;
  /** Omgeving rond de zetel (zie DECORS). */
  decor?(naam: DecorNaam): void;
  /** Lichtsfeer (zie LICHTEN). */
  licht?(naam: LichtNaam): void;
  /** Snel (lichter voor tablets) of mooi (scherper beeld en schaduwen). */
  kwaliteit?(k: Kwaliteit): void;
  /** Foto van het huidige beeld in hoge resolutie (PNG als data-URL). */
  foto?(): string | null;
  /**
   * Fotorealistische foto: path tracing (echte lichtweerkaatsing, zachte schaduwen) met `stappen` monsters.
   * Toont het beeld al tijdens het rekenen; geeft de PNG als data-URL, of null bij annuleren of een fout.
   */
  fotoRealistisch?(o: { stappen: number; breedte?: number; opVoortgang?: (deel: number) => void; signaal?: AbortSignal }): Promise<string | null>;
  standpunt(naam: Standpunt): void;
  /** Losse instellingen bovenop decor en licht (vloer, muur, maten, draaien …). */
  instellen?(w: Partial<Weergave3D>): void;
  /** Element in de 3D aanduiden met een kader (null = niets). */
  markeer?(id: string | null): void;
  /** Alleen de zetel als 3D-bestand, in meter, met het midden van de onderkant als oorsprong (voor AR). */
  exporteer3D?(formaat: 'glb' | 'usdz'): Promise<Blob | null>;
  /** AR in de browser (WebXR, Android): `overlay` blijft zichtbaar over het camerabeeld; null = gestart, anders de reden. */
  startAR?(overlay: HTMLElement, opEinde: () => void): Promise<string | null>;
  /** Tijdens AR: de zetel draaien (graden) of de sessie stoppen. */
  arDraai?(graden: number): void;
  arStop?(): void;
  formaat(): void;
}

export type Standpunt = 'schuin' | 'voor' | 'boven' | 'zij' | 'achter' | 'ooghoogte';

/** Vloeren die los van het decor te kiezen zijn. */
export const VLOEREN = {
  parket_licht: { label: 'Parket licht eiken', soort: 'parket', kleur: '#d6c09a' },
  parket: { label: 'Parket eiken', soort: 'parket', kleur: '#9a7552' },
  parket_donker: { label: 'Parket gerookt', soort: 'parket', kleur: '#5f4430' },
  beton: { label: 'Gepolierde beton', soort: 'beton', kleur: '#a19d96' },
  tegel: { label: 'Tegel 60 × 60', soort: 'tegel', kleur: '#d9d5cd' },
  terras: { label: 'Terrasplanken', soort: 'planken', kleur: '#8a6a4c' },
  effen: { label: 'Effen (studio)', soort: 'effen', kleur: '#dcd8d0' },
} as const;
export type VloerNaam = keyof typeof VLOEREN;

/** Instellingen van de 3D bovenop decor en licht; leeg of 'decor' = zoals het decor. */
export interface Weergave3D {
  vloer: VloerNaam | 'decor';
  /** Muur: 'decor', 'geen', 'steen' of een kleur (#rrggbb). */
  muur: string;
  /** Tapijt: 'decor', 'geen' of een kleur (#rrggbb). */
  tapijt: string;
  spullen: 'decor' | 'aan' | 'uit';
  maten: boolean;
  draaien: boolean;
  /** Kijkhoek in graden (35 = normaal, 55 = groothoek, 24 = tele). */
  lens: number;
  /** Helderheid in stops (−1 … +1). */
  helderheid: number;
  /** Richting van het zonlicht in graden (rond de zetel). */
  zonRichting: number;
}
export const STANDAARD_WEERGAVE: Weergave3D = { vloer: 'decor', muur: 'decor', tapijt: 'decor', spullen: 'decor', maten: false, draaien: false, lens: 35, helderheid: 0, zonRichting: 120 };

/** Decors voor de zetel: vloer, muur, tapijt en een paar spullen. */
export const DECORS = {
  studio: { label: 'Studio', achtergrond: '#f2f1ed' },
  kamer: { label: 'Woonkamer', achtergrond: '#e7e2da', vloer: { soort: 'parket', kleur: '#9a7552' }, muur: { soort: 'verf', kleur: '#e4ded4' }, tapijt: '#cfc6b6', spullen: true },
  scandi: { label: 'Scandinavisch', achtergrond: '#eef0ee', vloer: { soort: 'parket', kleur: '#d6c09a' }, muur: { soort: 'verf', kleur: '#f4f3ef' }, tapijt: '#e8e3d8', spullen: true },
  loft: { label: 'Loft', achtergrond: '#d8d5cf', vloer: { soort: 'beton', kleur: '#a19d96' }, muur: { soort: 'steen', kleur: '#8a4a36' }, tapijt: '#4a4640', spullen: true },
  japandi: { label: 'Japandi', achtergrond: '#ebe7df', vloer: { soort: 'parket', kleur: '#c9b089' }, muur: { soort: 'verf', kleur: '#c9cbb8' }, tapijt: '#d8cfbf', spullen: true },
  klassiek: { label: 'Klassiek', achtergrond: '#e2ddd3', vloer: { soort: 'parket', kleur: '#5f4430' }, muur: { soort: 'verf', kleur: '#3f5246' }, tapijt: '#b9a98f', spullen: true },
  toonzaal: { label: 'Toonzaal', achtergrond: '#e9e9e7', vloer: { soort: 'beton', kleur: '#bdbab4' }, muur: { soort: 'verf', kleur: '#f5f5f2' } },
  terras: { label: 'Terras', achtergrond: '#cddbe6', vloer: { soort: 'planken', kleur: '#8a6a4c' }, tapijt: '#8f8b80', spullen: 'buiten' },
} as const;
export type DecorNaam = keyof typeof DECORS;

/** Lichtsferen: zon (kleur, sterkte, hoogte), hemellicht, omgevingslicht en een warme lamp. */
export const LICHTEN = {
  studio: {
    label: 'Studio', zon: '#ffffff', zonSterkte: 0.8, hoogte: 1.6, hemel: 0.34, hemelKleur: '#ffffff', omgeving: 0.5, lamp: 0,
    // Omgevingsbeeld (lineaire HDR-waarden): wanden, vloer en lichtbronnen (richting, hoekstraal in graden, sterkte, kleur).
    hdr: { boven: [0.11, 0.1, 0.095], onder: [0.04, 0.037, 0.034], bronnen: [[[0, 1, 0.1], 28, 2.6, [1, 1, 0.97]], [[-0.95, 0.32, 0.3], 19, 1.6, [1, 1, 0.97]], [[0.95, 0.24, -0.3], 16, 0.8, [1, 1, 0.97]], [[0.1, 0.2, 0.97], 22, 0.9, [1, 1, 0.97]]] },
  },
  daglicht: {
    label: 'Daglicht', zon: '#fff3e2', zonSterkte: 1.05, hoogte: 0.9, hemel: 0.3, hemelKleur: '#dde8ff', omgeving: 0.45, lamp: 0,
    hdr: { boven: [0.35, 0.45, 0.62], onder: [0.06, 0.05, 0.04], bronnen: [[[-0.8, 0.25, 0.55], 30, 3.2, [1, 0.98, 0.95]], [[0, 1, 0], 45, 0.9, [0.75, 0.85, 1]], [[0.9, 0.2, 0.4], 14, 0.6, [1, 1, 1]]] },
  },
  ochtend: {
    label: 'Ochtend (zacht)', zon: '#ffe2c0', zonSterkte: 0.7, hoogte: 0.55, hemel: 0.36, hemelKleur: '#e6ecff', omgeving: 0.6, lamp: 0,
    hdr: { boven: [0.3, 0.33, 0.42], onder: [0.06, 0.055, 0.05], bronnen: [[[-0.9, 0.12, 0.4], 34, 2.2, [1, 0.9, 0.78]], [[0, 1, 0], 50, 0.7, [0.85, 0.9, 1]]] },
  },
  bewolkt: {
    label: 'Bewolkt (diffuus)', zon: '#f2f4f7', zonSterkte: 0.25, hoogte: 1.8, hemel: 0.5, hemelKleur: '#eef2f8', omgeving: 0.75, lamp: 0,
    hdr: { boven: [0.55, 0.57, 0.6], onder: [0.08, 0.08, 0.08], bronnen: [[[0, 1, 0], 70, 1.2, [1, 1, 1]]] },
  },
  avond: {
    label: 'Avond', zon: '#ffb36e', zonSterkte: 0.35, hoogte: 0.5, hemel: 0.1, hemelKleur: '#8f8aa8', omgeving: 0.22, lamp: 1,
    hdr: { boven: [0.05, 0.04, 0.045], onder: [0.02, 0.016, 0.013], bronnen: [[[0.85, 0.5, -0.2], 18, 3, [1, 0.72, 0.45]], [[-0.9, 0.2, 0.3], 22, 0.5, [0.55, 0.62, 0.9]]] },
  },
  spots: {
    label: 'Toonzaal (spots)', zon: '#fff6ea', zonSterkte: 0.95, hoogte: 2.2, hemel: 0.18, hemelKleur: '#fff8f0', omgeving: 0.4, lamp: 0,
    hdr: { boven: [0.05, 0.048, 0.045], onder: [0.03, 0.028, 0.026], bronnen: [[[-0.3, 0.95, 0.2], 9, 9, [1, 0.95, 0.88]], [[0.35, 0.94, 0.1], 9, 9, [1, 0.95, 0.88]], [[0, 0.3, 1], 30, 0.5, [1, 1, 1]]] },
  },
} as const;
export type LichtNaam = keyof typeof LICHTEN;
export type Kwaliteit = 'snel' | 'mooi';
type Hdr = { boven: readonly number[]; onder: readonly number[]; bronnen: readonly (readonly [readonly number[], number, number, readonly number[]])[] };

/**
 * Omgevingsbeeld als HDR-equirect (lineair, 256 × 128): wanden boven/onder de horizon en zachte ronde lichtbronnen.
 * Dient de gewone weergave (reflecties, glans) én de fotomodus (path tracing).
 */
function hdrBeeld(h: Hdr) {
  const W = 256, H = 128, data = new Float32Array(W * H * 4);
  const bronnen = h.bronnen.map(([r, hoek, sterkte, kleur]) => {
    const l = Math.hypot(r[0]!, r[1]!, r[2]!) || 1;
    return { d: [r[0]! / l, r[1]! / l, r[2]! / l], cos: Math.cos((hoek * Math.PI) / 180), rand: Math.cos((hoek * 1.35 * Math.PI) / 180), sterkte, kleur };
  });
  for (let y = 0; y < H; y++) {
    const el = ((y + 0.5) / H - 0.5) * Math.PI;
    for (let x = 0; x < W; x++) {
      const az = ((x + 0.5) / W - 0.5) * 2 * Math.PI;
      const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
      // Zachte overgang rond de horizon.
      const t = Math.min(1, Math.max(0, (d[1]! + 0.08) / 0.16));
      const kleur = [0, 1, 2].map((k) => h.onder[k]! * (1 - t) + h.boven[k]! * t);
      for (const b of bronnen) {
        const c = d[0]! * b.d[0]! + d[1]! * b.d[1]! + d[2]! * b.d[2]!;
        if (c <= b.rand) continue;
        const f = c >= b.cos ? 1 : (c - b.rand) / (b.cos - b.rand);
        for (let k = 0; k < 3; k++) kleur[k] = kleur[k]! + b.sterkte * b.kleur[k]! * f * f;
      }
      const i = (y * W + x) * 4;
      data[i] = kleur[0]!; data[i + 1] = kleur[1]!; data[i + 2] = kleur[2]!; data[i + 3] = 1;
    }
  }
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.LinearSRGBColorSpace;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
const hdrCache = new Map<string, any>();
function omgevingVoor(naam: LichtNaam) {
  let t = hdrCache.get(naam);
  if (!t) { t = hdrBeeld(LICHTEN[naam].hdr as unknown as Hdr); hdrCache.set(naam, t); }
  return t;
}

export interface Opties3D {
  /** Zetelweergave: contactschaduw onder de zetel en keuze van decor (niet voor woningen). */
  zetel?: boolean;
  /** Klik (zonder slepen) op een deel van de zetel: het id van het element, of null naast de zetel. */
  opKlik?: (elementId: string | null) => void;
}

export function maak3D(houder: HTMLElement, opties: Opties3D = {}): Viewer3D | null {
  let renderer: any;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  } catch {
    houder.textContent = '3D wordt niet ondersteund in deze browser (WebGL ontbreekt).';
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  // Zetel: zachte schaduwen (VSM, vervaagd); woning: scherpe PCF-schaduwen zoals voorheen.
  renderer.shadowMap.type = opties.zetel ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
  // Schaduwen alleen opnieuw berekenen als de scène of het licht verandert, niet bij elke camerabeweging.
  renderer.shadowMap.autoUpdate = false;
  const schaduwOpnieuw = () => { renderer.shadowMap.needsUpdate = true; };
  houder.replaceChildren(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f2f1ed');
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
  // Studiolicht: een omgevingsbeeld (softboxen in een grijze ruimte) geeft zachte reflecties en glans;
  // daardoor kunnen de hemel- en vullicht zwakker.
  scene.environment = omgevingVoor('studio');
  let OMGEVING = 0.5;
  const hemel = new THREE.HemisphereLight(0xffffff, 0xb8b2a7, 0.34 * PI);
  scene.add(hemel);
  // Warme lamp (bij de staanlamp in het decor), alleen aan bij de lichtsfeer "Avond".
  const lamp = new THREE.PointLight(0xffc58a, 0, 600, 0);
  lamp.castShadow = false;
  scene.add(lamp);
  const zon = new THREE.DirectionalLight(0xffffff, 0.8 * PI);
  zon.castShadow = true;
  zon.shadow.mapSize.set(2048, 2048);
  zon.shadow.bias = -0.0005;
  if (opties.zetel) { zon.shadow.radius = 7; zon.shadow.blurSamples = 10; zon.shadow.bias = -0.0002; }
  scene.add(zon, zon.target);
  const vul = new THREE.DirectionalLight(0xffffff, 0.16 * PI);
  scene.add(vul);
  const studioVloer = new THREE.MeshStandardMaterial({ color: 0xdcd8d0, roughness: 1, envMapIntensity: 0.4 });
  const vloer = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), studioVloer);
  vloer.rotation.x = -Math.PI / 2;
  vloer.receiveShadow = true;
  scene.add(vloer);

  // Fijne weefselstructuur voor stof (kleur komt van het materiaal).
  const weefsel = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 2) {
      g.fillStyle = `rgba(0,0,0,${0.035 + Math.random() * 0.03})`;
      g.fillRect(0, i, 64, 1);
      g.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.03})`;
      g.fillRect(i, 0, 1, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(0.12, 0.12);
    return tex;
  })();

  const groep = new THREE.Group();
  scene.add(groep);
  // Voor geautomatiseerde tests: de scène bereikbaar (alleen lezen).
  if (opties.zetel) (window as unknown as { __zetelScene?: unknown }).__zetelScene = scene;
  // Kleurbeheer staat aan: een hex-kleur wordt automatisch van sRGB naar lineair omgezet.
  const kleur = (hex: string) => new THREE.Color(hex);
  const materialen = new Map<string, any>();
  // ---------- texturen voor bouwmaterialen (in cm via wereld-UV) ----------
  const STEEN = { b: 88, h: 60 }; // 4 stenen van 21 cm + voeg, 10 lagen van 5 cm + voeg
  const PLANK = { b: 48, h: 200 }; // 4 verticale planken van 12 cm
  function tint(hex: string, f: number) {
    // Lichter of donkerder, begrensd op 0–255 per kanaal (anders lopen lichte kleuren over).
    // Rechtstreeks op de sRGB-waarden (voor canvastekeningen), niet via THREE.Color (die rekent lineair).
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    const [r, g, b] = m ? [m[1], m[2], m[3]].map((x) => parseInt(x!, 16)) : [200, 200, 200];
    const k = (x: number) => Math.max(0, Math.min(255, Math.round(x * f))).toString(16).padStart(2, '0');
    return `#${k(r!)}${k(g!)}${k(b!)}`;
  }
  function baksteen(hex: string, voeg = '#cfc8bb') {
    const px = 4, c = document.createElement('canvas');
    c.width = STEEN.b * px;
    c.height = STEEN.h * px;
    const g = c.getContext('2d')!;
    g.fillStyle = voeg;
    g.fillRect(0, 0, c.width, c.height);
    for (let rij = 0; rij < 10; rij++) {
      const off = rij % 2 ? 11 : 0;
      for (let s = -1; s < 5; s++) {
        g.fillStyle = tint(hex, 0.82 + Math.random() * 0.3);
        g.fillRect((s * 22 + off) * px, (rij * 6) * px, 21 * px, 5 * px);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function planken(hex: string) {
    const px = 2, c = document.createElement('canvas');
    c.width = PLANK.b * px;
    c.height = PLANK.h * px;
    const g = c.getContext('2d')!;
    for (let p = 0; p < 4; p++) {
      g.fillStyle = tint(hex, 0.85 + Math.random() * 0.25);
      g.fillRect(p * 12 * px, 0, 12 * px, c.height);
      for (let n = 0; n < 6; n++) {
        g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.05})`;
        g.fillRect((p * 12 + 1 + Math.random() * 10) * px, 0, 1, c.height);
      }
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect((p * 12 + 11.6) * px, 0, 0.8 * px, c.height);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function tegels(hex: string) {
    // 60 × 60 cm tegels met voeg; lichte kleurvariatie per tegel.
    const px = 4, c = document.createElement('canvas');
    c.width = c.height = 120 * px;
    const g = c.getContext('2d')!;
    g.fillStyle = tint(hex, 0.78);
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = tint(hex, 0.95 + Math.random() * 0.08);
      g.fillRect((i * 60 + 0.3) * px, (j * 60 + 0.3) * px, 59.4 * px, 59.4 * px);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function parket(hex: string) {
    // Planken van 20 × 120 cm in halfsteens verband.
    const px = 2, c = document.createElement('canvas');
    c.width = 240 * px;
    c.height = 80 * px;
    const g = c.getContext('2d')!;
    for (let rij = 0; rij < 4; rij++) {
      const off = (rij % 2) * 60;
      for (let s = -1; s < 2; s++) {
        g.fillStyle = tint(hex, 0.86 + Math.random() * 0.24);
        g.fillRect((s * 120 + off) * px, rij * 20 * px, 120 * px, 20 * px);
        for (let n = 0; n < 5; n++) {
          g.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.04})`;
          g.fillRect((s * 120 + off) * px, (rij * 20 + 2 + Math.random() * 16) * px, 120 * px, 1);
        }
        g.fillStyle = 'rgba(0,0,0,.28)';
        g.fillRect((s * 120 + off) * px, rij * 20 * px, 1, 20 * px);
      }
      g.fillStyle = 'rgba(0,0,0,.28)';
      g.fillRect(0, rij * 20 * px, c.width, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const TEGEL = { b: 120, h: 120 }, PARKET = { b: 240, h: 80 };
  // ---------- gevelbekleding ----------
  const LIGGEND = { b: 200, h: 60 }, LEIEN = { b: 80, h: 48 }, ZINK = { b: 43, h: 100 }, NATUURSTEEN = { b: 160, h: 80 }, PLEISTER = { b: 64, h: 64 };
  const canvasTextuur = (b: number, h: number, px: number, teken: (g: CanvasRenderingContext2D, px: number) => void) => {
    const c = document.createElement('canvas');
    c.width = Math.round(b * px);
    c.height = Math.round(h * px);
    teken(c.getContext('2d')!, px);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  /** Liggende planken van 15 cm (rabat), met schaduwnaad en hier en daar een kopse naad. */
  const plankenLiggend = (hex: string) => canvasTextuur(LIGGEND.b, LIGGEND.h, 2, (g, px) => {
    for (let r = 0; r < 4; r++) {
      const naad = (r * 53) % 200;
      for (const [a, b] of [[0, naad], [naad, 200]] as const) {
        g.fillStyle = tint(hex, 0.85 + Math.random() * 0.25);
        g.fillRect(a * px, r * 15 * px, (b - a) * px, 15 * px);
      }
      for (let n = 0; n < 5; n++) {
        g.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
        g.fillRect(0, (r * 15 + 1 + Math.random() * 12) * px, LIGGEND.b * px, 1);
      }
      g.fillStyle = 'rgba(0,0,0,.38)';
      g.fillRect(0, (r * 15 + 14.2) * px, LIGGEND.b * px, 0.8 * px);
      g.fillRect(naad * px, r * 15 * px, 1, 15 * px);
    }
  });
  /** Gevelleien (vezelcement of natuurleien) 20 × 12 cm zichtbaar, in halfsteens verband. */
  const leien = (hex: string) => canvasTextuur(LEIEN.b, LEIEN.h, 3, (g, px) => {
    g.fillStyle = tint(hex, 0.55);
    g.fillRect(0, 0, LEIEN.b * px, LEIEN.h * px);
    for (let r = 0; r < 4; r++) {
      const off = r % 2 ? 10 : 0;
      for (let s = -1; s < 4; s++) {
        g.fillStyle = tint(hex, 0.9 + Math.random() * 0.18);
        g.fillRect((s * 20 + off + 0.3) * px, (r * 12 + 0.4) * px, 19.4 * px, 11.4 * px);
      }
    }
  });
  /** Zink met staande naad om de 43 cm. */
  const zink = (hex: string) => canvasTextuur(ZINK.b, ZINK.h, 3, (g, px) => {
    const grad = g.createLinearGradient(0, 0, ZINK.b * px, 0);
    grad.addColorStop(0, tint(hex, 0.96));
    grad.addColorStop(0.5, tint(hex, 1.04));
    grad.addColorStop(1, tint(hex, 0.94));
    g.fillStyle = grad;
    g.fillRect(0, 0, ZINK.b * px, ZINK.h * px);
    g.fillStyle = tint(hex, 1.25);
    g.fillRect(0, 0, 1.2 * px, ZINK.h * px);
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(1.2 * px, 0, 0.6 * px, ZINK.h * px);
  });
  /** Natuursteen (bv. blauwe hardsteen) in platen van 80 × 40 cm. */
  const natuursteen = (hex: string) => canvasTextuur(NATUURSTEEN.b, NATUURSTEEN.h, 2, (g, px) => {
    g.fillStyle = tint(hex, 1.25);
    g.fillRect(0, 0, NATUURSTEEN.b * px, NATUURSTEEN.h * px);
    for (let r = 0; r < 2; r++) {
      const off = r % 2 ? 40 : 0;
      for (let s = -1; s < 2; s++) {
        g.fillStyle = tint(hex, 0.93 + Math.random() * 0.12);
        g.fillRect((s * 80 + off + 0.4) * px, (r * 40 + 0.4) * px, 79.2 * px, 39.2 * px);
        for (let n = 0; n < 40; n++) {
          g.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
          g.fillRect((s * 80 + off + Math.random() * 79) * px, (r * 40 + Math.random() * 39) * px, 1.5, 1.5);
        }
      }
    }
  });
  /** Sierpleister (crepi): fijne korrel. */
  const pleister = (hex: string) => canvasTextuur(PLEISTER.b, PLEISTER.h, 3, (g, px) => {
    g.fillStyle = hex;
    g.fillRect(0, 0, PLEISTER.b * px, PLEISTER.h * px);
    for (let n = 0; n < 2600; n++) {
      g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${Math.random() * 0.07})` : `rgba(255,255,255,${Math.random() * 0.08})`;
      g.fillRect(Math.random() * PLEISTER.b * px, Math.random() * PLEISTER.h * px, 1.5, 1.5);
    }
  });
  /** Textuurmaat per soort (cm); soorten zonder textuur hebben geen maat. */
  const textuurMaat: Partial<Record<string, { b: number; h: number }>> = {
    steen: STEEN, planken: PLANK, tegel: TEGEL, parket: PARKET,
    planken_h: LIGGEND, leien: LEIEN, zink: ZINK, natuursteen: NATUURSTEEN, pleister: PLEISTER,
  };

  /**
   * UV in wereldmaat (cm) per vlak, zodat stenen en planken hun echte maat houden.
   * `maten` per vlak van de balk (volgorde +x, −x, +y, −y, +z, −z; 4 hoekpunten per vlak), zodat
   * bv. hout buiten en tegels binnen elk hun eigen maat krijgen.
   */
  function wereldUV(geo: any, maten: ({ b: number; h: number } | undefined)[], ox = 0, oy = 0, oz = 0) {
    const p = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const maat = maten[Math.floor(i / 4)] ?? maten.find(Boolean);
      if (!maat) continue;
      const bx = maat.b, by = maat.h;
      const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
      let u: number, v: number;
      const X = p.getX(i) + ox, Y = p.getY(i) + oy, Z = p.getZ(i) + oz;
      if (ny >= nx && ny >= nz) { u = X; v = Z; }
      else if (nx >= nz) { u = Z; v = Y; }
      else { u = X; v = Y; }
      uv.setXY(i, u / bx, v / by);
    }
    uv.needsUpdate = true;
  }

  const fotoTexturen = new Map<string, any>();
  const materiaal = (b: { soort: Blok['soort']; kleur: string; voeg?: string; textuur?: string; weefsel?: string }) => {
    const sleutel = `${b.soort}:${b.kleur}:${b.voeg ?? ''}:${b.textuur ? b.textuur.length + b.textuur.slice(-24) : ''}:${b.weefsel ?? ''}`;
    let m = materialen.get(sleutel);
    if (!m && !b.textuur && b.weefsel && b.weefsel in WEEFSEL_CM) {
      // Getekend weefsel (velours, bouclé, rib …) in de kleur van de stof, op ware grootte via wereldUV,
      // met een reliëfkaart van hetzelfde weefsel (in grijs) zodat draden, lusjes en ribbels licht vangen.
      const w = b.weefsel as Weefsel;
      const t = new THREE.CanvasTexture(weefselCanvas(w, b.kleur));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      m = stofMateriaal(w, b.kleur, t, reliefVan(w));
      materialen.set(sleutel, m);
    }
    if (!m && b.textuur) {
      // Stoffoto: één keer laden, herhalen in wereldmaat (zie wereldUV), opnieuw tekenen zodra ze binnen is.
      let t = fotoTexturen.get(b.textuur);
      if (!t) {
        t = new THREE.TextureLoader().load(b.textuur, () => render());
        // Gespiegeld herhalen: een staalfoto is niet naadloos, zo zie je geen ruitjes op de grenzen.
        t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        fotoTexturen.set(b.textuur, t);
      }
      // De foto zelf dient ook als reliëf (lichte delen komen naar voor).
      m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, map: t, bumpMap: t, bumpScale: 0.5, envMapIntensity: OMGEVING });
      materialen.set(sleutel, m);
    }
    if (!m) {
      if (b.soort === 'metaal') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), metalness: 0.85, roughness: 0.3 });
      else if (b.soort === 'hout') m = opties.zetel
        ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: houtNerf(b.kleur), roughness: 0.45 })
        : new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.55 });
      else if (b.soort === 'planken') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, map: planken(b.kleur) });
      else if (b.soort === 'steen') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, map: baksteen(b.kleur, b.voeg) });
      else if (b.soort === 'planken_h') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, map: plankenLiggend(b.kleur) });
      else if (b.soort === 'leien') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, map: leien(b.kleur) });
      else if (b.soort === 'zink') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.45, map: zink(b.kleur) });
      else if (b.soort === 'natuursteen') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, map: natuursteen(b.kleur) });
      else if (b.soort === 'pleister') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, map: pleister(b.kleur) });
      else if (b.soort === 'glas') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.15, depthWrite: false });
      else if (b.soort === 'matglas') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), transparent: true, opacity: 0.82, roughness: 0.6, depthWrite: false });
      else if (b.soort === 'tegel') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, map: tegels(b.kleur) });
      else if (b.soort === 'parket') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, map: parket(b.kleur) });
      else if (b.soort === 'kunststof') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.35 });
      else if (b.soort === 'dak') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.85 });
      else if (b.soort === 'gevel') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.97 });
      else if (b.soort === 'donker') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.9 });
      else m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.95, map: weefsel });
      if ('envMapIntensity' in m) m.envMapIntensity = OMGEVING;
      materialen.set(sleutel, m);
    }
    return m;
  };

  /** Reliëfkaart per weefsel: hetzelfde patroon in middengrijs (bumpMap leest de helderheid). */
  const reliefs = new Map<Weefsel, any>();
  function reliefVan(w: Weefsel) {
    let t = reliefs.get(w);
    if (!t) {
      t = new THREE.CanvasTexture(weefselCanvas(w, '#8c8c8c'));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      reliefs.set(w, t);
    }
    return t;
  }
  /** Reliëf per weefsel (hoe diep de structuur lijkt). */
  const RELIEF: Record<Weefsel, number> = { effen: 0.25, linnen: 0.6, velours: 0.15, boucle: 1.6, chenille: 0.7, wol: 0.6, rib: 1.0, jacquard: 0.5, leder: 0.35 };
  /** Stofmateriaal: velours met glans langs de randen (sheen), leder met een zachte toplaag, de rest mat. */
  function stofMateriaal(w: Weefsel, hex: string, map: any, relief: any) {
    const basis = { color: 0xffffff, map, bumpMap: relief, bumpScale: RELIEF[w], envMapIntensity: OMGEVING };
    if (w === 'velours') return new THREE.MeshPhysicalMaterial({ ...basis, roughness: 0.8, sheen: 0.7, sheenColor: kleur(tint(hex, 1.15)), sheenRoughness: 0.5 });
    if (w === 'leder') return new THREE.MeshPhysicalMaterial({ ...basis, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    // Geweven stof: matte basis met een lichte, ruwe glans (sheen) zoals vezels die licht opvangen langs de randen.
    return new THREE.MeshPhysicalMaterial({ ...basis, roughness: w === 'chenille' ? 0.85 : 0.95, sheen: w === 'chenille' ? 0.55 : 0.3, sheenColor: kleur(tint(hex, 1.1)), sheenRoughness: 0.8 });
  }

  /**
   * Gevuld kussen: een fijn opgedeelde balk met afgeronde randen, licht bol op de twee grote vlakken
   * (zitkussen: boven en onder; rugkussen: voor en achter) en iets bol op de zijkanten.
   * Onderkant op y = 0; normalen analytisch (geen harde lijnen op de randen); onderaan iets donkerder (schaduw tussen kussens).
   */
  /** Blokken van de huidige scène (voor de schaduw waar een kussen tegen een ander deel ligt). */
  let sceneBlokken: Blok[] = [];
  type Doos = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };
  /** Andere stofdelen vlak naast dit blok (binnen 4 cm), in wereldmaat. */
  function burenVan(b: Blok): Doos[] {
    const m = 4;
    return sceneBlokken
      .filter((o) => o !== b && (o.soort === 'stof' || o.soort === 'kussen' || o.soort === 'hout') && o.y < b.y + b.h + m && o.y + o.h > b.y - m &&
        o.x < b.x + b.b + m && o.x + o.b > b.x - m && o.z < b.z + b.d + m && o.z + o.d > b.z - m)
      .map((o) => ({ x0: o.x, x1: o.x + o.b, y0: o.y, y1: o.y + o.h, z0: o.z, z1: o.z + o.d }));
  }

  function kussenGeometrie(B: number, H: number, D: number, r: number, vulling = 1, buren: Doos[] = [], oorsprong = [0, 0, 0]) {
    const maat = [B, H, D];
    const plat = maat.indexOf(Math.min(B, H, D)); // as van de dunste maat: daar bolt het kussen
    const bol = Math.min(2.2, maat[plat]! * 0.13) * vulling;
    const zak = vulling === 1 && plat === 1 && B > 30 && D > 30 ? Math.min(0.9, bol * 0.45) : 0;
    const seg = (l: number) => Math.max(4, Math.min(28, Math.round(l / 3)));
    const geo = new THREE.BoxGeometry(B, H, D, seg(B), seg(H), seg(D));
    const half = [B / 2, H / 2, D / 2];
    const rr = Math.max(0.4, Math.min(r, half[0]! - 0.1, half[1]! - 0.1, half[2]! - 0.1));
    const binnen = half.map((h) => h - rr);
    const pos = geo.attributes.position, nrm = geo.attributes.normal;
    const kleuren = new Float32Array(pos.count * 3);
    const p = [0, 0, 0], n = [0, 0, 0];
    for (let i = 0; i < pos.count; i++) {
      p[0] = pos.getX(i); p[1] = pos.getY(i); p[2] = pos.getZ(i);
      // Afronden: punt naar het binnenblok trekken en op afstand rr zetten.
      const c = p.map((v, a) => Math.max(-binnen[a]!, Math.min(binnen[a]!, v)));
      const d = p.map((v, a) => v - c[a]!);
      const l = Math.hypot(d[0]!, d[1]!, d[2]!) || 1;
      for (let a = 0; a < 3; a++) { n[a] = d[a]! / l; p[a] = c[a]! + n[a]! * rr; }
      // Bol: verschuiving langs elke as, het sterkst midden op het vlak.
      const u = p.map((v, a) => Math.max(-1, Math.min(1, v / half[a]!)));
      for (let a = 0; a < 3; a++) {
        const o1 = (a + 1) % 3, o2 = (a + 2) % 3;
        const k = (a === plat ? bol : bol * 0.3) * (1 - u[o1]! * u[o1]!) * (1 - u[o2]! * u[o2]!);
        p[a] = p[a]! + k * u[a]!;
        // Normaal mee laten hellen met de bolling (helling van het bolle vlak).
        if (a === plat) {
          const sterk = Math.abs(n[a]!);
          n[o1] = n[o1]! + bol * 2 * (u[o1]! / half[o1]!) * (1 - u[o2]! * u[o2]!) * sterk;
          n[o2] = n[o2]! + bol * 2 * (u[o2]! / half[o2]!) * (1 - u[o1]! * u[o1]!) * sterk;
        }
      }
      // Zitkuil: een lichte indruk midden op een zitkussen (alleen bovenop, bij een liggend kussen).
      if (zak > 0 && u[1]! > 0) {
        const e = Math.exp(-2.2 * (u[0]! * u[0]! + u[2]! * u[2]!)) * Math.max(0, u[1]!);
        p[1] = p[1]! - zak * e;
        const sterk = Math.max(0, n[1]!);
        n[0] = n[0]! - 2 * 2.2 * zak * e * (u[0]! / half[0]!) * sterk;
        n[2] = n[2]! - 2 * 2.2 * zak * e * (u[2]! / half[2]!) * sterk;
      }
      const nl = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
      pos.setXYZ(i, p[0]!, p[1]! + H / 2, p[2]!);
      nrm.setXYZ(i, n[0]! / nl, n[1]! / nl, n[2]! / nl);
      // Schaduw onderaan: van 0,72 (onderkant) naar 1 (bovenste helft).
      let ao = 0.72 + 0.28 * Math.min(1, Math.max(0, (p[1]! + half[1]!) / (H * 0.6)));
      // Waar het kussen tegen een ander deel ligt (rug, arm, onderbouw): donkerder, zoals in het echt.
      if (buren.length) {
        const wx = p[0]! + oorsprong[0]!, wy = p[1]! + H / 2 + oorsprong[1]!, wz = p[2]! + oorsprong[2]!;
        let dicht = 0;
        for (const q of buren) {
          const dx = Math.max(q.x0 - wx, 0, wx - q.x1), dy = Math.max(q.y0 - wy, 0, wy - q.y1), dz = Math.max(q.z0 - wz, 0, wz - q.z1);
          const d = Math.hypot(dx, dy, dz);
          if (d < 3.5) dicht += (1 - d / 3.5) * 0.3;
        }
        ao *= 1 - Math.min(0.42, dicht);
      }
      kleuren[i * 3] = kleuren[i * 3 + 1] = kleuren[i * 3 + 2] = ao;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));
    pos.needsUpdate = nrm.needsUpdate = true;
    return { geo, plat, rr, half, bol };
  }

  /**
   * Gevuld kussen (of gestoffeerde basis) met een vrije omtrek in het grondvlak, bv. een ronde poef of een zitting
   * met een ronde kant: hoeken in het grondvlak afgerond, randen boven en onder afgerond (straal rr), bovenkant licht bol.
   * `omtrek` in wereldcoördinaten; de vorm komt rond (ox, oz) met de onderkant op y = 0.
   * Geeft ook de ringen op de rand (voor de naad): boven en onder, op 45°.
   */
  function omtrekGeometrie(omtrek: [number, number][], H: number, rr0: number, bol: number, ox: number, oz: number, buren: Doos[] = [], oy = 0) {
    // 1. Punten rond het midden, tegen de klok in (positieve oppervlakte in x-z).
    let pts = omtrek.map(([x, z]) => [x - ox, z - oz] as [number, number]);
    let opp = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i]!, c = pts[(i + 1) % pts.length]!; opp += a[0] * c[1] - c[0] * a[1]; }
    if (opp < 0) pts = pts.reverse();
    // Dubbele punten weg.
    pts = pts.filter((q, i) => { const v = pts[(i + pts.length - 1) % pts.length]!; return Math.hypot(q[0] - v[0], q[1] - v[1]) > 0.05; });
    // 2. Scherpe hoeken in het grondvlak afronden (de boog zelf is al fijn).
    // Minstens de afronding van de rand plus wat marge: anders vouwt de ingesprongen rand in de hoek om.
    const hoekR = Math.max(1.5, Math.min(rr0, H / 2 - 0.1) + 1.5);
    const glad: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      const v = pts[(i + pts.length - 1) % pts.length]!, q = pts[i]!, n = pts[(i + 1) % pts.length]!;
      const a = [v[0] - q[0], v[1] - q[1]], c = [n[0] - q[0], n[1] - q[1]];
      const la = Math.hypot(a[0]!, a[1]!), lc = Math.hypot(c[0]!, c[1]!);
      const cos = (a[0]! * c[0]! + a[1]! * c[1]!) / (la * lc);
      if (cos < -0.94) { glad.push(q); continue; } // bijna rechtdoor
      const f = Math.min(hoekR, la * 0.45, lc * 0.45);
      const p0 = [q[0] + (a[0]! / la) * f, q[1] + (a[1]! / la) * f], p1 = [q[0] + (c[0]! / lc) * f, q[1] + (c[1]! / lc) * f];
      for (let k = 0; k <= 4; k++) {
        const t = k / 4, u = 1 - t;
        glad.push([u * u * p0[0]! + 2 * u * t * q[0] + t * t * p1[0]!, u * u * p0[1]! + 2 * u * t * q[1] + t * t * p1[1]!]);
      }
    }
    // Gelijkmatig herverdelen langs de omtrek (om de ±4 cm): geen opeengepakte punten in de hoeken, dus geen smalle,
    // lange driehoeken in het bovenvlak (die gaven stippellijnen door het reliëf).
    const lengtes = [0];
    for (let i = 0; i < glad.length; i++) {
      const q = glad[i]!, n = glad[(i + 1) % glad.length]!;
      lengtes.push(lengtes[i]! + Math.hypot(n[0] - q[0], n[1] - q[1]));
    }
    const L = lengtes[glad.length]!;
    const N = Math.max(36, Math.round(L / 4));
    const vorm: [number, number][] = [];
    for (let k = 0, j = 0; k < N; k++) {
      const t = (k / N) * L;
      while (j < glad.length - 1 && lengtes[j + 1]! < t) j++;
      const q = glad[j]!, n = glad[(j + 1) % glad.length]!;
      const f = (t - lengtes[j]!) / ((lengtes[j + 1]! - lengtes[j]!) || 1);
      vorm.push([q[0] + (n[0] - q[0]) * f, q[1] + (n[1] - q[1]) * f]);
    }
    const M = vorm.length;
    // 3. Normaal naar buiten per punt (voor het inspringen van de afgeronde rand).
    const nrm = vorm.map((q, i) => {
      const v = vorm[(i + M - 1) % M]!, n = vorm[(i + 1) % M]!;
      const e1 = [q[0] - v[0], q[1] - v[1]], e2 = [n[0] - q[0], n[1] - q[1]];
      const l1 = Math.hypot(e1[0]!, e1[1]!) || 1, l2 = Math.hypot(e2[0]!, e2[1]!) || 1;
      const nx = e1[1]! / l1 + e2[1]! / l2, nz = -e1[0]! / l1 - e2[0]! / l2;
      const l = Math.hypot(nx, nz) || 1;
      return [nx / l, nz / l] as [number, number];
    });
    let mx = 0, mz = 0;
    for (const q of vorm) { mx += q[0]; mz += q[1]; }
    mx /= M; mz /= M;
    const rr = Math.max(0.5, Math.min(rr0, H / 2 - 0.1));
    // Omsluitend kader (voor de welving).
    const xs = vorm.map((q) => q[0]), zs = vorm.map((q) => q[1]);
    const bx = (Math.min(...xs) + Math.max(...xs)) / 2, bz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const hb = (Math.max(...xs) - Math.min(...xs)) / 2 || 1, hd = (Math.max(...zs) - Math.min(...zs)) / 2 || 1;
    // 4. Ringen van onder naar boven: onderkant (plat), onderrand, bovenrand, bovenvlak (bol) tot het midden.
    const ringen: { inset: number; y: number; s: number }[] = [];
    ringen.push({ inset: rr, y: 0, s: 0.0001 });
    for (let k = 0; k <= 4; k++) { const t = (-90 + k * 22.5) * Math.PI / 180; ringen.push({ inset: rr * (1 - Math.cos(t)), y: rr + rr * Math.sin(t), s: 1 }); }
    for (let k = 0; k <= 4; k++) { const t = (k * 22.5) * Math.PI / 180; ringen.push({ inset: rr * (1 - Math.cos(t)), y: H - rr + rr * Math.sin(t), s: 1 }); }
    const KAP = 9;
    for (let k = 1; k <= KAP; k++) ringen.push({ inset: rr, y: H, s: 1 - k / (KAP + 0.5) });
    const naadOnder = 3, naadBoven = 8; // ringen op 45° (onder- en bovenrand)
    const pos: number[] = [];
    for (const ring of ringen) {
      for (let i = 0; i < M; i++) {
        const q = vorm[i]!, n = nrm[i]!;
        let x = q[0] - n[0] * ring.inset, z = q[1] - n[1] * ring.inset, y = ring.y;
        if (ring.s < 1) {
          // Bovenvlak (of onderkant): naar het midden schalen.
          x = mx + (x - mx) * ring.s; z = mz + (z - mz) * ring.s;
        }
        // Gladde welving over het hele bovenvlak (niet per ring: dat gaf ribben vanaf de hoeken).
        if (y > H - rr) {
          const u = (x - bx) / hb, w = (z - bz) / hd;
          const f = Math.max(0, 1 - u * u) * Math.max(0, 1 - w * w);
          y += bol * f * Math.min(1, (y - (H - rr)) / rr);
        }
        pos.push(x, y, z);
      }
    }
    const midOnder = pos.length / 3; pos.push(mx, 0, mz);
    const fm = Math.max(0, 1 - ((mx - bx) / hb) ** 2) * Math.max(0, 1 - ((mz - bz) / hd) ** 2);
    const midBoven = pos.length / 3; pos.push(mx, H + bol * fm, mz);
    const idx: number[] = [];
    const R = ringen.length;
    for (let r = 0; r < R - 1; r++)
      for (let i = 0; i < M; i++) {
        const a = r * M + i, b2 = r * M + ((i + 1) % M), c = (r + 1) * M + i, d = (r + 1) * M + ((i + 1) % M);
        // Ring 0 → 1 gaat van de onderkant (binnen) naar buiten; draairichting zo dat de normalen naar buiten wijzen.
        idx.push(a, c, b2, b2, c, d);
      }
    for (let i = 0; i < M; i++) {
      idx.push(midOnder, i, (i + 1) % M);
      const t0 = (R - 1) * M;
      idx.push(t0 + i, midBoven, t0 + ((i + 1) % M));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // Schaduw onderaan en waar het tegen andere delen ligt (zoals bij de gewone kussens).
    const kleuren = new Float32Array(pos.length);
    for (let i = 0; i < pos.length / 3; i++) {
      const y = pos[i * 3 + 1]!;
      let ao = 0.72 + 0.28 * Math.min(1, Math.max(0, y / (H * 0.6)));
      // Alleen de rand (niet het bovenvlak): anders tekenen de lange driehoeken van het bovenvlak strepen.
      const ringNr = Math.floor(i / M);
      if (buren.length && ringNr > 0 && ringNr < ringen.length && ringen[ringNr]!.s === 1) {
        const wx = pos[i * 3]! + ox, wy = y + oy, wz = pos[i * 3 + 2]! + oz;
        let dicht = 0;
        for (const q of buren) {
          const dx = Math.max(q.x0 - wx, 0, wx - q.x1), dy = Math.max(q.y0 - wy, 0, wy - q.y1), dz = Math.max(q.z0 - wz, 0, wz - q.z1);
          const d = Math.hypot(dx, dy, dz);
          if (d < 3.5) dicht += (1 - d / 3.5) * 0.3;
        }
        ao *= 1 - Math.min(0.42, dicht);
      }
      kleuren[i * 3] = kleuren[i * 3 + 1] = kleuren[i * 3 + 2] = ao;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));
    const ringPunten = (r: number) => {
      const uit: any[] = [];
      for (let i = 0; i < M; i++) uit.push(new THREE.Vector3(pos[(r * M + i) * 3]!, pos[(r * M + i) * 3 + 1]!, pos[(r * M + i) * 3 + 2]!));
      return uit;
    };
    return { geo, naadRingen: [ringPunten(naadBoven), ringPunten(naadOnder)] };
  }
  /** Naad als buis langs gegeven ringen (bies, gewone naad of sierstiksel). */
  function naadLangs(b: Blok, ringen: any[][]) {
    if (!b.naad) return [];
    const straal = b.naad.soort === 'bies' ? 0.55 : b.naad.soort === 'stiksel' ? 0.09 : 0.14;
    const mat = b.naad.soort === 'bies'
      ? new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur === b.kleur ? tint(b.kleur, 0.94) : b.naad.kleur), roughness: 0.85, envMapIntensity: OMGEVING })
      : new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur), roughness: 1, envMapIntensity: OMGEVING });
    return ringen.map((punten) => {
      const curve = new THREE.CatmullRomCurve3(punten, true, 'centripetal');
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(400, punten.length * 3), straal, 6, true), mat);
      m.receiveShadow = true;
      return m;
    });
  }

  /** Naad rond de twee grote vlakken van een kussen: bies (dikke koord), gewone naad of dubbel sierstiksel. */
  function naden(b: Blok, k: ReturnType<typeof kussenGeometrie>) {
    if (!b.naad) return [];
    const { plat, rr, half } = k;
    const a1 = (plat + 1) % 3, a2 = (plat + 2) % 3;
    const lijnen: { hoek: number; straal: number }[] =
      b.naad.soort === 'bies' ? [{ hoek: 45, straal: 0.55 }]
        : b.naad.soort === 'stiksel' ? [{ hoek: 22, straal: 0.09 }, { hoek: 68, straal: 0.09 }]
          : [{ hoek: 45, straal: 0.14 }];
    const mat = b.naad.soort === 'bies'
      ? new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur === b.kleur ? tint(b.kleur, 0.94) : b.naad.kleur), roughness: 0.85, envMapIntensity: OMGEVING })
      : new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur), roughness: 1, envMapIntensity: OMGEVING });
    const uit: any[] = [];
    for (const kant of [1, -1]) {
      for (const { hoek, straal } of lijnen) {
        const rad = (hoek * Math.PI) / 180;
        const opzij = rr * Math.cos(rad), hoogte = (half[plat]! - rr + rr * Math.sin(rad)) * kant;
        const h1 = half[a1]! - rr, h2 = half[a2]! - rr;
        const punten: any[] = [];
        // Afgeronde rechthoek: per hoek een kwartcirkel rond de hoek van het binnenblok.
        for (const [s1, s2, start] of [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]] as const) {
          for (let j = 0; j <= 6; j++) {
            const t = ((start + j * 15) * Math.PI) / 180;
            const q = [0, 0, 0];
            q[a1] = s1 * h1 + Math.cos(t) * opzij;
            q[a2] = s2 * h2 + Math.sin(t) * opzij;
            q[plat] = hoogte;
            punten.push(new THREE.Vector3(q[0], q[1]! + half[1]!, q[2]));
          }
        }
        const curve = new THREE.CatmullRomCurve3(punten, true, 'centripetal');
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(220, punten.length * 6), straal, 6, true), mat);
        m.castShadow = false;
        m.receiveShadow = true;
        uit.push(m);
      }
    }
    return uit;
  }

  /** Afgeronde balk: afgerond grondvlak (b × d), geëxtrudeerd in de hoogte met afgeschuinde randen. */
  function afgerondeBalk(b: number, h: number, d: number, r: number) {
    const rr = Math.max(0.1, Math.min(r, b / 2 - 0.05, d / 2 - 0.05, h / 2 - 0.05));
    const bevel = Math.min(rr * 0.6, h / 2 - 0.05);
    const w = b - 2 * bevel, l = d - 2 * bevel;
    const hoek = Math.max(0.05, Math.min(rr - bevel, w / 2, l / 2));
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + hoek, -l / 2);
    s.lineTo(w / 2 - hoek, -l / 2);
    s.quadraticCurveTo(w / 2, -l / 2, w / 2, -l / 2 + hoek);
    s.lineTo(w / 2, l / 2 - hoek);
    s.quadraticCurveTo(w / 2, l / 2, w / 2 - hoek, l / 2);
    s.lineTo(-w / 2 + hoek, l / 2);
    s.quadraticCurveTo(-w / 2, l / 2, -w / 2, l / 2 - hoek);
    s.lineTo(-w / 2, -l / 2 + hoek);
    s.quadraticCurveTo(-w / 2, -l / 2, -w / 2 + hoek, -l / 2);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(0.05, h - 2 * bevel), bevelEnabled: bevel > 0.05, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 6,
    });
    geo.rotateX(-Math.PI / 2); // extrusie naar boven
    geo.translate(0, bevel, 0);
    return geo;
  }

  function mesh(b: Blok) {
    let geo: any;
    let kussen: ReturnType<typeof kussenGeometrie> | null = null;
    let vrijeNaden: any[][] | null = null;
    // Vrije omtrek (zitting met ronde kant) of een staande gestoffeerde cilinder (ronde poef): gevuld kussen met die vorm.
    const staandeCilinder = b.vorm === 'cilinder' && !b.as && (b.soort === 'kussen' || b.soort === 'stof') && opties.zetel && (b.taps ?? 1) === 1;
    if (b.omtrek || staandeCilinder) {
      const cxo = b.x + b.b / 2, czo = b.z + b.d / 2;
      const omtrek: [number, number][] = b.omtrek ?? Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return [cxo + Math.cos(a) * b.b / 2, czo + Math.sin(a) * b.d / 2] as [number, number];
      });
      const rr = b.afronding ?? Math.min(5, b.h / 3);
      const bol = b.soort === 'kussen' ? Math.min(2.2, b.h * 0.13) : Math.min(1, b.h * 0.06);
      const v = omtrekGeometrie(omtrek, b.h, rr, bol, cxo, czo, opties.zetel ? burenVan(b) : [], b.y);
      geo = v.geo;
      vrijeNaden = b.soort === 'kussen' ? v.naadRingen : null;
      if (b.weefsel && b.weefsel in WEEFSEL_CM) { const cm = WEEFSEL_CM[b.weefsel as Weefsel]; const tegel = { b: cm, h: cm }; wereldUV(geo, [tegel, tegel, tegel, tegel, tegel, tegel], cxo, b.y, czo); }
      else if (b.textuur) { const tegel = { b: b.textuurCm ?? 15, h: b.textuurCm ?? 15 }; wereldUV(geo, [tegel, tegel, tegel, tegel, tegel, tegel], cxo, b.y, czo); }
      const base = materiaal(b);
      const sleutel = `vc:${base.uuid}`;
      let mat = materialen.get(sleutel);
      if (!mat) { mat = base.clone(); mat.vertexColors = true; materialen.set(sleutel, mat); }
      const m = new THREE.Mesh(geo, mat);
      m.name = b.code;
      if (vrijeNaden) for (const n of naadLangs(b, vrijeNaden)) m.add(n);
      m.position.set(cxo, b.y, czo);
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }
    const cx = b.x + b.b / 2, cz = b.z + b.d / 2;
    let y = b.y;
    switch (b.vorm) {
      case 'kegel':
      case 'cilinder': {
        if (b.as === 'z' || b.as === 'x') {
          const r = (b.as === 'z' ? Math.min(b.b, b.h) : Math.min(b.d, b.h)) / 2;
          geo = new THREE.CylinderGeometry(r, r, b.as === 'z' ? b.d : b.b, 28);
          geo.rotateX(b.as === 'z' ? Math.PI / 2 : 0);
          if (b.as === 'x') geo.rotateZ(Math.PI / 2);
          y = b.y + r;
        } else {
          const r = Math.min(b.b, b.d) / 2;
          geo = new THREE.CylinderGeometry(r, r * (b.taps ?? 1), b.h, 20);
          y = b.y + b.h / 2;
        }
        break;
      }
      case 'bol':
        geo = new THREE.SphereGeometry(Math.min(b.b, b.h) / 2, 12, 8);
        y = b.y + b.h / 2;
        break;
      default:
        // Kussens gevuld en bol; bij de zetel ook de gestoffeerde armen en rug, iets minder bol.
        if (b.afronding && (b.soort === 'kussen' || (opties.zetel && b.soort === 'stof'))) {
          kussen = kussenGeometrie(b.b, b.h, b.d, b.afronding, b.soort === 'kussen' ? 1 : 0.5, opties.zetel ? burenVan(b) : [], [cx, b.y, cz]);
          geo = kussen.geo;
          break;
        }
        geo = b.afronding ? afgerondeBalk(b.b, b.h, b.d, b.afronding) : new THREE.BoxGeometry(b.b, b.h, b.d).translate(0, b.h / 2, 0);
        if (!b.afronding) {
          // Textuur in wereldmaat, per vlak de maat van het materiaal op dat vlak.
          const vlakken: (keyof NonNullable<Blok['zijden']> | null)[] = ['x+', 'x-', 'y+', null, 'z+', 'z-'];
          const maten = vlakken.map((k) => textuurMaat[(k && b.zijden?.[k]?.soort) || b.soort]);
          if (maten.some(Boolean)) wereldUV(geo, maten, cx, b.y, cz);
        }
    }
    // Stoffoto: textuur op ware grootte op elk vlak, ook bij afgeronde kussens en cilinders.
    if (b.textuur) { const tegel = { b: b.textuurCm ?? 15, h: b.textuurCm ?? 15 }; wereldUV(geo, [tegel, tegel, tegel, tegel, tegel, tegel], cx, b.y, cz); }
    else if (b.weefsel && b.weefsel in WEEFSEL_CM) { const cm = WEEFSEL_CM[b.weefsel as Weefsel]; const tegel = { b: cm, h: cm }; wereldUV(geo, [tegel, tegel, tegel, tegel, tegel, tegel], cx, b.y, cz); }
    let mat: any = materiaal(b);
    if (b.zijden && !b.afronding && (b.vorm ?? 'blok') === 'blok') {
      // Volgorde van de vlakken in BoxGeometry: +x, -x, +y, -y, +z, -z.
      const z = b.zijden;
      const kies = (k: keyof NonNullable<Blok['zijden']> | null) => (k && z[k] ? materiaal(z[k]!) : mat);
      mat = [kies('x+'), kies('x-'), kies('y+'), mat, kies('z+'), kies('z-')];
    }
    if (kussen && !Array.isArray(mat)) {
      // Schaduw onderaan het kussen via de hoekpuntkleuren (apart materiaal, zelfde stof).
      const sleutel = `vc:${mat.uuid}`;
      let vc = materialen.get(sleutel);
      if (!vc) { vc = mat.clone(); vc.vertexColors = true; materialen.set(sleutel, vc); }
      mat = vc;
    }
    const m = new THREE.Mesh(geo, mat);
    m.name = b.code;
    if (kussen) for (const n of naden(b, kussen)) m.add(n);
    m.position.set(cx, y, cz);
    if (b.kantel) {
      // Achterover hellen rond de onderkant: de bovenkant gaat naar de achterkant.
      const a = (b.kantel.graden * Math.PI) / 180;
      if (b.kantel.richting === 'z-') m.rotation.x = -a;
      if (b.kantel.richting === 'z+') m.rotation.x = a;
      if (b.kantel.richting === 'x+') m.rotation.z = -a;
      if (b.kantel.richting === 'x-') m.rotation.z = a;
    }
    m.castShadow = b.vorm !== 'bol' && b.soort !== 'glas' && b.soort !== 'matglas';
    m.receiveShadow = true;
    return m;
  }

  // ---------- zetel: contactschaduw en decor ----------
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 1, color: 0xffffff }));
  contact.rotation.x = -Math.PI / 2;
  contact.renderOrder = 1;
  contact.visible = false;
  scene.add(contact);
  /** Zachte schaduw onder de zetel, getekend uit de voetafdruk van de blokken (volgt ook een hoeksofa). */
  function zetContactschaduw(s: Scene3D) {
    if (!opties.zetel || !s.blokken.length) { contact.visible = false; return; }
    const k = s.kader, rand = 30, B = k.b + 2 * rand, D = k.d + 2 * rand;
    const c = document.createElement('canvas');
    const schaal = 256 / Math.max(B, D);
    c.width = Math.max(16, Math.round(B * schaal));
    c.height = Math.max(16, Math.round(D * schaal));
    const g = c.getContext('2d')!;
    g.shadowColor = 'rgba(0,0,0,0.5)';
    g.shadowBlur = 9 * schaal * 2;
    g.shadowOffsetX = 2000;
    g.fillStyle = '#000';
    for (const b of s.blokken) {
      if (b.y > 25) continue;
      g.fillRect((b.x - k.x + rand) * schaal - 2000, (b.z - k.z + rand) * schaal, b.b * schaal, b.d * schaal);
    }
    const oud = contact.material.map;
    contact.material.map = new THREE.CanvasTexture(c);
    contact.material.needsUpdate = true;
    oud?.dispose();
    contact.scale.set(B, D, 1);
    contact.position.set(k.x + k.b / 2, 0.15, k.z + k.d / 2);
    contact.visible = true;
  }

  let decorNaam: DecorNaam = 'studio';
  let lichtNaam: LichtNaam = 'studio';
  const kamerDelen: any[] = [];
  const decorMaterialen = new Map<string, any>();
  let bladVorm: any = null;
  /** Houten structuur met nerf (poten, tafeltjes): fijne lange lijnen in een iets andere tint. */
  const nerven = new Map<string, any>();
  function houtNerf(hex: string) {
    let t = nerven.get(hex);
    if (!t) {
      t = canvasTextuur(16, 32, 8, (g, px) => {
        g.fillStyle = hex;
        g.fillRect(0, 0, 16 * px, 32 * px);
        for (let n = 0; n < 60; n++) {
          const x = Math.random() * 16 * px, w = 0.4 + Math.random() * 1.6;
          g.globalAlpha = 0.35 + Math.random() * 0.3;
          g.fillStyle = tint(hex, Math.random() < 0.5 ? 0.82 : 1.1);
          g.fillRect(x, 0, w, 32 * px);
          g.globalAlpha = 1;
        }
      });
      nerven.set(hex, t);
    }
    return t;
  }
  function vloerMateriaal(v: { soort: string; kleur: string }) {
    const sleutel = `vloer:${v.soort}:${v.kleur}`;
    let m = decorMaterialen.get(sleutel);
    if (!m) {
      if (v.soort === 'effen') m = studioVloer;
      else if (v.soort === 'parket') {
        const t = parket(v.kleur);
        t.repeat.set(4000 / PARKET.b, 4000 / PARKET.h);
        m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, map: t, envMapIntensity: 0.5 });
      } else if (v.soort === 'tegel') {
        const t = tegels(v.kleur);
        t.repeat.set(4000 / TEGEL.b, 4000 / TEGEL.h);
        m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, map: t, envMapIntensity: 0.6 });
      } else if (v.soort === 'planken') {
        const t = planken(v.kleur);
        t.repeat.set(4000 / PLANK.b, 4000 / PLANK.h);
        m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, map: t, envMapIntensity: 0.4 });
      } else {
        // Gepolierde beton: pleistertextuur op grote schaal, iets glanzend.
        const t = pleister(v.kleur);
        t.repeat.set(4000 / 160, 4000 / 160);
        m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, map: t, envMapIntensity: 0.6 });
      }
      decorMaterialen.set(sleutel, m);
    }
    return m;
  }
  function muurMateriaal(w: { soort: string; kleur: string }, breed: number, hoog: number) {
    if (w.soort === 'steen') {
      const t = baksteen(w.kleur, '#c7bfb2');
      t.repeat.set(breed / STEEN.b, hoog / STEEN.h);
      return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: t, envMapIntensity: 0.4 });
    }
    return new THREE.MeshStandardMaterial({ color: kleur(w.kleur), roughness: 0.95, envMapIntensity: 0.4 });
  }
  function zetDecor(s: Scene3D | null) {
    for (const d of kamerDelen) { scene.remove(d); d.traverse((o: any) => o.geometry?.dispose()); }
    kamerDelen.length = 0;
    const basis = DECORS[decorNaam] as (typeof DECORS)[DecorNaam] & { vloer?: { soort: string; kleur: string }; muur?: { soort: string; kleur: string }; tapijt?: string; spullen?: boolean | 'buiten' };
    // Losse instellingen gaan voor op het decor.
    const w = weergave;
    const dc = {
      ...basis,
      vloer: w.vloer !== 'decor' ? VLOEREN[w.vloer] : basis.vloer,
      muur: w.muur === 'decor' ? basis.muur : w.muur === 'geen' ? undefined : w.muur === 'steen' ? { soort: 'steen', kleur: '#8a4a36' } : { soort: 'verf', kleur: w.muur },
      tapijt: w.tapijt === 'decor' ? basis.tapijt : w.tapijt === 'geen' ? undefined : w.tapijt,
      spullen: w.spullen === 'decor' ? basis.spullen : w.spullen === 'aan' ? (basis.spullen === 'buiten' ? 'buiten' : true) : false,
    };
    const bg = opties.zetel ? dc.achtergrond : '#f2f1ed';
    scene.background = new THREE.Color(bg);
    if (opties.zetel) {
      // Mist in de kleur van de achtergrond: de vloer loopt zacht weg, geen harde horizon.
      if (!scene.fog) scene.fog = new THREE.Fog(bg, 600, 1800);
      scene.fog.color.set(bg);
    }
    lamp.intensity = 0;
    if (!opties.zetel || !dc.vloer) {
      vloer.material = studioVloer;
      zetLicht();
      return;
    }
    vloer.material = vloerMateriaal(dc.vloer);
    const k = s?.kader ?? kader;
    const midX = k.x + k.b / 2;
    const muurZ = k.z - 35;
    const add = (m: any, schaduw = true) => { m.castShadow = schaduw; m.receiveShadow = true; kamerDelen.push(m); };
    if (dc.muur) {
      const muur = new THREE.Mesh(new THREE.PlaneGeometry(1400, 320), muurMateriaal(dc.muur, 1400, 320));
      muur.position.set(midX, 160, muurZ);
      add(muur, false);
      if (dc.muur.soort !== 'steen') {
        const plint = new THREE.Mesh(new THREE.BoxGeometry(1400, 8, 1.5), new THREE.MeshStandardMaterial({ color: kleur('#f3f0ea'), roughness: 0.6 }));
        plint.position.set(midX, 4, muurZ + 0.75);
        add(plint, false);
      }
    }
    if (dc.tapijt) {
      const tapijtTex = new THREE.CanvasTexture(weefselCanvas('wol', dc.tapijt));
      tapijtTex.wrapS = tapijtTex.wrapT = THREE.RepeatWrapping;
      tapijtTex.colorSpace = THREE.SRGBColorSpace;
      const tb = k.b + 80, td = k.d + 110;
      tapijtTex.repeat.set(tb / 12, td / 12);
      const tapijt = new THREE.Mesh(new THREE.BoxGeometry(tb, 1, td), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, map: tapijtTex, envMapIntensity: 0.3 }));
      tapijt.position.set(midX, 0.5, k.z + k.d / 2 + 25);
      add(tapijt, false);
    }
    if (dc.spullen === true) {
      // Staanlamp rechts: eenvoudige vormen, alleen voor de sfeer (niet op het terras).
      const lx = k.x + k.b + 45, lz = k.z + 15;
      const metaal = new THREE.MeshStandardMaterial({ color: kleur('#2b2b2b'), metalness: 0.7, roughness: 0.35 });
      const voet = new THREE.Mesh(new THREE.CylinderGeometry(14, 15, 2, 28), metaal); voet.position.set(lx, 1, lz); add(voet);
      const stang = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 150, 10), metaal); stang.position.set(lx, 76, lz); add(stang, false); // dunne stang: geen (gerafelde) schaduw
      const kap = new THREE.Mesh(new THREE.CylinderGeometry(16, 22, 26, 32, 1, true), new THREE.MeshStandardMaterial({ color: kleur('#efe7d8'), roughness: 0.9, side: THREE.DoubleSide, emissive: kleur('#ffd9a8'), emissiveIntensity: lichtNaam === 'avond' ? 0.6 : 0 }));
      kap.position.set(lx, 160, lz); add(kap, false);
      lamp.position.set(lx, 150, lz);
      lamp.intensity = LICHTEN[lichtNaam].lamp * 1.4 * PI;
    }
    if (dc.spullen) {
      // Plant in pot links.
      const px = k.x - 50, pz = k.z + 10;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(17, 13, 34, 28), new THREE.MeshStandardMaterial({ color: kleur(dc.muur?.soort === 'steen' ? '#6b6560' : '#d9d2c4'), roughness: 0.7 }));
      pot.position.set(px, 17, pz); add(pot);
      // Blad: gebogen bladvormen (ficus) op drie stammetjes, in twee tinten groen.
      bladVorm ??= (() => {
        const v = new THREE.Shape();
        v.moveTo(0, 0);
        v.quadraticCurveTo(6.5, 5, 4.5, 13);
        v.quadraticCurveTo(2.5, 19, 0, 21);
        v.quadraticCurveTo(-2.5, 19, -4.5, 13);
        v.quadraticCurveTo(-6.5, 5, 0, 0);
        const g = new THREE.ShapeGeometry(v, 6);
        // Licht gebogen in de lengte en gevouwen langs de nerf.
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i);
          pos.setZ(i, -0.012 * y * y + Math.abs(x) * 0.25);
        }
        g.computeVertexNormals();
        return g;
      })();
      const groen = [new THREE.MeshStandardMaterial({ color: kleur('#3f5f34'), roughness: 0.55, side: THREE.DoubleSide }), new THREE.MeshStandardMaterial({ color: kleur('#55773f'), roughness: 0.6, side: THREE.DoubleSide })];
      for (let st = 0; st < 3; st++) {
        const sx = px + (st - 1) * 5, sz = pz + (st % 2 ? 3 : -3), top = 95 + st * 18;
        for (let i = 0; i < 9; i++) {
          const blad = new THREE.Mesh(bladVorm, groen[(i + st) % 2]);
          const hoek = i * 2.4 + st, hoogte = 45 + ((top - 45) * i) / 8;
          blad.position.set(sx + Math.cos(hoek) * 2, hoogte, sz + Math.sin(hoek) * 2);
          blad.rotation.set(-0.9 - (i % 3) * 0.25, hoek, 0, 'YXZ');
          const sch = 0.8 + ((i * 7) % 5) * 0.08;
          blad.scale.set(sch, sch, sch);
          add(blad);
        }
      }
      for (let st = 0; st < 3; st++) {
        const top = 95 + st * 18;
        const stam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, top - 30, 6), new THREE.MeshStandardMaterial({ map: houtNerf('#6a4a32'), roughness: 0.8 }));
        stam.position.set(px + (st - 1) * 5, 30 + (top - 30) / 2, pz + (st % 2 ? 3 : -3));
        add(stam, false); // dunne stengel: geen (gerafelde) schaduwlijn op de zetel
      }
    }
    scene.add(...kamerDelen);
    schaduwOpnieuw();
    zetLicht();
  }
  function zetLicht() {
    const l = LICHTEN[lichtNaam];
    zon.color.set(l.zon);
    zon.intensity = l.zonSterkte * PI;
    hemel.intensity = l.hemel * PI;
    hemel.color.set(l.hemelKleur);
    OMGEVING = l.omgeving;
    if (opties.zetel) scene.environment = omgevingVoor(lichtNaam);
    // Alle materialen volgen het omgevingslicht van de sfeer.
    scene.traverse((o: any) => {
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) if ('envMapIntensity' in m && m !== studioVloer) m.envMapIntensity = l.omgeving;
    });
    for (const m of materialen.values()) if (m && 'envMapIntensity' in m) m.envMapIntensity = l.omgeving;
    zetZon();
  }
  function zetZon() {
    schaduwOpnieuw();
    const grootte = Math.max(kader.b, kader.d, 120);
    const h = LICHTEN[lichtNaam].hoogte;
    const a = (weergave.zonRichting * Math.PI) / 180;
    zon.position.set(doel.x + Math.cos(a) * grootte * 1.25, grootte * h, doel.z + Math.sin(a) * grootte * 1.25);
    zon.target.position.copy(doel);
  }

  // ---------- camera (eenvoudige orbit) ----------
  let doel = new THREE.Vector3(115, 35, 50);
  let afstand = 420, hoekH = -0.6, hoekV = 0.42;
  const plaatsCamera = () => {
    hoekV = Math.min(1.45, Math.max(0.05, hoekV));
    camera.position.set(
      doel.x + afstand * Math.cos(hoekV) * Math.sin(hoekH),
      doel.y + afstand * Math.sin(hoekV),
      doel.z + afstand * Math.cos(hoekV) * Math.cos(hoekH),
    );
    camera.lookAt(doel);
    if (scene.fog) {
      const g = Math.max(kader.b, kader.d, 120);
      scene.fog.near = afstand + g * 0.9;
      scene.fog.far = afstand + g * 4.5;
    }
    render();
  };
  let vorige: { x: number; y: number } | null = null;
  const aanwijzers = new Map<number, { x: number; y: number }>();
  let knijpAfstand = 0;
  let drukStart: { x: number; y: number } | null = null;
  renderer.domElement.addEventListener('pointerdown', (ev: PointerEvent) => {
    if (bezigMetFoto || bezigMetAR) return;
    pauzeerDraaien();
    drukStart = aanwijzers.size === 0 ? { x: ev.clientX, y: ev.clientY } : null;
    renderer.domElement.setPointerCapture(ev.pointerId);
    aanwijzers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    vorige = { x: ev.clientX, y: ev.clientY };
  });
  renderer.domElement.addEventListener('pointermove', (ev: PointerEvent) => {
    if (!aanwijzers.has(ev.pointerId)) return;
    aanwijzers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (aanwijzers.size === 2) {
      const [a, b] = [...aanwijzers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (knijpAfstand) afstand = Math.min(2500, Math.max(120, afstand * (knijpAfstand / d)));
      knijpAfstand = d;
      plaatsCamera();
      return;
    }
    if (!vorige) return;
    hoekH -= (ev.clientX - vorige.x) * 0.008;
    hoekV += (ev.clientY - vorige.y) * 0.006;
    vorige = { x: ev.clientX, y: ev.clientY };
    plaatsCamera();
  });
  const los = (ev: PointerEvent) => {
    // Klik zonder slepen: het element onder de muis kiezen.
    if (ev.type === 'pointerup' && drukStart && aanwijzers.size === 1 && Math.hypot(ev.clientX - drukStart.x, ev.clientY - drukStart.y) < 5) kies(ev);
    drukStart = null;
    aanwijzers.delete(ev.pointerId);
    knijpAfstand = 0;
    vorige = null;
  };
  renderer.domElement.addEventListener('pointerup', los);
  const straal = new THREE.Raycaster();
  function kies(ev: PointerEvent) {
    if (!opties.opKlik) return;
    const r = renderer.domElement.getBoundingClientRect();
    straal.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
    const raak = straal.intersectObjects(groep.children, true).find((h: any) => h.object.name || h.object.parent?.name);
    const naam: string = raak ? raak.object.name || raak.object.parent.name : '';
    opties.opKlik(naam ? naam.split('.')[0]! : null);
  }
  // Toetsenbord: pijltjes draaien, + en − zoomen, 0 = standaardbeeld.
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('role', 'application');
  renderer.domElement.setAttribute('aria-label', '3D-weergave. Pijltjes: draaien. Plus en min: zoomen. 0: standaardbeeld.');
  renderer.domElement.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (bezigMetFoto) return;
    const stap = ev.shiftKey ? 0.3 : 0.1;
    if (ev.key === 'ArrowLeft') hoekH += stap;
    else if (ev.key === 'ArrowRight') hoekH -= stap;
    else if (ev.key === 'ArrowUp') hoekV += stap * 0.6;
    else if (ev.key === 'ArrowDown') hoekV -= stap * 0.6;
    else if (ev.key === '+' || ev.key === '=') afstand = Math.max(120, afstand * 0.9);
    else if (ev.key === '-' || ev.key === '_') afstand = Math.min(2500, afstand * 1.1);
    else if (ev.key === '0') { viewer.standpunt('schuin'); ev.preventDefault(); return; }
    else return;
    ev.preventDefault();
    pauzeerDraaien();
    plaatsCamera();
  });
  // Automatisch draaien (toonzaal): rustig rond; pauzeert 3 s na bediening.
  let draaiPauzeTot = 0, draaiLoopt = false;
  function pauzeerDraaien() { draaiPauzeTot = performance.now() + 3000; }
  const lensFactor = () => Math.tan((35 * Math.PI) / 360) / Math.tan((weergave.lens * Math.PI) / 360);
  function draaiLus() {
    if (!weergave.draaien) { draaiLoopt = false; return; }
    draaiLoopt = true;
    if (!bezigMetFoto && performance.now() > draaiPauzeTot && !aanwijzers.size) { hoekH += 0.0035; plaatsCamera(); }
    requestAnimationFrame(draaiLus);
  }
  /** Kopie van alleen de zetel (geen vloer, decor, maten of kader), in meter, midden van de onderkant in de oorsprong. */
  function arModel() {
    const kopie = groep.clone(true);
    kopie.position.set(-(kader.x + kader.b / 2), 0, -(kader.z + kader.d / 2));
    const model = new THREE.Group();
    model.name = 'zetel';
    model.add(kopie);
    model.scale.setScalar(0.01);
    model.updateMatrixWorld(true);
    return model;
  }
  /** Maatlijnen in de 3D: breedte vooraan, diepte rechts, hoogte achteraan rechts, met labels in cm. */
  function zetMaten() {
    for (const c of [...matenGroep.children]) { matenGroep.remove(c); c.geometry?.dispose(); c.material?.map?.dispose(); c.material?.dispose(); }
    if (!weergave.maten || !opties.zetel) return;
    const k = kader, lijn = new THREE.MeshBasicMaterial({ color: 0x2b2b28 });
    const staaf = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
      const l = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, l, 6), lijn);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0).normalize());
      matenGroep.add(m);
    };
    const label = (tekst: string, x: number, y: number, z: number) => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 96;
      const g = c.getContext('2d')!;
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.beginPath(); g.roundRect(8, 14, 240, 68, 18); g.fill();
      g.fillStyle = '#23262a'; g.font = '600 44px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(tekst, 128, 50);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, toneMapped: false }));
      const schaal = Math.max(28, Math.max(k.b, k.d) * 0.16);
      sp.scale.set(schaal, schaal * 0.375, 1);
      sp.position.set(x, y, z);
      sp.renderOrder = 10;
      matenGroep.add(sp);
    };
    const voor = k.z + k.d + 18, rechts = k.x + k.b + 18, y = 1.5;
    staaf(k.x, y, voor, k.x + k.b, y, voor);
    staaf(k.x, y, voor - 6, k.x, y, voor + 6); staaf(k.x + k.b, y, voor - 6, k.x + k.b, y, voor + 6);
    label(`${Math.round(k.b)} cm`, k.x + k.b / 2, 14, voor);
    staaf(rechts, y, k.z, rechts, y, k.z + k.d);
    staaf(rechts - 6, y, k.z, rechts + 6, y, k.z); staaf(rechts - 6, y, k.z + k.d, rechts + 6, y, k.z + k.d);
    label(`${Math.round(k.d)} cm`, rechts, 14, k.z + k.d / 2);
    staaf(rechts, 0, k.z, rechts, k.h, k.z);
    staaf(rechts - 5, k.h, k.z, rechts + 5, k.h, k.z);
    label(`${Math.round(k.h)} cm`, rechts + 4, k.h / 2, k.z);
  }
  function zetMarkering() {
    if (markeerKader) { scene.remove(markeerKader); markeerKader.geometry?.dispose(); markeerKader = null; }
    if (!markeerId) return;
    const box = new THREE.Box3();
    for (const c of groep.children) if (c.name.startsWith(`${markeerId}.`)) box.expandByObject(c);
    if (box.isEmpty()) return;
    box.expandByScalar(1.5);
    markeerKader = new THREE.Box3Helper(box, new THREE.Color('#3f5a52'));
    markeerKader.material.depthTest = false;
    markeerKader.material.transparent = true;
    markeerKader.material.opacity = 0.85;
    markeerKader.renderOrder = 9;
    scene.add(markeerKader);
  }
  renderer.domElement.addEventListener('pointercancel', los);
  renderer.domElement.addEventListener('wheel', (ev: WheelEvent) => {
    if (bezigMetFoto) { ev.preventDefault(); return; }
    // Gewoon scrollen laat de pagina doorscrollen; zoomen met Ctrl/⌘ + wiel (of knijpen), en in het groot scherm met het wiel.
    if (!(ev.ctrlKey || ev.metaKey || document.body.classList.contains('heeft-groot-scherm'))) {
      wielHint(houder, 'Zoomen: houd {sleutel} ingedrukt en scrol, of knijp');
      return;
    }
    ev.preventDefault();
    afstand = Math.min(2500, Math.max(120, afstand * (1 + Math.sign(ev.deltaY) * 0.1)));
    plaatsCamera();
  }, { passive: false });

  // Nabewerking (alleen zetel, kwaliteit Mooi): ambient occlusion (GTAO) voor schaduw in hoeken, naden en onder kussens.
  let composer: any = null, gtao: any = null;
  function maakComposer() {
    try {
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
      composer = new EffectComposer(renderer, rt);
      composer.addPass(new RenderPass(scene, camera));
      gtao = new GTAOPass(scene, camera, 1, 1);
      gtao.updateGtaoMaterial({ radius: 14, distanceExponent: 1.2, thickness: 8, scale: 1.1, samples: 12, distanceFallOff: 1 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 });
      gtao.blendIntensity = 0.9;
      composer.addPass(gtao);
      composer.addPass(new OutputPass());
    } catch {
      composer = null;
    }
  }
  const metNabewerking = () => opties.zetel && kwaliteitNu === 'mooi' && composer;
  // Tijdens draaien en zoomen: het snelle beeld; 180 ms na de laatste beweging één keer het mooie beeld (met GTAO).
  let mooiGepland = 0;
  // Veel aanvragen kort na elkaar (slepen, schuifregelaar) worden samengevoegd tot één beeld per schermverversing.
  let beeldGepland = 0;
  function render(direct = false) {
    if (bezigMetFoto || bezigMetAR) return;
    if (direct) { cancelAnimationFrame(beeldGepland); beeldGepland = 0; tekenNu(true); return; }
    if (!beeldGepland) beeldGepland = requestAnimationFrame(() => { beeldGepland = 0; tekenNu(false); });
  }
  function tekenNu(direct: boolean) {
    if (bezigMetFoto || bezigMetAR) return;
    if (!metNabewerking()) { renderer.render(scene, camera); return; }
    if (direct) { clearTimeout(mooiGepland); composer.render(); return; }
    renderer.render(scene, camera);
    clearTimeout(mooiGepland);
    mooiGepland = window.setTimeout(() => composer.render(), 180);
  }

  let kader = { x: 0, z: 0, b: 230, d: 95, h: 80 };
  let kwaliteitNu: Kwaliteit = 'mooi';
  /** Grootste beeldbreedte die de grafische kaart aankan (sommige tablets: 4096), met wat marge. */
  const maxBreedte = () => Math.min(2400, (renderer.capabilities?.maxTextureSize ?? 4096) - 64);
  let weergave: Weergave3D = { ...STANDAARD_WEERGAVE };
  let markeerId: string | null = null;
  let decorGepland = 0;
  let markeerKader: any = null;
  const matenGroep = new THREE.Group();
  scene.add(matenGroep);
  let pathTracer: any = null;
  /** Tijdens de fotomodus niet tussendoor gewoon renderen (dat zou het rekenende beeld wissen). */
  let bezigMetFoto = false;
  /** Tijdens AR tekent de AR-sessie zelf; de gewone weergave staat stil. */
  let bezigMetAR = false;
  let arSessie: any = null;
  let arPlaats: any = null;
  let arZon: any = null;
  let laatsteBreedte = 0;
  const viewer: Viewer3D = {
    toon(s: Scene3D) {
      for (const c of [...groep.children]) {
        groep.remove(c);
        c.traverse((o: any) => o.geometry?.dispose());
      }
      sceneBlokken = s.blokken;
      for (const b of s.blokken) groep.add(mesh(b));
      schaduwOpnieuw();
      zetContactschaduw(s);
      const nieuw = s.kader;
      const veranderd = Math.abs(nieuw.b - kader.b) > 1 || Math.abs(nieuw.d - kader.d) > 1 || Math.abs(nieuw.x - kader.x) > 1 || Math.abs(nieuw.z - kader.z) > 1;
      kader = nieuw;
      zetMaten();
      zetMarkering();
      doel = new THREE.Vector3(kader.x + kader.b / 2, Math.min(Math.max(40, kader.h * 0.35), kader.h / 2), kader.z + kader.d / 2);
      const grootte = Math.max(kader.b, kader.d, 120);
      zetZon();
      const sc = zon.shadow.camera;
      sc.left = sc.bottom = -grootte;
      sc.right = sc.top = grootte;
      sc.near = 1;
      sc.far = grootte * 5;
      sc.updateProjectionMatrix();
      vul.position.set(doel.x + grootte, grootte * 0.6, doel.z - grootte);
      if (veranderd) afstand = Math.max(200, grootte * 1.5);
      if (decorNaam !== 'studio' || !scene.fog) zetDecor(s);
      plaatsCamera();
    },
    decor(naam) {
      if (!(naam in DECORS)) return;
      decorNaam = naam;
      zetDecor(null);
      render();
    },
    licht(naam) {
      if (!(naam in LICHTEN)) return;
      lichtNaam = naam;
      zetDecor(null);
      render();
    },
    kwaliteit(k) {
      kwaliteitNu = k;
      renderer.setPixelRatio(k === 'mooi' ? Math.min(window.devicePixelRatio || 1, 2) : 1);
      // VSM vervaagt de schaduw zelf: 2048 is scherp genoeg en veel lichter dan 4096.
      const maat = k === 'mooi' ? 2048 : 1024;
      zon.shadow.mapSize.set(maat, maat);
      zon.shadow.map?.dispose();
      zon.shadow.map = null;
      schaduwOpnieuw();
      viewer.formaat();
    },
    foto() {
      // Even renderen op hoge resolutie (3× of minstens 2400 px breed), beeld nemen, terugzetten.
      try {
        const oud = renderer.getPixelRatio();
        const b = houder.clientWidth || 600;
        renderer.setPixelRatio(Math.min(Math.max(3, 2400 / b), maxBreedte() / b));
        viewer.formaat();
        render(true);
        const url = renderer.domElement.toDataURL('image/png');
        renderer.setPixelRatio(oud);
        viewer.formaat();
        return url;
      } catch {
        return null;
      }
    },
    async fotoRealistisch({ stappen, breedte = 1800, opVoortgang, signaal }) {
      const oudRatio = renderer.getPixelRatio();
      const oudMist = scene.fog, oudContact = contact.visible, oudIntensiteit = scene.environmentIntensity;
      const oudMaten = matenGroep.visible, oudKader = markeerKader?.visible;
      bezigMetFoto = true;
      try {
        pathTracer ??= new WebGLPathTracer(renderer);
        const pt = pathTracer;
        pt.renderDelay = 0; pt.fadeDuration = 0; pt.minSamples = 1; pt.bounces = 5; pt.filterGlossyFactor = 0.5;
        pt.tiles.set(2, 2);
        // De path tracer kent geen mist, geen hemellicht en geen schaduwvlak (hij rekent echte contactschaduw).
        scene.fog = null;
        contact.visible = false;
        // Maatlijnen en het selectiekader horen niet op de foto.
        matenGroep.visible = false;
        if (markeerKader) markeerKader.visible = false;
        scene.environmentIntensity = OMGEVING * 1.15;
        // Geen gebakken schaduw in de hoekpunten: de path tracer rekent de echte; en hij leest ze verkeerd (zwart).
        for (const m of materialen.values()) if (m?.vertexColors) { m.vertexColors = false; m.userData.vcTerug = true; }
        const b = houder.clientWidth || 600;
        renderer.setPixelRatio(Math.max(1, Math.min(breedte, maxBreedte()) / b));
        viewer.formaat();
        // Eerst de voortgangsbalk laten tekenen; het opbouwen van de scène (BVH) blokkeert even.
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
        pt.setScene(scene, camera);
        // Tot het aantal stappen, of na 75 s rekentijd (dan is het beeld al ruim bruikbaar).
        const start = performance.now();
        while (pt.samples < stappen && performance.now() - start < 75000) {
          if (signaal?.aborted) return null;
          await new Promise((r) => requestAnimationFrame(r));
          pt.renderSample();
          opVoortgang?.(Math.min(1, Math.max(pt.samples / stappen, (performance.now() - start) / 75000)));
        }
        return renderer.domElement.toDataURL('image/png');
      } catch (fout) {
        console.error('Fotomodus mislukt:', fout);
        return null;
      } finally {
        bezigMetFoto = false;
        for (const m of materialen.values()) if (m?.userData?.vcTerug) { m.vertexColors = true; delete m.userData.vcTerug; m.needsUpdate = true; }
        scene.fog = oudMist;
        contact.visible = oudContact;
        matenGroep.visible = oudMaten;
        if (markeerKader && oudKader !== undefined) markeerKader.visible = oudKader;
        scene.environmentIntensity = oudIntensiteit;
        renderer.setPixelRatio(oudRatio);
        viewer.formaat();
        render(true);
      }
    },
    async exporteer3D(formaat) {
      try {
        const model = arModel();
        if (formaat === 'usdz') {
          const data = await new USDZExporter().parseAsync(model, { quickLookCompatible: true, maxTextureSize: 1024 });
          return new Blob([data], { type: 'model/vnd.usdz+zip' });
        }
        const data = await new GLTFExporter().parseAsync(model, { binary: true, maxTextureSize: 1024 });
        return new Blob([data], { type: 'model/gltf-binary' });
      } catch (fout) {
        console.error('3D-bestand maken mislukt:', fout);
        return null;
      }
    },
    async startAR(overlay, opEinde) {
      const xr = (navigator as any).xr;
      if (!xr) return 'Deze browser kent geen AR (WebXR).';
      let sessie: any;
      try {
        sessie = await xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'], domOverlay: { root: overlay } });
      } catch (fout) {
        return `AR kon niet starten (${(fout as Error)?.message ?? fout}). Open de pagina rechtstreeks in Chrome op een Android-toestel met ARCore.`;
      }
      // Aparte AR-scène: alleen de zetel, met licht, een schaduwvanger en een richtcirkel op de vloer.
      const ar = new THREE.Scene();
      ar.environment = scene.environment;
      ar.add(new THREE.HemisphereLight(0xffffff, 0x9a948c, 0.7 * PI));
      arZon = new THREE.DirectionalLight(0xffffff, 1.1 * PI);
      arZon.castShadow = true;
      arZon.shadow.mapSize.set(1024, 1024);
      Object.assign(arZon.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.1, far: 10 });
      arZon.shadow.radius = 4;
      ar.add(arZon, arZon.target);
      arPlaats = new THREE.Group();
      arPlaats.visible = false;
      arPlaats.add(arModel());
      const vanger = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.32 }));
      vanger.rotation.x = -Math.PI / 2;
      vanger.receiveShadow = true;
      arPlaats.add(vanger);
      ar.add(arPlaats);
      const richt = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.16, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
      richt.matrixAutoUpdate = false;
      richt.visible = false;
      ar.add(richt);
      bezigMetAR = true;
      arSessie = sessie;
      clearTimeout(mooiGepland);
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local');
      await renderer.xr.setSession(sessie);
      renderer.shadowMap.autoUpdate = true;
      const kijkruimte = await sessie.requestReferenceSpace('viewer');
      const treffers = await sessie.requestHitTestSource({ space: kijkruimte });
      // Tikken op de knoppen in de overlay plaatst de zetel niet.
      overlay.addEventListener('beforexrselect', (ev) => ev.preventDefault());
      sessie.addEventListener('select', () => {
        if (!richt.visible) return;
        arPlaats.position.setFromMatrixPosition(richt.matrix);
        // Met de voorkant naar de kijker.
        const cam = renderer.xr.getCamera();
        arPlaats.rotation.y = Math.atan2(cam.position.x - arPlaats.position.x, cam.position.z - arPlaats.position.z);
        arPlaats.visible = true;
        arZon.position.set(arPlaats.position.x + 1.2, arPlaats.position.y + 3, arPlaats.position.z + 1.6);
        arZon.target.position.copy(arPlaats.position);
      });
      renderer.setAnimationLoop((_t: number, frame: any) => {
        if (frame) {
          const ref = renderer.xr.getReferenceSpace();
          const hits = frame.getHitTestResults(treffers);
          if (hits.length) {
            richt.visible = true;
            richt.matrix.fromArray(hits[0].getPose(ref).transform.matrix);
          } else richt.visible = false;
        }
        renderer.render(ar, camera);
      });
      sessie.addEventListener('end', () => {
        treffers?.cancel?.();
        renderer.setAnimationLoop(null);
        renderer.xr.enabled = false;
        renderer.shadowMap.autoUpdate = false;
        // Alleen wat de AR-scène zelf maakte opruimen; de zetel deelt zijn vormen met de gewone weergave.
        vanger.geometry.dispose(); richt.geometry.dispose();
        arZon?.shadow?.map?.dispose();
        arSessie = arPlaats = arZon = null;
        bezigMetAR = false;
        schaduwOpnieuw();
        viewer.formaat();
        render(true);
        opEinde();
      });
      return null;
    },
    arDraai(graden) {
      if (arPlaats) arPlaats.rotation.y += (graden * Math.PI) / 180;
    },
    arStop() {
      void arSessie?.end();
    },
    standpunt(naam) {
      if (naam === 'voor') { hoekH = 0; hoekV = 0.12; }
      if (naam === 'boven') { hoekH = 0; hoekV = 1.45; }
      if (naam === 'zij') { hoekH = Math.PI / 2; hoekV = 0.15; }
      if (naam === 'schuin') { hoekH = -0.6; hoekV = 0.42; }
      if (naam === 'achter') { hoekH = Math.PI + 0.5; hoekV = 0.3; }
      afstand = Math.max(200, Math.max(kader.b, kader.d, 120) * 1.5) * lensFactor();
      // Ooghoogte: recht van voren, zoals een staande klant (camera op 155 cm), iets dichterbij.
      if (naam === 'ooghoogte') { hoekH = -0.25; afstand *= 0.85; hoekV = Math.asin(Math.max(-0.2, Math.min(0.95, (155 - doel.y) / afstand))); }
      plaatsCamera();
    },
    instellen(w) {
      // Alleen opnieuw opbouwen wat veranderd is: een schuifregelaar mag het decor niet bij elke stap herbouwen.
      const oud = weergave;
      weergave = { ...weergave, ...w };
      if (weergave.lens !== oud.lens) {
        // Zelfde beeldvulling houden bij een andere lens.
        afstand *= Math.tan((oud.lens * Math.PI) / 360) / Math.tan((weergave.lens * Math.PI) / 360);
        camera.fov = weergave.lens;
        camera.updateProjectionMatrix();
      }
      renderer.toneMappingExposure = Math.pow(2, weergave.helderheid);
      if (weergave.zonRichting !== oud.zonRichting) zetZon();
      if (weergave.maten !== oud.maten) zetMaten();
      if (weergave.draaien && !draaiLoopt) requestAnimationFrame(draaiLus);
      const decorAnders = (['vloer', 'muur', 'tapijt', 'spullen'] as const).some((k) => weergave[k] !== oud[k]) || !Object.keys(w).length;
      if (decorAnders) {
        // Kleurkiezers geven veel tussenwaarden: het decor pas na een korte rust herbouwen.
        clearTimeout(decorGepland);
        decorGepland = window.setTimeout(() => { zetDecor(null); render(); }, 120);
      }
      plaatsCamera();
    },
    markeer(id) {
      markeerId = id;
      zetMarkering();
      render(true);
    },
    formaat() {
      const b = houder.clientWidth || 600;
      laatsteBreedte = b;
      // In het groot scherm de beschikbare hoogte benutten (naast de knoppen eronder), anders 62 % van de breedte.
      const groot = document.body.classList.contains('heeft-groot-scherm');
      const h = groot ? Math.max(320, Math.min(Math.round(b * 1.1), window.innerHeight - 200)) : Math.round(b * 0.62);
      renderer.setSize(b, h);
      if (opties.zetel && !composer) maakComposer();
      if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(b, h); }
      camera.aspect = b / h;
      camera.updateProjectionMatrix();
      render();
    },
  };
  // Alleen bij een andere breedte, en pas in de volgende beeldronde: het canvas verandert zelf de hoogte van het
  // vak, en meteen herschalen gaf de browserwaarschuwing "ResizeObserver loop …" (als rode melding op het scherm).
  let gepland = 0;
  new ResizeObserver(() => {
    if (gepland || !houder.clientWidth || houder.clientWidth === laatsteBreedte) return;
    gepland = requestAnimationFrame(() => { gepland = 0; viewer.formaat(); });
  }).observe(houder);
  viewer.formaat();
  return viewer;
}
