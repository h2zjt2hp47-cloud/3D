/**
 * Positie bewerken: formulier uit het productmodel (raam/deur of aanbouw), met controles,
 * prijs, technische gegevens, inbegrepen/niet inbegrepen, bestellijst, vooraanzicht en 3D.
 */
import { tekenSvg, type ConfiguratieResultaat, type Kenmerk } from '../../core/src/index.js';
import { bouwAanbouw3D } from '../../core/voorbeelden/aanbouw3d.js';
import { ruitenVan } from '../../core/voorbeelden/raam.js';
import { raamScene } from '../../core/voorbeelden/raam3d.js';
import { maak3D, type Viewer3D } from '../../demo-web/src/drie-d.js';
import { $, el, eur, getal, kopieer, num } from './hulp.js';
import { bewaarInBibliotheek, klantKorting, MODELLEN, openingVan, resultaat, toestand, wijzig, type Positie } from './staat.js';

type Toestand = 'ok' | 'let-op' | 'fout';
export interface Controle { titel: string; toestand: Toestand; waarde?: string; uitleg?: string }

let huidigId: string | undefined;
let weergave: 'voor' | '3d' = 'voor';
let viewer: Viewer3D | null | undefined;
let naarPlan: (openingId: string) => void = () => {};
let naarOfferte: () => void = () => {};

const huidig = (): Positie | undefined => toestand().posities.find((p) => p.id === huidigId) ?? toestand().posities[0];

function eigenschap(p: Positie, kenmerk: string, naam: string): unknown {
  const k = MODELLEN[p.model].model.kenmerken.find((x) => x.code === kenmerk);
  if (!k || k.type !== 'keuze') return undefined;
  return k.keuzes.find((kz) => kz.code === p.keuzes[kenmerk])?.eigenschappen?.[naam];
}
function keuzeLabel(p: Positie, kenmerk: string): string {
  const k = MODELLEN[p.model].model.kenmerken.find((x) => x.code === kenmerk);
  if (!k || k.type !== 'keuze') return '';
  return k.keuzes.find((kz) => kz.code === p.keuzes[kenmerk])?.label ?? '';
}

// ---------- controles per model ----------
export function controles(p: Positie, r: ConfiguratieResultaat): Controle[] {
  return p.model === 'AANBOUW' ? aanbouwControles(p, r) : raamControles(p, r);
}

