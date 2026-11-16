/**
 * De getallen voor de schatting van de stabiliteit (src/stabiliteit.ts): de belasting per soort vloer of dak, de
 * eigenschappen per houtklasse, de factoren, de grens voor de doorbuiging en een lijst van gangbare doorsneden.
 *
 * **Geen enkel getal hier is in een norm nagelezen.** Er was geen toegang tot normen: elke waarde is een richtwaarde
 * uit algemene kennis, in de orde van grootte die in de vakliteratuur gangbaar is. Elke waarde zegt dat in haar
 * `herkomst` en heeft `nagelezen: false`: **een ingenieur leest ze na**. Wie een waarde naleest, zet de bron in
 * `verwijzing` en `nagelezen` op `true`; pas dan verdwijnt "niet nagelezen" uit de uitkomst.
 *
 * De belastingen zijn ronde waarden voor een gewone woning, niet het gewicht van een bepaalde opbouw: een dekvloer,
 * scheidingswanden op de vloer, grind, een groendak of een terras wegen meer en zitten er niet in. De sneeuwlast en de
 * wind hangen af van de plaats, de hoogte en de vorm van het dak; hier staat één ronde waarde voor "sneeuw of
 * onderhoud" en geen wind.
 */
import type { Balkmaat, OpbouwHerkomst, Richtwaarde, StabiliteitsWaarden } from '../src/index.js';

/** De herkomst van een richtwaarde: uit algemene kennis, door niemand nagelezen. `waar` zegt waar ze na te lezen is. */
const richtwaarde = (waar: string): OpbouwHerkomst => ({
  bron: 'algemene kennis',
  verwijzing: `Richtwaarde uit algemene kennis; geen norm geopend. Een ingenieur leest ze na: ${waar}.`,
  nagelezen: false,
});

const KLASSEN = 'de norm met de sterkteklassen van constructiehout (NBN EN 338) en de sortering van het geleverde hout';
const LASTEN = 'de normen voor belastingen op gebouwen (NBN EN 1991-1-1 voor gewicht en gebruik, -1-3 voor sneeuw, -1-4 voor wind) met hun Belgische bijlagen, en het echte gewicht van de opbouw';
const FACTOREN = 'NBN EN 1990 (factoren op de lasten) en NBN EN 1995-1-1 met de Belgische bijlage (materiaalfactor, duur van de last, kruip)';
const VERVORMING = 'NBN EN 1995-1-1 met de Belgische bijlage en de Belgische norm over de grenzen voor vervormingen van draagsystemen (uit het geheugen: NBN B 03-003), en wat het schrijnwerk onder een latei verdraagt';

const factor = (waarde: number, uitleg?: string): Richtwaarde => ({ waarde, herkomst: richtwaarde(FACTOREN), ...(uitleg ? { uitleg } : {}) });
const grens = (waarde: number, uitleg: string): Richtwaarde => ({ waarde, herkomst: richtwaarde(VERVORMING), uitleg });

/** Gangbare doorsneden van gezaagd naaldhout in mm (breedte × hoogte), oplopend. */
const doorsneden: Balkmaat[] = [
  ...[140, 184, 235, 286].map((hoogte) => ({ breedte: 38, hoogte })),
  ...[150, 175, 200, 225].map((hoogte) => ({ breedte: 50, hoogte })),
  ...[150, 175, 200, 225].map((hoogte) => ({ breedte: 63, hoogte })),
  ...[150, 175, 200, 225, 250, 300].map((hoogte) => ({ breedte: 75, hoogte })),
  ...[200, 225, 250, 300].map((hoogte) => ({ breedte: 100, hoogte })),
];

export const stabiliteitswaarden: StabiliteitsWaarden = {
  // Gezaagd naaldhout: buigsterkte en elasticiteit in N/mm², dichtheid in kg/m³.
  houtklassen: {
    C18: { buigsterkte: 18, elasticiteit: 9000, dichtheid: 380, herkomst: richtwaarde(KLASSEN) },
    C24: { buigsterkte: 24, elasticiteit: 11000, dichtheid: 420, herkomst: richtwaarde(KLASSEN) },
    C30: { buigsterkte: 30, elasticiteit: 12000, dichtheid: 460, herkomst: richtwaarde(KLASSEN) },
  },
  // Een opbouw zegt geen houtklasse. C24 is een gangbare klasse voor constructiehout; of het geleverde hout ze haalt,
  // staat op de leveringsbon.
  standaardHoutklasse: 'C24',
  lasten: {
    vloer_woning: {
      naam: 'vloer van een woning',
      blijvend: 1.0,
      veranderlijk: 2.0,
      duur: 'middellang',
      langdurigDeel: 0.3,
      klimaatklasse: 1,
      herkomst: richtwaarde(LASTEN),
      uitleg: 'blijvend: een lichte houten vloer met plafond, vloerplaat en afwerking, de balken erbij, zonder dekvloer en zonder scheidingswanden op de vloer; veranderlijk: mensen en meubels in een woning',
    },
    plat_dak: {
      naam: 'plat dak',
      blijvend: 0.75,
      veranderlijk: 1.0,
      duur: 'kort',
      langdurigDeel: 0,
      klimaatklasse: 2,
      herkomst: richtwaarde(LASTEN),
      uitleg: 'blijvend: een licht plat dak met roostering, plaat, isolatie, dichting en plafond, zonder grind, tegels, groendak of terras; veranderlijk: sneeuw of onderhoud (niet samen), één ronde waarde aan de veilige kant, zonder water dat blijft staan',
    },
    hellend_dak: {
      naam: 'hellend dak met pannen',
      blijvend: 0.9,
      veranderlijk: 1.0,
      duur: 'kort',
      langdurigDeel: 0,
      klimaatklasse: 2,
      herkomst: richtwaarde(LASTEN),
      uitleg: 'blijvend: pannen, latten, onderdak, kepers, isolatie en gipsplaat, per m² dakvlak; veranderlijk: sneeuw of onderhoud (niet samen), per m² horizontaal gemeten, één ronde waarde aan de veilige kant; wind is niet meegerekend',
    },
  },
  factoren: {
    lastBlijvend: factor(1.35),
    lastVeranderlijk: factor(1.5),
    materiaal: factor(1.3, 'gezaagd hout'),
    duur: {
      blijvend: factor(0.6),
      middellang: factor(0.8),
      kort: factor(0.9),
    },
    kruip: {
      1: factor(0.6, 'binnen en verwarmd'),
      2: factor(0.8, 'overdekt maar niet verwarmd'),
    },
  },
  // De doorbuiging op lange termijn mag hoogstens de overspanning gedeeld door dit getal zijn.
  doorbuiging: {
    vloerbalk: grens(300, 'midden van wat gangbaar is voor een vloer'),
    dakbalk: grens(300, 'zoals een vloer: op een plat dak mag er geen water blijven staan'),
    keper: grens(250, 'een hellend dak mag iets meer doorbuigen'),
    latei: grens(500, 'strenger, omdat er een raam of een deur onder zit; een schuifraam verdraagt nog minder'),
  },
  doorsneden: {
    lijst: doorsneden,
    herkomst: {
      bron: 'algemene kennis',
      verwijzing: 'Lijst uit algemene kennis, bij geen houthandel nagelezen: maten, klassen en lengtes verschillen per handelaar. Een vakman of ingenieur leest ze na.',
      nagelezen: false,
    },
  },
};
