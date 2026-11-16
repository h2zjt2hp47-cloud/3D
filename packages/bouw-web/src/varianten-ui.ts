/**
 * Varianten naast elkaar (16/11): twee of drie ontwerpen van dezelfde woning in 3D naast elkaar, met hun naam en wat ze
 * anders maakt in gewone taal ("zadeldak met keramische dakpannen" tegenover "plat dak met grind, 2 lichtkoepels"), en per
 * variant of ze mee gaat in het bestand voor de klant.
 *
 * Samen draaien: de kijker heeft geen camera om van buiten te zetten (en dat blijft zo). Daarom ligt over elke 3D een
 * doorzichtig vlak dat de bewegingen van muis en vingers opvangt en ze aan alle kijkers tegelijk geeft, als gewone
 * aanwijzer- en wielgebeurtenissen: draaien en knijpen rekenen ze in beeldpunten, dus elke kijker draait evenveel.
 * Een kijker vangt de aanwijzer zelf (`setPointerCapture`); dat doet hier het vlak, op de kijkers staat het uit.
 */
import { gebouwMaatlijnen, type Scene3D, type Scene3DMetMaten } from '../../core/src/index.js';
import { maak3D, type Standpunt, type Viewer3D } from '../../demo-web/src/drie-d.js';
import { woningScene } from './doorsturen.js';
import { $, el } from './hulp.js';
import { familie, gaatMee, MAX_VARIANTEN, verschilVan, zetMee, type Variant } from './meegeven.js';
import { actiefProject, openProject } from './staat.js';

interface Vak { kaart: HTMLElement; houder: HTMLElement; vlak: HTMLElement; viewer?: Viewer3D | null }
const vakken: Vak[] = [];
let standpunt: Standpunt = 'schuin';
let toonMaten = false;
/** Welke varianten de verkoper koos om naast elkaar te zien (als er meer dan drie zijn). */
let gekozen: string[] = [];
let naarWoning3D: () => void = () => {};

/** De varianten die naast elkaar staan: de gekozen, anders de eerste drie, met het actieve project erbij. */
function getoond(leden: Variant[]): Variant[] {
  const id = actiefProject();
  const keuze = leden.filter((v) => gekozen.includes(v.id));
  if (keuze.length >= 2) return keuze.slice(0, MAX_VARIANTEN);
  const eerst = leden.slice(0, MAX_VARIANTEN);
  if (!eerst.some((v) => v.id === id) && leden.some((v) => v.id === id)) eerst[eerst.length - 1] = leden.find((v) => v.id === id)!;
  return eerst;
}

const canvasVan = (v: Vak) => v.houder.querySelector('canvas');

/** Geeft één gebeurtenis van het vlak door aan alle kijkers die in beeld staan. */
function geefDoor(maak: (canvas: HTMLCanvasElement) => Event) {
  for (const v of vakken) {
    if (v.kaart.hidden) continue;
    const c = canvasVan(v);
    if (!c) continue;
    // Het vlak vangt de aanwijzer al; een nagemaakte aanwijzer vangen kan niet (en zou de echte afpakken).
    if (!c.dataset.samen) { c.setPointerCapture = () => {}; c.releasePointerCapture = () => {}; c.dataset.samen = '1'; }
    c.dispatchEvent(maak(c));
  }
}

function maakVak(): Vak {
  const kaart = el('article', { class: 'variantkaart' });
  const samen = el('div', { class: 'samen' });
  const houder = el('div', { class: 'drie-d' });
  const vlak = el('div', { class: 'samen-vlak', 'aria-label': 'Draai of zoom: alle varianten draaien mee' });
  samen.append(houder, vlak);
  kaart.append(el('div', { class: 'kaartkop' }), samen, el('ul', { class: 'verschil' }), el('div', { class: 'mee' }), el('div', { class: 'knoppenrij' }));
  for (const soort of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const) {
    vlak.addEventListener(soort, (ev) => {
      if (soort === 'pointerdown') vlak.setPointerCapture(ev.pointerId);
      ev.preventDefault();
      geefDoor(() => new PointerEvent(soort, { pointerId: ev.pointerId, pointerType: ev.pointerType, isPrimary: ev.isPrimary, clientX: ev.clientX, clientY: ev.clientY, buttons: ev.buttons, button: ev.button, bubbles: true, cancelable: true }));
    });
  }
  vlak.addEventListener('wheel', (ev) => {
    // Zoals in elke kijker: gewoon scrollen scrolt de pagina, zoomen met Ctrl (⌘) + scrollen.
    if (!(ev.ctrlKey || ev.metaKey)) return;
    ev.preventDefault();
    geefDoor(() => new WheelEvent('wheel', { deltaY: ev.deltaY, deltaX: ev.deltaX, deltaMode: ev.deltaMode, ctrlKey: ev.ctrlKey, metaKey: ev.metaKey, clientX: ev.clientX, clientY: ev.clientY, bubbles: true, cancelable: true }));
  }, { passive: false });
  $('#vr-kaarten').append(kaart);
  return { kaart, houder, vlak };
}

