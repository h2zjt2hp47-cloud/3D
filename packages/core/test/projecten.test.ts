import { describe, expect, it } from 'vitest';
import { beginScherm, beslisStart, herstelIndex, uniekeNaam, voegLijstenSamen, type ProjectIndex, type ProjectRegel } from '../src/projecten.js';

const regel = (id: string, gewijzigd = '2026-11-16T10:00:00Z', naam = `Project ${id}`): ProjectRegel => ({ id, naam, klant: '', nummer: `OF-2026-${id}`, gewijzigd, posities: 1 });

describe('lijst van projecten (doorloop B4)', () => {
  it('samenvoegen: het geheugen wint, niets valt weg, verwijderd blijft weg', () => {
    const geheugen = [regel('a', '2026-11-16T12:00:00Z', 'nieuw a')];
    const opslag = [regel('a', '2026-11-16T09:00:00Z', 'oud a'), regel('b'), regel('c')];
    const uit = voegLijstenSamen([geheugen, opslag], { weg: new Set(['c']), bestaat: () => true });
    expect(uit.map((p) => `${p.id}:${p.naam}`)).toEqual(['a:nieuw a', 'b:Project b']);
  });

  it('samenvoegen: een regel uit de opslag zonder gegevens komt niet terug, een regel uit het geheugen altijd', () => {
    const uit = voegLijstenSamen([[regel('x')], [regel('b'), regel('weg')]], { bestaat: (id) => id !== 'weg' && id !== 'x' });
    expect(uit.map((p) => p.id)).toEqual(['x', 'b']);
  });

  it('herstel: een lijst van één project (de glitch) mist niets: reserve en projecten in de opslag komen terug', () => {
    const index: ProjectIndex = { actief: 'v', projecten: [regel('v')] };
    const reserve: ProjectIndex = { actief: 'a', projecten: [regel('a'), regel('b')] };
    const h = herstelIndex({ index, reserve, ids: ['v', 'a', 'b', 'c'], regelVan: (id) => (id === 'c' ? regel('c', '') : undefined) });
    expect(h.projecten.map((p) => p.id)).toEqual(['v', 'a', 'b', 'c']);
    expect(h.actief).toBe('v');
  });

  it('herstel: zonder index en reserve wordt de lijst opgebouwd uit de opslag', () => {
    const h = herstelIndex({ ids: ['a', 'b'], regelVan: (id) => regel(id) });
    expect(h.projecten.map((p) => p.id)).toEqual(['a', 'b']);
    expect(h.actief).toBe('');
  });

  it('herstel: een regel zonder gegevens in de opslag valt weg, en het actieve project moet bestaan', () => {
    const h = herstelIndex({ index: { actief: 'weg', projecten: [regel('weg'), regel('a')] }, ids: ['a'], regelVan: () => undefined });
    expect(h.projecten.map((p) => p.id)).toEqual(['a']);
    expect(h.actief).toBe('');
  });

  it('start: het actieve project, anders het recentste dat te lezen is', () => {
    const index: ProjectIndex = { actief: 'a', projecten: [regel('a'), regel('b', '2026-11-16T08:00:00Z'), regel('c', '2026-11-16T11:00:00Z')] };
    expect(beslisStart({ index, leesbaar: () => true, opslagGezien: false, herladen: 0 })).toEqual({ soort: 'project', id: 'a' });
    expect(beslisStart({ index, leesbaar: (id) => id !== 'a', opslagGezien: false, herladen: 0 })).toEqual({ soort: 'project', id: 'c' });
  });

  it('start: echt leeg is de eerste start; leeg terwijl dit tabblad projecten zag is eerst herladen, dan niets schrijven', () => {
    const leeg: ProjectIndex = { actief: '', projecten: [] };
    expect(beslisStart({ index: leeg, leesbaar: () => false, opslagGezien: false, herladen: 0 })).toEqual({ soort: 'eerste-start' });
    for (const n of [0, 1, 2]) expect(beslisStart({ index: leeg, leesbaar: () => false, opslagGezien: true, herladen: n })).toEqual({ soort: 'herladen' });
    expect(beslisStart({ index: leeg, leesbaar: () => false, opslagGezien: true, herladen: 3 })).toEqual({ soort: 'niet-te-lezen' });
    // Projecten in de lijst die geen van alle te lezen zijn (beschadigd): een nieuw project komt erbij, zonder herladen.
    expect(beslisStart({ index: { actief: 'a', projecten: [regel('a')] }, leesbaar: () => false, opslagGezien: true, herladen: 0 })).toEqual({ soort: 'eerste-start' });
  });
});

describe('unieke namen (doorloop B20)', () => {
  it('een bestaande naam krijgt (2), dan (3)', () => {
    expect(uniekeNaam('Carport 5 × 5 m', [])).toBe('Carport 5 × 5 m');
    expect(uniekeNaam('Carport 5 × 5 m', ['Carport 5 × 5 m'])).toBe('Carport 5 × 5 m (2)');
    expect(uniekeNaam('Carport 5 × 5 m', ['Carport 5 × 5 m', 'carport 5 × 5 m (2)'])).toBe('Carport 5 × 5 m (3)');
    expect(uniekeNaam('Uitbouw (2)', ['Uitbouw', 'Uitbouw (2)'])).toBe('Uitbouw (3)');
    expect(uniekeNaam('  Woning  ', ['Andere'])).toBe('Woning');
  });
});

describe('beginscherm van een project (doorloop B14)', () => {
  it('een carport zonder woning opent in de configurator, al de rest zoals vroeger', () => {
    expect(beginScherm({ ruimtes: 0, posities: [{ id: 'p1', los: true }] })).toEqual({ scherm: 'positie', id: 'p1' });
    expect(beginScherm({ ruimtes: 0, posities: [{ id: 'r', los: false }, { id: 'c', los: true }] })).toEqual({ scherm: 'positie', id: 'c' });
    expect(beginScherm({ ruimtes: 4, posities: [{ id: 'c', los: true }] })).toEqual({ scherm: 'plan' });
    expect(beginScherm({ ruimtes: 0, posities: [{ id: 'r', los: false }] })).toEqual({ scherm: 'plan' });
    expect(beginScherm({ ruimtes: 0, zonderWoning: true, posities: [{ id: 'p', los: true }] })).toEqual({ scherm: 'plan' });
    expect(beginScherm({ ruimtes: 0, posities: [] })).toEqual({ scherm: 'plan' });
  });
});
