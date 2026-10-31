/**
 * Datamodel van de configurator.
 *
 * Alle formules zijn gewone tekst zoals in Excel, bv. `breedte * hoogte / 1000000`
 * of `als(deurtype = "geen"; 0; 2)`. Ze worden intern omgezet naar JsonLogic,
 * zodat dezelfde regels in de browser en op de server draaien.
 */

/** Een formule als tekst (Excel-achtig) of een vaste waarde. */
export type Formule = string;

export type Waarde = number | string | boolean | null;

/** De ingevulde keuzes van een gebruiker, per kenmerkcode. */
export type Keuzes = Record<string, Waarde>;

export interface Stap {
  code: string;
  label: string;
}

interface KenmerkBasis {
  code: string;
  label: string;
  /** Code van de stap waarin dit kenmerk getoond wordt. */
  stap: string;
  helptekst?: string;
  /** Formule; als die onwaar is, wordt het kenmerk verborgen en telt de waarde niet mee. */
  zichtbaarAls?: Formule;
}

export interface GetalKenmerk extends KenmerkBasis {
  type: 'getal';
  eenheid?: string;
  /** Vast getal of formule, bv. `als(deurtype = "schuifdeuren"; 450; 250)`. */
  min?: number | Formule;
  max?: number | Formule;
  /** Toegelaten stapgrootte, bv. 1 (mm) of 10. */
  stapgrootte?: number;
  standaard: number;
}

export interface Keuzewaarde {
  code: string;
  label: string;
  /** Formule; als die onwaar is, is deze keuze niet beschikbaar (grijs). */
  beschikbaarAls?: Formule;
  /** Uitleg waarom de keuze niet beschikbaar is. */
  nietBeschikbaarReden?: string;
  /** Afbeelding of kleurstaal (URL). */
  beeld?: string;
  /**
   * Extra eigenschappen die in formules bruikbaar zijn als `<kenmerk>_<eigenschap>`.
   * Bv. kenmerk `materiaal`, eigenschap `dikte` → `materiaal_dikte`.
   */
  eigenschappen?: Record<string, number | string | boolean>;
}

export interface KeuzeKenmerk extends KenmerkBasis {
  type: 'keuze';
  keuzes: Keuzewaarde[];
  standaard: string;
}

export interface JaNeeKenmerk extends KenmerkBasis {
  type: 'janee';
  standaard: boolean;
}

export type Kenmerk = GetalKenmerk | KeuzeKenmerk | JaNeeKenmerk;

/** Een berekende waarde die in andere formules bruikbaar is (bv. `binnenbreedte`). */
export interface AfgeleideWaarde {
  code: string;
  label?: string;
  formule: Formule;
}

export interface Regel {
  code: string;
  /** `fout` blokkeert de configuratie, `waarschuwing` niet. */
  ernst: 'fout' | 'waarschuwing';
  /** Formule; als die waar is, verschijnt de melding. */
  als: Formule;
  melding: string;
}

export type Hoeveelheidseenheid = 'stuk' | 'm2' | 'lm' | 'uur';

/**
 * Een regel van de stuklijst. De hoeveelheid volgt uit de eenheid:
 * - stuk/uur: aantal
 * - m2: aantal × lengte × breedte (mm → m²)
 * - lm: aantal × lengte (mm → m)
 */
export interface StuklijstRegel {
  code: string;
  omschrijving: string;
  /**
   * Artikelcode als formule: een vaste code tussen aanhalingstekens (`"HDF-3"`)
   * of een verwijzing naar een eigenschap van een keuze (`materiaal_plaat`).
   */
  artikel: Formule;
  eenheid: Hoeveelheidseenheid;
  aantal: Formule;
  lengte?: Formule;
  breedte?: Formule;
  /** Alleen opnemen als deze formule waar is. */
  als?: Formule;
  /** Hoort deze regel op de zaaglijst (platen op maat)? */
  zaaglijst?: boolean;
}

/**
 * Prijstabel (matrix), bv. basisprijs per breedte × stofgroep.
 * Bruikbaar in formules als `tabel("code"; rij; kolom)`.
 * Getallen worden naar boven afgerond naar de volgende rij/kolom (maatklasse):
 * breedte 1750 in een tabel met rijen 1600, 1800, 2000 gebruikt de rij 1800.
 * Tekst moet exact overeenkomen.
 */
