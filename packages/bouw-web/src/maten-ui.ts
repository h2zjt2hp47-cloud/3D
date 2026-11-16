/**
 * Maten in cm in de plattegrond (ronde 2b): een verkoper staat bij de klant met een tablet en een meetlint, en typt wat
 * hij gemeten heeft. Twee onderdelen:
 * - het paneel *Ruimte met maten*: een rechthoek (twee maten, de overkant volgt) of een vrije vorm (vier zijden en een
 *   diagonaal, zoals een inmeter meet), gemeten aan de buiten- of binnenkant, tegen een gevel van de woning op een
 *   gemeten afstand, los ervan, of als nieuw project; de schets en de tekening tonen de vorm meteen;
 * - een kleine maatvraag op de tekening (`vraagMaat`): na een tik op een maat, of na het plaatsen van een raam, deur of
 *   wand, een veld (of twee) om de maat in cm te typen. Wat je typt, zie je meteen; Enter of OK sluit, Esc zet terug.
 * Elke maat leest `leesMaat` ("450", "4,5 m", "300+150"); een maat die begint met + of − telt bij de huidige op.
 * De meetkunde staat in de motor (`core/src/maatinvoer.ts`).
 */
import {
  dakOpbouw,
  gevelLijnen,
  gevelVanMuur,
  murenVan,
  dichtsteMuur,
  niveauPlan,
  RUIMTE_TYPES,
  ruimteUitMaten,
  standaardDak,
  zetMaatVorm,
  type Gemeten,
  type Gevellijn,
  type MaatRuimte,
  type MaatVorm,
  type Plattegrond,
  type Punt,
  type Ruimte,
  type RuimteType,
} from '../../core/src/index.js';
import { leesMaat } from '../../core/voorbeelden/snelstart.js';
import { $, el, getal, keuzelijst } from './hulp.js';
import { legeToestand, nieuweId, nieuwProject, toestand, wijzig, type Toestand } from './staat.js';

// ---------- een maat lezen ----------

/**
 * Een getypte maat in cm (zie `leesMaat`). Met een huidige waarde telt "+30" of "−20" erbij (30 cm breder).
 * Geeft undefined als er geen maat staat.
 */
export function leesCm(tekst: string, huidig?: number): number | undefined {
  const t = tekst.trim().replace(/[−–]/g, '-');
  if (huidig !== undefined && /^[+-]/.test(t)) {
    const w = leesMaat(t.slice(1), { eenheid: 'cm' });
    return w === undefined ? undefined : huidig + (t[0] === '-' ? -w : w);
  }
  return leesMaat(t, { eenheid: 'cm' });
}

/** Een groot veld voor een maat in cm, met het cijfertoetsenbord van de tablet. */
export function cmVeld(waarde: number | undefined, attrs: Record<string, string> = {}): HTMLInputElement {
  const i = el('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', enterkeyhint: 'next', spellcheck: 'false', class: 'cm-veld', ...attrs }) as HTMLInputElement;
  if (waarde !== undefined) i.value = String(Math.round(waarde * 10) / 10).replace('.', ',');
  // Bij de eerste tik staat alles geselecteerd: meteen typen vervangt de maat.
  i.addEventListener('focus', () => i.select());
  return i;
}

const tekstCm = (x: number) => `${getal(Math.round(x * 10) / 10, 1)} cm`;

// ---------- de omgeving (de plattegrond) ----------

export interface MatenOmgeving {
  /** De actieve verdieping (alleen-lezen kopie) en haar nummer. */
  plan: () => Plattegrond;
  niveau: () => number;
  /** Tekening opnieuw (met het voorbeeld). */
  opnieuw: () => void;
  /** Na het plaatsen: de nieuwe ruimte kiezen, een melding tonen en terug naar Selecteren. */
  geplaatst: (ruimteId: string, melding: string) => void;
  /** Het vak rond de tekening (voor de maatvraag) en de tekening zelf. */
  vlak: () => HTMLElement;
  svg: () => SVGSVGElement | null;
  /** Het paneel ging dicht (bv. met Sluiten): het gereedschap terug naar Selecteren. */
  dicht: () => void;
  naar3D: () => void;
}
let omg: MatenOmgeving | undefined;
/** Eén keer bij het starten van de plattegrond. */
export function startMaten(o: MatenOmgeving) {
  omg = o;
}

/** Plaats op het scherm (in het vak rond de tekening) van een punt van het plan. */
function opScherm(p: Punt): { x: number; y: number } | undefined {
  const svg = omg?.svg(), vlak = omg?.vlak();
  const m = svg?.getScreenCTM();
  if (!svg || !m || !vlak) return undefined;
  const q = new DOMPoint(p[0], p[1]).matrixTransform(m);
  const r = vlak.getBoundingClientRect();
  return { x: q.x - r.left, y: q.y - r.top };
}

// ---------- de maatvraag op de tekening ----------

export interface MaatVraagVeld {
  code: string;
  label: string;
  waarde: number;
  /** Grenzen in cm, met de melding als de maat erbuiten valt. */
  min?: number;
  max?: number;
}
export interface MaatVraag {
  /** Waar ze staat: een punt van het plan, of een plaats op het scherm (een aangetikte maat). */
  anker: Punt | DOMRect;
  titel: string;
  velden: MaatVraagVeld[];
  /** Keuze welke kant beweegt of van waar je meet (bv. links of rechts), met de gekozen kant. */
  kanten?: { label: string; opties: [string, string][]; gekozen: string };
  /** Extra knoppen (bv. Midden): zetten waarden in de velden. */
  knoppen?: { label: string; waarden: (huidig: Record<string, number>) => Record<string, number> }[];
  /** Uitleg onder de velden (bv. de maat binnen en buiten). */
  uitleg?: string;
  /**
   * Past de waarden toe (meteen bij het typen). `eerste` = de eerste keer (dan een momentopname voor ongedaan maken).
   * Geeft een melding in gewone taal als het niet kan; dan verandert er niets.
   */
  toepassen: (waarden: Record<string, number>, kant: string | undefined, eerste: boolean) => string | undefined;
  /** Bij een andere kant: de waarden van de velden opnieuw (bv. de afstand van rechts in plaats van links). */
  bijKant?: (kant: string) => Record<string, number>;
  /** Esc of ×: terugzetten (alleen als er iets toegepast werd). */
  terug: () => void;
  /** Na het sluiten (Enter, OK, tik ernaast, Esc). */
  na?: () => void;
  /**
   * Meteen in het eerste veld (standaard ja). Na het plaatsen van een raam of wand op een aanraakscherm niet: anders komt
   * na elke tik het toetsenbord over de tekening, en wie niets typt, wil snel verder tekenen.
   */
  meteenTypen?: boolean;
}
let vraag: { v: MaatVraag; doos: HTMLElement; toegepast: boolean; kant?: string } | undefined;
/** Waar tijdens het toepassen van de maatvraag zelf (dan sluit een wijziging van het plan ze niet). */
let bezig = false;

