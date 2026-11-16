/**
 * Maatlijst lezen: een lijst ramen en deuren geplakt uit Excel, een mail of een opmeting,
 * bv. "Keuken 1200 x 1400 draai-kip links 2 st". Elke regel wordt één positie (raammodel RAAM).
 * Bedoeld voor offertes zonder plattegrond ("enkel ramen"): snel een prijs, daarna verfijnen in de configurator.
 *
 * Herkend per regel (hoofdletters maken niet uit):
 * - maten: "1200 x 1400", "1200×1400", "1200*1400" of twee getallen in aparte kolommen (breedte, hoogte);
 *   in mm, of in cm als beide maten kleiner zijn dan 400 (dan × 10);
 * - aantal: "2 st", "2 stuks", "2x" (niet gevolgd door een maat) of "aantal 2"; anders 1;
 * - soort: voordeur, terrasdeur (of "deur"), schuifraam/schuifdeur, anders raam;
 * - indeling: vast, kip, draai, draai-kip, links/rechts; meerdere vakken met "+" (bv. "vast + draai-kip");
 * - ruimte: living/leefruimte, keuken, slaapkamer, bureau, badkamer, wc, hal/inkom/overloop, berging/garage;
 * - verdieping: "verdieping", "1e verd", "boven" (= 1) of "gelijkvloers".
 *
 * Sinds 16/11 (doorloop B9):
 * - een kopregel uit Excel (Pos, Omschrijving, Soort, Breedte, Hoogte, Aantal, Ruimte, Verdieping, in elke volgorde) wordt
 *   gelezen: de regels eronder per kolom, zodat een kolom met posnummers niet meer als aantal telt;
 * - zonder kopregel telt een klein getal vóór de omschrijving (een posnummer) niet als aantal, het laatste klein getal
 *   ná de maten wel;
 * - de soort ook: hef-schuifdeur, vouwwand, glaswand, en een garagepoort ("garage poort 2500 x 2150"), die het model
 *   van de garagepoort krijgt (`model: 'POORT'`).
 */
import type { Keuzes } from '../src/index.js';
import { raamdeur } from './raam.js';

export interface MaatRegel {
  /** Regelnummer in de geplakte tekst (vanaf 1). */
  regel: number;
  naam: string;
  aantal: number;
  /** Keuzes voor het raammodel (alleen wat uit de regel volgt; de rest blijft standaard). */
  keuzes: Keuzes;
  waarschuwingen: string[];
  /** Het model: ontbreekt = een raam of deur (RAAM); `POORT` = een sectionale garagepoort (keuzes breedte en hoogte). */
  model?: 'POORT';
}

