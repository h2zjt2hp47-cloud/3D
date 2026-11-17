// Belgica: het hoofdscherm, de klok en de bediening.
import { kaart, TERREIN } from './kaart/kaart';
import { datumTekst, seizoenVan } from './spel/kalender';
import { macht, oorlogsscore, vijanden } from './spel/diplomatie';
import {
  bouw, GEBOUWEN, gebouwenNu, gebouwKost, gebouwNaam, inkomenVak, kanBouwen, niveau, rekening, soldijVan, tevredenheidDoel, BELASTING,
  type Belasting, type Gebouw,
} from './spel/economie';
import { dagenTotAankomst, geefBevel, oproepKost, roepOp, splits, voegSamen, voorspelSlag } from './spel/regels';
import { alleTijdperken, einddag, startdag, tijdperk } from './spel/tijdperk';
import { bevriend, hoofd, inOorlog, legersIn, sterkteVan, vakkenVan, type Leger, type Toestand } from './spel/toestand';
import { kies, nieuwSpel, rustig, score, spelerOpstand, volgendeDag, volgendeGebeurtenis } from './spel/verloop';
import { leeftijd } from './spel/vorsten';
import { prijsfactor } from './spel/volgorde';
import { $, centreer, getal, h, melding, opbouw, ui, vuil } from './ui/context';
import { KAARTSOORTEN, kort, legende, type Kaartsoort } from './ui/kaartbeeld';
import { toonOp, verberg } from './ui/tip';
import { AUTO, bewaar, diplomatie, instellingen, lees, logboek, opslaan, overzicht, sluitVenster, tijdlijn, venster, zoeken } from './ui/vensters';

const DAGEN_PER_SECONDE = [0, 1, 3, 8, 20, 60];
const canvas = $<HTMLCanvasElement>('#kaart');
const beeld = ui.beeld;
beeld.aankomst = (l) => (ui.t ? dagenTotAankomst(ui.t, kaart, l) : 0);

// ---------- startscherm ----------

let startTijdperk = 'romeinen';

function toonStart() {
  const start = $('#start');
  const bewaard = lees(AUTO);
  const tp = tijdperk(startTijdperk);
  const groepen = new Map<string, typeof tp.facties>();
  for (const f of tp.facties) {
    if (f.nietKiesbaar || f.laat) continue;
    if (!groepen.has(f.groep)) groepen.set(f.groep, []);
    groepen.get(f.groep)!.push(f);
  }
  start.innerHTML = `
    <div class="start-binnen">
      <h1>Belgica</h1>
      <p class="onder">Een strategiespel over België en de randen, van de Romeinen tot nu.</p>
      <div class="rij">
        ${bewaard ? `<button class="hoofd" id="verder">Verder spelen als ${h(bewaard.facties[bewaard.speler]?.naam ?? '?')} (${datumTekst(bewaard.dag)})</button>` : ''}
        <button id="laadstart">Opslaan en laden…</button>
      </div>
      <p class="kies">Begin in:</p>
      <div class="tijdperken">${alleTijdperken().map((x) => `<button data-tp="${x.id}" class="${x.id === startTijdperk ? 'aan' : ''}">${h(x.naam)}<br><small>${datumTekst(startdag(x)).replace(/^\d+ \S+ /, '')}</small></button>`).join('')}</div>
      <p class="klein uitleg-tp">${h(tp.beschrijving)}</p>
      <p class="kies">Kies wie je speelt:</p>
      ${[...groepen.entries()].map(([titel, lijst]) => `
        <h2>${h(titel)}</h2>
        <div class="stammen">${lijst.map((f) => `
          <button class="stam" data-id="${f.id}">
            <span class="kleur" style="background:${f.kleur}"></span>
            <span><b>${h(f.naam)}</b> <small>${h(f.heerser)}</small><br><span class="uitleg">${h(f.beschrijving)}</span></span>
          </button>`).join('')}
        </div>`).join('')}
      <p class="noot">Gebieden, versterkingen, aantallen en data zijn benaderingen; wat nog na te kijken is, staat zo aangeduid in het spel. Kaart: Natural Earth (publiek domein), aangevuld met de hand.</p>
    </div>`;
  start.hidden = false;
  start.querySelectorAll<HTMLButtonElement>('[data-tp]').forEach((b) => b.addEventListener('click', () => { startTijdperk = b.dataset.tp!; toonStart(); }));
  start.querySelectorAll<HTMLButtonElement>('.stam').forEach((b) => b.addEventListener('click', () => begin(nieuwSpel(b.dataset.id!, Math.floor(Math.random() * 1e9), startTijdperk))));
  $('#verder')?.addEventListener('click', () => begin(bewaard!));
  $('#laadstart').addEventListener('click', () => opslaan(begin));
}

function begin(nieuw: Toestand) {
  ui.t = nieuw;
  $('#start').hidden = true;
  ui.sel.legers = []; ui.sel.vak = null;
  ui.snelheid = 0;
  ui.springen = false;
  gezien = nieuw.berichten.length;
  beeld.pasGrootteAan();
  beeld.toonAlles();
  naarMijnLand(1.6);
  vuil();
  toonKeuze();
}

function naarMijnLand(zoom = 1) {
  const t = ui.t;
  if (!t) return;
  const eigen = vakkenVan(t, t.speler);
  const plek = eigen.length ? eigen : t.legers.filter((l) => l.factie === t.speler).map((l) => l.vak);
  if (!plek.length) return;
  beeld.camera.x = plek.reduce((s, v) => s + kaart.vakken[v].midden[0], 0) / plek.length;
  beeld.camera.y = plek.reduce((s, v) => s + kaart.vakken[v].midden[1], 0) / plek.length;
  beeld.camera.schaal *= zoom;
}

// ---------- klok ----------

function zetSnelheid(s: number) {
  const t = ui.t;
  if (!t) return;
  if (s > 0 && t.wachtend.length) { toonKeuze(); return; }
  ui.snelheid = s;
  ui.springen = false;
  if (s > 0) ui.laatsteSnelheid = s;
  else bewaar();
  vuil();
}

