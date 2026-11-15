/**
 * Dak van de woning: de kaart "Dak" naast de plattegrond en de 3D (vorm, helling, richting, oversteek, bedekking en
 * kleur), en wat de plattegrond-editor nodig heeft voor lichtkoepels en lichtstraten.
 * De keuzes zijn gegevens in het plan (`plan.dak`, `plan.daklichten`); de 3D, de gevels en de controles volgen vanzelf.
 */
import { dakOpbouw, standaardDak, type DakBedekking, type DakKeuze, type DakVorm, type GevelKant, type PlanSvgOpties } from '../../core/src/index.js';
import { dakCatalogus, daklichtCatalogus } from '../../core/voorbeelden/inrichting.js';
import { el, getal, getalVeld, keuzelijst } from './hulp.js';
import { toestand, wijzig, type Toestand } from './staat.js';

/** Codes van de daklichten die een lichtstraat zijn (voor de tekening). */
export const LICHTSTRATEN = new Set(Object.entries(daklichtCatalogus).filter(([, t]) => t.vorm === 'lichtstraat').map(([code]) => code));

const VORMEN: { code: DakVorm | 'geen'; label: string; titel: string }[] = [
  { code: 'geen', label: 'Geen', titel: 'Zoals vroeger: geen dak op de bovenste verdieping' },
  { code: 'plat', label: 'Plat', titel: 'Plat dak met dakrand; hier kunnen lichtkoepels in' },
  { code: 'lessenaar', label: 'Lessenaar', titel: 'Eén schuin dakvlak, van een hoge naar een lage gevel' },
  { code: 'zadel', label: 'Zadel', titel: 'Twee dakvlakken met een nok, en twee topgevels' },
];
const KANT: Record<GevelKant, string> = { boven: 'de bovenkant van het plan', onder: 'de onderkant van het plan', links: 'de linkerkant van het plan', rechts: 'de rechterkant van het plan' };

/** De laatste bedekking van een hellend dak, zodat ze terugkomt als je even naar plat schakelt. */
let laatsteHellend: DakBedekking | undefined;

/** Zorgt dat het plan een dakkeuze heeft en dat het dak in de offerte meetelt (zoals de gevel-editor doet voor de gevel). */
export function metDak(t: Toestand): DakKeuze {
  t.plan.dak ??= standaardDak();
  if (t.meta.regels.dak === undefined) t.meta.regels.dak = true;
  return t.plan.dak;
}

function kiesVorm(vorm: DakVorm | 'geen') {
  wijzig('plan', (t) => {
    if (vorm === 'geen') { delete t.plan.dak; return; }
    const d = metDak(t);
    const wasHellend = d.vorm !== 'plat', wordtHellend = vorm !== 'plat';
    if (wasHellend && !wordtHellend) {
      laatsteHellend = d.bedekking;
      d.bedekking = d.plat ?? standaardDak().bedekking;
      delete d.plat;
    }
    if (!wasHellend && wordtHellend) {
      d.plat = d.bedekking;
      d.bedekking = laatsteHellend ?? { materiaal: 'pannen', kleur: 'antraciet' };
    }
    d.vorm = vorm;
  });
}

const zet = (f: (d: DakKeuze) => void) => wijzig('plan', (t) => f(metDak(t)));

