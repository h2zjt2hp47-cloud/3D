// Bouwstenen voor gebeurtenissen: wat een gebeurtenis kan doen met de wereld.
import { kaart as standaardKaart, naarKaart, vakBij, type Kaart } from '../kaart/kaart';
import { ingang, nieuwLeger, type FactieDef } from './tijdperk';
import {
  inOorlog, legersIn, meld, paar, sluitBond, sluitVrede, sterkteVan, vakkenVan, verklaarOorlog, wie,
  type Toestand,
} from './toestand';
import { maakVorst } from './vorsten';
import { prijsfactor } from './volgorde';

export const bestaat = (t: Toestand, f: string) => !!t.facties[f]?.bestaat;
export const vrij = (t: Toestand, f: string) => bestaat(t, f) && !t.facties[f].heer;

/** een volk komt in opstand tegen zijn heer (of tegen `tegen`), neemt zijn eigen land terug en krijgt een leger */
export function opstand(t: Toestand, k: Kaart, f: string, sterkte: number, tegen?: string): boolean {
  const fac = t.facties[f];
  if (!fac) return false;
  const vijand = tegen ?? fac.heer;
  if (!vijand || !t.facties[vijand]) return false;
  fac.heer = null;
  fac.bestaat = true;
  verklaarOorlog(t, f, vijand);
  for (const vriend of Object.keys(t.facties)) {
    if (vriend !== f && vriend !== vijand && t.bond.includes(paar(vriend, vijand))) verklaarOorlog(t, f, vriend);
  }
  t.vakken.forEach((v, i) => {
    if (v.oorsprong === f && v.eigenaar !== f && !legersIn(t, i).some((l) => inOorlog(t, l.factie, f))) {
      v.eigenaar = f; v.bezetter = null; v.bezetting = 0; v.sindsVerovering = t.dag;
      if (v.fort) v.garnizoen = v.fort * 0.5;
    }
  });
  const eigen = vakkenVan(t, f);
  if (!eigen.length) return false;
  const plek = fac.hoofdstad !== null && eigen.includes(fac.hoofdstad) ? fac.hoofdstad : eigen[0];
  nieuwLeger(t, f, plek, sterkte, `Opstand van ${fac.naam}`);
  meld(t, `${wie(t, f, true)} komen in opstand tegen ${wie(t, vijand)}.`, 'gebeurtenis', plek);
  return true;
}

export function onderwerp(t: Toestand, f: string, heer: string) {
  const fac = t.facties[f];
  if (!fac || !t.facties[heer]) return;
  fac.heer = heer;
  for (const p of [...t.oorlog]) if (p.split('|').includes(f)) { t.oorlog = t.oorlog.filter((x) => x !== p); delete t.oorlogen[p]; }
  t.bond = t.bond.filter((p) => !p.split('|').includes(f));
  for (const l of t.legers) if (l.factie === f) { l.sterkte = Math.min(l.sterkte, 1500 * prijsfactor(t.tijdperk)); l.pad = []; }
  meld(t, `${wie(t, f, true)} onderwerpen zich aan ${wie(t, heer)}.`, 'gebeurtenis');
}

/** alle vakken van de vazallen van `heer` gaan naar `heer` */
export function lijfVazallenIn(t: Toestand, heer: string) {
  for (const f of Object.values(t.facties)) {
    if (f.heer !== heer || !f.bestaat) continue;
    for (const v of t.vakken) if (v.eigenaar === f.id) v.eigenaar = heer;
    for (const l of t.legers) if (l.factie === f.id) l.factie = heer;
    f.bestaat = false;
  }
}

/** een leger bij een plaats */
export function legerBij(t: Toestand, k: Kaart, f: string, plaats: [number, number], sterkte: number, naam: string) {
  if (!t.facties[f]) return null;
  t.facties[f].bestaat = true;
  return nieuwLeger(t, f, vakBij(k, plaats[0], plaats[1]), sterkte, naam);
}

/** een leger van over de grens, langs de ingang van de factie */
export function legerVanBuiten(t: Toestand, k: Kaart, f: string, sterkte: number, naam: string) {
  if (!t.facties[f]) return null;
  t.facties[f].bestaat = true;
  return nieuwLeger(t, f, ingang(t, f, k), sterkte, naam);
}

/** vakken binnen een straal (km) rond een plaats gaan naar f */
export function geefRond(t: Toestand, k: Kaart, plaats: [number, number], straal: number, aan: string, enkelVan?: string[]) {
  const p = naarKaart(k, plaats[0], plaats[1]);
  t.vakken.forEach((v, i) => {
    const m = k.vakken[i].midden;
    if (Math.hypot(m[0] - p[0], m[1] - p[1]) > straal) return;
    if (enkelVan && !enkelVan.includes(v.eigenaar)) return;
    if (legersIn(t, i).some((l) => inOorlog(t, l.factie, aan))) return;
    v.eigenaar = aan; v.sindsVerovering = t.dag; v.bezetter = null; v.bezetting = 0;
  });
  t.facties[aan].bestaat = true;
}