function raamControles(p: Positie, r: ConfiguratieResultaat): Controle[] {
  const a = r.afgeleid;
  const uit: Controle[] = [];
  const type = String(p.keuzes.type);
  const n = num(a.n), vb = num(a.vb), vh = num(a.vh), kg = num(a.vleugel_kg), uw = num(a.uw);
  if (type === 'raam' || type === 'terrasdeur') {
    for (let i = 1; i <= n; i++) {
      const op = String(a[`op${i}`]);
      const maxb = num(eigenschap(p, `vak${i}`, 'maxb')), maxh = num(eigenschap(p, `vak${i}`, 'maxh'));
      if (op === 'vast') continue;
      const ok = vb <= maxb && vh <= maxh;
      uit.push({ titel: `Vak ${i}: maat binnen de grens van het beslag`, toestand: ok ? 'ok' : 'fout', waarde: `${getal(vb)} × ${getal(vh)} / max ${getal(maxb)} × ${getal(maxh)} mm` });
    }
  }
  if (num(a.beweeg) > 0 || type === 'voordeur') {
    const max = type === 'schuif' ? 250 : 130;
    uit.push({ titel: 'Gewicht zwaarste vleugel', toestand: kg > max ? 'fout' : kg > max * 0.85 ? 'let-op' : 'ok', waarde: `${getal(kg)} / max ${max} kg` });
  }
  if (a.veilig_nodig === true && num(a.glas_m2) > 0) {
    const veilig = eigenschap(p, 'glas', 'veilig') === true;
    uit.push({ titel: 'Veiligheidsglas (deur of glas lager dan 85 cm)', toestand: veilig ? 'ok' : 'fout', waarde: veilig ? 'gelaagd' : 'niet gelaagd', uitleg: 'NBN S 23-002 (te bevestigen per project).' });
  }
  if (num(p.keuzes.verdieping) > 0 && (num(a.borst) < 850 || a.type_deur === true || type !== 'raam')) {
    uit.push({ titel: 'Valbeveiliging (verdieping)', toestand: 'let-op', waarde: `borstwering ${getal(num(a.borst) / 10)} cm`, uitleg: 'Balustrade of vast onderdeel nodig (te bevestigen).' });
  }
  uit.push({ titel: 'Isolatie (EPB)', toestand: uw <= 1.5 ? 'ok' : 'let-op', waarde: `Uw ${getal(uw, 2)} W/m²K`, uitleg: `Richtwaarde Uw ≤ 1,5 (te verifiëren). Afstandhouder ψ ${getal(num(a.psi), 2)}.` });
  if (a.heeft_stijl === true) {
    const nodig = num(a.i_nodig), aanwezig = num(a.i_aanwezig);
    const benut = aanwezig > 0 ? nodig / aanwezig : 9;
    const wat = type === 'schuif' ? 'Ontmoetingsstijlen schuifraam' : num(a.stijl_l) > 0 ? 'Tussenstijl' : 'Regel onder het bovenlicht';
    uit.push({
      titel: `Statiek: ${wat.toLowerCase()}`, toestand: benut > 1 ? 'fout' : benut > 0.85 ? 'let-op' : 'ok',
      waarde: `nodig ${getal(nodig, 1)} · aanwezig ${getal(aanwezig, 1)} cm⁴ (${getal(benut * 100)} %)`,
      uitleg: `Winddruk ${getal(num(p.keuzes.winddruk))} Pa, overspanning ${getal(Math.max(num(a.stijl_l), num(a.regel_l)))} mm, doorbuiging ≤ L/${p.keuzes.doorbuiging === 'b' ? 200 : 300}. ${benut > 1 ? 'Kies een versterkte tussenstijl of een koppelprofiel.' : ''} Voordimensionering, te laten bevestigen.`,
    });
  }
  if (eigenschap(p, 'ruimte', 'droog') === true && type !== 'voordeur') {
    uit.push({ titel: 'Ventilatie droge ruimte', toestand: p.keuzes.rooster === true ? 'ok' : 'let-op', waarde: p.keuzes.rooster === true ? 'rooster' : 'geen rooster', uitleg: 'Systeem C: luchttoevoer via een rooster (EPB, te bevestigen).' });
  }
  if (p.keuzes.ruimte === 'badkamer' || p.keuzes.ruimte === 'wc') {
    const mat = eigenschap(p, 'glas', 'mat') === true;
    uit.push({ titel: 'Privacy', toestand: mat ? 'ok' : 'let-op', waarde: mat ? 'mat glas' : 'helder glas' });
  }
  if (p.keuzes.rc2 === true) uit.push({ titel: 'Inbraakwerend RC2', toestand: eigenschap(p, 'glas', 'veilig') === true || num(a.glas_m2) === 0 ? 'ok' : 'fout', waarde: 'beslag + gelaagd glas' });
  return uit;
}

function aanbouwControles(p: Positie, r: ConfiguratieResultaat): Controle[] {
  const a = r.afgeleid;
  const uit: Controle[] = [];
  const muren = a.muren === true;
  const maxb = num(eigenschap(p, 'raamtype', 'maxb')), maxh = num(eigenschap(p, 'raamtype', 'maxh')), maxkg = num(eigenschap(p, 'raamtype', 'maxkg'));
  const vb = num(a.vleugel_b), rh = num(a.raam_h), kg = num(a.vleugel_kg), uw = num(a.uw);
  uit.push({ titel: 'Vleugelbreedte binnen systeemgrens', toestand: vb <= maxb ? 'ok' : 'fout', waarde: `${getal(vb)} / max ${getal(maxb)} mm` });
  uit.push({ titel: 'Hoogte binnen systeemgrens', toestand: rh <= maxh ? 'ok' : 'fout', waarde: `${getal(rh)} / max ${getal(maxh)} mm` });
  uit.push({ titel: 'Gewicht per vleugel', toestand: kg <= maxkg ? (kg > maxkg * 0.85 ? 'let-op' : 'ok') : 'fout', waarde: `${getal(kg)} / max ${getal(maxkg)} kg` });
  const veilig = eigenschap(p, 'glas', 'veilig') === true;
  uit.push({ titel: 'Veiligheidsglas (glas tot op de vloer)', toestand: veilig ? 'ok' : 'fout', waarde: veilig ? 'gelaagd' : 'niet gelaagd', uitleg: 'NBN S 23-002 (te bevestigen per project).' });
  uit.push({ titel: 'Isolatie raampartij (EPB)', toestand: uw <= 1.5 ? 'ok' : 'let-op', waarde: `Uw ${getal(uw, 2)} W/m²K` });
  if (p.keuzes.inmeting === true) {
    const afw = num(a.meet_afwijking);
    uit.push({ titel: 'Inmeting op de werf', toestand: afw > 10 ? 'let-op' : 'ok', waarde: `verschil ${getal(afw)} mm`, uitleg: `Bestelmaat: ${getal(num(a.raam_b))} × ${getal(rh)} mm.` });
  } else uit.push({ titel: 'Inmeting op de werf', toestand: 'let-op', waarde: 'nog niet gebeurd', uitleg: 'Prijs onder voorbehoud van inmeting.' });
  if (muren && num(a.opening_b) > 3000) uit.push({ titel: 'Stalen ligger', toestand: 'let-op', waarde: `${getal(num(a.ligger_lm), 2)} m`, uitleg: 'Stabiliteitsberekening laten maken.' });
  if (muren) uit.push({ titel: 'Vergunning', toestand: num(a.dak_m2) > 40 ? 'let-op' : 'ok', waarde: `${getal(num(a.dak_m2), 1)} m²` });
  return uit;
}

