/**
 * Snelstart: in drie vragen (wat, hoe groot, welke stijl) een volledig ontwerp om te tonen na het eerste gesprek.
 * De tegels en hun maten zijn gegevens (`SNELSTART_TEGELS`); de stijlen staan in `stijlen.ts`. Wat de snelstart
 * oplevert, is een gewoon ontwerp, geen gesloten sjabloon: de verkoper tekent daarna vrij verder.
 *
 * - Woning: een rechthoekige woning op maat, met een vaste indeling (zie `snelWoning`). Eenvoudig en eerlijk: geen L-vorm,
 *   geen garage, geen kelder; de indeling volgt vaste verhoudingen, de verkoper past ze daarna aan in de plattegrond.
 * - Aanbouw: het model AANBOUW (`aanbouw.ts`) op maat en in de stijl; `aanbouwNaarPlan` zet hetzelfde als ruimte tegen
 *   een bestaande woning in de plattegrond, om er vrij aan verder te tekenen.
 * - Raam of deur en garagepoort: één positie, zonder woning.
 */
import {
  standaardKeuzes, verfGevel,
  type GevelKeuze, type Keuzes, type Meubel, type Opening, type Plattegrond, type Ruimte, type RuimteType,
} from '../src/index.js';
import { aanbouw } from './aanbouw.js';
import { daklichtCatalogus } from './inrichting.js';
import { INDELINGEN, pasIndelingToe } from './raamindelingen.js';
import { berekenRaam } from './raam.js';
import { raamInStijl, pasStijlToe, type Stijl } from './stijlen.js';
import { raamKeuzes, type DemoPositie } from './woning.js';

/** Een maat in de tweede vraag, met grote − en + knoppen. `waarde` in de eenheid van het model (cm, mm of stuks). */
export interface SnelMaat {
  code: string;
  label: string;
  /** Eenheid van de waarde, en hoe ze getoond wordt (meter met twee cijfers na de komma, cm, of een aantal). */
  eenheid: 'cm' | 'mm' | 'stuks';
  toon: 'm' | 'cm' | 'aantal';
  min: number;
  max: number;
  /** Stap van één tik op − of +. */
  stap: number;
  standaard: number;
}

/** Een tegel in de eerste vraag. `soort` zegt wat de snelstart maakt: een woning, een aanbouw of één positie (model). */
export interface SnelTegel {
  code: string;
  label: string;
  uitleg: string;
  soort: 'woning' | 'aanbouw' | 'positie';
  /** Bij een positie: het model (zie MODELLEN in de bouwdemo). */
  model?: 'RAAM' | 'POORT';
  maten: SnelMaat[];
}

const AANBOUW_STANDAARD = standaardKeuzes(aanbouw);
const grens = (code: string) => {
  const k = aanbouw.kenmerken.find((x) => x.code === code);
  return k?.type === 'getal' ? { min: typeof k.min === 'number' ? k.min : 2500, max: typeof k.max === 'number' ? k.max : 9000 } : { min: 0, max: 0 };
};

/**
 * De tegels van de snelstart: alleen wat vandaag werkt. Een nieuwe soort (bv. een bijgebouw) is een nieuwe rij, met een
 * model in de bouwdemo dat de positie tekent.
 */