/** springen naar de volgende gebeurtenis: zo snel mogelijk tot er iets voor jou gebeurt */
function spring() {
  const t = ui.t;
  if (!t || t.wachtend.length) { toonKeuze(); return; }
  ui.springen = true;
  ui.snelheid = 0;
  vuil();
}

let gezien = 0;
/** moet de klok stoppen voor een nieuw bericht? */
function moetStoppen(t: Toestand): boolean {
  const nieuw = t.berichten.slice(gezien);
  gezien = t.berichten.length;
  const ik = t.speler, i = ui.instellingen;
  for (const b of nieuw) {
    const betrokken = b.wie?.includes(ik) || b.wie?.some((f) => t.facties[f]?.heer === ik);
    if (b.soort === 'slag' && i.pauzeBijSlag && betrokken) return true;
    if (b.soort === 'verovering' && i.pauzeBijVerlies && b.wie?.[1] === ik) return true;
    if (b.soort === 'diplomatie' && i.pauzeBijOorlog && b.wie?.[1] === ik && /oorlog/.test(b.tekst)) return true;
    if (b.vorst && i.pauzeBijVorst) return true;
  }
  return false;
}

let opgespaard = 0;
let vorige = performance.now();
let laatstePaneel = 0;
let muisOpPaneel = false;

function frame(nu: number) {
  const dt = Math.min(250, nu - vorige);
  vorige = nu;
  const t = ui.t;
  if (t && ui.springen) {
    // in stukjes van ±25 ms, zodat het scherm blijft reageren
    const tot = performance.now() + 25;
    const doel = volgendeGebeurtenis(t);
    while (performance.now() < tot) {
      const verder = volgendeDag(t, kaart);
      if (!verder || moetStoppen(t) || !rustig(t) || (doel && t.dag >= doel.dag)) {
        ui.springen = false;
        if (!verder) toonKeuze();
        bewaar();
        break;
      }
    }
    vuil();
  } else if (t && ui.snelheid > 0) {
    const versneld = ui.instellingen.sneller && rustig(t) ? 5 : 1;
    opgespaard += (dt / 1000) * DAGEN_PER_SECONDE[ui.snelheid] * versneld;
    let n = 0;
    while (opgespaard >= 1 && n < 80) {
      opgespaard -= 1;
      n++;
      const verder = volgendeDag(t, kaart);
      if (!verder) { ui.snelheid = 0; opgespaard = 0; toonKeuze(); bewaar(); break; }
      if (moetStoppen(t)) { ui.snelheid = 0; opgespaard = 0; bewaar(); break; }
      if (t.dag % 60 === 0) bewaar();
    }
    if (n) vuil();
  }
  if (t) {
    ui.sel.legers = ui.sel.legers.filter((id) => t.legers.some((l) => l.id === id));
    beeld.teken(t, ui.sel, nu);
    if (ui.vuil && !muisOpPaneel && nu - laatstePaneel > (ui.snelheid || ui.springen ? 250 : 0)) {
      werkBalkBij(); werkMeldingenBij(); werkPaneelBij(); werkBerichtenBij(); werkKaartknoppenBij();
      ui.vuil = false;
      laatstePaneel = nu;
    }
  }
  requestAnimationFrame(frame);
}

// ---------- bovenbalk ----------

function werkBalkBij() {
  const t = ui.t!;
  const f = t.facties[t.speler];
  const tp = tijdperk(t.tijdperk);
  const s = score(t, t.speler);
  const r = rekening(t, t.speler, kaart);
  const volgende = volgendeGebeurtenis(t);
  const stil = !ui.snelheid && !ui.springen;
  const vorstTip = f.vorst ? `<b>${h(f.heerser)}</b><br>${leeftijd(t, f.vorst)} jaar, regeert sinds ${datumTekst(f.vorst.sinds)}<br>Erfgenaam: ${f.vorst.erfgenaam ? 'ja' : 'nee'}${f.vorst.verzonnen ? '<br><i>Verzonnen opvolger</i>' : ''}` : `<b>${h(f.heerser)}</b>`;
  $('#balk').innerHTML = `
    <div class="wie" data-tip="${h(vorstTip)}"><span class="kleur" style="background:${f.kleur}"></span><span><b>${h(f.naam)}</b><small>${h(f.heerser)}${f.heer ? ` · onder ${h(t.facties[f.heer].naam)}` : ''}</small></span></div>
    <div class="klok">
      <button class="speel" title="Spatie">${stil ? '▶' : '⏸'}</button>
      <div class="datum" data-tip="${h(`<b>${h(tp.naam)}</b><br>Seizoen: ${seizoenVan(t.dag)}`)}"><b>${datumTekst(t.dag)}</b><small>${stil ? '<span class="gepauzeerd">GEPAUZEERD</span>' : h(tp.naam)}${t.automatisch ? ' · <span class="groen">computer speelt</span>' : ''}</small></div>
      <div class="snelheden">${[1, 2, 3, 4, 5].map((n) => `<button data-s="${n}" class="${ui.snelheid === n ? 'aan' : ''}" title="Snelheid ${n} (toets ${n})">${'›'.repeat(Math.min(n, 3))}${n > 3 ? n : ''}</button>`).join('')}</div>
      <button id="spring" class="${ui.springen ? 'aan' : ''}" data-tip="${h(volgende ? `Spring tot de volgende gebeurtenis:<br><b>${h(volgende.titel)}</b><br>${datumTekst(volgende.dag)}<br><small>Stopt eerder als er iets voor jou gebeurt. Toets: punt.</small>` : 'Spring vooruit')}">⏩</button>
    </div>
    <div class="cijfers">
      <span data-tip="${h(opbouw('Zilver per maand', [['Belastingen', r.belasting], ['Steun van buiten', r.steun], ['Schatting', r.schatting], ['Soldij', r.soldij]]) + `<p>In de schatkist: ${getal(f.schat)}</p>`)}" class="${f.schat < 0 ? 'rood' : ''}">🪙 ${getal(f.schat)} <small>${getal(r.netto, true)}</small></span>
      <span data-tip="${h(`<b>Mankracht</b><br>Mannen die je nog kan oproepen: ${getal(f.mankracht)}<br>Onder de wapens: ${getal(sterkteVan(t, t.speler))}`)}">🛡️ ${kort(f.mankracht)}</span>
      ${f.moeheid >= 5 ? `<span data-tip="${h('<b>Oorlogsmoeheid</b><br>Stijgt met elke maand oorlog en elke nederlaag en maakt je volk ontevreden. Daalt in vrede.')}" class="${f.moeheid > 50 ? 'rood' : ''}">😩 ${Math.round(f.moeheid)}</span>` : ''}
      <span data-tip="${h(`<b>Score in dit tijdperk</b><br>Welvaart ${s.welvaart} · Macht ${s.macht} · Vrijheid ${s.vrijheid}`)}">⭐ ${s.welvaart + s.macht + s.vrijheid}</span>
    </div>
    <div class="knoppen">
      <button id="bdiplo" title="Diplomatie (D)">Diplomatie</button>
      <button id="boverzicht" title="Overzicht (L)">Overzicht</button>
      <button id="bmenu">Menu</button>
    </div>`;
  $('#balk .speel').addEventListener('click', () => zetSnelheid(ui.snelheid || ui.springen ? 0 : ui.laatsteSnelheid));
  $('#balk').querySelectorAll<HTMLButtonElement>('[data-s]').forEach((b) => b.addEventListener('click', () => zetSnelheid(Number(b.dataset.s))));
  $('#spring').addEventListener('click', () => (ui.springen ? zetSnelheid(0) : spring()));
  $('#bdiplo').addEventListener('click', () => { zetSnelheid(0); diplomatie(); });
  $('#boverzicht').addEventListener('click', () => { zetSnelheid(0); overzicht(); });
  $('#bmenu').addEventListener('click', toonMenu);
}

