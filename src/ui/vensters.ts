// Vensters: diplomatie, overzicht, logboek, instellingen, opslaan en zoeken.
import { kaart } from '../kaart/kaart';
import { datumTekst } from '../spel/kalender';
import {
  geschenk, oordeelBond, oordeelHuwelijk, oordeelVrede, oorlogsreden, oorlogsscore, sluitHuwelijk,
  sluitVredeAf, verklaarOorlogActie, type Oordeel,
} from '../spel/diplomatie';
import { rekening } from '../spel/economie';
import { tijdperk, alleTijdperken } from '../spel/tijdperk';
import {
  bevriend, hoofd, inOorlog, migreer, opinie, paar, sluitBond, sterkteVan, vakkenVan, type Toestand,
} from '../spel/toestand';
import { leeftijd, lijfIn } from '../spel/vorsten';
import { $, bewaarInstellingen, centreer, getal, h, melding, ui, vuil } from './context';
import { kort } from './kaartbeeld';

// ---------- algemeen venster ----------

export function venster(titel: string, html: string, knoppen: [string, () => void][] = [['Sluiten', () => {}]], breed = false) {
  const v = $('#venster');
  v.innerHTML = `<div class="venster-binnen ${breed ? 'breed' : ''}"><button class="sluit" aria-label="Sluiten">✕</button><h2>${titel}</h2><div class="inhoud">${html}</div><div class="rij">${knoppen.map(([k], i) => `<button data-k="${i}" class="${i === 0 ? 'hoofd' : ''}">${k}</button>`).join('')}</div></div>`;
  v.hidden = false;
  v.querySelector('.sluit')!.addEventListener('click', sluitVenster);
  v.querySelectorAll<HTMLButtonElement>('[data-k]').forEach((b) => b.addEventListener('click', () => {
    v.hidden = true;
    knoppen[Number(b.dataset.k)][1]();
  }));
}

export function sluitVenster() {
  $('#venster').hidden = true;
  vuil();
}

function oordeelHtml(o: Oordeel, ja = 'Zal aanvaarden', nee = 'Zal weigeren'): string {
  return `<div class="oordeel ${o.ja ? 'ja' : 'nee'}"><b>${o.ja ? ja : nee}</b> (${getal(o.totaal, true)})<table>${o.redenen.map((r) => `<tr><td>${h(r.tekst)}</td><td class="r">${getal(r.waarde, true)}</td></tr>`).join('')}</table></div>`;
}

// ---------- diplomatie ----------

export function diplomatie(kies?: string) {
  const t = ui.t;
  if (!t) return;
  const ik = t.speler;
  const lijst = Object.values(t.facties).filter((f) => f.bestaat && f.id !== t.speler)
    .sort((a, b) => Number(inOorlog(t, ik, b.id)) - Number(inOorlog(t, ik, a.id)) || vakkenVan(t, b.id).length - vakkenVan(t, a.id).length);
  const gekozen = kies && t.facties[kies] ? kies : lijst[0]?.id;
  const status = (f: string) => {
    const s: string[] = [];
    if (inOorlog(t, ik, f)) s.push('<span class="rood">oorlog</span>');
    else if (bevriend(t, ik, f)) s.push('<span class="groen">bondgenoot</span>');
    if (t.facties[f].heer === ik) s.push('onder jou');
    if (t.facties[ik].heer === f) s.push('jouw heer');
    if (t.facties[f].leenheer === ik) s.push('jouw leenman');
    if (t.facties[ik].leenheer === f) s.push('jouw leenheer');
    if ((t.bestand[paar(ik, hoofd(t, f))] ?? 0) > t.dag) s.push('bestand');
    if (t.huwelijk.includes(paar(ik, f))) s.push('verwant');
    return s.join(', ') || 'neutraal';
  };
  const links = lijst.map((f) => `<button class="lijn-knop ${f.id === gekozen ? 'aan' : ''}" data-f="${f.id}"><span class="kleur" style="background:${f.kleur}"></span><span class="groei">${h(f.naam)}<br><small>${status(f.id)}</small></span><small class="r">${getal(opinie(t, ik, f.id), true)}</small></button>`).join('');
  venster('Diplomatie', `<div class="twee"><div class="lijst">${links || '<p>Er zijn geen andere machten.</p>'}</div><div class="detail">${gekozen ? diploDetail(t, ik, gekozen) : ''}</div></div>`, [['Sluiten', () => {}]], true);
  document.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => b.addEventListener('click', () => diplomatie(b.dataset.f)));
  koppelDiplo(t, ik, gekozen);
}

