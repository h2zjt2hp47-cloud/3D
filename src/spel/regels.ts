// De spelregels voor één dag: bewegen, vechten, bezetten, aanvullen.
import { kaart as standaardKaart, afstand, TERREIN, type Kaart } from '../kaart/kaart';
import { seizoenVan } from './kalender';
import { OPROEPKOST, werkBouwAf } from './economie';
import { prijsfactor, rang } from './volgorde';
import {
  bevriend, inOorlog, kans, legersIn, meld, vakkenVan, verklaarOorlog, wie,
  hoofd, paar, wijzigOpinie, type Leger, type Soort, type Toestand,
} from './toestand';

export const SNELHEID_KM_PER_DAG: Record<Soort, number> = { rijk: 20, staat: 18, stam: 16 };
/** legers worden sneller door de eeuwen (wegen, paarden, treinen, motoren) */
const TIJDSNELHEID = [1, 1, 1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.6, 2.2, 3];
/** hoeveel troepen een vak kan voeden groeit met landbouw, wegen en later treinen */
const VOORRAAD = [2, 1.5, 1.5, 1.5, 1.8, 2.2, 2.6, 3.5, 6, 20, 30];
const TERUGTREKKEN_ONDER = 0.3;

// ---------- toegang en paden ----------

/** mag een leger van factie f dit vak in? eigen, bevriend of vijandig land; niet bij neutralen */
export function toegang(t: Toestand, f: string, vak: number): boolean {
  const e = t.vakken[vak].eigenaar;
  return bevriend(t, f, e) || inOorlog(t, f, e);
}

/** dagen om van vak a naar buurvak b te trekken */
export function reisdagen(t: Toestand, k: Kaart, f: string, a: number, b: number): number {
  const soort = t.facties[f].soort;
  let d = afstand(k, a, b) / (SNELHEID_KM_PER_DAG[soort] * TIJDSNELHEID[rang(t.tijdperk)] * TERREIN[k.vakken[b].terrein].snelheid);
  if (k.vakken[a].rivierBuren.includes(b)) d += 1.5;
  const wegen = t.vakken[a].weg + t.vakken[b].weg;
  if (wegen) d *= wegen === 2 ? 0.6 : 0.8;
  if (seizoenVan(t.dag) === 'winter') d /= 0.6;
  return d;
}

/** kortste weg in dagen; geeft de vakken na het startvak, of null */
export function zoekPad(t: Toestand, k: Kaart, f: string, van: number, naar: number): number[] | null {
  if (van === naar) return [];
  if (!toegang(t, f, naar)) return null;
  const n = k.vakken.length;
  const dist = new Float64Array(n).fill(Infinity), vorige = new Int32Array(n).fill(-1), klaar = new Uint8Array(n);
  dist[van] = 0;
  for (;;) {
    let u = -1, min = Infinity;
    for (let i = 0; i < n; i++) if (!klaar[i] && dist[i] < min) { min = dist[i]; u = i; }
    if (u < 0) return null;
    if (u === naar) break;
    klaar[u] = 1;
    for (const b of k.vakken[u].buren) {
      if (klaar[b] || !toegang(t, f, b)) continue;
      const d = dist[u] + reisdagen(t, k, f, u, b);
      if (d < dist[b]) { dist[b] = d; vorige[b] = u; }
    }
  }
  const pad: number[] = [];
  for (let v = naar; v !== van; v = vorige[v]) pad.unshift(v);
  return pad;
}

/** alle bereikbare vakken met hun reisduur (voor de computerspelers) */
export function bereik(t: Toestand, k: Kaart, f: string, van: number, maxDagen: number): Map<number, number> {
  const n = k.vakken.length;
  const dist = new Float64Array(n).fill(Infinity), klaar = new Uint8Array(n);
  dist[van] = 0;
  const uit = new Map<number, number>();
  for (;;) {
    let u = -1, min = Infinity;
    for (let i = 0; i < n; i++) if (!klaar[i] && dist[i] < min) { min = dist[i]; u = i; }
    if (u < 0 || min > maxDagen) break;
    klaar[u] = 1;
    uit.set(u, min);
    for (const b of k.vakken[u].buren) {
      if (klaar[b] || !toegang(t, f, b)) continue;
      const d = dist[u] + reisdagen(t, k, f, u, b);
      if (d < dist[b]) dist[b] = d;
    }
  }
  return uit;
}

