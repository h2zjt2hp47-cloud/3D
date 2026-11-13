/**
 * Zachte vormen: de gestoffeerde delen van het karkas (onderbouw, armen, rug, hoes) samensmelten tot één doorlopende,
 * zachte vorm, zoals een echt gestoffeerde zetel: afgeronde overgangen in de hoeken, geen naden tussen de blokken en
 * schaduw in de plooien. De blokken blijven de beschrijving (maten en opties); dit maakt er alleen een andere vorm van.
 * Losse kussens, hout en metaal doen niet mee.
 *
 * Werkwijze (zoals in 3D-programma's):
 * 1. elk blok als afstandsveld: hoe ver een punt van het blok ligt (negatief = erin), met de richting naar buiten;
 * 2. de velden zacht samenvoegen. In een hoek tussen twee delen komt een afronding met de straal `overgang`, zoals stof
 *    die over de hoek spant. Waar twee vlakken in elkaars verlengde liggen, gebeurt niets (anders komt er een richel).
 *    Dat volgt uit de hoek tussen de twee richtingen naar buiten;
 * 3. het oppervlak uit een raster halen ("surface nets"): één punt per rastercel die het oppervlak snijdt, daarna
 *    precies op het oppervlak gelegd, en vierhoeken tussen de cellen rond elke ribbe die het oppervlak snijdt;
 * 4. normalen uit het veld (glad, geen facetten), en schaduw in hoeken en plooien uit hetzelfde veld met de kussens
 *    en de vloer erbij.
 *
 * Geen 3D-bibliotheek nodig: de weergave maakt er een mesh van (posities, normalen, textuurcoördinaten, schaduw).
 */
import type { Blok } from './ruimtelijk.js';

export interface ZachteVormOpties {
  /** Maat van het raster in cm (standaard 2): kleiner = fijner en trager. */
  raster?: number;
  /** Straal van de zachte overgang in de hoeken tussen twee elementen, in cm (standaard 4). */
  overgang?: number;
  /**
   * Straal tussen de delen van één element, in cm (standaard 10): die zijn als één stuk gestoffeerd (bv. een arm met
   * zijn krul en de hoes eronder), dus de overgang mag ruimer.
   */
  overgangBinnen?: number;
  /** Kleinste afronding van een blok, in cm (standaard 1,25 × raster): kleinere afrondingen gaven kartels op het raster. */
  minAfronding?: number;
  /** Blokken die schaduw geven maar niet meesmelten (bv. de kussens erop). */
  buren?: Blok[];
  /** Textuurmaat: zoveel cm is één eenheid van de textuurcoördinaten (standaard 1). */
  tegelCm?: number;
}

/** Driehoeken zonder gedeelde hoekpunten (3 per driehoek), zodat elke driehoek zijn eigen textuurrichting heeft. */
export interface ZachteVorm {
  posities: Float32Array;
  normalen: Float32Array;
  uv: Float32Array;
  /** Schaduw per hoekpunt: 1 = vrij, lager = in een hoek of plooi. */
  schaduw: Float32Array;
  driehoeken: number;
}

/**
 * Kan dit blok meesmelten? Gestoffeerde delen van het karkas: geen kussens, hout, metaal of blokken met eigen zijvlakken.
 * Gebogen wanden (kuipfauteuils, rug rond een afgerond uiteinde) en vrije omtrekken (afgerond eindelement) niet: die
 * zijn al rond getekend, en samengesmolten gaven ze in de proef foutjes aan de randen. `zachteVorm` kan ze wel aan.
 */
export function smeltMee(b: Blok): boolean {
  // Een glad blok (doorlopende zetel) is al als zachte vorm bedoeld: stof smelt mee, ook een omtrek of gebogen wand.
  if (b.glad) return b.soort === 'stof' && !b.zijden && kanVorm(b);
  if (b.soort !== 'stof' || b.zijden || b.omtrek) return false;
  const vorm = b.vorm ?? 'blok';
  if (vorm === 'kuipwand') return false;
  if (vorm === 'profiel') return !!(b.pad && b.hoogtes && b.profiel && b.uit && b.pad.length >= 2 && b.pad.length === b.hoogtes.length && b.profiel.length >= 3);
  if (vorm === 'cilinder') return b.as === 'x' || b.as === 'z';
  return vorm === 'blok' && Math.min(b.b, b.h, b.d) >= 1;
}

/** Afstand (d) en richting naar buiten (gx, gy, gz) in één array, om geen objecten aan te maken in de lussen. */
type Uit = Float64Array;
interface Primitief {
  x0: number; y0: number; z0: number; x1: number; y1: number; z1: number;
  /** Volgnummer van het element (uit de code vóór het punt): delen van één element smelten ruimer samen. */
  element?: number;
  veld(x: number, y: number, z: number, uit: Uit): void;
}

function schrijf(uit: Uit, d: number, gx: number, gy: number, gz: number) {
  const l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
  uit[0] = d; uit[1] = gx / l; uit[2] = gy / l; uit[3] = gz / l;
}

/** Draaiing van een kantelend blok rond de onderkant in het midden (zoals in de weergave): de bovenkant gaat naar `richting`. */
function kantelVan(b: Blok) {
  if (!b.kantel) return null;
  const a = (b.kantel.graden * Math.PI) / 180;
  // Zelfde tekens als de weergave: z- = rotatie rond x met −a, z+ = +a, x+ = rond z met −a, x- = +a.
  const r = b.kantel.richting;
  return { as: r === 'z-' || r === 'z+' ? ('x' as const) : ('z' as const), hoek: r === 'z-' || r === 'x+' ? -a : a, px: b.x + b.b / 2, py: b.y, pz: b.z + b.d / 2 };
}

