// Economie en bestuur: belastingen, soldij, bouwen, bevolking, tevredenheid en opstanden.
//
// Alle bedragen zijn in "zilver", een spelmunt. De getallen zijn gekozen voor het spel,
// niet uit bronnen: het zijn verhoudingen, geen historische waarden.
import { kaart as standaardKaart, TERREIN, type Kaart } from '../kaart/kaart';
import { bevriend, kans, legersIn, meld, wie, inOorlog, vakkenVan, verklaarOorlog, paar, type Soort, type Toestand, type VakToestand } from './toestand';
import { prijsfactor, rang } from './volgorde';

export type Belasting = 'laag' | 'gewoon' | 'hoog';
export const BELASTING: Record<Belasting, { naam: string; inkomen: number; tevredenheid: number }> = {
  laag: { naam: 'Laag', inkomen: 0.6, tevredenheid: 10 },
  gewoon: { naam: 'Gewoon', inkomen: 1, tevredenheid: 0 },
  hoog: { naam: 'Hoog', inkomen: 1.5, tevredenheid: -15 },
};

export type Gebouw = 'landbouw' | 'markt' | 'versterking' | 'weg' | 'haven' | 'nijverheid';

interface GebouwInfo {
  /** naam per niveau (niveau 1 = index 0) */
  namen: string[];
  uitleg: string;
  kost: number;
  dagen: number;
  max: number;
  /** vanaf welk tijdperk elk niveau kan */
  vanaf: string[];
}
export const GEBOUWEN: Record<Gebouw, GebouwInfo> = {
  landbouw: { namen: ['Akkers ontginnen', 'Meer akkers', 'Polders en weiden'], uitleg: 'Meer volk en meer opbrengst.', kost: 60, dagen: 120, max: 3, vanaf: ['romeinen', 'romeinen', 'romeinen'] },
  markt: { namen: ['Markt'], uitleg: 'Meer handel en wat meer tevredenheid.', kost: 100, dagen: 180, max: 1, vanaf: ['romeinen'] },
  versterking: { namen: ['Versterking', 'Sterkere versterking', 'Vesting'], uitleg: 'Vijanden moeten ze belegeren.', kost: 150, dagen: 240, max: 3, vanaf: ['romeinen', 'romeinen', 'romeinen'] },
  weg: { namen: ['Weg', 'Spoorweg'], uitleg: 'Legers trekken sneller door dit vak; ook meer handel.', kost: 80, dagen: 90, max: 2, vanaf: ['romeinen', 'belgie'] },
  haven: { namen: ['Haven'], uitleg: 'Handel over zee of rivier. Alleen aan de kust of een rivier.', kost: 120, dagen: 200, max: 1, vanaf: ['franken'] },
  nijverheid: { namen: ['Lakenweverij', 'Fabrieken'], uitleg: 'Ambachten en later fabrieken: veel meer opbrengst.', kost: 140, dagen: 240, max: 2, vanaf: ['hogemiddeleeuwen', 'belgie'] },
};

export function gebouwNaam(g: Gebouw, niv: number): string {
  const n = GEBOUWEN[g].namen;
  return n[Math.min(n.length - 1, Math.max(0, niv - 1))];
}

export function gebouwKost(t: Toestand, g: Gebouw): number {
  return Math.round(GEBOUWEN[g].kost * prijsfactor(t.tijdperk));
}

/** soldij per 1000 man per maand */
export const SOLDIJ: Record<Soort, number> = { rijk: 3, staat: 2, stam: 1.2 };
/** kost om 1000 man op te roepen */
export const OPROEPKOST = 10;

export function niveau(v: VakToestand, g: Gebouw): number {
  if (g === 'versterking') return v.fort > 0 ? Math.min(3, Math.round(v.fort / 1500)) : 0;
  return v[g] ?? 0;
}