export const SNELSTART_TEGELS: SnelTegel[] = [
  {
    code: 'woning', label: 'Woning', uitleg: 'Nieuwbouw: een volledige woning met ramen, dak en gevel', soort: 'woning',
    maten: [
      { code: 'breedte', label: 'Breedte (voorgevel)', eenheid: 'cm', toon: 'm', min: 700, max: 1600, stap: 50, standaard: 900 },
      { code: 'diepte', label: 'Diepte', eenheid: 'cm', toon: 'm', min: 800, max: 1600, stap: 50, standaard: 1000 },
      { code: 'verdiepingen', label: 'Bouwlagen', eenheid: 'stuks', toon: 'aantal', min: 1, max: 3, stap: 1, standaard: 2 },
    ],
  },
  {
    code: 'aanbouw', label: 'Aanbouw', uitleg: 'Uitbouw achter een bestaande woning, met een grote raampartij', soort: 'aanbouw',
    maten: [
      { code: 'breedte', label: 'Breedte', eenheid: 'mm', toon: 'm', ...grens('breedte'), stap: 500, standaard: 5000 },
      { code: 'diepte', label: 'Diepte', eenheid: 'mm', toon: 'm', ...grens('diepte'), stap: 500, standaard: Number(AANBOUW_STANDAARD.diepte ?? 4000) },
      // Minstens 2,80 m: de plattegrond heeft één muurhoogte, ook voor de bestaande woning (deuren van 2,30 m met een latei).
      { code: 'hoogte', label: 'Hoogte', eenheid: 'mm', toon: 'm', ...grens('hoogte'), min: Math.max(2800, grens('hoogte').min), stap: 100, standaard: Number(AANBOUW_STANDAARD.hoogte ?? 3000) },
    ],
  },
  {
    code: 'raam', label: 'Raam of deur', uitleg: 'Eén raam, deur of glaspartij, zonder woning', soort: 'positie', model: 'RAAM',
    maten: [
      { code: 'breedte', label: 'Breedte', eenheid: 'mm', toon: 'cm', min: 400, max: 6000, stap: 100, standaard: 1200 },
      { code: 'hoogte', label: 'Hoogte', eenheid: 'mm', toon: 'cm', min: 400, max: 3000, stap: 100, standaard: 1400 },
      { code: 'aantal', label: 'Aantal', eenheid: 'stuks', toon: 'aantal', min: 1, max: 20, stap: 1, standaard: 1 },
    ],
  },
  {
    code: 'garagepoort', label: 'Garagepoort', uitleg: 'Sectionale poort, zonder woning', soort: 'positie', model: 'POORT',
    maten: [
      { code: 'breedte', label: 'Breedte', eenheid: 'mm', toon: 'cm', min: 2000, max: 6000, stap: 100, standaard: 2500 },
      { code: 'hoogte', label: 'Hoogte', eenheid: 'mm', toon: 'cm', min: 1900, max: 3000, stap: 50, standaard: 2150 },
    ],
  },
];

export type SnelMaten = Record<string, number>;
const r5 = (x: number) => Math.round(x / 5) * 5;
const binnen = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
const indeling = (code: string) => INDELINGEN.find((i) => i.code === code)!;

/** Raam of deur van een gekozen indeling op een vaste maat (mm), in de stijl. */
function raamOpMaat(code: string, b: number, h: number, extra: Keuzes, stijl: Stijl): Keuzes {
  const k = { ...pasIndelingToe(raamKeuzes({ ...extra }), indeling(code)), ...extra, breedte: b, hoogte: h };
  return raamInStijl(k, stijl);
}

/** Hulp om openingen en hun posities samen te maken (zoals de voorbeeldwoning). */
function bouwer() {
  const posities: DemoPositie[] = [];
  const openingen: Opening[] = [];
  let n = 0, d = 0;
  return {
    posities, openingen,
    raam(naam: string, soort: Opening['soort'], as: 'h' | 'v', lijn: number, midden: number, b: number, h: number, borst: number, keuzes: Keuzes, extra: Partial<Opening> = {}, aantal = 1) {
      n++;
      const id = `p${n}`;
      posities.push({ id, code: `P${n}`, naam, model: 'RAAM', aantal, keuzes: { ...keuzes, breedte: b * 10, hoogte: h * 10, ...(soort === 'raam' ? { borstwering: borst * 10 } : {}), verdieping: extra.niveau ?? 0 } });
      openingen.push({ id: `o${n}`, soort, as, lijn, midden, breedte: b, hoogte: h, borstwering: borst, scharnier: 'begin', naarPlus: true, positie: id, ...extra });
    },
    deur(soort: 'binnendeur' | 'doorgang', as: 'h' | 'v', lijn: number, midden: number, b: number, extra: Partial<Opening> = {}) {
      openingen.push({ id: `d${++d}`, soort, as, lijn, midden, breedte: b, hoogte: soort === 'doorgang' ? 220 : 211, borstwering: 0, scharnier: 'begin', naarPlus: true, deurtype: soort === 'binnendeur' ? 'schilder' : '', ...extra });
    },
  };
}

