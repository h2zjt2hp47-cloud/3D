/**
 * Tik op het ding zelf in de 3D van de woning: alleen de keuzes van dat ding verschijnen, in een paneel vlak onder de 3D.
 * De 3D zegt bij een tik welk ding het is (code `<ding>.<blok>`, zie `Plan3DOpties.dingen` in de motor):
 *   dak                     vorm, bedekking en kleur, aantal lichtkoepels
 *   gevel:<ruimte>:<kant>   materiaal en kleur, voor dit muurvlak, deze gevel of de hele woning
 *   opening:<id>            kleur van het schrijnwerk en zonwering (raam, deur) of kleur (poort); de rest in de configurator
 *   ruimte:<id>             vloer en wandkleur
 *   meubel:<id>             draaien of verwijderen
 *   wand:<id>               een losse wand (ronde 2d): hoogte, afwerking of gevelmateriaal, verwijderen
 *   strook:<id>             een strook op de gevel (ronde 14): materiaal en kleur, maten in de gevel, verwijderen
 *   toestel:<id>, leiding:<id>  techniek (ronde 10b, alleen met de techniek aan): hoogte of ligging, verwijderen (techniek-ui.ts)
 * Ook hier: de stijlen (één tik zet het hele ontwerp in een stijl) en een variant maken (een kopie om te vergelijken).
 */
import { gevelCatalogus, gevelOntwerpVan, planCatalogus as cat } from '../../core/voorbeelden/inrichting.js';
import { RAL_KLEUREN } from '../../core/voorbeelden/raam.js';
import { pasStijlToe, raamInStijl, stijlCatalogus, type Stijl } from '../../core/voorbeelden/stijlen.js';
import { losseWandRuimte, murenVan, niveauPlan, strookPlaats, verfGevel, verwijderStrook, vlakSleutel, zetTegenBuren, type GevelKant, type GevelStrook, type LosseWand, type VerfBereik } from '../../core/src/index.js';
import { bedekkingKeuze, dakVormKnoppen, koepelTeller, metDak, zetDak } from './dak-ui.js';
import { gevelStaal } from './gevel-ui.js';
import { el, schakelaar } from './hulp.js';
import { postDetail, postenVoorDing } from './werken-ui.js';
import { stijlBeeld } from './snelstart-ui.js';
import { actiefProject, dupliceerProject, positieVan, toestand, wijzig, type Toestand } from './staat.js';
import { familie } from './meegeven.js';
import { techniekDingKeuzes, techniekTitel } from './techniek-ui.js';
import { verlichtingBijDing } from './verlichting-ui.js';

/** Is dit een ding dat je kan aantikken? Andere namen (binnenmuur, terras, schaduw) geven geen keuzes. */
export const isDing = (id: string | null | undefined): id is string => !!id && /^(dak$|gevel:|opening:|ruimte:|meubel:|wand:|toestel:|leiding:|strook:)/.test(id);

/** Kleuren voor het schrijnwerk die in één tik te kiezen zijn; de hele waaier staat in de configurator. */
const SNELLE_KLEUREN = ['wit', 'creme', 'ral7035', 'ral7022', 'antraciet', 'zwart'];
const ZONWERING: [string, string][] = [['geen', 'Geen'], ['screen', 'Screen'], ['rolluik', 'Rolluik']];

let gevelBereik: VerfBereik = 'vlak';

function tabs(label: string, opties: [string, string][], nu: string, kies: (w: string) => void, data: string): HTMLElement {
  const rij = el('div', { class: 'tabs', role: 'group', 'aria-label': label });
  for (const [w, l] of opties) {
    const b = el('button', { type: 'button', 'aria-pressed': String(w === nu), [`data-${data}`]: w }, l);
    b.addEventListener('click', () => kies(w));
    rij.append(b);
  }
  return rij;
}

