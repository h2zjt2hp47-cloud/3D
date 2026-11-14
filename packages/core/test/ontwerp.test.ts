import { describe, expect, it } from 'vitest';
import {
  berekenConfiguratie,
  berekenOntwerp,
  controleerMateriaal,
  controleerModel,
  leesMaterialen,
  maakMateriaalCode,
  patroonfactor,
  voetafdruk,
  type Materiaal,
  type Ontwerp,
  type OntwerpElement,
} from '../src/index.js';
import { maakSofa, maakSofaPrijslijst, standaardMaterialen, STOFGROEPEN } from '../voorbeelden/sofa.js';
import { startOntwerpen, zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

const bereken = (o: Ontwerp, korting = 0) => berekenOntwerp(o, zetelCatalogus, standaardMaterialen, { kortingProcent: korting });
const el = (id: string, type: string, x: number, y: number, breedte: number, diepte: number, rotatie: OntwerpElement['rotatie'] = 0, materiaal?: string): OntwerpElement =>
  ({ id, type, x, y, breedte, diepte, rotatie, materiaal });
const codes = (r: { meldingen: { code: string }[] }) => r.meldingen.map((m) => m.code);

const velours: Materiaal = {
  code: 'velours_oker', naam: 'Velours Oker', soort: 'stof', groep: 'C', kleur: '#c08a2e',
  rapport: 40, rolbreedte: 140, kostprijsPerM: 49, toeslagPct: 0, eigen: true,
};

describe('materialen', () => {
  it('patroonfactor volgt het rapport', () => {
    expect([0, 20, 35, 40, 64, 90, 120].map(patroonfactor)).toEqual([1, 1.1, 1.1, 1.15, 1.2, 1.25, 1.3]);
  });

  it('maakt een unieke, leesbare code', () => {
    expect(maakMateriaalCode('Velours Oker', [])).toBe('velours_oker');
    expect(maakMateriaalCode('Bouclé  Écru!', [])).toBe('boucle_ecru');
    expect(maakMateriaalCode('Velours Oker', [velours])).toBe('velours_oker_2');
  });

  it('controleert een nieuw materiaal', () => {
    expect(controleerMateriaal(velours, STOFGROEPEN, standaardMaterialen)).toEqual([]);
    const fouten = controleerMateriaal({ naam: '', soort: 'stof', groep: 'Z', kleur: 'rood', rapport: -1, rolbreedte: 20, kostprijsPerM: -5, toeslagPct: 0 }, STOFGROEPEN);
    expect(fouten.join(' ')).toMatch(/naam/);
    expect(fouten.join(' ')).toMatch(/prijsgroep/);
    expect(fouten.join(' ')).toMatch(/kleur/);
    expect(fouten.join(' ')).toMatch(/Patroonrapport/);
    expect(fouten.join(' ')).toMatch(/Rolbreedte/);
    expect(fouten.join(' ')).toMatch(/Kostprijs/);
    expect(controleerMateriaal({ ...velours, code: 'nieuw', naam: 'linnen ficelle' }, STOFGROEPEN, standaardMaterialen).join(' ')).toMatch(/bestaat al/);
  });

  it('leest materialen uit JSON en slaat ongeldige over', () => {
    const { materialen, overgeslagen } = leesMaterialen(JSON.stringify([velours, { naam: 'Kapot', groep: 'Q' }]), STOFGROEPEN);
    expect(materialen.map((m) => m.code)).toEqual(['velours_oker']);
    expect(overgeslagen).toBe(1);
    expect(() => leesMaterialen('geen json', STOFGROEPEN)).toThrow(/geen geldige JSON/);
    expect(() => leesMaterialen('{}', STOFGROEPEN)).toThrow(/lijst/);
  });

  it('een toegevoegd materiaal is meteen bruikbaar in de sofa-configurator', () => {
    const lijst = [...standaardMaterialen, velours];
    const model = maakSofa(lijst);
    expect(controleerModel(model)).toEqual([]);
    const r = berekenConfiguratie(model, { stof: 'velours_oker' }, maakSofaPrijslijst(lijst));
    expect(r.geldig).toBe(true);
    expect(r.afgeleid.prijsgroep).toBe('C');
    expect(r.prijs.brutoprijsExcl).toBe(2698 + 2 * 95); // groep C, 230 cm
    expect(r.afgeleid.stofverbruik).toBe(9.1); // 7.9 × 1.15 (rapport 40 cm)
    expect(r.stuklijst.find((s) => s.code === 'stof')).toMatchObject({ artikel: 'MAT-VELOURS_OKER', kostprijsPerEenheid: 49 });
  });
});

describe('vrij ontwerp', () => {
  it('rechte sofa uit elementen: prijs, stof en afmetingen', () => {
    const r = bereken(startOntwerpen.recht!.ontwerp);
    expect(r.geldig).toBe(true);
    expect(r.meldingen).toEqual([]);
    // arm: 220 + 1 × 24 = 244 (×2); zit 95: 690 + 4 × 32 = 818 (×2)
    expect(r.prijs.brutoprijsExcl).toBe(2124);
    expect(r.afmetingen).toMatchObject({ breedte: 230, diepte: 95 });
    // stof: 2 × (0.7 + 1.5 × 0.2) + 2 × (0.6 + 2.6 × 0.95) = 8.14 → 8.2 m
    expect(r.stof).toEqual([{ materiaal: 'linnen_ficelle', naam: 'Linnen Ficelle', meters: 8.2 }]);
    expect(r.stuklijst.find((s) => s.artikel === 'MAT-LINNEN_FICELLE')?.hoeveelheid).toBe(8.2);
    expect(r.tekening.maatlijnen.map((m) => m.tekst)).toEqual(['230', '95']);
    expect(r.prijs.margeProcent).not.toBeNull();
  });

  it('alle startopstellingen zijn geldig', () => {
    for (const [code, s] of Object.entries(startOntwerpen)) {
      if (code === 'leeg') continue;
      expect(bereken(s.ontwerp).geldig, code).toBe(true);
    }
    expect(codes(bereken(startOntwerpen.leeg!.ontwerp))).toContain('ontwerp.leeg');
  });

  it('meerprijs per begonnen 10 cm en diepte-toeslag', () => {
    const p = (breedte: number, diepte = 95) => bereken({ hoofdmateriaal: 'katoen_naturel', elementen: [el('a', 'zit', 0, 0, breedte, diepte)] }).prijs.brutoprijsExcl;
    expect(p(60)).toBe(620);
    expect(p(61)).toBe(648);
    expect(p(70)).toBe(648);
    expect(p(60, 105)).toBe(644.8); // + 4 %
  });

  it('elk element kan een eigen materiaal en dus prijsgroep hebben', () => {
    const r = bereken(startOntwerpen.lounge!.ontwerp);
    const chaise = r.elementen.find((e) => e.type === 'chaise')!;
    expect(chaise).toMatchObject({ materiaal: 'linnen_brume', groep: 'B' });
    expect(r.elementen.find((e) => e.type === 'zit')!.groep).toBe('C');
    expect(r.stof.map((s) => s.materiaal).sort()).toEqual(['boucle_belize', 'linnen_brume']);
  });

  it('een zelf toegevoegd materiaal werkt ook in de ontwerper', () => {
    const r = berekenOntwerp({ hoofdmateriaal: 'velours_oker', elementen: [el('a', 'zit', 0, 0, 60, 95)] }, zetelCatalogus, [...standaardMaterialen, velours]);
    expect(r.prijs.brutoprijsExcl).toBe(790);
    expect(r.stof[0]!.meters).toBe(Math.ceil((0.6 + 2.6 * 0.6) * 1.15 * 10) / 10);
  });

  it('eigen leder: toeslag 10 % en geen stof op de stuklijst', () => {
    const r = bereken({ hoofdmateriaal: 'eigen_leder', elementen: [el('a', 'zit', 0, 0, 60, 95)] });
    expect(r.prijs.brutoprijsExcl).toBe(616); // 560 × 1.10
    expect(r.stuklijst.some((s) => s.artikel.startsWith('MAT-'))).toBe(false);
    expect(codes(r)).toContain('materiaal.eigen');
  });

  it('draaiing wisselt de voetafdruk en de plaats van de rug', () => {
    expect(voetafdruk(el('a', 'zit', 10, 20, 90, 100, 90))).toEqual({ x: 10, y: 20, b: 100, h: 90 });
    const r = bereken({ hoofdmateriaal: 'linnen_ficelle', elementen: [el('a', 'zit', 0, 0, 90, 100, 90)] });
    const rug = r.tekening.vormen.find((v) => v.code === 'a.rug')!;
    expect(rug).toMatchObject({ x: 82, y: 0, breedte: 18, hoogte: 90 }); // rug rechts
    const r270 = bereken({ hoofdmateriaal: 'linnen_ficelle', elementen: [el('a', 'zit', 0, 0, 90, 100, 270)] });
    expect(r270.tekening.vormen.find((v) => v.code === 'a.rug')).toMatchObject({ x: 0, y: 0, breedte: 18, hoogte: 90 });
  });

  it('meldt overlap, foute maten en losse elementen (maar niet een losse poef)', () => {
    const r = bereken({
      hoofdmateriaal: 'linnen_ficelle',
      elementen: [
        el('a', 'zit', 0, 0, 90, 95),
        el('b', 'zit', 80, 0, 90, 95), // overlapt 10 cm
        el('c', 'arm', 400, 0, 20, 95), // los
        el('d', 'poef', 50, 150, 60, 60), // los, maar poef
        el('e', 'zit', 0, 300, 300, 95), // te breed, en los
      ],
    });
    expect(r.geldig).toBe(false);
    expect(r.meldingen.filter((m) => m.code === 'ontwerp.overlap').map((m) => m.elementId)).toEqual(['b']);
    expect(r.meldingen.filter((m) => m.code === 'ontwerp.los').map((m) => m.elementId).sort()).toEqual(['c', 'e']);
    expect(r.meldingen.find((m) => m.code === 'element.breedte')?.elementId).toBe('e');
  });

  it('een fauteuil of een poef mag los naast de zetel staan; een los zitelement krijgt een waarschuwing', () => {
    const r = bereken({ hoofdmateriaal: 'linnen_ficelle', elementen: [
      el('a', 'zit', 0, 0, 90, 95), el('b', 'zit', 90, 0, 90, 95),
      el('f', 'fauteuil', 40, 200, 80, 80), el('p', 'poef', 200, 200, 60, 60), el('z', 'zit', 400, 200, 90, 95),
    ] });
    expect(r.meldingen.filter((m) => m.code === 'ontwerp.los').map((m) => m.elementId)).toEqual(['z']);
  });

  it('elementen die net tegen elkaar staan overlappen niet', () => {
    const r = bereken({ hoofdmateriaal: 'linnen_ficelle', elementen: [el('a', 'zit', 0, 0, 90, 95), el('b', 'zit', 90, 0, 90, 95)] });
    expect(codes(r)).not.toContain('ontwerp.overlap');
    expect(codes(r)).not.toContain('ontwerp.los');
  });

  it('korting voor interieurinrichters', () => {
    const r = bereken(startOntwerpen.recht!.ontwerp, 20);
    expect(r.prijs.verkoopprijsExcl).toBe(1699.2);
    expect(r.prijs.verkoopprijsIncl).toBe(2056.03);
  });
});
