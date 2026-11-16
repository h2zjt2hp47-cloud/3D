/**
 * Snelstart: het eerste scherm van een nieuw ontwerp. Drie vragen (wat, hoe groot, welke stijl), elk met grote tegels
 * of grote − en + knoppen, zodat het met één vinger op een tablet vlot gaat. De derde tik (de stijl) maakt het ontwerp
 * en toont het meteen in 3D: een woning in de plattegrond (vrij verder te tekenen), een aanbouw als het model AANBOUW
 * (met één tik als ruimte tegen een woning in de plattegrond), een raam, deur of garagepoort in de configurator.
 * Tegels, maten en stijlen zijn gegevens (`core/voorbeelden/snelstart.ts`, `stijlen.ts`).
 *
 * Vaste modellen (16/11: carport of overkapping, tuinhuis of poolhouse, loods of hal, staalwerk): de derde vraag is een
 * vertrekpunt van het model (carport, terrasoverkapping, pergola …) in plaats van een stijl; het ontwerp komt als positie
 * in de configurator, in 3D. Bij staalwerk kies je in de tweede vraag eerst wat (balustrade, luifel of trap), dan de maten.
 * Raakt de verkoper geen maat aan, dan houdt elk vertrekpunt zijn eigen gangbare maten (de tegel zegt welke); anders
 * krijgt elk vertrekpunt de maten van de tweede vraag.
 */
import { standaardKeuzes, type Keuzes } from '../../core/src/index.js';
import { garagepoort } from '../../core/voorbeelden/garagepoort.js';
import { dakCatalogus, gevelCatalogus } from '../../core/voorbeelden/inrichting.js';
import { RAL_KLEUREN } from '../../core/voorbeelden/raam.js';
import {
  aanbouwKeuzes, begrensMaat, bestaandeWoning, leesMaat, raamNaam, SNELSTART_TEGELS, snelModel, snelModelMaat, snelRaam, snelWoning, stapMaat,
  type SnelMaat, type SnelSoort, type SnelTegel, type SnelVertrekpunt,
} from '../../core/voorbeelden/snelstart.js';
import type { VastModelCode } from '../../core/voorbeelden/vastemodellen.js';
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
  /** Zelf tekenen: een leeg plan in de plattegrond. */
  naarPlan: () => void;
}

let nav: SnelstartNav;
let stap: 1 | 2 | 3 = 1;
let tegel: SnelTegel | undefined;
let maten: Record<string, number> = {};
/** Staalwerk: wat er gekozen is in de tweede vraag (balustrade, luifel of trap). */
let soort: SnelSoort | undefined;
/** Raakte de verkoper een maat aan? Zo niet, dan houdt elk vertrekpunt van een vast model zijn eigen maten. */
let aangeraakt = false;

/**
 * Ronde 11, aanbouw: de ligging van de bestaande woning. Tussen twee buren of met één buur (links) staan de zijmuren tegen
 * de buren (`Plattegrond.tegenBuren`); vrijstaand is de standaard en geeft het ontwerp van vroeger. De keuze reist mee als
 * sleutel `buren` in de keuzes van het model AANBOUW (dat model kent ze zelf niet) tot `aanbouwNaarPlan`.
 */
const LIGGINGEN: ['twee' | 'een' | 'vrij', string][] = [['twee', 'Tussen twee buren'], ['een', 'Eén buur'], ['vrij', 'Vrijstaand']];
let ligging: 'twee' | 'een' | 'vrij' = 'vrij';
const metLigging = (k: Keuzes): Keuzes => (ligging === 'vrij' ? k : { ...k, buren: ligging });

/** De maten van de tweede vraag: die van de gekozen soort (staalwerk) of van de tegel. */
const huidigeMaten = (): SnelMaat[] => soort?.maten ?? tegel?.maten ?? [];
/** Het model en de vertrekpunten van een vast model (de tegel, of bij staalwerk de gekozen soort). */
const vastModel = (): { model: VastModelCode; vertrekpunten: SnelVertrekpunt[] } | undefined =>
  soort ? soort : tegel?.soort === 'model' && tegel.vertrekpunten ? { model: tegel.model as VastModelCode, vertrekpunten: tegel.vertrekpunten } : undefined;