function staalKnop(hex: string, label: string, gekozen: boolean, kies: () => void, data: Record<string, string> = {}): HTMLButtonElement {
  const b = el('button', { type: 'button', class: 'gv-kleur', title: label, 'aria-label': label, 'aria-pressed': String(gekozen), ...data }) as HTMLButtonElement;
  b.style.background = hex;
  b.addEventListener('click', kies);
  return b;
}

function dakKeuzes(vak: HTMLElement) {
  const dak = toestand().plan.dak;
  vak.append(dakVormKnoppen());
  if (dak) vak.append(bedekkingKeuze(dak.vorm === 'plat' ? 'plat' : 'hellend', dak.bedekking, (b) => zetDak((d) => { d.bedekking = b; })));
  else vak.append(el('p', { class: 'klein' }, 'Kies een dakvorm.'));
  const teller = koepelTeller();
  if (teller) vak.append(teller);
  vak.append(el('p', { class: 'klein' }, 'Helling, richting en oversteek: in de kaart Dak naast de plattegrond.'));
}

function gevelKeuzes(vak: HTMLElement, sleutel: string) {
  const [ruimte, kant] = sleutel.split(':') as [string, GevelKant];
  const plan = toestand().plan;
  // Ronde 11: een muurvlak tegen de buren is een bestaande scheidingsmuur (niet gebouwd, neutraal, de buren erachter).
  const buren = plan.tegenBuren?.includes(sleutel) === true;
  const burenKnop = () => schakelaar('Tegen de buren (de scheidingsmuur bestaat al)', buren, (aan) => wijzig('plan', (t) => zetTegenBuren(t.plan, sleutel, aan)), { 'data-tegen-buren': sleutel });
  if (plan.ruimtes.find((r) => r.id === ruimte)?.bestaand === true) {
    // Een gevel van een bestaande ruimte blijft zoals ze is: geen materiaal kiezen (het zou niets veranderen).
    vak.append(bestaandUitleg(ruimte), burenKnop());
    return;
  }
  if (buren) {
    vak.append(burenKnop(), el('p', { class: 'klein' }, 'Niet gebouwd: geen gevelmateriaal, niet in de meetstaat of de constructie. In de 3D neutraal, met de buren erachter.'));
    return;
  }
  const ontwerp = plan.gevelOntwerp ?? gevelOntwerpVan(plan);
  const nu = ontwerp.vlakken?.[sleutel] ?? ontwerp.standaard;
  const niveau = plan.ruimtes.find((r) => r.id === ruimte)?.niveau ?? 0;
  const verf = (materiaal: string, kleur: string) => wijzig('plan', (t) => {
    t.plan.gevelOntwerp ??= gevelOntwerpVan(t.plan);
    if (t.meta.regels.gevel === undefined) t.meta.regels.gevel = true;
    const m = gevelCatalogus[materiaal];
    const voeg = m?.voegen ? (nu.materiaal === materiaal && nu.voeg ? nu.voeg : Object.keys(m.voegen)[0]) : undefined;
    const keuze = { materiaal, kleur, ...(voeg ? { voeg } : {}) };
    // Een schuine gevel: "deze gevel" = alle muurvlakken die in die richting kijken (op elke verdieping).
    if (gevelBereik === 'gevel' && kant.startsWith('s')) {
      for (const n of new Set(t.plan.ruimtes.map((r) => r.niveau ?? 0))) {
        for (const m of murenVan(niveauPlan(t.plan, n))) if (m.soort === 'buiten' && vlakSleutel(m).endsWith(`:${kant}`)) verfGevel(t.plan, keuze, 'vlak', { sleutel: vlakSleutel(m) });
      }
    } else verfGevel(t.plan, keuze, gevelBereik, { sleutel, kant, niveau });
  });
  vak.append(tabs('Wat verf je?', [['vlak', 'Dit muurvlak'], ['gevel', 'Deze gevel'], ['woning', 'Hele woning']], gevelBereik, (w) => {
    gevelBereik = w as VerfBereik;
    for (const b of vak.querySelectorAll<HTMLButtonElement>('[data-gevel-bereik]')) b.setAttribute('aria-pressed', String(b.dataset.gevelBereik === w));
  }, 'gevel-bereik'));
  const tegels = el('div', { class: 'gv-tegels keuze-tegels' });
  for (const [code, m] of Object.entries(gevelCatalogus)) {
    const kleur = code === nu.materiaal ? nu.kleur : Object.keys(m.kleuren)[0]!;
    const b = el('button', { type: 'button', class: 'gv-tegel', 'aria-pressed': String(code === nu.materiaal), 'data-gevel-materiaal': code, title: m.uitleg ?? m.label });
    const s = el('span', { class: 'gv-staal' });
    s.innerHTML = gevelStaal(code, kleur, nu.voeg);
    b.append(s, el('span', {}, m.label));
    b.addEventListener('click', () => verf(code, m.kleuren[nu.kleur] ? nu.kleur : kleur));
    tegels.append(b);
  }
  vak.append(tegels);
  const mat = gevelCatalogus[nu.materiaal];
  if (mat) {
    const rij = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Kleur' });
    for (const [code, k] of Object.entries(mat.kleuren)) rij.append(staalKnop(k.hex, k.label, code === nu.kleur, () => verf(nu.materiaal, code), { 'data-gevel-kleur': code }));
    vak.append(el('p', { class: 'klein' }, `Kleur: ${(mat.kleuren[nu.kleur]?.label ?? nu.kleur).toLowerCase()}`), rij);
  }
  vak.append(burenKnop());
}

