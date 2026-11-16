import { describe, expect, it } from 'vitest';
import {
  blokOmvang, bouwdeelBlokken, bouwdeelOpPlaats, ligger, meetstaat, paal, plaatsBouwdeel, profielDelen, profielDraaiing, profielKader,
  STUK_ROLLEN, staalStaaf, staalStuk, stukBlokken, wandvlak, type Blok, type BouwMateriaal, type Bouwdeel, type Staalprofiel,
} from '../src/index.js';
import { bouwMaterialen as HOUT, opbouwen as O } from '../voorbeelden/opbouwen.js';
import { buis, doorsnedeOppervlakte, koker, plat, rond, STAAL_AFWERKINGEN, staalMaterialen, staalprofiel, staalprofielen, zProfiel } from '../voorbeelden/staalprofielen.js';

// Een eigen proeftabel, los van de voorbeelden: ronde maten, zodat de verwachte waarden met de hand na te rekenen zijn.
const herkomst = { bron: 'algemene kennis' as const, nagelezen: false };
const I: Staalprofiel = { naam: 'I proef', vorm: 'I', hoogte: 300, breedte: 150, dikte: 10, flens: 20, gewicht: { waarde: 40, herkomst } };
const Z: Staalprofiel = { naam: 'Z proef', vorm: 'Z', hoogte: 200, breedte: 60, dikte: 4, gewicht: { waarde: 8, herkomst } };
const L: Staalprofiel = { naam: 'L proef', vorm: 'hoek', hoogte: 50, breedte: 60, dikte: 5 };
const K: Staalprofiel = { naam: 'K proef', vorm: 'koker', hoogte: 100, breedte: 50, dikte: 4, gewicht: { waarde: 9, herkomst } };
const P: Staalprofiel = { naam: 'P proef', vorm: 'plat', hoogte: 10, breedte: 80, dikte: 10, gewicht: { waarde: 6, herkomst } };
const R: Staalprofiel = { naam: 'R proef', vorm: 'rond', hoogte: 20, breedte: 20, dikte: 10, gewicht: { waarde: 2.5, herkomst } };
const C: Staalprofiel = { naam: 'C proef', vorm: 'C', hoogte: 150, breedte: 50, dikte: 2 };
const M: Record<string, BouwMateriaal> = { staal: { label: 'Staal', soort: 'metaal', kleur: '#aab0b3' }, vuren: HOUT.vuren! };

/** Het omsluitende kader van blokken, met de echte plaats van prisma's en van gekantelde of gedraaide blokken. */
function omvang(lijst: Blok[]) {
  const o = lijst.map(blokOmvang);
  return { x0: Math.min(...o.map((q) => q.x0)), x1: Math.max(...o.map((q) => q.x1)), y0: Math.min(...o.map((q) => q.y0)), y1: Math.max(...o.map((q) => q.y1)), z0: Math.min(...o.map((q) => q.z0)), z1: Math.max(...o.map((q) => q.z1)) };
}
const tekening = (d: Bouwdeel) => bouwdeelBlokken(d, 'constructie');

