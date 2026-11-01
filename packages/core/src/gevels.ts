/**
 * Gevelaanzichten uit de plattegrond: per kant de buitenmuren van alle verdiepingen, met de ramen
 * en deuren (gezien van buiten), zonweringskasten, dakranden en kettingmaten (maten tussen de ramen).
 * Resultaat als TekeningResultaat, zodat tekenSvg ze tekent (scherm en afdruk).
 */
import {
  delenVan,
  murenVan,
  muurVanOpening,
  niveauPlan,
  niveauVan,
  verdiepingenVan,
  vloerHoogte,
  VLOERDIKTE,
  type GevelKant,
  type Opening,
  type Plattegrond,
} from './plattegrond.js';
import type { MaatlijnResultaat, TekeningResultaat, VormResultaat } from './types.js';

export interface GevelInfo {
  label?: string;
  /** Kleur van het kader buiten. */
  kleur?: string;
  /** Opening per vak, gezien van binnen (zoals in het raammodel). */
  vakken?: string[];
  /** Hoogte zonweringskast (cm). */
  kast?: number;
  /** Voordeur: vol paneel in plaats van glas. */
  paneel?: boolean;
  voordeur?: boolean;
}

export interface Gevel {
  kant: GevelKant;
  naam: string;
  tekening: TekeningResultaat;
}

const SPIEGEL: Record<string, string> = {
  draai_l: 'draai_r', draai_r: 'draai_l', draaikip_l: 'draaikip_r', draaikip_r: 'draaikip_l', schuif_l: 'schuif_r', schuif_r: 'schuif_l',
};
const r1 = (x: number) => Math.round(x * 10) / 10;

