/**
 * De 3D-werkbank: één afspraak tussen "iets dat in 3D getoond kan worden" en het gereedschap eromheen.
 *
 * Een **bron** is een collectie van dingen die elk een 3D-scène opleveren: de zetels van de collectie, de meubels van de
 * inrichting, de ramen en deuren, de voorbeeldwoning, een ijkblok voor het licht … Het gereedschap (controleblad,
 * modelbeelden, lichtmeting, de werkbankpagina) kent alleen deze afspraak, niet de onderdelen zelf. Wie een nieuw
 * 3D-onderdeel maakt, schrijft één bron (een twintigtal regels, zie voorbeelden/werkbank-bronnen.ts) en krijgt alles
 * erbij: beelden vanuit elk standpunt en in elk licht, een controleblad naast de foto's, en de vergelijking met de
 * vorige ronde.
 *
 * Geen afhankelijkheid van een scherm of van three.js: een bron levert gegevens (items en scènes).
 */
import type { Scene3D } from './ruimtelijk.js';

/** Eén ding uit een bron: een model, een meubel, een raam … */
export interface WerkbankItem {
  code: string;
  naam: string;
  /** Groep binnen de bron (familie, soort meubel, type raam): voor de filter en de volgorde. */
  groep: string;
  omschrijving?: string;
  /** Wat op het controleblad naast het beeld staat: [label, waarde], bv. ['Maten', '250 × 100 × 78 cm']. */
  feiten: [string, string][];
  /** Waar de gegevens vandaan komen en hoe zeker ze zijn (productpagina, fiche, "afgeleid uit foto's"). */
  bron?: string;
  /** Sleutel van de referentiefoto (bestand <sleutel>.jpg in de fotomap van de bron), als er een is. */
  foto?: string;
  /** Hoofdkleur (#rrggbb) zoals op de staal: voor de lichtmeting (ziet de kleur er in 3D uit zoals op de staal?). */
  kleur?: string;
}

/** Een reeks keuzes waarmee hetzelfde item in varianten getoond kan worden (bv. alle poten). */
export interface WerkbankReeks {
  groep: string;
  label: string;
  keuzes: { code: string; label: string }[];
}

export interface WerkbankBron {
  code: string;
  titel: string;
  /** Eén zin: wat er in deze bron zit. */
  uitleg: string;
  /**
   * Hoe de weergave ingesteld wordt: 'zetel' (meubel alleen in beeld: zachte schaduw, contactschaduw, decors, geijkt
   * licht) of 'bouw' (gebouw of onderdeel ervan: harde schaduw, geen decor).
   */
  weergave: 'zetel' | 'bouw';
  /** Map met de referentiefoto's, vanaf de hoofdmap van het project (bv. 'packages/demo-web/fotos'). */
  fotomap?: string;
  items(): WerkbankItem[];
  /** De scène van één item; `keuzes` wijkt af van het item zelf (groep → keuze), voor een reeks. */
  scene(code: string, keuzes?: Record<string, string>): Scene3D;
  /** De reeksen die voor een item gemaakt kunnen worden. */
  reeksen?(code: string): WerkbankReeks[];
}

/**
 * Stabiele vingerafdruk van gegevens (FNV-1a over de tekst, sleutels gesorteerd): dezelfde gegevens geven altijd dezelfde
 * korte code, in welke volgorde de velden ook staan. Het gereedschap gebruikt ze om alleen opnieuw te tekenen wat
 * veranderd is: zelfde scène + zelfde weergave + zelfde instellingen = zelfde beeld.
 */
export function vingerafdruk(waarde: unknown): string {
  const tekst = JSON.stringify(waarde, (_sleutel, w) =>
    w && typeof w === 'object' && !Array.isArray(w) ? Object.fromEntries(Object.entries(w as object).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : w) ?? '';
  // Twee onafhankelijke 32-bitsommen naast elkaar: ruim genoeg voor enkele duizenden beelden.
  let a = 0x811c9dc5, b = 0x9e3779b1;
  for (let i = 0; i < tekst.length; i++) {
    const c = tekst.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x85ebca6b) + ((b << 5) | (b >>> 27));
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

export interface BronMelding {
  item: string;
  tekst: string;
}

/**
 * Controleert een bron zonder iets te tekenen: unieke codes, en voor elk item een scène met onderdelen, eindige maten en
 * een kader dat klopt. Vangt de fouten die anders pas als een leeg of scheef beeld opvallen.
 */
export function controleerBron(bron: WerkbankBron): BronMelding[] {
  const uit: BronMelding[] = [];
  const gezien = new Set<string>();
  for (const item of bron.items()) {
    const meld = (tekst: string) => uit.push({ item: item.code, tekst });
    if (gezien.has(item.code)) meld('code komt twee keer voor');
    gezien.add(item.code);
    if (!item.naam.trim()) meld('geen naam');
    let s: Scene3D;
    try { s = bron.scene(item.code); } catch (fout) { meld(`geen scène: ${String((fout as Error)?.message ?? fout)}`); continue; }
    if (!s.blokken.length) { meld('scène zonder onderdelen'); continue; }
    for (const b of s.blokken) {
      if (![b.x, b.y, b.z, b.b, b.h, b.d].every(Number.isFinite)) { meld(`onderdeel ${b.code}: maat of plaats is geen getal`); break; }
      if (b.b <= 0 || b.h <= 0 || b.d <= 0) { meld(`onderdeel ${b.code}: maat nul of negatief`); break; }
    }
    const k = s.kader;
    if (![k.x, k.z, k.b, k.d, k.h].every(Number.isFinite) || k.b <= 0 || k.d <= 0 || k.h <= 0) meld('kader klopt niet');
    for (const r of bron.reeksen?.(item.code) ?? []) {
      for (const keuze of r.keuzes) {
        try { if (!bron.scene(item.code, { [r.groep]: keuze.code }).blokken.length) meld(`reeks ${r.groep} = ${keuze.code}: lege scène`); }
        catch (fout) { meld(`reeks ${r.groep} = ${keuze.code}: ${String((fout as Error)?.message ?? fout)}`); }
      }
    }
  }
  return uit;
}
