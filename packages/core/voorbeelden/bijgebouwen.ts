/**
 * Bijgebouwen in hout als vaste modellen met maten en opties (bouwsector): een **overkapping** (carport,
 * terrasoverkapping of pergola) en een **tuinhuis of poolhouse**. Maten in cm. De 3D en de meetstaat staan in
 * bijgebouwen3d.ts; die bouwen elk model op uit de bouwdelen (src/bouwdelen.ts).
 *
 * **Dit zijn voorstellen, geen nagelezen bouwdetails en geen berekening.** De grenzen, stappen en standaardwaarden
 * komen uit het voorstel in `docs/onderzoek-bouw-constructies.md`, hoofdstuk 1.6, en dat document zegt zelf dat geen
 * enkele bron geopend kon worden: elk getal komt uit een zoekresultaat. Wat daar niet in staat (de doorsnede van de
 * liggers bij een zwaardere paal, de grootste overspanning van de dakbalken, de maten van deuren en ramen, de
 * hellingen) is hier zelf gekozen en staat erbij als «eigen keuze». Een aannemer of houtbouwer moet elk model nalezen
 * vóór het aan een klant getoond wordt als iets wat hij ook zo bouwt. Wat draagt (palen, liggers, dakbalken, spanten)
 * rekent een ingenieur of de fabrikant na.
 *
 * **Zonder prijzen.** De modellen hebben een lege stuklijst; de motor vraagt een prijslijst en krijgt een lege
 * (`bijgebouwPrijslijst`). De prijs in het resultaat van de motor is daardoor altijd nul en hoort nergens getoond te
 * worden. Wat er nodig is, staat in de meetstaat (`bijgebouwMeetstaat`), in hoeveelheden.
 *
 * Geen merk- of productnamen: de houtsoorten en bekledingen zijn soortnamen.
 */
import type { BouwMateriaal, Keuzes, Opbouw, OpbouwHerkomst, Prijslijst, ProductModel } from '../src/index.js';
import { bouwMaterialen } from './opbouwen.js';

/** De modellen hebben geen prijzen: een lege prijslijst volstaat voor de motor. */
export const bijgebouwPrijslijst: Prijslijst = {};

// ---------- materialen ----------

/** Hout van de draagstructuur (palen, liggers, dakbalken): soort of kleur. De kleuren zijn zelf gekozen. */
const STRUCTUURHOUT: Record<string, { label: string; kleur: string }> = {
  douglas: { label: 'Douglas', kleur: '#c58f5c' },
  eik: { label: 'Eik', kleur: '#b39264' },
  thermisch: { label: 'Thermisch behandeld naaldhout', kleur: '#7b573a' },
  zwart: { label: 'Zwart gebeitst', kleur: '#2c2a28' },
  grijs: { label: 'Grijs gebeitst', kleur: '#8d8a84' },
};

/** Hout van de gevelbekleding: soort of kleur. De kleuren zijn zelf gekozen. */
const GEVELHOUT: Record<string, { label: string; kleur: string }> = {
  thermisch_naaldhout: { label: 'Thermisch behandeld naaldhout', kleur: '#7a5638' },
  thermisch_essen: { label: 'Thermisch behandeld essen', kleur: '#6a4a31' },
  eik: { label: 'Eik', kleur: '#a98a5e' },
  schuurhout: { label: 'Oud schuurhout', kleur: '#81766a' },
  zwart: { label: 'Zwart gebeitst', kleur: '#2d2b29' },
};

/**
 * De materialen van de bijgebouwen: die van de voorbeeldopbouwen (opbouwen.ts) met het hout, de bekleding, de
 * dakbedekking en de verharding van de bijgebouwen erbij. `soort` en `kleur` zeggen hoe de 3D ze tekent.
 * Van elke gevelbekleding zijn er twee: staande planken (`gevel_<hout>_staand`) en liggende (`gevel_<hout>_liggend`).
 */
export const bijgebouwMaterialen: Record<string, BouwMateriaal> = {
  ...bouwMaterialen,
  // Dak. Het dakbeschot bestaat twee keer: de planken liggen dwars op de dakbalken, en de 3D tekent planken op een
  // liggend vlak langs z (`planken`) of langs x (`planken_h`).
  dakbeschot: { label: 'Dakbeschot, planken', soort: 'planken', kleur: '#d8bc8e' },
  dakbeschot_dwars: { label: 'Dakbeschot, planken', soort: 'planken_h', kleur: '#d8bc8e' },
  dakpannen_antraciet: { label: 'Keramische dakpannen, antraciet', soort: 'pannen', kleur: '#3f4245' },
  dakleien: { label: 'Leien', soort: 'leien', kleur: '#3b3f45' },
  dakzink: { label: 'Zink met staande naad', soort: 'zink', kleur: '#8d979c' },
  dakglas: { label: 'Gelaagd glas (dak)', soort: 'glas', kleur: '#bcd0d6' },
  polycarbonaat: { label: 'Polycarbonaatplaat', soort: 'matglas', kleur: '#dde7ea' },
  // Wanden.
  wandglas: { label: 'Glazen wand', soort: 'glas', kleur: '#bcd0d6' },
  binnenpaneel: { label: 'Binnenbekleding in plaat', soort: 'gevel', kleur: '#e2d6bd' },
  // Vloer en verharding.
  klinkers: { label: 'Klinkers', soort: 'steen', kleur: '#8d6455', voeg: '#6f6a63' },
  terrastegels: { label: 'Terrastegels 60 × 60', soort: 'tegel', kleur: '#a8a49b' },
  terrasplanken: { label: 'Terrasplanken', soort: 'planken', kleur: '#8f6f50' },
  betonplaat: { label: 'Betonplaat', soort: 'gevel', kleur: '#b9b6ae' },
};
for (const [code, h] of Object.entries(STRUCTUURHOUT)) bijgebouwMaterialen[`hout_${code}`] = { label: `${h.label} (draagstructuur)`, soort: 'hout', kleur: h.kleur };
for (const [code, h] of Object.entries(GEVELHOUT)) {
  const naam = h.label.toLowerCase();
  bijgebouwMaterialen[`gevel_${code}_staand`] = { label: `Gevelbekleding ${naam}, staande planken`, soort: 'planken', kleur: h.kleur };
  bijgebouwMaterialen[`gevel_${code}_liggend`] = { label: `Gevelbekleding ${naam}, liggende planken`, soort: 'planken_h', kleur: h.kleur };
}

// ---------- opbouwen ----------

