import { describe, expect, it } from 'vitest';
import {
  controleerPlan, nieuwToestel, opToestelVlak, plattegrond3D, puntGroep, tegenWand, tekenPlattegrond, toestelTekenBeeld, toestelVlak, verschuifLeidingPunten,
  type Leiding, type Plattegrond, type Toestel,
} from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { techniekCatalogus as tc } from '../voorbeelden/techniek.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

/** Het scherm voor de techniek (ronde 10b): de catalogus aan de schermen, en de hulp voor de maatvraag en het slepen. */

function kamer(): Plattegrond {
  return {
    ruimtes: [{ id: 'r1', naam: 'Kamer', type: 'leefruimte', x: 0, y: 0, b: 600, d: 400, vloer: 'parket_eik', wand: 'wit' }],
    openingen: [], meubels: [], muurhoogte: 270, buitenmuur: 30, binnenmuur: 10, gevel: { soort: 'steen', kleur: '#9c4a34' },
  };
}
const toestel = (plan: Plattegrond, type: string, x: number, y: number): Toestel => {
  const t = nieuwToestel(tc, type, type, x, y, plan.muurhoogte);
  return t.aan === 'wand' || t.aan === 'buiten' ? tegenWand(plan, t, tc.toestellen[type]!, { maxAfstand: 2000 })!.toestel : t;
};

describe('techniek op de schermen: de catalogus', () => {
  it('de plancatalogus van de schermen kent de techniek', () => {
    expect(planCatalogus.techniek).toBe(tc);
  });
  it('een plan zonder techniek verandert niet: tekening, 3D en controles zijn die van zonder catalogus', () => {
    const { plan } = voorbeeldWoning();
    const zonder = { ...planCatalogus, techniek: undefined };
    expect(tekenPlattegrond(plan, planCatalogus)).toBe(tekenPlattegrond(plan, zonder));
    expect(tekenPlattegrond(plan, planCatalogus, { techniek: ['elektriciteit'] })).toBe(tekenPlattegrond(plan, zonder));
    expect(plattegrond3D(plan, planCatalogus, { dingen: true, aanleg: true })).toEqual(plattegrond3D(plan, zonder, { dingen: true, aanleg: true }));
    expect(controleerPlan(plan, planCatalogus)).toEqual(controleerPlan(plan, zonder));
  });
  it('het teken van elk toestel als klein beeld voor het palet', () => {
    for (const [code, type] of Object.entries(tc.toestellen)) {
      const svg = toestelTekenBeeld(type, 36);
      expect(svg, code).toMatch(/^<svg [^>]*viewBox="[-\d. ]+" width="36" height="36"/);
      expect(svg, code).not.toMatch(/NaN|undefined/);
    }
  });
});

describe('toestelVlak: van de hoek tot het midden, langs de wand', () => {
  it('binnen tegen de bovenmuur: van de linkerhoek, en weer op dezelfde plaats', () => {
    const plan = kamer();
    const t = toestel(plan, 'stopcontact', 100, 30);
    const v = toestelVlak(plan, t, tc.toestellen.stopcontact!)!;
    // Binnenvlak van de bovenmuur: x van 15 tot 585 (buitenmuren van 30 cm op de as).
    expect(v.buiten).toBe(false);
    expect(v.namen).toEqual(['links', 'rechts']);
    expect(v.van).toEqual([15, 15]);
    expect(v.tot).toEqual([585, 15]);
    expect(v.s).toBeCloseTo(85, 1);
    const terug = opToestelVlak(t, v, v.s);
    expect([terug.x, terug.y]).toEqual([t.x, t.y]);
    const verder = opToestelVlak(t, v, 200);
    expect(verder.x).toBeCloseTo(215, 1);
    expect(verder.y).toBe(t.y);
  });
  it('binnen tegen een staande muur: boven en onder', () => {
    const plan = kamer();
    const t = toestel(plan, 'schakelaar', 590, 300);
    const v = toestelVlak(plan, t, tc.toestellen.schakelaar!)!;
    expect(v.namen).toEqual(['boven', 'onder']);
    expect(v.s).toBeCloseTo(285, 1);
    expect(v.lengte).toBeCloseTo(370, 1);
  });
  it('buiten tegen de gevel: de buitenhoeken, gezien van buiten (met de vrije ruimte achter)', () => {
    const plan = kamer();
    const t = toestel(plan, 'airco_buiten', 200, 460);
    const type = tc.toestellen.airco_buiten!;
    const v = toestelVlak(plan, t, type)!;
    expect(v.buiten).toBe(true);
    // Onderkant van het plan: van buiten gezien loopt de gevel van links (x = −15) naar rechts (x = 615).
    expect(v.lengte).toBeCloseTo(630, 1);
    expect(v.diep).toBe(type.d / 2 + (type.vrij?.achter ?? 0));
    const s = v.s;
    expect(opToestelVlak(t, v, s).x).toBeCloseTo(t.x, 1);
  });
  it('een toestel aan het plafond of los op de vloer staat tegen geen wand', () => {
    const plan = kamer();
    expect(toestelVlak(plan, nieuwToestel(tc, 'lichtpunt', 'l', 300, 200, 270), tc.toestellen.lichtpunt!)).toBeUndefined();
    expect(toestelVlak(plan, nieuwToestel(tc, 'boiler', 'b', 300, 200, 270), tc.toestellen.boiler!)).toBeUndefined();
  });
});

