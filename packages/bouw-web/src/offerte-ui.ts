/**
 * Offerte: alle posities (ramen, deuren, aanbouw) plus regels uit de plattegrond (vloeren,
 * wanden, binnendeuren, ruwbouw, inrichting). Korting en btw voor de hele offerte, controles,
 * bestellijst per leverancier, planning, afdruk (PDF) en export.
 */
import { berekenOfferte, controleerPlan, niveauPlan, tekenPlattegrond, tekenSvg, verdiepingenVan, type Keuzes, type OfferteResultaat, type StuklijstResultaat } from '../../core/src/index.js';
import { planCatalogus, planNaarRegels } from '../../core/voorbeelden/inrichting.js';
import { ruitenVan } from '../../core/voorbeelden/raam.js';
import { $, el, eur, getal, kopieer, num, toonPrijs, btwLabel } from './hulp.js';
import { gevelSvgs } from './plattegrond-ui.js';
import { startRamenlijst, toonRamenlijst } from './ramenlijst-ui.js';
import { controles, inbegrepen } from './positie-ui.js';
import { legAkkoordVast, meerwerk } from './werf-ui.js';
import { bibliotheek, klantKorting, MODELLEN, nieuwePositie, openingVan, positieUitBibliotheek, resultaat, toestand, wijzig, type ModelCode, type Positie } from './staat.js';
import { bewaarBestand } from '../../demo-web/src/bewaren.js';

/** Soorten regels uit de plattegrond (vinkjes in de offerte). */
const REGELSOORTEN = ['vloeren', 'wanden', 'binnendeuren', 'ruwbouw', 'gevel', 'inrichting'] as const;

let naarPositie: (id: string) => void = () => {};
let naarPlan: (openingId?: string) => void = () => {};
let naarWerf: () => void = () => {};

export function berekenHuidigeOfferte(): OfferteResultaat {
  const t = toestand();
  return berekenOfferte({
    posities: t.posities.map((p) => ({ id: p.id, code: p.code, naam: p.naam, aantal: p.aantal, resultaat: resultaat(p) })),
    regels: planNaarRegels(t.plan, t.meta.regels, planCatalogus),
    kortingProcent: klantKorting(),
    btwProcent: t.meta.btw,
  });
}

/** Korte omschrijving van een positie (voor lijst en afdruk). */
export function omschrijving(p: Positie): string {
  const r = resultaat(p);
  const k = r.kenmerken;
  const lab = (code: string) => k.find((x) => x.code === code && x.zichtbaar)?.weergave;
  if (p.model === 'AANBOUW') return [lab('project'), `${getal(num(p.keuzes.breedte))} mm breed`, lab('raamtype'), lab('glas')].filter(Boolean).join(' · ');
  return [
    lab('type'), `${getal(num(p.keuzes.breedte))} × ${getal(num(p.keuzes.hoogte))} mm`, lab('profiel'),
    `${lab('kleur_buiten')}${p.keuzes.kleur_binnen !== 'zelfde' ? ` / binnen ${lab('kleur_binnen')?.toLowerCase()}` : ''}`,
    lab('glas'), p.keuzes.zonwering !== 'geen' ? lab('zonwering') : undefined,
  ].filter(Boolean).join(' · ');
}

const LEVERANCIERS: [RegExp, string][] = [
  [/^PROF-/, 'Profielen (systeemhuis)'],
  [/^GLAS-/, 'Glas'],
  [/^(ZON-|HOR-)/, 'Zonwering en horren'],
  [/^(BES-|GREEP-|RC2-|ROOSTER|DORPEL-DREMPELLOOS)/, 'Beslag en toebehoren'],
  [/^(VB-|DORPEL-)/, 'Natuursteen en dorpels'],
  [/^(PANEEL-)/, 'Deurpanelen'],
  [/^(ARB-|AFBRAAK|AFW-)/, 'Eigen uren en werf'],
];

