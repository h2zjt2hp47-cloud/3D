import { describe, expect, it } from 'vitest';
import {
  berekenZon, dakvlakkenVan, legVlak, kiesOmvormer, normHoek, paneelHoeken, richtingenPlat, standFactor,
  stringGrenzen, verdeelStrings, windstreek, STANDAARD_VLAK, type ZonProject,
} from '../src/zon.js';
import { leegZonProject, voorbeeldZonProject, ZON_CATALOGUS } from '../voorbeelden/zon.js';

const paneel = ZON_CATALOGUS.panelen[0]!;

describe('zonnepanelen: richting en stand', () => {
  it('hoeken en windstreken', () => {
    expect(normHoek(190)).toBe(-170);
    expect(normHoek(-180)).toBe(180);
    expect(windstreek(0)).toBe('Z');
    expect(windstreek(-90)).toBe('O');
    expect(windstreek(100)).toBe('W');
    expect(windstreek(-140)).toBe('NO');
  });

  it('standfactor volgt de PVGIS-tabellen ruwweg', () => {
    expect(standFactor(35, 0)).toBe(1);
    expect(standFactor(0, 0)).toBeCloseTo(0.88, 2);
    expect(standFactor(35, -90)).toBeCloseTo(0.83, 2);
    expect(standFactor(35, 90)).toBe(standFactor(35, -90));
    expect(standFactor(90, 0)).toBeCloseTo(0.7, 1);
    expect(standFactor(35, 180)).toBeLessThan(0.7);
  });
});

describe('zonnepanelen: dakvlakken en legplan', () => {
  const huis = { id: 'h', naam: 'Huis', dakvorm: 'zadel' as const, breedte: 1000, diepte: 1000, goothoogte: 600, helling: 45, x: 0, z: 0 };

  it('zadeldak geeft twee vlakken in tegengestelde richting, met nok in het midden', () => {
    const [voor, achter] = dakvlakkenVan(huis, -30);
    expect(voor!.azimut).toBe(-30);
    expect(achter!.azimut).toBe(150);
    expect(voor!.lengte).toBeCloseTo(500 / Math.cos(Math.PI / 4), 0);
    // De nok ligt boven het midden op goothoogte + halve diepte × tan(45°).
    const nok = { x: voor!.oorsprong.x + voor!.v.x * voor!.lengte, y: voor!.oorsprong.y + voor!.v.y * voor!.lengte, z: voor!.oorsprong.z + voor!.v.z * voor!.lengte };
    expect(nok.y).toBeCloseTo(1100, 0);
    expect(nok.z).toBeCloseTo(0, 0);
    expect(voor!.n.y).toBeGreaterThan(0);
    expect(voor!.n.z).toBeGreaterThan(0);
    expect(achter!.n.z).toBeLessThan(0);
  });

  it('legt staande panelen gecentreerd binnen de rand', () => {
    const [voor] = dakvlakkenVan(huis, 0);
    const l = legVlak(voor!, { ...STANDAARD_VLAK, rand: 30 }, paneel, 0);
    // 1000 − 60 = 940 cm → 8 kolommen van 113,4 + 2; 707 − 60 → 3 rijen van 172,2 + 2.
    expect(l.aantal).toBe(24);
    const minU = Math.min(...l.panelen.map((x) => x.u));
    const maxU = Math.max(...l.panelen.map((x) => x.u + x.b));
    expect(minU).toBeGreaterThanOrEqual(30);
    expect(1000 - maxU).toBeCloseTo(minU, 1);
  });

  it('obstakels en uitgezette panelen tellen niet mee', () => {
    const [voor] = dakvlakkenVan(huis, 0);
    const l = legVlak(voor!, { ...STANDAARD_VLAK, obstakels: [{ id: 'o', soort: 'dakraam', x: 450, y: 300, b: 80, h: 100 }], uit: ['0-0'] }, paneel, 0);
    expect(l.geblokkeerd).toBeGreaterThan(0);
    expect(l.panelen.find((x) => x.sleutel === '0-0')?.actief).toBe(false);
    expect(l.aantal).toBe(24 - l.geblokkeerd - 1);
  });

  it('plat dak: zuidopstelling kijkt naar de zijde die het dichtst bij zuid ligt, oost-west rug aan rug', () => {
    expect(richtingenPlat('zuid', 0)).toEqual(['+z']);
    expect(richtingenPlat('zuid', 180)).toEqual(['-z']);
    expect(richtingenPlat('zuid', 90)).toEqual(['+x']); // voorgevel west: de rechterzijgevel (+x) kijkt naar zuid
    expect(richtingenPlat('oostwest', 0)).toEqual(['+x', '-x']);
    expect(richtingenPlat('oostwest', 90)).toEqual(['+z', '-z']);
  });

  it('plat dak: panelen staan schuin met een lage rand naar de kijkrichting', () => {
    const plat = dakvlakkenVan({ ...huis, dakvorm: 'plat' }, 0)[0]!;
    const l = legVlak(plat, { ...STANDAARD_VLAK, bedekking: 'plat', rand: 80, opstelling: 'zuid', kanteling: 15 }, paneel, 0);
    expect(l.aantal).toBeGreaterThan(0);
    const x = l.panelen[0]!;
    expect(x.azimut).toBe(0);
    expect(x.helling).toBe(15);
    const [a, , c] = paneelHoeken(plat, x);
    // Voorkant (+z) laag, achterkant hoog.
    expect(a!.z).toBeGreaterThan(c!.z);
    expect(c!.y).toBeGreaterThan(a!.y);
  });
});

