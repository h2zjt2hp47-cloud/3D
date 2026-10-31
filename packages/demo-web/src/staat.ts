/**
 * Gedeelde toestand van de demo: materialen en klantkorting.
 * Materialen en het laatste ontwerp worden in deze browser bewaard (localStorage),
 * zodat ze een herlaadbeurt overleven. Werkt de opslag niet, dan werkt alles gewoon zonder.
 */
import { leesMaterialen, type Materiaal } from '../../core/src/index.js';
import { standaardMaterialen, STOFGROEPEN } from '../../core/voorbeelden/sofa.js';

const SLEUTEL_MATERIALEN = 'configurator-demo.materialen.v1';

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

function startMaterialen(): Materiaal[] {
  const opgeslagen = lees(SLEUTEL_MATERIALEN);
  if (!opgeslagen) return structuredClone(standaardMaterialen);
  try {
    const { materialen } = leesMaterialen(opgeslagen, STOFGROEPEN);
    return materialen.length ? materialen : structuredClone(standaardMaterialen);
  } catch {
    return structuredClone(standaardMaterialen);
  }
}

let materialen: Materiaal[] = startMaterialen();
let korting = 0;
const luisteraars = { materialen: new Set<() => void>(), korting: new Set<() => void>() };

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
export function bevestigKnop(knop: HTMLButtonElement, vraag: string, actie: () => void) {
  const origineel = knop.textContent ?? '';
  let gewapend = false;
  let timer: number | undefined;
  knop.addEventListener('click', () => {
    if (!gewapend) {
      gewapend = true;
      knop.textContent = vraag;
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