function toonMenu() {
  zetSnelheid(0);
  venster('Menu', '<p class="klein">Het spel wordt vanzelf bewaard in deze browser.</p>', [
    ['Verder', () => {}],
    ['Opslaan en laden', () => opslaan(begin)],
    ['Logboek', logboek],
    ['Tijdlijn', tijdlijn],
    ['Instellingen', instellingen],
    [ui.t?.automatisch ? 'Zelf verder spelen' : 'Computer speelt mijn land', () => { if (ui.t) { ui.t.automatisch = !ui.t.automatisch; melding(ui.t.automatisch ? 'De computer speelt nu je land. Zet de klok aan en kijk toe; via het menu neem je het terug over.' : 'Je speelt weer zelf.'); vuil(); } }],
    ['Uitleg', toonUitleg],
    ['Nieuw spel', () => { bewaar(); ui.t = null; toonStart(); }],
  ]);
}

function toonUitleg() {
  venster('Hoe speel je?', `
    <ul>
      <li><b>Klik</b> op een leger (een gekleurde fiche) om het te kiezen; <b>Shift+klik</b> kiest er meer. <b>Rechtsklik</b>, <b>Ctrl+klik</b> of lang drukken op een vak stuurt ze erheen. Je ziet de route en de dagen tot aankomst, en een voorspelling als er vijanden zijn.</li>
      <li>Een leger in vijandelijk land bezet het vak na een tijd; een versterking moet je belegeren tot het garnizoen op is. Legers met lage moraal trekken zich terug; op eigen grond herstellen ze. Te veel soldaten in één vak raken uitgeput.</li>
      <li><b>Zilver</b> komt uit belastingen; legers kosten soldij. Klik op een eigen vak om te <b>bouwen</b> of troepen op te roepen. Beweeg over een getal voor de opbouw.</li>
      <li><b>Tevredenheid</b> daalt door hoge belastingen, vreemd bestuur, oorlog en plundering. Veroverd land dat te ontevreden is, komt in opstand.</li>
      <li><b>Diplomatie</b> (D): vrede, bondgenootschap, oorlog, geschenken en vanaf de middeleeuwen huwelijken. Je ziet vooraf of de ander zal aanvaarden, en waarom.</li>
      <li>Sterft een vorstenhuis uit zonder erfgenaam, dan erft een verwant huis het land. Verdwijnt je eigen macht, dan speel je verder als wie je land heeft.</li>
      <li>Aan het einde van een <b>tijdperk</b> kies je onder wie je verder speelt; je land blijft van jou. ⏩ springt naar de volgende gebeurtenis.</li>
      <li>Toetsen: <b>spatie</b> klok, <b>1–5</b> snelheid, <b>.</b> springen, <b>Q W E R T</b> kaartsoorten, <b>D</b> diplomatie, <b>L</b> overzicht, <b>J</b> logboek, <b>F</b> zoeken, <b>H</b> naar je land, <b>Esc</b> sluiten.</li>
    </ul>`);
}

// ---------- meldingen ----------

interface Waarschuwing { tekst: string; tip: string; soort: 'rood' | 'groen' | 'gewoon'; doe: () => void }

