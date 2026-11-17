/**
 * De opbouw van een wand, vloer of dak als gewone gegevens: welke lagen erin zitten, hoe dik ze zijn en welk hout er
 * in het skelet zit. Uit die ene beschrijving volgen de afgewerkte weergave, de constructieweergave en de meetstaat
 * (bouwdelen.ts), en later een doorsnede, een aanwijzing voor EPB en een schatting van de stabiliteit.
 *
 * Een opbouw is gegevens, geen programma (zoals een gevelmateriaal): ze gaat naar JSON en terug zonder verlies, zodat
 * een aannemer later zijn eigen opbouwen kan beheren.
 *
 * Eenheid: **millimeter**, zoals een vakman het zegt ("38 × 140", "OSB 15", "om de 600"). De bouwdelen rekenen dit
 * zelf om naar de centimeters van de plattegrond en de 3D.
 *
 * Volgorde van de lagen: bij een wand **van binnen naar buiten**, bij een vloer en een dak **van onder naar boven**.
 */
import type { BlokSoort } from './ruimtelijk.js';

export type OpbouwSoort = 'wand' | 'vloer' | 'dak';

/**
 * Wat een laag doet. Daaruit volgt hoe ze getekend wordt en in welke groep van de meetstaat ze komt.
 *   afwerking_binnen  wat je binnen ziet: gipsplaat, pleister, plafond, vloerbekleding
 *   plaat             plaat op het skelet: OSB, houtvezelplaat, dakbeschot, vloerplaat
 *   folie             dampscherm, winddichte laag, onderdak, waterkering
 *   skelet            stijlen, balken of kepers, met wat ertussen zit (`hout`)
 *   isolatie          een doorlopende laag isolatie
 *   latten            latten met een luchtspouw ertussen (leidingspouw, tengellatten, panlatten) (`hout`)
 *   massief           een doorlopende dragende of zware laag: metselwerk, beton, dekvloer
 *   spouw             een lege luchtspouw (geen materiaal; ze telt alleen mee voor de dikte)
 *   afwerking_buiten  wat je buiten ziet: gevelbekleding, gevelsteen, dakbedekking
 */
export type LaagRol = 'afwerking_binnen' | 'plaat' | 'folie' | 'skelet' | 'isolatie' | 'latten' | 'massief' | 'spouw' | 'afwerking_buiten';

/** De rollen met hun naam in gewone taal (voor een keuzelijst of een melding). */
export const LAAG_ROLLEN: Record<LaagRol, string> = {
  afwerking_binnen: 'afwerking binnen',
  plaat: 'plaat',
  folie: 'folie of dampscherm',
  skelet: 'skelet met vulling',
  isolatie: 'isolatie',
  latten: 'latten met luchtspouw',
  massief: 'metselwerk of beton',
  spouw: 'luchtspouw',
  afwerking_buiten: 'afwerking buiten',
};

/** Een materiaal van een laag of van een stuk hout: hoe het heet en hoe de 3D het tekent. Zonder prijs. */
export interface BouwMateriaal {
  label: string;
  /** Hoe de 3D het tekent: een bestaande bloksoort (hout, planken, steen, pleister …) met een eigen kleur. */
  soort: BlokSoort;
  kleur: string;
  /** Voegkleur bij metselwerk (soort steen). */
  voeg?: string;
  /**
   * Warmtegeleiding λ in W/(m·K), voor de aanwijzing voor EPB (`uWaarde` in warmte.ts): een waarde hier gaat vóór de
   * tabel met richtwaarden. Vul ze alleen in met een waarde die iemand nagelezen heeft.
   */
  warmtegeleiding?: number;
}

/** Het hout van een skeletlaag (stijlen, balken, kepers) of van een laag latten. */
export interface LaagHout {
  /**
   * Breedte van één stuk in mm, gemeten in het vlak van het bouwdeel (de 38 van een stijl van 38 × 140). De andere
   * maat van de doorsnede is de dikte van de laag.
   */
  breedte: number;
  /** Hart-op-hartafstand in mm. */
  hoh: number;
  /** Wat er tussen het hout zit: de code van een materiaal (isolatie). Leeg = lucht. */
  vulling?: string;
  /**
   * Alleen voor latten: lopen ze mee met het skelet (`mee`: staand in een wand, langs de helling op een dak, zoals
   * tengellatten) of dwars erop (`dwars`, de standaard: liggend in een wand, zoals panlatten)?
   */
  richting?: 'mee' | 'dwars';
  /** Alleen voor het skelet van een wand: hoogte van de latei boven een opening, in mm. Leeg = de standaardwaarde. */
  latei?: number;
}