export function geefBevel(t: Toestand, k: Kaart, leger: Leger, naar: number): boolean {
  if (leger.inStrijd) return false;
  const pad = zoekPad(t, k, leger.factie, leger.vak, naar);
  if (!pad) return false;
  if (pad[0] !== leger.pad[0]) leger.voortgang = 0;
  leger.pad = pad;
  return true;
}

// ---------- kracht ----------

export function kracht(t: Toestand, l: Leger): number {
  return l.sterkte * t.facties[l.factie].kwaliteit * (0.4 + 0.6 * l.moraal) * (l.overgestoken > 0 ? 0.7 : 1);
}

// ---------- één dag ----------

export function dagStap(t: Toestand, k: Kaart = standaardKaart) {
  beweeg(t, k);
  vecht(t, k);
  bezet(t, k);
  onderhoud(t, k);
  t.legers = t.legers.filter((l) => l.sterkte >= 50);
  t.dag++;
}

function beweeg(t: Toestand, k: Kaart) {
  for (const l of t.legers) {
    if (l.overgestoken > 0) l.overgestoken--;
    if (l.inStrijd || !l.pad.length) continue;
    const volgend = l.pad[0];
    if (!toegang(t, l.factie, volgend)) { l.pad = []; l.voortgang = 0; continue; }
    l.voortgang += 1 / reisdagen(t, k, l.factie, l.vak, volgend);
    if (l.voortgang >= 1) {
      if (k.vakken[l.vak].rivierBuren.includes(volgend)) l.overgestoken = 3;
      l.vak = volgend;
      l.pad.shift();
      l.voortgang = 0;
      // in de moderne tijd valt een onverdedigd vak zonder vesting meteen bij een doortocht
      const v = t.vakken[volgend];
      if (rang(t.tijdperk) >= rang('belgie') && inOorlog(t, l.factie, v.eigenaar) && !(v.fort && v.garnizoen > 0)
        && !legersIn(t, volgend).some((x) => inOorlog(t, x.factie, l.factie))) verover(t, k, volgend, l.factie);
    }
  }
}

