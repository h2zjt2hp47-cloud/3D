/**
 * Warmte: de U-waarde van een wand, dak of vloer, gerekend uit de lagen van haar opbouw (opbouw.ts).
 *
 * Dit is een **aanwijzing voor EPB, geen berekening waar iemand op mag bouwen**. Het is geen E-peil en geen S-peil van
 * een woning, en het zegt niets over ventilatie, luchtdichtheid of koudebruggen. Elke uitkomst draagt die zin
 * (`voorbehoud`), al haar aannames als tekst (`aannames`) en wat er ontbrak (`ontbreekt`). Ontbreekt er een waarde, dan
 * komt er geen U-waarde: er wordt nooit stil een getal gegokt.
 *
 * **In dit bestand staat geen enkel getal uit een norm of een fiche.** De warmtegeleiding per materiaal, de
 * overgangsweerstanden, de weerstand van een luchtlaag, de toeslag voor hout en de grootste toegelaten U-waarden komen
 * uit een tabel (`WarmteWaarden`; het voorbeeld staat in voorbeelden/warmtewaarden.ts), elk met zijn herkomst en de
 * vlag of iemand ze nagelezen heeft.
 *
 * Rekenwijze: de gewone rekenregels voor de warmteweerstand van een bouwdeel uit lagen (de methode van NBN EN ISO 6946;
 * die norm is hier niet geopend, de regels komen uit algemene kennis en moeten nagelezen worden).
 *   1. Een gewone laag: weerstand R = dikte / warmtegeleiding λ (m²K/W).
 *   2. Aan de binnenkant en aan de buitenkant komt er een overgangsweerstand bij; die van binnen hangt af van de
 *      richting van de warmte (wand: horizontaal, dak: naar boven, vloer: naar beneden).
 *   3. Een laag met hout en iets ertussen (skelet met isolatie, latten met lucht): het hout geleidt de warmte beter dan
 *      de isolatie, dus de laag is slechter dan de isolatie alleen. Gerekend met de **gecombineerde methode**: het
 *      gemiddelde van een bovengrens (de warmte gaat recht door het bouwdeel, ofwel overal door hout ofwel overal door
 *      isolatie, zonder zijwaarts te stromen) en een ondergrens (in elke laag verdeelt de warmte zich volmaakt over
 *      hout en isolatie). De echte weerstand ligt tussen die twee; voor hout en isolatie liggen ze dicht bij elkaar.
 *      Waarom deze en niet eenvoudig de isolatie alleen: dan zou elke houtskeletwand te goed lijken. Zitten er twee
 *      lagen met hout in (leidingspouw en skelet), dan zijn ze als kruisend gerekend: de aandelen vermenigvuldigen.
 *   4. Het aandeel hout van het skelet is het raster (breedte van het hout gedeeld door de hart-op-hartafstand) plus
 *      een toeslag uit de tabel voor wat het raster niet ziet (regels, lateien, dubbele stijlen). Het kan ook
 *      opgegeven worden (`aandeelHout`), bijvoorbeeld geteld uit een echt bouwdeel.
 *   5. Een stilstaande luchtlaag (een spouw, de lucht tussen latten of tussen balken zonder isolatie) heeft een vaste
 *      weerstand volgens haar dikte, uit de tabel.
 *   6. Een **geventileerde spouw** (de spouw achter een gevelbekleding of onder dakpannen): de lucht erin is buitenlucht.
 *      Die spouw en alles wat erbuiten ligt, houdt dus geen warmte tegen en telt niet mee. Aan die kant geldt dan de
 *      overgangsweerstand van stilstaande lucht (die van binnen) in plaats van die van buitenlucht. De opbouw zegt niet
 *      of een spouw geventileerd is; de regel is: de binnenste luchtlaag waar alleen nog bekleding buiten ligt (latten,
 *      spouw, plaat, folie, afwerking buiten). Dat is de veilige kant; met `buitenspouw: 'stilstaand'` rekent ze mee.
 *   7. Een folie of dampscherm is te dun om mee te tellen: weerstand 0.
 *   8. U = 1 / (som van alle weerstanden), afgerond op twee decimalen; op dat afgeronde getal gebeurt de toets.
 *
 * Weggelaten (en dat zegt de uitkomst zelf): toeslagen voor bevestigingen (spouwankers, schroeven), kieren in de
 * isolatie en vocht; de grond onder een vloer op volle grond (de uitkomst is daar een veilige bovengrens); een weinig
 * geventileerde spouw als tussenvorm; de helling van een dak.
 */
