/**
 * Klikbare demo van de configurator.
 * Het formulier wordt opgebouwd uit het productmodel; elke wijziging herberekent
 * prijs, meldingen, stuklijst en tekening met dezelfde motor als op de server.
 */
import {
  berekenConfiguratie,
  standaardKeuzes,
  tekenSvg,
  type ConfiguratieResultaat,
  type Kenmerk,
  type Keuzes,
  type Prijslijst,
  type ProductModel,
} from '../../core/src/index.js';
import { demoPrijslijst, maatkast } from '../../core/voorbeelden/maatkast.js';
import { maakSofa, maakSofaPrijslijst } from '../../core/voorbeelden/sofa.js';
import { $, el, eur, getal, getKorting, getMaterialen, kopieer, opWijziging } from './staat.js';
import { kleurStaal } from './stalen.js';

interface Product {
  model: ProductModel;
  prijslijst: Prijslijst;
}
function maakProduct(code: string): Product {
  if (code === 'kast') return { model: maatkast, prijslijst: demoPrijslijst };
  const m = getMaterialen();
  return { model: maakSofa(m), prijslijst: maakSofaPrijslijst(m) };
}

let productCode = 'sofa';
let huidig: Product = maakProduct('sofa');
let keuzes: Keuzes = {};
let laatste: ConfiguratieResultaat | undefined;

/** Per kenmerk: de elementen die bij een herberekening bijgewerkt worden. */
const velden = new Map<string, { veld: HTMLElement; fout: HTMLElement; update: (r: ConfiguratieResultaat) => void }>();

function bouwFormulier() {
  const form = $('#formulier');
  form.replaceChildren();
  velden.clear();
  const model = huidig.model;
  model.stappen.forEach((stap, n) => {
    const sectie = el('section', { class: 'stap', 'aria-labelledby': `stap-${stap.code}` });
    const kop = el('h2', { id: `stap-${stap.code}` });
    kop.append(el('span', { class: 'stapnr' }, String(n + 1)), document.createTextNode(stap.label));
    sectie.append(kop);
    for (const k of model.kenmerken.filter((k) => k.stap === stap.code)) sectie.append(bouwVeld(k));
    form.append(sectie);
  });
}

