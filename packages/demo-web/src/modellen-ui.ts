/**
 * Collectie: modellen per familie met productfoto (indien beschikbaar), vooraanzicht en richtprijs.
 * "Kies en pas aan" laadt het model in de vrije ontwerper.
 */
import { berekenOntwerp, tekenSvg, tekenVooraanzicht } from '../../core/src/index.js';
import { modelFamilies } from '../../core/voorbeelden/modellen.js';
import { bewaarBestand } from './bewaren.js';
import { bewaarDossier, dossierAlsBestand, dossierUitBestand, getDossiers, opDossiers, verwijderDossier, type Dossier, type OfferteGegevens } from './dossiers.js';
import { $, bevestigKnop, el, eur, getal, getCatalogus, getKorting, getMaterialen, getModellen, opWijziging } from './staat.js';
import type { Ontwerp } from '../../core/src/index.js';

const fotos = (window as unknown as { __FOTOS?: Record<string, string> }).__FOTOS ?? {};
let familie = modelFamilies[0]!;
/** Geen familie van modellen maar de eigen bewaarde ontwerpen (in deze browser). */
const MIJN = 'Mijn ontwerpen';
let toonNu: () => void = () => {};
let bouwFiltersNu: () => void = () => {};

/** Het modellenscherm op "Mijn ontwerpen" zetten (knop in de ontwerper). */
export function kiesMijnOntwerpen() {
  familie = MIJN;
  bouwFiltersNu();
  toonNu();
}

type Open = (d: { id?: string; naam: string; ontwerp: Ontwerp; offerte: OfferteGegevens }) => void;

