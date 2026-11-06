/**
 * Zetel in een foto van de eigen kamer (06-11, manier A uit "Analyse - zetel in eigen kamer"): de camera van een foto
 * terugvinden uit vier aangeklikte hoeken van iets rechthoekigs op de vloer met een gekende maat (een A4-blad, een
 * tapijt, een vloertegel).
 *
 * Werkwijze:
 *  1. De vier punten en hun echte maat geven een homografie (vloer in cm → foto in pixels).
 *  2. Brandpuntsafstand uit die homografie (de twee voorwaarden van een rechthoek: zijden loodrecht en de echte
 *     verhouding; hetzelfde als de twee verdwijnpunten). Buiten 18–50 mm kleinbeeld: 28 mm.
 *  3. Stand en positie van de camera uit de homografie (planar pose, zoals OpenCV `solvePnP` voor een vlak),
 *     daarna verfijnd tot de vier hoeken zo goed mogelijk terugvallen op de aangeklikte punten (Levenberg-Marquardt).
 *
 * Geen 3D-bibliotheek en geen OpenCV: alles in cm en pixels, testbaar met vitest. De weergave (three.js) zit in
 * `packages/demo-web/src/kamer.ts`.
 *
 * Assen zoals in de rest van de motor: x naar rechts, y omhoog (vloer = 0), z naar voren. De camera rekent intern zoals
 * OpenCV: x naar rechts, y naar onder, z de kijkrichting in; beeldpunten in pixels, (0, 0) linksboven.
 */

export interface Punt2 { x: number; y: number }
export type Vec3 = [number, number, number];

/** Diagonaal van een kleinbeeldnegatief (36 × 24 mm): brandpuntsafstanden in "mm kleinbeeld" zoals op een gsm. */
export const KLEINBEELD_DIAGONAAL = Math.hypot(36, 24);
/** Redelijk bereik van de lens (mm kleinbeeld); daarbuiten gebruiken we de standaard. */
export const LENS_BEREIK = { min: 18, max: 50, standaard: 28 } as const;
/**
 * Kleiner dan dit deel van de foto: het maatvoorwerp is te klein voor een goede maat ("Kies iets groters"). De analyse
 * schatte ±3 %; een A4 op 2 à 3 m beslaat maar 0,2 à 0,8 % van een gsm-foto, en de nagebootste maatproef haalt het doel
 * van 5 % vanaf ±0,5 % (zie docs/zetel-in-eigen-kamer.md).
 */
export const MIN_VLAK = 0.005;

export interface Kamercamera {
  /** Foto in pixels. */
  breedte: number;
  hoogte: number;
  /** Brandpuntsafstand in pixels (het hoofdpunt ligt in het midden van de foto). */
  f: number;
  /** Dezelfde brandpuntsafstand in mm kleinbeeld. */
  mm: number;
  /** Rotatie wereld → camera (OpenCV-assen), rij per rij. */
  R: number[];
  /** Verschuiving wereld → camera (cm). */
  t: Vec3;
  /** Plaats van de camera in de wereld (cm); `positie[1]` = hoogte boven de vloer. */
  positie: Vec3;
}

export type KalibratieFout = 'te_weinig_punten' | 'geen_rechthoek' | 'geen_oplossing';
export type Aanwijzing =
  /** Het maatvoorwerp beslaat minder dan MIN_VLAK (0,5 %) van de foto. */
  | 'klein'
  /** De brandpuntsafstand viel buiten 18–50 mm (of was niet te bepalen): 28 mm of de lens van de gebruiker. */
  | 'standaardlens'
  /** De hoeken vallen niet goed terug op de aangeklikte punten (geen rechthoek, of niet plat op de vloer). */
  | 'onzeker';