describe('leidingen die meegaan', () => {
  const l: Leiding = { id: 'l', soort: 'kabel', hoogte: 'vloer', punten: [[100, 50], [100, 200], [400, 200]] };
  it('een uiteinde verschoven: de leiding blijft haaks, langs de kortste weg', () => {
    // Het toestel aan het begin 30 cm naar rechts: het staande stuk gaat mee, het liggende wordt korter.
    expect(verschuifLeidingPunten(l, (p, i) => (i === 0 ? [p[0] + 30, p[1]] : undefined)).punten).toEqual([[130, 50], [130, 200], [400, 200]]);
    // 30 cm naar boven: het staande stuk wordt langer, geen knik nodig.
    expect(verschuifLeidingPunten(l, (p, i) => (i === 0 ? [p[0], p[1] - 30] : undefined)).punten).toEqual([[100, 20], [100, 200], [400, 200]]);
    // Het einde 50 cm naar onder: het liggende stuk schuift mee, het staande wordt langer (niet schuin).
    expect(verschuifLeidingPunten(l, (p, i) => (i === 2 ? [p[0], p[1] + 50] : undefined)).punten).toEqual([[100, 50], [100, 250], [400, 250]]);
  });
  it('alles mee: gewoon verschoven, zonder knik', () => {
    const uit = verschuifLeidingPunten(l, (p) => [p[0] + 10, p[1] + 20]);
    expect(uit.punten).toEqual([[110, 70], [110, 220], [410, 220]]);
  });
  it('niets mee: dezelfde leiding', () => {
    expect(verschuifLeidingPunten(l, () => undefined)).toBe(l);
  });
  it('de helft mee (een ruimte versleept): haaks en zonder heen en terug, met de hoogtes mee', () => {
    const h: Leiding = { ...l, hoogtes: [-5, -5, -5] };
    const uit = verschuifLeidingPunten(h, (p) => (p[0] < 200 ? [p[0], p[1] + 40] : undefined));
    expect(uit.punten).toEqual([[100, 90], [100, 200], [400, 200]]);
    expect(uit.hoogtes).toEqual([-5, -5, -5]);
    // Zijwaarts: de knik waar de leiding de ruimte verlaat.
    const zij = verschuifLeidingPunten(l, (p) => (p[0] < 200 ? [p[0] + 40, p[1]] : undefined));
    expect(zij.punten).toEqual([[140, 50], [140, 200], [400, 200]]);
  });
  it('een stuk op of neer (twee punten op dezelfde plaats) blijft, en wordt samen versleept', () => {
    const stijg: Leiding = { id: 's', soort: 'afvoer', hoogte: 'vloer', punten: [[0, 0], [100, 0], [100, 0], [100, 80]], hoogtes: [-5, -5, -305, -305] };
    expect(puntGroep(stijg, 2)).toEqual([1, 2]);
    expect(puntGroep(stijg, 0)).toEqual([0]);
    const uit = verschuifLeidingPunten(stijg, (p, i) => (i === 1 || i === 2 ? [p[0] + 20, p[1]] : undefined));
    expect(uit.punten.length).toBe(5);
    expect(uit.hoogtes!.length).toBe(5);
  });
});