export function techniek(p: Positie, r: ConfiguratieResultaat): [string, string][] {
  const a = r.afgeleid;
  if (p.model === 'AANBOUW') {
    return [
      ['Raampartij (b × h)', `${getal(num(a.raam_b))} × ${getal(num(a.raam_h))} mm`],
      ['Vleugels', `${getal(num(a.n))} × ${getal(num(a.vleugel_b))} mm`],
      ['Gewicht per vleugel', `${getal(num(a.vleugel_kg))} kg`],
      ['Glasoppervlakte', `${getal(num(a.glas_m2), 2)} m²`],
      ['Uw raampartij', `${getal(num(a.uw), 2)} W/m²K`],
      ['Levertermijn', `± ${getal(num(a.levertermijn))} weken`],
    ];
  }
  const t: [string, string][] = [
    ['Maat (b × h)', `${getal(num(p.keuzes.breedte))} × ${getal(num(p.keuzes.hoogte))} mm`],
    ['Vakken', `${getal(num(a.n))} × ${getal(num(a.vb))} mm breed`],
    ['Opendraaiende vleugels', getal(num(a.beweeg))],
    ['Glas per vak', `${getal(num(a.gb))} × ${getal(num(a.gh))} mm`],
    ['Glasoppervlakte', `${getal(num(a.glas_m2), 2)} m²`],
    ['Gewicht zwaarste vleugel', `${getal(num(a.vleugel_kg))} kg`],
    ['Ug glas / Uf profiel', `${getal(num(eigenschap(p, 'glas', 'ug')), 1)} / ${getal(num(eigenschap(p, 'profiel', 'uf')), 1)} W/m²K`],
    ['Uw', `${getal(num(a.uw), 2)} W/m²K (ψ ${getal(num(a.psi), 2)})`],
    ['Glasmaat per vak', `${getal(num(a.glasmaat_b))} × ${getal(num(a.glasmaat_h))} mm`],
    ['Levertermijn', `± ${getal(num(a.levertermijn))} weken`],
  ];
  if (a.heeft_stijl === true) t.push(['Statiek tussenstijl', `${getal(num(a.i_nodig), 1)} / ${getal(num(a.i_aanwezig), 1)} cm⁴ (nodig / aanwezig)`]);
  if (num(a.zon_kast) > 0) t.push(['Zonweringskast', `${getal(num(a.zon_kast))} mm boven het raam`]);
  return t;
}

export function inbegrepen(p: Positie, r: ConfiguratieResultaat): { wel: string[]; niet: string[] } {
  const wel = r.stuklijst.map((s) => s.omschrijving);
  const niet: string[] = [];
  if (p.keuzes.montage !== true) niet.push('Plaatsing');
  if (p.model === 'RAAM') {
    if (p.keuzes.situatie === 'renovatie' && p.keuzes.afwerking !== true) niet.push('Afwerking dagkanten binnen');
    if (p.keuzes.zonwering === 'geen') niet.push('Zonwering');
    niet.push('Elektrische aansluiting zonwering (elektricien)', 'Schilderwerk en silicone binnen');
  } else {
    if (p.keuzes.afbraak !== true) niet.push('Uitbraak en afvoer');
    niet.push('Architect, stabiliteit en EPB-verslag', 'Binnenafwerking, elektriciteit, verwarming');
  }
  return { wel, niet };
}

