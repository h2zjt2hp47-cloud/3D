import { describe, expect, it } from 'vitest';
import { kaartenUitHoogte } from '../src/weefselkaart.js';

const PX = 64;
const tegel = (f: (x: number, y: number) => number) => {
  const h = new Float32Array(PX * PX);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) h[y * PX + x] = f(x, y);
  return h;
};
const pixel = (kaart: Uint8ClampedArray, x: number, y: number) => [...kaart.slice((y * PX + x) * 4, (y * PX + x) * 4 + 4)];
/** De hoek van de normaal met de z-as, in graden, uit de kaart gelezen. */
const hoekVan = (kaart: Uint8ClampedArray, i: number) => {
  const [r, g, b] = [kaart[i * 4]!, kaart[i * 4 + 1]!, kaart[i * 4 + 2]!].map((v) => (v / 255) * 2 - 1) as [number, number, number];
  return (Math.acos(b / Math.hypot(r, g, b)) * 180) / Math.PI;
};

describe('weefselkaarten uit een hoogte', () => {
  it('een vlakke tegel geeft een rechte normaal en overal de eigen ruwheid', () => {
    const k = kaartenUitHoogte(tegel(() => 0.5), PX, { hoek: 30, glansverschil: 0.3 });
    expect(k.sterkte).toBe(0);
    expect(pixel(k.normaal, 0, 0)).toEqual([128, 128, 255, 255]);
    expect(pixel(k.normaal, PX - 1, PX - 1)).toEqual([128, 128, 255, 255]);
    expect(pixel(k.ruwheid, 10, 20)).toEqual([255, 255, 255, 255]);
  });

  it('de normaal helt weg van stijgende hoogte, ook over de rand (naadloos)', () => {
    // Stijgt naar rechts rond x = 0, daalt rond x = PX/2; overal gelijk in y.
    const golf = (x: number) => 0.5 + 0.25 * Math.sin((2 * Math.PI * (((x % PX) + PX) % PX)) / PX);
    const k = kaartenUitHoogte(tegel((x) => golf(x)), PX, { hoek: 30, glansverschil: 0 });
    const [r0, g0] = pixel(k.normaal, 0, 5);
    expect(r0).toBeLessThan(128);
    expect(g0).toBe(128);
    const [rMidden] = pixel(k.normaal, PX / 2, 5);
    expect(rMidden).toBeGreaterThan(128);
    // Dezelfde tegel tien kolommen verschoven: de rand (x = 0 kijkt naar x = PX - 1) rekent zoals het midden.
    const verschoven = kaartenUitHoogte(tegel((x) => golf(x + 10)), PX, { hoek: 30, glansverschil: 0 });
    expect(pixel(verschoven.normaal, PX - 10, 5)).toEqual(pixel(k.normaal, 0, 5));
  });

  it('een rij lager in de tekening is lager in v: stijgt de hoogte naar onder, dan helt de normaal omhoog (groen > 128)', () => {
    const k = kaartenUitHoogte(tegel((_, y) => 0.5 + 0.25 * Math.sin((2 * Math.PI * y) / PX)), PX, { hoek: 30, glansverschil: 0 });
    const [r, g] = pixel(k.normaal, 7, 0);
    expect(r).toBe(128);
    expect(g).toBeGreaterThan(128);
  });

  it('de steilste flanken krijgen de gevraagde hoek', () => {
    for (const hoek of [8, 30, 45]) {
      const k = kaartenUitHoogte(tegel((x, y) => 0.5 + 0.2 * Math.sin((2 * Math.PI * x) / PX) * Math.cos((4 * Math.PI * y) / PX)), PX, { hoek, glansverschil: 0 });
      let grootste = 0;
      for (let i = 0; i < PX * PX; i++) grootste = Math.max(grootste, hoekVan(k.normaal, i));
      expect(grootste).toBeGreaterThan(hoek - 1.5);
      expect(grootste).toBeLessThan(hoek + 3);
    }
  });

  it('de hoogste delen zijn gladder, de laagste houden de ruwheid van het materiaal', () => {
    const k = kaartenUitHoogte(tegel((x) => 0.5 + 0.25 * Math.sin((2 * Math.PI * x) / PX)), PX, { hoek: 30, glansverschil: 0.3 });
    const top = pixel(k.ruwheid, PX / 4, 0)[1]!;
    const dal = pixel(k.ruwheid, (3 * PX) / 4, 0)[1]!;
    expect(dal).toBe(255);
    expect(top).toBeLessThan(255);
    expect(top).toBeGreaterThanOrEqual(Math.round(0.7 * 255) - 1);
  });

  it('verzachting: een los vlekje wordt een zachte bult in plaats van een hard vierkantje, ook over de rand', () => {
    const vlek = tegel((x, y) => (x === 0 && y === 0 ? 1 : 0));
    const scherp = kaartenUitHoogte(vlek, PX, { hoek: 8, glansverschil: 0 });
    const zacht = kaartenUitHoogte(vlek, PX, { hoek: 8, glansverschil: 0, vervaging: 3 });
    expect(pixel(scherp.normaal, 4, 0)).toEqual([128, 128, 255, 255]); // scherp: enkel de buren hellen
    expect(pixel(zacht.normaal, 4, 0)[0]).toBeGreaterThan(128); // zacht: ook verder weg, weg van de bult
    expect(pixel(zacht.normaal, PX - 4, 0)[0]).toBeLessThan(128); // en aan de andere kant van de rand
    expect(vlek[0]).toBe(1); // de hoogte zelf blijft onaangeroerd
  });

  it('weigert een hoogte die niet bij de maat past', () => {
    expect(() => kaartenUitHoogte(new Float32Array(10), PX, { hoek: 30, glansverschil: 0 })).toThrow();
  });
});
