/**
 * Catalogus-editor: zelf elementen, opties (optiegroepen en keuzes) en modellen ontwerpen.
 * Alles wordt gecontroleerd (controleerCatalogus) vóór het bewaard wordt.
 * De catalogus wordt in deze browser bewaard en kan gekopieerd/ingelezen worden.
 */
import {
  berekenOntwerp,
  controleerCatalogus,
  maakCode,
  tekenSvg,
  tekenVooraanzicht,
  type ElementType,
  type ModelDefinitie,
  type Ontwerp,
  type OntwerpCatalogus,
  type OptieGroep,
  type OptieKeuze,
  type Tekenstijl,
} from '../../core/src/index.js';
import { zetelModellen } from '../../core/voorbeelden/modellen.js';
import {
  $,
  bevestigKnop,
  el,
  eur,
  getal,
  getCatalogus,
  getEigenModellen,
  getMaterialen,
  getModellen,
  herstelCatalogus,
  kopieer,
  opWijziging,
  setCatalogus,
} from './staat.js';

const VORMEN: Record<Tekenstijl, string> = {
  zit: 'Zitelement met rug',
  hoek: 'Hoekelement',
  chaise: 'Chaise longue / lounge',
  zit_zonder_rug: 'Zitbank zonder rug',
  rond: 'Afgerond eindelement',
  kuip: 'Fauteuil (kuip)',
  arm: 'Armleuning',
  poef: 'Poef',
  console: 'Houten tussenstuk',
  rugleuning: 'Losse rugleuning (op een element)',
  kussen: 'Kussen (op een element)',
  rolkussen: 'Rolkussen (op een element)',
};
const OPZET_VORMEN: Tekenstijl[] = ['rugleuning', 'kussen', 'rolkussen'];

interface Acties {
  huidigOntwerp: () => Ontwerp;
  openModel: (code: string) => void;
}
let acties: Acties;

// ---------- algemene hulpjes ----------
function veld(label: string, invoer: HTMLElement, uitleg?: string): HTMLElement {
  const w = el('label', { class: 'maatveld' });
  w.append(el('span', {}, label), invoer);
  if (uitleg) w.append(el('span', { class: 'klein' }, uitleg));
  return w;
}
function getalInvoer(id: string, waarde: number | undefined, stap = 'any'): HTMLInputElement {
  return el('input', { type: 'number', id, step: stap, value: waarde === undefined ? '' : String(waarde) }) as HTMLInputElement;
}
const num = (i: HTMLInputElement) => (i.value.trim() === '' ? undefined : Number(i.value.replace(',', '.')));
const numVerplicht = (i: HTMLInputElement) => num(i) ?? Number.NaN;

function toonProblemen(vak: HTMLElement, problemen: string[], ok?: string) {
  vak.replaceChildren(...problemen.map((p) => el('li', { class: 'fout' }, p)));
  if (!problemen.length && ok) vak.replaceChildren(el('li', { class: 'ok' }, ok));
}

/** Bewaart een nieuwe catalogus als die geen fouten heeft. Geeft de problemen terug. */
function probeerBewaren(nieuw: OntwerpCatalogus, eigen = getEigenModellen()): string[] {
  const problemen = controleerCatalogus(nieuw, [...zetelModellen, ...eigen]);
  if (!problemen.length) setCatalogus(nieuw, eigen);
  return problemen;
}

// ================= ELEMENTEN =================
let bewerkType: string | null = null;

function leegType(): ElementType {
  const zit = getCatalogus().typen.find((t) => t.code === 'zit') ?? getCatalogus().typen[0]!;
  return { ...structuredClone(zit), code: '', label: '' };
}

