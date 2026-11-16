/**
 * Stabiliteit: een **schatting** of een houten balk, keper of latei volstaat voor haar overspanning.
 *
 * Geen stabiliteitsstudie en geen berekening waar iemand op mag bouwen: elke uitkomst draagt de vaste zin
 * *"Schatting; een ingenieur rekent na."* (`voorbehoud`), wat er buiten valt (`buitenBereik`) en al haar aannames als
 * tekst (`aannames`). Kan er niets gezegd worden (een waarde ontbreekt, de invoer klopt niet), dan is het oordeel
 * "niet te zeggen" met de reden in gewone taal: er wordt nooit stil een getal gegokt.
 *
 * **In dit bestand staat geen enkel getal uit een norm.** De belastingen, de eigenschappen per houtklasse, de factoren,
 * de grens voor de doorbuiging en de lijst van gangbare doorsneden komen uit een tabel (`StabiliteitsWaarden`; het
 * voorbeeld staat in voorbeelden/stabiliteitswaarden.ts), elk met zijn herkomst en de vlag of iemand ze nagelezen heeft.
 * (Alleen de valversnelling, 9,81 m/s², staat hier: daarmee wordt het gewicht van een latei uit haar dichtheid gerekend.)
 *
 * Rekenwijze: een balk op twee steunpunten met een gelijkmatig verdeelde last, in de opzet van de Eurocode voor
 * houtconstructies (NBN EN 1995-1-1, met de lastfactoren van NBN EN 1990) maar sterk vereenvoudigd. Die normen zijn
 * hier niet geopend: de opzet komt uit algemene kennis en moet nagelezen worden.
 *   1. Last per meter balk = last per m² × de breedte die de balk draagt (balk of keper: de hart-op-hartafstand;
 *      latei: de breedte van de vloer of het dak die op de wand rust, plus het eigen gewicht van de latei).
 *      Keper op een helling α: de overspanning is langs de helling gemeten en alleen het deel van de last dwars op de
 *      keper buigt haar: de blijvende last (per m² dakvlak) × cos α, de veranderlijke (per m² horizontaal) × cos² α.
 *      Latei onder een hellend dak: de blijvende last van het dakvlak gedeeld door cos α (omgerekend naar horizontaal).
 *   2. Sterkte: grootste buigmoment M = q × L² / 8 met de rekenwaarde van de last (blijvend × factor + veranderlijk ×
 *      factor); buigspanning = M / W met W = b × h² / 6. Toegelaten = buigsterkte van de houtklasse × een factor voor
 *      de duur van de last, gedeeld door de materiaalfactor. Twee gevallen: alleen de blijvende last (met de factor
 *      voor een blijvende last) en blijvend plus veranderlijk (met de factor voor de duur van de veranderlijke last).
 *      De benutting is het grootste van de twee.
 *   3. Doorbuiging: w = 5 × q × L⁴ / (384 × E × I) met I = b × h³ / 12 en de lasten zonder factoren. Op lange termijn
 *      kruipt hout: w = w(blijvend) × (1 + kruipfactor) + w(veranderlijk) × (1 + langdurig deel × kruipfactor).
 *      Grens: overspanning gedeeld door een getal uit de tabel.
 *   4. "Volstaat" = beide benuttingen hoogstens 100 % (op het afgeronde procent, zodat het oordeel nooit iets anders
 *      zegt dan de getallen die er staan). Anders "te licht", met de kleinste doorsnede uit de lijst die wel volstaat.
 *
 * Weggelaten (en dat zegt de uitkomst zelf): dwarskracht, druk op de oplegging, zijdelings uitwijken (kip; de balk is
 * als zijdelings gesteund aangenomen), trillingen van een vloer, vervorming door afschuiving, wind, de normaalkracht in
 * een keper, het gewicht van de wand boven een latei, en de gunstige factoren voor lage doorsneden en voor balken die
 * samenwerken. Alleen gezaagd naaldhout: geen gelijmd hout, LVL of I-liggers. Eén soort last per balk (een latei die
 * een vloer én een dak draagt, valt erbuiten).
 * Buiten bereik: staal, funderingen, windverband, verbindingen, kolommen en stijlen op knik, puntlasten,
 * sneeuwophoping en opwaaien.
 *
 * Eenheden: overspanning en belaste breedte in **cm** (zoals de bouwdelen), doorsnede in **mm** (zoals het hout in een
 * opbouw), lasten in kN/m², sterkte en elasticiteit in N/mm².
 */
import type { Balkmaat, Bouwdeel, BouwdeelSoort } from './bouwdelen.js';
import type { OpbouwHerkomst } from './opbouw.js';
import type { Richtwaarde } from './richtwaarde.js';

export type BalkRol = 'vloerbalk' | 'dakbalk' | 'keper' | 'latei';
/** Wat een balk draagt: daaruit volgt de belasting per m². */
export type LastSoort = 'vloer_woning' | 'plat_dak' | 'hellend_dak';
/** Hoe lang een last aanwezig is: hout draagt een korte last beter dan een blijvende. */
export type LastDuur = 'blijvend' | 'middellang' | 'kort';
export type StabiliteitsOordeel = 'volstaat' | 'te licht' | 'niet te zeggen';

