/**
 * Maakt het controleblad: één pagina met elk model naast zijn productfoto, de maten en de bron, waarop je per model
 * "akkoord" of "bijsturen" aanduidt en een opmerking noteert. De opmerkingen kopieer je in één keer.
 *
 *   npm run controleblad                              de hele collectie
 *   npm run controleblad -- --familie Fauteuils       één familie
 *   npm run controleblad -- --modellen kotor,nestor   enkele modellen
 *
 * Verder: --decor fotodoek, --licht, --breedte 760, --zonder-bouw, --uit <bestand>.
 * De beelden van de vorige keer schuiven op naar werkbank/vorige en staan er als "vorige ronde" naast: zo zie je wat
 * veranderd is. Uitvoer: werkbank/controleblad.html (niet in git; privé publiceren of als bestand doorgeven).
 * Productfoto's: eerst `python3 -I packages/demo-web/scripts/haal_fotos.py` (anders staat er alleen onze 3D).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { bouwDemo, kiesModellen, leesModellen, leesOpties, neemBeeld, openDemo, openModel, WERKBANK, zetInstellingen } from './werkbank.mjs';

const o = leesOpties();
const uit = path.resolve(o.uit ?? path.join(WERKBANK, 'controleblad.html'));
const beelden = path.join(WERKBANK, 'beelden'), vorige = path.join(WERKBANK, 'vorige');
const breedte = Number(o.breedte ?? 760);
const instellingen = { decor: o.decor ?? 'studio', licht: o.licht ?? 'studio' };

bouwDemo(o);
// De beelden van de vorige keer bewaren om ernaast te leggen.
if (existsSync(path.join(beelden, 'index.json'))) { rmSync(vorige, { recursive: true, force: true }); renameSync(beelden, vorige); }
mkdirSync(beelden, { recursive: true });

const { browser, pagina, fouten } = await openDemo();
const modellen = kiesModellen(await leesModellen(pagina), o);
if (!modellen.length) { console.error('Geen modellen gevonden voor deze keuze.'); process.exit(2); }
console.log(`${modellen.length} modellen`);
const index = [];
for (const m of modellen) {
  await openModel(pagina, m);
  await zetInstellingen(pagina, instellingen);
  const beeld = await neemBeeld(pagina, { kijk: 'schuin', breedte, kwaliteit: 0.82 });
  writeFileSync(path.join(beelden, `${m.code}-schuin.jpg`), beeld);
  index.push({ bestand: `${m.code}-schuin.jpg`, model: m.code, naam: m.naam, familie: m.familie, standpunt: 'schuin' });
  m.nu = 'data:image/jpeg;base64,' + beeld.toString('base64');
  const oud = path.join(vorige, `${m.code}-schuin.jpg`);
  m.vorig = existsSync(oud) ? 'data:image/jpeg;base64,' + readFileSync(oud).toString('base64') : null;
  // Een onveranderd beeld hoeft er niet twee keer te staan.
  if (m.vorig === m.nu) m.vorig = null;
  console.log(`  ${m.naam}`);
}
writeFileSync(path.join(beelden, 'index.json'), JSON.stringify({ gemaakt: new Date().toISOString(), instellingen, breedte, beelden: index }, null, 1));
await browser.close();

const datum = new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
const gegevens = JSON.stringify(modellen).replace(/</g, '\\u003c');
const html = `<title>Controleblad 3D</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>
/* Opbouw: een vaste balk met voortgang en filters, daaronder één kolom met een kaart per model (foto naast 3D). */
:root {
  --grond: #f2f4f2; --vlak: #ffffff; --tekst: #1d2522; --zacht: #5a6661; --lijn: #d5dbd7;
  --accent: #2f5d50; --accent-zacht: #dfeae5; --goed: #2c7a4b; --goed-zacht: #dff0e5; --bij: #a35f00; --bij-zacht: #f8e8cf;
  --kop: "Space Grotesk", "Segoe UI", system-ui, sans-serif; --lopend: Inter, "Segoe UI", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --grond: #141917; --vlak: #1d2421; --tekst: #e7ece9; --zacht: #a3afa9; --lijn: #33403a;
  --accent: #8fc7b3; --accent-zacht: #24362f; --goed: #7fd0a0; --goed-zacht: #1e3528; --bij: #f0b65c; --bij-zacht: #3d2f17; color-scheme: dark } }
:root[data-theme="dark"] {
  --grond: #141917; --vlak: #1d2421; --tekst: #e7ece9; --zacht: #a3afa9; --lijn: #33403a;
  --accent: #8fc7b3; --accent-zacht: #24362f; --goed: #7fd0a0; --goed-zacht: #1e3528; --bij: #f0b65c; --bij-zacht: #3d2f17; color-scheme: dark }
* { box-sizing: border-box; }
body { background: var(--grond); color: var(--tekst); font: 15px/1.5 var(--lopend); }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--grond); }
.blad { max-width: 1120px; margin: 0 auto; padding-block: 24px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: flex; flex-direction: column; gap: 18px; }
h1 { font: 600 28px/1.15 var(--kop); margin: 0; text-wrap: balance; }
h2 { font: 600 19px/1.2 var(--kop); margin: 0; }
.inleiding { color: var(--zacht); max-width: 68ch; margin: 6px 0 0; }
.balk { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--grond); padding-block: 10px; border-bottom: 1px solid var(--lijn); display: flex; flex-direction: column; gap: 10px; }
.rij { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.stand { font-variant-numeric: tabular-nums; color: var(--zacht); margin-right: auto; }
.stand b { color: var(--tekst); font-weight: 600; }
button { font: 500 14px var(--lopend); color: var(--tekst); background: var(--vlak); border: 1px solid var(--lijn); border-radius: 999px; padding: 8px 14px; min-height: 40px; cursor: pointer; }
button:hover { border-color: var(--accent); }
button:focus-visible, textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button[aria-pressed="true"] { background: var(--accent-zacht); border-color: var(--accent); }
button.hoofd { background: var(--accent); border-color: var(--accent); color: var(--vlak); }
.kaart { background: var(--vlak); border: 1px solid var(--lijn); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.kaart[data-stand="akkoord"] { border-color: var(--goed); }
.kaart[data-stand="bijsturen"] { border-color: var(--bij); }
.kop { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: baseline; }
.familie { color: var(--zacht); font-size: 13px; }
.pil { margin-left: auto; font-size: 12px; font-weight: 600; letter-spacing: .02em; padding: 3px 10px; border-radius: 999px; background: var(--grond); color: var(--zacht); }
.kaart[data-stand="akkoord"] .pil { background: var(--goed-zacht); color: var(--goed); }
.kaart[data-stand="bijsturen"] .pil { background: var(--bij-zacht); color: var(--bij); }
.beelden { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
figure { margin: 0; min-width: 0; }
figure img { display: block; width: 100%; height: 260px; object-fit: contain; background: var(--grond); border-radius: 8px; }
figcaption { font-size: 12px; color: var(--zacht); margin-top: 4px; }
.geen { display: grid; place-items: center; height: 260px; border: 1px dashed var(--lijn); border-radius: 8px; color: var(--zacht); font-size: 13px; text-align: center; padding: 12px; }
.omschrijving { margin: 0; max-width: 75ch; }
dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px 16px; margin: 0; }
dt { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--zacht); }
dd { margin: 0; font-variant-numeric: tabular-nums; }
.staal { display: inline-block; width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--lijn); vertical-align: -1px; margin-right: 6px; }
.bron { font-size: 13px; color: var(--zacht); margin: 0; }
.bron.zeker { color: var(--goed); }
textarea { width: 100%; min-height: 64px; font: 14px/1.45 var(--lopend); color: var(--tekst); background: var(--grond); border: 1px solid var(--lijn); border-radius: 8px; padding: 9px 11px; resize: vertical; }
.uitvoer { display: flex; flex-direction: column; gap: 8px; }
.uitvoer textarea { min-height: 180px; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 13px; }
.melding { color: var(--zacht); font-size: 13px; }
@media (prefers-reduced-motion: no-preference) { .kaart { transition: border-color .15s; } }
</style>
<div class="blad">
  <header>
    <h1>Controleblad 3D</h1>
    <p class="inleiding">Elk model naast zijn productfoto. Duid per model aan of de 3D klopt en noteer wat anders moet. Onze 3D is een benadering: wat uit een foto is afgeleid, staat bij de bron. Stand van ${datum}, ${modellen.length} modellen.</p>
  </header>
  <div class="balk">
    <div class="rij">
      <span class="stand" id="stand"></span>
      <button type="button" class="hoofd" id="kopieer">Kopieer opmerkingen</button>
    </div>
    <div class="rij" id="filters" role="group" aria-label="Toon"></div>
  </div>
  <section class="uitvoer" id="uitvoer" hidden>
    <h2>Uw opmerkingen</h2>
    <p class="melding" id="melding"></p>
    <textarea id="tekst" readonly aria-label="Opmerkingen als tekst"></textarea>
  </section>
  <main id="lijst" style="display:flex;flex-direction:column;gap:14px"></main>
