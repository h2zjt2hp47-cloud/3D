// Belgica: het scherm, de klok en de bediening.
import { kaart, TERREIN } from './kaart/kaart';
import { datumTekst, seizoenVan } from './spel/kalender';
import { geefBevel, roepOp, splits, voegSamen } from './spel/regels';
import { nieuwSpel, STAMMEN } from './spel/romeinen';
import { bevriend, inOorlog, legersIn, vakkenVan, type Leger, type Toestand } from './spel/toestand';
import { kies, score, spelerOpstand, vasteGebeurtenissen, volgendeDag } from './spel/verloop';
import { Kaartbeeld, kort, type Selectie } from './ui/kaartbeeld';

const OPSLAG = 'belgica-spel-1';
const DAGEN_PER_SECONDE = [0, 1, 3, 8, 20, 60];

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const canvas = $<HTMLCanvasElement>('#kaart');
const beeld = new Kaartbeeld(canvas, kaart);

let t: Toestand | null = null;
let snelheid = 0;
let laatsteSnelheid = 2;
let opgespaard = 0;
const sel: Selectie = { legers: [], vak: null };
let paneelVuil = true;

// ---------- opslaan ----------
function bewaar() {
  if (!t) return;
  try { localStorage.setItem(OPSLAG, JSON.stringify(t)); } catch { /* geen opslag beschikbaar */ }
}
function laadBewaard(): Toestand | null {
  try {
    const s = localStorage.getItem(OPSLAG);
    if (!s) return null;
    const x = JSON.parse(s) as Toestand;
    return x.versie === 1 ? x : null;
  } catch { return null; }
}

// ---------- startscherm ----------
function toonStart() {
  const start = $('#start');
  const groepen: [string, string[]][] = [
    ['Rome en bondgenoten', ['rome', 'remi']],
    ['De bond van de Belgen', ['suessiones', 'nerviers', 'eburonen', 'aduatuci', 'atrebaten', 'menapiers', 'morinen', 'viromandui', 'condrusi']],
    ['Afzijdig', ['treveri']],
  ];
  const bewaard = laadBewaard();
  start.innerHTML = `
    <div class="start-binnen">
      <h1>Belgica</h1>
      <p class="onder">Van de Romeinen tot nu. Eerste tijdperk: <b>Caesar tegen de Belgen, 57 v.Chr.</b></p>
      ${bewaard ? `<button class="hoofd" id="verder">Verder spelen als ${bewaard.facties[bewaard.speler].naam} (${datumTekst(bewaard.dag)})</button>` : ''}
      <p class="kies">Kies wie je speelt:</p>
      ${groepen.map(([titel, ids]) => `
        <h2>${titel}</h2>
        <div class="stammen">${ids.map((id) => `
          <button class="stam" data-id="${id}">
            <span class="kleur" style="background:${STAMMEN[id].kleur}"></span>
            <span><b>${STAMMEN[id].naam}</b> <small>${STAMMEN[id].heerser}</small><br><span class="uitleg">${STAMMEN[id].beschrijving}</span></span>
          </button>`).join('')}
        </div>`).join('')}
      <p class="noot">Gebieden, versterkingen, aantallen en data zijn benaderingen en nog na te kijken. Kaart: Natural Earth (publiek domein), aangevuld met de hand.</p>
    </div>`;
  start.hidden = false;
  start.querySelectorAll<HTMLButtonElement>('.stam').forEach((b) => b.addEventListener('click', () => begin(nieuwSpel(b.dataset.id!, Math.floor(Math.random() * 1e9)))));
  $('#verder')?.addEventListener('click', () => begin(bewaard!));
}

