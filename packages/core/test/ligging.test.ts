import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { azimutVan, bepaalLigging, binnen, kleinsteRechthoek, ligVoorzijde, ringenUitGeoJson, wegenUitGeoJson, type Ring, type Weg } from '../src/ligging.js';

describe('ligging uit kaartgegevens', () => {
  it('azimut: 0 = zuid, −90 = oost, +90 = west, 180 = noord', () => {
    expect(azimutVan(0, -1)).toBe(0);
    expect(azimutVan(1, 0)).toBe(-90);
    expect(azimutVan(-1, 0)).toBe(90);
    expect(azimutVan(0, 1)).toBe(180);
    expect(azimutVan(1, -1)).toBe(-45);
  });

  it('kleinste rechthoek rond een gedraaid gebouw', () => {
    const h = (30 * Math.PI) / 180;
    const rot = ([x, y]: [number, number]): [number, number] => [x * Math.cos(h) - y * Math.sin(h) + 100, x * Math.sin(h) + y * Math.cos(h) + 200];
    // L-vorm van 10 × 8 m.
    const ring: Ring = ([[0, 0], [10, 0], [10, 4], [6, 4], [6, 8], [0, 8]] as [number, number][]).map(rot);
    const r = kleinsteRechthoek(ring);
    const zijden = [...r.zijden].sort((a, b) => a - b);
    expect(zijden[0]).toBeCloseTo(8, 6);
    expect(zijden[3]).toBeCloseTo(10, 6);
    expect(binnen(r.midden, r.hoeken)).toBe(true);
  });

  it('voorgevel kijkt naar de straat van het adres', () => {
    // Huis 6 × 10 m, straat ten zuiden, zijstraat ten oosten.
    const huis: Ring = [[0, 0], [6, 0], [6, 10], [0, 10]];
    const wegen: Weg[] = [
      { lijn: [[-50, -8], [50, -8]], naam: 'Dorpsstraat' },
      { lijn: [[12, -50], [12, 50]], naam: 'Zijstraat' },
    ];
    const l = bepaalLigging([3, 5], [huis], wegen, 'Dorpsstraat')!;
    expect(l.azimut).toBe(0);
    expect(l.breedte).toBe(600);
    expect(l.diepte).toBe(1000);
    expect(l.straat).toBe('Dorpsstraat');
    const zij = bepaalLigging([3, 5], [huis], wegen, 'Zijstraat')!;
    expect(zij.azimut).toBe(-90);
    expect(zij.breedte).toBe(1000);
    // Met de hand draaien.
    const gedraaid = ligVoorzijde(huis, l.rechthoek, l.voorzijde + 2, null);
    expect(gedraaid.azimut).toBe(180);
  });

  it('echte gegevens (GRB, Harelbeke): rijwoning aan de Kortrijksesteenweg', () => {
    const data = JSON.parse(readFileSync(new URL('./data/ligging-harelbeke.json', import.meta.url), 'utf8'));
    const v = data['Kortrijksesteenweg 12, 8530 Harelbeke'];
    const l = bepaalLigging(v.punt, ringenUitGeoJson(v.gebouwen), wegenUitGeoJson(v.wegen), v.straat)!;
    expect(l.straat).toBe('Kortrijksesteenweg');
    expect(l.breedte).toBeGreaterThan(400);
    expect(l.breedte).toBeLessThan(l.diepte);
    expect(l.afstandStraat).toBeLessThan(20);
    expect(Math.abs(l.azimut + 46)).toBeLessThanOrEqual(3);
  });

  it('geen gebouw in de buurt: geen ligging', () => {
    expect(bepaalLigging([1000, 1000], [[[0, 0], [6, 0], [6, 10], [0, 10]]], [])).toBeNull();
  });
});