export interface Prijstabel {
  code: string;
  label?: string;
  rijen: (number | string)[];
  kolommen: (number | string)[];
  /** waarden[rij][kolom]; gebruik null voor een combinatie die niet bestaat. */
  waarden: (number | null)[][];
}

/**
 * Twee prijsmethodes:
 * - kost plus opslag: verkoopprijs = kostprijs van de stuklijst × (1 + opslag);
 * - lijstprijs: `verkoopprijs` is een formule (bv. uit een prijstabel). De stuklijst
 *   dient dan alleen voor productie en om de marge te tonen.
 */
export interface PrijsInstellingen {
  /** Opslag op de kostprijs in procent, bv. 35 → kost × 1,35. Gebruikt als er geen `verkoopprijs` is. */
  opslagProcent: number;
  /** Formule voor de bruto verkoopprijs excl. btw (lijstprijs-methode). */
  verkoopprijs?: Formule;
  /** Minimum verkoopprijs excl. btw. */
  minimumPrijs?: number;
  btwProcent: number;
}

export interface ProductModel {
  code: string;
  naam: string;
  /** Verhoog bij elke wijziging; een opgeslagen configuratie onthoudt de versie. */
  versie: number;
  /** Optioneel: id/nummer van het hoofdartikel in het ERP (bv. Missing Link). */
  erpArtikel?: string;
  stappen: Stap[];
  kenmerken: Kenmerk[];
  afgeleid: AfgeleideWaarde[];
  regels: Regel[];
  stuklijst: StuklijstRegel[];
  tabellen?: Prijstabel[];
  prijs: PrijsInstellingen;
}

/** Instellingen per berekening, bv. afhankelijk van de klant. */
export interface BerekenOpties {
  /** Korting in procent op de bruto verkoopprijs, bv. voor interieurinrichters of dealers. */
  kortingProcent?: number;
}

/** Een artikel in de prijslijst (komt standalone uit eigen beheer, of uit het ERP). */
export interface PrijslijstArtikel {
  code: string;
  omschrijving: string;
  eenheid: Hoeveelheidseenheid;
  kostprijs: number;
  /** Zaagverlies of afval in procent, bv. 15 voor platen. */
  verliesProcent?: number;
}

export type Prijslijst = Record<string, PrijslijstArtikel>;

// ---------- Resultaat ----------

export interface Melding {
  code: string;
  ernst: 'fout' | 'waarschuwing';
  melding: string;
  /** Kenmerk waarop de melding slaat, indien van toepassing. */
  kenmerk?: string;
}

export interface KeuzeStatus {
  code: string;
  label: string;
  beschikbaar: boolean;
  reden?: string;
}

export interface KenmerkStatus {
  code: string;
  label: string;
  stap: string;
  type: Kenmerk['type'];
  zichtbaar: boolean;
  waarde: Waarde;
  /** Leesbare waarde, bv. "Melamine wit" of "1200 mm". */
  weergave: string;
  min?: number;
  max?: number;
  keuzes?: KeuzeStatus[];
}

export interface StuklijstResultaat {
  code: string;
  omschrijving: string;
  artikel: string;
  eenheid: Hoeveelheidseenheid;
  aantal: number;
  lengte?: number;
  breedte?: number;
  /** Hoeveelheid in de eenheid (stuk, m², lm, uur), inclusief verlies. */
  hoeveelheid: number;
  kostprijsPerEenheid: number;
  kost: number;
  zaaglijst: boolean;
}

export interface ConfiguratieResultaat {
  product: string;
  versie: number;
  geldig: boolean;
  meldingen: Melding[];
  kenmerken: KenmerkStatus[];
  afgeleid: Record<string, Waarde>;
  stuklijst: StuklijstResultaat[];
  prijs: {
    methode: 'kostplus' | 'lijstprijs';
    kostprijs: number;
    /** Verkoopprijs vóór korting. */
    brutoprijsExcl: number;
    kortingProcent: number;
    /** Verkoopprijs na korting. */
    verkoopprijsExcl: number;
    /** Marge op de verkoopprijs in procent (alleen zinvol als de stuklijst volledig is). */
    margeProcent: number | null;
    btw: number;
    verkoopprijsIncl: number;
  };
  /** Korte omschrijving voor offerte of orderregel. */
  samenvatting: string[];
}