function waarschuwingen(t: Toestand): Waarschuwing[] {
  const uit: Waarschuwing[] = [];
  const ik = t.speler, f = t.facties[ik];
  for (const v of vijanden(t, ik)) {
    if (t.facties[v].heer) continue;
    const s = oorlogsscore(t, hoofd(t, ik), v);
    uit.push({ tekst: `⚔ ${t.facties[v].naam} ${getal(s, true)}`, tip: `Oorlog met ${h(t.facties[v].naam)}. Oorlogsscore ${s}. Klik voor diplomatie.`, soort: s < -20 ? 'rood' : 'gewoon', doe: () => diplomatie(v) });
  }
  const stil = t.legers.filter((l) => l.factie === ik && !l.pad.length && !l.inStrijd);
  if (vijanden(t, ik).length && stil.length) uit.push({ tekst: `🛡️ ${stil.length} zonder bevel`, tip: 'Legers die stilstaan terwijl je in oorlog bent. Klik om het eerste te kiezen.', soort: 'gewoon', doe: () => { ui.sel.legers = [stil[0].id]; ui.sel.vak = null; centreer(stil[0].vak); } });
  if (f.schat < 0) uit.push({ tekst: '🪙 Schatkist leeg', tip: 'Je legers krijgen geen soldij en verliezen moed. Verhoog de belasting, stuur legers naar huis of sluit vrede.', soort: 'rood', doe: () => { ui.sel.legers = []; ui.sel.vak = null; } });
  const onrust = vakkenVan(t, ik).filter((i) => t.vakken[i].tevredenheid < 28);
  if (onrust.length) uit.push({ tekst: `🔥 ${onrust.length} onrustig`, tip: 'Vakken die in opstand kunnen komen. Helpt: lagere belasting, een leger in het vak, een markt, vrede.', soort: 'rood', doe: () => { ui.sel.vak = onrust[0]; ui.sel.legers = []; centreer(onrust[0]); } });
  if (f.vorst && !f.vorst.erfgenaam && tijdperk(t.tijdperk).huwelijken) uit.push({ tekst: '👑 Geen erfgenaam', tip: 'Sterft je vorst zonder erfgenaam, dan kan een verwant huis je land erven, of komt er onrust. Huwelijken met andere huizen geven jou erfrechten op hun land.', soort: 'rood', doe: () => diplomatie() });
  if (f.heer) uit.push({ tekst: `⛓ Onder ${t.facties[f.heer].naam}`, tip: 'Je betaalt een derde van je inkomsten. Je kan in opstand komen vanuit je paneel.', soort: 'gewoon', doe: () => { ui.sel.legers = []; ui.sel.vak = null; } });
  const goedkoopst = Math.min(...gebouwenNu(t).map((g) => gebouwKost(t, g)));
  if (!f.heer && f.schat > goedkoopst * 3 && !vakkenVan(t, ik).some((i) => t.vakken[i].bouw)) uit.push({ tekst: '🔨 Zilver over', tip: 'Je hebt zilver genoeg om te bouwen. Klik op een eigen vak.', soort: 'groen', doe: () => { const v = f.hoofdstad ?? vakkenVan(t, ik)[0]; if (v !== undefined) { ui.sel.vak = v; ui.sel.legers = []; centreer(v); } } });
  if (t.wachtend.length) uit.push({ tekst: '✉ Keuze wacht', tip: 'Er wacht een beslissing.', soort: 'groen', doe: toonKeuze });
  return uit;
}

let laatsteWaarschuwingen: Waarschuwing[] = [];
function werkMeldingenBij() {
  const t = ui.t!;
  laatsteWaarschuwingen = waarschuwingen(t);
  $('#meldingen').innerHTML = laatsteWaarschuwingen.map((w, i) => `<button class="melding-knop ${w.soort}" data-w="${i}" data-tip="${h(w.tip)}">${h(w.tekst)}</button>`).join('');
  $('#meldingen').querySelectorAll<HTMLButtonElement>('[data-w]').forEach((b) => b.addEventListener('click', () => { laatsteWaarschuwingen[Number(b.dataset.w)].doe(); vuil(); }));
}

// ---------- kaartsoorten ----------

function werkKaartknoppenBij() {
  const lg = legende(beeld.soort);
  $('#kaartknoppen').innerHTML = `
    <div class="soorten">${KAARTSOORTEN.map((s) => `<button data-ks="${s.soort}" class="${beeld.soort === s.soort ? 'aan' : ''}" title="${s.naam} (${s.toets})">${s.naam}</button>`).join('')}</div>
    ${lg.length ? `<div class="legende">${lg.map(([k, n]) => `<span><i style="background:${k}"></i>${h(n)}</span>`).join('')}</div>` : ''}`;
  $('#kaartknoppen').querySelectorAll<HTMLButtonElement>('[data-ks]').forEach((b) => b.addEventListener('click', () => { beeld.soort = b.dataset.ks as Kaartsoort; vuil(); }));
}

// ---------- zijpaneel ----------

function werkPaneelBij() {
  const p = $('#paneel');
  const t = ui.t!;
  const gekozen = ui.sel.legers.map((id) => t.legers.find((l) => l.id === id)).filter((l): l is Leger => !!l);
  if (gekozen.length) { p.innerHTML = legerPaneel(t, gekozen); koppelLegerKnoppen(gekozen); }
  else if (ui.sel.vak !== null) { p.innerHTML = vakPaneel(t, ui.sel.vak); koppelVakKnoppen(ui.sel.vak); }
  else { p.innerHTML = factiePaneel(t); koppelFactieKnoppen(); }
  p.hidden = false;
}

