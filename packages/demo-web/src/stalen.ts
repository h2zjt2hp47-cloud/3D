/**
 * Stalen van stoffen: een getekende weefselstructuur per soort (velours, bouclé, linnen …) in de kleur van de stof,
 * gebruikt voor de stalenkaart én als textuur in de 3D. Daarnaast de stalenkaart zelf: alle stoffen per collectie,
 * met filters op soort, kleur en prijsgroep.
 */
import {
  collectieVan,
  KLEURFAMILIES,
  kleurfamilie,
  stofkaart,
  weefselVan,
  WEEFSELS,
  type Materiaal,
} from '../../core/src/index.js';
import { el } from './staat.js';
import { weefselCanvas } from './weefsel.js';

export { WEEFSEL_CM } from './weefsel.js';

const staalCache = new Map<string, string>();

/** Staal als afbeelding (data-URL) om als achtergrond te tonen. Een stoffoto gaat voor. */
export function staalBeeld(m: Pick<Materiaal, 'soort' | 'naam' | 'weefsel' | 'kleur' | 'textuur'>): string {
  if (m.textuur) return m.textuur;
  const w = weefselVan(m);
  const sleutel = `${w}:${m.kleur}`;
  let url = staalCache.get(sleutel);
  if (!url) {
    try {
      url = weefselCanvas(w, m.kleur).toDataURL('image/png');
    } catch {
      url = '';
    }
    staalCache.set(sleutel, url);
  }
  return url;
}

/** Zet de staal als achtergrond op een element (kleur als terugval). */
export function kleurStaal(e: HTMLElement, m: Materiaal) {
  e.style.backgroundColor = m.kleur;
  const beeld = staalBeeld(m);
  if (beeld) {
    e.style.backgroundImage = `url("${beeld}")`;
    e.style.backgroundSize = m.textuur ? 'cover' : '64px 64px';
  }
}

/** Materialen gegroepeerd per collectie, in de volgorde waarin de collecties voor het eerst voorkomen. */
export function perCollectie(materialen: Materiaal[]): [string, Materiaal[]][] {
  const groepen = new Map<string, Materiaal[]>();
  for (const m of materialen) {
    const c = collectieVan(m);
    if (!groepen.has(c)) groepen.set(c, []);
    groepen.get(c)!.push(m);
  }
  return [...groepen];
}

/** Vult een keuzelijst met de materialen per collectie (optgroup). */
export function materiaalOptiesPerCollectie(select: HTMLSelectElement, materialen: Materiaal[], gekozen: string | undefined, eerste?: HTMLOptionElement) {
  select.replaceChildren();
  if (eerste) select.append(eerste);
  for (const [collectie, lijst] of perCollectie(materialen)) {
    const og = el('optgroup', { label: `${collectie} · groep ${[...new Set(lijst.map((m) => m.groep))].join('/')}` });
    for (const m of lijst) {
      const o = el('option', { value: m.code }, m.naam) as HTMLOptionElement;
      if (m.code === gekozen) o.selected = true;
      og.append(o);
    }
    select.append(og);
  }
}

/** Korte uitleg bij een stof: collectie, weefsel, prijsgroep, en de stofkaart als die er is. */
export function stofUitleg(m: Materiaal): string {
  const delen = [collectieVan(m), WEEFSELS[weefselVan(m)].split(' (')[0], m.groep === 'EIGEN' ? 'materiaal van de klant' : `prijsgroep ${m.groep}`];
  return delen.join(' · ') + (m.artikel ? ` · ${stofkaart(m)}` : '');
}

interface Filter { weefsel: string; kleur: string; groep: string }

/**
 * Stalenkaart: filters bovenaan, daaronder per collectie de stalen. Klik = kiezen.
 * Geeft het element terug; `ververs(gekozen)` tekent opnieuw (bv. na een wijziging van de materialen).
 */
