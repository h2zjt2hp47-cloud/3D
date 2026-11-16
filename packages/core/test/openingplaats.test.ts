import { describe, expect, it } from 'vitest';
import { controleerPlan, murenVan, muurVanOpening, niveauPlan, niveauVan, vlakSleutel, type Opening, type Plattegrond } from '../src/plattegrond.js';
import { plaatsNaast, vrijePlaats, vrijeStukken } from '../src/openingplaats.js';
import { snelWoning } from '../voorbeelden/snelstart.js';
import { stijlCatalogus } from '../voorbeelden/stijlen.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

/** Zet een opening op een plaats en geeft de fouten van de plattegrond over openingen (overlap, hoek). */
function metOpening(plan: Plattegrond, o: Opening): { plan: Plattegrond; fouten: string[] } {
  const nieuw = { ...plan, openingen: [...plan.openingen, o] };
  const voor = new Set(controleerPlan(plan).map((m) => m.melding));
  return { plan: nieuw, fouten: controleerPlan(nieuw).filter((m) => m.opening === o.id && !voor.has(m.melding)).map((m) => m.melding) };
}

describe('een plaats voor een kopie of een nieuw raam (doorloop B7)', () => {
  const { plan } = snelWoning({ breedte: 900, diepte: 1000, verdiepingen: 2 }, stijlCatalogus.klassiek!);

  it('een kopie komt naast het origineel op dezelfde muur, zonder overlap of fout', () => {
    let geplaatst = 0;
    for (const o of plan.openingen.filter((x) => x.soort === 'raam')) {
      const p = plaatsNaast(plan, o);
      if (!p) continue;
      geplaatst++;
      const kopie: Opening = { ...o, id: `kopie-${o.id}`, ...p, niveau: p.niveau };
      const muren = murenVan(niveauPlan(plan, niveauVan(o)));
      expect(muurVanOpening(kopie, muren)?.id).toBe(muurVanOpening(o, muren)?.id);
      expect(Math.abs(kopie.midden - o.midden)).toBeLessThanOrEqual(o.breedte + 30 + 0.5);
      expect(metOpening(plan, kopie).fouten).toEqual([]);
    }
    expect(geplaatst).toBeGreaterThan(3);
  });

  it('geen plaats naast het origineel: undefined (geen kopie over een andere opening)', () => {
    const o = plan.openingen.find((x) => x.soort === 'raam')!;
    const m = muurVanOpening(o, murenVan(niveauPlan(plan, niveauVan(o))))!;
    // Een opening die (bijna) de hele muur vult.
    const vol: Opening = { ...o, midden: (m.van + m.tot) / 2, breedte: m.tot - m.van - 30 };
    const vol2 = { ...plan, openingen: plan.openingen.map((x) => (x.id === o.id ? vol : x)) };
    expect(plaatsNaast(vol2, vol)).toBeUndefined();
  });

  it('een nieuw raam komt in een ruimte van de gevraagde soort, in het langste vrije stuk, zonder fout', () => {
    for (const soort of ['slaapkamer', 'keuken', 'leefruimte'] as const) {
      const p = vrijePlaats(plan, { breedte: 100, niveau: soort === 'slaapkamer' ? 1 : 0, ruimteTypes: [soort] });
      expect(p, soort).toBeDefined();
      expect(plan.ruimtes.find((r) => r.id === p!.ruimte)?.type).toBe(soort);
      const o: Opening = { id: 'nieuw', soort: 'raam', ...p!, breedte: 100, hoogte: 120, borstwering: 90, scharnier: 'begin', naarPlus: !!p!.muur.plus };
      expect(metOpening(plan, o).fouten).toEqual([]);
      expect(vrijeStukken(plan, p!.muur, p!.niveau).some((s) => s.van <= o.midden - 50 && s.tot >= o.midden + 50)).toBe(true);
    }
  });

  it('een garagepoort alleen op het gelijkvloers; niets past: undefined', () => {
    const p = vrijePlaats(plan, { breedte: 250, alleenGelijkvloers: true, ruimteTypes: ['garage', 'berging'] });
    expect(p?.niveau).toBe(0);
    expect(vrijePlaats(plan, { breedte: 5000 })).toBeUndefined();
  });

  it('nooit in een muur tegen de buren', () => {
    const v = voorbeeldWoning().plan;
    const muren = murenVan(niveauPlan(v, 0)).filter((m) => m.soort === 'buiten');
    // Alle buitenmuren van het gelijkvloers tegen de buren, behalve één.
    const vrij = muren[0]!;
    const buren = { ...v, tegenBuren: muren.filter((m) => vlakSleutel(m) !== vlakSleutel(vrij)).map(vlakSleutel) };
    const p = vrijePlaats(buren, { breedte: 60, niveau: 0, alleenGelijkvloers: true });
    expect(p).toBeDefined();
    expect(vlakSleutel(p!.muur)).toBe(vlakSleutel(vrij));
  });
});
