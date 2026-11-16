/**
 * Hulpfuncties om techniek in het plan te zetten (ronde 10), voor het scherm (ronde 10b, bouw-web/src/techniek-ui.ts): een toestel tegen de
 * dichtste wand zetten (ook een schuine), een leiding van A naar B die de wanden volgt, de technische ruimte als één
 * opstelling langs de wanden van een berging of garage, en de lus van een vloerverwarming in een ruimte. Zuivere
 * functies: ze geven een nieuw toestel of nieuwe punten terug en wijzigen het plan niet.
 *
 * Eenvoudig gehouden, zoals gevraagd: een leiding loopt haaks langs de muren en gaat recht door een muur waar dat moet;
 * er is geen zoektocht door de kamers. Ze vervangt het werk van de installateur niet: hij trekt de leiding bij waar
 * nodig (punten verslepen).
 */
import {
  asVan, binnenVorm, delenVan, langsAs, murenVan, muurVanOpening, muurVlak, niveauPlan, niveauVan, opAs, openingenVanRuimte, ruimteOp,
  verschuifZijden, vormVanDeel, type Muur, type Plattegrond, type Punt,
} from './plattegrond.js';
import { gevelLijnen } from './maatinvoer.js';
import {
  draaiNaar, nieuwToestel, standaardToestelHoogte, toestelMaten, toestelVoetafdruk, voorRichting, type Leiding, type TechniekCatalogus, type Toestel, type ToestelType,
} from './techniek.js';

const r1 = (x: number) => Math.round(x * 10) / 10;
const fijn = (x: number) => { const y = Math.round(x * 1e6) / 1e6; return y === 0 ? 0 : y; };

/** De dikte van de dikste muur die dwars op muur m staat op punt p langs m (0 als er geen is). */
function dwars(m: Muur, p: number, muren: Muur[]): number {
  if (m.as === 's') return 0;
  const op = muren.filter((x) => x.as !== m.as && x.as !== 's' && Math.abs(x.lijn - p) < 0.5 && x.van <= m.lijn + 0.5 && x.tot >= m.lijn - 0.5);
  return op.length ? Math.max(...op.map((x) => x.dikte)) : 0;
}

/** Waar een toestel tegen een wand komt: het toestel zelf (een kopie), de muur en de kant van die muur. */
export interface WandPlaats {
  toestel: Toestel;
  muur: Muur;
  /** De kant van de muur waar het toestel hangt (plus = de kant met de grotere coördinaat; zie `Muur`). */
  kant: 'min' | 'plus';
}

/**
 * Zet een toestel tegen de dichtste wand (binnen `maxAfstand` cm), ook een schuine: de achterkant tegen het muurvlak aan
 * de kant waar het toestel stond, de voorkant van de muur weg (de draaiing volgt de muur), de plaats langs de muur zo
 * dat het tussen de dwarsmuren blijft. Een toestel buiten (buitenunit) of op de vloer houdt de vrije ruimte achter
 * (`vrij.achter`) tussen zich en de muur. Geeft niets als er geen wand dichtbij is.
 */