const standaardMaten = () => Object.fromEntries(huidigeMaten().map((m) => [m.code, m.standaard]));

// ---------- beelden (getekend uit de gegevens, zodat een eigen stijl of tegel vanzelf een beeld heeft) ----------

/** Pictogram van een tegel; een onbekende tegel krijgt een doos. */
export function tegelBeeld(code: string): string {
  const lijn = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const tekening: Record<string, string> = {
    woning: `<path ${lijn} d="M14 54 L60 18 L106 54"/><path ${lijn} d="M24 47 V96 H96 V47"/><rect ${lijn} x="34" y="58" width="18" height="16"/><rect ${lijn} x="68" y="58" width="18" height="16"/><path ${lijn} d="M53 96 V80 H67 V96"/>`,
    aanbouw: `<path ${lijn} d="M10 50 L40 26 L70 50"/><path ${lijn} d="M18 44 V96 H62"/><path ${lijn} d="M62 60 H110 V96 H62 Z"/><rect ${lijn} x="70" y="68" width="32" height="28"/><path ${lijn} d="M86 68 V96"/><rect ${lijn} x="78" y="54" width="12" height="6"/>`,
    raam: `<rect ${lijn} x="28" y="20" width="64" height="76"/><path ${lijn} d="M60 20 V96"/><path ${lijn} d="M88 24 L64 58 L88 92"/><path ${lijn} d="M20 96 H100"/>`,
    garagepoort: `<path ${lijn} d="M16 40 L60 18 L104 40 V96 H16 Z"/><rect ${lijn} x="28" y="48" width="64" height="48"/><path ${lijn} d="M28 60 H92 M28 72 H92 M28 84 H92"/>`,
    ...VAST_BEELD,
  };
  return `<svg viewBox="0 0 120 110" aria-hidden="true">${tekening[code] ?? `<rect ${lijn} x="24" y="30" width="72" height="60"/>`}</svg>`;
}

/**
 * Pictogrammen van de vaste modellen (16/11), als lijntekening zoals de andere tegels: de tegels van de eerste vraag
 * (overkapping, tuinhuis, loods, staalwerk), de soorten van staalwerk en elk vertrekpunt. Een tekening, geen 3D.
 */
