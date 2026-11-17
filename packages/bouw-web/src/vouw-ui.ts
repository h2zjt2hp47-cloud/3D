/**
 * Kaarten die dichtklappen tot hun kop (ronde 16, 17/11/2026). Jonas: *"graag ook alle mogelijkheden mooi groeperen in de
 * menu's zodat dit duidelijk is"*. Naast de plattegrond staan rechts veel kaarten onder elkaar (Dak, Binnenafwerking,
 * Controles, Ruimtes); op een tablet staand allemaal onder de tekening. Met één tik op de kop klapt een kaart dicht (of
 * weer open), zodat wie ze niet nodig heeft, minder hoeft te scrollen.
 *
 * Alleen wat open of dicht staat, geen functie: standaard staat alles open (geen tik extra voor wat er al was), en de
 * keuze hoort bij het kijken, zoals de kwaliteit van de 3D (bewaard in de browser, niet in het project). De kaarten tekenen
 * hun inhoud zelf opnieuw na elke wijziging; de knop in de kop komt er telkens opnieuw bij (`MutationObserver`).
 */
import { el } from './hulp.js';

const SLEUTEL = 'bouw-demo.kaarten-dicht';
let dicht: Set<string> | undefined;

function leesDicht(): Set<string> {
  if (dicht) return dicht;
  dicht = new Set();
  try {
    const w = JSON.parse(localStorage.getItem(SLEUTEL) ?? '[]');
    if (Array.isArray(w)) for (const x of w) if (typeof x === 'string') dicht.add(x);
  } catch { /* geen opslag */ }
  return dicht;
}

function bewaarDicht() {
  try { localStorage.setItem(SLEUTEL, JSON.stringify([...leesDicht()])); } catch { /* geen opslag */ }
}

/** De kop van de kaart: een `.kaartkop`, of anders de eerste kop (h2, h3) die er rechtstreeks in staat. */
function kopVan(kaart: HTMLElement): HTMLElement | null {
  for (const k of kaart.children) if (k.classList.contains('kaartkop') || k.tagName === 'H2' || k.tagName === 'H3') return k as HTMLElement;
  return null;
}

/** Zet de knop in de kop (opnieuw, na een nieuwe inhoud) en de stand van de kaart. */
function zetKnop(kaart: HTMLElement, naam: string, titel: string) {
  const isDicht = leesDicht().has(naam);
  kaart.classList.toggle('dicht', isDicht);
  const kop = kopVan(kaart);
  if (!kop) return;
  kop.classList.add('vouwkop');
  let knop = kop.querySelector<HTMLButtonElement>(':scope > .vouwknop');
  if (!knop) {
    knop = el('button', { type: 'button', class: 'vouwknop', 'data-vouw': naam }) as HTMLButtonElement;
    knop.append(el('span', { class: 'vouwpijl', 'aria-hidden': 'true' }));
    knop.addEventListener('click', (ev) => { ev.stopPropagation(); wissel(kaart, naam, titel); });
    kop.append(knop);
  }
  knop.setAttribute('aria-expanded', String(!isDicht));
  knop.setAttribute('aria-label', `${titel} ${isDicht ? 'openklappen' : 'dichtklappen'}`);
  knop.title = isDicht ? 'Openklappen' : 'Dichtklappen';
}

function wissel(kaart: HTMLElement, naam: string, titel: string) {
  const d = leesDicht();
  if (d.has(naam)) d.delete(naam); else d.add(naam);
  bewaarDicht();
  zetKnop(kaart, naam, titel);
}

/**
 * Maakt een kaart dichtklapbaar: een knop met een pijltje rechts in de kop, en een tik op de kop zelf (niet op een knop of
 * veld erin) doet hetzelfde. `naam` is de sleutel van de keuze, `titel` staat in de uitleg van de knop.
 */
export function vouwbaar(kaart: HTMLElement | null, naam: string, titel: string) {
  if (!kaart) return;
  kaart.classList.add('vouwbaar');
  zetKnop(kaart, naam, titel);
  new MutationObserver(() => {
    const kop = kopVan(kaart);
    if (kop && !kop.querySelector(':scope > .vouwknop')) zetKnop(kaart, naam, titel);
  }).observe(kaart, { childList: true });
  kaart.addEventListener('click', (ev) => {
    const doel = ev.target as Element;
    const kop = kopVan(kaart);
    if (!kop || !kop.contains(doel) || doel.closest('button, a, input, select, label, summary')) return;
    wissel(kaart, naam, titel);
  });
}
