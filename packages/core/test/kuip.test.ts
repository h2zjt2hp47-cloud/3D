import { describe, expect, it } from 'vitest';
import { berekenOntwerp, bouw3D, tekenVooraanzicht, type Ontwerp, type Rotatie } from '../src/index.js';
import { framePoten, kuipOpbouw, kuipParameters, trommelKader } from '../src/kuip.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

const teken = (code: string) => zetelCatalogus.opties!.find((g) => g.code === 'kuipvorm')!.keuzes.find((k) => k.code === code)!.teken;
const fauteuil = (vorm: string, rotatie: 0 | 90 | 180 | 270 = 0, opties: Record<string, string> = {}): Ontwerp => ({
  hoofdmateriaal: 'linnen_ficelle', opties,
  elementen: [{ id: 'f', type: 'fauteuil', x: 0, y: 0, breedte: 80, diepte: 80, rotatie, opties: { kuipvorm: vorm } }],
});

describe('kuipfauteuils', () => {
  it('hoekig blijft de oude vorm; de andere vormen hebben parameters', () => {
    expect(kuipParameters(teken('hoekig'))).toBeNull();
    for (const v of ['rond', 'afgerond', 'omhullend', 'trommel', 'organisch', 'schelp']) expect(kuipParameters(teken(v)), v).not.toBeNull();
  });
  it('wand achteraan hoog, vooraan laag; trommel rondom bijna even hoog', () => {
    const h = { P: 10, zithoogte: 45, rugH: 80, kussenDik: 12 };
    const rond = kuipOpbouw(80, 80, h, kuipParameters(teken('rond'))!, false);
    const mid = Math.floor(rond.wand.hoogtes.length / 2);
    expect(rond.wand.hoogtes[mid]).toBe(80);
    expect(rond.wand.hoogtes[0]).toBeCloseTo(45 + 12, 0);
    const trommel = kuipOpbouw(80, 80, h, kuipParameters(teken('trommel'))!, true);
    expect(Math.max(...trommel.wand.hoogtes) - Math.min(...trommel.wand.hoogtes)).toBeLessThanOrEqual(5.1);
    // Losse kussens steken boven de trommel uit.
    expect(Math.max(...trommel.rugkussens.map((k) => k.y + k.h))).toBeGreaterThan(Math.max(...trommel.wand.hoogtes));
    // Alle punten binnen het element.
    for (const [x, y] of [...rond.plan, ...rond.wand.pad, ...rond.zit]) { expect(x).toBeGreaterThanOrEqual(-0.01); expect(x).toBeLessThanOrEqual(80.01); expect(y).toBeGreaterThanOrEqual(-0.01); expect(y).toBeLessThanOrEqual(80.01); }
  });
  it('draaiing: de rug ligt aan de kant van de rotatie (achter, rechts, voor, links)', () => {
    const rugMidden = (r: 0 | 90 | 180 | 270) => {
      const w = bouw3D(fauteuil('rond', r), zetelCatalogus, standaardMaterialen).blokken.find((b) => b.code === 'f.rug')!;
      const m = w.pad![Math.floor(w.pad!.length / 2)]!; // midden van de wand = midden van de rug
      return m;
    };
    expect(rugMidden(0)[1]).toBeLessThan(15); // achteraan (kleine z)
    expect(rugMidden(90)[0]).toBeGreaterThan(65); // rechts
    expect(rugMidden(180)[1]).toBeGreaterThan(65); // vooraan
    expect(rugMidden(270)[0]).toBeLessThan(15); // links
  });
  it('vooraanzicht: silhouet van de wand en armen, geen losse rechthoekige armen', () => {
    const va = tekenVooraanzicht(fauteuil('omhullend'), zetelCatalogus, standaardMaterialen);
    expect(va.vormen.find((v) => v.code === 'f.rug')?.pad).toMatch(/^M.*Z$/);
    expect(va.vormen.some((v) => v.code === 'f.arm-l')).toBe(false);
    expect(va.vormen.some((v) => v.code === 'f.arm')).toBe(true);
  });
});

