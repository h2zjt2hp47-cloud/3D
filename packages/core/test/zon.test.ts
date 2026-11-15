import { describe, expect, it } from 'vitest';
import {
  BELGIE, dagVanJaar, gevelRichting, niveauPlan, plattegrond3D, tekenPlattegrond, uurTekst, utcVerschil, windrichting, zomertijd, zonOpEnOnder, zonOpGevels,
  zonRichtingOpPlan, zonTekst, zonnestand,
  type Blok,
} from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

/** Hoogste stand van de zon op een dag (per minuut gezocht). */
function middag(maand: number, dag: number) {
  const t = zonOpEnOnder(maand, dag)!;
  return { ...t, stand: zonnestand({ maand, dag, uur: t.middag }) };
}

describe('stand van de zon', () => {
  it('dag van het jaar en zomertijd', () => {
    expect(dagVanJaar(1, 1)).toBe(1);
    expect(dagVanJaar(6, 21)).toBe(172);
    expect(dagVanJaar(12, 31)).toBe(365);
    expect([zomertijd(3, 21), zomertijd(6, 21), zomertijd(9, 21), zomertijd(12, 21)]).toEqual([false, true, true, false]);
    expect([utcVerschil(6, 21), utcVerschil(12, 21)]).toEqual([2, 1]);
  });

  it('bekende waarden voor België (51° N): 21 juni ±62°, 21 december ±16°, equinox ±39°, telkens in het zuiden', () => {
    const zomer = middag(6, 21), winter = middag(12, 21), lente = middag(3, 21), herfst = middag(9, 21);
    expect(zomer.stand.hoogte).toBeGreaterThan(61.5);
    expect(zomer.stand.hoogte).toBeLessThan(63);
    expect(winter.stand.hoogte).toBeGreaterThan(15);
    expect(winter.stand.hoogte).toBeLessThan(16.5);
    for (const e of [lente, herfst]) {
      expect(e.stand.hoogte).toBeGreaterThan(38);
      expect(e.stand.hoogte).toBeLessThan(40.5);
    }
    for (const e of [zomer, winter, lente, herfst]) expect(Math.abs(e.stand.azimut - 180)).toBeLessThan(1);
    // 90° − breedte ± 23,44° (de helling van de aardas).
    expect(zomer.stand.hoogte).toBeCloseTo(90 - 51 + 23.44, 0);
    expect(winter.stand.hoogte).toBeCloseTo(90 - 51 - 23.44, 0);
  });

  it('de zon staat op de klok niet om 12 u in het zuiden: ±12.45 u in de winter, ±13.45 u in de zomer', () => {
    expect(middag(12, 21).middag).toBeGreaterThan(12.5);
    expect(middag(12, 21).middag).toBeLessThan(12.8);
    expect(middag(6, 21).middag).toBeGreaterThan(13.6);
    expect(middag(6, 21).middag).toBeLessThan(13.9);
  });

  it('opkomst in het oosten, ondergang in het westen; zonsopgang en -ondergang zoals in de almanak (± 12 min)', () => {
    // Brussel: 21 juni op 5.29 u, onder 22.00 u; 21 december op 8.42 u, onder 16.39 u (met breking; wij rekenen zonder).
    const zomer = zonOpEnOnder(6, 21)!, winter = zonOpEnOnder(12, 21)!;
    expect(Math.abs(zomer.op - (5 + 29 / 60))).toBeLessThan(0.2);
    expect(Math.abs(zomer.onder - 22)).toBeLessThan(0.2);
    expect(Math.abs(winter.op - (8 + 42 / 60))).toBeLessThan(0.2);
    expect(Math.abs(winter.onder - (16 + 39 / 60))).toBeLessThan(0.2);
    // In de zomer komt de zon op in het noordoosten en gaat ze onder in het noordwesten; in de winter zuidoost en zuidwest.
    expect(windrichting(zonnestand({ maand: 6, dag: 21, uur: zomer.op + 0.1 }).azimut)).toBe('noordoost');
    expect(windrichting(zonnestand({ maand: 6, dag: 21, uur: zomer.onder - 0.1 }).azimut)).toBe('noordwest');
    expect(windrichting(zonnestand({ maand: 12, dag: 21, uur: winter.op + 0.1 }).azimut)).toBe('zuidoost');
    expect(windrichting(zonnestand({ maand: 12, dag: 21, uur: winter.onder - 0.1 }).azimut)).toBe('zuidwest');
    // Voormiddag oost van het zuiden, namiddag west.
    expect(zonnestand({ maand: 6, dag: 21, uur: 9 }).azimut).toBeLessThan(180);
    expect(zonnestand({ maand: 6, dag: 21, uur: 18 }).azimut).toBeGreaterThan(180);
  });

  it('onder de horizon is er geen zon', () => {
    for (const [maand, uur] of [[6, 1], [6, 23.5], [12, 6], [12, 18]] as const) {
      const s = zonnestand({ maand, dag: 21, uur });
      expect(s.hoogte).toBeLessThan(0);
      expect(zonTekst(s)).toBe('onder de horizon (geen zon)');
    }
    expect(zonTekst({ azimut: 225, hoogte: 34.4 })).toBe('zuidwest, 34° hoog');
    expect(uurTekst(13.5)).toBe('13.30 u');
  });

  it('13 u op de klok: 61° in juni, 15° in december', () => {
    const juni = zonnestand({ maand: 6, dag: 21, uur: 13 }), dec = zonnestand({ maand: 12, dag: 21, uur: 13 });
    expect(Math.round(juni.hoogte)).toBe(61);
    expect(Math.round(dec.hoogte)).toBe(15);
    expect(windrichting(juni.azimut)).toBe('zuid');
    expect(windrichting(dec.azimut)).toBe('zuid');
    // Verder naar het zuiden staat de zon hoger; op de evenaar bij de equinox bijna loodrecht.
    expect(zonnestand({ maand: 3, dag: 21, uur: 12 }, { breedte: 0, lengte: 0 }, 0).hoogte).toBeGreaterThan(86);
    expect(BELGIE.breedte).toBe(51);
  });
});

