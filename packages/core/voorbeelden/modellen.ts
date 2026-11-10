/**
 * De collectie van de pilootklant (website, pagina's Sofa's, Fauteuils, Zetelbedden, Poufs & Hockers),
 * als vertrekpunt voor de configurator.
 *
 * Maten: de productpagina's tonen voor een deel van de modellen de echte maten (zithoogte, hoogte karkas,
 * hoogte met rugkussen, armhoogte en -breedte, diepte, zitdiepte) of een technische tekening (Nestor, Belize,
 * Attribute, Wallace, Amusette); die zijn overgenomen (3/11/2026). De vorm, opties en prijzen blijven een
 * BENADERING op basis van de foto's en moeten met de klant bevestigd worden.
 */
import type { ModelDefinitie, Ontwerp, OntwerpElement, Rotatie, Vormgeving } from '../src/index.js';

const BRON = "Benadering op basis van de productfoto op de website; maten en opties nog te bevestigen.";
const BRON_ZONDER_FOTO = 'Benadering zonder foto (staat zonder beeld op de website); nog te bevestigen.';
const MATEN_WEBSITE = 'Maten van de productpagina op de website (3/11/2026); vorm is een benadering op basis van de productfoto\'s.';

type Stuk = [type: string, breedte: number, diepte: number, opties?: Record<string, string>, vorm?: Partial<Vormgeving>];

/** Zet elementen naast elkaar van links naar rechts (rug achteraan). */
function rij(stukken: Stuk[], x0 = 0, y0 = 0): OntwerpElement[] {
  let x = x0;
  return stukken.map(([type, breedte, diepte, opties, vorm], i) => {
    const e: OntwerpElement = { id: `e${i + 1}`, type, x, y: y0, breedte, diepte, rotatie: 0 };
    if (opties) e.opties = opties;
    if (vorm) e.vorm = vorm;
    x += breedte;
    return e;
  });
}

function el(id: string, type: string, x: number, y: number, breedte: number, diepte: number, rotatie: Rotatie = 0, opties?: Record<string, string>): OntwerpElement {
  return { id, type, x, y, breedte, diepte, rotatie, ...(opties ? { opties } : {}) };
}

/** Rolkussen langs een arm (20 cm dik), zoals bij Belize op de foto van de zijkant. */
function rolkussen(id: string, x: number, y: number, lengte: number, rotatie: Rotatie): OntwerpElement {
  return { id, type: 'rolkussen', x, y, breedte: lengte, diepte: 20, rotatie };
}

/** Sierkussen (45 × 14 cm, staat schuin tegen de rugkussens) in een eigen stof, zoals op de productfoto. */
function sierkussen(id: string, x: number, y: number, materiaal: string, breedte = 45): OntwerpElement {
  return { id, type: 'sierkussen', x, y, breedte, diepte: 14, rotatie: 0, materiaal };
}

function model(
  code: string, naam: string, familie: string, omschrijving: string,
  ontwerp: Omit<Ontwerp, 'model'>, foto: string | null = naam, bron?: string,
): ModelDefinitie {
  return { code, naam, familie, omschrijving, bron: bron ?? (foto ? BRON : BRON_ZONDER_FOTO), ...(foto ? { foto } : {}), ontwerp: { ...ontwerp, model: code } };
}

const SOFA = "Sofa's";
const FAUTEUIL = 'Fauteuils';
const ZETELBED = 'Zetelbedden';
const POEF = 'Poufs & hockers';
const strak = { armstijl: 'strak' };
const strakLaag = { armstijl: 'strak', armhoogte: 'laag' };
// Chaise longue: op de foto's van Kotor, Belize, Pula en Fréjus loopt de rug door achter de chaise; bij Azar is
// de chaise een open uiteinde zonder rug (benadering op basis van de productfoto).
const metRug = { chaise_rug: 'achter' };
const zonderRug = { chaise_rug: 'geen' };

