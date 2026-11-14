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
    opties: { poten: 'conisch', hout: 'eik_zwart', rug: 'los', comfort: 'dons' },
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
    // Productpagina: diepte 110, zithoogte 42, karkas 65, met rugkussen 84, zitdiepte 62.
    // Op de foto's één doorlopende zetel: twee dikke ronde banden (de zitting van ±22 cm boven een dunnere onderbouw),
    // een lage rug die aan beide uiteinden kort omdraait als armleuning (armhoogte 65, armbreedte 20 volgens de
    // productpagina) met losse rugkussens erop, links een dieper, rond loungedeel (diepte 145 en zittingdikte 22 zijn een
    // benadering uit de foto's), op een verdekte voet.
    vormgeving: { zithoogte: 42, rughoogte: 84, karkashoogte: 65, rugdikte: 20, rugkussendikte: 26, kussendikte: 22, zachtheid: 9, rugvorm: 'rond', opbouw: 'doorlopend' },
    elementen: [
      ...rij([['rond_einde', 150, 145, { ronde_kant: 'links', rug_rond: 'rond' }], ['zit', 100, 110], ['rond_einde', 110, 110, { ronde_kant: 'rechts', rug_rond: 'rond' }]]),
      // Zoals op de foto: een oranje sierkussen en een kleiner lichtgrijs ervoor, links van het midden.
      sierkussen('e4', 100, 44, 'velours_terracotta'), sierkussen('e5', 136, 50, 'chenille_parel', 40),
    ],
  }, 'Doha', MATEN_WEBSITE),
  model('montego', 'Montego', SOFA, 'Lage, gebogen sofa in bouclé zonder armen, op een verdekte voet: één doorlopende vorm in een boog, met een vaste zitting en een vaste rug die korter is dan de zitting.', {
    hoofdmateriaal: 'boucle_belize',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', zitting: 'vaste_zitting', comfort: 'dons' },
    // Productpagina: diepte 99, zithoogte 39, hoogte 77, zitdiepte 60. Op de foto's: één vaste zitting zonder los kussen,
    // en een ronde rug die aan beide kanten met een ronde kop stopt, ±20 % voor het uiteinde (de zitting loopt verder).
    // De boog (uiteinden 30 cm naar voren) en die rugverdeling zijn een benadering uit de foto's; in de tekening blijven
    // het twee afgeronde elementen.
    vormgeving: { zithoogte: 39, rughoogte: 77, zachtheid: 10, rugvorm: 'rond', rugdikte: 30, kussendikte: 18, opbouw: 'doorlopend', bocht: 30 },
    elementen: [
      ...rij([['rond_einde', 130, 99, { ronde_kant: 'links', rug_rond: 'recht' }], ['rond_einde', 130, 99, { ronde_kant: 'rechts', rug_rond: 'recht' }]]),
      sierkussen('e3', 70, 28, 'chenille_camel'), sierkussen('e4', 140, 28, 'katoen_kalk'),
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
  model('frejus', 'Fréjus', SOFA, 'Sofa met chaise longue links, zachte losse rugkussens en slanke donkere poten. Geen productpagina met maten: verhoudingen zoals Kotor.', {
    hoofdmateriaal: 'linnen_travertin',
    opties: { poten: 'cilinder', hout: 'eik_zwart', rug: 'los_dons', comfort: 'dons' },
    vormgeving: { rughoogte: 88, armhoogte: 66, karkashoogte: 66, rugdikte: 16, rugkussendikte: 24, kussendikte: 18, zachtheid: 7 },
    elementen: [
      ...rij([['arm', 18, 165, strak], ['chaise', 90, 165, metRug], ['zit', 95, 100], ['zit', 95, 100], ['arm', 18, 100, strak]]),
      sierkussen('e6', 24, 38, 'velours_terracotta'), sierkussen('e7', 112, 38, 'velours_terracotta'), sierkussen('e8', 205, 38, 'katoen_kalk'),
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
  model('azar', 'Azar', SOFA, 'Strakke, lage sofa in leder met open chaise longue links, dikke vaste rug en brede blokarm, zonder zichtbare poten.', {
    hoofdmateriaal: 'leder_cognac',
    opties: { poten: 'verdekt', poothoogte: 'laag', zithoogte: 'laag', rug: 'vast', comfort: 'schuim', naad: 'stiksel' },
    vormgeving: { rugdikte: 24, kussendikte: 18, zachtheid: 2 },
    elementen: [
      ...rij([['chaise', 95, 170, zonderRug], ['zit', 100, 100], ['zit', 100, 100], ['arm', 30, 100, strak]]),
      sierkussen('e5', 100, 22, 'melange_middernacht'), sierkussen('e6', 150, 22, 'melange_middernacht'), sierkussen('e7', 240, 22, 'vmat_kastanje'),
    ],
  }),
  model('amusette', 'Amusette', SOFA, 'Compacte tweezit met strakke armen, één doorlopend zitkussen en een vaste, licht hellende rug.', {
    hoofdmateriaal: 'velours_petrol',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', comfort: 'schuim' },
    // Technische tekening: zithoogte 40, arm 15 breed en 60 hoog, diepte 80, zitdiepte 55, hoogte 71.
    vormgeving: { zithoogte: 40, rughoogte: 71, armhoogte: 60, rugdikte: 25, kussendikte: 16, zachtheid: 4, rugvorm: 'hellend' },
    elementen: rij([['arm', 15, 80, strak], ['zit', 140, 80], ['arm', 15, 80, strak]]),
  }, 'Amusette', MATEN_WEBSITE),
  model('attribute', 'Attribute', SOFA, 'Tweezit met brede, lage armen, twee zitkussens met bies en dikke losse rugkussens op een verdekte voet.', {
    hoofdmateriaal: 'wol_grijs',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'los', comfort: 'veren', naad: 'bies' },
    // Technische tekening: arm 23 breed en 55 hoog, zithoogte 45, diepte 100, zitdiepte 57, karkas 69, met rugkussen 87.
    vormgeving: { zithoogte: 45, rughoogte: 87, armhoogte: 55, karkashoogte: 69, rugdikte: 18, rugkussendikte: 25, kussendikte: 18, zachtheid: 5 },
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
    // Op de grote foto's (14/11) zwaait de bovenlijn van de arm in één boog van de hoge rug naar voren: het karkas is
    // er bijna zo hoog als de rugkussens (82), de arm vooraan 63. Benadering uit de foto; de site geeft geen maten.
    vormgeving: { rughoogte: 86, armhoogte: 63, karkashoogte: 82, rugdikte: 14, rugkussendikte: 22, rugkussens: 3, kussendikte: 14, zachtheid: 7 },
    elementen: [
      ...rij([['arm', 18, 95, { armstijl: 'uitlopend' }], ['zit', 220, 95], ['arm', 18, 95, { armstijl: 'uitlopend' }]]),
      sierkussen('e4', 24, 34, 'katoen_kalk'), sierkussen('e5', 196, 34, 'katoen_kalk'),
    ],
  }),

  // ---------------- Fauteuils ----------------
  model('pebble', 'Pebble', FAUTEUIL, 'Zachte, organische fauteuil met hoge, ronde rug, zonder zichtbare poten.', {
    hoofdmateriaal: 'linnen_ficelle', opties: { poten: 'verdekt', poothoogte: 'laag', rughoogte: 'hoog', comfort: 'dons' },
    vormgeving: { zachtheid: 10 }, elementen: rij([['fauteuil', 85, 85, { kuipvorm: 'organisch' }]]),
  }, 'F-Pebble'),
  model('karl', 'Karl', FAUTEUIL, 'Loungestoel zonder armen: een brede, dikke rugschijf in bouclé die boven een ronde zitting zweeft, op een donker houten frame met hoge poten.', {
    hoofdmateriaal: 'boucle_zand', opties: { poten: 'ringframe', hout: 'eik_zwart', rug: 'vast', zitting: 'vaste_zitting' },
    // Productpagina: 68 × 72 × 75; geen zithoogte (42 geschat). Uit de foto's (benadering, 13/11): geen armen; een brede,
    // dikke, ovale rugschijf die een eind boven de zitting zweeft, gedragen door het houten frame; een dikke zitting met
    // sterk afgeronde randen; vier slanke schuine poten (poothoogte 28 geschat). Wat hier niet kan: op de foto lopen de
    // achterpoten door tot achter de rug en ligt er een gebogen houten band rond de rugschijf; bij ons twee stijlen.
    vormgeving: {
      zachtheid: 6, rughoogte: 75, zithoogte: 42, poothoogte: 28,
      // De rugschijf helt achterover (foto van opzij): 12°.
      kuip: { exponent: 3, dikte: 12, boog: 72, zitTrommel: true, zitRand: 6.5, frameDik: 3, helling: 12, profiel: [[0, 1], [0.55, 1], [1, 0.55]] },
    },
    elementen: rij([['fauteuil', 68, 72, { kuipvorm: 'schelp' }]]),
  }, 'F-Karl', MATEN_WEBSITE),
  model('tumble', 'Tumble', FAUTEUIL, 'Zachte, ronde fauteuil in bouclé: één bolle zitting tot op de vloer met een lage, dikke rugrol erop.', {
    hoofdmateriaal: 'teddy_ivoor', opties: { poten: 'verdekt', comfort: 'dons', zitting: 'vaste_zitting' },
    // Productpagina: 78 × 86 × 75, zithoogte 45 (ook als sofa van 134 en 160 cm). Uit de foto's (benadering, 13/11): één
    // zachte, bolle zitting tot op de vloer, met sterk afgeronde randen; daarop een lage, dikke rug rond de achterste
    // helft, rondom even hoog, met ronde uiteinden, die aan de buitenkant aansluit op de zijkant van de zitting. Geen
    // zichtbare poten.
    vormgeving: {
      zachtheid: 9, rughoogte: 75, zithoogte: 45, poothoogte: 2,
      // De rug is 24 cm dik: de site geeft een zitdiepte van 59 op 86 cm diepte (27 cm voor de rug, die op de foto ook
      // wat achter de zitting uitsteekt).
      kuip: { dikte: 24, boog: 95, zitTrommel: true, zitRand: 11, schaalOp: true, profiel: [[0, 1], [1, 1]] },
    },
    elementen: rij([['fauteuil', 78, 86, { kuipvorm: 'omhullend' }]]),
  }, 'F-Tumble', MATEN_WEBSITE),
  model('ross', 'Ross', FAUTEUIL, 'Compacte fauteuil: een dunne schaal met een hoge rug en lage armen rond een dikke, vaste zitting, op vier houten poten met een kruis.', {
    hoofdmateriaal: 'katoen_naturel', opties: { poten: 'kruisframe', hout: 'eik_gerookt', zitting: 'vaste_zitting', naad: 'bies' },
    // Productpagina: 66 × 64 × 78, zithoogte 43. Uit de twee foto's (benadering, 13/11): een dunne schaal met een bies;
    // de rug is bovenaan recht, over ±drie kwart van de breedte, en zakt met een steile schouder naar lage armen (±17 cm
    // boven de zitting), die vooraan in een boog tot op de zitting zakken; één dikke, ronde zitting met een bies onderaan;
    // vier schuine houten poten met een kruis (poothoogte 26 geschat).
    vormgeving: {
      zachtheid: 5, rughoogte: 78, zithoogte: 43, poothoogte: 26,
      kuip: {
        exponent: 2.6, dikte: 6, boog: 125, voorBoven: -3, zitTrommel: true, zitRand: 6,
        profiel: [[0, 1], [0.33, 1], [0.47, 0.5], [0.75, 0.42], [1, 0]],
        dikteProfiel: [[0, 6], [0.44, 6], [0.5, 11.5], [1, 11.5]],
      },
    },
    elementen: rij([['fauteuil', 66, 64, { kuipvorm: 'afgerond' }]]),
  }, 'F-Ross', MATEN_WEBSITE),
  model('amusette-fauteuil', 'Amusette fauteuil', FAUTEUIL, 'Blokvormige clubfauteuil met strakke armen en een vaste, licht hellende rug (zelfde lijn als de Amusette sofa).', {
    hoofdmateriaal: 'velours_petrol', opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast' },
    // Productpagina: 86 × 80 × 71, zithoogte 40. Armhoogte 60, rug en zitkussen zoals op de technische tekening van de
    // Amusette sofa (13/11). De armen zijn hier 13 cm breed (op de sofa 15): het zitelement begint bij 60 cm breed.
    vormgeving: { zithoogte: 40, rughoogte: 71, armhoogte: 60, rugdikte: 25, kussendikte: 16, zachtheid: 4, rugvorm: 'hellend' },
    elementen: rij([['arm', 13, 80, strak], ['zit', 60, 80], ['arm', 13, 80, strak]]),
  }, 'F-Amusette', MATEN_WEBSITE),
  model('quin', 'Quin', FAUTEUIL, 'Grote ronde draaifauteuil: een trommel op een lage ronde voet, een dunne schaal rond de achterste helft en vier losse rugkussens.', {
    hoofdmateriaal: 'velours_bosgroen', opties: { poten: 'draaivoet', rug: 'los_dons', comfort: 'dons', zitting: 'vaste_zitting' },
    // Productpagina: 91 × 91 × 78, zithoogte 45. Uit de foto's (benadering, 13/11): een grote ronde trommel op een lage,
    // donkere ronde voet (4 cm geschat); een dunne schaal, rondom even hoog, die er een paar cm rond uitsteekt, rond de
    // achterste helft; vier gewone vierkante kussens (±43 cm) tegen de schaal, die erboven uitkomen (de productpagina:
    // "4 kussens inbegrepen"; eerst drie gezet op de foto's, waar het vierde achter de andere staat).
    // Onzeker: de hoogte van de site (78) is hier de rand van de schaal; de kussens komen erboven (88). Op de foto van opzij
    // ligt de rand bij een zithoogte van 45 op ±71 cm en de kussens op ±84 cm: 78 past bij geen van beide. Na te vragen.
    vormgeving: {
      zachtheid: 8, rughoogte: 78, zithoogte: 45, poothoogte: 4,
      kuip: { dikte: 6, boog: 93, zitTrommel: true, zitRand: 4, zitIn: 4, profiel: [[0, 1], [1, 1]], kussens: 4, kussenMaat: 43 },
    },
    elementen: rij([['fauteuil', 91, 91, { kuipvorm: 'trommel' }]]),
  }, 'F-Quin', MATEN_WEBSITE),
  model('satie', 'Satie', FAUTEUIL, 'Ronde fauteuil: een trommel tot op de vloer met een dunne schaal met bies rond de achterste helft en één los rugkussen.', {
    hoofdmateriaal: 'velours_oudroze', opties: { poten: 'verdekt', rug: 'los', zitting: 'vaste_zitting', naad: 'bies' },
    // Productpagina: diameter 70 (ook 110 en 130), hoogte 70; geen zithoogte (45 geschat). Uit de foto's (benadering,
    // 13/11): een ronde trommel tot op de vloer; een dunne schaal met een bies die er rondom een paar cm uitsteekt, even
    // hoog rondom, rond de achterste helft; één los, breed rugkussen dat boven de schaal uitkomt (Jonas, 13/11: "Satie
    // heeft maar 1 kussen"; de grotere maten hebben er volgens de site 4 en 5).
    // Onzeker: de hoogte van de site (70) is hier de rand van de schaal; het kussen komt erboven (83). Op de foto van opzij
    // is de rand ±1,46 keer de zithoogte: 70 en 45 passen daar net niet bij (dat geeft 66, of een zithoogte van 48). Na te
    // vragen bij de klant.
    vormgeving: {
      zachtheid: 7, rughoogte: 70, zithoogte: 45, poothoogte: 2,
      kuip: { dikte: 6, boog: 95, zitTrommel: true, zitRand: 3, zitIn: 4, profiel: [[0, 1], [1, 1]], kussens: 1, kussenMaat: 48, kussenHoog: 38 },
    },
    elementen: rij([['fauteuil', 70, 70, { kuipvorm: 'trommel' }]]),
  }, 'F-Satie', MATEN_WEBSITE),
  model('mabel-1', 'Mabel 1-zit', FAUTEUIL, 'Kuipfauteuil in bouclé: een dunne leuning die aan de zijkanten tot op de dikke zitting zakt, op een donker frame met slanke poten.', {
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'ringframe', poothoogte: 'hoog', hout: 'eik_zwart', zitting: 'vaste_zitting', naad: 'bies' },
    // Productpagina: 68 × 65 × 76, zithoogte 45, zitdiepte 49. Uit de foto's (benadering, 13/11): de leuning staat achteraan
    // en zakt aan de zijkanten in een vloeiende lijn tot op de zitting, rond het midden van de zitdiepte; het voorste deel
    // van de zitting ligt vrij. Vaste zitting met een bies, dun donker frame op vier poten (poothoogte 22 geschat).
    vormgeving: {
      zachtheid: 6, rughoogte: 76, zithoogte: 45, poothoogte: 22,
      // De rug helt achterover (foto's van opzij, 14/11): haar bovenkant staat ±9 cm achter haar voet.
      kuip: { exponent: 3, dikte: 7, boog: 95, voorBoven: -3, zitTrommel: true, zitRand: 6, frameDik: 2.5, helling: 9.5, profiel: [[0, 1], [0.3, 1], [1, 0]] },
    },
    elementen: rij([['fauteuil', 68, 65, { kuipvorm: 'afgerond' }]]),
  }, 'F-Mabel1', MATEN_WEBSITE),
  model('sullivan', 'Sullivan', FAUTEUIL, 'Fauteuil met een hoge rug die naar lage armen zakt, rond een dikke, ronde zitting op een zwart houten frame; bijpassende hocker.', {
    hoofdmateriaal: 'wol_grijs', opties: { poten: 'ringframe', hout: 'eik_zwart', zitting: 'vaste_zitting' },
    // Productpagina: 72 × 80 × 93, zithoogte 42. Uit de foto's (benadering, 13/11): een dikke, ronde zitting op een zwarte
    // houten ring met vier schuine poten en een kruis (poothoogte 22 geschat); de rug is bovenaan smal en rond en loopt
    // schuin breder uit naar lage, korte armen (±20 cm boven de zitting) die vooraan tot op de zitting zakken. De rug
    // helt achterover (foto van opzij). De maten passen in elkaar: de zitting is rond en 62 cm (zoals de hocker, 62 × 62
    // op de site), de schaal is 72 breed, en de bovenkant van de rug steekt 13 cm achter haar voet: samen de 80 cm
    // diepte van de site, en een zitdiepte van ±60 (site: 60). De hoek (10,4°) volgt daaruit.
    vormgeving: {
      zachtheid: 6, rughoogte: 93, zithoogte: 42, poothoogte: 22,
      kuip: {
        plan: 'rond', dikte: 10, boog: 118, voorBoven: -3, zitTrommel: true, zitRand: 7, zitIn: 5, zitInAchter: 5,
        frameDik: 3, frameKruis: true, helling: 10.4,
        profiel: [[0, 1], [0.2, 1], [0.52, 0.43], [0.8, 0.36], [1, 0]],
        dikteProfiel: [[0, 10], [0.48, 10], [0.55, 14.5], [1, 14.5]],
      },
    },
    elementen: rij([['fauteuil', 72, 80, { kuipvorm: 'afgerond' }]]),
  }, 'F-Sullivan', MATEN_WEBSITE),
  model('fraser', 'Fraser', FAUTEUIL, 'Kleine ronde fauteuil: een dikke, vaste zitting met een lage, rechte schaal rond de achterste helft, op vier zwarte poten met een kruis.', {
    hoofdmateriaal: 'chenille_nachtblauw', opties: { poten: 'kruisframe', hout: 'eik_zwart', zitting: 'vaste_zitting' },
    // Productpagina: 61 × 61 × 70, zithoogte 44, zitdiepte 49. Uit de foto's (benadering, 13/11): ronde zitting van ±18 cm
    // dik; een lage schaal met een vlakke rand rond de achterste helft, tot onderaan de zitting; vier zwarte, vierkante
    // schuine poten met een kruis ertussen (poothoogte 26 geschat). De zitting in twee lagen: een kussen op een band.
    // Geen bies te zien.
    vormgeving: {
      zachtheid: 6, rughoogte: 70, zithoogte: 44, poothoogte: 26,
      kuip: { dikte: 9, boog: 96, zitTrommel: true, zitRand: 5, zitNaad: 10, zitIn: 3.5, profiel: [[0, 1], [1, 1]] },
    },
    elementen: rij([['fauteuil', 61, 61, { kuipvorm: 'rond' }]]),
  }, 'F-Fraser', MATEN_WEBSITE),
  model('milton', 'Milton', FAUTEUIL, 'Ronde fauteuil: een dikke, vaste zitting met een dunne, rechte schaal rond de achterste helft, op een donker houten frame.', {
    hoofdmateriaal: 'wol_havermout', opties: { poten: 'ringframe', hout: 'eik_zwart', zitting: 'vaste_zitting', naad: 'bies' },
    // Productpagina: 70 × 68 × 72, zithoogte 40, zitdiepte 60 (schaal 8 cm = diepte − zitdiepte). Uit de foto's (benadering,
    // 13/11): schaal met een vlakke rand rond de achterste helft, tot onderaan de zitting; zitting van ±22 cm met een bies;
    // houten ring op vier poten (poothoogte 18 geschat).
    vormgeving: {
      zachtheid: 7, rughoogte: 72, zithoogte: 40, poothoogte: 18,
      kuip: { dikte: 8, boog: 94, zitTrommel: true, zitRand: 7, profiel: [[0, 1], [1, 1]] },
    },
    elementen: rij([['fauteuil', 70, 68, { kuipvorm: 'rond' }]]),
  }, 'F-Milton', MATEN_WEBSITE),
  model('manon', 'Manon', FAUTEUIL, 'Ronde kuipfauteuil tot op de vloer: een dunne schaal met bies die van de hoge rug naar voren afloopt, rond een vaste trommelzitting.', {
    hoofdmateriaal: 'velours_oudroze', opties: { poten: 'verdekt', zitting: 'vaste_zitting', naad: 'bies' },
    // Productpagina: 75 × 70 × 75, zithoogte 42. Uit de vier foto's (benadering, 13/11): een ronde trommel tot op de vloer;
    // een dunne schaal met een dikke bies die er een paar cm rond uitsteekt; haar rand loopt van de rug (75 cm) aan beide
    // kanten schuin af naar voren (±60 cm) en eindigt voorbij het midden met een rechte rand tot op de vloer; de zitting
    // steekt er vooraan uit. De schaal helt achterover (foto van opzij: haar bovenkant staat ±12 cm achter haar voet,
    // 9,5°), zodat de zitting ondieper is dan breed. Wat nog afwijkt: op de foto staat de schaal ook opzij wat naar buiten.
    vormgeving: {
      zachtheid: 8, rughoogte: 75, zithoogte: 42, poothoogte: 2,
      kuip: {
        dikte: 6, boog: 104, voorBoven: 0, zitTrommel: true, zitRand: 4, zitIn: 3, helling: 9.5,
        // Eén vloeiende, bolle lijn van de rug naar voren (een parabool in zeven punten, recht ertussen).
        profiel: [[0, 1], [0.17, 0.99], [0.33, 0.95], [0.5, 0.89], [0.67, 0.8], [0.83, 0.69], [1, 0.55]], profielRecht: true,
      },
    },
    elementen: rij([['fauteuil', 75, 70, { kuipvorm: 'omhullend' }]]),
  }, 'F-Manon', MATEN_WEBSITE),
  model('mabel-2', 'Mabel 2-zit', FAUTEUIL, 'Kleine tweezit als kuip: dezelfde leuning als de Mabel 1-zit, 150 cm breed, op een donker frame met slanke poten.', {
    hoofdmateriaal: 'velours_petrol', opties: { poten: 'ringframe', poothoogte: 'hoog', hout: 'eik_zwart', zitting: 'vaste_zitting', naad: 'bies' },
    // Productpagina: 150 × 65 × 76, zithoogte 45. Op de foto dezelfde kuip als de 1-zit (vroeger hier arm + zit + arm: een
    // andere zetel, 13/11). Eén element van het type fauteuil; de vorm is een benadering uit de foto.
    vormgeving: {
      zachtheid: 6, rughoogte: 76, zithoogte: 45, poothoogte: 22,
      kuip: { exponent: 4.5, dikte: 7, boog: 94, voorBoven: -3, zitTrommel: true, zitRand: 6, frameDik: 2.5, helling: 9.5, profiel: [[0, 1], [0.62, 1], [1, 0]] },
    },
    elementen: rij([['fauteuil', 150, 65, { kuipvorm: 'afgerond' }]]),
  }, 'F-Mabel2', MATEN_WEBSITE),
  model('mabel-meridienne', 'Mabel Meridienne', FAUTEUIL, 'Méridienne als kuip: de leuning draait om het linkeruiteinde en loopt langs de rug schuin af tot op de zitting; vaste zitting met bies op een donker frame.', {
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'ringframe', poothoogte: 'hoog', hout: 'eik_zwart', zitting: 'vaste_zitting', naad: 'bies' },
    // Productpagina: 150 × 65 × 76, zithoogte 45 (zelfde maten als de 2-zit). Eén foto van voor, 580 px (13/11): de leuning
    // is hoog aan de linkerkant, blijft vlak tot iets voorbij het midden en zakt dan langs de rug tot op de zitting, op
    // ±85 % van de breedte; de rechterkant ligt open. Wat de foto niet toont en dus geschat is: hoe ver de leuning om het
    // linkeruiteinde naar voren komt (hier zoals bij de 1-zit: tot het midden van de diepte) en de poothoogte.
    // Vroeger arm + chaise (184 × 80): een andere zetel.
    vormgeving: {
      zachtheid: 6, rughoogte: 76, zithoogte: 45, poothoogte: 22,
      kuip: {
        exponent: 4.5, dikte: 7, boog: 94, boogRechts: 30, voorBoven: -3, zitTrommel: true, zitRand: 6, frameDik: 2.5, helling: 9.5,
        profiel: [[0, 1], [0.62, 1], [1, 0]], profielRechts: [[0, 1], [0.12, 1], [1, 0]],
      },
    },
    elementen: [
      el('e1', 'fauteuil', 0, 0, 150, 65, 0, { kuipvorm: 'afgerond' }),
      sierkussen('e3', 12, 16, 'vmat_kastanje', 38),
    ],
  }, 'F-MabelMeridienne', MATEN_WEBSITE),

  // ---------------- Zetelbedden ----------------
  model('ziggy', 'Ziggy zetelbed', ZETELBED, 'Zetelbed met slanke, hoge armen, één doorlopend zitkussen, twee rugkussens, rolkussens tegen de armen en metalen poten.', {
    hoofdmateriaal: 'velours_bosgroen', opties: { poten: 'metaal_staaf', rug: 'los' },
    // Technische tekening op de productpagina (14/11): zithoogte 50, karkas en arm 76 hoog, arm 10 breed, diepte 98,
    // zitdiepte 55. Uit de foto (benadering): twee rugkussens die ±12 cm boven de armen uitkomen, één lang zitkussen en
    // een rolkussen tegen elke arm. De breedte staat niet op de tekening (blijft een benadering).
    vormgeving: { zithoogte: 50, rughoogte: 88, armhoogte: 76, karkashoogte: 76, rugdikte: 20, rugkussendikte: 23, rugkussens: 2 },
    elementen: [
      ...rij([['arm', 10, 98, strak], ['zit', 160, 98, { functie: 'slaapfunctie' }], ['arm', 10, 98, strak]]),
      rolkussen('e4', 10, 46, 46, 270), rolkussen('e5', 150, 46, 46, 90),
    ],
  }, 'Z-Ziggy', MATEN_WEBSITE),
  model('aurora', 'Aurora zetelbed', ZETELBED, 'Zetelbed met slanke armen, twee zitkussens en slanke metalen poten.', {
    hoofdmateriaal: 'katoen_naturel', opties: { poten: 'metaal_staaf', rug: 'los' },
    vormgeving: { zitkussens: 2 }, elementen: rij([['arm', 12, 95, strak], ['zit', 180, 95, { functie: 'slaapfunctie' }], ['arm', 12, 95, strak]]),
  }, 'Z-Aurora'),
  model('zora', 'Zora zetelbed', ZETELBED, 'Zetelbed met slanke armen op rughoogte met een ronde bovenkant, bies, één lang rugkussen en één zitkussen.', {
    hoofdmateriaal: 'sunny_zeegroen', opties: { poten: 'verdekt', poothoogte: 'laag', naad: 'bies', rug: 'los' },
    // Technische tekening op de productpagina (14/11): zithoogte 47, hoogte en arm 74, arm 10 breed, diepte 98,
    // zitdiepte 55. Uit de foto (benadering): één lang rugkussen tot aan de bovenkant van het karkas, één lang zitkussen,
    // twee sierkussens links. De breedte staat niet op de tekening (blijft een benadering).
    // De arm met ronde bovenkant komt 3 cm boven de armhoogte uit: 71 geeft de 74 cm van de tekening.
    vormgeving: { zithoogte: 47, rughoogte: 74, armhoogte: 71, karkashoogte: 74, rugdikte: 20, rugkussendikte: 23 },
    elementen: [
      ...rij([['arm', 10, 98, { armstijl: 'rond' }], ['zit', 170, 98, { functie: 'slaapfunctie' }], ['arm', 10, 98, { armstijl: 'rond' }]]),
      sierkussen('e4', 14, 46, 'sunny_taupe'), sierkussen('e5', 44, 48, 'sunny_taupe'),
    ],
  }, 'Z-Zora', MATEN_WEBSITE),
  model('phoenix', 'Phoenix zetelbed', ZETELBED, 'Compact zetelbed met strakke armen en vaste rug.', {
    hoofdmateriaal: 'wol_grijs', opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast' },
    // Productpagina (14/11): zithoogte 46, zitdiepte 55; in drie breedtes (canapé 130, 190 en 210). De diepte, de hoogte
    // en de armen staan er niet: die blijven een benadering uit de foto.
    vormgeving: { zithoogte: 46 },
    elementen: rij([['arm', 20, 95, strak], ['zit', 130, 95, { functie: 'slaapfunctie' }], ['arm', 20, 95, strak]]),
  }, 'Z-Phoenix'),
  model('daizy-classic', 'Daizy Classic zetelbed', ZETELBED, 'Klassiek zetelbed met lage armen, twee zitkussens op een sierboord, twee rugkussens en een sierkussen tegen elke arm.', {
    hoofdmateriaal: 'sunny_taupe', opties: { poten: 'blok', poothoogte: 'laag', hout: 'eik_zwart', rug: 'los', boord: 'met' },
    // Technische tekening op de productpagina (14/11): zithoogte 47, karkas 74, arm 60 hoog en 14 breed, diepte 98,
    // zitdiepte 55. Uit de foto (benadering): de rugkussens komen ±8 cm boven het karkas, een sierkussen tegen elke arm.
    // De breedte staat niet op de tekening (blijft een benadering).
    // Met de sierboord tussen zitkussens en korpus, zoals op de foto (de pagina toont ook een versie zonder boord).
    vormgeving: { zitkussens: 2, zithoogte: 47, rughoogte: 82, armhoogte: 60, karkashoogte: 74, rugdikte: 20, rugkussendikte: 23 },
    elementen: [
      ...rij([['arm', 14, 98, strak], ['zit', 170, 98, { functie: 'slaapfunctie' }], ['arm', 14, 98, strak]]),
      sierkussen('e4', 16, 48, 'sunny_taupe', 40), sierkussen('e5', 142, 48, 'sunny_taupe', 40),
    ],
  }, 'Z-DaizyClassic', MATEN_WEBSITE),
  model('daizy-slim', 'Daizy Slim zetelbed', ZETELBED, 'Slanke variant met smalle, lage armen, twee zitkussens en twee rugkussens.', {
    hoofdmateriaal: 'sunny_taupe', opties: { poten: 'blok', poothoogte: 'laag', hout: 'eik_zwart', rug: 'los' },
    // Technische tekening op de productpagina (14/11): zithoogte 47, karkas 74, arm 60 hoog en 8 breed, diepte 98,
    // zitdiepte 55. Uit de foto (benadering): de rugkussens komen ±8 cm boven het karkas, een sierkussen tegen elke arm.
    vormgeving: { zitkussens: 2, zithoogte: 47, rughoogte: 82, armhoogte: 60, karkashoogte: 74, rugdikte: 20, rugkussendikte: 23 },
    elementen: [
      ...rij([['arm', 8, 98, strak], ['zit', 160, 98, { functie: 'slaapfunctie' }], ['arm', 8, 98, strak]]),
      sierkussen('e4', 10, 48, 'sunny_taupe', 40), sierkussen('e5', 126, 48, 'sunny_taupe', 40),
    ],
  }, 'Z-DaizySlim', MATEN_WEBSITE),
  model('sullivan-hocker', 'Sullivan Hocker', POEF, 'Ronde hocker bij de Sullivan fauteuil: dezelfde dikke zitting op een zwarte houten ring met vier poten en een kruis.', {
    hoofdmateriaal: 'wol_grijs', opties: { poten: 'ringframe', hout: 'eik_zwart' },
    // Pagina van de Sullivan fauteuil: poef 62 × 62 × 42. Uit de foto (benadering, 13/11): dezelfde ronde zitting en
    // hetzelfde onderstel als de fauteuil (poothoogte 22 geschat). Vroeger 65 × 65 op een draaivoet.
    vormgeving: { poothoogte: 22, kuip: { hoogte: 42, zitRand: 7, frameDik: 3, frameKruis: true } },
    elementen: rij([['poef', 62, 62, { poefvorm: 'rond' }]]),
  }, 'P-Sullivan', MATEN_WEBSITE),
  model('tumble-pouf', 'Tumble pouf', POEF, 'Ronde, bolle pouf tot op de vloer, bij de Tumble fauteuil.', {
    hoofdmateriaal: 'linnen_ficelle', opties: { poten: 'verdekt' },
    // Pagina van de Tumble fauteuil: poef diameter 59, zithoogte 45. Uit de foto (benadering, 13/11): rond en bol, met
    // sterk afgeronde randen, tot op de vloer. Vroeger een rechte cilinder van 50 cm.
    vormgeving: { poothoogte: 2, kuip: { hoogte: 45, zitRand: 13 } },
    elementen: rij([['poef', 59, 59, { poefvorm: 'rond' }]]),
  }, 'P-Tumble', MATEN_WEBSITE),
  model('stockholm', 'Stockholm pouf', POEF, 'Ronde pouf in velours, in twee formaten.', {
    // Op de foto donkerblauw (14/11). Geen eigen pagina met maten; op de foto loopt de pouf naar boven smaller toe.
    hoofdmateriaal: 'chenille_nachtblauw', opties: { poten: 'verdekt', poothoogte: 'laag' }, elementen: rij([['poef', 60, 60, { poefvorm: 'rond' }]]),
  }, 'P-Stockholm'),
  model('kanto', 'Kanto pouf', POEF, 'Vierkante pouf, hier in een stof met patroon.', {
    hoofdmateriaal: 'jacquard_ruit', opties: { poten: 'verdekt', poothoogte: 'laag' }, elementen: rij([['poef', 45, 45, { poefvorm: 'vierkant' }]]),
  }, 'P-Kanto'),
  model('fez', 'Fez pouf', POEF, 'Hoge, cilindervormige pouf.', {
    hoofdmateriaal: 'wol_grijs', opties: { poten: 'verdekt', poothoogte: 'laag' }, elementen: rij([['poef', 40, 40, { poefvorm: 'rond' }]]),
  }, 'P-Fez'),
  model('pebble-pouf', 'Pebble pouf', POEF, 'Kiezelvormige pouf, bij de Pebble fauteuil.', {
    hoofdmateriaal: 'linnen_ficelle', opties: { poten: 'verdekt', poothoogte: 'laag' },
    // Pagina van de Pebble fauteuil: poef 82 × 61 × 42 (13/11). Vroeger 120 × 55.
    vormgeving: { kuip: { hoogte: 42 } },
    elementen: rij([['poef', 82, 61, { poefvorm: 'kiezel' }]]),
  }, 'P-Pebble', MATEN_WEBSITE),
  model('mabel-hocker', 'Mabel Hocker', POEF, 'Hocker bij de Mabel fauteuil.', {
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'conisch', poothoogte: 'hoog', hout: 'eik_zwart' }, elementen: rij([['poef', 55, 55, { poefvorm: 'rond' }]]),
  }, null),
  model('fraser-hocker', 'Fraser Hocker', POEF, 'Hocker bij de Fraser fauteuil.', {
    hoofdmateriaal: 'velours_petrol', opties: { poten: 'cilinder', poothoogte: 'hoog', hout: 'eik_zwart' }, elementen: rij([['poef', 50, 50, { poefvorm: 'rond' }]]),
  }, null),
];

export const modelFamilies = [SOFA, FAUTEUIL, ZETELBED, POEF];
