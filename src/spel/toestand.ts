// De toestand van een spel: alles wat bewaard wordt. Enkel gewone gegevens, zodat opslaan eenvoudig is.

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
  versie: 1;
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
