/**
 * Stroken op de gevel (ronde 14, 17/11): een gevelmateriaal op een deel van een gevel, niet op een heel muurvlak. Een band
 * in hout of crepi over de breedte van een verdieping, een staande strook naast de voordeur, een kader rond een raam, een
 * band onder de dakrand. Jonas: *"Kan het ook mogelijk worden om stroken een bepaalde opmaak te geven buiten en niet de
 * volledige muur?"*
 *
 * Een strook hangt aan een **gevel** (de kant van de woning, eventueel één verdieping of één muurvlak), met een plaats langs
 * de gevel en in de hoogte (cm). Ze loopt door over de muurvlakken van die gevel (op dezelfde lijn), de ramen en deuren
 * zitten er vanzelf uit, en een latere strook gaat voor op een eerdere (zoals verven). Eén meetkunde (`strookStukken`) voor
 * alles: de 3D (een bekleding van 2 cm vóór de muur, `strookBlokken`), het gevelaanzicht en de m² (`gevels.ts`).
 *
 * Grenzen: alleen rechte muren (een schuine muur krijgt geen strook); bestaande muren en muren tegen de buren ook niet (ze
 * worden niet gebouwd). Zonder stroken verandert er niets: geen blok, geen vorm, geen m².
 */
import { dakHoogte, gevelOnderDak, prisma, type HellendDak } from './dak.js';
import type { Blok } from './ruimtelijk.js';
import {
  buitenKant, gevelAfwerking, heeftBestaand, murenVan, muurStatus, muurVanOpening, niveauPlan, verdiepingenVan,
  vlakSleutel, vloerHoogte, VLOERDIKTE,
  type GevelKant, type GevelKeuze, type Muur, type Opening, type PlanCatalogus, type Plattegrond,
} from './plattegrond.js';

/** Een strook op de gevel: een materiaal (zoals de sokkel: `GevelKeuze` met de plaats erbij). */
export interface GevelStrook extends GevelKeuze {
  /** Uniek in het plan, zonder punt of dubbele punt (het is ook een stuk van de code van een blok in de 3D). */
  id: string;
  /** De gevel: de kant van de woning (zoals `buitenKant`). */
  kant: GevelKant;
  /**
   * Alleen deze verdieping; de hoogtes tellen dan vanaf haar vloer. Ontbreekt = de hele gevel (alle verdiepingen, de
   * hoogtes vanaf de vloer van het gelijkvloers).
   */
  niveau?: number;
  /** Alleen dit muurvlak (sleutel zoals `vlakSleutel`). Ontbreekt = elk muurvlak van de gevel (en de verdieping). */
  vlak?: string;
  /** Langs de gevel, op het plan (cm): x bij de kanten boven en onder, y bij links en rechts. Ontbreekt = tot het einde. */
  van?: number;
  tot?: number;
  /** In de hoogte (cm), boven de vloer (zie `niveau`). Ontbreekt = tot onderaan of tot bovenaan (ook de topgevel). */
  onder?: number;
  boven?: number;
}

/** Dikte van een strook in de 3D (cm): minder dan wat er al vóór de gevel steekt (dorpel 3 à 4 cm, muurkap 1,5 cm, maar niet gelijk). */
export const STROOK_DIKTE = 2;

/** Een punt op het buitenvlak van een gevel: [langs de muur (planmaat), hoogte boven de vloer van de verdieping]. */
export type GevelPunt = [number, number];

/** Een muurvlak op het buitenvlak: van waar tot waar zijn buitenkant loopt (zoals de m² in `gevelOppervlaktes`). */
export interface VlakStuk { muur: Muur; sleutel: string; a0: number; a1: number }

/**
 * Alle muren van één verdieping met hetzelfde buitenvlak (een gevel op één lijn): de kant, de as, waar het vlak ligt
 * (`vlak`: y bij as h, x bij as v) en naar waar buiten is (`buiten`: −1 = naar de kleinere coördinaat).
 */
export interface StrookLijn {
  niveau: number;
  kant: GevelKant;
  as: 'h' | 'v';
  vlak: number;
  buiten: -1 | 1;
  muren: VlakStuk[];
}

/** Een stuk van een strook op één gevellijn: bolle veelhoeken op het buitenvlak (een rechthoek heeft vier punten). */
export interface StrookStuk {
  strook: GevelStrook;
  lijn: StrookLijn;
  veelhoeken: GevelPunt[][];
}