import { controleerOpbouw, type BouwMateriaal, type Laag, type LaagRol, type Opbouw, type OpbouwHerkomst, type OpbouwSoort } from './opbouw.js';
import type { Richtwaarde } from './richtwaarde.js';

/** Wat er aan de andere kant van het bouwdeel ligt. */
export type WarmteGrens = 'buitenlucht' | 'grond' | 'verwarmde ruimte';

/** De tabel met alle getallen voor de warmte. Elk getal heeft zijn herkomst en de vlag `nagelezen`. */
export interface WarmteWaarden {
  /** Warmtegeleiding λ per materiaalcode, in W/(m·K). Een waarde in de materialenlijst zelf (`warmtegeleiding`) gaat voor. */
  geleiding: Record<string, Richtwaarde>;
  /** Overgangsweerstanden in m²K/W. */
  overgang: {
    /** Aan de binnenkant, per soort (de richting van de warmte: wand horizontaal, dak naar boven, vloer naar beneden). */
    binnen: Record<OpbouwSoort, Richtwaarde>;
    /** Aan de kant van de buitenlucht. */
    buiten: Richtwaarde;
    /** Aan de kant van de grond. */
    grond: Richtwaarde;
  };
  /**
   * Stilstaande luchtlaag: de weerstand (m²K/W) bij een dikte (mm), per soort, oplopend in dikte. Tussen twee punten
   * wordt rechtlijnig tussengerekend; dunner dan het eerste punt evenredig naar nul, dikker dan het laatste punt blijft
   * de laatste waarde gelden.
   */
  luchtlaag: Record<OpbouwSoort, { punten: [dikte: number, weerstand: number][]; herkomst: OpbouwHerkomst }>;
  /** Toeslag op het aandeel hout van het skelet (bovenop breedte / hart-op-hart), per soort. Zonder waarde: geen toeslag. */
  houtToeslag: Partial<Record<OpbouwSoort, Richtwaarde>>;
  /** Gecombineerde methode: de grootste verhouding bovengrens / ondergrens waarbij ze nog betrouwbaar is. */
  grootsteVerhouding: Richtwaarde;
  /** Grootste toegelaten U-waarde in W/(m²K), per soort bouwdeel tegen buitenlucht of grond. Zonder waarde: geen toets. */
  grootsteU: Partial<Record<OpbouwSoort, Richtwaarde>>;
}

export interface WarmteOpties {
  /**
   * Wat er aan de andere kant ligt. Leeg = afgeleid uit de opbouw: een wand met een binnenafwerking als laatste laag
   * is een binnenwand; een vloer met een plafond (binnenafwerking) als onderste laag is een verdiepingsvloer, een
   * andere vloer ligt op de grond; een dak grenst aan de buitenlucht.
   */
  grenst?: WarmteGrens;
  /** Aandeel hout in het skelet, tussen 0 en 1 (bv. geteld uit een echt bouwdeel). Leeg = het raster plus de toeslag uit de tabel. */
  aandeelHout?: number;
  /** De spouw achter de buitenbekleding: `geventileerd` (standaard: zij en alles erbuiten telt niet mee) of `stilstaand`. */
  buitenspouw?: 'geventileerd' | 'stilstaand';
}

export type WarmteOordeel = 'voldoet' | 'voldoet niet' | 'niet te zeggen';
/** Hoe een laag meetelt in de berekening. */
export type WarmteWijze = 'gewone laag' | 'hout met vulling' | 'luchtlaag' | 'folie' | 'geventileerde spouw' | 'buiten de spouw' | 'ontbreekt';

/** Eén laag van de opbouw in de berekening. */
export interface WarmteLaag {
  /** Volgnummer in de opbouw (vanaf 0). */
  index: number;
  naam: string;
  rol: LaagRol;
  /** Dikte in mm. */
  dikte: number;
  wijze: WarmteWijze;
  /**
   * Warmteweerstand van de laag in m²K/W (drie decimalen). Bij hout met vulling: de laag als geheel, met hout en
   * vulling naast elkaar. 0 = de laag telt niet mee. `null` = er ontbreekt een waarde.
   */
  weerstand: number | null;
  /** Alleen bij hout met vulling: het aandeel hout (0 tot 1). */
  aandeelHout?: number;
  /** Hoe de weerstand gerekend is, in gewone taal. */
  uitleg: string;
}

