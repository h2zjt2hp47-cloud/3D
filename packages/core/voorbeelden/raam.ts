/**
 * Voorbeeldproduct ramen & deuren: één positie in een offerte (raam, terrasdeur, voordeur, schuifraam,
 * hef-schuifdeur, vouwwand of vaste glaswand). Maten in mm. Per vak kies je de opening en de draairichting;
 * de tekening toont de openingssymbolen (zicht van binnen, de punt van de driehoek wijst naar de scharnieren).
 *
 * De indeling is een raster: kolommen (vakken naast elkaar, elk met een eigen breedte) en per kolom tot drie
 * rijen (bovenlicht, hoofdvak, onderzone). Het model rekent de maten per kolom uit (`kb1`…`kb4`, `kh1`…`kh4`),
 * zodat de controles per vak blijven kloppen; `raamraster.ts` maakt er de vakken, de tekening en de 3D van.
 * Gebruik `berekenRaam` in plaats van `berekenConfiguratie`: de tekening in het model zelf dekt alleen de
 * eenvoudige indelingen van vroeger (1 tot 3 gelijke vakken, één bovenlicht).
 *
 * DEMO: prijzen, gewichten, U-waarden en grenzen zijn voorbeelden. De controles op
 * veiligheidsglas, ventilatie en EPB zijn signalen voor de verkoper (te bevestigen).
 * De nieuwe types (hef-schuif, vouwwand, glaswand, steellook) hebben nog geen eigen prijzen: ze volgen
 * de bestaande regels (profiel per meter, glas per m², bestaand beslag).
 */
import { berekenConfiguratie, type BerekenOpties, type ConfiguratieResultaat, type Keuzes, type Keuzewaarde, type Prijslijst, type ProductModel } from '../src/index.js';
import { raamTekening, rasterVan } from './raamraster.js';

/** Kleur van glas in tekening en 3D. */
export const GLASKLEUR = '#c5d5da';

/**
 * Gangbare RAL-kleuren voor buitenschrijnwerk (RAL Classic). De kleur op het scherm is een benadering:
 * een beeldscherm kan een RAL-kleur niet juist tonen. Beslis altijd met een echte kleurwaaier of een staal.
 * De codes wit, creme, antraciet en zwart bestonden al (oude projecten); `toeslag` volgt de bestaande
 * kleurtoeslag (demo).
 */
export const RAL_KLEUREN: { code: string; ral: string; naam: string; hex: string; toeslag: number }[] = [
  { code: 'wit', ral: '9016', naam: 'Wit', hex: '#f2f1ec', toeslag: 0 },
  { code: 'ral9010', ral: '9010', naam: 'Zuiver wit', hex: '#f1ece1', toeslag: 8 },
  { code: 'creme', ral: '9001', naam: 'Crème', hex: '#e9e0c9', toeslag: 8 },
  { code: 'ral1013', ral: '1013', naam: 'Parelwit', hex: '#e3d9c6', toeslag: 8 },
  { code: 'ral1015', ral: '1015', naam: 'Licht ivoor', hex: '#e6d2b5', toeslag: 8 },
  { code: 'ral7035', ral: '7035', naam: 'Lichtgrijs', hex: '#c5c7c4', toeslag: 8 },
  { code: 'ral7038', ral: '7038', naam: 'Agaatgrijs', hex: '#b0b0a9', toeslag: 8 },
  { code: 'ral7030', ral: '7030', naam: 'Steengrijs', hex: '#919089', toeslag: 8 },
  { code: 'ral7039', ral: '7039', naam: 'Kwartsgrijs', hex: '#6b665e', toeslag: 8 },
  { code: 'ral7012', ral: '7012', naam: 'Bazaltgrijs', hex: '#575d5e', toeslag: 8 },
  { code: 'ral7022', ral: '7022', naam: 'Ombergrijs', hex: '#4c4a44', toeslag: 8 },
  { code: 'ral7024', ral: '7024', naam: 'Grafietgrijs', hex: '#45494e', toeslag: 8 },
  { code: 'antraciet', ral: '7016', naam: 'Antracietgrijs', hex: '#383e42', toeslag: 8 },
  { code: 'ral7021', ral: '7021', naam: 'Zwartgrijs', hex: '#2f3234', toeslag: 8 },
  { code: 'zwart', ral: '9005', naam: 'Gitzwart', hex: '#1f1f1e', toeslag: 10 },
  { code: 'ral9006', ral: '9006', naam: 'Blank aluminiumkleurig', hex: '#a1a1a0', toeslag: 8 },
  { code: 'ral9007', ral: '9007', naam: 'Grijs aluminiumkleurig', hex: '#878581', toeslag: 8 },
  { code: 'ral8019', ral: '8019', naam: 'Grijsbruin', hex: '#3d3635', toeslag: 8 },
  { code: 'ral8022', ral: '8022', naam: 'Zwartbruin', hex: '#1a1718', toeslag: 8 },
  { code: 'ral6009', ral: '6009', naam: 'Dennengroen', hex: '#27352a', toeslag: 8 },
  { code: 'ral5011', ral: '5011', naam: 'Staalblauw', hex: '#1a2b3c', toeslag: 8 },
  { code: 'ral3005', ral: '3005', naam: 'Wijnrood', hex: '#59191f', toeslag: 8 },
];
const KLEURHULP = 'De kleur op het scherm is een benadering: beslis met een echte RAL-waaier of een staal.';
/** De waaier als keuzes van een kenmerk. Binnen kost elke kleur de toeslag van "wit binnen" (bestaande regel). */
const ralKeuzes = (binnen: boolean): Keuzewaarde[] =>
  RAL_KLEUREN.map((k) => ({ code: k.code, label: `${k.naam} (RAL ${k.ral})`, eigenschappen: { kleur: k.hex, toeslag: binnen ? 6 : k.toeslag } }));

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

/** Soorten met een raster van vakken, bovenlicht en vak onderaan (raam, terrasdeur, voordeur) en met een opening per vak (raam, terrasdeur). */
const RASTER = 'type_raster';
const VAKKEN = 'type_vakken';

