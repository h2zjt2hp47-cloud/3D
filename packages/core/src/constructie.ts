/**
 * De woning als constructie (ronde 6): uit het plan en de opbouw per wand, vloer en dak (`Plattegrond.opbouw`, met de
 * standaarden van de catalogus `PlanCatalogus.opbouw`) de bouwdelen van bouwdelen.ts op hun plaats in de woning. Eén
 * lijst (`woningConstructie`) voedt alles:
 *   - de constructieweergave in 3D (`constructie3D`): wanden als skelet met hun openingen, vloeren als balklaag met het
 *     trapgat uitgespaard, het dak als balklaag of als kepers (zadeldak: twee dakvlakken), met de lagen als staal;
 *   - de meetstaat van de hele woning (`woningMeetstaat`);
 *   - de aanwijzing voor EPB per gekozen opbouw (`woningWarmte`);
 *   - de schatting van de stabiliteit per balklaag, dak en latei (`woningStabiliteit`);
 *   - de doorsnede (doorsnede.ts).
 *
 * **Een voorstelling, geen berekening**: de opbouwen zijn voorbeelden die geen vakman nalas, de afstanden en
 * doorsneden zijn regels van goed vakmanschap, en de aanwijzing en de schatting zeggen dat zelf (warmte.ts,
 * stabiliteit.ts). Toon dat bij elke uitkomst.
 *
 * Afspraken (eigen keuzes, zie ook de skill `bouw-woning`):
 *   - De afgewerkte weergave (`plattegrond3D`) leest de opbouw niet en verandert niet.
 *   - Een muur staat op de as van het plan, met de dikte van haar opbouw (niet die van het plan): een houtskeletwand van
 *     26 cm in een plan met muren van 30 cm is aan elke kant 2 cm dunner. De hoeken sluiten met de dikte van de opbouw.
 *   - Verticaal: de verdiepingen staan op dezelfde hoogte als in de afgewerkte weergave (vloerpeil n × (muurhoogte + 30)).
 *     Een vloer ligt met haar bovenkant op het vloerpeil; de muren eronder lopen tot onder die vloer. Een plat dak ligt op
 *     de muren, een hellend dak gaat met zijn onderkant door de buitenkant van de muurkop, zoals in dak.ts.
 *   - Een vloer tussen twee verdiepingen ligt per ruimte eronder (daar liggen de balken op de muren), waar er een
 *     verdieping boven ligt. Een vloer of dak loopt aan een buitenmuur door tot de buitenkant van het skelet.
 *   - Zonder dakkeuze krijgt de constructie een plat dak (zoals de lichtinval): anders zou de meetstaat geen dak tellen.
 *   - Wat (nog) niet als bouwdeel kan, staat er als effen plaat en telt niet mee: een vloer of dak van een vrije vorm.
 *     De topgevel onder een hellend dak, de dakrand en de ramen en deuren zelf zitten niet in de constructie.
 *
 * Maten in cm (zoals de plattegrond); de opbouw zelf in mm.
 */
import {
  bouwdeelBlokken, bouwdeelOpPlaats, dakvlak, meetstaat, vloervlak, wandvlak,
  type Bouwdeel, type MeetstaatRegel, type Stuk, type VlakRechthoek, type WandOpening,
} from './bouwdelen.js';
import { dakHoogte, daklichtBlokken, hellendDak, prisma, type HellendDak } from './dak.js';
import { totaleDikte, type Opbouw, type OpbouwPlaats, type WoningOpbouwCatalogus } from './opbouw.js';
import {
  asVan, binnenVeelhoek, buitenKant, dakOpbouw, dakVan, delenVan, draaiBlokken, gevelAfwerking, gevelKeuzeVan, grondPrisma, meubelIn3D,
  meubelVoetafdruk, murenVan, muurVanOpening, muurVlak, niveauPlan, niveauVan, plattegrond3D, snijVeelhoek, standaardDak, trekAf,
  verdiepingenVan, vlakSleutel, vloerHoogte, vormVanDeel, VLOERDIKTE,
  type Deel, type Muur, type PlanCatalogus, type Plattegrond, type Punt, type Rechthoek,
} from './plattegrond.js';
import { kaderVan, type Blok, type BlokSoort, type Scene3D } from './ruimtelijk.js';
import { schatBouwdeel, type BouwdeelSchatting, type BouwdeelSchattingOpties, type LastSoort, type StabiliteitsWaarden } from './stabiliteit.js';
import { uWaarde, type WarmteUitkomst, type WarmteWaarden } from './warmte.js';

/** De vaste zin bij de constructieweergave en de doorsnede. */
export const CONSTRUCTIE_VOORBEHOUD = 'Voorstelling, geen berekening: de opbouwen zijn voorbeelden die geen vakman nalas, en de stijlen, balken en kepers volgen regels van goed vakmanschap. De vakman en de ingenieur rekenen zelf.';

const r2 = (x: number) => Math.round(x * 100) / 100 + 0;
const GRAAD = 180 / Math.PI;
const EPS = 0.01;

