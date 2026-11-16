/**
 * Detail van ramen en dakramen (ronde 11b): twee of drie screens op één raam, ventilatie op het raam (rooster of
 * raamventilator), en een plat dakraam met buitenzonwering. Dat een raam zonder deze keuzes niet verandert, bewaakt
 * `raam-bestaand.test.ts` (51 vastgelegde gevallen); hier de nieuwe keuzes zelf.
 */
import { describe, expect, it } from 'vitest';
import {
  daklichtBlokken, gevelAanzichten, plattegrond3D, tekenPlattegrond,
  type DakKeuze, type DakLicht, type Keuzes, type Plattegrond,
} from '../src/index.js';
import { verdeelDaklichten } from '../voorbeelden/daklichten.js';
import { daklichtCatalogus, planCatalogus, planNaarRegels } from '../voorbeelden/inrichting.js';
import { berekenRaam } from '../voorbeelden/raam.js';
import { raamBlokken } from '../voorbeelden/raam3d.js';
import { INDELINGEN, pasIndelingToe } from '../voorbeelden/raamindelingen.js';
import { rasterVan, zonweringVan } from '../voorbeelden/raamraster.js';
import { ontwerpKenmerken } from '../voorbeelden/varianten.js';
import { raamKeuzes } from '../voorbeelden/woning.js';

const indeling = (code: string) => INDELINGEN.find((i) => i.code === code)!;
const raam = (k: Keuzes) => berekenRaam(raamKeuzes(k));
/** Het hef-schuifraam van de offerte: 4,00 × 2,35 m in twee delen. */
const hefschuif = (extra: Keuzes = {}) => berekenRaam({ ...pasIndelingToe(raamKeuzes({ ruimte: 'leefruimte' }), indeling('hefschuif2')), breedte: 4000, hoogte: 2350, ...extra });
const fouten = (r: ReturnType<typeof berekenRaam>) => r.meldingen.filter((m) => m.ernst === 'fout').map((m) => m.code);
const stuk = (r: ReturnType<typeof berekenRaam>, code: string) => r.stuklijst.find((s) => s.code === code);