/** Afgeronde balk (eventueel achterover gekanteld). */
function balk(b: Blok, afronding = b.afronding ?? 1): Primitief {
  const hx = b.b / 2, hy = b.h / 2, hz = b.d / 2;
  const cx = b.x + hx, cy = b.y + hy, cz = b.z + hz;
  const r = Math.max(0.3, Math.min(afronding, hx - 0.01, hy - 0.01, hz - 0.01));
  const k = kantelVan(b);
  const cos = k ? Math.cos(k.hoek) : 1, sin = k ? Math.sin(k.hoek) : 0;
  // Kader: de acht hoeken, gedraaid.
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    let x = cx + sx * hx, y = cy + sy * hy, z = cz + sz * hz;
    if (k) {
      const dx = x - k.px, dy = y - k.py, dz = z - k.pz;
      if (k.as === 'x') { y = k.py + dy * cos - dz * sin; z = k.pz + dy * sin + dz * cos; }
      else { x = k.px + dx * cos - dy * sin; y = k.py + dx * sin + dy * cos; }
    }
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z); x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
  }
  return {
    x0, y0, z0, x1, y1, z1,
    veld(x, y, z, uit) {
      // Naar het eigen assenstelsel van de balk (terugdraaien).
      if (k) {
        const dx = x - k.px, dy = y - k.py, dz = z - k.pz;
        if (k.as === 'x') { y = k.py + dy * cos + dz * sin; z = k.pz - dy * sin + dz * cos; }
        else { x = k.px + dx * cos + dy * sin; y = k.py - dx * sin + dy * cos; }
      }
      const px = x - cx, py = y - cy, pz = z - cz;
      const qx = Math.abs(px) - (hx - r), qy = Math.abs(py) - (hy - r), qz = Math.abs(pz) - (hz - r);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
      const buiten = Math.sqrt(ox * ox + oy * oy + oz * oz);
      const d = buiten + Math.min(Math.max(qx, qy, qz), 0) - r;
      let gx: number, gy: number, gz: number;
      if (buiten > 1e-9) { gx = ox * Math.sign(px); gy = oy * Math.sign(py); gz = oz * Math.sign(pz); }
      else if (qx >= qy && qx >= qz) { gx = Math.sign(px) || 1; gy = 0; gz = 0; }
      else if (qy >= qz) { gx = 0; gy = Math.sign(py) || 1; gz = 0; }
      else { gx = 0; gy = 0; gz = Math.sign(pz) || 1; }
      // Richting terug naar de wereld (meedraaien).
      if (k) {
        if (k.as === 'x') { const ny = gy * cos - gz * sin, nz = gy * sin + gz * cos; gy = ny; gz = nz; }
        else { const nx = gx * cos - gy * sin, ny = gx * sin + gy * cos; gx = nx; gy = ny; }
      }
      schrijf(uit, d, gx, gy, gz);
    },
  };
}

/** Gebogen wand (kuipwand): halve cirkel bovenaan, platte onderkant, hoogte volgt de punten van de middenlijn. */
function wand(b: Blok): Primitief {
  const pad = b.pad!, hoog = b.hoogtes!, w = (b.dikte ?? 14) / 2, onder = b.y;
  const n = pad.length;
  const xs = pad.map((p) => p[0]), zs = pad.map((p) => p[1]);
  // Richting van het pad per punt: het gemiddelde van de twee stukken ernaast (de verstekrichting), genormaliseerd.
  const vx = new Float64Array(n), vz = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let ax = 0, az = 0;
    for (const k of [i - 1, i]) {
      if (k < 0 || k > n - 2) continue;
      const ux = pad[k + 1]![0] - pad[k]![0], uz = pad[k + 1]![1] - pad[k]![1], l = Math.hypot(ux, uz) || 1;
      ax += ux / l; az += uz / l;
    }
    const l = Math.hypot(ax, az) || 1;
    vx[i] = ax / l; vz[i] = az / l;
  }
  /**
   * Dichtste punt op de middenlijn (in het grondvlak), gezocht in de stukken `van` tot en met `tot` van het pad: het
   * verschil ernaartoe (0, 1), de hoogte van de bovenrand ter plaatse (2), de helling van die hoogte in het grondvlak
   * (3, 4) en het stuk van het dichtste punt (5).
   *
   * De hoogte volgt niet het dichtste punt maar de plaats tussen de twee verstekken van een stuk (de lijnen door zijn
   * eindpunten, haaks op de gemiddelde richting daar). Het dichtste punt verspringt op elk hoekpunt van het pad: aan de
   * binnenkant van een bocht een sprong, aan de buitenkant een stukje waar het stilstaat. Op een steile rand gaf dat
   * trapjes tot 1 cm in de hoogte: een bobbelige schaal (Pebble, gemeten op 13/11). Tussen de verstekken loopt de hoogte
   * overal vloeiend door, ook rond een hoekpunt. Voorbij een uiteinde blijft de hoogte die van het uiteinde (ronde kop).
   */
  const dichtste = (x: number, z: number, o: Float64Array, van = 0, tot = n - 2) => {
    let beste = Infinity, qx = 0, qz = 0, top = onder, hx = 0, hz = 0, stuk = van;
    for (let i = van; i <= tot; i++) {
      const ax = pad[i]![0], az = pad[i]![1], bx = pad[i + 1]![0], bz = pad[i + 1]![1];
      const ux = bx - ax, uz = bz - az, l2 = ux * ux + uz * uz || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - ax) * ux + (z - az) * uz) / l2));
      const cx = ax + t * ux, cz = az + t * uz, d2 = (x - cx) * (x - cx) + (z - cz) * (z - cz);
      if (d2 < beste) { beste = d2; qx = cx; qz = cz; stuk = i; }
    }
    // Het stuk waarvan de twee verstekken dit punt insluiten: dat van het dichtste punt, of een buur.
    let i = stuk, f0 = 0, f1 = 0;
    for (let stap = 0; stap < 6; stap++) {
      f0 = (x - pad[i]![0]) * vx[i]! + (z - pad[i]![1]) * vz[i]!;
      f1 = (pad[i + 1]![0] - x) * vx[i + 1]! + (pad[i + 1]![1] - z) * vz[i + 1]!;
      if (f0 < 0 && i > 0) i--;
      else if (f1 < 0 && i < n - 2) i++;
      else break;
    }
    const dh = hoog[i + 1]! - hoog[i]!;
    if (f0 <= 0) top = hoog[i]!;
    else if (f1 <= 0) top = hoog[i + 1]!;
    else {
      const som = f0 + f1, g = dh / (som * som);
      top = hoog[i]! + (dh * f0) / som;
      hx = g * (f1 * vx[i]! + f0 * vx[i + 1]!); hz = g * (f1 * vz[i]! + f0 * vz[i + 1]!);
    }
    o[0] = x - qx; o[1] = z - qz; o[2] = top; o[3] = hx; o[4] = hz; o[5] = stuk;
  };
  // Een lange wand (de rug van een doorlopende zetel) heeft tientallen stukken. Daarom, pas als het veld echt gebruikt
  // wordt, per cm in het grondvlak het dichtste stuk in een tabel (de middenlijn hangt niet van de hoogte af); daarna
  // zoekt de motor alleen in de stukken rond die van de vier tabelpunten eromheen. Liggen die ver uit elkaar (midden
  // tussen twee delen van de wand), dan zoekt hij overal.
  const x0 = Math.min(...xs) - w - 25, z0 = Math.min(...zs) - w - 25;
  const tw = Math.ceil(Math.max(...xs) + w + 25 - x0) + 1, th = Math.ceil(Math.max(...zs) + w + 25 - z0) + 1;
  let stukken: Uint16Array | null = null, oproepen = 0;
  const o = new Float64Array(6);
  return {
    x0: Math.min(...xs) - w, x1: Math.max(...xs) + w, z0: Math.min(...zs) - w, z1: Math.max(...zs) + w,
    y0: onder, y1: Math.max(...hoog),
    veld(x, y, z, uit) {
      if (!stukken && n > 8 && ++oproepen > 2000) {
        stukken = new Uint16Array(tw * th);
        for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) { dichtste(x0 + i, z0 + j, o); stukken[j * tw + i] = o[5]!; }
      }
      let van = 0, tot = n - 2;
      const fx = x - x0, fz = z - z0;
      if (stukken && fx >= 0 && fz >= 0 && fx < tw - 1 && fz < th - 1) {
        const a = (fz | 0) * tw + (fx | 0);
        const s0 = stukken[a]!, s1 = stukken[a + 1]!, s2 = stukken[a + tw]!, s3 = stukken[a + tw + 1]!;
        const laag = Math.min(s0, s1, s2, s3), hoogst = Math.max(s0, s1, s2, s3);
        if (hoogst - laag <= 4) { van = Math.max(0, laag - 1); tot = Math.min(n - 2, hoogst + 1); }
      }
      dichtste(x, z, o, van, tot);
      const lx = o[0]!, lz = o[1]!, top = o[2]!;
      // Doorsnede: capsule van onder − w tot top − w (straal w), onderaan plat afgesneden op `onder`.
      const yc = Math.max(onder - w, Math.min(y, top - w));
      const ly = y - yc;
      const l = Math.sqrt(lx * lx + ly * ly + lz * lz);
      const dc = l - w, db = onder - y;
      // Bovenaan hangt het middelpunt van de ronding af van de plaats langs het pad: daar telt de helling mee in de
      // richting (anders kloppen de normalen niet waar de wand oploopt of zakt, bv. rond het ronde uiteinde).
      const mee = y > top - w ? ly : 0;
      if (db > dc) schrijf(uit, db, 0, -1, 0);
      else if (l > 1e-9) {
        // Waar de bovenrand oploopt of zakt, verandert `dc` sneller dan 1 cm per cm (de doorsnede schuift mee met de
        // hoogte): gedeeld door de lengte van de helling wordt het weer een echte afstand. Zonder dit legde de motor de
        // punten naast het oppervlak waar de rand steil is. Het oppervlak zelf (dc = 0) verschuift hierdoor niet.
        const gx = lx - mee * o[3]!, gz = lz - mee * o[4]!, gl = Math.sqrt(gx * gx + ly * ly + gz * gz);
        schrijf(uit, gl > 1e-9 ? (dc * l) / gl : dc, gx, ly, gz);
      } else schrijf(uit, dc, 0, 1, 0);
    },
  };
}