export const maatVraagOpen = () => !!vraag;
export const maatVraagBezig = () => bezig;

/** Sluit de maatvraag: `bevestig` houdt wat getypt is, anders terug (Esc). */
export function sluitMaatVraag(bevestig = true) {
  const q = vraag;
  if (!q) return;
  vraag = undefined;
  q.doos.remove();
  if (!bevestig && q.toegepast) q.v.terug();
  q.v.na?.();
}

/** Zet de maatvraag weer bij haar anker (na het hertekenen of zoomen). */
export function plaatsMaatVraag() {
  if (!vraag || !omg) return;
  const { v, doos } = vraag;
  const vlak = omg.vlak();
  if (!doos.isConnected) vlak.append(doos);
  let x: number, y: number, h = 0;
  if (Array.isArray(v.anker)) {
    const p = opScherm(v.anker);
    if (!p) return;
    ({ x, y } = p);
  } else {
    const r = vlak.getBoundingClientRect();
    x = v.anker.left + v.anker.width / 2 - r.left;
    y = v.anker.top + v.anker.height / 2 - r.top;
    h = v.anker.height / 2;
  }
  const b = doos.offsetWidth || 260, d = doos.offsetHeight || 140;
  const W = vlak.clientWidth, H = vlak.clientHeight;
  // Naast het anker als er plaats is (dan blijft wat je wijzigt in beeld), anders eronder of erboven.
  const marge = 28 + (Array.isArray(v.anker) ? 0 : v.anker.width / 2);
  const rechts = x + marge, links = x - marge - b;
  let l: number, t: number;
  if (rechts + b <= W - 4 || links >= 4) {
    l = rechts + b <= W - 4 && (x < W / 2 || links < 4) ? rechts : links;
    t = Math.max(4, Math.min(H - d - 4, y - d / 2));
  } else {
    l = Math.max(4, Math.min(W - b - 4, x - b / 2));
    const onder = y + h + 18;
    t = onder + d > H && y - h - 18 - d > 0 ? y - h - 18 - d : Math.min(onder, Math.max(4, H - d - 4));
  }
  doos.style.left = `${l}px`;
  doos.style.top = `${t}px`;
}

/** Een kleine vraag naar een maat op de tekening (zie `MaatVraag`). */
export function vraagMaat(v: MaatVraag) {
  sluitMaatVraag(true);
  if (!omg) return;
  const doos = el('div', { class: 'maatvraag', role: 'dialog', 'aria-label': v.titel });
  const kop = el('div', { class: 'maatvraag-kop' });
  const sluit = el('button', { type: 'button', class: 'tweede', 'aria-label': 'Sluiten zonder wijzigen (Esc)', title: 'Sluiten zonder wijzigen (Esc)' }, '×');
  sluit.addEventListener('click', () => sluitMaatVraag(false));
  kop.append(el('strong', {}, v.titel), sluit);
  doos.append(kop);
  const melding = el('p', { class: 'maatvraag-melding', role: 'status' });
  const velden: { veld: MaatVraagVeld; input: HTMLInputElement }[] = [];
  const rij = el('div', { class: 'maatvraag-velden' });
  v.velden.forEach((f, i) => {
    const label = el('label', { class: 'maatvraag-veld' });
    const input = cmVeld(f.waarde, { 'aria-label': `${f.label} in cm`, 'data-maatvraag': f.code, enterkeyhint: i === v.velden.length - 1 ? 'done' : 'next' });
    label.append(el('span', {}, f.label), input, el('span', { class: 'eenheid' }, 'cm'));
    rij.append(label);
    velden.push({ veld: f, input });
  });
  doos.append(rij);
  let kantKnoppen: HTMLButtonElement[] = [];
  const toonKant = () => { for (const k of kantKnoppen) k.setAttribute('aria-pressed', String(k.dataset.kant === vraag?.kant)); };
  if (v.kanten || v.knoppen?.length) {
    const r = el('div', { class: 'maatvraag-kanten' });
    if (v.kanten) {
      r.append(el('span', { class: 'klein' }, v.kanten.label));
      kantKnoppen = v.kanten.opties.map(([code, label]) => {
        const k = el('button', { type: 'button', class: 'tweede', 'data-kant': code }, label) as HTMLButtonElement;
        k.addEventListener('click', () => {
          if (!vraag) return;
          vraag.kant = code;
          toonKant();
          const w = v.bijKant?.(code);
          if (w) for (const x of velden) if (w[x.veld.code] !== undefined) x.input.value = String(Math.round(w[x.veld.code]! * 10) / 10).replace('.', ',');
          pasToe();
        });
        return k;
      });
      r.append(...kantKnoppen);
    }
    for (const kn of v.knoppen ?? []) {
      const k = el('button', { type: 'button', class: 'tweede' }, kn.label);
      k.addEventListener('click', () => {
        const huidig: Record<string, number> = {};
        for (const x of velden) { const h = leesCm(x.input.value, x.veld.waarde); if (h !== undefined) huidig[x.veld.code] = h; }
        const w = kn.waarden(huidig);
        for (const x of velden) if (w[x.veld.code] !== undefined) x.input.value = String(Math.round(w[x.veld.code]! * 10) / 10).replace('.', ',');
        pasToe();
      });
      r.append(k);
    }
    doos.append(r);
  }
  if (v.uitleg) doos.append(el('p', { class: 'klein maatvraag-uitleg' }, v.uitleg));
  doos.append(melding);
  const ok = el('button', { type: 'button', class: 'maatvraag-ok' }, 'OK');
  ok.addEventListener('click', () => { if (pasToe(true)) sluitMaatVraag(true); });
  doos.append(ok);

  /** Leest alle velden en past ze toe; geeft false als iets niet kan (de melding staat er dan). */
  function pasToe(bevestig = false): boolean {
    if (!vraag) return false;
    const waarden: Record<string, number> = {};
    for (const { veld, input } of velden) {
      const w = leesCm(input.value, veld.waarde);
      if (w === undefined) { melding.textContent = input.value.trim() ? `"${input.value}" is geen maat: typ bv. 120 (cm), 1,2 m of 100+20.` : ''; return false; }
      if (veld.min !== undefined && w < veld.min) { melding.textContent = `${veld.label}: ${tekstCm(w)} is te klein (minstens ${tekstCm(veld.min)}).`; return false; }
      if (veld.max !== undefined && w > veld.max) { melding.textContent = `${veld.label}: ${tekstCm(w)} is te groot (hoogstens ${tekstCm(veld.max)}).`; return false; }
      waarden[veld.code] = w;
    }
    void bevestig;
    // Niets veranderd (Enter zonder te typen): niets toepassen, ook geen stap voor ongedaan maken.
    if (!vraag.toegepast && vraag.kant === v.kanten?.gekozen && velden.every(({ veld }) => Math.abs(waarden[veld.code]! - veld.waarde) < 0.05)) { melding.textContent = ''; return true; }
    let fout: string | undefined;
    bezig = true;
    try { fout = v.toepassen(waarden, vraag.kant, !vraag.toegepast); } finally { bezig = false; }
    if (fout) { melding.textContent = fout; return false; }
    vraag.toegepast = true;
    melding.textContent = '';
    return true;
  }
  for (const [i, { input }] of velden.entries()) {
    input.addEventListener('input', () => pasToe());
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); sluitMaatVraag(false); return; }
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      const volgende = velden[i + 1];
      if (volgende) { volgende.input.focus(); return; }
      if (pasToe(true)) sluitMaatVraag(true);
    });
  }
  vraag = { v, doos, toegepast: false, kant: v.kanten?.gekozen };
  toonKant();
  omg.vlak().append(doos);
  plaatsMaatVraag();
  const eerste = velden[0]?.input;
  const aanraak = window.matchMedia?.('(pointer: coarse)').matches;
  if (eerste && (v.meteenTypen !== false || !aanraak)) { eerste.focus({ preventScroll: true }); eerste.select(); }
}