function bestellijst(): Map<string, Map<string, { omschrijving: string; eenheid: string; hoeveelheid: number }>> {
  const groepen = new Map<string, Map<string, { omschrijving: string; eenheid: string; hoeveelheid: number }>>();
  for (const p of toestand().posities) {
    for (const s of resultaat(p).stuklijst as StuklijstResultaat[]) {
      const groep = LEVERANCIERS.find(([re]) => re.test(s.artikel))?.[1] ?? 'Overige (bouw)';
      const g = groepen.get(groep) ?? new Map();
      const huidig = g.get(s.artikel) ?? { omschrijving: s.omschrijving, eenheid: s.eenheid === 'm2' ? 'm²' : s.eenheid, hoeveelheid: 0 };
      huidig.hoeveelheid += s.hoeveelheid * p.aantal;
      g.set(s.artikel, huidig);
      groepen.set(groep, g);
    }
  }
  return groepen;
}

function planning() {
  const t = toestand();
  let uren = 0, weken = 0;
  for (const p of t.posities) {
    const r = resultaat(p);
    uren += (r.stuklijst.find((s) => s.artikel === 'ARB-MONTAGE')?.hoeveelheid ?? 0) * p.aantal;
    weken = Math.max(weken, num(r.afgeleid.levertermijn));
  }
  return { uren, weken, dagen: Math.ceil(uren / 16) };
}