function toonTypeLijst() {
  const lijst = $('#cat-typen');
  // Per elementtype: in hoeveel modellen het voorkomt (een element dat in een model zit, kan niet weg).
  const gebruikt = new Map<string, number>();
  for (const m of getModellen()) for (const code of new Set(m.ontwerp.elementen.map((e) => e.type))) gebruikt.set(code, (gebruikt.get(code) ?? 0) + 1);
  lijst.replaceChildren(
    ...getCatalogus().typen.map((t) => {
      const rij = el('li', { class: t.code === bewerkType ? 'actief' : '' });
      const naam = el('div');
      naam.append(el('strong', {}, t.label), el('span', { class: 'klein' }, ` · ${VORMEN[t.tekenstijl] ?? t.tekenstijl}${t.opzet ? ' · ligt op een element' : ''}`));
      const knoppen = el('div', { class: 'knoppenrij' });
      const bewerk = el('button', { type: 'button', class: 'tweede klein-knop' }, 'Bewerk') as HTMLButtonElement;
      bewerk.addEventListener('click', () => vulTypeFormulier(t, false));
      const kopie = el('button', { type: 'button', class: 'tweede klein-knop' }, 'Kopie als nieuw') as HTMLButtonElement;
      kopie.addEventListener('click', () => vulTypeFormulier({ ...structuredClone(t), code: '', label: `${t.label} (kopie)` }, true));
      knoppen.append(bewerk, kopie);
      if (!gebruikt.has(t.code)) {
        const weg = el('button', { type: 'button', class: 'gevaar klein-knop' }, 'Verwijder') as HTMLButtonElement;
        bevestigKnop(weg, 'Zeker?', () => {
          const c = structuredClone(getCatalogus());
          c.typen = c.typen.filter((x) => x.code !== t.code);
          for (const g of c.opties ?? []) if (g.voorTypen) g.voorTypen = g.voorTypen.filter((x) => x !== t.code);
          toonProblemen($('#cat-type-meldingen'), probeerBewaren(c), `"${t.label}" is verwijderd.`);
        });
        knoppen.append(weg);
      } else {
        const n = gebruikt.get(t.code)!;
        knoppen.append(el('span', { class: 'klein' }, `gebruikt in ${n} ${n === 1 ? 'model' : 'modellen'} (daarom niet te verwijderen)`));
      }
      rij.append(naam, knoppen);
      return rij;
    }),
  );
}

let typeInvoer: Record<string, HTMLInputElement | HTMLSelectElement> = {};