// ---------- het paneel "Ruimte met maten" ----------

type Plaats = 'tegen' | 'los' | 'nieuw';
interface Paneel {
  vorm: 'rechthoek' | 'vierhoek';
  gemeten: Gemeten;
  plaats: Plaats;
  gevel?: string;
  afstand: number;
  tussenruimte: number;
  maten: { breedte: number; diepte: number; ab: number; bc: number; cd: number; da: number; ac: number };
  naam: string;
  type: RuimteType;
  /** Wat de gebruiker zelf typte: de naam, en per zijde de maat (voor de uitleg als de overkanten verschillen). */
  getypt: Set<string>;
  getypteMaat: Partial<Record<Zijde, number>>;
  /** Een melding van het paneel zelf (bv. de overkanten verschillen). */
  melding?: { tekst: string; vrijeVorm?: { ab: number; bc: number; cd: number; da: number } };
}
let paneel: Paneel | undefined;
let uitkomst: MaatRuimte | undefined;
let laatsteMaten: Paneel['maten'] | undefined;
const SLEUTEL_GEMETEN = 'bouw-demo.maten-gemeten';

export const matenPaneelOpen = () => !!paneel;

/** De gevels van de actieve verdieping, de langste per kant eerst. */
function gevelsNu(): Gevellijn[] {
  if (!omg) return [];
  return gevelLijnen(toestand().plan, omg.niveau()).sort((a, b) => b.lengte - a.lengte);
}

/** Welke kant de voorgevel is (de kant met de voordeur), zoals de gevelaanzichten. */
function voorKant(): string | undefined {
  const t = toestand();
  const deur = t.plan.openingen.find((o) => (o.niveau ?? 0) === 0 && o.soort === 'buitendeur' && t.posities.find((p) => p.id === o.positie)?.keuzes.type === 'voordeur');
  if (!deur) return undefined;
  const m = murenVan(niveauPlan(t.plan, 0)).find((x) => x.as === deur.as && Math.abs(x.lijn - deur.lijn) < 0.5 && x.van <= deur.midden && x.tot >= deur.midden && x.soort === 'buiten');
  if (!m) return undefined;
  return gevelVanMuur(gevelLijnen(t.plan, 0), m.id)?.kant;
}
const TEGENOVER: Record<string, string> = { boven: 'onder', onder: 'boven', links: 'rechts', rechts: 'links' };

/** De vier gevelknoppen: voorgevel, achtergevel, links en rechts (gezien van voor), met de langste gevel aan die kant. */
function gevelKnoppen(): { label: string; gevel: Gevellijn }[] {
  const lijnen = gevelsNu().filter((g) => !g.schuin);
  const voor = voorKant() ?? 'onder';
  const kanten: [string, string][] = [['Voorgevel', voor], ['Achtergevel', TEGENOVER[voor]!]];
  // Links en rechts zoals je voor de voorgevel staat.
  const zij: Record<string, [string, string]> = { onder: ['links', 'rechts'], boven: ['rechts', 'links'], links: ['boven', 'onder'], rechts: ['onder', 'boven'] };
  kanten.push(['Linkerzijgevel', zij[voor]![0]], ['Rechterzijgevel', zij[voor]![1]]);
  return kanten.flatMap(([label, kant]) => { const g = lijnen.find((x) => x.kant === kant); return g ? [{ label, gevel: g }] : []; });
}

function gekozenGevel(): Gevellijn | undefined {
  if (!paneel) return undefined;
  return gevelsNu().find((g) => g.id === paneel!.gevel);
}

function vormVan(p: Paneel): MaatVorm {
  return p.vorm === 'rechthoek' ? { soort: 'rechthoek', breedte: p.maten.breedte, diepte: p.maten.diepte } : { soort: 'vierhoek', ...p.maten };
}

/** De nieuwe ruimte met de maten van het paneel (of undefined als er nog geen gevel gekozen is). */
function bereken(): MaatRuimte | undefined {
  if (!paneel || !omg) return undefined;
  const p = paneel;
  const leegPlan = !omg.plan().ruimtes.length;
  if (p.plaats === 'nieuw' || leegPlan) return ruimteUitMaten(toestand().plan, vormVan(p), p.gemeten, { soort: 'nieuw' }, omg.niveau());
  const g = gekozenGevel();
  if (!g) return undefined;
  return ruimteUitMaten(toestand().plan, vormVan(p), p.gemeten, p.plaats === 'tegen' ? { soort: 'tegen', gevel: g, afstand: p.afstand } : { soort: 'los', gevel: g, afstand: p.afstand, tussenruimte: p.tussenruimte }, omg.niveau());
}