describe('oriëntatie van de woning', () => {
  it('zonder noordrichting is de bovenkant van het plan het noorden', () => {
    expect(zonRichtingOpPlan({ azimut: 180, hoogte: 40 })).toBe(180); // zon in het zuiden = onderkant van het plan
    expect(zonRichtingOpPlan({ azimut: 180, hoogte: 40 }, 90)).toBe(270); // noord rechts: het zuiden ligt links
    expect([gevelRichting('boven'), gevelRichting('rechts'), gevelRichting('onder'), gevelRichting('links')]).toEqual([0, 90, 180, 270]);
    expect(windrichting(gevelRichting('rechts', 90))).toBe('noord');
    expect(windrichting(gevelRichting('boven', 135))).toBe('zuidwest');
  });

  it('zon per gevel op 21 juni: de zuidgevel midden op de dag, de noordgevel alleen vroeg en laat', () => {
    const g = Object.fromEntries(zonOpGevels(6, 21).map((x) => [x.kant, x]));
    expect(g.onder!.windstreek).toBe('zuid');
    expect(g.onder!.periodes.length).toBe(1);
    expect(g.onder!.periodes[0]!.van).toBeGreaterThan(8.5);
    expect(g.onder!.periodes[0]!.tot).toBeLessThan(19);
    // De noordgevel krijgt in de zomer twee keer zon: na zonsopgang en voor zonsondergang.
    expect(g.boven!.windstreek).toBe('noord');
    expect(g.boven!.periodes.length).toBe(2);
    expect(g.boven!.periodes[0]!.van).toBeLessThan(6);
    expect(g.boven!.periodes[1]!.tot).toBeGreaterThan(21.5);
    // Oost in de voormiddag, west in de namiddag; samen is elke gevel hoogstens de hele dag in de zon.
    expect(g.rechts!.periodes[0]!.tot).toBeLessThan(14.2);
    expect(g.links!.periodes[0]!.van).toBeGreaterThan(13.4);
    const dag = zonOpEnOnder(6, 21)!;
    for (const x of Object.values(g)) expect(x!.uren).toBeLessThanOrEqual(dag.onder - dag.op + 0.2);
    expect(g.onder!.uren + g.boven!.uren).toBeCloseTo(dag.onder - dag.op, 0);
  });

  it('zon per gevel op 21 december: de noordgevel krijgt geen zon; de noordrichting draait alles mee', () => {
    const winter = Object.fromEntries(zonOpGevels(12, 21).map((x) => [x.kant, x]));
    expect(winter.boven!.periodes).toEqual([]);
    expect(winter.boven!.uren).toBe(0);
    expect(winter.onder!.uren).toBeGreaterThan(7.5);
    // Noord rechts op het plan: nu is de rechtergevel de noordgevel en de linker de zuidgevel.
    const gedraaid = Object.fromEntries(zonOpGevels(12, 21, 90).map((x) => [x.kant, x]));
    expect(gedraaid.rechts!.uren).toBe(0);
    expect(gedraaid.links!.uren).toBeCloseTo(winter.onder!.uren, 5);
    expect(gedraaid.links!.windstreek).toBe('zuid');
  });
});

