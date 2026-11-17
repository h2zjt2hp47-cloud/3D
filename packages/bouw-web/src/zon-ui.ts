/**
 * Lichtinval in de 3D van de woning: de zon op een gekozen dag en uur (blok "Lichtinval" onder de 3D), de stand in
 * woorden, en per gevel wanneer de zon erop staat. De stand zelf rekent de motor uit (`core/src/zon.ts`); de kijker
 * krijgt alleen een richting en een hoogte in graden (`viewer.zon`).
 */
import {
  gevelAanzichten, SEIZOENEN, uurTekst, zomertijd, zonnestand, zonOpEnOnder, zonOpGevels, zonOpRichting, zonRichtingOpPlan, zonTekst,
  type GevelKant, type Seizoen,
} from '../../core/src/index.js';
import { $, el, getal } from './hulp.js';
import { positieVan, toestand } from './staat.js';

/** Aan of uit; de keuzes blijven staan zolang de pagina open is (ze horen bij het kijken, niet bij het project). */
let aan = false;
let dagKeuze: Seizoen | 'datum' = 'zomer';
let datum = { maand: 6, dag: 21 };
let uur = 13;
let bij: { opnieuw: () => void; zon: () => void } = { opnieuw: () => {}, zon: () => {} };

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const KANT: Record<GevelKant, string> = { boven: 'bovenkant', onder: 'onderkant', links: 'linkerkant', rechts: 'rechterkant' };

const dagNu = () => (dagKeuze === 'datum' ? datum : SEIZOENEN[dagKeuze]);

/** Staat de lichtinval aan? Dan geeft de 3D ook wat verborgen is mee als schaduwwerper. */
export const lichtinvalAan = () => aan;

/** De zon voor de kijker: richting op het plan en hoogte, in graden; null = het gewone licht. */
export function zonVoorKijker(): { richting: number; hoogte: number } | null {
  if (!aan) return null;
  const d = dagNu();
  const stand = zonnestand({ maand: d.maand, dag: d.dag, uur });
  return { richting: zonRichtingOpPlan(stand, toestand().plan.noord ?? 0), hoogte: stand.hoogte };
}

/** Tekst en tabel bijwerken (na een andere dag, een ander uur of een wijziging aan het plan). */
export function toonZon() {
  const vak = document.getElementById('pl-zon-instellingen');
  if (!vak) return;
  vak.hidden = !aan;
  $('#pl-zon-datum-rij').hidden = dagKeuze !== 'datum';
  if (!aan) return;
  const d = dagNu(), plan = toestand().plan, noord = plan.noord ?? 0;
  const stand = zonnestand({ maand: d.maand, dag: d.dag, uur });
  const dag = zonOpEnOnder(d.maand, d.dag);
  $('#pl-zon-uur-tekst').textContent = uurTekst(uur);
  $('#pl-zon-tekst').textContent = `${d.dag} ${MAANDEN[d.maand - 1]}, ${uurTekst(uur)} (${zomertijd(d.maand, d.dag) ? 'zomertijd' : 'wintertijd'}): de zon staat ${zonTekst(stand)}.`
    + (dag ? ` Zon op om ${uurTekst(dag.op)}, onder om ${uurTekst(dag.onder)}.` : '');
  // Per gevel: wanneer staat de zon erop?
  const aanzichten = gevelAanzichten(plan, (o) => ({ voordeur: positieVan(o)?.keuzes.type === 'voordeur' }), undefined, { schuin: true });
  const namen = new Map(aanzichten.filter((g) => !g.schuin).map((g) => [g.kant, g.naam.replace(/ \(.*\)$/, '')]));
  const tabel = el('table', { class: 'zon-gevels' });
  tabel.append(el('caption', {}, `Zon op de gevels op ${d.dag} ${MAANDEN[d.maand - 1]}`));
  const kop = el('tr');
  kop.append(el('th', {}, 'Gevel'), el('th', {}, 'Kijkt naar'), el('th', {}, 'Zon van … tot'), el('th', { class: 'num' }, 'Uren'));
  const thead = el('thead'), tbody = el('tbody');
  thead.append(kop);
  // Ronde 11: een gevel die helemaal tegen de buren staat, krijgt geen zon (de buren staan ervoor).
  const tegenBuren = new Set(aanzichten.filter((x) => !x.schuin && x.vlakken.length && x.vlakken.every((v) => plan.tegenBuren?.includes(v.sleutel))).map((x) => x.kant));
  for (const g of zonOpGevels(d.maand, d.dag, noord)) {
    if (!namen.has(g.kant) || tegenBuren.has(g.kant)) continue;
    const tr = el('tr');
    tr.append(
      el('td', {}, `${namen.get(g.kant)} (${KANT[g.kant]})`),
      el('td', {}, g.windstreek),
      el('td', {}, g.periodes.length ? g.periodes.map((p) => `${uurTekst(p.van)} – ${uurTekst(p.tot)}`).join(' en ') : 'geen zon'),
      el('td', { class: 'num' }, g.uren ? getal(g.uren, 1) : '–'),
    );
    tbody.append(tr);
  }
  // Een schuine gevel: een eigen rij, met de richting waarin ze kijkt.
  for (const g of aanzichten) {
    if (!g.schuin) continue;
    const z = zonOpRichting(d.maand, d.dag, g.schuin.kijkt, noord);
    const tr = el('tr', { 'data-schuin': String(g.schuin.kijkt) });
    tr.append(
      el('td', {}, g.naam),
      el('td', {}, z.windstreek),
      el('td', {}, z.periodes.length ? z.periodes.map((p) => `${uurTekst(p.van)} – ${uurTekst(p.tot)}`).join(' en ') : 'geen zon'),
      el('td', { class: 'num' }, z.uren ? getal(z.uren, 1) : '–'),
    );
    tbody.append(tr);
  }
  tabel.append(thead, tbody);
  $('#pl-zon-gevels').replaceChildren(
    tabel,
    el('p', { class: 'klein' }, 'Meetkundig berekend: zonder buren, bomen of de schaduw van de woning zelf (oversteek, uitbouw). Een hulp bij de keuze van zonwering, geen zonnestudie.'),
    el('p', { class: 'klein' }, `Noord ligt ${noord ? `${getal(noord)}° gedraaid (met de klok mee vanaf de bovenkant van het plan)` : 'aan de bovenkant van het plan'}: te wijzigen bij Woning. Binnenkijken: zet bij Tonen "Dak" of "Alle verdiepingen" uit, of "Muren laag" aan; wat je niet ziet, geeft nog altijd schaduw.`),
  );
}

