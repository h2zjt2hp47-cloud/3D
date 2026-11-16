import { describe, expect, it } from 'vitest';
import { doosMaatlijnen, leesPakket3D, PAKKET3D_SOORT, PAKKET3D_VERSIE, type Keuzes, type Pakket3D, type Plattegrond } from '../src/index.js';
import { overkappingVertrekpunten as OV, tuinhuisVertrekpunten as TV } from '../voorbeelden/bijgebouwen.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { loodsVertrekpunten as LV } from '../voorbeelden/loods.js';
import { staalwerkVertrekpunten as SV } from '../voorbeelden/staalwerk.js';
import { ontwerpKenmerken, verschillen } from '../voorbeelden/varianten.js';
import {
  berekenVastModel, herstelKeuzes, isVastModel, maakGeldig, meetstaatTekst, VASTE_MODELLEN, vastModelOmschrijving, vastModelScene, vastModelZin, type VastModelCode,
} from '../voorbeelden/vastemodellen.js';

const CODES = Object.keys(VASTE_MODELLEN) as VastModelCode[];
/** Een paar ontwerpen per model: de vertrekpunten. */
const GEVALLEN: [VastModelCode, string, Keuzes][] = [
  ...Object.entries(OV).map(([n, v]): [VastModelCode, string, Keuzes] => ['OVERKAPPING', n, v.keuzes]),
  ...Object.entries(TV).map(([n, v]): [VastModelCode, string, Keuzes] => ['TUINHUIS', n, v.keuzes]),
  ...Object.entries(LV).map(([n, v]): [VastModelCode, string, Keuzes] => ['LOODS', n, v.keuzes]),
  ...Object.entries(SV).map(([n, v]): [VastModelCode, string, Keuzes] => [v.model.code as VastModelCode, n, v.keuzes]),
];
const fouten = (code: VastModelCode, k: Keuzes) => berekenVastModel(code, k).meldingen.filter((m) => m.ernst === 'fout').map((m) => m.code);