const VAST_BEELD: Record<string, string> = (() => {
  const l = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const d = (pad: string) => `<path ${l} d="${pad}"/>`;
  const grond = d('M6 98 H114');
  const carport = d('M10 38 H110 V45 H10 Z') + d('M18 45 V98 M102 45 V98') + d('M30 92 V82 Q30 76 38 75 L48 66 H72 L82 75 Q92 76 92 82 V92 Z') + d('M40 92 V98 M82 92 V98');
  const tuinhuis = d('M14 50 L60 24 L106 50') + d('M22 46 V98 H98 V46') + d('M50 98 V64 H70 V98') + d('M30 58 V96 M40 54 V96 M80 54 V96 M90 58 V96');
  const hal = d('M8 52 L60 32 L112 52 V98 H8 Z') + d('M36 98 V60 H84 V98') + d('M36 70 H84 M36 80 H84 M36 90 H84');
  const trap = d('M12 98 H32 V82 H52 V66 H72 V50 H92 V34 H110') + d('M22 74 L102 22') + d('M30 68 V84 M50 55 V68 M70 42 V52 M90 29 V36');
  return {
    overkapping: grond + carport,
    tuinhuis: grond + tuinhuis,
    loods: grond + hal,
    staalwerk: trap,
    carport: grond + carport,
    terras: grond + d('M12 14 V98') + d('M12 36 L108 52 V58 L12 42') + d('M100 56 V98') + d('M30 47 V40 M50 50 V43 M70 54 V47 M90 57 V50'),
    pergola: grond + d('M22 46 V98 M98 46 V98') + d('M10 46 H110 M10 52 H110') + d('M26 40 V46 M42 40 V46 M58 40 V46 M74 40 V46 M90 40 V46'),
    poolhouse: d('M6 40 H114 V46 H6 Z') + d('M14 46 V86 H78 V46') + d('M106 46 V86') + d('M26 54 H66 V86 H26 Z M46 54 V86') + d('M8 96 Q16 91 24 96 T40 96 T56 96 T72 96 T88 96 T104 96 T120 96'),
    hal: grond + hal,
    landbouw: grond + d('M8 34 L112 52 V98 H8 Z') + d('M8 82 H112') + d('M30 98 V58 H66 V98') + d('M30 66 H66 M30 74 H66'),
    werkplaats: grond + d('M8 52 L60 32 L112 52 V98 H8 Z') + d('M18 98 V62 H54 V98 M66 98 V62 H102 V98') + d('M18 72 H54 M66 72 H102') + d('M24 67 H32 M40 67 H48 M72 67 H80 M88 67 H96'),
    balustrade: d('M6 84 H114 V92 H6') + d('M12 40 H108') + d('M16 40 V84 M104 40 V84') + d('M28 44 V82 M40 44 V82 M52 44 V82 M64 44 V82 M76 44 V82 M88 44 V82'),
    balustrade_spijlen: d('M6 84 H114 V92 H6') + d('M12 40 H108') + d('M16 40 V84 M104 40 V84') + d('M28 44 V82 M40 44 V82 M52 44 V82 M64 44 V82 M76 44 V82 M88 44 V82'),
    balustrade_glas: d('M6 84 H114 V92 H6') + d('M12 38 H108') + d('M14 44 H58 V82 H14 Z M62 44 H106 V82 H62 Z') + d('M22 52 L32 62 M70 52 L80 62'),
    luifel: d('M16 10 V100') + d('M16 50 H104 V56 H16') + d('M16 16 L100 50') + d('M28 100 V68 H52 V100'),
    luifel_plaat: d('M16 10 V100') + d('M16 46 H104 V58 H16') + d('M16 80 L44 58') + d('M28 100 V70 H52 V100'),
    trap: trap,
    staaltrap: trap,
    staaltrap_staal: d('M12 98 H32 V82 H52 V66 H72 V50 H92 V34 H110') + d('M20 98 L100 34') + d('M22 74 L102 22'),
  };
})();

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

function zetKop(titel: string, uitleg: string) {
  $('#ss-titel').textContent = titel;
  $('#ss-uitleg').textContent = uitleg;
  // Een vast model kiest in de derde vraag een vertrekpunt, geen stijl.
  const model = tegel?.soort === 'model';
  const derde = document.querySelector<HTMLElement>('#ss-stappen li[data-stap="3"]');
  if (derde) derde.textContent = model ? 'Vertrekpunt' : 'Stijl';
  $('#ss-verder').textContent = model ? 'Verder: kies een vertrekpunt' : 'Verder: kies een stijl';
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
        soort = t.soorten?.[0];
        aangeraakt = false;
        ligging = 'vrij';
        maten = standaardMaten();
        toonStap2();
      });
      rij.append(b);
    }
    return rij;
  }));
  // Zelf tekenen van nul (16/11, doorloop A11): vroeger alleen via Plattegrond → Nieuw project → Leeg project. Bv. de
  // bestaande toestand van een verbouwing, of een vorm die geen tegel heeft.
  const zelf = el('button', { type: 'button', class: 'snel-zelf', 'data-snel-zelf': '' });
  zelf.append(el('strong', {}, 'Zelf tekenen'), el('span', { class: 'klein' }, ' Een lege plattegrond: teken de ruimtes zelf, met de vinger of met maten.'));
  zelf.addEventListener('click', () => {
    nieuwProject(legeToestand(), 'Nieuw project');
    nav.naarPlan();
  });
  $('#ss-inhoud').append(zelf);
}