function offertetekst(p: Positie, r: ConfiguratieResultaat): string {
  const ib = inbegrepen(p, r);
  return [
    `${p.code} ${p.naam} (${p.aantal} st.)`,
    ...r.samenvatting.map((s) => `- ${s}`),
    '', 'Inbegrepen:', ...ib.wel.map((x) => `- ${x}`),
    '', 'Niet inbegrepen:', ...ib.niet.map((x) => `- ${x}`),
    '', `Prijs: ${eur(r.prijs.brutoprijsExcl)} per stuk excl. btw`,
  ].join('\n');
}

// ---------- formulier ----------
const velden = new Map<string, { veld: HTMLElement; fout: HTMLElement; update: (r: ConfiguratieResultaat) => void }>();

function bouwFormulier(p: Positie) {
  const form = $('#p-formulier');
  form.replaceChildren();
  velden.clear();
  const model = MODELLEN[p.model].model;
  model.stappen.forEach((stap, n) => {
    const sectie = el('section', { class: 'stap', 'aria-labelledby': `pst-${stap.code}`, 'data-stap': stap.code });
    const kop = el('h2', { id: `pst-${stap.code}` });
    kop.append(el('span', { class: 'stapnr' }, String(n + 1)), document.createTextNode(stap.label));
    sectie.append(kop);
    for (const k of model.kenmerken.filter((k) => k.stap === stap.code)) sectie.append(bouwVeld(p, k));
    form.append(sectie);
  });
}

function zet(code: string, w: unknown) {
  wijzig('positie', (t) => {
    const p = t.posities.find((x) => x.id === huidigId);
    if (p) p.keuzes[code] = w as never;
  });
}

function bouwVeld(p: Positie, k: Kenmerk): HTMLElement {
  const veld = el('div', { class: `veld veld-${k.type}`, 'data-kenmerk': k.code });
  const id = `pk-${k.code}`;
  const fout = el('p', { class: 'veldfout', role: 'alert' });
  let update: (r: ConfiguratieResultaat) => void = () => {};
  if (k.type === 'getal') {
    const rij = el('div', { class: 'getalrij' });
    const schuif = el('input', { type: 'range', 'aria-label': `${k.label} (schuifbalk)`, step: String(k.stapgrootte ?? 1) }) as HTMLInputElement;
    const invoer = el('input', { type: 'number', id, inputmode: 'numeric', step: String(k.stapgrootte ?? 1) }) as HTMLInputElement;
    const bereik = el('span', { class: 'bereik' });
    invoer.value = String(p.keuzes[k.code] ?? '');
    invoer.addEventListener('change', () => zet(k.code, invoer.value === '' ? null : Number(invoer.value)));
    schuif.addEventListener('input', () => { invoer.value = schuif.value; });
    schuif.addEventListener('change', () => zet(k.code, Number(schuif.value)));
    rij.append(schuif, invoer, el('span', { class: 'eenheid' }, k.eenheid ?? ''));
    veld.append(el('label', { for: id }, k.label), rij, bereik);
    if (k.helptekst) veld.append(el('p', { class: 'hulp' }, k.helptekst));
    update = (r) => {
      const s = r.kenmerken.find((x) => x.code === k.code)!;
      if (s.min !== undefined) schuif.min = invoer.min = String(s.min);
      if (s.max !== undefined) schuif.max = invoer.max = String(s.max);
      const w = huidig()?.keuzes[k.code];
      if (typeof w === 'number') { schuif.value = String(w); if (document.activeElement !== invoer) invoer.value = String(w); }
      bereik.textContent = s.min !== undefined && s.max !== undefined ? `${getal(s.min)} – ${getal(s.max)} ${k.eenheid ?? ''}` : '';
    };
  }
  if (k.type === 'keuze') {
    const groep = el('fieldset', { class: 'keuzes' });
    groep.append(el('legend', {}, k.label));
    const knoppen = new Map<string, { knop: HTMLInputElement; tegel: HTMLElement; reden: HTMLElement }>();
    for (const kz of k.keuzes) {
      const kid = `${id}-${kz.code}`;
      const tegel = el('label', { class: 'tegel', for: kid });
      const knop = el('input', { type: 'radio', name: id, id: kid, value: kz.code }) as HTMLInputElement;
      knop.addEventListener('change', () => zet(k.code, kz.code));
      tegel.append(knop);
      const kleur = kz.eigenschappen?.kleur;
      if (typeof kleur === 'string' && kleur) {
        const staal = el('span', { class: 'staal', 'aria-hidden': 'true' });
        staal.style.background = kleur;
        tegel.append(staal);
      }
      // Openingssymbool als klein pictogram bij de vakkeuzes.
      if (/^vak\d$/.test(k.code)) tegel.append(symbool(kz.code));
      const reden = el('span', { class: 'reden' });
      tegel.append(el('span', {}, kz.label), reden);
      groep.append(tegel);
      knoppen.set(kz.code, { knop, tegel, reden });
    }
    veld.append(groep);
    if (k.helptekst) veld.append(el('p', { class: 'hulp' }, k.helptekst));
    update = (r) => {
      const s = r.kenmerken.find((x) => x.code === k.code)!;
      const w = huidig()?.keuzes[k.code];
      for (const ks of s.keuzes ?? []) {
        const kn = knoppen.get(ks.code)!;
        kn.knop.checked = w === ks.code;
        kn.tegel.classList.toggle('onbeschikbaar', !ks.beschikbaar);
        kn.reden.textContent = ks.beschikbaar ? '' : ks.reden ?? 'niet mogelijk';
      }
    };
  }
  if (k.type === 'janee') {
    const label = el('label', { class: 'schakelaar', for: id });
    const vink = el('input', { type: 'checkbox', id, role: 'switch' }) as HTMLInputElement;
    vink.addEventListener('change', () => zet(k.code, vink.checked));
    label.append(vink, el('span', { class: 'schuifje', 'aria-hidden': 'true' }), el('span', {}, k.label));
    veld.append(label);
    if (k.helptekst) veld.append(el('p', { class: 'hulp' }, k.helptekst));
    update = () => { vink.checked = huidig()?.keuzes[k.code] === true; };
  }
  veld.append(fout);
  velden.set(k.code, { veld, fout, update });
  return veld;
}