describe('staal: de profielen', () => {
  it('een I-profiel is twee flenzen en een lijf dat in de flenzen grijpt, binnen het kader', () => {
    const d = profielDelen(I);
    expect(d.map((x) => x.deel)).toEqual(['onderflens', 'lijf', 'bovenflens']);
    expect(d[0]).toEqual({ deel: 'onderflens', s0: 0, s1: 150, t0: 0, t1: 20 });
    expect(d[2]).toEqual({ deel: 'bovenflens', s0: 0, s1: 150, t0: 280, t1: 300 });
    // Het lijf staat in het midden en grijpt 1 mm in elke flens.
    expect(d[1]).toEqual({ deel: 'lijf', s0: 70, s1: 80, t0: 19, t1: 281 });
    expect(profielKader(I)).toEqual({ breedte: 150, hoogte: 300 });
  });

  it('Z, C, hoek, koker, plat en rond: het aantal delen en het kader', () => {
    expect(profielDelen(Z)).toHaveLength(3);
    // Een Z is twee flenzen breed min één dikte: de bovenflens begint waar het lijf staat.
    expect(profielKader(Z)).toEqual({ breedte: 116, hoogte: 200 });
    expect(profielDelen(Z).map((x) => [x.s0, x.s1])).toEqual([[0, 60], [56, 60], [56, 116]]);
    expect(profielDelen(C)).toHaveLength(3);
    expect(profielDelen(L)).toHaveLength(2);
    for (const p of [K, P, R]) expect(profielDelen(p)).toHaveLength(1);
    expect(profielKader(R)).toEqual({ breedte: 20, hoogte: 20 });
  });

  it('een gedraaid profiel: het kader en de plaats van zijn hoek (0, 0)', () => {
    expect(profielDraaiing(Z, 0)).toEqual({ a: 11.6, b: 20, oorsprong: [0, 0] });
    // Een kwartslag: de hoogte ligt dan dwars (naar -a), de breedte rechtop.
    expect(profielDraaiing(Z, 90)).toEqual({ a: 20, b: 11.6, oorsprong: [20, 0] });
    const schuin = profielDraaiing(Z, 10), c = Math.cos(Math.PI / 18), s = Math.sin(Math.PI / 18);
    expect(schuin.a).toBeCloseTo((116 * c + 200 * s) / 10, 1);
    expect(schuin.b).toBeCloseTo((116 * s + 200 * c) / 10, 1);
    expect(schuin.oorsprong[0]).toBeCloseTo(20 * s, 1);
  });
});