/** De eigenschappen van een houtklasse (sterkteklasse van gezaagd naaldhout). */
export interface Houtklasse {
  /** Karakteristieke buigsterkte in N/mm². */
  buigsterkte: number;
  /** Gemiddelde elasticiteitsmodulus langs de vezel in N/mm². */
  elasticiteit: number;
  /** Gemiddelde dichtheid in kg/m³ (voor het eigen gewicht van een latei). */
  dichtheid: number;
  herkomst: OpbouwHerkomst;
}

/** De belasting van één soort vloer of dak. */
export interface Belasting {
  naam: string;
  /**
   * Blijvende last in kN/m²: het eigen gewicht van de opbouw, met de balken of kepers erbij. Hellend dak: per m²
   * dakvlak (langs de helling gemeten).
   */
  blijvend: number;
  /** Veranderlijke last in kN/m² (mensen en meubels, sneeuw of onderhoud). Dak: per m² horizontaal gemeten. */
  veranderlijk: number;
  /** Hoe lang de veranderlijke last aanwezig is. */
  duur: Exclude<LastDuur, 'blijvend'>;
  /** Het deel van de veranderlijke last dat lang aanwezig blijft en dus meetelt voor de kruip (0 tot 1). */
  langdurigDeel: number;
  /** Klimaatklasse van het hout (1 = binnen en verwarmd, 2 = overdekt maar niet verwarmd): bepaalt de kruip. */
  klimaatklasse: 1 | 2;
  herkomst: OpbouwHerkomst;
  /** Wat er wel en niet in zit, voor bij de aannames. */
  uitleg?: string;
}

/** De tabel met alle getallen voor de schatting. Elk getal heeft zijn herkomst en de vlag `nagelezen`. */
export interface StabiliteitsWaarden {
  /** Eigenschappen per houtklasse (bv. C24). */
  houtklassen: Record<string, Houtklasse>;
  /** De houtklasse waarmee gerekend wordt als niemand er een opgeeft; dat staat dan bij de aannames. */
  standaardHoutklasse: string;
  lasten: Record<LastSoort, Belasting>;
  factoren: {
    /** Factor op de blijvende en op de veranderlijke last, voor de sterkte. */
    lastBlijvend: Richtwaarde;
    lastVeranderlijk: Richtwaarde;
    /** Materiaalfactor: de houtsterkte wordt erdoor gedeeld. */
    materiaal: Richtwaarde;
    /** Factor op de houtsterkte volgens de duur van de last. */
    duur: Record<LastDuur, Richtwaarde>;
    /** Kruipfactor per klimaatklasse. */
    kruip: Record<1 | 2, Richtwaarde>;
  };
  /** Grens voor de doorbuiging op lange termijn: de overspanning gedeeld door dit getal, per rol. */
  doorbuiging: Record<BalkRol, Richtwaarde>;
  /** Gangbare doorsneden van gezaagd hout in mm, voor een voorstel bij "te licht". */
  doorsneden: { lijst: Balkmaat[]; herkomst: OpbouwHerkomst };
}

export interface BalkInvoer {
  rol: BalkRol;
  /**
   * Wat de balk draagt. Leeg: een vloerbalk draagt de vloer van een woning, een dakbalk een plat dak, een keper een
   * hellend dak. Bij een latei verplicht: wat rust er op de wand boven de opening?
   */
  draagt?: LastSoort;
  /** Overspanning in cm, van hart tot hart van de steunpunten. Keper: langs de helling gemeten. */
  overspanning: number;
  /** Doorsnede in mm; de hoogte staat rechtop (in de richting van de last). */
  doorsnede: Balkmaat;
  /**
   * In cm. Balk of keper: de hart-op-hartafstand. Latei: de breedte van de vloer of het dak die op de wand rust,
   * horizontaal gemeten (meestal de helft van de overspanning van de balken die erop liggen).
   */
  belasteBreedte: number;
  /** Helling van het dak in graden. Nodig bij een hellend dak (keper, of latei eronder). */
  helling?: number;
  /** Code van de houtklasse in de tabel (bv. `C24`). Leeg = de standaardklasse van de tabel. */
  houtklasse?: string;
}

/** De getallen achter een schatting. */
export interface BalkGetallen {
  /** Last per meter balk in kN/m, zonder factoren: blijvend en veranderlijk. */
  blijvend: number;
  veranderlijk: number;
  /** Buigspanning en toegelaten buigspanning in N/mm², in het maatgevende geval. */
  spanning: number;
  toegelatenSpanning: number;
  /** Doorbuiging op lange termijn en de grens, in mm. */
  doorbuiging: number;
  toegelatenDoorbuiging: number;
}

export interface BalkVoorstel {
  /** De kleinste doorsnede uit de lijst die wel volstaat (mm). Leeg = geen enkele volstaat. */
  doorsnede?: Balkmaat;
  tekst: string;
}