/**
 * Een rechthoekige woning van `breedte` × `diepte` cm met 1 tot 3 bouwlagen, in een stijl. De voorgevel (met de
 * voordeur) ligt aan de onderkant van het plan, zodat de 3D van de woning er meteen op kijkt.
 *
 * Vaste indeling: vooraan keuken, inkom met trap, wc en berging; achteraan de leefruimte over de hele breedte (met een
 * schuifraam naar de tuin). Boven: badkamer, nachthal en een bureau vooraan, twee slaapkamers achteraan. Eén bouwlaag:
 * achteraan ook een slaapkamer (vanaf 9 m breed). Alle ramen en deuren zijn posities, in de stijl.
 */
export function snelWoning(maten: SnelMaten, stijl: Stijl): { plan: Plattegrond; posities: DemoPositie[] } {
  const B = r5(binnen(maten.breedte ?? 900, 700, 1600)), D = r5(binnen(maten.diepte ?? 1000, 800, 1600));
  const lagen = Math.round(binnen(maten.verdiepingen ?? 2, 1, 3));
  const f = r5(binnen(D * 0.4, 340, 460));
  const HB = 260, hx = r5((B - HB) / 2), R = B - hx - HB, achter = D - f;
  const ruimtes: Ruimte[] = [];
  const ruimte = (id: string, naam: string, type: RuimteType, x: number, y: number, b: number, d: number, niveau: number) =>
    ruimtes.push({ id, naam, type, x, y, b, d, vloer: type === 'badkamer' || type === 'wc' ? 'tegel_wit' : stijl.vloer, wand: type === 'badkamer' || type === 'wc' ? 'tegels_wit' : stijl.wand, ...(niveau ? { niveau } : {}) });
  const w = bouwer();
  const mat = { glas: 'mat_gelaagd', vensterbank: 'composiet' };

  // Gelijkvloers.
  const slaapBeneden = lagen === 1 && B >= 900;
  const leefB = slaapBeneden ? B - 380 : B;
  ruimte('keuken', 'Keuken', 'keuken', 0, achter, hx, f, 0);
  ruimte('inkom', 'Inkom', 'hal', hx, achter, HB, f, 0);
  ruimte('berging', 'Berging', 'berging', hx + HB, achter, R, f - 180, 0);
  ruimte('wc', 'Wc', 'wc', hx + HB, D - 180, R, 180, 0);
  ruimte('leef', 'Leefruimte', 'leefruimte', 0, 0, leefB, achter, 0);
  if (slaapBeneden) ruimte('slk0', 'Slaapkamer', 'slaapkamer', leefB, 0, 380, achter, 0);
  w.raam('Voordeur', 'buitendeur', 'h', D, hx + HB - 75, 100, 230, 0, raamOpMaat('voordeur', 1000, 2300, { ruimte: 'hal', glas: 'dubbel_gelaagd' }, stijl), { naarPlus: false });
  const kb = Math.min(160, hx - 50);
  w.raam('Raam keuken', 'raam', 'h', D, r5(hx / 2), kb, 120, 105, raamOpMaat(kb >= 140 ? 'vast_dk' : 'enkel_dk', kb * 10, 1200, { ruimte: 'keuken', vensterbank: 'geen' }, stijl));
  w.raam('Raampje wc', 'raam', 'h', D, r5(hx + HB + R / 2), 60, 70, 150, raamOpMaat('kip', 600, 700, { ruimte: 'wc', ...mat }, stijl));
  w.raam('Schuifraam leefruimte', 'schuifraam', 'h', 0, r5(Math.max(190, leefB * 0.38)), 300, 230, 0, raamOpMaat('schuif2', 3000, 2300, { ruimte: 'leefruimte', glas: 'dubbel_gelaagd', rooster: true }, stijl), { naarPlus: false });
  if (leefB >= 800) w.raam('Raam leefruimte achtergevel', 'raam', 'h', 0, r5(leefB - 110), 120, 160, 70, raamOpMaat('enkel_dk', 1200, 1600, { ruimte: 'leefruimte', glas: 'dubbel_gelaagd', rooster: true }, stijl));
  w.raam('Raam leefruimte zijgevel', 'raam', 'v', 0, r5(achter / 2), 140, 160, 70, raamOpMaat('vast_dk', 1400, 1600, { ruimte: 'leefruimte', glas: 'dubbel_gelaagd', rooster: true }, stijl));
  if (slaapBeneden) w.raam('Raam slaapkamer', 'raam', 'h', 0, B - 190, 140, 150, 90, raamOpMaat('vast_dk', 1400, 1500, { ruimte: 'slaapkamer', rooster: true }, stijl));
  w.deur('binnendeur', 'h', achter, Math.min(hx + HB - 60, leefB - 60), 90, { deurtype: 'glas' });
  w.deur('doorgang', 'h', achter, r5(hx / 2), Math.min(200, hx - 40));
  w.deur('binnendeur', 'v', hx + HB, D - 90, 80, { scharnier: 'einde' });
  w.deur('binnendeur', 'v', hx + HB, r5(achter + (f - 180) / 2), 80);
  if (slaapBeneden) w.deur('binnendeur', 'v', leefB, r5(achter / 2), 90, { naarPlus: true });

  // Verdiepingen: telkens dezelfde indeling.
  for (let n = 1; n < lagen; n++) {
    const op = { niveau: n };
    ruimte(`bad${n}`, lagen > 2 ? `Badkamer ${n}` : 'Badkamer', 'badkamer', 0, achter, hx, f, n);
    ruimte(`nachthal${n}`, lagen > 2 ? `Nachthal ${n}` : 'Nachthal', 'hal', hx, achter, HB, f, n);
    ruimte(`bureau${n}`, lagen > 2 ? `Bureau ${n}` : 'Bureau', 'bureau', hx + HB, achter, R, f, n);
    ruimte(`slka${n}`, `Slaapkamer ${2 * n - 1}`, 'slaapkamer', 0, 0, r5(B / 2), achter, n);
    ruimte(`slkb${n}`, `Slaapkamer ${2 * n}`, 'slaapkamer', r5(B / 2), 0, B - r5(B / 2), achter, n);
    w.raam(`Raam badkamer${lagen > 2 ? ` ${n}` : ''}`, 'raam', 'h', D, r5(hx / 2), 80, 80, 140, raamOpMaat('kip', 800, 800, { ruimte: 'badkamer', ...mat }, stijl), op);
    w.raam(`Raam nachthal${lagen > 2 ? ` ${n}` : ''}`, 'raam', 'h', D, hx + HB / 2, 100, 120, 100, raamOpMaat('enkel_dk', 1000, 1200, { ruimte: 'hal' }, stijl), op);
    const bb = Math.min(120, R - 50);
    w.raam(`Raam bureau${lagen > 2 ? ` ${n}` : ''}`, 'raam', 'h', D, r5(hx + HB + R / 2), bb, 140, 90, raamOpMaat('enkel_dk', bb * 10, 1400, { ruimte: 'bureau', rooster: true }, stijl), op);
    w.raam(`Raam slaapkamer ${2 * n - 1}`, 'raam', 'h', 0, r5(B / 4), 160, 150, 90, raamOpMaat('vast_dk', 1600, 1500, { ruimte: 'slaapkamer', rooster: true }, stijl), op);
    w.raam(`Raam slaapkamer ${2 * n}`, 'raam', 'h', 0, r5((3 * B) / 4), 120, 150, 90, raamOpMaat('enkel_dk', 1200, 1500, { ruimte: 'slaapkamer', rooster: true }, stijl), op);
    w.deur('binnendeur', 'h', achter, hx + 60, 90, op);
    w.deur('binnendeur', 'h', achter, hx + HB - 60, 90, op);
    w.deur('binnendeur', 'v', hx, r5(achter + f / 2), 80, { ...op, naarPlus: false });
    w.deur('binnendeur', 'v', hx + HB, r5(achter + f / 2), 80, op);
  }

  // Inrichting om de 3D af te maken: een trap in de inkom (en de nachthal eronder), een eettafel en een zetel.
  const meubels: Meubel[] = [];
  let m = 0;
  const meubel = (type: string, x: number, y: number, b: number, d: number, rotatie: Meubel['rotatie'] = 0, niveau = 0) =>
    meubels.push({ id: `m${++m}`, type, x, y, b, d, rotatie, ...(niveau ? { niveau } : {}) });
  for (let n = 0; n < lagen - 1; n++) meubel('trap', hx + 10, achter + 10, 100, 300, 0, n);
  meubel('eettafel', r5(leefB * 0.62 - 100), r5(achter / 2 - 47), 200, 95);
  meubel('bank3', 40, r5(achter - 140), 230, 95, 180);
  meubel('plant', leefB - 70, 20, 50, 50);

  const plan: Plattegrond = {
    ruimtes, openingen: w.openingen, meubels,
    muurhoogte: 270, buitenmuur: 30, binnenmuur: 10,
    verdiepingen: Array.from({ length: lagen }, (_, n) => ({ naam: n === 0 ? 'Gelijkvloers' : `Verdieping ${n}` })),
    gevel: { soort: 'steen', kleur: '#9c4a34' },
  };
  return { plan: pasStijlToe(plan, stijl), posities: w.posities };
}