describe('vaste modellen: één beschrijving voor de schermen', () => {
  it('zes modellen; gebouwen staan buiten, staalwerk op een rustige achtergrond', () => {
    expect(CODES).toEqual(['OVERKAPPING', 'TUINHUIS', 'LOODS', 'BALUSTRADE', 'LUIFEL', 'STAALTRAP']);
    expect(CODES.filter((c) => VASTE_MODELLEN[c].gebouw)).toEqual(['OVERKAPPING', 'TUINHUIS', 'LOODS']);
    for (const c of CODES) {
      expect(isVastModel(c)).toBe(true);
      expect(VASTE_MODELLEN[c].model.code).toBe(c);
    }
    expect(isVastModel('RAAM')).toBe(false);
  });

  it('wat achter Meer opties zit en wat de omschrijving noemt, bestaat in het model; elke stap houdt iets zichtbaars', () => {
    for (const c of CODES) {
      const m = VASTE_MODELLEN[c].model, codes = new Set(m.kenmerken.map((k) => k.code));
      for (const k of [...VASTE_MODELLEN[c].meer, ...VASTE_MODELLEN[c].omschrijf.map((o) => (typeof o === 'string' ? o : o[0]))]) expect(codes.has(k), `${c}.${k}`).toBe(true);
      for (const stap of m.stappen) {
        const hier = m.kenmerken.filter((k) => k.stap === stap.code);
        expect(hier.some((k) => !VASTE_MODELLEN[c].meer.includes(k.code)), `${c}: stap ${stap.code} heeft alleen meer opties`).toBe(true);
      }
    }
  });

  it('afgewerkt en constructie hebben hetzelfde kader: wisselen verzet de camera niet', () => {
    for (const [code, naam, k] of GEVALLEN) {
      const r = berekenVastModel(code, k);
      const a = vastModelScene(code, r, 'afgewerkt'), c = vastModelScene(code, r, 'constructie');
      expect(c.kader, naam).toEqual(a.kader);
      expect(c.blokken, naam).not.toEqual(a.blokken);
      expect(a.blokken.length, naam).toBeGreaterThan(5);
    }
  });

  it('de hoofdmaten volgen de keuzes, met de maat in meter', () => {
    const tekst = (code: VastModelCode, k: Keuzes) => [...new Set(VASTE_MODELLEN[code].maatlijnen(berekenVastModel(code, k)).map((l) => l.tekst))];
    expect(tekst('OVERKAPPING', OV.carport.keuzes)).toEqual(['Breedte 5,00 m', 'Diepte 5,00 m', expect.stringMatching(/^Hoogte 2,\d\d m$/)]);
    expect(tekst('TUINHUIS', { breedte: 400, diepte: 300 })).toEqual(['Breedte 4,00 m', 'Diepte 3,00 m', expect.stringMatching(/^Hoogte 2,\d\d m$/)]);
    expect(tekst('LOODS', LV.hal.keuzes)).toEqual(['Breedte 15,00 m', 'Lengte 30,00 m', expect.stringMatching(/^Hoogte 6,\d\d m$/)]);
    expect(tekst('BALUSTRADE', { lengte: 360, hoogte: 110 })).toEqual(['Lengte 3,60 m', 'Hoogte 1,10 m']);
    expect(tekst('LUIFEL', { breedte: 250, uitkraging: 120, hoogte: 250 })).toEqual(['Breedte 2,50 m', 'Uitkraging 1,20 m', 'Hoogte 2,50 m']);
    expect(tekst('STAALTRAP', { hoogte: 270, breedte: 90 })).toEqual(['Hoogte 2,70 m', expect.stringMatching(/^Lengte \d,\d\d m$/), 'Breedte 0,90 m']);
    // De hoogte van een gebouw is het hoogste punt van het model (de 3D tekent hetzelfde, zie de tests van elk model).
    const r = berekenVastModel('OVERKAPPING', OV.carport.keuzes), h = VASTE_MODELLEN.OVERKAPPING.maatlijnen(r).find((l) => l.groep === 'hoogte')!;
    expect(h.tot[1] - h.van[1]).toBe(r.afgeleid.tophoogte);
    expect(Math.max(...vastModelScene('OVERKAPPING', r).blokken.map((b) => b.y + b.h))).toBeCloseTo(h.tot[1], 0);
  });

  it('doosMaatlijnen: twee lijnen per maat (vóór en achter, links en rechts), een maat zonder woord valt weg', () => {
    const lijnen = doosMaatlijnen({ x0: 0, x1: 500, z0: 0, z1: 300, y0: 0, y1: 250 });
    expect(lijnen.filter((l) => l.groep === 'breedte')).toHaveLength(2);
    expect(lijnen.filter((l) => l.groep === 'diepte')).toHaveLength(2);
    expect(lijnen.filter((l) => l.groep === 'hoogte')).toHaveLength(4);
    expect(doosMaatlijnen({ x0: 0, x1: 500, z0: 0, z1: 300, y0: 0, y1: 250 }, { breedte: 'Breedte' }).map((l) => l.tekst)).toEqual(['Breedte 5,00 m', 'Breedte 5,00 m']);
  });

  it('een korte tekst en een omschrijving in gewone taal, zonder prijzen', () => {
    for (const [code, naam, k] of GEVALLEN) {
      const r = berekenVastModel(code, k);
      const kort = VASTE_MODELLEN[code].kort(r), lang = vastModelOmschrijving(code, r);
      expect(lang.startsWith(kort), naam).toBe(true);
      expect(`${kort} ${lang}`, naam).not.toMatch(/€|prijs|NaN|undefined|null/i);
    }
    expect(VASTE_MODELLEN.OVERKAPPING.kort(berekenVastModel('OVERKAPPING', OV.carport.keuzes))).toBe('Carport · 5 × 5 m');
    expect(VASTE_MODELLEN.LOODS.kort(berekenVastModel('LOODS', LV.hal.keuzes))).toBe('Loods · 15 × 30 m, 1 poort');
  });

  it('de meetstaat als tekst: hoeveelheden, gewicht als richtwaarde, nooit een bedrag', () => {
    for (const [code, naam, k] of GEVALLEN) {
      const regels = VASTE_MODELLEN[code].meetstaat(berekenVastModel(code, k));
      expect(regels.length, naam).toBeGreaterThan(0);
      for (const m of regels) expect(meetstaatTekst(m), naam).toMatch(/^[^€]+: \d[\d.]*(,\d)? (stuks?|m|m²)/);
    }
    const staal = VASTE_MODELLEN.LOODS.meetstaat(berekenVastModel('LOODS', LV.hal.keuzes)).find((m) => m.rol === 'kolom')!;
    expect(meetstaatTekst(staal)).toMatch(/^Kolom · .*HEA \d+: \d+ stuks, [\d,]+ m, ± [\d.]+ kg \(richtwaarde\)$/);
  });
});

