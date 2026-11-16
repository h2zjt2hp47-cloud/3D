/**
 * Ongedaan maken in het overzicht en de ramenlijst (doorloop B8, 16/11): *Verwijderen* was daar één tik zonder weg terug,
 * en de melding na *Maatlijst plakken* beloofde Ctrl+Z, wat daar niets deed. Nu staat na zo'n stap onderaan het scherm een
 * balk met wat er gebeurde en de knop *Ongedaan maken* (ook op een tablet, waar geen Ctrl is), en werkt Ctrl+Z (⌘Z) op
 * dat scherm. De balk verdwijnt bij de volgende andere wijziging. Gebruikt de gewone geschiedenis van `staat.ts`.
 */
import { $ } from './hulp.js';
import { kanOngedaan, ongedaan, opWijziging } from './staat.js';

/** De bron van een wijziging die de balk toont (zie `wijzig`); een wijziging met een andere bron haalt de balk weg. */
export const BRON_TERUG = 'verwijderen';

let tekst = '';

function zet() {
  const balk = $('#o-terug');
  balk.hidden = !tekst || !kanOngedaan();
  $('#o-terug-tekst').textContent = tekst;
}

/** Toont de balk met wat er net gebeurde (na de wijziging met bron `BRON_TERUG`). */
export function toonTerug(wat: string) {
  tekst = wat;
  zet();
}

function terug() {
  tekst = '';
  ongedaan();
  zet();
}

export function startTerug() {
  $('#o-terug-knop').addEventListener('click', terug);
  opWijziging((bron) => {
    if (bron === BRON_TERUG) return;
    tekst = '';
    zet();
  });
  document.addEventListener('keydown', (ev) => {
    if ($('#view-offerte').hidden) return;
    if ((ev.target as HTMLElement).closest('input, select, textarea')) return;
    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === 'z') {
      ev.preventDefault();
      if (kanOngedaan()) terug();
    }
  });
}
