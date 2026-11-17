// Maakt de kaart van Belgica: ±250 vakken over België en de randen.
//
// Bron: Natural Earth (publiek domein), via GitHub. Wat er niet in staat
// (kleinere rivieren, plaatsnamen, terrein) is met de hand toegevoegd en is een
// BENADERING (zie `rivierenMetDeHand`, `plaatsen`, `terreinVan`).
//
// Gebruik: npm run kaart            (haalt de gegevens op als ze er nog niet zijn)
// Uitvoer: src/kaart/vakken.json
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Delaunay } from 'd3-delaunay';
import pc from 'polygon-clipping';

const AANTAL_VAKKEN = 250;
const LLOYD_RONDES = 8;
const BRON = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const MAP = process.env.NE_MAP ?? path.join(os.tmpdir(), 'belgica-natural-earth');
const UIT = path.resolve('src/kaart/vakken.json');

// ---------- projectie: km rond het midden van het gebied ----------
const LON0 = 4.4, LAT0 = 50.4;
const KX = 111.32 * Math.cos((LAT0 * Math.PI) / 180), KY = 110.57;
const proj = ([lon, lat]) => [(lon - LON0) * KX, -(lat - LAT0) * KY];
const terug = ([x, y]) => [x / KX + LON0, -y / KY + LAT0];
const r1 = (v) => Math.round(v * 10) / 10;

// ---------- willekeur met vaste zaad ----------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(1830);

// ---------- gegevens ophalen ----------
async function haal(naam) {
  fs.mkdirSync(MAP, { recursive: true });
  const bestand = path.join(MAP, naam + '.geojson');
  if (!fs.existsSync(bestand)) {
    console.log('ophalen', naam);
    const r = await fetch(`${BRON}/${naam}.geojson`);
    if (!r.ok) throw new Error(`${naam}: ${r.status}`);
    fs.writeFileSync(bestand, Buffer.from(await r.arrayBuffer()));
  }
  return JSON.parse(fs.readFileSync(bestand, 'utf8'));
}

const polygonen = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
const lijnen = (g) => (g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []);
const projPoly = (poly) => poly.map((ring) => ring.map(proj));

// ---------- meetkunde ----------
function oppervlakteRing(ring) {
  let s = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % n];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}
function zwaartepunt(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % n];
    const f = x1 * y2 - x2 * y1;
    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-9) return ring[0];
  return [cx / (3 * a), cy / (3 * a)];
}
function inRing(p, ring) {
  let binnen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) binnen = !binnen;
  }
  return binnen;
}
const inPoly = (p, poly) => inRing(p, poly[0]) && !poly.slice(1).some((gat) => inRing(p, gat));
const inMulti = (p, mp) => mp.some((poly) => inPoly(p, poly));
function snijden(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function vereenvoudig(punten, tol) {
  if (punten.length < 4) return punten;
  const eerste = punten[0], laatste = punten[punten.length - 1];
  if (eerste[0] === laatste[0] && eerste[1] === laatste[1]) {
    // gesloten ring: in twee helften knippen, anders valt alles weg
    const m = punten.length >> 1;
    return [...vereenvoudig(punten.slice(0, m + 1), tol).slice(0, -1), ...vereenvoudig(punten.slice(m), tol)];
  }
  const houd = new Uint8Array(punten.length);
  houd[0] = houd[punten.length - 1] = 1;
  const stapel = [[0, punten.length - 1]];
  while (stapel.length) {
    const [a, b] = stapel.pop();
    let max = 0, idx = -1;
    const [ax, ay] = punten[a], [bx, by] = punten[b];
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * punten[i][0] - dx * punten[i][1] + bx * ay - by * ax) / l;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) { houd[idx] = 1; stapel.push([a, idx], [idx, b]); }
  }
  return punten.filter((_, i) => houd[i]);
}