/**
 * Afstand tot een veelhoek in 2D met teken (negatief binnen) en de richting naar buiten. De richting komt van de
 * dichtste zijde (ook precies op de rand, waar het punt zelf geen richting geeft), bij een hoekpunt van de twee zijden.
 */
function veelhoek(px: number, py: number, xs: Float64Array, ys: Float64Array, n: number, uit: Float64Array) {
  let d2 = Infinity, rx = 0, ry = 0, binnen = false, beste = 0, besteT = 0, opp = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ax = xs[j]!, ay = ys[j]!, bx = xs[i]!, by = ys[i]!;
    opp += ax * by - bx * ay;
    const ux = bx - ax, uy = by - ay, l2 = ux * ux + uy * uy || 1e-9;
    const t = Math.max(0, Math.min(1, ((px - ax) * ux + (py - ay) * uy) / l2));
    const ex = px - (ax + t * ux), ey = py - (ay + t * uy), e2 = ex * ex + ey * ey;
    if (e2 < d2) { d2 = e2; rx = ex; ry = ey; beste = j; besteT = t; }
    if ((ay > py) !== (by > py) && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) binnen = !binnen;
  }
  const a = Math.sqrt(d2), s = binnen ? -1 : 1;
  uit[0] = s * a;
  // Normaal naar buiten van zijde k (van punt k naar k + 1), volgens de draairichting van de veelhoek.
  const tegen = opp > 0;
  const zijde = (k: number, w: 0 | 1) => {
    const i = (k + n) % n, j = (i + 1) % n, ux = xs[j]! - xs[i]!, uy = ys[j]! - ys[i]!, l = Math.sqrt(ux * ux + uy * uy) || 1;
    return (w === 0 ? (tegen ? uy : -uy) : tegen ? -ux : ux) / l;
  };
  let nx: number, ny: number;
  if (besteT > 1e-6 && besteT < 1 - 1e-6) { nx = zijde(beste, 0); ny = zijde(beste, 1); }
  else if (a > 1e-6) { nx = (s * rx) / a; ny = (s * ry) / a; }
  else {
    const k = besteT <= 1e-6 ? beste : beste + 1;
    nx = zijde(k - 1, 0) + zijde(k, 0); ny = zijde(k - 1, 1) + zijde(k, 1);
    const l = Math.sqrt(nx * nx + ny * ny) || 1;
    nx /= l; ny /= l;
  }
  uit[1] = nx; uit[2] = ny; uit[3] = beste; uit[4] = besteT;
}