function vulTypeFormulier(t: ElementType, nieuw: boolean) {
  bewerkType = nieuw ? null : t.code;
  const f = $('#cat-type-form');
  typeInvoer = {};
  const groepen = getCatalogus().groepen;
  const naam = el('input', { type: 'text', id: 'ct-label', value: t.label, maxlength: '50' }) as HTMLInputElement;
  const vorm = el('select', { id: 'ct-vorm' }) as HTMLSelectElement;
  for (const [code, label] of Object.entries(VORMEN)) {
    const o = el('option', { value: code }, label);
    if (code === t.tekenstijl) o.selected = true;
    vorm.append(o);
  }
  typeInvoer = {
    label: naam, vorm,
    bmin: getalInvoer('ct-bmin', t.breedte.min, '1'), bstd: getalInvoer('ct-bstd', t.breedte.standaard, '1'), bmax: getalInvoer('ct-bmax', t.breedte.max, '1'),
    dmin: getalInvoer('ct-dmin', t.diepte.min, '1'), dstd: getalInvoer('ct-dstd', t.diepte.standaard, '1'), dmax: getalInvoer('ct-dmax', t.diepte.max, '1'),
    hoogte: getalInvoer('ct-hoogte', t.hoogte, '1'),
    stofVast: getalInvoer('ct-stofvast', t.stofVast), stofPerM: getalInvoer('ct-stofperm', t.stofPerM),
    kostVast: getalInvoer('ct-kostvast', t.kostVast), kostPerM: getalInvoer('ct-kostperm', t.kostPerM),
    uren: getalInvoer('ct-uren', t.uren), urenPerM: getalInvoer('ct-urenperm', t.urenPerM),
  };
  for (const g of groepen) {
    typeInvoer[`prijs-${g}`] = getalInvoer(`ct-prijs-${g}`, t.prijs[g]);
    typeInvoer[`per10-${g}`] = getalInvoer(`ct-per10-${g}`, t.per10cm[g]);
  }
  const maten = el('div', { class: 'formraster drie' });
  maten.append(
    veld('Breedte min (cm)', typeInvoer.bmin!), veld('Breedte standaard', typeInvoer.bstd!), veld('Breedte max', typeInvoer.bmax!),
    veld('Diepte min (cm)', typeInvoer.dmin!), veld('Diepte standaard', typeInvoer.dstd!), veld('Diepte max', typeInvoer.dmax!),
  );
  const prijs = el('table', { class: 'prijstabel' });
  const kop = el('tr');
  kop.append(el('th', {}, 'Prijsgroep'), el('th', {}, 'Prijs bij min. breedte (€)'), el('th', {}, 'Meerprijs per 10 cm (€)'));
  prijs.append(kop);
  for (const g of groepen) {
    const r = el('tr');
    const c1 = el('td'), c2 = el('td');
    c1.append(typeInvoer[`prijs-${g}`]!);
    c2.append(typeInvoer[`per10-${g}`]!);
    r.append(el('td', {}, g === 'EIGEN' ? 'EIGEN (stof klant)' : g), c1, c2);
    prijs.append(r);
  }
  const productie = el('div', { class: 'formraster drie' });
  productie.append(
    veld('Stof vast (m)', typeInvoer.stofVast!), veld('Stof per m breedte (m)', typeInvoer.stofPerM!), veld('Kussenhoogte (cm)', typeInvoer.hoogte!, 'alleen voor kussens'),
    veld('Kostprijs vast (€)', typeInvoer.kostVast!), veld('Kostprijs per m (€)', typeInvoer.kostPerM!), el('span'),
    veld('Atelieruren vast', typeInvoer.uren!), veld('Atelieruren per m', typeInvoer.urenPerM!),
  );
  const knoppen = el('div', { class: 'knoppenrij' });
  const opslaan = el('button', { type: 'submit' }, nieuw ? 'Element toevoegen' : 'Wijzigingen opslaan') as HTMLButtonElement;
  const annuleer = el('button', { type: 'button', class: 'tweede' }, 'Sluiten') as HTMLButtonElement;
  annuleer.addEventListener('click', () => {
    f.hidden = true;
    bewerkType = null;
    toonTypeLijst();
  });
  knoppen.append(opslaan, annuleer);
  const voorbeeld = el('div', { class: 'catvoorbeeld', id: 'ct-voorbeeld' });
  f.replaceChildren(
    el('h3', {}, nieuw ? 'Nieuw element' : `Bewerk: ${t.label}`),
    el('div', { class: 'formraster' }),
    voorbeeld,
  );
  const basis = f.querySelector('.formraster')!;
  basis.append(veld('Naam', naam), veld('Vorm en tekenwijze', vorm, 'bepaalt hoe het getekend wordt (boven, voor, 3D)'));
  f.append(el('h4', {}, 'Maten'), maten, el('h4', {}, 'Verkoopprijs'), prijs, el('h4', {}, 'Stof en productie'), productie, el('ul', { id: 'cat-type-meldingen', class: 'meldingen' }), knoppen);
  f.hidden = false;
  f.oninput = () => typeVoorbeeld(nieuw);
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const nt = leesTypeFormulier(nieuw);
    const c = structuredClone(getCatalogus());
    if (nieuw) c.typen.push(nt);
    else c.typen = c.typen.map((x) => (x.code === bewerkType ? nt : x));
    const problemen = probeerBewaren(c);
    if (!problemen.length && nieuw) vulTypeFormulier(nt, false);
    toonProblemen($('#cat-type-meldingen'), problemen, `"${nt.label}" is bewaard. Je vindt het in "Vrij ontwerp" bij de tekenknoppen.`);
  };
  typeVoorbeeld(nieuw);
  toonTypeLijst();
  f.scrollIntoView({ block: 'nearest' });
}

function leesTypeFormulier(nieuw: boolean): ElementType {
  const i = typeInvoer as Record<string, HTMLInputElement>;
  const label = i.label!.value.trim();
  const vorm = (typeInvoer.vorm as HTMLSelectElement).value as Tekenstijl;
  const prijs: Record<string, number> = {}, per10cm: Record<string, number> = {};
  for (const g of getCatalogus().groepen) {
    prijs[g] = numVerplicht(i[`prijs-${g}`]!);
    per10cm[g] = numVerplicht(i[`per10-${g}`]!);
  }
  const t: ElementType = {
    code: nieuw ? maakCode(label || 'element', getCatalogus().typen.map((x) => x.code)) : bewerkType!,
    label,
    tekenstijl: vorm,
    breedte: { min: numVerplicht(i.bmin!), standaard: numVerplicht(i.bstd!), max: numVerplicht(i.bmax!) },
    diepte: { min: numVerplicht(i.dmin!), standaard: numVerplicht(i.dstd!), max: numVerplicht(i.dmax!) },
    prijs, per10cm,
    stofVast: numVerplicht(i.stofVast!), stofPerM: numVerplicht(i.stofPerM!),
    kostVast: numVerplicht(i.kostVast!), kostPerM: numVerplicht(i.kostPerM!),
    uren: numVerplicht(i.uren!), urenPerM: numVerplicht(i.urenPerM!),
  };
  if (OPZET_VORMEN.includes(vorm)) t.opzet = true;
  // Velden die niet in het formulier staan, blijven zoals ze waren (bv. tot welke breedte de basisprijs geldt).
  const oud = nieuw ? undefined : getCatalogus().typen.find((x) => x.code === bewerkType);
  if (oud?.prijsVanaf !== undefined) t.prijsVanaf = oud.prijsVanaf;
  const h = num(i.hoogte!);
  if (h !== undefined) t.hoogte = h;
  return t;
}