// ---------- met de hand: plaatsen (benadering, enkel voor namen) ----------
// [naam, breedte, lengte, belangrijk]: belangrijke plaatsen krijgen een eigen vak.
const plaatsen = [
  ['Brugge', 51.209, 3.225, 1], ['Gent', 51.054, 3.717, 1], ['Antwerpen', 51.219, 4.402, 1], ['Brussel', 50.847, 4.357, 1],
  ['Leuven', 50.879, 4.7, 1], ['Mechelen', 51.026, 4.478, 1], ['Luik', 50.633, 5.567, 1], ['Namen', 50.465, 4.867, 1],
  ['Bergen', 50.454, 3.952, 1], ['Doornik', 50.606, 3.388, 1], ['Charleroi', 50.411, 4.444, 1], ['Kortrijk', 50.828, 3.265, 1],
  ['Ieper', 50.851, 2.886, 1], ['Hasselt', 50.93, 5.338, 1], ['Tongeren', 50.781, 5.464, 1], ['Aarlen', 49.683, 5.817, 1],
  ['Maastricht', 50.851, 5.691, 1], ['Luxemburg', 49.611, 6.13, 1], ['Rijsel', 50.629, 3.057, 1], ['Atrecht', 50.291, 2.777, 1],
  ['Kamerijk', 50.176, 3.235, 1], ['Valencijn', 50.358, 3.524, 1], ['Duinkerke', 51.034, 2.377, 1], ['Sint-Omaars', 50.75, 2.252, 1],
  ['Boulogne', 50.726, 1.614, 1], ['Laon', 49.564, 3.62, 1], ['Saint-Quentin', 49.848, 3.287, 1], ['Sedan', 49.702, 4.94, 1],
  ['Charleville', 49.762, 4.726, 1], ['Bastenaken', 50.003, 5.719, 1], ['Dinant', 50.261, 4.912, 1], ['Hoei', 50.518, 5.24, 1],
  ['Aalst', 50.938, 4.039, 1], ['Oudenaarde', 50.845, 3.605, 1], ['Turnhout', 51.323, 4.945, 1], ['Roermond', 51.194, 5.987, 1],
  ['Soissons', 49.381, 3.323, 1], ['Kales', 50.951, 1.858, 1], ['Douai', 50.371, 3.08, 1], ['Oostende', 51.215, 2.927, 1],
  ['Nieuwpoort', 51.13, 2.751, 0], ['Diksmuide', 51.032, 2.864, 0], ['Poperinge', 50.855, 2.726, 0], ['Roeselare', 50.946, 3.123, 0],
  ['Tielt', 50.999, 3.327, 0], ['Torhout', 51.066, 3.101, 0], ['Eeklo', 51.187, 3.556, 0], ['Ronse', 50.746, 3.601, 0],
  ['Dendermonde', 51.028, 4.101, 0], ['Sint-Niklaas', 51.165, 4.143, 0], ['Lokeren', 51.104, 3.993, 0], ['Geraardsbergen', 50.773, 3.882, 0],
  ['Ninove', 50.828, 4.025, 0], ['Lier', 51.131, 4.57, 0], ['Herentals', 51.177, 4.836, 0], ['Geel', 51.162, 4.99, 0],
  ['Mol', 51.191, 5.116, 0], ['Hoogstraten', 51.4, 4.76, 0], ['Halle', 50.734, 4.237, 0], ['Tienen', 50.807, 4.938, 0],
  ['Aarschot', 50.987, 4.836, 0], ['Diest', 50.989, 5.051, 0], ['Vilvoorde', 50.928, 4.425, 0], ['Waver', 50.717, 4.612, 0],
  ['Nijvel', 50.598, 4.328, 0], ['Geldenaken', 50.723, 4.869, 0], ['Genk', 50.965, 5.5, 0], ['Sint-Truiden', 50.816, 5.186, 0],
  ['Maaseik', 51.098, 5.783, 0], ['Lommel', 51.23, 5.313, 0], ['Beringen', 51.049, 5.226, 0], ['Bilzen', 50.872, 5.518, 0],
  ['Verviers', 50.589, 5.862, 0], ['Spa', 50.492, 5.864, 0], ['Malmedy', 50.426, 6.028, 0], ['Eupen', 50.629, 6.035, 0],
  ['Sankt Vith', 50.283, 6.127, 0], ['Borgworm', 50.697, 5.255, 0], ['Wezet', 50.737, 5.692, 0], ['Virton', 49.567, 5.533, 0],
  ['Neufchâteau', 49.841, 5.435, 0], ['Marche', 50.227, 5.344, 0], ['Durbuy', 50.352, 5.456, 0], ['La Roche', 50.183, 5.576, 0],
  ['Houffalize', 50.133, 5.79, 0], ['Bouillon', 49.794, 5.068, 0], ['Saint-Hubert', 50.027, 5.374, 0], ['Libramont', 49.92, 5.38, 0],
  ['Ciney', 50.295, 5.1, 0], ['Philippeville', 50.196, 4.543, 0], ['Couvin', 50.053, 4.495, 0], ['Gembloers', 50.561, 4.692, 0],
  ['Andenne', 50.489, 5.096, 0], ['Rochefort', 50.161, 5.222, 0], ['Beauraing', 50.11, 4.957, 0], ['Gedinne', 49.983, 4.937, 0],
  ['Aat', 50.629, 3.778, 0], ['Zinnik', 50.578, 4.071, 0], ['La Louvière', 50.479, 4.187, 0], ['Thuin', 50.339, 4.287, 0],
  ['Chimay', 50.048, 4.317, 0], ['Binche', 50.411, 4.165, 0], ['Moeskroen', 50.743, 3.214, 0], ['Komen', 50.776, 3.003, 0],
  ['Péruwelz', 50.509, 3.592, 0], ['Edingen', 50.697, 4.051, 0], ['Beaumont', 50.236, 4.239, 0], ['Lessen', 50.712, 3.835, 0],
  ['Venlo', 51.37, 6.172, 0], ['Heerlen', 50.888, 5.98, 0], ['Sittard', 50.998, 5.869, 0], ['Weert', 51.252, 5.707, 0],
  ['Venray', 51.525, 5.974, 0], ['Gennep', 51.698, 5.973, 0], ['Sluis', 51.309, 3.386, 0], ['Terneuzen', 51.336, 3.828, 0],
  ['Hulst', 51.28, 4.053, 0], ['Diekirch', 49.868, 6.159, 0], ['Grevenmacher', 49.68, 6.441, 0], ['Esch', 49.495, 5.981, 0],
  ['Clervaux', 50.055, 6.031, 0], ['Wiltz', 49.966, 5.932, 0], ['Echternach', 49.812, 6.418, 0], ['Mersch', 49.749, 6.106, 0],
  ['Kassel', 50.8, 2.488, 0], ['Hazebroek', 50.725, 2.539, 0], ['Belle', 50.739, 2.734, 0], ['Maubeuge', 50.278, 3.973, 0],
  ['Avesnes', 50.124, 3.928, 0], ['Le Cateau', 50.104, 3.542, 0], ['Armentières', 50.688, 2.881, 0], ['Robaais', 50.69, 3.182, 0],
  ['Sint-Winoksbergen', 50.968, 2.432, 0], ['Grevelingen', 50.986, 2.128, 0], ['Fourmies', 50.017, 4.054, 0], ['Landrecies', 50.125, 3.692, 0],
  ['Terwaan', 50.637, 2.258, 0], ['Béthune', 50.53, 2.64, 0], ['Lens', 50.432, 2.833, 0], ['Montreuil', 50.464, 1.764, 0],
  ['Hesdin', 50.373, 2.038, 0], ['Saint-Pol', 50.381, 2.336, 0], ['Bapaume', 50.103, 2.849, 0], ['Aire', 50.639, 2.396, 0],
  ['Berck', 50.408, 1.592, 0], ['Rethel', 49.509, 4.367, 0], ['Givet', 50.138, 4.825, 0], ['Rocroi', 49.926, 4.522, 0],
  ['Vouziers', 49.398, 4.701, 0], ['Carignan', 49.632, 5.17, 0], ['Château-Thierry', 49.046, 3.403, 0], ['Guise', 49.9, 3.627, 0],
  ['Vervins', 49.835, 3.909, 0], ['Hirson', 49.922, 4.084, 0], ['Chauny', 49.616, 3.219, 0], ['Berry-au-Bac', 49.4, 3.9, 0],
  ['Signy', 49.7, 4.418, 0], ['Fismes', 49.308, 3.686, 0], ['Villers-Cotterêts', 49.253, 3.09, 0], ['Marle', 49.739, 3.772, 0],
];

