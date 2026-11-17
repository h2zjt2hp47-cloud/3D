/**
 * Techniek voor de installateur op het scherm (ronde 10b, fase 2 "detail invullen"): toestellen plaatsen en leidingen
 * trekken in de plattegrond, de technische ruimte en de vloerverwarming in één tik, vakken aan en uit in de tekening en
 * de 3D, de uitgezette 3D, en in het overzicht de telling. Zonder prijzen; toont en telt, rekent niet
 * (`TECHNIEK_VOORBEHOUD` staat bij alles).
 *
 * De techniek verschijnt pas als je ze opzoekt: de knop *Techniek* onderaan het gereedschap (of *Techniek* boven de 3D)
 * zet de modus aan. Daarna toont de tekening de tekens en leidingen, staat het palet in plaats van het gereedschap en
 * toont de 3D de installaties. De modus hoort bij het kijken, niet bij het project: niet bewaard, start uit. Een plan
 * zonder toestellen of leidingen ziet er dus uit zoals vroeger.
 *
 * Alles wat rekent, staat in de motor: `tegenWand`, `leidingLangsWanden`, `technischeOpstelling`, `vloerverwarmingLus`,
 * `toestelVlak`, `verschuifLeidingPunten` (core/src/techniekplaatsen.ts) en `telTechniek` (core/src/techniek.ts).
 */
import {
  ALLE_VAKKEN, TECHNIEK_VAKKEN, TECHNIEK_VOORBEHOUD, binnenVorm, delenVan, leidingLangsWanden, leidingVerloop, maatTekst, maatVan, murenVan, niveauPlan,
  niveauVan, nieuweTechniek, nieuwToestel, opToestelVlak, puntGroep, ruimteOp, technischeOpstelling, tegenWand, telTechniek, toestelMaten, toestelTekenBeeld, toestelVlak,
  toestelVoetafdruk, verschuifLeidingPunten, vloerHoogte, vloerverwarmingLus, vormVanDeel,
  type Leiding, type LeidingHoogte, type Plattegrond, type Punt, type Ruimte, type TechniekRegel, type TechniekVak, type Toestel, type ToestelType,
} from '../../core/src/index.js';
import { TECHNISCHE_RUIMTE, techniekCatalogus as tc } from '../../core/voorbeelden/techniek.js';
import { uitgerusteWoning } from '../../core/voorbeelden/techniekwoning.js';
import { $, el, getal, kopieer } from './hulp.js';
import { constructieAan, zetWeergave as zetConstructieWeergave } from './constructie-ui.js';
import { cmVeld, leesCm, vraagMaat } from './maten-ui.js';
import { momentopname, nieuweId, nieuwProject, ongedaan, toestand, voorbeeldToestand, wijzig, type Toestand } from './staat.js';

export type TechniekSelectie = { soort: 'toestel' | 'leiding'; id: string };

/** Wat de plattegrond aan de techniek geeft (zoals `MatenOmgeving`). */
export interface TechniekOmgeving {
  /** De actieve verdieping. */
  niveau: () => number;
  /** Centimeter per beeldpunt van de tekening. */
  schaal: () => number;
  /** Afronden op het fijne raster (cm). */
  snap: (v: number) => number;
  /** Wat gekozen is in de tekening (gedeeld met de plattegrond), en iets kiezen (tekent opnieuw). */
  selectie: () => { soort: string; id: string } | undefined;
  kies: (s: TechniekSelectie | undefined) => void;
  /**
   * Tekening opnieuw; eigenschappen opnieuw; een melding bij de eigenschappen, en met de plaats van de tik (`bij`) ook bij
   * de tik in de tekening (een weigering, of wat de tik deed).
   */
  opnieuw: () => void;
  eigenschappen: () => void;
  melding: (tekst: string, bij?: Punt, weigering?: boolean) => void;
  /** De modus ging aan of uit: gereedschap, tekening en 3D bijwerken. */
  gewisseld: () => void;
  /** De 3D opnieuw tekenen (andere vakken, uitgezet). */
  drieD: () => void;
  /** De tekening op het scherm. */
  svg: () => SVGSVGElement | null;
  /** Naar de plattegrond met dit toestel of deze leiding gekozen (vanuit de 3D). */
  naarPlan: (s: TechniekSelectie) => void;
}
let omg: TechniekOmgeving | undefined;
/**
 * De melding van een tik: bij de eigenschappen, en met de plaats van de tik ook in de tekening bij die tik (op een tablet
 * staan de eigenschappen onder de tekening, uit beeld; sinds 16/11 niet meer apart onder de tekening, die op een tablet
 * liggend ook buiten beeld viel). `weigering` = de tik kon niet.
 */
function meld(tekst: string, bij?: Punt, weigering = false) {
  omg?.melding(tekst, bij, weigering);
}

// ---------- de toestand van het scherm (niet bewaard) ----------

let aan = false;
/** Het vak van het palet. */
let vak: TechniekVak = 'elektriciteit';
/** De vakken die getekend worden (tekening en 3D). */
const zichtbaar = new Set<TechniekVak>(ALLE_VAKKEN);
/** De 3D uitgezet (lage wanden en lijnen) of in de woning. */
let uitgezet = true;

type Gereedschap =
  | { soort: 'kies' }
  | { soort: 'toestel'; type: string }
  | { soort: 'leiding'; leiding: string; van?: { punt: Punt; toestel?: string } }
  | { soort: 'technisch' }
  | { soort: 'vloerverwarming' };
let gereedschap: Gereedschap = { soort: 'kies' };

/** Slepen: een toestel of een punt (een groep punten op dezelfde plaats) van een leiding. Rekent vanaf het begin. */
let sleep: { soort: 'toestel' | 'punt'; id: string; groep?: number[]; plan: Plattegrond; scherm: { x: number; y: number }; start: Punt; bewogen: boolean } | undefined;

export const techniekAan = () => aan;
export const techniekUitgezet = () => uitgezet;
/** Heeft het plan techniek (dan blijft de knop *Techniek* bij de 3D staan)? */
export const heeftTechniek = (plan: Plattegrond = toestand().plan) => !!(plan.toestellen?.length || plan.leidingen?.length);

/** De techniek aan of uit (de knop in het gereedschap, *Techniek* boven de 3D, of terug naar het gereedschap). */
export function zetTechniek(nieuw: boolean, opties: { stil?: boolean } = {}) {
  if (nieuw === aan) { if (!opties.stil) omg?.gewisseld(); return; }
  aan = nieuw;
  gereedschap = { soort: 'kies' };
  sleep = undefined;
  if (!aan) { const s = omg?.selectie(); if (s?.soort === 'toestel' || s?.soort === 'leiding') omg?.kies(undefined); }
  toonPalet();
  toonBalk3D();
  if (!opties.stil) omg?.gewisseld();
}

/** Opties voor `tekenPlattegrond`: de tekens en leidingen van de zichtbare vakken (alleen als de techniek aan staat). */
export function techniekTekenOpties(): { techniek?: TechniekVak[] } {
  return aan ? { techniek: ALLE_VAKKEN.filter((v) => zichtbaar.has(v)) } : {};
}

/**
 * Opties voor `plattegrond3D`: de installaties, gewoon of uitgezet (alleen als de techniek aan staat). 16/11: uitgezet
 * altijd alleen de verdieping waarop je werkt (alle verdiepingen samen zweefden als losse kaders boven elkaar), en in
 * beide weergaven de kleine toestellen groter en met een merkteken op de vloer (`opvallend`): anders was een
 * stopcontact op een hele verdieping een stipje. In de woning toont de 3D dan ook lage muren zonder dak (zie
 * `techniekInWoning`).
 */
export function techniek3DOpties(niveau: number): { techniek?: { vakken: TechniekVak[]; weergave: 'gewoon' | 'uitgezet'; niveau?: number; opvallend: boolean } } {
  if (!aan) return {};
  return { techniek: { vakken: ALLE_VAKKEN.filter((v) => zichtbaar.has(v)), weergave: uitgezet ? 'uitgezet' : 'gewoon', opvallend: true, ...(uitgezet ? { niveau } : {}) } };
}

/** De techniek in de woning (niet uitgezet): de 3D toont dan de verdieping waarop je werkt met lage muren en zonder dak. */
export const techniekInWoning = () => aan && !uitgezet;

// ---------- hulpjes ----------

const r1 = (x: number) => Math.round(x * 10) / 10;
const cm = (x: number) => `${getal(r1(x), 1)} cm`;
const typeVan = (t: Toestel): ToestelType | undefined => tc.toestellen[t.type];
const naamVan = (t: Toestel | undefined) => (t ? typeVan(t)?.label ?? t.type : '');
/** Het label zonder de uitleg tussen haakjes, behalve als twee toestellen dan hetzelfde zouden heten (airco wand en cassette). */
const zonderHaakjes = (label: string) => label.replace(/\s*\(.*\)\s*$/, '');
const dubbelKort = new Set(Object.values(tc.toestellen).map((t) => zonderHaakjes(t.label)).filter((k, i, a) => a.indexOf(k) !== i));
const kortLabel = (label: string) => (dubbelKort.has(zonderHaakjes(label)) ? label : zonderHaakjes(label));
const BEVESTIGING: Record<string, string> = { wand: 'aan de wand', plafond: 'tegen het plafond', vloer: 'op de vloer', buiten: 'buiten', dak: 'op het dak' };
const LIGGING: [LeidingHoogte, string][] = [['vloer', 'In de vloer'], ['wand', 'In de wand'], ['plafond', 'Tegen het plafond']];

