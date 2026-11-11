import { describe, expect, it } from 'vitest';
import { controleerBron, vingerafdruk } from '../src/index.js';
import { dichtsteBouwstijl, bouwstijlen, bouwstijlTekst, pasBouwstijlToe } from '../voorbeelden/bouwstijlen.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { werkbankBronnen, zetelBron } from '../voorbeelden/werkbank-bronnen.js';

describe('werkbank: vingerafdruk', () => {
  it('is gelijk voor dezelfde gegevens, in welke volgorde de velden ook staan', () => {
    expect(vingerafdruk({ a: 1, b: [1, 2, { c: 3, d: 4 }] })).toBe(vingerafdruk({ b: [1, 2, { d: 4, c: 3 }], a: 1 }));
  });
  it('verandert bij de kleinste wijziging', () => {
    const scene = zetelBron.scene('kotor');
    const anders = structuredClone(scene);
    anders.blokken[0]!.b += 0.5;
    expect(vingerafdruk(anders)).not.toBe(vingerafdruk(scene));
    expect(vingerafdruk(zetelBron.scene('kotor'))).toBe(vingerafdruk(scene));
  });
  it('geeft elk model van de collectie een eigen vingerafdruk', () => {
    const alle = zetelBron.items().map((i) => vingerafdruk(zetelBron.scene(i.code)));
    expect(new Set(alle).size).toBe(alle.length);
  });
});

describe('werkbank: bronnen', () => {
  it('heeft unieke codes', () => {
    const codes = werkbankBronnen.map((b) => b.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
  for (const bron of werkbankBronnen) {
    it(`${bron.code}: elk item geeft een geldige scène`, () => {
      expect(bron.items().length).toBeGreaterThan(0);
      // Reeksen alleen voor het eerste item nagaan (alle modellen × alle keuzes duurt te lang voor elke testronde).
      const eerste = bron.items()[0]!.code;
      const zonderReeksen = { ...bron, reeksen: (code: string) => (code === eerste ? bron.reeksen?.(code) ?? [] : []) };
      expect(controleerBron(zonderReeksen)).toEqual([]);
    });
  }
  it('meldt een item zonder scène', () => {
    const kapot = { ...zetelBron, items: () => [{ code: 'bestaat_niet', naam: 'Kapot', groep: 'x', feiten: [] }] };
    expect(controleerBron(kapot).map((m) => m.item)).toEqual(['bestaat_niet']);
  });
  it('toont een keuze uit een reeks in de scène', () => {
    const standaard = vingerafdruk(zetelBron.scene('kotor'));
    expect(vingerafdruk(zetelBron.scene('kotor', { poten: 'blok' }))).not.toBe(standaard);
    expect(vingerafdruk(zetelBron.scene('kotor', { bouwstijl: 'blokken' }))).not.toBe(standaard);
    expect(() => zetelBron.scene('kotor', { poten: 'bestaat_niet' })).toThrow();
  });
});

describe('bouwstijl plus afwijkingen', () => {
  it('geeft nul afwijkingen voor een ontwerp dat een stijl precies volgt', () => {
    const kotor = zetelModellen.find((m) => m.code === 'kotor')!.ontwerp;
    for (const stijl of bouwstijlen) {
      const uit = dichtsteBouwstijl(pasBouwstijlToe(kotor, stijl));
      expect(uit.afwijkingen).toEqual([]);
      expect(uit.stijl.code).toBe(stijl.code);
    }
  });
  it('noemt wat een model anders doet dan zijn dichtste stijl', () => {
    const kotor = zetelModellen.find((m) => m.code === 'kotor')!.ontwerp;
    const ontwerp = pasBouwstijlToe(kotor, bouwstijlen.find((s) => s.code === 'plateau')!);
    ontwerp.vormgeving = { ...ontwerp.vormgeving, kussendikte: (ontwerp.vormgeving?.kussendikte ?? 20) + 3 };
    const uit = dichtsteBouwstijl(ontwerp);
    expect(uit.stijl.code).toBe('plateau');
    expect(uit.afwijkingen.map((a) => a.veld)).toEqual(['kussendikte']);
    expect(bouwstijlTekst(ontwerp)).toContain('+ 1 afwijking (kussendikte)');
  });
  it('geeft voor elk model van de collectie een dichtste stijl', () => {
    for (const m of zetelModellen) expect(dichtsteBouwstijl(m.ontwerp).stijl.label).toBeTruthy();
  });
});