/** Klein pictogram van een openingssymbool (zelfde afspraak als de tekening). */
function symbool(code: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 20 26');
  s.setAttribute('class', 'symbool');
  s.setAttribute('aria-hidden', 'true');
  const pad = (d: string, streep = false) => {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '1.4');
    if (streep) p.setAttribute('stroke-dasharray', '2 1.5');
    s.append(p);
  };
  pad('M1 1 H19 V25 H1 Z');
  if (code === 'draai_l' || code === 'draaikip_l') pad('M18 2 L2 13 L18 24');
  if (code === 'draai_r' || code === 'draaikip_r') pad('M2 2 L18 13 L2 24');
  if (code === 'kip' || code.startsWith('draaikip')) pad('M2 2 L10 24 L18 2', true);
  return s as SVGSVGElement;
}

// ---------- tonen ----------
export function toonPositie(id?: string) {
  if (id) huidigId = id;
  const p = huidig();
  $('#p-leeg').hidden = !!p;
  $('#p-inhoud').hidden = !p;
  if (!p) return;
  huidigId = p.id;
  // Keuzelijst met posities.
  const lijst = $<HTMLSelectElement>('#p-kies');
  lijst.replaceChildren(...toestand().posities.map((x) => el('option', { value: x.id }, `${x.code} · ${x.naam}`)));
  lijst.value = p.id;
  $<HTMLInputElement>('#p-naam').value = p.naam;
  $<HTMLInputElement>('#p-aantal').value = String(p.aantal);
  const o = openingVan(p);
  $('#p-naarplan').hidden = !o;
  $('#p-model').textContent = MODELLEN[p.model].label;
  bouwFormulier(p);
  herbereken();
}

