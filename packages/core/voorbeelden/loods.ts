/**
 * Een loods of hal in staal als vast model met maten en opties (bouwsector): stalen portalen (kolommen en spanten) met
 * gordingen, wandregels en windverbanden, een dak en wanden in sandwichpanelen of geprofileerde plaat, betonpanelen
 * onderaan, poorten, een loopdeur en licht in het dak. Maten in cm. De 3D en de meetstaat staan in loods3d.ts, opgebouwd
 * uit de bouwdelen (src/bouwdelen.ts), zoals de bijgebouwen in hout.
 *
 * **Een voorstelling, geen berekening en geen nagelezen bouwdetail.** De grenzen, stappen en standaardwaarden komen uit
 * het voorstel in `docs/onderzoek-bouw-constructies.md`, hoofdstuk 3.6 (3.3 voor de richtwaarden), en dat document zegt
 * zelf dat geen enkele bron geopend kon worden: elk getal komt uit een zoekresultaat. Wat daar niet staat (welk profiel
 * bij welke overspanning, de afstand tussen de gordingen en de wandregels, de gevelkolommen, de maten van de loopdeur,
 * de lichtplaten, alle drempels in de regels) is hier zelf gekozen en staat erbij als «eigen keuze». **Een staalbouwer
 * of ingenieur rekent de portalen, de gordingen en de windverbanden**; dat zegt het model ook in elke configuratie.
 *
 * **Zonder prijzen**: een lege stuklijst en een lege prijslijst (`loodsPrijslijst`), zoals de bijgebouwen. Wat er nodig
 * is, staat in de meetstaat (`loodsMeetstaat`), in hoeveelheden.
 *
 * Geen merk- of productnamen. IPE en HEA zijn de gewone namen van de reeksen warmgewalste profielen.
 */
import type { BouwMateriaal, Keuzes, Keuzewaarde, Opbouw, OpbouwHerkomst, Prijslijst, ProductModel } from '../src/index.js';
import { RAL_KLEUREN } from './raam.js';
import { STAAL_AFWERKINGEN, staalMaterialen, staalprofiel } from './staalprofielen.js';

/** Het model heeft geen prijzen: een lege prijslijst volstaat voor de motor. */
export const loodsPrijslijst: Prijslijst = {};

const ONDERZOEK = 'docs/onderzoek-bouw-constructies.md, hoofdstuk 3.3 en 3.6';
const voorstel = (verwijzing: string): OpbouwHerkomst => ({ bron: 'onderzoek', verwijzing: `${ONDERZOEK}: ${verwijzing}`, nagelezen: false });
const eigenKeuze: OpbouwHerkomst = { bron: 'algemene kennis', verwijzing: 'Zelf gekozen voor het beeld; niet in een bron gelezen.', nagelezen: false };

// ---------- kleuren en materialen ----------

/**
 * Kleuren van dak- en wandbekleding (RAL). De kleuren op het scherm zijn benaderingen: kies met een echte kleurenwaaier.
 * Eigen keuze van gangbare kleuren voor loodsen; welke kleuren een leverancier echt heeft, is na te vragen.
 */
export const LOODS_KLEUREN: { code: string; label: string; kleur: string }[] = [
  { code: 'ral9002', label: 'Grijswit (RAL 9002)', kleur: '#dcdad0' },
  { code: 'ral9010', label: 'Zuiver wit (RAL 9010)', kleur: '#efeae0' },
  { code: 'ral7035', label: 'Lichtgrijs (RAL 7035)', kleur: '#c5c7c4' },
  { code: 'ral9006', label: 'Blank aluminiumkleurig (RAL 9006)', kleur: '#a5a6a5' },
  { code: 'ral7016', label: 'Antracietgrijs (RAL 7016)', kleur: '#3d4347' },
  { code: 'ral6005', label: 'Mosgroen (RAL 6005)', kleur: '#2f4a3b' },
  { code: 'ral8012', label: 'Roodbruin (RAL 8012)', kleur: '#6a3a2f' },
];

/**
 * Dak- en wandbekleding: sandwichpanelen in een paar diktes (mm) of een enkele geprofileerde staalplaat. Diktes uit het
 * onderzoek (3.3: dak 40 tot 150 mm, wand 40, 60, 80 mm, werkende breedte 1000 mm). Voor een enkele plaat telt de
 * golfhoogte (35 mm, eigen keuze) als dikte: zo dik tekent de 3D ze.
 */
