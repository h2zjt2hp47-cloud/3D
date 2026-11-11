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
  /** Deel van de boog (0–1) vanaf het midden achteraan dat op volle rughoogte blijft voor de wand begint te zakken (koepelrug). */
  plat: number;
  /**
   * Deel van de boog (0–1) dat op volle rughoogte blijft, zoals `plat`, maar zonder de opbouw van de koepelrug: de wand
   * blijft op de onderbouw staan rond een los zitkussen. Voor een rug met een brede, vlakke bovenkant (Mabel, Ross).
   */
  schouder: number;
  /** Schelp: de rug staat op de zitting in plaats van op de vloer (losse schaal op een frame). */
  zwevend: boolean;
  /**
   * De rug staat op het zitkussen, dat over het hele grondvlak loopt en onder de rug doorloopt (Mabel Meridienne: de bies
   * van het kussen loopt onder de rug door). De onderbouw is dan een dun houten frame.
   */
  opZitting: boolean;
  /** Organisch: dikke, zachte vormen, de zitting zit diep in de kuip. */
  organisch: boolean;
  /** Trommel: de wand is rondom (bijna) even hoog; de rug komt van de losse kussens. */
  vlak: boolean;
  /**
   * Bol verloop: de bovenrand zakt van de rug naar de uiteinden in een bolle lijn die steeds steiler wordt (Manon, Mabel),
   * in plaats van in een S-lijn die vooraan vlak uitloopt in een arm.
   */
  bolVerloop: boolean;
  /**
   * Scheef (Pebble): de schaal loopt niet symmetrisch rond, maar van rechtsachter (op zithoogte, schuin in de zitting)
   * over de rug naar linksvoor (van voren gezien), het hoogst linksachter, en links tot vooraan. `boog` geldt dan voor de
   * linkerkant; rechts stopt de wand 50° na het midden achteraan.
   */
  scheef: boolean;
  /**
   * Bij een scheve schaal: waar ze rechts op de zitting uitkomt en waar ze het hoogst is (graden, −90 = midden achteraan;
   * standaard −38 en −128, Pebble), en hoe hoog ze aan het linkeruiteinde boven de zitting staat (cm; standaard 1: ze zakt
   * daar tot op de zitting). Met een hoog linkeruiteinde krijg je een méridienne: de rug loopt op volle hoogte rond het
   * linkeruiteinde en zakt achteraan schuin naar de zitting.
   */
  scheefRechts?: number;
  scheefTop?: number;
  scheefLinks?: number;
  /**
   * Bij een scheve schaal: hoe hoog ze aan het rechteruiteinde boven de zitting staat (cm). Standaard −3: ze verdwijnt
   * in de zitting (Pebble, méridienne). Positief = een lage arm (Manon).
   */
  scheefRechtsBoven?: number;
  /**
   * Bij een scheve schaal: hoe recht de bovenrand van de top naar het rechteruiteinde zakt (0 = bol, zoals de rand van
   * een blad; 1 = in een rechte lijn). Pebble: bijna recht.
   */
  scheefLijn?: number;
  /** Eigen exponent van het grondvlak (2 = ellips, hoger = hoekiger); leeg = volgens `plan`. */
  exponent?: number;
  /**
   * Helling van de rug: zoveel cm staat haar bovenrand verder naar buiten dan haar voet (0 = recht omhoog, negatief =
   * naar binnen). Een kuip is bovenaan bijna altijd breder dan aan de voet; zonder helling lijkt ze een schutting rond
   * de zitting. De opgegeven breedte en diepte blijven de buitenmaat: de voet wordt zoveel kleiner.
   */
  helling: number;
  /** Helling van de lage uiteinden (de armen), in cm. */
  hellingArm: number;
  /** Polstering: hoeveel dikker de wand halverwege haar hoogte is dan aan de voet en de rand (0 = vlak, 0,3 = bol). */
  bol: number;
  /** Dikte van de wand aan de lage uiteinden, als deel van de dikte van de rug (1 = overal even dik, 0,6 = slanke uiteinden). */
  eindDikte: number;
}

