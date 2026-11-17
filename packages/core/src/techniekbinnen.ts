/**
 * De techniek binnen in de afgewerkte woning (ronde 17, 17/11/2026). Jonas: *"Bij afgewerkt zouden de zaken van de
 * techniek ook zichtbaar mogen zijn, bvb stopcontacten airco etc"*. Een klant wil in zijn afgewerkte woning zien waar de
 * stopcontacten, de schakelaars, de airco, de radiatoren, de lampen, de warmtepomp en de boiler komen.
 *
 * Elk toestel uit de techniek van het plan dat binnen hangt of staat (niet `toestelBuiten`: wat buiten staat, tekent
 * `Plan3DOpties.techniekBuiten` al sinds ronde 10c), op zijn plaats, op zijn **echte maat** en in zijn **eigen kleur** uit
 * de catalogus (wit, grijs, metaal): `toestelBlokken(…, false)`, zonder de kleuren van de vakken en zonder merkteken. Wat in
 * de muur of het plafond zit (`ToestelType.inbouw`: de inbouwdoos van een stopcontact, de rand van een inbouwspot), zakt
 * erin, zodat alleen het plaatje uitsteekt. **Geen leidingen**: die zitten in de muren en de vloer. 's Nachts gloeien de
 * lampen (`toestelLicht`), zonder echt licht: dat zou zonder schaduw door de muren schijnen en de lampen buiten hun licht
 * afnemen.
 *
 * **Muren laag** (de bovenste getoonde verdieping, gesneden op `laag`): er is geen plafond en de muren stoppen op de
 * snijhoogte. Wat dan boven de snijhoogte hangt (zie `BovenSnede`):
 *   - aan de muur (een schakelaar of het stopcontact boven het werkblad net erboven, de thermostaat, de airco, het
 *     verdeelbord): standaard met **een stukje muur erachter** (`STUKJE_MUUR`): de muur loopt achter het toestel door tot
 *     een eind erboven, over de breedte van het toestel plus een rand, in de wand van de ruimte, zoals een snede die daar
 *     hoger blijft. Een binnenmuur over haar hele dikte (aan elke kant de wand van die ruimte); een buitenmuur alleen met
 *     haar binnenblad (14 cm): de gevel blijft op de snijhoogte, anders stond er buiten een schoorsteen van baksteen.
 *     Toestellen dicht bij elkaar delen één stukje; een stukje loopt nooit over een raam of deur of door een hoek.
 *   - aan het plafond (lichtpunt, inbouwspot, hanglamp, ventiel, cassette): weg; je ziet ze van binnen (`techniekVanBinnen`)
 *     en in de woning met volle muren en een dak.
 *   - op de vloer (warmtepomp, boiler, batterij): gewoon, ook als ze hoger zijn dan de lage muren (zoals een kast).
 *
 * De blokken heten `binnentechniek_<toestel>_…` (met `dingen`: `toestel:<id>.binnentechniek_…`), het stukje muur
 * `binnentechniek_muur_…`: zo herkent de kijker ze (`isBinnenTechniek`) en kan hij ze verbergen, ook zonder dingen.
 */
import { binnenKant, isAccent, PLAFOND_DIKTE } from './binnenafwerking.js';
import { toestelLicht } from './nacht.js';
import {
  buitenAfwerking, grondPrisma, langsAs, murenVan, muurVanOpening, niveauPlan, niveauVan, NEUTRAAL, opAs, ruimteOp, toestelBuiten,
  vloerHoogte, type GevelAfwerking, type GevelKant, type Muur, type PlanCatalogus, type Plattegrond, type Punt, type Ruimte,
} from './plattegrond.js';
import type { Blok } from './ruimtelijk.js';
import { toestelBlokken, toestelMaten, voorRichting, type Toestel, type ToestelType } from './techniek.js';

/** Het begin van de code van elk blok van de techniek binnen (na het ding): zo kan een kijker ze verbergen. */
export const BINNEN_TECHNIEK = 'binnentechniek';