function vecht(t: Toestand, k: Kaart) {
  for (const l of t.legers) l.inStrijd = false;
  const perVak = new Map<number, Leger[]>();
  for (const l of t.legers) {
    if (!perVak.has(l.vak)) perVak.set(l.vak, []);
    perVak.get(l.vak)!.push(l);
  }
  for (const [vak, legers] of perVak) {
    if (legers.length < 2) continue;
    // de verdediger: wie bevriend is met de eigenaar, anders het eerste leger
    const eigenaar = t.vakken[vak].eigenaar;
    const anker = legers.find((l) => bevriend(t, l.factie, eigenaar)) ?? legers[0];
    const kantA = legers.filter((l) => bevriend(t, l.factie, anker.factie));
    const kantB = legers.filter((l) => inOorlog(t, l.factie, anker.factie));
    if (!kantB.length) continue;
    const verdedigt = bevriend(t, anker.factie, eigenaar);
    const terrein = TERREIN[k.vakken[vak].terrein].verdediging;
    const krachtA = kantA.reduce((s, l) => s + kracht(t, l), 0) * (verdedigt ? terrein : 1);
    const krachtB = kantB.reduce((s, l) => s + kracht(t, l), 0);
    const nu = { a: [...kantA], b: [...kantB] };
    for (const l of [...kantA, ...kantB]) l.inStrijd = true;
    for (const l of [...kantA, ...kantB]) { l.pad = []; l.voortgang = 0; }
    toebrengen(t, nu.a, krachtB * 0.012 * (0.85 + kans(t) * 0.3));
    toebrengen(t, nu.b, krachtA * 0.012 * (0.85 + kans(t) * 0.3));
    // terugtrekken
    const weg = (kant: Leger[]) => kant.filter((l) => l.moraal < TERUGTREKKEN_ONDER || l.sterkte < 50);
    const wegA = weg(nu.a), wegB = weg(nu.b);
    for (const l of [...wegA, ...wegB]) trekTerug(t, k, l);
    const blijftA = nu.a.filter((l) => !wegA.includes(l) && l.sterkte >= 50);
    const blijftB = nu.b.filter((l) => !wegB.includes(l) && l.sterkte >= 50);
    if (!blijftA.length || !blijftB.length) {
      const winnaars = blijftA.length ? blijftA : blijftB;
      const verliezers = blijftA.length ? kantB : kantA;
      for (const l of winnaars) { l.moraal = Math.min(1, l.moraal + 0.08); l.inStrijd = false; }
      if (winnaars.length) {
        const w = hoofd(t, winnaars[0].factie), v = hoofd(t, verliezers[0].factie);
        const o = t.oorlogen[paar(w, v)];
        if (o) o.slagen[w] = (o.slagen[w] ?? 0) + 1;
        const gewicht = Math.min(1, verliezers.reduce((s, l) => s + l.sterkte, 0) / (8000 * prijsfactor(t.tijdperk)));
        t.facties[v].moeheid = Math.min(100, t.facties[v].moeheid + (0.5 + 2 * gewicht) * (t.facties[v].soort === 'rijk' ? 0.5 : 1));
        t.facties[w].moeheid = Math.min(100, t.facties[w].moeheid + 0.3 * gewicht);
        wijzigOpinie(t, w, v, -2);
        meld(t, `Slag bij ${k.vakken[vak].naam}: overwinning voor ${wie(t, winnaars[0].factie)} tegen ${wie(t, verliezers[0].factie)}.`, 'slag', vak, [...new Set([...winnaars, ...verliezers].map((l) => l.factie))]);
      }
    }
  }
}

function toebrengen(t: Toestand, kant: Leger[], verlies: number) {
  const totaal = kant.reduce((s, l) => s + l.sterkte, 0);
  if (!totaal) return;
  for (const l of kant) {
    const deel = (verlies * l.sterkte) / totaal;
    l.sterkte = Math.max(0, l.sterkte - deel);
    const kw = Math.sqrt(t.facties[l.factie].kwaliteit);
    l.moraal = Math.max(0, l.moraal - ((deel / Math.max(1, l.sterkte + deel)) * 2.5 + 0.012) / kw);
  }
}

function trekTerug(t: Toestand, k: Kaart, l: Leger) {
  const kandidaten = k.vakken[l.vak].buren
    .filter((b) => toegang(t, l.factie, b) && !legersIn(t, b).some((x) => inOorlog(t, x.factie, l.factie)))
    .sort((a, b) => score(b) - score(a));
  function score(v: number) {
    return (bevriend(t, l.factie, t.vakken[v].eigenaar) ? 10 : 0) + kans(t);
  }
  if (!kandidaten.length || l.sterkte < 50) {
    meld(t, `${l.naam} is omsingeld en gaat ten onder bij ${k.vakken[l.vak].naam}.`, 'slag', l.vak);
    l.sterkte = 0;
    return;
  }
  l.vak = kandidaten[0];
  l.pad = [];
  l.voortgang = 0;
  l.inStrijd = false;
  l.moraal = Math.max(l.moraal, 0.15);
}