/** Een bouwdeel op zijn plaats in de woning. */
export interface ConstructieDeel {
  /** Uniek in de woning; het voorvoegsel van zijn blokken in de 3D. */
  code: string;
  plaats: OpbouwPlaats;
  /** Code van de opbouw in de catalogus. */
  opbouw: string;
  /** Verdieping: van de muur, van de vloer (de verdieping erboven) of van het dak (de verdieping eronder). */
  niveau: number;
  /** In gewone taal, bv. "Buitenmuur Inkom, bovenkant (gelijkvloers)". */
  wat: string;
  deel: Bouwdeel;
  /**
   * Waar het bouwdeel staat: de minimumhoek ná de draaiing (cm) en de draaiing per kwartslag; `hoek` = daarna nog
   * gedraaid rond de oorsprong van het plan (een schuine muur: gebouwd als staande muur op dezelfde lijn).
   */
  zet: { x: number; y: number; z: number; draai: 0 | 90 | 180 | 270; hoek?: number };
  /** Ding voor het aantikken in de 3D (`gevel:<vlak>`, `ruimte:<id>`, `dak`). */
  ding?: string;
  /** Wand: de muur (met de dikte van de opbouw), begin en einde langs haar as, aan welke kant buiten ligt, en de hoogte. */
  muur?: { muur: Muur; begin: number; einde: number; buitenMin: boolean; hoogte: number };
  /** Vloer of plat dak: de rechthoek op het plan (cm) en de richting van de balken op het plan. */
  vlak?: Rechthoek & { balken: 'x' | 'y' };
  /** Hellend dak: de meetkunde van het dak, de dakvoet (plaats dwars op de nok) en naar waar het dakvlak stijgt. */
  dakvlak?: { dak: HellendDak; voet: number; naar: 1 | -1 };
  /** Wat er op een wand rust (voor de lateien), afgeleid uit de vloeren en daken die erop liggen. */
  opWand?: BouwdeelSchattingOpties['opWand'];
  /** Hoort bij het hellende dak (de topgevel): alleen getoond als het dak getoond wordt. */
  onderDak?: boolean;
}

/** Een effen stuk in de constructieweergave dat geen bouwdeel is (en dus niet in de meetstaat zit). */
export interface ConstructieStuk {
  niveau: number;
  /** `vloer`, `dak` of `trap`: om te weten wanneer het getoond wordt. */
  soort: 'vloer' | 'dak' | 'trap';
  blokken: Blok[];
}

export interface WoningConstructie {
  delen: ConstructieDeel[];
  stukken: ConstructieStuk[];
  /** Wat er aangepast of weggelaten is, in gewone taal. */
  meldingen: string[];
  /** Het hellende dak zoals de constructie het tekent (met de dikte van de buitenwand), en de hoogte van de dakvoet. */
  hellend?: { dak: HellendDak; y: number };
  /** Bovenste verdieping met ruimtes. */
  top: number;
}

/** De plaatsen in gewone taal (enkelvoud, voor een regel in een lijst). */
const PLAATS_NAAM: Record<OpbouwPlaats, string> = {
  buitenwand: 'Buitenmuur', binnenwand: 'Binnenmuur', grondvloer: 'Vloer op de grond', verdiepingsvloer: 'Vloer', platDak: 'Plat dak', hellendDak: 'Hellend dak',
};
const KANT_NAAM = { boven: 'bovenkant', onder: 'onderkant', links: 'linkerkant', rechts: 'rechterkant' } as const;

/** Is de code een opbouw in de catalogus die op deze plaats kan? */
const geldig = (oc: WoningOpbouwCatalogus, plaats: OpbouwPlaats, code: string | undefined): code is string =>
  !!code && !!oc.opbouwen[code] && (oc.plaatsen[plaats]?.keuzes ?? []).includes(code);

/**
 * De opbouw voor een plaats in de woning: een afwijking voor dit muurvlak of deze ruimte, anders de keuze voor de hele
 * woning, anders (buitenwand) die volgens de gevel, anders de standaard van de catalogus. Geeft de code.
 */
export function opbouwVoor(plan: Plattegrond, oc: WoningOpbouwCatalogus, plaats: OpbouwPlaats, waar: { vlak?: string; ruimte?: string; gevel?: BlokSoort } = {}): string {
  const o = plan.opbouw;
  if (plaats === 'buitenwand' && waar.vlak && geldig(oc, plaats, o?.vlakken?.[waar.vlak])) return o!.vlakken![waar.vlak]!;
  if ((plaats === 'grondvloer' || plaats === 'verdiepingsvloer') && waar.ruimte && geldig(oc, plaats, o?.vloeren?.[waar.ruimte])) return o!.vloeren![waar.ruimte]!;
  if (geldig(oc, plaats, o?.[plaats])) return o![plaats]!;
  if (plaats === 'buitenwand' && waar.gevel && geldig(oc, plaats, oc.volgensGevel?.[waar.gevel])) return oc.volgensGevel![waar.gevel]!;
  return oc.plaatsen[plaats].standaard;
}

/** Ligt het punt (x, y) binnen een van de delen (rechthoek of vrije vorm)? */
function binnenDelen(delen: Deel[], x: number, y: number): boolean {
  return delen.some((q) => (q.omtrek ? binnenVeelhoek(vormVanDeel(q), x, y) : x > q.x + EPS && x < q.x + q.b - EPS && y > q.y + EPS && y < q.y + q.d - EPS));
}

/**
 * Een vloer- of dakvlak op de as van de muren, aan de kanten waar een buitenmuur ligt (buiten het vlak ligt geen ruimte
 * van die verdieping) verlengd tot de buitenkant van het skelet: een halve muurdikte.
 */
function totBuitenkant(f: Rechthoek, delen: Deel[], half: number): Rechthoek {
  const buiten = (x: number, y: number) => !binnenDelen(delen, x, y);
  const l = buiten(f.x - 1, f.y + f.d / 2) ? half : 0, r = buiten(f.x + f.b + 1, f.y + f.d / 2) ? half : 0;
  const o = buiten(f.x + f.b / 2, f.y - 1) ? half : 0, a = buiten(f.x + f.b / 2, f.y + f.d + 1) ? half : 0;
  return { x: r2(f.x - l), y: r2(f.y - o), b: r2(f.b + l + r), d: r2(f.d + o + a) };
}

/** De gaten in een vlak (in zijn eigen assen: u langs x, v langs plan-y), uit rechthoeken op het plan. */
function gatenIn(f: Rechthoek, gaten: Rechthoek[]): VlakRechthoek[] {
  return gaten.flatMap((g) => {
    const u0 = Math.max(g.x, f.x), u1 = Math.min(g.x + g.b, f.x + f.b), v0 = Math.max(g.y, f.y), v1 = Math.min(g.y + g.d, f.y + f.d);
    return u1 - u0 > 1 && v1 - v0 > 1 ? [{ u0: r2(u0 - f.x), u1: r2(u1 - f.x), v0: r2(v0 - f.y), v1: r2(v1 - f.y) }] : [];
  });
}

