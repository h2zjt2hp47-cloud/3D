/**
 * Dak uit het hoogtemodel van Vlaanderen (DHMV II, raster van 1 m, laserscan 2013–2015):
 * - een kleine lezer voor de GeoTIFF die de WCS-dienst teruggeeft (float32, niet gecomprimeerd);
 * - uit het oppervlak (DSM) en de grond (DTM) binnen de gebouwcontour: dakvorm, helling,
 *   goot- en nokhoogte, de richting van de dakvlakken, het hoofdvolume en een eventuele lage aanbouw.
 *
 * Coördinaten in Lambert 72 (meter). Hoogtes in meter boven het maaiveld.
 */
import { azimutVan, binnen, type Ring, type XY } from './ligging.js';
import { normHoek, type OmgevingsBlok } from './zon.js';

export interface Raster {
  breedte: number;
  hoogte: number;
  /** Linkerbovenhoek (Lambert 72) en celgrootte (m). */
  x0: number;
  y0: number;
  cel: number;
  data: Float32Array;
  geenWaarde: number | null;
}

/** Leest een GeoTIFF (ook binnen een "multipart"-antwoord van de WCS): één band, float32, zonder compressie. */
export function leesGeoTiff(bytes: Uint8Array): Raster {
  let start = -1;
  for (let i = 0; i + 3 < bytes.length; i++) {
    if ((bytes[i] === 0x49 && bytes[i + 1] === 0x49 && bytes[i + 2] === 0x2a && bytes[i + 3] === 0) || (bytes[i] === 0x4d && bytes[i + 1] === 0x4d && bytes[i + 2] === 0 && bytes[i + 3] === 0x2a)) { start = i; break; }
  }
  if (start < 0) throw new Error('Geen hoogtegegevens ontvangen (geen TIFF).');
  const v = new DataView(bytes.buffer, bytes.byteOffset + start, bytes.length - start);
  const le = v.getUint8(0) === 0x49;
  const u16 = (o: number) => v.getUint16(o, le), u32 = (o: number) => v.getUint32(o, le);
  const grootte: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 11: 4, 12: 8, 16: 8 };
  const ifd = u32(4);
  const n = u16(ifd);
  const tags = new Map<number, number[] | string>();
  for (let i = 0; i < n; i++) {
    const o = ifd + 2 + i * 12;
    const tag = u16(o), type = u16(o + 2), aantal = u32(o + 4);
    const lengte = (grootte[type] ?? 1) * aantal;
    const plek = lengte <= 4 ? o + 8 : u32(o + 8);
    if (type === 2) {
      let s = '';
      for (let k = 0; k < aantal - 1; k++) s += String.fromCharCode(v.getUint8(plek + k));
      tags.set(tag, s);
      continue;
    }
    const w: number[] = [];
    for (let k = 0; k < aantal; k++) {
      const p = plek + k * (grootte[type] ?? 1);
      w.push(type === 3 ? u16(p) : type === 4 ? u32(p) : type === 12 ? v.getFloat64(p, le) : type === 11 ? v.getFloat32(p, le) : v.getUint8(p));
    }
    tags.set(tag, w);
  }
  const getal = (t: number, i = 0) => (tags.get(t) as number[] | undefined)?.[i];
  const B = getal(256)!, H = getal(257)!;
  if ((getal(259) ?? 1) !== 1) throw new Error('Gecomprimeerde TIFF wordt niet ondersteund.');
  if ((getal(258) ?? 32) !== 32 || (getal(339) ?? 3) !== 3) throw new Error('Alleen float32-hoogtegegevens worden ondersteund.');
  const data = new Float32Array(B * H);
  const lees = (offset: number, kolom0: number, rij0: number, tb: number, th: number) => {
    for (let r = 0; r < th; r++) {
      for (let c = 0; c < tb; c++) {
        const rij = rij0 + r, kol = kolom0 + c;
        if (rij < H && kol < B) data[rij * B + kol] = v.getFloat32(offset + (r * tb + c) * 4, le);
      }
    }
  };
  const tegels = tags.get(324) as number[] | undefined;
  if (tegels) {
    const tb = getal(322)!, th = getal(323)!;
    const perRij = Math.ceil(B / tb);
    tegels.forEach((off, i) => lees(off, (i % perRij) * tb, Math.floor(i / perRij) * th, tb, th));
  } else {
    const stroken = tags.get(273) as number[];
    const rps = getal(278) ?? H;
    stroken.forEach((off, i) => lees(off, 0, i * rps, B, Math.min(rps, H - i * rps)));
  }
  const schaal = tags.get(33550) as number[];
  const punt = tags.get(33922) as number[];
  const nd = tags.get(42113);
  return {
    breedte: B, hoogte: H, cel: schaal[0]!,
    x0: punt[3]! - punt[0]! * schaal[0]!, y0: punt[4]! + punt[1]! * schaal[1]!,
    data, geenWaarde: typeof nd === 'string' && nd.trim() !== '' ? Number(nd) : null,
  };
}

