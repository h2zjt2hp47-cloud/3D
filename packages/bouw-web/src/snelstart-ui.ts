/**
 * Snelstart: het eerste scherm van een nieuw ontwerp. Drie vragen (wat, hoe groot, welke stijl), elk met grote tegels
 * of grote − en + knoppen, zodat het met één vinger op een tablet vlot gaat. De derde tik (de stijl) maakt het ontwerp
 * en toont het meteen in 3D: een woning in de plattegrond (vrij verder te tekenen), een aanbouw als het model AANBOUW
 * (met één tik als ruimte tegen een woning in de plattegrond), een raam, deur of garagepoort in de configurator.
 * Tegels, maten en stijlen zijn gegevens (`core/voorbeelden/snelstart.ts`, `stijlen.ts`).
 */
import { standaardKeuzes } from '../../core/src/index.js';
import { garagepoort } from '../../core/voorbeelden/garagepoort.js';
import { dakCatalogus, gevelCatalogus } from '../../core/voorbeelden/inrichting.js';
import { RAL_KLEUREN } from '../../core/voorbeelden/raam.js';
import { aanbouwKeuzes, bestaandeWoning, leesMaat, SNELSTART_TEGELS, snelRaam, snelWoning, type SnelMaat, type SnelTegel } from '../../core/voorbeelden/snelstart.js';
import { stijlCatalogus, type Stijl } from '../../core/voorbeelden/stijlen.js';
import { $, el, getal } from './hulp.js';
import { legeToestand, nieuwePositie, nieuwProject, ramenToestand, type Positie, type Toestand } from './staat.js';

export interface SnelstartNav {
  /** Na een woning: de plattegrond in 3D. */
  naarWoning3D: () => void;
  /** Na een positie (aanbouw, raam, poort): de configurator in 3D. */
  naarPositie3D: (id: string) => void;
  /** Een aanbouw met gemeten maten (vrije vorm): de plattegrond met het paneel Ruimte met maten (maten in cm). */
  naarMaten: (maten: { breedte: number; diepte: number }) => void;
}

let nav: SnelstartNav;
let stap: 1 | 2 | 3 = 1;
let tegel: SnelTegel | undefined;
let maten: Record<string, number> = {};

// ---------- beelden (getekend uit de gegevens, zodat een eigen stijl of tegel vanzelf een beeld heeft) ----------

/** Pictogram van een tegel; een onbekende tegel krijgt een doos. */
function tegelBeeld(code: string): string {
  const lijn = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const tekening: Record<string, string> = {
    woning: `<path ${lijn} d="M14 54 L60 18 L106 54"/><path ${lijn} d="M24 47 V96 H96 V47"/><rect ${lijn} x="34" y="58" width="18" height="16"/><rect ${lijn} x="68" y="58" width="18" height="16"/><path ${lijn} d="M53 96 V80 H67 V96"/>`,
    aanbouw: `<path ${lijn} d="M10 50 L40 26 L70 50"/><path ${lijn} d="M18 44 V96 H62"/><path ${lijn} d="M62 60 H110 V96 H62 Z"/><rect ${lijn} x="70" y="68" width="32" height="28"/><path ${lijn} d="M86 68 V96"/><rect ${lijn} x="78" y="54" width="12" height="6"/>`,
    raam: `<rect ${lijn} x="28" y="20" width="64" height="76"/><path ${lijn} d="M60 20 V96"/><path ${lijn} d="M88 24 L64 58 L88 92"/><path ${lijn} d="M20 96 H100"/>`,
    garagepoort: `<path ${lijn} d="M16 40 L60 18 L104 40 V96 H16 Z"/><rect ${lijn} x="28" y="48" width="64" height="48"/><path ${lijn} d="M28 60 H92 M28 72 H92 M28 84 H92"/>`,
  };
  return `<svg viewBox="0 0 120 110" aria-hidden="true">${tekening[code] ?? `<rect ${lijn} x="24" y="30" width="72" height="60"/>`}</svg>`;
}

const ralHex = (code: string) => RAL_KLEUREN.find((k) => k.code === code)?.hex ?? '#383e42';

