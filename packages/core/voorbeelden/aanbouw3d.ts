/**
 * 3D-opbouw van de aanbouw / raampartij (zie aanbouw.ts), als blokken voor de 3D-weergave.
 * Assen in cm: x = breedte gevel, z = diepte (0 = bestaande woning, D = voorgevel), y = hoogte.
 */
import type { Blok, BlokSoort, ConfiguratieResultaat, Scene3D } from '../src/index.js';

const r2 = (x: number) => Math.round(x * 100) / 100;

export function bouwAanbouw3D(r: ConfiguratieResultaat): Scene3D {
  const a = r.afgeleid as Record<string, number | string | boolean | null>;
  const k = Object.fromEntries(r.kenmerken.map((x) => [x.code, x.waarde]));
  const n = (v: unknown, s = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : s);
  const cm = (mm: unknown) => n(mm) / 10;

  const muren = a.muren === true;
  const B = cm(k.breedte);
  const D = muren ? cm(k.diepte) : 30;
  const H = cm(a.H);
  const P = cm(a.penant);
  const openB = cm(a.opening_b);
  const rb = cm(a.raam_b), rh = cm(a.raam_h);
  const kader = cm(a.kader);
  const vleugels = Math.max(1, Math.round(n(a.n, 2)));
  const vb = cm(a.vleugel_b), ov = cm(raamOverlap(String(k.raamtype ?? '')));
  const profiel = String(a.profielkleur ?? '#1f1f1e');
  const gevelKleur = String(a.gevelkleur ?? '#d8d5ce');
  const gevelSoort = (String(a.gevelsoort ?? 'gevel') as BlokSoort);

  const blokken: Blok[] = [];
  const blok = (code: string, soort: BlokSoort, x: number, y: number, z: number, b: number, h: number, d: number, kleur: string, extra: Partial<Blok> = {}) => {
    if (b > 0 && h > 0 && d > 0) blokken.push({ code, soort, vorm: 'blok', x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d), kleur, ...extra });
  };

  if (muren) {
    // Bestaande woning (achtergrond), zijmuren, band boven het raam, dak en dakrand.
    blok('woning', 'gevel', -90, 0, -35, B + 180, H + 140, 35, '#dcd9d2');
    blok('muur_l', gevelSoort, 0, 0, 0, P, H, D, gevelKleur);
    blok('muur_r', gevelSoort, B - P, 0, 0, P, H, D, gevelKleur);
    if (H - rh > 0.5) blok('band', String(a.bandsoort ?? 'planken') as BlokSoort, P, rh, D - 30, openB, H - rh, 30, String(a.bandkleur ?? '#b0764d'));
    blok('binnen_plafond', 'gevel', P, rh, 0, openB, H - rh, D - 30, '#efeee9');
    // Pleisterwerk aan de binnenkant van de zijmuren (anders zie je binnen ook gevelsteen).
    blok('binnen_l', 'gevel', P, 0, 0, 1.5, rh, D - 30, '#efeee9');
    blok('binnen_r', 'gevel', B - P - 1.5, 0, 0, 1.5, rh, D - 30, '#efeee9');
    blok('vloer', 'gevel', P, -2, 0, openB, 2, D, '#cfccc4');
    blok('dak', 'dak', 0, H, 0, B, 4, D, '#2e2e2e');
    blok('dakrand_v', 'metaal', -1, H - 6, D - 1, B + 2, 11, 3, '#2b2b2b');
    blok('dakrand_l', 'metaal', -1, H - 6, 0, 3, 11, D, '#2b2b2b');
    blok('dakrand_r', 'metaal', B - 2, H - 6, 0, 3, 11, D, '#2b2b2b');
    if (a.lichtstraat === true) {
      blok('lichtstraat_kader', 'metaal', B / 2 - 55, H + 4, D / 2 - 105, 110, 14, 210, '#2b2b2b');
      blok('lichtstraat', 'glas', B / 2 - 50, H + 18, D / 2 - 100, 100, 4, 200, '#bcd0d6');
    }
    if (a.koepel === true) blok('koepel', 'glas', B / 2 - 50, H + 4, D / 2 - 50, 100, 28, 100, '#cfdde1', { afronding: 12 });
  } else {
    // Enkel raampartij: bestaande gevel rond de opening.
    blok('gevel_l', 'gevel', -70, 0, 0, 70, rh + 60, D, gevelKleur);
    blok('gevel_r', 'gevel', B, 0, 0, 70, rh + 60, D, gevelKleur);
    blok('latei', 'gevel', 0, rh, 0, B, 60, D, gevelKleur);
  }

  // Raampartij: kader, vleugels en glas, iets terug in de opening.
  const x0 = P + (openB - rb) / 2;
  const zr = D - 22;
  const diep = 8;
  blok('kader_boven', 'metaal', x0, rh - kader, zr, rb, kader, diep, profiel);
  blok('kader_onder', 'metaal', x0, 0, zr, rb, Math.max(2, kader / 2), diep, profiel);
  blok('kader_l', 'metaal', x0, 0, zr, kader, rh, diep, profiel);
  blok('kader_r', 'metaal', x0 + rb - kader, 0, zr, kader, rh, diep, profiel);
  for (let i = 0; i < vleugels; i++) {
    const x = x0 + i * (vb - ov);
    const z = zr + 1 + (i % 2) * 3; // schuifrails om en om
    const st = kader * 0.9;
    blok(`vleugel${i + 1}_l`, 'metaal', x, kader / 2, z, st, rh - kader, 3, profiel);
    blok(`vleugel${i + 1}_r`, 'metaal', x + vb - st, kader / 2, z, st, rh - kader, 3, profiel);
    blok(`vleugel${i + 1}_b`, 'metaal', x, rh - kader - st / 2, z, vb, st / 2 + 0.1, 3, profiel);
    blok(`vleugel${i + 1}_o`, 'metaal', x, kader / 2, z, vb, st, 3, profiel);
    blok(`glas${i + 1}`, 'glas', x + st, kader / 2 + st, z + 1, vb - 2 * st, rh - kader - 1.5 * st - kader / 2, 1, '#bcd0d6');
  }
  if (r.kenmerken.find((x) => x.code === 'screen')?.waarde === true) blok('screenkast', 'metaal', x0, rh, D - 12, rb, 12, 12, profiel);

  const xs = blokken.map((b) => b.x), xe = blokken.map((b) => b.x + b.b);
  const zs = blokken.map((b) => b.z), ze = blokken.map((b) => b.z + b.d);
  const kx = Math.min(0, ...xs.filter((x) => x >= -1)), kz = Math.min(...zs.filter((z) => z >= 0));
  return {
    blokken,
    kader: { x: kx, z: kz, b: Math.max(...xe) - kx, d: Math.max(...ze) - kz, h: Math.max(...blokken.map((b) => b.y + b.h)) },
  };
}

/** Overlap tussen schuifvleugels (mm) volgens het raamtype (zelfde waarden als in aanbouw.ts). */
function raamOverlap(type: string): number {
  return ({ schuif2: 60, schuif3: 60, schuif4: 60, hefschuif2: 70, hefschuif3: 70 } as Record<string, number>)[type] ?? 0;
}