function openingKeuzes(vak: HTMLElement, id: string, naarPositie: (id: string) => void) {
  const o = toestand().plan.openingen.find((x) => x.id === id);
  const p = o && positieVan(o);
  if (!p) return;
  const zet = (f: (k: Record<string, unknown>) => void) => wijzig('positie', (t) => { const x = t.posities.find((y) => y.id === p.id); if (x) f(x.keuzes as Record<string, unknown>); });
  const kleurCode = p.model === 'POORT' ? 'kleur' : 'kleur_buiten';
  const rij = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Kleur' });
  for (const code of SNELLE_KLEUREN) {
    const k = RAL_KLEUREN.find((x) => x.code === code);
    if (k) rij.append(staalKnop(k.hex, `${k.naam} (RAL ${k.ral})`, p.keuzes[kleurCode] === code, () => zet((x) => { x[kleurCode] = code; }), { 'data-raam-kleur': code }));
  }
  const huidig = RAL_KLEUREN.find((x) => x.code === p.keuzes[kleurCode]);
  vak.append(el('p', { class: 'klein' }, `Kleur${p.model === 'POORT' ? '' : ' buiten'}: ${huidig ? `${huidig.naam.toLowerCase()} (RAL ${huidig.ral})` : String(p.keuzes[kleurCode] ?? '')}`), rij);
  if (p.model === 'RAAM') {
    vak.append(el('p', { class: 'klein' }, 'Zonwering'), tabs('Zonwering', ZONWERING, String(p.keuzes.zonwering ?? 'geen'), (w) => zet((x) => {
      x.zonwering = w;
      // Een screen is hoogstens 5 m breed: op een bredere partij meteen twee (of drie) screens naast elkaar (ronde 11b).
      const b = Number(x.breedte) || 0;
      if (w === 'screen' && b > 5000 && (x.screens ?? 's1') === 's1') x.screens = b > 10000 ? 's3' : 's2';
    }), 'zonwering'));
  }
  const alles = el('button', { type: 'button', class: 'tweede' }, 'Alle keuzes: indeling, maat, glas …');
  alles.addEventListener('click', () => naarPositie(p.id));
  vak.append(el('div', { class: 'knoppenrij' }));
  vak.lastElementChild!.append(alles);
}