/** Voor de tekening: de nieuwe ruimte als voorbeeld, met de afstand tot de hoek van de gevel. */
export function matenVoorbeeld(): { punten: Punt[]; gemeten: Punt[]; maten: { van: Punt; tot: Punt; tekst: string }[]; fout: boolean } | undefined {
  if (!paneel || !uitkomst?.punten.length || !omg?.plan().ruimtes.length || paneel.plaats === 'nieuw') return undefined;
  const g = gekozenGevel();
  const maten: { van: Punt; tot: Punt; tekst: string }[] = [];
  if (g) {
    // Langs de buitenkant van de gevel (los: een eind ervoor), van de linker buitenhoek tot de nieuwe muur.
    const y = g.dikte / 2 + (paneel.plaats === 'los' ? paneel.tussenruimte : 0);
    const punt = (x: number): Punt => [g.p[0] + x * g.u[0] + y * g.o[0], g.p[1] + x * g.u[1] + y * g.o[1]];
    if (Math.abs(paneel.afstand) >= 1) maten.push({ van: punt(g.hoekLinks), tot: punt(g.hoekLinks + paneel.afstand), tekst: `${Math.round(paneel.afstand)}` });
    if (paneel.plaats === 'los' && paneel.tussenruimte >= 1) {
      const x = g.hoekLinks + paneel.afstand + 20;
      maten.push({ van: [g.p[0] + x * g.u[0] + (g.dikte / 2) * g.o[0], g.p[1] + x * g.u[1] + (g.dikte / 2) * g.o[1]], tot: punt(x), tekst: `${Math.round(paneel.tussenruimte)}` });
    }
  }
  return { punten: uitkomst.punten, gemeten: uitkomst.gemeten, maten, fout: uitkomst.fouten.length > 0 };
}

/** Kader om mee in beeld te nemen (het voorbeeld). */
export function matenKader(): { x: number; y: number; b: number; d: number } | undefined {
  const v = matenVoorbeeld();
  if (!v) return undefined;
  const xs = v.gemeten.map((q) => q[0]), ys = v.gemeten.map((q) => q[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), b: Math.max(...xs) - Math.min(...xs), d: Math.max(...ys) - Math.min(...ys) };
}

/** Een tik op de tekening terwijl het paneel open is: de muur kiest de gevel, de plaats de afstand. */
export function matenTik(x: number, y: number): boolean {
  if (!paneel || !omg || paneel.plaats === 'nieuw' || !omg.plan().ruimtes.length) return false;
  const muren = murenVan(niveauPlan(toestand().plan, omg.niveau())).filter((m) => m.soort === 'buiten');
  const d = dichtsteMuur(muren, x, y, 60);
  if (!d) return false;
  const g = gevelVanMuur(gevelLijnen(toestand().plan, omg.niveau()), d.muur.id);
  if (!g) return false;
  paneel.gevel = g.id;
  // De linkerkant van de nieuwe ruimte waar je tikte (op 10 cm), gemeten vanaf de linker buitenhoek.
  const s = (x - g.p[0]) * g.u[0] + (y - g.p[1]) * g.u[1];
  paneel.afstand = Math.max(0, Math.round((s - g.hoekLinks) / 10) * 10);
  werkBij();
  return true;
}

/** Opent het paneel (eventueel met een gevel of maten vooraf, bv. vanuit de 3D of de snelstart). */
export function openMatenPaneel(o: MatenOmgeving, begin: { gevelMuur?: string; maten?: { breedte: number; diepte: number }; plaats?: Plaats; naam?: string } = {}) {
  omg = o;
  sluitMaatVraag(true);
  let gemeten: Gemeten = 'buiten';
  try { if (localStorage.getItem(SLEUTEL_GEMETEN) === 'binnen') gemeten = 'binnen'; } catch { /* geen opslag */ }
  const m = begin.maten ? rechthoekMaten(begin.maten.breedte, begin.maten.diepte) : laatsteMaten ?? rechthoekMaten(400, 300);
  const leeg = !o.plan().ruimtes.length;
  paneel = {
    vorm: 'rechthoek', gemeten, plaats: begin.plaats ?? (leeg ? 'nieuw' : 'tegen'), afstand: 0, tussenruimte: 300, maten: m,
    naam: begin.naam ?? 'Aanbouw', type: 'leefruimte', getypt: new Set(), getypteMaat: {},
  };
  const knoppen = gevelKnoppen();
  const muurGevel = begin.gevelMuur ? gevelVanMuur(gevelLijnen(toestand().plan, o.niveau()), begin.gevelMuur) : undefined;
  paneel.gevel = (muurGevel ?? knoppen.find((k) => k.label === 'Achtergevel')?.gevel ?? knoppen[0]?.gevel)?.id;
  zetNaam();
  bouwPaneel();
  werkBij();
  const vak = $('#pl-maatpaneel');
  vak.hidden = false;
  vak.scrollIntoView({ block: 'nearest' });
  (vak.querySelector('[data-maat-veld]') as HTMLInputElement | null)?.focus({ preventScroll: true });
}

export function sluitMatenPaneel() {
  if (!paneel) return;
  paneel = undefined;
  uitkomst = undefined;
  const vak = document.getElementById('pl-maatpaneel');
  if (vak) { vak.hidden = true; vak.replaceChildren(); }
  omg?.opnieuw();
}

const rechthoekMaten = (b: number, d: number): Paneel['maten'] => ({ breedte: b, diepte: d, ab: b, bc: d, cd: b, da: d, ac: Math.round(Math.hypot(b, d) * 10) / 10 });

/** Naam en soort volgens de plaats (tot de gebruiker zelf een naam typt). */
function zetNaam() {
  if (!paneel || paneel.getypt.has('naam')) return;
  const leeg = !omg?.plan().ruimtes.length;
  if (paneel.plaats === 'tegen' && !leeg) { paneel.naam = 'Aanbouw'; paneel.type = 'leefruimte'; } else { paneel.naam = 'Bijgebouw'; paneel.type = 'berging'; }
}

// De velden van de schets: per zijde (rechthoek: breedte en diepte twee keer) en de diagonaal.
const ZIJDEN = ['ab', 'bc', 'cd', 'da'] as const;
type Zijde = (typeof ZIJDEN)[number];

