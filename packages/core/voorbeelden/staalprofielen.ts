/**
 * Stalen profielen en staal als materiaal, voor de loods (loods.ts) en het staalwerk rond de woning (staalwerk.ts).
 *
 * **Geen enkel getal hier is in een tabel of een norm nagelezen.** De maten en gewichten van de I- en H-profielen (IPE,
 * HEA) zijn richtwaarden uit algemene kennis: een gangbare profieltabel uit het geheugen. Het gewicht van kokers, hoeken,
 * plat staal, rond staal en koudgevormde Z- en C-profielen is berekend uit hun maten × de dichtheid van staal, zonder de
 * afrondingen van de hoeken (dus iets te hoog of te laag). Elk gewicht draagt dat in zijn `herkomst`, met
 * `nagelezen: false`: **een staalbouwer leest ze na** in de profieltabel van zijn leverancier. Wie een waarde naleest,
 * zet de bron in `verwijzing` en `nagelezen` op `true`.
 *
 * IPE en HEA zijn de gewone namen van de Europese reeksen warmgewalste profielen, geen merknamen. Geen prijzen.
 */
import type { BouwMateriaal, OpbouwHerkomst, Richtwaarde, Staalprofiel } from '../src/index.js';

/** Dichtheid van staal (kg/m³). Richtwaarde. */
export const STAAL_DICHTHEID: Richtwaarde = {
  waarde: 7850,
  herkomst: { bron: 'algemene kennis', verwijzing: 'Richtwaarde uit algemene kennis; geen tabel geopend.', nagelezen: false },
};

const uitTabel: OpbouwHerkomst = {
  bron: 'algemene kennis',
  verwijzing: 'Richtwaarde uit algemene kennis (een gangbare profieltabel uit het geheugen); geen tabel geopend. Na te lezen in de profieltabel van de leverancier (de Europese reeksen warmgewalste profielen, uit het geheugen EN 10365).',
  nagelezen: false,
};
const berekend: OpbouwHerkomst = {
  bron: 'algemene kennis',
  verwijzing: 'Berekend uit de maten van het profiel × 7850 kg/m³, zonder de afrondingen van de hoeken; geen tabel geopend. Na te lezen in de profieltabel van de leverancier.',
  nagelezen: false,
};

/** Een maat in mm als tekst, met een komma (42,4). */
const mm = (x: number) => String(Math.round(x * 10) / 10).replace('.', ',');
/** Gewicht in kg/m uit een oppervlakte in mm². */
const kgPerM = (mm2: number) => Math.round(mm2 * STAAL_DICHTHEID.waarde * 1e-6 * 100) / 100;
const gewicht = (kg: number, herkomst: OpbouwHerkomst): Richtwaarde => ({ waarde: kg, herkomst });

/**
 * De oppervlakte van de doorsnede in mm², zonder afrondingen. Voor een I-profiel is dat iets minder dan de echte
 * (de afrondingen tussen lijf en flens ontbreken); een test legt het naast de tabel.
 */
export function doorsnedeOppervlakte(p: Staalprofiel): number {
  const t = p.dikte;
  switch (p.vorm) {
    case 'I': return 2 * p.breedte * (p.flens ?? t) + (p.hoogte - 2 * (p.flens ?? t)) * t;
    case 'koker': return 2 * t * (p.hoogte + p.breedte - 2 * t);
    case 'hoek': return t * (p.hoogte + p.breedte - t);
    case 'plat': return p.breedte * p.hoogte;
    case 'rond': return (Math.PI / 4) * (p.hoogte ** 2 - Math.max(0, p.hoogte - 2 * t) ** 2);
    case 'Z': case 'C': return t * (p.hoogte + 2 * p.breedte - 2 * t);
  }
}

const metGewicht = (p: Omit<Staalprofiel, 'gewicht'>): Staalprofiel => ({ ...p, gewicht: gewicht(kgPerM(doorsnedeOppervlakte(p as Staalprofiel)), berekend) });

