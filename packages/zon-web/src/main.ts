/**
 * Zonnepanelendemo voor installateurs: dak → installatie → opbrengst → offerte.
 * Zelfde opzet als de bouw- en zeteldemo (motor in packages/core, alles in één HTML-bestand).
 */
import { $, el, eur, getal, knop, klantweergave, toonFout } from './hulp.js';
import { toonDak } from './dak-ui.js';
import { toonInstallatie } from './installatie-ui.js';
import { toonOpbrengst } from './opbrengst-ui.js';
import { bewaarBestand, toonOfferte } from './offerte-ui.js';
import { maak3D, type Viewer3D } from './drie-d.js';
import { wijzig, kanOngedaan, laatstBewaard, nieuwLeeg, nieuwVoorbeeld, ongedaan, opslagProbleem, opWijziging, resultaat, toestand, vervang } from './staat.js';
import type { ZonProject } from '../../core/src/zon.js';

window.addEventListener('error', (e) => {
  if (!e.error && /^Script error\.?$/i.test(e.message ?? '')) return;
  if (/ResizeObserver loop/i.test(e.message ?? '')) return;
  toonFout('Fout', e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => toonFout('Fout', e.reason));

type Stap = 'dak' | 'installatie' | 'opbrengst' | 'offerte';
const STAPPEN: Stap[] = ['dak', 'installatie', 'opbrengst', 'offerte'];
let actief: Stap = 'dak';
let viewer: Viewer3D | null = null;

function veilig(waar: string, f: () => void) {
  try { f(); } catch (fout) { toonFout(waar, fout); }
}

function toonStap() {
  const houder = $('#stap');
  const scroll = window.scrollY;
  if (actief === 'dak') toonDak(houder);
  if (actief === 'installatie') toonInstallatie(houder);
  if (actief === 'opbrengst') toonOpbrengst(houder);
  if (actief === 'offerte') toonOfferte(houder);
  window.scrollTo({ top: scroll });
}

function zijkant() {
  const r = resultaat();
  const p = toestand();
  $('#k-panelen').textContent = `${r.aantal}`;
  const schuif = $('#k-aantal') as HTMLInputElement;
  schuif.max = String(r.beschikbaar);
  if (document.activeElement !== schuif || !schuif.dataset.sleept) schuif.value = String(r.aantal);
  $('#k-aantal-waarde').textContent = String(r.aantal);
  $('#k-aantal-max').textContent = `van ${r.beschikbaar} plaatsen · ${getal(r.kwp, 2)} kWp`;
  ($('#k-aantal-alle') as HTMLButtonElement).disabled = p.doelAantal === null && Object.values(p.vlakken).every((v) => !v.uit.length);
  $('#k-kwp').textContent = getal(r.kwp, 2);
  $('#k-kwh').textContent = getal(r.productie);
  $('#k-dekking').textContent = `${getal(r.dekking)} %`;
  $('#k-autarkie').textContent = `${getal(r.autarkie)} %`;
  $('#k-terug').textContent = r.terugverdientijd !== null ? `${getal(r.terugverdientijd, 1)} jaar` : '> 25 jaar';
  $('#k-prijs').textContent = eur(klantweergave() ? r.offerte.incl : r.offerte.excl, 0);
  $('#k-prijs-label').textContent = klantweergave() ? 'Prijs incl. btw' : 'Prijs excl. btw';
  $('#k-prijs-incl').textContent = klantweergave() ? '' : `${eur(r.offerte.incl, 0)} incl. ${r.offerte.btwProcent} % btw`;
  const fouten = r.controles.filter((c) => c.status === 'fout').length;
  const letop = r.controles.filter((c) => c.status === 'let-op').length;
  const st = $('#controle-status');
  st.className = `status ${fouten ? 'fout' : letop ? 'let-op' : 'ok'}`;
  st.textContent = fouten ? `${fouten} fout${fouten > 1 ? 'en' : ''}` : letop ? `${letop} aandachtspunt${letop > 1 ? 'en' : ''}` : 'alles in orde';
  $('#controles').replaceChildren(...r.controles.map((c) => el('li', { class: c.status },
    el('span', { class: 'teken', 'aria-hidden': 'true' }, c.status === 'ok' ? '✓' : c.status === 'fout' ? '✕' : '!'),
    el('span', {}, c.label), el('span', { class: 'waarde' }, c.waarde ?? ''),
    c.uitleg ? el('span', { class: 'uitleg' }, c.uitleg) : null)));
  $('#hd-project').textContent = p.klant.naam || 'Nieuw project';
  $('#hd-bewaard').textContent = opslagProbleem || (laatstBewaard ? `automatisch bewaard om ${laatstBewaard}` : 'automatisch bewaard in deze browser');
  ($('#ongedaan') as HTMLButtonElement).disabled = !kanOngedaan();
  viewer?.toon(p, r);
}

function kies(s: Stap) {
  actief = s;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-stap]')) b.setAttribute('aria-pressed', String(b.dataset.stap === s));
  try { history.replaceState(null, '', `#${s}`); } catch { /* file:// */ }
  veilig('Scherm', toonStap);
  window.scrollTo({ top: 0 });
  const volgende = STAPPEN[STAPPEN.indexOf(s) + 1];
  $('#volgende').hidden = !volgende;
  if (volgende) $('#volgende').textContent = `Verder: ${document.querySelector(`[data-stap="${volgende}"] .naam`)?.textContent} →`;
}

// Kop.
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-stap]')) b.addEventListener('click', () => kies(b.dataset.stap as Stap));
$('#volgende').addEventListener('click', () => kies(STAPPEN[STAPPEN.indexOf(actief) + 1] ?? 'offerte'));
$('#ongedaan').addEventListener('click', ongedaan);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); ongedaan(); }
});
$('#menu-voorbeeld').addEventListener('click', () => { if (confirm('Het voorbeeldproject laden? Het huidige project wordt vervangen (ongedaan maken kan).')) { nieuwVoorbeeld(); kies('dak'); } });
$('#menu-nieuw').addEventListener('click', () => { if (confirm('Een nieuw, leeg project starten? Het huidige project wordt vervangen (ongedaan maken kan).')) { nieuwLeeg(); kies('dak'); } });
$('#menu-bewaar').addEventListener('click', bewaarBestand);
$('#menu-open').addEventListener('click', () => ($('#bestand') as HTMLInputElement).click());
$('#bestand').addEventListener('change', async () => {
  const i = $('#bestand') as HTMLInputElement;
  const f = i.files?.[0];
  if (!f) return;
  try {
    const p = JSON.parse(await f.text()) as ZonProject;
    if (!Array.isArray(p.gebouwen)) throw new Error('Dit is geen project van de zonnepanelendemo.');
    vervang(p);
    kies('dak');
  } catch (fout) {
    toonFout('Openen', fout);
  }
  i.value = '';
});
function zetKlantweergave(aan: boolean) {
  document.body.classList.toggle('klantmodus', aan);
  $('#klantweergave').setAttribute('aria-pressed', String(aan));
  try { localStorage.setItem('zon-demo.klantweergave', aan ? '1' : '0'); } catch { /* niets */ }
  veilig('Scherm', () => { toonStap(); zijkant(); });
}
$('#klantweergave').addEventListener('click', () => zetKlantweergave(!klantweergave()));
try { if (localStorage.getItem('zon-demo.klantweergave') === '1') document.body.classList.add('klantmodus'); } catch { /* niets */ }
$('#klantweergave').setAttribute('aria-pressed', String(klantweergave()));

