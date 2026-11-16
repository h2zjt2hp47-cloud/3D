/**
 * Staal in en rond de woning als kleine vaste modellen met maten en opties: een **balustrade**, een **luifel** boven een
 * deur en een **rechte stalen trap**. Maten in cm. De 3D en de meetstaat staan in staalwerk3d.ts, opgebouwd uit de
 * bouwdelen (src/bouwdelen.ts), zoals de bijgebouwen in hout en de loods.
 *
 * **Voorstellen, geen nagelezen bouwdetails en geen berekening.** Wat uit `docs/onderzoek-bouw-constructies.md`
 * hoofdstuk 4 komt (de trapformule, de grenzen van optrede en aantrede, de breedte, de hoogte en de openingen van een
 * balustrade), zegt dat ook; dat document heeft geen enkele bron zelf geopend en zegt dat de Belgische bronnen elkaar
 * tegenspreken over de hoogte van een balustrade. Over luifels vond het onderzoek bijna niets: elke maat van de luifel is
 * een eigen keuze. **Een staalbouwer rekent wat draagt** (de trapbomen, de bevestiging van balustrade en luifel); elk
 * model zegt het in elke configuratie.
 *
 * **Zonder prijzen**: een lege stuklijst en een lege prijslijst (`staalwerkPrijslijst`). Wat er nodig is, staat in de
 * meetstaat. Geen merk- of productnamen.
 *
 * De trap heeft vandaag al een plaats in de plattegrond (een meubel van het type `trap` in core/src/plattegrond.ts):
 * dit model gebruikt dezelfde assen (x = breedte, de trap loopt op van z = lengte naar z = 0, tot de vloer erboven), zodat
 * het die blokken later kan vervangen.
 */
import type { BouwMateriaal, Keuzes, Keuzewaarde, Prijslijst, ProductModel } from '../src/index.js';
import { STAAL_AFWERKINGEN, staalMaterialen } from './staalprofielen.js';

/** De modellen hebben geen prijzen: een lege prijslijst volstaat voor de motor. */
export const staalwerkPrijslijst: Prijslijst = {};

const afwerkingKeuzes: Keuzewaarde[] = STAAL_AFWERKINGEN.map((a) => ({ code: a.code, label: a.label, eigenschappen: { materiaal: `staal_${a.code}`, plaat: `staalplaat_${a.code}` } }));

/**
 * De materialen: het staal (staalprofielen.ts), een volle staalplaat per afwerking, glas, hout voor de treden, en de
 * materialen van de omgeving die alleen voor het beeld dient (vloerrand, gevel, verdiepingsvloer).
 */
export const staalwerkMaterialen: Record<string, BouwMateriaal> = {
  ...staalMaterialen,
  glas_helder: { label: 'Gelaagd veiligheidsglas, helder', soort: 'glas', kleur: '#bcd0d6' },
  glas_mat: { label: 'Gelaagd veiligheidsglas, mat', soort: 'matglas', kleur: '#e2e8ea' },
  eik: { label: 'Eik, naturel geolied', soort: 'hout', kleur: '#b88d5c' },
  eik_donker: { label: 'Eik, donker gebeitst', soort: 'hout', kleur: '#6b4c31' },
  // Omgeving, niet in de meetstaat.
  beton: { label: 'Beton', soort: 'gevel', kleur: '#b9b6ae' },
  terrastegels: { label: 'Terrastegels', soort: 'tegel', kleur: '#a8a49b' },
  gevelsteen: { label: 'Gevelsteen', soort: 'steen', kleur: '#a65b40', voeg: '#d5cec2' },
  pleister: { label: 'Pleister', soort: 'pleister', kleur: '#ebe7df' },
  parket: { label: 'Parket', soort: 'parket', kleur: '#b99467' },
};
for (const a of STAAL_AFWERKINGEN) staalwerkMaterialen[`staalplaat_${a.code}`] = { ...staalMaterialen[`staal_${a.code}`]!, label: `Volle plaat, ${a.label.charAt(0).toLowerCase()}${a.label.slice(1)}` };

// ---------- balustrade ----------

/** Grootste veld tussen twee staanders (cm), en grootste glaspaneel (cm). Eigen keuze. */
export const BALUSTRADE = { veld: 150, glas: 120, opening: 10, staafAfstand: 10.5 };