function afstandTotStuk(p: Punt, a: Punt, b: Punt): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function binnenVeelhoekje(v: Punt[], [x, y]: Punt): boolean {
  let binnen = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const [xi, yi] = v[i]!, [xj, yj] = v[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) binnen = !binnen;
  }
  return binnen;
}

/** De toestellen en leidingen van de actieve verdieping in de zichtbare vakken. */
function toestellenNu(): Toestel[] {
  const n = omg?.niveau() ?? 0;
  return (toestand().plan.toestellen ?? []).filter((t) => niveauVan(t) === n && zichtbaar.has(typeVan(t)?.vak ?? 'elektriciteit'));
}
function leidingenNu(): Leiding[] {
  const n = omg?.niveau() ?? 0;
  return (toestand().plan.leidingen ?? []).filter((l) => niveauVan(l) === n && zichtbaar.has(tc.leidingen[l.soort]?.vak ?? 'elektriciteit'));
}

/** Tot hoever naast een toestel of leiding een tik nog telt: 22 beeldpunten (een vinger), dus een doel van 44. */
const raakAfstand = () => 22 * (omg?.schaal() ?? 1);

/** Het toestel onder een tik (het dichtste binnen 22 beeldpunten), met de afstand. */
function toestelBij(p: Punt): { t: Toestel; d: number } | undefined {
  let beste: Toestel | undefined, af = raakAfstand();
  for (const t of toestellenNu()) {
    const type = typeVan(t);
    if (!type) continue;
    const v = toestelVoetafdruk(t, type);
    const d = binnenVeelhoekje(v, p) ? 0 : Math.min(Math.hypot(p[0] - t.x, p[1] - t.y), ...v.map((a, i) => afstandTotStuk(p, a, v[(i + 1) % v.length]!)));
    if (d <= af) { af = d; beste = t; }
  }
  return beste ? { t: beste, d: af } : undefined;
}
const toestelOp = (p: Punt) => toestelBij(p)?.t;

/** De leiding onder een tik (het dichtste stuk binnen 22 beeldpunten), met de afstand. */
function leidingBij(p: Punt): { l: Leiding; d: number } | undefined {
  let beste: Leiding | undefined, af = raakAfstand();
  for (const l of leidingenNu()) {
    for (let i = 1; i < l.punten.length; i++) {
      const d = afstandTotStuk(p, l.punten[i - 1]!, l.punten[i]!);
      if (d <= af) { af = d; beste = l; }
    }
  }
  return beste ? { l: beste, d: af } : undefined;
}

/** Wijzigt een toestel in de toestand (op id). */
const zetToestel = (id: string, f: (t: Toestel) => void) => wijzig('plan', (x) => { const t = x.plan.toestellen?.find((y) => y.id === id); if (t) f(t); });
const zetLeiding = (id: string, f: (l: Leiding) => void) => wijzig('plan', (x) => { const l = x.plan.leidingen?.find((y) => y.id === id); if (l) f(l); });

// ---------- plaatsen ----------

/**
 * Waar een nieuw toestel komt als je op p tikt: aan een wand of buiten tegen de dichtste wand (ook schuin), op de vloer
 * tegen een wand als die dichtbij is, aan het plafond of op het dak op de tik. Of een reden waarom het daar niet kan.
 */
function nieuwePlaats(code: string, p: Punt): Toestel | string {
  const type = tc.toestellen[code]!, plan = toestand().plan, n = omg?.niveau() ?? 0;
  const snap = omg?.snap ?? ((v: number) => v);
  let t = nieuwToestel(tc, code, nieuweId('t'), snap(p[0]), snap(p[1]), plan.muurhoogte, { niveau: n });
  const binnen = ruimteOp(plan, p[0], p[1], n);
  if (t.aan === 'buiten') {
    if (binnen) return `${kortLabel(type.label)} hoort buiten: tik buiten de woning, naast de gevel.`;
    const w = tegenWand(plan, t, type, { maxAfstand: 300 });
    if (!w) return 'Tik dichter bij de gevel (binnen 3 m).';
    return w.toestel;
  }
  if (!binnen) return `Tik in een ruimte: ${kortLabel(type.label).toLowerCase()} hoort binnen.`;
  if (t.aan === 'wand') {
    const w = tegenWand(plan, t, type, { maxAfstand: 2000 });
    if (!w) return 'Tik dichter bij een muur.';
    t = w.toestel;
  } else if (t.aan === 'vloer') {
    const w = tegenWand(plan, t, type, { maxAfstand: 40 });
    if (w) t = w.toestel;
  }
  return t;
}

/** Een toestel plaatsen op een tik; daarna de maatvraag (wie niets typt, houdt wat hij tikte). */
function plaatsToestel(code: string, p: Punt) {
  voorbeeld = undefined;
  const t = nieuwePlaats(code, p);
  if (typeof t === 'string') { meld(t, p, true); return; }
  const type = tc.toestellen[code]!;
  zichtbaar.add(type.vak);
  wijzig('plan', (x) => { (x.plan.toestellen ??= []).push(t); });
  omg?.kies({ soort: 'toestel', id: t.id });
  vraagToestel(t.id);
}

/** Hoeveel cm van de muren een nieuwe leiding loopt: een eind verder als er al leidingen aan dezelfde toestellen hangen. */
function afstandVoor(van?: string, naar?: string): number {
  const k = (toestand().plan.leidingen ?? []).filter((l) => (van && (l.van === van || l.naar === van)) || (naar && (l.van === naar || l.naar === naar))).length;
  return 5 + 7 * Math.min(5, k);
}

/** Een leiding van toestel (of punt) naar toestel (of punt), langs de wanden, op de standaardhoogte van haar soort. */
function trekLeiding(code: string, van: { punt: Punt; toestel?: string }, naar: { punt: Punt; toestel?: string }) {
  const soort = tc.leidingen[code]!, n = omg?.niveau() ?? 0, plan = toestand().plan;
  const punten = leidingLangsWanden(plan, van.punt, naar.punt, { niveau: n, afstand: afstandVoor(van.toestel, naar.toestel) });
  if (punten.length < 2) { meld('Tik op twee verschillende plaatsen.', naar.punt, true); return; }
  const l: Leiding = { id: nieuweId('l'), soort: code, punten, hoogte: soort.hoogte, niveau: n, ...(van.toestel ? { van: van.toestel } : {}), ...(naar.toestel ? { naar: naar.toestel } : {}) };
  zichtbaar.add(soort.vak);
  wijzig('plan', (x) => { (x.plan.leidingen ??= []).push(l); });
  omg?.kies({ soort: 'leiding', id: l.id });
  const lengte = leidingVerloop(l, toestand().plan, tc, { vloerHoogte: (k) => vloerHoogte(toestand().plan, k) }).lengte;
  meld(`${kortLabel(soort.label)} getrokken: ${getal(lengte, 1)} m. Tik op het volgende toestel om er nog een te trekken, of op Selecteren.`, naar.punt);
}

/** Een tik met het gereedschap *leiding*: eerst het begin, dan het einde. */
function leidingTik(g: Extract<Gereedschap, { soort: 'leiding' }>, p: Punt) {
  const t = toestelOp(p);
  const snap = omg?.snap ?? ((v: number) => v);
  const plek = t ? { punt: [t.x, t.y] as Punt, toestel: t.id } : { punt: [snap(p[0]), snap(p[1])] as Punt };
  if (!g.van) {
    g.van = plek;
    meld(`Begin: ${t ? naamVan(t).toLowerCase() : 'een punt'}. Tik nu op het tweede toestel (of op een punt, bv. buiten).`, p);
    omg?.opnieuw();
    return;
  }
  if (t && t.id === g.van.toestel) return;
  const van = g.van;
  g.van = undefined;
  trekLeiding(g.leiding, van, plek);
}

/**
 * De technische ruimte in één tik: de toestellen die samen horen (`TECHNISCHE_RUIMTE`) langs de wanden van de ruimte.
 * Wat al in het plan staat (een tellerkast …) komt er niet nog eens bij. Van een paar volgordes de beste (de meeste
 * toestellen langs de wanden); wat niet past, komt in de melding.
 */
function technischeRuimte(r: Ruimte, bij: Punt) {
  const plan = toestand().plan;
  const al = new Set((plan.toestellen ?? []).map((t) => t.type));
  const types = TECHNISCHE_RUIMTE.filter((x) => !al.has(x));
  const dubbel = TECHNISCHE_RUIMTE.filter((x) => al.has(x)).map((x) => kortLabel(tc.toestellen[x]!.label).toLowerCase());
  if (!types.length) { meld(`De technische ruimte staat er al (${dubbel.join(', ')}).`, bij, true); return; }
  const o = besteOpstelling(plan, r.id, types);
  if (!o.toestellen.length) { meld(o.meldingen[0] ?? `In ${r.naam} past niets langs de wanden.`, bij, true); return; }
  const nieuw = o.toestellen.map((t) => ({ ...t, id: nieuweId('t') }));
  // Met de collector staat er sanitair in het plan: vanaf dan meldt de controle ook elke natte ruimte zonder afvoer.
  // (Vóór de wijziging bekijken: `wijzig` past het plan ter plaatse aan.)
  const sanitair = nieuw.some((t) => typeVan(t)?.vak === 'sanitair') && !(plan.toestellen ?? []).some((t) => typeVan(t)?.vak === 'sanitair') && !(plan.leidingen ?? []).some((l) => tc.leidingen[l.soort]?.vak === 'sanitair');
  for (const t of nieuw) zichtbaar.add(typeVan(t)!.vak);
  wijzig('plan', (x) => { (x.plan.toestellen ??= []).push(...nieuw); });
  omg?.kies(undefined);
  meld([
    `Technische ruimte in ${r.naam}: ${nieuw.length} toestellen langs de wanden.`, ...o.meldingen,
    dubbel.length ? `Al in het plan (niet nog eens): ${dubbel.join(', ')}.` : '',
    sanitair ? 'Er staat nu sanitair in het plan: de controles melden ook de natte ruimtes zonder afvoer (trek een afvoer bij Sanitair).' : '',
  ].filter(Boolean).join(' '), bij);
}