/** De uitkomst als gewone gegevens (gaat naar JSON en terug zonder verlies). */
export interface BalkUitkomst {
  oordeel: StabiliteitsOordeel;
  /** Benutting in procent (100 = net op de grens). `null` bij "niet te zeggen". */
  benutting: { sterkte: number; doorbuiging: number } | null;
  getallen: BalkGetallen | null;
  /** Alle aannames, in gewone taal. */
  aannames: string[];
  /** Waarom er niets te zeggen is, in gewone taal. */
  ontbreekt: string[];
  /** Alleen bij "te licht". */
  voorstel?: BalkVoorstel;
  /** Vaste zinnen die bij elke uitkomst horen. */
  buitenBereik: string;
  voorbehoud: string;
  /** Zijn alle gebruikte waarden nagelezen? Zolang dit niet zo is, zijn het richtwaarden. */
  nagelezen: boolean;
}

/** De vaste zin bij elke uitkomst. */
export const STABILITEIT_VOORBEHOUD = 'Schatting; een ingenieur rekent na.';
/** Wat er buiten de schatting valt; staat ook bij elke uitkomst. */
export const STABILITEIT_BUITEN_BEREIK = 'Buiten deze schatting: staal, funderingen, windverband, verbindingen, kolommen en stijlen op knik, puntlasten, sneeuwophoping en opwaaien.';

/** Valversnelling in m/s²: van kg naar newton. */
const VALVERSNELLING = 9.81;
const ROL_NAAM: Record<BalkRol, string> = { vloerbalk: 'vloerbalk', dakbalk: 'dakbalk', keper: 'keper', latei: 'latei' };
const DUUR_NAAM: Record<LastDuur, string> = { blijvend: 'blijvende', middellang: 'middellange', kort: 'korte' };
const STANDAARD_LAST: Partial<Record<BalkRol, LastSoort>> = { vloerbalk: 'vloer_woning', dakbalk: 'plat_dak', keper: 'hellend_dak' };

const positief = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;
const nietNegatief = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const rond = (x: number, n: number) => Math.round(x * 10 ** n) / 10 ** n + 0;
const vast = (x: number, n = 2) => x.toFixed(n).replace('.', ',');
const kort = (x: number, n = 2) => String(rond(x, n)).replace('.', ',');
const maat = (d: Balkmaat) => `${kort(d.breedte)} × ${kort(d.hoogte)} mm`;
const status = (h: OpbouwHerkomst | undefined) => (h?.nagelezen === true ? 'nagelezen' : 'richtwaarden, niet nagelezen');

/** Alles wat de berekening van één balk oplevert, vóór het tekst wordt. */
interface Rekening {
  draagt: LastSoort;
  last: Belasting;
  klasseCode: string;
  klasseAangenomen: boolean;
  klasse: Houtklasse;
  /** Helling in graden (0 als ze niet meespeelt). */
  helling: number;
  /** Last per meter balk in kN/m (= N/mm): blijvend (met het eigen gewicht van een latei) en veranderlijk. */
  g: number;
  q: number;
  eigen: number;
  /** Factoren. */
  fG: number;
  fQ: number;
  fM: number;
  duurBlijvend: number;
  duurVeranderlijk: number;
  kruip: number;
  deler: number;
  /** Het maatgevende geval voor de sterkte. */
  maatgevend: 'blijvend' | 'samen';
  spanning: number;
  toegelatenSpanning: number;
  doorbuiging: number;
  toegelatenDoorbuiging: number;
  /** Benutting in afgeronde procenten. */
  sterkte: number;
  stijfheid: number;
  nagelezen: boolean;
}