/** Parameters uit de `teken`-velden van de gekozen kuipvorm; null voor de hoekige fauteuil (rechte rug en armen). */
export function kuipParameters(teken: Record<string, unknown> | undefined): KuipParameters | null {
  if (!teken || teken.vorm === 'hoekig' || teken.plan === undefined) return null;
  const getal = (k: string, s: number) => (typeof teken[k] === 'number' ? (teken[k] as number) : s);
  return {
    plan: teken.plan === 'afgerond' ? 'afgerond' : 'rond',
    dikte: getal('dikte', 14),
    boog: Math.max(30, Math.min(178, getal('boog', 150))),
    voorBoven: getal('voorBoven', 14),
    armVanaf: Math.max(0.2, Math.min(1, getal('armVanaf', 1))),
    plat: Math.max(0, Math.min(0.9, getal('plat', 0))),
    schouder: Math.max(0, Math.min(0.8, getal('schouder', 0))),
    zwevend: teken.zwevend === true,
    opZitting: teken.opZitting === true,
    organisch: teken.organisch === true,
    vlak: teken.vlak === true,
    bolVerloop: teken.bolVerloop === true,
    scheef: teken.scheef === true,
    helling: Math.max(-8, Math.min(24, getal('helling', 0))),
    hellingArm: Math.max(-8, Math.min(24, getal('hellingArm', getal('helling', 0) * 0.35))),
    bol: Math.max(0, Math.min(0.5, getal('bol', 0.1))),
    eindDikte: Math.max(0.3, Math.min(1, getal('eindDikte', 1))),
    ...(typeof teken.exponent === 'number' ? { exponent: teken.exponent } : {}),
    ...(typeof teken.scheefRechts === 'number' ? { scheefRechts: teken.scheefRechts } : {}),
    ...(typeof teken.scheefTop === 'number' ? { scheefTop: teken.scheefTop } : {}),
    ...(typeof teken.scheefLinks === 'number' ? { scheefLinks: teken.scheefLinks } : {}),
    ...(typeof teken.scheefRechtsBoven === 'number' ? { scheefRechtsBoven: teken.scheefRechtsBoven } : {}),
    ...(typeof teken.scheefLijn === 'number' ? { scheefLijn: Math.max(0, Math.min(1, teken.scheefLijn)) } : {}),
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
  /** Middenlijn van de wand (aan de voet) met de bovenhoogte per punt (absoluut, cm), dikte, onderkant (cm), helling en polstering. */
  wand: { pad: Punt[]; hoogtes: number[]; dikte: number; onder: number; helling: number; hellingArm: number; bol: number; eindDikte: number };
  /** Omtrek van het zitkussen. */
  zit: Punt[];
  /** Onder- en bovenkant van de basis (cm). */
  basis: { onder: number; boven: number };
  /** Losse rugkussens (rechthoeken lokaal) als de rug los is. */
  rugkussens: { lx: number; ly: number; lb: number; ld: number; y: number; h: number }[];
}

const rond1 = (x: number) => Math.round(x * 10) / 10;

/**
 * Hoeveel de voet van een hellende kuip binnen de buitenmaat staat (cm): opzij helt de wand tussen arm en rug in,
 * achteraan volledig, vooraan niet (de uiteinden hellen opzij). Ook de poten staan zoveel naar binnen.
 */
export function kuipVoetInzet(k: KuipParameters): { zij: number; achter: number } {
  // Staat de rug op het zitkussen (méridienne) of op een frame (schelp), dan bepaalt de zitting de buitenmaat en helt
  // de rug er enkele centimeters voorbij.
  if (k.opZitting || k.zwevend) return { zij: 0, achter: 0 };
  return { zij: Math.max(0, k.hellingArm + (k.helling - k.hellingArm) * 0.35), achter: Math.max(0, k.helling * 0.9) };
}

/**
 * Opbouw van een kuipfauteuil van B × D cm. `P` = poothoogte (onderkant basis), `zithoogte`, `rugH` = rughoogte,
 * `kussenDik` = dikte zitkussen (0 = vaste zitting).
 *
 * B en D zijn de buitenmaten, de helling van de wand inbegrepen: helt de rug 8 cm naar achteren, dan staat haar voet
 * 8 cm verder naar voren en is de voet (onderbouw, zitting) zoveel kleiner dan de bovenrand.
 */
export function kuipOpbouw(B: number, D: number, h: { P: number; zithoogte: number; rugH: number; kussenDik: number }, k: KuipParameters, losseRug: boolean): KuipOpbouw {
  const { zij: zijIn, achter: achterIn } = kuipVoetInzet(k);
  if (zijIn < 0.05 && achterIn < 0.05) return kuipVoet(B, D, h, k, losseRug);
  const o = kuipVoet(B - 2 * zijIn, D - achterIn, h, k, losseRug);
  const schuif = ([x, y]: Punt): Punt => [rond1(x + zijIn), rond1(y + achterIn)];
  return {
    ...o, plan: o.plan.map(schuif), zit: o.zit.map(schuif), wand: { ...o.wand, pad: o.wand.pad.map(schuif) },
    rugkussens: o.rugkussens.map((r) => ({ ...r, lx: rond1(r.lx + zijIn), ly: rond1(r.ly + achterIn) })),
  };
}

/** Een fijn bemonsterde lijn herverdelen in `aantal` punten op gelijke afstanden langs de lijn. */
function gelijkVerdeeld(fijn: Punt[], aantal: number): { pad: Punt[]; afstand: number[]; totaal: number } {
  const F = fijn.length - 1, afstand = [0];
  for (let i = 1; i <= F; i++) afstand.push(afstand[i - 1]! + Math.hypot(fijn[i]![0] - fijn[i - 1]![0], fijn[i]![1] - fijn[i - 1]![1]));
  const totaal = afstand[F]!;
  let j = 0;
  const pad = Array.from({ length: aantal }, (_, i) => {
    const doel = (totaal * i) / (aantal - 1);
    while (j < F - 1 && afstand[j + 1]! < doel) j++;
    const f = Math.max(0, Math.min(1, (doel - afstand[j]!) / (afstand[j + 1]! - afstand[j]! || 1)));
    return [rond1(fijn[j]![0] + f * (fijn[j + 1]![0] - fijn[j]![0])), rond1(fijn[j]![1] + f * (fijn[j + 1]![1] - fijn[j]![1]))] as Punt;
  });
  return { pad, afstand, totaal };
}

/** De opbouw aan de voet (zonder helling): alles binnen B × D. */
function kuipVoet(B: number, D: number, h: { P: number; zithoogte: number; rugH: number; kussenDik: number }, k: KuipParameters, losseRug: boolean): KuipOpbouw {
  // Een brede kuip (tweezit: ruim anderhalf keer zo breed als diep) heeft een rechte rug met ronde hoeken, geen ovaal.
  const n = Math.max(k.exponent ?? exponent(k.plan), B / D > 1.45 && !k.scheef ? 4.2 : 0);
  const w = Math.min(k.dikte, B / 3, D / 3);
  const cx = B / 2, cy = D / 2;
  const plan = superellips(cx, cy, B / 2, D / 2, n, 0, 360, 72).slice(0, -1);
  // Middenlijn van de wand: een halve dikte binnen de rand, symmetrisch rond het midden achteraan.
  const stappen = Math.max(16, Math.round(k.boog / 5));
  const zitBoven = h.zithoogte;
  const voor = zitBoven + k.voorBoven;
  // Trommel: met losse rugkussens blijft de wand laag (de rug komt van de kussens); zonder kussens is de wand zelf de rug
  // en loopt ze achteraan tot de rughoogte (Milton, Fraser).
  const rug = k.vlak ? (losseRug ? voor + 5 : Math.max(h.rugH, voor + 5)) : Math.max(h.rugH, voor + 4);
  let pad: Punt[], hoogtes: number[];
  if (k.scheef) {
    // Volgens de productfoto's (pebble-01-6, -13, -18): van rechtsachter (−38°, de schaal komt daar op de zitting uit,
    // ±vier vijfde van de breedte) over de rug naar links, het hoogst op de rug links van het midden (−128°, ±een kwart van de breedte), en langs de linkerzijde naar
    // voren (−90° − boog) waar ze rond tot op de vloer zakt, net achter de voorkant van de zitting.
    // Een méridienne (Mabel) gebruikt dezelfde opbouw met eigen hoeken en een hoog linkeruiteinde.
    const tRechts = k.scheefRechts ?? -38, tLinks = -90 - k.boog, tTop = Math.min(tRechts - 5, Math.max(tLinks + 5, k.scheefTop ?? -128));
    // Eerst fijn bemonsterd, dan op gelijke afstanden langs de wand: bij een afgerond grondvlak liggen punten op gelijke
    // hoeken ongelijk verdeeld, en dan golfde de bovenkant (de hoogte volgt de afstand langs de wand, niet de hoek).
    const F = 600, fijn = superellips(cx, cy, B / 2 - w / 2, D / 2 - w / 2, n, tRechts, tLinks, F);
    const verdeeld = gelijkVerdeeld(fijn, stappen * 2 + 1);
    pad = verdeeld.pad;
    const uTop = verdeeld.afstand[Math.round(((tRechts - tTop) / (tRechts - tLinks)) * F)]! / verdeeld.totaal;
    // Vooraan links ongeveer op zithoogte (daaronder loopt de ronde kop tot op de vloer). Rechts verdwijnt de schaal in de
    // zitting: haar bovenkant eindigt 3 cm onder de zitting, niet erop (twee vlakken op dezelfde hoogte flikkeren).
    const links = Math.min(rug, zitBoven + (k.scheefLinks ?? 1)), rechts = Math.min(rug, zitBoven + (k.scheefRechtsBoven ?? -3));
    // Bol verloop, zoals de rand van een blad: bij de top vlak, naar de uiteinden toe steeds steiler. Met `scheefLijn`
    // zakt de rand naar rechts (bijna) in een rechte lijn.
    const lijn = k.scheefLijn ?? 0;
    hoogtes = pad.map((_, i) => {
      const u = i / (pad.length - 1);
      return u <= uTop
        ? rond1(rechts + (rug - rechts) * ((1 - lijn) * Math.sin((Math.PI / 2) * (u / uTop)) + lijn * (u / uTop)))
        : rond1(links + (rug - links) * Math.cos((Math.PI / 2) * ((u - uTop) / (1 - uTop))));
    });
  } else {
    // Ook hier op gelijke afstanden langs de wand (sinds 11/11): bij een hoekig grondvlak (schelp, brede tweezit) lagen de
    // punten op gelijke hoeken opeengepakt aan de uiteinden, en dan zakte de rug pas in de laatste centimeters, met een
    // knik (de rug van Karl kreeg zo "oortjes").
    pad = gelijkVerdeeld(superellips(cx, cy, B / 2 - w / 2, D / 2 - w / 2, n, -90 - k.boog, -90 + k.boog, 600), stappen * 2 + 1).pad;
    hoogtes = pad.map((_, i) => {
      const u = Math.abs(i - stappen) / stappen; // 0 = midden achteraan, 1 = einde van de wand
      // Met `plat` blijft het midden op volle hoogte en zakt de wand pas daarna (koepelrug: van voren een brede rug met
      // ronde schouders, geen punt).
      const top = Math.max(k.plat, k.schouder);
      const t = Math.min(1, Math.max(0, u - top) / Math.max(0.05, k.armVanaf - top));
      return rond1(voor + (rug - voor) * (k.bolVerloop ? Math.cos((Math.PI / 2) * t) : 0.5 + 0.5 * Math.cos(Math.PI * t)));
    });
  }
  const basisBoven = h.zithoogte - h.kussenDik;
  // Schelp: zweeft een eind boven de zitting (gedragen door het frame), anders staat de wand op de onderbouw.
  // Op de zitting: de wand begint net onder de bovenkant van het zitkussen (met een vaste zitting op de vloer of het frame).
  const onder = k.zwevend ? h.zithoogte + 4 : k.opZitting && h.kussenDik ? h.zithoogte - 3 : h.P;
  // Zitkussen: binnen de wand en tot vooraan (bij een schelp over het hele grondvlak).
  // Organisch: de zitting loopt breed tot vooraan door (de wand zakt er in weg).
  const vol = k.zwevend || k.opZitting;
  // Organisch (kiezel, Pebble): de zitting is de volle kiezel, bijna tot aan de rand; de schaal staat er achteraan en
  // rond één hoek tegenaan (ze overlapt de zitting). Waar de schaal ophoudt, is de naad een rechte, verticale lijn.
  const achter = vol ? (k.zwevend ? 3 : 1.5) : k.organisch ? 3 : w * 0.85;
  const zij = vol ? 1.5 : k.organisch ? 3 : w * 0.8;
  const zcy = (achter + D - 1.5) / 2, zb = (D - 1.5 - achter) / 2;
  // Achteraan volgt het kussen de ronding van de wand; vooraan is het breder en rechter, zoals op de foto's (Ross, Mabel,
  // Sullivan): de voorkant van de zitting loopt bijna over de volle breedte tussen de armen. Tot 11/11 was het één ellips
  // en leek het een klein rond kussentje in de schelp. Niet bij een trommel, schelp of kiezel (daar is de zitting rond).
  const nAchter = k.plan === 'rond' ? 2.4 : n;
  const breedVoor = !vol && !k.organisch && !k.vlak && k.plat === 0;
  // Scheve schaal op een gewone zitting (méridienne): rechts staat geen wand, daar loopt het kussen tot aan de rand.
  const zijRechts = k.scheef && (k.organisch || h.kussenDik > 0) ? 1.5 : zij;
  const zcx = (zij + B - zijRechts) / 2, za = (B - zijRechts - zij) / 2;
  const zit = breedVoor
    ? [...superellips(zcx, zcy, za, zb, k.plan === 'rond' ? 3.2 : 4.6, 0, 180, 32).slice(0, -1), ...superellips(zcx, zcy, za, zb, nAchter, 180, 360, 32).slice(0, -1)]
    : superellips(zcx, zcy, za, zb, nAchter, 0, 360, 64).slice(0, -1);
  // Losse rugkussens tegen de wand achteraan.
  const rugkussens: KuipOpbouw['rugkussens'] = [];
  if (losseRug) {
    // Een trommel heeft grote, brede kussens (één per ±45 cm, zoals op de foto's van Quin en Satie); anders smallere.
    const aantal = Math.max(1, Math.min(3, Math.round((B - 2 * w) / (k.vlak ? 45 : 30))));
    const breed = (B - 2 * w - 6) / aantal;
    for (let i = 0; i < aantal; i++) {
      // Bij een trommel steken de kussens boven de wand uit tot de rughoogte.
      const top = k.vlak ? Math.max(h.rugH, rug + 12) : rug;
      rugkussens.push({ lx: w + 3 + i * breed - (k.vlak && aantal > 1 ? 1.5 : 0), ly: w - 3, lb: breed - 1 + (k.vlak && aantal > 1 ? 3 : 0), ld: k.vlak ? 22 : 16, y: zitBoven, h: Math.max(20, (top - zitBoven) * (k.vlak ? 1 : 0.85)) });
    }
    // Een brede trommel (Quin, 91 cm: "4 kussens inbegrepen") heeft vooraan nog twee kussens van bijna dezelfde maat, die
    // de achterste overlappen: samen vullen ze de hele rug (opmerking van 11/11: "de kussens vullen de zetel meer").
    if (k.vlak && B >= 85) {
      const lb = breed * 1.02, hoog = Math.max(18, (Math.max(h.rugH, rug + 12) - zitBoven) * 0.86);
      for (const lx of [w + 2, B - w - 2 - lb]) rugkussens.push({ lx, ly: w + 15, lb, ld: 17, y: zitBoven, h: hoog });
    }
  }
  return { plan, wand: { pad, hoogtes, dikte: w, onder, helling: k.helling, hellingArm: k.hellingArm, bol: k.bol, eindDikte: k.eindDikte }, zit, basis: { onder: h.P, boven: basisBoven }, rugkussens };
}
