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

/**
 * Eén positie van de offerte (raam, deur, aanbouw, en sinds 16/11 ook een carport, tuinhuis, loods of stuk staalwerk) met
 * haar eigen 3D. Twee velden kwamen erbij op 16/11 (ronde 8b), allebei optioneel; een oudere kijker slaat ze over en
 * toont de positie zoals vroeger (op de effen achtergrond, zonder maten):
 *   - `gebouw`: de positie is een gebouw (aanbouw, overkapping, tuinhuis, loods). De kijker zet het buiten (lucht, gras,
 *     horizon), schuin van boven en met het echte kader van de scène, zoals de woning;
 *   - `maatlijnen`: de hoofdmaten van de positie (breedte, diepte, hoogte van een gebouw; lengte en hoogte van een
 *     balustrade …), uitgerekend uit het model en niet uit de blokken. De kijker tekent ze als *Maten* aan staat; zonder
 *     dit veld rekent hij de maten van een raam uit de scène, zoals vroeger.
 */
export interface Pakket3DPositie {
  code: string;
  naam: string;
  omschrijving: string;
  aantal: number;
  scene: Scene3D;
  gebouw?: boolean;
  maatlijnen?: Maatlijn3D[];
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
  /**
   * De posten van het werk (ronde 11, optioneel; in het bestand voor de klant): per post de groep in woorden, de titel,
   * het detail in gewone zinnen, een aantal in stuks, en de dingen van de 3D die erbij horen (als de scène ze kent: de
   * codes `<ding>.<blok>`). Zonder hoeveelheden die alleen voor de aannemer zijn en zonder prijzen. Een oudere kijker slaat
   * ze over en toont het ontwerp zoals vroeger: de versie blijft 4.
   */
  posten?: Pakket3DPost[];
  /**
   * De techniek voor de klant (ronde 10c, 17/11, optioneel; in het bestand voor de klant): per verdieping met techniek de
   * uitgezette 3D, de legende per vak en per toestel of leiding wat het is, in gewone woorden (zie `techniekPakket` in
   * techniekklant.ts). Geen maten, lengtes of kringen, geen prijzen. Een oudere kijker slaat het veld over en toont het
   * ontwerp zoals vroeger: de versie blijft 4 (de scènes gebruiken alleen blokken die versie 4 kent).
   */
  techniek?: Pakket3DTechniek;
}

/** Eén vak van de techniek in de legende (zie `Pakket3D.techniek`). */
export interface Pakket3DTechniekVak {
  vak: string;
  naam: string;
  kleur: string;
  uitleg: string;
  /** De namen van de toestellen die er komen, zonder aantallen. */
  toestellen: string[];
  /** De soorten leiding die er komen, met hun kleur in de 3D. */
  leidingen: { naam: string; kleur: string }[];
}

/** De techniek in het pakket (zie `Pakket3D.techniek`). */
export interface Pakket3DTechniek {
  /** Per verdieping met techniek: haar naam en de uitgezette 3D (met de dingen `toestel:<id>` en `leiding:<id>` in de codes). */
  niveaus: { naam: string; scene: Scene3D }[];
  vakken: Pakket3DTechniekVak[];
  /** Per ding van de 3D: het vak, de naam, wat het is en waar het zit. */
  dingen: Record<string, { vak: string; naam: string; uitleg: string; waar?: string }>;
  /** De vaste zin bij alles over techniek (`TECHNIEK_VOORBEHOUD`). */
  voorbehoud?: string;
}

/** Eén post van het werk in het pakket (zie `Pakket3D.posten` en `klantPosten` in posten.ts). */
export interface Pakket3DPost {
  groep: string;
  titel: string;
  detail: string[];
  aantal?: number;
  dingen?: string[];
  /** Het begin van de namen van de blokken om de post aan te duiden, als dat preciezer moet dan de dingen. */
  markeer?: string[];
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
  return { ...s, kader: { ...k, x: k.x - (b - k.b) / 2, b, h: k.h / 0.7 }, ruimKader: true };
}

/**
 * Hetzelfde voor een gebouw of een stuk staalwerk als positie (16/11: een carport, tuinhuis, loods, aanbouw, balustrade,
 * luifel of trap). De kijker zet zijn camera op
 * anderhalve keer de grootste maat van het grondvlak: een hoog dak (een zadeldak op een carport van 5 m) viel dan boven
 * uit beeld, en een gebouw vulde het beeld tot aan de rand. Het kader groeit rond hetzelfde midden tot minstens 1,1 keer
 * de grootste maat en 1,8 keer de hoogte. Alleen om te tonen: het pakket zelf bewaart het echte kader.
 */
export function gebouwKader(s: Scene3D): Scene3D {
  const k = s.kader, f = Math.max(1.1, (k.h * 1.8) / Math.max(k.b, k.d, 1));
  return { ...s, kader: { ...k, x: k.x - (k.b * (f - 1)) / 2, z: k.z - (k.d * (f - 1)) / 2, b: k.b * f, d: k.d * f }, ruimKader: true };
}