export interface Laag {
  naam: string;
  /** Code van het materiaal in de materialenlijst. Leeg bij een luchtspouw. */
  materiaal: string;
  /** Dikte in mm. */
  dikte: number;
  rol: LaagRol;
  /** Alleen bij een skelet of bij latten: het hout en wat ertussen zit. */
  hout?: LaagHout;
}

/** Waar een opbouw vandaan komt, en of een vakman ze nagelezen heeft. */
export interface OpbouwHerkomst {
  /**
   * `algemene kennis` = niet in een bron gelezen; `onderzoek` = uit een onderzoeksdocument in `docs/` (met de
   * verwijzing erbij); `vakman` = gegeven of bevestigd door een vakman.
   */
  bron: 'algemene kennis' | 'onderzoek' | 'vakman';
  /** Document, hoofdstuk en bronverwijzing, of wie de opbouw gaf. */
  verwijzing?: string;
  /** Heeft een vakman deze opbouw nagelezen? Zolang dit niet zo is, is ze een voorbeeld. */
  nagelezen: boolean;
}

export interface Opbouw {
  naam: string;
  soort: OpbouwSoort;
  /** Wand: van binnen naar buiten. Vloer en dak: van onder naar boven. */
  lagen: Laag[];
  /** Korte uitleg voor wie de opbouw kiest. */
  uitleg?: string;
  herkomst?: OpbouwHerkomst;
}

/** Wat er niet klopt aan een opbouw, in gewone taal. `laag` = het volgnummer van de laag (vanaf 0), als het over één laag gaat. */
export interface OpbouwProbleem {
  ernst: 'fout' | 'waarschuwing';
  tekst: string;
  laag?: number;
}

const getal = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const mm = (x: number) => `${String(Math.round(x * 100) / 100).replace('.', ',')} mm`;

/** Totale dikte van de opbouw in mm (lagen zonder geldige dikte tellen niet mee). */
export function totaleDikte(o: Opbouw): number {
  return (o.lagen ?? []).reduce((som, l) => som + (getal(l.dikte) && l.dikte > 0 ? l.dikte : 0), 0);
}

/** Een laag met haar plaats in de opbouw. */
export interface LaagPlaats {
  /** Volgnummer in de opbouw (vanaf 0). */
  index: number;
  laag: Laag;
  /** Begin en einde in mm, gemeten vanaf de eerste zijde (wand: de binnenkant; vloer en dak: de onderkant). */
  van: number;
  tot: number;
}

/** De plaats van elke laag: van waar tot waar ze loopt, gemeten vanaf de eerste zijde (binnen of onder), in mm. */
export function laagPlaatsen(o: Opbouw): LaagPlaats[] {
  let van = 0;
  return (o.lagen ?? []).map((laag, index) => {
    const dikte = getal(laag.dikte) && laag.dikte > 0 ? laag.dikte : 0;
    const plaats = { index, laag, van, tot: van + dikte };
    van += dikte;
    return plaats;
  });
}

/**
 * De dragende laag: het skelet, of zonder skelet de eerste massieve laag (bij een spouwmuur het binnenblad, bij een
 * vloer op volle grond de betonplaat), of anders de dikste laag. Geeft haar volgnummer, of -1 zonder lagen.
 * In de constructieweergave blijft deze laag helemaal zichtbaar; de andere lagen worden ernaast getoond.
 */
export function dragendeLaag(o: Opbouw): number {
  const lagen = o.lagen ?? [];
  const skelet = lagen.findIndex((l) => l.rol === 'skelet');
  if (skelet >= 0) return skelet;
  const massief = lagen.findIndex((l) => l.rol === 'massief');
  if (massief >= 0) return massief;
  let dikste = -1;
  lagen.forEach((l, i) => {
    if (l.rol !== 'spouw' && getal(l.dikte) && (dikste < 0 || l.dikte > lagen[dikste]!.dikte)) dikste = i;
  });
  return dikste;
}

/**
 * Kijkt een opbouw na en zegt in gewone taal wat er niet klopt. Met `materialen` erbij wordt ook nagekeken of elk
 * materiaal bestaat. Een `fout` maakt de opbouw onbruikbaar; een `waarschuwing` is iets om na te kijken.
 */
