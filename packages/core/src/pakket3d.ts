/**
 * 3D-pakket: de 3D van een bouwproject als gewone gegevens, om door te sturen naar een ander systeem (bv. Missing
 * Link) dat ze met de kijker toont. De configurator blijft een aparte app (beslissing van 31/10 en 15/11/2026): hij
 * stuurt alleen dit pakket door, het andere systeem hoeft niets van plattegronden of ramen te weten.
 *
 * Het pakket bevat geen prijzen en geen kostprijzen: alleen wat nodig is om de woning en de posities te tonen.
 */
import type { Scene3D } from './ruimtelijk.js';

export const PAKKET3D_SOORT = 'bouw-3d-pakket';
/**
 * Versie van het formaat. Ze gaat omhoog telkens de scène iets krijgt dat een oudere kijker niet kan tekenen; die
 * kijker weigert het pakket dan met een uitleg, in plaats van het verkeerd te tonen.
 *   1  de blokken zoals op 15/11/2026 (woning met plat dak, ramen, deuren, meubels);
 *   2  dak en lichtkoepels: de vorm `prisma` met een `doorsnede`, de daksoorten (pannen, roofing, grind, groendak) en
 *      blokken die alleen schaduw werpen (`alleenSchaduw`);
 *   3  de raamtypes van 16/11: gelakt schrijnwerk als eigen soorten (`lak_mat`, `lak_structuur`, `lak_glans`); een
 *      oudere kijker zou die als stof tekenen;
 *   4  schuine muren en vrije vormen (16/11): een `prisma` die verticaal doorgetrokken is (`as: 'y'`), materiaal per staand
 *      zijvlak (`randen`), de richting van de textuur op een vloer (`vlakRichting`) en blokken van de woning met een `draai`.
 */
export const PAKKET3D_VERSIE = 4;

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

export const ZENDING_SOORT = 'bouw-zending';
export const ZENDING_VERSIE = 1;

/**
 * Zending: alles wat een ander systeem (bv. Missing Link) in één keer van een project ontvangt (beslissing van Jonas op
 * 15/11/2026: een beeld bij elke offerteregel én de draaibare 3D in het project).
 *   - `offerte`: de regels zoals de export voor het ERP ze geeft, **zonder prijzen en zonder stuklijst** (positie, omschrijving, aantal,
 *     eenheid, configuratie, details): in eerste instantie gaat alleen de 3D door, de prijs maakt het andere systeem zelf;
 *   - `beelden`: per positie (op haar code) een beeld van de 3D, en één van de hele woning, als data-URL;
 *   - `pakket3d`: het 3D-pakket voor de kijker.
 */
export interface Zending {
  soort: typeof ZENDING_SOORT;
  versie: number;
  gemaakt: string;
  offerte: Record<string, unknown>;
  beelden: { woning?: string; posities: Record<string, string> };
  pakket3d: Pakket3D;
}

/**
 * Dezelfde scène met een kader waarin een hoog, smal stuk (een raam, een deur) helemaal in beeld komt. De kijker
 * kadreert op breedte en diepte en mikt op een derde van de hoogte: goed voor een zetel, te krap voor een deur van
 * 2,3 m. Alleen om te tonen: het pakket zelf bewaart het echte kader.
 */
export function passendKader(s: Scene3D): Scene3D {
  const k = s.kader;
  const b = Math.max(k.b, k.h * 1.3);
  return { ...s, kader: { ...k, x: k.x - (b - k.b) / 2, b, h: k.h / 0.7 } };
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
  // Een zending draagt het pakket in zich: de kijker toont dan dat pakket.
  if (p && (p as { soort?: string }).soort === ZENDING_SOORT) {
    const z = p as unknown as Partial<Zending>;
    if (typeof z.versie === 'number' && z.versie > ZENDING_VERSIE) throw new Error(`Deze zending is gemaakt met een nieuwere versie (${z.versie}) dan deze kijker kent (${ZENDING_VERSIE}).`);
    return leesPakket3D(z.pakket3d);
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
