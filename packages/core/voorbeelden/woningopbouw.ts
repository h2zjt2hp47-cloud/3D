/**
 * De opbouwen die een woning kan krijgen (ronde 6): per plaats (buitenwand, binnenwand, vloer op de grond,
 * verdiepingsvloer, plat dak, hellend dak) de keuzes uit `opbouwen.ts` en de standaard. Gegevens, zoals de
 * gevelcatalogus: een nieuwe opbouw in `opbouwen.ts` wordt een keuze door haar code hier bij een plaats te zetten.
 *
 * **Voorbeelden, geen nagelezen bouwdetails** (zie bovenaan `opbouwen.ts`): elke opbouw heeft `nagelezen: false`.
 * Er staat hier geen enkel getal: alleen welke opbouw waar kan en welke de standaard is (een eigen keuze).
 *
 * De standaard van de buitenwand volgt de gevel (`volgensGevel`): een muurvlak in gevelsteen of steenstrips krijgt de
 * houtskeletwand met steenstrips, hout de houtskeletwand met houten bekleding, pleister die met sierpleister. Zo zegt
 * de meetstaat ongeveer wat de afgewerkte 3D toont. Een metselwerkgevel als massieve spouwmuur kies je zelf.
 * Zo ook het hellende dak (16/11): de opbouw volgt de dakbedekking (`volgensDak`).
 */
import type { WoningOpbouwCatalogus } from '../src/index.js';
import { bouwMaterialen, opbouwen } from './opbouwen.js';

export const woningOpbouwCatalogus: WoningOpbouwCatalogus = {
  opbouwen,
  materialen: bouwMaterialen,
  plaatsen: {
    buitenwand: { label: 'Buitenmuren', keuzes: ['hsb_hout', 'hsb_steenstrips', 'hsb_pleister', 'spouwmuur'], standaard: 'hsb_hout' },
    binnenwand: { label: 'Binnenmuren', keuzes: ['binnenwand_hsb'], standaard: 'binnenwand_hsb' },
    grondvloer: { label: 'Vloer op de grond', keuzes: ['vloer_volle_grond'], standaard: 'vloer_volle_grond' },
    verdiepingsvloer: { label: 'Vloer tussen verdiepingen', keuzes: ['verdiepingsvloer_hout'], standaard: 'verdiepingsvloer_hout' },
    platDak: { label: 'Plat dak', keuzes: ['plat_dak_warm'], standaard: 'plat_dak_warm' },
    hellendDak: { label: 'Hellend dak', keuzes: ['hellend_dak_pannen', 'hellend_dak_leien', 'hellend_dak_zink'], standaard: 'hellend_dak_pannen' },
  },
  volgensGevel: {
    steen: 'hsb_steenstrips', natuursteen: 'hsb_steenstrips',
    planken: 'hsb_hout', planken_h: 'hsb_hout',
    pleister: 'hsb_pleister', gevel: 'hsb_pleister',
  },
  // Het hellende dak volgt de bedekking uit de dakcatalogus (doorloop B3): zink en leien kregen vroeger panlatten en pannen.
  volgensDak: { pannen: 'hellend_dak_pannen', leien: 'hellend_dak_leien', zink: 'hellend_dak_zink' },
};
