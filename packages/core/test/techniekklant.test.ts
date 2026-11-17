/**
 * De techniek voor de klant (ronde 10c, 17/11): wat buiten zichtbaar is in de afgewerkte woning (`techniekBuiten`), de
 * woorden voor de klant (`techniekVoorKlant`), de techniek in het 3D-pakket (`techniekPakket`, `leesPakket3D`).
 */
import { describe, expect, it } from 'vitest';
import {
  leesPakket3D, plattegrond3D, standaardDak, techniekPakket, techniekVoorKlant, toestelBlokken, toestelBuiten, vloerHoogte,
  PAKKET3D_SOORT, PAKKET3D_VERSIE, TECHNIEK_KLANT_VAKKEN, TECHNIEK_VOORBEHOUD, type Pakket3D, type Plattegrond,
} from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { techniekCatalogus as tc } from '../voorbeelden/techniek.js';
import { techniekPlanCatalogus as cat, uitgerusteWoning } from '../voorbeelden/techniekwoning.js';
import { uitbouwVoorbeeld } from '../voorbeelden/uitbouwvoorbeeld.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

/** Woorden die niet voor de klant zijn: prijzen, en hoeveelheden of maten voor de aannemer en de installateur. */
const NIET_VOOR_KLANT = /€|prijs|btw|totaal|korting|marge|offerte|\bm²|\d\s*(m|mm|cm)\b|Ø|kring \d|lopende meter|modules/i;

const ids = (plan: Plattegrond, blokken: { code: string }[]) => [...new Set(blokken.map((b) => /^toestel:([^.]+)\./.exec(b.code)?.[1] ?? /^toestel_(.+?)_/.exec(b.code)?.[1]).filter(Boolean))];

describe('techniek buiten in de afgewerkte woning (techniekBuiten)', () => {
  it('een plan zonder techniek verandert niet, met welke opties ook', () => {
    const { plan } = voorbeeldWoning();
    for (const o of [{}, { aanleg: true, gevelkoppen: true, dingen: true, meubels: true }, { laag: 110, totNiveau: 0 }, { lichtinval: true, aanleg: true }, { totNiveau: 0 }]) {
      expect(plattegrond3D(plan, cat, { ...o, techniekBuiten: true })).toEqual(plattegrond3D(plan, cat, o));
      expect(plattegrond3D({ ...plan, dak: standaardDak() }, cat, { ...o, techniekBuiten: true })).toEqual(plattegrond3D({ ...plan, dak: standaardDak() }, cat, o));
    }
  });
  it('zonder de optie of met de techniek aan: de blokken van vroeger', () => {
    const { plan } = uitgerusteWoning();
    const o = { aanleg: true, gevelkoppen: true, dingen: true };
    expect(plattegrond3D(plan, planCatalogus, { ...o, techniekBuiten: true }).blokken.some((b) => b.code.includes('toestel'))).toBe(true);
    expect(plattegrond3D(plan, { ...planCatalogus, techniek: undefined }, { ...o, techniekBuiten: true })).toEqual(plattegrond3D(plan, { ...planCatalogus, techniek: undefined }, o));
    expect(plattegrond3D(plan, cat, { ...o, techniek: { weergave: 'gewoon' }, techniekBuiten: true })).toEqual(plattegrond3D(plan, cat, { ...o, techniek: { weergave: 'gewoon' } }));
  });
  it('wat buiten staat: buitenunits, het dak en de buitenkant van een gevel (laadpaal, rooster, buitenkraan)', () => {
    const { plan } = uitgerusteWoning();
    expect(plan.toestellen!.filter((t) => toestelBuiten(plan, t)).map((t) => t.type).sort()).toEqual(['airco_buiten', 'buitenkraan', 'dakdoorvoer', 'gevelrooster', 'laadpaal', 'warmtepomp_buiten']);
    const { plan: uitbouw } = uitbouwVoorbeeld();
    expect(uitbouw.toestellen!.filter((t) => toestelBuiten(uitbouw, t)).map((t) => t.type)).toEqual(['buitenkraan']);
  });
  it('na de blokken van vroeger, met hetzelfde kader; op hun echte maat, zonder merkteken; met de dingen', () => {
    const { plan } = uitgerusteWoning();
    const o = { aanleg: true, gevelkoppen: true, dingen: true };
    const zonder = plattegrond3D(plan, cat, o), met = plattegrond3D(plan, cat, { ...o, techniekBuiten: true });
    expect(met.kader).toEqual(zonder.kader);
    expect(met.blokken.slice(0, zonder.blokken.length)).toEqual(zonder.blokken);
    const extra = met.blokken.slice(zonder.blokken.length);
    expect(extra.every((b) => /^toestel:[^.]+\.toestel_/.test(b.code))).toBe(true);
    expect(extra.some((b) => b.code.includes('_merk_'))).toBe(false);
    expect(ids(plan, extra).sort()).toEqual(plan.toestellen!.filter((t) => toestelBuiten(plan, t)).map((t) => t.id).sort());
    // De buitenunit van de warmtepomp zoals toestelBlokken hem echt tekent (niet vergroot).
    const wp = plan.toestellen!.find((t) => t.type === 'warmtepomp_buiten')!;
    const echt = toestelBlokken(wp, tc.toestellen.warmtepomp_buiten!, vloerHoogte(plan, 0), plan.muurhoogte, `toestel_${wp.id}`, false);
    expect(extra.filter((b) => b.code.startsWith(`toestel:${wp.id}.`))).toEqual(echt.map((b) => ({ ...b, code: `toestel:${wp.id}.${b.code}` })));
    // Zonder de dingen: de codes zoals in de techniek.
    expect(plattegrond3D(plan, cat, { techniekBuiten: true }).blokken.filter((b) => b.code.startsWith('toestel_')).length).toBe(extra.length);
  });
  it('de dakdoorvoer alleen waar een plat dak getekend wordt; met lage muren niets dat boven de muren uitkomt', () => {
    const { plan } = uitgerusteWoning();
    const doorvoer = plan.toestellen!.find((t) => t.type === 'dakdoorvoer')!;
    const heeft = (o: object, p: Plattegrond = plan) => plattegrond3D(p, cat, { ...o, techniekBuiten: true }).blokken.some((b) => b.code.startsWith(`toestel_${doorvoer.id}_`));
    expect(heeft({})).toBe(true);
    expect(heeft({ dak: false })).toBe(false);
    expect(heeft({ laag: 110 })).toBe(false);
    expect(heeft({ totNiveau: 0 })).toBe(false);
    expect(heeft({}, { ...plan, dak: { vorm: 'zadel', helling: 45, richting: 'onder', oversteek: 50, bedekking: { materiaal: 'pannen', kleur: 'antraciet' } } })).toBe(false);
    // Gelijkvloers met lage muren: de buitenunits (op de grond) en de kraan wel, de laadpaal (tot 129 cm) en het rooster (220 cm) aan de gevel niet.
    const laag = plattegrond3D(plan, cat, { laag: 110, totNiveau: 0, techniekBuiten: true });
    const types = ids(plan, laag.blokken).map((id) => plan.toestellen!.find((t) => t.id === id)!.type).sort();
    expect(types).toEqual(['airco_buiten', 'buitenkraan', 'warmtepomp_buiten']);
  });
});

