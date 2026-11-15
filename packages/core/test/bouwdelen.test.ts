import { describe, expect, it } from 'vitest';
import {
  bouwdeelBlokken, dakvlak, ligger, meetstaat, paal, plaatsBlokken, plaatsBouwdeel, spant, vloervlak, wandvlak,
  type Blok, type Bouwdeel, type MeetstaatRegel, type WandOpening,
} from '../src/index.js';
import { bouwMaterialen as M, opbouwen as O } from '../voorbeelden/opbouwen.js';

const raam: WandOpening = { soort: 'raam', x: 110, breedte: 120, hoogte: 130, borstwering: 90 };
const deur: WandOpening = { soort: 'deur', x: 60, breedte: 95, hoogte: 215 };
const wand = (openingen: WandOpening[] = [], lengte = 400, opbouw = O.hsb_hout!) => wandvlak({ lengte, hoogte: 260, opbouw, openingen }, M);
const stukken = (d: Bouwdeel, rol: string) => d.stukken.filter((s) => s.rol === rol);
const skelet = (blokken: Blok[]) => blokken.filter((b) => b.code.startsWith('skelet.'));

/** Het omsluitende kader van blokken; bij een prisma tellen ook de punten van de doorsnede mee. */
function omvang(blokken: Blok[]) {
  const x: number[] = [], y: number[] = [], z: number[] = [];
  for (const b of blokken) {
    x.push(b.x, b.x + b.b); y.push(b.y, b.y + b.h); z.push(b.z, b.z + b.d);
    for (const [p, h] of b.doorsnede ?? []) { (b.as === 'z' ? x : z).push(p); y.push(h); }
  }
  return { x0: Math.min(...x), x1: Math.max(...x), y0: Math.min(...y), y1: Math.max(...y), z0: Math.min(...z), z1: Math.max(...z) };
}
/** Paren rechte blokken die in elkaar steken (meer dan een honderdste cm in elke richting). */
function overlappingen(blokken: Blok[]): string[] {
  const uit: string[] = [], t = 0.01;
  const recht = blokken.filter((b) => b.vorm === 'blok');
  recht.forEach((a, i) => recht.slice(i + 1).forEach((b) => {
    if (a.x + a.b > b.x + t && b.x + b.b > a.x + t && a.y + a.h > b.y + t && b.y + b.h > a.y + t && a.z + a.d > b.z + t && b.z + b.d > a.z + t) uit.push(`${a.code} × ${b.code}`);
  }));
  return uit;
}
/**
 * Het hout zoals de 3D het tekent, geteld uit de blokken zelf (niet uit de lijst stukken): per doorsnede het aantal
 * blokken en hun totale lengte in m. De langste maat van een recht blok is zijn lengte, de twee andere zijn doorsnede.
 */
function houtUitBlokken(blokken: Blok[]): Record<string, { aantal: number; lengte: number }> {
  const uit: Record<string, { aantal: number; lengte: number }> = {};
  for (const b of skelet(blokken)) {
    const [k, g, lang] = [b.b, b.h, b.d].sort((p, q) => p - q) as [number, number, number];
    const r = (uit[`${Math.round(k * 10)} × ${Math.round(g * 10)}`] ??= { aantal: 0, lengte: 0 });
    r.aantal++;
    r.lengte += lang / 100;
  }
  return uit;
}
const regel = (m: MeetstaatRegel[], groep: string, materiaal: string, sleutel?: string | number) =>
  m.find((r) => r.groep === groep && r.materiaal === materiaal && (sleutel === undefined || r.doorsnede === sleutel || r.dikte === sleutel));

/** Elk bouwdeel met elke opbouw uit de catalogus, voor de tests die voor alles moeten gelden. */
function alleDelen(): [string, Bouwdeel][] {
  const uit: [string, Bouwdeel][] = [];
  for (const [code, o] of Object.entries(O)) {
    if (o.soort === 'wand') {
      uit.push([`${code} dicht`, wandvlak({ lengte: 400, hoogte: 260, opbouw: o }, M)]);
      uit.push([`${code} raam en deur`, wandvlak({ lengte: 430, hoogte: 260, opbouw: o, openingen: [deur, { ...raam, x: 250 }] }, M)]);
    } else if (o.soort === 'vloer') {
      uit.push([`${code} over z`, vloervlak({ lengte: 400, breedte: 300, opbouw: o }, M)]);
      uit.push([`${code} over x`, vloervlak({ lengte: 400, breedte: 300, opbouw: o, richting: 'x' }, M)]);
    } else {
      uit.push([`${code} plat`, dakvlak({ lengte: 400, diepte: 300, opbouw: o }, M)]);
      uit.push([`${code} hellend`, dakvlak({ lengte: 400, diepte: 300, helling: 40, opbouw: o }, M)]);
    }
  }
  uit.push(['spant', spant({ overspanning: 600, helling: 40, doorsnede: { breedte: 70, hoogte: 220 }, materiaal: 'vuren' }, M)]);
  uit.push(['paal', paal({ hoogte: 240, doorsnede: { breedte: 140, hoogte: 140 }, materiaal: 'vuren' }, M)]);
  uit.push(['ligger', ligger({ lengte: 400, doorsnede: { breedte: 70, hoogte: 220 }, materiaal: 'vuren' }, M)]);
  return uit;
}

