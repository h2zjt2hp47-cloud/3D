/** Sectionale garagepoort (15/11): het model, de tekening, de 3D en de poort als opening in de plattegrond. */
import { describe, expect, it } from 'vitest';
import { berekenConfiguratie, controleerModel, controleerPlan, plattegrond3D, standaardKeuzes, tekenPlattegrond, tekenSvg, type Keuzes, type Opening, type Plattegrond } from '../src/index.js';
import { garagepoort, poortPrijslijst } from '../voorbeelden/garagepoort.js';
import { poortBlokken, poortScene } from '../voorbeelden/garagepoort3d.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

const poort = (extra: Keuzes = {}) => berekenConfiguratie(garagepoort, { ...standaardKeuzes(garagepoort), ...extra }, poortPrijslijst);

describe('garagepoort: model en tekening', () => {
  it('model zonder fouten; de standaardpoort is geldig en heeft nog geen prijs', () => {
    expect(controleerModel(garagepoort)).toEqual([]);
    const r = poort();
    expect(r.geldig).toBe(true);
    expect(r.meldingen).toEqual([]);
    expect(r.stuklijst).toEqual([]);
    expect(r.prijs.brutoprijsExcl).toBe(0);
  });

  it('secties van ongeveer 50 cm: het aantal volgt de hoogte', () => {
    expect([poort().afgeleid.ns, poort().afgeleid.sh]).toEqual([4, 531.25]);
    expect(poort({ hoogte: 3000 }).afgeleid.ns).toBe(6);
    expect(poort({ hoogte: 1900 }).afgeleid.ns).toBe(4);
    expect(poort({ hoogte: 1900 }).meldingen.map((m) => m.code)).toEqual(['laag']);
    expect(poort({ breedte: 5500 }).meldingen.map((m) => m.code)).toEqual(['breed']);
    expect(poort({ breedte: 1500 }).geldig).toBe(false);
  });

  it('belijning: vlak, horizontale lijnen of cassettes', () => {
    const tel = (r: ReturnType<typeof poort>, code: string) => r.tekening!.vormen.filter((v) => v.code.startsWith(code)).length;
    const vlak = poort({ belijning: 'vlak' });
    expect([tel(vlak, 'lijn'), tel(vlak, 'cassette'), tel(vlak, 'naad')]).toEqual([0, 0, 3]);
    const lijnen = poort({ belijning: 'lijnen' });
    expect(tel(lijnen, 'lijn')).toBe(Number(lijnen.afgeleid.ns) * Number(lijnen.afgeleid.nl) - 1);
    expect(tel(lijnen, 'lijn')).toBeGreaterThan(8);
    const cassettes = poort({ belijning: 'cassettes' });
    expect(tel(cassettes, 'cassette')).toBe(4 * 4);
    expect(tekenSvg(cassettes.tekening!)).toContain('data-code="cassette.1"');
  });

  it('vensters: een rij op ooghoogte, in plaats van de cassettes van die sectie', () => {
    const r = poort({ belijning: 'cassettes', vensters: true });
    const vensters = r.tekening!.vormen.filter((v) => v.code.startsWith('venster'));
    expect(vensters).toHaveLength(4);
    const sh = Number(r.afgeleid.sh);
    // Tweede sectie van boven: tussen 1,06 m en 1,59 m boven de vloer.
    for (const v of vensters) {
      expect(v.y).toBeGreaterThan(sh);
      expect(v.y + v.hoogte).toBeLessThan(2 * sh);
      expect(v.x).toBeGreaterThanOrEqual(0);
      expect(v.x + v.breedte).toBeLessThanOrEqual(2500);
    }
    expect(r.tekening!.vormen.filter((v) => v.code.startsWith('cassette'))).toHaveLength(3 * 4);
    expect(poort({ vensters: false }).tekening!.vormen.some((v) => v.code.startsWith('venster'))).toBe(false);
  });

  it('kleur uit de RAL-waaier, met de vermelding dat het scherm een benadering toont', () => {
    const r = poort({ kleur: 'ral9006' });
    expect(r.afgeleid.kleur_hex).toBe('#a1a1a0');
    expect(r.tekening!.vormen.find((v) => v.code === 'blad')!.vulling).toBe('#a1a1a0');
    expect(garagepoort.kenmerken.find((k) => k.code === 'kleur')!.helptekst).toContain('benadering');
    expect(poort({ kleur: 'roze' }).geldig).toBe(false);
  });
});

