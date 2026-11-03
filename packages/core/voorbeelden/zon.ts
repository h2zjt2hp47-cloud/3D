/**
 * Demo-catalogus zonnepanelen: panelen, omvormers, batterijen en prijzen.
 * Merken, typenummers en prijzen zijn VERZONNEN; de elektrische waarden liggen in de buurt van
 * gangbare panelen en omvormers (2026) zodat de controles zinvol zijn.
 */
import type { ZonCatalogus, ZonProject } from '../src/zon.js';

export const ZON_CATALOGUS: ZonCatalogus = {
  panelen: [
    { code: 'HEL-430-FB', naam: '430 Full Black', merk: 'Helios', wp: 430, lengte: 1722, breedte: 1134, voc: 38.9, vmp: 32.4, isc: 14.0, imp: 13.3, tkVoc: -0.25, tkP: -0.29, uitzicht: 'volledig zwart', garantie: 25, prijs: 139, kost: 94 },
    { code: 'HEL-450', naam: '450', merk: 'Helios', wp: 450, lengte: 1762, breedte: 1134, voc: 40.2, vmp: 33.6, isc: 14.2, imp: 13.4, tkVoc: -0.25, tkP: -0.29, uitzicht: 'zwart kader, blauwe cellen', garantie: 15, prijs: 124, kost: 82 },
    { code: 'NOR-500-GG', naam: '500 glas-glas', merk: 'Nordlicht', wp: 500, lengte: 1961, breedte: 1134, voc: 45.3, vmp: 37.9, isc: 13.9, imp: 13.2, tkVoc: -0.24, tkP: -0.29, uitzicht: 'zwart kader, glas-glas', garantie: 30, prijs: 172, kost: 119 },
    { code: 'KOM-410-FB', naam: '410 Full Black', merk: 'Kompakt', wp: 410, lengte: 1690, breedte: 1046, voc: 37.6, vmp: 31.4, isc: 13.8, imp: 13.1, tkVoc: -0.26, tkP: -0.3, uitzicht: 'volledig zwart, kleiner formaat', garantie: 25, prijs: 136, kost: 92 },
  ],
  omvormers: [
    // Stringomvormers monofasig.
    { code: 'SW-S3.0-M', naam: 'S3.0 M', merk: 'Sunwave', soort: 'string', fasen: 1, ac: 3000, mppt: 2, mpptMin: 90, mpptMax: 520, maxVdc: 600, maxStroom: 16, garantie: 10, prijs: 790, kost: 520 },
    { code: 'SW-S3.6-M', naam: 'S3.6 M', merk: 'Sunwave', soort: 'string', fasen: 1, ac: 3680, mppt: 2, mpptMin: 90, mpptMax: 520, maxVdc: 600, maxStroom: 16, garantie: 10, prijs: 860, kost: 565 },
    { code: 'SW-S5.0-M', naam: 'S5.0 M', merk: 'Sunwave', soort: 'string', fasen: 1, ac: 5000, mppt: 2, mpptMin: 90, mpptMax: 520, maxVdc: 600, maxStroom: 16, garantie: 10, prijs: 990, kost: 650 },
    // Stringomvormers driefasig.
    { code: 'SW-S5.0-T', naam: 'S5.0 T', merk: 'Sunwave', soort: 'string', fasen: 3, ac: 5000, mppt: 2, mpptMin: 160, mpptMax: 950, maxVdc: 1100, maxStroom: 16, garantie: 10, prijs: 1190, kost: 790 },
    { code: 'SW-S8.0-T', naam: 'S8.0 T', merk: 'Sunwave', soort: 'string', fasen: 3, ac: 8000, mppt: 2, mpptMin: 160, mpptMax: 950, maxVdc: 1100, maxStroom: 32, garantie: 10, prijs: 1420, kost: 945 },
    { code: 'SW-S10-T', naam: 'S10 T', merk: 'Sunwave', soort: 'string', fasen: 3, ac: 10000, mppt: 3, mpptMin: 160, mpptMax: 950, maxVdc: 1100, maxStroom: 32, garantie: 10, prijs: 1640, kost: 1090 },
    // Hybride (met batterij).
    { code: 'VO-H3.6-M', naam: 'Hybrid 3.6 M', merk: 'Volta', soort: 'hybride', fasen: 1, ac: 3680, mppt: 2, mpptMin: 100, mpptMax: 520, maxVdc: 600, maxStroom: 16, garantie: 10, prijs: 1390, kost: 930 },
    { code: 'VO-H5.0-M', naam: 'Hybrid 5.0 M', merk: 'Volta', soort: 'hybride', fasen: 1, ac: 5000, mppt: 2, mpptMin: 100, mpptMax: 520, maxVdc: 600, maxStroom: 16, garantie: 10, prijs: 1590, kost: 1060 },
    { code: 'VO-H6.0-T', naam: 'Hybrid 6.0 T', merk: 'Volta', soort: 'hybride', fasen: 3, ac: 6000, mppt: 2, mpptMin: 160, mpptMax: 950, maxVdc: 1000, maxStroom: 16, garantie: 10, prijs: 1890, kost: 1260 },
    { code: 'VO-H8.0-T', naam: 'Hybrid 8.0 T', merk: 'Volta', soort: 'hybride', fasen: 3, ac: 8000, mppt: 2, mpptMin: 160, mpptMax: 950, maxVdc: 1000, maxStroom: 32, garantie: 10, prijs: 2190, kost: 1460 },
    { code: 'VO-H10-T', naam: 'Hybrid 10 T', merk: 'Volta', soort: 'hybride', fasen: 3, ac: 10000, mppt: 3, mpptMin: 160, mpptMax: 950, maxVdc: 1000, maxStroom: 32, garantie: 10, prijs: 2490, kost: 1660 },
    // Micro-omvormer: één per paneel.
    { code: 'MW-M500', naam: 'M500', merk: 'Microwatt', soort: 'micro', fasen: 1, ac: 480, mppt: 1, mpptMin: 16, mpptMax: 60, maxVdc: 60, maxStroom: 20, maxWp: 600, garantie: 25, prijs: 165, kost: 109 },
  ],
  batterijen: [
    { code: 'VO-B5', naam: 'Home 5', merk: 'Volta', kwh: 5.1, prijs: 2690, kost: 1790 },
    { code: 'VO-B10', naam: 'Home 10', merk: 'Volta', kwh: 10.2, prijs: 4790, kost: 3190 },
    { code: 'VO-B15', naam: 'Home 15', merk: 'Volta', kwh: 15.3, prijs: 6790, kost: 4520 },
  ],
  prijzen: {
    montage: {
      pannen: { prijs: 46, kost: 27 },
      leien: { prijs: 62, kost: 37 },
      golfplaat: { prijs: 38, kost: 21 },
      plat: { prijs: 58, kost: 35 },
    },
    arbeidPaneel: { prijs: 38, kost: 24 },
    plaatsingOmvormer: { prijs: 290, kost: 180 },
    plaatsingBatterij: { prijs: 390, kost: 240 },
    bekabeling: { prijs: 340, kost: 190 },
    stellingHellend: { prijs: 295, kost: 160 },
    stellingPlat: { prijs: 195, kost: 110 },
    keuring: { prijs: 165, kost: 125 },
    aanmelding: { prijs: 95, kost: 40 },
    optimizer: { prijs: 52, kost: 33 },
    laadpaal: { prijs: 1290, kost: 820 },
    monitoring: { prijs: 145, kost: 70 },
  },
};

