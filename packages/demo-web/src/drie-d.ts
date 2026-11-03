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
  standpunt(naam: 'schuin' | 'voor' | 'boven' | 'zij' | 'achter'): void;
  formaat(): void;
}

/** Decors voor de zetel: vloer, muur, tapijt en een paar spullen. */
export const DECORS = {
  studio: { label: 'Studio', achtergrond: '#f2f1ed' },
  kamer: { label: 'Woonkamer', achtergrond: '#e7e2da', vloer: { soort: 'parket', kleur: '#9a7552' }, muur: { soort: 'verf', kleur: '#e4ded4' }, tapijt: '#cfc6b6', spullen: true },
  scandi: { label: 'Scandinavisch', achtergrond: '#eef0ee', vloer: { soort: 'parket', kleur: '#d6c09a' }, muur: { soort: 'verf', kleur: '#f4f3ef' }, tapijt: '#e8e3d8', spullen: true },
  loft: { label: 'Loft', achtergrond: '#d8d5cf', vloer: { soort: 'beton', kleur: '#a19d96' }, muur: { soort: 'steen', kleur: '#8a4a36' }, tapijt: '#4a4640', spullen: true },
} as const;
export type DecorNaam = keyof typeof DECORS;

/** Lichtsferen: zon (kleur, sterkte, hoogte), hemellicht, omgevingslicht en een warme lamp. */
export const LICHTEN = {
  studio: { label: 'Studio', zon: '#ffffff', zonSterkte: 0.8, hoogte: 1.6, hemel: 0.34, hemelKleur: '#ffffff', omgeving: 0.5, lamp: 0 },
  daglicht: { label: 'Daglicht', zon: '#fff3e2', zonSterkte: 1.05, hoogte: 0.9, hemel: 0.3, hemelKleur: '#dde8ff', omgeving: 0.45, lamp: 0 },
  avond: { label: 'Avond', zon: '#ffb36e', zonSterkte: 0.35, hoogte: 0.5, hemel: 0.1, hemelKleur: '#8f8aa8', omgeving: 0.22, lamp: 1 },
} as const;
export type LichtNaam = keyof typeof LICHTEN;
export type Kwaliteit = 'snel' | 'mooi';