</div>
<script>
const MODELLEN = ${gegevens};
const SLEUTEL = 'controleblad-3d.v1';
const STAND = { open: 'Nog te bekijken', akkoord: 'Akkoord', bijsturen: 'Bijsturen' };
let oordelen = {};
try { oordelen = JSON.parse(localStorage.getItem(SLEUTEL) || '{}') || {}; } catch { oordelen = {}; }
const bewaar = () => { try { localStorage.setItem(SLEUTEL, JSON.stringify(oordelen)); } catch { /* zonder opslag blijft het blad werken */ } };
const van = (code) => oordelen[code] || (oordelen[code] = { stand: 'open', tekst: '' });
const maak = (naam, eigenschappen = {}, ...inhoud) => { const e = document.createElement(naam); for (const [k, v] of Object.entries(eigenschappen)) { if (k === 'class') e.className = v; else if (k in e && k !== 'list') e[k] = v; else e.setAttribute(k, v); } e.append(...inhoud); return e; };
let filter = 'alles';
const families = [...new Set(MODELLEN.map((m) => m.familie))];

function beeld(src, onderschrift, alt) {
  const f = maak('figure');
  f.append(src ? maak('img', { src, alt, loading: 'lazy' }) : maak('div', { class: 'geen' }, 'Geen foto op de website'), maak('figcaption', {}, onderschrift));
  return f;
}
function kaart(m) {
  const o = van(m.code);
  const k = maak('article', { class: 'kaart', id: 'm-' + m.code });
  k.dataset.stand = o.stand;
  const pil = maak('span', { class: 'pil' }, STAND[o.stand]);
  k.append(maak('div', { class: 'kop' }, maak('h2', {}, m.naam), maak('span', { class: 'familie' }, m.familie), pil));
  const beelden = maak('div', { class: 'beelden' });
  beelden.append(beeld(m.foto, 'Foto van de website', 'Productfoto ' + m.naam));
  if (m.vorig) beelden.append(beeld(m.vorig, 'Onze 3D, vorige ronde', '3D van ' + m.naam + ', vorige ronde'));
  beelden.append(beeld(m.nu, 'Onze 3D nu (benadering)', '3D van ' + m.naam));
  k.append(beelden, maak('p', { class: 'omschrijving' }, m.omschrijving));
  const feit = (naam, ...waarde) => { const d = maak('div'); d.append(maak('dt', {}, naam), maak('dd', {}, ...waarde)); return d; };
  const stof = m.kleur ? [maak('span', { class: 'staal', style: 'background:' + m.kleur }), m.stof] : [m.stof];
  k.append(maak('dl', {}, feit('Breedte × diepte × hoogte', m.breedte + ' × ' + m.diepte + ' × ' + m.hoogte + ' cm'), feit('Zithoogte', m.zithoogte + ' cm'), feit('Stof in de 3D', ...stof), feit('Bouwstijl', m.bouwstijl || 'eigen samenstelling')));
  const zeker = /^Maten van de productpagina/.test(m.bron);
  k.append(maak('p', { class: 'bron' + (zeker ? ' zeker' : '') }, 'Bron: ' + m.bron));
  const knoppen = maak('div', { class: 'rij', role: 'group', 'aria-label': 'Oordeel over ' + m.naam });
  const tekst = maak('textarea', { id: 'opm-' + m.code, placeholder: 'Wat moet anders? Bv. "armen smaller", "geen los zitkussen", "poten donkerder".', value: o.tekst, 'aria-label': 'Opmerking bij ' + m.naam });
  for (const s of ['akkoord', 'bijsturen', 'open']) {
    const b = maak('button', { type: 'button', id: 'knop-' + s + '-' + m.code }, STAND[s]);
    b.setAttribute('aria-pressed', String(o.stand === s));
    b.addEventListener('click', () => { o.stand = s; bewaar(); k.dataset.stand = s; pil.textContent = STAND[s]; knoppen.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); toonStand(); if (s === 'bijsturen') tekst.focus(); });
    knoppen.append(b);
  }
  tekst.addEventListener('input', () => { o.tekst = tekst.value; if (tekst.value.trim() && o.stand === 'open') { o.stand = 'bijsturen'; k.dataset.stand = 'bijsturen'; pil.textContent = STAND.bijsturen; knoppen.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.id.startsWith('knop-bijsturen')))); toonStand(); } bewaar(); });
  k.append(knoppen, tekst);
  return k;
}
function toonStand() {
  const tel = (s) => MODELLEN.filter((m) => van(m.code).stand === s).length;
  const stand = document.getElementById('stand');
  stand.replaceChildren(maak('b', {}, String(tel('akkoord'))), ' akkoord · ', maak('b', {}, String(tel('bijsturen'))), ' bijsturen · ', maak('b', {}, String(tel('open'))), ' nog te bekijken');
}
function toonLijst() {
  const zichtbaar = MODELLEN.filter((m) => filter === 'alles' || m.familie === filter || van(m.code).stand === filter);
  document.getElementById('lijst').replaceChildren(...zichtbaar.map(kaart));
  document.querySelectorAll('#filters button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
}
function tekstVanOpmerkingen() {
  const regels = ['Controleblad 3D, stand van ${datum}', ''];
  for (const s of ['bijsturen', 'akkoord', 'open']) {
    const groep = MODELLEN.filter((m) => van(m.code).stand === s);
    if (!groep.length) continue;
    regels.push(STAND[s].toUpperCase() + ' (' + groep.length + ')');
    for (const m of groep) regels.push(s === 'bijsturen' ? '- ' + m.naam + ': ' + (van(m.code).tekst.trim().replace(/\\s*\\n\\s*/g, ' / ') || '(geen opmerking genoteerd)') : '- ' + m.naam + (van(m.code).tekst.trim() ? ': ' + van(m.code).tekst.trim().replace(/\\s*\\n\\s*/g, ' / ') : ''));
    regels.push('');
  }
  return regels.join('\\n').trim();
}
const filters = document.getElementById('filters');
for (const [waarde, label] of [['alles', 'Alles'], ...families.map((f) => [f, f]), ['open', 'Nog te bekijken'], ['bijsturen', 'Bijsturen']]) {
  const b = maak('button', { type: 'button', id: 'filter-' + waarde.replace(/[^a-z0-9]+/gi, '-') }, label);
  b.dataset.filter = waarde;
  b.addEventListener('click', () => { filter = waarde; toonLijst(); });
  filters.append(b);
}
document.getElementById('kopieer').addEventListener('click', async () => {
  const tekst = tekstVanOpmerkingen(), vak = document.getElementById('tekst'), melding = document.getElementById('melding');
  document.getElementById('uitvoer').hidden = false;
  vak.value = tekst;
  try { await navigator.clipboard.writeText(tekst); melding.textContent = 'Gekopieerd. Plak de tekst in het gesprek.'; }
  catch { vak.focus(); vak.select(); melding.textContent = 'Kopiëren lukt hier niet automatisch: de tekst is geselecteerd, kopieer ze met Ctrl + C (of ⌘ + C).'; }
  document.getElementById('uitvoer').scrollIntoView({ block: 'nearest' });
});
toonStand();
toonLijst();
</script>
`;
mkdirSync(path.dirname(uit), { recursive: true });
writeFileSync(uit, html);
if (fouten.length) console.log(`Let op: de pagina gaf ${new Set(fouten).size} fout(en):\n  ${[...new Set(fouten)].slice(0, 5).join('\n  ')}`);
console.log(`Controleblad: ${uit} (${Math.round(html.length / 1024)} kB, ${modellen.filter((m) => m.foto).length} van ${modellen.length} met foto${modellen.some((m) => m.vorig) ? ', met de vorige ronde ernaast' : ''})`);
