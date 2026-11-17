/**
 * De getallen voor de aanwijzing voor EPB (src/warmte.ts): warmtegeleiding per materiaal van de voorbeeldopbouwen
 * (opbouwen.ts), overgangsweerstanden, de weerstand van een stilstaande luchtlaag, de toeslag voor hout in een
 * houtskeletwand en de grootste toegelaten U-waarden.
 *
 * **Geen enkel getal hier is in een bron nagelezen.** Er was geen toegang tot normen, regelgeving of technische fiches:
 * elke waarde is een richtwaarde uit algemene kennis, in de orde van grootte die in de vakliteratuur gangbaar is. Elke
 * waarde zegt dat in haar `herkomst` en heeft `nagelezen: false`. Een EPB-verslaggever moet ze nalezen in de geldende
 * regels (voor EPB: het document met de rekenregels voor transmissie en de eisentabel van het jaar van de aanvraag) en
 * op de technische fiche van het echte product. Wie een waarde naleest, zet de bron in `verwijzing` en `nagelezen` op
 * `true`; pas dan verdwijnt de waarschuwing uit de uitkomst.
 *
 * De warmtegeleiding hangt af van het product, niet van de soort materiaal alleen: isolatie van twee fabrikanten
 * verschilt. De codes zijn die van `bouwMaterialen` in opbouwen.ts; dat bestand zelf blijft zonder warmtegeleiding.
 * Folies en dampschermen staan er niet in: een folie telt niet mee in de berekening.
 */
import type { OpbouwHerkomst, Richtwaarde, WarmteWaarden } from '../src/index.js';

/** De herkomst van een richtwaarde: uit algemene kennis, door niemand nagelezen. `waar` zegt waar ze na te lezen is. */
const richtwaarde = (waar: string): OpbouwHerkomst => ({
  bron: 'algemene kennis',
  verwijzing: `Richtwaarde uit algemene kennis; geen norm, regel of fiche geopend. Iemand moet ze nalezen in de geldende regels: ${waar}.`,
  nagelezen: false,
});

const FICHE = 'de technische fiche van het product (voor EPB de rekenwaarde van de warmtegeleiding), of de standaardwaarden van de EPB-regels als er geen erkende fiche is';
const OVERGANG = 'de rekenregels voor de warmteweerstand van bouwdelen (NBN EN ISO 6946) en het transmissiedocument van de EPB-regels';
const EISEN = 'de EPB-eisentabel van het gewest en van het jaar van de bouwaanvraag (de grootste toegelaten U-waarden per soort scheidingsconstructie)';

/** Een warmtegeleiding in W/(m·K). */
const lambda = (waarde: number, uitleg?: string): Richtwaarde => ({ waarde, herkomst: richtwaarde(FICHE), ...(uitleg ? { uitleg } : {}) });