/**
 * Balustrade (borstwering) langs een vloerrand, een terras of een vide. Maten in cm; de hoogte is gemeten vanaf de vloer.
 * Uit het onderzoek (4.3, 4.6): de hoogte van 100 tot 120 cm met 110 cm als standaard (**te bevestigen**: de bronnen
 * spreken elkaar tegen), openingen kleiner dan 11 cm, de vullingen (spijlen, staven, glas, volle plaat) en de
 * afwerkingen. Eigen keuze: de profielen, het grootste veld, de bevestiging.
 */
export const balustrade: ProductModel = {
  code: 'BALUSTRADE',
  naam: 'Balustrade in staal',
  versie: 1,
  maateenheid: 'cm',
  stappen: [
    { code: 'maten', label: 'Maten' },
    { code: 'vulling', label: 'Vulling en leuning' },
    { code: 'afwerking', label: 'Afwerking' },
  ],
  kenmerken: [
    { code: 'lengte', label: 'Lengte', stap: 'maten', type: 'getal', eenheid: 'cm', min: 50, max: 1200, stapgrootte: 5, standaard: 300 },
    { code: 'hoogte', label: 'Hoogte boven de vloer', stap: 'maten', type: 'getal', eenheid: 'cm', min: 100, max: 120, stapgrootte: 5, standaard: 110, helptekst: 'Te bevestigen: de bronnen noemen 75 cm, 1 m en 1,10 m.' },
    {
      code: 'bevestiging', label: 'Bevestiging', stap: 'maten', type: 'keuze', standaard: 'vloer',
      keuzes: [{ code: 'vloer', label: 'Op de vloer' }, { code: 'zijkant', label: 'Tegen de vloerrand (de staanders hangen voor de rand)' }],
    },
    {
      code: 'vulling', label: 'Vulling', stap: 'vulling', type: 'keuze', standaard: 'spijlen',
      keuzes: [
        { code: 'spijlen', label: 'Verticale spijlen' },
        { code: 'staven', label: 'Horizontale staven' },
        { code: 'glas', label: 'Glas in een bodemprofiel' },
        { code: 'plaat', label: 'Volle plaat' },
      ],
    },
    {
      code: 'glas', label: 'Glas', stap: 'vulling', type: 'keuze', standaard: 'helder', zichtbaarAls: 'vulling = "glas"',
      keuzes: [{ code: 'helder', label: 'Helder', eigenschappen: { materiaal: 'glas_helder' } }, { code: 'mat', label: 'Mat', eigenschappen: { materiaal: 'glas_mat' } }],
    },
    {
      code: 'leuning', label: 'Leuning', stap: 'vulling', type: 'keuze', standaard: 'plat',
      keuzes: [
        { code: 'plat', label: 'Plat staal' },
        { code: 'koker', label: 'Koker' },
        { code: 'rond', label: 'Ronde buis' },
        { code: 'geen', label: 'Geen (alleen bij glas)', beschikbaarAls: 'vulling = "glas"', nietBeschikbaarReden: 'zonder glas houdt de leuning de staanders samen' },
      ],
    },
    { code: 'afwerking', label: 'Afwerking van het staal', stap: 'afwerking', type: 'keuze', standaard: 'ral9005', keuzes: afwerkingKeuzes },
  ],
  afgeleid: [
    { code: 'velden', label: 'Velden tussen de staanders', formule: `naarboven(lengte / ${BALUSTRADE.veld}; 1)` },
    { code: 'staanders', label: 'Aantal staanders', formule: 'als(vulling = "glas"; 0; velden + 1)' },
    { code: 'panelen', label: 'Aantal glaspanelen', formule: `als(vulling = "glas"; naarboven(lengte / ${BALUSTRADE.glas}; 1); 0)` },
    { code: 'materiaal_staal', formule: 'afwerking_materiaal' },
    { code: 'materiaal_glas', formule: 'als(vulling = "glas"; glas_materiaal; "")' },
    { code: 'm', label: 'Lengte (m)', formule: 'afronden(lengte / 100; 2)' },
  ],
  regels: [
    {
      code: 'staalbouwer', ernst: 'waarschuwing', als: 'waar',
      melding: 'Een staalbouwer rekent de staanders en hun bevestiging na, en kijkt of de vloer of de vloerrand dat kan dragen.',
    },
    {
      code: 'hoogte_bronnen', ernst: 'waarschuwing', als: 'waar',
      melding: 'Na te kijken: de vereiste hoogte van een balustrade verschilt per bron (75 cm, 1 m, of 1,10 m volgens de norm voor borstweringen). Kijk de regel na die voor dit gebouw geldt.',
    },
    { code: 'staven_klimmen', ernst: 'waarschuwing', als: 'vulling = "staven"', melding: 'Horizontale staven kan een kind beklimmen als een ladder: kijk na of dat hier mag (bv. bij een vide in een woning).' },
    { code: 'glas_gelaagd', ernst: 'waarschuwing', als: 'vulling = "glas"', melding: 'Glas waar je tegen kunt vallen, is gelaagd veiligheidsglas: de dikte en de klemming bepaalt de leverancier.' },
    { code: 'leuning_geen', ernst: 'fout', als: 'leuning = "geen" en vulling <> "glas"', melding: 'Zonder glas heeft een balustrade een leuning nodig: die houdt de staanders samen.' },
  ],
  stuklijst: [],
  prijs: { opslagProcent: 0, btwProcent: 0 },
};