/** inkomen van één vak per maand, voor de eigenaar */
export function inkomenVak(t: Toestand, k: Kaart, i: number): number {
  const v = t.vakken[i], kv = k.vakken[i];
  const f = t.facties[v.eigenaar];
  let x = (v.bevolking / 1000) * 0.5;
  x *= 1 + 0.15 * v.landbouw + 0.25 * v.markt + 0.1 * v.weg + 0.2 * (v.haven ?? 0) + 0.3 * (v.nijverheid ?? 0);
  if (kv.rivier) x *= 1.1;
  if (kv.kust) x *= 1.05;
  x *= BELASTING[f.belasting].inkomen;
  x *= 0.4 + 0.6 * (v.tevredenheid / 100);
  if (v.bezetter) x *= 0.3;
  return x;
}

export function soldijVan(t: Toestand, f: string): number {
  const soort = t.facties[f].soort;
  return t.legers.filter((l) => l.factie === f).reduce((s, l) => s + (l.sterkte / 1000) * SOLDIJ[soort], 0);
}

export interface Rekening {
  belasting: number;
  steun: number;
  schatting: number;
  soldij: number;
  bouw: number;
  netto: number;
}

/** wat een factie deze maand verdient en uitgeeft (zonder bouwkosten, die worden meteen betaald) */
export function rekening(t: Toestand, f: string, k: Kaart = standaardKaart): Rekening {
  const fac = t.facties[f];
  let belasting = 0;
  for (const i of vakkenVan(t, f)) belasting += inkomenVak(t, k, i);
  // een onderworpen volk betaalt een derde aan zijn heer
  let schatting = 0;
  if (fac.heer) schatting = -belasting / 3;
  else if (fac.leenheer && t.facties[fac.leenheer]?.bestaat) schatting = -belasting / 10;
  for (const ander of Object.values(t.facties)) {
    if (!ander.bestaat || (ander.heer !== f && (ander.heer || ander.leenheer !== f))) continue;
    let b = 0;
    for (const i of vakkenVan(t, ander.id)) b += inkomenVak(t, k, i);
    schatting += ander.heer === f ? b / 3 : b / 10;
  }
  const steun = fac.buiten && !fac.heer ? fac.buiten.steun * prijsfactor(t.tijdperk) : 0;
  const soldij = -soldijVan(t, f);
  return { belasting, steun, schatting, soldij, bouw: 0, netto: belasting + steun + schatting + soldij };
}

// ---------- bouwen ----------

export function kanBouwen(t: Toestand, f: string, i: number, g: Gebouw, k: Kaart = standaardKaart): string | null {
  const v = t.vakken[i], fac = t.facties[f];
  const info = GEBOUWEN[g];
  const volgend = niveau(v, g) + 1;
  if (v.eigenaar !== f) return 'Niet jouw vak.';
  if (fac.heer) return 'Een onderworpen volk bouwt niet zelf.';
  if (volgend > info.max) return 'Al op het hoogste niveau.';
  if (rang(t.tijdperk) < rang(info.vanaf[volgend - 1])) return 'Kan nog niet in dit tijdperk.';
  if (g === 'weg' && t.tijdperk === 'romeinen' && fac.soort !== 'rijk') return 'Alleen Rome legt nu wegen aan.';
  if (g === 'haven' && !k.vakken[i].kust && !k.vakken[i].rivier) return 'Alleen aan de kust of een rivier.';
  if (v.bouw) return `Er wordt al gebouwd: ${gebouwNaam(v.bouw.wat, niveau(v, v.bouw.wat) + 1)}.`;
  if (v.bezetter || legersIn(t, i).some((l) => inOorlog(t, l.factie, f))) return 'Er is vijand in het vak.';
  if (fac.schat < gebouwKost(t, g)) return `Te weinig zilver (${gebouwKost(t, g)} nodig).`;
  return null;
}

