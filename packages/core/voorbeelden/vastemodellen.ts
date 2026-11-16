/**
 * Vaste modellen op de schermen van de bouw (ronde 8b, 16/11): de overkapping (carport, terrasoverkapping, pergola), het
 * tuinhuis of poolhouse, de loods of hal, en het staalwerk rond de woning (balustrade, luifel, rechte trap). Elk model
 * staat hier één keer beschreven voor de schermen: zijn 3D in twee weergaven, de meetstaat, of het een gebouw is (dan staat
 * het buiten, in de omgeving) of een los stuk (op een rustige achtergrond), de hoofdmaten als maatlijnen, een korte tekst in
 * gewone taal, en welke kenmerken achter *Meer opties* zitten. Daarbij: een keuze die door een andere keuze niet meer kan
 * vanzelf omzetten (`herstelKeuzes`), een ontwerp uit de snelstart altijd geldig maken (`maakGeldig`), en de meetstaat
 * als tekst (`meetstaatTekst`).
 *
 * **Zonder prijzen**: de modellen hebben een lege stuklijst en een lege prijslijst. Niets hier geeft een bedrag.
 * De modellen zelf zijn voorstellen die geen vakman nalas (zie bovenaan bijgebouwen.ts, loods.ts en staalwerk.ts).
 */
import {
  berekenConfiguratie, doosMaatlijnen, meterTekst, STUK_ROLLEN,
  type Bouwdeel, type BouwWeergave, type ConfiguratieResultaat, type Keuzes, type Maatlijn3D, type MeetstaatRegel, type Prijslijst, type ProductModel,
  type Scene3D, type Waarde,
} from '../src/index.js';
import { bijgebouwPrijslijst, overkapping, tuinhuis } from './bijgebouwen.js';
import { bijgebouw3D, bijgebouwMeetstaat, bijgebouwSamenstelling } from './bijgebouwen3d.js';
import { LOODS_VLOER, LOOPDEUR, loods, loodsPrijslijst, POORT_MARGE, POORTSTIJL_MARGE } from './loods.js';
import { loods3D, loodsMeetstaat, loodsSamenstelling } from './loods3d.js';
import { balustrade, luifel, staaltrap, staalwerkPrijslijst } from './staalwerk.js';
import { staalwerk3D, staalwerkMeetstaat, staalwerkSamenstelling } from './staalwerk3d.js';

export type VastModelCode = 'OVERKAPPING' | 'TUINHUIS' | 'LOODS' | 'BALUSTRADE' | 'LUIFEL' | 'STAALTRAP';

export interface VastModel {
  code: VastModelCode;
  model: ProductModel;
  prijslijst: Prijslijst;
  /** De naam van een nieuwe positie, als het type er geen geeft. */
  label: string;
  /** Een gebouw staat in de 3D buiten (lucht, gras, horizon); een los stuk staalwerk op een rustige achtergrond. */
  gebouw: boolean;
  /** De 3D in een weergave; gebruik `vastModelScene` (die houdt het kader in beide weergaven gelijk). */
  scene: (r: ConfiguratieResultaat, weergave: BouwWeergave) => Scene3D;
  /** Netto, in hoeveelheden, zonder prijzen. */
  meetstaat: (r: ConfiguratieResultaat) => MeetstaatRegel[];
  /** De kenmerken achter *Meer opties*: het detail dat een eerste gesprek niet nodig heeft. */
  meer: string[];
  /**
   * De kenmerken die de omschrijving in het overzicht noemt, na de soort en de maat; met een woord ervoor als de keuze
   * alleen niet zegt waarover ze gaat (["dak_kleur", "dak"] → "dak grijswit (RAL 9002)"). Een keuze "Geen …" valt weg.
   */
  omschrijf: (string | [string, string])[];
  /** De hoofdmaten als maatlijnen (de kijker, het bestand voor de klant, het blad). */
  maatlijnen: (r: ConfiguratieResultaat) => Maatlijn3D[];
  /** Wat het is en hoe groot, kort ("Carport · 5 × 5 m"). */
  kort: (r: ConfiguratieResultaat) => string;
  /** De bouwdelen van het ontwerp (om de opbouw van wand, dak en vloer te beschrijven). */
  delen: (r: ConfiguratieResultaat) => { code: string; deel: Bouwdeel }[];
}

