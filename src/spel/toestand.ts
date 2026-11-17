// De toestand van een spel: alles wat bewaard wordt. Enkel gewone gegevens, zodat opslaan eenvoudig is.
import type { Belasting, Gebouw } from './economie';

export type Soort = 'rijk' | 'stam' | 'staat';

/** een vorst of leider van een factie */
export interface Vorst {
  naam: string;
  /** dagnummer van de geboorte */
  geboren: number;
  /** dag waarop de regering begon */
  sinds: number;
  /** is er een erfgenaam? */
  erfgenaam: boolean;
  /** verzonnen door het spel (geen historische persoon) */
  verzonnen: boolean;
}

/** een macht van buiten het speelgebied: krijgt steun en versterking van over de rand */
export interface Buitenmacht {
  /** [breedte, lengte] in de richting waar de versterkingen vandaan komen */
  ingang: [number, number];
  /** zilver per maand van buiten */
  steun: number;
  /** tot hoeveel man er elk voorjaar wordt aangevuld */
  doelSterkte: number;
  /** naam voor de versterkingen, bv. "Versterking uit Italië" */
  naam: string;
}

export interface Factie {
  id: string;
  naam: string;
  kleur: string;
  /** hoe goed de troepen vechten (1 = gewoon) */
  kwaliteit: number;
  soort: Soort;
  /** naam van de huidige leider (zie ook vorst) */
  heerser: string;
  titel: string;
  dynastie: string;
  vorst: Vorst | null;
  beschrijving: string;
  hoofdstad: number | null;
  /** mannen die nog opgeroepen kunnen worden */
  mankracht: number;
  /** onderworpen aan deze factie, of null als vrij */
  heer: string | null;
  /** leenheer in naam (middeleeuwen): de leenman blijft zelfstandig, maar betaalt een tiende */
  leenheer?: string | null;
  bestaat: boolean;
  /** aantal vakken bij de start van het tijdperk */
  vakkenBijStart: number;
  /** zilver in de schatkist */
  schat: number;
  belasting: Belasting;
  /** netto inkomen van de vorige maand */
  inkomenVorigeMaand: number;
  /** oorlogsmoeheid 0 tot 100 */
  moeheid: number;
  buiten: Buitenmacht | null;
  /** het tijdperk waarin deze factie hoort */
  tijdperk: string;
}

export interface VakToestand {
  eigenaar: string;
  /** het volk dat er bij de start van het tijdperk woonde */
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
  haven: number;
  nijverheid: number;
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
  soort: 'slag' | 'verovering' | 'gebeurtenis' | 'info' | 'diplomatie';
  vak?: number;
  /** betrokken machten (voor het automatisch stilzetten van de klok) */
  wie?: string[];
  /** een vorst stierf */
  vorst?: boolean;
}

export interface Keuze {
  id: string;
  titel: string;
  tekst: string;
  opties: { tekst: string; gevolg: string; uitleg?: string }[];
}

/** een lopende oorlog tussen twee hoofden */
export interface Oorlog {
  begin: number;
  /** gewonnen slagen per kant */
  slagen: Record<string, number>;
  /** vakken per kant bij het begin */
  start: Record<string, number>;
}

export interface TijdperkScore {
  tijdperk: string;
  factie: string;
  welvaart: number;
  macht: number;
  vrijheid: number;
}

export interface Toestand {
  versie: 3;
  dag: number;
  zaad: number;
  speler: string;
  tijdperk: string;
  facties: Record<string, Factie>;
  vakken: VakToestand[];
  legers: Leger[];
  volgendLeger: number;
  /** paren "a|b" (alfabetisch) die in oorlog zijn */
  oorlog: string[];
  oorlogen: Record<string, Oorlog>;
  /** paren "a|b" die bondgenoten zijn */
  bond: string[];
  /** paren met een huwelijksband tussen hun vorstenhuizen */
  huwelijk: string[];
  /** wapenstilstand: paar → dag tot wanneer */
  bestand: Record<string, number>;
  /** mening over elkaar: paar → -100 tot 100 */
  opinie: Record<string, number>;
  berichten: Bericht[];
  gedaan: string[];
  /** keuzes die op de speler wachten; de klok staat dan stil */
  wachtend: Keuze[];
  /** dag waarop de speler opnieuw gevraagd mag worden om zich te onderwerpen */
  onderwerpVraagNa: number;
  scores: TijdperkScore[];
  /** de computer speelt ook het land van de speler */
  automatisch?: boolean;
}

