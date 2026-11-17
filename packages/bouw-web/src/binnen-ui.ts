/**
 * Binnenafwerking op het scherm (ronde 12): een sfeer voor de hele woning in één tik (onder de 3D, naast de stijlen, en
 * in de kaart *Binnenafwerking* naast de plattegrond), en per ruimte plafond, plint en accentmuur (in het paneel van de
 * ruimte en in het keuzepaneel als je de ruimte in de 3D aantikt). De gegevens: `core/src/binnenafwerking.ts` en
 * `core/voorbeelden/sferen.ts`.
 */
import { planCatalogus as cat } from '../../core/voorbeelden/inrichting.js';
import { accentVoorstel, pasSfeerToe, sfeerCatalogus, sfeerVan, type Sfeer } from '../../core/voorbeelden/sferen.js';
import { binnenKant, murenVan, muurVanOpening, niveauPlan, niveauVan, openingenVanRuimte, plintAfwerking, RUIMTE_KANTEN, type BlokSoort, type GevelKant, type Ruimte } from '../../core/src/index.js';
import { el, keuzelijst } from './hulp.js';
import { toestand, wijzig } from './staat.js';

/** Een kleur een beetje donkerder of lichter (f < 1 donkerder). */
function tint(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1)))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Het staal van een sfeer: een hoek van een kamer (plafond, wanden, plint en vloer), getekend uit de catalogus. Parket
 * met planken, tegels met voegen, een houten plafond met latten: zo zie je in één oogopslag wat de sfeer doet.
 */
export function sfeerBeeld(s: Sfeer): string {
  const k = s.gewoon;
  const vloer = cat.vloeren[k.vloer], wand = cat.wanden[k.wand], plafond = cat.plafonds?.[k.plafond];
  const plint = k.plint ? plintAfwerking(cat, { id: '', naam: '', type: 'leefruimte', x: 0, y: 0, b: 1, d: 1, vloer: k.vloer, wand: k.wand, plint: k.plint }) : undefined;
  const w = wand?.kleur ?? '#eeeeea', v = vloer?.kleur ?? '#cfccc4', p = plafond?.kleur ?? '#f4f3ef';
  const lijnen: string[] = [];
  if (vloer?.soort === 'parket') for (const x of [-6, 10, 26, 42, 58, 74, 90]) lijnen.push(`<line x1="${14 + (x - 14) * 0.79}" y1="36" x2="${x}" y2="52" stroke="${tint(v, 0.82)}" stroke-width=".8"/>`);
  if (vloer?.soort === 'tegel') {
    for (const x of [-12, 15, 40, 65, 92]) lijnen.push(`<line x1="${14 + (x - 14) * 0.79}" y1="36" x2="${x}" y2="52" stroke="${tint(v, 0.88)}" stroke-width=".7"/>`);
    lijnen.push(`<line x1="7" y1="44" x2="73" y2="44" stroke="${tint(v, 0.88)}" stroke-width=".7"/>`);
  }
  if (plafond?.soort === 'planken_h') for (const y of [3, 6]) lijnen.push(`<line x1="${(y / 9) * 14}" y1="${y}" x2="${80 - (y / 9) * 14}" y2="${y}" stroke="${tint(p, 0.8)}" stroke-width=".7"/>`);
  if (plafond?.spots) for (const x of [28, 40, 52]) lijnen.push(`<circle cx="${x}" cy="5" r="1.3" fill="#fffbea" stroke="#9a9a96" stroke-width=".4"/>`);
  const pl = plint ? `<polygon points="14,34.4 66,34.4 66,36 14,36" fill="${plint.kleur}"/><polygon points="0,49.5 14,34.4 14,36 0,52" fill="${tint(plint.kleur, 0.9)}"/><polygon points="80,49.5 66,34.4 66,36 80,52" fill="${tint(plint.kleur, 0.95)}"/>` : '';
  return `<svg viewBox="0 0 80 52" width="80" height="52" aria-hidden="true">
<polygon points="0,0 80,0 66,9 14,9" fill="${p}"/>
<polygon points="0,0 14,9 14,36 0,52" fill="${tint(w, 0.9)}"/><polygon points="80,0 66,9 66,36 80,52" fill="${tint(w, 0.95)}"/>
<rect x="14" y="9" width="52" height="27" fill="${w}"/>
<polygon points="14,36 66,36 80,52 0,52" fill="${v}"/>${lijnen.join('')}${pl}
<path d="M0,0 L14,9 L66,9 L80,0 M14,9 L14,36 M66,9 L66,36" fill="none" stroke="rgba(0,0,0,.12)" stroke-width=".6"/>
</svg>`;
}