/** Rekent één balk. Geeft de getallen, of de redenen waarom er niets te zeggen is. */
function reken(invoer: BalkInvoer, w: StabiliteitsWaarden): Rekening | { redenen: string[] } {
  const redenen: string[] = [];
  let nagelezen = true;
  const kijk = (h: OpbouwHerkomst | undefined) => { if (h?.nagelezen !== true) nagelezen = false; };
  /** Een getal uit de tabel; ontbreekt het of is het ongeldig, dan komt dat bij de redenen (en telt het hier als 1). */
  const uitTabel = (r: Richtwaarde | undefined, wat: string, magNul = false): number => {
    if (!r || !(magNul ? nietNegatief(r.waarde) : positief(r.waarde))) {
      redenen.push(`In de tabel met stabiliteitswaarden ontbreekt ${wat} (of het is geen geldig getal).`);
      return 1;
    }
    kijk(r.herkomst);
    return r.waarde;
  };

  if (!w || typeof w !== 'object') return { redenen: ['De tabel met stabiliteitswaarden ontbreekt: zonder die getallen is er niets te zeggen.'] };
  if (!invoer || !(invoer.rol in ROL_NAAM)) return { redenen: ['De invoer zegt niet wat voor balk dit is (vloerbalk, dakbalk, keper of latei).'] };
  const rol = invoer.rol;
  if (!positief(invoer.overspanning)) redenen.push('De overspanning ontbreekt of is niet groter dan nul.');
  if (!positief(invoer.doorsnede?.breedte) || !positief(invoer.doorsnede?.hoogte)) redenen.push('De doorsnede ontbreekt: geef de breedte en de hoogte van het hout in mm, groter dan nul.');
  if (!positief(invoer.belasteBreedte)) {
    redenen.push(rol === 'latei'
      ? 'De breedte van de vloer of het dak die op de latei rust, ontbreekt of is niet groter dan nul.'
      : 'De hart-op-hartafstand ontbreekt of is niet groter dan nul.');
  }

  const draagt = invoer.draagt ?? STANDAARD_LAST[rol];
  const last = draagt ? w.lasten?.[draagt] : undefined;
  if (!draagt) redenen.push('De schatting weet niet wat er op de latei rust (de vloer van een woning, een plat dak of een hellend dak): zonder die last is er niets te zeggen.');
  else if (!last) redenen.push(`In de tabel met stabiliteitswaarden staat geen belasting voor «${draagt}».`);
  else if (!nietNegatief(last.blijvend) || !nietNegatief(last.veranderlijk) || !nietNegatief(last.langdurigDeel) || last.langdurigDeel > 1) {
    redenen.push(`De belasting «${last.naam ?? draagt}» in de tabel met stabiliteitswaarden heeft geen geldige getallen.`);
  }

  // De helling speelt alleen mee onder een hellend dak.
  let helling = 0;
  if (draagt === 'hellend_dak') {
    if (positief(invoer.helling) && invoer.helling < 90) helling = invoer.helling;
    else redenen.push('De helling van het dak ontbreekt (in graden, tussen 0 en 90): onder een hellend dak hangt de last ervan af.');
  }

  const klasseCode = invoer.houtklasse ?? w.standaardHoutklasse;
  const klasse = klasseCode ? w.houtklassen?.[klasseCode] : undefined;
  if (!klasse) redenen.push(`De houtklasse «${klasseCode ?? ''}» staat niet in de tabel met stabiliteitswaarden: zonder haar sterkte en stijfheid is er niets te zeggen.`);
  else if (!positief(klasse.buigsterkte) || !positief(klasse.elasticiteit) || (rol === 'latei' && !positief(klasse.dichtheid))) {
    redenen.push(`De houtklasse «${klasseCode}» heeft in de tabel met stabiliteitswaarden geen geldige buigsterkte, elasticiteit of dichtheid.`);
  }

  const f = w.factoren;
  const fG = uitTabel(f?.lastBlijvend, 'de factor op de blijvende last');
  const fQ = uitTabel(f?.lastVeranderlijk, 'de factor op de veranderlijke last');
  const fM = uitTabel(f?.materiaal, 'de materiaalfactor voor hout');
  const duurBlijvend = uitTabel(f?.duur?.blijvend, 'de factor voor een blijvende last');
  const duurVeranderlijk = last ? uitTabel(f?.duur?.[last.duur], `de factor voor een last van ${DUUR_NAAM[last.duur] ?? last.duur} duur`) : 1;
  const kruip = last ? uitTabel(f?.kruip?.[last.klimaatklasse], `de kruipfactor voor klimaatklasse ${last.klimaatklasse}`, true) : 1;
  const deler = uitTabel(w.doorbuiging?.[rol], `de grens voor de doorbuiging van een ${ROL_NAAM[rol]}`);
  if (redenen.length || !draagt || !last || !klasse) return { redenen };
  kijk(last.herkomst);
  kijk(klasse.herkomst);

  // Alles in N en mm (kN/m = N/mm).
  const L = invoer.overspanning * 10, b = invoer.doorsnede.breedte, h = invoer.doorsnede.hoogte, breedte = invoer.belasteBreedte / 100;
  const cos = Math.cos((helling * Math.PI) / 180);
  const eigen = rol === 'latei' ? (klasse.dichtheid * b * h * 1e-6 * VALVERSNELLING) / 1000 : 0;
  // Keper: het deel van de last dwars op de keper. Latei: de last van het dakvlak omgerekend naar horizontaal.
  const g = rol === 'keper' ? last.blijvend * cos * breedte : (last.blijvend / (rol === 'latei' ? cos : 1)) * breedte + eigen;
  const q = rol === 'keper' ? last.veranderlijk * cos * cos * breedte : last.veranderlijk * breedte;

  const W = (b * h * h) / 6, I = (b * h * h * h) / 12;
  const spanning = (lijnlast: number) => (lijnlast * L * L) / 8 / W;
  const gevallen = [
    { naam: 'blijvend' as const, spanning: spanning(fG * g), toegelaten: (duurBlijvend * klasse.buigsterkte) / fM },
    { naam: 'samen' as const, spanning: spanning(fG * g + fQ * q), toegelaten: (duurVeranderlijk * klasse.buigsterkte) / fM },
  ];
  const zwaarst = gevallen[0]!.spanning / gevallen[0]!.toegelaten > gevallen[1]!.spanning / gevallen[1]!.toegelaten ? gevallen[0]! : gevallen[1]!;
  const perLast = (5 * L ** 4) / (384 * klasse.elasticiteit * I);
  const doorbuiging = g * perLast * (1 + kruip) + q * perLast * (1 + last.langdurigDeel * kruip);
  const toegelatenDoorbuiging = L / deler;
  return {
    draagt, last, klasseCode: klasseCode!, klasseAangenomen: invoer.houtklasse === undefined, klasse, helling,
    g, q, eigen, fG, fQ, fM, duurBlijvend, duurVeranderlijk, kruip, deler,
    maatgevend: zwaarst.naam, spanning: zwaarst.spanning, toegelatenSpanning: zwaarst.toegelaten,
    doorbuiging, toegelatenDoorbuiging,
    sterkte: Math.round((zwaarst.spanning / zwaarst.toegelaten) * 100), stijfheid: Math.round((doorbuiging / toegelatenDoorbuiging) * 100),
    nagelezen,
  };
}