export function startModellen(kies: (code: string) => void, openDossier: Open = () => {}) {
  const filters = $('#modellen-filter');
  const bouwFilters = () => {
    filters.replaceChildren();
    const families = [...new Set([...modelFamilies, ...getModellen().map((m) => m.familie)]), MIJN];
    if (!families.includes(familie)) familie = families[0]!;
    for (const f of families) {
      const aantal = f === MIJN ? getDossiers().length : getModellen().filter((m) => m.familie === f).length;
      // Mijn ontwerpen blijft staan, ook als er nog geen zijn: daar open je ook een ontwerp uit een bestand.
      if (!aantal && f !== MIJN) continue;
      const b = el('button', { type: 'button', 'data-familie': f, 'aria-pressed': String(f === familie) }, `${f} (${aantal})`) as HTMLButtonElement;
      b.addEventListener('click', () => {
        familie = f;
        filters.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.familie === f)));
        toon();
      });
      filters.append(b);
    }
  };
  bouwFilters();
  bouwFiltersNu = bouwFilters;

  /** Mijn ontwerpen: wat in deze browser bewaard is, en een ontwerp openen uit een bestand. */
  const toonMijn = (raster: HTMLElement, melding = '', fout = false) => {
    const balk = el('div', { class: 'mijnbalk' });
    const kiezer = el('input', { type: 'file', accept: '.json,application/json', hidden: '' }) as HTMLInputElement;
    const openKnop = el('button', { type: 'button' }, 'Open uit bestand …') as HTMLButtonElement;
    openKnop.addEventListener('click', () => kiezer.click());
    kiezer.addEventListener('change', async () => {
      const f = kiezer.files?.[0];
      if (!f) return;
      const uit = dossierUitBestand(await f.text(), getCatalogus(), getMaterialen());
      if ('fout' in uit) { toonMijn(raster, uit.fout, true); return; }
      // Meteen bij Mijn ontwerpen zetten, zodat het ook na het sluiten van het bestand terug te vinden is.
      const bewaard = bewaarDossier({ naam: uit.naam, ontwerp: uit.ontwerp, offerte: uit.offerte });
      if ('fout' in bewaard) { openDossier(uit); return; }
      if (uit.opmerkingen.length) { toonMijn(raster, `“${bewaard.naam}” is toegevoegd. ${uit.opmerkingen.join(' ')}`); return; }
      openDossier(bewaard);
    });
    const uitleg = el('p', { class: 'klein' }, 'Ontwerpen die je bij 2 · Ontwerpen bewaarde, met de gegevens van de klant. Ze staan in deze browser; met “Als bestand” neem je er een mee naar een ander toestel.');
    balk.append(uitleg, openKnop, kiezer);
    const kaarten: HTMLElement[] = [balk];
    if (melding) kaarten.push(el('p', { class: fout ? 'mijnbalk offertewaarschuwing' : 'mijnbalk', role: 'status' }, melding));
    const lijst = getDossiers();
    if (!lijst.length) kaarten.push(el('p', { class: 'mijnbalk' }, 'Nog geen bewaarde ontwerpen. Kies een model, pas het aan en klik bij 2 · Ontwerpen op Bewaren.'));
    for (const d of lijst) kaarten.push(dossierKaart(d));
    raster.replaceChildren(...kaarten);
  };
  const dossierKaart = (d: Dossier) => {
    const kaart = el('article', { class: 'kaart modelkaart dossierkaart' });
    let prijs = '', maat = '';
    const schets = el('figure', { class: 'modelbeeld' });
    try {
      // Een ontwerp kan ouder zijn dan de huidige catalogus: dan geen tekening of prijs, wel de kaart.
      const r = berekenOntwerp(d.ontwerp, getCatalogus(), getMaterialen(), { kortingProcent: getKorting() });
      prijs = `${eur(r.prijs.verkoopprijsExcl)} excl. btw`;
      maat = `${getal(r.afmetingen.breedte, 1)} × ${getal(r.afmetingen.diepte, 1)} cm`;
      schets.innerHTML = tekenSvg(tekenVooraanzicht(d.ontwerp, getCatalogus(), getMaterialen()), { breedtePx: 420, lijnkleur: '#2b2b28', maatkleur: '#3f5a52' });
    } catch {
      prijs = 'past niet meer bij de catalogus';
    }
    const model = getModellen().find((m) => m.code === d.ontwerp.model);
    const kop = el('div', { class: 'kaartkop' });
    kop.append(el('h2', {}, d.naam), el('span', { class: 'klein' }, new Date(d.bewaard).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })));
    const klant = [d.offerte.klant.naam, d.offerte.klant.gemeente].filter(Boolean).join(', ');
    const acties = el('div', { class: 'knoppenrij' });
    const knop = (tekst: string, klasse = '') => {
      const b = el('button', { type: 'button', ...(klasse ? { class: klasse } : {}) }, tekst) as HTMLButtonElement;
      acties.append(b);
      return b;
    };
    knop('Openen', 'hoofd').addEventListener('click', () => openDossier(d));
    knop('Dupliceren').addEventListener('click', () => {
      const uit = bewaarDossier({ naam: `${d.naam} (kopie)`, ontwerp: d.ontwerp, offerte: { ...d.offerte, referentie: '' } });
      if ('fout' in uit) toonMijn($('#modellen-lijst'), uit.fout, true);
    });
    knop('Als bestand').addEventListener('click', () => {
      const b = dossierAlsBestand(d);
      void bewaarBestand(b.bestandsnaam, new Blob([b.inhoud], { type: 'application/json' }));
    });
    bevestigKnop(knop('Verwijderen'), 'Klik nogmaals: verwijderen', () => verwijderDossier(d.id));
    kaart.append(
      schets,
      kop,
      el('p', {}, klant ? `Klant: ${klant}` : 'Nog geen klant ingevuld'),
      el('p', { class: 'modelprijs' }, prijs),
      el('p', { class: 'klein' }, [maat, model ? `vertrokken van ${model.naam}` : 'eigen ontwerp', d.offerte.referentie].filter(Boolean).join(' · ')),
      acties,
    );
    return kaart;
  };
  opDossiers(() => { bouwFilters(); if (familie === MIJN) toon(); });

  const toon = () => {
    const raster = $('#modellen-lijst');
    if (familie === MIJN) { toonMijn(raster); return; }
    raster.replaceChildren(
      ...getModellen()
        .filter((m) => m.familie === familie)
        .map((m) => {
          const r = berekenOntwerp(m.ontwerp, getCatalogus(), getMaterialen(), { kortingProcent: getKorting() });
          const kaart = el('article', { class: 'kaart modelkaart' });
          const beelden = el('div', { class: 'modelbeelden' });
          const foto = m.foto ? fotos[m.foto] : undefined;
          if (foto) {
            const fig = el('figure', { class: 'modelfoto' });
            fig.append(el('img', { src: foto, alt: m.fotoBijschrift ? `${m.naam}: ${m.fotoBijschrift}` : `Productfoto ${m.naam}`, loading: 'lazy' }), el('figcaption', {}, m.fotoBijschrift ?? 'foto website'));
            beelden.append(fig);
          }
          const schets = el('figure', { class: 'modelbeeld' });
          schets.innerHTML = tekenSvg(tekenVooraanzicht(m.ontwerp, getCatalogus(), getMaterialen()), { breedtePx: 420, lijnkleur: '#2b2b28', maatkleur: '#3f5a52' });
          schets.append(el('figcaption', {}, 'onze benadering'));
          beelden.append(schets);
          const kop = el('div', { class: 'kaartkop' });
          kop.append(el('h2', {}, m.naam), el('span', { class: 'klein' }, m.bron?.startsWith('Eigen') ? `${m.familie} · eigen model` : m.familie));
          const knop = el('button', { type: 'button' }, 'Kies en pas aan') as HTMLButtonElement;
          knop.addEventListener('click', () => kies(m.code));
          const acties = el('div', { class: 'knoppenrij' });
          acties.append(knop);
          kaart.append(
            beelden,
            kop,
            el('p', {}, m.omschrijving),
            el('p', { class: 'modelprijs' }, `Richtprijs in deze opstelling: ${eur(r.prijs.verkoopprijsExcl)} excl. btw`),
            el('p', { class: 'klein' }, `${getal(r.afmetingen.breedte, 1)} × ${getal(r.afmetingen.diepte, 1)} cm · ${m.bron ?? ''}`),
            acties,
          );
          return kaart;
        }),
    );
  };
  toonNu = toon;
  opWijziging('materialen', toon);
  opWijziging('korting', toon);
  opWijziging('catalogus', () => {
    bouwFilters();
    toon();
  });
  toon();
}

export const modelOntwerp = (code: string) => getModellen().find((m) => m.code === code)?.ontwerp;
