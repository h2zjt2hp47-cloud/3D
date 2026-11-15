/**
 * Voorbeeldproduct sectionale garagepoort: een eigen vast model met maten en opties (breedte, hoogte,
 * belijning, vensters, kleur). Maten in mm. Zicht van buiten: zo beoordeelt de klant de poort.
 *
 * DEMO, alleen om te tonen: er is nog geen stuklijst en dus geen prijs. De hoogte van de secties, het aantal
 * cassettes en de maat van de vensters zijn benaderingen; elke fabrikant heeft zijn eigen verdeling.
 */
import type { Keuzewaarde, Prijslijst, ProductModel } from '../src/index.js';
import { GLASKLEUR, RAL_KLEUREN } from './raam.js';

const kleuren: Keuzewaarde[] = RAL_KLEUREN.map((k) => ({ code: k.code, label: `${k.naam} (RAL ${k.ral})`, eigenschappen: { kleur: k.hex } }));

export const garagepoort: ProductModel = {
  code: 'POORT',
  naam: 'Sectionale garagepoort',
  versie: 1,
  maateenheid: 'mm',
  stappen: [
    { code: 'maten', label: 'Maten' },
    { code: 'uitzicht', label: 'Uitzicht' },
  ],
  kenmerken: [
    { code: 'breedte', label: 'Breedte (dagmaat van de opening)', stap: 'maten', type: 'getal', eenheid: 'mm', min: 2000, max: 6000, stapgrootte: 1, standaard: 2500 },
    { code: 'hoogte', label: 'Hoogte (dagmaat van de opening)', stap: 'maten', type: 'getal', eenheid: 'mm', min: 1900, max: 3000, stapgrootte: 1, standaard: 2125 },
    {
      code: 'belijning', label: 'Belijning van de panelen', stap: 'uitzicht', type: 'keuze', standaard: 'lijnen',
      keuzes: [
        { code: 'vlak', label: 'Vlak (glad paneel)' },
        { code: 'lijnen', label: 'Horizontale lijnen' },
        { code: 'cassettes', label: 'Cassettes' },
      ],
    },
    { code: 'vensters', label: 'Vensters (een rij op ooghoogte)', stap: 'uitzicht', type: 'janee', standaard: false },
    {
      code: 'kleur', label: 'Kleur', stap: 'uitzicht', type: 'keuze', standaard: 'antraciet',
      helptekst: 'De kleur op het scherm is een benadering: beslis met een echte RAL-waaier of een staal.',
      keuzes: kleuren,
    },
  ],
  afgeleid: [
    // Secties van ongeveer 50 cm hoog; cassettes en vensters van ongeveer 60 cm breed.
    { code: 'ns', label: 'Aantal secties', formule: 'max(3; naarboven(hoogte / 560; 1))' },
    { code: 'sh', label: 'Hoogte per sectie (mm)', formule: 'hoogte / ns' },
    { code: 'nl', formule: 'als(belijning = "lijnen"; max(2; afronden(sh / 125; 0)); 1)' },
    { code: 'nc', label: 'Cassettes of vensters naast elkaar', formule: 'max(2; afronden(breedte / 620; 0))' },
    { code: 'cb', formule: 'breedte / nc' },
    // Vensters in de tweede sectie van boven (ooghoogte); rijen tellen van boven, de bovenste is 0.
    { code: 'venster_rij', formule: '1' },
    { code: 'venster_b', formule: 'min(cb - 180; 420)' },
    { code: 'venster_h', formule: 'min(sh - 180; 300)' },
    { code: 'kleur_hex', formule: 'kleur_kleur' },
    { code: 'poort_m2', label: 'Oppervlakte (m²)', formule: 'breedte * hoogte / 1000000' },
  ],
  regels: [
    { code: 'breed', ernst: 'waarschuwing', als: 'breedte > 5000', melding: 'Poort breder dan 5 m: laat de latei boven de opening berekenen.' },
    { code: 'laag', ernst: 'waarschuwing', als: 'hoogte < 2000', melding: 'Doorrijhoogte lager dan 2 m: te laag voor een bestelwagen of een dakkoffer.' },
  ],
  stuklijst: [],
  tekening: {
    titel: 'Zicht van buiten (mm)',
    eenheid: 'mm',
    vormen: [
      { code: 'blad', x: '0', y: '0', breedte: 'breedte', hoogte: 'hoogte', vulling: 'kleur_hex' },
      // Fijne lijnen binnen elke sectie.
      { code: 'lijn', als: 'belijning = "lijnen"', herhaal: 'ns * nl - 1', x: '0', y: '(i + 1) * sh / nl - 2', breedte: 'breedte', hoogte: '4', vulling: '"#00000030"' },
      // Cassettes: een verdiept vlak per cassette (niet in de sectie met vensters).
      {
        code: 'cassette', als: 'belijning = "cassettes"', herhaal: 'ns * nc',
        x: 'rest(i; nc) * cb + 70', y: 'naarbeneden(i / nc; 1) * sh + 70',
        breedte: 'als(vensters en naarbeneden(i / nc; 1) = venster_rij; 0; cb - 140)', hoogte: 'sh - 140', vulling: '"#00000014"', afronding: '12',
      },
      // Naden tussen de secties.
      { code: 'naad', herhaal: 'ns - 1', x: '0', y: '(i + 1) * sh - 4', breedte: 'breedte', hoogte: '8', vulling: '"#00000066"' },
      { code: 'venster', als: 'vensters', herhaal: 'nc', x: 'i * cb + (cb - venster_b) / 2', y: 'venster_rij * sh + (sh - venster_h) / 2', breedte: 'venster_b', hoogte: 'venster_h', vulling: `"${GLASKLEUR}"`, afronding: '10' },
      { code: 'greep', x: 'breedte / 2 - 90', y: 'hoogte - sh / 2 - 20', breedte: '180', hoogte: '40', vulling: '"#2a2a2a"', afronding: '6' },
    ],
    maatlijnen: [
      { code: 'breedte', x1: 'breedte', y1: 'hoogte', x2: '0', y2: 'hoogte', afstand: '180' },
      { code: 'hoogte', x1: 'breedte', y1: '0', x2: 'breedte', y2: 'hoogte', afstand: '160' },
      { code: 'sectie', x1: '0', y1: 'sh', x2: '0', y2: '0', afstand: '160', tekst: 'afronden(sh; 0)' },
    ],
  },
  // Nog geen prijs: het model dient om de poort te tonen (tekening en 3D).
  prijs: { opslagProcent: 0, btwProcent: 21 },
};

/** Lege prijslijst: de garagepoort heeft nog geen stuklijst. */
export const poortPrijslijst: Prijslijst = {};