function begin(nieuw: Toestand) {
  t = nieuw;
  $('#start').hidden = true;
  sel.legers = []; sel.vak = null;
  snelheid = 0;
  beeld.pasGrootteAan();
  beeld.toonAlles();
  // begin dicht bij je eigen land
  const eigen = vakkenVan(t, t.speler);
  const plek = eigen.length ? eigen : t.legers.filter((l) => l.factie === t!.speler).map((l) => l.vak);
  if (plek.length) {
    beeld.camera.x = plek.reduce((s, v) => s + kaart.vakken[v].midden[0], 0) / plek.length;
    beeld.camera.y = plek.reduce((s, v) => s + kaart.vakken[v].midden[1], 0) / plek.length;
    beeld.camera.schaal *= 1.6;
  }
  vasteGebeurtenissen(t, kaart);
  paneelVuil = true;
  toonKeuze();
}

// ---------- klok ----------
function zetSnelheid(s: number) {
  if (!t) return;
  if (s > 0 && t.wachtend.length) { toonKeuze(); return; }
  snelheid = s;
  if (s > 0) laatsteSnelheid = s;
  else bewaar();
  paneelVuil = true;
}

let vorige = performance.now();
function frame(nu: number) {
  const dt = Math.min(250, nu - vorige);
  vorige = nu;
  if (t && snelheid > 0) {
    opgespaard += (dt / 1000) * DAGEN_PER_SECONDE[snelheid];
    let n = 0;
    while (opgespaard >= 1 && n < 30) {
      opgespaard -= 1;
      n++;
      const verder = volgendeDag(t, kaart);
      sel.legers = sel.legers.filter((id) => t!.legers.some((l) => l.id === id));
      if (!verder) { snelheid = 0; opgespaard = 0; toonKeuze(); bewaar(); break; }
      if (t.dag % 60 === 0) bewaar();
    }
    if (n) paneelVuil = true;
  }
  if (t) {
    beeld.teken(t, sel, nu);
    if (paneelVuil) { werkBalkBij(); werkPaneelBij(); werkBerichtenBij(); paneelVuil = false; }
  }
  requestAnimationFrame(frame);
}

// ---------- bovenbalk ----------
function werkBalkBij() {
  if (!t) return;
  const f = t.facties[t.speler];
  const s = score(t, t.speler);
  const seizoen = seizoenVan(t.dag);
  $('#balk').innerHTML = `
    <div class="wie"><span class="kleur" style="background:${f.kleur}"></span><span><b>${f.naam}</b><small>${f.heerser}${f.heer ? ` · onderworpen aan ${t.facties[f.heer].naam}` : ''}</small></span></div>
    <div class="klok">
      <button class="speel" title="Spatie">${snelheid ? '⏸' : '▶'}</button>
      <div class="datum"><b>${datumTekst(t.dag)}</b><small>${seizoen}</small></div>
      <div class="snelheden">${[1, 2, 3, 4, 5].map((n) => `<button data-s="${n}" class="${(snelheid || -1) === n ? 'aan' : ''}" title="Snelheid ${n} (toets ${n})">${'›'.repeat(Math.min(n, 3))}${n > 3 ? n : ''}</button>`).join('')}</div>
    </div>
    <div class="cijfers">
      <span title="Mannen die je nog kan oproepen">🛡️ ${kort(f.mankracht)}</span>
      <span title="Welvaart">🌾 ${s.welvaart}</span>
      <span title="Macht">⚔️ ${s.macht}</span>
      <span title="Vrijheid">🕊️ ${s.vrijheid}</span>
    </div>
    <div class="knoppen">
      <button id="soort">${beeld.soort === 'politiek' ? 'Terrein' : 'Volken'}</button>
      <button id="menu">Menu</button>
    </div>`;
  $('#balk .speel').addEventListener('click', () => zetSnelheid(snelheid ? 0 : laatsteSnelheid));
  $('#balk').querySelectorAll<HTMLButtonElement>('[data-s]').forEach((b) => b.addEventListener('click', () => zetSnelheid(Number(b.dataset.s))));
  $('#soort').addEventListener('click', () => { beeld.soort = beeld.soort === 'politiek' ? 'terrein' : 'politiek'; paneelVuil = true; });
  $('#menu').addEventListener('click', toonMenu);
}

