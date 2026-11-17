// De kaart: ±250 vakken, gemaakt door scripts/kaart/maak-kaart.mjs.
import gegevens from './vakken.json';

export type Terrein = 'vlakte' | 'moeras' | 'heide' | 'bos' | 'heuvels' | 'ardennen';
export type Punt = [number, number];

export interface VakKaart {
  id: number;
  naam: string;
  /** provincie of streek van nu */
  gebied: string;
  land: string;
  /** midden in km */
  midden: Punt;
  lonlat: Punt;
  /** km² */
  oppervlakte: number;
  kust: boolean;
  grens: boolean;
  rivier: boolean;
  terrein: Terrein;
  buren: number[];
  /** buren aan de overkant van een rivier */
  rivierBuren: number[];
  vorm: Punt[][];
}

export interface Kaart {
  bron: string;
  projectie: { lon0: number; lat0: number; kx: number; ky: number };
  kader: { min: Punt; max: Punt };
  vakken: VakKaart[];
  rivieren: { naam: string; punten: Punt[] }[];
  buitenland: Punt[][];
  /** buitenrand van het speelgebied */
  omtrek: Punt[][];
  /** gedeelde randen tussen twee vakken */
  randen: { a: number; b: number; p: Punt[] }[];
}

export const kaart = gegevens as unknown as Kaart;

/** breedte, lengte → km op de kaart */
export function naarKaart(k: Kaart, breedte: number, lengte: number): Punt {
  const p = k.projectie;
  return [(lengte - p.lon0) * p.kx, -(breedte - p.lat0) * p.ky];
}

/** het vak waarvan het midden het dichtst bij een plaats ligt */
export function vakBij(k: Kaart, breedte: number, lengte: number): number {
  const [x, y] = naarKaart(k, breedte, lengte);
  let beste = 0, min = Infinity;
  for (const v of k.vakken) {
    const d = Math.hypot(v.midden[0] - x, v.midden[1] - y);
    if (d < min) { min = d; beste = v.id; }
  }
  return beste;
}

export function afstand(k: Kaart, a: number, b: number): number {
  const p = k.vakken[a].midden, q = k.vakken[b].midden;
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

export const TERREIN: Record<Terrein, { naam: string; snelheid: number; verdediging: number; bevolking: number; voorraad: number }> = {
  vlakte: { naam: 'Vlakte', snelheid: 1, verdediging: 1, bevolking: 6000, voorraad: 16000 },
  heide: { naam: 'Heide', snelheid: 0.9, verdediging: 1.05, bevolking: 2500, voorraad: 9000 },
  heuvels: { naam: 'Heuvels', snelheid: 0.8, verdediging: 1.2, bevolking: 4500, voorraad: 12000 },
  bos: { naam: 'Bos', snelheid: 0.65, verdediging: 1.3, bevolking: 3000, voorraad: 9000 },
  ardennen: { naam: 'Ardennen', snelheid: 0.6, verdediging: 1.35, bevolking: 2000, voorraad: 8000 },
  moeras: { naam: 'Moeras en kwelders', snelheid: 0.5, verdediging: 1.4, bevolking: 2500, voorraad: 7000 },
};
