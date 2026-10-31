/**
 * Klikbare demo van de configurator: vier weergaven (sofa, vrij ontwerp, kast, materialen).
 * Alle berekeningen gebeuren met dezelfde motor als op de server (packages/core).
 */
import { kiesProduct, startConfigurator } from './configurator.js';
import { startMaterialen } from './materialen-ui.js';
import { startOntwerper } from './ontwerper.js';
import { $, getKorting, setKorting } from './staat.js';

const weergaven = ['sofa', 'ontwerp', 'kast', 'materialen'] as const;
type Weergave = (typeof weergaven)[number];

function toon(w: Weergave) {
  document.querySelectorAll<HTMLButtonElement>('[data-weergave]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.weergave === w)));
  $('#view-config').hidden = !(w === 'sofa' || w === 'kast');
  $('#view-ontwerp').hidden = w !== 'ontwerp';
  $('#view-materialen').hidden = w !== 'materialen';
  if (w === 'sofa' || w === 'kast') kiesProduct(w, true);
  if (w === 'ontwerp') $('#productnaam').textContent = 'Zetel vrij ontwerpen';
  if (w === 'materialen') $('#productnaam').textContent = 'Materialen';
  if (location.hash.slice(1) !== w) history.replaceState(null, '', `#${w}`);
}

function startKlant() {
  const korting = $<HTMLInputElement>('#korting');
  const pas = () => {
    const inrichter = $<HTMLInputElement>('#klant-inrichter').checked;
    korting.disabled = !inrichter;
    const k = inrichter ? Math.min(100, Math.max(0, Number(korting.value) || 0)) : 0;
    if (k !== getKorting()) setKorting(k);
  };
  document.querySelectorAll<HTMLInputElement>('input[name="klant"]').forEach((r) => r.addEventListener('change', pas));
  korting.addEventListener('input', pas);
}

startKlant();
startConfigurator();
startOntwerper();
startMaterialen();
document.querySelectorAll<HTMLButtonElement>('[data-weergave]').forEach((b) => b.addEventListener('click', () => toon(b.dataset.weergave as Weergave)));
const start = location.hash.slice(1) as Weergave;
toon(weergaven.includes(start) ? start : 'sofa');
window.addEventListener('hashchange', () => {
  const w = location.hash.slice(1) as Weergave;
  if (weergaven.includes(w)) toon(w);
});