/**
 * Profiel dat langs een rechte middenlijn loopt (bv. een uitlopende arm): per punt van de lijn de bovenhoogte; punten
 * van het profiel met `boven` schuiven mee met die hoogte. Uiteinden en randen licht afgerond.
 */
function profielVorm(b: Blok): Primitief {
  const pad = b.pad!, hoog = b.hoogtes!, prof = b.profiel!, [ux, uz] = b.uit!;
  const ax = pad[0]![0], az = pad[0]![1], bx = pad[pad.length - 1]![0], bz = pad[pad.length - 1]![1];
  const L = Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2) || 1, tx = (bx - ax) / L, tz = (bz - az) / L;
  const n = prof.length, xs = new Float64Array(n), ys = new Float64Array(n), d2 = new Float64Array(5);
  const rE = b.rand ?? 2.5;
  let laatsteTop = NaN;
  // Bol voorpaneel: in het midden kopBol cm naar voren, aan de randen niet (gevulde stof).
  const kop = b.kopBol ?? 0;
  const smid = (Math.min(...prof.map((p) => p[0])) + Math.max(...prof.map((p) => p[0]))) / 2;
  const shalf = (Math.max(...prof.map((p) => p[0])) - Math.min(...prof.map((p) => p[0]))) / 2 || 1;
  const ylaag = Math.min(...prof.filter((p) => !p[2]).map((p) => p[1]), b.y), yhoog = Math.max(...hoog);
  const ymid = (ylaag + yhoog) / 2, yhalf = (yhoog - ylaag) / 2 || 1;
  const smin = Math.min(...prof.map((p) => p[0])), smax = Math.max(...prof.map((p) => p[0]));
  const uitsteek = b.kopBol ?? 0;
  const hoeken = [ax - tx * uitsteek, bx].flatMap((x, i) => { const z = i ? bz : az - tz * uitsteek; return [[x + ux * smin, z + uz * smin], [x + ux * smax, z + uz * smax]]; });
  return {
    x0: Math.min(...hoeken.map((h) => h[0]!)), x1: Math.max(...hoeken.map((h) => h[0]!)),
    z0: Math.min(...hoeken.map((h) => h[1]!)), z1: Math.max(...hoeken.map((h) => h[1]!)),
    y0: Math.min(...prof.filter((p) => !p[2]).map((p) => p[1]), b.y), y1: Math.max(...hoog),
    veld(x, y, z, uit) {
      // Langs de lijn (a = cm vanaf het begin), opzij (s, naar buiten) en de bovenhoogte ter plaatse.
      const a = (x - ax) * tx + (z - az) * tz, s = (x - ax) * ux + (z - az) * uz;
      const binnenLijn = a > 0 && a < L;
      const f = Math.max(0, Math.min(1, a / L)) * (hoog.length - 1), i = Math.min(hoog.length - 2, Math.floor(f));
      const top = hoog[i]! + (f - i) * (hoog[i + 1]! - hoog[i]!);
      const stijging = binnenLijn ? ((hoog[i + 1]! - hoog[i]!) * (hoog.length - 1)) / L : 0;
      // De doorsnede opnieuw opbouwen alleen als de bovenhoogte verandert (bij een strakke arm nooit).
      if (top !== laatsteTop) {
        for (let k = 0; k < n; k++) { xs[k] = prof[k]![0]; ys[k] = prof[k]![2] ? top - prof[k]![1] : prof[k]![1]; }
        laatsteTop = top;
      }
      veelhoek(s, y, xs, ys, n, d2);
      const gs0 = d2[1]!, gy0 = d2[2]!;
      // Waar de arm oploopt, verandert de doorsnede langs de lijn: die helling hoort in de richting en in de afstand
      // (anders liggen de punten naast het oppervlak en kloppen de normalen niet: kartels op de helling).
      // Een deel dat met de bovenkant meeschuift, schuift omhoog: de afstand verandert dan als −gy per cm hoogte.
      const zk = d2[3]!, zt = d2[4]!, mee = prof[zk]![2] * (1 - zt) + prof[(zk + 1) % n]![2] * zt;
      const helling = -gy0 * mee * stijging;
      const vlak = d2[0]! / Math.sqrt(1 + helling * helling);
      // Afgeronde uiteinden: doorsnede en lengte samen (zoals een afgeronde balk). Vooraan eventueel een bol paneel.
      const vooraan = a < L / 2;
      let e = a < 0 ? -a : a > L ? a - L : -Math.min(a, L - a), es = 0, ey = 0;
      const ea = vooraan ? -1 : 1;
      if (vooraan && kop) {
        const u = (s - smid) / shalf, w = (y - ymid) / yhalf;
        if (Math.abs(u) < 1 && Math.abs(w) < 1) {
          const fu = 1 - u * u, fw = 1 - w * w;
          e -= kop * fu * fw;
          es = (kop * 2 * u * fw) / shalf;
          ey = (kop * 2 * w * fu) / yhalf;
        }
      }
      const qa = vlak + rE, qb = e + rE;
      const ma = Math.max(qa, 0), mb = Math.max(qb, 0);
      const d = Math.min(Math.max(qa, qb), 0) + Math.sqrt(ma * ma + mb * mb) - rE;
      let gs: number, gy: number, ga: number;
      if (qa > 0 && qb > 0) { gs = gs0 * qa + es * qb; gy = gy0 * qa + ey * qb; ga = ea * qb + helling * qa; }
      else if (qa > qb) { gs = gs0; gy = gy0; ga = helling; }
      else { gs = es; gy = ey; ga = ea; }
      schrijf(uit, d, gs * ux + ga * tx, gy, gs * uz + ga * tz);
    },
  };
}

