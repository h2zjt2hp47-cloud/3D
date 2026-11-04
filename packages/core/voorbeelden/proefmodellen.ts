/**
 * Proefmodellen met een echt 3D-bestand (zie src/echt3d.ts): tonen hoe een 3D-bestand van de fabrikant werkt in de
 * configurator, met onze stoffen en poten, terwijl prijzen, tekeningen en offerte op de elementen gebaseerd blijven.
 *
 * GEEN modellen van de pilootklant. Het 3D-bestand is een gratis model van een ander merk (zie de vermelding); de
 * elementen, maten en opties zijn een benadering van dat bestand en de prijzen zijn verzonnen, zoals overal in de demo.
 */
import type { Echt3D, ModelDefinitie } from '../src/index.js';

export const PROEF_FAMILIE = 'Proef: echt 3D-model';

/**
 * "Glam Velvet Sofa" (Wayfair, CC BY 4.0) uit de Khronos glTF Sample Assets, verkleind voor de demo
 * (packages/demo-web/modellen3d/glam_velvet.glb, zie BRON.md daar).
 * Gemeten in het bestand: 219 × 102 cm, 79 cm hoog, zitting op 45 cm, zitlichaam vanaf 21 cm (slanke metalen poten).
 * Links een laag, afgerond uiteinde, rechts een hoge rug die rond loopt tot een arm.
 */
export const glamVelvet3D: Echt3D = {
  bestand: 'glam_velvet',
  vermelding: '3D-model "Glam Velvet Sofa" © 2021 Wayfair LLC (Eric Chadwick), CC BY 4.0, via Khronos glTF Sample Assets; aangepast.',
  elementen: ['rond_einde', 'zit', 'arm'],
  maat: { b: 219, d: 102, h: 79, zithoogte: 45, poothoogte: 21 },
  rek: 0.15,
  // Wat het bestand kan tonen. De pootvorm komt uit het bestand; slanke poten kunnen in onze metaal- of houtafwerking.
  toont: {
    poten: ['metaal_staaf', 'messing', 'conisch', 'cilinder'],
    zitting: ['vaste_zitting'],
    rug: ['vast'],
    nekrol: ['geen'],
    naad: ['gewoon', 'plat'],
    armstijl: ['rond'],
    functie: ['geen', 'slaapfunctie'],
    ronde_kant: ['links'],
    rug_rond: ['recht'],
  },
  vast: { houtframe: 'geen', rugvorm: 'recht' },
};

export const proefModellen: ModelDefinitie[] = [
  {
    code: 'proef_glam_velvet',
    naam: 'Glam Velvet (proef echt 3D-model)',
    familie: PROEF_FAMILIE,
    omschrijving: 'Gebogen sofa met een laag, afgerond uiteinde links en een hoge rug die rechts rond loopt tot een arm, op slanke metalen poten. De 3D-weergave gebruikt hier een echt 3D-bestand in plaats van blokken; kies gerust een andere stof of pootafwerking.',
    bron: 'Geen model van Corneille & Silence: gratis 3D-model van Wayfair (CC BY 4.0) om te tonen hoe een 3D-bestand van de fabrikant werkt. Elementen en maten zijn een benadering van dat bestand; prijzen verzonnen.',
    foto: 'glam_velvet',
    fotoBijschrift: 'beeld van het 3D-bestand',
    ontwerp: {
      model: 'proef_glam_velvet',
      hoofdmateriaal: 'velours_petrol',
      opties: { poten: 'metaal_staaf', metaal: 'zwart', zitting: 'vaste_zitting', rug: 'vast' },
      // Gemeten in het 3D-bestand: zitting 45 cm, zitlichaam vanaf 21 cm, rug ± 72 cm in het midden, arm 79 cm.
      vormgeving: { zithoogte: 45, poothoogte: 21, rughoogte: 72, armhoogte: 79, rugdikte: 16, kussendikte: 12 },
      elementen: [
        // Laag uiteinde: de rug zakt er af tot ± 50 cm; in de tekening 65 cm (minstens 20 cm boven de zitting).
        { id: 'e1', type: 'rond_einde', x: 0, y: 0, breedte: 90, diepte: 100, rotatie: 0, opties: { ronde_kant: 'links', rug_rond: 'recht' }, vorm: { rughoogte: 65 } },
        { id: 'e2', type: 'zit', x: 90, y: 0, breedte: 104, diepte: 100, rotatie: 0 },
        // Hoge rug die rond loopt tot een arm: in de benadering een ronde arm van 25 cm.
        { id: 'e3', type: 'arm', x: 194, y: 0, breedte: 25, diepte: 100, rotatie: 0, opties: { armstijl: 'rond' } },
      ],
    },
    echt3d: glamVelvet3D,
  },
];