/** De stroken van een plan (leeg zonder). */
export const strokenVan = (plan: Plattegrond): GevelStrook[] => plan.gevelOntwerp?.stroken ?? [];

/**
 * Van waar tot waar de buitenkant van een rechte buitenmuur loopt, langs haar as: op een buitenhoek een halve muurdikte
 * verder, op een binnenhoek een halve muurdikte minder (zoals `buitenLengte` in gevels.ts). Zo sluiten de muurvlakken van
 * een gevel op elkaar aan, zonder overlap.
 */
export function buitenStuk(m: Muur, muren: Muur[]): [number, number] {
  const binnen = m.plus ? 1 : -1;
  const d = [0, 0];
  [m.van, m.tot].forEach((p, i) => {
    const v = muren.find((x) => x.as !== m.as && x.as !== 's' && x.soort === 'buiten' && Math.abs(x.lijn - p) < 0.5 && (Math.abs(x.van - m.lijn) < 0.5 || Math.abs(x.tot - m.lijn) < 0.5));
    if (!v) return;
    const richting = Math.abs(v.van - m.lijn) < 0.5 ? 1 : -1;
    const verder = richting === binnen ? v.dikte / 2 : -v.dikte / 2;
    d[i] = i === 0 ? -verder : verder;
  });
  return [m.van + d[0]!, m.tot + d[1]!];
}

/** De gevellijnen van één verdieping: rechte, nieuwe buitenmuren, per buitenvlak samen. */
export function strookLijnen(plan: Plattegrond, n: number): StrookLijn[] {
  const p = niveauPlan(plan, n);
  const muren = murenVan(p);
  const oud = heeftBestaand(plan);
  const uit: StrookLijn[] = [];
  for (const m of muren) {
    if (m.soort !== 'buiten' || m.as === 's') continue;
    if (oud && muurStatus(plan, m) !== 'nieuw') continue;
    const buiten: -1 | 1 = m.plus ? -1 : 1;
    const vlak = m.lijn + (buiten * m.dikte) / 2;
    const [a0, a1] = buitenStuk(m, muren);
    let l = uit.find((x) => x.as === m.as && x.buiten === buiten && Math.abs(x.vlak - vlak) < 0.5);
    if (!l) uit.push((l = { niveau: n, kant: buitenKant(m)!, as: m.as, vlak, buiten, muren: [] }));
    l.muren.push({ muur: m, sleutel: vlakSleutel(m), a0, a1 });
  }
  for (const l of uit) l.muren.sort((x, y) => x.a0 - y.a0);
  return uit;
}

// ---------- veelhoeken op het buitenvlak ----------

/** Knipt een bolle veelhoek af langs een as (0 = langs, 1 = hoogte): houdt wat ≤ (onder) of ≥ (boven) de waarde ligt. */
function knip(v: GevelPunt[], as: 0 | 1, waarde: number, houd: 'onder' | 'boven'): GevelPunt[] {
  const binnen = (p: GevelPunt) => (houd === 'onder' ? p[as] <= waarde + 1e-9 : p[as] >= waarde - 1e-9);
  const uit: GevelPunt[] = [];
  for (let i = 0; i < v.length; i++) {
    const p = v[i]!, q = v[(i + 1) % v.length]!;
    const pb = binnen(p), qb = binnen(q);
    if (pb) uit.push(p);
    if (pb !== qb) {
      const t = (waarde - p[as]) / (q[as] - p[as]);
      const s: GevelPunt = as === 0 ? [waarde, p[1] + t * (q[1] - p[1])] : [p[0] + t * (q[0] - p[0]), waarde];
      uit.push(s);
    }
  }
  return uit;
}

/** Oppervlakte van een veelhoek op het buitenvlak (cm²). */
export function vlakOppervlakte(v: GevelPunt[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    const [x0, y0] = v[i]!, [x1, y1] = v[(i + 1) % v.length]!;
    s += x0 * y1 - x1 * y0;
  }
  return Math.abs(s) / 2;
}

/** Een rechthoek op het buitenvlak (`a0`–`a1` langs, `h0`–`h1` in de hoogte), tegen de wijzers in. */
export interface GevelRechthoek { a0: number; a1: number; h0: number; h1: number }
const rechthoek = (r: GevelRechthoek): GevelPunt[] => [[r.a0, r.h0], [r.a1, r.h0], [r.a1, r.h1], [r.a0, r.h1]];
const ONEINDIG = 1e7;

