import { describe, expect, it } from 'vitest';
import { berekenConfiguratie, blokOmvang, controleerModel, type ConfiguratieResultaat, type Keuzes, type ProductModel } from '../src/index.js';
import { omvang } from '../voorbeelden/samenstelling.js';
import { balustrade, luifel, staaltrap, staalwerkModellen, staalwerkPrijslijst, staalwerkVertrekpunten as SV, TRAP } from '../voorbeelden/staalwerk.js';
import { staalwerk3D, staalwerkMeetstaat, staalwerkSamenstelling } from '../voorbeelden/staalwerk3d.js';

const bereken = (model: ProductModel, k: Keuzes = {}) => berekenConfiguratie(model, k, staalwerkPrijslijst);
const codes = (r: ConfiguratieResultaat) => r.meldingen.map((m) => m.code);
const fouten = (r: ConfiguratieResultaat) => r.meldingen.filter((m) => m.ernst === 'fout').map((m) => m.melding);
const blokken = (r: ConfiguratieResultaat, begin: string, weergave: 'afgewerkt' | 'constructie' = 'afgewerkt') => staalwerk3D(r, weergave).blokken.filter((b) => b.code.startsWith(begin));
const delen = (r: ConfiguratieResultaat, begin: string) => staalwerkSamenstelling(r).delen.filter((g) => g.code.startsWith(begin));

/** Wat voor elke 3D van het staalwerk moet gelden, met dezelfde buitenmaten in beide weergaven. */
function controleerScene(r: ConfiguratieResultaat, naam: string) {
  const o: Record<string, ReturnType<typeof omvang>> = {};
  for (const weergave of ['afgewerkt', 'constructie'] as const) {
    const s = staalwerk3D(r, weergave);
    expect(s.blokken.length, naam).toBeGreaterThan(3);
    expect(new Set(s.blokken.map((b) => b.code)).size, `${naam}: dubbele codes`).toBe(s.blokken.length);
    for (const b of s.blokken) {
      for (const v of [b.x, b.y, b.z, b.b, b.h, b.d]) expect(Number.isFinite(v), `${naam}: ${b.code}`).toBe(true);
      expect(Math.min(b.b, b.h, b.d), `${naam}: ${b.code} heeft een maat nul`).toBeGreaterThan(0);
      expect(blokOmvang(b).y0, `${naam}: ${b.code} zit onder de grond`).toBeGreaterThanOrEqual(-0.01);
    }
    o[weergave] = omvang(s.blokken);
    const k = s.kader;
    expect(o[weergave]!.x0, naam).toBeGreaterThanOrEqual(k.x);
    expect(o[weergave]!.x1, naam).toBeLessThanOrEqual(k.x + k.b);
    expect(o[weergave]!.y1, naam).toBeLessThanOrEqual(k.h + 0.01);
    expect(JSON.parse(JSON.stringify(s)), naam).toEqual(s);
  }
  for (const kant of ['x0', 'x1', 'y0', 'y1', 'z0', 'z1'] as const) expect(o.constructie![kant], `${naam} ${kant}`).toBeCloseTo(o.afgewerkt![kant], 1);
  expect(staalwerkSamenstelling(r).meldingen, naam).toEqual([]);
}

/** De stukken staal die de constructieweergave tekent, tegen wat de meetstaat telt. */
function meetstaatKlopt(r: ConfiguratieResultaat, naam: string) {
  const s = staalwerkSamenstelling(r), b = staalwerk3D(r, 'constructie').blokken;
  const stukken = s.delen.filter((g) => g.deel.stukken.length);
  const geteld = staalwerkMeetstaat(r).filter((x) => x.groep === 'staal' || x.groep === 'hout').reduce((som, x) => som + (x.aantal ?? 0), 0);
  expect(stukken.reduce((som, g) => som + g.deel.stukken.length, 0), naam).toBe(geteld);
  // Elk stuk dat draagt, staat in de constructieweergave; de vulling (spijlen, staven) en de treden staan er alleen in het
  // laatste veld of onderaan, maar wel in de afgewerkte weergave.
  const afgewerkt = staalwerk3D(r, 'afgewerkt').blokken;
  for (const g of stukken) {
    const vulling = /^(trede|spijl|staaf)\./.test(g.code);
    expect((vulling ? afgewerkt : b).some((x) => x.code.startsWith(`${g.code}.`)), `${naam}: ${g.code}`).toBe(true);
  }
}

