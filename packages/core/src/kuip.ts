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
  /**
   * Eigen verloop van de bovenrand van de schaal, als punten [u, f]: u = plaats langs de schaal van 0 (midden achteraan)
   * tot 1 (het uiteinde, aan beide kanten gelijk), f = hoogte van 0 (zithoogte + `voorBoven`) tot 1 (de rughoogte).
   * Bv. [[0, 1], [1, 1]] = overal op rughoogte (een trommel met een vlakke rand), [[0, 1], [0.5, 1], [0.8, 0.3], [1, 0.3]]
   * = hoge rug die met een schouder naar lage armen zakt. Leeg = het verloop van de gekozen kuipvorm.
   */
  profiel?: [number, number][];
  /** Tussen de punten van `profiel` een rechte lijn in plaats van een zachte S-bocht. */
  profielRecht?: boolean;
  /**
   * De zitting is één ronde, vaste trommel in de stof over het hele grondvlak, van de poten tot de zithoogte, in plaats
   * van een onderbouw met een los kussen erop (zoals de fauteuils van de klant: Milton, Fraser, Satie, Quin …).
   */
  zitTrommel?: boolean;
  /** Afronding van de bovenrand van die trommel in cm (standaard 6). */
  zitRand?: number;
  /**
   * De schaal steekt zoveel cm rond de trommelzitting uit (een trapje tussen schaal en zitting, zoals op de foto's van
   * Satie, Quin en Fraser). De zitting wordt aan de zijkanten zoveel smaller en blijft vooraan tot tegen de voorkant
   * komen, zodat de maten van de zetel gelijk blijven. Leeg = zitting en schaal (bijna) gelijk.
   */
  zitIn?: number;
  /** De schaal staat op de zitting (onderkant net onder de zithoogte) in plaats van eromheen tot onderaan. */
  schaalOp?: boolean;
  /** Dikte in cm van het houten frame onder de zitting bij poten met een frame (ringframe); standaard 4. */
  frameDik?: number;
  /** Bij poten met een frame (ringframe) ook een kruis tussen de poten (Sullivan: een ring op vier poten met een kruis). */
  frameKruis?: boolean;
  /**
   * De trommelzitting bestaat uit twee lagen met een naad ertussen: een kussen bovenop een band (Fraser, Ross). Het getal
   * is de dikte van de bovenste laag in cm; leeg = één geheel.
   */
  zitNaad?: number;
  /**
   * Scheve schaal: hoe ver de schaal aan de rechterkant rondloopt (graden vanaf het midden achteraan; rechts = de kant
   * van x = B, voor wie voor de zetel staat de rechterkant). Leeg = zoals links (`boog`). Samen met `profielRechts` voor
   * een leuning die aan één kant om het uiteinde draait en aan de andere kant langs de rug afloopt (Mabel méridienne).
   */
  boogRechts?: number;
  /** Eigen verloop van de bovenrand aan de rechterkant (zoals `profiel`, dat dan voor links geldt); leeg = zoals links. */
  profielRechts?: [number, number][];
  /**
   * Losse rugkussens als gewone vierkante kussens tegen de schaal (zoals Quin en Satie), in plaats van rechtopstaande
   * rollen: hoeveel, en hun maat in cm (standaard 46). Alleen met de keuze voor losse rugkussens.
   */
  kussens?: number;
  kussenMaat?: number;
  /** Hoogte van die kussens in cm als ze niet vierkant zijn (Satie: één breed kussen); leeg = zoals `kussenMaat`. */
  kussenHoog?: number;
}

