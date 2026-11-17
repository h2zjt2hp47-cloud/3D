import { describe, expect, it } from 'vitest';
import { kaart } from '../src/kaart/kaart';
import { bouw, inkomenVak, kanBouwen, maandEconomie, rekening, tevredenheidDoel } from '../src/spel/economie';
import { dagStap, roepOp, verover } from '../src/spel/regels';
import { nieuwSpel } from '../src/spel/verloop';
import { migreer, vakkenVan } from '../src/spel/toestand';

describe('economie', () => {
  it('hoge belasting brengt meer op maar maakt ontevreden', () => {
    const t = nieuwSpel('nerviers');
    const i = t.facties.nerviers.hoofdstad!;
    const gewoon = inkomenVak(t, kaart, i), doelGewoon = tevredenheidDoel(t, i);
    t.facties.nerviers.belasting = 'hoog';
    expect(inkomenVak(t, kaart, i)).toBeGreaterThan(gewoon * 1.4);
    expect(tevredenheidDoel(t, i)).toBeLessThan(doelGewoon);
  });
  it('soldij gaat van het inkomen af', () => {
    const t = nieuwSpel('nerviers');
    const r = rekening(t, 'nerviers', kaart);
    expect(r.soldij).toBeLessThan(0);
    expect(r.netto).toBeCloseTo(r.belasting + r.soldij, 5);
  });
  it('oproepen kost zilver; zonder zilver lukt het niet', () => {
    const t = nieuwSpel('nerviers');
    const f = t.facties.nerviers;
    f.mankracht = 10000;
    f.schat = 15;
    expect(roepOp(t, 'nerviers', f.hoofdstad!, 2000)).toBeNull();
    f.schat = 100;
    expect(roepOp(t, 'nerviers', f.hoofdstad!, 2000)).not.toBeNull();
    expect(f.schat).toBe(80);
  });
  it('bouwen kost zilver en is na de bouwtijd klaar', () => {
    const t = nieuwSpel('nerviers');
    const i = vakkenVan(t, 'nerviers').find((v) => !t.vakken[v].fort && !t.legers.some((l) => l.vak === v && l.factie !== 'nerviers'))!;
    t.facties.nerviers.schat = 500;
    expect(bouw(t, 'nerviers', i, 'markt')).toBe(true);
    expect(t.facties.nerviers.schat).toBe(400);
    expect(kanBouwen(t, 'nerviers', i, 'landbouw')).toMatch(/al gebouwd/);
    for (let d = 0; d < 181; d++) dagStap(t, kaart);
    expect(t.vakken[i].markt).toBe(1);
    expect(kanBouwen(t, 'nerviers', i, 'weg')).toMatch(/Rome/);
  });
  it('een veroverd vak onder vreemd bestuur kan in opstand komen', () => {
    const t = nieuwSpel('rome', 3);
    t.legers = [];
    const i = t.facties.nerviers.hoofdstad!;
    verover(t, kaart, i, 'rome');
    t.vakken[i].tevredenheid = 0;
    t.facties.rome.belasting = 'hoog';
    let opstand = false;
    for (let m = 0; m < 24 && !opstand; m++) { maandEconomie(t, kaart); opstand = t.vakken[i].eigenaar === 'nerviers'; t.vakken[i].tevredenheid = Math.min(t.vakken[i].tevredenheid, 5); }
    expect(opstand).toBe(true);
    expect(t.legers.some((l) => l.factie === 'nerviers' && l.vak === i)).toBe(true);
  });
  it('een bewaard spel van versie 1 wordt bijgewerkt', () => {
    const t = nieuwSpel('rome') as unknown as Record<string, unknown>;
    const oud = JSON.parse(JSON.stringify({ ...t, versie: 1 }));
    for (const f of Object.values(oud.facties as Record<string, Record<string, unknown>>)) { delete f.schat; delete f.belasting; }
    const nieuw = migreer(oud)!;
    expect(nieuw.versie).toBe(3);
    expect(nieuw.facties.rome.schat).toBe(100);
  });
});