/**
 * De volgorde waarin `technischeOpstelling` de toestellen zet, bepaalt wat past (in de kleine berging van de voorbeeldwoning
 * passen ze alle zeven in maar 12 van de 5040 volgordes). Eerst de gewone volgorde; past niet alles, dan zoeken: toestel
 * per toestel een volgorde opbouwen, de ondiepe (die tegen de wand) eerst, en een begin waarin al iets niet past, valt weg.
 * Hoogstens een halve seconde; daarna de beste die gevonden werd (en de melding wat niet past).
 */
function besteOpstelling(plan: Plattegrond, ruimte: string, types: string[]) {
  let beste = technischeOpstelling(plan, ruimte, tc, types);
  if (!beste.nietGeplaatst.length) return beste;
  const tot = performance.now() + 500;
  const zoek = (begin: string[], rest: string[]): boolean => {
    for (const x of rest) {
      if (performance.now() > tot) return false;
      const volgorde = [...begin, x];
      const o = technischeOpstelling(plan, ruimte, tc, volgorde);
      if (o.nietGeplaatst.length) continue;
      const verder = rest.filter((y) => y !== x);
      if (!verder.length) { beste = o; return true; }
      if (zoek(volgorde, verder)) return true;
    }
    return false;
  };
  if (zoek([], [...types].sort((a, b) => tc.toestellen[a]!.d - tc.toestellen[b]!.d))) return beste;
  const ondiep = technischeOpstelling(plan, ruimte, tc, [...types].sort((a, b) => tc.toestellen[a]!.d - tc.toestellen[b]!.d));
  return ondiep.nietGeplaatst.length < beste.nietGeplaatst.length ? ondiep : beste;
}

/**
 * Vloerverwarming in een ruimte in één tik: lussen als zigzag (`vloerverwarmingLus`), zoveel als nodig om elke lus onder
 * de grootste lengte van haar soort te houden (richtwaarde), aangesloten op de verdeler van deze verdieping (aan- en
 * afvoer langs de wanden). Een tweede tik op dezelfde ruimte legt ze opnieuw.
 */
function vloerverwarming(r: Ruimte, bij: Punt) {
  const plan = toestand().plan, n = niveauVan(r), soort = tc.leidingen.vloerverwarming!;
  const verdeler = (plan.toestellen ?? []).filter((t) => t.type === 'verdeler_vloerverwarming' && niveauVan(t) === n)
    .sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y))[0];
  const max = (soort.maxLengte?.waarde ?? 120) - 5;
  const vh = (k: number) => vloerHoogte(plan, k);
  const prefix = `vv_${r.id}_`;
  const zonder = { ...plan, leidingen: (plan.leidingen ?? []).filter((l) => !l.id.startsWith(prefix)) };
  let lussen: Leiding[] = [];
  for (let aantal = 1; aantal <= 6; aantal++) {
    lussen = [];
    for (let k = 0; k < aantal; k++) {
      const meander = vloerverwarmingLus(plan, r.id, aantal > 1 ? { strook: [k / aantal, (k + 1) / aantal] } : {});
      if (meander.length < 2) continue;
      const af = 8 + 12 * k;
      const punten = verdeler
        ? [...leidingLangsWanden(plan, [verdeler.x, verdeler.y], meander[0]!, { niveau: n, afstand: af }), ...meander.slice(1),
          ...leidingLangsWanden(plan, meander[meander.length - 1]!, [verdeler.x, verdeler.y], { niveau: n, afstand: af + 6 }).slice(1)]
        : meander;
      lussen.push({
        id: `${prefix}${k + 1}_${nieuweId('')}`, soort: 'vloerverwarming', punten, hoogte: 'vloer', niveau: n,
        ...(verdeler ? { van: verdeler.id, naar: verdeler.id } : {}), kring: `lus ${r.naam.toLowerCase()}${aantal > 1 ? ` ${k + 1}` : ''}`,
      });
    }
    if (lussen.every((l) => leidingVerloop(l, zonder, tc, { vloerHoogte: vh }).lengte <= max)) break;
  }
  if (!lussen.length) { meld(`In ${r.naam} past geen lus.`, bij, true); return; }
  zichtbaar.add('klimaat');
  wijzig('plan', (x) => { x.plan.leidingen = [...(x.plan.leidingen ?? []).filter((l) => !l.id.startsWith(prefix)), ...lussen]; });
  const lengtes = lussen.map((l) => leidingVerloop(l, toestand().plan, tc, { vloerHoogte: vh }).lengte);
  omg?.kies(undefined);
  meld(`Vloerverwarming in ${r.naam}: ${lussen.length === 1 ? 'één lus' : `${lussen.length} lussen`} van ${lengtes.map((x) => getal(x, 0)).join(', ')} m${verdeler ? ', aangesloten op de verdeler.' : '. Er staat nog geen verdeler op deze verdieping: plaats er een (of de technische ruimte) en tik dan opnieuw op de ruimte.'}`, bij);
}

// ---------- voorbeeld onder de muis ----------

/** Het toestel dat zou komen waar de muis staat (alleen met een muis: een vinger zweeft niet). */
let voorbeeld: Toestel | undefined;

/** Het voorbeeld bijwerken; geeft true als de tekening opnieuw moet. */
export function techniekVoorbeeld(p: Punt | undefined): boolean {
  const vorig = voorbeeld;
  const t = p && gereedschap.soort === 'toestel' ? nieuwePlaats(gereedschap.type, p) : undefined;
  voorbeeld = typeof t === 'object' ? t : undefined;
  return !!vorig !== !!voorbeeld || (!!voorbeeld && (vorig!.x !== voorbeeld.x || vorig!.y !== voorbeeld.y || vorig!.draai !== voorbeeld.draai));
}

/** Het plan om te tekenen: met het voorbeeld erbij. */
export function techniekPlan(plan: Plattegrond): Plattegrond {
  return voorbeeld && aan ? { ...plan, toestellen: [...(plan.toestellen ?? []), voorbeeld] } : plan;
}

// ---------- tikken en slepen in de tekening ----------

/**
 * Een tik in de tekening met de techniek aan. Geeft 'pan' als er niets te kiezen of te plaatsen was (dan verschuift
 * slepen het beeld en kiest een tik niets meer), anders 'klaar'.
 */
export function techniekPointerDown(ev: PointerEvent, p: Punt, doel: Element): 'pan' | 'klaar' {
  const g = gereedschap;
  if (g.soort === 'toestel') { plaatsToestel(g.type, p); return 'klaar'; }
  if (g.soort === 'leiding') { leidingTik(g, p); return 'klaar'; }
  if (g.soort === 'technisch' || g.soort === 'vloerverwarming') {
    const r = ruimteOp(toestand().plan, p[0], p[1], omg?.niveau() ?? 0);
    if (!r) { meld('Tik in een ruimte.', p, true); return 'klaar'; }
    if (g.soort === 'technisch') technischeRuimte(r, p); else vloerverwarming(r, p);
    kiesGereedschap({ soort: 'kies' });
    return 'klaar';
  }
  const scherm = { x: ev.clientX, y: ev.clientY };
  const greep = doel.closest('[data-leidinggreep]') as SVGElement | null;
  const s = omg?.selectie();
  if (greep && s?.soort === 'leiding') {
    const l = toestand().plan.leidingen?.find((x) => x.id === s.id);
    const i = Number(greep.dataset.leidinggreep);
    if (l) { sleep = { soort: 'punt', id: l.id, groep: puntGroep(l, i), plan: structuredClone(toestand().plan), scherm, start: l.punten[i]!, bewogen: false }; return 'klaar'; }
  }
  // Het dichtste van de twee: een toestel, of een leiding als die duidelijk dichter ligt (6 beeldpunten), zodat je ook in
  // een volle tekening een leiding naast een toestel kunt kiezen.
  const bt = toestelBij(p), bl = leidingBij(p);
  const t = bt && (!bl || bt.d <= bl.d + 6 * (omg?.schaal() ?? 1)) ? bt.t : undefined;
  if (t) {
    omg?.kies({ soort: 'toestel', id: t.id });
    sleep = { soort: 'toestel', id: t.id, plan: structuredClone(toestand().plan), scherm, start: [t.x, t.y], bewogen: false };
    return 'klaar';
  }
  if (bl) { omg?.kies({ soort: 'leiding', id: bl.l.id }); return 'klaar'; }
  return 'pan';
}

