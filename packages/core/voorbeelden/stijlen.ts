/**
 * Stijlen: een set keuzes die in één tik gevel, kleur van het schrijnwerk, dak, vloer en binnenkleur zet.
 * Gegevens, zoals `gevelCatalogus`: een aannemer kan later zijn eigen stijlen vastleggen (zijn typische werk), zonder
 * programma. Alle codes verwijzen naar de bestaande catalogi: gevels en daken (`inrichting.ts`), vloeren en wanden
 * (`planCatalogus`), profielen en RAL-kleuren van het raam (`raam.ts`), en de keuzes van het model AANBOUW.
 * De stijlen hieronder zijn voorbeelden, door geen aannemer nagelezen.
 */
import { dakOpbouw, verfGevel, type DakKeuze, type GevelKeuze, type Keuzes, type Plattegrond } from '../src/index.js';
import { berekenRaam } from './raam.js';

export interface Stijl {
  label: string;
  /** Eén zin voor de verkoper: waar deze stijl voor staat. */
  uitleg: string;
  /** Gevel van de hele woning, en eventueel een plint onderaan het gelijkvloers. */
  gevel: GevelKeuze;
  sokkel?: GevelKeuze & { hoogte: number };
  /** Ander materiaal op de verdiepingen (bv. hout boven baksteen); leeg = overal de gevel. */
  verdieping?: GevelKeuze;
  /** Schrijnwerk (ramen en deuren): profiel en RAL-kleur buiten en binnen (codes uit `raam.ts`). */
  schrijnwerk: { profiel: string; kleur_buiten: string; kleur_binnen: string };
  /** Kleur van een garagepoort (code uit de RAL-waaier). */
  poort: string;
  /** Het dak: vorm, helling, bedekking (en de bedekking van platte delen naast een hellend dak). */
  dak: DakKeuze;
  /** Vloer en wandkleur van de droge ruimtes (codes uit `planCatalogus`); badkamer en wc houden hun tegels. */
  vloer: string;
  wand: string;
  /** Dezelfde stijl voor het model AANBOUW (kleur van de profielen, gevel van de zijmuren, bekleding, dak). */
  aanbouw: Keuzes;
}

/** De ingebouwde stijlen. Een nieuwe stijl = een nieuwe rij (en het beeld in de snelstart tekent zichzelf). */
export const stijlCatalogus: Record<string, Stijl> = {
  klassiek: {
    label: 'Klassiek',
    uitleg: 'Rode handvormsteen, witte ramen, zadeldak met rode pannen.',
    gevel: { materiaal: 'gevelsteen', kleur: 'rood_bruin', voeg: 'grijs' },
    sokkel: { materiaal: 'natuursteen', kleur: 'blauwgrijs', hoogte: 30 },
    schrijnwerk: { profiel: 'pvc', kleur_buiten: 'wit', kleur_binnen: 'zelfde' },
    poort: 'wit',
    dak: { vorm: 'zadel', helling: 40, richting: 'onder', oversteek: 30, bedekking: { materiaal: 'pannen', kleur: 'rood' }, plat: { materiaal: 'epdm', kleur: 'zwart' } },
    vloer: 'parket_eik',
    wand: 'gebroken_wit',
    aanbouw: { kleur: 'ral9010', gevel: 'baksteen_rood', bekleding: 'zelfde', dak: 'koepel' },
  },
  modern: {
    label: 'Modern wit',
    uitleg: 'Witte pleister, antraciet aluminium, plat dak met grind.',
    gevel: { materiaal: 'crepi', kleur: 'wit' },
    sokkel: { materiaal: 'natuursteen', kleur: 'blauwgrijs', hoogte: 30 },
    schrijnwerk: { profiel: 'alu_hi', kleur_buiten: 'antraciet', kleur_binnen: 'wit' },
    poort: 'antraciet',
    dak: { vorm: 'plat', helling: 35, richting: 'onder', oversteek: 0, bedekking: { materiaal: 'grind', kleur: 'grijs' } },
    vloer: 'tegel_grijs',
    wand: 'wit',
    aanbouw: { kleur: 'ral7016', gevel: 'crepi_wit', bekleding: 'alu', dak: 'koepel' },
  },
  hout: {
    label: 'Hout en zwart',
    uitleg: 'Antraciet steen beneden, houten gevel boven, zwarte ramen, zinken lessenaarsdak.',
    gevel: { materiaal: 'gevelsteen', kleur: 'antraciet', voeg: 'antraciet' },
    verdieping: { materiaal: 'hout_staand', kleur: 'naturel' },
    schrijnwerk: { profiel: 'alu_hi', kleur_buiten: 'zwart', kleur_binnen: 'zwart' },
    poort: 'zwart',
    dak: { vorm: 'lessenaar', helling: 12, richting: 'boven', oversteek: 20, bedekking: { materiaal: 'zink', kleur: 'antraciet' }, plat: { materiaal: 'epdm', kleur: 'zwart' } },
    vloer: 'parket_donker',
    wand: 'zachtgrijs',
    aanbouw: { kleur: 'ral9005', gevel: 'baksteen_grijs', bekleding: 'thermowood', dak: 'koepel' },
  },
  landelijk: {
    label: 'Landelijk',
    uitleg: 'Wit-grijze steen, grijze ramen, leien dak.',
    gevel: { materiaal: 'gevelsteen', kleur: 'wit', voeg: 'wit' },
    sokkel: { materiaal: 'natuursteen', kleur: 'gezoet', hoogte: 40 },
    schrijnwerk: { profiel: 'alu', kleur_buiten: 'ral7022', kleur_binnen: 'wit' },
    poort: 'ral7022',
    dak: { vorm: 'zadel', helling: 45, richting: 'onder', oversteek: 25, bedekking: { materiaal: 'leien', kleur: 'antraciet' }, plat: { materiaal: 'roofing', kleur: 'leigrijs' } },
    vloer: 'parket_eik',
    wand: 'wit',
    aanbouw: { kleur: 'ral7016', gevel: 'baksteen_grijs', bekleding: 'zelfde', dak: 'lichtstraat' },
  },
};