/** Parameters uit de `teken`-velden van de gekozen kuipvorm; null voor de hoekige fauteuil (rechte rug en armen). */
export function kuipParameters(tekenVanKeuze: Record<string, unknown> | undefined, eigen?: Record<string, unknown>): KuipParameters | null {
  if (!tekenVanKeuze || tekenVanKeuze.vorm === 'hoekig' || tekenVanKeuze.plan === undefined) return null;
  // De eigen vorm van een model (vormgeving.kuip) overschrijft velden van de gekozen kuipvorm.
  const teken: Record<string, unknown> = { ...tekenVanKeuze, ...(eigen ?? {}) };
  const getal = (k: string, s: number) => (typeof teken[k] === 'number' ? (teken[k] as number) : s);
  const verloop = (x: unknown): [number, number][] => Array.isArray(x)
    ? (x as unknown[]).filter((q): q is [number, number] => Array.isArray(q) && typeof q[0] === 'number' && typeof q[1] === 'number').sort((a, b) => a[0] - b[0])
    : [];
  const profiel = verloop(teken.profiel), profielRechts = verloop(teken.profielRechts);
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
    ...(profiel.length >= 2 ? { profiel } : {}),
    ...(teken.profielRecht === true ? { profielRecht: true } : {}),
    ...(teken.zitTrommel === true ? { zitTrommel: true } : {}),
    ...(typeof teken.zitRand === 'number' ? { zitRand: teken.zitRand } : {}),
    ...(typeof teken.zitIn === 'number' && teken.zitIn > 0 ? { zitIn: teken.zitIn } : {}),
    ...(teken.schaalOp === true ? { schaalOp: true } : {}),
    ...(typeof teken.frameDik === 'number' ? { frameDik: teken.frameDik } : {}),
    ...(teken.frameKruis === true ? { frameKruis: true } : {}),
    ...(typeof teken.zitNaad === 'number' && teken.zitNaad > 0 ? { zitNaad: teken.zitNaad } : {}),
    ...(typeof teken.boogRechts === 'number' ? { boogRechts: Math.max(5, Math.min(178, teken.boogRechts)) } : {}),
    ...(profielRechts.length >= 2 ? { profielRechts } : {}),
    ...(typeof teken.kussens === 'number' && teken.kussens >= 1 ? { kussens: Math.min(5, Math.round(teken.kussens)) } : {}),
    ...(typeof teken.kussenMaat === 'number' ? { kussenMaat: teken.kussenMaat } : {}),
    ...(typeof teken.kussenHoog === 'number' ? { kussenHoog: teken.kussenHoog } : {}),
  };
}

/** Hoeveel graden een los vierkant rugkussen achterover tegen de schaal leunt (rond zijn onderkant). */
export const KUSSEN_KANTEL = 14;