/** Live voorbeeld: het element in standaardmaat (een opzet-element op een zitelement), voor- en bovenaanzicht en prijs per groep. */
function typeVoorbeeld(nieuw: boolean) {
  const vak = $('#ct-voorbeeld');
  let t: ElementType;
  try {
    t = leesTypeFormulier(nieuw);
  } catch {
    return;
  }
  const c = structuredClone(getCatalogus());
  const code = '__voorbeeld';
  c.typen = [...c.typen.filter((x) => x.code !== code), { ...t, code }];
  const B = t.breedte.standaard, D = t.diepte.standaard;
  const o: Ontwerp = {
    hoofdmateriaal: getMaterialen()[1]?.code ?? getMaterialen()[0]?.code ?? '',
    elementen: t.opzet
      ? [{ id: 'd', type: 'zit', x: 0, y: 0, breedte: Math.max(90, B + 10), diepte: 100, rotatie: 0 }, { id: 'v', type: code, x: 5, y: t.tekenstijl === 'rugleuning' ? 0 : 20, breedte: B, diepte: D, rotatie: 0 }]
      : [{ id: 'v', type: code, x: 0, y: 0, breedte: B, diepte: D, rotatie: 0 }],
  };
  if (![B, D].every((x) => Number.isFinite(x) && x > 0)) {
    vak.replaceChildren(el('p', { class: 'klein' }, 'Vul geldige maten in voor een voorbeeld.'));
    return;
  }
  try {
    const r = berekenOntwerp(o, c, getMaterialen());
    const boven = el('div', { class: 'tekening' });
    boven.innerHTML = tekenSvg(r.tekening, { breedtePx: 260, lijnkleur: '#2b2b28', maatkleur: '#3f5a52' });
    const voor = el('div', { class: 'tekening' });
    voor.innerHTML = tekenSvg(tekenVooraanzicht(o, c, getMaterialen()), { breedtePx: 260, lijnkleur: '#2b2b28', maatkleur: '#3f5a52' });
    const prijzen = el('p', { class: 'klein' });
    prijzen.textContent = `Prijs in standaardmaat (${B} × ${D} cm): ` + c.groepen.map((g) => `${g} ${eur(berekenOpGroep(o, c, g))}`).join(' · ');
    vak.replaceChildren(el('h4', {}, 'Voorbeeld'), voor, boven, prijzen);
  } catch {
    vak.replaceChildren(el('p', { class: 'klein' }, 'Nog geen voorbeeld mogelijk.'));
  }
}

function berekenOpGroep(o: Ontwerp, c: OntwerpCatalogus, groep: string): number {
  const m = getMaterialen().find((x) => x.groep === groep);
  if (!m) return Number.NaN;
  const r = berekenOntwerp({ ...o, hoofdmateriaal: m.code }, c, getMaterialen());
  return r.elementen.find((e) => e.id === 'v')?.prijs ?? Number.NaN;
}

// ================= OPTIES =================
let bewerkGroep: string | null = null;

function toonGroepLijst() {
  const lijst = $('#cat-groepen');
  lijst.replaceChildren(
    ...(getCatalogus().opties ?? []).map((g) => {
      const rij = el('li', { class: g.code === bewerkGroep ? 'actief' : '' });
      const naam = el('div');
      naam.append(
        el('strong', {}, g.label),
        el('span', { class: 'klein' }, ` · ${g.niveau === 'element' ? 'per element' : g.perElement ? 'hele zetel, prijs per element' : 'hele zetel'} · ${g.keuzes.length} keuzes`),
      );
      const knoppen = el('div', { class: 'knoppenrij' });
      const bewerk = el('button', { type: 'button', class: 'tweede klein-knop' }, 'Bewerk') as HTMLButtonElement;
      bewerk.addEventListener('click', () => vulGroepFormulier(structuredClone(g), false));
      const weg = el('button', { type: 'button', class: 'gevaar klein-knop' }, 'Verwijder') as HTMLButtonElement;
      bevestigKnop(weg, 'Zeker?', () => {
        const c = structuredClone(getCatalogus());
        c.opties = (c.opties ?? []).filter((x) => x.code !== g.code);
        for (const x of c.opties) for (const k of x.keuzes) if (k.alleenMet) delete k.alleenMet[g.code];
        toonProblemen($('#cat-groep-meldingen'), probeerBewaren(c), `"${g.label}" is verwijderd.`);
      });
      knoppen.append(bewerk, weg);
      rij.append(naam, knoppen);
      return rij;
    }),
  );
}