/**
 * Zet een stijl op een plattegrond (een kopie; het origineel blijft ongewijzigd): de gevel van de hele woning (eigen
 * vlakken vervallen), het dak, en vloer en wandkleur van de droge ruimtes. Lichtkoepels die met het nieuwe dak niet meer
 * kunnen (bv. op een hellend dak), vallen weg; de rest blijft.
 */
export function pasStijlToe(plan: Plattegrond, stijl: Stijl): Plattegrond {
  const p = structuredClone(plan);
  p.gevelOntwerp = { standaard: { ...stijl.gevel }, ...(stijl.sokkel ? { sokkel: { ...stijl.sokkel } } : {}) };
  const niveaus = Math.max(1, p.verdiepingen?.length ?? 1);
  if (stijl.verdieping) for (let n = 1; n < niveaus; n++) verfGevel(p, stijl.verdieping, 'verdieping', { niveau: n });
  p.dak = structuredClone(stijl.dak);
  const opbouw = dakOpbouw(p);
  const weg = new Set(opbouw?.daklichten.filter((l) => l.reden).map((l) => l.licht.id));
  if (p.daklichten) p.daklichten = p.daklichten.filter((l) => !weg.has(l.id));
  for (const r of p.ruimtes) {
    if (r.type === 'badkamer' || r.type === 'wc') continue;
    r.vloer = r.type === 'garage' || r.type === 'berging' ? r.vloer : stijl.vloer;
    r.wand = stijl.wand;
  }
  return p;
}

/** Schuivende en vouwende delen blijven in aluminium: in PVC of hout haalt een grote partij de statiek niet. */
const GROOT = new Set(['schuif', 'hefschuif', 'vouwwand', 'glaswand']);

/**
 * De keuzes van een raam of deur in een stijl: profiel en kleuren. Wordt de positie daardoor ongeldig (statiek, maat),
 * dan blijft het profiel dat ze had en verandert alleen de kleur; lukt ook dat niet, dan blijft alles zoals het was.
 */
export function raamInStijl(keuzes: Keuzes, stijl: Stijl): Keuzes {
  const s = stijl.schrijnwerk;
  const profiel = GROOT.has(String(keuzes.type)) && !s.profiel.startsWith('alu') ? 'alu_hi' : s.profiel;
  const fout = (k: Keuzes) => berekenRaam(k).meldingen.some((m) => m.ernst === 'fout');
  for (const k of [
    { ...keuzes, profiel, kleur_buiten: s.kleur_buiten, kleur_binnen: s.kleur_binnen },
    { ...keuzes, kleur_buiten: s.kleur_buiten, kleur_binnen: s.kleur_binnen },
  ]) if (!fout(k)) return k;
  return keuzes;
}