describe('de techniek in de woorden van de klant', () => {
  it('niets zonder techniek', () => {
    expect(techniekVoorKlant(voorbeeldWoning().plan, cat)).toBeUndefined();
    expect(techniekPakket(voorbeeldWoning().plan, cat)).toBeUndefined();
    expect(techniekVoorKlant(uitgerusteWoning().plan, { techniek: undefined })).toBeUndefined();
  });
  it('elk toestel en elke soort leiding in de catalogus heeft woorden voor de klant, zonder maten of prijzen', () => {
    for (const x of [...Object.values(tc.toestellen), ...Object.values(tc.leidingen)]) {
      expect(x.klant?.naam, x.label).toBeTruthy();
      expect(x.klant?.uitleg, x.label).toMatch(/\.$/);
      expect(`${x.klant!.naam} ${x.klant!.uitleg}`).not.toMatch(NIET_VOOR_KLANT);
    }
  });
  it('per vak de woorden van de klant, de toestellen zonder aantallen en de kleuren van de leidingen', () => {
    const { plan } = uitgerusteWoning();
    const k = techniekVoorKlant(plan, cat)!;
    expect(k.vakken.map((v) => v.naam)).toEqual(['Elektriciteit', 'Verwarming en koeling', 'Ventilatie', 'Water en afvoer']);
    expect(k.vakken.map((v) => v.naam)).toEqual(Object.values(TECHNIEK_KLANT_VAKKEN).map((v) => v.naam));
    const water = k.vakken.find((v) => v.vak === 'sanitair')!;
    expect(water.leidingen).toEqual(expect.arrayContaining([{ naam: 'Warm water', kleur: '#e53935' }, { naam: 'Koud water', kleur: '#1e88e5' }, { naam: 'Afvoer', kleur: '#795548' }]));
    expect(k.vakken[0]!.toestellen[0]).toBe('Dubbel stopcontact');
    expect(JSON.stringify(k)).not.toMatch(NIET_VOOR_KLANT);
  });
  it('elk toestel en elke leiding: naam, uitleg en waar het zit', () => {
    const { plan } = uitgerusteWoning();
    const k = techniekVoorKlant(plan, cat)!;
    expect(Object.keys(k.dingen).length).toBe(plan.toestellen!.length + plan.leidingen!.length);
    const wp = plan.toestellen!.find((t) => t.type === 'warmtepomp_buiten')!;
    expect(k.dingen[`toestel:${wp.id}`]).toMatchObject({ vak: 'klimaat', naam: 'Warmtepomp (buitendeel)', waar: 'Buiten, naast de woning (gelijkvloers)' });
    const laadpaal = plan.toestellen!.find((t) => t.type === 'laadpaal')!;
    expect(k.dingen[`toestel:${laadpaal.id}`]!.waar).toBe('Buiten, aan de gevel (gelijkvloers)');
    const koel = plan.leidingen!.find((l) => l.soort === 'koelleiding')!;
    expect(k.dingen[`leiding:${koel.id}`]).toMatchObject({ naam: 'Leiding van de airco', waar: 'Loopt in de muur (gelijkvloers). Verbindt airco (binnendeel) met airco (buitendeel).' });
  });
});

