import { describe, expect, it } from 'vitest';
import { berekenOntwerp, bouw3D, hoogtesVan, tekenVooraanzicht, type Ontwerp } from '../src/index.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { startOntwerpen, zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

const recht = (): Ontwerp => structuredClone(startOntwerpen.recht!.ontwerp);
const bereken = (o: Ontwerp) => berekenOntwerp(o, zetelCatalogus, standaardMaterialen);
const codes = (r: { meldingen: { code: string }[] }) => r.meldingen.map((m) => m.code);

describe('vrije hoogtes (getekend in het vooraanzicht)', () => {
  it('zonder vrije hoogtes gelden de opties', () => {
    const o = recht();
    expect(hoogtesVan(o, zetelCatalogus, o.elementen[1])).toEqual({ zithoogte: 45, poothoogte: 12, rughoogte: 80, armhoogte: 62 });
    o.opties = { rughoogte: 'hoog', zithoogte: 'hoog' };
    expect(hoogtesVan(o, zetelCatalogus, o.elementen[1])).toMatchObject({ zithoogte: 48, rughoogte: 92 });
  });

  it('rughoogte per element, zit- en poothoogte voor de hele zetel', () => {
    const o = recht();
    o.vormgeving = { zithoogte: 47, poothoogte: 6 };
    o.elementen[1]!.vorm = { rughoogte: 95 };
    o.elementen[0]!.vorm = { armhoogte: 70 };
    expect(hoogtesVan(o, zetelCatalogus, o.elementen[1])).toMatchObject({ zithoogte: 47, poothoogte: 6, rughoogte: 95 });
    expect(hoogtesVan(o, zetelCatalogus, o.elementen[2])).toMatchObject({ rughoogte: 80 });
    const s = bouw3D(o, zetelCatalogus, standaardMaterialen);
    expect(s.blokken.find((b) => b.code === 'e2.rug')).toMatchObject({ y: 6, h: 89 });
    expect(s.blokken.find((b) => b.code === 'e3.rug')).toMatchObject({ h: 74 });
    expect(s.blokken.find((b) => b.code === 'e1.arm')).toMatchObject({ h: 64 });
    expect(s.blokken.find((b) => b.code === 'e2.zitkussen')).toMatchObject({ y: 33 });
    const va = tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen);
    expect(va.maatlijnen.find((m) => m.code === 'zithoogte')?.tekst).toBe('zit 47');
  });

  it('hogere rug kost meer en vraagt meer stof; lagere rug kost minder', () => {
    const basis = bereken(recht());
    const hoog = recht();
    hoog.elementen[1]!.vorm = { rughoogte: 90 };
    const r = bereken(hoog);
    // zit 95 cm = 818; +10 cm × 0,5 % = 5 % = 40,90
    expect(r.prijs.brutoprijsExcl).toBe(basis.prijs.brutoprijsExcl + 40.9);
    expect(r.stof[0]!.meters).toBeGreaterThan(basis.stof[0]!.meters);
    const laag = recht();
    laag.elementen[1]!.vorm = { rughoogte: 70 };
    expect(bereken(laag).prijs.brutoprijsExcl).toBe(basis.prijs.brutoprijsExcl - 20.45);
  });

  it('hoogtes buiten de grenzen worden gemeld', () => {
    const o = recht();
    o.vormgeving = { zithoogte: 70 };
    o.elementen[1]!.vorm = { rughoogte: 130 };
    const c = codes(bereken(o));
    expect(c).toContain('vorm.zithoogte');
    expect(c).toContain('vorm.rughoogte');
  });
});