describe('wandvlak: het skelet', () => {
  it('zet een stijl aan elk einde en daartussen op het raster, met onder- en bovenregel', () => {
    // 4 m, stijlen van 38 mm om de 600 mm: harten op 60, 120 … 360 cm (zes stuks) en één tegen elk einde.
    const w = wand();
    expect(stukken(w, 'stijl')).toHaveLength(8);
    expect(stukken(w, 'stijl').map((s) => s.blok.x)).toEqual([0, 396.2, 58.1, 118.1, 178.1, 238.1, 298.1, 358.1]);
    expect(stukken(w, 'onderregel')).toHaveLength(1);
    expect(stukken(w, 'bovenregel')).toHaveLength(1);
    expect(w.stukken).toHaveLength(10);
    // Elke stijl staat tussen de regels: 260 − 2 × 3,8 cm.
    for (const s of stukken(w, 'stijl')) expect([s.blok.y, s.blok.h, s.lengte]).toEqual([3.8, 252.4, 252.4]);
    expect(w.meldingen).toEqual([]);
  });

  it('volgt de hart-op-hartafstand en de lengte', () => {
    const om40: typeof O.hsb_hout = { ...O.hsb_hout!, lagen: O.hsb_hout!.lagen.map((l) => (l.rol === 'skelet' ? { ...l, hout: { ...l.hout!, hoh: 400 } } : l)) };
    // Om de 40 cm: harten op 40 … 360 (negen stuks) en twee einden.
    expect(stukken(wand([], 400, om40), 'stijl')).toHaveLength(11);
    // 4,30 m is geen veelvoud van 60: harten op 60 … 420 (zeven stuks) en twee einden; de laatste rasterstijl staat vrij.
    const w = wand([], 430);
    expect(stukken(w, 'stijl')).toHaveLength(9);
    expect(overlappingen(skelet(bouwdeelBlokken(w, 'constructie')))).toEqual([]);
    // 4,80 m: de stijl op 480 valt samen met het einde en komt er dus niet dubbel.
    expect(stukken(wand([], 480), 'stijl')).toHaveLength(9);
  });

  it('een opening verplaatst stijlen en voegt een latei, draagstijlen en een raamregel toe', () => {
    const dicht = wand(), open = wand([raam]);
    // Zonder opening staan er rasterstijlen op 120 en 180 cm, midden in waar het raam komt (110 tot 230 cm).
    const inRaam = (d: Bouwdeel) => stukken(d, 'stijl').filter((s) => s.blok.x + s.blok.b > 110 && s.blok.x < 230);
    expect(inRaam(dicht)).toHaveLength(2);
    expect(inRaam(open)).toHaveLength(0);
    // Naast het raam: een doorlopende stijl en een draagstijl aan elke kant.
    expect(stukken(open, 'stijl').map((s) => s.blok.x)).toEqual([0, 396.2, 102.4, 233.8, 58.1, 298.1, 358.1]);
    expect(stukken(open, 'draagstijl').map((s) => [s.blok.x, s.blok.y, s.blok.h])).toEqual([[106.2, 3.8, 216.2], [230, 3.8, 216.2]]);
    // De rasterstijl op 240 cm zou een halve cm naast de stijl van het raam staan: die neemt zijn plaats in.
    expect(stukken(dicht, 'stijl').some((s) => s.blok.x === 238.1)).toBe(true);
    expect(stukken(open, 'stijl').some((s) => s.blok.x === 238.1)).toBe(false);
    // De latei ligt op de draagstijlen, boven het raam (90 + 130 = 220 cm), en is 19 cm hoog.
    const latei = stukken(open, 'latei');
    expect(latei).toHaveLength(1);
    expect([latei[0]!.blok.x, latei[0]!.blok.y, latei[0]!.blok.b, latei[0]!.blok.h]).toEqual([106.2, 220, 127.6, 19]);
    expect(latei[0]!.doorsnede).toEqual({ vorm: 'rechthoek', breedte: 140, hoogte: 190 });
    expect(stukken(dicht, 'latei')).toHaveLength(0);
    // De regel onder het raam, tussen de draagstijlen.
    const regels = stukken(open, 'raamregel');
    expect(regels.map((s) => [s.blok.x, s.blok.y, s.blok.b, s.blok.h])).toEqual([[110, 86.2, 120, 3.8]]);
    // Korte stijlen op het raster (120 en 180 cm): boven de latei en onder het raam.
    expect(stukken(open, 'korte_stijl').map((s) => [s.blok.x, s.blok.y, s.blok.h])).toEqual([[118.1, 239, 17.2], [118.1, 3.8, 82.4], [178.1, 239, 17.2], [178.1, 3.8, 82.4]]);
  });

  it('een deur onderbreekt de onderregel en krijgt geen regel eronder', () => {
    const w = wand([deur]);
    expect(stukken(w, 'onderregel').map((s) => [s.blok.x, s.blok.b])).toEqual([[0, 60], [155, 245]]);
    expect(stukken(w, 'raamregel')).toHaveLength(0);
    expect(stukken(w, 'latei').map((s) => [s.blok.x, s.blok.y, s.blok.b])).toEqual([[56.2, 215, 102.6]]);
    expect(stukken(w, 'draagstijl').map((s) => s.blok.h)).toEqual([211.2, 211.2]);
  });

  it('geen twee stukken steken in elkaar, ook niet in lastige gevallen', () => {
    const gevallen: [string, Bouwdeel][] = [
      ['raam', wand([raam])],
      ['rasterstijl vlak naast de stijl van een opening', wand([{ ...raam, x: 124 }])],
      ['opening tegen het begin', wand([{ ...raam, x: 0 }])],
      ['opening tegen het einde', wand([{ ...raam, x: 280 }])],
      ['twee openingen dicht bij elkaar', wand([deur, { ...raam, x: 160 }])],
      ['twee openingen tegen elkaar', wand([deur, { ...raam, x: 155 }])],
      ['lengte geen veelvoud van hart-op-hart', wand([deur, { ...raam, x: 250 }], 433)],
      ['raam tot tegen de bovenregel', wand([{ ...raam, hoogte: 200 }])],
      ['raam tot op de vloer', wand([{ ...raam, borstwering: 0, hoogte: 200 }])],
      ['smalle wand', wand([], 30)],
    ];
    for (const [naam, w] of gevallen) {
      expect(overlappingen(w.stukken.map((s) => s.blok)), naam).toEqual([]);
      // Een stuk dat samenvalt met een ander zou dubbel in de meetstaat staan.
      expect(new Set(w.stukken.map((s) => `${s.blok.x}/${s.blok.y}/${s.blok.b}/${s.blok.h}`)).size, naam).toBe(w.stukken.length);
      expect(new Set(w.stukken.map((s) => s.code)).size, naam).toBe(w.stukken.length);
    }
  });

  it('kort een opening in die te dicht bij een rand ligt, en zegt dat', () => {
    // Tegen het begin: er is 2 × 3,8 cm nodig voor de eindstijl en de draagstijl.
    const begin = wand([{ ...raam, x: 0 }]);
    expect(begin.vlak!.openingen).toEqual([{ u0: 7.6, u1: 120, v0: 90, v1: 220 }]);
    expect(begin.meldingen).toEqual(['Opening 1 (raam) is ingekort tot 112.4 × 130 cm: naast, onder en boven de opening is plaats nodig voor stijlen, regels en een latei.']);
    // De eindstijl is tegelijk de stijl naast de opening: er staat er maar één.
    expect(stukken(begin, 'stijl').filter((s) => s.blok.x < 5)).toHaveLength(1);
    // Te hoog: boven het raam moeten de latei (19 cm) en de bovenregel (3,8 cm) passen.
    expect(wand([{ ...raam, hoogte: 200 }]).vlak!.openingen[0]!.v1).toBe(237.2);
    // Tot op de vloer: onder een raam blijven de onderregel en de raamregel.
    expect(wand([{ ...raam, borstwering: 0 }]).vlak!.openingen[0]!.v0).toBe(7.6);
    // Een opening die niet past, valt weg.
    const weg = wand([{ ...raam, x: 395 }]);
    expect(weg.vlak!.openingen).toEqual([]);
    expect(weg.meldingen).toEqual(['Opening 1 (raam) past niet in de wand en is weggelaten: er blijft te weinig plaats over naast, onder of boven de opening.']);
    expect(stukken(weg, 'latei')).toHaveLength(0);
  });

  it('een wand zonder skelet heeft alleen lagen; een opening mag er tot tegen de rand', () => {
    const w = wand([{ ...raam, x: 0 }], 400, O.spouwmuur!);
    expect(w.stukken).toEqual([]);
    expect(w.vlak!.openingen).toEqual([{ u0: 0, u1: 120, v0: 90, v1: 220 }]);
    expect(w.meldingen).toEqual([]);
  });
});

