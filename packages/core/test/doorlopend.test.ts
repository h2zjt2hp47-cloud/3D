import { describe, expect, it } from 'vitest';
import { berekenOntwerp, bouw3D, doorlopendeRij, tekenVooraanzicht, type Ontwerp } from '../src/index.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

/** Doorlopende opbouw (Doha, Montego): de rij zitelementen als één zetel in 3D; prijs en tekeningen per element. */
const model = (code: string) => structuredClone(zetelModellen.find((m) => m.code === code)!.ontwerp);
const blokken = (o: Ontwerp) => bouw3D(o, zetelCatalogus, standaardMaterialen).blokken;
const perElement = (o: Ontwerp): Ontwerp => ({ ...o, vormgeving: { ...o.vormgeving, opbouw: 'elementen' } });

describe('doorlopende opbouw', () => {
  it('Doha: één onderbouw, één zitkussen, één lage rug die aan de uiteinden naar de zitting zakt en drie rugkussens; geen losse elementen meer', () => {
    const o = model('doha');
    const b = blokken(o);
    expect(b.some((x) => x.code === 'e1.zitkussen' || x.code === 'e3.zitkussen' || x.code === 'e1.rugrond')).toBe(false);
    const zit = b.filter((x) => x.code.endsWith('.zitkussen'));
    expect(zit).toHaveLength(1);
    expect(zit[0]!.omtrek!.length).toBeGreaterThan(40);
    // Over de hele lengte (±300 cm, benadering uit de foto's), links dieper (loungedeel 145 cm, rechts 110 cm).
    const xs = zit[0]!.omtrek!.map((p) => p[0]);
    expect(Math.min(...xs)).toBeLessThan(3);
    expect(Math.max(...xs)).toBeGreaterThan(297);
    const dieptebij = (x: number) => Math.max(...zit[0]!.omtrek!.filter((p) => Math.abs(p[0] - x) < 8).map((p) => p[1]));
    expect(dieptebij(60)).toBeGreaterThan(dieptebij(200) + 25);
    // De rug: in het midden op karkashoogte (65); aan beide uiteinden zakt hij in een kwartronde tot net onder de
    // bovenkant van de zitting (42), zoals de armleuning op de foto's.
    const rug = b.find((x) => x.code.endsWith('.rug'))!;
    expect(rug.vorm).toBe('kuipwand');
    const hoogtes = rug.hoogtes!;
    expect(Math.max(...hoogtes)).toBe(65);
    expect(hoogtes[Math.floor(hoogtes.length / 2)]).toBe(65);
    expect(hoogtes[0]!).toBeCloseTo(38, 0);
    expect(hoogtes[hoogtes.length - 1]!).toBeCloseTo(38, 0);
    // Het zakt gelijkmatig: geen sprong groter dan 12 cm tussen twee punten, en nergens terug omhoog naar het uiteinde toe.
    for (let i = 1; i < hoogtes.length; i++) expect(Math.abs(hoogtes[i]! - hoogtes[i - 1]!)).toBeLessThan(12);
    const top = hoogtes.indexOf(65), laatsteTop = hoogtes.lastIndexOf(65);
    for (let i = 1; i <= top; i++) expect(hoogtes[i]!).toBeGreaterThanOrEqual(hoogtes[i - 1]!);
    for (let i = laatsteTop + 1; i < hoogtes.length; i++) expect(hoogtes[i]!).toBeLessThanOrEqual(hoogtes[i - 1]!);
    // Links draait de rug om het uiteinde tot ±42 % van de diepte van het loungedeel (145): een armleuning.
    expect(rug.pad![0]![1]).toBeGreaterThan(52);
    expect(rug.pad![0]![1]).toBeLessThan(66);
    // Rechts stopt hij vóór het ronde uiteinde (hooguit een klein stuk de achterhoek in): de zitting loopt verder.
    const einde = rug.pad![rug.pad!.length - 1]!;
    expect(einde[1]).toBeLessThan(25);
    expect(einde[0]).toBeLessThan(290);
    expect(einde[0]).toBeGreaterThan(255);
    expect(rug.y).toBe(zit[0]!.y); // de rug staat op de onderbouw, achter het zitkussen
    // Twee banden: het zitkussen rondom (ook achteraan), de onderbouw 3 cm terug, met een ronde rand.
    const basis = b.find((x) => x.code.endsWith('.basis'))!;
    expect(Math.min(...zit[0]!.omtrek!.map((p) => p[1]))).toBeLessThan(1);
    expect(Math.max(...basis.omtrek!.map((p) => p[0]))).toBeLessThan(Math.max(...xs) - 2.5);
    // De zijkant van de onderbouw is bijna recht (foto's): een kleine afronding, geen halve cirkel.
    expect(basis.afronding!).toBeGreaterThan(basis.h * 0.15);
    expect(basis.afronding!).toBeLessThan(basis.h * 0.35);
    // De zitting (bovenste band) is hoger dan de onderbouw.
    expect(zit[0]!.h).toBeGreaterThan(basis.h * 1.5);
    expect(b.filter((x) => x.code.includes('.rugkussen'))).toHaveLength(3);
    expect(b.some((x) => x.code.endsWith('.voet') && x.soort === 'donker')).toBe(true); // verdekte voet
    // De sierkussens blijven.
    expect(b.filter((x) => x.code.startsWith('e4.') || x.code.startsWith('e5.')).length).toBeGreaterThan(0);
  });

  it('prijs, bovenaanzicht en vooraanzicht blijven per element', () => {
    const o = model('doha');
    const a = berekenOntwerp(o, zetelCatalogus, standaardMaterialen), p = berekenOntwerp(perElement(o), zetelCatalogus, standaardMaterialen);
    expect(a.prijs.brutoprijsExcl).toBe(p.prijs.brutoprijsExcl);
    expect(a.tekening).toEqual(p.tekening);
    expect(tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen)).toEqual(tekenVooraanzicht(perElement(o), zetelCatalogus, standaardMaterialen));
  });

  it('Montego: in een boog, de uiteinden naar voren; vaste zitting; de rug korter dan de zitting; de kussens draaien mee', () => {
    const b = blokken(model('montego'));
    const rug = b.find((x) => x.code.endsWith('.rug'))!;
    const zs = rug.pad!.map((p) => p[1]);
    const midden = Math.min(...zs);
    // De rug stopt aan beide kanten op de rechte achterkant (minstens 40 % van het eindelement ver), met een ronde kop.
    expect(rug.pad![0]![0]).toBeGreaterThan(50);
    expect(rug.pad![rug.pad!.length - 1]![0]).toBeLessThan(210);
    expect(zs[0]! - midden).toBeGreaterThan(5); // ook daar al naar voren door de boog
    expect(zs[zs.length - 1]! - midden).toBeGreaterThan(5);
    expect(new Set(rug.hoogtes)).toEqual(new Set([77])); // overal even hoog: de ronde kop komt van de wand zelf
    expect(rug.y).toBe(b.find((x) => x.code.endsWith('.basis'))!.y); // één vorm van de voet tot de rug
    expect(b.some((x) => x.code.endsWith('.zitkussen'))).toBe(false); // vaste zitting
    expect(b.filter((x) => x.code.includes('.rugkussen'))).toHaveLength(0); // vaste rug
    const kussen = b.filter((x) => x.code.startsWith('e3.') || x.code.startsWith('e4.'));
    expect(kussen.length).toBeGreaterThan(0);
    for (const k of kussen) expect(Math.sign(k.draai ?? 0)).toBe(Math.sign(k.x + k.b / 2 - 130) || 0);
  });

  it('geen plooi in de omtrekken en de rug overal binnen de onderbouw (ook in de boog); de voet is een gewone vorm', () => {
    type P = [number, number];
    const kruist = (a: P, b: P, c: P, d: P) => {
      const o = (p: P, q: P, r: P) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
      return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
    };
    const binnen = ([x, y]: P, pts: P[]) => {
      let i = false;
      for (let k = 0, j = pts.length - 1; k < pts.length; j = k++) {
        const [ax, ay] = pts[j]!, [bx, by] = pts[k]!;
        if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) i = !i;
      }
      return i;
    };
    for (const code of ['doha', 'montego']) {
      const b = blokken(model(code));
      for (const blok of b.filter((x) => x.omtrek)) {
        const p = blok.omtrek!, n = p.length;
        for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue;
          expect(kruist(p[i]!, p[(i + 1) % n]!, p[j]!, p[(j + 1) % n]!), `${code} ${blok.code} zijden ${i} en ${j}`).toBe(false);
        }
      }
      const basis = b.find((x) => x.code.endsWith('.basis'))!, rug = b.find((x) => x.code.endsWith('.rug'))!;
      for (const q of rug.pad!) expect(binnen(q, basis.omtrek!), `${code} rug ${q}`).toBe(true);
      expect(rug.glad && basis.glad).toBe(true);
      expect(b.find((x) => x.code.endsWith('.voet'))!.glad).toBe(false);
    }
  });

  it('per element (zoals vroeger) en een rij die onderbroken wordt', () => {
    expect(blokken(perElement(model('doha'))).some((x) => x.code === 'e1.zitkussen')).toBe(true);
    const o = model('doha');
    o.elementen[2]!.rotatie = 90;
    expect(doorlopendeRij(o, zetelCatalogus).map((e) => e.id)).toEqual(['e1', 'e2']);
    const b = blokken(o);
    expect(b.some((x) => x.code.startsWith('e3.'))).toBe(true); // het gedraaide element blijft zoals het was
  });
});