describe('de techniek in het 3D-pakket', () => {
  const { plan } = uitgerusteWoning();
  const techniek = techniekPakket(plan, cat)!;
  const basis: Pakket3D = {
    soort: PAKKET3D_SOORT, versie: PAKKET3D_VERSIE, gemaakt: '2026-11-17T12:00:00.000Z', project: { nummer: 'OF-1', naam: 'Woning' },
    woning: [{ naam: 'Gelijkvloers', scene: plattegrond3D(plan, cat, { dingen: true, techniekBuiten: true }), laag: plattegrond3D(plan, cat, { dingen: true, laag: 110 }) }], posities: [],
  };
  it('per verdieping de uitgezette 3D zoals op het scherm, op de grond gezet, met de dingen; de woorden en het voorbehoud', () => {
    expect(techniek.niveaus.map((n) => n.naam)).toEqual(['Gelijkvloers', 'Verdieping 1']);
    const opties = (niveau: number) => ({ techniek: { weergave: 'uitgezet' as const, niveau, opvallend: true }, dingen: true });
    expect(techniek.niveaus[0]!.scene).toEqual(plattegrond3D(plan, cat, opties(0)));
    // Verdieping 1 zakt evenveel als haar vloer hoog ligt: dezelfde blokken, de vloer op de grond, het kader mee.
    const hoog = plattegrond3D(plan, cat, opties(1)), dy = vloerHoogte(plan, 1), v1 = techniek.niveaus[1]!.scene;
    expect(v1.blokken.map((b) => ({ ...b, y: Math.round((b.y + dy) * 100) / 100 }))).toEqual(hoog.blokken);
    expect(v1.kader).toEqual({ ...hoog.kader, h: hoog.kader.h - dy });
    expect(Math.min(...v1.blokken.filter((b) => b.code.startsWith('uitgezet_')).map((b) => b.y))).toBe(0);
    expect(techniek.voorbehoud).toBe(TECHNIEK_VOORBEHOUD);
    // Elk ding in de scènes heeft zijn woorden.
    const dingen = new Set(techniek.niveaus.flatMap((n) => n.scene.blokken.map((b) => /^((?:toestel|leiding):[^.]+)\./.exec(b.code)?.[1]).filter((x): x is string => !!x)));
    expect(dingen.size).toBeGreaterThan(100);
    expect([...dingen].every((d) => techniek.dingen[d])).toBe(true);
    // Redelijk groot: ± 0,3 MB voor de voorbeeldwoning met 78 toestellen en 60 leidingen.
    expect(JSON.stringify(techniek).length).toBeLessThan(400_000);
  });
  it('optioneel: de versie blijft 4, een pakket zonder techniek leest zoals vroeger', () => {
    expect(PAKKET3D_VERSIE).toBe(4);
    expect('techniek' in leesPakket3D(basis)).toBe(false);
    expect(leesPakket3D(JSON.stringify(basis))).toEqual(leesPakket3D(basis));
  });
  it('met techniek: ze komt ongewijzigd door het lezen, ook in een variant; wat niet klopt valt weg', () => {
    const met = leesPakket3D(JSON.stringify({ ...basis, techniek }));
    expect(met.techniek).toEqual(techniek);
    const { techniek: _weg, ...zonder } = met;
    expect(zonder).toEqual(leesPakket3D(basis));
    const varianten = leesPakket3D({ ...basis, varianten: [{ ...basis, techniek }] });
    expect(varianten.varianten?.[0]?.techniek).toEqual(techniek);
    expect('techniek' in leesPakket3D({ ...basis, techniek: { niveaus: [{ naam: 'x', scene: null }] } })).toBe(false);
    expect('techniek' in leesPakket3D({ ...basis, techniek: 'ja' })).toBe(false);
    const rommel = leesPakket3D({ ...basis, techniek: { ...techniek, vakken: [null, { vak: 'x', naam: 'X', kleur: 'rood' }], dingen: { a: null, b: { vak: 'x', naam: 'B', uitleg: 3 } } } });
    expect(rommel.techniek?.vakken).toEqual([{ vak: 'x', naam: 'X', kleur: '#777777', uitleg: '', toestellen: [], leidingen: [] }]);
    expect(rommel.techniek?.dingen).toEqual({ b: { vak: 'x', naam: 'B', uitleg: '' } });
  });
});