export function toonOfferte() {
  const t = toestand();
  const m = t.meta;
  for (const [id, w] of [['o-klant', m.klant], ['o-adres', m.adres], ['o-project', m.project], ['o-nummer', m.nummer], ['o-datum', m.datum]] as const) {
    const i = $<HTMLInputElement>(`#${id}`);
    if (document.activeElement !== i) i.value = w;
  }
  $<HTMLInputElement>(`#o-btw-${m.btw}`).checked = true;
  $<HTMLInputElement>(`#o-klanttype-${m.klanttype}`).checked = true;
  const kv = $<HTMLInputElement>('#o-korting');
  kv.disabled = m.klanttype !== 'aannemer';
  if (document.activeElement !== kv) kv.value = String(m.korting);
  for (const k of REGELSOORTEN) $<HTMLInputElement>(`#o-regel-${k}`).checked = !!m.regels[k];
  if (m.zonderWoning) toonRamenlijst({ naarPositie });

  const o = berekenHuidigeOfferte();

  // Posities.
  const lijst = $('#o-posities');
  lijst.replaceChildren(...t.posities.map((p) => {
    const r = resultaat(p);
    const pos = o.posities.find((x) => x.id === p.id)!;
    const rij = el('article', { class: `positie ${r.geldig ? '' : 'ongeldig'}` });
    const tekening = el('div', { class: 'mini' });
    tekening.innerHTML = r.tekening ? tekenSvg(r.tekening, { breedtePx: 150, lijnkleur: '#2b2b28', maatkleur: '#34505f' }) : '';
    const info = el('div', { class: 'info' });
    const kop = el('div', { class: 'positiekop' });
    kop.append(el('span', { class: 'code' }, p.code), el('strong', {}, p.naam));
    const opening = openingVan(p);
    if (opening) kop.append(el('span', { class: 'label' }, 'in plattegrond'));
    const c = controles(p, r);
    const nL = c.filter((x) => x.toestand === 'let-op').length;
    kop.append(el('span', { class: `status ${!r.geldig ? 'fout' : nL ? 'let-op' : 'ok'}` }, !r.geldig ? `${nFouten(r)} fout${nFouten(r) === 1 ? '' : 'en'}` : nL ? `${nL} aandachtspunt${nL === 1 ? '' : 'en'}` : 'in orde'));
    info.append(kop, el('p', { class: 'klein' }, omschrijving(p)));
    const acties = el('div', { class: 'positieacties' });
    const knop = (tekst: string, f: () => void, cls = 'tweede') => {
      const b = el('button', { type: 'button', class: cls }, tekst);
      b.addEventListener('click', f);
      return b;
    };
    acties.append(knop('Bewerken', () => naarPositie(p.id), ''));
    if (opening) acties.append(knop('Toon in plattegrond', () => naarPlan(opening.id)));
    acties.append(knop('Dupliceren', () => wijzig('offerte', (tt) => {
      const kopie: Positie = { ...structuredClone(p), id: `${p.id}k${Date.now().toString(36)}`, naam: `${p.naam} (kopie)` };
      tt.posities.splice(tt.posities.indexOf(tt.posities.find((x) => x.id === p.id)!) + 1, 0, kopie);
    })));
    acties.append(knop('Verwijderen', () => wijzig('offerte', (tt) => {
      tt.posities = tt.posities.filter((x) => x.id !== p.id);
      tt.plan.openingen = tt.plan.openingen.filter((x) => x.positie !== p.id);
    }), 'gevaar'));
    info.append(acties);
    const prijs = el('div', { class: 'positieprijs' });
    const aantal = el('input', { type: 'number', min: '0', step: '1', 'aria-label': `Aantal ${p.code}` }) as HTMLInputElement;
    aantal.value = String(p.aantal);
    aantal.addEventListener('change', () => wijzig('offerte', (tt) => {
      const x = tt.posities.find((y) => y.id === p.id);
      if (x) x.aantal = Math.max(0, Math.round(Number(aantal.value) || 0));
    }));
    const aantalRij = el('label', { class: 'aantal' });
    aantalRij.append(aantal, el('span', {}, `× ${eur(toonPrijs(pos.stukprijs, o.btwProcent))}`));
    prijs.append(aantalRij, el('strong', {}, eur(toonPrijs(pos.totaal, o.btwProcent))));
    rij.append(tekening, info, prijs);
    return rij;
  }));
  $('#o-leeg').hidden = t.posities.length > 0;
  const bib = bibliotheek();
  const kies = $<HTMLSelectElement>('#o-bibliotheek');
  kies.replaceChildren(el('option', { value: '' }, bib.length ? '+ Uit bibliotheek …' : 'Bibliotheek is leeg'), ...bib.map((b) => el('option', { value: b.id }, b.naam)));
  kies.disabled = !bib.length;

  // Regels uit de plattegrond.
  const tb = $('#o-regels tbody');
  const groepen = [...new Set(o.regels.map((r) => r.groep))];
  tb.replaceChildren(...groepen.flatMap((g) => [
    (() => { const tr = el('tr', { class: 'groep' }); tr.append(el('th', { colspan: '4' }, g)); return tr; })(),
    ...o.regels.filter((r) => r.groep === g).map((r) => {
      const tr = el('tr');
      tr.append(el('td', {}, r.omschrijving), el('td', { class: 'num' }, `${getal(r.hoeveelheid, 1)} ${r.eenheid}`), el('td', { class: 'num' }, eur(toonPrijs(r.eenheidsprijs, o.btwProcent))), el('td', { class: 'num' }, eur(toonPrijs(r.totaal, o.btwProcent))));
      return tr;
    }),
  ]));
  $('#o-regels-kaart').hidden = o.regels.length === 0;
  for (const x of document.querySelectorAll('.o-btwlabel')) x.textContent = `prijzen ${btwLabel()}`;

  // Totalen.
  const tot: [string, string, string?][] = [
    ['Ramen en deuren', eur(o.subtotaalPosities)],
  ];
  if (o.subtotaalRegels) tot.push(['Afwerking uit de plattegrond', eur(o.subtotaalRegels)]);
  if (o.korting) tot.push([`Korting aannemer ${getal(o.kortingProcent)} %`, `− ${eur(o.korting)}`]);
  tot.push(['Totaal excl. btw', eur(o.excl), 'sterk'], [`Btw ${o.btwProcent} %`, eur(o.btw)], ['Totaal incl. btw', eur(o.incl), 'groot']);
  $('#o-totalen').replaceChildren(...tot.flatMap(([a, b, c]) => [el('dt', c ? { class: c } : {}, a), el('dd', c ? { class: c } : {}, b)]));
  const pl = planning();
  $('#o-intern').replaceChildren(...([
    ['Kostprijs', eur(o.kostprijs)],
    ['Marge', o.margeProcent === null ? '—' : `${getal(o.margeProcent, 1)} %`],
    ['Voorschot 30 %', eur(o.incl * 0.3)],
    ['Levertermijn', `± ${pl.weken} weken na inmeting`],
    ['Plaatsing', `${getal(pl.uren, 1)} uur · ± ${pl.dagen} ${pl.dagen === 1 ? 'dag' : 'dagen'} met 2 plaatsers`],
  ] as [string, string][]).flatMap(([a, b]) => [el('dt', {}, a), el('dd', {}, b)]));
  const status = $('#o-status');
  const nFout = o.posities.filter((p) => !p.geldig && p.aantal > 0).length;
  status.textContent = nFout ? `${nFout} positie${nFout === 1 ? '' : 's'} met fouten` : 'Klaar om te versturen';
  status.className = `status ${nFout ? 'fout' : 'ok'}`;

  // Akkoord van de klant (basis voor meerwerk).
  const ak = $('#o-akkoord');
  ak.replaceChildren();
  if (!m.akkoord) {
    const naam = el('input', { type: 'text', id: 'o-akkoord-naam', 'aria-label': 'Naam klant' }) as HTMLInputElement;
    naam.value = m.klant;
    const b = el('button', { type: 'button' }, 'Klant gaat akkoord: offerte vastleggen');
    b.addEventListener('click', () => legAkkoordVast(naam.value || m.klant || 'de klant'));
    const rij = el('div', { class: 'positieacties' });
    rij.append(naam, b);
    ak.append(el('p', { class: 'klein' }, 'Na het akkoord komt elke wijziging (inmeting, ander glas, extra raam …) automatisch op een meerwerkbon.'), rij);
  } else {
    const mw = meerwerk();
    ak.append(el('p', {}, `Akkoord op ${m.akkoord.datum} door ${m.akkoord.naam}: ${eur(m.akkoord.excl)} excl. btw.`));
    if (mw) ak.append(el('p', { class: mw.excl ? 'melding' : 'klein' }, mw.excl ? `Sindsdien ${mw.excl > 0 ? 'meerwerk' : 'minwerk'}: ${eur(Math.abs(mw.excl))} excl. btw (${mw.lijnen.length + mw.vrij.length} wijziging(en)).` : 'Geen wijzigingen sinds het akkoord.'));
    const b = el('button', { type: 'button' }, 'Naar werf: inmeting en meerwerkbon');
    b.addEventListener('click', () => naarWerf());
    ak.append(b);
  }

  // Controles over de hele offerte.
  const meldingen: { ernst: string; tekst: string; positie?: string }[] = [];
  for (const p of t.posities) {
    const r = resultaat(p);
    for (const mm of r.meldingen) meldingen.push({ ernst: mm.ernst, tekst: `${p.code} ${p.naam}: ${mm.melding}`, positie: p.id });
  }
  for (const mm of controleerPlan(t.plan)) meldingen.push({ ernst: mm.ernst, tekst: `Plattegrond: ${mm.melding}` });
  if (m.btw === 6) meldingen.push({ ernst: 'waarschuwing', tekst: 'Btw 6 %: alleen voor renovatie van een woning ouder dan 10 jaar, met attest van de klant.' });
  meldingen.sort((a, b) => (a.ernst === b.ernst ? 0 : a.ernst === 'fout' ? -1 : 1));
  $('#o-meldingen').replaceChildren(...meldingen.map((x) => {
    const li = el('li', { class: x.ernst }, x.tekst);
    if (x.positie) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => naarPositie(x.positie!));
    }
    return li;
  }));
  $('#o-meldingen-leeg').hidden = meldingen.length > 0;

  // Glasbestelling per ruit (alle posities).
  const gl = glasbestelling();
  $('#o-glas tbody').replaceChildren(...gl.map((g) => {
    const tr = el('tr');
    tr.append(el('td', {}, g.ref), el('td', {}, g.plaats), el('td', { class: 'num' }, String(g.aantal)), el('td', { class: 'num sterk' }, `${getal(g.b)} × ${getal(g.h)}`),
      el('td', {}, g.glas), el('td', {}, g.afstandhouder), el('td', { class: 'num' }, `${getal(g.m2 * g.aantal, 2)} m²`), el('td', { class: 'num' }, `${getal(g.kg * g.aantal)} kg`));
    return tr;
  }));
  $('#o-glas-totaal').textContent = `${gl.reduce((t, g) => t + g.aantal, 0)} ruiten · ${getal(gl.reduce((t, g) => t + g.m2 * g.aantal, 0), 2)} m² · ${getal(gl.reduce((t, g) => t + g.kg * g.aantal, 0))} kg`;
  const wd = $<HTMLInputElement>('#o-winddruk');
  if (document.activeElement !== wd) wd.value = String(m.winddruk ?? 800);

  // Bestellijst per leverancier.
  const bl = bestellijst();
  $('#o-bestellijst').replaceChildren(...[...bl].map(([groep, artikels]) => {
    const d = el('details');
    d.append(el('summary', {}, `${groep} (${artikels.size})`));
    const tabel = el('table');
    const body = el('tbody');
    for (const [code, a] of artikels) {
      const tr = el('tr');
      tr.append(el('td', {}, a.omschrijving), el('td', { class: 'code' }, code), el('td', { class: 'num' }, `${getal(a.hoeveelheid, 2)} ${a.eenheid}`));
      body.append(tr);
    }
    tabel.append(body);
    d.append(tabel);
    return d;
  }));
}

