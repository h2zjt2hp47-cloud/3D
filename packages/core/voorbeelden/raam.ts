/**
 * Voorbeeldproduct ramen & deuren: één positie in een offerte (raam, terrasdeur, voordeur of schuifraam).
 * Maten in mm. Per vak kies je de opening en de draairichting; de tekening toont de
 * openingssymbolen (zicht van binnen, de punt van de driehoek wijst naar de scharnieren).
 *
 * DEMO: prijzen, gewichten, U-waarden en grenzen zijn voorbeelden. De controles op
 * veiligheidsglas, ventilatie en EPB zijn signalen voor de verkoper (te bevestigen).
 */
import type { ConfiguratieResultaat, Prijslijst, ProductModel } from '../src/index.js';

/** Kleur van glas in tekening en 3D. */
export const GLASKLEUR = '#c5d5da';

const vakKeuzes = [
  { code: 'vast', label: 'Vast', eigenschappen: { beweegt: 0, maxb: 3000, maxh: 3000 } },
  { code: 'draai_l', label: 'Draaiend, scharnieren links', eigenschappen: { beweegt: 1, maxb: 1300, maxh: 2500 } },
  { code: 'draai_r', label: 'Draaiend, scharnieren rechts', eigenschappen: { beweegt: 1, maxb: 1300, maxh: 2500 } },
  { code: 'draaikip_l', label: 'Draai-kip, scharnieren links', eigenschappen: { beweegt: 1, maxb: 1300, maxh: 2400 } },
  { code: 'draaikip_r', label: 'Draai-kip, scharnieren rechts', eigenschappen: { beweegt: 1, maxb: 1300, maxh: 2400 } },
  {
    code: 'kip', label: 'Kip (valraam)', eigenschappen: { beweegt: 1, maxb: 1600, maxh: 1000 },
    beschikbaarAls: 'type = "raam"', nietBeschikbaarReden: 'alleen bij ramen',
  },
];