const BEKLEDING_DAK = [40, 60, 80, 100, 120, 150];
const BEKLEDING_WAND = [40, 60, 80];
const PLAAT = 35;

/** Werkende breedte van een paneel (cm): de naden in de wand. Uit het onderzoek (3.3). */
export const PANEEL_BREEDTE = 100;
/** Hoogte van een betonpaneel (cm) en zijn dikte (mm). Eigen keuze. */
export const BETONPANEEL = { hoogte: 50, dikte: 140 };
/** Dikte van de vloerplaat (cm) die boven de grond uitsteekt. Eigen keuze, alleen voor het beeld. */
export const LOODS_VLOER = 15;

/**
 * De materialen van de loods: het staal (staalprofielen.ts) en per kleur een sandwichpaneel en een geprofileerde plaat
 * voor het dak en de wand, betonpanelen, lichtplaten en de vloer. `soort` en `kleur` zeggen hoe de 3D ze tekent: het
 * dak met ribben langs de helling (`zink`), een sandwichwand effen (de naden tekent loods3d.ts), een geprofileerde
 * wand met staande ribben.
 */
export const loodsMaterialen: Record<string, BouwMateriaal> = {
  ...staalMaterialen,
  betonpaneel: { label: 'Betonpaneel', soort: 'gevel', kleur: '#b8b5ad' },
  betonvloer: { label: 'Betonvloer', soort: 'gevel', kleur: '#a9a59c' },
  lichtplaat: { label: 'Lichtplaat in polycarbonaat', soort: 'matglas', kleur: '#e8eef0' },
};
for (const k of LOODS_KLEUREN) {
  const naam = k.label.charAt(0).toLowerCase() + k.label.slice(1);
  loodsMaterialen[`sandwich_dak_${k.code}`] = { label: `Sandwichpaneel dak, ${naam}`, soort: 'zink', kleur: k.kleur };
  loodsMaterialen[`sandwich_wand_${k.code}`] = { label: `Sandwichpaneel wand, ${naam}`, soort: 'gevel', kleur: k.kleur };
  loodsMaterialen[`plaat_dak_${k.code}`] = { label: `Geprofileerde staalplaat dak, ${naam}`, soort: 'zink', kleur: k.kleur };
  loodsMaterialen[`plaat_wand_${k.code}`] = { label: `Geprofileerde staalplaat wand, ${naam}`, soort: 'zink', kleur: k.kleur };
}

/**
 * De opbouw van de dak- of wandbekleding: één laag (een sandwichpaneel van `dikte` mm, of een geprofileerde plaat).
 * `bekleding` = `s40` … `s150` of `plaat`; `kleur` = een code uit `LOODS_KLEUREN`.
 */
export function loodsBekleding(waar: 'dak' | 'wand', bekleding: string, kleur: string): Opbouw {
  const plaat = bekleding === 'plaat', dikte = plaat ? PLAAT : Number(bekleding.replace(/^s/, '')) || 60;
  return {
    naam: `${waar === 'dak' ? 'Dak' : 'Wand'} van een loods, ${plaat ? 'geprofileerde staalplaat' : `sandwichpaneel ${dikte} mm`}`,
    soort: waar,
    uitleg: plaat ? 'Een enkele geprofileerde staalplaat, niet geïsoleerd.' : 'Een sandwichpaneel: twee staalplaten met isolatie ertussen, als één paneel geleverd.',
    lagen: [{ naam: plaat ? 'Geprofileerde staalplaat' : 'Sandwichpaneel', materiaal: `${plaat ? 'plaat' : 'sandwich'}_${waar}_${kleur}`, dikte, rol: 'afwerking_buiten' }],
    herkomst: voorstel(plaat ? 'enkele plaat als keuze (3.6); de golfhoogte van 35 mm: eigen keuze.' : 'sandwichpanelen, dak 40 tot 150 mm, wand 40, 60, 80 mm (3.3).'),
  };
}

