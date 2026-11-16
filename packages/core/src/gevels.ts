/**
 * Gevelaanzichten uit de plattegrond: per kant de buitenmuren van alle verdiepingen, met de ramen
 * en deuren (gezien van buiten), zonweringskasten, dakranden en kettingmaten (maten tussen de ramen).
 * Resultaat als TekeningResultaat, zodat tekenSvg ze tekent (scherm en afdruk).
 */
import { DAK_BEDEKKING, DAK_OPBOUW, OPSTAND_HOOGTE, OPSTAND_RAND, dakHoogte, gevelOnderDak, oppervlakOnderDak } from './dak.js';
import {
  asVan,
  langsAs,
  buitenKant,
  buitenRichting,
  muurVlak,
  opAs,
  dakAfwerking,
  dakOpbouw,
  delenVan,
  gevelAfwerking,
  gevelKeuzeVan,
  vlakSleutel,
  type GevelAfwerking,
  type GevelKeuze,
  type Muur,
  type PlanCatalogus,
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
import { gebouwenVan } from './maatinvoer.js';
import { losseWandHoogte, losseWandRuimte, losseWandVlak } from './lossewand.js';
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

/** Een muurvlak in het aanzicht (voor de gevel-editor: klikken = dit vlak verven). */
export interface GevelVlak {
  /** Code van de vorm in de tekening (data-code in de SVG). */
  code: string;
  /** Sleutel van het muurvlak (zie vlakSleutel). */
  sleutel: string;
  niveau: number;
  muur: string;
  ruimte: string;
  /** De sokkel onderaan (gelijkvloers). */
  sokkel?: boolean;
}

export interface Gevel {
  kant: GevelKant;
  naam: string;
  tekening: TekeningResultaat;
  vlakken: GevelVlak[];
  /** Planpositie langs de muur (cm) → x in het aanzicht, en terug. */
  naarU: (v: number) => number;
  vanU: (u: number) => number;
  /** Hoogte boven het maaiveld (cm) → y in de tekening, en terug. */
  naarY: (h: number) => number;
  vanY: (y: number) => number;
  /**
   * Een schuine gevel (na de vier kanten): waar ze naar kijkt. `kant` is dan de dichtste van de vier, en `naarU`/`vanU`
   * werken met de plaats langs de schuine muur (`midden` van een opening, zie `Muur`).
   */
  schuin?: SchuineGevel;
}

/** Patroon en lijnkleur van een gevelmateriaal in de tekening. */
function patroonVan(a: GevelAfwerking): { patroon?: string; patroonKleur?: string } {
  const patronen = ['steen', 'planken', 'planken_h', 'leien', 'zink', 'natuursteen'];
  if (!patronen.includes(a.soort)) return {};
  return { patroon: a.soort, patroonKleur: a.voeg ?? (a.soort === 'steen' ? '#cfc8bb' : donker(a.kleur, 0.62)) };
}
function donker(hex: string, f: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#00000055';
  const k = (i: number) => Math.round(parseInt(m[1]!.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0');
  return `#${k(0)}${k(2)}${k(4)}`;
}

const SPIEGEL: Record<string, string> = {
  draai_l: 'draai_r', draai_r: 'draai_l', draaikip_l: 'draaikip_r', draaikip_r: 'draaikip_l', schuif_l: 'schuif_r', schuif_r: 'schuif_l',
};
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Een schuine gevel: de richting waarin ze kijkt (graden met de klok mee vanaf de bovenkant van het plan). */
export interface SchuineGevel { kijkt: number }

/** Een richting op het plan in woorden: boven, rechtsboven, rechts … (acht streken). */
export function richtingNaam(graden: number): string {
  return ['boven', 'rechtsboven', 'rechts', 'rechtsonder', 'onder', 'linksonder', 'links', 'linksboven'][Math.round((((graden % 360) + 360) % 360) / 45) % 8]!;
}

/**
 * Van waar tot waar een buitenmuur in een aanzicht loopt (langs de muur): een rechte muur van as tot as plus een halve
 * muurdikte aan elk einde, een schuine muur haar buitenvlak (van hoek tot hoek in haar grondvlak).
 */
function uiterst(m: Muur, muren: Muur[]): [number, number] {
  if (m.as !== 's') return [m.van - m.dikte / 2, m.tot + m.dikte / 2];
  const v = muurVlak(m, muren), i = v.randen!.indexOf(m.plus ? 'min' : 'plus');
  const a = opAs(m, v.punten![i]!)[0], b = opAs(m, v.punten![(i + 1) % v.punten!.length]!)[0];
  return [Math.min(a, b), Math.max(a, b)];
}

/** Verdieping van een muur: die van de ruimte erachter. */
const niveauVanMuur = (plan: Plattegrond, m: Muur) => niveauVan(plan.ruimtes.find((r) => r.id === (m.plus ?? m.min)) ?? {});

/**
 * Gevelaanzichten: de vier kanten van het plan, en met `opties.schuin` daarna per richting van de schuine buitenmuren een
 * eigen aanzicht (recht ervoor bekeken). In de vier kanten staat een schuine muur in verkort (zoals je ze van daar ziet),
 * bij de kant waar ze het meest naar kijkt. Zonder `opties.schuin` blijft het bij de vier kanten: de schermen van vóór de
 * schuine muren kiezen een aanzicht op zijn `kant` en kunnen er geen tweede met dezelfde kant tonen.
 */
export function gevelAanzichten(plan: Plattegrond, info: (o: Opening) => GevelInfo | undefined = () => undefined, cat?: PlanCatalogus, opties: { schuin?: boolean } = {}): Gevel[] {
  const delen = plan.ruimtes.flatMap(delenVan);
  if (!delen.length) return [];
  const X0 = Math.min(...delen.map((p) => p.x)), X1 = Math.max(...delen.map((p) => p.x + p.b));
  const Y0 = Math.min(...delen.map((p) => p.y)), Y1 = Math.max(...delen.map((p) => p.y + p.d));
  const niveaus = verdiepingenVan(plan).length;
  const H = plan.muurhoogte;
  const top = vloerHoogte(plan, niveaus - 1) + H + VLOERDIKTE;
  const sy = (h: number) => r1(top - h);
  const t = plan.buitenmuur / 2;
  const sokkel = plan.gevelOntwerp?.sokkel && plan.gevelOntwerp.sokkel.hoogte > 0 ? plan.gevelOntwerp.sokkel : undefined;
  const sokkelAfw = sokkel ? gevelAfwerking(plan, cat, sokkel) : undefined;
  // Dak: het hellende dak op de bovenste verdieping, en de daklichten op de platte daken.
  const dak = dakOpbouw(plan);
  const hellend = dak?.hellend;
  const dakAfw = dak ? dakAfwerking(cat, dak.keuze.bedekking) : undefined;

  // Van planpositie langs de muur naar x in het aanzicht (gezien van buiten, links → rechts).
  const naarU: Record<GevelKant, (v: number) => number> = {
    boven: (v) => X1 - v, onder: (v) => v - X0, links: (v) => v - Y0, rechts: (v) => Y1 - v,
  };
  const vanU: Record<GevelKant, (u: number) => number> = {
    boven: (u) => X1 - u, onder: (u) => u + X0, links: (u) => u + Y0, rechts: (u) => Y1 - u,
  };
  const voordeurKant = (['boven', 'onder', 'links', 'rechts'] as GevelKant[]).find((k) =>
    plan.openingen.some((o) => niveauVan(o) === 0 && info(o)?.voordeur && kantVan(plan, o) === k));
  const tegenover: Record<GevelKant, GevelKant> = { boven: 'onder', onder: 'boven', links: 'rechts', rechts: 'links' };
  // Een los bijgebouw in hetzelfde plan is een tweede gebouw: in een aanzicht bedekt het gebouw vooraan het gebouw erachter.
  // Met één gebouw (elk plan van vroeger) verandert er niets aan de volgorde.
  const gebouw = gebouwenVan(plan);
  const meerGebouwen = new Set(gebouw.values()).size > 1;

  const uit: Gevel[] = [];
  /**
   * Eén aanzicht: de buitenmuren die `kies` aanduidt, met `nu` van een plaats langs de muur naar x in het aanzicht (gezien
   * van buiten, links → rechts) en `vu` terug. Een schuine gevel (`schuin`) krijgt geen hellend dak en geen daklichten.
   */
  const maak = (kant: GevelKant, kies: (m: Muur) => boolean, nu: (v: number) => number, vu: (u: number) => number, schuin?: SchuineGevel): Gevel | undefined => {
    // Een schuine muur in een van de vier kanten: een plaats langs die muur (op haar buitenvlak) in verkort, zoals je ze
    // van die kant ziet (de x of de y van dat punt op het plan).
    const pu = (m: Muur, v: number) => (!schuin && m.as === 's'
      ? nu(langsAs(m, v, m.lijn + ((m.plus ? -1 : 1) * m.dikte) / 2)[kant === 'boven' || kant === 'onder' ? 0 : 1])
      : nu(v));
    const vormen: VormResultaat[] = [];
    // Ramen en deuren komen na alle muren en sokkels (anders tekent een volgende muur erover).
    const openingVormen: VormResultaat[] = [];
    const vlakken: GevelVlak[] = [];
    const maatlijnen: MaatlijnResultaat[] = [];
    const as = kant === 'boven' || kant === 'onder' ? 'h' : 'v';
    const segmentenPerNiveau: [number, number][][] = [];
    let umin = Infinity, umax = -Infinity;
    // Meer dan één gebouw: per gebouw eerst de muren en dan zijn ramen (zie `gebouw` hierboven).
    const perGebouw = new Map<number, { muren: VormResultaat[]; open: VormResultaat[] }>();
    const bak = (m: Muur) => {
      if (!meerGebouwen) return { muren: vormen, open: openingVormen };
      const nr = gebouw.get(m.plus ?? m.min ?? '') ?? 0;
      let x = perGebouw.get(nr);
      if (!x) perGebouw.set(nr, (x = { muren: [], open: [] }));
      return x;
    };

    for (let n = 0; n < niveaus; n++) {
      const p = niveauPlan(plan, n);
      const alleMuren = murenVan(p), muren = alleMuren.filter(kies);
      const y0 = vloerHoogte(plan, n);
      const segs: [number, number][] = [];
      for (const m of muren) {
        const [e0, e1] = uiterst(m, alleMuren);
        const a = pu(m, e0), b = pu(m, e1);
        const u0 = Math.min(a, b), u1 = Math.max(a, b);
        segs.push([u0, u1]);
        umin = Math.min(umin, u0); umax = Math.max(umax, u1);
        const onder = n > 0 ? VLOERDIKTE : 0;
        const afw = gevelAfwerking(plan, cat, gevelKeuzeVan(plan, m));
        const ruimte = m.plus ?? m.min ?? '';
        bak(m).muren.push({ code: `muur.${n}.${m.id}`, x: r1(u0), y: sy(y0 + H), breedte: r1(u1 - u0), hoogte: H + onder, vulling: afw.kleur, lijn: '#55524c', ...patroonVan(afw) });
        vlakken.push({ code: `muur.${n}.${m.id}`, sleutel: vlakSleutel(m), niveau: n, muur: m.id, ruimte });
        if (n === 0 && sokkel && sokkelAfw) {
          bak(m).muren.push({ code: `sokkel.${n}.${m.id}`, x: r1(u0), y: sy(sokkel.hoogte), breedte: r1(u1 - u0), hoogte: sokkel.hoogte, vulling: sokkelAfw.kleur, lijn: '#55524c', ...patroonVan(sokkelAfw) });
          vlakken.push({ code: `sokkel.${n}.${m.id}`, sleutel: vlakSleutel(m), niveau: n, muur: m.id, ruimte, sokkel: true });
        }
        // Onder een hellend dak loopt de muur door tot tegen het dak: de topgevel hoort bij hetzelfde muurvlak.
        if (!schuin && hellend && dak && n === dak.top) {
          const code = `topgevel.${n}.${m.id}`;
          if ((m.as === 'h') !== (hellend.nokAs === 'x')) {
            const punten = gevelOnderDak(hellend, Math.max(m.van - t, hellend.p0), Math.min(m.tot + t, hellend.p1)).map(([a, h]) => [nu(a), sy(y0 + H + h)] as const);
            if (punten.length) {
              const us = punten.map((q) => q[0]), ys = punten.map((q) => q[1]);
              bak(m).muren.push({
                code, x: r1(Math.min(...us)), y: Math.min(...ys), breedte: r1(Math.max(...us) - Math.min(...us)), hoogte: r1(Math.max(...ys) - Math.min(...ys)),
                pad: `M ${punten.map(([u, y]) => `${r1(u)} ${y}`).join(' L ')} Z`, vulling: afw.kleur, lijn: '#55524c', ...patroonVan(afw),
              });
              vlakken.push({ code, sleutel: vlakSleutel(m), niveau: n, muur: m.id, ruimte });
            }
          } else {
            // Muur langs de nok: alleen de hoge gevel van een lessenaar komt boven de dakvoet uit.
            const h = Math.max(0, dakHoogte(hellend, m.lijn + (m.plus ? -1 : 1) * (m.dikte / 2)));
            if (h > 0.5) {
              bak(m).muren.push({ code, x: r1(u0), y: sy(y0 + H + h), breedte: r1(u1 - u0), hoogte: r1(h), vulling: afw.kleur, lijn: '#55524c', ...patroonVan(afw) });
              vlakken.push({ code, sleutel: vlakSleutel(m), niveau: n, muur: m.id, ruimte });
            }
          }
        }
        // Ramen en deuren in deze muur.
        for (const o of p.openingen.filter((x) => muurVanOpening(x, [m]) === m)) {
          const i = info(o) ?? {};
          const a1 = pu(m, o.midden - o.breedte / 2), b1 = pu(m, o.midden + o.breedte / 2);
          const ox = Math.min(a1, b1), ob = m.as === 's' && !schuin ? Math.abs(b1 - a1) : o.breedte;
          const onderkant = y0 + o.borstwering, bovenkant = onderkant + o.hoogte;
          if (i.kast) bak(m).open.push({ code: `kast.${o.id}`, x: r1(ox - 2), y: sy(bovenkant + i.kast), breedte: ob + 4, hoogte: i.kast, vulling: i.kleur ?? '#383e42' });
          bak(m).open.push({ code: `kader.${o.id}`, x: r1(ox), y: sy(bovenkant), breedte: ob, hoogte: o.hoogte, vulling: i.kleur ?? '#383e42' });
          const vakken = i.vakken?.length ? [...i.vakken].reverse() : o.soort === 'schuifraam' ? ['vast', 'schuif_l'] : ['vast'];
          const k = 6, w = (ob - 2 * k) / vakken.length;
          vakken.forEach((op, j) => {
            bak(m).open.push({
              code: `vak.${o.id}.${j}`, x: r1(ox + k + j * w + (j ? k / 2 : 0)), y: sy(bovenkant - k), breedte: r1(w - (j ? k / 2 : 0) - (j < vakken.length - 1 ? k / 2 : 0)), hoogte: o.hoogte - 2 * k,
              vulling: i.paneel ? (i.kleur ?? '#383e42') : '#c5d5da', symbool: SPIEGEL[op] ?? op,
            });
          });
          if (i.label) bak(m).open.push({ code: `label.${o.id}`, x: r1(ox + ob / 2 - 28), y: sy(onderkant - 12), breedte: 56, hoogte: 30, vulling: '#ffffff', label: i.label });
        }
      }
      segmentenPerNiveau.push(segs);
    }
    if (meerGebouwen) {
      // Het verste gebouw eerst: een gebouw dat ervoor staat, bedekt het andere (zoals je het van buiten ziet).
      const a = ((schuin?.kijkt ?? { boven: 0, rechts: 90, onder: 180, links: 270 }[kant]) * Math.PI) / 180;
      const naarKijker: [number, number] = [Math.sin(a), -Math.cos(a)];
      const diepte = (nr: number) => {
        const delen = plan.ruimtes.filter((r) => gebouw.get(r.id) === nr).flatMap(delenVan);
        return delen.reduce((t, q) => t + (q.x + q.b / 2) * naarKijker[0] + (q.y + q.d / 2) * naarKijker[1], 0) / Math.max(1, delen.length);
      };
      for (const [, x] of [...perGebouw].sort((p, q) => diepte(p[0]) - diepte(q[0]))) vormen.push(...x.muren, ...x.open);
    }
    if (!vormen.length) return undefined;
    if (!meerGebouwen) vormen.push(...openingVormen);

    // Dakrand boven elk stuk dat niet onder een hogere verdieping ligt.
    segmentenPerNiveau.forEach((segs, n) => {
      // Onder een hellend dak staat geen dakrand.
      if (hellend && dak && n === dak.top) return;
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
    // Daklichten op de platte daken: opstand en glas boven de dakrand (niet als een hogere verdieping ervoor staat).
    for (const { licht: l, reden } of schuin ? [] : dak?.daklichten ?? []) {
      if (reden) continue;
      const n = niveauVan(l);
      const [a0, a1] = as === 'h' ? [l.x, l.x + l.b] : [l.y, l.y + l.d];
      const ervoor = plan.ruimtes.filter((r) => niveauVan(r) > n).flatMap(delenVan).some((q) => {
        const [q0, q1] = as === 'h' ? [q.x, q.x + q.b] : [q.y, q.y + q.d];
        if (Math.min(q1, a1) - Math.max(q0, a0) < 1) return false;
        return kant === 'boven' ? q.y < l.y : kant === 'onder' ? q.y + q.d > l.y + l.d : kant === 'links' ? q.x < l.x : q.x + q.b > l.x + l.b;
      });
      if (ervoor) continue;
      const u0 = Math.min(nu(a0), nu(a1)), b = a1 - a0;
      const yd = vloerHoogte(plan, n) + H + VLOERDIKTE;
      const bol = cat?.daklichten?.[l.type]?.vorm === 'lichtstraat' ? 24 : Math.min(30, Math.max(16, Math.min(l.b, l.d) * 0.28));
      vormen.push({ code: `daklicht.${l.id}.opstand`, x: r1(u0 - OPSTAND_RAND), y: sy(yd + OPSTAND_HOOGTE), breedte: r1(b + 2 * OPSTAND_RAND), hoogte: OPSTAND_HOOGTE, vulling: '#cfcdc7', lijn: '#55524c' });
      vormen.push({ code: `daklicht.${l.id}.glas`, x: r1(u0 - OPSTAND_RAND + 1), y: sy(yd + OPSTAND_HOOGTE + bol), breedte: r1(b + 2 * OPSTAND_RAND - 2), hoogte: r1(bol), afronding: Math.min(12, bol / 2), vulling: '#cfe0e6', lijn: '#55524c' });
    }
    // Hellend dak: in doorsnede aan de kant van de topgevel, als vlak aan de kant van de dakvoet.
    if (!schuin && hellend && dak && dakAfw && segmentenPerNiveau[dak.top]?.length) {
      const yb = vloerHoogte(plan, dak.top) + H, o = hellend.oversteek;
      const dikte = (DAK_OPBOUW + DAK_BEDEKKING) / Math.cos((hellend.helling * Math.PI) / 180);
      const pa = hellend.p0 - o, pb = hellend.p1 + o;
      const patroon = ['pannen', 'leien', 'zink'].includes(dakAfw.soort) ? { patroon: dakAfw.soort, patroonKleur: donker(dakAfw.kleur, 0.62) } : {};
      if ((as === 'h') !== (hellend.nokAs === 'x')) {
        const onder: [number, number][] = hellend.vorm === 'zadel'
          ? [[pa, dakHoogte(hellend, pa)], [hellend.nokP, hellend.nok], [pb, dakHoogte(hellend, pb)]]
          : [[pa, dakHoogte(hellend, pa)], [pb, dakHoogte(hellend, pb)]];
        const punten = [
          ...onder.map(([p, h]) => [nu(p), sy(yb + h)] as const),
          ...[...onder].reverse().map(([p, h]) => [nu(p), sy(yb + h + dikte)] as const),
        ];
        const us = punten.map((q) => q[0]), ys = punten.map((q) => q[1]);
        vormen.push({
          code: 'dak.doorsnede', x: r1(Math.min(...us)), y: Math.min(...ys), breedte: r1(Math.max(...us) - Math.min(...us)), hoogte: r1(Math.max(...ys) - Math.min(...ys)),
          pad: `M ${punten.map(([u, y]) => `${r1(u)} ${y}`).join(' L ')} Z`, vulling: dakAfw.kleur, lijn: '#2b2b28',
        });
      } else {
        const u0 = Math.min(nu(hellend.q0 - o), nu(hellend.q1 + o)), b = hellend.q1 - hellend.q0 + 2 * o;
        if (hellend.vorm === 'zadel' || dak.keuze.richting === kant) {
          // Kant van de dakvoet: je kijkt op het dakvlak, van de onderkant van de oversteek tot de nok.
          vormen.push({ code: 'dak.vlak', x: r1(u0), y: sy(yb + hellend.top), breedte: r1(b), hoogte: r1(hellend.top + o * hellend.tan), vulling: dakAfw.kleur, lijn: '#2b2b28', ...patroon });
        } else {
          // Hoge kant van een lessenaar: de rand van het dak, en eronder de onderkant van de oversteek (die loopt naar
          // de kijker toe omhoog en is dus te zien), tot op de bovenkant van de muur.
          vormen.push({ code: 'dak.rand', x: r1(u0), y: sy(yb + hellend.top), breedte: r1(b), hoogte: r1(hellend.top - hellend.nok), vulling: '#3f3e3b', lijn: '#2b2b28' });
        }
      }
    }
    // Losse wanden buiten (ronde 2d, een tuinmuur): vóór de gevel, als je ze van deze kant ziet (geen ruimte ertussen). Na
    // alles van het gebouw: ze staan dichter bij wie kijkt. De maten van de gevel blijven die van het gebouw.
    let wmin = umin, wmax = umax;
    if (!schuin) {
      const naarKijker: [number, number] = kant === 'boven' ? [0, -1] : kant === 'onder' ? [0, 1] : kant === 'links' ? [-1, 0] : [1, 0];
      const alleDelen = plan.ruimtes.flatMap(delenVan);
      for (let n = 0; n < niveaus; n++) {
        const p = niveauPlan(plan, n);
        for (const w of p.losseWanden ?? []) {
          if (losseWandRuimte(p, w)) continue;
          const v = losseWandVlak(w, murenVan(p), p.losseWanden);
          if (v.punten.length < 3) continue;
          const cx = v.punten.reduce((t, q) => t + q[0], 0) / v.punten.length, cy = v.punten.reduce((t, q) => t + q[1], 0) / v.punten.length;
          // Staat er een ruimte tussen de wand en wie kijkt, dan zie je ze niet.
          const verborgen = alleDelen.some((q) => (naarKijker[1]
            ? cx > q.x && cx < q.x + q.b && (naarKijker[1] < 0 ? q.y < cy : q.y + q.d > cy)
            : cy > q.y && cy < q.y + q.d && (naarKijker[0] < 0 ? q.x < cx : q.x + q.b > cx)));
          if (verborgen) continue;
          const us = v.punten.map((q) => nu(as === 'h' ? q[0] : q[1]));
          const u0 = Math.min(...us), u1 = Math.max(...us), h = losseWandHoogte(plan, w), y0 = vloerHoogte(plan, n);
          const afw = gevelAfwerking(plan, cat, w.gevel ?? plan.gevelOntwerp?.standaard);
          vormen.push({ code: `wand.${w.id}`, x: r1(u0), y: sy(y0 + h), breedte: r1(u1 - u0), hoogte: r1(h), vulling: afw.kleur, lijn: '#55524c', ...patroonVan(afw) });
          wmin = Math.min(wmin, u0); wmax = Math.max(wmax, u1);
        }
      }
    }
    // Maaiveld.
    const m0 = wmin < umin ? wmin - 40 : umin, m1 = wmax > umax ? wmax + 40 : umax;
    vormen.push({ code: 'maaiveld', x: r1(m0 - 80), y: sy(0), breedte: r1(m1 - m0 + 160), hoogte: 4, vulling: '#6b6862' });

    // Kettingmaten per verdieping (onder de tekening), en de totale breedte.
    let afstand = 70;
    segmentenPerNiveau.forEach((segs, n) => {
      if (!segs.length) return;
      const p = niveauPlan(plan, n);
      const muren = murenVan(p).filter(kies);
      // Alleen de uiteinden van de gevel en de randen van de openingen (geen muuraansluitingen).
      const gevelStukken = [...segs].sort((x, y) => x[0] - y[0]).reduce<[number, number][]>((acc, [a, b]) => {
        const laatste = acc[acc.length - 1];
        if (laatste && a <= laatste[1] + 1) laatste[1] = Math.max(laatste[1], b); else acc.push([a, b]);
        return acc;
      }, []);
      const punten = new Set<number>(gevelStukken.flatMap(([a, b]) => [r1(a), r1(b)]));
      for (const o of p.openingen) {
        const m = muren.find((x) => muurVanOpening(o, [x]) === x);
        if (!m) continue;
        punten.add(r1(pu(m, o.midden - o.breedte / 2)));
        punten.add(r1(pu(m, o.midden + o.breedte / 2)));
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
    for (let n = 0; n < niveaus; n++) {
      if (!segmentenPerNiveau[n]?.length) continue;
      // Onder een hellend dak: tot de dakvoet (bovenkant muur) en dan tot de nok.
      if (hellend && dak && n === dak.top) hoogtes.push(vloerHoogte(plan, n) + H, vloerHoogte(plan, n) + H + Math.round(hellend.top));
      else hoogtes.push(vloerHoogte(plan, n) + H + VLOERDIKTE);
    }
    for (let i = 0; i + 1 < hoogtes.length; i++) {
      maatlijnen.push({ code: `hoogte.${i}`, x1: r1(umax), y1: sy(hoogtes[i + 1]!), x2: r1(umax), y2: sy(hoogtes[i]!), afstand: 70, tekst: `${Math.round(hoogtes[i + 1]! - hoogtes[i]!)}` });
    }

    const voordeurHier = schuin && plan.openingen.some((o) => niveauVan(o) === 0 && info(o)?.voordeur && murenVan(niveauPlan(plan, 0)).some((m) => kies(m) && muurVanOpening(o, [m]) === m));
    const rol = schuin ? (voordeurHier ? 'Voorgevel' : 'Schuine gevel')
      : voordeurKant === kant ? 'Voorgevel' : voordeurKant && tegenover[voordeurKant] === kant ? 'Achtergevel' : voordeurKant ? 'Zijgevel' : 'Gevel';
    const naam = schuin ? `${rol} (${voordeurHier ? 'schuin, ' : ''}kijkt naar ${richtingNaam(schuin.kijkt)})`
      : `${rol} (${kant === 'boven' ? 'bovenkant' : kant === 'onder' ? 'onderkant' : kant === 'links' ? 'linkerkant' : 'rechterkant'} van het plan)`;
    return {
      kant, naam, tekening: { titel: `${naam} · cm`, eenheid: 'cm', vormen, maatlijnen }, vlakken,
      naarU: nu, vanU: vu, naarY: sy, vanY: (y) => top - y,
      ...(schuin ? { schuin } : {}),
    };
  };
  for (const kant of ['boven', 'onder', 'links', 'rechts'] as GevelKant[]) {
    const as = kant === 'boven' || kant === 'onder' ? 'h' : 'v';
    const g = maak(kant, (m) => m.soort === 'buiten' && ((m.as === as && (kant === 'boven' || kant === 'links' ? !m.min : !m.plus)) || (m.as === 's' && buitenKant(m) === kant)), naarU[kant], vanU[kant]);
    if (g) uit.push(g);
  }
  // Schuine gevels: per richting waarin ze kijken een eigen aanzicht, recht ervoor bekeken (na de vier kanten).
  const groepen = new Map<number, Muur[]>();
  for (let n = 0; n < (opties.schuin ? niveaus : 0); n++) {
    for (const m of murenVan(niveauPlan(plan, n))) {
      const k = m.as === 's' ? buitenRichting(m) : undefined;
      if (k === undefined) continue;
      const sleutel = Math.round(k * 10);
      groepen.set(sleutel, [...(groepen.get(sleutel) ?? []), m]);
    }
  }
  for (const [sleutel, muren] of groepen) {
    const kijkt = sleutel / 10, a = (kijkt * Math.PI) / 180;
    // Van buiten bekeken: je kijkt tegen de richting in; rechts van je ligt (o.y, −o.x) met o = (sin, −cos) de richting.
    const rechts: [number, number] = [-Math.cos(a), -Math.sin(a)];
    const d = asVan(muren[0]!).d, zin = d[0] * rechts[0] + d[1] * rechts[1] > 0 ? 1 : -1;
    const s0 = Math.min(...muren.flatMap((m) => uiterst(m, murenVan(niveauPlan(plan, niveauVanMuur(plan, m)))).map((x) => zin * x)));
    const kies = (m: Muur) => m.as === 's' && m.soort === 'buiten' && Math.round((buitenRichting(m) ?? -1) * 10) === sleutel;
    const g = maak(buitenKant(muren[0]!)!, kies, (v) => zin * v - s0, (u) => zin * (u + s0), { kijkt });
    if (g) uit.push(g);
  }
  return uit;
}

/** Aan welke kant van de woning zit een opening in een buitenmuur? */
export function kantVan(plan: Plattegrond, o: Opening): GevelKant | undefined {
  const m = muurVanOpening(o, murenVan(niveauPlan(plan, niveauVan(o))));
  if (!m || m.soort !== 'buiten') return undefined;
  if (m.as === 's') return buitenKant(m);
  if (m.as === 'h') return m.min ? 'onder' : 'boven';
  return m.min ? 'rechts' : 'links';
}

/** Oppervlakte van één muurvlak aan de buitenkant (m², netto = zonder ramen en deuren). */
export interface GevelOppervlak {
  sleutel: string;
  niveau: number;
  kant: GevelKant;
  keuze?: GevelKeuze;
  /** Lengte van de buitenkant (m). */
  lengte: number;
  /** Netto m² boven de sokkel (op een verdieping inclusief de rand van de vloerplaat). */
  netto: number;
  /** Netto m² sokkel (alleen gelijkvloers). */
  sokkel: number;
  /**
   * Het deel van `netto` boven de dakvoet, onder een hellend dak (m²): de topgevel, of de hoge gevel van een
   * lessenaarsdak. Ontbreekt zonder hellend dak.
   */
  topgevel?: number;
  /** Een schuine gevel: waar ze naar kijkt (graden met de klok mee vanaf de bovenkant van het plan); `kant` is de dichtste. */
  kijkt?: number;
}

/**
 * Lengte van de buitenkant van een buitenmuur: de as, plus een halve muurdikte op een buitenhoek
 * en min een halve muurdikte op een binnenhoek (L-vorm).
 */
function buitenLengte(m: Muur, muren: Muur[]): number {
  let l = m.tot - m.van;
  const binnen = m.plus ? 1 : -1; // richting van de ruimte, dwars op de muur
  for (const p of [m.van, m.tot]) {
    const v = muren.find((x) => x.as !== m.as && x.as !== 's' && x.soort === 'buiten' && Math.abs(x.lijn - p) < 0.5 && (Math.abs(x.van - m.lijn) < 0.5 || Math.abs(x.tot - m.lijn) < 0.5));
    if (!v) continue;
    const richting = Math.abs(v.van - m.lijn) < 0.5 ? 1 : -1;
    l += (richting === binnen ? 1 : -1) * (v.dikte / 2);
  }
  return l;
}

/** Oppervlaktes van alle buitenmuurvlakken, per verdieping, voor de offerte en het overzicht in de gevel-editor. */
export function gevelOppervlaktes(plan: Plattegrond): GevelOppervlak[] {
  const uit: GevelOppervlak[] = [];
  const H = plan.muurhoogte;
  const sokkelH = plan.gevelOntwerp?.sokkel?.hoogte ?? 0;
  const dak = dakOpbouw(plan);
  verdiepingenVan(plan).forEach((_, n) => {
    const p = niveauPlan(plan, n);
    const muren = murenVan(p);
    const hellend = dak?.hellend && n === dak.top ? dak.hellend : undefined;
    for (const m of muren) {
      const kant = buitenKant(m);
      if (!kant) continue;
      // Een schuine muur: de lengte van haar buitenvlak, van hoek tot hoek.
      const lengte = m.as === 's' ? (([a, b]) => b - a)(uiterst(m, muren)) : buitenLengte(m, muren);
      // Onder een hellend dak loopt de gevel door tot tegen het dak (cm²).
      let top = 0;
      if (hellend && (m.as === 'h') !== (hellend.nokAs === 'x')) {
        // Topgevel: van buitenhoek tot buitenhoek, tot onder het schuine dak.
        const hoek = (q: number) => muren.some((x) => x.as !== m.as && x.as !== 's' && x.soort === 'buiten' && Math.abs(x.lijn - q) < 0.5 && (Math.abs(x.van - m.lijn) < 0.5 || Math.abs(x.tot - m.lijn) < 0.5));
        top = oppervlakOnderDak(hellend, m.van - (hoek(m.van) ? m.dikte / 2 : 0), m.tot + (hoek(m.tot) ? m.dikte / 2 : 0));
      } else if (hellend) {
        // Muur langs de nok: alleen de hoge gevel van een lessenaar komt boven de dakvoet uit.
        top = lengte * Math.max(0, dakHoogte(hellend, m.lijn + (m.plus ? -1 : 1) * (m.dikte / 2)));
      }
      const h = H + (n > 0 ? VLOERDIKTE : 0);
      const sh = n === 0 ? Math.min(sokkelH, h) : 0;
      let open = 0, openSokkel = 0;
      for (const o of p.openingen.filter((x) => muurVanOpening(x, [m]) === m)) {
        open += o.breedte * o.hoogte;
        openSokkel += o.breedte * Math.max(0, Math.min(sh, o.borstwering + o.hoogte) - o.borstwering);
      }
      const bruto = lengte * h, sokkelBruto = lengte * sh;
      uit.push({
        sleutel: vlakSleutel(m), niveau: n, kant, keuze: gevelKeuzeVan(plan, m), lengte: lengte / 100,
        netto: Math.max(0, bruto + top - sokkelBruto - (open - openSokkel)) / 10000,
        sokkel: Math.max(0, sokkelBruto - openSokkel) / 10000,
        ...(top > 0 ? { topgevel: top / 10000 } : {}),
        ...(m.as === 's' ? { kijkt: buitenRichting(m) } : {}),
      });
    }
  });
  return uit;
}
