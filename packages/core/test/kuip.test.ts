import { describe, expect, it } from 'vitest';
import { bouw3D, tekenVooraanzicht, type Ontwerp } from '../src/index.js';
import { kuipOpbouw, kuipParameters, kuipVoetInzet } from '../src/kuip.js';
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
    for (const v of ['rond', 'afgerond', 'ton', 'hoog', 'koepel', 'trommel', 'schelp']) {
      const w = kuipOpbouw(85, 85, h, kuipParameters(teken(v))!, false).wand.hoogtes;
      expect(w[0], v).toBe(w[w.length - 1]);
    }
  });
  it('omhullend (Manon) is een spiraal: links hoger dan rechts, en rechts een lage arm boven de zitting', () => {
    const w = kuipOpbouw(75, 70, h, kuipParameters(teken('omhullend'))!, false).wand;
    const rechts = w.hoogtes[0]!, links = w.hoogtes[w.hoogtes.length - 1]!;
    expect(links).toBeGreaterThan(rechts);
    expect(rechts).toBeGreaterThan(h.zithoogte + 5); // geen schaal die in de zitting verdwijnt, maar een lage arm
    expect(Math.max(...w.hoogtes)).toBe(h.rugH);
  });
});

describe('hellende, gepolsterde kuipwand (tweede ronde 11/11)', () => {
  const h = { P: 4, zithoogte: 44, rugH: 92, kussenDik: 12 };
  it('de maat blijft de buitenmaat: de voet staat zoveel naar binnen als de wand helt', () => {
    const k = kuipParameters(teken('hoog'))!;
    expect(k.helling).toBeGreaterThan(5);
    const inzet = kuipVoetInzet(k);
    expect(inzet.achter).toBeCloseTo(k.helling * 0.9, 5);
    const o = kuipOpbouw(72, 80, h, k, false);
    const xs = o.plan.map((q) => q[0]), ys = o.plan.map((q) => q[1]);
    expect(Math.min(...xs)).toBeCloseTo(inzet.zij, 0);
    expect(Math.max(...xs)).toBeCloseTo(72 - inzet.zij, 0);
    expect(Math.min(...ys)).toBeCloseTo(inzet.achter, 0); // achteraan staat de voet naar voren
    expect(Math.max(...ys)).toBeCloseTo(80, 0); // vooraan niet
    expect(o.wand).toMatchObject({ helling: k.helling, hellingArm: k.hellingArm, bol: k.bol });
  });
  it('zonder helling verandert er niets, en een rug op het zitkussen of op een frame houdt de volle voet', () => {
    const recht = kuipParameters({ plan: 'rond', dikte: 12, boog: 130, voorBoven: 12, armVanaf: 1 })!;
    expect(kuipVoetInzet(recht)).toEqual({ zij: 0, achter: 0 });
    expect(Math.min(...kuipOpbouw(80, 80, h, recht, false).plan.map((q) => q[0]))).toBeCloseTo(0, 0);
    for (const v of ['meridienne', 'schelp']) expect(kuipVoetInzet(kuipParameters(teken(v))!), v).toEqual({ zij: 0, achter: 0 });
  });
  it('een brede kuip (tweezit) krijgt een rechte rug met ronde hoeken, een smalle blijft rond', () => {
    const k = kuipParameters(teken('ton'))!;
    // Hoek van het grondvlak op 45°: bij een hoekiger grondvlak ligt hij dichter bij de hoek van de rechthoek.
    const hoek = (B: number, D: number) => { const p = kuipOpbouw(B, D, h, k, false).plan; const q = p[Math.round(p.length / 8)]!; return Math.hypot(q[0] - B / 2, q[1] - D / 2) / Math.hypot(B / 2, D / 2); };
    expect(hoek(145, 75)).toBeGreaterThan(hoek(68, 65) + 0.04);
  });
  it('elke standaardvorm heeft een helling binnen de grenzen', () => {
    for (const v of ['rond', 'afgerond', 'ton', 'hoog', 'omhullend', 'koepel', 'trommel', 'organisch', 'meridienne', 'schelp']) {
      const k = kuipParameters(teken(v))!;
      expect(Math.abs(k.helling), v).toBeLessThanOrEqual(24);
      expect(k.bol, v).toBeGreaterThanOrEqual(0);
      expect(k.eindDikte, v).toBeGreaterThan(0.29);
    }
  });
});
