import { describe, expect, it } from 'vitest';
import { berekenOntwerp, blokkenVan, bouw3D, tekenVooraanzicht, vormgevingVan, type Ontwerp } from '../src/index.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { startOntwerpen, zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

const bereken = (o: Ontwerp) => berekenOntwerp(o, zetelCatalogus, standaardMaterialen);
const codes = (r: { meldingen: { code: string }[] }) => r.meldingen.map((m) => m.code);
/**
 * Een gewone kuipfauteuil uit de catalogus, zonder eigen vorm van een model: voor wat de keuze "Vorm fauteuil" op zich
 * moet doen. De modellen van de klant hebben sinds 13/11 hun eigen opbouw (vaste trommelzitting, dunne schaal).
 */
const kuipfauteuil = (kuipvorm: string): Ontwerp => ({
  hoofdmateriaal: 'boucle_belize', opties: { poten: 'verdekt', poothoogte: 'laag' },
  elementen: [{ id: 'e1', type: 'fauteuil', x: 0, y: 0, breedte: 80, diepte: 80, rotatie: 0, opties: { kuipvorm } }],
});

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
    const omhullend = bouw3D(kuipfauteuil('omhullend'), zetelCatalogus, standaardMaterialen).blokken;
    expect(omhullend.find((b) => b.code === 'e1.basis')!.omtrek!.length).toBeGreaterThan(40);
    const wand = omhullend.find((b) => b.code === 'e1.rug')!;
    expect(wand.vorm).toBe('kuipwand');
    const midden = Math.floor(wand.hoogtes!.length / 2);
    expect(wand.hoogtes![midden]).toBeGreaterThan(wand.hoogtes![0]! + 20); // achteraan hoger dan vooraan
    expect(blokken('pebble').some((b) => b.code === 'e1.arm-l')).toBe(false);
    // Schelp (Karl): de rug staat op de zitting, niet op de vloer.
    expect(blokken('karl').find((b) => b.code === 'e1.rug')!.y).toBeGreaterThan(20);
    // Hoekige fauteuil houdt rechte rug en armen.
    expect(bouw3D(kuipfauteuil('hoekig'), zetelCatalogus, standaardMaterialen).blokken.some((b) => b.code === 'e1.arm-l')).toBe(true);
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
      // De onderbouw, of bij een fauteuil met een vaste trommelzitting (Satie) die zitting zelf.
      const b = blokken(code), voet = b.find((x) => x.code === 'e1.verdekt')!, basis = (b.find((x) => x.code === 'e1.basis') ?? b.find((x) => x.code === 'e1.zitkussen'))!;
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

