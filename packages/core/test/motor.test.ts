import { describe, expect, it } from 'vitest';
import { berekenConfiguratie, controleerModel, standaardKeuzes, tekenSvg, type ConfiguratieResultaat, type ProductModel } from '../src/index.js';
import { demoPrijslijst, maatkast } from '../voorbeelden/maatkast.js';
import { sofa, sofaPrijslijst } from '../voorbeelden/sofa.js';

const kast = (keuzes = {}) => berekenConfiguratie(maatkast, keuzes, demoPrijslijst);
const bank = (keuzes = {}, korting = 0) => berekenConfiguratie(sofa, keuzes, sofaPrijslijst, { kortingProcent: korting });
const codes = (r: { meldingen: { code: string }[] }) => r.meldingen.map((m) => m.code);
const regel = (r: ConfiguratieResultaat, code: string) => r.stuklijst.find((s) => s.code === code);

describe('voorbeeldmodellen', () => {
  it('bevatten geen modelfouten', () => {
    expect(controleerModel(maatkast)).toEqual([]);
    expect(controleerModel(sofa)).toEqual([]);
  });
});

describe('kast op maat (kostprijs + opslag)', () => {
  it('standaardconfiguratie is geldig met vaste prijs', () => {
    const r = kast();
    expect(r.geldig).toBe(true);
    expect(r.meldingen).toEqual([]);
    expect(r.prijs.methode).toBe('kostplus');
    expect(r.prijs.kostprijs).toBe(589.69);
    expect(r.prijs.verkoopprijsExcl).toBe(825.57);
    expect(r.prijs.verkoopprijsIncl).toBe(998.94);
  });

  it('berekent de zaaglijst uit de maten', () => {
    const r = kast();
    expect(r.afgeleid.binnenbreedte).toBe(1164);
    expect(regel(r, 'zijpanelen')).toMatchObject({ aantal: 2, lengte: 2000, breedte: 600, zaaglijst: true });
    expect(regel(r, 'legplanken')).toMatchObject({ aantal: 8, lengte: 571, breedte: 580 });
    expect(regel(r, 'scharnieren')).toMatchObject({ aantal: 8 }); // 2 deuren × 4 scharnieren
  });

  it('verbergt de greep en laat greep- en scharnierregels weg zonder deuren', () => {
    const r = kast({ deurtype: 'geen' });
    expect(r.kenmerken.find((k) => k.code === 'greep')?.zichtbaar).toBe(false);
    expect(regel(r, 'grepen')).toBeUndefined();
    expect(regel(r, 'scharnieren')).toBeUndefined();
    expect(r.samenvatting.some((s) => s.startsWith('Greep'))).toBe(false);
  });

  it('maakt schuifdeuren onbeschikbaar onder 1000 mm met uitleg', () => {
    const r = kast({ breedte: 900, deurtype: 'schuifdeuren', diepte: 500 });
    const deur = r.kenmerken.find((k) => k.code === 'deurtype')!;
    expect(deur.keuzes!.find((k) => k.code === 'schuifdeuren')).toMatchObject({ beschikbaar: false, reden: 'pas vanaf 1000 mm breedte' });
    expect(codes(r)).toContain('deurtype.niet_beschikbaar');
    expect(r.geldig).toBe(false);
  });

  it('past het minimum van een maat aan op andere keuzes', () => {
    const r = kast({ deurtype: 'schuifdeuren', diepte: 400 });
    expect(r.kenmerken.find((k) => k.code === 'diepte')?.min).toBe(450);
    expect(codes(r)).toContain('diepte.min');
  });

  it('meldt te smalle vakken (fout) en lange legplanken (waarschuwing)', () => {
    expect(codes(kast({ breedte: 600, vakken: 4 }))).toContain('vak_te_smal');
    const breed = kast({ breedte: 2000, vakken: 1 });
    expect(codes(breed)).toContain('legplank_doorbuiging');
    expect(breed.geldig).toBe(true); // waarschuwing blokkeert niet
  });

  it('gebruikt eigenschappen van het gekozen materiaal', () => {
    const r = kast({ materiaal: 'mdf_gelakt' });
    expect(r.afgeleid.t).toBe(19);
    expect(regel(r, 'zijpanelen')?.artikel).toBe('MDF-LAK-19');
    expect(regel(r, 'kantenband')).toBeUndefined(); // gelakt: geen kantenband
  });

  it('aanvaardt tekst als invoer (zoals uit een formulier)', () => {
    const r = kast({ breedte: '1500', plint: 'false' as never, montage: 'ja' });
    expect(r.kenmerken.find((k) => k.code === 'breedte')?.waarde).toBe(1500);
    expect(r.afgeleid.plinthoogte).toBe(0);
    expect(regel(r, 'montage')).toBeDefined();
  });

  it('weigert maten die geen veelvoud van de stapgrootte zijn of geen getal', () => {
    expect(codes(kast({ breedte: 'abc' }))).toContain('breedte.ongeldig');
    expect(codes(kast({ breedte: 1200.5 }))).toContain('breedte.stap');
  });
});

