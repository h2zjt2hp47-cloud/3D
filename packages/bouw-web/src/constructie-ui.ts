/**
 * Constructie (ronde 6, fase 2 "detail invullen"): de knop *Afgewerkt / Constructie* bij de 3D van de woning, de keuze
 * van de opbouw per plaats (bij *Woning*, dicht tot je ze openklapt) en in het overzicht de meetstaat, de aanwijzing
 * voor EPB en de schatting van de stabiliteit (achter een kop die openklapt; pas dan gerekend).
 *
 * Alles komt uit één lijst in de motor (`woningConstructie`, core/src/constructie.ts). De afgewerkte 3D, de gevels en de
 * offerte lezen de opbouw niet. Elke uitkomst toont zichtbaar dat ze een voorstelling, aanwijzing of schatting is.
 */
import {
  CONSTRUCTIE_VOORBEHOUD, constructie3D, LAAG_ROLLEN, OPBOUW_PLAATSEN, STABILITEIT_BUITEN_BEREIK, STABILITEIT_VOORBEHOUD, WARMTE_NIET_NAGELEZEN,
  WARMTE_VOORBEHOUD, totaleDikte, woningConstructie, woningMeetstaat, woningStabiliteit, woningWarmte,
  type Constructie3DOpties, type MeetstaatRegel, type OpbouwPlaats, type PlanCatalogus, type Plattegrond, type Scene3D, type WoningConstructie,
} from '../../core/src/index.js';
import { planCatalogus } from '../../core/voorbeelden/inrichting.js';
import { woningOpbouwCatalogus } from '../../core/voorbeelden/woningopbouw.js';
import { warmtewaarden } from '../../core/voorbeelden/warmtewaarden.js';
import { stabiliteitswaarden } from '../../core/voorbeelden/stabiliteitswaarden.js';
import { $, el, getal, kopieer } from './hulp.js';
import { toestand, wijzig } from './staat.js';

/** De plancatalogus met de opbouwen erbij (de catalogus van de plattegrond zelf kent ze niet). */
export const constructieCatalogus: PlanCatalogus = { ...planCatalogus, opbouw: woningOpbouwCatalogus };

/** Welke weergave de 3D van de woning toont. Hoort bij het kijken, niet bij het project: niet bewaard, start op Afgewerkt. */
let weergave: 'afgewerkt' | 'constructie' = 'afgewerkt';
let opnieuw: () => void = () => {};

export const constructieAan = () => weergave === 'constructie';

/**
 * De constructie van het huidige plan, één keer per toestand (de 3D, het overzicht en de doorsnede delen ze). De toestand
 * wordt ter plaatse gewijzigd (`wijzig`): daarom is de sleutel de tekst van het plan, niet het object.
 */
let bewaard: { sleutel: string; c: WoningConstructie } | undefined;
export function huidigeConstructie(): WoningConstructie {
  const plan: Plattegrond = toestand().plan;
  const sleutel = JSON.stringify(plan);
  if (bewaard?.sleutel !== sleutel) bewaard = { sleutel, c: woningConstructie(plan, constructieCatalogus) };
  return bewaard.c;
}

/** De scène van de constructieweergave, met het kader van de afgewerkte weergave (zo springt de camera niet). */
export function constructieScene(opties: Constructie3DOpties): Scene3D {
  return constructie3D(toestand().plan, constructieCatalogus, opties, huidigeConstructie());
}

/**
 * De knop *Afgewerkt / Constructie* boven de knoppen van de 3D, met de zin dat de constructie een voorstelling is
 * (alleen in *Constructie*). `opnieuw` tekent de 3D opnieuw.
 */