describe('zonnepanelen: elektrisch', () => {
  it('stringgrenzen bij koude en warmte', () => {
    const omv = ZON_CATALOGUS.omvormers.find((o) => o.code === 'SW-S5.0-M')!;
    const g = stringGrenzen(paneel, omv);
    expect(g.vocKoud).toBeGreaterThan(paneel.voc);
    expect(g.vmpWarm).toBeLessThan(paneel.vmp);
    expect(g.nMax * g.vocKoud).toBeLessThanOrEqual(omv.maxVdc);
    expect((g.nMax + 1) * g.vocKoud).toBeGreaterThan(omv.maxVdc);
    expect(g.nMin * g.vmpWarm).toBeGreaterThanOrEqual(omv.mpptMin);
  });

  it('verdeelt panelen over gelijke strings', () => {
    expect(verdeelStrings(21, 14)).toEqual([11, 10]);
    expect(verdeelStrings(14, 14)).toEqual([14]);
    expect(verdeelStrings(0, 14)).toEqual([]);
  });

  it('kiest een hybride omvormer bij een batterij en de juiste aansluiting', () => {
    const o = kiesOmvormer(ZON_CATALOGUS, 7, { fasen: 3, batterij: true, mppts: 1 })!;
    expect(o.soort).toBe('hybride');
    expect(o.fasen).toBe(3);
    expect(7000 / o.ac).toBeLessThanOrEqual(1.3);
    const m = kiesOmvormer(ZON_CATALOGUS, 4, { fasen: 1, batterij: false, mppts: 1 })!;
    expect(m.soort).toBe('string');
    expect(m.fasen).toBe(1);
  });
});

describe('zonnepanelen: project', () => {
  it('voorbeeldproject is geldig en levert een offerte', () => {
    const r = berekenZon(voorbeeldZonProject(), ZON_CATALOGUS);
    expect(r.geldig).toBe(true);
    expect(r.aantal).toBeGreaterThan(20);
    expect(r.omvormer?.soort).toBe('hybride');
    expect(r.productie).toBeGreaterThan(r.kwp * 700);
    expect(r.productie).toBeLessThan(r.kwp * 960);
    expect(r.zelfverbruik).toBeGreaterThan(r.zelfverbruikZonderBatterij);
    expect(r.offerte.btwProcent).toBe(6);
    expect(r.offerte.regels.some((x) => x.groep === 'Thuisbatterij')).toBe(true);
    expect(r.terugverdientijd).toBeGreaterThan(4);
    expect(r.terugverdientijd).toBeLessThan(20);
    expect(r.cumulatief).toHaveLength(26);
    expect(r.bestellijst.find((b) => b.artikel === 'eindklem')!.aantal % 4).toBe(0);
  });

  it('monofasig boven 5 kVA is een fout', () => {
    const p: ZonProject = { ...leegZonProject(), omvormer: 'VO-H6.0-T' };
    const r = berekenZon(p, ZON_CATALOGUS);
    expect(r.controles.find((c) => c.code === 'fasen')?.status).toBe('fout');
    expect(r.controles.find((c) => c.code === 'mono_grens')?.status).toBe('fout');
  });

  it('batterij met een gewone stringomvormer is een fout', () => {
    const r = berekenZon({ ...leegZonProject(), batterij: 'VO-B5', omvormer: 'SW-S5.0-M' }, ZON_CATALOGUS);
    expect(r.controles.find((c) => c.code === 'batterij_omvormer')?.status).toBe('fout');
    expect(r.geldig).toBe(false);
  });

  it('te weinig panelen op een vlak voor een string; micro-omvormers lossen dat op', () => {
    const p = voorbeeldZonProject();
    p.vlakken['huis-achter'] = { ...p.vlakken['huis-achter']!, actief: true, uit: [] };
    // Achterkant: laat 2 panelen over.
    const r0 = berekenZon(p, ZON_CATALOGUS);
    const achter = r0.legplan.find((l) => l.vlak.id === 'huis-achter')!;
    p.vlakken['huis-achter']!.uit = achter.panelen.slice(2).map((x) => x.sleutel);
    const r = berekenZon(p, ZON_CATALOGUS);
    expect(r.controles.find((c) => c.code === 'string_kort')?.status).toBe('fout');
    const micro = berekenZon({ ...p, omvormer: 'MW-M500', batterij: '' }, ZON_CATALOGUS);
    expect(micro.controles.find((c) => c.code === 'string_kort')).toBeUndefined();
    expect(micro.aantalOmvormers).toBe(micro.aantal);
  });

  it('geen panelen: fout en lege offerte', () => {
    const p = leegZonProject();
    p.vlakken['huis-voor'] = { ...STANDAARD_VLAK, actief: false };
    const r = berekenZon(p, ZON_CATALOGUS);
    expect(r.aantal).toBe(0);
    expect(r.geldig).toBe(false);
    expect(r.offerte.regels).toHaveLength(0);
  });
});