/** Zet de aanduiding van de sfeer die er staat op alle sfeerknoppen (onder de 3D en in de kaart). */
export function toonSferen() {
  const nu = sfeerVan(toestand().plan);
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-sfeer]')) b.setAttribute('aria-pressed', String(b.dataset.sfeer === nu));
}

/** Rij met de sferen voor binnen: één tik zet vloer, wand, plafond en plint in alle ruimtes. */
export function sfeerRij(): HTMLElement {
  const rij = el('div', { class: 'stijlrij sfeerrij', role: 'group', 'aria-label': 'Sfeer binnen' });
  const nu = sfeerVan(toestand().plan);
  for (const [code, s] of Object.entries(sfeerCatalogus)) {
    const b = el('button', { type: 'button', class: 'stijlknop sfeerknop', 'data-sfeer': code, title: s.uitleg, 'aria-pressed': String(code === nu) });
    const beeld = el('span', { class: 'sfeerbeeld' });
    beeld.innerHTML = sfeerBeeld(s);
    b.append(beeld, el('span', {}, s.label));
    b.addEventListener('click', () => {
      wijzig('plan', (t) => { t.plan = pasSfeerToe(t.plan, s); });
      toonSferen();
    });
    rij.append(b);
  }
  return rij;
}

/** De kaart *Binnenafwerking* naast de plattegrond: de sferen, en waar je de rest per ruimte kiest. */
export function binnenKaart(vak: HTMLElement) {
  vak.replaceChildren(
    el('h3', {}, 'Binnenafwerking'),
    el('p', { class: 'klein' }, 'Eén tik: vloer, wanden, plafond en plint in alle ruimtes.'),
    sfeerRij(),
    el('p', { class: 'klein' }, 'Per ruimte (plafond, plint, accentmuur): tik op de ruimte.'),
  );
}

/** Een staal als achtergrond: effen, met latten (houten plafond), met spots, of met voegen (tegels). */
function staalAchtergrond(soort: BlokSoort, kleur: string, spots = false): string {
  if (spots) return `radial-gradient(circle at 35% 40%, #fffbea 0 2.5px, #9a9a96 3px, transparent 3.5px), radial-gradient(circle at 68% 62%, #fffbea 0 2.5px, #9a9a96 3px, transparent 3.5px), ${kleur}`;
  if (soort === 'planken_h' || soort === 'hout' || soort === 'parket') return `repeating-linear-gradient(0deg, ${kleur} 0 6px, ${tint(kleur, 0.8)} 6px 7px)`;
  if (soort === 'tegel') return `repeating-linear-gradient(90deg, transparent 0 13px, ${tint(kleur, 0.85)} 13px 14px), repeating-linear-gradient(0deg, ${kleur} 0 13px, ${tint(kleur, 0.85)} 13px 14px)`;
  if (soort === 'steen') return `repeating-linear-gradient(0deg, ${kleur} 0 5px, #d8d2c6 5px 6px)`;
  if (soort === 'metaal') return `linear-gradient(135deg, ${tint(kleur, 1.5)}, ${kleur})`;
  return kleur;
}

function staal(label: string, soort: BlokSoort, kleur: string, gekozen: boolean, kies: () => void, data: Record<string, string>, spots = false): HTMLButtonElement {
  const b = el('button', { type: 'button', class: 'gv-kleur', title: label, 'aria-label': label, 'aria-pressed': String(gekozen), ...data }) as HTMLButtonElement;
  b.style.background = staalAchtergrond(soort, kleur, spots);
  b.addEventListener('click', kies);
  return b;
}

