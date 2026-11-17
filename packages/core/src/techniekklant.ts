/**
 * De techniek voor de klant (ronde 10c, 17/11/2026). Jonas: *"ja hoort er bij ook zichtbaar in 3D"*. De klant is geen
 * installateur: hij krijgt de techniek te zien in gewone woorden, zonder hoeveelheden voor de aannemer (meters, maten,
 * kringen) en zonder prijzen.
 *
 *   - `techniekVoorKlant`: per vak wat er komt (de namen van de toestellen en de kleuren van de leidingen) en per toestel
 *     of leiding (`toestel:<id>`, `leiding:<id>`, de dingen van de 3D) hoe het heet, wat het is en waar het zit. Het
 *     bestand voor de klant, de klantweergave en het blad lezen dit, zodat ze overal hetzelfde zeggen.
 *   - `techniekPakket`: hetzelfde met per verdieping de uitgezette 3D (lage wanden, de toestellen groot in de kleur van
 *     hun vak met hun merkteken, de leidingen in hun kleur), het optionele veld `techniek` van het 3D-pakket.
 *
 * De woorden komen uit de catalogus (`klant` op een toestel of soort leiding, `TECHNIEK_KLANT_VAKKEN`): gegevens, geen
 * programma. Een plan zonder toestellen of leidingen geeft niets terug.
 */
import type { Pakket3DTechniek } from './pakket3d.js';
import { niveauVan, plattegrond3D, ruimteOp, toestelBuiten, verdiepingenVan, vloerHoogte, type PlanCatalogus, type Plattegrond } from './plattegrond.js';
import type { Scene3D } from './ruimtelijk.js';
import {
  ALLE_VAKKEN, TECHNIEK_KLANT_VAKKEN, TECHNIEK_VAKKEN, TECHNIEK_VOORBEHOUD, liggingHoogte,
  type KlantWoorden, type Leiding, type LeidingSoortType, type TechniekVak, type Toestel, type ToestelType,
} from './techniek.js';

/** Eén vak voor de klant: naam, kleur en uitleg, en wat er in dit plan van dat vak komt. */
export interface TechniekKlantVak {
  vak: TechniekVak;
  naam: string;
  kleur: string;
  uitleg: string;
  /** De namen van de toestellen die er komen (elk één keer, het meest voorkomende eerst), zonder aantallen. */
  toestellen: string[];
  /** De soorten leiding die er komen, met hun kleur in de 3D. */
  leidingen: { naam: string; kleur: string }[];
}

/** Eén toestel of leiding voor de klant: vak, naam, wat het is en waar het zit. */
export interface TechniekKlantDing {
  vak: TechniekVak;
  naam: string;
  uitleg: string;
  waar: string;
}

export interface TechniekKlant {
  vakken: TechniekKlantVak[];
  /** Per ding van de 3D (`toestel:<id>`, `leiding:<id>`). */
  dingen: Record<string, TechniekKlantDing>;
}

/** Het label zonder de uitleg tussen haakjes (zoals het palet). */
const zonderHaakjes = (label: string) => label.replace(/\s*\(.*\)\s*$/, '');

/** Hoe de klant een toestel of soort leiding noemt, en wat het is. */
export function klantWoorden(x: ToestelType | LeidingSoortType): KlantWoorden {
  return x.klant ?? { naam: zonderHaakjes(x.label), uitleg: '' };
}