/** Koker (vierkant of rechthoekig): hoogte × breedte × wanddikte in mm. */
export const koker = (h: number, b: number, t: number): Staalprofiel => metGewicht({ naam: `koker ${mm(h)} × ${mm(b)} × ${mm(t)}`, vorm: 'koker', hoogte: h, breedte: b, dikte: t });
/** Hoekprofiel: staand been × liggend been × dikte in mm. */
export const hoekprofiel = (a: number, b: number, t: number): Staalprofiel => metGewicht({ naam: `hoek ${mm(a)} × ${mm(b)} × ${mm(t)}`, vorm: 'hoek', hoogte: a, breedte: b, dikte: t });
/** Plat staal: breedte × dikte in mm. Het ligt plat (de dikte staat rechtop); draai het 90° om het op zijn kant te zetten. */
export const plat = (b: number, t: number): Staalprofiel => metGewicht({ naam: `plat ${mm(b)} × ${mm(t)}`, vorm: 'plat', hoogte: t, breedte: b, dikte: t });
/** Vol rond staal: diameter in mm. */
export const rond = (d: number): Staalprofiel => metGewicht({ naam: `rond ${mm(d)}`, vorm: 'rond', hoogte: d, breedte: d, dikte: d / 2 });
/** Buis: diameter × wanddikte in mm. */
export const buis = (d: number, t: number): Staalprofiel => metGewicht({ naam: `buis ${mm(d)} × ${mm(t)}`, vorm: 'rond', hoogte: d, breedte: d, dikte: t });
/** Koudgevormd Z-profiel: hoogte (lijf), flens en dikte in mm. */
export const zProfiel = (h: number, f: number, t: number): Staalprofiel => metGewicht({ naam: `Z ${mm(h)} × ${mm(t)}`, vorm: 'Z', hoogte: h, breedte: f, dikte: t });
/** Koudgevormd C-profiel: hoogte (lijf), flens en dikte in mm. */
export const cProfiel = (h: number, f: number, t: number): Staalprofiel => metGewicht({ naam: `C ${mm(h)} × ${mm(t)}`, vorm: 'C', hoogte: h, breedte: f, dikte: t });

/** IPE: hoogte, breedte, lijf, flens (mm) en gewicht (kg/m), uit het geheugen. */
const IPE: [number, number, number, number, number][] = [
  [80, 46, 3.8, 5.2, 6.0], [100, 55, 4.1, 5.7, 8.1], [120, 64, 4.4, 6.3, 10.4], [140, 73, 4.7, 6.9, 12.9],
  [160, 82, 5.0, 7.4, 15.8], [180, 91, 5.3, 8.0, 18.8], [200, 100, 5.6, 8.5, 22.4], [220, 110, 5.9, 9.2, 26.2],
  [240, 120, 6.2, 9.8, 30.7], [270, 135, 6.6, 10.2, 36.1], [300, 150, 7.1, 10.7, 42.2], [330, 160, 7.5, 11.5, 49.1],
  [360, 170, 8.0, 12.7, 57.1], [400, 180, 8.6, 13.5, 66.3], [450, 190, 9.4, 14.6, 77.6], [500, 200, 10.2, 16.0, 90.7],
  [550, 210, 11.1, 17.2, 106], [600, 220, 12.0, 19.0, 122],
];
/** HEA: naam (het getal), hoogte, breedte, lijf, flens (mm) en gewicht (kg/m), uit het geheugen. */
const HEA: [number, number, number, number, number, number][] = [
  [100, 96, 100, 5, 8, 16.7], [120, 114, 120, 5, 8, 19.9], [140, 133, 140, 5.5, 8.5, 24.7], [160, 152, 160, 6, 9, 30.4],
  [180, 171, 180, 6, 9.5, 35.5], [200, 190, 200, 6.5, 10, 42.3], [220, 210, 220, 7, 11, 50.5], [240, 230, 240, 7.5, 12, 60.3],
  [260, 250, 260, 7.5, 12.5, 68.2], [280, 270, 280, 8, 13, 76.4], [300, 290, 300, 8.5, 14, 88.3], [320, 310, 300, 9, 15.5, 97.6],
  [340, 330, 300, 9.5, 16.5, 105], [360, 350, 300, 10, 17.5, 112], [400, 390, 300, 11, 19, 125], [450, 440, 300, 11.5, 21, 140],
  [500, 490, 300, 12, 23, 155],
];