/** Alle ruiten van alle ramen en deuren, met de positie en het aantal. */
function glasbestelling() {
  return toestand().posities.filter((p) => p.model === 'RAAM' && p.aantal > 0).flatMap((p) =>
    ruitenVan(resultaat(p)).map((g) => ({ ...g, ref: `${p.code}-${g.nr}`, plaats: `${p.naam} · ${g.plaats}`, aantal: p.aantal })));
}

function glasbestellingTekst(scheiding = '\t'): string {
  const kop = ['Ref', 'Omschrijving', 'Aantal', 'Breedte (mm)', 'Hoogte (mm)', 'Glas', 'Afstandhouder', 'Ug', 'Veiligheidsglas', 'm² per stuk'];
  const rijen = glasbestelling().map((g) => [g.ref, g.plaats, g.aantal, g.b, g.h, g.glas, g.afstandhouder, g.ug, g.veilig ? 'ja' : 'nee', g.m2.toFixed(2).replace('.', ',')]);
  return [kop, ...rijen].map((r) => r.map((c) => String(c).replace(new RegExp(scheiding, 'g'), ' ')).join(scheiding)).join('\n');
}

function nFouten(r: ReturnType<typeof resultaat>) {
  return r.meldingen.filter((m) => m.ernst === 'fout').length;
}

