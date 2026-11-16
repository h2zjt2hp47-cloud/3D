import { describe, expect, it } from 'vitest';
import { gebouwMaatlijnen, leesPakket3D, meterTekst, PAKKET3D_SOORT, PAKKET3D_VERSIE, plattegrond3D, raamMaatlijnen, verdiepingenVan, type Pakket3D, type Plattegrond } from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';
import { berekenRaam } from '../voorbeelden/raam.js';
import { raamScene } from '../voorbeelden/raam3d.js';
import { ontwerpKenmerken, verschillen } from '../voorbeelden/varianten.js';

const ZADEL = { vorm: 'zadel', helling: 40, richting: 'onder', oversteek: 30, bedekking: { materiaal: 'pannen', kleur: 'rood' } } as const;

function pakketVan(plan: Plattegrond, naam = 'Voorbeeldwoning'): Pakket3D {
  const niveaus = verdiepingenVan(plan);
  return {
    soort: PAKKET3D_SOORT,
    versie: PAKKET3D_VERSIE,
    gemaakt: '2026-11-16T12:00:00.000Z',
    project: { nummer: 'OF-2026-0042', naam },
    woning: niveaus.map((v, n) => ({
      naam: v.naam,
      scene: plattegrond3D(plan, planCatalogus, { totNiveau: n === niveaus.length - 1 ? undefined : n }),
      laag: plattegrond3D(plan, planCatalogus, { totNiveau: n, laag: 110 }),
    })),
    posities: [],
  };
}

describe('bestand voor de klant: het pakket met aannemer, datum en varianten', () => {
  it('de nieuwe velden komen ongeschonden door het lezen', () => {
    const a = pakketVan(voorbeeldWoning().plan, 'Woning (variant 1)');
    const b = pakketVan({ ...voorbeeldWoning().plan, dak: { ...ZADEL } }, 'Woning (variant 2)');
    a.project.aannemer = 'Bouwbedrijf Voorbeeld';
    a.project.datum = '2026-11-16';
    a.variant = { naam: 'Woning (variant 1)', verschil: ['plat dak'] };
    b.variant = { naam: 'Woning (variant 2)', verschil: ['zadeldak met keramische pannen'] };
    a.varianten = [b];
    const terug = leesPakket3D(JSON.stringify(a));
    expect(terug.project.aannemer).toBe('Bouwbedrijf Voorbeeld');
    expect(terug.project.datum).toBe('2026-11-16');
    expect(terug.variant).toEqual(a.variant);
    expect(terug.varianten).toHaveLength(1);
    expect(terug.varianten![0]!.variant?.verschil).toEqual(['zadeldak met keramische pannen']);
    expect(terug.varianten![0]!.woning.length).toBe(b.woning.length);
    expect(terug.versie).toBe(PAKKET3D_VERSIE);
  });

  it('een ouder pakket (versie 1, 2 en 3, zonder de nieuwe velden) opent zoals vroeger, zonder lege velden erbij', () => {
    for (const versie of [1, 2, 3]) {
      const p = { ...pakketVan(voorbeeldWoning().plan), versie };
      const terug = leesPakket3D(JSON.stringify(p));
      expect(terug.versie).toBe(versie);
      expect(Object.keys(terug.project).filter((k) => (terug.project as Record<string, unknown>)[k] !== undefined).sort()).toEqual(['naam', 'nummer']);
      expect('variant' in terug).toBe(false);
      expect('varianten' in terug).toBe(false);
    }
  });

  it('een kapotte variant geeft een uitleg die zegt welke variant', () => {
    const a = pakketVan(voorbeeldWoning().plan);
    a.varianten = [{ ...pakketVan(voorbeeldWoning().plan), woning: [{ naam: 'x' }] } as unknown as Pakket3D];
    expect(() => leesPakket3D(a)).toThrow(/Variant 2 .*onvolledig/);
    a.varianten = [{ ...pakketVan(voorbeeldWoning().plan), versie: PAKKET3D_VERSIE + 1 }];
    expect(() => leesPakket3D(a)).toThrow(/Variant 2 .*nieuwere versie/);
  });

  it('een variant draagt geen eigen varianten', () => {
    const a = pakketVan(voorbeeldWoning().plan);
    const b = pakketVan(voorbeeldWoning().plan);
    b.varianten = [pakketVan(voorbeeldWoning().plan)];
    a.varianten = [b];
    expect(leesPakket3D(a).varianten![0]!.varianten).toBeUndefined();
  });
});