const ONDERZOEK = 'docs/onderzoek-bouw-constructies.md, hoofdstuk 1.3 en 1.6';
const voorstel = (verwijzing: string): OpbouwHerkomst => ({ bron: 'onderzoek', verwijzing: `${ONDERZOEK}: ${verwijzing}`, nagelezen: false });
const eigenKeuze: OpbouwHerkomst = { bron: 'algemene kennis', verwijzing: 'Zelf gekozen voor het beeld; niet in een bron gelezen.', nagelezen: false };

/** Dakbalken en kepers: 5 × 15 cm om de 48 cm (uit het onderzoek, 1.3). Onder glas of kunststofplaat om de 80 cm (eigen keuze). */
const DAKBALK = { breedte: 50, hoogte: 150, hoh: 480, hohPlaat: 800 };
/**
 * Hoogte van de latei boven een deur of raam in een wand van een bijgebouw (mm). Eigen keuze. De 3D maakt de latei
 * hoger als er boven de opening maar weinig plaats is: dan vult ze de ruimte tot de bovenregel.
 */
export const BIJGEBOUW_LATEI = 90;

export type BijgebouwBedekking = 'epdm' | 'zink' | 'pannen' | 'pannen_antraciet' | 'leien' | 'polycarbonaat' | 'glas' | 'open';

/**
 * De opbouw van het dak van een bijgebouw, van onder naar boven: dakbalken of kepers in het hout van de draagstructuur
 * (zichtbaar van onderen), daarop het dakbeschot en de bedekking. `open` = alleen de balken (pergola).
 * `beschot` = `dakbeschot` of `dakbeschot_dwars`, zodat de planken dwars op de balken liggen. `geisoleerd` legt een
 * isolatieplaat op het beschot (warm dak, voor een poolhouse).
 */
export function bijgebouwDak(bedekking: BijgebouwBedekking, hout: string, beschot: 'dakbeschot' | 'dakbeschot_dwars' = 'dakbeschot', geisoleerd = false): Opbouw {
  const plaat = bedekking === 'glas' || bedekking === 'polycarbonaat';
  const balken: Opbouw['lagen'][number] = {
    naam: 'Dakbalken', materiaal: hout, dikte: DAKBALK.hoogte, rol: 'skelet', hout: { breedte: DAKBALK.breedte, hoh: plaat ? DAKBALK.hohPlaat : DAKBALK.hoh },
  };
  const beschotLaag: Opbouw['lagen'][number] = { naam: 'Dakbeschot', materiaal: beschot, dikte: 18, rol: 'plaat' };
  const isolatie: Opbouw['lagen'] = geisoleerd ? [
    { naam: 'Dampscherm', materiaal: 'dampscherm', dikte: 0.4, rol: 'folie' },
    { naam: 'Dakisolatie', materiaal: 'isolatieplaat', dikte: 100, rol: 'isolatie' },
  ] : [];
  const boven: Record<BijgebouwBedekking, Opbouw['lagen']> = {
    open: [],
    epdm: [beschotLaag, ...isolatie, { naam: 'EPDM', materiaal: 'epdm', dikte: 1.2, rol: 'afwerking_buiten' }],
    zink: [beschotLaag, ...isolatie, { naam: 'Onderdak', materiaal: 'onderdak', dikte: 0.5, rol: 'folie' }, { naam: 'Zink met staande naad', materiaal: 'dakzink', dikte: 8, rol: 'afwerking_buiten' }],
    leien: [beschotLaag, ...isolatie, { naam: 'Onderdak', materiaal: 'onderdak', dikte: 0.5, rol: 'folie' }, { naam: 'Leien', materiaal: 'dakleien', dikte: 10, rol: 'afwerking_buiten' }],
    pannen: [beschotLaag, ...isolatie, ...pannenLagen('dakpannen')],
    pannen_antraciet: [beschotLaag, ...isolatie, ...pannenLagen('dakpannen_antraciet')],
    glas: [{ naam: 'Gelaagd glas', materiaal: 'dakglas', dikte: 10, rol: 'afwerking_buiten' }],
    polycarbonaat: [{ naam: 'Polycarbonaatplaat', materiaal: 'polycarbonaat', dikte: 16, rol: 'afwerking_buiten' }],
  };
  const namen: Record<BijgebouwBedekking, string> = {
    open: 'open dak', epdm: 'EPDM', zink: 'zink', leien: 'leien', pannen: 'dakpannen', pannen_antraciet: 'dakpannen', glas: 'glas', polycarbonaat: 'polycarbonaat',
  };
  return {
    naam: `Dak van een bijgebouw, ${namen[bedekking]}${geisoleerd && !plaat && bedekking !== 'open' ? ', geïsoleerd' : ''}`,
    soort: 'dak',
    uitleg: bedekking === 'open' ? 'Alleen de balken: het dak is open.' : 'De dakbalken blijven van onderen zichtbaar.',
    lagen: [balken, ...boven[bedekking]],
    herkomst: voorstel('dakbalken 5 × 15 cm om de ± 48 cm, dakbeschot met EPDM, polycarbonaat van 16 mm. De andere bedekkingen, de diktes en de afstand onder glas: eigen keuze.'),
  };
}

function pannenLagen(materiaal: string): Opbouw['lagen'] {
  return [
    { naam: 'Onderdak', materiaal: 'onderdak', dikte: 0.5, rol: 'folie' },
    { naam: 'Tengellatten', materiaal: 'vuren', dikte: 22, rol: 'latten', hout: { breedte: 38, hoh: 480, richting: 'mee' } },
    { naam: 'Panlatten', materiaal: 'vuren', dikte: 28, rol: 'latten', hout: { breedte: 38, hoh: 340 } },
    { naam: 'Dakpannen', materiaal, dikte: 40, rol: 'afwerking_buiten' },
  ];
}

/**
 * Een dichte wand van een overkapping of van de berging, van binnen naar buiten: regelwerk (zichtbaar aan de
 * binnenkant) met planken erop. Niet geïsoleerd. `latei` = hoogte van de latei boven een deur (mm).
 */
export function bijgebouwSchutting(hout: string, bekleding: string, latei = BIJGEBOUW_LATEI): Opbouw {
  return {
    naam: 'Wand van een overkapping: regelwerk met planken',
    soort: 'wand',
    uitleg: 'Houten regelwerk met de planken aan de buitenkant; van binnen zie je het regelwerk.',
    lagen: [
      { naam: 'Regelwerk', materiaal: hout, dikte: 70, rol: 'skelet', hout: { breedte: 45, hoh: 600, latei } },
      { naam: 'Gevelplanken', materiaal: bekleding, dikte: 20, rol: 'afwerking_buiten' },
    ],
    herkomst: eigenKeuze,
  };
}

