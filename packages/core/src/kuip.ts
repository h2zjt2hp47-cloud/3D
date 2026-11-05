/**
 * Kuipfauteuils: een gebogen wand (rug die overloopt in de armen) rond de zitting, die naar voren toe lager wordt.
 * Eén bron voor het bovenaanzicht, het vooraanzicht en de 3D. Alles in lokale coördinaten van het element:
 * x langs de breedte (0 … B), y van achter (0, de rug) naar voren (D).
 *
 * De vormen komen uit de optie "Vorm fauteuil" (`kuipvorm`, veld `teken`): plan (rond of afgerond), wanddikte,
 * hoe ver de wand naar voren loopt (boog in graden vanaf het midden achteraan), de hoogte vooraan boven de zitting,
 * vanaf waar de armen vlak lopen, en of de rug als schelp boven de zitting zweeft. Benaderingen op basis van foto's.
 */
export type Punt = [number, number];

export interface KuipParameters {
  /** Vorm van het grondvlak: ellips (rond) of afgeronde rechthoek (afgerond). */
  plan: 'rond' | 'afgerond';
  /** Dikte van de wand (cm). */
  dikte: number;
  /** Hoe ver de wand rond loopt, in graden vanaf het midden achteraan naar elke kant (90 = tot opzij, 180 = helemaal rond). */
  boog: number;
  /** Hoogte van de wand vooraan boven de zithoogte (cm). */
  voorBoven: number;
  /** Deel van de boog (0–1) waarna de wand op armhoogte vlak verder loopt (1 = geleidelijk tot vooraan). */
  armVanaf: number;
  /** Schelp: de rug staat op de zitting in plaats van op de vloer (losse schaal op een frame). */
  zwevend: boolean;
  /** Organisch: dikke, zachte vormen, de zitting zit diep in de kuip. */
  organisch: boolean;
  /** Trommel: de wand is rondom (bijna) even hoog; de rug komt van de losse kussens. */
  vlak: boolean;
  /**
   * Scheef (Pebble): de schaal loopt niet symmetrisch rond, maar van rechtsachter (op zithoogte, schuin in de zitting)
   * over de rug naar linksvoor (van voren gezien), het hoogst linksachter, en links tot vooraan. `boog` geldt dan voor de
   * linkerkant; rechts stopt de wand 50° na het midden achteraan.
   */
  scheef: boolean;
  /** Eigen exponent van het grondvlak (2 = ellips, hoger = hoekiger); leeg = volgens `plan`. */
  exponent?: number;
}

/** Parameters uit de `teken`-velden van de gekozen kuipvorm; null voor de hoekige fauteuil (rechte rug en armen). */
export function kuipParameters(teken: Record<string, unknown> | undefined): KuipParameters | null {
  if (!teken || teken.vorm === 'hoekig' || teken.plan === undefined) return null;
  const getal = (k: string, s: number) => (typeof teken[k] === 'number' ? (teken[k] as number) : s);
  return {
    plan: teken.plan === 'afgerond' ? 'afgerond' : 'rond',
    dikte: getal('dikte', 14),
    boog: Math.max(60, Math.min(178, getal('boog', 150))),
    voorBoven: getal('voorBoven', 14),
    armVanaf: Math.max(0.2, Math.min(1, getal('armVanaf', 1))),
    zwevend: teken.zwevend === true,
    organisch: teken.organisch === true,
    vlak: teken.vlak === true,
    scheef: teken.scheef === true,
    ...(typeof teken.exponent === 'number' ? { exponent: teken.exponent } : {}),
  };
}

/** Exponent van de superellips: 2 = ellips, hoger = meer rechthoekig met afgeronde hoeken. */
const exponent = (plan: KuipParameters['plan']) => (plan === 'rond' ? 2 : 3.4);