describe('garagepoort: 3D', () => {
  const overlapt = (a: { x: number; y: number; b: number; h: number }, b: { x: number; y: number; b: number; h: number }) =>
    Math.min(a.x + a.b, b.x + b.b) - Math.max(a.x, b.x) > 0.02 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.02;

  it.each([
    ['vlak', { belijning: 'vlak' }], ['lijnen', { belijning: 'lijnen' }], ['cassettes', { belijning: 'cassettes' }],
    ['lijnen met vensters', { belijning: 'lijnen', vensters: true }], ['cassettes met vensters, breed en hoog', { belijning: 'cassettes', vensters: true, breedte: 5000, hoogte: 2600 }],
  ] as [string, Keuzes][])('%s: alles binnen de opening, panelen en ruiten overlappen niet', (_naam, keuzes) => {
    const r = poort(keuzes);
    const rb = poortBlokken(r);
    expect(rb.b).toBe(Number(keuzes.breedte ?? 2500) / 10);
    expect([rb.kast, rb.borst]).toEqual([0, 0]);
    for (const b of rb.blokken) {
      expect(b.x, b.code).toBeGreaterThanOrEqual(-0.011);
      expect(b.x + b.b, b.code).toBeLessThanOrEqual(rb.b + 0.011);
      expect(b.y, b.code).toBeGreaterThanOrEqual(-0.011);
      expect(b.y + b.h, b.code).toBeLessThanOrEqual(rb.h + 0.011);
      expect(b.z, b.code).toBeGreaterThanOrEqual(-1);
      expect(b.z + b.d, b.code).toBeLessThanOrEqual(10);
    }
    // De panelen van de secties en het glas van de vensters bedekken samen de opening, zonder elkaar te overlappen.
    const vlakken = rb.blokken.filter((b) => /^sectie/.test(b.code) || /^venster\d+$/.test(b.code) || /^naad/.test(b.code));
    for (let i = 0; i < vlakken.length; i++) for (let j = i + 1; j < vlakken.length; j++) expect(overlapt(vlakken[i]!, vlakken[j]!), `${vlakken[i]!.code} / ${vlakken[j]!.code}`).toBe(false);
    const oppervlakte = vlakken.reduce((t, b) => t + b.b * b.h, 0);
    expect(Math.abs(oppervlakte / (rb.b * rb.h) - 1)).toBeLessThan(0.002);
    expect(rb.blokken.filter((b) => b.soort === 'glas')).toHaveLength(keuzes.vensters === true ? Number(r.afgeleid.nc) : 0);
  });

  it('belijning en kleur zijn zichtbaar in de blokken', () => {
    const tel = (keuzes: Keuzes, begin: string) => poortBlokken(poort(keuzes)).blokken.filter((b) => b.code.startsWith(begin)).length;
    expect(tel({ belijning: 'vlak' }, 'lijn') + tel({ belijning: 'vlak' }, 'cassette')).toBe(0);
    expect(tel({ belijning: 'lijnen' }, 'lijn')).toBe(4 * 3);
    expect(tel({ belijning: 'cassettes' }, 'cassette')).toBe(4 * 4 * 4);
    const rood = poortBlokken(poort({ kleur: 'ral3005' })).blokken.find((b) => b.code === 'sectie1')!;
    expect(rood.kleur).toBe('#59191f');
    // De vensters zitten in de tweede sectie van boven.
    const glas = poortBlokken(poort({ vensters: true })).blokken.filter((b) => b.soort === 'glas');
    for (const g of glas) {
      expect(g.y).toBeGreaterThan(2 * 53.125);
      expect(g.y + g.h).toBeLessThan(3 * 53.125);
    }
  });

  it('scène: de poort in een stuk gevel met een latei erboven', () => {
    const s = poortScene(poort());
    expect(s.blokken.find((b) => b.code === 'muur_boven')).toMatchObject({ x: 0, y: 212.5, b: 250 });
    expect(s.blokken.some((b) => b.zijden?.['z-']?.soort === 'steen')).toBe(true);
    expect(s.kader.b).toBeGreaterThan(250);
  });
});

