/**
 * Catalogus voor de plattegrond: vloeren, wandafwerking, binnendeuren en meubels,
 * met demoprijzen (verkoop en kost per eenheid, excl. btw, plaatsing inbegrepen).
 * En de omzetting van een plattegrond naar offerteregels (vloeren, wanden, deuren, ruwbouw, inrichting).
 */
import {
  dakOpbouw, gevelOppervlaktes, losseWandHoogte, losseWandLengte, losseWandRuimte, losseWandVlak, murenVan, niveauPlan, niveauVan, ruimteMaten, verdiepingenVan,
  type DakBedekking, type DakLichtType, type DakMateriaal, type GevelMateriaal, type GevelOntwerp, type Muur, type OfferteRegel, type PlanCatalogus, type Plattegrond,
} from '../src/index.js';
import { techniekCatalogus } from './techniek.js';

const VOEGEN = { grijs: { label: 'Grijs', hex: '#bdb8ad' }, wit: { label: 'Wit', hex: '#e8e4da' }, antraciet: { label: 'Antraciet', hex: '#4a4846' }, zand: { label: 'Zand', hex: '#cbbd9d' } };

/**
 * Gevelmaterialen met kleurstalen (demo: kleuren benaderd, prijzen verzonnen, per m² geplaatst excl. btw).
 * In een echte implementatie komt dit uit de catalogus van de aannemer of leverancier.
 */
export const gevelCatalogus: Record<string, GevelMateriaal> = {
  gevelsteen: {
    label: 'Gevelsteen (handvorm)', groep: 'Baksteen', soort: 'steen', prijs: 145, kost: 96, artikel: 'GEV-STEEN',
    uitleg: 'Klassieke spouwmuur met handvormsteen; de voegkleur bepaalt mee het uitzicht.',
    kleuren: {
      rood: { label: 'Rood', hex: '#9c4a34' }, rood_bruin: { label: 'Rood-bruin genuanceerd', hex: '#7e4a3a' }, oranje: { label: 'Oranjerood', hex: '#b5603f' },
      geel: { label: 'Geel-zand', hex: '#cdb48a' }, wit: { label: 'Wit-grijs', hex: '#d9d4cb' }, grijs: { label: 'Grijs genuanceerd', hex: '#8d8a86' }, antraciet: { label: 'Antraciet', hex: '#45423f' },
    },
    voegen: VOEGEN,
  },
  steenstrips: {
    label: 'Steenstrips op buitenisolatie', groep: 'Baksteen', soort: 'steen', prijs: 168, kost: 112, artikel: 'GEV-STRIPS',
    uitleg: 'Dunne stenen op isolatie: het uitzicht van baksteen, ook bij renovatie van een bestaande gevel.',
    kleuren: { rood: { label: 'Rood', hex: '#9c4a34' }, wit: { label: 'Wit-grijs', hex: '#d9d4cb' }, grijs: { label: 'Grijs', hex: '#8d8a86' }, antraciet: { label: 'Antraciet', hex: '#45423f' } },
    voegen: VOEGEN,
  },
  crepi: {
    label: 'Sierpleister (crepi) op isolatie', groep: 'Pleister', soort: 'pleister', prijs: 98, kost: 62, artikel: 'GEV-CREPI',
    uitleg: 'Buitenisolatie met een fijne pleisterlaag in kleur.',
    kleuren: {
      wit: { label: 'Wit', hex: '#f1efe9' }, gebroken_wit: { label: 'Gebroken wit', hex: '#e8e2d4' }, zand: { label: 'Zand', hex: '#d8ccb3' },
      lichtgrijs: { label: 'Lichtgrijs', hex: '#c9c8c3' }, grijs: { label: 'Grijs', hex: '#8f8f8b' }, antraciet: { label: 'Antraciet', hex: '#4b4b4a' },
    },
  },
  hout_staand: {
    label: 'Houten bekleding, staand', groep: 'Hout', soort: 'planken', prijs: 122, kost: 78, artikel: 'GEV-HOUT-S',
    uitleg: 'Staande planken (bv. thermisch gemodificeerd hout); vergrijst vanzelf of wordt gebeitst.',
    kleuren: { naturel: { label: 'Naturel', hex: '#b0835a' }, vergrijsd: { label: 'Vergrijsd', hex: '#9c968c' }, zwart: { label: 'Zwart gebeitst', hex: '#2f2d2b' } },
  },
  hout_liggend: {
    label: 'Houten bekleding, liggend (rabat)', groep: 'Hout', soort: 'planken_h', prijs: 128, kost: 82, artikel: 'GEV-HOUT-L',
    uitleg: 'Liggende planken met schaduwnaad, bv. ceder.',
    kleuren: { ceder: { label: 'Ceder', hex: '#a86f4c' }, naturel: { label: 'Naturel', hex: '#b48a5e' }, vergrijsd: { label: 'Vergrijsd', hex: '#a39d93' }, zwart: { label: 'Zwart gebeitst', hex: '#2f2d2b' } },
  },
  leien: {
    label: 'Gevelleien (vezelcement)', groep: 'Leien en platen', soort: 'leien', prijs: 112, kost: 72, artikel: 'GEV-LEI',
    uitleg: 'Kleine leien op een houten onderstructuur; vaak op een verdieping of een topgevel.',
    kleuren: { antraciet: { label: 'Antraciet', hex: '#3b3f45' }, blauwgrijs: { label: 'Blauwgrijs', hex: '#59636b' }, grijs: { label: 'Grijs', hex: '#7d8186' } },
  },
  zink: {
    label: 'Zink met staande naad', groep: 'Metaal', soort: 'zink', prijs: 168, kost: 112, artikel: 'GEV-ZINK',
    uitleg: 'Zinken banen met een opstaande naad om de 43 cm.',
    kleuren: { kwarts: { label: 'Kwartsgrijs', hex: '#8a8f92' }, antraciet: { label: 'Antraciet', hex: '#4a4d50' }, naturel: { label: 'Naturel', hex: '#a9adb0' } },
  },
  natuursteen: {
    label: 'Blauwe hardsteen (gezaagd)', groep: 'Natuursteen', soort: 'natuursteen', prijs: 212, kost: 140, artikel: 'GEV-ARDUIN',
    uitleg: 'Natuursteen in platen; vaak als sokkel onderaan de gevel.',
    kleuren: { blauwgrijs: { label: 'Blauwgrijs', hex: '#5d6366' }, gezoet: { label: 'Gezoet (lichter)', hex: '#727a7d' } },
  },
};