/** Een uitkomst "niet te zeggen", met de redenen. Ook die draagt de vaste zinnen. */
function nietTeZeggen(redenen: string[]): BalkUitkomst {
  return { oordeel: 'niet te zeggen', benutting: null, getallen: null, aannames: [], ontbreekt: redenen, buitenBereik: STABILITEIT_BUITEN_BEREIK, voorbehoud: STABILITEIT_VOORBEHOUD, nagelezen: false };
}

/** Bij "te licht": de kleinste doorsnede uit de lijst (minste hout) die wel volstaat. Voor een latei: die in de wand past. */
function voorstelVoor(invoer: BalkInvoer, w: StabiliteitsWaarden): BalkVoorstel {
  const latei = invoer.rol === 'latei';
  const lijst = (w.doorsneden?.lijst ?? [])
    .filter((d) => positief(d?.breedte) && positief(d?.hoogte) && (!latei || d.breedte <= invoer.doorsnede.breedte))
    .sort((a, b) => a.breedte * a.hoogte - b.breedte * b.hoogte || a.hoogte - b.hoogte);
  for (const doorsnede of lijst) {
    const r = reken({ ...invoer, doorsnede }, w);
    if ('redenen' in r || r.sterkte > 100 || r.stijfheid > 100) continue;
    return {
      doorsnede: { breedte: doorsnede.breedte, hoogte: doorsnede.hoogte },
      tekst: `Neem minstens ${maat(doorsnede)}: de kleinste gangbare doorsnede uit de lijst${latei ? ' die in de wand past' : ''} die wel volstaat (sterkte ${r.sterkte} %, doorbuiging ${r.stijfheid} %). `
        + (latei ? 'Een kleinere opening of een steunpunt ertussen kan ook.' : `De ${invoer.rol === 'keper' ? 'kepers' : 'balken'} dichter bij elkaar leggen of de overspanning verkleinen kan ook.`),
    };
  }
  return {
    tekst: `Geen enkele gangbare doorsnede in gezaagd hout uit de lijst${latei ? ` die in de wand past (hoogstens ${kort(invoer.doorsnede.breedte)} mm breed)` : ''} volstaat: `
      + 'kleinere overspanning of een andere oplossing nodig (een steunpunt ertussen, gelijmd hout of staal; dat valt buiten deze schatting).',
  };
}

/**
 * Schat of één balk, keper of latei volstaat: een balk op twee steunpunten met een gelijkmatige last.
 *
 * @param waarden  de tabel met alle getallen (bv. `stabiliteitswaarden` uit voorbeelden/stabiliteitswaarden.ts)
 */