// ---------- met de hand: rivieren die niet in Natural Earth staan (benadering) ----------
const rivierenMetDeHand = {
  Leie: [[50.5, 2.21], [50.639, 2.396], [50.688, 2.881], [50.78, 3.12], [50.828, 3.265], [50.86, 3.31], [50.98, 3.53], [51.054, 3.717]],
  Samber: [[50.0, 3.75], [50.125, 3.692], [50.278, 3.973], [50.339, 4.287], [50.411, 4.444], [50.465, 4.867]],
  IJzer: [[50.8, 2.33], [50.92, 2.62], [51.032, 2.864], [51.13, 2.751]],
  Dender: [[50.629, 3.778], [50.773, 3.882], [50.828, 4.025], [50.938, 4.039], [51.028, 4.101]],
  Zenne: [[50.578, 4.071], [50.734, 4.237], [50.847, 4.357], [50.928, 4.425], [51.03, 4.44]],
  Dijle: [[50.6, 4.6], [50.717, 4.612], [50.879, 4.7], [51.026, 4.478], [51.08, 4.42], [51.1, 4.33]],
  Demer: [[50.872, 5.518], [50.93, 5.338], [50.989, 5.051], [50.987, 4.836], [50.97, 4.7]],
  Ourthe: [[50.133, 5.79], [50.183, 5.576], [50.352, 5.456], [50.53, 5.57], [50.633, 5.567]],
  Vesder: [[50.629, 6.035], [50.589, 5.862], [50.58, 5.64], [50.62, 5.58]],
  Semois: [[49.68, 5.75], [49.7, 5.31], [49.794, 5.068], [49.88, 4.73]],
  Scarpe: [[50.291, 2.777], [50.371, 3.08], [50.5, 3.46]],
  Aisne: [[49.09, 4.9], [49.398, 4.701], [49.509, 4.367], [49.4, 3.9], [49.381, 3.323], [49.42, 2.83]],
  Oise: [[49.922, 4.084], [49.9, 3.627], [49.66, 3.37], [49.616, 3.219], [49.58, 3.0]],
  Alzette: [[49.495, 5.981], [49.611, 6.13], [49.749, 6.106], [49.85, 6.1]],
};