const KANT_WOORD: Record<GevelKant, string> = { boven: 'boven', onder: 'onder', links: 'links', rechts: 'rechts' };

/**
 * Wat er aan elke kant van de ruimte is (voor de knoppen van de accentmuur): de ruimte ernaast, of "gevel", met een
 * raam of deur erbij. Alleen de kanten waar een muur van de ruimte staat.
 */
function kantenVan(r: Ruimte): Map<GevelKant, string> {
  const plan = toestand().plan, p = niveauPlan(plan, niveauVan(r));
  const muren = murenVan(p);
  const uit = new Map<GevelKant, string>();
  const naam = (id?: string) => plan.ruimtes.find((x) => x.id === id)?.naam;
  const openingen = openingenVanRuimte(plan, r, muren);
  for (const k of RUIMTE_KANTEN) {
    const eigen = muren.filter((m) => binnenKant(m, r.id) === k);
    if (!eigen.length) continue;
    const buren = [...new Set(eigen.map((m) => naam(m.plus === r.id ? m.min : m.plus)).filter((x): x is string => !!x))];
    const glas = openingen.some((o) => o.soort !== 'binnendeur' && o.soort !== 'doorgang' && eigen.includes(muurVanOpening(o, muren)!));
    const tekst = buren.length ? (buren.length > 1 ? `${buren[0]} …` : buren[0]!) : 'Gevel';
    uit.set(k, `${tekst}${glas ? ' · raam' : ''}`);
  }
  return uit;
}

/**
 * Plafond, plint en accentmuur van een ruimte. `stalen`: als ronde stalen (het keuzepaneel van de 3D), anders als
 * keuzelijsten (het paneel naast de plattegrond, zoals vloer en wanden daar). `kant`: de muur die in de 3D van binnen
 * aangetikt werd (dan eerst: deze muur als accentmuur). `vanBinnen`: de knop *Bekijk van binnen* (het plafond).
 */
