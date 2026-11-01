import { describe, expect, it } from 'vitest';
import { berekenConfiguratie, controleerModel, tekenSvg } from '../src/index.js';
import { aanbouw, aanbouwPrijslijst } from '../voorbeelden/aanbouw.js';
import { bouwAanbouw3D } from '../voorbeelden/aanbouw3d.js';

const bereken = (k = {}) => berekenConfiguratie(aanbouw, k, aanbouwPrijslijst);
const codes = (r: { meldingen: { code: string }[] }) => r.meldingen.map((m) => m.code);

describe('bouw: aanbouw met schuifraam', () => {
  it('model zonder fouten; standaard (zoals het voorbeeld 4650 × 3000, raam 2500) is geldig', () => {
    expect(controleerModel(aanbouw)).toEqual([]);
    const r = bereken();
    expect(r.geldig).toBe(true);
    expect(r.afgeleid).toMatchObject({ opening_b: 4050, raam_b: 4050, raam_h: 2500, band_h: 500, n: 2 });
    expect(codes(r)).toContain('ligger'); // opening > 3 m
  });

  it('veiligheidsglas is verplicht bij glas tot op de vloer', () => {
    expect(codes(bereken({ glas: 'dubbel' }))).toContain('veiligheidsglas');
    expect(codes(bereken({ glas: 'triple_gelaagd' }))).not.toContain('veiligheidsglas');
  });

  it('systeemgrenzen: vleugel te breed / te zwaar / te hoog', () => {
    const r = bereken({ breedte: 7000 });
    expect(codes(r)).toEqual(expect.arrayContaining(['vleugel_breed', 'vleugel_zwaar']));
    expect(bereken({ breedte: 7000, raamtype: 'hefschuif3' }).geldig).toBe(true);
    expect(codes(bereken({ raamhoogte: 2900, hoogte: 3400 }))).toContain('vleugel_hoog');
  });

  it('Uw wordt berekend en een slecht geïsoleerd profiel geeft een EPB-waarschuwing', () => {
    expect(bereken().afgeleid.uw).toBeGreaterThan(1);
    const slank = bereken({ profiel: 'alu_slank', glas: 'dubbel_gelaagd', breedte: 3000 });
    expect(slank.afgeleid.uw as number).toBeGreaterThan(bereken({ profiel: 'alu_hi', breedte: 3000 }).afgeleid.uw as number);
    expect(codes(bereken({ project: 'raam', profiel: 'alu_slank', raamtype: 'vouw4', breedte: 1600, raamhoogte: 2000 }))).toContain('uw');
  });

  it('inmeting: kleinste maat min de montagespeling, waarschuwing bij scheve opening', () => {
    const r = bereken({ inmeting: true, meet_b_boven: 4050, meet_b_midden: 4046, meet_b_onder: 4052, meet_h_links: 2501, meet_h_rechts: 2498, speling: 10 });
    expect(r.afgeleid).toMatchObject({ raam_b: 4026, raam_h: 2488 });
    expect(codes(bereken({ inmeting: true, meet_b_boven: 4050, meet_b_midden: 4030, meet_b_onder: 4052 }))).toContain('meting');
  });

  it('btw 6 % of 21 % volgens de keuze', () => {
    const r6 = bereken();
    const r21 = bereken({ btw_regime: 'normaal' });
    expect(r6.prijs.btw).toBeCloseTo(r6.prijs.verkoopprijsExcl * 0.06, 1);
    expect(r21.prijs.btw).toBeCloseTo(r21.prijs.verkoopprijsExcl * 0.21, 1);
  });

  it('enkel raampartij: geen muren, dak of fundering op de bestellijst', () => {
    const r = bereken({ project: 'raam', breedte: 3200, raamhoogte: 2300 });
    expect(r.geldig).toBe(true);
    const arts = r.stuklijst.map((s) => s.code);
    expect(arts).toEqual(expect.arrayContaining(['profiel', 'glas', 'beslag', 'montage']));
    expect(arts).not.toContain('gevel');
    expect(arts).not.toContain('dak');
    expect(r.prijs.verkoopprijsExcl).toBeLessThan(bereken().prijs.verkoopprijsExcl);
  });

  it('vooraanzicht met maatlijnen zoals de schets (4650 / 3000 / 2500)', () => {
    const t = bereken().tekening!;
    expect(t.maatlijnen.map((m) => m.tekst)).toEqual(['4650', '3000', '2500', '4050']);
    expect(t.vormen.filter((v) => v.code.startsWith('glas'))).toHaveLength(2);
    expect(tekenSvg(t)).toContain('<svg');
  });

  it('3D: bakstenen zijmuren, houten band, glas per vleugel, lichtstraat', () => {
    const s = bouwAanbouw3D(bereken({ dak: 'lichtstraat', raamtype: 'schuif3' }));
    expect(s.blokken.find((b) => b.code === 'muur_l')).toMatchObject({ soort: 'steen', h: 300 });
    expect(s.blokken.find((b) => b.code === 'band')).toMatchObject({ soort: 'planken', y: 250, h: 50 });
    expect(s.blokken.filter((b) => b.code.startsWith('glas'))).toHaveLength(3);
    expect(s.blokken.some((b) => b.code === 'lichtstraat')).toBe(true);
    const raam = bouwAanbouw3D(bereken({ project: 'raam', breedte: 3200, raamhoogte: 2300 }));
    expect(raam.blokken.some((b) => b.code === 'muur_l')).toBe(false);
    expect(raam.blokken.some((b) => b.code === 'latei')).toBe(true);
  });
});