/** Is dit een blok van de techniek binnen (een toestel of een stukje muur erachter), met of zonder ding ervoor? */
export const isBinnenTechniek = (code: string) => code.startsWith(`${BINNEN_TECHNIEK}_`) || code.includes(`.${BINNEN_TECHNIEK}_`);

/** Heeft het plan een toestel dat binnen hangt of staat? Dan kan de techniek in de afgewerkte woning aan of uit. */
export const heeftTechniekBinnen = (plan: Plattegrond) => !!plan.toestellen?.some((t) => !toestelBuiten(plan, t));

/**
 * Wat er met *Muren laag* gebeurt met een toestel aan de muur dat boven de snijhoogte uitkomt: `stukje` = een stukje muur
 * erachter tot een eind boven het toestel (standaard), `plafond` = dat stukje muur tot het plafond, `weg` = niet tonen (dan
 * zie je het alleen van binnen). Ronde 17: alle drie in beeld gebracht, `stukje` gekozen (zie de skill `bouw-woning`).
 */
export type BovenSnede = 'stukje' | 'plafond' | 'weg';

/**
 * Het stukje muur (cm): hoe ver het opzij naast het toestel uitsteekt, hoe ver boven het toestel het doorloopt, hoe hoog
 * minstens, tot welke tussenruimte twee stukjes één worden, en hoe dik het in een buitenmuur is (het binnenblad).
 */
export const STUKJE_MUUR = { opzij: 12, boven: 14, minstens: 24, samen: 20, binnenblad: 14 };

/** De kleur van een snede door een muur (zoals de bovenkant van de lage muren: pleister). */
const SNEDE = '#efeee9';

const r2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Een toestel zoals je het in de afgewerkte woning ziet: `toestelBlokken` op zijn echte maat en in zijn eigen kleur, met wat
 * in de muur of het plafond zit (`inbouw`) erin. `plafond` (cm boven de vloer) = de onderkant van het plafond als dat niet
 * op de muurhoogte ligt (van binnen: de laag van het plafond, lager bij een verlaagd plafond).
 */
export function toestelAfgewerkt(t: Toestel, type: ToestelType, vloer: number, muurhoogte: number, code: string, plafond = muurhoogte): Blok[] {
  const inbouw = type.inbouw ?? 0;
  let x = t.x, y = t.y, hoogte = t.hoogte;
  if (t.aan === 'plafond') hoogte += inbouw + (plafond - muurhoogte);
  else if (t.aan === 'wand' && inbouw) {
    const [vx, vy] = voorRichting(t.draai);
    x -= vx * inbouw;
    y -= vy * inbouw;
  }
  return toestelBlokken({ ...t, x, y, hoogte }, type, vloer, muurhoogte, code, false);
}

/** Een lamp binnen gloeit 's nachts, maar geeft geen echt licht (dat zou door de muren schijnen). */
function gloeiBinnen(blokken: Blok[], type: ToestelType, t: Toestel): Blok[] {
  return toestelLicht(blokken, type, t).map((b) => (b.licht && (b.licht.bereik !== undefined || b.licht.vanaf) ? { ...b, licht: { kleur: b.licht.kleur, sterkte: b.licht.sterkte } } : b));
}

/** De muur waartegen een toestel aan de wand hangt: de achterkant op (tot 3 cm van) het muurvlak, de voorkant ervan weg. */
function muurAchter(t: Toestel, type: ToestelType, muren: Muur[]): { m: Muur; s: number; plus: boolean } | undefined {
  const d = toestelMaten(type, t.aan).d, v = voorRichting(t.draai);
  const achter: Punt = [t.x - v[0] * (d / 2), t.y - v[1] * (d / 2)];
  let beste: { m: Muur; s: number; plus: boolean; af: number } | undefined;
  for (const m of muren) {
    const [s, w] = opAs(m, achter);
    if (s < m.van - 1 || s > m.tot + 1) continue;
    const af = Math.abs(Math.abs(w - m.lijn) - m.dikte / 2);
    const [, wt] = opAs(m, [t.x, t.y]), plus = wt > m.lijn;
    if (af > 3 || Math.abs(wt - m.lijn) < m.dikte / 2 - 0.5) continue;
    if (!beste || af < beste.af) beste = { m, s: opAs(m, [t.x, t.y])[0], plus, af };
  }
  return beste;
}