describe('staal: een stuk als bouwdeel', () => {
  it('een kolom: drie blokken van een I-profiel, het lijf in het vlak (x, y), en één stuk in de meetstaat', () => {
    const k = staalStuk({ profiel: I, materiaal: 'staal', lengte: 450, as: 'y' }, M);
    expect(k.soort).toBe('staal');
    expect(k.maten).toEqual({ b: 30, h: 450, d: 15 });
    expect(k.stukken).toHaveLength(1);
    const s = k.stukken[0]!;
    expect(s).toMatchObject({ code: 'skelet.kolom.1', rol: 'kolom', materiaal: 'staal', lengte: 450, doorsnede: { vorm: 'I', breedte: 150, hoogte: 300 } });
    expect(s.doorsnede.profiel).toBe(I);
    const b = tekening(k);
    expect(b.map((x) => x.code)).toEqual(['skelet.kolom.1.onderflens', 'skelet.kolom.1.lijf', 'skelet.kolom.1.bovenflens']);
    expect(b.every((x) => x.vorm === 'blok' && x.soort === 'metaal' && x.h === 450)).toBe(true);
    // De flenzen liggen langs z, aan elke kant van x; het lijf is 1 cm dik in het midden van z.
    expect([b[0]!.x, b[0]!.b, b[0]!.z, b[0]!.d]).toEqual([0, 2, 0, 15]);
    expect([b[1]!.z, b[1]!.d]).toEqual([7, 1]);
    expect([b[2]!.x, b[2]!.b]).toEqual([28, 2]);
    expect(omvang(b)).toEqual({ x0: 0, x1: 30, y0: 0, y1: 450, z0: 0, z1: 15 });
    // Een kwartslag: de flenzen langs x.
    const om = staalStuk({ profiel: I, materiaal: 'staal', lengte: 450, as: 'y', draai: 90 }, M);
    expect(om.maten).toEqual({ b: 15, h: 450, d: 30 });
    expect(omvang(tekening(om))).toEqual({ x0: 0, x1: 15, y0: 0, y1: 450, z0: 0, z1: 30 });
  });

  it('een ligger langs x en langs z, rechtop en plat; een koker en plat staal zijn één blok, rond staal een cilinder', () => {
    expect(staalStuk({ profiel: I, materiaal: 'staal', lengte: 600, as: 'x' }, M).maten).toEqual({ b: 600, h: 30, d: 15 });
    expect(staalStuk({ profiel: I, materiaal: 'staal', lengte: 600, as: 'z' }, M).maten).toEqual({ b: 15, h: 30, d: 600 });
    expect(staalStuk({ profiel: I, materiaal: 'staal', lengte: 600, as: 'x', draai: 90 }, M).maten).toEqual({ b: 600, h: 15, d: 30 });
    const k = staalStuk({ profiel: K, materiaal: 'staal', lengte: 200, as: 'x', rol: 'leuning' }, M);
    expect(tekening(k)).toEqual([{ code: 'skelet.leuning.1', soort: 'metaal', vorm: 'blok', kleur: '#aab0b3', x: 0, y: 0, z: 0, b: 200, h: 10, d: 5 }]);
    expect(k.stukken[0]!.blokken).toBeUndefined();
    expect(tekening(staalStuk({ profiel: R, materiaal: 'staal', lengte: 100, as: 'z' }, M))[0]).toMatchObject({ vorm: 'cilinder', as: 'z', b: 2, h: 2, d: 100 });
    expect(tekening(staalStuk({ profiel: R, materiaal: 'staal', lengte: 100, as: 'y' }, M))[0]).toMatchObject({ vorm: 'cilinder', b: 2, h: 100, d: 2 });
    expect(tekening(staalStuk({ profiel: R, materiaal: 'staal', lengte: 100, as: 'y' }, M))[0]!.as).toBeUndefined();
    expect(tekening(staalStuk({ profiel: L, materiaal: 'staal', lengte: 100, as: 'x' }, M))).toHaveLength(2);
  });

  it('een gording die met de helling meedraait: drie prisma\'s langs z, binnen haar kader', () => {
    const g = staalStuk({ profiel: Z, materiaal: 'staal', lengte: 600, as: 'z', draai: 10, rol: 'gording' }, M);
    const b = tekening(g), d = profielDraaiing(Z, 10);
    expect(b).toHaveLength(3);
    expect(b.every((x) => x.vorm === 'prisma' && x.as === 'z' && x.z === 0 && x.d === 600)).toBe(true);
    expect([g.maten.b, g.maten.h, g.maten.d]).toEqual([d.a, d.b, 600]);
    // Het kader is dat van het gedraaide omhullende kader: een Z vult het niet helemaal (de hoek linksboven is leeg).
    const o = omvang(b);
    expect(o.x0).toBeGreaterThan(-0.01);
    expect(o.x1).toBeLessThan(d.a + 0.01);
    expect(o.y0).toBeCloseTo(0, 1);
    expect(o.y1).toBeCloseTo(d.b, 1);
    // De onderkant van de onderflens ligt op de helling door de hoek (0, 0): elk punt ligt erboven.
    const tan = Math.tan(Math.PI / 18), [ox, oy] = d.oorsprong;
    for (const x of b) for (const [p, y] of x.doorsnede!) expect(y - oy - (p - ox) * tan).toBeGreaterThan(-0.05);
  });

  it('een spant onder een helling met uiteinden te lood: de onderkant stijgt van 0 tot de hoogte van de helling', () => {
    const tan = Math.tan(Math.PI / 18), cos = Math.cos(Math.PI / 18);
    const s = staalStuk({ profiel: I, materiaal: 'staal', lengte: 750 / cos, as: 'x', helling: 10, einden: 'lood', rol: 'spant' }, M);
    expect(s.stukken[0]!.lengte).toBeCloseTo(750 / cos, 1);
    expect(s.maten.b).toBeCloseTo(750, 1);
    expect(s.maten.h).toBeCloseTo(750 * tan + 30 / cos, 1);
    const b = tekening(s);
    expect(b.map((x) => x.vorm)).toEqual(['prisma', 'prisma', 'prisma']);
    // Prisma's dwars op het vlak van het spant: langs z, de flenzen 15 cm breed, het lijf 1 cm.
    expect(b.map((x) => [x.as, x.d])).toEqual([['z', 15], ['z', 1], ['z', 15]]);
    const onder = b[0]!.doorsnede!;
    expect(onder[0]).toEqual([0, 0]);
    expect(onder[1]![0]).toBeCloseTo(750, 1);
    expect(onder[1]![1]).toBeCloseTo(750 * tan, 1);
    // Te lood: de kopse kanten staan verticaal.
    expect(onder[3]![0]).toBeCloseTo(0, 2);
    // Haaks: de kopse kant staat haaks op de as, dus de bovenkant begint achter x = 0.
    const haaks = tekening(staalStuk({ profiel: I, materiaal: 'staal', lengte: 300, as: 'x', helling: 30 }, M));
    expect(omvang(haaks).x0).toBeCloseTo(0, 1);
    expect(haaks[2]!.doorsnede![3]![0]).toBeCloseTo(0, 1);
    expect(haaks[0]!.doorsnede![0]![0]).toBeCloseTo(30 * Math.sin(Math.PI / 6), 1);
  });

  it('een kolom met een schuine kop: de bovenkant volgt de hoek, de meetstaat telt de langste kant', () => {
    const tan = Math.tan(Math.PI / 18);
    const k = staalStuk({ profiel: I, materiaal: 'staal', lengte: 450, as: 'y', kop: 10 }, M);
    expect(k.maten.h).toBeCloseTo(450 + 30 * tan, 1);
    expect(k.stukken[0]!.lengte).toBeCloseTo(450 + 30 * tan, 1);
    const b = tekening(k);
    expect(b.every((x) => x.vorm === 'prisma' && x.as === 'z')).toBe(true);
    const flens = b[0]!.doorsnede!;
    expect(flens[3]).toEqual([0, 450]);
    expect(flens[2]![1]).toBeCloseTo(450 + 2 * tan, 2);
    // Dalend: de kop zakt naar +x, de hoogte bij x = 0 blijft.
    const dalend = staalStuk({ profiel: I, materiaal: 'staal', lengte: 450, as: 'y', kop: -10 }, M);
    expect(dalend.maten.h).toBe(450);
    expect(tekening(dalend)[2]!.doorsnede![2]![1]).toBeCloseTo(450 - 30 * tan, 1);
  });

  it('een staaf tussen twee punten: een cilinder met kantel en draai, die in de kijker echt van punt tot punt loopt', () => {
    const dun: Staalprofiel = { ...R, hoogte: 0.2, breedte: 0.2 };
    for (const [van, tot] of [
      [[0, 0, 0], [600, 300, 450]], [[0, 0, 0], [200, 400, 900]], [[500, 0, 0], [0, 250, 300]], [[0, 300, 0], [600, 0, 0]], [[0, 0, 400], [0, 300, 0]], [[0, 0, 0], [0, 0, 700]],
    ] as [number, number, number][][]) {
      const d = staalStaaf({ profiel: dun, materiaal: 'staal', van: van!, tot: tot! }, M);
      const b = tekening(d)[0]!, o = blokOmvang(b);
      const lengte = Math.hypot(tot![0] - van![0], tot![1] - van![1], tot![2] - van![2]);
      expect(d.stukken[0]).toMatchObject({ rol: 'windverband', lengte: Math.round(lengte * 100) / 100 });
      expect(b.vorm).toBe('cilinder');
      // Het bouwdeel ligt met zijn minimumhoek in de oorsprong; de staaf loopt van hoek tot hoek van dat kader.
      const maat = [0, 1, 2].map((i) => Math.abs(tot![i]! - van![i]!));
      for (const v of [o.x0, o.y0, o.z0]) expect(Math.abs(v)).toBeLessThan(0.05);
      expect(o.x1 - o.x0).toBeCloseTo(maat[0]!, 1);
      expect(o.y1 - o.y0).toBeCloseTo(maat[1]!, 1);
      expect(o.z1 - o.z0).toBeCloseTo(maat[2]!, 1);
      expect([d.maten.b, d.maten.h, d.maten.d].map((x, i) => x - maat[i]!).every((x) => Math.abs(x) < 0.05)).toBe(true);
    }
  });

  it('de omvang van een staaf volgt de richting: een blok met kantel en draai', () => {
    // Een plat stuk van 10 × 1 cm van (0, 0, 0) naar (300, 400, 0): de as langs x, schuin omhoog.
    const d = staalStaaf({ profiel: P, materiaal: 'staal', rol: 'schoor', van: [0, 0, 0], tot: [300, 400, 0] }, M);
    const b = tekening(d)[0]!;
    expect(b).toMatchObject({ vorm: 'blok', kantel: { graden: 53.1301, richting: 'x-' }, draai: 0, b: 500 });
    const o = blokOmvang(b);
    expect(o.x1 - o.x0).toBeCloseTo(300 + 1 * 0.8, 0);
    expect(o.y1 - o.y0).toBeCloseTo(400 + 1 * 0.6, 0);
    expect(o.z1 - o.z0).toBeCloseTo(8, 1);
  });

  it('plaatsBouwdeel draait een staaf rond haar midden mee; andere blokken blijven zoals vroeger', () => {
    const d = staalStaaf({ profiel: R, materiaal: 'staal', van: [0, 0, 0], tot: [600, 300, 450] }, M);
    const b = tekening(d), voor = blokOmvang(b[0]!);
    for (const draai of [90, 180, 270] as const) {
      const n = plaatsBouwdeel(b, { x: 1000, y: 10, z: 2000, draai })[0]!, na = blokOmvang(n);
      // Een kwartslag (van x naar z): x → -z, z → x, plus de verschuiving.
      const draaiVec = (x: number, z: number): [number, number] => (draai === 90 ? [-z, x] : draai === 180 ? [-x, -z] : [z, -x]);
      const h = [draaiVec(voor.x0, voor.z0), draaiVec(voor.x1, voor.z1)];
      expect(na.x0).toBeCloseTo(Math.min(h[0]![0], h[1]![0]) + 1000, 1);
      expect(na.z0).toBeCloseTo(Math.min(h[0]![1], h[1]![1]) + 2000, 1);
      expect(na.y0).toBeCloseTo(voor.y0 + 10, 1);
      expect([n.b, n.h, n.d, n.kantel]).toEqual([b[0]!.b, b[0]!.h, b[0]!.d, b[0]!.kantel]);
    }
    // Vier kwartslagen na elkaar: dezelfde staaf.
    let rond4 = b;
    for (let i = 0; i < 4; i++) rond4 = plaatsBouwdeel(rond4, { x: 0, z: 0, draai: 90 });
    expect(blokOmvang(rond4[0]!).x0).toBeCloseTo(voor.x0, 1);
    expect(blokOmvang(rond4[0]!).z1).toBeCloseTo(voor.z1, 1);
  });

  it('bouwdeelOpPlaats zet de minimumhoek na de draaiing op het gevraagde punt', () => {
    const s = staalStuk({ profiel: I, materiaal: 'staal', lengte: 750, as: 'x', helling: 10, einden: 'lood' }, M);
    for (const draai of [0, 90, 180, 270] as const) {
      const o = omvang(bouwdeelOpPlaats(tekening(s), s.maten, { x: 100, y: 50, z: 200, draai }));
      expect(o.x0).toBeCloseTo(100, 1);
      expect(o.y0).toBeCloseTo(50, 1);
      expect(o.z0).toBeCloseTo(200, 1);
      const om = draai === 90 || draai === 270;
      expect(o.x1 - o.x0).toBeCloseTo(om ? s.maten.d : s.maten.b, 1);
      expect(o.z1 - o.z0).toBeCloseTo(om ? s.maten.b : s.maten.d, 1);
    }
  });
});