// ---------- tekst, export en afdruk ----------
function offertetekst(): string {
  const t = toestand(), o = berekenHuidigeOfferte();
  return [
    `Offerte ${t.meta.nummer} · ${t.meta.datum}`, `${t.meta.klant}, ${t.meta.adres}`, `Project: ${t.meta.project}`, '',
    ...t.posities.map((p) => `${p.code} ${p.naam} · ${p.aantal} × ${eur(o.posities.find((x) => x.id === p.id)!.stukprijs)}\n   ${omschrijving(p)}`),
    ...(o.regels.length ? ['', 'Afwerking:', ...o.regels.map((r) => `- ${r.omschrijving}: ${getal(r.hoeveelheid, 1)} ${r.eenheid} × ${eur(r.eenheidsprijs)} = ${eur(r.totaal)}`)] : []),
    '', ...(o.korting ? [`Korting: − ${eur(o.korting)}`] : []),
    `Totaal excl. btw: ${eur(o.excl)}`, `Btw ${o.btwProcent} %: ${eur(o.btw)}`, `Totaal incl. btw: ${eur(o.incl)}`,
  ].join('\n');
}

/** Export als JSON (structuur zoals een koppeling met het ERP ze zou doorsturen). */
function exportJson(): string {
  const t = toestand(), o = berekenHuidigeOfferte();
  return JSON.stringify({
    offerte: { nummer: t.meta.nummer, datum: t.meta.datum, klant: t.meta.klant, adres: t.meta.adres, project: t.meta.project, btw_procent: o.btwProcent, korting_procent: o.kortingProcent },
    regels: [
      ...t.posities.map((p) => {
        const r = resultaat(p);
        return {
          positie: p.code, omschrijving: p.naam, aantal: p.aantal, eenheidsprijs: r.prijs.brutoprijsExcl, kostprijs: r.prijs.kostprijs,
          configuratie: { model: MODELLEN[p.model].model.code, versie: MODELLEN[p.model].model.versie, keuzes: p.keuzes },
          details: r.samenvatting,
          stuklijst: r.stuklijst.map((s) => ({ artikel: s.artikel, omschrijving: s.omschrijving, hoeveelheid: s.hoeveelheid, eenheid: s.eenheid })),
        };
      }),
      ...o.regels.map((r) => ({ positie: r.groep, omschrijving: r.omschrijving, aantal: r.hoeveelheid, eenheid: r.eenheid, eenheidsprijs: r.eenheidsprijs, kostprijs: r.kostprijs })),
    ],
    totaal: { excl: o.excl, btw: o.btw, incl: o.incl },
  }, null, 2);
}

