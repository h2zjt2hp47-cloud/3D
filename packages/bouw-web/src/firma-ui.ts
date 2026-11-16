/**
 * De firmanaam op wat de klant meekrijgt (doorloop B1 en B29, 16/11). Vroeger stond er "Uw bedrijf" bovenaan het bestand
 * voor de klant en het blad als niemand het veld *Uw firma* invulde: een verzonnen naam bij de klant. Nu:
 *   - is de firmanaam leeg, dan staat er geen firmanaam (`aannemerNaam()` geeft dan een lege tekst);
 *   - tikt de verkoper op *Meegeven aan de klant* of *Blad met beelden* met een lege firmanaam, dan vraagt een vakje vlak
 *     onder de knop de naam (één keer: ze blijft bewaard in deze browser, voor alle projecten). *Zonder firmanaam* gaat
 *     verder zonder, en vraagt het in deze sessie niet opnieuw.
 */
import { el } from './hulp.js';
import { aannemerNaam, zetAannemerNaam } from './meegeven.js';

/** In deze sessie gekozen: zonder firmanaam verder (dan niet bij elke tik opnieuw vragen). */
let zonderFirma = false;

/**
 * Voert `actie` uit. Is er nog geen firmanaam, dan eerst de vraag ernaar, in een vakje vlak onder de rij met de knop
 * (`id`: het vakje, één per scherm). Een tweede tik terwijl de vraag openstaat, doet niets. `naNaam`: na het bewaren
 * van een naam (bv. om het veld *Uw firma* en de voorvertoning bij te werken).
 */
export function metFirma(knop: HTMLElement, id: string, actie: () => void, naNaam?: () => void) {
  if (aannemerNaam() || zonderFirma) { actie(); return; }
  let vak = document.getElementById(id);
  if (vak && !vak.hidden) { vak.querySelector('input')?.focus(); return; }
  if (!vak) {
    vak = el('div', { id, class: 'firmavraag', role: 'group', 'aria-labelledby': `${id}-kop` });
    (knop.closest('.acties') ?? knop).after(vak);
  }
  const invoer = el('input', { type: 'text', id: `${id}-naam`, autocomplete: 'organization', placeholder: 'bv. Bouwbedrijf Janssens' }) as HTMLInputElement;
  const ok = el('button', { type: 'button', class: 'hoofdknop', 'data-firmavraag': 'ok' }, 'Bewaren en verder');
  const zonder = el('button', { type: 'button', class: 'tweede', 'data-firmavraag': 'zonder' }, 'Zonder firmanaam');
  const sluit = (verder: boolean) => {
    vak!.hidden = true;
    vak!.replaceChildren();
    if (verder) actie();
  };
  ok.addEventListener('click', () => {
    const naam = invoer.value.trim();
    if (!naam) { invoer.focus(); return; }
    zetAannemerNaam(naam);
    naNaam?.();
    sluit(true);
  });
  zonder.addEventListener('click', () => { zonderFirma = true; sluit(true); });
  invoer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); ok.click(); }
    if (e.key === 'Escape') sluit(false);
  });
  const kop = el('label', { id: `${id}-kop`, for: `${id}-naam` }, 'Welke firmanaam staat bovenaan het bestand en het blad?');
  const knoppen = el('div', { class: 'acties' });
  knoppen.append(ok, zonder);
  vak.replaceChildren(kop, invoer, knoppen, el('p', { class: 'klein' }, 'Eén keer invullen: de naam blijft bewaard in deze browser, voor alle projecten. Wijzigen kan bij Klant en project (Uw firma).'));
  vak.hidden = false;
  invoer.focus();
}
