/**
 * De gegevens voor de beelden van de techniek in de beeldvergelijking (scripts/beeldvergelijking.mjs, ronde 10): het
 * 3D-pakket van de uitgeruste voorbeeldwoning in de uitgezette weergave, voor de losse kijker (de configurator toont
 * de techniek nog niet), en de tekening van het gelijkvloers met alle tekens en leidingen.
 *
 * Gebruik: `tsx packages/core/voorbeelden/techniekbeeld.ts` schrijft { pakket, plan } als JSON naar de uitvoer.
 */
import { niveauPlan, plattegrond3D, tekenPlattegrond, PAKKET3D_SOORT, PAKKET3D_VERSIE, type Pakket3D } from '../src/index.js';
import { techniekPlanCatalogus as cat, uitgerusteWoning } from './techniekwoning.js';

export function techniekBeeldGegevens(): { pakket: Pakket3D; plan: string } {
  const { plan } = uitgerusteWoning();
  const scene = plattegrond3D(plan, cat, { techniek: { weergave: 'uitgezet' } });
  const pakket: Pakket3D = {
    soort: PAKKET3D_SOORT, versie: PAKKET3D_VERSIE, gemaakt: '2026-11-16T12:00:00.000Z',
    project: { nummer: 'beeldtest', naam: 'Voorbeeldwoning met techniek' },
    woning: [{ naam: 'Techniek, uitgezet', scene, laag: scene }],
    posities: [],
  };
  return { pakket, plan: tekenPlattegrond(niveauPlan(plan, 0), cat, { techniek: true, afdruk: true, breedtePx: 1400 }) };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('voorbeelden/techniekbeeld.ts')) process.stdout.write(JSON.stringify(techniekBeeldGegevens()));