function bouwPaneel() {
  const vak = $('#pl-maatpaneel');
  const p = paneel!;
  const leeg = !omg!.plan().ruimtes.length;
  vak.replaceChildren();
  const kop = el('div', { class: 'maatpaneel-kop' });
  const titel = el('h3', {}, 'Ruimte met maten');
  const vormen = el('div', { class: 'tabs', role: 'group', 'aria-label': 'Vorm' });
  for (const [code, label, uitleg] of [['rechthoek', 'Rechthoek', 'Breedte en diepte: de overkant volgt'], ['vierhoek', 'Vrije vorm', 'Schuine muren: vier zijden en een diagonaal, zoals een inmeter meet']] as const) {
    const b = el('button', { type: 'button', 'data-maat-vorm': code, 'aria-pressed': String(p.vorm === code), title: uitleg }, label);
    b.addEventListener('click', () => kiesVorm(code));
    vormen.append(b);
  }
  const sluit = el('button', { type: 'button', class: 'tweede', 'aria-label': 'Paneel sluiten' }, 'Sluiten');
  sluit.addEventListener('click', () => { sluitMatenPaneel(); omg?.dicht(); });
  const gemeten = el('div', { class: 'tabs klein maatpaneel-gemeten', role: 'group', 'aria-label': 'Gemeten aan' });
  gemeten.append(el('span', { class: 'klein' }, 'Gemeten'));
  for (const [code, label, uitleg] of [['buiten', 'buiten', 'Gemeten aan de buitenkant van de muren (zoals een aanbouw of bijgebouw afgesproken wordt)'], ['binnen', 'binnen', 'Gemeten aan de binnenkant van de muren (de vrije maat van de ruimte)']] as const) {
    const b = el('button', { type: 'button', 'data-maat-gemeten': code, 'aria-pressed': String(p.gemeten === code), title: uitleg, 'aria-label': uitleg }, label);
    b.addEventListener('click', () => {
      p.gemeten = code;
      try { localStorage.setItem(SLEUTEL_GEMETEN, code); } catch { /* geen opslag */ }
      for (const x of gemeten.querySelectorAll<HTMLButtonElement>('button')) x.setAttribute('aria-pressed', String(x.dataset.maatGemeten === code));
      werkBij();
    });
    gemeten.append(b);
  }
  kop.append(titel, vormen, gemeten, sluit);
  vak.append(kop);

  const raster = el('div', { class: 'maatpaneel-raster' });
  // Links: de schets met een veld bij elke muur.
  const schets = el('div', { class: 'maatschets', id: 'mp-schets' });
  const linkerkolom = el('div', { class: 'maatpaneel-links' });
  linkerkolom.append(schets, el('div', { id: 'mp-hoeken', class: 'klein' }));
  // In het midden: waar ze komt (gevel, afstand); rechts: naam, soort, meldingen en Plaatsen.
  const rechts = el('div', { class: 'maatpaneel-midden' });
  if (!leeg) {
    const waar = el('div', { class: 'tabs', role: 'group', 'aria-label': 'Waar komt ze' });
    for (const [code, label] of [['tegen', 'Tegen de woning'], ['los', 'Los (bijgebouw)'], ['nieuw', 'Nieuw project']] as const) {
      const b = el('button', { type: 'button', 'data-maat-plaats': code, 'aria-pressed': String(p.plaats === code) }, label);
      b.addEventListener('click', () => {
        p.plaats = code;
        zetNaam();
        bouwPaneel();
        werkBij();
      });
      waar.append(b);
    }
    rechts.append(waar);
  } else {
    rechts.append(el('p', { class: 'klein' }, 'De eerste ruimte van dit project: ze komt linksboven in de plattegrond. Daarna kun je er tegenaan bouwen.'));
  }
  if (!leeg && p.plaats !== 'nieuw') {
    const gevels = el('div', { class: 'maatpaneel-gevels', role: 'group', 'aria-label': 'Tegen welke gevel' });
    for (const k of gevelKnoppen()) {
      const b = el('button', { type: 'button', class: 'tweede', 'data-maat-gevel': k.label, 'aria-pressed': String(p.gevel === k.gevel.id) }, k.label);
      b.addEventListener('click', () => { p.gevel = k.gevel.id; werkBij(); });
      gevels.append(b);
    }
    rechts.append(gevels, el('p', { class: 'klein', id: 'mp-gevel' }, ''));
    const afstand = el('div', { class: 'maatpaneel-afstand' });
    const lab = el('label', { class: 'maatveld-groot' });
    const inv = cmVeld(p.afstand, { 'data-maat-veld': 'afstand', 'aria-label': 'Afstand tot de linkerhoek in cm' });
    inv.addEventListener('input', () => { const w = leesCm(inv.value); if (w !== undefined) { p.afstand = w; werkBij(false); } });
    lab.append(el('span', {}, 'Afstand tot de linkerhoek'), inv, el('span', { class: 'eenheid' }, 'cm'));
    const uitlijn = el('div', { class: 'knoppenrij' });
    for (const [code, label] of [['links', 'Links'], ['midden', 'Midden'], ['rechts', 'Rechts']] as const) {
      const b = el('button', { type: 'button', class: 'tweede', 'data-maat-uitlijn': code }, label);
      b.addEventListener('click', () => {
        const u = uitkomst?.uitlijning;
        if (!u) return;
        p.afstand = u[code];
        inv.value = String(Math.round(p.afstand * 10) / 10).replace('.', ',');
        werkBij(false);
      });
      uitlijn.append(b);
    }
    afstand.append(lab, uitlijn);
    rechts.append(afstand);
    if (p.plaats === 'los') {
      const tl = el('label', { class: 'maatveld-groot' });
      const ti = cmVeld(p.tussenruimte, { 'data-maat-veld': 'tussenruimte', 'aria-label': 'Afstand van de gevel in cm' });
      ti.addEventListener('input', () => { const w = leesCm(ti.value); if (w !== undefined) { p.tussenruimte = w; werkBij(false); } });
      tl.append(el('span', {}, 'Afstand van de gevel'), ti, el('span', { class: 'eenheid' }, 'cm'));
      rechts.append(tl);
    }
  }
  const naam = el('input', { type: 'text', 'aria-label': 'Naam', 'data-maat-naam': '' }) as HTMLInputElement;
  naam.value = p.naam;
  naam.addEventListener('input', () => { p.naam = naam.value; p.getypt.add('naam'); });
  const nr = el('label', { class: 'eig' });
  nr.append(el('span', {}, 'Naam'), naam);
  const sr = el('label', { class: 'eig' });
  sr.append(el('span', {}, 'Soort'), keuzelijst('mp-soort', Object.entries(RUIMTE_TYPES).map(([k, v]) => [k, v.label]), p.type, (w) => { p.type = w as RuimteType; }));
  const onder = el('div', { class: 'maatpaneel-rechts' });
  onder.append(nr, sr, el('div', { id: 'mp-meldingen', 'aria-live': 'polite' }));
  const plaats = el('button', { type: 'button', id: 'mp-plaatsen', class: 'maatpaneel-plaatsen' }, 'Plaatsen');
  plaats.addEventListener('click', () => plaatsen());
  // Meteen in 3D (na het plaatsen); wie erin wil tekenen, blijft met Plaatsen in de plattegrond.
  const met3D = el('button', { type: 'button', id: 'mp-plaatsen-3d', class: 'tweede' }, 'Plaatsen en in 3D bekijken');
  met3D.addEventListener('click', () => plaatsen(true));
  const knoppen = el('div', { class: 'knoppenrij maatpaneel-knoppen' });
  knoppen.append(plaats, met3D);
  onder.append(knoppen);
  raster.append(linkerkolom, rechts, onder);
  vak.append(raster);
  // Enter in een veld: naar het volgende veld; in het laatste: plaatsen (één keer aan het vak gehangen).
  if (vak.dataset.toetsen) return;
  vak.dataset.toetsen = '1';
  vak.addEventListener('keydown', (ev) => {
    const doel = ev.target as HTMLElement;
    if (!paneel) return;
    if (ev.key === 'Escape') { ev.preventDefault(); sluitMatenPaneel(); omg?.dicht(); return; }
    if (ev.key !== 'Enter' || !(doel instanceof HTMLInputElement)) return;
    ev.preventDefault();
    const lijst = [...vak.querySelectorAll<HTMLInputElement>('input[data-maat-veld]:not([data-spiegel])')].filter((x) => !x.disabled && x.offsetParent);
    const i = lijst.indexOf(doel);
    if (i >= 0 && i < lijst.length - 1) lijst[i + 1]!.focus();
    else plaatsen();
  });
}