/** Een stukje muur: langs muur m van a tot b (langs de as), van y0 tot y1 (in de wereld). */
interface Stukje { m: Muur; a: number; b: number; y0: number; y1: number; toestel: string }

/** De afwerking van de kant van muur m naar ruimte `id` (de wand, of de accentmuur), of de gevel als er geen ruimte is. */
function kantAfwerking(plan: Plattegrond, cat: PlanCatalogus, m: Muur, id: string | undefined): GevelAfwerking {
  if (!id) return buitenAfwerking(plan, cat, m);
  const r = plan.ruimtes.find((x) => x.id === id);
  if (!r) return plan.gevel;
  if (r.bestaand === true) return { soort: 'gevel', kleur: NEUTRAAL.binnen };
  const w = cat.wanden[isAccent(r, m) ? r.accent!.wand : r.wand] ?? cat.wanden[r.wand];
  return w ? { soort: w.soort, kleur: w.kleur } : { soort: 'gevel', kleur: SNEDE };
}

/** De stukjes muur als blokken: per muur de stukjes die elkaar raken samen (geen vlakken op elkaar die flikkeren). */
function stukjesBlokken(plan: Plattegrond, cat: PlanCatalogus, stukjes: Stukje[], dingen: boolean): Blok[] {
  const uit: Blok[] = [];
  const perMuur = new Map<string, Stukje[]>();
  for (const s of stukjes) perMuur.set(s.m.id, [...(perMuur.get(s.m.id) ?? []), s]);
  for (const lijst of perMuur.values()) {
    lijst.sort((p, q) => p.a - q.a);
    const samen: Stukje[] = [];
    for (const s of lijst) {
      const vorige = samen[samen.length - 1];
      if (vorige && s.a <= vorige.b + STUKJE_MUUR.samen) samen[samen.length - 1] = { ...vorige, b: Math.max(vorige.b, s.b), y1: Math.max(vorige.y1, s.y1) };
      else samen.push(s);
    }
    for (const [i, s] of samen.entries()) {
      const { m } = s;
      const code = `${BINNEN_TECHNIEK}_muur_${m.id}_${i}`;
      const naam = dingen ? `toestel:${s.toestel}.${code}` : code;
      // Dwars op de muur: een binnenmuur helemaal; een buitenmuur alleen haar binnenblad (de gevel blijft op de snijhoogte,
      // zoals een spouwmuur: buiten zie je dan geen schoorsteen van baksteen maar een wit vlak achter de gevel).
      const buiten = m.soort === 'buiten', plusKant = !!m.plus;
      const blad = Math.min(m.dikte, STUKJE_MUUR.binnenblad);
      const [w0, w1] = !buiten ? [m.lijn - m.dikte / 2, m.lijn + m.dikte / 2]
        : plusKant ? [m.lijn + m.dikte / 2 - blad, m.lijn + m.dikte / 2] : [m.lijn - m.dikte / 2, m.lijn - m.dikte / 2 + blad];
      // De kant van een ruimte in haar wand; de kant naar de spouw zoals de snede (de kleur van het blok).
      const plusAfw = m.plus ? kantAfwerking(plan, cat, m, m.plus) : null, minAfw = m.min ? kantAfwerking(plan, cat, m, m.min) : null;
      const h = r2(s.y1 - s.y0);
      if (m.as === 's') {
        // Schuin: het grondvlak als prisma, elke zijde haar afwerking (de kopse kanten zoals de snede).
        const punten: Punt[] = [langsAs(m, s.a, w0), langsAs(m, s.b, w0), langsAs(m, s.b, w1), langsAs(m, s.a, w1)];
        const randen = [minAfw, null, plusAfw, null];
        // Met de klok mee, zoals de muren (`metDeKlok`): anders omgekeerd, de randen mee (rand i loopt van punt i naar i + 1).
        const opp = punten.reduce((t, p, k) => { const q = punten[(k + 1) % punten.length]!; return t + p[0] * q[1] - q[0] * p[1]; }, 0);
        const [pt, rn] = opp < 0 ? [[...punten].reverse(), [randen[2]!, randen[1]!, randen[0]!, randen[3]!]] : [punten, randen];
        uit.push(grondPrisma(naam, 'gevel', SNEDE, pt, r2(s.y0), h, { randen: rn }));
        continue;
      }
      const [zp, zm] = m.as === 'h' ? (['z+', 'z-'] as const) : (['x+', 'x-'] as const);
      const zijden: Blok['zijden'] = {};
      if (plusAfw) zijden[zp] = plusAfw;
      if (minAfw) zijden[zm] = minAfw;
      const basis = { code: naam, soort: 'gevel' as const, vorm: 'blok' as const, kleur: SNEDE, y: r2(s.y0), h, zijden };
      uit.push(m.as === 'h'
        ? { ...basis, x: r2(s.a), z: r2(w0), b: r2(s.b - s.a), d: r2(w1 - w0) }
        : { ...basis, x: r2(w0), z: r2(s.a), b: r2(w1 - w0), d: r2(s.b - s.a) });
    }
  }
  return uit;
}

