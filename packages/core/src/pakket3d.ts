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
 *      oudere kijker zou die als stof tekenen.
 */
export const PAKKET3D_VERSIE = 3;

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
  /**
   * Het project. Sinds 16/11 (bestand voor de klant) ook, als ze er zijn: de naam van de aannemer die het ontwerp maakte
   * en de datum van het ontwerp (JJJJ-MM-DD). Een oudere kijker slaat ze over.
   */
  project: { nummer: string; naam: string; klant?: string; adres?: string; aannemer?: string; datum?: string };
  /** Per verdieping, van onder naar boven; het laatste is de hele woning met dak. Leeg bij een project zonder woning. */
  woning: Pakket3DNiveau[];
  posities: Pakket3DPositie[];
  /**
   * Varianten (16/11): als er meer ontwerpen meegaan, de naam van dit ontwerp en wat het anders maakt dan de andere, in
   * gewone taal (bv. ["zadeldak met keramische pannen", "geen lichtkoepels"]).
   */
  variant?: { naam: string; verschil: string[] };
  /**
   * De andere varianten, elk een volledig pakket (met zijn eigen `variant`, zonder eigen varianten), om er in de kijker
   * tussen te wisselen. Een oudere kijker toont alleen het eerste ontwerp: hij tekent niets verkeerd, de versie blijft 3.
   */
  varianten?: Pakket3D[];
}

/**
 * Maatlijn in de 3D (16/11): een maat tussen twee punten met haar tekst, zoals op een plan. Ze reist mee met een scène
 * (`Scene3DMetMaten`); de kijker (demo-web/src/drie-d.ts) tekent ze bovenop alles, met de tekst altijd recht naar de
 * camera. Wie de maten uitrekent: core/src/maten3d.ts. Ze zitten niet in het pakket zelf: de kijker rekent ze uit de
 * scène, zodat ook een ouder pakket maten krijgt.
 */
export interface Maatlijn3D {
  /** Begin en eind van wat gemeten wordt (cm, in de wereld van de scène: x, y = hoogte, z). */
  van: [number, number, number];
  tot: [number, number, number];
  /** Wat er bij de maat staat, bv. "Breedte 9,30 m". */
  tekst: string;
  /** Richting waarin de maatlijn naast het gemeten stuk ligt (eenheidsvector) en hoe ver (cm); hulplijnen lopen tot daar. */
  uit: [number, number, number];
  afstand: number;
  /**
   * Dezelfde maat aan een andere kant (de breedte vóór en achter de woning) draagt dezelfde groep: de kijker toont van
   * een groep alleen de maat waarvan `kant` het meest naar de camera wijst, en kiest opnieuw als je draait. Zonder groep
   * is een maat altijd zichtbaar.
   */
  groep?: string;
  kant?: [number, number, number];
  /**
   * Bovenop alles tekenen, ook waar een muur ervoor staat: voor de maten van een raam, die in het vlak van de muur liggen.
   * Anders verdwijnt wat achter het gebouw ligt, zoals bij een echt ding (de tekst is altijd te lezen).
   */
  bovenop?: boolean;
}

/** Een scène met maatlijnen erbij (alleen om te tonen; een scène zonder `maatlijnen` tekent zoals altijd). */
export type Scene3DMetMaten = Scene3D & { maatlijnen?: Maatlijn3D[] };

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
  const tekst = (x: unknown) => (typeof x === 'string' && x.trim() ? x : undefined);
  const uit: Pakket3D = {
    soort: PAKKET3D_SOORT,
    versie: p.versie,
    gemaakt: typeof p.gemaakt === 'string' ? p.gemaakt : '',
    project: { nummer: String(p.project?.nummer ?? ''), naam: String(p.project?.naam ?? ''), klant: p.project?.klant, adres: p.project?.adres },
    woning: p.woning,
    posities: p.posities,
  };
  // Velden van 16/11 (bestand voor de klant): alleen meenemen als ze er zijn, zodat een ouder pakket er net zo uitziet als vroeger.
  const aannemer = tekst(p.project?.aannemer), datum = tekst(p.project?.datum);
  if (aannemer) uit.project.aannemer = aannemer;
  if (datum) uit.project.datum = datum;
  const v = p.variant as Partial<NonNullable<Pakket3D['variant']>> | undefined;
  if (v && typeof v === 'object') uit.variant = { naam: String(v.naam ?? ''), verschil: Array.isArray(v.verschil) ? v.verschil.map(String) : [] };
  if (Array.isArray(p.varianten) && p.varianten.length) {
    // Elke variant volgt dezelfde regels (soort, versie, scènes); een variant draagt zelf geen varianten.
    uit.varianten = p.varianten.map((x, i) => {
      try {
        const enkel = leesPakket3D(x);
        delete enkel.varianten;
        return enkel;
      } catch (e) {
        throw new Error(`Variant ${i + 2} in dit 3D-pakket: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }
  return uit;
}
