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
  it('Doha: één onderbouw, één zitkussen, één lage rug rond de uiteinden en vier rugkussens; geen losse elementen meer', () => {
    const o = model('doha');
    const b = blokken(o);
    expect(b.some((x) => x.code === 'e1.zitkussen' || x.code === 'e3.zitkussen' || x.code === 'e1.rugrond')).toBe(false);
    const zit = b.filter((x) => x.code.endsWith('.zitkussen'));
    expect(zit).toHaveLength(1);
    expect(zit[0]!.omtrek!.length).toBeGreaterThan(40);
    // Over de hele lengte, links dieper (loungedeel 145 cm, rechts 110 cm).
    const xs = zit[0]!.omtrek!.map((p) => p[0]);
    expect(Math.min(...xs)).toBeLessThan(3);
    expect(Math.max(...xs)).toBeGreaterThan(357);
    const dieptebij = (x: number) => Math.max(...zit[0]!.omtrek!.filter((p) => Math.abs(p[0] - x) < 8).map((p) => p[1]));
    expect(dieptebij(75)).toBeGreaterThan(dieptebij(200) + 25);
    // De rug: hoog achteraan (karkas 65), rond de uiteinden lager naar voren.
    const rug = b.find((x) => x.code.endsWith('.rug'))!;
    expect(rug.vorm).toBe('kuipwand');
    expect(Math.max(...rug.hoogtes!)).toBe(65);
    expect(rug.hoogtes![0]!).toBeLessThan(60);
    expect(rug.hoogtes![rug.hoogtes!.length - 1]!).toBeLessThan(60);
    expect(rug.pad![0]![1]).toBeGreaterThan(60); // de wand begint links vooraan, op het loungedeel
    expect(b.filter((x) => x.code.includes('.rugkussen'))).toHaveLength(4);
    expect(b.some((x) => x.code.endsWith('.voet') && x.soort === 'donker')).toBe(true); // verdekte voet
    // De sierkussens blijven.
    expect(b.filter((x) => x.code.startsWith('e4.') || x.code.startsWith('e6.')).length).toBeGreaterThan(0);
  });

  it('prijs, bovenaanzicht en vooraanzicht blijven per element', () => {
    const o = model('doha');
    const a = berekenOntwerp(o, zetelCatalogus, standaardMaterialen), p = berekenOntwerp(perElement(o), zetelCatalogus, standaardMaterialen);
    expect(a.prijs.brutoprijsExcl).toBe(p.prijs.brutoprijsExcl);
    expect(a.tekening).toEqual(p.tekening);
    expect(tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen)).toEqual(tekenVooraanzicht(perElement(o), zetelCatalogus, standaardMaterialen));
  });

  it('Montego: in een boog, de uiteinden 30 cm naar voren; de kussens erop draaien mee', () => {
    const b = blokken(model('montego'));
    const rug = b.find((x) => x.code.endsWith('.rug'))!;
    const zs = rug.pad!.map((p) => p[1]);
    const midden = Math.min(...zs);
    expect(zs[0]! - midden).toBeGreaterThan(20);
    expect(zs[zs.length - 1]! - midden).toBeGreaterThan(20);
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