/** Snijpunt van twee rechthoeken (of niets). */
function snij(a: Rechthoek, b: Rechthoek): Rechthoek | undefined {
  const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.b, b.x + b.b), y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.d, b.y + b.d);
  return x1 - x0 > EPS && y1 - y0 > EPS ? { x: x0, y: y0, b: x1 - x0, d: y1 - y0 } : undefined;
}

/**
 * De hele woning als constructie: elke wand, vloer en elk dak als bouwdeel op zijn plaats, met wat erop rust. Zonder
 * opbouwcatalogus (`cat.opbouw`) een lege lijst met een melding. Voor alle verdiepingen, ook wat de 3D verbergt (de
 * meetstaat telt de hele woning); `constructie3D` kiest wat getoond wordt.
 */
export function woningConstructie(plan: Plattegrond, cat: PlanCatalogus): WoningConstructie {
  const oc = cat.opbouw;
  const uit: WoningConstructie = { delen: [], stukken: [], meldingen: [], top: 0 };
  if (!oc) { uit.meldingen.push('Er is geen catalogus met opbouwen: de constructie kan niet getekend worden.'); return uit; }
  if (!plan.ruimtes.length) return uit;
  const H = plan.muurhoogte;
  const top = (uit.top = Math.max(...plan.ruimtes.map(niveauVan)));
  const namen = verdiepingenVan(plan);
  const verdieping = (n: number) => (namen[n]?.naam ?? `verdieping ${n}`).toLowerCase();
  const opbouw = (code: string): Opbouw => oc.opbouwen[code]!;
  const dikte = (code: string) => r2(totaleDikte(opbouw(code)) / 10);
  const ruimteNaam = new Map(plan.ruimtes.map((r) => [r.id, r.naam]));
  // De muren onder een verdieping lopen tot onder de vloer erboven (de vloer van de hele woning).
  const dVloer = dikte(opbouwVoor(plan, oc, 'verdiepingsvloer'));
  const wandHoogte = (n: number) => (n < top ? r2(vloerHoogte(plan, n + 1) - dVloer - vloerHoogte(plan, n)) : H);

  // Wat op welke muur rust: de lijnen waarop balken en kepers liggen.
  interface Steun { niveau: number; as: 'h' | 'v'; lijn: number; van: number; tot: number; draagt: LastSoort; breedte: number; helling?: number }
  const steunen: Steun[] = [];
  const balkSteunen = (f: Rechthoek, balken: 'x' | 'y', niveau: number, draagt: LastSoort) => {
    // Balken langs x liggen op de staande lijnen aan hun uiteinden; langs y op de liggende.
    if (balken === 'x') for (const lijn of [f.x, f.x + f.b]) steunen.push({ niveau, as: 'v', lijn, van: f.y, tot: f.y + f.d, draagt, breedte: f.b / 2 });
    else for (const lijn of [f.y, f.y + f.d]) steunen.push({ niveau, as: 'h', lijn, van: f.x, tot: f.x + f.b, draagt, breedte: f.d / 2 });
  };

  // ---------- wanden ----------
  const buitenDikte: number[] = [];
  for (let n = 0; n <= top; n++) {
    const p = niveauPlan(plan, n);
    if (!p.ruimtes.length) continue;
    const y0 = vloerHoogte(plan, n), h = wandHoogte(n);
    // De muren met de dikte van hun opbouw, zodat de hoeken met die dikte sluiten (`muurVlak` leest de buren).
    const muren = murenVan(p).map((m) => ({ ...m }));
    const keuze = new Map<Muur, string>();
    for (const m of muren) {
      const code = m.soort === 'buiten'
        ? opbouwVoor(plan, oc, 'buitenwand', { vlak: vlakSleutel(m), gevel: gevelAfwerking(plan, cat, gevelKeuzeVan(plan, m)).soort })
        : opbouwVoor(plan, oc, 'binnenwand');
      keuze.set(m, code);
      m.dikte = dikte(code) || m.dikte;
      if (m.soort === 'buiten' && n === top) buitenDikte.push(m.dikte);
    }
    for (const m of muren) {
      const code = keuze.get(m)!, T = m.dikte;
      const vlak = muurVlak(m, muren);
      // Een schuine muur van hoek tot hoek op haar as (het verstek in de hoeken volgt de afgewerkte weergave niet).
      const [begin, einde] = m.as === 's' ? [m.van, m.tot] : m.as === 'h' ? [vlak.x, vlak.x + vlak.b] : [vlak.y, vlak.y + vlak.d];
      if (einde - begin < 1) continue;
      const buitenMin = m.soort === 'buiten' && !m.min;
      // Lokaal x van een wand loopt van links naar rechts gezien van binnen (zoals een raam): met of tegen de as van het plan.
      const mee = m.as === 'h' ? buitenMin : !buitenMin;
      const openingen: WandOpening[] = p.openingen.filter((o) => muurVanOpening(o, [m]) === m).map((o) => {
        const a = o.midden - o.breedte / 2, b = o.midden + o.breedte / 2, deur = o.borstwering < 1;
        return { soort: deur ? 'deur' : 'raam', x: r2(mee ? a - begin : einde - b), breedte: o.breedte, hoogte: o.hoogte, ...(deur ? {} : { borstwering: o.borstwering }) };
      });
      const deel = wandvlak({ lengte: r2(einde - begin), hoogte: h, opbouw: opbouw(code), openingen }, oc.materialen);
      const ruimte = ruimteNaam.get(m.plus ?? m.min ?? '') ?? '';
      const kant = buitenKant(m);
      const wat = m.soort === 'buiten'
        ? `Buitenmuur ${ruimte}${m.as === 's' ? ', schuine muur' : kant ? `, ${KANT_NAAM[kant]}` : ''} (${verdieping(n)})`
        : `Binnenmuur ${[ruimteNaam.get(m.min ?? ''), ruimteNaam.get(m.plus ?? '')].filter(Boolean).join(' – ')} (${verdieping(n)})`;
      for (const x of deel.meldingen) uit.meldingen.push(`${wat}: ${x}`);
      const draai = m.as === 'h' ? (buitenMin ? 0 : 180) : buitenMin ? 270 : 90;
      const zet = m.as === 'h'
        ? { x: begin, y: y0, z: r2(m.lijn - T / 2), draai } as const
        : { x: r2(m.lijn - T / 2), y: y0, z: begin, draai, ...(m.as === 's' ? { hoek: (() => { const nn = asVan(m).n; return Math.atan2(nn[1], nn[0]) * GRAAD; })() } : {}) } as const;
      uit.delen.push({
        code: `wand_${n}_${m.id.replace(/\./g, ',')}`, plaats: m.soort === 'buiten' ? 'buitenwand' : 'binnenwand', opbouw: code, niveau: n, wat, deel,
        zet: { ...zet }, ...(m.soort === 'buiten' ? { ding: `gevel:${vlakSleutel(m)}` } : {}),
        muur: { muur: m, begin, einde, buitenMin, hoogte: h },
      });
    }
  }
  const halfBuiten = (buitenDikte.length ? Math.max(...buitenDikte) : plan.buitenmuur) / 2;

  // ---------- vloeren ----------
  const vrijeVormPlaat = (v: Punt[], y: number, d: number, niveau: number, soort: 'vloer' | 'dak', code: string) => {
    uit.stukken.push({ niveau, soort, blokken: [grondPrisma(code, 'gevel', '#c9c6bf', v, y, d)] });
  };
  for (let n = 0; n <= top; n++) {
    const p = niveauPlan(plan, n);
    const delen = p.ruimtes.flatMap(delenVan);
    if (n === 0) {
      // Vloer op de grond: per ruimte, met de bovenkant op het vloerpeil.
      for (const r of p.ruimtes) for (const [i, q] of delenVan(r).entries()) {
        const code = opbouwVoor(plan, oc, 'grondvloer', { ruimte: r.id }), d = dikte(code);
        if (q.omtrek) {
          vrijeVormPlaat(vormVanDeel(q), -d, d, 0, 'vloer', `grondvloer_${r.id}_${i}`);
          uit.meldingen.push(`Vloer van ${r.naam}: een vrije vorm staat er als effen plaat (niet in de meetstaat).`);
          continue;
        }
        const f = totBuitenkant(q, delen, halfBuiten);
        const deel = vloervlak({ lengte: f.b, breedte: f.d, opbouw: opbouw(code) }, oc.materialen);
        uit.delen.push({
          code: `grondvloer_${r.id}_${i}`, plaats: 'grondvloer', opbouw: code, niveau: 0, wat: `Vloer op de grond ${r.naam}`, deel,
          zet: { x: f.x, y: -d, z: f.y, draai: 0 }, ding: `ruimte:${r.id}`, vlak: { ...f, balken: deel.vlak?.richting === 'z' ? 'y' : 'x' },
        });
      }
      continue;
    }
    // Vloer tussen n − 1 en n: per ruimte eronder, waar er een ruimte boven ligt.
    const onder = niveauPlan(plan, n - 1);
    const onderDelen = onder.ruimtes.flatMap(delenVan);
    const trapgaten = plan.meubels.filter((m) => m.type === 'trap' && niveauVan(m) === n - 1).map(meubelVoetafdruk);
    const vrijBoven = delen.some((q) => q.omtrek);
    for (const r of onder.ruimtes) for (const [i, q] of delenVan(r).entries()) {
      if (q.omtrek || vrijBoven) {
        // Een vrije vorm (hier of erboven): een effen plaat waar ze elkaar overlappen.
        for (const [j, u] of delen.entries()) {
          const v = snijVeelhoek(vormVanDeel(q), vormVanDeel(u));
          if (v.length >= 3) vrijeVormPlaat(v, vloerHoogte(plan, n) - VLOERDIKTE, VLOERDIKTE, n, 'vloer', `vloer_${n}_${r.id}_${i}_${j}`);
        }
        uit.meldingen.push(`Vloer boven ${r.naam}: een vrije vorm staat er als effen plaat (niet in de meetstaat).`);
        continue;
      }
      const vrij = delen.reduce<Rechthoek[]>((st, u) => st.flatMap((s) => trekAf(s, u)), [q]);
      const bedekt = vrij.reduce<Rechthoek[]>((st, v) => st.flatMap((s) => trekAf(s, v)), [q]).filter((s) => s.b > 1 && s.d > 1);
      for (const [j, s] of bedekt.entries()) {
        const midden: [number, number] = [s.x + s.b / 2, s.y + s.d / 2];
        const boven = p.ruimtes.find((x) => binnenDelen(delenVan(x), midden[0], midden[1]));
        const code = opbouwVoor(plan, oc, 'verdiepingsvloer', { ruimte: boven?.id }), d = dikte(code);
        const f = totBuitenkant(s, onderDelen, halfBuiten);
        const deel = vloervlak({ lengte: f.b, breedte: f.d, opbouw: opbouw(code), openingen: gatenIn(f, trapgaten) }, oc.materialen);
        const wat = `Vloer van ${boven?.naam ?? verdieping(n)} boven ${r.naam}`;
        for (const x of deel.meldingen) uit.meldingen.push(`${wat}: ${x}`);
        const balken = deel.vlak?.richting === 'z' ? 'y' : 'x';
        uit.delen.push({
          code: `vloer_${n}_${r.id}_${i}_${j}`, plaats: 'verdiepingsvloer', opbouw: code, niveau: n, wat, deel,
          zet: { x: f.x, y: r2(vloerHoogte(plan, n) - d), z: f.y, draai: 0 }, ...(boven ? { ding: `ruimte:${boven.id}` } : {}), vlak: { ...f, balken },
        });
        balkSteunen(s, balken, n - 1, 'vloer_woning');
      }
    }
    // De trap zelf (geen bouwdeel): zoals in de afgewerkte weergave.
    const t = cat.meubels.trap;
    for (const m of plan.meubels.filter((x) => x.type === 'trap' && niveauVan(x) === n - 1)) {
      if (!t) continue;
      const y = vloerHoogte(plan, n - 1);
      uit.stukken.push({ niveau: n - 1, soort: 'trap', blokken: meubelIn3D(m, { ...t, h: H + VLOERDIKTE }).map((b) => ({ ...b, code: `trap_${b.code}`, y: r2(b.y + y + 1.5) })) });
    }
  }

  // ---------- daken ----------
  const planMetDak = dakVan(plan) ? plan : { ...plan, dak: standaardDak() };
  const dak = dakOpbouw(planMetDak);
  if (dak) {
    const lichten = dak.daklichten.filter((l) => !l.reden);
    for (const [i, s] of dak.plat.entries()) {
      const n = s.niveau, y = r2(vloerHoogte(plan, n) + wandHoogte(n));
      const code = opbouwVoor(plan, oc, 'platDak'), d = dikte(code);
      const naam = ruimteNaam.get(s.ruimte) ?? '';
      if (s.omtrek) {
        vrijeVormPlaat(vormVanDeel(s), y, d, n, 'dak', `dak_${n}_${i}`);
        uit.meldingen.push(`Dak boven ${naam}: een vrije vorm staat er als effen plaat (niet in de meetstaat).`);
        continue;
      }
      const delen = niveauPlan(plan, n).ruimtes.flatMap(delenVan);
      const f = totBuitenkant(s, delen, halfBuiten);
      const hier = lichten.filter((l) => niveauVan(l.licht) === n && snij(l.licht, s));
      const deel = dakvlak({ lengte: f.b, diepte: f.d, opbouw: opbouw(code), openingen: gatenIn(f, hier.map((l) => l.licht)) }, oc.materialen);
      const wat = `Plat dak boven ${naam} (${verdieping(n)})`;
      for (const x of deel.meldingen) uit.meldingen.push(`${wat}: ${x}`);
      const balken = deel.vlak?.richting === 'z' ? 'y' : 'x';
      uit.delen.push({
        code: `dak_${n}_${i}`, plaats: 'platDak', opbouw: code, niveau: n, wat, deel, zet: { x: f.x, y, z: f.y, draai: 0 }, ding: 'dak', vlak: { ...f, balken },
      });
      balkSteunen(s, balken, n, 'plat_dak');
      for (const l of hier) {
        const blokken = daklichtBlokken(l.licht, cat.daklichten?.[l.licht.type]?.vorm ?? 'koepel', r2(y + d), d).map((b) => ({ ...b, code: `dak_${n}_${i}_${b.code}` }));
        uit.stukken.push({ niveau: n, soort: 'dak', blokken });
      }
    }
    if (dak.hellend) {
      // Het hellende dak opnieuw, op de buitenkant van de muren met de dikte van hun opbouw.
      const delen = niveauPlan(plan, top).ruimtes.flatMap(delenVan);
      const x0 = Math.min(...delen.map((q) => q.x)), y0 = Math.min(...delen.map((q) => q.y));
      const x1 = Math.max(...delen.map((q) => q.x + q.b)), y1 = Math.max(...delen.map((q) => q.y + q.d));
      const t = halfBuiten;
      const d = hellendDak({ x: x0 - t, y: y0 - t, b: x1 - x0 + 2 * t, d: y1 - y0 + 2 * t }, dak.keuze);
      const yb = r2(vloerHoogte(plan, top) + H);
      uit.hellend = { dak: d, y: yb };
      const code = opbouwVoor(plan, oc, 'hellendDak');
      const ov = d.oversteek, lengte = r2(d.q1 - d.q0 + 2 * ov), y = r2(yb - ov * d.tan);
      // Zadeldak: twee dakvlakken van de dakvoet tot de nok; lessenaar: één van de lage naar de hoge kant.
      const vlakken: { voet: number; naar: 1 | -1; diepte: number }[] = d.vorm === 'zadel'
        ? [{ voet: d.p0, naar: 1, diepte: d.nokP - d.p0 + ov }, { voet: d.p1, naar: -1, diepte: d.p1 - d.nokP + ov }]
        : [{ voet: d.voetP, naar: d.voetP === d.p0 ? 1 : -1, diepte: d.p1 - d.p0 + 2 * ov }];
      vlakken.forEach((v, i) => {
        const deel = dakvlak({ lengte, diepte: r2(v.diepte), helling: d.helling, opbouw: opbouw(code) }, oc.materialen);
        // De minimumhoek ná de draaiing: de dakvoet (met oversteek) of de nok, en het begin langs de nok.
        const p = r2(v.naar === 1 ? v.voet - ov : v.voet + ov - v.diepte), q = r2(d.q0 - ov);
        const zet = d.nokAs === 'x'
          ? { x: q, y, z: p, draai: v.naar === 1 ? 0 : 180 } as const
          : { x: p, y, z: q, draai: v.naar === 1 ? 270 : 90 } as const;
        uit.delen.push({
          code: `hellend_${i}`, plaats: 'hellendDak', opbouw: code, niveau: top, wat: d.vorm === 'zadel' ? `Hellend dak, ${i ? 'tweede' : 'eerste'} dakvlak` : 'Hellend dak (lessenaar)',
          deel, zet: { ...zet }, ding: 'dak', dakvlak: { dak: d, voet: v.voet, naar: v.naar },
        });
      });
      // De kepers liggen op de muren langs de nok (de dakvoet en, bij een lessenaar, de hoge kant).
      const as = d.nokAs === 'x' ? 'h' : 'v';
      const breedte = (d.vorm === 'zadel' ? (d.nokP - d.p0) / 2 : (d.p1 - d.p0) / 2) + ov;
      for (const lijn of [d.p0 + t, d.p1 - t]) steunen.push({ niveau: top, as, lijn, van: d.q0, tot: d.q1, draagt: 'hellend_dak', breedte, helling: d.helling });
      // De topgevel (en de hoge muur van een lessenaar): het stuk muur tussen de muurkop en het dak.
      for (const w of [...uit.delen]) {
        if (w.plaats !== 'buitenwand' || w.niveau !== top || !w.muur || w.muur.muur.as === 's') continue;
        const g = topgevel(w, d, oc.materialen[w.deel.lagen[w.deel.dragend]?.materiaal ?? '']);
        if (g) uit.delen.push(g);
      }
    }
  }

  // ---------- wat op een wand rust ----------
  for (const c of uit.delen) {
    const m = c.muur?.muur;
    if (!m || m.as === 's' || !c.deel.stukken.some((s) => s.rol === 'latei')) continue;
    const hier = steunen.filter((s) => s.niveau === c.niveau && s.as === m.as && Math.abs(s.lijn - m.lijn) < 1 && Math.min(s.tot, c.muur!.einde) - Math.max(s.van, c.muur!.begin) > 10);
    if (!hier.length) continue;
    // Eén soort last per wand: die met de grootste breedte (aan beide kanten opgeteld).
    const perSoort = new Map<LastSoort, Steun[]>();
    for (const s of hier) perSoort.set(s.draagt, [...(perSoort.get(s.draagt) ?? []), s]);
    const [draagt, lijst] = [...perSoort].sort((a, b) => b[1].reduce((t, s) => t + s.breedte, 0) - a[1].reduce((t, s) => t + s.breedte, 0))[0]!;
    c.opWand = { draagt, belasteBreedte: r2(lijst.reduce((t, s) => t + s.breedte, 0)), ...(lijst[0]!.helling === undefined ? {} : { helling: lijst[0]!.helling }) };
  }
  return uit;
}

