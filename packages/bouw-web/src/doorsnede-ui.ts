/**
 * De doorsnede van de woning (ronde 6): een tab *Doorsnede* naast Plattegrond, Gevels en 3D. De verkoper kiest de
 * richting (langs de voorgevel of dwars) en schuift de snede door de woning; de tekening komt uit de motor
 * (`tekenDoorsnede`, core/src/doorsnede.ts) en uit dezelfde constructie als de 3D en de meetstaat. Op de tekening staan
 * alleen de namen; de lagen staan in het overzicht.
 */
import { CONSTRUCTIE_VOORBEHOUD, snedeBereik, tekenDoorsnede, type SnedeRichting } from '../../core/src/index.js';
import { $, el, getal } from './hulp.js';
import { constructieCatalogus, huidigeConstructie } from './constructie-ui.js';
import { toestand } from './staat.js';

/** De keuze hoort bij het kijken, niet bij het project. `plaats` leeg = het midden van de grootste ruimte. */
let richting: SnedeRichting = 'dwars';
let plaats: number | undefined;

/** Maakt het vak van de doorsnede (één keer), onder de tekening. */
export function startDoorsnede() {
  const vak = el('div', { id: 'pl-doorsnede', hidden: '' });
  const balk = el('div', { class: 'doorsnedebalk' });
  const tabs = el('div', { class: 'tabs', role: 'group', 'aria-label': 'Richting van de snede' });
  for (const [r, label, uitleg] of [
    ['dwars', 'Dwars', 'Een snede evenwijdig met de zijgevels, gezien van links'],
    ['langs', 'Langs', 'Een snede evenwijdig met de voorgevel, gezien van voor'],
  ] as const) {
    const b = el('button', { type: 'button', 'data-snede': r, title: uitleg, 'aria-pressed': String(richting === r) }, label);
    b.addEventListener('click', () => { richting = r; plaats = undefined; toonDoorsnede(); });
    tabs.append(b);
  }
  const min = el('button', { type: 'button', class: 'tweede', 'data-snede-stap': '-', 'aria-label': 'Snede 20 cm terug' }, '−');
  const schuif = el('input', { type: 'range', id: 'pl-snede', step: '5', 'aria-label': 'Plaats van de snede' }) as HTMLInputElement;
  const plus = el('button', { type: 'button', class: 'tweede', 'data-snede-stap': '+', 'aria-label': 'Snede 20 cm verder' }, '+');
  const waarde = el('output', { id: 'pl-snede-waarde', for: 'pl-snede' });
  schuif.addEventListener('input', () => { plaats = Number(schuif.value); toonDoorsnede(); });
  min.addEventListener('click', () => { plaats = Number(schuif.value) - 20; toonDoorsnede(); });
  plus.addEventListener('click', () => { plaats = Number(schuif.value) + 20; toonDoorsnede(); });
  balk.append(tabs, min, schuif, plus, waarde);
  vak.append(balk, el('div', { id: 'pl-doorsnede-tekening', role: 'img', 'aria-label': 'Doorsnede van de woning' }), el('p', { class: 'klein voorbehoud' }, `${CONSTRUCTIE_VOORBEHOUD} De lagen van elke wand, vloer en dak staan in het overzicht, onder Constructie.`));
  $('#pl-3d-knoppen').after(vak);
}

/** Tekent de doorsnede opnieuw (na een wijziging of een andere snede), als ze getoond wordt. */
export function toonDoorsnede() {
  const vak = document.getElementById('pl-doorsnede');
  if (!vak || vak.hidden) return;
  const plan = toestand().plan;
  for (const b of vak.querySelectorAll<HTMLButtonElement>('[data-snede]')) b.setAttribute('aria-pressed', String(b.dataset.snede === richting));
  const bereik = snedeBereik(plan, richting);
  const p = Math.min(bereik.max - 5, Math.max(bereik.min + 5, plaats ?? bereik.midden));
  plaats = p;
  const schuif = $<HTMLInputElement>('#pl-snede');
  schuif.min = String(bereik.min + 5);
  schuif.max = String(bereik.max - 5);
  schuif.value = String(p);
  // In gewone woorden (doorloop A32): hoe ver van de linker- of de bovenkant van het gebouw de snede ligt.
  $('#pl-snede-waarde').textContent = `op ${getal((p - bereik.min) / 100, 2)} m van de ${richting === 'dwars' ? 'linkergevel' : 'gevel bovenaan het plan'}`;
  const tekening = $('#pl-doorsnede-tekening');
  if (!plan.ruimtes.length) { tekening.replaceChildren(el('p', { class: 'klein' }, 'Nog geen ruimtes in de plattegrond.')); return; }
  tekening.innerHTML = tekenDoorsnede(plan, constructieCatalogus, { richting, plaats: p }, { c: huidigeConstructie(), breedtePx: Math.max(600, tekening.clientWidth || 900) });
}
