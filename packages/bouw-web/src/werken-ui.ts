/**
 * Werken (ronde 11, fase 2 "detail invullen"): de posten van het werk, zoals een aannemer ze op zijn offerte zet, in de
 * volgorde van het bouwen. Jonas bij twee echte offertes: *"Deze offerte willen we kunnen weergeven met ook detail."*
 *
 *   - de kaart *Werken* in het overzicht (`toonWerkenOverzicht`, één aanhaking in offerte-ui.ts): per groep de posten,
 *     elk dicht tot je hem openklapt; open het detail in gewone zinnen, de hoeveelheden voor de aannemer nog een tik
 *     verder, en *Toon in 3D* (de delen aangeduid in de 3D van de woning). *Kopieer als tekst* (tabs: plakt als tabel in
 *     Excel of Word);
 *   - *+ Werk toevoegen*: werk zonder ding (afbraak van het terras, grondwerken, container …) als tegels of vrije tekst,
 *     met groep, hoeveelheid en eenheid (allemaal optioneel). Bewaard in `meta.werken`, dus mee met opslaan, varianten,
 *     export en ongedaan maken. Geen bedrag;
 *   - `postenVoorDing` voor het keuzepaneel bij een tik in de 3D (ding-ui.ts).
 *
 * Alles komt uit de motor (`postenVan`, core/src/posten.ts); de posten worden pas berekend als het overzicht of het
 * keuzepaneel ze vraagt, en één keer per toestand.
 */
import {
  hoeveelheidTekst, POST_GROEP_NAAM, POST_GROEPEN, postenTekst, postenVan, postenVanDing, WERK_VOORSTELLEN,
  type HandmatigePost, type Post, type PostGroep, type PostPositie, type WoningConstructie,
} from '../../core/src/index.js';
import { constructieCatalogus, huidigeConstructie } from './constructie-ui.js';
import { el, kopieer } from './hulp.js';
import { raamNaam } from '../../core/voorbeelden/snelstart.js';
import { isVastModel } from '../../core/voorbeelden/vastemodellen.js';
import { kort, omschrijving } from './offerte-ui.js';
import { toonDingenIn3D } from './plattegrond-ui.js';
import { nieuweId, toestand, wijzig, type Positie, type Toestand } from './staat.js';

let naarPlan: () => void = () => {};

/** Eén keer bij het starten: de weg naar de 3D van de woning (voor *Toon in 3D*). */
export function startWerken(nav: { naarPlan: () => void }) {
  naarPlan = nav.naarPlan;
}

/** Een positie zoals de posten ze nodig hebben: soort en maat, en wat erin zit in een zin. */
function postPositie(p: Positie): PostPositie {
  const zin = omschrijving(p).split(' · ').filter(Boolean).join(', ');
  // "Hef-schuifdeur (2 tot 4 delen) · 400 × 235 cm" → "Hef-schuifdeur · 400 × 235 cm": de uitleg tussen haakjes is voor de keuze.
  // Een raam of deur in gewone woorden: "Schuifraam · 300 × 230 cm", niet "Schuifraam of schuifdeur · …" (doorloop B25).
  const titel = kort(p).replace(/\s*\([^)]*\)/g, '');
  return {
    id: p.id, naam: p.naam, aantal: p.aantal, kort: p.model === 'RAAM' ? titel.replace(/^[^·]*·/, `${raamNaam(p.keuzes)} ·`) : titel,
    detail: zin ? [`${zin.charAt(0).toUpperCase()}${zin.slice(1)}.`] : [],
    soort: p.model === 'RAAM' || p.model === 'POORT' ? 'schrijnwerk' : 'ander',
    // Een aanbouw is het bouwwerk zelf (ruwbouw); een carport, tuinhuis, loods of staalwerk: bijgebouwen en buitenwerk.
    ...(p.model === 'AANBOUW' ? { groep: 'ruwbouw' as const } : {}),
  };
}

/** De posten van een project (ook een ander dan het actieve: een variant voor het bestand van de klant). */
export function postenVanToestand(t: Toestand, constructie?: WoningConstructie): Post[] {
  return postenVan(t.plan, constructieCatalogus, {
    posities: t.posities.filter((p) => !isVastModel(p.model) || p.aantal > 0).map(postPositie), handmatig: t.meta.werken ?? [],
    ...(constructie ? { constructie } : {}),
  });
}