export interface WarmteToets {
  oordeel: WarmteOordeel;
  /** De grootste toegelaten U-waarde waarmee vergeleken is, in W/(m²K). */
  grootsteU?: number;
  uitleg: string;
}

/** De uitkomst als gewone gegevens (gaat naar JSON en terug zonder verlies). */
export interface WarmteUitkomst {
  /** Naam van de opbouw. */
  opbouw: string;
  soort: OpbouwSoort | null;
  grenst: WarmteGrens | null;
  /** U-waarde in W/(m²K), twee decimalen. `null` = niet te rekenen (zie `ontbreekt`). */
  uWaarde: number | null;
  /** Totale warmteweerstand in m²K/W, met de overgangsweerstanden (drie decimalen). */
  weerstand: number | null;
  /** Alleen met hout tussen de isolatie: de twee grenzen waartussen de totale weerstand ligt. */
  grenzen?: { boven: number; onder: number };
  /** De gebruikte overgangsweerstanden in m²K/W. */
  overgang: { binnen: number; buiten: number } | null;
  lagen: WarmteLaag[];
  /** Alle aannames, in gewone taal. */
  aannames: string[];
  /** Wat er ontbrak, in gewone taal. Niet leeg = geen U-waarde. */
  ontbreekt: string[];
  toets: WarmteToets;
  /** Vaste zinnen die bij elke uitkomst horen. */
  voorbehoud: string[];
  /** Zijn alle gebruikte waarden nagelezen? Zolang dit niet zo is, zijn het richtwaarden. */
  nagelezen: boolean;
}

/** De vaste zin bij elke uitkomst. */
export const WARMTE_VOORBEHOUD = 'Aanwijzing voor EPB, geen berekening waar iemand op mag bouwen: dit is geen E-peil en geen S-peil van een woning en het zegt niets over ventilatie, luchtdichtheid of koudebruggen. Een EPB-verslaggever rekent na.';
/** De zin die erbij komt zolang niet elke gebruikte waarde nagelezen is. */
export const WARMTE_NIET_NAGELEZEN = 'De waarden in deze berekening zijn richtwaarden: niemand heeft ze nagelezen in de geldende regels of op de technische fiche van het product.';

const SOORT_NAAM: Record<OpbouwSoort, string> = { wand: 'een wand', dak: 'een dak', vloer: 'een vloer' };
const RICHTING: Record<OpbouwSoort, string> = { wand: 'de warmte stroomt horizontaal', dak: 'de warmte stroomt naar boven', vloer: 'de warmte stroomt naar beneden' };

const eindig = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const rond = (x: number, n: number) => Math.round(x * 10 ** n) / 10 ** n + 0;
/** Een getal met een vast aantal decimalen en een komma. */
const vast = (x: number, n = 2) => x.toFixed(n).replace('.', ',');
/** Een getal afgerond op hoogstens `n` decimalen, zonder nullen achteraan, met een komma. */
const kort = (x: number, n = 2) => String(rond(x, n)).replace('.', ',');
const procent = (aandeel: number) => `${kort(aandeel * 100, 1)} %`;
/** De rest tot 100 %, zo afgerond dat de twee samen 100 zijn. */
const restProcent = (aandeel: number) => `${kort(100 - rond(aandeel * 100, 1), 1)} %`;

/** Is dit een laag lucht: een lege spouw, of latten met niets ertussen? */
const isLucht = (l: Laag) => l.rol === 'spouw' || (l.rol === 'latten' && !l.hout?.vulling);

/**
 * Wat er aan de andere kant ligt, afgeleid uit de opbouw (zie `WarmteOpties.grenst`). Een opbouw zegt het niet zelf:
 * geef het mee als het anders is (bv. een vloer boven een kelder of boven buitenlucht).
 */
export function grensVan(o: Opbouw): WarmteGrens {
  const lagen = o.lagen ?? [];
  if (o.soort === 'wand') return lagen[lagen.length - 1]?.rol === 'afwerking_binnen' ? 'verwarmde ruimte' : 'buitenlucht';
  if (o.soort === 'vloer') return lagen[0]?.rol === 'afwerking_binnen' ? 'verwarmde ruimte' : 'grond';
  return 'buitenlucht';
}