describe('staal: de meetstaat', () => {
  it('een eigen groep per profiel, met aantal, lengte en gewicht (lengte × gewicht per meter)', () => {
    const delen = [
      staalStuk({ profiel: I, materiaal: 'staal', lengte: 450, as: 'y' }, M),
      staalStuk({ profiel: I, materiaal: 'staal', lengte: 450, as: 'y' }, M),
      staalStuk({ profiel: I, materiaal: 'staal', lengte: 761.6, as: 'x', helling: 10, rol: 'spant' }, M),
      staalStuk({ profiel: Z, materiaal: 'staal', lengte: 600, as: 'z', draai: 10, rol: 'gording' }, M),
      paal({ hoogte: 250, doorsnede: { breedte: 120, hoogte: 120 }, materiaal: 'vuren' }, M),
    ];
    const m = meetstaat(delen, M);
    expect(m).toEqual([
      { groep: 'hout', materiaal: 'vuren', label: HOUT.vuren!.label, doorsnede: '120 × 120', aantal: 1, lengte: 2.5 },
      { groep: 'staal', materiaal: 'staal', label: 'Staal', doorsnede: 'I proef', aantal: 3, lengte: 16.62, gewicht: 664.6, gewichtHerkomst: herkomst },
      { groep: 'staal', materiaal: 'staal', label: 'Staal', doorsnede: 'Z proef', aantal: 1, lengte: 6, gewicht: 48, gewichtHerkomst: herkomst },
    ]);
    // Per rol: kolommen en spant apart, in de volgorde van de rollen; hout krijgt ook zijn rol.
    const perRol = meetstaat(delen, M, { perRol: true });
    expect(perRol.map((r) => [r.groep, r.rol, r.doorsnede, r.aantal])).toEqual([
      ['hout', 'paal', '120 × 120', 1], ['staal', 'kolom', 'I proef', 2], ['staal', 'spant', 'I proef', 1], ['staal', 'gording', 'Z proef', 1],
    ]);
    expect(Object.keys(STUK_ROLLEN)).toContain('windverband');
  });

  it('zonder gewicht bij één stuk: geen gewicht voor dat profiel, ook niet half', () => {
    const zonder = { ...I, gewicht: undefined };
    const m = meetstaat([staalStuk({ profiel: I, materiaal: 'staal', lengte: 100, as: 'x' }, M), staalStuk({ profiel: zonder, materiaal: 'staal', lengte: 100, as: 'x' }, M)], M);
    expect(m).toHaveLength(1);
    expect(m[0]).toEqual({ groep: 'staal', materiaal: 'staal', label: 'Staal', doorsnede: 'I proef', aantal: 2, lengte: 2 });
    expect(meetstaat(staalStuk({ profiel: C, materiaal: 'staal', lengte: 100, as: 'x' }, M), M)[0]!.gewicht).toBeUndefined();
  });

  it('de meetstaat telt evenveel stukken als de 3D tekent (staven, prisma\'s en blokken)', () => {
    const delen = [
      staalStuk({ profiel: I, materiaal: 'staal', lengte: 450, as: 'y', kop: 10 }, M),
      staalStuk({ profiel: Z, materiaal: 'staal', lengte: 600, as: 'z', draai: 10 }, M),
      staalStaaf({ profiel: R, materiaal: 'staal', van: [0, 0, 0], tot: [600, 300, 450] }, M),
      staalStuk({ profiel: K, materiaal: 'staal', lengte: 100, as: 'x' }, M),
    ];
    // Elk stuk is één of meer blokken met de code van het stuk ervoor; de meetstaat telt elk stuk één keer.
    for (const d of delen) {
      expect(new Set(tekening(d).map((b) => b.code.split('.').slice(0, 3).join('.'))).size).toBe(1);
      expect(tekening(d)).toEqual(d.stukken.flatMap(stukBlokken));
    }
    expect(meetstaat(delen, M).reduce((s, r) => s + (r.aantal ?? 0), 0)).toBe(4);
  });
});

