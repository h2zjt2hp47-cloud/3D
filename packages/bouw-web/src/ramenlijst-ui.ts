/**
 * Ramenlijst voor projecten zonder woning ("enkel ramen en deuren"): alle posities in één tabel,
 * snel aan te passen (soort, indeling, maten, ruimte, verdieping, aantal), en een maatlijst plakken
 * uit Excel, een mail of een opmeting. Fijner afstellen gebeurt in de configurator.
 */
import { tekenSvg, type Keuzes } from '../../core/src/index.js';
import { leesMaatlijst } from '../../core/voorbeelden/maatlijst.js';
import { raamdeur } from '../../core/voorbeelden/raam.js';
import { $, btwLabel, el, eur, labelCellen, toonPrijs } from './hulp.js';
import { nieuwePositie, resultaat, toestand, wijzig, type Positie } from './staat.js';

const SOORTEN: [string, string][] = [['raam', 'Raam'], ['terrasdeur', 'Terrasdeur'], ['voordeur', 'Voordeur'], ['schuif', 'Schuifraam']];
const STANDAARD: Record<string, Keuzes> = {
  raam: { breedte: 1200, hoogte: 1400, borstwering: 900, vakken: 'v1', vak1: 'draaikip_l' },
  terrasdeur: { breedte: 900, hoogte: 2300, borstwering: 0, vakken: 'v1', vak1: 'draai_l', glas: 'dubbel_gelaagd' },
  voordeur: { breedte: 1000, hoogte: 2300, borstwering: 0, glas: 'dubbel_gelaagd', ruimte: 'hal' },
  schuif: { breedte: 3000, hoogte: 2300, borstwering: 0, glas: 'dubbel_gelaagd', profiel: 'alu' },
};
/** Veelgebruikte indelingen per soort: [waarde, label]; voor ramen en terrasdeuren "vakken:vak1+vak2…". */
const INDELINGEN: Record<string, [string, string][]> = {
  raam: [
    ['v1:vast', 'Vast'], ['v1:draaikip_l', 'Draai-kip links'], ['v1:draaikip_r', 'Draai-kip rechts'], ['v1:kip', 'Kip (valraam)'],
    ['v1:draai_l', 'Draai links'], ['v1:draai_r', 'Draai rechts'], ['v2:vast+draaikip_r', 'Vast + draai-kip'], ['v2:draaikip_l+vast', 'Draai-kip + vast'],
    ['v2:draaikip_l+draai_r', 'Draai-kip + draai'], ['v3:draaikip_l+vast+draaikip_r', 'Draai-kip + vast + draai-kip'],
  ],
  terrasdeur: [['v1:draai_l', 'Deur links'], ['v1:draai_r', 'Deur rechts'], ['v2:draai_l+vast', 'Deur + vast'], ['v2:vast+draai_r', 'Vast + deur'], ['v2:draai_l+draai_r', 'Dubbele deur']],
  voordeur: [['links', 'Scharnieren links'], ['rechts', 'Scharnieren rechts']],
  schuif: [['links', 'Links schuift'], ['rechts', 'Rechts schuift'], ['beide', 'Beide schuiven']],
};
const VOORBEELD = [
  'Keuken 1600 x 1200 vast + draai-kip rechts',
  'Living schuifraam 3000 x 2300',
  'Slaapkamer verdieping 1200 x 1400 draai-kip links 2 st',
  'Badkamer 600 x 600',
  'Voordeur 1000 x 2300 rechts',
].join('\n');

const ruimtes = (): [string, string][] => {
  const k = raamdeur.kenmerken.find((x) => x.code === 'ruimte');
  return k && 'keuzes' in k && k.keuzes ? k.keuzes.map((x) => [x.code, x.label]) : [];
};

function indelingVan(k: Keuzes): string {
  const soort = String(k.type ?? 'raam');
  if (soort === 'voordeur') return String(k.deur_draai ?? 'links');
  if (soort === 'schuif') return String(k.schuif_richting ?? 'links');
  const n = Number(String(k.vakken ?? 'v1').slice(1)) || 1;
  return `v${n}:${[k.vak1, k.vak2, k.vak3].slice(0, n).join('+')}`;
}
function zetIndeling(k: Keuzes, w: string) {
  const soort = String(k.type ?? 'raam');
  if (soort === 'voordeur') { k.deur_draai = w; return; }
  if (soort === 'schuif') { k.schuif_richting = w; return; }
  const [vakken, rest] = w.split(':') as [string, string];
  k.vakken = vakken;
  rest.split('+').forEach((v, i) => { k[`vak${i + 1}`] = v; });
}

let melding = '';

/** Past keuzes van één positie aan (en blijft binnen de configurator). */
function zet(id: string, f: (k: Keuzes, p: Positie) => void) {
  wijzig('positie', (t) => {
    const p = t.posities.find((x) => x.id === id);
    if (p) f(p.keuzes, p);
  });
}