describe('garagepoort als opening in de plattegrond', () => {
  const basis = voorbeeldWoning().plan;
  const plan = (opening: Partial<Opening> = {}): Plattegrond => ({
    ...basis, verdiepingen: [{ naam: 'Gelijkvloers' }], meubels: [], gevelOntwerp: undefined,
    ruimtes: [
      { id: 'garage', naam: 'Garage', type: 'garage', x: 0, y: 0, b: 400, d: 600, vloer: 'tegel_grijs', wand: 'wit' },
      { id: 'hal', naam: 'Hal', type: 'hal', x: 400, y: 0, b: 300, d: 600, vloer: 'tegel_grijs', wand: 'wit' },
    ],
    openingen: [
      { id: 'poort', soort: 'garagepoort', as: 'h', lijn: 600, midden: 200, breedte: 250, hoogte: 215, borstwering: 0, scharnier: 'begin', naarPlus: false, positie: 'p1', ...opening },
      { id: 'voordeur', soort: 'buitendeur', as: 'h', lijn: 600, midden: 550, breedte: 100, hoogte: 215, borstwering: 0, scharnier: 'begin', naarPlus: false },
    ],
  });

  it('hoort in een buitenmuur en telt als ingang van de garage', () => {
    const meldingen = controleerPlan(plan());
    expect(meldingen.filter((m) => m.ernst === 'fout')).toEqual([]);
    // De garage heeft geen binnendeur: ze is bereikbaar via de poort.
    expect(meldingen.some((m) => m.melding.includes('Garage is niet bereikbaar'))).toBe(false);
    const binnen = controleerPlan(plan({ as: 'v', lijn: 400, midden: 300 }));
    expect(binnen.find((m) => m.opening === 'poort')?.melding).toContain('Garagepoort tussen Garage en Hal staat in een binnenmuur');
    expect(controleerPlan(plan({ hoogte: 300 })).some((m) => m.opening === 'poort' && m.melding.includes('te hoog'))).toBe(true);
  });

  it('plattegrond: eigen symbool (blad in de opening, gestippeld waar de poort open hangt), geen draaicirkel', () => {
    const metPoort = tekenPlattegrond(plan(), planCatalogus, { raamInfo: (o) => (o.positie ? { label: 'P1' } : undefined) });
    expect(metPoort).toContain('stroke-dasharray="8 6"');
    expect(metPoort).toContain('>P1<');
    const zonder = tekenPlattegrond({ ...plan(), openingen: plan().openingen.slice(1) }, planCatalogus);
    expect(zonder).not.toContain('stroke-dasharray="8 6"');
    // Eén draaicirkel minder dan wanneer de poort een gewone buitendeur was.
    const bogen = (svg: string) => (svg.match(/ A /g) ?? []).length;
    expect(bogen(metPoort)).toBe(bogen(tekenPlattegrond(plan({ soort: 'buitendeur' }), planCatalogus)) - 1);
  });

  it('3D van de woning: de poort staat in de opening van de muur', () => {
    const rb = poortBlokken(berekenConfiguratie(garagepoort, { ...standaardKeuzes(garagepoort), breedte: 2500, hoogte: 2150, vensters: true }, poortPrijslijst));
    const s = plattegrond3D(plan(), planCatalogus, { inhoud: (o) => (o.id === 'poort' ? { blokken: rb.blokken, hoogte: rb.h } : undefined) });
    const secties = s.blokken.filter((b) => b.code.startsWith('sectie'));
    expect(secties.length).toBeGreaterThanOrEqual(4);
    for (const b of secties) {
      // In de opening (x 75 tot 325) en in de dikte van de muur op y = 600.
      expect(b.x).toBeGreaterThanOrEqual(75 - 0.01);
      expect(b.x + b.b).toBeLessThanOrEqual(325 + 0.01);
      expect(b.z).toBeGreaterThan(600 - 20);
      expect(b.z + b.d).toBeLessThan(600 + 20);
      expect(b.y + b.h).toBeLessThanOrEqual(215 + 0.01);
    }
    expect(s.blokken.filter((b) => b.soort === 'glas' && b.code.startsWith('venster'))).toHaveLength(4);
    // Boven de poort staat de muur (latei), eronder niets.
    expect(s.blokken.some((b) => b.code === 'boven_poort' && b.y === 215)).toBe(true);
    expect(s.blokken.some((b) => b.code === 'onder_poort')).toBe(false);
  });
});
