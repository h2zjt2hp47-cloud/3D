/**
 * Voorbeelden van opbouwen voor wanden, vloeren en daken (zie src/opbouw.ts), met hun materialen.
 *
 * **Dit zijn voorbeelden, geen nagelezen bouwdetails.** Ze dienen om de bouwdelen te tonen en te testen. Geen enkele
 * dikte, doorsnede of afstand is nagerekend of nagelezen door een vakman, en het onderzoeksdocument waar een deel
 * vandaan komt (`docs/onderzoek-bouw-constructies.md`) zegt zelf dat geen enkele bron geopend kon worden: elk getal
 * daar komt uit een zoekresultaat. Elke opbouw zegt in `herkomst` waar ze vandaan komt en heeft `nagelezen: false`:
 * een houtbouwer, dakwerker of aannemer moet ze nalezen vóór ze in een offerte of op een werf gebruikt wordt.
 *
 * De materialen hebben geen merk- of productnamen en geen prijzen. De warmtegeleiding is bewust leeg gelaten: die
 * moet uit een bron komen die iemand naleest (zie de analyse, hoofdstuk 14).
 */
import type { BouwMateriaal, LaagHout, Opbouw, OpbouwHerkomst } from '../src/index.js';

/** Materialen van de voorbeeldopbouwen. `soort` en `kleur` zeggen hoe de 3D ze tekent; de kleuren zijn zelf gekozen. */
export const bouwMaterialen: Record<string, BouwMateriaal> = {
  vuren: { label: 'Naaldhout (vuren), gezaagd', soort: 'hout', kleur: '#dcbf8f' },
  gipsplaat: { label: 'Gipsplaat', soort: 'gevel', kleur: '#ecebe6' },
  osb: { label: 'OSB-plaat', soort: 'hout', kleur: '#c49e63' },
  houtvezelplaat: { label: 'Houtvezelisolatieplaat (pleisterdragend)', soort: 'gevel', kleur: '#8f6f4c' },
  cementplaat: { label: 'Cementgebonden plaat', soort: 'gevel', kleur: '#b7b5ae' },
  minerale_wol: { label: 'Minerale wol', soort: 'gevel', kleur: '#e8d166' },
  isolatieplaat: { label: 'Harde isolatieplaat', soort: 'gevel', kleur: '#f1e6b4' },
  dampscherm: { label: 'Dampscherm', soort: 'kunststof', kleur: '#6fa8d6' },
  gevelfolie: { label: 'Winddichte gevelfolie', soort: 'kunststof', kleur: '#2f3235' },
  onderdak: { label: 'Onderdakfolie', soort: 'kunststof', kleur: '#51616e' },
  pe_folie: { label: 'PE-folie', soort: 'kunststof', kleur: '#a9cbe0' },
  gevelplanken: { label: 'Houten gevelbekleding, staande planken', soort: 'planken', kleur: '#a47c54' },
  steenstrips: { label: 'Steenstrips', soort: 'steen', kleur: '#9c5b45', voeg: '#cfc8bc' },
  sierpleister: { label: 'Sierpleister', soort: 'pleister', kleur: '#e9e5da' },
  binnenpleister: { label: 'Binnenpleister', soort: 'gevel', kleur: '#efeee9' },
  snelbouwsteen: { label: 'Snelbouwsteen', soort: 'steen', kleur: '#c98f6c', voeg: '#d8d2c6' },
  gevelsteen: { label: 'Gevelsteen', soort: 'steen', kleur: '#96523f', voeg: '#cfc8bc' },
  beton: { label: 'Gewapend beton', soort: 'gevel', kleur: '#b0ada6' },
  dekvloer: { label: 'Dekvloer', soort: 'gevel', kleur: '#cdc9c0' },
  vloertegels: { label: 'Vloertegels', soort: 'tegel', kleur: '#cfc9bd' },
  parket: { label: 'Parket', soort: 'parket', kleur: '#b08a5c' },
  epdm: { label: 'EPDM-dakbedekking', soort: 'dak', kleur: '#2c2d2f' },
  dakpannen: { label: 'Keramische dakpannen', soort: 'pannen', kleur: '#9a4a36' },
};

const ONDERZOEK = 'docs/onderzoek-bouw-constructies.md';
const algemeen: OpbouwHerkomst = { bron: 'algemene kennis', nagelezen: false };
const uitOnderzoek = (verwijzing: string): OpbouwHerkomst => ({ bron: 'onderzoek', verwijzing: `${ONDERZOEK}, ${verwijzing}`, nagelezen: false });

