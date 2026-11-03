/**
 * Klikbare demo van de configurator: vier weergaven (sofa, vrij ontwerp, kast, materialen).
 * Alle berekeningen gebeuren met dezelfde motor als op de server (packages/core).
 */
import { kiesProduct, startConfigurator } from './configurator.js';
import { startMaterialen } from './materialen-ui.js';
import { modelOntwerp, startModellen } from './modellen-ui.js';
import { startCatalogusEditor } from './catalogus-ui.js';
import { huidigOntwerp, kiesWeergave, laadInOntwerper, startOntwerper, toonOfferte } from './ontwerper.js';
import { $, bewaar, getKorting, laad, setKorting } from './staat.js';

const weergaven = ['modellen', 'ontwerp', 'offerte', 'sofa', 'kast', 'materialen', 'catalogus'] as const;
type Weergave = (typeof weergaven)[number];
/** Beheer = de stoffen (materialen) en de catalogus, onder één knop met tabbladen. */
const BEHEER: Weergave[] = ['materialen', 'catalogus'];
let laatsteBeheer: Weergave = 'materialen';
const TITELS: Record<Weergave, string> = {
  modellen: 'Modellen', ontwerp: 'Zetel ontwerpen', offerte: 'Offerte', sofa: 'Sofa op maat', kast: 'Kast op maat', materialen: 'Beheer', catalogus: 'Beheer',
};

function toon(w: Weergave) {
  document.querySelectorAll<HTMLButtonElement>('[data-weergave]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.weergave === w || (b.dataset.weergave === 'beheer' && BEHEER.includes(w)))),
  );
  $('#view-config').hidden = !(w === 'sofa' || w === 'kast');
  $('#view-ontwerp').hidden = w !== 'ontwerp';
  $('#view-offerte').hidden = w !== 'offerte';
  $('#view-materialen').hidden = w !== 'materialen';
  $('#view-modellen').hidden = w !== 'modellen';
  $('#view-catalogus').hidden = w !== 'catalogus';
  $('#beheer-tabs').hidden = !BEHEER.includes(w);
  if (BEHEER.includes(w)) {
    laatsteBeheer = w;
    $('[data-beheer="stoffen"]').setAttribute('aria-pressed', String(w === 'materialen'));
    if (w === 'materialen') document.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  }
  if (w === 'sofa' || w === 'kast') kiesProduct(w, true);
  if (w === 'offerte') toonOfferte();
  // Sofa en kast zetten zelf hun productnaam (kiesProduct); de andere weergaven hun vaste titel.
  if (w !== 'sofa' && w !== 'kast') $('#productnaam').textContent = TITELS[w];
  // Rechtstreeks naar #catalogus (oude link): het eerste tabblad aanduiden als er nog geen gekozen is.
  if (w === 'catalogus' && !document.querySelector('[data-cat][aria-pressed="true"]')) $<HTMLButtonElement>('[data-cat="elementen"]').click();
  try {
    // Safari staat dit niet toe op een lokaal bestand (file://); dan slaan we het over.
    if (location.hash.slice(1) !== w) history.replaceState(null, '', `#${w}`);
  } catch {
    /* geen probleem */
  }
}

const SLEUTEL_KLANTWEERGAVE = 'configurator-demo.klantweergave';

function startKlant() {
  const korting = $<HTMLInputElement>('#korting');
  const pas = () => {
    const inrichter = $<HTMLInputElement>('#klant-inrichter').checked;
    korting.disabled = !inrichter;
    // Het kortingsveld alleen bij een interieurinrichter: een particulier zag "korting 20 %" staan zonder die te krijgen.
    $('#korting-veld').hidden = !inrichter;
    const k = inrichter ? Math.min(100, Math.max(0, Number(korting.value) || 0)) : 0;
    if (k !== getKorting()) setKorting(k);
  };
  document.querySelectorAll<HTMLInputElement>('input[name="klant"]').forEach((r) => r.addEventListener('change', pas));
  korting.addEventListener('input', pas);
  pas();

  // Klantweergave: het scherm tonen aan de klant, zonder kostprijs, marge, stuklijst en de beheerschermen.
  const knop = $<HTMLButtonElement>('#klantweergave');
  const zet = (aan: boolean) => {
    document.body.classList.toggle('klantmodus', aan);
    knop.setAttribute('aria-pressed', String(aan));
    bewaar(SLEUTEL_KLANTWEERGAVE, aan ? '1' : null);
  };
  knop.addEventListener('click', () => {
    zet(!document.body.classList.contains('klantmodus'));
    const w = location.hash.slice(1);
    if (document.body.classList.contains('klantmodus') && (BEHEER.includes(w as Weergave) || w === 'beheer')) toon('modellen');
  });
  zet(laad(SLEUTEL_KLANTWEERGAVE) === '1');
}