export function maakStalenkaart(opties: { materialen: () => Materiaal[]; gekozen: () => string; opKies: (code: string) => void; id: string }) {
  const filter: Filter = { weefsel: '', kleur: '', groep: '' };
  const kaart = el('div', { class: 'stalenkaart', id: opties.id });
  const balk = el('div', { class: 'stalen-filter' });
  const lijst = el('div', { class: 'stalen-lijst' });
  const gekozenTekst = el('p', { class: 'stalen-gekozen klein', 'aria-live': 'polite' });
  const telling = el('span', { class: 'stalen-telling klein' });
  kaart.append(balk, gekozenTekst, lijst);

  const keuzelijst = (label: string, sleutel: keyof Filter, waarden: [string, string][]) => {
    const l = el('label', { class: 'stalen-veld' });
    const s = el('select', { 'aria-label': label }) as HTMLSelectElement;
    s.append(el('option', { value: '' }, label), ...waarden.map(([v, t]) => el('option', { value: v }, t)));
    s.value = filter[sleutel];
    s.addEventListener('change', () => { filter[sleutel] = s.value; teken(); });
    l.append(s);
    return l;
  };

  function teken() {
    const alle = opties.materialen();
    const weefsels = [...new Set(alle.map(weefselVan))];
    const groepen = [...new Set(alle.map((m) => m.groep))];
    const families = KLEURFAMILIES.filter((f) => alle.some((m) => kleurfamilie(m.kleur) === f));
    balk.replaceChildren(
      keuzelijst('Alle soorten', 'weefsel', weefsels.map((w) => [w, WEEFSELS[w].split(' (')[0]!])),
      keuzelijst('Alle kleuren', 'kleur', families.map((f) => [f, f])),
      keuzelijst('Alle prijsgroepen', 'groep', groepen.map((g) => [g, g === 'EIGEN' ? 'Eigen materiaal' : `Groep ${g}`])),
      telling,
    );
    const zichtbaar = alle.filter((m) =>
      (!filter.weefsel || weefselVan(m) === filter.weefsel) &&
      (!filter.kleur || kleurfamilie(m.kleur) === filter.kleur) &&
      (!filter.groep || m.groep === filter.groep));
    telling.textContent = zichtbaar.length === alle.length ? `${alle.length} stoffen` : `${zichtbaar.length} van ${alle.length}`;
    const gekozen = opties.gekozen();
    const nu = alle.find((m) => m.code === gekozen);
    gekozenTekst.replaceChildren();
    if (nu) {
      const st = el('span', { class: 'staal groot', 'aria-hidden': 'true' });
      kleurStaal(st, nu);
      gekozenTekst.append(st, el('strong', {}, nu.naam), el('span', { class: 'stalen-uitleg' }, stofUitleg(nu)));
    }
    lijst.replaceChildren(
      ...perCollectie(zichtbaar).map(([collectie, stoffen]) => {
        const blok = el('section', { class: 'stalen-collectie' });
        const groepTekst = [...new Set(stoffen.map((m) => m.groep))].map((g) => (g === 'EIGEN' ? 'eigen' : `groep ${g}`)).join(', ');
        const kop = el('h3', {}, collectie);
        kop.append(el('span', { class: 'klein' }, ` · ${groepTekst} · ${stoffen.length} ${stoffen.length === 1 ? 'kleur' : 'kleuren'}`));
        blok.append(kop);
        const rij = el('div', { class: 'stalen-rij', role: 'group', 'aria-label': collectie });
        for (const m of stoffen) {
          const knop = el('button', {
            type: 'button', class: 'stalen-knop', 'aria-pressed': String(m.code === gekozen), title: `${m.naam} — ${stofUitleg(m)}`,
          }) as HTMLButtonElement;
          const st = el('span', { class: 'stalen-staal', 'aria-hidden': 'true' });
          kleurStaal(st, m);
          knop.append(st, el('span', { class: 'stalen-naam' }, kleurnaam(m, collectie)));
          knop.addEventListener('click', () => { opties.opKies(m.code); teken(); });
          rij.append(knop);
        }
        blok.append(rij);
        return blok;
      }),
    );
    if (!zichtbaar.length) lijst.append(el('p', { class: 'klein' }, 'Geen stof met deze filter. Kies "Alle …" om alles te zien.'));
  }
  teken();
  return { kaart, ververs: teken };
}

/** Kleurnaam onder de staal: de naam zonder het eerste woord van de collectie ("Velours Oker" → "Oker"). */
function kleurnaam(m: Materiaal, collectie: string): string {
  // Woorden vooraan die ook in de collectienaam staan weglaten ("Velours Mat Salie" in "Velours Mat" → "Salie").
  const inCollectie = new Set(collectie.toLowerCase().split(/[\s()]+/));
  const woorden = m.naam.split(' ');
  let i = 0;
  while (i < woorden.length - 1 && inCollectie.has(woorden[i]!.toLowerCase())) i++;
  return woorden.slice(i).join(' ');
}