/** Een woninkje in de stijl: gevel (met voegen of planken), plint, dakvorm en bedekking, ramen in de kleur van het schrijnwerk. */
export function stijlBeeld(s: Stijl): string {
  const mat = (k: { materiaal: string; kleur: string; voeg?: string }) => {
    const m = gevelCatalogus[k.materiaal];
    const kleur = m?.kleuren[k.kleur]?.hex ?? '#cfccc4';
    const voeg = m?.voegen?.[k.voeg ?? '']?.hex ?? '#cfc8bb';
    return { soort: m?.soort ?? 'gevel', kleur, voeg };
  };
  const g = mat(s.gevel), v = s.verdieping ? mat(s.verdieping) : g;
  const dak = dakCatalogus[s.dak.bedekking.materiaal]?.kleuren[s.dak.bedekking.kleur]?.hex ?? '#3d3e40';
  const raam = ralHex(s.schrijnwerk.kleur_buiten);
  const id = `st${Math.random().toString(36).slice(2, 7)}`;
  const patroon = (naam: string, x: { soort: string; kleur: string; voeg: string }) => {
    const p: Record<string, [number, number, string]> = { steen: [12, 6, 'M0 0H12M0 3H12M0 0V3M6 3V6'], planken: [5, 40, 'M0 0V40'], planken_h: [40, 5, 'M0 0H40'], leien: [10, 6, 'M0 0H10M0 3H10'], zink: [8, 40, 'M0 0V40'] };
    const q = p[x.soort];
    const lijn = x.soort === 'steen' ? x.voeg : 'rgba(0,0,0,.28)';
    return q ? `<pattern id="${id}${naam}" patternUnits="userSpaceOnUse" width="${q[0]}" height="${q[1]}"><rect width="${q[0]}" height="${q[1]}" fill="${x.kleur}"/><path d="${q[2]}" stroke="${lijn}" stroke-width=".8" fill="none"/></pattern>` : '';
  };
  const vul = (naam: string, x: { soort: string; kleur: string }) => (['steen', 'planken', 'planken_h', 'leien', 'zink'].includes(x.soort) ? `url(#${id}${naam})` : x.kleur);
  const vorm = s.dak.vorm;
  const dakPad = vorm === 'zadel' ? 'M22 50 L80 16 L138 50 Z' : vorm === 'lessenaar' ? 'M24 50 L24 26 L136 42 L136 50 Z' : 'M28 44 H132 V50 H28 Z';
  const ramen = [[44, 58], [96, 58], [44, 82]].map(([x, y]) => `<rect x="${x}" y="${y}" width="20" height="16" fill="#cfdde1" stroke="${raam}" stroke-width="2.4"/>`).join('');
  const sokkel = s.sokkel ? `<rect x="30" y="100" width="100" height="4" fill="${gevelCatalogus[s.sokkel.materiaal]?.kleuren[s.sokkel.kleur]?.hex ?? '#5d6366'}"/>` : '';
  return `<svg viewBox="0 0 160 116" aria-hidden="true"><defs>${patroon('g', g)}${patroon('v', v)}</defs>
    <rect width="160" height="116" fill="#e4ecef"/><rect y="104" width="160" height="12" fill="#9fb48a"/>
    <rect x="30" y="50" width="100" height="54" fill="${vul('g', g)}"/><rect x="30" y="50" width="100" height="27" fill="${vul('v', v)}"/>${sokkel}
    <path d="${dakPad}" fill="${dak}"/>${ramen}<rect x="92" y="80" width="16" height="24" fill="${raam}"/></svg>`;
}

// ---------- tonen ----------

const toonWaarde = (m: SnelMaat, w: number) => {
  if (m.toon === 'aantal') return String(w);
  const cm = m.eenheid === 'mm' ? w / 10 : w;
  // Zonder scheidingsteken voor duizendtallen: "1.600" zou als 1,6 m gelezen worden.
  return m.toon === 'm' ? `${getal(cm / 100, 2)} m` : String(Math.round(cm));
};
const eenheidTekst = (m: SnelMaat) => (m.toon === 'cm' ? 'cm' : '');
/** Binnen min en max, op een hele cm (of een heel aantal). */
const begrens = (m: SnelMaat, w: number) => { const s = m.eenheid === 'mm' ? 10 : 1; return Math.min(m.max, Math.max(m.min, Math.round(w / s) * s)); };

