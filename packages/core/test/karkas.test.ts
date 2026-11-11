import { describe, expect, it } from 'vitest';
import { blokkenVan, bouw3D, karkasHoogteVan, ontwerpOmschrijving, berekenOntwerp, type Ontwerp } from '../src/index.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

/** Opbouw zoals bij de klant: laag karkas, armen even hoog, dikke losse rugkussens die erboven uitsteken. */
const kotor = zetelModellen.find((m) => m.code === 'kotor')!;

describe('karkas en losse rugkussens', () => {
  it('Kotor: karkas 70 cm, rugkussens van de zitting (44) tot 92 cm, 26 cm dik, leunen achterover volgens de zachtheid', () => {
    const s = bouw3D(kotor.ontwerp, zetelCatalogus, standaardMaterialen);
    const b = blokkenVan(s, { id: 'e3' });
    const rug = b.find((x) => x.code === 'e3.rug')!;
    expect(rug.y + rug.h).toBe(70);
    // Zachtheid 8: 2 + 8 × 0,8 = 8,4° achterover. Donzen rugkussens zijn losse kussens met een mesrand.
    expect(b.find((x) => x.code === 'e3.rugkussen')).toMatchObject({ y: 44, h: 48, d: 26, kantel: { graden: 8.4 }, mesrand: true });
    const arm = blokkenVan(s, { id: 'e5' }).find((x) => x.code === 'e5.arm')!;
    expect(arm.y + arm.h).toBe(70);
  });
  it('zitkussen: plat op de onderbouw (kleine afronding onderaan), bovenaan zacht; de onderbouw in de stof zelf', () => {
    const s = bouw3D(kotor.ontwerp, zetelCatalogus, standaardMaterialen);
    const b = blokkenVan(s, { id: 'e2' });
    const kussen = b.find((x) => x.code === 'e2.zitkussen')!, basis = b.find((x) => x.code === 'e2.basis')!;
    expect(kussen.afrondingOnder!).toBeLessThan(kussen.afronding! / 2);
    expect(kussen.mesrand).toBeUndefined();
    // Zelfde kleur en weefsel als het kussen (tot 11/11 een donkerdere, vlakke band).
    expect(basis.kleur).toBe(kussen.kleur);
    expect(basis.weefsel).toBe(kussen.weefsel);
    // Kotor: het kussen steekt vooraan 3 cm over de onderbouw.
    expect(kussen.z + kussen.d - (basis.z + basis.d)).toBeCloseTo(3, 1);
  });
  it('zonder karkashoogte: zoals vroeger 10 cm onder de rughoogte; zonder losse kussens is het karkas de rug', () => {
    const o: Ontwerp = { hoofdmateriaal: 'linnen_ficelle', opties: { rug: 'los' }, elementen: [{ id: 'z', type: 'zit', x: 0, y: 0, breedte: 95, diepte: 95, rotatie: 0 }] };
    expect(karkasHoogteVan(o, zetelCatalogus, o.elementen[0]!, true)).toBe(70);
    expect(karkasHoogteVan(o, zetelCatalogus, o.elementen[0]!, false)).toBe(80);
  });
  it('één lang zitkussen met twee rugkussens (Husk, Wallace)', () => {
    const o: Ontwerp = { hoofdmateriaal: 'linnen_ficelle', opties: { rug: 'los' }, vormgeving: { rugkussens: 2 }, elementen: [{ id: 'z', type: 'zit', x: 0, y: 0, breedte: 200, diepte: 95, rotatie: 0 }] };
    const b = blokkenVan(bouw3D(o, zetelCatalogus, standaardMaterialen), { id: 'z' });
    expect(b.filter((x) => x.code.startsWith('z.rugkussen'))).toHaveLength(2);
    expect(b.filter((x) => x.code.startsWith('z.zitkussen'))).toHaveLength(1);
  });
  it('de offertetekst van Kotor noemt de hoogtes van het model, niet de standaardkeuzes', () => {
    const r = berekenOntwerp(kotor.ontwerp, zetelCatalogus, standaardMaterialen);
    const tekst = ontwerpOmschrijving(kotor.ontwerp, zetelCatalogus, standaardMaterialen, r, { modelNaam: 'Kotor', modelVormgeving: kotor.ontwerp.vormgeving }).join('\n');
    expect(tekst).toContain('- Rughoogte: 92 cm');
    expect(tekst).toContain('- Zithoogte: 44 cm');
    expect(tekst).toMatch(/Armleuning 15 × 105 cm[^\n]*armhoogte: 70 cm/);
    expect(tekst).not.toContain('(op maat)');
  });
});
