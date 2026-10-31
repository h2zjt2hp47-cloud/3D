/**
 * Voorbeeldproduct: kast op maat (meubelmaker / schrijnwerker).
 *
 * Dit is een DEMO-model om de motor te testen. Maten, regels en prijzen zijn
 * plausibel maar niet afgestemd met een echte klant. Dat gebeurt in fase 0.2
 * met de pilootklant (zie docs/fase0-productkennis-meubels.md).
 */
import type { Prijslijst, ProductModel } from '../src/index.js';

export const maatkast: ProductModel = {
  code: 'MAATKAST',
  naam: 'Kast op maat',
  versie: 1,
  stappen: [
    { code: 'afmetingen', label: 'Afmetingen' },
    { code: 'indeling', label: 'Indeling' },
    { code: 'afwerking', label: 'Afwerking' },
    { code: 'opties', label: 'Opties' },
  ],
  kenmerken: [
    { code: 'breedte', label: 'Breedte', stap: 'afmetingen', type: 'getal', eenheid: 'mm', min: 300, max: 3000, stapgrootte: 1, standaard: 1200 },
    { code: 'hoogte', label: 'Hoogte', stap: 'afmetingen', type: 'getal', eenheid: 'mm', min: 400, max: 2700, stapgrootte: 1, standaard: 2000 },
    {
      code: 'diepte', label: 'Diepte', stap: 'afmetingen', type: 'getal', eenheid: 'mm',
      min: 'als(deurtype = "schuifdeuren"; 450; 250)', max: 700, stapgrootte: 1, standaard: 600,
      helptekst: 'Bij schuifdeuren is minstens 450 mm nodig voor de rails.',
    },
    { code: 'vakken', label: 'Aantal vakken (verticaal)', stap: 'indeling', type: 'getal', min: 1, max: 8, stapgrootte: 1, standaard: 2 },
    { code: 'legplanken', label: 'Legplanken per vak', stap: 'indeling', type: 'getal', min: 0, max: 12, stapgrootte: 1, standaard: 4 },
    {
      code: 'deurtype', label: 'Deuren', stap: 'indeling', type: 'keuze', standaard: 'draaideuren',
      keuzes: [
        { code: 'geen', label: 'Open kast (geen deuren)' },
        { code: 'draaideuren', label: 'Draaideuren' },
        { code: 'schuifdeuren', label: 'Schuifdeuren', beschikbaarAls: 'breedte >= 1000', nietBeschikbaarReden: 'pas vanaf 1000 mm breedte' },
      ],
    },
    {
      code: 'materiaal', label: 'Materiaal', stap: 'afwerking', type: 'keuze', standaard: 'melamine_wit',
      keuzes: [
        { code: 'melamine_wit', label: 'Melamine wit', eigenschappen: { plaat: 'MEL-WIT-18', kleur: '#f4f2ee', kant: 'ABS-WIT-1', dikte: 18 } },
        { code: 'melamine_eik', label: 'Melamine eikdecor', eigenschappen: { plaat: 'MEL-EIK-18', kleur: '#c8a27a', kant: 'ABS-EIK-1', dikte: 18 } },
        { code: 'mdf_gelakt', label: 'MDF gelakt (RAL naar keuze)', eigenschappen: { plaat: 'MDF-LAK-19', kleur: '#e3e0d8', kant: '', dikte: 19 } },
        { code: 'fineer_eik', label: 'Eikfineer', eigenschappen: { plaat: 'FIN-EIK-19', kleur: '#b88a5a', kant: 'FIN-KANT-EIK', dikte: 19 } },
      ],
    },
    {
      code: 'greep', label: 'Greep', stap: 'afwerking', type: 'keuze', standaard: 'knop',
      zichtbaarAls: 'deurtype <> "geen"',
      keuzes: [
        { code: 'greeploos', label: 'Greeploos (push-to-open)', beschikbaarAls: 'deurtype = "draaideuren"', nietBeschikbaarReden: 'alleen bij draaideuren', eigenschappen: { artikel: 'BES-PUSH' } },
        { code: 'knop', label: 'Knop', eigenschappen: { artikel: 'GRP-KNOP' } },
        { code: 'lijstgreep', label: 'Lijstgreep', eigenschappen: { artikel: 'GRP-LIJST' } },
      ],
    },
    { code: 'plint', label: 'Plint', stap: 'opties', type: 'janee', standaard: true },
    { code: 'montage', label: 'Montage ter plaatse', stap: 'opties', type: 'janee', standaard: true },
  ],
  afgeleid: [
    { code: 't', label: 'Plaatdikte', formule: 'materiaal_dikte' },
    { code: 'plinthoogte', formule: 'als(plint; 80; 0)' },
    { code: 'binnenbreedte', formule: 'breedte - 2 * t' },
    { code: 'binnenhoogte', formule: 'hoogte - 2 * t - plinthoogte' },
    { code: 'vakbreedte', formule: '(binnenbreedte - (vakken - 1) * t) / vakken' },
    {
      code: 'aantal_deuren',
      formule: 'als(deurtype = "draaideuren"; naarboven(breedte / 600; 1); als(deurtype = "schuifdeuren"; als(breedte <= 2400; 2; 3); 0))',
    },
    {
      code: 'deurbreedte',
      formule: 'als(aantal_deuren > 0; als(deurtype = "schuifdeuren"; (breedte + 40) / aantal_deuren; breedte / aantal_deuren - 3); 0)',
    },
    { code: 'deurhoogte', formule: 'hoogte - plinthoogte - 3' },
    { code: 'scharnieren_per_deur', formule: 'als(deurhoogte <= 900; 2; als(deurhoogte <= 1600; 3; als(deurhoogte <= 2200; 4; 5)))' },
    { code: 'aantal_legplanken', formule: 'vakken * legplanken' },
    {
      code: 'kantlengte',
      label: 'Totale lengte kantenband (mm)',
      formule:
        '2 * hoogte + 2 * binnenbreedte + (vakken - 1) * binnenhoogte + aantal_legplanken * vakbreedte + aantal_deuren * 2 * (deurhoogte + deurbreedte) + als(plint; breedte; 0)',
    },
    { code: 'aantal_panelen', formule: '4 + (vakken - 1) + aantal_legplanken + aantal_deuren + als(plint; 1; 0)' },
  ],
  regels: [
    {
      code: 'vak_te_smal', ernst: 'fout', als: 'vakbreedte < 150',
      melding: 'De vakken worden smaller dan 150 mm. Verminder het aantal vakken of maak de kast breder.',
    },
    {
      code: 'legplank_doorbuiging', ernst: 'waarschuwing', als: 'vakbreedte > 900 en legplanken > 0',
      melding: 'Legplanken breder dan 900 mm kunnen doorbuigen. Overweeg een extra vak.',
    },
    {
      code: 'draaideur_te_hoog', ernst: 'fout', als: 'deurtype = "draaideuren" en deurhoogte > 2400',
      melding: 'Draaideuren hoger dan 2400 mm zijn niet mogelijk. Kies schuifdeuren of verlaag de kast.',
    },
    {
      code: 'hoog_zonder_montage', ernst: 'waarschuwing', als: 'hoogte > 2400 en niet montage',
      melding: 'Kasten hoger dan 2,4 m monteren we best ter plaatse.',
    },
  ],
  stuklijst: [
    { code: 'zijpanelen', omschrijving: 'Zijpaneel', artikel: 'materiaal_plaat', eenheid: 'm2', aantal: '2', lengte: 'hoogte', breedte: 'diepte', zaaglijst: true },
    { code: 'boven_onder', omschrijving: 'Boven- en onderplaat', artikel: 'materiaal_plaat', eenheid: 'm2', aantal: '2', lengte: 'binnenbreedte', breedte: 'diepte', zaaglijst: true },
    { code: 'tussenschotten', omschrijving: 'Tussenschot', artikel: 'materiaal_plaat', eenheid: 'm2', aantal: 'vakken - 1', lengte: 'binnenhoogte', breedte: 'diepte', zaaglijst: true },
    { code: 'legplanken', omschrijving: 'Legplank', artikel: 'materiaal_plaat', eenheid: 'm2', aantal: 'aantal_legplanken', lengte: 'vakbreedte - 2', breedte: 'diepte - 20', zaaglijst: true },
    { code: 'plint', omschrijving: 'Plint', artikel: 'materiaal_plaat', eenheid: 'm2', aantal: '1', lengte: 'binnenbreedte', breedte: 'plinthoogte', als: 'plint', zaaglijst: true },
    { code: 'deuren', omschrijving: 'Deur', artikel: 'materiaal_plaat', eenheid: 'm2', aantal: 'aantal_deuren', lengte: 'deurhoogte', breedte: 'deurbreedte', zaaglijst: true },
    { code: 'rugwand', omschrijving: 'Rugwand HDF 3 mm', artikel: '"HDF-3"', eenheid: 'm2', aantal: '1', lengte: 'hoogte - plinthoogte', breedte: 'breedte', zaaglijst: true },
    { code: 'kantenband', omschrijving: 'Kantenband', artikel: 'materiaal_kant', eenheid: 'lm', aantal: '1', lengte: 'kantlengte', als: 'materiaal_kant <> ""' },
    { code: 'scharnieren', omschrijving: 'Scharnier 110° softclose', artikel: '"BES-SCH-110"', eenheid: 'stuk', aantal: 'aantal_deuren * scharnieren_per_deur', als: 'deurtype = "draaideuren"' },
    { code: 'schuifsysteem', omschrijving: 'Schuifdeursysteem (set)', artikel: '"BES-SCHUIF-SET"', eenheid: 'stuk', aantal: '1', als: 'deurtype = "schuifdeuren"' },
    { code: 'schuifrail', omschrijving: 'Rail boven en onder', artikel: '"BES-RAIL"', eenheid: 'lm', aantal: '2', lengte: 'breedte', als: 'deurtype = "schuifdeuren"' },
    { code: 'grepen', omschrijving: 'Greep', artikel: 'greep_artikel', eenheid: 'stuk', aantal: 'aantal_deuren', als: 'deurtype <> "geen"' },
    { code: 'legplankdragers', omschrijving: 'Legplankdrager', artikel: '"BES-LPD"', eenheid: 'stuk', aantal: 'aantal_legplanken * 4' },
    { code: 'verbindingen', omschrijving: 'Verbindingsbeslag', artikel: '"BES-VERB"', eenheid: 'stuk', aantal: '8 + (vakken - 1) * 4' },
    {
      code: 'werkplaats', omschrijving: 'Werkplaats (zagen, kanten, boren)', artikel: '"ARB-WERKPLAATS"', eenheid: 'uur',
      aantal: 'naarboven(1 + 0.2 * aantal_panelen + als(materiaal = "fineer_eik"; 1.5; 0); 0.25)',
    },
    {
      code: 'montage', omschrijving: 'Montage ter plaatse', artikel: '"ARB-MONTAGE"', eenheid: 'uur',
      aantal: 'naarboven(1 + breedte / 1000 + aantal_deuren * 0.25; 0.5)', als: 'montage',
    },
  ],
  tekening: {
    titel: 'Vooraanzicht (mm)',
    eenheid: 'mm',
    vormen: [
      { code: 'zijpaneel_links', x: '0', y: '0', breedte: 't', hoogte: 'hoogte', vulling: 'materiaal_kleur' },
      { code: 'zijpaneel_rechts', x: 'breedte - t', y: '0', breedte: 't', hoogte: 'hoogte', vulling: 'materiaal_kleur' },
      { code: 'bovenplaat', x: 't', y: '0', breedte: 'binnenbreedte', hoogte: 't', vulling: 'materiaal_kleur' },
      { code: 'onderplaat', x: 't', y: 'hoogte - plinthoogte - t', breedte: 'binnenbreedte', hoogte: 't', vulling: 'materiaal_kleur' },
      { code: 'plint', als: 'plint', x: 't', y: 'hoogte - plinthoogte', breedte: 'binnenbreedte', hoogte: 'plinthoogte', vulling: '"#8c8a84"' },
      { code: 'tussenschot', herhaal: 'vakken - 1', x: 't + (i + 1) * vakbreedte + i * t', y: 't', breedte: 't', hoogte: 'binnenhoogte', vulling: 'materiaal_kleur' },
      {
        code: 'legplank', herhaal: 'aantal_legplanken',
        x: 't + naarbeneden(i / legplanken; 1) * (vakbreedte + t)',
        y: 't + (rest(i; legplanken) + 1) * binnenhoogte / (legplanken + 1) - t / 2',
        breedte: 'vakbreedte', hoogte: 't', vulling: 'materiaal_kleur',
      },
      {
        code: 'deur', herhaal: 'aantal_deuren',
        x: 'als(deurtype = "schuifdeuren"; i * (breedte - deurbreedte) / (aantal_deuren - 1); i * breedte / aantal_deuren + 1.5)',
        y: '1.5', breedte: 'deurbreedte', hoogte: 'deurhoogte', vulling: '"rgba(255,255,255,0.45)"',
      },
      {
        code: 'greep', herhaal: 'aantal_deuren', als: 'deurtype <> "geen" en greep <> "greeploos"',
        x: 'als(deurtype = "schuifdeuren"; i * (breedte - deurbreedte) / (aantal_deuren - 1); i * breedte / aantal_deuren) + als(rest(i; 2) = 0; deurbreedte - 60; 40)',
        y: 'deurhoogte / 2 - als(greep = "knop"; 12; 90)',
        breedte: 'als(greep = "knop"; 24; 14)', hoogte: 'als(greep = "knop"; 24; 180)', vulling: '"#2b2a26"', afronding: '6',
      },
    ],
    maatlijnen: [
      { code: 'breedte', x1: '0', y1: '0', x2: 'breedte', y2: '0', afstand: '70' },
      { code: 'hoogte', x1: 'breedte', y1: '0', x2: 'breedte', y2: 'hoogte', afstand: '70' },
    ],
  },
  prijs: { opslagProcent: 40, minimumPrijs: 250, btwProcent: 21 },
};