/** Slepen (een toestel of een punt van een leiding). Geeft true als de techniek de beweging gebruikte. */
export function techniekPointerMove(ev: PointerEvent): boolean {
  if (!sleep || !omg) return false;
  const e = omg.schaal();
  const dx = (ev.clientX - sleep.scherm.x) * e, dy = (ev.clientY - sleep.scherm.y) * e;
  if (!sleep.bewogen && Math.hypot(ev.clientX - sleep.scherm.x, ev.clientY - sleep.scherm.y) < 6) return true;
  if (!sleep.bewogen) momentopname();
  sleep.bewogen = true;
  const s = sleep, oud = s.plan;
  if (s.soort === 'toestel') {
    const t0 = oud.toestellen?.find((x) => x.id === s.id), type = t0 && typeVan(t0);
    if (!t0 || !type) return true;
    let t: Toestel = { ...t0, x: omg.snap(t0.x + dx), y: omg.snap(t0.y + dy) };
    if (t.aan === 'wand' || t.aan === 'buiten') { const w = tegenWand(oud, t, type, { maxAfstand: 2000 }); if (w) t = w.toestel; }
    else if (t.aan === 'vloer') { const w = tegenWand(oud, t, type, { maxAfstand: 25 }); if (w) t = w.toestel; }
    wijzig('plan', (x) => { zetToestelMetLeidingen(x.plan, oud, t); }, { zonderOngedaan: true });
    return true;
  }
  const l0 = oud.leidingen?.find((x) => x.id === s.id);
  if (!l0) return true;
  // Een punt: op het raster, en recht met het punt ervoor of erna als dat binnen 10 beeldpunten ligt.
  let q: Punt = [omg.snap(s.start[0] + dx), omg.snap(s.start[1] + dy)];
  const groep = s.groep ?? [];
  const buren = [l0.punten[groep[0]! - 1], l0.punten[groep[groep.length - 1]! + 1]].filter((x): x is Punt => !!x);
  const marge = 10 * e;
  for (const b of buren) {
    if (Math.abs(q[0] - b[0]) < marge) q = [b[0], q[1]];
    if (Math.abs(q[1] - b[1]) < marge) q = [q[0], b[1]];
  }
  wijzig('plan', (x) => {
    const l = x.plan.leidingen?.find((y) => y.id === s.id);
    if (l) l.punten = l0.punten.map((p, i) => (groep.includes(i) ? q : p));
  }, { zonderOngedaan: true });
  return true;
}

/** Loslaten. Geeft true als de techniek aan het slepen was. */
export function techniekPointerUp(): boolean {
  if (!sleep) return false;
  sleep = undefined;
  omg?.eigenschappen();
  return true;
}
export const techniekSleept = () => !!sleep;

/** Zet een toestel op zijn nieuwe plaats; de uiteinden van de leidingen eraan gaan mee (met een knik waar nodig). */
function zetToestelMetLeidingen(plan: Plattegrond, oud: Plattegrond, t: Toestel) {
  const i = plan.toestellen?.findIndex((x) => x.id === t.id) ?? -1;
  const t0 = oud.toestellen?.find((x) => x.id === t.id);
  if (i < 0 || !t0) return;
  plan.toestellen![i] = t;
  const dx = t.x - t0.x, dy = t.y - t0.y;
  for (const l0 of oud.leidingen ?? []) {
    if (l0.van !== t.id && l0.naar !== t.id) continue;
    const begin = l0.van === t.id ? new Set(puntGroep(l0, 0)) : new Set<number>();
    const einde = l0.naar === t.id ? new Set(puntGroep(l0, l0.punten.length - 1)) : new Set<number>();
    const nieuw = verschuifLeidingPunten(l0, (p, k) => (begin.has(k) || einde.has(k) ? [p[0] + dx, p[1] + dy] : undefined));
    const j = plan.leidingen!.findIndex((x) => x.id === l0.id);
    if (j >= 0) plan.leidingen![j] = nieuw;
  }
}

/**
 * Een ruimte versleept (de plattegrond): de toestellen erin gaan mee, en wat buiten tegen haar gevel staat (een
 * buitenunit, een gevelrooster, tot 1,5 m ervan); van de leidingen de punten erin of ernaast buiten, met een knik waar een
 * stuk half meegaat. Op het plan `pl` (de toestand), vanaf `oud` (de verdieping bij het begin van het slepen).
 */
export function techniekMetRuimte(oud: Plattegrond, pl: Plattegrond, ruimteId: string, dx: number, dy: number) {
  const r0 = oud.ruimtes.find((r) => r.id === ruimteId);
  if (!r0 || (!oud.toestellen?.length && !oud.leidingen?.length)) return;
  const delen = delenVan(r0);
  const inRuimte = ([x, y]: Punt) => delen.some((q) => x > q.x && x < q.x + q.b && y > q.y && y < q.y + q.d);
  const buitenErnaast = ([x, y]: Punt) => !oud.ruimtes.some((r) => delenVan(r).some((q) => x >= q.x && x <= q.x + q.b && y >= q.y && y <= q.y + q.d))
    && delen.some((q) => x > q.x - 150 && x < q.x + q.b + 150 && y > q.y - 150 && y < q.y + q.d + 150);
  const mee = (p: Punt) => inRuimte(p) || buitenErnaast(p);
  for (const t0 of oud.toestellen ?? []) {
    if (!mee([t0.x, t0.y])) continue;
    const t = pl.toestellen?.find((x) => x.id === t0.id);
    if (t) { t.x = t0.x + dx; t.y = t0.y + dy; }
  }
  for (const l0 of oud.leidingen ?? []) {
    const nieuw = verschuifLeidingPunten(l0, (p) => (mee(p) ? [p[0] + dx, p[1] + dy] : undefined));
    const j = pl.leidingen?.findIndex((x) => x.id === l0.id) ?? -1;
    if (j >= 0 && nieuw !== l0) pl.leidingen![j] = nieuw;
  }
}

/** Een toestel of leiding verwijderen. Bij een toestel blijven de leidingen eraan staan (zonder de verwijzing). */
export function verwijderTechniek(t: Toestand, s: TechniekSelectie): string {
  if (s.soort === 'leiding') {
    t.plan.leidingen = t.plan.leidingen?.filter((l) => l.id !== s.id);
    if (!t.plan.leidingen?.length) delete t.plan.leidingen;
    return '';
  }
  t.plan.toestellen = t.plan.toestellen?.filter((x) => x.id !== s.id);
  if (!t.plan.toestellen?.length) delete t.plan.toestellen;
  let n = 0;
  for (const l of t.plan.leidingen ?? []) {
    if (l.van === s.id) { delete l.van; n++; }
    if (l.naar === s.id) { delete l.naar; n++; }
  }
  return n ? `Verwijderd. ${n === 1 ? 'Eén leiding hing eraan: ze blijft' : `${n} leidingen hingen eraan: ze blijven`} staan (zie de controles).` : '';
}

/** Pijltjes: een toestel 5 cm (met Shift 1 cm) verschuiven; aan een wand blijft het tegen de wand. */
export function verschuifToestel(id: string, dx: number, dy: number) {
  const plan = toestand().plan, t0 = plan.toestellen?.find((x) => x.id === id), type = t0 && typeVan(t0);
  if (!t0 || !type) return;
  let t: Toestel = { ...t0, x: t0.x + dx, y: t0.y + dy };
  if (t.aan === 'wand' || t.aan === 'buiten') { const w = tegenWand(plan, t, type, { maxAfstand: 2000 }); if (w) t = w.toestel; }
  const oud = structuredClone(plan);
  wijzig('plan', (x) => zetToestelMetLeidingen(x.plan, oud, t));
}

/** Q of *Draaien 90°*: een toestel dat niet aan een wand hangt, een kwartslag draaien. */
export function draaiToestel(id: string) {
  zetToestel(id, (t) => { if (t.aan !== 'wand') t.draai = (Math.round(t.draai / 90) * 90 + 90) % 360; });
}

// ---------- grepen op de tekening ----------

/**
 * Na het tekenen: de grepen op de punten van een gekozen leiding (een tikvlak van 44 beeldpunten), en een ring rond het
 * begin van een leiding die getrokken wordt.
 */
