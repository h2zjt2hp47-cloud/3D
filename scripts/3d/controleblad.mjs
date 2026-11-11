/**
 * Maakt het controleblad: één pagina met elk item van een bron naast zijn referentiefoto (als die er is), zijn maten en
 * zijn bron, waarop je per item "akkoord" of "bijsturen" aanduidt en een opmerking noteert.
 *
 *   npm run controleblad                              zetels, inrichting, ramen en woning
 *   npm run controleblad -- --bron zetels             één bron (of meer: --bron zetels,inrichting)
 *   npm run controleblad -- --groep Fauteuils         één groep; --items kotor,nestor: enkele items
 *   npm run controleblad -- --nieuwe-ronde            de beelden van nu worden de "vorige ronde" van de volgende keer
 *
 * Verder: --decor fotodoek, --licht, --breedte 760, --weg snel|webgl2|webgpu, --vers, --zonder-bouw, --uit <bestand>.
 *
 * Vorige ronde: per item bewaart werkbank/controle/<bron> het beeld en de vingerafdruk van het begin van de ronde. Is een
 * item sindsdien veranderd, dan staat het oude beeld ernaast met het label "gewijzigd". Een ronde afsluiten doe je met
 * --nieuwe-ronde (na het akkoord van Jonas).
 *
 * Oordelen: gepubliceerd als privépagina (Artifact, met de mogelijkheid `db`) bewaart het blad elk oordeel bij de pagina
 * zelf, in de collectie `oordelen`: Claude leest ze rechtstreeks terug, zonder kopiëren en plakken. Als los bestand
 * bewaart het in de browser en is er de knop "Kopieer opmerkingen".
 * Uitvoer: werkbank/controleblad.html (niet in git; privé publiceren of als bestand doorgeven, er staan foto's in).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, WERKBANK, bouwWerkbank, kiesBron, kiesItems, leesItems, leesOpties, lijst, neemBeeld, openWerkbank, voortgang } from './werkbank.mjs';

const o = leesOpties();
const uit = path.resolve(o.uit ?? path.join(WERKBANK, 'controleblad.html'));
const instellingen = { decor: o.decor ?? 'studio', licht: o.licht ?? 'studio', breedte: Number(o.breedte ?? 760), kijk: 'schuin', jpeg: 0.82 };
const alsUrl = (buffer) => 'data:image/jpeg;base64,' + buffer.toString('base64');

bouwWerkbank(o);
const werkbank = await openWerkbank({ weg: o.weg });
const bronnen = [];
let nieuw = 0;
for (const code of lijst(o.bron ?? 'zetels,inrichting,ramen,woning')) {
  const bron = await kiesBron(werkbank.pagina, code);
  const items = kiesItems(await leesItems(werkbank.pagina, bron.code), o);
  if (!items.length) continue;
  console.log(`${bron.titel}: ${items.length} items · ${werkbank.label}`);
  const map = path.join(WERKBANK, 'controle', bron.code), indexPad = path.join(map, 'index.json');
  mkdirSync(map, { recursive: true });
  const ronde = existsSync(indexPad) ? JSON.parse(readFileSync(indexPad, 'utf8')) : {};
  for (const item of items) {
    const r = await neemBeeld(werkbank, bron.code, item.code, instellingen, { vers: Boolean(o.vers) });
    if (!r.uitCache) nieuw++;
    voortgang(item.naam, r);
    item.nu = alsUrl(r.beeld);
    item.afdruk = r.afdruk;
    const fotoPad = bron.fotomap && item.foto ? path.join(ROOT, bron.fotomap, `${item.foto}.jpg`) : '';
    item.fotoUrl = fotoPad && existsSync(fotoPad) ? alsUrl(readFileSync(fotoPad)) : null;
    // Vorige ronde: het beeld van het begin van de ronde, als het item sindsdien veranderd is.
    const beginPad = path.join(map, `${item.code}.jpg`), begin = ronde[item.code];
    if (!existsSync(beginPad) || o['nieuwe-ronde']) {
      item.vorig = existsSync(beginPad) && begin?.afdruk !== r.afdruk ? alsUrl(readFileSync(beginPad)) : null;
      item.gewijzigd = Boolean(item.vorig && begin?.afdruk);
      writeFileSync(beginPad, r.beeld);
      ronde[item.code] = { afdruk: r.afdruk };
    } else {
      item.gewijzigd = Boolean(begin?.afdruk && begin.afdruk !== r.afdruk);
      // Zonder vingerafdruk (een beeld van voor 11/11): het oude beeld tonen zonder het label.
      item.vorig = !begin?.afdruk || item.gewijzigd ? alsUrl(readFileSync(beginPad)) : null;
    }
    delete item.foto;
  }
  writeFileSync(indexPad, JSON.stringify(ronde, null, 1));
  bronnen.push({ code: bron.code, titel: bron.titel, uitleg: bron.uitleg, heeftFotos: items.some((i) => i.fotoUrl), items });
}
await werkbank.sluit();
if (!bronnen.length) { console.error('Geen items gevonden voor deze keuze.'); process.exit(2); }

const datum = new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
const aantal = bronnen.reduce((n, b) => n + b.items.length, 0);
const gegevens = JSON.stringify(bronnen).replace(/</g, '\\u003c');
const html = `<title>Controleblad 3D</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>
/* Opbouw: een vaste balk met voortgang en filters, daaronder één kolom met een kaart per item (foto naast 3D). */
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
.opslag { font-size: 13px; color: var(--zacht); margin: 6px 0 0; max-width: 68ch; }
.opslag[data-soort="gedeeld"] { color: var(--goed); }
.balk { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--grond); padding-block: 10px; border-bottom: 1px solid var(--lijn); display: flex; flex-direction: column; gap: 10px; }
.rij { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.stand { font-variant-numeric: tabular-nums; color: var(--zacht); margin-right: auto; }
.stand b { color: var(--tekst); font-weight: 600; }
button { font: 500 14px var(--lopend); color: var(--tekst); background: var(--vlak); border: 1px solid var(--lijn); border-radius: 999px; padding: 8px 14px; min-height: 40px; cursor: pointer; }
button:hover { border-color: var(--accent); }
button:focus-visible, textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button[aria-pressed="true"] { background: var(--accent-zacht); border-color: var(--accent); }
button.hoofd { background: var(--accent); border-color: var(--accent); color: var(--vlak); }
.tabs button { border-radius: 10px; font-family: var(--kop); font-size: 15px; }
.kaart { background: var(--vlak); border: 1px solid var(--lijn); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.kaart[data-stand="akkoord"] { border-color: var(--goed); }
.kaart[data-stand="bijsturen"] { border-color: var(--bij); }
.kop { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: baseline; }
.groep { color: var(--zacht); font-size: 13px; }
.pillen { margin-left: auto; display: flex; flex-wrap: wrap; gap: 6px; }
.pil { font-size: 12px; font-weight: 600; letter-spacing: .02em; padding: 3px 10px; border-radius: 999px; background: var(--grond); color: var(--zacht); }
.pil.nieuw { background: var(--accent-zacht); color: var(--accent); }
.kaart[data-stand="akkoord"] .pil.oordeel { background: var(--goed-zacht); color: var(--goed); }
.kaart[data-stand="bijsturen"] .pil.oordeel { background: var(--bij-zacht); color: var(--bij); }
.beelden { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
figure { margin: 0; min-width: 0; }
figure img { display: block; width: 100%; height: 260px; object-fit: contain; background: var(--grond); border-radius: 8px; }
figcaption { font-size: 12px; color: var(--zacht); margin-top: 4px; }
.geen { display: grid; place-items: center; height: 260px; border: 1px dashed var(--lijn); border-radius: 8px; color: var(--zacht); font-size: 13px; text-align: center; padding: 12px; }
.omschrijving { margin: 0; max-width: 75ch; }
dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px 16px; margin: 0; }
dt { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--zacht); }
dd { margin: 0; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.staal { display: inline-block; width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--lijn); vertical-align: -1px; margin-right: 6px; }
.bron { font-size: 13px; color: var(--zacht); margin: 0; }
.bron.zeker { color: var(--goed); }
textarea { width: 100%; min-height: 64px; font: 14px/1.45 var(--lopend); color: var(--tekst); background: var(--grond); border: 1px solid var(--lijn); border-radius: 8px; padding: 9px 11px; resize: vertical; }
.uitvoer { display: flex; flex-direction: column; gap: 8px; }
.uitvoer textarea { min-height: 180px; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 13px; }
.melding { color: var(--zacht); font-size: 13px; }
.leeg { color: var(--zacht); padding: 24px 0; }
@media (prefers-reduced-motion: no-preference) { .kaart { transition: border-color .15s; } }
</style>
<div class="blad">
  <header>
    <h1>Controleblad 3D</h1>
    <p class="inleiding">Elk item naast zijn referentie. Duid aan of de 3D klopt en noteer wat anders moet. Onze 3D is een benadering: wat uit een foto is afgeleid, staat bij de bron. Stand van ${datum}, ${aantal} items.</p>
    <p class="opslag" id="opslag" data-soort="browser">Uw oordelen worden in deze browser bewaard. Gebruik "Kopieer opmerkingen" om ze door te geven.</p>
  </header>
  <div class="balk">
    <div class="rij tabs" id="tabs" role="group" aria-label="Bron"></div>
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
const BRONNEN = ${gegevens};
const SLEUTEL = 'controleblad-3d.v2';
const STAND = { open: 'Nog te bekijken', akkoord: 'Akkoord', bijsturen: 'Bijsturen' };
const idVan = (bron, item) => (bron.code + ':' + item.code).replace(/[^A-Za-z0-9_.~:@+-]/g, '_');
const ALLE = BRONNEN.flatMap((b) => b.items.map((i) => ({ id: idVan(b, i), bron: b, item: i })));
let oordelen = {};
try { oordelen = JSON.parse(localStorage.getItem(SLEUTEL) || '{}') || {}; } catch { oordelen = {}; }
const bewaarLokaal = () => { try { localStorage.setItem(SLEUTEL, JSON.stringify(oordelen)); } catch { /* zonder opslag blijft het blad werken */ } };
const van = (id) => oordelen[id] || (oordelen[id] = { stand: 'open', tekst: '' });
/** Een oordeel over een vorige versie van het item: het beeld is sindsdien veranderd, dus opnieuw te bekijken. */
const verouderd = (x) => { const o = van(x.id); return o.stand !== 'open' && Boolean(o.afdruk) && o.afdruk !== x.item.afdruk; };
const maak = (naam, eigenschappen = {}, ...inhoud) => { const e = document.createElement(naam); for (const [k, v] of Object.entries(eigenschappen)) { if (k === 'class') e.className = v; else if (k in e && k !== 'list') e[k] = v; else e.setAttribute(k, v); } e.append(...inhoud); return e; };
let bronNu = BRONNEN[0].code, filter = 'alles';

// ---------- bewaren bij de pagina (als ze gepubliceerd is met de mogelijkheid db) ----------
let db = null, alleenLezen = false;
const bezig = new Map(), wachtrij = new Map();
function toonOpslag(soort) {
  const p = document.getElementById('opslag');
  p.dataset.soort = soort;
  p.textContent = {
    browser: 'Uw oordelen worden in deze browser bewaard. Gebruik "Kopieer opmerkingen" om ze door te geven.',
    laden: 'Bewaarde oordelen worden opgehaald …',
    traag: 'De bewaarde oordelen zijn nog niet bereikbaar; wat u nu aanduidt, blijft in deze browser staan.',
    gedeeld: 'Uw oordelen worden bij deze pagina bewaard: Claude kan ze rechtstreeks lezen, kopiëren hoeft niet.',
    lezen: 'U kunt de oordelen bekijken maar niet wijzigen (alleen-lezen toegang).',
    fout: 'Bewaren bij de pagina lukt nu niet; uw oordelen blijven in deze browser staan. Gebruik "Kopieer opmerkingen".',
  }[soort];
}
function schrijf(id) {
  if (!db || alleenLezen) return;
  clearTimeout(bezig.get(id));
  bezig.set(id, setTimeout(() => {
    const x = ALLE.find((a) => a.id === id), o = van(id);
    const inhoud = { bron: x.bron.code, code: x.item.code, naam: x.item.naam, stand: o.stand, tekst: o.tekst, afdruk: o.afdruk || '', bijgewerkt: new Date().toISOString() };
    const vorige = wachtrij.get(id) || Promise.resolve();
    const taak = vorige.then(() => db.doc('oordelen/' + id).set(inhoud)).then(() => { if (wachtrij.get(id) === taak) bezig.delete(id); }, (fout) => {
      bezig.delete(id);
      if (fout && fout.code === 'invalid_argument') { alleenLezen = true; toonOpslag('lezen'); } else toonOpslag('fout');
    });
    wachtrij.set(id, taak);
  }, 700));
}
(async () => {
  try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch { db = null; }
  if (!db) return;
  toonOpslag('laden');
  let eerste = true;
  const klok = setTimeout(() => toonOpslag('traag'), 10000);
  db.collection('oordelen').onSnapshot((snap) => {
    const bevestigd = !snap.metadata.fromCache;
    if (bevestigd) { clearTimeout(klok); if (!alleenLezen) toonOpslag('gedeeld'); }
    const gezien = new Set();
    for (const d of snap.docs) {
      const g = d.data();
      gezien.add(d.id);
      if (!g || bezig.has(d.id) || !ALLE.some((a) => a.id === d.id)) continue;
      const o = van(d.id);
      if (o.stand !== g.stand || o.tekst !== g.tekst || (o.afdruk || '') !== (g.afdruk || '')) { o.stand = STAND[g.stand] ? g.stand : 'open'; o.tekst = String(g.tekst || ''); o.afdruk = g.afdruk || ''; werkBij(d.id); }
    }
    // Eén keer, bij het eerste bevestigde antwoord: wat al in deze browser stond en nog niet bij de pagina, erbij zetten.
    if (bevestigd && eerste) { eerste = false; for (const a of ALLE) { const o = van(a.id); if (!gezien.has(a.id) && (o.stand !== 'open' || o.tekst.trim())) schrijf(a.id); } }
    bewaarLokaal();
    toonStand();
  }, () => { clearTimeout(klok); db = null; toonOpslag('fout'); });
})();

// ---------- de kaarten ----------
function beeld(src, onderschrift, alt, leeg) {
  const f = maak('figure');
  f.append(src ? maak('img', { src, alt, loading: 'lazy' }) : maak('div', { class: 'geen' }, leeg), maak('figcaption', {}, onderschrift));
  return f;
}
function kaart(x) {
  const m = x.item, o = van(x.id);
  const k = maak('article', { class: 'kaart', id: 'k-' + x.id });
  k.dataset.stand = o.stand;
  const pil = maak('span', { class: 'pil oordeel' }, STAND[o.stand]);
  const pillen = maak('span', { class: 'pillen' });
  if (verouderd(x)) pillen.append(maak('span', { class: 'pil nieuw' }, 'Aangepast sinds uw oordeel'));
  else if (m.gewijzigd) pillen.append(maak('span', { class: 'pil nieuw' }, 'Gewijzigd deze ronde'));
  pillen.append(pil);
  k.append(maak('div', { class: 'kop' }, maak('h2', {}, m.naam), maak('span', { class: 'groep' }, m.groep), pillen));
  const beelden = maak('div', { class: 'beelden' });
  if (x.bron.heeftFotos) beelden.append(beeld(m.fotoUrl, 'Referentiefoto', 'Foto van ' + m.naam, 'Geen foto beschikbaar'));
  if (m.vorig) beelden.append(beeld(m.vorig, 'Onze 3D, vorige ronde', '3D van ' + m.naam + ', vorige ronde'));
  beelden.append(beeld(m.nu, 'Onze 3D nu (benadering)', '3D van ' + m.naam));
  k.append(beelden);
  if (m.omschrijving) k.append(maak('p', { class: 'omschrijving' }, m.omschrijving));
  const lijst = maak('dl');
  for (const [naam, waarde] of m.feiten) {
    const d = maak('div');
    const staal = m.kleur && /^(stof|kleur)$/i.test(naam) ? [maak('span', { class: 'staal', style: 'background:' + m.kleur })] : [];
    d.append(maak('dt', {}, naam), maak('dd', {}, ...staal, waarde));
    lijst.append(d);
  }
  k.append(lijst);
  if (m.bron) k.append(maak('p', { class: 'bron' + (/^Maten van de productpagina|fiche|opgemeten/i.test(m.bron) ? ' zeker' : '') }, 'Bron: ' + m.bron));
  const knoppen = maak('div', { class: 'rij', role: 'group', 'aria-label': 'Oordeel over ' + m.naam });
  const tekst = maak('textarea', { id: 'opm-' + x.id, placeholder: 'Wat moet anders? Bv. "armen smaller", "geen los zitkussen", "poten donkerder".', value: o.tekst, 'aria-label': 'Opmerking bij ' + m.naam });
  const zet = (s, focus) => {
    o.stand = s; o.afdruk = m.afdruk; bewaarLokaal(); schrijf(x.id);
    k.dataset.stand = s; pil.textContent = STAND[s];
    knoppen.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.stand === s)));
    pillen.querySelectorAll('.nieuw').forEach((p) => { if (p.textContent.startsWith('Aangepast')) p.remove(); });
    toonStand();
    if (focus) tekst.focus();
  };
  for (const s of ['akkoord', 'bijsturen', 'open']) {
    const b = maak('button', { type: 'button', id: 'knop-' + s + '-' + x.id }, STAND[s]);
    b.dataset.stand = s;
    b.setAttribute('aria-pressed', String(o.stand === s));
    b.addEventListener('click', () => zet(s, s === 'bijsturen'));
    knoppen.append(b);
  }
  tekst.addEventListener('input', () => { o.tekst = tekst.value; if (tekst.value.trim() && o.stand === 'open') zet('bijsturen', false); else { bewaarLokaal(); schrijf(x.id); } });
  k.append(knoppen, tekst);
  return k;
}
/** Een kaart opnieuw tekenen na een wijziging van elders (een ander toestel, Claude), zonder het typen te storen. */
function werkBij(id) {
  const oud = document.getElementById('k-' + id), x = ALLE.find((a) => a.id === id);
  if (!oud || !x || oud.contains(document.activeElement)) return;
  oud.replaceWith(kaart(x));
}
const vanBron = () => ALLE.filter((x) => x.bron.code === bronNu);
function toonStand() {
  const tel = (s) => vanBron().filter((x) => van(x.id).stand === s && !(s !== 'open' && verouderd(x))).length;
  const opnieuw = vanBron().filter(verouderd).length;
  document.getElementById('stand').replaceChildren(maak('b', {}, String(tel('akkoord'))), ' akkoord · ', maak('b', {}, String(tel('bijsturen'))), ' bijsturen · ', maak('b', {}, String(tel('open') + opnieuw)), ' nog te bekijken');
}
function toonLijst() {
  const zichtbaar = vanBron().filter((x) => filter === 'alles' || x.item.groep === filter || (filter === '@open' && (van(x.id).stand === 'open' || verouderd(x))) || (filter === '@bijsturen' && van(x.id).stand === 'bijsturen') || (filter === '@gewijzigd' && (x.item.gewijzigd || verouderd(x))));
  document.getElementById('lijst').replaceChildren(...(zichtbaar.length ? zichtbaar.map(kaart) : [maak('p', { class: 'leeg' }, 'Niets in deze keuze.')]));
  document.querySelectorAll('#filters button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
}
function toonBron() {
  document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bron === bronNu)));
  const groepen = [...new Set(vanBron().map((x) => x.item.groep))];
  const filters = document.getElementById('filters');
  filters.replaceChildren();
  const keuzes = [['alles', 'Alles'], ...(groepen.length > 1 ? groepen.map((g) => [g, g]) : []), ['@open', 'Nog te bekijken'], ['@bijsturen', 'Bijsturen'], ['@gewijzigd', 'Gewijzigd']];
  if (!keuzes.some(([w]) => w === filter)) filter = 'alles';
  for (const [waarde, label] of keuzes) {
    const b = maak('button', { type: 'button', id: 'filter-' + waarde.replace(/[^a-z0-9]+/gi, '-') }, label);
    b.dataset.filter = waarde;
    b.addEventListener('click', () => { filter = waarde; toonLijst(); });
    filters.append(b);
  }
  toonStand();
  toonLijst();
}
function tekstVanOpmerkingen() {
  const regels = ['Controleblad 3D, stand van ${datum}', ''];
  for (const b of BRONNEN) {
    const eigen = ALLE.filter((x) => x.bron === b);
    regels.push('== ' + b.titel + ' ==');
    for (const s of ['bijsturen', 'akkoord', 'open']) {
      const groep = eigen.filter((x) => van(x.id).stand === s);
      if (!groep.length) continue;
      regels.push(STAND[s].toUpperCase() + ' (' + groep.length + ')');
      for (const x of groep) {
        const t = van(x.id).tekst.trim().replace(/\\s*\\n\\s*/g, ' / ');
        regels.push('- ' + x.item.naam + (s === 'bijsturen' ? ': ' + (t || '(geen opmerking genoteerd)') : t ? ': ' + t : '') + (verouderd(x) ? ' [oordeel over een vorige versie]' : ''));
      }
    }
    regels.push('');
  }
  return regels.join('\\n').trim();
}
const tabs = document.getElementById('tabs');
tabs.hidden = BRONNEN.length < 2;
for (const b of BRONNEN) {
  const k = maak('button', { type: 'button', id: 'tab-' + b.code }, b.titel + ' (' + b.items.length + ')');
  k.dataset.bron = b.code;
  k.addEventListener('click', () => { bronNu = b.code; filter = 'alles'; toonBron(); });
  tabs.append(k);
}
document.getElementById('kopieer').addEventListener('click', async () => {
  const tekst = tekstVanOpmerkingen(), vak = document.getElementById('tekst'), melding = document.getElementById('melding');
  document.getElementById('uitvoer').hidden = false;
  vak.value = tekst;
  try { await navigator.clipboard.writeText(tekst); melding.textContent = 'Gekopieerd. Plak de tekst in het gesprek.'; }
  catch { vak.focus(); vak.select(); melding.textContent = 'Kopiëren lukt hier niet automatisch: de tekst is geselecteerd, kopieer ze met Ctrl + C (of ⌘ + C).'; }
  document.getElementById('uitvoer').scrollIntoView({ block: 'nearest' });
});
toonBron();
</script>
`;
mkdirSync(path.dirname(uit), { recursive: true });
writeFileSync(uit, html);
const fouten = [...new Set(werkbank.fouten)];
if (fouten.length) console.log(`Let op: de pagina gaf ${fouten.length} fout(en):\n  ${fouten.slice(0, 5).join('\n  ')}`);
const metFoto = bronnen.flatMap((b) => b.items).filter((i) => i.fotoUrl).length, gewijzigd = bronnen.flatMap((b) => b.items).filter((i) => i.gewijzigd).length;
console.log(`Controleblad: ${path.relative(process.cwd(), uit)} (${Math.round(html.length / 1024)} kB, ${aantal} items in ${bronnen.length} ${bronnen.length === 1 ? 'bron' : 'bronnen'}, ${metFoto} met foto, ${nieuw} nieuw getekend, ${gewijzigd} gewijzigd deze ronde${o['nieuwe-ronde'] ? '; nieuwe ronde gestart' : ''})`);