/**
 * Het volgnummer van de geventileerde spouw: de binnenste luchtlaag waar alleen nog bekleding buiten ligt, met minstens
 * één afwerking buiten. -1 = er is er geen.
 */
function geventileerdeSpouw(lagen: Laag[]): number {
  let spouw = -1, bekleding = false;
  for (let i = lagen.length - 1; i >= 0; i--) {
    const l = lagen[i]!;
    if (isLucht(l)) {
      if (bekleding) spouw = i;
    } else if (l.rol === 'afwerking_buiten') bekleding = true;
    else if (l.rol !== 'plaat' && l.rol !== 'folie') break;
  }
  return spouw;
}

/** Een stuk van een laag: welk aandeel van het vlak het inneemt en zijn weerstand. Een gewone laag heeft één stuk. */
interface Deel { aandeel: number; weerstand: number }

/** De weerstand van een laag als geheel, met haar stukken naast elkaar. */
const laagWeerstand = (delen: Deel[]) => (delen.length === 1 ? delen[0]!.weerstand : 1 / delen.reduce((som, d) => som + d.aandeel / d.weerstand, 0));

/**
 * Boven- en ondergrens van de totale weerstand. `vast` = wat er in elke doorsnede bij komt (de overgangsweerstanden).
 * Bovengrens: elke combinatie van stukken is een eigen weg door het hele bouwdeel; die wegen staan naast elkaar.
 * Ondergrens: elke laag eerst als geheel, dan de lagen na elkaar.
 */
function grenzen(lagen: Deel[][], vastDeel: number): { boven: number; onder: number } {
  let wegen: Deel[] = [{ aandeel: 1, weerstand: vastDeel }];
  for (const delen of lagen) wegen = wegen.flatMap((w) => delen.map((d) => ({ aandeel: w.aandeel * d.aandeel, weerstand: w.weerstand + d.weerstand })));
  const boven = 1 / wegen.reduce((som, w) => som + (w.aandeel > 0 ? w.aandeel / w.weerstand : 0), 0);
  const onder = vastDeel + lagen.reduce((som, delen) => som + laagWeerstand(delen), 0);
  return { boven, onder };
}

/**
 * De U-waarde van een opbouw.
 *
 * @param opbouw      de lagen (wand: van binnen naar buiten; vloer en dak: van onder naar boven), diktes in mm
 * @param materialen  de materialenlijst van de opbouw (voor de namen, en voor een nagelezen `warmtegeleiding`)
 * @param waarden     de tabel met alle getallen (bv. `warmtewaarden` uit voorbeelden/warmtewaarden.ts)
 */