export interface Kalibratie {
  camera: Kamercamera;
  /** De vier hoeken van het maatvoorwerp in de wereld (y = 0), in dezelfde volgorde als de beeldpunten. */
  hoeken: Vec3[];
  /** De beeldpunten in de gebruikte volgorde (rond de omtrek). */
  punten: Punt2[];
  /** Welke zijde de eerste maat kreeg: de zijde van punt 0 naar punt 1 is `maat.b` (true) of `maat.d` (false). */
  eersteZijdeB: boolean;
  /** Brandpuntsafstand uit de foto (true) of de standaard / de keuze van de gebruiker (false). */
  geschat: boolean;
  /** Gemiddelde afwijking van de teruggerekende hoeken, in pixels. */
  fout: number;
  /** Deel van de foto dat het maatvoorwerp beslaat (0–1). */
  vlak: number;
  aanwijzingen: Aanwijzing[];
}

/**
 * Wat we zonder de foto al weten, als zachte voorkeur (geen harde regel): een gsm wordt ongeveer rechtop gehouden (rol
 * met een spreiding in graden), en de lens ligt rond een verwachte waarde (spreiding als deel, 0,2 = 20 %).
 * Een A4 op 2 à 3 m is klein in de foto: zonder voorkennis geven klikfouten van een paar pixels dan vaak meer dan 5 %
 * fout (nagebootste maatproef, docs/zetel-in-eigen-kamer.md). Spreekt de foto duidelijk iets anders, dan wint de foto.
 */
export interface Voorkennis { rol?: number; mm?: { verwacht: number; spreiding: number } }
export const STANDAARD_VOORKENNIS: Voorkennis = { rol: 3, mm: { verwacht: LENS_BEREIK.standaard, spreiding: 0.2 } };

export interface KalibratieOpties {
  /** Vaste lens in mm kleinbeeld (de schuifknop "Afstand tot de foto"); leeg = schatten uit de foto. */
  mm?: number;
  /** Voorkennis; leeg = STANDAARD_VOORKENNIS, null = zonder (alleen de regel van de analyse: schatten, anders 28 mm). */
  voorkennis?: Voorkennis | null;
  /**
   * Voorkeur van de gebruiker: de zijde van punt 0 naar punt 1 is `maat.b` (true) of `maat.d` (false). De andere
   * richting kan nog, als de foto ze duidelijk beter verklaart. Leeg = geen voorkeur.
   */
  eersteZijdeB?: boolean;
}

// ---------- kleine lineaire algebra ----------

/** Stelsel A·x = b oplossen (Gauss met rijwissels); null als het stelsel (bijna) singulier is. */
export function los(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((rij, i) => [...rij, b[i]!]);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i]![k]!) > Math.abs(M[p]![k]!)) p = i;
    if (Math.abs(M[p]![k]!) < 1e-12) return null;
    [M[k], M[p]] = [M[p]!, M[k]!];
    for (let i = k + 1; i < n; i++) {
      const f = M[i]![k]! / M[k]![k]!;
      for (let j = k; j <= n; j++) M[i]![j]! -= f * M[k]![j]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i]![n]!;
    for (let j = i + 1; j < n; j++) s -= M[i]![j]! * x[j]!;
    x[i] = s / M[i]![i]!;
  }
  return x;
}

