/**
 * Bouwdemo: snelstart (wat, hoe groot, welke stijl) → plattegrond en 3D (ruimtes, ramen, deuren, inrichting) →
 * posities configureren → overzicht (zonder prijzen, met doorsturen).
 * Dezelfde motor als de zetelconfigurator; alles in één HTML-bestand.
 */
import { $, PRIJZEN, toonFout } from './hulp.js';
import { geefMee, startOfferte, toonOfferte } from './offerte-ui.js';
import { naWijziging, openRuimteMetMaten, startPlattegrond, toonPlan, toonWoning3D } from './plattegrond-ui.js';
import { herbereken, startPositie, toonPositie, toonPositie3D } from './positie-ui.js';
import { startSnelstart, toonSnelstart } from './snelstart-ui.js';
import { startWerf, toonWerf } from './werf-ui.js';
import { startProjecten, toonProjecten } from './projecten-ui.js';
import { startVarianten, toonVarianten } from './varianten-ui.js';
import { startWerken } from './werken-ui.js';
import { startKlantweergave } from './klantweergave.js';
import { laatstBewaard, opslagProbleem, opWijziging, toestand } from './staat.js';
import { beginScherm } from '../../core/src/projecten.js';
import { isVastModel } from '../../core/voorbeelden/vastemodellen.js';