describe('maten in de 3D', () => {
  it('breedte en diepte zijn de buitenkant van de muren, niet het kader met dakoversteek en terras', () => {
    const plan = { ...voorbeeldWoning().plan, dak: { ...ZADEL } };
    const scene = plattegrond3D(plan, planCatalogus, { aanleg: true, gevelkoppen: true, meubels: true });
    const lijnen = gebouwMaatlijnen(scene);
    const breedte = lijnen.filter((l) => l.groep === 'breedte');
    expect(breedte).toHaveLength(2);
    // De muren zelf: de dakrand steekt een paar cm buiten de gevel en telt niet mee voor breedte en diepte.
    const muren = scene.blokken.filter((b) => /^muur_/.test(b.code));
    const x0 = Math.min(...muren.map((b) => b.x)), x1 = Math.max(...muren.map((b) => b.x + b.b));
    const randen = scene.blokken.filter((b) => /^dakrand_/.test(b.code));
    if (randen.length) expect(Math.min(...randen.map((b) => b.x))).toBeLessThanOrEqual(x0);
    expect(breedte[0]!.van[0]).toBe(x0);
    expect(breedte[0]!.tot[0]).toBe(x1);
    expect(breedte[0]!.tekst).toBe(`Breedte ${meterTekst(x1 - x0)}`);
    // Het kader van de camera is ruimer (oversteek, terras): de maat volgt de muren.
    expect(x0).toBeGreaterThan(scene.kader.x);
    expect(lijnen.filter((l) => l.groep === 'diepte')).toHaveLength(2);
    expect(lijnen.filter((l) => l.groep === 'hoogte')).toHaveLength(4);
    // Zadeldak: de nok staat boven de goot, aan beide uiteinden.
    const nok = lijnen.filter((l) => l.groep === 'nok');
    expect(nok).toHaveLength(2);
    const hoogte = lijnen.find((l) => l.groep === 'hoogte')!.tot[1];
    expect(nok[0]!.tot[1]).toBeGreaterThan(hoogte + 100);
    // Elke maat staat naast het gebouw, aan de kant waar ze bij hoort.
    for (const l of lijnen) expect(l.kant).toEqual(l.uit);
  });

  it('een plat dak heeft geen nok; lage muren geen hoogte', () => {
    const plan = voorbeeldWoning().plan;
    expect(gebouwMaatlijnen(plattegrond3D(plan, planCatalogus, {})).some((l) => l.groep === 'nok')).toBe(false);
    const laag = gebouwMaatlijnen(plattegrond3D(plan, planCatalogus, { laag: 110, totNiveau: 0 }), { hoogtes: false });
    expect(laag.map((l) => l.groep).sort()).toEqual(['breedte', 'breedte', 'diepte', 'diepte']);
  });

  it('met dingen (aantikken) zijn de maten dezelfde: alleen het laatste stuk van de code telt', () => {
    const plan = { ...voorbeeldWoning().plan, dak: { ...ZADEL } };
    const zonder = gebouwMaatlijnen(plattegrond3D(plan, planCatalogus, { aanleg: true }));
    const met = gebouwMaatlijnen(plattegrond3D(plan, planCatalogus, { aanleg: true, dingen: true }));
    expect(met).toEqual(zonder);
  });

  it('een raam: breedte en hoogte van het kader in cm, in de eigen scène en in de woning', () => {
    const { plan, posities } = voorbeeldWoning();
    const p = posities.find((x) => x.keuzes.type === 'raam')!;
    const lijnen = raamMaatlijnen(raamScene(berekenRaam(p.keuzes)).blokken);
    expect(lijnen.map((l) => l.tekst)).toEqual([`${Math.round(Number(p.keuzes.breedte) / 10)} cm`, `${Math.round(Number(p.keuzes.hoogte) / 10)} cm`]);
    // In de woning: de blokken van dat ding (opening:<id>), met de maat van de opening in de plattegrond.
    const o = plan.openingen.find((x) => x.positie === p.id)!;
    const scene = plattegrond3D(plan, planCatalogus, { dingen: true, inhoud: () => undefined });
    const inWoning = raamMaatlijnen(scene.blokken, { ding: `opening:${o.id}` });
    expect(inWoning).toHaveLength(2);
    expect(inWoning[0]!.tekst).toBe(`${o.breedte} cm`);
    expect(raamMaatlijnen(scene.blokken, { ding: 'opening:bestaat-niet' })).toEqual([]);
  });
});

describe('varianten vergelijken in gewone taal', () => {
  it('zadeldak met pannen tegenover plat dak met koepels; wat gelijk is, staat er niet bij', () => {
    const { plan, posities } = voorbeeldWoning();
    const a = { ...structuredClone(plan), dak: { ...ZADEL } };
    const b = { ...structuredClone(plan), dak: { vorm: 'plat', helling: 0, richting: 'onder', oversteek: 0, bedekking: { materiaal: 'grind', kleur: 'grijs' } } as const, daklichten: [{ id: 'd1', type: 'koepel_100', x: 100, y: 100, b: 100, d: 100, niveau: 1 }] };
    const [va, vb] = verschillen([ontwerpKenmerken(a, posities, planCatalogus), ontwerpKenmerken(b, posities, planCatalogus)]);
    expect(va).toEqual(['zadeldak met keramische dakpannen, natuurrood', 'geen lichtkoepels']);
    expect(vb![0]).toMatch(/^plat dak met grind/);
    expect(vb![1]).toBe('1 lichtkoepel');
  });

  it('twee gelijke ontwerpen: één regel die zegt dat ze gelijk zijn', () => {
    const { plan, posities } = voorbeeldWoning();
    const k = ontwerpKenmerken(plan, posities, planCatalogus);
    expect(verschillen([k, k])).toEqual([['zelfde dak, gevel, ramen en maten'], ['zelfde dak, gevel, ramen en maten']]);
    expect(k.find((x) => x.soort === 'maat')?.tekst).toMatch(/^\d+,\d\d × \d+,\d\d m, 2 bouwlagen$/);
  });
});