/**
 * Waar het stukje muur achter een toestel mag komen langs zijn muur: tussen de binnenvlakken van de muren die er dwars op
 * staan (niet door een hoek naar buiten), niet over een raam of deur. Niets als het toestel in een opening hangt.
 */
function stukjeLangs(plan: Plattegrond, m: Muur, muren: Muur[], s: number, half: number): [number, number] | undefined {
  // De dikste muur die op punt p dwars op m staat (een schuine muur: geen).
  const dwars = (p: number) => {
    if (m.as === 's') return 0;
    const op = muren.filter((x) => x.as !== m.as && x.as !== 's' && Math.abs(x.lijn - p) < 0.5 && x.van <= m.lijn + 0.5 && x.tot >= m.lijn - 0.5);
    return op.length ? Math.max(...op.map((x) => x.dikte)) : 0;
  };
  let a = Math.max(m.van + dwars(m.van) / 2, s - half), b = Math.min(m.tot - dwars(m.tot) / 2, s + half);
  for (const o of plan.openingen) {
    if (muurVanOpening(o, [m]) !== m) continue;
    const oa = o.midden - o.breedte / 2, ob = o.midden + o.breedte / 2;
    if (ob <= s) a = Math.max(a, ob);
    else if (oa >= s) b = Math.min(b, oa);
    else return undefined;
  }
  return b - a > 1 ? [a, b] : undefined;
}

/** Opties voor de techniek binnen in de woning (zie `Plan3DOpties.techniekBinnen`). */
export interface TechniekBinnenOpties {
  /** Muren laag: de snijhoogte van de bovenste getoonde verdieping (cm). */
  laag?: number;
  /** De bovenste getoonde verdieping. */
  laatste: number;
  /** Ligt er een dak op de bovenste getoonde verdieping (anders hangt wat aan haar plafond in de lucht)? */
  dakErop: boolean;
  dingen?: boolean;
  /** Lampen gloeien 's nachts (`Plan3DOpties.verlichting`). */
  verlichting?: boolean;
  /** Wat boven de snijhoogte aan de muur hangt (standaard `stukje`). */
  boven?: BovenSnede;
}

/**
 * De toestellen binnen in de afgewerkte woning (zie bovenaan), als blokken in de wereld, met de stukjes muur erachter.
 * Een plan zonder toestellen binnen geeft niets.
 */
