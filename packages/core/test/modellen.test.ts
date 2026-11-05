import { describe, expect, it } from 'vitest';
import { berekenOntwerp, blokkenVan, bouw3D, tekenVooraanzicht, vormgevingVan, type Ontwerp } from '../src/index.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { startOntwerpen, zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

const bereken = (o: Ontwerp) => berekenOntwerp(o, zetelCatalogus, standaardMaterialen);
const codes = (r: { meldingen: { code: string }[] }) => r.meldingen.map((m) => m.code);

describe('chaise longue in de modellen (afgeleid uit de productfoto)', () => {
  it('Kotor, Belize, Pula en Fréjus: rug loopt door achter de chaise; Azar: open uiteinde', () => {
    const rugVan = (code: string) => {
      const m = zetelModellen.find((x) => x.code === code)!;
      const s = bouw3D(m.ontwerp, zetelCatalogus, standaardMaterialen);
      return m.ontwerp.elementen.filter((e) => e.type === 'chaise').map((e) => blokkenVan(s, { id: e.id }).some((b) => b.code === `${e.id}.rug`));
    };
    for (const code of ['kotor', 'belize', 'pula', 'frejus']) expect(rugVan(code), code).not.toContain(false);
    expect(rugVan('azar')).toEqual([false]);
  });
});

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
    // Doha per element (zonder de doorlopende opbouw van het model): elk afgerond element apart.
    const model = zetelModellen.find((m) => m.code === 'doha')!.ontwerp;
    const doha: Ontwerp = { ...model, vormgeving: { ...model.vormgeving, opbouw: 'elementen' } };
    const r = bereken(doha);
    expect(r.tekening.vormen.find((v) => v.code === 'e1.zit')?.pad).toMatch(/^M.* Z$/);
    const s = bouw3D(doha, zetelCatalogus, standaardMaterialen);
    // Basis en zitkussen elk uit één stuk met een ronde kant (omtrek), niet meer een losse cilinder.
    const basis = s.blokken.find((b) => b.code === 'e1.basis')!;
    expect(basis.omtrek!.length).toBeGreaterThan(20);
    expect(s.blokken.some((b) => b.code === 'e1.basis-rond' || b.code === 'e1.zitkussen-rond')).toBe(false);
    const kussen = s.blokken.find((b) => b.code === 'e1.zitkussen')!;
    expect(kussen.omtrek!.length).toBeGreaterThan(20);
    // De omtrek valt binnen het omsluitende kader.
    for (const [x, z] of kussen.omtrek!) {
      expect(x).toBeGreaterThanOrEqual(kussen.x - 0.01); expect(x).toBeLessThanOrEqual(kussen.x + kussen.b + 0.01);
      expect(z).toBeGreaterThanOrEqual(kussen.z - 0.01); expect(z).toBeLessThanOrEqual(kussen.z + kussen.d + 0.01);
    }
    // De ronde kant reikt tot de rand van het element (halve cirkel met straal = halve diepte).
    expect(Math.min(...basis.omtrek!.map((q) => q[0]))).toBeCloseTo(0, 1);
  });

  it('lage houten bank (Kotor)', () => {
    const kotor = zetelModellen.find((m) => m.code === 'kotor')!.ontwerp;
    const s = bouw3D(kotor, zetelCatalogus, standaardMaterialen);
    // Bovenkant van de bank = zithoogte − 14 (Kotor: zithoogte 44 volgens de productpagina).
    expect(s.blokken.find((b) => b.code === 'e1.bankblad')).toMatchObject({ soort: 'hout', y: 25, h: 5 });
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
    // Kuipfauteuils: basis en zitting met een ronde omtrek, de rug als gebogen kuipwand die naar voren lager wordt.
    const tumble = blokken('tumble');
    expect(tumble.find((b) => b.code === 'e1.basis')!.omtrek!.length).toBeGreaterThan(40);
    const wand = tumble.find((b) => b.code === 'e1.rug')!;
    expect(wand.vorm).toBe('kuipwand');
    const midden = Math.floor(wand.hoogtes!.length / 2);
    expect(wand.hoogtes![midden]).toBeGreaterThan(wand.hoogtes![0]! + 20); // achteraan hoger dan vooraan
    expect(blokken('pebble').some((b) => b.code === 'e1.arm-l')).toBe(false);
    // Schelp (Karl): de rug staat op de zitting, niet op de vloer.
    expect(blokken('karl').find((b) => b.code === 'e1.rug')!.y).toBeGreaterThan(20);
    // Hoekige fauteuil houdt rechte rug en armen.
    const hoekig = structuredClone(zetelModellen.find((m) => m.code === 'tumble')!.ontwerp);
    hoekig.elementen[0]!.opties = { kuipvorm: 'hoekig' };
    expect(bouw3D(hoekig, zetelCatalogus, standaardMaterialen).blokken.some((b) => b.code === 'e1.arm-l')).toBe(true);
  });
});