/** Waarde van een verloop [u, f] op plaats u: tussen twee punten een zachte S-bocht (of recht). */
function langsProfiel(profiel: [number, number][], u: number, recht = false): number {
  if (u <= profiel[0]![0]) return profiel[0]![1];
  for (let i = 1; i < profiel.length; i++) {
    const [u0, f0] = profiel[i - 1]!, [u1, f1] = profiel[i]!;
    if (u > u1) continue;
    const s = u1 > u0 ? (u - u0) / (u1 - u0) : 1;
    return f0 + (f1 - f0) * (recht ? s : s * s * (3 - 2 * s));
  }
  return profiel[profiel.length - 1]![1];
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

/**
 * Kader van de trommelzitting in lokale maten. Zonder `zitIn` het hele grondvlak; met `zitIn` aan de zijkanten zoveel
 * naar binnen, achteraan tot in de schaal (nooit voorbij haar binnenkant, anders een kier) en vooraan tot de voorkant.
 * Het onderstel (frame en poten) staat onder dit kader.
 */
export function trommelKader(B: number, D: number, k: KuipParameters | null): { x: number; y: number; b: number; d: number } {
  if (!k?.zitTrommel || !k.zitIn) return { x: 0, y: 0, b: B, d: D };
  const w = Math.min(k.dikte, B / 3, D / 3), zi = Math.min(k.zitIn, B / 6, D / 6), achter = Math.max(0, Math.min(2 * zi, w - 0.5));
  return { x: zi, y: achter, b: B - 2 * zi, d: D - achter };
}

/**
 * Poten van een onderstel met een frame (ringframe, kruisframe), in lokale maten van het element: waar elke poot
 * bovenaan staat (het midden) en hoeveel cm haar voet verder naar buiten staat. Op de productfoto's (Fraser, Ross,
 * Sullivan, Mabel) staan de poten schuin naar buiten; de voet blijft binnen het grondvlak, zodat de maten van de zetel
 * gelijk blijven. `exp` = de exponent van het grondvlak van een kuipfauteuil (de poten staan onder de vier "hoeken" van
 * dat grondvlak), null voor een ander element (de poten 8 cm uit de hoeken van de rechthoek). Eén bron voor de 3D en het
 * vooraanzicht.
 */
export function framePoten(B: number, D: number, pootH: number, exp: number | null): { straal: number; spreid: number; poten: { k: 'la' | 'ra' | 'lv' | 'rv'; lx: number; ly: number; dx: number; dy: number }[] } {
  const binnen = 0.8, dik = 5;
  const hoek = exp !== null ? 2 ** (-1 / exp) * binnen : Math.max(0.5, 1 - 16 / Math.min(B, D));
  const rx = (B / 2) * hoek, ry = (D / 2) * hoek, straal = Math.hypot(rx, ry);
  // Tot waar het grondvlak in die richting reikt: bij een superellips op 2^(−1/n) van de diagonaal, bij een rechthoek de hoek.
  const rand = Math.hypot(B / 2, D / 2) * (exp !== null ? 2 ** (-1 / exp) : 1);
  const spreid = Math.round(Math.max(0, Math.min(0.2 * pootH, rand - straal - dik / 2)) * 10) / 10;
  const poten = ([['la', -1, -1], ['ra', 1, -1], ['lv', -1, 1], ['rv', 1, 1]] as const).map(([k, sx, sy]) => ({
    k, lx: B / 2 + sx * rx, ly: D / 2 + sy * ry, dx: (sx * spreid * rx) / straal, dy: (sy * spreid * ry) / straal,
  }));
  return { straal, spreid, poten };
}

export interface KuipOpbouw {
  /** Volledig grondvlak (basis), gesloten omtrek. */
  plan: Punt[];
  /** Middenlijn van de wand met de bovenhoogte per punt (absoluut, cm), dikte en onderkant (cm). */
  wand: { pad: Punt[]; hoogtes: number[]; dikte: number; onder: number };
  /** Omtrek van het zitkussen. */
  zit: Punt[];
  /** Onder- en bovenkant van de basis (cm). Bij een trommel (`zitTrommel`) is er geen basis: boven = onder. */
  basis: { onder: number; boven: number };
  /** Dikte van de zitting in cm: het losse kussen, of bij een trommel de hele zitting van de poten tot de zithoogte. */
  zitDik: number;
  /**
   * Losse rugkussens (rechthoeken lokaal) als de rug los is. Vierkante kussens (`vierkant`) staan langs de binnenkant
   * van de schaal en zijn naar het midden gedraaid: `draai` in graden (van x naar y), rond het midden van de rechthoek.
   */
  rugkussens: { lx: number; ly: number; lb: number; ld: number; y: number; h: number; draai?: number; vierkant?: boolean }[];
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
  // Met een eigen verloop is het hoogste punt precies de rughoogte (bij de klant: de hoogte op de productpagina).
  const rug = k.profiel ? h.rugH : k.vlak ? voor + 5 : Math.max(h.rugH, voor + 4);
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
  } else if (k.profiel) {
    // Eigen verloop: de punten op gelijke afstanden langs de schaal (bij een breed of afgerond grondvlak liggen punten op
    // gelijke hoeken ongelijk verdeeld), en de hoogte volgens de afstand vanaf het midden achteraan. Links en rechts
    // kunnen verschillen (`boogRechts`, `profielRechts`): het midden achteraan ligt dan niet halverwege de schaal.
    const boogR = k.boogRechts ?? k.boog, profielR = k.profielRechts ?? k.profiel;
    const F = 720, fijn = superellips(cx, cy, B / 2 - w / 2, D / 2 - w / 2, n, -90 - k.boog, -90 + boogR, F);
    const afstand = [0];
    for (let i = 1; i <= F; i++) afstand.push(afstand[i - 1]! + Math.hypot(fijn[i]![0] - fijn[i - 1]![0], fijn[i]![1] - fijn[i - 1]![1]));
    const totaal = afstand[F]!, half = afstand[Math.round((k.boog / (k.boog + boogR)) * F)]!, N = Math.max(stappen * 2, Math.round(totaal / 3 / 2) * 2);
    let j = 0;
    pad = []; hoogtes = [];
    for (let i = 0; i <= N; i++) {
      const doel = (totaal * i) / N;
      while (j < F - 1 && afstand[j + 1]! < doel) j++;
      const f = Math.max(0, Math.min(1, (doel - afstand[j]!) / (afstand[j + 1]! - afstand[j]! || 1)));
      pad.push([rond1(fijn[j]![0] + f * (fijn[j + 1]![0] - fijn[j]![0])), rond1(fijn[j]![1] + f * (fijn[j + 1]![1] - fijn[j]![1]))]);
      const hoog = doel <= half ? langsProfiel(k.profiel, (half - doel) / half, k.profielRecht) : langsProfiel(profielR, (doel - half) / (totaal - half), k.profielRecht);
      hoogtes.push(rond1(voor + (rug - voor) * hoog));
    }
  } else {
    pad = superellips(cx, cy, B / 2 - w / 2, D / 2 - w / 2, n, -90 - k.boog, -90 + k.boog, stappen * 2);
    hoogtes = pad.map((_, i) => {
      const u = Math.abs(i - stappen) / stappen; // 0 = midden achteraan, 1 = einde van de wand
      const t = Math.min(1, u / k.armVanaf);
      return rond1(voor + (rug - voor) * (0.5 + 0.5 * Math.cos(Math.PI * t)));
    });
  }
  const basisBoven = k.zitTrommel ? h.P : h.zithoogte - h.kussenDik;
  // Schelp: zweeft een eind boven de zitting (gedragen door het frame), anders staat de wand op de onderbouw. Met
  // `schaalOp` staat de schaal op de zitting: haar onderkant ligt 2 cm in de zitting (geen kier).
  const onder = k.zwevend ? h.zithoogte + 6 : k.schaalOp ? h.zithoogte - 2 : h.P;
  // Zitkussen: binnen de wand en tot vooraan (bij een schelp over het hele grondvlak).
  // Organisch: de zitting loopt breed tot vooraan door (de wand zakt er in weg).
  const achter = k.zwevend ? 3 : w * (k.organisch ? 0.9 : 0.85);
  const zij = k.zwevend ? 1.5 : w * (k.organisch ? 0.45 : 0.8);
  const zcy = (achter + D - 1.5) / 2, zb = (D - 1.5 - achter) / 2;
  // Trommel: de zitting is het hele grondvlak, of met `zitIn` een kleiner grondvlak binnen de schaal (zie trommelKader).
  const tk = trommelKader(B, D, k);
  const zit = k.zitTrommel
    ? k.zitIn ? plan.map(([x, y]) => [rond1(tk.x + (x / B) * tk.b), rond1(tk.y + (y / D) * tk.d)] as Punt) : plan
    : superellips(cx, zcy, B / 2 - zij, zb, k.plan === 'rond' ? 2.4 : n, 0, 360, 64).slice(0, -1);
  // Losse rugkussens tegen de wand achteraan.
  const rugkussens: KuipOpbouw['rugkussens'] = [];
  if (losseRug && k.kussens) {
    // Gewone vierkante kussens langs de binnenkant van de schaal, elk naar het midden van de zetel gedraaid. Ze staan op
    // een kleiner grondvlak (de schaal, het halve kussen en 1 cm speling naar binnen) en overlappen elkaar wat.
    const dik = 13, maat = Math.max(25, Math.min(k.kussenMaat ?? 46, B - 2 * w - 6)), hoog = Math.max(20, k.kussenHoog ?? maat);
    // Het kussen leunt achterover tegen de bovenrand van de schaal: onderaan staat het zoveel verder naar voren als het
    // tot die rand achteruit helt. Anders stak het door de schaal heen (van achter te zien, Satie 13/11).
    const leun = Math.max(0, Math.min(rug - zitBoven, hoog)) * Math.tan((KUSSEN_KANTEL * Math.PI) / 180);
    const a = B / 2 - w - dik / 2 - 1 - leun, b = D / 2 - w - dik / 2 - 1 - leun;
    const stapGraden = k.kussens > 1 ? Math.min(46, ((maat * 0.82) / ((a + b) / 2)) * (180 / Math.PI)) : 0;
    for (let i = 0; i < k.kussens; i++) {
      const graden = (i - (k.kussens - 1) / 2) * stapGraden, [px, py] = superellips(cx, cy, a, b, n, -90 + graden, -90 + graden, 1)[0]!;
      rugkussens.push({ lx: rond1(px - maat / 2), ly: rond1(py - dik / 2), lb: maat, ld: dik, y: zitBoven, h: hoog, draai: rond1(graden), vierkant: true });
    }
  } else if (losseRug) {
    const aantal = Math.max(1, Math.min(3, Math.round((B - 2 * w) / 30)));
    const breed = (B - 2 * w - 6) / aantal;
    for (let i = 0; i < aantal; i++) {
      // Bij een trommel steken de kussens boven de wand uit tot de rughoogte.
      const top = k.vlak ? Math.max(h.rugH, rug + 12) : rug;
      rugkussens.push({ lx: w + 3 + i * breed, ly: w - 3, lb: breed - 1, ld: 16, y: zitBoven, h: Math.max(20, (top - zitBoven) * (k.vlak ? 0.95 : 0.85)) });
    }
  }
  return { plan, wand: { pad, hoogtes, dikte: w, onder }, zit, basis: { onder: h.P, boven: basisBoven }, zitDik: k.zitTrommel ? h.zithoogte - h.P : h.kussenDik, rugkussens };
}
