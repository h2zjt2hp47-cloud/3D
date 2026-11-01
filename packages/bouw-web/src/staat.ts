/**
 * Toestand van de bouwdemo: plattegrond, offerteposities en offertegegevens.
 * Wordt in de browser bewaard (localStorage) en kent "ongedaan maken".
 * Ramen en buitendeuren in de plattegrond zijn gekoppeld aan een offertepositie:
 * maten, ruimte en draairichting blijven in beide richtingen gelijk.
 */
import {
  berekenConfiguratie,
  murenVan,
  muurVanOpening,
  niveauPlan,
  niveauVan,
  standaardKeuzes,
  type ConfiguratieResultaat,
  type Keuzes,
  type Opening,
  type Plattegrond,
  type ProductModel,
  type Prijslijst,
  type RuimteType,
} from '../../core/src/index.js';
import { aanbouw, aanbouwPrijslijst } from '../../core/voorbeelden/aanbouw.js';
import type { PlanRegelOpties } from '../../core/voorbeelden/inrichting.js';
import { raamdeur, raamPrijslijst } from '../../core/voorbeelden/raam.js';
import { raamKeuzes, voorbeeldWoning } from '../../core/voorbeelden/woning.js';

export type ModelCode = 'RAAM' | 'AANBOUW';
export const MODELLEN: Record<ModelCode, { model: ProductModel; prijslijst: Prijslijst; label: string }> = {
  RAAM: { model: raamdeur, prijslijst: raamPrijslijst, label: 'Raam of deur' },
  AANBOUW: { model: aanbouw, prijslijst: aanbouwPrijslijst, label: 'Aanbouw met schuifraam' },
};

export interface Inmeting {
  breedtes: (number | null)[];
  hoogtes: (number | null)[];
  diagonalen: (number | null)[];
  speling: number;
  opmerking: string;
  /** Kleine foto (JPEG als data-URL). */
  foto?: string;
  status: 'open' | 'gemeten' | 'overgenomen';
  door?: string;
  datum?: string;
}

export interface Positie {
  id: string;
  code: string;
  naam: string;
  model: ModelCode;
  keuzes: Keuzes;
  aantal: number;
  inmeting?: Inmeting;
}

/** Vastgelegde offerte op het moment van akkoord (basis voor meerwerk). */
export interface Akkoord {
  datum: string;
  naam: string;
  excl: number;
  posities: { id: string; code: string; naam: string; aantal: number; stukprijs: number; details: string[] }[];
  regels: { code: string; omschrijving: string; eenheid: string; hoeveelheid: number; eenheidsprijs: number }[];
}

export interface MeerwerkRegel { id: string; omschrijving: string; eenheid: string; hoeveelheid: number; eenheidsprijs: number }

export interface OfferteMeta {
  klant: string;
  adres: string;
  project: string;
  nummer: string;
  datum: string;
  btw: number;
  klanttype: 'particulier' | 'aannemer';
  korting: number;
  regels: PlanRegelOpties;
  /** Winddruk voor het project (Pa), voor de statische voordimensionering van nieuwe ramen. */
  winddruk: number;
  akkoord?: Akkoord;
  meerwerk: MeerwerkRegel[];
  meerwerkbon?: { nummer: number; naam: string; datum: string; handtekening?: string; getekend: boolean };
}

export interface Toestand {
  plan: Plattegrond;
  posities: Positie[];
  meta: OfferteMeta;
}

// Opslag in de browser: een index met projecten, elk project apart, plus sjablonen en de bibliotheek.
const OUD = 'bouw-demo.v1';
const INDEX = 'bouw-demo.projecten.v1';
const PROJECT = (id: string) => `bouw-demo.project.${id}`;
const SJABLONEN = 'bouw-demo.sjablonen.v1';
const BIBLIOTHEEK = 'bouw-demo.bibliotheek.v1';

export interface ProjectInfo { id: string; naam: string; klant: string; nummer: string; gewijzigd: string; posities: number }
export interface Sjabloon { id: string; naam: string; omschrijving: string; gewijzigd: string; ingebouwd?: boolean; toestand: Toestand }
export interface BibliotheekItem { id: string; naam: string; model: ModelCode; keuzes: Keuzes; gewijzigd: string }
/** Bestandsformaat om een project te bewaren of door te sturen. */
export interface ProjectBestand { soort: 'woningconfigurator-project'; versie: 1; bewaard: string; toestand: Toestand }

