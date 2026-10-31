/**
 * Voorbeeldproduct: sofa op maat (zitmeubelen, bv. Corneille & Silence).
 *
 * DEMO: modellen, maten, stofgroepen en ALLE PRIJZEN ZIJN VERZONNEN.
 * Het echte model wordt in fase 0.2 met de klant opgebouwd.
 *
 * Toont de lijstprijs-methode: prijs = prijstabel (breedte × stofgroep) + toeslagen.
 * De stuklijst (frame, stof, schuim, uren) dient voor productie en margecontrole.
 */
import type { Prijslijst, ProductModel } from '../src/index.js';

const STOFGROEPEN = ['A', 'B', 'C', 'EIGEN'];

export const sofa: ProductModel = {
  code: 'SOFA',
  naam: 'Sofa op maat',
  versie: 1,
  stappen: [
    { code: 'model', label: 'Model' },
    { code: 'maat', label: 'Maat' },
    { code: 'stof', label: 'Stof' },
    { code: 'afwerking', label: 'Afwerking' },
  ],
  kenmerken: [
    {
      code: 'model', label: 'Model', stap: 'model', type: 'keuze', standaard: 'strak',
      keuzes: [
        { code: 'strak', label: 'Strakke arm', eigenschappen: { factor: 1 } },
        { code: 'rond', label: 'Ronde arm', eigenschappen: { factor: 1.06 } },
      ],
    },
    {
      code: 'opstelling', label: 'Opstelling', stap: 'model', type: 'keuze', standaard: '3zits',
      keuzes: [
        { code: '2zits', label: 'Tweezit', eigenschappen: { min: 1600, max: 2000, hoek: false } },
        { code: '3zits', label: 'Driezit', eigenschappen: { min: 2000, max: 2600, hoek: false } },
        { code: '4zits', label: 'Vierzit', eigenschappen: { min: 2600, max: 3200, hoek: false } },
        { code: 'hoek_links', label: 'Hoeksofa links', eigenschappen: { min: 2400, max: 3400, hoek: true } },
        { code: 'hoek_rechts', label: 'Hoeksofa rechts', eigenschappen: { min: 2400, max: 3400, hoek: true } },
      ],
    },
    {
      code: 'breedte', label: 'Breedte', stap: 'maat', type: 'getal', eenheid: 'mm',
      min: 'opstelling_min', max: 'opstelling_max', stapgrootte: 100, standaard: 2200,
      helptekst: 'Op maat per 10 cm.',
    },
    {
      code: 'hoekdiepte', label: 'Lengte hoekelement', stap: 'maat', type: 'getal', eenheid: 'mm',
      min: 1600, max: 2400, stapgrootte: 100, standaard: 1800, zichtbaarAls: 'opstelling_hoek',
    },
    {
      code: 'zitdiepte', label: 'Zitdiepte', stap: 'maat', type: 'keuze', standaard: 'standaard',
      keuzes: [
        { code: 'standaard', label: 'Standaard (60 cm)', eigenschappen: { factor: 1 } },
        { code: 'diep', label: 'Diep (70 cm)', eigenschappen: { factor: 1.08 } },
      ],
    },
    {
      code: 'stof', label: 'Stof', stap: 'stof', type: 'keuze', standaard: 'linnen_ficelle',
      keuzes: [
        { code: 'linnen_ficelle', label: 'Linnen Ficelle', eigenschappen: { groep: 'B', artikel: 'STOF-LIN' } },
        { code: 'linnen_travertin', label: 'Linnen Travertin', eigenschappen: { groep: 'B', artikel: 'STOF-LIN' } },
        { code: 'linnen_brume', label: 'Linnen Brume', eigenschappen: { groep: 'B', artikel: 'STOF-LIN' } },
        { code: 'katoen_naturel', label: 'Katoen Naturel', eigenschappen: { groep: 'A', artikel: 'STOF-KAT' } },
        { code: 'boucle_belize', label: 'Bouclé Belize', eigenschappen: { groep: 'C', artikel: 'STOF-BOU' } },
        {
          code: 'eigen_stof', label: 'Eigen stof van de klant', eigenschappen: { groep: 'EIGEN', artikel: '' },
          beschikbaarAls: 'niet afneembare_hoezen', nietBeschikbaarReden: 'niet combineerbaar met afneembare hoezen',
        },
      ],
    },
    {
      code: 'comfort', label: 'Zitcomfort', stap: 'afwerking', type: 'keuze', standaard: 'veren',
      keuzes: [
        { code: 'schuim', label: 'Koudschuim (stevig)' },
        { code: 'veren', label: 'Pocketveren + schuim' },
        { code: 'dons', label: 'Dons-mix (zacht)' },
      ],
    },
    {
      code: 'poten', label: 'Poten', stap: 'afwerking', type: 'keuze', standaard: 'eik_naturel',
      keuzes: [
        { code: 'eik_naturel', label: 'Eik naturel' },
        { code: 'eik_zwart', label: 'Eik zwart gebeitst' },
        { code: 'messing', label: 'Messing', beschikbaarAls: 'model = "strak"', nietBeschikbaarReden: 'alleen bij strakke arm' },
      ],
    },
    { code: 'afneembare_hoezen', label: 'Afneembare hoezen', stap: 'afwerking', type: 'janee', standaard: false },
    { code: 'sierkussens', label: 'Sierkussens in dezelfde stof', stap: 'afwerking', type: 'getal', min: 0, max: 8, stapgrootte: 1, standaard: 2 },
  ],
  afgeleid: [
    { code: 'hoek', formule: 'opstelling_hoek' },
    { code: 'stofverbruik', label: 'Stofverbruik (m)', formule: 'afronden(breedte / 1000 * 3.2 + als(hoek; hoekdiepte / 1000 * 2.6; 0) + sierkussens * 0.5; 1)' },
    { code: 'productie_uren', formule: '6 + breedte / 1000 * 2 + als(hoek; 4; 0) + als(comfort = "dons"; 2; 0) + als(afneembare_hoezen; 3; 0)' },
  ],
  tabellen: [
    {
      code: 'basisprijs',
      label: 'Basisprijs sofa per breedte en stofgroep (excl. btw)',
      rijen: [1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000, 3200, 3400],
      kolommen: STOFGROEPEN,
      waarden: [
        [1890, 2090, 2390, 1690],
        [1990, 2210, 2530, 1770],
        [2090, 2330, 2670, 1850],
        [2190, 2450, 2810, 1930],
        [2290, 2570, 2950, 2010],
        [2390, 2690, 3090, 2090],
        [2490, 2810, 3230, 2170],
        [2590, 2930, 3370, 2250],
        [2690, 3050, 3510, 2330],
        [2790, 3170, 3650, 2410],
      ],
    },
    {
      code: 'hoektoeslag',
      label: 'Toeslag hoekelement per lengte en stofgroep',
      rijen: [1600, 1800, 2000, 2200, 2400],
      kolommen: STOFGROEPEN,
      waarden: [
        [890, 990, 1130, 790],
        [940, 1050, 1200, 830],
        [990, 1110, 1270, 870],
        [1040, 1170, 1340, 910],
        [1090, 1230, 1410, 950],
      ],
    },
    {
      code: 'sierkussen',
      label: 'Prijs per sierkussen',
      rijen: ['stuk'],
      kolommen: STOFGROEPEN,
      waarden: [[65, 75, 95, 45]],
    },
  ],
  regels: [
    {
      code: 'hoek_te_kort', ernst: 'fout', als: 'hoek en hoekdiepte >= breedte',
      melding: 'Het hoekelement moet korter zijn dan de totale breedte.',
    },
    {
      code: 'eigen_stof_levering', ernst: 'waarschuwing', als: 'stof = "eigen_stof"',
      melding: 'Eigen stof: lever minstens het berekende stofverbruik aan; we controleren de stof vóór productie.',
    },
  ],
  stuklijst: [
    { code: 'frame', omschrijving: 'Frame (beuk/multiplex) per lopende meter', artikel: '"FRAME"', eenheid: 'lm', aantal: '1', lengte: 'breedte + als(hoek; hoekdiepte; 0)' },
    { code: 'vering', omschrijving: 'Vering en vulling', artikel: 'als(comfort = "dons"; "VUL-DONS"; als(comfort = "veren"; "VUL-VEREN"; "VUL-SCHUIM"))', eenheid: 'lm', aantal: '1', lengte: 'breedte + als(hoek; hoekdiepte; 0)' },
    { code: 'stof', omschrijving: 'Bekledingsstof', artikel: 'stof_artikel', eenheid: 'lm', aantal: '1', lengte: 'stofverbruik * 1000', als: 'stof_artikel <> ""' },
    { code: 'poten', omschrijving: 'Poot', artikel: 'als(poten = "messing"; "POOT-MES"; "POOT-EIK")', eenheid: 'stuk', aantal: 'naarboven(breedte / 900; 1) * 2 + als(hoek; 2; 0)' },
    { code: 'atelier', omschrijving: 'Atelier (stofferen, naaien)', artikel: '"ARB-ATELIER"', eenheid: 'uur', aantal: 'naarboven(productie_uren; 0.5)' },
  ],
  prijs: {
    opslagProcent: 0,
    verkoopprijs:
      '(tabel("basisprijs"; breedte; stof_groep) + als(hoek; tabel("hoektoeslag"; hoekdiepte; stof_groep); 0)) * model_factor * zitdiepte_factor' +
      ' + als(comfort = "dons"; 390; 0) + als(poten = "messing"; 180; 0) + als(afneembare_hoezen; 290; 0)' +
      ' + sierkussens * tabel("sierkussen"; "stuk"; stof_groep)',
    btwProcent: 21,
  },
};

export const sofaPrijslijst: Prijslijst = Object.fromEntries(
  (
    [
      ['FRAME', 'Frame per lm', 'lm', 145, 0],
      ['VUL-SCHUIM', 'Koudschuim per lm', 'lm', 70, 0],
      ['VUL-VEREN', 'Pocketveren + schuim per lm', 'lm', 95, 0],
      ['VUL-DONS', 'Dons-mix per lm', 'lm', 150, 0],
      ['STOF-LIN', 'Linnen', 'lm', 38, 8],
      ['STOF-KAT', 'Katoen', 'lm', 26, 8],
      ['STOF-BOU', 'Bouclé', 'lm', 55, 8],
      ['POOT-EIK', 'Poot eik', 'stuk', 9, 0],
      ['POOT-MES', 'Poot messing', 'stuk', 32, 0],
      ['ARB-ATELIER', 'Atelieruur', 'uur', 48, 0],
    ] as const
  ).map(([code, omschrijving, eenheid, kostprijs, verliesProcent]) => [
    code,
    { code, omschrijving, eenheid, kostprijs, verliesProcent },
  ]),
);