function factiePaneel(t: Toestand): string {
  const f = t.facties[t.speler];
  const r = rekening(t, f.id, kaart);
  const mijnLegers = t.legers.filter((l) => l.factie === f.id);
  const eigen = vakkenVan(t, f.id);
  const bezig = eigen.filter((i) => t.vakken[i].bouw);
  const v = f.vorst;
  const verwant = t.huwelijk.filter((x) => x.split('|').includes(f.id)).map((x) => t.facties[x.split('|').find((y) => y !== f.id)!]?.naam ?? '');
  return `
    <h3><span class="kleur" style="background:${f.kleur}"></span>${h(f.naam)}</h3>
    <p class="klein">${h(f.beschrijving)}</p>
    <table>
      <tr><td>Leider</td><td>${h(f.heerser)}${v ? ` (${leeftijd(t, v)})` : ''}</td></tr>
      ${v ? `<tr><td>Erfgenaam</td><td>${v.erfgenaam ? 'ja' : '<span class="rood">nee</span>'}${verwant.length ? ` · verwant met ${h(verwant.join(', '))}` : ''}</td></tr>` : ''}
      ${f.leenheer && t.facties[f.leenheer]?.bestaat ? `<tr><td>Leenheer</td><td>${h(t.facties[f.leenheer].naam)} <small>(een tiende van je inkomen)</small></td></tr>` : ''}
      <tr><td>Land</td><td>${eigen.length} vakken, ${kort(eigen.reduce((s, i) => s + t.vakken[i].bevolking, 0))} mensen</td></tr>
    </table>
    <h4>Schatkist: 🪙 ${getal(f.schat)} <small>${getal(r.netto, true)}/maand</small></h4>
    ${f.heer ? `<button id="opstand" class="gevaar">In opstand komen tegen ${h(t.facties[f.heer].naam)}</button>` : `
    <div class="rij keuzes" data-tip="${h('<b>Belastingdruk</b><br>Hoog: de helft meer zilver, maar het volk wordt ontevreden.<br>Laag: minder zilver, meer rust.')}">${(Object.keys(BELASTING) as Belasting[]).map((b) => `<button data-bel="${b}" class="${f.belasting === b ? 'aan' : ''}">${BELASTING[b].naam}</button>`).join('')}</div>`}
    <h4>Legers</h4>
    ${mijnLegers.length ? mijnLegers.map((l) => `<div class="lijn" data-leger="${l.id}">${h(l.naam)} <small>${kort(l.sterkte)} · ${l.inStrijd ? 'in de strijd' : l.pad.length ? `→ ${h(kaart.vakken[l.pad[l.pad.length - 1]].naam)} (${dagenTotAankomst(t, kaart, l)} d)` : h(kaart.vakken[l.vak].naam)}</small></div>`).join('') : '<p class="klein">Geen legers. Klik op een eigen vak om op te roepen.</p>'}
    ${bezig.length ? `<h4>In aanbouw</h4>${bezig.map((i) => `<div class="lijn" data-ganaar="${i}">${h(gebouwNaam(t.vakken[i].bouw!.wat, niveau(t.vakken[i], t.vakken[i].bouw!.wat) + 1))} in ${h(kaart.vakken[i].naam)} <small>nog ${t.vakken[i].bouw!.klaar - t.dag} d</small></div>`).join('')}` : ''}
    <p class="klein"><a href="#" id="uitleg">Hoe speel je?</a> · <a href="#" id="naarhuis">Naar mijn land (H)</a></p>`;
}

function koppelFactieKnoppen() {
  const t = ui.t!;
  $('#uitleg')?.addEventListener('click', (e) => { e.preventDefault(); toonUitleg(); });
  $('#naarhuis')?.addEventListener('click', (e) => { e.preventDefault(); naarMijnLand(); });
  $('#opstand')?.addEventListener('click', () => { if (spelerOpstand(t, kaart)) vuil(); });
  document.querySelectorAll<HTMLButtonElement>('[data-bel]').forEach((b) => b.addEventListener('click', () => { t.facties[t.speler].belasting = b.dataset.bel as Belasting; vuil(); }));
  document.querySelectorAll<HTMLElement>('[data-leger]').forEach((el) => el.addEventListener('click', () => {
    const l = t.legers.find((x) => x.id === Number(el.dataset.leger));
    if (l) { ui.sel.legers = [l.id]; centreer(l.vak); vuil(); }
  }));
  document.querySelectorAll<HTMLElement>('[data-ganaar]').forEach((el) => el.addEventListener('click', () => {
    const v = Number(el.dataset.ganaar);
    centreer(v); ui.sel.vak = v; vuil();
  }));
}

function status(t: Toestand, x: Leger): string {
  const v = t.vakken[x.vak];
  if (x.inStrijd) return 'in de strijd';
  if (x.pad.length) return `onderweg naar ${kaart.vakken[x.pad[x.pad.length - 1]].naam}, nog ${dagenTotAankomst(t, kaart, x)} dagen`;
  if (v.bezetter === x.factie) return v.fort && v.garnizoen > 0 ? `belegert ${v.fortNaam} (garnizoen ${Math.round(v.garnizoen)})` : `bezet het vak (${Math.round(v.bezetting * 100)}%)`;
  return 'staat stil';
}

function legerPaneel(t: Toestand, legers: Leger[]): string {
  const totaal = legers.reduce((s, l) => s + l.sterkte, 0);
  const eigen = legers.every((l) => l.factie === t.speler);
  const l = legers[0];
  const f = t.facties[l.factie];
  const zelfdeVak = eigen && legers.length > 1 && legers.every((x) => x.vak === l.vak);
  const anderenHier = eigen && legers.length === 1 ? legersIn(t, l.vak).filter((x) => x.factie === l.factie && x.id !== l.id) : [];
  const doel = l.pad.length ? l.pad[l.pad.length - 1] : null;
  const voorspelling = eigen && doel !== null ? voorspelSlag(t, kaart, legers.filter((x) => x.pad[x.pad.length - 1] === doel), doel) : null;
  const soldij = soldijVan(t, l.factie) * (totaal / Math.max(1, sterkteVan(t, l.factie)));
  return `
    <h3><span class="kleur" style="background:${f.kleur}"></span>${legers.length > 1 ? `${legers.length} legers` : h(l.naam)}</h3>
    <p>${h(f.naam)} · ${getal(totaal)} man${eigen ? ` · soldij ${getal(soldij)}/maand` : ''}</p>
    ${legers.map((x) => `<div class="leger"><div>${kort(x.sterkte)} · ${h(kaart.vakken[x.vak].naam)}<br><small>${h(status(t, x))}</small></div><div class="moraal" data-tip="Moraal ${Math.round(x.moraal * 100)}%. Onder 30% trekt het leger zich terug."><i style="width:${x.moraal * 100}%"></i></div></div>`).join('')}
    ${voorspelling ? `<div class="oordeel ${voorspelling.oordeel === 'goed' ? 'ja' : voorspelling.oordeel === 'slecht' ? 'nee' : ''}"><b>Verwachte slag bij ${h(kaart.vakken[doel!].naam)}: ${voorspelling.oordeel}</b> (verhouding ${voorspelling.verhouding.toFixed(1).replace('.', ',')})<table>${voorspelling.redenen.map(([a, b]) => `<tr><td>${h(a)}</td><td class="r">${h(b)}</td></tr>`).join('')}</table></div>` : ''}
    ${eigen ? `
      <p class="klein">Rechtsklik, Ctrl+klik of lang drukken op een vak om erheen te trekken.</p>
      <div class="rij">
        <button id="bestemming" class="hoofd">Kies bestemming</button>
        ${legers.length === 1 ? `<button id="splits" ${l.sterkte < 1000 || l.inStrijd ? 'disabled' : ''}>Splitsen</button>` : ''}
        ${zelfdeVak ? '<button id="samen">Samenvoegen</button>' : ''}
        ${anderenHier.length ? `<button id="samenHier">Samenvoegen met ${anderenHier.length} hier</button>` : ''}
        <button id="stop">Stoppen</button>
        <button id="ontbind" data-tip="Het leger naar huis sturen: geen soldij meer; de helft van de mannen komt terug bij je mankracht.">Naar huis</button>
      </div>` : `<p class="klein">${inOorlog(t, l.factie, t.speler) ? '<span class="rood">Vijand.</span>' : bevriend(t, l.factie, t.speler) ? 'Bondgenoot.' : 'Neutraal.'} Kracht van ${h(t.facties[hoofd(t, f.id)].naam)}: ${kort(macht(t, hoofd(t, f.id)))}.</p>`}`;
}