window.addEventListener('error', (e) => {
  // "Script error." zonder details komt van een script van een ander domein (bv. een browserextensie of de
  // omgeving waarin de pagina getoond wordt), niet van deze pagina zelf: niet tonen, wel noteren in de console.
  if (!e.error && /^Script error\.?$/i.test(e.message ?? '')) { console.warn('Fout van buiten deze pagina genegeerd:', e.message); return; }
  // Onschuldige browserwaarschuwing bij het herschalen van een vak (geen echte fout).
  if (/ResizeObserver loop/i.test(e.message ?? '')) return;
  toonFout('Fout', e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => toonFout('Fout', e.reason));

type Weergave = 'start' | 'projecten' | 'plan' | 'offerte' | 'positie' | 'werf' | 'varianten';
const WEERGAVEN: Weergave[] = ['start', 'projecten', 'plan', 'offerte', 'positie', 'werf', 'varianten'];
let actief: Weergave = 'plan';

/**
 * Toont een scherm. Doorloop B15 (16/11): elk ander scherm komt in de geschiedenis van de browser (`push`), zodat de
 * terugknop (of terugvegen op een tablet) naar het vorige scherm gaat in plaats van de app te verlaten. Hetzelfde scherm
 * opnieuw tonen vervangt alleen het adres; `geen` = de browser ging zelf terug of vooruit.
 */
function toon(w: Weergave, opties: { positie?: string; opening?: string } = {}, geschiedenis: 'push' | 'vervang' | 'geen' = 'push') {
  // Een project zonder woning heeft geen plattegrond: dan de ramenlijst (offerte).
  if (w === 'plan' && toestand().meta.zonderWoning) w = 'offerte';
  // De werf staat niet meer in het menu zolang er geen prijzen getoond worden (inmeting en meerwerk gaan over bedragen).
  if (w === 'werf' && !PRIJZEN) w = 'offerte';
  actief = w;
  for (const v of ['start', 'projecten', 'plan', 'offerte', 'positie', 'werf', 'varianten'] as const) $(`#view-${v}`).hidden = v !== w;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-weergave]')) b.setAttribute('aria-pressed', String(b.dataset.weergave === w));
  document.body.classList.toggle('zonder-woning', !!toestand().meta.zonderWoning);
  if (w === 'plan') toonPlan(opties.opening);
  if (w === 'offerte') toonOfferte({ nieuwBeeld: true });
  if (w === 'positie') toonPositie(opties.positie);
  if (w === 'werf') toonWerf();
  if (w === 'projecten') toonProjecten();
  if (w === 'start') toonSnelstart();
  if (w === 'varianten') toonVarianten();
  kop();
  const adres = `#${w}${opties.positie ? `/${opties.positie}` : ''}`;
  try {
    if (geschiedenis === 'push' && location.hash && location.hash !== adres) history.pushState(null, '', adres);
    else if (geschiedenis !== 'geen') history.replaceState(null, '', adres);
  } catch {
    /* bv. Safari met file://, of een afgeschermde weergave */
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
  /** De woning in 3D (na de snelstart of een aanbouw die als ruimte in de plattegrond komt). */
  naarWoning3D: () => { toon('plan'); toonWoning3D(); },
  /** De configurator met de 3D in beeld (na de snelstart). */
  naarPositie3D: (id: string) => { toon('positie', { positie: id }); toonPositie3D(); },
  /** Varianten van dit ontwerp in 3D naast elkaar. */
  naarVarianten: () => toon('varianten'),
  /**
   * Een project dat net geopend werd (Projecten, een bestand): een carport, tuinhuis, loods, staalwerk of aanbouw zonder
   * ruimtes in de configurator met de 3D, zoals na de snelstart (doorloop B14); al de rest in de plattegrond.
   */
  naarProject: () => {
    const t = toestand();
    const b = beginScherm({ zonderWoning: t.meta.zonderWoning, ruimtes: t.plan.ruimtes.length, posities: t.posities.map((p) => ({ id: p.id, los: p.model === 'AANBOUW' || isVastModel(p.model) })) });
    if (b.scherm === 'positie') nav.naarPositie3D(b.id);
    else toon('plan');
  },
  geefMee,
  /** De plattegrond met het paneel Ruimte met maten (na de snelstart: een aanbouw met gemeten maten). */
  naarMaten: (maten: { breedte: number; diepte: number }) => { toon('plan'); openRuimteMetMaten({ maten, plaats: 'tegen' }); },
};

/** Projectnaam en bewaarstatus in de kop. */
function kop() {
  const t = toestand();
  $('#hd-project').textContent = t.meta.project || 'Naamloos project';
  document.body.classList.toggle('zonder-woning', !!t.meta.zonderWoning);
  // Zonder woning: 1 Ramenlijst, 2 Configurator, 3 Werf.
  const werfNr = document.querySelector('.nav [data-weergave="werf"] .nr');
  if (werfNr) werfNr.textContent = t.meta.zonderWoning ? '3 · ' : '4 · ';
  $('#hd-bewaard').textContent = opslagProbleem || (laatstBewaard ? `automatisch bewaard om ${laatstBewaard}` : 'automatisch bewaard in deze browser');
  $('#hd-bewaard').classList.toggle('fout', !!opslagProbleem);
}
veilig('Plattegrond', () => startPlattegrond(nav));
veilig('Offerte', () => startOfferte(nav));
veilig('Positie', () => startPositie(nav));
veilig('Werf', () => startWerf(nav));
veilig('Projecten', () => startProjecten(nav));
veilig('Snelstart', () => startSnelstart(nav));
veilig('Varianten', () => startVarianten(nav));
veilig('Werken', () => startWerken(nav));
veilig('Klantweergave', () => startKlantweergave());

opWijziging(() => veilig('Bijwerken', () => {
  if (actief === 'plan') naWijziging();
  if (actief === 'offerte') toonOfferte();
  if (actief === 'positie') herbereken();
  if (actief === 'werf') toonWerf();
  if (actief === 'projecten') toonProjecten();
  $('#nav-aantal').textContent = String(toestand().posities.length);
  kop();
}));

// Prijzen tonen of niet (hulp.ts): de delen met een bedrag dragen de klasse prijsdeel.
document.body.classList.toggle('met-prijzen', PRIJZEN);

/**
 * Klantweergave: scherm tonen aan de klant. Bewaard voor dit venster (sessionStorage): een keer herladen bij de klant
 * toont niets intern, maar wie de app (of een nieuwe testversie) opnieuw opent, begint met het gereedschap. Vroeger stond
 * de keuze in localStorage; Jonas opende op 17/11 een nieuwe testversie die nog in de klantweergave stond, zonder
 * gereedschap en zonder slepen, en dacht dat er van alles kapot was. Daarom ook: de knop zegt wat hij doet
 * (*Terug naar ontwerpen*) zolang de klantweergave aan staat.
 */
const KLANT_SLEUTEL = 'bouw-demo.klantweergave';
function toonKlantknop(aan: boolean) {
  const knop = $('#klantweergave');
  knop.setAttribute('aria-pressed', String(aan));
  knop.textContent = aan ? 'Terug naar ontwerpen' : 'Klantweergave';
  knop.title = aan
    ? 'De klantweergave staat aan: geen gereedschap, niets te slepen. Tik om verder te ontwerpen.'
    : 'Scherm tonen aan de klant: zonder technische details';
}
function zetKlantweergave(aan: boolean) {
  document.body.classList.toggle('klantmodus', aan);
  toonKlantknop(aan);
  try { sessionStorage.setItem(KLANT_SLEUTEL, aan ? '1' : '0'); } catch { /* niets */ }
  if (aan && actief === 'werf') toon('offerte');
  else toon(actief, {}, 'vervang');
}
$('#klantweergave').addEventListener('click', () => zetKlantweergave(!document.body.classList.contains('klantmodus')));
try { localStorage.removeItem(KLANT_SLEUTEL); } catch { /* niets */ }
try { if (sessionStorage.getItem(KLANT_SLEUTEL) === '1') document.body.classList.add('klantmodus'); } catch { /* niets */ }
toonKlantknop(document.body.classList.contains('klantmodus'));

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-weergave]')) {
  b.addEventListener('click', () => veilig('Navigatie', () => toon(b.dataset.weergave as Weergave)));
}
$('#nav-aantal').textContent = String(toestand().posities.length);
/** Het scherm uit het adres (#offerte, #positie/<id> …). */
function uitAdres(): [Weergave, { positie?: string }] {
  const [w, id] = location.hash.slice(1).split('/');
  return [WEERGAVEN.includes(w as Weergave) ? (w as Weergave) : 'plan', { positie: id || undefined }];
}
// Terug en vooruit in de browser: het scherm van dat adres, zonder iets aan de geschiedenis toe te voegen.
window.addEventListener('popstate', () => veilig('Terug', () => toon(...uitAdres(), 'geen')));
veilig('Opstarten', () => toon(...uitAdres(), 'vervang'));