export function herbereken() {
  const p = huidig();
  if (!p || $('#p-inhoud').hidden) return;
  const r = resultaat(p);
  for (const s of r.kenmerken) {
    const v = velden.get(s.code);
    if (!v) continue;
    v.veld.hidden = !s.zichtbaar;
    v.update(r);
    const f = r.meldingen.filter((m) => m.kenmerk === s.code);
    v.fout.textContent = f.map((m) => m.melding).join(' ');
    v.veld.classList.toggle('heeft-fout', f.length > 0);
  }
  for (const sectie of document.querySelectorAll<HTMLElement>('#p-formulier .stap')) {
    sectie.hidden = ![...sectie.querySelectorAll<HTMLElement>('.veld')].some((v) => !v.hidden);
  }
  $('#p-tekening').innerHTML = r.tekening ? tekenSvg(r.tekening, { breedtePx: 640, lijnkleur: '#2b2b28', maatkleur: '#34505f' }) : '';
  if (weergave === '3d' && viewer) viewer.toon(scene(p, r));

  const lijst = controles(p, r);
  $('#p-controles').replaceChildren(...lijst.map(controleLi));
  const nF = lijst.filter((c) => c.toestand === 'fout').length, nL = lijst.filter((c) => c.toestand === 'let-op').length;
  const cs = $('#p-controle-status');
  cs.textContent = nF ? `${nF} te verhelpen` : nL ? `${nL} aandachtspunt${nL === 1 ? '' : 'en'}` : 'alles in orde';
  cs.className = `status ${nF ? 'fout' : nL ? 'let-op' : 'ok'}`;

  const korting = klantKorting();
  const stuk = r.prijs.brutoprijsExcl;
  $('#p-status').textContent = r.geldig ? 'Klaar voor offerte' : `${r.meldingen.filter((m) => m.ernst === 'fout').length} fout(en)`;
  $('#p-status').className = `status ${r.geldig ? 'ok' : 'fout'}`;
  if (document.body.classList.contains('klantmodus')) {
    // Voor de klant (particulier): prijs inclusief btw.
    const btw = toestand().meta.btw;
    // Zoals de prijs excl. btw: zonder de korting, die op het offertetotaal komt.
    const incl = stuk * (1 + btw / 100);
    $('#p-prijs').textContent = eur(incl * p.aantal);
    $('#p-prijs-sub').textContent = p.aantal > 1 ? `${p.aantal} × ${eur(incl)} incl. ${btw} % btw` : `incl. ${btw} % btw, per stuk`;
  } else {
    $('#p-prijs').textContent = eur(stuk * p.aantal);
    $('#p-prijs-sub').textContent = p.aantal > 1 ? `${p.aantal} × ${eur(stuk)} excl. btw` : 'excl. btw, per stuk';
  }
  const regels: [string, string][] = [
    ['Kostprijs per stuk', eur(r.prijs.kostprijs)],
    ['Marge', r.prijs.margeProcent === null ? '—' : `${getal(r.prijs.margeProcent, 1)} %`],
  ];
  if (korting) regels.push([`Korting aannemer op de offerte`, `${korting} %`]);
  $('#p-prijsdetail').replaceChildren(...regels.flatMap(([x, y]) => [el('dt', {}, x), el('dd', {}, y)]));
  const alg = r.meldingen.filter((m) => !m.kenmerk);
  $('#p-meldingen').replaceChildren(...alg.map((m) => el('li', { class: m.ernst }, m.melding)));
  $('#p-meldingen').hidden = !alg.length;
  $('#p-techniek').replaceChildren(...techniek(p, r).flatMap(([x, y]) => [el('dt', {}, x), el('dd', {}, y)]));
  const ib = inbegrepen(p, r);
  $('#p-inbegrepen').replaceChildren(...ib.wel.map((x) => el('li', {}, x)));
  $('#p-niet').replaceChildren(...ib.niet.map((x) => el('li', {}, x)));
  // Glasbestelling per ruit (alleen bij ramen en deuren).
  const ruiten = p.model === 'RAAM' ? ruitenVan(r) : [];
  $('#p-glas-kaart').hidden = !ruiten.length;
  $('#p-glas tbody').replaceChildren(...ruiten.map((g) => {
    const tr = el('tr');
    tr.append(
      el('td', {}, `${p.code}-${g.nr}`), el('td', {}, g.plaats),
      el('td', { class: 'num' }, `${getal(g.dagB)} × ${getal(g.dagH)}`),
      el('td', { class: 'num' }, `${getal(g.falsB)} × ${getal(g.falsH)}`),
      el('td', { class: 'num sterk' }, `${getal(g.b)} × ${getal(g.h)}`),
      el('td', {}, `${g.glas} · ${g.afstandhouder}`),
      el('td', { class: 'num' }, `${getal(g.m2, 2)} m²`), el('td', { class: 'num' }, `${getal(g.kg)} kg`),
    );
    return tr;
  }));
  $('#p-stuklijst tbody').replaceChildren(...r.stuklijst.map((s) => {
    const tr = el('tr');
    const maat = s.lengte !== undefined ? `${getal(s.lengte)}${s.breedte !== undefined ? ` × ${getal(s.breedte)}` : ''}` : '';
    tr.append(el('td', {}, s.omschrijving), el('td', { class: 'code' }, s.artikel), el('td', { class: 'num' }, getal(s.aantal, 2)),
      el('td', { class: 'num' }, maat), el('td', { class: 'num' }, `${getal(s.hoeveelheid, 2)} ${s.eenheid === 'm2' ? 'm²' : s.eenheid}`), el('td', { class: 'num' }, eur(s.kost)));
    return tr;
  }));
}

