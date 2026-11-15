import { describe, expect, it } from 'vitest';
import { leesPakket3D, PAKKET3D_SOORT, PAKKET3D_VERSIE, plattegrond3D, verdiepingenVan, type Pakket3D } from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

/** Een pakket zoals de bouwdemo het maakt (bouw-web/src/doorsturen.ts), hier van de voorbeeldwoning zonder posities. */
function voorbeeldPakket(): Pakket3D {
  const plan = voorbeeldWoning().plan;
  const niveaus = verdiepingenVan(plan);
  return {
    soort: PAKKET3D_SOORT,
    versie: PAKKET3D_VERSIE,
    gemaakt: '2026-11-15T12:00:00.000Z',
    project: { nummer: 'OF-2026-0042', naam: 'Voorbeeldwoning' },
    woning: niveaus.map((v, n) => ({
      naam: v.naam,
      scene: plattegrond3D(plan, planCatalogus, { meubels: true, totNiveau: n === niveaus.length - 1 ? undefined : n }),
      laag: plattegrond3D(plan, planCatalogus, { meubels: true, totNiveau: n, laag: 110 }),
    })),
    posities: [],
  };
}

describe('3D-pakket: de 3D van een bouwproject als gewone gegevens', () => {
  it('een scène is gewone data: ze komt ongeschonden door JSON', () => {
    const p = voorbeeldPakket();
    expect(p.woning.length).toBeGreaterThanOrEqual(2);
    const terug = JSON.parse(JSON.stringify(p)) as Pakket3D;
    expect(terug).toEqual(JSON.parse(JSON.stringify(p)));
    // Niets gaat verloren (geen functies, geen undefined die iets betekent): zelfde blokken, zelfde kader.
    expect(terug.woning[0]!.scene.blokken.length).toBe(p.woning[0]!.scene.blokken.length);
    expect(terug.woning[0]!.scene.kader).toEqual(p.woning[0]!.scene.kader);
    for (const b of terug.woning[1]!.scene.blokken) expect(typeof b.code).toBe('string');
  });

  it('leest een pakket als tekst en als object', () => {
    const p = voorbeeldPakket();
    const uitTekst = leesPakket3D(JSON.stringify(p));
    expect(uitTekst.project.nummer).toBe('OF-2026-0042');
    expect(uitTekst.woning.map((n) => n.naam)).toEqual(p.woning.map((n) => n.naam));
    expect(leesPakket3D(p).woning.length).toBe(p.woning.length);
  });

  it('met lage muren steken er minder blokken boven 150 cm uit dan met volle muren', () => {
    const p = voorbeeldPakket();
    const hoog = (blokken: { y: number; h: number }[]) => blokken.filter((b) => b.y + b.h > 150).length;
    expect(hoog(p.woning[0]!.laag.blokken)).toBeLessThan(hoog(p.woning[0]!.scene.blokken));
  });

  it('weigert wat geen pakket is, met een uitleg in gewone taal', () => {
    expect(() => leesPakket3D('geen json')).toThrow(/geen 3D-pakket/);
    expect(() => leesPakket3D({ soort: 'woningconfigurator-project', versie: 1 })).toThrow(/geen 3D-pakket/);
    expect(() => leesPakket3D({ ...voorbeeldPakket(), versie: PAKKET3D_VERSIE + 1 })).toThrow(/nieuwere versie/);
    expect(() => leesPakket3D({ ...voorbeeldPakket(), woning: [{ naam: 'x' }] })).toThrow(/onvolledig/);
    expect(() => leesPakket3D({ ...voorbeeldPakket(), woning: [], posities: [] })).toThrow(/leeg/);
  });

  it('bevat geen prijzen', () => {
    expect(JSON.stringify(voorbeeldPakket())).not.toMatch(/prijs|kost/i);
  });
});
