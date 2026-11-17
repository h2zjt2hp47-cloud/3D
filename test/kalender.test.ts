import { describe, expect, it } from 'vitest';
import { datumTekst, datumVan, dagnummerVan, seizoenVan } from '../src/spel/kalender';

describe('kalender', () => {
  it('begint op 1 maart 57 v.Chr.', () => {
    expect(datumTekst(0)).toBe('1 maart 57 v.Chr.');
    expect(datumVan(0)).toEqual({ jaar: -57, maand: 3, dag: 1 });
  });
  it('slaat het jaar 0 over', () => {
    const laatste = dagnummerVan({ jaar: -1, maand: 12, dag: 31 });
    expect(datumVan(laatste + 1)).toEqual({ jaar: 1, maand: 1, dag: 1 });
  });
  it('rekent heen en terug', () => {
    for (const d of [0, 1, 300, 365, 1000, 20000, 900000]) expect(dagnummerVan(datumVan(d))).toBe(d);
  });
  it('kent de seizoenen', () => {
    expect(seizoenVan(0)).toBe('lente');
    expect(seizoenVan(dagnummerVan({ jaar: -57, maand: 12, dag: 15 }))).toBe('winter');
  });
});
