/**
 * De gevallen waarvan het raammodel van vóór de uitbreiding met het raster (15/11) is vastgelegd in
 * `raam-oud.json`: de 14 posities van de voorbeeldwoning en een reeks varianten. Zie `raam-bestaand.test.ts`.
 * De keuzes zijn alleen de afwijkingen van de standaard, zodat nieuwe kenmerken hun standaard krijgen
 * (zoals bij een oud project dat opnieuw geopend wordt).
 */
import type { Keuzes } from '../../src/index.js';

const gelaagd = { glas: 'dubbel_gelaagd' };

export const OUDE_VARIANTEN: [string, Keuzes][] = [
  ['standaard raam', {}],
  ['raam met rooster', { rooster: true }],
  ['raam 2 vakken', { vakken: 'v2', breedte: 1800, vak1: 'draaikip_l', vak2: 'vast' }],
  ['raam 3 vakken met bovenlicht kip', { vakken: 'v3', breedte: 2400, vak1: 'draaikip_l', vak2: 'vast', vak3: 'draai_r', bovenlicht: true, bovenlicht_open: 'kip' }],
  ['raam bovenlicht vast', { bovenlicht: true, hoogte: 1900, bovenlicht_h: 450 }],
  ['raam kip', { vak1: 'kip', hoogte: 800, breedte: 900 }],
  ['raam kip te hoog', { vak1: 'kip', hoogte: 1600 }],
  ['raam te breed', { breedte: 2000 }],
  ['raam kruisroede', { roeden: 'kruis', vakken: 'v2', breedte: 1600 }],
  ['raam liggende roede', { roeden: 'liggend' }],
  ['raam screen', { zonwering: 'screen', bediening: 'domotica', rooster: true }],
  ['raam rolluik', { zonwering: 'rolluik', screen_kleur: 'zand' }],
  ['raam lamellen', { zonwering: 'lamellen', bediening: 'manueel' }],
  ['raam arduin zonder vensterbank', { dorpel: 'arduin', vensterbank: 'geen' }],
  ['raam eik vensterbank geen dorpel', { dorpel: 'geen', vensterbank: 'eik' }],
  ['raam alu zwart', { profiel: 'alu', kleur_buiten: 'zwart', kleur_binnen: 'zelfde' }],
  ['raam hout naturel', { profiel: 'hout', kleur_buiten: 'naturel', kleur_binnen: 'eik' }],
  ['raam hout-alu creme', { profiel: 'hout_alu', kleur_buiten: 'creme' }],
  ['raam pvc eik', { kleur_buiten: 'eik', glas: 'triple' }],
  ['raam statiek fout', { vakken: 'v3', breedte: 3600, hoogte: 2400, winddruk: 2400, ...gelaagd }],
  ['raam koppelprofiel', { vakken: 'v3', breedte: 3600, hoogte: 2400, winddruk: 2400, tussenstijl: 'koppel', ...gelaagd }],
  ['raam versterkt', { vakken: 'v2', breedte: 2400, hoogte: 2000, tussenstijl: 'versterkt' }],
  ['raam badkamer mat', { ruimte: 'badkamer', glas: 'mat_gelaagd', vak1: 'kip', breedte: 800, hoogte: 800 }],
  ['raam zonwerend lage borstwering', { borstwering: 300, glas: 'zon_gelaagd', verdieping: 1 }],
  ['raam rvs rand renovatie', { afstandhouder: 'rvs', situatie: 'renovatie', afwerking: false, montage: false }],
  ['terrasdeur', { type: 'terrasdeur', breedte: 900, hoogte: 2300, vak1: 'draai_l', ...gelaagd }],
  ['terrasdeur dubbel', { type: 'terrasdeur', breedte: 1800, hoogte: 2300, vakken: 'v2', vak1: 'draai_l', vak2: 'draai_r', ...gelaagd }],
  ['terrasdeur bovenlicht drempelloos', { type: 'terrasdeur', breedte: 1000, hoogte: 2600, vak1: 'draaikip_r', bovenlicht: true, drempel: 'drempelloos', vliegenraam: 'plisse', ...gelaagd }],
  ['voordeur glasstrook', { type: 'voordeur', breedte: 1000, hoogte: 2300, ...gelaagd }],
  ['voordeur vlak klink rechts', { type: 'voordeur', breedte: 1000, hoogte: 2200, deur_draai: 'rechts', paneel: 'vlak', greep: 'klink', ...gelaagd }],
  ['voordeur groeven vingerscan', { type: 'voordeur', breedte: 1100, hoogte: 2400, paneel: 'groeven', greep: 'vingerscan', deur_naar: 'buiten', rc2: true, ...gelaagd }],
  ['voordeur bovenlicht', { type: 'voordeur', breedte: 1000, hoogte: 2700, bovenlicht: true, bovenlicht_h: 400, ...gelaagd }],
  ['schuifraam links', { type: 'schuif', breedte: 3000, hoogte: 2300, profiel: 'alu', ...gelaagd }],
  ['schuifraam rechts', { type: 'schuif', breedte: 3000, hoogte: 2300, schuif_richting: 'rechts', profiel: 'alu', ...gelaagd }],
  ['schuifraam beide screen', { type: 'schuif', breedte: 4000, hoogte: 2400, schuif_richting: 'beide', profiel: 'alu_hi', zonwering: 'screen', ...gelaagd }],
  ['schuifraam pvc statiek fout', { type: 'schuif', breedte: 3000, hoogte: 2300, ...gelaagd }],
  ['schuifraam te zwaar', { type: 'schuif', breedte: 6000, hoogte: 2800, profiel: 'alu_hi', glas: 'triple_gelaagd' }],
];
