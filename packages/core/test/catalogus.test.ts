import { describe, expect, it } from 'vitest';
import { berekenOntwerp, controleerCatalogus, maakCode, type OntwerpCatalogus } from '../src/index.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

const kopie = (): OntwerpCatalogus => structuredClone(zetelCatalogus);

describe('catalogus-editor: controle', () => {
  it('de standaardcatalogus en alle modellen zijn in orde', () => {
    expect(controleerCatalogus(zetelCatalogus, zetelModellen)).toEqual([]);
  });

  it('maakCode maakt unieke codes', () => {
    expect(maakCode('Zitelement XL', [])).toBe('zitelement_xl');
    expect(maakCode('Zit', ['zit'])).toBe('zit_2');
  });

  it('vindt fouten in elementen', () => {
    const c = kopie();
    c.typen[0]!.breedte = { min: 100, standaard: 90, max: 80 };
    delete (c.typen[0]!.prijs as Record<string, number>).C;
    c.typen.push({ ...c.typen[1]!, label: '' });
    const p = controleerCatalogus(c).join('\n');
    expect(p).toMatch(/min ≤ standaard ≤ max/);
    expect(p).toMatch(/prijs voor groep C ontbreekt/);
    expect(p).toMatch(/bestaat al/);
    expect(p).toMatch(/geef een naam/);
  });

  it('vindt fouten in opties en verwijzingen', () => {
    const c = kopie();
    const poten = c.opties!.find((g) => g.code === 'poten')!;
    poten.standaard = 'goud';
    poten.keuzes.find((k) => k.code === 'plint')!.alleenMet = { poothoogte: ['superlaag'], kleur: ['x'] };
    c.opties!.find((g) => g.code === 'armstijl')!.voorTypen = ['bestaat_niet'];
    const p = controleerCatalogus(c).join('\n');
    expect(p).toMatch(/standaardkeuze "goud" bestaat niet/);
    expect(p).toMatch(/onbekende keuze "superlaag"/);
    expect(p).toMatch(/onbekende groep "kleur"/);
    expect(p).toMatch(/element "bestaat_niet" bestaat niet/);
  });

  it('een nieuw elementtype en een nieuwe optie werken meteen in de berekening', () => {
    const c = kopie();
    c.typen.push({ ...structuredClone(c.typen.find((t) => t.code === 'zit')!), code: 'zit_xl', label: 'Zitelement XL', prijs: { A: 900, B: 1000, C: 1100, EIGEN: 800 } });
    c.opties!.push({ code: 'logo', label: 'Logo borduren', niveau: 'ontwerp', standaard: 'nee', keuzes: [{ code: 'nee', label: 'Nee' }, { code: 'ja', label: 'Ja', prijs: 75 }] });
    expect(controleerCatalogus(c)).toEqual([]);
    const r = berekenOntwerp(
      { hoofdmateriaal: 'linnen_ficelle', opties: { logo: 'ja' }, elementen: [{ id: 'a', type: 'zit_xl', x: 0, y: 0, breedte: 60, diepte: 95, rotatie: 0 }] },
      c, standaardMaterialen,
    );
    expect(r.geldig).toBe(true);
    expect(r.prijs.brutoprijsExcl).toBe(1000 + 75);
  });

  it('modellen die een verwijderd element gebruiken worden gemeld', () => {
    const c = kopie();
    c.typen = c.typen.filter((t) => t.code !== 'chaise');
    expect(controleerCatalogus(c, zetelModellen).join('\n')).toMatch(/gebruikt element "chaise"/);
  });
});
