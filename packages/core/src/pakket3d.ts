/**
 * 3D-pakket: de 3D van een bouwproject als gewone gegevens, om door te sturen naar een ander systeem (bv. Missing
 * Link) dat ze met de kijker toont. De configurator blijft een aparte app (beslissing van 31/10 en 15/11/2026): hij
 * stuurt alleen dit pakket door, het andere systeem hoeft niets van plattegronden of ramen te weten.
 *
 * Het pakket bevat geen prijzen en geen kostprijzen: alleen wat nodig is om de woning en de posities te tonen.
 */
import type { Scene3D } from './ruimtelijk.js';

export const PAKKET3D_SOORT = 'bouw-3d-pakket';
export const PAKKET3D_VERSIE = 1;

/** De woning tot en met één verdieping; `laag` is dezelfde scène met de muren op 110 cm (om binnen te kijken). */
export interface Pakket3DNiveau {
  naam: string;
  scene: Scene3D;
  laag: Scene3D;
}

/** Eén positie van de offerte (raam, deur, aanbouw) met haar eigen 3D. */
export interface Pakket3DPositie {
  code: string;
  naam: string;
  omschrijving: string;
  aantal: number;
  scene: Scene3D;
}

export interface Pakket3D {
  soort: typeof PAKKET3D_SOORT;
  /** Versie van dit formaat. Een kijker toont pakketten tot en met zijn eigen versie. */
  versie: number;
  /** Wanneer het pakket gemaakt is (ISO). */
  gemaakt: string;
  project: { nummer: string; naam: string; klant?: string; adres?: string };
  /** Per verdieping, van onder naar boven; het laatste is de hele woning met dak. Leeg bij een project zonder woning. */
  woning: Pakket3DNiveau[];
  posities: Pakket3DPositie[];
}

function isScene(s: unknown): s is Scene3D {
  const x = s as Scene3D | null;
  return !!x && Array.isArray(x.blokken) && !!x.kader && typeof x.kader.b === 'number' && typeof x.kader.h === 'number';
}

/**
 * Leest een 3D-pakket (tekst of al ontleed) en controleert het. Gooit een fout in gewone taal als het geen pakket is,
 * als het met een nieuwere versie gemaakt is, of als er een scène ontbreekt.
 */
export function leesPakket3D(bron: unknown): Pakket3D {
  let p: Partial<Pakket3D>;
  try {
    p = typeof bron === 'string' ? JSON.parse(bron) : (bron as Partial<Pakket3D>);
  } catch {
    throw new Error('Dit bestand is geen 3D-pakket: het kan niet gelezen worden.');
  }
  if (!p || p.soort !== PAKKET3D_SOORT) throw new Error('Dit bestand is geen 3D-pakket van de bouwconfigurator.');
  if (typeof p.versie !== 'number' || p.versie < 1) throw new Error('Dit 3D-pakket heeft geen geldige versie.');
  if (p.versie > PAKKET3D_VERSIE) throw new Error(`Dit 3D-pakket is gemaakt met een nieuwere versie (${p.versie}) dan deze kijker kent (${PAKKET3D_VERSIE}).`);
  if (!Array.isArray(p.woning) || !Array.isArray(p.posities)) throw new Error('Dit 3D-pakket is onvolledig: de woning of de posities ontbreken.');
  if (!p.woning.every((n) => n && isScene(n.scene) && isScene(n.laag)) || !p.posities.every((x) => x && isScene(x.scene))) {
    throw new Error('Dit 3D-pakket is onvolledig: een van de 3D-beelden ontbreekt.');
  }
  if (!p.woning.length && !p.posities.length) throw new Error('Dit 3D-pakket is leeg: er is geen woning en geen positie om te tonen.');
  return {
    soort: PAKKET3D_SOORT,
    versie: p.versie,
    gemaakt: typeof p.gemaakt === 'string' ? p.gemaakt : '',
    project: { nummer: String(p.project?.nummer ?? ''), naam: String(p.project?.naam ?? ''), klant: p.project?.klant, adres: p.project?.adres },
    woning: p.woning,
    posities: p.posities,
  };
}