// ---------- luifel ----------

/** Grootste afstand tussen twee ophangpunten (cm). Eigen keuze. */
export const LUIFEL = { veld: 200 };

/**
 * Luifel boven een deur of een raam: een stalen kader met glas of een volle plaat, aan de gevel opgehangen met consoles
 * eronder of trekstangen erboven. Maten in cm; de hoogte is die van de onderkant boven de vloer. **Elke maat is een
 * eigen keuze**: het onderzoek vond geen bron over stalen luifels op maat (4.3). De grenzen moet een staalbouwer geven.
 */
export const luifel: ProductModel = {
  code: 'LUIFEL',
  naam: 'Luifel in staal',
  versie: 1,
  maateenheid: 'cm',
  stappen: [
    { code: 'maten', label: 'Maten' },
    { code: 'uitzicht', label: 'Rand, vulling en ophanging' },
    { code: 'afwerking', label: 'Afwerking' },
  ],
  kenmerken: [
    { code: 'breedte', label: 'Breedte', stap: 'maten', type: 'getal', eenheid: 'cm', min: 100, max: 600, stapgrootte: 5, standaard: 250 },
    { code: 'uitkraging', label: 'Uitkraging', stap: 'maten', type: 'getal', eenheid: 'cm', min: 60, max: 250, stapgrootte: 5, standaard: 120, helptekst: 'Hoe ver de luifel voor de gevel steekt.' },
    { code: 'hoogte', label: 'Hoogte van de onderkant', stap: 'maten', type: 'getal', eenheid: 'cm', min: 210, max: 320, stapgrootte: 5, standaard: 250 },
    {
      code: 'rand', label: 'Rand', stap: 'uitzicht', type: 'keuze', standaard: 'r12',
      keuzes: [8, 12, 16, 20].map((h) => ({ code: `r${h}`, label: `${h} cm hoog`, eigenschappen: { hoogte: h } })),
      helptekst: 'De hoogte van de koker rondom: een dunne rand oogt licht, een hoge rand zwaarder.',
    },
    {
      code: 'vulling', label: 'Vulling', stap: 'uitzicht', type: 'keuze', standaard: 'glas',
      keuzes: [
        { code: 'glas', label: 'Gelaagd glas', eigenschappen: { materiaal: 'glas_helder' } },
        { code: 'mat', label: 'Gelaagd glas, mat', eigenschappen: { materiaal: 'glas_mat' } },
        { code: 'plaat', label: 'Volle plaat' },
      ],
    },
    {
      code: 'ophanging', label: 'Ophanging', stap: 'uitzicht', type: 'keuze', standaard: 'trekstangen',
      keuzes: [{ code: 'trekstangen', label: 'Trekstangen erboven' }, { code: 'consoles', label: 'Consoles eronder' }],
    },
    { code: 'afwerking', label: 'Afwerking van het staal', stap: 'afwerking', type: 'keuze', standaard: 'ral7016', keuzes: afwerkingKeuzes },
  ],
  afgeleid: [
    { code: 'velden', label: 'Velden', formule: `naarboven(breedte / ${LUIFEL.veld}; 1)` },
    { code: 'ophangpunten', label: 'Ophangpunten', formule: 'velden + 1' },
    { code: 'materiaal_staal', formule: 'afwerking_materiaal' },
    { code: 'materiaal_vulling', formule: 'als(vulling = "plaat"; afwerking_plaat; vulling_materiaal)' },
    { code: 'rand_h', formule: 'rand_hoogte' },
    { code: 'm2', label: 'Oppervlakte (m²)', formule: 'afronden(breedte * uitkraging / 10000; 2)' },
  ],
  regels: [
    {
      code: 'staalbouwer', ernst: 'waarschuwing', als: 'waar',
      melding: 'Een staalbouwer rekent de luifel en haar bevestiging in de gevel: de gevel moet de ophanging kunnen dragen. Alle maten van dit model zijn eigen keuze; het onderzoek vond geen bron over stalen luifels.',
    },
    { code: 'uitkraging_groot', ernst: 'waarschuwing', als: 'uitkraging > 150', melding: 'Een luifel die meer dan 1,5 m voor de gevel steekt: laat de ophanging en de rand narekenen.' },
    { code: 'glas_boven', ernst: 'waarschuwing', als: 'vulling <> "plaat"', melding: 'Glas boven je hoofd is gelaagd veiligheidsglas; de dikte bepaalt de leverancier.' },
  ],
  stuklijst: [],
  prijs: { opslagProcent: 0, btwProcent: 0 },
};

