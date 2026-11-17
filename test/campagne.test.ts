import { describe, expect, it } from 'vitest';
import { kaart } from '../src/kaart/kaart';
import { kies, nieuwSpel, volgendeDag } from '../src/spel/verloop';

describe('de hele geschiedenis', () => {
  it('loopt van 57 v.Chr. tot 2026 zonder fouten, met elf tijdperken', () => {
    const t = nieuwSpel('nerviers', 11);
    t.automatisch = true;
    const gezien = new Set<string>([t.tijdperk]);
    for (let i = 0; i < 800000 && !t.gedaan.includes('overgang-naoorlog'); i++) {
      while (t.wachtend.length) kies(t, kaart, t.wachtend[0].id, 0);
      volgendeDag(t, kaart);
      gezien.add(t.tijdperk);
      if (i % 5000 === 0) expect(t.vakken.every((v) => t.facties[v.eigenaar])).toBe(true);
    }
    expect(gezien.size).toBe(11);
    expect(t.gedaan).toContain('overgang-naoorlog');
    expect(t.scores.length).toBe(11);
  }, 300000);
});