function toonMenu() {
  zetSnelheid(0);
  venster('Menu', `<p>Het spel wordt vanzelf bewaard in deze browser.</p>`, [
    ['Verder', () => {}],
    ['Nieuw spel', () => { t = null; toonStart(); }],
    ['Uitleg', toonUitleg],
  ]);
}

function toonUitleg() {
  venster('Hoe speel je?', `
    <ul>
      <li><b>Klik</b> op een leger (de gekleurde fiche) om het te kiezen. <b>Shift+klik</b> kiest er meer.</li>
      <li><b>Rechtsklik</b> (of <b>Ctrl+klik</b>) op een vak stuurt de gekozen legers erheen.</li>
      <li>Sleep om de kaart te verschuiven, scroll of knijp om in en uit te zoomen.</li>
      <li><b>Spatie</b> zet de klok stil of verder; <b>1 tot 5</b> kiest de snelheid.</li>
      <li>Een leger in vijandelijk land bezet het vak na een tijd. Een versterking moet je belegeren tot het garnizoen op is.</li>
      <li>Legers met lage moraal (de balk onder de fiche) trekken zich terug. Op eigen grond herstellen ze.</li>
      <li>Te veel soldaten in één vak raken uitgeput, zeker in de winter.</li>
      <li>Verlies je je hoofdplaats en de helft van je land, dan kan je je onderwerpen aan Rome. Verdwijnt je volk, dan speel je verder als wie je land heeft.</li>
    </ul>`, [['Sluiten', () => {}]]);
}

// ---------- zijpaneel ----------
function werkPaneelBij() {
  const p = $('#paneel');
  if (!t) { p.hidden = true; return; }
  const gekozen = sel.legers.map((id) => t!.legers.find((l) => l.id === id)).filter((l): l is Leger => !!l);
  if (gekozen.length) { p.hidden = false; p.innerHTML = legerPaneel(gekozen); koppelLegerKnoppen(gekozen); return; }
  if (sel.vak !== null) { p.hidden = false; p.innerHTML = vakPaneel(sel.vak); koppelVakKnoppen(sel.vak); return; }
  const f = t.facties[t.speler];
  p.hidden = false;
  p.innerHTML = `
    <h3>${f.naam}</h3>
    <p class="klein">${f.beschrijving}</p>
    <p>${vakkenVan(t, f.id).length} vakken · ${t.legers.filter((l) => l.factie === f.id).length} legers</p>
    ${f.heer ? `<button id="opstand" class="gevaar">In opstand komen tegen ${t.facties[f.heer].naam}</button>` : ''}
    <p class="klein">Klik op een leger of een vak. <a href="#" id="uitleg">Hoe speel je?</a></p>`;
  $('#uitleg').addEventListener('click', (e) => { e.preventDefault(); toonUitleg(); });
  $('#opstand')?.addEventListener('click', () => { if (spelerOpstand(t!, kaart)) paneelVuil = true; });
}