/** hele gebieden van nu gaan naar f */
export function geefGebieden(t: Toestand, k: Kaart, gebieden: string[], aan: string) {
  t.vakken.forEach((v, i) => {
    if (!gebieden.includes(k.vakken[i].gebied)) return;
    v.eigenaar = aan; v.sindsVerovering = t.dag; v.bezetter = null; v.bezetting = 0;
  });
  t.facties[aan].bestaat = true;
}

/** alle vakken van `van` gaan naar `aan` (erfenis, aankoop, verdrag) */
export function geefAlles(t: Toestand, van: string, aan: string) {
  if (!t.facties[van] || !t.facties[aan]) return;
  for (const v of t.vakken) if (v.eigenaar === van) { v.eigenaar = aan; v.sindsVerovering = t.dag; }
  for (const l of t.legers) if (l.factie === van) l.factie = aan;
  t.facties[van].bestaat = false;
  t.oorlog = t.oorlog.filter((p) => !p.split('|').includes(van));
  t.bond = t.bond.filter((p) => !p.split('|').includes(van));
  if (t.speler === van) {
    t.speler = aan;
    t.wachtend.push({ id: `overgenomen-${t.dag}`, titel: 'Je land gaat over', tekst: `Je land valt nu onder ${t.facties[aan].naam}. Je speelt verder als ${t.facties[aan].naam}.`, opties: [{ tekst: 'Verder', gevolg: 'niets' }] });
  }
}

/** de vakken van `van` verdelen: per vak beslist `naar` wie het krijgt (of null: blijft) */
export function deel(t: Toestand, k: Kaart, van: string, naar: (lonlat: [number, number], vak: number) => string | null) {
  t.vakken.forEach((v, i) => {
    if (v.eigenaar !== van) return;
    const aan = naar(k.vakken[i].lonlat, i);
    if (!aan || !t.facties[aan]) return;
    v.eigenaar = aan; v.sindsVerovering = t.dag;
    t.facties[aan].bestaat = true;
  });
  for (const l of t.legers) {
    if (l.factie !== van) continue;
    const aan = naar(k.vakken[l.vak].lonlat, l.vak);
    if (aan && t.facties[aan]) l.factie = aan;
  }
}

/** vakken die van oorsprong van `aan` zijn maar nu van `van`, gaan terug */
export function geefTerug(t: Toestand, van: string, aan: string) {
  for (const v of t.vakken) if (v.eigenaar === van && v.oorsprong === aan) { v.eigenaar = aan; v.sindsVerovering = t.dag; v.bezetter = null; v.bezetting = 0; }
  if (t.facties[aan]) t.facties[aan].bestaat = true;
}

export function hernoem(t: Toestand, f: string, naam: string, leider?: string) {
  const fac = t.facties[f];
  if (!fac) return;
  fac.naam = naam;
  if (leider) heerser(t, f, leider);
}

/** is de speler (of zijn heer) een van deze machten? */
export function spelerIs(t: Toestand, ...ids: string[]) {
  return ids.includes(t.speler) || ids.includes(t.facties[t.speler]?.heer ?? '');
}

export function oorlog(t: Toestand, a: string, b: string) {
  if (bestaat(t, a) && bestaat(t, b)) verklaarOorlog(t, a, b);
}
export function vrede(t: Toestand, a: string, b: string) {
  if (t.facties[a] && t.facties[b]) sluitVrede(t, a, b);
}
export function bond(t: Toestand, a: string, b: string) {
  if (bestaat(t, a) && bestaat(t, b)) sluitBond(t, a, b);
}

/** een nieuwe heerser (historisch) */
export function heerser(t: Toestand, f: string, naam: string, leeftijd = 30) {
  const fac = t.facties[f];
  if (!fac) return;
  fac.heerser = naam;
  if (fac.vorst || fac.soort !== 'stam') fac.vorst = { ...maakVorst(t, naam, leeftijd, false), erfgenaam: true };
}

/** een factie die pas in de loop van het tijdperk opduikt, staat al in de lijst maar bestaat nog niet */
export function verschijn(t: Toestand, f: string) {
  if (t.facties[f]) t.facties[f].bestaat = true;
}

export function sterkte(t: Toestand, f: string) {
  return sterkteVan(t, f);
}

export type { FactieDef };
export { standaardKaart };
