/**
 * Verlichting in één tik (ronde 15b, 17/11/2026). Jonas, na de testversie: *"het plaatsen van een ledstrip is te
 * complex"*. Een verkoper toont na het eerste gesprek een mooie 3D; verlichting moet daar met één of twee tikken kunnen,
 * in de 3D zelf, waar je ze ziet. Deze zuivere functies rekenen uit wat er bij zo'n tik in het plan komt:
 *   - `dakrand`: een ledstrip onder de dakrand, rondom de woning (`dakrandStroken`): op elke verdieping waar een stuk
 *     buitenmuur geen muur van de verdieping erboven heeft (het platte dak, ook van een lagere uitbouw), en onder een
 *     hellend dak alleen langs de dakvoet (een strip loopt vlak: onder een topgevel niet). Per kant van de woning (de
 *     sleutel `voorstelBij` = "onder", "links" …, zoals in `vlakSleutel`), zodat een tik op één gevel alleen die kant doet.
 *   - `deuren`: een buitenlamp naast elke deur naar buiten op het gelijkvloers (voordeur, terrasdeur, schuifraam,
 *     hef-schuifraam, garagepoort), aan de kant met plaats, nooit in een raam; bij een brede opening aan beide kanten.
 *   - `tuin`: tuinlampen (paaltjes) naast het terras van een schuifraam en langs het pad naar de voordeur, op het gras.
 *   - `plafond`: een ledstrip rondom langs het plafond van één ruimte (een tik op de ruimte in de 3D).
 * Wat zo geplaatst wordt, is gewone techniek (leidingen en toestellen: de telling, de posten, het bestand voor de klant en
 * de legende kennen het), gemerkt met `voorstel` en `voorstelBij` (techniek.ts): *uit* haalt precies die weer weg, wat de
 * verkoper zelf tekende blijft staan. Een strip langer dan de richtwaarde op één voeding (10 m) wordt in gelijke stukken
 * gedeeld (één voeding per stuk, geen melding over de lengte).
 *
 * Ook hier: `stripOverMuur` (de tegel *Ledstrip* in de techniek: één tik op een muur of gevel, de strip loopt over dat
 * hele stuk muur). Alles een benadering om een avondbeeld te tonen; geen lichtplan, geen keuze van armaturen.
 */
import {
  asVan, dakOpbouw, langsAs, murenVan, muurStatus, muurVanOpening, niveauPlan, niveauVan, opAs, planMetDak, plattegrond3D, ruimteOp,
  vlakSleutel, binnenVeelhoek,
  type Muur, type Opening, type PlanCatalogus, type Plattegrond, type Punt,
} from './plattegrond.js';
import type { Blok } from './ruimtelijk.js';
import { LEDSTRIP_AFSTAND } from './nacht.js';
import { draaiNaar, liggingHoogte, type Leiding, type TechniekCatalogus, type Toestel, type ToestelType, type VerlichtingVoorstel } from './techniek.js';

export type { VerlichtingVoorstel } from './techniek.js';

/** De voorstellen in woorden (de knoppen in de app en de meldingen). */
export const VERLICHTING_VOORSTELLEN: Record<VerlichtingVoorstel, { label: string; uitleg: string }> = {
  dakrand: { label: 'Ledstrip onder de dakrand', uitleg: 'Rondom de woning, onder de dakrand of de oversteek van het dak (ook van een lager plat dak).' },
  deuren: { label: 'Buitenlampen bij de deuren', uitleg: 'Een lamp aan de gevel naast elke deur naar buiten, schuifraam en garagepoort.' },
  tuin: { label: 'Tuinlampen bij terras en pad', uitleg: 'Lage paaltjes met licht naast het terras en langs het pad naar de voordeur.' },
  plafond: { label: 'Ledstrip rondom langs het plafond', uitleg: 'Een strip bovenaan langs alle muren van de ruimte.' },
};

/** Wat bij één ding hoort (een kant van de woning, een opening, een ruimte): de leidingen en toestellen, nog zonder id. */
export interface VoorstelGroep {
  bij: string;
  leidingen: Omit<Leiding, 'id'>[];
  toestellen: Omit<Toestel, 'id'>[];
}

export interface VerlichtingOpties {
  /** Een nieuwe id (zoals `nieuweId` in de app); zonder: een vaste id uit het voorstel en een volgnummer. */
  nieuweId?: (prefix: string) => string;
  /** Telt deze opening mee (de app: niet een bestaande deur met aantal 0)? Standaard alles. */
  telt?: (o: Opening) => boolean;
}

/** Hoe ver de buitenlamp van de rand van de opening hangt (cm, de zijkant van de lamp), en als het krap is. */
const LAMP_NAAST = [20, 12];
/** Vanaf deze breedte (cm) krijgt een opening een lamp aan beide kanten (een brede schuifpui, een garagepoort). */
const BREED = 250;
/** Tuinlampen: hoe ver naast het terras of het pad (cm), en de afstand tussen twee lampen langs een pad. */
const TUIN = { naast: 40, padNaast: 35, tussen: 170, vrij: 80 };

const r1 = (x: number) => Math.round(x * 10) / 10;
const punt1 = (p: Punt): Punt => [r1(p[0]), r1(p[1])];
const afstand = (p: Punt, q: Punt) => Math.hypot(p[0] - q[0], p[1] - q[1]);

function afstandTotStuk(p: Punt, a: Punt, b: Punt): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

// ---------- lussen langs de muren ----------

/** Een zijde van een lus: van a naar b op de as van de muren, de muren erop (één dikte). */
interface Zijde { a: Punt; b: Punt; muren: Muur[]; dikte: number }