/** Ronde 11: wat bestaat, blijft; een korte uitleg en de schakelaar om het toch als nieuw werk te tellen. */
function bestaandUitleg(id: string): HTMLElement {
  const blok = el('div');
  blok.append(
    el('p', { class: 'klein' }, 'Bestaat al en blijft: neutraal in de 3D, niet in de meetstaat, de constructie of het overzicht.'),
    schakelaar('Bestaand (blijft)', true, (aan) => wijzig('plan', (t) => { const x = t.plan.ruimtes.find((y) => y.id === id); if (x) { if (aan) x.bestaand = true; else delete x.bestaand; } }), { 'data-ruimte-bestaand': id }),
  );
  return blok;
}

function ruimteKeuzes(vak: HTMLElement, id: string) {
  const r = toestand().plan.ruimtes.find((x) => x.id === id);
  if (!r) return;
  if (r.bestaand === true) { vak.append(bestaandUitleg(id)); return; }
  const zet = (f: (x: NonNullable<typeof r>) => void) => wijzig('plan', (t) => { const x = t.plan.ruimtes.find((y) => y.id === id); if (x) f(x); });
  const vloer = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Vloer' });
  for (const [code, v] of Object.entries(cat.vloeren)) vloer.append(staalKnop(v.kleur, v.label, r.vloer === code, () => zet((x) => { x.vloer = code; }), { 'data-vloer': code }));
  const wand = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Wanden' });
  for (const [code, w] of Object.entries(cat.wanden)) wand.append(staalKnop(w.kleur, w.label, r.wand === code, () => zet((x) => { x.wand = code; }), { 'data-wand': code }));
  vak.append(el('p', { class: 'klein' }, `Vloer: ${(cat.vloeren[r.vloer]?.label ?? r.vloer).toLowerCase()}`), vloer, el('p', { class: 'klein' }, `Wanden: ${(cat.wanden[r.wand]?.label ?? r.wand).toLowerCase()}`), wand);
}

function meubelKeuzes(vak: HTMLElement, id: string, nadien: () => void) {
  const m = toestand().plan.meubels.find((x) => x.id === id);
  if (!m) return;
  const rij = el('div', { class: 'knoppenrij' });
  const draai = el('button', { type: 'button', class: 'tweede' }, 'Draaien 90°');
  draai.addEventListener('click', () => wijzig('plan', (t) => {
    const x = t.plan.meubels.find((y) => y.id === id);
    if (!x) return;
    const cx = x.x + (x.rotatie % 180 ? x.d : x.b) / 2, cy = x.y + (x.rotatie % 180 ? x.b : x.d) / 2;
    x.rotatie = ((x.rotatie + 90) % 360) as typeof x.rotatie;
    const [b, d] = x.rotatie % 180 ? [x.d, x.b] : [x.b, x.d];
    x.x = Math.round(cx - b / 2);
    x.y = Math.round(cy - d / 2);
  }));
  const weg = el('button', { type: 'button', class: 'gevaar' }, 'Verwijderen');
  weg.addEventListener('click', () => { wijzig('plan', (t) => { t.plan.meubels = t.plan.meubels.filter((y) => y.id !== id); }); nadien(); });
  rij.append(draai, weg);
  vak.append(rij);
}