export function controleLi(c: Controle): HTMLElement {
  const li = el('li', { class: c.toestand });
  li.append(el('span', { class: 'teken', 'aria-hidden': 'true' }, c.toestand === 'ok' ? '✓' : c.toestand === 'fout' ? '✕' : '!'), el('span', {}, c.titel), el('span', { class: 'waarde' }, c.waarde ?? ''));
  if (c.uitleg) li.append(el('span', { class: 'uitleg' }, c.uitleg));
  return li;
}

function scene(p: Positie, r: ConfiguratieResultaat) {
  return p.model === 'AANBOUW' ? bouwAanbouw3D(r) : raamScene(r);
}

function toonWeergave(w: 'voor' | '3d') {
  weergave = w;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-p-weergave]')) b.setAttribute('aria-pressed', String(b.dataset.pWeergave === w));
  $('#p-tekening').hidden = w !== 'voor';
  $('#p-3d').hidden = w !== '3d';
  $('#p-3d-knoppen').hidden = w !== '3d';
  if (w === '3d') {
    if (viewer === undefined) {
      viewer = maak3D($('#p-3d'));
      (window as unknown as { __positie3d?: unknown }).__positie3d = viewer;
      viewer?.kwaliteit?.(window.matchMedia?.('(pointer: coarse)').matches ? 'snel' : 'mooi');
    }
    const p = huidig();
    if (viewer && p) {
      viewer.formaat();
      viewer.toon(scene(p, resultaat(p)));
    }
  }
}

export function startPositie(nav: { naarPlan: (openingId: string) => void; naarOfferte: () => void }) {
  naarPlan = nav.naarPlan;
  naarOfferte = nav.naarOfferte;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-p-weergave]')) b.addEventListener('click', () => toonWeergave(b.dataset.pWeergave as 'voor' | '3d'));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-p-standpunt]')) b.addEventListener('click', () => viewer?.standpunt(b.dataset.pStandpunt as 'schuin'));
  $<HTMLSelectElement>('#p-kies').addEventListener('change', (e) => toonPositie((e.target as HTMLSelectElement).value));
  $<HTMLInputElement>('#p-naam').addEventListener('change', (e) => wijzig('naam', (t) => {
    const p = t.posities.find((x) => x.id === huidigId);
    if (p) p.naam = (e.target as HTMLInputElement).value.trim() || p.naam;
  }));
  $<HTMLInputElement>('#p-aantal').addEventListener('change', (e) => wijzig('naam', (t) => {
    const p = t.posities.find((x) => x.id === huidigId);
    if (p) p.aantal = Math.max(1, Math.round(Number((e.target as HTMLInputElement).value) || 1));
  }));
  $('#p-terug').addEventListener('click', () => naarOfferte());
  $('#p-naarplan').addEventListener('click', () => {
    const p = huidig();
    const o = p && openingVan(p);
    if (o) naarPlan(o.id);
  });
  $('#p-bibliotheek').addEventListener('click', () => {
    const p = huidig();
    if (!p) return;
    const ok = bewaarInBibliotheek(p, p.naam);
    $('#p-kopieer-melding').textContent = ok ? `"${p.naam}" bewaard in de bibliotheek: in elk project te gebruiken via Offerte → Uit bibliotheek.` : 'Bewaren lukt niet (opslag vol).';
  });
  $('#p-kopieer').addEventListener('click', () => {
    const p = huidig();
    if (!p) return;
    void kopieer(offertetekst(p, resultaat(p)), $('#p-kopieer-melding'));
  });
}
