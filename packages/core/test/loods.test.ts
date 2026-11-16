import { describe, expect, it } from 'vitest';
import { berekenConfiguratie, blokOmvang, controleerModel, controleerOpbouw, type Blok, type ConfiguratieResultaat, type Keuzes } from '../src/index.js';
import {
  loods, loodsBekleding, loodsBeton, loodsLichtplaat, loodsMaterialen as M, loodsPrijslijst, loodsVertrekpunten as LV, loodsVloer, LOOPDEUR,
} from '../voorbeelden/loods.js';
import { GEVELKOLOM_AFSTAND, loods3D, loodsMeetstaat, loodsOpeningen, loodsSamenstelling } from '../voorbeelden/loods3d.js';
import { omvang } from '../voorbeelden/samenstelling.js';

const bereken = (k: Keuzes = {}) => berekenConfiguratie(loods, k, loodsPrijslijst);
const codes = (r: ConfiguratieResultaat) => r.meldingen.map((m) => m.code);
const fouten = (r: ConfiguratieResultaat) => r.meldingen.filter((m) => m.ernst === 'fout').map((m) => m.melding);
const delen = (r: ConfiguratieResultaat, begin: string) => loodsSamenstelling(r).delen.filter((g) => g.code.startsWith(begin));
const LANG = 120000;

/** Wat voor elke 3D van de loods moet gelden. */
function controleerScene(r: ConfiguratieResultaat, naam: string, metMeldingen = true) {
  for (const weergave of ['afgewerkt', 'constructie'] as const) {
    const s = loods3D(r, weergave);
    expect(s.blokken.length, naam).toBeGreaterThan(20);
    expect(new Set(s.blokken.map((b) => b.code)).size, `${naam}: dubbele codes`).toBe(s.blokken.length);
    for (const b of s.blokken) {
      for (const v of [b.x, b.y, b.z, b.b, b.h, b.d]) expect(Number.isFinite(v), `${naam}: ${b.code}`).toBe(true);
      expect(Math.min(b.b, b.h, b.d), `${naam}: ${b.code} heeft een maat nul`).toBeGreaterThan(0);
      expect(blokOmvang(b).y0, `${naam}: ${b.code} zit onder de grond`).toBeGreaterThanOrEqual(-0.01);
      if (b.vorm === 'prisma') {
        const p = b.doorsnede!.map((q) => q[0]), y = b.doorsnede!.map((q) => q[1]);
        const [van, maat] = b.as === 'z' ? [b.x, b.b] : [b.z, b.d];
        expect(Math.min(...p), `${naam}: ${b.code}`).toBeCloseTo(van, 1);
        expect(Math.max(...p) - Math.min(...p), `${naam}: ${b.code}`).toBeCloseTo(maat, 1);
        expect(Math.min(...y), `${naam}: ${b.code}`).toBeCloseTo(b.y, 1);
        expect(Math.max(...y) - Math.min(...y), `${naam}: ${b.code}`).toBeCloseTo(b.h, 1);
      }
    }
    const o = omvang(s.blokken), k = s.kader;
    expect(o.x0, naam).toBeGreaterThanOrEqual(k.x - 0.01);
    expect(o.x1, naam).toBeLessThanOrEqual(k.x + k.b + 0.01);
    expect(o.z0, naam).toBeGreaterThanOrEqual(k.z - 0.01);
    expect(o.z1, naam).toBeLessThanOrEqual(k.z + k.d + 0.01);
    expect(o.y1, naam).toBeLessThanOrEqual(k.h + 0.01);
    expect(JSON.parse(JSON.stringify(s)), naam).toEqual(s);
  }
  if (metMeldingen) expect(loodsSamenstelling(r).meldingen, naam).toEqual([]);
}