describe('sofa op maat per cm (lijstprijs uit prijstabel)', () => {
  it('standaardprijs = tabel + sierkussens', () => {
    const r = bank();
    expect(r.geldig).toBe(true);
    expect(r.prijs.methode).toBe('lijstprijs');
    // recht 230 cm, linnen (groep B): 1790 + 9 × 60 = 2330, + 2 × 75 = 2480
    expect(r.prijs.brutoprijsExcl).toBe(2480);
    expect(r.prijs.margeProcent).not.toBeNull();
  });

  it('maat per cm, prijs per 10 cm-klasse (naar boven)', () => {
    expect(bank({ breedte: 223 }).geldig).toBe(true);
    expect(bank({ breedte: 223 }).prijs.brutoprijsExcl).toBe(2480);
    expect(bank({ breedte: 231 }).prijs.brutoprijsExcl).toBe(2540);
  });

  it('hoeksofa: basis + hoekzijde, factoren en toeslagen', () => {
    const r = bank({ opstelling: 'hoek_links', breedte: 280, zijlengte: 220, stof: 'boucle_belize', model: 'rond', comfort: 'dons', sierkussens: 0 });
    // (C 280: 2050 + 14 × 72 = 3058) + (hoekzijde C 220: 1240 + 4 × 58 = 1472) = 4530 × 1.06 + 390 = 5191.8
    expect(r.prijs.brutoprijsExcl).toBe(5191.8);
    expect(r.geldig).toBe(true);
  });

  it('chaise longue: meerprijs volgens lengte', () => {
    // B 260: 1790 + 12 × 60 = 2510; chaise B 170: 760 + 2 × 34 = 828; + 2 × 75
    expect(bank({ opstelling: 'chaise_rechts', breedte: 260, zijlengte: 170 }).prijs.brutoprijsExcl).toBe(3488);
  });

  it('lengte chaise/hoekzijde alleen zichtbaar en gecontroleerd waar nodig', () => {
    expect(bank().kenmerken.find((k) => k.code === 'zijlengte')?.zichtbaar).toBe(false);
    const chaise = bank({ opstelling: 'chaise_links', breedte: 240, zijlengte: 200 });
    expect(chaise.kenmerken.find((k) => k.code === 'zijlengte')?.max).toBe(190);
    expect(codes(chaise)).toContain('zijlengte.max');
  });

  it('past klantkorting toe (interieurinrichter)', () => {
    const r = bank({}, 25);
    expect(r.prijs.verkoopprijsExcl).toBe(1860);
    expect(r.prijs.verkoopprijsIncl).toBe(2250.6);
  });

  it('breedtegrenzen hangen af van de opstelling', () => {
    expect(codes(bank({ opstelling: 'recht', breedte: 350 }))).toContain('breedte.max');
    expect(codes(bank({ opstelling: 'hoek_rechts', breedte: 200 }))).toContain('breedte.min');
    expect(bank({ opstelling: 'hoek_rechts', breedte: 360, zijlengte: 300 }).geldig).toBe(true);
  });

  it('messing poten alleen bij strakke arm', () => {
    expect(codes(bank({ model: 'rond', poten: 'messing' }))).toContain('poten.niet_beschikbaar');
  });

  it('eigen stof (COM) en eigen leder (COL = COM + 10 %)', () => {
    const com = bank({ stof: 'eigen_stof' });
    expect(regel(com, 'stof')).toBeUndefined();
    expect(codes(com)).toContain('eigen_materiaal');
    // EIGEN 230: 1450 + 9 × 40 = 1810, + 2 × 45
    expect(com.prijs.brutoprijsExcl).toBe(1900);
    expect(bank({ stof: 'eigen_leder' }).prijs.brutoprijsExcl).toBe(1991 + 90);
    expect(codes(bank({ stof: 'eigen_stof', afneembare_hoezen: true }))).toContain('stof.niet_beschikbaar');
  });

  it('contraststof: hoogste stofgroep + 5 %', () => {
    const r = bank({ stof: 'katoen_naturel', contrast: true, contraststof: 'boucle_belize' });
    expect(r.afgeleid.prijsgroep).toBe('C');
    // C 230: 2050 + 9 × 72 = 2698 × 1.05 = 2832.9, + 2 × 95
    expect(r.prijs.brutoprijsExcl).toBe(3022.9);
    expect(regel(r, 'contraststof')).toMatchObject({ artikel: 'STOF-BOU' });
    // Omgekeerd: hoofdstof is de duurste groep
    expect(bank({ stof: 'boucle_belize', contrast: true, contraststof: 'katoen_naturel' }).afgeleid.prijsgroep).toBe('C');
  });

  it('stofverbruik = basis × patroonfactor', () => {
    expect(bank().afgeleid.stofverbruik).toBe(7.9); // 230/100 × 3 + 2 × 0.5
    expect(bank({ stof: 'jacquard_ruit' }).afgeleid.stofverbruik).toBe(8.7); // × 1.10 (rapport 32 cm)
    const c = bank({ contrast: true });
    expect(c.afgeleid.stofverbruik).toBe(5.1); // 7.9 × 0.65
    expect(c.afgeleid.stofverbruik_contrast).toBe(2.8); // 7.9 × 0.35
    expect(regel(bank(), 'stof')).toMatchObject({ artikel: 'STOF-LIN', lengte: 790, hoeveelheid: 8.295 });
  });

  it('elke toegelaten breedte en zijlengte heeft een prijs', () => {
    const opstellingen = sofa.kenmerken.find((k) => k.code === 'opstelling');
    if (opstellingen?.type !== 'keuze') throw new Error('opstelling ontbreekt');
    for (const o of opstellingen.keuzes) {
      const { min, max, soort } = o.eigenschappen as { min: number; max: number; soort: string };
      const zijden = soort === 'chaise' ? [150, 190] : soort === 'hoek' ? [180, 300] : [180];
      for (let b = min; b <= max; b += 7) {
        for (const zijlengte of zijden) {
          for (const stof of ['katoen_naturel', 'linnen_brume', 'boucle_belize', 'eigen_stof']) {
            const r = bank({ opstelling: o.code, breedte: b, zijlengte, stof });
            expect(codes(r), `${o.code} ${b} ${zijlengte} ${stof}`).not.toContain('prijs.niet_gevonden');
          }
        }
      }
    }
  });
});

