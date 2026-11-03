/** Stap 2 · Installatie: paneel, aansluiting, omvormer, batterij, opties en stringplan. */
import { windstreek } from '../../core/src/zon.js';
import { el, eur, getal, keuzeVeld, klantweergave, schakelaar, tegels } from './hulp.js';
import { catalogus, resultaat, toestand, wijzig } from './staat.js';

const SOORT = { string: 'Stringomvormer', hybride: 'Hybride (met batterij)', micro: 'Micro-omvormer (per paneel)' } as const;

export function toonInstallatie(houder: HTMLElement) {
  const p = toestand();
  const r = resultaat();
  const klant = klantweergave();
  const prijs = (x: number) => (klant ? '' : ` · ${eur(x)} excl.`);

  const paneel = tegels('Zonnepaneel', catalogus.panelen.map((x) => ({
    waarde: x.code, label: `${x.merk} ${x.naam} – ${x.wp} Wp`,
    extra: `${x.lengte} × ${x.breedte} mm · ${x.uitzicht} · ${x.garantie} j garantie${prijs(x.prijs)}`,
  })), p.paneel, (w) => wijzig((q) => { q.paneel = w; for (const v of Object.values(q.vlakken)) v.uit = []; }));

  const aansluiting = tegels('Aansluiting', [
    { waarde: 'mono', label: 'Monofasig', extra: '230 V – max. 5 kVA omvormer' },
    { waarde: 'drie', label: 'Driefasig', extra: '3 × 400 V of 3 × 230 V' },
  ], p.aansluiting, (w) => wijzig((q) => { q.aansluiting = w as 'mono' | 'drie'; }));

  const fasen = p.aansluiting === 'mono' ? 1 : 3;
  const omvormers = catalogus.omvormers.filter((o) => o.soort === 'micro' || o.fasen === fasen);
  const opties: [string, string][] = [['auto', `Automatisch${r.omvormerAuto && r.omvormer ? ` – ${r.omvormer.merk} ${r.omvormer.naam}` : ''}`]];
  for (const o of omvormers) opties.push([o.code, `${SOORT[o.soort]}: ${o.merk} ${o.naam}${o.soort === 'micro' ? '' : ` (${getal(o.ac / 1000, 1)} kVA, ${o.mppt} MPPT)`}${prijs(o.prijs)}`]);
  const omvormer = keuzeVeld('Omvormer', opties, r.omvormerAuto ? 'auto' : p.omvormer, (w) => wijzig((q) => { q.omvormer = w; }));

  const batterij = tegels('Thuisbatterij', [
    { waarde: '', label: 'Geen', extra: 'later bij te plaatsen met een hybride omvormer' },
    ...catalogus.batterijen.map((b) => ({ waarde: b.code, label: `${b.naam} – ${getal(b.kwh, 1)} kWh`, extra: `${b.merk}${prijs(b.prijs)}` })),
  ], p.batterij, (w) => wijzig((q) => { q.batterij = w; }));

  const o = r.omvormer;
  const omvInfo = o ? el('dl', { class: 'detail' },
    el('dt', {}, 'Soort'), el('dd', {}, SOORT[o.soort]),
    el('dt', {}, 'Vermogen'), el('dd', {}, o.soort === 'micro' ? `${r.aantalOmvormers} × ${o.ac} VA = ${getal(r.acVermogen / 1000, 1)} kVA` : `${getal(o.ac / 1000, 1)} kVA, ${o.fasen === 1 ? 'monofasig' : 'driefasig'}`),
    el('dt', {}, 'Panelen / omvormer'), el('dd', {}, r.dcAc !== null ? getal(r.dcAc, 2) : '–'),
    el('dt', {}, 'Garantie'), el('dd', {}, `${o.garantie} jaar`),
  ) : null;

  // Stringplan.
  const micro = o?.soort === 'micro';
  const tabel = el('table', { class: 'tabel' },
    el('thead', {}, el('tr', {}, el('th', {}, 'Groep'), el('th', {}, 'Richting'), el('th', { class: 'getal' }, 'Panelen'), el('th', {}, micro ? 'Omvormers' : 'Strings'), el('th', { class: 'getal' }, 'kWh/kWp'))),
    el('tbody', {}, ...r.groepen.map((g) => el('tr', {},
      el('td', {}, g.naam), el('td', {}, `${windstreek(g.azimut)} · ${g.helling}°`), el('td', { class: 'getal' }, String(g.panelen)),
      el('td', {}, micro ? `${g.panelen} micro-omvormers` : g.strings.map((s) => `${s} in serie`).join(' + ') + (g.mppts > 1 ? ` (${g.mppts} MPPT)` : '')),
      el('td', { class: 'getal' }, getal(g.kwhPerKwp))))));

  houder.replaceChildren(
    el('section', { class: 'stap' }, el('h2', {}, el('span', { class: 'stapnr' }, 'A'), 'Panelen'), paneel),
    el('section', { class: 'stap' }, el('h2', {}, el('span', { class: 'stapnr' }, 'B'), 'Omvormer'), aansluiting, omvormer,
      el('p', { class: 'hulp' }, 'Automatisch kiest de goedkoopste omvormer die past bij de aansluiting, de batterij, het aantal dakrichtingen en een verhouding panelen/omvormer tussen 0,85 en 1,3.'),
      omvInfo),
    el('section', { class: 'stap' }, el('h2', {}, el('span', { class: 'stapnr' }, 'C'), 'Opslag en opties'), batterij,
      schakelaar('Optimizers per paneel', p.optimizers, (w) => wijzig((q) => { q.optimizers = w; }), 'Bij schaduw of veel dakrichtingen: elk paneel levert apart, minder verlies, opvolging per paneel.'),
      schakelaar('Energiemeter en app', p.monitoring, (w) => wijzig((q) => { q.monitoring = w; })),
      schakelaar('Slimme laadpaal (laden op zonne-overschot)', p.laadpaal, (w) => wijzig((q) => { q.laadpaal = w; })),
    ),
    el('section', { class: 'stap intern' }, el('h2', {}, el('span', { class: 'stapnr' }, 'D'), 'Stringplan'),
      r.groepen.length ? tabel : el('p', { class: 'klein' }, 'Nog geen panelen gelegd.'),
      !micro && o ? el('p', { class: 'hulp' }, `Per string ${r.nMin} tot ${r.nMax} panelen: Voc bij −10 °C ${getal(r.vocKoud, 1)} V per paneel (max. ${o.maxVdc} V), Vmp bij 70 °C ${getal(r.vmpWarm, 1)} V (MPPT vanaf ${o.mpptMin} V). Benadering: het definitieve stringplan maak je met de tool van de fabrikant.`) : null),
  );
}
