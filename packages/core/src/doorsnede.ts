/**
 * De doorsnede van de woning als tekening (SVG, ronde 6): een verticale snede door de hele woning, uit dezelfde
 * constructie als de 3D en de meetstaat (`woningConstructie`). Je ziet de lagen van de doorgesneden wanden, vloeren en
 * het dak in de kleur van hun materiaal, het hout dat de snede raakt, en de hoogtes als maten. Op de tekening staan
 * alleen vier namen (buitenmuur, vloer, dak …); welke lagen erin zitten, staat in het overzicht.
 *
 * Twee richtingen: *langs* (evenwijdig met de voor- en achtergevel, op een plaats y van het plan, gezien van voor: x
 * loopt naar rechts) en *dwars* (evenwijdig met de zijgevels, op een plaats x, gezien van links: y loopt naar rechts).
 *
 * Eenvoudig gehouden (eerste versie): geen ramen of deuren in de snede (wel hun opening), geen trap, geen meubels, de
 * latten als één lichte laag, en de topgevel onder een hellend dak als een benadering met de lagen van de muur eronder.
 * Een vloer of dak van een vrije vorm (een effen plaat in de 3D) staat er niet in. **Een voorstelling, geen berekening.**
 */
import { asVan, delenVan, niveauPlan, verdiepingenVan, vloerHoogte, type PlanCatalogus, type Plattegrond, type Rechthoek } from './plattegrond.js';
import { dakHoogte } from './dak.js';
import { woningConstructie, CONSTRUCTIE_VOORBEHOUD, type ConstructieDeel, type WoningConstructie } from './constructie.js';
import type { BouwdeelLaag } from './bouwdelen.js';

export type SnedeRichting = 'langs' | 'dwars';

export interface DoorsnedeKeuze {
  richting: SnedeRichting;
  /** Plaats van de snede op het plan (cm): y bij *langs*, x bij *dwars*. */
  plaats: number;
}