/** De stukken staal die de constructieweergave tekent: één geplaatst bouwdeel per stuk, herkend aan het voorvoegsel. */
function staalGetekend(r: ConfiguratieResultaat) {
  const staal = loodsSamenstelling(r).delen.filter((g) => g.deel.soort === 'staal').map((g) => g.code);
  const blokken = loods3D(r, 'constructie').blokken;
  return staal.filter((c) => blokken.some((b) => b.code.startsWith(`${c}.`)));
}

describe('loods: het model', () => {
  it('is zonder fouten, de standaardwaarden zijn geldig, en het zegt dat een staalbouwer rekent', () => {
    expect(controleerModel(loods)).toEqual([]);
    const r = bereken();
    expect(fouten(r)).toEqual([]);
    expect(r.geldig).toBe(true);
    expect(codes(r)).toContain('staalbouwer');
    expect(r.meldingen.find((m) => m.code === 'staalbouwer')!.melding).toMatch(/staalbouwer of ingenieur rekent de portalen/);
    controleerScene(r, 'standaard');
  });

  it('zonder prijzen: een lege prijslijst, een lege stuklijst en een prijs van nul', () => {
    expect(loodsPrijslijst).toEqual({});
    const r = bereken();
    expect(loods.stuklijst).toEqual([]);
    expect(r.prijs).toMatchObject({ kostprijs: 0, verkoopprijsExcl: 0, verkoopprijsIncl: 0 });
    expect(JSON.stringify(loodsMeetstaat(r))).not.toMatch(/prijs|kost|€|\beuro\b/i);
  });

  it('de opbouwen zijn geldig, gebruiken bestaande materialen en zeggen dat ze niet nagelezen zijn', () => {
    const alle = [
      ...['s40', 's60', 's80', 's100', 's120', 's150', 'plaat'].map((b) => loodsBekleding('dak', b, 'ral9002')),
      ...['s40', 's60', 's80', 'plaat'].map((b) => loodsBekleding('wand', b, 'ral6005')),
      loodsBeton, loodsLichtplaat(60), loodsVloer,
    ];
    for (const o of alle) {
      expect(controleerOpbouw(o, M).filter((p) => p.ernst === 'fout'), o.naam).toEqual([]);
      expect(o.herkomst?.nagelezen, o.naam).toBe(false);
    }
  });

  it('de vertrekpunten zijn geldig en geven elk hun eigen loods', () => {
    for (const [naam, v] of Object.entries(LV)) {
      const r = bereken(v.keuzes);
      expect(fouten(r), naam).toEqual([]);
      controleerScene(r, naam);
    }
    // De hal van 15 × 30 m: zes portalen, een zadeldak.
    const hal = bereken(LV.hal.keuzes);
    expect(hal.afgeleid).toMatchObject({ lengte: 3000, portalen: 6 });
    expect(delen(hal, 'spant')).toHaveLength(12);
    // De landbouwloods: een lessenaarsdak (één spant per portaal), betonpanelen, geprofileerde plaat.
    const land = bereken(LV.landbouw.keuzes);
    expect(delen(land, 'spant')).toHaveLength(7);
    expect(loodsMeetstaat(land).some((x) => x.materiaal === 'betonpaneel' && (x.m2 ?? 0) > 100)).toBe(true);
    expect(loodsMeetstaat(land).some((x) => x.materiaal.startsWith('plaat_wand_'))).toBe(true);
  });
});