function alleenMetTekst(k: OptieKeuze) {
  return Object.entries(k.alleenMet ?? {}).map(([g, l]) => `${g}: ${l.join(', ')}`).join('; ');
}
function leesAlleenMet(tekst: string): Record<string, string[]> | undefined {
  const uit: Record<string, string[]> = {};
  for (const deel of tekst.split(';')) {
    const [g, rest] = deel.split(':');
    if (!g?.trim() || !rest) continue;
    uit[g.trim()] = rest.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return Object.keys(uit).length ? uit : undefined;
}

function vulGroepFormulier(g: OptieGroep, nieuw: boolean) {
  bewerkGroep = nieuw ? null : g.code;
  const f = $('#cat-groep-form');
  const naam = el('input', { type: 'text', id: 'cg-label', value: g.label, maxlength: '50' }) as HTMLInputElement;
  const niveau = el('select', { id: 'cg-niveau' }) as HTMLSelectElement;
  for (const [v, l] of [['ontwerp', 'Eén keuze voor de hele zetel'], ['element', 'Per element te kiezen']] as const) {
    const o = el('option', { value: v }, l);
    if (v === g.niveau) o.selected = true;
    niveau.append(o);
  }
  const perElement = el('input', { type: 'checkbox', id: 'cg-perelement' }) as HTMLInputElement;
  perElement.checked = g.perElement === true;
  const typenVak = el('fieldset', { class: 'maatveld breed' });
  typenVak.append(el('legend', {}, 'Geldt voor (niets aangevinkt = alle elementen)'));
  const typenChips = el('div', { class: 'chips' });
  for (const t of getCatalogus().typen) {
    const id = `cg-type-${t.code}`;
    const chip = el('label', { class: 'chip', for: id });
    const v = el('input', { type: 'checkbox', id, value: t.code }) as HTMLInputElement;
    v.checked = g.voorTypen?.includes(t.code) ?? false;
    chip.append(v, el('span', {}, t.label));
    typenChips.append(chip);
  }
  typenVak.append(typenChips);

  const tabel = el('table', { class: 'keuzetabel' });
  const kop = el('tr');
  for (const k of ['Std.', 'Naam keuze', 'Vaste prijs €', '€ per m', '% op prijs', 'Extra stof %', 'Kostprijs €', 'Kleur', 'Hoogte cm', 'Tekenvorm', 'Alleen met (groep: keuzes)', '']) kop.append(el('th', {}, k));
  tabel.append(kop);
  const rijen: { k: OptieKeuze; tr: HTMLTableRowElement }[] = [];
  const voegRijToe = (k: OptieKeuze) => {
    const tr = el('tr') as HTMLTableRowElement;
    const std = el('input', { type: 'radio', name: 'cg-standaard', value: k.code, 'aria-label': 'standaard' }) as HTMLInputElement;
    std.checked = k.code === g.standaard;
    const cel = (i: HTMLElement) => {
      const td = el('td');
      td.append(i);
      return td;
    };
    const kleurAan = el('input', { type: 'checkbox', 'aria-label': 'kleur gebruiken' }) as HTMLInputElement;
    kleurAan.checked = typeof k.teken?.kleur === 'string';
    const kleur = el('input', { type: 'color', value: typeof k.teken?.kleur === 'string' ? String(k.teken.kleur) : '#c8a27a', 'aria-label': 'kleur' }) as HTMLInputElement;
    const kleurTd = el('td', { class: 'kleurcel' });
    kleurTd.append(kleurAan, kleur);
    const weg = el('button', { type: 'button', class: 'gevaar klein-knop', 'aria-label': 'keuze verwijderen' }, '×') as HTMLButtonElement;
    weg.addEventListener('click', () => {
      tr.remove();
      rijen.splice(rijen.findIndex((r) => r.tr === tr), 1);
    });
    const inputs = {
      label: el('input', { type: 'text', value: k.label, 'aria-label': 'naam keuze' }) as HTMLInputElement,
      prijs: getalInvoer('', k.prijs), prijsPerM: getalInvoer('', k.prijsPerM), pct: getalInvoer('', k.pct),
      stofPct: getalInvoer('', k.stofPct), kost: getalInvoer('', k.kost),
      hoogte: getalInvoer('', typeof k.teken?.hoogte === 'number' ? k.teken.hoogte : undefined),
      vorm: el('input', { type: 'text', value: typeof k.teken?.vorm === 'string' ? String(k.teken.vorm) : '', 'aria-label': 'tekenvorm', list: 'cg-vormen' }) as HTMLInputElement,
      alleenMet: el('input', { type: 'text', value: alleenMetTekst(k), 'aria-label': 'alleen met', placeholder: 'bv. poothoogte: laag' }) as HTMLInputElement,
    };
    tr.append(cel(std), cel(inputs.label), cel(inputs.prijs), cel(inputs.prijsPerM), cel(inputs.pct), cel(inputs.stofPct), cel(inputs.kost), kleurTd, cel(inputs.hoogte), cel(inputs.vorm), cel(inputs.alleenMet), cel(weg));
    (tr as unknown as { lees: () => OptieKeuze }).lees = () => {
      const nk: OptieKeuze = { ...structuredClone(k), label: inputs.label.value.trim() };
      for (const v of ['prijs', 'prijsPerM', 'pct', 'stofPct', 'kost'] as const) {
        const w = num(inputs[v]);
        if (w === undefined || w === 0) delete nk[v];
        else nk[v] = w;
      }
      const teken = { ...(k.teken ?? {}) };
      if (kleurAan.checked) teken.kleur = kleur.value;
      else delete teken.kleur;
      const h = num(inputs.hoogte);
      if (h === undefined) delete teken.hoogte;
      else teken.hoogte = h;
      if (inputs.vorm.value.trim()) teken.vorm = inputs.vorm.value.trim();
      else delete teken.vorm;
      if (Object.keys(teken).length) nk.teken = teken;
      else delete nk.teken;
      const am = leesAlleenMet(inputs.alleenMet.value);
      if (am) nk.alleenMet = am;
      else delete nk.alleenMet;
      return nk;
    };
    tabel.append(tr);
    rijen.push({ k, tr });
  };
  for (const k of g.keuzes) voegRijToe(k);
  const nieuweKeuze = el('button', { type: 'button', class: 'tweede' }, '+ Keuze toevoegen') as HTMLButtonElement;
  nieuweKeuze.addEventListener('click', () => {
    const bestaande = rijen.map((r) => r.k.code);
    voegRijToe({ code: maakCode(`keuze ${rijen.length + 1}`, bestaande), label: '' });
  });
  const vormen = el('datalist', { id: 'cg-vormen' });
  for (const v of ['conisch', 'blok', 'cilinder', 'slede', 'haarspeld', 'plint', 'verdekt', 'draaivoet', 'housse', 'strak', 'rond', 'engels', 'schuin', 'houtblad', 'hout', 'open', 'blad', 'lade', 'klep', 'lader', 'bank', 'afgerond', 'hoekig', 'vierkant', 'kiezel'])
    vormen.append(el('option', { value: v }));

  const knoppen = el('div', { class: 'knoppenrij' });
  const opslaan = el('button', { type: 'submit' }, nieuw ? 'Optiegroep toevoegen' : 'Wijzigingen opslaan') as HTMLButtonElement;
  const sluit = el('button', { type: 'button', class: 'tweede' }, 'Sluiten') as HTMLButtonElement;
  sluit.addEventListener('click', () => {
    f.hidden = true;
    bewerkGroep = null;
    toonGroepLijst();
  });
  knoppen.append(opslaan, sluit);
  const basis = el('div', { class: 'formraster' });
  const pe = el('label', { class: 'inline', for: 'cg-perelement' });
  pe.append(perElement, document.createTextNode(' Prijs per element aanrekenen (bv. poten)'));
  basis.append(veld('Naam', naam), veld('Niveau', niveau), pe);
  const scroll = el('div', { class: 'tabelhouder' });
  scroll.append(tabel);
  f.replaceChildren(
    el('h3', {}, nieuw ? 'Nieuwe optiegroep' : `Bewerk: ${g.label}`),
    basis, typenVak,
    el('h4', {}, 'Keuzes'),
    el('p', { class: 'klein' }, 'Prijzen mag je combineren. Kleur, hoogte en tekenvorm bepalen de tekening (bv. kleur van hout of metaal, poothoogte, vorm van poot of arm). "Alleen met" maakt een combinatieregel, bv. "poothoogte: laag".'),
    scroll, nieuweKeuze, vormen,
    el('ul', { id: 'cg-meldingen', class: 'meldingen' }),
    knoppen,
  );
  f.hidden = false;
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const label = naam.value.trim();
    const keuzes = rijen.map((r) => (r.tr as unknown as { lees: () => OptieKeuze }).lees());
    for (const k of keuzes) if (!k.code) k.code = maakCode(k.label, keuzes.map((x) => x.code));
    const stdCode = (f.querySelector('input[name="cg-standaard"]:checked') as HTMLInputElement | null)?.value ?? keuzes[0]?.code ?? '';
    const voorTypen = [...typenChips.querySelectorAll<HTMLInputElement>('input:checked')].map((x) => x.value);
    const ng: OptieGroep = {
      code: nieuw ? maakCode(label || 'optie', (getCatalogus().opties ?? []).map((x) => x.code)) : bewerkGroep!,
      label,
      niveau: niveau.value as OptieGroep['niveau'],
      standaard: stdCode,
      keuzes,
    };
    if (ng.niveau === 'ontwerp' && perElement.checked) ng.perElement = true;
    if (voorTypen.length) ng.voorTypen = voorTypen;
    const c = structuredClone(getCatalogus());
    c.opties = nieuw ? [...(c.opties ?? []), ng] : (c.opties ?? []).map((x) => (x.code === bewerkGroep ? ng : x));
    const problemen = probeerBewaren(c);
    if (!problemen.length && nieuw) vulGroepFormulier(ng, false);
    toonProblemen($('#cg-meldingen'), problemen, `"${label}" is bewaard. Je vindt de keuzes in "Vrij ontwerp".`);
  };
  toonGroepLijst();
  f.scrollIntoView({ block: 'nearest' });
}