/** Alle keuzes van een model apart, en de uitersten van elk getal. */
function elkeKeuze(model: ProductModel, basis: Keuzes = {}) {
  const gevallen: Keuzes[] = [basis];
  for (const k of model.kenmerken) {
    if (k.type === 'getal') {
      for (const w of [k.min, k.max]) if (typeof w === 'number') gevallen.push({ ...basis, [k.code]: w });
    } else for (const w of k.type === 'janee' ? [true, false] : k.keuzes.map((x) => x.code)) gevallen.push({ ...basis, [k.code]: w, ...(k.code === 'leuning' && w === 'geen' ? { vulling: 'glas' } : {}) });
  }
  return gevallen;
}

describe('staalwerk: de modellen', () => {
  it('de drie modellen zijn zonder fouten, hun standaardwaarden zijn geldig, en elk zegt dat een staalbouwer rekent', () => {
    for (const model of [balustrade, luifel, staaltrap]) {
      expect(controleerModel(model), model.code).toEqual([]);
      const r = bereken(model);
      expect(fouten(r), model.code).toEqual([]);
      expect(codes(r), model.code).toContain('staalbouwer');
      expect(staalwerkModellen[model.code]).toBe(model);
    }
  });

  it('zonder prijzen: een lege prijslijst, een lege stuklijst en een prijs van nul', () => {
    expect(staalwerkPrijslijst).toEqual({});
    for (const model of [balustrade, luifel, staaltrap]) {
      const r = bereken(model);
      expect(model.stuklijst).toEqual([]);
      expect(r.prijs).toMatchObject({ kostprijs: 0, verkoopprijsExcl: 0, verkoopprijsIncl: 0 });
      expect(JSON.stringify(staalwerkMeetstaat(r))).not.toMatch(/prijs|kost|€|\beuro\b/i);
    }
  });

  it('de vertrekpunten en elke keuze apart, met de uitersten: een 3D zonder fouten, dezelfde buitenmaten, een meetstaat die klopt', () => {
    for (const [naam, v] of Object.entries(SV)) {
      const r = bereken(v.model, v.keuzes);
      expect(fouten(r), naam).toEqual([]);
      controleerScene(r, naam);
      meetstaatKlopt(r, naam);
    }
    for (const [model, basis] of [[balustrade, {}], [balustrade, { vulling: 'glas' }], [luifel, {}], [luifel, { ophanging: 'consoles' }], [staaltrap, {}], [staaltrap, { structuur: 'midden' }]] as [ProductModel, Keuzes][]) {
      for (const k of elkeKeuze(model, basis)) {
        const r = bereken(model, k), naam = `${model.code} ${JSON.stringify(k)}`;
        expect(fouten(r), naam).toEqual([]);
        controleerScene(r, naam);
        meetstaatKlopt(r, naam);
      }
    }
  });
});

describe('balustrade', () => {
  it('spijlen: hoogstens 10 cm tussen twee spijlen, tussen spijl en staander, en onder de onderregel', () => {
    for (const lengte of [50, 155, 300, 1200]) {
      const r = bereken(balustrade, { lengte, vulling: 'spijlen' });
      const st = blokken(r, 'staander.').map(blokOmvang), sp = blokken(r, 'spijl.').map(blokOmvang);
      expect(delen(r, 'staander')).toHaveLength(Number(r.afgeleid.staanders));
      const randen = [...st.flatMap((o) => [o.x0, o.x1]), ...sp.flatMap((o) => [o.x0, o.x1])].sort((a, b) => a - b);
      for (let i = 1; i < randen.length - 1; i += 2) expect(randen[i + 1]! - randen[i]!, `${lengte}`).toBeLessThanOrEqual(10.01);
      const onder = blokken(r, 'regel.').map(blokOmvang);
      for (const o of onder) expect(o.y0 - 62).toBeLessThan(11);
      // De leuning ligt bovenop: haar bovenkant is de hoogte boven de vloer van het terras.
      expect(omvang(blokken(r, 'leuning.')).y1 - 62).toBeCloseTo(110, 1);
    }
  });

  it('staven: horizontaal, hoogstens 10 cm ertussen; een waarschuwing over klimmen', () => {
    const r = bereken(balustrade, { vulling: 'staven' });
    expect(codes(r)).toContain('staven_klimmen');
    const ys = [...new Set(blokken(r, 'staaf.').map((b) => blokOmvang(b)))].map((o) => [o.y0, o.y1] as [number, number]).sort((a, b) => a[0] - b[0]);
    const uniek = ys.filter((y, i) => i === 0 || Math.abs(y[0] - ys[i - 1]![0]) > 0.1);
    uniek.slice(1).forEach((y, i) => expect(y[0] - uniek[i]![1]).toBeLessThanOrEqual(10.01));
    expect(uniek[0]![0] - 62).toBeLessThan(11);
    const leuning = omvang(blokken(r, 'leuning.'));
    expect(leuning.y0 - uniek[uniek.length - 1]![1]).toBeLessThanOrEqual(10.01);
  });

  it('glas: panelen in een bodemprofiel, zonder staanders; constructie toont alleen het laatste paneel', () => {
    const r = bereken(balustrade, { vulling: 'glas', lengte: 360, leuning: 'rond' });
    expect(codes(r)).toContain('glas_gelaagd');
    expect(delen(r, 'staander')).toEqual([]);
    expect(blokken(r, 'glas.')).toHaveLength(3);
    expect(blokken(r, 'glas.', 'constructie')).toHaveLength(1);
    expect(staalwerkMeetstaat(r).find((x) => x.materiaal === 'glas_helder')!.m2).toBeGreaterThan(3);
    expect(codes(bereken(balustrade, { leuning: 'geen' }))).toContain('leuning_geen');
    expect(fouten(bereken(balustrade, { vulling: 'glas', leuning: 'geen' }))).toEqual([]);
  });

  it('tegen de vloerrand: de staanders hangen voor de rand en lopen eronder door', () => {
    const r = bereken(balustrade, { bevestiging: 'zijkant' });
    for (const o of blokken(r, 'staander.').map(blokOmvang)) {
      expect(o.z0).toBeGreaterThan(0);
      expect(o.y0).toBeLessThan(62);
    }
    for (const o of blokken(bereken(balustrade), 'staander.').map(blokOmvang)) expect(o.z1).toBeLessThan(0);
  });

  it('meldt altijd dat de hoogte per bron verschilt', () => {
    expect(codes(bereken(balustrade))).toContain('hoogte_bronnen');
  });
});