describe('loods: uitersten en elke keuze', () => {
  it('de kleinste en de grootste maten, met elk dak en elke helling, rekenen zonder fouten', () => {
    for (const breedte of [600, 3000]) for (const afstand of [500, 800]) for (const zijhoogte of [300, 800]) {
      for (const [dakvorm, helling] of [['zadel', 'h6'], ['zadel', 'h20'], ['lessenaar', 'h6'], ['lessenaar', 'h20']] as const) {
        for (const traveeen of [2, 7]) {
          const k: Keuzes = { breedte, afstand, zijhoogte, dakvorm, helling, traveeen, poort1_hoogte: 250, poort1_breedte: 200 };
          const naam = JSON.stringify(k), r = bereken(k);
          expect(fouten(r), naam).toEqual([]);
          controleerScene(r, naam);
        }
      }
    }
  }, LANG);

  it('20 traveeën van 8 m en 30 m breed: rekent zonder fouten en blijft tekenbaar', () => {
    const r = bereken({ breedte: 3000, afstand: 800, traveeen: 20, zijhoogte: 800, daklicht: 'lichtplaten', beton: 'b300' });
    expect(fouten(r)).toEqual([]);
    controleerScene(r, 'groot');
    expect(loods3D(r, 'constructie').blokken.length).toBeLessThan(4000);
  }, LANG);

  it('elke keuze apart, bovenop de standaardwaarden', () => {
    for (const k of loods.kenmerken) {
      if (k.type === 'getal') continue;
      const waarden = k.type === 'janee' ? [true, false] : k.keuzes.map((kz) => kz.code);
      for (const w of waarden) {
        const keuzes: Keuzes = { [k.code]: w };
        // Een poort in een zijgevel moet in haar travee passen: kies er een smallere.
        if (/^poort\d_gevel$/.test(k.code) && (w === 'links' || w === 'rechts')) keuzes[k.code.replace('gevel', 'breedte')] = 350;
        if (/^poort[23]_gevel$/.test(k.code) && (w === 'voor')) keuzes.loopdeur_gevel = 'geen';
        const naam = JSON.stringify(keuzes), r = bereken(keuzes);
        expect(fouten(r), naam).toEqual([]);
        controleerScene(r, naam);
      }
    }
  }, LANG);

  it('80 willekeurige configuraties: altijd een 3D zonder fouten in de tekening, ook als het model een fout meldt', () => {
    let zaad = 7;
    const toeval = () => ((zaad = (zaad * 16807) % 2147483647) - 1) / 2147483646;
    const kies = <T,>(l: readonly T[]) => l[Math.floor(toeval() * l.length)]!;
    let geldig = 0;
    for (let i = 0; i < 80; i++) {
      const k: Keuzes = {
        breedte: 600 + 100 * Math.floor(toeval() * 25), afstand: 500 + 50 * Math.floor(toeval() * 7), traveeen: 2 + Math.floor(toeval() * 8),
        zijhoogte: 300 + 50 * Math.floor(toeval() * 11), dakvorm: kies(['zadel', 'lessenaar']), helling: `h${6 + Math.floor(toeval() * 15)}`,
        dak_bekleding: kies(['s40', 's150', 'plaat']), wand_bekleding: kies(['s40', 's80', 'plaat']), beton: kies(['b0', 'b100', 'b200']),
        daklicht: kies(['geen', 'lichtplaten', 'lichtstraat']), loopdeur_gevel: kies(['geen', 'voor', 'achter', 'links', 'rechts']), loopdeur_travee: 1 + Math.floor(toeval() * 3),
      };
      for (const n of [1, 2, 3]) {
        k[`poort${n}_gevel`] = kies(['geen', 'voor', 'achter', 'links', 'rechts']);
        k[`poort${n}_breedte`] = 200 + 25 * Math.floor(toeval() * 12);
        k[`poort${n}_hoogte`] = 225 + 25 * Math.floor(toeval() * 6);
        k[`poort${n}_travee`] = 1 + Math.floor(toeval() * 4);
        k[`poort${n}_soort`] = kies(['sectionaal', 'roldeur']);
      }
      const r = bereken(k);
      if (r.geldig) geldig++;
      // Een geldige configuratie tekent alle openingen zonder ze in te korten.
      controleerScene(r, JSON.stringify(k), r.geldig);
    }
    expect(geldig).toBeGreaterThan(12);
  }, LANG);
});

