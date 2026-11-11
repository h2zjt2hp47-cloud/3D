/// <reference path="./three.d.ts" />
/**
 * 3D-weergave van een vrij ontwerp met three.js (0.187, mee gebundeld in het HTML-bestand).
 * De motor levert de blokken (bouw3D); hier worden ze omgezet naar meshes.
 * Bediening: slepen = draaien, scrollen/knijpen = zoomen, knoppen = vaste standpunten.
 */
import type { Blok, Echt3DPlaatsing, Scene3D, Weefsel } from '../../core/src/index.js';
import { smeltMee, zachteVorm, type ZachteVorm } from '../../core/src/zachtevorm.js';
import { wielHint } from './zoom.js';
import { HOOGTE_KLEUR, KAART_PX, WEEFSEL_CM, WEEFSELKAART, weefselCanvas, weefselKaarten } from './weefsel.js';
import { bouwDecor, type DecorSpec } from './decor3d.js';

import * as THREE_ from 'three';
import { RenderPipeline, WebGPURenderer } from 'three/webgpu';
import { float, mix, mrt, normalView, output, packNormalToRGB, pass, sample, smoothstep, unpackRGBToNormal, vec4 } from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { denoise } from 'three/addons/tsl/display/DenoiseNode.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { fotoWebGPU, heeftWebGPU } from './fotomodus-webgpu.js';

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
  /** Foto van het huidige beeld in hoge resolutie (standaard PNG van ±2400 px; met `breedte`, `type` en `kwaliteit` een eigen formaat). */
  foto?(o?: { breedte?: number; type?: string; kwaliteit?: number }): string | null;
  /** Het beeld zoals het nu op het scherm staat (tekenen en meteen lezen; met WebGPU kan het canvas niet later gelezen worden). */
  beeld?(type?: string, kwaliteit?: number): string | null;
  /**
   * Fotorealistische foto: path tracing (echte lichtweerkaatsing, zachte schaduwen) met `stappen` monsters.
   * Toont het beeld al tijdens het rekenen; geeft de PNG als data-URL, of null bij annuleren of een fout.
   */
  /**
   * Fotomodus. Met WebGPU (bv. Safari 26+ op een Mac) de WebGPU-path tracer met ontruiser, anders of bij een fout de
   * WebGL-path tracer. `opMethode` meldt welke gebruikt wordt.
   */
  fotoRealistisch?(o: { stappen: number; breedte?: number; opVoortgang?: (deel: number) => void; signaal?: AbortSignal; opMethode?: (m: 'webgpu' | 'webgl', reden?: string) => void }): Promise<string | null>;
  standpunt(naam: Standpunt): void;
  /** De camera op een exacte stand zetten, zonder animatie (voor tests en om te vergelijken met een foto): hoeken in radialen, afstand in cm. */
  kijk?(s: { hoekH?: number; hoekV?: number; afstand?: number }): void;
  /** Losse instellingen bovenop decor en licht (vloer, muur, maten, draaien …). */
  instellen?(w: Partial<Weergave3D>): void;
  /** Element in de 3D aanduiden met een kader (null = niets). */
  markeer?(id: string | null): void;
  formaat(): void;
  /**
   * Wacht tot het beeld af is: de weergave gestart, alles geladen (stoffoto's, 3D-bestanden), de zachte vormen berekend,
   * het decor opgebouwd, de camera op zijn eindpunt en de schaduw bijgewerkt. Daarna staat het definitieve beeld op het
   * canvas. Voor gereedschap en tests (scripts/3d): geen vaste wachttijden meer, en geen half afgewerkt beeld.
   */
  stil?(): Promise<void>;
  /** Cijfers van de weergave, om te meten in plaats van te gokken (zie Info3D). */
  info?(): Info3D;
}

/** Wat de weergave over zichzelf weet: de weg (WebGPU of WebGL2) en de belasting van het laatste beeld. */
export interface Info3D {
  weg: 'webgpu' | 'webgl2';
  /** Aantal tekenopdrachten en driehoeken van het laatste beeld. */
  tekenbeurten: number;
  driehoeken: number;
  /** Wat in het geheugen van de grafische kaart staat: loopt dit op bij elke wijziging, dan is er een lek. */
  geometrieen: number;
  texturen: number;
  /** Onderdelen in de scène van het product (zonder decor). */
  onderdelen: number;
}

export type Standpunt = 'schuin' | 'voor' | 'boven' | 'zij' | 'achter' | 'ooghoogte';
export type EchtToestand = 'getoond' | 'laden' | 'benadering' | 'fout' | 'geen';

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
  /** Echt 3D-model tonen als het model er een heeft; false = de benadering met blokken. Leeg = aan. */
  echtModel?: boolean;
  /** Vormen: blokken (zoals altijd) of zacht (proef: onderbouw, armen en rug samengesmolten tot één zachte vorm). */
  vormen?: 'blokken' | 'zacht';
}
export const STANDAARD_WEERGAVE: Weergave3D = { vloer: 'decor', muur: 'decor', tapijt: 'decor', spullen: 'decor', maten: false, draaien: false, lens: 35, helderheid: 0, zonRichting: 120, echtModel: true, vormen: 'blokken' };

/** Decors voor de zetel: vloer, muur, tapijt en een paar spullen. */
export const DECORS = {
  studio: { label: 'Studio', achtergrond: '#f2f1ed' },
  // Fotodoek (11/11): een grijs achterdoek zoals op de productfoto's van de website (Attribute, Azar, Wallace): de lichte
  // vloer loopt weg in het grijs, zodat ook een witte of lichte zetel zich goed aftekent.
  fotodoek: { label: 'Fotodoek (grijs)', achtergrond: '#8e8983' },
  // Salon (10/11): de kamer van de productfoto's van Doha als voorbeeld: lichte wanden met kaderlijsten, hoog raam met
  // lichte gordijnen, grijze eiken vloer, rond oudroze tapijt, ronde houten salontafel, zwarte staanlamp, takken in een
  // vaas en een lijntekening aan de wand. Onze eigen benadering met de bestaande bouwstenen, geen kopie van de foto.
  salon: {
    label: 'Salon', achtergrond: '#e4dfd7', vloer: { soort: 'parket', kleur: '#b3a48f' }, muur: { soort: 'verf', kleur: '#ddd6cb' }, wanden: 'hoek',
    raam: { kader: '#f3f1ec', gordijn: '#efe9de', zicht: 'stad' }, afwerking: { soort: 'lijsten', kleur: '#e6e0d6' },
    tapijt: { kleur: '#c9a79b', rand: '#b9928a', vorm: 'rond' }, tafel: 'hout_rond', lamp: 'staand', plant: 'tak',
    kunst: { stijl: 'lijnen', kleuren: ['#d9d0c0', '#f4f0e8', '#1c1c1c'], lijst: '#cbb99a' }, zon: 15,
  },
  kamer: {
    label: 'Woonkamer', achtergrond: '#e7e2da', vloer: { soort: 'parket', kleur: '#9a7552' }, muur: { soort: 'verf', kleur: '#e6dfd3' }, wanden: 'hoek',
    raam: { kader: '#f4f2ed', gordijn: '#e8dfcf', zicht: 'tuin' }, afwerking: { soort: 'lambrisering', kleur: '#efe9df' },
    tapijt: { kleur: '#cfc4b2', rand: '#a59782', patroon: 'rand' }, tafel: 'travertin', bijzettafel: '#a9825a', lamp: 'staand', plant: 'ficus',
    kunst: { stijl: 'abstract', kleuren: ['#efe8dc', '#c9a27a', '#7d8b78', '#2f3a3a'], lijst: '#2b2b2b' }, zon: 15,
  },
  scandi: {
    label: 'Scandinavisch', achtergrond: '#eef0ee', vloer: { soort: 'parket', kleur: '#d6c09a' }, muur: { soort: 'verf', kleur: '#f4f3ef' }, wanden: 'hoek',
    raam: { kader: '#ffffff', gordijn: '#f6f4ef', zicht: 'tuin', breed: true }, tapijt: { kleur: '#e9e4da', vorm: 'rond' }, tafel: 'hout_rond', lamp: 'staand', plant: 'ficus',
    kunst: { stijl: 'lijnen', kleuren: ['#f7f4ee', '#2b2b2b', '#c98f6b'], lijst: '#c9a77d' }, zon: 10,
  },
  kust: {
    label: 'Aan zee', achtergrond: '#eef1f2', vloer: { soort: 'parket', kleur: '#e0cfae' }, muur: { soort: 'verf', kleur: '#f3efe7' }, wanden: 'hoek',
    raam: { kader: '#ffffff', gordijn: '#f2ede3', zicht: 'duin', breed: true }, tapijt: { kleur: '#e6dccb', rand: '#9fb3bf', patroon: 'streep' }, tafel: 'hout_rond', lamp: 'staand', plant: 'olijf',
    kunst: { stijl: 'landschap', kleuren: ['#e9eef0', '#bcd0da', '#d9ccb1', '#8fa7b3', '#c6b48f'], lijst: '#f4f1ea' }, zon: 5,
  },
  loft: {
    label: 'Loft', achtergrond: '#d8d5cf', vloer: { soort: 'beton', kleur: '#a19d96' }, muur: { soort: 'steen', kleur: '#8a4a36' }, wanden: 'hoek',
    raam: { kader: '#1f1f1f', zicht: 'stad', breed: true }, tapijt: { kleur: '#4a4640', patroon: 'streep' }, tafel: 'metaal', lamp: 'boog', plant: 'olijf',
    kunst: { stijl: 'abstract', kleuren: ['#e9e5dc', '#1f1f1f', '#b5523b', '#d8b25a'], lijst: '#1f1f1f' }, zon: 12,
  },
  appartement: {
    label: 'Stadsappartement', achtergrond: '#e6e3de', vloer: { soort: 'parket', kleur: '#6e5440' }, muur: { soort: 'verf', kleur: '#e9e6e1' }, wanden: 'hoek',
    raam: { kader: '#1f1f1f', gordijn: '#cfc7bb', zicht: 'stad', breed: true }, tapijt: { kleur: '#8c8579', rand: '#5e584f', patroon: 'rand' }, tafel: 'marmer', lamp: 'boog', plant: 'olijf',
    kunst: { stijl: 'lijnen', kleuren: ['#f2efe9', '#1f1f1f', '#b08a5e'], lijst: '#1f1f1f' }, zon: 8,
  },
  japandi: {
    label: 'Japandi', achtergrond: '#ebe7df', vloer: { soort: 'parket', kleur: '#c9b089' }, muur: { soort: 'verf', kleur: '#d4d3c3' }, wanden: 'hoek',
    raam: { kader: '#cdb38f', gordijn: '#e9e2d3', zicht: 'tuin' }, afwerking: { soort: 'latten', kleur: '#b8946a' },
    tapijt: { kleur: '#d8cfbf', rand: '#b9ab93', vorm: 'rond' }, tafel: 'hout_laag', lamp: 'papier', plant: 'tak', zon: 18,
  },
  klassiek: {
    label: 'Klassiek', achtergrond: '#e2ddd3', vloer: { soort: 'parket', kleur: '#5f4430' }, muur: { soort: 'verf', kleur: '#3f5246' }, wanden: 'hoek',
    raam: { kader: '#f1ede4', gordijn: '#8a6d4d', zicht: 'tuin' }, afwerking: { soort: 'lijsten', kleur: '#4a5f52' },
    tapijt: { kleur: '#b9a98f', rand: '#6d3b35', patroon: 'rand' }, tafel: 'marmer', bijzettafel: 'messing', lamp: 'messing', plant: 'ficus',
    kunst: { stijl: 'klassiek', kleuren: ['#2a2a22', '#c9b78c', '#8a8c6c', '#3d4a33'], lijst: '#b8954f' }, zon: 20,
  },
  toonzaal: { label: 'Toonzaal', achtergrond: '#e9e9e7', vloer: { soort: 'beton', kleur: '#cfccc6' }, muur: { soort: 'verf', kleur: '#f5f5f2' }, wanden: 'achter', podium: true, zon: 150 },
  terras: {
    label: 'Terras', achtergrond: '#cddbe6', vloer: { soort: 'planken', kleur: '#8a6a4c' }, buiten: true,
    tapijt: { kleur: '#8f8b80', rand: '#5d5a52', patroon: 'streep' }, tafel: 'teak', plant: 'olijf', zon: 140,
  },
} satisfies Record<string, DecorSpec>;
export type DecorNaam = keyof typeof DECORS;

/**
 * Lichtsferen: zon (kleur, sterkte, hoogte), hemellicht, omgevingslicht en een warme lamp.
 * `omgeving` is de echte sterkte van het omgevingsbeeld (three.js: `scene.environmentIntensity`, 1 = vol). `omgevingFoto`
 * is de sterkte in de fotomodus (path tracing), die het omgevingsbeeld zwaarder laat doorwegen.
 */
export const LICHTEN = {
  studio: {
    label: 'Studio', zon: '#ffffff', zonSterkte: 0.8, hoogte: 1.6, hemel: 0.34, hemelKleur: '#ffffff', omgeving: 1, omgevingFoto: 0.5, lamp: 0,
    // Omgevingsbeeld (lineaire HDR-waarden): wanden, vloer en lichtbronnen (richting, hoekstraal in graden, sterkte, kleur).
    hdr: { boven: [0.11, 0.1, 0.095], onder: [0.04, 0.037, 0.034], bronnen: [[[0, 1, 0.1], 28, 2.6, [1, 1, 0.97]], [[-0.95, 0.32, 0.3], 19, 1.6, [1, 1, 0.97]], [[0.95, 0.24, -0.3], 16, 0.8, [1, 1, 0.97]], [[0.1, 0.2, 0.97], 22, 0.9, [1, 1, 0.97]]] },
  },
  daglicht: {
    label: 'Daglicht', zon: '#fff3e2', zonSterkte: 1.05, hoogte: 0.9, hemel: 0.3, hemelKleur: '#dde8ff', omgeving: 1, omgevingFoto: 0.45, lamp: 0,
    hdr: { boven: [0.35, 0.45, 0.62], onder: [0.06, 0.05, 0.04], bronnen: [[[-0.8, 0.25, 0.55], 30, 3.2, [1, 0.98, 0.95]], [[0, 1, 0], 45, 0.9, [0.75, 0.85, 1]], [[0.9, 0.2, 0.4], 14, 0.6, [1, 1, 1]]] },
  },
  ochtend: {
    label: 'Ochtend (zacht)', zon: '#ffe2c0', zonSterkte: 0.7, hoogte: 0.55, hemel: 0.36, hemelKleur: '#e6ecff', omgeving: 1, omgevingFoto: 0.6, lamp: 0,
    hdr: { boven: [0.3, 0.33, 0.42], onder: [0.06, 0.055, 0.05], bronnen: [[[-0.9, 0.12, 0.4], 34, 2.2, [1, 0.9, 0.78]], [[0, 1, 0], 50, 0.7, [0.85, 0.9, 1]]] },
  },
  bewolkt: {
    label: 'Bewolkt (diffuus)', zon: '#f2f4f7', zonSterkte: 0.25, hoogte: 1.8, hemel: 0.5, hemelKleur: '#eef2f8', omgeving: 1, omgevingFoto: 0.75, lamp: 0,
    hdr: { boven: [0.55, 0.57, 0.6], onder: [0.08, 0.08, 0.08], bronnen: [[[0, 1, 0], 70, 1.2, [1, 1, 1]]] },
  },
  avond: {
    label: 'Avond', zon: '#ffc994', zonSterkte: 0.4, hoogte: 0.5, hemel: 0.18, hemelKleur: '#bcb1a6', omgeving: 1, omgevingFoto: 0.32, lamp: 1,
    // Zonder wanden (studio, terras): een donkere, warme achtergrond waarin de vloer wegloopt (gedimde fotostudio).
    achtergrond: '#2f2925',
    hdr: { boven: [0.06, 0.05, 0.043], onder: [0.022, 0.018, 0.015], bronnen: [[[0.85, 0.5, -0.2], 18, 3, [1, 0.8, 0.6]], [[-0.9, 0.2, 0.3], 22, 0.3, [0.7, 0.74, 0.9]]] },
  },
  fotostudio: {
    // Echte omgeving (HDRI, CC0, zie demo-web/omgeving/BRON.md): scherpere, echte spiegelingen. Zonder het bestand
    // (bv. in de bouwdemo) het zelfgemaakte studiobeeld hieronder.
    label: 'Fotostudio (echte omgeving)', zon: '#ffffff', zonSterkte: 0.7, hoogte: 1.6, hemel: 0.3, hemelKleur: '#ffffff', omgeving: 1, omgevingFoto: 0.5, lamp: 0,
    hdri: 'studio_small_09',
    hdr: { boven: [0.11, 0.1, 0.095], onder: [0.04, 0.037, 0.034], bronnen: [[[0, 1, 0.1], 28, 2.6, [1, 1, 0.97]], [[-0.95, 0.32, 0.3], 19, 1.6, [1, 1, 0.97]], [[0.95, 0.24, -0.3], 16, 0.8, [1, 1, 0.97]], [[0.1, 0.2, 0.97], 22, 0.9, [1, 1, 0.97]]] },
  },
  spots: {
    label: 'Toonzaal (spots)', zon: '#fff6ea', zonSterkte: 0.95, hoogte: 2.2, hemel: 0.18, hemelKleur: '#fff8f0', omgeving: 1, omgevingFoto: 0.4, lamp: 0,
    hdr: { boven: [0.05, 0.048, 0.045], onder: [0.03, 0.028, 0.026], bronnen: [[[-0.3, 0.95, 0.2], 9, 9, [1, 0.95, 0.88]], [[0.35, 0.94, 0.1], 9, 9, [1, 0.95, 0.88]], [[0, 0.3, 1], 30, 0.5, [1, 1, 1]]] },
  },
} as const;
export type LichtNaam = keyof typeof LICHTEN;
/**
 * IJking van het licht voor de zetel (11/11). Gemeten met een blok in drie stoffen (wit, middengrijs, petrol): de
 * bovenkant was in elke lichtsfeer veel helderder dan de staal (lineair 1,5 tot 2,5 ×) en de voorkant ongeveer gelijk
 * aan de staal. Gevolg: een lichte zetel brandde uit tot een witte vlek en een kleur zag er op de zitting veel lichter
 * uit dan op de staal. Doel per sfeer: bovenkant ±1,3 × de staal, voorkant ±0,9 ×, zodat de vorm leesbaar blijft en de
 * kleur klopt. Alleen voor de zetel: de bouwdemo (woning, raam) houdt de waarden uit LICHTEN.
 * `belichting` vermenigvuldigt de belichting van het hele beeld; de andere velden vervangen die van LICHTEN.
 * Gemeten na de ijking (middengrijs, lineair t.o.v. de staal, bovenkant / voorkant): studio 1,46 / 0,89 · daglicht
 * 1,28 / 0,95 · ochtend 1,17 / 0,90 · fotostudio 1,26 / 0,89 · toonzaal 1,5 / 0,64 (bewust contrastrijk).
 *
 * Omgevingslicht (opgeruimd op 11/11): three.js leest de sterkte van het omgevingsbeeld uit `scene.environmentIntensity`;
 * `envMapIntensity` van een materiaal telt niet meer mee (sinds WebGPURenderer, 4/11). Vroeger stond die waarde op elk
 * materiaal en in elke sfeer, zonder effect: het omgevingslicht stond overal op volle sterkte. Nu is er nog één
 * instelling, `omgeving` (1 = vol), die doet wat ze zegt. De ijking is met volle sterkte gemeten en blijft kloppen; alleen
 * Bewolkt dempt (0,25), omdat zijn omgevingsbeeld het helderst is. Gemeten voor Bewolkt (lineair t.o.v. de staal):
 * bovenkant = belichting × (1,82 × omgeving + hemel + 0,6 × zon), voorkant = belichting × (0,65 × omgeving + 0,75 × hemel
 * + 0,3 × zon). Nameten: `npm run lichtmeting` (ook voor de bouwdemo: `-- --bron ijk-bouw`).
 */
