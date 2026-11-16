/**
 * 3D-opbouw van de sectionale garagepoort (zie garagepoort.ts), als blokken in cm.
 * Zelfde lokale assen als een raam (raam3d.ts), zodat de poort op dezelfde manier in een muur van de
 * plattegrond past: x = breedte (links → rechts gezien van binnen), y = hoogte vanaf de vloer,
 * z = diepte (0 = voorkant, binnen = z groter).
 */
import { kaderVan, type Blok, type BlokSoort, type ConfiguratieResultaat, type Scene3D } from '../src/index.js';
import type { RaamBlokken } from './raam3d.js';

const r2 = (x: number) => Math.round(x * 100) / 100;

const rgb = (hex: string): [number, number, number] | undefined => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return undefined;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hex = (k: number[]) => `#${k.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Donkerdere tint van een kleur (voor de naden tussen de secties). */
function tint(kleur: string, f: number): string {
  const k = rgb(kleur);
  return k ? hex(k.map((v) => v * f)) : kleur;
}

/**
 * Kleur van de belijning en de rand van cassettes: een schaduwlijn op een lichte poort, een lichtere lijn op een
 * donkere poort (een donkere lijn op antraciet zie je niet).
 */
function lijnkleur(kleur: string): string {
  const k = rgb(kleur);
  if (!k) return kleur;
  const helder = (0.299 * k[0] + 0.587 * k[1] + 0.114 * k[2]) / 255;
  return helder > 0.4 ? hex(k.map((v) => v * 0.62)) : hex(k.map((v) => v + (255 - v) * 0.3));
}

export function poortBlokken(r: ConfiguratieResultaat): RaamBlokken {
  const a = r.afgeleid as Record<string, unknown>;
  const k = Object.fromEntries(r.kenmerken.map((x) => [x.code, x.waarde]));
  const num = (v: unknown, s = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : s);
  const B = num(k.breedte) / 10, H = num(k.hoogte) / 10;
  const ns = Math.max(1, Math.round(num(a.ns, 4))), sh = H / ns;
  const nc = Math.max(1, Math.round(num(a.nc, 4))), cb = B / nc;
  const nl = Math.max(1, Math.round(num(a.nl, 1)));
  const kleur = typeof a.kleur_hex === 'string' && a.kleur_hex ? a.kleur_hex : '#383e42';
  const lijnKleur = lijnkleur(kleur);
  const vensters = k.vensters === true;
  const vensterRij = ns - 1 - Math.round(num(a.venster_rij, 1)); // sectie geteld van onder
  const vb = num(a.venster_b) / 10, vh = num(a.venster_h) / 10;
  const z0 = 1, dikte = 4;

  const blokken: Blok[] = [];
  const blok = (code: string, soort: BlokSoort, x: number, y: number, z: number, b: number, h: number, d: number, kl: string) => {
    if (b > 0.05 && h > 0.05 && d > 0.05) blokken.push({ code, soort, vorm: 'blok', x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d), kleur: kl });
  };
  /** Dunne lijn op de voorkant van het paneel (belijning of de rand van een cassette). */
  const lijn = (code: string, x: number, y: number, b: number, h: number) => blok(code, 'donker', x, y, z0 - 0.12, b, h, 0.2, lijnKleur);

  for (let i = 0; i < ns; i++) {
    const y = i * sh, naad = i < ns - 1 ? 0.5 : 0;
    if (vensters && i === vensterRij) {
      // Sectie met vensters: het paneel in stukken rond de ruiten, elke ruit met een smalle donkere rand.
      const wy0 = y + (sh - vh) / 2, wy1 = wy0 + vh;
      blok(`sectie${i + 1}_o`, 'kunststof', 0, y, z0, B, wy0 - y, dikte, kleur);
      blok(`sectie${i + 1}_b`, 'kunststof', 0, wy1, z0, B, y + sh - naad - wy1, dikte, kleur);
      for (let c = 0; c <= nc; c++) {
        const x0 = c === 0 ? 0 : (c - 1) * cb + (cb + vb) / 2, x1 = c === nc ? B : c * cb + (cb - vb) / 2;
        blok(`sectie${i + 1}_t${c}`, 'kunststof', x0, wy0, z0, x1 - x0, vh, dikte, kleur);
      }
      for (let c = 0; c < nc; c++) {
        const x0 = c * cb + (cb - vb) / 2, w = 1.2;
        blok(`venster${c + 1}`, 'glas', x0, wy0, z0 + 1.5, vb, vh, 1, '#c5d5da');
        blok(`venster${c + 1}_rand_o`, 'donker', x0, wy0, z0 - 0.3, vb, w, dikte + 0.6, '#1d1d1d');
        blok(`venster${c + 1}_rand_b`, 'donker', x0, wy1 - w, z0 - 0.3, vb, w, dikte + 0.6, '#1d1d1d');
        blok(`venster${c + 1}_rand_l`, 'donker', x0, wy0 + w, z0 - 0.3, w, vh - 2 * w, dikte + 0.6, '#1d1d1d');
        blok(`venster${c + 1}_rand_r`, 'donker', x0 + vb - w, wy0 + w, z0 - 0.3, w, vh - 2 * w, dikte + 0.6, '#1d1d1d');
      }
    } else {
      blok(`sectie${i + 1}`, 'kunststof', 0, y, z0, B, sh - naad, dikte, kleur);
      if (k.belijning === 'lijnen') for (let j = 1; j < nl; j++) lijn(`lijn${i + 1}_${j}`, 0, y + (j * sh) / nl - 0.2, B, 0.4);
      if (k.belijning === 'cassettes') {
        for (let c = 0; c < nc; c++) {
          const x0 = c * cb + 7, x1 = (c + 1) * cb - 7, y0 = y + 7, y1 = y + sh - 7, w = 0.8;
          lijn(`cassette${i + 1}_${c + 1}_o`, x0, y0, x1 - x0, w);
          lijn(`cassette${i + 1}_${c + 1}_b`, x0, y1 - w, x1 - x0, w);
          lijn(`cassette${i + 1}_${c + 1}_l`, x0, y0 + w, w, y1 - y0 - 2 * w);
          lijn(`cassette${i + 1}_${c + 1}_r`, x1 - w, y0 + w, w, y1 - y0 - 2 * w);
        }
      }
    }
    // Naad tussen twee secties: een donkere groef (iets terugliggend, zodat je er niet doorheen kijkt).
    if (naad) blok(`naad${i + 1}`, 'donker', 0, y + sh - naad, z0 + 0.6, B, naad, dikte - 1.2, tint(kleur, 0.35));
  }
  // Greep buiten onderaan en een handgreep binnen.
  blok('greep', 'donker', B / 2 - 9, sh / 2 - 2, z0 - 1.6, 18, 4, 1.6, '#1b1b1b');
  blok('greep_binnen', 'metaal', B / 2 - 9, sh / 2 - 2, z0 + dikte, 18, 3, 3, '#b9b9b4');
  return { blokken, b: B, h: H, kast: 0, borst: 0 };
}

/** De poort in een stuk gevel, met een oprit buiten en een betonvloer binnen (voorbeeld per positie). */
export function poortScene(r: ConfiguratieResultaat): Scene3D {
  const rb = poortBlokken(r);
  const { b: B, h: H } = rb;
  const blokken = [...rb.blokken];
  const top = H + 60;
  const muur = (code: string, x: number, y: number, b: number, h: number) => {
    blokken.push({
      code, soort: 'gevel', vorm: 'blok', x: r2(x), y: r2(y), z: -10, b: r2(b), h: r2(h), d: 30, kleur: '#efeee9',
      zijden: { 'z-': { soort: 'steen', kleur: '#9c4a34' } },
    });
  };
  muur('muur_l', -90, 0, 90, top);
  muur('muur_r', B, 0, 90, top);
  muur('muur_boven', 0, H, B, top - H);
  // Vloer en oprit 3 mm boven het grondvlak van de 3D (op dezelfde hoogte flikkeren ze ertegen).
  blokken.push({ code: 'vloer_binnen', soort: 'gevel', vorm: 'blok', x: -90, y: -1, z: 20, b: B + 180, h: 1.3, d: 160, kleur: '#bdbab3' });
  blokken.push({ code: 'oprit', soort: 'tegel', vorm: 'blok', x: -90, y: -1, z: -190, b: B + 180, h: 1.3, d: 180, kleur: '#9d9890' });
  return { blokken, kader: kaderVan(blokken) };
}