// Schuifknop: gewenst aantal panelen (de beste plaatsen eerst).
{
  const schuif = $('#k-aantal') as HTMLInputElement;
  schuif.addEventListener('input', () => { schuif.dataset.sleept = '1'; $('#k-aantal-waarde').textContent = schuif.value; });
  schuif.addEventListener('change', () => {
    delete schuif.dataset.sleept;
    const n = Number(schuif.value);
    wijzig((q) => { q.doelAantal = n >= resultaat().beschikbaar ? null : n; });
  });
  $('#k-aantal-alle').addEventListener('click', () => wijzig((q) => { q.doelAantal = null; for (const v of Object.values(q.vlakken)) v.uit = []; }));
}

// 3D.
veilig('3D', () => {
  viewer = maak3D($('#drie-d'));
  const rij = $('#standpunten');
  if (viewer) {
    rij.append(
      knop('Schuin', () => viewer!.standpunt('schuin')),
      knop('Van boven', () => viewer!.standpunt('boven')),
      knop('Vanuit de zon', () => viewer!.standpunt('zon')),
      knop('−', () => viewer!.zoom(1.15), 'tweede', 'Uitzoomen'),
      knop('+', () => viewer!.zoom(0.87), 'tweede', 'Inzoomen'),
      el('span', { class: 'klein' }, 'Slepen = draaien · Ctrl + wiel = zoomen'),
    );
  }
});

opWijziging(() => veilig('Bijwerken', () => { toonStap(); zijkant(); }));
const start = location.hash.slice(1) as Stap;
veilig('Opstarten', () => { zijkant(); kies(STAPPEN.includes(start) ? start : 'dak'); });
