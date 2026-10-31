/**
 * Collectie: modellen per familie met productfoto (indien beschikbaar), vooraanzicht en richtprijs.
 * "Kies en pas aan" laadt het model in de vrije ontwerper.
 */
import { berekenOntwerp, tekenSvg, tekenVooraanzicht } from '../../core/src/index.js';
import { modelFamilies, zetelModellen } from '../../core/voorbeelden/modellen.js';
import { zetelCatalogus } from '../../core/voorbeelden/vrij-ontwerp.js';
import { $, el, eur, getal, getKorting, getMaterialen, opWijziging } from './staat.js';

const fotos = (window as unknown as { __FOTOS?: Record<string, string> }).__FOTOS ?? {};
let familie = modelFamilies[0]!;

export function startModellen(kies: (code: string) => void) {
  const filters = $('#modellen-filter');
  for (const f of modelFamilies) {
    const aantal = zetelModellen.filter((m) => m.familie === f).length;
    const b = el('button', { type: 'button', 'data-familie': f, 'aria-pressed': String(f === familie) }, `${f} (${aantal})`) as HTMLButtonElement;
    b.addEventListener('click', () => {
      familie = f;
      filters.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.familie === f)));
      toon();
    });
    filters.append(b);
  }

  const toon = () => {
    const raster = $('#modellen-lijst');
    raster.replaceChildren(
      ...zetelModellen
        .filter((m) => m.familie === familie)
        .map((m) => {
          const r = berekenOntwerp(m.ontwerp, zetelCatalogus, getMaterialen(), { kortingProcent: getKorting() });
          const kaart = el('article', { class: 'kaart modelkaart' });
          const beelden = el('div', { class: 'modelbeelden' });
          const foto = m.foto ? fotos[m.foto] : undefined;
          if (foto) {
            const fig = el('figure', { class: 'modelfoto' });
            fig.append(el('img', { src: foto, alt: `Productfoto ${m.naam}`, loading: 'lazy' }), el('figcaption', {}, 'foto website'));
            beelden.append(fig);
          }
          const schets = el('figure', { class: 'modelbeeld' });
          schets.innerHTML = tekenSvg(tekenVooraanzicht(m.ontwerp, zetelCatalogus, getMaterialen()), { breedtePx: 420, lijnkleur: '#2b2b28', maatkleur: '#3f5a52' });
          schets.append(el('figcaption', {}, 'onze benadering'));
          beelden.append(schets);
          const kop = el('div', { class: 'kaartkop' });
          kop.append(el('h2', {}, m.naam), el('span', { class: 'klein' }, m.familie));
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
  opWijziging('materialen', toon);
  opWijziging('korting', toon);
  toon();
}

export const modelOntwerp = (code: string) => zetelModellen.find((m) => m.code === code)?.ontwerp;