/** Plaatsen (het begin, cm) van stijlen met breedte t over een lengte: één aan elk einde en daartussen om de hoh (zoals een wand). */
function stijlRaster(L: number, t: number, hoh: number): number[] {
  if (!(L > 2 * t) || !(hoh > t)) return L > 0 && t > 0 ? [0] : [];
  const uit = [0];
  for (let k = 1; k * hoh + t / 2 <= L - t; k++) if (k * hoh - t / 2 >= t) uit.push(k * hoh - t / 2);
  uit.push(L - t);
  return uit;
}

/**
 * De topgevel boven een muur onder een hellend dak (de driehoek van een zadeldak, de schuine kant van een lessenaar, de
 * hoge muur van een lessenaar): stijlen op het raster van de muur eronder, met hun kop schuin onder het dak, en een
 * schuine regel langs het dak. Een bouwdeel zonder vlak: de 3D tekent alleen het skelet, de meetstaat telt de lagen van
 * de muur over de oppervlakte van de topgevel. Een benadering: geen openingen, geen muurplaat, de regel volgt het dak.
 */
function topgevel(w: ConstructieDeel, d: HellendDak, hout: { soort: BlokSoort; kleur: string } | undefined): ConstructieDeel | undefined {
  const m = w.muur!.muur, T = m.dikte, L = w.deel.maten.b;
  const skelet = w.deel.lagen[w.deel.dragend];
  const h = skelet?.hout;
  if (!skelet || skelet.rol !== 'skelet' || !h) return undefined;
  const mee = m.as === 'h' ? w.muur!.buitenMin : !w.muur!.buitenMin;
  const plan = (x: number) => (mee ? w.muur!.begin + x : w.muur!.einde - x);
  // Loopt de muur dwars op de nok, dan verandert de hoogte langs de muur; anders is ze overal dezelfde (de laagste van
  // de twee zijden, zodat de muur niet door het dak steekt).
  const dwars = (m.as === 'h') !== (d.nokAs === 'x');
  const hoogte = (x: number) => Math.max(0, dwars ? dakHoogte(d, plan(x)) : Math.min(dakHoogte(d, m.lijn - T / 2), dakHoogte(d, m.lijn + T / 2)));
  // Waar de hoogte knikt (de nok), en de uiteinden.
  const knik = [0, L];
  if (dwars && d.vorm === 'zadel') { const x = mee ? d.nokP - w.muur!.begin : w.muur!.einde - d.nokP; if (x > 0.5 && x < L - 0.5) knik.splice(1, 0, x); }
  if (Math.max(...knik.map(hoogte)) < 2) return undefined;
  const t = h.breedte / 10, cos = dwars ? Math.cos((d.helling * Math.PI) / 180) : 1, regel = t / cos;
  const z0 = r2(T - skelet.tot), z1 = r2(T - skelet.van);
  const teken = hout ?? { soort: 'hout' as BlokSoort, kleur: skelet.kleur };
  const stukken: Stuk[] = [];
  const doorsnede = { vorm: 'rechthoek' as const, breedte: h.breedte, hoogte: skelet.dikte };
  let houtM2 = 0;
  // De schuine regels, per stuk tussen twee knikken.
  knik.slice(0, -1).forEach((a, i) => {
    const b = knik[i + 1]!, ha = hoogte(a), hb = hoogte(b);
    if (Math.max(ha, hb) < 1) return;
    const code = `skelet.bovenregel.${i + 1}`;
    stukken.push({
      code, rol: 'bovenregel', materiaal: skelet.materiaal, doorsnede, lengte: r2(Math.hypot(b - a, hb - ha)),
      blok: prisma(code, teken.soort, teken.kleur, 'z', z0, z1, [[a, Math.max(0, ha - regel)], [b, Math.max(0, hb - regel)], [b, hb], [a, ha]]),
    });
    houtM2 += ((b - a) * regel) / 10000;
  });
  // De stijlen, met hun kop onder de regel.
  let n = 0;
  for (const u of stijlRaster(L, t, h.hoh / 10)) {
    const ha = hoogte(u) - regel, hb = hoogte(u + t) - regel;
    if (Math.max(ha, hb) < 2) continue;
    const code = `skelet.stijl.${++n}`;
    stukken.push({
      code, rol: 'stijl', materiaal: skelet.materiaal, doorsnede, lengte: r2(Math.max(ha, hb)),
      blok: prisma(code, teken.soort, teken.kleur, 'z', z0, z1, [[u, 0], [u + t, 0], [u + t, Math.max(0, hb)], [u, Math.max(0, ha)]]),
    });
    houtM2 += (t * Math.max(0, (ha + hb) / 2)) / 10000;
  }
  // De oppervlakte van de topgevel (trapezia tussen de knikken), voor de lagen in de meetstaat.
  const m2 = knik.slice(0, -1).reduce((som, a, i) => som + ((knik[i + 1]! - a) * (hoogte(a) + hoogte(knik[i + 1]!))) / 2 / 10000, 0);
  const wandM2 = w.deel.lagen[0]?.oppervlakte || 1;
  const lagen = w.deel.lagen.map((l) => ({
    ...l, oppervlakte: r2(m2),
    ...(l.lattenLengte !== undefined ? { lattenLengte: r2((l.lattenLengte * m2) / wandM2) } : {}),
    ...(l.vulling ? { vulling: { ...l.vulling, oppervlakte: r2(Math.max(0, m2 - (l.index === skelet.index ? houtM2 : 0))) } } : {}),
  }));
  const maxH = Math.max(...knik.map(hoogte));
  return {
    code: `topgevel_${w.code}`, plaats: 'buitenwand', opbouw: w.opbouw, niveau: w.niveau, wat: `Topgevel boven: ${w.wat.toLowerCase()}`,
    deel: { soort: 'wandvlak', maten: { b: L, h: r2(maxH), d: T }, stukken, lagen, dragend: w.deel.dragend, meldingen: [] },
    zet: { ...w.zet, y: r2(w.zet.y + w.muur!.hoogte) }, ...(w.ding ? { ding: w.ding } : {}), onderDak: true,
  };
}