/** Een zijde van de strook: het stuk evenwijdig aan de muur (van hoek tot hoek), met de zijde op de as waar ze bij hoort. */
export interface StrookZijde {
  /** Begin en einde van de strook (cm op het plan), `LEDSTRIP_AFSTAND` van het muurvlak. */
  a: Punt;
  b: Punt;
  /** De zijde op de as van de muren, en de muren erop. */
  as: [Punt, Punt];
  muren: Muur[];
  /** Hoe ver de strook van de as ligt (cm), aan het begin en het einde de verschuiving van de zijde ervoor en erna. */
  verschuiving: number;
  voor: number;
  na: number;
}

/** Ketent stukken muur tot gesloten lussen (op de as van de muren); stukken in dezelfde richting en dikte worden één zijde. */
function lussenVan(muren: Muur[]): Zijde[][] {
  const stukken = muren.map((m) => ({ m, a: langsAs(m, m.van, m.lijn), b: langsAs(m, m.tot, m.lijn) }));
  const vrij = new Set(stukken.map((_, i) => i));
  const uit: Zijde[][] = [];
  while (vrij.size) {
    const i0 = vrij.values().next().value as number;
    vrij.delete(i0);
    const s0 = stukken[i0]!;
    const lus: Zijde[] = [{ a: s0.a, b: s0.b, muren: [s0.m], dikte: s0.m.dikte }];
    let eind = s0.b, dicht = false;
    for (let stap = 0; stap <= stukken.length; stap++) {
      if (afstand(eind, lus[0]!.a) < 0.5) { dicht = true; break; }
      let j = -1, om = false;
      for (const k of vrij) {
        const s = stukken[k]!;
        if (afstand(s.a, eind) < 0.5) { j = k; break; }
        if (afstand(s.b, eind) < 0.5) { j = k; om = true; break; }
      }
      if (j < 0) break;
      vrij.delete(j);
      const s = stukken[j]!;
      const [a, b] = om ? [s.b, s.a] : [s.a, s.b];
      lus.push({ a, b, muren: [s.m], dikte: s.m.dikte });
      eind = b;
    }
    if (dicht && lus.length >= 3) uit.push(samenvoegen(lus));
  }
  return uit;
}

function samenvoegen(lus: Zijde[]): Zijde[] {
  const rechtdoor = (x: Zijde, y: Zijde) => {
    const d1: Punt = [x.b[0] - x.a[0], x.b[1] - x.a[1]], d2: Punt = [y.b[0] - y.a[0], y.b[1] - y.a[1]];
    const l1 = Math.hypot(...d1) || 1, l2 = Math.hypot(...d2) || 1;
    return Math.abs(d1[0] * d2[1] - d1[1] * d2[0]) / (l1 * l2) < 1e-6 && d1[0] * d2[0] + d1[1] * d2[1] > 0 && Math.abs(x.dikte - y.dikte) < 0.01;
  };
  const uit: Zijde[] = [];
  for (const z of lus) {
    const v = uit[uit.length - 1];
    if (v && rechtdoor(v, z)) { v.b = z.b; v.muren.push(...z.muren); } else uit.push({ ...z, muren: [...z.muren] });
  }
  while (uit.length > 1 && rechtdoor(uit[uit.length - 1]!, uit[0]!)) {
    const l = uit.pop()!;
    uit[0] = { a: l.a, b: uit[0]!.b, muren: [...l.muren, ...uit[0]!.muren], dikte: l.dikte };
  }
  return uit;
}

/**
 * De strook rondom, `LEDSTRIP_AFSTAND` van het muurvlak aan de kant `kant` van elke muur (een eenheidsvector op het plan):
 * per gesloten lus de zijden van hoek tot hoek. De hoeken zijn de snijpunten (zoals `verschuifZijden`), dus een strook om
 * een buitenhoek loopt tot op de hoek, een binnenhoek tot tegen de andere muur. Gaat een muur op dezelfde lijn verder in
 * een andere dikte (een buitenmuur die een binnenmuur wordt), dan maakt de strook daar een trapje, zoals het muurvlak.
 */
function stroken(muren: Muur[], kant: (m: Muur) => Punt): StrookZijde[][] {
  const uit: StrookZijde[][] = [];
  for (const ruw of lussenVan(muren)) {
    let s = 0;
    for (const z of ruw) s += z.a[0] * z.b[1] - z.b[0] * z.a[1];
    // Met de klok mee (zoals `metDeKlok`): de normaal naar buiten van zijde a → b is (dy, −dx).
    const lus = s >= 0 ? ruw : ruw.slice().reverse().map((z) => ({ ...z, a: z.b, b: z.a }));
    const n = lus.length;
    const lijnen = lus.map((z) => {
      const dx = z.b[0] - z.a[0], dy = z.b[1] - z.a[1], l = Math.hypot(dx, dy) || 1;
      const nb: Punt = [dy / l, -dx / l], k = kant(z.muren[0]!);
      const t = (nb[0] * k[0] + nb[1] * k[1] >= 0 ? 1 : -1) * (z.dikte / 2 + LEDSTRIP_AFSTAND);
      return { d: [dx / l, dy / l] as Punt, nb, t };
    });
    // Per hoekpunt van de lus: het snijpunt van de twee verschoven zijden, of (evenwijdig) twee punten: een trapje.
    const hoeken = lus.map((z, i): [Punt, Punt] => {
      const a = lijnen[(i + n - 1) % n]!, b = lijnen[i]!, P = z.a;
      const pa: Punt = [P[0] + a.nb[0] * a.t, P[1] + a.nb[1] * a.t], pb: Punt = [P[0] + b.nb[0] * b.t, P[1] + b.nb[1] * b.t];
      const det = a.d[0] * b.d[1] - a.d[1] * b.d[0];
      if (Math.abs(det) < 1e-9) return [pa, pb];
      const u = ((pb[0] - pa[0]) * b.d[1] - (pb[1] - pa[1]) * b.d[0]) / det;
      const x: Punt = [pa[0] + a.d[0] * u, pa[1] + a.d[1] * u];
      return [x, x];
    });
    uit.push(lus.map((z, i) => ({
      a: hoeken[i]![1], b: hoeken[(i + 1) % n]![0], as: [z.a, z.b], muren: z.muren,
      verschuiving: Math.abs(lijnen[i]!.t), voor: Math.abs(lijnen[(i + n - 1) % n]!.t), na: Math.abs(lijnen[(i + 1) % n]!.t),
    })));
  }
  return uit;
}