// ================= MODELLEN =================
function toonModellenBeheer() {
  const families = [...new Set(getModellen().map((m) => m.familie))];
  const famSelect = $<HTMLSelectElement>('#cm-familie');
  famSelect.replaceChildren(...families.map((f) => el('option', { value: f }, f)), el('option', { value: '__nieuw' }, 'Nieuwe familie…'));
  const lijst = $('#cm-lijst');
  const eigen = getEigenModellen();
  lijst.replaceChildren(
    ...(eigen.length
      ? eigen.map((m) => {
          const rij = el('li');
          const naam = el('div');
          naam.append(el('strong', {}, m.naam), el('span', { class: 'klein' }, ` · ${m.familie} · ${m.ontwerp.elementen.length} elementen`), el('p', { class: 'klein' }, m.omschrijving));
          const knoppen = el('div', { class: 'knoppenrij' });
          const open = el('button', { type: 'button', class: 'tweede klein-knop' }, 'Openen in ontwerper') as HTMLButtonElement;
          open.addEventListener('click', () => acties.openModel(m.code));
          const overschrijf = el('button', { type: 'button', class: 'tweede klein-knop' }, 'Vervangen door huidig ontwerp') as HTMLButtonElement;
          bevestigKnop(overschrijf, 'Zeker vervangen?', () => {
            const nieuw = eigen.map((x) => (x.code === m.code ? { ...x, ontwerp: { ...acties.huidigOntwerp(), model: m.code } } : x));
            toonProblemen($('#cm-meldingen'), probeerBewaren(getCatalogus(), nieuw), `"${m.naam}" is bijgewerkt.`);
          });
          const weg = el('button', { type: 'button', class: 'gevaar klein-knop' }, 'Verwijder') as HTMLButtonElement;
          bevestigKnop(weg, 'Zeker?', () => toonProblemen($('#cm-meldingen'), probeerBewaren(getCatalogus(), eigen.filter((x) => x.code !== m.code)), `"${m.naam}" is verwijderd.`));
          knoppen.append(open, overschrijf, weg);
          rij.append(naam, knoppen);
          return rij;
        })
      : [el('li', { class: 'klein' }, 'Nog geen eigen modellen. Ontwerp een zetel in "Vrij ontwerp" en bewaar hem hierboven.')]),
  );
}

