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
  akkoord?: Akkoord;
  meerwerk: MeerwerkRegel[];
  meerwerkbon?: { nummer: number; naam: string; datum: string; handtekening?: string; getekend: boolean };
}

export interface Toestand {
  plan: Plattegrond;
  posities: Positie[];
  meta: OfferteMeta;
}

const SLEUTEL = 'bouw-demo.v1';

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
    regels: { vloeren: true, wanden: true, binnendeuren: true, ruwbouw: false, inrichting: false },
    meerwerk: [],
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

function laad(): Toestand {
  try {
    const t = JSON.parse(localStorage.getItem(SLEUTEL) ?? 'null') as Toestand | null;
    if (t && t.plan && Array.isArray(t.plan.ruimtes) && Array.isArray(t.posities) && t.meta) return { ...t, meta: { ...standaardMeta(), ...t.meta } };
  } catch {
    /* geen of ongeldige opslag */
  }
  return voorbeeldToestand();
}

let t: Toestand = laad();
const geschiedenis: string[] = [];
const luisteraars = new Set<(bron: string) => void>();

export const toestand = () => t;

function bewaar() {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(t));
  } catch {
    /* opslag niet beschikbaar */
  }
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
    keuzes: model === 'RAAM' ? raamKeuzes(extra) : { ...standaardKeuzes(aanbouw), ...extra },
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