export const warmtewaarden: WarmteWaarden = {
  geleiding: {
    vuren: lambda(0.13, 'naaldhout, dwars op de vezel'),
    gipsplaat: lambda(0.25),
    osb: lambda(0.13),
    houtvezelplaat: lambda(0.045, 'isolatieplaat in houtvezel; de fiches lopen uiteen van ongeveer 0,037 tot 0,050'),
    cementplaat: lambda(0.35, 'ruwe orde van grootte; hangt sterk af van het soort plaat'),
    minerale_wol: lambda(0.035, 'gangbare waarde voor glas- of rotswol; de fiches lopen uiteen van ongeveer 0,032 tot 0,040'),
    isolatieplaat: lambda(
      0.025,
      'aangenomen als een plaat in PIR of PUR (fiches ongeveer 0,022 tot 0,027); een plaat in EPS of XPS isoleert minder goed (ongeveer 0,030 tot 0,040) en geeft een hogere U-waarde',
    ),
    gevelplanken: lambda(0.18, 'houtsoort onbekend: de waarde van zwaarder hout, de veilige kant'),
    steenstrips: lambda(1.1, 'zoals gevelsteen'),
    sierpleister: lambda(1.0, 'minerale buitenpleister'),
    binnenpleister: lambda(0.57, 'gipspleister'),
    snelbouwsteen: lambda(0.45, 'hangt af van het gewicht van de steen en van de mortel; aan de veilige kant gekozen'),
    gevelsteen: lambda(1.1, 'buiten, dus nat gerekend'),
    beton: lambda(2.3, 'gewapend beton'),
    dekvloer: lambda(1.4, 'cementgebonden dekvloer'),
    vloertegels: lambda(1.3, 'keramische tegels'),
    parket: lambda(0.18, 'loofhout'),
    epdm: lambda(0.25),
    dakpannen: lambda(1.0, 'gebakken klei'),
    // Liggen buiten de geventileerde spouw en tellen dus niet mee; hier alleen voor wie ze anders gebruikt.
    leien: lambda(2.2, 'natuurleien; vezelcementleien ongeveer 0,5'),
    zink: lambda(110, 'metaal'),
  },
  overgang: {
    binnen: {
      wand: { waarde: 0.13, herkomst: richtwaarde(OVERGANG), uitleg: 'warmte stroomt horizontaal' },
      dak: { waarde: 0.1, herkomst: richtwaarde(OVERGANG), uitleg: 'warmte stroomt naar boven' },
      vloer: { waarde: 0.17, herkomst: richtwaarde(OVERGANG), uitleg: 'warmte stroomt naar beneden' },
    },
    buiten: { waarde: 0.04, herkomst: richtwaarde(OVERGANG) },
    // Tegen de grond is er geen lucht die langs het vlak strijkt. Hier 0: de grond wordt niet meegerekend, en zo blijft
    // de uitkomst voor een vloer op volle grond een veilige bovengrens. De echte regels rekenen de grond wel mee.
    grond: {
      waarde: 0,
      herkomst: richtwaarde('de rekenregels voor warmteverlies via de grond (NBN EN ISO 13370) en het transmissiedocument van de EPB-regels'),
      uitleg: 'eigen keuze aan de veilige kant: geen overgangsweerstand en geen grond meegerekend',
    },
  },
  // Stilstaande luchtlaag tussen gewone (niet-spiegelende) oppervlakken: dikte in mm → weerstand in m²K/W.
  luchtlaag: {
    wand: { punten: [[5, 0.11], [7, 0.13], [10, 0.15], [15, 0.17], [25, 0.18], [50, 0.18], [100, 0.18], [300, 0.18]], herkomst: richtwaarde(OVERGANG) },
    dak: { punten: [[5, 0.11], [7, 0.13], [10, 0.15], [15, 0.16], [25, 0.16], [50, 0.16], [100, 0.16], [300, 0.16]], herkomst: richtwaarde(OVERGANG) },
    vloer: { punten: [[5, 0.11], [7, 0.13], [10, 0.15], [15, 0.17], [25, 0.19], [50, 0.21], [100, 0.22], [300, 0.23]], herkomst: richtwaarde(OVERGANG) },
  },
  houtToeslag: {
    // Het raster van een houtskeletwand (38 mm om de 600 mm) is 6,3 % hout. Onder- en bovenregel, lateien, draagstijlen
    // en dubbele stijlen naast openingen komen erbij; met deze toeslag komt zo'n wand op ruim 14 %, in de buurt van de
    // 15 % die als vuistregel voor houtskeletwanden rondgaat. Voor dak en vloer staat er geen toeslag: alleen het raster.
    wand: {
      waarde: 0.08,
      herkomst: richtwaarde('het transmissiedocument van de EPB-regels (de houtfractie van een houtskeletwand), of het echte aandeel hout geteld in het bouwdeel'),
      uitleg: 'voor onder- en bovenregel, lateien en dubbele stijlen naast openingen',
    },
  },
  grootsteVerhouding: { waarde: 1.5, herkomst: richtwaarde(OVERGANG) },
  grootsteU: {
    wand: { waarde: 0.24, herkomst: richtwaarde(EISEN), uitleg: 'buitenmuur, nieuwbouw in Vlaanderen' },
    dak: { waarde: 0.24, herkomst: richtwaarde(EISEN), uitleg: 'dak of plafond tegen buiten, nieuwbouw in Vlaanderen' },
    vloer: { waarde: 0.24, herkomst: richtwaarde(EISEN), uitleg: 'vloer tegen buiten of op de grond, nieuwbouw in Vlaanderen; voor een vloer op de grond laten de regels mogelijk ook een toets op de weerstand van de vloer zelf toe' },
  },
};