export function techniekNaTekenen() {
  const svg = omg?.svg();
  if (!svg || !aan || !omg) return;
  const e = omg.schaal(), ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('data-soort', 'techniekgrepen');
  const cirkel = (x: number, y: number, r: number, attrs: Record<string, string>) => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', String(x));
    c.setAttribute('cy', String(y));
    c.setAttribute('r', String(r));
    for (const [k, v] of Object.entries(attrs)) c.setAttribute(k, v);
    g.append(c);
    return c;
  };
  const s = omg.selectie();
  // Het vak van het palet op de voorgrond, de andere lichter (en wat gekozen is, altijd vol): zo blijft het plan per vak leesbaar.
  const plan = toestand().plan;
  const vakVan = new Map<string, TechniekVak | undefined>([
    ...(plan.toestellen ?? []).map((t): [string, TechniekVak | undefined] => [`toestel:${t.id}`, typeVan(t)?.vak]),
    ...(plan.leidingen ?? []).map((x): [string, TechniekVak | undefined] => [`leiding:${x.id}`, tc.leidingen[x.soort]?.vak]),
  ]);
  for (const d of svg.querySelectorAll<SVGElement>('[data-soort="toestel"][data-id], [data-soort="leiding"][data-id]')) {
    const sleutel = `${d.dataset.soort}:${d.dataset.id}`, v = vakVan.get(sleutel);
    if (v && v !== vak && !(s && `${s.soort}:${s.id}` === sleutel)) d.setAttribute('opacity', '0.3');
  }
  const l = s?.soort === 'leiding' ? plan.leidingen?.find((x) => x.id === s.id) : undefined;
  // Een lus vloerverwarming heeft geen grepen (een zigzag om de 15 cm): die leg je opnieuw met een tik op de ruimte.
  if (l && gereedschap.soort === 'kies' && l.soort !== 'vloerverwarming') {
    const getoond: Punt[] = [];
    // Een uiteinde aan een toestel heeft geen greep: het volgt het toestel (sleep het toestel).
    const vast = new Set([...(l.van ? puntGroep(l, 0) : []), ...(l.naar ? puntGroep(l, l.punten.length - 1) : [])]);
    for (let i = 0; i < l.punten.length; i++) {
      if (vast.has(i) || (i > 0 && puntGroep(l, i)[0] !== i)) continue;
      const [x, y] = l.punten[i]!;
      // Niet twee grepen op elkaar: minstens 26 beeldpunten ertussen.
      if (getoond.some((q) => Math.hypot(q[0] - x, q[1] - y) < 26 * e)) continue;
      getoond.push([x, y]);
      cirkel(x, y, 7 * e, { fill: '#fff', stroke: '#2f6fd0', 'stroke-width': '2.5', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' });
      cirkel(x, y, 22 * e, { fill: 'transparent', 'data-leidinggreep': String(i), style: 'cursor:move' });
    }
  }
  if (voorbeeld && gereedschap.soort === 'toestel') {
    cirkel(voorbeeld.x, voorbeeld.y, 18 * e, { fill: 'none', stroke: '#2f6fd0', 'stroke-width': '2', 'stroke-dasharray': '4 4', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' });
  }
  if (gereedschap.soort === 'leiding' && gereedschap.van) {
    const [x, y] = gereedschap.van.punt;
    cirkel(x, y, 16 * e, { fill: 'none', stroke: tc.leidingen[gereedschap.leiding]?.kleur ?? '#2f6fd0', 'stroke-width': '3', 'stroke-dasharray': '5 4', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' });
  }
  if (g.childElementCount) svg.append(g);
}

// ---------- de maatvraag na het plaatsen ----------

/** De maten van een toestel: van de hoek tot het midden langs zijn wand (of van de muren bij een toestel aan het plafond) en de hoogte. */
export function vraagToestel(id: string) {
  const plan = toestand().plan, t0 = plan.toestellen?.find((x) => x.id === id), type = t0 && typeVan(t0);
  if (!t0 || !type) return;
  const vlak = toestelVlak(plan, t0, type);
  const metHoogte = t0.aan === 'wand' || t0.aan === 'buiten';
  const titel = `${kortLabel(type.label)}: maten`;
  const hoogteVeld = metHoogte ? [{ code: 'hoogte', label: 'Hoogte', waarde: t0.hoogte, min: 0, max: t0.aan === 'wand' ? plan.muurhoogte - toestelMaten(type, t0.aan).h : 600 }] : [];
  // Telkens vanaf het plan zoals het nu is (na Esc of een maat die niet kon, is het plan van daarnet teruggezet).
  const zet = (f: (t: Toestel) => Toestel) => wijzig('plan', (x) => {
    if (x.plan.toestellen?.some((y) => y.id === id)) zetToestelMetLeidingen(x.plan, structuredClone(x.plan), f({ ...t0 }));
  }, { zonderOngedaan: true });
  if (vlak) {
    const [a, b] = vlak.namen;
    const half = toestelMaten(type, t0.aan).b / 2;
    // Gemeten vanaf de dichtste hoek; het veld toont de afstand vanaf die hoek (en na een andere kant: vanaf de andere,
    // voor het toestel zoals het nu staat).
    const kant = vlak.s <= vlak.lengte / 2 ? 'van' : 'tot';
    const sNu = () => {
      const t = toestand().plan.toestellen?.find((y) => y.id === id) ?? t0;
      return (t.x - vlak.van[0]) * vlak.u[0] + (t.y - vlak.van[1]) * vlak.u[1];
    };
    vraagMaat({
      titel,
      velden: [{ code: 'afstand', label: 'Van de hoek', waarde: r1(kant === 'tot' ? vlak.lengte - vlak.s : vlak.s), min: half, max: vlak.lengte - half }, ...hoogteVeld],
      kanten: { label: `Gemeten vanaf de hoek${vlak.buiten ? ' (van buiten gezien)' : ''}`, opties: [['van', a], ['tot', b]], gekozen: kant },
      bijKant: (k) => ({ afstand: r1(k === 'tot' ? vlak.lengte - sNu() : sNu()) }),
      uitleg: `Van het ${vlak.buiten ? 'buitenvlak van de hoek van de gevel' : 'binnenvlak van de hoek'} tot het midden van het toestel${metHoogte ? '; de hoogte is de onderkant boven de afgewerkte vloer' : ''}. Richtwaarden: de installateur beslist.`,
      meteenTypen: false,
      toepassen: (w, k, eerste) => {
        const s = k === 'tot' ? vlak.lengte - w.afstand! : w.afstand!;
        if (eerste) momentopname();
        zet((t) => ({ ...opToestelVlak(t, vlak, s), ...(metHoogte ? { hoogte: w.hoogte! } : {}) }));
        return undefined;
      },
      terug: () => ongedaan(),
    });
    return;
  }
  // Aan het plafond of los op de vloer: van de muur links en de muur boven (het binnenvlak van de ruimte), tot het midden.
  const r = ruimteOp(plan, t0.x, t0.y, niveauVan(t0));
  if (!r) return;
  const muren = murenVan(niveauPlan(plan, niveauVan(r)));
  const deel = delenVan(r).find((q) => t0.x >= q.x && t0.x <= q.x + q.b && t0.y >= q.y && t0.y <= q.y + q.d) ?? delenVan(r)[0]!;
  const v = binnenVorm(vormVanDeel(deel), muren);
  const x0 = Math.min(...v.map((q) => q[0])), y0 = Math.min(...v.map((q) => q[1]));
  vraagMaat({
    titel,
    velden: [{ code: 'links', label: 'Van links', waarde: r1(t0.x - x0), min: 0 }, { code: 'boven', label: 'Van boven', waarde: r1(t0.y - y0), min: 0 }, ...hoogteVeld],
    uitleg: `Van het binnenvlak van de muur links en de muur boven (op de tekening) in ${r.naam} tot het midden van het toestel.`,
    meteenTypen: false,
    toepassen: (w, _k, eerste) => {
      if (!ruimteOp(plan, x0 + w.links!, y0 + w.boven!, niveauVan(r))) return 'Zo komt het buiten de ruimte.';
      if (eerste) momentopname();
      zet((t) => ({ ...t, x: r1(x0 + w.links!), y: r1(y0 + w.boven!) }));
      return undefined;
    },
    terug: () => ongedaan(),
  });
}

// ---------- het palet (in plaats van het gereedschap) ----------

/** Terug naar Selecteren in de techniek (Esc). */
export function techniekSelecteren() {
  gereedschap = { soort: 'kies' };
  toonPalet();
}

/** Een toestel of leiding zichtbaar maken (een melding aangetikt): de techniek aan en zijn vak getoond. */
export function maakZichtbaar(s: TechniekSelectie) {
  const plan = toestand().plan;
  const v = s.soort === 'toestel' ? typeVan(plan.toestellen?.find((x) => x.id === s.id) ?? ({ type: '' } as Toestel))?.vak : tc.leidingen[plan.leidingen?.find((x) => x.id === s.id)?.soort ?? '']?.vak;
  if (v) zichtbaar.add(v);
  if (!aan) zetTechniek(true, { stil: true });
  else { toonPalet(); toonBalk3D(); }
}

function kiesGereedschap(g: Gereedschap) {
  gereedschap = g;
  voorbeeld = undefined;
  if (g.soort !== 'kies') { const s = omg?.selectie(); if (s?.soort === 'toestel' || s?.soort === 'leiding') omg?.kies(undefined); }
  toonPalet();
  omg?.opnieuw();
}

/** Uitleg bij het gekozen gereedschap (onder de tekening). */
export function techniekHint(): string {
  const g = gereedschap;
  if (g.soort === 'toestel') return `Tik in het plan: ${kortLabel(tc.toestellen[g.type]?.label ?? '').toLowerCase()} komt ${tc.toestellen[g.type]?.bevestiging === 'plafond' ? 'aan het plafond, op de plaats van de tik' : tc.toestellen[g.type]?.bevestiging === 'buiten' ? 'buiten tegen de dichtste gevel' : 'tegen de dichtste muur'}. Blijf tikken voor meer; Selecteren om te stoppen. Daarna kun je de maten typen (of niet).`;
  if (g.soort === 'leiding') return g.van ? 'Tik op het tweede toestel (of op een punt, bv. buiten of bij een lavabo).' : `Tik op het eerste toestel, dan op het tweede: de ${kortLabel(tc.leidingen[g.leiding]?.label ?? '').toLowerCase()} loopt langs de wanden.`;
  if (g.soort === 'technisch') return 'Tik op de berging, de garage of de ruimte waar de technische toestellen komen.';
  if (g.soort === 'vloerverwarming') return 'Tik op de ruimte die vloerverwarming krijgt.';
  return 'Tik op een toestel of leiding om het te kiezen; sleep een toestel langs de muur of een punt van een leiding. Sleep op een leeg stuk om het beeld te verschuiven.';
}

let palet: HTMLElement | undefined;

/** Een schakelaar per vak (tekening en 3D samen). */
function vakSchakelaars(): HTMLElement {
  const rij = el('div', { class: 'tvakken', role: 'group', 'aria-label': 'Welke vakken tonen' });
  for (const v of ALLE_VAKKEN) {
    const b = el('button', { type: 'button', 'data-techniek-vak': v, 'aria-pressed': String(zichtbaar.has(v)), title: `${TECHNIEK_VAKKEN[v].label} tonen of verbergen` });
    const stip = el('span', { class: 'tstip' });
    stip.style.background = TECHNIEK_VAKKEN[v].kleur;
    b.append(stip, el('span', {}, TECHNIEK_VAKKEN[v].label));
    b.addEventListener('click', () => {
      if (zichtbaar.has(v)) zichtbaar.delete(v); else zichtbaar.add(v);
      const s = omg?.selectie();
      if (s && !zichtbaarDing(s)) omg?.kies(undefined);
      toonPalet();
      toonBalk3D();
      omg?.opnieuw();
      omg?.drieD();
    });
    rij.append(b);
  }
  return rij;
}
function zichtbaarDing(s: { soort: string; id: string }): boolean {
  const plan = toestand().plan;
  if (s.soort === 'toestel') { const t = plan.toestellen?.find((x) => x.id === s.id); return !!t && zichtbaar.has(typeVan(t)?.vak ?? 'elektriciteit'); }
  if (s.soort === 'leiding') { const l = plan.leidingen?.find((x) => x.id === s.id); return !!l && zichtbaar.has(tc.leidingen[l.soort]?.vak ?? 'elektriciteit'); }
  return true;
}

/** Het palet: per vak de toestellen (met hun teken) en de leidingen, de technische ruimte en de vloerverwarming in één tik, de vakken aan en uit, een voorbeeld. */
export function toonPalet() {
  if (!palet) return;
  palet.hidden = !aan;
  if (!aan) { palet.replaceChildren(); return; }
  const kop = el('div', { class: 'knoppenrij tkop' });
  const terug = el('button', { type: 'button', class: 'tweede', 'data-techniek-uit': '', title: 'Terug naar het gereedschap' }, '← Terug');
  terug.addEventListener('click', () => zetTechniek(false));
  const kies = el('button', { type: 'button', 'data-techniek-kies': '', 'aria-pressed': String(gereedschap.soort === 'kies') }, 'Selecteren');
  kies.addEventListener('click', () => kiesGereedschap({ soort: 'kies' }));
  kop.append(terug, kies);
  const tabs = el('div', { class: 'tabs tvaktabs', role: 'group', 'aria-label': 'Vak' });
  for (const v of ALLE_VAKKEN) {
    const b = el('button', { type: 'button', 'data-techniek-tab': v, 'aria-pressed': String(v === vak) }, TECHNIEK_VAKKEN[v].label);
    b.style.setProperty('--vak', TECHNIEK_VAKKEN[v].kleur);
    b.addEventListener('click', () => { vak = v; toonPalet(); omg?.opnieuw(); });
    tabs.append(b);
  }
  const toestellen = el('div', { class: 'ttegels', role: 'group', 'aria-label': 'Toestellen' });
  for (const [code, type] of Object.entries(tc.toestellen).filter(([, x]) => x.vak === vak)) {
    const actief = gereedschap.soort === 'toestel' && gereedschap.type === code;
    const b = el('button', { type: 'button', class: 'ttegel', 'data-toestel': code, 'aria-pressed': String(actief), title: `${type.label}${type.uitleg ? `: ${type.uitleg}` : ''}` });
    const beeld = el('span', { class: 'tbeeld' });
    beeld.innerHTML = toestelTekenBeeld(type, 36);
    b.append(beeld, el('span', {}, kortLabel(type.label)));
    b.addEventListener('click', () => kiesGereedschap(actief ? { soort: 'kies' } : { soort: 'toestel', type: code }));
    toestellen.append(b);
  }
  const leidingen = el('div', { class: 'ttegels leidingen', role: 'group', 'aria-label': 'Leidingen' });
  for (const [code, soort] of Object.entries(tc.leidingen).filter(([, x]) => x.vak === vak)) {
    const actief = gereedschap.soort === 'leiding' && gereedschap.leiding === code;
    const b = el('button', { type: 'button', class: 'ttegel', 'data-leiding': code, 'aria-pressed': String(actief), title: soort.label });
    const lijn = el('span', { class: 'tlijn' });
    lijn.style.background = soort.kleur;
    if (soort.hoogte === 'vloer') lijn.classList.add('vloer');
    b.append(lijn, el('span', {}, kortLabel(soort.label)));
    b.addEventListener('click', () => kiesGereedschap(actief ? { soort: 'kies' } : { soort: 'leiding', leiding: code }));
    leidingen.append(b);
  }
  const een = el('div', { class: 'ttegels' });
  const tr = el('button', { type: 'button', class: 'ttegel', 'data-techniek-een': 'technisch', 'aria-pressed': String(gereedschap.soort === 'technisch'), title: TECHNISCHE_RUIMTE.map((x) => tc.toestellen[x]?.label).join(', ') }, 'Technische ruimte');
  tr.addEventListener('click', () => kiesGereedschap(gereedschap.soort === 'technisch' ? { soort: 'kies' } : { soort: 'technisch' }));
  const vv = el('button', { type: 'button', class: 'ttegel', 'data-techniek-een': 'vloerverwarming', 'aria-pressed': String(gereedschap.soort === 'vloerverwarming') }, 'Vloerverwarming');
  vv.title = 'Vloerverwarming in een ruimte: tik daarna op de ruimte';
  vv.addEventListener('click', () => kiesGereedschap(gereedschap.soort === 'vloerverwarming' ? { soort: 'kies' } : { soort: 'vloerverwarming' }));
  een.append(tr, vv);
  const voorbeeld = el('button', { type: 'button', class: 'tweede', 'data-techniek-voorbeeld': '' }, 'Voorbeeld openen: woning met techniek');
  voorbeeld.addEventListener('click', openVoorbeeld);
  // Wat je het meest nodig hebt bovenaan, zodat het naast de tekening staat, ook op een tablet liggend (doorloop A6): de
  // technische ruimte en de vloerverwarming (in één tik, voor elk vak), de vakken, de leidingen (smalle tegels met een
  // streep in hun kleur) en dan de toestellen (met hun teken); zonder koppen ertussen, de tegels zeggen zelf wat ze zijn.
  // Tonen, het voorbehoud en het voorbeeld onderaan.
  palet.replaceChildren(
    kop,
    el('p', { class: 'tsub', title: 'Kies, en tik dan op de ruimte' }, 'In één tik, op een ruimte'), een,
    tabs,
    leidingen, toestellen,
    el('p', { class: 'tsub' }, 'Tonen (het vak hierboven staat op de voorgrond, de andere lichter)'), vakSchakelaars(),
    el('p', { class: 'voorbehoud' }, TECHNIEK_VOORBEHOUD),
    voorbeeld,
  );
  const hint = document.getElementById('pl-hint');
  if (hint) hint.textContent = techniekHint();
}

/** De uitgeruste voorbeeldwoning als nieuw project (het huidige project blijft bij Projecten). */
function openVoorbeeld() {
  const v = voorbeeldToestand(), u = uitgerusteWoning();
  nieuwProject({ ...v, plan: u.plan, posities: u.posities }, 'Voorbeeldwoning met techniek');
  zichtbaar.clear();
  for (const x of ALLE_VAKKEN) zichtbaar.add(x);
  vak = 'elektriciteit';
  zetTechniek(true, { stil: true });
  omg?.gewisseld();
  meld('Voorbeeldwoning met techniek geopend als nieuw project (het vorige staat bij Projecten). Alles is verzonnen en door geen installateur nagelezen.');
}

// ---------- de 3D ----------

let balk3D: HTMLElement | undefined;
let tab3D: HTMLButtonElement | undefined;
const TIKHINT = 'Tik op een toestel of een leiding om het te wijzigen.';

/** De knop *Techniek* bij Afgewerkt en Constructie, en de balk eronder (in de woning of uitgezet, de vakken). */
export function toonBalk3D() {
  if (tab3D) {
    tab3D.hidden = !aan && !heeftTechniek();
    tab3D.setAttribute('aria-pressed', String(aan));
    // Met de techniek uit: hoeveel er is, zodat je ziet dat er iets te zien is (in Afgewerkt staat de techniek niet).
    const plan = toestand().plan, n = (plan.toestellen?.length ?? 0) + (plan.leidingen?.length ?? 0);
    tab3D.textContent = !aan && n ? `Techniek (${n})` : 'Techniek';
    // Afgewerkt en Constructie: niet ingedrukt terwijl de techniek aan staat; daarna weer zoals de constructie staat.
    const nu = aan ? 'techniek' : constructieAan() ? 'constructie' : 'afgewerkt';
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-3d-weergave]')) b.setAttribute('aria-pressed', String(b.dataset['3dWeergave'] === nu));
  }
  const hint = document.querySelector<HTMLElement>('#pl-3d-knoppen .tikhint');
  if (hint && !aan && hint.textContent === TIKHINT) hint.textContent = hint.dataset.afgewerkt ?? '';
  if (!balk3D) return;
  balk3D.hidden = !aan;
  if (!aan) return;
  const weergave = el('div', { class: 'tabs', role: 'group', 'aria-label': 'Techniek in de 3D' });
  for (const [w, label, uitleg] of [['woning', 'In de woning', 'De verdieping waarop je werkt, met lage muren en zonder dak, en de installaties op hun plaats (een leiding in de muur zit erin verstopt, een leiding in de vloer ligt erop)'], ['uitgezet', 'Uitgezet', 'De woning als lage wanden en lijnen, zodat je de installaties ziet']] as const) {
    const b = el('button', { type: 'button', 'data-techniek-3d': w, 'aria-pressed': String((w === 'uitgezet') === uitgezet), title: uitleg }, label);
    b.addEventListener('click', () => { uitgezet = w === 'uitgezet'; toonBalk3D(); omg?.drieD(); });
    weergave.append(b);
  }
  balk3D.replaceChildren(weergave, vakSchakelaars(), el('p', { class: 'voorbehoud' }, TECHNIEK_VOORBEHOUD));
  if (hint) {
    hint.dataset.afgewerkt ??= hint.textContent ?? '';
    hint.textContent = TIKHINT;
  }
}

// ---------- eigenschappen (rechts) ----------

function knop(tekst: string, f: () => void, cls = 'tweede', data: Record<string, string> = {}): HTMLButtonElement {
  const b = el('button', { type: 'button', class: cls, ...data }, tekst) as HTMLButtonElement;
  b.addEventListener('click', f);
  return b;
}

function cmMaat(label: string, waarde: number, bij: (w: number) => void, min = 0): HTMLElement {
  const wrap = el('label', { class: 'maatveld' });
  const i = cmVeld(waarde, { 'aria-label': `${label} in cm`, enterkeyhint: 'done' });
  i.addEventListener('change', () => {
    const w = leesCm(i.value, waarde);
    if (w === undefined || w < min) { meld(w === undefined ? `"${i.value}" is geen maat: typ bv. 30 of 1,1 m.` : `${label}: minstens ${min} cm.`); return; }
    if (Math.abs(w - waarde) >= 0.05) bij(w);
  });
  i.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); i.blur(); } });
  wrap.append(el('span', {}, label), i, el('span', { class: 'eenheid' }, 'cm'));
  return wrap;
}