/** 3 × 3 matrices rij per rij. */
function maal(a: number[], b: number[]) {
  const c = new Array<number>(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) c[i * 3 + j]! += a[i * 3 + k]! * b[k * 3 + j]!;
  return c;
}
const kruis = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punt = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lengte = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const eenheid = (a: Vec3): Vec3 => { const l = lengte(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const plus = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const min = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const keer = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
/** Kolom j van een 3 × 3-matrix. */
const kolom = (m: number[], j: number): Vec3 => [m[j]!, m[3 + j]!, m[6 + j]!];
/** R · v en Rᵀ · v. */
const draai = (R: number[], v: Vec3): Vec3 => [R[0]! * v[0] + R[1]! * v[1] + R[2]! * v[2], R[3]! * v[0] + R[4]! * v[1] + R[5]! * v[2], R[6]! * v[0] + R[7]! * v[1] + R[8]! * v[2]];
const draaiTerug = (R: number[], v: Vec3): Vec3 => [R[0]! * v[0] + R[3]! * v[1] + R[6]! * v[2], R[1]! * v[0] + R[4]! * v[1] + R[7]! * v[2], R[2]! * v[0] + R[5]! * v[1] + R[8]! * v[2]];

/** Rotatievector (as × hoek in radialen) → rotatiematrix (Rodrigues). */
export function rotatieMatrix(w: Vec3): number[] {
  const th = lengte(w);
  if (th < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const [x, y, z] = keer(w, 1 / th), c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  return [
    c + x * x * C, x * y * C - z * s, x * z * C + y * s,
    y * x * C + z * s, c + y * y * C, y * z * C - x * s,
    z * x * C - y * s, z * y * C + x * s, c + z * z * C,
  ];
}
/** Rotatiematrix → rotatievector. */
export function rotatieVector(R: number[]): Vec3 {
  const c = Math.max(-1, Math.min(1, (R[0]! + R[4]! + R[8]! - 1) / 2));
  const th = Math.acos(c);
  if (th < 1e-9) return [0, 0, 0];
  if (Math.PI - th < 1e-6) {
    // 180°: as uit de diagonaal.
    const x = Math.sqrt(Math.max(0, (R[0]! + 1) / 2)), y = Math.sqrt(Math.max(0, (R[4]! + 1) / 2)) * (R[1]! >= 0 ? 1 : -1), z = Math.sqrt(Math.max(0, (R[8]! + 1) / 2)) * (R[2]! >= 0 ? 1 : -1);
    return keer(eenheid([x, y, z]), th);
  }
  const k = th / (2 * Math.sin(th));
  return [(R[7]! - R[5]!) * k, (R[2]! - R[6]!) * k, (R[3]! - R[1]!) * k];
}

// ---------- homografie ----------

/** Normalisatie (Hartley): zwaartepunt in de oorsprong, gemiddelde afstand √2. */
function normalisatie(p: Punt2[]) {
  const cx = p.reduce((s, q) => s + q.x, 0) / p.length, cy = p.reduce((s, q) => s + q.y, 0) / p.length;
  const d = p.reduce((s, q) => s + Math.hypot(q.x - cx, q.y - cy), 0) / p.length || 1;
  const s = Math.SQRT2 / d;
  return { T: [s, 0, -s * cx, 0, s, -s * cy, 0, 0, 1], Tinv: [1 / s, 0, cx, 0, 1 / s, cy, 0, 0, 1] };
}

/**
 * Homografie uit vier puntparen: `naar ≅ H · van` (homogeen). H rij per rij met H[8] = 1; null bij drie punten op een
 * lijn.
 */
export function homografie(van: Punt2[], naar: Punt2[]): number[] | null {
  if (van.length !== 4 || naar.length !== 4) return null;
  const nv = normalisatie(van), nn = normalisatie(naar);
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p = van[i]!, q = naar[i]!;
    const x = nv.T[0]! * p.x + nv.T[2]!, y = nv.T[4]! * p.y + nv.T[5]!;
    const u = nn.T[0]! * q.x + nn.T[2]!, v = nn.T[4]! * q.y + nn.T[5]!;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = los(A, b);
  if (!h) return null;
  const H = maal(nn.Tinv, maal([...h, 1], nv.T));
  if (Math.abs(H[8]!) < 1e-15) return null;
  return H.map((x) => x / H[8]!);
}

/**
 * Brandpuntsafstand (px) uit een homografie vloer → foto, met het hoofdpunt in (cx, cy). Twee voorwaarden in w = 1/f²:
 * de twee richtingen op de vloer staan loodrecht, en ze zijn even lang (de maat in cm is gekend). Kleinste kwadraten;
 * null als f niet te bepalen is (bv. recht van boven gefotografeerd) of geen echte oplossing heeft.
 */
export function brandpuntUitHomografie(H: number[], cx: number, cy: number, schaal = 1): number | null {
  // Naar beeldcoördinaten rond het hoofdpunt, geschaald (getallen van dezelfde grootte).
  const T = [1 / schaal, 0, -cx / schaal, 0, 1 / schaal, -cy / schaal, 0, 0, 1];
  const G = maal(T, H);
  const [a, b, c] = kolom(G, 0), [d, e, g] = kolom(G, 1);
  const A1 = a * d + b * e, B1 = c * g;
  const A2 = a * a + b * b - d * d - e * e, B2 = c * c - g * g;
  const noemer = A1 * A1 + A2 * A2;
  if (!(noemer > 0)) return null;
  // Zonder perspectief (c en g nul, recht van boven) is w = 0: f is dan niet te bepalen.
  const w = -(A1 * B1 + A2 * B2) / noemer;
  if (!(w > 0) || !Number.isFinite(w)) return null;
  return schaal / Math.sqrt(w);
}

export const mmNaarPx = (mm: number, breedte: number, hoogte: number) => (mm * Math.hypot(breedte, hoogte)) / KLEINBEELD_DIAGONAAL;
export const pxNaarMm = (f: number, breedte: number, hoogte: number) => (f * KLEINBEELD_DIAGONAAL) / Math.hypot(breedte, hoogte);

// ---------- camera ----------

/** Beeldpunt van een wereldpunt; null als het punt achter de camera ligt. */
export function projecteer(cam: Kamercamera, p: Vec3): Punt2 | null {
  const q = plus(draai(cam.R, p), cam.t);
  if (q[2] <= 1e-6) return null;
  return { x: cam.breedte / 2 + (cam.f * q[0]) / q[2], y: cam.hoogte / 2 + (cam.f * q[1]) / q[2] };
}

/** Richting in de wereld van de straal door een beeldpunt (vanuit `cam.positie`). */
export function straal(cam: Kamercamera, q: Punt2): Vec3 {
  return eenheid(draaiTerug(cam.R, [(q.x - cam.breedte / 2) / cam.f, (q.y - cam.hoogte / 2) / cam.f, 1]));
}

/** Punt op de vloer (y = 0) onder een beeldpunt; null boven de horizon. */
export function vloerpunt(cam: Kamercamera, q: Punt2): Vec3 | null {
  const r = straal(cam, q);
  if (r[1] >= -1e-9) return null;
  const s = -cam.positie[1] / r[1];
  if (!(s > 0)) return null;
  return [cam.positie[0] + r[0] * s, 0, cam.positie[2] + r[2] * s];
}

/**
 * Hoogte (cm) van een punt recht boven een vloerpunt, uit het beeldpunt van dat hoger gelegen punt (bv. de bovenhoek
 * van een doos boven de onderhoek). Kleinste kwadraten langs de verticale lijn in het beeld.
 */
export function hoogteBoven(cam: Kamercamera, voet: Vec3, top: Punt2): number {
  // P(h) = K (R (voet + h·y) + t) = a + h·b (homogeen); u(h) = a₀ + h b₀ / (a₂ + h b₂) enz.
  const K = (v: Vec3): Vec3 => [cam.f * v[0] + (cam.breedte / 2) * v[2], cam.f * v[1] + (cam.hoogte / 2) * v[2], v[2]];
  const a = K(plus(draai(cam.R, voet), cam.t)), b = K(kolom(cam.R, 1));
  let teller = 0, noemer = 0;
  for (const [i, q] of [[0, top.x], [1, top.y]] as const) {
    const c = b[i] - q * b[2], d = q * a[2] - a[i];
    teller += c * d;
    noemer += c * c;
  }
  return noemer > 0 ? teller / noemer : 0;
}

/** Afstand tussen twee wereldpunten (cm). */
export const afstand = (a: Vec3, b: Vec3) => lengte(min(a, b));

/** Camera samenstellen uit R, t en f. */
function camera(R: number[], t: Vec3, f: number, breedte: number, hoogte: number): Kamercamera {
  return { breedte, hoogte, f, mm: pxNaarMm(f, breedte, hoogte), R, t, positie: keer(draaiTerug(R, t), -1) };
}

/**
 * Assen van de camera in de wereld zoals three.js ze verwacht (x rechts, y omhoog, kijken langs −z), en de verticale
 * kijkhoek in graden. Voor `camera.matrix.makeBasis(rechts, boven, achter).setPosition(positie)`.
 */
export function cameraAssen(cam: Kamercamera) {
  const R = cam.R;
  return {
    rechts: [R[0]!, R[1]!, R[2]!] as Vec3,
    boven: [-R[3]!, -R[4]!, -R[5]!] as Vec3,
    achter: [-R[6]!, -R[7]!, -R[8]!] as Vec3,
    positie: cam.positie,
    kijkhoek: (2 * Math.atan(cam.hoogte / 2 / cam.f) * 180) / Math.PI,
  };
}

/**
 * Stand uit de homografie bij een gekende f: [r1 r2 t] = λ K⁻¹ H, r1 en r2 recht gezet tot loodrechte eenheidsvectoren.
 * De vloerrichtingen zijn x (r1) en z (r2); y = z × x (rechtshandig, omhoog). Null als de vloer achter de camera zou
 * liggen.
 */
function standUitHomografie(H: number[], f: number, breedte: number, hoogte: number) {
  const Kinv = [1 / f, 0, -breedte / 2 / f, 0, 1 / f, -hoogte / 2 / f, 0, 0, 1];
  const M = maal(Kinv, H);
  let m1 = kolom(M, 0), m2 = kolom(M, 1), m3 = kolom(M, 2);
  const l = 2 / (lengte(m1) + lengte(m2));
  if (!Number.isFinite(l)) return null;
  m1 = keer(m1, l); m2 = keer(m2, l); m3 = keer(m3, l);
  // De vloer ligt voor de camera: z > 0.
  if (m3[2] < 0) { m1 = keer(m1, -1); m2 = keer(m2, -1); m3 = keer(m3, -1); }
  // Loodrecht zetten, symmetrisch rond de bissectrice.
  const a = eenheid(m1), b = eenheid(m2), c = eenheid(plus(a, b)), d = eenheid(kruis(eenheid(kruis(a, b)), c));
  const r1 = eenheid(min(c, d)), r2 = eenheid(plus(c, d));
  const ry = kruis(r2, r1);
  const R = [r1[0], ry[0], r2[0], r1[1], ry[1], r2[1], r1[2], ry[2], r2[2]];
  return { R, t: m3 };
}

/**
 * Verfijnen (Levenberg-Marquardt): stand (rotatievector + verschuiving) en eventueel f, zodat de wereldpunten zo goed
 * mogelijk op de beeldpunten vallen.
 */
type Extra = (R: number[], t: Vec3, f: number) => number[];
function verfijn(R0: number[], t0: Vec3, f0: number, wereld: Vec3[], beeld: Punt2[], breedte: number, hoogte: number, fVrij: boolean, extra?: Extra) {
  const n = fVrij ? 7 : 6;
  const pars = (p: number[]) => ({ R: rotatieMatrix([p[0]!, p[1]!, p[2]!]), t: [p[3]!, p[4]!, p[5]!] as Vec3, f: fVrij ? f0 * Math.exp(p[6]!) : f0 });
  const resten = (p: number[]) => {
    const { R, t, f } = pars(p), r: number[] = [];
    for (let i = 0; i < wereld.length; i++) {
      const q = plus(draai(R, wereld[i]!), t);
      const z = Math.max(q[2], 1e-6);
      r.push(breedte / 2 + (f * q[0]) / z - beeld[i]!.x, hoogte / 2 + (f * q[1]) / z - beeld[i]!.y);
    }
    if (extra) r.push(...extra(R, t, f));
    return r;
  };
  const som = (r: number[]) => r.reduce((s, x) => s + x * x, 0);
  let p = [...rotatieVector(R0), ...t0, ...(fVrij ? [0] : [])];
  let r = resten(p), e = som(r), lambda = 1e-3;
  const schaalT = Math.max(1, lengte(t0));
  for (let it = 0; it < 100 && e > 1e-14; it++) {
    // Jacobiaan met kleine stappen (rotatie in radialen, verschuiving in cm, f in log).
    const J: number[][] = r.map(() => new Array<number>(n).fill(0));
    for (let k = 0; k < n; k++) {
      const h = k < 3 ? 1e-6 : k < 6 ? 1e-6 * schaalT : 1e-6;
      const q = [...p]; q[k]! += h;
      const rq = resten(q);
      for (let i = 0; i < r.length; i++) J[i]![k] = (rq[i]! - r[i]!) / h;
    }
    const JtJ = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => J.reduce((s, rij) => s + rij[a]! * rij[b]!, 0)));
    const Jtr = Array.from({ length: n }, (_, a) => J.reduce((s, rij, i) => s + rij[a]! * r[i]!, 0));
    let beter = false;
    for (let poging = 0; poging < 10; poging++) {
      const A = JtJ.map((rij, a) => rij.map((x, b) => (a === b ? x * (1 + lambda) + 1e-12 : x)));
      const stap = los(A, Jtr.map((x) => -x));
      if (!stap) { lambda *= 10; continue; }
      const q = p.map((x, k) => x + stap[k]!);
      const rq = resten(q), eq = som(rq);
      if (eq < e) {
        const klein = Math.max(...stap.map(Math.abs)) < 1e-10;
        p = q; r = rq; e = eq; lambda = Math.max(lambda / 10, 1e-9); beter = true;
        if (klein) it = 1000;
        break;
      }
      lambda *= 10;
    }
    if (!beter) break;
  }
  const { R, t, f } = pars(p);
  const rp = resten(p).slice(0, wereld.length * 2);
  return { R, t, f, fout: Math.sqrt(som(rp) / wereld.length), kost: e };
}

/** Oppervlakte (met teken) van een veelhoek in het beeld. */
function oppervlakte(p: Punt2[]) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i]!, b = p[(i + 1) % p.length]!; s += a.x * b.y - b.x * a.y; }
  return s / 2;
}
function isBol(p: Punt2[]) {
  let teken = 0;
  for (let i = 0; i < 4; i++) {
    const a = p[i]!, b = p[(i + 1) % 4]!, c = p[(i + 2) % 4]!;
    const k = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(k) < 1e-9) return false;
    if (teken && Math.sign(k) !== teken) return false;
    teken = Math.sign(k);
  }
  return true;
}
/**
 * De vier punten rond de omtrek: de volgorde van de gebruiker als die al rond loopt, anders gesorteerd rond het
 * zwaartepunt (beginnend bij het eerste punt). Null als er geen bolle vierhoek van te maken is.
 */