function bezet(t: Toestand, k: Kaart) {
  const bezig = new Set<number>();
  for (const l of t.legers) {
    if (l.inStrijd || l.pad.length) continue;
    const v = t.vakken[l.vak];
    if (!inOorlog(t, l.factie, v.eigenaar)) continue;
    if (legersIn(t, l.vak).some((x) => inOorlog(t, x.factie, l.factie))) continue;
    bezig.add(l.vak);
    if (v.bezetter !== l.factie) { v.bezetter = l.factie; v.bezetting = 0; }
    if (v.fort > 0 && v.garnizoen > 0) {
      // beleg: het garnizoen slinkt door aanvallen en honger
      v.garnizoen = Math.max(0, v.garnizoen - (10 + kracht(t, l) * 0.002 + v.garnizoen * 0.005));
      l.sterkte *= 0.9995;
      if (v.garnizoen <= 0) verover(t, k, l.vak, l.factie);
    } else {
      v.bezetting += (Math.min(1, l.sterkte / (2000 * prijsfactor(t.tijdperk))) / 8) * TERREIN[k.vakken[l.vak].terrein].snelheid * TIJDSNELHEID[rang(t.tijdperk)];
      if (v.bezetting >= 1) verover(t, k, l.vak, l.factie);
    }
  }
  t.vakken.forEach((v, i) => { if (!bezig.has(i) && v.bezetter) { v.bezetter = null; v.bezetting = 0; } });
}

export function verover(t: Toestand, k: Kaart, vak: number, f: string) {
  const v = t.vakken[vak];
  const oud = v.eigenaar;
  // bevrijding: land van een bondgenoot gaat terug naar die bondgenoot
  const terug = v.oorsprong !== f && t.facties[v.oorsprong]?.bestaat && bevriend(t, f, v.oorsprong) && inOorlog(t, v.oorsprong, oud);
  if (terug) f = v.oorsprong;
  v.eigenaar = f;
  v.bezetter = null;
  v.bezetting = 0;
  v.garnizoen = 0;
  v.sindsVerovering = t.dag;
  v.tevredenheid = Math.min(v.tevredenheid, v.oorsprong === f ? 60 : 30);
  v.bouw = null;
  // buit
  const buit = Math.round(v.bevolking / 1000 * (v.fort ? 6 : 2));
  t.facties[f].schat += buit;
  if (oud !== f) {
    t.facties[oud].schat = Math.max(-50, t.facties[oud].schat - buit / 2);
    t.facties[oud].moeheid = Math.min(100, t.facties[oud].moeheid + 1);
  }
  if (!v.fortNaam && t.facties[oud].hoofdstad !== vak && (oud === t.speler || f === t.speler)) meld(t, `${k.vakken[vak].naam} valt in handen van ${wie(t, f)}.`, 'verovering', vak, [f, oud]);
  if (v.fortNaam) meld(t, `${v.fortNaam} valt in handen van ${wie(t, f)}.`, 'verovering', vak, [f, oud]);
  else if (t.facties[oud].hoofdstad === vak) meld(t, `${k.vakken[vak].naam}, de hoofdplaats van ${wie(t, oud)}, valt in handen van ${wie(t, f)}.`, 'verovering', vak, [f, oud]);
  if (!vakkenVan(t, oud).length && !t.legers.some((l) => l.factie === oud && l.sterkte >= 50) && t.facties[oud].soort !== 'rijk') {
    verdwijn(t, oud, f);
  }
}

export function verdwijn(t: Toestand, f: string, door: string) {
  const fac = t.facties[f];
  if (!fac.bestaat) return;
  fac.bestaat = false;
  t.legers = t.legers.filter((l) => l.factie !== f);
  for (const p of t.oorlog.filter((x) => x.split('|').includes(f))) delete t.oorlogen[p];
  t.oorlog = t.oorlog.filter((p) => !p.split('|').includes(f));
  t.bond = t.bond.filter((p) => !p.split('|').includes(f));
  for (const ander of Object.values(t.facties)) if (ander.heer === f) ander.heer = null;
  meld(t, `${fac.naam} verdwijnt als zelfstandige macht; het land is in handen van ${wie(t, door)}.`, 'verovering');
}

