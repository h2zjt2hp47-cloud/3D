import { describe, expect, it } from 'vitest';
import { berekenConfiguratie, controleerPlan, dakOpbouw, niveauPlan, plattegrond3D, type Plattegrond } from '../src/index.js';
import { aanbouw, aanbouwPrijslijst } from '../voorbeelden/aanbouw.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { berekenRaam } from '../voorbeelden/raam.js';
import { aanbouwKeuzes, aanbouwNaarPlan, daklichtenOpDak, SNELSTART_TEGELS, snelRaam, snelWoning, verdeelDaklichten } from '../voorbeelden/snelstart.js';
import { pasStijlToe, raamInStijl, stijlCatalogus } from '../voorbeelden/stijlen.js';
import { raamKeuzes, voorbeeldWoning } from '../voorbeelden/woning.js';
import { raamBlokken } from '../voorbeelden/raam3d.js';

const fouten = (plan: Plattegrond) => controleerPlan(plan, planCatalogus).filter((m) => m.ernst === 'fout').map((m) => m.melding);
const raamFouten = (posities: { naam: string; keuzes: Record<string, unknown> }[]) =>
  posities.flatMap((p) => berekenRaam(p.keuzes as never).meldingen.filter((m) => m.ernst === 'fout').map((m) => `${p.naam}: ${m.melding}`));

describe('snelstart: tegels als gegevens', () => {
  it('toont alleen wat werkt, elk met twee of drie maten binnen hun grenzen', () => {
    expect(SNELSTART_TEGELS.map((t) => t.code)).toEqual(['woning', 'aanbouw', 'raam', 'garagepoort']);
    for (const t of SNELSTART_TEGELS) {
      expect(t.maten.length).toBeGreaterThanOrEqual(2);
      expect(t.maten.length).toBeLessThanOrEqual(3);
      for (const m of t.maten) expect(m.standaard >= m.min && m.standaard <= m.max, `${t.code}.${m.code}`).toBe(true);
    }
  });
});

describe('snelstart: woning op maat', () => {
  const woning = SNELSTART_TEGELS.find((t) => t.code === 'woning')!;
  const gevallen: Record<string, number>[] = [{}];
  for (const m of woning.maten) for (const w of [m.min, m.max]) gevallen.push({ [m.code]: w });
  gevallen.push({ breedte: 700, diepte: 800, verdiepingen: 3 }, { breedte: 1600, diepte: 1600, verdiepingen: 1 });
  for (const [code, stijl] of Object.entries(stijlCatalogus)) {
    it(`geeft een geldig ontwerp in de stijl ${code}, voor elke maat`, () => {
      for (const g of gevallen) {
        const maten = Object.fromEntries(woning.maten.map((m) => [m.code, g[m.code] ?? m.standaard]));
        const { plan, posities } = snelWoning(maten, stijl);
        const wat = JSON.stringify(maten);
        expect(fouten(plan), wat).toEqual([]);
        expect(raamFouten(posities), wat).toEqual([]);
        // Het dak van de stijl komt er echt op (de bovenste verdieping is één rechthoek: geen terugval op plat).
        expect(dakOpbouw(plan)?.terugval, wat).toBeUndefined();
        expect(plan.verdiepingen?.length).toBe(maten.verdiepingen);
        // Elke positie hoort bij een opening, en omgekeerd.
        expect(new Set(plan.openingen.map((o) => o.positie).filter(Boolean))).toEqual(new Set(posities.map((p) => p.id)));
        // Schrijnwerk in de kleur van de stijl.
        for (const p of posities) expect(p.keuzes.kleur_buiten, `${wat} ${p.naam}`).toBe(stijl.schrijnwerk.kleur_buiten);
      }
    });
  }
  it('zet de voordeur in de voorgevel, onderaan het plan', () => {
    const { plan, posities } = snelWoning({ breedte: 900, diepte: 1000, verdiepingen: 2 }, stijlCatalogus.klassiek!);
    const voordeur = posities.find((p) => p.keuzes.type === 'voordeur')!;
    const o = plan.openingen.find((x) => x.positie === voordeur.id)!;
    expect([o.as, o.lijn]).toEqual(['h', 1000]);
    expect(niveauPlan(plan, 1).ruimtes.map((r) => r.type).sort()).toEqual(['badkamer', 'bureau', 'hal', 'slaapkamer', 'slaapkamer']);
  });
});