export function rondDeOmtrek(p: Punt2[]): Punt2[] | null {
  if (p.length !== 4) return null;
  if (isBol(p)) return p;
  const cx = (p[0]!.x + p[1]!.x + p[2]!.x + p[3]!.x) / 4, cy = (p[0]!.y + p[1]!.y + p[2]!.y + p[3]!.y) / 4;
  const hoek = (q: Punt2) => Math.atan2(q.y - cy, q.x - cx);
  const h0 = hoek(p[0]!);
  const gesorteerd = [...p].sort((a, b) => ((hoek(a) - h0 + 4 * Math.PI) % (2 * Math.PI)) - ((hoek(b) - h0 + 4 * Math.PI) % (2 * Math.PI)));
  return isBol(gesorteerd) ? gesorteerd : null;
}

/**
 * De camera van een foto uit vier hoeken van een rechthoek op de vloer.
 * @param punten de vier hoeken in de foto (pixels), rond de omtrek aangeklikt (de volgorde wordt zo nodig hersteld)
 * @param maat de echte maat van de rechthoek in cm (b × d); welke zijde welke maat is, zoekt de functie zelf (met
 *   `opties.eersteZijdeB` als voorkeur)
 * @param foto breedte en hoogte van de foto in pixels
 */
export function kalibreer(punten: Punt2[], maat: { b: number; d: number }, foto: { breedte: number; hoogte: number }, opties: KalibratieOpties = {}): Kalibratie | KalibratieFout {
  if (punten.length !== 4 || !(maat.b > 0 && maat.d > 0)) return 'te_weinig_punten';
  const p = rondDeOmtrek(punten);
  if (!p) return 'geen_rechthoek';
  const { breedte, hoogte } = foto;
  const vlak = Math.abs(oppervlakte(p)) / (breedte * hoogte);
  const fMin = mmNaarPx(LENS_BEREIK.min, breedte, hoogte), fMax = mmNaarPx(LENS_BEREIK.max, breedte, hoogte);
  const fVast = opties.mm ? mmNaarPx(opties.mm, breedte, hoogte) : null;
  const fStandaard = mmNaarPx(LENS_BEREIK.standaard, breedte, hoogte);
  const diag = Math.hypot(breedte, hoogte);

  type Kandidaat = { R: number[]; t: Vec3; f: number; fout: number; kost: number; geschat: boolean; hoeken: Vec3[]; eersteZijdeB: boolean };
  const kandidaten: Kandidaat[] = [];
  const vk = opties.voorkennis === undefined ? STANDAARD_VOORKENNIS : opties.voorkennis;
  // Voorkennis weegt als afwijkingen in pixels: één spreiding telt als één schermpixel (foto op ±1000 px breed).
  const sigmaPx = diag / 1000;
  const extra: Extra | undefined = vk ? (R, _t, f) => {
    const r: number[] = [];
    // Rol: hoe ver de x-as van de camera uit het horizontale vlak helt.
    if (vk.rol) r.push((Math.asin(Math.max(-1, Math.min(1, R[1]!))) / ((vk.rol * Math.PI) / 180)) * sigmaPx);
    if (vk.mm && !fVast) r.push((Math.log(pxNaarMm(f, breedte, hoogte) / vk.mm.verwacht) / vk.mm.spreiding) * sigmaPx);
    return r;
  } : undefined;
  const probeer = (eersteZijdeB: boolean, pogingen: (H: number[]) => { f: number; vrij: boolean }[]) => {
    const [b, d] = eersteZijdeB ? [maat.b, maat.d] : [maat.d, maat.b];
    const vloer: Punt2[] = [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: d }, { x: 0, y: d }];
    const H = homografie(vloer, p);
    if (!H) return;
    for (const poging of pogingen(H)) {
      const stand = standUitHomografie(H, poging.f, breedte, hoogte);
      if (!stand) continue;
      let wereld: Vec3[] = vloer.map((q) => [q.x, 0, q.y]);
      let { R, t } = stand;
      // De camera hoort boven de vloer: anders is de vloer gespiegeld benoemd (z → −z, zelfde beeld).
      if (keer(draaiTerug(R, t), -1)[1] < 0) {
        R = [R[0]!, -R[1]!, -R[2]!, R[3]!, -R[4]!, -R[5]!, R[6]!, -R[7]!, -R[8]!];
        wereld = wereld.map((q) => [q[0], 0, -q[2]]);
      }
      // Een klein vlak ver weg past bijna even goed bij een tweede stand (de vloer gekanteld, gespiegeld rond de
      // kijklijn): ook vanuit die stand verfijnen en de beste houden.
      const starten = [{ R, t }];
      if (vk) {
        const midden = keer(wereld.reduce((som, q) => plus(som, q), [0, 0, 0] as Vec3), 0.25);
        const c = plus(draai(R, midden), t), v = eenheid(c), normaal = kolom(R, 1);
        const n2 = min(keer(v, 2 * punt(normaal, v)), normaal), as = kruis(normaal, n2), sinus = lengte(as);
        if (sinus > 1e-6) {
          const R2 = maal(rotatieMatrix(keer(eenheid(as), Math.atan2(sinus, punt(normaal, n2)))), R);
          starten.push({ R: R2, t: min(c, draai(R2, midden)) });
        }
      }
      for (const start of starten) {
        const v = verfijn(start.R, start.t, poging.f, wereld, p, breedte, hoogte, poging.vrij, extra);
        // Een geschatte lens moet na het verfijnen in het bereik liggen; anders telt alleen de standaardlens.
        if (poging.vrij && (v.f < fMin || v.f > fMax)) continue;
        const cam = camera(v.R, v.t, v.f, breedte, hoogte);
        if (!(cam.positie[1] > 0) || wereld.some((q) => !projecteer(cam, q))) continue;
        // Tegen de voorkeur van de gebruiker in: alleen als de foto dat duidelijk beter verklaart.
        const tegen = opties.eersteZijdeB !== undefined && opties.eersteZijdeB !== eersteZijdeB ? 4 * sigmaPx * sigmaPx : 0;
        kandidaten.push({ ...v, kost: v.kost + tegen, geschat: poging.vrij, hoeken: wereld, eersteZijdeB });
      }
    }
  };
  const zijden = [true, false];
  if (fVast) for (const z of zijden) probeer(z, () => [{ f: fVast, vrij: false }]);
  else if (vk) {
    // Met voorkennis: de lens vrij, vertrekkend van de verwachte lens en van de schatting uit de foto.
    for (const z of zijden) probeer(z, (H) => {
      const fs = brandpuntUitHomografie(H, breedte / 2, hoogte / 2, diag);
      const fv = mmNaarPx(vk.mm?.verwacht ?? LENS_BEREIK.standaard, breedte, hoogte);
      return fs && fs >= fMin && fs <= fMax && Math.abs(fs / fv - 1) > 0.02 ? [{ f: fv, vrij: true }, { f: fs, vrij: true }] : [{ f: fv, vrij: true }];
    });
    // Geen geschatte lens in het bereik: de standaardlens (28 mm), met de schuifknop.
    if (!kandidaten.length) for (const z of zijden) probeer(z, () => [{ f: fStandaard, vrij: false }]);
  } else {
    // Zonder voorkennis (de regel van de analyse): schatten; buiten 18–50 mm de standaardlens.
    for (const z of zijden) probeer(z, (H) => {
      const fs = brandpuntUitHomografie(H, breedte / 2, hoogte / 2, diag);
      return [...(fs && fs >= fMin * 0.8 && fs <= fMax * 1.25 ? [{ f: Math.min(fMax, Math.max(fMin, fs)), vrij: true }] : []), { f: fStandaard, vrij: false }];
    });
  }
  if (!kandidaten.length) return 'geen_oplossing';
  if (vk || fVast) kandidaten.sort((a, b) => a.kost - b.kost);
  else {
    // De kleinste afwijking; bij (bijna) gelijke afwijking een geschatte lens boven de standaard.
    const drempel = Math.max(0.5, diag * 2e-4);
    kandidaten.sort((a, b) => {
      const fa = Math.max(a.fout, drempel), fb = Math.max(b.fout, drempel);
      if (Math.abs(fa - fb) > drempel * 0.5) return fa - fb;
      if (a.geschat !== b.geschat) return a.geschat ? -1 : 1;
      return a.fout - b.fout;
    });
  }
  const k = kandidaten[0]!;
  const cam = camera(k.R, k.t, k.f, breedte, hoogte);
  const aanwijzingen: Aanwijzing[] = [];
  if (vlak < MIN_VLAK) aanwijzingen.push('klein');
  if (!k.geschat && !fVast) aanwijzingen.push('standaardlens');
  if (k.fout > Math.max(3, diag * 0.004)) aanwijzingen.push('onzeker');
  return { camera: cam, hoeken: k.hoeken, punten: p, eersteZijdeB: k.eersteZijdeB, geschat: k.geschat, fout: k.fout, vlak, aanwijzingen };
}

