/**
 * Sferen voor binnen (ronde 12): één tik zet vloer, wand, plafond en plint in alle ruimtes van de woning. Gegevens, zoals
 * de stijlen (`stijlen.ts`): een aannemer kan later zijn eigen sferen vastleggen. Alle codes komen uit `planCatalogus`
 * (`inrichting.ts`). Voorbeelden, door geen aannemer of binnenhuisarchitect nagelezen.
 *
 * Per sfeer wat een gewone ruimte krijgt (leefruimte, keuken, hal, bureau), wat een slaapkamer anders krijgt, wat een natte
 * ruimte krijgt (badkamer, wc) en wat een berging anders krijgt dan een natte ruimte. Een garage en een bestaande ruimte
 * blijven ongemoeid; een accentmuur blijft staan. Nadien blijft per ruimte alles aan te passen.
 */
import type { Plattegrond, Ruimte, RuimteType } from '../src/index.js';

/** Wat een ruimte van een sfeer krijgt. Zonder plint: geen plint. */
export interface SfeerKeuze { vloer: string; wand: string; plafond: string; plint?: string }

export interface Sfeer {
  label: string;
  /** Eén zin voor de verkoper. */
  uitleg: string;
  gewoon: SfeerKeuze;
  /** Wat een slaapkamer anders krijgt dan een gewone ruimte. */
  slaap?: Partial<SfeerKeuze>;
  /** Badkamer en wc. */
  nat: SfeerKeuze;
  /** Wat een berging anders krijgt dan een natte ruimte. */
  berging?: Partial<SfeerKeuze>;
  /** De afwerking die een nieuwe accentmuur in deze sfeer krijgt (een code uit `wanden`). */
  accent: string;
}

/** De ingebouwde sferen. Een nieuwe sfeer = een nieuwe rij; het staal in het scherm tekent zichzelf. */
export const sfeerCatalogus: Record<string, Sfeer> = {
  licht: {
    label: 'Licht en modern',
    uitleg: 'Grote lichte tegels, witte wanden en plafonds, een witte plint; parket in de slaapkamers.',
    gewoon: { vloer: 'tegel_wit', wand: 'wit', plafond: 'wit', plint: 'wit' },
    slaap: { vloer: 'parket_eik' },
    nat: { vloer: 'tegel_wit', wand: 'tegels_wit', plafond: 'wit', plint: 'tegel' },
    berging: { wand: 'wit' },
    accent: 'salie',
  },
  hout: {
    label: 'Warm hout',
    uitleg: 'Eiken parket met een houten plint, gebroken wit; saliegroen in de slaapkamers.',
    gewoon: { vloer: 'parket_eik', wand: 'gebroken_wit', plafond: 'gebroken_wit', plint: 'hout' },
    slaap: { wand: 'salie' },
    nat: { vloer: 'tegel_grijs', wand: 'tegels_wit', plafond: 'gebroken_wit', plint: 'tegel' },
    berging: { wand: 'gebroken_wit' },
    accent: 'terracotta',
  },
  klassiek: {
    label: 'Klassiek',
    uitleg: 'Gerookte eik, gebroken wit met een witte plint, witte plafonds; blauwgrijs in de slaapkamers.',
    gewoon: { vloer: 'parket_donker', wand: 'gebroken_wit', plafond: 'wit', plint: 'wit' },
    slaap: { wand: 'blauwgrijs' },
    nat: { vloer: 'tegel_wit', wand: 'tegels_wit', plafond: 'wit', plint: 'tegel' },
    berging: { wand: 'wit' },
    accent: 'blauwgrijs',
  },
  industrieel: {
    label: 'Industrieel',
    uitleg: 'Gietvloer, zachtgrijze wanden, zichtbaar beton en een zwarte plint; parket in de slaapkamers.',
    gewoon: { vloer: 'gietvloer', wand: 'zachtgrijs', plafond: 'beton', plint: 'zwart' },
    slaap: { vloer: 'parket_donker' },
    nat: { vloer: 'gietvloer', wand: 'tegels_groen', plafond: 'beton' },
    berging: { wand: 'zachtgrijs', plint: 'zwart' },
    accent: 'steenstrips',
  },
};

/** Wat een ruimte van dit type in deze sfeer krijgt; undefined = de sfeer laat ze ongemoeid (een garage). */
export function sfeerKeuze(s: Sfeer, type: RuimteType): SfeerKeuze | undefined {
  if (type === 'garage') return undefined;
  if (type === 'badkamer' || type === 'wc') return s.nat;
  if (type === 'berging') return { ...s.nat, ...s.berging };
  if (type === 'slaapkamer') return { ...s.gewoon, ...s.slaap };
  return s.gewoon;
}

/** Zet de keuze van een sfeer op een ruimte (vloer, wand, plafond en plint; geen plint in de sfeer = de plint weg). */
function zet(r: Ruimte, k: SfeerKeuze) {
  r.vloer = k.vloer;
  r.wand = k.wand;
  r.plafond = k.plafond;
  if (k.plint) r.plint = k.plint; else delete r.plint;
}

/**
 * Zet een sfeer op alle ruimtes van een plattegrond (een kopie; het origineel blijft). Een bestaande ruimte en een
 * garage blijven ongemoeid; een accentmuur blijft (ook haar afwerking).
 */
export function pasSfeerToe(plan: Plattegrond, sfeer: Sfeer): Plattegrond {
  const p = structuredClone(plan);
  for (const r of p.ruimtes) {
    if (r.bestaand === true) continue;
    const k = sfeerKeuze(sfeer, r.type);
    if (k) zet(r, k);
  }
  return p;
}

/** Welke sfeer staat er nu (alle nieuwe ruimtes zoals die sfeer ze zou zetten)? Undefined als geen enkele past. */
export function sfeerVan(plan: Plattegrond): string | undefined {
  const ruimtes = plan.ruimtes.filter((r) => r.bestaand !== true && r.type !== 'garage');
  if (!ruimtes.length) return undefined;
  return Object.keys(sfeerCatalogus).find((code) => ruimtes.every((r) => {
    const k = sfeerKeuze(sfeerCatalogus[code]!, r.type)!;
    return r.vloer === k.vloer && r.wand === k.wand && r.plafond === k.plafond && r.plint === k.plint;
  }));
}

/** De afwerking voor een nieuwe accentmuur: die van de sfeer die er staat, anders saliegroen (of terracotta op salie). */
export function accentVoorstel(plan: Plattegrond, r: Ruimte): string {
  const s = sfeerVan(plan);
  const voorstel = s ? sfeerCatalogus[s]!.accent : 'salie';
  return voorstel === r.wand ? (r.wand === 'terracotta' ? 'salie' : 'terracotta') : voorstel;
}
