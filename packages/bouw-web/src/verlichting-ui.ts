/**
 * Verlichting in één tik (ronde 15b, 17/11/2026). Jonas, na de testversie: *"het plaatsen van een ledstrip is te
 * complex"* (7 tikken in drie schermen). Nu kan het in de 3D zelf, waar je het ziet:
 *   - **Bij de nacht**: onder *Dag / Nacht* rechtsboven op de 3D de knop *Verlichting*. Overdag zet een tik de nacht aan
 *     en opent de voorstellen; 's nachts staan ze open (een tik op *Verlichting* klapt ze dicht of open, een tik of
 *     sleep in de 3D klapt ze dicht, zoals een keuzelijst): *Ledstrip onder de dakrand*, *Lampen bij de deuren*,
 *     *Tuinlampen*. Eén tik zet ze aan of uit (half = een deel staat er, een tik vult de rest aan). De melding van een tik
 *     staat linksonder op de 3D, een tiental seconden.
 *   - **In het keuzepaneel van de 3D** (`verlichtingBijDing`, één aanroep in `toonDing`): bij een gevel *Ledstrip onder de
 *     dakrand van deze gevel*, bij een deur naar buiten *Buitenlamp naast deze deur*, bij een ruimte *Ledstrip rondom langs
 *     het plafond*. Staat de nacht uit, dan gaat ze aan, met een korte melding.
 * Wat er komt, rekent de motor uit (core/src/verlichting.ts): gewone techniek, gemerkt, zodat uit precies dat weghaalt
 * en wat de verkoper zelf tekende blijft. Elke tik is één stap voor *Ongedaan maken*. Niet in de klantweergave (de klant
 * kijkt; dit wijzigt het ontwerp).
 */
import {
  VERLICHTING_VOORSTELLEN, verlichtingInPlan, verlichtingStaat, verlichtingVerwacht, verlichtingVoorstel, wisselVerlichting,
  type Opening, type VerlichtingUitkomst, type VerlichtingVoorstel,
} from '../../core/src/index.js';
import { planCatalogus as cat } from '../../core/voorbeelden/inrichting.js';
import { el, getal, schakelaar } from './hulp.js';
import { nachtGekozen, zetNacht } from './nacht-ui.js';
import { nieuweId, opWijziging, positieVan, toestand, wijzig } from './staat.js';

/** De voorstellen bij de nacht, met een kort label voor de knop (de uitleg staat in de titel). */
const BIJ_NACHT: [VerlichtingVoorstel, string][] = [
  ['dakrand', 'Ledstrip onder de dakrand'],
  ['deuren', 'Lampen bij de deuren'],
  ['tuin', 'Tuinlampen'],
];

/** Een deur die al bestaat en blijft (aantal 0), krijgt geen lamp: dat is geen werk. */
const telt = (o: Opening) => positieVan(o)?.aantal !== 0;
const opties = () => ({ nieuweId, telt });

let paneel: HTMLElement | undefined;
/** De melding van een tik bij de nacht: linksonder over de 3D (waar meestal gras ligt), na een tiental seconden weg. */
let toast: HTMLElement | undefined;
let toastKlok: ReturnType<typeof setTimeout> | undefined;
/** 's Nachts open of dichtgeklapt (overdag altijd dicht: alleen de knop). */
let open = true;
let nachtGetoond = false;
/** De melding van de laatste tik (bij de nacht, of bij het ding in het keuzepaneel), een tiental seconden zichtbaar. */
let melding: { tekst: string; tijd: number; ding?: string } | undefined;
const recent = () => !!melding && performance.now() - melding.tijd < 10000;

const m = (x: number) => `${getal(x, 1)} m`;
const meer = (n: number, een: string, veel: string) => `${n} ${n === 1 ? een : veel}`;