export const raamdeur: ProductModel = {
  code: 'RAAM',
  naam: 'Raam of deur',
  versie: 1,
  maateenheid: 'mm',
  stappen: [
    { code: 'type', label: 'Soort' },
    { code: 'maten', label: 'Maten' },
    { code: 'indeling', label: 'Indeling en draairichting' },
    { code: 'materiaal', label: 'Profiel, kleur en glas' },
    { code: 'opties', label: 'Zonwering en opties' },
    { code: 'statiek', label: 'Statiek (voordimensionering)' },
    { code: 'plaatsing', label: 'Plaatsing' },
  ],
  kenmerken: [
    {
      code: 'type', label: 'Soort', stap: 'type', type: 'keuze', standaard: 'raam',
      keuzes: [
        { code: 'raam', label: 'Raam', eigenschappen: { deur: false, schuif: false, minb: 400, maxb: 3600, minh: 400, maxh: 2600 } },
        { code: 'terrasdeur', label: 'Terrasdeur (openslaand)', eigenschappen: { deur: true, schuif: false, minb: 700, maxb: 3000, minh: 1900, maxh: 2700 } },
        { code: 'voordeur', label: 'Voordeur', eigenschappen: { deur: true, schuif: false, minb: 800, maxb: 1200, minh: 1900, maxh: 2700 } },
        { code: 'schuif', label: 'Schuifraam of schuifdeur', eigenschappen: { deur: true, schuif: true, minb: 1500, maxb: 6000, minh: 1000, maxh: 2800 } },
      ],
    },
    {
      code: 'ruimte', label: 'Ruimte', stap: 'type', type: 'keuze', standaard: 'leefruimte',
      helptekst: 'Komt uit de plattegrond. Bepaalt de controles (ventilatie, privacy).',
      keuzes: [
        { code: 'leefruimte', label: 'Leefruimte', eigenschappen: { droog: true } },
        { code: 'slaapkamer', label: 'Slaapkamer', eigenschappen: { droog: true } },
        { code: 'bureau', label: 'Bureau', eigenschappen: { droog: true } },
        { code: 'keuken', label: 'Keuken', eigenschappen: { droog: false } },
        { code: 'badkamer', label: 'Badkamer', eigenschappen: { droog: false } },
        { code: 'wc', label: 'Wc', eigenschappen: { droog: false } },
        { code: 'hal', label: 'Hal of nachthal', eigenschappen: { droog: false } },
        { code: 'berging', label: 'Berging of garage', eigenschappen: { droog: false } },
      ],
    },
    { code: 'verdieping', label: 'Verdieping (0 = gelijkvloers)', stap: 'type', type: 'getal', min: 0, max: 5, stapgrootte: 1, standaard: 0, helptekst: 'Komt uit de plattegrond. Op een verdieping is valbeveiliging nodig bij een lage borstwering.' },
    { code: 'breedte', label: 'Breedte (buitenmaat kader)', stap: 'maten', type: 'getal', eenheid: 'mm', min: 'type_minb', max: 'type_maxb', stapgrootte: 1, standaard: 1200 },
    { code: 'hoogte', label: 'Hoogte (buitenmaat kader)', stap: 'maten', type: 'getal', eenheid: 'mm', min: 'type_minh', max: 'type_maxh', stapgrootte: 1, standaard: 1400 },
    {
      code: 'borstwering', label: 'Borstwering (onderkant raam boven de vloer)', stap: 'maten', type: 'getal', eenheid: 'mm', min: 0, max: 2000, stapgrootte: 10, standaard: 900,
      zichtbaarAls: 'niet type_deur',
    },

    { code: 'vakken', label: 'Aantal vakken naast elkaar', stap: 'indeling', type: 'keuze', standaard: 'v1', zichtbaarAls: 'in(type; "raam"; "terrasdeur")',
      keuzes: [
        { code: 'v1', label: '1 vak', eigenschappen: { n: 1 } },
        { code: 'v2', label: '2 vakken', eigenschappen: { n: 2 } },
        { code: 'v3', label: '3 vakken', eigenschappen: { n: 3 } },
      ] },
    { code: 'vak1', label: 'Vak 1 (links)', stap: 'indeling', type: 'keuze', standaard: 'draaikip_l', zichtbaarAls: 'in(type; "raam"; "terrasdeur")', keuzes: vakKeuzes },
    { code: 'vak2', label: 'Vak 2', stap: 'indeling', type: 'keuze', standaard: 'vast', zichtbaarAls: 'in(type; "raam"; "terrasdeur") en vakken_n >= 2', keuzes: vakKeuzes },
    { code: 'vak3', label: 'Vak 3 (rechts)', stap: 'indeling', type: 'keuze', standaard: 'draaikip_r', zichtbaarAls: 'in(type; "raam"; "terrasdeur") en vakken_n >= 3', keuzes: vakKeuzes },
    { code: 'deur_draai', label: 'Scharnieren (zicht van binnen)', stap: 'indeling', type: 'keuze', standaard: 'links', zichtbaarAls: 'type = "voordeur"',
      keuzes: [{ code: 'links', label: 'Links' }, { code: 'rechts', label: 'Rechts' }] },
    { code: 'deur_naar', label: 'Deur draait', stap: 'indeling', type: 'keuze', standaard: 'binnen', zichtbaarAls: 'type = "voordeur"',
      keuzes: [{ code: 'binnen', label: 'Naar binnen' }, { code: 'buiten', label: 'Naar buiten' }] },
    { code: 'schuif_richting', label: 'Welke vleugel schuift?', stap: 'indeling', type: 'keuze', standaard: 'links', zichtbaarAls: 'type_schuif',
      keuzes: [
        { code: 'links', label: 'Linker vleugel (schuift naar rechts)' },
        { code: 'rechts', label: 'Rechter vleugel (schuift naar links)' },
        { code: 'beide', label: 'Beide vleugels' },
      ] },
    { code: 'bovenlicht', label: 'Bovenlicht', stap: 'indeling', type: 'janee', standaard: false, zichtbaarAls: 'niet type_schuif' },
    { code: 'bovenlicht_h', label: 'Hoogte bovenlicht', stap: 'indeling', type: 'getal', eenheid: 'mm', min: 250, max: 900, stapgrootte: 10, standaard: 400, zichtbaarAls: 'bovenlicht' },
    { code: 'bovenlicht_open', label: 'Bovenlicht', stap: 'indeling', type: 'keuze', standaard: 'vast', zichtbaarAls: 'bovenlicht',
      keuzes: [{ code: 'vast', label: 'Vast' }, { code: 'kip', label: 'Kip (valraam)' }] },
    { code: 'roeden', label: 'Roeden (in het glas)', stap: 'indeling', type: 'keuze', standaard: 'geen', zichtbaarAls: 'in(type; "raam"; "terrasdeur")',
      keuzes: [
        { code: 'geen', label: 'Geen' },
        { code: 'kruis', label: 'Kruisroede' },
        { code: 'liggend', label: 'Eén liggende roede' },
      ] },

    {
      code: 'profiel', label: 'Profiel', stap: 'materiaal', type: 'keuze', standaard: 'pvc',
      keuzes: [
        // e = elasticiteitsmodulus van het dragende deel (N/mm²); ix / ix_vers = traagheidsmoment tussenstijl standaard / versterkt (cm⁴). Demowaarden.
        { code: 'pvc', label: 'PVC', eigenschappen: { uf: 1.2, aanzicht: 120, kgm: 2.6, artikel: 'PROF-PVC', weken: 4, soort: 'kunststof', e: 210000, ix: 8, ix_vers: 22, drager: 'stalen versterking' } },
        { code: 'alu', label: 'Aluminium', eigenschappen: { uf: 1.7, aanzicht: 90, kgm: 3.0, artikel: 'PROF-ALU', weken: 6, soort: 'metaal', e: 70000, ix: 45, ix_vers: 120, drager: 'aluminium' } },
        { code: 'alu_hi', label: 'Aluminium hoog geïsoleerd', eigenschappen: { uf: 1.3, aanzicht: 100, kgm: 3.4, artikel: 'PROF-ALU-HI', weken: 7, soort: 'metaal', e: 70000, ix: 60, ix_vers: 150, drager: 'aluminium' } },
        { code: 'hout', label: 'Hout (meranti)', eigenschappen: { uf: 1.4, aanzicht: 110, kgm: 3.2, artikel: 'PROF-HOUT', weken: 8, soort: 'hout', e: 11000, ix: 300, ix_vers: 480, drager: 'hout' } },
        { code: 'hout_alu', label: 'Hout binnen, aluminium buiten', eigenschappen: { uf: 1.1, aanzicht: 115, kgm: 3.6, artikel: 'PROF-HOUT-ALU', weken: 9, soort: 'hout', e: 11000, ix: 320, ix_vers: 500, drager: 'hout' } },
      ],
    },
    {
      code: 'kleur_buiten', label: 'Kleur buiten', stap: 'materiaal', type: 'keuze', standaard: 'antraciet',
      keuzes: [
        { code: 'wit', label: 'Wit (RAL 9016)', eigenschappen: { kleur: '#f2f1ec', toeslag: 0 } },
        { code: 'creme', label: 'Crème (RAL 9001)', eigenschappen: { kleur: '#e9e0c9', toeslag: 8 } },
        { code: 'antraciet', label: 'Antracietgrijs (RAL 7016)', eigenschappen: { kleur: '#383e42', toeslag: 8 } },
        { code: 'zwart', label: 'Gitzwart (RAL 9005)', eigenschappen: { kleur: '#1f1f1e', toeslag: 10 } },
        { code: 'eik', label: 'Houtnerf eik (folie)', eigenschappen: { kleur: '#a8743f', toeslag: 12 }, beschikbaarAls: 'profiel = "pvc"', nietBeschikbaarReden: 'alleen bij PVC' },
        { code: 'naturel', label: 'Hout naturel (gelakt)', eigenschappen: { kleur: '#b78a5a', toeslag: 0 }, beschikbaarAls: 'profiel = "hout"', nietBeschikbaarReden: 'alleen bij hout' },
      ],
    },
    {
      code: 'kleur_binnen', label: 'Kleur binnen', stap: 'materiaal', type: 'keuze', standaard: 'wit',
      keuzes: [
        { code: 'zelfde', label: 'Zelfde als buiten', eigenschappen: { kleur: '', toeslag: 0 } },
        { code: 'wit', label: 'Wit (RAL 9016)', eigenschappen: { kleur: '#f2f1ec', toeslag: 6 } },
        { code: 'eik', label: 'Eik', eigenschappen: { kleur: '#b48a5a', toeslag: 10 } },
      ],
    },
    {
      code: 'glas', label: 'Beglazing', stap: 'materiaal', type: 'keuze', standaard: 'dubbel',
      keuzes: [
        { code: 'dubbel', label: 'Dubbel HR++', eigenschappen: { ug: 1.0, kgm2: 20, veilig: false, mat: false, artikel: 'GLAS-DUBBEL' } },
        { code: 'dubbel_gelaagd', label: 'Dubbel HR++ gelaagd (veiligheid)', eigenschappen: { ug: 1.0, kgm2: 30, veilig: true, mat: false, artikel: 'GLAS-DUBBEL-GEL' } },
        { code: 'triple', label: 'Driedubbel', eigenschappen: { ug: 0.6, kgm2: 30, veilig: false, mat: false, artikel: 'GLAS-TRIPLE' } },
        { code: 'triple_gelaagd', label: 'Driedubbel gelaagd (veiligheid)', eigenschappen: { ug: 0.6, kgm2: 40, veilig: true, mat: false, artikel: 'GLAS-TRIPLE-GEL' } },
        { code: 'mat_gelaagd', label: 'Mat gelaagd (badkamer, wc)', eigenschappen: { ug: 1.0, kgm2: 30, veilig: true, mat: true, artikel: 'GLAS-MAT-GEL' } },
        { code: 'zon_gelaagd', label: 'Zonwerend gelaagd', eigenschappen: { ug: 1.0, kgm2: 30, veilig: true, mat: false, artikel: 'GLAS-ZON-GEL' } },
      ],
    },
    {
      code: 'afstandhouder', label: 'Afstandhouder in het glas', stap: 'materiaal', type: 'keuze', standaard: 'warm',
      helptekst: 'Bepaalt het warmteverlies langs de rand van het glas (ψ). Typische waarden, te bevestigen met de glasleverancier.',
      keuzes: [
        { code: 'alu', label: 'Aluminium (ψ 0,08)', eigenschappen: { psi: 0.08, kleur: '#a9adb0', artikel: '' } },
        { code: 'rvs', label: 'Roestvrij staal (ψ 0,06)', eigenschappen: { psi: 0.06, kleur: '#8c9194', artikel: 'GLAS-RAND-RVS' } },
        { code: 'warm', label: 'Warm edge, kunststof (ψ 0,04)', eigenschappen: { psi: 0.04, kleur: '#1d1d1d', artikel: 'GLAS-RAND-WARM' } },
      ],
    },
    {
      code: 'paneel', label: 'Deurpaneel', stap: 'materiaal', type: 'keuze', standaard: 'glasstrook', zichtbaarAls: 'type = "voordeur"',
      keuzes: [
        { code: 'vlak', label: 'Vlak paneel', eigenschappen: { glas: false, artikel: 'PANEEL-VLAK' } },
        { code: 'glasstrook', label: 'Paneel met verticale glasstrook', eigenschappen: { glas: true, artikel: 'PANEEL-GLAS' } },
        { code: 'groeven', label: 'Paneel met liggende groeven', eigenschappen: { glas: false, artikel: 'PANEEL-GROEF' } },
      ],
    },
    {
      code: 'greep', label: 'Greep', stap: 'materiaal', type: 'keuze', standaard: 'trekbeugel', zichtbaarAls: 'type = "voordeur"',
      keuzes: [
        { code: 'klink', label: 'Klink en rozet', eigenschappen: { artikel: 'GREEP-KLINK' } },
        { code: 'trekbeugel', label: 'Trekbeugel 120 cm', eigenschappen: { artikel: 'GREEP-TREK' } },
        { code: 'vingerscan', label: 'Trekbeugel met vingerscan', eigenschappen: { artikel: 'GREEP-SCAN' } },
      ],
    },
    { code: 'drempel', label: 'Dorpel', stap: 'materiaal', type: 'keuze', standaard: 'standaard', zichtbaarAls: 'type_deur',
      keuzes: [{ code: 'standaard', label: 'Standaard (met aanslag)' }, { code: 'drempelloos', label: 'Drempelloos' }] },

    {
      code: 'zonwering', label: 'Zonwering', stap: 'opties', type: 'keuze', standaard: 'geen',
      keuzes: [
        { code: 'geen', label: 'Geen', eigenschappen: { kast: 0, artikel: '' } },
        { code: 'screen', label: 'Screen (zip, windvast)', eigenschappen: { kast: 150, artikel: 'ZON-SCREEN' }, beschikbaarAls: 'type <> "voordeur"', nietBeschikbaarReden: 'niet bij een voordeur' },
        { code: 'rolluik', label: 'Rolluik (aluminium)', eigenschappen: { kast: 180, artikel: 'ZON-ROLLUIK' }, beschikbaarAls: 'type <> "voordeur"', nietBeschikbaarReden: 'niet bij een voordeur' },
        { code: 'lamellen', label: 'Buitenjaloezie (lamellen)', eigenschappen: { kast: 160, artikel: 'ZON-LAMEL' }, beschikbaarAls: 'type <> "voordeur"', nietBeschikbaarReden: 'niet bij een voordeur' },
      ],
    },
    {
      code: 'screen_kleur', label: 'Kleur screendoek', stap: 'opties', type: 'keuze', standaard: 'antraciet', zichtbaarAls: 'zonwering = "screen"',
      keuzes: [
        { code: 'antraciet', label: 'Antraciet', eigenschappen: { kleur: '#3a3c3e' } },
        { code: 'grijs', label: 'Grijs', eigenschappen: { kleur: '#6f706b' } },
        { code: 'zand', label: 'Zand', eigenschappen: { kleur: '#c4b393' } },
        { code: 'wit', label: 'Gebroken wit', eigenschappen: { kleur: '#e5e2da' } },
      ],
    },
    {
      code: 'bediening', label: 'Bediening zonwering', stap: 'opties', type: 'keuze', standaard: 'motor', zichtbaarAls: 'zonwering <> "geen"',
      keuzes: [
        { code: 'manueel', label: 'Manueel' },
        { code: 'motor', label: 'Motor met schakelaar' },
        { code: 'domotica', label: 'Motor met app en zonnesensor' },
      ],
    },
    {
      code: 'vliegenraam', label: 'Vliegenraam', stap: 'opties', type: 'keuze', standaard: 'geen', zichtbaarAls: 'type <> "voordeur"',
      keuzes: [
        { code: 'geen', label: 'Geen' },
        { code: 'inzet', label: 'Inzethor (raam)', beschikbaarAls: 'type = "raam"', nietBeschikbaarReden: 'alleen bij ramen' },
        { code: 'plisse', label: 'Plissédeur (deur)', beschikbaarAls: 'type_deur', nietBeschikbaarReden: 'alleen bij deuren' },
      ],
    },
    { code: 'rooster', label: 'Ventilatierooster (zelfregelend)', stap: 'opties', type: 'janee', standaard: false, zichtbaarAls: 'type <> "voordeur"' },
    { code: 'rc2', label: 'Inbraakwerend beslag (RC2)', stap: 'opties', type: 'janee', standaard: false },
    {
      code: 'vensterbank', label: 'Vensterbank binnen', stap: 'opties', type: 'keuze', standaard: 'natuursteen', zichtbaarAls: 'niet type_deur',
      keuzes: [
        { code: 'geen', label: 'Geen', eigenschappen: { kleur: '', artikel: '', soort: '' } },
        { code: 'natuursteen', label: 'Blauwe hardsteen', eigenschappen: { kleur: '#4f565b', artikel: 'VB-STEEN', soort: 'gevel' } },
        { code: 'composiet', label: 'Composiet wit', eigenschappen: { kleur: '#f1f0ec', artikel: 'VB-COMPOSIET', soort: 'gevel' } },
        { code: 'eik', label: 'Massief eik', eigenschappen: { kleur: '#b48a5a', artikel: 'VB-EIK', soort: 'hout' } },
      ],
    },
    {
      code: 'dorpel', label: 'Dorpel buiten', stap: 'opties', type: 'keuze', standaard: 'alu', zichtbaarAls: 'niet type_deur',
      keuzes: [
        { code: 'geen', label: 'Geen (bestaande dorpel)', eigenschappen: { artikel: '' } },
        { code: 'alu', label: 'Aluminium in profielkleur', eigenschappen: { artikel: 'DORPEL-ALU' } },
        { code: 'arduin', label: 'Arduin', eigenschappen: { artikel: 'DORPEL-ARDUIN' } },
      ],
    },

    {
      code: 'winddruk', label: 'Winddruk op de gevel', stap: 'statiek', type: 'getal', eenheid: 'Pa', min: 200, max: 3000, stapgrootte: 10, standaard: 800,
      helptekst: 'Volgens NBN EN 1991-1-4 (windzone, terrein, hoogte van het gebouw). 800 Pa is een voorbeeldwaarde; laat ze per project bepalen.',
    },
    {
      code: 'doorbuiging', label: 'Toegelaten doorbuiging', stap: 'statiek', type: 'keuze', standaard: 'c',
      keuzes: [
        { code: 'c', label: 'L/300 (klasse C, isolerend glas)', eigenschappen: { k: 300 } },
        { code: 'b', label: 'L/200 (klasse B)', eigenschappen: { k: 200 } },
      ],
    },
    {
      code: 'tussenstijl', label: 'Tussenstijl / koppeling', stap: 'statiek', type: 'keuze', standaard: 'standaard', zichtbaarAls: 'heeft_stijl',
      keuzes: [
        { code: 'standaard', label: 'Standaard' },
        { code: 'versterkt', label: 'Versterkt (zwaarder profiel of versterking)' },
        { code: 'koppel', label: 'Koppelprofiel (aluminium buis, 400 cm⁴)' },
      ],
    },
    {
      code: 'situatie', label: 'Situatie', stap: 'plaatsing', type: 'keuze', standaard: 'nieuwbouw',
      keuzes: [{ code: 'nieuwbouw', label: 'Nieuwbouw' }, { code: 'renovatie', label: 'Renovatie (oud raam uitbreken)' }],
    },
    { code: 'afwerking', label: 'Dagkanten binnen afwerken', stap: 'plaatsing', type: 'janee', standaard: true, zichtbaarAls: 'situatie = "renovatie"' },
    { code: 'montage', label: 'Plaatsing door eigen ploeg', stap: 'plaatsing', type: 'janee', standaard: true },
  ],
  afgeleid: [
    { code: 'n', label: 'Aantal vakken', formule: 'als(type = "voordeur"; 1; als(type_schuif; 2; vakken_n))' },
    { code: 'borst', label: 'Borstwering (mm)', formule: 'als(type_deur; 0; borstwering)' },
    { code: 'bl', label: 'Hoogte bovenlicht (mm)', formule: 'als(niet type_schuif en bovenlicht; bovenlicht_h; 0)' },
    { code: 'f', formule: 'profiel_aanzicht / 2' },
    { code: 'overlap', formule: 'als(type_schuif; 60; 0)' },
    { code: 'vb', label: 'Breedte per vak (mm)', formule: '(breedte - 2 * f + (n - 1) * overlap) / n' },
    { code: 'stapx', formule: 'vb - overlap' },
    { code: 'vh', label: 'Hoogte vak (mm)', formule: 'hoogte - 2 * f - bl' },
    // Opening per vak (symbool in tekening en 3D).
    { code: 'op1', formule: 'als(type = "voordeur"; als(deur_draai = "links"; "draai_l"; "draai_r"); als(type_schuif; als(in(schuif_richting; "links"; "beide"); "schuif_r"; "vast"); vak1))' },
    { code: 'op2', formule: 'als(type_schuif; als(in(schuif_richting; "rechts"; "beide"); "schuif_l"; "vast"); als(n >= 2; vak2; "vast"))' },
    { code: 'op3', formule: 'als(n >= 3; vak3; "vast")' },
    { code: 'b1', formule: 'als(op1 = "vast"; 0; 1)' },
    { code: 'b2', formule: 'als(n >= 2 en op2 <> "vast"; 1; 0)' },
    { code: 'b3', formule: 'als(n >= 3 en op3 <> "vast"; 1; 0)' },
    { code: 'beweeg', label: 'Opendraaiende vleugels', formule: 'b1 + b2 + b3' },
    { code: 'n_draai', formule: 'als(in(op1; "draai_l"; "draai_r"); 1; 0) + als(n >= 2 en in(op2; "draai_l"; "draai_r"); 1; 0) + als(n >= 3 en in(op3; "draai_l"; "draai_r"); 1; 0)' },
    { code: 'n_draaikip', formule: 'als(in(op1; "draaikip_l"; "draaikip_r"); 1; 0) + als(n >= 2 en in(op2; "draaikip_l"; "draaikip_r"); 1; 0) + als(n >= 3 en in(op3; "draaikip_l"; "draaikip_r"); 1; 0)' },
    { code: 'n_kip', formule: 'als(op1 = "kip"; 1; 0) + als(n >= 2 en op2 = "kip"; 1; 0) + als(n >= 3 en op3 = "kip"; 1; 0) + als(bl > 0 en bovenlicht_open = "kip"; 1; 0)' },
    { code: 'gb', label: 'Dagmaat glas per vak, breedte (mm)', formule: 'vb - f' },
    { code: 'gh', label: 'Dagmaat glas per vak, hoogte (mm)', formule: 'vh - f' },
    // Glasmaat = falsmaat − glasspeling; falsmaat = dagmaat + 2 × glasinstand (demowaarden, per systeem te bevestigen).
    { code: 'glasinstand', formule: '14' },
    { code: 'glasspeling', formule: '8' },
    { code: 'glasmaat_b', label: 'Glasmaat per vak, breedte (mm)', formule: 'gb + 2 * glasinstand - glasspeling' },
    { code: 'glasmaat_h', label: 'Glasmaat per vak, hoogte (mm)', formule: 'gh + 2 * glasinstand - glasspeling' },
    { code: 'blglas_b', formule: 'breedte - 2 * f + 2 * glasinstand - glasspeling' },
    { code: 'blglas_h', formule: 'bl - f + 2 * glasinstand - glasspeling' },
    { code: 'glas_vak_m2', formule: 'als(type = "voordeur"; als(paneel_glas; 0.18 * gb * gh / 1000000; 0); n * gb * gh / 1000000)' },
    { code: 'glas_bl_m2', formule: 'als(bl > 0; (breedte - 2 * f) * (bl - f) / 1000000; 0)' },
    { code: 'glas_m2', label: 'Glasoppervlakte (m²)', formule: 'glas_vak_m2 + glas_bl_m2' },
    { code: 'paneel_m2', formule: 'als(type = "voordeur"; gb * gh / 1000000 - glas_vak_m2; 0)' },
    { code: 'raam_m2', label: 'Oppervlakte (m²)', formule: 'breedte * hoogte / 1000000' },
    { code: 'lg', formule: 'als(type = "voordeur"; als(paneel_glas; 2 * (0.18 * gb + gh) / 1000; 0); n * 2 * (gb + gh) / 1000) + als(bl > 0; 2 * (breedte + bl) / 1000; 0)' },
    { code: 'psi', label: 'ψ afstandhouder (W/mK)', formule: 'als(glas_m2 > 0; afstandhouder_psi; 0)' },
    { code: 'uw', label: 'Uw (W/m²K)', formule: 'afronden((glas_m2 * glas_ug + paneel_m2 * 0.8 + (raam_m2 - glas_m2 - paneel_m2) * profiel_uf + lg * psi) / raam_m2; 2)' },
    // Statische voordimensionering: tussenstijl (tussen vakken of de ontmoetingsstijl van een schuifraam) en de regel onder het bovenlicht.
    // Doorbuiging f = 5·q·L⁴ / (384·E·I) ≤ L/k  →  E·I nodig = 5·q·L³·k / 384, met q = winddruk × invloedsbreedte.
    { code: 'heeft_stijl', formule: 'type_schuif of bl > 0 of (in(type; "raam"; "terrasdeur") en n >= 2)' },
    { code: 'stijl_l', label: 'Overspanning tussenstijl (mm)', formule: 'als(type_schuif of n >= 2; vh + f; 0)' },
    { code: 'stijl_a', label: 'Invloedsbreedte tussenstijl (mm)', formule: 'als(type_schuif of n >= 2; vb; 0)' },
    { code: 'regel_l', label: 'Overspanning regel bovenlicht (mm)', formule: 'als(bl > 0; breedte - 2 * f; 0)' },
    { code: 'regel_a', formule: 'als(bl > 0; (bl + vh) / 2; 0)' },
    { code: 'ei_stijl', formule: '5 * (winddruk * stijl_a / 1000000) * stijl_l * stijl_l * stijl_l * doorbuiging_k / 384' },
    { code: 'ei_regel', formule: '5 * (winddruk * regel_a / 1000000) * regel_l * regel_l * regel_l * doorbuiging_k / 384' },
    { code: 'ei_nodig', formule: 'max(ei_stijl; ei_regel)' },
    { code: 'stijl_e', formule: 'als(tussenstijl = "koppel"; 70000; profiel_e)' },
    // Bij een schuifraam dragen de twee ontmoetingsstijlen samen.
    { code: 'i_aanwezig', label: 'Traagheidsmoment tussenstijl (cm⁴)', formule: 'als(tussenstijl = "koppel"; 400; als(tussenstijl = "versterkt"; profiel_ix_vers; profiel_ix) * als(type_schuif; 2; 1))' },
    { code: 'i_nodig', label: 'Nodig traagheidsmoment (cm⁴)', formule: 'afronden(ei_nodig / stijl_e / 10000; 1)' },
    { code: 'statiek_ok', formule: 'niet heeft_stijl of i_aanwezig >= i_nodig' },
    { code: 'stijl_lm', formule: 'als(type_schuif; vh / 1000; (n - 1) * (vh + f) / 1000) + als(bl > 0; (breedte - 2 * f) / 1000; 0)' },
    { code: 'vleugel_kg', label: 'Gewicht zwaarste vleugel (kg)', formule: 'afronden(gb * gh / 1000000 * als(type = "voordeur"; 35; glas_kgm2) + 2 * (vb + vh) / 1000 * profiel_kgm; 0)' },
    { code: 'profiel_lm', formule: '2 * (breedte + hoogte) / 1000 + beweeg * 2 * (vb + vh) / 1000 + (n - 1) * hoogte / 1000 + als(bl > 0; breedte / 1000; 0)' },
    { code: 'zon_kast', label: 'Hoogte zonweringskast (mm)', formule: 'zonwering_kast' },
    { code: 'veilig_nodig', formule: 'type_deur of borst < 850' },
    { code: 'toeslag_pct', formule: 'kleur_buiten_toeslag + kleur_binnen_toeslag' },
    { code: 'levertermijn', label: 'Levertermijn (weken)', formule: 'profiel_weken + als(toeslag_pct > 0; 1; 0) + als(zonwering <> "geen"; 1; 0) + als(type = "voordeur"; 2; 0)' },
    { code: 'montage_uren', formule: 'naarboven(1.5 + raam_m2 * 0.8 + als(type_schuif; 2; 0) + als(zonwering <> "geen"; 1.5; 0) + als(situatie = "renovatie"; 1; 0); 0.5)' },
    // Voor tekening en 3D.
    { code: 'kb', formule: 'kleur_buiten_kleur' },
    { code: 'randkleur', formule: 'als(afstandhouder_kleur <> ""; afstandhouder_kleur; "#1d1d1d")' },
    { code: 'ki', formule: 'als(kleur_binnen = "zelfde"; kleur_buiten_kleur; kleur_binnen_kleur)' },
    { code: 'profielsoort', formule: 'profiel_soort' },
    { code: 'glaskleur', formule: `als(glas_mat; "#eef1f2"; als(glas = "zon_gelaagd"; "#9fb5bd"; "${GLASKLEUR}"))` },
    { code: 'zonkleur', formule: 'als(zonwering = "screen"; screen_kleur_kleur; kleur_buiten_kleur)' },
    { code: 'vb_kleur', formule: 'als(type_deur; ""; vensterbank_kleur)' },
    { code: 'vb_soort', formule: 'als(type_deur; ""; vensterbank_soort)' },
  ],
  regels: [
    { code: 'vak1_breed', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en vb > vak1_maxb', melding: 'Vak 1 wordt te breed voor deze opening. Kies meer vakken of maak het vak vast.' },
    { code: 'vak2_breed', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en n >= 2 en vb > vak2_maxb', melding: 'Vak 2 wordt te breed voor deze opening. Kies meer vakken of maak het vak vast.' },
    { code: 'vak3_breed', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en n >= 3 en vb > vak3_maxb', melding: 'Vak 3 wordt te breed voor deze opening. Kies meer vakken of maak het vak vast.' },
    { code: 'vak1_hoog', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en vh > vak1_maxh', melding: 'Vak 1 wordt te hoog voor deze opening (kip: max 1 m hoog). Voeg een bovenlicht toe of kies een andere opening.' },
    { code: 'vak2_hoog', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en n >= 2 en vh > vak2_maxh', melding: 'Vak 2 wordt te hoog voor deze opening. Voeg een bovenlicht toe of kies een andere opening.' },
    { code: 'vak3_hoog', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en n >= 3 en vh > vak3_maxh', melding: 'Vak 3 wordt te hoog voor deze opening. Voeg een bovenlicht toe of kies een andere opening.' },
    { code: 'zwaar', ernst: 'fout', als: 'niet type_schuif en beweeg > 0 en vleugel_kg > 130', melding: 'Een draaiende vleugel wordt zwaarder dan 130 kg. Kies smallere vakken of lichter glas.' },
    { code: 'schuif_zwaar', ernst: 'fout', als: 'type_schuif en vleugel_kg > 250', melding: 'Een schuifvleugel wordt zwaarder dan 250 kg. Kies een hef-schuifsysteem (zie aanbouw) of lichter glas.' },
    {
      code: 'veiligheidsglas', ernst: 'fout', als: 'veilig_nodig en glas_m2 > 0 en niet glas_veilig',
      melding: 'Glas in een deur of lager dan 85 cm boven de vloer: gelaagd veiligheidsglas nodig (NBN S 23-002, te bevestigen).',
    },
    { code: 'valgevaar', ernst: 'waarschuwing', als: 'verdieping > 0 en (type_deur of borst < 850) en (beweeg > 0 of type_deur)', melding: 'Op de verdieping met een lage borstwering of een deur: valbeveiliging nodig (balustrade of vast glas, te bevestigen).' },
    { code: 'ventilatie', ernst: 'waarschuwing', als: 'ruimte_droog en type <> "voordeur" en niet rooster', melding: 'Droge ruimte zonder ventilatierooster: bij ventilatiesysteem C is luchttoevoer nodig (EPB, te bevestigen).' },
    { code: 'privacy', ernst: 'waarschuwing', als: 'in(ruimte; "badkamer"; "wc") en glas_m2 > 0 en niet glas_mat', melding: 'Badkamer of wc met helder glas: mat glas voor privacy?' },
    {
      code: 'statiek', ernst: 'fout', als: 'heeft_stijl en niet statiek_ok',
      melding: 'De tussenstijl buigt te ver door bij deze winddruk: kies een versterkte tussenstijl of een koppelprofiel (voordimensionering, te laten bevestigen).',
    },
    { code: 'rc2_glas', ernst: 'fout', als: 'rc2 en glas_m2 > 0 en niet glas_veilig', melding: 'Inbraakwerend (RC2) vraagt gelaagd glas.' },
    { code: 'uw', ernst: 'waarschuwing', als: 'uw > 1.5', melding: 'Uw hoger dan 1,5 W/m²K: controleer de EPB-eis (beter profiel of driedubbel glas).' },
    { code: 'screen_breed', ernst: 'fout', als: 'zonwering = "screen" en breedte > 5000', melding: 'Een screen breder dan 5 m kan niet: verdeel in twee screens.' },
    { code: 'bovenlicht_klein', ernst: 'fout', als: 'bl > 0 en vh < 400', melding: 'Na het bovenlicht blijft er te weinig hoogte over voor de vakken.' },
  ],
  stuklijst: [
    { code: 'profiel', omschrijving: 'Profielen kader en vleugels', artikel: 'profiel_artikel', eenheid: 'lm', aantal: '1', lengte: 'profiel_lm * 1000', zaaglijst: true },
    { code: 'glas', omschrijving: 'Beglazing per vak (glasmaat)', artikel: 'glas_artikel', eenheid: 'm2', aantal: 'n', lengte: 'glasmaat_b', breedte: 'glasmaat_h', als: 'type <> "voordeur"' },
    { code: 'glas_bl', omschrijving: 'Beglazing bovenlicht (glasmaat)', artikel: 'glas_artikel', eenheid: 'm2', aantal: '1', lengte: 'blglas_b', breedte: 'blglas_h', als: 'bl > 0' },
    { code: 'glas_deur', omschrijving: 'Glasstrook deurpaneel (glasmaat)', artikel: 'glas_artikel', eenheid: 'm2', aantal: '1', lengte: '0.18 * gb + 2 * glasinstand - glasspeling', breedte: 'glasmaat_h', als: 'type = "voordeur" en paneel_glas' },
    { code: 'rand', omschrijving: 'Meerprijs afstandhouder', artikel: 'afstandhouder_artikel', eenheid: 'lm', aantal: '1', lengte: 'lg * 1000', als: 'glas_m2 > 0 en afstandhouder_artikel <> ""' },
    { code: 'versterking', omschrijving: 'Versterkte tussenstijl / regel', artikel: '"VERST-STIJL"', eenheid: 'lm', aantal: '1', lengte: 'stijl_lm * 1000', als: 'heeft_stijl en tussenstijl = "versterkt"' },
    { code: 'koppel', omschrijving: 'Koppelprofiel aluminium', artikel: '"KOPPELPROFIEL"', eenheid: 'lm', aantal: '1', lengte: 'stijl_lm * 1000', als: 'heeft_stijl en tussenstijl = "koppel"' },
    { code: 'paneel', omschrijving: 'Deurpaneel', artikel: 'paneel_artikel', eenheid: 'stuk', aantal: '1', als: 'type = "voordeur"' },
    { code: 'draai', omschrijving: 'Draaibeslag', artikel: '"BES-DRAAI"', eenheid: 'stuk', aantal: 'n_draai', als: 'type <> "voordeur"' },
    { code: 'draaikip', omschrijving: 'Draai-kipbeslag', artikel: '"BES-DRAAIKIP"', eenheid: 'stuk', aantal: 'n_draaikip' },
    { code: 'kip', omschrijving: 'Kipbeslag', artikel: '"BES-KIP"', eenheid: 'stuk', aantal: 'n_kip' },
    { code: 'schuif', omschrijving: 'Schuifbeslag', artikel: '"BES-SCHUIF"', eenheid: 'stuk', aantal: 'als(schuif_richting = "beide"; 2; 1)', als: 'type_schuif' },
    { code: 'deurslot', omschrijving: 'Meerpuntsluiting deur', artikel: '"BES-DEURSLOT"', eenheid: 'stuk', aantal: '1', als: 'type_deur en niet type_schuif' },
    { code: 'greep', omschrijving: 'Greep voordeur', artikel: 'greep_artikel', eenheid: 'stuk', aantal: '1', als: 'type = "voordeur"' },
    { code: 'drempel', omschrijving: 'Drempelloze dorpel', artikel: '"DORPEL-DREMPELLOOS"', eenheid: 'lm', aantal: '1', lengte: 'breedte', als: 'type_deur en drempel = "drempelloos"' },
    { code: 'lak', omschrijving: 'Meerprijs kleur', artikel: '"LAK-TOESLAG"', eenheid: 'm2', aantal: 'toeslag_pct / 10', lengte: 'breedte', breedte: 'hoogte', als: 'toeslag_pct > 0' },
    { code: 'roeden', omschrijving: 'Roeden', artikel: '"ROEDE"', eenheid: 'lm', aantal: 'n', lengte: 'als(roeden = "kruis"; gb + gh; gb)', als: 'in(type; "raam"; "terrasdeur") en roeden <> "geen"' },
    { code: 'zonwering', omschrijving: 'Zonwering', artikel: 'zonwering_artikel', eenheid: 'm2', aantal: '1', lengte: 'breedte', breedte: 'hoogte + zon_kast', als: 'zonwering <> "geen"' },
    { code: 'motor', omschrijving: 'Motor zonwering', artikel: '"ZON-MOTOR"', eenheid: 'stuk', aantal: '1', als: 'zonwering <> "geen" en in(bediening; "motor"; "domotica")' },
    { code: 'domotica', omschrijving: 'App-bediening en zonnesensor', artikel: '"ZON-DOMOTICA"', eenheid: 'stuk', aantal: '1', als: 'zonwering <> "geen" en bediening = "domotica"' },
    { code: 'hor', omschrijving: 'Inzethor', artikel: '"HOR-INZET"', eenheid: 'm2', aantal: 'n', lengte: 'gb', breedte: 'gh', als: 'vliegenraam = "inzet"' },
    { code: 'plisse', omschrijving: 'Plissé-vliegendeur', artikel: '"HOR-PLISSE"', eenheid: 'stuk', aantal: '1', als: 'vliegenraam = "plisse"' },
    { code: 'rooster', omschrijving: 'Ventilatierooster', artikel: '"ROOSTER"', eenheid: 'lm', aantal: '1', lengte: 'breedte - 2 * f', als: 'rooster' },
    { code: 'rc2', omschrijving: 'Meerprijs inbraakwerend beslag', artikel: '"RC2-TOESLAG"', eenheid: 'stuk', aantal: 'max(1; beweeg)', als: 'rc2' },
    { code: 'vensterbank', omschrijving: 'Vensterbank binnen', artikel: 'vensterbank_artikel', eenheid: 'lm', aantal: '1', lengte: 'breedte + 100', als: 'niet type_deur en vensterbank <> "geen"' },
    { code: 'dorpel', omschrijving: 'Dorpel buiten', artikel: 'dorpel_artikel', eenheid: 'lm', aantal: '1', lengte: 'breedte + 60', als: 'niet type_deur en dorpel <> "geen"' },
    { code: 'afbraak', omschrijving: 'Uitbreken en afvoeren oud raam', artikel: '"AFBRAAK-RAAM"', eenheid: 'stuk', aantal: '1', als: 'situatie = "renovatie"' },
    { code: 'dagkant', omschrijving: 'Afwerking dagkanten binnen', artikel: '"AFW-DAGKANT"', eenheid: 'lm', aantal: '1', lengte: '2 * hoogte + breedte', als: 'situatie = "renovatie" en afwerking' },
    { code: 'montage', omschrijving: 'Plaatsing', artikel: '"ARB-MONTAGE"', eenheid: 'uur', aantal: 'montage_uren', als: 'montage' },
  ],
  tekening: {
    titel: 'Zicht van binnen (mm) · punt van het symbool = scharnierzijde',
    eenheid: 'mm',
    vormen: [
      { code: 'zonwering', als: 'zon_kast > 0', x: '0', y: '-zon_kast', breedte: 'breedte', hoogte: 'zon_kast', vulling: 'kb' },
      { code: 'kader', x: '0', y: '0', breedte: 'breedte', hoogte: 'hoogte', vulling: 'ki' },
      { code: 'bovenlicht', als: 'bl > 0', x: 'f', y: 'f', breedte: 'breedte - 2 * f', hoogte: 'bl - f', vulling: 'glaskleur', symbool: 'bovenlicht_open' },
      { code: 'vleugel', herhaal: 'n', x: 'f + i * stapx', y: 'f + bl', breedte: 'vb', hoogte: 'vh', vulling: 'ki' },
      {
        code: 'vak', herhaal: 'n', x: 'f + i * stapx + f / 2', y: 'f + bl + f / 2', breedte: 'vb - f', hoogte: 'vh - f',
        vulling: 'als(type = "voordeur"; ki; glaskleur)', symbool: 'als(i = 0; op1; als(i = 1; op2; op3))',
      },
      { code: 'glasstrook', als: 'type = "voordeur" en paneel_glas', x: 'f + f / 2 + (vb - f) * 0.62', y: 'f + bl + f / 2 + 150', breedte: '(vb - f) * 0.18', hoogte: 'vh - f - 300', vulling: 'glaskleur' },
      { code: 'groef', als: 'type = "voordeur" en paneel = "groeven"', herhaal: '5', x: 'f + f / 2 + 80', y: 'f + bl + f / 2 + (vh - f) * (i + 1) / 6', breedte: 'vb - f - 160', hoogte: '8', vulling: '"#00000033"' },
      { code: 'greep', als: 'type = "voordeur"', x: 'als(deur_draai = "links"; f + vb - f - 90; f + 60)', y: 'f + bl + (vh - als(greep = "klink"; 200; 1200)) / 2', breedte: '30', hoogte: 'als(greep = "klink"; 200; 1200)', vulling: '"#9a9a96"' },
      { code: 'roede_v', als: 'in(type; "raam"; "terrasdeur") en roeden = "kruis"', herhaal: 'n', x: 'f + i * stapx + vb / 2 - 12', y: 'f + bl + f / 2', breedte: '24', hoogte: 'vh - f', vulling: 'ki' },
      { code: 'roede_h', als: 'in(type; "raam"; "terrasdeur") en roeden <> "geen"', herhaal: 'n', x: 'f + i * stapx + f / 2', y: 'f + bl + vh / 2 - 12', breedte: 'vb - f', hoogte: '24', vulling: 'ki' },
      { code: 'rooster', als: 'rooster', x: 'f', y: 'f * 0.3', breedte: 'breedte - 2 * f', hoogte: 'f * 0.4', vulling: '"#77797a"' },
      { code: 'vensterbank', als: 'niet type_deur en vensterbank <> "geen"', x: '-50', y: 'hoogte', breedte: 'breedte + 100', hoogte: '30', vulling: 'vb_kleur' },
    ],
    maatlijnen: [
      { code: 'breedte', x1: 'breedte', y1: 'hoogte', x2: '0', y2: 'hoogte', afstand: '180' },
      { code: 'hoogte', x1: 'breedte', y1: '0', x2: 'breedte', y2: 'hoogte', afstand: '160' },
      { code: 'bovenlicht', als: 'bl > 0', x1: '0', y1: 'bl', x2: '0', y2: '0', afstand: '160' },
      { code: 'vak', als: 'n >= 2 en niet type_schuif', x1: 'f', y1: '0', x2: 'f + vb', y2: '0', afstand: 'zon_kast + 120', tekst: 'afronden(vb; 0)' },
    ],
  },
  prijs: { opslagProcent: 40, minimumPrijs: 250, btwProcent: 21 },
};

/** Demo-kostprijzen (excl. btw). In productie uit Missing Link of van de leveranciers. */
export const raamPrijslijst: Prijslijst = Object.fromEntries(
  (
    [
      ['PROF-PVC', 'PVC-profiel', 'lm', 28, 8],
      ['PROF-ALU', 'Aluminium profiel', 'lm', 52, 8],
      ['PROF-ALU-HI', 'Aluminium profiel hoog geïsoleerd', 'lm', 66, 8],
      ['PROF-HOUT', 'Houten profiel meranti', 'lm', 58, 10],
      ['PROF-HOUT-ALU', 'Hout-aluminium profiel', 'lm', 82, 10],
      ['GLAS-DUBBEL', 'Dubbel glas HR++', 'm2', 58, 0],
      ['GLAS-DUBBEL-GEL', 'Dubbel glas gelaagd', 'm2', 92, 0],
      ['GLAS-TRIPLE', 'Driedubbel glas', 'm2', 98, 0],
      ['GLAS-TRIPLE-GEL', 'Driedubbel glas gelaagd', 'm2', 138, 0],
      ['GLAS-MAT-GEL', 'Mat gelaagd glas', 'm2', 110, 0],
      ['GLAS-ZON-GEL', 'Zonwerend gelaagd glas', 'm2', 112, 0],
      ['GLAS-RAND-RVS', 'Meerprijs afstandhouder rvs', 'lm', 1.2, 0],
      ['GLAS-RAND-WARM', 'Meerprijs warm edge', 'lm', 1.9, 0],
      ['VERST-STIJL', 'Versterking tussenstijl', 'lm', 24, 8],
      ['KOPPELPROFIEL', 'Koppelprofiel aluminium', 'lm', 46, 8],
      ['PANEEL-VLAK', 'Deurpaneel vlak', 'stuk', 420, 0],
      ['PANEEL-GLAS', 'Deurpaneel met glasstrook', 'stuk', 560, 0],
      ['PANEEL-GROEF', 'Deurpaneel met groeven', 'stuk', 520, 0],
      ['BES-DRAAI', 'Draaibeslag', 'stuk', 48, 0],
      ['BES-DRAAIKIP', 'Draai-kipbeslag', 'stuk', 78, 0],
      ['BES-KIP', 'Kipbeslag', 'stuk', 42, 0],
      ['BES-SCHUIF', 'Schuifbeslag', 'stuk', 165, 0],
      ['BES-DEURSLOT', 'Meerpuntsluiting', 'stuk', 135, 0],
      ['GREEP-KLINK', 'Klink en rozet', 'stuk', 45, 0],
      ['GREEP-TREK', 'Trekbeugel 120 cm', 'stuk', 140, 0],
      ['GREEP-SCAN', 'Trekbeugel met vingerscan', 'stuk', 690, 0],
      ['DORPEL-DREMPELLOOS', 'Drempelloze dorpel', 'lm', 90, 0],
      ['LAK-TOESLAG', 'Kleurtoeslag', 'm2', 16, 0],
      ['ROEDE', 'Roede', 'lm', 18, 5],
      ['ZON-SCREEN', 'Screen zip', 'm2', 145, 0],
      ['ZON-ROLLUIK', 'Rolluik aluminium', 'm2', 120, 0],
      ['ZON-LAMEL', 'Buitenjaloezie', 'm2', 210, 0],
      ['ZON-MOTOR', 'Motor zonwering', 'stuk', 165, 0],
      ['ZON-DOMOTICA', 'App-bediening en zonnesensor', 'stuk', 240, 0],
      ['HOR-INZET', 'Inzethor', 'm2', 55, 0],
      ['HOR-PLISSE', 'Plissé-vliegendeur', 'stuk', 230, 0],
      ['ROOSTER', 'Ventilatierooster', 'lm', 62, 0],
      ['RC2-TOESLAG', 'Meerprijs RC2-beslag', 'stuk', 85, 0],
      ['VB-STEEN', 'Vensterbank blauwe hardsteen', 'lm', 85, 5],
      ['VB-COMPOSIET', 'Vensterbank composiet', 'lm', 70, 5],
      ['VB-EIK', 'Vensterbank eik', 'lm', 95, 5],
      ['DORPEL-ALU', 'Dorpel aluminium', 'lm', 32, 5],
      ['DORPEL-ARDUIN', 'Dorpel arduin', 'lm', 75, 5],
      ['AFBRAAK-RAAM', 'Uitbreken oud raam', 'stuk', 95, 0],
      ['AFW-DAGKANT', 'Afwerking dagkant', 'lm', 28, 0],
      ['ARB-MONTAGE', 'Montage-uur', 'uur', 55, 0],
    ] as const
  ).map(([code, omschrijving, eenheid, kostprijs, verliesProcent]) => [code, { code, omschrijving, eenheid, kostprijs, verliesProcent }]),
);

/** Eén ruit voor de glasbestelling. Maten in mm. */
export interface Ruit {
  /** Volgnummer binnen de positie (1, 2 …) en waar de ruit zit. */
  nr: number;
  plaats: string;
  dagB: number;
  dagH: number;
  falsB: number;
  falsH: number;
  /** Glasmaat = falsmaat − glasspeling (te bestellen maat). */
  b: number;
  h: number;
  m2: number;
  kg: number;
  glas: string;
  afstandhouder: string;
  ug: number;
  veilig: boolean;
  mat: boolean;
  artikel: string;
}

/** Glasbestelling per ruit uit een berekend raam (vakken, bovenlicht, glasstrook van een voordeur). */
export function ruitenVan(r: ConfiguratieResultaat): Ruit[] {
  const a = r.afgeleid as Record<string, unknown>;
  const k = Object.fromEntries(r.kenmerken.map((x) => [x.code, x]));
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const glasKeuze = raamdeur.kenmerken.find((x) => x.code === 'glas');
  const eig = glasKeuze && glasKeuze.type === 'keuze' ? glasKeuze.keuzes.find((x) => x.code === k.glas?.waarde)?.eigenschappen ?? {} : {};
  const instand = num(a.glasinstand), speling = num(a.glasspeling);
  const basis = {
    glas: String(k.glas?.weergave ?? ''), afstandhouder: String(k.afstandhouder?.weergave ?? ''),
    ug: num(eig.ug), veilig: eig.veilig === true, mat: eig.mat === true, artikel: String(eig.artikel ?? ''),
  };
  const ruit = (nr: number, plaats: string, dagB: number, dagH: number): Ruit => {
    const falsB = dagB + 2 * instand, falsH = dagH + 2 * instand;
    const b = Math.round(falsB - speling), h = Math.round(falsH - speling);
    const m2 = Math.round((b * h) / 10000) / 100;
    return { nr, plaats, dagB: Math.round(dagB), dagH: Math.round(dagH), falsB: Math.round(falsB), falsH: Math.round(falsH), b, h, m2, kg: Math.round(m2 * num(eig.kgm2)), ...basis };
  };
  const uit: Ruit[] = [];
  const type = k.type?.waarde;
  const n = Math.max(1, Math.round(num(a.n)));
  if (type === 'voordeur') {
    if (k.paneel?.waarde === 'glasstrook') uit.push(ruit(1, 'glasstrook deur', 0.18 * num(a.gb), num(a.gh)));
  } else {
    for (let i = 0; i < n; i++) uit.push(ruit(uit.length + 1, n > 1 ? `vak ${i + 1}` : 'raam', num(a.gb), num(a.gh)));
  }
  if (num(a.bl) > 0) uit.push(ruit(uit.length + 1, 'bovenlicht', num(k.breedte?.waarde) - 2 * num(a.f), num(a.bl) - num(a.f)));
  return uit;
}