export function startConstructie(omgeving: { opnieuw: () => void }) {
  opnieuw = omgeving.opnieuw;
  const knoppen = $('#pl-3d-knoppen');
  const rij = el('div', { class: 'constructiebalk' });
  const tabs = el('div', { class: 'tabs', role: 'group', 'aria-label': 'Weergave van de 3D', id: 'pl-3d-weergave' });
  for (const [w, label, uitleg] of [
    ['afgewerkt', 'Afgewerkt', 'De woning zoals ze er afgewerkt uitziet'],
    ['constructie', 'Constructie', 'Wat erin zit: houtskelet, balken, kepers en de lagen'],
  ] as const) {
    const b = el('button', { type: 'button', 'data-3d-weergave': w, 'aria-pressed': String(weergave === w), title: uitleg }, label);
    b.addEventListener('click', () => zetWeergave(w));
    tabs.append(b);
  }
  const noot = el('p', { class: 'constructienoot klein', id: 'pl-constructie-noot', hidden: '' }, CONSTRUCTIE_VOORBEHOUD);
  rij.append(tabs, noot);
  knoppen.prepend(rij);
}

function zetWeergave(w: 'afgewerkt' | 'constructie') {
  weergave = w;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-3d-weergave]')) b.setAttribute('aria-pressed', String(b.dataset['3dWeergave'] === w));
  const noot = document.getElementById('pl-constructie-noot');
  if (noot) noot.hidden = w !== 'constructie';
  // In de constructie kies je geen afwerking door te tikken, wel de opbouw van een buitenmuur.
  const hint = document.querySelector<HTMLElement>('#pl-3d-knoppen .tikhint');
  if (hint) {
    hint.dataset.afgewerkt ??= hint.textContent ?? '';
    hint.textContent = w === 'constructie' ? 'Tik op een buitenmuur om haar opbouw te kiezen; een vloer of het dak toont de zijne.' : hint.dataset.afgewerkt;
  }
  opnieuw();
}

// ---------- de keuze van de opbouw (bij Woning) ----------

const mm = (x: number) => `${getal(x, 1)} mm`;
const cm = (x: number) => `${getal(x / 10, 1)} cm`;

/**
 * De opbouw per plaats, voor de hele woning: één keuzelijst per plaats, achter een kop die openklapt. De lagen staan
 * per plaats nog een tik verder. "Standaard" schrijft niets in het plan; de buitenmuren volgen dan de gevel.
 */
/** Wat er openstaat (de kaart wordt na elke wijziging opnieuw gemaakt; zo klapt ze niet dicht). */
const open = new Set<string>();
const onthoud = (d: HTMLDetailsElement, sleutel: string) => {
  d.open = open.has(sleutel);
  d.addEventListener('toggle', () => { if (d.open) open.add(sleutel); else open.delete(sleutel); });
};

export function opbouwKeuze(): HTMLElement {
  const oc = woningOpbouwCatalogus, plan = toestand().plan;
  const d = el('details', { class: 'opbouwkeuze', id: 'pl-opbouw' }) as HTMLDetailsElement;
  onthoud(d, 'opbouw');
  d.append(el('summary', {}, 'Opbouw voor de constructie'));
  const inhoud = el('div', { class: 'opbouwinhoud' });
  inhoud.append(el('p', { class: 'klein' }, 'Wat de constructieweergave, de doorsnede en de meetstaat gebruiken. Voorbeelden, door geen vakman nagelezen.'));
  for (const plaats of OPBOUW_PLAATSEN) {
    const p = oc.plaatsen[plaats];
    const gekozen = plan.opbouw?.[plaats];
    const standaard = plaats === 'buitenwand' ? 'Volgens de gevel' : `Standaard: ${oc.opbouwen[p.standaard]?.naam ?? p.standaard}`;
    const s = el('select', { 'data-opbouw': plaats, 'aria-label': p.label }) as HTMLSelectElement;
    s.append(el('option', { value: '' }, standaard));
    for (const code of p.keuzes) s.append(el('option', { value: code }, oc.opbouwen[code]?.naam ?? code));
    s.value = gekozen && p.keuzes.includes(gekozen) ? gekozen : '';
    s.disabled = p.keuzes.length < 2 && !gekozen;
    s.addEventListener('change', () => zetOpbouw(plaats, s.value || undefined));
    const rij = el('label', { class: 'opbouwrij' });
    rij.append(el('span', {}, p.label), s);
    inhoud.append(rij);
    // De lagen pas een tik verder (de standaard, of de keuze).
    const code = s.value || (plaats === 'buitenwand' ? '' : p.standaard);
    const o = code ? oc.opbouwen[code] : undefined;
    if (o) {
      const lagen = el('details', { class: 'opbouwlagen' }) as HTMLDetailsElement;
      onthoud(lagen, `lagen:${plaats}`);
      lagen.append(el('summary', {}, `Lagen (${cm(totaleDikte(o))})`));
      const ol = el('ol', { class: 'klein' });
      for (const l of o.lagen) ol.append(el('li', {}, `${l.naam}, ${mm(l.dikte)}${l.hout ? ` (hout ${l.hout.breedte} mm om de ${l.hout.hoh} mm)` : ''}`));
      lagen.append(ol);
      inhoud.append(lagen);
    } else if (plaats === 'buitenwand') {
      inhoud.append(el('p', { class: 'klein' }, 'Gevelsteen of steenstrips: houtskelet met steenstrips; hout: met houten bekleding; pleister: met sierpleister.'));
    }
  }
  d.append(inhoud);
  return d;
}