/** Het houtskelet van een buitenwand, met de lagen aan de binnenkant ervan (van binnen naar buiten). */
const hsbBinnen = (): Opbouw['lagen'] => [
  { naam: 'Gipsplaat', materiaal: 'gipsplaat', dikte: 12.5, rol: 'afwerking_binnen' },
  { naam: 'Leidingspouw (liggende latten)', materiaal: 'vuren', dikte: 45, rol: 'latten', hout: { breedte: 45, hoh: 600 } },
  { naam: 'Dampscherm', materiaal: 'dampscherm', dikte: 0.2, rol: 'folie' },
  { naam: 'Houtskelet met isolatie', materiaal: 'vuren', dikte: 140, rol: 'skelet', hout: { breedte: 38, hoh: 600, vulling: 'minerale_wol' } },
  { naam: 'OSB-plaat', materiaal: 'osb', dikte: 15, rol: 'plaat' },
];
const HSB_HERKOMST = uitOnderzoek(
  'hoofdstuk 2.3 en 2.6: stijlen 38 × 140 mm om de 60 cm [H1][H2], volgorde van de lagen [H6][H7], OSB 15 mm [H7][H8][H24]. '
  + 'De diktes van gipsplaat, leidingspouw, latten en bekleding, en de latei: algemene kennis.',
);
const roostering: LaagHout = { breedte: 70, hoh: 400 };