function isScene(s: unknown): s is Scene3D {
  const x = s as Scene3D | null;
  return !!x && Array.isArray(x.blokken) && !!x.kader && typeof x.kader.b === 'number' && typeof x.kader.h === 'number';
}

/**
 * De techniek van een pakket (ronde 10c), alleen wat klopt: verdiepingen met een scène, vakken met een naam en een kleur,
 * dingen met tekst. Zonder één verdieping met een scène: geen techniek (de kijker toont dan de keuze niet). Tekst blijft
 * tekst (de kijker zet ze met `textContent` op het scherm).
 */
function leesTechniek(x: unknown): Pakket3DTechniek | undefined {
  const t = x as Partial<Pakket3DTechniek> | null | undefined;
  if (!t || typeof t !== 'object' || !Array.isArray(t.niveaus)) return undefined;
  const tekst = (s: unknown) => (typeof s === 'string' ? s : '');
  const kleur = (s: unknown) => (typeof s === 'string' && /^#[0-9a-f]{3,8}$/i.test(s) ? s : '#777777');
  const niveaus = t.niveaus.filter((n) => n && isScene(n.scene)).map((n) => ({ naam: tekst(n.naam), scene: n.scene }));
  if (!niveaus.length) return undefined;
  const vakken = (Array.isArray(t.vakken) ? t.vakken : []).filter((v) => v && typeof v.vak === 'string' && typeof v.naam === 'string').map((v): Pakket3DTechniekVak => ({
    vak: v.vak, naam: v.naam, kleur: kleur(v.kleur), uitleg: tekst(v.uitleg),
    toestellen: Array.isArray(v.toestellen) ? v.toestellen.filter((s) => typeof s === 'string') : [],
    leidingen: Array.isArray(v.leidingen) ? v.leidingen.filter((l) => l && typeof l.naam === 'string').map((l) => ({ naam: l.naam, kleur: kleur(l.kleur) })) : [],
  }));
  const dingen: Pakket3DTechniek['dingen'] = {};
  if (t.dingen && typeof t.dingen === 'object') {
    for (const [k, d] of Object.entries(t.dingen)) {
      if (d && typeof d.naam === 'string' && typeof d.vak === 'string') dingen[k] = { vak: d.vak, naam: d.naam, uitleg: tekst(d.uitleg), ...(typeof d.waar === 'string' ? { waar: d.waar } : {}) };
    }
  }
  return { niveaus, vakken, dingen, ...(typeof t.voorbehoud === 'string' && t.voorbehoud ? { voorbehoud: t.voorbehoud } : {}) };
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
    // De velden van 16/11 op een positie (`gebouw`, `maatlijnen`) alleen als ze kloppen; de rest zoals vroeger.
    posities: p.posities.map((x) => {
      const { gebouw, maatlijnen, ...rest } = x;
      const lijnen = Array.isArray(maatlijnen) ? maatlijnen.filter((l) => Array.isArray(l?.van) && Array.isArray(l?.tot) && typeof l.tekst === 'string') : [];
      return { ...rest, ...(gebouw === true ? { gebouw: true } : {}), ...(lijnen.length ? { maatlijnen: lijnen } : {}) };
    }),
  };
  // Velden van 16/11 (bestand voor de klant): alleen meenemen als ze er zijn, zodat een ouder pakket er net zo uitziet als vroeger.
  const aannemer = tekst(p.project?.aannemer), datum = tekst(p.project?.datum);
  if (aannemer) uit.project.aannemer = aannemer;
  if (datum) uit.project.datum = datum;
  // De posten van het werk (ronde 11): alleen als ze er zijn en kloppen; tekst blijft tekst.
  if (Array.isArray(p.posten)) {
    const posten = p.posten.filter((x) => x && typeof x.titel === 'string' && typeof x.groep === 'string').map((x): Pakket3DPost => ({
      groep: x.groep, titel: x.titel, detail: Array.isArray(x.detail) ? x.detail.filter((d) => typeof d === 'string') : [],
      ...(typeof x.aantal === 'number' && Number.isFinite(x.aantal) ? { aantal: x.aantal } : {}),
      ...(Array.isArray(x.dingen) && x.dingen.length ? { dingen: x.dingen.filter((d) => typeof d === 'string') } : {}),
      ...(Array.isArray(x.markeer) && x.markeer.length ? { markeer: x.markeer.filter((d) => typeof d === 'string') } : {}),
    }));
    if (posten.length) uit.posten = posten;
  }
  // De techniek voor de klant (ronde 10c): alleen als ze er is en klopt; anders valt ze stil weg (het ontwerp blijft).
  const techniek = leesTechniek(p.techniek);
  if (techniek) uit.techniek = techniek;
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