describe('stijlen', () => {
  it('pasStijlToe zet gevel, dak, vloer en wand; badkamer en wc houden hun tegels', () => {
    const { plan } = voorbeeldWoning();
    const stijl = stijlCatalogus.modern!;
    const p = pasStijlToe(plan, stijl);
    expect(p.gevelOntwerp?.standaard).toEqual(stijl.gevel);
    expect(p.gevelOntwerp?.vlakken).toBeUndefined();
    expect(p.dak).toEqual(stijl.dak);
    for (const r of p.ruimtes) {
      if (r.type === 'badkamer' || r.type === 'wc') expect(r.wand).toBe(plan.ruimtes.find((x) => x.id === r.id)!.wand);
      else expect(r.wand).toBe(stijl.wand);
    }
    // Het origineel blijft ongewijzigd.
    expect(plan.dak).toBeUndefined();
  });
  it('een stijl met hout boven verft de verdieping', () => {
    const { plan } = snelWoning({ breedte: 900, diepte: 1000, verdiepingen: 2 }, stijlCatalogus.hout!);
    expect(Object.values(plan.gevelOntwerp?.vlakken ?? {}).every((v) => v.materiaal === 'hout_staand')).toBe(true);
    expect(Object.keys(plan.gevelOntwerp?.vlakken ?? {}).length).toBeGreaterThan(0);
  });
  it('lichtkoepels die op het nieuwe dak niet meer kunnen, vallen weg', () => {
    const { plan } = snelWoning({ breedte: 900, diepte: 1000, verdiepingen: 1 }, stijlCatalogus.modern!);
    const met = verdeelDaklichten(plan, 2);
    expect(daklichtenOpDak(met).aantal).toBe(2);
    expect(pasStijlToe(met, stijlCatalogus.klassiek!).daklichten ?? []).toEqual([]);
  });
  it('een stijl met koepels legt ze op het grootste platte dak (één keer)', () => {
    const { plan } = snelWoning({ breedte: 1000, diepte: 1000, verdiepingen: 1 }, stijlCatalogus.modern!);
    expect(daklichtenOpDak(plan)).toEqual({ aantal: 2, type: 'koepel_100', plat: true });
    expect(fouten(plan)).toEqual([]);
    // Nog eens dezelfde stijl: er komen er geen bij.
    expect(daklichtenOpDak(pasStijlToe(plan, stijlCatalogus.modern!)).aantal).toBe(2);
  });
  it('een schuifraam blijft aluminium in een stijl met PVC', () => {
    const k = raamInStijl(raamKeuzes({ type: 'schuif', breedte: 3000, hoogte: 2300, glas: 'dubbel_gelaagd' }), stijlCatalogus.klassiek!);
    expect(k.profiel).toBe('alu_hi');
    expect(k.kleur_buiten).toBe('wit');
  });
});

