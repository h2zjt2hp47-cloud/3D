import { describe, expect, it } from 'vitest';
import { berekenOntwerp, blokkenVan, bouw3D, tekenVooraanzicht, vormgevingVan, type Ontwerp } from '../src/index.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { startOntwerpen, zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

const bereken = (o: Ontwerp) => berekenOntwerp(o, zetelCatalogus, standaardMaterialen);
const codes = (r: { meldingen: { code: string }[] }) => r.meldingen.map((m) => m.code);

describe('chaise longue in de modellen (afgeleid uit de productfoto)', () => {
  it('Kotor, Belize, Pula, Fréjus en Azar: rug loopt door achter de chaise', () => {
    const rugVan = (code: string) => {
      const m = zetelModellen.find((x) => x.code === code)!;
      const s = bouw3D(m.ontwerp, zetelCatalogus, standaardMaterialen);
      return m.ontwerp.elementen.filter((e) => e.type === 'chaise').map((e) => blokkenVan(s, { id: e.id }).some((b) => b.code === `${e.id}.rug`));
    };
    // Azar: op de productfoto (11/11 opnieuw bekeken) staan drie rugblokken, dus ook één achter de chaise.
    for (const code of ['kotor', 'belize', 'pula', 'frejus', 'azar']) expect(rugVan(code), code).not.toContain(false);
  });
});