function diploDetail(t: Toestand, ik: string, f: string): string {
  const fac = t.facties[f];
  const tp = tijdperk(t.tijdperk);
  const oorlog = inOorlog(t, ik, f);
  const v = fac.vorst;
  const unie = t.gedaan.find((x) => x.startsWith(`unie:${f}:`));
  const reden = oorlogsreden(t, ik, hoofd(t, f));
  const bestand = (t.bestand[paar(ik, hoofd(t, f))] ?? 0) > t.dag;
  let acties = '';
  if (t.facties[ik].heer) {
    acties = `<p class="klein">Als onderworpen macht volg je de oorlogen en de vrede van ${h(t.facties[t.facties[ik].heer!].naam)}. ${f === t.facties[ik].heer ? 'Je kan in opstand komen vanuit je eigen paneel.' : ''}</p>`
      + `<h4>Geschenk</h4><div class="rij">${[25, 100, 250].map((n) => `<button data-geef="${n}" ${t.facties[ik].schat < n ? 'disabled' : ''}>🪙 ${n}</button>`).join('')}</div>`;
  } else if (oorlog) {
    const o1 = oordeelVrede(t, ik, hoofd(t, f), false), o2 = oordeelVrede(t, ik, hoofd(t, f), true);
    acties += `<h4>Vrede</h4><p class="klein">Oorlogsscore voor jou: <b>${oorlogsscore(t, ik, hoofd(t, f))}</b>. Bij vrede blijft van elk wat hij nu bezet.</p>
      ${oordeelHtml(o1)}<button data-actie="vrede" ${o1.ja ? '' : 'disabled'}>Vrede voorstellen</button>
      ${oordeelHtml(o2)}<button data-actie="vredezilver" ${o2.ja ? '' : 'disabled'}>Vrede en zilver eisen</button>`;
  } else if (!fac.heer && fac.id !== t.facties[ik].heer) {
    const ob = oordeelBond(t, ik, f);
    acties += bevriend(t, ik, f) ? `<p>Jullie zijn bondgenoten.</p><button data-actie="bondweg">Bondgenootschap opzeggen</button>`
      : `<h4>Bondgenootschap</h4>${oordeelHtml(ob)}<button data-actie="bond" ${ob.ja ? '' : 'disabled'}>Bondgenootschap voorstellen</button>`;
    if (tp.huwelijken && fac.vorst && t.facties[ik].vorst && !t.huwelijk.includes(paar(ik, f))) {
      const oh = oordeelHuwelijk(t, ik, f);
      acties += `<h4>Huwelijk</h4><p class="klein">Een huwelijk tussen de vorstenhuizen. Sterft hun huis uit zonder erfgenaam, dan kan jij erven (en omgekeerd).</p>${oordeelHtml(oh)}<button data-actie="huwelijk" ${oh.ja ? '' : 'disabled'}>Huwelijk voorstellen</button>`;
    }
    acties += `<h4>Geschenk</h4><p class="klein">Zilver geven verbetert hun mening over jou.</p><div class="rij">${[25, 100, 250].map((n) => `<button data-geef="${n}" ${t.facties[ik].schat < n ? 'disabled' : ''}>🪙 ${n}</button>`).join('')}</div>`;
    if (!bevriend(t, ik, f)) {
      acties += `<h4>Oorlog</h4><p class="klein">${reden ? `Reden: ${reden}` : '<span class="rood">Je hebt geen goede reden. Iedereen vindt je minder, en je volk wordt onrustig.</span>'}${bestand ? ' <span class="rood">Er is een bestand: dat breken kost veel.</span>' : ''} Hun bondgenoten komen hen helpen.</p><button data-actie="oorlog" class="gevaar">Oorlog verklaren</button>`;
    }
  }
  if (fac.heer === ik && unie) {
    const jaren = Math.floor((t.dag - Number(unie.split(':')[2])) / 365);
    acties += `<h4>Inlijven</h4><p class="klein">Jullie delen een vorst sinds ${jaren} jaar. Na 10 jaar kan je het land inlijven.</p><button data-actie="inlijven" ${jaren >= 10 ? '' : 'disabled'}>Inlijven</button>`;
  }
  return `
    <h3><span class="kleur" style="background:${fac.kleur}"></span>${h(fac.naam)}</h3>
    <p class="klein">${h(fac.beschrijving)}</p>
    <table>
      <tr><td>Leider</td><td>${h(fac.heerser)}${v ? ` (${leeftijd(t, v)} jaar${v.verzonnen ? ', verzonnen' : ''})` : ''}</td></tr>
      ${v ? `<tr><td>Erfgenaam</td><td>${v.erfgenaam ? 'ja' : '<span class="rood">nee</span>'}</td></tr>` : ''}
      ${fac.heer ? `<tr><td>Onder</td><td>${h(t.facties[fac.heer].naam)}</td></tr>` : ''}
      <tr><td>Vakken</td><td>${vakkenVan(t, f).length}</td></tr>
      <tr><td>Legers</td><td>${kort(sterkteVan(t, f))} man</td></tr>
      ${fac.leenheer && t.facties[fac.leenheer]?.bestaat ? `<tr><td>Leenman van</td><td>${h(t.facties[fac.leenheer].naam)}</td></tr>` : ''}
      <tr><td>Mening over jou</td><td>${getal(opinie(t, ik, f), true)}</td></tr>
      <tr><td>Oorlogsmoeheid</td><td>${Math.round(fac.moeheid)}</td></tr>
    </table>
    ${acties}`;
}