// ---------- hulp ----------

const waarden = (r: ConfiguratieResultaat): Record<string, Waarde> => Object.fromEntries(r.kenmerken.map((k) => [k.code, k.waarde]));
const num = (v: unknown, s = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : s);
/** Een maat in meter zonder overbodige nullen: "5 m", "5,50 m". */
export const meter = (cm: number) => meterTekst(cm).replace(/,00 m$/, ' m');
const m2 = (cm: number) => meter(cm).replace(/ m$/, '');
/** De gekozen keuze van een kenmerk in gewone taal (leeg als het kenmerk verborgen is). */
const keuzeTekst = (r: ConfiguratieResultaat, code: string) => {
  const k = r.kenmerken.find((x) => x.code === code);
  return k?.zichtbaar ? k.weergave : '';
};

// ---------- de modellen ----------

/**
 * Een maat van staalwerk aan de rechterkant (zoals gegeven, op x) én gespiegeld naar de linkerkant (op `links`), in één
 * groep: de kijker toont die aan de kant van de camera. Bovenop alles, zoals de maten van een raam: anders verdwijnt de lijn
 * achter de trap of de balustrade die ze meet.
 */
function aanBeideKanten(van: [number, number, number], tot: [number, number, number], tekst: string, links: number, groep: string, afstand: number): Maatlijn3D[] {
  return [
    { van, tot, tekst, uit: [1, 0, 0], afstand, groep, kant: [1, 0, 0], bovenop: true },
    { van: [links, van[1], van[2]], tot: [links, tot[1], tot[2]], tekst, uit: [-1, 0, 0], afstand, groep, kant: [-1, 0, 0], bovenop: true },
  ];
}

/** Hoogte van het terras onder de balustrade in de 3D (cm), zoals staalwerk3d.ts het tekent. */
const BALUSTRADE_TERRAS = 62;

const POORTDETAIL = [1, 2, 3].flatMap((n) => [`poort${n}_breedte`, `poort${n}_hoogte`, `poort${n}_travee`]);

