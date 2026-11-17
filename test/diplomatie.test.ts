import { describe, expect, it } from 'vitest';
import { kaart } from '../src/kaart/kaart';
import { oordeelBond, oordeelVrede, sluitHuwelijk, sluitVredeAf, verklaarOorlogActie } from '../src/spel/diplomatie';
import { doeOvergang, opvolgers, tijdperk } from '../src/spel/tijdperk';
import { inOorlog, vakkenVan } from '../src/spel/toestand';
import { nieuwSpel } from '../src/spel/verloop';
import { sterf } from '../src/spel/vorsten';

describe('diplomatie', () => {
  it('een verliezende, moede vijand aanvaardt vrede; een winnende niet', () => {
    const t = nieuwSpel('rome', 3);
    t.facties.nerviers.moeheid = 90;
    for (const v of t.vakken) if (v.eigenaar === 'nerviers') v.eigenaar = 'rome';
    expect(oordeelVrede(t, 'rome', 'nerviers').ja).toBe(true);
    const u = nieuwSpel('nerviers', 3);
    for (const v of u.vakken) if (v.eigenaar === 'remi') v.eigenaar = 'nerviers';
    expect(oordeelVrede(u, 'remi', 'nerviers').ja).toBe(false);
    sluitVredeAf(t, 'rome', 'nerviers');
    expect(inOorlog(t, 'rome', 'nerviers')).toBe(false);
  });
  it('oorlog verklaren trekt de bondgenoten van de aangevallene mee', () => {
    const t = nieuwSpel('vlaanderen', 3, 'hogemiddeleeuwen');
    t.facties.vlaanderen.heer = null;
    t.bond.push('henegouwen|namen');
    t.facties.henegouwen.heer = null; t.facties.namen.heer = null;
    verklaarOorlogActie(t, 'vlaanderen', 'henegouwen');
    expect(inOorlog(t, 'vlaanderen', 'henegouwen')).toBe(true);
    expect(inOorlog(t, 'vlaanderen', 'namen')).toBe(true);
  });
  it('wie in oorlog is, wil geen bondgenoot worden', () => {
    const t = nieuwSpel('rome', 3);
    expect(oordeelBond(t, 'rome', 'nerviers').ja).toBe(false);
  });
});

describe('vorsten', () => {
  it('sterft een vorst zonder erfgenaam, dan erft het verwante huis', () => {
    const t = nieuwSpel('vlaanderen', 3, 'hogemiddeleeuwen');
    sluitHuwelijk(t, 'henegouwen', 'namen');
    t.facties.namen.heer = null; t.facties.henegouwen.heer = null;
    t.facties.namen.vorst!.erfgenaam = false;
    sterf(t, 'namen', ['Jan']);
    expect(t.facties.namen.heer).toBe('henegouwen');
  });
  it('met een erfgenaam volgt een nieuwe vorst', () => {
    const t = nieuwSpel('vlaanderen', 3, 'hogemiddeleeuwen');
    const oud = t.facties.namen.vorst!.naam;
    t.facties.namen.vorst!.erfgenaam = true;
    sterf(t, 'namen', ['Jan']);
    expect(t.facties.namen.vorst!.naam).not.toBe(oud);
    expect(t.facties.namen.vorst!.verzonnen).toBe(true);
  });
});

describe('overgang tussen tijdperken', () => {
  it('het land van de speler blijft van de speler, onder de gekozen opvolger', () => {
    const t = nieuwSpel('nerviers', 3);
    const mijn = vakkenVan(t, 'nerviers');
    const keuzes = opvolgers(t, tijdperk('franken'), kaart);
    expect(keuzes.length).toBeGreaterThan(0);
    const opvolger = keuzes[0].id;
    doeOvergang(t, 'franken', opvolger, kaart);
    expect(t.tijdperk).toBe('franken');
    expect(t.speler).toBe(opvolger);
    for (const v of mijn) expect(t.vakken[v].eigenaar).toBe(opvolger);
    expect(t.vakken.every((v) => t.facties[v.eigenaar])).toBe(true);
  });
});