function bouwVeld(k: Kenmerk): HTMLElement {
  const veld = el('div', { class: `veld veld-${k.type}`, 'data-kenmerk': k.code });
  const id = `k-${k.code}`;
  const fout = el('p', { class: 'veldfout', role: 'alert' });
  let update: (r: ConfiguratieResultaat) => void = () => {};

  if (k.type === 'getal') {
    const label = el('label', { for: id }, k.label);
    const rij = el('div', { class: 'getalrij' });
    const schuif = el('input', { type: 'range', id: `${id}-schuif`, 'aria-label': `${k.label} (schuifbalk)`, step: String(k.stapgrootte ?? 1) }) as HTMLInputElement;
    const invoer = el('input', { type: 'number', id, inputmode: 'numeric', step: String(k.stapgrootte ?? 1) }) as HTMLInputElement;
    const eenheid = el('span', { class: 'eenheid' }, k.eenheid ?? '');
    const bereik = el('span', { class: 'bereik' });
    invoer.value = String(keuzes[k.code]);
    schuif.value = String(keuzes[k.code]);
    invoer.addEventListener('input', () => {
      keuzes[k.code] = invoer.value === '' ? null : Number(invoer.value);
      if (invoer.value !== '') schuif.value = invoer.value;
      herbereken();
    });
    schuif.addEventListener('input', () => {
      invoer.value = schuif.value;
      keuzes[k.code] = Number(schuif.value);
      herbereken();
    });
    rij.append(schuif, invoer, eenheid);
    veld.append(label, rij, bereik);
    if (k.helptekst) veld.append(el('p', { class: 'hulp' }, k.helptekst));
    update = (r) => {
      const s = r.kenmerken.find((x) => x.code === k.code)!;
      if (s.min !== undefined) { schuif.min = String(s.min); invoer.min = String(s.min); }
      if (s.max !== undefined) { schuif.max = String(s.max); invoer.max = String(s.max); }
      // Pas na min/max de waarde zetten, anders klemt de schuifbalk ze op 0–100.
      if (typeof keuzes[k.code] === 'number') schuif.value = String(keuzes[k.code]);
      bereik.textContent = s.min !== undefined && s.max !== undefined ? `${getal(s.min)} – ${getal(s.max)} ${k.eenheid ?? ''}` : '';
    };
  }

  if (k.type === 'keuze') {
    const groep = el('fieldset', { class: 'keuzes' });
    groep.append(el('legend', {}, k.label));
    const knoppen = new Map<string, { knop: HTMLInputElement; tegel: HTMLElement; reden: HTMLElement }>();
    let vorigeCollectie = '';
    for (const kz of k.keuzes) {
      // Stoffen: een tussenkop per collectie, zodat de kleuren van één stof samen staan.
      const collectie = kz.eigenschappen?.collectie;
      if (typeof collectie === 'string' && collectie !== vorigeCollectie) {
        groep.append(el('div', { class: 'keuzegroep-kop' }, collectie));
        vorigeCollectie = collectie;
      }
      const kid = `${id}-${kz.code}`;
      const tegel = el('label', { class: 'tegel', for: kid });
      const knop = el('input', { type: 'radio', name: id, id: kid, value: kz.code }) as HTMLInputElement;
      knop.checked = keuzes[k.code] === kz.code;
      knop.addEventListener('change', () => {
        keuzes[k.code] = kz.code;
        herbereken();
      });
      const kleur = kz.eigenschappen?.kleur;
      if (typeof kleur === 'string') {
        const staal = el('span', { class: 'staal', 'aria-hidden': 'true' });
        const m = getMaterialen().find((x) => x.code === kz.code);
        if (m) kleurStaal(staal, m);
        else staal.style.background = kleur;
        tegel.append(staal);
      }
      const tekst = el('span', { class: 'tegeltekst' }, kz.label);
      const reden = el('span', { class: 'reden' });
      tegel.prepend(knop);
      tegel.append(tekst, reden);
      groep.append(tegel);
      knoppen.set(kz.code, { knop, tegel, reden });
    }
    veld.append(groep);
    update = (r) => {
      const s = r.kenmerken.find((x) => x.code === k.code)!;
      for (const ks of s.keuzes ?? []) {
        const kn = knoppen.get(ks.code)!;
        kn.knop.disabled = !ks.beschikbaar && keuzes[k.code] !== ks.code;
        kn.tegel.classList.toggle('onbeschikbaar', !ks.beschikbaar);
        kn.reden.textContent = ks.beschikbaar ? '' : ks.reden ?? 'niet mogelijk';
      }
    };
  }

  if (k.type === 'janee') {
    const label = el('label', { class: 'schakelaar', for: id });
    const vink = el('input', { type: 'checkbox', id, role: 'switch' }) as HTMLInputElement;
    vink.checked = keuzes[k.code] === true;
    vink.addEventListener('change', () => {
      keuzes[k.code] = vink.checked;
      herbereken();
    });
    label.append(vink, el('span', { class: 'schuifje', 'aria-hidden': 'true' }), el('span', {}, k.label));
    veld.append(label);
  }

  veld.append(fout);
  velden.set(k.code, { veld, fout, update });
  return veld;
}