function legerPaneel(legers: Leger[]): string {
  const totaal = legers.reduce((s, l) => s + l.sterkte, 0);
  const eigen = legers.every((l) => l.factie === t!.speler);
  const l = legers[0];
  const f = t!.facties[l.factie];
  const status = (x: Leger) => x.inStrijd ? 'in de strijd' : x.pad.length ? `onderweg naar ${kaart.vakken[x.pad[x.pad.length - 1]].naam}` : t!.vakken[x.vak].bezetter === x.factie ? (t!.vakken[x.vak].fort && t!.vakken[x.vak].garnizoen > 0 ? 'belegert de versterking' : `bezet het vak (${Math.round(t!.vakken[x.vak].bezetting * 100)}%)`) : 'staat stil';
  const zelfdeVak = eigen && legers.length > 1 && legers.every((x) => x.vak === l.vak);
  const anderenHier = eigen && legers.length === 1 ? legersIn(t!, l.vak).filter((x) => x.factie === l.factie && x.id !== l.id) : [];
  return `
    <h3><span class="kleur" style="background:${f.kleur}"></span>${legers.length > 1 ? `${legers.length} legers` : l.naam}</h3>
    <p>${f.naam} · ${kort(totaal)} man</p>
    ${legers.map((x) => `<div class="leger"><div>${kort(x.sterkte)} · ${kaart.vakken[x.vak].naam}<br><small>${status(x)}</small></div><div class="moraal" title="Moraal ${Math.round(x.moraal * 100)}%"><i style="width:${x.moraal * 100}%"></i></div></div>`).join('')}
    ${eigen ? `
      <p class="klein">Rechtsklik, Ctrl+klik of lang drukken op een vak om erheen te trekken.</p>
      <div class="rij">
        <button id="bestemming" class="hoofd">Kies bestemming</button>
        ${legers.length === 1 ? `<button id="splits" ${l.sterkte < 1000 || l.inStrijd ? 'disabled' : ''}>Splitsen</button>` : ''}
        ${zelfdeVak ? `<button id="samen">Samenvoegen</button>` : ''}
        ${anderenHier.length ? `<button id="samenHier">Samenvoegen met ${anderenHier.length} hier</button>` : ''}
        <button id="stop">Stoppen</button>
      </div>` : `<p class="klein">${inOorlog(t!, l.factie, t!.speler) ? 'Vijand.' : bevriend(t!, l.factie, t!.speler) ? 'Bondgenoot.' : 'Neutraal.'}</p>`}`;
}

function koppelLegerKnoppen(legers: Leger[]) {
  $('#bestemming')?.addEventListener('click', () => { doelModus = true; melding('Tik of klik nu op het vak waar de legers heen moeten.'); });
  $('#splits')?.addEventListener('click', () => { const n = splits(t!, legers[0]); if (n) sel.legers = [legers[0].id, n.id]; paneelVuil = true; });
  $('#samen')?.addEventListener('click', () => { const r = voegSamen(t!, legers); if (r) sel.legers = [r.id]; paneelVuil = true; });
  $('#samenHier')?.addEventListener('click', () => {
    const l = legers[0];
    const r = voegSamen(t!, [l, ...legersIn(t!, l.vak).filter((x) => x.factie === l.factie && x.id !== l.id)]);
    if (r) sel.legers = [r.id];
    paneelVuil = true;
  });
  $('#stop')?.addEventListener('click', () => { for (const l of legers) { l.pad = []; l.voortgang = 0; } paneelVuil = true; });
}

function vakPaneel(i: number): string {
  const v = kaart.vakken[i], s = t!.vakken[i];
  const e = t!.facties[s.eigenaar];
  const eigen = s.eigenaar === t!.speler && !e.heer;
  const legers = legersIn(t!, i);
  const mk = t!.facties[t!.speler].mankracht;
  return `
    <h3><span class="kleur" style="background:${e.kleur}"></span>${v.naam}</h3>
    <p class="klein">Vandaag: ${v.gebied}</p>
    <table>
      <tr><td>Eigenaar</td><td>${e.naam}${e.heer ? ` (onder ${t!.facties[e.heer].naam})` : ''}</td></tr>
      <tr><td>Oorspronkelijk</td><td>${t!.facties[s.oorsprong].naam}</td></tr>
      <tr><td>Terrein</td><td>${TERREIN[v.terrein].naam}${v.rivier ? ', aan een rivier' : ''}${v.kust ? ', aan zee' : ''}</td></tr>
      <tr><td>Bevolking</td><td>${s.bevolking.toLocaleString('nl-BE')}</td></tr>
      <tr><td>Verdediging</td><td>×${TERREIN[v.terrein].verdediging.toFixed(2).replace('.', ',')}</td></tr>
      ${s.fort ? `<tr><td>Versterking</td><td>${s.fortNaam}: ${Math.round(s.garnizoen)} / ${s.fort}</td></tr>` : ''}
      ${s.bezetter ? `<tr><td>Bezetting</td><td>${t!.facties[s.bezetter].naam}, ${Math.round(s.bezetting * 100)}%</td></tr>` : ''}
      <tr><td>Legers</td><td>${legers.length ? legers.map((l) => `${t!.facties[l.factie].naam} ${kort(l.sterkte)}`).join('<br>') : 'geen'}</td></tr>
    </table>
    ${eigen ? `
      <p class="klein">Oproepen (je hebt ${kort(mk)} man):</p>
      <div class="rij">${[2000, 5000].map((n) => `<button data-op="${n}" ${mk < n ? 'disabled' : ''}>${kort(n)} oproepen</button>`).join('')}</div>` : ''}`;
}