describe('snelstart: aanbouw', () => {
  const tegel = SNELSTART_TEGELS.find((t) => t.code === 'aanbouw')!;
  for (const [code, stijl] of Object.entries(stijlCatalogus)) {
    it(`het model AANBOUW in de stijl ${code} is geldig en past als ruimte tegen een woning`, () => {
      for (const kies of ['min', 'standaard', 'max'] as const) {
        const maten = Object.fromEntries(tegel.maten.map((m) => [m.code, m[kies]]));
        const k = aanbouwKeuzes(maten, stijl);
        const r = berekenConfiguratie(aanbouw, k, aanbouwPrijslijst);
        expect(r.meldingen.filter((m) => m.ernst === 'fout').map((m) => m.melding), `${kies}`).toEqual([]);
        const { plan, posities } = aanbouwNaarPlan(k);
        expect(fouten(plan), `${kies}`).toEqual([]);
        expect(raamFouten(posities), `${kies}`).toEqual([]);
        expect(dakOpbouw(plan)?.hellend, `${kies}: zadeldak op de bestaande woning`).toBeDefined();
        // De uitbouw in kleur, de bestaande woning neutraal.
        expect(plan.gevelOntwerp?.vlakken?.['uitbouw:onder']).toBeDefined();
        // Alleen de raampartij telt mee; wat bestaat, staat er met aantal 0.
        expect(posities.filter((p) => p.aantal > 0).map((p) => p.naam)).toEqual(['Raampartij uitbouw']);
      }
    });
  }
  it('drie koepels op het platte dak van de uitbouw', () => {
    const { plan } = aanbouwNaarPlan(aanbouwKeuzes({ breedte: 5000, diepte: 5000, hoogte: 3000 }, stijlCatalogus.hout!));
    const drie = verdeelDaklichten(plan, 3, 'koepel_120');
    expect(daklichtenOpDak(drie)).toEqual({ aantal: 3, type: 'koepel_120', plat: true });
    expect(fouten(drie)).toEqual([]);
    // Meer dan er past: zoveel als er past.
    expect(daklichtenOpDak(verdeelDaklichten(plan, 20, 'koepel_120')).aantal).toBeLessThan(20);
    expect(fouten(verdeelDaklichten(plan, 20, 'koepel_120'))).toEqual([]);
  });
});

describe('aantikken: elk blok in de 3D weet bij welk ding het hoort', () => {
  it('met de optie dingen: <ding>.<code>; de blokken zelf en het kader blijven gelijk', () => {
    const { plan, posities } = voorbeeldWoning();
    const metDak = pasStijlToe(plan, stijlCatalogus.klassiek!);
    const inhoud = (o: { positie?: string }) => {
      const p = posities.find((x) => x.id === o.positie);
      if (!p) return undefined;
      const rb = raamBlokken(berekenRaam(p.keuzes));
      return { blokken: rb.blokken, hoogte: rb.h + rb.kast };
    };
    for (const opties of [{ aanleg: true, gevelkoppen: true }, { laag: 110, lichtinval: true }]) {
      const zonder = plattegrond3D(metDak, planCatalogus, { ...opties, inhoud });
      const met = plattegrond3D(metDak, planCatalogus, { ...opties, inhoud, dingen: true });
      expect(met.kader).toEqual(zonder.kader);
      expect(met.blokken.length).toBe(zonder.blokken.length);
      met.blokken.forEach((b, i) => {
        const oud = zonder.blokken[i]!;
        expect({ ...b, code: oud.code }).toEqual(oud);
        expect(b.code === oud.code || b.code.endsWith(`.${oud.code}`) || b.code.startsWith('schaduw_'), b.code).toBe(true);
      });
      const dingen = new Set(met.blokken.filter((b) => !b.code.startsWith('schaduw_') && b.code.includes('.')).map((b) => b.code.split('.')[0]!));
      if (!('laag' in opties)) expect(dingen.has('dak')).toBe(true);
      expect(dingen.has('opening:o1')).toBe(true);
      expect(dingen.has('ruimte:leef')).toBe(true);
      expect(dingen.has('meubel:m1')).toBe(true);
      expect([...dingen].some((d) => /^gevel:[a-z0-9]+:(boven|onder|links|rechts)$/.test(d))).toBe(true);
    }
  });
});

describe('snelstart: raam of deur', () => {
  it('geeft voor elke maat en stijl een raam of deur zonder fouten', () => {
    const tegel = SNELSTART_TEGELS.find((t) => t.code === 'raam')!;
    const b = tegel.maten.find((m) => m.code === 'breedte')!, h = tegel.maten.find((m) => m.code === 'hoogte')!;
    for (const stijl of Object.values(stijlCatalogus)) {
      for (const breedte of [b.min, 900, b.standaard, 1800, 2600, 3500, b.max]) {
        for (const hoogte of [h.min, h.standaard, 2300, h.max]) {
          const k = snelRaam({ breedte, hoogte }, stijl);
          expect(raamFouten([{ naam: `${breedte} × ${hoogte}`, keuzes: k }])).toEqual([]);
          expect(k.kleur_buiten).toBe(stijl.schrijnwerk.kleur_buiten);
        }
      }
    }
  });
});