export const VASTE_MODELLEN: Record<VastModelCode, VastModel> = {
  OVERKAPPING: {
    code: 'OVERKAPPING', model: overkapping, prijslijst: bijgebouwPrijslijst, label: 'Overkapping', gebouw: true,
    scene: bijgebouw3D, meetstaat: bijgebouwMeetstaat, delen: (r) => bijgebouwSamenstelling(r).delen,
    meer: ['hoogte', 'helling_lessenaar', 'helling_zadel', 'oversteek', 'schoren', 'wand_voor', 'wand_links', 'wand_rechts', 'wand_achter', 'berging_maat', 'bekleding', 'plankrichting'],
    omschrijf: ['plaatsing', 'dakvorm', 'bedekking', ['berging', 'berging'], ['hout', 'hout:']],
    maatlijnen: (r) => {
      const k = waarden(r), vloer = num(r.afgeleid.dikte_vloer);
      return doosMaatlijnen({ x0: 0, x1: num(k.breedte), z0: 0, z1: num(k.diepte), y0: vloer, y1: vloer + num(r.afgeleid.tophoogte) });
    },
    kort: (r) => `${keuzeTekst(r, 'type') || 'Overkapping'} · ${m2(num(waarden(r).breedte))} × ${meter(num(waarden(r).diepte))}`,
  },
  TUINHUIS: {
    code: 'TUINHUIS', model: tuinhuis, prijslijst: bijgebouwPrijslijst, label: 'Tuinhuis', gebouw: true,
    scene: bijgebouw3D, meetstaat: bijgebouwMeetstaat, delen: (r) => bijgebouwSamenstelling(r).delen,
    meer: ['isolatie', 'wandhoogte', 'helling_lessenaar', 'helling_zadel', 'oversteek', 'ramen_voor', 'ramen_links', 'ramen_rechts', 'ramen_achter', 'plankrichting', 'hout', 'terras'],
    omschrijf: ['dakvorm', 'bedekking', 'deur', ['bekleding', 'gevel'], ['schrijnwerk', 'deur en ramen']],
    maatlijnen: (r) => {
      const k = waarden(r);
      return doosMaatlijnen({ x0: 0, x1: num(k.breedte), z0: 0, z1: num(k.diepte), y0: 0, y1: num(r.afgeleid.tophoogte) });
    },
    kort: (r) => {
      const k = waarden(r);
      return `${keuzeTekst(r, 'type') || 'Tuinhuis'} · ${m2(num(k.breedte))} × ${meter(num(k.diepte))}${num(k.luifel) > 0 ? `, luifel ${meter(num(k.luifel))}` : ''}`;
    },
  },
  LOODS: {
    code: 'LOODS', model: loods, prijslijst: loodsPrijslijst, label: 'Loods', gebouw: true,
    scene: loods3D, meetstaat: loodsMeetstaat, delen: (r) => loodsSamenstelling(r).delen,
    meer: ['afstand', 'helling', 'dak_bekleding', 'wand_bekleding', 'beton', ...POORTDETAIL, 'poort_vensters', 'loopdeur_travee', 'deur_kleur'],
    omschrijf: ['dakvorm', ['dak_kleur', 'dak'], ['wand_kleur', 'wanden'], 'daklicht'],
    maatlijnen: (r) => {
      const k = waarden(r);
      return doosMaatlijnen({ x0: 0, x1: num(k.breedte), z0: 0, z1: num(r.afgeleid.lengte), y0: LOODS_VLOER, y1: LOODS_VLOER + num(r.afgeleid.tophoogte) }, { breedte: 'Breedte', diepte: 'Lengte', hoogte: 'Hoogte' });
    },
    kort: (r) => {
      const k = waarden(r), poorten = [1, 2, 3].filter((n) => k[`poort${n}_gevel`] && k[`poort${n}_gevel`] !== 'geen').length;
      return `Loods · ${m2(num(k.breedte))} × ${meter(num(r.afgeleid.lengte))}${poorten ? `, ${poorten} poort${poorten === 1 ? '' : 'en'}` : ''}`;
    },
  },
  BALUSTRADE: {
    code: 'BALUSTRADE', model: balustrade, prijslijst: staalwerkPrijslijst, label: 'Balustrade', gebouw: false,
    scene: staalwerk3D, meetstaat: staalwerkMeetstaat, delen: (r) => staalwerkSamenstelling(r).delen,
    meer: ['bevestiging'],
    omschrijf: ['vulling', ['glas', 'glas'], ['leuning', 'leuning:'], 'afwerking'],
    maatlijnen: (r) => {
      const k = waarden(r), L = num(k.lengte), H = num(k.hoogte), y = BALUSTRADE_TERRAS;
      return [
        { van: [0, y, 0], tot: [L, y, 0], tekst: `Lengte ${meterTekst(L)}`, uit: [0, 0, 1], afstand: 40, bovenop: true },
        ...aanBeideKanten([L, y, 0], [L, y + H, 0], `Hoogte ${meterTekst(H)}`, 0, 'hoogte', 30),
      ];
    },
    kort: (r) => `Balustrade · ${meter(num(waarden(r).lengte))} lang, ${meter(num(waarden(r).hoogte))} hoog`,
  },
  LUIFEL: {
    code: 'LUIFEL', model: luifel, prijslijst: staalwerkPrijslijst, label: 'Luifel', gebouw: false,
    scene: staalwerk3D, meetstaat: staalwerkMeetstaat, delen: (r) => staalwerkSamenstelling(r).delen,
    meer: ['hoogte', 'rand'],
    omschrijf: ['vulling', 'ophanging', 'afwerking'],
    maatlijnen: (r) => {
      const k = waarden(r), B = num(k.breedte), U = num(k.uitkraging), Y = num(k.hoogte);
      return [
        { van: [0, Y, U], tot: [B, Y, U], tekst: `Breedte ${meterTekst(B)}`, uit: [0, -1, 0], afstand: 30, bovenop: true },
        ...aanBeideKanten([B, Y, 0], [B, Y, U], `Uitkraging ${meterTekst(U)}`, 0, 'uitkraging', 30),
        ...aanBeideKanten([B, 0, U], [B, Y, U], `Hoogte ${meterTekst(Y)}`, 0, 'hoogte', 30),
      ];
    },
    kort: (r) => `Luifel · ${meter(num(waarden(r).breedte))} breed, ${meter(num(waarden(r).uitkraging))} diep`,
  },
  STAALTRAP: {
    code: 'STAALTRAP', model: staaltrap, prijslijst: staalwerkPrijslijst, label: 'Trap', gebouw: false,
    scene: staalwerk3D, meetstaat: staalwerkMeetstaat, delen: (r) => staalwerkSamenstelling(r).delen,
    meer: ['aantrede', 'structuur'],
    omschrijf: ['structuur', ['treden', 'treden:'], ['leuning', 'leuning'], 'afwerking'],
    maatlijnen: (r) => {
      const k = waarden(r), H = num(k.hoogte), B = num(k.breedte), L = num(r.afgeleid.lengte);
      return [
        ...aanBeideKanten([B, 0, 0], [B, H, 0], `Hoogte ${meterTekst(H)}`, 0, 'hoogte', 40),
        ...aanBeideKanten([B, 2, 0], [B, 2, L], `Lengte ${meterTekst(L)}`, 0, 'lengte', 40),
        { van: [0, 2, L], tot: [B, 2, L], tekst: `Breedte ${meterTekst(B)}`, uit: [0, 0, 1], afstand: 40, bovenop: true },
      ];
    },
    kort: (r) => `Rechte trap · ${meter(num(waarden(r).hoogte))} hoog, ${num(r.afgeleid.optreden)} optreden`,
  },
};