export function controleerOpbouw(o: Opbouw, materialen?: Record<string, BouwMateriaal>): OpbouwProbleem[] {
  const uit: OpbouwProbleem[] = [];
  const meld = (ernst: OpbouwProbleem['ernst'], tekst: string, laag?: number) => {
    uit.push(laag === undefined ? { ernst, tekst } : { ernst, tekst, laag });
  };
  const fout = (tekst: string, laag?: number) => meld('fout', tekst, laag);
  const letOp = (tekst: string, laag?: number) => meld('waarschuwing', tekst, laag);

  if (!o || typeof o !== 'object') return [{ ernst: 'fout', tekst: 'Dit is geen opbouw.' }];
  const naam = o.naam ? `«${o.naam}»` : 'zonder naam';
  if (!o.naam) fout('De opbouw heeft geen naam.');
  if (o.soort !== 'wand' && o.soort !== 'vloer' && o.soort !== 'dak') fout(`De opbouw ${naam} zegt niet of ze voor een wand, een vloer of een dak is.`);
  if (!Array.isArray(o.lagen) || !o.lagen.length) {
    fout(`De opbouw ${naam} heeft geen lagen.`);
    return uit;
  }

  const laatste = o.lagen.length - 1;
  o.lagen.forEach((l, i) => {
    const wie = `Laag ${i + 1}${l?.naam ? ` (${l.naam})` : ''}`;
    if (!l || typeof l !== 'object') {
      fout(`${wie} is leeg.`, i);
      return;
    }
    if (!l.naam) fout(`${wie} heeft geen naam.`, i);
    const rolBekend = typeof l.rol === 'string' && l.rol in LAAG_ROLLEN;
    if (!rolBekend) fout(`${wie} heeft geen geldige rol (bv. plaat, isolatie, skelet).`, i);
    if (!getal(l.dikte) || l.dikte <= 0) fout(`${wie} heeft geen dikte: vul een dikte in mm in, groter dan nul.`, i);
    else if (l.rol === 'folie' && l.dikte > 5) letOp(`${wie} is een folie van ${mm(l.dikte)}: staat de dikte wel in mm?`, i);

    if (l.rol === 'spouw') {
      if (l.materiaal) letOp(`${wie} is een luchtspouw en heeft toch een materiaal: het wordt niet getekend en niet geteld.`, i);
    } else if (!l.materiaal) fout(`${wie} heeft geen materiaal.`, i);
    else if (materialen && !materialen[l.materiaal]) fout(`${wie} gebruikt het materiaal «${l.materiaal}», dat niet in de materialenlijst staat.`, i);

    const metHout = l.rol === 'skelet' || l.rol === 'latten';
    if (metHout && !l.hout) fout(`${wie} is ${l.rol === 'skelet' ? 'een skelet' : 'een laag latten'}, maar de breedte en de hart-op-hartafstand van het hout ontbreken.`, i);
    if (!metHout && l.hout && rolBekend) letOp(`${wie} heeft hout (breedte en hart-op-hartafstand), maar haar rol is «${LAAG_ROLLEN[l.rol]}»: het hout wordt niet getekend en niet geteld.`, i);
    if (metHout && l.hout) {
      const h = l.hout;
      if (!getal(h.breedte) || h.breedte <= 0) fout(`${wie}: de breedte van het hout ontbreekt of is nul.`, i);
      if (!getal(h.hoh) || h.hoh <= 0) fout(`${wie}: de hart-op-hartafstand ontbreekt of is nul.`, i);
      else if (getal(h.breedte) && h.hoh <= h.breedte) fout(`${wie}: de hart-op-hartafstand (${mm(h.hoh)}) is niet groter dan de breedte van het hout (${mm(h.breedte)}): de stukken raken elkaar.`, i);
      if (h.vulling && materialen && !materialen[h.vulling]) fout(`${wie}: de vulling «${h.vulling}» staat niet in de materialenlijst.`, i);
      if (h.latei !== undefined && (!getal(h.latei) || h.latei <= 0)) fout(`${wie}: de hoogte van de latei is geen geldige maat.`, i);
    }

    // Een afwerking die niet aan de buitenkant van de opbouw ligt, is niet te zien.
    if (l.rol === 'afwerking_binnen' && i !== 0 && i !== laatste) letOp(`${wie} is een afwerking binnen, maar ligt midden in de opbouw: ze is niet te zien.`, i);
    if (l.rol === 'afwerking_buiten') {
      if (o.soort === 'vloer') letOp(`${wie} is een afwerking buiten, maar dit is een vloer: neem voor een vloerbekleding of een plafond «afwerking binnen».`, i);
      else if (i !== laatste) letOp(`${wie} is een afwerking buiten, maar ze is niet de laatste laag (${o.soort === 'wand' ? 'de buitenkant' : 'de bovenkant'}): ze is niet te zien.`, i);
    }
  });

  const skeletten = o.lagen.map((l, i) => (l?.rol === 'skelet' ? i + 1 : 0)).filter(Boolean);
  if (skeletten.length > 1) {
    fout(`De opbouw ${naam} heeft ${skeletten.length} skeletlagen (laag ${skeletten.join(' en laag ')}). Een bouwdeel heeft één dragend skelet: maak van de andere een laag latten (bv. een leidingspouw) of een laag isolatie.`);
  }

  const dikte = totaleDikte(o);
  if (dikte > 0 && (dikte < 20 || dikte > 1500)) letOp(`De opbouw ${naam} is in totaal ${mm(dikte)} dik: staan de diktes wel in mm?`);
  if (o.herkomst && o.herkomst.nagelezen === false) letOp(`De opbouw ${naam} is een voorbeeld: ze is niet nagelezen door een vakman.`);
  return uit;
}