const ZETEL_LICHT: Partial<Record<LichtNaam, { zonSterkte?: number; hemel?: number; omgeving?: number; omgevingFoto?: number; hoogte?: number; belichting?: number }>> = {
  studio: { zonSterkte: 0.78, hemel: 0.04, omgevingFoto: 0.36, hoogte: 0.8 },
  daglicht: { zonSterkte: 0.85, hemel: 0.12, omgevingFoto: 0.3, belichting: 0.72 },
  ochtend: { belichting: 0.8 },
  bewolkt: { zonSterkte: 0.1, hemel: 0.8, omgeving: 0.25, belichting: 1.15 },
  fotostudio: { belichting: 0.8 },
  spots: { hemel: 0.26, belichting: 0.9 },
};
/**
 * IJking van het licht voor de bouwweergave (woning, raam, inrichting), 11/11. Gemeten met `npm run lichtmeting -- --bron
 * ijk-bouw`: met de waarden van LICHTEN was een bovenvlak 1,84 keer zo helder als zijn staal (dak, vloer, tafelblad,
 * bovenkant van een muur), zodat witte kasten, bedden en badkamers uitbrandden tot één witte vlek. Zelfde doel als bij de
 * zetel: bovenkant ±1,4 × de staal, voorkant ±0,9 ×. De bouwdemo gebruikt alleen de sfeer Studio.
 */
const BOUW_LICHT: Partial<Record<LichtNaam, { zonSterkte?: number; hemel?: number; omgeving?: number; hoogte?: number; belichting?: number }>> = {
  studio: { hemel: 0.16, omgeving: 0.6, zonSterkte: 1, hoogte: 1.3, belichting: 1 },
};
export type Kwaliteit = 'snel' | 'mooi';
type Hdr = { boven: readonly number[]; onder: readonly number[]; bronnen: readonly (readonly [readonly number[], number, number, readonly number[]])[] };

/**
 * Omgevingsbeeld als HDR-equirect (lineair, 1024 × 512): wanden boven/onder de horizon en zachte ronde lichtbronnen.
 * three.js maakt er een kubus van een kwart van de breedte van (256 px per zijde): scherp genoeg voor spiegelingen op
 * glas, aluminium en lak (bij 256 × 128 was dat 64 px, vage spiegelingen).
 * Dient de gewone weergave (reflecties, glans) én de fotomodus (path tracing).
 */
function hdrBeeld(h: Hdr) {
  const W = 1024, H = 512, data = new Float32Array(W * H * 4);
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
  return alsHalf(data, W, H);
}
/**
 * Omgevingsbeeld in halve getallen (16 bit): WebGPU filtert 32-bit-getallen alleen met een extra functie van de
 * grafische kaart, halve altijd. Het gemiddelde (voor de helderheid van een HDRI) wordt vooraf op de echte waarden bewaard.
 */