const klein = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** De techniek van het plan in de woorden van de klant, of niets als het plan geen techniek heeft. */
export function techniekVoorKlant(plan: Plattegrond, cat: Pick<PlanCatalogus, 'techniek'>): TechniekKlant | undefined {
  const tc = cat.techniek;
  if (!tc || !(plan.toestellen?.length || plan.leidingen?.length)) return undefined;
  const verdiepingen = verdiepingenVan(plan);
  const opVerdieping = (n: number) => (verdiepingen.length > 1 ? ` (${klein(verdiepingen[n]?.naam ?? `verdieping ${n}`)})` : '');
  const dingen: Record<string, TechniekKlantDing> = {};
  const toestelTel = new Map<string, { vak: TechniekVak; n: number; i: number }>();
  const leidingSoorten = new Map<string, { vak: TechniekVak; naam: string; kleur: string; i: number }>();

  const plaats = (t: Toestel): string => {
    const n = niveauVan(t), r = ruimteOp(plan, t.x, t.y, n);
    let waar: string;
    if (t.aan === 'dak') waar = 'Op het dak';
    else if (t.aan === 'buiten') waar = n > 0 ? 'Buiten, op een plat dak' : 'Buiten, naast de woning';
    else if (toestelBuiten(plan, t)) waar = 'Buiten, aan de gevel';
    else waar = `${r?.naam ?? 'Binnen'}, ${t.aan === 'plafond' ? 'aan het plafond' : t.aan === 'vloer' ? 'op de vloer' : 'aan de muur'}`;
    return `${waar}${opVerdieping(n)}`;
  };
  for (const [i, t] of (plan.toestellen ?? []).entries()) {
    const type = tc.toestellen[t.type];
    if (!type) continue;
    const w = klantWoorden(type);
    dingen[`toestel:${t.id}`] = { vak: type.vak, naam: w.naam, uitleg: w.uitleg, waar: plaats(t) };
    const x = toestelTel.get(w.naam) ?? { vak: type.vak, n: 0, i };
    x.n++;
    toestelTel.set(w.naam, x);
  }

  const naamVan = (id?: string) => {
    const t = id ? plan.toestellen?.find((x) => x.id === id) : undefined;
    const type = t && tc.toestellen[t.type];
    return type ? klein(klantWoorden(type).naam) : '';
  };
  const ligging = (l: Leiding): string => {
    const h = liggingHoogte(l.hoogte, plan.muurhoogte);
    return h <= 0 ? 'in de vloer' : h >= plan.muurhoogte - 30 ? 'tegen het plafond' : 'in de muur';
  };
  for (const [i, l] of (plan.leidingen ?? []).entries()) {
    const soort = tc.leidingen[l.soort];
    if (!soort || l.punten.length < 2) continue;
    const w = klantWoorden(soort);
    const a = naamVan(l.van), b = naamVan(l.naar);
    // Een kabel langs de toestellen van een kring (op en neer naar elk toestel) gaat niet maar naar één toestel.
    const kring = l.soort === 'kabel' && !!l.hoogtes;
    const verbindt = a && b
      ? a === b && l.van === l.naar ? `Begint en eindigt bij ${a}.` : kring ? `Verbindt ${a} met de toestellen van deze kring.` : `Verbindt ${a} met ${b}.`
      : a ? `Vertrekt bij ${a}.` : b ? `Komt bij ${b}.` : '';
    dingen[`leiding:${l.id}`] = { vak: soort.vak, naam: w.naam, uitleg: w.uitleg, waar: [`Loopt ${ligging(l)}${opVerdieping(niveauVan(l))}.`, verbindt].filter(Boolean).join(' ') };
    const sleutel = `${soort.vak}|${w.naam}|${soort.kleur}`;
    if (!leidingSoorten.has(sleutel)) leidingSoorten.set(sleutel, { vak: soort.vak, naam: w.naam, kleur: soort.kleur, i });
  }

  const vakken: TechniekKlantVak[] = [];
  for (const vak of ALLE_VAKKEN) {
    const toestellen = [...toestelTel].filter(([, x]) => x.vak === vak).sort((p, q) => q[1].n - p[1].n || p[1].i - q[1].i).map(([naam]) => naam);
    const leidingen = [...leidingSoorten.values()].filter((x) => x.vak === vak).sort((p, q) => p.i - q.i).map(({ naam, kleur }) => ({ naam, kleur }));
    if (!toestellen.length && !leidingen.length) continue;
    vakken.push({ vak, naam: TECHNIEK_KLANT_VAKKEN[vak].naam, kleur: TECHNIEK_VAKKEN[vak].kleur, uitleg: TECHNIEK_KLANT_VAKKEN[vak].uitleg, toestellen, leidingen });
  }
  return { vakken, dingen };
}

/**
 * Een verdieping op de grond gezet (ronde 10c): in het bestand voor de klant en op het blad hing een verdieping in de
 * uitgezette 3D op haar hoogte boven het gras, als een plaat in de lucht met een leiding eronder. De klant kiest de
 * verdieping zelf; op de grond leest ze als een plattegrond per verdieping. Alles zakt evenveel (het kader ook); een
 * leiding naar de verdieping eronder stopt nu net onder het gras. De app toont de verdieping nog op haar hoogte.
 */
function opDeGrond(s: Scene3D, dy: number): Scene3D {
  if (!dy) return s;
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    ...s,
    blokken: s.blokken.map((b) => ({
      ...b, y: r2(b.y - dy),
      // Een prisma langs x of z draagt de hoogte in zijn doorsnede (een dak; in de uitgezette 3D komt het niet voor).
      ...(b.vorm === 'prisma' && b.as !== 'y' && b.doorsnede ? { doorsnede: b.doorsnede.map(([p, y]): [number, number] => [p, r2(y - dy)]) } : {}),
    })),
    kader: { ...s.kader, h: r2(s.kader.h - dy) },
  };
}

/**
 * De techniek voor het 3D-pakket (bestand voor de klant): per verdieping met techniek de uitgezette 3D, zoals op het
 * scherm (alleen die verdieping, lage wanden, de kleine toestellen groot met hun merkteken, de leidingen in de vloer
 * zichtbaar op de vloer), met de dingen in de codes zodat een tik het toestel of de leiding kent; en de woorden van
 * `techniekVoorKlant`. Niets als het plan geen techniek heeft.
 */
export function techniekPakket(plan: Plattegrond, cat: PlanCatalogus): Pakket3DTechniek | undefined {
  const klant = techniekVoorKlant(plan, cat);
  if (!klant || !cat.techniek) return undefined;
  const metTechniek = new Set([...(plan.toestellen ?? []).map(niveauVan), ...(plan.leidingen ?? []).map(niveauVan)]);
  const niveaus = verdiepingenVan(plan).flatMap((v, n) => (metTechniek.has(n)
    ? [{ naam: v.naam, scene: opDeGrond(plattegrond3D(plan, cat, { techniek: { weergave: 'uitgezet', niveau: n, opvallend: true }, dingen: true }), vloerHoogte(plan, n)) }]
    : []));
  if (!niveaus.length) return undefined;
  return { niveaus, vakken: klant.vakken, dingen: klant.dingen, voorbehoud: TECHNIEK_VOORBEHOUD };
}
