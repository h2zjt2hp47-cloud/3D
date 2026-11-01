/**
 * Bouwdemo: plattegrond (ruimtes, ramen, deuren, inrichting) → posities configureren → offerte.
 * Dezelfde motor als de zetelconfigurator; alles in één HTML-bestand.
 */
import { $, toonFout } from './hulp.js';
import { startOfferte, toonOfferte } from './offerte-ui.js';
import { naWijziging, startPlattegrond, toonPlan } from './plattegrond-ui.js';
import { herbereken, startPositie, toonPositie } from './positie-ui.js';
import { opWijziging, toestand } from './staat.js';

window.addEventListener('error', (e) => toonFout('Fout', e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => toonFout('Fout', e.reason));

type Weergave = 'plan' | 'offerte' | 'positie';
let actief: Weergave = 'plan';

function toon(w: Weergave, opties: { positie?: string; opening?: string } = {}) {
  actief = w;
  for (const v of ['plan', 'offerte', 'positie'] as const) $(`#view-${v}`).hidden = v !== w;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-weergave]')) b.setAttribute('aria-pressed', String(b.dataset.weergave === w));
  if (w === 'plan') toonPlan(opties.opening);
  if (w === 'offerte') toonOfferte();
  if (w === 'positie') toonPositie(opties.positie);
  try {
    history.replaceState(null, '', `#${w}${opties.positie ? `/${opties.positie}` : ''}`);
  } catch {
    /* bv. Safari met file:// */
  }
  window.scrollTo({ top: 0 });
}

function veilig(waar: string, f: () => void) {
  try {
    f();
  } catch (fout) {
    toonFout(waar, fout);
  }
}

const nav = {
  naarPositie: (id: string) => toon('positie', { positie: id }),
  naarPlan: (opening?: string) => toon('plan', { opening }),
  naarOfferte: () => toon('offerte'),
};
veilig('Plattegrond', () => startPlattegrond(nav));
veilig('Offerte', () => startOfferte(nav));
veilig('Positie', () => startPositie(nav));

opWijziging(() => veilig('Bijwerken', () => {
  if (actief === 'plan') naWijziging();
  if (actief === 'offerte') toonOfferte();
  if (actief === 'positie') herbereken();
  $('#nav-aantal').textContent = String(toestand().posities.length);
}));

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-weergave]')) {
  b.addEventListener('click', () => veilig('Navigatie', () => toon(b.dataset.weergave as Weergave)));
}
$('#nav-aantal').textContent = String(toestand().posities.length);
const [start, id] = location.hash.slice(1).split('/');
veilig('Opstarten', () => toon((['plan', 'offerte', 'positie'] as Weergave[]).includes(start as Weergave) ? (start as Weergave) : 'plan', { positie: id }));
