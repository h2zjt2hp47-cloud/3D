import { describe, expect, it } from 'vitest';
import { bouw3D, tekenVooraanzicht, type Ontwerp } from '../src/index.js';
import { kuipOpbouw, kuipParameters, kuipVoetInzet } from '../src/kuip.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';
import { zetelModellen } from '../voorbeelden/modellen.js';

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
  it("volgens de productfoto's: de schaal staat achter de zitting, het hoogst boven de linkerhoek, en zakt naar rechts in de zitting", () => {
    expect(hoogtes[0]).toBeLessThan(h.zithoogte); // rechts: verdwijnt in de zitting
    expect(pad[0]![0]).toBeGreaterThan(55); // rechts van het midden (±vier vijfde van de breedte)
    expect(pad[0]![1]).toBeLessThan(25); // achteraan
    // Links loopt ze rond de hoek en stopt in de achterste helft (de zitting ligt ervoor: een verticale naad), nog hoog.
    const laatste = pad[pad.length - 1]!;
    expect(laatste[0]).toBeLessThan(20); // links
    expect(laatste[1]).toBeLessThan(45); // niet tot vooraan
    expect(hoogtes[hoogtes.length - 1]).toBeGreaterThan(h.zithoogte + 15);
    // Het hoogst achteraan, links van het midden.
    const top = pad[hoogtes.indexOf(Math.max(...hoogtes))]!;
    expect(top[0]).toBeLessThan(42.5);
    expect(top[0]).toBeGreaterThan(8);
    expect(top[1]).toBeLessThan(20);
    expect(Math.max(...hoogtes)).toBe(92);
    // Naar rechts zakt de rand bijna in een rechte lijn: halverwege ongeveer halverwege de hoogte (niet meer bol).
    const iTop = hoogtes.indexOf(Math.max(...hoogtes));
    const half = hoogtes[Math.round(iTop / 2)]!;
    expect(half).toBeGreaterThan((92 + h.zithoogte) / 2 - 2);
    expect(half).toBeLessThan(h.zithoogte + (92 - h.zithoogte) * 0.72);
    for (const [x, y] of [...opb.plan, ...pad]) { expect(x).toBeGreaterThanOrEqual(-0.01); expect(x).toBeLessThanOrEqual(85.01); expect(y).toBeGreaterThanOrEqual(-0.01); expect(y).toBeLessThanOrEqual(85.01); }
    // De zitting is de volle kiezel: ze loopt tot bijna aan de rand, ook onder de schaal door.
    const zx = opb.zit.map((q) => q[0]), zy = opb.zit.map((q) => q[1]);
    expect(Math.min(...zx)).toBeLessThan(5);
    expect(Math.min(...zy)).toBeLessThan(5);
  });
  it('de andere kuipvormen blijven symmetrisch', () => {
    for (const v of ['rond', 'afgerond', 'ton', 'hoog', 'koepel', 'trommel', 'schelp']) {
      const w = kuipOpbouw(85, 85, h, kuipParameters(teken(v))!, false).wand.hoogtes;
      expect(w[0], v).toBe(w[w.length - 1]);
    }
  });
  it('omhullend (Manon) is symmetrisch: achteraan hoog, aan beide kanten in een bolle lijn tot op de zitting', () => {
    const w = kuipOpbouw(75, 70, h, kuipParameters(teken('omhullend'))!, false).wand;
    const n = w.hoogtes.length, rechts = w.hoogtes[0]!, links = w.hoogtes[n - 1]!;
    expect(links).toBe(rechts);
    expect(rechts).toBeLessThan(h.zithoogte + 4); // de rand zakt tot op de zitting
    expect(Math.max(...w.hoogtes)).toBe(h.rugH);
    expect(w.hoogtes[Math.floor(n / 2)]).toBe(h.rugH);
    // Bol: halverwege tussen de rug en het uiteinde nog ruim boven het midden van de hoogte.
    expect(w.hoogtes[Math.round(n * 0.75)]!).toBeGreaterThan((h.rugH + rechts) / 2 + 5);
    // De wand stopt opzij van het midden: vooraan is de zitting vrij.
    expect(w.pad[0]![1]).toBeLessThan(70 * 0.8);
  });
  it('de punten van de wand liggen op gelijke afstanden, ook bij een hoekig grondvlak (schelp)', () => {
    const w = kuipOpbouw(68, 72, h, kuipParameters(teken('schelp'))!, false).wand;
    const stap = w.pad.slice(1).map((q, i) => Math.hypot(q[0] - w.pad[i]![0], q[1] - w.pad[i]![1]));
    expect(Math.max(...stap) / Math.min(...stap)).toBeLessThan(1.25);
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

describe('na de opmerkingen op het controleblad (11/11)', () => {
  const blokkenVan = (code: string) => bouw3D(zetelModellen.find((m) => m.code === code)!.ontwerp, zetelCatalogus, standaardMaterialen).blokken;
  it('Karl: de rug is een ovaal kussen op het frame (ronde onderkant), zonder vleugels naar voren', () => {
    const rug = blokkenVan('karl').find((b) => b.vorm === 'kuipwand')!;
    expect(rug.wandOvaal).toBeGreaterThan(0.4);
    // Bijna recht achter de zitting: de uiteinden komen maar een paar centimeter naar voren.
    const zs = rug.pad!.map((p) => p[1]);
    expect(Math.max(...zs) - Math.min(...zs)).toBeLessThan(9);
    expect(rug.y).toBeGreaterThan(45); // boven de zitting
  });
  it('Mabel: een dikke zitting over het hele grondvlak met een lage rug erop die vooraan tot op de zitting zakt', () => {
    const k = kuipParameters(teken('ton'))!;
    expect(k.opZitting).toBe(true);
    const b = blokkenVan('mabel-1'), rug = b.find((x) => x.vorm === 'kuipwand')!, zit = b.find((x) => x.code.endsWith('.zitkussen'))!;
    expect(zit.h).toBeGreaterThanOrEqual(20);
    expect(zit.b).toBeGreaterThan(64); // bijna de volle 68 cm
    expect(Math.min(...rug.hoogtes!)).toBeLessThan(45 + 2);
    expect(Math.max(...rug.hoogtes!)).toBe(76);
  });
  it('Quin: de trommel loopt tot vlak boven de vloer op een brede, platte draaivoet, met vier grote kussens', () => {
    const b = blokkenVan('quin');
    const plaat = b.find((x) => x.code.endsWith('.voetplaat'))!, basis = b.find((x) => x.code.endsWith('.basis'))!;
    expect(basis.y).toBeLessThanOrEqual(5);
    expect(plaat.b).toBeGreaterThan(91 * 0.7);
    const kussens = b.filter((x) => x.code.includes('.rugkussen'));
    expect(kussens).toHaveLength(4);
    for (const k of kussens) expect(k.b).toBeGreaterThan(32);
  });
  it('Wallace: los gevulde donskussens; een gewoon donzen rugkussen (Kotor) blijft zoals het was', () => {
    const los = (code: string) => blokkenVan(code).filter((x) => x.code.includes('.rugkussen')).map((x) => x.losGevuld ?? 0);
    expect(Math.min(...los('wallace'))).toBe(1);
    expect(Math.max(...los('kotor'))).toBe(0);
  });
});
