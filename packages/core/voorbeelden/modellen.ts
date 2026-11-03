/**
 * De collectie van de pilootklant (website, pagina's Sofa's, Fauteuils, Zetelbedden, Poufs & Hockers),
 * als vertrekpunt voor de configurator.
 *
 * LET OP: de website toont per model alleen de naam en een foto. Opbouw, maten, opties en
 * prijzen zijn een BENADERING op basis van die foto's en moeten met de klant bevestigd worden.
 */
import type { ModelDefinitie, Ontwerp, OntwerpElement, Rotatie, Vormgeving } from '../src/index.js';

const BRON = "Benadering op basis van de productfoto op de website; maten en opties nog te bevestigen.";
const BRON_ZONDER_FOTO = 'Benadering zonder foto (staat zonder beeld op de website); nog te bevestigen.';

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

function model(
  code: string, naam: string, familie: string, omschrijving: string,
  ontwerp: Omit<Ontwerp, 'model'>, foto: string | null = naam,
): ModelDefinitie {
  return { code, naam, familie, omschrijving, bron: foto ? BRON : BRON_ZONDER_FOTO, ...(foto ? { foto } : {}), ontwerp: { ...ontwerp, model: code } };
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
  model('kotor', 'Kotor', SOFA, 'Diepe, lage sofa met chaise longue rechts, losse rugkussens, strakke lage arm en een lage houten bank aan de zijkant.', {
    hoofdmateriaal: 'linnen_travertin',
    opties: { poten: 'conisch', hout: 'eik_zwart', zithoogte: 'laag', rug: 'los', comfort: 'dons' },
    vormgeving: { kussendikte: 16, zachtheid: 6, rugdikte: 16 },
    elementen: [
      el('e1', 'console', 0, 25, 60, 80, 0, { console_uitvoering: 'bank' }),
      ...rij([['arm', 18, 105, strakLaag], ['zit', 105, 105], ['zit', 105, 105]], 60).map((e, i) => ({ ...e, id: `e${i + 2}` })),
      el('e5', 'chaise', 288, 0, 95, 170, 0, metRug),
      el('e6', 'arm', 383, 0, 18, 170, 0, strakLaag),
    ],
  }),
  model('doha', 'Doha', SOFA, 'Organische sofa met afgeronde lounge-uiteinden, losse rugkussens en een zachte, ronde lijn.', {
    hoofdmateriaal: 'boucle_belize',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'los', comfort: 'dons' },
    vormgeving: { zachtheid: 9, rugvorm: 'rond', kussendikte: 15 },
    elementen: rij([['rond_einde', 150, 110, { ronde_kant: 'links' }], ['zit', 100, 100], ['rond_einde', 110, 100, { ronde_kant: 'rechts' }]]),
  }),
  model('montego', 'Montego', SOFA, 'Lage, afgeronde sofa in bouclé zonder armen, op een verdekte voet.', {
    hoofdmateriaal: 'boucle_belize',
    opties: { poten: 'verdekt', poothoogte: 'laag', zithoogte: 'laag', rug: 'vast', comfort: 'dons' },
    vormgeving: { zachtheid: 10, rugvorm: 'rond', rugdikte: 24, kussendikte: 18 },
    elementen: rij([['rond_einde', 130, 100, { ronde_kant: 'links' }], ['rond_einde', 130, 100, { ronde_kant: 'rechts' }]]),
  }),
  model('nestor', 'Nestor', SOFA, 'Grote hoeksofa (hoek rechts) met dikke losse rugkussens en een lage, verdekte voet.', {
    hoofdmateriaal: 'katoen_naturel',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'los_dons', comfort: 'dons' },
    vormgeving: { kussendikte: 18, zachtheid: 6, rugdikte: 20 },
    elementen: [
      ...rij([['arm', 22, 100, strakLaag], ['zit', 95, 100], ['zit', 95, 100], ['zit', 95, 100]]),
      el('e5', 'hoek', 307, 0, 100, 100, 90),
      el('e6', 'zit', 307, 100, 95, 100, 90),
      el('e7', 'arm', 307, 195, 22, 100, 90, strakLaag),
    ],
  }),
  model('belize', 'Belize', SOFA, 'Ruime U-opstelling met twee chaises longues, losse rugkussens, slanke armen en slanke metalen poten.', {
    hoofdmateriaal: 'linnen_ficelle',
    opties: { poten: 'metaal_staaf', metaal: 'zwart', rug: 'los', comfort: 'veren' },
    elementen: rij([['arm', 16, 165, strakLaag], ['chaise', 90, 165, metRug], ['zit', 90, 95], ['zit', 90, 95], ['zit', 90, 95], ['chaise', 90, 165, metRug], ['arm', 16, 165, strakLaag]]),
  }),
  model('pula', 'Pula', SOFA, 'Lange, diepe sofa met grote chaise longue rechts, losse rugkussens en brede, lage armen op een verdekte voet.', {
    hoofdmateriaal: 'linnen_brume',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'los', comfort: 'dons' },
    vormgeving: { kussendikte: 16, zachtheid: 5 },
    elementen: rij([['arm', 26, 108, strakLaag], ['zit', 100, 108], ['zit', 100, 108], ['zit', 100, 108], ['chaise', 105, 175, metRug], ['arm', 26, 175, strakLaag]]),
  }),
  model('frejus', 'Fréjus', SOFA, 'Sofa met chaise longue links, zachte losse rugkussens en slanke donkere poten.', {
    hoofdmateriaal: 'linnen_travertin',
    opties: { poten: 'cilinder', hout: 'eik_zwart', rug: 'los_dons', comfort: 'dons' },
    vormgeving: { zachtheid: 7, kussendikte: 16 },
    elementen: rij([['arm', 18, 165, strakLaag], ['chaise', 90, 165, metRug], ['zit', 95, 100], ['zit', 95, 100], ['arm', 18, 100, strakLaag]]),
  }),
  model('gozo', 'Gozo', SOFA, 'Modulaire, blokvormige hoeksofa met brede rug- en armblokken, zonder zichtbare poten.', {
    hoofdmateriaal: 'katoen_naturel',
    opties: { poten: 'verdekt', poothoogte: 'laag', zithoogte: 'laag', rug: 'los_dons', comfort: 'dons' },
    vormgeving: { rugdikte: 28, kussendikte: 20, zachtheid: 3 },
    elementen: [
      el('e1', 'hoek', 0, 0, 110, 110, 0),
      ...rij([['zit', 110, 110], ['zit', 110, 110], ['arm', 32, 110, strak]], 110).map((e, i) => ({ ...e, id: `e${i + 2}` })),
      el('e5', 'zit', 0, 110, 110, 110, 270),
      el('e6', 'arm', 0, 220, 32, 110, 270, strak),
    ],
  }),
  model('azar', 'Azar', SOFA, 'Strakke, lage sofa in leder met chaise longue links en brede blokarm, zonder zichtbare poten.', {
    hoofdmateriaal: 'leder_cognac',
    opties: { poten: 'verdekt', poothoogte: 'laag', zithoogte: 'laag', rug: 'vast', comfort: 'schuim' },
    vormgeving: { rugdikte: 24, kussendikte: 18, zachtheid: 2 },
    elementen: rij([['chaise', 95, 170, zonderRug], ['zit', 100, 100], ['zit', 100, 100], ['arm', 30, 100, strak]]),
  }),
  model('amusette', 'Amusette', SOFA, 'Compacte tweezit met brede, strakke armen, één doorlopend zitkussen en een vaste rug.', {
    hoofdmateriaal: 'velours_petrol',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', comfort: 'schuim' },
    vormgeving: { zachtheid: 4, kussendikte: 18 },
    elementen: rij([['arm', 28, 92, strak], ['zit', 140, 92], ['arm', 28, 92, strak]]),
  }),
  model('attribute', 'Attribute', SOFA, 'Tweezit met brede, lage armen, twee zitkussens en losse rugkussens op een verdekte voet.', {
    hoofdmateriaal: 'wol_grijs',
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'los', comfort: 'veren' },
    vormgeving: { zachtheid: 5, kussendikte: 18 },
    elementen: rij([['arm', 30, 100, strakLaag], ['zit', 90, 100], ['zit', 90, 100], ['arm', 30, 100, strakLaag]]),
  }),
  model('husk', 'Husk', SOFA, 'Lange, slanke sofa met hoes tot op de grond, één lang zitkussen en losse rugkussens.', {
    hoofdmateriaal: 'linnen_travertin',
    opties: { poten: 'housse', rug: 'los', comfort: 'veren', zitting: 'losse_kussens' },
    vormgeving: { zachtheid: 4 },
    elementen: rij([['arm', 14, 95, strak], ['zit', 220, 95], ['arm', 14, 95, strak]]),
  }),
  model('wallace', 'Wallace', SOFA, 'Klassieke sofa met uitlopende rolarmen, hoes tot op de grond en grote losse donzen rugkussens.', {
    hoofdmateriaal: 'linnen_ficelle',
    opties: { poten: 'housse', rug: 'los_dons', comfort: 'dons', naad: 'bies' },
    vormgeving: { zachtheid: 7 },
    elementen: rij([['arm', 22, 95, { armstijl: 'rond' }], ['zit', 160, 95], ['arm', 22, 95, { armstijl: 'rond' }]]),
  }),
  model('esmee', 'Esmee', SOFA, 'Lange sofa met lage, uitlopende armen, hoes tot op de grond en losse kussens.', {
    hoofdmateriaal: 'katoen_naturel',
    opties: { poten: 'housse', rug: 'los', comfort: 'dons' },
    vormgeving: { zachtheid: 6 },
    elementen: rij([['arm', 18, 95, { armstijl: 'engels' }], ['zit', 220, 95], ['arm', 18, 95, { armstijl: 'engels' }]]),
  }),

  // ---------------- Fauteuils ----------------
  model('pebble', 'Pebble', FAUTEUIL, 'Zachte, organische fauteuil met hoge, ronde rug, zonder zichtbare poten.', {
    hoofdmateriaal: 'linnen_ficelle', opties: { poten: 'verdekt', poothoogte: 'laag', rughoogte: 'hoog', comfort: 'dons' },
    vormgeving: { zachtheid: 10 }, elementen: rij([['fauteuil', 85, 85, { kuipvorm: 'organisch' }]]),
  }, 'F-Pebble'),
  model('karl', 'Karl', FAUTEUIL, 'Loungestoel met gebogen rug en zitting in bouclé op een houten frame met hoge poten.', {
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'conisch', poothoogte: 'hoog', hout: 'eik_zwart', rug: 'vast' },
    vormgeving: { zachtheid: 6, rugdikte: 12 }, elementen: rij([['fauteuil', 72, 78, { kuipvorm: 'schelp' }]]),
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
    hoofdmateriaal: 'velours_petrol', opties: { poten: 'cilinder', poothoogte: 'hoog', hout: 'eik_zwart' },
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
    hoofdmateriaal: 'velours_petrol', opties: { poten: 'conisch', poothoogte: 'hoog', hout: 'eik_zwart', rug: 'vast' },
    vormgeving: { rugvorm: 'rond', zachtheid: 6 }, elementen: rij([['arm', 12, 82, { armstijl: 'rond', armhoogte: 'laag' }], ['zit', 140, 82], ['arm', 12, 82, { armstijl: 'rond', armhoogte: 'laag' }]]),
  }, 'F-Mabel2'),
  model('mabel-meridienne', 'Mabel Meridienne', FAUTEUIL, 'Meridienne met rug en arm aan één kant, bies en slanke donkere poten.', {
    hoofdmateriaal: 'boucle_belize', opties: { poten: 'conisch', poothoogte: 'hoog', hout: 'eik_zwart', naad: 'bies', rug: 'vast' },
    vormgeving: { rugvorm: 'rond' }, elementen: rij([['arm', 14, 80, { armstijl: 'rond' }], ['zit', 80, 80], ['zit_zonder_rug', 90, 80]]),
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
