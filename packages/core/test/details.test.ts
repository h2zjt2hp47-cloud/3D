import { describe, expect, it } from 'vitest';
import { berekenOntwerp, blokkenVan, bouw3D, tekenVooraanzicht, type Ontwerp, type OntwerpElement, type Rotatie } from '../src/index.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

/** Details die de modellen van elkaar onderscheiden: uitlopende arm, nekrol, zachtheid. */
const bank = (opties: Record<string, string> = {}, extra: Partial<Ontwerp> = {}, armstijl = 'strak'): Ontwerp => ({
  hoofdmateriaal: 'linnen_ficelle',
  opties: { rug: 'los', ...opties },
  elementen: [
    { id: 'a1', type: 'arm', x: 0, y: 0, breedte: 20, diepte: 95, rotatie: 0, opties: { armstijl } },
    { id: 'z', type: 'zit', x: 20, y: 0, breedte: 100, diepte: 95, rotatie: 0 },
    { id: 'a2', type: 'arm', x: 120, y: 0, breedte: 20, diepte: 95, rotatie: 0, opties: { armstijl } },
  ],
  ...extra,
});
const blok = (o: Ontwerp, code: string) => bouw3D(o, zetelCatalogus, standaardMaterialen).blokken.find((b) => b.code === code);

describe('uitlopende arm', () => {
  it('smal tegen de zitting, met de lip aan de buitenkant (links en rechts), oplopend naar het karkas', () => {
    const o = bank({}, { vormgeving: { armhoogte: 63, karkashoogte: 86 } }, 'uitlopend');
    const s = bouw3D(o, zetelCatalogus, standaardMaterialen).blokken;
    const lip1 = s.find((b) => b.code === 'a1.lip')!, lip2 = s.find((b) => b.code === 'a2.lip')!;
    expect(lip1.x).toBe(0); // linkerarm: lip links (buiten)
    expect(lip2.x + lip2.b).toBe(140); // rechterarm: lip rechts (buiten)
    const wand1 = s.find((b) => b.code === 'a1.arm')!;
    expect(wand1.vorm).toBe('kuipwand');
    expect(Math.min(...wand1.pad!.map((q) => q[0]))).toBeGreaterThan(10); // tegen de zitting, niet aan de buitenkant
    expect(wand1.hoogtes![0]).toBeLessThan(wand1.hoogtes![wand1.hoogtes!.length - 1]!); // vooraan lager dan achteraan
    expect(Math.max(...wand1.hoogtes!)).toBeCloseTo(86, 5);
    expect(berekenOntwerp(o, zetelCatalogus, standaardMaterialen).prijs.brutoprijsExcl).toBeGreaterThan(berekenOntwerp(bank({}, { vormgeving: { armhoogte: 63, karkashoogte: 86 } }), zetelCatalogus, standaardMaterialen).prijs.brutoprijsExcl);
    expect(tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen).vormen.find((v) => v.code === 'a1.arm')?.pad).toBeTruthy();
  });
  it('bij een gedraaide zetel (armen achter- en vooraan) zit de lip ook aan de buitenkant', () => {
    const arm = (y: number, rotatie: Rotatie): OntwerpElement => ({ id: `a${y}`, type: 'arm', x: 0, y, breedte: 20, diepte: 95, rotatie, opties: { armstijl: 'uitlopend' } });
    const o: Ontwerp = { hoofdmateriaal: 'linnen_ficelle', elementen: [arm(0, 90), { id: 'z', type: 'zit', x: 0, y: 20, breedte: 100, diepte: 95, rotatie: 90 }, arm(120, 90)] };
    const s = bouw3D(o, zetelCatalogus, standaardMaterialen).blokken;
    expect(s.find((b) => b.code === 'a0.lip')!.z).toBe(0);
    const lip = s.find((b) => b.code === 'a120.lip')!;
    expect(lip.z + lip.d).toBe(140);
  });
});