export function tegenWand(plan: Plattegrond, t: Toestel, type: ToestelType, opties: { maxAfstand?: number; tussen?: number } = {}): WandPlaats | undefined {
  const muren = murenVan(niveauPlan(plan, niveauVan(t)));
  const max = opties.maxAfstand ?? 100;
  const m3 = toestelMaten(type, t.aan);
  const tussen = opties.tussen ?? (t.aan === 'wand' ? 0 : type.vrij?.achter ?? 0);
  let beste: { m: Muur; s: number; plus: boolean; afstand: number } | undefined;
  for (const m of muren) {
    const [s, w] = opAs(m, [t.x, t.y]);
    if (s < m.van || s > m.tot) continue;
    const afstand = Math.max(0, Math.abs(w - m.lijn) - m.dikte / 2);
    if (afstand <= max && (!beste || afstand < beste.afstand)) beste = { m, s, plus: w >= m.lijn, afstand };
  }
  if (!beste) return undefined;
  const { m, plus } = beste;
  // Tussen de dwarsmuren blijven (bij een te korte muur: in het midden). Bij een schuine muur: binnen het muurvlak aan
  // die kant, van hoek tot hoek (de zijde `plus` of `min` van haar grondvlak).
  let [a, b] = [m.van + dwars(m, m.van, muren) / 2, m.tot - dwars(m, m.tot, muren) / 2];
  if (m.as === 's') {
    const v = muurVlak(m, muren), i = v.randen?.indexOf(plus ? 'plus' : 'min') ?? -1;
    if (v.punten && i >= 0) {
      const s1 = opAs(m, v.punten[i]!)[0], s2 = opAs(m, v.punten[(i + 1) % v.punten.length]!)[0];
      [a, b] = [Math.min(s1, s2), Math.max(s1, s2)];
    }
  }
  a += m3.b / 2;
  b -= m3.b / 2;
  const s = a <= b ? Math.min(b, Math.max(a, beste.s)) : (m.van + m.tot) / 2;
  const w = m.lijn + (plus ? 1 : -1) * (m.dikte / 2 + tussen + m3.d / 2);
  const [x, y] = langsAs(m, s, w);
  const { n } = asVan(m);
  const voor: Punt = plus ? n : [-n[0], -n[1]];
  return { toestel: { ...t, x: r1(x), y: r1(y), draai: draaiNaar(voor) }, muur: m, kant: plus ? 'plus' : 'min' };
}

// ---------- een leiding langs de wanden ----------

/** Een muurvlak als lijn: liggend (y = c) of staand (x = c), van–tot langs die lijn. Schuine muren tellen hier niet. */
interface Vlaklijn { as: 'h' | 'v'; c: number; van: number; tot: number }

function vlaklijnen(muren: Muur[], afstand: number): Vlaklijn[] {
  const uit: Vlaklijn[] = [];
  for (const m of muren) {
    if (m.as === 's') continue;
    for (const k of [-1, 1]) uit.push({ as: m.as, c: m.lijn + k * (m.dikte / 2 + afstand), van: m.van, tot: m.tot });
  }
  return uit;
}

/** Hoeveel muren een lijnstuk kruist (dwars door de as van de muur, binnen haar lengte). */
function kruisingen(p: Punt, q: Punt, muren: Muur[]): number {
  let n = 0;
  for (const m of muren) {
    const [s1, w1] = opAs(m, p), [s2, w2] = opAs(m, q);
    if ((w1 - m.lijn) * (w2 - m.lijn) >= 0) continue;
    const t = (m.lijn - w1) / (w2 - w1), s = s1 + t * (s2 - s1);
    if (s > m.van + 0.5 && s < m.tot - 0.5) n++;
  }
  return n;
}

/** Het stuk van een lijnstuk dat langs een muurvlak loopt (cm). */
function langsWand(p: Punt, q: Punt, lijnen: Vlaklijn[], speling: number): number {
  const h = Math.abs(p[1] - q[1]) < 0.01, v = Math.abs(p[0] - q[0]) < 0.01;
  if (!h && !v) return 0;
  const [c, a, b] = h ? [p[1], Math.min(p[0], q[0]), Math.max(p[0], q[0])] : [p[0], Math.min(p[1], q[1]), Math.max(p[1], q[1])];
  let beste = 0;
  for (const l of lijnen) {
    if (l.as !== (h ? 'h' : 'v') || Math.abs(l.c - c) > speling) continue;
    beste = Math.max(beste, Math.min(b, l.tot) - Math.max(a, l.van));
  }
  return Math.max(0, beste);
}

/** Punten zonder dubbels en zonder tussenpunten op een rechte lijn. */
function vereenvoudig(punten: Punt[]): Punt[] {
  const uit: Punt[] = [];
  for (const p of punten) {
    const q = uit[uit.length - 1];
    if (q && Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.5) continue;
    uit.push([r1(p[0]), r1(p[1])]);
    while (uit.length >= 3) {
      const [a, b, c] = uit.slice(-3) as [Punt, Punt, Punt];
      const kruis = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      const terug = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) < 0;
      if (Math.abs(kruis) > 0.5 || terug) break;
      uit.splice(uit.length - 2, 1);
    }
  }
  return uit;
}

