import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyseerDak, gebouwHoogte, leesGeoTiff, naarLokaal, waardeOp, type Raster } from '../src/hoogte.js';
import { bepaalLigging, ringenUitGeoJson, wegenUitGeoJson, type Ring } from '../src/ligging.js';

/** Raster van 1 m met een hoogtefunctie (x = oost, y = noord), grond op 0. */
function maakRaster(x0: number, y0: number, b: number, h: number, f: (x: number, y: number) => number): Raster {
  const data = new Float32Array(b * h);
  for (let r = 0; r < h; r++) for (let k = 0; k < b; k++) data[r * b + k] = f(x0 + k + 0.5, y0 - r - 0.5);
  return { breedte: b, hoogte: h, x0, y0, cel: 1, data, geenWaarde: null };
}

describe('dak uit het hoogtemodel', () => {
  // Huis 8 m breed (oost-west) en 10 m diep (noord-zuid), nok oost-west op 10 m, goot 6 m (helling ±38,7°),
  // voorgevel naar het zuiden; achteraan een platte aanbouw van 8 × 4 m op 3 m.
  const huis: Ring = [[0, -10], [8, -10], [8, 4], [0, 4]];
  const dsm = maakRaster(-10, 14, 30, 34, (x, y) => {
    if (x < 0 || x > 8 || y < -10 || y > 4) return 0;
    if (y > 0) return 3; // aanbouw (noord = achter)
    return 10 - (4 / 5) * Math.abs(y + 5);
  });
  const dtm = maakRaster(-10, 14, 30, 34, () => 0);

  it('herkent een zadeldak met helling, goot, nok en aanbouw', () => {
    const a = analyseerDak(huis, dsm, dtm, 0)!;
    expect(a.dakvorm).toBe('zadel');
    expect(Math.abs(a.azimut)).toBeLessThanOrEqual(5);
    expect(a.helling).toBeGreaterThanOrEqual(36);
    expect(a.helling).toBeLessThanOrEqual(41);
    expect(a.nokhoogte).toBeGreaterThan(9.3);
    expect(a.goothoogte).toBeGreaterThan(5.3);
    expect(a.goothoogte).toBeLessThan(6.8);
    expect(a.breedte).toBeCloseTo(8, 0);
    expect(a.diepte).toBeGreaterThan(9);
    expect(a.diepte).toBeLessThan(11);
    expect(a.aanbouw).not.toBeNull();
    expect(a.aanbouw!.hoogte).toBeCloseTo(3, 1);
    expect(a.aanbouw!.z).toBeLessThan(-5); // achter het hoofdvolume
  });

  it('kiest het dakvlak aan de straatkant als voorste vlak', () => {
    expect(Math.abs(analyseerDak(huis, dsm, dtm, 170)!.azimut)).toBeGreaterThan(170);
  });

  it('plat dak en lessenaarsdak', () => {
    const plat = maakRaster(-10, 14, 30, 34, (x, y) => (x >= 0 && x <= 8 && y >= -10 && y <= 4 ? 6 : 0));
    const p = analyseerDak(huis, plat, dtm, 0)!;
    expect(p.dakvorm).toBe('plat');
    expect(p.goothoogte).toBeCloseTo(6, 1);
    // Lessenaar: laag aan de westkant (5 m), hoog aan de oostkant (9 m) → dakvlak kijkt naar het westen.
    const les = maakRaster(-10, 14, 30, 34, (x, y) => (x >= 0 && x <= 8 && y >= -10 && y <= 4 ? 5 + x / 2 : 0));
    const l = analyseerDak(huis, les, dtm, 0)!;
    expect(l.dakvorm).toBe('lessenaar');
    expect(Math.abs(l.azimut - 90)).toBeLessThanOrEqual(10);
    expect(l.helling).toBeCloseTo(27, -1);
  });

  it('assen van de woning: +z = voorgevel, +x = rechts gezien van buiten', () => {
    expect(naarLokaal([10, -2], [10, 0], 0)).toEqual([0, 200]); // zuid = voor
    expect(naarLokaal([11, 0], [10, 0], 0)).toEqual([100, 0]); // oost = rechts bij een voorgevel op het zuiden
  });

  it('echte gegevens (DHMV II, Harelbeke)', () => {
    const lees = (n: string) => leesGeoTiff(new Uint8Array(readFileSync(new URL(`./data/${n}.bin`, import.meta.url))));
    const dsm12 = lees('kortrijksesteenweg-12-dsm'), dtm12 = lees('kortrijksesteenweg-12-dtm');
    expect(dsm12.breedte).toBe(80);
    expect(dsm12.cel).toBe(1);
    expect(waardeOp(dsm12, dsm12.x0 + 40, dsm12.y0 - 40)).toBeGreaterThan(10);
    const data = JSON.parse(readFileSync(new URL('./data/ligging-harelbeke.json', import.meta.url), 'utf8'));
    const v = data['Kortrijksesteenweg 12, 8530 Harelbeke'];
    const l = bepaalLigging(v.punt, ringenUitGeoJson(v.gebouwen), wegenUitGeoJson(v.wegen), v.straat)!;
    // Getrapt gebouw: plat dak op ±9 m vooraan, lage achterbouw.
    const a = analyseerDak(l.gebouw, dsm12, dtm12, l.azimut)!;
    expect(a.dakvorm).toBe('plat');
    expect(a.goothoogte).toBeGreaterThan(8);
    expect(a.aanbouw!.hoogte).toBeLessThan(4.5);
    expect(gebouwHoogte(l.gebouw, dsm12, dtm12)).toBeGreaterThan(8);
    // Buur met een zadeldak langs de straat.
    const buren = ringenUitGeoJson(data['Kortrijksesteenweg 120, 8530 Harelbeke'].gebouwen);
    const dsm120 = lees('kortrijksesteenweg-120-dsm'), dtm120 = lees('kortrijksesteenweg-120-dtm');
    const zadel = buren.map((r) => analyseerDak(r, dsm120, dtm120, -46)).filter((x) => x && x.dakvorm === 'zadel' && x.cellen > 100);
    expect(zadel.length).toBeGreaterThan(0);
    for (const z of zadel) {
      expect(Math.abs(z!.azimut + 50)).toBeLessThanOrEqual(10);
      expect(z!.helling).toBeGreaterThan(25);
      expect(z!.helling).toBeLessThan(55);
    }
  });
});
