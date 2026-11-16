/**
 * Herstellingen uit de doorloop op gebruiksgemak (16/11, deel A): het dak zonder keuze is in elke weergave hetzelfde
 * (A3), een verdieping boven niets geeft een melding (A4) en de uitgezette techniek heeft staanders op de hoeken (A9).
 */
import { describe, expect, it } from 'vitest';
import {
  constructie3D, controleerPlan, dakVan, planMetDak, plattegrond3D, zonderOndergrond,
  type Plattegrond, type Ruimte,
} from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';
import { woningOpbouwCatalogus } from '../voorbeelden/woningopbouw.js';

const cat = { ...planCatalogus, opbouw: woningOpbouwCatalogus };
const kamer = (id: string, x: number, y: number, b: number, d: number, niveau = 0): Ruimte =>
  ({ id, naam: `Kamer ${id}`, type: 'leefruimte', x, y, b, d, vloer: 'parket_eik', wand: 'wit', niveau });

/** Een L-vorm: 800 × 500 en daaronder 400 × 400, met een binnenmuur ertussen (zoals in de doorloop), zonder dakkeuze. */
function lVorm(): Plattegrond {
  return {
    ruimtes: [kamer('a', 0, 0, 800, 500), kamer('b', 0, 500, 400, 400)],
    openingen: [], meubels: [], muurhoogte: 270, buitenmuur: 30, binnenmuur: 10, gevel: { soort: 'steen', kleur: '#9c4a34' },
  };
}
const hoogste = (blokken: { y: number; h: number }[]) => Math.max(...blokken.map((b) => b.y + b.h));

describe('dak zonder keuze: overal hetzelfde platte dak (doorloop A3)', () => {
  it('de afgewerkte 3D toont het dak dat de constructie ook toont; de rekenmotor blijft zonder keuze', () => {
    const plan = lVorm();
    expect(plan.dak).toBeUndefined();
    const getoond = planMetDak(plan);
    expect(getoond.dak?.vorm).toBe('plat');
    // De offerte en de controles blijven bij het plan zelf: daar telt het dak pas mee met een keuze.
    expect(dakVan(plan)).toBeUndefined();
    const open = plattegrond3D(plan, cat).blokken, af = plattegrond3D(getoond, cat).blokken;
    // Vroeger: een open doos (geen dakrand op de bovenste verdieping). Nu: een dakrand, net zoals in de constructie.
    expect(open.some((b) => b.code.startsWith('dakrand_'))).toBe(false);
    expect(af.some((b) => b.code.startsWith('dakrand_'))).toBe(true);
    const skelet = constructie3D(plan, cat).blokken;
    expect(Math.abs(hoogste(af) - hoogste(skelet))).toBeLessThan(40);
  });

  it('een plan met een dakkeuze of zonder ruimtes blijft ongemoeid', () => {
    const { plan } = voorbeeldWoning();
    const metKeuze = { ...plan, dak: { vorm: 'zadel', helling: 40, richting: 'onder', oversteek: 20, bedekking: { materiaal: 'pannen', kleur: 'rood' } } } as Plattegrond;
    expect(planMetDak(metKeuze)).toBe(metKeuze);
    const leeg: Plattegrond = { ...lVorm(), ruimtes: [] };
    expect(planMetDak(leeg)).toBe(leeg);
  });
});

describe('verdieping boven niets (doorloop A4)', () => {
  it('één rechthoek boven een L-vorm ligt voor de lege hoek boven niets, en de controle meldt het', () => {
    const plan = lVorm();
    plan.verdiepingen = [{ naam: 'Gelijkvloers' }, { naam: 'Verdieping 1' }];
    const boven = kamer('v', 0, 0, 800, 900, 1);
    plan.ruimtes.push(boven);
    // De lege hoek is 400 × 400 (16 m²); een strook ter dikte van een muur langs de L telt als gedragen.
    const los = zonderOndergrond(plan, boven);
    expect(los).toBeGreaterThan(12);
    expect(los).toBeLessThan(16.5);
    const melding = controleerPlan(plan).find((m) => m.ruimte === 'v' && m.melding.includes('boven niets'));
    expect(melding?.ernst).toBe('waarschuwing');
    expect(melding?.melding).toMatch(/^Verdieping 1: Kamer v ligt voor \d+,\d m² boven niets/);
  });

  it('dezelfde vorm als beneden (twee ruimtes, met de muur ertussen) ligt nergens boven niets', () => {
    const plan = lVorm();
    plan.verdiepingen = [{ naam: 'Gelijkvloers' }, { naam: 'Verdieping 1' }];
    plan.ruimtes.push(kamer('va', 0, 0, 800, 500, 1), kamer('vb', 0, 500, 400, 400, 1));
    expect(zonderOndergrond(plan, plan.ruimtes[2]!)).toBe(0);
    expect(zonderOndergrond(plan, plan.ruimtes[3]!)).toBe(0);
    expect(controleerPlan(plan).some((m) => m.melding.includes('boven niets'))).toBe(false);
  });

  it('de voorbeeldwoning (een kleinere verdieping boven een groter gelijkvloers) krijgt geen melding', () => {
    const { plan } = voorbeeldWoning();
    expect(controleerPlan(plan).some((m) => m.melding.includes('boven niets'))).toBe(false);
    expect(plan.ruimtes.every((r) => zonderOndergrond(plan, r) === 0)).toBe(true);
  });
});

describe('techniek uitgezet: de lijn op plafondhoogte hangt niet los (doorloop A9)', () => {
  it('een staander op elke hoek van de buitenmuren, van de lage wand tot onder de lijn', () => {
    const plan = lVorm();
    const s = plattegrond3D(plan, cat, { techniek: { weergave: 'uitgezet' } });
    const staanders = s.blokken.filter((b) => b.code.startsWith('uitgezet_staander_0_'));
    // Een L-vorm heeft zes hoeken; geen staander waar een binnenmuur de buitenmuur raakt.
    expect(staanders.length).toBe(6);
    for (const b of staanders) {
      expect(b.y).toBe(12);
      expect(b.y + b.h).toBeCloseTo(270 - 2, 5);
    }
  });
});
