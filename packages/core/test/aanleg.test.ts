import { describe, expect, it } from 'vitest';
import { delenVan, niveauPlan, plattegrond3D, type Blok, type Plattegrond } from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

const aanleg = (blokken: Blok[]) => blokken.filter((b) => b.code.startsWith('terras_') || b.code.startsWith('pad_'));
/** Overlappen twee blokken in het grondvlak (meer dan een rand)? */
const overlapt = (a: Blok, b: Blok) => Math.min(a.x + a.b, b.x + b.b) - Math.max(a.x, b.x) > 0.5 && Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z) > 0.5;

/** Eén ruimte van 8 × 6 m met een schuifraam onderaan en een buitendeur rechts; `type` kiest hal of leefruimte. */
function doos(type: 'hal' | 'leefruimte'): Plattegrond {
  return {
    ruimtes: [{ id: 'r1', naam: 'Ruimte', type, x: 0, y: 0, b: 800, d: 600, vloer: 'parket_eik', wand: 'wit' }],
    openingen: [
      { id: 'schuif', soort: 'schuifraam', as: 'h', lijn: 600, midden: 400, breedte: 300, hoogte: 230, borstwering: 0, scharnier: 'begin', naarPlus: true },
      { id: 'deur', soort: 'buitendeur', as: 'v', lijn: 800, midden: 300, breedte: 100, hoogte: 230, borstwering: 0, scharnier: 'begin', naarPlus: true },
      { id: 'raam', soort: 'raam', as: 'h', lijn: 0, midden: 400, breedte: 200, hoogte: 150, borstwering: 90, scharnier: 'begin', naarPlus: true },
    ],
    meubels: [],
    muurhoogte: 270, buitenmuur: 30, binnenmuur: 10,
    gevel: { soort: 'steen', kleur: '#9c4a34' },
  };
}

describe('aanleg rond de woning (terras en pad) in de 3D', () => {
  it('zonder de optie verandert er niets: geen terras, geen pad', () => {
    const { plan } = voorbeeldWoning();
    expect(aanleg(plattegrond3D(plan, planCatalogus).blokken)).toEqual([]);
    expect(aanleg(plattegrond3D(plan, planCatalogus, { laag: 110, totNiveau: 0, lichtinval: true }).blokken)).toEqual([]);
  });

  it('met de optie komen er alleen blokken bij, en het kader blijft dat van de woning', () => {
    const { plan } = voorbeeldWoning();
    for (const opties of [{}, { laag: 110, totNiveau: 0 }, { totNiveau: 0, lichtinval: true }]) {
      const zonder = plattegrond3D(plan, planCatalogus, opties), met = plattegrond3D(plan, planCatalogus, { ...opties, aanleg: true });
      expect(met.kader).toEqual(zonder.kader);
      expect(met.blokken.slice(0, zonder.blokken.length)).toEqual(zonder.blokken);
      const erbij = met.blokken.slice(zonder.blokken.length);
      expect(erbij.length).toBeGreaterThan(0);
      expect(erbij).toEqual(aanleg(met.blokken));
    }
  });

  it('een schuifraam krijgt een terras tegen de gevel, breder dan het raam; een gewoon raam krijgt niets', () => {
    const blokken = aanleg(plattegrond3D(doos('leefruimte'), planCatalogus, { aanleg: true }).blokken);
    const terras = blokken.find((b) => b.code === 'terras_schuif')!;
    expect(terras.soort).toBe('tegel');
    // Onderste gevel: de buitenkant ligt op y = 600 + 15; het terras begint daar en steekt 110 cm naast het raam uit.
    expect([terras.x, terras.z, terras.b, terras.d]).toEqual([140, 615, 520, 320]);
    // Net boven het maaiveld, en onder de vloer van de woning (1,5 cm).
    expect(terras.y + terras.h).toBeGreaterThan(0);
    expect(terras.y + terras.h).toBeLessThan(1.5);
    expect(blokken.some((b) => b.code.includes('raam'))).toBe(false);
  });

  it('een buitendeur in een hal is de voordeur: een stoep en een pad; elders alleen een stoep', () => {
    const hal = aanleg(plattegrond3D(doos('hal'), planCatalogus, { aanleg: true }).blokken);
    const stoep = hal.find((b) => b.code === 'terras_deur')!, pad = hal.find((b) => b.code === 'pad_deur')!;
    // Rechtergevel: de buitenkant ligt op x = 815; de stoep is 160 cm diep, het pad loopt erachter verder tot 520 cm.
    expect([stoep.x, stoep.b]).toEqual([815, 160]);
    expect([pad.x, pad.b, pad.soort]).toEqual([975, 360, 'grind']);
    expect(pad.d).toBe(150);
    const leef = aanleg(plattegrond3D(doos('leefruimte'), planCatalogus, { aanleg: true }).blokken);
    expect(leef.some((b) => b.code.startsWith('terras_deur'))).toBe(true);
    expect(leef.some((b) => b.code.startsWith('pad_'))).toBe(false);
  });

  it('de aanleg ligt nooit onder de woning en de stukken overlappen elkaar niet (anders flikkeren de vlakken)', () => {
    const { plan } = voorbeeldWoning();
    const blokken = aanleg(plattegrond3D(plan, planCatalogus, { aanleg: true }).blokken);
    const half = plan.buitenmuur / 2;
    const woning = niveauPlan(plan, 0).ruimtes.flatMap(delenVan).map((d): Blok => ({ code: 'w', soort: 'gevel', vorm: 'blok', x: d.x - half, y: 0, z: d.y - half, b: d.b + 2 * half, h: 1, d: d.d + 2 * half, kleur: '' }));
    for (const b of blokken) {
      expect(b.b).toBeGreaterThan(0);
      expect(b.d).toBeGreaterThan(0);
      expect(woning.some((w) => overlapt(b, w))).toBe(false);
      expect(blokken.some((a) => a !== b && overlapt(a, b))).toBe(false);
    }
  });

  it('openingen op een verdieping krijgen geen aanleg', () => {
    const plan = doos('leefruimte');
    plan.ruimtes.push({ id: 'r2', naam: 'Boven', type: 'slaapkamer', x: 0, y: 0, b: 800, d: 600, vloer: 'parket_eik', wand: 'wit', niveau: 1 });
    plan.openingen = plan.openingen.map((o) => ({ ...o, niveau: 1 }));
    expect(aanleg(plattegrond3D(plan, planCatalogus, { aanleg: true }).blokken)).toEqual([]);
  });
});

