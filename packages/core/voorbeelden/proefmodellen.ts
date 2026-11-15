/**
 * Proefmodellen met een echt 3D-bestand (zie src/echt3d.ts): tonen hoe een 3D-bestand werkt in de configurator, met onze
 * stoffen en poten, terwijl prijzen, tekeningen en offerte op de elementen gebaseerd blijven.
 *
 * Twee proeven:
 * - Glam Velvet: GEEN model van de pilootklant. Het 3D-bestand is een gratis model van een ander merk (zie de
 *   vermelding); de elementen, maten en opties zijn een benadering van dat bestand.
 * - Sullivan, gebouwd in Blender: het model Sullivan van de klant, nagebouwd als 3D-bestand op basis van de
 *   productfoto's en de maten van de website. Een benadering, geen bestand van de fabrikant.
 * De prijzen zijn verzonnen, zoals overal in de demo.
 */
import type { Echt3D, ModelDefinitie } from '../src/index.js';
import { zetelModellen } from './modellen.js';

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

/**
 * Sullivan, nagebouwd in Blender (proef 15/11/2026): `packages/demo-web/modellen3d/sullivan_blender.glb`, gemaakt met
 * `scripts/blender/sullivan.py` op basis van de productfoto's en de maten van de website. Een benadering, geen bestand
 * van de fabrikant. Het bestand heeft de maten van de site (72 × 80 × 93, zitting op 42) en toont de vaste zitting op de
 * zwarte ring met vier poten; kiest de klant iets anders, dan toont de configurator de benadering met blokken.
 */
export const sullivanBlender3D: Echt3D = {
  bestand: 'sullivan_blender',
  vermelding: "Proef: Sullivan nagebouwd in Blender op basis van de productfoto's en de maten van de website (benadering, geen bestand van de fabrikant).",
  elementen: ['fauteuil'],
  maat: { b: 72, d: 80, h: 93, zithoogte: 42, poothoogte: 22 },
  // Een ronde zitting wordt ovaal als ze rekt: maar een paar procent.
  rek: 0.05,
  toont: {
    poten: ['ringframe'],
    zitting: ['vaste_zitting'],
    rug: ['vast'],
    nekrol: ['geen'],
    naad: ['gewoon', 'plat'],
    kuipvorm: ['afgerond'],
  },
};

/** Het ontwerp van het gewone model Sullivan, onder een eigen code: prijs, tekeningen en offerte zijn dus dezelfde. */
const sullivan = zetelModellen.find((m) => m.code === 'sullivan')!;

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
  {
    code: 'proef_sullivan_blender',
    naam: 'Sullivan (proef: gebouwd in Blender)',
    familie: PROEF_FAMILIE,
    omschrijving: "Dezelfde fauteuil als Sullivan, maar de 3D-weergave toont een 3D-bestand dat in Blender is gebouwd naar de productfoto's: een brede rug met een vlakke bovenkant, lage dikke armen met een plooi tegen de rug, een rug die dikker is bij de zitting en een ronde onderrand. Linksboven in de 3D wissel je tussen dit bestand en de benadering.",
    bron: "Maten van de productpagina op de website; de vorm is een benadering op basis van de productfoto's, gebouwd in Blender (proef 15/11/2026). Prijs, tekeningen en offerte zijn die van het gewone model Sullivan.",
    ...(sullivan.foto ? { foto: sullivan.foto } : {}),
    ontwerp: { ...structuredClone(sullivan.ontwerp), model: 'proef_sullivan_blender' },
    echt3d: sullivanBlender3D,
  },
];
