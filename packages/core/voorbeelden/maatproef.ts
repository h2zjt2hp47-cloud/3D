/**
 * Nagebootste maatproef voor "zetel in eigen kamer" (analyse 06-11, bewijs 1).
 *
 * Dit is NIET de echte maatproef: die vraagt foto's van echte kamers met een doos van gekende maat en een A4. Hier
 * rekenen we 3 kamers na met een gekende camera, en bootsen we na wat in een echte foto fout kan gaan:
 *  - klikfouten: de gebruiker klikt de hoeken aan op een foto die op het scherm ±1000 px breed staat (met vergrootglas);
 *  - een lichte lensvervorming van een gsm (tonvorm), die de app niet kent.
 * Daarna "meet" de app de doos: de twee onderste voorhoeken op de vloer (breedte) en de bovenhoek erboven (hoogte),
 * zoals in de app met een proefdoos of de meetknop. Doel van de analyse: hoogstens 5 % fout in breedte en hoogte.
 *
 * Gebruik: npx tsx packages/core/voorbeelden/maatproef.ts
 */
import { cameraVan, hoogteBoven, kalibreer, projecteer, vloerpunt, afstand, type KalibratieOpties, type Kamercamera, type Punt2, type Vec3 } from '../src/kamerfoto.js';

/** Vaste toevalsreeks (Park-Miller) en normaal verdeelde ruis (Box-Muller). */
function reeks(zaad: number) {
  let s = zaad;
  const u = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return { u, normaal: () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u()) };
}

/** Rechthoek op de vloer (hoek, draaiing in graden, maat), hoeken rond de omtrek. */
function rechthoek(x: number, z: number, graden: number, b: number, d: number): Vec3[] {
  const a = (graden * Math.PI) / 180, e1: Vec3 = [Math.cos(a), 0, Math.sin(a)], e2: Vec3 = [-Math.sin(a), 0, Math.cos(a)];
  const p = (u: number, v: number): Vec3 => [x + e1[0] * u + e2[0] * v, 0, z + e1[2] * u + e2[2] * v];
  return [p(0, 0), p(b, 0), p(b, d), p(0, d)];
}

/** Tonvormige vervorming (k1 < 0) rond het midden van de foto, zoals een gsm-lens die niet helemaal gecorrigeerd is. */
function vervorm(cam: Kamercamera, q: Punt2, k1: number): Punt2 {
  const h = Math.hypot(cam.breedte, cam.hoogte) / 2;
  const x = (q.x - cam.breedte / 2) / h, y = (q.y - cam.hoogte / 2) / h, r2 = x * x + y * y, f = 1 + k1 * r2;
  return { x: cam.breedte / 2 + x * f * h, y: cam.hoogte / 2 + y * f * h };
}

interface Kamer {
  naam: string;
  cam: { positie: Vec3; doel: Vec3; mm: number; breedte: number; hoogte: number; rol?: number };
  /** Plaats van het maatvoorwerp: midden van het A4 (x, z) en draaiing in graden. */
  plek: [number, number, number];
  /** Doos: hoek linksvoor op de vloer, draaiing, maat. */
  doos: { x: number; z: number; graden: number; b: number; d: number; h: number };
}

// Drie kamers zoals een klant ze fotografeert: rechtstaand of zittend, gsm-hoofdcamera (24–26 mm), liggend of staand.
const KAMERS: Kamer[] = [
  {
    naam: 'Kamer 1: woonkamer, staand (150 cm), 26 mm, liggende foto, maatvoorwerp op ±2,6 m',
    cam: { positie: [0, 150, 330], doel: [10, 0, 0], mm: 26, breedte: 4032, hoogte: 3024 },
    plek: [-25, 70, 8],
    doos: { x: 10, z: 40, graden: 3, b: 60, d: 40, h: 40 },
  },
  {
    naam: 'Kamer 2: lege hoek, staand (165 cm), 24 mm, staande foto, maatvoorwerp schuin op ±3 m',
    cam: { positie: [-80, 165, 340], doel: [40, 0, 20], mm: 24, breedte: 3024, hoogte: 4032, rol: 0.02 },
    plek: [35, 60, -30],
    doos: { x: 60, z: 10, graden: -25, b: 50, d: 35, h: 35 },
  },
  {
    naam: 'Kamer 3: slaapkamer, zittend (120 cm), 26 mm, liggende foto, 3° scheef, maatvoorwerp op ±1,8 m',
    cam: { positie: [30, 120, 230], doel: [0, 0, 20], mm: 26, breedte: 4032, hoogte: 3024, rol: 0.05 },
    plek: [-35, 80, 15],
    doos: { x: 0, z: 50, graden: 10, b: 40, d: 30, h: 30 },
  },
];

const VOORWERPEN = [
  { naam: 'A4 (29,7 × 21)', b: 29.7, d: 21 },
  { naam: 'vloertegel 60 × 60', b: 60, d: 60 },
  { naam: 'tapijt 200 × 140', b: 200, d: 140 },
];
const METHODES: { naam: string; opties: KalibratieOpties }[] = [
  { naam: 'regel van de analyse (lens schatten, anders 28 mm)', opties: { voorkennis: null } },
  { naam: 'app (voorkennis: rechtop ±3°, lens rond 28 mm; eerst langs de lange zijde geklikt)', opties: { eersteZijdeB: true } },
];
const KLIKKEN = [
  { naam: 'zorgvuldig (±0,75 px op het scherm, met vergrootglas)', px: 0.75, k1: 0 },
  { naam: 'gewoon (±2 px op het scherm) en een lichte tonvorm van de gsm-lens', px: 2, k1: -0.02 },
];
/** Breedte van de foto op het scherm (px): klikfouten zijn schermpixels, in de foto dus groter. */
const SCHERM = 1000;
const N = 400;