/** De veelhoek binnen de rechthoek. */
export function binnenRechthoek(v: GevelPunt[], r: GevelRechthoek): GevelPunt[] {
  let x = v;
  for (const [as, w, h] of [[0, r.a0, 'boven'], [0, r.a1, 'onder'], [1, r.h0, 'boven'], [1, r.h1, 'onder']] as const) {
    if (x.length < 3) return [];
    x = knip(x, as, w, h);
  }
  return x.length >= 3 ? x : [];
}

/** Een stuk dat telt: niet leeg en niet smaller dan 0,5 cm. */
function telt(v: GevelPunt[]): boolean {
  if (v.length < 3) return false;
  const as = v.map((q) => q[0]), hs = v.map((q) => q[1]);
  return Math.max(...as) - Math.min(...as) > 0.5 && Math.max(...hs) - Math.min(...hs) > 0.5 && vlakOppervlakte(v) > 1;
}

/** Een bolle veelhoek min een rechthoek: hoogstens vier bolle stukken (links, rechts, eronder, erboven). */
function zonder(v: GevelPunt[], r: GevelRechthoek): GevelPunt[][] {
  if (!telt(binnenRechthoek(v, r))) return [v];
  const midden = binnenRechthoek(v, { a0: r.a0, a1: r.a1, h0: -ONEINDIG, h1: ONEINDIG });
  return [
    knip(v, 0, r.a0, 'onder'),
    knip(v, 0, r.a1, 'boven'),
    midden.length >= 3 ? knip(midden, 1, r.h0, 'onder') : [],
    midden.length >= 3 ? knip(midden, 1, r.h1, 'boven') : [],
  ].filter(telt);
}

/** Is de veelhoek een rechthoek met zijden langs de assen? Dan wordt ze in de 3D een gewoon blok. */
export function isRechthoek(v: GevelPunt[]): GevelRechthoek | undefined {
  const as = v.map((q) => q[0]), hs = v.map((q) => q[1]);
  const r = { a0: Math.min(...as), a1: Math.max(...as), h0: Math.min(...hs), h1: Math.max(...hs) };
  return v.every(([a, h]) => (Math.abs(a - r.a0) < 0.01 || Math.abs(a - r.a1) < 0.01) && (Math.abs(h - r.h0) < 0.01 || Math.abs(h - r.h1) < 0.01))
    && Math.abs(vlakOppervlakte(v) - (r.a1 - r.a0) * (r.h1 - r.h0)) < 0.5 ? r : undefined;
}

// ---------- de stukken van de stroken ----------

/** Waar een opening in de strook gesneden wordt: van–tot in de hoogte boven de vloer (standaard het kader). */
export type Uitsparing = (o: Opening) => [number, number];
const kaderUitsparing: Uitsparing = (o) => [o.borstwering, o.borstwering + o.hoogte];

/**
 * Het gevelvlak van een gevellijn waar een strook kan komen: per stuk aaneensluitende muurvlakken een rechthoek van de
 * vloer (op een verdieping 30 cm lager, voor de rand van de vloerplaat) tot de muurhoogte, en onder een hellend dak
 * (`dak`, alleen op de bovenste verdieping) de topgevel of de hoge gevel van een lessenaar erboven. `muren` beperkt het
 * vlak tot die muurvlakken.
 */
function gevelVlak(plan: Plattegrond, l: StrookLijn, muren: VlakStuk[], dak?: HellendDak): GevelPunt[][] {
  const H = plan.muurhoogte, onder = l.niveau > 0 ? -VLOERDIKTE : 0;
  // Aaneensluitende muurvlakken samen: geen naad in de strook waar een binnenmuur tegen de gevel komt.
  const stukken: [number, number][] = [];
  for (const m of [...muren].sort((x, y) => x.a0 - y.a0)) {
    const laatste = stukken[stukken.length - 1];
    if (laatste && m.a0 <= laatste[1] + 0.5) laatste[1] = Math.max(laatste[1], m.a1);
    else stukken.push([m.a0, m.a1]);
  }
  const uit: GevelPunt[][] = [];
  for (const [a0, a1] of stukken) {
    uit.push(rechthoek({ a0, a1, h0: onder, h1: H }));
    if (!dak) continue;
    if ((l.as === 'h') !== (dak.nokAs === 'x')) {
      // Topgevel: dwars op de nok, tot onder het dak (zoals het gevelaanzicht).
      const b0 = Math.max(a0, dak.p0), b1 = Math.min(a1, dak.p1);
      const top = b1 - b0 > 0.5 ? gevelOnderDak(dak, b0, b1) : [];
      if (top.length >= 3) uit.push(top.map(([a, h]): GevelPunt => [a, H + h]));
    } else {
      // Langs de nok: alleen de hoge gevel van een lessenaar komt boven de dakvoet uit.
      const h = Math.max(0, dakHoogte(dak, l.vlak));
      if (h > 0.5) uit.push(rechthoek({ a0, a1, h0: H, h1: H + h }));
    }
  }
  return uit;
}