describe('bouwdelen: de wensen uit de bijgebouwen', () => {
  it('een kleinste lengte laat korte stukken weg; standaard blijft alles zoals vroeger', () => {
    const wand = (kleinste?: number) => wandvlak({ lengte: 400, hoogte: 260, opbouw: O.hsb_hout!, openingen: [{ soort: 'raam', x: 110, breedte: 120, hoogte: 150, borstwering: 70 }], ...(kleinste === undefined ? {} : { kleinste }) }, HOUT);
    const kort = (d: Bouwdeel) => d.stukken.filter((s) => s.rol === 'korte_stijl').map((s) => s.lengte);
    expect(wand()).toEqual(wand(0));
    expect(kort(wand()).some((l) => l < 25)).toBe(true);
    expect(kort(wand(25)).every((l) => l >= 25)).toBe(true);
    expect(kort(wand(25)).length).toBeLessThan(kort(wand()).length);
  });

  it('een paal en een ligger met een eigen rol; zonder rol zoals vroeger', () => {
    expect(paal({ hoogte: 100, doorsnede: { breedte: 70, hoogte: 70 }, materiaal: 'vuren', rol: 'kolom' }, M).stukken[0]).toMatchObject({ code: 'skelet.kolom.1', rol: 'kolom' });
    expect(ligger({ lengte: 300, doorsnede: { breedte: 50, hoogte: 150 }, materiaal: 'vuren', rol: 'gording' }, M).stukken[0]).toMatchObject({ code: 'skelet.gording.1', rol: 'gording' });
    expect(ligger({ lengte: 300, doorsnede: { breedte: 50, hoogte: 150 }, materiaal: 'vuren' }, M).stukken[0]!.code).toBe('skelet.ligger.1');
  });

  it('de kleur van de kern in de afgewerkte weergave; standaard het lichte grijs', () => {
    const w = wandvlak({ lengte: 300, hoogte: 260, opbouw: O.hsb_hout! }, HOUT);
    const kern = (k?: string) => bouwdeelBlokken(w, 'afgewerkt', k ? { kern: k } : {}).filter((b) => b.code.startsWith('kern.'));
    expect(kern().every((b) => b.kleur === '#cfccc4')).toBe(true);
    expect(kern('#123456').every((b) => b.kleur === '#123456')).toBe(true);
    expect(bouwdeelBlokken(w, 'afgewerkt', { kern: '#123456' }).filter((b) => !b.code.startsWith('kern.'))).toEqual(bouwdeelBlokken(w, 'afgewerkt').filter((b) => !b.code.startsWith('kern.')));
  });
});