describe('vaste modellen: een keuze die niet meer kan, wordt vanzelf de eerste die wel kan', () => {
  const herstel = (code: VastModelCode, k: Keuzes) => herstelKeuzes(VASTE_MODELLEN[code].model, k);

  it('EPDM bij een zadeldak wordt zink, met een korte melding', () => {
    const { keuzes, hersteld } = herstel('OVERKAPPING', { ...OV.carport.keuzes, dakvorm: 'zadel' });
    expect(keuzes.bedekking).toBe('zink');
    expect(hersteld).toEqual([{ kenmerk: 'bedekking', melding: 'Dakbedekking: EPDM op dakbeschot kan niet meer (kies voor een zadeldak pannen, leien of zink). Nu: zink met staande naad.' }]);
    expect(fouten('OVERKAPPING', keuzes)).toEqual([]);
    // Ook bij het tuinhuis.
    expect(herstel('TUINHUIS', { dakvorm: 'zadel' }).keuzes.bedekking).toBe('zink');
  });

  it('een zadeldak tegen een gevel wordt plat; een open dak (pergola) dat hellend wordt, krijgt een bedekking', () => {
    const tegen = herstel('OVERKAPPING', { dakvorm: 'zadel', bedekking: 'pannen', plaatsing: 'gevel' });
    expect(tegen.keuzes).toMatchObject({ dakvorm: 'plat', bedekking: 'epdm' });
    expect(tegen.hersteld.map((h) => h.kenmerk)).toEqual(['dakvorm', 'bedekking']);
    expect(herstel('OVERKAPPING', { ...OV.pergola.keuzes, dakvorm: 'lessenaar' }).keuzes.bedekking).toBe('epdm');
  });

  it('een getal buiten zijn grenzen wordt de dichtste grens (op de stap van het model)', () => {
    const smaller = herstel('OVERKAPPING', { berging: 'opzij', berging_maat: 400, breedte: 450 });
    expect(smaller.keuzes.berging_maat).toBe(300);
    expect(smaller.hersteld[0]!.melding).toBe('Maat van de berging: hoogstens 300 cm bij deze keuzes. Nu: 300 cm.');
    expect(herstel('TUINHUIS', { breedte: 400, ramen_achter: 4, diepte: 300 }).keuzes.ramen_achter).toBe(3);
    expect(herstel('LOODS', { traveeen: 3, poort2_gevel: 'links', poort2_travee: 5 }).keuzes.poort2_travee).toBe(3);
    expect(herstel('OVERKAPPING', { breedte: 1200 }).keuzes.breedte).toBe(900);
    expect(herstel('OVERKAPPING', { breedte: 455 }).keuzes.breedte).toBe(460);
  });

  it('wat al kan, blijft ongewijzigd (ook verborgen kenmerken)', () => {
    for (const [code, naam, k] of GEVALLEN) {
      const uit = herstel(code, k);
      expect(uit.hersteld, naam).toEqual([]);
      expect(uit.keuzes, naam).toEqual(k);
    }
    // De helling van een zadeldak blijft bewaard als het dak plat wordt (het kenmerk is dan verborgen).
    expect(herstel('OVERKAPPING', { dakvorm: 'plat', helling_zadel: 'h45' }).keuzes.helling_zadel).toBe('h45');
  });

  it('maakGeldig lost op wat een regel van het model verbiedt en de snelstart kan oplossen', () => {
    expect(maakGeldig('TUINHUIS', { ...TV.poolhouse.keuzes, breedte: 300 }).deur).toBe('dubbel');
    expect(maakGeldig('TUINHUIS', { ...TV.poolhouse.keuzes, breedte: 200 }).deur).toBe('enkel');
    const hal = maakGeldig('LOODS', { ...LV.werkplaats.keuzes, breedte: 700 });
    expect(fouten('LOODS', hal)).toEqual([]);
    expect([hal.poort1_gevel, hal.poort2_gevel]).toEqual(['voor', 'voor']);
    const laag = maakGeldig('LOODS', { ...LV.landbouw.keuzes, zijhoogte: 300 });
    expect(fouten('LOODS', laag)).toEqual([]);
    expect(laag.beton).toBe('b200');
  });
});