function onderhoud(t: Toestand, k: Kaart) {
  const winter = seizoenVan(t.dag) === 'winter';
  // mankracht groeit uit de bevolking
  const aanwas: Record<string, number> = {};
  t.vakken.forEach((v) => { aanwas[v.eigenaar] = (aanwas[v.eigenaar] ?? 0) + v.bevolking * 0.00004; });
  for (const f of Object.values(t.facties)) {
    if (!f.bestaat) continue;
    f.mankracht += (aanwas[f.id] ?? 0) * (f.heer ? 0.3 : 1);
    if (f.buiten && !f.heer) f.mankracht += f.buiten.doelSterkte / 4000;
    f.mankracht = Math.min(f.mankracht, 40000 * prijsfactor(t.tijdperk));
  }
  // per vak: hoeveel troepen kan het land voeden?
  const inVak = new Map<number, number>();
  for (const l of t.legers) inVak.set(l.vak, (inVak.get(l.vak) ?? 0) + l.sterkte);
  for (const l of t.legers) {
    const eigen = bevriend(t, l.factie, t.vakken[l.vak].eigenaar);
    if (!l.inStrijd) l.moraal = Math.min(1, l.moraal + (eigen ? 0.03 : 0.01));
    // geen soldij: de moed zakt
    if (t.facties[l.factie].schat < 0) l.moraal = Math.max(0.2, l.moraal - 0.035);
    let uitputting = eigen ? 0 : winter ? 0.0015 : 0.0003;
    const voorraad = TERREIN[k.vakken[l.vak].terrein].voorraad * (winter ? 0.6 : 1) * VOORRAAD[rang(t.tijdperk)];
    const totaal = inVak.get(l.vak) ?? 0;
    if (totaal > voorraad) uitputting += 0.002 * (totaal / voorraad - 1);
    l.sterkte *= 1 - uitputting;
  }
  // vijandelijke legers plunderen: de bevolking slinkt en het volk wordt onrustig
  for (const l of t.legers) {
    const v = t.vakken[l.vak];
    if (!inOorlog(t, l.factie, v.eigenaar)) continue;
    v.bevolking = Math.max(300, v.bevolking * (1 - 0.0004 * Math.min(1, l.sterkte / 5000)));
    v.tevredenheid = Math.max(0, v.tevredenheid - 0.15);
  }
  werkBouwAf(t, k);
  // garnizoenen herstellen als er geen beleg is
  for (const v of t.vakken) {
    if (v.fort > 0 && !v.bezetter && v.garnizoen < v.fort) v.garnizoen = Math.min(v.fort, v.garnizoen + v.fort * 0.01);
  }
}

export const oproepKost = (sterkte: number, t?: Toestand) => Math.round((sterkte / 1000) * OPROEPKOST * (t ? prijsfactor(t.tijdperk) : 1));

/** een nieuw leger oproepen in een eigen vak */
export function roepOp(t: Toestand, f: string, vak: number, sterkte: number): Leger | null {
  const fac = t.facties[f];
  if (t.vakken[vak].eigenaar !== f || fac.mankracht < sterkte || sterkte < 500 || fac.heer) return null;
  if (fac.schat < oproepKost(sterkte, t)) return null;
  if (legersIn(t, vak).some((l) => inOorlog(t, l.factie, f))) return null;
  fac.mankracht -= sterkte;
  fac.schat -= oproepKost(sterkte, t);
  const id = t.volgendLeger++;
  const l: Leger = { id, naam: `${fac.naam}, leger ${id}`, factie: f, vak, sterkte, moraal: 0.6, pad: [], voortgang: 0, overgestoken: 0, inStrijd: false };
  t.legers.push(l);
  return l;
}