export function toonRamenlijst(nav: { naarPositie: (id: string) => void }) {
  const t = toestand();
  const tb = $('#o-ramenlijst tbody');
  const invoer = (type: string, waarde: string, label: string, bij: (w: string) => void, attrs: Record<string, string> = {}) => {
    const i = el('input', { type, 'aria-label': label, ...attrs }) as HTMLInputElement;
    i.value = waarde;
    i.addEventListener('change', () => bij(i.value));
    return i;
  };
  const kies = (opties: [string, string][], waarde: string, label: string, bij: (w: string) => void) => {
    const s = el('select', { 'aria-label': label }) as HTMLSelectElement;
    const lijst = opties.some(([w]) => w === waarde) ? opties : [...opties, [waarde, 'Andere indeling (zie configurator)'] as [string, string]];
    for (const [w, l] of lijst) s.append(el('option', { value: w }, l));
    s.value = waarde;
    s.addEventListener('change', () => bij(s.value));
    return s;
  };
  tb.replaceChildren(...t.posities.map((p) => {
    const tr = el('tr');
    const r = resultaat(p);
    const k = p.keuzes;
    const td = (inhoud: Node | string, cls = '') => { const c = el('td', cls ? { class: cls } : {}); c.append(inhoud); return c; };
    if (p.model !== 'RAAM') {
      tr.append(td(p.code, 'code'), td(p.naam), el('td', { colspan: '7', class: 'klein' }, 'Aanbouw: aanpassen in de configurator'), td(String(p.aantal), 'num'), td(eur(toonPrijs(r.prijs.brutoprijsExcl * p.aantal, t.meta.btw)), 'num'));
    } else {
      const soort = String(k.type ?? 'raam');
      const mini = el('span', { class: 'mini-lijst' });
      mini.innerHTML = r.tekening ? tekenSvg(r.tekening, { breedtePx: 56, lijnkleur: '#2b2b28', maatkleur: 'transparent' }) : '';
      const pos = el('span', { class: 'code' }, p.code);
      const posCel = el('td', { class: 'poscel' });
      const posDiv = el('div');
      posDiv.append(mini, pos);
      posCel.append(posDiv);
      tr.append(
        posCel,
        td(invoer('text', p.naam, `Omschrijving ${p.code}`, (w) => wijzig('offerte', (tt) => { const x = tt.posities.find((y) => y.id === p.id); if (x) x.naam = w.trim() || x.naam; }))),
        td(kies(SOORTEN, soort, `Soort ${p.code}`, (w) => zet(p.id, (kk) => {
          const std = STANDAARD[w]!;
          kk.type = w;
          Object.assign(kk, std);
          if (w === 'raam') kk.glas = 'dubbel';
        }))),
        td(kies(INDELINGEN[soort] ?? [], indelingVan(k), `Indeling ${p.code}`, (w) => zet(p.id, (kk) => zetIndeling(kk, w)))),
        td(invoer('number', String(k.breedte), `Breedte ${p.code} in mm`, (w) => zet(p.id, (kk) => { kk.breedte = Math.round(Number(w) || Number(kk.breedte)); }), { step: '1', class: 'maat' }), 'num'),
        td(invoer('number', String(k.hoogte), `Hoogte ${p.code} in mm`, (w) => zet(p.id, (kk) => { kk.hoogte = Math.round(Number(w) || Number(kk.hoogte)); }), { step: '1', class: 'maat' }), 'num'),
        td(kies(ruimtes(), String(k.ruimte ?? 'leefruimte'), `Ruimte ${p.code}`, (w) => zet(p.id, (kk) => {
          kk.ruimte = w;
          if ((w === 'badkamer' || w === 'wc') && kk.type === 'raam') kk.glas = 'mat_gelaagd';
        }))),
        td(invoer('number', String(k.verdieping ?? 0), `Verdieping ${p.code}`, (w) => zet(p.id, (kk) => { kk.verdieping = Math.min(5, Math.max(0, Math.round(Number(w) || 0))); }), { min: '0', max: '5', step: '1', class: 'kort' }), 'num'),
        td(invoer('number', String(p.aantal), `Aantal ${p.code}`, (w) => wijzig('offerte', (tt) => { const x = tt.posities.find((y) => y.id === p.id); if (x) x.aantal = Math.max(0, Math.round(Number(w) || 0)); }), { min: '0', step: '1', class: 'kort' }), 'num'),
        td(eur(toonPrijs(r.prijs.brutoprijsExcl * p.aantal, t.meta.btw)), 'num'),
      );
    }
    const nF = r.meldingen.filter((m) => m.ernst === 'fout').length, nW = r.meldingen.filter((m) => m.ernst === 'waarschuwing').length;
    const status = el('span', { class: `status ${nF ? 'fout' : nW ? 'let-op' : 'ok'}`, title: r.meldingen.map((m) => m.melding).join('\n') }, nF ? `${nF} fout${nF === 1 ? '' : 'en'}` : nW ? `${nW} let op` : 'in orde');
    const actiesCel = el('td', { class: 'acties-cel' });
    const acties = el('div');
    actiesCel.append(acties);
    const knop = (tekst: string, titel: string, f: () => void, cls = 'tweede') => { const b = el('button', { type: 'button', class: cls, title: titel, 'aria-label': `${titel} ${p.code}` }, tekst); b.addEventListener('click', f); return b; };
    acties.append(
      status,
      knop('Configureren', 'Alle keuzes in de configurator', () => nav.naarPositie(p.id), ''),
      knop('⧉', 'Dupliceren', () => wijzig('offerte', (tt) => {
        const kopie: Positie = { ...structuredClone(p), id: `${p.id}k${Date.now().toString(36)}` };
        tt.posities.splice(tt.posities.findIndex((x) => x.id === p.id) + 1, 0, kopie);
      })),
      knop('×', 'Verwijderen', () => wijzig('offerte', (tt) => { tt.posities = tt.posities.filter((x) => x.id !== p.id); }), 'gevaar'),
    );
    tr.append(actiesCel);
    return tr;
  }));
  labelCellen($('#o-ramenlijst'));
  $('#o-ramenlijst-leeg').hidden = t.posities.length > 0;
  $('#o-ramenlijst-totaal').textContent = `Totaal (${btwLabel()})`;
  const raam = t.posities.filter((p) => p.model === 'RAAM');
  const reno = raam.length > 0 && raam.every((p) => p.keuzes.situatie === 'renovatie');
  const nieuw = raam.length > 0 && raam.every((p) => p.keuzes.situatie !== 'renovatie');
  $('#o-situatie-renovatie').setAttribute('aria-pressed', String(reno));
  $('#o-situatie-nieuwbouw').setAttribute('aria-pressed', String(nieuw));
  $('#o-maatlijst-melding').textContent = melding;
}

