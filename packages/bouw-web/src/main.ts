/**
 * Klikbare demo voor de bouwsector: ramen, deuren en aanbouw.
 * Zelfde motor als de zetelconfigurator: het formulier komt uit het productmodel (aanbouw.ts),
 * elke wijziging herberekent controles, prijs, bestellijst, vooraanzicht en 3D.
 */
import {
  berekenConfiguratie,
  standaardKeuzes,
  tekenSvg,
  type ConfiguratieResultaat,
  type Kenmerk,
  type Keuzes,
} from '../../core/src/index.js';
import { aanbouw, aanbouwPrijslijst } from '../../core/voorbeelden/aanbouw.js';
import { bouwAanbouw3D } from '../../core/voorbeelden/aanbouw3d.js';
import { maak3D, type Viewer3D } from '../../demo-web/src/drie-d.js';

// ---------- hulpjes ----------
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, tekst?: string) {
  const e = document.createElement(tag);
  for (const [a, w] of Object.entries(attrs)) e.setAttribute(a, w);
  if (tekst !== undefined) e.textContent = tekst;
  return e;
}
const eur = (x: number) => new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(x);
const getal = (x: number, d = 0) => new Intl.NumberFormat('nl-BE', { maximumFractionDigits: d }).format(x);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function toonFout(waar: string, fout: unknown) {
  const vak = document.getElementById('foutmelding');
  if (!vak) return;
  vak.hidden = false;
  vak.append(el('p', {}, `${waar}: ${fout instanceof Error ? fout.message : String(fout)}`));
}
window.addEventListener('error', (e) => toonFout('Fout', e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => toonFout('Fout', e.reason));

// ---------- toestand ----------
const model = aanbouw;
let keuzes: Keuzes = standaardKeuzes(model);
let laatste: ConfiguratieResultaat | undefined;
let korting = 0;
let weergave: 'voor' | '3d' = 'voor';
let viewer: Viewer3D | null | undefined;

/** Eigenschap van de gekozen keuze van een keuzekenmerk (bv. maxkg van het raamtype). */
function eigenschap(kenmerk: string, naam: string): unknown {
  const k = model.kenmerken.find((x) => x.code === kenmerk);
  if (!k || k.type !== 'keuze') return undefined;
  return k.keuzes.find((kz) => kz.code === keuzes[kenmerk])?.eigenschappen?.[naam];
}
function keuzeLabel(kenmerk: string): string {
  const k = model.kenmerken.find((x) => x.code === kenmerk);
  if (!k || k.type !== 'keuze') return '';
  return k.keuzes.find((kz) => kz.code === keuzes[kenmerk])?.label ?? '';
}

// ---------- formulier ----------
const velden = new Map<string, { veld: HTMLElement; fout: HTMLElement; update: (r: ConfiguratieResultaat) => void }>();

function bouwFormulier() {
  const form = $('#formulier');
  form.replaceChildren();
  velden.clear();
  model.stappen.forEach((stap, n) => {
    const sectie = el('section', { class: 'stap', 'aria-labelledby': `stap-${stap.code}` });
    const kop = el('h2', { id: `stap-${stap.code}` });
    kop.append(el('span', { class: 'stapnr' }, String(n + 1)), document.createTextNode(stap.label));
    sectie.append(kop);
    for (const k of model.kenmerken.filter((k) => k.stap === stap.code)) sectie.append(bouwVeld(k));
    sectie.dataset.stap = stap.code;
    form.append(sectie);
  });
}

function bouwVeld(k: Kenmerk): HTMLElement {
  const veld = el('div', { class: `veld veld-${k.type}`, 'data-kenmerk': k.code });
  const id = `k-${k.code}`;
  const fout = el('p', { class: 'veldfout', role: 'alert' });
  let update: (r: ConfiguratieResultaat) => void = () => {};

  if (k.type === 'getal') {
    const rij = el('div', { class: 'getalrij' });
    const schuif = el('input', { type: 'range', 'aria-label': `${k.label} (schuifbalk)`, step: String(k.stapgrootte ?? 1) }) as HTMLInputElement;
    const invoer = el('input', { type: 'number', id, inputmode: 'numeric', step: String(k.stapgrootte ?? 1) }) as HTMLInputElement;
    const bereik = el('span', { class: 'bereik' });
    invoer.value = schuif.value = String(keuzes[k.code]);
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
    rij.append(schuif, invoer, el('span', { class: 'eenheid' }, k.eenheid ?? ''));
    veld.append(el('label', { for: id }, k.label), rij, bereik);
    if (k.helptekst) veld.append(el('p', { class: 'hulp' }, k.helptekst));
    update = (r) => {
      const s = r.kenmerken.find((x) => x.code === k.code)!;
      if (s.min !== undefined) schuif.min = invoer.min = String(s.min);
      if (s.max !== undefined) schuif.max = invoer.max = String(s.max);
      // Pas na min/max de waarde zetten, anders klemt de schuifbalk ze op 0–100.
      if (typeof keuzes[k.code] === 'number') schuif.value = String(keuzes[k.code]);
      bereik.textContent = s.min !== undefined && s.max !== undefined ? `${getal(s.min)} – ${getal(s.max)} ${k.eenheid ?? ''}` : '';
    };
  }

  if (k.type === 'keuze') {
    const groep = el('fieldset', { class: 'keuzes' });
    groep.append(el('legend', {}, k.label));
    for (const kz of k.keuzes) {
      const kid = `${id}-${kz.code}`;
      const tegel = el('label', { class: 'tegel', for: kid });
      const knop = el('input', { type: 'radio', name: id, id: kid, value: kz.code }) as HTMLInputElement;
      knop.checked = keuzes[k.code] === kz.code;
      knop.addEventListener('change', () => {
        keuzes[k.code] = kz.code;
        herbereken();
      });
      tegel.append(knop);
      const kleur = kz.eigenschappen?.kleur;
      if (typeof kleur === 'string' && kleur) {
        const staal = el('span', { class: 'staal', 'aria-hidden': 'true' });
        staal.style.background = kleur;
        tegel.append(staal);
      }
      tegel.append(el('span', {}, kz.label));
      groep.append(tegel);
    }
    veld.append(groep);
    if (k.helptekst) veld.append(el('p', { class: 'hulp' }, k.helptekst));
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
    if (k.helptekst) veld.append(el('p', { class: 'hulp' }, k.helptekst));
  }

  veld.append(fout);
  velden.set(k.code, { veld, fout, update });
  return veld;
}

// ---------- controles (de pijnpunten uit het onderzoek, zichtbaar per offerte) ----------
type Toestand = 'ok' | 'let-op' | 'fout';
interface Controle { titel: string; toestand: Toestand; waarde?: string; uitleg?: string }

function controles(r: ConfiguratieResultaat): Controle[] {
  const a = r.afgeleid;
  const uit: Controle[] = [];
  const muren = a.muren === true;
  const maxb = num(eigenschap('raamtype', 'maxb')), maxh = num(eigenschap('raamtype', 'maxh')), maxkg = num(eigenschap('raamtype', 'maxkg'));
  const vb = num(a.vleugel_b), rh = num(a.raam_h), kg = num(a.vleugel_kg), uw = num(a.uw);

  uit.push({
    titel: 'Vleugelbreedte binnen systeemgrens', toestand: vb <= maxb ? 'ok' : 'fout',
    waarde: `${getal(vb)} / max ${getal(maxb)} mm`,
    uitleg: vb <= maxb ? undefined : 'Kies meer vleugels of een ander raamtype.',
  });
  uit.push({ titel: 'Hoogte binnen systeemgrens', toestand: rh <= maxh ? 'ok' : 'fout', waarde: `${getal(rh)} / max ${getal(maxh)} mm` });
  uit.push({
    titel: 'Gewicht per vleugel', toestand: kg <= maxkg ? (kg > maxkg * 0.85 ? 'let-op' : 'ok') : 'fout',
    waarde: `${getal(kg)} / max ${getal(maxkg)} kg`,
    uitleg: kg > maxkg ? 'Te zwaar voor dit beslag: hef-schuifdeur, meer vleugels of lichter glas.' : kg > maxkg * 0.85 ? 'Dicht bij de grens van het beslag.' : undefined,
  });
  const veilig = eigenschap('glas', 'veilig') === true;
  uit.push({
    titel: 'Veiligheidsglas (glas tot op de vloer)', toestand: veilig ? 'ok' : 'fout', waarde: veilig ? 'gelaagd' : 'niet gelaagd',
    uitleg: 'Regel uit de Belgische glasnorm NBN S 23-002 (te bevestigen per project).',
  });
  uit.push({
    titel: 'Isolatie raampartij (EPB)', toestand: uw <= 1.5 ? 'ok' : 'let-op', waarde: `Uw ${getal(uw, 2)} W/m²K`,
    uitleg: uw <= 1.5 ? 'Richtwaarde Uw ≤ 1,5 (te verifiëren met de EPB-verslaggever).' : 'Hoger dan 1,5: hoog geïsoleerd profiel of driedubbel glas overwegen.',
  });
  if (keuzes.inmeting === true) {
    const afw = num(a.meet_afwijking);
    uit.push({
      titel: 'Inmeting op de werf', toestand: afw > 10 ? 'let-op' : 'ok', waarde: `verschil ${getal(afw)} mm`,
      uitleg: `Bestelmaat = kleinste meting min speling: ${getal(num(a.raam_b))} × ${getal(rh)} mm.`,
    });
  } else {
    uit.push({ titel: 'Inmeting op de werf', toestand: 'let-op', waarde: 'nog niet gebeurd', uitleg: 'Prijs onder voorbehoud: de bestelmaten volgen pas na de inmeting.' });
  }
  if (muren && num(a.opening_b) > 3000) {
    uit.push({ titel: 'Stalen ligger boven de opening', toestand: 'let-op', waarde: `${getal(num(a.ligger_lm), 2)} m`, uitleg: 'Opening breder dan 3 m: stabiliteitsberekening laten maken.' });
  }
  if (muren) {
    const m2 = num(a.dak_m2);
    uit.push({
      titel: 'Vergunning', toestand: m2 > 40 ? 'let-op' : 'ok', waarde: `${getal(m2, 1)} m²`,
      uitleg: m2 > 40 ? 'Groter dan 40 m²: vergunningsplicht nagaan bij de gemeente.' : 'Vrijstelling mogelijk; altijd nagaan bij de gemeente.',
    });
  }
  if (eigenschap('btw_regime', 'pct') === 6) {
    uit.push({ titel: 'Btw 6 %', toestand: 'let-op', waarde: 'attest klant', uitleg: 'Woning ouder dan 10 jaar, privégebruik: klant ondertekent het attest.' });
  }
  return uit;
}

// ---------- inbegrepen / niet inbegrepen ----------
function inbegrepen(r: ConfiguratieResultaat): { wel: string[]; niet: string[] } {
  const muren = r.afgeleid.muren === true;
  const wel = r.stuklijst.map((s) => s.omschrijving);
  if (keuzes.inmeting !== true) wel.push('Inmeting op de werf vóór bestelling');
  const niet: string[] = [];
  if (keuzes.montage !== true) niet.push('Plaatsing van de raampartij');
  if (keuzes.afbraak !== true) niet.push('Uitbraak en afvoer van het bestaande');
  if (muren && keuzes.fundering !== true) niet.push('Fundering en vloerplaat');
  if (keuzes.screen !== true) niet.push('Zonwering (screen)');
  niet.push('Binnenafwerking: pleisterwerk, vloerbekleding, schilderwerk');
  niet.push('Elektriciteit, verwarming en sanitair');
  if (muren) niet.push('Architect, stabiliteitsstudie en EPB-verslag', 'Omgevingsvergunning en aanvraagkosten');
  else niet.push('Aanpassingen aan latei of draagmuur');
  niet.push('Onvoorziene werken na uitbraak (verrekend na akkoord)');
  return { wel, niet };
}

// ---------- herberekenen ----------
function herbereken() {
  const r = berekenConfiguratie(model, keuzes, aanbouwPrijslijst, { kortingProcent: korting });
  laatste = r;
  const a = r.afgeleid;

  for (const s of r.kenmerken) {
    const v = velden.get(s.code);
    if (!v) continue;
    v.veld.hidden = !s.zichtbaar;
    v.update(r);
    const fouten = r.meldingen.filter((m) => m.kenmerk === s.code);
    v.fout.textContent = fouten.map((m) => m.melding).join(' ');
    v.veld.classList.toggle('heeft-fout', fouten.length > 0);
  }
  for (const sectie of document.querySelectorAll<HTMLElement>('#formulier .stap')) {
    sectie.hidden = ![...sectie.querySelectorAll<HTMLElement>('.veld')].some((v) => !v.hidden);
  }

  // Tekening en 3D
  $('#tekening').innerHTML = r.tekening ? tekenSvg(r.tekening, { breedtePx: 680, lijnkleur: '#2b2b28', maatkleur: '#34505f' }) : '';
  if (weergave === '3d' && viewer) viewer.toon(bouwAanbouw3D(r));

  // Controles
  const lijst = controles(r);
  $('#controles').replaceChildren(
    ...lijst.map((c) => {
      const li = el('li', { class: c.toestand });
      li.append(
        el('span', { class: 'teken', 'aria-hidden': 'true' }, c.toestand === 'ok' ? '✓' : c.toestand === 'fout' ? '✕' : '!'),
        el('span', {}, c.titel),
        el('span', { class: 'waarde' }, c.waarde ?? ''),
      );
      if (c.uitleg) li.append(el('span', { class: 'uitleg' }, c.uitleg));
      return li;
    }),
  );
  const nFout = lijst.filter((c) => c.toestand === 'fout').length, nLet = lijst.filter((c) => c.toestand === 'let-op').length;
  const cs = $('#controle-status');
  cs.textContent = nFout ? `${nFout} te verhelpen` : nLet ? `${nLet} aandachtspunt${nLet === 1 ? '' : 'en'}` : 'alles in orde';
  cs.className = `status ${nFout ? 'fout' : nLet ? 'let-op' : 'ok'}`;

  // Prijs
  const btwPct = num(eigenschap('btw_regime', 'pct')) || model.prijs.btwProcent;
  const status = $('#status');
  const fouten = r.meldingen.filter((m) => m.ernst === 'fout').length;
  status.textContent = r.geldig ? 'Klaar voor offerte' : `${fouten} ${fouten === 1 ? 'fout' : 'fouten'} op te lossen`;
  status.className = `status ${r.geldig ? 'ok' : 'fout'}`;
  $('#prijs-excl').textContent = eur(r.prijs.verkoopprijsExcl);
  $('#prijs-incl').textContent = `${eur(r.prijs.verkoopprijsIncl)} incl. ${btwPct} % btw`;
  const regels: [string, string][] = [];
  if (r.prijs.kortingProcent) {
    regels.push(['Brutoprijs', eur(r.prijs.brutoprijsExcl)]);
    regels.push([`Korting aannemer ${getal(r.prijs.kortingProcent)} %`, `− ${eur(r.prijs.brutoprijsExcl - r.prijs.verkoopprijsExcl)}`]);
  }
  regels.push([`Btw ${btwPct} %`, eur(r.prijs.btw)]);
  regels.push(['Kostprijs', eur(r.prijs.kostprijs)]);
  regels.push(['Marge', r.prijs.margeProcent === null ? '—' : `${getal(r.prijs.margeProcent, 1)} %`]);
  $('#prijsdetail').replaceChildren(...regels.flatMap(([x, y]) => [el('dt', {}, x), el('dd', {}, y)]));
  const algemeen = r.meldingen.filter((m) => !m.kenmerk);
  const ml = $('#meldingen');
  ml.replaceChildren(...algemeen.map((m) => el('li', { class: m.ernst }, m.melding)));
  ml.hidden = algemeen.length === 0;

  // Technische gegevens
  const tech: [string, string][] = [
    ['Raampartij (b × h)', `${getal(num(a.raam_b))} × ${getal(num(a.raam_h))} mm`],
    ['Aantal vleugels', `${getal(num(a.n))}`],
    ['Breedte per vleugel', `${getal(num(a.vleugel_b))} mm`],
    ['Gewicht per vleugel', `${getal(num(a.vleugel_kg))} kg`],
    ['Glas per vleugel', `${getal(num(a.glas_b))} × ${getal(num(a.glas_h))} mm`],
    ['Glasoppervlakte', `${getal(num(a.glas_m2), 2)} m²`],
    ['Ug glas / Uf profiel', `${getal(num(eigenschap('glas', 'ug')), 1)} / ${getal(num(eigenschap('profiel', 'uf')), 1)} W/m²K`],
    ['Uw raampartij', `${getal(num(a.uw), 2)} W/m²K`],
    ['Levertermijn raampartij', `± ${getal(num(a.levertermijn))} weken`],
  ];
  if (a.muren === true) {
    tech.push(['Dakoppervlakte', `${getal(num(a.dak_m2), 1)} m²`], ['Gevel zijmuren', `${getal(num(a.gevel_m2), 1)} m²`]);
  }
  $('#techniek').replaceChildren(...tech.flatMap(([x, y]) => [el('dt', {}, x), el('dd', {}, y)]));

  // Inbegrepen / niet inbegrepen
  const ib = inbegrepen(r);
  $('#inbegrepen').replaceChildren(...ib.wel.map((t) => el('li', {}, t)));
  $('#niet-inbegrepen').replaceChildren(...ib.niet.map((t) => el('li', {}, t)));

  // Bestellijst
  $('#stuklijst tbody').replaceChildren(
    ...r.stuklijst.map((s) => {
      const tr = el('tr');
      const maat = s.lengte !== undefined ? `${getal(s.lengte)}${s.breedte !== undefined ? ` × ${getal(s.breedte)}` : ''}` : '';
      tr.append(
        el('td', {}, s.omschrijving),
        el('td', { class: 'code' }, s.artikel),
        el('td', { class: 'num' }, getal(s.aantal, 2)),
        el('td', { class: 'num' }, maat),
        el('td', { class: 'num' }, `${getal(s.hoeveelheid, 2)} ${s.eenheid === 'm2' ? 'm²' : s.eenheid}`),
        el('td', { class: 'num' }, eur(s.kost)),
      );
      return tr;
    }),
  );
}

// ---------- offertetekst ----------
function offertetekst(r: ConfiguratieResultaat): string {
  const a = r.afgeleid;
  const ib = inbegrepen(r);
  const btwPct = num(eigenschap('btw_regime', 'pct')) || model.prijs.btwProcent;
  return [
    a.muren === true ? 'Offerte aanbouw met raampartij' : 'Offerte raampartij',
    '',
    `Raampartij: ${keuzeLabel('raamtype')}, ${keuzeLabel('profiel').toLowerCase()}, ${keuzeLabel('kleur')}`,
    `Maat raampartij: ${getal(num(a.raam_b))} × ${getal(num(a.raam_h))} mm${keuzes.inmeting === true ? ' (na inmeting)' : ' (onder voorbehoud van inmeting)'}`,
    `Beglazing: ${keuzeLabel('glas')} · Uw ${getal(num(a.uw), 2)} W/m²K`,
    ...(a.muren === true ? [`Aanbouw: ${getal(num(keuzes.breedte))} × ${getal(num(keuzes.diepte))} mm, hoogte ${getal(num(a.H))} mm`, `Gevel: ${keuzeLabel('gevel')} · bekleding: ${keuzeLabel('bekleding')} · dak: ${keuzeLabel('dak')}`] : []),
    '',
    'Inbegrepen:',
    ...ib.wel.map((t) => `- ${t}`),
    '',
    'Niet inbegrepen:',
    ...ib.niet.map((t) => `- ${t}`),
    '',
    `Prijs: ${eur(r.prijs.verkoopprijsExcl)} excl. btw · ${eur(r.prijs.verkoopprijsIncl)} incl. ${btwPct} % btw`,
    ...(btwPct === 6 ? ['6 % btw onder voorbehoud van het ondertekende attest (woning ouder dan 10 jaar).'] : []),
    `Levertermijn raampartij: ± ${getal(num(a.levertermijn))} weken na inmeting en akkoord.`,
  ].join('\n');
}

async function kopieer(tekst: string, melding: HTMLElement) {
  try {
    await navigator.clipboard.writeText(tekst);
  } catch {
    const t = el('textarea');
    t.value = tekst;
    document.body.append(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
  melding.textContent = 'Gekopieerd';
  setTimeout(() => (melding.textContent = ''), 2500);
}

// ---------- weergave ----------
function toonWeergave(w: 'voor' | '3d') {
  weergave = w;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-weergave]')) b.setAttribute('aria-pressed', String(b.dataset.weergave === w));
  $('#weergave-titel').textContent = w === '3d' ? '3D' : 'Vooraanzicht';
  $('#tekening').hidden = w !== 'voor';
  $('#drie-d').hidden = w !== '3d';
  $('#drie-d-knoppen').hidden = w !== '3d';
  if (w === '3d') {
    if (viewer === undefined) viewer = maak3D($('#drie-d'));
    if (viewer && laatste) {
      viewer.formaat();
      viewer.toon(bouwAanbouw3D(laatste));
    }
  }
}

function start() {
  bouwFormulier();
  herbereken();
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-weergave]')) {
    b.addEventListener('click', () => toonWeergave(b.dataset.weergave as 'voor' | '3d'));
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-standpunt]')) {
    b.addEventListener('click', () => viewer?.standpunt(b.dataset.standpunt as 'schuin' | 'voor' | 'boven' | 'zij'));
  }
  const kortingVeld = $<HTMLInputElement>('#korting');
  const zetKorting = () => {
    const aannemer = document.querySelector<HTMLInputElement>('input[name="klant"]:checked')?.value === 'aannemer';
    kortingVeld.disabled = !aannemer;
    korting = aannemer ? Math.min(50, Math.max(0, Number(kortingVeld.value) || 0)) : 0;
    herbereken();
  };
  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="klant"]')) r.addEventListener('change', zetKorting);
  kortingVeld.addEventListener('input', zetKorting);
  $('#herstel').addEventListener('click', () => {
    keuzes = standaardKeuzes(model);
    bouwFormulier();
    herbereken();
  });
  $('#kopieer').addEventListener('click', () => laatste && void kopieer(offertetekst(laatste), $('#kopieer-melding')));
  if (new URLSearchParams(location.search).get('weergave') === '3d') toonWeergave('3d');
}

try {
  start();
} catch (fout) {
  toonFout('Opstarten', fout);
}