function koppelDiplo(t: Toestand, ik: string, f: string | undefined) {
  if (!f) return;
  const doe = (fn: () => void) => () => { fn(); vuil(); diplomatie(f); };
  const knop = (a: string) => document.querySelector<HTMLButtonElement>(`[data-actie="${a}"]`);
  knop('vrede')?.addEventListener('click', doe(() => sluitVredeAf(t, ik, hoofd(t, f), false)));
  knop('vredezilver')?.addEventListener('click', doe(() => sluitVredeAf(t, ik, hoofd(t, f), true)));
  knop('bond')?.addEventListener('click', doe(() => { sluitBond(t, ik, f); melding(`Bondgenootschap met ${t.facties[f].naam}.`); }));
  knop('bondweg')?.addEventListener('click', doe(() => { t.bond = t.bond.filter((p) => p !== paar(ik, f)); }));
  knop('huwelijk')?.addEventListener('click', doe(() => sluitHuwelijk(t, ik, f)));
  knop('oorlog')?.addEventListener('click', () => {
    venster('Oorlog verklaren?', `<p>Wil je echt ${h(t.facties[hoofd(t, f)].naam)} de oorlog verklaren?</p>`, [
      ['Ja, oorlog', doe(() => verklaarOorlogActie(t, ik, f))],
      ['Nee', () => diplomatie(f)],
    ]);
  });
  knop('inlijven')?.addEventListener('click', doe(() => lijfIn(t, f)));
  document.querySelectorAll<HTMLButtonElement>('[data-geef]').forEach((b) => b.addEventListener('click', doe(() => { geschenk(t, ik, f, Number(b.dataset.geef)); })));
}

// ---------- overzicht ----------

export function overzicht() {
  const t = ui.t;
  if (!t) return;
  const rijen = Object.values(t.facties).filter((f) => f.bestaat)
    .map((f) => ({ f, vakken: vakkenVan(t, f.id).length, volk: vakkenVan(t, f.id).reduce((s, i) => s + t.vakken[i].bevolking, 0), leger: sterkteVan(t, f.id), netto: rekening(t, f.id).netto }))
    .sort((a, b) => b.vakken - a.vakken || b.leger - a.leger);
  const tabel = `<table class="tabel"><tr><th>Macht</th><th class="r">Vakken</th><th class="r">Volk</th><th class="r">Leger</th><th class="r">Zilver</th><th class="r">/maand</th><th class="r">Moe</th></tr>${rijen.map((r) => `<tr class="${r.f.id === t.speler ? 'ik' : ''}"><td><span class="kleur" style="background:${r.f.kleur}"></span>${h(r.f.naam)}${r.f.heer ? ` <small>(onder ${h(t.facties[r.f.heer].naam)})</small>` : ''}</td><td class="r">${r.vakken}</td><td class="r">${kort(r.volk)}</td><td class="r">${kort(r.leger)}</td><td class="r">${getal(r.f.schat)}</td><td class="r">${getal(r.netto, true)}</td><td class="r">${Math.round(r.f.moeheid)}</td></tr>`).join('')}</table>`;
  const mijn = vakkenVan(t, t.speler).sort((a, b) => t.vakken[a].tevredenheid - t.vakken[b].tevredenheid);
  const vakken = mijn.length ? `<h4>Jouw vakken (meest onrustige eerst)</h4><table class="tabel"><tr><th>Vak</th><th class="r">Volk</th><th class="r">Tevreden</th><th>Gebouwd</th></tr>${mijn.map((i) => `<tr class="klik" data-vak="${i}"><td>${h(kaart.vakken[i].naam)}</td><td class="r">${kort(t.vakken[i].bevolking)}</td><td class="r">${Math.round(t.vakken[i].tevredenheid)}</td><td><small>${[t.vakken[i].landbouw ? `akkers ${t.vakken[i].landbouw}` : '', t.vakken[i].markt ? 'markt' : '', t.vakken[i].weg ? 'weg' : '', t.vakken[i].haven ? 'haven' : '', t.vakken[i].nijverheid ? 'nijverheid' : '', t.vakken[i].fort ? 'versterking' : ''].filter(Boolean).join(', ')}</small></td></tr>`).join('')}</table>` : '';
  venster('Overzicht', tabel + vakken, [['Sluiten', () => {}]], true);
  document.querySelectorAll<HTMLElement>('[data-vak]').forEach((r) => r.addEventListener('click', () => {
    const v = Number(r.dataset.vak);
    centreer(v); ui.sel.vak = v; ui.sel.legers = []; sluitVenster();
  }));
}