export const opbouwen: Record<string, Opbouw> = {
  hsb_hout: {
    naam: 'Buitenwand in houtskelet, houten gevelbekleding',
    soort: 'wand',
    uitleg: 'Houtskelet met isolatie tussen de stijlen, leidingspouw binnen, staande planken op latten buiten.',
    lagen: [
      ...hsbBinnen(),
      { naam: 'Winddichte folie', materiaal: 'gevelfolie', dikte: 0.5, rol: 'folie' },
      { naam: 'Latten met luchtspouw', materiaal: 'vuren', dikte: 28, rol: 'latten', hout: { breedte: 45, hoh: 600 } },
      { naam: 'Staande gevelplanken', materiaal: 'gevelplanken', dikte: 21, rol: 'afwerking_buiten' },
    ],
    herkomst: HSB_HERKOMST,
  },
  hsb_steenstrips: {
    naam: 'Buitenwand in houtskelet, steenstrips',
    soort: 'wand',
    uitleg: 'Zelfde houtskelet; buiten een plaat op staande latten met steenstrips erop.',
    lagen: [
      ...hsbBinnen(),
      { naam: 'Winddichte folie', materiaal: 'gevelfolie', dikte: 0.5, rol: 'folie' },
      { naam: 'Staande latten met luchtspouw', materiaal: 'vuren', dikte: 28, rol: 'latten', hout: { breedte: 45, hoh: 600, richting: 'mee' } },
      { naam: 'Draagplaat', materiaal: 'cementplaat', dikte: 12, rol: 'plaat' },
      { naam: 'Steenstrips', materiaal: 'steenstrips', dikte: 20, rol: 'afwerking_buiten' },
    ],
    herkomst: HSB_HERKOMST,
  },
  hsb_pleister: {
    naam: 'Buitenwand in houtskelet, sierpleister',
    soort: 'wand',
    uitleg: 'Zelfde houtskelet; buiten een pleisterdragende isolatieplaat met sierpleister.',
    lagen: [
      ...hsbBinnen(),
      { naam: 'Pleisterdragende isolatieplaat', materiaal: 'houtvezelplaat', dikte: 60, rol: 'isolatie' },
      { naam: 'Sierpleister', materiaal: 'sierpleister', dikte: 8, rol: 'afwerking_buiten' },
    ],
    herkomst: HSB_HERKOMST,
  },
  spouwmuur: {
    naam: 'Gemetselde spouwmuur',
    soort: 'wand',
    uitleg: 'Dragend binnenblad in snelbouwsteen, isolatie in de spouw, gevelsteen buiten.',
    lagen: [
      { naam: 'Binnenpleister', materiaal: 'binnenpleister', dikte: 12, rol: 'afwerking_binnen' },
      { naam: 'Binnenspouwblad', materiaal: 'snelbouwsteen', dikte: 140, rol: 'massief' },
      { naam: 'Spouwisolatie', materiaal: 'isolatieplaat', dikte: 120, rol: 'isolatie' },
      { naam: 'Luchtspouw', materiaal: '', dikte: 30, rol: 'spouw' },
      { naam: 'Gevelsteen', materiaal: 'gevelsteen', dikte: 90, rol: 'afwerking_buiten' },
    ],
    herkomst: algemeen,
  },
  binnenwand_hsb: {
    naam: 'Binnenwand in houtskelet',
    soort: 'wand',
    uitleg: 'Lichte scheidingswand: houten stijlen met isolatie, aan elke kant een gipsplaat.',
    lagen: [
      { naam: 'Gipsplaat', materiaal: 'gipsplaat', dikte: 12.5, rol: 'afwerking_binnen' },
      { naam: 'Houtskelet met isolatie', materiaal: 'vuren', dikte: 89, rol: 'skelet', hout: { breedte: 38, hoh: 600, vulling: 'minerale_wol' } },
      { naam: 'Gipsplaat', materiaal: 'gipsplaat', dikte: 12.5, rol: 'afwerking_binnen' },
    ],
    herkomst: uitOnderzoek('hoofdstuk 2.3: stijlen 38 × 89 mm om de 40 of 60 cm [H1][H2]. De gipsplaten en de isolatie: algemene kennis.'),
  },
  plat_dak_warm: {
    naam: 'Plat dak op houten roostering (warm dak)',
    soort: 'dak',
    uitleg: 'De isolatie ligt bovenop de dakplaat, de roostering blijft warm en droog. Zonder afschot getekend.',
    lagen: [
      { naam: 'Plafond in gipsplaat', materiaal: 'gipsplaat', dikte: 12.5, rol: 'afwerking_binnen' },
      { naam: 'Plafondlatten', materiaal: 'vuren', dikte: 22, rol: 'latten', hout: { breedte: 45, hoh: 400 } },
      { naam: 'Houten roostering', materiaal: 'vuren', dikte: 220, rol: 'skelet', hout: roostering },
      { naam: 'Dakplaat in OSB', materiaal: 'osb', dikte: 18, rol: 'plaat' },
      { naam: 'Dampscherm', materiaal: 'dampscherm', dikte: 0.4, rol: 'folie' },
      { naam: 'Dakisolatie', materiaal: 'isolatieplaat', dikte: 140, rol: 'isolatie' },
      { naam: 'Dakbedekking', materiaal: 'epdm', dikte: 1.2, rol: 'afwerking_buiten' },
    ],
    herkomst: algemeen,
  },
  hellend_dak_pannen: {
    naam: 'Hellend dak met kepers en dakpannen',
    soort: 'dak',
    uitleg: 'Kepers (of spantbenen) met isolatie ertussen, onderdak, tengellatten, panlatten en pannen.',
    lagen: [
      { naam: 'Gipsplaat', materiaal: 'gipsplaat', dikte: 12.5, rol: 'afwerking_binnen' },
      { naam: 'Latten', materiaal: 'vuren', dikte: 22, rol: 'latten', hout: { breedte: 45, hoh: 400 } },
      { naam: 'Dampscherm', materiaal: 'dampscherm', dikte: 0.2, rol: 'folie' },
      { naam: 'Kepers met isolatie', materiaal: 'vuren', dikte: 180, rol: 'skelet', hout: { breedte: 50, hoh: 450, vulling: 'minerale_wol' } },
      { naam: 'Onderdak', materiaal: 'onderdak', dikte: 0.5, rol: 'folie' },
      { naam: 'Tengellatten', materiaal: 'vuren', dikte: 22, rol: 'latten', hout: { breedte: 38, hoh: 450, richting: 'mee' } },
      { naam: 'Panlatten', materiaal: 'vuren', dikte: 28, rol: 'latten', hout: { breedte: 38, hoh: 340 } },
      { naam: 'Dakpannen', materiaal: 'dakpannen', dikte: 40, rol: 'afwerking_buiten' },
    ],
    herkomst: uitOnderzoek(
      'hoofdstuk 2.3 en 2.6: de lagen van een hellend dak [H12], keper 50 mm breed [H19], kepers om de 45 cm (in het onderzoek zelf «eigen kennis, te bevestigen»). '
      + 'De hoogte van de keper, de latten, de latafstand en de pannen: algemene kennis.',
    ),
  },
  vloer_volle_grond: {
    naam: 'Vloer op volle grond',
    soort: 'vloer',
    uitleg: 'Betonplaat op de grond, isolatie, dekvloer en tegels.',
    lagen: [
      { naam: 'Betonplaat', materiaal: 'beton', dikte: 150, rol: 'massief' },
      { naam: 'Vloerisolatie', materiaal: 'isolatieplaat', dikte: 100, rol: 'isolatie' },
      { naam: 'Folie', materiaal: 'pe_folie', dikte: 0.2, rol: 'folie' },
      { naam: 'Dekvloer', materiaal: 'dekvloer', dikte: 70, rol: 'massief' },
      { naam: 'Vloertegels', materiaal: 'vloertegels', dikte: 10, rol: 'afwerking_binnen' },
    ],
    herkomst: algemeen,
  },
  verdiepingsvloer_hout: {
    naam: 'Verdiepingsvloer op houten roostering',
    soort: 'vloer',
    uitleg: 'Houten balken met isolatie ertussen, een plaat erop met parket, eronder een plafond op latten.',
    lagen: [
      { naam: 'Plafond in gipsplaat', materiaal: 'gipsplaat', dikte: 12.5, rol: 'afwerking_binnen' },
      { naam: 'Plafondlatten', materiaal: 'vuren', dikte: 22, rol: 'latten', hout: { breedte: 45, hoh: 400 } },
      { naam: 'Houten roostering met isolatie', materiaal: 'vuren', dikte: 220, rol: 'skelet', hout: { ...roostering, vulling: 'minerale_wol' } },
      { naam: 'Vloerplaat in OSB', materiaal: 'osb', dikte: 18, rol: 'plaat' },
      { naam: 'Parket', materiaal: 'parket', dikte: 15, rol: 'afwerking_binnen' },
    ],
    herkomst: algemeen,
  },
};
