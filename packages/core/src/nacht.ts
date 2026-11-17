/**
 * Licht bij nacht en ledstrips (ronde 15, 17/11/2026). Jonas: *"ook bvb ledstrips en nachtweergave?"* Een verkoper wil
 * een klant tonen hoe de woning er 's avonds uitziet: de ramen die warm oplichten, de buitenverlichting, een ledstrip
 * onder de dakrand of onder een kast.
 *
 * De motor zegt wat licht geeft (`Blok.licht` op de blokken van de scène), de kijker beslist hoe dat eruitziet
 * (`Viewer3D.nacht` in drie-d.ts: de lucht van een late avond, maanlicht, oplichtend materiaal, een paar echte lichten en
 * in Mooi een gloed). Alles hier hangt aan `Plan3DOpties.verlichting`; zonder die optie zijn de blokken exact die van
 * vroeger (de vingerafdrukken in de tests blijven gelijk).
 *   - Het glas van de ramen en buitendeuren (`raamLicht`) en van de daklichten (`daklichtLicht`): warm licht van binnen,
 *     per soort ruimte feller of zwakker (`RAAM_LICHT`). Het grootste glas van een deur of raam tot op de grond verlicht
 *     ook wat ervoor ligt (het terras).
 *   - De lampen uit de techniek die je buiten ziet (`ToestelType.licht`): hun kap licht op en verlicht de gevel
 *     (`toestelLicht`).
 *   - De ledstrips (een soort leiding met `ledstrip`): een dun profiel in de afgewerkte woning, overdag ook, met een
 *     strook die 's nachts oplicht in haar kleur (`LICHTKLEUREN`) en de muur of de grond eronder verlicht
 *     (`ledstripBlokken`).
 * Overal benaderingen om een avondbeeld te tonen: geen lichtberekening, geen lux, geen keuze van armaturen.
 */
import { asVan, murenVan, niveauPlan, niveauVan, opAs, ruimteOp, vloerHoogte, type Muur, type Opening, type Plattegrond, type RuimteType } from './plattegrond.js';
import type { Blok, BlokLicht } from './ruimtelijk.js';
import { leidingVerloop, voorRichting, type Leiding, type TechniekCatalogus, type Toestel, type ToestelType, type ToestelVorm } from './techniek.js';

/** De kleuren van het licht van een ledstrip (en van een lamp): drie soorten wit en een paar kleuren. Code → naam en kleur (sRGB). */
export const LICHTKLEUREN: Record<string, { label: string; kleur: string }> = {
  warm: { label: 'Warm wit', kleur: '#ffc98f' },
  neutraal: { label: 'Neutraal wit', kleur: '#fff0dc' },
  koel: { label: 'Koel wit', kleur: '#e2ecff' },
  blauw: { label: 'Blauw', kleur: '#4f8cff' },
  groen: { label: 'Groen', kleur: '#43d17a' },
  rood: { label: 'Rood', kleur: '#ff4f4f' },
};
/** Zonder keuze: warm wit, zoals de meeste lampen in een woning. */
export const STANDAARD_LICHTKLEUR = 'warm';

/** De kleur van het licht van een ledstrip (de code uit `LICHTKLEUREN`, of warm wit). */
export function lichtkleurVan(code?: string): { code: string; label: string; kleur: string } {
  const c = code && LICHTKLEUREN[code] ? code : STANDAARD_LICHTKLEUR;
  return { code: c, ...LICHTKLEUREN[c]! };
}

/** Het licht achter de ramen: warm, als van gewone lampen binnen. */
export const RAAM_KLEUR = '#ffbd70';

/**
 * Hoe fel de ramen van een ruimte 's avonds oplichten: de leefruimte en de keuken het felst, een slaapkamer minder, een
 * berging of garage nauwelijks (zo ziet een woning er 's avonds uit: niet overal evenveel licht). Een eigen keuze.
 */
export const RAAM_LICHT: Record<RuimteType, number> = {
  leefruimte: 1, keuken: 1, bureau: 0.8, badkamer: 0.75, hal: 0.7, slaapkamer: 0.55, wc: 0.5, garage: 0.3, berging: 0.25,
};

/** Hoe ver (cm) het echte licht reikt: een buitenlamp verder dan een ledstrip, het licht door een groot raam het minst ver. */
export const LICHT_BEREIK = { lamp: 380, strip: 320, raam: 420 };

const r2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Het glas van een raam of buitendeur in een buitenmuur licht 's avonds op, in het licht van de ruimte erachter. Het
 * grootste glas van een opening tot (bijna) op de grond verlicht ook wat ervoor ligt: het licht komt dan van een eind
 * binnen in de kamer (`vanaf`, langs de normaal naar binnen), zodat het door het raam naar buiten valt en niet op de
 * gevel. `blokken` zijn de blokken van de opening (zoals `openingBlokken` ze geeft); de rest blijft ongewijzigd.
 */