/** wordt deze macht door een mens gespeeld? */
export const mens = (t: Toestand, f: string) => f === t.speler && !t.automatisch;

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
  if (a === b) return;
  if (!t.oorlog.includes(p)) {
    t.oorlog.push(p);
    t.oorlogen[p] = { begin: t.dag, slagen: { [a]: 0, [b]: 0 }, start: { [a]: vakkenVan(t, a).length, [b]: vakkenVan(t, b).length } };
  }
  t.bond = t.bond.filter((x) => x !== p);
}

export function sluitVrede(t: Toestand, a: string, b: string, jaren = 5) {
  const p = paar(a, b);
  t.oorlog = t.oorlog.filter((x) => x !== p);
  delete t.oorlogen[p];
  t.bestand[p] = t.dag + jaren * 365;
}

export function sluitBond(t: Toestand, a: string, b: string) {
  const p = paar(a, b);
  if (a !== b && !t.bond.includes(p) && !t.oorlog.includes(p)) t.bond.push(p);
}

export function opinie(t: Toestand, a: string, b: string): number {
  return t.opinie[paar(a, b)] ?? 0;
}

export function wijzigOpinie(t: Toestand, a: string, b: string, d: number) {
  if (a === b) return;
  const p = paar(a, b);
  t.opinie[p] = Math.max(-100, Math.min(100, (t.opinie[p] ?? 0) + d));
}

/** willekeur die mee bewaard wordt, zodat een spel herhaalbaar is */
export function kans(t: Toestand): number {
  let a = (t.zaad = (t.zaad + 0x6d2b79f5) | 0);
  a = Math.imul(a ^ (a >>> 15), 1 | a);
  a = (a + Math.imul(a ^ (a >>> 7), 61 | a)) ^ a;
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

export function meld(t: Toestand, tekst: string, soort: Bericht['soort'], vak?: number, betrokken?: string[], vorst?: boolean) {
  t.berichten.push({ dag: t.dag, tekst, soort, vak, wie: betrokken, vorst });
  if (t.berichten.length > 300) t.berichten.splice(0, t.berichten.length - 300);
}

export function legersIn(t: Toestand, vak: number): Leger[] {
  return t.legers.filter((l) => l.vak === vak);
}

export function vakkenVan(t: Toestand, f: string): number[] {
  const uit: number[] = [];
  t.vakken.forEach((v, i) => { if (v.eigenaar === f) uit.push(i); });
  return uit;
}

export function sterkteVan(t: Toestand, f: string): number {
  return t.legers.filter((l) => l.factie === f).reduce((s, l) => s + l.sterkte, 0);
}

/** naam in een zin: "Rome", maar "de Nerviërs" */
export function wie(t: Toestand, f: string, hoofdletter = false): string {
  const fac = t.facties[f];
  if (!fac) return f;
  if (fac.soort !== 'stam') return fac.naam;
  return `${hoofdletter ? 'De' : 'de'} ${fac.naam}`;
}

/** een bewaard spel van een oudere versie bijwerken; null als het niet kan */
export function migreer(x: unknown): Toestand | null {
  const t = x as Record<string, unknown> & { versie: number; facties: Record<string, Record<string, unknown>>; vakken: Record<string, unknown>[]; oorlog: string[] };
  if (!t || typeof t !== 'object') return null;
  if (t.versie === 1) {
    for (const f of Object.values(t.facties)) Object.assign(f, { schat: 100, belasting: 'gewoon', inkomenVorigeMaand: 0 });
    for (const v of t.vakken) Object.assign(v, { tevredenheid: v.eigenaar === v.oorsprong ? 60 : 35, sindsVerovering: 0, landbouw: 0, markt: 0, weg: 0, bouw: null });
    t.versie = 2;
  }
  if (t.versie === 2) {
    for (const f of Object.values(t.facties)) {
      Object.assign(f, {
        titel: f.soort === 'rijk' ? 'imperator' : 'koning', dynastie: '', vorst: null, moeheid: 0, tijdperk: 'romeinen',
        buiten: f.id === 'rome' ? { ingang: [49.2, 3.9], steun: 75, doelSterkte: 30000, naam: 'Versterking uit Italië' } : null,
      });
    }
    for (const v of t.vakken) Object.assign(v, { haven: 0, nijverheid: 0 });
    const oorlogen: Record<string, Oorlog> = {};
    for (const p of t.oorlog) {
      const [a, b] = p.split('|');
      oorlogen[p] = { begin: 0, slagen: { [a]: 0, [b]: 0 }, start: { [a]: 0, [b]: 0 } };
    }
    Object.assign(t, { tijdperk: 'romeinen', oorlogen, huwelijk: [], bestand: {}, opinie: {}, scores: [] });
    t.versie = 3;
  }
  return t.versie === 3 ? (t as unknown as Toestand) : null;
}