describe('kuipfauteuils: onderbouw binnen de wand, ronde onderrand bij een zwevende schaal (13/11)', () => {
  const blokken = (code: string) => bouw3D(structuredClone(zetelModellen.find((m) => m.code === code)!.ontwerp), zetelCatalogus, standaardMaterialen).blokken;
  /** Kleinste speling van de onderbouw binnen de buitenkant van de wand, gemeten onder de wand zelf (niet voorbij zijn uiteinden). */
  const speling = (code: string) => {
    // De onderbouw, of bij een trommel (Milton, Mabel) de zitting zelf.
    const b = blokken(code), rug = b.find((x) => x.code === 'e1.rug')!, basis = (b.find((x) => x.code === 'e1.basis') ?? b.find((x) => x.code === 'e1.zitkussen'))!;
    const wp = rug.pad!, half = rug.dikte! / 2;
    let kleinst = Infinity;
    for (const [x, z] of basis.omtrek!) {
      let beste = Infinity, onderWand = false;
      for (let i = 0; i < wp.length - 1; i++) {
        const ax = wp[i]![0], az = wp[i]![1], ux = wp[i + 1]![0] - ax, uz = wp[i + 1]![1] - az;
        const f = ((x - ax) * ux + (z - az) * uz) / (ux * ux + uz * uz), g = Math.max(0, Math.min(1, f));
        const d = Math.hypot(x - ax - g * ux, z - az - g * uz);
        if (d < beste) { beste = d; onderWand = !((i === 0 && f < 0) || (i === wp.length - 2 && f > 1)); }
      }
      if (onderWand && beste < half + 4) kleinst = Math.min(kleinst, half - beste);
    }
    return kleinst;
  };
  it('de onderbouw steekt nergens door de wand (vroeger een dun streepje naast het wanduiteinde van Ross)', () => {
    // Bij een afgerond grondvlak ligt de buitenkant van de wand in de hoeken tot ±1 cm binnen de omtrek.
    for (const code of ['ross', 'mabel-1', 'mabel-2', 'sullivan', 'milton'])
      expect(speling(code), code).toBeGreaterThan(0.7);
    // Een trommel die binnen de schaal staat (`zitIn`: Satie, Quin, Fraser, Manon): haar rand ligt overal binnen de wand, tegen de
    // binnenkant aan (geen kier tussen zitting en schaal, en niets dat erdoor steekt).
    for (const code of ['satie', 'quin', 'fraser', 'manon']) expect(speling(code), code).toBeGreaterThan(0.3);
  });
  it('alleen de zwevende schaal (Karl) krijgt een ronde onderrand; een wand op de onderbouw niet', () => {
    const karl = blokken('karl').find((x) => x.code === 'e1.rug')!;
    expect(karl.afronding).toBeCloseTo(karl.dikte! / 2, 2);
    for (const code of ['ross', 'quin', 'pebble']) expect(blokken(code).find((x) => x.code === 'e1.rug')!.afronding, code).toBeUndefined();
    // Een rug die op de zitting staat (Tumble) heeft een licht afgeronde onderrand: de plooi met de zitting.
    expect(blokken('tumble').find((x) => x.code === 'e1.rug')!.afronding).toBe(3);
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
    for (const vorm of ['rond', 'afgerond', 'omhullend', 'trommel']) {
      const b = bouw3D(kuipfauteuil(vorm), zetelCatalogus, standaardMaterialen).blokken, basis = b.find((x) => x.code === 'e1.basis')!, rug = b.find((x) => x.code === 'e1.rug')!;
      expect(basis.soort, vorm).toBe('stof');
      expect(basis.glad, vorm).toBeUndefined();
      expect(b.some((x) => x.code === 'e1.zitkussen'), vorm).toBe(true);
      expect(rug.glad, vorm).toBeUndefined();
      expect(rug.y, vorm).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('fauteuils naar de productfoto\'s (13/11)', () => {
  const model = (code: string) => zetelModellen.find((m) => m.code === code)!;
  const scene = (code: string) => bouw3D(structuredClone(model(code).ontwerp), zetelCatalogus, standaardMaterialen);
  // Maten van de productpagina's: breedte × diepte × hoogte en de zithoogte.
  const SITE: Record<string, [number, number, number, number]> = {
    milton: [70, 68, 72, 40], 'mabel-1': [68, 65, 76, 45], 'mabel-2': [150, 65, 76, 45], 'mabel-meridienne': [150, 65, 76, 45],
    fraser: [61, 61, 70, 44], satie: [70, 70, 70, 45], quin: [91, 91, 78, 45], ross: [66, 64, 78, 43], sullivan: [72, 80, 93, 42], karl: [68, 72, 75, 42], tumble: [78, 86, 75, 45], manon: [75, 70, 75, 42],
  };
  it('de maten van de productpagina: het kader van de 3D en de bovenkant van de zitting', () => {
    for (const [code, [b, d, h, zit]] of Object.entries(SITE)) {
      const s = scene(code), zitting = s.blokken.find((x) => x.code === 'e1.zitkussen')!;
      // Het kader van de fauteuil zelf (een los sierkussen, zoals op de méridienne, telt niet mee).
      const eigen = s.blokken.filter((x) => x.code.startsWith('e1.'));
      expect(s.kader, code).toMatchObject({ b, d });
      // De hoogte van de site is de schaal; een los rugkussen mag erboven uitkomen (Satie).
      expect(Math.max(...eigen.filter((x) => !x.code.includes('rugkussen')).map((x) => x.y + x.h)), code).toBe(h);
      expect(zitting.y + zitting.h, code).toBe(zit);
      // Eén vaste zitting in de stof, zonder donkere onderbouw; geen fout in de prijsberekening.
      expect(s.blokken.some((x) => x.code === 'e1.basis'), code).toBe(false);
      expect(berekenOntwerp(model(code).ontwerp, zetelCatalogus, standaardMaterialen).meldingen.filter((m) => m.ernst === 'fout'), code).toHaveLength(0);
    }
  });
  it('Satie: trommel tot op de vloer, de schaal steekt errond uit, één los rugkussen (geen drie rollen)', () => {
    const b = scene('satie').blokken, rug = b.find((x) => x.code === 'e1.rug')!, zit = b.find((x) => x.code === 'e1.zitkussen')!;
    expect(new Set(rug.hoogtes)).toEqual(new Set([70]));
    expect(rug.naad?.soort).toBe('bies');
    expect(zit.y).toBeLessThanOrEqual(2);
    // Het trapje: de zitting is 8 cm smaller dan de schaal, en komt vooraan tot de voorkant.
    expect(zit.b).toBeCloseTo(62, 0);
    expect(zit.z + zit.d).toBeCloseTo(70, 0);
    const kussens = b.filter((x) => x.code.startsWith('e1.rugkussen'));
    expect(kussens).toHaveLength(1);
    expect(kussens[0]).toMatchObject({ b: 48, h: 38 });
    // Het kussen komt boven de schaal uit, zoals op de foto.
    expect(kussens[0]!.y + kussens[0]!.h).toBeGreaterThan(70);
  });
  it('Quin: grote trommel op een lage ronde voet, drie losse kussens: één achteraan, twee schuin ervoor', () => {
    const b = scene('quin').blokken, kussens = b.filter((x) => x.code.startsWith('e1.rugkussen'));
    expect(b.find((x) => x.code === 'e1.draaivoet')).toBeDefined();
    expect(b.find((x) => x.code === 'e1.zitkussen')!.y).toBe(4);
    expect(kussens).toHaveLength(3);
    const [links, midden, rechts] = kussens as [typeof kussens[0], typeof kussens[0], typeof kussens[0]];
    // Het middelste recht tegen de schaal; de andere twee gedraaid (elk naar zijn kant) en verder naar voren.
    expect(midden.draai ?? 0).toBe(0);
    expect(links.draai!).toBeLessThan(-25);
    expect(rechts.draai!).toBeGreaterThan(25);
    expect(links.z + links.d / 2).toBeGreaterThan(midden.z + midden.d / 2 + 8);
    expect(rechts.z + rechts.d / 2).toBeCloseTo(links.z + links.d / 2, 0);
    // Een los kussen is een lens: een dunne rand met een bolling tot de volle dikte.
    for (const k of kussens) { expect(k.d).toBe(5); expect(k.bol).toBe(4); expect(k.b).toBe(43); }
  });
  it('Ross: brede hoge rug met steile schouders, lage armen die vooraan tot op de zitting zakken, poten met kruis', () => {
    const b = scene('ross').blokken, rug = b.find((x) => x.code === 'e1.rug')!, h = rug.hoogtes!, n = h.length, midden = (n - 1) / 2;
    expect(rug.dikte).toBe(6);
    expect(rug.naad?.soort).toBe('bies');
    // Bovenaan recht over het middelste derde van de schaal (±drie kwart van de breedte van voren gezien).
    for (let i = Math.round(midden * 0.7); i <= Math.round(midden * 1.3); i++) expect(h[i], `punt ${i}`).toBe(78);
    // Armen: halverwege elke kant ±17 cm boven de zitting, en aan het uiteinde net onder de zithoogte (in de zitting).
    for (const i of [Math.round(midden * 0.45), Math.round(midden * 1.55)]) { expect(h[i]!).toBeGreaterThan(56); expect(h[i]!).toBeLessThan(62); }
    expect(h[0]).toBe(40);
    expect(h[n - 1]).toBe(40);
    expect(b.filter((x) => x.code.startsWith('e1.kruis-'))).toHaveLength(2);
    expect(b.some((x) => x.code === 'e1.zitband')).toBe(false);
  });
  it('Sullivan: hoge smalle rug die naar lage armen zakt, zwarte ring op vier poten met een kruis', () => {
    const b = scene('sullivan').blokken, rug = b.find((x) => x.code === 'e1.rug')!, h = rug.hoogtes!, midden = (h.length - 1) / 2;
    expect(h[midden]).toBe(93);
    // Armen ±20 cm boven de zitting, halverwege elke kant.
    for (const i of [Math.round(midden * 0.4), Math.round(midden * 1.6)]) { expect(h[i]!).toBeGreaterThan(58); expect(h[i]!).toBeLessThan(66); }
    expect(b.find((x) => x.code === 'e1.ring')).toMatchObject({ y: 19, h: 3 });
    expect(b.filter((x) => x.code.startsWith('e1.kruis-'))).toHaveLength(2);
    expect(b.some((x) => x.code === 'e1.draaivoet')).toBe(false);
  });
  it('Karl: geen armen; een dikke rugschijf zweeft boven de zitting op twee houten stijlen van het frame', () => {
    const b = scene('karl').blokken, rug = b.find((x) => x.code === 'e1.rug')!, zit = b.find((x) => x.code === 'e1.zitkussen')!;
    expect(rug.dikte).toBe(12);
    // Zwevend: een kier tussen zitting en rugschijf, met een ronde onderrand.
    expect(rug.y).toBeGreaterThan(zit.y + zit.h + 4);
    expect(rug.afronding).toBe(6);
    // De schijf loopt niet als armen naar voren: ze blijft in de achterste helft.
    const pad = rug.pad!.map((q) => q[1]);
    expect(Math.max(...pad)).toBeLessThan(72 / 2);
    // Twee stijlen van het frame tot in de rugschijf; ze beginnen in het frame onder de zitting.
    const stijlen = b.filter((x) => x.code.startsWith('e1.drager-'));
    expect(stijlen).toHaveLength(2);
    for (const st of stijlen) { expect(st.y).toBeLessThanOrEqual(zit.y); expect(st.y + st.h).toBeGreaterThan(rug.y); }
    expect(b.find((x) => x.code === 'e1.ring')).toMatchObject({ y: 25, h: 3 });
  });
  it('Tumble: één bolle zitting tot op de vloer, met een lage dikke rug erop (geen wand errond tot onderaan)', () => {
    const b = scene('tumble').blokken, rug = b.find((x) => x.code === 'e1.rug')!, zit = b.find((x) => x.code === 'e1.zitkussen')!;
    expect(zit).toMatchObject({ y: 2, h: 43, b: 78, d: 86 });
    expect(zit.afronding).toBeGreaterThanOrEqual(10);
    // De rug begint waar de bolle rand van de zitting begint (45 − 11), niet op de vloer.
    expect(rug.y).toBe(34);
    expect(rug.dikte).toBe(17);
    expect(Math.max(...rug.hoogtes!)).toBe(75);
    expect(Math.min(...rug.hoogtes!)).toBe(75);
  });
  it('Manon: de rand van de schaal loopt van de rug in één lijn schuin af naar voren, tot op de vloer', () => {
    const b = scene('manon').blokken, rug = b.find((x) => x.code === 'e1.rug')!, h = rug.hoogtes!, n = h.length, midden = (n - 1) / 2;
    expect(h[midden]).toBe(75);
    // Aan de uiteinden ±60 cm, en nergens stijgt de rand weer naar de uiteinden toe.
    for (const eind of [h[0]!, h[n - 1]!]) { expect(eind).toBeGreaterThan(58); expect(eind).toBeLessThan(62); }
    for (let i = midden; i < n - 1; i++) expect(h[i + 1]!).toBeLessThanOrEqual(h[i]!);
    for (let i = midden; i > 0; i--) expect(h[i - 1]!).toBeLessThanOrEqual(h[i]!);
    // De schaal staat op de vloer (verdekte voet van 2 cm) en stopt voorbij het midden: de zitting steekt vooraan uit.
    expect(rug.y).toBe(2);
    const voorste = Math.max(...rug.pad!.map((q) => q[1]));
    expect(voorste).toBeGreaterThan(35);
    expect(voorste).toBeLessThan(50);
    expect(rug.naad?.soort).toBe('bies');
  });
  it('Amusette fauteuil: geen kuip maar arm + zit + arm, met de maten van de productpagina', () => {
    const o = model('amusette-fauteuil').ontwerp, s = scene('amusette-fauteuil');
    expect(o.elementen.map((e) => e.type)).toEqual(['arm', 'zit', 'arm']);
    expect(s.kader).toMatchObject({ b: 86, d: 80 });
    // Hoogte 71 (de hellende rug komt bovenaan iets lager uit dan haar lengte), zithoogte 40, armhoogte 60.
    expect(s.kader.h).toBeGreaterThan(68);
    expect(s.kader.h).toBeLessThanOrEqual(71);
    expect(vormgevingVan(o, o.elementen[1]!)).toMatchObject({ rughoogte: 71, armhoogte: 60 });
    expect(o.vormgeving?.zithoogte).toBe(40);
    expect(berekenOntwerp(o, zetelCatalogus, standaardMaterialen).meldingen.filter((m) => m.ernst === 'fout')).toHaveLength(0);
  });
  it('Fraser: lage rechte schaal, zitting in twee lagen, vier schuine poten met een kruis', () => {
    const b = scene('fraser').blokken, rug = b.find((x) => x.code === 'e1.rug')!;
    expect(new Set(rug.hoogtes)).toEqual(new Set([70]));
    expect(b.find((x) => x.code === 'e1.zitband')).toBeDefined();
    expect(b.filter((x) => x.code.startsWith('e1.kruis-'))).toHaveLength(2);
    expect(b.filter((x) => x.code.startsWith('e1.poot-') && x.schuin)).toHaveLength(4);
    expect(b.some((x) => x.code === 'e1.ring')).toBe(false);
  });
  it('vaste ronde zitting, dunne schaal met bies, houten frame op vier poten', () => {
    for (const code of ['milton', 'mabel-1', 'mabel-2']) {
      const b = scene(code).blokken, rug = b.find((x) => x.code === 'e1.rug')!, zit = b.find((x) => x.code === 'e1.zitkussen')!;
      expect(b.some((x) => x.code === 'e1.basis'), code).toBe(false);
      expect(zit.soort, code).toBe('kussen');
      expect(zit.y + zit.h, code).toBe(model(code).ontwerp.vormgeving!.zithoogte);
      expect(rug.dikte, code).toBeLessThanOrEqual(8);
      expect(rug.naad?.soort, code).toBe('bies');
      expect(b.find((x) => x.code === 'e1.ring'), code).toBeDefined();
      expect(b.filter((x) => x.code.startsWith('e1.poot-')), code).toHaveLength(4);
    }
  });
  it('Milton: de schaal is overal even hoog; Mabel: de leuning zakt aan de zijkanten tot op de zitting en stopt rond het midden', () => {
    expect(new Set(scene('milton').blokken.find((x) => x.code === 'e1.rug')!.hoogtes)).toEqual(new Set([72]));
    for (const code of ['mabel-1', 'mabel-2']) {
      const s = scene(code), rug = s.blokken.find((x) => x.code === 'e1.rug')!;
      expect(Math.max(...rug.hoogtes!), code).toBe(76);
      // Aan de uiteinden net onder de zithoogte: de leuning duikt in de zitting.
      expect(rug.hoogtes![0], code).toBe(42);
      // Jonas (13/11): "bij Mabel komt de leuning niet zo ver als onze 3D". Ze stopt voorbij het midden van de diepte,
      // maar ruim voor de voorkant (65 cm).
      const voorste = Math.max(...rug.pad!.map((q) => q[1]));
      expect(voorste, code).toBeGreaterThan(30);
      expect(voorste, code).toBeLessThan(46);
    }
  });
  it('Mabel 2-zit is één kuip van 150 cm, zonder fout in de prijsberekening', () => {
    const o = model('mabel-2').ontwerp;
    expect(o.elementen.map((e) => e.type)).toEqual(['fauteuil']);
    expect(berekenOntwerp(o, zetelCatalogus, standaardMaterialen).meldingen.filter((m) => m.ernst === 'fout')).toHaveLength(0);
  });
});