/**
 * Een leiding van A naar B die de wanden volgt, eenvoudig: van A loodrecht naar het dichtste muurvlak (op `afstand` cm
 * ervan), dan haaks verder (in een L of een Z, de middelste poot langs een muurvlak als dat kan) tot bij het muurvlak bij
 * B, en loodrecht naar B. Waar het moet, gaat ze recht door een muur. Van de mogelijke wegen kiest ze die met de minste
 * muren om door te gaan, dan de kortste, dan die het meest langs de muren loopt. Punten in cm op het plan.
 */
export function leidingLangsWanden(plan: Plattegrond, van: Punt, naar: Punt, opties: { niveau?: number; afstand?: number } = {}): Punt[] {
  const p = niveauPlan(plan, opties.niveau ?? 0);
  const muren = murenVan(p);
  const afstand = opties.afstand ?? 5;
  const lijnen = vlaklijnen(muren, afstand);
  // Het punt op het dichtste muurvlak, aan de kant van het punt zelf (binnen 80 cm; anders het punt zelf).
  const naarWand = (q: Punt): Punt => {
    let beste: { punt: Punt; d: number } | undefined;
    for (const m of muren) {
      const [s, w] = opAs(m, q);
      if (s < m.van + 1 || s > m.tot - 1) continue;
      const kant = w >= m.lijn ? 1 : -1, doel = m.lijn + kant * (m.dikte / 2 + afstand);
      const d = Math.abs(w - doel);
      if (Math.abs(w - m.lijn) < m.dikte / 2) continue;
      if (d <= 80 && (!beste || d < beste.d)) beste = { punt: langsAs(m, s, doel), d };
    }
    return beste?.punt ?? q;
  };
  const a = naarWand(van), b = naarWand(naar);
  const kandidaten: Punt[][] = [[a, [b[0], a[1]], b], [a, [a[0], b[1]], b]];
  const [x0, x1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])], [y0, y1] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  for (const l of lijnen) {
    if (l.as === 'v' && l.c > x0 - 50 && l.c < x1 + 50) kandidaten.push([a, [l.c, a[1]], [l.c, b[1]], b]);
    if (l.as === 'h' && l.c > y0 - 50 && l.c < y1 + 50) kandidaten.push([a, [a[0], l.c], [b[0], l.c], b]);
  }
  const binnenHuis = !!ruimteOp(p, van[0], van[1]) && !!ruimteOp(p, naar[0], naar[1]);
  const score = (weg: Punt[]) => {
    let lengte = 0, muur = 0, langs = 0, buiten = 0;
    for (let i = 1; i < weg.length; i++) {
      const q = weg[i - 1]!, r = weg[i]!, L = Math.hypot(r[0] - q[0], r[1] - q[1]);
      lengte += L;
      muur += kruisingen(q, r, muren);
      langs += langsWand(q, r, lijnen, 3);
      if (binnenHuis) {
        const stappen = Math.ceil(L / 20);
        for (let k = 1; k < stappen; k++) if (!ruimteOp(p, q[0] + ((r[0] - q[0]) * k) / stappen, q[1] + ((r[1] - q[1]) * k) / stappen)) buiten += L / stappen;
      }
    }
    // Een muur meer weegt als 3 m leiding, buiten de woning lopen als het dubbele; langs een muur is een beetje beter.
    return muur * 300 + lengte + 2 * buiten - 0.25 * langs;
  };
  const beste = kandidaten.reduce((x, y) => (score(y) < score(x) ? y : x));
  return vereenvoudig([van, ...beste, naar]);
}

// ---------- technische ruimte ----------

/** De opstelling van een technische ruimte: de toestellen langs de wanden, en wat niet paste. */
export interface TechnischeOpstelling {
  toestellen: Toestel[];
  /** De types die niet pasten (code), in gewone taal in `meldingen`. */
  nietGeplaatst: string[];
  meldingen: string[];
  /** Hoeveel wandlengte de toestellen samen vragen (cm, met de ruimte ertussen). */
  wandlengte: number;
  /** Hoeveel vrije wandlengte de ruimte heeft (cm, zonder deuren en ramen). */
  beschikbaar: number;
}

