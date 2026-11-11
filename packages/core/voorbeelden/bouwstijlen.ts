/**
 * Bouwstijlen: het karakter van een zetel in één keuze.
 *
 * Les uit de vergelijking met de productfoto's (10 en 11/11): zetels verschillen vooral in een handvol dingen die samen
 * horen: wat eronder staat (poten, sokkel, plateau, tot op de vloer), hoe dik onderbouw en zitkussen zijn, of de rug uit
 * losse kussens bestaat, en hoe zacht alles is. Wie die als twintig losse getallen moet invullen, komt uit bij zetels die
 * op elkaar lijken. Een bouwstijl zet ze in één keer goed; daarna stel je alleen bij wat afwijkt.
 *
 * De stijlen zijn algemeen (niet van één klant). Ze raken alleen de keuzes en de vormgeving van de hele zetel: de
 * elementen, hun maten, de stof en het hout blijven zoals ze zijn. De getallen zijn vertrekwaarden, geen maten van een
 * bepaald model.
 */
import type { Ontwerp, Vormgeving } from '../src/index.js';

export interface Bouwstijl {
  code: string;
  label: string;
  /** Eén zin: wat je ziet. */
  uitleg: string;
  /** Waaraan je de stijl herkent, in gewone woorden (voor de keuzekaart en de handleiding). */
  kenmerken: string[];
  /** Keuzes voor de hele zetel (poten, rug, zitting, comfort, naden). */
  opties: Record<string, string>;
  vormgeving: Partial<Vormgeving>;
}

/** Optiegroepen die bij het karakter horen: een bouwstijl zet ze of laat ze terugvallen op de standaard. */
export const STIJLGROEPEN = ['poten', 'poothoogte', 'zithoogte', 'rug', 'rughoogte', 'zitting', 'comfort', 'naad', 'nekrol'];
/** Vormgeving die bij de opbouw in 3D hoort en bij een andere bouwstijl blijft staan. */
const BLIJFT: (keyof Vormgeving)[] = ['opbouw', 'bocht'];

