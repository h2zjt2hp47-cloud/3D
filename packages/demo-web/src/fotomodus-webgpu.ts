/**
 * Fotomodus op WebGPU (proef 04-11): de path tracer van three-gpu-pathtracer in zijn WebGPU-versie, met de ontruiser
 * Open Image Denoise (oidn-webgpu). Met de ontruiser volstaan veel minder stappen voor een beeld zonder korrel.
 *
 * Werkt op een eigen, verborgen canvas met een WebGPURenderer, op dezelfde scène en camera als de gewone weergave
 * (three.js deelt één kern tussen WebGL en WebGPU, dus de objecten passen in beide). De gewichten van de ontruiser zitten
 * als base64 in de pagina (window.__ONTRUISER, zie ontruiser/BRON.md): geen fetch, zoals de rest van de demo.
 *
 * Gooit een fout als iets niet lukt (geen WebGPU, gewichten ontbreken, leeg beeld): de weergave valt dan terug op de
 * WebGL-fotomodus.
 */
import { NeutralToneMapping, SRGBColorSpace, WebGPURenderer } from 'three/webgpu';
import { OIDNDenoiser, TRANSMISSIVE_BACKGROUND_ENVIRONMENT, WebGPUPathTracer } from 'three-gpu-pathtracer/webgpu';
import { initUNetFromBuffer } from 'oidn-webgpu';

export interface FotoWebGPUOpties {
  scene: unknown;
  camera: unknown;
  /** Breedte en hoogte van de foto in pixels. */
  breedte: number;
  hoogte: number;
  /** Aantal stappen per pixel; met de ontruiser zijn er veel minder nodig dan zonder. */
  stappen: number;
  belichting: number;
  opVoortgang?: (deel: number) => void;
  signaal?: AbortSignal;
  /** Hoe lang de path tracer mag rekenen (ms) voor de ontruiser begint. */
  maxTijd?: number;
}

/** Of deze browser WebGPU heeft (een echte adapter, geen lege navigator.gpu). */
export async function heeftWebGPU(): Promise<boolean> {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

function gewichten(): ArrayBuffer | null {
  const b64 = (window as unknown as { __ONTRUISER?: string }).__ONTRUISER;
  if (!b64) return null;
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** Is het beeld leeg (één kleur)? Dan is het lezen van het canvas mislukt. */
function isLeeg(canvas: HTMLCanvasElement): boolean {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const g = c.getContext('2d')!;
  g.drawImage(canvas, 0, 0, 32, 32);
  const d = g.getImageData(0, 0, 32, 32).data;
  let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) { const v = d[i]! + d[i + 1]! + d[i + 2]!; min = Math.min(min, v); max = Math.max(max, v); }
  return max - min < 6;
}

const wacht = () => new Promise((r) => requestAnimationFrame(r));

/** Rekent een foto en geeft ze als PNG (data-URL), of null als ze afgebroken werd. */
export async function fotoWebGPU(o: FotoWebGPUOpties): Promise<string | null> {
  const buffer = gewichten();
  if (!buffer) throw new Error('De gewichten van de ontruiser ontbreken in de pagina.');
  const canvas = document.createElement('canvas');
  canvas.width = o.breedte;
  canvas.height = o.hoogte;
  const renderer = new WebGPURenderer({ canvas, antialias: false, alpha: false });
  let pt: InstanceType<typeof WebGPUPathTracer> | null = null;
  try {
    await renderer.init();
    if (!(renderer as unknown as { backend: { isWebGPUBackend?: boolean } }).backend.isWebGPUBackend) throw new Error('Geen WebGPU (de renderer viel terug op WebGL).');
    renderer.setPixelRatio(1);
    renderer.setSize(o.breedte, o.hoogte, false);
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = o.belichting;
    renderer.outputColorSpace = SRGBColorSpace;

    pt = new WebGPUPathTracer(renderer);
    pt.renderDelay = 0;
    pt.fadeDuration = 0;
    pt.minSamples = 1;
    pt.dynamicLowRes = false;
    pt.maxBounces = 6;
    pt.filterGlossyFactor = 0.5;
    pt.transmissiveBackground = TRANSMISSIVE_BACKGROUND_ENVIRONMENT;
    pt.maxSamples = o.stappen;
    // De ontruiser leest de gewichten uit de pagina in plaats van van een adres.
    const ontruiser = new OIDNDenoiser({
      initUNetFromURL: (_adres: string, backend: unknown, opties: unknown) => initUNetFromBuffer(buffer, backend as never, opties as never),
      auxWeightsUrl: 'ingesloten',
    });
    let ontruiserFout: unknown = null;
    ontruiser.addEventListener('error', (e: { error?: unknown }) => { ontruiserFout = e.error ?? new Error('ontruiser'); });
    pt.setDenoiser(ontruiser);
    let deel = 0;
    pt.addEventListener('progress', (e: { stage?: string; progress?: number | null }) => {
      if (e.stage === 'rendering' && typeof e.progress === 'number') deel = 0.85 * e.progress;
      if (e.stage === 'denoising' && typeof e.progress === 'number') deel = 0.85 + 0.15 * e.progress;
      o.opVoortgang?.(Math.min(1, deel));
    });
    await wacht();
    pt.setScene(o.scene, o.camera);

    const start = performance.now(), maxTijd = o.maxTijd ?? 60000;
    while (!pt.complete) {
      if (o.signaal?.aborted) return null;
      if (ontruiserFout) throw ontruiserFout;
      // Na de maximale rekentijd: niet meer bijrekenen; de ontruiser werkt met wat er is.
      if (performance.now() - start > maxTijd && pt.maxSamples > 1) pt.maxSamples = 1;
      if (performance.now() - start > maxTijd * 2) throw new Error('De fotomodus op WebGPU werd niet klaar.');
      await wacht();
      pt.renderSample();
    }
    // Het beeld lezen in dezelfde taak als het tekenen (daarna is een WebGPU-canvas niet meer leesbaar).
    pt.renderSample();
    if (isLeeg(canvas)) throw new Error('Het beeld van de fotomodus op WebGPU is leeg.');
    o.opVoortgang?.(1);
    return canvas.toDataURL('image/png');
  } finally {
    pt?.dispose();
    renderer.dispose();
  }
}