/** Een losse wand (ronde 2d): hoe hoog, in welke afwerking (binnen) of welk gevelmateriaal (buiten); of weg. */
function wandKeuzes(vak: HTMLElement, id: string, nadien: () => void) {
  const plan = toestand().plan;
  const w = plan.losseWanden?.find((x) => x.id === id);
  if (!w) return;
  const binnen = losseWandRuimte(plan, w);
  const zet = (f: (x: LosseWand) => void) => wijzig('plan', (t) => { const x = t.plan.losseWanden?.find((y) => y.id === id); if (x) f(x); });
  const hoogtes: [string, string][] = binnen ? [['vol', 'Tot het plafond'], ['110', '110 cm'], ['90', '90 cm']] : [['100', '100 cm'], ['180', '180 cm'], ['200', '200 cm']];
  const nu = w.hoogte === undefined ? 'vol' : String(w.hoogte);
  vak.append(el('p', { class: 'klein' }, `Hoogte: ${w.hoogte === undefined ? 'tot het plafond' : `${w.hoogte} cm`}`),
    tabs('Hoogte', hoogtes, nu, (k) => zet((x) => { if (k === 'vol') delete x.hoogte; else x.hoogte = Number(k); }), 'wand-hoogte'));
  if (binnen) {
    const rij = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Afwerking' });
    const code = w.wand ?? binnen.wand;
    for (const [c, a] of Object.entries(cat.wanden)) rij.append(staalKnop(a.kleur, a.label, c === code, () => zet((x) => { if (c === binnen.wand) delete x.wand; else x.wand = c; }), { 'data-wand-afwerking': c }));
    vak.append(el('p', { class: 'klein' }, `Afwerking: ${(cat.wanden[code]?.label ?? code).toLowerCase()}${w.wand ? '' : ' (zoals de ruimte)'}`), rij);
  } else {
    const nu2 = w.gevel ?? plan.gevelOntwerp?.standaard ?? gevelOntwerpVan(plan).standaard;
    const tegels = el('div', { class: 'gv-tegels keuze-tegels' });
    for (const [code, m] of Object.entries(gevelCatalogus)) {
      const kleur = code === nu2.materiaal ? nu2.kleur : Object.keys(m.kleuren)[0]!;
      const b = el('button', { type: 'button', class: 'gv-tegel', 'aria-pressed': String(code === nu2.materiaal), 'data-wand-materiaal': code, title: m.uitleg ?? m.label });
      const s = el('span', { class: 'gv-staal' });
      s.innerHTML = gevelStaal(code, kleur, nu2.voeg);
      b.append(s, el('span', {}, m.label));
      b.addEventListener('click', () => zet((x) => { x.gevel = { materiaal: code, kleur, ...(m.voegen ? { voeg: nu2.voeg && m.voegen[nu2.voeg] ? nu2.voeg : Object.keys(m.voegen)[0]! } : {}) }; }));
      tegels.append(b);
    }
    vak.append(tegels);
    const mat = gevelCatalogus[nu2.materiaal];
    if (mat) {
      const rij = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Kleur' });
      for (const [code, k] of Object.entries(mat.kleuren)) rij.append(staalKnop(k.hex, k.label, code === nu2.kleur, () => zet((x) => { x.gevel = { ...nu2, kleur: code }; }), { 'data-wand-kleur': code }));
      vak.append(el('p', { class: 'klein' }, `Kleur: ${(mat.kleuren[nu2.kleur]?.label ?? nu2.kleur).toLowerCase()}`), rij);
    }
  }
  const knoppen = el('div', { class: 'knoppenrij' });
  const weg = el('button', { type: 'button', class: 'gevaar' }, 'Verwijderen');
  weg.addEventListener('click', () => {
    wijzig('plan', (t) => {
      t.plan.losseWanden = t.plan.losseWanden?.filter((y) => y.id !== id);
      if (!t.plan.losseWanden?.length) delete t.plan.losseWanden;
    });
    nadien();
  });
  knoppen.append(weg);
  vak.append(el('p', { class: 'klein' }, 'Lengte en plaats: in de plattegrond (tik op de wand of haar maat).'), knoppen);
}