/** De kant zonder ruimte (buiten) van een buitenmuur, als eenheidsvector. */
function buitenKantVan(m: Muur): Punt {
  const { n } = asVan(m);
  return m.plus ? [-n[0], -n[1]] : n;
}

/** De strook buiten rond de woning op verdieping n (de buitenmuren), per lus van hoek tot hoek. */
export function buitenStroken(plan: Plattegrond, n: number): StrookZijde[][] {
  return stroken(murenVan(niveauPlan(plan, n)).filter((m) => m.soort === 'buiten'), buitenKantVan);
}

/** De strook binnen langs de muren van één ruimte (ook een samengestelde ruimte of een vrije vorm). */
export function ruimteStroken(plan: Plattegrond, ruimteId: string): StrookZijde[][] {
  const r = plan.ruimtes.find((x) => x.id === ruimteId);
  if (!r) return [];
  const muren = murenVan(niveauPlan(plan, niveauVan(r))).filter((m) => m.plus === r.id || m.min === r.id);
  return stroken(muren, (m) => { const { n } = asVan(m); return m.plus === r.id ? n : [-n[0], -n[1]]; });
}

/** Een stuk [t0, t1] (cm langs de zijde vanaf a) als punten. */
function stukVan(z: StrookZijde, t0: number, t1: number): Punt[] {
  const L = afstand(z.a, z.b) || 1, e: Punt = [(z.b[0] - z.a[0]) / L, (z.b[1] - z.a[1]) / L];
  return [punt1([z.a[0] + e[0] * t0, z.a[1] + e[1] * t0]), punt1([z.a[0] + e[0] * t1, z.a[1] + e[1] * t1])];
}

/** Waar s (langs de as van muur m) op de zijde valt: cm vanaf a. */
function opZijde(z: StrookZijde, m: Muur, s: number): number {
  const L = afstand(z.a, z.b) || 1, e: Punt = [(z.b[0] - z.a[0]) / L, (z.b[1] - z.a[1]) / L];
  const p = langsAs(m, s, m.lijn);
  return (p[0] - z.a[0]) * e[0] + (p[1] - z.a[1]) * e[1];
}

/**
 * Stukken [s0, s1] langs de muren van een zijde naar stukken op de zijde zelf: samengevoegd, en tot op de hoek waar ze tot
 * (bijna) aan de hoek komen (een stuk muur eindigt op de as, de strook loopt tot het snijpunt met de volgende).
 */
function opDeZijde(z: StrookZijde, stukken: { m: Muur; van: number; tot: number }[]): [number, number][] {
  const L = afstand(z.a, z.b);
  const ruw = stukken.map(({ m, van, tot }) => {
    const t0 = opZijde(z, m, van), t1 = opZijde(z, m, tot);
    return [Math.max(0, Math.min(t0, t1)), Math.min(L, Math.max(t0, t1))] as [number, number];
  }).filter(([a, b]) => b - a > 0.5).sort((x, y) => x[0] - y[0]);
  const uit: [number, number][] = [];
  for (const [a, b] of ruw) {
    const v = uit[uit.length - 1];
    if (v && a <= v[1] + 1) v[1] = Math.max(v[1], b); else uit.push([a, b]);
  }
  for (const s of uit) {
    if (s[0] < z.voor + 2) s[0] = 0;
    if (s[1] > L - z.na - 2) s[1] = L;
  }
  return uit;
}

