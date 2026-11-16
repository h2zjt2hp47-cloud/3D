/**
 * Meegeven aan de klant (16/11): één HTML-bestand met de draaibare 3D van het ontwerp, dat de klant op elk toestel opent
 * zonder iets te installeren: de losse kijker (kijker.ts → dist/bouw-kijker.html) met het 3D-pakket erin. Zonder prijzen
 * (het pakket heeft er geen), zonder iets van buiten te laden, en de klant kan niets wijzigen (de kijker toont alleen).
 * Gaan er varianten mee, dan wisselt de klant ertussen; bij elke variant staat wat ze anders maakt.
 *
 * Varianten: projecten met dezelfde `variantGroep` (gezet door *Variant maken*), of, voor varianten van vóór 16/11,
 * met dezelfde naam op " (variant n)" na en dezelfde klant.
 */
import kijkerGz from 'virtueel:kijker';
import { type Pakket3D } from '../../core/src/index.js';
import { planCatalogus } from '../../core/voorbeelden/inrichting.js';
import { ontwerpKenmerken, verschillen } from '../../core/voorbeelden/varianten.js';
import { maakPakket3D } from './doorsturen.js';
import { actiefProject, laadProject, projecten, toestand, type Positie, type Toestand } from './staat.js';

/** Hoeveel ontwerpen hoogstens naast elkaar staan en samen in één bestand gaan. */
export const MAX_VARIANTEN = 3;

/** Waar het pakket in de kijker komt (kijker.html): vóór het programma, dat het meteen leest. */
const PAKKET_PLEK = '<!--PAKKET-->';

// ---------- de naam van de aannemer (op het bestand en het blad; bewaard in deze browser, voor alle projecten) ----------
const SLEUTEL_AANNEMER = 'bouw-demo.aannemer';
export const STANDAARD_AANNEMER = 'Uw bedrijf';
export function aannemerNaam(): string {
  try { return localStorage.getItem(SLEUTEL_AANNEMER)?.trim() || STANDAARD_AANNEMER; } catch { return STANDAARD_AANNEMER; }
}
export function zetAannemerNaam(naam: string) {
  try { localStorage.setItem(SLEUTEL_AANNEMER, naam.trim()); } catch { /* geen opslag */ }
}

// ---------- varianten ----------
export interface Variant { id: string; naam: string; t: Toestand }

const variantNr = (naam: string) => Number(/ \(variant (\d+)\)$/.exec(naam)?.[1] ?? 1);
const basisNaam = (naam: string) => naam.replace(/ \(variant \d+\)$/, '');

/**
 * Alle varianten van het actieve project, het origineel eerst en dan variant 2, 3 …; met alleen het actieve project als
 * het geen varianten heeft. Een ander project lezen gebeurt zonder van project te wisselen.
 */
export function familie(): Variant[] {
  const id = actiefProject();
  const t = toestand();
  const groep = t.meta.variantGroep;
  const basis = basisNaam(t.meta.project);
  const leden: Variant[] = [];
  for (const info of projecten()) {
    const x = info.id === id ? t : laadProject(info.id);
    if (!x || !!x.meta.zonderWoning !== !!t.meta.zonderWoning) continue;
    const zelfdeGroep = !!groep && x.meta.variantGroep === groep;
    // Varianten van vóór de variantgroep: zelfde naam op " (variant n)" na, minstens één van de twee heet zo, zelfde klant.
    const zelfdeNaam = basisNaam(x.meta.project) === basis && (x.meta.project !== basis || t.meta.project !== basis) && x.meta.klant === t.meta.klant;
    if (info.id === id || zelfdeGroep || zelfdeNaam) leden.push({ id: info.id, naam: x.meta.project, t: x });
  }
  return leden.sort((a, b) => variantNr(a.naam) - variantNr(b.naam) || a.naam.localeCompare(b.naam));
}

/** Varianten die de verkoper uitvinkte (niet mee in het bestand voor de klant). */
const nietMee = new Set<string>();

/**
 * Welke varianten mee gaan in het bestand voor de klant: alle (hoogstens drie), behalve wat de verkoper uitvinkte; nooit
 * geen. Bij meer dan drie: de drie eerste, met het actieve project erbij.
 */