function toonFout(waar: string, fout: unknown) {
  const vak = document.getElementById('foutmelding');
  if (!vak) return;
  const tekst = `${waar}: ${fout instanceof Error ? fout.message : String(fout)}`;
  console.error(tekst, fout);
  // Dezelfde melding maar één keer, en een knop om de melding weg te klikken.
  if ([...vak.querySelectorAll('p')].some((p) => p.textContent === tekst)) return;
  if (!vak.querySelector('button')) {
    const sluit = document.createElement('button');
    sluit.type = 'button';
    sluit.textContent = 'Sluiten';
    sluit.setAttribute('aria-label', 'Melding sluiten');
    sluit.addEventListener('click', () => { vak.hidden = true; for (const p of vak.querySelectorAll('p')) p.remove(); });
    vak.append(sluit);
  }
  vak.hidden = false;
  const regel = document.createElement('p');
  regel.textContent = tekst;
  vak.insertBefore(regel, vak.querySelector('button'));
}
window.addEventListener('error', (e) => {
  // "Script error." zonder details komt van een script van een ander domein (bv. een browserextensie of de
  // omgeving waarin de pagina getoond wordt), niet van deze pagina zelf: niet tonen, wel noteren in de console.
  if (!e.error && /^Script error\.?$/i.test(e.message ?? '')) { console.warn('Fout van buiten deze pagina genegeerd:', e.message); return; }
  // Onschuldige browserwaarschuwing bij het herschalen van een vak (geen echte fout).
  if (/ResizeObserver loop/i.test(e.message ?? '')) return;
  toonFout('Fout', e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => toonFout('Fout', e.reason));

/** Start elk onderdeel apart: een fout in één onderdeel houdt de rest niet tegen. */
function veilig(waar: string, f: () => void) {
  try {
    f();
  } catch (fout) {
    toonFout(waar, fout);
  }
}

veilig('Klantkeuze', startKlant);
veilig('Sofa/kast op maat', startConfigurator);
veilig('Vrij ontwerp', startOntwerper);
veilig('Materialen', startMaterialen);
function openModel(code: string) {
  const o = modelOntwerp(code);
  if (!o) return;
  toon('ontwerp');
  laadInOntwerper(o);
  kiesWeergave('3d');
  window.scrollTo(0, 0);
}
veilig('Modellen', () => startModellen(openModel));
veilig('Catalogus', () => startCatalogusEditor({ huidigOntwerp, openModel }));
/** Een adres (#…) naar een weergave; #beheer opent het laatst gebruikte beheerscherm. */
const naarWeergave = (code: string): Weergave | null => (code === 'beheer' ? laatsteBeheer : weergaven.includes(code as Weergave) ? (code as Weergave) : null);
document.querySelectorAll<HTMLButtonElement>('[data-weergave]').forEach((b) =>
  b.addEventListener('click', () => veilig('Navigatie', () => toon(naarWeergave(b.dataset.weergave ?? '') ?? 'modellen'))),
);
// Tabbladen van Beheer: Stoffen is de materialenlijst, de andere zijn de catalogus (zie catalogus-ui.ts).
$('[data-beheer="stoffen"]').addEventListener('click', () => veilig('Navigatie', () => toon('materialen')));
document.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((b) => b.addEventListener('click', () => veilig('Navigatie', () => toon('catalogus'))));
const intern = (w: string) => document.body.classList.contains('klantmodus') && (BEHEER.includes(w as Weergave) || w === 'beheer');
const start = location.hash.slice(1);
veilig('Opstarten', () => toon(naarWeergave(start) && !intern(start) ? naarWeergave(start)! : 'modellen'));
window.addEventListener('hashchange', () => {
  const w = naarWeergave(location.hash.slice(1));
  if (w) toon(intern(w) ? 'modellen' : w);
});