export function schatBalk(invoer: BalkInvoer, waarden: StabiliteitsWaarden): BalkUitkomst {
  const r = reken(invoer, waarden);
  if ('redenen' in r) return nietTeZeggen(r.redenen);
  const { last, klasse } = r, rol = invoer.rol, f = waarden.factoren;
  const factoren = [f.lastBlijvend, f.lastVeranderlijk, f.materiaal, f.duur.blijvend, f.duur[last.duur]];
  const factorStatus = factoren.every((x) => x.herkomst?.nagelezen === true) ? 'nagelezen' : 'richtwaarden, niet nagelezen';

  const aannames: string[] = [
    'Rekenwijze: een balk op twee steunpunten met een gelijkmatig verdeelde last over de hele lengte. Grootste buigmoment = last × overspanning² / 8; '
    + 'doorbuiging = 5 × last × overspanning⁴ / (384 × elasticiteit × traagheidsmoment). De opzet van de Eurocode voor houtconstructies, sterk vereenvoudigd.',
    `${ROL_NAAM[rol][0]!.toUpperCase()}${ROL_NAAM[rol].slice(1)} van ${maat(invoer.doorsnede)} (de hoogte staat rechtop), overspanning ${kort(invoer.overspanning)} cm${rol === 'keper' ? `, gemeten langs de helling van ${kort(r.helling, 1)}°` : ''}.`,
    `Belasting (${last.naam}): blijvend ${vast(last.blijvend)} kN/m² en veranderlijk ${vast(last.veranderlijk)} kN/m² (${status(last.herkomst)}${last.uitleg ? `; ${last.uitleg}` : ''}).`,
  ];
  if (rol === 'keper') {
    aannames.push(
      `De keper draagt een strook van ${kort(invoer.belasteBreedte)} cm (de hart-op-hartafstand). Op een helling buigt alleen het deel van de last dwars op de keper: `
      + `de blijvende last (per m² dakvlak) × cos ${kort(r.helling, 1)}°, de veranderlijke (per m² horizontaal) × cos² ${kort(r.helling, 1)}°. Dat geeft ${vast(r.g, 3)} en ${vast(r.q, 3)} kN per meter keper.`,
    );
  } else if (rol === 'latei') {
    aannames.push(
      `Op de latei rust een strook van ${kort(invoer.belasteBreedte)} cm breed (horizontaal gemeten)${r.helling ? `; de blijvende last van het dakvlak is omgerekend naar horizontaal (gedeeld door cos ${kort(r.helling, 1)}°)` : ''}. `
      + `Met het eigen gewicht van de latei (${vast(r.eigen, 3)} kN/m, uit een dichtheid van ${kort(klasse.dichtheid)} kg/m³) geeft dat blijvend ${vast(r.g, 3)} en veranderlijk ${vast(r.q, 3)} kN per meter latei. `
      + 'Het gewicht van de wand boven de latei is niet meegerekend.',
    );
  } else {
    aannames.push(`De balk draagt een strook van ${kort(invoer.belasteBreedte)} cm (de hart-op-hartafstand): blijvend ${vast(r.g, 3)} en veranderlijk ${vast(r.q, 3)} kN per meter balk.`);
  }
  aannames.push(
    `Hout ${r.klasseCode}${r.klasseAangenomen ? ' (aangenomen: er is geen houtklasse opgegeven)' : ''}: buigsterkte ${kort(klasse.buigsterkte)} N/mm², elasticiteit ${kort(klasse.elasticiteit)} N/mm² (${status(klasse.herkomst)}).`,
    `Sterkte: de blijvende last telt × ${kort(r.fG)}, de veranderlijke × ${kort(r.fQ)}. De houtsterkte telt × ${kort(r.duurVeranderlijk)} (de veranderlijke last is van ${DUUR_NAAM[last.duur]} duur) en wordt gedeeld door ${kort(r.fM)}; `
    + `ook nagekeken met alleen de blijvende last (houtsterkte × ${kort(r.duurBlijvend)}). Maatgevend: ${r.maatgevend === 'samen' ? 'blijvend en veranderlijk samen' : 'de blijvende last alleen'}, `
    + `buigspanning ${vast(r.spanning)} N/mm² tegenover toegelaten ${vast(r.toegelatenSpanning)} N/mm² (factoren: ${factorStatus}).`,
    `Doorbuiging op lange termijn: hout kruipt onder een last die blijft (factor ${kort(r.kruip)}, klimaatklasse ${last.klimaatklasse}); van de veranderlijke last blijft ${kort(last.langdurigDeel * 100)} % lang aanwezig. `
    + `Uitkomst ${vast(r.doorbuiging, 1)} mm tegenover de grens overspanning / ${kort(r.deler)} = ${vast(r.toegelatenDoorbuiging, 1)} mm (${status(waarden.doorbuiging[rol].herkomst)}).`,
    'Aangenomen: de balk kan niet zijdelings uitwijken (de vloerplaat, de latten of de wand houden hem vast) en de steunpunten kunnen de last dragen.',
    `Niet nagekeken: dwarskracht, druk op de oplegging, ${rol === 'vloerbalk' ? 'trillingen (een vloer die veert: bij een grote overspanning kan dat strenger zijn dan de doorbuiging), ' : ''}vervorming door afschuiving, wind${rol === 'keper' ? ', de normaalkracht in de keper' : ''}. `
    + 'De gunstige factoren voor lage doorsneden en voor balken die samenwerken zijn niet gebruikt.',
    'Alleen gezaagd naaldhout: gelijmd hout, LVL en I-liggers zitten niet in deze schatting.',
  );

  const volstaat = r.sterkte <= 100 && r.stijfheid <= 100;
  return {
    oordeel: volstaat ? 'volstaat' : 'te licht',
    benutting: { sterkte: r.sterkte, doorbuiging: r.stijfheid },
    getallen: {
      blijvend: rond(r.g, 3), veranderlijk: rond(r.q, 3),
      spanning: rond(r.spanning, 2), toegelatenSpanning: rond(r.toegelatenSpanning, 2),
      doorbuiging: rond(r.doorbuiging, 1), toegelatenDoorbuiging: rond(r.toegelatenDoorbuiging, 1),
    },
    aannames, ontbreekt: [],
    ...(volstaat ? {} : { voorstel: voorstelVoor(invoer, waarden) }),
    buitenBereik: STABILITEIT_BUITEN_BEREIK, voorbehoud: STABILITEIT_VOORBEHOUD,
    nagelezen: r.nagelezen,
  };
}

export interface BouwdeelSchattingOpties {
  /** Code van de houtklasse in de tabel. Leeg = de standaardklasse van de tabel (een opbouw zegt geen houtklasse). */
  houtklasse?: string;
  /** Hellend dak: het aantal steunpunten onder de kepers tussen dakvoet en nok (gordingen). Leeg = 0. */
  gordingen?: number;
  /**
   * Wand: wat er op de wand rust en over welke breedte (cm, horizontaal gemeten; meestal de helft van de overspanning
   * van de balken of kepers die erop liggen). Een wandvlak weet dat zelf niet: zonder dit is er over een latei niets
   * te zeggen.
   */
  opWand?: { draagt: LastSoort; belasteBreedte: number; helling?: number };
}