/**
 * Tik in de constructie (ronde 6): welke opbouw dit ding heeft, en bij een buitenmuur een afwijking voor dit muurvlak
 * (de rest van de woning blijft). Een vloer of dak toont zijn opbouw; per ruimte kiezen heeft pas zin met meer dan één
 * opbouw per plaats in de catalogus.
 */
export function toonOpbouwVanDing(vak: HTMLElement, ding: string | null, sluit: () => void) {
  const c = huidigeConstructie(), oc = woningOpbouwCatalogus;
  const delen = ding ? c.delen.filter((d) => d.ding === ding) : [];
  if (!ding || !delen.length) { vak.hidden = true; vak.replaceChildren(); return; }
  vak.hidden = false;
  const kop = el('div', { class: 'kaartkop' });
  const dicht = el('button', { type: 'button', class: 'tweede', 'aria-label': 'Sluiten' }, 'Sluiten');
  dicht.addEventListener('click', sluit);
  const eerste = delen[0]!;
  kop.append(el('h3', {}, eerste.wat.replace(/^Topgevel boven: /, '')), dicht);
  vak.replaceChildren(kop);
  const codes = [...new Set(delen.map((d) => d.opbouw))];
  if (ding.startsWith('gevel:')) {
    const sleutel = ding.slice('gevel:'.length);
    const p = oc.plaatsen.buitenwand;
    const s = el('select', { 'data-opbouw-vlak': sleutel, 'aria-label': 'Opbouw van deze buitenmuur' }) as HTMLSelectElement;
    s.append(el('option', { value: '' }, 'Zoals de woning'));
    for (const code of p.keuzes) s.append(el('option', { value: code }, oc.opbouwen[code]?.naam ?? code));
    s.value = toestand().plan.opbouw?.vlakken?.[sleutel] ?? '';
    s.addEventListener('change', () => wijzig('plan', (t) => {
      const o = { ...(t.plan.opbouw ?? {}) };
      const vlakken = { ...(o.vlakken ?? {}) };
      if (s.value) vlakken[sleutel] = s.value; else delete vlakken[sleutel];
      if (Object.keys(vlakken).length) o.vlakken = vlakken; else delete o.vlakken;
      if (Object.keys(o).length) t.plan.opbouw = o; else delete t.plan.opbouw;
    }));
    const rij = el('label', { class: 'opbouwrij' });
    rij.append(el('span', {}, 'Opbouw van dit muurvlak'), s);
    vak.append(rij);
  }
  vak.append(el('p', { class: 'klein' }, `Nu: ${codes.map((x) => oc.opbouwen[x]?.naam ?? x).join(', ')}. De lagen staan in het overzicht.`));
}

function zetOpbouw(plaats: OpbouwPlaats, code: string | undefined) {
  wijzig('plan', (t) => {
    const o = { ...(t.plan.opbouw ?? {}) };
    if (code) o[plaats] = code; else delete o[plaats];
    if (Object.keys(o).length) t.plan.opbouw = o; else delete t.plan.opbouw;
  });
}