/** Kolommen die een kopregel kan noemen. */
type Kolom = 'pos' | 'omschrijving' | 'soort' | 'breedte' | 'hoogte' | 'aantal' | 'ruimte' | 'verdieping';
const KOPPEN: [RegExp, Kolom][] = [
  [/^(pos(itie)?|nr|nummer|ref(erentie)?|code)\.?$/i, 'pos'],
  [/^(omschrijving|naam|beschrijving|benaming|plaats|item)$/i, 'omschrijving'],
  [/^(soort|type)$/i, 'soort'],
  [/^(breedte|br|b|width)\.?(\s*\(?(mm|cm)\)?)?$/i, 'breedte'],
  [/^(hoogte|h|height)\.?(\s*\(?(mm|cm)\)?)?$/i, 'hoogte'],
  [/^(aantal|aant|st|stuks?|qty|#)\.?$/i, 'aantal'],
  [/^(ruimte|lokaal|kamer)$/i, 'ruimte'],
  [/^(verdieping|verd|niveau)\.?$/i, 'verdieping'],
];

/** Een kopregel: welke kolom wat bevat (minstens breedte en hoogte), en of de maten in cm staan. */
function leesKop(cellen: string[]): { kolom: Partial<Record<Kolom, number>>; cm: boolean } | undefined {
  const kolom: Partial<Record<Kolom, number>> = {};
  let cm = false;
  cellen.forEach((c, i) => {
    const k = KOPPEN.find(([re]) => re.test(c))?.[1];
    if (k && kolom[k] === undefined) kolom[k] = i;
    if (k && (k === 'breedte' || k === 'hoogte') && /\bcm\b/i.test(c)) cm = true;
  });
  return kolom.breedte !== undefined && kolom.hoogte !== undefined ? { kolom, cm } : undefined;
}

const GETAL = /^\d{2,5}(?:[.,]\d+)?$/;
const KLEIN = /^\d{1,3}$/;
const getal = (c?: string) => (c && GETAL.test(c.trim()) ? Number(c.trim().replace(',', '.')) : undefined);

/** De soort uit de tekst van de regel: eerst wat het langst is (hef-schuif vóór schuif, garagepoort vóór deur). */
function soortVan(t: string): string {
  if (/garage\s*-?\s*(poort|deur)|sectiona(a)?le?\s*poort|kantelpoort|\bpoort\b/i.test(t)) return 'poort';
  if (/hef\s*-?\s*schuif/i.test(t)) return 'hefschuif';
  if (/vouw\s*-?\s*(wand|deur)/i.test(t)) return 'vouwwand';
  if (/glaswand|glaspartij|vaste beglazing/i.test(t)) return 'glaswand';
  if (/voordeur/i.test(t)) return 'voordeur';
  if (/schuif/i.test(t)) return 'schuif';
  if (/deur/i.test(t)) return 'terrasdeur';
  return 'raam';
}

/** Gelijke delen volgens de breedte (mm), binnen wat de soort kent. */
const tussen = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
const DELEN: Record<string, (b: number) => Keuzes> = {
  hefschuif: (b) => { const n = tussen(Math.round(b / 1700), 2, 4); return { delen: `d${n}`, profiel: 'alu_hi', ...(n === 3 ? { schuif_richting: 'beide' } : {}) }; },
  vouwwand: (b) => ({ delen: `d${tussen(Math.ceil(b / 1000), 3, 6)}`, profiel: 'alu' }),
  glaswand: (b) => ({ delen: `d${tussen(Math.ceil(b / 1500), 1, 6)}`, profiel: 'alu_hi', tussenstijl: 'versterkt' }),
};
const SOORTNAAM: Record<string, string> = { raam: 'Raam', terrasdeur: 'Terrasdeur', voordeur: 'Voordeur', schuif: 'Schuifraam', hefschuif: 'Hef-schuifdeur', vouwwand: 'Vouwwand', glaswand: 'Glaswand', poort: 'Garagepoort' };
const LIDWOORD: Record<string, string> = { raam: 'een raam', terrasdeur: 'een terrasdeur', voordeur: 'een voordeur', schuif: 'een schuifraam', hefschuif: 'een hef-schuifdeur', vouwwand: 'een vouwwand', glaswand: 'een glaswand', poort: 'een garagepoort' };

export interface MaatlijstResultaat {
  regels: MaatRegel[];
  /** Regels zonder maten (bv. een kopregel), met de reden. */
  overgeslagen: { regel: number; tekst: string; reden: string }[];
}

const RUIMTES: [RegExp, string][] = [
  [/\b(living|leefruimte|woonkamer|zithoek|eethoek|veranda)\b/i, 'leefruimte'],
  [/\bkeuken\b/i, 'keuken'],
  [/\b(slaapkamer|slpk|kamer)\b/i, 'slaapkamer'],
  [/\b(bureau|kantoor)\b/i, 'bureau'],
  [/\b(badkamer|bad)\b/i, 'badkamer'],
  [/\b(wc|toilet)\b/i, 'wc'],
  [/\b(hal|inkom|gang|overloop|nachthal|trap)\b/i, 'hal'],
  [/\b(berging|garage|wasplaats|bijkeuken)\b/i, 'berging'],
];
const DROOG = new Set(['leefruimte', 'slaapkamer', 'bureau']);

/** Opening van één vak uit een stukje tekst (zonder links/rechts: links). */
function vakVan(t: string): string | undefined {
  const kant = /\brechts\b|\br\b/i.test(t) ? 'r' : 'l';
  if (/draai[\s-]*kip|dk\b/i.test(t)) return `draaikip_${kant}`;
  if (/\b(kip|valraam|val)\b/i.test(t)) return 'kip';
  if (/\bdraai/i.test(t)) return `draai_${kant}`;
  if (/\bvast\b/i.test(t)) return 'vast';
  return undefined;
}

/** Bereik per soort uit het raammodel (mm). */
function bereik(soort: string): { minb: number; maxb: number; minh: number; maxh: number } | undefined {
  const k = raamdeur.kenmerken.find((x) => x.code === 'type');
  const e = k && 'keuzes' in k ? k.keuzes?.find((x) => x.code === soort)?.eigenschappen : undefined;
  return e ? { minb: Number(e.minb), maxb: Number(e.maxb), minh: Number(e.minh), maxh: Number(e.maxh) } : undefined;
}


export function leesMaatlijst(tekst: string): MaatlijstResultaat {
  const regels: MaatRegel[] = [];
  const overgeslagen: MaatlijstResultaat['overgeslagen'] = [];
  /** De kolommen uit de laatste kopregel (Excel), voor de regels eronder. */
  let kop: ReturnType<typeof leesKop>;
  tekst.split(/\r?\n/).forEach((ruw, i) => {
    const lijn = ruw.trim();
    if (!lijn) return;
    const nr = i + 1;
    // Kolommen (tab of puntkomma): `ruweCellen` houdt de lege cellen, zodat elke waarde in haar kolom blijft.
    const ruweCellen = lijn.split(/\t|;/).map((c) => c.trim());
    const cellen = ruweCellen.filter(Boolean);
    const kolommen = ruweCellen.length > 1;
    const waarschuwingen: string[] = [];

    let b: number | undefined, h: number | undefined, rest = lijn, aantal: number | undefined, naamCel = '', cm = false;
    let xm: RegExpExecArray | null = null;
    if (kop && kolommen) {
      // Onder een kopregel: elke waarde uit haar eigen kolom.
      const k = kop;
      const cel = (c: Kolom) => (k.kolom[c] !== undefined ? ruweCellen[k.kolom[c]!] ?? '' : '');
      b = getal(cel('breedte'));
      h = getal(cel('hoogte'));
      if (KLEIN.test(cel('aantal'))) aantal = Number(cel('aantal'));
      naamCel = cel('omschrijving') || cel('soort') || cel('ruimte');
      const verd = cel('verdieping');
      const verdTekst = !verd ? '' : /^\d$/.test(verd) ? (Number(verd) > 0 ? 'verdieping' : 'gelijkvloers') : verd;
      rest = [cel('omschrijving'), cel('soort'), cel('ruimte'), verdTekst].filter(Boolean).join(' ');
      cm = k.cm;
    } else {
      // Maten: eerst "b x h", anders de eerste twee getallen ≥ 40 in aparte kolommen.
      xm = /(\d{2,4}(?:[.,]\d)?)\s*[x×*]\s*(\d{2,4}(?:[.,]\d)?)/i.exec(lijn);
      if (xm) {
        b = Number(xm[1]!.replace(',', '.'));
        h = Number(xm[2]!.replace(',', '.'));
        rest = lijn.replace(xm[0], ' ');
      } else {
        const maat = (c: string) => /^\d{2,4}(?:[.,]\d)?$/.test(c) && Number(c.replace(',', '.')) >= 40;
        const iB = cellen.findIndex(maat);
        const iH = iB < 0 ? -1 : cellen.findIndex((c, j) => j > iB && maat(c));
        if (iH > 0) {
          b = Number(cellen[iB]!.replace(',', '.'));
          h = Number(cellen[iH]!.replace(',', '.'));
          // Een klein getal als eerste kolom, vóór de omschrijving, is een posnummer: geen aantal (doorloop B9). Het
          // aantal is het laatste kleine getal ná de maten.
          const pos = KLEIN.test(cellen[0]!) && cellen.slice(1, iB).some((c) => /[a-z]/i.test(c)) ? 0 : -1;
          const na = cellen.map((c, j) => (j > iH && KLEIN.test(c) ? j : -1)).filter((j) => j >= 0);
          const iA = na[na.length - 1];
          if (iA !== undefined) aantal = Number(cellen[iA]);
          rest = cellen.filter((_, j) => j !== iB && j !== iH && j !== pos && j !== iA).join(' ');
        }
      }
    }
    if (b === undefined || h === undefined) {
      const k = !(kop && kolommen) ? leesKop(ruweCellen) : undefined;
      if (k) kop = k;
      overgeslagen.push({ regel: nr, tekst: lijn, reden: k || /breedte|hoogte|omschrijving|aantal/i.test(lijn) ? 'kopregel' : 'geen maten gevonden (bv. 1200 x 1400)' });
      return;
    }
    if (cm || (b < 400 && h < 400)) {
      b *= 10;
      h *= 10;
      waarschuwingen.push('maten in cm gelezen (× 10)');
    }
    b = Math.round(b);
    h = Math.round(h);

    // Aantal in vrije tekst: "2 st", "2x", "aantal 2", of een los klein getal ("Keuken 1200 x 1400 2").
    if (aantal === undefined) {
      const am = /\baantal\s*:?\s*(\d{1,3})\b|\b(\d{1,3})\s*(?:st(?:uks?)?\b|x(?!\s*\d)|×(?!\s*\d))/i.exec(rest);
      if (am) {
        aantal = Number(am[1] ?? am[2]);
        rest = rest.replace(am[0], ' ');
      } else if (!kolommen) {
        const los = rest.split(/\s+/).find((c) => /^\d{1,2}$/.test(c));
        if (los) { aantal = Number(los); rest = rest.replace(new RegExp(`\\b${los}\\b`), ' '); }
      }
    }
    aantal = Math.max(1, aantal ?? 1);

    // Soort: uit de omschrijving (garagepoort, hef-schuifdeur, vouwwand, glaswand, voordeur, schuifraam, deur, raam).
    const soort = soortVan(rest);
    // Naam: de tekst van de regel zonder maten en aantal, anders soort en maat.
    const naamTekst = (naamCel || (cellen.find((c) => /[a-zA-Z]/.test(c) && !/^\d/.test(c)) ?? '')).replace(/\s+/g, ' ').trim();
    const naamRuw = (xm && !kolommen ? lijn.slice(0, lijn.indexOf(xm[0])).trim() : naamTekst) || `${SOORTNAAM[soort]} ${b} × ${h}`;
    const naam = naamRuw.length > 60 ? `${naamRuw.slice(0, 57)}…` : naamRuw;

    if (soort === 'poort') {
      // Een sectionale garagepoort: het eigen model, alleen breedte en hoogte (dagmaat van de opening).
      if (b < 2000 || b > 6000 || h < 1900 || h > 3000) waarschuwingen.push('maat buiten het bereik voor een garagepoort (2000–6000 × 1900–3000 mm)');
      regels.push({ regel: nr, naam, aantal, keuzes: { breedte: b, hoogte: h }, waarschuwingen, model: 'POORT' });
      return;
    }
    const keuzes: Keuzes = { type: soort, breedte: b, hoogte: h, ...(DELEN[soort]?.(b) ?? {}) };
    if (soort !== 'raam') keuzes.glas = 'dubbel_gelaagd';
    // Grote schuiframen zijn in de praktijk meestal aluminium (stijver profiel; PVC haalt de statiek vaak niet).
    if (soort === 'schuif') keuzes.profiel = 'alu';

    // Ruimte en verdieping.
    const ruimte = RUIMTES.find(([re]) => re.test(rest))?.[1] ?? (soort === 'voordeur' ? 'hal' : undefined);
    if (ruimte) keuzes.ruimte = ruimte;
    if (/\b(verdieping|verd\.?|boven|1e|eerste)\b/i.test(rest)) keuzes.verdieping = 1;
    if (/\b(gelijkvloers|gv|beneden)\b/i.test(rest)) keuzes.verdieping = 0;

    // Indeling.
    if (soort === 'voordeur') {
      if (/\brechts\b/i.test(rest)) keuzes.deur_draai = 'rechts';
      if (/\blinks\b/i.test(rest)) keuzes.deur_draai = 'links';
      if (/naar buiten|buitendraaiend/i.test(rest)) keuzes.deur_naar = 'buiten';
    } else if (soort === 'schuif') {
      if (/\bbeide\b/i.test(rest)) keuzes.schuif_richting = 'beide';
      else if (/\brechts\b/i.test(rest)) keuzes.schuif_richting = 'rechts';
    } else if (soort === 'raam' || soort === 'terrasdeur') {
      const stukken = rest.includes('+') ? rest.split('+') : [rest];
      let vakken = stukken.map(vakVan).filter((x): x is string => !!x).slice(0, 3);
      if (soort === 'terrasdeur') vakken = vakken.map((v) => (v === 'kip' ? 'draai_l' : v.replace('draaikip', 'draai')));
      if (vakken.length) {
        keuzes.vakken = `v${vakken.length}`;
        vakken.forEach((v, j) => { keuzes[`vak${j + 1}`] = v; });
      } else if (ruimte === 'badkamer' || ruimte === 'wc') {
        keuzes.vak1 = 'kip';
      }
    }
    if ((ruimte === 'badkamer' || ruimte === 'wc') && soort === 'raam') keuzes.glas = 'mat_gelaagd';
    if (ruimte && DROOG.has(ruimte) && soort !== 'voordeur') keuzes.rooster = true;
    if (soort !== 'raam') keuzes.borstwering = 0;

    const r = bereik(soort);
    if (r && (b < r.minb || b > r.maxb || h < r.minh || h > r.maxh)) {
      waarschuwingen.push(`maat buiten het bereik voor ${LIDWOORD[soort]} (${r.minb}–${r.maxb} × ${r.minh}–${r.maxh} mm)`);
    }
    regels.push({ regel: nr, naam, aantal, keuzes, waarschuwingen });
  });
  return { regels, overgeslagen };
}
