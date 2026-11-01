/**
 * 3D-opbouw van een raam of deur (zie raam.ts), als blokken in cm.
 * Lokale assen: x = breedte (links → rechts gezien van binnen), y = hoogte vanaf de onderkant
 * van het kader, z = diepte (0 = buitenkant kader, binnen = z groter).
 */
import { kaderVan, plaatsBlokken, type Blok, type BlokSoort, type ConfiguratieResultaat, type Scene3D } from '../src/index.js';
import { GLASKLEUR } from './raam.js';

const r2 = (x: number) => Math.round(x * 100) / 100;

export interface RaamBlokken {
  blokken: Blok[];
  /** Breedte en hoogte van het kader (cm), hoogte van de zonweringskast en borstwering (cm). */
  b: number;
  h: number;
  kast: number;
  borst: number;
}

export function raamBlokken(r: ConfiguratieResultaat, opties: { binnenDiepte?: number; buitenDiepte?: number } = {}): RaamBlokken {
  const a = r.afgeleid as Record<string, unknown>;
  const k = Object.fromEntries(r.kenmerken.map((x) => [x.code, x.waarde]));
  const num = (v: unknown, s = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : s);
  const cm = (v: unknown) => num(v) / 10;
  const tekst = (v: unknown, s = '') => (typeof v === 'string' && v ? v : s);

  const B = cm(k.breedte), H = cm(k.hoogte);
  const f = cm(a.f), bl = cm(a.bl), vb = cm(a.vb), vh = cm(a.vh), stapx = cm(a.stapx);
  const n = Math.max(1, Math.round(num(a.n, 1)));
  const kb = tekst(a.kb, '#383e42'), ki = tekst(a.ki, '#f2f1ec');
  const profiel = tekst(a.profielsoort, 'kunststof') as BlokSoort;
  const glasKleur = tekst(a.glaskleur, GLASKLEUR);
  const glasSoort: BlokSoort = glasKleur === '#eef1f2' ? 'matglas' : 'glas';
  const type = String(k.type ?? 'raam');
  const schuif = type === 'schuif', voordeur = type === 'voordeur';
  const ops = [a.op1, a.op2, a.op3].map((o) => tekst(o, 'vast'));
  const kast = cm(a.zon_kast);
  const statiekFout = a.heeft_stijl === true && a.statiek_ok === false;
  const koppel = k.tussenstijl === 'koppel';
  const randKleur = tekst(a.randkleur, '#1d1d1d');

  const blokken: Blok[] = [];
  const blok = (code: string, soort: BlokSoort, x: number, y: number, z: number, b: number, h: number, d: number, kleur: string, extra: Partial<Blok> = {}) => {
    if (b > 0.05 && h > 0.05 && d > 0.05) blokken.push({ code, soort, vorm: 'blok', x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d), kleur, ...extra });
  };
  // Profiel: binnenkleur, buitenzijde in de buitenkleur.
  const prof = (code: string, x: number, y: number, z: number, b: number, h: number, d: number) =>
    blok(code, profiel, x, y, z, b, h, d, ki, { zijden: { 'z-': { soort: profiel, kleur: kb } } });
  /** Tussenstijl of regel: rood als de statiek niet klopt, dieper bij een koppelprofiel. */
  const stijl = (code: string, x: number, y: number, b: number, h: number) => {
    const d = koppel ? 13 : 7;
    if (statiekFout) blok(code, 'metaal', x, y, 0, b, h, d, '#e0412f');
    else prof(code, x, y, 0, b, h, d);
  };

  // Kader.
  prof('kader_boven', 0, H - f, 0, B, f, 7);
  prof('kader_onder', 0, 0, 0, B, f * (voordeur || schuif ? 0.5 : 1), 7);
  prof('kader_l', 0, 0, 0, f, H, 7);
  prof('kader_r', B - f, 0, 0, f, H, 7);

  // Bovenlicht met tussenregel.
  if (bl > 0) {
    stijl('tussenregel', f, f + vh, B - 2 * f, f);
    blok('glas_bovenlicht', glasSoort, f, H - bl, 3, B - 2 * f, bl - f, 1, glasKleur);
    if (k.bovenlicht_open === 'kip') blok('greep_bovenlicht', 'metaal', B / 2 - 6, H - f - 3, 7, 12, 2, 2.5, '#b9b9b4');
  }

  if (voordeur) {
    const x0 = f, x1 = B - f, y0 = f * 0.5, y1 = f + vh;
    const paneel = (code: string, x: number, y: number, b: number, h: number) =>
      blok(code, profiel, x, y, 1, b, h, 5, ki, { zijden: { 'z-': { soort: profiel, kleur: kb } } });
    if (k.paneel === 'glasstrook') {
      const sx0 = x0 + (x1 - x0) * 0.62, sx1 = sx0 + (x1 - x0) * 0.18;
      const sy0 = y0 + 15, sy1 = y1 - 15;
      paneel('paneel_l', x0, y0, sx0 - x0, y1 - y0);
      paneel('paneel_r', sx1, y0, x1 - sx1, y1 - y0);
      paneel('paneel_o', sx0, y0, sx1 - sx0, sy0 - y0);
      paneel('paneel_b', sx0, sy1, sx1 - sx0, y1 - sy1);
      blok('glasstrook', glasSoort, sx0, sy0, 3, sx1 - sx0, sy1 - sy0, 1, glasKleur);
    } else {
      paneel('paneel', x0, y0, x1 - x0, y1 - y0);
      if (k.paneel === 'groeven') {
        for (let i = 1; i <= 5; i++) blok(`groef${i}`, 'donker', x0 + 8, y0 + ((y1 - y0) * i) / 6, 0.8, x1 - x0 - 16, 0.8, 0.3, '#1b1b1b');
      }
    }
    // Greep: trekbeugel buiten, klink binnen, aan de kant tegenover de scharnieren.
    const scharnierLinks = k.deur_draai !== 'rechts';
    const gx = scharnierLinks ? x1 - 9 : x0 + 6;
    if (k.greep === 'klink') {
      blok('klink_buiten', 'metaal', gx - 4, f + 100, -2, 12, 2, 2, '#b9b9b4');
    } else {
      blok('trekbeugel', 'metaal', gx, f + 40, -7, 3, 120, 3, '#9a9a96', { vorm: 'cilinder' });
      blok('trekbeugel_o', 'metaal', gx, f + 45, -5, 3, 2, 5, '#9a9a96');
      blok('trekbeugel_b', 'metaal', gx, f + 155, -5, 3, 2, 5, '#9a9a96');
      if (k.greep === 'vingerscan') blok('vingerscan', 'donker', gx - 3, f + 95, 0.5 - 1.2, 3, 6, 0.7, '#111111');
    }
    blok('klink_binnen', 'metaal', scharnierLinks ? gx - 10 : gx, f + 100, 6, 12, 2, 2.5, '#b9b9b4');
  } else if (schuif) {
    for (let i = 0; i < n; i++) {
      const x = f + i * stapx, s = f * 0.8, z = 0.5 + (i % 2) * 3.2;
      const kleur = { zijden: { 'z-': { soort: profiel, kleur: kb } } };
      const ontmoet = (rechts: boolean) => (i === 0 ? rechts : !rechts) && statiekFout;
      if (ontmoet(false)) blok(`vleugel${i + 1}_l`, 'metaal', x, f * 0.5, z, s, vh + f * 0.5, 3, '#e0412f');
      else blok(`vleugel${i + 1}_l`, profiel, x, f * 0.5, z, s, vh + f * 0.5, 3, ki, kleur);
      if (ontmoet(true)) blok(`vleugel${i + 1}_r`, 'metaal', x + vb - s, f * 0.5, z, s, vh + f * 0.5, 3, '#e0412f');
      else blok(`vleugel${i + 1}_r`, profiel, x + vb - s, f * 0.5, z, s, vh + f * 0.5, 3, ki, kleur);
      blok(`vleugel${i + 1}_o`, profiel, x + s, f * 0.5, z, vb - 2 * s, s, 3, ki, kleur);
      blok(`vleugel${i + 1}_b`, profiel, x + s, f + vh - s, z, vb - 2 * s, s, 3, ki, kleur);
      blok(`glas${i + 1}`, glasSoort, x + s, f * 0.5 + s, z + 1, vb - 2 * s, vh + f * 0.5 - 2 * s, 1, glasKleur);
      if (ops[i] !== 'vast') {
        const gx = i === 0 ? x + vb - s / 2 - 1 : x + s / 2 - 1;
        blok(`greep${i + 1}`, 'metaal', gx, f + vh / 2 - 15, z + 3, 2, 30, 2.5, '#b9b9b4');
      }
    }
  } else {
    // Raam of terrasdeur: vakken met tussenstijlen, vaste of opendraaiende vakken.
    for (let i = 1; i < n; i++) stijl(`stijl${i}`, f + i * vb - f / 2, f, f, vh);
    for (let i = 0; i < n; i++) {
      const ax = f + i * vb + (i > 0 ? f / 2 : 0);
      const bx = f + (i + 1) * vb - (i < n - 1 ? f / 2 : 0);
      const y0 = f, y1 = f + vh;
      const op = ops[i] ?? 'vast';
      let gx0 = ax, gx1 = bx, gy0 = y0, gy1 = y1;
      if (op !== 'vast') {
        const s = f * 0.75;
        const kleur = { zijden: { 'z-': { soort: profiel, kleur: kb } } };
        blok(`vleugel${i + 1}_l`, profiel, ax, y0, 0.5, s, vh, 7, ki, kleur);
        blok(`vleugel${i + 1}_r`, profiel, bx - s, y0, 0.5, s, vh, 7, ki, kleur);
        blok(`vleugel${i + 1}_o`, profiel, ax + s, y0, 0.5, bx - ax - 2 * s, s, 7, ki, kleur);
        blok(`vleugel${i + 1}_b`, profiel, ax + s, y1 - s, 0.5, bx - ax - 2 * s, s, 7, ki, kleur);
        gx0 = ax + s; gx1 = bx - s; gy0 = y0 + s; gy1 = y1 - s;
        // Greep tegenover de scharnieren; bij kip bovenaan in het midden.
        if (op === 'kip') blok(`greep${i + 1}`, 'metaal', (ax + bx) / 2 - 6, y1 - s / 2 - 1, 7.5, 12, 2, 2.5, '#b9b9b4');
        else {
          const links = op.endsWith('_l');
          const gx = links ? bx - s / 2 - 1 : ax + s / 2 - 1;
          blok(`greep${i + 1}`, 'metaal', gx, (y0 + y1) / 2 - (type === 'terrasdeur' ? 25 : 6), 7.5, 2, type === 'terrasdeur' ? 14 : 12, 2.5, '#b9b9b4');
        }
      }
      blok(`glas${i + 1}`, glasSoort, gx0, gy0, 3, gx1 - gx0, gy1 - gy0, 1, glasKleur);
      if (k.roeden === 'kruis' || k.roeden === 'liggend') {
        blok(`roede${i + 1}_h`, profiel, gx0, (gy0 + gy1) / 2 - 1.2, 2.5, gx1 - gx0, 2.4, 2, ki, { zijden: { 'z-': { soort: profiel, kleur: kb } } });
        if (k.roeden === 'kruis') blok(`roede${i + 1}_v`, profiel, (gx0 + gx1) / 2 - 1.2, gy0, 2.5, 2.4, gy1 - gy0, 2, ki, { zijden: { 'z-': { soort: profiel, kleur: kb } } });
      }
    }
  }

  // Afstandhouder: smalle rand langs de rand van elke ruit (zwart = warm edge, grijs = metaal).
  for (const g of blokken.filter((b) => b.soort === 'glas' || b.soort === 'matglas')) {
    const w = 1.6, z = g.z - 0.25, d = g.d + 0.5;
    blok(`${g.code}_rand_o`, 'donker', g.x, g.y, z, g.b, w, d, randKleur);
    blok(`${g.code}_rand_b`, 'donker', g.x, g.y + g.h - w, z, g.b, w, d, randKleur);
    blok(`${g.code}_rand_l`, 'donker', g.x, g.y + w, z, w, g.h - 2 * w, d, randKleur);
    blok(`${g.code}_rand_r`, 'donker', g.x + g.b - w, g.y + w, z, w, g.h - 2 * w, d, randKleur);
  }

  if (k.rooster === true) blok('rooster', 'donker', f, H - f * 0.65, 7, B - 2 * f, 1.4, 0.4, '#3a3a3a');

  // Zonwering: kast boven het raam (buiten), geleiders en het doek of de lamellen deels neer.
  if (kast > 0) {
    const zk = tekst(a.zonkleur, kb);
    blok('zonwering_kast', 'metaal', -2, H, -14, B + 4, kast, 14, kb);
    blok('geleider_l', 'metaal', -2, 0, -12, 4, H, 4, kb);
    blok('geleider_r', 'metaal', B - 2, 0, -12, 4, H, 4, kb);
    const onder = H * 0.62;
    if (k.zonwering === 'lamellen') {
      for (let y = onder, i = 0; y < H - 2; y += 5, i++) blok(`lamel${i}`, 'metaal', 1, y, -12, B - 2, 0.8, 7, zk, { kantel: { graden: 25, richting: 'z-' } });
    } else {
      blok('doek', k.zonwering === 'screen' ? 'stof' : 'metaal', 2, onder, -10.5, B - 4, H - onder, 0.6, zk);
      blok('onderlat', 'metaal', 1, onder - 2, -11.5, B - 2, 3, 3, kb);
    }
  }

  // Vensterbank binnen en dorpel buiten (alleen bij ramen).
  const binnen = opties.binnenDiepte ?? 13, buiten = opties.buitenDiepte ?? 10;
  const vbSoort = tekst(a.vb_soort) as BlokSoort | '';
  if (vbSoort) blok('vensterbank', vbSoort, -5, -3, 7, B + 10, 3, binnen + 3, tekst(a.vb_kleur, '#f1f0ec'));
  if (k.dorpel === 'alu') blok('dorpel', 'metaal', -3, -4, -(buiten + 3), B + 6, 4, buiten + 3, kb);
  if (k.dorpel === 'arduin') blok('dorpel', 'gevel', -3, -5, -(buiten + 4), B + 6, 5, buiten + 4, '#50565b');

  return { blokken, b: B, h: H, kast, borst: cm(a.borst) };
}