let doelModus = false;

function koppelLegerKnoppen(legers: Leger[]) {
  const t = ui.t!;
  $('#bestemming')?.addEventListener('click', () => { doelModus = true; melding('Tik of klik nu op het vak waar de legers heen moeten.'); });
  $('#splits')?.addEventListener('click', () => { const n = splits(t, legers[0]); if (n) ui.sel.legers = [legers[0].id, n.id]; vuil(); });
  $('#samen')?.addEventListener('click', () => { const r = voegSamen(t, legers); if (r) ui.sel.legers = [r.id]; vuil(); });
  $('#samenHier')?.addEventListener('click', () => {
    const l = legers[0];
    const r = voegSamen(t, [l, ...legersIn(t, l.vak).filter((x) => x.factie === l.factie && x.id !== l.id)]);
    if (r) ui.sel.legers = [r.id];
    vuil();
  });
  $('#stop')?.addEventListener('click', () => { for (const l of legers) { l.pad = []; l.voortgang = 0; } vuil(); });
  $('#ontbind')?.addEventListener('click', () => {
    for (const l of legers) {
      if (l.inStrijd) continue;
      t.facties[l.factie].mankracht += l.sterkte / 2;
      t.legers = t.legers.filter((x) => x !== l);
    }
    ui.sel.legers = [];
    vuil();
  });
}

function vakPaneel(t: Toestand, i: number): string {
  const v = kaart.vakken[i], s = t.vakken[i];
  const e = t.facties[s.eigenaar];
  const eigen = s.eigenaar === t.speler && !e.heer;
  const legers = legersIn(t, i);
  const f = t.facties[t.speler];
  const doel = tevredenheidDoel(t, i);
  const stap = Math.max(1, Math.round(prijsfactor(t.tijdperk) / 2));
  return `
    <h3><span class="kleur" style="background:${e.kleur}"></span>${h(v.naam)}</h3>
    <p class="klein">Vandaag: ${h(v.gebied)}</p>
    <table>
      <tr><td>Eigenaar</td><td>${h(e.naam)}${e.heer ? ` (onder ${h(t.facties[e.heer].naam)})` : ''}</td></tr>
      <tr><td>Volk</td><td>${h(t.facties[s.oorsprong]?.naam ?? '?')}</td></tr>
      <tr><td>Terrein</td><td>${TERREIN[v.terrein].naam}${v.rivier ? ', aan een rivier' : ''}${v.kust ? ', aan zee' : ''} <small>(verdediging ×${TERREIN[v.terrein].verdediging.toFixed(2).replace('.', ',')})</small></td></tr>
      <tr><td>Bevolking</td><td>${getal(s.bevolking)}</td></tr>
      <tr><td>Tevredenheid</td><td data-tip="${h(`Gaat langzaam naar ${Math.round(doel)}. Onder 25 kan een veroverd vak in opstand komen.`)}"><span class="balkje"><i style="width:${s.tevredenheid}%;background:${s.tevredenheid < 30 ? '#d0543c' : s.tevredenheid < 50 ? '#e0b84a' : '#7bc96f'}"></i></span> ${Math.round(s.tevredenheid)} <small>→ ${Math.round(doel)}</small></td></tr>
      <tr><td>Opbrengst</td><td>🪙 ${inkomenVak(t, kaart, i).toFixed(1).replace('.', ',')} per maand</td></tr>
      <tr><td>Gebouwd</td><td>${gebouwd(i)}</td></tr>
      ${s.fort ? `<tr><td>Versterking</td><td>${h(s.fortNaam ?? '')}: ${Math.round(s.garnizoen)} / ${s.fort}</td></tr>` : ''}
      ${s.bezetter ? `<tr><td>Bezetting</td><td>${h(t.facties[s.bezetter].naam)}, ${Math.round(s.bezetting * 100)}%</td></tr>` : ''}
      <tr><td>Legers</td><td>${legers.length ? legers.map((l) => `${h(t.facties[l.factie].naam)} ${kort(l.sterkte)}`).join('<br>') : 'geen'}</td></tr>
    </table>
    ${eigen ? `
      <h4>Oproepen <small>(${kort(f.mankracht)} man, 🪙 ${getal(f.schat)})</small></h4>
      <div class="rij">${[2000 * stap, 5000 * stap].map((n) => `<button data-op="${n}" ${f.mankracht < n || f.schat < oproepKost(n, t) ? 'disabled' : ''}>${kort(n)} <small>🪙 ${oproepKost(n, t)}</small></button>`).join('')}</div>
      <h4>Bouwen</h4>
      ${s.bouw ? `<p class="klein">Bezig: ${h(gebouwNaam(s.bouw.wat, niveau(s, s.bouw.wat) + 1))}, nog ${s.bouw.klaar - t.dag} dagen.</p>` : ''}
      ${gebouwenNu(t).map((g) => {
        const nee = kanBouwen(t, t.speler, i, g, kaart);
        const info = GEBOUWEN[g];
        const niv = niveau(s, g);
        if (niv >= info.max) return '';
        return `<button class="bouw" data-bouw="${g}" ${nee ? `disabled data-tip="${h(nee)}"` : ''}><span><b>${h(gebouwNaam(g, niv + 1))}</b> <small>${niv}/${info.max}</small><br><small>${h(info.uitleg)}</small></span><span>🪙 ${gebouwKost(t, g)}<br><small>${info.dagen} d</small></span></button>`;
      }).join('')}` : ''}`;
}