function kiesVorm(v: 'rechthoek' | 'vierhoek', zijden?: { ab: number; bc: number; cd: number; da: number }) {
  const p = paneel;
  if (!p) return;
  if (v === 'vierhoek' && p.vorm === 'rechthoek') {
    const m = zijden ?? { ab: p.maten.breedte, bc: p.maten.diepte, cd: p.maten.breedte, da: p.maten.diepte };
    // De diagonaal van de rechthoek met dezelfde AB en BC: een vertrekpunt dat je overschrijft met de gemeten diagonaal.
    p.maten = { ...p.maten, ...m, ac: Math.round(Math.hypot(m.ab, m.bc) * 10) / 10 };
  }
  if (v === 'rechthoek' && p.vorm === 'vierhoek') p.maten = { ...p.maten, breedte: p.maten.ab, diepte: p.maten.bc };
  p.vorm = v;
  p.melding = undefined;
  p.getypteMaat = {};
  bouwPaneel();
  werkBij();
}

/** Het veld van een zijde (of de diagonaal) gewijzigd. */
function zijdeGetypt(z: Zijde | 'ac', w: number) {
  const p = paneel!;
  p.melding = undefined;
  if (p.vorm === 'rechthoek') {
    // De overkant volgt; typte de gebruiker die eerder zelf een andere maat, dan zeggen we wat we doen.
    const over: Record<string, Zijde> = { ab: 'cd', cd: 'ab', bc: 'da', da: 'bc' };
    const o = over[z]!;
    const breed = z === 'ab' || z === 'cd';
    // De maat die de gebruiker zelf aan de overkant typte (niet wat daar volgde).
    const vorige = p.getypteMaat[o];
    if (vorige !== undefined && Math.abs(vorige - w) >= 1) {
      const zijden = { ab: p.maten.breedte, bc: p.maten.diepte, cd: p.maten.breedte, da: p.maten.diepte };
      zijden[z as Zijde] = w;
      zijden[o] = vorige;
      p.melding = {
        tekst: `Een rechthoek heeft gelijke overkanten. Je typte ${tekstCm(vorige)} en ${tekstCm(w)}: de app neemt de laatste maat (${tekstCm(w)}) voor beide. Verschillen de muren echt? Kies dan een vrije vorm met schuine muren en meet ook een diagonaal.`,
        vrijeVorm: zijden,
      };
    }
    if (breed) p.maten.breedte = w; else p.maten.diepte = w;
    p.getypteMaat[z as Zijde] = w;
  } else p.maten[z] = w;
  laatsteMaten = { ...p.maten };
  werkBij(false);
}

/** Rekent opnieuw, tekent de schets en de meldingen, en het voorbeeld in de tekening. */
function werkBij(veldenOpnieuw = true) {
  if (!paneel || !omg) return;
  uitkomst = bereken();
  const p = paneel;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-maat-gevel]')) {
    const k = gevelKnoppen().find((x) => x.label === b.dataset.maatGevel);
    b.setAttribute('aria-pressed', String(k?.gevel.id === p.gevel));
  }
  const g = gekozenGevel();
  const gevelTekst = $('#mp-gevel') as HTMLElement | null;
  if (gevelTekst) gevelTekst.textContent = g ? `Gevel van ${tekstCm(g.hoekRechts - g.hoekLinks)} breed (buitenkant)${g.schuin ? ', schuin' : ''}. Of tik op een muur in de tekening.` : 'Tik op een buitenmuur in de tekening.';
  tekenSchets(veldenOpnieuw);
  // Meldingen.
  const vak = $('#mp-meldingen');
  vak.replaceChildren();
  if (p.melding) {
    const m = el('p', { class: 'kleinmelding waarschuwing' }, p.melding.tekst);
    if (p.melding.vrijeVorm) {
      const zijden = p.melding.vrijeVorm;
      const b = el('button', { type: 'button', class: 'tweede' }, 'Vrije vorm met deze vier maten');
      b.addEventListener('click', () => kiesVorm('vierhoek', zijden));
      m.append(' ', b);
    }
    vak.append(m);
  }
  for (const f of uitkomst?.fouten ?? []) vak.append(el('p', { class: 'kleinmelding fout' }, f));
  for (const w of uitkomst?.waarschuwingen ?? []) vak.append(el('p', { class: 'kleinmelding waarschuwing' }, w));
  // Kan het dak van de woning nog? (Een hellend dak kan de motor alleen op één rechthoek.)
  if (uitkomst?.punten.length && !uitkomst.fouten.length && p.plaats !== 'nieuw' && omg.plan().ruimtes.length) {
    const proef = structuredClone(toestand().plan);
    const r: Ruimte = { id: 'proef', naam: p.naam, type: p.type, x: 0, y: 0, b: 0, d: 0, vloer: 'parket_eik', wand: 'wit', niveau: omg.niveau() };
    zetMaatVorm(r, uitkomst);
    proef.ruimtes.push(r);
    const nu = dakOpbouw(toestand().plan)?.terugval, straks = dakOpbouw(proef)?.terugval;
    if (straks && !nu) vak.append(el('p', { class: 'kleinmelding waarschuwing' }, `Let op het dak: ${straks} (Een hellend dak kan nog alleen op één rechthoek.)`));
  }
  for (const k of document.querySelectorAll<HTMLButtonElement>('#mp-plaatsen, #mp-plaatsen-3d')) k.disabled = !uitkomst?.punten.length || !!uitkomst.fouten.length;
  omg.opnieuw();
}