export function raamLicht(blokken: Blok[], plan: Plattegrond, m: Muur, o: Opening): Blok[] {
  if (m.soort !== 'buiten') return blokken;
  const ruimteId = m.plus ?? m.min;
  const ruimte = plan.ruimtes.find((r) => r.id === ruimteId);
  const sterkte = ruimte ? RAAM_LICHT[ruimte.type] ?? 0.7 : 0.7;
  // Naar binnen: de normaal naar de kant van de ruimte (plus of min).
  const { n } = asVan(m), teken = m.plus ? 1 : -1;
  const binnen: [number, number, number] = [r2(n[0] * teken * 90), 0, r2(n[1] * teken * 90)];
  const glas = blokken.filter((b) => b.soort === 'glas' || b.soort === 'matglas');
  if (!glas.length) return blokken;
  const groot = glas.reduce((a, b) => (b.b * b.h * b.d > a.b * a.h * a.d ? b : a));
  const totDeGrond = o.borstwering < 40 && groot.h * Math.max(groot.b, groot.d) >= 15000;
  return blokken.map((b) => {
    if (b.soort !== 'glas' && b.soort !== 'matglas') return b;
    const licht: BlokLicht = { kleur: RAAM_KLEUR, sterkte: b.soort === 'matglas' ? r2(sterkte * 0.8) : sterkte };
    // Het licht hangt binnen, een eind van het raam, op de hoogte van een plafondlamp: het valt door het glas op het terras.
    if (b === groot && totDeGrond && sterkte >= 0.5) { licht.bereik = LICHT_BEREIK.raam; licht.vanaf = [binnen[0], r2(-b.h / 2 + 200), binnen[2]]; }
    return { ...b, licht };
  });
}

/** Het glas van een daklicht licht 's avonds op (de kamer eronder brandt), zonder echt licht: dat zou door het dak schijnen. */
export function daklichtLicht(blokken: Blok[]): Blok[] {
  return blokken.map((b) => (b.soort === 'glas' || b.soort === 'matglas' ? { ...b, licht: { kleur: RAAM_KLEUR, sterkte: 0.75 } } : b));
}

/** Welke delen van een lamp oplichten (de code van het blok in `toestelVorm`, achteraan de code). */
const GLOEIT: Partial<Record<ToestelVorm, string[]>> = {
  lichtpunt: ['lamp'], spot: ['licht'], pendel: ['kap'], wandlamp: ['kap'], buitenlamp: ['licht_boven', 'licht_onder'], paaltje: ['licht'],
};

/**
 * Een lamp uit de techniek (`ToestelType.licht`): de delen die oplichten krijgen `licht`, en de kap (het eerste deel) ook
 * echt licht dat de gevel en de grond errond verlicht, een eind vóór de lamp (anders een witte vlek op de muur).
 */
export function toestelLicht(blokken: Blok[], type: ToestelType, t: Toestel): Blok[] {
  if (!type.licht) return blokken;
  const delen = GLOEIT[type.vorm] ?? [];
  const kleur = lichtkleurVan(type.licht.kleur).kleur;
  const [vx, vy] = voorRichting(t.draai);
  const voor = t.aan === 'wand' ? 32 : 0, neer = t.aan === 'plafond' ? -40 : t.aan === 'buiten' ? 10 : 0;
  let eerste = true;
  return blokken.map((b) => {
    if (!delen.some((d) => b.code.endsWith(`_${d}`))) return b;
    const licht: BlokLicht = { kleur, sterkte: type.licht!.sterkte ?? 1 };
    if (eerste && type.licht!.bereik) { licht.bereik = type.licht!.bereik; licht.vanaf = [r2(vx * voor), neer, r2(vy * voor)]; }
    eerste = false;
    return { ...b, licht };
  });
}

/** Mag deze leiding als ledstrip getekend worden (een soort met `ledstrip`, minstens twee punten)? */
export function isLedstrip(l: Leiding, tc: TechniekCatalogus | undefined): boolean {
  return !!tc?.leidingen[l.soort]?.ledstrip && l.punten.length >= 2;
}

/** Maten van het profiel van een ledstrip in de afgewerkte woning (cm): hoogte, diepte (van de muur af), en de strook. */
export const LEDSTRIP_PROFIEL = { hoog: 1.8, diep: 1.5, strook: 0.35 };

/**
 * Van de muur weg, bij een punt van een ledstrip: de richting van het dichtste muurvlak naar het punt (eenheidsvector op
 * het plan), of niets als er binnen 8 cm geen muurvlak is (een strip die vrij hangt). Zo valt het licht vóór de muur.
 */
function wegVanMuur(muren: Muur[], p: [number, number]): [number, number] | undefined {
  let beste: { d: number; weg: [number, number] } | undefined;
  for (const m of muren) {
    const [s, w] = opAs(m, p);
    if (s < m.van - 1 || s > m.tot + 1) continue;
    const vlak = Math.abs(w - m.lijn) - m.dikte / 2;
    if (vlak > 8 || vlak < -2) continue;
    const { n } = asVan(m), kant = w >= m.lijn ? 1 : -1;
    if (!beste || vlak < beste.d) beste = { d: vlak, weg: [n[0] * kant, n[1] * kant] };
  }
  return beste?.weg;
}