describe('kopse kant van een binnenmuur in de gevel', () => {
  /** Twee kamers boven en onder een binnenmuur op y = 300, gevelsteen met een sokkel van 30 cm; `niveau` 1 = op een verdieping. */
  function tweeKamers(niveau = 0): Plattegrond {
    return {
      ruimtes: [
        ...(niveau ? [{ id: 'gv', naam: 'Beneden', type: 'leefruimte' as const, x: 0, y: 0, b: 500, d: 600, vloer: 'parket_eik', wand: 'wit' }] : []),
        { id: 'a', naam: 'A', type: 'slaapkamer', x: 0, y: 0, b: 500, d: 300, vloer: 'parket_eik', wand: 'wit', niveau },
        { id: 'b', naam: 'B', type: 'slaapkamer', x: 0, y: 300, b: 500, d: 300, vloer: 'parket_eik', wand: 'wit', niveau },
      ],
      openingen: [], meubels: [],
      muurhoogte: 270, buitenmuur: 30, binnenmuur: 10,
      gevel: { soort: 'steen', kleur: '#9c4a34' },
      gevelOntwerp: { standaard: { materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' }, sokkel: { materiaal: 'gevelsteen', kleur: 'antraciet', hoogte: 30 } },
    };
  }
  /** De stukken van de binnenmuur op y = 300 (10 cm dik), van onder naar boven. */
  const binnenmuur = (blokken: Blok[]) => blokken.filter((b) => b.code.startsWith('muur_') && b.d === 10 && b.z === 295).sort((p, q) => p.y - q.y);

  it('zonder de optie blijven de blokken zoals ze waren: de kop is wit pleisterwerk', () => {
    const stukken = binnenmuur(plattegrond3D(tweeKamers(), planCatalogus).blokken);
    expect(stukken).toHaveLength(1);
    // De muur loopt van buitenkant tot buitenkant van de gevel.
    expect([stukken[0]!.x, stukken[0]!.b]).toEqual([-15, 530]);
    expect(stukken[0]!.zijden?.['x-']).toBeUndefined();
    expect(stukken[0]!.zijden?.['x+']).toBeUndefined();
  });

  it('met de optie krijgt de kop het materiaal van de gevel, en onderaan dat van de sokkel', () => {
    const zonder = plattegrond3D(tweeKamers(), planCatalogus), met = plattegrond3D(tweeKamers(), planCatalogus, { gevelkoppen: true });
    expect(met.kader).toEqual(zonder.kader);
    const stukken = binnenmuur(met.blokken);
    expect(stukken.map((b) => [b.y, b.h])).toEqual([[0, 30], [30, 240]]);
    for (const kant of ['x-', 'x+'] as const) {
      expect(stukken[1]!.zijden?.[kant]?.soort).toBe('steen');
      expect(stukken[0]!.zijden?.[kant]?.soort).toBe('steen');
      // De sokkel heeft een andere kleur dan de gevel erboven.
      expect(stukken[0]!.zijden?.[kant]?.kleur).not.toBe(stukken[1]!.zijden?.[kant]?.kleur);
    }
    // De wanden in de kamers blijven wat ze waren.
    expect(stukken[1]!.zijden?.['z+']).toEqual(binnenmuur(zonder.blokken)[0]!.zijden?.['z+']);
    expect(stukken[1]!.zijden?.['z-']).toEqual(binnenmuur(zonder.blokken)[0]!.zijden?.['z-']);
  });

  it('op een verdieping komt er ook een stukje gevel voor de rand van de vloerplaat', () => {
    const blokken = plattegrond3D(tweeKamers(1), planCatalogus, { gevelkoppen: true }).blokken;
    const koppen = blokken.filter((b) => b.code.endsWith('_kop'));
    expect(koppen.map((b) => [b.x, b.b, b.d, b.h, b.soort]).sort((p, q) => Number(p[0]) - Number(q[0]))).toEqual([[-15, 15, 10, 30, 'steen'], [500, 15, 10, 30, 'steen']]);
    // Juist onder de vloer van de verdieping (270 + 30 cm).
    expect(koppen.every((b) => b.y === 270 && b.z === 295)).toBe(true);
    expect(plattegrond3D(tweeKamers(1), planCatalogus).blokken.some((b) => b.code.endsWith('_kop'))).toBe(false);
  });

  it('de voorbeeldwoning: met de optie komen er alleen kopse kanten en stukjes bij, geen ander blok verandert van plaats', () => {
    const { plan } = voorbeeldWoning();
    const zonder = plattegrond3D(plan, planCatalogus).blokken, met = plattegrond3D(plan, planCatalogus, { gevelkoppen: true }).blokken;
    const zonderZijden = (b: Blok) => JSON.stringify({ ...b, zijden: undefined });
    const oud = new Set(zonder.map(zonderZijden));
    const nieuw = met.filter((b) => !oud.has(zonderZijden(b)));
    expect(nieuw.length).toBeGreaterThan(0);
    // Wat nieuw is: een stukje onder de kop op de verdieping, een binnenmuur die op de sokkelhoogte gesplitst is, of
    // een dakrand die boven de kop doorloopt.
    expect(nieuw.every((b) => b.code.endsWith('_kop') || b.code.startsWith('muur_') || b.code.startsWith('dakrand_'))).toBe(true);
  });

  it('de dakrand loopt door boven een binnenmuur die tegen de gevel aansluit', () => {
    // Zonder de optie: twee stukken dakrand per zijgevel, met een spleet van de dikte van de binnenmuur (10 cm) ertussen.
    const rand = (opties: { gevelkoppen?: boolean }) => plattegrond3D({ ...tweeKamers(), dak: { vorm: 'plat', helling: 0, richting: 'onder', oversteek: 0, bedekking: { materiaal: 'epdm', kleur: 'zwart' } } }, planCatalogus, opties)
      .blokken.filter((b) => b.code.startsWith('dakrand_') && b.d > b.b && b.x < 0).sort((p, q) => p.z - q.z);
    const zonder = rand({}), met = rand({ gevelkoppen: true });
    expect(zonder).toHaveLength(2);
    expect(zonder[1]!.z - (zonder[0]!.z + zonder[0]!.d)).toBeCloseTo(10, 5);
    expect(met).toHaveLength(2);
    expect(met[1]!.z - (met[0]!.z + met[0]!.d)).toBeCloseTo(0, 5);
    // De hoeken blijven zoals ze waren (daar ligt de dakrand van de andere gevel).
    expect(met[0]!.z).toBe(zonder[0]!.z);
    expect(met[1]!.z + met[1]!.d).toBe(zonder[1]!.z + zonder[1]!.d);
  });
});