export function voegSamen(t: Toestand, legers: Leger[]): Leger | null {
  if (legers.length < 2) return null;
  const [eerste, ...rest] = legers;
  if (rest.some((l) => l.vak !== eerste.vak || l.factie !== eerste.factie)) return null;
  const totaal = legers.reduce((s, l) => s + l.sterkte, 0);
  eerste.moraal = legers.reduce((s, l) => s + l.moraal * l.sterkte, 0) / totaal;
  eerste.sterkte = totaal;
  eerste.pad = [];
  eerste.voortgang = 0;
  t.legers = t.legers.filter((l) => !rest.includes(l));
  return eerste;
}

export function splits(t: Toestand, l: Leger): Leger | null {
  if (l.sterkte < 1000 || l.inStrijd) return null;
  const helft = Math.floor(l.sterkte / 2);
  l.sterkte -= helft;
  const id = t.volgendLeger++;
  const nieuw: Leger = { ...l, id, naam: `${t.facties[l.factie].naam}, leger ${id}`, sterkte: helft, pad: [], voortgang: 0 };
  t.legers.push(nieuw);
  return nieuw;
}

export { verklaarOorlog };

/** dagen tot een leger op zijn bestemming is */
export function dagenTotAankomst(t: Toestand, k: Kaart, l: Leger): number {
  if (!l.pad.length) return 0;
  let d = (1 - l.voortgang) * reisdagen(t, k, l.factie, l.vak, l.pad[0]);
  for (let i = 1; i < l.pad.length; i++) d += reisdagen(t, k, l.factie, l.pad[i - 1], l.pad[i]);
  return Math.ceil(d);
}

/** een ruwe voorspelling van een slag: onze legers tegen de vijanden in een vak */
export function voorspelSlag(t: Toestand, k: Kaart, eigen: Leger[], vak: number): { oordeel: 'goed' | 'gelijk' | 'slecht'; verhouding: number; redenen: [string, string][] } | null {
  if (!eigen.length) return null;
  const f = eigen[0].factie;
  const vijand = legersIn(t, vak).filter((l) => inOorlog(t, l.factie, f));
  if (!vijand.length) return null;
  const terrein = TERREIN[k.vakken[vak].terrein];
  const verdedigt = bevriend(t, vijand[0].factie, t.vakken[vak].eigenaar);
  const rivier = eigen.some((l) => {
    const vorige = l.pad.length >= 2 ? l.pad[l.pad.length - 2] : l.vak;
    return vorige !== vak && k.vakken[vorige].rivierBuren.includes(vak);
  });
  const mijn = eigen.reduce((s, l) => s + l.sterkte * t.facties[l.factie].kwaliteit * (0.4 + 0.6 * l.moraal), 0) * (rivier ? 0.7 : 1);
  const hun = vijand.reduce((s, l) => s + kracht(t, l), 0) * (verdedigt ? terrein.verdediging : 1);
  const verhouding = mijn / Math.max(1, hun);
  const redenen: [string, string][] = [
    ['Jouw mannen', `${Math.round(eigen.reduce((s, l) => s + l.sterkte, 0))}`],
    ['Hun mannen', `${Math.round(vijand.reduce((s, l) => s + l.sterkte, 0))}`],
    ['Jouw kwaliteit', `×${t.facties[f].kwaliteit.toFixed(2)}`],
    ['Hun kwaliteit', `×${t.facties[vijand[0].factie].kwaliteit.toFixed(2)}`],
  ];
  if (verdedigt) redenen.push([`Zij verdedigen: ${terrein.naam.toLowerCase()}`, `×${terrein.verdediging.toFixed(2)}`]);
  if (rivier) redenen.push(['Jij steekt een rivier over', '×0,70']);
  return { oordeel: verhouding > 1.3 ? 'goed' : verhouding > 0.8 ? 'gelijk' : 'slecht', verhouding, redenen };
}

/** hoe groot een leger mag zijn voor het uitgeput raakt in een gewoon vak */
export function legerMaat(t: Toestand): number {
  return TERREIN.vlakte.voorraad * VOORRAAD[rang(t.tijdperk)];
}