export const raamdeur: ProductModel = {
  code: 'RAAM',
  naam: 'Raam of deur',
  versie: 2,
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
        // deur = tot op de vloer; schuif = vleugels op rails; vakken = een opening per vak; raster = vakken, bovenlicht en vak onderaan;
        // delen = gelijke delen;
        // deelb / deelh = grootste deel (mm) en maxkg = zwaarste vleugel bij de soorten met gelijke delen.
        { code: 'raam', label: 'Raam', eigenschappen: { deur: false, schuif: false, vakken: true, raster: true, delen: false, overlap: 0, deelb: 0, deelh: 0, maxkg: 130, minb: 400, maxb: 4800, minh: 400, maxh: 2600 } },
        { code: 'terrasdeur', label: 'Terrasdeur (openslaand)', eigenschappen: { deur: true, schuif: false, vakken: true, raster: true, delen: false, overlap: 0, deelb: 0, deelh: 0, maxkg: 130, minb: 700, maxb: 4000, minh: 1900, maxh: 2700 } },
        { code: 'voordeur', label: 'Voordeur', eigenschappen: { deur: true, schuif: false, vakken: false, raster: true, delen: false, overlap: 0, deelb: 0, deelh: 0, maxkg: 130, minb: 800, maxb: 1200, minh: 1900, maxh: 2700 } },
        { code: 'schuif', label: 'Schuifraam of schuifdeur', eigenschappen: { deur: true, schuif: true, vakken: false, raster: false, delen: false, overlap: 60, deelb: 0, deelh: 0, maxkg: 250, minb: 1500, maxb: 6000, minh: 1000, maxh: 2800 } },
        { code: 'hefschuif', label: 'Hef-schuifdeur (2 tot 4 delen)', eigenschappen: { deur: true, schuif: true, vakken: false, raster: false, delen: true, overlap: 70, deelb: 3300, deelh: 3000, maxkg: 400, minb: 1800, maxb: 12000, minh: 1900, maxh: 3000 } },
        { code: 'vouwwand', label: 'Vouwwand (3 tot 6 delen)', eigenschappen: { deur: true, schuif: false, vakken: false, raster: false, delen: true, overlap: 0, deelb: 1100, deelh: 2800, maxkg: 100, minb: 1800, maxb: 6600, minh: 1900, maxh: 2800 } },
        { code: 'glaswand', label: 'Vaste glaswand', eigenschappen: { deur: true, schuif: false, vakken: false, raster: false, delen: true, overlap: 0, deelb: 3000, deelh: 3200, maxkg: 0, minb: 800, maxb: 12000, minh: 1500, maxh: 3200 } },
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
    { code: 'breedte', label: 'Breedte (buitenmaat kader)', stap: 'maten', type: 'getal', eenheid: 'mm', min: 'type_minb + nzl * 300', max: 'type_maxb + nzl * 1000', stapgrootte: 1, standaard: 1200 },
    { code: 'hoogte', label: 'Hoogte (buitenmaat kader)', stap: 'maten', type: 'getal', eenheid: 'mm', min: 'type_minh', max: 'type_maxh', stapgrootte: 1, standaard: 1400 },
    {
      code: 'borstwering', label: 'Borstwering (onderkant raam boven de vloer)', stap: 'maten', type: 'getal', eenheid: 'mm', min: 0, max: 2000, stapgrootte: 10, standaard: 900,
      zichtbaarAls: 'niet type_deur',
    },

    // ---- Indeling: het raster van vakken ----
    { code: 'vakken', label: 'Aantal vakken naast elkaar', stap: 'indeling', type: 'keuze', standaard: 'v1', zichtbaarAls: VAKKEN,
      keuzes: [
        { code: 'v1', label: '1 vak', eigenschappen: { n: 1 } },
        { code: 'v2', label: '2 vakken', eigenschappen: { n: 2 } },
        { code: 'v3', label: '3 vakken', eigenschappen: { n: 3 } },
        { code: 'v4', label: '4 vakken', eigenschappen: { n: 4 } },
      ] },
    { code: 'vak1', label: 'Vak 1 (links)', stap: 'indeling', type: 'keuze', standaard: 'draaikip_l', zichtbaarAls: VAKKEN, keuzes: vakKeuzes },
    { code: 'vak2', label: 'Vak 2', stap: 'indeling', type: 'keuze', standaard: 'vast', zichtbaarAls: `${VAKKEN} en vakken_n >= 2`, keuzes: vakKeuzes },
    { code: 'vak3', label: 'Vak 3', stap: 'indeling', type: 'keuze', standaard: 'draaikip_r', zichtbaarAls: `${VAKKEN} en vakken_n >= 3`, keuzes: vakKeuzes },
    { code: 'vak4', label: 'Vak 4 (rechts)', stap: 'indeling', type: 'keuze', standaard: 'vast', zichtbaarAls: `${VAKKEN} en vakken_n >= 4`, keuzes: vakKeuzes },
    {
      code: 'stolp', label: 'Stolp: geen vaste stijl tussen de twee middelste vleugels', stap: 'indeling', type: 'janee', standaard: false,
      zichtbaarAls: `${VAKKEN} en in(vakken; "v2"; "v4")`,
      helptekst: 'De linkse vleugel scharniert links, de rechtse rechts; open je beide, dan is de hele opening vrij.',
    },
    { code: 'vakb1', label: 'Breedte vak 1 (0 = automatisch)', stap: 'indeling', type: 'getal', eenheid: 'mm', min: 0, max: 3000, stapgrootte: 1, standaard: 0, zichtbaarAls: `${VAKKEN} en vakken_n >= 2`,
      helptekst: 'Gemeten tot het midden van de tussenstijl. Vakken op 0 verdelen de rest gelijk.' },
    { code: 'vakb2', label: 'Breedte vak 2 (0 = automatisch)', stap: 'indeling', type: 'getal', eenheid: 'mm', min: 0, max: 3000, stapgrootte: 1, standaard: 0, zichtbaarAls: `${VAKKEN} en vakken_n >= 2` },
    { code: 'vakb3', label: 'Breedte vak 3 (0 = automatisch)', stap: 'indeling', type: 'getal', eenheid: 'mm', min: 0, max: 3000, stapgrootte: 1, standaard: 0, zichtbaarAls: `${VAKKEN} en vakken_n >= 3` },
    { code: 'vakb4', label: 'Breedte vak 4 (0 = automatisch)', stap: 'indeling', type: 'getal', eenheid: 'mm', min: 0, max: 3000, stapgrootte: 1, standaard: 0, zichtbaarAls: `${VAKKEN} en vakken_n >= 4` },
    { code: 'deur_draai', label: 'Scharnieren (zicht van binnen)', stap: 'indeling', type: 'keuze', standaard: 'links', zichtbaarAls: 'type = "voordeur"',
      keuzes: [{ code: 'links', label: 'Links' }, { code: 'rechts', label: 'Rechts' }] },
    { code: 'deur_naar', label: 'Deur draait', stap: 'indeling', type: 'keuze', standaard: 'binnen', zichtbaarAls: 'type = "voordeur"',
      keuzes: [{ code: 'binnen', label: 'Naar binnen' }, { code: 'buiten', label: 'Naar buiten' }] },
    { code: 'zijlicht', label: 'Zijlicht (vast glas naast de deur, zicht van binnen)', stap: 'indeling', type: 'keuze', standaard: 'geen', zichtbaarAls: 'type = "voordeur"',
      keuzes: [{ code: 'geen', label: 'Geen' }, { code: 'links', label: 'Links' }, { code: 'rechts', label: 'Rechts' }, { code: 'beide', label: 'Links en rechts' }] },
    { code: 'zijlicht_b', label: 'Breedte zijlicht', stap: 'indeling', type: 'getal', eenheid: 'mm', min: 250, max: 1200, stapgrootte: 1, standaard: 450,
      zichtbaarAls: 'type = "voordeur" en in(zijlicht; "links"; "rechts"; "beide")', helptekst: 'Gemeten tot het midden van de tussenstijl. De deur krijgt de rest.' },
    { code: 'schuif_richting', label: 'Welke vleugel schuift?', stap: 'indeling', type: 'keuze', standaard: 'links', zichtbaarAls: 'type_schuif',
      helptekst: 'Bij 3 delen blijft het midden vast; bij 4 delen schuiven de twee middelste delen naar buiten.',
      keuzes: [
        { code: 'links', label: 'Linker vleugel (schuift naar rechts)' },
        { code: 'rechts', label: 'Rechter vleugel (schuift naar links)' },
        { code: 'beide', label: 'Beide vleugels' },
      ] },
    { code: 'delen', label: 'Aantal delen', stap: 'indeling', type: 'keuze', standaard: 'd3', zichtbaarAls: 'type_delen',
      keuzes: [
        { code: 'd1', label: '1 deel', eigenschappen: { n: 1 }, beschikbaarAls: 'type = "glaswand"', nietBeschikbaarReden: 'alleen bij een glaswand' },
        { code: 'd2', label: '2 delen', eigenschappen: { n: 2 }, beschikbaarAls: 'type <> "vouwwand"', nietBeschikbaarReden: 'een vouwwand heeft minstens 3 delen' },
        { code: 'd3', label: '3 delen', eigenschappen: { n: 3 } },
        { code: 'd4', label: '4 delen', eigenschappen: { n: 4 } },
        { code: 'd5', label: '5 delen', eigenschappen: { n: 5 }, beschikbaarAls: 'type <> "hefschuif"', nietBeschikbaarReden: 'een hef-schuifdeur heeft hoogstens 4 delen' },
        { code: 'd6', label: '6 delen', eigenschappen: { n: 6 }, beschikbaarAls: 'type <> "hefschuif"', nietBeschikbaarReden: 'een hef-schuifdeur heeft hoogstens 4 delen' },
      ] },
    { code: 'vouw_richting', label: 'De vouwwand vouwt samen naar', stap: 'indeling', type: 'keuze', standaard: 'links', zichtbaarAls: 'type = "vouwwand"',
      keuzes: [{ code: 'links', label: 'Links (zicht van binnen)' }, { code: 'rechts', label: 'Rechts (zicht van binnen)' }] },
    { code: 'bovenlicht', label: 'Bovenlicht', stap: 'indeling', type: 'janee', standaard: false, zichtbaarAls: RASTER },
    { code: 'bovenlicht_h', label: 'Hoogte bovenlicht', stap: 'indeling', type: 'getal', eenheid: 'mm', min: 250, max: 900, stapgrootte: 10, standaard: 400, zichtbaarAls: `bovenlicht en ${RASTER}` },
    { code: 'bovenlicht_open', label: 'Bovenlicht', stap: 'indeling', type: 'keuze', standaard: 'vast', zichtbaarAls: `bovenlicht en ${RASTER}`,
      keuzes: [{ code: 'vast', label: 'Vast' }, { code: 'kip', label: 'Kip (valraam)' }] },
    { code: 'bovenlicht_over', label: 'Het bovenlicht loopt over', stap: 'indeling', type: 'keuze', standaard: 'alle', zichtbaarAls: `bovenlicht en ${RASTER} en n >= 2`,
      keuzes: [
        { code: 'alle', label: 'Alle vakken (één bovenlicht)' },
        { code: 'elk', label: 'Elk vak apart (stijlen lopen door)' },
        { code: 'deur', label: 'Alleen de deur', beschikbaarAls: 'type = "voordeur"', nietBeschikbaarReden: 'alleen bij een voordeur' },
        { code: 'vak1', label: 'Alleen vak 1', beschikbaarAls: VAKKEN, nietBeschikbaarReden: 'niet bij een voordeur' },
        { code: 'vak2', label: 'Alleen vak 2', beschikbaarAls: VAKKEN, nietBeschikbaarReden: 'niet bij een voordeur' },
        { code: 'vak3', label: 'Alleen vak 3', beschikbaarAls: `${VAKKEN} en n >= 3`, nietBeschikbaarReden: 'er zijn minder dan 3 vakken' },
        { code: 'vak4', label: 'Alleen vak 4', beschikbaarAls: `${VAKKEN} en n >= 4`, nietBeschikbaarReden: 'er zijn minder dan 4 vakken' },
      ] },
    { code: 'onder', label: 'Onderaan (vak onder de vakken)', stap: 'indeling', type: 'keuze', standaard: 'geen', zichtbaarAls: `${VAKKEN} of (type = "voordeur" en nzl > 0)`,
      helptekst: 'Bij een voordeur komt het onder de zijlichten.',
      keuzes: [
        { code: 'geen', label: 'Niets' },
        { code: 'glas', label: 'Vast glas (vakken boven elkaar)' },
        { code: 'paneel', label: 'Onderpaneel (dicht)' },
      ] },
    { code: 'onder_h', label: 'Hoogte onderaan', stap: 'indeling', type: 'getal', eenheid: 'mm', min: 250, max: 1500, stapgrootte: 10, standaard: 600,
      zichtbaarAls: `(${VAKKEN} of (type = "voordeur" en nzl > 0)) en in(onder; "glas"; "paneel")` },
    { code: 'onder_over', label: 'Het vak onderaan loopt over', stap: 'indeling', type: 'keuze', standaard: 'alle', zichtbaarAls: `${VAKKEN} en n >= 2 en in(onder; "glas"; "paneel")`,
      keuzes: [
        { code: 'alle', label: 'Alle vakken (één vak)' },
        { code: 'elk', label: 'Elk vak apart (stijlen lopen door)' },
        { code: 'vak1', label: 'Alleen vak 1' },
        { code: 'vak2', label: 'Alleen vak 2' },
        { code: 'vak3', label: 'Alleen vak 3', beschikbaarAls: 'n >= 3', nietBeschikbaarReden: 'er zijn minder dan 3 vakken' },
        { code: 'vak4', label: 'Alleen vak 4', beschikbaarAls: 'n >= 4', nietBeschikbaarReden: 'er zijn minder dan 4 vakken' },
      ] },
    { code: 'roeden', label: 'Kleinhouten (roeden in het glas)', stap: 'indeling', type: 'keuze', standaard: 'geen', zichtbaarAls: VAKKEN,
      keuzes: [
        // kol × rij = aantal ruiten naast en boven elkaar per vak.
        { code: 'geen', label: 'Geen', eigenschappen: { kol: 1, rij: 1 } },
        { code: 'kruis', label: 'Kruisroede', eigenschappen: { kol: 2, rij: 2 } },
        { code: 'liggend', label: 'Eén liggende roede', eigenschappen: { kol: 1, rij: 2 } },
        { code: 'staand', label: 'Eén staande roede', eigenschappen: { kol: 2, rij: 1 } },
        { code: 'liggend2', label: 'Twee liggende roeden', eigenschappen: { kol: 1, rij: 3 } },
        { code: 'zes', label: 'Zes ruiten (2 × 3)', eigenschappen: { kol: 2, rij: 3 } },
        { code: 'acht', label: 'Acht ruiten (2 × 4)', eigenschappen: { kol: 2, rij: 4 } },
        { code: 'negen', label: 'Negen ruiten (3 × 3)', eigenschappen: { kol: 3, rij: 3 } },
      ] },
    { code: 'uitzicht', label: 'Uitzicht', stap: 'indeling', type: 'keuze', standaard: 'standaard', zichtbaarAls: 'type <> "voordeur"',
      helptekst: 'Steellook: smalle profielen en een fijne verdeling van het glas, zoals stalen ramen. Kies er een donkere kleur bij.',
      keuzes: [
        { code: 'standaard', label: 'Standaard profiel' },
        { code: 'steellook', label: 'Steellook (smal profiel, fijne verdeling)', beschikbaarAls: 'in(profiel; "alu"; "alu_hi")', nietBeschikbaarReden: 'alleen in aluminium' },
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
      code: 'kleur_buiten', label: 'Kleur buiten', stap: 'materiaal', type: 'keuze', standaard: 'antraciet', helptekst: KLEURHULP,
      keuzes: [
        ...ralKeuzes(false),
        { code: 'eik', label: 'Houtnerf eik (folie)', eigenschappen: { kleur: '#a8743f', toeslag: 12 }, beschikbaarAls: 'profiel = "pvc"', nietBeschikbaarReden: 'alleen bij PVC' },
        { code: 'naturel', label: 'Hout naturel (gelakt)', eigenschappen: { kleur: '#b78a5a', toeslag: 0 }, beschikbaarAls: 'profiel = "hout"', nietBeschikbaarReden: 'alleen bij hout' },
      ],
    },
    {
      code: 'kleur_binnen', label: 'Kleur binnen', stap: 'materiaal', type: 'keuze', standaard: 'wit', helptekst: KLEURHULP,
      keuzes: [
        { code: 'zelfde', label: 'Zelfde als buiten', eigenschappen: { kleur: '', toeslag: 0 } },
        ...ralKeuzes(true),
        { code: 'eik', label: 'Eik', eigenschappen: { kleur: '#b48a5a', toeslag: 10 } },
      ],
    },
    {
      code: 'lak', label: 'Afwerking van de kleur', stap: 'materiaal', type: 'keuze', standaard: 'standaard',
      helptekst: 'Zie het verschil in de 3D: mat weerkaatst het licht nauwelijks, structuurlak heeft een fijne korrel, glans spiegelt.',
      keuzes: [
        // soort = hoe de 3D het oppervlak tekent (leeg = zoals het profiel zelf).
        { code: 'standaard', label: 'Zoals het profiel (standaard)', eigenschappen: { soort: '' } },
        { code: 'mat', label: 'Mat', eigenschappen: { soort: 'lak_mat' } },
        { code: 'structuur', label: 'Structuurlak (fijne korrel)', eigenschappen: { soort: 'lak_structuur' } },
        { code: 'glans', label: 'Glanzend', eigenschappen: { soort: 'lak_glans' } },
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
    { code: 'drempel', label: 'Dorpel', stap: 'materiaal', type: 'keuze', standaard: 'standaard', zichtbaarAls: 'type_deur en type <> "glaswand"',
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
    // Twee of drie screens naast elkaar op één raam (ronde 11b). Zonder deze keuze: één screen over de hele breedte, zoals vroeger.
    {
      code: 'screens', label: 'Aantal screens', stap: 'opties', type: 'keuze', standaard: 's1', zichtbaarAls: 'zonwering = "screen"',
      helptekst: 'Eén screen is hoogstens 5 m breed. Naast elkaar heeft elk screen zijn eigen kast, doek en motor; ertussen staat een middengeleider.',
      keuzes: [
        { code: 's1', label: 'Eén screen', eigenschappen: { n: 1 } },
        { code: 's2', label: 'Twee screens naast elkaar', eigenschappen: { n: 2 } },
        { code: 's3', label: 'Drie screens naast elkaar', eigenschappen: { n: 3 } },
      ],
    },
    {
      code: 'screen_verdeling', label: 'Verdeling van de screens', stap: 'opties', type: 'keuze', standaard: 'gelijk',
      zichtbaarAls: 'zonwering = "screen" en screens_n >= 2',
      helptekst: 'Op de stijlen: de middengeleider komt voor de stijl tussen twee vakken (bij schuifdelen: waar de delen elkaar raken), zodat hij het uitzicht niet onderbreekt.',
      keuzes: [
        { code: 'gelijk', label: 'Gelijk verdeeld over de breedte' },
        { code: 'stijl', label: 'Op de stijlen tussen de vakken', beschikbaarAls: 'n >= screens_n', nietBeschikbaarReden: 'te weinig vakken of delen: elke middengeleider vraagt een stijl' },
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
      code: 'zon_stand', label: 'Zonwering in de 3D', stap: 'opties', type: 'keuze', standaard: 'half', zichtbaarAls: 'zonwering <> "geen"',
      helptekst: 'Alleen voor het beeld: toon de klant de zonwering half of helemaal neer.',
      keuzes: [{ code: 'half', label: 'Half neer' }, { code: 'dicht', label: 'Helemaal neer' }],
    },
    {
      code: 'vliegenraam', label: 'Vliegenraam', stap: 'opties', type: 'keuze', standaard: 'geen', zichtbaarAls: 'niet in(type; "voordeur"; "glaswand")',
      keuzes: [
        { code: 'geen', label: 'Geen' },
        { code: 'inzet', label: 'Inzethor (raam)', beschikbaarAls: 'type = "raam"', nietBeschikbaarReden: 'alleen bij ramen' },
        { code: 'plisse', label: 'Plissédeur (deur)', beschikbaarAls: 'type_deur', nietBeschikbaarReden: 'alleen bij deuren' },
      ],
    },
    // Ventilatie op het raam (ronde 11b): `rooster` blijft zeggen óf er ventilatie op het raam staat (oude projecten met
    // `rooster: true` blijven exact hetzelfde); `ventilatie_soort` zegt welke: het zelfregelende rooster van vroeger of een raamventilator.
    {
      code: 'rooster', label: 'Ventilatie op het raam', stap: 'opties', type: 'janee', standaard: false, zichtbaarAls: 'type <> "voordeur"',
      helptekst: 'Luchttoevoer bovenaan het raam: een zelfregelend rooster, of een raamventilator (een toestel in een opzetkast bovenop het kader).',
    },
    {
      code: 'ventilatie_soort', label: 'Soort ventilatie op het raam', stap: 'opties', type: 'keuze', standaard: 'rooster', zichtbaarAls: 'rooster en type <> "voordeur"',
      keuzes: [
        { code: 'rooster', label: 'Zelfregelend rooster' },
        { code: 'ventilator', label: 'Raamventilator (toestel in een opzetkast bovenop het kader)' },
      ],
    },
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
    // Aantal zijlichten naast een voordeur en het aantal kolommen (vakken of delen naast elkaar).
    { code: 'nzl', formule: 'als(type = "voordeur"; als(zijlicht = "beide"; 2; als(in(zijlicht; "links"; "rechts"); 1; 0)); 0)' },
    { code: 'n', label: 'Aantal vakken', formule: 'als(type = "voordeur"; 1 + nzl; als(type = "schuif"; 2; als(type_delen; delen_n; vakken_n)))' },
    { code: 'borst', label: 'Borstwering (mm)', formule: 'als(type_deur; 0; borstwering)' },
    { code: 'bl', label: 'Hoogte bovenlicht (mm)', formule: 'als(niet type_schuif en bovenlicht; bovenlicht_h; 0)' },
    { code: 'f', formule: 'als(uitzicht = "steellook"; 22; profiel_aanzicht / 2)' },
    { code: 'overlap', formule: 'als(type_schuif; type_overlap; 0)' },
    // Vier schuifdelen: de twee middelste sluiten tegen elkaar, dus maar twee overlappingen.
    { code: 'n_overlap', formule: 'als(type_schuif; als(n = 4; 2; n - 1); 0)' },
    { code: 'vb', label: 'Breedte per vak (mm)', formule: '(breedte - 2 * f + n_overlap * overlap) / n' },
    { code: 'stapx', formule: 'vb - overlap' },

    // ---- Raster: kolommen. vw = vaste breedte van een kolom (0 = de rest gelijk verdeeld), kb = breedte van de kolom. ----
    { code: 'deur_kol', formule: 'als(type = "voordeur"; als(in(zijlicht; "links"; "beide"); 2; 1); 0)' },
    { code: 'vw1', formule: 'als(type_vakken; als(n >= 2 en vakb1 > 0; vakb1; 0); als(type = "voordeur" en deur_kol <> 1; zijlicht_b; 0))' },
    { code: 'vw2', formule: 'als(type_vakken; als(n >= 2 en vakb2 > 0; vakb2; 0); als(type = "voordeur" en n >= 2 en deur_kol <> 2; zijlicht_b; 0))' },
    { code: 'vw3', formule: 'als(type_vakken; als(n >= 3 en vakb3 > 0; vakb3; 0); als(type = "voordeur" en n >= 3; zijlicht_b; 0))' },
    { code: 'vw4', formule: 'als(type_vakken en n >= 4 en vakb4 > 0; vakb4; 0)' },
    { code: 'vast_som', formule: 'vw1 + vw2 + vw3 + vw4' },
    { code: 'n_auto', formule: 'n - als(vw1 > 0; 1; 0) - als(vw2 > 0; 1; 0) - als(vw3 > 0; 1; 0) - als(vw4 > 0; 1; 0)' },
    { code: 'auto_b', formule: 'als(n_auto > 0; (breedte - 2 * f - vast_som) / n_auto; 0)' },
    { code: 'kb1', label: 'Breedte vak 1 (mm)', formule: 'als(type_raster; als(vw1 > 0; vw1; auto_b); vb)' },
    { code: 'kb2', label: 'Breedte vak 2 (mm)', formule: 'als(n >= 2; als(type_raster; als(vw2 > 0; vw2; auto_b); vb); 0)' },
    { code: 'kb3', label: 'Breedte vak 3 (mm)', formule: 'als(n >= 3; als(type_raster; als(vw3 > 0; vw3; auto_b); vb); 0)' },
    { code: 'kb4', label: 'Breedte vak 4 (mm)', formule: 'als(n >= 4; als(type_raster; als(vw4 > 0; vw4; auto_b); vb); 0)' },
    { code: 'kbmax', formule: 'max(kb1; kb2; kb3; kb4)' },
    { code: 'kbmin', formule: 'min(kb1; als(n >= 2; kb2; kb1); als(n >= 3; kb3; kb1); als(n >= 4; kb4; kb1))' },

    // ---- Raster: rijen per kolom. blk = bovenlicht boven kolom i, ok = vak onderaan onder kolom i, z = hun hoogte samen. ----
    { code: 'bl_door', formule: 'bl > 0 en niet in(bovenlicht_over; "elk"; "deur"; "vak1"; "vak2"; "vak3"; "vak4")' },
    { code: 'blk1', formule: 'bl > 0 en (bl_door of bovenlicht_over = "elk" of bovenlicht_over = "vak1" of (bovenlicht_over = "deur" en deur_kol = 1))' },
    { code: 'blk2', formule: 'n >= 2 en bl > 0 en (bl_door of bovenlicht_over = "elk" of bovenlicht_over = "vak2" of (bovenlicht_over = "deur" en deur_kol = 2))' },
    { code: 'blk3', formule: 'n >= 3 en bl > 0 en (bl_door of bovenlicht_over = "elk" of bovenlicht_over = "vak3")' },
    { code: 'blk4', formule: 'n >= 4 en bl > 0 en (bl_door of bovenlicht_over = "elk" of bovenlicht_over = "vak4")' },
    { code: 'oh', label: 'Hoogte vak onderaan (mm)', formule: `als(${RASTER} en in(onder; "glas"; "paneel"); onder_h; 0)` },
    { code: 'o_door', formule: 'oh > 0 en type_vakken en niet in(onder_over; "elk"; "vak1"; "vak2"; "vak3"; "vak4")' },
    { code: 'ok1', formule: 'oh > 0 en als(type = "voordeur"; deur_kol <> 1; o_door of onder_over = "elk" of onder_over = "vak1")' },
    { code: 'ok2', formule: 'n >= 2 en oh > 0 en als(type = "voordeur"; deur_kol <> 2; o_door of onder_over = "elk" of onder_over = "vak2")' },
    { code: 'ok3', formule: 'n >= 3 en oh > 0 en als(type = "voordeur"; waar; o_door of onder_over = "elk" of onder_over = "vak3")' },
    { code: 'ok4', formule: 'n >= 4 en oh > 0 en (o_door of onder_over = "elk" of onder_over = "vak4")' },
    { code: 'z1', formule: 'als(blk1; bl; 0) + als(ok1; oh; 0)' },
    { code: 'z2', formule: 'als(blk2; bl; 0) + als(ok2; oh; 0)' },
    { code: 'z3', formule: 'als(blk3; bl; 0) + als(ok3; oh; 0)' },
    { code: 'z4', formule: 'als(blk4; bl; 0) + als(ok4; oh; 0)' },
    // vh = het hoogste hoofdvak (bij een eenvoudige indeling: alle vakken).
    { code: 'vh', label: 'Hoogte vak (mm)', formule: 'hoogte - 2 * f - min(z1; als(n >= 2; z2; z1); als(n >= 3; z3; z1); als(n >= 4; z4; z1))' },
    { code: 'kh1', label: 'Hoogte vak 1 (mm)', formule: 'hoogte - 2 * f - z1' },
    { code: 'kh2', label: 'Hoogte vak 2 (mm)', formule: 'als(n >= 2; hoogte - 2 * f - z2; 0)' },
    { code: 'kh3', label: 'Hoogte vak 3 (mm)', formule: 'als(n >= 3; hoogte - 2 * f - z3; 0)' },
    { code: 'kh4', label: 'Hoogte vak 4 (mm)', formule: 'als(n >= 4; hoogte - 2 * f - z4; 0)' },
    { code: 'khmin', formule: 'min(kh1; als(n >= 2; kh2; kh1); als(n >= 3; kh3; kh1); als(n >= 4; kh4; kh1))' },
    // Wijkt de indeling af van de eenvoudige (gelijke vakken, één bovenlicht)? Dan gelden de formules per kolom.
    { code: 'raster_vrij', formule: 'type_raster en (vast_som > 0 of nzl > 0 of (bl > 0 en niet bl_door) of oh > 0)' },

    // Opening per vak (symbool in tekening en 3D). Bij een voordeur is op1 altijd de deur zelf, ook met een zijlicht links.
    { code: 'op1', formule: 'als(type = "voordeur"; als(deur_draai = "links"; "draai_l"; "draai_r"); als(type_schuif; als(in(schuif_richting; "links"; "beide"); "schuif_r"; "vast"); als(type_vakken; vak1; "vast")))' },
    { code: 'op2', formule: 'als(type_schuif; als(in(schuif_richting; "rechts"; "beide"); "schuif_l"; "vast"); als(type_vakken en n >= 2; vak2; "vast"))' },
    { code: 'op3', formule: 'als(type_vakken en n >= 3; vak3; "vast")' },
    { code: 'op4', formule: 'als(type_vakken en n >= 4; vak4; "vast")' },
    { code: 'b1', formule: 'als(op1 = "vast"; 0; 1)' },
    { code: 'b2', formule: 'als(n >= 2 en op2 <> "vast"; 1; 0)' },
    { code: 'b3', formule: 'als(n >= 3 en op3 <> "vast"; 1; 0)' },
    { code: 'b4', formule: 'als(n >= 4 en op4 <> "vast"; 1; 0)' },
    { code: 'beweeg', label: 'Opendraaiende vleugels', formule: 'als(type = "hefschuif"; als(schuif_richting = "beide"; 2; 1); als(type = "vouwwand"; n; als(type = "glaswand"; 0; b1 + b2 + b3 + b4)))' },
    { code: 'n_draai', formule: 'als(in(op1; "draai_l"; "draai_r"); 1; 0) + als(n >= 2 en in(op2; "draai_l"; "draai_r"); 1; 0) + als(n >= 3 en in(op3; "draai_l"; "draai_r"); 1; 0) + als(n >= 4 en in(op4; "draai_l"; "draai_r"); 1; 0)' },
    { code: 'n_draaikip', formule: 'als(in(op1; "draaikip_l"; "draaikip_r"); 1; 0) + als(n >= 2 en in(op2; "draaikip_l"; "draaikip_r"); 1; 0) + als(n >= 3 en in(op3; "draaikip_l"; "draaikip_r"); 1; 0) + als(n >= 4 en in(op4; "draaikip_l"; "draaikip_r"); 1; 0)' },
    { code: 'n_kip', formule: 'als(op1 = "kip"; 1; 0) + als(n >= 2 en op2 = "kip"; 1; 0) + als(n >= 3 en op3 = "kip"; 1; 0) + als(n >= 4 en op4 = "kip"; 1; 0) + als(bl > 0 en bovenlicht_open = "kip"; 1; 0)' },
    // Stolp: de twee middelste vleugels sluiten tegen elkaar, zonder vaste stijl (bij 2 vakken: 1 en 2; bij 4: 2 en 3).
    { code: 'n_stolp', formule: 'als(type_vakken en stolp en in(vakken; "v2"; "v4"); 1; 0)' },
    { code: 'stolp_ok', formule: 'n_stolp = 0 of als(n = 2; in(vak1; "draai_l"; "draaikip_l") en in(vak2; "draai_r"; "draaikip_r"); in(vak2; "draai_l"; "draaikip_l") en in(vak3; "draai_r"; "draaikip_r"))' },
    // Vaste tussenstijlen (niet bij schuifdelen en vouwdelen, niet in een stolp).
    { code: 'n_stijl', formule: 'als(type_raster of type = "glaswand"; n - 1 - n_stolp; 0)' },
    // Breedte van de breedste opendraaiende vleugel (bij een voordeur: de deur), voor het gewicht.
    { code: 'wb', formule: 'als(type = "voordeur"; als(deur_kol = 2; kb2; kb1); als(type_vakken en beweeg > 0; max(b1 * kb1; b2 * kb2; b3 * kb3; b4 * kb4); vb))' },

    { code: 'gb', label: 'Dagmaat glas per vak, breedte (mm)', formule: 'vb - f' },
    { code: 'gh', label: 'Dagmaat glas per vak, hoogte (mm)', formule: 'vh - f' },
    // Glasmaat = falsmaat − glasspeling; falsmaat = dagmaat + 2 × glasinstand (demowaarden, per systeem te bevestigen).
    { code: 'glasinstand', formule: '14' },
    { code: 'glasspeling', formule: '8' },
    { code: 'glasmaat_b', label: 'Glasmaat per vak, breedte (mm)', formule: 'gb + 2 * glasinstand - glasspeling' },
    { code: 'glasmaat_h', label: 'Glasmaat per vak, hoogte (mm)', formule: 'gh + 2 * glasinstand - glasspeling' },
    { code: 'blglas_b', formule: 'breedte - 2 * f + 2 * glasinstand - glasspeling' },
    { code: 'blglas_h', formule: 'bl - f + 2 * glasinstand - glasspeling' },
    // Per kolom (vrije indeling): glas in het hoofdvak (niet in de kolom van de voordeur), in de bovenlichten en onderaan.
    { code: 'ga1', formule: 'als(deur_kol = 1; 0; (kb1 - f) * (kh1 - f) / 1000000)' },
    { code: 'ga2', formule: 'als(n >= 2 en deur_kol <> 2; (kb2 - f) * (kh2 - f) / 1000000; 0)' },
    { code: 'ga3', formule: 'als(n >= 3; (kb3 - f) * (kh3 - f) / 1000000; 0)' },
    { code: 'ga4', formule: 'als(n >= 4; (kb4 - f) * (kh4 - f) / 1000000; 0)' },
    { code: 'bl_kol_b', formule: 'als(blk1; kb1 - f; 0) + als(blk2; kb2 - f; 0) + als(blk3; kb3 - f; 0) + als(blk4; kb4 - f; 0)' },
    { code: 'o_kol_b', formule: 'als(o_door; breedte - 2 * f; als(ok1; kb1 - f; 0) + als(ok2; kb2 - f; 0) + als(ok3; kb3 - f; 0) + als(ok4; kb4 - f; 0))' },
    { code: 'o_m2', formule: 'als(oh > 0; o_kol_b * (oh - f) / 1000000; 0)' },
    { code: 'deurglas_m2', formule: 'als(type = "voordeur" en paneel_glas; 0.18 * (wb - f) * gh / 1000000; 0)' },
    { code: 'glas_vak_m2', formule: 'als(raster_vrij; ga1 + ga2 + ga3 + ga4 + deurglas_m2 + als(onder = "glas"; o_m2; 0); als(type = "voordeur"; als(paneel_glas; 0.18 * gb * gh / 1000000; 0); n * gb * gh / 1000000))' },
    { code: 'glas_bl_m2', formule: 'als(bl > 0; als(bl_door; (breedte - 2 * f) * (bl - f) / 1000000; bl_kol_b * (bl - f) / 1000000); 0)' },
    { code: 'glas_m2', label: 'Glasoppervlakte (m²)', formule: 'glas_vak_m2 + glas_bl_m2' },
    { code: 'paneel_m2', formule: 'als(type = "voordeur"; (wb - f) * gh / 1000000 - deurglas_m2; 0) + als(onder = "paneel"; o_m2; 0)' },
    { code: 'raam_m2', label: 'Oppervlakte (m²)', formule: 'breedte * hoogte / 1000000' },
    // Omtrek van het glas (m), voor het warmteverlies langs de rand. Bij een vrije indeling: benaderd per kolom.
    { code: 'lg_vrij', formule: '2 * (als(ga1 > 0; kb1 - f + kh1 - f; 0) + als(ga2 > 0; kb2 - f + kh2 - f; 0) + als(ga3 > 0; kb3 - f + kh3 - f; 0) + als(ga4 > 0; kb4 - f + kh4 - f; 0)) / 1000 + als(deurglas_m2 > 0; 2 * (0.18 * (wb - f) + gh) / 1000; 0) + als(onder = "glas"; 2 * (o_kol_b + oh - f) / 1000; 0) + als(bl > 0 en niet bl_door; 2 * (bl_kol_b + bl - f) / 1000; 0)' },
    { code: 'lg', formule: 'als(raster_vrij; lg_vrij; als(type = "voordeur"; als(paneel_glas; 2 * (0.18 * gb + gh) / 1000; 0); n * 2 * (gb + gh) / 1000)) + als(bl_door; 2 * (breedte + bl) / 1000; 0)' },
    { code: 'psi', label: 'ψ afstandhouder (W/mK)', formule: 'als(glas_m2 > 0; afstandhouder_psi; 0)' },
    { code: 'uw', label: 'Uw (W/m²K)', formule: 'afronden((glas_m2 * glas_ug + paneel_m2 * 0.8 + (raam_m2 - glas_m2 - paneel_m2) * profiel_uf + lg * psi) / raam_m2; 2)' },
    // Statische voordimensionering: tussenstijl (tussen vakken of de ontmoetingsstijl van een schuifraam) en de regel onder het bovenlicht.
    // Doorbuiging f = 5·q·L⁴ / (384·E·I) ≤ L/k  →  E·I nodig = 5·q·L³·k / 384, met q = winddruk × invloedsbreedte.
    { code: 'heeft_stijl', formule: 'type_schuif of bl > 0 of oh > 0 of n_stijl >= 1' },
    // Loopt de stijl door tot het kader (een bovenlicht of een vak onderaan per vak), dan overspant hij de hele hoogte.
    { code: 'stijl_door', formule: 'n_stijl >= 1 en ((bl > 0 en niet bl_door) of (oh > 0 en niet o_door))' },
    { code: 'stijl_l', label: 'Overspanning tussenstijl (mm)', formule: 'als(type_schuif of n_stijl >= 1; als(stijl_door; hoogte - f; vh + f); 0)' },
    // Invloedsbreedte: de helft van het vak links en de helft van het vak rechts van de stijl (bij ongelijke vakken: het breedste paar).
    { code: 'stijl_paar', formule: 'max((kb1 + kb2) / 2; als(n >= 3; (kb2 + kb3) / 2; 0); als(n >= 4; (kb3 + kb4) / 2; 0))' },
    { code: 'stijl_a', label: 'Invloedsbreedte tussenstijl (mm)', formule: 'als(type_schuif of n_stijl >= 1; als(raster_vrij; stijl_paar; vb); 0)' },
    { code: 'regel_l', label: 'Overspanning regel bovenlicht (mm)', formule: 'als(bl_door of o_door; breedte - 2 * f; als(bl > 0 of oh > 0; kbmax; 0))' },
    { code: 'regel_a', formule: 'als(bl > 0; (bl + vh) / 2; als(oh > 0; (oh + vh) / 2; 0))' },
    { code: 'ei_stijl', formule: '5 * (winddruk * stijl_a / 1000000) * stijl_l * stijl_l * stijl_l * doorbuiging_k / 384' },
    { code: 'ei_regel', formule: '5 * (winddruk * regel_a / 1000000) * regel_l * regel_l * regel_l * doorbuiging_k / 384' },
    { code: 'ei_nodig', formule: 'max(ei_stijl; ei_regel)' },
    { code: 'stijl_e', formule: 'als(tussenstijl = "koppel"; 70000; profiel_e)' },
    // Bij een schuifraam dragen de twee ontmoetingsstijlen samen.
    { code: 'i_aanwezig', label: 'Traagheidsmoment tussenstijl (cm⁴)', formule: 'als(tussenstijl = "koppel"; 400; als(tussenstijl = "versterkt"; profiel_ix_vers; profiel_ix) * als(type_schuif; 2; 1))' },
    { code: 'i_nodig', label: 'Nodig traagheidsmoment (cm⁴)', formule: 'afronden(ei_nodig / stijl_e / 10000; 1)' },
    { code: 'statiek_ok', formule: 'niet heeft_stijl of i_aanwezig >= i_nodig' },
    { code: 'stijl_lm', formule: 'als(type_schuif; vh / 1000; n_stijl * (vh + f) / 1000) + als(bl > 0; (breedte - 2 * f) / 1000; 0)' },
    { code: 'vleugel_kg', label: 'Gewicht zwaarste vleugel (kg)', formule: 'afronden((wb - f) * gh / 1000000 * als(type = "voordeur"; 35; glas_kgm2) + 2 * (wb + vh) / 1000 * profiel_kgm; 0)' },
    { code: 'profiel_lm', formule: '2 * (breedte + hoogte) / 1000 + beweeg * 2 * (vb + vh) / 1000 + (n - 1 - n_stolp) * hoogte / 1000 + als(bl > 0; breedte / 1000; 0) + als(oh > 0; breedte / 1000; 0)' },
    { code: 'zon_kast', label: 'Hoogte zonweringskast (mm)', formule: 'zonwering_kast' },
    // ---- Zonwering in stukken (ronde 11b): één stuk over de hele breedte, of twee of drie screens naast elkaar. ----
    { code: 'zon_n', label: 'Aantal stuks zonwering', formule: 'als(zonwering = "geen"; 0; als(zonwering = "screen"; screens_n; 1))' },
    // Grens tussen kolom i en i + 1 (mm vanaf links, zicht van binnen): het midden van de stijl, of bij schuif- en vouwdelen
    // het midden van de overlapping (waar de delen elkaar raken). Bij vier schuifdelen sluiten de twee middelste tegen elkaar.
    { code: 'kg1', formule: 'als(type_raster; f + kb1; f + stapx + overlap / 2)' },
    { code: 'kg2', formule: 'als(type_raster; f + kb1 + kb2; f + 2 * stapx + overlap / 2 + als(type_schuif en n >= 4; overlap / 2; 0))' },
    { code: 'kg3', formule: 'als(type_raster; f + kb1 + kb2 + kb3; f + 3 * stapx + overlap / 2 + als(type_schuif en n >= 4; overlap; 0))' },
    // Op de stijlen: twee screens op de grens die het dichtst bij het midden ligt; drie screens op de grenzen die het dichtst
    // bij een derde en bij twee derde liggen (bij drie kolommen gewoon de twee stijlen).
    { code: 'zon_stijl', formule: 'zonwering = "screen" en zon_n >= 2 en screen_verdeling = "stijl" en n >= zon_n' },
    { code: 'kd1', formule: 'max(kg1 - breedte / 2; breedte / 2 - kg1)' },
    { code: 'kd2', formule: 'max(kg2 - breedte / 2; breedte / 2 - kg2)' },
    { code: 'kd3', formule: 'max(kg3 - breedte / 2; breedte / 2 - kg3)' },
    { code: 'kg_midden', formule: 'als(n >= 3 en kd2 < kd1 en (n < 4 of kd2 <= kd3); kg2; als(n >= 4 en kd3 < kd1; kg3; kg1))' },
    { code: 'kg_derde1', formule: 'als(n >= 4 en max(kg2 - breedte / 3; breedte / 3 - kg2) < max(kg1 - breedte / 3; breedte / 3 - kg1); kg2; kg1)' },
    { code: 'kg_derde2', formule: 'als(n < 4; kg2; als(kg_derde1 = kg2 of max(kg3 - 2 * breedte / 3; 2 * breedte / 3 - kg3) <= max(kg2 - 2 * breedte / 3; 2 * breedte / 3 - kg2); kg3; kg2))' },
    // Grenzen tussen de screens (mm vanaf links, zicht van binnen) en de breedte per screen. Eén stuk = de hele breedte.
    { code: 'zg1', formule: 'als(zon_n < 2; breedte; afronden(als(zon_stijl; als(zon_n = 2; kg_midden; kg_derde1); breedte / zon_n); 0))' },
    { code: 'zg2', formule: 'als(zon_n < 3; breedte; afronden(als(zon_stijl; kg_derde2; 2 * breedte / zon_n); 0))' },
    { code: 'zb1', label: 'Breedte screen 1 (mm)', formule: 'als(zon_n < 2; breedte; zg1)' },
    { code: 'zb2', label: 'Breedte screen 2 (mm)', formule: 'als(zon_n < 2; 0; zg2 - zg1)' },
    { code: 'zb3', label: 'Breedte screen 3 (mm)', formule: 'als(zon_n < 3; 0; breedte - zg2)' },
    { code: 'zon_bmax', label: 'Breedste screen (mm)', formule: 'max(zb1; zb2; zb3)' },
    { code: 'zon_bmin', label: 'Smalste screen (mm)', formule: 'als(zon_n < 2; zb1; min(zb1; zb2; als(zon_n >= 3; zb3; zb2)))' },
    // ---- Ventilatie op het raam (ronde 11b): het rooster van vroeger, of een raamventilator in een opzetkast bovenop het
    // kader (binnen, over de hele breedte, 10 cm hoog of zo hoog als de zonweringskast), met het rooster van de ventilator
    // (`vent_b` breed) in het midden. Zonder zonwering wordt de opening in de muur zo 10 cm hoger.
    { code: 'vent_rooster', formule: 'rooster = waar en ventilatie_soort <> "ventilator"' },
    { code: 'vent_toestel', formule: 'rooster = waar en ventilatie_soort = "ventilator"' },
    { code: 'vent_b', label: 'Breedte ventilator (mm)', formule: 'als(vent_toestel; min(500; breedte - 2 * f - 40); 0)' },
    { code: 'vent_h', label: 'Hoogte opzetkast raamventilator (mm)', formule: 'als(vent_toestel; max(100; zon_kast); 0)' },
    { code: 'veilig_nodig', formule: 'type_deur of borst < 850' },
    { code: 'toeslag_pct', formule: 'kleur_buiten_toeslag + kleur_binnen_toeslag' },
    { code: 'levertermijn', label: 'Levertermijn (weken)', formule: 'profiel_weken + als(toeslag_pct > 0; 1; 0) + als(zonwering <> "geen"; 1; 0) + als(type = "voordeur"; 2; 0)' },
    { code: 'montage_uren', formule: 'naarboven(1.5 + raam_m2 * 0.8 + als(type_schuif; 2; 0) + als(zonwering <> "geen"; 1.5; 0) + als(zon_n > 1; zon_n - 1; 0) + als(vent_toestel; 0.5; 0) + als(situatie = "renovatie"; 1; 0); 0.5)' },
    // Voor tekening en 3D.
    { code: 'kb', formule: 'kleur_buiten_kleur' },
    { code: 'randkleur', formule: 'als(afstandhouder_kleur <> ""; afstandhouder_kleur; "#1d1d1d")' },
    { code: 'ki', formule: 'als(kleur_binnen = "zelfde"; kleur_buiten_kleur; kleur_binnen_kleur)' },
    { code: 'profielsoort', formule: 'als(in(lak; "mat"; "structuur"; "glans"); lak_soort; profiel_soort)' },
    { code: 'glaskleur', formule: `als(glas_mat; "#eef1f2"; als(glas = "zon_gelaagd"; "#9fb5bd"; "${GLASKLEUR}"))` },
    { code: 'zonkleur', formule: 'als(zonwering = "screen"; screen_kleur_kleur; kleur_buiten_kleur)' },
    { code: 'vb_kleur', formule: 'als(type_deur; ""; vensterbank_kleur)' },
    { code: 'vb_soort', formule: 'als(type_deur; ""; vensterbank_soort)' },
    // Kleinhouten: aantal ruiten naast en boven elkaar per vak.
    { code: 'rk', formule: `als(${VAKKEN}; roeden_kol; 1)` },
    { code: 'rr', formule: `als(${VAKKEN}; roeden_rij; 1)` },
  ],
  regels: [
    { code: 'vak1_breed', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en kb1 > vak1_maxb', melding: 'Vak 1 wordt te breed voor deze opening. Kies meer vakken of maak het vak vast.' },
    { code: 'vak2_breed', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en n >= 2 en kb2 > vak2_maxb', melding: 'Vak 2 wordt te breed voor deze opening. Kies meer vakken of maak het vak vast.' },
    { code: 'vak3_breed', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en n >= 3 en kb3 > vak3_maxb', melding: 'Vak 3 wordt te breed voor deze opening. Kies meer vakken of maak het vak vast.' },
    { code: 'vak4_breed', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en n >= 4 en kb4 > vak4_maxb', melding: 'Vak 4 wordt te breed voor deze opening. Kies meer vakken of maak het vak vast.' },
    { code: 'vak1_hoog', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en kh1 > vak1_maxh', melding: 'Vak 1 wordt te hoog voor deze opening (kip: max 1 m hoog). Voeg een bovenlicht toe of kies een andere opening.' },
    { code: 'vak2_hoog', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en n >= 2 en kh2 > vak2_maxh', melding: 'Vak 2 wordt te hoog voor deze opening. Voeg een bovenlicht toe of kies een andere opening.' },
    { code: 'vak3_hoog', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en n >= 3 en kh3 > vak3_maxh', melding: 'Vak 3 wordt te hoog voor deze opening. Voeg een bovenlicht toe of kies een andere opening.' },
    { code: 'vak4_hoog', ernst: 'fout', als: 'in(type; "raam"; "terrasdeur") en n >= 4 en kh4 > vak4_maxh', melding: 'Vak 4 wordt te hoog voor deze opening. Voeg een bovenlicht toe of kies een andere opening.' },
    { code: 'vakbreedtes', ernst: 'fout', als: 'type_vakken en n >= 2 en n_auto = 0', melding: 'Alle vakken hebben een vaste breedte. Zet minstens één vak op 0, dan krijgt dat vak de rest.' },
    { code: 'vak_smal', ernst: 'fout', als: 'type_raster en n >= 2 en n_auto > 0 en kbmin < 250', melding: 'Een vak wordt smaller dan 25 cm. Maak de vaste breedtes kleiner of het kader breder.' },
    { code: 'deur_breed', ernst: 'fout', als: 'type = "voordeur" en nzl > 0 en (wb > 1200 of wb < 800)', melding: 'Met deze zijlichten wordt de deur zelf smaller dan 80 cm of breder dan 120 cm. Pas de breedte van het zijlicht of van het kader aan.' },
    { code: 'stolp', ernst: 'fout', als: 'niet stolp_ok', melding: 'Stolp: de linkse vleugel moet links scharnieren en de rechtse rechts (draai of draai-kip).' },
    { code: 'deel_breed', ernst: 'fout', als: 'type_delen en vb > type_deelb', melding: 'De delen worden te breed voor dit systeem. Kies meer delen.' },
    { code: 'deel_hoog', ernst: 'fout', als: 'type_delen en vh > type_deelh', melding: 'De delen worden te hoog voor dit systeem.' },
    { code: 'zwaar', ernst: 'fout', als: 'niet type_schuif en niet type_delen en beweeg > 0 en vleugel_kg > 130', melding: 'Een draaiende vleugel wordt zwaarder dan 130 kg. Kies smallere vakken of lichter glas.' },
    { code: 'schuif_zwaar', ernst: 'fout', als: 'type = "schuif" en vleugel_kg > 250', melding: 'Een schuifvleugel wordt zwaarder dan 250 kg. Kies een hef-schuifdeur of lichter glas.' },
    { code: 'deel_zwaar', ernst: 'fout', als: 'type_delen en beweeg > 0 en vleugel_kg > type_maxkg', melding: 'Een deel wordt te zwaar voor dit beslag (hef-schuif 400 kg, vouwwand 100 kg). Kies meer delen of lichter glas.' },
    {
      code: 'veiligheidsglas', ernst: 'fout', als: 'veilig_nodig en glas_m2 > 0 en niet glas_veilig',
      melding: 'Glas in een deur of lager dan 85 cm boven de vloer: gelaagd veiligheidsglas nodig (NBN S 23-002, te bevestigen).',
    },
    { code: 'valgevaar', ernst: 'waarschuwing', als: 'verdieping > 0 en (type_deur of borst < 850) en (beweeg > 0 of type_deur)', melding: 'Op de verdieping met een lage borstwering of een deur: valbeveiliging nodig (balustrade of vast glas, te bevestigen).' },
    { code: 'ventilatie', ernst: 'waarschuwing', als: 'ruimte_droog en type <> "voordeur" en niet rooster', melding: 'Droge ruimte zonder ventilatierooster of raamventilator: bij ventilatiesysteem C is luchttoevoer nodig (EPB, te bevestigen).' },
    { code: 'ventilator_smal', ernst: 'fout', als: 'vent_toestel en breedte - 2 * f < 400', melding: 'Te smal voor een raamventilator (de ventilator is minstens 36 cm breed): kies een zelfregelend rooster.' },
    { code: 'privacy', ernst: 'waarschuwing', als: 'in(ruimte; "badkamer"; "wc") en glas_m2 > 0 en niet glas_mat', melding: 'Badkamer of wc met helder glas: mat glas voor privacy?' },
    {
      code: 'statiek', ernst: 'fout', als: 'heeft_stijl en niet statiek_ok',
      melding: 'De tussenstijl buigt te ver door bij deze winddruk: kies een versterkte tussenstijl of een koppelprofiel (voordimensionering, te laten bevestigen).',
    },
    { code: 'rc2_glas', ernst: 'fout', als: 'rc2 en glas_m2 > 0 en niet glas_veilig', melding: 'Inbraakwerend (RC2) vraagt gelaagd glas.' },
    { code: 'uw', ernst: 'waarschuwing', als: 'uw > 1.5', melding: 'Uw hoger dan 1,5 W/m²K: controleer de EPB-eis (beter profiel of driedubbel glas).' },
    { code: 'screen_breed', ernst: 'fout', als: 'zonwering = "screen" en zon_bmax > 5000', melding: 'Een screen breder dan 5 m kan niet: kies twee of drie screens bij "Aantal screens".' },
    { code: 'screen_smal', ernst: 'fout', als: 'zonwering = "screen" en zon_n >= 2 en zon_bmin < 500', melding: 'Een screen wordt smaller dan 50 cm: kies minder screens of verdeel ze gelijk.' },
    { code: 'bovenlicht_klein', ernst: 'fout', als: '(bl > 0 of oh > 0) en khmin < 400', melding: 'Na het bovenlicht of het vak onderaan blijft er te weinig hoogte over voor de vakken.' },
  ],
  stuklijst: [
    { code: 'profiel', omschrijving: 'Profielen kader en vleugels', artikel: 'profiel_artikel', eenheid: 'lm', aantal: '1', lengte: 'profiel_lm * 1000', zaaglijst: true },
    { code: 'glas', omschrijving: 'Beglazing per vak (glasmaat)', artikel: 'glas_artikel', eenheid: 'm2', aantal: 'n', lengte: 'glasmaat_b', breedte: 'glasmaat_h', als: 'type <> "voordeur" en niet raster_vrij' },
    { code: 'glas_bl', omschrijving: 'Beglazing bovenlicht (glasmaat)', artikel: 'glas_artikel', eenheid: 'm2', aantal: '1', lengte: 'blglas_b', breedte: 'blglas_h', als: 'bl_door' },
    { code: 'glas_deur', omschrijving: 'Glasstrook deurpaneel (glasmaat)', artikel: 'glas_artikel', eenheid: 'm2', aantal: '1', lengte: '0.18 * gb + 2 * glasinstand - glasspeling', breedte: 'glasmaat_h', als: 'type = "voordeur" en paneel_glas en niet raster_vrij' },
    // Vrije indeling (ongelijke vakken, zijlicht, vak onderaan): al het glas in één regel, op de dagmaat.
    { code: 'glas_vrij', omschrijving: 'Beglazing (alle vakken)', artikel: 'glas_artikel', eenheid: 'm2', aantal: '1', lengte: '1000', breedte: '(glas_m2 - als(bl_door; glas_bl_m2; 0)) * 1000', als: 'raster_vrij en glas_m2 > 0' },
    { code: 'rand', omschrijving: 'Meerprijs afstandhouder', artikel: 'afstandhouder_artikel', eenheid: 'lm', aantal: '1', lengte: 'lg * 1000', als: 'glas_m2 > 0 en afstandhouder_artikel <> ""' },
    { code: 'versterking', omschrijving: 'Versterkte tussenstijl / regel', artikel: '"VERST-STIJL"', eenheid: 'lm', aantal: '1', lengte: 'stijl_lm * 1000', als: 'heeft_stijl en tussenstijl = "versterkt"' },
    { code: 'koppel', omschrijving: 'Koppelprofiel aluminium', artikel: '"KOPPELPROFIEL"', eenheid: 'lm', aantal: '1', lengte: 'stijl_lm * 1000', als: 'heeft_stijl en tussenstijl = "koppel"' },
    { code: 'paneel', omschrijving: 'Deurpaneel', artikel: 'paneel_artikel', eenheid: 'stuk', aantal: '1', als: 'type = "voordeur"' },
    { code: 'draai', omschrijving: 'Draaibeslag', artikel: '"BES-DRAAI"', eenheid: 'stuk', aantal: 'n_draai', als: 'type <> "voordeur"' },
    { code: 'draaikip', omschrijving: 'Draai-kipbeslag', artikel: '"BES-DRAAIKIP"', eenheid: 'stuk', aantal: 'n_draaikip' },
    { code: 'kip', omschrijving: 'Kipbeslag', artikel: '"BES-KIP"', eenheid: 'stuk', aantal: 'n_kip' },
    { code: 'schuif', omschrijving: 'Schuifbeslag', artikel: '"BES-SCHUIF"', eenheid: 'stuk', aantal: 'als(schuif_richting = "beide"; 2; 1)', als: 'type_schuif' },
    // Vouwwand: nog geen eigen beslag in de prijslijst; voorlopig het draaibeslag per deel.
    { code: 'vouw', omschrijving: 'Beslag vouwwand (per deel)', artikel: '"BES-DRAAI"', eenheid: 'stuk', aantal: 'n', als: 'type = "vouwwand"' },
    { code: 'deurslot', omschrijving: 'Meerpuntsluiting deur', artikel: '"BES-DEURSLOT"', eenheid: 'stuk', aantal: '1', als: 'in(type; "terrasdeur"; "voordeur"; "vouwwand")' },
    { code: 'greep', omschrijving: 'Greep voordeur', artikel: 'greep_artikel', eenheid: 'stuk', aantal: '1', als: 'type = "voordeur"' },
    { code: 'drempel', omschrijving: 'Drempelloze dorpel', artikel: '"DORPEL-DREMPELLOOS"', eenheid: 'lm', aantal: '1', lengte: 'breedte', als: 'type_deur en drempel = "drempelloos"' },
    { code: 'lak', omschrijving: 'Meerprijs kleur', artikel: '"LAK-TOESLAG"', eenheid: 'm2', aantal: 'toeslag_pct / 10', lengte: 'breedte', breedte: 'hoogte', als: 'toeslag_pct > 0' },
    { code: 'roeden', omschrijving: 'Roeden', artikel: '"ROEDE"', eenheid: 'lm', aantal: 'n', lengte: '(rk - 1) * gh + (rr - 1) * gb', als: 'in(type; "raam"; "terrasdeur") en roeden <> "geen"' },
    // Per screen een regel (één screen: de hele breedte, zoals vroeger); naast elkaar ook een middengeleider en een motor per screen.
    { code: 'zonwering', omschrijving: 'Zonwering', artikel: 'zonwering_artikel', eenheid: 'm2', aantal: '1', lengte: 'zb1', breedte: 'hoogte + zon_kast', als: 'zonwering <> "geen"' },
    { code: 'zonwering2', omschrijving: 'Zonwering, tweede screen', artikel: 'zonwering_artikel', eenheid: 'm2', aantal: '1', lengte: 'zb2', breedte: 'hoogte + zon_kast', als: 'zonwering = "screen" en zon_n >= 2' },
    { code: 'zonwering3', omschrijving: 'Zonwering, derde screen', artikel: 'zonwering_artikel', eenheid: 'm2', aantal: '1', lengte: 'zb3', breedte: 'hoogte + zon_kast', als: 'zonwering = "screen" en zon_n >= 3' },
    { code: 'middengeleider', omschrijving: 'Middengeleider tussen twee screens', artikel: '"ZON-MIDDENGELEIDER"', eenheid: 'lm', aantal: 'zon_n - 1', lengte: 'hoogte', als: 'zonwering = "screen" en zon_n >= 2' },
    { code: 'motor', omschrijving: 'Motor zonwering', artikel: '"ZON-MOTOR"', eenheid: 'stuk', aantal: 'zon_n', als: 'zonwering <> "geen" en in(bediening; "motor"; "domotica")' },
    { code: 'domotica', omschrijving: 'App-bediening en zonnesensor', artikel: '"ZON-DOMOTICA"', eenheid: 'stuk', aantal: '1', als: 'zonwering <> "geen" en bediening = "domotica"' },
    { code: 'hor', omschrijving: 'Inzethor', artikel: '"HOR-INZET"', eenheid: 'm2', aantal: 'n', lengte: 'gb', breedte: 'gh', als: 'vliegenraam = "inzet"' },
    { code: 'plisse', omschrijving: 'Plissé-vliegendeur', artikel: '"HOR-PLISSE"', eenheid: 'stuk', aantal: '1', als: 'vliegenraam = "plisse"' },
    { code: 'rooster', omschrijving: 'Ventilatierooster', artikel: '"ROOSTER"', eenheid: 'lm', aantal: '1', lengte: 'breedte - 2 * f', als: 'vent_rooster' },
    { code: 'ventilator', omschrijving: 'Raamventilator in een opzetkast (binnen, bovenop het kader)', artikel: '"RAAM-VENTILATOR"', eenheid: 'stuk', aantal: '1', als: 'vent_toestel' },
    { code: 'rc2', omschrijving: 'Meerprijs inbraakwerend beslag', artikel: '"RC2-TOESLAG"', eenheid: 'stuk', aantal: 'max(1; beweeg)', als: 'rc2' },
    { code: 'vensterbank', omschrijving: 'Vensterbank binnen', artikel: 'vensterbank_artikel', eenheid: 'lm', aantal: '1', lengte: 'breedte + 100', als: 'niet type_deur en vensterbank <> "geen"' },
    { code: 'dorpel', omschrijving: 'Dorpel buiten', artikel: 'dorpel_artikel', eenheid: 'lm', aantal: '1', lengte: 'breedte + 60', als: 'niet type_deur en dorpel <> "geen"' },
    { code: 'afbraak', omschrijving: 'Uitbreken en afvoeren oud raam', artikel: '"AFBRAAK-RAAM"', eenheid: 'stuk', aantal: '1', als: 'situatie = "renovatie"' },
    { code: 'dagkant', omschrijving: 'Afwerking dagkanten binnen', artikel: '"AFW-DAGKANT"', eenheid: 'lm', aantal: '1', lengte: '2 * hoogte + breedte', als: 'situatie = "renovatie" en afwerking' },
    { code: 'montage', omschrijving: 'Plaatsing', artikel: '"ARB-MONTAGE"', eenheid: 'uur', aantal: 'montage_uren', als: 'montage' },
  ],
  // Tekening van de eenvoudige indelingen (zoals vóór het raster). `berekenRaam` vervangt ze door de tekening van het raster.
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
      { code: 'roede_h', als: 'in(type; "raam"; "terrasdeur") en in(roeden; "kruis"; "liggend")', herhaal: 'n', x: 'f + i * stapx + f / 2', y: 'f + bl + vh / 2 - 12', breedte: 'vb - f', hoogte: '24', vulling: 'ki' },
      { code: 'rooster', als: 'vent_rooster', x: 'f', y: 'f * 0.3', breedte: 'breedte - 2 * f', hoogte: 'f * 0.4', vulling: '"#77797a"' },
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
      ['RAAM-VENTILATOR', 'Raamventilator met opzetkast', 'stuk', 340, 0],
      ['ZON-MIDDENGELEIDER', 'Middengeleider screens', 'lm', 38, 0],
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

/**
 * Berekent een raam of deur en zet er de tekening van het raster in (alle indelingen, met de symbolen per vak).
 * Dit is de functie voor het scherm en de offerte; `berekenConfiguratie(raamdeur, …)` geeft dezelfde cijfers,
 * maar met de eenvoudige tekening uit het model.
 */
export function berekenRaam(keuzes: Keuzes, opties: BerekenOpties = {}, prijslijst: Prijslijst = raamPrijslijst): ConfiguratieResultaat {
  const r = berekenConfiguratie(raamdeur, keuzes, prijslijst, opties);
  return { ...r, tekening: raamTekening(r) };
}

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

/** Glasbestelling per ruit uit een berekend raam (vakken, bovenlicht, vak onderaan, glasstrook van een voordeur). */
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
  if (a.raster_vrij === true) {
    // Vrije indeling: elke ruit met haar eigen dagmaat, in de volgorde van het raster.
    for (const v of rasterVan(r).vakken) {
      if (v.rol === 'deur') {
        if (k.paneel?.waarde === 'glasstrook') uit.push(ruit(uit.length + 1, 'glasstrook deur', 0.18 * (v.b - num(a.f)), v.h - num(a.f)));
      } else if (v.vulling === 'glas') uit.push(ruit(uit.length + 1, v.naam, v.dagB, v.dagH));
    }
    return uit;
  }
  if (type === 'voordeur') {
    if (k.paneel?.waarde === 'glasstrook') uit.push(ruit(1, 'glasstrook deur', 0.18 * num(a.gb), num(a.gh)));
  } else {
    for (let i = 0; i < n; i++) uit.push(ruit(uit.length + 1, n > 1 ? `vak ${i + 1}` : 'raam', num(a.gb), num(a.gh)));
  }
  if (num(a.bl) > 0) uit.push(ruit(uit.length + 1, 'bovenlicht', num(k.breedte?.waarde) - 2 * num(a.f), num(a.bl) - num(a.f)));
  return uit;
}