/** Punten op een superellips rond (cx, cy) met halve assen a, b, van hoek t0 tot t1 (graden; −90 = midden achteraan). */
export function superellips(cx: number, cy: number, a: number, b: number, n: number, t0: number, t1: number, stappen: number): Punt[] {
  const uit: Punt[] = [];
  for (let i = 0; i <= stappen; i++) {
    const t = ((t0 + ((t1 - t0) * i) / stappen) * Math.PI) / 180;
    const c = Math.cos(t), s = Math.sin(t);
    uit.push([cx + a * Math.sign(c) * Math.abs(c) ** (2 / n), cy + b * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  return uit;
}

export interface KuipOpbouw {
  /** Volledig grondvlak (basis), gesloten omtrek. */
  plan: Punt[];
  /** Middenlijn van de wand met de bovenhoogte per punt (absoluut, cm), dikte en onderkant (cm). */
  wand: { pad: Punt[]; hoogtes: number[]; dikte: number; onder: number };
  /** Omtrek van het zitkussen. */
  zit: Punt[];
  /** Onder- en bovenkant van de basis (cm). */
  basis: { onder: number; boven: number };
  /** Losse rugkussens (rechthoeken lokaal) als de rug los is. */
  rugkussens: { lx: number; ly: number; lb: number; ld: number; y: number; h: number }[];
}

/**
 * Opbouw van een kuipfauteuil van B × D cm. `P` = poothoogte (onderkant basis), `zithoogte`, `rugH` = rughoogte,
 * `kussenDik` = dikte zitkussen (0 = vaste zitting).
 */
export function kuipOpbouw(B: number, D: number, h: { P: number; zithoogte: number; rugH: number; kussenDik: number }, k: KuipParameters, losseRug: boolean): KuipOpbouw {
  const n = k.exponent ?? exponent(k.plan);
  const w = Math.min(k.dikte, B / 3, D / 3);
  const cx = B / 2, cy = D / 2;
  const plan = superellips(cx, cy, B / 2, D / 2, n, 0, 360, 72).slice(0, -1);
  // Middenlijn van de wand: een halve dikte binnen de rand, symmetrisch rond het midden achteraan.
  const stappen = Math.max(16, Math.round(k.boog / 5));
  const zitBoven = h.zithoogte;
  const voor = zitBoven + k.voorBoven;
  const rug = k.vlak ? voor + 5 : Math.max(h.rugH, voor + 4);
  const rond1 = (x: number) => Math.round(x * 10) / 10;
  let pad: Punt[], hoogtes: number[];
  if (k.scheef) {
    // Volgens de productfoto's (pebble-01-6, -13, -18): van rechtsachter (−38°, de schaal komt daar op de zitting uit,
    // ±vier vijfde van de breedte) over de rug naar links, het hoogst op de rug links van het midden (−128°, ±een kwart van de breedte), en langs de linkerzijde naar
    // voren (−90° − boog) waar ze rond tot op de vloer zakt, net achter de voorkant van de zitting.
    const tRechts = -38, tLinks = -90 - k.boog, tTop = -128;
    // Eerst fijn bemonsterd, dan op gelijke afstanden langs de wand: bij een afgerond grondvlak liggen punten op gelijke
    // hoeken ongelijk verdeeld, en dan golfde de bovenkant (de hoogte volgt de afstand langs de wand, niet de hoek).
    const F = 600, fijn = superellips(cx, cy, B / 2 - w / 2, D / 2 - w / 2, n, tRechts, tLinks, F);
    const afstand = [0];
    for (let i = 1; i <= F; i++) afstand.push(afstand[i - 1]! + Math.hypot(fijn[i]![0] - fijn[i - 1]![0], fijn[i]![1] - fijn[i - 1]![1]));
    const totaal = afstand[F]!, N = stappen * 2 + 1;
    let j = 0;
    pad = Array.from({ length: N }, (_, i) => {
      const doel = (totaal * i) / (N - 1);
      while (j < F - 1 && afstand[j + 1]! < doel) j++;
      const f = Math.max(0, Math.min(1, (doel - afstand[j]!) / (afstand[j + 1]! - afstand[j]! || 1)));
      return [rond1(fijn[j]![0] + f * (fijn[j + 1]![0] - fijn[j]![0])), rond1(fijn[j]![1] + f * (fijn[j + 1]![1] - fijn[j]![1]))] as Punt;
    });
    const uTop = afstand[Math.round(((tRechts - tTop) / (tRechts - tLinks)) * F)]! / totaal;
    // Vooraan links ongeveer op zithoogte (daaronder loopt de ronde kop tot op de vloer). Rechts verdwijnt de schaal in de
    // zitting: haar bovenkant eindigt 3 cm onder de zitting, niet erop (twee vlakken op dezelfde hoogte flikkeren).
    const links = zitBoven + 1, rechts = zitBoven - 3;
    // Bol verloop, zoals de rand van een blad: bij de top vlak, naar de uiteinden toe steeds steiler.
    hoogtes = pad.map((_, i) => {
      const u = i / (pad.length - 1);
      return u <= uTop
        ? rond1(rechts + (rug - rechts) * Math.sin((Math.PI / 2) * (u / uTop)))
        : rond1(links + (rug - links) * Math.cos((Math.PI / 2) * ((u - uTop) / (1 - uTop))));
    });
  } else {
    pad = superellips(cx, cy, B / 2 - w / 2, D / 2 - w / 2, n, -90 - k.boog, -90 + k.boog, stappen * 2);
    hoogtes = pad.map((_, i) => {
      const u = Math.abs(i - stappen) / stappen; // 0 = midden achteraan, 1 = einde van de wand
      const t = Math.min(1, u / k.armVanaf);
      return rond1(voor + (rug - voor) * (0.5 + 0.5 * Math.cos(Math.PI * t)));
    });
  }
  const basisBoven = h.zithoogte - h.kussenDik;
  // Schelp: zweeft een eind boven de zitting (gedragen door het frame), anders staat de wand op de onderbouw.
  const onder = k.zwevend ? h.zithoogte + 6 : h.P;
  // Zitkussen: binnen de wand en tot vooraan (bij een schelp over het hele grondvlak).
  // Organisch: de zitting loopt breed tot vooraan door (de wand zakt er in weg).
  const achter = k.zwevend ? 3 : w * (k.organisch ? 0.9 : 0.85);
  const zij = k.zwevend ? 1.5 : w * (k.organisch ? 0.45 : 0.8);
  const zcy = (achter + D - 1.5) / 2, zb = (D - 1.5 - achter) / 2;
  const zit = superellips(cx, zcy, B / 2 - zij, zb, k.plan === 'rond' ? 2.4 : n, 0, 360, 64).slice(0, -1);
  // Losse rugkussens tegen de wand achteraan.
  const rugkussens: KuipOpbouw['rugkussens'] = [];
  if (losseRug) {
    const aantal = Math.max(1, Math.min(3, Math.round((B - 2 * w) / 30)));
    const breed = (B - 2 * w - 6) / aantal;
    for (let i = 0; i < aantal; i++) {
      // Bij een trommel steken de kussens boven de wand uit tot de rughoogte.
      const top = k.vlak ? Math.max(h.rugH, rug + 12) : rug;
      rugkussens.push({ lx: w + 3 + i * breed, ly: w - 3, lb: breed - 1, ld: 16, y: zitBoven, h: Math.max(20, (top - zitBoven) * (k.vlak ? 0.95 : 0.85)) });
    }
  }
  return { plan, wand: { pad, hoogtes, dikte: w, onder }, zit, basis: { onder: h.P, boven: basisBoven }, rugkussens };
}