export const isVastModel = (code: string): code is VastModelCode => code in VASTE_MODELLEN;

/** Het resultaat van de motor voor een vast model (zonder prijzen: de prijslijst is leeg). */
export function berekenVastModel(code: VastModelCode, keuzes: Keuzes): ConfiguratieResultaat {
  const v = VASTE_MODELLEN[code];
  return berekenConfiguratie(v.model, keuzes, v.prijslijst);
}

/**
 * De 3D van een vast model in een weergave. De constructie krijgt het kader van de afgewerkte weergave: de kijker zet zijn
 * camera opnieuw als het kader verandert, en wie tussen *Afgewerkt* en *Constructie* wisselt, wil hetzelfde standpunt houden.
 */
export function vastModelScene(code: VastModelCode, r: ConfiguratieResultaat, weergave: BouwWeergave = 'afgewerkt'): Scene3D {
  const v = VASTE_MODELLEN[code];
  const afgewerkt = v.scene(r, 'afgewerkt');
  return weergave === 'afgewerkt' ? afgewerkt : { ...v.scene(r, weergave), kader: afgewerkt.kader };
}

/** De keuzes die de omschrijving noemt, klein geschreven, met hun woord ervoor; zonder lege keuzes en zonder "geen". */
function keuzeTeksten(v: VastModel, r: ConfiguratieResultaat): string[] {
  return v.omschrijf.flatMap((o) => {
    const [code, voor] = typeof o === 'string' ? [o, ''] : o;
    const t = keuzeTekst(r, code);
    return t && !/^geen\b/i.test(t) ? [`${voor ? `${voor} ` : ''}${klein(t)}`] : [];
  });
}

