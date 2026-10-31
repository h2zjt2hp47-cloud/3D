/**
 * Voorbeeldproduct: sofa op maat PER CM (zitmeubelen, bv. Corneille & Silence).
 *
 * DEMO: modellen, maten, stofgroepen, stofverbruik en ALLE PRIJZEN ZIJN VERZONNEN.
 * Het echte model wordt in fase 0.2 met de klant opgebouwd.
 *
 * Wat dit voorbeeld toont:
 * - opstellingen: recht, chaise longue links/rechts, hoeksofa links/rechts, met maten per cm;
 * - lijstprijs uit prijstabellen (breedte × stofgroep), per 10 cm-klasse naar boven afgerond;
 * - eigen stof (COM) en eigen leder (COL = COM + 10 %);
 * - contraststof voor de zitkussens: hoogste stofgroep + 5 %;
 * - stofverbruik = basisverbruik × factor patroonrapport × factor rolbreedte;
 * - een 2D-bovenaanzicht met maatlijnen in de stofkleur.
 */
import type { Keuzewaarde, Prijslijst, Prijstabel, ProductModel } from '../src/index.js';

const STOFGROEPEN = ['A', 'B', 'C', 'EIGEN'];

/** Stoffen: groep (prijs), groepnr (rangorde), kleur (tekening), rapport (cm), rolbreedte (cm), artikel (stuklijst). */
const stoffen: Keuzewaarde[] = [
  { code: 'katoen_naturel', label: 'Katoen Naturel', eigenschappen: { groep: 'A', groepnr: 1, kleur: '#e9e2d3', rapport: 0, rolbreedte: 140, artikel: 'STOF-KAT', toeslag_pct: 0 } },
  { code: 'linnen_ficelle', label: 'Linnen Ficelle', eigenschappen: { groep: 'B', groepnr: 2, kleur: '#c9b48f', rapport: 0, rolbreedte: 140, artikel: 'STOF-LIN', toeslag_pct: 0 } },
  { code: 'linnen_travertin', label: 'Linnen Travertin', eigenschappen: { groep: 'B', groepnr: 2, kleur: '#d8d2c6', rapport: 0, rolbreedte: 140, artikel: 'STOF-LIN', toeslag_pct: 0 } },
  { code: 'linnen_brume', label: 'Linnen Brume', eigenschappen: { groep: 'B', groepnr: 2, kleur: '#a9b3a6', rapport: 0, rolbreedte: 140, artikel: 'STOF-LIN', toeslag_pct: 0 } },
  { code: 'boucle_belize', label: 'Bouclé Belize', eigenschappen: { groep: 'C', groepnr: 3, kleur: '#ece6da', rapport: 0, rolbreedte: 140, artikel: 'STOF-BOU', toeslag_pct: 0 } },
  { code: 'jacquard_ruit', label: 'Jacquard ruit (patroon 32 cm)', eigenschappen: { groep: 'C', groepnr: 3, kleur: '#b9a58a', rapport: 32, rolbreedte: 140, artikel: 'STOF-JAC', toeslag_pct: 0 } },
];
const eigenMateriaal: Keuzewaarde[] = [
  {
    code: 'eigen_stof', label: 'Eigen stof van de klant (COM)',
    eigenschappen: { groep: 'EIGEN', groepnr: 9, kleur: '#dcdcdc', rapport: 0, rolbreedte: 140, artikel: '', toeslag_pct: 0 },
    beschikbaarAls: 'niet afneembare_hoezen', nietBeschikbaarReden: 'niet combineerbaar met afneembare hoezen',
  },
  {
    code: 'eigen_leder', label: 'Eigen leder van de klant (COL)',
    eigenschappen: { groep: 'EIGEN', groepnr: 9, kleur: '#8a6a4f', rapport: 0, rolbreedte: 140, artikel: '', toeslag_pct: 10 },
    beschikbaarAls: 'niet afneembare_hoezen', nietBeschikbaarReden: 'niet combineerbaar met afneembare hoezen',
  },
];