/** Een strook op de gevel (ronde 14): materiaal en kleur, waar ze ligt; de maten in de gevel-editor; of weg. */
function strookKeuzes(vak: HTMLElement, id: string, nadien: () => void, naarGevel?: (id: string) => void) {
  const plan = toestand().plan;
  const s = plan.gevelOntwerp?.stroken?.find((x) => x.id === id);
  if (!s) return;
  const zet = (f: (x: GevelStrook) => void) => wijzig('plan', (t) => { const x = t.plan.gevelOntwerp?.stroken?.find((y) => y.id === id); if (x) f(x); });
  vak.append(el('p', { class: 'klein' }, `${strookPlaats(plan, s).replace(/^./, (c) => c.toUpperCase())}.`));
  const tegels = el('div', { class: 'gv-tegels keuze-tegels' });
  for (const [code, m] of Object.entries(gevelCatalogus)) {
    const kleur = code === s.materiaal ? s.kleur : m.kleuren[s.kleur] ? s.kleur : Object.keys(m.kleuren)[0]!;
    const b = el('button', { type: 'button', class: 'gv-tegel', 'aria-pressed': String(code === s.materiaal), 'data-strook-materiaal': code, title: m.uitleg ?? m.label });
    const st = el('span', { class: 'gv-staal' });
    st.innerHTML = gevelStaal(code, kleur, s.voeg);
    b.append(st, el('span', {}, m.label));
    b.addEventListener('click', () => zet((x) => {
      x.materiaal = code;
      x.kleur = kleur;
      if (m.voegen) x.voeg = x.voeg && m.voegen[x.voeg] ? x.voeg : Object.keys(m.voegen)[0]!; else delete x.voeg;
    }));
    tegels.append(b);
  }
  vak.append(tegels);
  const mat = gevelCatalogus[s.materiaal];
  if (mat) {
    const rij = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Kleur' });
    for (const [code, k] of Object.entries(mat.kleuren)) rij.append(staalKnop(k.hex, k.label, code === s.kleur, () => zet((x) => { x.kleur = code; }), { 'data-strook-kleur': code }));
    vak.append(el('p', { class: 'klein' }, `Kleur: ${(mat.kleuren[s.kleur]?.label ?? s.kleur).toLowerCase()}`), rij);
  }
  const knoppen = el('div', { class: 'knoppenrij' });
  if (naarGevel) {
    const maten = el('button', { type: 'button', class: 'tweede', 'data-strook-gevel': id }, 'Maten in de gevel');
    maten.addEventListener('click', () => naarGevel(id));
    knoppen.append(maten);
  }
  const weg = el('button', { type: 'button', class: 'gevaar', 'data-strook-weg': id }, 'Verwijderen');
  weg.addEventListener('click', () => { wijzig('plan', (t) => verwijderStrook(t.plan, id)); nadien(); });
  knoppen.append(weg);
  vak.append(knoppen);
}

/** Titel van een ding, in gewone taal. */
function titel(ding: string): string {
  const t = toestand();
  if (ding === 'dak') return 'Dak';
  const [soort, id = '', kant] = ding.split(':');
  const kanten: Record<string, string> = { boven: 'bovenkant', onder: 'onderkant', links: 'linkerkant', rechts: 'rechterkant' };
  if (soort === 'gevel') return `Gevel · ${t.plan.ruimtes.find((r) => r.id === id)?.naam ?? ''} (${kant?.startsWith('s') ? 'schuine gevel' : `${kanten[kant ?? ''] ?? kant} van het plan`})`;
  if (soort === 'opening') { const o = t.plan.openingen.find((x) => x.id === id); const p = o && positieVan(o); return p ? `${p.code} · ${p.naam}` : 'Opening'; }
  if (soort === 'ruimte') return t.plan.ruimtes.find((r) => r.id === id)?.naam ?? 'Ruimte';
  if (soort === 'meubel') { const m = t.plan.meubels.find((x) => x.id === id); return cat.meubels[m?.type ?? '']?.label ?? 'Meubel'; }
  if (soort === 'wand') {
    const w = t.plan.losseWanden?.find((x) => x.id === id);
    if (!w) return '';
    const r = losseWandRuimte(t.plan, w);
    return r ? `Losse wand · ${r.naam}` : 'Losse muur buiten';
  }
  if (soort === 'toestel' || soort === 'leiding') return techniekTitel(ding);
  if (soort === 'strook') {
    const s = t.plan.gevelOntwerp?.stroken?.find((x) => x.id === id);
    return s ? `Strook op de gevel · ${gevelCatalogus[s.materiaal]?.label ?? s.materiaal}` : '';
  }
  return '';
}