describe('verdekte voet volgt de vorm (geen vierkante plaat onder een rond meubel)', () => {
  const blokken = (code: string) => bouw3D(structuredClone(zetelModellen.find((m) => m.code === code)!.ontwerp), zetelCatalogus, standaardMaterialen).blokken;
  /** Ligt het punt binnen de veelhoek (even-oneven regel)? */
  const binnen = ([x, z]: [number, number], v: [number, number][]) => {
    let in_ = false;
    for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
      const [xi, zi] = v[i]!, [xj, zj] = v[j]!;
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) in_ = !in_;
    }
    return in_;
  };
  it('ronde poef: ronde voet, 10 cm naar binnen', () => {
    for (const code of ['stockholm', 'fez', 'tumble-pouf']) {
      const b = blokken(code), voet = b.find((x) => x.code === 'e1.verdekt')!, poef = b.find((x) => x.code === 'e1.poef')!;
      expect(voet.vorm, code).toBe('cilinder');
      expect(voet.b, code).toBeCloseTo(poef.b - 20, 1);
      expect(voet.x + voet.b / 2, code).toBeCloseTo(poef.x + poef.b / 2, 1);
    }
  });
  it('kuipfauteuil: voet met de omtrek van de onderbouw, helemaal binnen die omtrek', () => {
    for (const code of ['pebble', 'tumble', 'manon', 'satie']) {
      const b = blokken(code), voet = b.find((x) => x.code === 'e1.verdekt')!, basis = b.find((x) => x.code === 'e1.basis')!;
      expect(voet.omtrek, code).toBeDefined();
      for (const p of voet.omtrek!) expect(binnen(p, basis.omtrek!), `${code} ${p}`).toBe(true);
    }
  });
  it('vierkante poef en gewone zetel: voet blijft een balk', () => {
    expect(blokken('kanto').find((x) => x.code === 'e1.verdekt')!.vorm).toBe('blok');
    const zora = blokken('zora').find((x) => x.code === 'e2.verdekt')!;
    expect(zora.vorm).toBe('blok');
    expect(zora.omtrek).toBeUndefined();
  });
});

describe('Pebble (kuipvorm organisch): zachte kiezel met een schaal, geen losse lagen', () => {
  const blokken = (code: string) => bouw3D(structuredClone(zetelModellen.find((m) => m.code === code)!.ontwerp), zetelCatalogus, standaardMaterialen).blokken;
  it('zitting is één zacht blok in de stof tot op zithoogte, zonder los zitkussen; de schaal is glad en staat op de vloer', () => {
    const b = blokken('pebble');
    const zit = b.find((x) => x.code === 'e1.basis')!, rug = b.find((x) => x.code === 'e1.rug')!;
    expect(b.some((x) => x.code === 'e1.zitkussen')).toBe(false);
    expect(zit.soort).toBe('kussen');
    expect(zit.glad).toBe(true);
    expect(zit.kleur).toBe(rug.kleur); // geen donkere onderbouw meer
    expect(rug.vorm).toBe('kuipwand');
    expect(rug.glad).toBe(true);
    expect(rug.y).toBeLessThan(0); // platte onderkant onder de vloer
  });
  it('andere kuipfauteuils blijven zoals ze waren (donkere onderbouw, los zitkussen, wand op de onderbouw)', () => {
    for (const code of ['tumble', 'manon', 'satie']) {
      const b = blokken(code), basis = b.find((x) => x.code === 'e1.basis')!, rug = b.find((x) => x.code === 'e1.rug')!;
      expect(basis.soort, code).toBe('stof');
      expect(basis.glad, code).toBeUndefined();
      expect(rug.glad, code).toBeUndefined();
      expect(rug.y, code).toBeGreaterThanOrEqual(0);
    }
  });
});