describe('vloervlak, dakvlak en losse stukken', () => {
  it('vloer: een balk tegen elke rand en daartussen op het raster, met een randbalk over de koppen', () => {
    // 4 × 3 m, balken van 70 mm om de 400 mm over de korte kant (langs z): harten op 40 … 360 cm (negen) en twee randen.
    const v = vloervlak({ lengte: 400, breedte: 300, opbouw: O.verdiepingsvloer_hout! }, M);
    expect(v.vlak!.richting).toBe('z');
    expect(stukken(v, 'balk')).toHaveLength(11);
    expect(stukken(v, 'randbalk').map((s) => [s.blok.x, s.blok.z, s.blok.b, s.blok.d, s.lengte])).toEqual([[0, 0, 400, 7, 400], [0, 293, 400, 7, 400]]);
    // De balken liggen tussen de randbalken (300 − 2 × 7 cm), in de laag van de roostering (boven plafond en latten).
    for (const s of stukken(v, 'balk')) expect([s.blok.z, s.blok.d, s.blok.y, s.blok.h, s.lengte]).toEqual([7, 286, 3.45, 22, 286]);
    expect(v.maten).toEqual({ b: 400, h: 28.75, d: 300 });
    // Andere richting: de balken lopen langs x, op het raster over de 3 m (harten op 40 … 280, zeven, en twee randen).
    const x = vloervlak({ lengte: 400, breedte: 300, opbouw: O.verdiepingsvloer_hout!, richting: 'x' }, M);
    expect(stukken(x, 'balk')).toHaveLength(9);
    for (const s of stukken(x, 'balk')) expect([s.blok.x, s.blok.b, s.lengte]).toEqual([7, 386, 386]);
    expect(stukken(x, 'randbalk').map((s) => s.lengte)).toEqual([300, 300]);
  });

  it('vloer op volle grond: geen skelet, alleen lagen', () => {
    const v = vloervlak({ lengte: 400, breedte: 300, opbouw: O.vloer_volle_grond! }, M);
    expect(v.stukken).toEqual([]);
    expect(v.maten).toEqual({ b: 400, h: 33.02, d: 300 });
    expect(v.lagen[v.dragend]!.naam).toBe('Betonplaat');
  });

  it('plat dak: een roostering zoals een vloer', () => {
    const d = dakvlak({ lengte: 400, diepte: 300, opbouw: O.plat_dak_warm! }, M);
    expect(d.vlak!.ligging).toBe('liggend');
    expect([stukken(d, 'balk').length, stukken(d, 'randbalk').length, stukken(d, 'keper').length]).toEqual([11, 2, 0]);
    // 12,5 + 22 + 220 + 18 + 0,4 + 140 + 1,2 = 414,1 mm.
    expect(d.maten).toEqual({ b: 400, h: 41.41, d: 300 });
  });

  it('hellend dak: kepers langs de helling, als prisma', () => {
    // 4 m langs de dakvoet, kepers van 50 mm om de 450 mm: harten op 45 … 360 cm (acht) en twee randen.
    const d = dakvlak({ lengte: 400, diepte: 300, helling: 40, opbouw: O.hellend_dak_pannen! }, M);
    const cos = Math.cos((40 * Math.PI) / 180), tan = Math.tan((40 * Math.PI) / 180);
    expect(d.vlak!.ligging).toBe('hellend');
    expect(stukken(d, 'keper')).toHaveLength(10);
    // De lengte van een keper is de horizontale maat gedeeld door de cosinus van de helling: 300 / cos 40° = 391,62 cm.
    for (const s of stukken(d, 'keper')) {
      expect(s.lengte).toBeCloseTo(300 / cos, 2);
      expect([s.blok.vorm, s.blok.as, s.blok.b, s.blok.z, s.blok.d]).toEqual(['prisma', 'x', 5, 0, 300]);
    }
    // De keper ligt boven gipsplaat, latten en dampscherm (3,47 cm), loodrecht op het dakvlak gemeten.
    const eerste = stukken(d, 'keper')[0]!.blok;
    expect(eerste.doorsnede![0]![1]).toBeCloseTo(3.47 / cos, 1);
    expect(eerste.doorsnede![1]![1]).toBeCloseTo(300 * tan + 3.47 / cos, 1);
    // Hoogte van het geheel: de stijging over 3 m plus de dikte van de opbouw, loodrecht afgesneden.
    expect(d.maten.h).toBeCloseTo(300 * tan + 30.54 / cos, 1);
    expect([d.maten.b, d.maten.d]).toEqual([400, 300]);
  });

  it('spant: een trekbalk en twee spantbenen tot in de nok', () => {
    const s = spant({ overspanning: 600, helling: 40, doorsnede: { breedte: 70, hoogte: 220 }, materiaal: 'vuren' }, M);
    const cos = Math.cos((40 * Math.PI) / 180), tan = Math.tan((40 * Math.PI) / 180);
    expect(s.stukken.map((x) => x.rol)).toEqual(['trekbalk', 'spantbeen', 'spantbeen']);
    expect(s.stukken[0]!.lengte).toBe(600);
    expect(s.stukken[1]!.lengte).toBeCloseTo(300 / cos, 2);
    // Hoogte: trekbalk (22) + stijging tot de nok (300 × tan 40°) + het been loodrecht doorgesneden (22 / cos 40°).
    expect(s.maten.h).toBeCloseTo(22 + 300 * tan + 22 / cos, 1);
    expect([s.maten.b, s.maten.d]).toEqual([600, 7]);
    // De twee benen raken elkaar in de nok, in het midden.
    const [links, rechts] = [s.stukken[1]!.blok, s.stukken[2]!.blok];
    expect([links.x, links.b, rechts.x, rechts.b]).toEqual([0, 300, 300, 300]);
    expect(links.as).toBe('z');
  });

  it('paal en ligger: één stuk, met de doorsnede in mm en de lengte in cm', () => {
    const p = paal({ hoogte: 240, doorsnede: { breedte: 140, hoogte: 120 }, materiaal: 'vuren' }, M);
    expect(p.maten).toEqual({ b: 14, h: 240, d: 12 });
    expect(p.stukken.map((s) => [s.rol, s.lengte])).toEqual([['paal', 240]]);
    const l = ligger({ lengte: 400, doorsnede: { breedte: 70, hoogte: 220 }, materiaal: 'vuren' }, M);
    expect(l.maten).toEqual({ b: 400, h: 22, d: 7 });
    expect(l.stukken.map((s) => [s.rol, s.lengte])).toEqual([['ligger', 400]]);
    // Een materiaal dat niet bestaat: het stuk wordt wel getekend, met een melding.
    expect(paal({ hoogte: 240, doorsnede: { breedte: 140, hoogte: 140 }, materiaal: 'eik' }, M).meldingen).toHaveLength(1);
  });
});