function koppelVakKnoppen(i: number) {
  document.querySelectorAll<HTMLButtonElement>('[data-op]').forEach((b) => b.addEventListener('click', () => {
    const l = roepOp(t!, t!.speler, i, Number(b.dataset.op));
    if (l) { sel.legers = [l.id]; sel.vak = null; }
    paneelVuil = true;
  }));
}

// ---------- berichten ----------
function werkBerichtenBij() {
  if (!t) return;
  const laatste = t.berichten.slice(-6).reverse();
  $('#berichten').innerHTML = laatste.map((b, i) => `<div class="bericht ${b.soort}" data-i="${i}"><small>${datumTekst(b.dag)}</small> ${b.tekst}</div>`).join('');
  $('#berichten').querySelectorAll<HTMLElement>('.bericht').forEach((el) => el.addEventListener('click', () => {
    const b = laatste[Number(el.dataset.i)];
    if (b.vak !== undefined) { beeld.camera.x = kaart.vakken[b.vak].midden[0]; beeld.camera.y = kaart.vakken[b.vak].midden[1]; sel.vak = b.vak; sel.legers = []; paneelVuil = true; }
  }));
}

// ---------- vensters ----------
function venster(titel: string, html: string, knoppen: [string, () => void][]) {
  const v = $('#venster');
  v.innerHTML = `<div class="venster-binnen"><h2>${titel}</h2><div>${html}</div><div class="rij">${knoppen.map(([k], i) => `<button data-k="${i}" class="${i === 0 ? 'hoofd' : ''}">${k}</button>`).join('')}</div></div>`;
  v.hidden = false;
  v.querySelectorAll<HTMLButtonElement>('[data-k]').forEach((b) => b.addEventListener('click', () => {
    v.hidden = true;
    knoppen[Number(b.dataset.k)][1]();
  }));
}

function toonKeuze() {
  if (!t || !t.wachtend.length) return;
  const k = t.wachtend[0];
  venster(k.titel, `<p>${k.tekst}</p>`, k.opties.map((o, i) => [o.tekst, () => {
    kies(t!, kaart, k.id, i);
    paneelVuil = true;
    if (t!.wachtend.length) toonKeuze();
  }]));
}

// ---------- muis, toetsen, aanraking ----------
let sleep: { x: number; y: number; cx: number; cy: number; bewogen: boolean } | null = null;
const vingers = new Map<number, { x: number; y: number }>();
let knijp: { afstand: number; schaal: number } | null = null;
let lang = 0;
let langGedaan = false;
/** na een tik op "Kies bestemming" is de volgende klik een bevel */
let doelModus = false;