/** Bouwt een prijstabel per 10 cm: startprijs per stofgroep + meerprijs per 10 cm. */
function tabelPer10cm(code: string, label: string, van: number, tot: number, start: number[], per10: number[]): Prijstabel {
  const rijen: number[] = [];
  for (let r = van; r <= tot; r += 10) rijen.push(r);
  return {
    code, label, rijen, kolommen: STOFGROEPEN,
    waarden: rijen.map((r) => start.map((s, k) => s + ((r - van) / 10) * per10[k]!)),
  };
}

export const sofa: ProductModel = {
  code: 'SOFA',
  naam: 'Sofa op maat',
  versie: 2,
  maateenheid: 'cm',
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
        { code: 'strak', label: 'Strakke arm', eigenschappen: { arm: 18, factor: 1 } },
        { code: 'rond', label: 'Ronde arm', eigenschappen: { arm: 24, factor: 1.06 } },
      ],
    },
    {
      code: 'opstelling', label: 'Opstelling', stap: 'model', type: 'keuze', standaard: 'recht',
      keuzes: [
        { code: 'recht', label: 'Rechte sofa', eigenschappen: { soort: 'recht', zijde: '', min: 140, max: 340 } },
        { code: 'chaise_links', label: 'Met chaise longue links', eigenschappen: { soort: 'chaise', zijde: 'links', min: 220, max: 340 } },
        { code: 'chaise_rechts', label: 'Met chaise longue rechts', eigenschappen: { soort: 'chaise', zijde: 'rechts', min: 220, max: 340 } },
        { code: 'hoek_links', label: 'Hoeksofa links', eigenschappen: { soort: 'hoek', zijde: 'links', min: 220, max: 360 } },
        { code: 'hoek_rechts', label: 'Hoeksofa rechts', eigenschappen: { soort: 'hoek', zijde: 'rechts', min: 220, max: 360 } },
      ],
    },
    {
      code: 'breedte', label: 'Breedte', stap: 'maat', type: 'getal', eenheid: 'cm',
      min: 'opstelling_min', max: 'opstelling_max', stapgrootte: 1, standaard: 230,
      helptekst: 'Op maat per cm. De prijs volgt de volgende 10 cm-klasse.',
    },
    {
      code: 'zijlengte', label: 'Lengte chaise longue / hoekzijde', stap: 'maat', type: 'getal', eenheid: 'cm',
      zichtbaarAls: 'opstelling_soort <> "recht"',
      min: 'als(opstelling_soort = "chaise"; 150; 180)', max: 'als(opstelling_soort = "chaise"; 190; 300)',
      stapgrootte: 1, standaard: 180,
    },
    {
      code: 'zitdiepte', label: 'Zitdiepte', stap: 'maat', type: 'keuze', standaard: 'standaard',
      keuzes: [
        { code: 'standaard', label: 'Standaard (totale diepte 95 cm)', eigenschappen: { diepte: 95, factor: 1 } },
        { code: 'diep', label: 'Diep (totale diepte 105 cm)', eigenschappen: { diepte: 105, factor: 1.08 } },
      ],
    },
    { code: 'stof', label: 'Stof', stap: 'stof', type: 'keuze', standaard: 'linnen_ficelle', keuzes: [...stoffen, ...eigenMateriaal] },
    { code: 'contrast', label: 'Zitkussens in een andere stof', stap: 'stof', type: 'janee', standaard: false },
    {
      code: 'contraststof', label: 'Stof zitkussens', stap: 'stof', type: 'keuze', standaard: 'linnen_brume',
      zichtbaarAls: 'contrast', keuzes: stoffen,
    },
    {
      code: 'comfort', label: 'Zitcomfort', stap: 'afwerking', type: 'keuze', standaard: 'veren',
      keuzes: [
        { code: 'schuim', label: 'Koudschuim (stevig)', eigenschappen: { artikel: 'VUL-SCHUIM' } },
        { code: 'veren', label: 'Pocketveren + schuim', eigenschappen: { artikel: 'VUL-VEREN' } },
        { code: 'dons', label: 'Dons-mix (zacht)', eigenschappen: { artikel: 'VUL-DONS' } },
      ],
    },
    {
      code: 'poten', label: 'Poten', stap: 'afwerking', type: 'keuze', standaard: 'eik_naturel',
      keuzes: [
        { code: 'eik_naturel', label: 'Eik naturel', eigenschappen: { artikel: 'POOT-EIK' } },
        { code: 'eik_zwart', label: 'Eik zwart gebeitst', eigenschappen: { artikel: 'POOT-EIK' } },
        { code: 'messing', label: 'Messing', beschikbaarAls: 'model = "strak"', nietBeschikbaarReden: 'alleen bij strakke arm', eigenschappen: { artikel: 'POOT-MES' } },
      ],
    },
    { code: 'afneembare_hoezen', label: 'Afneembare hoezen', stap: 'afwerking', type: 'janee', standaard: false },
    { code: 'sierkussens', label: 'Sierkussens in dezelfde stof', stap: 'afwerking', type: 'getal', min: 0, max: 8, stapgrootte: 1, standaard: 2 },
  ],
  afgeleid: [
    // --- Geometrie (cm) ---
    { code: 'soort', formule: 'opstelling_soort' },
    { code: 'zijde', formule: 'opstelling_zijde' },
    { code: 'arm', formule: 'model_arm' },
    { code: 'diepte', formule: 'zitdiepte_diepte' },
    { code: 'rug', label: 'Rugdikte', formule: '20' },
    { code: 'chaise_breedte', formule: '85' },
    { code: 'zijde_lengte', formule: 'als(soort = "recht"; diepte; zijlengte)' },
    { code: 'arm_links', formule: 'soort = "recht" of zijde = "rechts"' },
    { code: 'arm_rechts', formule: 'soort = "recht" of zijde = "links"' },
    { code: 'zit_van', formule: 'als(arm_links; arm; als(soort = "hoek"; diepte; chaise_breedte))' },
    { code: 'zit_tot', formule: 'als(arm_rechts; breedte - arm; als(soort = "hoek"; breedte - diepte; breedte - chaise_breedte))' },
    { code: 'zitbreedte', formule: 'zit_tot - zit_van' },
    { code: 'zitkussens', formule: 'max(1; naarboven(zitbreedte / 90; 1))' },
    { code: 'kussenbreedte', formule: 'zitbreedte / zitkussens' },
    { code: 'kussenkleur', formule: 'als(contrast; contraststof_kleur; stof_kleur)' },
    // --- Stofverbruik (m) ---
    {
      code: 'stof_basis', label: 'Basisverbruik bij 140 cm rolbreedte (m)',
      formule: '(breedte / 100 * 3 + als(soort = "chaise"; (zijlengte - diepte) / 100 * 2.4; 0) + als(soort = "hoek"; (zijlengte - diepte) / 100 * 3; 0)) * zitdiepte_factor * als(afneembare_hoezen; 1.08; 1) + sierkussens * 0.5',
    },
    { code: 'patroonfactor', formule: 'als(stof_rapport > 96; 1.3; tabel("patroonfactor"; stof_rapport; "factor"))' },
    { code: 'stofverbruik', label: 'Stofverbruik hoofdstof (m)', formule: 'afronden(stof_basis * als(contrast; 0.65; 1) * patroonfactor * 140 / stof_rolbreedte; 1)' },
    {
      code: 'stofverbruik_contrast', label: 'Stofverbruik contraststof (m)',
      formule: 'als(contrast; afronden(stof_basis * 0.35 * als(contraststof_rapport > 96; 1.3; tabel("patroonfactor"; contraststof_rapport; "factor")) * 140 / contraststof_rolbreedte; 1); 0)',
    },
    // --- Prijs ---
    { code: 'prijsgroep', formule: 'als(contrast en contraststof_groepnr > stof_groepnr; contraststof_groep; stof_groep)' },
    {
      code: 'basisprijs',
      formule: 'tabel("basisprijs"; breedte; prijsgroep) + als(soort = "chaise"; tabel("chaise"; zijlengte; prijsgroep); 0) + als(soort = "hoek"; tabel("hoekzijde"; zijlengte; prijsgroep); 0)',
    },
    { code: 'productie_uren', formule: '6 + breedte / 100 * 2 + als(soort = "hoek"; 4; als(soort = "chaise"; 2; 0)) + als(comfort = "dons"; 2; 0) + als(afneembare_hoezen; 3; 0) + als(contrast; 1; 0)' },
  ],
  tabellen: [
    tabelPer10cm('basisprijs', 'Basisprijs per breedte (cm) en stofgroep', 140, 360, [1590, 1790, 2050, 1450], [50, 60, 72, 40]),
    tabelPer10cm('chaise', 'Meerprijs chaise longue per lengte (cm)', 150, 190, [690, 760, 870, 620], [30, 34, 40, 25]),
    tabelPer10cm('hoekzijde', 'Meerprijs hoekzijde per lengte (cm)', 180, 300, [990, 1090, 1240, 900], [45, 50, 58, 40]),
    { code: 'sierkussen', label: 'Prijs per sierkussen', rijen: ['stuk'], kolommen: STOFGROEPEN, waarden: [[65, 75, 95, 45]] },
    {
      code: 'patroonfactor', label: 'Extra stof voor patroonrapport (rapport in cm, naar boven afgerond)',
      rijen: [0, 35, 60, 68, 96], kolommen: ['factor'], waarden: [[1], [1.1], [1.15], [1.2], [1.25]],
    },
  ],
  regels: [
    {
      code: 'zit_te_smal', ernst: 'fout', als: 'zitbreedte < 60',
      melding: 'Er blijft te weinig zitbreedte over. Maak de sofa breder.',
    },
    {
      code: 'hoekzijde_te_kort', ernst: 'fout', als: 'soort = "hoek" en zijlengte - arm - diepte < 50',
      melding: 'De hoekzijde is te kort voor een zitplaats. Verleng de hoekzijde.',
    },
    {
      code: 'levering_twee_delen', ernst: 'waarschuwing', als: 'soort = "recht" en breedte > 300',
      melding: 'Rechte sofa\'s breder dan 300 cm leveren we in twee delen.',
    },
    {
      code: 'eigen_materiaal', ernst: 'waarschuwing', als: 'stof_groep = "EIGEN"',
      melding: 'Eigen stof/leder: lever minstens het berekende stofverbruik aan. We controleren het materiaal vóór productie.',
    },
  ],
  stuklijst: [
    { code: 'frame', omschrijving: 'Frame (beuk/multiplex)', artikel: '"FRAME"', eenheid: 'lm', aantal: '1', lengte: 'breedte + als(soort = "recht"; 0; zijlengte - diepte)' },
    { code: 'vulling', omschrijving: 'Vering en vulling', artikel: 'comfort_artikel', eenheid: 'lm', aantal: '1', lengte: 'breedte + als(soort = "recht"; 0; zijlengte - diepte)' },
    { code: 'stof', omschrijving: 'Bekledingsstof', artikel: 'stof_artikel', eenheid: 'lm', aantal: '1', lengte: 'stofverbruik * 100', als: 'stof_artikel <> ""' },
    { code: 'contraststof', omschrijving: 'Stof zitkussens', artikel: 'contraststof_artikel', eenheid: 'lm', aantal: '1', lengte: 'stofverbruik_contrast * 100', als: 'contrast' },
    { code: 'poten', omschrijving: 'Poot', artikel: 'poten_artikel', eenheid: 'stuk', aantal: 'naarboven(breedte / 90; 1) * 2 + als(soort = "recht"; 0; 2)' },
    { code: 'atelier', omschrijving: 'Atelier (stofferen, naaien)', artikel: '"ARB-ATELIER"', eenheid: 'uur', aantal: 'naarboven(productie_uren; 0.5)' },
  ],
  tekening: {
    titel: 'Bovenaanzicht (cm)',
    eenheid: 'cm',
    vormen: [
      { code: 'rug', x: '0', y: '0', breedte: 'breedte', hoogte: 'rug', vulling: 'stof_kleur', afronding: '3' },
      { code: 'rug_zijde_links', als: 'soort = "hoek" en zijde = "links"', x: '0', y: 'rug', breedte: 'rug', hoogte: 'zijlengte - arm - rug', vulling: 'stof_kleur' },
      { code: 'rug_zijde_rechts', als: 'soort = "hoek" en zijde = "rechts"', x: 'breedte - rug', y: 'rug', breedte: 'rug', hoogte: 'zijlengte - arm - rug', vulling: 'stof_kleur' },
      { code: 'arm_links', als: 'arm_links', x: '0', y: '0', breedte: 'arm', hoogte: 'diepte', vulling: 'stof_kleur', afronding: 'als(model = "rond"; arm / 2; 3)' },
      { code: 'arm_rechts', als: 'arm_rechts', x: 'breedte - arm', y: '0', breedte: 'arm', hoogte: 'diepte', vulling: 'stof_kleur', afronding: 'als(model = "rond"; arm / 2; 3)' },
      { code: 'eindarm_links', als: 'soort = "hoek" en zijde = "links"', x: '0', y: 'zijlengte - arm', breedte: 'diepte', hoogte: 'arm', vulling: 'stof_kleur', afronding: 'als(model = "rond"; arm / 2; 3)' },
      { code: 'eindarm_rechts', als: 'soort = "hoek" en zijde = "rechts"', x: 'breedte - diepte', y: 'zijlengte - arm', breedte: 'diepte', hoogte: 'arm', vulling: 'stof_kleur', afronding: 'als(model = "rond"; arm / 2; 3)' },
      { code: 'zitkussen', herhaal: 'zitkussens', x: 'zit_van + i * kussenbreedte', y: 'rug', breedte: 'kussenbreedte', hoogte: 'diepte - rug', vulling: 'kussenkleur', afronding: '4' },
      { code: 'chaise_links', als: 'soort = "chaise" en zijde = "links"', x: '0', y: 'rug', breedte: 'chaise_breedte', hoogte: 'zijlengte - rug', vulling: 'kussenkleur', afronding: '4', label: '"chaise longue"' },
      { code: 'chaise_rechts', als: 'soort = "chaise" en zijde = "rechts"', x: 'breedte - chaise_breedte', y: 'rug', breedte: 'chaise_breedte', hoogte: 'zijlengte - rug', vulling: 'kussenkleur', afronding: '4', label: '"chaise longue"' },
      { code: 'hoekzit_links', als: 'soort = "hoek" en zijde = "links"', x: 'rug', y: 'rug', breedte: 'diepte - rug', hoogte: 'zijlengte - arm - rug', vulling: 'kussenkleur', afronding: '4' },
      { code: 'hoekzit_rechts', als: 'soort = "hoek" en zijde = "rechts"', x: 'breedte - diepte', y: 'rug', breedte: 'diepte - rug', hoogte: 'zijlengte - arm - rug', vulling: 'kussenkleur', afronding: '4' },
    ],
    maatlijnen: [
      { code: 'breedte', x1: '0', y1: '0', x2: 'breedte', y2: '0', afstand: '14' },
      { code: 'diepte_rechts', als: 'zijde <> "rechts"', x1: 'breedte', y1: '0', x2: 'breedte', y2: 'diepte', afstand: '14' },
      { code: 'diepte_links', als: 'zijde = "rechts"', x1: '0', y1: 'diepte', x2: '0', y2: '0', afstand: '14' },
      { code: 'zijlengte_links', als: 'soort <> "recht" en zijde = "links"', x1: '0', y1: 'zijlengte', x2: '0', y2: '0', afstand: '14' },
      { code: 'zijlengte_rechts', als: 'soort <> "recht" en zijde = "rechts"', x1: 'breedte', y1: '0', x2: 'breedte', y2: 'zijlengte', afstand: '14' },
    ],
  },
  prijs: {
    opslagProcent: 0,
    verkoopprijs:
      'basisprijs * model_factor * zitdiepte_factor * (1 + stof_toeslag_pct / 100) * als(contrast; 1.05; 1)' +
      ' + als(comfort = "dons"; 390; 0) + als(poten = "messing"; 180; 0) + als(afneembare_hoezen; 290; 0)' +
      ' + sierkussens * tabel("sierkussen"; "stuk"; prijsgroep)',
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
      ['STOF-KAT', 'Katoen', 'lm', 26, 5],
      ['STOF-LIN', 'Linnen', 'lm', 38, 5],
      ['STOF-BOU', 'Bouclé', 'lm', 55, 5],
      ['STOF-JAC', 'Jacquard', 'lm', 62, 5],
      ['POOT-EIK', 'Poot eik', 'stuk', 9, 0],
      ['POOT-MES', 'Poot messing', 'stuk', 32, 0],
      ['ARB-ATELIER', 'Atelieruur', 'uur', 48, 0],
    ] as const
  ).map(([code, omschrijving, eenheid, kostprijs, verliesProcent]) => [
    code,
    { code, omschrijving, eenheid, kostprijs, verliesProcent },
  ]),
);