function alsHalf(data: Float32Array, W: number, H: number) {
  const half = new Uint16Array(data.length);
  for (let i = 0; i < data.length; i++) half[i] = THREE.DataUtils.toHalfFloat(data[i]!);
  const t = new THREE.DataTexture(half, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.LinearSRGBColorSpace;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.userData.gemiddelde = gemiddelde(data);
  t.needsUpdate = true;
  return t;
}
const hdrCache = new Map<string, any>();
/** Gemiddelde helderheid van een omgevingsbeeld (lineair, RGBA in floats). */
function gemiddelde(data: ArrayLike<number>) {
  let s = 0;
  for (let i = 0; i < data.length; i += 4) s += 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
  return s / (data.length / 4);
}
/**
 * Een ingesloten HDRI (window.__OMGEVINGEN, base64, zonder fetch) als omgevingsbeeld, op dezelfde gemiddelde helderheid
 * als het zelfgemaakte beeld van die lichtsfeer: zo blijven zon, hemel en `omgeving` in verhouding. Null zonder bestand.
 */
function hdriBeeld(sleutel: string, doel: number) {
  const b64 = (window as unknown as { __OMGEVINGEN?: Record<string, string> }).__OMGEVINGEN?.[sleutel];
  if (!b64) return null;
  try {
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const bron = new HDRLoader().setDataType(THREE.FloatType).createDataTexture(bytes.buffer);
    const data = bron.image.data as Float32Array, f = doel / (gemiddelde(data) || 1);
    for (let i = 0; i < data.length; i++) if (i % 4 !== 3) data[i] = data[i]! * f;
    // HDRLoader keert de rijen om bij het tekenen (flipY); in halve getallen zelf omkeren, zoals de equirect verwacht.
    const W = bron.image.width, H = bron.image.height, rijen = new Float32Array(data.length);
    for (let y = 0; y < H; y++) rijen.set(data.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    bron.dispose();
    return alsHalf(bron.flipY ? rijen : data, W, H);
  } catch (fout) {
    console.error('Omgevingsbeeld niet gelezen:', fout);
    return null;
  }
}
function omgevingVoor(naam: LichtNaam) {
  let t = hdrCache.get(naam);
  if (!t) {
    t = hdrBeeld(LICHTEN[naam].hdr as unknown as Hdr);
    const hdri = (LICHTEN[naam] as { hdri?: string }).hdri;
    if (hdri) t = hdriBeeld(hdri, t.userData.gemiddelde) ?? t;
    hdrCache.set(naam, t);
  }
  return t;
}

export interface Opties3D {
  /** Zetelweergave: contactschaduw onder de zetel en keuze van decor (niet voor woningen). */
  zetel?: boolean;
  /** Klik (zonder slepen) op een deel van de zetel: het id van het element, of null naast de zetel. */
  opKlik?: (elementId: string | null) => void;
  /**
   * Na elke opbouw: het echte 3D-model dat in beeld staat (of null) en de toestand: getoond, laden, benadering
   * (gevraagd), fout (bestand kon niet geladen worden) of geen (het model heeft geen 3D-bestand of het past niet).
   */
  opEcht?: (getoond: Echt3DPlaatsing | null, toestand: EchtToestand) => void;
  /**
   * Bouwweergave: onderdelen met hetzelfde materiaal samenvoegen tot één vorm (zie voegSamen). Standaard aan; `false`
   * tekent elk onderdeel apart, om beide te kunnen vergelijken.
   */
  samenvoegen?: boolean;
}

/**
 * Vaste toevalsreeks (Park-Miller) voor de getekende texturen van vloer, wand en hout: dezelfde tekening bij elke keer
 * laden (vroeger Math.random: telkens een ander parket). Ook nodig voor de beeldvergelijking (scripts/beeldvergelijking.mjs).
 */
function vasteReeks(sleutel: string) {
  let s = [...sleutel].reduce((h, t) => (h * 31 + t.charCodeAt(0)) % 2147483647, 7) || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function maak3D(houder: HTMLElement, opties: Opties3D = {}): Viewer3D | null {
  // WebGPU (04-11): WebGPURenderer, op WebGPU waar de browser het heeft (Safari 26+, Chrome), anders op WebGL2. Zonder
  // navigator.gpu kiezen we zelf WebGL2 met een bewaard beeld (preserveDrawingBuffer), zodat een beeld van het canvas
  // ook later te nemen is (tests, oudere browsers). Met WebGPU: beelden altijd via beeld() of foto() (tekenen en lezen
  // in één keer).
  let renderer: any;
  let webgpu = false;
  try {
    const webgl2 = (canvas: HTMLCanvasElement) => canvas.getContext('webgl2', { antialias: true, alpha: true, depth: true, stencil: false, preserveDrawingBuffer: true });
    if ('gpu' in navigator) {
      const parameters: Record<string, unknown> = { antialias: true };
      renderer = new WebGPURenderer(parameters);
      webgpu = true;
      // Geeft de browser toch geen WebGPU (navigator.gpu zonder adapter), dan valt three terug op WebGL2: ook dan met
      // een bewaard beeld. De terugval leest parameters.context, dus die zetten we vlak ervoor.
      const terugval = renderer._getFallback;
      if (terugval) renderer._getFallback = (fout: unknown) => { parameters.context = webgl2(renderer.domElement) ?? undefined; return terugval(fout); };
    } else {
      const canvas = document.createElement('canvas');
      const context = webgl2(canvas);
      if (!context) throw new Error('geen WebGL2');
      renderer = new WebGPURenderer({ canvas, context, antialias: true, forceWebGL: true });
    }
  } catch {
    houder.textContent = '3D wordt niet ondersteund in deze browser (WebGPU en WebGL2 ontbreken).';
    return null;
  }
  /** Pas na init() kan de renderer tekenen; tot dan wordt elk beeld uitgesteld. */
  let klaar = false;
  // De tellers (tekenbeurten, driehoeken) zelf per beeld op nul zetten, zodat ze het hele beeld beschrijven en niet
  // alleen de laatste beurt van de nabewerking.
  if (renderer.info) renderer.info.autoReset = false;
  /** Wat het beeld nog kan veranderen (zie stil()): stoffoto's die laden, zachte vormen in berekening, een uitgesteld decor. */
  let ladend = 0, zachtBezig = false, decorBezig = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  // Zo scherp als de kaart toelaat onder een schuine hoek: weefsel op een zitting of rug wordt zo niet wazig. 16 is het
  // maximum van WebGPU; de WebGL2-weg begrenst zelf op wat de kaart kan.
  const maxAnisotropie = 16;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  // Zetel: zachte schaduwen (VSM, vervaagd); woning: PCF-schaduwen (PCFSoft bestaat niet in WebGPURenderer).
  renderer.shadowMap.type = opties.zetel ? THREE.VSMShadowMap : THREE.PCFShadowMap;
  // Schaduwen alleen opnieuw berekenen als de scène of het licht verandert, niet bij elke camerabeweging: in
  // WebGPURenderer per licht (shadow.autoUpdate / needsUpdate). De zon is het enige licht met schaduw.
  // Na een wijziging nog twee keer kort daarna: nieuwe delen worden soms pas een beeld later getekend (hun shader wordt
  // op de achtergrond gemaakt), en zouden anders in de schaduw ontbreken.
  let zonSchaduw: any = null, schaduwLater: number[] = [];
  const schaduwOpnieuw = () => {
    if (!zonSchaduw) return;
    zonSchaduw.needsUpdate = true;
    schaduwLater.forEach(clearTimeout);
    schaduwLater = [150, 600].map((ms) => window.setTimeout(() => { zonSchaduw.needsUpdate = true; render(); }, ms));
  };
  houder.replaceChildren(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f2f1ed');
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
  // Studiolicht: een omgevingsbeeld (softboxen in een grijze ruimte) geeft zachte reflecties en glans;
  // daardoor kunnen de hemel- en vullicht zwakker.
  scene.environment = omgevingVoor('studio');
  const hemel = new THREE.HemisphereLight(0xffffff, 0xb8b2a7, 0.34 * PI);
  scene.add(hemel);
  // Warme lamp (bij de staanlamp in het decor), alleen aan bij de lichtsfeer "Avond".
  // Lamplicht neemt af met de afstand (verval 1): een lichtplas rond de lamp, zoals in het echt.
  const lamp = new THREE.PointLight(0xffd2a0, 0, 900, 1);
  lamp.castShadow = false;
  scene.add(lamp);
  const zon = new THREE.DirectionalLight(0xffffff, 0.8 * PI);
  zon.castShadow = true;
  zon.shadow.autoUpdate = false;
  zon.shadow.needsUpdate = true;
  zonSchaduw = zon.shadow;
  zon.shadow.mapSize.set(2048, 2048);
  zon.shadow.bias = -0.0005;
  if (opties.zetel) { zon.shadow.radius = 7; zon.shadow.blurSamples = 10; zon.shadow.bias = -0.0002; }
  scene.add(zon, zon.target);
  const vul = new THREE.DirectionalLight(0xffffff, 0.16 * PI);
  scene.add(vul);
  const studioVloer = new THREE.MeshStandardMaterial({ color: 0xdcd8d0, roughness: 1 });
  const vloer = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), studioVloer);
  vloer.rotation.x = -Math.PI / 2;
  vloer.receiveShadow = true;
  scene.add(vloer);

  // Fijne weefselstructuur voor stof (kleur komt van het materiaal).
  const weefsel = (() => {
    const toeval = vasteReeks('weefsel');
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 2) {
      g.fillStyle = `rgba(0,0,0,${0.035 + toeval() * 0.03})`;
      g.fillRect(0, i, 64, 1);
      g.fillStyle = `rgba(0,0,0,${0.02 + toeval() * 0.03})`;
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
  /**
   * Kleur van glas met transmission: de kleur kleurt het licht dat erdoor gaat, dus halfweg naar wit (de glaskleuren
   * werden gekozen voor half doorzichtig glas). Gewoon glas blijft licht blauwgroen, zonwerend glas duidelijk donkerder.
   */
  function glasTint(hex: string) {
    const c = kleur(hex);
    return c.clone().lerp(new THREE.Color(0xffffff), 0.55);
  }
  function tint(hex: string, f: number) {
    // Lichter of donkerder, begrensd op 0–255 per kanaal (anders lopen lichte kleuren over).
    // Rechtstreeks op de sRGB-waarden (voor canvastekeningen), niet via THREE.Color (die rekent lineair).
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    const [r, g, b] = m ? [m[1], m[2], m[3]].map((x) => parseInt(x!, 16)) : [200, 200, 200];
    const k = (x: number) => Math.max(0, Math.min(255, Math.round(x * f))).toString(16).padStart(2, '0');
    return `#${k(r!)}${k(g!)}${k(b!)}`;
  }
  function baksteen(hex: string, voeg = '#cfc8bb') {
    const toeval = vasteReeks('baksteen' + hex);
    const px = 4, c = document.createElement('canvas');
    c.width = STEEN.b * px;
    c.height = STEEN.h * px;
    const g = c.getContext('2d')!;
    g.fillStyle = voeg;
    g.fillRect(0, 0, c.width, c.height);
    for (let rij = 0; rij < 10; rij++) {
      const off = rij % 2 ? 11 : 0;
      for (let s = -1; s < 5; s++) {
        g.fillStyle = tint(hex, 0.82 + toeval() * 0.3);
        g.fillRect((s * 22 + off) * px, (rij * 6) * px, 21 * px, 5 * px);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function planken(hex: string) {
    const toeval = vasteReeks('planken' + hex);
    const px = 2, c = document.createElement('canvas');
    c.width = PLANK.b * px;
    c.height = PLANK.h * px;
    const g = c.getContext('2d')!;
    for (let p = 0; p < 4; p++) {
      g.fillStyle = tint(hex, 0.85 + toeval() * 0.25);
      g.fillRect(p * 12 * px, 0, 12 * px, c.height);
      for (let n = 0; n < 6; n++) {
        g.fillStyle = `rgba(0,0,0,${0.04 + toeval() * 0.05})`;
        g.fillRect((p * 12 + 1 + toeval() * 10) * px, 0, 1, c.height);
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
    const toeval = vasteReeks('tegels' + hex);
    // 60 × 60 cm tegels met voeg; lichte kleurvariatie per tegel.
    const px = 4, c = document.createElement('canvas');
    c.width = c.height = 120 * px;
    const g = c.getContext('2d')!;
    g.fillStyle = tint(hex, 0.78);
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = tint(hex, 0.95 + toeval() * 0.08);
      g.fillRect((i * 60 + 0.3) * px, (j * 60 + 0.3) * px, 59.4 * px, 59.4 * px);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function parket(hex: string) {
    const toeval = vasteReeks('parket' + hex);
    // Planken van 20 × 120 cm in halfsteens verband.
    const px = 2, c = document.createElement('canvas');
    c.width = 240 * px;
    c.height = 80 * px;
    const g = c.getContext('2d')!;
    for (let rij = 0; rij < 4; rij++) {
      const off = (rij % 2) * 60;
      for (let s = -1; s < 2; s++) {
        // Rustig kleurverschil tussen de planken (tot 11/11 0,86–1,10: de vloer leek een dambord van grote blokken).
        g.fillStyle = tint(hex, 0.93 + toeval() * 0.12);
        g.fillRect((s * 120 + off) * px, rij * 20 * px, 120 * px, 20 * px);
        for (let n = 0; n < 5; n++) {
          g.fillStyle = `rgba(0,0,0,${0.03 + toeval() * 0.04})`;
          g.fillRect((s * 120 + off) * px, (rij * 20 + 2 + toeval() * 16) * px, 120 * px, 1);
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
    const toeval = vasteReeks('plankenLiggend' + hex);
    for (let r = 0; r < 4; r++) {
      const naad = (r * 53) % 200;
      for (const [a, b] of [[0, naad], [naad, 200]] as const) {
        g.fillStyle = tint(hex, 0.85 + toeval() * 0.25);
        g.fillRect(a * px, r * 15 * px, (b - a) * px, 15 * px);
      }
      for (let n = 0; n < 5; n++) {
        g.fillStyle = `rgba(0,0,0,${0.03 + toeval() * 0.05})`;
        g.fillRect(0, (r * 15 + 1 + toeval() * 12) * px, LIGGEND.b * px, 1);
      }
      g.fillStyle = 'rgba(0,0,0,.38)';
      g.fillRect(0, (r * 15 + 14.2) * px, LIGGEND.b * px, 0.8 * px);
      g.fillRect(naad * px, r * 15 * px, 1, 15 * px);
    }
  });
  /** Gevelleien (vezelcement of natuurleien) 20 × 12 cm zichtbaar, in halfsteens verband. */
  const leien = (hex: string) => canvasTextuur(LEIEN.b, LEIEN.h, 3, (g, px) => {
    const toeval = vasteReeks('leien' + hex);
    g.fillStyle = tint(hex, 0.55);
    g.fillRect(0, 0, LEIEN.b * px, LEIEN.h * px);
    for (let r = 0; r < 4; r++) {
      const off = r % 2 ? 10 : 0;
      for (let s = -1; s < 4; s++) {
        g.fillStyle = tint(hex, 0.9 + toeval() * 0.18);
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
    const toeval = vasteReeks('natuursteen' + hex);
    g.fillStyle = tint(hex, 1.25);
    g.fillRect(0, 0, NATUURSTEEN.b * px, NATUURSTEEN.h * px);
    for (let r = 0; r < 2; r++) {
      const off = r % 2 ? 40 : 0;
      for (let s = -1; s < 2; s++) {
        g.fillStyle = tint(hex, 0.93 + toeval() * 0.12);
        g.fillRect((s * 80 + off + 0.4) * px, (r * 40 + 0.4) * px, 79.2 * px, 39.2 * px);
        for (let n = 0; n < 40; n++) {
          g.fillStyle = `rgba(255,255,255,${toeval() * 0.08})`;
          g.fillRect((s * 80 + off + toeval() * 79) * px, (r * 40 + toeval() * 39) * px, 1.5, 1.5);
        }
      }
    }
  });
  /** Sierpleister (crepi): fijne korrel. */
  const pleister = (hex: string) => canvasTextuur(PLEISTER.b, PLEISTER.h, 3, (g, px) => {
    const toeval = vasteReeks('pleister' + hex);
    g.fillStyle = hex;
    g.fillRect(0, 0, PLEISTER.b * px, PLEISTER.h * px);
    for (let n = 0; n < 2600; n++) {
      g.fillStyle = toeval() < 0.5 ? `rgba(0,0,0,${toeval() * 0.07})` : `rgba(255,255,255,${toeval() * 0.08})`;
      g.fillRect(toeval() * PLEISTER.b * px, toeval() * PLEISTER.h * px, 1.5, 1.5);
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
      // Weefsels met kaarten (WEEFSELKAART): fijner getekend, met de draden waar de normal map ze legt.
      const w = b.weefsel as Weefsel;
      const metKaarten = Boolean(WEEFSELKAART[w]);
      const t = new THREE.CanvasTexture(metKaarten ? weefselCanvas(w, b.kleur, KAART_PX, HOOGTE_KLEUR) : weefselCanvas(w, b.kleur));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAnisotropie;
      m = stofMateriaal(w, b.kleur, t, metKaarten ? null : reliefVan(w));
      materialen.set(sleutel, m);
    }
    if (!m && b.textuur) {
      // Stoffoto: één keer laden, herhalen in wereldmaat (zie wereldUV), opnieuw tekenen zodra ze binnen is.
      let t = fotoTexturen.get(b.textuur);
      if (!t) {
        ladend++;
        t = new THREE.TextureLoader().load(b.textuur, () => { ladend--; render(); }, undefined, () => { ladend--; });
        // Gespiegeld herhalen: een staalfoto is niet naadloos, zo zie je geen ruitjes op de grenzen.
        t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = maxAnisotropie;
        fotoTexturen.set(b.textuur, t);
      }
      // De foto zelf dient ook als reliëf (lichte delen komen naar voor).
      m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, map: t, bumpMap: t, bumpScale: 0.5 });
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
      // Glas met transmission (proef 04-11): het licht gaat erdoor en de spiegeling blijft volledig. Met opacity werd
      // de hele uitkomst, spiegeling inbegrepen, met de alfa weggeschreven (bij 0,28 bleef ±28 % van de spiegeling over).
      // Matglas: dezelfde breking met een ruw oppervlak, dus een wazige achtergrond. De fotomodus rekent dit natuurgetrouw.
      else if (b.soort === 'glas') m = new THREE.MeshPhysicalMaterial({ color: glasTint(b.kleur), metalness: 0, roughness: 0.03, transmission: 1, ior: 1.5, thickness: 1 });
      else if (b.soort === 'matglas') m = new THREE.MeshPhysicalMaterial({ color: glasTint(b.kleur), metalness: 0, roughness: 0.55, transmission: 1, ior: 1.5, thickness: 1 });
      else if (b.soort === 'tegel') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, map: tegels(b.kleur) });
      else if (b.soort === 'parket') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, map: parket(b.kleur) });
      else if (b.soort === 'kunststof') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.35 });
      else if (b.soort === 'dak') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.85 });
      else if (b.soort === 'gevel') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.97 });
      else if (b.soort === 'donker') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.9 });
      else m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.95, map: weefsel });
      materialen.set(sleutel, m);
    }
    return m;
  };

  /** Reliëfkaart per weefsel: hetzelfde patroon in middengrijs (bumpMap leest de helderheid). */
  const reliefs = new Map<Weefsel, any>();
  function reliefVan(w: Weefsel) {
    let t = reliefs.get(w);
    if (!t) {
      t = new THREE.CanvasTexture(weefselCanvas(w, HOOGTE_KLEUR));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      reliefs.set(w, t);
    }
    return t;
  }
  /**
   * Normal map en ruwheidskaart per weefsel met kaarten (WEEFSELKAART, proef 04-11), gedeeld door alle kleuren van dat
   * weefsel. Gegevens, geen kleur: three.js leest ze lineair (de standaard van een textuur). Null zonder kaarten.
   */
  const kaarten = new Map<Weefsel, { normaal: any; ruwheid: any } | null>();
  function kaartenVan(w: Weefsel) {
    if (!kaarten.has(w)) {
      const k = weefselKaarten(w);
      const textuur = (c: HTMLCanvasElement) => {
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = maxAnisotropie;
        return t;
      };
      kaarten.set(w, k ? { normaal: textuur(k.normaal), ruwheid: textuur(k.ruwheid) } : null);
    }
    return kaarten.get(w) ?? null;
  }
  /** Reliëf per weefsel (hoe diep de structuur lijkt). */
  const RELIEF: Record<Weefsel, number> = { effen: 0.25, linnen: 0.6, velours: 0.15, boucle: 1.6, chenille: 0.7, wol: 0.6, rib: 1.0, jacquard: 0.5, leder: 0.35 };
  /** Stofmateriaal: velours met glans langs de randen (sheen), leder met een zachte toplaag, de rest mat. */
  function stofMateriaal(w: Weefsel, hex: string, map: any, relief: any) {
    // Met kaarten: reliëf als normal map (ook in de fotomodus) en glans per draad; anders de bumpMap zoals voorheen.
    const k = kaartenVan(w);
    const basis = k
      ? { color: 0xffffff, map, normalMap: k.normaal, roughnessMap: k.ruwheid }
      : { color: 0xffffff, map, bumpMap: relief, bumpScale: RELIEF[w] };
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
    // Een gebogen wand of een vrije omtrek (bv. de rug of onderbouw van een doorlopende zetel) is geen doos: zijn kader
    // ligt rond de hele zetel en gaf overal schaduw (donkere strepen). Die doen hier niet mee.
    return sceneBlokken
      .filter((o) => o !== b && o.vorm !== 'kuipwand' && !o.omtrek && (o.soort === 'stof' || o.soort === 'kussen' || o.soort === 'hout') && o.y < b.y + b.h + m && o.y + o.h > b.y - m &&
        o.x < b.x + b.b + m && o.x + o.b > b.x - m && o.z < b.z + b.d + m && o.z + o.d > b.z - m)
      .map((o) => ({ x0: o.x, x1: o.x + o.b, y0: o.y, y1: o.y + o.h, z0: o.z, z1: o.z + o.d }));
  }

  /**
   * `vorm.onder` (liggend kussen): afronding van de onderrand en van de hoeken in het grondvlak; het kussen ligt dan plat
   * op de onderbouw en alleen de bovenrand rolt om (straal r). `vorm.mesrand`: los kussen van twee lappen die rondom aan
   * elkaar genaaid zijn: dun aan de naad, dik in het midden, puntige hoeken en licht holle zijden.
   * Zo bouwen 3D-tekenaars een kussen op (naden eerst, dan vullen); wij rekenen dezelfde vorm uit de maten.
   * Geeft ook `vervorm`: de plaats en de normaal op het kussen van een punt op de oorspronkelijke balk (voor de naden).
   */
  function kussenGeometrie(B: number, H: number, D: number, r: number, vulling = 1, buren: Doos[] = [], oorsprong = [0, 0, 0], bolMaat?: number, vorm: { onder?: number; mesrand?: boolean; los?: number } = {}) {
    const vol = [B, H, D];
    const plat = vol.indexOf(Math.min(B, H, D)); // as van de dunste maat: daar bolt het kussen
    // Mesrand: aan de naad is het kussen maar een paar cm dik; de rest van de dikte is de bolling in het midden.
    const mes = vorm.mesrand === true && vulling === 1;
    // Een sierkussen (±14 cm dik) heeft een dunne rand; een groot donzen rugkussen (±26 cm) een dikke, ronde rand.
    // Los gevuld (0–1): dunnere naad en dus een bollere buik, diepere holle zijden (oortjes op de hoeken), een bovenrand
    // die doorzakt en een onrustiger oppervlak.
    const los = mes ? Math.max(0, Math.min(1, vorm.los ?? 0)) : 0;
    const randDik = mes ? Math.max(2.4, Math.min(13, vol[plat]! * 0.3 + Math.max(0, vol[plat]! - 16) * 0.6)) * (1 - 0.45 * los) : vol[plat]!;
    const maat = vol.map((m, a) => (a === plat ? Math.min(m, randDik) : m));
    // Bolling: opgegeven door de opbouw (gevulde rug- en sierkussens), anders bescheiden; nooit meer dan het kussen toelaat.
    const bol = mes ? (vol[plat]! - maat[plat]!) / 2 : Math.min(bolMaat ?? Math.min(2.2, maat[plat]! * 0.13), maat[plat]! * 0.4) * vulling;
    // Vorm van de bolling: bij een mesrand voller naar de randen toe (macht < 1), zoals een gevuld kussen.
    const macht = mes ? 0.75 : 1;
    const a1 = (plat + 1) % 3, a2 = (plat + 2) % 3;
    // Holle zijden van een los kussen: de naad trekt tussen de hoeken naar binnen, de hoeken blijven als puntjes staan.
    const knijp = mes ? Math.min(2.4 + 3 * los, Math.min(maat[a1]!, maat[a2]!) * (0.04 + 0.05 * los)) : 0;
    const zak = vulling === 1 && plat === 1 && B > 30 && D > 30 ? Math.min(0.9, bol * 0.45) : 0;
    // Sterkte van de onregelmatige vulling (helling van de normaal): alleen bij echte kussens, volgens de bolling.
    const kreuk = vulling === 1 ? Math.min(0.085, 0.012 + 0.011 * Math.min(bol, 6)) * (1 + 0.7 * los) : 0;
    const seg = (l: number) => Math.max(4, Math.min(28, Math.round(l / 3)));
    const geo = new THREE.BoxGeometry(maat[0]!, maat[1]!, maat[2]!, seg(maat[0]!), seg(maat[1]!), seg(maat[2]!));
    const half = maat.map((m) => m / 2);
    const rr = Math.max(0.4, Math.min(r, half[0]! - 0.1, half[1]! - 0.1, half[2]! - 0.1));
    // Platte onderkant (alleen een liggend kussen): kleinere straal onderaan en in de hoeken van het grondvlak.
    const rOnder = plat === 1 && vorm.onder !== undefined ? Math.max(0.4, Math.min(vorm.onder, rr)) : rr;
    // De bovenste helft is afgerond met rr; in het grondvlak worden haar hoeken daarna scherper getrokken tot ze passen
    // op de onderste helft (straal rOnder). Dat gebeurt met een superellips: |a|^p + |b|^p = rr^p, p > 2 = hoekiger.
    const pHoek = rOnder < rr - 0.05 ? 1 / (0.5 - Math.log2(Math.SQRT2 - (Math.SQRT2 - 1) * (rOnder / rr))) : 2;
    const golf = (a: number, b: number) => Math.sin(a * 0.21 + b * 0.13 + 1.7) * 0.5 + Math.sin(a * 0.11 - b * 0.19 + 0.4) * 0.35 + Math.sin(a * 0.37 + b * 0.31) * 0.15;
    const p = [0, 0, 0], n = [0, 0, 0];
    /** Zet een punt van de balk (rond het midden) op het kussen; het resultaat staat in p en n (n niet genormeerd). */
    const vervorm = (x: number, y: number, z: number) => {
      p[0] = x; p[1] = y; p[2] = z;
      const boven = plat !== 1 || y >= 0;
      const straal = boven ? rr : rOnder;
      // Afronden: punt naar het binnenblok trekken en op afstand `straal` zetten.
      const c = p.map((v, a) => Math.max(-(half[a]! - straal), Math.min(half[a]! - straal, v)));
      const d = p.map((v, a) => v - c[a]!);
      const l = Math.hypot(d[0]!, d[1]!, d[2]!) || 1;
      for (let a = 0; a < 3; a++) { n[a] = d[a]! / l; p[a] = c[a]! + n[a]! * straal; }
      // Hoeken in het grondvlak scherper (bovenste helft van een liggend kussen met een platte onderkant).
      if (boven && pHoek > 2) {
        const sx = Math.sign(p[0]!) || 1, sz = Math.sign(p[2]!) || 1;
        const a = Math.abs(p[0]!) - (half[0]! - rr), b = Math.abs(p[2]!) - (half[2]! - rr);
        if (a > 1e-6 && b > 1e-6) {
          const l2 = Math.hypot(a, b), lp = Math.pow(Math.pow(a, pHoek) + Math.pow(b, pHoek), 1 / pHoek);
          const s = l2 / lp;
          // Afgeleiden van s naar a en b, voor de normaal (omgekeerd getransponeerde van de vervorming).
          const sa = a / (l2 * lp) - (l2 * Math.pow(a, pHoek - 1)) / Math.pow(lp, pHoek + 1);
          const sb = b / (l2 * lp) - (l2 * Math.pow(b, pHoek - 1)) / Math.pow(lp, pHoek + 1);
          const j11 = s + a * sa, j12 = a * sb, j21 = b * sa, j22 = s + b * sb;
          const na = n[0]! * sx, nb = n[2]! * sz;
          n[0] = (j22 * na - j21 * nb) * sx;
          n[2] = (-j12 * na + j11 * nb) * sz;
          p[0] = sx * (half[0]! - rr + a * s);
          p[2] = sz * (half[2]! - rr + b * s);
        }
      }
      // Bol: verschuiving langs elke as, het sterkst midden op het vlak.
      const u = p.map((v, a) => Math.max(-1, Math.min(1, v / half[a]!)));
      for (let a = 0; a < 3; a++) {
        const o1 = (a + 1) % 3, o2 = (a + 2) % 3;
        const w1 = Math.max(0, 1 - u[o1]! * u[o1]!), w2 = Math.max(0, 1 - u[o2]! * u[o2]!);
        if (a === plat) {
          const basis = Math.max(1e-4, w1 * w2);
          p[a] = p[a]! + bol * Math.pow(basis, macht) * u[a]!;
          // Normaal mee laten hellen met de bolling (helling van het bolle vlak); bij een mesrand begrensd aan de naad.
          const sterk = Math.abs(n[a]!), helling = macht * Math.pow(Math.max(basis, 0.03), macht - 1);
          n[o1] = n[o1]! + bol * 2 * (u[o1]! / half[o1]!) * w2 * helling * sterk;
          n[o2] = n[o2]! + bol * 2 * (u[o2]! / half[o2]!) * w1 * helling * sterk;
        } else if (mes) {
          // Holle zijde: de rand komt tussen de hoeken naar binnen (o1 of o2 is de dunne as; de andere loopt langs de rand).
          const langs = o1 === plat ? o2 : o1;
          // Los gevuld: de bovenrand van een staand kussen zakt in het midden extra door (de vulling zakt naar onder).
          // De onderrand rust op de zitting: die blijft (bijna) recht.
          const boven = los > 0 && a === 1 ? (u[a]! > 0 ? 1 + 0.9 * los : 1 - 0.8 * los) : 1;
          p[a] = p[a]! - knijp * boven * Math.max(0, 1 - u[langs]! * u[langs]!) * u[a]!;
        } else {
          p[a] = p[a]! + bol * 0.3 * w1 * w2 * u[a]!;
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
      // Onregelmatige vulling (11/11, naar het echte 3D-model): een gevuld kussen is nooit perfect glad. Een traag golvend
      // veld kantelt de normaal op de twee grote vlakken een paar graden, zodat het licht er zacht over speelt. Alleen de
      // schaduwwerking, de vorm zelf verandert niet. Hoe boller (zachter) het kussen, hoe sterker; een strak kussen blijft glad.
      if (kreuk > 0) {
        const w1 = p[a1]! + oorsprong[a1]!, w2 = p[a2]! + oorsprong[a2]!, sterk = Math.abs(n[plat]!) * kreuk;
        // Naar de rand toe uitdoven: daar bepaalt de afronding de vorm.
        const rand = (1 - u[a1]! * u[a1]!) * (1 - u[a2]! * u[a2]!);
        n[a1] = n[a1]! + golf(w1, w2) * sterk * rand;
        n[a2] = n[a2]! + golf(w2 + 40, w1 - 17) * sterk * rand;
      }
    };
    const pos = geo.attributes.position, nrm = geo.attributes.normal;
    const kleuren = new Float32Array(pos.count * 3);
    const hoogte = vol[1]!, halfH = hoogte / 2;
    for (let i = 0; i < pos.count; i++) {
      vervorm(pos.getX(i), pos.getY(i), pos.getZ(i));
      const nl = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
      pos.setXYZ(i, p[0]!, p[1]! + halfH, p[2]!);
      nrm.setXYZ(i, n[0]! / nl, n[1]! / nl, n[2]! / nl);
      // Schaduw onderaan: van 0,72 (onderkant) naar 1 (bovenste helft).
      let ao = 0.72 + 0.28 * Math.min(1, Math.max(0, (p[1]! + halfH) / (hoogte * 0.6)));
      // Waar het kussen tegen een ander deel ligt (rug, arm, onderbouw): donkerder, zoals in het echt.
      if (buren.length) {
        const wx = p[0]! + oorsprong[0]!, wy = p[1]! + halfH + oorsprong[1]!, wz = p[2]! + oorsprong[2]!;
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
    /** Punt op het kussen (onderkant op y = 0) met de genormeerde normaal, voor een punt van de balk rond het midden. */
    const opKussen = (x: number, y: number, z: number, uit = 0) => {
      vervorm(x, y, z);
      const nl = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
      return new THREE.Vector3(p[0]! + (n[0]! / nl) * uit, p[1]! + halfH + (n[1]! / nl) * uit, p[2]! + (n[2]! / nl) * uit);
    };
    return { geo, plat, rr, rOnder, half, bol, mes, opKussen };
  }

  /**
   * Gevuld kussen (of gestoffeerde basis) met een vrije omtrek in het grondvlak, bv. een ronde poef of een zitting
   * met een ronde kant: hoeken in het grondvlak afgerond, randen boven en onder afgerond (straal rr), bovenkant licht bol.
   * `omtrek` in wereldcoördinaten; de vorm komt rond (ox, oz) met de onderkant op y = 0.
   * Geeft ook de ringen op de rand (voor de naad): boven en onder, op 45°.
   */
  function omtrekGeometrie(omtrek: [number, number][], H: number, rr0: number, bol: number, ox: number, oz: number, buren: Doos[] = [], oy = 0, tegel = 0, onder?: number) {
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
    // Om de ±3 cm (tot 11/11 om de 4 cm: een ronde poef had zichtbare vlakjes langs de rand).
    const N = Math.max(48, Math.round(L / 3));
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
    //    Textuur: op de rand langs de omtrek (cm) en in de hoogte; op het bovenvlak en de onderkant plat (x, z).
    //    Op 45° van de bovenrand ligt de ring dubbel (zelfde plaats, andere textuurmaat): daar zit ook de naad.
    type Ring = { inset: number; y: number; s: number; plat: boolean };
    const ringen: Ring[] = [];
    // Onderrand: met `onder` een kleinere straal (een zitkussen ligt plat op de onderbouw).
    const rO = onder === undefined ? rr : Math.max(0.4, Math.min(onder, rr));
    // Stappen per kwartronde: meer bij een grote afronding (een bolle poef had anders knikken in het silhouet).
    const S = rr > 9 ? 8 : 4, stap = 90 / S;
    ringen.push({ inset: rO, y: 0, s: 0.0001, plat: true });
    for (let k = 0; k <= S; k++) { const t = (-90 + k * stap) * Math.PI / 180; ringen.push({ inset: rO * (1 - Math.cos(t)), y: rO + rO * Math.sin(t), s: 1, plat: k === 0 }); }
    for (let k = 0; k <= S; k++) {
      const t = (k * stap) * Math.PI / 180, ring = { inset: rr * (1 - Math.cos(t)), y: H - rr + rr * Math.sin(t), s: 1, plat: k > S / 2 };
      ringen.push(ring);
      if (k === S / 2) ringen.push({ ...ring, plat: true }); // dubbel op 45°
    }
    const KAP = 9;
    for (let k = 1; k <= KAP; k++) ringen.push({ inset: rr, y: H, s: 1 - k / (KAP + 0.5), plat: true });
    const naadOnder = 1 + S / 2, naadBoven = S + 2 + S / 2; // ringen op 45° (onder- en bovenrand)
    // Omtrek met een dubbel eerste punt achteraan (kolom M = kolom 0) voor een doorlopende textuur rondom.
    const C = M + 1;
    const omtrekLengte = [0];
    for (let i = 1; i <= M; i++) omtrekLengte.push(omtrekLengte[i - 1]! + Math.hypot(vorm[i % M]![0] - vorm[i - 1]![0], vorm[i % M]![1] - vorm[i - 1]![1]));
    const pos: number[] = [], uvs: number[] = [];
    const t = tegel || 1;
    for (const ring of ringen) {
      for (let c = 0; c < C; c++) {
        const i = c % M;
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
        if (ring.plat) uvs.push((x + ox) / t, (z + oz) / t);
        else uvs.push(omtrekLengte[c]! / t, (y + oy) / t);
      }
    }
    const midOnder = pos.length / 3; pos.push(mx, 0, mz); uvs.push((mx + ox) / t, (mz + oz) / t);
    const fm = Math.max(0, 1 - ((mx - bx) / hb) ** 2) * Math.max(0, 1 - ((mz - bz) / hd) ** 2);
    const midBoven = pos.length / 3; pos.push(mx, H + bol * fm, mz); uvs.push((mx + ox) / t, (mz + oz) / t);
    const idx: number[] = [];
    const R = ringen.length;
    for (let r = 0; r < R - 1; r++) {
      if (r === naadBoven) continue; // tussen de twee kopieën op 45° geen vlak
      for (let c = 0; c < M; c++) {
        const a = r * C + c, b2 = r * C + c + 1, cc = (r + 1) * C + c, d = (r + 1) * C + c + 1;
        // Ring 0 → 1 gaat van de onderkant (binnen) naar buiten; draairichting zo dat de normalen naar buiten wijzen.
        idx.push(a, cc, b2, b2, cc, d);
      }
    }
    for (let c = 0; c < M; c++) {
      idx.push(midOnder, c, c + 1);
      const t0 = (R - 1) * C;
      idx.push(t0 + c, midBoven, t0 + c + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // Dubbele punten samen dezelfde normaal: de naad rondom (kolom 0 en M) en de dubbele ring op 45°.
    const paren: number[][] = [];
    for (let r = 0; r < R; r++) paren.push([r * C, r * C + M]);
    for (let c = 0; c < C; c++) paren.push(c === 0 || c === M ? [naadBoven * C, naadBoven * C + M, (naadBoven + 1) * C, (naadBoven + 1) * C + M] : [naadBoven * C + c, (naadBoven + 1) * C + c]);
    gelijkeNormalen(geo, paren);
    // Schaduw onderaan en waar het tegen andere delen ligt (zoals bij de gewone kussens).
    const kleuren = new Float32Array(pos.length);
    for (let i = 0; i < pos.length / 3; i++) {
      const y = pos[i * 3 + 1]!;
      let ao = 0.72 + 0.28 * Math.min(1, Math.max(0, y / (H * 0.6)));
      // Alleen de rand (niet het bovenvlak): anders tekenen de lange driehoeken van het bovenvlak strepen.
      const ringNr = Math.floor(i / C);
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
      for (let c = 0; c < M; c++) uit.push(new THREE.Vector3(pos[(r * C + c) * 3]!, pos[(r * C + c) * 3 + 1]!, pos[(r * C + c) * 3 + 2]!));
      return uit;
    };
    return { geo, naadRingen: [ringPunten(naadBoven), ringPunten(naadOnder)] };
  }
  /** Dubbele punten (naad van de textuur) dezelfde normaal geven, anders ziet men een lijn. */
  function gelijkeNormalen(geo: any, paren: number[][]) {
    const n = geo.attributes.normal;
    for (const groep of paren) {
      let x = 0, y = 0, z = 0;
      for (const i of groep) { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }
      const l = Math.hypot(x, y, z) || 1;
      for (const i of groep) n.setXYZ(i, x / l, y / l, z / l);
    }
    n.needsUpdate = true;
  }
  /**
   * Kuipwand: een gepolsterde schaal langs een gebogen middenlijn (`pad`, wereld x/z), met per punt een eigen
   * bovenhoogte. Vorm rond (ox, oy, oz).
   *
   * Herbouwd op 11/11 (melding: "ronde vormen vormen zeker problemen"). Vroeger was dit een rechtopstaande strook met de
   * punten van de motor als hoeken: zichtbare knikken, geen helling, en open uiteinden waar je de achtergrond als een wit
   * streepje door zag. Nu:
   *  - de middenlijn en de hoogtes worden vloeiend bijgemonsterd (om de ±1,5 cm): geen knikken meer;
   *  - de wand kan **hellen** (`helling`: zoveel cm staat de bovenrand van de rug verder naar buiten dan de voet;
   *    `hellingArm` voor de lage uiteinden): een kuip is bovenaan breder dan onderaan, zoals op elke foto;
   *  - de wand is **gepolsterd** (`bol`: zoveel dikker in het midden van de hoogte dan aan de voet en de rand);
   *  - de bovenrand is een volle ronding en de uiteinden zijn rond en **gesloten**.
   */
  function kuipwandGeometrie(pad0: [number, number][], hoogtes0: number[], dikte: number, onder: number, ox: number, oz: number, buren: Doos[] = [], tegel = 0,
    vorm: { helling?: number; hellingArm?: number; bol?: number; eind?: number; ovaal?: number } = {}) {
    const w = dikte / 2;
    // Vloeiend bijmonsteren (Catmull-Rom door de punten van de motor), op gelijke afstanden langs de wand.
    const n0 = pad0.length;
    const cr = (a: number, b: number, c: number, d: number, t: number) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
    const bij = (i: number) => Math.max(0, Math.min(n0 - 1, i));
    const fijn: { x: number; z: number; h: number }[] = [];
    for (let i = 0; i < n0 - 1; i++) {
      const [a, b, c, d] = [pad0[bij(i - 1)]!, pad0[i]!, pad0[i + 1]!, pad0[bij(i + 2)]!];
      const [ha, hb, hc, hd] = [hoogtes0[bij(i - 1)]!, hoogtes0[i]!, hoogtes0[i + 1]!, hoogtes0[bij(i + 2)]!];
      const stuk = Math.max(1, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 0.75));
      for (let k = 0; k < stuk; k++) {
        const t = k / stuk;
        // De hoogte mag niet doorschieten voorbij haar buren (geen bult voor een vlak stuk).
        fijn.push({ x: cr(a[0], b[0], c[0], d[0], t), z: cr(a[1], b[1], c[1], d[1], t), h: Math.min(Math.max(hb, hc), Math.max(Math.min(hb, hc), cr(ha, hb, hc, hd, t))) });
      }
    }
    fijn.push({ x: pad0[n0 - 1]![0], z: pad0[n0 - 1]![1], h: hoogtes0[n0 - 1]! });
    const lengte = [0];
    for (let i = 1; i < fijn.length; i++) lengte.push(lengte[i - 1]! + Math.hypot(fijn[i]!.x - fijn[i - 1]!.x, fijn[i]!.z - fijn[i - 1]!.z));
    const totaal = lengte[lengte.length - 1]! || 1, n = Math.max(n0, Math.min(420, Math.ceil(totaal / 1.5) + 1));
    const pad: [number, number][] = [], hoogtes: number[] = [];
    for (let i = 0, j = 0; i < n; i++) {
      const doel = (totaal * i) / (n - 1);
      while (j < fijn.length - 2 && lengte[j + 1]! < doel) j++;
      const f = Math.max(0, Math.min(1, (doel - lengte[j]!) / (lengte[j + 1]! - lengte[j]! || 1))), p = fijn[j]!, q = fijn[j + 1]!;
      pad.push([p.x + f * (q.x - p.x), p.z + f * (q.z - p.z)]);
      hoogtes.push(p.h + f * (q.h - p.h));
    }
    // Richting en zijwaartse normaal per punt; de normaal wijst naar buiten (weg van het midden van de boog).
    const mx = pad.reduce((t, q) => t + q[0], 0) / n, mz = pad.reduce((t, q) => t + q[1], 0) / n;
    const midden = pad[Math.floor(n / 2)]!;
    const zij = pad.map((q, i) => {
      const a = pad[Math.max(0, i - 1)]!, c = pad[Math.min(n - 1, i + 1)]!;
      const tx = c[0] - a[0], tz = c[1] - a[1], l = Math.hypot(tx, tz) || 1;
      return { tx: tx / l, tz: tz / l, nx: tz / l, nz: -tx / l };
    });
    const mz0 = zij[Math.floor(n / 2)]!;
    if (mz0.nx * (midden[0] - mx) + mz0.nz * (midden[1] - mz) < 0) for (const r of zij) { r.nx = -r.nx; r.nz = -r.nz; }
    const hMin = Math.min(...hoogtes), hMax = Math.max(...hoogtes);
    // Ovaal kussen (rug op een frame): ook de onderkant is rond, en ze komt naar de uiteinden toe omhoog.
    const ovaal = vorm.ovaal ?? 0;
    const helling = vorm.helling ?? 0, hellingArm = vorm.hellingArm ?? helling * 0.35, bol = vorm.bol ?? 0, eindDik = vorm.eind ?? 1;
    /** Hoe hoog een punt staat tussen het laagste (0) en het hoogste (1) deel van de wand, vloeiend. */
    const deel = (hoog: number) => { const f = hMax - hMin > 0.5 ? (hoog - hMin) / (hMax - hMin) : 1; return f * f * (3 - 2 * f); };
    /** Helling van de bovenrand op een punt: de hoge rug helt het meest, de lage uiteinden het minst. */
    const hellingOp = (hoog: number) => (ovaal ? helling : hellingArm + (helling - hellingArm) * deel(hoog));
    /** Halve dikte op een punt: de lage uiteinden kunnen slanker zijn dan de rug. */
    const halfOp = (hoog: number) => w * (eindDik + (1 - eindDik) * deel(hoog));
    // Profiel (dwarsdoorsnede, u = dwars op de wand met + naar buiten, y = hoogte): binnenkant op, volle ronding over de
    // top, buitenkant neer. `breed` = halve dikte aan de voet; `top` = hoeveel de bovenrand naar buiten staat.
    const ZIJ = ovaal ? 12 : 7, BOOG = 14;
    const profiel = (hoog: number, breed: number, top: number, voet = 0): [number, number][] => {
      const r = Math.min(breed, Math.max(0.5, hoog - 0.5)), recht = Math.max(0, hoog - r);
      const rOnder = ovaal ? Math.min(breed, recht * 0.6) : 0;
      // Ovaal kussen: het hele kussen helt als één plaat (de helling volgt de hoogte boven de onderkant van het kussen,
      // niet die van elke ring apart; anders waaieren de lage uiteinden uit als vleugels).
      const uit = (y: number) => top * Math.pow(Math.max(0, Math.min(1, ovaal ? (y + voet) / Math.max(1, hMax - onder) : y / Math.max(1, hoog))), 1.4);
      const dik = (y: number) => breed * (1 + bol * Math.sin(Math.PI * Math.max(0, Math.min(1, y / Math.max(1, recht)))))
        * (rOnder > 0.01 && y < rOnder ? Math.sqrt(Math.max(0, 1 - ((rOnder - y) / rOnder) ** 2)) : 1);
      // Met een ronde onderkant liggen de punten onderaan dichter bij elkaar (daar buigt het profiel het sterkst).
      const yOp = (k: number) => recht * (ovaal ? (k / ZIJ) ** 1.7 : k / ZIJ);
      const pts: [number, number][] = [];
      for (let k = 0; k <= ZIJ; k++) { const y = yOp(k); pts.push([uit(y) - dik(y), y]); }
      for (let k = 1; k < BOOG; k++) { const a = Math.PI - (k / BOOG) * Math.PI; pts.push([uit(recht) + Math.cos(a) * breed, recht + Math.sin(a) * r]); }
      for (let k = ZIJ; k >= 0; k--) { const y = yOp(k); pts.push([uit(y) + dik(y), y]); }
      return pts;
    };
    // Ringen langs de middenlijn. De uiteinden zijn in het grondvlak half rond en lopen dicht: de breedte gaat tot nul.
    type Ring = { x: number; z: number; nx: number; nz: number; hoog: number; breed: number; top: number; voet: number };
    // Ovaal kussen: van opzij gezien een afgeronde rechthoek. De hoeken onderaan hebben een grote straal (`ovaal` × de
    // hoogte van het kussen), die bovenaan de rest: zo is de onderkant een buik en de bovenkant bijna recht (Karl).
    const hoogKussen = hMax - onder, straalOnder = ovaal * hoogKussen, straalBoven = Math.max(0, (0.94 - ovaal) * hoogKussen);
    const hoek = (straal: number, vanEinde: number) => (vanEinde >= straal ? 0 : straal - Math.sqrt(Math.max(0, straal * straal - (straal - vanEinde) ** 2)));
    /** Ring van een ovaal kussen op `vanEinde` cm van de punt van het kussen (langs de wand gemeten). */
    const ovaleMaat = (hoogte: number, vanEinde: number) => {
      const voet = hoek(straalOnder, vanEinde);
      return { voet, hoog: Math.max(0.6, hoogte - onder - voet - hoek(straalBoven, vanEinde)) };
    };
    const ringen: Ring[] = [];
    const EIND = 9;
    const eind = (i: number, richting: number) => {
      const q = pad[i]!, r = zij[i]!, hoog = Math.max(0.6, hoogtes[i]! - onder), top = hellingOp(hoogtes[i]!), half = halfOp(hoogtes[i]!);
      const reeks: Ring[] = [];
      // De neus is ook van opzij rond: de bovenkant zakt naar de punt toe (anders eindigt de wand in een opstaande punt,
      // die van voren als een hoorntje boven de arm uitsteekt).
      const zak = Math.min(hoog * 0.3, half * 1.6);
      for (let k = EIND; k >= 1; k--) {
        const a = ((k / EIND) * Math.PI) / 2;
        const maat = ovaal ? ovaleMaat(hoogtes[i]!, half * (1 - Math.sin(a))) : { voet: 0, hoog: hoog - zak * (1 - Math.cos(a)) };
        reeks.push({ x: q[0] + richting * r.tx * half * Math.sin(a), z: q[1] + richting * r.tz * half * Math.sin(a), nx: r.nx, nz: r.nz, hoog: maat.hoog, breed: k === EIND ? 0 : half * Math.cos(a), top, voet: maat.voet });
      }
      return reeks;
    };
    ringen.push(...eind(0, -1));
    for (let i = 0; i < n; i++) {
      const langsWand = (totaal * i) / (n - 1), half = halfOp(hoogtes[i]!);
      const maat = ovaal ? ovaleMaat(hoogtes[i]!, half + Math.min(langsWand, totaal - langsWand)) : { voet: 0, hoog: Math.max(0.6, hoogtes[i]! - onder) };
      ringen.push({ x: pad[i]![0], z: pad[i]![1], nx: zij[i]!.nx, nz: zij[i]!.nz, hoog: maat.hoog, breed: half, top: hellingOp(hoogtes[i]!), voet: maat.voet });
    }
    ringen.push(...eind(n - 1, 1).reverse());
    // Profiel gesloten met een dubbel eerste punt achteraan (voor een doorlopende textuur rond het profiel).
    const Q = profiel(10, w, 0).length + 1;
    const pos: number[] = [], uvs: number[] = [];
    let langs = 0;
    ringen.forEach((r, i) => {
      if (i > 0) langs += Math.hypot(r.x - ringen[i - 1]!.x, r.z - ringen[i - 1]!.z);
      const pr = profiel(r.hoog, r.breed, r.top, r.voet);
      pr.push(pr[0]!);
      // Textuur rond het profiel op ware grootte, gemeten op het profiel zelf en uitgelijnd op de kruin: zo loopt de
      // tekening over de bovenrand door tot in de ronde uiteinden, zonder daar samen te drukken tot een ruwe vlek.
      const omtrek = [0];
      for (let j = 1; j < pr.length; j++) omtrek.push(omtrek[j - 1]! + Math.hypot(pr[j]![0] - pr[j - 1]![0], pr[j]![1] - pr[j - 1]![1]));
      const kruin = omtrek[Math.floor((pr.length - 1) / 2)]!;
      pr.forEach(([u, y], j) => {
        const rond = omtrek[j]! - kruin;
        pos.push(r.x + r.nx * u - ox, y + r.voet, r.z + r.nz * u - oz);
        // Textuur langs de wand (cm) en rond het profiel (cm), op ware grootte: geen sprongen in de bocht.
        uvs.push(tegel ? langs / tegel : 0, tegel ? rond / tegel : 0);
      });
    });
    const idx: number[] = [];
    for (let i = 0; i < ringen.length - 1; i++)
      for (let j = 0; j < Q - 1; j++) {
        const a = i * Q + j, b = i * Q + j + 1, c = (i + 1) * Q + j, d = (i + 1) * Q + j + 1;
        idx.push(a, b, c, b, d, c);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    gelijkeNormalen(geo, ringen.map((_, i) => [i * Q, i * Q + Q - 1]));
    // Draairichting nakijken: de normaal bovenop moet omhoog wijzen; anders alle driehoeken omkeren.
    const bovenop = Math.floor(ringen.length / 2) * Q + Math.floor(Q / 2);
    if (geo.attributes.normal.getY(bovenop) < 0) {
      for (let t = 0; t < idx.length; t += 3) { const k = idx[t + 1]!; idx[t + 1] = idx[t + 2]!; idx[t + 2] = k; }
      geo.setIndex(idx);
      geo.computeVertexNormals();
      gelijkeNormalen(geo, ringen.map((_, i) => [i * Q, i * Q + Q - 1]));
    }
    // Schaduw onderaan en tegen de zitting (zoals bij de kussens).
    const kleuren = new Float32Array(pos.length);
    for (let i = 0; i < pos.length / 3; i++) {
      const y = pos[i * 3 + 1]!;
      let ao = 0.74 + 0.26 * Math.min(1, y / 30);
      if (buren.length) {
        const wx = pos[i * 3]! + ox, wy = y + onder, wz = pos[i * 3 + 2]! + oz;
        let dicht = 0;
        for (const q of buren) {
          const dx = Math.max(q.x0 - wx, 0, wx - q.x1), dy = Math.max(q.y0 - wy, 0, wy - q.y1), dz = Math.max(q.z0 - wz, 0, wz - q.z1);
          const d = Math.hypot(dx, dy, dz);
          if (d < 3.5) dicht += (1 - d / 3.5) * 0.25;
        }
        ao *= 1 - Math.min(0.35, dicht);
      }
      kleuren[i * 3] = kleuren[i * 3 + 1] = kleuren[i * 3 + 2] = ao;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));
    return geo;
  }

  /** Naad als buis langs gegeven ringen (bies, gewone naad of sierstiksel). */
  function naadLangs(b: Blok, ringen: any[][]) {
    if (!b.naad) return [];
    const straal = b.naad.soort === 'bies' ? 0.55 : b.naad.soort === 'stiksel' ? 0.09 : 0.14;
    const mat = b.naad.soort === 'bies'
      ? new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur === b.kleur ? tint(b.kleur, 0.94) : b.naad.kleur), roughness: 0.85 })
      : new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur), roughness: 1 });
    return ringen.map((punten) => {
      const curve = new THREE.CatmullRomCurve3(punten, true, 'centripetal');
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(400, punten.length * 3), straal, 6, true), mat);
      m.receiveShadow = true;
      return m;
    });
  }

  /**
   * Naad van een kussen: bies (dikke koord), gewone naad of dubbel sierstiksel. Een kussen met een band heeft een naad
   * rond elk van de twee grote vlakken; een kussen met een mesrand heeft er één, rondom op de rand.
   * De lijn loopt over de balk waaruit het kussen gemaakt is en volgt dan dezelfde vervorming als het kussen zelf.
   */
  function naden(b: Blok, k: ReturnType<typeof kussenGeometrie>) {
    if (!b.naad) return [];
    const { plat, rr, rOnder, half } = k, k_ = k;
    const a1 = (plat + 1) % 3, a2 = (plat + 2) % 3;
    // Plaats van de lijn op de afronding: 45° = op de ribbe van de balk; kleiner = op de zijkant, groter = op het grote vlak.
    const lijnen: { hoek: number; straal: number }[] =
      b.naad.soort === 'bies' ? [{ hoek: 45, straal: 0.55 }]
        : b.naad.soort === 'stiksel' ? [{ hoek: 22, straal: 0.09 }, { hoek: 68, straal: 0.09 }]
          : [{ hoek: 45, straal: 0.11 }];
    const mat = b.naad.soort === 'bies'
      ? new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur === b.kleur ? tint(b.kleur, 0.94) : b.naad.kleur), roughness: 0.85 })
      : new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur), roughness: 1 });
    // Een bies in dezelfde stof: iets donkerder dan de stof (ze vangt als ribbel veel licht en werd anders een witte lijn).
    if (b.naad.soort === 'bies' && b.naad.kleur === b.kleur) mat.color = kleur(tint(b.kleur, 0.84));
    const uit: any[] = [];
    /**
     * Gesloten lijn rond het kussen op een vaste breedtegraad van de afronding (0° = midden op de rand, 45° = op de ribbe,
     * 90° = op het grote vlak), aan de kant `kant` van de dunne as. De punten liggen op de balk: recht langs de zijden en
     * in elke hoek een boog rond de hoek van het binnenblok, zodat de lijn ook in de hoeken van het kussen vloeiend loopt
     * (door de hoek van de balk zelf gaf ze daar een knik). Daarna volgt elk punt de vervorming van het kussen.
     */
    const ring = (graden: number, kant: number, straalRand: number, straal: number) => {
      const phi = (graden * Math.PI) / 180, cp = Math.cos(phi), sp = Math.sin(phi);
      const i1 = half[a1]! - straalRand, i2 = half[a2]! - straalRand, iDun = graden === 0 ? 0 : kant * (half[plat]! - straalRand);
      const balk: number[][] = [];
      for (const [s1, s2, start] of [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]] as const) {
        for (let j = 0; j <= 6; j++) {
          const t = ((start + j * 15) * Math.PI) / 180;
          const d = [0, 0, 0];
          d[a1] = Math.cos(t) * cp; d[a2] = Math.sin(t) * cp; d[plat] = sp * kant;
          // Tot op de balk verlengen: de vervorming zet het punt daarna terug op de afronding.
          const m = Math.max(Math.abs(d[0]!), Math.abs(d[1]!), Math.abs(d[2]!)) || 1;
          const q = [0, 0, 0];
          q[a1] = s1 * i1 + (d[a1]! * straalRand) / m; q[a2] = s2 * i2 + (d[a2]! * straalRand) / m; q[plat] = iDun + (d[plat]! * straalRand) / m;
          balk.push(q);
        }
      }
      const punten: any[] = [];
      balk.forEach((q, i) => {
        const volgende = balk[(i + 1) % balk.length]!;
        const lengte = Math.hypot(volgende[0]! - q[0]!, volgende[1]! - q[1]!, volgende[2]! - q[2]!), delen = Math.max(1, Math.round(lengte / 2.5));
        for (let k = 0; k < delen; k++) {
          const f = k / delen;
          punten.push(k_.opKussen(q[0]! + (volgende[0]! - q[0]!) * f, q[1]! + (volgende[1]! - q[1]!) * f, q[2]! + (volgende[2]! - q[2]!) * f, straal * 0.35));
        }
      });
      const curve = new THREE.CatmullRomCurve3(punten, true, 'centripetal');
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(480, punten.length * 2), straal, 6, true), mat);
      m.castShadow = false;
      m.receiveShadow = true;
      uit.push(m);
    };
    if (k.mes) {
      // Mesrand: één naad rondom, midden op de rand. Een gewone naad zie je daar niet (ze zit in de plooi van de rand):
      // alleen een bies of sierstiksel tekenen.
      if (b.naad.soort === 'naad') return uit;
      for (const { hoek, straal } of lijnen) {
        if (hoek === 45) ring(0, 1, rr, straal);
        else ring(18, hoek < 45 ? -1 : 1, rr, straal);
      }
      return uit;
    }
    // Een gestoffeerd blok (vaste zitting) heeft alleen bovenaan een zichtbare naad: de onderrand staat op of bij de vloer.
    for (const kant of b.soort === 'stof' && plat === 1 ? [1] : [1, -1]) {
      // Een liggend kussen met een platte onderkant heeft onderaan een kleinere afronding.
      const straalRand = plat === 1 && kant < 0 ? rOnder : rr;
      for (const { hoek, straal } of lijnen) ring(hoek, kant, straalRand, straal);
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
    // Profiel (bv. een arm): altijd als zachte vorm, ook bij blokken (klein, dus meteen), met de kussens ernaast voor de
    // schaduw in de hoek en de naad of bies rond het voorpaneel. Een glad blok (doorlopende zetel) komt hier alleen zolang
    // zijn zachte vorm nog berekend wordt (zie `toon`): tot dan de gewone vorm.
    if (b.vorm === 'profiel') {
      const kader = doosVan(b).expandByScalar(8);
      const buren = sceneBlokken.filter((k) => k.soort === 'kussen' && kader.intersectsBox(doosVan(k)));
      const sleutel = vormSleutel([b], buren);
      // Raster van 1,25 cm (was 2): een smalle, uitlopende arm werd op het grove raster hoekig. Kost rekentijd, geen
      // tekentijd; een toestel met een grafische kaart (ook een bescheiden) tekent de fijnere vorm zonder moeite.
      if (!zachteVormen.has(sleutel)) zachteVormen.set(sleutel, zachteVorm([b], { minAfronding: 0, buren, raster: 1.25 }));
      const m = zachteMesh([b], buren)!;
      m.name = b.code;
      const naad = profielNaad(b);
      if (naad) m.add(naad);
      return m;
    }
    let geo: any;
    let kussen: ReturnType<typeof kussenGeometrie> | null = null;
    let vrijeNaden: any[][] | null = null;
    // Kuipwand van een fauteuil: gebogen, gestoffeerde wand met aflopende hoogte.
    if (b.vorm === 'kuipwand' && b.pad && b.hoogtes) {
      const cxo = b.x + b.b / 2, czo = b.z + b.d / 2;
      const tegelCm = b.textuur ? b.textuurCm ?? 15 : b.weefsel && b.weefsel in WEEFSEL_CM ? WEEFSEL_CM[b.weefsel as Weefsel] : 1;
      const g = kuipwandGeometrie(b.pad, b.hoogtes, b.dikte ?? 14, b.y, cxo, czo, opties.zetel ? burenVan(b) : [], tegelCm, { helling: b.helling, hellingArm: b.hellingArm, bol: b.wandBol, eind: b.wandEind, ovaal: b.wandOvaal });
      const base = materiaal(b);
      const sleutel = `vc:${base.uuid}`;
      let mat = materialen.get(sleutel);
      if (!mat) { mat = base.clone(); mat.vertexColors = true; materialen.set(sleutel, mat); }
      const m = new THREE.Mesh(g, mat);
      m.name = b.code;
      m.position.set(cxo, b.y, czo);
      m.castShadow = m.receiveShadow = true;
      return m;
    }
    // Vrije omtrek (zitting met ronde kant) of een staande gestoffeerde cilinder (ronde poef): gevuld kussen met die vorm.
    const staandeCilinder = b.vorm === 'cilinder' && !b.as && (b.soort === 'kussen' || b.soort === 'stof') && opties.zetel;
    if (b.omtrek || staandeCilinder) {
      const cxo = b.x + b.b / 2, czo = b.z + b.d / 2;
      const omtrek: [number, number][] = b.omtrek ?? Array.from({ length: 96 }, (_, i) => {
        const a = (i / 96) * Math.PI * 2;
        return [cxo + Math.cos(a) * b.b / 2, czo + Math.sin(a) * b.d / 2] as [number, number];
      });
      const rr = b.afronding ?? Math.min(5, b.h / 3);
      const bol = b.soort === 'kussen' ? Math.min(2.2, b.h * 0.13) : Math.min(1, b.h * 0.06);
      // Zonder eigen weefsel: de fijne standaardstructuur (herhaling 0,12) op ± 8 cm, zoals op de gewone blokken.
      // Hout (het frame onder een schelp): de nerf op ±24 cm, anders herhaalt ze om de centimeter.
      const tegelCm = b.textuur ? b.textuurCm ?? 15 : b.weefsel && b.weefsel in WEEFSEL_CM ? WEEFSEL_CM[b.weefsel as Weefsel] : b.soort === 'hout' ? 24 : 1;
      const v = omtrekGeometrie(omtrek, b.h, rr, bol, cxo, czo, opties.zetel ? burenVan(b) : [], b.y, tegelCm, b.afrondingOnder);
      geo = v.geo;
      vrijeNaden = b.soort === 'kussen' ? v.naadRingen : null;
      // Taps toelopende poef (bv. Stockholm): hetzelfde gevulde kussen, naar boven toe smaller (taps = onder/boven).
      // De vorm staat rond haar eigen midden (x en z vanaf het midden, y vanaf de onderkant).
      const taps = staandeCilinder ? b.taps ?? 1 : 1;
      if (taps !== 1) {
        const pos = geo.attributes.position, top = 1 / Math.max(taps, 0.2);
        for (let i = 0; i < pos.count; i++) {
          const f = 1 + (top - 1) * Math.min(1, Math.max(0, pos.getY(i) / b.h));
          pos.setXYZ(i, pos.getX(i) * f, pos.getY(i), pos.getZ(i) * f);
        }
        pos.needsUpdate = true;
        vrijeNaden = null; // de naadringen horen bij de rechte vorm
      }
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
          geo = new THREE.CylinderGeometry(r, r, b.as === 'z' ? b.d : b.b, r > 6 ? 56 : 28);
          geo.rotateX(b.as === 'z' ? Math.PI / 2 : 0);
          if (b.as === 'x') geo.rotateZ(Math.PI / 2);
          y = b.y + r;
        } else {
          const r = Math.min(b.b, b.d) / 2;
          // Een grote ronde vorm (tafelblad, ronde poef in de bouwweergave) met meer zijden: met 20 zag je de hoeken.
          geo = new THREE.CylinderGeometry(r, r * (b.taps ?? 1), b.h, r > 6 ? 56 : 20);
          y = b.y + b.h / 2;
        }
        break;
      }
      case 'bol':
        geo = Math.min(b.b, b.h) > 12 ? new THREE.SphereGeometry(Math.min(b.b, b.h) / 2, 32, 20) : new THREE.SphereGeometry(Math.min(b.b, b.h) / 2, 12, 8);
        y = b.y + b.h / 2;
        break;
      default:
        // Kussens gevuld en bol; bij de zetel ook de gestoffeerde armen en rug, iets minder bol.
        if (b.afronding && (b.soort === 'kussen' || (opties.zetel && b.soort === 'stof'))) {
          kussen = kussenGeometrie(b.b, b.h, b.d, b.afronding, b.soort === 'kussen' ? 1 : 0.5, opties.zetel ? burenVan(b) : [], [cx, b.y, cz], b.bol, { onder: b.afrondingOnder, mesrand: b.mesrand, los: b.losGevuld });
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
    // Hout van de zetel (blad, poten, kastje): de nerf op ware grootte (tegel van 16 × 32 cm, nerf in de lengte of naar
    // boven). Zonder dit herhaalde de nerf op een afgerond blad om de centimeter: een egaal vlak zonder tekening.
    else if (opties.zetel && b.soort === 'hout' && !b.zijden && geo.attributes.uv && geo.attributes.normal) { const nerf = { b: 16, h: 32 }; wereldUV(geo, [nerf, nerf, nerf, nerf, nerf, nerf], cx, b.y, cz); }
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
    // Draaiing rond de verticale as (bv. een kussen in een gebogen zetel): eerst draaien, dan kantelen.
    if (b.draai) { m.rotation.order = 'YXZ'; m.rotation.y = -(b.draai * Math.PI) / 180; }
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
  /**
   * De grondvorm van een blok, van boven gezien, op het canvas van de contactschaduw: de echte vorm en niet het kader
   * (een ronde poef geeft een ronde schaduw, een doorlopende zetel volgt zijn ronde uiteinden). Eén vulling per blok.
   */
  function tekenGrondvorm(g: CanvasRenderingContext2D, b: Blok, X: (x: number) => number, Z: (z: number) => number, schaal: number) {
    g.beginPath();
    // Gebogen wand: een lijn langs het midden, zo dik als de wand.
    if (b.vorm === 'kuipwand' && b.pad?.length) {
      g.lineWidth = (b.dikte ?? 14) * schaal;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      b.pad.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
      g.stroke();
      return;
    }
    // Vrije omtrek (in wereldcoördinaten, zonder draaiing, zoals de vorm in 3D).
    if (b.omtrek?.length) {
      b.omtrek.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
      g.closePath();
      g.fill();
      return;
    }
    // Profiel (arm): de strook langs de lijn, zo breed als het onderste deel van de doorsnede (niet de krul bovenaan).
    if (b.vorm === 'profiel' && b.pad?.length && b.profiel && b.uit) {
      const vast = b.profiel.filter((p) => !p[2]);
      const bodem = Math.min(...vast.map((p) => p[1]), b.y);
      const laag = vast.filter((p) => p[1] <= bodem + 30);
      const ss = (laag.length ? laag : b.profiel).map((p) => p[0]);
      const s0 = Math.min(...ss), s1 = Math.max(...ss), [ux, uz] = b.uit;
      const a = b.pad[0]!, e = b.pad[b.pad.length - 1]!;
      const hoeken: [number, number][] = [[a[0] + ux * s0, a[1] + uz * s0], [e[0] + ux * s0, e[1] + uz * s0], [e[0] + ux * s1, e[1] + uz * s1], [a[0] + ux * s1, a[1] + uz * s1]];
      hoeken.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
      g.closePath();
      g.fill();
      return;
    }
    // Balk, cilinder of kegel: rond het midden, gedraaid zoals in 3D (draai van x naar z = met de klok mee op het canvas).
    const hb = (b.b / 2) * schaal, hd = (b.d / 2) * schaal;
    g.save();
    g.translate(X(b.x + b.b / 2), Z(b.z + b.d / 2));
    if (b.draai) g.rotate((b.draai * Math.PI) / 180);
    if ((b.vorm === 'cilinder' || b.vorm === 'kegel') && (!b.as || b.as === 'y')) g.ellipse(0, 0, hb, hd, 0, 0, Math.PI * 2);
    else if (b.afronding) g.roundRect(-hb, -hd, 2 * hb, 2 * hd, Math.min(b.afronding * schaal, hb, hd));
    else g.rect(-hb, -hd, 2 * hb, 2 * hd);
    g.fill();
    g.restore();
  }

  function zetContactschaduw(s: Scene3D, echt: any = null) {
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
    g.fillStyle = g.strokeStyle = '#000';
    const onder = echt ? new Set((echt.userData.echt as Echt3DPlaatsing).elementen.map((e) => e.id)) : null;
    const X = (x: number) => (x - k.x + rand) * schaal - 2000, Z = (z: number) => (z - k.z + rand) * schaal;
    for (const b of s.blokken) {
      if (b.y > 25 || b.vorm === 'bol' || b.soort === 'glas' || b.soort === 'matglas' || onder?.has(b.code.split('.')[0]!)) continue;
      tekenGrondvorm(g, b, X, Z, schaal);
    }
    // Echt 3D-model: zijn eigen grondvorm (alle driehoeken van boven gezien, in dezelfde draairichting, één vulling).
    if (echt) {
      echt.updateMatrixWorld(true);
      const pad = new Path2D(), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      echt.traverse((o: any) => {
        if (!o.isMesh) return;
        const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count;
        const punt = (i: number, w: any) => {
          w.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld);
          return [(w.x - k.x + rand) * schaal - 2000, (w.z - k.z + rand) * schaal] as const;
        };
        for (let i = 0; i + 2 < n; i += 3) {
          const p1 = punt(i, v[0]), p2 = punt(i + 1, v[1]), p3 = punt(i + 2, v[2]);
          const opp = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]);
          if (Math.abs(opp) < 1e-6) continue;
          const [q2, q3] = opp > 0 ? [p2, p3] : [p3, p2];
          pad.moveTo(p1[0], p1[1]); pad.lineTo(q2[0], q2[1]); pad.lineTo(q3[0], q3[1]); pad.closePath();
        }
      });
      g.fill(pad);
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
        const toeval = vasteReeks('houtnerf' + hex);
        g.fillStyle = hex;
        g.fillRect(0, 0, 16 * px, 32 * px);
        for (let n = 0; n < 60; n++) {
          const x = toeval() * 16 * px, w = 0.4 + toeval() * 1.6;
          g.globalAlpha = 0.35 + toeval() * 0.3;
          g.fillStyle = tint(hex, toeval() < 0.5 ? 0.82 : 1.1);
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
        m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, map: t });
      } else if (v.soort === 'tegel') {
        const t = tegels(v.kleur);
        t.repeat.set(4000 / TEGEL.b, 4000 / TEGEL.h);
        m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, map: t });
      } else if (v.soort === 'planken') {
        const t = planken(v.kleur);
        t.repeat.set(4000 / PLANK.b, 4000 / PLANK.h);
        m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, map: t });
      } else {
        // Gepolierde beton: pleistertextuur op grote schaal, iets glanzend.
        const t = pleister(v.kleur);
        t.repeat.set(4000 / 160, 4000 / 160);
        m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, map: t });
      }
      decorMaterialen.set(sleutel, m);
    }
    return m;
  }
  function muurMateriaal(w: { soort: string; kleur: string }, breed: number, hoog: number) {
    if (w.soort === 'steen') {
      const t = baksteen(w.kleur, '#c7bfb2');
      t.repeat.set(breed / STEEN.b, hoog / STEEN.h);
      return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: t });
    }
    return new THREE.MeshStandardMaterial({ color: kleur(w.kleur), roughness: 0.95 });
  }
  /** Wanden van het decor (wegvallen als de camera erachter staat) en hoe ver het schaduwbereik moet reiken. */
  let decorWanden: { obj: any; punt: [number, number, number]; normaal: [number, number, number] }[] = [];
  let decorMarge = 0;
  function zetDecor(s: Scene3D | null) {
    for (const d of kamerDelen) { scene.remove(d); d.traverse((o: any) => o.geometry?.dispose()); }
    kamerDelen.length = 0;
    decorWanden = [];
    decorMarge = 0;
    const basis = DECORS[decorNaam] as DecorSpec;
    // Losse instellingen gaan voor op het decor.
    const w = weergave;
    const dc: DecorSpec = {
      ...basis,
      vloer: w.vloer !== 'decor' ? VLOEREN[w.vloer] : basis.vloer,
      muur: w.muur === 'decor' ? basis.muur : w.muur === 'geen' ? undefined : w.muur === 'steen' ? { soort: 'steen', kleur: '#8a4a36' } : { soort: 'verf', kleur: w.muur },
      tapijt: w.tapijt === 'decor' ? basis.tapijt : w.tapijt === 'geen' ? undefined : { ...(basis.tapijt ?? {}), kleur: w.tapijt },
    };
    if (w.muur === 'geen') dc.wanden = undefined;
    // Avond zonder wanden: achtergrond donker en warm (anders een lichte lucht boven een donkere vloer: een bruine brij).
    const lichtBg = (LICHTEN[lichtNaam] as { achtergrond?: string }).achtergrond;
    const bg = !opties.zetel ? '#f2f1ed' : lichtBg && !dc.wanden ? lichtBg : dc.achtergrond;
    scene.background = new THREE.Color(bg);
    if (opties.zetel) {
      // Mist in de kleur van de achtergrond: de vloer loopt zacht weg, geen harde horizon.
      if (!scene.fog) scene.fog = new THREE.Fog(bg, 600, 1800);
      scene.fog.color.set(bg);
    }
    lamp.intensity = 0;
    const k0 = s?.kader ?? kader;
    /** Warme lamp net buiten beeld (rechts voor, boven de zetel) als het decor zelf geen lamp heeft. */
    const virtueleLamp = () => {
      if (!opties.zetel || !LICHTEN[lichtNaam].lamp) return;
      lamp.position.set(k0.x + k0.b + 70, 175, k0.z + k0.d + 90);
      lamp.intensity = LICHTEN[lichtNaam].lamp * 1.7 * PI * 190;
    };
    if (!opties.zetel || !dc.vloer) {
      vloer.material = studioVloer;
      virtueleLamp();
      zetLicht();
      return;
    }
    vloer.material = vloerMateriaal(dc.vloer);
    const k = s?.kader ?? kader;
    const avond = lichtNaam === 'avond';
    const r = bouwDecor({
      THREE, kleur, tint, canvasTextuur, parket, baksteen, pleister, houtNerf, weefselCanvas: (x, hex) => weefselCanvas(x, hex),
      bladVorm: () => (bladVorm ??= maakBladVorm()), avond,
    }, dc, k, w.spullen !== 'uit');
    kamerDelen.push(...r.delen);
    decorWanden = r.wanden;
    decorMarge = r.schaduwMarge;
    if (r.lamp) { lamp.position.set(...r.lamp); lamp.intensity = LICHTEN[lichtNaam].lamp * 1.4 * PI * 150; }
    else virtueleLamp();
    scene.add(...kamerDelen);
    schaduwOpnieuw();
    zetLicht();
    wandenNaarCamera();
  }
  /** Gebogen bladvorm (ficus) voor de planten. */
  function maakBladVorm() {
    const v = new THREE.Shape();
    v.moveTo(0, 0);
    v.quadraticCurveTo(6.5, 5, 4.5, 13);
    v.quadraticCurveTo(2.5, 19, 0, 21);
    v.quadraticCurveTo(-2.5, 19, -4.5, 13);
    v.quadraticCurveTo(-6.5, 5, 0, 0);
    const g = new THREE.ShapeGeometry(v, 6);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, -0.012 * pos.getY(i) * pos.getY(i) + Math.abs(pos.getX(i)) * 0.25);
    g.computeVertexNormals();
    return g;
  }
  /** Wanden tussen de camera en de zetel weglaten (zoals in een bouwspel), anders zie je de zetel niet. */
  function wandenNaarCamera() {
    for (const w of decorWanden) {
      const d = (camera.position.x - w.punt[0]) * w.normaal[0] + (camera.position.y - w.punt[1]) * w.normaal[1] + (camera.position.z - w.punt[2]) * w.normaal[2];
      w.obj.visible = d > 0;
    }
  }
  /** De lichtsfeer zoals ze nu geldt, met de ijking erbij: ZETEL_LICHT voor de zetel, BOUW_LICHT voor de bouwweergave. */
  function lichtNu() {
    const l = LICHTEN[lichtNaam];
    const ijk = (opties.zetel ? ZETEL_LICHT[lichtNaam] : BOUW_LICHT[lichtNaam]) ?? {};
    return { ...l, ...ijk, belichting: ijk.belichting ?? 1 };
  }
  function zetLicht() {
    const l = lichtNu();
    renderer.toneMappingExposure = Math.pow(2, weergave.helderheid) * l.belichting;
    zon.color.set(l.zon);
    zon.intensity = l.zonSterkte * PI;
    hemel.intensity = l.hemel * PI;
    hemel.color.set(l.hemelKleur);
    if (opties.zetel) scene.environment = omgevingVoor(lichtNaam);
    // De sterkte van het omgevingslicht: één instelling voor de hele scène (zie LICHTEN en ZETEL_LICHT).
    scene.environmentIntensity = l.omgeving;
    zetZon();
  }
  function zetZon() {
    schaduwOpnieuw();
    const grootte = Math.max(kader.b, kader.d, 120);
    // Schaduwbereik: de zetel, en bij een kamer ook de wanden en het raam (lichtvlek op de vloer).
    const sc = zon.shadow.camera, bereik = grootte + decorMarge;
    sc.left = sc.bottom = -bereik;
    sc.right = sc.top = bereik;
    sc.near = 1;
    sc.far = (grootte + decorMarge) * 5;
    sc.updateProjectionMatrix();
    const h = lichtNu().hoogte;
    const a = (weergave.zonRichting * Math.PI) / 180;
    zon.position.set(doel.x + Math.cos(a) * grootte * 1.25, grootte * h, doel.z + Math.sin(a) * grootte * 1.25);
    zon.target.position.copy(doel);
  }

  // ---------- camera (eenvoudige orbit) ----------
  let doel = new THREE.Vector3(115, 35, 50);
  let afstand = 420, hoekH = -0.6, hoekV = 0.42;
  /** Verschuiving van het mikpunt t.o.v. het midden van de zetel (rechtermuisknop, Shift + slepen of twee vingers). */
  const schuif = new THREE.Vector3();
  const mik = new THREE.Vector3();
  const plaatsCamera = () => {
    hoekV = Math.min(1.45, Math.max(0.05, hoekV));
    mik.copy(doel).add(schuif);
    camera.position.set(
      mik.x + afstand * Math.cos(hoekV) * Math.sin(hoekH),
      mik.y + afstand * Math.sin(hoekV),
      mik.z + afstand * Math.cos(hoekV) * Math.cos(hoekH),
    );
    camera.lookAt(mik);
    wandenNaarCamera();
    if (scene.fog) {
      const g = Math.max(kader.b, kader.d, 120);
      scene.fog.near = afstand + g * 0.9;
      scene.fog.far = afstand + g * 4.5;
    }
    render();
  };
  // ---------- vloeiende beweging: glijden naar een standpunt, uitloop na het draaien ----------
  const rustig = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  type Stand = { hoekH: number; hoekV: number; afstand: number; schuif?: any };
  let vlucht = 0, uitloop = 0, vluchtDoel: Stand | null = null;
  let snelH = 0, snelV = 0, laatsteBeweging = 0;
  const zetStand = (s: Stand) => {
    hoekH = s.hoekH; hoekV = s.hoekV; afstand = s.afstand;
    if (s.schuif) schuif.copy(s.schuif); else schuif.set(0, 0, 0);
  };
  /** Stop een lopende beweging; `naarEinde` zet de camera meteen op het eindpunt (voor een foto of een beeld). */
  function stopBeweging(naarEinde = false) {
    cancelAnimationFrame(vlucht); cancelAnimationFrame(uitloop);
    vlucht = uitloop = 0;
    if (naarEinde && vluchtDoel) { zetStand(vluchtDoel); plaatsCamera(); }
    vluchtDoel = null;
  }
  /** Glij in ±0,4 s naar een stand (kortste draairichting); zonder animatie als de gebruiker minder beweging vraagt. */
  function vliegNaar(naar: Stand, ms = 420) {
    stopBeweging();
    vluchtDoel = naar;
    if (!klaar || rustig?.matches || bezigMetFoto || document.hidden) { stopBeweging(true); return; }
    const van = { hoekH, hoekV, afstand, schuif: schuif.clone() };
    const eindSchuif = naar.schuif ?? new THREE.Vector3();
    let dH = (naar.hoekH - van.hoekH) % (2 * PI);
    if (dH > PI) dH -= 2 * PI; else if (dH < -PI) dH += 2 * PI;
    const start = performance.now();
    const stap = (nu: number) => {
      const t = Math.min(1, (nu - start) / ms);
      if (t >= 1) { vlucht = 0; zetStand(naar); vluchtDoel = null; plaatsCamera(); return; }
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      hoekH = van.hoekH + dH * e;
      hoekV = van.hoekV + (naar.hoekV - van.hoekV) * e;
      afstand = van.afstand + (naar.afstand - van.afstand) * e;
      schuif.lerpVectors(van.schuif, eindSchuif, e);
      plaatsCamera();
      vlucht = requestAnimationFrame(stap);
    };
    vlucht = requestAnimationFrame(stap);
  }
  /** Het mikpunt verschuiven in het vlak van het scherm, binnen de omgeving van de zetel. */
  function verschuif(dx: number, dy: number) {
    const perPx = (2 * afstand * Math.tan((camera.fov * PI) / 360)) / (renderer.domElement.clientHeight || 400);
    camera.updateMatrixWorld();
    schuif.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), -dx * perPx);
    schuif.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1), dy * perPx);
    const max = Math.max(kader.b, kader.d, 120) * 0.9;
    schuif.x = Math.min(max, Math.max(-max, schuif.x));
    schuif.z = Math.min(max, Math.max(-max, schuif.z));
    schuif.y = Math.min(kader.h + 60 - doel.y, Math.max(5 - doel.y, schuif.y));
    plaatsCamera();
  }
  let vorige: { x: number; y: number } | null = null;
  const aanwijzers = new Map<number, { x: number; y: number }>();
  let knijpAfstand = 0, knijpMidden: { x: number; y: number } | null = null;
  let schuifModus = false;
  let drukStart: { x: number; y: number } | null = null;
  renderer.domElement.addEventListener('contextmenu', (ev: Event) => ev.preventDefault());
  renderer.domElement.addEventListener('pointerdown', (ev: PointerEvent) => {
    if (bezigMetFoto) return;
    pauzeerDraaien();
    stopBeweging();
    snelH = snelV = 0;
    // Rechter- of middelste muisknop, of Shift + slepen: verschuiven in plaats van draaien.
    schuifModus = ev.button === 2 || ev.button === 1 || ev.shiftKey;
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
      // Twee vingers samen verschuiven: het beeld schuift mee.
      const midden = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (knijpMidden) verschuif(midden.x - knijpMidden.x, midden.y - knijpMidden.y); else plaatsCamera();
      knijpMidden = midden;
      return;
    }
    if (!vorige) return;
    const dx = ev.clientX - vorige.x, dy = ev.clientY - vorige.y;
    vorige = { x: ev.clientX, y: ev.clientY };
    if (schuifModus) { verschuif(dx, dy); return; }
    // Snelheid onthouden (afgevlakt) voor de uitloop na het loslaten.
    const nu = performance.now(), dt = Math.max(4, nu - laatsteBeweging);
    snelH = 0.5 * snelH + 0.5 * ((-dx * 0.008) / dt);
    snelV = 0.5 * snelV + 0.5 * ((dy * 0.006) / dt);
    laatsteBeweging = nu;
    hoekH -= dx * 0.008;
    hoekV += dy * 0.006;
    plaatsCamera();
  });
  const los = (ev: PointerEvent) => {
    const eenVinger = aanwijzers.size === 1;
    // Klik zonder slepen: het element onder de muis kiezen.
    const klik = ev.type === 'pointerup' && drukStart && eenVinger && Math.hypot(ev.clientX - drukStart.x, ev.clientY - drukStart.y) < 5;
    if (klik) kies(ev);
    // Uitloop: wie met een zwaai loslaat, ziet de zetel nog even doordraaien en zacht stilvallen.
    else if (ev.type === 'pointerup' && eenVinger && !schuifModus && !rustig?.matches && performance.now() - laatsteBeweging < 90 && Math.hypot(snelH, snelV) > 0.0007) {
      let vorig = performance.now();
      const stap = (nu: number) => {
        const dt = Math.min(40, nu - vorig);
        vorig = nu;
        hoekH += snelH * dt; hoekV += snelV * dt;
        const rem = Math.exp(-dt / 240);
        snelH *= rem; snelV *= rem;
        plaatsCamera();
        uitloop = Math.hypot(snelH, snelV) > 0.00008 ? requestAnimationFrame(stap) : 0;
      };
      uitloop = requestAnimationFrame(stap);
    }
    drukStart = null;
    aanwijzers.delete(ev.pointerId);
    knijpAfstand = 0;
    knijpMidden = null;
    vorige = null;
  };
  renderer.domElement.addEventListener('pointerup', los);
  const straal = new THREE.Raycaster();
  function kies(ev: PointerEvent) {
    if (!opties.opKlik) return;
    opties.opKlik(elementBij(ev));
  }
  /** Het element onder een punt van het scherm (null = naast de zetel). */
  function elementBij(ev: { clientX: number; clientY: number }): string | null {
    const r = renderer.domElement.getBoundingClientRect();
    straal.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
    const raak = straal.intersectObjects(groep.children, true).find((h: any) => h.object.name || h.object.parent?.name);
    // Echt 3D-model: het element onder de klik, volgens zijn stuk langs x.
    const echt = raak?.object.parent?.userData?.echt as Echt3DPlaatsing | undefined;
    if (echt) {
      const x = raak.point.x;
      return (echt.elementen.find((e) => x >= e.x0 && x <= e.x1) ?? echt.elementen[0]!).id;
    }
    // Zachte vorm: het element met het dichtste deel bij de klik.
    const delen = raak?.object.userData?.delen as { id: string; box: any }[] | undefined;
    if (delen?.length) {
      let beste = delen[0]!, afstand = Infinity;
      for (const d of delen) { const a = d.box.distanceToPoint(raak.point); if (a < afstand) { afstand = a; beste = d; } }
      return beste.id;
    }
    const naam: string = raak ? raak.object.name || raak.object.parent.name : '';
    return naam ? naam.split('.')[0]! : null;
  }
  // Dubbelklik op een deel: erop inzoomen; nog eens (of naast de zetel): terug naar de hele zetel.
  renderer.domElement.addEventListener('dblclick', (ev: MouseEvent) => {
    if (bezigMetFoto) return;
    pauzeerDraaien();
    const geheel = Math.max(200, Math.max(kader.b, kader.d, 120) * 1.5) * lensFactor();
    const id = elementBij(ev);
    const box = id ? doosVanElement(id) : null;
    if (!box || box.isEmpty()) { vliegNaar({ hoekH, hoekV, afstand: geheel }); return; }
    const naar = box.getCenter(new THREE.Vector3()).sub(doel), maat = box.getSize(new THREE.Vector3());
    const dichtbij = Math.max(120, Math.max(maat.x, maat.y, maat.z) * 2.2) * lensFactor();
    if (schuif.distanceTo(naar) < 6 && Math.abs(afstand - dichtbij) < 12) vliegNaar({ hoekH, hoekV, afstand: geheel });
    else vliegNaar({ hoekH, hoekV, afstand: dichtbij, schuif: naar });
  });
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
    stopBeweging();
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
  /** Het kader rond alle delen van één element (blokken, stuk van een echt 3D-model, delen van een zachte vorm). */
  function doosVanElement(id: string) {
    const box = new THREE.Box3();
    for (const c of groep.children) {
      if (c.name.startsWith(`${id}.`)) box.expandByObject(c);
      // Echt 3D-model: het stuk van dit element.
      const p = c.userData?.echt as Echt3DPlaatsing | undefined;
      const e = p?.elementen.find((x) => x.id === id);
      if (p && e) box.union(new THREE.Box3(new THREE.Vector3(e.x0, 0, p.z), new THREE.Vector3(e.x1, p.h, p.z + p.d)));
      // Zachte vorm: de delen van dit element.
      for (const d of (c.userData?.delen ?? []) as { id: string; box: any }[]) if (d.id === id) box.union(d.box);
    }
    return box;
  }
  function zetMarkering() {
    if (markeerKader) { scene.remove(markeerKader); markeerKader.geometry?.dispose(); markeerKader = null; }
    if (!markeerId) return;
    const box = doosVanElement(markeerId);
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
    stopBeweging();
    afstand = Math.min(2500, Math.max(120, afstand * (1 + Math.sign(ev.deltaY) * 0.1)));
    plaatsCamera();
  }, { passive: false });

  // Nabewerking (alleen zetel, kwaliteit Mooi): ambient occlusion (GTAO) voor schaduw in hoeken, naden en onder kussens.
  // WebGPU (04-11): een RenderPipeline met TSL-knopen (pass met normalen, GTAO op halve resolutie, ontruisd), zelfde
  // instellingen als vroeger met de GTAOPass; de AO dempt het beeld voor 90 %. Tonemapping en sRGB doet de pijplijn.
  let composer: { render(): void; setPixelRatio(r: number): void; setSize(b: number, h: number): void } | null = null;
  function maakComposer() {
    try {
      const pijplijn = new RenderPipeline(renderer);
      const scenePass = pass(scene, camera, { samples: 4 });
      scenePass.setMRT(mrt({ output, normal: packNormalToRGB(normalView) }));
      const kleur = scenePass.getTextureNode('output');
      const normaalKleur = scenePass.getTextureNode('normal');
      const diepte = scenePass.getTextureNode('depth');
      const normaal = sample((uv: unknown) => unpackRGBToNormal(normaalKleur.sample(uv)));
      const aoPass = ao(diepte, normaal, camera);
      aoPass.resolutionScale = 0.5;
      aoPass.radius.value = 14; aoPass.distanceExponent.value = 1.2; aoPass.thickness.value = 8;
      aoPass.scale.value = 1.1; aoPass.samples.value = 12; aoPass.distanceFallOff.value = 1;
      const aoZacht = denoise(aoPass.getTextureNode(), diepte, normaal, camera);
      aoZacht.lumaPhi.value = 10; aoZacht.depthPhi.value = 2; aoZacht.normalPhi.value = 3; aoZacht.radius.value = 6;
      // Op grote afstand (de rand van het achterdoek, de verre vloer) geen AO: daar ziet GTAO valse hoeken (streepjes). De
      // zetel staat altijd dichter dan 10 m.
      // Afstand tot de camera van de scène (niet cameraNear/cameraFar: in de nabewerking is dat de camera van het schermvlak).
      const afstand = scenePass.getViewZNode().negate();
      const dichtbij = float(1).sub(smoothstep(1000, 1600, afstand));
      pijplijn.outputNode = vec4(kleur.rgb.mul(mix(float(1), aoZacht.r, dichtbij.mul(0.9))), kleur.a);
      composer = { render: () => pijplijn.render(), setPixelRatio: () => {}, setSize: () => {} };
    } catch (fout) {
      console.warn('Nabewerking (GTAO) niet beschikbaar:', fout);
      composer = null;
    }
  }
  const metNabewerking = () => opties.zetel && kwaliteitNu === 'mooi' && composer;
  // Tijdens draaien en zoomen: het snelle beeld; 180 ms na de laatste beweging één keer het mooie beeld (met GTAO).
  let mooiGepland = 0;
  // Veel aanvragen kort na elkaar (slepen, schuifregelaar) worden samengevoegd tot één beeld per schermverversing.
  let beeldGepland = 0;
  function render(direct = false) {
    if (bezigMetFoto) return;
    if (direct) { cancelAnimationFrame(beeldGepland); beeldGepland = 0; tekenNu(true); return; }
    if (!beeldGepland) beeldGepland = requestAnimationFrame(() => { beeldGepland = 0; tekenNu(false); });
  }
  function tekenNu(direct: boolean) {
    if (bezigMetFoto || !klaar) return;
    // Tellers per beeld (alle beurten samen: schaduw, scène, nabewerking), zie info().
    renderer.info.reset();
    const c = metNabewerking() ? composer : null;
    if (!c) { renderer.render(scene, camera); onthoudTelling(); return; }
    if (direct) { annuleerMooi(); c.render(); onthoudTelling(); return; }
    renderer.render(scene, camera);
    onthoudTelling();
    annuleerMooi();
    // Het mooie beeld 180 ms later, maar binnen een beeldronde van de browser (requestAnimationFrame): een beeld dat
    // daarbuiten getekend wordt, toont niet elke browser betrouwbaar (Safari met WebGPU).
    mooiGepland = window.setTimeout(() => {
      mooiBeeld = requestAnimationFrame(() => { mooiBeeld = 0; if (!bezigMetFoto) { c.render(); onthoudTelling(); } });
    }, 180);
  }
  let mooiBeeld = 0;
  function annuleerMooi() {
    clearTimeout(mooiGepland);
    cancelAnimationFrame(mooiBeeld);
    mooiBeeld = 0;
  }
  /** Belasting van het laatste beeld waarin de scène zelf getekend is (de nabewerking alleen is één tekenbeurt). */
  let telling = { tekenbeurten: 0, driehoeken: 0 };
  function onthoudTelling() {
    const r = renderer.info?.render;
    if (r && (r.drawCalls ?? 0) > 2) telling = { tekenbeurten: r.drawCalls, driehoeken: r.triangles ?? 0 };
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
  // ---------- echte 3D-modellen (bestand van de fabrikant, zie core/src/echt3d.ts) ----------
  type EchtDeel = { naam: string; geo: any; materiaal: any };
  type EchtModel = { delen: EchtDeel[]; box: any; cmPerUV: number };
  /** Per bestand: het geladen model, of 'laden' / 'fout' (dan de blokken). */
  const echteModellen = new Map<string, EchtModel | 'laden' | 'fout'>();
  let laatsteScene: Scene3D | null = null;
  /** Welk deel van een 3D-bestand (naam van het deel of zijn materiaal): onze stof, onze poten of zoals in het bestand. */
  const deelSoort = (naam: string) => (/fabric|stof|bekleding|upholster/.test(naam) ? 'stof' : /leg|poot|poten/.test(naam) ? 'poten' : 'eigen');
  /** Hoeveel cm één eenheid van de textuurcoördinaten is (bestand in meter): uit de oppervlakte van alle driehoeken. */
  function cmPerUV(geo: any) {
    const p = geo.attributes.position, uv = geo.attributes.uv, idx = geo.index;
    if (!uv) return 300;
    const n = idx ? idx.count : p.count, h = (i: number) => (idx ? idx.getX(i) : i);
    let opp = 0, uvOpp = 0;
    for (let i = 0; i + 2 < n; i += 3) {
      const a = h(i), b = h(i + 1), c = h(i + 2);
      const ux = p.getX(b) - p.getX(a), uy = p.getY(b) - p.getY(a), uz = p.getZ(b) - p.getZ(a);
      const vx = p.getX(c) - p.getX(a), vy = p.getY(c) - p.getY(a), vz = p.getZ(c) - p.getZ(a);
      opp += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
      uvOpp += Math.abs((uv.getX(b) - uv.getX(a)) * (uv.getY(c) - uv.getY(a)) - (uv.getX(c) - uv.getX(a)) * (uv.getY(b) - uv.getY(a))) / 2;
    }
    return uvOpp > 0 ? Math.sqrt(opp / uvOpp) * 100 : 300;
  }
  function naarBase64(buf: ArrayBuffer) {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  /**
   * Afbeeldingen in een GLB laden via een data-URL, zoals de stoffoto's, in plaats van via een blob-adres: dat laat niet
   * elke pagina toe (bv. de weergave van een artifact). Lukt het niet, dan het model zonder die textuur.
   */
  const afbeeldingenViaDataUrl = (parser: any) => ({
    name: 'configurator_afbeeldingen_via_data_url',
    loadTexture(index: number) {
      const json = parser.json, def = json.textures?.[index], bron = def ? json.images?.[def.source] : undefined;
      if (!bron || bron.bufferView === undefined || !bron.mimeType) return null;
      return parser.getDependency('bufferView', bron.bufferView)
        .then((buf: ArrayBuffer) => new Promise((ok, mis) => new THREE.TextureLoader().load(`data:${bron.mimeType};base64,${naarBase64(buf)}`, ok, undefined, mis)))
        .then((t: any) => {
          const s = json.samplers?.[def.sampler] ?? {};
          const omloop = (w?: number) => (w === 33071 ? THREE.ClampToEdgeWrapping : w === 33648 ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping);
          t.flipY = false;
          t.name = def.name || bron.name || '';
          t.magFilter = s.magFilter === 9728 ? THREE.NearestFilter : THREE.LinearFilter;
          t.minFilter = s.minFilter === 9728 ? THREE.NearestFilter : s.minFilter === 9729 ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
          t.wrapS = omloop(s.wrapS);
          t.wrapT = omloop(s.wrapT);
          return t;
        })
        .catch(() => null);
    },
  });
  /** Het geladen model, of null (nog aan het laden, niet in deze versie of kapot: dan de blokken). Laadt bij de eerste vraag. */
  function echtModelVan(bestand: string): EchtModel | null {
    const m = echteModellen.get(bestand);
    if (m) return typeof m === 'object' ? m : null;
    const bron = (window as unknown as { __MODELLEN3D?: Record<string, string> }).__MODELLEN3D?.[bestand];
    if (!bron) { echteModellen.set(bestand, 'fout'); return null; }
    echteModellen.set(bestand, 'laden');
    // Zelf uit base64 halen (geen fetch van een data-URL: die laat niet elke pagina toe).
    Promise.resolve()
      .then(() => {
        const tekens = atob(bron.slice(bron.indexOf(',') + 1));
        const bytes = new Uint8Array(tekens.length);
        for (let i = 0; i < tekens.length; i++) bytes[i] = tekens.charCodeAt(i);
        const loader = new GLTFLoader();
        loader.register(afbeeldingenViaDataUrl);
        return loader.parseAsync(bytes.buffer, '');
      })
      .then((gltf: any) => {
        gltf.scene.updateMatrixWorld(true);
        const delen: EchtDeel[] = [];
        // Alleen meshes (een lamp of camera in het bestand doet niet mee); de vorm in wereldmaat van het bestand.
        gltf.scene.traverse((o: any) => {
          if (!o.isMesh) return;
          const geo = o.geometry.clone();
          geo.applyMatrix4(o.matrixWorld);
          geo.computeBoundingBox();
          delen.push({ naam: `${o.name} ${o.material?.name ?? ''}`.toLowerCase(), geo, materiaal: o.material });
        });
        const box = new THREE.Box3();
        for (const d of delen) box.union(d.geo.boundingBox);
        const stof = delen.find((d) => deelSoort(d.naam) === 'stof');
        echteModellen.set(bestand, { delen, box, cmPerUV: stof ? cmPerUV(stof.geo) : 300 });
        if (laatsteScene?.echt?.bestand === bestand) viewer.toon(laatsteScene);
      })
      .catch((fout) => {
        console.error(`3D-bestand ${bestand} laden mislukt:`, fout);
        echteModellen.set(bestand, 'fout');
        if (laatsteScene?.echt?.bestand === bestand) viewer.toon(laatsteScene);
      });
    return null;
  }
  /**
   * Onze stof op het model: hetzelfde weefsel of dezelfde foto als op de blokken, op ware grootte via de
   * textuurcoördinaten van het bestand, met de schaduw in plooien en naden (AO) uit het bestand.
   */
  function echtStof(p: Echt3DPlaatsing, cmPerUv: number, ao: any) {
    const basis = materiaal({ soort: 'stof', kleur: p.stof.kleur, weefsel: p.stof.weefsel, textuur: p.stof.textuur });
    const tegel = p.stof.textuur ? p.stof.textuurCm ?? 15 : p.stof.weefsel && p.stof.weefsel in WEEFSEL_CM ? WEEFSEL_CM[p.stof.weefsel as Weefsel] : 8;
    const herhaling = Math.round((cmPerUv / tegel) * 10) / 10;
    const sleutel = `echt:${basis.uuid}:${herhaling}:${ao?.uuid ?? ''}`;
    let m = materialen.get(sleutel);
    if (!m) {
      m = basis.clone();
      for (const veld of ['map', 'bumpMap', 'normalMap', 'roughnessMap']) {
        if (!basis[veld]) continue;
        const t = basis[veld].clone();
        t.repeat.set(herhaling, herhaling);
        t.needsUpdate = true;
        m[veld] = t;
      }
      if (ao) { m.aoMap = ao; m.aoMapIntensity = 1; }
      materialen.set(sleutel, m);
    }
    return m;
  }
  /** Het model in het kader van zijn elementen: per richting geschaald (meter in het bestand → cm), met onze stof en poten. */
  function echtGroep(p: Echt3DPlaatsing, model: EchtModel) {
    const g = new THREE.Group();
    g.name = 'echt3d';
    g.userData.echt = p;
    const maat = model.box.getSize(new THREE.Vector3());
    g.scale.set(p.b / maat.x, p.h / maat.y, p.d / maat.z);
    g.position.set(p.x - model.box.min.x * g.scale.x, -model.box.min.y * g.scale.y, p.z - model.box.min.z * g.scale.z);
    // Stofmaat na het schalen (gemiddeld over breedte en diepte: daar loopt de meeste stof).
    const cmUv = model.cmPerUV * ((g.scale.x + g.scale.z) / 200);
    const ao = model.delen.find((d) => d.materiaal?.aoMap)?.materiaal.aoMap ?? null;
    for (const d of model.delen) {
      const soort = deelSoort(d.naam);
      const mat = soort === 'stof' ? echtStof(p, cmUv, ao) : soort === 'poten' ? materiaal({ soort: p.poten.soort, kleur: p.poten.kleur }) : d.materiaal;
      const m = new THREE.Mesh(d.geo.clone(), mat);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }
    return g;
  }

  // ---------- zachte vormen (proef, zie core/src/zachtevorm.ts) ----------
  /** Berekende vormen per groep (sleutel = de maten van de delen en de kussens eromheen), om niet opnieuw te rekenen. */
  const zachteVormen = new Map<string, ZachteVorm>();
  let zachtGepland = 0;
  const materiaalSleutel = (b: Blok) => `${b.soort}:${b.kleur}:${b.weefsel ?? ''}:${b.textuur ? b.textuur.length + b.textuur.slice(-24) : ''}`;
  const doosVan = (b: Blok) => new THREE.Box3(new THREE.Vector3(b.x, b.y, b.z), new THREE.Vector3(b.x + b.b, b.y + b.h, b.z + b.d));
  /** Groepen die samensmelten: zelfde stof en aan elkaar (kaders raken elkaar). */
  function zachteGroepen(blokken: Blok[]) {
    const mee = blokken.filter(smeltMee);
    const ouder = mee.map((_, i) => i);
    const wortel = (i: number): number => (ouder[i] === i ? i : (ouder[i] = wortel(ouder[i]!)));
    const dozen = mee.map((b) => doosVan(b).expandByScalar(1));
    for (let i = 0; i < mee.length; i++) for (let j = i + 1; j < mee.length; j++)
      if (materiaalSleutel(mee[i]!) === materiaalSleutel(mee[j]!) && dozen[i]!.intersectsBox(dozen[j]!)) ouder[wortel(i)] = wortel(j);
    const groepen = new Map<number, Blok[]>();
    mee.forEach((b, i) => { const w = wortel(i); groepen.set(w, [...(groepen.get(w) ?? []), b]); });
    return [...groepen.values()];
  }
  const vormSleutel = (delen: Blok[], buren: Blok[]) => JSON.stringify([...delen, ...buren].map((b) => [b.code, b.vorm, b.x, b.y, b.z, b.b, b.h, b.d, b.afronding, b.afrondingOnder, b.kantel, b.as, b.pad, b.hoogtes, b.dikte, b.omtrek, b.profiel, b.uit]));
  /** De zachte vorm als mesh (onze stof, schaduw in de hoeken als hoekpuntkleur), of null als ze nog berekend moet worden. */
  function zachteMesh(delen: Blok[], buren: Blok[]) {
    const v = zachteVormen.get(vormSleutel(delen, buren));
    if (!v) return null;
    const b = delen[0]!;
    const tegel = b.textuur ? b.textuurCm ?? 15 : b.weefsel && b.weefsel in WEEFSEL_CM ? WEEFSEL_CM[b.weefsel as Weefsel] : 1;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(v.posities, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(v.normalen, 3));
    const uv = new Float32Array(v.uv.length);
    for (let i = 0; i < uv.length; i++) uv[i] = v.uv[i]! / tegel;
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const kleur = new Float32Array(v.schaduw.length * 3);
    for (let i = 0; i < v.schaduw.length; i++) kleur[i * 3] = kleur[i * 3 + 1] = kleur[i * 3 + 2] = v.schaduw[i]!;
    geo.setAttribute('color', new THREE.BufferAttribute(kleur, 3));
    geo.computeBoundingSphere();
    const basis = materiaal(b);
    const sleutel = `vc:${basis.uuid}`;
    let mat = materialen.get(sleutel);
    if (!mat) { mat = basis.clone(); mat.vertexColors = true; materialen.set(sleutel, mat); }
    const m = new THREE.Mesh(geo, mat);
    m.name = 'zacht';
    m.castShadow = m.receiveShadow = true;
    // Voor kiezen en markeren: per element het kader van zijn delen.
    const perElement = new Map<string, any>();
    for (const d of delen) { const id = d.code.split('.')[0]!; perElement.set(id, (perElement.get(id) ?? new THREE.Box3()).union(doosVan(d))); }
    m.userData.delen = [...perElement].map(([id, box]) => ({ id, box }));
    return m;
  }
  /**
   * Naad of bies rond het voorpaneel van een arm met een profiel, op de afgeronde rand tussen het paneel en de zijkanten
   * (0,29 × de afronding naar binnen en naar achter). Niet langs de onderkant.
   */
  function profielNaad(b: Blok) {
    if (!b.naad || b.naad.soort === 'stiksel' || !b.pad || !b.profiel || !b.uit || !b.hoogtes) return null;
    const [ux, uz] = b.uit, [ax, az] = b.pad[0]!, [bx, bz] = b.pad[b.pad.length - 1]!;
    const L = Math.hypot(bx - ax, bz - az) || 1, tx = (bx - ax) / L, tz = (bz - az) / L;
    const top = b.hoogtes[0]!, inw = (b.rand ?? 2.5) * 0.29;
    const pts = b.profiel.map(([s, y, boven]) => [s, boven ? top - y : y] as [number, number]);
    const n = pts.length;
    let opp = 0;
    for (let i = 0; i < n; i++) { const p = pts[i]!, q = pts[(i + 1) % n]!; opp += p[0] * q[1] - q[0] * p[1]; }
    const zin = opp > 0 ? 1 : -1;
    // Per punt de richting naar binnen (gemiddelde van de twee zijden), dan het punt een fractie naar binnen.
    const binnen = pts.map((p, i) => {
      const v = pts[(i - 1 + n) % n]!, w = pts[(i + 1) % n]!;
      const n1 = [-(p[1] - v[1]), p[0] - v[0]], n2 = [-(w[1] - p[1]), w[0] - p[0]];
      const l1 = Math.hypot(n1[0]!, n1[1]!) || 1, l2 = Math.hypot(n2[0]!, n2[1]!) || 1;
      const nx = (n1[0]! / l1 + n2[0]! / l2) * zin, ny = (n1[1]! / l1 + n2[1]! / l2) * zin, l = Math.hypot(nx, ny) || 1;
      return [p[0] + (nx / l) * inw, p[1] + (ny / l) * inw] as [number, number];
    });
    // Van de buitenkant onderaan rond tot de binnenkant onderaan: de onderkant (eerste zijde) niet.
    const reeks = [...binnen.slice(1), binnen[0]!];
    const punten = reeks.map(([s, y]) => new THREE.Vector3(ax + ux * s + tx * inw, y, az + uz * s + tz * inw));
    const curve = new THREE.CatmullRomCurve3(punten, false, 'centripetal');
    const straal = b.naad.soort === 'bies' ? 0.55 : 0.14;
    const mat = b.naad.soort === 'bies'
      ? new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur === b.kleur ? tint(b.kleur, 0.94) : b.naad.kleur), roughness: 0.85 })
      : new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur), roughness: 1 });
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(300, punten.length * 10), straal, 6, false), mat);
    m.receiveShadow = true;
    return m;
  }

  /**
   * Naad of bies rond een glad kussen met een vrije omtrek (de zitting van een doorlopende zetel): boven- en onderaan op
   * de afgeronde rand, zoals bij de gewone kussens.
   */
  function omtrekNaad(b: Blok) {
    if (!b.naad || b.naad.soort === 'stiksel' || b.soort !== 'kussen' || !b.omtrek) return [];
    const rr = Math.max(0.3, Math.min(b.afronding ?? Math.min(5, b.h / 3), b.h / 2 - 0.01)), inw = rr * 0.29;
    const pts = b.omtrek, n = pts.length;
    let opp = 0;
    for (let i = 0; i < n; i++) { const p = pts[i]!, q = pts[(i + 1) % n]!; opp += p[0] * q[1] - q[0] * p[1]; }
    const zin = opp > 0 ? 1 : -1;
    const binnen = pts.map((p, i) => {
      const v = pts[(i - 1 + n) % n]!, w = pts[(i + 1) % n]!;
      const n1 = [-(p[1] - v[1]), p[0] - v[0]], n2 = [-(w[1] - p[1]), w[0] - p[0]];
      const l1 = Math.hypot(n1[0]!, n1[1]!) || 1, l2 = Math.hypot(n2[0]!, n2[1]!) || 1;
      const nx = (n1[0]! / l1 + n2[0]! / l2) * zin, nz = (n1[1]! / l1 + n2[1]! / l2) * zin, l = Math.hypot(nx, nz) || 1;
      return [p[0] + (nx / l) * inw, p[1] + (nz / l) * inw] as [number, number];
    });
    const straal = b.naad.soort === 'bies' ? 0.55 : 0.14;
    const mat = b.naad.soort === 'bies'
      ? new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur === b.kleur ? tint(b.kleur, 0.94) : b.naad.kleur), roughness: 0.85 })
      : new THREE.MeshStandardMaterial({ color: kleur(b.naad.kleur), roughness: 1 });
    return [b.y + b.h - inw, b.y + inw].map((y) => {
      const curve = new THREE.CatmullRomCurve3(binnen.map(([x, z]) => new THREE.Vector3(x, y, z)), true, 'centripetal');
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(600, n * 3), straal, 6, true), mat);
      m.receiveShadow = true;
      return m;
    });
  }

  /**
   * Ontbrekende vormen even later berekenen (na het slepen), één per keer zodat het scherm tussendoor kan reageren, en
   * dan opnieuw tonen; tot dan de blokken.
   */
  function planZacht(s: Scene3D, taken: { delen: Blok[]; buren: Blok[] }[]) {
    clearTimeout(zachtGepland);
    zachtBezig = true;
    const volgende = () => {
      if (laatsteScene !== s) return;
      const taak = taken.find((t) => !zachteVormen.has(vormSleutel(t.delen, t.buren)));
      if (!taak) { viewer.toon(s); return; }
      const { delen, buren } = taak;
      // Grote vormen (meer dan 3 m³ in hun kader, bv. een hoeksofa, of meer dan 4 m² grondvlak, bv. de zitting van een
      // lange doorlopende zetel): raster van 2,5 cm, ±40 % minder rekenwerk; van op die afstand zie je het verschil niet.
      const kader = delen.reduce((k, b) => k.union(doosVan(b)), new THREE.Box3()), maat = kader.getSize(new THREE.Vector3());
      const groot = maat.x * maat.y * maat.z > 3e6 || maat.x * maat.z > 4e4;
      // Sinds de tweede ronde van 11/11 fijner (was 2,5 en 2 cm): ronde vormen werden op het grove raster kantig.
      zachteVormen.set(vormSleutel(delen, buren), zachteVorm(delen, { buren, raster: groot ? 2 : 1.5 }));
      // Niet onbeperkt bewaren (een sofa is al gauw enkele MB): de oudste eerst weg.
      if (zachteVormen.size > 12) zachteVormen.delete(zachteVormen.keys().next().value!);
      zachtGepland = window.setTimeout(volgende, 0);
    };
    zachtGepland = window.setTimeout(volgende, 140);
  }

  /**
   * Bouwweergave: onderdelen met hetzelfde materiaal samenvoegen tot één vorm per materiaal.
   *
   * Waarom: een woning telt honderden blokken (muren, vloeren, ramen, meubels), elk met tot zes materialen (één per
   * zijde). Elk materiaal van elk blok is een aparte tekenopdracht: bijna 2 000 per beeld, en nog eens zoveel voor de
   * schaduw. Het aantal tekenopdrachten weegt zwaarder dan het aantal driehoeken (richtwaarde: onder de paar honderd per
   * beeld), vooral op een tablet. Samengevoegd blijft er één opdracht per materiaal over: enkele tientallen.
   *
   * Niet samengevoegd: glas (doorzichtig, moet per ruit gesorteerd worden), onderdelen met eigen kinderen of
   * hoekpuntkleuren, en alles wat geen gewone vorm met normalen en textuurcoördinaten is. Het beeld blijft hetzelfde.
   */
  function voegSamen(meshes: any[]): any[] {
    type Bak = { mat: any; schaduw: boolean; pos: number[]; nor: number[]; uv: number[] };
    const bakken = new Map<string, Bak>(), rest: any[] = [];
    const p = new THREE.Vector3(), n = new THREE.Vector3(), normaalMatrix = new THREE.Matrix3();
    for (const m of meshes) {
      const g = m.geometry, a = g?.attributes;
      const mats: any[] = Array.isArray(m.material) ? m.material : [m.material];
      const gewoon = m.isMesh && !m.children.length && a?.position && a.normal && a.uv && !a.color
        && mats.every((x) => x && !x.transparent && !x.transmission && !x.vertexColors) && (!Array.isArray(m.material) || g.groups.length);
      if (!gewoon) { rest.push(m); continue; }
      m.updateMatrix();
      normaalMatrix.getNormalMatrix(m.matrix);
      const index = g.index, aantal = index ? index.count : a.position.count;
      const groepen = Array.isArray(m.material) ? g.groups : [{ start: 0, count: aantal, materialIndex: 0 }];
      for (const gr of groepen) {
        const mat = mats[gr.materialIndex ?? 0];
        const sleutel = `${mat.uuid}:${m.castShadow ? 1 : 0}`;
        let bak = bakken.get(sleutel);
        if (!bak) bakken.set(sleutel, (bak = { mat, schaduw: m.castShadow, pos: [], nor: [], uv: [] }));
        for (let i = gr.start; i < Math.min(aantal, gr.start + gr.count); i++) {
          const v = index ? index.getX(i) : i;
          p.fromBufferAttribute(a.position, v).applyMatrix4(m.matrix);
          n.fromBufferAttribute(a.normal, v).applyMatrix3(normaalMatrix).normalize();
          bak.pos.push(p.x, p.y, p.z);
          bak.nor.push(n.x, n.y, n.z);
          bak.uv.push(a.uv.getX(v), a.uv.getY(v));
        }
      }
      g.dispose();
    }
    for (const bak of bakken.values()) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(bak.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(bak.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(bak.uv, 2));
      const m = new THREE.Mesh(geo, bak.mat);
      m.castShadow = bak.schaduw;
      m.receiveShadow = true;
      rest.push(m);
    }
    return rest;
  }

  /** Tijdens de fotomodus niet tussendoor gewoon renderen (dat zou het rekenende beeld wissen). */
  let bezigMetFoto = false;
  let laatsteBreedte = 0;
  /** De maat die de renderer nu heeft, waar het canvas staat en of het sinds de vorige keer verborgen was (zie formaat). */
  let maatNu = { b: 0, h: 0 }, laatsteOuder: Element | null = null, wasVerborgen = false;
  const viewer: Viewer3D = {
    toon(s: Scene3D) {
      for (const c of [...groep.children]) {
        groep.remove(c);
        c.traverse((o: any) => o.geometry?.dispose());
      }
      laatsteScene = s;
      sceneBlokken = s.blokken;
      zachtBezig = false;
      // Echt 3D-model (als het bestand geladen is en de benadering niet gevraagd is): in de plaats van de blokken van zijn elementen.
      const model = s.echt && weergave.echtModel !== false ? echtModelVan(s.echt.bestand) : null;
      const echt = model ? echtGroep(s.echt!, model) : null;
      const onder = echt ? new Set(s.echt!.elementen.map((e) => e.id)) : null;
      const zichtbaar = s.blokken.filter((b) => !onder?.has(b.code.split('.')[0]!));
      // Zachte vormen: de gestoffeerde delen van het karkas per groep samengesmolten; kussens, hout en metaal zoals altijd.
      // Gladde blokken (een doorlopende zetel: onderbouw en rug samen, het zitkussen apart) altijd, ook bij Blokken.
      const versmolten = new Set<Blok>();
      if (opties.zetel) {
        const zacht = weergave.vormen === 'zacht';
        const groepen = zachteGroepen(zacht ? zichtbaar : zichtbaar.filter((b) => b.glad));
        for (const b of zichtbaar) if (b.glad && !smeltMee(b)) groepen.push([b]);
        const taken: { delen: Blok[]; buren: Blok[] }[] = [];
        for (const delen of groepen) {
          const kader = delen.reduce((k, b) => k.union(doosVan(b)), new THREE.Box3()).expandByScalar(25);
          // Een glad kussen (het zitkussen van een doorlopende zetel) krijgt ook schaduw van de rug en de onderbouw ernaast.
          const kussenGroep = delen.every((d) => d.soort === 'kussen');
          const buren = zichtbaar.filter((b) => (b.soort === 'kussen' || (kussenGroep && b.glad && b.soort === 'stof')) && !delen.includes(b) && kader.intersectsBox(doosVan(b)));
          const m = zachteMesh(delen, buren);
          if (m) {
            groep.add(m);
            for (const b of delen) {
              versmolten.add(b);
              // Ook samengesmolten houdt een arm zijn naad of bies rond het voorpaneel; het zitkussen boven- en onderaan.
              for (const naad of b.vorm === 'profiel' ? [profielNaad(b)] : omtrekNaad(b)) if (naad) m.add(naad);
            }
          }
          else taken.push({ delen, buren });
        }
        if (taken.length) planZacht(s, taken);
      }
      const los = zichtbaar.filter((b) => !versmolten.has(b)).map(mesh);
      // Bouwweergave zonder aanklikbare delen: één vorm per materiaal (veel minder tekenopdrachten, zelfde beeld).
      for (const m of !opties.zetel && !opties.opKlik && opties.samenvoegen !== false ? voegSamen(los) : los) groep.add(m);
      if (echt) groep.add(echt);
      schaduwOpnieuw();
      zetContactschaduw(s, echt);
      const toestand: EchtToestand = !s.echt ? 'geen' : weergave.echtModel === false ? 'benadering' : echt ? 'getoond' : echteModellen.get(s.echt.bestand) === 'laden' ? 'laden' : 'fout';
      opties.opEcht?.(echt ? s.echt! : null, toestand);
      const nieuw = s.kader;
      const veranderd = Math.abs(nieuw.b - kader.b) > 1 || Math.abs(nieuw.d - kader.d) > 1 || Math.abs(nieuw.x - kader.x) > 1 || Math.abs(nieuw.z - kader.z) > 1;
      kader = nieuw;
      zetMaten();
      zetMarkering();
      doel = new THREE.Vector3(kader.x + kader.b / 2, Math.min(Math.max(40, kader.h * 0.35), kader.h / 2), kader.z + kader.d / 2);
      const grootte = Math.max(kader.b, kader.d, 120);
      zetZon();
      vul.position.set(doel.x + grootte, grootte * 0.6, doel.z - grootte);
      // Andere zetel of andere maat: terug naar het geheel (een lopende beweging of verschuiving zou ernaast mikken).
      if (veranderd) { stopBeweging(); schuif.set(0, 0, 0); afstand = Math.max(200, grootte * 1.5); }
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
      // De schaduwkaart past zich zelf aan de nieuwe maat aan (WebGPURenderer).
      zon.shadow.mapSize.set(maat, maat);
      schaduwOpnieuw();
      viewer.formaat();
    },
    foto(o = {}) {
      // Even renderen op hoge resolutie (3× of minstens 2400 px breed, of de gevraagde breedte), beeld nemen, terugzetten.
      try {
        stopBeweging(true);
        const oud = renderer.getPixelRatio();
        const b = houder.clientWidth || 600;
        renderer.setPixelRatio(Math.min(o.breedte ? o.breedte / b : Math.max(3, 2400 / b), maxBreedte() / b));
        viewer.formaat();
        render(true);
        const url = renderer.domElement.toDataURL(o.type ?? 'image/png', o.kwaliteit);
        renderer.setPixelRatio(oud);
        viewer.formaat();
        return url;
      } catch {
        return null;
      }
    },
    async fotoRealistisch({ stappen, breedte = 1800, opVoortgang, signaal, opMethode }) {
      const oudMist = scene.fog, oudContact = contact.visible, oudIntensiteit = scene.environmentIntensity;
      const oudMaten = matenGroep.visible, oudKader = markeerKader?.visible;
      stopBeweging(true);
      bezigMetFoto = true;
      let glRenderer: any = null, pt: any = null;
      try {
        // De path tracer kent geen mist, geen hemellicht en geen schaduwvlak (hij rekent echte contactschaduw).
        scene.fog = null;
        contact.visible = false;
        // Maatlijnen en het selectiekader horen niet op de foto.
        matenGroep.visible = false;
        if (markeerKader) markeerKader.visible = false;
        scene.environmentIntensity = lichtNu().omgevingFoto * 1.15;
        // Geen gebakken schaduw in de hoekpunten: de path tracer rekent de echte; en hij leest ze verkeerd (zwart).
        for (const m of materialen.values()) if (m?.vertexColors) { m.vertexColors = false; m.userData.vcTerug = true; }
        const b = houder.clientWidth || 600;
        // Eerst WebGPU met ontruiser (proef 04-11): veel minder stappen nodig. Lukt het niet, dan de WebGL-path tracer.
        let webgpuReden: string | undefined;
        if (await heeftWebGPU()) {
          try {
            opMethode?.('webgpu');
            const w = Math.round(Math.min(breedte, maxBreedte())), h = Math.round((w * (houder.clientHeight || b * 0.62)) / b);
            return await fotoWebGPU({ scene, camera, breedte: w, hoogte: h, stappen: Math.max(8, Math.round(stappen / 3)), belichting: renderer.toneMappingExposure, opVoortgang, signaal });
          } catch (fout) {
            console.warn('Fotomodus op WebGPU niet gelukt, verder met WebGL:', fout);
            webgpuReden = String((fout as Error)?.message ?? fout).slice(0, 160);
          }
        }
        opMethode?.('webgl', webgpuReden);
        // Zonder WebGPU: de WebGL-path tracer op een eigen, tijdelijke WebGLRenderer (de weergave zelf is een
        // WebGPURenderer, ook als die op WebGL2 draait), met dezelfde scène en camera.
        const w = Math.round(Math.min(breedte, maxBreedte())), h = Math.round((w * (houder.clientHeight || b * 0.62)) / b);
        glRenderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
        glRenderer.setPixelRatio(1);
        glRenderer.setSize(w, h, false);
        glRenderer.toneMapping = renderer.toneMapping;
        glRenderer.toneMappingExposure = renderer.toneMappingExposure;
        pt = new WebGLPathTracer(glRenderer);
        pt.renderDelay = 0; pt.fadeDuration = 0; pt.minSamples = 1; pt.bounces = 5; pt.filterGlossyFactor = 0.5;
        pt.tiles.set(2, 2);
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
        return glRenderer.domElement.toDataURL('image/png');
      } catch (fout) {
        console.error('Fotomodus mislukt:', fout);
        return null;
      } finally {
        pt?.dispose?.();
        glRenderer?.dispose();
        bezigMetFoto = false;
        for (const m of materialen.values()) if (m?.userData?.vcTerug) { m.vertexColors = true; delete m.userData.vcTerug; m.needsUpdate = true; }
        scene.fog = oudMist;
        contact.visible = oudContact;
        matenGroep.visible = oudMaten;
        if (markeerKader && oudKader !== undefined) markeerKader.visible = oudKader;
        scene.environmentIntensity = oudIntensiteit;
        render(true);
      }
    },
    beeld(type = 'image/png', kwaliteit = 0.92) {
      try {
        stopBeweging(true);
        render(true);
        return renderer.domElement.toDataURL(type, kwaliteit);
      } catch {
        return null;
      }
    },
    standpunt(naam) {
      const naar: Stand = { hoekH, hoekV, afstand: Math.max(200, Math.max(kader.b, kader.d, 120) * 1.5) * lensFactor() };
      if (naam === 'voor') { naar.hoekH = 0; naar.hoekV = 0.12; }
      if (naam === 'boven') { naar.hoekH = 0; naar.hoekV = 1.45; }
      if (naam === 'zij') { naar.hoekH = Math.PI / 2; naar.hoekV = 0.15; }
      if (naam === 'schuin') { naar.hoekH = -0.6; naar.hoekV = 0.42; }
      if (naam === 'achter') { naar.hoekH = Math.PI + 0.5; naar.hoekV = 0.3; }
      // Ooghoogte: recht van voren, zoals een staande klant (camera op 155 cm), iets dichterbij.
      if (naam === 'ooghoogte') { naar.hoekH = -0.25; naar.afstand *= 0.85; naar.hoekV = Math.asin(Math.max(-0.2, Math.min(0.95, (155 - doel.y) / naar.afstand))); }
      // Glijdend naar het standpunt (en terug naar het midden als het beeld verschoven was).
      vliegNaar(naar);
    },
    kijk(s) {
      stopBeweging();
      if (s.hoekH !== undefined) hoekH = s.hoekH;
      if (s.hoekV !== undefined) hoekV = s.hoekV;
      if (s.afstand !== undefined) afstand = Math.min(2500, Math.max(120, s.afstand));
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
      renderer.toneMappingExposure = Math.pow(2, weergave.helderheid) * lichtNu().belichting;
      if (weergave.zonRichting !== oud.zonRichting) zetZon();
      if (weergave.maten !== oud.maten) zetMaten();
      if (((weergave.echtModel !== false) !== (oud.echtModel !== false) || weergave.vormen !== oud.vormen) && laatsteScene) viewer.toon(laatsteScene);
      if (weergave.draaien && !draaiLoopt) requestAnimationFrame(draaiLus);
      const decorAnders = (['vloer', 'muur', 'tapijt', 'spullen'] as const).some((k) => weergave[k] !== oud[k]) || !Object.keys(w).length;
      if (decorAnders) {
        // Kleurkiezers geven veel tussenwaarden: het decor pas na een korte rust herbouwen.
        clearTimeout(decorGepland);
        decorBezig = true;
        decorGepland = window.setTimeout(() => { decorBezig = false; zetDecor(null); render(); }, 120);
      }
      plaatsCamera();
    },
    markeer(id) {
      markeerId = id;
      zetMarkering();
      render(true);
    },
    async stil() {
      const pauze = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const bezig = () => !klaar || ladend > 0 || zachtBezig || decorBezig || [...echteModellen.values()].includes('laden');
      // Hoogstens een minuut: een bestand dat nooit binnenkomt mag het gereedschap niet laten hangen.
      for (const start = performance.now(); bezig() && performance.now() - start < 60000;) await pauze(25);
      stopBeweging(true);
      schaduwLater.forEach(clearTimeout);
      schaduwLater = [];
      cancelAnimationFrame(beeldGepland);
      beeldGepland = 0;
      annuleerMooi();
      // Shaders van nieuwe delen worden op de achtergrond gemaakt: eerst allemaal klaar, dan pas het definitieve beeld.
      try { await renderer.compileAsync?.(scene, camera); } catch { /* dan tekent de eerste beurt hieronder ze mee */ }
      for (let i = 0; i < 2; i++) {
        if (zonSchaduw) zonSchaduw.needsUpdate = true;
        tekenNu(true);
        await pauze(0);
      }
    },
    info() {
      const i = renderer.info ?? {};
      return {
        weg: webgpu ? 'webgpu' : 'webgl2',
        tekenbeurten: telling.tekenbeurten,
        driehoeken: telling.driehoeken,
        geometrieen: i.memory?.geometries ?? 0,
        texturen: i.memory?.textures ?? 0,
        onderdelen: groep.children.length,
      };
    },
    formaat() {
      const b = houder.clientWidth || 600;
      laatsteBreedte = b;
      // In het groot scherm de beschikbare hoogte benutten (naast de knoppen eronder), anders 62 % van de breedte.
      const groot = document.body.classList.contains('heeft-groot-scherm');
      const h = groot ? Math.max(320, Math.min(Math.round(b * 1.1), window.innerHeight - 200)) : Math.round(b * 0.62);
      // De grootte alleen opnieuw instellen als ze verandert. Elke setSize, ook met dezelfde maat, laat three.js het
      // canvas opnieuw aan de grafische kaart koppelen. Dat gebeurde bij elke aanpassing en bij elk model dat je opende;
      // in Safari (WebGPU) bleef het scherm daarna het oude beeld tonen tot je het venster van grootte veranderde
      // (melding van Jonas, 11/11). Chrome en de WebGL2-weg hadden er geen last van.
      const verplaatst = wasVerborgen || houder.parentElement !== laatsteOuder;
      if (b !== maatNu.b || h !== maatNu.h) renderer.setSize(b, h);
      // Was het canvas verborgen (een ander scherm van de demo) of verhuisd (tabblad 3D ↔ voorbeeld naast de tekening),
      // dan één keer echt van grootte veranderen en terug: dat doet hetzelfde als het venster even groter maken.
      else if (verplaatst && webgpu && klaar) { renderer.setSize(b, h + 1, false); renderer.setSize(b, h); }
      maatNu = { b, h };
      laatsteOuder = houder.parentElement;
      wasVerborgen = false;
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
    if (!houder.clientWidth) wasVerborgen = true;
    if (gepland || !houder.clientWidth || houder.clientWidth === laatsteBreedte) return;
    gepland = requestAnimationFrame(() => { gepland = 0; viewer.formaat(); });
  }).observe(houder);
  viewer.formaat();
  // WebGPURenderer start asynchroon: pas daarna tekenen (de eerste toon() wacht tot hier).
  renderer.init().then(() => {
    klaar = true;
    webgpu = webgpu && renderer.backend?.isWebGPUBackend === true;
    renderer.domElement.dataset.backend = webgpu ? 'webgpu' : 'webgl2';
    schaduwOpnieuw();
    viewer.formaat();
    render(true);
  }).catch((fout: unknown) => {
    console.error('3D kon niet starten:', fout);
    houder.textContent = '3D kon niet starten in deze browser.';
  });
  return viewer;
}