/** Een glazen wand tussen twee palen: één laag glas. */
export const bijgebouwGlaswand: Opbouw = {
  naam: 'Glazen wand',
  soort: 'wand',
  uitleg: 'Gelaagd glas tussen de palen, zonder kader getekend.',
  lagen: [{ naam: 'Gelaagd glas', materiaal: 'wandglas', dikte: 10, rol: 'afwerking_buiten' }],
  herkomst: eigenKeuze,
};

/**
 * De wand van een tuinhuis of poolhouse in houtskelet, van binnen naar buiten. Zonder isolatie: stijlen van 38 × 89 mm
 * met een plaat aan de binnenkant. Met isolatie (poolhouse): stijlen van 38 × 140 mm met minerale wol en een dampscherm.
 * `latei` = hoogte van de latei boven een deur of raam (mm).
 */
export function bijgebouwWand(bekleding: string, geisoleerd: boolean, latei = BIJGEBOUW_LATEI): Opbouw {
  return {
    naam: `Wand van een tuinhuis in houtskelet${geisoleerd ? ', geïsoleerd' : ''}`,
    soort: 'wand',
    uitleg: geisoleerd ? 'Houtskelet met isolatie tussen de stijlen, een plaat binnen en planken op latten buiten.' : 'Houtskelet zonder isolatie, een plaat binnen en planken op latten buiten.',
    lagen: [
      { naam: 'Binnenbekleding', materiaal: 'binnenpaneel', dikte: 12, rol: 'afwerking_binnen' },
      ...(geisoleerd ? [{ naam: 'Dampscherm', materiaal: 'dampscherm', dikte: 0.2, rol: 'folie' } as const] : []),
      {
        naam: geisoleerd ? 'Houtskelet met isolatie' : 'Houtskelet', materiaal: 'vuren', dikte: geisoleerd ? 140 : 89, rol: 'skelet',
        hout: { breedte: 38, hoh: 600, latei, ...(geisoleerd ? { vulling: 'minerale_wol' } : {}) },
      },
      { naam: 'Winddichte folie', materiaal: 'gevelfolie', dikte: 0.5, rol: 'folie' },
      { naam: 'Latten met luchtspouw', materiaal: 'vuren', dikte: 22, rol: 'latten', hout: { breedte: 45, hoh: 600 } },
      { naam: 'Gevelplanken', materiaal: bekleding, dikte: 20, rol: 'afwerking_buiten' },
    ],
    herkomst: voorstel('houtskelet met gevelbekleding als bouwwijze. De stijlen (zoals in hoofdstuk 2.3), de lagen en alle diktes: eigen keuze.'),
  };
}

export type BijgebouwVloer = 'geen' | 'klinkers' | 'tegels' | 'terras' | 'beton';

/** De vloer of verharding onder een bijgebouw. `geen` = niets. Alleen wat je ziet: geen fundering, geen onderbouw. */
export function bijgebouwVloer(vloer: BijgebouwVloer): Opbouw | null {
  if (vloer === 'geen') return null;
  if (vloer === 'terras') {
    return {
      naam: 'Houten terras',
      soort: 'vloer',
      uitleg: 'Terrasplanken op onderbalken.',
      lagen: [
        { naam: 'Onderbalken', materiaal: 'vuren', dikte: 90, rol: 'skelet', hout: { breedte: 45, hoh: 500 } },
        { naam: 'Terrasplanken', materiaal: 'terrasplanken', dikte: 30, rol: 'afwerking_binnen' },
      ],
      herkomst: eigenKeuze,
    };
  }
  const laag = {
    klinkers: { naam: 'Klinkers', materiaal: 'klinkers', dikte: 60 },
    tegels: { naam: 'Terrastegels', materiaal: 'terrastegels', dikte: 40 },
    beton: { naam: 'Betonplaat', materiaal: 'betonplaat', dikte: 120 },
  }[vloer];
  return {
    naam: laag.naam,
    soort: 'vloer',
    uitleg: 'Alleen de zichtbare laag; de fundering en de onderbouw zitten niet in het model.',
    lagen: [{ ...laag, rol: 'massief' }],
    herkomst: eigenKeuze,
  };
}

// ---------- gedeelde keuzelijsten ----------

/**
 * Hellingen als keuzelijst met hun tangens en cosinus erbij: de formuletaal van de motor kent geen tan of cos, en de
 * 3D leest hetzelfde getal. De reeksen zijn zelf gekozen; 7° komt uit een voorbeeld in het onderzoek (1.3).
 */
const hellingen = (graden: number[]) => graden.map((g) => ({
  code: `h${g}`, label: `${g}°`,
  eigenschappen: { graden: g, tan: Math.round(Math.tan((g * Math.PI) / 180) * 1e6) / 1e6, cos: Math.round(Math.cos((g * Math.PI) / 180) * 1e6) / 1e6 },
}));
const HELLING_LESSENAAR = hellingen([5, 7, 10, 15]);
const HELLING_ZADEL = hellingen([20, 25, 30, 35, 40, 45]);

const houtKeuzes = Object.entries(STRUCTUURHOUT).map(([code, h]) => ({ code, label: h.label, eigenschappen: { materiaal: `hout_${code}` } }));
const gevelKeuzes = Object.entries(GEVELHOUT).map(([code, h]) => ({ code, label: h.label, eigenschappen: { materiaal: `gevel_${code}` } }));
const PLANKRICHTING = [
  { code: 'staand', label: 'Staande planken' },
  { code: 'liggend', label: 'Liggende planken' },
];

/** Dikte van de dakopbouw in cm (dwars op het dakvlak), zodat het model de hoogte van het hoogste punt kan zeggen. */
const dakDikte = (b: BijgebouwBedekking, geisoleerd = false) => Math.round(bijgebouwDak(b, 'hout_douglas', 'dakbeschot', geisoleerd).lagen.reduce((som, l) => som + l.dikte, 0)) / 10;
const dikte = (o: Opbouw | null) => (o ? Math.round(o.lagen.reduce((som, l) => som + l.dikte, 0)) / 10 : 0);

// ---------- overkapping ----------

/**
 * Overkapping in hout: één model met drie vertrekpunten (carport, terrasoverkapping, pergola; zie
 * `overkappingVertrekpunten`). Maten in cm; breedte en diepte zijn de buitenmaat van de palen, de doorloophoogte is de
 * hoogte onder de liggers. De voorkant is de kant waar je binnenkomt; «tegen een gevel» zet de achterkant tegen de woning.
 *
 * **Voorstel, na te lezen door een aannemer** (zie bovenaan dit bestand). Uit het onderzoek (1.6): de grenzen en
 * stappen van breedte, diepte en doorloophoogte, de paalmaten, de grootste afstand tussen twee palen (300 cm licht,
 * 500 cm zwaar), de liggers van 5 × 15 cm bij een paal van 12 × 12 cm. Eigen keuze: welke paal licht of zwaar is, de
 * liggers bij de zwaardere palen, de hellingen, de oversteek, de maat van de berging en alle drempels in de regels.
 */
