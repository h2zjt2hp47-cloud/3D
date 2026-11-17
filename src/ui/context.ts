// Wat alle schermonderdelen delen: het spel, de selectie, de klok en de instellingen.
import { kaart } from '../kaart/kaart';
import type { Toestand } from '../spel/toestand';
import { Kaartbeeld, type Selectie } from './kaartbeeld';

export const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;

export interface Instellingen {
  /** klok stilzetten bij: */
  pauzeBijSlag: boolean;
  pauzeBijVerlies: boolean;
  pauzeBijOorlog: boolean;
  pauzeBijVorst: boolean;
  /** de klok vanzelf sneller als er voor jou niets gebeurt */
  sneller: boolean;
  tips: boolean;
}

const INSTELLINGEN = 'belgica-instellingen';

function laadInstellingen(): Instellingen {
  const standaard: Instellingen = { pauzeBijSlag: true, pauzeBijVerlies: true, pauzeBijOorlog: true, pauzeBijVorst: false, sneller: true, tips: true };
  try { return { ...standaard, ...JSON.parse(localStorage.getItem(INSTELLINGEN) ?? '{}') }; } catch { return standaard; }
}

export const ui = {
  t: null as Toestand | null,
  beeld: new Kaartbeeld($<HTMLCanvasElement>('#kaart'), kaart),
  sel: { legers: [], vak: null } as Selectie,
  snelheid: 0,
  laatsteSnelheid: 2,
  /** bezig met springen naar de volgende gebeurtenis */
  springen: false,
  vuil: true,
  instellingen: laadInstellingen(),
  /** tips die al getoond zijn */
  getoond: new Set<string>(),
};

export function bewaarInstellingen() {
  try { localStorage.setItem(INSTELLINGEN, JSON.stringify(ui.instellingen)); } catch { /* geen opslag */ }
}

export function vuil() { ui.vuil = true; }

/** tekst veilig in HTML zetten */
export function h(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export function getal(x: number, teken = false): string {
  const r = Math.round(x);
  const s = Math.abs(r).toLocaleString('nl-BE');
  return teken ? `${r >= 0 ? '+' : '−'}${s}` : `${r < 0 ? '−' : ''}${s}`;
}

/** een opbouw (basis + factoren = totaal) als HTML voor een uitlegballon */
export function opbouw(titel: string, regels: [string, number][], eenheid = ''): string {
  const totaal = regels.reduce((s, [, w]) => s + w, 0);
  return `<b>${h(titel)}</b><table>${regels.filter(([, w]) => Math.round(w) !== 0).map(([n, w]) => `<tr><td>${h(n)}</td><td class="r">${getal(w, true)}${eenheid}</td></tr>`).join('')}<tr class="som"><td>Totaal</td><td class="r">${getal(totaal, true)}${eenheid}</td></tr></table>`;
}

export function centreer(vak: number) {
  ui.beeld.camera.x = kaart.vakken[vak].midden[0];
  ui.beeld.camera.y = kaart.vakken[vak].midden[1];
}

let meldingKlok = 0;
export function melding(tekst: string) {
  const m = $('#melding');
  m.textContent = tekst;
  m.hidden = false;
  clearTimeout(meldingKlok);
  meldingKlok = window.setTimeout(() => (m.hidden = true), 3500);
}