/** De blokken van een geplaatst bouwdeel in de woning, in de gevraagde weergave. */
export function constructieBlokken(c: ConstructieDeel, opties: { dingen?: boolean; lagen?: boolean } = {}): Blok[] {
  const voor = `${opties.dingen && c.ding ? `${c.ding}.` : 'constructie.'}${c.code}.`;
  let blokken = bouwdeelBlokken(c.deel, 'constructie', { voorvoegsel: voor, ...(opties.lagen === false ? { lagen: false } : {}) });
  blokken = bouwdeelOpPlaats(blokken, c.deel.maten, c.zet);
  return c.zet.hoek ? draaiBlokken(blokken, c.zet.hoek) : blokken;
}

export interface Constructie3DOpties {
  /** Muren laag afsnijden (cm), zoals in de afgewerkte weergave. */
  laag?: number;
  /** Alleen de verdiepingen tot en met dit niveau (de bovenste zonder dak). */
  totNiveau?: number;
  /** false = geen dak (erin kijken). */
  dak?: boolean;
  /** Elk blok zegt bij welk ding het hoort (`gevel:<vlak>`, `ruimte:<id>`, `dak`), zoals in `plattegrond3D`. */
  dingen?: boolean;
  /** Het kader van de camera; leeg = dat van de afgewerkte weergave met dezelfde opties (zo springt de camera niet). */
  kader?: Scene3D['kader'];
}