/** Eigenschappen van een gekozen toestel of leiding. Geeft false als het niet (meer) bestaat. */
export function toonTechniekEigenschappen(vakEl: HTMLElement, s: TechniekSelectie, verwijder: () => void): boolean {
  const plan = toestand().plan;
  if (s.soort === 'toestel') {
    const t = plan.toestellen?.find((x) => x.id === s.id), type = t && typeVan(t);
    if (!t || !type) return false;
    const r = ruimteOp(plan, t.x, t.y, niveauVan(t));
    const h = el('h3', {}, type.label);
    vakEl.append(h, el('p', { class: 'klein' }, `${TECHNIEK_VAKKEN[type.vak].label} · ${BEVESTIGING[t.aan] ?? t.aan}${r ? ` · ${r.naam}` : ''}`));
    const maten = el('div', { class: 'maten' });
    if (t.aan === 'wand' || t.aan === 'buiten') maten.append(cmMaat('Hoogte (onderkant)', t.hoogte, (w) => zetToestel(t.id, (x) => { x.hoogte = w; })));
    const vlak = toestelVlak(plan, t, type);
    if (vlak) {
      const oud = structuredClone(plan);
      const [a, b] = vlak.namen;
      maten.append(
        cmMaat(`Van de hoek ${a}`, vlak.s, (w) => wijzig('plan', (x) => zetToestelMetLeidingen(x.plan, oud, opToestelVlak(t, vlak, w)))),
        cmMaat(`Van de hoek ${b}`, vlak.lengte - vlak.s, (w) => wijzig('plan', (x) => zetToestelMetLeidingen(x.plan, oud, opToestelVlak(t, vlak, vlak.lengte - w)))),
      );
    }
    if (maten.childElementCount) vakEl.append(maten);
    if (vlak) vakEl.append(el('p', { class: 'klein' }, `Tot het midden van het toestel, langs ${vlak.buiten ? 'de gevel (van buiten gezien)' : 'het binnenvlak van de muur'}.`));
    const m = toestelMaten(type, t.aan);
    const vrij = type.vrij ? Object.entries(type.vrij).filter(([, x]) => x).map(([k, x]) => `${k} ${x} cm`).join(', ') : '';
    vakEl.append(el('p', { class: 'klein' }, `${getal(m.b)} × ${getal(m.d)} × ${getal(m.h)} cm (breed × diep × hoog)${vrij ? ` · vrij te houden: ${vrij}` : ''}. Richtwaarden, door geen installateur nagelezen.`));
    if (type.uitleg) vakEl.append(el('p', { class: 'klein' }, type.uitleg));
    const rij = el('div', { class: 'knoppenrij' });
    rij.append(knop('Maten typen', () => vraagToestel(t.id), 'tweede', { 'data-toestel-maten': '' }));
    if (t.aan !== 'wand') rij.append(knop('Draaien 90° (Q)', () => draaiToestel(t.id)));
    rij.append(knop('Verwijderen', verwijder, 'gevaar'));
    vakEl.append(rij);
    const aantal = (plan.leidingen ?? []).filter((l) => l.van === t.id || l.naar === t.id).length;
    vakEl.append(el('p', { class: 'klein' }, aantal ? `${aantal} leiding${aantal === 1 ? '' : 'en'} hang${aantal === 1 ? 't' : 'en'} eraan en ga${aantal === 1 ? 'at' : 'an'} mee als je het toestel versleept.` : 'Tip: sleep het toestel langs de muur, of tik op een leiding in het palet om er een aan te trekken.'));
    return true;
  }
  const l = plan.leidingen?.find((x) => x.id === s.id), soort = l && tc.leidingen[l.soort];
  if (!l || !soort) return false;
  const verloop = leidingVerloop(l, plan, tc, { vloerHoogte: (k) => vloerHoogte(plan, k) });
  const toestel = (id?: string) => (id ? plan.toestellen?.find((x) => x.id === id) : undefined);
  const van = toestel(l.van), naar = toestel(l.naar);
  vakEl.append(el('h3', {}, soort.label));
  vakEl.append(el('p', { class: 'klein' }, `${TECHNIEK_VAKKEN[soort.vak].label}${l.kring ? ` · ${l.kring}` : ''} · ${getal(verloop.lengte, 1)} m (op het plan ${getal(verloop.lengtePlan, 1)} m, de rest op en neer)${van || naar ? ` · van ${van ? naamVan(van).toLowerCase() : 'een punt'} naar ${naar ? naamVan(naar).toLowerCase() : 'een punt'}` : ''}`));
  const nu = l.hoogtes ? '' : typeof l.hoogte === 'number' ? '' : l.hoogte;
  const ligging = el('div', { class: 'tabs', role: 'group', 'aria-label': 'Waar de leiding loopt' });
  for (const [w, label] of LIGGING) {
    const b = el('button', { type: 'button', 'data-ligging': String(w), 'aria-pressed': String(nu === w) }, label);
    b.addEventListener('click', () => zetLeiding(l.id, (x) => { x.hoogte = w; delete x.hoogtes; }));
    ligging.append(b);
  }
  vakEl.append(el('p', { class: 'klein' }, l.hoogtes ? 'Waar ze loopt: een eigen hoogte per punt (een stuk op of neer). Een keuze hieronder zet alle punten op die hoogte.' : typeof l.hoogte === 'number' ? `Waar ze loopt: op ${cm(l.hoogte)} boven de vloer.` : 'Waar ze loopt'), ligging);
  if (soort.maten.length > 1) {
    const s2 = el('select', { 'aria-label': 'Maat', 'data-leiding-maat': '' }) as HTMLSelectElement;
    soort.maten.forEach((m, i) => s2.append(el('option', { value: String(i) }, maatTekst(soort, m))));
    const huidig = maatVan(l, soort);
    s2.value = String(Math.max(0, soort.maten.findIndex((m) => JSON.stringify(m) === JSON.stringify(huidig))));
    s2.addEventListener('change', () => zetLeiding(l.id, (x) => { const m = soort.maten[Number(s2.value)]; if (m !== undefined) x.maat = m; }));
    const rij = el('label', { class: 'eig' });
    rij.append(el('span', {}, 'Maat'), s2);
    vakEl.append(rij);
  } else vakEl.append(el('p', { class: 'klein' }, `Maat: ${maatTekst(soort, maatVan(l, soort))}`));
  const naam = el('input', { type: 'text', 'aria-label': 'Naam of kring', placeholder: 'bv. kring 3' }) as HTMLInputElement;
  naam.value = l.kring ?? '';
  naam.addEventListener('change', () => zetLeiding(l.id, (x) => { if (naam.value.trim()) x.kring = naam.value.trim(); else delete x.kring; }));
  const nr = el('label', { class: 'eig' });
  nr.append(el('span', {}, 'Kring'), naam);
  vakEl.append(nr);
  if (soort.maxLengte && verloop.lengte > soort.maxLengte.waarde) vakEl.append(el('p', { class: 'kleinmelding waarschuwing' }, `Langer dan ${soort.maxLengte.waarde} m (${soort.maxLengte.uitleg ?? 'richtwaarde'}).`));
  const rij = el('div', { class: 'knoppenrij' });
  if (l.punten.length >= 2) rij.append(knop('Opnieuw langs de wanden', () => {
    const plan2 = toestand().plan;
    const a = l.punten[0]!, b = l.punten[l.punten.length - 1]!;
    const punten = leidingLangsWanden(plan2, van ? [van.x, van.y] : a, naar ? [naar.x, naar.y] : b, { niveau: niveauVan(l), afstand: 5 });
    zetLeiding(l.id, (x) => { x.punten = punten; delete x.hoogtes; });
  }));
  rij.append(knop('Verwijderen', verwijder, 'gevaar'));
  vakEl.append(rij, el('p', { class: 'klein' }, l.soort === 'vloerverwarming'
    ? 'Een lus leg je opnieuw met Vloerverwarming in een ruimte (en een tik op de ruimte).'
    : 'Tip: sleep een punt (de bolletjes) om de leiding anders te leggen; het kleeft recht met het punt ernaast.'));
  return true;
}

