/** Stap 3 · Opbrengst: verbruik, prijzen, opbrengst per maand, zelfverbruik en terugverdientijd. */
import { OPBRENGST_KWP } from '../../core/src/zon.js';
import { el, eur, getal, getalVeld, svgUit } from './hulp.js';
import { maandSvg, terugverdienSvg } from './tekeningen.js';
import { resultaat, toestand, wijzig } from './staat.js';

export function toonOpbrengst(houder: HTMLElement) {
  const p = toestand();
  const r = resultaat();
  const balk = (label: string, waarde: number, totaal: number, klasse: string) => el('div', { class: 'balkrij' },
    el('span', {}, label), el('span', { class: 'balk' }, el('span', { class: klasse, style: `width:${totaal > 0 ? Math.min(100, (waarde / totaal) * 100) : 0}%` })), el('span', { class: 'getal' }, `${getal(waarde)} kWh`));

  houder.replaceChildren(
    el('section', { class: 'stap' }, el('h2', {}, el('span', { class: 'stapnr' }, 'A'), 'Verbruik en energieprijs'),
      el('div', { class: 'raster2' },
        getalVeld('Verbruik per jaar', p.verbruik, (w) => wijzig((q) => { q.verbruik = w; }), { min: 0, max: 100000, stap: 100, eenheid: 'kWh', hulp: 'Staat op de jaarafrekening of in Mijn Fluvius.' }),
        getalVeld('Extra verbruik in de toekomst', p.extraVerbruik, (w) => wijzig((q) => { q.extraVerbruik = w; }), { min: 0, max: 50000, stap: 100, eenheid: 'kWh', hulp: 'Elektrische wagen ±2 000–3 000 kWh, warmtepomp ±3 000–5 000 kWh.' }),
        getalVeld('Prijs afname', p.afnameprijs, (w) => wijzig((q) => { q.afnameprijs = w; }), { min: 0, max: 2, stap: 0.01, eenheid: '€/kWh', hulp: 'Alles inbegrepen (energie, net, heffingen, btw).' }),
        getalVeld('Vergoeding injectie', p.injectieprijs, (w) => wijzig((q) => { q.injectieprijs = w; }), { min: 0, max: 1, stap: 0.005, eenheid: '€/kWh', hulp: 'Wat de leverancier betaalt voor stroom die je op het net zet.' }),
        getalVeld('Voorzichtigheidsmarge opbrengst', p.opbrengstMarge, (w) => wijzig((q) => { q.opbrengstMarge = w; }), { min: 0, max: 30, stap: 1, eenheid: '%', hulp: 'Zoveel minder dan PVGIS rekenen, om niet te veel te beloven.' }),
        getalVeld('Stijging energieprijs', p.prijsstijging, (w) => wijzig((q) => { q.prijsstijging = w; }), { min: 0, max: 10, stap: 0.5, eenheid: '% per jaar' }),
      )),
    el('section', { class: 'stap' }, el('h2', {}, el('span', { class: 'stapnr' }, 'B'), 'Opbrengst per maand'),
      el('div', { class: 'cijfers' },
        cijfer('Opgewekt per jaar', `${getal(r.productie)} kWh`),
        cijfer('Verbruik per jaar', `${getal(r.verbruik)} kWh`),
        cijfer('Zelf verbruikt', `${getal(r.verbruik > 0 ? r.autarkie : 0)} %`, 'van je verbruik komt van je dak'),
        cijfer('CO₂ vermeden', `${getal(r.co2 / 1000, 1)} ton/jaar`)),
      el('div', { class: 'tekening grafiekvak' }, svgUit(maandSvg(r.productiePerMaand, r.verbruikPerMaand))),
      el('p', { class: 'legende' }, el('span', { class: 'kleur zon' }), 'opgewekt ', el('span', { class: 'kleur lijn' }), 'verbruik'),
      el('h3', {}, 'Waar gaat de stroom naartoe?'),
      balk('Meteen zelf verbruikt', r.zelfverbruikZonderBatterij, r.productie, 'zelf'),
      r.batterij ? balk('Extra via de batterij', r.zelfverbruik - r.zelfverbruikZonderBatterij, r.productie, 'batterij') : null,
      balk('Op het net gezet', r.injectie, r.productie, 'net'),
      balk('Nog van het net', r.afname, r.verbruik, 'afname'),
    ),
    el('section', { class: 'stap' }, el('h2', {}, el('span', { class: 'stapnr' }, 'C'), 'Terugverdienen'),
      el('div', { class: 'cijfers' },
        cijfer('Investering', eur(r.offerte.incl, 0), 'incl. btw'),
        cijfer('Besparing jaar 1', eur(r.besparingJaar1, 0)),
        cijfer('Terugverdientijd', r.terugverdientijd !== null ? `${getal(r.terugverdientijd, 1)} jaar` : 'meer dan 25 jaar'),
        cijfer('Winst na 25 jaar', eur(r.winst25, 0))),
      el('div', { class: 'tekening grafiekvak' }, svgUit(terugverdienSvg(r.cumulatief, r.terugverdientijd))),
      el('p', { class: 'hulp' }, `Opbrengst volgens PVGIS (Europese Commissie, Midden-België): ${OPBRENGST_KWP} kWh per kWp in de beste stand (zuid, 40°), per helling en richting, min ${p.opbrengstMarge} % voorzichtigheidsmarge en de schaduw; 0,4 % minder opbrengst per jaar; geen premie (in Vlaanderen geen premie meer voor zonnepanelen). Zelfverbruik is een schatting op basis van het verbruik; met een slimme meter is het werkelijke profiel te gebruiken. Definitieve opbrengst: PVGIS of de software van de installateur.`),
    ),
  );
}

function cijfer(label: string, waarde: string, uitleg?: string) {
  return el('div', { class: 'cijfer' }, el('span', { class: 'klein' }, label), el('strong', {}, waarde), uitleg ? el('span', { class: 'klein' }, uitleg) : null);
}
