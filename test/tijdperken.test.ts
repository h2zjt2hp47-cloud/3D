import { describe, expect, it } from 'vitest';
import { kaart } from '../src/kaart/kaart';
import { alleTijdperken, verdeel } from '../src/spel/tijdperk';
import { kies, nieuwSpel, volgendeDag } from '../src/spel/verloop';
import { datumTekst } from '../src/spel/kalender';
import { vakkenVan } from '../src/spel/toestand';

describe('tijdperken', () => {
  it('er zijn elf tijdperken die op elkaar aansluiten', () => {
    const lijst = alleTijdperken();
    expect(lijst.length).toBe(11);
    for (let i = 1; i < lijst.length; i++) expect(lijst[i].van).toEqual(lijst[i - 1].tot);
  });
  for (const tp of alleTijdperken()) {
    it(`${tp.naam}: elk vak heeft een eigenaar en het tijdperk loopt drie jaar zonder fouten (computer speelt alles)`, () => {
      const verdeling = verdeel(tp, kaart);
      expect(verdeling.every((f) => tp.facties.some((d) => d.id === f))).toBe(true);
      const speler = tp.facties.find((f) => !f.nietKiesbaar && !f.laat)!.id;
      const t = nieuwSpel(speler, 7, tp.id);
      t.automatisch = true;
      for (let d = 0; d < 365 * 3; d++) {
        while (t.wachtend.length) kies(t, kaart, t.wachtend[0].id, 0);
        volgendeDag(t, kaart);
      }
      const machten = Object.values(t.facties).filter((f) => f.bestaat).map((f) => `${f.naam}:${vakkenVan(t, f.id).length}`).join(' ');
      console.log(`${tp.naam} → ${datumTekst(t.dag)}: ${machten}; legers ${t.legers.length}`);
      expect(t.vakken.every((v) => t.facties[v.eigenaar])).toBe(true);
    }, 120000);
  }
});