describe('bouwdelen: de twee weergaven', () => {
  it('niets steekt buiten het kader, en afgewerkt en constructie hebben dezelfde buitenmaten', () => {
    for (const [naam, deel] of alleDelen()) {
      for (const weergave of ['afgewerkt', 'constructie'] as const) {
        const o = omvang(bouwdeelBlokken(deel, weergave));
        const wat = `${naam}, ${weergave}`;
        // Precies het kader: van 0 tot de buitenmaten in elke richting (op een tiende millimeter na).
        expect(o.x0, wat).toBeCloseTo(0, 1);
        expect(o.y0, wat).toBeCloseTo(0, 1);
        expect(o.z0, wat).toBeCloseTo(0, 1);
        expect(o.x1, wat).toBeCloseTo(deel.maten.b, 1);
        expect(o.y1, wat).toBeCloseTo(deel.maten.h, 1);
        expect(o.z1, wat).toBeCloseTo(deel.maten.d, 1);
      }
    }
  });

  it('afgewerkt: alleen de binnenste en de buitenste laag, met een kern ertussen', () => {
    const w = wand([raam]);
    const b = bouwdeelBlokken(w, 'afgewerkt');
    expect([...new Set(b.map((x) => x.code.replace(/\.\d+$/, '')))]).toEqual(['afwerking.0', 'kern', 'afwerking.7']);
    expect(skelet(b)).toEqual([]);
    // Buiten (z = 0) de gevelplanken op hun echte dikte, binnen (z = dikte) de gipsplaat.
    const buiten = b.filter((x) => x.code.startsWith('afwerking.7')), binnen = b.filter((x) => x.code.startsWith('afwerking.0'));
    expect(new Set(buiten.map((x) => `${x.soort} ${x.z} ${x.d}`))).toEqual(new Set(['planken 0 2.1']));
    expect(new Set(binnen.map((x) => `${x.soort} ${x.z} ${x.d}`))).toEqual(new Set(['gevel 24.97 1.25']));
    // Geen blok bedekt het raam (110 tot 230 cm breed, 90 tot 220 cm hoog).
    for (const x of b) expect(x.x + x.b <= 110.01 || x.x >= 229.99 || x.y + x.h <= 90.01 || x.y >= 219.99, x.code).toBe(true);
  });

  it('constructie: het hele skelet, en de lagen als staal aan het einde', () => {
    const w = wand([raam]);
    const b = bouwdeelBlokken(w, 'constructie');
    // Elk stuk van het skelet is één blok, met zijn eigen code.
    expect(skelet(b).map((x) => x.code)).toEqual(w.stukken.map((s) => s.code));
    // Van elke laag die geen luchtspouw is, staat er iets in het staal; latten als losse latten, de vulling apart.
    const soorten = new Set(b.filter((x) => !x.code.startsWith('skelet.')).map((x) => x.code.replace(/\.\d+$/, '')));
    expect(soorten).toEqual(new Set(['vulling.3', 'laag.4', 'laag.5', 'lat.6', 'laag.7', 'laag.2', 'lat.1', 'laag.0']));
    // Elke laag begint een trede later dan de vorige, van het skelet naar buiten; de buitenste is het kortst.
    const begin = (code: string) => Math.min(...b.filter((x) => x.code.startsWith(code)).map((x) => x.x));
    const reeks = [begin('vulling.3'), begin('laag.4'), begin('laag.5'), begin('lat.6'), begin('laag.7')];
    expect(reeks).toEqual([...reeks].sort((p, q) => p - q));
    expect(new Set(reeks).size).toBe(5);
    expect(reeks[0]).toBeGreaterThanOrEqual(400 * 0.5);
    // Alles van het staal loopt door tot het einde van de wand (op de rand van de vulling na).
    for (const code of ['laag.4', 'laag.5', 'laag.7', 'laag.2', 'laag.0']) expect(Math.max(...b.filter((x) => x.code.startsWith(code)).map((x) => x.x + x.b))).toBe(400);
    // De vulling ligt terug achter het hout en raakt geen rand: haar kanten verdwijnen in de stijlen en regels.
    for (const x of b.filter((y) => y.code.startsWith('vulling.'))) {
      expect(x.z).toBeGreaterThan(w.maten.d - w.lagen[3]!.tot);
      expect(x.z + x.d).toBeLessThan(w.maten.d - w.lagen[3]!.van);
      expect(x.x + x.b).toBeLessThan(400);
      expect(x.y).toBeGreaterThan(0);
    }
  });

  it('constructie zonder lagen: alleen het skelet; met een voorvoegsel blijven de codes uniek in een woning', () => {
    const w = wand([raam]);
    const kaal = bouwdeelBlokken(w, 'constructie', { lagen: false });
    expect(kaal).toHaveLength(w.stukken.length);
    expect(bouwdeelBlokken(w, 'constructie', { voorvoegsel: 'muur7.' }).every((x) => x.code.startsWith('muur7.'))).toBe(true);
    // Een eigen trede: het staal wordt zo breed als gevraagd.
    const smal = bouwdeelBlokken(w, 'constructie', { stap: 10 });
    expect(Math.min(...smal.filter((x) => x.code.startsWith('laag.7')).map((x) => x.x))).toBe(390);
  });

  it('zonder skelet blijft de dragende laag helemaal staan en zijn de andere lagen teruggesneden', () => {
    const w = wand([], 400, O.spouwmuur!);
    const b = bouwdeelBlokken(w, 'constructie');
    expect(b.map((x) => [x.code, x.x, x.b])).toEqual([['laag.1.1', 0, 400], ['laag.4.1', 370, 30], ['laag.2.1', 340, 60], ['laag.0.1', 370, 30]]);
    // De luchtspouw (laag 3) wordt niet getekend: tussen isolatie en gevelsteen blijft 3 cm open.
    const iso = b.find((x) => x.code === 'laag.2.1')!, steen = b.find((x) => x.code === 'laag.4.1')!;
    expect(iso.z - (steen.z + steen.d)).toBeCloseTo(3, 2);
  });

  it('een folie krijgt een zichtbare dikte ten koste van de laag ernaast; de totale dikte blijft gelijk', () => {
    const w = wand();
    const [latten, damp, sk] = [w.lagen[1]!, w.lagen[2]!, w.lagen[3]!];
    expect([damp.van, damp.tot]).toEqual([5.75, 5.77]);
    // Het dampscherm (0,2 mm) wordt 6 mm dik getekend; die ruimte komt van de leidingspouw, niet van het skelet.
    expect(damp.getekend).toEqual([5.17, 5.77]);
    expect(latten.getekend).toEqual([1.25, 5.17]);
    expect(sk.getekend).toEqual([sk.van, sk.tot]);
    expect(w.lagen[0]!.getekend[0]).toBe(0);
    expect(w.lagen[w.lagen.length - 1]!.getekend[1]).toBe(26.22);
    w.lagen.forEach((l, i) => { if (i) expect(l.getekend[0]).toBe(w.lagen[i - 1]!.getekend[1]); });
  });

  it('een bouwdeel is gewone data: het komt ongeschonden door JSON', () => {
    for (const [naam, deel] of alleDelen()) expect(JSON.parse(JSON.stringify(deel)), naam).toStrictEqual(deel);
    const w = wand([raam]);
    const terug = JSON.parse(JSON.stringify(w)) as Bouwdeel;
    expect(bouwdeelBlokken(terug, 'constructie')).toStrictEqual(bouwdeelBlokken(w, 'constructie'));
    expect(meetstaat(terug, M)).toStrictEqual(meetstaat(w, M));
  });

  it('zonder lagen of zonder maten is er niets te tekenen, met een melding in gewone taal', () => {
    const leeg = wandvlak({ lengte: 400, hoogte: 260, opbouw: { naam: 'Leeg', soort: 'wand', lagen: [] } }, M);
    expect(leeg.meldingen).toEqual(['De opbouw «Leeg» heeft geen lagen: er is niets te tekenen.']);
    expect(bouwdeelBlokken(leeg, 'afgewerkt')).toEqual([]);
    expect(bouwdeelBlokken(leeg, 'constructie')).toEqual([]);
    expect(meetstaat(leeg, M)).toEqual([]);
    for (const nul of [wandvlak({ lengte: 0, hoogte: 260, opbouw: O.hsb_hout! }, M), vloervlak({ lengte: 400, breedte: 0, opbouw: O.verdiepingsvloer_hout! }, M), dakvlak({ lengte: 0, diepte: 300, helling: 40, opbouw: O.hellend_dak_pannen! }, M)]) {
      expect(nul.meldingen).toEqual(['De maten van het bouwdeel zijn niet groter dan nul: er is niets te tekenen.']);
      expect(nul.stukken).toEqual([]);
      expect(bouwdeelBlokken(nul, 'constructie')).toEqual([]);
      expect(bouwdeelBlokken(nul, 'afgewerkt')).toEqual([]);
      expect(JSON.stringify(nul)).not.toMatch(/null|NaN/);
    }
    // Een materiaal dat niet in de lijst staat: de laag wordt grijs getekend en dat wordt gemeld.
    const vreemd = wandvlak({ lengte: 400, hoogte: 260, opbouw: { naam: 'Vreemd', soort: 'wand', lagen: [{ naam: 'Plaat', materiaal: 'triplex', dikte: 18, rol: 'plaat' }] } }, M);
    expect(vreemd.meldingen).toEqual(['Het materiaal «triplex» van de laag «Plaat» staat niet in de materialenlijst: de laag is grijs getekend.']);
    expect(bouwdeelBlokken(vreemd, 'afgewerkt')).toHaveLength(1);
  });

  it('de voorbeelden geven geen meldingen', () => {
    for (const [naam, deel] of alleDelen()) expect(deel.meldingen, naam).toEqual([]);
  });
});