describe('loods: portalen en staal', () => {
  it('het aantal portalen volgt uit de lengte: twee kolommen en een of twee spanten per portaalas', () => {
    for (const [traveeen, afstand] of [[2, 500], [5, 600], [9, 750]] as const) {
      const r = bereken({ traveeen, afstand });
      expect(r.afgeleid).toMatchObject({ lengte: traveeen * afstand, portalen: traveeen + 1 });
      const kolommen = delen(r, 'kolom'), spanten = delen(r, 'spant');
      expect(kolommen).toHaveLength(2 * (traveeen + 1));
      expect(spanten).toHaveLength(2 * (traveeen + 1));
      // Op elke portaalas, hart op hart: de assen liggen op 0, afstand, 2 × afstand …
      const assen = [...new Set(kolommen.map((g) => Math.round(g.z + g.deel.maten.d / 2)))].sort((a, b) => a - b);
      expect(assen).toEqual(Array.from({ length: traveeen + 1 }, (_, i) => i * afstand));
    }
    expect(delen(bereken({ dakvorm: 'lessenaar' }), 'spant')).toHaveLength(6);
  });

  it('de profielen volgen de overspanning (een voorstelling), en staan in de meetstaat per rol', () => {
    expect(bereken({ breedte: 900 }).afgeleid).toMatchObject({ spant_profiel: 'IPE 240', kolom_profiel: 'HEA 200' });
    expect(bereken({ breedte: 1500 }).afgeleid).toMatchObject({ spant_profiel: 'IPE 300', kolom_profiel: 'HEA 240' });
    expect(bereken({ breedte: 3000 }).afgeleid).toMatchObject({ spant_profiel: 'IPE 500', kolom_profiel: 'HEA 320' });
    const m = loodsMeetstaat(bereken());
    const rollen = m.filter((x) => x.groep === 'staal').map((x) => x.rol);
    for (const rol of ['kolom', 'spant', 'gording', 'wandregel', 'windverband']) expect(rollen, rol).toContain(rol);
    for (const x of m.filter((y) => y.groep === 'staal')) {
      expect(x.gewicht, x.doorsnede).toBeGreaterThan(0);
      expect(x.gewichtHerkomst?.nagelezen, x.doorsnede).toBe(false);
    }
  });

  it('de meetstaat telt evenveel stukken staal als de constructieweergave tekent', () => {
    for (const k of [{}, LV.landbouw.keuzes, LV.werkplaats.keuzes, { breedte: 2400, traveeen: 3, poort2_gevel: 'rechts', poort2_breedte: 300, poort2_travee: 2 }] as Keuzes[]) {
      const r = bereken(k);
      const geteld = loodsMeetstaat(r).filter((x) => x.groep === 'staal').reduce((s, x) => s + (x.aantal ?? 0), 0);
      expect(staalGetekend(r), JSON.stringify(k)).toHaveLength(geteld);
      // In de afgewerkte weergave zit het staal achter de bekleding en wordt het niet getekend.
      const s = loodsSamenstelling(r), afgewerkt = loods3D(r, 'afgewerkt').blokken;
      for (const g of s.delen.filter((x) => x.deel.soort === 'staal')) expect(afgewerkt.some((b) => b.code.startsWith(`${g.code}.`))).toBe(false);
    }
  });

  it('gordingen per travee op elk dakvlak, nooit verder dan 1,8 m uit elkaar langs de helling', () => {
    const r = bereken({ breedte: 1500, traveeen: 4 });
    const g = delen(r, 'gording');
    const rijen = new Set(g.map((x) => Math.round(x.x)));
    expect(g.length).toBe(rijen.size * 4);
    const links = [...rijen].filter((x) => x < 750).sort((a, b) => a - b);
    const cos = Math.cos(Math.PI / 18);
    links.slice(1).forEach((x, i) => expect((x - links[i]!) / cos).toBeLessThanOrEqual(180.5));
    expect(links[0]).toBeLessThan(20);
    expect(links[links.length - 1]).toBeGreaterThan(550);
  });

  it('windverbanden in rond staal in de eindvelden van dak en zijgevels, niet in een veld met een poort', () => {
    const r = bereken({ traveeen: 5 });
    const wv = delen(r, 'windverband');
    expect(wv.length).toBeGreaterThan(8);
    for (const g of wv) expect(g.deel.stukken[0]!.doorsnede.profiel!.vorm).toBe('rond');
    const velden = new Set(wv.map((g) => Math.floor((g.z + 5) / 600)));
    expect([...velden].sort()).toEqual([0, 4]);
    // Een poort in de achterste travee van de linker zijgevel: het windverband van die gevel schuift een veld op.
    const metPoort = bereken({ traveeen: 5, poort2_gevel: 'links', poort2_travee: 5, poort2_breedte: 300 });
    const links = delen(metPoort, 'windverband').filter((g) => g.x < 20 && g.deel.maten.b < 10);
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((g) => g.z > 590)).toBe(true);
  });

  it('gevelkolommen: twee naast elke poort in een kopgevel, en hoogstens 6 m uit elkaar, nooit in een poort', () => {
    for (const k of [{}, { breedte: 3000 }, { breedte: 3000, poort2_gevel: 'voor', poort3_gevel: 'voor', loopdeur_gevel: 'geen' }, LV.werkplaats.keuzes] as Keuzes[]) {
      const r = bereken(k), B = Number(r.afgeleid.lengte) && Number(r.kenmerken.find((x) => x.code === 'breedte')!.waarde);
      const ops = loodsOpeningen(r).filter((o) => o.gevel === 'voor' && o.wat !== 'loopdeur');
      const voor = delen(r, 'gevelkolom').filter((g) => g.z > 100).map((g) => [g.x, g.x + g.deel.maten.b] as [number, number]).sort((a, b) => a[0] - b[0]);
      const kol = Number(r.afgeleid.kolom_h);
      const assen = [kol / 2, ...voor.map(([a, b]) => (a + b) / 2), B - kol / 2].sort((a, b) => a - b);
      assen.slice(1).forEach((x, i) => {
        const tussen = ops.some((o) => o.a0 > assen[i]! && o.a1 < x);
        if (!tussen) expect(x - assen[i]!, JSON.stringify(k)).toBeLessThanOrEqual(GEVELKOLOM_AFSTAND + 0.5);
      });
      for (const o of ops) {
        expect(voor.some(([, b]) => Math.abs(b - (o.a0 - 2)) < 0.5), JSON.stringify(k)).toBe(true);
        expect(voor.some(([a]) => Math.abs(a - (o.a1 + 2)) < 0.5), JSON.stringify(k)).toBe(true);
        expect(voor.every(([a, b]) => b <= o.a0 + 0.01 || a >= o.a1 - 0.01), JSON.stringify(k)).toBe(true);
      }
    }
  });
});