/**
 * Een los raam of een deur op maat (mm), in de stijl. De indeling volgt de maat: tot 2 m hoog een raam (één, twee, drie
 * of vier vakken naargelang de breedte), hoger een deur (terrasdeur, dubbele deur, schuifraam of hef-schuifdeur). Past de
 * maat niet bij die indeling, dan kiest de indeling de dichtste maat die wel kan (zoals een tegel in de configurator).
 */
export function snelRaam(maten: SnelMaten, stijl: Stijl): Keuzes {
  const b = maten.breedte ?? 1200, h = maten.hoogte ?? 1400;
  const code = h >= 2000
    ? (b >= 4000 ? 'hefschuif3' : b >= 2400 ? 'schuif2' : b >= 1400 ? 'dubbele_deur' : 'terrasdeur')
    : (b <= 1300 ? 'enkel_dk' : b <= 2000 ? 'vast_dk' : b <= 3000 ? 'driedelig' : 'vierdelig');
  const i = indeling(code);
  let k: Keuzes = { ...pasIndelingToe(raamKeuzes({ ruimte: 'leefruimte' }), i), breedte: b, hoogte: h };
  if (berekenRaam(k).meldingen.some((m) => m.ernst === 'fout')) k = pasIndelingToe(raamKeuzes({ ruimte: 'leefruimte', breedte: b, hoogte: h }), i);
  return raamInStijl(k, stijl);
}