describe('lichtinval in de 3D van de woning', () => {
  const schaduw = (blokken: Blok[]) => blokken.filter((b) => b.alleenSchaduw);

  it('wat verborgen is, werpt nog schaduw; wat je ziet en het kader blijven gelijk', () => {
    const { plan } = voorbeeldWoning();
    const gewoon = plattegrond3D(plan, planCatalogus, { totNiveau: 0 });
    const licht = plattegrond3D(plan, planCatalogus, { totNiveau: 0, lichtinval: true });
    expect(licht.blokken.filter((b) => !b.alleenSchaduw)).toEqual(gewoon.blokken);
    expect(licht.kader).toEqual(gewoon.kader);
    const s = schaduw(licht.blokken);
    // Het dak boven het gelijkvloers, de vloerplaat en de muren van de verdieping, en het dak daarboven (zonder
    // dakkeuze rekent de schaduw met een plat dak).
    for (const begin of ['schaduw_dak_0', 'schaduw_dakplaat_leef', 'schaduw_plaat_slk3', 'schaduw_muur_', 'schaduw_dak_1', 'schaduw_dakrand_']) {
      expect(s.some((b) => b.code.startsWith(begin)), begin).toBe(true);
    }
    // Glas laat het licht door: geen ruit als schaduwwerper, wel de kaders.
    expect(s.some((b) => b.soort === 'glas' || b.soort === 'matglas')).toBe(false);
    expect(s.some((b) => b.soort === 'metaal' || b.soort === 'kunststof')).toBe(true);
    // Zonder de optie komt er niets bij.
    expect(schaduw(gewoon.blokken)).toEqual([]);
  });

  it('alles getoond met een dak erop: niets verborgen, dus geen extra blokken', () => {
    const { plan } = voorbeeldWoning();
    plan.dak = { vorm: 'zadel', helling: 40, richting: 'onder', oversteek: 40, bedekking: { materiaal: 'pannen', kleur: 'rood' } };
    expect(schaduw(plattegrond3D(plan, planCatalogus, { lichtinval: true }).blokken)).toEqual([]);
    // Dak niet getoond (om in de verdieping te kijken): het dak en de topgevels werpen nog schaduw.
    const open = schaduw(plattegrond3D(plan, planCatalogus, { lichtinval: true, dak: false }).blokken);
    expect(open.some((b) => b.code === 'schaduw_dak_bedekking' && b.vorm === 'prisma')).toBe(true);
    expect(open.some((b) => b.code.startsWith('schaduw_topgevel_'))).toBe(true);
  });

  it('muren laag: de muren boven de snijhoogte houden de zon nog tegen', () => {
    const { plan } = voorbeeldWoning();
    const laag = plattegrond3D(plan, planCatalogus, { laag: 110, totNiveau: 0, lichtinval: true }).blokken;
    const zichtbaar = laag.filter((b) => !b.alleenSchaduw && b.code.startsWith('muur_'));
    expect(Math.max(...zichtbaar.map((b) => b.y + b.h))).toBe(110);
    expect(Math.max(...schaduw(laag).filter((b) => b.code.startsWith('schaduw_muur_')).map((b) => b.y + b.h))).toBeGreaterThanOrEqual(270);
  });

  it('een lichtkoepel laat de zon binnen: het verborgen dak heeft daar een opening', () => {
    const { plan } = voorbeeldWoning();
    plan.dak = { vorm: 'plat', helling: 35, richting: 'onder', oversteek: 40, bedekking: { materiaal: 'epdm', kleur: 'zwart' } };
    plan.daklichten = [{ id: 'k1', type: 'koepel_100', x: 690, y: 686, b: 100, d: 100 }];
    const s = schaduw(plattegrond3D(plan, planCatalogus, { totNiveau: 0, lichtinval: true }).blokken);
    const dak = s.filter((b) => b.code === 'schaduw_dak_0' || b.code === 'schaduw_dakplaat_leef');
    expect(dak.length).toBeGreaterThan(2);
    // Geen stuk dak boven het midden van de koepel (740, 736), wel de opstand errond; het glas werpt geen schaduw.
    expect(dak.some((b) => b.x < 740 && b.x + b.b > 740 && b.z < 736 && b.z + b.d > 736)).toBe(false);
    expect(s.filter((b) => b.code.startsWith('schaduw_daklicht_k1_opstand')).length).toBe(4);
    expect(s.some((b) => b.code === 'schaduw_daklicht_k1_koepel')).toBe(false);
  });
});

describe('noordpijl in de plattegrond', () => {
  it('alleen met de optie of met een noordrichting in het plan; de pijl draait mee', () => {
    const { plan } = voorbeeldWoning();
    const gelijkvloers = niveauPlan(plan, 0);
    expect(tekenPlattegrond(gelijkvloers, planCatalogus)).not.toContain('data-soort="noordpijl"');
    expect(tekenPlattegrond(gelijkvloers, planCatalogus, { noordpijl: true })).toContain('rotate(0)');
    const gedraaid = tekenPlattegrond(niveauPlan({ ...plan, noord: 135 }, 0), planCatalogus);
    expect(gedraaid).toContain('data-soort="noordpijl"');
    expect(gedraaid).toContain('rotate(135)');
    expect(gedraaid).toContain('rotate(-135)'); // de letter N blijft rechtop
  });
});