/** De posten van het huidige project, één keer per toestand (het overzicht en het keuzepaneel delen ze). */
let bewaard: { sleutel: string; posten: Post[] } | undefined;
export function huidigePosten(): Post[] {
  const t = toestand();
  const sleutel = JSON.stringify([t.plan, t.posities.map((p) => [p.id, p.naam, p.aantal, p.keuzes]), t.meta.werken ?? []]);
  if (bewaard?.sleutel !== sleutel) bewaard = { sleutel, posten: postenVanToestand(t, t.plan.ruimtes.length ? huidigeConstructie() : undefined) };
  return bewaard.posten;
}

/** De posten waar een ding van de 3D bij hoort (voor het keuzepaneel). */
export const postenVoorDing = (ding: string) => postenVanDing(huidigePosten(), ding);

/**
 * De delen van een post in de 3D van de woning aanduiden, groot in beeld (doorloop B11): de kijker zet de camera zelf voor
 * het aangeduide deel (`@kijk`, zie `markeer` in drie-d.ts), van de kant van de gevel waarin het zit of van boven voor het dak.
 * Daarom geen vast standpunt meer (vroeger altijd hetzelfde schuine beeld van ver, of Voor bij een achtergevel).
 */
export function toonPostIn3D(p: Post) {
  naarPlan();
  const groepen = p.markeer?.length ? [p.markeer] : p.dingen.length > 6 ? [p.dingen.map((d) => `${d}.`)] : p.dingen.map((d) => [`${d}.`]);
  toonDingenIn3D([['@kijk'], ...groepen], undefined, { techniek: p.groep === 'techniek' && p.dingen.some((d) => /^(toestel|leiding):/.test(d)) });
}

/** Een post als regel die openklapt (dicht tot je hem opent): de titel en de hoeveelheid, open het detail. */
export function postDetail(p: Post, opties: { open?: boolean; toon3D?: boolean; bijOpen?: (open: boolean) => void } = {}): HTMLDetailsElement {
  const d = el('details', { class: 'post', 'data-post': p.id }) as HTMLDetailsElement;
  d.open = !!opties.open;
  const s = el('summary');
  // Een aantal stuks is ook voor de klant; m², lopende meter en m³ alleen voor de aannemer (klantweergave, zoals het bestand voor de klant).
  s.append(el('span', { class: 'posttitel' }, p.titel), el('span', { class: `klein posthoeveel${p.eenheid === 'stuks' ? '' : ' intern'}` }, hoeveelheidTekst(p)));
  d.append(s);
  const inhoud = el('div', { class: 'postinhoud' });
  const vul = () => {
    if (inhoud.childElementCount) return;
    if (p.detail.length) {
      const ul = el('ul', { class: 'klein' });
      for (const x of p.detail) ul.append(el('li', {}, x));
      inhoud.append(ul);
    } else inhoud.append(el('p', { class: 'klein' }, 'Geen verdere uitleg.'));
    if (p.intern.length) {
      const a = el('details', { class: 'aannames intern' });
      a.append(el('summary', {}, 'Hoeveelheden voor de aannemer (netto)'));
      const ul = el('ul', { class: 'klein' });
      for (const x of p.intern) ul.append(el('li', {}, x));
      a.append(ul);
      inhoud.append(a);
    }
    const knoppen = el('div', { class: 'knoppenrij' });
    if (opties.toon3D !== false && (p.dingen.length || p.markeer?.length) && toestand().plan.ruimtes.length) {
      const b = el('button', { type: 'button', class: 'tweede', 'data-toon-post': p.id }, 'Toon in 3D');
      b.addEventListener('click', () => toonPostIn3D(p));
      knoppen.append(b);
    }
    if (p.handmatig) {
      const [velden, weg] = werkVelden(p.id.slice('werk:'.length));
      if (velden) inhoud.append(velden);
      if (weg) knoppen.append(weg);
    }
    if (knoppen.childElementCount) inhoud.append(knoppen);
  };
  d.append(inhoud);
  if (d.open) vul();
  d.addEventListener('toggle', () => { if (d.open) vul(); opties.bijOpen?.(d.open); });
  return d;
}

// ---------- handmatige posten ----------

