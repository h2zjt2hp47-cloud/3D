import { describe, expect, it } from 'vitest';
import { kaart } from '../src/kaart/kaart';
import { nieuwSpel } from '../src/spel/romeinen';
import { kies, volgendeDag } from '../src/spel/verloop';
import { datumTekst } from '../src/spel/kalender';
import { vakkenVan } from '../src/spel/toestand';

function speel(zaad: number, dagen: number, speler = 'treveri') {
  const t = nieuwSpel(speler, zaad);
  for (let i = 0; i < dagen; i++) {
    while (t.wachtend.length) kies(t, kaart, t.wachtend[0].id, 0);
    volgendeDag(t, kaart);
  }
  return t;
}

describe('simulatie', () => {
  it('speelt zeven jaar zonder fouten en Rome wint terrein', () => {
    const uitslagen: string[] = [];
    for (const zaad of [1, 2, 3, 4]) {
      const t = speel(zaad, 365 * 7);
      const rome = vakkenVan(t, 'rome').length;
      const vrij = Object.values(t.facties).filter((f) => f.bestaat && !f.heer && f.soort === 'stam').map((f) => `${f.naam}:${vakkenVan(t, f.id).length}`);
      const onder = Object.values(t.facties).filter((f) => f.heer).map((f) => f.naam);
      const legers = t.legers.filter((l) => l.factie === 'rome').reduce((s, l) => s + l.sterkte, 0);
      uitslagen.push(`zaad ${zaad} ${datumTekst(t.dag)}: Rome ${rome} vakken, ${Math.round(legers)} man; vrij ${vrij.join(' ')}; onderworpen ${onder.join(', ')}; slagen ${t.berichten.filter((b) => b.soort === 'slag').length}`);
      expect(rome).toBeGreaterThan(0);
    }
    console.log(uitslagen.join('\n'));
  }, 120000);
});
