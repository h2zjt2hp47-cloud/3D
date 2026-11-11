/**
 * Gedeelde toestand van de demo: materialen en klantkorting.
 * Materialen en het laatste ontwerp worden in deze browser bewaard (localStorage),
 * zodat ze een herlaadbeurt overleven. Werkt de opslag niet, dan werkt alles gewoon zonder.
 */
import { controleerCatalogus, leesMaterialen, type Materiaal, type ModelDefinitie, type OntwerpCatalogus } from '../../core/src/index.js';
import { zetelModellen } from '../../core/voorbeelden/modellen.js';
import { proefModellen } from '../../core/voorbeelden/proefmodellen.js';
import { standaardMaterialen, STOFGROEPEN } from '../../core/voorbeelden/sofa.js';
import { zetelCatalogus } from '../../core/voorbeelden/vrij-ontwerp.js';

const SLEUTEL_MATERIALEN = 'configurator-demo.materialen.v1';
const SLEUTEL_CATALOGUS = 'configurator-demo.catalogus.v1';
const SLEUTEL_MODELLEN = 'configurator-demo.eigen-modellen.v1';

function lees(sleutel: string): string | null {
  try {
    return localStorage.getItem(sleutel);
  } catch {
    return null;
  }
}
export function bewaar(sleutel: string, waarde: string | null) {
  try {
    if (waarde === null) localStorage.removeItem(sleutel);
    else localStorage.setItem(sleutel, waarde);
  } catch {
    /* opslag niet beschikbaar: geen probleem */
  }
}
export function laad(sleutel: string): string | null {
  return lees(sleutel);
}

/**
 * Bewaarde lijst aanvullen met standaardstoffen die er later bijgekomen zijn (bv. nieuwe collecties),
 * en per standaardstof de foto, collectie en het weefsel terugzetten als die ontbreken.
 */
function metNieuweStandaard(bewaard: Materiaal[]): Materiaal[] {
  const lijst = bewaard.map((m) => {
    const std = standaardMaterialen.find((x) => x.code === m.code);
    if (!std || m.eigen) return m;
    return { ...m, textuur: m.textuur ?? std.textuur, textuurCm: m.textuurCm ?? std.textuurCm, collectie: m.collectie ?? std.collectie, weefsel: m.weefsel ?? std.weefsel };
  });
  for (const std of standaardMaterialen) {
    if (lijst.some((m) => m.code === std.code)) continue;
    // Invoegen na de laatste stof van dezelfde collectie, anders vóór het eigen materiaal van de klant.
    const na = lijst.map((m) => m.collectie).lastIndexOf(std.collectie);
    const eigen = lijst.findIndex((m) => m.groep === 'EIGEN');
    const plaats = na >= 0 ? na + 1 : eigen >= 0 ? eigen : lijst.length;
    lijst.splice(plaats, 0, structuredClone(std));
  }
  return lijst;
}

function startMaterialen(): Materiaal[] {
  const opgeslagen = lees(SLEUTEL_MATERIALEN);
  if (!opgeslagen) return structuredClone(standaardMaterialen);
  try {
    const { materialen } = leesMaterialen(opgeslagen, STOFGROEPEN);
    if (!materialen.length) return structuredClone(standaardMaterialen);
    return metNieuweStandaard(materialen);
  } catch {
    return structuredClone(standaardMaterialen);
  }
}

let materialen: Materiaal[] = startMaterialen();
let korting = 0;
const luisteraars = { materialen: new Set<() => void>(), korting: new Set<() => void>(), catalogus: new Set<() => void>() };

// ---------- catalogus (elementen, opties) en eigen modellen ----------
/**
 * Een bewaarde catalogus met de oude standaard voor de chaise longue (zonder rugleuning, rug +210 €) bijwerken naar
 * de nieuwe (standaard mét rugleuning achteraan). Alleen als die keuze en de prijs van de chaise nog onveranderd zijn.
 */
