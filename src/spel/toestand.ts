// De toestand van een spel: alles wat bewaard wordt. Enkel gewone gegevens, zodat opslaan eenvoudig is.
import type { Belasting, Gebouw } from './economie';

export interface Factie {
  id: string;
  naam: string;
  kleur: string;
  /** hoe goed de troepen vechten (1 = gewoon) */
  kwaliteit: number;
  soort: 'rijk' | 'stam';
  heerser: string;
  beschrijving: string;
  hoofdstad: number | null;
  /** mannen die nog opgeroepen kunnen worden */
  mankracht: number;
  /** onderworpen aan deze factie, of null als vrij */
  heer: string | null;
  bestaat: boolean;
  /** aantal vakken bij de start */
  vakkenBijStart: number;
  /** zilver in de schatkist */
  schat: number;
  belasting: Belasting;
  /** netto inkomen van de vorige maand */
  inkomenVorigeMaand: number;
}

export interface VakToestand {
  eigenaar: string;
  /** het volk dat er bij de start woonde */
  oorsprong: string;
  bevolking: number;
  /** grootste bezetting van de versterking; 0 = geen versterking */
  fort: number;
  fortNaam: string | null;
  garnizoen: number;
  /** voortgang van een bezetting, 0 tot 1 */
  bezetting: number;
  bezetter: string | null;
  /** 0 tot 100; laag = kans op opstand */
  tevredenheid: number;
  /** dag waarop de huidige eigenaar het vak kreeg */
  sindsVerovering: number;
  landbouw: number;
  markt: number;
  weg: number;
  /** wat er gebouwd wordt en wanneer het klaar is */
  bouw: { wat: Gebouw; klaar: number } | null;
}

export interface Leger {
  id: number;
  naam: string;
  factie: string;
  vak: number;
  sterkte: number;
  /** 0 tot 1; onder 0,3 trekt een leger zich terug */
  moraal: number;
  /** de vakken die nog moeten, zonder het huidige */
  pad: number[];
  /** hoe ver op weg naar pad[0], 0 tot 1 */
  voortgang: number;
  /** dagen dat het leger nog last heeft van een rivierovergang */
  overgestoken: number;
  /** vecht vandaag */
  inStrijd: boolean;
}

export interface Bericht {
  dag: number;
  tekst: string;
  soort: 'slag' | 'verovering' | 'gebeurtenis' | 'info';
  vak?: number;
}

export interface Keuze {
  id: string;
  titel: string;
  tekst: string;
  opties: { tekst: string; gevolg: string }[];
}

export interface Toestand {
  versie: 2;
  dag: number;
  zaad: number;
  speler: string;
  facties: Record<string, Factie>;
  vakken: VakToestand[];
  legers: Leger[];
  volgendLeger: number;
  /** paren "a|b" (alfabetisch) die in oorlog zijn */
  oorlog: string[];
  /** paren "a|b" die bondgenoten zijn */
  bond: string[];
  berichten: Bericht[];
  gedaan: string[];
  /** een keuze die op de speler wacht; de klok staat dan stil */
  wachtend: Keuze[];
  /** dag waarop de speler opnieuw gevraagd mag worden om zich te onderwerpen */
  onderwerpVraagNa: number;
}

export const paar = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** hoofd van een factie: de heer als ze onderworpen is, anders zichzelf */
export function hoofd(t: Toestand, f: string): string {
  return t.facties[f]?.heer ?? f;
}

export function inOorlog(t: Toestand, a: string, b: string): boolean {
  if (a === b) return false;
  return t.oorlog.includes(paar(hoofd(t, a), hoofd(t, b)));
}

export function bevriend(t: Toestand, a: string, b: string): boolean {
  if (a === b) return true;
  const ha = hoofd(t, a), hb = hoofd(t, b);
  return ha === hb || t.bond.includes(paar(ha, hb));
}

export function verklaarOorlog(t: Toestand, a: string, b: string) {
  const p = paar(a, b);
  if (!t.oorlog.includes(p)) t.oorlog.push(p);
  t.bond = t.bond.filter((x) => x !== p);
}

export function sluitVrede(t: Toestand, a: string, b: string) {
  t.oorlog = t.oorlog.filter((x) => x !== paar(a, b));
}

/** willekeur die mee bewaard wordt, zodat een spel herhaalbaar is */
export function kans(t: Toestand): number {
  let a = (t.zaad = (t.zaad + 0x6d2b79f5) | 0);
  a = Math.imul(a ^ (a >>> 15), 1 | a);
  a = (a + Math.imul(a ^ (a >>> 7), 61 | a)) ^ a;
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

export function meld(t: Toestand, tekst: string, soort: Bericht['soort'], vak?: number) {
  t.berichten.push({ dag: t.dag, tekst, soort, vak });
  if (t.berichten.length > 200) t.berichten.splice(0, t.berichten.length - 200);
}

export function legersIn(t: Toestand, vak: number): Leger[] {
  return t.legers.filter((l) => l.vak === vak);
}

export function vakkenVan(t: Toestand, f: string): number[] {
  const uit: number[] = [];
  t.vakken.forEach((v, i) => { if (v.eigenaar === f) uit.push(i); });
  return uit;
}

/** een bewaard spel van een oudere versie bijwerken; null als het niet kan */
export function migreer(x: unknown): Toestand | null {
  const t = x as Omit<Toestand, 'versie'> & { versie: number };
  if (!t || typeof t !== 'object') return null;
  if (t.versie === 1) {
    for (const f of Object.values(t.facties)) Object.assign(f, { schat: 100, belasting: 'gewoon', inkomenVorigeMaand: 0 });
    for (const v of t.vakken) Object.assign(v, { tevredenheid: v.eigenaar === v.oorsprong ? 60 : 35, sindsVerovering: 0, landbouw: 0, markt: 0, weg: 0, bouw: null });
    t.versie = 2;
  }
  return t.versie === 2 ? (t as Toestand) : null;
}

/** naam in een zin: "Rome", maar "de Nerviërs" */
export function wie(t: Toestand, f: string, hoofdletter = false): string {
  const fac = t.facties[f];
  if (fac.soort === 'rijk') return fac.naam;
  return `${hoofdletter ? 'De' : 'de'} ${fac.naam}`;
}