function toonStap2() {
  if (!tegel) return toonStap1();
  stap = 2;
  zetKop(`${tegel.label}: hoe groot?`, tegel.soorten
    ? 'Kies wat, dan de maat: tik op − of +, of typ de maat in cm (4,5 m mag ook). Fijner afstellen kan daarna.'
    : 'Gangbare maten staan al ingevuld. Tik op − of +, of typ de maat in cm (4,5 m mag ook). Fijner afstellen kan daarna.');
  const vak = el('div', { class: 'snel-maten' });
  if (tegel.soorten) {
    // Staalwerk: eerst wat (balustrade, luifel, trap); elk heeft zijn eigen maten.
    const rij = el('div', { class: 'snel-soorten', role: 'group', 'aria-label': 'Wat' });
    for (const s of tegel.soorten) {
      const b = el('button', { type: 'button', class: 'snel-soort', 'data-snel-soort': s.code, 'aria-pressed': String(s === soort) });
      const beeld = el('span', { class: 'snel-beeld' });
      beeld.innerHTML = tegelBeeld(s.code);
      b.append(beeld, el('strong', {}, s.label));
      b.addEventListener('click', () => {
        if (s === soort) return;
        soort = s;
        aangeraakt = false;
        maten = standaardMaten();
        toonStap2();
      });
      rij.append(b);
    }
    $('#ss-inhoud').replaceChildren(rij);
  }
  for (const m of huidigeMaten()) {
    const rij = el('div', { class: 'snel-maat' });
    // Een groot veld met het cijfertoetsenbord van de tablet; een maat in cm (of "4,5 m").
    const invoer = el('input', { type: 'text', inputmode: 'numeric', enterkeyhint: 'done', autocomplete: 'off', 'aria-label': `${m.label}${eenheidTekst(m) ? ` in ${eenheidTekst(m)}` : ''}`, 'data-snel-maat': m.code }) as HTMLInputElement;
    const meter = el('span', { class: 'klein snel-meter', 'aria-hidden': 'true' });
    const zet = (w: number) => { maten[m.code] = begrensMaat(m, w); invoer.value = toonWaarde(m, maten[m.code]!); meter.textContent = m.nul && !maten[m.code] ? 'geen' : m.toon === 'cm' ? `= ${getal((m.eenheid === 'mm' ? maten[m.code]! / 10 : maten[m.code]!) / 100, 2)} m` : ''; min.disabled = maten[m.code]! <= (m.nul ? 0 : m.min); plus.disabled = maten[m.code]! >= m.max; };
    const min = el('button', { type: 'button', class: 'snel-knop', 'aria-label': `${m.label} kleiner`, 'data-snel-min': m.code }, '−') as HTMLButtonElement;
    const plus = el('button', { type: 'button', class: 'snel-knop', 'aria-label': `${m.label} groter`, 'data-snel-plus': m.code }, '+') as HTMLButtonElement;
    min.addEventListener('click', () => { aangeraakt = true; zet(stapMaat(m, maten[m.code]!, -1)); });
    plus.addEventListener('click', () => { aangeraakt = true; zet(stapMaat(m, maten[m.code]!, 1)); });
    invoer.addEventListener('change', () => {
      const w = leesMaat(invoer.value, m);
      aangeraakt = true;
      zet(w ?? maten[m.code]!);
      // Zeggen als een getypte maat begrensd werd (doorloop A17: "4,5 m" werd stil 6 m).
      melding.textContent = w !== undefined && maten[m.code] !== w ? `${m.label}: ${w < maten[m.code]! ? 'minstens' : 'hoogstens'} ${invoer.value}${eenheidTekst(m) ? ` ${eenheidTekst(m)}` : ''}.` : '';
    });
    invoer.addEventListener('focus', () => invoer.select());
    const waarde = el('span', { class: 'snel-waarde' });
    waarde.append(invoer, el('span', { class: 'eenheid' }, eenheidTekst(m)));
    const naam = el('span', { class: 'snel-maat-naam' });
    naam.append(el('span', {}, m.label), meter);
    const melding = el('span', { class: 'klein snel-maatmelding', role: 'status' });
    rij.append(naam, min, waarde, plus, melding);
    vak.append(rij);
    zet(maten[m.code] ?? m.standaard);
  }
  if (tegel.soorten) $('#ss-inhoud').append(vak);
  else $('#ss-inhoud').replaceChildren(vak);
  if (tegel.soort === 'aanbouw') {
    // Ronde 11: ligging van de woning. Vrijstaand is de standaard (zoals vroeger): wie niets aanraakt, tikt niet meer.
    const rij = el('div', { class: 'snel-ligging', role: 'group', 'aria-label': 'Ligging van de woning' });
    rij.append(el('span', { class: 'snel-maat-naam' }, 'Ligging'));
    for (const [code, label] of LIGGINGEN) {
      const b = el('button', { type: 'button', class: 'snel-liggingknop', 'data-snel-buren': code, 'aria-pressed': String(code === ligging) }, label);
      b.addEventListener('click', () => {
        ligging = code;
        for (const x of rij.querySelectorAll<HTMLButtonElement>('[data-snel-buren]')) x.setAttribute('aria-pressed', String(x.dataset.snelBuren === code));
      });
      rij.append(b);
    }
    $('#ss-inhoud').append(rij);
    // Een andere vorm (een schuine zijmuur) of een andere plaats: de bestaande woning in de plattegrond, en daar de aanbouw
    // met de maten van de muren in cm (paneel Ruimte met maten).
    const b = el('button', { type: 'button', class: 'tweede snel-metmaten', id: 'ss-maten' }, 'Andere vorm of plaats (schuine muur): teken met maten in de plattegrond');
    b.addEventListener('click', () => {
      const s = Object.values(stijlCatalogus)[0]!;
      const { plan, posities } = bestaandeWoning(metLigging(aanbouwKeuzes(maten, s)));
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
  const vast = vastModel();
  if (vast) return toonVertrekpunten(vast.model, vast.vertrekpunten);
  stap = 3;
  // Bij één raam of een poort telt alleen de kleur (doorloop A27: de tegel sprak over gevelsteen en een zadeldak).
  const los = tegel.soort === 'positie';
  zetKop('Welke stijl?', los ? 'Eén tik zet de kleur en het profiel. Alles blijft daarna aan te passen.' : 'Eén tik zet gevel, kleur van de ramen, dak, vloer en binnenkleur. Alles blijft daarna aan te passen.');
  const kleurNaam = (code: string) => (RAL_KLEUREN.find((k) => k.code === code)?.naam ?? code).toLowerCase();
  const rij = el('div', { class: 'snel-tegels snel-stijlen' });
  for (const [code, s] of Object.entries(stijlCatalogus)) {
    const b = el('button', { type: 'button', class: 'snel-tegel snel-stijl', 'data-stijl': code });
    const beeld = el('span', { class: 'snel-stijlbeeld' });
    beeld.innerHTML = stijlBeeld(s);
    const uitleg = !los ? s.uitleg : tegel.model === 'RAAM' ? `Profiel in ${s.schrijnwerk.profiel.startsWith('alu') ? 'aluminium' : s.schrijnwerk.profiel}, ${kleurNaam(s.schrijnwerk.kleur_buiten)} buiten.` : `Poort in ${kleurNaam(s.poort)}.`;
    b.append(beeld, el('strong', {}, s.label), el('span', { class: 'klein' }, uitleg));
    b.addEventListener('click', () => maak(s));
    rij.append(b);
  }
  $('#ss-inhoud').replaceChildren(rij);
}

/**
 * De derde vraag van een vast model: de vertrekpunten, elk met een tekening, de maat die het krijgt en wat het is. Eén tik
 * maakt het ontwerp en toont het in 3D in de configurator.
 */
function toonVertrekpunten(model: VastModelCode, punten: SnelVertrekpunt[]) {
  stap = 3;
  zetKop('Welk vertrekpunt?', aangeraakt
    ? 'Eén tik zet alles klaar in de maten die je koos. Alles blijft daarna aan te passen.'
    : 'Eén tik zet alles klaar, in de gangbare maten van elk vertrekpunt. Alles blijft daarna aan te passen.');
  const rij = el('div', { class: 'snel-tegels snel-vertrekpunten' });
  for (const v of punten) {
    const keuzes = snelModel(model, v, aangeraakt ? maten : null);
    const b = el('button', { type: 'button', class: 'snel-tegel', 'data-vertrekpunt': v.code });
    const beeld = el('span', { class: 'snel-beeld' });
    beeld.innerHTML = tegelBeeld(v.code);
    // Met eigen maten geen gangbare maat in de titel (doorloop A17: "Hal van 15 × 30 m" boven "6 × 30 m").
    const titel = aangeraakt ? v.label.replace(/ van [\d,.]+ × [\d,.]+ m$/, '') : v.label;
    b.append(beeld, el('strong', {}, titel), el('span', { class: 'snel-maatlabel' }, snelModelMaat(model, keuzes)));
    if (v.uitleg) b.append(el('span', { class: 'klein' }, v.uitleg));
    b.addEventListener('click', () => maakModel(model, v, keuzes));
    rij.append(b);
  }
  $('#ss-inhoud').replaceChildren(rij);
}

// ---------- het ontwerp maken ----------

/** Een vast model als project met één positie, meteen in 3D in de configurator. */
function maakModel(model: VastModelCode, v: SnelVertrekpunt, keuzes: Record<string, unknown>) {
  const basis = legeToestand();
  const p = nieuwePositie(model, keuzes as Positie['keuzes'], v.naam);
  nieuwProject({ ...basis, posities: [p] }, `${v.naam} ${snelModelMaat(model, p.keuzes).replace(/, \d+ traveeën$/, '')}`);
  nav.naarPositie3D(p.id);
}

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
    const p = nieuwePositie('AANBOUW', metLigging(aanbouwKeuzes(maten, s)), 'Aanbouw');
    nieuwProject({ ...basis, meta, posities: [p] }, `Aanbouw ${meter(maten.breedte! / 10)} × ${meter(maten.diepte! / 10)} m, ${s.label.toLowerCase()}`);
    nav.naarPositie3D(p.id);
    return;
  }
  // Eén positie zonder woning: een raam of deur, of een garagepoort.
  const leeg = ramenToestand();
  // De naam volgt de soort: een schuifraam van 250 × 230 cm heet "Schuifraam", niet "Raam" (doorloop B25).
  const raam = tegel.model === 'POORT' ? undefined : snelRaam(maten, s);
  const naam = raam ? raamNaam(raam) : 'Garagepoort';
  const p = !raam
    ? nieuwePositie('POORT', { ...standaardKeuzes(garagepoort), breedte: maten.breedte!, hoogte: maten.hoogte!, kleur: s.poort }, naam)
    : nieuwePositie('RAAM', raam, naam);
  p.aantal = Math.max(1, Math.round(maten.aantal ?? 1));
  nieuwProject({ ...leeg, posities: [p] }, `${naam} ${getal(maten.breedte! / 10)} × ${getal(maten.hoogte! / 10)} cm`);
  nav.naarPositie3D(p.id);
}

/** Toont de snelstart vanaf de eerste vraag. */
export function toonSnelstart() {
  tegel = undefined;
  soort = undefined;
  aangeraakt = false;
  maten = {};
  toonStap1();
}

export function startSnelstart(n: SnelstartNav) {
  nav = n;
  $('#ss-terug').addEventListener('click', () => (stap === 3 ? toonStap2() : toonStap1()));
  $('#ss-verder').addEventListener('click', () => toonStap3());
}