describe('tekening', () => {
  const vorm = (r: ConfiguratieResultaat, code: string) => r.tekening!.vormen.find((v) => v.code === code);

  it('rechte sofa: rug, twee armen en zitkussens van gelijke breedte', () => {
    const t = bank().tekening!;
    expect(t.vormen.map((v) => v.code)).toEqual(['rug', 'arm_links', 'arm_rechts', 'zitkussen.1', 'zitkussen.2', 'zitkussen.3']);
    const kussens = t.vormen.filter((v) => v.code.startsWith('zitkussen'));
    expect(kussens[0]!.x).toBe(18);
    expect(kussens[2]!.x + kussens[2]!.breedte).toBeCloseTo(230 - 18);
    expect(kussens.every((k) => k.vulling === '#c9b48f')).toBe(true); // linnen Ficelle
    expect(t.maatlijnen.map((m) => [m.code, m.tekst])).toEqual([['breedte', '230'], ['diepte_rechts', '95']]);
  });

  it('hoeksofa links: zijrug, eindarm, hoekzit en maat van de zijde', () => {
    const r = bank({ opstelling: 'hoek_links', breedte: 283, zijlengte: 215, contrast: true, contraststof: 'linnen_brume' });
    expect(vorm(r, 'arm_links')).toBeUndefined();
    expect(vorm(r, 'eindarm_links')).toMatchObject({ x: 0, y: 197, breedte: 95, hoogte: 18 });
    expect(vorm(r, 'hoekzit_links')).toMatchObject({ x: 20, y: 20, vulling: '#a9b3a6' });
    expect(vorm(r, 'rug')?.vulling).toBe('#c9b48f');
    expect(r.tekening!.maatlijnen.find((m) => m.code === 'zijlengte_links')?.tekst).toBe('215');
  });

  it('kast: tussenschotten, legplanken en deuren volgen de keuzes', () => {
    const r = kast({ breedte: 1800, vakken: 3, legplanken: 2, deurtype: 'geen' });
    const codesT = r.tekening!.vormen.map((v) => v.code);
    expect(codesT.filter((c) => c.startsWith('tussenschot'))).toHaveLength(2);
    expect(codesT.filter((c) => c.startsWith('legplank'))).toHaveLength(6);
    expect(codesT.some((c) => c.startsWith('deur'))).toBe(false);
    expect(kast().tekening!.vormen.filter((v) => v.code.startsWith('greep'))).toHaveLength(2);
  });

  it('tekenSvg maakt geldige SVG en ontsnapt tekst en onveilige kleuren', () => {
    const svg = tekenSvg(bank({ opstelling: 'chaise_links', breedte: 250, zijlengte: 160 }).tekening!);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('chaise longue');
    expect(svg.match(/<rect /g)!.length).toBeGreaterThan(4);
    const vreemd = tekenSvg({
      titel: '<script>', eenheid: 'cm',
      vormen: [{ code: 'x', x: 0, y: 0, breedte: 10, hoogte: 10, vulling: 'red" onload="alert(1)', label: '<b>' }],
      maatlijnen: [],
    });
    expect(vreemd).not.toContain('<script>');
    expect(vreemd).not.toContain('onload');
    expect(vreemd).toContain('&lt;b&gt;');
  });
});