/**
 * De toestellen die samen horen (bv. tellerkast, verdeelbord, warmtepomp binnen, boiler, verdeler, ventilatie-unit,
 * collector) als één opstelling langs de wanden van een ruimte (berging, garage): naast elkaar, met de klok mee vanaf de
 * langste wand, `tussen` cm ertussen (of de vrije ruimte opzij als die groter is), niet voor een deur of raam, op hun
 * gangbare hoogte. Wat niet past, komt in `nietGeplaatst` met een melding; de vrije ruimte vooraan kijkt
 * `controleerPlan` na. Een voorstel om te verschuiven, geen berekening van wat de installatie vraagt.
 */
export function technischeOpstelling(plan: Plattegrond, ruimteId: string, cat: TechniekCatalogus, types: string[], opties: { tussen?: number; id?: (i: number, type: string) => string } = {}): TechnischeOpstelling {
  const r = plan.ruimtes.find((x) => x.id === ruimteId);
  if (!r) return { toestellen: [], nietGeplaatst: types, meldingen: ['De ruimte bestaat niet.'], wandlengte: 0, beschikbaar: 0 };
  const niveau = niveauVan(r), p = niveauPlan(plan, niveau), muren = murenVan(p);
  const tussen = opties.tussen ?? 10;
  const v = binnenVorm(vormVanDeel(delenVan(r)[0]!), muren);
  const n = v.length;
  // Per zijde: begin, richting, lengte, de normaal naar binnen en wat er vrij moet blijven (deuren, ramen).
  const zijden = v.map((q, i) => {
    const e = v[(i + 1) % n]!, L = Math.hypot(e[0] - q[0], e[1] - q[1]);
    const d: Punt = [(e[0] - q[0]) / L, (e[1] - q[1]) / L];
    const binnen: Punt = [-d[1], d[0]];
    const bezet: [number, number][] = [];
    for (const o of openingenVanRuimte(p, r, muren)) {
      const m = muurVanOpening(o, muren);
      if (!m) continue;
      const { d: md } = asVan(m);
      if (Math.abs(md[0] * d[1] - md[1] * d[0]) > 1e-3) continue;
      // Ligt de muur van de opening langs deze zijde (op een halve muurdikte van de rand)?
      const mid = langsAs(m, o.midden, m.lijn), af = Math.abs((mid[0] - q[0]) * binnen[0] + (mid[1] - q[1]) * binnen[1]);
      if (af > m.dikte / 2 + 2) continue;
      const s = (mid[0] - q[0]) * d[0] + (mid[1] - q[1]) * d[1];
      bezet.push([s - o.breedte / 2 - 15, s + o.breedte / 2 + 15]);
    }
    return { q, d, L, binnen, bezet: bezet.sort((x, y) => x[0] - y[0]) };
  });
  const eerste = zijden.reduce((x, y, i) => (y.L > zijden[x]!.L ? i : x), 0);
  const toestellen: Toestel[] = [], nietGeplaatst: string[] = [];
  let wandlengte = 0;
  const beschikbaar = zijden.reduce((t, z) => t + z.L - z.bezet.reduce((u, [a, b]) => u + Math.max(0, Math.min(z.L, b) - Math.max(0, a)), 0), 0);
  // Wat al staat: de voetafdrukken (met de ruimte opzij) en de vrije ruimte vooraan die elk toestel vraagt. Een nieuw
  // toestel mag niet in een voetafdruk of in de vrije ruimte van een ander, en zijn eigen vrije ruimte niet op een ander
  // toestel (twee vrije ruimtes mogen wel samenvallen: een gang voor beide). Zo staat er ook in een hoek niets op elkaar.
  const voeten: Punt[][] = [], vrij: Punt[][] = [];
  const kader = (u: Punt[]): [number, number, number, number] => [Math.min(...u.map((q) => q[0])), Math.max(...u.map((q) => q[0])), Math.min(...u.map((q) => q[1])), Math.max(...u.map((q) => q[1]))];
  const raakt = (v: Punt[], w: Punt[]) => {
    const [a0, a1, b0, b1] = kader(v), [c0, c1, d0, d1] = kader(w);
    return Math.min(a1, c1) - Math.max(a0, c0) > 1 && Math.min(b1, d1) - Math.max(b0, d0) > 1;
  };
  let zijde = 0, c = 0;
  for (const [i, code] of types.entries()) {
    const type = cat.toestellen[code];
    if (!type) { nietGeplaatst.push(code); continue; }
    const aan = type.bevestiging === 'buiten' ? 'vloer' : type.bevestiging;
    const m3 = toestelMaten(type, aan);
    const opzij = Math.max(tussen, type.vrij?.opzij ?? 0);
    let geplaatst = false;
    // Langs de wanden met de klok mee, per 5 cm, tot het toestel vrij van deuren, ramen en de andere toestellen staat. Past
    // het nergens meer, dan gaat het volgende toestel verder waar dit begon te zoeken (een kleiner toestel past misschien).
    for (let k = zijde; k < n && !geplaatst; k++) {
      const z = zijden[(eerste + k) % n]!;
      for (let s = k === zijde ? c : 0; s + m3.b <= z.L + 0.01 && !geplaatst; s += 5) {
        if (z.bezet.some(([a, b]) => s + m3.b > a && s < b)) continue;
        const midden = s + m3.b / 2, diep = m3.d / 2;
        const x = z.q[0] + z.d[0] * midden + z.binnen[0] * diep, y = z.q[1] + z.d[1] * midden + z.binnen[1] * diep;
        const t: Toestel = {
          ...nieuwToestel(cat, code, opties.id?.(i, code) ?? `${ruimteId}_${code}`, r1(x), r1(y), plan.muurhoogte, { aan, niveau }),
          draai: draaiNaar(z.binnen), hoogte: standaardToestelHoogte(type, plan.muurhoogte, aan),
        };
        const voet = toestelVoetafdruk(t, type, { opzij: opzij / 2 }), voor = toestelVoetafdruk(t, type, { voor: type.vrij?.voor ?? 0 });
        if (voeten.some((w) => raakt(voet, w) || raakt(voor, w)) || vrij.some((w) => raakt(voet, w))) continue;
        toestellen.push(t);
        voeten.push(voet);
        vrij.push(voor);
        wandlengte += m3.b + opzij;
        c = s + m3.b + opzij;
        zijde = k;
        geplaatst = true;
      }
      if (geplaatst) break;
    }
    if (!geplaatst) nietGeplaatst.push(code);
  }
  const meldingen = nietGeplaatst.length
    ? [`Past niet langs de wanden van ${r.naam}: ${nietGeplaatst.map((x) => cat.toestellen[x]?.label.toLowerCase() ?? x).join(', ')}. De toestellen vragen samen ± ${Math.round(wandlengte + nietGeplaatst.reduce((t, x) => t + (cat.toestellen[x]?.b ?? 0) + tussen, 0))} cm wand; er is ± ${Math.round(beschikbaar)} cm vrij.`]
    : [];
  return { toestellen, nietGeplaatst, meldingen, wandlengte: Math.round(wandlengte), beschikbaar: Math.round(beschikbaar) };
}

