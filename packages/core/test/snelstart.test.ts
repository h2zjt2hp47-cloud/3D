import { describe, expect, it } from 'vitest';
import { berekenConfiguratie, controleerPlan, dakOpbouw, niveauPlan, plattegrond3D, type Plattegrond } from '../src/index.js';
import { aanbouw, aanbouwPrijslijst } from '../voorbeelden/aanbouw.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { berekenRaam } from '../voorbeelden/raam.js';
import {
  aanbouwKeuzes, aanbouwNaarPlan, begrensMaat, daklichtenOpDak, leesLengte, leesMaat, loodsIndeling, SNELSTART_TEGELS, snelModel, snelModelMaat, snelRaam, snelWoning, stapMaat,
  verdeelDaklichten, type SnelMaat, type SnelSoort,
} from '../voorbeelden/snelstart.js';
import { berekenVastModel, VASTE_MODELLEN } from '../voorbeelden/vastemodellen.js';
import { pasStijlToe, raamInStijl, stijlCatalogus } from '../voorbeelden/stijlen.js';
import { raamKeuzes, voorbeeldWoning } from '../voorbeelden/woning.js';
import { raamBlokken } from '../voorbeelden/raam3d.js';

const fouten = (plan: Plattegrond) => controleerPlan(plan, planCatalogus).filter((m) => m.ernst === 'fout').map((m) => m.melding);
const raamFouten = (posities: { naam: string; keuzes: Record<string, unknown> }[]) =>
  posities.flatMap((p) => berekenRaam(p.keuzes as never).meldingen.filter((m) => m.ernst === 'fout').map((m) => `${p.naam}: ${m.melding}`));

