/**
 * Licht bij nacht en ledstrips (ronde 15, 17/11): wat de motor zegt dat 's nachts licht geeft (`Plan3DOpties.verlichting`,
 * `Blok.licht`), de ledstrips in de afgewerkte woning, de telling met de voedingen, de controles, de woorden voor de
 * klant en het 3D-pakket. Zonder de optie verandert er niets (ook de vingerafdrukken in dak.test.ts bewaken dat).
 */
import { describe, expect, it } from 'vitest';
import {
  controleerPlan, leesPakket3D, ledstripBlokken, stripLangsMuren, LEDSTRIP_PROFIEL, LICHTKLEUREN, lichtkleurVan, plattegrond3D, postenVan, RAAM_LICHT, standaardDak,
  techniekVoorKlant, telTechniek, toestelBlokken, VOEDING_LEDSTRIP, vloerHoogte,
  PAKKET3D_SOORT, PAKKET3D_VERSIE, type Blok, type Leiding, type Pakket3D, type Plattegrond, type Toestel,
} from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { techniekCatalogus as tc } from '../voorbeelden/techniek.js';
import { uitgerusteWoning } from '../voorbeelden/techniekwoning.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';
import { woningOpbouwCatalogus } from '../voorbeelden/woningopbouw.js';
import type { Opening } from '../src/index.js';

const cat = planCatalogus;
/** Een eenvoudig raam per opening met een positie: een kader en een ruit (zoals schuin-3d.test.ts). */
const openingInhoud = (_plan: Plattegrond, _posities: unknown) => (o: Opening) => (o.positie ? {
  hoogte: o.hoogte + 4,
  blokken: [
    { code: 'kader', soort: 'kunststof', vorm: 'blok', x: 0, y: 0, z: 0, b: o.breedte, h: o.hoogte, d: 7, kleur: '#383e42' },
    { code: 'glas', soort: 'glas', vorm: 'blok', x: 6, y: 6, z: 3, b: o.breedte - 12, h: o.hoogte - 12, d: 2, kleur: '#c5d5da' },
  ] as Blok[],
} : undefined);
/** Zonder het veld `licht`: om te tonen dat de optie verder niets verandert. */
const zonderLicht = (bs: Blok[]) => bs.map(({ licht: _licht, ...b }) => b);

/** De voorbeeldwoning met een ledstrip buiten onder de dakrand van de tuingevel (onderkant van het plan, buitenmuur 30 cm). */
function metStrip(extra: Partial<Leiding> = {}): Plattegrond {
  const { plan } = voorbeeldWoning();
  return { ...plan, leidingen: [{ id: 'ls1', soort: 'ledstrip', punten: [[840, 916], [1400, 916]], hoogte: 'plafond', ...extra }] };
}

describe('licht bij nacht (Plan3DOpties.verlichting)', () => {
  it('zonder ledstrips en lampen: dezelfde blokken, alleen het glas van ramen en daklichten krijgt licht', () => {
    const { plan, posities } = voorbeeldWoning();
    const inhoud = openingInhoud(plan, posities);
    for (const o of [{ inhoud }, { inhoud, aanleg: true, gevelkoppen: true, dingen: true }, { inhoud, laag: 110 }, { inhoud, lichtinval: true }]) {
      for (const p of [plan, { ...plan, dak: standaardDak() }]) {
        const zonder = plattegrond3D(p, cat, o), met = plattegrond3D(p, cat, { ...o, verlichting: true });
        expect(zonderLicht(met.blokken)).toEqual(zonder.blokken);
        expect(met.kader).toEqual(zonder.kader);
        expect(zonder.blokken.some((b) => b.licht)).toBe(false);
        // Alleen glas, en alleen in ramen en buitendeuren (niet een douchewand of een spiegel).
        const licht = met.blokken.filter((b) => b.licht);
        expect(licht.length).toBeGreaterThan(5);
        expect(licht.every((b) => b.soort === 'glas' || b.soort === 'matglas')).toBe(true);
      }
    }
  });
  it('per soort ruimte feller of zwakker; het grote schuifraam verlicht het terras van binnenuit', () => {
    const { plan, posities } = voorbeeldWoning();
    const met = plattegrond3D(plan, cat, { inhoud: openingInhoud(plan, posities), verlichting: true, dingen: true });
    const schuif = plan.openingen.find((o) => o.soort === 'schuifraam')!;
    const glas = met.blokken.filter((b) => b.code.startsWith(`opening:${schuif.id}.`) && b.licht);
    expect(glas.length).toBeGreaterThan(0);
    expect(glas.every((b) => b.licht!.sterkte === RAAM_LICHT.leefruimte)).toBe(true);
    // Eén glas met echt licht, binnen in de leefruimte (die ligt boven het schuifraam op het plan: naar −z).
    const echt = glas.filter((b) => b.licht!.bereik);
    expect(echt).toHaveLength(1);
    expect(echt[0]!.licht!.vanaf![2]).toBeLessThan(-50);
    // Een slaapkamer zwakker dan de leefruimte.
    expect(RAAM_LICHT.slaapkamer).toBeLessThan(RAAM_LICHT.leefruimte);
  });
  it('een buitenlamp aan de gevel licht op en verlicht de gevel; binnen telt alleen wat buiten hangt', () => {
    const { plan } = voorbeeldWoning();
    const lamp: Toestel = { id: 'bl1', type: 'buitenlamp', x: 120, y: 921, hoogte: 190, draai: 0, aan: 'wand' };
    const p = { ...plan, toestellen: [lamp] };
    const met = plattegrond3D(p, cat, { techniekBuiten: true, verlichting: true, dingen: true });
    const delen = met.blokken.filter((b) => b.code.startsWith('toestel:bl1.'));
    expect(delen.length).toBeGreaterThan(0);
    const licht = delen.filter((b) => b.licht);
    expect(licht.map((b) => b.code.split('_').slice(-2).join('_')).sort()).toEqual(['licht_boven', 'licht_onder']);
    const echt = licht.filter((b) => b.licht!.bereik);
    expect(echt).toHaveLength(1);
    // Vóór de lamp: de lamp kijkt naar onder op het plan (+z), het licht hangt daar.
    expect(echt[0]!.licht!.vanaf![2]).toBeGreaterThan(20);
    // Zonder de optie: de blokken van vroeger.
    expect(zonderLicht(met.blokken)).toEqual(plattegrond3D(p, cat, { techniekBuiten: true, dingen: true }).blokken);
    // Dezelfde vorm als in de techniek (alleen het licht erbij).
    expect(toestelBlokken(lamp, tc.toestellen.buitenlamp!, vloerHoogte(p, 0), p.muurhoogte, 'toestel_bl1', false).length).toBe(delen.length);
  });
});