// ---------- lus van een vloerverwarming ----------

/**
 * De lus van een vloerverwarming in een ruimte als zigzag (meander): banen evenwijdig met de langste kant, `tussen` cm
 * uit elkaar (richtwaarde 10 tot 15 cm, te bevestigen), `rand` cm van de muren. Alleen het hoofddeel van de ruimte (bij
 * een L of U: het grootste deel). Met `strook` [van, tot] (delen van 0 tot 1, dwars op de banen) alleen een strook van de
 * ruimte: zo leg je een grote ruimte in meer lussen. Geeft de punten van de lus in de ruimte; aan- en afvoer naar de
 * verdeler trek je met `leidingLangsWanden`. Een voorstelling: het legplan maakt de installateur of de fabrikant.
 */
export function vloerverwarmingLus(plan: Plattegrond, ruimteId: string, opties: { tussen?: number; rand?: number; strook?: [number, number] } = {}): Punt[] {
  const r = plan.ruimtes.find((x) => x.id === ruimteId);
  if (!r) return [];
  const muren = murenVan(niveauPlan(plan, niveauVan(r)));
  const tussen = Math.max(5, opties.tussen ?? 15), rand = opties.rand ?? 15;
  const v = verschuifZijden(binnenVorm(vormVanDeel(delenVan(r)[0]!), muren), -rand);
  const xs = v.map((q) => q[0]), ys = v.map((q) => q[1]);
  const [kx0, kx1, ky0, ky1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const liggend = kx1 - kx0 >= ky1 - ky0;
  // Snijpunten van een lijn (y = c bij liggende banen, x = c bij staande) met de rand van de (bolle) veelhoek.
  const snij = (c: number): [number, number] | undefined => {
    const i = liggend ? 1 : 0, j = 1 - i, uit: number[] = [];
    v.forEach((q, k) => {
      const z = v[(k + 1) % v.length]!;
      if ((q[i]! - c) * (z[i]! - c) > 0 || q[i] === z[i]) return;
      uit.push(q[j]! + ((c - q[i]!) / (z[i]! - q[i]!)) * (z[j]! - q[j]!));
    });
    return uit.length >= 2 ? [Math.min(...uit), Math.max(...uit)] : undefined;
  };
  const [k0, k1] = liggend ? [ky0, ky1] : [kx0, kx1];
  const [f0, f1] = opties.strook ?? [0, 1];
  // Een strook: een halve tussenafstand van de naburige strook, zodat twee lussen niet op elkaar liggen.
  const c0 = k0 + f0 * (k1 - k0) + (f0 > 0 ? tussen / 2 : 0), c1 = k0 + f1 * (k1 - k0) - (f1 < 1 ? tussen / 2 : 0);
  const banen = Math.max(1, Math.floor((c1 - c0) / tussen) + 1);
  const punten: Punt[] = [];
  for (let k = 0; k < banen; k++) {
    const c = c0 + k * tussen;
    const s = snij(Math.min(c, c1 - 0.01));
    if (!s) continue;
    const [a, b] = k % 2 ? [s[1], s[0]] : [s[0], s[1]];
    punten.push(liggend ? [fijn(r1(a)), fijn(r1(c))] : [fijn(r1(c)), fijn(r1(a))], liggend ? [fijn(r1(b)), fijn(r1(c))] : [fijn(r1(c)), fijn(r1(b))]);
  }
  return punten;
}

// ---------- voor het scherm (ronde 10b): een toestel op zijn vlak, leidingen die meegaan ----------

/**
 * Het vlak waartegen een toestel hangt of staat, van hoek tot hoek: binnen het binnenvlak van de ruimte (de zijde van haar
 * binnenvorm), buiten de buitenkant van de gevel (van buitenhoek tot buitenhoek). Voor de maatvraag van het scherm: de
 * afstand van een hoek tot het midden van het toestel.
 */
export interface ToestelVlak {
  /** De twee hoeken op het vlak (cm): binnen `van` links of boven; buiten links zoals je de gevel van buiten ziet. */
  van: Punt;
  tot: Punt;
  /** Lengte van het vlak en de plaats van het midden van het toestel erlangs, vanaf `van` (cm). */
  lengte: number;
  s: number;
  /** Eenheid van `van` naar `tot`, en de richting van het vlak naar het toestel. */
  u: Punt;
  n: Punt;
  /** Van het vlak tot het midden van het toestel (cm): de halve diepte, buiten of op de vloer plus de vrije ruimte achter. */
  diep: number;
  /** Namen van de hoeken (`van`, `tot`) in gewone taal. */
  namen: [string, string];
  buiten: boolean;
}

/**
 * Het vlak waartegen een toestel staat (zie `ToestelVlak`), of niets als het niet tegen een wand staat (een toestel aan het
 * plafond, of een toestel dat losstaat). De achterkant van het toestel moet tot 2 cm op het vlak liggen.
 */
export function toestelVlak(plan: Plattegrond, t: Toestel, type: ToestelType): ToestelVlak | undefined {
  if (t.aan === 'plafond' || t.aan === 'dak') return undefined;
  const n = niveauVan(t), p = niveauPlan(plan, n), muren = murenVan(p);
  const m3 = toestelMaten(type, t.aan);
  const diep = m3.d / 2 + (t.aan === 'wand' ? 0 : type.vrij?.achter ?? 0);
  const v = voorRichting(t.draai);
  const achter: Punt = [t.x - v[0] * diep, t.y - v[1] * diep];
  const gericht = (van: Punt, tot: Punt, normaal: Punt, s: number, buiten: boolean): ToestelVlak => {
    const L = Math.hypot(tot[0] - van[0], tot[1] - van[1]);
    const u: Punt = [(tot[0] - van[0]) / L, (tot[1] - van[1]) / L];
    // Binnen: van links naar rechts (liggend) of van boven naar onder (staand of schuin). Buiten: zoals van buiten gezien.
    const liggend = Math.abs(u[0]) >= Math.abs(u[1]);
    const om = !buiten && (liggend ? u[0] < 0 : u[1] < 0);
    const uit = om ? { van: tot, tot: van, u: [-u[0], -u[1]] as Punt, s: L - s } : { van, tot, u, s };
    const namen: [string, string] = buiten ? ['links', 'rechts'] : liggend ? ['links', 'rechts'] : ['boven', 'onder'];
    return { ...uit, van: [r1(uit.van[0]), r1(uit.van[1])], tot: [r1(uit.tot[0]), r1(uit.tot[1])], lengte: r1(L), s: r1(uit.s), n: normaal, diep, namen, buiten };
  };
  const r = ruimteOp(p, t.x, t.y);
  if (r) {
    for (const deel of delenVan(r)) {
      const vorm = binnenVorm(vormVanDeel(deel), muren);
      for (let i = 0; i < vorm.length; i++) {
        const a = vorm[i]!, b = vorm[(i + 1) % vorm.length]!, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 1) continue;
        const u: Punt = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], binnen: Punt = [-u[1], u[0]];
        if (binnen[0] * v[0] + binnen[1] * v[1] < 0.99) continue;
        const af = (achter[0] - a[0]) * binnen[0] + (achter[1] - a[1]) * binnen[1];
        const s = (achter[0] - a[0]) * u[0] + (achter[1] - a[1]) * u[1];
        if (Math.abs(af) > 2 || s < -1 || s > L + 1) continue;
        return gericht(a, b, binnen, s, false);
      }
    }
    return undefined;
  }
  for (const g of gevelLijnen(plan, n)) {
    if (g.o[0] * v[0] + g.o[1] * v[1] < 0.99) continue;
    const vlak: Punt = [g.p[0] + g.o[0] * (g.dikte / 2), g.p[1] + g.o[1] * (g.dikte / 2)];
    const af = (achter[0] - vlak[0]) * g.o[0] + (achter[1] - vlak[1]) * g.o[1];
    const su = (achter[0] - vlak[0]) * g.u[0] + (achter[1] - vlak[1]) * g.u[1];
    if (Math.abs(af) > 2 || su < g.hoekLinks - 1 || su > g.hoekRechts + 1) continue;
    const hoek = (x: number): Punt => [vlak[0] + g.u[0] * x, vlak[1] + g.u[1] * x];
    return gericht(hoek(g.hoekLinks), hoek(g.hoekRechts), g.o, su - g.hoekLinks, true);
  }
  return undefined;
}