function bewaarAlsModel(ev: Event) {
  ev.preventDefault();
  const naam = $<HTMLInputElement>('#cm-naam').value.trim();
  const famKeuze = $<HTMLSelectElement>('#cm-familie').value;
  const familie = famKeuze === '__nieuw' ? $<HTMLInputElement>('#cm-nieuwefamilie').value.trim() : famKeuze;
  const omschrijving = $<HTMLTextAreaElement>('#cm-omschrijving').value.trim();
  const fouten: string[] = [];
  if (!naam) fouten.push('Geef het model een naam.');
  if (!familie) fouten.push('Kies of typ een familie.');
  if (getModellen().some((m) => m.naam.toLowerCase() === naam.toLowerCase())) fouten.push(`Er bestaat al een model "${naam}".`);
  const ontwerp = acties.huidigOntwerp();
  if (!ontwerp.elementen.length) fouten.push('Het huidige ontwerp is leeg.');
  if (fouten.length) return toonProblemen($('#cm-meldingen'), fouten);
  const code = maakCode(naam, getModellen().map((m) => m.code));
  const model: ModelDefinitie = { code, naam, familie, omschrijving: omschrijving || 'Eigen model.', bron: 'Eigen model (in deze browser bewaard).', ontwerp: { ...ontwerp, model: code } };
  const problemen = probeerBewaren(getCatalogus(), [...getEigenModellen(), model]);
  toonProblemen($('#cm-meldingen'), problemen, `"${naam}" is bewaard. Je vindt het bij Modellen, familie "${familie}".`);
  if (!problemen.length) ($('#cm-form') as HTMLFormElement).reset();
}