/** Betonpanelen onderaan de wand: één laag van 14 cm. Eigen keuze. */
export const loodsBeton: Opbouw = {
  naam: 'Betonpanelen onderaan de wand',
  soort: 'wand',
  uitleg: 'Prefab betonpanelen tussen of voor de kolommen, onder de bekleding.',
  lagen: [{ naam: 'Betonpaneel', materiaal: 'betonpaneel', dikte: BETONPANEEL.dikte, rol: 'massief' }],
  herkomst: voorstel('betonnen wanden onderaan bij landbouwloodsen (3.2, 3.6); hoogte en dikte van een paneel: eigen keuze.'),
};

/** Lichtplaat of lichtstraat in het dak, even dik als het dak. */
export function loodsLichtplaat(dikte: number): Opbouw {
  return {
    naam: 'Lichtplaat in het dak',
    soort: 'dak',
    uitleg: 'Een lichtdoorlatende plaat in polycarbonaat in plaats van een dakpaneel.',
    lagen: [{ naam: 'Lichtplaat', materiaal: 'lichtplaat', dikte, rol: 'afwerking_buiten' }],
    herkomst: voorstel('lichtplaten in het dak als keuze (3.2, 3.6); maat en plaats: eigen keuze.'),
  };
}

/** De vloerplaat van de hal: alleen het zichtbare deel, zonder fundering. Eigen keuze. */
export const loodsVloer: Opbouw = {
  naam: 'Betonvloer',
  soort: 'vloer',
  uitleg: 'Alleen voor het beeld: de vloer en de fundering zitten niet in het werk van de staalbouwer.',
  lagen: [{ naam: 'Betonvloer', materiaal: 'betonvloer', dikte: LOODS_VLOER * 10, rol: 'massief' }],
  herkomst: eigenKeuze,
};

// ---------- keuzelijsten ----------

/** Hellingen van 6° tot 20° met hun tangens en cosinus (de formuletaal kent geen tan of cos). Uit het onderzoek (3.3, 3.6). */
const HELLINGEN: Keuzewaarde[] = Array.from({ length: 15 }, (_, i) => 6 + i).map((g) => ({
  code: `h${g}`, label: `${g}°`,
  eigenschappen: { graden: g, tan: Math.round(Math.tan((g * Math.PI) / 180) * 1e6) / 1e6, cos: Math.round(Math.cos((g * Math.PI) / 180) * 1e6) / 1e6 },
}));
const kleurKeuzes: Keuzewaarde[] = LOODS_KLEUREN.map((k) => ({ code: k.code, label: k.label, eigenschappen: { kleur: k.kleur } }));
const GEVELS: Keuzewaarde[] = [
  { code: 'geen', label: 'Geen' },
  { code: 'voor', label: 'Voorgevel' },
  { code: 'achter', label: 'Achtergevel' },
  { code: 'links', label: 'Linker zijgevel' },
  { code: 'rechts', label: 'Rechter zijgevel' },
];

/**
 * Profielen voor de draagstructuur, per overspanning: een **voorstelling voor het beeld, geen berekening** (eigen keuze,
 * in de orde van grootte van gangbare hallen). Een staalbouwer kiest de echte profielen; het model zegt het.
 */
const profielNaar = (stappen: [number, string][], laatste: string, maat: string) => stappen.reduceRight((rest, [tot, p]) => `als(${maat} <= ${tot}; "${p}"; ${rest})`, `"${laatste}"`);
const SPANT: [number, string][] = [[900, 'IPE 240'], [1200, 'IPE 270'], [1500, 'IPE 300'], [1800, 'IPE 360'], [2200, 'IPE 400'], [2600, 'IPE 450']];
const KOLOM: [number, string][] = [[1200, 'HEA 200'], [1800, 'HEA 240'], [2400, 'HEA 280']];
const cm = (p: string, maat: 'hoogte' | 'breedte') => staalprofiel(p)[maat] / 10;
const maatNaar = (stappen: [number, string][], laatste: string, maat: string, kant: 'hoogte' | 'breedte') => stappen.reduceRight((rest, [tot, p]) => `als(${maat} <= ${tot}; ${cm(p, kant)}; ${rest})`, `${cm(laatste, kant)}`);

