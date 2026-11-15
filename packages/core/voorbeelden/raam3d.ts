/**
 * 3D-opbouw van een raam of deur (zie raam.ts), als blokken in cm.
 * Lokale assen: x = breedte (links → rechts gezien van binnen), y = hoogte vanaf de onderkant
 * van het kader, z = diepte (0 = buitenkant kader, binnen = z groter).
 *
 * De indeling komt uit het raster (`raamraster.ts`): dezelfde vakken als in de tekening.
 */
import { kaderVan, plaatsBlokken, type Blok, type BlokSoort, type ConfiguratieResultaat, type Scene3D } from '../src/index.js';
import { GLASKLEUR } from './raam.js';
import { rasterVan, type RasterVak } from './raamraster.js';

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

  const raster = rasterVan(r);
  const B = cm(k.breedte), H = cm(k.hoogte);
  const f = cm(a.f), bl = cm(a.bl), oh = cm(a.oh), vb = cm(a.vb), vh = cm(a.vh);
  const kb = tekst(a.kb, '#383e42'), ki = tekst(a.ki, '#f2f1ec');
  // Soort van het oppervlak: het profiel zelf (kunststof, metaal, hout) of de gekozen lak (lak_mat, lak_structuur, lak_glans).
  const profiel = tekst(a.profielsoort, 'kunststof') as BlokSoort;
  const glasKleur = tekst(a.glaskleur, GLASKLEUR);
  const glasSoort: BlokSoort = glasKleur === '#eef1f2' ? 'matglas' : 'glas';
  const type = String(k.type ?? 'raam');
  const schuif = type === 'schuif' || type === 'hefschuif', voordeur = type === 'voordeur';
  const kast = cm(a.zon_kast);
  const statiekFout = a.heeft_stijl === true && a.statiek_ok === false;
  const koppel = k.tussenstijl === 'koppel';
  const randKleur = tekst(a.randkleur, '#1d1d1d');
  const roedeB = raster.steellook ? 2 : 2.4;

  const blokken: Blok[] = [];
  const blok = (code: string, soort: BlokSoort, x: number, y: number, z: number, b: number, h: number, d: number, kleur: string, extra: Partial<Blok> = {}) => {
    if (b > 0.05 && h > 0.05 && d > 0.05) blokken.push({ code, soort, vorm: 'blok', x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d), kleur, ...extra });
  };
  const buiten = { zijden: { 'z-': { soort: profiel, kleur: kb } } };
  // Profiel: binnenkleur, buitenzijde in de buitenkleur.
  const prof = (code: string, x: number, y: number, z: number, b: number, h: number, d: number) =>
    blok(code, profiel, x, y, z, b, h, d, ki, { zijden: { 'z-': { soort: profiel, kleur: kb } } });
  /** Tussenstijl of regel: rood als de statiek niet klopt, dieper bij een koppelprofiel. */
  const stijl = (code: string, x: number, y: number, b: number, h: number) => {
    const d = koppel ? 13 : 7;
    if (statiekFout) blok(code, 'metaal', x, y, 0, b, h, d, '#e0412f');
    else prof(code, x, y, 0, b, h, d);
  };
  /** Glas met kleinhouten of de fijne verdeling van steellook: `ruiten` = aantal ruiten naast en boven elkaar. */
  const glasMetRoeden = (code: string, roede: string, x0: number, y0: number, x1: number, y1: number, z: number, ruiten: [number, number]) => {
    blok(code, glasSoort, x0, y0, z, x1 - x0, y1 - y0, 1, glasKleur);
    const [kol, rij] = ruiten;
    for (let j = 1; j < rij; j++) blok(`${roede}_h${rij > 2 ? j : ''}`, profiel, x0, y0 + ((y1 - y0) * j) / rij - roedeB / 2, z - 0.5, x1 - x0, roedeB, 2, ki, buiten);
    for (let j = 1; j < kol; j++) blok(`${roede}_v${kol > 2 ? j : ''}`, profiel, x0 + ((x1 - x0) * j) / kol - roedeB / 2, y0, z - 0.5, roedeB, y1 - y0, 2, ki, buiten);
  };
  /** Dagopening van een vak in cm (y vanaf de onderkant): tussen kader, stijlen en regels. */
  const dag = (v: RasterVak) => {
    const ax = v.x / 10 + (v.stijlL ? f / 2 : 0), bx = (v.x + v.b) / 10 - (v.stijlR ? f / 2 : 0);
    const y1 = H - v.y / 10;
    return { ax, bx, y0: y1 - v.h / 10, y1 };
  };

  // Kader. Bij deuren en schuifdelen een lage dorpel.
  prof('kader_boven', 0, H - f, 0, B, f, 7);
  prof('kader_onder', 0, 0, 0, B, f * (voordeur || schuif || type === 'vouwwand' ? 0.5 : 1), 7);
  prof('kader_l', 0, 0, 0, f, H, 7);
  prof('kader_r', B - f, 0, 0, f, H, 7);

  // Doorlopend bovenlicht met tussenregel.
  const bovenDoor = raster.vakken.find((v) => v.code === 'bovenlicht');
  if (bovenDoor) {
    stijl('tussenregel', f, H - bl - f, B - 2 * f, f);
    glasMetRoeden('glas_bovenlicht', 'roede_bovenlicht', f, H - bl, B - f, H - f, 3, bovenDoor.ruiten);
    if (bovenDoor.opening === 'kip') blok('greep_bovenlicht', 'metaal', B / 2 - 6, H - f - 3, 7, 12, 2, 2.5, '#b9b9b4');
  }

  /** Deurblad van een voordeur in zijn kolom: paneel, glasstrook of groeven, greep tegenover de scharnieren. */
  const deurblad = (v: RasterVak) => {
    const { ax: x0, bx: x1, y1 } = dag(v);
    const y0 = f * 0.5;
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
  };

  /** Vak van een raam of terrasdeur: vast glas, of een vleugel met glas en een greep tegenover de scharnieren. */
  const vak = (v: RasterVak, nr: number, greep: boolean) => {
    const { ax, bx, y0, y1 } = dag(v);
    const op = v.opening;
    let gx0 = ax, gx1 = bx, gy0 = y0, gy1 = y1;
    if (op !== 'vast') {
      const s = f * 0.75;
      blok(`vleugel${nr}_l`, profiel, ax, y0, 0.5, s, y1 - y0, 7, ki, buiten);
      blok(`vleugel${nr}_r`, profiel, bx - s, y0, 0.5, s, y1 - y0, 7, ki, buiten);
      blok(`vleugel${nr}_o`, profiel, ax + s, y0, 0.5, bx - ax - 2 * s, s, 7, ki, buiten);
      blok(`vleugel${nr}_b`, profiel, ax + s, y1 - s, 0.5, bx - ax - 2 * s, s, 7, ki, buiten);
      gx0 = ax + s; gx1 = bx - s; gy0 = y0 + s; gy1 = y1 - s;
      // Greep tegenover de scharnieren; bij kip bovenaan in het midden.
      if (!greep) { /* de vaste vleugel van een stolp heeft geen greep */ }
      else if (op === 'kip') blok(`greep${nr}`, 'metaal', (ax + bx) / 2 - 6, y1 - s / 2 - 1, 7.5, 12, 2, 2.5, '#b9b9b4');
      else {
        const links = op.endsWith('_l');
        const gx = links ? bx - s / 2 - 1 : ax + s / 2 - 1;
        blok(`greep${nr}`, 'metaal', gx, (y0 + y1) / 2 - (type === 'terrasdeur' ? 25 : 6), 7.5, 2, type === 'terrasdeur' ? 14 : 12, 2.5, '#b9b9b4');
      }
    }
    glasMetRoeden(`glas${nr}`, `roede${nr}`, gx0, gy0, gx1, gy1, 3, v.ruiten);
  };

  if (raster.soort === 'schuif') {
    // Schuifdelen op twee rails. Een hef-schuifdeur heeft bredere vleugelprofielen en een hoge hefgreep aan de sluitkant.
    const hef = type === 'hefschuif';
    for (const [i, v] of raster.vakken.entries()) {
      const x = v.x / 10, s = f * (hef ? 1 : 0.8), z = 0.5 + (v.rail ?? i % 2) * 3.2, nr = i + 1;
      if (v.overlapL && statiekFout) blok(`vleugel${nr}_l`, 'metaal', x, f * 0.5, z, s, vh + f * 0.5, 3, '#e0412f');
      else blok(`vleugel${nr}_l`, profiel, x, f * 0.5, z, s, vh + f * 0.5, 3, ki, buiten);
      if (v.overlapR && statiekFout) blok(`vleugel${nr}_r`, 'metaal', x + vb - s, f * 0.5, z, s, vh + f * 0.5, 3, '#e0412f');
      else blok(`vleugel${nr}_r`, profiel, x + vb - s, f * 0.5, z, s, vh + f * 0.5, 3, ki, buiten);
      blok(`vleugel${nr}_o`, profiel, x + s, f * 0.5, z, vb - 2 * s, s, 3, ki, buiten);
      blok(`vleugel${nr}_b`, profiel, x + s, f + vh - s, z, vb - 2 * s, s, 3, ki, buiten);
      glasMetRoeden(`glas${nr}`, `roede${nr}`, x + s, f * 0.5 + s, x + vb - s, f + vh - s, z + 1, v.ruiten);
      if (v.opening !== 'vast') {
        if (hef) {
          // Sluitkant: de stijl waar het deel van wegschuift.
          const gx = v.opening === 'schuif_r' ? x + s / 2 - 1.5 : x + vb - s / 2 - 1.5;
          blok(`greep${nr}`, 'metaal', gx, f + 85, z + 3, 3, 40, 3, '#b9b9b4');
        } else {
          const gx = v.overlapR ? x + vb - s / 2 - 1 : x + s / 2 - 1;
          blok(`greep${nr}`, 'metaal', gx, f + vh / 2 - 15, z + 3, 2, 30, 2.5, '#b9b9b4');
        }
      }
    }
  } else if (raster.soort === 'vouw') {
    // Vouwwand (gesloten getekend): smalle vleugels die om en om aan elkaar scharnieren, onder een bovenrail.
    blok('rail_boven', 'metaal', f, H - f - 1.2, 2, B - 2 * f, 1.2, 4, kb);
    const s = Math.min(f * 0.7, 4.5), y0 = f * 0.5, y1 = H - f - 1.2;
    const pakketRechts = k.vouw_richting === 'rechts';
    for (const [i, v] of raster.vakken.entries()) {
      const nr = i + 1, x0 = v.x / 10 + 0.2, x1 = (v.x + v.b) / 10 - 0.2;
      blok(`vleugel${nr}_l`, profiel, x0, y0, 1.5, s, y1 - y0, 4.5, ki, buiten);
      blok(`vleugel${nr}_r`, profiel, x1 - s, y0, 1.5, s, y1 - y0, 4.5, ki, buiten);
      blok(`vleugel${nr}_o`, profiel, x0 + s, y0, 1.5, x1 - x0 - 2 * s, s, 4.5, ki, buiten);
      blok(`vleugel${nr}_b`, profiel, x0 + s, y1 - s, 1.5, x1 - x0 - 2 * s, s, 4.5, ki, buiten);
      glasMetRoeden(`glas${nr}`, `roede${nr}`, x0 + s, y0 + s, x1 - s, y1 - s, 3, v.ruiten);
      // Scharnieren op de naad met het volgende deel, om en om binnen en buiten (zo vouwt het pakket in een zigzag).
      if (i < raster.n - 1) {
        const binnenkant = (pakketRechts ? raster.n - 1 - i : i + 1) % 2 === 0;
        for (const hy of [y0 + 25, (y0 + y1) / 2 - 5, y1 - 35]) blok(`scharnier${nr}_${Math.round(hy)}`, 'metaal', x1 - 0.8, hy, binnenkant ? 6 : 0.3, 2, 10, 1.2, '#8f8f8a');
      }
    }
    // Greep op het deel dat het verst van het pakket staat: daar ga je naar buiten.
    const loop = pakketRechts ? raster.vakken[0] : raster.vakken[raster.n - 1];
    if (loop) {
      const gx = pakketRechts ? loop.x / 10 + 0.2 + s / 2 - 1 : (loop.x + loop.b) / 10 - 0.2 - s / 2 - 1;
      blok('greep', 'metaal', gx, f + 95, 6, 2, 14, 2.5, '#b9b9b4');
    }
  } else if (raster.soort === 'glaswand') {
    // Vaste glaswand: glas rechtstreeks in het kader, met smalle vaste stijlen ertussen.
    for (const st of raster.stijlen) stijl(st.code, st.x / 10 - f / 2, H - st.y1 / 10, f, (st.y1 - st.y0) / 10);
    for (const [i, v] of raster.vakken.entries()) {
      const { ax, bx, y0, y1 } = dag(v);
      glasMetRoeden(`glas${i + 1}`, `roede${i + 1}`, ax, y0, bx, y1, 3, v.ruiten);
    }
  } else {
    // Raster van vakken: vaste stijlen, daarna per kolom het hoofdvak, het eigen bovenlicht en het eigen vak onderaan.
    for (const st of raster.stijlen) stijl(st.code, st.x / 10 - f / 2, H - st.y1 / 10, f, (st.y1 - st.y0) / 10);
    const hoofd = raster.vakken.filter((v) => v.rol === 'vak' || v.rol === 'deur');
    // Stolp: de vleugel met draai-kip is de loopvleugel (krijgt de greep); anders de rechtse.
    const stolpL = hoofd.find((v) => v.stolp === 'r'), stolpR = hoofd.find((v) => v.stolp === 'l');
    const loopLinks = !!stolpL && !!stolpR && stolpL.opening.startsWith('draaikip') && !stolpR.opening.startsWith('draaikip');
    const vast = stolpL && stolpR ? (loopLinks ? stolpR : stolpL) : undefined;
    for (const v of hoofd) {
      if (v.rol === 'deur') deurblad(v);
      else vak(v, v.kolom, v !== vast);
    }
    if (stolpL) {
      // Stolpnaald: de smalle lat die de naad tussen de twee vleugels afdekt (binnen en buiten).
      const { bx, y0, y1 } = dag(stolpL);
      blok('stolp', profiel, bx - 1.5, y0, 0.2, 3, y1 - y0, 7.6, ki, buiten);
    }
    // Onder een zijlicht naast een voordeur staat het kader op volle hoogte (de deur zelf heeft een lage dorpel).
    if (voordeur) {
      for (const v of hoofd.filter((x) => x.rol === 'vak')) {
        const x0 = Math.max(f, v.x / 10 - (v.stijlL ? f / 2 : 0)), x1 = Math.min(B - f, (v.x + v.b) / 10 + (v.stijlR ? f / 2 : 0));
        prof(`kader_onder_zijlicht${v.kolom}`, x0, f * 0.5, 0, x1 - x0, f * 0.5, 7);
      }
    }
    for (const v of raster.vakken) {
      if (v.rol === 'bovenlicht' && v.kolom > 0) {
        const { ax, bx } = dag(v);
        stijl(`tussenregel${v.kolom}`, ax, H - bl - f, bx - ax, f);
        glasMetRoeden(`glas_bovenlicht${v.kolom}`, `roede_bovenlicht${v.kolom}`, ax, H - bl, bx, H - f, 3, v.ruiten);
        if (v.opening === 'kip') blok(`greep_bovenlicht${v.kolom}`, 'metaal', (ax + bx) / 2 - 6, H - f - 3, 7, 12, 2, 2.5, '#b9b9b4');
      }
      if (v.rol === 'onder') {
        const { ax, bx } = v.kolom > 0 ? dag(v) : { ax: f, bx: B - f };
        const naam = v.kolom > 0 ? String(v.kolom) : '';
        stijl(`onderregel${naam}`, ax, oh, bx - ax, f);
        if (v.vulling === 'paneel') blok(`paneel_onder${naam}`, profiel, ax, f, 1, bx - ax, oh - f, 5, ki, buiten);
        else glasMetRoeden(`glas_onder${naam}`, `roede_onder${naam}`, ax, f, bx, oh, 3, v.ruiten);
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
  const binnen = opties.binnenDiepte ?? 13, buitenD = opties.buitenDiepte ?? 10;
  const vbSoort = tekst(a.vb_soort) as BlokSoort | '';
  if (vbSoort) blok('vensterbank', vbSoort, -5, -3, 7, B + 10, 3, binnen + 3, tekst(a.vb_kleur, '#f1f0ec'));
  if (k.dorpel === 'alu') blok('dorpel', 'metaal', -3, -4, -(buitenD + 3), B + 6, 4, buitenD + 3, kb);
  if (k.dorpel === 'arduin') blok('dorpel', 'gevel', -3, -5, -(buitenD + 4), B + 6, 5, buitenD + 4, '#50565b');

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
  // Vloer en terras. Bij de indelingen die sinds 15/11 bestaan (grote glaspartijen, vrij raster, stolp, steellook)
  // liggen ze 3 mm boven het grondvlak van de 3D: op dezelfde hoogte flikkeren ze ertegen (strepen). De indelingen
  // van vroeger houden hun vloer op 0, zodat hun beeld exact gelijk blijft (referentiebeeld bouw-raam); zet `op`
  // voor alles op 0.3 bij de volgende vernieuwing van de referentiebeelden.
  const a = r.afgeleid, keuze = (code: string) => r.kenmerken.find((x) => x.code === code)?.waarde;
  const type = String(keuze('type') ?? '');
  const nieuw = type === 'hefschuif' || type === 'vouwwand' || type === 'glaswand' || a.raster_vrij === true || a.n_stolp === 1 || keuze('uitzicht') === 'steellook';
  const op = nieuw ? 0.3 : 0;
  blokken.push({ code: 'vloer_binnen', soort: 'parket', vorm: 'blok', x: -80, y: -1, z: 20, b: B + 160, h: 1 + op, d: 140, kleur: '#c49a6c' });
  blokken.push({ code: 'terras', soort: 'tegel', vorm: 'blok', x: -80, y: -1, z: -130, b: B + 160, h: 1 + op, d: 120, kleur: '#b9b5ad' });
  return { blokken, kader: kaderVan(blokken) };
}