// ---------- gebied: België plus de randen ----------
function hoortErbij(p) {
  const land = p.adm0_a3;
  if (land === 'BEL' || land === 'LUX') return true;
  if (land === 'NLD') return p.name === 'Limburg' || p.name === 'Zeeland';
  if (land === 'FRA') return ['Nord', 'Pas-de-Calais', 'Ardennes', 'Aisne'].includes(p.name);
  return false;
}
const NAAM_NL = {
  'West Flanders': 'West-Vlaanderen', 'East Flanders': 'Oost-Vlaanderen', Antwerp: 'Antwerpen', 'Flemish Brabant': 'Vlaams-Brabant',
  'Walloon Brabant': 'Waals-Brabant', 'Brussels Capital Region': 'Brussel', Hainaut: 'Henegouwen', Namur: 'Namen', Liege: 'Luik',
  Luxembourg: 'Luxemburg', Limburg: 'Limburg', 'Diekirch District': 'Groothertogdom Luxemburg', 'Grevenmacher District': 'Groothertogdom Luxemburg',
  'Luxembourg District': 'Groothertogdom Luxemburg', Zeeland: 'Zeeuws-Vlaanderen', Nord: 'Frans-Vlaanderen en Henegouwen',
  'Pas-de-Calais': 'Artesië', Ardennes: 'Franse Ardennen', Aisne: 'Aisne',
};

