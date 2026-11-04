/**
 * Ligging van een woning uit open kaartgegevens (Vlaanderen):
 * - adres → punt (Geopunt geolocatie, Lambert 72, meter);
 * - gebouwen en wegsegmenten rond dat punt (GRB);
 * - het gebouw bij het adres, de kleinste omhullende rechthoek (breedte en diepte)
 *   en de voorgevel: de zijde die naar de straat kijkt.
 *
 * Alleen rekenwerk: het ophalen gebeurt in de webdemo. Lambert 72: x = oost, y = noord (meter);
 * de afwijking t.o.v. het ware noorden is in Vlaanderen kleiner dan 1,5° en wordt verwaarloosd.
 */

export type XY = [number, number];
export type Ring = XY[];

export interface Rechthoek {
  midden: XY;
  /** Hoekpunten in tegenwijzerzin. */
  hoeken: XY[];
  /** Lengte van zijde i (van hoek i naar hoek i+1), in meter. */
  zijden: number[];
}

export interface Weg {
  lijn: XY[];
  naam: string;
}

export interface Ligging {
  /** Hoekpunten van het gebouw (buitenrand). */
  gebouw: Ring;
  rechthoek: Rechthoek;
  /** Index van de zijde van de rechthoek die de voorgevel is. */
  voorzijde: number;
  /** Azimut van de voorgevel (0 = zuid, −90 = oost, +90 = west). */
  azimut: number;
  /** Breedte van de voorgevel en diepte (cm). */
  breedte: number;
  diepte: number;
  /** De straat waarop de voorgevel uitkijkt, als die gevonden is. */
  straat: string;
  /** Afstand van de voorgevel tot de straat (m). */
  afstandStraat: number | null;
}

const kruis = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Convexe omhullende (monotone chain), tegenwijzerzin. */
export function omhullende(punten: XY[]): XY[] {
  const p = [...punten].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const onder: XY[] = [], boven: XY[] = [];
  for (const q of p) {
    while (onder.length >= 2 && kruis(onder[onder.length - 2]!, onder[onder.length - 1]!, q) <= 0) onder.pop();
    onder.push(q);
  }
  for (const q of [...p].reverse()) {
    while (boven.length >= 2 && kruis(boven[boven.length - 2]!, boven[boven.length - 1]!, q) <= 0) boven.pop();
    boven.push(q);
  }
  return [...onder.slice(0, -1), ...boven.slice(0, -1)];
}

/** Kleinste omhullende rechthoek (een zijde valt samen met een zijde van de omhullende). */
export function kleinsteRechthoek(ring: Ring): Rechthoek {
  const h = omhullende(ring);
  let beste: { opp: number; hoek: number; min: XY; max: XY } | null = null;
  for (let i = 0; i < h.length; i++) {
    const a = h[i]!, b = h[(i + 1) % h.length]!;
    const hoek = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const c = Math.cos(-hoek), s = Math.sin(-hoek);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of h) {
      const x = q[0] * c - q[1] * s, y = q[0] * s + q[1] * c;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    const opp = (x1 - x0) * (y1 - y0);
    if (!beste || opp < beste.opp - 1e-9) beste = { opp, hoek, min: [x0, y0], max: [x1, y1] };
  }
  if (!beste) throw new Error('Geen gebouwvorm');
  const c = Math.cos(beste.hoek), s = Math.sin(beste.hoek);
  const terug = (x: number, y: number): XY => [x * c - y * s, x * s + y * c];
  const [x0, y0] = beste.min, [x1, y1] = beste.max;
  const hoeken = [terug(x0, y0), terug(x1, y0), terug(x1, y1), terug(x0, y1)];
  const zijden = hoeken.map((q, i) => Math.hypot(hoeken[(i + 1) % 4]![0] - q[0], hoeken[(i + 1) % 4]![1] - q[1]));
  return { midden: terug((x0 + x1) / 2, (y0 + y1) / 2), hoeken, zijden };
}

/** Ligt het punt in de veelhoek? */
export function binnen(p: XY, ring: Ring): boolean {
  let in_ = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) in_ = !in_;
  }
  return in_;
}

/** Kortste afstand van een punt tot een lijnstuk, en het dichtste punt. */
function totLijnstuk(p: XY, a: XY, b: XY): { d: number; q: XY } {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  const q: XY = [a[0] + t * dx, a[1] + t * dy];
  return { d: Math.hypot(p[0] - q[0], p[1] - q[1]), q };
}

export function afstandTotRing(p: XY, ring: Ring): number {
  if (binnen(p, ring)) return 0;
  let d = Infinity;
  for (let i = 0; i < ring.length; i++) d = Math.min(d, totLijnstuk(p, ring[i]!, ring[(i + 1) % ring.length]!).d);
  return d;
}

/** Het gebouw waarin het adrespunt ligt, of anders het dichtste binnen 25 m. */
export function gebouwBijPunt(p: XY, gebouwen: Ring[]): Ring | null {
  let beste: Ring | null = null, d = 25;
  for (const g of gebouwen) {
    const a = afstandTotRing(p, g);
    if (a < d || (a === 0 && beste === null)) { d = a; beste = g; }
    if (a === 0) return g;
  }
  return beste;
}