export interface LedstripOpties {
  /** Muren laag (de snijhoogte van de bovenste getoonde verdieping): een strip die hoog boven de lage muren zou zweven, valt weg. */
  laag?: number;
  /** Tot en met deze verdieping (zoals `Plan3DOpties.totNiveau`). */
  totNiveau?: number;
  /** Codes met het ding (`leiding:<id>.`), zodat een tik de strip kent. */
  dingen?: boolean;
  /** De verdieping die bovenaan getoond wordt (voor `laag`). */
  laatste?: number;
}

/**
 * De ledstrips in de afgewerkte woning: per recht stuk een aluminium profiel (overdag een dunne lijn langs de muur) met
 * eronder de strook die 's nachts oplicht in de kleur van de strip, en die de muur en de grond eronder verlicht (het licht
 * een eind vóór de muur en eronder, zie `BlokLicht.vanaf`). Stukken op en neer (naar een andere hoogte) worden niet
 * getekend: een strip loopt vlak. Een benadering om te tonen waar het licht komt, geen profiel van een fabrikant.
 */
export function ledstripBlokken(plan: Plattegrond, tc: TechniekCatalogus | undefined, opties: LedstripOpties = {}): Blok[] {
  if (!tc || !plan.leidingen?.length) return [];
  const uit: Blok[] = [];
  const P = LEDSTRIP_PROFIEL;
  const murenPer = new Map<number, Muur[]>();
  for (const l of plan.leidingen) {
    if (!isLedstrip(l, tc)) continue;
    const n = niveauVan(l);
    if (opties.totNiveau !== undefined && n > opties.totNiveau) continue;
    const verloop = leidingVerloop(l, plan, tc, { vloerHoogte: (k) => vloerHoogte(plan, k) });
    const y0 = vloerHoogte(plan, n);
    if (opties.laag !== undefined && n === (opties.laatste ?? n) && verloop.punten.some((q) => q[1] - y0 > opties.laag! + 60)) continue;
    if (!murenPer.has(n)) murenPer.set(n, murenVan(niveauPlan(plan, n)));
    const muren = murenPer.get(n)!;
    const kleur = lichtkleurVan(l.lichtkleur).kleur;
    const ding = opties.dingen ? `leiding:${l.id}.` : '';
    let k = 0;
    for (let i = 1; i < verloop.punten.length; i++) {
      const p = verloop.punten[i - 1]!, q = verloop.punten[i]!;
      const dx = q[0] - p[0], dz = q[2] - p[2], L = Math.hypot(dx, dz);
      if (L < 1 || Math.abs(q[1] - p[1]) > 0.5) continue;
      const mx = (p[0] + q[0]) / 2, mz = (p[2] + q[2]) / 2, y = p[1];
      // Aan elk einde een halve diepte langer: de hoeken van een strip die om een hoek loopt, zijn dicht.
      const lengte = L + P.diep;
      const hoek = Math.round((Math.atan2(dz, dx) * 180) / Math.PI * 1e4) / 1e4;
      const langsX = Math.abs(dz) < 0.01, langsZ = Math.abs(dx) < 0.01;
      const balk = (code: string, soort: Blok['soort'], kleurBlok: string, onder: number, h: number, diep: number, extra: Partial<Blok> = {}): Blok => {
        const basis = { code: `${ding}ledstrip_${l.id}_${k}_${code}`, soort, vorm: 'blok' as const, kleur: kleurBlok, y: r2(onder), h: r2(h), ...extra };
        if (langsZ) return { ...basis, x: r2(mx - diep / 2), z: r2(mz - lengte / 2), b: r2(diep), d: r2(lengte) };
        if (langsX) return { ...basis, x: r2(mx - lengte / 2), z: r2(mz - diep / 2), b: r2(lengte), d: r2(diep) };
        return { ...basis, x: r2(mx - lengte / 2), z: r2(mz - diep / 2), b: r2(lengte), d: r2(diep), draai: hoek };
      };
      const weg = wegVanMuur(muren, [mx, mz]);
      // Het echte licht hangt een eind vóór de muur en eronder: het verlicht de grond of de vloer, niet één vlek op de muur
      // (de kijker legt de band licht op de muur zelf, zie `waasVan` in drie-d.ts).
      const licht: BlokLicht = { kleur, sterkte: 1, bereik: LICHT_BEREIK.strip, vanaf: [r2((weg?.[0] ?? 0) * 110), -130, r2((weg?.[1] ?? 0) * 110)] };
      uit.push(balk('profiel', 'metaal', '#c4c7c9', y - P.hoog / 2 + P.strook, P.hoog - P.strook, P.diep));
      uit.push(balk('licht', 'kunststof', '#f6f3ea', y - P.hoog / 2, P.strook, P.diep * 0.7, { licht }));
      k++;
    }
  }
  return uit;
}

/** Ligt een strip buiten de woning (het midden van het eerste stuk)? Voor de woorden voor de klant en het voorstel van de hoogte. */
export function stripBuiten(plan: Plattegrond, l: Leiding): boolean {
  const a = l.punten[0], b = l.punten[1];
  if (!a || !b) return false;
  return !ruimteOp(plan, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, niveauVan(l));
}