function metNieuweChaise(c: OntwerpCatalogus): OntwerpCatalogus {
  const g = c.opties?.find((x) => x.code === 'chaise_rug');
  if (!g || g.standaard !== 'geen' || g.keuzes.find((k) => k.code === 'achter')?.prijs !== 210) return c;
  const nieuweGroep = zetelCatalogus.opties?.find((x) => x.code === 'chaise_rug');
  const nieuwType = zetelCatalogus.typen.find((t) => t.code === 'chaise');
  if (!nieuweGroep || !nieuwType) return c;
  return {
    ...c,
    opties: c.opties!.map((x) => (x.code === 'chaise_rug' ? structuredClone(nieuweGroep) : x)),
    typen: c.typen.map((t) => (t.code === 'chaise' && t.prijs.A === 760 ? structuredClone(nieuwType) : t)),
  };
}

/**
 * Een bewaarde catalogus met de oude grens voor het afgeronde eindelement (hoogstens 120 cm diep) bijwerken naar 160 cm:
 * zo kan een rond loungedeel dieper zijn (Doha). Alleen als die grens nog de oude standaard is.
 */
function metDieperEindelement(c: OntwerpCatalogus): OntwerpCatalogus {
  return { ...c, typen: c.typen.map((t) => (t.code === 'rond_einde' && t.diepte.max === 120 ? { ...t, diepte: { ...t.diepte, max: 160 } } : t)) };
}

/** Een bewaarde catalogus met de oude ondergrens voor de armleuning (12 cm) bijwerken naar 8 cm (zetelbedden, 11/11). */
function metSmalleArm(c: OntwerpCatalogus): OntwerpCatalogus {
  return { ...c, typen: c.typen.map((t) => (t.code === 'arm' && t.breedte.min === 12 ? { ...t, breedte: { ...t.breedte, min: 8 }, prijsVanaf: 12 } : t)) };
}

/**
 * Een bewaarde catalogus bijwerken met de fauteuilvormen van 10/11: de nieuwe vorm "koepel" toevoegen (Tumble gebruikt
 * ze) en de schelp en de trommel vervangen als ze nog de oude standaard hebben. Een zelf aangepaste vorm blijft.
 */
function metNieuweKuipvormen(c: OntwerpCatalogus): OntwerpCatalogus {
  const nieuw = zetelCatalogus.opties?.find((x) => x.code === 'kuipvorm');
  if (!nieuw || !c.opties?.some((x) => x.code === 'kuipvorm')) return c;
  // Afgerond (11/11): dunnere wand met een brede bovenkant, naar de foto's van Mabel, Ross en Sullivan.
  const oud: Record<string, { dikte: number; boog: number }> = { schelp: { dikte: 6, boog: 98 }, trommel: { dikte: 14, boog: 138 }, afgerond: { dikte: 13, boog: 130 }, omhullend: { dikte: 17, boog: 140 } };
  return {
    ...c,
    opties: c.opties.map((g) => {
      if (g.code !== 'kuipvorm') return g;
      const keuzes = g.keuzes.map((k) => {
        const o = oud[k.code], n = nieuw.keuzes.find((x) => x.code === k.code);
        return o && n && k.teken?.dikte === o.dikte && k.teken?.boog === o.boog ? structuredClone(n) : k;
      });
      // (de kruisvoet staat in een andere groep: zie metNieuwVan1111)
      const koepel = nieuw.keuzes.find((x) => x.code === 'koepel');
      if (koepel && !keuzes.some((k) => k.code === 'koepel')) keuzes.splice(Math.max(0, keuzes.findIndex((k) => k.code === 'trommel')), 0, structuredClone(koepel));
      return { ...g, keuzes };
    }),
  };
}

