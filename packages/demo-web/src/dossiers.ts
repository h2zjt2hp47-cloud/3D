/**
 * Bewaarde ontwerpen ("Mijn ontwerpen") en de gegevens van de offerte (klant, referentie, geldigheid, levertermijn).
 *
 * Alles staat in deze browser (localStorage), zoals de stoffen en de catalogus. Een ontwerp kan ook als bestand
 * (.zetel.json) bewaard en op een ander toestel geopend worden. In productie komt dit op de server en krijgt de offerte
 * haar nummer van het ERP (Missing Link); de referentie hier is alleen een eigen kenmerk.
 */
import type { Materiaal, Ontwerp, OntwerpCatalogus } from '../../core/src/index.js';
import { bewaar, laad } from './staat.js';

export interface Klant { naam: string; adres: string; postcode: string; gemeente: string; email: string; telefoon: string }
export interface OfferteGegevens {
  /** Eigen kenmerk van de offerte (geen ERP-nummer). */
  referentie: string;
  klant: Klant;
  /** Hoeveel dagen de offerte geldig blijft. */
  geldigDagen: number;
  levertermijn: string;
  opmerking: string;
}
export interface Dossier {
  id: string;
  naam: string;
  /** Tijdstip van de laatste keer bewaren (ISO). */
  bewaard: string;
  ontwerp: Ontwerp;
  offerte: OfferteGegevens;
}

const SLEUTEL = 'configurator-demo.ontwerpen.v1';
const SLEUTEL_TELLER = 'configurator-demo.referentie.v1';
/** Hoogstens zoveel bewaarde ontwerpen (de opslag van een browser is beperkt). */
export const MAX_DOSSIERS = 60;

export const legeKlant = (): Klant => ({ naam: '', adres: '', postcode: '', gemeente: '', email: '', telefoon: '' });
export const legeOfferte = (): OfferteGegevens => ({ referentie: '', klant: legeKlant(), geldigDagen: 30, levertermijn: '', opmerking: '' });

const tekst = (x: unknown, max = 200) => (typeof x === 'string' ? x.slice(0, max) : '');

/** Offertegegevens uit onbekende invoer (bestand, oude opslag): ontbrekende velden worden leeg, geen fout. */
export function leesOfferte(x: unknown): OfferteGegevens {
  const o = (x && typeof x === 'object' ? x : {}) as Partial<OfferteGegevens>;
  const k = (o.klant && typeof o.klant === 'object' ? o.klant : {}) as Partial<Klant>;
  const dagen = Number(o.geldigDagen);
  return {
    referentie: tekst(o.referentie, 40),
    klant: { naam: tekst(k.naam), adres: tekst(k.adres), postcode: tekst(k.postcode, 12), gemeente: tekst(k.gemeente), email: tekst(k.email), telefoon: tekst(k.telefoon, 40) },
    geldigDagen: Number.isFinite(dagen) && dagen >= 1 && dagen <= 365 ? Math.round(dagen) : 30,
    levertermijn: tekst(o.levertermijn),
    opmerking: tekst(o.opmerking, 2000),
  };
}

/**
 * Een ontwerp uit onbekende invoer nakijken tegen de catalogus en de stoffen van dit toestel.
 * Geeft het ontwerp (met een onbekende stof vervangen door de eerste stof) en wat aangepast is, of een fout.
 */
export function leesOntwerp(x: unknown, catalogus: OntwerpCatalogus, materialen: Materiaal[]): { ontwerp: Ontwerp; opmerkingen: string[] } | { fout: string } {
  const o = x as Partial<Ontwerp> | null;
  if (!o || typeof o !== 'object' || !Array.isArray(o.elementen) || typeof o.hoofdmateriaal !== 'string') return { fout: 'Dit is geen zetelontwerp.' };
  const typen = new Set(catalogus.typen.map((t) => t.code));
  const stoffen = new Set(materialen.map((m) => m.code));
  const opmerkingen: string[] = [];
  const ontwerp = structuredClone(o) as Ontwerp;
  for (const e of ontwerp.elementen) {
    if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !typen.has(e.type)) return { fout: `Het ontwerp gebruikt een element dat niet in de catalogus van dit toestel staat (${String((e as { type?: unknown })?.type ?? 'onbekend')}).` };
    if (![e.x, e.y, e.breedte, e.diepte].every((n) => typeof n === 'number' && Number.isFinite(n))) return { fout: 'Het ontwerp bevat een element zonder geldige maten.' };
    if (e.materiaal && !stoffen.has(e.materiaal)) { delete e.materiaal; opmerkingen.push('Een stof per element bestond hier niet: dat element volgt nu de hoofdstof.'); }
  }
  if (!stoffen.has(ontwerp.hoofdmateriaal) && materialen[0]) {
    opmerkingen.push(`De hoofdstof (${ontwerp.hoofdmateriaal}) bestaat hier niet: vervangen door ${materialen[0].naam}.`);
    ontwerp.hoofdmateriaal = materialen[0].code;
  }
  return { ontwerp, opmerkingen: [...new Set(opmerkingen)] };
}