export function uWaarde(opbouw: Opbouw, materialen: Record<string, BouwMateriaal>, waarden: WarmteWaarden, opties: WarmteOpties = {}): WarmteUitkomst {
  const aannames: string[] = [], ontbreekt: string[] = [], lagen: WarmteLaag[] = [];
  let nagelezen = true;
  const soortGeldig = opbouw?.soort === 'wand' || opbouw?.soort === 'dak' || opbouw?.soort === 'vloer';
  const klaar = (rest: Partial<WarmteUitkomst>, toets: WarmteToets): WarmteUitkomst => ({
    opbouw: opbouw?.naam ?? '', soort: soortGeldig ? opbouw.soort : null, grenst: null, uWaarde: null, weerstand: null, overgang: null,
    lagen, aannames, ontbreekt, toets,
    voorbehoud: nagelezen ? [WARMTE_VOORBEHOUD] : [WARMTE_VOORBEHOUD, WARMTE_NIET_NAGELEZEN],
    ...rest,
    // Zonder U-waarde is er niets dat nagelezen kan zijn.
    nagelezen: nagelezen && eindig(rest.uWaarde),
  });
  const geenUWaarde = (rest: Partial<WarmteUitkomst> = {}) => klaar(rest, { oordeel: 'niet te zeggen', uitleg: 'Er is geen U-waarde, dus er valt niets te vergelijken.' });
  if (!waarden || typeof waarden !== 'object') {
    ontbreekt.push('De tabel met warmtewaarden ontbreekt: zonder die getallen is er geen U-waarde te rekenen.');
    return geenUWaarde();
  }

  // Een opbouw die niet klopt (geen dikte, onbekend materiaal, hout zonder maten …) wordt niet gerekend.
  const fouten = controleerOpbouw(opbouw, materialen).filter((p) => p.ernst === 'fout');
  if (fouten.length) {
    ontbreekt.push('De opbouw klopt niet, dus er is geen U-waarde te rekenen.', ...fouten.map((p) => p.tekst));
    return geenUWaarde();
  }
  const soort = opbouw.soort;

  /** Een getal uit de tabel; ontbreekt het of is het geen geldig getal, dan komt dat bij `ontbreekt`. */
  const uitTabel = (r: Richtwaarde | undefined, wat: string): number | null => {
    if (!r || !eindig(r.waarde) || r.waarde < 0) {
      ontbreekt.push(`In de tabel met warmtewaarden ontbreekt ${wat} (of het is geen geldig getal).`);
      return null;
    }
    if (r.herkomst?.nagelezen !== true) nagelezen = false;
    return r.waarde;
  };
  const status = (r: Richtwaarde) => `${r.herkomst?.nagelezen === true ? 'nagelezen' : 'richtwaarde, niet nagelezen'}${r.uitleg ? `; ${r.uitleg}` : ''}`;
  const label = (code: string) => materialen[code]?.label ?? code;

  /** De warmtegeleiding van een materiaal: uit de materialenlijst (nagelezen), anders uit de tabel. Elk materiaal één keer bij de aannames. */
  const gebruikt = new Map<string, number | null>();
  const materiaalRegels: string[] = [];
  const geleiding = (code: string, laagNaam: string): number | null => {
    if (gebruikt.has(code)) return gebruikt.get(code)!;
    const eigen = materialen[code]?.warmtegeleiding, tabel = waarden.geleiding?.[code];
    let waarde: number | null = null;
    if (eigen !== undefined) {
      // De materialenlijst gaat voor: volgens de afspraak in opbouw.ts staat daar alleen een nagelezen waarde.
      if (eindig(eigen) && eigen > 0) {
        waarde = eigen;
        materiaalRegels.push(`${label(code)}: warmtegeleiding ${kort(eigen, 3)} W/mK (uit de materialenlijst; volgens de afspraak staat daar alleen een nagelezen waarde).`);
      } else ontbreekt.push(`De warmtegeleiding van het materiaal «${label(code)}» in de materialenlijst is geen geldig getal (groter dan nul).`);
    } else if (tabel !== undefined) {
      if (eindig(tabel.waarde) && tabel.waarde > 0) {
        waarde = tabel.waarde;
        if (tabel.herkomst?.nagelezen !== true) nagelezen = false;
        materiaalRegels.push(`${label(code)}: warmtegeleiding ${kort(tabel.waarde, 3)} W/mK (${status(tabel)}).`);
      } else ontbreekt.push(`De warmtegeleiding van het materiaal «${label(code)}» in de tabel met warmtewaarden is geen geldig getal (groter dan nul).`);
    } else {
      ontbreekt.push(
        `Voor het materiaal «${label(code)}» (laag «${laagNaam}») is geen warmtegeleiding bekend. Zonder die waarde is er geen U-waarde: `
        + 'er wordt geen getal gegokt. Vul ze in de tabel met warmtewaarden in, uit de technische fiche van het product.',
      );
    }
    gebruikt.set(code, waarde);
    return waarde;
  };

  /** De weerstand van een stilstaande luchtlaag van deze dikte (mm). */
  let luchtGemeld = false;
  const lucht = (dikte: number): number | null => {
    const tabel = waarden.luchtlaag?.[soort];
    const punten = (tabel?.punten ?? []).filter((p) => eindig(p[0]) && eindig(p[1]) && p[0] > 0 && p[1] > 0).sort((a, b) => a[0] - b[0]);
    if (!tabel || !punten.length) {
      if (!luchtGemeld) ontbreekt.push(`In de tabel met warmtewaarden ontbreekt de weerstand van een stilstaande luchtlaag in ${SOORT_NAAM[soort]}.`);
      luchtGemeld = true;
      return null;
    }
    if (tabel.herkomst?.nagelezen !== true) nagelezen = false;
    const eerste = punten[0]!, laatste = punten[punten.length - 1]!;
    if (dikte <= eerste[0]) return (eerste[1] * dikte) / eerste[0];
    if (dikte >= laatste[0]) return laatste[1];
    const i = punten.findIndex((p) => p[0] >= dikte), a = punten[i - 1]!, b = punten[i]!;
    return a[1] + ((b[1] - a[1]) * (dikte - a[0])) / (b[0] - a[0]);
  };

  const grenst = opties.grenst ?? grensVan(opbouw);
  const binnen = uitTabel(waarden.overgang?.binnen?.[soort], `de overgangsweerstand aan de binnenkant van ${SOORT_NAAM[soort]}`);
  const spouw = grenst === 'buitenlucht' && soort !== 'vloer' && opties.buitenspouw !== 'stilstaand' ? geventileerdeSpouw(opbouw.lagen) : -1;
  // Achter een geventileerde spouw en tegen een verwarmde ruimte staat de lucht stil: de overgangsweerstand van binnen.
  const buiten = spouw >= 0 || grenst === 'verwarmde ruimte' ? binnen
    : grenst === 'grond' ? uitTabel(waarden.overgang?.grond, 'de overgangsweerstand aan de kant van de grond')
      : uitTabel(waarden.overgang?.buiten, 'de overgangsweerstand aan de buitenkant');

  if (opties.aandeelHout !== undefined && !(eindig(opties.aandeelHout) && opties.aandeelHout >= 0 && opties.aandeelHout <= 1)) {
    ontbreekt.push('Het opgegeven aandeel hout is geen getal tussen 0 en 1 (bv. 0,15 voor 15 %).');
  }

  // Elke laag: haar stukken voor de berekening, en een regel voor de uitkomst.
  const rekenLagen: Deel[][] = [];
  const laagRegels: string[] = [], folies: string[] = [];
  let gemengd = false;
  opbouw.lagen.forEach((l, index) => {
    const regel = (wijze: WarmteWijze, weerstand: number | null, uitleg: string, aandeelHout?: number) => {
      lagen.push({ index, naam: l.naam, rol: l.rol, dikte: l.dikte, wijze, weerstand: weerstand === null ? null : rond(weerstand, 3), ...(aandeelHout === undefined ? {} : { aandeelHout: rond(aandeelHout, 4) }), uitleg });
    };
    const d = l.dikte / 1000;
    if (spouw >= 0 && index >= spouw) {
      if (index === spouw) regel('geventileerde spouw', 0, 'Spouw met buitenlucht erin: telt niet mee.');
      else regel('buiten de spouw', 0, 'Ligt buiten de geventileerde spouw: telt niet mee.');
      return;
    }
    if (l.rol === 'folie') {
      folies.push(l.naam);
      regel('folie', 0, 'Te dun om mee te tellen.');
      return;
    }
    if (l.rol === 'spouw') {
      const r = lucht(l.dikte);
      if (r === null) return regel('ontbreekt', null, 'De weerstand van de luchtlaag ontbreekt.');
      rekenLagen.push([{ aandeel: 1, weerstand: r }]);
      laagRegels.push(`Laag «${l.naam}»: stilstaande lucht van ${kort(l.dikte)} mm, weerstand ${vast(r)} m²K/W.`);
      return regel('luchtlaag', r, `Stilstaande lucht van ${kort(l.dikte)} mm.`);
    }
    if ((l.rol === 'skelet' || l.rol === 'latten') && l.hout) {
      const h = l.hout, raster = h.breedte / h.hoh;
      const toeslag = l.rol === 'skelet' ? waarden.houtToeslag?.[soort] : undefined;
      let aandeel = raster, hoe = `het raster van ${kort(h.breedte)} mm hout om de ${kort(h.hoh)} mm`;
      if (l.rol === 'skelet' && opties.aandeelHout !== undefined) {
        aandeel = eindig(opties.aandeelHout) ? Math.min(1, Math.max(0, opties.aandeelHout)) : raster;
        hoe = `opgegeven; het raster alleen (${kort(h.breedte)} mm om de ${kort(h.hoh)} mm) is ${procent(raster)}`;
      } else if (toeslag) {
        const extra = uitTabel(toeslag, `de toeslag op het aandeel hout van ${SOORT_NAAM[soort]}`);
        if (extra !== null) {
          aandeel = Math.min(1, raster + extra);
          hoe = `het raster (${kort(h.breedte)} mm om de ${kort(h.hoh)} mm = ${procent(raster)}) plus ${procent(extra)} toeslag (${status(toeslag)})`;
        }
      } else if (l.rol === 'skelet') hoe += '; randbalken, klossen en ravelingen zijn niet meegeteld';
      const lambdaHout = geleiding(l.materiaal, l.naam);
      const rVulling = h.vulling ? ((k) => (k === null ? null : d / k))(geleiding(h.vulling, l.naam)) : lucht(l.dikte);
      if (lambdaHout === null || rVulling === null) return regel('ontbreekt', null, 'Er ontbreekt een waarde voor het hout of voor wat ertussen zit.');
      const rHout = d / lambdaHout, tussen = h.vulling ? label(h.vulling) : 'stilstaande lucht';
      const delen = [{ aandeel, weerstand: rHout }, { aandeel: 1 - aandeel, weerstand: rVulling }].filter((x) => x.aandeel > 0);
      rekenLagen.push(delen);
      gemengd = true;
      laagRegels.push(`Laag «${l.naam}»: ${procent(aandeel)} hout en ${restProcent(aandeel)} ${tussen.toLowerCase()}: ${hoe}.${h.vulling ? '' : ` De lucht van ${kort(l.dikte)} mm staat stil: weerstand ${vast(rVulling)} m²K/W.`}`);
      return regel('hout met vulling', laagWeerstand(delen), `${procent(aandeel)} hout (weerstand ${vast(rHout)}) naast ${restProcent(aandeel)} ${tussen.toLowerCase()} (weerstand ${vast(rVulling)}).`, aandeel);
    }
    const k = geleiding(l.materiaal, l.naam);
    if (k === null) return regel('ontbreekt', null, `De warmtegeleiding van «${label(l.materiaal)}» ontbreekt.`);
    rekenLagen.push([{ aandeel: 1, weerstand: d / k }]);
    regel('gewone laag', d / k, `${kort(l.dikte)} mm gedeeld door ${kort(k, 3)} W/mK.`);
  });

  // De aannames, in de volgorde waarin iemand ze naleest.
  aannames.push('Rekenwijze: de weerstand van elke laag is haar dikte gedeeld door de warmtegeleiding van het materiaal. Alle weerstanden worden opgeteld, met een overgangsweerstand aan elke kant. De U-waarde is 1 gedeeld door die som.');
  const afgeleid = opties.grenst === undefined ? 'Afgeleid uit de opbouw' : 'Opgegeven';
  if (grenst === 'verwarmde ruimte') aannames.push(`${afgeleid}: aan beide kanten ligt een verwarmde ruimte (${soort === 'vloer' ? 'een verdiepingsvloer met een plafond eronder' : 'een binnenwand'}). Aan elke kant geldt de overgangsweerstand van binnen.`);
  else if (grenst === 'grond') aannames.push(`${afgeleid}: het bouwdeel ligt tegen de grond. De grond zelf is niet meegerekend (dat hangt af van de vorm en de grootte van het gebouw): de echte U-waarde is daardoor lager (beter) dan dit getal.${opties.grenst === undefined ? ' Ligt de vloer boven een kelder, een kruipruimte of de buitenlucht, geef dat dan mee.' : ''}`);
  else aannames.push(`${afgeleid}: de andere kant grenst aan de buitenlucht.`);
  if (binnen !== null && buiten !== null) {
    const buitenTekst = spouw >= 0 ? `aan de kant van de geventileerde spouw ook ${vast(buiten)} m²K/W (de lucht staat er stil, zoals binnen)`
      : grenst === 'verwarmde ruimte' ? `aan de andere kant ook ${vast(buiten)} m²K/W`
        : grenst === 'grond' ? `aan de kant van de grond ${vast(buiten)} m²K/W` : `buiten ${vast(buiten)} m²K/W`;
    const bronnen = [waarden.overgang.binnen[soort], ...(spouw >= 0 || grenst === 'verwarmde ruimte' ? [] : [grenst === 'grond' ? waarden.overgang.grond : waarden.overgang.buiten])];
    aannames.push(`Overgangsweerstanden voor ${SOORT_NAAM[soort]} (${RICHTING[soort]}): binnen ${vast(binnen)} m²K/W en ${buitenTekst}. ${bronnen.every((r) => r.herkomst?.nagelezen === true) ? 'Nagelezen.' : 'Richtwaarden, niet nagelezen.'}`);
  }
  aannames.push(...materiaalRegels, ...laagRegels);
  if (spouw >= 0) {
    const erbuiten = opbouw.lagen.slice(spouw + 1).map((l) => l.naam);
    aannames.push(
      `De laag «${opbouw.lagen[spouw]!.naam}» is gerekend als een spouw die met buitenlucht geventileerd is: de lucht erin is even koud als buiten. `
      + `Die spouw${erbuiten.length ? ` en wat erbuiten ligt (${erbuiten.join(', ')})` : ''} houdt dus geen warmte tegen en telt niet mee. `
      + 'Dat is de veilige kant: is de spouw niet of weinig geventileerd, dan is de U-waarde iets lager (beter).',
    );
  } else if (opties.buitenspouw === 'stilstaand' && opbouw.lagen.some(isLucht)) aannames.push('Opgegeven: de spouw achter de buitenbekleding is niet geventileerd en telt mee als stilstaande lucht.');
  if (folies.length) aannames.push(`Folies en dampschermen (${folies.join(', ')}) zijn te dun om mee te tellen: weerstand 0.`);

  if (ontbreekt.length || binnen === null || buiten === null) return geenUWaarde({ grenst });

  const g = grenzen(rekenLagen, binnen + buiten);
  const totaal = (g.boven + g.onder) / 2, u = rond(1 / totaal, 2);
  if (gemengd) {
    aannames.push(
      'Hout tussen de isolatie: het hout geleidt de warmte beter dan wat ertussen zit. Gerekend met de gecombineerde methode: het gemiddelde van een bovengrens '
      + `(de warmte gaat recht door, zonder zijwaarts te stromen: ${vast(g.boven)} m²K/W) en een ondergrens (in elke laag verdeelt de warmte zich volmaakt: ${vast(g.onder)} m²K/W). `
      + 'De echte weerstand ligt tussen die twee. Lagen met hout zijn als kruisend gerekend.',
    );
    const grens = uitTabel(waarden.grootsteVerhouding, 'de grootste verhouding tussen bovengrens en ondergrens');
    if (grens !== null && g.boven / g.onder > grens) {
      aannames.push(`Let op: de bovengrens en de ondergrens liggen ver uit elkaar (verhouding ${vast(g.boven / g.onder)}, de methode geldt tot ${kort(grens)}). Deze U-waarde is een ruwe schatting.`);
    }
  }
  aannames.push('Niet meegerekend: toeslagen voor bevestigingen (spouwankers, schroeven), kieren in de isolatie en vocht. Daardoor is de echte U-waarde iets hoger (slechter).');

  // De toets, op het afgeronde getal (zo zegt het oordeel nooit iets anders dan het getal dat er staat).
  const grootste = waarden.grootsteU?.[soort];
  let toets: WarmteToets;
  if (grenst === 'verwarmde ruimte') {
    toets = { oordeel: 'niet te zeggen', uitleg: `Voor ${SOORT_NAAM[soort]} tussen twee verwarmde ruimtes staat er geen grootste toegelaten U-waarde in de tabel.` };
  } else if (!grootste || !eindig(grootste.waarde) || grootste.waarde <= 0) {
    toets = { oordeel: 'niet te zeggen', uitleg: `Voor ${SOORT_NAAM[soort]} staat er geen grootste toegelaten U-waarde in de tabel.` };
  } else {
    if (grootste.herkomst?.nagelezen !== true) nagelezen = false;
    const eis = `de grootste toegelaten waarde voor ${SOORT_NAAM[soort]}, ${vast(grootste.waarde)} W/m²K (${status(grootste)})`;
    if (u <= grootste.waarde) toets = { oordeel: 'voldoet', grootsteU: grootste.waarde, uitleg: `U ${vast(u)} W/m²K is niet hoger dan ${eis}.` };
    else if (grenst === 'grond') {
      toets = {
        oordeel: 'niet te zeggen', grootsteU: grootste.waarde,
        uitleg: `U ${vast(u)} W/m²K is hoger dan ${eis}, maar de grond is niet meegerekend: de echte U-waarde is lager. Of ze onder de grens blijft, is zo niet te zeggen.`,
      };
    } else toets = { oordeel: 'voldoet niet', grootsteU: grootste.waarde, uitleg: `U ${vast(u)} W/m²K is hoger dan ${eis}.` };
  }

  return klaar({
    grenst, uWaarde: u, weerstand: rond(totaal, 3), overgang: { binnen, buiten },
    ...(gemengd ? { grenzen: { boven: rond(g.boven, 3), onder: rond(g.onder, 3) } } : {}),
  }, toets);
}