// ---------- logboek ----------

export function logboek() {
  const t = ui.t;
  if (!t) return;
  const lijst = [...t.berichten].reverse().map((b, i) => `<div class="bericht ${b.soort} ${b.vak !== undefined ? 'klik' : ''}" data-i="${i}"><small>${datumTekst(b.dag)}</small> ${h(b.tekst)}</div>`).join('');
  venster('Logboek', `<div class="logboek">${lijst || '<p>Nog niets gebeurd.</p>'}</div>`, [['Sluiten', () => {}]], true);
  const omgekeerd = [...t.berichten].reverse();
  document.querySelectorAll<HTMLElement>('.logboek .bericht').forEach((el) => el.addEventListener('click', () => {
    const b = omgekeerd[Number(el.dataset.i)];
    if (b.vak !== undefined) { centreer(b.vak); ui.sel.vak = b.vak; ui.sel.legers = []; sluitVenster(); }
  }));
}

// ---------- tijdlijn ----------

export function tijdlijn() {
  const t = ui.t;
  const rijen = alleTijdperken().map((tp) => {
    const nu = t?.tijdperk === tp.id;
    const score = t?.scores.find((s) => s.tijdperk === tp.id);
    return `<div class="tijd ${nu ? 'nu' : ''}"><b>${h(tp.naam)}</b> <small>${datumTekst(dagnummer(tp.van))} – ${datumTekst(dagnummer(tp.tot))}</small>${score ? `<br><small>Jij: ${h(score.factie)} · welvaart ${score.welvaart}, macht ${score.macht}, vrijheid ${score.vrijheid}</small>` : ''}</div>`;
  }).join('');
  venster('Tijdlijn', rijen);
}
import { dagnummerVan as dagnummer } from '../spel/kalender';

// ---------- instellingen ----------

export function instellingen() {
  const i = ui.instellingen;
  const vink = (k: keyof typeof i, tekst: string) => `<label class="vink"><input type="checkbox" data-inst="${k}" ${i[k] ? 'checked' : ''}> ${tekst}</label>`;
  venster('Instellingen', `
    <h4>Klok stilzetten bij</h4>
    ${vink('pauzeBijSlag', 'een veldslag van jouw legers')}
    ${vink('pauzeBijVerlies', 'een vak of versterking die je verliest')}
    ${vink('pauzeBijOorlog', 'een oorlogsverklaring aan jou')}
    ${vink('pauzeBijVorst', 'de dood van een vorst')}
    <p class="klein">Gebeurtenissen en keuzes zetten de klok altijd stil.</p>
    <h4>Tempo en hulp</h4>
    ${vink('sneller', 'de klok vanzelf sneller als er voor jou niets gebeurt')}
    ${vink('tips', 'tips tonen bij de eerste keer')}`);
  document.querySelectorAll<HTMLInputElement>('[data-inst]').forEach((c) => c.addEventListener('change', () => {
    (i as unknown as Record<string, boolean>)[c.dataset.inst!] = c.checked;
    bewaarInstellingen();
  }));
}

// ---------- opslaan ----------

const PLAATSEN = ['belgica-spel-1', 'belgica-spel-2', 'belgica-spel-3'];
export const AUTO = 'belgica-auto';

