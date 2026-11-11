import { describe, expect, it } from 'vitest';
import { berekenOntwerp, controleerMateriaal, tekenVooraanzicht, type Ontwerp } from '../src/index.js';
import { standaardMaterialen, STOFGROEPEN } from '../voorbeelden/sofa.js';
import { startOntwerpen, zetelCatalogus, zetelOpties } from '../voorbeelden/vrij-ontwerp.js';

const recht = startOntwerpen.recht!.ontwerp;
const met = (opties: Record<string, string>, basis: Ontwerp = recht): Ontwerp => ({ ...structuredClone(basis), opties });
const bereken = (o: Ontwerp) => berekenOntwerp(o, zetelCatalogus, standaardMaterialen);
const codes = (r: { meldingen: { code: string }[] }) => r.meldingen.map((m) => m.code);

describe('aanpassingen (opties)', () => {
  it('standaardkeuzes kosten niets extra', () => {
    expect(bereken(recht).prijs.brutoprijsExcl).toBe(2124);
  });

  it('elke standaardkeuze bestaat in zijn groep', () => {
    for (const g of zetelOpties) expect(g.keuzes.some((k) => k.code === g.standaard), g.code).toBe(true);
  });

  it('poten tellen per element (slede: 4 × 95)', () => {
    const r = bereken(met({ poten: 'slede' }));
    expect(r.prijs.brutoprijsExcl).toBe(2124 + 380);
    expect(r.opties.find((o) => o.groep === 'poten')).toMatchObject({ keuze: 'slede', bedrag: 380 });
  });

  it('plint: prijs per meter en alleen met lage poothoogte', () => {
    expect(codes(bereken(met({ poten: 'plint' })))).toContain('optie.poten.plint');
    const r = bereken(met({ poten: 'plint', poothoogte: 'laag' }));
    expect(r.geldig).toBe(true);
    expect(r.prijs.brutoprijsExcl).toBe(2124 + 2 * 28 + 2 * 133);
  });

  it('procentuele opties gelden alleen op de juiste elementen', () => {
    // dons +12 % op de twee zitelementen (818), niet op de armen
    expect(bereken(met({ comfort: 'dons' })).prijs.brutoprijsExcl).toBe(2124 + 2 * 98.16);
    // hoge rug +6 % op de zitelementen
    expect(bereken(met({ rughoogte: 'hoog' })).prijs.brutoprijsExcl).toBe(2124 + 2 * 49.08);
  });

  it('opties op zetelniveau tellen één keer (houtafwerking notelaar)', () => {
    expect(bereken(met({ hout: 'notelaar' })).prijs.brutoprijsExcl).toBe(2124 + 120);
  });

  it('losse rugkussens vragen meer stof', () => {
    const basis = bereken(recht).stof[0]!.meters;
    expect(bereken(met({ rug: 'los' })).stof[0]!.meters).toBeGreaterThan(basis);
  });

  it('meldt combinaties die niet kunnen', () => {
    expect(codes(bereken(met({ rug: 'capitonne', naad: 'bies' })))).toContain('optie.rug.capitonne');
    expect(bereken(met({ rug: 'capitonne', naad: 'stiksel' })).geldig).toBe(true);
    const relax: Ontwerp = met({ zitting: 'vaste_zitting' });
    relax.elementen[1]!.opties = { functie: 'relax' };
    expect(codes(bereken(relax))).toContain('optie.functie.relax');
  });

  it('opties per element: armstijl en extra', () => {
    const o = structuredClone(recht);
    o.elementen[0]!.opties = { armstijl: 'hout', arm_extra: 'usb' };
    const r = bereken(o);
    expect(r.elementen[0]!.optieBedrag).toBe(255);
    expect(r.prijs.brutoprijsExcl).toBe(2124 + 255);
    o.elementen[3]!.opties = { armstijl: 'rond', arm_extra: 'opberg' };
    expect(codes(bereken(o))).toContain('optie.arm_extra.opberg');
  });

  it('houten tussenstuk: eigen prijs, geen stof', () => {
    const r = bereken(startOntwerpen.console!.ontwerp);
    expect(r.geldig).toBe(true);
    const c = r.elementen.find((e) => e.type === 'console')!;
    expect(c.prijs).toBe(260 + 2 * 30 + 120); // 40 cm, met lade
    expect(c.stofM).toBe(0);
    expect(c.materiaal).toBe('');
  });

  it('onbekende keuze wordt gemeld', () => {
    expect(codes(bereken(met({ poten: 'goud' })))).toContain('optie.onbekend');
  });

  it('materialen blijven geldig', () => {
    for (const m of standaardMaterialen) expect(controleerMateriaal(m, STOFGROEPEN, standaardMaterialen)).toEqual([]);
  });
});

describe('vooraanzicht', () => {
  const va = (o: Ontwerp) => tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen);

  it('toont poten, rug en zitkussens met de juiste hoogtes', () => {
    const t = va(recht);
    const codes = t.vormen.map((v) => v.code);
    expect(codes).toContain('e2.zitkussen');
    // Poten per zetel: links en rechts onder de armen en één op de grens tussen de twee zittingen.
    expect(codes.filter((c) => c.includes('.poot-')).sort()).toEqual(['e1.poot-l', 'e2.poot-r', 'e4.poot-r']);
    expect(t.vormen.find((v) => v.code === 'e2.zitkussen')).toMatchObject({ y: -45, hoogte: 14 });
    expect(t.maatlijnen.map((m) => m.tekst)).toEqual(['230', '80', 'zit 45']);
  });

  it('plint, hoge rug, hoge zit en houten blad zijn zichtbaar', () => {
    const o = met({ poten: 'plint', poothoogte: 'laag', rughoogte: 'hoog', zithoogte: 'hoog', hout: 'notelaar' });
    o.elementen[0]!.opties = { armstijl: 'houtblad' };
    const t = va(o);
    expect(t.vormen.find((v) => v.code === 'e1.plint')).toMatchObject({ hoogte: 4, vulling: '#5e4030' });
    expect(t.vormen.find((v) => v.code === 'e1.blad')?.vulling).toBe('#5e4030');
    expect(t.maatlijnen.map((m) => m.tekst)).toEqual(['230', '92', 'zit 48']);
  });

  it('slede en haarspeld worden als lijn getekend, capitonnage als knopen', () => {
    expect(va(met({ poten: 'slede' })).vormen.find((v) => v.code === 'e2.slede')?.pad).toMatch(/^M/);
    expect(va(met({ poten: 'haarspeld' })).vormen.filter((v) => v.code.startsWith('e2.poot'))).toHaveLength(2);
    expect(va(met({ rug: 'capitonne' })).vormen.find((v) => v.code === 'e2.capitonne')?.pad).toContain('a1.2');
  });

  it('houten tussenstuk met lade', () => {
    const t = va(startOntwerpen.console!.ontwerp);
    expect(t.vormen.find((v) => v.code === 'e3.console')?.vulling).toBe('#7a5a3f');
    expect(t.vormen.some((v) => v.code === 'e3.lade')).toBe(true);
  });
});