/** Zonder keuze, met de techniek aan: wat er staat en wat je kunt doen (in plaats van de gegevens van de woning). */
export function toonTechniekZonderKeuze(vakEl: HTMLElement) {
  const plan = toestand().plan, n = omg?.niveau() ?? 0;
  const t = (plan.toestellen ?? []).filter((x) => niveauVan(x) === n).length, l = (plan.leidingen ?? []).filter((x) => niveauVan(x) === n).length;
  vakEl.append(el('h3', {}, 'Techniek'), el('p', { class: 'klein' }, `Op deze verdieping: ${t} toestel${t === 1 ? '' : 'len'} en ${l} leiding${l === 1 ? '' : 'en'}. Tik op een toestel of leiding om het te wijzigen. De telling per vak staat in het overzicht.`), el('p', { class: 'klein voorbehoud' }, TECHNIEK_VOORBEHOUD));
}

// ---------- tik in de 3D: het keuzepaneel van een toestel of leiding ----------

/** Titel van een toestel of leiding in de 3D. */
export function techniekTitel(ding: string): string {
  const [soort, id] = ding.split(':');
  const plan = toestand().plan;
  if (soort === 'toestel') return naamVan(plan.toestellen?.find((x) => x.id === id));
  if (soort === 'leiding') { const l = plan.leidingen?.find((x) => x.id === id); return l ? tc.leidingen[l.soort]?.label ?? l.soort : ''; }
  return '';
}