describe('scheve schaal (kuipvorm organisch, Pebble)', () => {
  const h = { P: 4, zithoogte: 44, rugH: 92, kussenDik: 12 };
  const opb = kuipOpbouw(85, 85, h, kuipParameters(teken('organisch'))!, false);
  const { pad, hoogtes } = opb.wand;
  it("volgens de productfoto's: rechts in de zitting, het hoogst op de rug links van het midden, links in een boog naar voren", () => {
    expect(hoogtes[0]).toBeLessThan(h.zithoogte); // rechts: verdwijnt in de zitting
    expect(pad[0]![0]).toBeGreaterThan(60); // rechts (grote x)
    expect(pad[0]![1]).toBeLessThan(40); // achter het midden
    const laatste = pad[pad.length - 1]!;
    expect(laatste[0]).toBeLessThan(26); // links
    expect(laatste[1]).toBeGreaterThan(55); // vooraan
    // Vooraan links rond zithoogte; de ronde kop loopt daaronder tot op de vloer.
    expect(hoogtes[hoogtes.length - 1]).toBeGreaterThanOrEqual(h.zithoogte);
    expect(hoogtes[hoogtes.length - 1]).toBeLessThan(h.zithoogte + 6);
    // Het hoogst op de rug, links van het midden (±een kwart van de breedte).
    const top = pad[hoogtes.indexOf(Math.max(...hoogtes))]!;
    expect(top[0]).toBeLessThan(42.5);
    expect(top[0]).toBeGreaterThan(10);
    expect(top[1]).toBeLessThan(20);
    expect(Math.max(...hoogtes)).toBe(92);
    // Bol verloop: halverwege tussen de top en de uiteinden nog ruim boven het midden van de hoogte.
    const iTop = hoogtes.indexOf(Math.max(...hoogtes));
    expect(hoogtes[Math.round(iTop / 2)]!).toBeGreaterThan((92 + h.zithoogte) / 2);
    expect(hoogtes[Math.round((iTop + hoogtes.length - 1) / 2)]!).toBeGreaterThan((92 + h.zithoogte) / 2);
    for (const [x, y] of [...opb.plan, ...pad]) { expect(x).toBeGreaterThanOrEqual(-0.01); expect(x).toBeLessThanOrEqual(85.01); expect(y).toBeGreaterThanOrEqual(-0.01); expect(y).toBeLessThanOrEqual(85.01); }
  });
  it('de andere kuipvormen blijven symmetrisch', () => {
    for (const v of ['rond', 'afgerond', 'omhullend', 'trommel', 'schelp']) {
      const w = kuipOpbouw(85, 85, h, kuipParameters(teken(v))!, false).wand.hoogtes;
      expect(w[0], v).toBe(w[w.length - 1]);
    }
  });
});