export function bewaar(sleutel = AUTO): boolean {
  if (!ui.t) return false;
  try { localStorage.setItem(sleutel, JSON.stringify(ui.t)); return true; } catch { return false; }
}

export function lees(sleutel: string): Toestand | null {
  try {
    const s = localStorage.getItem(sleutel);
    return s ? migreer(JSON.parse(s)) : null;
  } catch { return null; }
}

export function opslaan(begin: (t: Toestand) => void) {
  const rij = (s: string, n: string) => {
    const x = lees(s);
    return `<div class="plaats"><div><b>${n}</b><br><small>${x ? `${h(x.facties[x.speler]?.naam ?? '?')}, ${datumTekst(x.dag)}` : 'leeg'}</small></div><div class="rij">${s === AUTO ? '' : `<button data-bewaar="${s}">Bewaren</button>`}<button data-laad="${s}" ${x ? '' : 'disabled'}>Laden</button></div></div>`;
  };
  venster('Opslaan en laden', `
    ${rij(AUTO, 'Automatisch')}
    ${PLAATSEN.map((s, i) => rij(s, `Plaats ${i + 1}`)).join('')}
    <h4>Als bestand</h4>
    <p class="klein">Handig om een spel naar een andere computer of gsm mee te nemen.</p>
    <div class="rij"><button id="exporteer">Bewaren als bestand</button><label class="knop">Bestand openen<input type="file" id="importeer" accept=".json,application/json" hidden></label></div>`);
  document.querySelectorAll<HTMLButtonElement>('[data-bewaar]').forEach((b) => b.addEventListener('click', () => {
    melding(bewaar(b.dataset.bewaar!) ? 'Bewaard.' : 'Bewaren lukt niet in deze browser.');
    opslaan(begin);
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-laad]').forEach((b) => b.addEventListener('click', () => {
    const x = lees(b.dataset.laad!);
    if (x) { sluitVenster(); begin(x); }
  }));
  $('#exporteer').addEventListener('click', () => {
    if (!ui.t) return;
    const blob = new Blob([JSON.stringify(ui.t)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `belgica-${ui.t.facties[ui.t.speler].naam.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ui.t.dag}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $<HTMLInputElement>('#importeer').addEventListener('change', async (e) => {
    const bestand = (e.target as HTMLInputElement).files?.[0];
    if (!bestand) return;
    try {
      const x = migreer(JSON.parse(await bestand.text()));
      if (!x) throw new Error('onbekend');
      sluitVenster();
      begin(x);
    } catch { melding('Dit bestand is geen bewaard spel van Belgica.'); }
  });
}

// ---------- zoeken ----------

export function zoeken() {
  const t = ui.t;
  if (!t) return;
  venster('Zoeken', `<input id="zoekveld" type="search" placeholder="Naam van een vak of macht" autocomplete="off"><div id="zoekuit"></div>`);
  const veld = $<HTMLInputElement>('#zoekveld');
  veld.focus();
  const werk = () => {
    const q = veld.value.trim().toLowerCase();
    if (!q) { $('#zoekuit').innerHTML = ''; return; }
    const vakken = kaart.vakken.filter((v) => v.naam.toLowerCase().includes(q) || v.gebied.toLowerCase().includes(q)).slice(0, 8);
    const machten = Object.values(t.facties).filter((f) => f.bestaat && f.naam.toLowerCase().includes(q)).slice(0, 5);
    $('#zoekuit').innerHTML = [
      ...machten.map((f) => `<div class="lijn" data-macht="${f.id}"><span class="kleur" style="background:${f.kleur}"></span>${h(f.naam)}</div>`),
      ...vakken.map((v) => `<div class="lijn" data-vak="${v.id}">${h(v.naam)} <small>${h(v.gebied)} · ${h(t.facties[t.vakken[v.id].eigenaar].naam)}</small></div>`),
    ].join('') || '<p class="klein">Niets gevonden.</p>';
    document.querySelectorAll<HTMLElement>('#zoekuit [data-vak]').forEach((el) => el.addEventListener('click', () => {
      const v = Number(el.dataset.vak);
      centreer(v); ui.sel.vak = v; ui.sel.legers = []; sluitVenster();
    }));
    document.querySelectorAll<HTMLElement>('#zoekuit [data-macht]').forEach((el) => el.addEventListener('click', () => diplomatie(el.dataset.macht)));
  };
  veld.addEventListener('input', werk);
}