describe('loods: bekleding, buitenmaten en hoogte', () => {
  it('de constructie heeft dezelfde buitenmaten als de afgewerkte loods', () => {
    for (const k of [{}, LV.landbouw.keuzes, LV.werkplaats.keuzes, { dakvorm: 'lessenaar', helling: 'h20', breedte: 3000 }] as Keuzes[]) {
      const r = bereken(k);
      const a = omvang(loods3D(r, 'afgewerkt').blokken), c = omvang(loods3D(r, 'constructie').blokken);
      for (const kant of ['x0', 'x1', 'y0', 'y1', 'z0', 'z1'] as const) expect(c[kant], `${JSON.stringify(k)} ${kant}`).toBeCloseTo(a[kant], 1);
    }
  });

  it('het hoogste punt in het model is dat van de 3D (boven de vloer)', () => {
    for (const k of [{}, { dakvorm: 'lessenaar' }, { breedte: 3000, helling: 'h20', zijhoogte: 800, dak_bekleding: 's150' }, { dakvorm: 'lessenaar', breedte: 600, helling: 'h6', afstand: 800 }, LV.landbouw.keuzes] as Keuzes[]) {
      const r = bereken(k);
      expect(omvang(loods3D(r).blokken).y1 - 15, JSON.stringify(k)).toBeCloseTo(Number(r.afgeleid.tophoogte), -0.4);
    }
  });

  it('de bekleding in de meetstaat: wanden, dak met licht, beton en vloer; dezelfde vlakken als de 3D tekent', () => {
    const r = bereken({ ...LV.hal.keuzes, beton: 'b100' });
    const m = loodsMeetstaat(r);
    const wand = m.find((x) => x.materiaal === 'sandwich_wand_ral9002')!, dak = m.find((x) => x.materiaal === 'sandwich_dak_ral9002')!;
    const licht = m.find((x) => x.materiaal === 'lichtplaat')!;
    expect(wand.dikte).toBe(60);
    // De lichtstraat: twee stroken van 1,5 m langs de helling over de middelste traveeën.
    expect(licht.m2).toBeCloseTo((2 * 150 * (3000 - 1200 - 120)) / 10000, 0);
    expect(dak.m2! + licht.m2!).toBeGreaterThan(Number(r.afgeleid.vloer_m2));
    // Wand: de oppervlakte van de getekende platen (wandvlakken en topgevels) is die van de meetstaat.
    const s = loods3D(r, 'afgewerkt').blokken.filter((b) => (b.code.startsWith('wand.') || b.code.startsWith('topgevel.')) && b.soort === 'gevel');
    const vlak = (b: Blok) => (b.vorm === 'prisma' ? Math.abs(b.doorsnede!.reduce((som, [p, y], i, l) => som + p * l[(i + 1) % l.length]![1] - l[(i + 1) % l.length]![0] * y, 0)) / 2 : Math.max(b.b * b.h, b.d * b.h));
    const getekend = s.reduce((som, b) => som + vlak(b), 0) / 10000;
    expect(Math.abs(getekend - wand.m2!) / wand.m2!).toBeLessThan(0.01);
    expect(m.find((x) => x.materiaal === 'betonpaneel')!.m2).toBeGreaterThan(0);
    expect(m.find((x) => x.materiaal === 'betonvloer')!.m2).toBeGreaterThan(Number(r.afgeleid.vloer_m2));
  });

  it('een opening in een wand is in de bekleding uitgespaard, met een omkasting en een poort of deur erin', () => {
    const r = bereken({ ...LV.landbouw.keuzes });
    const ops = loodsOpeningen(r);
    expect(ops.map((o) => [o.gevel, o.wat, o.nr])).toEqual([['rechts', 'roldeur', 2], ['rechts', 'loopdeur', 0], ['voor', 'roldeur', 1]]);
    // Poort 2 in travee 2 van rechts (geteld van voor), in het midden tussen de kolommen.
    const p2 = ops.find((o) => o.nr === 2)!, A = 500, L = 3000;
    expect((p2.a0 + p2.a1) / 2).toBeCloseTo(L - 1.5 * A, 1);
    const wand = delen(r, 'wand.rechts');
    expect(wand.reduce((s, g) => s + (g.deel.vlak?.openingen.length ?? 0), 0)).toBe(2);
    const beton = delen(r, 'beton.rechts');
    expect(beton.reduce((s, g) => s + (g.deel.vlak?.openingen.length ?? 0), 0)).toBe(2);
    // Een poort loopt door de betonpanelen tot bovenaan (geen strook beton over de poort).
    for (const o of beton.flatMap((g) => g.deel.vlak!.openingen)) expect(o.v1).toBe(200);
    for (const o of beton.flatMap((g) => g.deel.vlak!.openingen)) expect(o.v0).toBe(0);
    const blokken = loods3D(r, 'afgewerkt').blokken;
    expect(blokken.filter((b) => b.code.startsWith('poort2.omkasting.'))).toHaveLength(6);
    expect(blokken.filter((b) => b.code.startsWith('poort2.')).length).toBeGreaterThan(20);
    expect(loods3D(r, 'constructie').blokken.filter((b) => b.code.startsWith('poort'))).toEqual([]);
    // In een kopgevel: de loopdeur 1 m van de hoek, links gezien van buiten.
    const hal = loodsOpeningen(bereken(LV.hal.keuzes));
    expect(hal.find((o) => o.wat === 'loopdeur')).toMatchObject({ gevel: 'voor', a0: LOOPDEUR.rand, a1: LOOPDEUR.rand + LOOPDEUR.breedte });
    const achter = loodsOpeningen(bereken({ loopdeur_gevel: 'achter', poort1_gevel: 'achter' }));
    expect(achter.find((o) => o.wat === 'loopdeur')).toMatchObject({ a0: 1500 - 200, a1: 1500 - 100 });
  });
});