/** Een strip in stukken van hoogstens `max` cm, even lang (een strip langer dan één voeding wordt gedeeld). */
function delen(punten: Punt[], max: number): Punt[][] {
  const lengtes = punten.slice(1).map((p, i) => afstand(punten[i]!, p));
  const totaal = lengtes.reduce((a, b) => a + b, 0);
  const k = Math.max(1, Math.ceil(totaal / max - 1e-9));
  if (k === 1) return [punten];
  const stuk = totaal / k, uit: Punt[][] = [];
  let huidig: Punt[] = [punten[0]!], gedaan = 0, grens = stuk;
  for (let i = 0; i < lengtes.length; i++) {
    const a = punten[i]!, b = punten[i + 1]!, l = lengtes[i]!;
    while (uit.length < k - 1 && gedaan + l >= grens - 1e-6) {
      const t = (grens - gedaan) / (l || 1);
      const q = punt1([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      huidig.push(q);
      uit.push(huidig);
      huidig = [q];
      grens += stuk;
    }
    if (afstand(huidig[huidig.length - 1]!, b) > 0.05) huidig.push(b);
    gedaan += l;
  }
  if (huidig.length >= 2) uit.push(huidig);
  return uit.filter((p) => p.length >= 2);
}

// ---------- de soorten uit de catalogus ----------

/** De soort leiding die een ledstrip is, en hoe lang één stuk mag zijn (cm, net onder de richtwaarde op één voeding). */
function stripSoort(tc: TechniekCatalogus | undefined): { code: string; max: number } | undefined {
  const e = Object.entries(tc?.leidingen ?? {}).find(([, s]) => s.ledstrip);
  return e ? { code: e[0], max: (e[1].maxLengte?.waarde ?? 10) * 100 - 10 } : undefined;
}
/** Het type toestel met deze vorm (de buitenlamp, de tuinlamp). */
function typeMetVorm(tc: TechniekCatalogus | undefined, vorm: ToestelType['vorm']): { code: string; type: ToestelType } | undefined {
  const e = Object.entries(tc?.toestellen ?? {}).find(([, t]) => t.vorm === vorm);
  return e ? { code: e[0], type: e[1] } : undefined;
}

// ---------- dakrand ----------

/** De kant van een buitenmuur zoals in `vlakSleutel`: "onder", "links" … of "s45" (een schuine gevel). */
export const kantVanMuur = (m: Muur) => vlakSleutel(m).split(':')[1] ?? '';

/**
 * De ledstrips onder de dakrand, per kant van de woning: waar een stuk buitenmuur geen muur van de verdieping erboven heeft
 * (de dakrand van `dakOpbouw`, ook van een lagere uitbouw), en op de bovenste verdieping onder een hellend dak alleen langs
 * de dakvoet (bij een zadeldak beide kanten, bij een lessenaarsdak de lage kant). Niet langs een bestaande muur of een muur
 * tegen de buren. Bovenaan (`plafond`: net onder de dakrand of de oversteek).
 */
export function dakrandStroken(plan: Plattegrond, cat: Pick<PlanCatalogus, 'daklichten' | 'techniek'>): VoorstelGroep[] {
  const soort = stripSoort(cat.techniek);
  const pm = planMetDak(plan);
  const opbouw = dakOpbouw(pm, cat);
  if (!soort || !opbouw) return [];
  const groepen = new Map<string, VoorstelGroep>();
  for (let n = 0; n <= opbouw.top; n++) {
    // Wat onder de dakrand ligt, per muur: de stukken van `dakOpbouw`; onder een hellend dak de muren langs de dakvoet.
    const perMuur = new Map<string, { van: number; tot: number }[]>();
    for (const d of opbouw.dakranden.filter((x) => x.niveau === n)) {
      const m = d.muur, v = d.vlak;
      const [v0, v1] = m.as === 'h' ? [v.x, v.x + v.b] : m.as === 'v' ? [v.y, v.y + v.d] : (() => {
        const s = (v.punten ?? []).map((q) => opAs(m, q)[0]);
        return s.length ? [Math.min(...s), Math.max(...s)] : [m.van, m.tot];
      })();
      // Tot de rand van het muurvlak = tot de hoek: dan vanaf de as van de hoek (de zijde loopt tot het snijpunt).
      const van = Math.abs(d.van - v0!) < 0.5 ? Math.min(d.van, m.van) : d.van;
      const tot = Math.abs(d.tot - v1!) < 0.5 ? Math.max(d.tot, m.tot) : d.tot;
      perMuur.set(m.id, [...(perMuur.get(m.id) ?? []), { van, tot }]);
    }
    const h = opbouw.hellend;
    if (h && n === opbouw.top) {
      for (const m of murenVan(niveauPlan(pm, n)).filter((x) => x.soort === 'buiten' && x.as !== 's')) {
        // De dakvoet: muren evenwijdig aan de nok (nok langs x: de liggende muren), bij een lessenaar alleen de lage kant.
        if ((h.nokAs === 'x') !== (m.as === 'h')) continue;
        const buiten = buitenKantVan(m), naarHoog = h.nokAs === 'x' ? buiten[1] : buiten[0];
        if (h.vorm === 'lessenaar' && (naarHoog > 0) !== (h.voetP === h.p1)) continue;
        perMuur.set(m.id, [{ van: m.van, tot: m.tot }]);
      }
    }
    if (!perMuur.size) continue;
    for (const lus of buitenStroken(pm, n)) {
      for (const z of lus) {
        const telt = z.muren.filter((m) => perMuur.has(m.id) && muurStatus(pm, m) === 'nieuw');
        if (!telt.length) continue;
        const kant = kantVanMuur(telt[0]!);
        for (const [t0, t1] of opDeZijde(z, telt.flatMap((m) => perMuur.get(m.id)!.map((s) => ({ m, ...s }))))) {
          if (t1 - t0 < 30) continue;
          const g = groepen.get(kant) ?? { bij: kant, leidingen: [], toestellen: [] };
          for (const punten of delen(stukVan(z, t0, t1), soort.max)) {
            g.leidingen.push({ soort: soort.code, punten, hoogte: 'plafond', niveau: n, voorstel: 'dakrand', voorstelBij: kant });
          }
          groepen.set(kant, g);
        }
      }
    }
  }
  return [...groepen.values()];
}

// ---------- buitenlampen bij de deuren ----------

/** Een deur naar buiten op het gelijkvloers die een buitenlamp krijgt (geen bestaande muur, geen raam). */
function isDeurNaarBuiten(plan: Plattegrond, o: Opening, muren: Muur[]): Muur | undefined {
  if (niveauVan(o) !== 0 || !(o.soort === 'buitendeur' || o.soort === 'schuifraam' || o.soort === 'garagepoort')) return undefined;
  const m = muurVanOpening(o, muren);
  return m && m.soort === 'buiten' && muurStatus(plan, m) === 'nieuw' ? m : undefined;
}

/**
 * Een buitenlamp naast elke deur naar buiten op het gelijkvloers: aan de buitenkant van de gevel, `LAMP_NAAST` naast de
 * rand van de opening, aan de kant met de meeste plaats (bij een voordeur liefst aan de kant van de klink), en bij een
 * opening van `BREED` cm of meer aan beide kanten. Nooit over een raam of een andere opening, niet voorbij de hoek van de
 * gevel, niet waar al een toestel hangt. Op de hoogte uit de catalogus (± 1,9 m), hoger naast een hoge opening.
 */
export function deurLampen(plan: Plattegrond, cat: Pick<PlanCatalogus, 'techniek'>, opties: VerlichtingOpties = {}): VoorstelGroep[] {
  const lamp = typeMetVorm(cat.techniek, 'buitenlamp');
  if (!lamp) return [];
  const p0 = niveauPlan(plan, 0), muren = murenVan(p0);
  const zijden = buitenStroken(plan, 0).flat();
  const bezet: Punt[] = (plan.toestellen ?? []).filter((t) => niveauVan(t) === 0).map((t) => [t.x, t.y]);
  const H = plan.muurhoogte, B = lamp.type.b;
  const uit: VoorstelGroep[] = [];
  for (const o of p0.openingen) {
    const m = isDeurNaarBuiten(plan, o, muren);
    if (!m || (opties.telt && !opties.telt(o))) continue;
    // Het muurvlak buiten langs deze muur: van hoek tot hoek (de zijde van de strook rond de woning).
    const z = zijden.find((x) => x.muren.some((y) => y.id === m.id));
    if (!z) continue;
    const s1 = opAs(m, z.a)[0], s2 = opAs(m, z.b)[0], v0 = Math.min(s1, s2) + 3, v1 = Math.max(s1, s2) - 3;
    // Andere openingen in hetzelfde muurvlak (een raam naast de deur): daar komt geen lamp.
    const anders = p0.openingen.filter((x) => { const mx = x !== o && muurVanOpening(x, muren); return !!mx && z.muren.some((y) => y.id === mx.id); })
      .map((x) => [x.midden - x.breedte / 2, x.midden + x.breedte / 2] as [number, number]);
    const e0 = o.midden - o.breedte / 2, e1 = o.midden + o.breedte / 2;
    // Buiten = de kant zonder ruimte; de lamp hangt met haar achterkant tegen het muurvlak.
    const buiten = buitenKantVan(m), w = m.lijn + (m.plus ? -1 : 1) * (m.dikte / 2 + lamp.type.d / 2);
    const plaats = (s: number): Punt => langsAs(m, s, w);
    const vrijTot = (rand: number, naar: 1 | -1) => {
      let grens = naar > 0 ? v1 : v0;
      for (const [a, b] of anders) {
        if (naar > 0 && a >= rand - 0.5) grens = Math.min(grens, a);
        if (naar < 0 && b <= rand + 0.5) grens = Math.max(grens, b);
      }
      return Math.abs(grens - rand);
    };
    const kandidaat = (naar: 1 | -1): { s: number; vrij: number } | undefined => {
      const rand = naar > 0 ? e1 : e0;
      const vrij = vrijTot(rand, naar);
      for (const naast of LAMP_NAAST) {
        const s = rand + naar * (naast + B / 2);
        const a = s - B / 2, b = s + B / 2;
        if (a < v0 || b > v1) continue;
        if (anders.some(([x, y]) => b > x - 10 && a < y + 10)) continue;
        if (bezet.some((q) => afstand(q, plaats(s)) < 40)) continue;
        return { s, vrij };
      }
      return undefined;
    };
    const links = kandidaat(-1), rechts = kandidaat(1);
    let keuze = [links, rechts].filter((x): x is { s: number; vrij: number } => !!x);
    if (o.breedte < BREED && keuze.length > 1) {
      // Een voordeur: liefst aan de kant van de klink (tegenover de scharnieren), als daar plaats genoeg is.
      const klink = o.soort === 'buitendeur' ? (o.scharnier === 'begin' ? rechts : links) : undefined;
      keuze = [klink && klink.vrij >= 40 ? klink : keuze.reduce((x, y) => (y.vrij > x.vrij ? y : x))];
    }
    if (!keuze.length) continue;
    const top = o.borstwering + o.hoogte;
    const hoogte = Math.min(H - 15 - lamp.type.h, Math.max(lamp.type.hoogte ?? 190, top > 250 ? top - 60 : 0));
    const draai = draaiNaar(buiten);
    uit.push({
      bij: o.id, leidingen: [],
      toestellen: keuze.map(({ s }) => {
        const p = punt1(plaats(s));
        bezet.push(p);
        return { type: lamp.code, x: p[0], y: p[1], hoogte: r1(hoogte), draai, aan: 'wand' as const, niveau: 0, voorstel: 'deuren' as const, voorstelBij: o.id };
      }),
    });
  }
  return uit;
}

// ---------- tuinlampen bij terras en pad ----------

/** De openingen met een terras (schuifraam) of een pad (de voordeur, in een hal): de sleutels van de tuinlampen. */
function tuinOpeningen(plan: Plattegrond, opties: VerlichtingOpties): Opening[] {
  const p0 = niveauPlan(plan, 0), muren = murenVan(p0);
  return p0.openingen.filter((o) => {
    const m = isDeurNaarBuiten(plan, o, muren);
    if (!m || o.soort === 'garagepoort' || (opties.telt && !opties.telt(o))) return false;
    return o.soort === 'schuifraam' || p0.ruimtes.find((r) => r.id === (m.plus ?? m.min))?.type === 'hal';
  });
}

/** Het grondvlak van een blok (een rechthoek, of de veelhoek van een prisma op de grond). */
function grondvlak(b: Blok): Punt[] {
  if (b.vorm === 'prisma' && b.as === 'y' && b.doorsnede?.length) return b.doorsnede.map(([x, z]) => [x, z] as Punt);
  return [[b.x, b.z], [b.x + b.b, b.z], [b.x + b.b, b.z + b.d], [b.x, b.z + b.d]];
}
const binnenOfBij = (v: Punt[], p: Punt, marge: number) => binnenVeelhoek(v, p[0], p[1]) || v.some((a, i) => afstandTotStuk(p, a, v[(i + 1) % v.length]!) < marge);

/**
 * Tuinlampen (paaltjes) op het gras: naast het terras van een schuifraam twee, bij de verste hoeken (niet in het midden
 * van de verste rand: daar loop je de tuin in), en langs het pad naar de voordeur om de ± 1,7 m aan één kant.
 * Terras en pad zijn die van de 3D (`Plan3DOpties.aanleg`). Niet in of tegen de woning of de buren, niet op een terras of
 * pad, niet dichter dan 80 cm bij een andere lamp of een toestel.
 */
export function tuinLampen(plan: Plattegrond, cat: PlanCatalogus, opties: VerlichtingOpties = {}): VoorstelGroep[] {
  const lamp = typeMetVorm(cat.techniek, 'paaltje');
  const openingen = tuinOpeningen(plan, opties);
  if (!lamp || !openingen.length) return [];
  const scene = plattegrond3D(planMetDak(plan), cat, { aanleg: true });
  const aanleg = scene.blokken.filter((b) => /^(terras|pad)_/.test(b.code));
  const verhard = aanleg.map(grondvlak);
  // In de weg: wat op de grond staat en geen terras of pad is (muren, vloeren, de buren).
  const inDeWeg = scene.blokken.filter((b) => !/^(terras|pad)_/.test(b.code) && b.y < 100).map(grondvlak);
  const bezet: Punt[] = (plan.toestellen ?? []).filter((t) => niveauVan(t) === 0).map((t) => [t.x, t.y]);
  const muren = murenVan(niveauPlan(plan, 0));
  const zijden = buitenStroken(plan, 0).flat();
  const vrij = (p: Punt) => !inDeWeg.some((v) => binnenOfBij(v, p, 25)) && !verhard.some((v) => binnenOfBij(v, p, 15)) && !bezet.some((q) => afstand(p, q) < TUIN.vrij);
  const uit: VoorstelGroep[] = [];
  for (const o of openingen) {
    const m = muurVanOpening(o, muren);
    if (!m) continue;
    const terras = o.soort === 'schuifraam';
    const stukken = aanleg.filter((b) => new RegExp(`^${terras ? 'terras' : 'pad'}_${o.id}(_\\d+)?$`).test(b.code));
    if (!stukken.length) continue;
    // In de assen van de gevel: s langs de muur, u van de gevel weg (naar buiten).
    const zin = m.plus ? -1 : 1;
    const naarPlan = (s: number, u: number): Punt => langsAs(m, s, m.lijn + zin * u);
    const su = stukken.flatMap(grondvlak).map((q) => { const [s, w] = opAs(m, q); return [s, zin * (w - m.lijn)] as Punt; });
    const s0 = Math.min(...su.map((q) => q[0])), s1 = Math.max(...su.map((q) => q[0]));
    const u0 = Math.min(...su.map((q) => q[1])), u1 = Math.max(...su.map((q) => q[1]));
    // Tussen de buren (een rijwoning): niet voorbij de zijgevels, dat is de tuin van de buren. Dan staat de lamp voorbij
    // de verste rand van het terras, bij de hoek, in plaats van ernaast.
    const z = zijden.find((x) => x.muren.some((y) => y.id === m.id));
    const grens = plan.tegenBuren?.length && z ? [Math.min(opAs(m, z.a)[0], opAs(m, z.b)[0]) + 20, Math.max(opAs(m, z.a)[0], opAs(m, z.b)[0]) - 20] : undefined;
    const binnenGrens = (s: number) => !grens || (s >= grens[0]! && s <= grens[1]!);
    const hoek = (naast: number, binnen: number): Punt => (binnenGrens(naast) ? naarPlan(naast, u1 - TUIN.naast)
      : naarPlan(Math.min(grens![1]!, Math.max(grens![0]!, binnen)), u1 + TUIN.naast));
    const kandidaten: Punt[][] = terras
      ? [[hoek(s0 - TUIN.naast, s0 + TUIN.naast)], [hoek(s1 + TUIN.naast, s1 - TUIN.naast)]]
      : (() => {
        const k = Math.max(2, Math.round((u1 - u0) / TUIN.tussen));
        const rij = (s: number) => Array.from({ length: k }, (_, i) => naarPlan(s, u0 + ((i + 0.5) * (u1 - u0)) / k));
        // Aan één kant van het pad: die waar alle lampen op het gras staan (eerst rechts gezien van de gevel).
        return [s1 + TUIN.padNaast, s0 - TUIN.padNaast].filter(binnenGrens).map(rij);
      })();
    const gekozen: Punt[] = [];
    if (terras) {
      for (const [p] of kandidaten) if (p && vrij(p)) { gekozen.push(punt1(p)); bezet.push(p); }
    } else if (kandidaten.length) {
      const rij = kandidaten.find((r) => r.every(vrij)) ?? kandidaten.reduce((a, b) => (b.filter(vrij).length > a.filter(vrij).length ? b : a));
      for (const p of rij) if (vrij(p)) { gekozen.push(punt1(p)); bezet.push(p); }
    }
    if (!gekozen.length) continue;
    uit.push({
      bij: o.id, leidingen: [],
      toestellen: gekozen.map((p) => ({ type: lamp.code, x: p[0], y: p[1], hoogte: lamp.type.hoogte ?? 0, draai: 0, aan: 'buiten' as const, niveau: 0, voorstel: 'tuin' as const, voorstelBij: o.id })),
    });
  }
  return uit;
}

// ---------- ledstrip rondom langs het plafond ----------

/** Een ledstrip rondom langs het plafond van een ruimte: bovenaan, 1 cm van de muren, in stukken van hoogstens 10 m. */
export function plafondStroken(plan: Plattegrond, cat: Pick<PlanCatalogus, 'techniek'>, ruimteId: string): VoorstelGroep[] {
  const soort = stripSoort(cat.techniek);
  const r = plan.ruimtes.find((x) => x.id === ruimteId);
  if (!soort || !r) return [];
  const n = niveauVan(r);
  const leidingen: VoorstelGroep['leidingen'] = [];
  for (const lus of ruimteStroken(plan, ruimteId)) {
    // Rondom, met de trapjes waar de muur van dikte verandert (een zijde eindigt dan niet waar de volgende begint).
    const rond: Punt[] = [];
    for (const q of [...lus.flatMap((z) => [z.a, z.b]), lus[0]!.a].map(punt1)) if (!rond.length || afstand(rond[rond.length - 1]!, q) > 0.05) rond.push(q);
    for (const punten of delen(rond, soort.max)) leidingen.push({ soort: soort.code, punten, hoogte: 'plafond', niveau: n, voorstel: 'plafond', voorstelBij: ruimteId });
  }
  return leidingen.length ? [{ bij: ruimteId, leidingen, toestellen: [] }] : [];
}

// ---------- één tik op een muur (de tegel Ledstrip in de techniek) ----------

/**
 * Een ledstrip over een heel stuk muur, na één tik (ronde 15b): binnen in een ruimte langs de dichtste muur van die ruimte,
 * buiten langs de dichtste gevel, telkens van hoek tot hoek; een opening die tot bovenaan reikt (tot tegen de strip),
 * onderbreekt ze. Op de hoogte `hoogte` (standaard bovenaan: binnen langs het plafond, buiten onder de dakrand). Niets als
 * de tik te ver van een muur (binnen 1,2 m) of een gevel (buiten 2 m) ligt.
 */
export function stripOverMuur(plan: Plattegrond, p: Punt, niveau = 0, hoogte: Leiding['hoogte'] = 'plafond'): { punten: Punt[]; buiten: boolean } | undefined {
  const r = ruimteOp(plan, p[0], p[1], niveau);
  const zijden = (r ? ruimteStroken(plan, r.id) : buitenStroken(plan, niveau)).flat();
  let beste: { z: StrookZijde; d: number } | undefined;
  for (const z of zijden) {
    const d = afstandTotStuk(p, z.a, z.b);
    if (!beste || d < beste.d) beste = { z, d };
  }
  if (!beste || beste.d > (r ? 120 : 200)) return undefined;
  const z = beste.z, L = afstand(z.a, z.b);
  // Openingen die tot tegen de strip reiken, onderbreken ze; de strip is het stuk tussen twee zulke openingen waar je tikte.
  const H = liggingHoogte(hoogte, plan.muurhoogte), muren = murenVan(niveauPlan(plan, niveau));
  const hoog = niveauPlan(plan, niveau).openingen.filter((o) => o.borstwering + o.hoogte >= H - 3 && o.borstwering <= H + 3)
    .map((o) => ({ o, m: muurVanOpening(o, muren) }))
    .filter((x): x is { o: Opening; m: Muur } => !!x.m && z.muren.some((y) => y.id === x.m!.id))
    .map(({ o, m }) => { const a = opZijde(z, m, o.midden - o.breedte / 2), b = opZijde(z, m, o.midden + o.breedte / 2); return [Math.min(a, b), Math.max(a, b)] as [number, number]; });
  const e: Punt = [(z.b[0] - z.a[0]) / (L || 1), (z.b[1] - z.a[1]) / (L || 1)];
  const t = (p[0] - z.a[0]) * e[0] + (p[1] - z.a[1]) * e[1];
  let t0 = 0, t1 = L;
  for (const [a, b] of hoog) {
    if (b <= t) t0 = Math.max(t0, b);
    else if (a >= t) t1 = Math.min(t1, a);
  }
  if (t1 - t0 < 20) return undefined;
  return { punten: stukVan(z, t0, t1), buiten: !r };
}

// ---------- aan, uit en de toestand ----------

/** Wat er bij een voorstel zou komen: alle groepen (een kant, een opening, een ruimte), of alleen die van `bij`. */
export function verlichtingVoorstel(plan: Plattegrond, cat: PlanCatalogus, soort: VerlichtingVoorstel, opties: VerlichtingOpties & { bij?: string } = {}): VoorstelGroep[] {
  const alle = soort === 'dakrand' ? dakrandStroken(plan, cat)
    : soort === 'deuren' ? deurLampen(plan, cat, opties)
      : soort === 'tuin' ? tuinLampen(plan, cat, opties)
        : opties.bij ? plafondStroken(plan, cat, opties.bij) : [];
  return opties.bij === undefined ? alle : alle.filter((g) => g.bij === opties.bij);
}

/** De sleutels (`voorstelBij`) van wat van dit voorstel in het plan staat. */
export function verlichtingInPlan(plan: Plattegrond, soort: VerlichtingVoorstel): Set<string> {
  const uit = new Set<string>();
  for (const l of plan.leidingen ?? []) if (l.voorstel === soort) uit.add(l.voorstelBij ?? '');
  for (const t of plan.toestellen ?? []) if (t.voorstel === soort) uit.add(t.voorstelBij ?? '');
  return uit;
}

/**
 * Welke groepen een voorstel zou maken, zonder alles uit te rekenen (voor de knoppen; het terras en het pad van de tuin
 * worden niet opgemeten): de kanten met een dakrand, de deuren met plaats voor een lamp, de openingen met een terras of pad.
 */
export function verlichtingVerwacht(plan: Plattegrond, cat: PlanCatalogus, soort: VerlichtingVoorstel, opties: VerlichtingOpties = {}): Set<string> {
  if (soort === 'tuin') return new Set(tuinOpeningen(plan, opties).map((o) => o.id));
  if (soort === 'plafond') return new Set();
  return new Set(verlichtingVoorstel(plan, cat, soort, opties).map((g) => g.bij));
}

/**
 * Hoe een voorstel er nu bij staat: `uit` (niets ervan in het plan), `aan` (bij elk ding waar het kan) of `deels` (een
 * tik op één gevel of deur, of het plan veranderde nadien: er kwam een deur bij).
 */
export function verlichtingStaat(plan: Plattegrond, cat: PlanCatalogus, soort: VerlichtingVoorstel, opties: VerlichtingOpties = {}): 'aan' | 'deels' | 'uit' {
  const nu = verlichtingInPlan(plan, soort);
  if (!nu.size) return 'uit';
  const verwacht = verlichtingVerwacht(plan, cat, soort, opties);
  return [...verwacht].every((k) => nu.has(k)) ? 'aan' : 'deels';
}

/** Wat een tik deed: aan of uit, hoeveel stuks erbij of weg, de lengte van de strips (m) en bij hoeveel dingen. */
export interface VerlichtingUitkomst { aan: boolean; stuks: number; lengte: number; dingen: number }

/** Haalt alles van dit voorstel weg (of alleen dat bij `bij`); lege lijsten verdwijnen, zoals in een plan zonder techniek. */
function haalWeg(plan: Plattegrond, soort: VerlichtingVoorstel, bij?: string): number {
  const weg = (x: { voorstel?: VerlichtingVoorstel; voorstelBij?: string }) => x.voorstel === soort && (bij === undefined || x.voorstelBij === bij);
  const voor = (plan.leidingen?.length ?? 0) + (plan.toestellen?.length ?? 0);
  if (plan.leidingen) { plan.leidingen = plan.leidingen.filter((x) => !weg(x)); if (!plan.leidingen.length) delete plan.leidingen; }
  if (plan.toestellen) { plan.toestellen = plan.toestellen.filter((x) => !weg(x)); if (!plan.toestellen.length) delete plan.toestellen; }
  return voor - (plan.leidingen?.length ?? 0) - (plan.toestellen?.length ?? 0);
}

function voegToe(plan: Plattegrond, groepen: VoorstelGroep[], opties: VerlichtingOpties): { stuks: number; lengte: number } {
  let teller = (plan.leidingen?.length ?? 0) + (plan.toestellen?.length ?? 0), lengte = 0, stuks = 0;
  const id = (prefix: string) => opties.nieuweId?.(prefix) ?? `${prefix}_v${++teller}`;
  for (const g of groepen) {
    for (const l of g.leidingen) {
      (plan.leidingen ??= []).push({ id: id('l'), ...l });
      lengte += l.punten.slice(1).reduce((s, p, i) => s + afstand(l.punten[i]!, p), 0);
      stuks++;
    }
    for (const t of g.toestellen) { (plan.toestellen ??= []).push({ id: id('t'), ...t }); stuks++; }
  }
  return { stuks, lengte: Math.round(lengte) / 100 };
}

/**
 * Eén tik op een voorstel (wijzigt het plan ter plaatse, zoals `verfGevel`). Met `bij` (een tik op één gevel, deur of
 * ruimte): staat het er, dan weg, anders erbij. Zonder `bij` (de knop bij de nacht): staat het overal, dan alles weg;
 * anders komt het erbij waar het nog ontbreekt (kan er nergens nog iets bij, dan alles weg).
 */
export function wisselVerlichting(plan: Plattegrond, cat: PlanCatalogus, soort: VerlichtingVoorstel, opties: VerlichtingOpties & { bij?: string } = {}): VerlichtingUitkomst {
  const nu = verlichtingInPlan(plan, soort);
  if (opties.bij !== undefined ? nu.has(opties.bij) : verlichtingStaat(plan, cat, soort, opties) === 'aan') {
    return { aan: false, stuks: haalWeg(plan, soort, opties.bij), lengte: 0, dingen: 0 };
  }
  const nieuw = verlichtingVoorstel(plan, cat, soort, opties).filter((g) => !nu.has(g.bij) && (g.leidingen.length || g.toestellen.length));
  if (!nieuw.length) return nu.size && opties.bij === undefined ? { aan: false, stuks: haalWeg(plan, soort), lengte: 0, dingen: 0 } : { aan: false, stuks: 0, lengte: 0, dingen: 0 };
  return { aan: true, ...voegToe(plan, nieuw, opties), dingen: nieuw.length };
}