/** Een raam of deur in een stukje gevel, met vloer binnen en terras buiten (voorbeeld per positie). */
export function raamScene(r: ConfiguratieResultaat): Scene3D {
  const rb = raamBlokken(r);
  const { b: B, h: H, kast, borst } = rb;
  // Muur van 30 cm: buitenblad baksteen (z −10), raam tegen het buitenblad, binnen bepleisterd.
  const blokken = plaatsBlokken(rb.blokken, { x: 0, y: borst, z: 0 });
  const top = borst + H + kast + 50;
  const muur = (code: string, x: number, y: number, b: number, h: number) => {
    if (b > 0.1 && h > 0.1) {
      blokken.push({
        code, soort: 'gevel', vorm: 'blok', x: r2(x), y: r2(y), z: -10, b: r2(b), h: r2(h), d: 30, kleur: '#efeee9',
        zijden: { 'z-': { soort: 'steen', kleur: '#9c4a34' } },
      });
    }
  };
  muur('muur_l', -80, 0, 80, top);
  muur('muur_r', B, 0, 80, top);
  muur('muur_boven', 0, borst + H + kast, B, top - borst - H - kast);
  const dorpels = rb.blokken.some((b) => b.code === 'vensterbank' || b.code === 'dorpel');
  muur('muur_onder', 0, 0, B, borst - (dorpels ? 3 : 0));
  blokken.push({ code: 'vloer_binnen', soort: 'parket', vorm: 'blok', x: -80, y: -1, z: 20, b: B + 160, h: 1, d: 140, kleur: '#c49a6c' });
  blokken.push({ code: 'terras', soort: 'tegel', vorm: 'blok', x: -80, y: -1, z: -130, b: B + 160, h: 1, d: 120, kleur: '#b9b5ad' });
  return { blokken, kader: kaderVan(blokken) };
}