/**
 * Vult het paneel met de keuzes van een ding (of verbergt het). `sluit` haalt de keuze weg (ook de aanduiding in de 3D),
 * `naarPositie` opent de configurator voor alle keuzes van een raam.
 */
export function toonDing(vak: HTMLElement, ding: string | null, nav: { sluit: () => void; naarPositie: (id: string) => void; metMaten?: (muurId: string) => void; naarGevel?: (strook: string) => void }) {
  const naam = ding ? titel(ding) : '';
  if (!ding || !naam) { vak.hidden = true; vak.replaceChildren(); return; }
  vak.hidden = false;
  const kop = el('div', { class: 'kaartkop' });
  const sluit = el('button', { type: 'button', class: 'tweede', 'aria-label': 'Keuzes sluiten' }, 'Sluiten');
  sluit.addEventListener('click', nav.sluit);
  kop.append(el('h3', {}, naam), sluit);
  vak.replaceChildren(kop);
  const [soort, id = ''] = ding.split(':');
  if (ding === 'dak') dakKeuzes(vak);
  else if (soort === 'gevel') {
    gevelKeuzes(vak, ding.slice('gevel:'.length));
    // Een aanbouw of bijgebouw tegen deze gevel, met de maten in cm (paneel Ruimte met maten in de plattegrond).
    const sleutel = ding.slice('gevel:'.length), plan = toestand().plan;
    const niveau = plan.ruimtes.find((r) => r.id === id)?.niveau ?? 0;
    const muur = murenVan(niveauPlan(plan, niveau)).find((m) => m.soort === 'buiten' && vlakSleutel(m) === sleutel);
    if (muur && nav.metMaten) {
      const b = el('button', { type: 'button', class: 'tweede', 'data-ding-maten': '' }, 'Aanbouw tegen deze gevel, met maten …');
      b.addEventListener('click', () => nav.metMaten!(muur.id));
      vak.append(b);
    }
  }
  else if (soort === 'opening') openingKeuzes(vak, id, nav.naarPositie);
  else if (soort === 'ruimte') ruimteKeuzes(vak, id);
  else if (soort === 'meubel') meubelKeuzes(vak, id, nav.sluit);
  else if (soort === 'wand') wandKeuzes(vak, id, nav.sluit);
  else if (soort === 'toestel' || soort === 'leiding') techniekDingKeuzes(vak, ding, nav);
  else if (soort === 'strook') strookKeuzes(vak, id, nav.sluit, nav.naarGevel);
  // Ronde 15b: verlichting in één tik (gevel, deur naar buiten, ruimte), bovenaan onder de titel.
  verlichtingBijDing(vak, ding);
  dingPosten(vak, ding);
}

/**
 * Ronde 11: de posten van het werk waar dit ding bij hoort, onderaan het keuzepaneel, elk dicht tot je hem openklapt.
 * Pas ingevuld nadat het paneel er staat (de posten rekenen de constructie uit): zo blijft het paneel even snel.
 */
function dingPosten(vak: HTMLElement, ding: string) {
  const blok = el('div', { class: 'dingposten', 'data-ding-posten': ding });
  vak.append(blok);
  setTimeout(() => {
    if (!blok.isConnected) return;
    const posten = postenVoorDing(ding);
    if (!posten.length) { blok.remove(); return; }
    blok.append(el('p', { class: 'klein' }, posten.length === 1 ? 'Hoort bij de post:' : `Hoort bij ${posten.length} posten:`));
    for (const p of posten) blok.append(postDetail(p, { toon3D: false }));
  }, 0);
}