/** De melding na een tik, in gewone woorden. */
function tekstNa(s: VerlichtingVoorstel, u: VerlichtingUitkomst, opEen: boolean): string {
  if (!u.aan && u.stuks) {
    const wat = s === 'deuren' ? meer(u.stuks, 'buitenlamp', 'buitenlampen') : s === 'tuin' ? meer(u.stuks, 'tuinlamp', 'tuinlampen') : 'De ledstrip';
    return `${wat} weggehaald. Wat je zelf tekende, blijft.`;
  }
  if (!u.aan) {
    if (s === 'dakrand') return 'Hier is geen dakrand om een ledstrip onder te hangen (een bestaande muur, een muur tegen de buren of een topgevel).';
    if (s === 'deuren') return 'Geen deur naar buiten op het gelijkvloers, of geen plaats naast de deur.';
    if (s === 'tuin') return 'Geen terras of pad: die komen vanzelf voor een schuifraam en voor de voordeur.';
    return 'Hier past geen ledstrip.';
  }
  if (s === 'dakrand') return opEen ? `Ledstrip onder de dakrand van deze gevel: ${m(u.lengte)}.` : `Ledstrip onder de dakrand: ${m(u.lengte)}, aan ${meer(u.dingen, 'kant', 'kanten')} van de woning.`;
  if (s === 'deuren') return opEen ? `${u.stuks === 1 ? 'Een buitenlamp' : `${u.stuks} buitenlampen`} naast deze opening.` : `${meer(u.stuks, 'buitenlamp', 'buitenlampen')} bij ${meer(u.dingen, 'deur', 'deuren')}.`;
  if (s === 'tuin') return `${meer(u.stuks, 'tuinlamp', 'tuinlampen')} op het gras, bij het terras of langs het pad.`;
  return `Ledstrip rondom langs het plafond: ${m(u.lengte)}.`;
}

/**
 * Eén tik: rekent op een kopie wat er zou veranderen en voert het dan uit als één wijziging (één stap ongedaan maken);
 * verandert er niets, dan geen wijziging, alleen de melding. Na *aan* staat de nacht aan, zodat je het meteen ziet.
 */
function voerUit(s: VerlichtingVoorstel, bij?: string, ding?: string): VerlichtingUitkomst {
  const proef = structuredClone(toestand().plan);
  const u = wisselVerlichting(proef, cat, s, { ...opties(), ...(bij !== undefined ? { bij } : {}) });
  let tekst = tekstNa(s, u, bij !== undefined);
  const nachtErbij = u.aan && !nachtGekozen();
  if (nachtErbij) tekst += ' De 3D toont nu de nacht (Dag rechtsboven zet het terug).';
  melding = { tekst, tijd: performance.now(), ...(ding ? { ding } : {}) };
  if (u.stuks) {
    wijzig('plan', (t) => {
      if (proef.leidingen) t.plan.leidingen = proef.leidingen; else delete t.plan.leidingen;
      if (proef.toestellen) t.plan.toestellen = proef.toestellen; else delete t.plan.toestellen;
    });
  }
  if (nachtErbij) zetNacht(true);
  teken();
  return u;
}

// ---------- bij de nacht ----------

/**
 * Wat bij de nacht over de 3D komt (één keer gemaakt): het paneel *Verlichting* onder *Dag / Nacht* (`#pl-verlichting`)
 * en de melding van een tik linksonder (`#pl-verlichting-melding`).
 */
export function verlichtingIn3D(): HTMLElement[] {
  return [verlichtingPaneel(), toast ??= el('p', { id: 'pl-verlichting-melding', class: 'vmelding intern', role: 'status' })];
}

function verlichtingPaneel(): HTMLElement {
  if (paneel) return paneel;
  paneel = el('div', { id: 'pl-verlichting', class: 'verlichting intern', role: 'group', 'aria-label': 'Verlichting' });
  const kop = el('button', { type: 'button', class: 'vkop', 'data-verlichting-open': '', 'aria-expanded': 'false', title: 'Ledstrips en lampen in één tik (toont de woning bij nacht)' });
  kop.append(el('span', { class: 'lampje', 'aria-hidden': 'true' }), el('span', {}, 'Verlichting'), el('span', { class: 'vpijl', 'aria-hidden': 'true' }));
  kop.addEventListener('click', () => {
    // Overdag: de nacht aan en de voorstellen open. 's Nachts: dichtklappen of weer open.
    if (!nachtGetoond) { open = true; zetNacht(true); return; }
    open = !open;
    teken();
  });
  const lijst = el('div', { class: 'vlijst' });
  for (const [s, label] of BIJ_NACHT) {
    const b = el('button', { type: 'button', 'data-verlichting': s, 'aria-pressed': 'false', title: VERLICHTING_VOORSTELLEN[s].uitleg });
    b.append(el('span', { class: 'vvink', 'aria-hidden': 'true' }), el('span', {}, label));
    b.addEventListener('click', () => voerUit(s));
    lijst.append(b);
  }
  paneel.append(kop, lijst);
  // Na elke wijziging (ook ongedaan maken of een ander project): de knoppen volgen het plan.
  opWijziging(() => { if (nachtGetoond && open) teken(); });
  // Zoals een keuzelijst: wie in de 3D tikt of draait, wil het beeld zien; de voorstellen klappen dicht (een tik op
  // *Verlichting* opent ze weer). Anders lag de lijst op een tablet over de rechterkant van de woning.
  document.addEventListener('pointerdown', (e) => {
    if (open && nachtGetoond && (e.target as Element | null)?.closest?.('#pl-3d canvas')) { open = false; teken(); }
  }, true);
  teken();
  return paneel;
}