/**
 * De constructieweergave van de woning: wanden, vloeren en daken als skelet met hun lagen als staal (bouwdelen.ts), op
 * hun plaats. Zonder ramen, deuren, meubels, dakrand en aanleg; de trap en de lichtkoepels blijven. Wat getoond wordt,
 * volgt dezelfde regels als `plattegrond3D` (verdiepingen, muren laag, dak). De scène vraagt de kijker gelijke stukken
 * samen te tekenen (`samenvoegen`): een woning in constructie telt duizenden stukken.
 */
export function constructie3D(plan: Plattegrond, cat: PlanCatalogus, opties: Constructie3DOpties = {}, c = woningConstructie(plan, cat)): Scene3D {
  const niveaus = verdiepingenVan(plan).length;
  const laatste = Math.min(niveaus - 1, opties.totNiveau ?? niveaus - 1);
  const topDak = opties.dak !== false && !opties.laag && opties.totNiveau === undefined;
  /** Wordt een dak of vloer op verdieping n getoond? Een plat dak op een lagere verdieping altijd, op de bovenste alleen met het dak. */
  const dakHier = (n: number) => n < laatste || (n === c.top && topDak);
  const toon = (soort: OpbouwPlaats | 'vloer' | 'dak' | 'trap', n: number) => {
    if (soort === 'hellendDak') return topDak;
    if (soort === 'platDak' || soort === 'dak') return n <= laatste && dakHier(n);
    return n <= laatste;
  };
  const top = opties.laag ? vloerHoogte(plan, laatste) + opties.laag : Infinity;
  const knip = (b: Blok): Blok | undefined => (b.y >= top ? undefined : b.y + b.h > top ? { ...b, h: r2(top - b.y) } : b);
  const getoond = c.delen.filter((d) => toon(d.plaats, d.niveau) && (!d.onderDak || topDak));
  // De lagen als staal op één bouwdeel per opbouw (het grootste dat getoond wordt): op elk bouwdeel werd het een rij
  // gekleurde stroken aan elke muur; zo zie je het skelet en toch één keer waaruit elke wand, vloer en dak bestaat.
  const staal = new Map<string, ConstructieDeel>();
  const grootte = (d: ConstructieDeel) => (d.deel.vlak ? d.deel.vlak.lengte * d.deel.vlak.breedte : 0);
  for (const d of getoond) {
    const k = `${d.plaats}|${d.opbouw}`, nu = staal.get(k);
    if (!nu || grootte(d) > grootte(nu) + 1) staal.set(k, d);
  }
  const metStaal = new Set(staal.values());
  const blokken: Blok[] = [];
  for (const d of getoond) {
    const bl = constructieBlokken(d, { dingen: opties.dingen, lagen: metStaal.has(d) });
    const wand = d.plaats === 'buitenwand' || d.plaats === 'binnenwand';
    for (const b of bl) {
      const k = wand && d.niveau === laatste ? knip(b) : b;
      if (k && k.h > 0.05) blokken.push(k);
    }
  }
  for (const s of c.stukken) if (toon(s.soort, s.niveau)) blokken.push(...s.blokken);
  const kader = opties.kader ?? plattegrond3D(plan, cat, { laag: opties.laag, totNiveau: opties.totNiveau, dak: opties.dak, meubels: false }).kader;
  return { blokken, kader: blokken.length ? kader : kaderVan(blokken), samenvoegen: true };
}