/** Het toestel op `s` cm van de hoek `van` langs zijn vlak (de draaiing blijft). */
export function opToestelVlak(t: Toestel, vlak: ToestelVlak, s: number): Toestel {
  return { ...t, x: r1(vlak.van[0] + vlak.u[0] * s + vlak.n[0] * vlak.diep), y: r1(vlak.van[1] + vlak.u[1] * s + vlak.n[1] * vlak.diep) };
}

const zelfdePlaats = (p: Punt, q: Punt) => Math.abs(p[0] - q[0]) < 0.05 && Math.abs(p[1] - q[1]) < 0.05;

const lengteVan = (pts: Punt[]) => pts.reduce((t, p, i) => (i ? t + Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1]) : t), 0);

/**
 * Punten weg die op een rechte lijn liggen met hun buren (ook als de leiding daar op haar stappen terugkeert), behalve de
 * uiteinden en een stuk op of neer (twee punten op dezelfde plaats, of een andere hoogte).
 */
function rechtTrekken(punten: Punt[], hoogtes?: number[]): { punten: Punt[]; hoogtes?: number[] } {
  const p = [...punten], h = hoogtes ? [...hoogtes] : undefined;
  for (let i = 1; i < p.length - 1;) {
    const a = p[i - 1]!, b = p[i]!, c = p[i + 1]!;
    const kruis = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    const zelfde = !h || (h[i - 1] === h[i] && h[i] === h[i + 1]);
    if (zelfde && Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.5 && Math.hypot(c[0] - b[0], c[1] - b[1]) > 0.5 && Math.abs(kruis) < 0.5) {
      p.splice(i, 1);
      h?.splice(i, 1);
    } else i++;
  }
  return h ? { punten: p, hoogtes: h } : { punten: p };
}