/** gebouwen die in dit tijdperk bestaan (voor het scherm) */
export function gebouwenNu(t: Toestand): Gebouw[] {
  return (Object.keys(GEBOUWEN) as Gebouw[]).filter((g) => rang(t.tijdperk) >= rang(GEBOUWEN[g].vanaf[0]));
}

export function bouw(t: Toestand, f: string, i: number, g: Gebouw, k: Kaart = standaardKaart): boolean {
  if (kanBouwen(t, f, i, g, k)) return false;
  t.facties[f].schat -= gebouwKost(t, g);
  t.vakken[i].bouw = { wat: g, klaar: t.dag + GEBOUWEN[g].dagen };
  return true;
}

/** elke dag: werken die klaar zijn, afwerken */
export function werkBouwAf(t: Toestand, k: Kaart) {
  t.vakken.forEach((v, i) => {
    if (!v.bouw) return;
    if (v.bezetter) { v.bouw.klaar += 1; return; }
    if (t.dag < v.bouw.klaar) return;
    const g = v.bouw.wat;
    v.bouw = null;
    if (g === 'versterking') {
      v.fort = v.fort ? v.fort + 1500 : 2000;
      v.garnizoen = Math.max(v.garnizoen, v.fort * 0.5);
      if (!v.fortNaam) v.fortNaam = `Versterking van ${k.vakken[i].naam}`;
    } else v[g] = (v[g] ?? 0) + 1;
    if (v.eigenaar === t.speler) meld(t, `${gebouwNaam(g, niveau(v, g))} in ${k.vakken[i].naam} is klaar.`, 'info', i);
  });
}

// ---------- maandelijks ----------

export function tevredenheidDoel(t: Toestand, i: number): number {
  const v = t.vakken[i];
  const f = t.facties[v.eigenaar];
  let doel = 60;
  if (v.oorsprong !== v.eigenaar) {
    // vreemd bestuur weegt minder na verloop van tijd
    const jaren = (t.dag - v.sindsVerovering) / 365;
    doel -= jaren > 20 ? 5 : jaren > 8 ? 15 : 30;
  }
  if (f.heer) doel -= 8;
  doel -= f.moeheid / 10;
  doel += BELASTING[f.belasting].tevredenheid;
  doel += v.markt * 6;
  const legers = legersIn(t, i);
  if (legers.some((l) => inOorlog(t, l.factie, v.eigenaar))) doel -= 25;
  else if (legers.some((l) => l.factie === v.eigenaar)) doel += 10;
  return Math.max(0, Math.min(100, doel));
}

export function maandEconomie(t: Toestand, k: Kaart = standaardKaart) {
  // geld
  for (const f of Object.values(t.facties)) {
    if (!f.bestaat) continue;
    const r = rekening(t, f.id, k);
    f.schat += r.netto;
    if (f.schat < -50) f.schat = -50;
    f.inkomenVorigeMaand = r.netto;
  }
  // bevolking en tevredenheid
  t.vakken.forEach((v, i) => {
    const kv = k.vakken[i];
    const plafond = TERREIN[kv.terrein].bevolking * (kv.oppervlakte / 235) * (1 + 0.25 * v.landbouw) * (kv.rivier ? 1.15 : 1) * 1.6;
    const groei = (0.006 + 0.003 * v.landbouw) / 12;
    v.bevolking = Math.round(v.bevolking + v.bevolking * groei * Math.max(-1, 1 - v.bevolking / plafond));
    const doel = tevredenheidDoel(t, i);
    v.tevredenheid += (doel - v.tevredenheid) * 0.2;
  });
  opstanden(t, k);
}