/**
 * De profielen op hun naam: de IPE- en HEA-reeks, en de kokers, hoeken, platen, staven en koudgevormde profielen die de
 * modellen gebruiken. Een model mag ook een eigen maat maken met `koker`, `plat` enz.
 */
export const staalprofielen: Record<string, Staalprofiel> = {};
for (const [h, b, tw, tf, kg] of IPE) staalprofielen[`IPE ${h}`] = { naam: `IPE ${h}`, vorm: 'I', hoogte: h, breedte: b, dikte: tw, flens: tf, gewicht: gewicht(kg, uitTabel) };
for (const [n, h, b, tw, tf, kg] of HEA) staalprofielen[`HEA ${n}`] = { naam: `HEA ${n}`, vorm: 'I', hoogte: h, breedte: b, dikte: tw, flens: tf, gewicht: gewicht(kg, uitTabel) };
for (const p of [
  koker(40, 40, 3), koker(50, 50, 3), koker(60, 60, 4), koker(80, 80, 4), koker(100, 100, 4), koker(120, 120, 5), koker(150, 150, 5),
  koker(100, 50, 4), koker(120, 60, 4), koker(150, 100, 5), koker(200, 100, 5), koker(20, 20, 2), koker(30, 30, 2),
  hoekprofiel(40, 40, 4), hoekprofiel(50, 50, 5), hoekprofiel(60, 60, 6),
  plat(40, 8), plat(50, 10), plat(60, 10), plat(80, 10), plat(250, 10), plat(300, 12), plat(20, 10),
  rond(12), rond(16), rond(20), rond(24), buis(42.4, 2), buis(48.3, 3),
  zProfiel(150, 60, 2), zProfiel(200, 70, 2), zProfiel(250, 80, 2.5), cProfiel(150, 50, 2), cProfiel(200, 60, 2.5),
]) staalprofielen[p.naam] = p;

/** Een profiel op zijn naam; een onbekende naam geeft een fout in gewone taal. */
export function staalprofiel(naam: string): Staalprofiel {
  const p = staalprofielen[naam];
  if (!p) throw new Error(`Het profiel «${naam}» staat niet in de lijst van stalen profielen.`);
  return p;
}

/**
 * Afwerkingen van staal: thermisch verzinkt, poederlak in een paar RAL-kleuren, inox. Blank metaal (verzinkt, inox) is
 * de bloksoort `metaal`; poederlak is een laklaag en wordt `lak_mat`: als `metaal` spiegelt de kijker de omgeving zo sterk
 * dat een donkere RAL-kleur zwart oogt (proef op echte beelden, 16/11). De kleuren op het scherm zijn benaderingen
 * (zoals bij de ramen); de keuze gebeurt met een echte kleurenwaaier.
 */
export const STAAL_AFWERKINGEN: { code: string; label: string; kleur: string; soort: 'metaal' | 'lak_mat' }[] = [
  { code: 'verzinkt', label: 'Thermisch verzinkt', kleur: '#bfc5c8', soort: 'metaal' },
  { code: 'ral9005', label: 'Poederlak zwart (RAL 9005)', kleur: '#26262a', soort: 'lak_mat' },
  { code: 'ral7016', label: 'Poederlak antracietgrijs (RAL 7016)', kleur: '#3d4347', soort: 'lak_mat' },
  { code: 'ral7035', label: 'Poederlak lichtgrijs (RAL 7035)', kleur: '#c5c7c4', soort: 'lak_mat' },
  { code: 'ral9010', label: 'Poederlak zuiver wit (RAL 9010)', kleur: '#efeae0', soort: 'lak_mat' },
  { code: 'ral9006', label: 'Poederlak blank aluminiumkleurig (RAL 9006)', kleur: '#a5a6a5', soort: 'lak_mat' },
  { code: 'inox', label: 'Inox, geborsteld', kleur: '#c9cccd', soort: 'metaal' },
];

/** Staal als materiaal: `staal_<code>` per afwerking. */
export const staalMaterialen: Record<string, BouwMateriaal> = Object.fromEntries(
  STAAL_AFWERKINGEN.map((a) => [`staal_${a.code}`, { label: a.code === 'inox' ? 'Inox, geborsteld' : `Staal, ${a.label.charAt(0).toLowerCase()}${a.label.slice(1)}`, soort: a.soort, kleur: a.kleur }]),
);