/** De 3D toont de nacht of de dag (zie `nachtIn3D` in plattegrond-ui.ts): het paneel volgt. */
export function toonVerlichting(nacht: boolean) {
  if (nacht && !nachtGetoond) open = true;
  nachtGetoond = nacht;
  teken();
}

function teken() {
  if (!paneel) return;
  const lijstOpen = nachtGetoond && open;
  paneel.classList.toggle('nacht', nachtGetoond);
  paneel.querySelector('[data-verlichting-open]')?.setAttribute('aria-expanded', String(lijstOpen));
  const lijst = paneel.querySelector<HTMLElement>('.vlijst')!;
  lijst.hidden = !lijstOpen;
  if (lijstOpen) {
    const plan = toestand().plan;
    for (const b of lijst.querySelectorAll<HTMLButtonElement>('[data-verlichting]')) {
      const staat = verlichtingStaat(plan, cat, b.dataset.verlichting as VerlichtingVoorstel, opties());
      b.setAttribute('aria-pressed', staat === 'aan' ? 'true' : staat === 'deels' ? 'mixed' : 'false');
    }
  }
  if (toast) {
    toast.textContent = nachtGetoond && recent() && !melding!.ding ? melding!.tekst : '';
    if (toastKlok) clearTimeout(toastKlok);
    if (toast.textContent) toastKlok = setTimeout(teken, 10200);
  }
}

// ---------- in het keuzepaneel van de 3D ----------

/**
 * De schakelaar voor verlichting bij een aangetikt ding, bovenaan in het keuzepaneel (onder de titel): een gevel met een
 * dakrand, een deur naar buiten (voordeur, terrasdeur, schuifraam, garagepoort), een nieuwe ruimte. Anders niets.
 */
export function verlichtingBijDing(vak: HTMLElement, ding: string) {
  const [soort, id = '', kant = ''] = ding.split(':');
  const plan = toestand().plan;
  let s: VerlichtingVoorstel, bij: string, label: string;
  if (soort === 'gevel') {
    s = 'dakrand';
    bij = kant;
    label = 'Ledstrip onder de dakrand van deze gevel';
    if (!verlichtingInPlan(plan, s).has(bij) && !verlichtingVerwacht(plan, cat, s).has(bij)) return;
  } else if (soort === 'opening') {
    s = 'deuren';
    bij = id;
    const o = plan.openingen.find((x) => x.id === id);
    const lampen = verlichtingVoorstel(plan, cat, s, { ...opties(), bij })[0]?.toestellen.length ?? (plan.toestellen ?? []).filter((t) => t.voorstel === s && t.voorstelBij === id).length;
    if (!o || !lampen) return;
    const wat = o.soort === 'schuifraam' ? 'dit schuifraam' : o.soort === 'garagepoort' ? 'deze poort' : 'deze deur';
    label = `${lampen > 1 ? 'Buitenlampen' : 'Buitenlamp'} naast ${wat}`;
  } else if (soort === 'ruimte') {
    s = 'plafond';
    bij = id;
    label = 'Ledstrip rondom langs het plafond';
    if (!plan.ruimtes.some((r) => r.id === id && r.bestaand !== true)) return;
  } else return;
  const blok = el('div', { class: 'vding', 'data-verlichting-ding': s });
  const sch = schakelaar(label, verlichtingInPlan(plan, s).has(bij), () => {
    const u = voerUit(s, bij, ding);
    // Veranderde er niets (kan niet), dan tekent niemand het paneel opnieuw: de schakelaar terug en de melding erbij.
    if (!u.stuks) {
      (sch.querySelector('input') as HTMLInputElement).checked = verlichtingInPlan(toestand().plan, s).has(bij);
      blok.querySelector('.vmelding')?.remove();
      blok.append(el('p', { class: 'klein vmelding', role: 'status' }, melding?.tekst ?? ''));
    }
  });
  blok.append(sch);
  if (recent() && melding!.ding === ding) blok.append(el('p', { class: 'klein vmelding', role: 'status' }, melding!.tekst));
  const kop = vak.querySelector(':scope > .kaartkop');
  if (kop) kop.after(blok); else vak.append(blok);
}