/** De omschrijving voor het overzicht: wat en hoe groot, en de belangrijkste keuzes. */
export function vastModelOmschrijving(code: VastModelCode, r: ConfiguratieResultaat): string {
  const v = VASTE_MODELLEN[code];
  const [eerste, ...rest] = keuzeTeksten(v, r);
  return [v.kort(r), ...(eerste ? [eerste.charAt(0).toUpperCase() + eerste.slice(1)] : []), ...rest].join(' · ');
}

/**
 * Hetzelfde als één zin midden in een tekst, zoals de varianten en het blad een ontwerp beschrijven: "carport 5 × 5 m:
 * vrijstaand, plat dak, EPDM op dakbeschot, geen berging, douglas".
 */
export function vastModelZin(code: VastModelCode, r: ConfiguratieResultaat): string {
  const v = VASTE_MODELLEN[code];
  const keuzes = keuzeTeksten(v, r);
  return `${klein(v.kort(r).replace(' · ', ' '))}${keuzes.length ? `: ${keuzes.join(', ')}` : ''}`;
}

const VLAK: Partial<Record<Bouwdeel['soort'], string>> = { dakvlak: 'Dak', wandvlak: 'Wand', vloervlak: 'Vloer' };

/**
 * De opbouw van wanden, daken en vloers in gewone taal, van binnen naar buiten (of van onder naar boven), elke opbouw één
 * keer: "Dak: dakbalken 150 mm, dakbeschot 18 mm, EPDM 1,2 mm". Zonder maten van het vlak: die staan in de meetstaat.
 */
export function vastModelOpbouw(code: VastModelCode, r: ConfiguratieResultaat): string[] {
  const uit = new Set<string>();
  for (const { deel } of VASTE_MODELLEN[code].delen(r)) {
    const wat = VLAK[deel.soort];
    if (!wat || !deel.vlak || !deel.lagen.length) continue;
    const lagen = deel.lagen.map((l) => `${klein(l.naam)}${l.dikte >= 1 ? ` ${String(Math.round(l.dikte * 10) / 10).replace('.', ',')} mm` : ''}`);
    uit.add(`${wat}: ${lagen.join(', ')}`);
  }
  return [...uit];
}

// ---------- een keuze die niet meer kan, vanzelf omzetten ----------

/** Wat `herstelKeuzes` veranderde: welk kenmerk, en een korte zin in gewone taal. */
export interface Herstel { kenmerk: string; melding: string }

/** Eerste letter klein, midden in een zin; een afkorting (EPDM, PVC) blijft zoals ze is. */
const klein = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

/**
 * Een getal binnen min en max, op de stappen van het kenmerk (de motor wil een veelvoud van de stap): buiten de grenzen
 * de dichtste grens op een stap, daarbinnen de dichtste stap.
 */
function opStap(w: number, min: number | undefined, max: number | undefined, stap: number | undefined): number {
  let x = stap && Math.abs(w / stap - Math.round(w / stap)) > 1e-9 ? Math.round(w / stap) * stap : w;
  if (max !== undefined && x > max) x = stap ? Math.floor(max / stap + 1e-9) * stap : max;
  if (min !== undefined && x < min) x = stap ? Math.ceil(min / stap - 1e-9) * stap : min;
  return x;
}

/**
 * Zet keuzes die niet meer kunnen om naar wat wel kan, zodat een scherm geen fout hoeft te tonen voor iets wat de
 * gebruiker niet zelf koos: een keuze die niet beschikbaar is (EPDM bij een zadeldak) wordt de eerste die het wel is,
 * een getal buiten zijn grenzen (de maat van de berging als de carport smaller wordt) wordt de dichtste grens. Alleen
 * zichtbare kenmerken; herhaald tot er niets meer verandert (een omzetting kan een volgende vragen). Geeft de nieuwe
 * keuzes en wat er veranderde. Een fout uit een regel van het model (een deur die niet in de wand past) blijft staan:
 * die zegt het model zelf.
 */