describe('snelstart: tegels als gegevens', () => {
  it('toont alleen wat werkt, elk met twee of drie maten binnen hun grenzen', () => {
    expect(SNELSTART_TEGELS.map((t) => t.code)).toEqual(['woning', 'aanbouw', 'raam', 'garagepoort', 'overkapping', 'tuinhuis', 'loods', 'staalwerk']);
    for (const t of SNELSTART_TEGELS) {
      // Staalwerk kiest eerst wat (balustrade, luifel, trap): de maten horen dan bij die soort.
      for (const [naam, maten] of t.soorten ? t.soorten.map((s) => [`${t.code}.${s.code}`, s.maten] as const) : [[t.code, t.maten] as const]) {
        expect(maten.length, naam).toBeGreaterThanOrEqual(2);
        expect(maten.length, naam).toBeLessThanOrEqual(3);
        for (const m of maten) expect((m.standaard >= m.min && m.standaard <= m.max) || (m.nul && m.standaard === 0), `${naam}.${m.code}`).toBe(true);
      }
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

describe('snelstart: maten intypen in cm', () => {
  it('leest cm, en ook meter of mm met een eenheid', () => {
    const cm = { eenheid: 'cm' as const }, mm = { eenheid: 'mm' as const }, stuks = { eenheid: 'stuks' as const };
    expect(leesMaat('450', cm)).toBe(450);
    expect(leesMaat(' 450 cm', cm)).toBe(450);
    expect(leesMaat('4,5 m', cm)).toBe(450);
    expect(leesMaat('4.5m', cm)).toBe(450);
    expect(leesMaat('4,5', cm)).toBe(450);
    expect(leesMaat('4500 mm', cm)).toBe(450);
    expect(leesMaat('1600', cm)).toBe(1600);
    // Een model in mm (aanbouw, raam): de getypte cm worden mm.
    expect(leesMaat('450', mm)).toBe(4500);
    expect(leesMaat('4,5 m', mm)).toBe(4500);
    expect(leesMaat('2', stuks)).toBe(2);
    expect(leesMaat('', cm)).toBeUndefined();
    expect(leesMaat('vier meter', cm)).toBeUndefined();
  });
  it('rekent een som uit, elk stuk met zijn eigen eenheid', () => {
    const cm = { eenheid: 'cm' as const }, mm = { eenheid: 'mm' as const };
    expect(leesMaat('300+150', cm)).toBe(450);
    expect(leesMaat('300 + 150', cm)).toBe(450);
    expect(leesMaat('4 m - 20', cm)).toBe(380);
    expect(leesMaat('4,5+1,2', cm)).toBe(570);
    expect(leesMaat('2m+35cm+5mm', cm)).toBe(236);
    expect(leesMaat('300−20', cm)).toBe(280);
    expect(leesMaat('100-150', cm)).toBe(-50);
    expect(leesMaat('300+150', mm)).toBe(4500);
    expect(leesMaat('+30', cm)).toBeUndefined();
    expect(leesMaat('300+', cm)).toBeUndefined();
    expect(leesMaat('300++1', cm)).toBeUndefined();
    expect(leesMaat('3x150', cm)).toBeUndefined();
  });
  it('alle lengtes in de snelstart staan in cm', () => {
    for (const t of SNELSTART_TEGELS) for (const m of [...t.maten, ...(t.soorten ?? []).flatMap((s) => s.maten)]) expect(m.toon, `${t.code}.${m.code}`).toBe(m.eenheid === 'stuks' ? 'aantal' : 'cm');
  });
});

describe('snelstart: vaste modellen (carport, tuinhuis, loods, staalwerk)', () => {
  /** Elke soort van elke tegel van een vast model: de tegel zelf, of bij staalwerk de balustrade, de luifel en de trap. */
  const soorten: SnelSoort[] = SNELSTART_TEGELS.filter((t) => t.soort === 'model').flatMap((t) => t.soorten ?? [{ code: t.code, label: t.label, model: t.model as SnelSoort['model'], maten: t.maten, vertrekpunten: t.vertrekpunten! }]);
  const fouten = (s: SnelSoort, k: Record<string, unknown>) => berekenVastModel(s.model, k as never).meldingen.filter((m) => m.ernst === 'fout').map((m) => m.code);

  it('elk vertrekpunt met elke combinatie van de kleinste, gangbare en grootste maten geeft een ontwerp zonder fouten', () => {
    expect(soorten.map((s) => s.model)).toEqual(['OVERKAPPING', 'TUINHUIS', 'LOODS', 'BALUSTRADE', 'LUIFEL', 'STAALTRAP']);
    let n = 0;
    for (const s of soorten) {
      expect(s.vertrekpunten.length, s.code).toBeGreaterThanOrEqual(2);
      let gevallen: Record<string, number>[] = [{}];
      for (const m of s.maten) gevallen = gevallen.flatMap((g) => [m.min, m.standaard, m.max, ...(m.nul ? [0] : [])].map((w) => ({ ...g, [m.code]: begrensMaat(m, w) })));
      for (const v of s.vertrekpunten) {
        for (const maten of [null, ...gevallen]) {
          const k = snelModel(s.model, v, maten);
          expect(fouten(s, k), `${v.code} ${JSON.stringify(maten)}`).toEqual([]);
          n++;
        }
      }
    }
    expect(n).toBeGreaterThan(200);
  });

  it('zonder aangeraakte maat houdt elk vertrekpunt zijn eigen maten; met een maat krijgt elk vertrekpunt alle maten van de tweede vraag', () => {
    const overk = soorten[0]!;
    const pergola = overk.vertrekpunten.find((v) => v.code === 'pergola')!;
    expect(snelModel('OVERKAPPING', pergola, null)).toMatchObject({ breedte: 400, diepte: 300 });
    expect(snelModel('OVERKAPPING', pergola, { breedte: 450, diepte: 500 })).toMatchObject({ breedte: 450, diepte: 500 });
    expect(snelModelMaat('OVERKAPPING', snelModel('OVERKAPPING', pergola, null))).toBe('4 × 3 m');
    // De gangbare maten van de tweede vraag zijn die van het eerste vertrekpunt: de carport van 5 × 5 m, zonder paal in de inrit.
    expect(overk.maten.map((m) => m.standaard)).toEqual([500, 500]);
    const carport = berekenVastModel('OVERKAPPING', snelModel('OVERKAPPING', overk.vertrekpunten[0]!, null));
    expect(carport.afgeleid).toMatchObject({ velden_b: 1, velden_d: 1, palen: 4 });
  });

  it('de lengte van een loods wordt traveeën maal de afstand tussen de portalen', () => {
    expect(loodsIndeling(3000)).toEqual({ traveeen: 5, afstand: 600, lengte: 3000 });
    expect(loodsIndeling(3000, 500)).toEqual({ traveeen: 6, afstand: 500, lengte: 3000 });
    expect(loodsIndeling(1700).lengte).toBe(1650);
    expect(loodsIndeling(99999)).toEqual({ traveeen: 20, afstand: 800, lengte: 16000 });
    const loods = soorten[2]!, lengte = loods.maten.find((m) => m.code === 'lengte')!;
    expect(lengte.standaard).toBe(3000);
    // + is één travee van 6 m erbij; een getypte lengte wordt de dichtste die kan.
    expect(stapMaat(lengte, 3000, 1)).toBe(3600);
    expect(begrensMaat(lengte, 3100)).toBe(3000);
    const k = snelModel('LOODS', loods.vertrekpunten[0]!, { breedte: 1500, lengte: 3600, zijhoogte: 450 });
    expect(k).toMatchObject({ traveeen: 6, afstand: 600 });
    expect(berekenVastModel('LOODS', k).afgeleid.lengte).toBe(3600);
  });

  it('een luifel is 0 (geen) of minstens 1 m; een getypte maat volgt de stap van het model', () => {
    const luifel = soorten[1]!.maten.find((m) => m.code === 'luifel')! as SnelMaat;
    expect(luifel.standaard).toBe(0);
    expect(stapMaat(luifel, 0, 1)).toBe(100);
    expect(stapMaat(luifel, 100, -1)).toBe(0);
    expect(stapMaat(luifel, 100, 1)).toBe(150);
    expect(begrensMaat(luifel, 30)).toBe(0);
    expect(begrensMaat(luifel, 70)).toBe(100);
    const breedte = soorten[0]!.maten[0]!;
    expect(begrensMaat(breedte, 455)).toBe(460);
    expect(begrensMaat(breedte, 2000)).toBe(900);
  });

  it('een te smal tuinhuis krijgt een smallere deur; poorten die niet passen worden kleiner', () => {
    const tuin = soorten[1]!;
    const pool = snelModel('TUINHUIS', tuin.vertrekpunten.find((v) => v.code === 'poolhouse')!, { breedte: 250, diepte: 300, luifel: 0 });
    expect(pool.deur).toBe('dubbel');
    expect(snelModel('TUINHUIS', tuin.vertrekpunten.find((v) => v.code === 'poolhouse')!, { breedte: 200, diepte: 300, luifel: 0 }).deur).toBe('enkel');
    const werkplaats = snelModel('LOODS', soorten[2]!.vertrekpunten.find((v) => v.code === 'werkplaats')!, { breedte: 600, lengte: 1800, zijhoogte: 300 });
    expect(Number(werkplaats.poort1_hoogte)).toBeLessThanOrEqual(270);
    expect(berekenVastModel('LOODS', werkplaats).geldig).toBe(true);
  });

  it('elk vertrekpunt heeft een eigen label en een tekst in gewone taal, zonder prijzen', () => {
    for (const s of soorten) {
      expect(new Set(s.vertrekpunten.map((v) => v.label)).size, s.code).toBe(s.vertrekpunten.length);
      for (const v of s.vertrekpunten) {
        const r = berekenVastModel(s.model, snelModel(s.model, v, null));
        expect(VASTE_MODELLEN[s.model].kort(r), v.code).not.toMatch(/€|prijs|NaN|undefined/);
        expect(snelModelMaat(s.model, snelModel(s.model, v, null)), v.code).toMatch(/\d/);
      }
    }
  });
});

describe('maten typen in de configurator en de ramenlijst (doorloop B16)', () => {
  it('een kaal getal in de eenheid van het veld, een kommagetal onder 20 in meter, een eenheid of een som', () => {
    expect(leesLengte('1200', 'mm')).toBe(1200);
    expect(leesLengte('1,2', 'mm')).toBe(1200);
    expect(leesLengte('1.2', 'mm')).toBe(1200);
    expect(leesLengte(' 1,25 m', 'mm')).toBe(1250);
    expect(leesLengte('120 cm', 'mm')).toBe(1200);
    expect(leesLengte('1000 + 200', 'mm')).toBe(1200);
    expect(leesLengte('2.500', 'mm')).toBe(2500);
    expect(leesLengte('99999', 'mm')).toBe(99999);
    expect(leesLengte('12', 'mm')).toBe(12);
    expect(leesLengte('1200,5', 'mm')).toBe(1201);
    expect(leesLengte('4,5', 'cm')).toBe(450);
    expect(leesLengte('450', 'cm')).toBe(450);
    expect(leesLengte('4500 mm', 'cm')).toBe(450);
    for (const leeg of ['', '  ', 'abc', '-5', '12 x 14']) expect(leesLengte(leeg, 'mm'), leeg).toBeUndefined();
  });
});