/** Waarde van het raster op een punt, of null buiten het raster of zonder gegevens. */
export function waardeOp(r: Raster, x: number, y: number): number | null {
  const kol = Math.floor((x - r.x0) / r.cel), rij = Math.floor((r.y0 - y) / r.cel);
  if (kol < 0 || rij < 0 || kol >= r.breedte || rij >= r.hoogte) return null;
  const w = r.data[rij * r.breedte + kol]!;
  if (!Number.isFinite(w) || (r.geenWaarde !== null && Math.abs(w - r.geenWaarde) < 1e-3) || w < -500) return null;
  return w;
}

const mediaan = (a: number[]) => percentiel(a, 50);
function percentiel(a: number[], p: number): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const i = Math.min(s.length - 1, Math.max(0, Math.round(((s.length - 1) * p) / 100)));
  return s[i]!;
}
const rond = (x: number, d = 0) => Math.round(x * 10 ** d) / 10 ** d;

export interface DakAnalyse {
  dakvorm: 'zadel' | 'lessenaar' | 'plat';
  /** Graden. */
  helling: number;
  /** Meter boven het maaiveld. */
  goothoogte: number;
  nokhoogte: number;
  /** Oriëntatie van het voorste dakvlak (azimut, 0 = zuid). Bij een plat dak: de gekozen voorgevel. */
  azimut: number;
  /** Hoofdvolume (rechthoek in de richting van de dakvlakken), in meter. */
  midden: XY;
  breedte: number;
  diepte: number;
  /** Lage aanbouw naast of achter het hoofdvolume (in meter, t.o.v. het midden, in de assen van het hoofdvolume). */
  aanbouw: { x: number; z: number; breedte: number; diepte: number; hoogte: number } | null;
  /** Aandeel van de dakcellen dat bij de herkende dakvlakken hoort (0–1). */
  zekerheid: number;
  /** Aantal cellen (m²) binnen de contour. */
  cellen: number;
}

/** Eenheidsvector voor een azimut (x = oost, y = noord). */
export function richtingVan(azimut: number): XY {
  const peiling = ((normHoek(azimut) + 180) * Math.PI) / 180;
  return [Math.sin(peiling), Math.cos(peiling)];
}

/**
 * Herkent het dak van één gebouw. `voorkeur` is de oriëntatie van de voorgevel volgens de straat:
 * bij een zadeldak wordt het dakvlak aan die kant het "voorste" dakvlak.
 */