describe('luifel', () => {
  it('het kader is zo breed en zo diep als gevraagd, op de gevraagde hoogte', () => {
    for (const [breedte, uitkraging, hoogte] of [[100, 60, 210], [250, 120, 250], [600, 250, 320]] as const) {
      const r = bereken(luifel, { breedte, uitkraging, hoogte });
      const o = omvang(blokken(r, 'kader.'));
      expect([o.x0, o.x1, o.z0, o.z1, o.y0]).toEqual([0, breedte, 0, uitkraging, hoogte]);
      expect(delen(r, 'trekstang')).toHaveLength(Number(r.afgeleid.ophangpunten));
    }
  });

  it('trekstangen lopen van de gevel naar de voorregel; consoles van de gevel tot onder het kader', () => {
    const r = bereken(luifel, { uitkraging: 150, hoogte: 260 });
    for (const b of blokken(r, 'trekstang.')) {
      const o = blokOmvang(b);
      expect(o.z0).toBeLessThan(3);
      expect(o.z1).toBeGreaterThan(140);
      expect(o.y1).toBeGreaterThan(260 + 12 + 60);
    }
    const c = bereken(luifel, { ophanging: 'consoles', uitkraging: 160, hoogte: 260 });
    expect(delen(c, 'trekstang')).toEqual([]);
    for (const g of delen(c, 'console')) {
      expect(g.y + g.deel.maten.h).toBeGreaterThan(260);
      expect(g.y + g.deel.maten.h).toBeLessThan(260 + 12);
      expect(g.z).toBe(0);
    }
    expect(codes(c)).toContain('uitkraging_groot');
  });

  it('constructie: het kader en de ophanging, de vulling alleen in het laatste veld', () => {
    const r = bereken(luifel, { breedte: 500 });
    expect(blokken(r, 'vulling.')).toHaveLength(3);
    expect(blokken(r, 'vulling.', 'constructie')).toHaveLength(1);
    expect(blokken(r, 'kader.', 'constructie').length).toBe(blokken(r, 'kader.').length);
  });
});