/** De schatting van één groep gelijke stukken van een bouwdeel (alle balken, alle kepers) of van één latei. */
export interface OnderdeelSchatting {
  /** Wat er nagekeken is, in gewone taal. */
  wat: string;
  rol: BalkRol;
  /** De codes van de stukken van het bouwdeel waarvoor deze schatting geldt (`skelet.balk.1` …). */
  stukken: string[];
  /** Waarmee gerekend is. */
  invoer: BalkInvoer;
  uitkomst: BalkUitkomst;
}

export interface BouwdeelSchatting {
  soort: BouwdeelSoort;
  /** Het slechtste van de onderdelen: "te licht" zodra er één te licht is; zonder onderdelen "niet te zeggen". */
  oordeel: StabiliteitsOordeel;
  onderdelen: OnderdeelSchatting[];
  /** Hoe de overspanning en de belaste breedte uit het bouwdeel gehaald zijn. */
  aannames: string[];
  /** Wat er in dit bouwdeel niet nagekeken is, in gewone taal. */
  nietNagekeken: string[];
  buitenBereik: string;
  voorbehoud: string;
}

/**
 * Loopt een heel bouwdeel na (bouwdelen.ts): de balken van een vloervlak of een plat dak over hun overspanning, de
 * kepers van een hellend dak, en elke latei van een wandvlak over haar opening.
 *
 * De overspanning komt uit het bouwdeel zelf en is dus een aanname: een vloervlak weet niet waar de muren eronder
 * staan (gerekend over de volle maat in de richting van de balken), een hellend dakvlak kent geen gordingen (geef
 * `gordingen` mee), en een wandvlak weet niet wat erop rust (geef `opWand` mee). Stijlen, regels en randbalken worden
 * niet nagekeken; een paal, een losse ligger en een spant ook niet (voor een ligger: `schatBalk` met eigen invoer).
 */
