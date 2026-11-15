/**
 * Losse 3D-kijker voor de bouw: toont een 3D-pakket (core/src/pakket3d.ts) en kan niets wijzigen. Bedoeld om in te
 * sluiten in een ander systeem (bv. een scherm van Missing Link) of om een doorgestuurd pakket te openen.
 *
 * Een pakket komt binnen op drie manieren:
 *   - een bericht van de pagina die de kijker insluit: postMessage({ soort: 'bouw-3d-pakket', ... });
 *   - het adres van de pagina: ?pakket=<adres van het json-bestand> (zelfde server);
 *   - een bestand kiezen of slepen.
 * Berichten van en naar de insluitende pagina hebben allemaal `soort: 'bouw-kijker'`:
 *   kijker → pagina   { soort: 'bouw-kijker', bericht: 'klaar', versie }          de kijker is geladen
 *                     { soort: 'bouw-kijker', bericht: 'getoond', project }        een pakket staat in beeld
 *                     { soort: 'bouw-kijker', bericht: 'beeld', png }              antwoord op de vraag om een beeld
 *                     { soort: 'bouw-kijker', bericht: 'fout', tekst }             het pakket kon niet getoond worden
 *   pagina → kijker   { soort: 'bouw-kijker', vraag: 'beeld' }                    geef het beeld zoals het nu staat (PNG)
 *                     { soort: 'bouw-kijker', huisstijl: { accent, achtergrond } } kleuren van de insluitende pagina
 * Met ?oorsprong=<adres> in het adres van de kijker luistert en antwoordt hij alleen naar dat adres.
 */
import { leesPakket3D, PAKKET3D_VERSIE, type Pakket3D, type Scene3D } from '../../core/src/index.js';
import { maak3D, type Viewer3D } from '../../demo-web/src/drie-d.js';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const adres = new URLSearchParams(location.search);
const oorsprong = adres.get('oorsprong');
let viewer: Viewer3D | null | undefined;
let pakket: Pakket3D | null = null;

function naarPagina(bericht: Record<string, unknown>) {
  if (window.parent !== window) window.parent.postMessage({ soort: 'bouw-kijker', ...bericht }, oorsprong ?? '*');
}

function fout(tekst: string) {
  $('#fout').textContent = tekst;
  $('#fout').hidden = false;
  naarPagina({ bericht: 'fout', tekst });
}

function scene(): Scene3D | null {
  if (!pakket) return null;
  const keuze = $<HTMLSelectElement>('#keuze').value;
  if (keuze === 'woning') {
    const n = pakket.woning[Number($<HTMLSelectElement>('#niveau').value)] ?? pakket.woning[pakket.woning.length - 1];
    if (!n) return null;
    return $<HTMLInputElement>('#laag').checked ? n.laag : n.scene;
  }
  return pakket.posities.find((p) => p.code === keuze)?.scene ?? null;
}

function teken() {
  if (!pakket) return;
  const keuze = $<HTMLSelectElement>('#keuze').value;
  const woning = keuze === 'woning';
  $('#niveau-wrap').hidden = !woning || pakket.woning.length < 2;
  $('#laag-wrap').hidden = !woning;
  const p = pakket.posities.find((x) => x.code === keuze);
  $('#uitleg').textContent = woning ? 'Draai met de muis of een vinger; zoom met Ctrl + scrollen of knijpen.' : p ? `${p.aantal} × ${p.naam}. ${p.omschrijving}` : '';
  $('#uitleg').hidden = false;
  const s = scene();
  if (!s) return;
  if (viewer === undefined) viewer = maak3D($('#drie-d'));
  if (!viewer) { fout('De 3D kan op dit toestel niet getoond worden.'); return; }
  viewer.formaat();
  viewer.toon(s);
}