describe('twee of drie screens op één raam', () => {
  it('hef-schuif van 4 m met twee screens: twee kasten, twee doeken, één middengeleider, twee motoren', () => {
    const r = hefschuif({ zonwering: 'screen', screens: 's2' });
    expect(fouten(r)).toEqual([]);
    expect(zonweringVan(r)).toEqual([{ nr: 1, x0: 0, x1: 2000 }, { nr: 2, x0: 2000, x1: 4000 }]);
    expect([r.afgeleid.zb1, r.afgeleid.zb2, r.afgeleid.zb3]).toEqual([2000, 2000, 0]);
    // Stuklijst: per screen een regel, een middengeleider over de hoogte, een motor per screen.
    expect([stuk(r, 'zonwering')?.lengte, stuk(r, 'zonwering2')?.lengte, stuk(r, 'zonwering3')]).toEqual([2000, 2000, undefined]);
    expect([stuk(r, 'middengeleider')?.aantal, stuk(r, 'middengeleider')?.lengte]).toEqual([1, 2350]);
    expect(stuk(r, 'motor')?.aantal).toBe(2);
    // Tekening: de kasten naast elkaar, met de breedte van elk screen erboven.
    const kasten = r.tekening!.vormen.filter((v) => v.code.startsWith('zonwering'));
    expect(kasten.map((v) => [v.code, v.x, v.breedte])).toEqual([['zonwering.1', 0, 2000], ['zonwering.2', 2000, 2000]]);
    expect(r.tekening!.maatlijnen.filter((m) => m.code.startsWith('screen')).map((m) => m.tekst)).toEqual(['2000', '2000']);
    // 3D: elk screen apart (kast, doek, onderlat), de buitenste geleiders en één middengeleider op de grens.
    const b = raamBlokken(r).blokken;
    const codes = b.map((x) => x.code).filter((c) => /^(zonwering|geleider|doek|onderlat)/.test(c));
    expect(codes).toEqual(['zonwering_kast1', 'zonwering_kast2', 'geleider_l', 'geleider_r', 'geleider_m1', 'doek1', 'onderlat1', 'doek2', 'onderlat2']);
    const m = b.find((x) => x.code === 'geleider_m1')!;
    expect(m.x + m.b / 2).toBeCloseTo(200, 6);
    // Half neer, zoals het screen van vroeger (62 % van de hoogte), of helemaal neer.
    expect(b.find((x) => x.code === 'doek1')!.y).toBeCloseTo(235 * 0.62, 6);
    const dicht = raamBlokken(hefschuif({ zonwering: 'screen', screens: 's2', zon_stand: 'dicht' })).blokken;
    expect(dicht.filter((x) => x.code.startsWith('doek')).map((x) => x.y)).toEqual([2, 2]);
  });

  it('een screen breder dan 5 m is een fout die naar de nieuwe keuze verwijst; twee screens lossen het op', () => {
    const breed = (screens: string) => berekenRaam({ ...pasIndelingToe(raamKeuzes({ ruimte: 'leefruimte' }), indeling('hefschuif4')), breedte: 6000, zonwering: 'screen', screens });
    const een = breed('s1');
    expect(fouten(een)).toContain('screen_breed');
    expect(een.meldingen.find((m) => m.code === 'screen_breed')!.melding).toMatch(/Aantal screens/);
    expect(fouten(breed('s2'))).toEqual([]);
    // Drie screens op een raam van 1,2 m: te smal.
    expect(fouten(raam({ zonwering: 'screen', screens: 's3' }))).toEqual(['screen_smal']);
  });

  it('op de stijlen: de middengeleider komt op de stijl tussen twee vakken, of waar twee schuifdelen elkaar raken', () => {
    // Raam met drie vakken en drie screens: de grenzen van de screens zijn de twee stijlen van het raster.
    const r = raam({ vakken: 'v3', breedte: 2400, vak1: 'draaikip_l', vak2: 'vast', vak3: 'draaikip_r', zonwering: 'screen', screens: 's3', screen_verdeling: 'stijl' });
    expect(fouten(r)).toEqual([]);
    expect(zonweringVan(r).slice(1).map((z) => z.x0)).toEqual(rasterVan(r).stijlen.map((s) => Math.round(s.x)));
    // Hef-schuif in vier delen met twee screens: in het midden, waar de twee middelste delen tegen elkaar sluiten.
    const h = berekenRaam({ ...pasIndelingToe(raamKeuzes({ ruimte: 'leefruimte' }), indeling('hefschuif4')), zonwering: 'screen', screens: 's2', screen_verdeling: 'stijl' });
    const delen = rasterVan(h).vakken;
    expect(zonweringVan(h)[1]!.x0).toBe(Math.round(delen[1]!.x + delen[1]!.b));
    // Met drie screens: op de grens tussen deel 1 en 2 (het midden van de overlapping) en tussen deel 3 en 4.
    const h3 = berekenRaam({ ...pasIndelingToe(raamKeuzes({ ruimte: 'leefruimte' }), indeling('hefschuif4')), zonwering: 'screen', screens: 's3', screen_verdeling: 'stijl' });
    const d = rasterVan(h3).vakken;
    expect(zonweringVan(h3).slice(1).map((z) => z.x0)).toEqual([Math.round((d[0]!.x + d[0]!.b + d[1]!.x) / 2), Math.round((d[2]!.x + d[2]!.b + d[3]!.x) / 2)]);
    // Eén vak heeft geen stijl: de keuze kan niet, met de reden.
    const een = raam({ zonwering: 'screen', screens: 's2', screen_verdeling: 'stijl' });
    expect(fouten(een)).toEqual(['screen_verdeling.niet_beschikbaar']);
    expect(een.kenmerken.find((k) => k.code === 'screen_verdeling')!.keuzes!.find((k) => k.code === 'stijl')!.reden).toMatch(/stijl/);
  });

  it('een indeling breder dan 5 m houdt haar screen: er komt een screen bij in plaats van dat het vervalt', () => {
    const k = pasIndelingToe({ ...raamKeuzes({ ruimte: 'leefruimte', zonwering: 'screen' }), breedte: 6000, hoogte: 2400 }, indeling('hefschuif4'));
    expect([k.zonwering, k.screens, k.screen_verdeling]).toEqual(['screen', 's2', 'gelijk']);
    expect(berekenRaam(k).geldig).toBe(true);
    // Terug naar een smal raam met drie screens: een screen minder tot het past.
    const smal = pasIndelingToe({ ...raamKeuzes({ zonwering: 'screen' }), screens: 's3' }, indeling('enkel_dk'));
    expect(smal.screens).toBe('s2');
    expect(berekenRaam(smal).geldig).toBe(true);
  });

  it('de keuzes zijn alleen zichtbaar bij een screen; de stand in de 3D bij elke zonwering', () => {
    const zicht = (k: Keuzes) => berekenRaam(raamKeuzes(k)).kenmerken.filter((x) => ['screens', 'screen_verdeling', 'zon_stand'].includes(x.code) && x.zichtbaar).map((x) => x.code);
    expect(zicht({})).toEqual([]);
    expect(zicht({ zonwering: 'rolluik' })).toEqual(['zon_stand']);
    expect(zicht({ zonwering: 'screen' })).toEqual(['screens', 'zon_stand']);
    expect(zicht({ zonwering: 'screen', screens: 's2' })).toEqual(['screens', 'screen_verdeling', 'zon_stand']);
  });
});