/**
 * Dakbedekkingen met kleurstalen, zelfde patroon als de gevel: een bedekking is een rij gegevens, geen programma
 * (demo: kleuren benaderd, **prijzen verzonnen**, per m² geplaatst excl. btw; de minimale hellingen zijn richtwaarden).
 * `voor` zegt of ze op een plat of op een hellend dak past; `soort` is de structuur in de 3D en de tekening.
 */
export const dakCatalogus: Record<string, DakMateriaal> = {
  epdm: {
    label: 'EPDM (rubberfolie)', groep: 'Plat dak', soort: 'dak', voor: 'plat', eenheid: 'm²', prijs: 68, kost: 44, artikel: 'DAK-EPDM',
    uitleg: 'Eén rubberen vlies over het hele dak; glad en zwart.',
    kleuren: { zwart: { label: 'Zwart', hex: '#2e2e2e' } },
  },
  roofing: {
    label: 'Roofing (bitumen in banen)', groep: 'Plat dak', soort: 'roofing', voor: 'plat', eenheid: 'm²', prijs: 62, kost: 40, artikel: 'DAK-ROOF',
    uitleg: 'Twee lagen bitumen, de toplaag met leislag; je ziet de banen van een meter.',
    kleuren: { leigrijs: { label: 'Leigrijs', hex: '#5b5e60' }, zwart: { label: 'Zwart', hex: '#363738' } },
  },
  grind: {
    label: 'Grind op de dakdichting', groep: 'Plat dak', soort: 'grind', voor: 'plat', eenheid: 'm²', prijs: 84, kost: 55, artikel: 'DAK-GRIND',
    uitleg: 'Een laag rolgrind als ballast en bescherming tegen de zon.',
    kleuren: { grijs: { label: 'Grijs rolgrind', hex: '#a8a59e' }, beige: { label: 'Beige rolgrind', hex: '#bdb29c' } },
  },
  groendak: {
    label: 'Groendak (sedum)', groep: 'Plat dak', soort: 'groendak', voor: 'plat', eenheid: 'm²', prijs: 135, kost: 92, artikel: 'DAK-GROEN',
    uitleg: 'Vetplantjes op een dunne laag substraat: buffert regenwater en houdt het dak koel.',
    kleuren: { sedum: { label: 'Sedum gemengd', hex: '#6f8a4f' }, mos: { label: 'Mos en sedum', hex: '#84925d' } },
  },
  pannen: {
    label: 'Keramische dakpannen', groep: 'Pannen', soort: 'pannen', voor: 'hellend', eenheid: 'm²', prijs: 96, kost: 62, artikel: 'DAK-PAN', minHelling: 20,
    uitleg: 'Gebakken pannen op panlatten; de klassieke bedekking van een hellend dak.',
    kleuren: {
      rood: { label: 'Natuurrood', hex: '#a8553c' }, antraciet: { label: 'Antraciet mat', hex: '#3d3e40' }, bruin: { label: 'Bruin', hex: '#6d4b3b' },
      zwart: { label: 'Zwart verglaasd', hex: '#262729' }, rustiek: { label: 'Rustiek oranjerood', hex: '#b9693f' },
    },
  },
  leien: {
    label: 'Leien (natuurlei of vezelcement)', groep: 'Leien', soort: 'leien', voor: 'hellend', eenheid: 'm²', prijs: 128, kost: 86, artikel: 'DAK-LEI', minHelling: 25,
    uitleg: 'Kleine vlakke leien in halfsteens verband.',
    kleuren: { antraciet: { label: 'Antraciet', hex: '#3b3f45' }, blauwgrijs: { label: 'Blauwgrijs', hex: '#59636b' } },
  },
  zink: {
    label: 'Zink met staande naad', groep: 'Metaal', soort: 'zink', voor: 'hellend', eenheid: 'm²', prijs: 176, kost: 118, artikel: 'DAK-ZINK', minHelling: 5,
    uitleg: 'Zinken banen van nok tot goot, met een opstaande naad om de 43 cm; kan ook op een flauwe helling.',
    kleuren: { kwarts: { label: 'Kwartsgrijs', hex: '#8a8f92' }, antraciet: { label: 'Antraciet', hex: '#4a4d50' }, naturel: { label: 'Naturel', hex: '#a9adb0' } },
  },
};