describe('staal: de tabel met profielen (voorbeelden)', () => {
  it('elk profiel heeft een gewicht met herkomst, door niemand nagelezen', () => {
    for (const p of Object.values(staalprofielen)) {
      expect(p.gewicht?.waarde, p.naam).toBeGreaterThan(0);
      expect(p.gewicht?.herkomst.nagelezen, p.naam).toBe(false);
      expect(staalprofiel(p.naam)).toBe(p);
    }
    expect(() => staalprofiel('IPE 999')).toThrow(/staat niet in de lijst/);
  });

  it('het gewicht van een I- of H-profiel klopt met zijn maten (de afrondingen wegen 0 tot 10 % extra)', () => {
    for (const p of Object.values(staalprofielen).filter((x) => x.vorm === 'I')) {
      const berekend = (doorsnedeOppervlakte(p) * 7850) / 1e6;
      expect(p.gewicht!.waarde / berekend, p.naam).toBeGreaterThanOrEqual(1);
      expect(p.gewicht!.waarde / berekend, p.naam).toBeLessThan(1.1);
    }
  });

  it('kokers, platen, staven en koudgevormde profielen: het gewicht uit de maten', () => {
    expect(koker(100, 100, 4).gewicht!.waarde).toBeCloseTo((2 * 4 * 192 * 7850) / 1e6, 2);
    expect(plat(50, 10).gewicht!.waarde).toBeCloseTo(3.93, 2);
    expect(rond(20).gewicht!.waarde).toBeCloseTo(2.47, 2);
    expect(buis(42.4, 2).gewicht!.waarde).toBeCloseTo(1.99, 2);
    expect(zProfiel(200, 70, 2).gewicht!.waarde).toBeCloseTo((2 * (200 + 140 - 4) * 7850) / 1e6, 2);
    expect(koker(100, 100, 4).naam).toBe('koker 100 × 100 × 4');
    expect(buis(42.4, 2).naam).toBe('buis 42,4 × 2');
  });

  it('elke afwerking is een materiaal van staal met een kleur: blank metaal als metaal, poederlak als lak', () => {
    for (const a of STAAL_AFWERKINGEN) expect(staalMaterialen[`staal_${a.code}`]).toMatchObject({ soort: a.code === 'verzinkt' || a.code === 'inox' ? 'metaal' : 'lak_mat', kleur: a.kleur });
  });
});