/** Liggende rol (cilinder langs x of z) met licht afgeronde uiteinden. */
function rol(b: Blok): Primitief {
  const langsZ = b.as === 'z';
  const r = (langsZ ? Math.min(b.b, b.h) : Math.min(b.d, b.h)) / 2;
  const half = (langsZ ? b.d : b.b) / 2;
  const cx = b.x + b.b / 2, cy = b.y + r, cz = b.z + b.d / 2;
  const rr = Math.max(0.3, Math.min(1.5, r / 3, half / 3));
  return {
    x0: langsZ ? cx - r : cx - half, x1: langsZ ? cx + r : cx + half, y0: cy - r, y1: cy + r,
    z0: langsZ ? cz - half : cz - r, z1: langsZ ? cz + half : cz + r,
    veld(x, y, z, uit) {
      const ax = langsZ ? z - cz : x - cx;
      const rx = langsZ ? x - cx : 0, rz = langsZ ? 0 : z - cz, ry = y - cy;
      const radiaal = Math.sqrt(rx * rx + ry * ry + rz * rz);
      const dr = radiaal - (r - rr), da = Math.abs(ax) - (half - rr);
      const mr = Math.max(dr, 0), ma = Math.max(da, 0);
      const d = Math.min(Math.max(dr, da), 0) + Math.sqrt(mr * mr + ma * ma) - rr;
      const ux = radiaal > 1e-9 ? rx / radiaal : 0, uy = radiaal > 1e-9 ? ry / radiaal : 1, uz = radiaal > 1e-9 ? rz / radiaal : 0;
      const sa = Math.sign(ax) || 1;
      let gx: number, gy: number, gz: number;
      if (dr > 0 && da > 0) { gx = ux * dr; gy = uy * dr; gz = uz * dr; if (langsZ) gz += sa * da; else gx += sa * da; }
      else if (dr > da) { gx = ux; gy = uy; gz = uz; }
      else { gx = langsZ ? 0 : sa; gy = 0; gz = langsZ ? sa : 0; }
      schrijf(uit, d, gx, gy, gz);
    },
  };
}

/** Blok met een vrije omtrek in het grondvlak (bv. de onderbouw van een afgerond eindelement), met afgeronde randen. */
/**
 * De afstand tot een veelhoek (met de richting naar buiten) als tabel per `stap` cm, tot `marge` cm rond de veelhoek, en
 * daartussen bilineair. Een vrije omtrek hangt niet van de hoogte af: zo rekent de motor elke plek in het grondvlak één
 * keer, in plaats van voor elk punt opnieuw alle zijden (bij een lange zetel ruim 100). Buiten de tabel, of waar de
 * richting onzeker is (midden tussen twee zijden), rekent hij gewoon.
 */
function veelhoekTabel(xs: Float64Array, ys: Float64Array, n: number, stap: number, marge: number) {
  let ax = Infinity, ay = Infinity, bx = -Infinity, by = -Infinity;
  for (let i = 0; i < n; i++) { ax = Math.min(ax, xs[i]!); ay = Math.min(ay, ys[i]!); bx = Math.max(bx, xs[i]!); by = Math.max(by, ys[i]!); }
  const x0 = ax - marge, y0 = ay - marge, tw = Math.ceil((bx - ax + 2 * marge) / stap) + 1, th = Math.ceil((by - ay + 2 * marge) / stap) + 1;
  const t = new Float32Array(tw * th * 3), h = new Float64Array(5);
  for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) {
    veelhoek(x0 + i * stap, y0 + j * stap, xs, ys, n, h);
    const k = (j * tw + i) * 3;
    t[k] = h[0]!; t[k + 1] = h[1]!; t[k + 2] = h[2]!;
  }
  return (px: number, py: number, uit: Float64Array) => {
    const fx = (px - x0) / stap, fy = (py - y0) / stap;
    if (fx >= 0 && fy >= 0 && fx < tw - 1 && fy < th - 1) {
      const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j;
      const a = (j * tw + i) * 3, b = a + 3, c = a + tw * 3, d = c + 3;
      const w00 = (1 - u) * (1 - v), w10 = u * (1 - v), w01 = (1 - u) * v, w11 = u * v;
      const nx = t[a + 1]! * w00 + t[b + 1]! * w10 + t[c + 1]! * w01 + t[d + 1]! * w11;
      const ny = t[a + 2]! * w00 + t[b + 2]! * w10 + t[c + 2]! * w01 + t[d + 2]! * w11;
      const l = Math.sqrt(nx * nx + ny * ny);
      // Wijzen de vier richtingen uiteen (een knik in de afstand, midden tussen twee zijden), dan gewoon rekenen.
      if (l > 0.995) {
        uit[0] = t[a]! * w00 + t[b]! * w10 + t[c]! * w01 + t[d]! * w11;
        uit[1] = nx / l; uit[2] = ny / l;
        return;
      }
    }
    veelhoek(px, py, xs, ys, n, uit);
  };
}

function omtrekBlok(b: Blok, minR = 0): Primitief {
  const pts = b.omtrek!, n = pts.length;
  const rr = Math.max(0.3, Math.min(Math.max(minR, b.afronding ?? Math.min(5, b.h / 3)), b.h / 2 - 0.01));
  const cy = b.y + b.h / 2, hh = b.h / 2;
  const xs = Float64Array.from(pts.map((p) => p[0])), zs = Float64Array.from(pts.map((p) => p[1])), vh = new Float64Array(5);
  // De tabel pas maken als het veld echt gebruikt wordt (en niet voor een paar punten): 1 cm, 25 cm rond de omtrek.
  let tabel: ((px: number, py: number, uit: Float64Array) => void) | null = null, oproepen = 0;
  return {
    x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])),
    z0: Math.min(...pts.map((p) => p[1])), z1: Math.max(...pts.map((p) => p[1])), y0: b.y, y1: b.y + b.h,
    veld(x, y, z, uit) {
      // Afstand tot de omtrek met teken (binnen negatief), en de richting naar buiten.
      if (!tabel && ++oproepen > 2000) tabel = veelhoekTabel(xs, zs, n, 1, 25);
      if (tabel) tabel(x, z, vh);
      else veelhoek(x, z, xs, zs, n, vh);
      const dxz = vh[0]! + rr, dy = Math.abs(y - cy) - (hh - rr);
      const mx = Math.max(dxz, 0), my = Math.max(dy, 0);
      const d = Math.min(Math.max(dxz, dy), 0) + Math.sqrt(mx * mx + my * my) - rr;
      const ux = vh[1]!, uz = vh[2]!, sy = Math.sign(y - cy) || 1;
      if (dxz > 0 && dy > 0) schrijf(uit, d, ux * dxz, sy * dy, uz * dxz);
      else if (dxz > dy) schrijf(uit, d, ux, 0, uz);
      else schrijf(uit, d, 0, sy, 0);
    },
  };
}