export const overkapping: ProductModel = {
  code: 'OVERKAPPING',
  naam: 'Overkapping in hout (carport, terrasoverkapping, pergola)',
  versie: 1,
  maateenheid: 'cm',
  stappen: [
    { code: 'model', label: 'Model en plaats' },
    { code: 'maten', label: 'Maten' },
    { code: 'dak', label: 'Dak' },
    { code: 'draagstructuur', label: 'Palen en liggers' },
    { code: 'wanden', label: 'Wanden en berging' },
    { code: 'afwerking', label: 'Hout en vloer' },
  ],
  kenmerken: [
    {
      code: 'type', label: 'Wat wordt het?', stap: 'model', type: 'keuze', standaard: 'carport',
      helptekst: 'Het vertrekpunt. Alle keuzes blijven daarna vrij; alleen een carport kan een berging krijgen.',
      keuzes: [
        { code: 'carport', label: 'Carport' },
        { code: 'terras', label: 'Terrasoverkapping' },
        { code: 'pergola', label: 'Pergola' },
      ],
    },
    {
      code: 'plaatsing', label: 'Plaats', stap: 'model', type: 'keuze', standaard: 'los',
      helptekst: 'Tegen een gevel: geen palen achteraan, het dak rust daar op een muurbalk.',
      keuzes: [
        { code: 'los', label: 'Vrijstaand' },
        { code: 'gevel', label: 'Tegen een gevel' },
      ],
    },
    { code: 'breedte', label: 'Breedte', stap: 'maten', type: 'getal', eenheid: 'cm', min: 200, max: 900, stapgrootte: 10, standaard: 600, helptekst: 'Buitenmaat van de palen, langs de voorkant.' },
    { code: 'diepte', label: 'Diepte', stap: 'maten', type: 'getal', eenheid: 'cm', min: 250, max: 800, stapgrootte: 10, standaard: 500, helptekst: 'Buitenmaat van de palen, van voor naar achter.' },
    { code: 'hoogte', label: 'Doorloophoogte', stap: 'maten', type: 'getal', eenheid: 'cm', min: 210, max: 260, stapgrootte: 5, standaard: 220, helptekst: 'Vrije hoogte onder de liggers; bij een lessenaarsdak aan de lage kant (vooraan).' },
    {
      code: 'dakvorm', label: 'Dakvorm', stap: 'dak', type: 'keuze', standaard: 'plat',
      keuzes: [
        { code: 'plat', label: 'Plat dak' },
        { code: 'lessenaar', label: 'Lessenaarsdak (loopt af naar voor)' },
        { code: 'zadel', label: 'Zadeldak (nok van voor naar achter)', beschikbaarAls: 'plaatsing = "los"', nietBeschikbaarReden: 'een zadeldak tegen een gevel zit niet in dit model' },
      ],
    },
    { code: 'helling_lessenaar', label: 'Helling', stap: 'dak', type: 'keuze', standaard: 'h7', zichtbaarAls: 'dakvorm = "lessenaar"', keuzes: HELLING_LESSENAAR },
    { code: 'helling_zadel', label: 'Helling', stap: 'dak', type: 'keuze', standaard: 'h30', zichtbaarAls: 'dakvorm = "zadel"', keuzes: HELLING_ZADEL },
    {
      code: 'bedekking', label: 'Dakbedekking', stap: 'dak', type: 'keuze', standaard: 'epdm',
      keuzes: [
        { code: 'epdm', label: 'EPDM op dakbeschot', beschikbaarAls: 'dakvorm <> "zadel"', nietBeschikbaarReden: 'kies voor een zadeldak pannen, leien of zink', eigenschappen: { dikte: dakDikte('epdm') } },
        { code: 'zink', label: 'Zink met staande naad', beschikbaarAls: 'dakvorm <> "plat"', nietBeschikbaarReden: 'zink vraagt een hellend dak', eigenschappen: { dikte: dakDikte('zink') } },
        { code: 'pannen', label: 'Dakpannen, rood', beschikbaarAls: 'dakvorm = "zadel"', nietBeschikbaarReden: 'dakpannen vragen een zadeldak (minstens 20°)', eigenschappen: { dikte: dakDikte('pannen') } },
        { code: 'pannen_antraciet', label: 'Dakpannen, antraciet', beschikbaarAls: 'dakvorm = "zadel"', nietBeschikbaarReden: 'dakpannen vragen een zadeldak (minstens 20°)', eigenschappen: { dikte: dakDikte('pannen_antraciet') } },
        { code: 'leien', label: 'Leien', beschikbaarAls: 'dakvorm = "zadel" en helling_zadel_graden >= 25', nietBeschikbaarReden: 'leien vragen een zadeldak van minstens 25°', eigenschappen: { dikte: dakDikte('leien') } },
        { code: 'polycarbonaat', label: 'Polycarbonaatplaat', beschikbaarAls: 'dakvorm = "lessenaar"', nietBeschikbaarReden: 'een lichtdoorlatend dak vraagt een lessenaarsdak', eigenschappen: { dikte: dakDikte('polycarbonaat') } },
        { code: 'glas', label: 'Glas', beschikbaarAls: 'dakvorm = "lessenaar"', nietBeschikbaarReden: 'een glazen dak vraagt een lessenaarsdak', eigenschappen: { dikte: dakDikte('glas') } },
        { code: 'open', label: 'Open: alleen de balken (pergola)', beschikbaarAls: 'dakvorm = "plat"', nietBeschikbaarReden: 'een open dak is een plat dak', eigenschappen: { dikte: dakDikte('open') } },
      ],
    },
    { code: 'oversteek', label: 'Oversteek van het dak', stap: 'dak', type: 'getal', eenheid: 'cm', min: 0, max: 60, stapgrootte: 5, standaard: 20, helptekst: 'Hoe ver het dak buiten de palen steekt. Tegen een gevel is er achteraan geen oversteek.' },
    {
      code: 'paal', label: 'Palen', stap: 'draagstructuur', type: 'keuze', standaard: 'p12',
      helptekst: 'Zwaardere palen mogen verder uit elkaar staan; anders komt er vanzelf een paal bij.',
      keuzes: [
        { code: 'p12', label: '12 × 12 cm', eigenschappen: { maat: 12, afstand: 300, ligger_b: 5, ligger_h: 15 } },
        { code: 'p14', label: '14 × 14 cm', eigenschappen: { maat: 14, afstand: 300, ligger_b: 7, ligger_h: 17 } },
        { code: 'p15', label: '15 × 15 cm', eigenschappen: { maat: 15, afstand: 500, ligger_b: 7, ligger_h: 20 } },
        { code: 'p20', label: '20 × 20 cm', eigenschappen: { maat: 20, afstand: 500, ligger_b: 10, ligger_h: 24 } },
      ],
    },
    { code: 'schoren', label: 'Schoren aan de palen', stap: 'draagstructuur', type: 'janee', standaard: false, helptekst: 'Schuine stukken tussen paal en ligger, zoals bij een eiken gebint.' },
    ...(['voor', 'links', 'rechts', 'achter'] as const).map((zijde) => ({
      code: `wand_${zijde}`, label: `Wand ${zijde}`, stap: 'wanden', type: 'keuze' as const, standaard: 'open',
      ...(zijde === 'achter' ? { zichtbaarAls: 'plaatsing = "los"' } : {}),
      keuzes: [
        { code: 'open', label: 'Open' },
        { code: 'dicht', label: 'Dicht met planken' },
        { code: 'halfhoog', label: 'Halfhoog met planken (100 cm)' },
        { code: 'glas', label: 'Glas' },
      ],
    })),
    {
      code: 'berging', label: 'Berging', stap: 'wanden', type: 'keuze', standaard: 'geen', zichtbaarAls: 'type = "carport"',
      helptekst: 'Een afgesloten berging met een deur, binnen de maten van de carport.',
      keuzes: [
        { code: 'geen', label: 'Geen berging' },
        { code: 'achter', label: 'Achteraan, over de hele breedte' },
        { code: 'opzij', label: 'Opzij (rechts), over de hele diepte' },
      ],
    },
    {
      code: 'berging_maat', label: 'Maat van de berging', stap: 'wanden', type: 'getal', eenheid: 'cm', min: 100, max: 'als(berging = "opzij"; breedte - 150; diepte - 150)', stapgrootte: 10, standaard: 200,
      zichtbaarAls: 'type = "carport" en berging <> "geen"', helptekst: 'Achteraan: de diepte van de berging. Opzij: haar breedte.',
    },
    { code: 'hout', label: 'Hout van palen, liggers en dakbalken', stap: 'afwerking', type: 'keuze', standaard: 'douglas', keuzes: houtKeuzes },
    { code: 'bekleding', label: 'Hout van de wanden', stap: 'afwerking', type: 'keuze', standaard: 'thermisch_naaldhout', keuzes: gevelKeuzes },
    { code: 'plankrichting', label: 'Richting van de planken', stap: 'afwerking', type: 'keuze', standaard: 'staand', keuzes: PLANKRICHTING },
    {
      code: 'vloer', label: 'Vloer onder de overkapping', stap: 'afwerking', type: 'keuze', standaard: 'klinkers',
      helptekst: 'Alleen voor het beeld: de verharding zit niet in het werk van de houtbouwer.',
      keuzes: (['geen', 'klinkers', 'tegels', 'terras'] as const).map((v) => ({
        code: v, label: { geen: 'Geen', klinkers: 'Klinkers', tegels: 'Terrastegels', terras: 'Houten terras' }[v], eigenschappen: { dikte: dikte(bijgebouwVloer(v)) },
      })),
    },
  ],
  afgeleid: [
    { code: 'p', label: 'Paal (cm)', formule: 'paal_maat' },
    { code: 'max_afstand', label: 'Grootste afstand tussen twee palen (cm)', formule: 'paal_afstand' },
    { code: 'ligger_b', formule: 'paal_ligger_b' },
    { code: 'ligger_h', label: 'Hoogte van de liggers (cm)', formule: 'paal_ligger_h' },
    { code: 'berging_achter', formule: 'als(berging = "achter"; berging_maat; 0)' },
    { code: 'berging_opzij', formule: 'als(berging = "opzij"; berging_maat; 0)' },
    // Velden tussen de palen, hart op hart. Een berging zet een paal op haar scheidingslijn.
    {
      code: 'velden_b', label: 'Velden tussen de palen, over de breedte',
      formule: 'als(berging_opzij > 0; naarboven((breedte - berging_opzij - p / 2) / max_afstand; 1) + naarboven((berging_opzij - p / 2) / max_afstand; 1); naarboven((breedte - p) / max_afstand; 1))',
    },
    {
      code: 'velden_d', label: 'Velden tussen de palen, over de diepte',
      formule: 'als(berging_achter > 0; naarboven((diepte - berging_achter - p / 2) / max_afstand; 1) + naarboven((berging_achter - p / 2) / max_afstand; 1); naarboven((diepte - p) / max_afstand; 1))',
    },
    { code: 'palen', label: 'Aantal palen', formule: 'als(plaatsing = "gevel"; velden_b + 2 * velden_d - 1; 2 * velden_b + 2 * velden_d)' },
    { code: 'helling', label: 'Helling (graden)', formule: 'als(dakvorm = "lessenaar"; helling_lessenaar_graden; als(dakvorm = "zadel"; helling_zadel_graden; 0))' },
    { code: 'helling_tan', formule: 'als(dakvorm = "lessenaar"; helling_lessenaar_tan; als(dakvorm = "zadel"; helling_zadel_tan; 0))' },
    { code: 'helling_cos', formule: 'als(dakvorm = "lessenaar"; helling_lessenaar_cos; als(dakvorm = "zadel"; helling_zadel_cos; 1))' },
    { code: 'dak_b', formule: 'breedte + 2 * oversteek' },
    { code: 'dak_d', formule: 'diepte + als(plaatsing = "gevel"; 1; 2) * oversteek' },
    { code: 'grondvlak_m2', label: 'Oppervlakte tussen de palen (m²)', formule: 'afronden(breedte * diepte / 10000; 1)' },
    { code: 'dak_m2', label: 'Oppervlakte onder het dak (m²)', formule: 'afronden(dak_b * dak_d / 10000; 1)' },
    { code: 'overspanning_dak', label: 'Overspanning van de dakbalken (cm)', formule: 'als(dakvorm = "plat"; min(breedte; diepte); als(dakvorm = "lessenaar"; diepte; breedte / 2))' },
    // Het hoogste punt boven de vloer, zoals de 3D het tekent (zie bijgebouwen3d.ts; een test houdt beide gelijk).
    {
      code: 'tophoogte', label: 'Hoogste punt boven de vloer (cm)',
      formule: 'afronden(hoogte + ligger_h + als(dakvorm = "plat"; bedekking_dikte + als(bedekking = "open"; 0; 4); '
        + 'als(dakvorm = "lessenaar"; (diepte - p / 2 + als(plaatsing = "gevel"; 0; oversteek)) * helling_tan + bedekking_dikte / helling_cos + 2; '
        + 'ligger_h + (ligger_h + 15 + bedekking_dikte) / helling_cos + breedte / 2 * helling_tan + als(in(bedekking; "pannen"; "pannen_antraciet"; "leien"); 5; 2))); 0)',
    },
    // Gegevens voor de 3D-weergave en de meetstaat.
    { code: 'materiaal_hout', formule: 'hout_materiaal' },
    { code: 'materiaal_bekleding', formule: 'bekleding_materiaal' },
    { code: 'dikte_vloer', formule: 'vloer_dikte' },
  ],
  regels: [
    {
      code: 'extra_palen', ernst: 'waarschuwing', als: 'velden_b > 1 of velden_d > 1',
      melding: 'Tussen de hoekpalen komt vanzelf een paal bij: anders staan twee palen verder uit elkaar dan bij deze paalmaat past. Zwaardere palen mogen verder uit elkaar staan.',
    },
    {
      code: 'dakbalken', ernst: 'waarschuwing', als: 'dakvorm <> "zadel" en overspanning_dak > 500',
      melding: 'De dakbalken overspannen meer dan 5 m zonder steun ertussen. Het model tekent ze zo, maar laat hun doorsnede of een tussenligger narekenen.',
    },
    {
      code: 'vergunning', ernst: 'waarschuwing', als: 'plaatsing = "los" en (dak_m2 > 40 of tophoogte > 350)',
      melding: 'Na te kijken: een losstaand bijgebouw is in Vlaanderen vaak vrijgesteld van vergunning tot 40 m² en 3,5 m hoog, binnen 30 m van de woning. Dit ontwerp is groter of hoger: vraag het na bij de gemeente.',
    },
    { code: 'voorkant_dicht', ernst: 'waarschuwing', als: 'type = "carport" en wand_voor <> "open"', melding: 'De voorkant van de carport is niet open: er kan geen wagen binnenrijden.' },
    { code: 'wagen_diepte', ernst: 'waarschuwing', als: 'type = "carport" en berging_achter > 0 en diepte - berging_achter < 450', melding: 'Vóór de berging blijft minder dan 4,5 m diepte over: kijk na of de wagen er nog onder past.' },
    { code: 'wagen_breedte', ernst: 'waarschuwing', als: 'type = "carport" en berging_opzij > 0 en breedte - berging_opzij < 250', melding: 'Naast de berging blijft minder dan 2,5 m breedte over: kijk na of de wagen er nog onder past.' },
    { code: 'schoren_laag', ernst: 'waarschuwing', als: 'schoren en hoogte < 220', melding: 'De schoren beginnen 60 cm onder de ligger: vlak naast een paal is de doorgang daar lager dan 1,6 m.' },
  ],
  stuklijst: [],
  prijs: { opslagProcent: 0, btwProcent: 0 },
};