// ---------- het overzicht: meetstaat, EPB, stabiliteit ----------

const GROEP_NAAM: Record<MeetstaatRegel['groep'], string> = {
  hout: 'Hout', staal: 'Staal', latten: 'Latten', platen: 'Platen', isolatie: 'Isolatie', folie: 'Folie', bekleding: 'Bekleding', 'metselwerk en beton': 'Metselwerk en beton',
};

/** Een regel van de meetstaat als tekst: wat, doorsnede of dikte, hoeveelheid. */
function regelTekst(r: MeetstaatRegel): [string, string, string] {
  if (r.aantal !== undefined) return [r.label, `${r.doorsnede} mm`, `${r.aantal} stuks, samen ${getal(r.lengte ?? 0, 1)} m`];
  if (r.lengte !== undefined) return [r.label, `latten ${r.doorsnede} mm`, `${getal(r.lengte, 1)} m`];
  return [r.label, `${getal(r.dikte ?? 0, 1)} mm`, `${getal(r.m2 ?? 0, 1)} m²`];
}

/** De meetstaat als tekst om te kopiëren (tabs tussen de kolommen: plakt als tabel in Excel). */
export function meetstaatTekst(regels: MeetstaatRegel[]): string {
  const kop = `Meetstaat van de constructie (netto, zonder snijverlies en zonder prijzen)\n${CONSTRUCTIE_VOORBEHOUD}\n\nGroep\tMateriaal\tDoorsnede of dikte\tHoeveelheid`;
  return `${kop}\n${regels.map((r) => [GROEP_NAAM[r.groep], ...regelTekst(r)].join('\t')).join('\n')}\n`;
}

/** Het blok in het overzicht (een kaart met drie onderdelen die openklappen). Rekent pas als je een onderdeel openklapt. */
export function toonConstructieOverzicht() {
  let kaart = document.getElementById('o-constructie');
  if (!kaart) {
    // Eén keer: de kaart onder de afwerking uit de plattegrond.
    kaart = el('section', { class: 'kaart alleen-woning', id: 'o-constructie', 'aria-label': 'Constructie' });
    document.getElementById('o-regels-kaart')?.after(kaart);
  }
  kaart.replaceChildren();
  const kop = el('div', { class: 'kaartkop' });
  kop.append(el('h2', {}, 'Constructie'), el('span', { class: 'klein' }, 'meetstaat · aanwijzing voor EPB · schatting van de stabiliteit'));
  kaart.append(kop, el('p', { class: 'klein voorbehoud' }, 'Voorstelling en schattingen, geen berekening: een EPB-verslaggever en een ingenieur rekenen na. Tik op een onderdeel om het te openen.'));
  const plan = toestand().plan;
  if (!plan.ruimtes.length) { kaart.append(el('p', { class: 'klein' }, 'Nog geen ruimtes in de plattegrond.')); return; }
  const onderdeel = (id: string, titel: string, sub: string, vul: (vak: HTMLElement) => void) => {
    const d = el('details', { class: 'constructiedeel', id }) as HTMLDetailsElement;
    const s = el('summary');
    s.append(el('span', {}, titel), el('span', { class: 'klein' }, sub));
    d.append(s);
    const vak = el('div', { class: 'constructieinhoud' });
    d.append(vak);
    d.addEventListener('toggle', () => { if (d.open && !vak.childElementCount) vul(vak); });
    onthoud(d, id);
    if (d.open) vul(vak);
    kaart!.append(d);
  };
  onderdeel('o-meetstaat', 'Meetstaat', 'wat er nodig is, zonder prijzen', vulMeetstaat);
  onderdeel('o-epb', 'Aanwijzing voor EPB', 'U-waarde per opbouw', vulWarmte);
  onderdeel('o-stabiliteit', 'Schatting van de stabiliteit', 'balklagen, dak en lateien', vulStabiliteit);
}