/** Tegels met de bedekkingen die bij de dakvorm passen, en eronder de kleuren van de gekozen bedekking. */
function bedekkingKeuze(voor: 'plat' | 'hellend', nu: DakBedekking, kies: (b: DakBedekking) => void): HTMLElement {
  const vak = el('div');
  const tegels = el('div', { class: 'gv-tegels' });
  for (const [code, m] of Object.entries(dakCatalogus).filter(([, m]) => m.voor === voor)) {
    const kleur = code === nu.materiaal ? (m.kleuren[nu.kleur] ?? Object.values(m.kleuren)[0]!) : Object.values(m.kleuren)[0]!;
    const b = el('button', { type: 'button', class: 'gv-tegel', 'data-dak-materiaal': code, 'aria-pressed': String(code === nu.materiaal), title: m.uitleg ?? m.label });
    const staal = el('span', { class: 'dak-staal' });
    staal.style.background = kleur.hex;
    b.append(staal, el('span', {}, m.label));
    b.addEventListener('click', () => kies({ materiaal: code, kleur: m.kleuren[nu.kleur] ? nu.kleur : Object.keys(m.kleuren)[0]! }));
    tegels.append(b);
  }
  vak.append(tegels);
  const mat = dakCatalogus[nu.materiaal];
  if (mat && Object.keys(mat.kleuren).length > 1) {
    const rij = el('div', { class: 'gv-rij', role: 'group', 'aria-label': 'Kleur van de bedekking' });
    for (const [code, k] of Object.entries(mat.kleuren)) {
      const b = el('button', { type: 'button', class: 'gv-kleur', 'data-dak-kleur': code, 'aria-pressed': String(code === nu.kleur), title: k.label, 'aria-label': k.label });
      b.style.background = k.hex;
      b.addEventListener('click', () => kies({ materiaal: nu.materiaal, kleur: code }));
      rij.append(b);
    }
    vak.append(el('p', { class: 'klein' }, `Kleur: ${(mat.kleuren[nu.kleur] ?? Object.values(mat.kleuren)[0]!).label.toLowerCase()}`), rij);
  }
  return vak;
}