const EENHEDEN = ['', 'stuks', 'm²', 'm', 'm³', 'dag', 'forfait'];

function zetWerk(id: string, f: (w: HandmatigePost) => void) {
  wijzig('meta', (t) => { const w = t.meta.werken?.find((x) => x.id === id); if (w) f(w); });
}

/** De velden van een handmatige post (open): titel, groep, hoeveelheid, eenheid en verwijderen. */
function werkVelden(id: string): HTMLElement[] {
  const w = toestand().meta.werken?.find((x) => x.id === id);
  if (!w) return [];
  const veld = (label: string, invoer: HTMLElement) => { const l = el('label', { class: 'werkveld' }); l.append(el('span', { class: 'klein' }, label), invoer); return l; };
  const titel = el('input', { type: 'text', 'aria-label': 'Wat', 'data-werk-titel': id }) as HTMLInputElement;
  titel.value = w.titel;
  titel.addEventListener('change', () => zetWerk(id, (x) => { x.titel = titel.value.trim() || x.titel; }));
  const groep = el('select', { 'aria-label': 'Groep', 'data-werk-groep': id }) as HTMLSelectElement;
  for (const g of POST_GROEPEN) groep.append(el('option', { value: g }, POST_GROEP_NAAM[g]));
  groep.value = w.groep ?? 'supplementen';
  groep.addEventListener('change', () => zetWerk(id, (x) => { x.groep = groep.value as PostGroep; }));
  const hoeveel = el('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Hoeveelheid', 'data-werk-hoeveelheid': id }) as HTMLInputElement;
  hoeveel.value = w.hoeveelheid === undefined ? '' : String(w.hoeveelheid).replace('.', ',');
  hoeveel.addEventListener('change', () => zetWerk(id, (x) => {
    const g = Number(hoeveel.value.replace(',', '.').trim());
    if (hoeveel.value.trim() && Number.isFinite(g)) x.hoeveelheid = g; else delete x.hoeveelheid;
  }));
  const eenheid = el('select', { 'aria-label': 'Eenheid', 'data-werk-eenheid': id }) as HTMLSelectElement;
  for (const e of uniekeEenheden(w.eenheid)) eenheid.append(el('option', { value: e }, e || '—'));
  eenheid.value = w.eenheid ?? '';
  eenheid.addEventListener('change', () => zetWerk(id, (x) => { if (eenheid.value) x.eenheid = eenheid.value; else delete x.eenheid; }));
  const weg = el('button', { type: 'button', class: 'gevaar intern', 'data-werk-weg': id }, 'Verwijderen');
  weg.addEventListener('click', () => wijzig('meta', (t) => {
    t.meta.werken = t.meta.werken?.filter((x) => x.id !== id);
    if (!t.meta.werken?.length) delete t.meta.werken;
  }));
  const rij = el('div', { class: 'werkvelden intern' });
  rij.append(veld('Wat', titel), veld('Groep', groep), veld('Hoeveelheid', hoeveel), veld('Eenheid', eenheid));
  return [rij, weg];
}
const uniekeEenheden = (eigen?: string) => [...new Set([...EENHEDEN, ...(eigen ? [eigen] : [])])];

/** Voegt werk zonder ding toe (en klapt het open). */
function voegWerkToe(w: Omit<HandmatigePost, 'id'>) {
  const id = nieuweId('w');
  open.add(`werk:${id}`);
  wijzig('meta', (t) => { t.meta.werken = [...(t.meta.werken ?? []), { id, ...w }]; });
}