export function meeTeGeven(leden: Variant[] = familie()): Variant[] {
  const id = actiefProject();
  let mee = leden.filter((v) => !nietMee.has(v.id));
  if (!mee.length) mee = leden.filter((v) => v.id === id);
  if (mee.length > MAX_VARIANTEN) {
    const eerst = mee.slice(0, MAX_VARIANTEN);
    if (!eerst.some((v) => v.id === id) && mee.some((v) => v.id === id)) eerst[MAX_VARIANTEN - 1] = mee.find((v) => v.id === id)!;
    mee = eerst;
  }
  return mee;
}
export const gaatMee = (id: string) => !nietMee.has(id);
export function zetMee(id: string, mee: boolean) {
  if (mee) nietMee.delete(id);
  else nietMee.add(id);
}

/** Per variant wat ze anders maakt dan de andere, in gewone taal. */
export function verschilVan(leden: Variant[]): string[][] {
  return verschillen(leden.map((v) => ontwerpKenmerken(v.t.plan, v.t.posities, planCatalogus, { zonderWoning: v.t.meta.zonderWoning })));
}

// ---------- het bestand ----------
/** Het pakket voor de klant: het eerste ontwerp, met de andere als varianten; met de aannemer en de datum erop. */
export function klantPakket(leden: Variant[], omschrijf: (p: Positie) => string): Pakket3D {
  const verschil = leden.length > 1 ? verschilVan(leden) : [];
  const pakketten = leden.map((v, i) => {
    const p = maakPakket3D(omschrijf, v.t);
    p.project.aannemer = aannemerNaam();
    if (v.t.meta.datum) p.project.datum = v.t.meta.datum;
    if (leden.length > 1) p.variant = { naam: v.naam, verschil: verschil[i] ?? [] };
    return p;
  });
  const [eerste, ...andere] = pakketten;
  if (andere.length) eerste!.varianten = andere;
  return eerste!;
}

/** De losse kijker, uitgepakt (één keer). */
let kijker: Promise<string> | null = null;
function kijkerHtml(): Promise<string> {
  if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('Deze browser kan het bestand voor de klant niet maken. Gebruik een recente Chrome, Edge, Safari of Firefox.'));
  kijker ??= (async () => {
    const ruw = atob(kijkerGz);
    const bytes = new Uint8Array(ruw.length);
    for (let i = 0; i < ruw.length; i++) bytes[i] = ruw.charCodeAt(i);
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  })();
  kijker.catch(() => { kijker = null; });
  return kijker;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Eén HTML-bestand voor de klant: de kijker met het pakket erin. Geeft de bestandsnaam, de inhoud en de grootte in bytes.
 * Er worden geen beelden getekend: het bestand is er meteen.
 */
export async function maakKlantBestand(leden: Variant[], omschrijf: (p: Positie) => string): Promise<{ naam: string; inhoud: string; grootte: number; varianten: number }> {
  const html = await kijkerHtml();
  const pakket = klantPakket(leden, omschrijf);
  const plek = html.indexOf(PAKKET_PLEK);
  if (plek < 0) throw new Error('De kijker in dit programma mist de plaats voor het ontwerp.');
  // JSON in een script: een "<" wordt <, zodat "</script>" in een naam de pagina niet kan breken.
  const json = JSON.stringify(pakket).replace(/</g, '\\u003c');
  const titel = `${pakket.project.naam || 'Ontwerp'} · 3D`;
  const inhoud = (html.slice(0, plek) + `<script id="pakket" type="application/json">${json}</script>` + html.slice(plek + PAKKET_PLEK.length))
    .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(titel)}</title>`);
  const naam = `3D ${[pakket.project.nummer, basisNaam(pakket.project.naam)].filter(Boolean).join(' ')}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { naam: `${naam}.html`, inhoud, grootte: new Blob([inhoud]).size, varianten: leden.length };
}

/** "1,9 MB" of "640 kB". */
export function grootteTekst(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(bytes / 1024)} kB`;
}
