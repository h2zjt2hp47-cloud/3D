/**
 * Vingerafdruk van een uitkomst (tekening, 3D-blokken, stuklijst …): een korte code die verandert zodra er
 * iets aan de inhoud verandert. De volgorde van de velden en afrondingsruis (verder dan vier decimalen)
 * tellen niet mee; de volgorde in een lijst wel.
 */
import { createHash } from 'node:crypto';

function vast(x: unknown): unknown {
  if (typeof x === 'number') return Math.round(x * 10000) / 10000 || 0;
  if (Array.isArray(x)) return x.map(vast);
  if (x && typeof x === 'object') {
    const uit: Record<string, unknown> = {};
    for (const k of Object.keys(x).sort()) {
      const w = (x as Record<string, unknown>)[k];
      if (w !== undefined) uit[k] = vast(w);
    }
    return uit;
  }
  return x;
}

export function vingerafdruk(x: unknown): string {
  return createHash('sha1').update(JSON.stringify(vast(x))).digest('hex').slice(0, 16);
}