export interface Opties3D {
  /** Zetelweergave: contactschaduw onder de zetel en keuze van decor (niet voor woningen). */
  zetel?: boolean;
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
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  houder.replaceChildren(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f2f1ed');
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
  // Studiolicht: een omgevingsbeeld (softboxen in een grijze ruimte) geeft zachte reflecties en glans;
  // daardoor kunnen de hemel- en vullicht zwakker.
  scene.environment = studioOmgeving();
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
    if (w === 'velours') return new THREE.MeshPhysicalMaterial({ ...basis, roughness: 0.8, sheen: 1, sheenColor: kleur(tint(hex, 1.3)), sheenRoughness: 0.55 });
    if (w === 'leder') return new THREE.MeshPhysicalMaterial({ ...basis, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    return new THREE.MeshStandardMaterial({ ...basis, roughness: w === 'chenille' ? 0.85 : 0.95 });
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

  /** Omgevingsbeeld: grijze ruimte met softboxen (boven, links, rechts achter, voor), voorgefilterd met PMREM. */
  function studioOmgeving() {
    try {
      const pm = new THREE.PMREMGenerator(renderer);
      const kamer = new THREE.Scene();
      const delen: any[] = [];
      const doos = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x5e5a54, side: THREE.BackSide }));
      delen.push(doos);
      const vloerOmg = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 0x3a3733 }));
      vloerOmg.rotation.x = -Math.PI / 2;
      vloerOmg.position.y = -4.9;
      delen.push(vloerOmg);
      const paneel = (x: number, y: number, z: number, b: number, h: number, sterkte: number) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(sterkte, sterkte, sterkte * 0.97), side: THREE.DoubleSide }));
        m.position.set(x, y, z);
        m.lookAt(0, 0, 0);
        delen.push(m);
      };
      paneel(0, 4.8, 0.5, 5, 4, 2.6);
      paneel(-4.8, 1.6, 1.5, 3, 3.5, 1.6);
      paneel(4.8, 1.2, -1.5, 2.5, 3, 0.8);
      paneel(0.5, 1, 4.8, 4, 2.5, 0.9);
      kamer.add(...delen);
      const t = pm.fromScene(kamer, 0.04).texture;
      for (const d of delen) { d.geometry.dispose(); d.material.dispose(); }
      pm.dispose();
      return t;
    } catch {
      return null;
    }
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
  const plantMat = new THREE.MeshStandardMaterial({ color: kleur('#4f6b3c'), roughness: 0.8 });
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
      if (v.soort === 'parket') {
        const t = parket(v.kleur);
        t.repeat.set(4000 / PARKET.b, 4000 / PARKET.h);
        m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, map: t, envMapIntensity: 0.5 });
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
    const dc = DECORS[decorNaam] as (typeof DECORS)[DecorNaam] & { vloer?: { soort: string; kleur: string }; muur?: { soort: string; kleur: string }; tapijt?: string; spullen?: boolean };
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
    if (dc.spullen) {
      // Staanlamp rechts, plant in pot links: eenvoudige vormen, alleen voor de sfeer.
      const lx = k.x + k.b + 45, lz = k.z + 15;
      const metaal = new THREE.MeshStandardMaterial({ color: kleur('#2b2b2b'), metalness: 0.7, roughness: 0.35 });
      const voet = new THREE.Mesh(new THREE.CylinderGeometry(14, 15, 2, 28), metaal); voet.position.set(lx, 1, lz); add(voet);
      const stang = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 150, 10), metaal); stang.position.set(lx, 76, lz); add(stang);
      const kap = new THREE.Mesh(new THREE.CylinderGeometry(16, 22, 26, 32, 1, true), new THREE.MeshStandardMaterial({ color: kleur('#efe7d8'), roughness: 0.9, side: THREE.DoubleSide, emissive: kleur('#ffd9a8'), emissiveIntensity: lichtNaam === 'avond' ? 0.6 : 0 }));
      kap.position.set(lx, 160, lz); add(kap, false);
      lamp.position.set(lx, 150, lz);
      lamp.intensity = LICHTEN[lichtNaam].lamp * 1.4 * PI;
      const px = k.x - 50, pz = k.z + 10;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(17, 13, 34, 28), new THREE.MeshStandardMaterial({ color: kleur(dc.muur?.soort === 'steen' ? '#6b6560' : '#d9d2c4'), roughness: 0.7 }));
      pot.position.set(px, 17, pz); add(pot);
      // Blad: een tiental platte, gekantelde ellipsen rond een stam.
      for (let i = 0; i < 11; i++) {
        const blad = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), plantMat);
        const hoek = (i / 11) * Math.PI * 2, hoogte = 60 + (i % 4) * 16;
        blad.scale.set(7, 1.2, 18);
        blad.position.set(px + Math.cos(hoek) * 14, hoogte, pz + Math.sin(hoek) * 14);
        blad.rotation.set(0.5 * Math.sin(i), -hoek + Math.PI / 2, 0.6);
        add(blad);
      }
      const stam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 70, 8), new THREE.MeshStandardMaterial({ map: houtNerf('#6a4a32'), roughness: 0.8 }));
      stam.position.set(px, 60, pz); add(stam);
    }
    scene.add(...kamerDelen);
    zetLicht();
  }
  function zetLicht() {
    const l = LICHTEN[lichtNaam];
    zon.color.set(l.zon);
    zon.intensity = l.zonSterkte * PI;
    hemel.intensity = l.hemel * PI;
    hemel.color.set(l.hemelKleur);
    OMGEVING = l.omgeving;
    // Alle materialen volgen het omgevingslicht van de sfeer.
    scene.traverse((o: any) => {
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) if ('envMapIntensity' in m && m !== studioVloer) m.envMapIntensity = l.omgeving;
    });
    for (const m of materialen.values()) if (m && 'envMapIntensity' in m) m.envMapIntensity = l.omgeving;
    zetZon();
  }
  function zetZon() {
    const grootte = Math.max(kader.b, kader.d, 120);
    const h = LICHTEN[lichtNaam].hoogte;
    zon.position.set(doel.x - grootte * 0.6, grootte * h, doel.z + grootte * 1.1);
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
  renderer.domElement.addEventListener('pointerdown', (ev: PointerEvent) => {
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
    aanwijzers.delete(ev.pointerId);
    knijpAfstand = 0;
    vorige = null;
  };
  renderer.domElement.addEventListener('pointerup', los);
  renderer.domElement.addEventListener('pointercancel', los);
  renderer.domElement.addEventListener('wheel', (ev: WheelEvent) => {
    // Gewoon scrollen laat de pagina doorscrollen; zoomen met Ctrl/⌘ + wiel (of knijpen), en in het groot scherm met het wiel.
    if (!(ev.ctrlKey || ev.metaKey || document.body.classList.contains('heeft-groot-scherm'))) {
      wielHint(houder, 'Zoomen: houd {sleutel} ingedrukt en scrol, of knijp');
      return;
    }
    ev.preventDefault();
    afstand = Math.min(2500, Math.max(120, afstand * (1 + Math.sign(ev.deltaY) * 0.1)));
    plaatsCamera();
  }, { passive: false });

  function render() {
    renderer.render(scene, camera);
  }

  let kader = { x: 0, z: 0, b: 230, d: 95, h: 80 };
  let kwaliteitNu: Kwaliteit = 'mooi';
  let laatsteBreedte = 0;
  const viewer: Viewer3D = {
    toon(s: Scene3D) {
      for (const c of [...groep.children]) {
        groep.remove(c);
        c.traverse((o: any) => o.geometry?.dispose());
      }
      sceneBlokken = s.blokken;
      for (const b of s.blokken) groep.add(mesh(b));
      zetContactschaduw(s);
      const nieuw = s.kader;
      const veranderd = Math.abs(nieuw.b - kader.b) > 1 || Math.abs(nieuw.d - kader.d) > 1 || Math.abs(nieuw.x - kader.x) > 1 || Math.abs(nieuw.z - kader.z) > 1;
      kader = nieuw;
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
      const maat = k === 'mooi' ? 4096 : 1024;
      zon.shadow.mapSize.set(maat, maat);
      zon.shadow.map?.dispose();
      zon.shadow.map = null;
      viewer.formaat();
    },
    foto() {
      // Even renderen op hoge resolutie (3× of minstens 2400 px breed), beeld nemen, terugzetten.
      try {
        const oud = renderer.getPixelRatio();
        const b = houder.clientWidth || 600;
        renderer.setPixelRatio(Math.max(3, 2400 / b));
        viewer.formaat();
        const url = renderer.domElement.toDataURL('image/png');
        renderer.setPixelRatio(oud);
        viewer.formaat();
        return url;
      } catch {
        return null;
      }
    },
    standpunt(naam) {
      if (naam === 'voor') { hoekH = 0; hoekV = 0.12; }
      if (naam === 'boven') { hoekH = 0; hoekV = 1.45; }
      if (naam === 'zij') { hoekH = Math.PI / 2; hoekV = 0.15; }
      if (naam === 'schuin') { hoekH = -0.6; hoekV = 0.42; }
      if (naam === 'achter') { hoekH = Math.PI + 0.5; hoekV = 0.3; }
      afstand = Math.max(200, Math.max(kader.b, kader.d, 120) * 1.5);
      plaatsCamera();
    },
    formaat() {
      const b = houder.clientWidth || 600;
      laatsteBreedte = b;
      // In het groot scherm de beschikbare hoogte benutten (naast de knoppen eronder), anders 62 % van de breedte.
      const groot = document.body.classList.contains('heeft-groot-scherm');
      const h = groot ? Math.max(320, Math.min(Math.round(b * 1.1), window.innerHeight - 200)) : Math.round(b * 0.62);
      renderer.setSize(b, h);
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