const poortKenmerken = (n: number) => [
  {
    code: `poort${n}_gevel`, label: `Poort ${n}: gevel`, stap: 'poorten', type: 'keuze' as const, standaard: n === 1 ? 'voor' : 'geen', keuzes: GEVELS,
    helptekst: 'In welke gevel de poort zit. In een kopgevel (voor of achter) worden de poorten over de breedte verdeeld; in een zijgevel kies je de travee.',
  },
  {
    code: `poort${n}_soort`, label: `Poort ${n}: soort`, stap: 'poorten', type: 'keuze' as const, standaard: 'sectionaal', zichtbaarAls: `poort${n}_gevel <> "geen"`,
    keuzes: [{ code: 'sectionaal', label: 'Sectionale poort' }, { code: 'roldeur', label: 'Roldeur' }],
  },
  { code: `poort${n}_breedte`, label: `Poort ${n}: breedte`, stap: 'poorten', type: 'getal' as const, eenheid: 'cm', min: 200, max: 800, stapgrootte: 25, standaard: 400, zichtbaarAls: `poort${n}_gevel <> "geen"` },
  { code: `poort${n}_hoogte`, label: `Poort ${n}: hoogte`, stap: 'poorten', type: 'getal' as const, eenheid: 'cm', min: 225, max: 600, stapgrootte: 25, standaard: 400, zichtbaarAls: `poort${n}_gevel <> "geen"` },
  {
    code: `poort${n}_travee`, label: `Poort ${n}: travee`, stap: 'poorten', type: 'getal' as const, min: 1, max: 'traveeen', stapgrootte: 1, standaard: n,
    zichtbaarAls: `in(poort${n}_gevel; "links"; "rechts")`, helptekst: 'De travee in de zijgevel, geteld van voor naar achter. De poort staat in het midden tussen twee kolommen.',
  },
];

/** Hoeveel poorten een gevel heeft, en hun samen breedte, als formule. */
const opGevel = (g: string) => [1, 2, 3].map((n) => `als(poort${n}_gevel = "${g}"; 1; 0)`).join(' + ');
const breedteOp = (g: string) => [1, 2, 3].map((n) => `als(poort${n}_gevel = "${g}"; poort${n}_breedte; 0)`).join(' + ');

/** Maten van de loopdeur (cm). Eigen keuze. */
export const LOOPDEUR = { breedte: 100, hoogte: 210, rand: 100 };
/** Zoveel plaats komt er minstens naast een poort in een kopgevel: voor een gevelkolom (cm). Eigen keuze. */
export const POORT_MARGE = 60;
/** Zoveel plaats komt er naast een poort in een zijgevel, tussen de poort en de kolom: voor een poortstijl (cm). Eigen keuze. */
export const POORTSTIJL_MARGE = 25;

/**
 * Loods of hal in staal (zie `loodsVertrekpunten`). Maten in cm: de breedte is de overspanning (buitenkant tot buitenkant
 * van de kolommen), de lengte is het aantal traveeën × de afstand tussen de portalen (hart op hart), de zijhoogte is de
 * vrije hoogte onder het spant aan de gevel (bij een lessenaarsdak aan de lage kant, rechts). De voorgevel is de kopgevel
 * waar je binnenkomt.
 *
 * **Voorstel, na te lezen door een staalbouwer** (zie bovenaan dit bestand). Uit het onderzoek (3.6): de grenzen,
 * stappen en standaardwaarden van breedte, portaalafstand, traveeën, zijhoogte, dakhelling en poorten, de dakvormen,
 * de diktes van de sandwichpanelen, de betonpanelen tot 1, 2 of 3 m. Eigen keuze: de profielen, de kleuren, de loopdeur,
 * de lichtplaten, en alle drempels in de regels.
 */
