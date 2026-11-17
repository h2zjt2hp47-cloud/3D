// Diplomatie: oorlogsscore, vrede, bondgenootschap, oorlog verklaren, geschenken en huwelijken.
// Elke beslissing van de computer komt met redenen, zodat de speler ziet waarom.
import { kaart as standaardKaart, type Kaart } from '../kaart/kaart';
import {
  bevriend, hoofd, inOorlog, kans, meld, mens, opinie, paar, sluitBond, sluitVrede, sterkteVan, vakkenVan,
  verklaarOorlog, wie, wijzigOpinie, type Toestand,
} from './toestand';
import { kracht } from './regels';

export interface Oordeel {
  ja: boolean;
  totaal: number;
  redenen: { tekst: string; waarde: number }[];
}

function oordeel(redenen: { tekst: string; waarde: number }[]): Oordeel {
  const totaal = Math.round(redenen.reduce((s, r) => s + r.waarde, 0));
  return { ja: totaal > 0, totaal, redenen: redenen.filter((r) => Math.round(r.waarde) !== 0).map((r) => ({ ...r, waarde: Math.round(r.waarde) })) };
}

/** militaire kracht van een factie en haar onderworpen volken */
export function macht(t: Toestand, f: string): number {
  return t.legers.filter((l) => hoofd(t, l.factie) === f).reduce((s, l) => s + kracht(t, l), 0);
}

/** oorlogsscore van a tegen b: -100 (b wint alles) tot 100 (a wint alles) */
export function oorlogsscore(t: Toestand, a: string, b: string): number {
  const o = t.oorlogen[paar(a, b)];
  if (!o) return 0;
  const verlies = (f: string) => {
    const start = Math.max(1, o.start[f] ?? 1);
    return Math.max(0, (start - vakkenVan(t, f).length) / start) * 100;
  };
  let s = verlies(b) - verlies(a);
  s += ((o.slagen[a] ?? 0) - (o.slagen[b] ?? 0)) * 4;
  const hb = t.facties[b].hoofdstad, ha = t.facties[a].hoofdstad;
  if (hb !== null && t.vakken[hb].eigenaar !== b && bevriend(t, t.vakken[hb].eigenaar, a)) s += 20;
  if (ha !== null && t.vakken[ha].eigenaar !== a && bevriend(t, t.vakken[ha].eigenaar, b)) s -= 20;
  return Math.max(-100, Math.min(100, Math.round(s)));
}

/** vredesvoorstel van a aan b; met eis van zilver als a dat vraagt */
export function oordeelVrede(t: Toestand, a: string, b: string, eisZilver = false): Oordeel {
  const score = oorlogsscore(t, b, a); // vanuit b gezien
  const fb = t.facties[b];
  const r = [
    { tekst: 'Basis', waarde: -10 },
    { tekst: score >= 0 ? 'Zij staan er goed voor in de oorlog' : 'Zij verliezen de oorlog', waarde: -score * 0.8 },
    { tekst: 'Oorlogsmoeheid bij hen', waarde: fb.moeheid * 0.6 },
    { tekst: 'Duur van de oorlog', waarde: Math.min(20, (t.dag - (t.oorlogen[paar(a, b)]?.begin ?? t.dag)) / 365 * 4) },
    { tekst: 'Krachtverhouding', waarde: Math.max(-25, Math.min(25, (macht(t, a) / Math.max(1, macht(t, b)) - 1) * 15)) },
  ];
  if (eisZilver) r.push({ tekst: 'Je eist zilver', waarde: -25 });
  if (fb.schat < 0) r.push({ tekst: 'Hun schatkist is leeg', waarde: 10 });
  return oordeel(r);
}

export function sluitVredeAf(t: Toestand, a: string, b: string, eisZilver = false) {
  sluitVrede(t, a, b);
  // onderworpen volken volgen
  if (eisZilver) {
    const bedrag = Math.max(0, Math.round(t.facties[b].schat * 0.4));
    t.facties[b].schat -= bedrag;
    t.facties[a].schat += bedrag;
  }
  wijzigOpinie(t, a, b, 10);
  for (const f of [a, b]) t.facties[f].moeheid = Math.max(0, t.facties[f].moeheid - 15);
  meld(t, `Vrede tussen ${wie(t, a)} en ${wie(t, b)}${eisZilver ? `, met een schatting voor ${wie(t, a)}` : ''}.`, 'diplomatie', undefined, [a, b]);
}