export function binnenKeuzes(vak: HTMLElement, id: string, opties: { stalen?: boolean; kant?: GevelKant; vanBinnen?: () => void } = {}) {
  const r = toestand().plan.ruimtes.find((x) => x.id === id);
  if (!r || r.bestaand === true) return;
  const zet = (f: (x: Ruimte) => void) => wijzig('plan', (t) => { const x = t.plan.ruimtes.find((y) => y.id === id); if (x) f(x); });
  const plafond = r.plafond ? cat.plafonds?.[r.plafond] : undefined, plint = r.plint ? cat.plinten?.[r.plint] : undefined;
  const accent = r.accent ? cat.wanden[r.accent.wand] : undefined;
  const blok = el('div', { class: 'binnenkeuzes' });

  // De muur die je in de 3D van binnen aantikte: meteen haar afwerking als accentmuur.
  if (opties.kant) {
    const k = opties.kant, isAccent = r.accent?.kant === k;
    const rij = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Deze muur' });
    for (const [code, w] of Object.entries(cat.wanden)) {
      const nu = isAccent ? r.accent!.wand === code : r.wand === code;
      rij.append(staal(w.label, w.soort, w.kleur, nu, () => zet((x) => { if (code === x.wand) { if (x.accent?.kant === k) delete x.accent; } else x.accent = { kant: k, wand: code }; }), { 'data-muur-wand': code }));
    }
    blok.append(el('p', { class: 'klein' }, `Deze muur (${KANT_WOORD[k]} op het plan): ${((isAccent ? accent?.label : cat.wanden[r.wand]?.label) ?? '').toLowerCase()}${isAccent ? ' (accentmuur)' : ''}`), rij);
  }

  if (opties.stalen) {
    const rijP = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Plafond' });
    for (const [code, p] of Object.entries(cat.plafonds ?? {})) rijP.append(staal(p.label, p.soort, p.kleur, r.plafond === code, () => zet((x) => { x.plafond = code; }), { 'data-plafond': code }, !!p.spots));
    const rijL = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Plint' });
    const geen = el('button', { type: 'button', class: 'gv-kleur geen-staal', title: 'Geen plint', 'aria-label': 'Geen plint', 'aria-pressed': String(!r.plint), 'data-plint': 'geen' }, '×');
    geen.addEventListener('click', () => zet((x) => { delete x.plint; }));
    rijL.append(geen);
    for (const [code, p] of Object.entries(cat.plinten ?? {})) {
      const a = plintAfwerking(cat, { ...r, plint: code })!;
      rijL.append(staal(p.label, a.soort, a.kleur, r.plint === code, () => zet((x) => { x.plint = code; }), { 'data-plint': code }));
    }
    blok.append(
      el('p', { class: 'klein' }, `Plafond: ${(plafond?.label ?? 'nog niet gekozen').toLowerCase()}`), rijP,
      el('p', { class: 'klein' }, `Plint: ${(plint?.label ?? 'geen').toLowerCase()}`), rijL,
    );
  } else {
    const rij = (label: string, inhoud: HTMLElement) => { const l = el('label', { class: 'eig' }); l.append(el('span', {}, label), inhoud); return l; };
    blok.append(
      rij('Plafond', keuzelijst('pl-plafond', [['', '(nog niet gekozen)'], ...Object.entries(cat.plafonds ?? {}).map(([k, v]): [string, string] => [k, v.label])], r.plafond ?? '', (w) => zet((x) => { if (w) x.plafond = w; else delete x.plafond; }))),
      rij('Plint', keuzelijst('pl-plint', [['', 'Geen plint'], ...Object.entries(cat.plinten ?? {}).map(([k, v]): [string, string] => [k, v.label])], r.plint ?? '', (w) => zet((x) => { if (w) x.plint = w; else delete x.plint; }))),
    );
  }

  // Accentmuur: een kruis met de vier kanten van de ruimte (wat erachter ligt staat erop); een tik zet of haalt ze weg.
  const kanten = kantenVan(r);
  const kruis = el('div', { class: 'accentkruis', role: 'group', 'aria-label': 'Accentmuur: welke kant?' });
  for (const k of RUIMTE_KANTEN) {
    const tekst = kanten.get(k);
    if (!tekst) continue;
    const b = el('button', { type: 'button', class: `accentkant kant-${k}`, 'data-accent-kant': k, 'aria-pressed': String(r.accent?.kant === k), title: `Muur ${KANT_WOORD[k]} op het plan` }, tekst);
    b.addEventListener('click', () => zet((x) => {
      if (x.accent?.kant === k) delete x.accent;
      else x.accent = { kant: k, wand: x.accent?.wand ?? accentVoorstel(toestand().plan, x) };
    }));
    kruis.append(b);
  }
  kruis.append(el('span', { class: 'accentruimte' }, r.naam));
  blok.append(el('p', { class: 'klein' }, r.accent ? `Accentmuur (${KANT_WOORD[r.accent.kant]}): ${(accent?.label ?? r.accent.wand).toLowerCase()}. Nog een tik op die kant: weg.` : 'Accentmuur: tik op een kant.'), kruis);
  if (r.accent) {
    const rij = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Afwerking van de accentmuur' });
    if (opties.stalen) {
      for (const [code, w] of Object.entries(cat.wanden)) if (code !== r.wand) rij.append(staal(w.label, w.soort, w.kleur, r.accent.wand === code, () => zet((x) => { if (x.accent) x.accent.wand = code; }), { 'data-accent-wand': code }));
      blok.append(rij);
    } else {
      const l = el('label', { class: 'eig' });
      l.append(el('span', {}, 'Afwerking'), keuzelijst('pl-accent', Object.entries(cat.wanden).filter(([k]) => k !== r.wand).map(([k, v]): [string, string] => [k, v.label]), r.accent.wand, (w) => zet((x) => { if (x.accent) x.accent.wand = w; })));
      blok.append(l);
    }
  }
  if (opties.vanBinnen) {
    const b = el('button', { type: 'button', class: 'tweede', 'data-van-binnen': id }, 'Bekijk van binnen (met het plafond)');
    b.addEventListener('click', opties.vanBinnen);
    const rij = el('div', { class: 'knoppenrij' });
    rij.append(b);
    blok.append(rij);
  }
  vak.append(blok);
}