/** De kaart "Dak": tekent zichzelf opnieuw na elke wijziging. */
export function toonDak() {
  const vak = document.getElementById('pl-dak');
  if (!vak) return;
  const plan = toestand().plan;
  const dak = plan.dak;
  const opbouw = dakOpbouw(plan);
  const kop = el('div', { class: 'kaartkop' });
  const samenvatting = !dak ? 'niet gekozen' : opbouw?.hellend ? `${dak.vorm === 'zadel' ? 'zadeldak' : 'lessenaarsdak'} ${opbouw.hellend.helling}°` : 'plat dak';
  kop.append(el('h2', {}, 'Dak'), el('span', { class: 'klein' }, samenvatting));
  const vormen = el('div', { class: 'tabs', role: 'group', 'aria-label': 'Dakvorm' });
  for (const v of VORMEN) {
    const b = el('button', { type: 'button', 'data-dak-vorm': v.code, 'aria-pressed': String((dak?.vorm ?? 'geen') === v.code), title: v.titel }, v.label);
    b.addEventListener('click', () => kiesVorm(v.code));
    vormen.append(b);
  }
  vak.replaceChildren(kop, vormen);
  if (!dak) {
    vak.append(el('p', { class: 'klein' }, plan.daklichten?.length
      ? 'Er liggen lichtkoepels in het plan: het dak is plat, met EPDM. Kies een vorm om de bedekking te bepalen.'
      : 'Kies een dakvorm. Zonder keuze blijft de bovenste verdieping in 3D open, zoals vroeger.'));
    return;
  }
  const rij = (label: string, inhoud: HTMLElement) => { const l = el('label', { class: 'eig' }); l.append(el('span', {}, label), inhoud); return l; };
  if (dak.vorm !== 'plat') {
    const maten = el('div', { class: 'maten' });
    maten.append(
      getalVeld('Helling', dak.helling, (w) => zet((d) => { d.helling = Math.min(60, Math.max(5, Math.round(w))); }), { min: 5, max: 60, stap: 1, eenheid: '°' }),
      getalVeld('Oversteek', dak.oversteek, (w) => zet((d) => { d.oversteek = Math.min(120, Math.max(0, Math.round(w))); }), { min: 0, max: 120, stap: 5, eenheid: 'cm' }),
    );
    vak.append(maten);
    if (dak.vorm === 'lessenaar') {
      vak.append(rij('Loopt af naar', keuzelijst('dak-richting', (Object.keys(KANT) as GevelKant[]).map((k) => [k, KANT[k]]), dak.richting, (w) => zet((d) => { d.richting = w as GevelKant; }))));
    } else {
      const nu = dak.richting === 'boven' || dak.richting === 'onder' ? 'onder' : 'rechts';
      vak.append(rij('Nok', keuzelijst('dak-richting', [['onder', 'van links naar rechts op het plan'], ['rechts', 'van boven naar onder op het plan']], nu, (w) => zet((d) => { d.richting = w as GevelKant; }))));
    }
  }
  vak.append(el('p', { class: 'klein' }, dak.vorm === 'plat' ? 'Bedekking' : 'Bedekking van het hellende dak'));
  vak.append(bedekkingKeuze(dak.vorm === 'plat' ? 'plat' : 'hellend', dak.bedekking, (b) => zet((d) => { d.bedekking = b; })));
  // Naast een hellend dak liggen vaak nog platte delen (een lager dak, of alles als het hellende dak niet kan).
  if (dak.vorm !== 'plat' && opbouw?.plat.length) {
    const nu = opbouw.platBedekking;
    const combinaties = Object.entries(dakCatalogus).filter(([, m]) => m.voor === 'plat')
      .flatMap(([code, m]) => Object.entries(m.kleuren).map(([k, kleur]): [string, string] => [`${code}:${k}`, `${m.label}, ${kleur.label.toLowerCase()}`]));
    vak.append(rij('Platte delen', keuzelijst('dak-plat', combinaties, `${nu.materiaal}:${nu.kleur}`, (w) => zet((d) => { const [materiaal, kleur] = w.split(':'); d.plat = { materiaal: materiaal!, kleur: kleur! }; }))));
  }
  if (opbouw?.terugval) vak.append(el('p', { class: 'melding' }, opbouw.terugval));
  if (opbouw) {
    const dl = el('dl', { class: 'detail' });
    const regels: [string, string][] = [];
    if (opbouw.hellend) {
      regels.push(['Hellend dak', `${getal(opbouw.m2Hellend, 1)} m² (langs de helling, met oversteek)`]);
      regels.push(['Nok', `${getal(opbouw.hellend.nok)} cm boven de dakvoet`]);
    }
    if (opbouw.m2Plat > 0) regels.push(['Plat dak', `${getal(opbouw.m2Plat, 1)} m² · dakrand ${getal(opbouw.mDakrand, 1)} m`]);
    const lichten = opbouw.daklichten.filter((l) => !l.reden).length;
    regels.push(['Daklichten', lichten ? `${lichten} ${lichten === 1 ? 'stuk' : 'stuks'}` : 'geen (gereedschap Lichtkoepel)']);
    for (const [a, b] of regels) dl.append(el('dt', {}, a), el('dd', {}, b));
    vak.append(dl);
  }
}

/** Lijnen van het hellende dak voor de plattegrond van een verdieping: de rand met de oversteek en de nok. */
export function dakLijnen(niveau: number): PlanSvgOpties['dakLijnen'] {
  const o = dakOpbouw(toestand().plan);
  const d = o?.hellend;
  if (!o || !d || niveau !== o.top) return undefined;
  const pa = d.p0 - d.oversteek, pb = d.p1 + d.oversteek, qa = d.q0 - d.oversteek, qb = d.q1 + d.oversteek;
  const langsX = d.nokAs === 'x';
  return {
    omtrek: langsX ? { x: qa, y: pa, b: qb - qa, d: pb - pa } : { x: pa, y: qa, b: pb - pa, d: qb - qa },
    nok: langsX ? { x1: qa, y1: d.nokP, x2: qb, y2: d.nokP } : { x1: d.nokP, y1: qa, x2: d.nokP, y2: qb },
    tekst: d.vorm === 'zadel' ? 'nok' : 'hoge kant',
  };
}

/** Is er iets te tonen met de schakelaar "Dak tonen" in de 3D? */
export const heeftDak = () => !!dakOpbouw(toestand().plan);