describe('ventilatie op het raam: rooster of raamventilator', () => {
  it('een rooster zoals vroeger; een raamventilator is een toestel met een kast, geen rooster', () => {
    const rooster = raam({ rooster: true });
    expect([rooster.afgeleid.vent_rooster, rooster.afgeleid.vent_toestel]).toEqual([true, false]);
    expect(stuk(rooster, 'rooster')).toBeDefined();
    expect(stuk(rooster, 'ventilator')).toBeUndefined();

    const v = raam({ rooster: true, ventilatie_soort: 'ventilator' });
    expect(fouten(v)).toEqual([]);
    expect([v.afgeleid.vent_rooster, v.afgeleid.vent_toestel, v.afgeleid.vent_b]).toEqual([false, true, 500]);
    expect(stuk(v, 'rooster')).toBeUndefined();
    expect(stuk(v, 'ventilator')?.artikel).toBe('RAAM-VENTILATOR');
    // De controle "droge ruimte zonder ventilatie" blijft stil: er is luchttoevoer.
    expect(v.meldingen.some((m) => m.code === 'ventilatie')).toBe(false);
    expect(raam({}).meldingen.some((m) => m.code === 'ventilatie')).toBe(true);
    // Tekening: de kast en haar sleuven, geen rooster.
    expect(v.tekening!.vormen.some((x) => x.code === 'rooster')).toBe(false);
    expect(v.tekening!.vormen.find((x) => x.code === 'ventilator')).toMatchObject({ breedte: 500, y: 0 });
    // 3D: de kast binnen tegen de bovenkant van het kader, binnen de maat van het raam (de opening in de muur blijft gelijk).
    const rb = raamBlokken(v);
    const kast = rb.blokken.find((b) => b.code === 'ventilator_kast')!;
    expect(rb.blokken.some((b) => b.code === 'rooster')).toBe(false);
    expect([kast.x, kast.x + kast.b, kast.y + kast.h]).toEqual([35, 85, 140]);
    for (const b of rb.blokken.filter((x) => x.code.startsWith('ventilator'))) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.b).toBeLessThanOrEqual(rb.b);
      expect(b.y + b.h).toBeLessThanOrEqual(rb.h + 0.001);
      expect(b.z).toBeGreaterThanOrEqual(-0.5);
      expect(b.z + b.d).toBeLessThanOrEqual(13.5);
    }
    expect([rb.h, rb.kast]).toEqual([140, 0]);
  });

  it('te smal voor een raamventilator: een fout met de raad een rooster te kiezen', () => {
    const r = raam({ rooster: true, ventilatie_soort: 'ventilator', breedte: 450, vak1: 'vast' });
    expect(fouten(r)).toEqual(['ventilator_smal']);
    expect(r.meldingen.find((m) => m.code === 'ventilator_smal')!.melding).toMatch(/rooster/);
  });

  it('zonder ventilatie zegt de soort niets (ook als ze nog bewaard staat)', () => {
    const r = raam({ rooster: false, ventilatie_soort: 'ventilator' });
    expect([r.afgeleid.vent_rooster, r.afgeleid.vent_toestel]).toEqual([false, false]);
    expect(r.kenmerken.find((k) => k.code === 'ventilatie_soort')!.zichtbaar).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Plat dakraam met buitenzonwering
// ---------------------------------------------------------------------------------------------------------------

const plat: DakKeuze = { vorm: 'plat', helling: 35, richting: 'onder', oversteek: 40, bedekking: { materiaal: 'epdm', kleur: 'zwart' } };
const dakraam = (id: string, x: number, extra: Partial<DakLicht> = {}): DakLicht => ({ id, type: 'dakraam_120', x, y: 190, b: 120, d: 120, ...extra });
/** Een uitbouw van 5 × 5 m met een plat dak en drie platte dakramen van 120 × 120 (zoals in de offerte). */
function uitbouw(daklichten: DakLicht[]): Plattegrond {
  return {
    ruimtes: [{ id: 'r1', naam: 'Leefruimte', type: 'leefruimte', x: 0, y: 0, b: 500, d: 500, vloer: 'parket_eik', wand: 'wit' }],
    openingen: [], meubels: [], muurhoogte: 280, buitenmuur: 30, binnenmuur: 10,
    gevel: { soort: 'steen', kleur: '#9c4a34' }, dak: plat, daklichten,
  };
}
/** Alleen de groep Dak van de offerteregels. */
const alleenDak = { vloeren: false, wanden: false, binnendeuren: false, ruwbouw: false, inrichting: false, dak: true };

describe('plat dakraam met buitenzonwering', () => {
  it('staat in de daklichtcatalogus in gangbare maten, met zonwering die erop past', () => {
    const ramen = Object.entries(daklichtCatalogus).filter(([, t]) => t.vorm === 'dakraam');
    expect(ramen.map(([c]) => c)).toEqual(['dakraam_080', 'dakraam_100', 'dakraam_120', 'dakraam_100_150']);
    expect(ramen.every(([, t]) => t.zonwering && t.groep === 'Platte dakramen')).toBe(true);
    expect(daklichtCatalogus.dakraam_120).toMatchObject({ b: 120, d: 120 });
    // Koepels en lichtstraten krijgen geen zonwering.
    expect(Object.values(daklichtCatalogus).filter((t) => t.vorm !== 'dakraam').some((t) => t.zonwering)).toBe(false);
  });

  it('3D: een opstand die naar voren afloopt en een vlakke glazen plaat; met een screen een dun doek boven het glas', () => {
    const zonder = daklichtBlokken(dakraam('k1', 60), 'dakraam', 300);
    expect(zonder.some((b) => b.code.includes('_zon_'))).toBe(false);
    const glas = zonder.find((b) => b.code === 'daklicht_k1_glas')!;
    expect([glas.soort, glas.vorm, glas.as]).toEqual(['glas', 'prisma', 'x']);
    // Licht hellend: de achterkant (kleinste z) ligt hoger dan de voorkant, met een paar cm.
    const p = glas.doorsnede!;
    expect(p[0]![1] - p[1]![1]).toBeGreaterThan(4);
    expect(p[0]![1] - p[1]![1]).toBeLessThan(8);
    // Het glas ligt boven de opening (de dagmaat), de rand erbuiten.
    expect(glas.x).toBeLessThanOrEqual(60);
    expect(glas.x + glas.b).toBeGreaterThanOrEqual(180);

    const half = daklichtBlokken(dakraam('k1', 60, { zonwering: 'screen' }), 'dakraam', 300);
    const dicht = daklichtBlokken(dakraam('k1', 60, { zonwering: 'screen', zonweringStand: 'dicht' }), 'dakraam', 300);
    const doek = (bl: typeof half) => bl.find((b) => b.code === 'daklicht_k1_zon_doek')!;
    expect(half.filter((b) => b.code.includes('_zon_')).map((b) => b.code.replace('daklicht_k1_', ''))).toEqual(['zon_kast', 'zon_geleider_l', 'zon_geleider_r', 'zon_doek', 'zon_onderlat']);
    expect([doek(half).soort, doek(half).d < doek(dicht).d * 0.6]).toEqual(['stof', true]);
    expect(doek(dicht).d).toBeGreaterThan(110);
    // Het doek ligt net boven het glas, nergens erin.
    const boven = (z: number, bl: typeof half) => {
      const g = bl.find((b) => b.code === 'daklicht_k1_glas')!.doorsnede!, d = doek(bl).doorsnede!;
      const t = (z - g[0]![0]) / (g[1]![0] - g[0]![0]), ytopGlas = g[3]![1] + t * (g[2]![1] - g[3]![1]);
      const s = (z - d[0]![0]) / (d[1]![0] - d[0]![0]), yDoek = d[0]![1] + s * (d[1]![1] - d[0]![1]);
      return yDoek - ytopGlas;
    };
    expect(boven(200, dicht)).toBeCloseTo(1.2, 1);
    // Een koepel toont geen zonwering, ook niet als het veld er staat.
    expect(daklichtBlokken(dakraam('k1', 60, { type: 'koepel_120', zonwering: 'screen' }), 'koepel', 300).some((b) => b.code.includes('_zon_'))).toBe(false);
    // Alleen soorten en vormen die een oudere kijker al kent: het 3D-pakket hoeft niet te veranderen.
    for (const b of [...half, ...dicht]) {
      expect(['kunststof', 'gevel', 'glas', 'metaal', 'stof']).toContain(b.soort);
      expect(b.vorm).toBe('prisma');
    }
  });

  it('in de woning: drie dakramen met een screen, in de offerte, de tekening en het gevelaanzicht', () => {
    const plan = uitbouw([dakraam('k1', 60), dakraam('k2', 190), dakraam('k3', 320)].map((l) => ({ ...l, zonwering: 'screen' as const })));
    const blokken = plattegrond3D(plan, planCatalogus).blokken;
    expect(['k1', 'k2', 'k3'].every((id) => blokken.some((b) => b.code === `daklicht_${id}_zon_doek`))).toBe(true);
    // Een plan zonder zonwering heeft dezelfde blokken, op die van de screens na.
    const zonder = plattegrond3D(uitbouw([dakraam('k1', 60), dakraam('k2', 190), dakraam('k3', 320)]), planCatalogus).blokken;
    expect(blokken.filter((b) => !b.code.includes('_zon_'))).toEqual(zonder);

    const regels = planNaarRegels(plan, alleenDak);
    expect(regels.find((r) => r.code === 'daklicht:dakraam_120')).toMatchObject({ hoeveelheid: 3, omschrijving: 'Plat dakraam 120 × 120, met opstand' });
    expect(regels.find((r) => r.code === 'daklicht_zon:dakraam_120')).toMatchObject({ hoeveelheid: 3, omschrijving: 'Buitenzonwering (screen) met motor op plat dakraam 120 × 120' });
    expect(planNaarRegels(uitbouw([dakraam('k1', 60)]), alleenDak).some((r) => r.code.startsWith('daklicht_zon:'))).toBe(false);

    const svg = tekenPlattegrond(plan, planCatalogus);
    expect(svg.match(/data-zonwering="screen"/g)?.length).toBe(3);
    expect(tekenPlattegrond(uitbouw([dakraam('k1', 60)]), planCatalogus)).not.toMatch(/data-zonwering/);

    const gevel = gevelAanzichten(plan, () => undefined, planCatalogus).find((g) => g.kant === 'onder')!;
    expect(gevel.tekening.vormen.filter((v) => /^daklicht\.k\d\.zonwering$/.test(v.code)).length).toBe(3);
    // Het dakraam is geen koepel: geen afgeronde bol in het aanzicht.
    expect(gevel.tekening.vormen.filter((v) => /^daklicht\.k\d\.glas$/.test(v.code)).every((v) => !v.afronding)).toBe(true);

    expect(ontwerpKenmerken(plan, [], planCatalogus).find((k) => k.soort === 'daklicht')?.tekst).toBe('3 platte dakramen (alle met screen)');
  });

  it('de teller houdt de zonwering: een dakraam erbij krijgt ook een screen', () => {
    const plan = uitbouw([dakraam('k1', 60, { zonwering: 'screen', zonweringStand: 'dicht' }), dakraam('k2', 320, { zonwering: 'screen', zonweringStand: 'dicht' })]);
    const meer = verdeelDaklichten(plan, 3, 'dakraam_120');
    expect(meer.daklichten!.map((l) => [l.zonwering, l.zonweringStand])).toEqual([['screen', 'dicht'], ['screen', 'dicht'], ['screen', 'dicht']]);
    // Een andere soort (een koepel): geen screen.
    expect(verdeelDaklichten(plan, 3, 'koepel_100').daklichten!.some((l) => l.zonwering)).toBe(false);
  });
});
