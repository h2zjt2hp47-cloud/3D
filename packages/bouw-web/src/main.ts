/**
 * Bouwdemo: plattegrond (ruimtes, ramen, deuren, inrichting) → posities configureren → offerte.
 * Dezelfde motor als de zetelconfigurator; alles in één HTML-bestand.
 */
import { $, toonFout } from './hulp.js';
import { startOfferte, toonOfferte } from './offerte-ui.js';
import { naWijziging, startPlattegrond, toonPlan } from './plattegrond-ui.js';
import { herbereken, startPositie, toonPositie } from './positie-ui.js';
import { startWerf, toonWerf } from './werf-ui.js';
import { startProjecten, toonProjecten } from './projecten-ui.js';
import { laatstBewaard, opslagProbleem, opWijziging, toestand } from './staat.js';

window.addEventListener('error', (e) => toonFout('Fout', e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => toonFout('Fout', e.reason));

type Weergave = 'projecten' | 'plan' | 'offerte' | 'positie' | 'werf';
let actief: Weergave = 'plan';

function toon(w: Weergave, opties: { positie?: string; opening?: string } = {}) {
  actief = w;
  for (const v of ['projecten', 'plan', 'offerte', 'positie', 'werf'] as const) $(`#view-${v}`).hidden = v !== w;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-weergave]')) b.setAttribute('aria-pressed', String(b.dataset.weergave === w));
  if (w === 'plan') toonPlan(opties.opening);
  if (w === 'offerte') toonOfferte();
  if (w === 'positie') toonPositie(opties.positie);
  if (w === 'werf') toonWerf();
  if (w === 'projecten') toonProjecten();
  kop();
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
  naarWerf: () => toon('werf'),
  naarProjecten: () => toon('projecten'),
};

/** Projectnaam en bewaarstatus in de kop. */
function kop() {
  const t = toestand();
  $('#hd-project').textContent = t.meta.project || 'Naamloos project';
  $('#hd-bewaard').textContent = opslagProbleem || (laatstBewaard ? `automatisch bewaard om ${laatstBewaard}` : 'automatisch bewaard in deze browser');
  $('#hd-bewaard').classList.toggle('fout', !!opslagProbleem);
}
veilig('Plattegrond', () => startPlattegrond(nav));
veilig('Offerte', () => startOfferte(nav));
veilig('Positie', () => startPositie(nav));
veilig('Werf', () => startWerf(nav));
veilig('Projecten', () => startProjecten(nav));

opWijziging(() => veilig('Bijwerken', () => {
  if (actief === 'plan') naWijziging();
  if (actief === 'offerte') toonOfferte();
  if (actief === 'positie') herbereken();
  if (actief === 'werf') toonWerf();
  if (actief === 'projecten') toonProjecten();
  $('#nav-aantal').textContent = String(toestand().posities.length);
  kop();
}));

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-weergave]')) {
  b.addEventListener('click', () => veilig('Navigatie', () => toon(b.dataset.weergave as Weergave)));
}
$('#nav-aantal').textContent = String(toestand().posities.length);
const [start, id] = location.hash.slice(1).split('/');
veilig('Opstarten', () => toon((['projecten', 'plan', 'offerte', 'positie', 'werf'] as Weergave[]).includes(start as Weergave) ? (start as Weergave) : 'plan', { positie: id }));
