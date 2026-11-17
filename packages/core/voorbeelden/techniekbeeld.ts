/**
 * De gegevens voor de beelden van de techniek in de beeldvergelijking (scripts/beeldvergelijking.mjs, ronde 10): het
 * 3D-pakket van de uitgeruste voorbeeldwoning in de uitgezette weergave, voor de losse kijker (de configurator toont
 * de techniek nog niet), en de tekening van het gelijkvloers met alle tekens en leidingen. Sinds ronde 10c ook het pakket
 * zoals het bestand voor de klant het meekrijgt (`klant`: de woning met wat buiten staat, sinds ronde 17 ook met de techniek
 * binnen, en het veld `techniek`), voor de beelden van de kijker met *Techniek* en met *De woning*, *Muren laag*.
 *
 * Gebruik: `tsx packages/core/voorbeelden/techniekbeeld.ts` schrijft { pakket, plan, klant } als JSON naar de uitvoer.
 */
import { niveauPlan, plattegrond3D, tekenPlattegrond, techniekPakket, PAKKET3D_SOORT, PAKKET3D_VERSIE, type Pakket3D } from '../src/index.js';
import { techniekPlanCatalogus as cat, uitgerusteWoning } from './techniekwoning.js';

export function techniekBeeldGegevens(): { pakket: Pakket3D; plan: string; klant: Pakket3D } {
  const { plan } = uitgerusteWoning();
  const scene = plattegrond3D(plan, cat, { techniek: { weergave: 'uitgezet' } });
  const pakket: Pakket3D = {
    soort: PAKKET3D_SOORT, versie: PAKKET3D_VERSIE, gemaakt: '2026-11-16T12:00:00.000Z',
    project: { nummer: 'beeldtest', naam: 'Voorbeeldwoning met techniek' },
    woning: [{ naam: 'Techniek, uitgezet', scene, laag: scene }],
    posities: [],
  };
  // Sinds ronde 17 ook de techniek binnen in de woning, zoals het bestand voor de klant (`maakPakket3D` met `techniek`).
  const o = { aanleg: true, gevelkoppen: true, wijken: true, meubels: true, dingen: true, techniekBuiten: true, techniekBinnen: true };
  const klant: Pakket3D = {
    soort: PAKKET3D_SOORT, versie: PAKKET3D_VERSIE, gemaakt: '2026-11-17T12:00:00.000Z',
    project: { nummer: 'beeldtest', naam: 'Voorbeeldwoning met techniek' },
    woning: [{ naam: 'Hele woning', scene: plattegrond3D(plan, cat, o), laag: plattegrond3D(plan, cat, { ...o, laag: 110, totNiveau: 0 }) }],
    posities: [],
    techniek: techniekPakket(plan, cat),
  };
  return { pakket, plan: tekenPlattegrond(niveauPlan(plan, 0), cat, { techniek: true, afdruk: true, breedtePx: 1400 }), klant };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('voorbeelden/techniekbeeld.ts')) process.stdout.write(JSON.stringify(techniekBeeldGegevens()));
