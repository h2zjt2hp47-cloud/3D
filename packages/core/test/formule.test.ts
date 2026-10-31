import { describe, expect, it } from 'vitest';
import { evalueer, FormuleFout, parseFormule } from '../src/index.js';

const r = (f: string, g: Record<string, unknown> = {}) => evalueer(f, g as never);

describe('formules', () => {
  it('rekent met de juiste voorrang', () => {
    expect(r('2 + 3 * 4')).toBe(14);
    expect(r('(2 + 3) * 4')).toBe(20);
    expect(r('-2 * 3')).toBe(-6);
    expect(r('10 - 4 - 3')).toBe(3);
    expect(r('breedte * hoogte / 1000000', { breedte: 1200, hoogte: 2000 })).toBe(2.4);
  });

  it('vergelijkt en combineert met en/of/niet', () => {
    expect(r('breedte >= 1000 en hoogte < 2400', { breedte: 1000, hoogte: 2000 })).toBe(true);
    expect(r('a = "eik" of b', { a: 'wit', b: false })).toBe(false);
    expect(r('niet montage', { montage: false })).toBe(true);
    expect(r('a <> "geen"', { a: 'geen' })).toBe(false);
    expect(r('a != 1', { a: 2 })).toBe(true);
  });

  it('kent als, min, max, afronden, naarboven, naarbeneden en in', () => {
    expect(r('als(x > 5; "groot"; "klein")', { x: 7 })).toBe('groot');
    expect(r('min(3; 1; 2) + max(1, 9)')).toBe(10);
    expect(r('naarboven(1750; 100)')).toBe(1800);
    expect(r('naarboven(1800; 100)')).toBe(1800);
    expect(r('naarbeneden(1750; 100)')).toBe(1700);
    expect(r('naarboven(0.1 + 0.2; 0.1)')).toBeCloseTo(0.3);
    expect(r('afronden(2.345; 2)')).toBe(2.35);
    expect(r('afronden(2.5)')).toBe(3);
    expect(r('rest(7; 3)')).toBe(1);
    expect(r('in(kleur; "wit"; "zwart")', { kleur: 'zwart' })).toBe(true);
    expect(r('in(kleur; "wit"; "zwart")', { kleur: 'rood' })).toBe(false);
  });

  it('is niet hoofdlettergevoelig voor sleutelwoorden en functies', () => {
    expect(r('ALS(WAAR EN NIET onwaar; 1; 2)')).toBe(1);
  });

  it('houdt bij welke variabelen en tabellen een formule gebruikt', () => {
    const p = parseFormule('als(plint; breedte; 0) + tabel("basis"; breedte; stof_groep)');
    expect(p.variabelen.sort()).toEqual(['breedte', 'plint', 'stof_groep']);
    expect(p.tabellen).toEqual(['basis']);
  });

  it('geeft duidelijke fouten', () => {
    expect(() => parseFormule('')).toThrow(FormuleFout);
    expect(() => parseFormule('2 +')).toThrow(/onvolledig/);
    expect(() => parseFormule('(2 + 3')).toThrow(/'\)' verwacht/);
    expect(() => parseFormule('wortel(4)')).toThrow(/Onbekende functie 'wortel'/);
    expect(() => parseFormule('als(1; 2)')).toThrow(/als\(\) verwacht 3/);
    expect(() => parseFormule('"open')).toThrow(/niet afgesloten/);
    expect(() => parseFormule('a # b')).toThrow(/Onbekend teken/);
    expect(() => parseFormule('tabel(basis; 1; 2)')).toThrow(/tabelnaam tussen aanhalingstekens/);
  });

  it('laat de onveilige JsonLogic-operatie "method" niet toe', async () => {
    const jsonLogic = (await import('json-logic-js')).default;
    expect(() => jsonLogic.apply({ method: ['abc', 'toUpperCase'] } as never, {})).toThrow();
  });
});