function standaardMeta(): OfferteMeta {
  const d = new Date();
  return {
    klant: 'Familie Peeters',
    adres: 'Voorbeeldstraat 12, 8500 Kortrijk',
    project: 'Nieuwbouw woning met verdieping',
    nummer: `OF-${d.getFullYear()}-0042`,
    datum: d.toISOString().slice(0, 10),
    btw: 21,
    klanttype: 'particulier',
    korting: 0,
    regels: { vloeren: true, wanden: true, binnendeuren: true, ruwbouw: false, inrichting: false, gevel: true },
    meerwerk: [],
    winddruk: 800,
  };
}

export function voorbeeldToestand(): Toestand {
  const { plan, posities } = voorbeeldWoning();
  return { plan, posities, meta: standaardMeta() };
}

export function legeToestand(): Toestand {
  const v = voorbeeldToestand();
  return { plan: { ...v.plan, ruimtes: [], openingen: [], meubels: [], verdiepingen: [{ naam: 'Gelijkvloers' }] }, posities: [], meta: v.meta };
}

// ---------- opslag ----------
function lees<T>(sleutel: string): T | undefined {
  try {
    const w = localStorage.getItem(sleutel);
    return w ? (JSON.parse(w) as T) : undefined;
  } catch {
    return undefined;
  }
}
/** Schrijft naar de browser; geeft false als dat niet lukt (opslag vol of niet beschikbaar). */
function schrijf(sleutel: string, waarde: unknown): boolean {
  try {
    localStorage.setItem(sleutel, JSON.stringify(waarde));
    return true;
  } catch {
    return false;
  }
}

export function isToestand(x: unknown): x is Toestand {
  const t = x as Toestand;
  return !!t && !!t.plan && Array.isArray(t.plan.ruimtes) && Array.isArray(t.plan.openingen) && Array.isArray(t.posities) && !!t.meta;
}
const aanvullen = (x: Toestand): Toestand => ({ ...x, plan: { ...x.plan, meubels: x.plan.meubels ?? [] }, meta: { ...standaardMeta(), ...x.meta } });

let index: { actief: string; projecten: ProjectInfo[] } = { actief: '', projecten: [] };
export let laatstBewaard = '';
export let opslagProbleem = '';

function infoVan(id: string, x: Toestand): ProjectInfo {
  return { id, naam: x.meta.project || 'Naamloos project', klant: x.meta.klant, nummer: x.meta.nummer, gewijzigd: new Date().toISOString(), posities: x.posities.length };
}

function laad(): Toestand {
  index = lees<typeof index>(INDEX) ?? { actief: '', projecten: [] };
  const actief = index.projecten.find((p) => p.id === index.actief) ?? index.projecten[0];
  if (actief) {
    const x = lees<Toestand>(PROJECT(actief.id));
    if (isToestand(x)) { index.actief = actief.id; return aanvullen(x); }
  }
  // Eerste keer: het oude enkele project (vorige versie van de demo) of de voorbeeldwoning.
  const oud = lees<Toestand>(OUD);
  const start = isToestand(oud) ? aanvullen(oud) : voorbeeldToestand();
  const id = `pr${Date.now().toString(36)}`;
  index = { actief: id, projecten: [infoVan(id, start)] };
  schrijf(PROJECT(id), start);
  schrijf(INDEX, index);
  return start;
}

let t: Toestand = laad();
const geschiedenis: string[] = [];
const luisteraars = new Set<(bron: string) => void>();

export const toestand = () => t;
export const actiefProject = () => index.actief;

function bewaar() {
  if (!index.actief) return;
  const ok = schrijf(PROJECT(index.actief), t);
  const info = infoVan(index.actief, t);
  index.projecten = index.projecten.some((p) => p.id === index.actief)
    ? index.projecten.map((p) => (p.id === index.actief ? info : p))
    : [...index.projecten, info];
  const ok2 = schrijf(INDEX, index);
  opslagProbleem = ok && ok2 ? '' : 'Bewaren in de browser lukt niet (opslag vol of uitgeschakeld). Bewaar het project als bestand.';
  if (!opslagProbleem) laatstBewaard = new Date().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
}

// ---------- projecten ----------
export const projecten = (): ProjectInfo[] => [...index.projecten].sort((a, b) => b.gewijzigd.localeCompare(a.gewijzigd));

export function laadProject(id: string): Toestand | undefined {
  if (id === index.actief) return t;
  const x = lees<Toestand>(PROJECT(id));
  return isToestand(x) ? aanvullen(x) : undefined;
}

function wissel(id: string, nieuw: Toestand, opties: { huidigBewaren?: boolean } = {}) {
  if (opties.huidigBewaren !== false) bewaar();
  index.actief = id;
  t = nieuw;
  geschiedenis.length = 0;
  synchroniseer('plan');
  bewaar();
  for (const l of luisteraars) l('vervang');
}