/** Demo-prijslijst (kostprijzen excl. btw). In productie komt dit uit Missing Link of uit eigen beheer. */
export const demoPrijslijst: Prijslijst = Object.fromEntries(
  (
    [
      ['MEL-WIT-18', 'Melamine wit 18 mm', 'm2', 11.5, 15],
      ['MEL-EIK-18', 'Melamine eikdecor 18 mm', 'm2', 15.9, 15],
      ['MDF-LAK-19', 'MDF 19 mm gelakt', 'm2', 54, 15],
      ['FIN-EIK-19', 'Eikfineer 19 mm', 'm2', 68, 20],
      ['HDF-3', 'HDF 3 mm', 'm2', 4.2, 10],
      ['ABS-WIT-1', 'ABS-kantenband wit 1 mm', 'lm', 0.45, 10],
      ['ABS-EIK-1', 'ABS-kantenband eikdecor 1 mm', 'lm', 0.85, 10],
      ['FIN-KANT-EIK', 'Fineerkant eik', 'lm', 1.6, 10],
      ['BES-SCH-110', 'Scharnier 110° softclose', 'stuk', 3.1, 0],
      ['BES-PUSH', 'Push-to-open', 'stuk', 6.4, 0],
      ['GRP-KNOP', 'Knop', 'stuk', 3.8, 0],
      ['GRP-LIJST', 'Lijstgreep', 'stuk', 8.9, 0],
      ['BES-SCHUIF-SET', 'Schuifdeursysteem', 'stuk', 78, 0],
      ['BES-RAIL', 'Schuifdeurrail', 'lm', 16.5, 0],
      ['BES-LPD', 'Legplankdrager', 'stuk', 0.12, 0],
      ['BES-VERB', 'Verbindingsbeslag', 'stuk', 0.35, 0],
      ['ARB-WERKPLAATS', 'Werkplaatsuur', 'uur', 52, 0],
      ['ARB-MONTAGE', 'Montage-uur', 'uur', 58, 0],
    ] as const
  ).map(([code, omschrijving, eenheid, kostprijs, verliesProcent]) => [
    code,
    { code, omschrijving, eenheid, kostprijs, verliesProcent },
  ]),
);
