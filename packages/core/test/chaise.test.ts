import { describe, expect, it } from 'vitest';
import { berekenOntwerp, blokkenVan, bouw3D, controleerCatalogus, tekenVooraanzicht, type Ontwerp } from '../src/index.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { startOntwerpen, zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

/** Losse chaise longue (rotatie 0), eventueel met rugleuning. */
const chaise = (rug?: string, extra: Partial<Ontwerp> = {}): Ontwerp => ({
  hoofdmateriaal: 'linnen_ficelle',
  elementen: [{ id: 'c', type: 'chaise', x: 0, y: 0, breedte: 85, diepte: 165, rotatie: 0, ...(rug ? { opties: { chaise_rug: rug } } : {}) }],
  ...extra,
});
const bereken = (o: Ontwerp) => berekenOntwerp(o, zetelCatalogus, standaardMaterialen);

describe('chaise longue met rugleuning', () => {
  it('catalogus blijft geldig', () => {
    expect(controleerCatalogus(zetelCatalogus)).toEqual([]);
  });
  it('standaard mét rugleuning achteraan (de rug van de zetel loopt door achter de chaise)', () => {
    expect(blokkenVan(bouw3D(chaise(), zetelCatalogus, standaardMaterialen), { id: 'c' }).some((b) => b.code === 'c.rug')).toBe(true);
    expect(bereken(chaise()).prijs.brutoprijsExcl).toBe(bereken(chaise('achter')).prijs.brutoprijsExcl);
  });
  it('zonder rugleuning (open uiteinde): geen rug en goedkoper', () => {
    expect(blokkenVan(bouw3D(chaise('geen'), zetelCatalogus, standaardMaterialen), { id: 'c' }).some((b) => b.code === 'c.rug')).toBe(false);
    expect(bereken(chaise('geen')).prijs.brutoprijsExcl).toBeLessThan(bereken(chaise()).prijs.brutoprijsExcl);
  });
  it('rugleuning achteraan: rug over de breedte, kussens ervoor, meerprijs', () => {
    const b = blokkenVan(bouw3D(chaise('achter'), zetelCatalogus, standaardMaterialen), { id: 'c' });
    expect(b.find((x) => x.code === 'c.rug')).toMatchObject({ x: 0, z: 0, b: 85, d: 18, h: 68 });
    // Onderbouw 1,5 cm achter de voorkant van het zitkussen (schaduwlijn).
    expect(b.find((x) => x.code === 'c.basis')).toMatchObject({ z: 18, d: 145.5 });
    expect(bereken(chaise('achter')).prijs.brutoprijsExcl).toBeGreaterThan(bereken(chaise('geen')).prijs.brutoprijsExcl);
    expect(bereken(chaise('achter')).geldig).toBe(true);
  });
  it('rugleuning lange zijde links en rechts (méridienne), ook gedraaid', () => {
    const links = blokkenVan(bouw3D(chaise('links'), zetelCatalogus, standaardMaterialen), { id: 'c' });
    expect(links.find((x) => x.code === 'c.rug')).toMatchObject({ x: 0, z: 0, b: 18, d: 165 });
    const rechts = blokkenVan(bouw3D(chaise('rechts'), zetelCatalogus, standaardMaterialen), { id: 'c' });
    expect(rechts.find((x) => x.code === 'c.rug')).toMatchObject({ x: 67, b: 18, d: 165 });
    // Gedraaid 90° (rug rechts): de lange zijde "links" ligt dan achteraan.
    const o = chaise('links');
    o.elementen[0]!.rotatie = 90;
    const g = blokkenVan(bouw3D(o, zetelCatalogus, standaardMaterialen), { id: 'c' }).find((x) => x.code === 'c.rug')!;
    expect(g).toMatchObject({ x: 0, z: 0, b: 165, d: 18 });
  });
  it('losse rugkussens en rughoogte werken ook op de chaise', () => {
    const o = chaise('achter', { opties: { rug: 'los', rughoogte: 'hoog' } });
    const b = blokkenVan(bouw3D(o, zetelCatalogus, standaardMaterialen), { id: 'c' });
    expect(b.some((x) => x.code === 'c.rugkussen')).toBe(true);
    expect(Math.max(...b.map((x) => x.y + x.h))).toBe(92);
  });
  it('vooraanzicht toont de rug', () => {
    const va = tekenVooraanzicht(chaise('achter'), zetelCatalogus, standaardMaterialen);
    expect(va.vormen.some((v) => v.code === 'c.rug')).toBe(true);
    expect(tekenVooraanzicht(chaise('geen'), zetelCatalogus, standaardMaterialen).vormen.some((v) => v.code === 'c.rug')).toBe(false);
  });
  it('voorbeeld met chaise blijft geldig', () => {
    expect(bereken(startOntwerpen.lounge!.ontwerp).geldig).toBe(true);
  });
});
