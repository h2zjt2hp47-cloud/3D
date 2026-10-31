/**
 * Modellen uit de collectie: kaartjes met vooraanzicht en richtprijs.
 * "Kies en pas aan" laadt het model in de vrije ontwerper.
 */
import { berekenOntwerp, tekenSvg, tekenVooraanzicht } from '../../core/src/index.js';
import { zetelModellen } from '../../core/voorbeelden/modellen.js';
import { zetelCatalogus } from '../../core/voorbeelden/vrij-ontwerp.js';
import { $, el, eur, getal, getKorting, getMaterialen, opWijziging } from './staat.js';

export function startModellen(kies: (code: string) => void) {
  const toon = () => {
    const raster = $('#modellen-lijst');
    raster.replaceChildren(
      ...zetelModellen.map((m) => {
        const r = berekenOntwerp(m.ontwerp, zetelCatalogus, getMaterialen(), { kortingProcent: getKorting() });
        const kaart = el('article', { class: 'kaart modelkaart' });
        const beeld = el('div', { class: 'modelbeeld' });
        beeld.innerHTML = tekenSvg(tekenVooraanzicht(m.ontwerp, zetelCatalogus, getMaterialen()), { breedtePx: 520, lijnkleur: '#2b2b28', maatkleur: '#3f5a52' });
        const kop = el('div', { class: 'kaartkop' });
        kop.append(el('h2', {}, m.naam), el('span', { class: 'klein' }, m.familie));
        const knop = el('button', { type: 'button' }, 'Kies en pas aan') as HTMLButtonElement;
        knop.addEventListener('click', () => kies(m.code));
        const acties = el('div', { class: 'knoppenrij' });
        acties.append(knop);
        kaart.append(
          beeld,
          kop,
          el('p', {}, m.omschrijving),
          el('p', { class: 'modelprijs' }, `Richtprijs in deze opstelling: ${eur(r.prijs.verkoopprijsExcl)} excl. btw`),
          el('p', { class: 'klein' }, `${getal(r.afmetingen.breedte, 1)} × ${getal(r.afmetingen.diepte, 1)} cm · ${r.elementen.length} elementen · ${m.bron ?? ''}`),
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