function procent(waarden: number[], p: number) {
  const s = [...waarden].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
}

function proef(kamer: Kamer, voorwerp: (typeof VOORWERPEN)[number], opties: KalibratieOpties, klikPx: number, k1: number, zaad: number) {
  const r = reeks(zaad);
  const echt = cameraVan(kamer.cam);
  const fotoPx = kamer.cam.breedte / SCHERM;
  // Wat in de foto staat (met lensvervorming), en een klik met ruis daarop.
  const inFoto = (p: Vec3) => vervorm(echt, projecteer(echt, p)!, k1);
  const binnen = (q: Punt2) => q.x >= 0 && q.y >= 0 && q.x <= kamer.cam.breedte && q.y <= kamer.cam.hoogte;
  const klik = (q: Punt2): Punt2 => ({ x: q.x + r.normaal() * klikPx * fotoPx, y: q.y + r.normaal() * klikPx * fotoPx });
  const [mx, mz, graden] = kamer.plek;
  const a0 = (graden * Math.PI) / 180;
  // Hoek zo kiezen dat het midden van het voorwerp op de plek ligt.
  const hoeken = rechthoek(mx - (Math.cos(a0) * voorwerp.b - Math.sin(a0) * voorwerp.d) / 2, mz - (Math.sin(a0) * voorwerp.b + Math.cos(a0) * voorwerp.d) / 2, graden, voorwerp.b, voorwerp.d);
  if (hoeken.some((h) => { const q = projecteer(echt, h); return !q || !binnen(q); })) return null;
  const d = kamer.doos, a = (d.graden * Math.PI) / 180;
  const linksVoor: Vec3 = [d.x, 0, d.z], rechtsVoor: Vec3 = [d.x + Math.cos(a) * d.b, 0, d.z + Math.sin(a) * d.b];
  const top: Vec3 = [d.x, d.h, d.z];
  const breedteFout: number[] = [], hoogteFout: number[] = [], vlak: number[] = [];
  let standaard = 0;
  for (let i = 0; i < N; i++) {
    const punten = hoeken.map((p) => klik(inFoto(p)));
    const k = kalibreer(punten, { b: voorwerp.b, d: voorwerp.d }, kamer.cam, opties);
    // Lukt het niet, dan telt dat als een maat die helemaal fout is.
    if (typeof k === 'string') { breedteFout.push(100); hoogteFout.push(100); continue; }
    if (!k.geschat) standaard++;
    vlak.push(k.vlak);
    const lv = vloerpunt(k.camera, klik(inFoto(linksVoor))), rv = vloerpunt(k.camera, klik(inFoto(rechtsVoor)));
    if (!lv || !rv) { breedteFout.push(100); hoogteFout.push(100); continue; }
    breedteFout.push((Math.abs(afstand(lv, rv) - d.b) / d.b) * 100);
    hoogteFout.push((Math.abs(hoogteBoven(k.camera, lv, klik(inFoto(top))) - d.h) / d.h) * 100);
  }
  return { breedteFout, hoogteFout, standaard, vlak: procent(vlak, 0.5) };
}

const regels: string[] = [];
const toon = (s: string) => { regels.push(s); console.log(s); };
const f1 = (x: number) => (x >= 100 ? '≥ 100' : x.toFixed(1).replace('.', ','));
toon(`Nagebootste maatproef: ${N} keer per kamer, voorwerp, manier van klikken en rekenwijze (vaste toevalsreeks).`);
toon('Fout in % van de echte maat van de doos. Per cel: mediaan / 9 op 10 keer beter dan / deel van de keren binnen 5 %.');
for (const klik of KLIKKEN) for (const voorwerp of VOORWERPEN) {
  toon('');
  toon(`### ${voorwerp.naam}, klikken ${klik.naam}`);
  toon('| Rekenwijze | Kamer | Voorwerp in de foto | Breedte | Hoogte |');
  toon('|---|---|---|---|---|');
  for (const m of METHODES) KAMERS.forEach((kamer, i) => {
    const u = proef(kamer, voorwerp, m.opties, klik.px, klik.k1, 1000 + i);
    const kort = kamer.naam.split(':')[0];
    if (!u) { toon(`| ${m.naam.split(' (')[0]} | ${kort} | niet helemaal in beeld | – | – |`); return; }
    const binnen = (w: number[]) => `${Math.round((w.filter((x) => x <= 5).length / w.length) * 100)} %`;
    const cel = (w: number[]) => `${f1(procent(w, 0.5))} / ${f1(procent(w, 0.9))} / ${binnen(w)}`;
    toon(`| ${m.naam.split(' (')[0]} | ${kort} | ${(u.vlak * 100).toFixed(1).replace('.', ',')} % | ${cel(u.breedteFout)} | ${cel(u.hoogteFout)} |`);
  });
}
toon('');
for (const m of METHODES) toon(`- **${m.naam.split(' (')[0]}**: ${m.naam.slice(m.naam.indexOf('(') + 1, -1)}.`);
for (const k of KAMERS) toon(`- ${k.naam}; doos ${k.doos.b} × ${k.doos.d} × ${k.doos.h} cm, gemeten met twee onderhoeken (breedte) en de bovenhoek (hoogte).`);
export const UITSLAG = regels.join('\n');