/** Het paneel *+ Werk toevoegen*: de voorstellen als tegels, en ander werk met een eigen omschrijving. */
function toevoegPaneel(): HTMLElement {
  const vak = el('div', { class: 'werktoevoegen intern', id: 'o-werk-tegels' });
  const tegels = el('div', { class: 'werktegels' });
  for (const v of WERK_VOORSTELLEN) {
    const b = el('button', { type: 'button', class: 'werktegel', 'data-werk-voorstel': v.code });
    b.append(el('strong', {}, v.titel), el('span', { class: 'klein' }, POST_GROEP_NAAM[v.groep ?? 'supplementen']));
    b.addEventListener('click', () => { const { code: _, ...rest } = v; toevoegenOpen = false; voegWerkToe(rest); });
    tegels.append(b);
  }
  const vrij = el('div', { class: 'werkvrij' });
  const tekst = el('input', { type: 'text', 'aria-label': 'Ander werk', placeholder: 'Ander werk, bv. "Herstel van de oprit"', id: 'o-werk-vrij' }) as HTMLInputElement;
  const ok = el('button', { type: 'button', id: 'o-werk-vrij-ok' }, 'Toevoegen');
  const voeg = () => { const t = tekst.value.trim(); if (!t) { tekst.focus(); return; } toevoegenOpen = false; voegWerkToe({ titel: t, groep: 'supplementen' }); };
  ok.addEventListener('click', voeg);
  tekst.addEventListener('keydown', (e) => { if (e.key === 'Enter') voeg(); });
  vrij.append(tekst, ok);
  vak.append(tegels, vrij, el('p', { class: 'klein' }, 'Groep, hoeveelheid en eenheid kies je daarna in de post zelf; alles is optioneel. Zonder bedrag.'));
  return vak;
}

// ---------- de kaart in het overzicht ----------

/** Wat er openstaat (de kaart wordt na elke wijziging opnieuw gemaakt; zo klapt een post niet dicht). */
const open = new Set<string>();
let toevoegenOpen = false;

/** De kaart *Werken* in het overzicht: alleen een project met een plattegrond, posities of eigen werk. */
export function toonWerkenOverzicht() {
  let kaart = document.getElementById('o-werken');
  if (!kaart) {
    // Eén keer: de kaart vóór de afwerking uit de plattegrond (en de kaarten Constructie en Techniek).
    // `voor-klant`: de klantweergave toont deze kaart (zonder wat `intern` is), zoals het bestand voor de klant.
    kaart = el('section', { class: 'kaart alleen-woning voor-klant', id: 'o-werken', 'aria-label': 'Werken' });
    document.getElementById('o-regels-kaart')?.before(kaart);
  }
  const t = toestand();
  const posten = huidigePosten();
  kaart.hidden = !t.plan.ruimtes.length && !posten.length;
  if (kaart.hidden) return;
  const kop = el('div', { class: 'kaartkop' });
  kop.append(el('h2', {}, 'Werken'), el('span', { class: 'klein' }, `${posten.length} post${posten.length === 1 ? '' : 'en'}, in de volgorde van het bouwen`));
  const lijst = el('div', { class: 'postlijst', id: 'o-posten' });
  for (const g of POST_GROEPEN) {
    const deze = posten.filter((p) => p.groep === g);
    if (!deze.length) continue;
    lijst.append(el('h3', { class: 'postgroep' }, POST_GROEP_NAAM[g]));
    for (const p of deze) lijst.append(postDetail(p, { open: open.has(p.id), bijOpen: (o) => { if (o) open.add(p.id); else open.delete(p.id); } }));
  }
  const acties = el('div', { class: 'acties intern' });
  const toevoegen = el('button', { type: 'button', class: 'tweede', id: 'o-werk-toevoegen', 'aria-expanded': String(toevoegenOpen) }, '+ Werk toevoegen');
  const melding = el('span', { class: 'klein', role: 'status' });
  const kopie = el('button', { type: 'button', class: 'tweede', id: 'o-posten-kopieer' }, 'Kopieer als tekst');
  kopie.addEventListener('click', () => kopieer(postenTekst(huidigePosten(), { intern: true }), melding));
  acties.append(toevoegen, kopie, melding);
  const paneel = toevoegPaneel();
  paneel.hidden = !toevoegenOpen;
  toevoegen.addEventListener('click', () => {
    toevoegenOpen = !toevoegenOpen;
    paneel.hidden = !toevoegenOpen;
    toevoegen.setAttribute('aria-expanded', String(toevoegenOpen));
  });
  kaart.replaceChildren(kop, el('p', { class: 'klein voorbehoud intern' }, 'Wat een aannemer op zijn offerte zet, zonder prijzen. Tik op een post voor het detail. Wat bestaat of van de buren is, staat er niet in; de opbouwen zijn voorbeelden.'),
    el('p', { class: 'klein alleen-klantweergave' }, 'Wat er gebeurt, stap voor stap. Tik op een onderdeel voor de uitleg.'), lijst, acties, paneel);
}