describe('rechte trap', () => {
  it('het aantal treden volgt uit de hoogte: optreden van hoogstens 18,5 cm, één aantrede minder', () => {
    for (const hoogte of [240, 255, 270, 300, 340]) {
      const r = bereken(staaltrap, { hoogte });
      const n = Number(r.afgeleid.optreden), op = Number(r.afgeleid.optrede);
      expect(n).toBe(Math.ceil(hoogte / 18.5));
      expect(op).toBeCloseTo(hoogte / n, 2);
      expect(op).toBeLessThanOrEqual(18.5);
      expect(op).toBeGreaterThanOrEqual(TRAP.optrede[0]);
      expect(r.afgeleid.aantreden).toBe(n - 1);
      expect(r.afgeleid.lengte).toBe((n - 1) * 23);
      expect(blokken(r, 'trede.')).toHaveLength(n - 1);
      // Elke trede ligt een optrede hoger; de bovenste een optrede onder de vloer erboven.
      const tops = blokken(r, 'trede.').map((b) => blokOmvang(b).y1).sort((a, b) => a - b);
      tops.forEach((y, i) => expect(y).toBeCloseTo((i + 1) * (hoogte / n), 1));
      expect(hoogte - tops[tops.length - 1]!).toBeCloseTo(hoogte / n, 1);
      // De trap ligt tussen z = 0 (de vloer erboven) en z = de lengte, over de breedte.
      const o = omvang(blokken(r, 'trede.'));
      expect(o.z0).toBeGreaterThanOrEqual(0);
      expect(o.z1).toBeCloseTo((n - 1) * 23, 1);
      expect(o.x0).toBeGreaterThanOrEqual(0);
      expect(o.x1).toBeLessThanOrEqual(90);
    }
  });

  it('de trapformule (2 × optrede + aantrede) als controle met de grenzen uit het onderzoek', () => {
    const r = bereken(staaltrap, { hoogte: 270, aantrede: 23 });
    expect(r.afgeleid.trapformule).toBeCloseTo(2 * 18 + 23, 1);
    expect(codes(r)).not.toContain('trapformule');
    expect(codes(bereken(staaltrap, { hoogte: 300, aantrede: 28 }))).toContain('trapformule');
    expect(codes(bereken(staaltrap, { hoogte: 241, aantrede: 22 }))).toContain('trapformule');
    expect(codes(bereken(staaltrap, { aantrede: 15 }))).toContain('te_steil');
    expect(codes(bereken(staaltrap, { breedte: 70 }))).toContain('smal');
    expect(codes(bereken(staaltrap, { leuning: 'geen' }))).toContain('leuning_geen');
  });

  it('twee trapbomen staan op de vloer en reiken tot de vloer erboven; één middenboom draagt elke trede', () => {
    const r = bereken(staaltrap);
    const bomen = blokken(r, 'trapboom.', 'constructie');
    expect(delen(r, 'trapboom')).toHaveLength(2);
    const o = omvang(bomen);
    expect(o.y0).toBeCloseTo(0, 1);
    expect(o.z0).toBeCloseTo(0, 1);
    expect(o.y1).toBeGreaterThan(270);
    expect(delen(r, 'drager')).toHaveLength(2 * 14);
    const m = bereken(staaltrap, { structuur: 'midden', treden: 'staal' });
    expect(delen(m, 'trapboom')).toHaveLength(1);
    expect(delen(m, 'drager')).toHaveLength(14);
    expect(omvang(blokken(m, 'trapboom.')).y0).toBeCloseTo(0, 1);
    // Elke drager reikt tot onder zijn trede.
    const treden = blokken(m, 'trede.').map(blokOmvang).sort((a, b) => a.y0 - b.y0);
    const dragers = blokken(m, 'drager.').map(blokOmvang).sort((a, b) => a.y1 - b.y1);
    dragers.forEach((d, i) => expect(d.y1).toBeCloseTo(treden[i]!.y0, 1));
  });

  it('constructie: de treden alleen onderaan; de meetstaat telt ze allemaal', () => {
    const r = bereken(staaltrap);
    expect(blokken(r, 'trede.', 'constructie')).toHaveLength(3);
    const treden = staalwerkMeetstaat(r).filter((x) => x.rol === 'trede').reduce((s, x) => s + (x.aantal ?? 0), 0);
    expect(treden).toBe(14);
    expect(staalwerkMeetstaat(bereken(staaltrap, { treden: 'staal' })).filter((x) => x.rol === 'trede').every((x) => x.groep === 'staal')).toBe(true);
  });

  it('een leuning links, rechts of aan beide zijden, 90 cm boven de neuzen van de treden', () => {
    expect(delen(bereken(staaltrap, { leuning: 'geen' }), 'leuning')).toEqual([]);
    expect(delen(bereken(staaltrap, { leuning: 'beide' }), 'leuning')).toHaveLength(2);
    // Links gezien als je opgaat (naar -z): aan de kant van x = 0.
    expect(omvang(blokken(bereken(staaltrap, { leuning: 'links' }), 'leuning.')).x1).toBeLessThan(5);
    expect(omvang(blokken(bereken(staaltrap, { leuning: 'rechts' }), 'leuning.')).x0).toBeGreaterThan(85);
    const r = bereken(staaltrap, { leuning: 'rechts' }), o = omvang(blokken(r, 'leuning.'));
    expect(o.y1).toBeGreaterThan(270 + 85);
    expect(codes(r)).toContain('leuning_openingen');
  });
});