/** Lichtkoepels en lichtstraten met vaste dagmaten (demo: **prijzen verzonnen**, per stuk geplaatst met opstand). */
export const daklichtCatalogus: Record<string, DakLichtType> = {
  koepel_60: { label: 'Lichtkoepel 60 × 60', groep: 'Lichtkoepels', vorm: 'koepel', b: 60, d: 60, prijs: 690, kost: 450, artikel: 'DAK-KOEPEL-060' },
  koepel_100: { label: 'Lichtkoepel 100 × 100', groep: 'Lichtkoepels', vorm: 'koepel', b: 100, d: 100, prijs: 980, kost: 640, artikel: 'DAK-KOEPEL-100' },
  koepel_120: { label: 'Lichtkoepel 120 × 120', groep: 'Lichtkoepels', vorm: 'koepel', b: 120, d: 120, prijs: 1240, kost: 810, artikel: 'DAK-KOEPEL-120' },
  koepel_100_150: { label: 'Lichtkoepel 100 × 150', groep: 'Lichtkoepels', vorm: 'koepel', b: 100, d: 150, prijs: 1380, kost: 900, artikel: 'DAK-KOEPEL-150' },
  lichtstraat_200: { label: 'Lichtstraat 100 × 200', groep: 'Lichtstraten', vorm: 'lichtstraat', b: 200, d: 100, prijs: 2450, kost: 1620, artikel: 'DAK-STRAAT-200' },
  lichtstraat_300: { label: 'Lichtstraat 100 × 300', groep: 'Lichtstraten', vorm: 'lichtstraat', b: 300, d: 100, prijs: 3350, kost: 2210, artikel: 'DAK-STRAAT-300' },
  // Platte dakramen (ronde 11b): vlak glas op een licht hellende opstand, met buitenzonwering naar keuze (een screen boven het glas).
  dakraam_080: { label: 'Plat dakraam 80 × 80', groep: 'Platte dakramen', vorm: 'dakraam', b: 80, d: 80, prijs: 1290, kost: 850, artikel: 'DAK-RAAM-080', zonwering: { label: 'Buitenzonwering (screen) met motor', prijs: 690, kost: 450, artikel: 'DAK-RAAM-ZON-080' } },
  dakraam_100: { label: 'Plat dakraam 100 × 100', groep: 'Platte dakramen', vorm: 'dakraam', b: 100, d: 100, prijs: 1590, kost: 1050, artikel: 'DAK-RAAM-100', zonwering: { label: 'Buitenzonwering (screen) met motor', prijs: 760, kost: 495, artikel: 'DAK-RAAM-ZON-100' } },
  dakraam_120: { label: 'Plat dakraam 120 × 120', groep: 'Platte dakramen', vorm: 'dakraam', b: 120, d: 120, prijs: 1890, kost: 1240, artikel: 'DAK-RAAM-120', zonwering: { label: 'Buitenzonwering (screen) met motor', prijs: 840, kost: 550, artikel: 'DAK-RAAM-ZON-120' } },
  dakraam_100_150: { label: 'Plat dakraam 100 × 150', groep: 'Platte dakramen', vorm: 'dakraam', b: 100, d: 150, prijs: 2090, kost: 1380, artikel: 'DAK-RAAM-150', zonwering: { label: 'Buitenzonwering (screen) met motor', prijs: 890, kost: 580, artikel: 'DAK-RAAM-ZON-150' } },
};