/** Azimut van een richting (dx = oost, dy = noord): 0 = zuid, −90 = oost, +90 = west. */
export function azimutVan(dx: number, dy: number): number {
  const peiling = (Math.atan2(dx, dy) * 180) / Math.PI; // vanaf noord, met de klok mee
  let a = ((peiling - 180 + 540) % 360) - 180;
  if (a === -180) a = 180;
  return Math.round(a);
}

/** Naar buiten wijzende normaal van zijde i van een rechthoek in tegenwijzerzin. */
export function normaal(r: Rechthoek, i: number): XY {
  const a = r.hoeken[i]!, b = r.hoeken[(i + 1) % 4]!;
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[1] - a[1]) / l, -(b[0] - a[0]) / l];
}

/**
 * Bepaalt de ligging: rechthoek rond het gebouw en de voorgevel (de zijde die het best naar de
 * dichtstbijzijnde straat kijkt, bij voorkeur de straat van het adres).
 */
export function bepaalLigging(adres: XY, gebouwen: Ring[], wegen: Weg[], straatnaam = ''): Ligging | null {
  const gebouw = gebouwBijPunt(adres, gebouwen);
  if (!gebouw) return null;
  const r = kleinsteRechthoek(gebouw);
  const naam = straatnaam.trim().toLowerCase();
  // Dichtste punt op een weg, gemeten vanaf het midden van het gebouw. Voorkeur: de straat van het adres,
  // tenzij die veel verder ligt dan een andere straat met een naam (dan is het een hoekhuis of een fout in de
  // gegevens); fietspaden en opritten zonder naam alleen als er niets anders is.
  const dichtsteOp = (lijst: Weg[]) => {
    let d: { d: number; q: XY; naam: string } | null = null;
    for (const w of lijst) {
      for (let i = 0; i + 1 < w.lijn.length; i++) {
        const t = totLijnstuk(r.midden, w.lijn[i]!, w.lijn[i + 1]!);
        if (!d || t.d < d.d) d = { ...t, naam: w.naam };
      }
    }
    return d;
  };
  const eigen = naam ? dichtsteOp(wegen.filter((w) => w.naam.trim().toLowerCase() === naam)) : null;
  const benoemd = dichtsteOp(wegen.filter((w) => w.naam));
  const dichtst = eigen && (!benoemd || eigen.d <= benoemd.d + 30) ? eigen : benoemd ?? dichtsteOp(wegen);
  let voorzijde = 0;
  if (dichtst) {
    const dx = dichtst.q[0] - r.midden[0], dy = dichtst.q[1] - r.midden[1];
    let beste = -Infinity;
    for (let i = 0; i < 4; i++) {
      const n = normaal(r, i);
      const score = n[0] * dx + n[1] * dy;
      if (score > beste) { beste = score; voorzijde = i; }
    }
  } else {
    // Geen straat: neem de langste zijde naar het zuiden.
    let beste = -Infinity;
    for (let i = 0; i < 4; i++) {
      const score = -normaal(r, i)[1] + r.zijden[i]! / 1000;
      if (score > beste) { beste = score; voorzijde = i; }
    }
  }
  return ligVoorzijde(gebouw, r, voorzijde, dichtst ? { naam: dichtst.naam, q: dichtst.q } : null);
}

/** Ligging met een gekozen voorzijde (om de voorgevel met de hand te draaien). */
export function ligVoorzijde(gebouw: Ring, r: Rechthoek, voorzijde: number, straat: { naam: string; q: XY } | null): Ligging {
  const i = ((voorzijde % 4) + 4) % 4;
  const n = normaal(r, i);
  const a = r.hoeken[i]!, b = r.hoeken[(i + 1) % 4]!;
  const midden: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return {
    gebouw, rechthoek: r, voorzijde: i,
    azimut: azimutVan(n[0], n[1]),
    breedte: Math.round(r.zijden[i]! * 10) * 10,
    diepte: Math.round(r.zijden[(i + 1) % 4]! * 10) * 10,
    straat: straat?.naam && straat.naam !== 'nvt' ? straat.naam : '',
    afstandStraat: straat ? Math.round(Math.hypot(straat.q[0] - midden[0], straat.q[1] - midden[1])) : null,
  };
}

/** Buitenranden uit GeoJSON (Polygon en MultiPolygon). */
export function ringenUitGeoJson(fc: { features?: { geometry?: { type: string; coordinates: unknown } | null }[] }): Ring[] {
  const uit: Ring[] = [];
  for (const f of fc.features ?? []) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') uit.push((g.coordinates as XY[][])[0]!);
    if (g.type === 'MultiPolygon') for (const p of g.coordinates as XY[][][]) uit.push(p[0]!);
  }
  return uit;
}

/** Wegen uit GeoJSON-wegsegmenten van het GRB (straatnaam links of rechts). */
export function wegenUitGeoJson(fc: { features?: { geometry?: { type: string; coordinates: unknown } | null; properties?: Record<string, unknown> }[] }): Weg[] {
  const uit: Weg[] = [];
  for (const f of fc.features ?? []) {
    const g = f.geometry;
    if (!g) continue;
    const pr = f.properties ?? {};
    const naam = [pr.LSTRNM, pr.RSTRNM].find((x) => typeof x === 'string' && x && x !== 'nvt') as string | undefined ?? '';
    if (g.type === 'LineString') uit.push({ lijn: g.coordinates as XY[], naam });
    if (g.type === 'MultiLineString') for (const l of g.coordinates as XY[][]) uit.push({ lijn: l, naam });
  }
  return uit;
}