export function gevelAanzichten(plan: Plattegrond, info: (o: Opening) => GevelInfo | undefined = () => undefined): Gevel[] {
  const delen = plan.ruimtes.flatMap(delenVan);
  if (!delen.length) return [];
  const X0 = Math.min(...delen.map((p) => p.x)), X1 = Math.max(...delen.map((p) => p.x + p.b));
  const Y0 = Math.min(...delen.map((p) => p.y)), Y1 = Math.max(...delen.map((p) => p.y + p.d));
  const niveaus = verdiepingenVan(plan).length;
  const H = plan.muurhoogte;
  const top = vloerHoogte(plan, niveaus - 1) + H + VLOERDIKTE;
  const sy = (h: number) => r1(top - h);
  const t = plan.buitenmuur / 2;

  // Van planpositie langs de muur naar x in het aanzicht (gezien van buiten, links → rechts).
  const naarU: Record<GevelKant, (v: number) => number> = {
    boven: (v) => X1 - v, onder: (v) => v - X0, links: (v) => v - Y0, rechts: (v) => Y1 - v,
  };
  const voordeurKant = (['boven', 'onder', 'links', 'rechts'] as GevelKant[]).find((k) =>
    plan.openingen.some((o) => niveauVan(o) === 0 && info(o)?.voordeur && kantVan(plan, o) === k));
  const tegenover: Record<GevelKant, GevelKant> = { boven: 'onder', onder: 'boven', links: 'rechts', rechts: 'links' };

  const uit: Gevel[] = [];
  for (const kant of ['boven', 'onder', 'links', 'rechts'] as GevelKant[]) {
    const vormen: VormResultaat[] = [];
    const maatlijnen: MaatlijnResultaat[] = [];
    const as = kant === 'boven' || kant === 'onder' ? 'h' : 'v';
    const segmentenPerNiveau: [number, number][][] = [];
    let umin = Infinity, umax = -Infinity;

    for (let n = 0; n < niveaus; n++) {
      const p = niveauPlan(plan, n);
      const muren = murenVan(p).filter((m) => m.soort === 'buiten' && m.as === as && (kant === 'boven' || kant === 'links' ? !m.min : !m.plus));
      const y0 = vloerHoogte(plan, n);
      const segs: [number, number][] = [];
      for (const m of muren) {
        const a = naarU[kant](m.van - t), b = naarU[kant](m.tot + t);
        const u0 = Math.min(a, b), u1 = Math.max(a, b);
        segs.push([u0, u1]);
        umin = Math.min(umin, u0); umax = Math.max(umax, u1);
        const onder = n > 0 ? VLOERDIKTE : 0;
        vormen.push({ code: `muur.${n}.${m.id}`, x: r1(u0), y: sy(y0 + H), breedte: r1(u1 - u0), hoogte: H + onder, vulling: plan.gevel.kleur, lijn: '#55524c' });
        // Ramen en deuren in deze muur.
        for (const o of p.openingen.filter((x) => muurVanOpening(x, [m]) === m)) {
          const i = info(o) ?? {};
          const a1 = naarU[kant](o.midden - o.breedte / 2), b1 = naarU[kant](o.midden + o.breedte / 2);
          const ox = Math.min(a1, b1), ob = o.breedte;
          const onderkant = y0 + o.borstwering, bovenkant = onderkant + o.hoogte;
          if (i.kast) vormen.push({ code: `kast.${o.id}`, x: r1(ox - 2), y: sy(bovenkant + i.kast), breedte: ob + 4, hoogte: i.kast, vulling: i.kleur ?? '#383e42' });
          vormen.push({ code: `kader.${o.id}`, x: r1(ox), y: sy(bovenkant), breedte: ob, hoogte: o.hoogte, vulling: i.kleur ?? '#383e42' });
          const vakken = i.vakken?.length ? [...i.vakken].reverse() : o.soort === 'schuifraam' ? ['vast', 'schuif_l'] : ['vast'];
          const k = 6, w = (ob - 2 * k) / vakken.length;
          vakken.forEach((op, j) => {
            vormen.push({
              code: `vak.${o.id}.${j}`, x: r1(ox + k + j * w + (j ? k / 2 : 0)), y: sy(bovenkant - k), breedte: r1(w - (j ? k / 2 : 0) - (j < vakken.length - 1 ? k / 2 : 0)), hoogte: o.hoogte - 2 * k,
              vulling: i.paneel ? (i.kleur ?? '#383e42') : '#c5d5da', symbool: SPIEGEL[op] ?? op,
            });
          });
          if (i.label) vormen.push({ code: `label.${o.id}`, x: r1(ox + ob / 2 - 28), y: sy(onderkant - 12), breedte: 56, hoogte: 30, vulling: '#ffffff', label: i.label });
        }
      }
      segmentenPerNiveau.push(segs);
    }
    if (!vormen.length) continue;

    // Dakrand boven elk stuk dat niet onder een hogere verdieping ligt.
    segmentenPerNiveau.forEach((segs, n) => {
      const boven = segmentenPerNiveau[n + 1] ?? [];
      for (const [u0, u1] of segs) {
        let vrij: [number, number][] = [[u0, u1]];
        for (const [b0, b1] of boven) {
          vrij = vrij.flatMap(([a, b]): [number, number][] => {
            if (b1 <= a || b0 >= b) return [[a, b]];
            const stukken: [number, number][] = [[a, Math.max(a, b0)], [Math.min(b, b1), b]];
            return stukken.filter(([x, y]) => y - x > 1);
          });
        }
        for (const [a, b] of vrij) vormen.push({ code: `dakrand.${n}.${a}`, x: r1(a - 3), y: sy(vloerHoogte(plan, n) + H + VLOERDIKTE), breedte: r1(b - a + 6), hoogte: VLOERDIKTE, vulling: '#2b2b2b' });
      }
    });
    // Maaiveld.
    vormen.push({ code: 'maaiveld', x: r1(umin - 80), y: sy(0), breedte: r1(umax - umin + 160), hoogte: 4, vulling: '#6b6862' });

    // Kettingmaten per verdieping (onder de tekening), en de totale breedte.
    let afstand = 70;
    segmentenPerNiveau.forEach((segs, n) => {
      if (!segs.length) return;
      const p = niveauPlan(plan, n);
      const muren = murenVan(p).filter((m) => m.soort === 'buiten' && m.as === as && (kant === 'boven' || kant === 'links' ? !m.min : !m.plus));
      // Alleen de uiteinden van de gevel en de randen van de openingen (geen muuraansluitingen).
      const gevelStukken = [...segs].sort((x, y) => x[0] - y[0]).reduce<[number, number][]>((acc, [a, b]) => {
        const laatste = acc[acc.length - 1];
        if (laatste && a <= laatste[1] + 1) laatste[1] = Math.max(laatste[1], b); else acc.push([a, b]);
        return acc;
      }, []);
      const punten = new Set<number>(gevelStukken.flatMap(([a, b]) => [r1(a), r1(b)]));
      for (const o of p.openingen) {
        if (!muren.some((m) => muurVanOpening(o, [m]) === m)) continue;
        punten.add(r1(naarU[kant](o.midden - o.breedte / 2)));
        punten.add(r1(naarU[kant](o.midden + o.breedte / 2)));
      }
      const lijst = [...punten].sort((a, b) => a - b);
      for (let i = 0; i + 1 < lijst.length; i++) {
        const a = lijst[i]!, b = lijst[i + 1]!;
        if (b - a < 1) continue;
        maatlijnen.push({ code: `ketting.${n}.${i}`, x1: b, y1: sy(0), x2: a, y2: sy(0), afstand, tekst: `${Math.round(b - a)}` });
      }
      afstand += 110;
    });
    maatlijnen.push({ code: 'totaal', x1: r1(umax), y1: sy(0), x2: r1(umin), y2: sy(0), afstand, tekst: `${Math.round(umax - umin)}` });
    // Hoogtes rechts: vloer per verdieping en de dakrand.
    const hoogtes = [0];
    for (let n = 0; n < niveaus; n++) if (segmentenPerNiveau[n]?.length) hoogtes.push(vloerHoogte(plan, n) + H + VLOERDIKTE);
    for (let i = 0; i + 1 < hoogtes.length; i++) {
      maatlijnen.push({ code: `hoogte.${i}`, x1: r1(umax), y1: sy(hoogtes[i + 1]!), x2: r1(umax), y2: sy(hoogtes[i]!), afstand: 70, tekst: `${Math.round(hoogtes[i + 1]! - hoogtes[i]!)}` });
    }

    const rol = voordeurKant === kant ? 'Voorgevel' : voordeurKant && tegenover[voordeurKant] === kant ? 'Achtergevel' : voordeurKant ? 'Zijgevel' : 'Gevel';
    const naam = `${rol} (${kant === 'boven' ? 'bovenkant' : kant === 'onder' ? 'onderkant' : kant === 'links' ? 'linkerkant' : 'rechterkant'} van het plan)`;
    uit.push({ kant, naam, tekening: { titel: `${naam} · cm`, eenheid: 'cm', vormen, maatlijnen } });
  }
  return uit;
}

/** Aan welke kant van de woning zit een opening in een buitenmuur? */
export function kantVan(plan: Plattegrond, o: Opening): GevelKant | undefined {
  const m = muurVanOpening(o, murenVan(niveauPlan(plan, niveauVan(o))));
  if (!m || m.soort !== 'buiten') return undefined;
  if (m.as === 'h') return m.min ? 'onder' : 'boven';
  return m.min ? 'rechts' : 'links';
}