function vulMeetstaat(vak: HTMLElement) {
  const plan = toestand().plan, c = huidigeConstructie();
  const regels = woningMeetstaat(plan, constructieCatalogus, c);
  vak.append(el('p', { class: 'voorbehoud' }, `${CONSTRUCTIE_VOORBEHOUD} Netto: zonder snijverlies en handelslengtes.`));
  const tabel = el('table', { class: 'meetstaat' });
  tabel.innerHTML = '<thead><tr><th>Materiaal</th><th>Doorsnede of dikte</th><th class="num">Hoeveelheid</th></tr></thead>';
  const body = el('tbody');
  let groep = '';
  for (const r of regels) {
    if (r.groep !== groep) {
      groep = r.groep;
      const tr = el('tr', { class: 'groep' });
      tr.append(el('th', { colspan: '3' }, GROEP_NAAM[r.groep]));
      body.append(tr);
    }
    const [a, b, h] = regelTekst(r);
    const tr = el('tr');
    tr.append(el('td', {}, a), el('td', {}, b), el('td', { class: 'num' }, h));
    body.append(tr);
  }
  tabel.append(body);
  const houder = el('div', { class: 'tabelhouder' });
  houder.append(tabel);
  const melding = el('span', { class: 'klein', role: 'status' });
  const knop = el('button', { type: 'button', class: 'tweede', id: 'o-meetstaat-kopieer' }, 'Kopieer de meetstaat');
  knop.addEventListener('click', () => kopieer(meetstaatTekst(regels), melding));
  const acties = el('div', { class: 'acties' });
  acties.append(knop, melding);
  vak.append(houder, acties);
  if (c.meldingen.length) {
    const d = el('details', { class: 'aannames' });
    d.append(el('summary', {}, `Wat de constructie aanpaste of wegliet (${c.meldingen.length})`));
    const ul = el('ul', { class: 'klein' });
    for (const m of c.meldingen) ul.append(el('li', {}, m));
    d.append(ul);
    vak.append(d);
  }
  const niet = el('details', { class: 'aannames' });
  niet.append(el('summary', {}, 'Wat er niet in zit'));
  niet.append(el('p', { class: 'klein' }, 'Ramen, deuren, lichtkoepels, de trap, de topgevel onder een hellend dak, de dakrand, gordingen, muurplaat en nokbalk, funderingen, lateien in beton of staal, bevestigingen, snijverlies. Een vloer of dak van een vrije vorm staat er als effen plaat en telt niet mee.'));
  vak.append(niet);
}

const OORDEEL_KLASSE: Record<string, string> = { voldoet: 'ok', 'voldoet niet': 'fout', volstaat: 'ok', 'te licht': 'fout', 'niet te zeggen': 'let-op' };

function lijstVan(titel: string, items: string[]): HTMLElement {
  const d = el('details', { class: 'aannames' });
  d.append(el('summary', {}, titel));
  const ul = el('ul', { class: 'klein' });
  for (const x of items) ul.append(el('li', {}, x));
  d.append(ul);
  return d;
}