/**
 * Bouwt het blok "Lichtinval" onder de 3D. `opnieuw` = de 3D opnieuw opbouwen (aan of uit: verborgen delen worden
 * schaduwwerpers); `zon` = alleen de zon verzetten (dag of uur: dat moet vlot gaan bij het schuiven).
 */
export function startZon(acties: { opnieuw: () => void; zon: () => void }) {
  bij = acties;
  const vak = $('#pl-zon');
  const schakel = el('label');
  const vink = el('input', { type: 'checkbox', id: 'pl-zon-aan' }) as HTMLInputElement;
  schakel.append(vink, document.createTextNode(' Lichtinval: toon de zon op een dag en uur'));
  const rij = el('div', { class: 'schakelaars' });
  // Ronde 16: een kop links, zoals de andere rijen bij de 3D.
  rij.append(el('span', { class: 'rijkop' }, 'Zon'), schakel);

  const instellingen = el('div', { id: 'pl-zon-instellingen', class: 'zon-instellingen' });
  instellingen.hidden = true;
  const dag = el('select', { id: 'pl-zon-dag', 'aria-label': 'Dag' }) as HTMLSelectElement;
  for (const [code, s] of Object.entries(SEIZOENEN)) dag.append(el('option', { value: code }, s.label));
  dag.append(el('option', { value: 'datum' }, 'Andere datum …'));
  dag.value = dagKeuze;
  const datumVeld = el('input', { type: 'date', id: 'pl-zon-datum', 'aria-label': 'Datum' }) as HTMLInputElement;
  datumVeld.value = `${new Date().getFullYear()}-06-21`;
  const datumRij = el('label', { class: 'eig', id: 'pl-zon-datum-rij' });
  datumRij.append(el('span', {}, 'Datum'), datumVeld);
  const dagRij = el('label', { class: 'eig' });
  dagRij.append(el('span', {}, 'Dag'), dag);
  const schuif = el('input', { type: 'range', id: 'pl-zon-uur', min: '4', max: '22', step: '0.25', 'aria-label': 'Uur op de klok' }) as HTMLInputElement;
  schuif.value = String(uur);
  const uurRij = el('label', { class: 'eig zon-uur' });
  const uurVak = el('span', { class: 'zon-schuif' });
  uurVak.append(schuif, el('output', { id: 'pl-zon-uur-tekst', for: 'pl-zon-uur' }));
  uurRij.append(el('span', {}, 'Uur'), uurVak);
  instellingen.append(dagRij, datumRij, uurRij, el('p', { id: 'pl-zon-tekst', class: 'zon-tekst', 'aria-live': 'polite' }), el('div', { id: 'pl-zon-gevels' }));
  vak.replaceChildren(rij, instellingen);

  const verzet = () => { toonZon(); bij.zon(); };
  vink.addEventListener('change', () => { aan = vink.checked; toonZon(); bij.opnieuw(); });
  dag.addEventListener('change', () => { dagKeuze = dag.value as Seizoen | 'datum'; verzet(); });
  datumVeld.addEventListener('change', () => {
    const [, m, d] = datumVeld.value.split('-').map(Number);
    if (m && d) { datum = { maand: m, dag: d }; verzet(); }
  });
  schuif.addEventListener('input', () => { uur = Number(schuif.value); verzet(); });
  toonZon();
}
