import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  controleerPlan, dakHoogte, dakOpbouw, gevelAanzichten, gevelOnderDak, gevelOppervlaktes, hellendDak, niveauPlan, oppervlakOnderDak,
  plattegrond3D, ruimteMaten, tekenPlattegrond, tekenSvg,
  type DakKeuze, type DakLicht, type Plattegrond,
} from '../src/index.js';
import { planCatalogus, planNaarRegels, type PlanRegelOpties } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

/** Korte vingerafdruk van een uitkomst (functies vallen weg, de volgorde telt mee). */
const afdruk = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);

describe('zonder dakkeuze blijft alles zoals het was', () => {
  // Vingerafdrukken vastgelegd op 15/11, vóór het dak erbij kwam: de voorbeeldwoning heeft geen dakkeuze en moet
  // dus exact dezelfde 3D-blokken, offerteregels, gevelaanzichten, oppervlaktes en meldingen geven.
  const { plan } = voorbeeldWoning();
  const alles = { vloeren: true, wanden: true, binnendeuren: true, ruwbouw: true, inrichting: true, gevel: true };

  it('3D: dezelfde blokken (alle verdiepingen, muren laag, tot een verdieping)', () => {
    expect(afdruk(plattegrond3D(plan, planCatalogus))).toMatchInlineSnapshot(`"0136ec328bb54697"`);
    expect(afdruk(plattegrond3D(plan, planCatalogus, { laag: 110, totNiveau: 1 }))).toMatchInlineSnapshot(`"c88effcc42fd7541"`);
    expect(afdruk(plattegrond3D(plan, planCatalogus, { totNiveau: 0, meubels: false }))).toMatchInlineSnapshot(`"8d4fe5b4687f9836"`);
  });

  it('offerte: dezelfde regels, ook met alle vinkjes aan', () => {
    expect(afdruk(planNaarRegels(plan, alles))).toMatchInlineSnapshot(`"4e0b6e0bd9f8c385"`);
    expect(afdruk(planNaarRegels(plan, { vloeren: true, wanden: true, binnendeuren: true, ruwbouw: false, inrichting: false }))).toMatchInlineSnapshot(`"72ca6e9cfc9d821a"`);
  });

  it('gevelaanzichten, geveloppervlaktes, plattegrond en controles', () => {
    const gevels = gevelAanzichten(plan, () => undefined, planCatalogus);
    expect(afdruk(gevels.map((g) => [g.kant, g.naam, g.tekening, g.vlakken]))).toMatchInlineSnapshot(`"d5c29e20354d159c"`);
    expect(afdruk(gevels.map((g) => tekenSvg(g.tekening)))).toMatchInlineSnapshot(`"3408b1ebe1333567"`);
    expect(afdruk(gevelOppervlaktes(plan))).toMatchInlineSnapshot(`"20eef67ae844c3e4"`);
    expect(afdruk([0, 1].map((n) => tekenPlattegrond(niveauPlan(plan, n), planCatalogus)))).toMatchInlineSnapshot(`"d86cec049b709458"`);
    expect(afdruk(controleerPlan(plan))).toMatchInlineSnapshot(`"4f53cda18c2baa0c"`);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Dak en lichtkoepels
// ---------------------------------------------------------------------------------------------------------------

/** Eén ruimte van 10 × 6 m (op de as), buitenmuur 30 cm: buitenmaat 10,3 × 6,3 m. Eén raam in de bovengevel. */
function doos(dak?: DakKeuze, daklichten?: DakLicht[]): Plattegrond {
  return {
    ruimtes: [{ id: 'r1', naam: 'Leefruimte', type: 'leefruimte', x: 0, y: 0, b: 1000, d: 600, vloer: 'parket_eik', wand: 'wit' }],
    openingen: [{ id: 'o1', soort: 'raam', as: 'h', lijn: 0, midden: 500, breedte: 200, hoogte: 150, borstwering: 90, scharnier: 'begin', naarPlus: true }],
    meubels: [],
    muurhoogte: 270, buitenmuur: 30, binnenmuur: 10,
    gevel: { soort: 'steen', kleur: '#9c4a34' },
    gevelOntwerp: { standaard: { materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' } },
    ...(dak ? { dak } : {}),
    ...(daklichten ? { daklichten } : {}),
  };
}
const zadel = (extra: Partial<DakKeuze> = {}): DakKeuze => ({ vorm: 'zadel', helling: 45, richting: 'onder', oversteek: 50, bedekking: { materiaal: 'pannen', kleur: 'antraciet' }, ...extra });
const plat = (materiaal = 'grind', kleur = 'grijs'): DakKeuze => ({ vorm: 'plat', helling: 35, richting: 'onder', oversteek: 40, bedekking: { materiaal, kleur } });
const koepel = (id: string, x: number, y: number, extra: Partial<DakLicht> = {}): DakLicht => ({ id, type: 'koepel_100', x, y, b: 100, d: 100, ...extra });
const alleRegels = { vloeren: true, wanden: true, binnendeuren: true, ruwbouw: true, inrichting: true, gevel: true, dak: true };

describe('dak: meetkunde van een hellend dak op één rechthoek', () => {
  const buiten = { x: -15, y: -15, b: 1030, d: 630 };

  it('zadeldak: nok in het midden, oppervlakte langs de helling met de oversteek', () => {
    const d = hellendDak(buiten, zadel());
    expect(d.nokAs).toBe('x'); // het dak loopt af naar boven en onder, de nok ligt langs x
    expect([d.p0, d.p1, d.q0, d.q1]).toEqual([-15, 615, -15, 1015]);
    expect(d.nokP).toBe(300);
    expect(d.nok).toBeCloseTo(315, 5); // 45°: de helft van 6,3 m
    expect(dakHoogte(d, -15)).toBeCloseTo(0, 5);
    expect(dakHoogte(d, 300)).toBeCloseTo(315, 5);
    expect(dakHoogte(d, -65)).toBeCloseTo(-50, 5); // de oversteek zakt onder de dakvoet
    // Twee vlakken van (3,15 + 0,50) / cos 45° lang en 10,3 + 2 × 0,5 m breed.
    expect(d.oppervlakte).toBeCloseTo((2 * (365 / Math.cos(Math.PI / 4)) * 1130) / 10000, 6);
    // Boven en onder geven hetzelfde zadeldak.
    expect(hellendDak(buiten, zadel({ richting: 'boven' })).oppervlakte).toBeCloseTo(d.oppervlakte, 9);
  });

  it('lessenaarsdak: loopt af naar de gekozen kant, één vlak over de hele diepte', () => {
    const d = hellendDak(buiten, { ...zadel(), vorm: 'lessenaar', helling: 20, richting: 'links', oversteek: 30 });
    const tan = Math.tan((20 * Math.PI) / 180);
    expect(d.nokAs).toBe('z');
    expect(d.voetP).toBe(-15); // de lage gevel links
    expect(d.nokP).toBe(1015);
    expect(d.nok).toBeCloseTo(1030 * tan, 1);
    expect(dakHoogte(d, -15)).toBeCloseTo(0, 5);
    expect(dakHoogte(d, 1015)).toBeCloseTo(1030 * tan, 5);
    expect(d.oppervlakte).toBeCloseTo((((1030 + 60) / Math.cos((20 * Math.PI) / 180)) * (630 + 60)) / 10000, 6);
    // Naar rechts aflopen spiegelt het dak.
    const r = hellendDak(buiten, { ...zadel(), vorm: 'lessenaar', helling: 20, richting: 'rechts', oversteek: 30 });
    expect([r.voetP, r.nokP]).toEqual([1015, -15]);
    expect(dakHoogte(r, 1015)).toBeCloseTo(0, 5);
  });

  it('gevel onder het dak: een driehoek onder een zadeldak, een trapezium onder een lessenaar', () => {
    const z = hellendDak(buiten, zadel());
    expect(gevelOnderDak(z, -15, 615)).toEqual([[615, 0], [300, 315], [-15, 0]]); // rondom; het dubbele punt in de hoek valt weg
    expect(oppervlakOnderDak(z, -15, 615)).toBeCloseTo((630 * 315) / 2, 3);
    // Twee stukken naast elkaar geven samen dezelfde oppervlakte (topgevel boven twee ruimtes).
    expect(oppervlakOnderDak(z, -15, 200) + oppervlakOnderDak(z, 200, 615)).toBeCloseTo((630 * 315) / 2, 3);
    const l = hellendDak({ x: 0, y: 0, b: 400, d: 600 }, { ...zadel(), vorm: 'lessenaar', helling: 45, richting: 'onder' });
    expect(oppervlakOnderDak(l, 0, 600)).toBeCloseTo((600 * 600) / 2, 3);
    expect(gevelOnderDak(l, 100, 300)).toEqual([[100, 0], [300, 0], [300, 300], [100, 500]]);
  });
});

describe('dakopbouw van het plan', () => {
  it('zonder dakkeuze is er geen opbouw; met daklichten alleen een plat dak met EPDM', () => {
    expect(dakOpbouw(doos())).toBeUndefined();
    const o = dakOpbouw(doos(undefined, [koepel('k1', 300, 200)]))!;
    expect(o.keuze.vorm).toBe('plat');
    expect(o.platBedekking).toEqual({ materiaal: 'epdm', kleur: 'zwart' });
  });

  it('plat dak: oppervlakte op de as van de muren, dakrand rondom, koepelopeningen eraf', () => {
    const o = dakOpbouw(doos(plat()))!;
    expect(o.hellend).toBeUndefined();
    expect(o.terugval).toBeUndefined();
    expect(o.m2Plat).toBeCloseTo(60, 6);
    expect(o.mDakrand).toBeCloseTo(32, 6); // omtrek op de as: 2 × (10 + 6) m
    expect(o.m2Hellend).toBe(0);
    const met = dakOpbouw(doos(plat(), [koepel('k1', 300, 200), koepel('k2', 600, 200, { type: 'lichtstraat_200', b: 200 })]))!;
    expect(met.m2Plat).toBeCloseTo(60 - 1 - 2, 6);
  });

  it('zadeldak op een rechthoek: geen plat dak en geen dakrand meer', () => {
    const o = dakOpbouw(doos(zadel()))!;
    expect(o.top).toBe(0);
    expect(o.hellend?.vorm).toBe('zadel');
    expect(o.plat).toEqual([]);
    expect(o.mDakrand).toBe(0);
    expect(o.m2Hellend).toBeCloseTo(o.hellend!.oppervlakte, 9);
  });

  it('voorbeeldwoning: zadeldak op de verdieping (drie ruimtes, samen één rechthoek), het gelijkvloers blijft plat', () => {
    const { plan } = voorbeeldWoning();
    plan.dak = zadel({ helling: 40, oversteek: 40, plat: { materiaal: 'roofing', kleur: 'leigrijs' } });
    const o = dakOpbouw(plan)!;
    expect(o.top).toBe(1);
    expect(o.terugval).toBeUndefined();
    // Verdieping 8,2 × 3,8 m op de as, buitenmaat 8,5 × 4,1 m.
    expect([o.hellend!.p0, o.hellend!.p1, o.hellend!.q0, o.hellend!.q1]).toEqual([-15, 395, -15, 835]);
    expect(o.platBedekking).toEqual({ materiaal: 'roofing', kleur: 'leigrijs' });
    // Plat: het gelijkvloers (14 × 9 m) zonder het deel onder de verdieping.
    expect(o.m2Plat).toBeCloseTo(14 * 9 - 8.2 * 3.8, 6);
    expect(o.plat.every((s) => s.niveau === 0)).toBe(true);
    expect(controleerPlan(plan, planCatalogus).filter((m) => /dak/i.test(m.melding))).toEqual([]);
  });

  it('terugval: op een L-vorm kan het hellende dak niet, dan is alles plat en staat er een melding', () => {
    const plan = doos(zadel());
    plan.ruimtes.push({ id: 'r2', naam: 'Keuken', type: 'keuken', x: 1000, y: 0, b: 400, d: 300, vloer: 'tegel_grijs', wand: 'wit' });
    const o = dakOpbouw(plan)!;
    expect(o.hellend).toBeUndefined();
    expect(o.terugval).toMatch(/zadeldak kan nog niet op deze vorm.*geen rechthoek.*plat dak/);
    expect(o.m2Plat).toBeCloseTo(60 + 12, 6);
    expect(o.platBedekking).toEqual({ materiaal: 'epdm', kleur: 'zwart' });
    const meldingen = controleerPlan(plan, planCatalogus);
    expect(meldingen.some((m) => m.ernst === 'waarschuwing' && m.melding === o.terugval)).toBe(true);
    // De 3D tekent dan een plat dak (dakrand, geen prisma's).
    const blokken = plattegrond3D(plan, planCatalogus).blokken;
    expect(blokken.some((b) => b.vorm === 'prisma')).toBe(false);
    expect(blokken.some((b) => b.code.startsWith('dakrand_'))).toBe(true);
    // Een samengestelde ruimte die samen een rechthoek vult, kan wel.
    const heel = doos(zadel());
    heel.ruimtes[0]!.delen = [{ x: 1000, y: 0, b: 400, d: 600 }];
    expect(dakOpbouw(heel)!.hellend).toBeDefined();
  });

  it('controles: bedekking die niet bij de vorm past, en een te flauwe helling voor pannen', () => {
    const fout = controleerPlan(doos(zadel({ bedekking: { materiaal: 'grind', kleur: 'grijs' } })), planCatalogus).map((m) => m.melding);
    expect(fout.some((m) => /grind.*past niet op een hellend dak/i.test(m))).toBe(true);
    const flauw = controleerPlan(doos(zadel({ helling: 12 })), planCatalogus).map((m) => m.melding);
    expect(flauw.some((m) => /12° is te vlak voor keramische dakpannen \(minstens 20°/.test(m))).toBe(true);
    expect(controleerPlan(doos(zadel({ helling: 12, bedekking: { materiaal: 'zink', kleur: 'kwarts' } })), planCatalogus).some((m) => /te vlak/.test(m.melding))).toBe(false);
    // Een grote oversteek op een steil dak hangt tot voor de ramen: waarschuwing met de maat.
    const steil = controleerPlan(doos(zadel({ helling: 60, oversteek: 120 })), planCatalogus).map((m) => m.melding);
    expect(steil.some((m) => /120 cm oversteek op 60° hangt de dakvoet 208 cm onder de bovenkant van de muur/.test(m))).toBe(true);
    expect(controleerPlan(doos(zadel()), planCatalogus).some((m) => /hangt de dakvoet/.test(m.melding))).toBe(false); // 45° en 50 cm: 50 cm
  });
});

describe('topgevel in de geveloppervlakte en de ruwbouw', () => {
  it('zadeldak: de twee topgevels komen bij de zijgevels, de gevels met de dakvoet blijven gelijk', () => {
    const zonder = gevelOppervlaktes(doos()), met = gevelOppervlaktes(doos(zadel()));
    const vlak = (lijst: typeof met, kant: string) => lijst.find((v) => v.kant === kant)!;
    const topgevel = (630 * 315) / 2 / 10000; // driehoek van 6,3 m breed en 3,15 m hoog
    for (const kant of ['links', 'rechts']) {
      expect(vlak(met, kant).topgevel).toBeCloseTo(topgevel, 6);
      expect(vlak(met, kant).netto).toBeCloseTo(vlak(zonder, kant).netto + topgevel, 6);
    }
    for (const kant of ['boven', 'onder']) {
      expect(vlak(met, kant).topgevel).toBeUndefined();
      expect(vlak(met, kant).netto).toBeCloseTo(vlak(zonder, kant).netto, 9);
    }
  });

  it('lessenaar: de hoge gevel loopt recht door, de zijgevels zijn schuin afgesneden', () => {
    const met = gevelOppervlaktes(doos({ ...zadel(), vorm: 'lessenaar', helling: 45, richting: 'onder' }));
    const vlak = (kant: string) => met.find((v) => v.kant === kant)!;
    expect(vlak('boven').topgevel).toBeCloseTo((1030 * 630) / 10000, 6); // hoge gevel: 10,3 m × 6,3 m (45°)
    expect(vlak('onder').topgevel).toBeUndefined();
    expect(vlak('links').topgevel).toBeCloseTo((630 * 630) / 2 / 10000, 6);
    expect(vlak('rechts').topgevel).toBeCloseTo((630 * 630) / 2 / 10000, 6);
  });

  it('offerte: de topgevel zit in de gevelafwerking en in de ruwbouw van de buitenmuur', () => {
    const m2 = (plan: Plattegrond, code: string) => planNaarRegels(plan, alleRegels).find((r) => r.code === code)?.hoeveelheid ?? 0;
    const extra = (630 * 315) / 10000; // twee topgevels
    expect(m2(doos(zadel()), 'buitenmuur_kaal')).toBeCloseTo(m2(doos(), 'buitenmuur_kaal') + extra, 0);
    expect(m2(doos(zadel()), 'gevel:gevelsteen:rood:grijs')).toBeCloseTo(m2(doos(), 'gevel:gevelsteen:rood:grijs') + extra, 0);
  });
});

describe('lichtkoepels en lichtstraten', () => {
  it('een koepel telt mee voor het daglicht van de ruimte eronder, niet voor de verluchting', () => {
    // Slaapkamer zonder raam: waarschuwing. Met een koepel van 1 m² (0,8 m² glas) op 6 m² vloer niet meer.
    const kamer = (daklichten?: DakLicht[]): Plattegrond => ({
      ...doos(plat(), daklichten), openingen: [],
      ruimtes: [{ id: 'r1', naam: 'Slaapkamer', type: 'slaapkamer', x: 0, y: 0, b: 300, d: 250, vloer: 'parket_eik', wand: 'wit' }],
    });
    const daglicht = (p: Plattegrond) => controleerPlan(p).filter((m) => /daglicht|geen raam/.test(m.melding)).map((m) => m.melding);
    expect(daglicht(kamer())).toEqual(['Slaapkamer heeft geen raam (daglicht).']);
    expect(daglicht(kamer([koepel('k1', 100, 80)]))).toEqual([]);
    expect(ruimteMaten(kamer([koepel('k1', 100, 80)]), kamer().ruimtes[0]!).daklicht).toBeCloseTo(0.8, 6);
    expect(ruimteMaten(kamer(), kamer().ruimtes[0]!).daklicht).toBe(0);
    // Een te kleine koepel: nog altijd weinig daglicht, en de melding noemt het daklicht.
    const klein = kamer([koepel('k1', 100, 80, { type: 'koepel_60', b: 60, d: 60 })]);
    expect(daglicht(klein)[0]).toMatch(/weinig daglicht \(glas en daklicht 0\.3 m²/);
    // Badkamer: een vaste koepel verlucht niet, de afzuiging blijft gevraagd.
    const bad = kamer([koepel('k1', 100, 80)]);
    bad.ruimtes[0]!.type = 'badkamer';
    expect(controleerPlan(bad).some((m) => /mechanische afzuiging/.test(m.melding))).toBe(true);
  });

  it('3D: opening in de dakplaat, opstand en glas; de dakplaat is niet meer één blok', () => {
    const plan = doos(plat(), [koepel('k1', 300, 200), koepel('k2', 600, 200, { type: 'lichtstraat_200', b: 200 })]);
    const blokken = plattegrond3D(plan, planCatalogus).blokken;
    const dak = blokken.filter((b) => b.code === 'dak_0'), dakplaat = blokken.filter((b) => b.code === 'dakplaat_r1');
    // De dakplaat: samen de hele ruimte min de twee openingen, met een lichte onderkant (het plafond) en verder de
    // kleur van de bedekking. Daarop de bedekking uit de catalogus, als één laag in zo weinig mogelijk stroken.
    expect(dakplaat.reduce((t, b) => t + b.b * b.d, 0)).toBeCloseTo(1000 * 600 - 100 * 100 - 200 * 100, 3);
    expect(dakplaat.every((b) => b.kleur === '#c9c6bf' && b.zijden?.['y+']?.soort === 'grind' && b.zijden?.['x-']?.soort === 'grind')).toBe(true);
    expect(dak.length).toBeLessThanOrEqual(dakplaat.length);
    expect(dak.every((b) => b.soort === 'grind' && b.kleur === '#a8a59e' && b.y + b.h === 300)).toBe(true);
    // Zonder daklichten is de bedekking van een rechthoekig dak één blok (geen naden).
    expect(plattegrond3D(doos(plat()), planCatalogus).blokken.filter((b) => b.code === 'dak_0').map((b) => [b.x, b.z, b.b, b.d])).toEqual([[-0.5, -0.5, 1001, 601]]);
    // Niets van het dak ligt over de openingen.
    const over = (b: { x: number; z: number; b: number; d: number }, l: DakLicht) => Math.min(b.x + b.b, l.x + l.b) - Math.max(b.x, l.x) > 0.1 && Math.min(b.z + b.d, l.y + l.d) - Math.max(b.z, l.y) > 0.1;
    // (De bedekking grijpt een halve centimeter over de rand, onder de opstand: vandaar de marge van 1 cm.)
    for (const l of plan.daklichten!) {
      const binnen = { ...l, x: l.x + 1, y: l.y + 1, b: l.b - 2, d: l.d - 2 };
      expect(blokken.filter((b) => b.code.startsWith('dak_') || b.code.startsWith('dakplaat_')).some((b) => over(b, binnen))).toBe(false);
    }
    // Koepel: vier stukken opstand op het dak (y = 300) en een afgerond blok in glas erop.
    expect(blokken.filter((b) => b.code.startsWith('daklicht_k1_opstand')).map((b) => [b.y, b.h])).toEqual([[300, 15], [300, 15], [300, 15], [300, 15]]);
    const glas = blokken.find((b) => b.code === 'daklicht_k1_koepel')!;
    expect([glas.soort, glas.y, glas.afronding! > 0]).toEqual(['glas', 315, true]);
    // Lichtstraat: een glazen prisma (laag zadeldakje) langs de lange kant.
    const straat = blokken.find((b) => b.code === 'daklicht_k2_glas')!;
    expect([straat.vorm, straat.soort, straat.as, straat.doorsnede?.length]).toEqual(['prisma', 'glas', 'x', 3]);
  });

  it('een koepel kan alleen op een plat dak, volledig boven één ruimte', () => {
    const reden = (plan: Plattegrond, id = 'k1') => dakOpbouw(plan)!.daklichten.find((l) => l.licht.id === id)!.reden;
    expect(reden(doos(plat(), [koepel('k1', 300, 200)]))).toBeUndefined();
    expect(reden(doos(plat(), [koepel('k1', 2000, 200)]))).toMatch(/niet boven een ruimte/);
    expect(reden(doos(zadel(), [koepel('k1', 300, 200)]))).toMatch(/hellende dak.*dakramen zijn voor later/);
    // Voorbeeldwoning: onder de verdieping kan niet, op het lage dak van de leefruimte wel; over een binnenmuur niet.
    const { plan } = voorbeeldWoning();
    plan.daklichten = [koepel('k1', 500, 150), koepel('k2', 350, 560), koepel('k3', 780, 500), koepel('k4', 300, 100, { niveau: 1 })];
    expect(reden(plan, 'k1')).toMatch(/onder een verdieping/);
    expect(reden(plan, 'k2')).toBeUndefined();
    expect(reden(plan, 'k3')).toMatch(/over een muur/);
    expect(reden(plan, 'k4')).toBeUndefined(); // op het platte dak van de verdieping
    const meldingen = controleerPlan(plan, planCatalogus).filter((m) => m.daklicht);
    expect(meldingen.map((m) => [m.daklicht, m.ernst])).toEqual([['k1', 'fout'], ['k3', 'fout']]);
    expect(meldingen[0]!.melding).toBe('Lichtkoepel 100 × 100 ligt onder een verdieping; een koepel kan alleen in een dak.');
    // In 3D en in de offerte tellen alleen de geldige koepels.
    const blokken = plattegrond3D(plan, planCatalogus).blokken;
    expect(['k1', 'k2', 'k3', 'k4'].map((k) => blokken.some((b) => b.code.startsWith(`daklicht_${k}_`)))).toEqual([false, true, false, true]);
    expect(planNaarRegels(plan, alleRegels).find((r) => r.code === 'daklicht:koepel_100')?.hoeveelheid).toBe(2);
    // Met een zadeldak op de verdieping kan de koepel daar niet meer; die op het lage platte dak blijft.
    plan.dak = zadel();
    expect(reden(plan, 'k4')).toMatch(/hellende dak/);
    expect(reden(plan, 'k2')).toBeUndefined();
  });

  it('te dicht bij een muur of bij elkaar: een waarschuwing en een fout', () => {
    const dicht = controleerPlan(doos(plat(), [koepel('k1', 20, 200)]), planCatalogus).find((m) => m.daklicht === 'k1')!;
    expect([dicht.ernst, /minder dan 30 cm van een muur/.test(dicht.melding)]).toEqual(['waarschuwing', true]);
    const samen = controleerPlan(doos(plat(), [koepel('k1', 300, 200), koepel('k2', 410, 200)]), planCatalogus).filter((m) => m.daklicht);
    expect(samen.map((m) => [m.daklicht, m.ernst])).toEqual([['k2', 'fout']]);
  });

  it('niveauPlan geeft alleen de daklichten van die verdieping', () => {
    const plan = doos(plat(), [koepel('k1', 300, 200), koepel('k2', 300, 200, { niveau: 1 })]);
    expect(niveauPlan(plan, 0).daklichten?.map((l) => l.id)).toEqual(['k1']);
    expect(niveauPlan(plan, 1).daklichten?.map((l) => l.id)).toEqual(['k2']);
    expect('daklichten' in niveauPlan(doos(), 0)).toBe(false);
  });
});

describe('3D van het dak', () => {
  it('zadeldak: opbouw en bedekking als prisma langs de nok, nokvorst, topgevels in het gevelmateriaal', () => {
    const plan = doos(zadel());
    const { blokken, kader } = plattegrond3D(plan, planCatalogus);
    const bedekking = blokken.find((b) => b.code === 'dak_bedekking')!;
    expect([bedekking.vorm, bedekking.as, bedekking.soort, bedekking.kleur]).toEqual(['prisma', 'x', 'pannen', '#3d3e40']);
    // Met de oversteek: 50 cm buiten de gevel aan elke kant, en de dakvoet zakt 50 cm onder de bovenkant van de muur.
    expect([bedekking.x, bedekking.b, bedekking.z, bedekking.d]).toEqual([-65, 1130, -65, 730]);
    const opbouw = blokken.find((b) => b.code === 'dak_opbouw')!;
    expect(opbouw.y).toBeCloseTo(270 - 50, 5);
    expect(Math.max(...opbouw.doorsnede!.map((q) => q[1]))).toBeCloseTo(270 + 315 + 16 / Math.cos(Math.PI / 4), 1);
    expect(blokken.find((b) => b.code === 'dak_nok')?.vorm).toBe('cilinder');
    // Topgevels links en rechts: een driehoek door de dikte van de muur, buiten baksteen, binnen de wandafwerking.
    const top = blokken.filter((b) => b.code.startsWith('topgevel_'));
    expect(top.map((b) => [b.as, b.x, b.b])).toEqual([['x', -15, 30], ['x', 985, 30]]);
    expect(top[0]!.zijden).toEqual({ 'x-': { soort: 'steen', kleur: '#9c4a34', voeg: '#bdb8ad' }, 'x+': { soort: 'gevel', kleur: '#f2f1ec' } });
    expect(top[0]!.doorsnede).toEqual([[15, 269], [585, 269], [585, 300], [300, 585], [15, 300]]);
    // De muren langs de nok: een wig die de schuine onderkant volgt (binnen zichtbaar); geen dakrand en geen plat dak.
    expect(blokken.filter((b) => b.code.startsWith('dakwig_')).length).toBe(2);
    expect(blokken.some((b) => b.code.startsWith('dakrand_') || b.code === 'dak_0' || b.code === 'dakplaat_r1')).toBe(false);
    // De muurkop onder de topgevel is geen wit vlak meer.
    expect(blokken.filter((b) => b.code.startsWith('muur_') && b.zijden?.['y+']?.soort === 'steen').length).toBeGreaterThan(0);
    // Het kader (voor de camera) omvat het dak.
    expect(kader.h).toBeGreaterThan(270 + 315);
    expect([kader.x, kader.z]).toEqual([-66, -65]);
  });

  it('lessenaar: de hoge gevel als recht stuk met een wig, de lage gevel alleen een wig binnen', () => {
    const blokken = plattegrond3D(doos({ ...zadel(), vorm: 'lessenaar', helling: 20, richting: 'onder', oversteek: 30 }), planCatalogus).blokken;
    const tan = Math.tan((20 * Math.PI) / 180);
    const hoog = blokken.find((b) => b.code === 'dakmuur_h0_0')!; // de bovengevel (y = 0) is de hoge kant
    expect(hoog.soort).toBe('steen');
    expect(hoog.y + hoog.h).toBeCloseTo(270 + 600 * tan, 1); // tot de binnenkant van de muur
    expect(blokken.some((b) => b.code === 'dakmuur_h600_0')).toBe(false);
    expect(blokken.find((b) => b.code === 'dakwig_h0_0')?.soort).toBe('steen'); // zichtbaar in de gevel
    expect(blokken.find((b) => b.code === 'dakwig_h600_0')?.soort).toBe('gevel'); // alleen van binnen
    expect(blokken.some((b) => b.code === 'dak_nok')).toBe(false);
  });

  it('muren laag, tot een verdieping of "dak niet tonen": de bovenste verdieping blijft open', () => {
    const plan = doos(zadel());
    const dakBlokken = (opties: Parameters<typeof plattegrond3D>[2]) => plattegrond3D(plan, planCatalogus, opties).blokken.filter((b) => /^(dak|topgevel)/.test(b.code)).length;
    expect(dakBlokken({})).toBeGreaterThan(4);
    expect(dakBlokken({ laag: 110 })).toBe(0);
    expect(dakBlokken({ totNiveau: 0 })).toBe(0);
    expect(dakBlokken({ dak: false })).toBe(0);
    // Zonder dak op de bovenste verdieping zijn de blokken dezelfde als zonder dakkeuze.
    expect(plattegrond3D(plan, planCatalogus, { dak: false }).blokken).toEqual(plattegrond3D(doos(), planCatalogus).blokken);
  });

  it('plat met dakkeuze: ook de bovenste verdieping krijgt een dak met dakrand; lagere daken krijgen de bedekking', () => {
    const { plan } = voorbeeldWoning();
    plan.dak = plat('groendak', 'sedum');
    const blokken = plattegrond3D(plan, planCatalogus).blokken;
    const yTop = 2 * 270 + 30 + 30; // bovenkant van het dak van de verdieping
    // De verdieping (drie ruimtes) krijgt één blok bedekking; het lage dak (een L) twee stroken.
    expect(blokken.filter((b) => b.code === 'dak_1').map((b) => [b.soort, b.kleur, b.y + b.h, b.b, b.d])).toEqual([['groendak', '#6f8a4f', yTop, 821, 381]]);
    expect(blokken.filter((b) => b.code === 'dak_0').map((b) => b.soort)).toEqual(['groendak', 'groendak']);
    expect(blokken.filter((b) => b.code === 'dakplaat_slk3').length).toBe(1);
    expect(blokken.filter((b) => b.code.startsWith('dakrand_') && b.y > 500).length).toBeGreaterThan(3);
    // Zonder dakkeuze heeft de verdieping geen dak (zoals vroeger).
    expect(plattegrond3D(voorbeeldWoning().plan, planCatalogus).blokken.some((b) => b.code === 'dak_slk3' || b.code === 'dak_1')).toBe(false);
  });
});

describe('dak in de offerte en in het gevelaanzicht', () => {
  it('groep Dak: alleen met het vinkje én een dakkeuze; m² bedekking, meter dakrand en koepels per stuk', () => {
    const dakRegels = (plan: Plattegrond, opties: PlanRegelOpties = alleRegels) => planNaarRegels(plan, opties).filter((r) => r.groep === 'Dak');
    // Geen dakkeuze: geen regels, ook met het vinkje aan (een bestaand project verandert dus niet).
    expect(dakRegels(doos())).toEqual([]);
    expect(planNaarRegels(voorbeeldWoning().plan, alleRegels)).toEqual(planNaarRegels(voorbeeldWoning().plan, { ...alleRegels, dak: undefined }));
    // Dakkeuze zonder vinkje: ook niets.
    expect(dakRegels(doos(plat()), { ...alleRegels, dak: false })).toEqual([]);
    const platRegels = dakRegels(doos(plat(), [koepel('k1', 300, 200), koepel('k2', 500, 200)]));
    expect(platRegels.map((r) => [r.code, r.eenheid, r.hoeveelheid])).toEqual([
      ['dak:plat:grind:grijs', 'm²', 58],
      ['dakrand', 'm', 32],
      ['daklicht:koepel_100', 'stuk', 2],
    ]);
    const zadelRegels = dakRegels(doos(zadel()));
    expect(zadelRegels.map((r) => [r.code, r.eenheid, r.hoeveelheid])).toEqual([['dak:hellend:pannen:antraciet', 'm²', 116.7]]);
    expect(zadelRegels[0]!.omschrijving).toBe('Keramische dakpannen, antraciet mat (zadeldak 45°, langs de helling gemeten, met 50 cm oversteek)');
  });

  it('gevelaanzicht: topgevel als pad met patroon, het dak in doorsnede en als vlak, hoogte tot de nok', () => {
    const plan = doos(zadel());
    const gevels = gevelAanzichten(plan, () => undefined, planCatalogus);
    const zij = gevels.find((g) => g.kant === 'links')!, voor = gevels.find((g) => g.kant === 'onder')!;
    // Zijgevel: de topgevel hoort bij hetzelfde muurvlak (zelfde sleutel om te verven), met het baksteenpatroon.
    const top = zij.tekening.vormen.find((v) => v.code === 'topgevel.0.v0_0')!;
    expect([top.patroon, top.vulling, !!top.pad]).toEqual(['steen', '#9c4a34', true]);
    expect(zij.vlakken.filter((v) => v.sleutel === 'r1:links').map((v) => v.code)).toEqual(['muur.0.v0_0', 'topgevel.0.v0_0']);
    expect(zij.tekening.vormen.some((v) => v.code === 'dak.doorsnede' && v.vulling === '#3d3e40')).toBe(true);
    expect(zij.tekening.vormen.some((v) => v.code.startsWith('dakrand.'))).toBe(false);
    // De nok ligt boven de oude bovenkant van de tekening: y wordt negatief, naarY en vanY blijven kloppen.
    expect(zij.naarY(0)).toBe(300);
    expect(zij.vanY(zij.naarY(585))).toBeCloseTo(585, 5);
    expect(Math.min(...zij.tekening.vormen.map((v) => v.y))).toBeLessThan(0);
    // Hoogtematen: tot de dakvoet (270) en dan tot de nok.
    const hoogtes = zij.tekening.maatlijnen.filter((m) => m.code.startsWith('hoogte.')).map((m) => m.tekst);
    expect(hoogtes).toEqual(['270', String(Math.round(hellendDak({ x: -15, y: -15, b: 1030, d: 630 }, zadel()).top))]);
    // Voorgevel (kant van de dakvoet): het dakvlak met het pannenpatroon, breder dan de gevel door de oversteek.
    const vlak = voor.tekening.vormen.find((v) => v.code === 'dak.vlak')!;
    expect([vlak.patroon, vlak.breedte]).toEqual(['pannen', 1130]);
    // De tekening blijft geldige SVG, met het patroon ook op het pad.
    const svg = tekenSvg(zij.tekening);
    expect(svg).toContain('<path d="M ');
    expect(svg.match(/class="patroon"/g)!.length).toBeGreaterThanOrEqual(2);
    // Plat dak met koepel: opstand en glas boven de dakrand.
    const platGevel = gevelAanzichten(doos(plat(), [koepel('k1', 300, 200)]), () => undefined, planCatalogus).find((g) => g.kant === 'onder')!;
    expect(platGevel.tekening.vormen.filter((v) => v.code.startsWith('daklicht.k1')).map((v) => v.code)).toEqual(['daklicht.k1.opstand', 'daklicht.k1.glas']);
  });

  it('plattegrond: daklichten zijn aan te klikken, het hellende dak krijgt zijn lijnen', () => {
    const svg = tekenPlattegrond(doos(plat(), [koepel('k1', 300, 200)]), planCatalogus, { selectie: { soort: 'daklicht', id: 'k1' } });
    expect(svg).toContain('data-soort="daklicht" data-id="k1"');
    const lijnen = tekenPlattegrond(doos(zadel()), planCatalogus, { dakLijnen: { omtrek: { x: -65, y: -65, b: 1130, d: 730 }, nok: { x1: -65, y1: 300, x2: 1065, y2: 300 }, tekst: 'nok' } });
    expect(lijnen).toContain('>nok</text>');
  });
});