function zetKop(titel: string, uitleg: string) {
  $('#ss-titel').textContent = titel;
  $('#ss-uitleg').textContent = uitleg;
  for (const li of document.querySelectorAll<HTMLElement>('#ss-stappen li')) li.setAttribute('aria-current', String(Number(li.dataset.stap) === stap ? 'step' : false));
  $('#ss-terug').hidden = stap === 1;
  $('#ss-verder').hidden = stap !== 2;
}

function toonStap1() {
  stap = 1;
  zetKop('Wat wil je tonen?', 'Tik op wat de klant laat bouwen. Daarna de maat en een stijl: dan staat er meteen een volledig ontwerp in 3D.');
  $('#ss-inhoud').replaceChildren(...[el('div', { class: 'snel-tegels' })].map((rij) => {
    for (const t of SNELSTART_TEGELS) {
      const b = el('button', { type: 'button', class: 'snel-tegel', 'data-snel': t.code });
      const beeld = el('span', { class: 'snel-beeld' });
      beeld.innerHTML = tegelBeeld(t.code);
      b.append(beeld, el('strong', {}, t.label), el('span', { class: 'klein' }, t.uitleg));
      b.addEventListener('click', () => {
        tegel = t;
        maten = Object.fromEntries(t.maten.map((m) => [m.code, m.standaard]));
        toonStap2();
      });
      rij.append(b);
    }
    return rij;
  }));
}

function toonStap2() {
  if (!tegel) return toonStap1();
  stap = 2;
  zetKop(`${tegel.label}: hoe groot?`, 'Gangbare maten staan al ingevuld. Tik op − of +, of typ de maat in cm (4,5 m mag ook). Fijner afstellen kan daarna.');
  const vak = el('div', { class: 'snel-maten' });
  for (const m of tegel.maten) {
    const rij = el('div', { class: 'snel-maat' });
    // Een groot veld met het cijfertoetsenbord van de tablet; een maat in cm (of "4,5 m").
    const invoer = el('input', { type: 'text', inputmode: 'numeric', enterkeyhint: 'done', autocomplete: 'off', 'aria-label': `${m.label}${eenheidTekst(m) ? ` in ${eenheidTekst(m)}` : ''}`, 'data-snel-maat': m.code }) as HTMLInputElement;
    const meter = el('span', { class: 'klein snel-meter', 'aria-hidden': 'true' });
    const zet = (w: number) => { maten[m.code] = begrens(m, w); invoer.value = toonWaarde(m, maten[m.code]!); meter.textContent = m.toon === 'cm' ? `= ${getal((m.eenheid === 'mm' ? maten[m.code]! / 10 : maten[m.code]!) / 100, 2)} m` : ''; min.disabled = maten[m.code]! <= m.min; plus.disabled = maten[m.code]! >= m.max; };
    const min = el('button', { type: 'button', class: 'snel-knop', 'aria-label': `${m.label} kleiner`, 'data-snel-min': m.code }, '−') as HTMLButtonElement;
    const plus = el('button', { type: 'button', class: 'snel-knop', 'aria-label': `${m.label} groter`, 'data-snel-plus': m.code }, '+') as HTMLButtonElement;
    min.addEventListener('click', () => zet(maten[m.code]! - m.stap));
    plus.addEventListener('click', () => zet(maten[m.code]! + m.stap));
    invoer.addEventListener('change', () => { const w = leesMaat(invoer.value, m); zet(w ?? maten[m.code]!); });
    invoer.addEventListener('focus', () => invoer.select());
    const waarde = el('span', { class: 'snel-waarde' });
    waarde.append(invoer, el('span', { class: 'eenheid' }, eenheidTekst(m)));
    const naam = el('span', { class: 'snel-maat-naam' });
    naam.append(el('span', {}, m.label), meter);
    rij.append(naam, min, waarde, plus);
    vak.append(rij);
    zet(maten[m.code] ?? m.standaard);
  }
  $('#ss-inhoud').replaceChildren(vak);
  if (tegel.soort === 'aanbouw') {
    // Een andere vorm (een schuine zijmuur) of een andere plaats: de bestaande woning in de plattegrond, en daar de aanbouw
    // met de maten van de muren in cm (paneel Ruimte met maten).
    const b = el('button', { type: 'button', class: 'tweede snel-metmaten', id: 'ss-maten' }, 'Andere vorm of plaats (schuine muur): teken met maten in de plattegrond');
    b.addEventListener('click', () => {
      const s = Object.values(stijlCatalogus)[0]!;
      const { plan, posities } = bestaandeWoning(aanbouwKeuzes(maten, s));
      const basis = legeToestand();
      const t: Toestand = { plan, posities: posities as Positie[], meta: { ...basis.meta, regels: { ...basis.meta.regels, gevel: true, dak: true } } };
      nieuwProject(t, `Aanbouw met maten, ${meter(maten.breedte! / 10)} × ${meter(maten.diepte! / 10)} m`);
      nav.naarMaten({ breedte: Math.round(maten.breedte! / 10), diepte: Math.round(maten.diepte! / 10) });
    });
    $('#ss-inhoud').append(b);
  }
}