export function analyseerDak(ring: Ring, dsm: Raster, dtm: Raster, voorkeur: number): DakAnalyse | null {
  // Cellen binnen de contour (middelpunt van de cel), met de hoogte boven het maaiveld.
  const grond: number[] = [];
  const cellen: { x: number; y: number; h: number; kol: number; rij: number }[] = [];
  const index = new Map<number, number>();
  for (let rij = 0; rij < dsm.hoogte; rij++) {
    for (let kol = 0; kol < dsm.breedte; kol++) {
      const x = dsm.x0 + (kol + 0.5) * dsm.cel, y = dsm.y0 - (rij + 0.5) * dsm.cel;
      if (!binnen([x, y], ring)) continue;
      const g = waardeOp(dtm, x, y), d = waardeOp(dsm, x, y);
      if (g !== null) grond.push(g);
      if (d === null) continue;
      index.set(rij * dsm.breedte + kol, cellen.length);
      cellen.push({ x, y, h: d, kol, rij });
    }
  }
  if (cellen.length < 12 || !grond.length) return null;
  const maaiveld = mediaan(grond);
  for (const c of cellen) c.h -= maaiveld;

  // Delen van het gebouw: aaneengesloten cellen zonder sprong van meer dan 1,2 m (een schuin dak tot ±50°
  // blijft één deel; een plat dak op een andere hoogte wordt een apart deel).
  const deel = new Array<number>(cellen.length).fill(-1);
  const delen: number[][] = [];
  const buren = (i: number) => {
    const c = cellen[i]!;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dk, dr]) => index.get((c.rij + dr!) * dsm.breedte + c.kol + dk!)).filter((j): j is number => j !== undefined);
  };
  cellen.forEach((c, i) => {
    if (deel[i]! >= 0 || c.h < 1.5) return;
    const nr = delen.length, lijst = [i];
    deel[i] = nr;
    for (let k = 0; k < lijst.length; k++) {
      for (const j of buren(lijst[k]!)) {
        if (deel[j]! < 0 && cellen[j]!.h >= 1.5 && Math.abs(cellen[j]!.h - cellen[lijst[k]!]!.h) < 1.2) { deel[j] = nr; lijst.push(j); }
      }
    }
    delen.push(lijst);
  });
  // Hoofdvolume = het deel met het grootste volume (oppervlakte × hoogte): een hoog huis met een grotere
  // maar lage achterbouw blijft het huis.
  const volumeVan = (lijst: number[]) => lijst.length * mediaan(lijst.map((i) => cellen[i]!.h));
  delen.sort((x, y) => volumeVan(y) - volumeVan(x));
  const hoofdIdx = delen[0];
  if (!hoofdIdx || hoofdIdx.length < 12) return null;
  const hoofdNr = deel[hoofdIdx[0]!]!;
  const hoofd = hoofdIdx.map((i) => cellen[i]!);
  const hoofdNok = percentiel(hoofd.map((c) => c.h), 95);
  // Aanbouw: het grootste andere deel (in oppervlakte) van minstens 8 m².
  const rest = delen.slice(1).filter((x) => x.length >= 8).sort((x, y) => y.length - x.length);
  const tweede = rest[0] ? rest[0].map((i) => cellen[i]!) : null;
  const aanbouwCellen = tweede && mediaan(tweede.map((c) => c.h)) < hoofdNok - 1 ? tweede : null;

  // Helling en richting per cel van het hoofdvolume. Alleen waar het dak een vlak is: het verschil met de
  // buur links en rechts (en boven en onder) moet gelijk zijn, anders is het een rand of een sprong.
  const h = (c: (typeof cellen)[number], dk: number, dr: number) => {
    const i = index.get((c.rij + dr) * dsm.breedte + c.kol + dk);
    return i === undefined || deel[i] !== hoofdNr ? null : cellen[i]!.h;
  };
  type Cel = (typeof cellen)[number] & { helling: number; azimut: number };
  const schuin: Cel[] = [];
  let metHelling = 0;
  for (const c of hoofd) {
    const o = h(c, 1, 0), w = h(c, -1, 0), n = h(c, 0, -1), z = h(c, 0, 1);
    if (o === null || w === null || n === null || z === null) continue;
    if (Math.abs((o - c.h) - (c.h - w)) > 0.5 || Math.abs((n - c.h) - (c.h - z)) > 0.5) continue;
    metHelling++;
    const gx = (o - w) / (2 * dsm.cel), gy = (n - z) / (2 * dsm.cel);
    const helling = (Math.atan(Math.hypot(gx, gy)) * 180) / Math.PI;
    if (helling >= 12 && helling <= 65) schuin.push({ ...c, helling, azimut: azimutVan(-gx, -gy) });
  }

  // Histogram van de richtingen (per 10°).
  const hist = new Array(36).fill(0) as number[];
  for (const c of schuin) hist[Math.floor((normHoek(c.azimut) + 180) / 10) % 36]!++;
  const glad = hist.map((_, i) => hist[(i + 35) % 36]! + hist[i]! + hist[(i + 1) % 36]!);
  const piek1 = glad.indexOf(Math.max(...glad));
  let piek2 = -1;
  glad.forEach((w, i) => {
    const afstand = Math.min(Math.abs(i - piek1), 36 - Math.abs(i - piek1));
    if (afstand >= 14 && (piek2 < 0 || w > glad[piek2]!)) piek2 = i;
  });
  // Richting van een piek: gemiddelde richting van de cellen binnen ±20° van het midden van het vak.
  const azimutPiek = (i: number) => {
    const m = normHoek(i * 10 - 180 + 5);
    let sx = 0, sy = 0;
    for (const c of schuin) if (Math.abs(normHoek(c.azimut - m)) <= 20) { sx += Math.sin((c.azimut * Math.PI) / 180); sy += Math.cos((c.azimut * Math.PI) / 180); }
    return sx || sy ? normHoek((Math.atan2(sx, sy) * 180) / Math.PI) : m;
  };
  const schuinDeel = metHelling ? schuin.length / metHelling : 0;
  const besteHoek = (doel: number, kandidaten: number[]) => kandidaten.reduce((a, b) => (Math.abs(normHoek(b - doel)) < Math.abs(normHoek(a - doel)) ? b : a));

  if (schuinDeel < 0.35 || glad[piek1]! < 6) {
    // Plat dak: rechthoek rond het hoofdvolume in de richting van de voorkeur.
    const vlakken = [voorkeur, voorkeur + 90, voorkeur + 180, voorkeur - 90];
    return volume(hoofd, 'plat', 0, normHoek(besteHoek(voorkeur, vlakken)), mediaan(hoofd.map((c) => c.h)), 1, cellen.length, aanbouwCellen);
  }

  const a1 = azimutPiek(piek1);
  const tweeVlakken = piek2 >= 0 && glad[piek2]! >= glad[piek1]! * 0.3 && Math.abs(Math.abs(normHoek(azimutPiek(piek2) - a1)) - 180) <= 40;
  const dakvorm = tweeVlakken ? 'zadel' : 'lessenaar';
  const richtingen = tweeVlakken ? [a1, azimutPiek(piek2)] : [a1];
  // Voorste dakvlak: bij een zadeldak het vlak aan de kant van de straat; bij een lessenaarsdak het enige vlak.
  const voor = tweeVlakken ? besteHoek(voorkeur, richtingen) : a1;
  const hoort = schuin.filter((c) => richtingen.some((r) => Math.abs(normHoek(c.azimut - r)) <= 35));
  const helling = mediaan(hoort.map((c) => c.helling));
  // De rechthoek omvat het hele hoofdvolume (ook de nok en de randen, die geen helling kregen).
  // Goothoogte gemeten: de laagste cellen van de dakvlakken (5e percentiel).
  const gemetenGoot = percentiel(hoort.map((c) => c.h), 5);
  return volume(hoofd, dakvorm, helling, voor, gemetenGoot, hoort.length / Math.max(1, metHelling), cellen.length, aanbouwCellen);
}