function gebouwd(i: number): string {
  const s = ui.t!.vakken[i];
  const delen: string[] = [];
  for (const g of Object.keys(GEBOUWEN) as Gebouw[]) {
    const n = niveau(s, g);
    if (n) delen.push(gebouwNaam(g, n).toLowerCase());
  }
  return delen.join(', ') || 'niets';
}

function koppelVakKnoppen(i: number) {
  const t = ui.t!;
  document.querySelectorAll<HTMLButtonElement>('[data-bouw]').forEach((b) => b.addEventListener('click', () => { bouw(t, t.speler, i, b.dataset.bouw as Gebouw, kaart); vuil(); }));
  document.querySelectorAll<HTMLButtonElement>('[data-op]').forEach((b) => b.addEventListener('click', () => {
    const l = roepOp(t, t.speler, i, Number(b.dataset.op));
    if (l) { ui.sel.legers = [l.id]; ui.sel.vak = null; }
    vuil();
  }));
}

// ---------- berichten ----------

function werkBerichtenBij() {
  const t = ui.t!;
  const laatste = t.berichten.slice(-5).reverse();
  $('#berichten').innerHTML = laatste.map((b, i) => `<div class="bericht ${b.soort}" data-i="${i}"><small>${datumTekst(b.dag)}</small> ${h(b.tekst)}</div>`).join('') + '<button id="ballog" class="klein-knop">Logboek (J)</button>';
  $('#berichten').querySelectorAll<HTMLElement>('.bericht').forEach((el) => el.addEventListener('click', () => {
    const b = laatste[Number(el.dataset.i)];
    if (b.vak !== undefined) { centreer(b.vak); ui.sel.vak = b.vak; ui.sel.legers = []; vuil(); }
  }));
  $('#ballog').addEventListener('click', logboek);
}

// ---------- keuzes ----------

function toonKeuze() {
  const t = ui.t;
  if (!t || !t.wachtend.length) return;
  ui.snelheid = 0;
  ui.springen = false;
  const k = t.wachtend[0];
  const tekst = k.tekst.split('\n\n').map((p) => `<p>${h(p).replace(/\n/g, '<br>')}</p>`).join('');
  const uitleg = k.opties.some((o) => o.uitleg) ? `<ul class="opties">${k.opties.map((o) => `<li><b>${h(o.tekst)}</b>${o.uitleg ? `: ${h(o.uitleg)}` : ''}</li>`).join('')}</ul>` : '';
  venster(h(k.titel), tekst + uitleg, k.opties.map((o, i) => [h(o.tekst), () => {
    kies(t, kaart, k.id, i);
    gezien = t.berichten.length;
    vuil();
    if (k.id.startsWith('overgang')) { beeld.toonAlles(); naarMijnLand(1.4); }
    if (t.wachtend.length) toonKeuze();
  }]));
}

// ---------- muis, toetsen, aanraking ----------

let sleep: { x: number; y: number; cx: number; cy: number; bewogen: boolean } | null = null;
const vingers = new Map<number, { x: number; y: number }>();
let knijp: { afstand: number; schaal: number } | null = null;
let lang = 0;
let langGedaan = false;