/**
 * De drie vertrekpunten van de overkapping: de keuzes waarmee een verkoper begint. Alles wat hier niet staat, heeft de
 * standaardwaarde van het model. Standaardmaten uit het onderzoek (1.6); de rest is zelf gekozen voor een mooi begin.
 */
export const overkappingVertrekpunten: Record<'carport' | 'terras' | 'pergola', { label: string; keuzes: Keuzes }> = {
  carport: { label: 'Carport', keuzes: { type: 'carport', breedte: 600, diepte: 500, vloer: 'klinkers' } },
  terras: {
    label: 'Terrasoverkapping',
    keuzes: { type: 'terras', plaatsing: 'gevel', breedte: 540, diepte: 350, dakvorm: 'lessenaar', helling_lessenaar: 'h7', bedekking: 'glas', oversteek: 10, vloer: 'tegels' },
  },
  pergola: { label: 'Pergola', keuzes: { type: 'pergola', breedte: 400, diepte: 300, bedekking: 'open', oversteek: 30, paal: 'p14', vloer: 'terras' } },
};

// ---------- tuinhuis en poolhouse ----------

/**
 * Maten van deuren en ramen van een tuinhuis (cm). Eigen keuze. De bovenkant van de deur en van de ramen ligt op
 * dezelfde hoogte: 205 cm, of lager als de wand dat vraagt (boven de opening moeten een latei en de bovenregel passen).
 */
