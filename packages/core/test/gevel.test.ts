import { describe, expect, it } from 'vitest';
import {
  gevelAanzichten,
  gevelAfwerking,
  gevelKeuzeVan,
  gevelOppervlaktes,
  murenVan,
  niveauPlan,
  plattegrond3D,
  tekenSvg,
  verfGevel,
  vlakSleutel,
  type Plattegrond,
} from '../src/index.js';
import { gevelOntwerpVan, planCatalogus, planNaarRegels } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

/** Eén ruimte van 10 × 6 m (op de as), buitenmuur 30 cm, één raam in de bovengevel. */
function doos(): Plattegrond {
  return {
    ruimtes: [{ id: 'r1', naam: 'Leefruimte', type: 'leefruimte', x: 0, y: 0, b: 1000, d: 600, vloer: 'parket_eik', wand: 'wit' }],
    openingen: [{ id: 'o1', soort: 'raam', as: 'h', lijn: 0, midden: 500, breedte: 200, hoogte: 150, borstwering: 90, scharnier: 'begin', naarPlus: true }],
    meubels: [],
    muurhoogte: 270, buitenmuur: 30, binnenmuur: 10,
    gevel: { soort: 'steen', kleur: '#9c4a34' },
    gevelOntwerp: { standaard: { materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' } },
  };
}

describe('gevelmaterialen', () => {
  it('verven: één vlak, een hele gevelkant, een verdieping en de hele woning', () => {
    const plan = doos();
    const muren = murenVan(plan);
    const boven = muren.find((m) => m.as === 'h' && m.lijn === 0)!;
    expect(vlakSleutel(boven)).toBe('r1:boven');
    verfGevel(plan, { materiaal: 'hout_staand', kleur: 'zwart' }, 'vlak', { sleutel: 'r1:boven' });
    expect(gevelKeuzeVan(plan, boven)?.materiaal).toBe('hout_staand');
    const links = muren.find((m) => m.as === 'v' && m.lijn === 0)!;
    expect(gevelKeuzeVan(plan, links)?.materiaal).toBe('gevelsteen');
    verfGevel(plan, { materiaal: 'crepi', kleur: 'wit' }, 'gevel', { kant: 'links' });
    expect(gevelKeuzeVan(plan, links)?.materiaal).toBe('crepi');
    verfGevel(plan, { materiaal: 'leien', kleur: 'antraciet' }, 'woning');
    expect(plan.gevelOntwerp?.vlakken).toBeUndefined();
    expect(gevelKeuzeVan(plan, boven)?.materiaal).toBe('leien');
    const afw = gevelAfwerking(plan, planCatalogus, gevelKeuzeVan(plan, boven));
    expect(afw).toEqual({ soort: 'leien', kleur: '#3b3f45', voeg: undefined });
  });

  it('een ouder project zonder gevelontwerp krijgt een overeenkomend ontwerp', () => {
    const plan = doos();
    delete plan.gevelOntwerp;
    expect(gevelOntwerpVan({ ...plan, gevel: { soort: 'gevel', kleur: '#ece9e2' } }).standaard.materiaal).toBe('crepi');
    expect(gevelOntwerpVan(plan).standaard).toEqual({ materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' });
    // Zonder ontwerp blijft de eenvoudige gevel gelden.
    expect(gevelAfwerking(plan, planCatalogus, gevelKeuzeVan(plan, murenVan(plan)[0]!))).toEqual(plan.gevel);
  });

  it('oppervlakte: buitenkant met hoeken, zonder raam, met sokkel apart', () => {
    const plan = doos();
    plan.gevelOntwerp!.sokkel = { materiaal: 'natuursteen', kleur: 'blauwgrijs', hoogte: 30 };
    const opp = gevelOppervlaktes(plan);
    expect(opp).toHaveLength(4);
    const boven = opp.find((v) => v.kant === 'boven')!;
    // Buitenkant 10 m + 2 × 15 cm; raam 2 × 1,5 m volledig boven de sokkel.
    expect(boven.lengte).toBeCloseTo(10.3, 5);
    expect(boven.sokkel).toBeCloseTo(10.3 * 0.3, 5);
    expect(boven.netto).toBeCloseTo(10.3 * 2.4 - 3, 5);
    const totaalLengte = opp.reduce((t, v) => t + v.lengte, 0);
    expect(totaalLengte).toBeCloseTo(2 * (10.3 + 6.3), 5);
  });

  it('oppervlakte: een binnenhoek (L-vorm) telt een halve muurdikte minder', () => {
    const plan = doos();
    plan.openingen = [];
    plan.ruimtes.push({ id: 'r2', naam: 'Keuken', type: 'keuken', x: 0, y: 600, b: 400, d: 400, vloer: 'tegel_grijs', wand: 'wit' });
    const opp = gevelOppervlaktes(plan);
    // Omtrek buitenkant van een L: gelijk aan die van de omhullende rechthoek (10,3 × 10,3 m).
    const totaal = opp.reduce((t, v) => t + v.lengte, 0);
    expect(totaal).toBeCloseTo(4 * 10.3, 5);
  });

  it('offerte: gevel per materiaal en sokkel; buitenmuur zonder gevelsteen in de ruwbouw', () => {
    const plan = doos();
    plan.gevelOntwerp!.sokkel = { materiaal: 'natuursteen', kleur: 'blauwgrijs', hoogte: 30 };
    verfGevel(plan, { materiaal: 'hout_staand', kleur: 'zwart' }, 'vlak', { sleutel: 'r1:boven' });
    const regels = planNaarRegels(plan, { vloeren: false, wanden: false, binnendeuren: false, ruwbouw: true, inrichting: false, gevel: true });
    const gevel = regels.filter((r) => r.groep === 'Gevel');
    expect(gevel.map((r) => r.code).sort()).toEqual(['gevel:gevelsteen:rood:grijs', 'gevel:hout_staand:zwart:', 'sokkel:natuursteen:blauwgrijs']);
    expect(gevel.find((r) => r.code.startsWith('gevel:hout'))!.hoeveelheid).toBeCloseTo(10.3 * 2.4 - 3, 1);
    expect(regels.find((r) => r.groep === 'Ruwbouw' && r.code === 'buitenmuur_kaal')).toBeDefined();
    // Zonder de optie: geen gevelregels en de buitenmuur met gevelsteen.
    const zonder = planNaarRegels(plan, { vloeren: false, wanden: false, binnendeuren: false, ruwbouw: true, inrichting: false });
    expect(zonder.some((r) => r.groep === 'Gevel')).toBe(false);
    expect(zonder.some((r) => r.code === 'buitenmuur')).toBe(true);
  });

  it('3D: gevelmateriaal per vlak buiten, sokkel als apart stuk, binnen de wandafwerking', () => {
    const plan = doos();
    plan.gevelOntwerp!.sokkel = { materiaal: 'natuursteen', kleur: 'blauwgrijs', hoogte: 30 };
    verfGevel(plan, { materiaal: 'hout_staand', kleur: 'zwart' }, 'vlak', { sleutel: 'r1:boven' });
    const s = plattegrond3D(plan, planCatalogus, { meubels: false });
    const buiten = s.blokken.filter((b) => b.zijden && Object.values(b.zijden).some((z) => z?.soort === 'planken'));
    expect(buiten.length).toBeGreaterThan(0);
    // De bovengevel (y = 0) kijkt naar z−: buiten hout, binnen verf.
    for (const b of buiten.filter((x) => x.code.startsWith('muur_') || x.code.startsWith('boven_') || x.code.startsWith('onder_'))) {
      if (b.y >= 30) expect(b.zijden?.['z-']?.soort).toBe('planken');
      expect(b.zijden?.['z+']?.kleur).toBe(planCatalogus.wanden.wit!.kleur);
    }
    const sokkel = s.blokken.filter((b) => b.code.endsWith('_sokkel'));
    expect(sokkel.length).toBeGreaterThanOrEqual(4);
    expect(sokkel.every((b) => b.y === 0 && b.h === 30)).toBe(true);
    expect(sokkel.some((b) => Object.values(b.zijden ?? {}).some((z) => z?.soort === 'natuursteen'))).toBe(true);
    // Baksteen met voegkleur.
    expect(s.blokken.some((b) => Object.values(b.zijden ?? {}).some((z) => z?.soort === 'steen' && z.voeg === '#bdb8ad'))).toBe(true);
  });

  it('3D verdieping: de buitenmuur loopt door voor de rand van de vloerplaat, ook onder een deur', () => {
    const { plan } = voorbeeldWoning();
    const s = plattegrond3D(plan, planCatalogus, { meubels: false });
    const n1 = niveauPlan(plan, 1);
    const buiten = murenVan(n1).filter((m) => m.soort === 'buiten');
    expect(buiten.length).toBeGreaterThan(0);
    // Vloer van verdieping 1 op 270 + 30 = 300: de buitenmuren beginnen er 30 cm onder.
    const stukken = s.blokken.filter((b) => b.y === 270 && Object.values(b.zijden ?? {}).some((z) => z?.soort === 'planken'));
    expect(stukken.length).toBeGreaterThan(0);
  });

  it('3D: dakrand op het gelijkvloers waar geen verdieping op staat, niet onder de muren erboven', () => {
    const { plan } = voorbeeldWoning();
    const s = plattegrond3D(plan, planCatalogus, { meubels: false });
    const rand = s.blokken.filter((b) => b.code.startsWith('dakrand_'));
    expect(rand.length).toBeGreaterThan(0);
    expect(rand.every((b) => b.y === 270 && b.h === 32)).toBe(true);
    // Zonder hogere verdieping in beeld: geen dak en geen dakrand.
    expect(plattegrond3D(plan, planCatalogus, { meubels: false, totNiveau: 0 }).blokken.some((b) => b.code.startsWith('dakrand_'))).toBe(false);
    // De muren van verdieping 1 staan op de buitenmuren: daar geen dakrand (overlap met de muur erboven).
    const n1 = s.blokken.filter((b) => b.y === 270 && b.code.startsWith('muur_'));
    for (const r of rand) for (const m of n1) {
      const overlapX = Math.min(r.x + r.b, m.x + m.b) - Math.max(r.x, m.x), overlapZ = Math.min(r.z + r.d, m.z + m.d) - Math.max(r.z, m.z);
      expect(overlapX > 1 && overlapZ > 1).toBe(false);
    }
  });

  it('gevelaanzicht: materialen met patroon, sokkel, vlakken om te verven en omkeerbare maten', () => {
    const plan = doos();
    plan.gevelOntwerp!.sokkel = { materiaal: 'natuursteen', kleur: 'blauwgrijs', hoogte: 30 };
    const g = gevelAanzichten(plan, () => undefined, planCatalogus);
    const boven = g.find((x) => x.kant === 'boven')!;
    const muur = boven.tekening.vormen.find((v) => v.code.startsWith('muur.'))!;
    expect(muur.patroon).toBe('steen');
    expect(muur.patroonKleur).toBe('#bdb8ad');
    expect(boven.vlakken.some((v) => v.sokkel)).toBe(true);
    expect(boven.vlakken.find((v) => !v.sokkel)?.sleutel).toBe('r1:boven');
    // Openingen staan na de muren en sokkels (anders tekent een muur erover).
    const codes = boven.tekening.vormen.map((v) => v.code);
    expect(codes.indexOf('kader.o1')).toBeGreaterThan(Math.max(...codes.map((c, i) => (c.startsWith('muur.') || c.startsWith('sokkel.') ? i : -1))));
    for (const x of g) for (const v of [0, 250, 600, 1000]) expect(x.vanU(x.naarU(v))).toBeCloseTo(v, 6);
    expect(boven.vanY(boven.naarY(90))).toBeCloseTo(90, 6);
    const svg = tekenSvg(boven.tekening);
    expect(svg).toContain('<pattern id="pt-steen-');
    expect(svg).toContain('fill="url(#pt-natuursteen-');
  });

  it('voorbeeldwoning: verdieping in hout, gelijkvloers in baksteen met sokkel', () => {
    const { plan } = voorbeeldWoning();
    const opp = gevelOppervlaktes(plan);
    expect(opp.filter((v) => v.niveau === 1).every((v) => v.keuze?.materiaal === 'hout_staand')).toBe(true);
    expect(opp.filter((v) => v.niveau === 0).every((v) => v.keuze?.materiaal === 'gevelsteen')).toBe(true);
    expect(opp.filter((v) => v.niveau === 0).reduce((t, v) => t + v.sokkel, 0)).toBeGreaterThan(10);
  });
});