export const bouwstijlen: Bouwstijl[] = [
  {
    code: 'dun_op_poten', label: 'Dun karkas op slanke poten',
    uitleg: 'Een dunne onderbouw op hoge, slanke poten met dikke, losse donskussens die er vooraan over steken.',
    kenmerken: ['slanke metalen poten', 'dunne onderbouw', 'dikke zitkussens die oversteken', 'grote losse rugkussens met dons'],
    opties: { poten: 'metaal_staaf', rug: 'los_dons', comfort: 'dons' },
    vormgeving: { poothoogte: 11, zithoogte: 44, rughoogte: 92, armhoogte: 70, karkashoogte: 70, rugdikte: 14, rugkussendikte: 26, kussendikte: 23, zachtheid: 8, kussenoversteek: 3 },
  },
  {
    code: 'strak_op_poten', label: 'Strak en slank op poten',
    uitleg: 'Twee even dikke, strakke lagen (onderbouw en zitkussen) op slanke poten, met rechte rugkussens.',
    kenmerken: ['slanke metalen poten', 'onderbouw en zitkussen even dik', 'strakke randen', 'rechte losse rugkussens'],
    opties: { poten: 'metaal_staaf', rug: 'los', comfort: 'veren' },
    vormgeving: { poothoogte: 15, zithoogte: 46, rughoogte: 87, armhoogte: 65, karkashoogte: 65, rugdikte: 18, rugkussendikte: 25, kussendikte: 16, zachtheid: 4 },
  },
  {
    code: 'bak', label: 'Bak op lage voetjes',
    uitleg: 'Rug, armen en onderbouw vormen één bak op lage blokvoetjes; de kussens liggen erin.',
    kenmerken: ['lage blokvoetjes', 'armen even hoog als het karkas', 'zitkussens tussen de armen', 'rechte losse rugkussens'],
    opties: { poten: 'blok', poothoogte: 'laag', rug: 'los', comfort: 'veren' },
    vormgeving: { zithoogte: 45, rughoogte: 88, armhoogte: 65, karkashoogte: 65, rugdikte: 16, rugkussendikte: 24, kussendikte: 18, zachtheid: 4 },
  },
  {
    code: 'lounge', label: 'Lage loungebak met sierkussens',
    uitleg: 'Een lage, diepe bak tot op de vloer met een lage vaste rug; de rug komt van losse sierkussens.',
    kenmerken: ['tot op de vloer (verdekte voet)', 'lage rug even hoog als de armen', 'geen vaste rugkussens: sierkussens toevoegen', 'zacht zitkussen'],
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', comfort: 'dons' },
    vormgeving: { zithoogte: 39, rughoogte: 66, armhoogte: 66, rugdikte: 22, kussendikte: 17, zachtheid: 5 },
  },
  {
    code: 'plateau', label: 'Plateau met dikke donskussens',
    uitleg: 'Een laag plateau op korte blokpootjes dat onder de kussens uitsteekt, met dikke, losse donskussens.',
    kenmerken: ['korte blokpootjes', 'plateau steekt onder de kussens uit', 'dikke zitkussens', 'grote losse rugkussens met dons'],
    opties: { poten: 'blok', rug: 'los_dons', comfort: 'dons' },
    vormgeving: { poothoogte: 8, zithoogte: 47, rughoogte: 92, armhoogte: 66, karkashoogte: 66, rugdikte: 14, rugkussendikte: 26, kussendikte: 24, zachtheid: 8, kussenoversteek: -6 },
  },
  {
    code: 'blokken', label: 'Blokken tot op de vloer',
    uitleg: 'Elk deel is één gestoffeerd blok tot op de vloer: vaste zitting, lage dikke rug, bies langs de randen.',
    kenmerken: ['geen zichtbare poten', 'vaste zitting (geen los kussen)', 'lage, dikke vaste rug', 'bies langs de randen'],
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', zitting: 'vaste_zitting', comfort: 'schuim', naad: 'bies' },
    vormgeving: { poothoogte: 1, zithoogte: 40, rughoogte: 62, armhoogte: 62, rugdikte: 30, zachtheid: 2 },
  },
  {
    code: 'hoes', label: 'Hoes tot op de grond',
    uitleg: 'Een hoes bedekt de onderbouw tot op de vloer; één lang zitkussen en losse rugkussens, met een bies.',
    kenmerken: ['hoes tot op de grond', 'geen zichtbare poten', 'twee losse rugkussens', 'bies langs de kussens'],
    opties: { poten: 'housse', rug: 'los', comfort: 'veren', naad: 'bies' },
    vormgeving: { rughoogte: 85, armhoogte: 62, karkashoogte: 64, rugdikte: 14, rugkussendikte: 22, rugkussens: 2, kussendikte: 16, zachtheid: 4 },
  },
  {
    code: 'rond_zacht', label: 'Zacht en rond uit één stuk',
    uitleg: 'Vaste zitting waarvan de voorkant in een grote boog naar beneden rolt, met een vaste, licht hellende rug.',
    kenmerken: ['tot op de vloer', 'vaste zitting met ronde voorkant', 'vaste hellende rug', 'heel zachte vormen'],
    opties: { poten: 'verdekt', poothoogte: 'laag', rug: 'vast', zitting: 'vaste_zitting', comfort: 'schuim' },
    vormgeving: { poothoogte: 1, zithoogte: 40, rughoogte: 71, armhoogte: 60, rugdikte: 25, zachtheid: 8, rugvorm: 'hellend' },
  },
];

/**
 * Zet een bouwstijl op een ontwerp: de keuzes van de stijlgroepen en de vormgeving van de hele zetel worden vervangen.
 * Elementen (met hun eigen keuzes en vormgeving), stof, hout en metaal blijven. Geeft een nieuw ontwerp terug.
 */
export function pasBouwstijlToe(ontwerp: Ontwerp, stijl: Bouwstijl): Ontwerp {
  const opties = Object.fromEntries(Object.entries(ontwerp.opties ?? {}).filter(([groep]) => !STIJLGROEPEN.includes(groep)));
  const blijft = Object.fromEntries(BLIJFT.filter((k) => ontwerp.vormgeving?.[k] !== undefined).map((k) => [k, ontwerp.vormgeving![k]]));
  return { ...structuredClone(ontwerp), opties: { ...opties, ...stijl.opties }, vormgeving: { ...blijft, ...stijl.vormgeving } };
}

/** De bouwstijl die een ontwerp nu precies heeft (zelfde keuzes en vormgeving), of undefined als het ervan afwijkt. */
export function bouwstijlVan(ontwerp: Ontwerp): Bouwstijl | undefined {
  const zelfde = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  return bouwstijlen.find((s) => {
    const toegepast = pasBouwstijlToe(ontwerp, s);
    const sorteer = (o: object | undefined) => Object.fromEntries(Object.entries(o ?? {}).sort(([a], [b]) => a.localeCompare(b)));
    return zelfde(sorteer(toegepast.opties), sorteer(ontwerp.opties)) && zelfde(sorteer(toegepast.vormgeving), sorteer(ontwerp.vormgeving));
  });
}