/** De rechthoek van een strook op een verdieping (hoogtes vanaf de vloer van die verdieping). */
function strookRechthoek(plan: Plattegrond, s: GevelStrook, n: number): GevelRechthoek {
  const y = s.niveau === undefined ? vloerHoogte(plan, n) : 0;
  return {
    a0: s.van ?? -ONEINDIG, a1: s.tot ?? ONEINDIG,
    h0: s.onder === undefined ? -ONEINDIG : s.onder - y, h1: s.boven === undefined ? ONEINDIG : s.boven - y,
  };
}

/** Geldt de strook voor deze gevellijn? En op welke muurvlakken? */
function murenVoor(s: GevelStrook, l: StrookLijn): VlakStuk[] {
  if (s.kant !== l.kant) return [];
  if (s.niveau !== undefined && s.niveau !== l.niveau) return [];
  return s.vlak ? l.muren.filter((m) => m.sleutel === s.vlak) : l.muren;
}

/**
 * De stukken van alle stroken op één verdieping: per strook en gevellijn wat er van haar rechthoek op het gevelvlak ligt,
 * zonder de openingen (`uitsparing`, standaard het kader) en zonder wat een latere strook bedekt. `dak` = het hellende dak
 * als het op deze verdieping ligt (dan ook de topgevel).
 */
export function strookStukken(plan: Plattegrond, n: number, opties: { uitsparing?: Uitsparing; dak?: HellendDak; lijnen?: StrookLijn[] } = {}): StrookStuk[] {
  const stroken = strokenVan(plan);
  if (!stroken.length) return [];
  const lijnen = opties.lijnen ?? strookLijnen(plan, n);
  const uitsparing = opties.uitsparing ?? kaderUitsparing;
  const openingen = niveauPlan(plan, n).openingen;
  const uit: StrookStuk[] = [];
  for (const l of lijnen) {
    const gaten = openingen.filter((o) => l.muren.some((m) => muurVanOpening(o, [m.muur]) === m.muur)).map((o): GevelRechthoek => {
      const [h0, h1] = uitsparing(o);
      return { a0: o.midden - o.breedte / 2, a1: o.midden + o.breedte / 2, h0, h1 };
    });
    // Wat elke strook op deze lijn bedekt, vóór de latere stroken eraf gaan (rechthoeken, begrensd tot haar muurvlakken).
    const bedekking = stroken.map((s) => {
      const muren = murenVoor(s, l);
      if (!muren.length) return [];
      const r = strookRechthoek(plan, s, n);
      const a0 = Math.min(...muren.map((m) => m.a0)), a1 = Math.max(...muren.map((m) => m.a1));
      return [{ ...r, a0: Math.max(r.a0, a0), a1: Math.min(r.a1, a1) }];
    });
    stroken.forEach((s, i) => {
      const muren = murenVoor(s, l);
      if (!muren.length) return;
      const r = strookRechthoek(plan, s, n);
      let stukken = gevelVlak(plan, l, muren, opties.dak).map((v) => binnenRechthoek(v, r)).filter(telt);
      for (const g of gaten) stukken = stukken.flatMap((v) => zonder(v, g));
      for (const later of bedekking.slice(i + 1).flat()) stukken = stukken.flatMap((v) => zonder(v, later));
      if (stukken.length) uit.push({ strook: s, lijn: l, veelhoeken: stukken });
    });
  }
  return uit;
}

/** Het omsluitende kader van een veelhoek op het buitenvlak. */
export function vlakKader(v: GevelPunt[]): GevelRechthoek {
  const as = v.map((q) => q[0]), hs = v.map((q) => q[1]);
  return { a0: Math.min(...as), a1: Math.max(...as), h0: Math.min(...hs), h1: Math.max(...hs) };
}

// ---------- 3D ----------

const r2 = (x: number) => Math.round(x * 100) / 100;