/** een vak onder vreemd bestuur dat erg ontevreden is, kan in opstand komen voor zijn eigen volk */
function opstanden(t: Toestand, k: Kaart) {
  t.vakken.forEach((v, i) => {
    if (v.tevredenheid >= 25 || v.oorsprong === v.eigenaar) return;
    if (kans(t) > (25 - v.tevredenheid) / 120) return;
    if (legersIn(t, i).some((l) => l.factie === v.eigenaar && l.sterkte > 1500)) return;
    const volk = t.facties[v.oorsprong];
    if (!volk) return;
    const oud = v.eigenaar;
    // tussen bondgenoten gaat het vak gewoon terug, zonder oorlog
    if (volk.bestaat && bevriend(t, volk.id, oud) && volk.heer !== oud && t.facties[oud].heer !== volk.id) {
      v.eigenaar = volk.id; v.tevredenheid = 55; v.sindsVerovering = t.dag; v.bezetter = null; v.bezetting = 0;
      meld(t, `${k.vakken[i].naam} keert terug naar ${wie(t, volk.id)}.`, 'info', i);
      return;
    }
    // het oude volk leeft weer op, als vrij volk
    volk.bestaat = true;
    if (volk.heer === oud) volk.heer = null;
    if (!volk.heer) {
      verklaarOorlog(t, volk.id, oud);
      for (const vriend of Object.keys(t.facties)) if (t.bond.includes(paar(vriend, oud))) verklaarOorlog(t, volk.id, vriend);
    }
    const leger = Math.max(800, Math.round((v.bevolking * 0.05) / 100) * 100);
    v.eigenaar = volk.id;
    v.tevredenheid = 55;
    v.sindsVerovering = t.dag;
    v.bezetter = null; v.bezetting = 0;
    if (v.fort) v.garnizoen = v.fort * 0.4;
    t.legers.push({
      id: t.volgendLeger++, naam: `Opstandelingen van ${k.vakken[i].naam}`, factie: volk.id, vak: i, sterkte: leger,
      moraal: 0.8, pad: [], voortgang: 0, overgestoken: 0, inStrijd: false,
    });
    meld(t, `${k.vakken[i].naam} komt in opstand tegen ${wie(t, oud)} en kiest weer voor ${wie(t, volk.id)}.`, 'gebeurtenis', i);
  });
}

// ---------- computerspelers ----------

export function kiEconomie(t: Toestand, f: string, k: Kaart = standaardKaart) {
  const fac = t.facties[f];
  if (!fac.bestaat || fac.heer) return;
  const eigen = vakkenVan(t, f);
  const onrustig = eigen.filter((i) => t.vakken[i].tevredenheid < 35).length;
  const r = rekening(t, f, k);
  if (fac.schat < 0 || (r.netto < 0 && fac.schat < 50)) fac.belasting = 'hoog';
  else if (onrustig > eigen.length * 0.4) fac.belasting = 'laag';
  else fac.belasting = 'gewoon';
  // bouwen met wat overschiet boven een reserve van drie maanden soldij
  const reserve = 3 * -r.soldij + 40;
  if (fac.schat < reserve) return;
  const opties: { i: number; g: Gebouw; waarde: number }[] = [];
  for (const i of eigen) {
    const v = t.vakken[i];
    for (const g of Object.keys(GEBOUWEN) as Gebouw[]) {
      if (kanBouwen(t, f, i, g)) continue;
      let waarde = v.bevolking / 6000;
      if (g === 'markt') waarde *= 1.5;
      if (g === 'versterking') waarde = fac.hoofdstad === i ? 1.5 : 0.2;
      if (g === 'weg') waarde *= 0.8;
      if (g === 'nijverheid') waarde *= 1.6;
      if (g === 'haven') waarde *= 1.2;
      opties.push({ i, g, waarde: waarde * (0.7 + kans(t) * 0.6) / gebouwKost(t, g) });
    }
  }
  opties.sort((a, b) => b.waarde - a.waarde);
  // tot drie werken per maand
  let gestart = 0;
  for (const o of opties) {
    if (gestart >= 3) break;
    if (gebouwKost(t, o.g) > fac.schat - reserve) continue;
    if (bouw(t, f, o.i, o.g)) gestart++;
  }
}
