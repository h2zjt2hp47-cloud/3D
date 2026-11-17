// De spelregels voor één dag: bewegen, vechten, bezetten, aanvullen.
import { kaart as standaardKaart, afstand, TERREIN, type Kaart } from '../kaart/kaart';
import { seizoenVan } from './kalender';
import {
  bevriend, inOorlog, kans, legersIn, meld, vakkenVan, verklaarOorlog,
  type Leger, type Toestand,
} from './toestand';

export const SNELHEID_KM_PER_DAG = { rijk: 20, stam: 16 };
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
  let d = afstand(k, a, b) / (SNELHEID_KM_PER_DAG[soort] * TERREIN[k.vakken[b].terrein].snelheid);
  if (k.vakken[a].rivierBuren.includes(b)) d += 1.5;
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
        const w = t.facties[winnaars[0].factie].naam, v = t.facties[verliezers[0].factie].naam;
        meld(t, `Slag bij ${k.vakken[vak].naam}: de ${w} winnen van de ${v}.`, 'slag', vak);
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
      v.bezetting += (Math.min(1, l.sterkte / 2000) / 8) * TERREIN[k.vakken[l.vak].terrein].snelheid;
      if (v.bezetting >= 1) verover(t, k, l.vak, l.factie);
    }
  }
  t.vakken.forEach((v, i) => { if (!bezig.has(i) && v.bezetter) { v.bezetter = null; v.bezetting = 0; } });
}

export function verover(t: Toestand, k: Kaart, vak: number, f: string) {
  const v = t.vakken[vak];
  const oud = v.eigenaar;
  v.eigenaar = f;
  v.bezetter = null;
  v.bezetting = 0;
  v.garnizoen = 0;
  if (v.fortNaam) meld(t, `De ${t.facties[f].naam} nemen ${v.fortNaam} in.`, 'verovering', vak);
  else if (t.facties[oud].hoofdstad === vak) meld(t, `De ${t.facties[f].naam} veroveren ${k.vakken[vak].naam}, de hoofdplaats van de ${t.facties[oud].naam}.`, 'verovering', vak);
  if (!vakkenVan(t, oud).length && !t.legers.some((l) => l.factie === oud && l.sterkte >= 50) && t.facties[oud].soort === 'stam') {
    verdwijn(t, oud, f);
  }
}

export function verdwijn(t: Toestand, f: string, door: string) {
  const fac = t.facties[f];
  if (!fac.bestaat) return;
  fac.bestaat = false;
  t.legers = t.legers.filter((l) => l.factie !== f);
  t.oorlog = t.oorlog.filter((p) => !p.split('|').includes(f));
  meld(t, `De ${fac.naam} houden op te bestaan als vrij volk; hun land is in handen van de ${t.facties[door].naam}.`, 'verovering');
}

function onderhoud(t: Toestand, k: Kaart) {
  const winter = seizoenVan(t.dag) === 'winter';
  // mankracht groeit uit de bevolking
  const aanwas: Record<string, number> = {};
  t.vakken.forEach((v) => { aanwas[v.eigenaar] = (aanwas[v.eigenaar] ?? 0) + v.bevolking * 0.00004; });
  for (const f of Object.values(t.facties)) {
    if (!f.bestaat) continue;
    f.mankracht += (aanwas[f.id] ?? 0) * (f.heer ? 0.3 : 1);
    if (f.id === 'rome') f.mankracht += 8;
    f.mankracht = Math.min(f.mankracht, 40000);
  }
  // per vak: hoeveel troepen kan het land voeden?
  const inVak = new Map<number, number>();
  for (const l of t.legers) inVak.set(l.vak, (inVak.get(l.vak) ?? 0) + l.sterkte);
  for (const l of t.legers) {
    const eigen = bevriend(t, l.factie, t.vakken[l.vak].eigenaar);
    if (!l.inStrijd) l.moraal = Math.min(1, l.moraal + (eigen ? 0.03 : 0.01));
    let uitputting = eigen ? 0 : winter ? 0.0015 : 0.0003;
    const voorraad = TERREIN[k.vakken[l.vak].terrein].voorraad * (winter ? 0.6 : 1);
    const totaal = inVak.get(l.vak) ?? 0;
    if (totaal > voorraad) uitputting += 0.002 * (totaal / voorraad - 1);
    l.sterkte *= 1 - uitputting;
  }
  // garnizoenen herstellen als er geen beleg is
  for (const v of t.vakken) {
    if (v.fort > 0 && !v.bezetter && v.garnizoen < v.fort) v.garnizoen = Math.min(v.fort, v.garnizoen + v.fort * 0.01);
  }
}

/** een nieuw leger oproepen in een eigen vak */
export function roepOp(t: Toestand, f: string, vak: number, sterkte: number): Leger | null {
  const fac = t.facties[f];
  if (t.vakken[vak].eigenaar !== f || fac.mankracht < sterkte || sterkte < 500 || fac.heer) return null;
  if (legersIn(t, vak).some((l) => inOorlog(t, l.factie, f))) return null;
  fac.mankracht -= sterkte;
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
