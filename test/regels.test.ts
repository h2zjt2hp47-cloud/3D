import { describe, expect, it } from 'vitest';
import { kaart, vakBij } from '../src/kaart/kaart';
import { dagStap, geefBevel, roepOp, splits, voegSamen, zoekPad } from '../src/spel/regels';
import { nieuwLeger, nieuwSpel } from '../src/spel/romeinen';
import { inOorlog, vakkenVan } from '../src/spel/toestand';
import { kies, volgendeDag } from '../src/spel/verloop';

describe('startsituatie', () => {
  it('Rome en de Remi tegen de Belgen, de Treveri neutraal', () => {
    const t = nieuwSpel('nerviers');
    expect(inOorlog(t, 'rome', 'nerviers')).toBe(true);
    expect(inOorlog(t, 'remi', 'eburonen')).toBe(true);
    expect(inOorlog(t, 'rome', 'treveri')).toBe(false);
    expect(inOorlog(t, 'nerviers', 'eburonen')).toBe(false);
    for (const id of Object.keys(t.facties)) if (id !== 'rome') expect(vakkenVan(t, id).length).toBeGreaterThan(3);
  });
});

describe('beweging', () => {
  it('een pad mag niet door neutraal land', () => {
    const t = nieuwSpel('rome');
    const luxemburg = vakBij(kaart, 49.611, 6.13);
    expect(t.vakken[luxemburg].eigenaar).toBe('treveri');
    expect(zoekPad(t, kaart, 'rome', t.legers.find((l) => l.factie === 'rome')!.vak, luxemburg)).toBeNull();
  });
  it('een leger komt aan op zijn doel', () => {
    const t = nieuwSpel('nerviers');
    const l = t.legers.find((x) => x.factie === 'nerviers')!;
    const doel = kaart.vakken[l.vak].buren.find((b) => t.vakken[b].eigenaar === 'nerviers')!;
    expect(geefBevel(t, kaart, l, doel)).toBe(true);
    for (let i = 0; i < 20 && l.vak !== doel; i++) dagStap(t, kaart);
    expect(l.vak).toBe(doel);
  });
});

describe('veldslag', () => {
  it('het sterkere leger wint en de verliezer trekt zich terug', () => {
    const t = nieuwSpel('nerviers');
    t.legers = [];
    const vak = vakBij(kaart, 50.55, 3.9);
    const zwak = nieuwLeger(t, 'nerviers', vak, 3000);
    const sterk = nieuwLeger(t, 'rome', vak, 12000);
    for (let i = 0; i < 40 && zwak.vak === vak && zwak.sterkte > 0; i++) dagStap(t, kaart);
    expect(zwak.vak !== vak || zwak.sterkte === 0).toBe(true);
    expect(sterk.vak).toBe(vak);
    expect(sterk.sterkte).toBeLessThan(12000);
  });
  it('oproepen, splitsen en samenvoegen houden de mannen gelijk', () => {
    const t = nieuwSpel('nerviers');
    const h = t.facties.nerviers.hoofdstad!;
    t.facties.nerviers.mankracht = 5000;
    const l = roepOp(t, 'nerviers', h, 4000)!;
    expect(t.facties.nerviers.mankracht).toBe(1000);
    const b = splits(t, l)!;
    expect(l.sterkte + b.sterkte).toBe(4000);
    expect(voegSamen(t, [l, b])!.sterkte).toBe(4000);
  });
});

describe('verloop', () => {
  it('de opstand van Ambiorix zet de Treveri in oorlog met Rome', () => {
    const t = nieuwSpel('rome', 5);
    for (let i = 0; i < 365 * 3 + 240; i++) {
      while (t.wachtend.length) kies(t, kaart, t.wachtend[0].id, 0);
      volgendeDag(t, kaart);
    }
    expect(t.gedaan).toContain('ambiorix54');
    expect(inOorlog(t, 'treveri', 'rome') || t.facties.treveri.heer === 'rome' || !t.facties.treveri.bestaat).toBe(true);
  });
  it('verdwijnt je volk, dan speel je verder als de opvolger', () => {
    const t = nieuwSpel('condrusi');
    for (const v of t.vakken) if (v.eigenaar === 'condrusi') v.eigenaar = 'rome';
    t.legers = t.legers.filter((l) => l.factie !== 'condrusi');
    volgendeDag(t, kaart);
    while (t.wachtend.length) kies(t, kaart, t.wachtend[0].id, 0);
    volgendeDag(t, kaart);
    expect(t.speler).toBe('rome');
    expect(t.wachtend.some((k) => k.id.startsWith('opvolging'))).toBe(true);
    expect(t.facties.condrusi.bestaat).toBe(false);
  });
});
