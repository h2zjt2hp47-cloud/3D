/** Ramen en deuren met meer vakken in de plattegrond (15/11): per vak een deurblad, een draaicirkel of vast glas. */
import { describe, expect, it } from 'vitest';
import { tekenPlattegrond, type Opening, type Plattegrond } from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

const basis = voorbeeldWoning().plan;
/** Eén ruimte met één opening in de onderste buitenmuur (de ruimte ligt erboven). */
const plan = (o: Partial<Opening>): Plattegrond => ({
  ...basis, verdiepingen: [{ naam: 'Gelijkvloers' }], meubels: [], gevelOntwerp: undefined,
  ruimtes: [{ id: 'leef', naam: 'Leefruimte', type: 'leefruimte', x: 0, y: 0, b: 600, d: 500, vloer: 'parket_eik', wand: 'wit' }],
  openingen: [{ id: 'o', soort: 'buitendeur', as: 'h', lijn: 500, midden: 300, breedte: 180, hoogte: 230, borstwering: 0, scharnier: 'begin', naarPlus: false, positie: 'p', ...o }],
});
const teken = (o: Partial<Opening>, info: { vakken?: string[]; breedtes?: number[] }) => tekenPlattegrond(plan(o), planCatalogus, { raamInfo: () => ({ label: 'P1', ...info }) });
/** Stralen van de draaicirkels in de tekening (cm). */
const stralen = (svg: string) => [...svg.matchAll(/ A ([\d.]+) [\d.]+ 0 0 /g)].map((m) => Number(m[1]));

describe('plattegrond: buitendeur met meer vakken', () => {
  it('zonder vakken of met één vak: één blad over de hele breedte, zoals vroeger', () => {
    expect(stralen(teken({}, {}))).toEqual([172]);
    expect(stralen(teken({}, { vakken: ['draai_l'] }))).toEqual([172]);
  });

  it('dubbele deur: twee deurbladen die in het midden sluiten', () => {
    expect(stralen(teken({}, { vakken: ['draai_l', 'draai_r'], breedtes: [850, 850] }))).toEqual([86, 86]);
  });

  it('deur met zijlicht: één blad zo breed als de deur, vast glas ernaast', () => {
    const svg = teken({ breedte: 150 }, { vakken: ['draai_l', 'vast'], breedtes: [950, 450] });
    const r = stralen(svg);
    expect(r).toHaveLength(1);
    expect(r[0]).toBeCloseTo((150 * 950) / 1400 - 4, 1);
    // De ruimte ligt boven de muur: links gezien van binnen is rechts op de tekening, daar staat de deur.
    const boog = /<path d="M ([\d.]+) [\d.]+ A /.exec(svg)!;
    expect(Number(boog[1])).toBeGreaterThan(300);
  });

  it('deur met twee zijlichten: de deur in het midden', () => {
    expect(stralen(teken({ breedte: 200 }, { vakken: ['vast', 'draai_r', 'vast'], breedtes: [450, 1000, 450] }))).toHaveLength(1);
  });
});

describe('plattegrond: schuifraam, hef-schuifdeur en vouwwand', () => {
  const schuif = { soort: 'schuifraam' as const, breedte: 320, hoogte: 230 };

  it('een schuifraam of hef-schuifdeur houdt de pijl; een vouwwand toont een zigzag naar binnen', () => {
    const pijl = teken(schuif, { vakken: ['schuif_r', 'vast'], breedtes: [1600, 1600] });
    expect(pijl).not.toContain('data-symbool="vouw"');
    const vouw = teken(schuif, { vakken: ['draai_l', 'draai_r', 'draai_l', 'draai_r'], breedtes: [800, 800, 800, 800] });
    const punten = /data-symbool="vouw" points="([^"]+)"/.exec(vouw)![1]!.split(' ').map((p) => p.split(',').map(Number));
    // Vijf punten over de hele breedte (140 → 460), om en om op de muur en in de ruimte (die boven de muur ligt).
    expect(punten.map((p) => p[0])).toEqual([140, 220, 300, 380, 460]);
    const ys = punten.map((p) => p[1]!);
    expect(ys[0]).toBe(ys[2]);
    expect(ys[1]).toBeLessThan(ys[0]!);
    expect(ys[1]).toBe(ys[3]);
    expect(stralen(vouw)).toEqual([]);
  });
});

describe('plattegrond: raam met ongelijke vakken', () => {
  it('de draaicirkel volgt de breedte van het eigen vak', () => {
    const raam = { soort: 'raam' as const, breedte: 240, borstwering: 90 };
    expect(stralen(teken(raam, { vakken: ['draaikip_l', 'vast', 'draaikip_r'] }))).toEqual([80, 80]);
    expect(stralen(teken(raam, { vakken: ['draaikip_l', 'vast', 'draaikip_r'], breedtes: [600, 1200, 600] }))).toEqual([60, 60]);
    // Vier vakken: vier bogen (vroeger hoogstens drie).
    expect(stralen(teken(raam, { vakken: ['draai_l', 'draai_r', 'draai_l', 'draai_r'] }))).toEqual([60, 60, 60, 60]);
  });
});