/** De keuzes van het model AANBOUW uit de maten (mm) en de stijl. */
export function aanbouwKeuzes(maten: SnelMaten, stijl: Stijl): Keuzes {
  return {
    ...AANBOUW_STANDAARD,
    breedte: maten.breedte ?? Number(AANBOUW_STANDAARD.breedte ?? 4650),
    diepte: maten.diepte ?? Number(AANBOUW_STANDAARD.diepte ?? 4000),
    hoogte: maten.hoogte ?? Number(AANBOUW_STANDAARD.hoogte ?? 3000),
    // Een hef-schuifdeur over de hele breedte: twee delen, of drie als de delen anders te breed worden.
    raamtype: (maten.breedte ?? 5000) - 600 > 6400 ? 'hefschuif3' : 'hefschuif2',
    ...stijl.aanbouw,
    // Boven de raampartij blijft plaats voor latei, dak en dakrand (de regel van het model: minstens 250 mm).
    raamhoogte: Math.max(1800, Math.min(2500, (maten.hoogte ?? Number(AANBOUW_STANDAARD.hoogte ?? 3000)) - 300)),
  };
}

/** Kleur van de profielen van de aanbouw → RAL-kleur van het raam (buiten, binnen). */
const AANBOUW_KLEUR: Record<string, [string, string]> = {
  ral9005: ['zwart', 'zwart'], ral7016: ['antraciet', 'antraciet'], ral9010: ['ral9010', 'zelfde'], brons: ['ral8019', 'ral8019'], bicolor: ['zwart', 'wit'],
};
/** Raampartij van de aanbouw → indeling van het raam. */
const AANBOUW_RAAM: Record<string, string> = {
  schuif2: 'schuif2', schuif3: 'hefschuif3', schuif4: 'hefschuif4', hefschuif2: 'hefschuif2', hefschuif3: 'hefschuif3', vouw4: 'vouwwand4', deur_vast: 'deur_vast',
};
/** Gevel van de zijmuren en bekleding boven de raampartij → gevelmateriaal uit de catalogus. */
const AANBOUW_GEVEL: Record<string, GevelKeuze> = {
  baksteen_rood: { materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' },
  baksteen_grijs: { materiaal: 'gevelsteen', kleur: 'grijs', voeg: 'grijs' },
  crepi_wit: { materiaal: 'crepi', kleur: 'wit' },
  ceder: { materiaal: 'hout_staand', kleur: 'naturel' },
  thermowood: { materiaal: 'hout_staand', kleur: 'naturel' },
  alu: { materiaal: 'zink', kleur: 'antraciet' },
};
/** De bestaande woning: in een neutrale tint, zodat het nieuwe deel opvalt. */
const BESTAAND: GevelKeuze = { materiaal: 'crepi', kleur: 'lichtgrijs' };

/**
 * De aanbouw (keuzes van het model AANBOUW) als ruimte tegen een bestaande woning in de plattegrond, om er vrij aan verder
 * te tekenen. De bestaande woning (gelijkvloers en verdieping, 9 m diep, zadeldak) staat er neutraal bij; de uitbouw ligt
 * erachter (onderaan het plan), met een brede doorgang, de raampartij in de achtergevel, een plat dak met de koepel of
 * lichtstraat, de zijmuren in het gevelmateriaal en de achtergevel in de bekleding.
 *
 * Grenzen: de bestaande woning is een eenvoudige doos (de buren van een rijwoning staan er niet); haar ramen en deur
 * staan erin met aantal 0 ("bestaand"), zodat ze niet meetellen. Een raampartij van de aanbouw wordt een raam of deur met
 * een indeling die erop lijkt (een schuifraam van 3 of 4 delen wordt een hef-schuifdeur).
 */
export function aanbouwNaarPlan(k: Keuzes): { plan: Plattegrond; posities: DemoPositie[] } {
  const num = (v: unknown, s: number) => (typeof v === 'number' && Number.isFinite(v) ? v : s);
  const B = r5(num(k.breedte, 4650) / 10), Da = r5(num(k.diepte, 4000) / 10);
  const muurhoogte = r5(binnen(num(k.hoogte, 3000) / 10 - 30, 250, 330));
  const W = 900;
  const ruimtes: Ruimte[] = [
    { id: 'bestaand', naam: 'Bestaande woning', type: 'leefruimte', x: 0, y: 0, b: B, d: W, vloer: 'parket_eik', wand: 'wit' },
    { id: 'bestaand1', naam: 'Bestaande verdieping', type: 'slaapkamer', x: 0, y: 0, b: B, d: W, vloer: 'parket_eik', wand: 'wit', niveau: 1 },
    { id: 'uitbouw', naam: 'Uitbouw', type: 'leefruimte', x: 0, y: W, b: B, d: Da, vloer: 'tegel_grijs', wand: 'wit' },
  ];
  const w = bouwer();
  const [buiten, binnenKleur] = AANBOUW_KLEUR[String(k.kleur)] ?? ['antraciet', 'antraciet'];
  const penant = 30;
  const rb = Math.max(80, B - 2 * penant), rh = Math.min(num(k.raamhoogte, 2500) / 10, muurhoogte - 15);
  const code = AANBOUW_RAAM[String(k.raamtype)] ?? 'hefschuif2';
  const keuzes = { ...pasIndelingToe(raamKeuzes({ ruimte: 'leefruimte' }), indeling(code)), profiel: String(k.profiel) === 'alu_hi' ? 'alu_hi' : 'alu', kleur_buiten: buiten, kleur_binnen: binnenKleur, glas: String(k.glas ?? 'dubbel_gelaagd').startsWith('triple') ? 'triple_gelaagd' : 'dubbel_gelaagd', zonwering: k.screen === true ? 'screen' : 'geen' };
  w.raam('Raampartij uitbouw', code === 'deur_vast' ? 'buitendeur' : 'schuifraam', 'h', W + Da, B / 2, rb, rh, 0, keuzes, { naarPlus: false });
  // De bestaande woning: ramen boven en de voordeur, met aantal 0 (ze blijven, ze tellen niet mee).
  const oud = raamKeuzes({ profiel: 'pvc', kleur_buiten: 'wit', kleur_binnen: 'zelfde', ruimte: 'slaapkamer', vak1: 'draaikip_l' });
  const ramen = B >= 450 ? [B / 4, (3 * B) / 4] : [B / 2];
  for (const x of ramen) w.raam('Bestaand raam (blijft)', 'raam', 'h', W, r5(x), 100, 140, 90, oud, { niveau: 1, naarPlus: false }, 0);
  w.raam('Bestaande voordeur (blijft)', 'buitendeur', 'h', 0, r5(B / 2), 100, 230, 0, raamKeuzes({ type: 'voordeur', ruimte: 'hal', profiel: 'pvc', kleur_buiten: 'wit', glas: 'dubbel_gelaagd' }), { naarPlus: true }, 0);
  w.deur('doorgang', 'h', W, r5(B / 2), r5(Math.min(B * 0.6, B - 100)));
  const plan: Plattegrond = {
    ruimtes, openingen: w.openingen,
    meubels: [{ id: 'm1', type: 'trap', x: B - 115, y: 20, b: 100, d: 300, rotatie: 0 }],
    muurhoogte, buitenmuur: 30, binnenmuur: 10,
    verdiepingen: [{ naam: 'Gelijkvloers' }, { naam: 'Verdieping 1' }],
    gevel: { soort: 'gevel', kleur: '#c9c8c3' },
    gevelOntwerp: { standaard: BESTAAND },
    dak: { vorm: 'zadel', helling: 40, richting: 'onder', oversteek: 20, bedekking: { materiaal: 'pannen', kleur: 'antraciet' }, plat: { materiaal: 'epdm', kleur: 'zwart' } },
  };
  // De uitbouw in kleur: zijmuren in de gevel, de achtergevel in de bekleding (of de gevel als die "zelfde" is).
  const zij = AANBOUW_GEVEL[String(k.gevel)] ?? AANBOUW_GEVEL.baksteen_rood!;
  const achter = AANBOUW_GEVEL[String(k.bekleding)] ?? zij;
  verfGevel(plan, zij, 'vlak', { sleutel: 'uitbouw:links' });
  verfGevel(plan, zij, 'vlak', { sleutel: 'uitbouw:rechts' });
  verfGevel(plan, achter, 'vlak', { sleutel: 'uitbouw:onder' });
  // Koepel of lichtstraat in het midden van het platte dak.
  const type = k.dak === 'koepel' ? 'koepel_100' : k.dak === 'lichtstraat' ? 'lichtstraat_200' : undefined;
  if (type) {
    const t = daklichtCatalogus[type]!;
    plan.daklichten = [{ id: 'k1', type, x: r5(B / 2 - t.b / 2), y: r5(W + Da / 2 - t.d / 2), b: t.b, d: t.d }];
  }
  return { plan, posities: w.posities };
}

/** Daklichten verdelen en tellen: in `daklichten.ts` (ook gebruikt door de stijlen). */
export { daklichtenOpDak, verdeelDaklichten } from './daklichten.js';