// ================= DELEN =================
function startDelen() {
  $('#cd-kopieer').addEventListener('click', () =>
    void kopieer(JSON.stringify({ catalogus: getCatalogus(), modellen: getEigenModellen() }, null, 2), $('#cd-melding')),
  );
  $('#cd-inlezen').addEventListener('click', () => {
    const melding = $('#cd-melding');
    try {
      const data = JSON.parse($<HTMLTextAreaElement>('#cd-plak').value) as { catalogus?: OntwerpCatalogus; modellen?: ModelDefinitie[] };
      if (!data.catalogus || !Array.isArray(data.catalogus.typen)) throw new Error('Geen catalogus gevonden in de geplakte tekst.');
      const problemen = probeerBewaren(data.catalogus, Array.isArray(data.modellen) ? data.modellen : []);
      melding.textContent = problemen.length ? `Niet ingelezen: ${problemen.slice(0, 3).join(' ')}${problemen.length > 3 ? ' …' : ''}` : 'Catalogus ingelezen.';
    } catch (e) {
      melding.textContent = e instanceof SyntaxError ? 'Dit is geen geldige JSON.' : (e as Error).message;
    }
  });
  bevestigKnop($<HTMLButtonElement>('#cd-herstel'), 'Klik nogmaals: eigen elementen en opties gaan verloren', () => {
    herstelCatalogus();
    $('#cd-melding').textContent = 'Standaardcatalogus hersteld (eigen modellen blijven bewaard).';
  });
}

// ================= START =================
export function startCatalogusEditor(a: Acties) {
  acties = a;
  const tabs = document.querySelectorAll<HTMLButtonElement>('[data-cat]');
  tabs.forEach((b) =>
    b.addEventListener('click', () => {
      tabs.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      for (const deel of ['elementen', 'opties', 'modellen', 'delen']) $(`#cat-${deel}`).hidden = deel !== b.dataset.cat;
    }),
  );
  $('#cat-nieuw-type').addEventListener('click', () => vulTypeFormulier(leegType(), true));
  $('#cat-nieuwe-groep').addEventListener('click', () =>
    vulGroepFormulier({ code: '', label: '', niveau: 'ontwerp', standaard: 'geen', keuzes: [{ code: 'geen', label: 'Geen' }, { code: 'ja', label: 'Ja', prijs: 50 }] }, true),
  );
  $('#cm-familie').addEventListener('change', () => ($('#cm-nieuwefamilie-veld').hidden = $<HTMLSelectElement>('#cm-familie').value !== '__nieuw'));
  $('#cm-form').addEventListener('submit', bewaarAlsModel);
  startDelen();
  opWijziging('catalogus', () => {
    toonTypeLijst();
    toonGroepLijst();
    toonModellenBeheer();
  });
  toonTypeLijst();
  toonGroepLijst();
  toonModellenBeheer();
  void getal;
}
