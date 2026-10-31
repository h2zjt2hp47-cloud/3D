/**
 * Catalogus voor vrije zetelontwerpen (DEMO: alle prijzen en verbruiken zijn verzonnen).
 * Elk elementtype heeft maten per cm, een prijs per prijsgroep en een meerprijs per 10 cm.
 */
import type { Ontwerp, OntwerpCatalogus } from '../src/index.js';

const g = (a: number, b: number, c: number, eigen: number) => ({ A: a, B: b, C: c, EIGEN: eigen });

export const zetelCatalogus: OntwerpCatalogus = {
  naam: 'Zetelelementen (demo)',
  groepen: ['A', 'B', 'C', 'EIGEN'],
  diepteToeslagPctPer10cm: 4,
  uurloon: 48,
  btwProcent: 21,
  leveringWaarschuwingVanaf: 340,
  typen: [
    {
      code: 'zit', label: 'Zitelement', tekenstijl: 'zit',
      breedte: { min: 60, max: 140, standaard: 90 }, diepte: { min: 80, max: 120, standaard: 95 },
      prijs: g(620, 690, 790, 560), per10cm: g(28, 32, 38, 24),
      stofVast: 0.6, stofPerM: 2.6, kostVast: 120, kostPerM: 160, uren: 3, urenPerM: 2,
    },
    {
      code: 'hoek', label: 'Hoekelement', tekenstijl: 'hoek',
      breedte: { min: 80, max: 130, standaard: 95 }, diepte: { min: 80, max: 130, standaard: 95 },
      prijs: g(890, 990, 1130, 800), per10cm: g(34, 38, 45, 30),
      stofVast: 1.2, stofPerM: 3.2, kostVast: 180, kostPerM: 200, uren: 5, urenPerM: 2,
    },
    {
      code: 'chaise', label: 'Chaise longue', tekenstijl: 'chaise',
      breedte: { min: 70, max: 110, standaard: 85 }, diepte: { min: 140, max: 200, standaard: 165 },
      prijs: g(760, 850, 970, 690), per10cm: g(30, 34, 40, 26),
      stofVast: 1.4, stofPerM: 2.4, kostVast: 150, kostPerM: 170, uren: 4, urenPerM: 2,
    },
    {
      code: 'zit_zonder_rug', label: 'Zitbank zonder rug', tekenstijl: 'zit_zonder_rug',
      breedte: { min: 60, max: 200, standaard: 120 }, diepte: { min: 50, max: 110, standaard: 80 },
      prijs: g(480, 540, 620, 430), per10cm: g(22, 25, 30, 19),
      stofVast: 0.5, stofPerM: 1.8, kostVast: 90, kostPerM: 120, uren: 2.5, urenPerM: 1.5,
    },
    {
      code: 'arm', label: 'Armleuning', tekenstijl: 'arm',
      breedte: { min: 12, max: 40, standaard: 20 }, diepte: { min: 60, max: 130, standaard: 95 },
      prijs: g(190, 220, 260, 170), per10cm: g(20, 24, 28, 16),
      stofVast: 0.7, stofPerM: 1.5, kostVast: 45, kostPerM: 60, uren: 1.5, urenPerM: 1,
    },
    {
      code: 'poef', label: 'Poef', tekenstijl: 'poef',
      breedte: { min: 40, max: 140, standaard: 70 }, diepte: { min: 40, max: 140, standaard: 70 },
      prijs: g(290, 330, 390, 250), per10cm: g(18, 21, 25, 15),
      stofVast: 0.5, stofPerM: 1.6, kostVast: 50, kostPerM: 70, uren: 1.5, urenPerM: 1,
    },
  ],
};

/** Startopstellingen voor de ontwerper. */
export const startOntwerpen: Record<string, { label: string; ontwerp: Ontwerp }> = {
  recht: {
    label: 'Rechte sofa',
    ontwerp: {
      hoofdmateriaal: 'linnen_ficelle',
      elementen: [
        { id: 'e1', type: 'arm', x: 0, y: 0, breedte: 20, diepte: 95, rotatie: 0 },
        { id: 'e2', type: 'zit', x: 20, y: 0, breedte: 95, diepte: 95, rotatie: 0 },
        { id: 'e3', type: 'zit', x: 115, y: 0, breedte: 95, diepte: 95, rotatie: 0 },
        { id: 'e4', type: 'arm', x: 210, y: 0, breedte: 20, diepte: 95, rotatie: 0 },
      ],
    },
  },
  hoek: {
    label: 'Hoeksofa',
    ontwerp: {
      hoofdmateriaal: 'linnen_brume',
      elementen: [
        { id: 'e1', type: 'hoek', x: 0, y: 0, breedte: 100, diepte: 100, rotatie: 0 },
        { id: 'e2', type: 'zit', x: 100, y: 0, breedte: 90, diepte: 100, rotatie: 0 },
        { id: 'e3', type: 'zit', x: 190, y: 0, breedte: 90, diepte: 100, rotatie: 0 },
        { id: 'e4', type: 'arm', x: 280, y: 0, breedte: 22, diepte: 100, rotatie: 0 },
        { id: 'e5', type: 'zit', x: 0, y: 100, breedte: 90, diepte: 100, rotatie: 270 },
        { id: 'e6', type: 'arm', x: 0, y: 190, breedte: 22, diepte: 100, rotatie: 270 },
      ],
    },
  },
  lounge: {
    label: 'Sofa met chaise longue en poef',
    ontwerp: {
      hoofdmateriaal: 'boucle_belize',
      elementen: [
        { id: 'e1', type: 'arm', x: 0, y: 0, breedte: 20, diepte: 95, rotatie: 0 },
        { id: 'e2', type: 'zit', x: 20, y: 0, breedte: 100, diepte: 95, rotatie: 0 },
        { id: 'e3', type: 'zit', x: 120, y: 0, breedte: 100, diepte: 95, rotatie: 0 },
        { id: 'e4', type: 'chaise', x: 220, y: 0, breedte: 90, diepte: 170, rotatie: 0, materiaal: 'linnen_brume' },
        { id: 'e5', type: 'poef', x: 70, y: 115, breedte: 80, diepte: 60, rotatie: 0 },
      ],
    },
  },
  leeg: { label: 'Leeg tekenvlak', ontwerp: { hoofdmateriaal: 'linnen_ficelle', elementen: [] } },
};