export const loods: ProductModel = {
  code: 'LOODS',
  naam: 'Loods of hal in staal',
  versie: 1,
  maateenheid: 'cm',
  stappen: [
    { code: 'maten', label: 'Maten' },
    { code: 'dak', label: 'Dak' },
    { code: 'wanden', label: 'Wanden' },
    { code: 'poorten', label: 'Poorten' },
    { code: 'deur', label: 'Loopdeur' },
    { code: 'afwerking', label: 'Kleur en staal' },
  ],
  kenmerken: [
    { code: 'breedte', label: 'Breedte (overspanning)', stap: 'maten', type: 'getal', eenheid: 'cm', min: 600, max: 3000, stapgrootte: 100, standaard: 1500, helptekst: 'Buitenkant tot buitenkant van de kolommen, zonder bekleding.' },
    { code: 'afstand', label: 'Afstand tussen de portalen', stap: 'maten', type: 'getal', eenheid: 'cm', min: 500, max: 800, stapgrootte: 50, standaard: 600, helptekst: 'Hart op hart; één travee.' },
    { code: 'traveeen', label: 'Aantal traveeën', stap: 'maten', type: 'getal', min: 2, max: 20, stapgrootte: 1, standaard: 5, helptekst: 'De lengte is het aantal traveeën × de afstand tussen de portalen.' },
    { code: 'zijhoogte', label: 'Zijhoogte', stap: 'maten', type: 'getal', eenheid: 'cm', min: 300, max: 800, stapgrootte: 50, standaard: 450, helptekst: 'Vrije hoogte onder het spant aan de gevel; bij een lessenaarsdak aan de lage kant (rechts).' },
    {
      code: 'dakvorm', label: 'Dakvorm', stap: 'dak', type: 'keuze', standaard: 'zadel',
      keuzes: [{ code: 'zadel', label: 'Zadeldak (nok in het midden, over de lengte)' }, { code: 'lessenaar', label: 'Lessenaarsdak (loopt af naar rechts)' }],
    },
    { code: 'helling', label: 'Dakhelling', stap: 'dak', type: 'keuze', standaard: 'h10', keuzes: HELLINGEN, helptekst: 'Industrie meestal 6° tot 10°, landbouw tot 20°.' },
    {
      code: 'dak_bekleding', label: 'Dakbekleding', stap: 'dak', type: 'keuze', standaard: 's60',
      keuzes: [
        ...BEKLEDING_DAK.map((d) => ({ code: `s${d}`, label: `Sandwichpaneel ${d} mm`, eigenschappen: { dikte: d / 10 } })),
        { code: 'plaat', label: 'Enkele geprofileerde staalplaat (niet geïsoleerd)', eigenschappen: { dikte: PLAAT / 10 } },
      ],
    },
    { code: 'dak_kleur', label: 'Kleur van het dak', stap: 'dak', type: 'keuze', standaard: 'ral9002', keuzes: kleurKeuzes },
    {
      code: 'daklicht', label: 'Licht in het dak', stap: 'dak', type: 'keuze', standaard: 'geen',
      keuzes: [
        { code: 'geen', label: 'Geen' },
        { code: 'lichtplaten', label: 'Lichtplaten (één per travee en per dakvlak)' },
        { code: 'lichtstraat', label: 'Lichtstraat (een strook over de lengte)' },
      ],
    },
    {
      code: 'wand_bekleding', label: 'Wandbekleding', stap: 'wanden', type: 'keuze', standaard: 's60',
      keuzes: [
        ...BEKLEDING_WAND.map((d) => ({ code: `s${d}`, label: `Sandwichpaneel ${d} mm`, eigenschappen: { dikte: d / 10 } })),
        { code: 'plaat', label: 'Enkele geprofileerde staalplaat (niet geïsoleerd)', eigenschappen: { dikte: PLAAT / 10 } },
      ],
    },
    { code: 'wand_kleur', label: 'Kleur van de wanden', stap: 'wanden', type: 'keuze', standaard: 'ral9002', keuzes: kleurKeuzes },
    {
      code: 'beton', label: 'Betonpanelen onderaan', stap: 'wanden', type: 'keuze', standaard: 'b0',
      keuzes: [0, 100, 200, 300].map((h) => ({ code: `b${h}`, label: h ? `Tot ${h / 100} m hoog` : 'Geen', eigenschappen: { hoogte: h } })),
      helptekst: 'Een sokkel van betonpanelen rondom, bv. voor een landbouwloods.',
    },
    ...poortKenmerken(1), ...poortKenmerken(2), ...poortKenmerken(3),
    { code: 'poort_vensters', label: 'Vensters in de sectionale poorten', stap: 'poorten', type: 'janee', standaard: false },
    {
      code: 'poort_kleur', label: 'Kleur van de poorten', stap: 'poorten', type: 'keuze', standaard: 'antraciet',
      keuzes: RAL_KLEUREN.map((k) => ({ code: k.code, label: `${k.naam} (RAL ${k.ral})`, eigenschappen: { kleur: k.hex } })),
    },
    { code: 'loopdeur_gevel', label: 'Loopdeur: gevel', stap: 'deur', type: 'keuze', standaard: 'voor', keuzes: GEVELS, helptekst: 'Een deur van 1 m breed. In een kopgevel staat ze links (gezien van buiten), 1 m van de hoek.' },
    {
      code: 'loopdeur_travee', label: 'Loopdeur: travee', stap: 'deur', type: 'getal', min: 1, max: 'traveeen', stapgrootte: 1, standaard: 1,
      zichtbaarAls: 'in(loopdeur_gevel; "links"; "rechts")', helptekst: 'Geteld van voor naar achter. Staat er ook een poort in die travee, dan komt de deur ernaast.',
    },
    {
      code: 'staal', label: 'Afwerking van het staal', stap: 'afwerking', type: 'keuze', standaard: 'verzinkt',
      keuzes: STAAL_AFWERKINGEN.filter((a) => a.code !== 'inox').map((a) => ({ code: a.code, label: a.label })),
    },
    { code: 'deur_kleur', label: 'Kleur van de loopdeur', stap: 'afwerking', type: 'keuze', standaard: 'ral7016', keuzes: kleurKeuzes },
  ],
  afgeleid: [
    { code: 'lengte', label: 'Lengte (cm)', formule: 'traveeen * afstand' },
    { code: 'portalen', label: 'Aantal portalen', formule: 'traveeen + 1' },
    { code: 'graden', label: 'Dakhelling (graden)', formule: 'helling_graden' },
    { code: 'tan', formule: 'helling_tan' },
    { code: 'cos', formule: 'helling_cos' },
    // Profielen: een voorstelling voor het beeld (eigen keuze), geen berekening.
    { code: 'spant_profiel', label: 'Spant (voorstelling)', formule: profielNaar(SPANT, 'IPE 500', 'breedte') },
    { code: 'spant_h', formule: maatNaar(SPANT, 'IPE 500', 'breedte', 'hoogte') },
    { code: 'kolom_profiel', label: 'Kolom (voorstelling)', formule: profielNaar(KOLOM, 'HEA 320', 'breedte') },
    { code: 'kolom_h', formule: maatNaar(KOLOM, 'HEA 320', 'breedte', 'hoogte') },
    { code: 'kolom_b', formule: maatNaar(KOLOM, 'HEA 320', 'breedte', 'breedte') },
    { code: 'gording_profiel', label: 'Gording (voorstelling)', formule: 'als(afstand <= 500; "Z 150 × 2"; als(afstand <= 650; "Z 200 × 2"; "Z 250 × 2,5"))' },
    { code: 'gording_h', formule: 'als(afstand <= 500; 15; als(afstand <= 650; 20; 25))' },
    { code: 'wandregel_profiel', label: 'Wandregel (voorstelling)', formule: 'als(afstand <= 650; "Z 150 × 2"; "Z 200 × 2")' },
    { code: 'wandregel_h', formule: 'als(afstand <= 650; 15; 20)' },
    { code: 'gevelkolom_profiel', label: 'Gevelkolom (voorstelling)', formule: 'als(zijhoogte <= 600; "HEA 160"; "HEA 200")' },
    { code: 'dak_dikte', formule: 'dak_bekleding_dikte' },
    { code: 'wand_dikte', formule: 'wand_bekleding_dikte' },
    { code: 'beton_h', label: 'Hoogte van de betonpanelen (cm)', formule: 'beton_hoogte' },
    // Het hoogste punt boven de vloer, zoals de 3D het tekent (een test houdt beide gelijk): de onderkant van het spant
    // aan de gevel, de stijging tot de nok of de hoge kant, en daarboven spant, gording en dak (dwars op de helling),
    // en de nokkap (zadeldak) of de dakrand (lessenaar; die staat aan de hoge kant buiten de wand, met de oversteek van 10 cm).
    {
      code: 'tophoogte', label: 'Hoogste punt boven de vloer (cm)',
      formule: 'afronden(zijhoogte + als(dakvorm = "zadel"; breedte / 2; breedte + wandregel_h + wand_dikte + 10) * tan + (spant_h + gording_h + dak_dikte) / cos + als(dakvorm = "zadel"; 4; 3); 0)',
    },
    { code: 'vloer_m2', label: 'Vloeroppervlakte binnen de kolommen (m²)', formule: 'afronden(breedte * lengte / 10000; 1)' },
    { code: 'dak_lengte', label: 'Lengte van een dakpaneel langs de helling (cm)', formule: 'afronden(als(dakvorm = "zadel"; breedte / 2; breedte) / cos + 60; 0)' },
    { code: 'poorten_voor', formule: opGevel('voor') },
    { code: 'poorten_achter', formule: opGevel('achter') },
    { code: 'breedte_voor', formule: breedteOp('voor') },
    { code: 'breedte_achter', formule: breedteOp('achter') },
    { code: 'deur_voor', formule: `als(loopdeur_gevel = "voor"; ${LOOPDEUR.rand + LOOPDEUR.breedte + POORT_MARGE}; 0)` },
    { code: 'deur_achter', formule: `als(loopdeur_gevel = "achter"; ${LOOPDEUR.rand + LOOPDEUR.breedte + POORT_MARGE}; 0)` },
    { code: 'deur_kleur_hex', formule: 'deur_kleur_kleur' },
  ],
  regels: [
    {
      code: 'staalbouwer', ernst: 'waarschuwing', als: 'waar',
      melding: 'Een staalbouwer of ingenieur rekent de portalen, de gordingen, de wandregels en de windverbanden. De profielen in dit model zijn een voorstelling, geen berekening.',
    },
    {
      code: 'vergunning', ernst: 'waarschuwing', als: 'waar',
      melding: 'Na te kijken: een loods of hal vraagt een omgevingsvergunning. Vraag het na bij de gemeente.',
    },
    {
      code: 'overspanning_groot', ernst: 'waarschuwing', als: 'breedte > 2400',
      melding: 'Een overspanning van meer dan 24 m valt buiten de ontwerpgrafieken die het onderzoek vond (10 tot 24 m). Vraag de staalbouwer of gewone portalen nog volstaan, of dat er een vakwerkspant of een tussenkolom nodig is.',
    },
    {
      code: 'overspanning_klein', ernst: 'waarschuwing', als: 'breedte < 1000',
      melding: 'Een overspanning van minder dan 10 m valt buiten de ontwerpgrafieken die het onderzoek vond (10 tot 24 m). Voor zo\'n kleine hal kiest een staalbouwer misschien lichtere profielen of een bouwpakket.',
    },
    {
      code: 'portalen_ver', ernst: 'waarschuwing', als: 'afstand > 700',
      melding: 'De portalen staan meer dan 7 m uit elkaar: de gordingen en de wandregels worden zwaarder. Laat de staalbouwer kiezen tussen zwaardere gordingen en meer portalen.',
    },
    {
      code: 'dakpaneel_lang', ernst: 'waarschuwing', als: 'dak_bekleding <> "plaat" en dak_lengte > 2050',
      melding: 'Het dakvlak is langer dan de langste sandwichpanelen (± 20,5 m volgens het onderzoek): het dak krijgt een naad over de lengte.',
    },
    {
      code: 'beton_hoog', ernst: 'fout', als: 'beton_h > zijhoogte - 100',
      melding: 'De betonpanelen zijn te hoog voor deze zijhoogte: er moet minstens 1 m bekleding boven blijven. Kies lagere betonpanelen of een hogere zijhoogte.',
    },
    ...[1, 2, 3].flatMap((n) => [
      {
        code: `poort${n}_hoog`, ernst: 'fout' as const, als: `poort${n}_gevel <> "geen" en poort${n}_hoogte > zijhoogte - 30`,
        melding: `Poort ${n} is te hoog voor deze zijhoogte: boven de poort is minstens 30 cm nodig voor een ligger. Kies een lagere poort of een hogere zijhoogte.`,
      },
      {
        code: `poort${n}_kolommen`, ernst: 'fout' as const, als: `in(poort${n}_gevel; "links"; "rechts") en poort${n}_breedte > afstand - kolom_b - ${2 * POORTSTIJL_MARGE}`,
        melding: `Poort ${n} past niet tussen twee kolommen van de zijgevel: ze is breder dan de travee min de kolom en de poortstijlen. Kies een smallere poort, een grotere afstand tussen de portalen, of zet de poort in een kopgevel.`,
      },
      {
        code: `poort${n}_vensters`, ernst: 'waarschuwing' as const, als: `poort${n}_gevel <> "geen" en poort${n}_soort = "sectionaal" en poort_vensters en (poort${n}_breedte > 400 of poort${n}_hoogte > 450)`,
        melding: `Poort ${n}: een sectionale poort met vensters is bij één fabrikant hoogstens 4 × 4,5 m (onderzoek 3.3). Na te vragen bij de leverancier.`,
      },
      {
        code: `poort${n}_deur`, ernst: 'fout' as const,
        als: `in(poort${n}_gevel; "links"; "rechts") en loopdeur_gevel = poort${n}_gevel en loopdeur_travee = poort${n}_travee en poort${n}_breedte + ${LOOPDEUR.breedte + 3 * 40} > afstand - kolom_b`,
        melding: `De loopdeur past niet naast poort ${n} in dezelfde travee. Zet de deur in een andere travee of kies een smallere poort.`,
      },
    ]),
    ...([[1, 2], [1, 3], [2, 3]] as const).map(([a, b]) => ({
      code: `poorten_${a}_${b}_samen`, ernst: 'fout' as const,
      als: `in(poort${a}_gevel; "links"; "rechts") en poort${a}_gevel = poort${b}_gevel en poort${a}_travee = poort${b}_travee`,
      melding: `Poort ${a} en poort ${b} staan in dezelfde travee van dezelfde zijgevel. Kies een andere travee voor een van beide.`,
    })),
    ...(['voor', 'achter'] as const).map((g) => ({
      code: `kopgevel_${g}_vol`, ernst: 'fout' as const, als: `poorten_${g} > 0 en breedte_${g} + (poorten_${g} + 1) * ${POORT_MARGE} + deur_${g} > breedte`,
      melding: `De poorten${g === 'voor' ? ' in de voorgevel' : ' in de achtergevel'} passen niet naast elkaar (met de loopdeur, als die er staat): naast elke poort is plaats nodig voor een gevelkolom. Kies smallere of minder poorten, of een bredere hal.`,
    })),
  ],
  stuklijst: [],
  prijs: { opslagProcent: 0, btwProcent: 0 },
};