function plek(e: PointerEvent | MouseEvent): [number, number] {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

for (const id of ['#paneel', '#balk', '#berichten', '#meldingen', '#kaartknoppen']) {
  $(id).addEventListener('pointerdown', () => { muisOpPaneel = true; });
}
window.addEventListener('pointerup', () => { setTimeout(() => { muisOpPaneel = false; }, 0); });

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  verberg();
  canvas.setPointerCapture(e.pointerId);
  vingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (vingers.size === 2) {
    const [a, b] = [...vingers.values()];
    knijp = { afstand: Math.hypot(a.x - b.x, a.y - b.y), schaal: beeld.camera.schaal };
    sleep = null;
    clearTimeout(lang);
    return;
  }
  sleep = { x: e.clientX, y: e.clientY, cx: beeld.camera.x, cy: beeld.camera.y, bewogen: false };
  langGedaan = false;
  if (e.pointerType === 'touch') {
    const [x, y] = plek(e);
    clearTimeout(lang);
    lang = window.setTimeout(() => {
      if (sleep && !sleep.bewogen && ui.sel.legers.length) { langGedaan = true; beveel(x, y); }
    }, 550);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (vingers.has(e.pointerId)) vingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (knijp && vingers.size === 2) {
    const [a, b] = [...vingers.values()];
    const r = canvas.getBoundingClientRect();
    const nieuw = knijp.schaal * (Math.hypot(a.x - b.x, a.y - b.y) / knijp.afstand);
    beeld.zoom(nieuw / beeld.camera.schaal, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    return;
  }
  if (!sleep) { zweef(e); return; }
  const dx = e.clientX - sleep.x, dy = e.clientY - sleep.y;
  if (Math.hypot(dx, dy) > 6) { sleep.bewogen = true; clearTimeout(lang); }
  if (sleep.bewogen) {
    beeld.camera.x = sleep.cx - dx / beeld.camera.schaal;
    beeld.camera.y = sleep.cy - dy / beeld.camera.schaal;
  }
});
canvas.addEventListener('pointerleave', () => verberg());

/** uitleg over het vak onder de muis (niet op een aanraakscherm) */
let zweefVak: number | null = null;
function zweef(e: PointerEvent) {
  const t = ui.t;
  if (!t || e.pointerType === 'touch') return;
  const [x, y] = plek(e);
  const v = beeld.vakOp(x, y);
  if (v === null) { if (zweefVak !== null) verberg(); zweefVak = null; return; }
  zweefVak = v;
  const s = t.vakken[v], e2 = t.facties[s.eigenaar];
  const legers = legersIn(t, v);
  toonOp(`<b>${h(kaart.vakken[v].naam)}</b> <small>${h(kaart.vakken[v].gebied)}</small><br><span class="kleur" style="background:${e2.kleur}"></span>${h(e2.naam)}<br>${TERREIN[kaart.vakken[v].terrein].naam} · ${kort(s.bevolking)} mensen · tevreden ${Math.round(s.tevredenheid)}${s.fort ? `<br>${h(s.fortNaam ?? '')}` : ''}${legers.length ? `<br>${legers.map((l) => `${h(t.facties[l.factie].naam)} ${kort(l.sterkte)}`).join(', ')}` : ''}${ui.sel.legers.length ? '<br><small>Rechtsklik: hierheen trekken</small>' : ''}`, e.clientX, e.clientY);
}

const loslaten = (e: PointerEvent) => {
  vingers.delete(e.pointerId);
  if (vingers.size < 2) knijp = null;
};
canvas.addEventListener('pointercancel', (e) => { loslaten(e); sleep = null; clearTimeout(lang); });
canvas.addEventListener('pointerup', (e) => {
  loslaten(e);
  clearTimeout(lang);
  const s = sleep;
  sleep = null;
  const t = ui.t;
  if (!s || s.bewogen || !t || langGedaan) return;
  const [x, y] = plek(e);
  if (e.ctrlKey || doelModus) { doelModus = false; beveel(x, y); return; }
  const leger = beeld.legerOp(x, y);
  if (leger !== null) {
    const l = t.legers.find((q) => q.id === leger)!;
    if (e.shiftKey && l.factie === t.speler) ui.sel.legers = ui.sel.legers.includes(leger) ? ui.sel.legers.filter((q) => q !== leger) : [...ui.sel.legers.filter((q) => t.legers.find((z) => z.id === q)?.factie === t.speler), leger];
    else ui.sel.legers = [leger];
    ui.sel.vak = null;
    if (l.factie === t.speler) tip('leger', 'Je hebt een leger gekozen. Rechtsklik (of Ctrl+klik, of lang drukken) op een vak om erheen te trekken.');
  } else {
    ui.sel.legers = [];
    ui.sel.vak = beeld.vakOp(x, y);
  }
  vuil();
});
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (langGedaan) return;
  const [x, y] = plek(e);
  beveel(x, y);
});

function beveel(x: number, y: number) {
  const t = ui.t;
  if (!t) return;
  const naar = beeld.vakOp(x, y);
  if (naar === null) return;
  const eigen = ui.sel.legers.map((id) => t.legers.find((l) => l.id === id)).filter((l): l is Leger => !!l && l.factie === t.speler);
  let gelukt = false;
  for (const l of eigen) gelukt = geefBevel(t, kaart, l, naar) || gelukt;
  if (eigen.length && !gelukt) melding(`Daar kan je niet naartoe: ${kaart.vakken[naar].naam} is van een neutrale macht (eerst oorlog verklaren of een bondgenootschap sluiten), of je leger vecht nog.`);
  vuil();
}

/** korte tip bij de eerste keer */
function tip(id: string, tekst: string) {
  if (!ui.instellingen.tips || ui.getoond.has(id)) return;
  ui.getoond.add(id);
  try {
    const al = JSON.parse(localStorage.getItem('belgica-tips') ?? '[]') as string[];
    if (al.includes(id)) return;
    localStorage.setItem('belgica-tips', JSON.stringify([...al, id]));
  } catch { /* geen opslag */ }
  melding(tekst);
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
  beeld.zoom(f, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

window.addEventListener('keydown', (e) => {
  const t = ui.t;
  if (e.key === 'Escape') {
    if (!$('#venster').hidden && !t?.wachtend.length) { sluitVenster(); return; }
    ui.sel.legers = []; ui.sel.vak = null; doelModus = false; vuil();
    return;
  }
  if (!t || !$('#start').hidden) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); zoeken(); return; }
  if (!$('#venster').hidden || (e.target as HTMLElement).tagName === 'INPUT') return;
  const toets = e.key.toLowerCase();
  if (e.key === ' ') { e.preventDefault(); zetSnelheid(ui.snelheid || ui.springen ? 0 : ui.laatsteSnelheid); }
  else if (/^[1-5]$/.test(e.key)) zetSnelheid(Number(e.key));
  else if (e.key === '.') spring();
  else if (toets === 'd') { zetSnelheid(0); diplomatie(); }
  else if (toets === 'l') { zetSnelheid(0); overzicht(); }
  else if (toets === 'j') logboek();
  else if (toets === 'f') zoeken();
  else if (toets === 'h') naarMijnLand();
  else {
    const ks = KAARTSOORTEN.find((x) => x.toets.toLowerCase() === toets);
    if (ks) { beeld.soort = ks.soort; vuil(); }
  }
});

window.addEventListener('resize', () => { beeld.pasGrootteAan(); });
window.addEventListener('beforeunload', () => bewaar());

// spelers en testen kunnen erbij
(window as unknown as { __belgica: unknown }).__belgica = { get t() { return ui.t; }, beeld, zetSnelheid, begin, nieuwSpel, spring, ui, einde: () => (ui.t ? einddag(tijdperk(ui.t.tijdperk)) : 0) };

beeld.pasGrootteAan();
toonStart();
requestAnimationFrame(frame);