/** Rechthoek rond de dakcellen in de richting van het dak, goot- en nokhoogte, aanbouw. */
function volume(
  dak: { x: number; y: number; h: number }[], dakvorm: DakAnalyse['dakvorm'], helling: number, azimut: number,
  vlakHoogte: number, zekerheid: number, aantal: number, aanbouwCellen: { x: number; y: number; h: number }[] | null,
): DakAnalyse {
  const n = richtingVan(azimut);
  const xr: XY = [-n[1], n[0]];
  const d = (p: { x: number; y: number }) => p.x * n[0] + p.y * n[1];
  const w = (p: { x: number; y: number }) => p.x * xr[0] + p.y * xr[1];
  // Rand van de cellen: een halve cel naar buiten.
  const kader = (lijst: { x: number; y: number }[]) => {
    const ds = lijst.map(d), ws = lijst.map(w);
    return { dMin: Math.min(...ds) - 0.5, dMax: Math.max(...ds) + 0.5, wMin: Math.min(...ws) - 0.5, wMax: Math.max(...ws) + 0.5 };
  };
  const k = kader(dak);
  const dm = (k.dMin + k.dMax) / 2, wm = (k.wMin + k.wMax) / 2;
  const midden: XY = [n[0] * dm + xr[0] * wm, n[1] * dm + xr[1] * wm];
  const breedte = k.wMax - k.wMin;
  let diepte = k.dMax - k.dMin;
  const t = Math.tan((helling * Math.PI) / 180);
  let nok = percentiel(dak.map((c) => c.h), 95);
  let goot = vlakHoogte;
  if (dakvorm === 'plat') nok = vlakHoogte;
  else {
    // vlakHoogte is hier de gemeten goothoogte. Het hoofdvolume kan lage delen meenemen (een aanbouw die
    // zonder sprong aansluit): dan is de diepte groter dan wat goot, nok en helling toelaten.
    // De laagste bruikbare dakcellen liggen anderhalve cel boven de goot (de cel aan de rand valt weg).
    goot = Math.max(2, Math.min(goot - t * 1.5, nok - 0.5));
    const dakDiepte = ((nok - goot) / Math.max(0.05, t)) * (dakvorm === 'zadel' ? 2 : 1) + 0.6;
    diepte = Math.min(diepte, dakDiepte);
  }

  let aanbouw: DakAnalyse['aanbouw'] = null;
  if (aanbouwCellen) {
    const a = kader(aanbouwCellen);
    aanbouw = {
      x: rond((a.wMin + a.wMax) / 2 - wm, 2), z: rond((a.dMin + a.dMax) / 2 - dm, 2),
      breedte: rond(a.wMax - a.wMin, 2), diepte: rond(a.dMax - a.dMin, 2), hoogte: rond(mediaan(aanbouwCellen.map((c) => c.h)), 2),
    };
  }
  return {
    dakvorm, helling: Math.round(helling), goothoogte: rond(goot, 2), nokhoogte: rond(nok, 2),
    azimut: Math.round(normHoek(azimut)), midden, breedte: rond(breedte, 2), diepte: rond(diepte, 2), aanbouw,
    zekerheid: rond(zekerheid, 2), cellen: aantal,
  };
}