export function schatBouwdeel(deel: Bouwdeel, waarden: StabiliteitsWaarden, opties: BouwdeelSchattingOpties = {}): BouwdeelSchatting {
  const onderdelen: OnderdeelSchatting[] = [], aannames: string[] = [], nietNagekeken: string[] = [];
  const klaar = (): BouwdeelSchatting => ({
    soort: deel.soort,
    oordeel: onderdelen.some((o) => o.uitkomst.oordeel === 'te licht') ? 'te licht'
      : onderdelen.length && onderdelen.every((o) => o.uitkomst.oordeel === 'volstaat') ? 'volstaat' : 'niet te zeggen',
    onderdelen, aannames, nietNagekeken, buitenBereik: STABILITEIT_BUITEN_BEREIK, voorbehoud: STABILITEIT_VOORBEHOUD,
  });
  const klasse = opties.houtklasse === undefined ? {} : { houtklasse: opties.houtklasse };
  const voegToe = (wat: string, stukken: string[], invoer: BalkInvoer) => onderdelen.push({ wat, rol: invoer.rol, stukken, invoer, uitkomst: schatBalk(invoer, waarden) });
  /** Stukken met dezelfde doorsnede samen. */
  const perDoorsnede = (rol: string) => {
    const groepen = new Map<string, { doorsnede: Balkmaat; codes: string[]; lengte: number }>();
    for (const s of deel.stukken.filter((x) => x.rol === rol)) {
      const sleutel = `${s.doorsnede.breedte}x${s.doorsnede.hoogte}`;
      const g = groepen.get(sleutel) ?? { doorsnede: { breedte: s.doorsnede.breedte, hoogte: s.doorsnede.hoogte }, codes: [], lengte: 0 };
      g.codes.push(s.code);
      g.lengte = Math.max(g.lengte, s.lengte);
      groepen.set(sleutel, g);
    }
    return [...groepen.values()];
  };

  const v = deel.vlak, hout = deel.lagen[deel.dragend]?.hout;
  if (deel.soort === 'paal' || deel.soort === 'ligger' || deel.soort === 'spant' || !v) {
    nietNagekeken.push(
      deel.soort === 'paal' ? 'Een paal of kolom wordt niet nagekeken: knik valt buiten deze schatting.'
        : deel.soort === 'spant' ? 'Een spant wordt niet nagekeken: de krachten in de spantbenen en de trekbalk en hun verbindingen vallen buiten deze schatting.'
          : 'Een losse ligger wordt hier niet nagekeken: het bouwdeel weet niet wat erop rust. Geef de overspanning, de doorsnede en de belaste breedte zelf op.',
    );
    return klaar();
  }
  if (!deel.stukken.length || !hout) {
    nietNagekeken.push('Dit bouwdeel heeft geen houten skelet: metselwerk, beton en lateien in beton of staal vallen buiten deze schatting.');
    return klaar();
  }
  const hoh = hout.hoh / 10;

  if (deel.soort === 'wandvlak') {
    const lateien = deel.stukken.filter((s) => s.rol === 'latei');
    nietNagekeken.push('De stijlen, de draagstijlen naast een opening en de regels zijn niet nagekeken: knik en druk vallen buiten deze schatting.');
    if (!lateien.length) {
      nietNagekeken.push('Deze wand heeft geen openingen en dus geen lateien: er is niets na te kijken.');
      return klaar();
    }
    const op = opties.opWand;
    if (op) aannames.push(`Op de wand rust (opgegeven): ${waarden.lasten?.[op.draagt]?.naam ?? op.draagt}, over een breedte van ${kort(op.belasteBreedte)} cm.`);
    aannames.push('De overspanning van een latei is de breedte van de opening plus één stijlbreedte: van hart tot hart van de draagstijlen waar ze op ligt.');
    // Zonder te weten wat er op de wand rust, is er niets te zeggen: één duidelijke reden in plaats van een rij.
    const onbekend = 'De schatting weet niet wat er op deze wand rust (een vloer, een plat dak of een hellend dak, en over welke breedte): zonder die last is er over de latei niets te zeggen.';
    lateien.forEach((s, i) => {
      // De latei ligt aan elke kant één stijlbreedte op een draagstijl.
      const opening = s.lengte - (2 * hout.breedte) / 10, overspanning = rond(opening + hout.breedte / 10, 2);
      const invoer: BalkInvoer = {
        rol: 'latei', overspanning, doorsnede: { breedte: s.doorsnede.breedte, hoogte: s.doorsnede.hoogte },
        belasteBreedte: op?.belasteBreedte ?? 0, ...(op ? { draagt: op.draagt } : {}), ...(op?.helling === undefined ? {} : { helling: op.helling }), ...klasse,
      };
      onderdelen.push({
        wat: `Latei ${i + 1} van ${maat(s.doorsnede)} boven een opening van ${kort(opening, 1)} cm`,
        rol: 'latei', stukken: [s.code], invoer, uitkomst: op ? schatBalk(invoer, waarden) : nietTeZeggen([onbekend]),
      });
    });
    return klaar();
  }

  if (v.ligging === 'hellend') {
    const velden = Math.max(0, Math.floor(typeof opties.gordingen === 'number' && Number.isFinite(opties.gordingen) ? opties.gordingen : 0)) + 1;
    for (const g of perDoorsnede('keper')) {
      const overspanning = rond(g.lengte / velden, 2);
      voegToe(
        `${g.codes.length} kepers van ${maat(g.doorsnede)} om de ${kort(hoh, 1)} cm, over ${kort(overspanning, 1)} cm langs de helling (${kort(v.helling, 1)}°)`,
        g.codes, { rol: 'keper', overspanning, doorsnede: g.doorsnede, belasteBreedte: hoh, helling: v.helling, ...klasse },
      );
    }
    aannames.push(
      velden === 1
        ? 'De kepers zijn gerekend in één stuk van de dakvoet tot de nok, langs de helling gemeten, zonder gording ertussen. Ligt er een gording onder, geef dat dan mee: de overspanning wordt kleiner.'
        : `De kepers zijn gerekend in ${velden} gelijke velden tussen dakvoet, ${velden - 1 === 1 ? 'één gording' : `${velden - 1} gordingen`} en nok, elk veld als een balk op twee steunpunten.`,
      'De maat van het dakvlak is met de oversteek erbij: de echte overspanning tussen muurplaat en nok is iets korter (de veilige kant).',
      `Elke keper draagt een strook zo breed als de hart-op-hartafstand (${kort(hoh, 1)} cm).`,
    );
    nietNagekeken.push('Muurplaat, gordingen en nokbalk horen niet bij het dakvlak en zijn niet nagekeken; zij dragen de kepers. De spreiding van het dak op de muren ook niet.');
    return klaar();
  }

  // Vloervlak of plat dak: de balken over de volle maat van het vlak in hun richting.
  const dak = deel.soort === 'dakvlak', overspanning = v.richting === 'z' ? v.breedte : v.lengte;
  for (const g of perDoorsnede('balk')) {
    voegToe(
      `${g.codes.length} ${dak ? 'dakbalken' : 'vloerbalken'} van ${maat(g.doorsnede)} om de ${kort(hoh, 1)} cm, over ${kort(overspanning, 1)} cm`,
      g.codes, { rol: dak ? 'dakbalk' : 'vloerbalk', overspanning, doorsnede: g.doorsnede, belasteBreedte: hoh, ...klasse },
    );
  }
  aannames.push(
    `De balken zijn gerekend over de volle maat van het vlak in hun richting (${kort(overspanning, 1)} cm), zonder steunpunt ertussen. Liggen ze op een binnenmuur of een ligger, dan is de echte overspanning kleiner.`,
    `Elke balk draagt een strook zo breed als de hart-op-hartafstand (${kort(hoh, 1)} cm).`,
    dak ? 'Het vlak is gerekend als een plat dak zonder grind, tegels, groendak of terras.' : 'Het vlak is gerekend als de vloer van een woning.',
  );
  nietNagekeken.push('De randbalken (ze liggen op de muur), klossen en ravelingen rond een trapgat of een koepel zijn niet nagekeken.');
  return klaar();
}