describe('plaatsBouwdeel: verschuiven en draaien, ook van prisma\'s', () => {
  const dak = dakvlak({ lengte: 400, diepte: 300, helling: 40, opbouw: O.hellend_dak_pannen! }, M);
  const sp = spant({ overspanning: 600, helling: 40, doorsnede: { breedte: 70, hoogte: 220 }, materiaal: 'vuren' }, M);
  const blokken = [...bouwdeelBlokken(dak, 'constructie'), ...bouwdeelBlokken(sp, 'constructie', { voorvoegsel: 'spant.' })];
  /** Het kader van een prisma moet het kader van zijn doorsnede zijn (dwars op de as) en zijn x/z en b/d (langs de as). */
  const klopt = (b: Blok) => {
    if (b.vorm !== 'prisma') return;
    const ps = b.doorsnede!.map((q) => q[0]), ys = b.doorsnede!.map((q) => q[1]);
    const [dwars, maat] = b.as === 'z' ? [b.x, b.b] : [b.z, b.d];
    expect(Math.min(...ps), b.code).toBeCloseTo(dwars, 1);
    expect(Math.max(...ps), b.code).toBeCloseTo(dwars + maat, 1);
    expect(Math.min(...ys), b.code).toBeCloseTo(b.y, 1);
    expect(Math.max(...ys), b.code).toBeCloseTo(b.y + b.h, 1);
  };

  it('de bouwdelen zelf kloppen: het kader van elk prisma past op zijn doorsnede', () => {
    expect(blokken.filter((b) => b.vorm === 'prisma').length).toBeGreaterThan(20);
    blokken.forEach(klopt);
  });

  it('bij elke draaiing gaat de doorsnede mee met het blok', () => {
    for (const draai of [0, 90, 180, 270] as const) {
      const geplaatst = plaatsBouwdeel(blokken, { x: 1000, y: 280, z: -500, draai });
      geplaatst.forEach(klopt);
      // Het kader, de as en al de rest zijn zoals plaatsBlokken ze geeft; alleen de doorsnede is anders.
      const gewoon = plaatsBlokken(blokken, { x: 1000, y: 280, z: -500, draai });
      expect(geplaatst.map(({ doorsnede: _, ...rest }) => rest)).toEqual(gewoon.map(({ doorsnede: _, ...rest }) => rest));
      // De wisseling van as bij een kwartslag.
      const keper = geplaatst.find((b) => b.code === 'skelet.keper.1')!;
      expect(keper.as).toBe(draai === 90 || draai === 270 ? 'z' : 'x');
      expect(keper.y).toBeGreaterThan(280);
    }
  });

  it('plaatsBlokken alleen laat de doorsnede staan, ook bij een gewone verschuiving (daarom plaatsBouwdeel)', () => {
    const keper = blokken.find((b) => b.code === 'skelet.keper.1')!;
    const [fout] = plaatsBlokken([keper], { x: 0, y: 100, z: 0 });
    expect(fout!.y).toBeCloseTo(keper.y + 100, 2);
    expect(fout!.doorsnede).toEqual(keper.doorsnede);
    const [goed] = plaatsBouwdeel([keper], { x: 0, y: 100, z: 0 });
    expect(goed!.doorsnede!.map((q) => q[1])).toEqual(keper.doorsnede!.map((q) => Math.round((q[1] + 100) * 100) / 100));
  });

  it('vier kwartslagen na elkaar geven het bouwdeel terug zoals het was', () => {
    let b = blokken;
    for (let i = 0; i < 4; i++) b = plaatsBouwdeel(b, { x: 0, z: 0, draai: 90 });
    b.forEach((n, i) => {
      const o = blokken[i]!;
      expect([n.x, n.y, n.z, n.b, n.h, n.d, n.as], o.code).toEqual([o.x, o.y, o.z, o.b, o.h, o.d, o.as]);
      (n.doorsnede ?? []).forEach((q, k) => {
        expect(q[0], o.code).toBeCloseTo(o.doorsnede![k]![0], 2);
        expect(q[1], o.code).toBeCloseTo(o.doorsnede![k]![1], 2);
      });
    });
  });

  it('een halve slag zet de dakvoet aan de andere kant', () => {
    // Zo maak je een zadeldak uit twee dakvlakken: het tweede een halve slag gedraaid, tegen de nok van het eerste.
    const achter = plaatsBouwdeel(bouwdeelBlokken(dak, 'afgewerkt'), { x: 400, z: 600, draai: 180 });
    const o = omvang(achter);
    expect([o.x0, o.x1, o.z0, o.z1]).toEqual([0, 400, 300, 600]);
    // Het hoogste punt ligt nu bij z = 300 (de nok), het laagste bij z = 600 (de dakvoet).
    const pannen = achter.find((b) => b.soort === 'pannen')!;
    const hoogste = [...pannen.doorsnede!].sort((p, q) => q[1] - p[1])[0]!;
    expect(hoogste[0]).toBe(300);
  });
});

