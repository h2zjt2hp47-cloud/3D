import { describe, expect, it } from 'vitest';
import { berekenConfiguratie, standaardKeuzes } from '../src/index.js';
import { leesMaatlijst } from '../voorbeelden/maatlijst.js';
import { berekenRaam, raamdeur, raamPrijslijst } from '../voorbeelden/raam.js';
import { garagepoort, poortPrijslijst } from '../voorbeelden/garagepoort.js';
import { raamKeuzes } from '../voorbeelden/woning.js';

describe('maatlijst lezen (enkel ramen, zonder woning)', () => {
  it('vrije tekst: maten, aantal, soort, indeling, ruimte en verdieping', () => {
    const r = leesMaatlijst([
      'Keuken 1200 x 1400 vast + draai-kip rechts 2 st',
      'Living schuifraam 3000x2300 beide',
      'Badkamer 60 x 60',
      'Voordeur 1000 × 2300 rechts',
      'Slaapkamer verdieping 1400*1500 draai-kip links',
      'Terrasdeur 900 x 2300 draai links',
    ].join('\n'));
    expect(r.overgeslagen).toEqual([]);
    const [keuken, living, bad, voordeur, slaap, terras] = r.regels;
    expect(keuken).toMatchObject({ naam: 'Keuken', aantal: 2, keuzes: { type: 'raam', breedte: 1200, hoogte: 1400, vakken: 'v2', vak1: 'vast', vak2: 'draaikip_r', ruimte: 'keuken' } });
    expect(living!.keuzes).toMatchObject({ type: 'schuif', breedte: 3000, hoogte: 2300, schuif_richting: 'beide', ruimte: 'leefruimte', glas: 'dubbel_gelaagd', rooster: true, profiel: 'alu' });
    // Badkamer: maten in cm, kip en mat glas.
    expect(bad!.keuzes).toMatchObject({ type: 'raam', breedte: 600, hoogte: 600, vak1: 'kip', glas: 'mat_gelaagd', ruimte: 'badkamer' });
    expect(bad!.waarschuwingen[0]).toContain('cm');
    expect(voordeur!.keuzes).toMatchObject({ type: 'voordeur', deur_draai: 'rechts', borstwering: 0, ruimte: 'hal' });
    expect(slaap!.keuzes).toMatchObject({ verdieping: 1, vakken: 'v1', vak1: 'draaikip_l', ruimte: 'slaapkamer' });
    expect(terras!.keuzes).toMatchObject({ type: 'terrasdeur', vak1: 'draai_l' });
  });

  it('geplakt uit Excel: kolommen met tabs, kopregel overgeslagen, aantal in een eigen kolom', () => {
    const r = leesMaatlijst('Omschrijving\tBreedte\tHoogte\tAantal\nP1 keuken\t1600\t1200\t1\nP2 wc\t500\t700\t3\n\nzonder maat\n');
    expect(r.regels).toHaveLength(2);
    expect(r.regels[0]).toMatchObject({ regel: 2, naam: 'P1 keuken', aantal: 1, keuzes: { breedte: 1600, hoogte: 1200, ruimte: 'keuken' } });
    expect(r.regels[1]).toMatchObject({ aantal: 3, keuzes: { ruimte: 'wc', glas: 'mat_gelaagd' } });
    expect(r.overgeslagen.map((x) => x.reden)).toEqual(['kopregel', 'geen maten gevonden (bv. 1200 x 1400)']);
  });

  it('waarschuwt bij een maat buiten het bereik, en elke regel geeft een berekenbare positie', () => {
    const r = leesMaatlijst('Voordeur 2000 x 2300\nRaam 1200 x 1400');
    expect(r.regels[0]!.waarschuwingen.join()).toContain('buiten het bereik');
    for (const x of r.regels) {
      const res = berekenConfiguratie(raamdeur, raamKeuzes(x.keuzes), raamPrijslijst);
      expect(res.prijs.brutoprijsExcl).toBeGreaterThan(0);
    }
    expect(berekenConfiguratie(raamdeur, raamKeuzes(r.regels[1]!.keuzes), raamPrijslijst).geldig).toBe(true);
    // Het voorbeeld uit het scherm geeft alleen geldige posities (ook het schuifraam van 3 m: aluminium).
    const vb = leesMaatlijst('Keuken 1600 x 1200 vast + draai-kip rechts\nLiving schuifraam 3000 x 2300\nSlaapkamer verdieping 1200 x 1400 draai-kip links 2 st\nBadkamer 600 x 600\nVoordeur 1000 x 2300 rechts');
    for (const x of vb.regels) expect(berekenConfiguratie(raamdeur, raamKeuzes({ winddruk: 800, situatie: 'renovatie', ...x.keuzes }), raamPrijslijst).geldig, x.naam).toBe(true);
  });

  it('kopregel uit Excel (doorloop B9): het posnummer is geen aantal, de kolom Aantal telt, de soort uit de omschrijving', () => {
    const r = leesMaatlijst([
      'Pos\tOmschrijving\tBreedte\tHoogte\tAantal',
      '2\tLiving schuifraam\t300\t230\t1',
      '3\tSlaapkamer\t120\t140\t2',
      '4\tgarage poort\t250\t215\t1',
      '5\tKeuken\t\t\t1',
    ].join('\n'));
    expect(r.overgeslagen.map((x) => [x.regel, x.reden])).toEqual([[1, 'kopregel'], [5, 'geen maten gevonden (bv. 1200 x 1400)']]);
    const [living, slaap, poort] = r.regels;
    expect(living).toMatchObject({ naam: 'Living schuifraam', aantal: 1, keuzes: { type: 'schuif', breedte: 3000, hoogte: 2300, ruimte: 'leefruimte' } });
    expect(living!.model).toBeUndefined();
    expect(slaap).toMatchObject({ aantal: 2, keuzes: { type: 'raam', breedte: 1200, hoogte: 1400, ruimte: 'slaapkamer' } });
    expect(poort).toMatchObject({ naam: 'garage poort', aantal: 1, model: 'POORT', keuzes: { breedte: 2500, hoogte: 2150 } });
    expect(poort!.keuzes.ruimte).toBeUndefined();
  });

  it('kolommen in een andere volgorde, met lege cellen en een kolom Soort', () => {
    const r = leesMaatlijst('Aantal;Breedte (mm);Hoogte (mm);Soort;Ruimte;Verdieping\n3;1200;1400;;slaapkamer;1\n1;3500;2400;hef-schuifdeur;living;0');
    expect(r.regels[0]).toMatchObject({ aantal: 3, keuzes: { type: 'raam', breedte: 1200, hoogte: 1400, ruimte: 'slaapkamer', verdieping: 1 } });
    expect(r.regels[1]).toMatchObject({ aantal: 1, keuzes: { type: 'hefschuif', breedte: 3500, delen: 'd2', ruimte: 'leefruimte', verdieping: 0 } });
  });

  it('zonder kopregel: een posnummer vooraan telt niet als aantal, het laatste kleine getal na de maten wel', () => {
    const r = leesMaatlijst('2\tLiving schuifraam\t3000\t2300\n7\tKeuken\t1600\t1200\t2');
    expect(r.regels.map((x) => x.aantal)).toEqual([1, 2]);
    expect(r.regels[0]!.naam).toBe('Living schuifraam');
  });

  it('de soort uit de omschrijving: garagepoort, hef-schuif, vouwwand, glaswand; elke regel is geldig', () => {
    const r = leesMaatlijst([
      'garage poort 2500 x 2150',
      'Sectionale poort 3000 x 2125',
      'Living hef-schuifdeur 5000 x 2400',
      'Veranda vouwwand 3600 x 2300',
      'Vaste glaswand 3600 x 2500',
      'Schuifraam 3000 x 2300',
    ].join('\n'));
    expect(r.regels.map((x) => x.model ?? x.keuzes.type)).toEqual(['POORT', 'POORT', 'hefschuif', 'vouwwand', 'glaswand', 'schuif']);
    expect(r.regels[2]!.keuzes).toMatchObject({ delen: 'd3', schuif_richting: 'beide' });
    expect(r.regels[3]!.keuzes).toMatchObject({ delen: 'd4' });
    expect(r.regels[4]!.keuzes).toMatchObject({ delen: 'd3' });
    for (const x of r.regels.filter((y) => !y.model)) {
      const res = berekenRaam(raamKeuzes({ winddruk: 800, situatie: 'renovatie', ...x.keuzes }));
      expect(res.meldingen.filter((m) => m.ernst === 'fout').map((m) => m.melding), x.naam).toEqual([]);
    }
    for (const x of r.regels.filter((y) => y.model === 'POORT')) {
      expect(berekenConfiguratie(garagepoort, { ...standaardKeuzes(garagepoort), ...x.keuzes }, poortPrijslijst).geldig, x.naam).toBe(true);
    }
  });
});
