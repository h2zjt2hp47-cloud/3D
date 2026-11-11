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

/**
 * Sierkussen (45 × 14 cm, staat schuin tegen de rugkussens) in een eigen stof, zoals op de productfoto. Met `opties`
 * bv. een lendenkussen (breder dan hoog); met `rotatie` tegen een rug die niet achteraan staat (hoekzetel).
 */
function sierkussen(id: string, x: number, y: number, materiaal: string, breedte = 45, opties?: Record<string, string>, rotatie: Rotatie = 0): OntwerpElement {
  return { id, type: 'sierkussen', x, y, breedte, diepte: 14, rotatie, materiaal, ...(opties ? { opties } : {}) };
}
const lenden = { kussenformaat: 'lenden' };
const opBasis = { console_uitvoering: 'op_basis' };

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
  model('kotor', 'Kotor', SOFA, 'Lage sofa op slanke donkere poten: een dun karkas met dikke, losse donskussens, chaise longue rechts met een korte, slanke arm, en links een eiken blad op de onderbouw.', {
    // Kleur gemeten op de productfoto (11/11): warm kiezelgrijs (tot dan Linnen Travertin: te licht).
    hoofdmateriaal: 'chenille_kiezel',
    // Foto's (10/11 en 11/11 opnieuw bekeken): slanke, donkere taps toelopende poten van ±13 cm en een lichte eiken plank
    // die links op de doorlopende onderbouw ligt (tot dan een los bankje naast een arm). Grote, losse donskussens.
    opties: { poten: 'metaal_staaf', metaal: 'zwart', rug: 'los_dons', comfort: 'dons' },
    // Maten van de productpagina: zithoogte 44, karkas 70, met rugkussen 92, arm 70 hoog en 15 breed, diepte 105, zitdiepte 65.
    // Uit de foto van voren (benadering, verhouding poten : onderbouw : kussen ≈ 1 : 1 : 2,5): poten ±11 cm, een dunne
    // onderbouw (±10 cm) met zitkussens van ±23 cm die er vooraan over steken, een dun karkas (rug ±14 cm) en één arm,
    // rechts, die niet verder komt dan de zitting (de chaise loopt door).
    vormgeving: { poothoogte: 11, zithoogte: 44, rughoogte: 92, armhoogte: 70, karkashoogte: 70, rugdikte: 14, rugkussendikte: 26, kussendikte: 23, zachtheid: 8, kussenoversteek: 3 },
    elementen: [
      ...rij([['console', 35, 105, opBasis], ['zit', 105, 105], ['zit', 105, 105], ['chaise', 100, 170, metRug], ['arm', 15, 105, strak]]),
      sierkussen('e6', 82, 38, 'velours_antraciet'),
      sierkussen('e7', 268, 38, 'velours_antraciet'),
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
    // Opmerking van Jonas (controleblad 11/11): meer boog in de zetel en de bovenste band nog wat groter: zitting 28 op 10, boog 24.
    vormgeving: { zithoogte: 42, rughoogte: 84, karkashoogte: 65, rugdikte: 20, rugkussendikte: 26, kussendikte: 28, zachtheid: 6, rugvorm: 'rond', opbouw: 'doorlopend', bocht: 24 },
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
    // Opmerking van Jonas (controleblad 11/11): de zetel is groter en de boog sterker: 285 breed (was 260) en de uiteinden 60 cm naar voren.
    vormgeving: { zithoogte: 39, rughoogte: 77, zachtheid: 10, rugvorm: 'rond', rugdikte: 30, kussendikte: 18, opbouw: 'doorlopend', bocht: 60 },
    elementen: [
      ...rij([['rond_einde', 105, 99, { ronde_kant: 'links', rug_rond: 'recht' }], ['rond_einde', 180, 99, { ronde_kant: 'rechts', rug_rond: 'recht' }]]),
      sierkussen('e3', 60, 28, 'chenille_camel'), sierkussen('e4', 108, 28, 'katoen_kalk'),
    ],
  }, 'Montego', MATEN_WEBSITE),
  model('nestor', 'Nestor', SOFA, 'Strakke hoeksofa (hoek rechts) als een witte bak op lage blokvoetjes: smalle armen op karkashoogte, rechte losse rugkussens met een nekrol erachter en blauwe lendenkussens.', {
    hoofdmateriaal: 'katoen_naturel',
    // Foto's (11/11): donkere blokvoetjes en rechte rugkussens met een band (geen bolle donskussens).
    opties: { poten: 'blok', poothoogte: 'laag', hout: 'eik_zwart', rug: 'los', comfort: 'veren', nekrol: 'met' },
    // Technische tekening op de productpagina (met nekrol en blokvoetjes): arm 11 breed en 65 hoog, zithoogte 45, diepte 101, zitdiepte 61, karkas 65, met rugkussen 88.
    vormgeving: { zithoogte: 45, rughoogte: 88, armhoogte: 65, karkashoogte: 65, rugdikte: 16, rugkussendikte: 24, kussendikte: 18, zachtheid: 4 },
    // Opstelling van de foto's (11/11): twee zitplaatsen en de hoek aan de lange kant, één zitplaats en de arm aan de korte
    // kant (tot dan drie zitplaatsen aan de lange kant). De breedte van de zitplaatsen is afgeleid uit de foto (benadering).
    elementen: [
      ...rij([['arm', 11, 101, strak], ['zit', 105, 101], ['zit', 105, 101]]),
      el('e4', 'hoek', 221, 0, 101, 101, 90),
      el('e5', 'zit', 221, 101, 100, 101, 90),
      el('e6', 'arm', 221, 201, 11, 101, 90, strak),
      // Zoals op de foto: per zitplaats een blauwgrijs lendenkussen (breder dan hoog), en twee witte kussens in de hoek.
      sierkussen('e7', 33, 38, 'chill_zone_051', 60, lenden), sierkussen('e8', 138, 38, 'chill_zone_051', 60, lenden), sierkussen('e9', 232, 38, 'chill_zone_051', 55, lenden),
      sierkussen('e10', 270, 112, 'katoen_kalk', 50, undefined, 90), sierkussen('e11', 270, 150, 'chill_zone_051', 40, undefined, 90),
    ],
  }, 'Nestor', MATEN_WEBSITE),
  model('belize', 'Belize', SOFA, 'Ruime U-opstelling op slanke zwarte poten: links een breed loungedeel zonder arm, twee zitplaatsen, een notelaren blad op de onderbouw en rechts een chaise longue met een korte arm. Dunne, strakke zit- en rugkussens.', {
    // Kleur gemeten op de productfoto (11/11): licht, warm grijs en gemêleerd (tot dan Chenille Parel: lichter en effen).
    hoofdmateriaal: 'melange_kiezel',
    opties: { poten: 'metaal_staaf', metaal: 'zwart', rug: 'los', comfort: 'veren', hout: 'notelaar', nekrol: 'met' },
    // Technische tekening: arm 23 breed en 65 hoog, zithoogte 46, diepte 100, zitdiepte 57, karkas 65, met rugkussen 87.
    // Uit de tekening en de foto's (benadering): poten ±15 cm, onderbouw en zitkussen ongeveer even dik (15 en 16 cm).
    vormgeving: { poothoogte: 15, zithoogte: 46, rughoogte: 87, armhoogte: 65, karkashoogte: 65, rugdikte: 18, rugkussendikte: 25, kussendikte: 16, zachtheid: 4 },
    // Opstelling van de foto's (11/11): het linkerdeel is één breed loungedeel (±150 cm) zonder arm met twee rugkussens; in
    // het midden twee zitplaatsen (tot dan drie, en links een smalle chaise met een arm); het blad ligt op de onderbouw;
    // de arm rechts is even diep als de zitting, de chaise loopt verder door.
    elementen: [
      ...rij([['chaise', 150, 165, metRug, { rugkussens: 2 }], ['zit', 95, 100], ['zit', 95, 100], ['console', 40, 100, opBasis], ['chaise', 100, 165, metRug], ['arm', 23, 100, strak]]),
      sierkussen('e7', 62, 41, 'sunny_grafiet'), sierkussen('e8', 98, 41, 'chenille_roest'),
      sierkussen('e9', 388, 41, 'sunny_grafiet'), sierkussen('e10', 424, 41, 'chenille_roest'),
    ],
  }, 'Belize', MATEN_WEBSITE),
  model('pula', 'Pula', SOFA, 'Lage, diepe sofa als een bak tot op de vloer: brede armen even hoog als de rug, één lange zitmatras per deel en losse sierkussens tegen de rug; een open notelaren kastje tussen de sofa en de chaise longue.', {
    hoofdmateriaal: 'melange_mos',
    // Foto's (11/11): geen vaste rugkussens maar grote, losse sierkussens tegen een lage rug; de rug en de armen zijn even
    // hoog (karkas 66 cm). De "89 cm met rugkussen" van de productpagina is de bovenkant van die losse kussens.
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', comfort: 'dons', hout: 'notelaar' },
    // Productpagina: diepte 107, zithoogte 39, karkas 66, met rugkussen 89, arm 66 hoog en 28 breed, zitdiepte 60.
    vormgeving: { zithoogte: 39, rughoogte: 66, armhoogte: 66, rugdikte: 22, kussendikte: 17, zachtheid: 5 },
    // Opstelling van de foto (11/11): één zitelement van 240 cm met één lang zitkussen (tot dan drie zitplaatsen met elk
    // een kussen), het kastje, en de chaise met een arm die even diep is als de sofa.
    elementen: [
      ...rij([['arm', 28, 107, strak], ['zit', 240, 107], ['console', 45, 107, { console_uitvoering: 'open' }], ['chaise', 105, 175, metRug], ['arm', 28, 107, strak]]),
      sierkussen('e6', 36, 21, 'katoen_kalk', 55), sierkussen('e7', 84, 21, 'melange_mos', 55), sierkussen('e8', 150, 21, 'katoen_kalk', 55), sierkussen('e9', 205, 21, 'vmat_salie', 50),
      sierkussen('e10', 318, 21, 'melange_mos', 55), sierkussen('e11', 364, 21, 'katoen_kalk', 50),
    ],
  }, 'Pula', MATEN_WEBSITE),
  model('frejus', 'Fréjus', SOFA, 'Lage sofa op een plateau met korte zwarte blokpootjes: dikke, losse donskussens, chaise longue links, lage slanke armen en een donker houten blad op het plateau rechts.', {
    // Kleur gemeten op de productfoto (11/11): warm beige en gemêleerd.
    hoofdmateriaal: 'melange_natuur',
    // Productpagina (10/11): rugkussen 100 × 60 met een extra kussen 60 × 50, pootjes uit beuk, 8 cm hoog, zwart. Geen
    // andere maten. Opgemeten op de foto van voren (11/11, benadering; schaal uit het extra kussen van 60 cm): een plateau
    // van ±15 cm dat onder de kussens uitsteekt, zitkussens van ±24 cm (zithoogte ±47), armen en karkas ±66 cm hoog, de
    // armen ±20 cm breed en niet dieper dan de zitting, rugkussens tot ±92 cm, de chaise ±120 cm breed, en rechts naast
    // de arm een donker houten blad van ±80 cm op hetzelfde plateau. Vierkante, donkere blokpootjes (tot dan ronde).
    opties: { poten: 'blok', hout: 'eik_zwart', rug: 'los_dons', comfort: 'dons' },
    vormgeving: { poothoogte: 8, zithoogte: 47, rughoogte: 92, armhoogte: 66, karkashoogte: 66, rugdikte: 14, rugkussendikte: 26, kussendikte: 24, zachtheid: 8, kussenoversteek: -6 },
    elementen: [
      ...rij([['arm', 20, 100, strak], ['chaise', 120, 165, metRug], ['zit', 105, 100], ['zit', 105, 100], ['arm', 20, 100, strak], ['console', 80, 100, opBasis]]),
      // Productpagina: bij elk rugkussen een extra kussen van 60 × 50 in dezelfde stof; op de sfeerfoto twee koraalrode erbij.
      sierkussen('e7', 62, 38, 'melange_natuur', 60), sierkussen('e8', 162, 38, 'melange_natuur', 60), sierkussen('e9', 267, 38, 'melange_natuur', 60),
      sierkussen('e10', 26, 50, 'velours_terracotta'), sierkussen('e11', 302, 50, 'velours_terracotta'),
    ],
  }),
  model('gozo', 'Gozo', SOFA, 'Modulaire hoeksofa uit blokken tot op de vloer: vaste zitblokken, een lage, dikke rug en dikke armblokken, met losse sierkussens tegen de rug.', {
    hoofdmateriaal: 'katoen_kalk',
    // Foto's (11/11): elk deel is één gestoffeerd blok tot op de vloer, zonder los zitkussen en zonder zichtbare poten, met
    // een bies langs de randen. De rug is laag en even dik als de armen; daartegen liggen losse sierkussens. Tot dan losse
    // zit- en rugkussens. Geen maten op de productpagina: alles is een benadering uit de foto's.
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', zitting: 'vaste_zitting', comfort: 'schuim', naad: 'bies' },
    vormgeving: { poothoogte: 1, zithoogte: 40, rughoogte: 62, armhoogte: 62, rugdikte: 30, zachtheid: 2 },
    elementen: [
      el('e1', 'hoek', 0, 0, 110, 110, 0),
      ...rij([['zit', 110, 110], ['zit', 110, 110], ['arm', 30, 110, strak]], 110).map((e, i) => ({ ...e, id: `e${i + 2}` })),
      el('e5', 'zit', 0, 110, 110, 110, 270),
      el('e6', 'arm', 0, 220, 30, 110, 270, strak),
      sierkussen('e7', 122, 29, 'sunny_taupe', 50), sierkussen('e8', 165, 29, 'sunny_taupe', 50), sierkussen('e9', 245, 29, 'katoen_naturel', 55), sierkussen('e10', 292, 29, 'boucle_kiezel', 45),
      sierkussen('e11', 29, 125, 'katoen_naturel', 55, undefined, 270), sierkussen('e12', 29, 175, 'sunny_taupe', 45, undefined, 270),
    ],
  }),
  model('azar', 'Azar', SOFA, 'Strakke, lage sofa in leder uit blokken: chaise longue links, een dikke vaste rug per zitplaats en een blokarm die even hoog is als de rug, zonder zichtbare poten.', {
    hoofdmateriaal: 'leder_cognac',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', zitting: 'vaste_zitting', comfort: 'schuim', naad: 'stiksel' },
    // Technische tekening op de productpagina (10/11 overgenomen): hoogte 74, arm 22 breed en 74 hoog (even hoog als de
    // rug), zithoogte 40, diepte 98, zitdiepte 67 (rug ±30 dik), blokvormig, op lage voetjes.
    vormgeving: { zithoogte: 40, rughoogte: 74, armhoogte: 74, rugdikte: 30, kussendikte: 18, zachtheid: 2 },
    // Foto (11/11 opnieuw bekeken): drie rugblokken, dus ook achter de chaise een rug (tot dan een open chaise), en geen
    // sierkussens op de productfoto.
    elementen: rij([['chaise', 95, 170, metRug], ['zit', 100, 98], ['zit', 100, 98], ['arm', 22, 98, strak]]),
  }, 'Azar', MATEN_WEBSITE),
  model('amusette', 'Amusette', SOFA, 'Compacte tweezit met ronde armen, een vaste zitting waarvan de voorkant in een grote boog tot op de grond rolt, en een vaste, licht hellende rug.', {
    // Op de foto een vlak geweven stof in grijsblauw (gemeten ±#375464): dichter bij Wol Oceaan dan bij Velours Petrol.
    hoofdmateriaal: 'wol_oceaan',
    // Foto's (10/11): de zitting is één stuk dat met een ronde voorkant tot op de grond loopt, geen los zitkussen.
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', zitting: 'vaste_zitting', comfort: 'schuim' },
    // Technische tekening: zithoogte 40, arm 15 breed en 60 hoog, diepte 80, zitdiepte 55, hoogte 71.
    // Zachtheid 8 (11/11): de voorkant van de zitting rolt in een grote boog naar beneden, zoals op de foto.
    vormgeving: { poothoogte: 1, zithoogte: 40, rughoogte: 71, armhoogte: 60, rugdikte: 25, kussendikte: 16, zachtheid: 8, rugvorm: 'hellend' },
    elementen: rij([['arm', 15, 80, strak], ['zit', 140, 80], ['arm', 15, 80, strak]]),
  }, 'Amusette', MATEN_WEBSITE),
  model('attribute', 'Attribute', SOFA, 'Tweezit met brede, lage blokarmen, dikke zitkussens tot vlak boven een teruggetrokken sokkel en losse rugkussens.', {
    hoofdmateriaal: 'wol_grijs',
    // Foto's (11/11): gewone naden, geen bies (tot dan een bies, die als een witte lijn rond elk kussen liep).
    opties: { poten: 'verdekt', poothoogte: 'standaard', rug: 'los', comfort: 'veren' },
    // Technische tekening: arm 23 breed en 55 hoog, zithoogte 45, diepte 100, zitdiepte 57, karkas 69, met rugkussen 87.
    // Uit de foto van dichtbij (benadering): een teruggetrokken sokkel van ±8 cm en zitkussens van ±24 cm die bijna tot
    // op de sokkel komen.
    vormgeving: { poothoogte: 8, zithoogte: 45, rughoogte: 87, armhoogte: 55, karkashoogte: 69, rugdikte: 18, rugkussendikte: 25, kussendikte: 24, zachtheid: 3 },
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
    // Opmerking van Jonas (controleblad 11/11): meer vorm in de kussens: dikkere, bollere rugkussens en een zachter zitkussen.
    vormgeving: { zithoogte: 47, rughoogte: 90, armhoogte: 63, karkashoogte: 86, rugdikte: 16, rugkussendikte: 30, rugkussens: 2, kussendikte: 18, zachtheid: 10 },
    elementen: rij([['arm', 21, 100, { armstijl: 'uitlopend' }], ['zit', 160, 100], ['arm', 21, 100, { armstijl: 'uitlopend' }]]),
  }, 'Wallace', MATEN_WEBSITE),
  model('esmee', 'Esmee', SOFA, 'Lange sofa in een witte hoes tot op de grond: lage, uitlopende armen, een vaste rug en een vaste zitting, met losse sierkussens aan de twee uiteinden.', {
    hoofdmateriaal: 'katoen_kalk',
    // Foto van voren (11/11 opgemeten, benadering; geen maten op de productpagina): rug ±85 cm, armen ±63 cm, zitting ±44 cm.
    // Geen aparte zit- of rugkussens: één hoes over zitting en rug, met vier losse sierkussens aan de uiteinden (tot dan
    // een los zitkussen en drie rugkussens).
    opties: { poten: 'housse', rug: 'vast', zitting: 'vaste_zitting', comfort: 'dons' },
    vormgeving: { zithoogte: 44, rughoogte: 85, armhoogte: 63, karkashoogte: 85, rugdikte: 16, zachtheid: 7 },
    elementen: [
      ...rij([['arm', 18, 95, { armstijl: 'uitlopend' }], ['zit', 220, 95], ['arm', 18, 95, { armstijl: 'uitlopend' }]]),
      sierkussen('e4', 22, 15, 'katoen_kalk', 60), sierkussen('e5', 62, 22, 'katoen_kalk', 60), sierkussen('e6', 168, 22, 'katoen_kalk', 50), sierkussen('e7', 198, 15, 'katoen_kalk', 55),
    ],
  }),

  // ---------------- Fauteuils ----------------
  model('pebble', 'Pebble', FAUTEUIL, 'Lage, brede organische fauteuil: een zachte kiezel als zitting met een scheve, ronde rug, zonder zichtbare poten.', {
    // Foto van voren (10/11 opgemeten): duidelijk breder dan hoog, ±1,34 : 1. Met een zithoogte van 42 cm geeft dat
    // ±115 cm breed en ±85 cm hoog (tot dan 85 breed en 92 hoog: te smal en te hoog). De productpagina geeft voor de
    // fauteuil geen maten (alleen voor de poef), dus dit blijft een benadering; 110 cm is de grens van het element.
    // Kleur gemeten op de foto (11/11): taupe (tot dan camel, in de 3D te oranje).
    hoofdmateriaal: 'teddy_taupe', opties: { poten: 'verdekt', poothoogte: 'laag', comfort: 'dons' },
    vormgeving: { zachtheid: 10, zithoogte: 42, rughoogte: 84 }, elementen: rij([['fauteuil', 110, 90, { kuipvorm: 'organisch' }]]),
  }, 'F-Pebble'),
  model('karl', 'Karl', FAUTEUIL, 'Loungestoel met gebogen rug en zitting in bouclé op een houten frame met hoge poten.', {
    // Kleur gemeten op de foto (11/11): taupe bouclé (tot dan wit).
    hoofdmateriaal: 'teddy_taupe', opties: { poten: 'conisch', hout: 'eik_zwart', rug: 'vast' },
    // Productpagina (10/11): breedte 68, hoogte 75, diepte 72. Op de foto's is de rug een ovaal kussen achter de zitting,
    // zonder vleugels naar voren (de schelp liep tot dan te ver rond).
    // Foto (11/11, benadering): hoge poten (±26 cm) met een dun donker houten frame (±5 cm) waarop het zitkussen ligt; tot
    // dan een dikke gestoffeerde onderbouw onder het kussen.
    vormgeving: { zachtheid: 6, rugdikte: 12, rughoogte: 75, poothoogte: 26, zithoogte: 45, kussendikte: 14 }, elementen: rij([['fauteuil', 68, 72, { kuipvorm: 'schelp' }]]),
  }, 'F-Karl', MATEN_WEBSITE),
  model('tumble', 'Tumble', FAUTEUIL, 'Ronde fauteuil in bouclé: een ronde zitting met een dikke, ronde rug rond de achterste helft, op een verdekte voet.', {
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'verdekt', poothoogte: 'laag', comfort: 'dons' },
    // Productpagina (10/11): breedte 78, diepte 86, hoogte 75, zithoogte 45. Op de foto staat de rug op een ronde zitting
    // die vooraan vrij is (tot dan een wand die bijna helemaal rond liep, tot op de vloer).
    vormgeving: { zachtheid: 9, zithoogte: 45, rughoogte: 75, kussendikte: 16 }, elementen: rij([['fauteuil', 78, 86, { kuipvorm: 'koepel' }]]),
  }, 'F-Tumble', MATEN_WEBSITE),
  model('ross', 'Ross', FAUTEUIL, 'Compacte fauteuil met afgeronde rug op een houten kruisvoet.', {
    // Productpagina (11/11): breedte 66, diepte 64, hoogte 78, zithoogte 43. Op de foto's een houten kruisvoet in een
    // warme bruine tint (tot dan vier losse cilinderpoten).
    // Foto (11/11, benadering): warm crème (gemeten), hoge poten (±23 cm) en een dun frame onder een dik zitkussen; tot
    // dan een onderbouw die even dik was als het kussen.
    hoofdmateriaal: 'melange_natuur', opties: { poten: 'kruis', hout: 'notelaar', zitting: 'vaste_zitting' },
    vormgeving: { zachtheid: 5, rugdikte: 12, poothoogte: 23, zithoogte: 43, rughoogte: 78, kussendikte: 15 }, elementen: rij([['fauteuil', 66, 64, { kuipvorm: 'afgerond' }]]),
  }, 'F-Ross', MATEN_WEBSITE),
  model('amusette-fauteuil', 'Amusette fauteuil', FAUTEUIL, 'Compacte clubfauteuil met strakke armen, een vaste zitting met ronde voorkant en een vaste, licht hellende rug (zelfde lijn als de Amusette sofa).', {
    // Productpagina (11/11): breedte 86, diepte 80, hoogte 71, zithoogte 40, zitdiepte 55; zonder armen, met één of met
    // twee armen. Tot dan 122 breed met lage, brede armen. Zelfde opbouw en stof als de Amusette sofa.
    hoofdmateriaal: 'wol_oceaan', opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', zitting: 'vaste_zitting', comfort: 'schuim' },
    vormgeving: { poothoogte: 1, zithoogte: 40, rughoogte: 71, armhoogte: 60, rugdikte: 25, kussendikte: 16, zachtheid: 8, rugvorm: 'hellend' },
    elementen: rij([['arm', 13, 80, strak], ['zit', 60, 80], ['arm', 13, 80, strak]]),
  }, 'F-Amusette', MATEN_WEBSITE),
  model('quin', 'Quin', FAUTEUIL, 'Ronde draaifauteuil met losse rugkussens in velours.', {
    // Foto (11/11): de zitting is één ronde trommel, zonder los zitkussen (tot dan een kussen op een even dikke onderbouw).
    hoofdmateriaal: 'velours_bosgroen', opties: { poten: 'draaivoet', rug: 'los_dons', comfort: 'dons', zitting: 'vaste_zitting' },
    // Productpagina (10/11): breedte 91, diepte 91, hoogte 78, zithoogte 45, 4 kussens inbegrepen.
    // Foto's van de productpagina (11/11, opmerking "de voet is groter"): de trommel loopt tot vlak boven de vloer, op een
    // brede, platte draaivoet die er nauwelijks onderuit komt (tot dan een smalle kolom met de trommel 12 cm hoger).
    vormgeving: { zachtheid: 8, zithoogte: 45, rughoogte: 78, poothoogte: 4 }, elementen: rij([['fauteuil', 91, 91, { kuipvorm: 'trommel' }]]),
  }, 'F-Quin', MATEN_WEBSITE),
  model('satie', 'Satie', FAUTEUIL, 'Ronde kuipfauteuil met los rugkussen in velours, op een verdekte voet.', {
    // Foto (11/11): steenrood velours met roze (gemeten; tot dan oudroze) en een zitting uit één ronde trommel, zonder los zitkussen.
    hoofdmateriaal: 'velours_framboos', opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'los', zitting: 'vaste_zitting' },
    // Productpagina (10/11): diameter 70 (1 kussen), 110 (4 kussens) of 130 (5 kussens), hoogte 70. Hier de kleinste.
    vormgeving: { zachtheid: 7, rughoogte: 70 }, elementen: rij([['fauteuil', 70, 70, { kuipvorm: 'trommel' }]]),
  }, 'F-Satie', MATEN_WEBSITE),
  model('mabel-1', 'Mabel 1-zit', FAUTEUIL, 'Afgeronde fauteuil in velours: een brede, gebogen rug die overloopt in lage armen, een dik zitkussen met bies en slanke donkere poten.', {
    // Foto (11/11): smaragdgroen velours (gemeten; tot dan witte bouclé), een dik zitkussen met bies op een dun donker
    // frame en hoge, schuine poten (±22 cm, benadering).
    hoofdmateriaal: 'velours_smaragd', opties: { poten: 'conisch', hout: 'eik_zwart', naad: 'bies' },
    // Productpagina (10/11): breedte 68, diepte 65, hoogte 76, zithoogte 45.
    // Foto's van de productpagina (11/11, opmerking "de leuning is kleiner"): de zitting is één dik blok (±20 cm) op een dun
    // frame, de rug staat erop en is laag en dun.
    vormgeving: { zachtheid: 6, poothoogte: 20, zithoogte: 45, rughoogte: 76, kussendikte: 20 }, elementen: rij([['fauteuil', 68, 65, { kuipvorm: 'ton' }]]),
  }, 'F-Mabel1', MATEN_WEBSITE),
  model('sullivan', 'Sullivan', FAUTEUIL, 'Fauteuil met hoge, afgeronde rug op een donkere houten kruisvoet; bijpassende hocker.', {
    // Productpagina (11/11): breedte 72, diepte 80, hoogte 93, zithoogte 42. Op de foto's een donkere houten kruisvoet
    // (tot dan een metalen draaivoet).
    // Foto (11/11, benadering): poten ±20 cm en een dun frame onder een dik zitkussen.
    hoofdmateriaal: 'wol_grijs', opties: { poten: 'kruis', hout: 'eik_zwart', zitting: 'vaste_zitting' },
    vormgeving: { zachtheid: 6, poothoogte: 20, zithoogte: 42, rughoogte: 93, kussendikte: 17 }, elementen: rij([['fauteuil', 72, 80, { kuipvorm: 'hoog' }]]),
  }, 'F-Sullivan', MATEN_WEBSITE),
  model('fraser', 'Fraser', FAUTEUIL, 'Kleine ronde kuipfauteuil in velours op hoge donkere poten met een kruisverbinding.', {
    // Productpagina (11/11): breedte 61, diepte 61, hoogte 70, zithoogte 44. Op de foto's hoge donkere poten (±22 cm,
    // benadering) met een kruis ertussen.
    // De rug is op de foto's een lage wand die rondom even hoog is (70 − 44 = 26 cm boven de zitting), geen hoge koepel.
    // Melding van Jonas (11/11): "Fraser heeft geen apart kussen". Op de foto's is de zitting één gestoffeerde trommel van
    // ±18 cm op het houten frame, zonder los zitkussen; poten ±26 cm (benadering).
    hoofdmateriaal: 'chenille_nachtblauw', opties: { poten: 'kruis', hout: 'eik_zwart', rug: 'vast', zitting: 'vaste_zitting' },
    vormgeving: { zachtheid: 6, zithoogte: 44, rughoogte: 70, poothoogte: 26 }, elementen: rij([['fauteuil', 61, 61, { kuipvorm: 'trommel' }]]),
  }, 'F-Fraser', MATEN_WEBSITE),
  model('milton', 'Milton', FAUTEUIL, 'Ronde kuipfauteuil: een dunne wand rond de rug, een rond zitkussen met bies en korte donkere poten.', {
    // Foto (11/11): een dunne wand die rond de rug bijna overal even hoog is, een rond zitkussen met een bies dat vooraan
    // vrij ligt, en vier korte donkere poten onder een gestoffeerde rand; taupe. Tot dan een draaifauteuil met een dikke,
    // hoge kuip op een draaivoet. Poten ±16 cm en zitkussen ±15 cm zijn uit de foto afgeleid (benadering).
    hoofdmateriaal: 'teddy_taupe', opties: { poten: 'blok', hout: 'eik_zwart', rug: 'vast', naad: 'bies' },
    // Productpagina (10/11): breedte 70, diepte 68, hoogte 72, zithoogte 40.
    vormgeving: { zachtheid: 6, poothoogte: 16, zithoogte: 40, rughoogte: 72, kussendikte: 15 }, elementen: rij([['fauteuil', 70, 68, { kuipvorm: 'trommel' }]]),
  }, 'F-Milton', MATEN_WEBSITE),
  model('manon', 'Manon', FAUTEUIL, 'Omhullende, ronde fauteuil uit één stuk: de zitting is een ronde trommel tot op de vloer, met een dunne wand die er ver omheen loopt.', {
    // Melding van Jonas (11/11): "Manon is in 1 stuk". Op de foto's geen los zitkussen en geen aparte onderbouw: de zitting
    // is één ronde trommel tot op de vloer en de wand loopt er als één geheel omheen (tot dan een kussen op een onderbouw).
    hoofdmateriaal: 'velours_oudroze', opties: { poten: 'verdekt', poothoogte: 'laag', zitting: 'vaste_zitting' },
    // Productpagina (10/11): breedte 75, diepte 70, hoogte 75, zithoogte 42.
    vormgeving: { zachtheid: 8, poothoogte: 1, zithoogte: 42, rughoogte: 75 }, elementen: rij([['fauteuil', 75, 70, { kuipvorm: 'omhullend' }]]),
  }, 'F-Manon', MATEN_WEBSITE),
  model('mabel-2', 'Mabel 2-zit', FAUTEUIL, 'Kleine tweezit als één gebogen schelp: de rug loopt rond in de armen, op een dik zitkussen met bies en slanke donkere poten.', {
    // Foto (11/11): één doorlopende, gebogen schelp (rug en armen uit één stuk) rond een dik zitkussen met een bies, op een
    // dun donker frame met schuine poten; blauw velours. Tot dan een rechte sofa met rolarmen. Geen maten op de
    // productpagina: uit de foto afgeleid met de zithoogte van de Mabel 1-zit (45 cm): ±145 breed, ±76 hoog (benadering).
    hoofdmateriaal: 'velours_petrol', opties: { poten: 'conisch', hout: 'eik_zwart', rug: 'vast', naad: 'bies' },
    vormgeving: { zachtheid: 6, poothoogte: 20, zithoogte: 45, rughoogte: 76, kussendikte: 20 },
    elementen: rij([['fauteuil', 145, 75, { kuipvorm: 'ton' }]]),
  }, 'F-Mabel2'),
  model('mabel-meridienne', 'Mabel Meridienne', FAUTEUIL, 'Méridienne in bouclé: de rug loopt hoog rond het linkeruiteinde en zakt achteraan schuin naar de zitting, op een dik zitkussen met bies en slanke donkere poten.', {
    // Foto (11/11, op vraag van Jonas opnieuw nagekeken): geen arm met een chaise, maar één rug die op volle hoogte rond
    // het linkeruiteinde loopt, achteraan op die hoogte blijft tot ±60 % van de breedte en dan kort en steil naar de zitting
    // zakt (±75 %); rechts is de zitting vrij. De rug staat op een dik zitkussen met bies dat eronder doorloopt, op een dun
    // donker houten frame met vier poten. Geen maten op de productpagina: uit de foto afgeleid met de zithoogte van de
    // Mabel 1-zit (45 cm): ±130 breed, ±74 hoog (benadering).
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'conisch', hout: 'eik_zwart', naad: 'bies', rug: 'vast' },
    vormgeving: { zachtheid: 6, poothoogte: 20, zithoogte: 45, rughoogte: 74, kussendikte: 20 },
    elementen: [
      ...rij([['fauteuil', 130, 75, { kuipvorm: 'meridienne' }]]),
      sierkussen('e2', 16, 15, 'vmat_kastanje', 42),
    ],
  }, 'F-MabelMeridienne'),

  // ---------------- Zetelbedden ----------------
  model('ziggy', 'Ziggy zetelbed', ZETELBED, 'Zetelbed met slanke armen die even hoog zijn als de rug, één doorlopend zitkussen, twee rugkussens, rolkussens tegen de armen en slanke metalen poten.', {
    // Technische tekening (11/11): arm 10 breed en 76 hoog (even hoog als de rug), zithoogte 50, diepte 98, zitdiepte 55.
    // Tot dan brede, lage armen.
    hoofdmateriaal: 'velours_bosgroen', opties: { poten: 'metaal_staaf', metaal: 'zwart', rug: 'los' },
    vormgeving: { zithoogte: 50, rughoogte: 78, armhoogte: 76, karkashoogte: 72, rugkussens: 2, kussendikte: 16, zachtheid: 4 },
    elementen: [
      ...rij([['arm', 10, 98, strak], ['zit', 160, 98, { functie: 'slaapfunctie' }], ['arm', 10, 98, strak]]),
      rolkussen('e4', 12, 34, 50, 270), rolkussen('e5', 148, 34, 50, 90),
    ],
  }, 'Z-Ziggy', MATEN_WEBSITE),
  model('aurora', 'Aurora zetelbed', ZETELBED, 'Zetelbed met slanke armen, twee zitkussens en slanke metalen poten.', {
    // Geen maten op de productpagina. Foto (11/11, benadering): slanke armen (±10 cm) net onder de rugkussens, en tegen
    // elke arm een los kussen in dezelfde stof.
    // Kleur gemeten op de foto (11/11): warm crème.
    hoofdmateriaal: 'wol_havermout', opties: { poten: 'metaal_staaf', metaal: 'zwart', rug: 'los' },
    vormgeving: { zitkussens: 2, rugkussens: 2, armhoogte: 66, zachtheid: 5 },
    elementen: [
      ...rij([['arm', 10, 95, strak], ['zit', 180, 95, { functie: 'slaapfunctie' }], ['arm', 10, 95, strak]]),
      sierkussen('e4', 12, 30, 'wol_havermout', 40), sierkussen('e5', 148, 30, 'wol_havermout', 40),
    ],
  }, 'Z-Aurora'),
  model('zora', 'Zora zetelbed', ZETELBED, 'Zetelbed met slanke, hoge armen, bies en één zitkussen.', {
    // Technische tekening (11/11): hoogte 74, zithoogte 47, arm 10 breed (licht bol), diepte 98, zitdiepte 55. Op de foto
    // zijn de armen bijna even hoog als de rug en grijsblauw. Tot dan rolarmen (een rol bovenop) in groengrijs.
    hoofdmateriaal: 'katoen_petrolgrijs', opties: { poten: 'verdekt', poothoogte: 'laag', naad: 'bies', rug: 'vast' },
    vormgeving: { zithoogte: 47, rughoogte: 74, armhoogte: 70, zachtheid: 6 },
    elementen: [
      ...rij([['arm', 10, 98, strak], ['zit', 170, 98, { functie: 'slaapfunctie' }], ['arm', 10, 98, strak]]),
      // Zoals op de foto: twee beige sierkussens links.
      sierkussen('e4', 16, 20, 'sunny_taupe'), sierkussen('e5', 50, 20, 'wol_havermout'),
    ],
  }, 'Z-Zora', MATEN_WEBSITE),
  model('phoenix', 'Phoenix zetelbed', ZETELBED, 'Compact zetelbed met strakke armen en vaste rug.', {
    // Foto (11/11): donker, warm grijs (tot dan middengrijs).
    hoofdmateriaal: 'chenille_steengrijs', opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast' },
    elementen: rij([['arm', 20, 95, strak], ['zit', 130, 95, { functie: 'slaapfunctie' }], ['arm', 20, 95, strak]]),
  }, 'Z-Phoenix'),
  model('daizy-classic', 'Daizy Classic zetelbed', ZETELBED, 'Klassiek zetelbed met twee zitkussens en sierkussens.', {
    // Technische tekening (11/11): arm 14 breed en 60 hoog, zithoogte 47, hoogte 74, diepte 98, zitdiepte 55.
    // Foto (11/11): taupe (gemeten), met tegen elke arm een los kussen in dezelfde stof.
    hoofdmateriaal: 'sunny_taupe', opties: { poten: 'blok', poothoogte: 'laag', hout: 'eik_zwart', rug: 'los' },
    vormgeving: { zitkussens: 2, rugkussens: 2, zithoogte: 47, rughoogte: 74, armhoogte: 60, karkashoogte: 62 },
    elementen: [
      ...rij([['arm', 14, 98, strak], ['zit', 170, 98, { functie: 'slaapfunctie' }], ['arm', 14, 98, strak]]),
      sierkussen('e4', 16, 34, 'sunny_taupe', 40), sierkussen('e5', 142, 34, 'sunny_taupe', 40),
    ],
  }, 'Z-DaizyClassic', MATEN_WEBSITE),
  model('daizy-slim', 'Daizy Slim zetelbed', ZETELBED, 'Slanke variant met smalle armen en twee zitkussens.', {
    // Technische tekening (11/11): arm 8 breed en 60 hoog, zithoogte 47, hoogte 74, diepte 98.
    // Eerste foto op de productpagina (11/11): een oudroze uitvoering met twee sierkussens.
    hoofdmateriaal: 'velours_oudroze', opties: { poten: 'blok', poothoogte: 'laag', hout: 'eik_zwart', rug: 'los' },
    vormgeving: { zitkussens: 2, rugkussens: 2, zithoogte: 47, rughoogte: 74, armhoogte: 60, karkashoogte: 62 },
    elementen: [
      ...rij([['arm', 8, 98, strak], ['zit', 160, 98, { functie: 'slaapfunctie' }], ['arm', 8, 98, strak]]),
      sierkussen('e4', 14, 34, 'jacquard_ruit', 50), sierkussen('e5', 112, 34, 'jacquard_ruit', 50),
    ],
  }, 'Z-DaizySlim', MATEN_WEBSITE),

  // ---------------- Poufs & hockers ----------------
  model('sullivan-hocker', 'Sullivan Hocker', POEF, 'Ronde hocker op een donkere houten kruisvoet, bij de Sullivan fauteuil.', {
    // Productpagina (11/11): 62 × 62, hoogte 42; op de foto dezelfde kruisvoet als de fauteuil.
    hoofdmateriaal: 'wol_grijs', opties: { poten: 'kruis', poothoogte: 'hoog', hout: 'eik_zwart' }, elementen: rij([['poef', 62, 62, { poefvorm: 'rond' }]]),
  }, 'P-Sullivan', MATEN_WEBSITE),
  model('tumble-pouf', 'Tumble pouf', POEF, 'Ronde, bolle pouf die tot op de vloer loopt.', {
    // Productpagina van de Tumble (11/11): diameter 59, zithoogte 45. Op de foto een bolle ton in camel, zonder zichtbare voet.
    hoofdmateriaal: 'chenille_camel', opties: { poten: 'verdekt', poothoogte: 'laag' },
    vormgeving: { poothoogte: 1, zithoogte: 45 }, elementen: rij([['poef', 59, 59, { poefvorm: 'bol' }]]),
  }, 'P-Tumble', MATEN_WEBSITE),
  model('stockholm', 'Stockholm pouf', POEF, 'Ronde pouf in donkerblauw, onderaan breder dan bovenaan, in twee formaten.', {
    // Foto (11/11): taps toelopend met een ronde bovenrand, tot op de vloer, donkerblauw (tot dan een rechte trommel in petrol).
    hoofdmateriaal: 'chenille_nachtblauw', opties: { poten: 'verdekt', poothoogte: 'laag' },
    vormgeving: { poothoogte: 1 }, elementen: rij([['poef', 60, 60, { poefvorm: 'taps' }]]),
  }, 'P-Stockholm'),
  model('kanto', 'Kanto pouf', POEF, 'Vierkante pouf, hier in een stof met patroon.', {
    hoofdmateriaal: 'jacquard_ruit', opties: { poten: 'verdekt', poothoogte: 'laag' }, vormgeving: { poothoogte: 1 }, elementen: rij([['poef', 45, 45, { poefvorm: 'vierkant' }]]),
  }, 'P-Kanto'),
  model('fez', 'Fez pouf', POEF, 'Hoge, cilindervormige pouf.', {
    // Foto (11/11): hoger dan breed, tot op de vloer.
    hoofdmateriaal: 'wol_grijs', opties: { poten: 'verdekt', poothoogte: 'laag' }, vormgeving: { poothoogte: 1, zithoogte: 50 }, elementen: rij([['poef', 40, 40, { poefvorm: 'rond' }]]),
  }, 'P-Fez'),
  model('pebble-pouf', 'Pebble pouf', POEF, 'Lage, kiezelvormige pouf.', {
    // Productpagina van de Pebble (11/11): poef 82 breed, 61 diep, 42 hoog (tot dan 120 × 55). Kleur van de foto.
    hoofdmateriaal: 'chenille_camel', opties: { poten: 'verdekt', poothoogte: 'laag' },
    vormgeving: { poothoogte: 1, zithoogte: 44 }, elementen: rij([['poef', 82, 61, { poefvorm: 'kiezel' }]]),
  }, 'P-Pebble', MATEN_WEBSITE),
  // De twee hockers staan zonder foto op de website: zelfde stof en poten als de fauteuil waarbij ze horen (11/11).
  model('mabel-hocker', 'Mabel Hocker', POEF, 'Hocker bij de Mabel fauteuil.', {
    hoofdmateriaal: 'velours_smaragd', opties: { poten: 'conisch', poothoogte: 'hoog', hout: 'eik_zwart', naad: 'bies' }, elementen: rij([['poef', 55, 55, { poefvorm: 'rond' }]]),
  }, null),
  model('fraser-hocker', 'Fraser Hocker', POEF, 'Hocker bij de Fraser fauteuil.', {
    hoofdmateriaal: 'chenille_nachtblauw', opties: { poten: 'kruis', poothoogte: 'hoog', hout: 'eik_zwart' }, elementen: rij([['poef', 50, 50, { poefvorm: 'rond' }]]),
  }, null),
];

export const modelFamilies = [SOFA, FAUTEUIL, ZETELBED, POEF];