export const TUINHUIS_OPENINGEN = {
  deur: { enkel: 90, dubbel: 160, schuifraam: 300, hoogte: 205 },
  raam: { breedte: 90, hoogte: 110 },
};

/**
 * Tuinhuis of poolhouse in houtskelet (zie `tuinhuisVertrekpunten`). Maten in cm; breedte en diepte zijn de buitenmaat
 * van de wanden, de wandhoogte is gemeten vanaf de vloer (bij een lessenaarsdak aan de lage kant, achteraan). De deur
 * zit vooraan; een luifel is het dak dat vooraan doorloopt boven een terras, op palen.
 *
 * **Voorstel, na te lezen door een aannemer** (zie bovenaan dit bestand). Uit het onderzoek (1.6): de grenzen van
 * breedte, diepte, wandhoogte en luifel, de drie deuren, houtskelet met gevelbekleding. Eigen keuze: de maten van deur
 * en ramen, het aantal ramen per wand, de hellingen, de opbouw van wand en dak, de palen van de luifel.
 */
export const tuinhuis: ProductModel = {
  code: 'TUINHUIS',
  naam: 'Tuinhuis of poolhouse in houtskelet',
  versie: 1,
  maateenheid: 'cm',
  stappen: [
    { code: 'model', label: 'Model' },
    { code: 'maten', label: 'Maten' },
    { code: 'dak', label: 'Dak' },
    { code: 'openingen', label: 'Deur en ramen' },
    { code: 'afwerking', label: 'Hout en kleur' },
  ],
  kenmerken: [
    {
      code: 'type', label: 'Wat wordt het?', stap: 'model', type: 'keuze', standaard: 'tuinhuis',
      helptekst: 'Het vertrekpunt. Een poolhouse begint groter, geïsoleerd en met een schuifraam; alle keuzes blijven vrij.',
      keuzes: [
        { code: 'tuinhuis', label: 'Tuinhuis' },
        { code: 'poolhouse', label: 'Poolhouse' },
      ],
    },
    { code: 'isolatie', label: 'Geïsoleerde wanden en dak', stap: 'model', type: 'janee', standaard: false },
    { code: 'breedte', label: 'Breedte', stap: 'maten', type: 'getal', eenheid: 'cm', min: 200, max: 1000, stapgrootte: 10, standaard: 400, helptekst: 'Buitenmaat van de wanden, langs de voorkant.' },
    { code: 'diepte', label: 'Diepte', stap: 'maten', type: 'getal', eenheid: 'cm', min: 200, max: 500, stapgrootte: 10, standaard: 300, helptekst: 'Buitenmaat van de wanden, zonder de luifel.' },
    { code: 'wandhoogte', label: 'Wandhoogte', stap: 'maten', type: 'getal', eenheid: 'cm', min: 200, max: 260, stapgrootte: 5, standaard: 220 },
    { code: 'luifel', label: 'Overdekt terras vooraan (luifel)', stap: 'maten', type: 'getal', eenheid: 'cm', min: 0, max: 400, stapgrootte: 10, standaard: 0, helptekst: 'Zoveel loopt het dak vooraan door, op palen. 0 = geen luifel.' },
    {
      code: 'dakvorm', label: 'Dakvorm', stap: 'dak', type: 'keuze', standaard: 'plat',
      keuzes: [
        { code: 'plat', label: 'Plat dak' },
        { code: 'lessenaar', label: 'Lessenaarsdak (loopt af naar achter)' },
        { code: 'zadel', label: 'Zadeldak (nok van voor naar achter)' },
      ],
    },
    { code: 'helling_lessenaar', label: 'Helling', stap: 'dak', type: 'keuze', standaard: 'h7', zichtbaarAls: 'dakvorm = "lessenaar"', keuzes: HELLING_LESSENAAR },
    { code: 'helling_zadel', label: 'Helling', stap: 'dak', type: 'keuze', standaard: 'h30', zichtbaarAls: 'dakvorm = "zadel"', keuzes: HELLING_ZADEL },
    {
      code: 'bedekking', label: 'Dakbedekking', stap: 'dak', type: 'keuze', standaard: 'epdm',
      keuzes: [
        { code: 'epdm', label: 'EPDM op dakbeschot', beschikbaarAls: 'dakvorm <> "zadel"', nietBeschikbaarReden: 'kies voor een zadeldak pannen, leien of zink', eigenschappen: { dikte: dakDikte('epdm'), dikte_warm: dakDikte('epdm', true) } },
        { code: 'zink', label: 'Zink met staande naad', beschikbaarAls: 'dakvorm <> "plat"', nietBeschikbaarReden: 'zink vraagt een hellend dak', eigenschappen: { dikte: dakDikte('zink'), dikte_warm: dakDikte('zink', true) } },
        { code: 'pannen', label: 'Dakpannen, rood', beschikbaarAls: 'dakvorm = "zadel"', nietBeschikbaarReden: 'dakpannen vragen een zadeldak (minstens 20°)', eigenschappen: { dikte: dakDikte('pannen'), dikte_warm: dakDikte('pannen', true) } },
        { code: 'pannen_antraciet', label: 'Dakpannen, antraciet', beschikbaarAls: 'dakvorm = "zadel"', nietBeschikbaarReden: 'dakpannen vragen een zadeldak (minstens 20°)', eigenschappen: { dikte: dakDikte('pannen_antraciet'), dikte_warm: dakDikte('pannen_antraciet', true) } },
        { code: 'leien', label: 'Leien', beschikbaarAls: 'dakvorm = "zadel" en helling_zadel_graden >= 25', nietBeschikbaarReden: 'leien vragen een zadeldak van minstens 25°', eigenschappen: { dikte: dakDikte('leien'), dikte_warm: dakDikte('leien', true) } },
      ],
    },
    { code: 'oversteek', label: 'Oversteek van het dak', stap: 'dak', type: 'getal', eenheid: 'cm', min: 5, max: 60, stapgrootte: 5, standaard: 25, helptekst: 'Hoe ver het dak buiten de wanden steekt.' },
    {
      code: 'deur', label: 'Deur', stap: 'openingen', type: 'keuze', standaard: 'enkel',
      keuzes: [
        { code: 'enkel', label: 'Enkele deur', eigenschappen: { breedte: TUINHUIS_OPENINGEN.deur.enkel } },
        { code: 'dubbel', label: 'Dubbele deur', eigenschappen: { breedte: TUINHUIS_OPENINGEN.deur.dubbel } },
        { code: 'schuifraam', label: 'Schuifraam', eigenschappen: { breedte: TUINHUIS_OPENINGEN.deur.schuifraam } },
      ],
    },
    {
      code: 'deur_plaats', label: 'Plaats van de deur', stap: 'openingen', type: 'keuze', standaard: 'midden',
      keuzes: [
        { code: 'links', label: 'Links' },
        { code: 'midden', label: 'In het midden' },
        { code: 'rechts', label: 'Rechts' },
      ],
    },
    { code: 'ramen_voor', label: 'Ramen vooraan', stap: 'openingen', type: 'getal', min: 0, max: 'max(0; als(deur_plaats = "midden"; 2 * naarbeneden(((breedte - deur_breedte) / 2 - 22) / 110; 1); naarbeneden((breedte - deur_breedte - 62) / 110; 1)))', stapgrootte: 1, standaard: 0,
      helptekst: 'Naast de deur; een raam is 90 × 110 cm.',
    },
    { code: 'ramen_links', label: 'Ramen links', stap: 'openingen', type: 'getal', min: 0, max: 'min(3; naarbeneden((diepte - 60) / 110; 1))', stapgrootte: 1, standaard: 0 },
    { code: 'ramen_rechts', label: 'Ramen rechts', stap: 'openingen', type: 'getal', min: 0, max: 'min(3; naarbeneden((diepte - 60) / 110; 1))', stapgrootte: 1, standaard: 1 },
    { code: 'ramen_achter', label: 'Ramen achteraan', stap: 'openingen', type: 'getal', min: 0, max: 'min(4; naarbeneden((breedte - 24) / 110; 1))', stapgrootte: 1, standaard: 0 },
    { code: 'bekleding', label: 'Gevelbekleding', stap: 'afwerking', type: 'keuze', standaard: 'thermisch_naaldhout', keuzes: gevelKeuzes },
    { code: 'plankrichting', label: 'Richting van de planken', stap: 'afwerking', type: 'keuze', standaard: 'staand', keuzes: PLANKRICHTING },
    {
      code: 'schrijnwerk', label: 'Kleur van deur en ramen', stap: 'afwerking', type: 'keuze', standaard: 'zwart',
      keuzes: [
        { code: 'zwart', label: 'Zwart', eigenschappen: { kleur: '#232323' } },
        { code: 'antraciet', label: 'Antraciet', eigenschappen: { kleur: '#3b4045' } },
        { code: 'wit', label: 'Wit', eigenschappen: { kleur: '#efece4' } },
      ],
    },
    { code: 'hout', label: 'Hout van dakbalken, dakrand en luifel', stap: 'afwerking', type: 'keuze', standaard: 'douglas', keuzes: houtKeuzes },
    {
      code: 'terras', label: 'Vloer onder de luifel', stap: 'afwerking', type: 'keuze', standaard: 'terras', zichtbaarAls: 'luifel > 0',
      keuzes: [
        { code: 'terras', label: 'Houten terras' },
        { code: 'tegels', label: 'Terrastegels' },
      ],
    },
  ],
  afgeleid: [
    { code: 'helling', label: 'Helling (graden)', formule: 'als(dakvorm = "lessenaar"; helling_lessenaar_graden; als(dakvorm = "zadel"; helling_zadel_graden; 0))' },
    { code: 'helling_tan', formule: 'als(dakvorm = "lessenaar"; helling_lessenaar_tan; als(dakvorm = "zadel"; helling_zadel_tan; 0))' },
    { code: 'helling_cos', formule: 'als(dakvorm = "lessenaar"; helling_lessenaar_cos; als(dakvorm = "zadel"; helling_zadel_cos; 1))' },
    { code: 'dak_dikte', formule: 'als(isolatie; bedekking_dikte_warm; bedekking_dikte)' },
    { code: 'vloer_m2', label: 'Oppervlakte, buitenmaat (m²)', formule: 'afronden(breedte * diepte / 10000; 1)' },
    { code: 'dak_m2', label: 'Oppervlakte onder het dak (m²)', formule: 'afronden((breedte + 2 * oversteek) * (diepte + luifel + 2 * oversteek) / 10000; 1)' },
    // Palen van de luifel: 15 × 15 cm, hoogstens 500 cm uit elkaar (zoals de zware palen van de overkapping). Is de
    // luifel breder, dan komen er palen bij naast de deur: twee bij een deur in het midden, anders één.
    { code: 'luifel_palen', label: 'Palen van de luifel', formule: 'als(luifel > 0; als(breedte - 15 > 500; als(deur_plaats = "midden"; 4; 3); 2); 0)' },
    // Het hoogste punt boven de grond, zoals de 3D het tekent (een test houdt beide gelijk). De vloerplaat is 12 cm.
    {
      code: 'tophoogte', label: 'Hoogste punt boven de grond (cm)',
      formule: 'afronden(12 + wandhoogte + als(dakvorm = "plat"; dak_dikte + 4; '
        + 'als(dakvorm = "lessenaar"; (diepte + luifel + oversteek) * helling_tan + dak_dikte / helling_cos + 2; '
        + 'breedte / 2 * helling_tan + dak_dikte / helling_cos + als(bedekking = "zink"; 2; 5))); 0)',
    },
    // Gegevens voor de 3D-weergave en de meetstaat.
    { code: 'materiaal_hout', formule: 'hout_materiaal' },
    { code: 'materiaal_bekleding', formule: 'bekleding_materiaal' },
    { code: 'kleur_schrijnwerk', formule: 'schrijnwerk_kleur' },
    { code: 'deur_b', label: 'Breedte van de deur (cm)', formule: 'deur_breedte' },
  ],
  regels: [
    {
      code: 'vergunning', ernst: 'waarschuwing', als: 'dak_m2 > 40 of tophoogte > 350',
      melding: 'Na te kijken: een losstaand bijgebouw is in Vlaanderen vaak vrijgesteld van vergunning tot 40 m² en 3,5 m hoog, binnen 30 m van de woning. Dit ontwerp is groter of hoger: vraag het na bij de gemeente.',
    },
    { code: 'deur_past_niet', ernst: 'fout', als: 'deur_breedte + 60 > breedte', melding: 'Deze deur is te breed voor de voorwand: kies een smallere deur of maak het tuinhuis breder.' },
    { code: 'luifel_klein', ernst: 'fout', als: 'luifel > 0 en luifel < 100', melding: 'Een luifel is minstens 1 m diep. Zet de luifel op 0 voor een tuinhuis zonder luifel; de oversteek van het dak regel je apart.' },
    {
      code: 'deur_laag', ernst: 'waarschuwing', als: 'wandhoogte < 220 en dakvorm <> "lessenaar"',
      melding: 'Bij deze wandhoogte wordt de deur lager dan 2,05 m: boven de deur is plaats nodig voor een latei en de bovenregel.',
    },
    {
      code: 'luifel_palen', ernst: 'waarschuwing', als: 'luifel_palen > 2',
      melding: 'Onder de luifel komen vanzelf palen bij tussen de hoekpalen: anders staan twee palen meer dan 5 m uit elkaar. Ze staan naast de deur, niet ervoor.',
    },
    {
      code: 'dakbalken', ernst: 'waarschuwing', als: 'dakvorm <> "zadel" en min(breedte; diepte) > 500',
      melding: 'De dakbalken overspannen meer dan 5 m zonder steun ertussen. Het model tekent ze zo, maar laat hun doorsnede of een tussenligger narekenen.',
    },
  ],
  stuklijst: [],
  prijs: { opslagProcent: 0, btwProcent: 0 },
};

/** De twee vertrekpunten van het tuinhuis. Wat hier niet staat, heeft de standaardwaarde van het model. */
export const tuinhuisVertrekpunten: Record<'tuinhuis' | 'poolhouse', { label: string; keuzes: Keuzes }> = {
  tuinhuis: { label: 'Tuinhuis', keuzes: { type: 'tuinhuis', breedte: 400, diepte: 300, deur: 'dubbel', ramen_voor: 0, ramen_rechts: 1 } },
  poolhouse: {
    label: 'Poolhouse',
    keuzes: {
      type: 'poolhouse', isolatie: true, breedte: 700, diepte: 400, wandhoogte: 240, luifel: 300, deur: 'schuifraam', deur_plaats: 'midden',
      ramen_voor: 0, ramen_links: 0, ramen_rechts: 1, ramen_achter: 0, bekleding: 'zwart', plankrichting: 'staand', oversteek: 30,
    },
  },
};

/** Alle modellen van de bijgebouwen, op hun code. */
export const bijgebouwModellen: Record<string, ProductModel> = { OVERKAPPING: overkapping, TUINHUIS: tuinhuis };