/** Gevelontwerp dat overeenkomt met de eenvoudige gevelkeuze (plan.gevel) van een ouder project. */
export function gevelOntwerpVan(plan: Plattegrond): GevelOntwerp {
  const k = plan.gevel.kleur.toLowerCase();
  if (k === '#77736d') return { standaard: { materiaal: 'gevelsteen', kleur: 'grijs', voeg: 'grijs' } };
  if (k === '#ece9e2') return { standaard: { materiaal: 'crepi', kleur: 'wit' } };
  if (k === '#b0764d') return { standaard: { materiaal: 'hout_liggend', kleur: 'ceder' } };
  return { standaard: { materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' } };
}

export const planCatalogus: PlanCatalogus = {
  vloeren: {
    tegel_grijs: { label: 'Keramische tegel 60 × 60 grijs', soort: 'tegel', kleur: '#b8b5ae' },
    tegel_wit: { label: 'Keramische tegel 60 × 60 wit', soort: 'tegel', kleur: '#e8e6e0' },
    parket_eik: { label: 'Parket eik naturel', soort: 'parket', kleur: '#c49a6c' },
    parket_donker: { label: 'Parket gerookte eik', soort: 'parket', kleur: '#86664a' },
    pvc_grijs: { label: 'PVC-vloer eik grijs', soort: 'parket', kleur: '#a8a299' },
    gietvloer: { label: 'Gietvloer beton', soort: 'gevel', kleur: '#a9aaa6' },
    tapijt: { label: 'Tapijt', soort: 'stof', kleur: '#9d9286' },
  },
  wanden: {
    wit: { label: 'Verf wit', soort: 'gevel', kleur: '#f2f1ec' },
    gebroken_wit: { label: 'Verf gebroken wit', soort: 'gevel', kleur: '#ebe5d8' },
    zachtgrijs: { label: 'Verf zachtgrijs', soort: 'gevel', kleur: '#d5d6d1' },
    salie: { label: 'Verf saliegroen', soort: 'gevel', kleur: '#b8c3ad' },
    terracotta: { label: 'Verf terracotta', soort: 'gevel', kleur: '#d39c7e' },
    blauwgrijs: { label: 'Verf blauwgrijs', soort: 'gevel', kleur: '#aab6bf' },
    tegels_wit: { label: 'Wandtegels wit 30 × 60', soort: 'tegel', kleur: '#efeee9' },
    tegels_groen: { label: 'Wandtegels zellige groen', soort: 'tegel', kleur: '#6f8f7a' },
  },
  binnendeuren: {
    schilder: { label: 'Schilderdeur wit', soort: 'kunststof', kleur: '#f3f2ee' },
    eik: { label: 'Deur fineer eik', soort: 'hout', kleur: '#b48a5a' },
    glas: { label: 'Glazen deur', soort: 'glas', kleur: '#c5d5da' },
    staal: { label: 'Stalen deur zwart', soort: 'metaal', kleur: '#2a2a2a' },
    schuif: { label: 'Schuifdeur in de wand', soort: 'kunststof', kleur: '#f3f2ee' },
  },
  meubels: {
    bank3: { label: 'Sofa 3-zit', vorm: 'bank', b: 230, d: 95, h: 85, kleur: '#6f7f86', prijs: 1890, groep: 'Zitten' },
    bank2: { label: 'Sofa 2-zit', vorm: 'bank', b: 180, d: 92, h: 85, kleur: '#b8ad9c', prijs: 1490, groep: 'Zitten' },
    fauteuil: { label: 'Fauteuil', vorm: 'fauteuil', b: 85, d: 85, h: 85, kleur: '#b07a54', prijs: 790, groep: 'Zitten' },
    salontafel: { label: 'Salontafel', vorm: 'tafel', b: 110, d: 60, h: 40, kleur: '#b48a5a', prijs: 420, groep: 'Zitten' },
    tv: { label: 'Tv-meubel', vorm: 'tv', b: 180, d: 45, h: 45, kleur: '#86664a', prijs: 690, groep: 'Zitten' },
    eettafel: { label: 'Eettafel 6 personen', vorm: 'tafel', b: 200, d: 95, h: 75, kleur: '#b48a5a', prijs: 1290, groep: 'Eten' },
    eettafel4: { label: 'Eettafel 4 personen', vorm: 'tafel', b: 140, d: 90, h: 75, kleur: '#b48a5a', prijs: 890, groep: 'Eten' },
    stoel: { label: 'Stoel', vorm: 'stoel', b: 45, d: 50, h: 85, kleur: '#2f2f2d', prijs: 189, groep: 'Eten' },
    keuken: { label: 'Keuken, rechte opstelling', vorm: 'keuken', b: 360, d: 62, h: 220, kleur: '#3f4b4f', prijs: 12500, groep: 'Keuken' },
    eiland: { label: 'Keukeneiland', vorm: 'eiland', b: 240, d: 100, h: 90, kleur: '#3f4b4f', prijs: 4800, groep: 'Keuken' },
    koelkast: { label: 'Koelkast (kolom)', vorm: 'koelkast', b: 60, d: 62, h: 215, kleur: '#3f4b4f', prijs: 1450, groep: 'Keuken' },
    bed2: { label: 'Bed 160 × 200', vorm: 'bed', b: 165, d: 215, h: 100, kleur: '#9aa3a8', prijs: 1690, groep: 'Slapen' },
    bed1: { label: 'Bed 90 × 200', vorm: 'bed', b: 95, d: 210, h: 90, kleur: '#c6b59b', prijs: 690, groep: 'Slapen' },
    nachtkast: { label: 'Nachtkastje', vorm: 'nachtkast', b: 45, d: 40, h: 50, kleur: '#b48a5a', prijs: 180, groep: 'Slapen' },
    kleerkast: { label: 'Kleerkast', vorm: 'kast', b: 200, d: 60, h: 220, kleur: '#f1f0ec', prijs: 1350, groep: 'Slapen' },
    dressoir: { label: 'Dressoir', vorm: 'kast', b: 200, d: 45, h: 80, kleur: '#86664a', prijs: 990, groep: 'Zitten' },
    bureau: { label: 'Bureau', vorm: 'tafel', b: 120, d: 60, h: 75, kleur: '#f1f0ec', prijs: 450, groep: 'Werken' },
    bad: { label: 'Ligbad', vorm: 'bad', b: 170, d: 75, h: 58, kleur: '#f4f4f1', prijs: 1150, groep: 'Badkamer' },
    douche: { label: 'Inloopdouche', vorm: 'douche', b: 120, d: 90, h: 210, kleur: '#f4f4f1', prijs: 1650, groep: 'Badkamer' },
    lavabo: { label: 'Badmeubel met lavabo', vorm: 'lavabo', b: 120, d: 50, h: 180, kleur: '#b48a5a', prijs: 1390, groep: 'Badkamer' },
    wc: { label: 'Hangtoilet', vorm: 'wc', b: 40, d: 55, h: 80, kleur: '#f4f4f1', prijs: 690, groep: 'Badkamer' },
    plant: { label: 'Plant', vorm: 'plant', b: 50, d: 50, h: 120, kleur: '#5f7f55', prijs: 85, groep: 'Decoratie' },
    tapijt: { label: 'Tapijt', vorm: 'tapijt', b: 240, d: 170, h: 1, kleur: '#b8ad9c', prijs: 390, groep: 'Decoratie' },
    trap: { label: 'Trap (recht, naar de verdieping)', vorm: 'trap', b: 100, d: 300, h: 300, kleur: '#b48a5a', prijs: 3900, groep: 'Trappen' },
  },
  gevels: gevelCatalogus,
  daken: dakCatalogus,
  daklichten: daklichtCatalogus,
  // Techniek voor de installateur (ronde 10b): de schermen tonen ze pas als je ze opzoekt. Een plan zonder toestellen
  // of leidingen verandert er niet door (tekening, 3D en controles kijken alleen met een optie of met techniek in het plan).
  techniek: techniekCatalogus,
};

/** Demoprijzen per eenheid: [verkoop, kost]. */
const PRIJZEN: Record<string, [number, number]> = {
  'vloer:tegel_grijs': [72, 46], 'vloer:tegel_wit': [78, 50], 'vloer:parket_eik': [96, 62], 'vloer:parket_donker': [108, 70],
  'vloer:pvc_grijs': [48, 29], 'vloer:gietvloer': [88, 56], 'vloer:tapijt': [38, 22],
  'wand:wit': [17, 9], 'wand:gebroken_wit': [18, 9.5], 'wand:zachtgrijs': [18, 9.5], 'wand:salie': [19, 10], 'wand:terracotta': [19, 10],
  'wand:blauwgrijs': [19, 10], 'wand:tegels_wit': [79, 48], 'wand:tegels_groen': [118, 74],
  'deur:schilder': [420, 260], 'deur:eik': [560, 350], 'deur:glas': [690, 430], 'deur:staal': [1450, 920], 'deur:schuif': [890, 560],
  doorgang: [180, 95], buitenmuur: [185, 120], binnenmuur: [68, 42],
  // Buitenmuur zonder gevelafwerking (als de gevel apart in de offerte staat).
  buitenmuur_kaal: [118, 76],
  // Dakrand op een plat dak, per lopende meter.
  dakrand: [58, 36],
};

export interface PlanRegelOpties {
  vloeren: boolean;
  wanden: boolean;
  binnendeuren: boolean;
  ruwbouw: boolean;
  inrichting: boolean;
  /** Gevelafwerking per materiaal (m², netto) en sokkel; alleen met een gevelontwerp. Ontbreekt = uit. */
  gevel?: boolean;
  /** Dak: bedekking (m²), dakrand (m) en daklichten (stuk); alleen met een dakkeuze in het plan. Ontbreekt = uit. */
  dak?: boolean;
}

/** Zet de plattegrond om naar offerteregels (vloeren, wandafwerking, binnendeuren, ruwbouw, inrichting). */
export function planNaarRegels(plan: Plattegrond, opties: PlanRegelOpties, cat: PlanCatalogus = planCatalogus): OfferteRegel[] {
  const regels: OfferteRegel[] = [];
  // Muren per verdieping (een muur hoort altijd bij één verdieping).
  const murenPerNiveau = verdiepingenVan(plan).map((_, n) => murenVan(niveauPlan(plan, n)));
  const muren: (Muur & { niveau: number })[] = murenPerNiveau.flatMap((ms, n) => ms.map((m) => ({ ...m, niveau: n })));
  const prijs = (sleutel: string) => PRIJZEN[sleutel] ?? [0, 0];
  const som = new Map<string, number>();
  const tel = (k: string, x: number) => som.set(k, (som.get(k) ?? 0) + x);
  for (const r of plan.ruimtes) {
    const m = ruimteMaten(plan, r, murenPerNiveau[niveauVan(r)]);
    tel(`vloer:${r.vloer}`, m.netto);
    tel(`wand:${r.wand}`, m.wand);
  }
  // Losse wanden (ronde 2d): gebouwde lengte × hoogte; binnen telt de afwerking van beide zijden bij de wanden.
  const losse = (plan.losseWanden ?? []).map((w) => {
    const p = niveauPlan(plan, niveauVan(w));
    const v = losseWandVlak(w, murenPerNiveau[niveauVan(w)] ?? murenVan(p), p.losseWanden);
    return { w, ruimte: losseWandRuimte(p, w), m2: (losseWandLengte(v) * losseWandHoogte(plan, w)) / 10000 };
  }).filter((x) => x.m2 > 0);
  for (const x of losse) if (x.ruimte) tel(`wand:${x.w.wand && cat.wanden[x.w.wand] ? x.w.wand : x.ruimte.wand}`, 2 * x.m2);
  const rond1 = (x: number) => Math.round(x * 10) / 10;
  if (opties.vloeren) {
    for (const [k, m2] of som) if (k.startsWith('vloer:') && m2 > 0) {
      const code = k.slice(6);
      // 7 % snijverlies op de vloer.
      regels.push({ code: k, groep: 'Vloeren', omschrijving: cat.vloeren[code]?.label ?? code, eenheid: 'm²', hoeveelheid: rond1(m2 * 1.07), eenheidsprijs: prijs(k)[0], kostprijs: prijs(k)[1] });
    }
  }
  if (opties.wanden) {
    for (const [k, m2] of som) if (k.startsWith('wand:') && m2 > 0) {
      const code = k.slice(5);
      regels.push({ code: k, groep: 'Wanden', omschrijving: cat.wanden[code]?.label ?? code, eenheid: 'm²', hoeveelheid: rond1(m2), eenheidsprijs: prijs(k)[0], kostprijs: prijs(k)[1] });
    }
  }
  if (opties.binnendeuren) {
    const deuren = new Map<string, number>();
    for (const o of plan.openingen) {
      if (o.soort === 'binnendeur') deuren.set(`deur:${o.deurtype ?? 'schilder'}`, (deuren.get(`deur:${o.deurtype ?? 'schilder'}`) ?? 0) + 1);
      if (o.soort === 'doorgang') deuren.set('doorgang', (deuren.get('doorgang') ?? 0) + 1);
    }
    for (const [k, aantal] of deuren) {
      const label = k === 'doorgang' ? 'Doorgang afwerken (pleister en hoekprofielen)' : `${cat.binnendeuren[k.slice(5)]?.label ?? k} met kader en klink`;
      regels.push({ code: k, groep: 'Binnendeuren', omschrijving: label, eenheid: 'stuk', hoeveelheid: aantal, eenheidsprijs: prijs(k)[0], kostprijs: prijs(k)[1] });
    }
  }
  // Gevelafwerking apart: dan zit de gevelsteen niet meer in de ruwbouw van de buitenmuur.
  const gevelApart = opties.gevel === true && !!plan.gevelOntwerp && !!cat.gevels;
  if (gevelApart) {
    const som = new Map<string, { m2: number; omschrijving: string; prijs: number; kost: number }>();
    const zet = (k: string, m2: number, omschrijving: string, prijs: number, kost: number) => {
      const x = som.get(k);
      if (x) x.m2 += m2; else som.set(k, { m2, omschrijving, prijs, kost });
    };
    const beschrijf = (keuze: { materiaal: string; kleur: string; voeg?: string }) => {
      const mat = cat.gevels![keuze.materiaal];
      if (!mat) return undefined;
      const kleur = mat.kleuren[keuze.kleur]?.label ?? keuze.kleur;
      const voeg = mat.voegen ? mat.voegen[keuze.voeg ?? ''] ?? Object.values(mat.voegen)[0] : undefined;
      return { mat, tekst: `${mat.label}, ${kleur.toLowerCase()}${voeg ? `, voeg ${voeg.label.toLowerCase()}` : ''}` };
    };
    const sokkel = plan.gevelOntwerp!.sokkel;
    for (const v of gevelOppervlaktes(plan)) {
      const b = v.keuze ? beschrijf(v.keuze) : undefined;
      if (b && v.netto > 0) zet(`gevel:${v.keuze!.materiaal}:${v.keuze!.kleur}:${v.keuze!.voeg ?? ''}`, v.netto, b.tekst, b.mat.prijs, b.mat.kost);
      const bs = sokkel ? beschrijf(sokkel) : undefined;
      if (sokkel && bs && v.sokkel > 0) zet(`sokkel:${sokkel.materiaal}:${sokkel.kleur}`, v.sokkel, `Sokkel ${sokkel.hoogte} cm: ${bs.tekst}`, bs.mat.prijs, bs.mat.kost);
    }
    // Een losse muur buiten (tuinmuur) in gevelmateriaal: beide zijden, een eigen regel per materiaal.
    for (const x of losse) {
      if (x.ruimte) continue;
      const keuze = x.w.gevel ?? plan.gevelOntwerp!.standaard, b = beschrijf(keuze);
      if (b) zet(`gevel:losse:${keuze.materiaal}:${keuze.kleur}:${keuze.voeg ?? ''}`, 2 * x.m2, `Losse muur buiten (tuinmuur), beide zijden: ${b.tekst}`, b.mat.prijs, b.mat.kost);
    }
    for (const [k, x] of som) {
      regels.push({ code: k, groep: 'Gevel', omschrijving: k.startsWith('gevel:losse:') ? x.omschrijving : `${x.omschrijving} (netto, zonder ramen en deuren)`, eenheid: 'm²', hoeveelheid: rond1(x.m2), eenheidsprijs: x.prijs, kostprijs: x.kost });
    }
  }
  // Dak: alleen de hoeveelheden uit de dakopbouw (m² bedekking, lopende meter dakrand, aantal daklichten).
  const dak = opties.dak === true ? dakOpbouw(plan) : undefined;
  if (dak) {
    const bedekking = (soort: 'hellend' | 'plat', b: DakBedekking, m2: number, wat: string) => {
      if (m2 <= 0) return;
      const mat = cat.daken?.[b.materiaal];
      const kleur = mat?.kleuren[b.kleur]?.label ?? b.kleur;
      regels.push({ code: `dak:${soort}:${b.materiaal}:${b.kleur}`, groep: 'Dak', omschrijving: `${mat?.label ?? b.materiaal}, ${kleur.toLowerCase()} (${wat})`, eenheid: 'm²', hoeveelheid: rond1(m2), eenheidsprijs: mat?.prijs ?? 0, kostprijs: mat?.kost ?? 0 });
    };
    if (dak.hellend) bedekking('hellend', dak.keuze.bedekking, dak.m2Hellend, `${dak.hellend.vorm === 'zadel' ? 'zadeldak' : 'lessenaarsdak'} ${dak.hellend.helling}°, langs de helling gemeten, met ${dak.hellend.oversteek} cm oversteek`);
    bedekking('plat', dak.platBedekking, dak.m2Plat, 'plat dak, op de as van de muren, zonder de openingen van de daklichten');
    if (dak.mDakrand > 0) regels.push({ code: 'dakrand', groep: 'Dak', omschrijving: 'Dakrand van het platte dak (opstand met muurkap)', eenheid: 'm', hoeveelheid: rond1(dak.mDakrand), eenheidsprijs: prijs('dakrand')[0], kostprijs: prijs('dakrand')[1] });
    const aantal = new Map<string, number>();
    for (const l of dak.daklichten) if (!l.reden) aantal.set(l.licht.type, (aantal.get(l.licht.type) ?? 0) + 1);
    for (const [type, n] of aantal) {
      const t = cat.daklichten?.[type];
      regels.push({ code: `daklicht:${type}`, groep: 'Dak', omschrijving: `${t?.label ?? 'Lichtkoepel'}, met opstand`, eenheid: 'stuk', hoeveelheid: n, eenheidsprijs: t?.prijs ?? 0, kostprijs: t?.kost ?? 0 });
    }
    // Buitenzonwering op platte dakramen (ronde 11b): per type een regel, alleen als het type zonwering kent.
    const zon = new Map<string, number>();
    for (const l of dak.daklichten) if (!l.reden && l.licht.zonwering === 'screen' && cat.daklichten?.[l.licht.type]?.zonwering) zon.set(l.licht.type, (zon.get(l.licht.type) ?? 0) + 1);
    for (const [type, n] of zon) {
      const t = cat.daklichten![type]!, z = t.zonwering!;
      regels.push({ code: `daklicht_zon:${type}`, groep: 'Dak', omschrijving: `${z.label} op ${t.label.toLowerCase()}`, eenheid: 'stuk', hoeveelheid: n, eenheidsprijs: z.prijs, kostprijs: z.kost });
    }
  }
  if (opties.ruwbouw) {
    // Onder een hellend dak hoort ook de topgevel (of de hoge gevel van een lessenaar) bij de buitenmuur.
    const topgevel = gevelOppervlaktes(plan).reduce((t, v) => t + (v.topgevel ?? 0), 0);
    for (const soort of ['buiten', 'binnen'] as const) {
      const lengte = muren.filter((m) => m.soort === soort).reduce((t, m) => t + (m.tot - m.van), 0) / 100;
      const open = plan.openingen.filter((o) => muren.find((m) => m.niveau === niveauVan(o) && m.soort === soort && m.as === o.as && Math.abs(m.lijn - o.lijn) < 0.5 && m.van <= o.midden && m.tot >= o.midden))
        .reduce((t, o) => t + (o.breedte * o.hoogte) / 10000, 0);
      const m2 = rond1(lengte * (plan.muurhoogte / 100) - open + (soort === 'buiten' ? topgevel : 0));
      const k = soort === 'buiten' && gevelApart ? 'buitenmuur_kaal' : `${soort}muur`;
      if (m2 > 0) regels.push({
        code: k, groep: 'Ruwbouw',
        omschrijving: soort === 'binnen' ? `Binnenmuur ${plan.binnenmuur} cm (snelbouw, bepleisterd)`
          : gevelApart ? `Buitenmuur ${plan.buitenmuur} cm (snelbouw binnenblad, spouwisolatie; gevelafwerking apart)` : `Buitenmuur ${plan.buitenmuur} cm (snelbouw, isolatie, gevelsteen)`,
        eenheid: 'm²', hoeveelheid: m2, eenheidsprijs: prijs(k)[0], kostprijs: prijs(k)[1],
      });
    }
    // Losse wanden (ronde 2d): één zijde, per plaats en dikte. De richtprijs is die van een binnenmuur (demo).
    const perSoort = new Map<string, { m2: number; binnen: boolean; dikte: number }>();
    for (const x of losse) {
      const k = `losse_wand:${x.ruimte ? 'binnen' : 'buiten'}:${x.w.dikte}`;
      const nu = perSoort.get(k) ?? { m2: 0, binnen: !!x.ruimte, dikte: x.w.dikte };
      nu.m2 += x.m2;
      perSoort.set(k, nu);
    }
    for (const [k, x] of perSoort) regels.push({
      code: k, groep: 'Ruwbouw',
      omschrijving: x.binnen ? `Losse wand ${x.dikte} cm binnen (snelbouw, bepleisterd; deelt geen ruimte)` : `Losse muur ${x.dikte} cm buiten (tuinmuur, metselwerk, zonder fundering)`,
      eenheid: 'm²', hoeveelheid: rond1(x.m2), eenheidsprijs: prijs('binnenmuur')[0], kostprijs: prijs('binnenmuur')[1],
    });
  }
  if (opties.inrichting) {
    const aantal = new Map<string, number>();
    for (const m of plan.meubels) aantal.set(m.type, (aantal.get(m.type) ?? 0) + 1);
    for (const [type, n] of aantal) {
      const t = cat.meubels[type];
      if (!t?.prijs) continue;
      regels.push({ code: `meubel:${type}`, groep: 'Inrichting (richtprijs)', omschrijving: t.label, eenheid: 'stuk', hoeveelheid: n, eenheidsprijs: t.prijs, kostprijs: Math.round(t.prijs * 0.62) });
    }
  }
  return regels;
}