// ---------- de opbouw van een woning (ronde 6) ----------

/**
 * Waar een opbouw in de woning komt: de buitenmuren, de binnenmuren, de vloer tussen twee verdiepingen, de vloer op de
 * grond, een plat dak en een hellend dak. Elke plaats heeft haar eigen keuzelijst (zie `WoningOpbouwCatalogus`).
 */
export type OpbouwPlaats = 'buitenwand' | 'binnenwand' | 'verdiepingsvloer' | 'grondvloer' | 'platDak' | 'hellendDak';

/** De plaatsen in de volgorde van een scherm of een lijst. */
export const OPBOUW_PLAATSEN: OpbouwPlaats[] = ['buitenwand', 'binnenwand', 'grondvloer', 'verdiepingsvloer', 'platDak', 'hellendDak'];

/**
 * De opbouw van een woning, als optioneel veld in het plan (`Plattegrond.opbouw`): per plaats de code van een opbouw
 * uit de catalogus (de standaard voor de hele woning) en, als dat nodig is, een afwijking per muurvlak of per ruimte.
 * Ontbreekt het veld (of een plaats), dan geldt de standaard van de catalogus: een oud project opent zoals vroeger en
 * de standaarden worden nooit in het plan geschreven.
 */
export interface WoningOpbouw {
  buitenwand?: string;
  binnenwand?: string;
  verdiepingsvloer?: string;
  grondvloer?: string;
  platDak?: string;
  hellendDak?: string;
  /** Afwijking per buitenmuurvlak: `vlakSleutel` (`<ruimte>:<kant>`, zoals bij de gevel) → code van een buitenwand. */
  vlakken?: Record<string, string>;
  /** Afwijking per ruimte: id van de ruimte → code van de opbouw van haar vloer (vloer op de grond of verdiepingsvloer). */
  vloeren?: Record<string, string>;
}

/** Een plaats in de catalogus: de naam in gewone taal, de opbouwen die er kunnen en de standaard. */
export interface OpbouwPlaatsKeuze {
  label: string;
  keuzes: string[];
  standaard: string;
}

/**
 * De opbouwen die een woning kan krijgen (zoals de gevelcatalogus): de opbouwen zelf, hun materialen en per plaats de
 * keuzes en de standaard. `volgensGevel`: zonder keuze voor de buitenwand volgt de opbouw de soort van het gevelmateriaal
 * van dat muurvlak (gevelsteen → steenstrips, hout → houten bekleding, pleister → sierpleister); anders de standaard.
 * `volgensDak` (16/11, doorloop B3): zonder keuze voor het hellende dak volgt de opbouw de gekozen dakbedekking (de code
 * in de dakcatalogus: pannen → panlatten en pannen, leien → leilatten en leien, zink → een dakbeschot en zink); anders
 * de standaard.
 */
export interface WoningOpbouwCatalogus {
  opbouwen: Record<string, Opbouw>;
  materialen: Record<string, BouwMateriaal>;
  plaatsen: Record<OpbouwPlaats, OpbouwPlaatsKeuze>;
  volgensGevel?: Partial<Record<BlokSoort, string>>;
  volgensDak?: Record<string, string>;
}