export function herstelKeuzes(model: ProductModel, keuzes: Keuzes, prijslijst: Prijslijst = {}): { keuzes: Keuzes; hersteld: Herstel[] } {
  const k: Keuzes = { ...keuzes };
  const hersteld: Herstel[] = [];
  for (let ronde = 0; ronde < 8; ronde++) {
    const r = berekenConfiguratie(model, k, prijslijst);
    let veranderd = false;
    for (const s of r.kenmerken) {
      if (!s.zichtbaar) continue;
      const def = model.kenmerken.find((x) => x.code === s.code);
      if (s.type === 'keuze' && s.keuzes) {
        const gekozen = s.keuzes.find((x) => x.code === s.waarde);
        const eerste = s.keuzes.find((x) => x.beschikbaar);
        if (gekozen && !gekozen.beschikbaar && eerste) {
          k[s.code] = eerste.code;
          hersteld.push({ kenmerk: s.code, melding: `${s.label}: ${klein(gekozen.label)} kan niet meer${gekozen.reden ? ` (${gekozen.reden})` : ''}. Nu: ${klein(eerste.label)}.` });
          veranderd = true;
        }
      }
      if (s.type === 'getal' && typeof s.waarde === 'number') {
        const w = s.waarde;
        const stap = def?.type === 'getal' ? def.stapgrootte : undefined;
        const x = opStap(w, s.min, s.max, stap);
        if (x !== w) {
          k[s.code] = x;
          const eenheid = def?.type === 'getal' && def.eenheid ? ` ${def.eenheid}` : '';
          const binnen = (s.min === undefined || w >= s.min) && (s.max === undefined || w <= s.max);
          const waarom = binnen ? `per ${stap}${eenheid}` : w > x ? `hoogstens ${x}${eenheid} bij deze keuzes` : `minstens ${x}${eenheid} bij deze keuzes`;
          hersteld.push({ kenmerk: s.code, melding: `${s.label}: ${waarom}. Nu: ${x}${eenheid}.` });
          veranderd = true;
        }
      }
    }
    if (!veranderd) break;
  }
  return { keuzes: k, hersteld };
}

// ---------- een ontwerp uit de snelstart altijd geldig ----------

const fouten = (r: ConfiguratieResultaat) => r.meldingen.filter((m) => m.ernst === 'fout').map((m) => m.code);
const omlaag25 = (x: number) => Math.floor(x / 25) * 25;

/**
 * Maakt keuzes geldig die de snelstart samenstelt uit een vertrekpunt en de maten van de verkoper: eerst `herstelKeuzes`,
 * dan wat een regel van het model verbiedt en de snelstart zelf kan oplossen. Een tuinhuis dat te smal is voor zijn deur
 * krijgt een smallere deur; bij een loods worden de poorten lager (zijhoogte), smaller (gevel of travee) of valt de laatste
 * poort weg, de betonpanelen lager, en gaat de loopdeur naar een andere travee. Geeft de keuzes (ook als het niet lukt:
 * dan meldt het model zelf de fout).
 */