function toonStap3() {
  if (!tegel) return toonStap1();
  stap = 3;
  zetKop('Welke stijl?', 'Eén tik zet gevel, kleur van de ramen, dak, vloer en binnenkleur. Alles blijft daarna aan te passen.');
  const rij = el('div', { class: 'snel-tegels snel-stijlen' });
  for (const [code, s] of Object.entries(stijlCatalogus)) {
    const b = el('button', { type: 'button', class: 'snel-tegel snel-stijl', 'data-stijl': code });
    const beeld = el('span', { class: 'snel-stijlbeeld' });
    beeld.innerHTML = stijlBeeld(s);
    b.append(beeld, el('strong', {}, s.label), el('span', { class: 'klein' }, s.uitleg));
    b.addEventListener('click', () => maak(s));
    rij.append(b);
  }
  $('#ss-inhoud').replaceChildren(rij);
}

// ---------- het ontwerp maken ----------

const meter = (cm: number) => getal(cm / 100, 2).replace(/,00$/, '');

function maak(s: Stijl) {
  if (!tegel) return;
  const basis = legeToestand();
  const meta = { ...basis.meta, regels: { ...basis.meta.regels, gevel: true, dak: true } };
  if (tegel.soort === 'woning') {
    const { plan, posities } = snelWoning(maten, s);
    const t: Toestand = { plan, posities: posities as Positie[], meta };
    nieuwProject(t, `Woning ${meter(maten.breedte!)} × ${meter(maten.diepte!)} m, ${s.label.toLowerCase()}`);
    nav.naarWoning3D();
    return;
  }
  if (tegel.soort === 'aanbouw') {
    const p = nieuwePositie('AANBOUW', aanbouwKeuzes(maten, s), 'Aanbouw');
    nieuwProject({ ...basis, meta, posities: [p] }, `Aanbouw ${meter(maten.breedte! / 10)} × ${meter(maten.diepte! / 10)} m, ${s.label.toLowerCase()}`);
    nav.naarPositie3D(p.id);
    return;
  }
  // Eén positie zonder woning: een raam of deur, of een garagepoort.
  const leeg = ramenToestand();
  const p = tegel.model === 'POORT'
    ? nieuwePositie('POORT', { ...standaardKeuzes(garagepoort), breedte: maten.breedte!, hoogte: maten.hoogte!, kleur: s.poort }, 'Garagepoort')
    : nieuwePositie('RAAM', snelRaam(maten, s), 'Raam');
  p.aantal = Math.max(1, Math.round(maten.aantal ?? 1));
  nieuwProject({ ...leeg, posities: [p] }, `${tegel.label} ${getal(maten.breedte! / 10)} × ${getal(maten.hoogte! / 10)} cm`);
  nav.naarPositie3D(p.id);
}

/** Toont de snelstart vanaf de eerste vraag. */
export function toonSnelstart() {
  tegel = undefined;
  maten = {};
  toonStap1();
}

export function startSnelstart(n: SnelstartNav) {
  nav = n;
  $('#ss-terug').addEventListener('click', () => (stap === 3 ? toonStap2() : toonStap1()));
  $('#ss-verder').addEventListener('click', () => toonStap3());
}
