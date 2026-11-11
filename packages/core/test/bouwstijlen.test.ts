import { describe, expect, it } from 'vitest';
import { berekenOntwerp, bouw3D, tekenVooraanzicht, type Ontwerp } from '../src/index.js';
import { bouwstijlen, bouwstijlVan, pasBouwstijlToe, STIJLGROEPEN } from '../voorbeelden/bouwstijlen.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { startOntwerpen, zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

const recht = startOntwerpen.recht!.ontwerp;
const lounge = startOntwerpen.lounge!.ontwerp;

describe('bouwstijlen: het karakter van een zetel in één keuze', () => {
  it('elke stijl geeft op elke startopstelling een geldig ontwerp, met 3D en vooraanzicht', () => {
    for (const s of bouwstijlen) for (const basis of [recht, lounge, startOntwerpen.hoek!.ontwerp]) {
      const o = pasBouwstijlToe(basis, s);
      const r = berekenOntwerp(o, zetelCatalogus, standaardMaterialen);
      expect(r.meldingen.filter((m) => m.ernst === 'fout'), s.code).toEqual([]);
      expect(bouw3D(o, zetelCatalogus, standaardMaterialen).blokken.length, s.code).toBeGreaterThan(3);
      expect(tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen).vormen.length, s.code).toBeGreaterThan(3);
    }
  });
  it('gebruikt alleen keuzes die in de catalogus bestaan en alleen de stijlgroepen', () => {
    for (const s of bouwstijlen) for (const [groep, keuze] of Object.entries(s.opties)) {
      expect(STIJLGROEPEN, `${s.code}: ${groep}`).toContain(groep);
      const g = zetelCatalogus.opties!.find((x) => x.code === groep);
      expect(g?.keuzes.some((k) => k.code === keuze), `${s.code}: ${groep} = ${keuze}`).toBe(true);
    }
    expect(new Set(bouwstijlen.map((s) => s.code)).size).toBe(bouwstijlen.length);
  });
  it('laat elementen, stof en hout staan; vervangt de keuzes en de vormgeving van het karakter', () => {
    const basis: Ontwerp = { ...structuredClone(recht), opties: { hout: 'notelaar', poten: 'plint', poothoogte: 'laag', naad: 'contrastbies' }, vormgeving: { kussendikte: 10, opbouw: 'doorlopend', bocht: 20 } };
    const o = pasBouwstijlToe(basis, bouwstijlen.find((s) => s.code === 'dun_op_poten')!);
    expect(o.elementen).toEqual(basis.elementen);
    expect(o.hoofdmateriaal).toBe(basis.hoofdmateriaal);
    expect(o.opties).toMatchObject({ hout: 'notelaar', poten: 'metaal_staaf', rug: 'los_dons' });
    expect(o.opties!.naad).toBeUndefined(); // hoort bij het karakter: valt terug op de standaard
    expect(o.vormgeving).toMatchObject({ kussendikte: 23, kussenoversteek: 3, opbouw: 'doorlopend', bocht: 20 });
    expect(basis.opties!.poten).toBe('plint'); // het oorspronkelijke ontwerp blijft ongemoeid
  });
  it('de stijlen zijn in 3D van elkaar te onderscheiden (onderbouw, zitkussen, poten, rug)', () => {
    const kenmerk = (code: string) => {
      const b = bouw3D(pasBouwstijlToe(recht, bouwstijlen.find((s) => s.code === code)!), zetelCatalogus, standaardMaterialen).blokken;
      const basis = b.find((x) => x.code === 'e2.basis')!, kussen = b.find((x) => x.code === 'e2.zitkussen'), rug = b.find((x) => x.code === 'e2.rug')!;
      return [basis.y, basis.h, kussen?.h ?? 0, rug.y + rug.h, b.some((x) => x.code.includes('rugkussen')), b.some((x) => x.code.includes('.poot-'))].join('|');
    };
    const alle = bouwstijlen.map((s) => kenmerk(s.code));
    expect(new Set(alle).size).toBe(alle.length);
  });
  it('herkent welke stijl een ontwerp heeft, tot er iets aan verandert', () => {
    const stijl = bouwstijlen.find((s) => s.code === 'plateau')!;
    const o = pasBouwstijlToe(recht, stijl);
    expect(bouwstijlVan(o)?.code).toBe('plateau');
    expect(bouwstijlVan({ ...o, vormgeving: { ...o.vormgeving, kussendikte: 20 } })).toBeUndefined();
    expect(bouwstijlVan(recht)).toBeUndefined();
  });
});