/**
 * De buren als blokken voor de 3D, in de assen van de woning (cm). Elk gebouw krijgt dezelfde dakherkenning
 * als de woning zelf: hoofdvolume met zijn dak en een lage aanbouw (een GRB-contour bevat vaak beide).
 * Lukt dat niet, dan de contour met de middelste hoogte.
 */
export function omgevingVan(ringen: Ring[], dsm: Raster, dtm: Raster, midden: XY, orientatie: number, voorkeur = orientatie): OmgevingsBlok[] {
  const blokken: OmgevingsBlok[] = [];
  const cm = (m: number) => Math.round(m * 100);
  const lokaalHoek = (azimut: number) => {
    const n = richtingVan(azimut);
    const [lx, lz] = naarLokaal([midden[0] + n[0], midden[1] + n[1]], midden, orientatie);
    return Math.round(Math.atan2(lx, lz) * 1000) / 1000;
  };
  for (const ring of ringen) {
    const a = analyseerDak(ring, dsm, dtm, voorkeur);
    if (a) {
      const [x, z] = naarLokaal(a.midden, midden, orientatie);
      const draai = lokaalHoek(a.azimut);
      blokken.push({ x, z, breedte: cm(a.breedte), diepte: cm(a.diepte), draai, goot: cm(a.goothoogte), nok: cm(a.nokhoogte), dakvorm: a.dakvorm });
      if (a.aanbouw) {
        const n = richtingVan(a.azimut), xr: XY = [-n[1], n[0]];
        const m: XY = [a.midden[0] + xr[0] * a.aanbouw.x + n[0] * a.aanbouw.z, a.midden[1] + xr[1] * a.aanbouw.x + n[1] * a.aanbouw.z];
        const [ax, az] = naarLokaal(m, midden, orientatie);
        blokken.push({ x: ax, z: az, breedte: cm(a.aanbouw.breedte), diepte: cm(a.aanbouw.diepte), draai, goot: cm(a.aanbouw.hoogte), nok: cm(a.aanbouw.hoogte), dakvorm: 'plat' });
      }
      continue;
    }
    const h = gebouwHoogte(ring, dsm, dtm, 50);
    if (h !== null) blokken.push({ ring: ring.map((p) => naarLokaal(p, midden, orientatie)), hoogte: cm(h) });
  }
  return blokken;
}

/** Hoogte van een gebouw boven het maaiveld (standaard het 90e percentiel van het oppervlak). */
export function gebouwHoogte(ring: Ring, dsm: Raster, dtm: Raster, p = 90): number | null {
  const h: number[] = [], g: number[] = [];
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  for (let x = Math.floor(Math.min(...xs)) + 0.5; x < Math.max(...xs); x += dsm.cel) {
    for (let y = Math.floor(Math.min(...ys)) + 0.5; y < Math.max(...ys); y += dsm.cel) {
      if (!binnen([x, y], ring)) continue;
      const a = waardeOp(dsm, x, y), b = waardeOp(dtm, x, y);
      if (a !== null) h.push(a);
      if (b !== null) g.push(b);
    }
  }
  if (h.length < 3 || !g.length) return null;
  return rond(Math.max(2.5, percentiel(h, p) - mediaan(g)), 1);
}

/** Lambert 72 → assen van de woning (cm): oorsprong = midden, +z = voorgevel, +x = rechts gezien van buiten. */
export function naarLokaal(p: XY, midden: XY, voorgevel: number): [number, number] {
  const n = richtingVan(voorgevel);
  const xr: XY = [-n[1], n[0]];
  const dx = p[0] - midden[0], dy = p[1] - midden[1];
  return [Math.round((dx * xr[0] + dy * xr[1]) * 100) + 0, Math.round((dx * n[0] + dy * n[1]) * 100) + 0];
}
