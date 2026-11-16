/**
 * Schuine muren (ronde 2c, 16/11): gevels, dak, zon, controles en indelen.
 */
import { describe, expect, it } from 'vitest';
import {
  buitenRichting, controleerPlan, dakOpbouw, gevelAanzichten, gevelKeuzeVan, gevelOppervlaktes, meubelAfstanden, murenVan, opMuur, plattegrond3D,
  ruimteMaten, splitsRuimtes, tekenRuimteIn, veelhoekOppervlakte, verfGevel, vlakSleutel, vormenVan, zetOmtrek, zonOpGevels, zonOpRichting,
  type DakKeuze, type Opening, type Plattegrond, type Punt, type Ruimte,
} from '../src/index.js';
import { planCatalogus, planNaarRegels } from '../voorbeelden/inrichting.js';

const ruimte = (id: string, x: number, y: number, b: number, d: number, extra: Partial<Ruimte> = {}): Ruimte =>
  ({ id, naam: id, type: 'leefruimte', x, y, b, d, vloer: 'parket_eik', wand: 'wit', ...extra });
function vrij(id: string, punten: Punt[], extra: Partial<Ruimte> = {}): Ruimte {
  const r = ruimte(id, 0, 0, 0, 0, extra);
  zetOmtrek(r, punten);
  return r;
}
const plan = (ruimtes: Ruimte[], openingen: Opening[] = [], extra: Partial<Plattegrond> = {}): Plattegrond => ({
  ruimtes, openingen, meubels: [], muurhoogte: 270, buitenmuur: 30, binnenmuur: 10, gevel: { soort: 'steen', kleur: '#9c4a34' },
  gevelOntwerp: { standaard: { materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' } }, ...extra,
});
const plat: DakKeuze = { vorm: 'plat', helling: 35, richting: 'onder', oversteek: 40, bedekking: { materiaal: 'grind', kleur: 'grijs' } };
const zadel: DakKeuze = { vorm: 'zadel', helling: 40, richting: 'onder', oversteek: 40, bedekking: { materiaal: 'pannen', kleur: 'rood' } };

/** Aanbouw tegen een rechthoekige woning, met een schuine zijmuur van (700, 800) naar (800, 1200) en een raam erin. */
function aanbouw(): Plattegrond {
  const p = plan([ruimte('woon', 0, 0, 1000, 800), vrij('aan', [[200, 800], [700, 800], [800, 1200], [200, 1200]])]);
  const s = murenVan(p).find((m) => m.as === 's')!;
  p.openingen.push({ id: 'r', soort: 'raam', ...opMuur(s, (s.van + s.tot) / 2), breedte: 120, hoogte: 140, borstwering: 90, scharnier: 'begin', naarPlus: true });
  return p;
}
const c = 400 / Math.hypot(100, 400); // cosinus van de schuine muur t.o.v. de y-as

describe('gevels van een schuine muur', () => {
  it('de schuine muur kijkt naar 76° (rechts, iets naar boven) en heeft haar eigen muurvlak', () => {
    const s = murenVan(aanbouw()).find((m) => m.as === 's')!;
    expect(buitenRichting(s)).toBeCloseTo(Math.atan2(400, 100) * 180 / Math.PI, 6); // 75,96°
    expect(vlakSleutel(s)).toBe('aan:s76');
  });

  it('een eigen aanzicht, recht ervoor bekeken, na de vier kanten', () => {
    const p = aanbouw();
    const gevels = gevelAanzichten(p, (o) => ({ label: o.id, vakken: ['draai_l', 'vast'] }), planCatalogus);
    expect(gevels.slice(0, 4).map((g) => g.kant)).toEqual(['boven', 'onder', 'links', 'rechts']);
    expect(gevels.length).toBe(5);
    const g = gevels[4]!;
    expect(g.schuin?.kijkt).toBe(76);
    expect(g.kant).toBe('rechts');
    expect(g.naam).toBe('Schuine gevel (kijkt naar rechts)');
    // Het muurvlak: het buitenvlak van y = 805 (afgeknipt op de woningmuur) tot y = 1215 (de hoek): 410 / cos.
    const muur = g.tekening.vormen.find((v) => v.code.startsWith('muur.0.'))!;
    expect(muur.breedte).toBeCloseTo(Math.round((410 / c) * 10) / 10, 1);
    expect(g.vlakken.map((v) => v.sleutel)).toEqual(['aan:s76']);
    // Het raam staat in het midden, 120 breed; de kettingmaat: muur, raam, muur.
    const kader = g.tekening.vormen.find((v) => v.code === 'kader.r')!;
    expect(kader.breedte).toBe(120);
    const ketting = g.tekening.maatlijnen.filter((m) => m.code.startsWith('ketting.0.')).map((m) => Number(m.tekst));
    expect(ketting.length).toBe(3);
    expect(ketting[1]).toBe(120);
    expect(ketting.reduce((t, x) => t + x, 0)).toBeCloseTo(410 / c, -1);
    // naarU en vanU werken met de plaats langs de schuine muur (zoals `midden` van de opening).
    const o = p.openingen[0]!;
    expect(g.vanU(g.naarU(o.midden))).toBeCloseTo(o.midden, 9);
    expect(Math.abs(g.naarU(o.midden + 60) - g.naarU(o.midden - 60))).toBeCloseTo(120, 9);
  });

  it('oppervlakte van het schuine muurvlak, en verven van alleen dat vlak', () => {
    const p = aanbouw();
    const opp = gevelOppervlaktes(p).find((v) => v.sleutel === 'aan:s76')!;
    expect(opp.kant).toBe('rechts');
    expect(opp.kijkt).toBeCloseTo(75.96, 2);
    expect(opp.lengte).toBeCloseTo(410 / c / 100, 6);
    expect(opp.netto).toBeCloseTo(((410 / c) * 270 - 120 * 140) / 10000, 6);
    verfGevel(p, { materiaal: 'pleister', kleur: 'wit' }, 'vlak', { sleutel: 'aan:s76' });
    const muren = murenVan(p);
    expect(gevelKeuzeVan(p, muren.find((m) => m.as === 's')!)?.materiaal).toBe('pleister');
    expect(gevelKeuzeVan(p, muren.find((m) => m.id === 'h1200_200')!)?.materiaal).toBe('gevelsteen');
  });

  it('indelen geeft het gevelmateriaal van het schuine vlak mee aan de nieuwe ruimte', () => {
    const p = aanbouw();
    verfGevel(p, { materiaal: 'pleister', kleur: 'wit' }, 'vlak', { sleutel: 'aan:s76' });
    const [b] = splitsRuimtes(p, 0, 'v', 450, 1000, 1000, (oud) => ({ ...oud, id: 'aan2', naam: 'Aanbouw 2', delen: undefined }));
    expect(b?.id).toBe('aan2');
    const s = murenVan(p).find((m) => m.as === 's')!;
    expect(s.min).toBe('aan2');
    expect(gevelKeuzeVan(p, s)?.materiaal).toBe('pleister');
  });
});

describe('dak boven een vrije vorm', () => {
  it('plat: dakstukken met de omtrek, dakrand langs de schuine muur, koepels erin', () => {
    const p = aanbouw();
    p.dak = plat;
    p.daklichten = [{ id: 'k1', type: 'koepel_100', x: 400, y: 950, b: 100, d: 100 }, { id: 'k2', type: 'koepel_60', x: 700, y: 1000, b: 60, d: 60 }];
    const o = dakOpbouw(p)!;
    const stuk = o.plat.find((s) => s.ruimte === 'aan')!;
    expect(veelhoekOppervlakte(stuk.omtrek!)).toBeCloseTo(veelhoekOppervlakte(vormenVan(p.ruimtes[1]!)[0]!), 6);
    expect(o.daklichten[0]!.reden).toBeUndefined();
    // De tweede koepel ligt over de schuine muur (die loopt bij y = 1000 door x = 750).
    expect(o.daklichten[1]!.reden).toContain('over een muur');
    expect(o.dakranden.some((d) => d.muur.as === 's')).toBe(true);
    // m² plat: woning 10 × 8 m + aanbouw (trapezium: (500 + 600) / 2 × 400) min de koepel.
    expect(o.m2Plat).toBeCloseTo(80 + 22 - 1, 6);
    // 3D: de dakplaat en de bedekking van de aanbouw zijn prisma's met haar grondvlak, de koepel eruit geknipt.
    const s = plattegrond3D(p, planCatalogus).blokken;
    const platen = s.filter((b) => b.code === 'dakplaat_aan');
    expect(platen.every((b) => b.vorm === 'prisma' && b.as === 'y')).toBe(true);
    expect(platen.reduce((t, b) => t + veelhoekOppervlakte(b.doorsnede as Punt[]), 0)).toBeCloseTo(220000 - 10000, 3);
    expect(s.some((b) => b.code.startsWith('dakrand_s') && b.vorm === 'prisma')).toBe(true);
  });

  it('hellend dak alleen op een rechthoek: een vrije vorm valt terug op plat, met een melding', () => {
    const p = aanbouw();
    p.dak = zadel;
    const o = dakOpbouw(p)!;
    expect(o.hellend).toBeUndefined();
    expect(o.terugval).toContain('geen rechthoek');
    expect(controleerPlan(p, planCatalogus).some((m) => m.melding === o.terugval)).toBe(true);
    // Een vrije vorm die toch een rechthoek is (uit gemeten maten), krijgt wel een hellend dak.
    const r = plan([vrij('a', [[0, 0], [600, 0], [600, 400], [0, 400]])], [], { dak: zadel });
    expect(dakOpbouw(r)!.hellend).toBeDefined();
  });
});

describe('zon op een schuine gevel', () => {
  it('rekent met de richting van de gevel; de vier kanten blijven gelijk', () => {
    const [, rechts] = zonOpGevels(6, 21);
    const { kant: _kant, ...zonder } = rechts!;
    expect(zonOpRichting(6, 21, 90)).toEqual(zonder);
    // 21 juni: een gevel die naar 76° kijkt (oost-noordoost), krijgt zon vanaf zonsopgang tot de late voormiddag.
    const z = zonOpRichting(6, 21, 76);
    expect(z.windstreek).toBe('oost');
    expect(z.periodes.length).toBe(1);
    expect(z.periodes[0]!.tot).toBeLessThan(rechts!.periodes[0]!.tot);
    expect(z.uren).toBeGreaterThan(5);
    // Met het noorden rechts op het plan (90°) kijkt die gevel naar het noorden (346°).
    expect(zonOpRichting(6, 21, 76, 90).windstreek).toBe('noord');
  });
});

describe('oppervlaktes, controles en indelen met een vrije vorm', () => {
  it('controles: een vorm die niet kan, een inspringende hoek, overlap, een meubel buiten de muren', () => {
    const p = plan([vrij('a', [[0, 0], [400, 0], [300, 300], [0, 300]]), vrij('b', [[350, 0], [800, 0], [800, 300], [250, 300]])]);
    expect(controleerPlan(p).some((m) => m.ernst === 'fout' && m.melding.includes('overlappen'))).toBe(true);
    const k = plan([{ ...ruimte('k', 0, 0, 400, 300), omtrek: [[0, 0], [400, 300], [400, 0], [0, 300]] }]);
    expect(controleerPlan(k).some((m) => m.ernst === 'fout' && m.melding.includes('kruisen elkaar'))).toBe(true);
    const i = plan([vrij('i', [[0, 0], [400, 0], [400, 300], [200, 100], [0, 300]])]);
    expect(controleerPlan(i).some((m) => m.ernst === 'waarschuwing' && m.melding.includes('inspringende hoek'))).toBe(true);
    // Een kast tegen de schuine muur: de hoek rechtsonder steekt in de muur.
    const a = aanbouw();
    a.meubels.push({ id: 'kast', type: 'kleerkast', x: 600, y: 1050, b: 150, d: 60, rotatie: 0 });
    expect(controleerPlan(a).some((m) => m.melding.includes('staat (deels) in of buiten een muur'))).toBe(true);
    a.meubels[0]!.x = 450;
    expect(controleerPlan(a).some((m) => m.melding.includes('in of buiten een muur'))).toBe(false);
    // Afstanden tot de muren: links tot de linkermuur (binnenvlak x = 215), rechts tot de schuine muur op y = 1080.
    const af = meubelAfstanden(a, a.meubels[0]!)!;
    expect(af.links).toBeCloseTo(450 - 215, 6);
    expect(af.x1).toBeCloseTo(700 + (1080 - 800) / 4 - 15 / c, 6);
  });

  it('indelen: een staande wand door een vijfhoek knipt de veelhoek in twee', () => {
    const p = plan([vrij('v', [[0, 0], [600, 0], [600, 250], [400, 450], [0, 450]])]);
    const nieuw = splitsRuimtes(p, 0, 'v', 300, 200, 200, (oud) => ({ ...oud, id: 'v2', naam: 'v2', delen: undefined }));
    expect(nieuw.map((r) => r.id)).toEqual(['v2']);
    const [links, rechts] = p.ruimtes;
    // Het linkse stuk is een gewone rechthoek geworden; het rechtse houdt de schuine hoek.
    expect(links!.omtrek).toBeUndefined();
    expect([links!.x, links!.y, links!.b, links!.d]).toEqual([0, 0, 300, 450]);
    expect(rechts!.omtrek?.length).toBe(5);
    expect(ruimteMaten(p, links!).bruto + ruimteMaten(p, rechts!).bruto).toBeCloseTo(25, 6);
    expect(murenVan(p).some((m) => m.as === 'v' && m.lijn === 300 && m.soort === 'binnen')).toBe(true);
  });

  it('ruimte in ruimte: een kast in de hoek van een vrije vorm laat één ruimte in twee bolle delen over', () => {
    const p = plan([vrij('v', [[0, 0], [600, 0], [600, 250], [400, 450], [0, 450]])]);
    tekenRuimteIn(p, ruimte('kast', 0, 0, 200, 150, { type: 'berging' }));
    const v = p.ruimtes.find((r) => r.id === 'v')!;
    expect((v.delen?.length ?? 0) + 1).toBe(2);
    expect(ruimteMaten(p, v).bruto).toBeCloseTo(25 - 3, 6);
    // Tussen de twee delen van dezelfde ruimte staat geen muur.
    const muren = murenVan(p);
    expect(muren.filter((m) => m.plus === 'v' && m.min === 'v')).toEqual([]);
    expect(muren.filter((m) => [m.plus, m.min].includes('kast') && m.soort === 'binnen').length).toBe(2);
  });

  it('offerteregels van een plan met een schuine muur: zinnige hoeveelheden', () => {
    const p = aanbouw();
    const regels = planNaarRegels(p, { vloeren: true, wanden: true, binnendeuren: true, ruwbouw: true, inrichting: true, gevel: true });
    const vloer = regels.filter((r) => r.groep === 'Vloeren').reduce((t, r) => t + r.hoeveelheid, 0);
    const netto = p.ruimtes.reduce((t, r) => t + ruimteMaten(p, r).netto, 0);
    expect(vloer).toBeCloseTo(netto * 1.07, 0);
    const gevel = regels.find((r) => r.groep === 'Gevel')!;
    expect(gevel.hoeveelheid).toBeCloseTo(gevelOppervlaktes(p).reduce((t, v) => t + v.netto, 0), 0);
    for (const r of regels) expect(Number.isFinite(r.hoeveelheid) && r.hoeveelheid >= 0, r.code).toBe(true);
  });
});
