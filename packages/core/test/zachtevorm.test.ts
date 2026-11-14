import { describe, expect, it } from 'vitest';
import { bouw3D, smeltMee, zachtVeld, zachteVorm, type Blok, type ZachteVorm } from '../src/index.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

/** Zachte vormen: gestoffeerde delen van het karkas samengesmolten tot één doorlopende vorm. */
const blok = (code: string, x: number, y: number, z: number, b: number, h: number, d: number, extra: Partial<Blok> = {}): Blok =>
  ({ code, soort: 'stof', vorm: 'blok', x, y, z, b, h, d, kleur: '#cccccc', afronding: 2, ...extra });

/** Elke ribbe hoort bij precies twee driehoeken: de vorm is dicht, zonder gaten of losse randen. */
function dicht(v: ZachteVorm) {
  const p = (i: number) => `${v.posities[i * 3]!.toFixed(3)},${v.posities[i * 3 + 1]!.toFixed(3)},${v.posities[i * 3 + 2]!.toFixed(3)}`;
  const ribben = new Map<string, number>();
  for (let t = 0; t < v.driehoeken; t++) {
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]] as const) {
      const pa = p(t * 3 + a), pb = p(t * 3 + b);
      const k = pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`;
      ribben.set(k, (ribben.get(k) ?? 0) + 1);
    }
  }
  return [...ribben.values()].filter((n) => n !== 2).length;
}
function kader(v: ZachteVorm) {
  const k = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
  for (let i = 0; i < v.posities.length; i += 3) {
    k.x0 = Math.min(k.x0, v.posities[i]!); k.x1 = Math.max(k.x1, v.posities[i]!);
    k.y0 = Math.min(k.y0, v.posities[i + 1]!); k.y1 = Math.max(k.y1, v.posities[i + 1]!);
    k.z0 = Math.min(k.z0, v.posities[i + 2]!); k.z1 = Math.max(k.z1, v.posities[i + 2]!);
  }
  return k;
}

describe('zachte vorm', () => {
  it('welke blokken meesmelten: gestoffeerd karkas wel, kussens, hout en metaal niet', () => {
    expect(smeltMee(blok('a.arm', 0, 0, 0, 20, 60, 90))).toBe(true);
    expect(smeltMee(blok('a.zitkussen', 0, 0, 0, 20, 60, 90, { soort: 'kussen' }))).toBe(false);
    expect(smeltMee(blok('a.poot', 0, 0, 0, 4, 12, 4, { soort: 'hout' }))).toBe(false);
    expect(smeltMee(blok('a.rol', 0, 0, 0, 20, 20, 90, { vorm: 'cilinder', as: 'z' }))).toBe(true);
  });

  it('één blok: dicht, de punten op het oppervlak, met de maten van het blok', () => {
    const b = blok('z.basis', 0, 0, 0, 100, 40, 80, { afronding: 3 });
    const v = zachteVorm([b]);
    expect(v.driehoeken).toBeGreaterThan(500);
    expect(dicht(v)).toBe(0);
    const veld = zachtVeld([b]);
    for (let i = 0; i < v.posities.length; i += 27) expect(Math.abs(veld(v.posities[i]!, v.posities[i + 1]!, v.posities[i + 2]!))).toBeLessThan(0.05);
    const k = kader(v);
    for (const [a, verwacht] of [[k.x0, 0], [k.x1, 100], [k.y0, 0], [k.y1, 40], [k.z0, 0], [k.z1, 80]] as const) expect(Math.abs(a - verwacht)).toBeLessThan(0.3);
  });

  it('arm op een onderbouw: in de hoek een afronding en schaduw', () => {
    const delen = [blok('z.basis', 0, 0, 0, 100, 20, 80), blok('a.arm', 0, 0, 0, 20, 60, 80)];
    const veld = zachtVeld(delen);
    // Een halve cm diagonaal in de hoek tussen de binnenkant van de arm en de bovenkant van de onderbouw: opgevuld
    // (zonder overgang lag dat punt een halve cm buiten beide blokken).
    expect(veld(20.5, 20.5, 40)).toBeLessThan(-0.3);
    const v = zachteVorm(delen);
    expect(dicht(v)).toBe(0);
    const schaduwBij = (x: number, y: number) => {
      let beste = Infinity, s = 1;
      for (let i = 0; i < v.driehoeken * 3; i++) {
        const z = v.posities[i * 3 + 2]!;
        if (Math.abs(z - 40) > 3) continue;
        const d = Math.hypot(v.posities[i * 3]! - x, v.posities[i * 3 + 1]! - y);
        if (d < beste) { beste = d; s = v.schaduw[i]!; }
      }
      return s;
    };
    expect(schaduwBij(23, 23)).toBeLessThan(schaduwBij(10, 60) - 0.1);
  });

  it('twee blokken in elkaars verlengde: geen richel op de naad', () => {
    // Bijna scherpe blokken: 1 cm voor de voorkant, op de naad, ligt het oppervlak nog altijd 1 cm verder
    // (een gewone zachte samenvoeging gaf daar een richel van bijna 1 cm).
    const scherp = [blok('a.basis', 0, 0, 0, 50, 40, 80, { afronding: 0.3 }), blok('b.basis', 50, 0, 0, 50, 40, 80, { afronding: 0.3 })];
    expect(zachtVeld(scherp)(50, 20, 81)).toBeGreaterThan(0.8);
    // Afgeronde blokken: de groef tussen de afrondingen wordt opgevuld, hoogstens 3 mm bol.
    const rond = [blok('a.basis', 0, 0, 0, 50, 40, 80), blok('b.basis', 50, 0, 0, 50, 40, 80)];
    expect(zachtVeld(rond)(50, 20, 80.3)).toBeGreaterThan(0);
    expect(zachtVeld(rond)(50, 20, 79.5)).toBeLessThan(0);
  });

  it('Wallace: het karkas (hoes, armen met gekrulde rand, rug, onderbouw) wordt één dichte vorm, de kussens niet', () => {
    const m = zetelModellen.find((x) => x.code === 'wallace')!;
    const s = bouw3D(m.ontwerp, zetelCatalogus, standaardMaterialen);
    const karkas = s.blokken.filter(smeltMee);
    expect(karkas.map((b) => b.code.split('.')[1]).sort()).toEqual(['arm', 'arm', 'basis', 'housse', 'rug']);
    expect(karkas.filter((b) => b.vorm === 'profiel')).toHaveLength(2);
    const v = zachteVorm(karkas, { buren: s.blokken.filter((b) => b.soort === 'kussen') });
    expect(v.driehoeken).toBeGreaterThan(5000);
    expect(dicht(v)).toBe(0);
    const k = kader(v);
    expect(k.x0).toBeGreaterThan(-1);
    expect(k.x1).toBeLessThan(203);
    expect(k.y1).toBeLessThan(87);
    expect(v.schaduw.reduce((a, b) => Math.min(a, b), 1)).toBeGreaterThan(0.3);
  });
});

/** Hoeveel normalen van de vorm afwijken van de richting van het veld zelf (gemeten met kleine stapjes). */
function afwijkend(v: ZachteVorm, blokken: Blok[]) {
  const veld = zachtVeld(blokken, 4, 10, 0), h = 0.05;
  let mis = 0;
  for (let i = 0; i < v.driehoeken * 3; i += 3) {
    const x = v.posities[i * 3]!, y = v.posities[i * 3 + 1]!, z = v.posities[i * 3 + 2]!;
    const gx = veld(x + h, y, z) - veld(x - h, y, z), gy = veld(x, y + h, z) - veld(x, y - h, z), gz = veld(x, y, z + h) - veld(x, y, z - h);
    const l = Math.hypot(gx, gy, gz) || 1;
    if ((gx * v.normalen[i * 3]! + gy * v.normalen[i * 3 + 1]! + gz * v.normalen[i * 3 + 2]!) / l < 0.94) mis++;
  }
  return mis / v.driehoeken;
}

describe('doorlopende zetel als zachte vorm', () => {
  it('een wand die afloopt: de normalen bovenaan hellen mee (geen strepen in de schaduw)', () => {
    const pad: [number, number][] = Array.from({ length: 11 }, (_, i) => [i * 10, 0]);
    const wand = blok('r.rug', -10, 0, -10, 120, 80, 20, { vorm: 'kuipwand', pad, hoogtes: pad.map((_, i) => 80 - i * 5), dikte: 20, glad: true });
    const v = zachteVorm([wand], { minAfronding: 0 });
    expect(dicht(v)).toBe(0);
    expect(afwijkend(v, [wand])).toBeLessThan(0.002);
  });

  it('een wand met dikkere armen (`binnen`): dicht, kloppende normalen, buitenkant op haar plaats en de arm echt dikker', () => {
    // Een kwart boog (straal 40) van 10 cm dik, waarvan het laatste stuk 6 cm dikker wordt naar de binnenkant van de bocht.
    const N = 24, pad: [number, number][] = Array.from({ length: N + 1 }, (_, i) => { const a = (i / N) * (Math.PI / 2); return [40 * Math.cos(a), 40 * Math.sin(a)]; });
    const binnen = pad.map((_, i) => { const s = Math.max(0, Math.min(1, (i - 12) / 3)); return 6 * s * s * (3 - 2 * s); });
    const dun = blok('r.rug', -6, 0, -6, 52, 60, 52, { vorm: 'kuipwand', pad, hoogtes: pad.map(() => 60), dikte: 10, glad: true });
    const dik = { ...dun, binnen };
    const v = zachteVorm([dik], { minAfronding: 0 });
    expect(dicht(v)).toBe(0);
    expect(afwijkend(v, [dik])).toBeLessThan(0.004);
    const veldDun = zachtVeld([dun], 4, 10, 0), veldDik = zachtVeld([dik], 4, 10, 0);
    const op = (i: number, r: number): [number, number] => { const a = (i / N) * (Math.PI / 2); return [r * Math.cos(a), r * Math.sin(a)]; };
    // Halverwege de hoogte. Aan het dunne begin: buitenkant op straal 45, binnenkant op 35, met of zonder het gegeven.
    for (const veld of [veldDun, veldDik]) {
      expect(veld(...[op(4, 45)[0], 30, op(4, 45)[1]] as [number, number, number])).toBeCloseTo(0, 1);
      expect(veld(...[op(4, 35)[0], 30, op(4, 35)[1]] as [number, number, number])).toBeCloseTo(0, 1);
    }
    // Aan het dikke eind: de buitenkant blijft op straal 45, de binnenkant ligt 6 cm verder naar binnen (straal 29).
    expect(veldDik(op(20, 45)[0], 30, op(20, 45)[1])).toBeCloseTo(0, 1);
    expect(veldDik(op(20, 29)[0], 30, op(20, 29)[1])).toBeCloseTo(0, 1);
    expect(veldDik(op(20, 32)[0], 30, op(20, 32)[1])).toBeLessThan(-2);
    expect(veldDun(op(20, 32)[0], 30, op(20, 32)[1])).toBeGreaterThan(2);
  });

  it('Doha en Montego: onderbouw, rug en zitkussen dicht, met kloppende normalen; snel genoeg dankzij de tabellen', () => {
    for (const code of ['doha', 'montego']) {
      const s = bouw3D(zetelModellen.find((m) => m.code === code)!.ontwerp, zetelCatalogus, standaardMaterialen);
      for (const b of s.blokken.filter((x) => x.glad)) {
        const v = zachteVorm([b], { minAfronding: 0, raster: 2.5 });
        expect(dicht(v), `${code} ${b.code}`).toBe(0);
        expect(afwijkend(v, [b]), `${code} ${b.code}`).toBeLessThan(0.003);
      }
    }
  });

  it('de tabel van een lange omtrek geeft hetzelfde veld als het rekenen per zijde', () => {
    const s = bouw3D(zetelModellen.find((m) => m.code === 'doha')!.ontwerp, zetelCatalogus, standaardMaterialen);
    const basis = s.blokken.find((b) => b.code.endsWith('.basis'))!, rug = s.blokken.find((b) => b.code.endsWith('.rug'))!;
    for (const b of [basis, rug]) {
      // Na 2000 punten maakt de motor de tabel; een nieuw veld rekent de eerste 2000 punten nog per zijde.
      const metTabel = zachtVeld([b], 4, 10, 0), zonder = zachtVeld([b], 4, 10, 0);
      let r = 7;
      const toeval = () => ((r = (r * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 2500; i++) metTabel(b.x + toeval() * b.b, b.y + toeval() * b.h, b.z + toeval() * b.d);
      let grootst = 0, aanOppervlak = 0;
      for (let i = 0; i < 1500; i++) {
        const x = b.x - 5 + toeval() * (b.b + 10), y = b.y + toeval() * b.h, z = b.z - 5 + toeval() * (b.d + 10);
        const echt = zonder(x, y, z), fout = Math.abs(metTabel(x, y, z) - echt);
        grootst = Math.max(grootst, fout);
        if (Math.abs(echt) < 3) aanOppervlak = Math.max(aanOppervlak, fout);
      }
      expect(grootst, b.code).toBeLessThan(0.06);
      expect(aanOppervlak, b.code).toBeLessThan(0.02);
    }
  });
});

describe('gebogen wand die oploopt (Pebble, 5/11)', () => {
  it('op de knikpunten van het pad springt de richting niet (vroeger lichte vlekjes om de 2 cm)', () => {
    const s = bouw3D(structuredClone(zetelModellen.find((m) => m.code === 'pebble')!.ontwerp), zetelCatalogus, standaardMaterialen);
    const rug = s.blokken.find((b) => b.code === 'e1.rug')!;
    const v = zachteVorm([rug], { minAfronding: 0 });
    expect(dicht(v)).toBe(0);
    // Driehoeken waarvan de richtingen in de hoekpunten meer dan 20° uiteenlopen: zonder de helling op de knikpunten 4,9 %.
    const c = Math.cos((20 * Math.PI) / 180);
    let mis = 0;
    for (let t = 0; t < v.driehoeken; t++) {
      const n = (k: number) => [0, 1, 2].map((a) => v.normalen[(t * 3 + k) * 3 + a]!);
      const [a, b, d] = [n(0), n(1), n(2)];
      const dot = (p: number[], q: number[]) => p[0]! * q[0]! + p[1]! * q[1]! + p[2]! * q[2]!;
      if (Math.min(dot(a, b), dot(b, d), dot(a, d)) < c) mis++;
    }
    expect(mis / v.driehoeken).toBeLessThan(0.04);
  });

  it('klopt op een steile rand: de afstand is een echte afstand en de richting volgt het veld (13/11)', () => {
    // Pebble (schaal van 24 cm, rand tot 1,57 cm per cm) en Ross (wand als zachte vorm). Vóór 13/11 was de afstand op het
    // steile deel bij 61 % en 74 % van de punten meer dan 10 % fout, en week de richting tot ±100° af: bobbelige naad.
    for (const code of ['pebble', 'ross']) {
      const s = bouw3D(structuredClone(zetelModellen.find((m) => m.code === code)!.ontwerp), zetelCatalogus, standaardMaterialen);
      const rug = { ...s.blokken.find((b) => b.vorm === 'kuipwand')!, glad: true };
      const pad = rug.pad!, hoog = rug.hoogtes!, w = rug.dikte! / 2;
      const steilst = Math.max(...pad.slice(1).map((q, i) => Math.abs(hoog[i + 1]! - hoog[i]!) / Math.hypot(q[0] - pad[i]![0], q[1] - pad[i]![1])));
      expect(steilst).toBeGreaterThan(1);
      const v = zachteVorm([rug], { minAfronding: 0 }), veld = zachtVeld([rug], 4, 10, 0), h = 0.05;
      let punten = 0, geenAfstand = 0, scheef = 0;
      for (let i = 0; i < v.driehoeken * 3; i += 7) {
        const x = v.posities[i * 3]!, y = v.posities[i * 3 + 1]!, z = v.posities[i * 3 + 2]!;
        if (y < Math.min(...hoog) - w) continue; // de bovenste ronding en wat eronder ligt
        const gx = (veld(x + h, y, z) - veld(x - h, y, z)) / (2 * h), gy = (veld(x, y + h, z) - veld(x, y - h, z)) / (2 * h), gz = (veld(x, y, z + h) - veld(x, y, z - h)) / (2 * h);
        const l = Math.hypot(gx, gy, gz);
        punten++;
        if (Math.abs(l - 1) > 0.1) geenAfstand++;
        if ((gx * v.normalen[i * 3]! + gy * v.normalen[i * 3 + 1]! + gz * v.normalen[i * 3 + 2]!) / (l || 1) < Math.cos((10 * Math.PI) / 180)) scheef++;
      }
      expect(punten).toBeGreaterThan(300);
      expect(geenAfstand / punten).toBeLessThan(0.01);
      expect(scheef / punten).toBeLessThan(0.01);
    }
  });

  it('de bovenrand blijft op de opgegeven hoogtes, ook waar hij steil zakt', () => {
    const s = bouw3D(structuredClone(zetelModellen.find((m) => m.code === 'pebble')!.ontwerp), zetelCatalogus, standaardMaterialen);
    const rug = s.blokken.find((b) => b.code === 'e1.rug')!;
    const veld = zachtVeld([rug], 4, 10, 0);
    rug.pad!.forEach(([x, z], i) => {
      // Recht boven de middenlijn ligt het oppervlak op de hoogte van dat punt: dat lezen ook het boven- en vooraanzicht.
      expect(Math.abs(veld(x, rug.hoogtes![i]!, z))).toBeLessThan(0.02);
      expect(veld(x, rug.hoogtes![i]! + 1, z)).toBeGreaterThan(0);
      expect(veld(x, rug.hoogtes![i]! - 1, z)).toBeLessThan(0);
    });
  });
});