/** Lege start: één huis met zadeldak, voorgevel op het zuidoosten. */
export function leegZonProject(): ZonProject {
  return {
    klant: { naam: '', adres: '', telefoon: '', email: '' },
    verbruik: 3500,
    extraVerbruik: 0,
    aansluiting: 'mono',
    woningOuderDan10: true,
    orientatie: -45,
    gebouwen: [{ id: 'huis', naam: 'Woning', dakvorm: 'zadel', breedte: 900, diepte: 1000, goothoogte: 600, helling: 40, x: 0, z: 0 }],
    vlakken: {},
    paneel: 'HEL-430-FB',
    omvormer: 'auto',
    batterij: '',
    optimizers: false,
    laadpaal: false,
    monitoring: true,
    afnameprijs: 0.3,
    injectieprijs: 0.04,
    prijsstijging: 2,
    korting: 0,
    opbrengstMarge: 5,
    doelAantal: null,
    varianten: [],
    omgeving: [],
    luchtfoto: null,
  };
}

/** Voorbeeld: woning met zadeldak (dakraam en schoorsteen) en een garage met plat dak. */
export function voorbeeldZonProject(): ZonProject {
  return {
    ...leegZonProject(),
    klant: { naam: 'Fam. Demeester', adres: 'Kortrijksesteenweg 12, 8530 Harelbeke', telefoon: '', email: '' },
    verbruik: 4200,
    extraVerbruik: 2500,
    aansluiting: 'drie',
    orientatie: -20,
    gebouwen: [
      { id: 'huis', naam: 'Woning', dakvorm: 'zadel', breedte: 1050, diepte: 1000, goothoogte: 600, helling: 38, x: 0, z: 0 },
      { id: 'garage', naam: 'Garage', dakvorm: 'plat', breedte: 600, diepte: 700, goothoogte: 300, helling: 0, x: 825, z: -150 },
    ],
    vlakken: {
      'huis-voor': {
        actief: true, bedekking: 'pannen', ligging: 'staand', schaduw: 'geen', rand: 30,
        obstakels: [
          { id: 'o1', soort: 'dakraam', x: 140, y: 230, b: 78, h: 118 },
          { id: 'o2', soort: 'schoorsteen', x: 820, y: 520, b: 60, h: 60 },
        ],
        uit: [], opstelling: 'zuid', kanteling: 13,
      },
      'huis-achter': { actief: false, bedekking: 'pannen', ligging: 'staand', schaduw: 'licht', rand: 30, obstakels: [], uit: [], opstelling: 'zuid', kanteling: 13 },
      'garage-plat': { actief: true, bedekking: 'plat', ligging: 'liggend', schaduw: 'licht', rand: 50, obstakels: [], uit: [], opstelling: 'oostwest', kanteling: 10 },
    },
    batterij: 'VO-B10',
    laadpaal: true,
  };
}