/** Uitleg in gewone taal bij een fout van `kalibreer`. */
export const KALIBRATIE_FOUT: Record<KalibratieFout, string> = {
  te_weinig_punten: 'Klik de vier hoeken aan en vul de maat in.',
  geen_rechthoek: 'De vier punten vormen geen vierhoek. Klik de hoeken rond de omtrek aan, de ene na de andere.',
  geen_oplossing: 'Dit lukt niet met deze punten. Duid vier hoeken aan van iets rechthoekigs dat plat op de vloer ligt: zonder zichtbare vloer werkt het niet.',
};

/** Camera met een gegeven stand (voor tests en de maatproef): positie, kijkpunt, rol en lens. */
export function cameraVan(o: { positie: Vec3; doel: Vec3; mm: number; breedte: number; hoogte: number; rol?: number }): Kamercamera {
  // Kijkrichting z, rechts x, onder y (OpenCV), met de wereld-y omhoog.
  const z = eenheid(min(o.doel, o.positie));
  let x = eenheid(kruis(z, [0, 1, 0]));
  let y = kruis(z, x);
  if (o.rol) {
    const c = Math.cos(o.rol), s = Math.sin(o.rol);
    [x, y] = [plus(keer(x, c), keer(y, s)), min(keer(y, c), keer(x, s))];
  }
  const R = [...x, ...y, ...z];
  const t = keer(draai(R, o.positie), -1);
  return camera(R, t, mmNaarPx(o.mm, o.breedte, o.hoogte), o.breedte, o.hoogte);
}
