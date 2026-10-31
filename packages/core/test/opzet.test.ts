import { describe, expect, it } from 'vitest';
import { berekenOntwerp, bouw3D, dragerVan, tekenVooraanzicht, type Ontwerp } from '../src/index.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

const chaise = (extra: Ontwerp['elementen'] = []): Ontwerp => ({
  hoofdmateriaal: 'linnen_ficelle',
  elementen: [{ id: 'c', type: 'chaise', x: 0, y: 0, breedte: 90, diepte: 165, rotatie: 0 }, ...extra],
});
const bereken = (o: Ontwerp) => berekenOntwerp(o, zetelCatalogus, standaardMaterialen);
const codes = (r: { meldingen: { code: string }[] }) => r.meldingen.map((m) => m.code);

describe('rugleuningen en kussens (opzet-elementen)', () => {
  const rug = { id: 'r', type: 'rugleuning', x: 0, y: 0, breedte: 90, diepte: 18, rotatie: 0 as const };

  it('een rugleuning op een chaise longue: geen overlapfout, wel prijs en stof', () => {
    const zonder = bereken(chaise());
    const met = bereken(chaise([rug]));
    expect(met.geldig).toBe(true);
    expect(codes(met)).not.toContain('ontwerp.overlap');
    expect(codes(met)).not.toContain('ontwerp.los');
    // rugleuning B, 90 cm: 270 + 6 × 16 = 366
    expect(met.prijs.brutoprijsExcl).toBe(zonder.prijs.brutoprijsExcl + 366);
    expect(met.stof[0]!.meters).toBeGreaterThan(zonder.stof[0]!.meters);
    expect(dragerVan(chaise([rug]), zetelCatalogus, rug)?.id).toBe('c');
  });

  it('een rugleuning die nergens op ligt is een fout', () => {
    const r = bereken(chaise([{ ...rug, x: 300 }]));
    expect(codes(r)).toContain('opzet.los');
  });

  it('opzet-elementen worden boven het element getekend en krijgen geen poten', () => {
    const o = chaise([rug, { id: 'k', type: 'sierkussen', x: 10, y: 20, breedte: 45, diepte: 14, rotatie: 0 }]);
    const vormen = bereken(o).tekening.vormen.map((v) => v.code);
    expect(vormen.indexOf('r.rugleuning')).toBeGreaterThan(vormen.indexOf('c.kussen'));
    const s = bouw3D(o, zetelCatalogus, standaardMaterialen);
    expect(s.blokken.some((b) => b.code.startsWith('r.poot'))).toBe(false);
    // rust op de basis van de chaise: zithoogte 45 − kussendikte 14
    expect(s.blokken.find((b) => b.code === 'r.rugleuning')).toMatchObject({ y: 31, h: 49 });
    expect(s.blokken.find((b) => b.code === 'k.kussen')).toMatchObject({ y: 43, kantel: { graden: 14, richting: 'z-' } });
  });

  it('rolkussen wordt een liggende cilinder; vooraanzicht toont rugleuning en kussen', () => {
    const o = chaise([rug, { id: 'n', type: 'rolkussen', x: 2, y: 20, breedte: 60, diepte: 20, rotatie: 270 }]);
    expect(bouw3D(o, zetelCatalogus, standaardMaterialen).blokken.find((b) => b.code === 'n.rol')).toMatchObject({ vorm: 'cilinder', as: 'z' });
    const va = tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen).vormen.map((v) => v.code);
    expect(va).toContain('r.rugleuning');
    expect(va).toContain('n.rol');
  });

  it('kussenvulling dons: +20 %', () => {
    const k = { id: 'k', type: 'rugkussen', x: 10, y: 18, breedte: 70, diepte: 18, rotatie: 0 as const };
    const basis = bereken(chaise([k])).elementen.find((e) => e.id === 'k')!.prijs;
    const dons = bereken(chaise([{ ...k, opties: { kussenvulling: 'dons' } }])).elementen.find((e) => e.id === 'k')!.prijs;
    expect(dons).toBeCloseTo(basis * 1.2, 1);
  });
});

describe('materiaal van opzet-elementen', () => {
  it('kussen neemt standaard de stof van het element eronder', () => {
    const o: Ontwerp = {
      hoofdmateriaal: 'linnen_ficelle',
      elementen: [
        { id: 'c', type: 'chaise', x: 0, y: 0, breedte: 90, diepte: 165, rotatie: 0, materiaal: 'linnen_brume' },
        { id: 'k', type: 'rugkussen', x: 10, y: 0, breedte: 70, diepte: 18, rotatie: 0 },
      ],
    };
    expect(berekenOntwerp(o, zetelCatalogus, standaardMaterialen).elementen.find((e) => e.id === 'k')?.materiaal).toBe('linnen_brume');
    expect(bouw3D(o, zetelCatalogus, standaardMaterialen).blokken.find((b) => b.code === 'k.kussen')?.kleur).toBe('#a9b3a6');
  });
});