function primitiefVan(b: Blok, minR = 0, element?: number): Primitief {
  const p = b.vorm === 'kuipwand' ? wand(b) : b.vorm === 'profiel' ? profielVorm(b) : b.vorm === 'cilinder' ? rol(b) : b.omtrek ? omtrekBlok(b, minR) : balk(b, Math.max(minR, b.afronding ?? 1));
  p.element = element;
  return p;
}

/** Kan `zachteVorm` dit blok omzetten (ruimer dan `smeltMee`: ook gebogen wanden en vrije omtrekken)? */
function kanVorm(b: Blok): boolean {
  if (b.zijden) return false;
  // Een glad blok mag ook een kussen of de (donkere) voet zijn.
  if (b.glad) {
    if (b.vorm === 'kuipwand') return !!(b.pad && b.hoogtes && b.pad.length >= 2 && b.pad.length === b.hoogtes.length);
    return (b.vorm ?? 'blok') === 'blok';
  }
  if (b.soort !== 'stof') return false;
  if (b.vorm === 'kuipwand') return !!(b.pad && b.hoogtes && b.pad.length >= 2 && b.pad.length === b.hoogtes.length);
  return smeltMee({ ...b, omtrek: undefined }) || !!b.omtrek;
}

/** Primitieven met een volgnummer per element (code vóór het punt). */
function primitievenVan(blokken: Blok[], minR: number) {
  const nummers = new Map<string, number>();
  return blokken.filter(kanVorm).map((b) => {
    const id = b.code.split('.')[0]!;
    if (!nummers.has(id)) nummers.set(id, nummers.size);
    return primitiefVan(b, minR, nummers.get(id));
  });
}

/**
 * Het samengestelde veld: per punt de afstand en de richting naar buiten.
 * Zacht samenvoegen met een straal die afhangt van de hoek tussen de delen: in een hoek de volle `overgang`, in elkaars
 * verlengde (zelfde richting naar buiten) niets.
 */
function samengesteld(prims: Primitief[], overgang: number, binnen = overgang) {
  const tmp = new Float64Array(4);
  const ruimst = Math.max(overgang, binnen);
  return (x: number, y: number, z: number, uit: Uit) => {
    let d = Infinity, gx = 0, gy = 1, gz = 0, element: number | undefined;
    for (const p of prims) {
      // Het blok ligt minstens zo ver als zijn kader: ligt het kader verder dan d + overgang, dan verandert dit deel niets.
      const grens = d + ruimst;
      if (grens < 0) break;
      const bx = Math.max(p.x0 - x, 0, x - p.x1), by = Math.max(p.y0 - y, 0, y - p.y1), bz = Math.max(p.z0 - z, 0, z - p.z1);
      if (bx * bx + by * by + bz * bz > grens * grens) continue;
      p.veld(x, y, z, tmp);
      const di = tmp[0]!;
      if (d === Infinity) { d = di; gx = tmp[1]!; gy = tmp[2]!; gz = tmp[3]!; element = p.element; continue; }
      const straal = p.element !== undefined && p.element === element ? binnen : overgang;
      const k = straal * Math.min(1, Math.max(0, 1 - (gx * tmp[1]! + gy * tmp[2]! + gz * tmp[3]!)));
      if (k < 1e-3 || Math.abs(di - d) >= k) {
        if (di < d) { d = di; gx = tmp[1]!; gy = tmp[2]!; gz = tmp[3]!; element = p.element; }
        continue;
      }
      const h = 0.5 + (0.5 * (di - d)) / k;
      if (h < 0.5) element = p.element;
      d = di + (d - di) * h - k * h * (1 - h);
      gx = tmp[1]! + (gx - tmp[1]!) * h; gy = tmp[2]! + (gy - tmp[2]!) * h; gz = tmp[3]! + (gz - tmp[3]!) * h;
      const l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
      gx /= l; gy /= l; gz /= l;
    }
    uit[0] = d; uit[1] = gx; uit[2] = gy; uit[3] = gz;
  };
}

/** Het veld van de zachte vorm als functie (voor tests en voor wie zelf wil meten): afstand in cm, negatief = erin. */
export function zachtVeld(blokken: Blok[], overgang = 4, overgangBinnen = 10, minAfronding = 0) {
  const veld = samengesteld(primitievenVan(blokken, minAfronding), overgang, overgangBinnen);
  const uit = new Float64Array(4);
  return (x: number, y: number, z: number) => { veld(x, y, z, uit); return uit[0]!; };
}

/** De 12 ribben van een rastercel (hoekpunten als bits x, y, z). */
const RIBBEN: [number, number][] = [];
for (let c = 0; c < 8; c++) for (let bit = 0; bit < 3; bit++) if (!(c & (1 << bit))) RIBBEN.push([c, c | (1 << bit)]);

/**
 * Eén doorlopende, zachte vorm uit de gegeven gestoffeerde blokken (de weergave geeft de blokken die `smeltMee` kiest).
 * Lege vorm als er geen zijn.
 */