/**
 * De stroken van één verdieping als blokken in de 3D (cm, met de vloerhoogte erbij): een bekleding van `STROOK_DIKTE`
 * vóór de muur, de openingen eruit tot onder de dorpel en tot boven de zonweringskast (zoals de muur zelf, anders vallen
 * de bovenvlakken van dorpel en strook samen), de topgevel als prisma. Op een buitenhoek waar twee stroken elkaar raken,
 * vult een hoekstuk de inham. `laag` knipt (Muren laag), `ding` geeft de code met het ding `strook:<id>`.
 */
export function strookBlokken(
  plan: Plattegrond, cat: PlanCatalogus | undefined, n: number,
  opties: { uitsparing?: Uitsparing; dak?: HellendDak; laag?: number; code?: (strook: string, code: string) => string } = {},
): Blok[] {
  const stukken = strookStukken(plan, n, { uitsparing: opties.uitsparing, dak: opties.dak });
  if (!stukken.length) return [];
  const y0 = vloerHoogte(plan, n), D = STROOK_DIKTE;
  const codeVan = opties.code ?? ((_s, c) => c);
  const uit: Blok[] = [];
  // Voor de hoekstukken: per stuk het kader op zijn lijn.
  const kaders: { s: StrookStuk; r: GevelRechthoek; blok: number }[] = [];
  let i = 0;
  for (const st of stukken) {
    const afw = gevelAfwerking(plan, cat, st.strook);
    const { as, vlak, buiten } = st.lijn;
    const d0 = buiten < 0 ? vlak - D : vlak;
    for (let v of st.veelhoeken) {
      if (opties.laag !== undefined) v = binnenRechthoek(v, { a0: -ONEINDIG, a1: ONEINDIG, h0: -ONEINDIG, h1: opties.laag });
      if (!telt(v)) continue;
      const code = codeVan(st.strook.id, `strook_${st.strook.id}_${i++}`);
      const r = isRechthoek(v);
      if (r) {
        const basis = { code, soort: afw.soort, vorm: 'blok' as const, kleur: afw.kleur, ...(afw.voeg ? { voeg: afw.voeg } : {}), y: r2(y0 + r.h0), h: r2(r.h1 - r.h0) };
        uit.push(as === 'h'
          ? { ...basis, x: r2(r.a0), z: r2(d0), b: r2(r.a1 - r.a0), d: D }
          : { ...basis, x: r2(d0), z: r2(r.a0), b: D, d: r2(r.a1 - r.a0) });
        kaders.push({ s: st, r, blok: uit.length - 1 });
      } else {
        uit.push(prisma(code, afw.soort, afw.kleur, as === 'h' ? 'z' : 'x', d0, d0 + D, v.map(([a, h]): [number, number] => [a, y0 + h]), afw.voeg ? { voeg: afw.voeg } : {}));
      }
    }
  }
  // Hoekstukken: twee stroken die op een buitenhoek samenkomen (een band die rond de hoek loopt), elk vóór haar eigen
  // gevel. Zonder hoekstuk blijft daar een inham van 2 × 2 cm, die als donkere lijn langs de hoek opvalt.
  for (const p of kaders) {
    if (p.s.lijn.as !== 'h') continue;
    for (const q of kaders) {
      if (q.s.lijn.as !== 'v') continue;
      const h = p.s.lijn, v = q.s.lijn;
      // Het einde van p ligt op het buitenvlak van v, en het einde van q op het buitenvlak van h, aan de buitenkant.
      const pEinde = v.buiten > 0 ? p.r.a1 : p.r.a0, qEinde = h.buiten > 0 ? q.r.a1 : q.r.a0;
      if (Math.abs(pEinde - v.vlak) > 0.5 || Math.abs(qEinde - h.vlak) > 0.5) continue;
      // Alleen op een buitenhoek: de strook van p ligt naast (niet achter) het vlak van v.
      if (v.buiten > 0 ? p.r.a0 > v.vlak - 0.5 : p.r.a1 < v.vlak + 0.5) continue;
      const h0 = Math.max(p.r.h0, q.r.h0), h1 = Math.min(p.r.h1, q.r.h1);
      if (h1 - h0 < 0.5) continue;
      const afw = gevelAfwerking(plan, cat, p.s.strook);
      uit.push({
        code: codeVan(p.s.strook.id, `strook_${p.s.strook.id}_hoek_${i++}`), soort: afw.soort, vorm: 'blok', kleur: afw.kleur, ...(afw.voeg ? { voeg: afw.voeg } : {}),
        x: r2(v.buiten > 0 ? v.vlak : v.vlak - D), y: r2(y0 + h0), z: r2(h.buiten > 0 ? h.vlak : h.vlak - D), b: D, h: r2(h1 - h0), d: D,
      });
    }
  }
  return uit;
}