/**
 * Een bewaarde catalogus krijgt erbij wat de modellen sinds 11/11 gebruiken: de houten kruisvoet (Ross, Sullivan, Fraser),
 * de poefvormen bol en taps (Tumble pouf, Stockholm), het houten blad op de onderbouw (Kotor, Belize, Fréjus), de
 * fauteuilvorm méridienne (Mabel), het formaat van een sierkussen (Nestor), een bredere chaise (Belize) en een bredere
 * fauteuil (Mabel 2-zit). Zonder dat zou de bewaarde catalogus niet meer bij de collectie passen en door de standaard
 * vervangen worden. Wat de gebruiker zelf aanpaste, blijft.
 */
const NIEUWE_KEUZES: [groep: string, keuze: string][] = [['poten', 'kruis'], ['poefvorm', 'bol'], ['poefvorm', 'taps'], ['console_uitvoering', 'op_basis'], ['kuipvorm', 'meridienne']];
/** Hele optiegroepen die er sinds 11/11 bij zijn: het formaat van een sierkussen (lendenkussen bij Nestor). */
const NIEUWE_GROEPEN = ['kussenformaat'];
function metNieuwVan1111(c: OntwerpCatalogus): OntwerpCatalogus {
  if (!c.opties) return c;
  const groepenErbij = NIEUWE_GROEPEN.filter((code) => !c.opties!.some((g) => g.code === code))
    .map((code) => zetelCatalogus.opties?.find((g) => g.code === code))
    .filter((g): g is NonNullable<typeof g> => Boolean(g))
    .map((g) => structuredClone(g));
  return {
    ...c,
    // Bredere chaise (tot 160 cm): het loungedeel van Belize. Alleen als de grens nog de oude standaard is.
    // Bredere fauteuil (tot 150 cm): de Mabel 2-zit en de Mabel Meridienne zijn één schelp.
    typen: c.typen.map((t) => (t.code === 'chaise' && t.breedte.max === 110 ? { ...t, breedte: { ...t.breedte, max: 160 } }
      : t.code === 'fauteuil' && t.breedte.max === 110 ? { ...t, breedte: { ...t.breedte, max: 150 } } : t)),
    opties: [...c.opties, ...groepenErbij].map((g) => {
      const erbij = NIEUWE_KEUZES.filter(([groep, keuze]) => groep === g.code && !g.keuzes.some((k) => k.code === keuze))
        .map(([groep, keuze]) => zetelCatalogus.opties?.find((x) => x.code === groep)?.keuzes.find((k) => k.code === keuze))
        .filter((k): k is NonNullable<typeof k> => Boolean(k));
      if (!erbij.length) return g;
      const keuzes = [...g.keuzes];
      for (const k of erbij) {
        // De kruisvoet vóór de draaivoet, de rest achteraan.
        const voor = k.code === 'kruis' ? keuzes.findIndex((x) => x.code === 'draaivoet') : -1;
        keuzes.splice(voor < 0 ? keuzes.length : voor, 0, structuredClone(k));
      }
      return { ...g, keuzes };
    }),
  };
}

function startCatalogus(): { catalogus: OntwerpCatalogus; modellen: ModelDefinitie[] } {
  try {
    const c = JSON.parse(lees(SLEUTEL_CATALOGUS) ?? 'null') as OntwerpCatalogus | null;
    const m = JSON.parse(lees(SLEUTEL_MODELLEN) ?? '[]') as ModelDefinitie[];
    const catalogus = c && Array.isArray(c.typen) ? metSmalleArm(metNieuwVan1111(metNieuweKuipvormen(metDieperEindelement(metNieuweChaise(c))))) : structuredClone(zetelCatalogus);
    const modellen = Array.isArray(m) ? m : [];
    if (controleerCatalogus(catalogus, [...zetelModellen, ...modellen]).length === 0) return { catalogus, modellen };
  } catch {
    /* ongeldige opslag: standaard gebruiken */
  }
  return { catalogus: structuredClone(zetelCatalogus), modellen: [] };
}
const start = startCatalogus();
let catalogus: OntwerpCatalogus = start.catalogus;
let eigenModellen: ModelDefinitie[] = start.modellen;