describe('meetstaat', () => {
  it('klopt met de hand nagerekend voor een dichte wand van 4 × 2,6 m', () => {
    const m = meetstaat(wand(), M);
    // Hout 38 × 140: 8 stijlen van 252,4 cm (260 − 2 × 3,8) en 2 regels van 400 cm = 2019,2 + 800 = 2819,2 cm.
    expect(regel(m, 'hout', 'vuren')).toEqual({ groep: 'hout', materiaal: 'vuren', label: 'Naaldhout (vuren), gezaagd', doorsnede: '38 × 140', aantal: 10, lengte: 28.19 });
    // Elke laag: 4 × 2,6 = 10,4 m², met haar dikte in mm.
    expect(regel(m, 'platen', 'osb')).toEqual({ groep: 'platen', materiaal: 'osb', label: 'OSB-plaat', dikte: 15, m2: 10.4 });
    expect(regel(m, 'bekleding', 'gipsplaat')).toMatchObject({ dikte: 12.5, m2: 10.4 });
    expect(regel(m, 'bekleding', 'gevelplanken')).toMatchObject({ dikte: 21, m2: 10.4 });
    expect(regel(m, 'folie', 'dampscherm')).toMatchObject({ dikte: 0.2, m2: 10.4 });
    expect(regel(m, 'folie', 'gevelfolie')).toMatchObject({ dikte: 0.5, m2: 10.4 });
    // Isolatie tussen het hout: het vlak min het aanzicht van het hout.
    // Hout: 8 × 3,8 × 252,4 + 2 × 400 × 3,8 = 7672,96 + 3040 = 10 712,96 cm² = 1,07 m²; 10,4 − 1,07 = 9,33 m².
    expect(regel(m, 'isolatie', 'minerale_wol')).toEqual({ groep: 'isolatie', materiaal: 'minerale_wol', label: 'Minerale wol', dikte: 140, m2: 9.33 });
    // Latten, liggend, 45 mm breed om de 600 mm over 2,6 m hoogte: harten op 60, 120, 180 en 240 cm en één tegen elke
    // rand = 6 latten van 4 m = 24 m, voor de leidingspouw (45 × 45) en voor de gevel (28 × 45).
    expect(regel(m, 'latten', 'vuren', '45 × 45')).toEqual({ groep: 'latten', materiaal: 'vuren', label: 'Naaldhout (vuren), gezaagd', doorsnede: '45 × 45', lengte: 24 });
    expect(regel(m, 'latten', 'vuren', '28 × 45')).toMatchObject({ lengte: 24 });
    // Niets anders, en geen prijzen.
    expect(m).toHaveLength(9);
    expect(JSON.stringify(m)).not.toMatch(/prijs|kost|euro|€/i);
  });

  it('telt evenveel stukken als de 3D tekent, met dezelfde lengte (geteld uit de blokken zelf)', () => {
    const gevallen: [string, Bouwdeel][] = [
      ['dichte wand', wand()],
      ['wand met raam', wand([raam])],
      ['wand met deur en raam', wand([deur, { ...raam, x: 250 }], 433)],
      ['binnenwand met deur', wand([deur], 400, O.binnenwand_hsb!)],
      ['verdiepingsvloer', vloervlak({ lengte: 400, breedte: 300, opbouw: O.verdiepingsvloer_hout! }, M)],
      ['vloer, balken langs x', vloervlak({ lengte: 520, breedte: 310, opbouw: O.verdiepingsvloer_hout!, richting: 'x' }, M)],
      ['plat dak', dakvlak({ lengte: 400, diepte: 300, opbouw: O.plat_dak_warm! }, M)],
    ];
    for (const [naam, deel] of gevallen) {
      const getekend = houtUitBlokken(bouwdeelBlokken(deel, 'constructie'));
      const geteld = meetstaat(deel, M).filter((r) => r.groep === 'hout');
      expect(geteld.map((r) => r.doorsnede).sort(), naam).toEqual(Object.keys(getekend).sort());
      for (const r of geteld) {
        expect(r.aantal, `${naam}, ${r.doorsnede}`).toBe(getekend[r.doorsnede!]!.aantal);
        expect(r.lengte, `${naam}, ${r.doorsnede}`).toBeCloseTo(getekend[r.doorsnede!]!.lengte, 2);
      }
      // En in totaal: zoveel regels hout als er blokken van het skelet zijn.
      expect(geteld.reduce((som, r) => som + r.aantal!, 0), naam).toBe(skelet(bouwdeelBlokken(deel, 'constructie')).length);
    }
  });

  it('wand met een raam: latei apart, minder plaat en isolatie, latten onderbroken', () => {
    const m = meetstaat(wand([raam]), M);
    // 8 doorlopende stijlen worden er 7 (zie hierboven), plus 2 draagstijlen, 4 korte stijlen, 2 regels en de raamregel.
    expect(regel(m, 'hout', 'vuren', '38 × 140')).toMatchObject({ aantal: 16, lengte: 33.18 });
    // 7 × 252,4 + 2 × 216,2 + 2 × 17,2 + 2 × 82,4 + 2 × 400 + 120 = 1766,8 + 432,4 + 34,4 + 164,8 + 800 + 120 = 3318,4 cm.
    expect(regel(m, 'hout', 'vuren', '140 × 190')).toMatchObject({ aantal: 1, lengte: 1.28 });
    // Het raam van 1,2 × 1,3 m gaat van elke laag af: 10,4 − 1,56 = 8,84 m².
    expect(regel(m, 'platen', 'osb')).toMatchObject({ m2: 8.84 });
    // De latten op 120 en 180 cm hoogte lopen door het raam en verliezen daar 1,2 m: 24 − 2 × 1,2 = 21,6 m.
    expect(regel(m, 'latten', 'vuren', '45 × 45')).toMatchObject({ lengte: 21.6 });
  });

  it('hellend dak: kepers en oppervlaktes langs de helling', () => {
    const d = dakvlak({ lengte: 400, diepte: 300, helling: 40, opbouw: O.hellend_dak_pannen! }, M);
    const m = meetstaat(d, M);
    const schuin = 300 / Math.cos((40 * Math.PI) / 180); // 391,62 cm
    // Tien kepers, elk zo lang als het dakvlak langs de helling; evenveel prisma's in de 3D.
    expect(regel(m, 'hout', 'vuren', '50 × 180')).toMatchObject({ aantal: 10 });
    expect(regel(m, 'hout', 'vuren', '50 × 180')!.lengte).toBeCloseTo((10 * schuin) / 100, 1);
    expect(skelet(bouwdeelBlokken(d, 'constructie')).filter((b) => b.vorm === 'prisma')).toHaveLength(10);
    // Pannen, onderdak, dampscherm en gipsplaat: 4 m × 3,9162 m = 15,66 m².
    expect(regel(m, 'bekleding', 'dakpannen')).toMatchObject({ dikte: 40, m2: 15.66 });
    expect(regel(m, 'folie', 'onderdak')).toMatchObject({ m2: 15.66 });
    // Tengellatten lopen mee met de kepers (tien van 3,9162 m); panlatten liggen dwars, om de 34 cm langs de helling.
    expect(regel(m, 'latten', 'vuren', '22 × 38')!.lengte).toBeCloseTo((10 * schuin) / 100, 1);
    // Harten op 34 … 374 cm (elf) en één tegen elke rand = 13 panlatten van 4 m.
    expect(regel(m, 'latten', 'vuren', '28 × 38')).toMatchObject({ lengte: 52 });
  });

  it('telt meerdere bouwdelen samen, per materiaal en doorsnede of dikte', () => {
    const a = wand(), b = wand([], 300);
    const samen = meetstaat([a, b], M);
    const hout = (m: MeetstaatRegel[]) => regel(m, 'hout', 'vuren', '38 × 140')!;
    expect(hout(samen).aantal).toBe(hout(meetstaat(a, M)).aantal! + hout(meetstaat(b, M)).aantal!);
    expect(regel(samen, 'platen', 'osb')!.m2).toBeCloseTo(10.4 + 7.8, 2);
    // De volgorde: hout, latten, platen, isolatie, folie, bekleding.
    expect([...new Set(samen.map((r) => r.groep))]).toEqual(['hout', 'latten', 'platen', 'isolatie', 'folie', 'bekleding']);
    // Losse stukken tellen ook mee: een spant is drie stukken hout.
    const s = spant({ overspanning: 600, helling: 40, doorsnede: { breedte: 70, hoogte: 220 }, materiaal: 'vuren' }, M);
    expect(meetstaat(s, M)).toEqual([{ groep: 'hout', materiaal: 'vuren', label: 'Naaldhout (vuren), gezaagd', doorsnede: '70 × 220', aantal: 3, lengte: 13.83 }]);
  });

  it('een gemetselde spouwmuur: metselwerk, isolatie en bekleding in m², zonder hout', () => {
    const m = meetstaat(wand([], 400, O.spouwmuur!), M);
    expect(m.map((r) => [r.groep, r.materiaal, r.dikte, r.m2])).toEqual([
      ['isolatie', 'isolatieplaat', 120, 10.4],
      ['bekleding', 'binnenpleister', 12, 10.4],
      ['bekleding', 'gevelsteen', 90, 10.4],
      ['metselwerk en beton', 'snelbouwsteen', 140, 10.4],
    ]);
  });
});