describe('algemene werking', () => {
  const klein: ProductModel = {
    code: 'T', naam: 'Test', versie: 1,
    stappen: [{ code: 's', label: 'S' }],
    kenmerken: [{ code: 'b', label: 'Breedte', stap: 's', type: 'getal', standaard: 100 }],
    afgeleid: [],
    regels: [],
    stuklijst: [{ code: 'x', omschrijving: 'X', artikel: '"ONBEKEND"', eenheid: 'stuk', aantal: '1' }],
    tabellen: [{ code: 'p', rijen: [100, 200], kolommen: ['x'], waarden: [[10], [20]] }],
    prijs: { opslagProcent: 0, verkoopprijs: 'tabel("p"; b; "x")', btwProcent: 21, minimumPrijs: 15 },
  };

  it('standaardKeuzes geeft de standaardwaarden', () => {
    expect(standaardKeuzes(maatkast)).toMatchObject({ breedte: 1200, materiaal: 'melamine_wit', plint: true });
  });

  it('meldt een artikel dat niet in de prijslijst staat', () => {
    expect(codes(berekenConfiguratie(klein, {}, {}))).toContain('stuklijst.x.artikel');
  });

  it('meldt een maat buiten de prijstabel en past het minimum toe', () => {
    expect(codes(berekenConfiguratie(klein, { b: 250 }, {}))).toContain('prijs.niet_gevonden');
    expect(berekenConfiguratie(klein, { b: 100 }, {}).prijs.brutoprijsExcl).toBe(15);
    expect(berekenConfiguratie(klein, { b: 150 }, {}).prijs.brutoprijsExcl).toBe(20);
  });

  it('modelcontrole vindt fouten die een beheerder kan maken', () => {
    const fout: ProductModel = {
      ...klein,
      kenmerken: [
        { code: 'b', label: 'B', stap: 'onbestaand', type: 'getal', standaard: 1 },
        { code: 'k', label: 'K', stap: 's', type: 'keuze', standaard: 'z', keuzes: [{ code: 'y', label: 'Y' }] },
      ],
      afgeleid: [{ code: 'a', formule: 'b * breedte' }, { code: 'c', formule: '2 +' }],
      tabellen: [{ code: 'p', rijen: [1, 2], kolommen: ['x'], waarden: [[1]] }],
      prijs: { ...klein.prijs, verkoopprijs: 'tabel("q"; b; 1)' },
    };
    const p = controleerModel(fout).map((x) => x.probleem).join('\n');
    expect(p).toMatch(/Stap "onbestaand" bestaat niet/);
    expect(p).toMatch(/Standaardkeuze "z" bestaat niet/);
    expect(p).toMatch(/Onbekende naam "breedte"/);
    expect(p).toMatch(/onvolledig/);
    expect(p).toMatch(/2 rijen × 1 kolommen/);
    expect(p).toMatch(/Onbekende tabel "q"/);
  });
});