export function techniekBinnenBlokken(plan: Plattegrond, cat: PlanCatalogus, o: TechniekBinnenOpties): Blok[] {
  const tc = cat.techniek;
  if (!tc || !plan.toestellen?.length) return [];
  const uit: Blok[] = [], stukjes: Stukje[] = [];
  const murenPer = new Map<number, Muur[]>();
  const murenOp = (n: number) => { if (!murenPer.has(n)) murenPer.set(n, murenVan(niveauPlan(plan, n))); return murenPer.get(n)!; };
  const boven = o.boven ?? 'stukje', H = plan.muurhoogte;
  for (const t of plan.toestellen) {
    const type = tc.toestellen[t.type], n = niveauVan(t);
    if (!type || n > o.laatste || toestelBuiten(plan, t)) continue;
    const bovenste = n === o.laatste, laag = bovenste && o.laag !== undefined ? Math.min(o.laag, H) : undefined;
    // Aan het plafond: alleen waar er een plafond is (niet met lage muren, niet op een verdieping zonder dak erop).
    if (t.aan === 'plafond' && bovenste && (laag !== undefined || !o.dakErop)) continue;
    const vloer = vloerHoogte(plan, n);
    const code = `${BINNEN_TECHNIEK}_${t.id}`;
    const blokken = toestelAfgewerkt(t, type, vloer, H, code);
    if (t.aan === 'wand' && laag !== undefined) {
      const top = Math.max(...blokken.map((b) => b.y + b.h)) - vloer;
      if (top > laag + 0.5) {
        if (boven === 'weg') continue;
        const muren = murenOp(n), achter = muurAchter(t, type, muren);
        const langs = achter && stukjeLangs(niveauPlan(plan, n), achter.m, muren, achter.s, toestelMaten(type, t.aan).b / 2 + STUKJE_MUUR.opzij);
        // Geen muur erachter (of het hangt in een opening): niet tonen, anders zweeft het.
        if (!achter || !langs) continue;
        const y1 = boven === 'plafond' ? H : Math.min(H, Math.max(top + STUKJE_MUUR.boven, laag + STUKJE_MUUR.minstens));
        stukjes.push({ m: achter.m, a: langs[0], b: langs[1], y0: vloer + laag, y1: vloer + y1, toestel: t.id });
      }
    }
    const metLicht = o.verlichting ? gloeiBinnen(blokken, type, t) : blokken;
    uit.push(...(o.dingen ? metLicht.map((b) => ({ ...b, code: `toestel:${t.id}.${b.code}` })) : metLicht));
  }
  if (stukjes.length) {
    // Per verdieping (alleen de bovenste heeft lage muren, dus in de praktijk één).
    uit.push(...stukjesBlokken(plan, cat, stukjes, !!o.dingen));
  }
  return uit;
}

/**
 * De toestellen van één ruimte van binnen (`ruimteVanBinnen`, ronde 12): wat in de ruimte staat of hangt, behalve aan de
 * muren aan een open kant (die muur is weg). Op de vloer van de ruimte (y = 0); wat aan het plafond hangt, hangt onder de
 * laag van het plafond (lager bij een verlaagd plafond). Codes zoals in de woning; vóór het draaien van de scène.
 */
export function techniekVanBinnen(plan: Plattegrond, cat: PlanCatalogus, r: Ruimte, open: GevelKant[], o: { dingen?: boolean } = {}): Blok[] {
  const tc = cat.techniek;
  if (!tc || !plan.toestellen?.length) return [];
  const n = niveauVan(r), H = plan.muurhoogte;
  const muren = murenVan(niveauPlan(plan, n));
  const plafond = cat.plafonds?.[r.plafond ?? ''];
  const onder = H - (plafond?.verlaagd ?? 0) - PLAFOND_DIKTE;
  const uit: Blok[] = [];
  for (const t of plan.toestellen) {
    const type = tc.toestellen[t.type];
    if (!type || niveauVan(t) !== n || toestelBuiten(plan, t) || ruimteOp(plan, t.x, t.y, n)?.id !== r.id) continue;
    if (t.aan === 'wand') {
      const achter = muurAchter(t, type, muren);
      const kant = achter ? binnenKant(achter.m, r.id) : undefined;
      if (kant && open.includes(kant)) continue;
    }
    const blokken = toestelAfgewerkt(t, type, 0, H, `${BINNEN_TECHNIEK}_${t.id}`, onder);
    uit.push(...(o.dingen ? blokken.map((b) => ({ ...b, code: `toestel:${t.id}.${b.code}` })) : blokken));
  }
  return uit;
}
