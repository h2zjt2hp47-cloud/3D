/**
 * Ronde 17 (17/11): geen lichte streepjes in de gevel. Met `Plan3DOpties.wijken` zegt de motor per blok welke vlakken in de
 * diepte wijken (`Blok.wijkt`) en welke helemaal tegen een ander stuk liggen (`Blok.bedekt`, de kijker tekent ze niet).
 * Bewaakt: zonder de optie verandert er niets; het buitenvlak van een gevel wijkt nooit; elk bedekt vlak ligt echt over
 * zijn hele maat tegen een ander blok (anders zou de kijker een gat tonen); de muren nemen evenveel plaats in als vroeger.
 */
import { describe, expect, it } from 'vitest';
import { planMetDak, plattegrond3D, type Blok, type BlokVlak, type Plan3DOpties, type Plattegrond } from '../src/index.js';
import { planCatalogus as cat } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';
import { uitbouwVoorbeeld } from '../voorbeelden/uitbouwvoorbeeld.js';

const APP: Plan3DOpties = { aanleg: true, gevelkoppen: true, dingen: true };
const zadel = (plan: Plattegrond): Plattegrond => ({ ...plan, dak: { vorm: 'zadel', helling: 35, richting: 'onder', oversteek: 40, bedekking: { materiaal: 'pannen', kleur: 'rood' } } });
const GEVALLEN: [string, Plattegrond, Plan3DOpties][] = [
  ['voorbeeldwoning, plat dak', planMetDak(voorbeeldWoning().plan), APP],
  ['voorbeeldwoning, zadeldak', zadel(voorbeeldWoning().plan), APP],
  ['voorbeeldwoning, nok van boven naar onder', { ...zadel(voorbeeldWoning().plan), dak: { ...zadel(voorbeeldWoning().plan).dak!, richting: 'rechts' } }, APP],
  ['voorbeeldwoning, muren laag', planMetDak(voorbeeldWoning().plan), { ...APP, laag: 110, totNiveau: 0 }],
  ['uitbouw achter een rijwoning', planMetDak(uitbouwVoorbeeld().plan), APP],
];

/** Ligt punt p (x, y, z) in een balk (de rand telt mee: twee stukken kunnen er net op aansluiten)? */
const binnen = (b: Blok, [x, y, z]: [number, number, number], m = 0.01) =>
  x >= b.x - m && x <= b.x + b.b + m && y >= b.y - m && y <= b.y + b.h + m && z >= b.z - m && z <= b.z + b.d + m;

/** Punten op een vlak van een balk (een raster binnen de randen), elk 0,25 cm naar buiten geschoven. */
function punten(b: Blok, v: BlokVlak): [number, number, number][] {
  const uit: [number, number, number][] = [];
  const t = [0.1, 0.3, 0.5, 0.7, 0.9];
  for (const s of t) for (const u of t) {
    const x = b.x + s * b.b, y = b.y + u * b.h, z = b.z + (v.toString().startsWith('y') ? u : s) * b.d;
    if (v === 'x-') uit.push([b.x - 0.25, y, b.z + u * b.d]);
    if (v === 'x+') uit.push([b.x + b.b + 0.25, y, b.z + u * b.d]);
    if (v === 'z-') uit.push([x, y, b.z - 0.25]);
    if (v === 'z+') uit.push([x, y, b.z + b.d + 0.25]);
    if (v === 'y-') uit.push([x, b.y - 0.25, z]);
    if (v === 'y+') uit.push([x, b.y + b.h + 0.25, z]);
  }
  return uit;
}

const balken = (blokken: Blok[]) => blokken.filter((b) => (b.vorm ?? 'blok') === 'blok' && !b.afronding && !b.draai);

describe('geen streepjes in de gevel (ronde 17): wat wijkt en wat bedekt is', () => {
  it('zonder de optie: geen enkel blok krijgt `wijkt` of `bedekt` (de blokken van vroeger)', () => {
    for (const [, plan, opties] of GEVALLEN) {
      expect(plattegrond3D(plan, cat, opties).blokken.some((b) => b.wijkt || b.bedekt)).toBe(false);
    }
  });

  it('met de optie wijken binnenmuren, vloeren en de binnenkant; bedekt staat ook in wijkt', () => {
    const blokken = plattegrond3D(GEVALLEN[0]![1], cat, { ...APP, wijken: true }).blokken;
    expect(blokken.filter((b) => b.code.startsWith('muur_h380_')).every((b) => b.wijkt)).toBe(true);
    expect(blokken.filter((b) => b.code.includes('vloer_')).every((b) => b.wijkt === true)).toBe(true);
    expect(blokken.some((b) => b.bedekt?.length)).toBe(true);
    for (const b of blokken) for (const v of b.bedekt ?? []) expect(b.wijkt === true || b.wijkt?.includes(v)).toBe(true);
  });

  it('het buitenvlak van een gevel wijkt nooit en is nooit bedekt', () => {
    const buiten: Record<string, BlokVlak> = { boven: 'z-', onder: 'z+', links: 'x-', rechts: 'x+' };
    for (const [naam, plan, opties] of GEVALLEN) {
      const muren = plattegrond3D(plan, cat, { ...opties, wijken: true }).blokken.filter((b) => /^gevel:[^.]+\.muur_/.test(b.code) && b.vorm === 'blok');
      expect(muren.length, naam).toBeGreaterThan(0);
      for (const b of muren) {
        const v = buiten[b.code.split('.')[0]!.split(':')[2]!]!;
        expect(Array.isArray(b.wijkt) && b.wijkt.includes(v), `${naam}: ${b.code}`).toBe(false);
        expect(b.bedekt?.includes(v) ?? false, `${naam}: ${b.code}`).toBe(false);
      }
    }
  });

  it('elk bedekt vlak ligt over zijn hele maat tegen een ander blok (de kijker toont er geen gat)', () => {
    for (const [naam, plan, opties] of GEVALLEN) {
      const blokken = balken(plattegrond3D(plan, cat, { ...opties, wijken: true }).blokken);
      let geteld = 0;
      for (const b of blokken) for (const v of b.bedekt ?? []) {
        geteld++;
        for (const p of punten(b, v)) expect(blokken.some((c) => c !== b && binnen(c, p, 0.01)), `${naam}: ${b.code} ${v} bij ${p.map((x) => x.toFixed(1))}`).toBe(true);
      }
      expect(geteld, naam).toBeGreaterThan(0);
    }
  });

  it('de muren nemen evenveel plaats in als zonder de optie (per ding), en het kader blijft gelijk', () => {
    for (const [naam, plan, opties] of GEVALLEN) {
      const zonder = plattegrond3D(plan, cat, opties), met = plattegrond3D(plan, cat, { ...opties, wijken: true });
      expect(met.kader, naam).toEqual(zonder.kader);
      const inhoud = (blokken: Blok[]) => {
        const per = new Map<string, number>();
        for (const b of balken(blokken)) {
          const sleutel = b.code.includes('.') ? b.code.split('.')[0]! : b.code.replace(/_.*$/, '');
          per.set(sleutel, (per.get(sleutel) ?? 0) + b.b * b.h * b.d);
        }
        return per;
      };
      const a = inhoud(zonder.blokken), c = inhoud(met.blokken);
      expect([...c.keys()].sort(), naam).toEqual([...a.keys()].sort());
      for (const [k, w] of a) expect(Math.abs(c.get(k)! - w), `${naam}: ${k}`).toBeLessThan(0.5);
      expect(met.blokken.length, naam).toBeGreaterThanOrEqual(zonder.blokken.length);
    }
  });
});