// ---------- rechte trap ----------

/**
 * Grenzen van de trap uit het onderzoek (4.3, 4.6), **als voorstel, na te kijken**: de trapformule 2 × optrede +
 * aantrede tussen 57 en 63 cm, de optrede tussen 16 en 19 cm (het model kiest ze rond 18 cm), een aantrede van 22 tot
 * 28 cm, een breedte van minstens 60 cm (geen comfortmaat), minstens 1,80 m vrije hoogte. De stalen treden: minstens
 * 10 mm dik (binnen).
 */
export const TRAP = { formule: [57, 63] as const, optrede: [16, 19] as const, doelOptrede: 18.5, vrijeHoogte: 180 };

/**
 * Rechte stalen trap (steektrap). Maten in cm. Het aantal treden volgt uit de hoogte van vloer tot vloer: zoveel
 * optreden dat er geen hoger is dan ± 18,5 cm; de bovenste trede is de vloer erboven, dus er is één aantrede minder dan
 * er optreden zijn. De lengte (op de grond) is het aantal aantreden × de aantrede.
 *
 * Een kwartslag zit er nog niet in: eerst de rechte trap.
 */
export const staaltrap: ProductModel = {
  code: 'STAALTRAP',
  naam: 'Rechte trap in staal',
  versie: 1,
  maateenheid: 'cm',
  stappen: [
    { code: 'maten', label: 'Maten' },
    { code: 'opbouw', label: 'Trapbomen, treden en leuning' },
    { code: 'afwerking', label: 'Afwerking' },
  ],
  kenmerken: [
    { code: 'hoogte', label: 'Hoogte van vloer tot vloer', stap: 'maten', type: 'getal', eenheid: 'cm', min: 240, max: 340, stapgrootte: 1, standaard: 270, helptekst: 'Van de vloer onderaan tot de afgewerkte vloer bovenaan.' },
    { code: 'breedte', label: 'Breedte', stap: 'maten', type: 'getal', eenheid: 'cm', min: 60, max: 120, stapgrootte: 5, standaard: 90 },
    { code: 'aantrede', label: 'Aantrede (diepte van een trede)', stap: 'maten', type: 'getal', eenheid: 'cm', min: 22, max: 28, stapgrootte: 1, standaard: 23 },
    {
      code: 'structuur', label: 'Draagstructuur', stap: 'opbouw', type: 'keuze', standaard: 'twee',
      keuzes: [{ code: 'twee', label: 'Twee trapbomen opzij (plat staal)' }, { code: 'midden', label: 'Eén trapboom in het midden (koker)' }],
    },
    {
      code: 'treden', label: 'Treden', stap: 'opbouw', type: 'keuze', standaard: 'eik',
      keuzes: [
        { code: 'eik', label: 'Eik, naturel', eigenschappen: { materiaal: 'eik' } },
        { code: 'eik_donker', label: 'Eik, donker', eigenschappen: { materiaal: 'eik_donker' } },
        { code: 'staal', label: 'Staal (plaat van 10 mm)' },
      ],
    },
    {
      code: 'leuning', label: 'Leuning', stap: 'opbouw', type: 'keuze', standaard: 'rechts',
      keuzes: [{ code: 'geen', label: 'Geen' }, { code: 'links', label: 'Links' }, { code: 'rechts', label: 'Rechts' }, { code: 'beide', label: 'Beide zijden' }],
      helptekst: 'Links en rechts gezien als je de trap opgaat.',
    },
    { code: 'afwerking', label: 'Afwerking van het staal', stap: 'afwerking', type: 'keuze', standaard: 'ral9005', keuzes: afwerkingKeuzes },
  ],
  afgeleid: [
    { code: 'optreden', label: 'Aantal optreden', formule: `max(2; naarboven(hoogte / ${TRAP.doelOptrede}; 1))` },
    { code: 'optrede', label: 'Optrede (cm)', formule: 'afronden(hoogte / optreden; 2)' },
    { code: 'aantreden', label: 'Aantal treden (aantreden)', formule: 'optreden - 1' },
    { code: 'lengte', label: 'Lengte op de grond (cm)', formule: 'aantreden * aantrede' },
    { code: 'trapformule', label: 'Trapformule: 2 × optrede + aantrede (cm)', formule: 'afronden(2 * hoogte / optreden + aantrede; 1)' },
    { code: 'materiaal_staal', formule: 'afwerking_materiaal' },
    { code: 'materiaal_trede', formule: 'als(treden = "staal"; afwerking_materiaal; treden_materiaal)' },
  ],
  regels: [
    {
      code: 'staalbouwer', ernst: 'waarschuwing', als: 'waar',
      melding: 'Een staalbouwer rekent de trapbomen, de treden en de bevestiging aan de vloeren.',
    },
    {
      code: 'trapformule', ernst: 'waarschuwing', als: `trapformule < ${TRAP.formule[0]} of trapformule > ${TRAP.formule[1]}`,
      melding: `De trapformule (2 × optrede + aantrede) valt buiten ${TRAP.formule[0]} tot ${TRAP.formule[1]} cm: de trap loopt minder vlot. Kies een andere aantrede. (Grenzen uit het onderzoek, als voorstel.)`,
    },
    {
      code: 'optrede', ernst: 'waarschuwing', als: `optrede < ${TRAP.optrede[0]} of optrede > ${TRAP.optrede[1]}`,
      melding: `De optrede valt buiten ${TRAP.optrede[0]} tot ${TRAP.optrede[1]} cm (onderzoek, als voorstel).`,
    },
    { code: 'te_steil', ernst: 'fout', als: 'optrede > aantrede', melding: 'De trap is steiler dan 45°: kies een grotere aantrede.' },
    { code: 'smal', ernst: 'waarschuwing', als: 'breedte < 80', melding: 'Een trap smaller dan 80 cm loopt krap; 60 cm is een minimum uit de woningkwaliteit, geen comfortmaat.' },
    { code: 'leuning_geen', ernst: 'waarschuwing', als: 'leuning = "geen"', melding: 'Een trap heeft minstens één leuning (onderzoek): kies links, rechts of beide.' },
    {
      code: 'leuning_openingen', ernst: 'waarschuwing', als: 'leuning <> "geen"',
      melding: 'De leuning heeft twee tussenregels. Aan een open kant waar je kunt vallen, is een balustrade met openingen kleiner dan 11 cm nodig: na te kijken.',
    },
    {
      code: 'vrije_hoogte', ernst: 'waarschuwing', als: 'waar',
      melding: `Na te kijken in de woning: boven de trap blijft minstens ${(TRAP.vrijeHoogte / 100).toFixed(2).replace('.', ',')} m vrije hoogte (de rand van het trapgat).`,
    },
  ],
  stuklijst: [],
  prijs: { opslagProcent: 0, btwProcent: 0 },
};