export function openProject(id: string, opties: { huidigBewaren?: boolean } = {}) {
  const x = laadProject(id);
  if (x) wissel(id, x, opties);
}

/** Volgend offertenummer: hoogste nummer van dit jaar + 1. */
function volgendNummer(): string {
  const jaar = new Date().getFullYear();
  const nrs = index.projecten.map((p) => new RegExp(`^OF-${jaar}-(\\d+)$`).exec(p.nummer)?.[1]).filter(Boolean).map(Number);
  return `OF-${jaar}-${String((nrs.length ? Math.max(...nrs) : 0) + 1).padStart(4, '0')}`;
}

/** Maakt een schone kopie: geen akkoord, meerwerk of inmetingen; eventueel ook zonder klantgegevens. */
function schoon(x: Toestand, zonderKlant: boolean): Toestand {
  const k = structuredClone(x);
  k.meta = { ...k.meta, akkoord: undefined, meerwerk: [], meerwerkbon: undefined, datum: new Date().toISOString().slice(0, 10) };
  if (zonderKlant) k.meta = { ...k.meta, klant: '', adres: '' };
  for (const p of k.posities) delete p.inmeting;
  return k;
}

/** Nieuw project, vanuit een bron (leeg, voorbeeld, sjabloon of kopie). */
export function nieuwProject(bron: Toestand, naam: string, opties: { zonderKlant?: boolean } = {}): string {
  const x = schoon(bron, opties.zonderKlant ?? true);
  x.meta.project = naam || 'Nieuw project';
  x.meta.nummer = volgendNummer();
  const id = `pr${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  index.projecten.push(infoVan(id, x));
  wissel(id, x);
  return id;
}

export function dupliceerProject(id: string) {
  const x = laadProject(id);
  if (x) nieuwProject(x, `${x.meta.project} (kopie)`, { zonderKlant: false });
}

export function verwijderProject(id: string) {
  index.projecten = index.projecten.filter((p) => p.id !== id);
  try { localStorage.removeItem(PROJECT(id)); } catch { /* niets */ }
  if (id === index.actief) {
    // Het verwijderde project niet opnieuw bewaren bij het wisselen.
    const volgende = projecten()[0];
    if (volgende) openProject(volgende.id, { huidigBewaren: false });
    else {
      index.actief = '';
      nieuwProject(legeToestand(), 'Nieuw project');
    }
  } else {
    schrijf(INDEX, index);
    for (const l of luisteraars) l('projecten');
  }
}

// ---------- bestanden ----------
export function projectAlsBestand(x: Toestand = t): string {
  const bestand: ProjectBestand = { soort: 'woningconfigurator-project', versie: 1, bewaard: new Date().toISOString(), toestand: x };
  return JSON.stringify(bestand, null, 1);
}

/** Opent een bewaard bestand als nieuw project (het bestaande project blijft ongewijzigd). */
export function projectUitBestand(tekst: string): string {
  let data: unknown;
  try { data = JSON.parse(tekst); } catch { throw new Error('Dit bestand is geen geldig projectbestand (geen JSON).'); }
  const b = data as Partial<ProjectBestand>;
  const x = b?.soort === 'woningconfigurator-project' ? b.toestand : data;
  if (!isToestand(x)) throw new Error('Dit bestand bevat geen project van de woningconfigurator.');
  const id = `pr${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const y = aanvullen(x);
  index.projecten.push(infoVan(id, y));
  wissel(id, y);
  return id;
}

// ---------- sjablonen (herbruikbare woningen of projecten) ----------
export function sjablonen(): Sjabloon[] {
  const ingebouwd: Sjabloon[] = [
    { id: 'leeg', naam: 'Leeg project', omschrijving: 'Lege plattegrond, geen posities.', gewijzigd: '', ingebouwd: true, toestand: legeToestand() },
    { id: 'voorbeeld', naam: 'Voorbeeldwoning', omschrijving: 'Gelijkvloers en verdieping, 14 ramen en deuren, inrichting.', gewijzigd: '', ingebouwd: true, toestand: voorbeeldToestand() },
  ];
  return [...ingebouwd, ...(lees<Sjabloon[]>(SJABLONEN) ?? [])];
}

export function bewaarAlsSjabloon(naam: string, omschrijving: string): boolean {
  const eigen = lees<Sjabloon[]>(SJABLONEN) ?? [];
  eigen.push({ id: nieuweId('sj'), naam: naam || t.meta.project, omschrijving, gewijzigd: new Date().toISOString(), toestand: schoon(t, true) });
  const ok = schrijf(SJABLONEN, eigen);
  for (const l of luisteraars) l('projecten');
  return ok;
}

export function verwijderSjabloon(id: string) {
  schrijf(SJABLONEN, (lees<Sjabloon[]>(SJABLONEN) ?? []).filter((s) => s.id !== id));
  for (const l of luisteraars) l('projecten');
}

// ---------- bibliotheek (herbruikbare ramen en deuren) ----------
export const bibliotheek = (): BibliotheekItem[] => lees<BibliotheekItem[]>(BIBLIOTHEEK) ?? [];

export function bewaarInBibliotheek(p: Positie, naam: string): boolean {
  const keuzes = structuredClone(p.keuzes);
  delete keuzes.verdieping;
  const ok = schrijf(BIBLIOTHEEK, [...bibliotheek(), { id: nieuweId('bib'), naam: naam || p.naam, model: p.model, keuzes, gewijzigd: new Date().toISOString() }]);
  for (const l of luisteraars) l('projecten');
  return ok;
}

export function verwijderUitBibliotheek(id: string) {
  schrijf(BIBLIOTHEEK, bibliotheek().filter((b) => b.id !== id));
  for (const l of luisteraars) l('projecten');
}

/** Nieuwe positie op basis van een bibliotheekitem (met de winddruk van dit project). */
export function positieUitBibliotheek(id: string): Positie | undefined {
  const b = bibliotheek().find((x) => x.id === id);
  if (!b) return undefined;
  const p = nieuwePositie(b.model, structuredClone(b.keuzes), b.naam);
  if (b.model === 'RAAM') p.keuzes.winddruk = t.meta.winddruk ?? p.keuzes.winddruk;
  return p;
}

/** Voert een wijziging uit (met ongedaan maken), synchroniseert plan en posities, bewaart en verwittigt. */
export function wijzig(bron: string, f: (t: Toestand) => void, opties: { zonderOngedaan?: boolean } = {}) {
  if (!opties.zonderOngedaan) {
    geschiedenis.push(JSON.stringify(t));
    if (geschiedenis.length > 80) geschiedenis.shift();
  }
  f(t);
  synchroniseer(bron);
  bewaar();
  for (const l of luisteraars) l(bron);
}

/** Bewaart een momentopname voor "ongedaan maken" (bv. bij het begin van slepen). */
export function momentopname() {
  geschiedenis.push(JSON.stringify(t));
  if (geschiedenis.length > 80) geschiedenis.shift();
}

export function ongedaan() {
  const vorige = geschiedenis.pop();
  if (!vorige) return;
  t = JSON.parse(vorige) as Toestand;
  bewaar();
  for (const l of luisteraars) l('ongedaan');
}
export const kanOngedaan = () => geschiedenis.length > 0;

export function vervang(nieuw: Toestand) {
  momentopname();
  t = nieuw;
  synchroniseer('plan');
  bewaar();
  for (const l of luisteraars) l('vervang');
}

export function opWijziging(f: (bron: string) => void) {
  luisteraars.add(f);
}

// ---------- berekeningen (met eenvoudige cache) ----------
const cache = new Map<string, ConfiguratieResultaat>();
export function resultaat(p: Positie): ConfiguratieResultaat {
  const sleutel = `${p.model}:${JSON.stringify(p.keuzes)}`;
  let r = cache.get(sleutel);
  if (!r) {
    const m = MODELLEN[p.model];
    r = berekenConfiguratie(m.model, p.keuzes, m.prijslijst);
    if (cache.size > 300) cache.clear();
    cache.set(sleutel, r);
  }
  return r;
}

export const nieuweId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function hernummer() {
  t.posities.forEach((p, i) => (p.code = `P${i + 1}`));
}

export function positieVan(o: Opening): Positie | undefined {
  return o.positie ? t.posities.find((p) => p.id === o.positie) : undefined;
}
export function openingVan(p: Positie): Opening | undefined {
  return t.plan.openingen.find((o) => o.positie === p.id);
}

export function nieuwePositie(model: ModelCode, extra: Keuzes = {}, naam?: string): Positie {
  const p: Positie = {
    id: nieuweId('p'),
    code: '',
    naam: naam ?? MODELLEN[model].label,
    model,
    keuzes: model === 'RAAM' ? raamKeuzes({ winddruk: t.meta.winddruk ?? 800, ...extra }) : { ...standaardKeuzes(aanbouw), ...extra },
    aantal: 1,
  };
  return p;
}

// ---------- koppeling plattegrond ↔ posities ----------
const RUIMTE_NAAR_RAAM: Record<RuimteType, string> = {
  leefruimte: 'leefruimte', keuken: 'keuken', slaapkamer: 'slaapkamer', bureau: 'bureau',
  badkamer: 'badkamer', wc: 'wc', hal: 'hal', berging: 'berging', garage: 'berging',
};

/**
 * Loopt lokaal x van het raam (links → rechts gezien van binnen) tegen de planrichting in?
 * Dan is "links van binnen" het einde van de opening op de tekening.
 */
export function lokaalTegenPlan(o: Opening): { tegen: boolean; binnenPlus: boolean } {
  const m = muurVanOpening(o, murenVan(niveauPlan(t.plan, niveauVan(o))));
  const binnenPlus = m ? (m.soort === 'buiten' ? !!m.plus : o.naarPlus) : o.naarPlus;
  return { tegen: o.as === 'h' ? !binnenPlus : binnenPlus, binnenPlus };
}

/** Zet maten, ruimte en draairichting van de opening over naar de positie. */
export function openingNaarPositie(o: Opening, p: Positie) {
  if (p.model !== 'RAAM') return;
  p.keuzes.breedte = Math.round(o.breedte * 10);
  p.keuzes.hoogte = Math.round(o.hoogte * 10);
  if (o.soort === 'raam') p.keuzes.borstwering = Math.round(o.borstwering * 10);
  p.keuzes.verdieping = niveauVan(o);
  const muren = murenVan(niveauPlan(t.plan, niveauVan(o)));
  const m = muurVanOpening(o, muren);
  const binnen = m ? (m.soort === 'buiten' ? (m.plus ?? m.min) : undefined) : undefined;
  const r = t.plan.ruimtes.find((x) => x.id === binnen);
  if (r) p.keuzes.ruimte = RUIMTE_NAAR_RAAM[r.type];
  if (o.soort === 'buitendeur') {
    const { tegen, binnenPlus } = lokaalTegenPlan(o);
    const links = (o.scharnier === 'begin') !== tegen;
    if (p.keuzes.type === 'voordeur') {
      p.keuzes.deur_draai = links ? 'links' : 'rechts';
      p.keuzes.deur_naar = o.naarPlus === binnenPlus ? 'binnen' : 'buiten';
    } else if (p.keuzes.type === 'terrasdeur' && p.keuzes.vakken === 'v1') {
      const v = String(p.keuzes.vak1 ?? 'draai_l');
      const basis = v.startsWith('draaikip') ? 'draaikip' : 'draai';
      p.keuzes.vak1 = `${basis}_${links ? 'l' : 'r'}`;
    }
  }
}

/** Zet maten, soort en draairichting van de positie over naar de opening. */
export function positieNaarOpening(p: Positie, o: Opening) {
  if (p.model !== 'RAAM') return;
  const k = p.keuzes;
  if (typeof k.breedte === 'number') o.breedte = k.breedte / 10;
  if (typeof k.hoogte === 'number') o.hoogte = k.hoogte / 10;
  const type = String(k.type);
  o.soort = type === 'raam' ? 'raam' : type === 'schuif' ? 'schuifraam' : 'buitendeur';
  if (o.soort === 'raam' && typeof k.borstwering === 'number') o.borstwering = k.borstwering / 10;
  if (o.soort !== 'raam') o.borstwering = 0;
  if (o.soort === 'buitendeur') {
    const { tegen, binnenPlus } = lokaalTegenPlan(o);
    let links: boolean | undefined;
    if (type === 'voordeur') {
      links = k.deur_draai !== 'rechts';
      o.naarPlus = k.deur_naar === 'buiten' ? !binnenPlus : binnenPlus;
    } else if (type === 'terrasdeur' && k.vakken === 'v1') {
      const v = String(k.vak1 ?? '');
      if (v.endsWith('_l')) links = true;
      if (v.endsWith('_r')) links = false;
      o.naarPlus = binnenPlus;
    }
    if (links !== undefined) o.scharnier = links !== tegen ? 'begin' : 'einde';
  }
}

/** Na elke wijziging: plan en posities in overeenstemming brengen. */
function synchroniseer(bron: string) {
  for (const o of t.plan.openingen) {
    const p = positieVan(o);
    if (!p) {
      if (o.positie) o.positie = undefined;
      continue;
    }
    if (bron === 'positie') positieNaarOpening(p, o);
    else openingNaarPositie(o, p);
  }
  hernummer();
}

export function klantKorting(): number {
  return t.meta.klanttype === 'aannemer' ? t.meta.korting : 0;
}

// Bij het laden: plan en posities in overeenstemming brengen (na alle declaraties hierboven).
synchroniseer('plan');