/** De meetstaat van de hele woning: de som van alle bouwdelen (netto, zonder prijzen). */
export function woningMeetstaat(plan: Plattegrond, cat: PlanCatalogus, c = woningConstructie(plan, cat)): MeetstaatRegel[] {
  return meetstaat(c.delen.map((d) => d.deel), cat.opbouw?.materialen ?? {});
}

/** De aanwijzing voor EPB van één opbouw in de woning. */
export interface WoningWarmte {
  plaats: OpbouwPlaats;
  code: string;
  opbouw: Opbouw;
  /** Netto oppervlakte in de woning (m², zonder openingen). */
  m2: number;
  /** Het aandeel hout in het skelet, geteld uit de stukken van de woning (0 tot 1), als er een skelet met vulling is. */
  aandeelHout?: number;
  uitkomst: WarmteUitkomst;
}

/**
 * De U-waarde van elke opbouw die in de woning gebruikt wordt (een aanwijzing voor EPB, zie warmte.ts), met haar
 * oppervlakte. Het aandeel hout in het skelet komt uit de stukken die de constructie tekent (stijlen, regels, lateien,
 * balken), niet uit het raster met een toeslag: zo telt een wand met veel ramen meer hout.
 */
export function woningWarmte(plan: Plattegrond, cat: PlanCatalogus, waarden: WarmteWaarden, c = woningConstructie(plan, cat)): WoningWarmte[] {
  const oc = cat.opbouw;
  if (!oc) return [];
  const groepen = new Map<string, ConstructieDeel[]>();
  for (const d of c.delen) groepen.set(`${d.plaats}|${d.opbouw}`, [...(groepen.get(`${d.plaats}|${d.opbouw}`) ?? []), d]);
  return [...groepen.values()].map((delen) => {
    const { plaats, opbouw: code } = delen[0]!, o = oc.opbouwen[code]!;
    const m2 = r2(delen.reduce((t, d) => t + (d.deel.lagen[0]?.oppervlakte ?? 0), 0));
    // Aandeel hout: (oppervlakte van de skeletlaag − die van de vulling) / oppervlakte van de skeletlaag.
    let vlak = 0, vulling = 0;
    for (const d of delen) {
      const s = d.deel.lagen[d.deel.dragend];
      if (s?.rol === 'skelet' && s.vulling && d.deel.stukken.length) { vlak += s.oppervlakte; vulling += s.vulling.oppervlakte; }
    }
    const aandeelHout = vlak > 0 ? Math.round(((vlak - vulling) / vlak) * 1000) / 1000 : undefined;
    const uitkomst = uWaarde(o, oc.materialen, waarden, aandeelHout === undefined ? {} : { aandeelHout });
    if (aandeelHout !== undefined) uitkomst.aannames.unshift(`Het aandeel hout in het skelet (${String(Math.round(aandeelHout * 1000) / 10).replace('.', ',')} %) is geteld uit de stijlen, regels, lateien of balken die de constructie van deze woning tekent.`);
    return { plaats, code, opbouw: o, m2, ...(aandeelHout === undefined ? {} : { aandeelHout }), uitkomst };
  }).sort((a, b) => PLAATSEN_VOLGORDE.indexOf(a.plaats) - PLAATSEN_VOLGORDE.indexOf(b.plaats));
}
const PLAATSEN_VOLGORDE: OpbouwPlaats[] = ['buitenwand', 'binnenwand', 'grondvloer', 'verdiepingsvloer', 'platDak', 'hellendDak'];