describe('loods: poorten en meldingen', () => {
  it('een poort die niet tussen twee kolommen past, geeft een fout; een smallere past', () => {
    expect(codes(bereken({ poort1_gevel: 'links', poort1_breedte: 550, afstand: 600 }))).toContain('poort1_kolommen');
    const past = bereken({ poort1_gevel: 'links', poort1_breedte: 500, afstand: 600 });
    expect(codes(past)).not.toContain('poort1_kolommen');
    expect(fouten(past)).toEqual([]);
    expect(codes(bereken({ poort1_gevel: 'voor', poort1_breedte: 550 }))).not.toContain('poort1_kolommen');
  });

  it('te hoge poorten, poorten die niet naast elkaar passen, en twee in dezelfde travee', () => {
    expect(codes(bereken({ poort1_hoogte: 450, zijhoogte: 450 }))).toContain('poort1_hoog');
    expect(codes(bereken({ poort1_hoogte: 400, zijhoogte: 450 }))).not.toContain('poort1_hoog');
    expect(codes(bereken({ breedte: 1000, poort1_breedte: 400, poort2_gevel: 'voor', poort2_breedte: 400 }))).toContain('kopgevel_voor_vol');
    expect(codes(bereken({ breedte: 1500, poort1_breedte: 400, poort2_gevel: 'voor', poort2_breedte: 400 }))).not.toContain('kopgevel_voor_vol');
    expect(codes(bereken({ poort1_gevel: 'links', poort1_breedte: 300, poort2_gevel: 'links', poort2_breedte: 300, poort2_travee: 1 }))).toContain('poorten_1_2_samen');
    expect(codes(bereken({ poort1_gevel: 'rechts', poort1_breedte: 400, loopdeur_gevel: 'rechts', loopdeur_travee: 1 }))).toContain('poort1_deur');
    expect(codes(bereken({ poort1_gevel: 'rechts', poort1_breedte: 300, loopdeur_gevel: 'rechts', loopdeur_travee: 1 }))).not.toContain('poort1_deur');
    expect(codes(bereken({ poort_vensters: true, poort1_breedte: 500 }))).toContain('poort1_vensters');
  });

  it('waarschuwingen over de overspanning, de portaalafstand, lange dakpanelen en te hoog beton', () => {
    expect(codes(bereken({ breedte: 2500 }))).toContain('overspanning_groot');
    expect(codes(bereken({ breedte: 800 }))).toContain('overspanning_klein');
    expect(codes(bereken())).not.toContain('overspanning_groot');
    expect(codes(bereken({ afstand: 750 }))).toContain('portalen_ver');
    expect(codes(bereken({ dakvorm: 'lessenaar', breedte: 2400 }))).toContain('dakpaneel_lang');
    expect(codes(bereken({ dakvorm: 'lessenaar', breedte: 2400, dak_bekleding: 'plaat' }))).not.toContain('dakpaneel_lang');
    expect(codes(bereken({ beton: 'b300', zijhoogte: 350 }))).toContain('beton_hoog');
    // Een ongeldige configuratie wordt toch getekend.
    expect(loods3D(bereken({ beton: 'b300', zijhoogte: 350 })).blokken.length).toBeGreaterThan(20);
  });
});