function herbereken() {
  const r = berekenConfiguratie(huidig.model, keuzes, huidig.prijslijst, { kortingProcent: getKorting() });
  laatste = r;

  for (const s of r.kenmerken) {
    const v = velden.get(s.code);
    if (!v) continue;
    v.veld.hidden = !s.zichtbaar;
    v.update(r);
    const fouten = r.meldingen.filter((m) => m.kenmerk === s.code);
    v.fout.textContent = fouten.map((m) => m.melding).join(' ');
    v.veld.classList.toggle('heeft-fout', fouten.length > 0);
  }

  // Tekening
  $('#tekening').innerHTML = r.tekening ? tekenSvg(r.tekening, { breedtePx: 640, lijnkleur: '#2b2b28', maatkleur: '#3f5a52' }) : '';
  $('#tekening-titel').textContent = r.tekening?.titel ?? '';

  // Status en prijs
  const status = $('#status');
  const fouten = r.meldingen.filter((m) => m.ernst === 'fout').length;
  status.textContent = r.geldig ? 'Klaar voor offerte' : `${fouten} ${fouten === 1 ? 'fout' : 'fouten'} op te lossen`;
  status.className = `status ${r.geldig ? 'ok' : 'fout'}`;

  $('#prijs-excl').textContent = eur(r.prijs.verkoopprijsExcl);
  $('#prijs-incl').textContent = `${eur(r.prijs.verkoopprijsIncl)} incl. ${huidig.model.prijs.btwProcent}% btw`;
  // Derde waarde: intern (kostprijs, marge …), verborgen in de klantweergave.
  const regels: [string, string, boolean?][] = [];
  if (r.prijs.kortingProcent) {
    regels.push(['Brutoprijs', eur(r.prijs.brutoprijsExcl)]);
    regels.push([`Korting ${getal(r.prijs.kortingProcent)}%`, `− ${eur(r.prijs.brutoprijsExcl - r.prijs.verkoopprijsExcl)}`]);
  }
  regels.push(['Kostprijs', eur(r.prijs.kostprijs), true]);
  regels.push(['Marge', r.prijs.margeProcent === null ? '—' : `${getal(r.prijs.margeProcent, 1)}%`, true]);
  if (typeof r.afgeleid.stofverbruik === 'number') {
    regels.push(['Stofverbruik', `${getal(r.afgeleid.stofverbruik, 1)} m${r.afgeleid.stofverbruik_contrast ? ` + ${getal(r.afgeleid.stofverbruik_contrast as number, 1)} m` : ''}`, true]);
  }
  regels.push(['Prijsmethode', r.prijs.methode === 'lijstprijs' ? 'prijstabel' : 'kostprijs + opslag', true]);
  const dl = $('#prijsdetail');
  dl.replaceChildren(...regels.flatMap(([a, b, intern]) => [el('dt', intern ? { class: 'intern' } : {}, a), el('dd', intern ? { class: 'intern' } : {}, b)]));

  // Meldingen (niet aan een veld gekoppeld)
  const algemeen = r.meldingen.filter((m) => !m.kenmerk);
  const lijst = $('#meldingen');
  lijst.replaceChildren(...algemeen.map((m) => el('li', { class: `${m.ernst}${m.intern ? ' intern' : ''}` }, m.melding)));
  lijst.hidden = algemeen.length === 0;

  // Samenvatting en stuklijst
  $('#samenvatting').replaceChildren(...r.samenvatting.map((s) => el('li', {}, s)));
  const tbody = $('#stuklijst tbody');
  tbody.replaceChildren(
    ...r.stuklijst.map((s) => {
      const tr = el('tr');
      const maat = s.lengte !== undefined ? `${getal(s.lengte, 1)}${s.breedte !== undefined ? ` × ${getal(s.breedte, 1)}` : ''}` : '';
      tr.append(
        el('td', {}, s.omschrijving),
        el('td', { class: 'code' }, s.artikel),
        el('td', { class: 'num' }, getal(s.aantal)),
        el('td', { class: 'num' }, maat),
        el('td', { class: 'num' }, `${getal(s.hoeveelheid, 3)} ${s.eenheid === 'm2' ? 'm²' : s.eenheid}`),
        el('td', { class: 'num' }, eur(s.kost)),
      );
      return tr;
    }),
  );
  $('#maateenheid').textContent = huidig.model.maateenheid ?? 'mm';
}

/** Toont een product (sofa of kast). Bestaande keuzes blijven behouden als ze nog geldig zijn. */
/** Is dit materiaal gekozen in de sofa op maat (hoofdstof of stof van de zitkussens)? */
export function materiaalInSofa(code: string): boolean {
  const sofa = productCode === 'sofa' ? keuzes : keuzesPerProduct.get('sofa') ?? {};
  return Object.entries(sofa).some(([k, w]) => k.startsWith('stof') && w === code);
}

/** De laatste keuzes per product: wie van de sofa naar de kast en terug gaat, vindt beide terug zoals hij ze liet. */
const keuzesPerProduct = new Map<string, Keuzes>();

export function kiesProduct(code: string, behoudKeuzes = false) {
  keuzesPerProduct.set(productCode, keuzes);
  // Alleen de eigen keuzes van dit product overnemen: de sofa (cm) en de kast (mm) hebben allebei een "breedte".
  const vorige = keuzesPerProduct.get(code) ?? {};
  productCode = code;
  huidig = maakProduct(code);
  keuzes = standaardKeuzes(huidig.model);
  if (behoudKeuzes) {
    for (const k of huidig.model.kenmerken) {
      const w = vorige[k.code];
      if (w === undefined) continue;
      if (k.type === 'keuze' && !k.keuzes.some((kz) => kz.code === w)) continue;
      keuzes[k.code] = w;
    }
  }
  $('#productnaam').textContent = huidig.model.naam;
  bouwFormulier();
  herbereken();
}

export function startConfigurator() {
  $('#herstel').addEventListener('click', () => kiesProduct(productCode));
  $('#kopieer').addEventListener('click', () => {
    if (!laatste) return;
    const tekst = [
      huidig.model.naam,
      ...laatste.samenvatting.map((s) => `- ${s}`),
      `Prijs: ${eur(laatste.prijs.verkoopprijsExcl)} excl. btw (${eur(laatste.prijs.verkoopprijsIncl)} incl. btw)`,
    ].join('\n');
    void kopieer(tekst, $('#kopieer-melding'));
  });
  opWijziging('korting', () => laatste && herbereken());
  opWijziging('materialen', () => productCode === 'sofa' && kiesProduct('sofa', true));
  kiesProduct('sofa');
}