export function getDossiers(): Dossier[] {
  try {
    const lijst = JSON.parse(laad(SLEUTEL) ?? '[]') as Dossier[];
    if (!Array.isArray(lijst)) return [];
    return lijst
      .filter((d) => d && typeof d.id === 'string' && typeof d.naam === 'string' && d.ontwerp && Array.isArray(d.ontwerp.elementen))
      .map((d) => ({ ...d, offerte: leesOfferte(d.offerte) }));
  } catch {
    return [];
  }
}

const luisteraars = new Set<() => void>();
/** Verwittig wie de lijst toont (modellenscherm, teller in de ontwerper). */
export const opDossiers = (f: () => void) => { luisteraars.add(f); };

function schrijf(lijst: Dossier[]): boolean {
  const waarde = JSON.stringify(lijst);
  bewaar(SLEUTEL, waarde);
  // `bewaar` slikt een volle opslag in: nakijken of het er echt staat.
  const gelukt = laad(SLEUTEL) === waarde;
  luisteraars.forEach((f) => f());
  return gelukt;
}

/**
 * Bewaar een ontwerp: met `id` het bestaande overschrijven, anders een nieuw (bovenaan de lijst).
 * Geeft het dossier terug, of een fout als de opslag vol is of niet werkt.
 */
export function bewaarDossier(d: { id?: string; naam: string; ontwerp: Ontwerp; offerte: OfferteGegevens }): Dossier | { fout: string } {
  const lijst = getDossiers();
  const dossier: Dossier = {
    id: d.id && lijst.some((x) => x.id === d.id) ? d.id : `d${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
    naam: d.naam.trim().slice(0, 80) || 'Ontwerp zonder naam',
    bewaard: new Date().toISOString(),
    ontwerp: structuredClone(d.ontwerp),
    offerte: leesOfferte(d.offerte),
  };
  const rest = lijst.filter((x) => x.id !== dossier.id);
  if (rest.length >= MAX_DOSSIERS) return { fout: `Er staan al ${MAX_DOSSIERS} ontwerpen. Verwijder er eerst een, of bewaar dit als bestand.` };
  if (!schrijf([dossier, ...rest])) return { fout: 'Bewaren lukt niet in deze browser (opslag vol of uitgeschakeld). Bewaar het ontwerp als bestand.' };
  return dossier;
}

export function verwijderDossier(id: string) {
  schrijf(getDossiers().filter((d) => d.id !== id));
}

/** Volgende eigen referentie, bv. Z-261110-02 (datum en volgnummer van die dag op dit toestel). */
export function nieuweReferentie(nu = new Date()): string {
  const dag = `${String(nu.getFullYear()).slice(2)}${String(nu.getMonth() + 1).padStart(2, '0')}${String(nu.getDate()).padStart(2, '0')}`;
  let teller = 1;
  try {
    const vorig = JSON.parse(laad(SLEUTEL_TELLER) ?? 'null') as { dag?: string; teller?: number } | null;
    if (vorig?.dag === dag && typeof vorig.teller === 'number') teller = vorig.teller + 1;
  } catch { /* opnieuw vanaf 1 */ }
  bewaar(SLEUTEL_TELLER, JSON.stringify({ dag, teller }));
  return `Z-${dag}-${String(teller).padStart(2, '0')}`;
}

// ---------- als bestand ----------
const SOORT = 'zetelontwerp';

export function dossierAlsBestand(d: { naam: string; ontwerp: Ontwerp; offerte: OfferteGegevens }): { bestandsnaam: string; inhoud: string } {
  const veilig = d.naam.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '-').slice(0, 50) || 'ontwerp';
  return {
    bestandsnaam: `${veilig}.zetel.json`,
    inhoud: JSON.stringify({ soort: SOORT, versie: 1, naam: d.naam, bewaard: new Date().toISOString(), ontwerp: d.ontwerp, offerte: d.offerte }, null, 2),
  };
}

/** Leest een .zetel.json (of een kaal ontwerp) en kijkt het na tegen de catalogus en stoffen van dit toestel. */
export function dossierUitBestand(inhoud: string, catalogus: OntwerpCatalogus, materialen: Materiaal[]): { naam: string; ontwerp: Ontwerp; offerte: OfferteGegevens; opmerkingen: string[] } | { fout: string } {
  let ruw: unknown;
  try {
    ruw = JSON.parse(inhoud);
  } catch {
    return { fout: 'Het bestand is geen geldig ontwerpbestand (geen JSON).' };
  }
  const b = ruw as { soort?: unknown; naam?: unknown; ontwerp?: unknown; offerte?: unknown } | null;
  if (b && typeof b === 'object' && 'soort' in b && b.soort !== SOORT) return { fout: 'Dit bestand is geen zetelontwerp.' };
  const gelezen = leesOntwerp(b && typeof b === 'object' && b.ontwerp ? b.ontwerp : ruw, catalogus, materialen);
  if ('fout' in gelezen) return gelezen;
  return { naam: tekst(b?.naam, 80) || 'Geopend ontwerp', ontwerp: gelezen.ontwerp, offerte: leesOfferte(b?.offerte), opmerkingen: gelezen.opmerkingen };
}

/** Datum tot wanneer de offerte geldt, in gewone taal. */
export function geldigTot(o: OfferteGegevens, vanaf = new Date()): string {
  const d = new Date(vanaf.getFullYear(), vanaf.getMonth(), vanaf.getDate() + o.geldigDagen);
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}