export function oordeelBond(t: Toestand, a: string, b: string): Oordeel {
  const r = [
    { tekst: 'Basis', waarde: -20 },
    { tekst: 'Wat ze van jou vinden', waarde: opinie(t, a, b) * 0.6 },
  ];
  const vijandenA = vijanden(t, a), vijandenB = vijanden(t, b);
  if (vijandenA.some((v) => vijandenB.includes(v))) r.push({ tekst: 'Gemeenschappelijke vijand', waarde: 30 });
  if (vijandenA.some((v) => bevriend(t, v, b))) r.push({ tekst: 'Jij bent in oorlog met hun vrienden', waarde: -60 });
  const verhouding = macht(t, a) / Math.max(1, macht(t, b));
  r.push({ tekst: verhouding > 1 ? 'Jij bent sterk' : 'Jij bent zwak', waarde: Math.max(-20, Math.min(20, (verhouding - 1) * 15)) });
  if (t.huwelijk.includes(paar(a, b))) r.push({ tekst: 'Jullie huizen zijn verwant', waarde: 15 });
  if (inOorlog(t, a, b)) r.push({ tekst: 'Jullie zijn in oorlog', waarde: -1000 });
  return oordeel(r);
}

export function oordeelHuwelijk(t: Toestand, a: string, b: string): Oordeel {
  const r = [
    { tekst: 'Basis', waarde: 5 },
    { tekst: 'Wat ze van jou vinden', waarde: opinie(t, a, b) * 0.5 },
    { tekst: 'Jouw aanzien (land)', waarde: Math.min(20, (vakkenVan(t, a).length - vakkenVan(t, b).length) * 0.5) },
  ];
  if (inOorlog(t, a, b)) r.push({ tekst: 'Jullie zijn in oorlog', waarde: -1000 });
  if (t.huwelijk.includes(paar(a, b))) r.push({ tekst: 'Er is al een huwelijk', waarde: -1000 });
  if (!t.facties[a].vorst || !t.facties[b].vorst) r.push({ tekst: 'Geen vorstenhuis', waarde: -1000 });
  return oordeel(r);
}

export function sluitHuwelijk(t: Toestand, a: string, b: string) {
  if (!t.huwelijk.includes(paar(a, b))) t.huwelijk.push(paar(a, b));
  wijzigOpinie(t, a, b, 25);
  meld(t, `Huwelijk tussen de huizen van ${wie(t, a)} en ${wie(t, b)}. Sterft een van beide huizen uit, dan kan het andere erven.`, 'diplomatie');
}

export function vijanden(t: Toestand, f: string): string[] {
  return Object.keys(t.facties).filter((x) => t.facties[x].bestaat && x !== f && inOorlog(t, f, x));
}

/** heeft a een reden voor oorlog tegen b? */
export function oorlogsreden(t: Toestand, a: string, b: string): string | null {
  if (t.vakken.some((v) => v.eigenaar === b && v.oorsprong === a)) return 'Zij hebben land dat van jou was.';
  if (vijanden(t, b).some((v) => bevriend(t, v, a))) return 'Zij zijn in oorlog met je bondgenoot.';
  if (opinie(t, a, b) <= -50) return 'Jullie haten elkaar.';
  return null;
}

export function verklaarOorlogActie(t: Toestand, a: string, b: string): void {
  const ha = hoofd(t, a), hb = hoofd(t, b);
  const reden = oorlogsreden(t, ha, hb);
  const bestand = (t.bestand[paar(ha, hb)] ?? 0) > t.dag;
  verklaarOorlog(t, ha, hb);
  wijzigOpinie(t, ha, hb, -40);
  // wie zijn leenheer aanvalt, breekt de band; wie een leenman aanvalt, krijgt de leenheer tegen zich als die wil
  if (t.facties[ha].leenheer === hb) t.facties[ha].leenheer = null;
  const lh = t.facties[hb].leenheer;
  if (lh && lh !== ha && t.facties[lh]?.bestaat && opinie(t, lh, ha) < 0 && kans(t) < 0.5) verklaarOorlog(t, lh, ha);
  if (!reden || bestand) {
    // een oorlog zonder reden of tijdens een bestand stoot iedereen af
    for (const x of Object.keys(t.facties)) if (x !== ha) wijzigOpinie(t, ha, x, -10);
    for (const v of t.vakken) if (v.eigenaar === ha) v.tevredenheid = Math.max(0, v.tevredenheid - (bestand ? 15 : 8));
  }
  meld(t, `${t.facties[ha].naam} verklaart ${t.facties[hb].naam} de oorlog${reden ? '' : ' zonder goede reden'}.`, 'diplomatie', undefined, [ha, hb]);
  // bondgenoten van de aangevallene komen helpen; bondgenoten van de aanvaller als ze willen
  for (const x of Object.keys(t.facties)) {
    if (x === ha || x === hb || !t.facties[x].bestaat || t.facties[x].heer) continue;
    if (t.bond.includes(paar(x, hb))) { verklaarOorlog(t, x, ha); meld(t, `${t.facties[x].naam} komt ${t.facties[hb].naam} te hulp.`, 'diplomatie'); }
    else if (t.bond.includes(paar(x, ha)) && opinie(t, x, ha) >= 0 && !t.bond.includes(paar(x, hb))) verklaarOorlog(t, x, hb);
  }
}