/** Waar een snede kan liggen (cm op het plan): van de ene buitenmuur tot de andere, met een plaats in het midden. */
export function snedeBereik(plan: Plattegrond, richting: SnedeRichting): { min: number; max: number; midden: number } {
  const delen = plan.ruimtes.flatMap(delenVan);
  if (!delen.length) return { min: 0, max: 0, midden: 0 };
  const a = richting === 'langs' ? delen.map((q) => [q.y, q.y + q.d]) : delen.map((q) => [q.x, q.x + q.b]);
  const min = Math.min(...a.map((x) => x[0]!)), max = Math.max(...a.map((x) => x[1]!));
  // Niet net op een muur: het midden van de grootste ruimte van het gelijkvloers in die richting.
  const groot = [...niveauPlan(plan, 0).ruimtes.flatMap(delenVan)].sort((p, q) => q.b * q.d - p.b * p.d)[0];
  const midden = groot ? (richting === 'langs' ? groot.y + groot.d / 2 : groot.x + groot.b / 2) : (min + max) / 2;
  return { min, max, midden: Math.round(midden) };
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const fmt = (x: number) => String(r1(x)).replace('.', ',');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const meter = (cm: number) => `${(cm / 100).toFixed(2).replace('.', ',')} m`;

/** Eén vlak in de tekening: u (horizontaal, cm op het plan), h (hoogte, cm). */
interface Vorm { punten: [number, number][]; kleur: string; rand?: string; soort: 'laag' | 'hout' | 'lucht'; naam?: string }

/** De kleur van een laag in de doorsnede (een folie donker, latten licht hout, een spouw wit). */
function laagKleur(l: BouwdeelLaag, metHout: boolean): { kleur: string; soort: Vorm['soort'] } {
  if (l.rol === 'spouw') return { kleur: '#ffffff', soort: 'lucht' };
  if (l.rol === 'latten') return { kleur: '#efe2c6', soort: 'lucht' };
  if (l.rol === 'skelet') return metHout ? { kleur: l.kleur, soort: 'hout' } : { kleur: l.vulling?.kleur ?? '#ffffff', soort: l.vulling ? 'laag' : 'lucht' };
  return { kleur: l.kleur, soort: 'laag' };
}

/**
 * De doorsnede als SVG-tekst. `breedtePx` = de breedte waarop ze getekend wordt (de tekst en de lijnen houden dan een
 * leesbare maat). `c` = een constructie die al berekend is.
 */
export function tekenDoorsnede(plan: Plattegrond, cat: PlanCatalogus, keuze: DoorsnedeKeuze, opties: { c?: WoningConstructie; breedtePx?: number } = {}): string {
  const c = opties.c ?? woningConstructie(plan, cat);
  const { richting, plaats } = keuze;
  const vormen: Vorm[] = [];
  const namen = new Map<string, [number, number]>();
  const noemOp = (naam: string, u: number, h: number, voorrang = false) => { if (voorrang || !namen.has(naam)) namen.set(naam, [u, h]); };
  const rechthoek = (u0: number, u1: number, h0: number, h1: number, kleur: string, soort: Vorm['soort'] = 'laag'): Vorm =>
    ({ punten: [[u0, h0], [u1, h0], [u1, h1], [u0, h1]], kleur, soort });
  /** De gaten (van–tot in de hoogte) die een reeks hoogtes onderbreken. */
  const zonder = (h0: number, h1: number, gaten: [number, number][]): [number, number][] => {
    let st: [number, number][] = [[h0, h1]];
    for (const [a, b] of gaten) st = st.flatMap(([p, q]) => [[p, Math.min(q, a)], [Math.max(p, b), q]] as [number, number][]).filter(([p, q]) => q - p > 0.05);
    return st;
  };

  // ---------- wanden ----------
  const wandSnede = (d: ConstructieDeel) => {
    const w = d.muur!, m = w.muur, T = m.dikte;
    const lagen = d.deel.lagen;
    let pos: number, uVan: (wOff: number) => number;
    if (m.as === 's') {
      const { d: dd, n } = asVan(m);
      if (richting === 'langs') {
        pos = (plaats - m.lijn * n[1]) / dd[1];
        uVan = (wo) => wo * n[0] + (plaats - wo * n[1]) * dd[0] / dd[1];
      } else {
        if (Math.abs(dd[0]) < 1e-6) return;
        pos = (plaats - m.lijn * n[0]) / dd[0];
        uVan = (wo) => wo * n[1] + (plaats - wo * n[0]) * dd[1] / dd[0];
      }
    } else {
      // Langs (y = plaats) snijdt de staande muren, dwars (x = plaats) de liggende.
      if ((richting === 'langs') !== (m.as === 'v')) return;
      pos = plaats;
      uVan = (wo) => wo;
    }
    if (pos < w.begin + 0.5 || pos > w.einde - 0.5) return;
    // De binnenkant: tegenover de buitenkant (bij een binnenmuur de plus-kant, zoals de wand gebouwd is).
    const binnen = w.buitenMin ? m.lijn + T / 2 : m.lijn - T / 2, naarBuiten = w.buitenMin ? -1 : 1;
    const lokaalX = (w.buitenMin ? m.as === 'h' : m.as !== 'h') ? pos - w.begin : w.einde - pos;
    const gaten = (d.deel.vlak?.openingen ?? []).filter((o) => lokaalX > o.u0 && lokaalX < o.u1).map((o): [number, number] => [d.zet.y + o.v0, d.zet.y + o.v1]);
    const h0 = d.zet.y, h1 = d.zet.y + w.hoogte;
    // Het hout dat de snede raakt (stijlen over de hele hoogte, regels en lateien over hun hoogte).
    const hout = d.deel.stukken.filter((s) => lokaalX >= s.blok.x - 0.01 && lokaalX <= s.blok.x + s.blok.b + 0.01).map((s): [number, number] => [d.zet.y + s.blok.y, d.zet.y + s.blok.y + s.blok.h]);
    for (const l of lagen) {
      const [a, b] = l.getekend;
      const ua = uVan(binnen + naarBuiten * a), ub = uVan(binnen + naarBuiten * b);
      const [u0, u1] = [Math.min(ua, ub), Math.max(ua, ub)];
      const k = laagKleur(l, false);
      for (const [p, q] of zonder(h0, h1, gaten)) vormen.push({ ...rechthoek(u0, u1, p, q, k.kleur, k.soort), naam: l.naam });
      if (l.rol === 'skelet') for (const [p, q] of hout) vormen.push(rechthoek(u0, u1, p, q, l.kleur, 'hout'));
    }
    const ua = uVan(m.lijn - T / 2), ub = uVan(m.lijn + T / 2), uMin = Math.min(ua, ub), uMax = Math.max(ua, ub);
    noemOp(d.plaats === 'buitenwand' ? 'Buitenmuur' : 'Binnenmuur', uMin + (uMax - uMin) / 2, h0 + w.hoogte * 0.55);
    // De topgevel onder een hellend dak (een benadering): de muur loopt door tot onder het dak.
    if (c.hellend && d.plaats === 'buitenwand' && d.niveau === c.top && m.as !== 's') {
      const dak = c.hellend.dak;
      const dwarsOpNok = (m.as === 'h') !== (dak.nokAs === 'x');
      if (dwarsOpNok) {
        const p = richting === 'langs' ? (dak.nokAs === 'x' ? plaats : (uMin + uMax) / 2) : (dak.nokAs === 'x' ? (uMin + uMax) / 2 : plaats);
        const top = h1 + Math.max(0, dakHoogte(dak, p));
        if (top > h1 + 1) for (const l of lagen) {
          const [a, b] = l.getekend;
          const ua = uVan(binnen + naarBuiten * a), ub = uVan(binnen + naarBuiten * b);
          const k = laagKleur(l, false);
          vormen.push(rechthoek(Math.min(ua, ub), Math.max(ua, ub), h1, top, k.kleur, k.soort));
        }
      }
    }
  };

  // ---------- vloeren en platte daken ----------
  const vlakSnede = (d: ConstructieDeel) => {
    const f = d.vlak!;
    const binnenIn = richting === 'langs' ? plaats > f.y + 0.5 && plaats < f.y + f.d - 0.5 : plaats > f.x + 0.5 && plaats < f.x + f.b - 0.5;
    if (!binnenIn) return;
    const lokaal = richting === 'langs' ? plaats - f.y : plaats - f.x;
    const [u0, u1] = richting === 'langs' ? [f.x, f.x + f.b] : [f.y, f.y + f.d];
    const begin = richting === 'langs' ? f.x : f.y;
    // Gaten (trapgat, koepel) die de snede raakt.
    const gaten = (d.deel.vlak?.openingen ?? [])
      .filter((o) => (richting === 'langs' ? lokaal > o.v0 && lokaal < o.v1 : lokaal > o.u0 && lokaal < o.u1))
      .map((o): [number, number] => (richting === 'langs' ? [begin + o.u0, begin + o.u1] : [begin + o.v0, begin + o.v1]));
    const delen = zonder(u0, u1, gaten);
    for (const l of d.deel.lagen) {
      const [a, b] = l.getekend;
      const k = laagKleur(l, false);
      for (const [p, q] of delen) vormen.push({ ...rechthoek(p, q, d.zet.y + a, d.zet.y + b, k.kleur, k.soort), naam: l.naam });
    }
    // Het hout dat de snede raakt: balken dwars op de snede als kleine vakjes, een balk langs de snede als band.
    for (const s of d.deel.stukken) {
      const bl = s.blok;
      const raakt = richting === 'langs' ? lokaal >= bl.z - 0.01 && lokaal <= bl.z + bl.d + 0.01 : lokaal >= bl.x - 0.01 && lokaal <= bl.x + bl.b + 0.01;
      if (!raakt) continue;
      const [p, q] = richting === 'langs' ? [begin + bl.x, begin + bl.x + bl.b] : [begin + bl.z, begin + bl.z + bl.d];
      vormen.push(rechthoek(p, q, d.zet.y + bl.y, d.zet.y + bl.y + bl.h, s.blok.kleur, 'hout'));
    }
    const naam = d.plaats === 'grondvloer' ? 'Vloer op de grond' : d.plaats === 'verdiepingsvloer' ? 'Vloer' : 'Dak';
    noemOp(naam, u0 + (u1 - u0) * 0.62, d.zet.y + d.deel.maten.h / 2);
  };

  // ---------- hellend dak ----------
  let hellendGeraakt = false;
  const dakSnede = (d: ConstructieDeel) => {
    const dv = d.dakvlak!, dak = dv.dak, v = d.deel.vlak!;
    const tan = Math.tan((dak.helling * Math.PI) / 180), cos = Math.cos((dak.helling * Math.PI) / 180);
    const ov = dak.oversteek, yb = c.hellend!.y;
    const dwarsOpNok = (richting === 'langs') === (dak.nokAs === 'z');
    // t = horizontale afstand vanaf de buitenkant van de muur aan de dakvoet, de helling op.
    const Y = (t: number) => yb + t * tan;
    const pVan = (t: number) => dv.voet + dv.naar * t;
    const t0 = -ov, t1 = v.breedte - ov;
    // De plaats langs de nok in de eigen assen van het dakvlak (x = 0 aan het begin van de dakvoet).
    const q0 = dak.q0 - ov, q1 = dak.q1 + ov;
    const vooruit = dak.nokAs === 'x' ? d.zet.draai === 0 : d.zet.draai === 90;
    const skelet = d.deel.lagen[d.deel.dragend];
    if (dwarsOpNok) {
      if (plaats < q0 || plaats > q1) return;
      const lx = vooruit ? plaats - q0 : q1 - plaats;
      const opKeper = d.deel.stukken.some((s) => lx >= s.blok.x - 0.01 && lx <= s.blok.x + s.blok.b + 0.01);
      for (const l of d.deel.lagen) {
        const [a, b] = l.getekend;
        const k = laagKleur(l, l === skelet && opKeper);
        const [pa, pb] = [pVan(t0), pVan(t1)];
        vormen.push({ punten: [[pa, Y(t0) + a / cos], [pb, Y(t1) + a / cos], [pb, Y(t1) + b / cos], [pa, Y(t0) + b / cos]], kleur: k.kleur, soort: k.soort, naam: l.naam });
      }
      noemOp('Dak', pVan((t0 + t1) * 0.55), Y((t0 + t1) * 0.55) + d.deel.vlak!.dikte / cos, true);
      hellendGeraakt = true;
      return;
    }
    // Evenwijdig met de nok: één plaats op de helling.
    const p = plaats, t = (p - dv.voet) * dv.naar;
    if (t < t0 || t > t1) return;
    for (const l of d.deel.lagen) {
      const [a, b] = l.getekend;
      const k = laagKleur(l, false);
      vormen.push({ ...rechthoek(q0, q1, Y(t) + a / cos, Y(t) + b / cos, k.kleur, k.soort), naam: l.naam });
    }
    if (skelet) {
      for (const s of d.deel.stukken) {
        const [x0, x1] = vooruit ? [q0 + s.blok.x, q0 + s.blok.x + s.blok.b] : [q1 - s.blok.x - s.blok.b, q1 - s.blok.x];
        vormen.push(rechthoek(x0, x1, Y(t) + skelet.getekend[0] / cos, Y(t) + skelet.getekend[1] / cos, s.blok.kleur, 'hout'));
      }
    }
    noemOp('Dak', (q0 + q1) * 0.62, Y(t) + v.dikte / cos, true);
    hellendGeraakt = true;
  };

  for (const d of c.delen) {
    if (d.muur) wandSnede(d);
    else if (d.dakvlak) dakSnede(d);
    else if (d.vlak) vlakSnede(d);
  }

  // ---------- tekening ----------
  if (!vormen.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 120" role="img" aria-label="Doorsnede"><text x="300" y="64" text-anchor="middle" font-size="16" fill="#555">De snede raakt hier niets van de woning.</text></svg>`;
  }
  const us = vormen.flatMap((v) => v.punten.map((q) => q[0])), hs = vormen.flatMap((v) => v.punten.map((q) => q[1]));
  const uMin = Math.min(...us), uMax = Math.max(...us), hMin = Math.min(...hs, 0), hMax = Math.max(...hs);
  const breed = uMax - uMin;
  // Schaal van tekst en lijnen: de tekening wordt op ± breedtePx beeldpunten getekend, met links plaats voor de
  // hoogtematen (± 250 beeldpunten) en rechts voor de namen (± 170).
  const px = Math.max(0.15, ((opties.breedtePx ?? 900) - 420) / Math.max(100, breed));
  const tekst = 13 / px, lijn = 1 / px;
  // Boven plaats voor het kleine plan linksboven (± 85 beeldpunten), zodat het geen maat bedekt.
  const links = uMin - 250 / px, rechts = uMax + 170 / px, boven = hMax + 100 / px, onder = Math.min(hMin, 0) - 70 / px;
  const X = (u: number) => r1(u - links), Yv = (h: number) => r1(boven - h);
  const W = r1(rechts - links), H = r1(boven - onder);
  const uit: string[] = [];
  uit.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Doorsnede ${richting === 'langs' ? 'langs' : 'dwars'} op ${fmt(plaats)} cm" font-family="system-ui, sans-serif">`);
  uit.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);
  // Grond.
  uit.push(`<rect x="0" y="${Yv(0)}" width="${W}" height="${r1(H - Yv(0))}" fill="#e7dfcf"/>`);
  uit.push(`<line x1="0" y1="${Yv(0)}" x2="${W}" y2="${Yv(0)}" stroke="#6b6253" stroke-width="${r1(lijn * 1.5)}"/>`);
  // Eerst de lagen, dan het hout erboven.
  for (const soort of ['lucht', 'laag', 'hout'] as const) {
    for (const v of vormen.filter((x) => x.soort === soort)) {
      const d = v.punten.map(([u, h], i) => `${i ? 'L' : 'M'}${X(u)} ${Yv(h)}`).join(' ') + 'Z';
      uit.push(`<path d="${d}" fill="${v.kleur}" stroke="${soort === 'hout' ? '#6d5636' : '#7b7b78'}" stroke-width="${r1(lijn * (soort === 'hout' ? 0.6 : 0.35))}"${v.naam ? ` data-laag="${esc(v.naam)}"` : ''}/>`);
    }
  }
  // Maten: de hoogtes links (vloerpeil per verdieping, de bovenkant van de muren, de nok of de bovenkant van het dak).
  const hoogtes = new Map<number, string>();
  for (const [n, v] of verdiepingenVan(plan).entries()) if (niveauPlan(plan, n).ruimtes.length) hoogtes.set(r1(vloerHoogte(plan, n)), `vloer ${v.naam.toLowerCase()}`);
  // De muurkop en de nok alleen als de snede het hellende dak raakt; anders de bovenkant van wat ze raakt.
  const metHellend = hellendGeraakt;
  const muurTop = metHellend ? c.hellend!.y : undefined;
  if (muurTop !== undefined && muurTop < hMax - 1) hoogtes.set(r1(muurTop), 'muurkop');
  hoogtes.set(r1(hMax), metHellend ? (c.hellend!.dak.nokAs === 'x') === (richting === 'dwars') ? 'nok' : 'bovenkant dak' : 'bovenkant dak');
  const mx = X(uMin) - 40 / px;
  const lijst = [...hoogtes].sort((a, b) => a[0] - b[0]);
  uit.push(`<line x1="${r1(mx)}" y1="${Yv(lijst[0]![0])}" x2="${r1(mx)}" y2="${Yv(lijst[lijst.length - 1]![0])}" stroke="#34505f" stroke-width="${r1(lijn)}"/>`);
  let vorige = Infinity;
  for (const [h, naam] of lijst) {
    uit.push(`<line x1="${r1(mx - 12 / px)}" y1="${Yv(h)}" x2="${r1(mx + 12 / px)}" y2="${Yv(h)}" stroke="#34505f" stroke-width="${r1(lijn)}"/>`);
    // Twee maten die dicht bij elkaar liggen: de tweede iets hoger, zodat ze niet over elkaar staan.
    const y = Math.min(Yv(h) - 3 / px, vorige - tekst * 1.15);
    uit.push(`<text x="${r1(mx - 16 / px)}" y="${r1(y)}" text-anchor="end" font-size="${r1(tekst)}" fill="#34505f">${h >= 0 ? '+' : ''}${meter(h)} <tspan fill="#5f676d">${esc(naam)}</tspan></text>`);
    vorige = y;
  }
  // De breedte van de snede onderaan.
  const ym = Yv(0) + 34 / px;
  uit.push(`<line x1="${X(uMin)}" y1="${r1(ym)}" x2="${X(uMax)}" y2="${r1(ym)}" stroke="#34505f" stroke-width="${r1(lijn)}"/>`);
  for (const u of [uMin, uMax]) uit.push(`<line x1="${X(u)}" y1="${r1(ym - 10 / px)}" x2="${X(u)}" y2="${r1(ym + 10 / px)}" stroke="#34505f" stroke-width="${r1(lijn)}"/>`);
  uit.push(`<text x="${r1((X(uMin) + X(uMax)) / 2)}" y="${r1(ym - 6 / px)}" text-anchor="middle" font-size="${r1(tekst)}" fill="#34505f">${meter(breed)}</text>`);
  // De namen, met een streepje naar het bouwdeel (rechts naast de tekening).
  let ny = boven - hMax + tekst * 2;
  for (const [naam, [u, h]] of [...namen].sort((a, b) => b[1][1] - a[1][1])) {
    const tx = X(uMax) + 30 / px;
    uit.push(`<line x1="${X(u)}" y1="${Yv(h)}" x2="${r1(tx - 4 / px)}" y2="${r1(ny - tekst * 0.35)}" stroke="#23262a" stroke-width="${r1(lijn * 0.7)}"/>`);
    uit.push(`<circle cx="${X(u)}" cy="${Yv(h)}" r="${r1(2.5 / px)}" fill="#23262a"/>`);
    uit.push(`<text x="${r1(tx)}" y="${r1(ny)}" font-size="${r1(tekst * 1.15)}" font-weight="600" fill="#23262a">${esc(naam)}</text>`);
    ny += tekst * 2.6;
  }
  // Waar de snede ligt: een klein plan linksboven met de lijn.
  const delen = niveauPlan(plan, 0).ruimtes.flatMap(delenVan);
  if (delen.length) {
    const k: Rechthoek = { x: Math.min(...delen.map((q) => q.x)), y: Math.min(...delen.map((q) => q.y)), b: 0, d: 0 };
    k.b = Math.max(...delen.map((q) => q.x + q.b)) - k.x; k.d = Math.max(...delen.map((q) => q.y + q.d)) - k.y;
    const s = (70 / px) / Math.max(k.b, k.d), ox = 14 / px, oy = 14 / px;
    const P = (x: number, y: number) => `${r1(ox + (x - k.x) * s)} ${r1(oy + (y - k.y) * s)}`;
    uit.push(`<g aria-label="Waar de snede ligt">`);
    for (const q of delen) uit.push(`<rect x="${r1(ox + (q.x - k.x) * s)}" y="${r1(oy + (q.y - k.y) * s)}" width="${r1(q.b * s)}" height="${r1(q.d * s)}" fill="#f4f1ea" stroke="#23262a" stroke-width="${r1(lijn)}"/>`);
    const [a, b] = richting === 'langs' ? [P(k.x - 20, plaats), P(k.x + k.b + 20, plaats)] : [P(plaats, k.y - 20), P(plaats, k.y + k.d + 20)];
    uit.push(`<path d="M${a} L${b}" stroke="#c0392b" stroke-width="${r1(lijn * 2)}" stroke-dasharray="${r1(5 / px)} ${r1(3 / px)}"/></g>`);
  }
  uit.push(`<text x="${r1(W - 10 / px)}" y="${r1(H - 10 / px)}" text-anchor="end" font-size="${r1(tekst * 0.85)}" fill="#5f676d">${esc(CONSTRUCTIE_VOORBEHOUD.split(':')[0]!)}. ${richting === 'langs' ? 'Gezien van voor' : 'Gezien van links'}; de lagen staan in het overzicht.</text>`);
  uit.push('</svg>');
  return uit.join('');
}
