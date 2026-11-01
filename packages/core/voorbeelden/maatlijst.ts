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
}

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
  tekst.split(/\r?\n/).forEach((ruw, i) => {
    const lijn = ruw.trim();
    if (!lijn) return;
    const nr = i + 1;
    const cellen = lijn.split(/\t|;/).map((c) => c.trim()).filter(Boolean);
    const waarschuwingen: string[] = [];

    // Maten: eerst "b x h", anders de eerste twee getallen ≥ 40 in aparte kolommen.
    let b: number | undefined, h: number | undefined, rest = lijn;
    const xm = /(\d{2,4}(?:[.,]\d)?)\s*[x×*]\s*(\d{2,4}(?:[.,]\d)?)/i.exec(lijn);
    if (xm) {
      b = Number(xm[1]!.replace(',', '.'));
      h = Number(xm[2]!.replace(',', '.'));
      rest = lijn.replace(xm[0], ' ');
    } else {
      const getallen = cellen.filter((c) => /^\d{2,4}(?:[.,]\d)?$/.test(c)).map((c) => Number(c.replace(',', '.'))).filter((x) => x >= 40);
      if (getallen.length >= 2) {
        [b, h] = getallen as [number, number];
        let weg = 0;
        rest = cellen.filter((c) => {
          if (weg < 2 && /^\d{2,4}(?:[.,]\d)?$/.test(c) && Number(c.replace(',', '.')) >= 40) { weg++; return false; }
          return true;
        }).join(' ');
      }
    }
    if (b === undefined || h === undefined) {
      overgeslagen.push({ regel: nr, tekst: lijn, reden: /breedte|hoogte|omschrijving|aantal/i.test(lijn) ? 'kopregel' : 'geen maten gevonden (bv. 1200 x 1400)' });
      return;
    }
    if (b < 400 && h < 400) {
      b *= 10;
      h *= 10;
      waarschuwingen.push('maten in cm gelezen (× 10)');
    }
    b = Math.round(b);
    h = Math.round(h);

    // Aantal.
    let aantal = 1;
    const am = /\baantal\s*:?\s*(\d{1,3})\b|\b(\d{1,3})\s*(?:st(?:uks?)?\b|x(?!\s*\d)|×(?!\s*\d))/i.exec(rest);
    if (am) {
      aantal = Math.max(1, Number(am[1] ?? am[2]));
      rest = rest.replace(am[0], ' ');
    } else {
      // Een losse kolom met een klein getal (bv. Excel: naam | b | h | aantal).
      const los = rest.split(/\s+/).find((c) => /^\d{1,2}$/.test(c));
      if (los) { aantal = Math.max(1, Number(los)); rest = rest.replace(new RegExp(`\\b${los}\\b`), ' '); }
    }

    // Soort.
    const soort = /voordeur/i.test(rest) ? 'voordeur' : /schuif/i.test(rest) ? 'schuif' : /deur/i.test(rest) ? 'terrasdeur' : 'raam';
    const keuzes: Keuzes = { type: soort, breedte: b, hoogte: h };
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
    } else {
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
      waarschuwingen.push(`maat buiten het bereik voor ${soort === 'schuif' ? 'een schuifraam' : `een ${soort}`} (${r.minb}–${r.maxb} × ${r.minh}–${r.maxh} mm)`);
    }

    // Naam: de tekst van de regel zonder maten en aantal, anders soort en maat.
    const naamTekst = (cellen.find((c) => /[a-zA-Z]/.test(c) && !/^\d/.test(c)) ?? '').replace(/\s+/g, ' ').trim();
    const soortNaam = { raam: 'Raam', terrasdeur: 'Terrasdeur', voordeur: 'Voordeur', schuif: 'Schuifraam' }[soort]!;
    const naam = (xm ? lijn.slice(0, lijn.indexOf(xm[0])).trim() : naamTekst) || `${soortNaam} ${b} × ${h}`;
    regels.push({ regel: nr, naam: naam.length > 60 ? `${naam.slice(0, 57)}…` : naam, aantal, keuzes, waarschuwingen });
  });
  return { regels, overgeslagen };
}