function toon(bron: unknown) {
  try {
    pakket = leesPakket3D(bron);
  } catch (e) {
    fout(e instanceof Error ? e.message : String(e));
    return;
  }
  $('#fout').hidden = true;
  $('#titel').textContent = pakket.project.naam || '3D-kijker';
  $('#ondertitel').textContent = [pakket.project.nummer, pakket.project.klant].filter(Boolean).join(' · ');
  document.title = `3D · ${pakket.project.naam || pakket.project.nummer || 'bouw'}`;
  const keuze = $<HTMLSelectElement>('#keuze');
  keuze.replaceChildren(
    ...(pakket.woning.length ? [new Option('De woning', 'woning')] : []),
    ...pakket.posities.map((p) => new Option(`${p.code} · ${p.naam}`, p.code)),
  );
  const niveau = $<HTMLSelectElement>('#niveau');
  niveau.replaceChildren(...pakket.woning.map((n, i) => new Option(i === pakket!.woning.length - 1 && i > 0 ? `${n.naam} (hele woning)` : n.naam, String(i))));
  niveau.value = String(Math.max(0, pakket.woning.length - 1));
  $<HTMLInputElement>('#laag').checked = false;
  $('#leeg').hidden = true;
  $('#balk').hidden = false;
  $('#drie-d').hidden = false;
  teken();
  naarPagina({ bericht: 'getoond', project: pakket.project.nummer });
}

function leesBestand(f: File | undefined) {
  if (!f) return;
  f.text().then(toon, () => fout('Dit bestand kon niet gelezen worden.'));
}

function huisstijl(h: { accent?: string; achtergrond?: string; opAccent?: string }) {
  const kleur = (k: unknown) => (typeof k === 'string' && /^#[0-9a-f]{3,8}$/i.test(k) ? k : null);
  const stijl = document.documentElement.style;
  if (kleur(h.accent)) stijl.setProperty('--accent', h.accent!);
  if (kleur(h.achtergrond)) stijl.setProperty('--achtergrond', h.achtergrond!);
  if (kleur(h.opAccent)) stijl.setProperty('--op-accent', h.opAccent!);
}

window.addEventListener('message', (e) => {
  if (oorsprong && e.origin !== oorsprong) return;
  const d = e.data as { soort?: string; vraag?: string; huisstijl?: object } | null;
  if (!d || typeof d !== 'object') return;
  if (d.soort === 'bouw-3d-pakket') toon(d);
  if (d.soort !== 'bouw-kijker') return;
  if (d.huisstijl) huisstijl(d.huisstijl);
  if (d.vraag === 'beeld') naarPagina({ bericht: 'beeld', png: viewer?.beeld?.() ?? null });
});

$('#keuze').addEventListener('change', teken);
$('#niveau').addEventListener('change', teken);
$('#laag').addEventListener('change', teken);
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-standpunt]')) b.addEventListener('click', () => viewer?.standpunt(b.dataset.standpunt as 'schuin'));
$('#bewaar').addEventListener('click', () => {
  const png = viewer?.beeld?.();
  if (!png) return;
  const a = document.createElement('a');
  a.href = png;
  a.download = `3D ${pakket?.project.nummer || 'bouw'}.png`;
  a.click();
});
$('#ander').addEventListener('click', () => $<HTMLInputElement>('#bestand').click());
$('#kies').addEventListener('click', () => $<HTMLInputElement>('#bestand').click());
$<HTMLInputElement>('#bestand').addEventListener('change', (e) => leesBestand((e.target as HTMLInputElement).files?.[0]));
const leeg = $('#leeg');
for (const soort of ['dragenter', 'dragover'] as const) document.addEventListener(soort, (e) => { e.preventDefault(); leeg.classList.add('sleep'); });
document.addEventListener('dragleave', () => leeg.classList.remove('sleep'));
document.addEventListener('drop', (e) => { e.preventDefault(); leeg.classList.remove('sleep'); leesBestand(e.dataTransfer?.files?.[0]); });
window.addEventListener('resize', () => viewer?.formaat());

// Kleuren en pakket uit het adres van de pagina.
huisstijl({ accent: adres.get('accent') ? `#${adres.get('accent')}` : undefined, achtergrond: adres.get('achtergrond') ? `#${adres.get('achtergrond')}` : undefined });
const bron = adres.get('pakket');
if (bron) fetch(bron).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status))))).then(toon, () => fout('Het 3D-pakket kon niet opgehaald worden.'));
// Een pakket dat in de pagina zelf zit (één bestand om door te sturen).
const ingesloten = document.getElementById('pakket');
if (ingesloten?.textContent?.trim()) toon(ingesloten.textContent);
naarPagina({ bericht: 'klaar', versie: PAKKET3D_VERSIE });