// ---------- m² ----------

/** Per muurvlak en strook: de m² van de strook op dat muurvlak, gesplitst in het stuk op de sokkel en de rest (cm²). */
export interface StrookOppervlak { strook: GevelStrook; niveau: number; kant: GevelKant; sleutel: string; op: number; opSokkel: number }

/** De oppervlakte van de stroken per muurvlak (met het kader als opening, zoals de m² van de muren). */
export function strookOppervlaktes(plan: Plattegrond, dak?: { top: number; hellend?: HellendDak }): StrookOppervlak[] {
  if (!strokenVan(plan).length) return [];
  const sokkelH = plan.gevelOntwerp?.sokkel?.hoogte ?? 0;
  const uit: StrookOppervlak[] = [];
  verdiepingenVan(plan).forEach((_, n) => {
    const hellend = dak?.hellend && n === dak.top ? dak.hellend : undefined;
    for (const st of strookStukken(plan, n, { dak: hellend })) {
      for (const m of st.lijn.muren) {
        let op = 0, opSokkel = 0;
        for (const v of st.veelhoeken) {
          const deel = binnenRechthoek(v, { a0: m.a0, a1: m.a1, h0: -ONEINDIG, h1: ONEINDIG });
          if (deel.length < 3) continue;
          const sh = n === 0 ? Math.min(sokkelH, plan.muurhoogte) : 0;
          const s = sh > 0 ? vlakOppervlakte(binnenRechthoek(deel, { a0: -ONEINDIG, a1: ONEINDIG, h0: -ONEINDIG, h1: sh })) : 0;
          opSokkel += s;
          op += vlakOppervlakte(deel) - s;
        }
        if (op + opSokkel > 0.5) uit.push({ strook: st.strook, niveau: n, kant: st.lijn.kant, sleutel: m.sleutel, op, opSokkel });
      }
    }
  });
  return uit;
}

// ---------- in het plan ----------

/** Een nieuwe id voor een strook (`s1`, `s2` …). */
export function nieuweStrookId(plan: Plattegrond): string {
  const bezet = new Set(strokenVan(plan).map((s) => s.id));
  let i = 1;
  while (bezet.has(`s${i}`)) i++;
  return `s${i}`;
}

/** Zet een strook in het plan (achteraan: ze gaat voor op de vorige). Het gevelontwerp moet al bestaan. */
export function voegStrookToe(plan: Plattegrond, s: Omit<GevelStrook, 'id'> & { id?: string }): GevelStrook {
  const o = plan.gevelOntwerp!;
  const strook = { ...s, id: s.id ?? nieuweStrookId(plan) } as GevelStrook;
  o.stroken = [...(o.stroken ?? []), strook];
  return strook;
}

/** Haalt een strook uit het plan (het veld verdwijnt als er geen meer is). */
export function verwijderStrook(plan: Plattegrond, id: string) {
  const o = plan.gevelOntwerp;
  if (!o?.stroken) return;
  o.stroken = o.stroken.filter((s) => s.id !== id);
  if (!o.stroken.length) delete o.stroken;
}

/** De strook met deze id. */
export const strookVan = (plan: Plattegrond, id: string) => strokenVan(plan).find((s) => s.id === id);

/** Omschrijving van een strook in gewone taal: waar ze ligt en hoe groot ze is (zonder het materiaal). */
export function strookPlaats(plan: Plattegrond, s: GevelStrook): string {
  const naam = s.niveau === undefined ? 'de hele gevel' : (verdiepingenVan(plan)[s.niveau]?.naam ?? `verdieping ${s.niveau}`).toLowerCase();
  const breed = s.van === undefined && s.tot === undefined ? 'over de hele breedte' : s.van !== undefined && s.tot !== undefined ? `${Math.round(s.tot - s.van)} cm breed` : 'tot aan de rand';
  const hoog = s.onder === undefined && s.boven === undefined ? 'over de hele hoogte' : s.onder !== undefined && s.boven !== undefined ? `${Math.round(s.boven - s.onder)} cm hoog` : s.onder !== undefined ? `vanaf ${Math.round(s.onder)} cm` : `tot ${Math.round(s.boven!)} cm`;
  return `${breed}, ${hoog} (${naam})`;
}
