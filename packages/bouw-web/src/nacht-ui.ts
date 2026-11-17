/**
 * Dag of nacht in de 3D van de woning (ronde 15, 17/11/2026). Jonas: *"ook bvb ledstrips en nachtweergave?"* Eén tik
 * rechtsboven op de 3D toont de woning bij avond: de lucht van een late avond, de ramen die warm oplichten, de
 * buitenlampen en de ledstrips. Wat licht geeft, zegt de motor (`Plan3DOpties.verlichting`, core/src/nacht.ts); hoe het
 * eruitziet, de kijker (`Viewer3D.nacht` in demo-web/src/drie-d.ts).
 *
 * De keuze hoort bij het kijken, niet bij het project (zoals de lichtinval): ze wordt niet bewaard en blijft staan zolang
 * de pagina open is. Alleen in *Afgewerkt*: de constructie en de techniek tonen altijd de dag.
 */
import { el } from './hulp.js';

let nacht = false;
let knoppen: HTMLElement | undefined;
let bijWissel: (aan: boolean) => void = () => {};

/** Staat de nacht aan (gekozen)? */
export const nachtGekozen = () => nacht;

/**
 * De knop *Dag / Nacht* (twee knoppen naast elkaar, `[data-pl-nacht="dag|nacht"]`), één keer gemaakt; `wissel` krijgt
 * de nieuwe keuze (de 3D zet dan de nacht aan of uit).
 */
export function dagNachtKnop(wissel: (aan: boolean) => void): HTMLElement {
  bijWissel = wissel;
  if (knoppen) return knoppen;
  knoppen = el('div', { id: 'pl-dagnacht', class: 'dagnacht', role: 'group', 'aria-label': 'Dag of nacht' });
  for (const [code, label, uitleg] of [
    ['dag', 'Dag', 'De woning overdag'],
    ['nacht', 'Nacht', 'De woning bij avond: de ramen lichten op, de buitenlampen en de ledstrips branden'],
  ] as const) {
    const b = el('button', { type: 'button', 'data-pl-nacht': code, 'aria-pressed': String((code === 'nacht') === nacht), title: uitleg });
    if (code === 'nacht') b.append(el('span', { class: 'maan', 'aria-hidden': 'true' }));
    b.append(label);
    b.addEventListener('click', () => zetNacht(code === 'nacht'));
    knoppen.append(b);
  }
  return knoppen;
}

/** Zet de keuze (en de knoppen), en geeft ze door. */
export function zetNacht(aan: boolean) {
  const anders = aan !== nacht;
  nacht = aan;
  for (const b of knoppen?.querySelectorAll<HTMLButtonElement>('[data-pl-nacht]') ?? []) b.setAttribute('aria-pressed', String((b.dataset.plNacht === 'nacht') === nacht));
  if (anders) bijWissel(nacht);
}

/** De knop tonen of verbergen (alleen in Afgewerkt). */
export function toonDagNacht(zichtbaar: boolean) {
  if (knoppen) knoppen.hidden = !zichtbaar;
}