function download(naam: string, inhoud: string, type: string) {
  // Via de gedeelde helper: werkt ook in de weergave op claude.ai (toelating "downloads").
  void bewaarBestand(naam, new Blob([inhoud], { type }));
}

/** Vult het afdrukblad en opent het afdrukvenster (bewaren als PDF kan daar). */
export function drukAf() {
  const t = toestand(), o = berekenHuidigeOfferte();
  const blad = $('#afdruk');
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const posities = t.posities.map((p) => {
    const r = resultaat(p);
    const pos = o.posities.find((x) => x.id === p.id)!;
    const ib = inbegrepen(p, r);
    return `<section class="a-positie"><div class="a-tekening">${r.tekening ? tekenSvg(r.tekening, { breedtePx: 230, lijnkleur: '#222', maatkleur: '#34505f' }) : ''}</div>
      <div><h3>${esc(p.code)} · ${esc(p.naam)}</h3><p>${esc(omschrijving(p))}</p>
      <ul>${r.samenvatting.slice(0, 14).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <p class="a-klein">Niet inbegrepen: ${esc(ib.niet.join(', '))}</p></div>
      <div class="a-prijs">${pos.aantal} × ${eur(pos.stukprijs)}<br><strong>${eur(pos.totaal)}</strong></div></section>`;
  }).join('');
  const regels = o.regels.length ? `<h2>Afwerking</h2><table><tbody>${o.regels.map((r) => `<tr><td>${esc(r.groep)}</td><td>${esc(r.omschrijving)}</td><td class="num">${getal(r.hoeveelheid, 1)} ${r.eenheid}</td><td class="num">${eur(r.eenheidsprijs)}</td><td class="num">${eur(r.totaal)}</td></tr>`).join('')}</tbody></table>` : '';
  const plan = verdiepingenVan(t.plan).map((v, n) => {
    const pl = niveauPlan(t.plan, n);
    if (!pl.ruimtes.length) return '';
    return `<h2>Plattegrond ${esc(v.naam.toLowerCase())}</h2><div class="a-plan">${tekenPlattegrond(pl, planCatalogus, {
      afdruk: true, onderlegger: n > 0 ? niveauPlan(t.plan, n - 1) : undefined,
      raamInfo: (op) => { const p = t.posities.find((x) => x.id === op.positie); return p ? { label: p.code } : undefined; },
    })}</div>`;
  }).join('');
  const gevelLijst = gevelSvgs(560);
  const gevels = gevelLijst.length ? `<h2>Gevels</h2><div class="a-gevels">${gevelLijst.map((g) => `<figure><figcaption>${esc(g.naam)}</figcaption>${g.svg}</figure>`).join('')}</div>` : '';
  blad.innerHTML = `<header class="a-kop"><div><div class="a-firma">Uw bedrijf · Ramen, deuren en renovatie</div><h1>Offerte ${esc(t.meta.nummer)}</h1><p>${esc(t.meta.datum)}</p></div>
    <div class="a-klant"><strong>${esc(t.meta.klant)}</strong><br>${esc(t.meta.adres)}<br>Project: ${esc(t.meta.project)}</div></header>
    ${plan}${gevels}<h2>Posities</h2>${posities}${regels}
    <table class="a-totaal"><tbody>
      <tr><td>Totaal excl. btw</td><td class="num">${eur(o.excl + o.korting)}</td></tr>
      ${o.korting ? `<tr><td>Korting ${getal(o.kortingProcent)} %</td><td class="num">− ${eur(o.korting)}</td></tr>` : ''}
      <tr><td>Btw ${o.btwProcent} %</td><td class="num">${eur(o.btw)}</td></tr>
      <tr class="sterk"><td>Totaal incl. btw</td><td class="num">${eur(o.incl)}</td></tr></tbody></table>
    <h2>Voorwaarden</h2><ul class="a-klein"><li>Maten onder voorbehoud van inmeting op de werf.</li><li>Geldig 30 dagen. Voorschot 30 % bij bestelling.</li>
      <li>Levertermijn ± ${planning().weken} weken na inmeting en akkoord.</li>${t.meta.btw === 6 ? '<li>6 % btw onder voorbehoud van het ondertekende attest (woning ouder dan 10 jaar).</li>' : ''}
      <li>Demo-offerte: prijzen en technische waarden zijn voorbeelden.</li></ul>
    <div class="a-handtekening"><div>Voor akkoord, klant<br><br><br>……………………………</div><div>Voor de firma<br><br><br>……………………………</div></div>`;
  window.print();
}