/**
 * Verschuift punten van een leiding (die in een versleepte ruimte, of het uiteinde bij een versleept toestel): `naar` geeft
 * de nieuwe plaats van een punt dat meegaat, of niets. Een stuk dat liggend of staand was en waarvan nu maar één einde
 * meeging, krijgt een knik, zodat de leiding haaks blijft: van de twee mogelijke knikken die met de kortste weg. Punten die
 * daarna op een rechte lijn liggen (of waar de leiding op haar stappen zou terugkeren), vallen weg. De hoogtes per punt
 * (`hoogtes`) gaan mee. Geeft een kopie (of dezelfde leiding als er niets meegaat).
 */
export function verschuifLeidingPunten(l: Leiding, naar: (p: Punt, i: number) => Punt | undefined): Leiding {
  const oud = l.punten, nieuw = oud.map((p, i) => naar(p, i)), h = l.hoogtes;
  if (!nieuw.some(Boolean)) return l;
  const nu = oud.map((p, i) => nieuw[i] ?? p);
  const punten: Punt[] = [], hoogtes: number[] = [];
  const zet = (p: Punt, hoogte: number | undefined) => {
    const q = punten[punten.length - 1];
    // Twee punten op dezelfde plaats en hoogte worden één (een stuk op of neer, met een andere hoogte, blijft).
    if (q && zelfdePlaats(p, q) && (!h || hoogtes[hoogtes.length - 1] === hoogte)) return;
    punten.push([r1(p[0]), r1(p[1])]);
    if (h) hoogtes.push(hoogte!);
  };
  oud.forEach((p, i) => {
    const a = nu[i]!;
    if (i > 0) {
      const v = oud[i - 1]!, va = nu[i - 1]!;
      const liggend = Math.abs(p[1] - v[1]) < 0.01 && Math.abs(p[0] - v[0]) > 0.01, staand = Math.abs(p[0] - v[0]) < 0.01 && Math.abs(p[1] - v[1]) > 0.01;
      // Eén einde ging mee en het stuk staat nu schuin: een knik, de kortste van de twee (met de buren erbij gerekend).
      if (!!nieuw[i - 1] !== !!nieuw[i] && (liggend || staand) && Math.abs(a[0] - va[0]) > 0.01 && Math.abs(a[1] - va[1]) > 0.01) {
        const k1: Punt = [va[0], a[1]], k2: Punt = [a[0], va[1]];
        const venster = (k: Punt) => lengteVan(rechtTrekken([...(nu[i - 2] ? [nu[i - 2]!] : []), va, k, a, ...(nu[i + 1] ? [nu[i + 1]!] : [])]).punten);
        zet(venster(k1) <= venster(k2) ? k1 : k2, h?.[nieuw[i] ? i : i - 1]);
      }
    }
    zet(a, h?.[i]);
  });
  const recht = rechtTrekken(punten, h ? hoogtes : undefined);
  const uit: Leiding = { ...l, punten: recht.punten };
  if (h) uit.hoogtes = recht.hoogtes;
  return uit;
}

/**
 * De punten van een leiding die op dezelfde plaats liggen als punt i en ernaast (een stuk op of neer naar een andere
 * hoogte): die versleep je samen. Geeft de nummers van de punten.
 */
export function puntGroep(l: Leiding, i: number): number[] {
  const p = l.punten[i];
  if (!p) return [];
  let a = i, b = i;
  while (a > 0 && zelfdePlaats(l.punten[a - 1]!, p)) a--;
  while (b < l.punten.length - 1 && zelfdePlaats(l.punten[b + 1]!, p)) b++;
  return Array.from({ length: b - a + 1 }, (_, k) => a + k);
}
