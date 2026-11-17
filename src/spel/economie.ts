// Economie en bestuur: belastingen, soldij, bouwen, bevolking, tevredenheid en opstanden.
//
// Alle bedragen zijn in "zilver", een spelmunt. De getallen zijn gekozen voor het spel,
// niet uit bronnen: het zijn verhoudingen, geen historische waarden.
import { kaart as standaardKaart, TERREIN, type Kaart } from '../kaart/kaart';
import { kans, legersIn, meld, wie, inOorlog, vakkenVan, verklaarOorlog, paar, type Toestand, type VakToestand } from './toestand';

export type Belasting = 'laag' | 'gewoon' | 'hoog';
export const BELASTING: Record<Belasting, { naam: string; inkomen: number; tevredenheid: number }> = {
  laag: { naam: 'Laag', inkomen: 0.6, tevredenheid: 10 },
  gewoon: { naam: 'Gewoon', inkomen: 1, tevredenheid: 0 },
  hoog: { naam: 'Hoog', inkomen: 1.5, tevredenheid: -15 },
};

export type Gebouw = 'landbouw' | 'markt' | 'versterking' | 'weg';
export const GEBOUWEN: Record<Gebouw, { naam: string; uitleg: string; kost: number; dagen: number; max: number; enkelRijk?: boolean }> = {
  landbouw: { naam: 'Akkers ontginnen', uitleg: 'Meer volk en meer opbrengst.', kost: 60, dagen: 120, max: 3 },
  markt: { naam: 'Markt', uitleg: 'Meer handel en wat meer tevredenheid.', kost: 100, dagen: 180, max: 1 },
  versterking: { naam: 'Versterking', uitleg: 'Een versterking of een sterkere: vijanden moeten ze belegeren.', kost: 150, dagen: 240, max: 3 },
  weg: { naam: 'Romeinse weg', uitleg: 'Legers trekken sneller door dit vak; ook meer handel.', kost: 80, dagen: 90, max: 1, enkelRijk: true },
};

/** soldij per 1000 man per maand */
export const SOLDIJ = { rijk: 3, stam: 1.2 };
/** kost om 1000 man op te roepen */
export const OPROEPKOST = 10;
/** wat Rome elke maand van buiten het speelgebied krijgt */
export const STEUN_UIT_ROME = 75;

export function niveau(v: VakToestand, g: Gebouw): number {
  if (g === 'versterking') return v.fort > 0 ? Math.min(3, Math.round(v.fort / 1500)) : 0;
  return v[g];
}

/** inkomen van één vak per maand, voor de eigenaar */
export function inkomenVak(t: Toestand, k: Kaart, i: number): number {
  const v = t.vakken[i], kv = k.vakken[i];
  const f = t.facties[v.eigenaar];
  let x = (v.bevolking / 1000) * 0.5;
  x *= 1 + 0.15 * v.landbouw + 0.25 * v.markt + 0.1 * v.weg;
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
  for (const ander of Object.values(t.facties)) {
    if (ander.heer === f && ander.bestaat) {
      let b = 0;
      for (const i of vakkenVan(t, ander.id)) b += inkomenVak(t, k, i);
      schatting += b / 3;
    }
  }
  const steun = f === 'rome' ? STEUN_UIT_ROME : 0;
  const soldij = -soldijVan(t, f);
  return { belasting, steun, schatting, soldij, bouw: 0, netto: belasting + steun + schatting + soldij };
}

// ---------- bouwen ----------

export function kanBouwen(t: Toestand, f: string, i: number, g: Gebouw): string | null {
  const v = t.vakken[i], fac = t.facties[f];
  const info = GEBOUWEN[g];
  if (v.eigenaar !== f) return 'Niet jouw vak.';
  if (fac.heer) return 'Een onderworpen volk bouwt niet zelf.';
  if (info.enkelRijk && fac.soort !== 'rijk') return 'Alleen een rijk legt zulke wegen aan.';
  if (v.bouw) return `Er wordt al gebouwd: ${GEBOUWEN[v.bouw.wat].naam}.`;
  if (niveau(v, g) >= info.max) return 'Al op het hoogste niveau.';
  if (v.bezetter || legersIn(t, i).some((l) => inOorlog(t, l.factie, f))) return 'Er is vijand in het vak.';
  if (fac.schat < info.kost) return `Te weinig zilver (${info.kost} nodig).`;
  return null;
}

export function bouw(t: Toestand, f: string, i: number, g: Gebouw): boolean {
  if (kanBouwen(t, f, i, g)) return false;
  t.facties[f].schat -= GEBOUWEN[g].kost;
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
    } else v[g] += 1;
    if (v.eigenaar === t.speler) meld(t, `${GEBOUWEN[g].naam} in ${k.vakken[i].naam} is klaar.`, 'info', i);
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
    const oud = v.eigenaar;
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
      opties.push({ i, g, waarde: waarde * (0.7 + kans(t) * 0.6) / GEBOUWEN[g].kost });
    }
  }
  opties.sort((a, b) => b.waarde - a.waarde);
  // tot drie werken per maand
  let gestart = 0;
  for (const o of opties) {
    if (gestart >= 3) break;
    if (GEBOUWEN[o.g].kost > fac.schat - reserve) continue;
    if (bouw(t, f, o.i, o.g)) gestart++;
  }
}