/** De schatting van één bouwdeel van de woning. */
export interface WoningSchatting {
  plaats: OpbouwPlaats;
  wat: string;
  code: string;
  schatting: BouwdeelSchatting;
}

/**
 * De schatting van de stabiliteit (stabiliteit.ts) voor elke balklaag (vloer en plat dak), elk hellend dakvlak en de
 * lateien van elke wand met openingen. Wat op een wand rust, komt uit de vloeren en daken die de constructie erop legt;
 * waar dat niet eenduidig is (geen vloer of dak op die lijn), zegt de schatting "niet te zeggen". Het hellende dak is
 * gerekend zonder gordingen: de constructie tekent er geen.
 */
export function woningStabiliteit(plan: Plattegrond, cat: PlanCatalogus, waarden: StabiliteitsWaarden, c = woningConstructie(plan, cat)): WoningSchatting[] {
  const uit: WoningSchatting[] = [];
  for (const d of c.delen) {
    const wand = d.plaats === 'buitenwand' || d.plaats === 'binnenwand';
    if (wand && !d.deel.stukken.some((s) => s.rol === 'latei')) continue;
    if (!wand && !d.deel.stukken.length) continue;
    const opties: BouwdeelSchattingOpties = d.plaats === 'hellendDak' ? { gordingen: 0 } : d.opWand ? { opWand: d.opWand } : {};
    uit.push({ plaats: d.plaats, wat: d.wat, code: d.code, schatting: schatBouwdeel(d.deel, waarden, opties) });
  }
  return uit;
}

/** De naam van een plaats in gewone taal (enkelvoud). */
export const plaatsNaam = (p: OpbouwPlaats) => PLAATS_NAAM[p];