function vulWarmte(vak: HTMLElement) {
  const plan = toestand().plan, c = huidigeConstructie();
  const lijst = woningWarmte(plan, constructieCatalogus, warmtewaarden, c);
  vak.append(el('p', { class: 'voorbehoud' }, `${WARMTE_VOORBEHOUD} ${WARMTE_NIET_NAGELEZEN}`));
  const tabel = el('table', { class: 'epb' });
  tabel.innerHTML = '<thead><tr><th>Waar</th><th>Opbouw</th><th class="num">m²</th><th class="num">U (W/m²K)</th><th>Aanwijzing</th></tr></thead>';
  const body = el('tbody');
  for (const w of lijst) {
    const tr = el('tr');
    const u = w.uitkomst.uWaarde;
    tr.append(
      el('td', {}, woningOpbouwCatalogus.plaatsen[w.plaats].label), el('td', {}, w.opbouw.naam), el('td', { class: 'num' }, getal(w.m2, 1)),
      el('td', { class: 'num' }, u === null ? '—' : getal(u, 2)),
    );
    const oordeel = el('td');
    oordeel.append(el('span', { class: `status ${OORDEEL_KLASSE[w.uitkomst.toets.oordeel] ?? ''}` }, w.uitkomst.toets.oordeel));
    tr.append(oordeel);
    body.append(tr);
  }
  tabel.append(body);
  const houder = el('div', { class: 'tabelhouder' });
  houder.append(tabel);
  vak.append(houder);
  for (const w of lijst) {
    const d = el('details', { class: 'aannames' });
    d.append(el('summary', {}, `Aannames: ${w.opbouw.naam}`));
    d.append(el('p', { class: 'klein' }, w.uitkomst.toets.uitleg));
    const ul = el('ul', { class: 'klein' });
    for (const x of [...w.uitkomst.aannames, ...w.uitkomst.ontbreekt]) ul.append(el('li', {}, x));
    const lagen = el('ul', { class: 'klein' });
    for (const l of w.uitkomst.lagen) lagen.append(el('li', {}, `${l.naam} (${LAAG_ROLLEN[l.rol]}, ${mm(l.dikte)}): ${l.weerstand === null ? 'geen waarde' : `R ${getal(l.weerstand, 3)} m²K/W`}`));
    d.append(ul, el('p', { class: 'klein' }, 'Per laag:'), lagen);
    vak.append(d);
  }
  vak.append(el('p', { class: 'klein' }, 'Geen E-peil of S-peil: daarvoor zijn ook de vorm, de oriëntatie, de ventilatie, de luchtdichtheid en de installaties nodig. De ramen hebben hun eigen U-waarde in de configurator.'));
}

function vulStabiliteit(vak: HTMLElement) {
  const plan = toestand().plan, c = huidigeConstructie();
  const lijst = woningStabiliteit(plan, constructieCatalogus, stabiliteitswaarden, c);
  vak.append(el('p', { class: 'voorbehoud' }, `${STABILITEIT_VOORBEHOUD} Alleen gezaagd naaldhout op buiging, met richtwaarden die niemand nalas. ${STABILITEIT_BUITEN_BEREIK}`));
  const groepen: [string, (p: OpbouwPlaats) => boolean][] = [
    ['Balklagen (vloeren)', (p) => p === 'verdiepingsvloer' || p === 'grondvloer'],
    ['Dak', (p) => p === 'platDak' || p === 'hellendDak'],
    ['Lateien boven ramen en deuren', (p) => p === 'buitenwand' || p === 'binnenwand'],
  ];
  for (const [titel, hoort] of groepen) {
    const deze = lijst.filter((x) => hoort(x.plaats));
    if (!deze.length) continue;
    vak.append(el('h4', {}, titel));
    const tabel = el('table', { class: 'stabiliteit' });
    tabel.innerHTML = '<thead><tr><th>Waar</th><th>Wat</th><th>Schatting</th></tr></thead>';
    const body = el('tbody');
    for (const x of deze) for (const o of x.schatting.onderdelen) {
      const tr = el('tr');
      const b = o.uitkomst.benutting;
      const oordeel = el('td');
      oordeel.append(el('span', { class: `status ${OORDEEL_KLASSE[o.uitkomst.oordeel] ?? ''}` }, o.uitkomst.oordeel));
      if (b) oordeel.append(el('div', { class: 'klein' }, `sterkte ${b.sterkte} %, doorbuiging ${b.doorbuiging} % van wat mag`));
      const uitleg = o.uitkomst.voorstel?.tekst ?? o.uitkomst.ontbreekt[0];
      if (uitleg) oordeel.append(el('div', { class: 'klein' }, uitleg));
      tr.append(el('td', {}, x.wat), el('td', {}, o.wat), oordeel);
      body.append(tr);
    }
    tabel.append(body);
    const houder = el('div', { class: 'tabelhouder' });
    houder.append(tabel);
    vak.append(houder);
  }
  const aannames = [...new Set(lijst.flatMap((x) => [...x.schatting.aannames, ...x.schatting.onderdelen.flatMap((o) => o.uitkomst.aannames)]))];
  const niet = [...new Set(lijst.flatMap((x) => x.schatting.nietNagekeken))];
  vak.append(lijstVan('Aannames', aannames), lijstVan('Niet nagekeken', niet));
}