export function startOfferte(nav: { naarPositie: (id: string) => void; naarPlan: (openingId?: string) => void; naarWerf: () => void }) {
  naarPositie = nav.naarPositie;
  naarPlan = nav.naarPlan;
  naarWerf = nav.naarWerf;
  startRamenlijst();
  for (const [id, veld] of [['o-klant', 'klant'], ['o-adres', 'adres'], ['o-project', 'project'], ['o-nummer', 'nummer'], ['o-datum', 'datum']] as const) {
    $<HTMLInputElement>(`#${id}`).addEventListener('change', (e) => wijzig('meta', (t) => { t.meta[veld] = (e.target as HTMLInputElement).value; }));
  }
  for (const b of [6, 21]) $<HTMLInputElement>(`#o-btw-${b}`).addEventListener('change', () => wijzig('meta', (t) => { t.meta.btw = b; }));
  for (const k of ['particulier', 'aannemer'] as const) $<HTMLInputElement>(`#o-klanttype-${k}`).addEventListener('change', () => wijzig('meta', (t) => { t.meta.klanttype = k; }));
  $<HTMLInputElement>('#o-korting').addEventListener('change', (e) => wijzig('meta', (t) => { t.meta.korting = Math.min(50, Math.max(0, Number((e.target as HTMLInputElement).value) || 0)); }));
  for (const k of REGELSOORTEN) {
    $<HTMLInputElement>(`#o-regel-${k}`).addEventListener('change', (e) => wijzig('meta', (t) => { t.meta.regels[k] = (e.target as HTMLInputElement).checked; }));
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-nieuw]')) {
    b.addEventListener('click', () => {
      const soort = b.dataset.nieuw!;
      const model: ModelCode = soort === 'aanbouw' ? 'AANBOUW' : 'RAAM';
      const extra: Keuzes = soort === 'voordeur' ? { type: 'voordeur', breedte: 1000, hoogte: 2300, glas: 'dubbel_gelaagd' }
        : soort === 'terrasdeur' ? { type: 'terrasdeur', breedte: 900, hoogte: 2300, vak1: 'draai_l', glas: 'dubbel_gelaagd' }
          : soort === 'schuif' ? { type: 'schuif', breedte: 3000, hoogte: 2300, glas: 'dubbel_gelaagd' } : {};
      const namen: Record<string, string> = { raam: 'Raam', voordeur: 'Voordeur', terrasdeur: 'Terrasdeur', schuif: 'Schuifraam', aanbouw: 'Aanbouw met schuifraam' };
      const p = nieuwePositie(model, extra, namen[soort]);
      wijzig('offerte', (t) => { t.posities.push(p); });
      naarPositie(p.id);
    });
  }
  $('#o-afdruk').addEventListener('click', drukAf);
  $<HTMLSelectElement>('#o-bibliotheek').addEventListener('change', (e) => {
    const s = e.target as HTMLSelectElement;
    const p = s.value ? positieUitBibliotheek(s.value) : undefined;
    s.value = '';
    if (!p) return;
    wijzig('offerte', (t) => { t.posities.push(p); });
    naarPositie(p.id);
  });
  $('#o-glas-kopieer').addEventListener('click', () => void kopieer(glasbestellingTekst(), $('#o-glas-melding')));
  $('#o-glas-csv').addEventListener('click', () => download(`glasbestelling-${toestand().meta.nummer}.csv`, '\ufeff' + glasbestellingTekst(';'), 'text/csv'));
  $('#o-winddruk-toepassen').addEventListener('click', () => {
    const w = Math.min(3000, Math.max(200, Math.round((Number($<HTMLInputElement>('#o-winddruk').value) || 800) / 10) * 10));
    wijzig('offerte', (t) => {
      t.meta.winddruk = w;
      for (const p of t.posities) if (p.model === 'RAAM') p.keuzes.winddruk = w;
    });
  });
  $('#o-kopieer').addEventListener('click', () => void kopieer(offertetekst(), $('#o-melding')));
  $('#o-export').addEventListener('click', () => download(`${toestand().meta.nummer}.json`, exportJson(), 'application/json'));
}