// ---------- stijlen en varianten ----------

/** Zet het hele ontwerp in een stijl: gevel, dak, vloer en wand (plan), schrijnwerk van de ramen en deuren, kleur van een poort. */
export function zetStijl(t: Toestand, s: Stijl) {
  t.plan = pasStijlToe(t.plan, s);
  metDak(t);
  if (t.meta.regels.gevel === undefined) t.meta.regels.gevel = true;
  for (const p of t.posities) {
    if (p.aantal === 0) continue; // bestaand (blijft): niet herschilderen
    if (p.model === 'RAAM') p.keuzes = raamInStijl(p.keuzes, s);
    if (p.model === 'POORT') p.keuzes = { ...p.keuzes, kleur: s.poort };
    if (p.model === 'AANBOUW') p.keuzes = { ...p.keuzes, ...s.aanbouw };
  }
}

/** Rij met de stijlen als kleine beelden: één tik zet het ontwerp in die stijl. */
export function stijlRij(): HTMLElement {
  const rij = el('div', { class: 'stijlrij', role: 'group', 'aria-label': 'Stijl' });
  for (const [code, s] of Object.entries(stijlCatalogus)) {
    const b = el('button', { type: 'button', class: 'stijlknop', 'data-stijl': code, title: s.uitleg });
    const beeld = el('span', { class: 'snel-stijlbeeld' });
    beeld.innerHTML = stijlBeeld(s);
    b.append(beeld, el('span', {}, s.label));
    b.addEventListener('click', () => wijzig('plan', (t) => {
      zetStijl(t, s);
      // De naam uit de snelstart ("Woning 9 × 10 m, klassiek") volgt de stijl (doorloop A24); een eigen naam blijft zoals hij is.
      const naam = t.meta.project ?? '', nieuw = s.label.toLowerCase();
      const oud = Object.values(stijlCatalogus).map((x) => x.label.toLowerCase()).find((l) => naam.includes(`, ${l}`));
      if (oud && oud !== nieuw) t.meta.project = naam.replace(`, ${oud}`, `, ${nieuw}`);
    }));
    rij.append(b);
  }
  return rij;
}

/**
 * Twee keer snel tikken op *Variant maken* gaf twee gelijke varianten (doorloop B18). Een tik binnen anderhalve seconde na
 * de vorige variant, terwijl die nog openstaat, maakt er geen nieuwe: hij geeft de naam van de variant die er al is.
 */
let laatsteVariant: { tijd: number; id: string; naam: string } | undefined;

/** Een variant: een kopie van het project om iets anders te proberen; het origineel blijft in Projecten. */
export function maakVariant(): string {
  if (laatsteVariant && performance.now() - laatsteVariant.tijd < 1500 && actiefProject() === laatsteVariant.id) return laatsteVariant.naam;
  const naam = nieuweVariant();
  laatsteVariant = { tijd: performance.now(), id: actiefProject(), naam };
  return naam;
}

function nieuweVariant(): string {
  const t = toestand();
  const basis = (t.meta.project || 'Ontwerp').replace(/ \(variant \d+\)$/, '');
  // Het volgende nummer in de reeks (ook als je vanuit het origineel een tweede variant maakt), en één groep voor allemaal.
  const nr = Math.max(1, ...familie().map((v) => Number(/ \(variant (\d+)\)$/.exec(v.naam)?.[1] ?? 1))) + 1;
  const groep = t.meta.variantGroep ?? actiefProject();
  if (!t.meta.variantGroep) wijzig('meta', (x) => { x.meta.variantGroep = groep; }, { zonderOngedaan: true });
  dupliceerProject(actiefProject());
  const naam = `${basis} (variant ${nr})`;
  wijzig('meta', (x) => { x.meta.project = naam; x.meta.variantGroep = groep; }, { zonderOngedaan: true });
  return naam;
}