describe('vaste modellen in het pakket, de varianten en het blad', () => {
  const leegPlan = { ruimtes: [], openingen: [], meubels: [], muurhoogte: 270, buitenmuur: 30, binnenmuur: 10, verdiepingen: [{ naam: 'Gelijkvloers' }] } as unknown as Plattegrond;

  it('een positie in het pakket draagt `gebouw` en haar hoofdmaten; wat niet klopt, valt weg bij het lezen', () => {
    const r = berekenVastModel('LOODS', LV.hal.keuzes);
    const positie = { code: 'P1', naam: 'Loods', omschrijving: 'x', aantal: 1, scene: vastModelScene('LOODS', r), gebouw: true, maatlijnen: VASTE_MODELLEN.LOODS.maatlijnen(r) };
    const pakket: Pakket3D = { soort: PAKKET3D_SOORT, versie: PAKKET3D_VERSIE, gemaakt: '', project: { nummer: 'OF-1', naam: 'Hal' }, woning: [], posities: [positie] };
    const terug = leesPakket3D(JSON.stringify(pakket));
    expect(terug.versie).toBe(4);
    expect(terug.posities[0]).toEqual(JSON.parse(JSON.stringify(positie)));
    const slecht = leesPakket3D({ ...pakket, posities: [{ ...positie, gebouw: 'ja', maatlijnen: [{ tekst: 3 }] }] });
    expect(slecht.posities[0]!.gebouw).toBeUndefined();
    expect(slecht.posities[0]!.maatlijnen).toBeUndefined();
    // Een positie van vroeger (een raam) blijft zoals ze was.
    const raam = { code: 'P2', naam: 'Raam', omschrijving: '', aantal: 1, scene: positie.scene };
    expect(leesPakket3D({ ...pakket, posities: [raam] }).posities[0]).toEqual(raam);
  });

  it('de varianten beschrijven een carport, en tellen hem niet als raam of deur', () => {
    const p = (keuzes: Keuzes) => [{ model: 'OVERKAPPING', keuzes, aantal: 1 }];
    const a = ontwerpKenmerken(leegPlan, p(OV.carport.keuzes), planCatalogus, { zonderWoning: true });
    expect(a).toEqual([{ soort: 'model:OVERKAPPING:1', tekst: 'carport 5 × 5 m: vrijstaand, plat dak, EPDM op dakbeschot, hout: douglas' }]);
    const b = ontwerpKenmerken(leegPlan, p({ ...OV.carport.keuzes, dakvorm: 'zadel', bedekking: 'pannen' }), planCatalogus, { zonderWoning: true });
    expect(verschillen([a, b]).map((x) => x[0])).toEqual([a[0]!.tekst, expect.stringContaining('zadeldak')]);
    // Met ramen erbij: die tellen wel.
    const met = ontwerpKenmerken(leegPlan, [...p(OV.carport.keuzes), { model: 'RAAM', keuzes: {}, aantal: 2 }], planCatalogus, { zonderWoning: true });
    expect(met.map((k) => k.soort)).toEqual(['ramen', 'model:OVERKAPPING:1', 'aantal']);
    expect(met[2]!.tekst).toBe('2 ramen en deuren');
    expect(vastModelZin('LUIFEL', berekenVastModel('LUIFEL', {}))).toBe('luifel 2,50 m breed, 1,20 m diep: gelaagd glas, trekstangen erboven, poederlak antracietgrijs (RAL 7016)');
  });
});