export const zetelModellen: ModelDefinitie[] = [
  // ---------------- Sofa's ----------------
  model('kotor', 'Kotor', SOFA, 'Diepe, lage sofa met chaise longue rechts, losse rugkussens, slanke arm op karkashoogte en een lage houten bank aan de zijkant.', {
    hoofdmateriaal: 'linnen_travertin',
    // Foto's (10/11 opnieuw bekeken): slanke, donkere taps toelopende poten en een lichte eiken plank aan de zijkant
    // (tot dan zwart gebeitst hout voor allebei).
    opties: { poten: 'metaal_staaf', metaal: 'zwart', rug: 'los', comfort: 'dons' },
    // Maten van de productpagina: zithoogte 44, karkas 70, met rugkussen 92, arm 70 hoog en 15 breed, diepte 105, zitdiepte 65.
    vormgeving: { zithoogte: 44, rughoogte: 92, armhoogte: 70, karkashoogte: 70, rugdikte: 16, rugkussendikte: 24, kussendikte: 18, zachtheid: 7 },
    elementen: [
      el('e1', 'console', 0, 25, 60, 80, 0, { console_uitvoering: 'bank' }),
      ...rij([['arm', 15, 105, strak], ['zit', 105, 105], ['zit', 105, 105]], 60).map((e, i) => ({ ...e, id: `e${i + 2}` })),
      el('e5', 'chaise', 285, 0, 95, 170, 0, metRug),
      el('e6', 'arm', 380, 0, 15, 170, 0, strak),
      sierkussen('e7', 78, 38, 'sunny_taupe'),
      sierkussen('e8', 332, 38, 'sunny_taupe'),
    ],
  }, 'Kotor', MATEN_WEBSITE),
  model('doha', 'Doha', SOFA, 'Organische sofa met afgeronde lounge-uiteinden, grote losse rugkussens en een zachte, ronde lijn.', {
    hoofdmateriaal: 'boucle_belize',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'los_dons', comfort: 'dons' },
    // Productpagina: diepte 110, zithoogte 42, karkas 65, met rugkussen 84, zitdiepte 62. De breedte staat er niet.
    // Op de twee foto's van de productpagina (opnieuw vergeleken op 10/11) één doorlopende zetel:
    // - twee dikke ronde banden (de zitting van ±22 cm boven een dunnere onderbouw), op een verdekte voet;
    // - links een dieper, rond loungedeel met een korte S-bocht naar de rest; rechts een rond uiteinde;
    // - een lage rug (armhoogte 65, armbreedte 20 volgens de productpagina) die links om het uiteinde draait als
    //   armleuning en rechts vóór het ronde uiteinde stopt; aan beide kanten zakt hij in een kwartronde naar de zitting;
    // - drie grote losse rugkussens.
    // Benadering uit de foto's: breedte ±300 (uit de verhouding met de hoogte van 84 cm), loungedeel 145 diep.
    // De bovenste band (de zitting) is op de foto duidelijk hoger dan de onderste en heeft een rechte zijkant met een
    // zachte rand: zitting 25 op een onderbouw van ±13, zachtheid 6 (kleinere afronding, minder bolle rugkussens).
    vormgeving: { zithoogte: 42, rughoogte: 84, karkashoogte: 65, rugdikte: 20, rugkussendikte: 26, kussendikte: 25, zachtheid: 6, rugvorm: 'rond', opbouw: 'doorlopend' },
    elementen: [
      ...rij([['rond_einde', 115, 145, { ronde_kant: 'links', rug_rond: 'rond' }], ['zit', 95, 110], ['rond_einde', 90, 110, { ronde_kant: 'rechts', rug_rond: 'recht' }]]),
      // Zoals op de foto: een cognackleurig sierkussen tussen het eerste en tweede rugkussen en een kleiner lichtgrijs ervoor.
      sierkussen('e4', 72, 44, 'chenille_camel'), sierkussen('e5', 108, 50, 'chenille_parel', 40),
    ],
  }, 'Doha', MATEN_WEBSITE),
  model('montego', 'Montego', SOFA, 'Lage, gebogen sofa in bouclé zonder armen, op een verdekte voet: één doorlopende vorm in een boog, met een vaste zitting en een vaste rug die korter is dan de zitting.', {
    hoofdmateriaal: 'boucle_belize',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', zitting: 'vaste_zitting', comfort: 'dons' },
    // Productpagina: diepte 99, zithoogte 39, hoogte 77, zitdiepte 60. Op de foto's: één vaste zitting zonder los kussen,
    // en een ronde rug die aan beide kanten met een ronde kop stopt, ±20 % voor het uiteinde (de zitting loopt verder).
    // De boog (uiteinden 30 cm naar voren) en die rugverdeling zijn een benadering uit de foto's; in de tekening blijven
    // het twee afgeronde elementen. Op de foto van boven (10/11) zit de rug niet in het midden: aan één kant loopt hij
    // bijna tot het uiteinde, aan de andere kant blijft een groot rond stuk zitting vrij. Daarom een smal en een breed deel.
    vormgeving: { zithoogte: 39, rughoogte: 77, zachtheid: 10, rugvorm: 'rond', rugdikte: 30, kussendikte: 18, opbouw: 'doorlopend', bocht: 30 },
    elementen: [
      ...rij([['rond_einde', 95, 99, { ronde_kant: 'links', rug_rond: 'recht' }], ['rond_einde', 165, 99, { ronde_kant: 'rechts', rug_rond: 'recht' }]]),
      sierkussen('e3', 60, 28, 'chenille_camel'), sierkussen('e4', 108, 28, 'katoen_kalk'),
    ],
  }, 'Montego', MATEN_WEBSITE),
  model('nestor', 'Nestor', SOFA, 'Grote hoeksofa (hoek rechts) met dikke losse rugkussens, slanke armen en een lage, verdekte voet.', {
    hoofdmateriaal: 'katoen_naturel',
    opties: { poten: 'blok', poothoogte: 'laag', rug: 'los_dons', comfort: 'dons', nekrol: 'met' },
    // Technische tekening op de productpagina (met nekrol en blokvoetjes): arm 11 breed en 65 hoog, zithoogte 45, diepte 101, zitdiepte 61, karkas 65, met rugkussen 88.
    vormgeving: { zithoogte: 45, rughoogte: 88, armhoogte: 65, karkashoogte: 65, rugdikte: 16, rugkussendikte: 24, kussendikte: 18, zachtheid: 6 },
    elementen: [
      ...rij([['arm', 12, 101, strak], ['zit', 95, 101], ['zit', 95, 101], ['zit', 95, 101]]),
      el('e5', 'hoek', 297, 0, 101, 101, 90),
      el('e6', 'zit', 297, 101, 95, 101, 90),
      el('e7', 'arm', 297, 196, 12, 101, 90, strak),
      sierkussen('e8', 18, 38, 'linnen_indigo'), sierkussen('e9', 122, 38, 'linnen_indigo'), sierkussen('e10', 220, 38, 'linnen_indigo'), sierkussen('e11', 255, 38, 'katoen_kalk', 40),
    ],
  }, 'Nestor', MATEN_WEBSITE),
  model('belize', 'Belize', SOFA, 'Ruime U-opstelling met twee chaises longues, losse rugkussens, slanke armen en slanke metalen poten.', {
    hoofdmateriaal: 'chenille_parel',
    opties: { poten: 'metaal_staaf', metaal: 'zwart', rug: 'los', comfort: 'veren', hout: 'notelaar', nekrol: 'met' },
    // Technische tekening: arm 23 breed en 65 hoog, zithoogte 46, diepte 100, zitdiepte 57, karkas 65, met rugkussen 87.
    vormgeving: { zithoogte: 46, rughoogte: 87, armhoogte: 65, karkashoogte: 65, rugdikte: 18, rugkussendikte: 25, kussendikte: 16, zachtheid: 5 },
    elementen: [
      ...rij([['arm', 23, 165, strak], ['chaise', 90, 165, metRug], ['zit', 90, 100], ['zit', 90, 100], ['zit', 90, 100], ['console', 40, 100, { console_uitvoering: 'bank' }], ['chaise', 90, 165, metRug], ['arm', 23, 165, strak]]),
      sierkussen('e9', 50, 41, 'boucle_kiezel'), sierkussen('e10', 120, 41, 'chenille_roest'), sierkussen('e11', 440, 41, 'boucle_kiezel'),
      rolkussen('e12', 25, 45, 60, 270), rolkussen('e13', 491, 45, 60, 90),
    ],
  }, 'Belize', MATEN_WEBSITE),
  model('pula', 'Pula', SOFA, 'Lange, diepe sofa met grote chaise longue rechts, dikke losse rugkussens en brede armen op een verdekte voet.', {
    hoofdmateriaal: 'melange_mos',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'los', comfort: 'dons', hout: 'notelaar' },
    // Productpagina: diepte 107, zithoogte 39, karkas 66, met rugkussen 89, arm 66 hoog en 28 breed, zitdiepte 60.
    vormgeving: { zithoogte: 39, rughoogte: 89, armhoogte: 66, karkashoogte: 66, rugdikte: 18, rugkussendikte: 28, kussendikte: 18, zachtheid: 5 },
    elementen: [
      ...rij([['arm', 28, 107, strak], ['zit', 100, 107], ['zit', 100, 107], ['zit', 100, 107], ['console', 40, 107, { console_uitvoering: 'bank' }], ['chaise', 105, 175, metRug], ['arm', 28, 175, strak]]),
      sierkussen('e8', 34, 44, 'katoen_kalk'), sierkussen('e9', 140, 44, 'vmat_salie'), sierkussen('e10', 280, 44, 'katoen_kalk'), sierkussen('e11', 420, 44, 'vmat_salie'),
    ],
  }, 'Pula', MATEN_WEBSITE),
  model('frejus', 'Fréjus', SOFA, 'Lage sofa met chaise longue links, dikke losse zit- en rugkussens, lage slanke armen, korte zwarte pootjes en een donker houten bijzetblad rechts.', {
    hoofdmateriaal: 'linnen_travertin',
    // Productpagina (10/11): rugkussen 100 × 60 met een extra kussen 60 × 50, pootjes uit beuk, 8 cm hoog, zwart. Geen
    // andere maten. Uit de foto's (benadering): een dunne onderbouw laag bij de grond met dikke zitkussens erop, lage
    // armen net boven de zitting, en rechts naast de arm een donker houten blad op dezelfde lage onderbouw.
    opties: { poten: 'cilinder', hout: 'eik_zwart', rug: 'los_dons', comfort: 'dons' },
    vormgeving: { poothoogte: 8, zithoogte: 42, rughoogte: 86, armhoogte: 58, karkashoogte: 62, rugdikte: 16, rugkussendikte: 24, kussendikte: 22, zachtheid: 7 },
    elementen: [
      ...rij([['arm', 18, 165, strak], ['chaise', 90, 165, metRug], ['zit', 100, 100], ['zit', 100, 100], ['arm', 18, 100, strak], ['console', 60, 100, { console_uitvoering: 'bank' }]]),
      sierkussen('e7', 24, 38, 'velours_terracotta'), sierkussen('e8', 112, 38, 'linnen_travertin'), sierkussen('e9', 215, 38, 'linnen_travertin'), sierkussen('e10', 262, 38, 'velours_terracotta'),
    ],
  }),
  model('gozo', 'Gozo', SOFA, 'Modulaire, blokvormige hoeksofa met dikke rugblokken, brede armblokken en zonder zichtbare poten.', {
    hoofdmateriaal: 'katoen_kalk',
    opties: { poten: 'verdekt', poothoogte: 'laag', zithoogte: 'laag', rug: 'los_dons', comfort: 'dons' },
    vormgeving: { rugdikte: 16, rugkussendikte: 26, karkashoogte: 58, rughoogte: 78, armhoogte: 62, kussendikte: 22, zachtheid: 2 },
    elementen: [
      el('e1', 'hoek', 0, 0, 110, 110, 0),
      ...rij([['zit', 110, 110], ['zit', 110, 110], ['arm', 32, 110, strak]], 110).map((e, i) => ({ ...e, id: `e${i + 2}` })),
      el('e5', 'zit', 0, 110, 110, 110, 270),
      el('e6', 'arm', 0, 220, 32, 110, 270, strak),
      sierkussen('e7', 125, 40, 'sunny_taupe'), sierkussen('e8', 240, 40, 'katoen_naturel'),
    ],
  }),
  model('azar', 'Azar', SOFA, 'Strakke, lage sofa in leder met open chaise longue links, dikke vaste rug en een blokarm die even hoog is als de rug, zonder zichtbare poten.', {
    hoofdmateriaal: 'leder_cognac',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', zitting: 'vaste_zitting', comfort: 'schuim', naad: 'stiksel' },
    // Technische tekening op de productpagina (10/11 overgenomen): hoogte 74, arm 22 breed en 74 hoog (even hoog als de
    // rug), zithoogte 40, diepte 98, zitdiepte 67 (rug ±30 dik), blokvormig, op lage voetjes.
    vormgeving: { zithoogte: 40, rughoogte: 74, armhoogte: 74, rugdikte: 30, kussendikte: 18, zachtheid: 1 },
    elementen: [
      ...rij([['chaise', 95, 170, zonderRug], ['zit', 100, 98], ['zit', 100, 98], ['arm', 22, 98, strak]]),
      // Vóór de rug van 30 cm (anders steken de kussens in de rug).
      sierkussen('e5', 100, 32, 'melange_middernacht'), sierkussen('e6', 150, 32, 'melange_middernacht'), sierkussen('e7', 240, 32, 'vmat_kastanje'),
    ],
  }, 'Azar', MATEN_WEBSITE),
  model('amusette', 'Amusette', SOFA, 'Compacte tweezit met strakke armen, een vaste zitting met ronde voorkant tot op de grond en een vaste, licht hellende rug.', {
    // Op de foto een vlak geweven stof in grijsblauw (gemeten ±#375464): dichter bij Wol Oceaan dan bij Velours Petrol.
    hoofdmateriaal: 'wol_oceaan',
    // Foto's (10/11): de zitting is één stuk dat met een ronde voorkant tot op de grond loopt, geen los zitkussen.
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', zitting: 'vaste_zitting', comfort: 'schuim' },
    // Technische tekening: zithoogte 40, arm 15 breed en 60 hoog, diepte 80, zitdiepte 55, hoogte 71.
    vormgeving: { zithoogte: 40, rughoogte: 71, armhoogte: 60, rugdikte: 25, kussendikte: 16, zachtheid: 7, rugvorm: 'hellend' },
    elementen: rij([['arm', 15, 80, strak], ['zit', 140, 80], ['arm', 15, 80, strak]]),
  }, 'Amusette', MATEN_WEBSITE),
  model('attribute', 'Attribute', SOFA, 'Tweezit met brede, lage armen, twee zitkussens met bies en dikke losse rugkussens op een verdekte voet.', {
    hoofdmateriaal: 'wol_grijs',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'los', comfort: 'veren', naad: 'bies' },
    // Technische tekening: arm 23 breed en 55 hoog, zithoogte 45, diepte 100, zitdiepte 57, karkas 69, met rugkussen 87.
    vormgeving: { zithoogte: 45, rughoogte: 87, armhoogte: 55, karkashoogte: 69, rugdikte: 18, rugkussendikte: 25, kussendikte: 18, zachtheid: 3 },
    elementen: [
      ...rij([['arm', 23, 100, strak], ['zit', 90, 100], ['zit', 90, 100], ['arm', 23, 100, strak]]),
      sierkussen('e5', 28, 41, 'katoen_kaki'), sierkussen('e6', 70, 41, 'rib_mosterd'),
    ],
  }, 'Attribute', MATEN_WEBSITE),
  model('husk', 'Husk', SOFA, 'Lange, slanke sofa met hoes tot op de grond, één lang zitkussen en twee losse rugkussens.', {
    hoofdmateriaal: 'linnen_travertin',
    opties: { poten: 'housse', rug: 'los', comfort: 'veren', zitting: 'losse_kussens', naad: 'bies' },
    vormgeving: { rughoogte: 85, armhoogte: 62, karkashoogte: 64, rugdikte: 14, rugkussendikte: 22, rugkussens: 2, kussendikte: 16, zachtheid: 4 },
    elementen: [
      ...rij([['arm', 14, 95, strak], ['zit', 220, 95], ['arm', 14, 95, strak]]),
      sierkussen('e4', 186, 34, 'linnen_ficelle'),
    ],
  }),
  model('wallace', 'Wallace', SOFA, 'Klassieke sofa met uitlopende armen, hoes tot op de grond en twee grote losse donzen rugkussens.', {
    hoofdmateriaal: 'linnen_travertin',
    opties: { poten: 'housse', rug: 'los_dons', comfort: 'dons', naad: 'bies' },
    // Technische tekening: arm 21 breed en 63 hoog, zithoogte 47, diepte 100, zitdiepte 55, rug 86 en met kussen 90.
    // Karkas 86 cm (zijaanzicht op de tekening); de arm loopt naar achteren op tot die hoogte.
    vormgeving: { zithoogte: 47, rughoogte: 90, armhoogte: 63, karkashoogte: 86, rugdikte: 16, rugkussendikte: 26, rugkussens: 2, kussendikte: 16, zachtheid: 8 },
    elementen: rij([['arm', 21, 100, { armstijl: 'uitlopend' }], ['zit', 160, 100], ['arm', 21, 100, { armstijl: 'uitlopend' }]]),
  }, 'Wallace', MATEN_WEBSITE),
  model('esmee', 'Esmee', SOFA, 'Lange sofa met lage, uitlopende armen, hoes tot op de grond, vast zitkussen en losse donzen rugkussens.', {
    hoofdmateriaal: 'katoen_kalk',
    opties: { poten: 'housse', rug: 'los', comfort: 'dons' },
    vormgeving: { rughoogte: 86, armhoogte: 63, karkashoogte: 70, rugdikte: 14, rugkussendikte: 22, rugkussens: 3, kussendikte: 14, zachtheid: 7 },
    elementen: [
      ...rij([['arm', 18, 95, { armstijl: 'uitlopend' }], ['zit', 220, 95], ['arm', 18, 95, { armstijl: 'uitlopend' }]]),
      sierkussen('e4', 24, 34, 'katoen_kalk'), sierkussen('e5', 196, 34, 'katoen_kalk'),
    ],
  }),

  // ---------------- Fauteuils ----------------
  model('pebble', 'Pebble', FAUTEUIL, 'Lage, brede organische fauteuil: een zachte kiezel als zitting met een scheve, ronde rug, zonder zichtbare poten.', {
    // Foto van voren (10/11 opgemeten): duidelijk breder dan hoog, ±1,34 : 1. Met een zithoogte van 42 cm geeft dat
    // ±115 cm breed en ±85 cm hoog (tot dan 85 breed en 92 hoog: te smal en te hoog). De productpagina geeft voor de
    // fauteuil geen maten (alleen voor de poef), dus dit blijft een benadering; 110 cm is de grens van het element.
    hoofdmateriaal: 'chenille_camel', opties: { poten: 'verdekt', poothoogte: 'laag', comfort: 'dons' },
    vormgeving: { zachtheid: 10, zithoogte: 42, rughoogte: 84 }, elementen: rij([['fauteuil', 110, 90, { kuipvorm: 'organisch' }]]),
  }, 'F-Pebble'),
  model('karl', 'Karl', FAUTEUIL, 'Loungestoel met gebogen rug en zitting in bouclé op een houten frame met hoge poten.', {
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'conisch', poothoogte: 'hoog', hout: 'eik_zwart', rug: 'vast' },
    // Productpagina (10/11): breedte 68, hoogte 75, diepte 72. Op de foto's is de rug een ovaal kussen achter de zitting,
    // zonder vleugels naar voren (de schelp liep tot dan te ver rond).
    vormgeving: { zachtheid: 6, rugdikte: 12, rughoogte: 75 }, elementen: rij([['fauteuil', 68, 72, { kuipvorm: 'schelp' }]]),
  }, 'F-Karl'),
  model('tumble', 'Tumble', FAUTEUIL, 'Ronde kuipfauteuil in bouclé, op een verdekte voet.', {
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'verdekt', poothoogte: 'laag', comfort: 'dons' },
    vormgeving: { zachtheid: 9 }, elementen: rij([['fauteuil', 80, 80, { kuipvorm: 'omhullend' }]]),
  }, 'F-Tumble'),
  model('ross', 'Ross', FAUTEUIL, 'Compacte fauteuil met afgeronde rug op hoge houten poten.', {
    hoofdmateriaal: 'katoen_naturel', opties: { poten: 'cilinder', poothoogte: 'hoog', hout: 'eik_naturel' },
    vormgeving: { zachtheid: 5, rugdikte: 12 }, elementen: rij([['fauteuil', 65, 65, { kuipvorm: 'afgerond' }]]),
  }, 'F-Ross'),
  model('amusette-fauteuil', 'Amusette fauteuil', FAUTEUIL, 'Fauteuil met brede, strakke armen en vaste rug (zelfde lijn als de Amusette sofa).', {
    hoofdmateriaal: 'velours_petrol', opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast' },
    vormgeving: { kussendikte: 18 }, elementen: rij([['arm', 26, 90, strak], ['zit', 70, 90], ['arm', 26, 90, strak]]),
  }, 'F-Amusette'),
  model('quin', 'Quin', FAUTEUIL, 'Ronde draaifauteuil met losse rugkussens in velours.', {
    hoofdmateriaal: 'velours_bosgroen', opties: { poten: 'draaivoet', rug: 'los_dons', comfort: 'dons' },
    vormgeving: { zachtheid: 8 }, elementen: rij([['fauteuil', 90, 90, { kuipvorm: 'trommel' }]]),
  }, 'F-Quin'),
  model('satie', 'Satie', FAUTEUIL, 'Ronde kuipfauteuil met los rugkussen in velours, op een verdekte voet.', {
    hoofdmateriaal: 'velours_oudroze', opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'los' },
    vormgeving: { zachtheid: 7 }, elementen: rij([['fauteuil', 80, 80, { kuipvorm: 'trommel' }]]),
  }, 'F-Satie'),
  model('mabel-1', 'Mabel 1-zit', FAUTEUIL, 'Afgeronde fauteuil in bouclé op slanke donkere poten.', {
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'conisch', poothoogte: 'hoog', hout: 'eik_zwart' },
    vormgeving: { zachtheid: 7 }, elementen: rij([['fauteuil', 75, 75, { kuipvorm: 'afgerond' }]]),
  }, 'F-Mabel1'),
  model('sullivan', 'Sullivan', FAUTEUIL, 'Fauteuil met hoge, afgeronde rug op een draaivoet; bijpassende hocker.', {
    hoofdmateriaal: 'wol_grijs', opties: { poten: 'draaivoet', rughoogte: 'hoog' },
    vormgeving: { zachtheid: 6 }, elementen: rij([['fauteuil', 80, 85, { kuipvorm: 'afgerond' }]]),
  }, 'F-Sullivan'),
  model('fraser', 'Fraser', FAUTEUIL, 'Ronde kuipfauteuil in velours op houten poten.', {
    hoofdmateriaal: 'chenille_nachtblauw', opties: { poten: 'cilinder', poothoogte: 'hoog', hout: 'eik_zwart' },
    vormgeving: { zachtheid: 6 }, elementen: rij([['fauteuil', 70, 70, { kuipvorm: 'rond' }]]),
  }, 'F-Fraser'),
  model('milton', 'Milton', FAUTEUIL, 'Ronde draaifauteuil met hoge rug in zachte stof.', {
    hoofdmateriaal: 'linnen_travertin', opties: { poten: 'draaivoet', rughoogte: 'hoog' },
    vormgeving: { zachtheid: 7 }, elementen: rij([['fauteuil', 75, 75, { kuipvorm: 'rond' }]]),
  }, 'F-Milton'),
  model('manon', 'Manon', FAUTEUIL, 'Omhullende, ronde fauteuil op een verdekte voet.', {
    hoofdmateriaal: 'velours_oudroze', opties: { poten: 'verdekt', poothoogte: 'laag' },
    vormgeving: { zachtheid: 8 }, elementen: rij([['fauteuil', 85, 85, { kuipvorm: 'omhullend' }]]),
  }, 'F-Manon'),
  model('mabel-2', 'Mabel 2-zit', FAUTEUIL, 'Kleine tweezit met afgeronde rug en lage armen op slanke donkere poten.', {
    hoofdmateriaal: 'wol_oceaan', opties: { poten: 'conisch', poothoogte: 'hoog', hout: 'eik_zwart', rug: 'vast' },
    vormgeving: { rugvorm: 'rond', zachtheid: 6 }, elementen: rij([['arm', 12, 82, { armstijl: 'rond', armhoogte: 'laag' }], ['zit', 140, 82], ['arm', 12, 82, { armstijl: 'rond', armhoogte: 'laag' }]]),
  }, 'F-Mabel2'),
  model('mabel-meridienne', 'Mabel Meridienne', FAUTEUIL, 'Meridienne met rug en arm aan één kant, bies en slanke donkere poten.', {
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'conisch', poothoogte: 'hoog', hout: 'eik_zwart', naad: 'bies', rug: 'vast' },
    // Eén méridienne zoals op de foto: arm links en een chaise longue met de rug langs de lange zijde (gedraaid).
    vormgeving: { rugvorm: 'rond' },
    elementen: [
      el('e1', 'arm', 0, 0, 14, 80, 0, { armstijl: 'rond' }),
      el('e2', 'chaise', 14, 0, 80, 170, 90, { chaise_rug: 'links' }),
      sierkussen('e3', 20, 16, 'vmat_kastanje'),
    ],
  }, 'F-MabelMeridienne'),

  // ---------------- Zetelbedden ----------------
  model('ziggy', 'Ziggy zetelbed', ZETELBED, 'Zetelbed met strakke armen, één doorlopend zitkussen, rolkussens en metalen poten.', {
    hoofdmateriaal: 'velours_bosgroen', opties: { poten: 'metaal_staaf', rug: 'los' },
    elementen: rij([['arm', 22, 95, strak], ['zit', 160, 95, { functie: 'slaapfunctie' }], ['arm', 22, 95, strak]]),
  }, 'Z-Ziggy'),
  model('aurora', 'Aurora zetelbed', ZETELBED, 'Zetelbed met slanke armen, twee zitkussens en slanke metalen poten.', {
    hoofdmateriaal: 'katoen_naturel', opties: { poten: 'metaal_staaf', rug: 'los' },
    vormgeving: { zitkussens: 2 }, elementen: rij([['arm', 12, 95, strak], ['zit', 180, 95, { functie: 'slaapfunctie' }], ['arm', 12, 95, strak]]),
  }, 'Z-Aurora'),
  model('zora', 'Zora zetelbed', ZETELBED, 'Zetelbed met afgeronde armen, bies en één zitkussen.', {
    hoofdmateriaal: 'linnen_brume', opties: { poten: 'verdekt', poothoogte: 'laag', naad: 'bies', rug: 'vast' },
    elementen: rij([['arm', 16, 95, { armstijl: 'rond' }], ['zit', 170, 95, { functie: 'slaapfunctie' }], ['arm', 16, 95, { armstijl: 'rond' }]]),
  }, 'Z-Zora'),
  model('phoenix', 'Phoenix zetelbed', ZETELBED, 'Compact zetelbed met strakke armen en vaste rug.', {
    hoofdmateriaal: 'wol_grijs', opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast' },
    elementen: rij([['arm', 20, 95, strak], ['zit', 130, 95, { functie: 'slaapfunctie' }], ['arm', 20, 95, strak]]),
  }, 'Z-Phoenix'),
  model('daizy-classic', 'Daizy Classic zetelbed', ZETELBED, 'Klassiek zetelbed met twee zitkussens en sierkussens.', {
    hoofdmateriaal: 'linnen_travertin', opties: { poten: 'blok', poothoogte: 'laag', rug: 'los' },
    vormgeving: { zitkussens: 2 }, elementen: rij([['arm', 18, 95, strak], ['zit', 170, 95, { functie: 'slaapfunctie' }], ['arm', 18, 95, strak]]),
  }, 'Z-DaizyClassic'),
  model('daizy-slim', 'Daizy Slim zetelbed', ZETELBED, 'Slanke variant met smalle armen en twee zitkussens.', {
    hoofdmateriaal: 'linnen_travertin', opties: { poten: 'blok', poothoogte: 'laag', rug: 'los' },
    vormgeving: { zitkussens: 2 }, elementen: rij([['arm', 12, 95, strak], ['zit', 160, 95, { functie: 'slaapfunctie' }], ['arm', 12, 95, strak]]),
  }, 'Z-DaizySlim'),

  // ---------------- Poufs & hockers ----------------
  model('sullivan-hocker', 'Sullivan Hocker', POEF, 'Ronde hocker op een draaivoet, bij de Sullivan fauteuil.', {
    hoofdmateriaal: 'wol_grijs', opties: { poten: 'draaivoet' }, elementen: rij([['poef', 65, 65, { poefvorm: 'rond' }]]),
  }, 'P-Sullivan'),
  model('tumble-pouf', 'Tumble pouf', POEF, 'Kleine ronde pouf.', {
    hoofdmateriaal: 'linnen_ficelle', opties: { poten: 'verdekt', poothoogte: 'laag' }, elementen: rij([['poef', 50, 50, { poefvorm: 'rond' }]]),
  }, 'P-Tumble'),
  model('stockholm', 'Stockholm pouf', POEF, 'Ronde pouf in velours, in twee formaten.', {
    hoofdmateriaal: 'velours_petrol', opties: { poten: 'verdekt', poothoogte: 'laag' }, elementen: rij([['poef', 60, 60, { poefvorm: 'rond' }]]),
  }, 'P-Stockholm'),
  model('kanto', 'Kanto pouf', POEF, 'Vierkante pouf, hier in een stof met patroon.', {
    hoofdmateriaal: 'jacquard_ruit', opties: { poten: 'verdekt', poothoogte: 'laag' }, elementen: rij([['poef', 45, 45, { poefvorm: 'vierkant' }]]),
  }, 'P-Kanto'),
  model('fez', 'Fez pouf', POEF, 'Hoge, cilindervormige pouf.', {
    hoofdmateriaal: 'wol_grijs', opties: { poten: 'verdekt', poothoogte: 'laag' }, elementen: rij([['poef', 40, 40, { poefvorm: 'rond' }]]),
  }, 'P-Fez'),
  model('pebble-pouf', 'Pebble pouf', POEF, 'Langwerpige, kiezelvormige pouf.', {
    hoofdmateriaal: 'linnen_ficelle', opties: { poten: 'verdekt', poothoogte: 'laag' }, elementen: rij([['poef', 120, 55, { poefvorm: 'kiezel' }]]),
  }, 'P-Pebble'),
  model('mabel-hocker', 'Mabel Hocker', POEF, 'Hocker bij de Mabel fauteuil.', {
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'conisch', poothoogte: 'hoog', hout: 'eik_zwart' }, elementen: rij([['poef', 55, 55, { poefvorm: 'rond' }]]),
  }, null),
  model('fraser-hocker', 'Fraser Hocker', POEF, 'Hocker bij de Fraser fauteuil.', {
    hoofdmateriaal: 'velours_petrol', opties: { poten: 'cilinder', poothoogte: 'hoog', hout: 'eik_zwart' }, elementen: rij([['poef', 50, 50, { poefvorm: 'rond' }]]),
  }, null),
];

export const modelFamilies = [SOFA, FAUTEUIL, ZETELBED, POEF];