export const getCatalogus = () => catalogus;
export const getEigenModellen = () => eigenModellen;
/**
 * Proefmodellen met een echt 3D-bestand: alleen als dat bestand in deze versie zit (de versie in de huisstijl van de
 * klant heeft het niet) en het model past in de huidige catalogus.
 */
const proefModellenNu = () => {
  const bestanden = (window as unknown as { __MODELLEN3D?: Record<string, string> }).__MODELLEN3D ?? {};
  return proefModellen.filter((m) => (!m.echt3d || m.echt3d.bestand in bestanden) && controleerCatalogus(catalogus, [m]).length === 0);
};
/** Alle modellen: de collectie, de proefmodellen en de zelf bewaarde modellen. */
export const getModellen = () => [...zetelModellen, ...proefModellenNu(), ...eigenModellen];
export function setCatalogus(nieuw: OntwerpCatalogus, modellen: ModelDefinitie[] = eigenModellen) {
  catalogus = nieuw;
  eigenModellen = modellen;
  bewaar(SLEUTEL_CATALOGUS, JSON.stringify(nieuw));
  bewaar(SLEUTEL_MODELLEN, JSON.stringify(modellen));
  luisteraars.catalogus.forEach((f) => f());
}
export function herstelCatalogus() {
  bewaar(SLEUTEL_CATALOGUS, null);
  setCatalogus(structuredClone(zetelCatalogus), eigenModellen);
}

export const groepen = STOFGROEPEN;
export const getMaterialen = () => materialen;
export function setMaterialen(nieuw: Materiaal[]) {
  materialen = nieuw;
  bewaar(SLEUTEL_MATERIALEN, JSON.stringify(nieuw));
  luisteraars.materialen.forEach((f) => f());
}
export function herstelMaterialen() {
  bewaar(SLEUTEL_MATERIALEN, null);
  setMaterialen(structuredClone(standaardMaterialen));
}
export const getKorting = () => korting;
export function setKorting(k: number) {
  korting = k;
  luisteraars.korting.forEach((f) => f());
}
export function opWijziging(soort: keyof typeof luisteraars, f: () => void) {
  luisteraars[soort].add(f);
}

// ---------- kleine DOM-hulpjes ----------
export const $ = <T extends Element = HTMLElement>(sel: string, ouder: ParentNode = document) => ouder.querySelector(sel) as T;
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, tekst?: string) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (tekst !== undefined) e.textContent = tekst;
  return e;
}
export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}
export const eur = (x: number) => `€ ${x.toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const getal = (x: number, d = 2) => x.toLocaleString('nl-BE', { maximumFractionDigits: d });

/** Knop die pas bij een tweede klik uitvoert (in plaats van confirm(), dat in de viewer niet werkt). */
/**
 * Knop die een tweede klik vraagt voor hij iets onomkeerbaars doet. Met `nodig` alleen als het moet
 * (bv. pas bevestigen als er een ontwerp is dat vervangen wordt).
 */
export function bevestigKnop(knop: HTMLButtonElement, vraag: string | (() => string), actie: () => void, nodig: () => boolean = () => true) {
  const origineel = knop.textContent ?? '';
  let gewapend = false;
  let timer: number | undefined;
  knop.addEventListener('click', () => {
    if (!gewapend && !nodig()) {
      actie();
      return;
    }
    if (!gewapend) {
      gewapend = true;
      knop.textContent = typeof vraag === 'function' ? vraag() : vraag;
      knop.classList.add('bevestig');
      timer = window.setTimeout(() => {
        gewapend = false;
        knop.textContent = origineel;
        knop.classList.remove('bevestig');
      }, 4000);
      return;
    }
    window.clearTimeout(timer);
    gewapend = false;
    knop.textContent = origineel;
    knop.classList.remove('bevestig');
    actie();
  });
}

export async function kopieer(tekst: string, melding: HTMLElement) {
  try {
    await navigator.clipboard.writeText(tekst);
    melding.textContent = 'Gekopieerd.';
  } catch {
    melding.textContent = 'Kopiëren lukt niet in deze browser.';
  }
}