export function maakGeldig(code: VastModelCode, keuzes: Keuzes): Keuzes {
  const v = VASTE_MODELLEN[code];
  let k = herstelKeuzes(v.model, keuzes, v.prijslijst).keuzes;
  for (let ronde = 0; ronde < 12; ronde++) {
    const r = berekenVastModel(code, k);
    const f = fouten(r);
    if (!f.length) break;
    const a = r.afgeleid;
    k = { ...k };
    if (code === 'TUINHUIS' && f.includes('deur_past_niet')) {
      k.deur = k.deur === 'schuifraam' ? 'dubbel' : 'enkel';
    } else if (code === 'LOODS') {
      const zij = num(k.zijhoogte, 450), breedte = num(k.breedte, 1500), afstand = num(k.afstand, 600), kolom = num(a.kolom_b, 24);
      if (f.includes('beton_hoog')) k.beton = `b${Math.max(0, Math.floor((zij - 100) / 100) * 100)}`;
      for (const n of [1, 2, 3]) {
        if (f.includes(`poort${n}_hoog`)) k[`poort${n}_hoogte`] = Math.max(225, omlaag25(zij - 30));
        if (f.includes(`poort${n}_kolommen`)) k[`poort${n}_breedte`] = Math.max(200, omlaag25(afstand - kolom - 2 * POORTSTIJL_MARGE));
        if (f.includes(`poort${n}_deur`)) k.loopdeur_travee = (num(k.loopdeur_travee, 1) % num(k.traveeen, 5)) + 1;
      }
      for (const n of [2, 3]) for (const m of [1, 2].filter((x) => x < n)) {
        if (f.includes(`poorten_${m}_${n}_samen`)) k[`poort${n}_travee`] = (num(k[`poort${m}_travee`], 1) % num(k.traveeen, 5)) + 1;
      }
      for (const g of ['voor', 'achter'] as const) {
        if (!f.includes(`kopgevel_${g}_vol`)) continue;
        const hier = [1, 2, 3].filter((n) => k[`poort${n}_gevel`] === g);
        const deur = k.loopdeur_gevel === g ? LOOPDEUR.rand + LOOPDEUR.breedte + POORT_MARGE : 0;
        const elk = omlaag25((breedte - (hier.length + 1) * POORT_MARGE - deur) / hier.length);
        if (elk >= 200) for (const n of hier) k[`poort${n}_breedte`] = Math.min(num(k[`poort${n}_breedte`], 400), elk);
        else k[`poort${hier[hier.length - 1]}_gevel`] = 'geen';
      }
    } else break;
    k = herstelKeuzes(v.model, k, v.prijslijst).keuzes;
  }
  return k;
}

// ---------- de meetstaat in gewone taal ----------

/** De groepen van de meetstaat zoals een titel ("Hout", "Metselwerk en beton"). */
export const meetstaatGroep = (g: string) => g.charAt(0).toUpperCase() + g.slice(1);

const getal = (x: number, cijfers = 0) => x.toLocaleString('nl-BE', { minimumFractionDigits: cijfers, maximumFractionDigits: cijfers });

/**
 * Eén regel van de meetstaat als tekst, zonder prijzen: "Paal · Douglas (draagstructuur) 150 × 150 mm: 4 stuks, 9,8 m",
 * "Kolom · HEA 240: 12 stuks, 54,0 m, ± 3.240 kg (richtwaarde)", "EPDM 1,2 mm: 31,4 m²".
 */
export function meetstaatTekst(m: MeetstaatRegel): string {
  const rol = m.rol ? `${STUK_ROLLEN[m.rol].charAt(0).toUpperCase()}${STUK_ROLLEN[m.rol].slice(1)} · ` : '';
  const doorsnede = m.doorsnede ? ` ${m.doorsnede}${m.groep === 'staal' ? '' : ' mm'}` : '';
  if (m.aantal !== undefined && m.lengte !== undefined) {
    const gewicht = m.gewicht ? `, ± ${getal(m.gewicht)} kg${m.gewichtHerkomst?.nagelezen ? '' : ' (richtwaarde)'}` : '';
    return `${rol}${m.label}${doorsnede}: ${m.aantal} ${m.aantal === 1 ? 'stuk' : 'stuks'}, ${getal(m.lengte, 1)} m${gewicht}`;
  }
  if (m.lengte !== undefined) return `${rol}${m.label}${doorsnede}: ${getal(m.lengte, 1)} m`;
  const dikte = m.dikte ? ` ${getal(m.dikte, m.dikte < 10 && m.dikte % 1 ? 1 : 0)} mm` : '';
  return `${m.label}${dikte}: ${getal(m.m2 ?? 0, 1)} m²`;
}
