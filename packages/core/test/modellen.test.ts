import { describe, expect, it } from 'vitest';
import { berekenOntwerp, bouw3D, tekenVooraanzicht, vormgevingVan, type Ontwerp } from '../src/index.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { startOntwerpen, zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

const bereken = (o: Ontwerp) => berekenOntwerp(o, zetelCatalogus, standaardMaterialen);
const codes = (r: { meldingen: { code: string }[] }) => r.meldingen.map((m) => m.code);

describe('modellen', () => {
  it('alle modellen zijn geldige ontwerpen zonder fouten', () => {
    for (const m of zetelModellen) {
      const r = bereken(m.ontwerp);
      expect(r.meldingen.filter((x) => x.ernst === 'fout'), m.naam).toEqual([]);
      expect(r.prijs.brutoprijsExcl, m.naam).toBeGreaterThan(200);
      expect(bouw3D(m.ontwerp, zetelCatalogus, standaardMaterialen).blokken.length, m.naam).toBeGreaterThan(1);
      expect(tekenVooraanzicht(m.ontwerp, zetelCatalogus, standaardMaterialen).vormen.length, m.naam).toBeGreaterThan(1);
    }
  });

  it('modellen hebben unieke codes en vermelden hun bron', () => {
    expect(new Set(zetelModellen.map((m) => m.code)).size).toBe(zetelModellen.length);
    expect(zetelModellen.every((m) => m.bron && m.ontwerp.model === m.code)).toBe(true);
  });
});

describe('ontwerpmodus (vormgeving)', () => {
  const recht = startOntwerpen.recht!.ontwerp;
  const metVorm = (vorm: Ontwerp['vormgeving'], element?: Ontwerp['vormgeving']): Ontwerp => {
    const o: Ontwerp = { ...structuredClone(recht), vormgeving: vorm };
    if (element) o.elementen[1]!.vorm = element;
    return o;
  };

  it('vormgeving: standaard ← model ← element', () => {
    const o = metVorm({ zachtheid: 8, rugdikte: 22 }, { rugdikte: 12 });
    expect(vormgevingVan(o)).toMatchObject({ zachtheid: 8, rugdikte: 22, kussendikte: 14 });
    expect(vormgevingVan(o, o.elementen[1])).toMatchObject({ zachtheid: 8, rugdikte: 12 });
  });

  it('standaardvormgeving kost niets extra', () => {
    expect(bereken(recht).prijs.brutoprijsExcl).toBe(2124);
  });

  it('meerprijs: extra kussens, hellende rug, dikkere rug, houten frame', () => {
    // zit 95 cm = 818 per element; 2 zitelementen
    expect(bereken(metVorm({ zitkussens: 2 })).prijs.brutoprijsExcl).toBe(2124 + 2 * 45);
    expect(bereken(metVorm({ rugvorm: 'hellend' })).prijs.brutoprijsExcl).toBe(2124 + 2 * 40.9);
    expect(bereken(metVorm({ rugdikte: 23 })).prijs.brutoprijsExcl).toBe(2124 + 2 * 28.5); // 5 cm × 6 × 0,95 m
    expect(bereken(metVorm({ houtframe: 'zijkant' })).prijs.brutoprijsExcl).toBe(2124 + 2 * 120);
    // alleen element 2 aangepast
    expect(bereken(metVorm(undefined, { zitkussens: 3 })).prijs.brutoprijsExcl).toBe(2124 + 90);
  });

  it('waarden buiten de grenzen worden gemeld', () => {
    expect(codes(bereken(metVorm(undefined, { rugdikte: 40 })))).toContain('vorm.rugdikte');
    expect(codes(bereken(metVorm({ zitkussens: 5 })))).toContain('vorm.zitkussens');
  });

  it('meerdere zitkussens zijn zichtbaar in boven-, vooraanzicht en 3D', () => {
    const o = metVorm({ zitkussens: 2, kussendikte: 18 });
    expect(bereken(o).tekening.vormen.filter((v) => v.code.startsWith('e2.kussen'))).toHaveLength(2);
    const va = tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen).vormen;
    expect(va.filter((v) => v.code.startsWith('e2.zitkussen'))).toHaveLength(2);
    expect(va.find((v) => v.code === 'e2.zitkussen1')?.hoogte).toBe(18);
    expect(bouw3D(o, zetelCatalogus, standaardMaterialen).blokken.filter((b) => b.code.startsWith('e2.zitkussen'))).toHaveLength(2);
  });

  it('hellende rug kantelt in 3D naar achter; houten frame verschijnt', () => {
    const s = bouw3D(metVorm({ rugvorm: 'hellend', houtframe: 'rondom' }), zetelCatalogus, standaardMaterialen);
    expect(s.blokken.find((b) => b.code === 'e2.rug')?.kantel).toEqual({ graden: 9, richting: 'z-' });
    expect(s.blokken.filter((b) => b.code.startsWith('e2.frame'))).toHaveLength(3);
  });

  it('afgerond eindelement: ronde contour in het bovenaanzicht, cilinder in 3D', () => {
    const doha = zetelModellen.find((m) => m.code === 'doha')!.ontwerp;
    const r = bereken(doha);
    expect(r.tekening.vormen.find((v) => v.code === 'e1.zit')?.pad).toMatch(/^M.* Z$/);
    const s = bouw3D(doha, zetelCatalogus, standaardMaterialen);
    expect(s.blokken.find((b) => b.code === 'e1.basis-rond')).toMatchObject({ vorm: 'cilinder' });
  });

  it('lage houten bank (Kotor)', () => {
    const kotor = zetelModellen.find((m) => m.code === 'kotor')!.ontwerp;
    const s = bouw3D(kotor, zetelCatalogus, standaardMaterialen);
    expect(s.blokken.find((b) => b.code === 'e1.bankblad')).toMatchObject({ soort: 'hout', y: 23, h: 5 });
  });
});

describe('collectie', () => {
  it('bevat de 42 modellen van de website, per familie', () => {
    const tel = (f: string) => zetelModellen.filter((m) => m.familie === f).length;
    expect(zetelModellen).toHaveLength(42);
    expect([tel("Sofa's"), tel('Fauteuils'), tel('Zetelbedden'), tel('Poufs & hockers')]).toEqual([14, 14, 6, 8]);
  });

  it('zetelbedden hebben een slaapfunctie met meerprijs', () => {
    for (const m of zetelModellen.filter((x) => x.familie === 'Zetelbedden')) {
      const r = bereken(m.ontwerp);
      expect(r.opties.find((o) => o.keuze === 'slaapfunctie')?.bedrag, m.naam).toBe(590);
    }
  });

  it('nieuwe onderdelen verschijnen in 3D: draaivoet, housse, ronde poef, kuipfauteuil', () => {
    const blokken = (code: string) => bouw3D(zetelModellen.find((m) => m.code === code)!.ontwerp, zetelCatalogus, standaardMaterialen).blokken;
    expect(blokken('quin').some((b) => b.code === 'e1.draaivoet')).toBe(true);
    expect(blokken('husk').some((b) => b.code === 'e2.housse')).toBe(true);
    expect(blokken('husk').some((b) => b.code.includes('.poot-'))).toBe(false);
    expect(blokken('fez').find((b) => b.code === 'e1.poef')).toMatchObject({ vorm: 'cilinder' });
    expect(blokken('tumble').find((b) => b.code === 'e1.basis')).toMatchObject({ vorm: 'cilinder' });
    expect(blokken('pebble').some((b) => b.code === 'e1.arm-l')).toBe(true);
  });
});