/**
 * Vertrekpunten van de loods: de keuzes waarmee een verkoper begint. Alles wat hier niet staat, heeft de standaardwaarde
 * van het model. De hal van 15 × 30 m volgt de standaardwaarden van het onderzoek (3.6); de landbouwloods en de
 * werkplaats zijn zelf gekozen voor een mooi begin.
 */
export const loodsVertrekpunten: Record<'hal' | 'landbouw' | 'werkplaats', { label: string; keuzes: Keuzes }> = {
  hal: {
    label: 'Hal van 15 × 30 m',
    keuzes: { breedte: 1500, afstand: 600, traveeen: 5, zijhoogte: 450, dakvorm: 'zadel', helling: 'h10', daklicht: 'lichtstraat', wand_kleur: 'ral9002', dak_kleur: 'ral9002', poort_kleur: 'antraciet', deur_kleur: 'ral7016' },
  },
  landbouw: {
    label: 'Landbouwloods met lessenaarsdak',
    keuzes: {
      breedte: 1200, afstand: 500, traveeen: 6, zijhoogte: 500, dakvorm: 'lessenaar', helling: 'h10', dak_bekleding: 'plaat', wand_bekleding: 'plaat',
      dak_kleur: 'ral7016', wand_kleur: 'ral6005', beton: 'b200', daklicht: 'lichtplaten',
      poort1_gevel: 'voor', poort1_soort: 'roldeur', poort1_breedte: 450, poort1_hoogte: 425,
      poort2_gevel: 'rechts', poort2_soort: 'roldeur', poort2_breedte: 400, poort2_hoogte: 400, poort2_travee: 2,
      loopdeur_gevel: 'rechts', loopdeur_travee: 4, poort_kleur: 'ral7039', deur_kleur: 'ral7016',
    },
  },
  werkplaats: {
    label: 'Werkplaats met twee poorten',
    keuzes: {
      breedte: 1000, afstand: 600, traveeen: 3, zijhoogte: 400, dakvorm: 'zadel', helling: 'h15', dak_bekleding: 's80', wand_bekleding: 's60',
      dak_kleur: 'ral7016', wand_kleur: 'ral7016', poort1_gevel: 'voor', poort1_breedte: 350, poort1_hoogte: 350, poort2_gevel: 'voor', poort2_breedte: 350, poort2_hoogte: 350,
      loopdeur_gevel: 'links', loopdeur_travee: 1, poort_vensters: true, poort_kleur: 'ral9006', deur_kleur: 'ral9002', staal: 'ral7016',
    },
  },
};