function scene(v: Variant): Scene3DMetMaten {
  const s: Scene3D = woningScene(undefined, false, v.t);
  return toonMaten ? { ...s, maatlijnen: gebouwMaatlijnen(s) } : s;
}

/** Toont de varianten van het actieve project naast elkaar (opnieuw opgebouwd: een variant kan intussen gewijzigd zijn). */
export function toonVarianten() {
  const leden = familie().filter((v) => !v.t.meta.zonderWoning);
  const lijst = getoond(leden);
  const id = actiefProject();
  $('#vr-tekst').textContent = leden.length < 2 ? 'Nog geen varianten: maak er een met "Variant maken" onder de 3D.' : `${lijst.length} van ${leden.length} varianten · ${lijst[0]!.naam.replace(/ \(variant \d+\)$/, '')}`;
  // Meer dan drie varianten: kies welke naast elkaar staan.
  const keuze = $('#vr-keuze');
  keuze.hidden = leden.length <= MAX_VARIANTEN;
  keuze.replaceChildren(...leden.map((v) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(lijst.includes(v)) }, v.naam);
    b.addEventListener('click', () => {
      const nu = lijst.map((x) => x.id);
      gekozen = nu.includes(v.id) ? nu.filter((x) => x !== v.id) : [...nu, v.id].slice(-MAX_VARIANTEN);
      toonVarianten();
    });
    return b;
  }));
  const verschil = verschilVan(lijst);
  while (vakken.length < lijst.length) vakken.push(maakVak());
  for (const [i, vak] of vakken.entries()) {
    const v = lijst[i];
    vak.kaart.hidden = !v;
    if (!v) continue;
    vak.kaart.classList.toggle('actief', v.id === id);
    const [kop, , lijstVerschil, mee, knoppen] = [...vak.kaart.children] as HTMLElement[];
    kop!.replaceChildren(el('h3', { title: v.id === id ? 'Hier werk je nu in' : '' }, v.naam));
    lijstVerschil!.replaceChildren(...(lijst.length > 1 ? verschil[i] ?? [] : []).map((x) => el('li', {}, x.charAt(0).toUpperCase() + x.slice(1))));
    const vink = el('input', { type: 'checkbox' }) as HTMLInputElement;
    vink.checked = gaatMee(v.id);
    vink.addEventListener('change', () => { zetMee(v.id, vink.checked); });
    const label = el('label', { class: 'mee-keuze' });
    label.append(vink, el('span', {}, 'Mee in het bestand voor de klant'));
    mee!.replaceChildren(label);
    const verder = el('button', { type: 'button', class: 'tweede' }, v.id === id ? 'Verder werken in deze variant' : 'Open deze variant');
    verder.addEventListener('click', () => { if (v.id !== actiefProject()) openProject(v.id); naarWoning3D(); });
    knoppen!.replaceChildren(verder);
  }
  // Pas na het tonen van het scherm: de kijker neemt de maat van zijn vak.
  requestAnimationFrame(() => {
    for (const [i, vak] of vakken.entries()) {
      const v = lijst[i];
      if (!v) continue;
      if (vak.viewer === undefined) {
        vak.viewer = maak3D(vak.houder);
        // Drie kijkers tegelijk: de snelle weergave, ook op een computer.
        vak.viewer?.kwaliteit?.('snel');
        vak.viewer?.omgeving?.('buiten');
      }
      vak.viewer?.formaat();
      vak.viewer?.toon(scene(v));
      vak.viewer?.standpunt(standpunt);
    }
    // Voor tests en metingen: de kijkers bereikbaar.
    (window as unknown as { __varianten3d?: (Viewer3D | null | undefined)[] }).__varianten3d = vakken.filter((v) => !v.kaart.hidden).map((v) => v.viewer);
  });
}

export function startVarianten(nav: { naarWoning3D: () => void; geefMee: (knop: HTMLButtonElement, melding: HTMLElement) => void }) {
  naarWoning3D = nav.naarWoning3D;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-vr-standpunt]')) {
    b.addEventListener('click', () => {
      standpunt = b.dataset.vrStandpunt as Standpunt;
      for (const v of vakken) if (!v.kaart.hidden) v.viewer?.standpunt(standpunt);
    });
  }
  $<HTMLInputElement>('#vr-maten').addEventListener('change', (e) => {
    toonMaten = (e.target as HTMLInputElement).checked;
    toonVarianten();
  });
  $('#vr-terug').addEventListener('click', () => naarWoning3D());
  $('#vr-meegeven').addEventListener('click', () => nav.geefMee($<HTMLButtonElement>('#vr-meegeven'), $('#vr-melding')));
}