/** De schets: de gemeten vorm zoals ze in de tekening komt te liggen, met een veld bij elke muur. */
function tekenSchets(veldenOpnieuw: boolean) {
  const p = paneel!;
  const vak = $('#mp-schets');
  const W = 300, H = 230;
  // De vorm: de laatste die kon, anders een rechthoek met de getypte maten.
  const vorm = uitkomst?.gemeten.length ? uitkomst.gemeten : [[0, 0], [p.maten.breedte, 0], [p.maten.breedte, p.maten.diepte], [0, p.maten.diepte]] as Punt[];
  const xs = vorm.map((q) => q[0]), ys = vorm.map((q) => q[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0 || 1, bh = Math.max(...ys) - y0 || 1;
  // Rand voor de velden (in beeldpunten), de rest voor de vorm.
  const rand = 62;
  const f = Math.min((W - 2 * rand) / bw, (H - 2 * rand) / bh);
  const naar = ([x, y]: Punt): Punt => [rand + (x - x0) * f + ((W - 2 * rand) - bw * f) / 2, rand + (y - y0) * f + ((H - 2 * rand) - bh * f) / 2];
  const v = vorm.map(naar);
  const g = gekozenGevel();
  const leeg = !omg!.plan().ruimtes.length;
  let woning = '';
  if (g && p.plaats !== 'nieuw' && !leeg) {
    // De gevel van de woning als band achter AB (tegen) of op een afstand (los).
    const a = v[0]!, b = v[1]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const u: Punt = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], o: Punt = [-u[1], u[0]];
    // o wijst naar binnen in de vorm (met de klok mee ligt de vorm rechts); de woning ligt aan de andere kant.
    const af = p.plaats === 'los' ? 26 : 0;
    const q = (s: number, t: number): string => `${a[0] + u[0] * s - o[0] * t},${a[1] + u[1] * s - o[1] * t}`;
    woning = `<polygon points="${q(-46, af)} ${q(l + 46, af)} ${q(l + 46, af + 12)} ${q(-46, af + 12)}" fill="#cfd4d6" stroke="#8b959a"/>`
      + `<text x="${a[0] - u[0] * 30 - o[0] * (af + 22)}" y="${a[1] - u[1] * 30 - o[1] * (af + 22)}" font-size="11" text-anchor="middle" dominant-baseline="central" fill="#4b5753">woning</text>`;
  }
  const letters = p.vorm === 'vierhoek' ? v.map((q, i) => {
    const c = v.reduce((s, x) => [s[0] + x[0] / 4, s[1] + x[1] / 4], [0, 0]);
    const dx = q[0] - c[0], dy = q[1] - c[1], l = Math.hypot(dx, dy) || 1;
    const hoek = uitkomst?.hoeken[i];
    return `<text x="${q[0] + (dx / l) * 12}" y="${q[1] + (dy / l) * 12}" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#34505f">${'ABCD'[i]}</text>`
      + (hoek !== undefined ? `<text x="${q[0] - (dx / l) * 16}" y="${q[1] - (dy / l) * 16}" font-size="10" text-anchor="middle" dominant-baseline="central" fill="#5f676d">${getal(hoek, 1)}°</text>` : '');
  }).join('') : '';
  const diag = p.vorm === 'vierhoek' ? `<line x1="${v[0]![0]}" y1="${v[0]![1]}" x2="${v[2]![0]}" y2="${v[2]![1]}" stroke="#34505f" stroke-dasharray="5 4"/>` : '';
  const fout = !!uitkomst?.fouten.length;
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${woning}<polygon points="${v.map((q) => q.join(',')).join(' ')}" fill="${fout ? '#f6e3e1' : '#e4ecef'}" stroke="${fout ? '#a1342b' : '#383836'}" stroke-width="5" stroke-linejoin="round"/>${diag}${letters}</svg>`;
  if (!veldenOpnieuw && vak.querySelector('svg')) {
    vak.querySelector('svg')!.outerHTML = svg;
    zetVeldPlaatsen(v);
    return;
  }
  vak.innerHTML = svg;
  // Een veld bij elke muur (en bij de diagonaal).
  const zijdeWaarde = (z: Zijde) => (p.vorm === 'rechthoek' ? (z === 'ab' || z === 'cd' ? p.maten.breedte : p.maten.diepte) : p.maten[z]);
  const naamVan: Record<Zijde, string> = p.vorm === 'rechthoek'
    ? { ab: 'Breedte', bc: 'Diepte', cd: 'Breedte (overkant)', da: 'Diepte (overkant)' }
    : { ab: 'Zijde AB', bc: 'Zijde BC', cd: 'Zijde CD', da: 'Zijde DA' };
  for (const z of ZIJDEN) {
    const i = cmVeld(zijdeWaarde(z), { 'data-maat-veld': z, 'aria-label': `${naamVan[z]} in cm`, title: naamVan[z] });
    i.addEventListener('input', () => {
      const w = leesCm(i.value);
      if (w === undefined) return;
      zijdeGetypt(z, w);
      if (p.vorm === 'rechthoek') {
        // De overkant volgt zichtbaar.
        const over = vak.querySelector<HTMLInputElement>(`[data-maat-veld="${({ ab: 'cd', cd: 'ab', bc: 'da', da: 'bc' } as const)[z]}"]`);
        if (over) over.value = String(w);
      }
    });
    vak.append(i);
  }
  if (p.vorm === 'vierhoek') {
    const i = cmVeld(p.maten.ac, { 'data-maat-veld': 'ac', 'aria-label': 'Diagonaal AC in cm', title: 'Diagonaal AC' });
    i.addEventListener('input', () => { const w = leesCm(i.value); if (w !== undefined) zijdeGetypt('ac', w); });
    vak.append(i);
  }
  // Volgorde voor Enter: AB, BC, (CD, DA, AC bij een vrije vorm); bij een rechthoek volgen CD en DA vanzelf.
  // Bij een rechthoek volgen CD en DA vanzelf: Enter springt erover.
  if (p.vorm === 'rechthoek') for (const z of ['cd', 'da']) vak.querySelector(`[data-maat-veld="${z}"]`)?.setAttribute('data-spiegel', '');
  zetVeldPlaatsen(v);
}

/** Zet de velden bij hun muur: in het midden van de zijde, een eind naar buiten. */
function zetVeldPlaatsen(v: Punt[]) {
  const vak = $('#mp-schets');
  const W = 300, H = 230;
  const c = v.reduce((s, x) => [s[0] + x[0] / v.length, s[1] + x[1] / v.length], [0, 0]);
  ZIJDEN.forEach((z, i) => {
    const veld = vak.querySelector<HTMLElement>(`[data-maat-veld="${z}"]`);
    const a = v[i], b = v[(i + 1) % v.length];
    if (!veld || !a || !b) return;
    const m: Punt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dx = m[0] - c[0], dy = m[1] - c[1], l = Math.hypot(dx, dy) || 1;
    // De muur naar de woning: het veld voorbij de band van de woning.
    const ver = i === 0 && paneel?.plaats !== 'nieuw' && omg?.plan().ruimtes.length ? (paneel?.plaats === 'los' ? 1.9 : 1.35) : 1;
    const x = Math.max(36, Math.min(W - 36, m[0] + (dx / l) * 32 * ver)), y = Math.max(22, Math.min(H - 22, m[1] + (dy / l) * 30 * ver));
    veld.style.left = `${x}px`;
    veld.style.top = `${y}px`;
  });
  const ac = vak.querySelector<HTMLElement>('[data-maat-veld="ac"]');
  if (ac && v[0] && v[2]) {
    // Op de diagonaal, wat dichter bij C (in het midden zou het de maat van een zijde raken).
    ac.style.left = `${v[0][0] + (v[2][0] - v[0][0]) * 0.58}px`;
    ac.style.top = `${v[0][1] + (v[2][1] - v[0][1]) * 0.58}px`;
  }
  const hoeken = $('#mp-hoeken');
  hoeken.textContent = paneel?.vorm === 'vierhoek' && uitkomst?.punten.length
    ? `Hoeken A ${getal(uitkomst.hoeken[0]!, 1)}°, B ${getal(uitkomst.hoeken[1]!, 1)}°, C ${getal(uitkomst.hoeken[2]!, 1)}°, D ${getal(uitkomst.hoeken[3]!, 1)}°. Meet ter controle ook de diagonaal BD: ${tekstCm(uitkomst.diagonalen[1])}.`
    : paneel?.vorm === 'vierhoek' ? 'Typ de vier zijden en de diagonaal AC (van A naar C).' : '';
}

/** Zet de ruimte (of maakt het nieuwe project). */
function plaatsen(in3D = false) {
  const p = paneel;
  if (!p || !omg) return;
  const m = bereken();
  if (!m?.punten.length || m.fouten.length) { werkBij(false); return; }
  const n = omg.niveau();
  const leeg = !omg.plan().ruimtes.length;
  const naam = p.naam.trim() || RUIMTE_TYPES[p.type].label;
  const r: Ruimte = { id: nieuweId('r'), naam, type: p.type, x: 0, y: 0, b: 0, d: 0, vloer: p.type === 'garage' || p.type === 'berging' ? 'tegel_grijs' : 'parket_eik', wand: 'wit', niveau: n };
  zetMaatVorm(r, m);
  const maten = p.vorm === 'rechthoek' ? `${getal(p.maten.breedte)} × ${getal(p.maten.diepte)} cm` : `${getal(p.maten.ab)}, ${getal(p.maten.bc)}, ${getal(p.maten.cd)} en ${getal(p.maten.da)} cm`;
  const soortMaat = p.gemeten === 'buiten' ? 'buitenmaten' : 'binnenmaten';
  laatsteMaten = { ...p.maten };
  if (p.plaats === 'nieuw' && !leeg) {
    // Een nieuw project met alleen dit gebouw, met de muren en de gevel van dit project en een plat dak.
    const oud = toestand();
    const basis = legeToestand();
    const plan: Plattegrond = {
      ...basis.plan, muurhoogte: oud.plan.muurhoogte, buitenmuur: oud.plan.buitenmuur, binnenmuur: oud.plan.binnenmuur, gevel: oud.plan.gevel,
      ...(oud.plan.gevelOntwerp ? { gevelOntwerp: { standaard: oud.plan.gevelOntwerp.standaard, ...(oud.plan.gevelOntwerp.sokkel ? { sokkel: oud.plan.gevelOntwerp.sokkel } : {}) } } : {}),
      dak: standaardDak(), ruimtes: [{ ...r, niveau: 0 }],
    };
    const t: Toestand = { plan, posities: [], meta: { ...basis.meta, regels: { ...basis.meta.regels, gevel: true, dak: true } } };
    nieuwProject(t, `${naam} ${maten}`);
    sluitMatenPaneel();
    omg.geplaatst(r.id, `Nieuw project "${naam} ${maten}" (${soortMaat}). Plaats nu een deur of ramen; het vorige project staat bij Projecten.`);
    if (in3D) omg.naar3D();
    return;
  }
  wijzig('plan', (t) => {
    if (leeg) { t.plan.dak ??= standaardDak(); t.meta.regels.dak ??= true; }
    t.plan.ruimtes.push(r);
  });
  sluitMatenPaneel();
  const waar = leeg ? '' : p.plaats === 'tegen' ? ' tegen de gevel' : ' als los gebouw';
  omg.geplaatst(r.id, `${naam} geplaatst${waar}: ${maten} (${soortMaat}).${p.plaats === 'tegen' && !leeg ? ' Voeg een deur of doorgang naar de woning toe.' : ' Plaats nu een deur of ramen.'}`);
  if (in3D) omg.naar3D();
}