export function startRamenlijst() {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-ramen-nieuw]')) {
    b.addEventListener('click', () => {
      const soort = b.dataset.ramenNieuw!;
      const p = nieuwePositie('RAAM', { type: soort, ...STANDAARD[soort], situatie: 'renovatie' }, SOORTEN.find(([w]) => w === soort)?.[1]);
      wijzig('offerte', (t) => { t.posities.push(p); });
      // Meteen de omschrijving van de nieuwe regel invullen.
      requestAnimationFrame(() => (document.querySelector('#o-ramenlijst tbody tr:last-child input[type="text"]') as HTMLInputElement | null)?.select());
    });
  }
  $('#o-maatlijst-voorbeeld').addEventListener('click', () => { $<HTMLTextAreaElement>('#o-maatlijst').value = VOORBEELD; });
  $('#o-maatlijst-lees').addEventListener('click', () => {
    const vak = $<HTMLTextAreaElement>('#o-maatlijst');
    const r = leesMaatlijst(vak.value);
    if (!r.regels.length) {
      melding = r.overgeslagen.length ? `Geen regels met maten gevonden (${r.overgeslagen.length} overgeslagen). Schrijf bv. "Keuken 1200 x 1400".` : 'Plak eerst een maatlijst.';
      $('#o-maatlijst-melding').textContent = melding;
      return;
    }
    wijzig('offerte', (t) => {
      for (const x of r.regels) {
        const p = nieuwePositie('RAAM', { situatie: 'renovatie', ...x.keuzes }, x.naam);
        p.aantal = x.aantal;
        t.posities.push(p);
      }
    });
    const opm = [...r.regels.flatMap((x) => x.waarschuwingen.map((w) => `regel ${x.regel}: ${w}`)), ...r.overgeslagen.filter((x) => x.reden !== 'kopregel').map((x) => `regel ${x.regel} overgeslagen: ${x.reden}`)];
    melding = `${r.regels.length} ${r.regels.length === 1 ? 'positie' : 'posities'} toegevoegd.${opm.length ? ` Let op: ${opm.join('; ')}.` : ''} Ongedaan maken kan met Ctrl+Z.`;
    vak.value = '';
    $('#o-maatlijst-melding').textContent = melding;
  });
  for (const [id, situatie] of [['#o-situatie-renovatie', 'renovatie'], ['#o-situatie-nieuwbouw', 'nieuwbouw']] as const) {
    $(id).addEventListener('click', () => wijzig('offerte', (t) => { for (const p of t.posities) if (p.model === 'RAAM') p.keuzes.situatie = situatie; }));
  }
}