/** De keuzes van een toestel of leiding na een tik in de 3D. */
export function techniekDingKeuzes(vakEl: HTMLElement, ding: string, nav: { sluit: () => void }) {
  const [soort, id = ''] = ding.split(':') as ['toestel' | 'leiding', string];
  const plan = toestand().plan;
  if (soort === 'toestel') {
    const t = plan.toestellen?.find((x) => x.id === id), type = t && typeVan(t);
    if (!t || !type) return;
    vakEl.append(el('p', { class: 'klein' }, `${TECHNIEK_VAKKEN[type.vak].label} · ${BEVESTIGING[t.aan] ?? t.aan}${t.aan === 'wand' || t.aan === 'buiten' ? ` · onderkant op ${cm(t.hoogte)}` : ''}`));
    if (t.aan === 'wand' || t.aan === 'buiten') {
      const rij = el('div', { class: 'knoppenrij' });
      rij.append(knop('10 cm lager', () => zetToestel(id, (x) => { x.hoogte = Math.max(0, x.hoogte - 10); }), 'tweede', { 'data-toestel-hoogte': '-10' }), knop('10 cm hoger', () => zetToestel(id, (x) => { x.hoogte += 10; }), 'tweede', { 'data-toestel-hoogte': '10' }));
      vakEl.append(rij);
    }
  } else {
    const l = plan.leidingen?.find((x) => x.id === id), ls = l && tc.leidingen[l.soort];
    if (!l || !ls) return;
    const lengte = leidingVerloop(l, plan, tc, { vloerHoogte: (k) => vloerHoogte(plan, k) }).lengte;
    vakEl.append(el('p', { class: 'klein' }, `${TECHNIEK_VAKKEN[ls.vak].label} · ${maatTekst(ls, maatVan(l, ls))} · ${getal(lengte, 1)} m${l.kring ? ` · ${l.kring}` : ''}`));
    const ligging = el('div', { class: 'tabs', role: 'group', 'aria-label': 'Waar de leiding loopt' });
    for (const [w, label] of LIGGING) {
      const b = el('button', { type: 'button', 'data-ligging': String(w), 'aria-pressed': String(!l.hoogtes && l.hoogte === w) }, label);
      b.addEventListener('click', () => zetLeiding(id, (x) => { x.hoogte = w; delete x.hoogtes; }));
      ligging.append(b);
    }
    vakEl.append(ligging);
  }
  const rij = el('div', { class: 'knoppenrij' });
  rij.append(
    knop('In de plattegrond', () => omg?.naarPlan({ soort, id }), 'tweede', { 'data-techniek-naarplan': '' }),
    knop('Verwijderen', () => { wijzig('plan', (x) => { verwijderTechniek(x, { soort, id }); }); nav.sluit(); }, 'gevaar'),
  );
  vakEl.append(rij);
}

// ---------- het overzicht: de telling ----------

const telKop = 'Vak\tWat\tMaat\tAantal\tLengte (m)';
function telRij(r: TechniekRegel): [string, string, string, string, string] {
  return [TECHNIEK_VAKKEN[r.groep].label, r.label, r.doorsnede ?? '', String(r.aantal), r.lengte !== undefined ? getal(r.lengte, 1) : ''];
}

/** De telling als tekst om te kopiëren (tabs tussen de kolommen: plakt als tabel in Excel). */
export function techniekTekst(regels: TechniekRegel[]): string {
  return `Techniek: telling per vak (netto, zonder prijzen)\n${TECHNIEK_VOORBEHOUD}\n\n${telKop}\n${regels.map((r) => telRij(r).join('\t')).join('\n')}\n`;
}

const open = new Set<string>();

/** De kaart *Techniek* in het overzicht (alleen als het plan techniek heeft); de telling klapt open en rekent pas dan. */
export function toonTechniekOverzicht() {
  let kaart = document.getElementById('o-techniek');
  const plan = toestand().plan;
  if (!heeftTechniek(plan)) { if (kaart) kaart.hidden = true; return; }
  if (!kaart) {
    kaart = el('section', { class: 'kaart alleen-woning', id: 'o-techniek', 'aria-label': 'Techniek' });
    (document.getElementById('o-constructie') ?? document.getElementById('o-regels-kaart'))?.after(kaart);
  }
  kaart.hidden = false;
  const nt = plan.toestellen?.length ?? 0, nl = plan.leidingen?.length ?? 0;
  const kop = el('div', { class: 'kaartkop' });
  kop.append(el('h2', {}, 'Techniek'), el('span', { class: 'klein' }, `${nt} toestel${nt === 1 ? '' : 'len'} · ${nl} leiding${nl === 1 ? '' : 'en'}`));
  const d = el('details', { class: 'constructiedeel', id: 'o-techniek-telling' }) as HTMLDetailsElement;
  const s = el('summary');
  s.append(el('span', {}, 'Telling per vak'), el('span', { class: 'klein' }, 'aantallen toestellen en lopende meters leiding, zonder prijzen'));
  const vakEl = el('div', { class: 'constructieinhoud' });
  d.append(s, vakEl);
  d.open = open.has('telling');
  d.addEventListener('toggle', () => { if (d.open) { open.add('telling'); if (!vakEl.childElementCount) vulTelling(vakEl); } else open.delete('telling'); });
  if (d.open) vulTelling(vakEl);
  kaart.replaceChildren(kop, el('p', { class: 'klein voorbehoud' }, TECHNIEK_VOORBEHOUD), d);
}

function vulTelling(vakEl: HTMLElement) {
  const plan = toestand().plan;
  // Alleen het nieuwe werk (ronde 11): de techniek in een bestaande ruimte blijft en telt niet mee.
  const regels = telTechniek(nieuweTechniek(plan), tc, { vloerHoogte: (k) => vloerHoogte(plan, k) });
  const tabel = el('table', { class: 'meetstaat' });
  tabel.innerHTML = '<thead><tr><th>Wat</th><th>Maat</th><th class="num">Aantal</th><th class="num">Lengte</th></tr></thead>';
  const body = el('tbody');
  let groep = '';
  for (const r of regels) {
    if (r.groep !== groep) {
      groep = r.groep;
      const tr = el('tr', { class: 'groep' });
      tr.append(el('th', { colspan: '4' }, TECHNIEK_VAKKEN[r.groep].label));
      body.append(tr);
    }
    const tr = el('tr');
    tr.append(el('td', {}, r.label), el('td', {}, r.doorsnede ?? ''), el('td', { class: 'num' }, r.soort === 'toestel' ? `${r.aantal} st.` : `${r.aantal} ×`), el('td', { class: 'num' }, r.lengte !== undefined ? `${getal(r.lengte, 1)} m` : ''));
    body.append(tr);
  }
  tabel.append(body);
  const houder = el('div', { class: 'tabelhouder' });
  houder.append(tabel);
  const melding = el('span', { class: 'klein', role: 'status' });
  const kn = el('button', { type: 'button', class: 'tweede', id: 'o-techniek-kopieer' }, 'Kopieer de telling');
  kn.addEventListener('click', () => kopieer(techniekTekst(regels), melding));
  const acties = el('div', { class: 'acties' });
  acties.append(kn, melding);
  vakEl.append(el('p', { class: 'voorbehoud' }, `${TECHNIEK_VOORBEHOUD} Netto: zonder snijverlies; een leiding telt ook de stukken op en neer naar de toestellen.`), houder, acties);
}

// ---------- start ----------

/** Eén keer bij het starten van de plattegrond: het palet in de kaart van het gereedschap, de knop en de balk bij de 3D. */
export function startTechniek(o: TechniekOmgeving) {
  omg = o;
  // Het palet: in de kaart van het gereedschap (verborgen tot de techniek aan staat).
  const gereedschap = document.getElementById('pl-gereedschap');
  palet = el('div', { id: 'pl-techniek', class: 'techniekpalet', hidden: '' });
  gereedschap?.parentElement?.append(palet);
  const knopAan = el('button', { type: 'button', 'data-techniek-aan': '', class: 'techniekknop', title: 'Toestellen en leidingen voor de installateur: stopcontacten, licht, airco, warmtepomp, ventilatie, water en afvoer' });
  knopAan.append(el('span', {}, 'Techniek (installateur)'));
  knopAan.addEventListener('click', () => zetTechniek(true));
  gereedschap?.append(knopAan);
  // De 3D: *Techniek* naast Afgewerkt en Constructie, en de balk eronder.
  const tabs = document.getElementById('pl-3d-weergave');
  tab3D = el('button', { type: 'button', 'data-3d-weergave': 'techniek', 'aria-pressed': 'false', title: 'Toestellen en leidingen in de 3D, in de woning of uitgezet', hidden: '' }) as HTMLButtonElement;
  tab3D.textContent = 'Techniek';
  // Eerst Afgewerkt (de constructie en de techniek staan niet samen in de 3D), dan de techniek aan.
  tab3D.addEventListener('click', () => { if (constructieAan()) zetConstructieWeergave('afgewerkt'); zetTechniek(true); });
  tabs?.append(tab3D);
  balk3D = el('div', { id: 'pl-techniek-3d', class: 'techniekbalk', hidden: '' });
  tabs?.parentElement?.after(balk3D);
}