describe('modellen', () => {
  it('alle modellen zijn geldige ontwerpen zonder fouten', () => {
    for (const m of zetelModellen) {
      const r = bereken(m.ontwerp);
      expect(r.meldingen.filter((x) => x.ernst === 'fout'), m.naam).toEqual([]);
      expect(r.prijs.brutoprijsExcl, m.naam).toBeGreaterThan(200);
      // Een poef die tot op de vloer loopt, is één blok (zonder voet).
      expect(bouw3D(m.ontwerp, zetelCatalogus, standaardMaterialen).blokken.length, m.naam).toBeGreaterThan(0);
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

  it('lage houten bank: bovenkant = zithoogte − 14', () => {
    const o: Ontwerp = { hoofdmateriaal: 'linnen_ficelle', vormgeving: { zithoogte: 44 }, elementen: [{ id: 'e1', type: 'console', x: 0, y: 0, breedte: 60, diepte: 80, rotatie: 0, opties: { console_uitvoering: 'bank' } }] };
    const s = bouw3D(o, zetelCatalogus, standaardMaterialen);
    expect(s.blokken.find((b) => b.code === 'e1.bankblad')).toMatchObject({ soort: 'hout', y: 25, h: 5 });
  });
  it('houten blad op de onderbouw (Kotor): de onderbouw loopt door, het blad ligt erop, poten alleen aan de buitenkant', () => {
    const kotor = zetelModellen.find((m) => m.code === 'kotor')!.ontwerp;
    const s = bouw3D(kotor, zetelCatalogus, standaardMaterialen);
    const blad = s.blokken.find((b) => b.code === 'e1.blad')!, basis = s.blokken.find((b) => b.code === 'e1.basis')!, buur = s.blokken.find((b) => b.code === 'e2.basis')!;
    // Zelfde onderbouw als de zitting ernaast (poten 11 cm, zitkussen 23 cm, zithoogte 44: onderbouw van 11 tot 21 cm).
    expect(basis).toMatchObject({ soort: 'stof', y: buur.y, h: buur.h, kleur: buur.kleur });
    expect(basis).toMatchObject({ y: 11, h: 10 });
    expect(blad).toMatchObject({ soort: 'hout', y: 21 });
    // Het blad staat op poten zoals een zitting: een paar aan de vrije kant en één paar op de grens met de zitting ernaast
    // (geen dubbel paar: de zitting zelf heeft links geen poten).
    const poten = s.blokken.filter((b) => /^e[12]\.poot/.test(b.code)).map((b) => b.code).sort();
    expect(poten).toEqual(['e1.poot-la', 'e1.poot-lv', 'e1.poot-ra', 'e1.poot-rv', 'e2.poot-ra', 'e2.poot-rv']);
    // Het vooraanzicht tekent hetzelfde.
    const va = tekenVooraanzicht(kotor, zetelCatalogus, standaardMaterialen).vormen.map((v) => v.code);
    expect(va).toContain('e1.blad');
    expect(va).toContain('e1.basis');
  });
  it('chaise longue: poten onder het deel dat voorbij de zitting uitsteekt (Kotor, Belize, Fréjus)', () => {
    const poten = (code: string, id: string) => bouw3D(zetelModellen.find((m) => m.code === code)!.ontwerp, zetelCatalogus, standaardMaterialen).blokken
      .filter((b) => b.code.startsWith(`${id}.poot-`)).map((b) => b.code.split('-')[1]).sort();
    // Kotor: de chaise (e4, 170 diep) staat tussen een zitting (105 diep) en een arm (105 diep): achteraan deelt ze de
    // poten met de buren, vooraan heeft ze er zelf twee. De zitting ernaast zet haar voorste poot op de grens.
    expect(poten('kotor', 'e4')).toEqual(['lv', 'rv']);
    expect(poten('kotor', 'e3')).toEqual(['ra', 'rv']);
    const kotor = bouw3D(zetelModellen.find((m) => m.code === 'kotor')!.ontwerp, zetelCatalogus, standaardMaterialen).blokken;
    const voor = kotor.find((b) => b.code === 'e4.poot-lv')!;
    expect(voor.z).toBeGreaterThan(150); // onder het voorste deel van de chaise (170 cm diep)
    // Belize: het brede loungedeel (e1) staat links vrij en rechts naast een zitting die minder diep is.
    expect(poten('belize', 'e1')).toEqual(['la', 'lv', 'ra', 'rv']);
    expect(poten('belize', 'e5')).toEqual(['lv', 'rv']);
    // Fréjus: de chaise (e2) staat links naast een arm die niet verder komt dan de zitting.
    expect(poten('frejus', 'e2')).toEqual(['lv', 'ra', 'rv']);
    // Het vooraanzicht toont de voorste poten van de chaise.
    const va = tekenVooraanzicht(zetelModellen.find((m) => m.code === 'kotor')!.ontwerp, zetelCatalogus, standaardMaterialen).vormen.map((v) => v.code);
    expect(va).toContain('e4.poot-l');
    expect(va).toContain('e4.poot-r');
  });
  it('sierkussen: mesrand; een lendenkussen is breder dan hoog (Nestor)', () => {
    const nestor = zetelModellen.find((m) => m.code === 'nestor')!.ontwerp;
    const s = bouw3D(nestor, zetelCatalogus, standaardMaterialen);
    const lenden = s.blokken.find((b) => b.code === 'e7.kussen')!, vierkant = s.blokken.find((b) => b.code === 'e10.kussen')!;
    expect(lenden.mesrand && vierkant.mesrand).toBe(true);
    expect(lenden.h).toBe(Math.round(60 * 0.58));
    expect(vierkant.h).toBe(45);
  });
  it('brede chaise met twee rugkussens (Belize) en een zitting met alleen sierkussens tegen een vaste rug (Pula)', () => {
    const blokken = (code: string) => bouw3D(zetelModellen.find((m) => m.code === code)!.ontwerp, zetelCatalogus, standaardMaterialen).blokken;
    expect(blokken('belize').filter((b) => b.code.startsWith('e1.rugkussen')).map((b) => b.code)).toEqual(['e1.rugkussen1', 'e1.rugkussen2']);
    const pula = blokken('pula');
    expect(pula.some((b) => b.code.includes('rugkussen'))).toBe(false);
    expect(pula.filter((b) => b.code.startsWith('e2.zitkussen'))).toHaveLength(1);
    const rug = pula.find((b) => b.code === 'e2.rug')!, arm = pula.find((b) => b.code === 'e1.arm')!;
    expect(rug.y + rug.h).toBe(arm.y + arm.h); // rug en armen even hoog: een bak
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
    expect(wand.hoogtes![midden]).toBeGreaterThan(wand.hoogtes![0]! + 10); // achteraan hoger dan aan de uiteinden
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
  /** Een losse poef op een verdekte voet van 4 cm. */
  const poef = (vorm: string, breedte = 60): Ontwerp => ({
    hoofdmateriaal: 'linnen_ficelle', opties: { poten: 'verdekt', poothoogte: 'laag' },
    elementen: [{ id: 'e1', type: 'poef', x: 0, y: 0, breedte, diepte: breedte, rotatie: 0, opties: { poefvorm: vorm } }],
  });
  const bouw = (o: Ontwerp) => bouw3D(o, zetelCatalogus, standaardMaterialen).blokken;
  it('ronde poef: ronde voet, 10 cm naar binnen; onder een bolle poef verder naar binnen (binnen de ronding)', () => {
    for (const vorm of ['rond', 'taps']) {
      const b = bouw(poef(vorm)), voet = b.find((x) => x.code === 'e1.verdekt')!, lijf = b.find((x) => x.code === 'e1.poef')!;
      expect(voet.vorm, vorm).toBe('cilinder');
      expect(voet.b, vorm).toBeCloseTo(lijf.b - 20, 1);
      expect(voet.x + voet.b / 2, vorm).toBeCloseTo(lijf.x + lijf.b / 2, 1);
    }
    const b = bouw(poef('bol')), voet = b.find((x) => x.code === 'e1.verdekt')!, lijf = b.find((x) => x.code === 'e1.poef')!;
    expect(voet.vorm).toBe('cilinder');
    expect(voet.b).toBeLessThanOrEqual(lijf.b - 2 * lijf.afronding!); // niet breder dan het platte deel van de onderkant
  });
  it('poef tot op de vloer (Tumble, Stockholm, Kanto, Fez, Pebble pouf): geen voet, dus geen donkere plaat eronder', () => {
    for (const code of ['tumble-pouf', 'stockholm', 'kanto', 'fez', 'pebble-pouf']) expect(blokken(code).some((x) => x.code === 'e1.verdekt'), code).toBe(false);
  });
  it('kuipfauteuil: voet met de omtrek van de onderbouw, helemaal binnen die omtrek', () => {
    // (Manon loopt sinds 11/11 tot op de vloer en heeft geen voet meer.)
    for (const code of ['pebble', 'tumble', 'satie']) {
      const b = blokken(code), voet = b.find((x) => x.code === 'e1.verdekt')!, basis = b.find((x) => x.code === 'e1.basis')!;
      expect(voet.omtrek, code).toBeDefined();
      for (const p of voet.omtrek!) expect(binnen(p, basis.omtrek!), `${code} ${p}`).toBe(true);
    }
  });
  it('vierkante poef en gewone zetel: voet blijft een balk; onder een kiezel blijft hij binnen de ronding', () => {
    expect(bouw(poef('vierkant', 45)).find((x) => x.code === 'e1.verdekt')!.vorm).toBe('blok');
    const kiezel = bouw(poef('kiezel', 80)), voet = kiezel.find((x) => x.code === 'e1.verdekt')!, lijf = kiezel.find((x) => x.code === 'e1.poef')!;
    expect(voet.x - lijf.x).toBeGreaterThanOrEqual(lijf.afronding!);
    const zora = blokken('zora').find((x) => x.code === 'e2.verdekt')!;
    expect(zora.vorm).toBe('blok');
    expect(zora.omtrek).toBeUndefined();
  });
});

describe('Pebble (kuipvorm organisch): zachte kiezel met een schaal, geen losse lagen', () => {
  const blokken = (code: string) => bouw3D(structuredClone(zetelModellen.find((m) => m.code === code)!.ontwerp), zetelCatalogus, standaardMaterialen).blokken;
  it('zitting is één zacht blok in de stof tot op zithoogte, zonder los zitkussen; de schaal helt over de zitting en staat op de vloer', () => {
    const b = blokken('pebble');
    const zit = b.find((x) => x.code === 'e1.basis')!, rug = b.find((x) => x.code === 'e1.rug')!;
    expect(b.some((x) => x.code === 'e1.zitkussen')).toBe(false);
    expect(zit.soort).toBe('kussen');
    expect(zit.glad).toBe(true);
    expect(zit.kleur).toBe(rug.kleur); // geen donkere onderbouw meer
    expect(rug.vorm).toBe('kuipwand');
    // Sinds de tweede ronde van 11/11 een gepolsterde schaal (geen samengesmolten zachte vorm meer): dik, bol, en
    // bovenaan naar binnen hellend, zoals een kiezel die over de zitting leunt.
    expect(rug.glad).toBeUndefined();
    expect(rug.helling).toBeLessThan(0);
    expect(rug.wandBol).toBeGreaterThan(0.2);
    expect(rug.y).toBeLessThan(0); // platte onderkant onder de vloer
  });
  it('Tumble (koepelrug): ronde zitting in de stof met een zachte rug erop, breed bovenaan en met ronde schouders', () => {
    const b = blokken('tumble'), basis = b.find((x) => x.code === 'e1.basis')!, rug = b.find((x) => x.code === 'e1.rug')!;
    expect(basis.soort).toBe('kussen');
    expect(basis.glad).toBe(true);
    expect(basis.y + basis.h).toBe(45); // de zitting loopt tot de zithoogte (productpagina)
    expect(b.some((x) => x.code === 'e1.zitkussen')).toBe(false);
    // Een gepolsterde schaal die achterover helt, met slankere uiteinden (geen samengesmolten zachte vorm meer).
    expect(rug.glad).toBeUndefined();
    expect(rug.helling).toBeGreaterThan(4);
    expect(rug.wandEind).toBeLessThan(0.8);
    expect(rug.y).toBe(31); // de rug staat op de zitting, niet op de vloer
    const h = rug.hoogtes!, midden = Math.floor(h.length / 2);
    expect(h[midden]).toBe(75);
    // Een derde van de boog op volle hoogte (geen punt); de uiteinden blijven ruim boven de zitting (foto's: de rug is
    // tot aan haar ronde uiteinden bijna even hoog).
    expect(h.filter((x) => x === 75).length).toBeGreaterThan(h.length * 0.3);
    expect(h[0]!).toBeGreaterThan(45 + 8);
    expect(h[0]!).toBeLessThan(65);
    expect(h[h.length - 1]!).toBe(h[0]!);
  });

  it('Mabel 2-zit: één gebogen schelp van 145 cm; Mabel Meridienne: de rug hoog rond het linkeruiteinde, schuin naar de zitting', () => {
    const tweezit = blokken('mabel-2'), wand = tweezit.find((x) => x.code === 'e1.rug')!;
    expect(wand.vorm).toBe('kuipwand');
    expect(tweezit.filter((x) => x.code.endsWith('.arm'))).toHaveLength(0); // geen losse armen meer
    expect(Math.max(...wand.hoogtes!)).toBe(76);
    const m = blokken('mabel-meridienne'), rug = m.find((x) => x.code === 'e1.rug')!, zit = m.find((x) => x.code === 'e1.zitkussen')!;
    const h = rug.hoogtes!, pad = rug.pad!;
    // Het pad loopt van rechtsachter naar linksvoor: rechts komt de schaal onder de zitting uit, links staat ze hoog.
    expect(pad[0]![0]).toBeGreaterThan(pad[pad.length - 1]![0]);
    expect(h[0]!).toBeLessThan(45);
    expect(h[h.length - 1]!).toBeGreaterThan(45 + 20);
    expect(Math.max(...h)).toBe(74);
    // Rechts staat geen wand: de schaal stopt ruim voor het rechteruiteinde.
    expect(Math.max(...pad.map((q) => q[0]))).toBeLessThan(130 * 0.8);
    // De rug staat op het zitkussen, dat over het hele grondvlak loopt (ook onder de rug door), op een dun houten frame.
    expect(Math.max(...zit.omtrek!.map((q) => q[0]))).toBeGreaterThan(127);
    expect(Math.min(...zit.omtrek!.map((q) => q[0]))).toBeLessThan(3);
    expect(rug.y).toBe(42);
    expect(m.find((x) => x.code === 'e1.basis')).toMatchObject({ soort: 'hout', y: 20, h: 5 });
  });

  it('Fraser en Manon: geen los zitkussen, de zitting is één gestoffeerd stuk in de stof zelf (melding van Jonas, 11/11)', () => {
    for (const code of ['fraser', 'manon']) {
      const b = blokken(code), basis = b.find((x) => x.code === 'e1.basis')!, rug = b.find((x) => x.code === 'e1.rug')!;
      expect(b.some((x) => x.code.includes('zitkussen')), code).toBe(false);
      expect(basis.soort, code).toBe('stof');
      expect(basis.kleur, code).toBe(rug.kleur); // zelfde stof als de rug, niet donkerder
      expect(basis.weefsel, code).toBe(rug.weefsel);
    }
    // Fraser: de trommel ligt op het frame met de poten (26 cm) en loopt tot de zithoogte (44 cm).
    expect(blokken('fraser').find((x) => x.code === 'e1.basis')).toMatchObject({ y: 26, h: 18 });
    // Manon: tot op de vloer, zonder voet.
    const manon = blokken('manon');
    expect(manon.find((x) => x.code === 'e1.basis')!.y).toBeLessThanOrEqual(1);
    expect(manon.some((x) => x.code === 'e1.verdekt')).toBe(false);
  });

  it('andere kuipfauteuils blijven zoals ze waren (onderbouw met een los zitkussen, wand op de onderbouw)', () => {
    for (const code of ['manon', 'satie', 'milton']) {
      const b = blokken(code), basis = b.find((x) => x.code === 'e1.basis')!, rug = b.find((x) => x.code === 'e1.rug')!;
      expect(basis.soort, code).toBe('stof');
      expect(basis.glad, code).toBeUndefined();
      expect(rug.glad, code).toBeUndefined();
      expect(rug.y, code).toBeGreaterThanOrEqual(0);
    }
  });
});
