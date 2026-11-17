import { describe, expect, it } from 'vitest';
import { kaart } from '../src/kaart/kaart';

describe('kaart', () => {
  it('heeft ongeveer 250 vakken met een naam en een vorm', () => {
    expect(kaart.vakken.length).toBe(250);
    for (const v of kaart.vakken) {
      expect(v.naam).not.toBe('');
      expect(v.vorm[0].length).toBeGreaterThan(3);
    }
  });
  it('buren zijn wederzijds en alles is bereikbaar', () => {
    const v = kaart.vakken;
    for (const a of v) for (const b of a.buren) expect(v[b].buren).toContain(a.id);
    const gezien = new Set([0]);
    const stapel = [0];
    while (stapel.length) for (const b of v[stapel.pop()!].buren) if (!gezien.has(b)) { gezien.add(b); stapel.push(b); }
    expect(gezien.size).toBe(v.length);
  });
  it('vaknamen zijn uniek', () => {
    expect(new Set(kaart.vakken.map((v) => v.naam)).size).toBe(kaart.vakken.length);
  });
});