export function geschenk(t: Toestand, a: string, b: string, bedrag: number): boolean {
  if (t.facties[a].schat < bedrag || bedrag <= 0) return false;
  t.facties[a].schat -= bedrag;
  t.facties[b].schat += bedrag;
  wijzigOpinie(t, a, b, Math.min(30, bedrag / Math.max(5, vakkenVan(t, b).length) * 2));
  return true;
}

// ---------- maandelijks: moeheid, mening, vrede tussen computerspelers ----------

export function maandDiplomatie(t: Toestand, k: Kaart = standaardKaart, geenVrede = false) {
  for (const f of Object.values(t.facties)) {
    if (!f.bestaat) continue;
    f.moeheid = vijanden(t, f.id).length ? Math.min(100, f.moeheid + (f.soort === 'rijk' ? 0.2 : 0.4)) : Math.max(0, f.moeheid - 2);
  }
  // meningen zakken langzaam terug naar 0, buren wantrouwen elkaar een beetje
  for (const p of Object.keys(t.opinie)) {
    t.opinie[p] *= 0.98;
    if (Math.abs(t.opinie[p]) < 0.5) delete t.opinie[p];
  }
  for (const p of [...t.oorlog]) {
    const [a, b] = p.split('|');
    if (!t.facties[a]?.bestaat || !t.facties[b]?.bestaat) { t.oorlog = t.oorlog.filter((x) => x !== p); delete t.oorlogen[p]; continue; }
    if (mens(t, a) || mens(t, b)) {
      // de computer biedt de speler vrede aan als hij verliest of moe is
      const ander = a === t.speler ? b : a;
      const fa = t.facties[ander];
      if (oorlogsscore(t, ander, t.speler) < -40 || fa.moeheid > 70) {
        if (!t.wachtend.some((x) => x.id.startsWith('vredeaanbod-' + ander)) && kans(t) < 0.25) {
          t.wachtend.push({
            id: `vredeaanbod-${ander}-${t.dag}`, titel: `${fa.naam} vraagt vrede`,
            tekst: `${fa.naam} wil de oorlog beëindigen. Wat elk nu bezet, blijft van hem. Oorlogsscore voor jou: ${oorlogsscore(t, t.speler, ander)}.`,
            opties: [{ tekst: 'Vrede aanvaarden', gevolg: `vrede:${ander}` }, { tekst: 'Verder vechten', gevolg: 'niets' }],
          });
        }
      }
      continue;
    }
    // twee computerspelers: vrede als een van beide er genoeg van heeft
    if (geenVrede) continue;
    const s = oorlogsscore(t, a, b);
    const moe = Math.max(t.facties[a].moeheid, t.facties[b].moeheid);
    if ((Math.abs(s) > 60 || moe > 75) && kans(t) < 0.1 + moe / 500) sluitVredeAf(t, s >= 0 ? a : b, s >= 0 ? b : a, Math.abs(s) > 40);
  }
  void k;
}

/** soms verklaart een computerspeler een zwakke buur de oorlog (niet in elk tijdperk) */
export function kiOorlog(t: Toestand, f: string, k: Kaart = standaardKaart) {
  const fac = t.facties[f];
  if (!fac.bestaat || fac.heer || fac.moeheid > 30 || vijanden(t, f).length) return;
  if (kans(t) > 0.02) return;
  const buren = new Set<string>();
  for (const i of vakkenVan(t, f)) for (const b of k.vakken[i].buren) {
    const e = hoofd(t, t.vakken[b].eigenaar);
    if (e !== f && !bevriend(t, e, f)) buren.add(e);
  }
  const mijn = macht(t, f);
  for (const b of buren) {
    if ((t.bestand[paar(f, b)] ?? 0) > t.dag) continue;
    if (!oorlogsreden(t, f, b) && opinie(t, f, b) > -20) continue;
    if (mijn > macht(t, b) * 1.6 && sterkteVan(t, f) > 2000) { verklaarOorlogActie(t, f, b); return; }
  }
}

export { sluitBond };
