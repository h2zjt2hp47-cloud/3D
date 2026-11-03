import { describe, expect, it } from 'vitest';
import { blokkenVan, bouw3D, karkasHoogteVan, ontwerpOmschrijving, berekenOntwerp, type Ontwerp } from '../src/index.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

/** Opbouw zoals bij de klant: laag karkas, armen even hoog, dikke losse rugkussens die erboven uitsteken. */
const kotor = zetelModellen.find((m) => m.code === 'kotor')!;

describe('karkas en losse rugkussens', () => {
  it('Kotor: karkas 70 cm, rugkussens van de zitting (44) tot 92 cm, 24 cm dik, leunen 7° achterover', () => {
    const s = bouw3D(kotor.ontwerp, zetelCatalogus, standaardMaterialen);
    const b = blokkenVan(s, { id: 'e3' });
    const rug = b.find((x) => x.code === 'e3.rug')!;
    expect(rug.y + rug.h).toBe(70);
    expect(b.find((x) => x.code === 'e3.rugkussen')).toMatchObject({ y: 44, h: 48, d: 24, kantel: { graden: 7 } });
    const arm = blokkenVan(s, { id: 'e2' }).find((x) => x.code === 'e2.arm')!;
    expect(arm.y + arm.h).toBe(70);
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