describe('eigen vorm per model: zitting, schaal en onderstel als gegevens (13/11)', () => {
  // De fauteuils van de klant (Milton, Fraser, Satie, Quin, Mabel …) hebben een dikke, vaste, ronde zitting met een dunne
  // schaal erachter op een eigen onderstel. Die vorm staat als gegevens in `vormgeving.kuip` en overschrijft de gekozen
  // kuipvorm; zonder die gegevens verandert er niets.
  const cat = zetelCatalogus;
  const fauteuil = (kuip: Record<string, unknown> | undefined, poten = 'ringframe', rotatie: Rotatie = 0): Ontwerp => ({
    hoofdmateriaal: 'linnen_ficelle', opties: { poten },
    vormgeving: { rughoogte: 72, zithoogte: 40, poothoogte: 18, ...(kuip ? { kuip } : {}) },
    elementen: [{ id: 'f', type: 'fauteuil', x: 0, y: 0, breedte: 70, diepte: 68, rotatie, opties: { kuipvorm: 'rond' } }],
  });
  const milton = { dikte: 8, boog: 96, zitTrommel: true, zitRand: 7, profiel: [[0, 1], [1, 1]] };

  it('de eigen velden overschrijven de gekozen kuipvorm; het verloop wordt gesorteerd', () => {
    const teken = { vorm: 'rond', plan: 'rond', dikte: 15, boog: 138, voorBoven: 12, armVanaf: 1 };
    expect(kuipParameters(teken)).toMatchObject({ dikte: 15, boog: 138 });
    expect(kuipParameters(teken)?.profiel).toBeUndefined();
    const kp = kuipParameters(teken, { dikte: 8, profiel: [[1, 0.2], [0, 1]], zitTrommel: true })!;
    expect(kp).toMatchObject({ dikte: 8, boog: 138, zitTrommel: true });
    expect(kp.profiel).toEqual([[0, 1], [1, 0.2]]);
  });

  it('verloop van de bovenrand: vlak op rughoogte, of recht aflopend naar de uiteinden; punten op gelijke afstanden', () => {
    const basis = kuipParameters({ plan: 'afgerond', dikte: 7, boog: 150, voorBoven: 14, armVanaf: 1 })!;
    const h = { P: 22, zithoogte: 45, rugH: 76, kussenDik: 12 };
    const vlak = kuipOpbouw(150, 65, h, { ...basis, profiel: [[0, 1], [1, 1]] }, false);
    expect(new Set(vlak.wand.hoogtes)).toEqual(new Set([76]));
    const schuin = kuipOpbouw(150, 65, h, { ...basis, profiel: [[0, 1], [0.6, 1], [1, 0]], profielRecht: true }, false);
    const n = schuin.wand.hoogtes.length, midden = (n - 1) / 2;
    expect(schuin.wand.hoogtes[midden]).toBe(76);
    expect(schuin.wand.hoogtes[0]).toBe(59); // zithoogte + voorBoven
    expect(schuin.wand.hoogtes[n - 1]).toBe(59);
    // Links en rechts gelijk, en van het midden naar een uiteinde nergens hoger.
    for (let i = 0; i < n; i++) expect(schuin.wand.hoogtes[i]).toBeCloseTo(schuin.wand.hoogtes[n - 1 - i]!, 1);
    for (let i = midden + 1; i < n; i++) expect(schuin.wand.hoogtes[i]!).toBeLessThanOrEqual(schuin.wand.hoogtes[i - 1]!);
    // Gelijke afstanden langs de schaal, ook bij een breed, afgerond grondvlak.
    const stukken = schuin.wand.pad.slice(1).map((q, i) => Math.hypot(q[0] - schuin.wand.pad[i]![0], q[1] - schuin.wand.pad[i]![1]));
    expect(Math.max(...stukken) / Math.min(...stukken)).toBeLessThan(1.25);
  });

  it('trommel: één zitting in de stof van de poten tot de zithoogte, geen onderbouw met een los kussen', () => {
    for (const rotatie of [0, 90, 180, 270] as Rotatie[]) {
      const blokken = bouw3D(fauteuil(milton, 'ringframe', rotatie), cat, standaardMaterialen).blokken;
      expect(blokken.some((b) => b.code === 'f.basis'), `rotatie ${rotatie}`).toBe(false);
      const zit = blokken.find((b) => b.code === 'f.zitkussen')!, rug = blokken.find((b) => b.code === 'f.rug')!;
      expect(zit).toMatchObject({ soort: 'kussen', y: 18, h: 22, afronding: 7 });
      expect(zit.kleur).toBe(rug.kleur);
      expect(zit.naad).toBeDefined();
      // Over het hele grondvlak, net binnen de buitenkant van de schaal (hooguit 2 cm per kant).
      expect(Math.max(zit.b, zit.d)).toBeGreaterThan(66);
      // De schaal: 8 cm dik, overal op rughoogte, rond de zitting tot onderaan.
      expect(rug).toMatchObject({ vorm: 'kuipwand', dikte: 8, y: 18 });
      expect(new Set(rug.hoogtes)).toEqual(new Set([72]));
    }
    // Het vooraanzicht toont dezelfde zitting.
    const voor = tekenVooraanzicht(fauteuil(milton), cat, standaardMaterialen).vormen;
    expect(voor.some((v) => v.code === 'f.basis')).toBe(false);
    expect(voor.find((v) => v.code === 'f.zitkussen')).toMatchObject({ hoogte: 22 });
  });

  it('een brede kuip met een korte schaal (Mabel 2-zit): de zitting blijft het hele grondvlak', () => {
    // De schaal staat alleen achteraan en zakt aan de zijkanten tot op de zitting. De zitting mag niet wegkrimpen omdat de
    // voorkant van het grondvlak ver van de wand ligt.
    const o = fauteuil({ plan: 'afgerond', exponent: 4.5, dikte: 7, boog: 96, voorBoven: -3, zitTrommel: true, profiel: [[0, 1], [0.62, 1], [1, 0]] });
    o.elementen[0]!.breedte = 150; o.elementen[0]!.diepte = 65;
    o.vormgeving = { ...o.vormgeving, rughoogte: 76, zithoogte: 45, poothoogte: 22 };
    const blokken = bouw3D(o, cat, standaardMaterialen).blokken;
    const zit = blokken.find((b) => b.code === 'f.zitkussen')!, rug = blokken.find((b) => b.code === 'f.rug')!;
    expect(zit.b).toBeGreaterThan(145);
    expect(zit.d).toBeGreaterThan(61);
    // De schaal: achteraan op rughoogte, aan de uiteinden net onder de zithoogte (ze duikt in de zitting), en ze stopt
    // rond het midden van de diepte.
    expect(Math.max(...rug.hoogtes!)).toBe(76);
    expect(rug.hoogtes![0]).toBe(42);
    expect(rug.hoogtes![rug.hoogtes!.length - 1]).toBe(42);
    expect(Math.max(...rug.pad!.map((q) => q[1]))).toBeLessThan(45);
    expect(berekenOntwerp(o, cat, standaardMaterialen).meldingen.filter((m) => m.ernst === 'fout')).toHaveLength(0);
  });

  it('scheve schaal: links en rechts een eigen omloop en verloop (Mabel méridienne), bij elke draaiing', () => {
    const basis = kuipParameters({ plan: 'afgerond', exponent: 4.5, dikte: 7, boog: 96, voorBoven: -3, armVanaf: 1 })!;
    const h = { P: 22, zithoogte: 45, rugH: 76, kussenDik: 12 };
    const scheef = kuipOpbouw(150, 65, h, { ...basis, boogRechts: 30, profiel: [[0, 1], [0.62, 1], [1, 0]], profielRechts: [[0, 1], [0.12, 1], [1, 0]] }, false);
    const pad = scheef.wand.pad, hoog = scheef.wand.hoogtes, n = pad.length;
    // Links (x klein): om het uiteinde tot rond het midden van de diepte, daar net onder de zithoogte.
    expect(pad[0]![0]).toBeLessThan(10);
    expect(pad[0]![1]).toBeGreaterThan(30);
    expect(hoog[0]).toBe(42);
    // Rechts stopt de leuning op de rug zelf, op ±85 % van de breedte, ook net onder de zithoogte.
    expect(pad[n - 1]![0]).toBeGreaterThan(115);
    expect(pad[n - 1]![0]).toBeLessThan(140);
    expect(pad[n - 1]![1]).toBeLessThan(12);
    expect(hoog[n - 1]).toBe(42);
    // Hoog (76) van de linkerhoek tot iets voorbij het midden; rechts daarvan alleen nog dalend.
    const hoogDeel = pad.filter((_, i) => hoog[i] === 76).map((q) => q[0]);
    expect(Math.min(...hoogDeel)).toBeLessThan(20);
    expect(Math.max(...hoogDeel)).toBeGreaterThan(75);
    expect(Math.max(...hoogDeel)).toBeLessThan(95);
    const rechts = hoog.filter((_, i) => pad[i]![0] > 95 && pad[i]![1] < 12);
    for (let i = 1; i < rechts.length; i++) expect(rechts[i]!).toBeLessThanOrEqual(rechts[i - 1]!);
    // Zonder boogRechts en profielRechts blijft de schaal symmetrisch.
    const gelijk = kuipOpbouw(150, 65, h, { ...basis, profiel: [[0, 1], [0.62, 1], [1, 0]] }, false).wand.hoogtes;
    for (let i = 0; i < gelijk.length; i++) expect(gelijk[i]).toBeCloseTo(gelijk[gelijk.length - 1 - i]!, 1);
    // In de 3D bij elke draaiing: de schaal blijft binnen het kader van het element, en het hoge deel ligt aan dezelfde kant.
    for (const rotatie of [0, 90, 180, 270] as Rotatie[]) {
      const o = fauteuil({ plan: 'afgerond', exponent: 4.5, dikte: 7, boog: 96, boogRechts: 30, voorBoven: -3, zitTrommel: true, profiel: [[0, 1], [0.62, 1], [1, 0]], profielRechts: [[0, 1], [0.12, 1], [1, 0]] }, 'ringframe', rotatie);
      o.elementen[0]!.breedte = 150; o.elementen[0]!.diepte = 65;
      const s = bouw3D(o, cat, standaardMaterialen), rug = s.blokken.find((b) => b.code === 'f.rug')!;
      for (const [x, z] of rug.pad!) {
        expect(x, `rotatie ${rotatie}`).toBeGreaterThanOrEqual(s.kader.x - 0.1);
        expect(x, `rotatie ${rotatie}`).toBeLessThanOrEqual(s.kader.x + s.kader.b + 0.1);
        expect(z, `rotatie ${rotatie}`).toBeGreaterThanOrEqual(s.kader.z - 0.1);
        expect(z, `rotatie ${rotatie}`).toBeLessThanOrEqual(s.kader.z + s.kader.d + 0.1);
      }
      expect(rug.hoogtes![0]).toBe(37); // zithoogte 40 in dit voorbeeld, 3 cm eronder
      expect(Math.max(...rug.hoogtes!)).toBe(72);
    }
  });

  it('schaal op de zitting: haar onderkant ligt net onder de zithoogte en de zitting is het volle grondvlak', () => {
    const blokken = bouw3D(fauteuil({ ...milton, schaalOp: true }), cat, standaardMaterialen).blokken;
    // Op een trommel begint ze waar de bolle rand van de zitting begint (zithoogte 40 − rand 7), met een lichte afronding.
    expect(blokken.find((b) => b.code === 'f.rug')).toMatchObject({ y: 33, afronding: 3 });
    expect(blokken.find((b) => b.code === 'f.zitkussen')!.b).toBe(70);
  });

  it('onderstel: frame op vier poten, of vier poten met een kruis', () => {
    const ring = bouw3D(fauteuil(milton, 'ringframe'), cat, standaardMaterialen).blokken;
    // Het frame volgt het grondvlak van de zitting (hier rond), 3 cm naar binnen, vlak onder de zitting.
    const frame = ring.find((b) => b.code === 'f.ring')!, zit = ring.find((b) => b.code === 'f.zitkussen')!;
    expect(frame).toMatchObject({ vorm: 'blok', y: 14, h: 4 });
    expect(frame.omtrek).toBeDefined();
    expect(frame.b).toBeCloseTo(64, 0);
    expect(frame.b).toBeLessThan(zit.b);
    const poten = ring.filter((b) => b.code.startsWith('f.poot-'));
    expect(poten).toHaveLength(4);
    for (const p of poten) {
      expect(p).toMatchObject({ vorm: 'kegel', y: 0, h: 14 });
      // Onder de zitting, niet erbuiten.
      expect(p.x).toBeGreaterThan(zit.x);
      expect(p.x + p.b).toBeLessThan(zit.x + zit.b);
    }
    // Een eigen dikte van het frame (Mabel: dunner).
    expect(bouw3D(fauteuil({ ...milton, frameDik: 2.5 }, 'ringframe'), cat, standaardMaterialen).blokken.find((b) => b.code === 'f.ring')).toMatchObject({ y: 15.5, h: 2.5 });
    const kruis = bouw3D(fauteuil(milton, 'kruisframe'), cat, standaardMaterialen).blokken;
    expect(kruis.some((b) => b.code === 'f.ring')).toBe(false);
    // De latten liggen langs de diagonalen naar de poten (70 × 68: 44,2° en 135,8°), ook bij een gedraaid element.
    for (const rotatie of [0, 90, 180, 270] as Rotatie[]) {
      const b = bouw3D(fauteuil(milton, 'kruisframe', rotatie), cat, standaardMaterialen).blokken;
      const poten = b.filter((x) => x.code.startsWith('f.poot-')), latten = b.filter((x) => x.code.startsWith('f.kruis-'));
      expect(latten).toHaveLength(2);
      for (const lat of latten) {
        // Elke lat wijst van het midden naar twee poten: op haar lijn liggen twee pootmiddens (binnen 1 cm).
        const cx = lat.x + lat.b / 2, cz = lat.z + lat.d / 2, a = (lat.draai! * Math.PI) / 180;
        const opLijn = poten.filter((p) => Math.abs(-(p.x + p.b / 2 - cx) * Math.sin(a) + (p.z + p.d / 2 - cz) * Math.cos(a)) < 1);
        expect(opLijn, `rotatie ${rotatie}`).toHaveLength(2);
      }
    }
    for (const p of kruis.filter((b) => b.code.startsWith('f.poot-'))) expect(p).toMatchObject({ y: 0, h: 18 });
    // Het vooraanzicht tekent het frame en de poten ook.
    const voor = tekenVooraanzicht(fauteuil(milton, 'ringframe'), cat, standaardMaterialen).vormen;
    expect(voor.find((v) => v.code === 'f.ring')).toMatchObject({ hoogte: 4 });
    expect(voor.filter((v) => v.code.startsWith('f.poot-'))).toHaveLength(2);
  });

  it('de poten van het onderstel staan schuin naar buiten, de voet blijft binnen het grondvlak', () => {
    // Op de productfoto's (Fraser, Ross, Sullivan, Mabel) staan de poten schuin; ze stonden hier recht (13/11).
    const fp = framePoten(61, 61, 26, 2);
    expect(fp.spreid).toBeGreaterThan(2);
    expect(fp.spreid).toBeLessThanOrEqual(0.2 * 26);
    // De voet (met haar halve dikte) blijft binnen de cirkel van het grondvlak.
    for (const q of fp.poten) expect(Math.hypot(q.lx + q.dx - 30.5, q.ly + q.dy - 30.5) + 2.5).toBeLessThanOrEqual(30.5 + 0.1);
    for (const rotatie of [0, 90, 180, 270] as Rotatie[]) {
      const s = bouw3D(fauteuil(milton, 'kruisframe', rotatie), cat, standaardMaterialen), k = s.kader;
      const poten = s.blokken.filter((b) => b.code.startsWith('f.poot-'));
      for (const p of poten) {
        expect(p.schuin, `rotatie ${rotatie}`).toBeDefined();
        // Weg van het midden van de zetel, en de voet binnen het kader van de zetel.
        const mx = p.x + p.b / 2 - (k.x + k.b / 2), mz = p.z + p.d / 2 - (k.z + k.d / 2);
        expect(mx * p.schuin![0] + mz * p.schuin![1], `rotatie ${rotatie}`).toBeGreaterThan(0);
        expect(p.x + p.schuin![0], `rotatie ${rotatie}`).toBeGreaterThanOrEqual(k.x);
        expect(p.x + p.b + p.schuin![0], `rotatie ${rotatie}`).toBeLessThanOrEqual(k.x + k.b);
        expect(p.z + p.schuin![1], `rotatie ${rotatie}`).toBeGreaterThanOrEqual(k.z);
        expect(p.z + p.d + p.schuin![1], `rotatie ${rotatie}`).toBeLessThanOrEqual(k.z + k.d);
      }
      // De latten van het kruis reiken tot de schuine poten op hun hoogte: langer dan tussen de bovenkanten.
      const lat = s.blokken.find((b) => b.code === 'f.kruis-a')!, boven = Math.hypot(poten[0]!.x - poten[3]!.x, poten[0]!.z - poten[3]!.z);
      expect(lat.b, `rotatie ${rotatie}`).toBeGreaterThan(boven);
    }
    // Het vooraanzicht tekent dezelfde schuine poten: de voet staat verder uit het midden dan de bovenkant.
    const voor = tekenVooraanzicht(fauteuil(milton, 'kruisframe'), cat, standaardMaterialen).vormen;
    const links = voor.find((v) => v.code === 'f.poot-l')!, rechts = voor.find((v) => v.code === 'f.poot-r')!;
    expect(links.breedte).toBeGreaterThan(5);
    expect(rechts.x + rechts.breedte! - links.x).toBeGreaterThan(voor.find((v) => v.code === 'f.kruis')!.breedte!);
  });

  it('onderstel bij heel korte of geen poten: alle maten blijven gewone getallen, geen kruis onder 6 cm', () => {
    // Met poothoogte 0 deelde de lengte van het kruis door nul (NaN in de blokken en in het kader van de 3D).
    for (const poten of ['kruisframe', 'ringframe']) for (const poothoogte of [0, 1, 4, 5.9, 6, 12]) for (const kruis of [false, true]) {
      const o = fauteuil({ ...milton, ...(kruis ? { frameKruis: true } : {}) }, poten);
      o.vormgeving = { ...o.vormgeving, poothoogte };
      const s = bouw3D(o, cat, standaardMaterialen), wat = `${poten} ${poothoogte} ${kruis}`;
      for (const b of s.blokken) for (const k of ['x', 'y', 'z', 'b', 'h', 'd'] as const) expect(Number.isFinite(b[k]), `${wat} ${b.code}.${k}`).toBe(true);
      for (const b of s.blokken) if (b.schuin) expect(b.schuin.every(Number.isFinite), `${wat} ${b.code}`).toBe(true);
      for (const k of ['x', 'z', 'b', 'd', 'h'] as const) expect(Number.isFinite(s.kader[k]), `${wat} kader.${k}`).toBe(true);
      const heeftKruis = s.blokken.some((b) => b.code.startsWith('f.kruis-')), verwacht = (poten === 'kruisframe' || kruis) && poothoogte - (poten === 'ringframe' ? Math.min(4, poothoogte / 3) : 0) >= 6;
      expect(heeftKruis, wat).toBe(verwacht);
      const voor = tekenVooraanzicht(o, cat, standaardMaterialen);
      for (const v of voor.vormen) for (const k of ['x', 'y', 'breedte', 'hoogte'] as const) expect(Number.isFinite(v[k] as number), `${wat} voor ${v.code}.${k}`).toBe(true);
      expect(voor.vormen.some((v) => v.code === 'f.kruis'), wat).toBe(verwacht);
    }
  });

  it('een ring op vier poten kan ook een kruis hebben (Sullivan)', () => {
    const b = bouw3D(fauteuil({ ...milton, frameKruis: true }, 'ringframe'), cat, standaardMaterialen).blokken;
    expect(b.find((x) => x.code === 'f.ring')).toBeDefined();
    expect(b.filter((x) => x.code.startsWith('f.kruis-'))).toHaveLength(2);
    expect(bouw3D(fauteuil(milton, 'ringframe'), cat, standaardMaterialen).blokken.some((x) => x.code.startsWith('f.kruis-'))).toBe(false);
    expect(tekenVooraanzicht(fauteuil({ ...milton, frameKruis: true }, 'ringframe'), cat, standaardMaterialen).vormen.some((v) => v.code === 'f.kruis')).toBe(true);
  });

  it('de trommelzitting in twee lagen: een kussen op een band (Fraser)', () => {
    const b = bouw3D(fauteuil({ ...milton, zitNaad: 10 }), cat, standaardMaterialen).blokken;
    const band = b.find((x) => x.code === 'f.zitband')!, kussen = b.find((x) => x.code === 'f.zitkussen')!;
    expect(band).toMatchObject({ y: 18, h: 12 });
    expect(kussen).toMatchObject({ y: 30, h: 10 });
    expect(band.omtrek).toEqual(kussen.omtrek);
    // Zonder: één geheel, zoals voorheen.
    expect(bouw3D(fauteuil(milton), cat, standaardMaterialen).blokken.some((x) => x.code === 'f.zitband')).toBe(false);
  });

  it('de schaal steekt rond de trommel uit (`zitIn`): smallere zitting, vooraan tot de voorkant, onderstel eronder', () => {
    const kp = kuipParameters({ plan: 'rond', dikte: 6, boog: 95 }, { zitTrommel: true, zitIn: 4, profiel: [[0, 1], [1, 1]] })!;
    // Zijkanten 4 cm naar binnen; achteraan tot net in de schaal (5,5 van de 6 cm: geen kier), vooraan niets.
    expect(trommelKader(70, 70, kp)).toEqual({ x: 4, y: 5.5, b: 62, d: 64.5 });
    expect(trommelKader(70, 70, { ...kp, zitIn: undefined })).toEqual({ x: 0, y: 0, b: 70, d: 70 });
    const opb = kuipOpbouw(70, 70, { P: 2, zithoogte: 45, rugH: 70, kussenDik: 0 }, kp, false);
    const xs = opb.zit.map((q) => q[0]), ys = opb.zit.map((q) => q[1]);
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([4, 66, 5.5, 70]);
    // In de 3D en in beide tekeningen dezelfde zitting; het frame en de poten staan eronder, niet onder de schaal.
    for (const rotatie of [0, 90, 180, 270] as Rotatie[]) {
      const o = fauteuil({ ...milton, zitIn: 3 }, 'ringframe', rotatie), b = bouw3D(o, cat, standaardMaterialen).blokken;
      const zit = b.find((x) => x.code === 'f.zitkussen')!, ring = b.find((x) => x.code === 'f.ring')!;
      expect(Math.min(zit.b, zit.d), `rotatie ${rotatie}`).toBeCloseTo(62, 0);
      expect(ring.x, `rotatie ${rotatie}`).toBeGreaterThan(zit.x);
      expect(ring.x + ring.b, `rotatie ${rotatie}`).toBeLessThan(zit.x + zit.b);
      expect(ring.z, `rotatie ${rotatie}`).toBeGreaterThan(zit.z);
      expect(ring.z + ring.d, `rotatie ${rotatie}`).toBeLessThan(zit.z + zit.d);
      for (const p of b.filter((x) => x.code.startsWith('f.poot-'))) {
        expect(p.x, `rotatie ${rotatie}`).toBeGreaterThan(zit.x);
        expect(p.x + p.b, `rotatie ${rotatie}`).toBeLessThan(zit.x + zit.b);
      }
      const voor = tekenVooraanzicht(o, cat, standaardMaterialen).vormen, zitV = voor.find((v) => v.code === 'f.zitkussen')!, ringV = voor.find((v) => v.code === 'f.ring')!;
      expect(zitV.breedte, `rotatie ${rotatie}`).toBeCloseTo(zit.b, 0);
      expect(ringV.x, `rotatie ${rotatie}`).toBeGreaterThan(zitV.x);
      expect(ringV.x + ringV.breedte!, `rotatie ${rotatie}`).toBeLessThan(zitV.x + zitV.breedte!);
    }
  });

  it('een los vierkant rugkussen leunt tegen de rand van de schaal en steekt er niet doorheen', () => {
    const kp = kuipParameters({ plan: 'rond', dikte: 6, boog: 95 }, { zitTrommel: true, profiel: [[0, 1], [1, 1]], kussens: 1, kussenMaat: 48, kussenHoog: 38 })!;
    const k = kuipOpbouw(70, 70, { P: 2, zithoogte: 45, rugH: 70, kussenDik: 0 }, kp, true).rugkussens[0]!;
    expect(k).toMatchObject({ lb: 48, h: 38, vierkant: true });
    // Onderaan staat de achterkant van het kussen 25 cm × tan 14° (±6,2 cm) voor de binnenkant van de schaal (6 cm).
    expect(k.ly).toBeGreaterThan(6 + 6);
    expect(k.ly).toBeLessThan(6 + 8);
    // Zonder eigen hoogte blijft het vierkant.
    const vier = kuipOpbouw(70, 70, { P: 2, zithoogte: 45, rugH: 70, kussenDik: 0 }, { ...kp, kussenHoog: undefined }, true).rugkussens[0]!;
    expect(vier.h).toBe(48);
  });

  it('de schaal van een trommelfauteuil krijgt een naad of bies langs haar rand', () => {
    const o = fauteuil(milton, 'ringframe');
    o.opties = { ...o.opties, naad: 'bies' };
    expect(bouw3D(o, cat, standaardMaterialen).blokken.find((b) => b.code === 'f.rug')!.naad?.soort).toBe('bies');
    // Zonder trommel (de bestaande kuipvormen) niet.
    const oud = fauteuil(undefined, 'conisch');
    oud.opties = { ...oud.opties, naad: 'bies' };
    expect(bouw3D(oud, cat, standaardMaterialen).blokken.find((b) => b.code === 'f.rug')!.naad).toBeUndefined();
  });

  it('een andere keuze bij "Vorm fauteuil" op een model met een eigen vorm geeft geen fout', () => {
    for (const vorm of ['rond', 'afgerond', 'omhullend', 'trommel', 'organisch', 'schelp', 'hoekig']) {
      const o = fauteuil(milton);
      o.elementen[0]!.opties = { kuipvorm: vorm };
      const s = bouw3D(o, cat, standaardMaterialen);
      expect(s.blokken.length, vorm).toBeGreaterThan(3);
      for (const b of s.blokken) for (const w of [b.x, b.y, b.z, b.b, b.h, b.d]) expect(Number.isFinite(w), `${vorm} ${b.code}`).toBe(true);
      expect(() => tekenVooraanzicht(o, cat, standaardMaterialen)).not.toThrow();
      expect(berekenOntwerp(o, cat, standaardMaterialen).meldingen.filter((m) => m.ernst === 'fout'), vorm).toHaveLength(0);
    }
  });

  it('het frame op vier poten werkt ook onder een zitelement van een sofa (recht frame, poten onder de hoeken)', () => {
    const o: Ontwerp = { hoofdmateriaal: 'linnen_ficelle', opties: { poten: 'ringframe' }, elementen: [{ id: 'z', type: 'zit', x: 0, y: 0, breedte: 180, diepte: 95, rotatie: 0 }] };
    const b = bouw3D(o, cat, standaardMaterialen).blokken;
    expect(b.find((x) => x.code === 'z.ring')).toMatchObject({ vorm: 'blok', b: 174, d: 89 });
    expect(b.filter((x) => x.code.startsWith('z.poot-'))).toHaveLength(4);
  });

  it('zonder eigen vorm blijft alles zoals het was', () => {
    const o = fauteuil(undefined, 'conisch');
    const blokken = bouw3D(o, cat, standaardMaterialen).blokken;
    expect(blokken.some((b) => b.code === 'f.basis')).toBe(true);
    expect(blokken.find((b) => b.code === 'f.zitkussen')!.y).toBeGreaterThan(18);
  });
});