export function zachteVorm(blokken: Blok[], opties: ZachteVormOpties = {}): ZachteVorm {
  const raster = opties.raster ?? 2, overgang = opties.overgang ?? 4, binnen = opties.overgangBinnen ?? 10, tegel = opties.tegelCm ?? 1;
  const prims = primitievenVan(blokken, opties.minAfronding ?? 1.25 * raster);
  const leeg: ZachteVorm = { posities: new Float32Array(0), normalen: new Float32Array(0), uv: new Float32Array(0), schaduw: new Float32Array(0), driehoeken: 0 };
  if (!prims.length) return leeg;
  const veld = samengesteld(prims, overgang, binnen);

  // Raster rond alle delen, met marge voor de overgang. Iets verschoven (geen ronde getallen), zodat de vlakken van de
  // blokken niet precies op rasterpunten vallen: daar is het teken onzeker en ontstaan gaten of dubbele randen.
  const marge = Math.max(overgang, binnen) + 2 * raster;
  const X0 = Math.min(...prims.map((p) => p.x0)) - marge - 0.371 * raster;
  const Y0 = Math.min(...prims.map((p) => p.y0)) - marge - 0.293 * raster;
  const Z0 = Math.min(...prims.map((p) => p.z0)) - marge - 0.417 * raster;
  const nx = Math.ceil((Math.max(...prims.map((p) => p.x1)) + marge - X0) / raster) + 1;
  const ny = Math.ceil((Math.max(...prims.map((p) => p.y1)) + marge - Y0) / raster) + 1;
  const nz = Math.ceil((Math.max(...prims.map((p) => p.z1)) + marge - Z0) / raster) + 1;
  const index = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  const f = new Float32Array(nx * ny * nz);
  const uit = new Float64Array(4);
  const band = Math.max(overgang, binnen) + 2 * raster;
  /** Afstand in een rasterpunt: ver van alle delen volstaat de afstand tot het dichtste kader (alleen het teken telt). */
  const waarde = (x: number, y: number, z: number) => {
    let kader2 = Infinity;
    for (const p of prims) {
      const bx = Math.max(p.x0 - x, 0, x - p.x1), by = Math.max(p.y0 - y, 0, y - p.y1), bz = Math.max(p.z0 - z, 0, z - p.z1);
      kader2 = Math.min(kader2, bx * bx + by * by + bz * bz);
    }
    if (kader2 > band * band) return Math.sqrt(kader2);
    veld(x, y, z, uit);
    return uit[0]!;
  };
  // Eerst een grof raster (3 × zo grof): waar het oppervlak zeker verder ligt dan de afstand tot het grove punt, volstaat
  // die waarde ook voor de fijne punten eromheen. Zo rekenen we fijn alleen vlak bij het oppervlak.
  const G = 3, gnx = Math.ceil((nx - 1) / G) + 1, gny = Math.ceil((ny - 1) / G) + 1, gnz = Math.ceil((nz - 1) / G) + 1;
  const grof = new Float32Array(gnx * gny * gnz);
  for (let k = 0; k < gnz; k++) for (let j = 0; j < gny; j++) for (let i = 0; i < gnx; i++)
    grof[i + gnx * (j + gny * k)] = waarde(X0 + i * G * raster, Y0 + j * G * raster, Z0 + k * G * raster);
  const veilig = G * raster * 0.87 * 1.15 + raster + Math.max(overgang, binnen) / 4;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const g = grof[Math.round(i / G) + gnx * (Math.round(j / G) + gny * Math.round(k / G))]!;
    f[index(i, j, k)] = Math.abs(g) > veilig ? g : waarde(X0 + i * raster, Y0 + j * raster, Z0 + k * raster);
  }

  // Eén punt per cel die het oppervlak snijdt: gemiddelde van de snijpunten, daarna precies op het oppervlak gelegd.
  const cel = new Int32Array(nx * ny * nz).fill(-1);
  const pos: number[] = [], nor: number[] = [];
  const w = new Float64Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let binnen = 0;
    for (let c = 0; c < 8; c++) {
      w[c] = f[index(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]!;
      if (w[c]! < 0) binnen++;
    }
    if (binnen === 0 || binnen === 8) continue;
    let sx = 0, sy = 0, sz = 0, aantal = 0;
    for (const [a, b] of RIBBEN) {
      const wa = w[a]!, wb = w[b]!;
      if ((wa < 0) === (wb < 0)) continue;
      const t = wa / (wa - wb);
      sx += (a & 1) + t * ((b & 1) - (a & 1));
      sy += ((a >> 1) & 1) + t * (((b >> 1) & 1) - ((a >> 1) & 1));
      sz += ((a >> 2) & 1) + t * (((b >> 2) & 1) - ((a >> 2) & 1));
      aantal++;
    }
    let x = X0 + (i + sx / aantal) * raster, y = Y0 + (j + sy / aantal) * raster, z = Z0 + (k + sz / aantal) * raster;
    for (let stap = 0; stap < 3; stap++) {
      veld(x, y, z, uit);
      const d = Math.max(-raster, Math.min(raster, uit[0]!));
      x -= d * uit[1]!; y -= d * uit[2]!; z -= d * uit[3]!;
    }
    veld(x, y, z, uit);
    cel[index(i, j, k)] = pos.length / 3;
    pos.push(x, y, z);
    nor.push(uit[1]!, uit[2]!, uit[3]!);
  }

  // Vierhoeken: rond elke ribbe van het raster die het oppervlak snijdt, de punten van de vier cellen eromheen.
  const drie: number[] = [];
  const vierhoek = (a: number, b: number, c: number, d: number) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    // Langs de kortste diagonaal in twee driehoeken.
    const acx = pos[a * 3]! - pos[c * 3]!, acy = pos[a * 3 + 1]! - pos[c * 3 + 1]!, acz = pos[a * 3 + 2]! - pos[c * 3 + 2]!;
    const bdx = pos[b * 3]! - pos[d * 3]!, bdy = pos[b * 3 + 1]! - pos[d * 3 + 1]!, bdz = pos[b * 3 + 2]! - pos[d * 3 + 2]!;
    const ac = acx * acx + acy * acy + acz * acz, bd = bdx * bdx + bdy * bdy + bdz * bdz;
    if (ac <= bd) drie.push(a, b, c, a, c, d);
    else drie.push(a, b, d, b, c, d);
  };
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const hier = f[index(i, j, k)]! < 0;
    if (j > 0 && k > 0 && hier !== f[index(i + 1, j, k)]! < 0)
      vierhoek(cel[index(i, j - 1, k - 1)]!, cel[index(i, j, k - 1)]!, cel[index(i, j, k)]!, cel[index(i, j - 1, k)]!);
    if (i > 0 && k > 0 && hier !== f[index(i, j + 1, k)]! < 0)
      vierhoek(cel[index(i - 1, j, k - 1)]!, cel[index(i, j, k - 1)]!, cel[index(i, j, k)]!, cel[index(i - 1, j, k)]!);
    if (i > 0 && j > 0 && hier !== f[index(i, j, k + 1)]! < 0)
      vierhoek(cel[index(i - 1, j - 1, k)]!, cel[index(i, j - 1, k)]!, cel[index(i, j, k)]!, cel[index(i - 1, j, k)]!);
  }

  // Punten gelijkmatiger verdelen: elk punt half naar het gemiddelde van zijn buren, daarna weer op het oppervlak (twee
  // keer). Zonder dit staan de punten langs een scherpe bocht (de krul van een arm) wat schots en scheef: kartelrand.
  {
    const aantal = pos.length / 3, som = new Float64Array(aantal * 3), tel = new Uint16Array(aantal);
    for (let ronde = 0; ronde < 2; ronde++) {
      som.fill(0); tel.fill(0);
      const tel1 = (a: number, b: number) => {
        for (let k = 0; k < 3; k++) som[a * 3 + k] = som[a * 3 + k]! + pos[b * 3 + k]!;
        tel[a] = tel[a]! + 1;
      };
      for (let t = 0; t < drie.length; t += 3) for (let h = 0; h < 3; h++) {
        const a = drie[t + h]!, b = drie[t + ((h + 1) % 3)]!;
        tel1(a, b);
        tel1(b, a);
      }
      for (let v = 0; v < aantal; v++) {
        if (!tel[v]) continue;
        let x = 0.5 * pos[v * 3]! + (0.5 * som[v * 3]!) / tel[v]!;
        let y = 0.5 * pos[v * 3 + 1]! + (0.5 * som[v * 3 + 1]!) / tel[v]!;
        let z = 0.5 * pos[v * 3 + 2]! + (0.5 * som[v * 3 + 2]!) / tel[v]!;
        for (let stap = 0; stap < 2; stap++) {
          veld(x, y, z, uit);
          const d = Math.max(-raster, Math.min(raster, uit[0]!));
          x -= d * uit[1]!; y -= d * uit[2]!; z -= d * uit[3]!;
        }
        pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
      }
    }
    for (let v = 0; v < aantal; v++) {
      veld(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!, uit);
      nor[v * 3] = uit[1]!; nor[v * 3 + 1] = uit[2]!; nor[v * 3 + 2] = uit[3]!;
    }
  }

  // Schaduw in hoeken en plooien: hoe dicht het oppervlak (met kussens en vloer) langs de normaal ligt.
  // Een buur met een eigen vorm (vrije omtrek, gebogen wand, profiel) met die vorm: als doos rond zijn kader gaf hij schaduw
  // waar niets staat (bv. vóór de holle voorkant van een doorlopende zetel).
  const buren = (opties.buren ?? []).filter((b) => (b.vorm ?? 'blok') === 'blok' || b.vorm === 'cilinder' || kanVorm(b))
    .map((b) => (b.omtrek || b.vorm === 'kuipwand' || b.vorm === 'profiel' ? primitiefVan(b) : balk(b, Math.min(b.afronding ?? 2, 6))));
  const burenVeld = (x: number, y: number, z: number) => {
    let d = y; // de vloer
    for (const p of buren) {
      const bx = Math.max(p.x0 - x, 0, x - p.x1), by = Math.max(p.y0 - y, 0, y - p.y1), bz = Math.max(p.z0 - z, 0, z - p.z1);
      if (d > 0 && bx * bx + by * by + bz * bz > d * d) continue;
      p.veld(x, y, z, uit);
      d = Math.min(d, uit[0]!);
    }
    return d;
  };
  const STAPPEN = [2, 4.5, 8, 13, 20], GEWICHT = [0.32, 0.26, 0.2, 0.13, 0.09];
  const aantalPunten = pos.length / 3;
  const schaduwPunt = new Float32Array(aantalPunten);
  for (let v = 0; v < aantalPunten; v++) {
    const x = pos[v * 3]!, y = pos[v * 3 + 1]!, z = pos[v * 3 + 2]!, ux = nor[v * 3]!, uy = nor[v * 3 + 1]!, uz = nor[v * 3 + 2]!;
    let dicht = 0;
    STAPPEN.forEach((h, s) => {
      const qx = x + ux * h, qy = y + uy * h, qz = z + uz * h;
      veld(qx, qy, qz, uit);
      const d = Math.min(uit[0]!, burenVeld(qx, qy, qz));
      dicht += (Math.max(0, h - d) / h) * GEWICHT[s]!;
    });
    schaduwPunt[v] = 1 - Math.min(0.62, dicht * 1.15);
  }

  // Uitvoer per driehoek, met textuurcoördinaten volgens de richting van de driehoek (zoals op de blokken, in cm).
  const t = drie.length / 3;
  const P = new Float32Array(t * 9), N = new Float32Array(t * 9), U = new Float32Array(t * 6), S = new Float32Array(t * 3);
  for (let d = 0; d < t; d++) {
    let a = drie[d * 3]!, b = drie[d * 3 + 1]!, c = drie[d * 3 + 2]!;
    // Draairichting volgens de normalen van het veld (naar buiten).
    const e1x = pos[b * 3]! - pos[a * 3]!, e1y = pos[b * 3 + 1]! - pos[a * 3 + 1]!, e1z = pos[b * 3 + 2]! - pos[a * 3 + 2]!;
    const e2x = pos[c * 3]! - pos[a * 3]!, e2y = pos[c * 3 + 1]! - pos[a * 3 + 1]!, e2z = pos[c * 3 + 2]! - pos[a * 3 + 2]!;
    const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
    const mx = nor[a * 3]! + nor[b * 3]! + nor[c * 3]!, my = nor[a * 3 + 1]! + nor[b * 3 + 1]! + nor[c * 3 + 1]!, mz = nor[a * 3 + 2]! + nor[b * 3 + 2]! + nor[c * 3 + 2]!;
    if (fx * mx + fy * my + fz * mz < 0) { const w = b; b = c; c = w; }
    const ax = Math.abs(fx), ay = Math.abs(fy), az = Math.abs(fz);
    const vlak = ay >= ax && ay >= az ? 1 : ax >= az ? 0 : 2;
    for (let h = 0; h < 3; h++) {
      const v = h === 0 ? a : h === 1 ? b : c, o = d * 3 + h;
      const x = pos[v * 3]!, y = pos[v * 3 + 1]!, z = pos[v * 3 + 2]!;
      P[o * 3] = x; P[o * 3 + 1] = y; P[o * 3 + 2] = z;
      N[o * 3] = nor[v * 3]!; N[o * 3 + 1] = nor[v * 3 + 1]!; N[o * 3 + 2] = nor[v * 3 + 2]!;
      U[o * 2] = (vlak === 0 ? z : x) / tegel;
      U[o * 2 + 1] = (vlak === 1 ? z : y) / tegel;
      S[o] = schaduwPunt[v]!;
    }
  }
  return { posities: P, normalen: N, uv: U, schaduw: S, driehoeken: t };
}
