/**
 * Modellen uit de collectie van de pilootklant, als vertrekpunt voor de configurator.
 *
 * LET OP: opbouw, maten en opties zijn een BENADERING op basis van productfoto's
 * (pagina "Zitten" van de website). Te bevestigen met de klant: elementmaten,
 * poten, comfort, toegelaten opties en prijzen.
 */
import type { ModelDefinitie } from '../src/index.js';

const BRON = 'Benadering op basis van de productfoto; maten en opties nog te bevestigen.';

export const zetelModellen: ModelDefinitie[] = [
  {
    code: 'kotor',
    naam: 'Kotor',
    familie: "Sofa's",
    omschrijving: 'Diepe, lage sofa met chaise longue, losse rugkussens, strakke arm en een lage houten bank aan de zijkant.',
    bron: BRON,
    ontwerp: {
      model: 'kotor',
      hoofdmateriaal: 'linnen_travertin',
      opties: { poten: 'conisch', hout: 'eik_zwart', zithoogte: 'laag', rug: 'los', comfort: 'dons', poothoogte: 'standaard' },
      vormgeving: { kussendikte: 16, zachtheid: 6, rugdikte: 16 },
      elementen: [
        { id: 'e1', type: 'console', x: 0, y: 25, breedte: 60, diepte: 80, rotatie: 0, opties: { console_uitvoering: 'bank' } },
        { id: 'e2', type: 'arm', x: 60, y: 0, breedte: 18, diepte: 105, rotatie: 0, opties: { armstijl: 'strak', armhoogte: 'laag' } },
        { id: 'e3', type: 'zit', x: 78, y: 0, breedte: 105, diepte: 105, rotatie: 0 },
        { id: 'e4', type: 'zit', x: 183, y: 0, breedte: 105, diepte: 105, rotatie: 0 },
        { id: 'e5', type: 'chaise', x: 288, y: 0, breedte: 95, diepte: 170, rotatie: 0 },
        { id: 'e6', type: 'arm', x: 383, y: 0, breedte: 18, diepte: 170, rotatie: 0, opties: { armstijl: 'strak', armhoogte: 'laag' } },
      ],
    },
  },
  {
    code: 'doha',
    naam: 'Doha',
    familie: "Sofa's",
    omschrijving: 'Organische sofa met afgeronde lounge-uiteinden, losse rugkussens en een zachte, ronde lijn.',
    bron: BRON,
    ontwerp: {
      model: 'doha',
      hoofdmateriaal: 'boucle_belize',
      opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'los', comfort: 'dons' },
      vormgeving: { zachtheid: 9, rugvorm: 'rond', kussendikte: 15 },
      elementen: [
        { id: 'e1', type: 'rond_einde', x: 0, y: 0, breedte: 150, diepte: 110, rotatie: 0, opties: { ronde_kant: 'links' } },
        { id: 'e2', type: 'zit', x: 150, y: 0, breedte: 100, diepte: 100, rotatie: 0 },
        { id: 'e3', type: 'rond_einde', x: 250, y: 0, breedte: 110, diepte: 100, rotatie: 0, opties: { ronde_kant: 'rechts' } },
      ],
    },
  },
  {
    code: 'montego',
    naam: 'Montego',
    familie: "Sofa's",
    omschrijving: 'Lage, afgeronde "wolk"-sofa in bouclé zonder armen, op een verdekte voet.',
    bron: BRON,
    ontwerp: {
      model: 'montego',
      hoofdmateriaal: 'boucle_belize',
      opties: { poten: 'verdekt', poothoogte: 'laag', zithoogte: 'laag', rug: 'vast', comfort: 'dons', zitting: 'losse_kussens' },
      vormgeving: { zachtheid: 10, rugvorm: 'rond', rugdikte: 24, kussendikte: 18 },
      elementen: [
        { id: 'e1', type: 'rond_einde', x: 0, y: 0, breedte: 130, diepte: 100, rotatie: 0, opties: { ronde_kant: 'links' } },
        { id: 'e2', type: 'rond_einde', x: 130, y: 0, breedte: 130, diepte: 100, rotatie: 0, opties: { ronde_kant: 'rechts' } },
      ],
    },
  },
  {
    code: 'belize',
    naam: 'Belize',
    familie: "Sofa's",
    omschrijving: 'Ruime U-opstelling met twee chaises longues, losse rugkussens, slanke armen en slanke metalen poten.',
    bron: BRON,
    ontwerp: {
      model: 'belize',
      hoofdmateriaal: 'linnen_ficelle',
      opties: { poten: 'metaal_staaf', metaal: 'zwart', poothoogte: 'standaard', rug: 'los', comfort: 'veren' },
      vormgeving: { kussendikte: 14, zachtheid: 4 },
      elementen: [
        { id: 'e1', type: 'arm', x: 0, y: 0, breedte: 16, diepte: 165, rotatie: 0, opties: { armstijl: 'strak', armhoogte: 'laag' } },
        { id: 'e2', type: 'chaise', x: 16, y: 0, breedte: 90, diepte: 165, rotatie: 0 },
        { id: 'e3', type: 'zit', x: 106, y: 0, breedte: 90, diepte: 95, rotatie: 0 },
        { id: 'e4', type: 'zit', x: 196, y: 0, breedte: 90, diepte: 95, rotatie: 0 },
        { id: 'e5', type: 'zit', x: 286, y: 0, breedte: 90, diepte: 95, rotatie: 0 },
        { id: 'e6', type: 'chaise', x: 376, y: 0, breedte: 90, diepte: 165, rotatie: 0 },
        { id: 'e7', type: 'arm', x: 466, y: 0, breedte: 16, diepte: 165, rotatie: 0, opties: { armstijl: 'strak', armhoogte: 'laag' } },
      ],
    },
  },
];