async function main() {
  const admin1 = await haal('ne_10m_admin_1_states_provinces');
  const landen = await haal('ne_10m_admin_0_countries');
  const rivNE = await haal('ne_10m_rivers_lake_centerlines');
  const rivEU = await haal('ne_10m_rivers_europe');
  const regios = await haal('ne_10m_geography_regions_polys');

  // gebieden (provincies van nu) in km
  const gebieden = [];
  for (const f of admin1.features) {
    const p = f.properties;
    if (!hoortErbij(p)) continue;
    let polys = polygonen(f.geometry).map(projPoly);
    if (p.adm0_a3 === 'NLD' && p.name === 'Zeeland') {
      // enkel Zeeuws-Vlaanderen: het deel ten zuiden van de Westerschelde
      polys = polys.filter((poly) => terug(zwaartepunt(poly[0]))[1] < 51.4);
    }
    const naam = p.adm0_a3 === 'NLD' && p.name === 'Limburg' ? 'Nederlands-Limburg' : NAAM_NL[p.name] ?? p.name;
    gebieden.push({ naam, land: p.adm0_a3, polys });
  }
  const land = pc.union(...gebieden.map((g) => g.polys));

  // buitenland: de buurlanden in beeld, zonder ons gebied
  const RAND = { minLon: 1.2, maxLon: 7.2, minLat: 48.7, maxLat: 51.95 };
  const kader = [[proj([RAND.minLon, RAND.minLat]), proj([RAND.maxLon, RAND.minLat]), proj([RAND.maxLon, RAND.maxLat]), proj([RAND.minLon, RAND.maxLat]), proj([RAND.minLon, RAND.minLat])]];
  const alleLanden = [];
  for (const f of landen.features) {
    if (!['FRA', 'BEL', 'NLD', 'DEU', 'LUX', 'GBR'].includes(f.properties.ADM0_A3)) continue;
    for (const poly of polygonen(f.geometry)) alleLanden.push(projPoly(poly));
  }
  const vasteland = pc.intersection(pc.union(...alleLanden.map((p) => [p])), kader);
  const buitenland = pc.difference(vasteland, land);

  // het Ardennenmassief uit Natural Earth
  const ardennen = regios.features.filter((f) => f.properties.NAME === 'Ardennes').flatMap((f) => polygonen(f.geometry).map(projPoly));

  // ---------- zaadpunten: belangrijke plaatsen vast, de rest willekeurig, daarna gelijkmatig ----------
  const xs = land.flatMap((p) => p[0].map((q) => q[0])), ys = land.flatMap((p) => p[0].map((q) => q[1]));
  const box = [Math.min(...xs) - 5, Math.min(...ys) - 5, Math.max(...xs) + 5, Math.max(...ys) + 5];
  const vast = plaatsen.filter((p) => p[3]).map((p) => proj([p[2], p[1]])).filter((p) => inMulti(p, land));
  const punten = [...vast];
  while (punten.length < AANTAL_VAKKEN) {
    const p = [box[0] + rnd() * (box[2] - box[0]), box[1] + rnd() * (box[3] - box[1])];
    if (inMulti(p, land)) punten.push(p);
  }
  for (let ronde = 0; ronde < LLOYD_RONDES; ronde++) {
    const v = Delaunay.from(punten).voronoi(box);
    for (let i = vast.length; i < punten.length; i++) {
      const cel = v.cellPolygon(i);
      if (!cel) continue;
      const stuk = pc.intersection(land, [cel]);
      let beste = null, max = 0;
      for (const poly of stuk) {
        const a = Math.abs(oppervlakteRing(poly[0]));
        if (a > max) { max = a; beste = poly[0]; }
      }
      if (beste) punten[i] = zwaartepunt(beste);
    }
  }

  // ---------- grillige randen: elke gedeelde rand krijgt dezelfde bochten aan beide kanten ----------
  const voronoi = Delaunay.from(punten).voronoi(box);
  const randen = new Map();
  const sleutel = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  function bochtigeRand(a, b) {
    const ka = sleutel(a), kb = sleutel(b);
    const omgekeerd = ka > kb;
    const k = omgekeerd ? kb + '|' + ka : ka + '|' + kb;
    if (!randen.has(k)) {
      const [p, q] = omgekeerd ? [b, a] : [a, b];
      let h = 0;
      for (const c of k) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
      const r = mulberry32(h);
      let lijn = [p, q];
      for (let diepte = 0; diepte < 3; diepte++) {
        const nieuw = [lijn[0]];
        for (let i = 1; i < lijn.length; i++) {
          const [x1, y1] = lijn[i - 1], [x2, y2] = lijn[i];
          const dx = x2 - x1, dy = y2 - y1;
          const d = (r() - 0.5) * 0.32 * (diepte === 0 ? 0.8 : 1);
          nieuw.push([(x1 + x2) / 2 - dy * d, (y1 + y2) / 2 + dx * d], lijn[i]);
        }
        lijn = nieuw;
      }
      randen.set(k, { punten: lijn, cellen: [] });
    }
    const rand = randen.get(k);
    return { rand, punten: omgekeerd ? [...rand.punten].reverse() : rand.punten };
  }

  const vakken = [];
  const celNaarVak = new Map();
  for (let i = 0; i < punten.length; i++) {
    const cel = voronoi.cellPolygon(i);
    if (!cel) continue;
    const ring = [];
    for (let j = 0; j + 1 < cel.length; j++) {
      const { rand, punten: lijn } = bochtigeRand(cel[j], cel[j + 1]);
      rand.cellen.push(i);
      ring.push(...lijn.slice(0, -1));
    }
    ring.push(ring[0]);
    let stuk;
    try { stuk = pc.intersection(land, [[ring]]); } catch { stuk = pc.intersection(land, [cel]); }
    if (!stuk.length) continue;
    const stukken = stuk.map((poly) => poly[0]).sort((a, b) => Math.abs(oppervlakteRing(b)) - Math.abs(oppervlakteRing(a)));
    const opp = stukken.reduce((s, r) => s + Math.abs(oppervlakteRing(r)), 0);
    const midden = zwaartepunt(stukken[0]);
    celNaarVak.set(i, vakken.length);
    vakken.push({ cel: i, stukken, opp, midden: inRing(midden, stukken[0]) ? midden : punten[i] });
  }

  // ---------- buren: gedeelde rand die (deels) op het land ligt ----------
  const buren = vakken.map(() => new Set());
  const gedeeld = [];
  for (const rand of randen.values()) {
    const [a, b] = rand.cellen;
    if (rand.cellen.length !== 2 || !celNaarVak.has(a) || !celNaarVak.has(b)) continue;
    const va = celNaarVak.get(a), vb = celNaarVak.get(b);
    const opLand = rand.punten.filter((p) => inMulti(p, land)).length;
    if (opLand >= 2) { buren[va].add(vb); buren[vb].add(va); }
    // het stuk van de rand dat op het land ligt, om grenzen te tekenen
    let stuk = [], langste = [];
    for (const p of rand.punten) {
      if (inMulti(p, land)) stuk.push(p);
      else { if (stuk.length > langste.length) langste = stuk; stuk = []; }
    }
    if (stuk.length > langste.length) langste = stuk;
    if (langste.length >= 2) gedeeld.push({ a: va, b: vb, p: vereenvoudig(langste, 0.15).map((q) => q.map(r1)) });
  }

  // ---------- rivieren ----------
  const rivieren = [];
  const inBeeld = ([lon, lat]) => lon > RAND.minLon && lon < RAND.maxLon && lat > RAND.minLat && lat < RAND.maxLat;
  for (const bron of [rivNE, rivEU]) {
    for (const f of bron.features) {
      if (!f.geometry) continue;
      const naam = f.properties.name_nl || f.properties.name || '';
      for (const l of lijnen(f.geometry)) {
        if (!l.some(inBeeld)) continue;
        rivieren.push({ naam, punten: vereenvoudig(l.map(proj), 0.4), bron: 'Natural Earth' });
      }
    }
  }
  for (const [naam, lijn] of Object.entries(rivierenMetDeHand)) {
    rivieren.push({ naam, punten: lijn.map(([la, lo]) => proj([lo, la])), bron: 'met de hand (benadering)' });
  }

  // ---------- eigenschappen per vak ----------
  const isZee = (p) => !inMulti(p, vasteland);
  const plaatsKm = plaatsen.map(([naam, la, lo, b]) => ({ naam, p: proj([lo, la]), b }));
  const gebruikt = new Map();
  const uit = vakken.map((v, i) => {
    const [lon, lat] = terug(v.midden);
    const gebied = gebieden.find((g) => g.polys.some((poly) => inPoly(v.midden, poly)))
      ?? gebieden.find((g) => g.polys.some((poly) => v.stukken[0].some((q) => inPoly(q, poly))));
    // kust: een punt net buiten de rand ligt in zee
    let kust = false, grens = false;
    for (const q of v.stukken[0]) {
      for (const [dx, dy] of [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]) {
        const t = [q[0] + dx, q[1] + dy];
        if (inMulti(t, land)) continue;
        if (isZee(t)) kust = true; else grens = true;
      }
    }
    const rivier = rivieren.some((r) => r.punten.some((q) => v.stukken.some((s) => inRing(q, s))))
      || rivieren.some((r) => r.punten.some((q, k) => k > 0 && v.stukken[0].some((s, m) => m > 0 && snijden(r.punten[k - 1], q, v.stukken[0][m - 1], s))));
    // naam: de belangrijkste plaats in het vak, anders de dichtste plaats
    const binnen = plaatsKm.filter((pl) => v.stukken.some((s) => inRing(pl.p, s))).sort((a, b) => b.b - a.b);
    let naam;
    if (binnen.length) naam = binnen[0].naam;
    else {
      const dichtst = [...plaatsKm].sort((a, b) => Math.hypot(a.p[0] - v.midden[0], a.p[1] - v.midden[1]) - Math.hypot(b.p[0] - v.midden[0], b.p[1] - v.midden[1]))[0];
      const dx = v.midden[0] - dichtst.p[0], dy = v.midden[1] - dichtst.p[1];
      const richting = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'oost' : 'west') : dy > 0 ? 'zuid' : 'noord';
      naam = `${dichtst.naam}-${richting}`;
    }
    const n = (gebruikt.get(naam) ?? 0) + 1;
    gebruikt.set(naam, n);
    if (n > 1) naam = `${naam} ${n}`;
    return {
      id: i,
      naam,
      gebied: gebied?.naam ?? 'onbekend',
      land: gebied?.land ?? '?',
      midden: v.midden.map(r1),
      lonlat: [Math.round(lon * 1000) / 1000, Math.round(lat * 1000) / 1000],
      oppervlakte: Math.round(v.opp),
      kust, grens, rivier,
      terrein: terreinVan(lon, lat, v.midden, kust, gebied, ardennen),
      buren: [...buren[i]].sort((a, b) => a - b),
      rivierBuren: [...buren[i]].filter((j) => rivieren.some((r) => r.punten.some((q, k) => k > 0 && snijden(v.midden, vakken[j].midden, r.punten[k - 1], q)))).sort((a, b) => a - b),
      vorm: v.stukken.map((s) => vereenvoudig(s, 0.15).map((q) => q.map(r1))),
    };
  });

  const vereenvoudigPoly = (mp) => mp.map((poly) => vereenvoudig(poly[0], 0.5).map((q) => q.map(r1)));
  const resultaat = {
    bron: 'Grenzen, Ardennen en grote rivieren: Natural Earth (publiek domein). Plaatsnamen, kleinere rivieren en terrein: met de hand, benadering.',
    projectie: { lon0: LON0, lat0: LAT0, kx: KX, ky: KY },
    kader: { min: proj([RAND.minLon, RAND.maxLat]).map(r1), max: proj([RAND.maxLon, RAND.minLat]).map(r1) },
    vakken: uit,
    rivieren: rivieren.map((r) => ({ naam: r.naam, punten: r.punten.map((q) => q.map(r1)) })),
    buitenland: vereenvoudigPoly(buitenland),
    omtrek: vereenvoudigPoly(land),
    randen: gedeeld,
  };
  fs.mkdirSync(path.dirname(UIT), { recursive: true });
  fs.writeFileSync(UIT, JSON.stringify(resultaat));
  const zonder = uit.filter((v) => !v.buren.length).map((v) => v.naam);
  console.log(`${uit.length} vakken, ${(fs.statSync(UIT).size / 1024).toFixed(0)} kB; zonder buren: ${zonder.join(', ') || 'geen'}`);
  const t = {};
  for (const v of uit) t[v.terrein] = (t[v.terrein] ?? 0) + 1;
  console.log('terrein', t);
}

// Terrein per vak: BENADERING op basis van ligging, niet gemeten.
function terreinVan(lon, lat, midden, kust, gebied, ardennen) {
  if (ardennen.some((poly) => inPoly(midden, poly)) && lat < 50.45) return 'ardennen';
  if (gebied?.naam === 'Zeeuws-Vlaanderen') return 'moeras';
  if (kust && lat > 50.85) return 'moeras';
  if (lat > 51.12 && lon < 3.9) return 'moeras';
  if (lat > 51.0 && lon > 4.6 && lon < 6.0) return 'heide';
  if (lat > 50.45 && lat < 50.8 && lon > 3.9 && lon < 4.6) return 'bos';
  if (lat > 49.85 && lat < 50.15 && lon > 3.8 && lon < 4.7) return 'bos';
  if (lat > 50.0 && lat < 50.6 && lon > 4.6 && lon < 6.2) return 'heuvels';
  if (lat < 49.9 && lon > 5.4) return 'heuvels';
  return 'vlakte';
}

main().catch((e) => { console.error(e); process.exit(1); });