describe('ledstrips', () => {
  it('in de afgewerkte woning een dun profiel met een strook die licht geeft, onder de dakrand, van de muur weg', () => {
    const p = metStrip();
    const s = plattegrond3D(p, cat, { verlichting: true, dingen: true });
    const strip = s.blokken.filter((b) => b.code.startsWith('leiding:ls1.'));
    expect(strip.map((b) => b.code.split('_').pop())).toEqual(['profiel', 'licht']);
    const [profiel, licht] = strip as [Blok, Blok];
    const H = p.muurhoogte;
    expect(profiel.y + profiel.h).toBeCloseTo(H - 6 + LEDSTRIP_PROFIEL.hoog / 2, 5);
    expect(licht.y).toBeCloseTo(H - 6 - LEDSTRIP_PROFIEL.hoog / 2, 5);
    expect(profiel.b).toBeCloseTo(560 + LEDSTRIP_PROFIEL.diep, 5);
    expect(profiel.d).toBeLessThan(2);
    expect(licht.licht?.kleur).toBe(LICHTKLEUREN.warm!.kleur);
    // Het licht hangt vóór de gevel (buiten: naar +z, weg van de muur) en eronder.
    expect(licht.licht!.vanaf![2]).toBeGreaterThan(50);
    expect(licht.licht!.vanaf![1]).toBeLessThan(0);
    // Het kader verandert niet (de strip komt na het kader).
    expect(s.kader).toEqual(plattegrond3D(p, cat, {}).kader);
  });
  it('zonder de optie, met de techniek aan of met lage muren (hoog): geen profiel', () => {
    const p = metStrip();
    expect(plattegrond3D(p, cat, {}).blokken.some((b) => b.code.includes('ledstrip'))).toBe(false);
    expect(plattegrond3D(p, cat, { verlichting: true, techniek: { weergave: 'gewoon' } }).blokken.some((b) => b.code.includes('ledstrip_'))).toBe(false);
    // Muren laag gaat samen met de verdieping waarop je werkt (zoals in de app): een strip bovenaan zou boven de lage muren zweven.
    expect(plattegrond3D(p, cat, { verlichting: true, laag: 110, totNiveau: 0 }).blokken.some((b) => b.code.includes('ledstrip'))).toBe(false);
    // Op een verdieping eronder blijven de muren hoog: de strip ook.
    expect(plattegrond3D(p, cat, { verlichting: true, laag: 110 }).blokken.some((b) => b.code.includes('ledstrip'))).toBe(true);
    // Laag (een trap of een tuinmuur): blijft bij lage muren.
    expect(plattegrond3D(metStrip({ hoogte: 20 }), cat, { verlichting: true, laag: 110, totNiveau: 0 }).blokken.some((b) => b.code.includes('ledstrip'))).toBe(true);
  });
  it('de kleur van het licht, en binnen hangt het licht van de muur weg de kamer in', () => {
    expect(lichtkleurVan('blauw').kleur).toBe(LICHTKLEUREN.blauw!.kleur);
    expect(lichtkleurVan('onbekend').code).toBe('warm');
    const { plan } = voorbeeldWoning();
    // Binnen langs de muur tussen leefruimte en keuken (y = 380), aan de kant van de leefruimte (+z), onder een kast.
    const p: Plattegrond = { ...plan, leidingen: [{ id: 'ls2', soort: 'ledstrip', punten: [[440, 386], [800, 386]], hoogte: 145, lichtkleur: 'neutraal' }] };
    const bs = ledstripBlokken(p, tc, {});
    const licht = bs.find((b) => b.licht)!;
    expect(licht.licht!.kleur).toBe(LICHTKLEUREN.neutraal!.kleur);
    expect(licht.licht!.vanaf![2]).toBeGreaterThan(50);
    expect(licht.y).toBeCloseTo(145 - LEDSTRIP_PROFIEL.hoog / 2, 5);
  });
  it('trekken: van tik tot tik tegen de muur, zonder het stukje van de tik naar de muur', () => {
    const { plan } = voorbeeldWoning();
    // 25 cm buiten de tuingevel getikt (buitenvlak op y = 915): de strip hangt 1 cm van de gevel, van tik tot tik.
    expect(stripLangsMuren(plan, [845, 940], [1385, 940])).toEqual([[845, 916], [1385, 916]]);
    // Om de hoek van de woning (rechtsonder, buitenvlak x = 1415): langs beide gevels.
    expect(stripLangsMuren(plan, [1000, 940], [1440, 700])).toEqual([[1000, 916], [1416, 916], [1416, 700]]);
    // Ver van elke muur: waar je tikte.
    expect(stripLangsMuren(plan, [500, 1200], [800, 1200])).toEqual([[500, 1200], [800, 1200]]);
  });
  it('telling: de lopende meter en de voedingen (één per strip, per begonnen 10 m één meer)', () => {
    const p: Plattegrond = { ...metStrip(), leidingen: [...metStrip().leidingen!, { id: 'ls3', soort: 'ledstrip', punten: [[0, 916], [0, 2116]], hoogte: 20 }] };
    const regels = telTechniek(p, tc);
    const strip = regels.find((r) => r.materiaal === 'ledstrip')!;
    expect(strip.aantal).toBe(2);
    expect(strip.lengte).toBeCloseTo(5.6 + 12, 5);
    expect(regels.find((r) => r.materiaal === VOEDING_LEDSTRIP)!.aantal).toBe(1 + 2);
    // Zonder strip geen voeding.
    expect(telTechniek(uitgerusteWoning().plan, tc).some((r) => r.materiaal === VOEDING_LEDSTRIP)).toBe(false);
  });
  it('controles: geen los einde voor een strip; de posten noemen de strip en de voeding', () => {
    const p = metStrip();
    const meldingen = controleerPlan(p, { ...cat, techniek: tc }).filter((m) => m.leiding === 'ls1');
    expect(meldingen).toEqual([]);
    const posten = postenVan(p, { ...cat, techniek: tc, opbouw: woningOpbouwCatalogus }, {});
    const elek = posten.find((x) => x.id === 'techniek:elektriciteit')!;
    expect(elek.detail.join(' ')).toMatch(/ledstrip/i);
    expect(elek.detail.join(' ')).toMatch(/voeding/i);
    expect(elek.detail.join(' ')).not.toMatch(/leidingen ertussen/);
    expect(elek.dingen).toContain('leiding:ls1');
  });
  it('voor de klant: waar ze hangt en de kleur van het licht, zonder maten', () => {
    const k = techniekVoorKlant(metStrip({ lichtkleur: 'koel' }), { techniek: tc })!;
    const d = k.dingen['leiding:ls1']!;
    expect(d.naam).toBe('Ledstrip');
    expect(d.waar).toBe('Buiten, langs de gevel, onder de dakrand (gelijkvloers). Licht: koel wit.');
    expect(k.vakken.find((v) => v.vak === 'elektriciteit')!.leidingen).toEqual([{ naam: 'Ledstrip', kleur: tc.leidingen.ledstrip!.kleur }]);
  });
  it('het 3D-pakket draagt het licht mee (versie 4); een kijker leest het zoals het is', () => {
    const p = metStrip();
    const scene = plattegrond3D(p, cat, { verlichting: true });
    const pakket: Pakket3D = { soort: PAKKET3D_SOORT, versie: PAKKET3D_VERSIE, gemaakt: '', project: { nummer: 'X', naam: 'Proef' }, woning: [{ naam: 'Gelijkvloers', scene, laag: scene }], posities: [] };
    expect(PAKKET3D_VERSIE).toBe(4);
    const terug = leesPakket3D(JSON.parse(JSON.stringify(pakket)));
    expect(terug.woning[0]!.scene.blokken.filter((b) => b.licht).length).toBe(scene.blokken.filter((b) => b.licht).length);
    expect(terug.woning[0]!.scene.blokken.some((b) => b.licht && b.code.includes('ledstrip'))).toBe(true);
  });
});
