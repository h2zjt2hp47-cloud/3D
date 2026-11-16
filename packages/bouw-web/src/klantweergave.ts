/**
 * Klantweergave (doorloop B10 en B27, 16/11): het scherm dat de verkoper aan de klant toont, belooft "zonder technische
 * details". Ze toonde toch nog de constructie, de hoeveelheden voor de aannemer, invulvelden, knoppen die iets wijzigen,
 * de namen van andere klanten en het gereedschap van de plattegrond.
 *
 * Gekozen: dezelfde schermen, maar alleen om te kijken, zoals het bestand voor de klant (idee B27). Het meeste doet de
 * opmaak (index.html, het blok "herstel uit de doorloop, deel B"): een kaart in het overzicht staat er alleen als ze
 * `voor-klant` is, wat `intern` is verdwijnt, wat `alleen-klantweergave` is komt erbij, en de tekening van de plattegrond
 * en de gevels vangt geen tik. Hier alleen de toetsen: in de klantweergave wijzigt geen sneltoets het ontwerp (Delete,
 * Ctrl+Z, de pijltjes en de letters van het gereedschap in de plattegrond). Typen in een veld en de 3D draaien met de
 * pijltjes blijven werken; Escape ook (groot scherm sluiten).
 */
import { klantweergave } from './hulp.js';

/** Toetsen van de 3D zelf: draaien en zoomen (zie drie-d.ts). */
const KIJKTOETSEN = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_', '0']);

export function startKlantweergave() {
  window.addEventListener('keydown', (ev) => {
    if (!klantweergave() || ev.key === 'Escape') return;
    const doel = ev.target as HTMLElement | null;
    if (doel?.closest?.('input, select, textarea')) return;
    if (doel?.closest?.('.drie-d') && KIJKTOETSEN.has(ev.key) && !ev.ctrlKey && !ev.metaKey) return;
    // Vóór de schermen het zien (die luisteren op document): de toets doet niets in de app, de browser scrolt nog wel.
    ev.stopPropagation();
  }, true);
}