function plek(e: PointerEvent | MouseEvent): [number, number] {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  canvas.setPointerCapture(e.pointerId);
  vingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (vingers.size === 2) {
    const [a, b] = [...vingers.values()];
    knijp = { afstand: Math.hypot(a.x - b.x, a.y - b.y), schaal: beeld.camera.schaal };
    sleep = null;
    clearTimeout(lang);
    return;
  }
  sleep = { x: e.clientX, y: e.clientY, cx: beeld.camera.x, cy: beeld.camera.y, bewogen: false };
  langGedaan = false;
  if (e.pointerType === 'touch') {
    // lang drukken stuurt de gekozen legers
    const [x, y] = plek(e);
    clearTimeout(lang);
    lang = window.setTimeout(() => {
      if (sleep && !sleep.bewogen && sel.legers.length) { langGedaan = true; beveel(x, y); }
    }, 550);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (vingers.has(e.pointerId)) vingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (knijp && vingers.size === 2) {
    const [a, b] = [...vingers.values()];
    const r = canvas.getBoundingClientRect();
    const nieuw = knijp.schaal * (Math.hypot(a.x - b.x, a.y - b.y) / knijp.afstand);
    beeld.zoom(nieuw / beeld.camera.schaal, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    return;
  }
  if (!sleep) return;
  const dx = e.clientX - sleep.x, dy = e.clientY - sleep.y;
  if (Math.hypot(dx, dy) > 6) { sleep.bewogen = true; clearTimeout(lang); }
  if (sleep.bewogen) {
    beeld.camera.x = sleep.cx - dx / beeld.camera.schaal;
    beeld.camera.y = sleep.cy - dy / beeld.camera.schaal;
  }
});
const loslaten = (e: PointerEvent) => {
  vingers.delete(e.pointerId);
  if (vingers.size < 2) knijp = null;
};
canvas.addEventListener('pointercancel', (e) => { loslaten(e); sleep = null; clearTimeout(lang); });
canvas.addEventListener('pointerup', (e) => {
  loslaten(e);
  clearTimeout(lang);
  const s = sleep;
  sleep = null;
  if (!s || s.bewogen || !t || langGedaan) return;
  const [x, y] = plek(e);
  if (e.ctrlKey || doelModus) { doelModus = false; beveel(x, y); return; }
  const leger = beeld.legerOp(x, y);
  if (leger !== null) {
    const l = t.legers.find((q) => q.id === leger)!;
    if (e.shiftKey && l.factie === t.speler) sel.legers = sel.legers.includes(leger) ? sel.legers.filter((q) => q !== leger) : [...sel.legers.filter((q) => t!.legers.find((z) => z.id === q)?.factie === t!.speler), leger];
    else sel.legers = [leger];
    sel.vak = null;
  } else {
    sel.legers = [];
    sel.vak = beeld.vakOp(x, y);
  }
  paneelVuil = true;
});
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (langGedaan) return;
  const [x, y] = plek(e);
  beveel(x, y);
});

function beveel(x: number, y: number) {
  if (!t) return;
  const naar = beeld.vakOp(x, y);
  if (naar === null) return;
  const eigen = sel.legers.map((id) => t!.legers.find((l) => l.id === id)).filter((l): l is Leger => !!l && l.factie === t!.speler);
  let gelukt = false;
  for (const l of eigen) gelukt = geefBevel(t, kaart, l, naar) || gelukt;
  if (eigen.length && !gelukt) melding(`Daar kan je niet naartoe: ${kaart.vakken[naar].naam} is van een neutraal volk of onbereikbaar.`);
  paneelVuil = true;
}

let meldingKlok = 0;
function melding(tekst: string) {
  const m = $('#melding');
  m.textContent = tekst;
  m.hidden = false;
  clearTimeout(meldingKlok);
  meldingKlok = window.setTimeout(() => (m.hidden = true), 3000);
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
  beeld.zoom(f, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (!t || !$('#venster').hidden || !$('#start').hidden) return;
  if (e.key === ' ') { e.preventDefault(); zetSnelheid(snelheid ? 0 : laatsteSnelheid); }
  else if (/^[1-5]$/.test(e.key)) zetSnelheid(Number(e.key));
  else if (e.key === 'Escape') { sel.legers = []; sel.vak = null; doelModus = false; paneelVuil = true; }
});

window.addEventListener('resize', () => { beeld.pasGrootteAan(); });
window.addEventListener('beforeunload', bewaar);

// spelers en testen kunnen erbij
(window as unknown as { __belgica: unknown }).__belgica = { get t() { return t; }, beeld, zetSnelheid, begin, nieuwSpel };

beeld.pasGrootteAan();
toonStart();
requestAnimationFrame(frame);