describe('nekrol', () => {
  it('alleen met losse rugkussens, bovenop het karkas, bij elke draaiing', () => {
    for (const rotatie of [0, 90, 180, 270] as Rotatie[]) {
      const o: Ontwerp = { hoofdmateriaal: 'linnen_ficelle', opties: { rug: 'los', nekrol: 'met' }, elementen: [{ id: 'z', type: 'zit', x: 0, y: 0, breedte: 100, diepte: 95, rotatie }] };
      const s = bouw3D(o, zetelCatalogus, standaardMaterialen);
      const rol = blokkenVan(s, { id: 'z' }).find((b) => b.code === 'z.nekrol')!;
      const rug = blokkenVan(s, { id: 'z' }).find((b) => b.code === 'z.rug')!;
      expect(rol, String(rotatie)).toBeTruthy();
      expect(rol.y).toBeCloseTo(rug.y + rug.h - 2, 5);
      expect(rol.as).toBe(rotatie === 0 || rotatie === 180 ? 'x' : 'z');
    }
    const vast = bank({ rug: 'vast', nekrol: 'met' });
    expect(blok(vast, 'z.nekrol')).toBeUndefined();
    expect(berekenOntwerp(vast, zetelCatalogus, standaardMaterialen).meldingen.some((m) => m.code === 'optie.nekrol.met')).toBe(true);
  });
});

describe('zachtheid geeft karakter', () => {
  it('strakke blokken (2) tegenover bolle donskussens (9)', () => {
    const strak = blok(bank({}, { vormgeving: { zachtheid: 2 } }), 'z.rugkussen')!;
    const zacht = blok(bank({ rug: 'los_dons' }, { vormgeving: { zachtheid: 9 } }), 'z.rugkussen')!;
    expect(strak.bol!).toBeLessThan(zacht.bol! / 2);
    expect(strak.kantel!.graden).toBeLessThan(zacht.kantel!.graden);
    expect(strak.afronding!).toBeLessThan(zacht.afronding!);
  });
});

describe('rug rond het ronde uiteinde (Doha, Montego)', () => {
  it('gebogen wand binnen de voetafdruk, hoog achteraan en lager vooraan, bij elke draaiing', () => {
    for (const rotatie of [0, 90, 180, 270] as Rotatie[]) {
      for (const kant of ['links', 'rechts']) {
        const o: Ontwerp = { hoofdmateriaal: 'boucle_belize', opties: { rug: 'los' }, elementen: [{ id: 'r', type: 'rond_einde', x: 0, y: 0, breedte: 130, diepte: 100, rotatie, opties: { ronde_kant: kant, rug_rond: 'rond' } }] };
        const wand = bouw3D(o, zetelCatalogus, standaardMaterialen).blokken.find((b) => b.code === 'r.rugrond')!;
        expect(wand, `${rotatie} ${kant}`).toBeTruthy();
        expect(wand.vorm).toBe('kuipwand');
        const breed = rotatie === 0 || rotatie === 180 ? 130 : 100, diep = rotatie === 0 || rotatie === 180 ? 100 : 130;
        for (const [x, z] of wand.pad!) { expect(x).toBeGreaterThanOrEqual(-1); expect(x).toBeLessThanOrEqual(breed + 1); expect(z).toBeGreaterThanOrEqual(-1); expect(z).toBeLessThanOrEqual(diep + 1); }
        expect(wand.hoogtes![0]!).toBeGreaterThan(wand.hoogtes![wand.hoogtes!.length - 1]!);
      }
    }
    const zonder: Ontwerp = { hoofdmateriaal: 'boucle_belize', elementen: [{ id: 'r', type: 'rond_einde', x: 0, y: 0, breedte: 130, diepte: 100, rotatie: 0 }] };
    expect(bouw3D(zonder, zetelCatalogus, standaardMaterialen).blokken.some((b) => b.code === 'r.rugrond')).toBe(false);
  });
});