/**
 * De vertrekpunten: wat hier niet staat, heeft de standaardwaarde van het model. Zelf gekozen voor een mooi begin. Van
 * elk model minstens twee, zodat de snelstart (16/11) bij elk model een keuze heeft.
 */
export const staalwerkVertrekpunten: Record<string, { label: string; model: ProductModel; keuzes: Keuzes }> = {
  balustrade_spijlen: { label: 'Balustrade met spijlen', model: balustrade, keuzes: { lengte: 360, vulling: 'spijlen', leuning: 'plat', afwerking: 'ral9005' } },
  balustrade_glas: { label: 'Balustrade in glas', model: balustrade, keuzes: { lengte: 360, vulling: 'glas', leuning: 'rond', afwerking: 'inox' } },
  luifel: { label: 'Luifel met glas aan trekstangen', model: luifel, keuzes: {} },
  luifel_plaat: { label: 'Luifel in volle plaat op consoles', model: luifel, keuzes: { vulling: 'plaat', ophanging: 'consoles', rand: 'r16', afwerking: 'ral9005' } },
  staaltrap: { label: 'Rechte trap met eiken treden', model: staaltrap, keuzes: {} },
  staaltrap_staal: { label: 'Rechte trap met stalen treden op een middenboom', model: staaltrap, keuzes: { structuur: 'midden', treden: 'staal', afwerking: 'ral7016' } },
};

/** Alle modellen van het staalwerk, op hun code. */
export const staalwerkModellen: Record<string, ProductModel> = { BALUSTRADE: balustrade, LUIFEL: luifel, STAALTRAP: staaltrap };
