/**
 * Kant-en-klare indelingen voor ramen en deuren: de snelle weg voor de verkoper. Elke indeling is een set
 * keuzes van het raammodel (soort, vakken, openingen, bovenlicht …) met een gangbare maat. Het scherm toont
 * ze als tegels met een tekening; de fijne instelling per vak blijft mogelijk in het formulier.
 */
import type { Keuzes } from '../src/index.js';
import { berekenRaam, raamdeur } from './raam.js';

export interface Indeling {
  code: string;
  label: string;
  groep: string;
  /** Wat deze indeling anders zet dan de basis (zie INDELING_BASIS). */
  keuzes: Keuzes;
  /** Gangbare maat (mm), gebruikt als de huidige maat niet bij de indeling past. */
  breedte: number;
  hoogte: number;
}

/** Alle kenmerken die samen de indeling bepalen, met hun neutrale waarde: elke tegel zet ze allemaal. */
export const INDELING_BASIS: Keuzes = {
  type: 'raam', vakken: 'v1', vak1: 'draaikip_l', vak2: 'vast', vak3: 'draaikip_r', vak4: 'vast', stolp: false,
  vakb1: 0, vakb2: 0, vakb3: 0, vakb4: 0, zijlicht: 'geen', zijlicht_b: 450, schuif_richting: 'links', delen: 'd3', vouw_richting: 'links',
  bovenlicht: false, bovenlicht_h: 400, bovenlicht_open: 'vast', bovenlicht_over: 'alle', onder: 'geen', onder_h: 600, onder_over: 'alle', uitzicht: 'standaard',
};

const steellook: Keuzes = { uitzicht: 'steellook', roeden: 'geen', profiel: 'alu', kleur_buiten: 'zwart', kleur_binnen: 'zelfde', lak: 'structuur' };

export const INDELINGEN: Indeling[] = [
  { code: 'enkel_dk', groep: 'Ramen', label: 'Enkel draai-kip', keuzes: { vak1: 'draaikip_l' }, breedte: 1000, hoogte: 1400 },
  { code: 'enkel_vast', groep: 'Ramen', label: 'Vast raam', keuzes: { vak1: 'vast' }, breedte: 1200, hoogte: 1400 },
  { code: 'kip', groep: 'Ramen', label: 'Kipraam', keuzes: { vak1: 'kip' }, breedte: 900, hoogte: 700 },
  { code: 'dubbel_stolp', groep: 'Ramen', label: 'Dubbel met stolp', keuzes: { vakken: 'v2', vak1: 'draai_l', vak2: 'draaikip_r', stolp: true }, breedte: 1600, hoogte: 1400 },
  { code: 'vast_dk', groep: 'Ramen', label: 'Vast + draai-kip', keuzes: { vakken: 'v2', vak1: 'vast', vak2: 'draaikip_r' }, breedte: 1800, hoogte: 1400 },
  { code: 'driedelig', groep: 'Ramen', label: 'Driedelig', keuzes: { vakken: 'v3', vak1: 'draaikip_l', vak2: 'vast', vak3: 'draaikip_r' }, breedte: 2400, hoogte: 1400 },
  { code: 'vierdelig', groep: 'Ramen', label: 'Vierdelig', keuzes: { vakken: 'v4', vak1: 'draaikip_l', vak2: 'vast', vak3: 'vast', vak4: 'draaikip_r' }, breedte: 3200, hoogte: 1400 },
  { code: 'bovenlicht', groep: 'Ramen', label: 'Dubbel met bovenlicht', keuzes: { vakken: 'v2', vak1: 'draaikip_l', vak2: 'draaikip_r', bovenlicht: true }, breedte: 1600, hoogte: 1900 },
  { code: 'boven_elkaar', groep: 'Ramen', label: 'Twee boven elkaar', keuzes: { vak1: 'draaikip_l', onder: 'glas' }, breedte: 1000, hoogte: 1700 },
  { code: 'onderpaneel', groep: 'Ramen', label: 'Met onderpaneel', keuzes: { vak1: 'draaikip_l', onder: 'paneel' }, breedte: 1000, hoogte: 1700 },

  { code: 'terrasdeur', groep: 'Deuren', label: 'Terrasdeur', keuzes: { type: 'terrasdeur', vak1: 'draai_l' }, breedte: 900, hoogte: 2300 },
  { code: 'dubbele_deur', groep: 'Deuren', label: 'Dubbele deur (stolp)', keuzes: { type: 'terrasdeur', vakken: 'v2', vak1: 'draai_l', vak2: 'draai_r', stolp: true }, breedte: 1800, hoogte: 2300 },
  { code: 'deur_vast', groep: 'Deuren', label: 'Deur + vast glas', keuzes: { type: 'terrasdeur', vakken: 'v2', vak1: 'draai_l', vak2: 'vast', vakb1: 950 }, breedte: 2200, hoogte: 2300 },
  { code: 'voordeur', groep: 'Deuren', label: 'Voordeur', keuzes: { type: 'voordeur' }, breedte: 1000, hoogte: 2300 },
  { code: 'deur_bovenlicht', groep: 'Deuren', label: 'Deur met bovenlicht', keuzes: { type: 'voordeur', bovenlicht: true }, breedte: 1000, hoogte: 2700 },
  { code: 'deur_zijlicht', groep: 'Deuren', label: 'Deur met zijlicht', keuzes: { type: 'voordeur', zijlicht: 'rechts' }, breedte: 1500, hoogte: 2300 },
  { code: 'deur_zij_boven', groep: 'Deuren', label: 'Deur met zij- en bovenlicht', keuzes: { type: 'voordeur', zijlicht: 'rechts', bovenlicht: true }, breedte: 1500, hoogte: 2700 },

  { code: 'schuif2', groep: 'Grote glaspartijen', label: 'Schuifraam', keuzes: { type: 'schuif' }, breedte: 3000, hoogte: 2300 },
  { code: 'hefschuif2', groep: 'Grote glaspartijen', label: 'Hef-schuif 2-delig', keuzes: { type: 'hefschuif', delen: 'd2' }, breedte: 3500, hoogte: 2400 },
  { code: 'hefschuif3', groep: 'Grote glaspartijen', label: 'Hef-schuif 3-delig', keuzes: { type: 'hefschuif', delen: 'd3', schuif_richting: 'beide' }, breedte: 5000, hoogte: 2400 },
  { code: 'hefschuif4', groep: 'Grote glaspartijen', label: 'Hef-schuif 4-delig', keuzes: { type: 'hefschuif', delen: 'd4', schuif_richting: 'beide' }, breedte: 6500, hoogte: 2400 },
  { code: 'vouwwand3', groep: 'Grote glaspartijen', label: 'Vouwwand 3-delig', keuzes: { type: 'vouwwand', delen: 'd3' }, breedte: 2700, hoogte: 2300 },
  { code: 'vouwwand4', groep: 'Grote glaspartijen', label: 'Vouwwand 4-delig', keuzes: { type: 'vouwwand', delen: 'd4' }, breedte: 3600, hoogte: 2300 },
  { code: 'vouwwand5', groep: 'Grote glaspartijen', label: 'Vouwwand 5-delig', keuzes: { type: 'vouwwand', delen: 'd5' }, breedte: 4500, hoogte: 2300 },
  { code: 'vouwwand6', groep: 'Grote glaspartijen', label: 'Vouwwand 6-delig', keuzes: { type: 'vouwwand', delen: 'd6' }, breedte: 5400, hoogte: 2300 },
  { code: 'glaswand', groep: 'Grote glaspartijen', label: 'Vaste glaswand', keuzes: { type: 'glaswand', delen: 'd3' }, breedte: 3600, hoogte: 2500 },

  { code: 'steel_raam', groep: 'Steellook', label: 'Steellook raam', keuzes: { vak1: 'vast', ...steellook }, breedte: 1200, hoogte: 1500 },
  { code: 'steel_deur', groep: 'Steellook', label: 'Steellook dubbele deur', keuzes: { type: 'terrasdeur', vakken: 'v2', vak1: 'draai_l', vak2: 'draai_r', stolp: true, ...steellook }, breedte: 1800, hoogte: 2300 },
  { code: 'steel_wand', groep: 'Steellook', label: 'Steellook glaswand', keuzes: { type: 'glaswand', delen: 'd3', ...steellook }, breedte: 3000, hoogte: 2500 },
];

/** Meldingen die zeggen dat de maat of de zwaarte niet bij de indeling past. */
const MAATFOUT = /^(breedte|hoogte)\.(min|max)$|^vak\d_(breed|hoog)$|^(deel_breed|deel_hoog|deel_zwaar|vak_smal|deur_breed|bovenlicht_klein|zwaar|schuif_zwaar)$/;

const veilig: Record<string, string> = { dubbel: 'dubbel_gelaagd', triple: 'triple_gelaagd' };

/**
 * Past een indeling toe op bestaande keuzes en houdt het resultaat bruikbaar:
 * - de maat blijft als ze bij de nieuwe indeling past, anders de gangbare maat van de indeling;
 * - tot op de vloer wordt het glas gelaagd; een keuze die bij de nieuwe soort niet bestaat, valt terug op de standaard;
 * - haalt de tussenstijl de statiek niet, dan aluminium in plaats van PVC en zo nodig een versterkte stijl;
 * - wordt een screen breder dan 5 m, dan komt er een screen bij (tot drie naast elkaar); wordt het smaller dan 50 cm, een minder.
 * Kleur, glas, zonwering en plaatsing blijven verder wat ze waren.
 */
export function pasIndelingToe(keuzes: Keuzes, indeling: Indeling): Keuzes {
  const k: Keuzes = { ...keuzes, ...INDELING_BASIS, ...indeling.keuzes };
  // De versterking van de tussenstijl hoort bij de vorige indeling: opnieuw beginnen bij standaard (hieronder zwaarder als het moet).
  if (k.tussenstijl !== undefined) k.tussenstijl = 'standaard';
  const fouten = (x: Keuzes) => berekenRaam(x).meldingen.filter((m) => m.ernst === 'fout');
  // Maat: eerst de huidige, dan alleen de breedte of de hoogte van de indeling, dan allebei. Wordt een raam een deur of
  // omgekeerd (tot op de vloer of niet), dan geldt de hoogte van de indeling: een deurhoogte is geen raamhoogte.
  const b0 = typeof keuzes.breedte === 'number' ? keuzes.breedte : indeling.breedte, h0 = typeof keuzes.hoogte === 'number' ? keuzes.hoogte : indeling.hoogte;
  // Een maat die ver van de gangbare maat ligt (een raam van 1,4 m dat een glaswand in drie delen wordt) blijft ook niet.
  const totVloer = (type: unknown) => type !== undefined && type !== 'raam';
  const dichtbij = (nu: number, gangbaar: number) => Math.abs(nu - gangbaar) <= gangbaar * 0.35;
  const b1 = dichtbij(b0, indeling.breedte) ? b0 : indeling.breedte;
  const h1 = totVloer(keuzes.type) === totVloer(k.type) && dichtbij(h0, indeling.hoogte) ? h0 : indeling.hoogte;
  const maten: [number, number][] = [[b1, h1], [indeling.breedte, h1], [b1, indeling.hoogte], [indeling.breedte, indeling.hoogte]];
  for (const [b, h] of maten) {
    k.breedte = b;
    k.hoogte = h;
    if (!fouten(k).some((m) => MAATFOUT.test(m.code))) break;
  }
  // Van een deur (tot op de vloer) naar een raam: een gewone borstwering, niet 0.
  if (k.type === 'raam' && totVloer(keuzes.type) && !(typeof k.borstwering === 'number' && k.borstwering >= 300)) k.borstwering = 900;
  for (let ronde = 0; ronde < 4; ronde++) {
    const f = fouten(k);
    if (!f.length) break;
    let gewijzigd = false;
    for (const m of f) {
      const kenmerk = m.code.endsWith('.niet_beschikbaar') || m.code.endsWith('.onbekend') ? m.kenmerk : undefined;
      const def = kenmerk ? raamdeur.kenmerken.find((x) => x.code === kenmerk) : undefined;
      if (def && k[def.code] !== def.standaard) { k[def.code] = def.standaard; gewijzigd = true; }
      if ((m.code === 'veiligheidsglas' || m.code === 'rc2_glas') && typeof k.glas === 'string' && veilig[k.glas]) { k.glas = veilig[k.glas]!; gewijzigd = true; }
      // Een screen breder dan 5 m bestaat niet in één stuk: een screen meer (tot drie naast elkaar, gelijk verdeeld); pas
      // als ook drie te breed zijn, vervalt de zonwering. Een screen smaller dan 50 cm: een screen minder.
      if (m.code === 'screen_breed' && k.zonwering !== 'geen') {
        const nu = k.screens === 's2' ? 2 : k.screens === 's3' ? 3 : 1;
        if (nu < 3) { k.screens = `s${nu + 1}`; k.screen_verdeling = 'gelijk'; } else k.zonwering = 'geen';
        gewijzigd = true;
      }
      if (m.code === 'screen_smal' && (k.screens === 's2' || k.screens === 's3')) { k.screens = k.screens === 's3' ? 's2' : 's1'; gewijzigd = true; }
      if (m.code === 'statiek') {
        if (k.profiel === 'pvc') { k.profiel = 'alu'; gewijzigd = true; }
        else if (k.tussenstijl !== 'versterkt' && k.tussenstijl !== 'koppel') { k.tussenstijl = 'versterkt'; gewijzigd = true; }
        else if (k.tussenstijl === 'versterkt') { k.tussenstijl = 'koppel'; gewijzigd = true; }
      }
    }
    if (!gewijzigd) break;
  }
  return k;
}

/** Maten binnen de indeling (hoogte van het bovenlicht …): die mag je bijstellen zonder dat het een andere indeling wordt. */
const VRIJE_MATEN = new Set(['bovenlicht_h', 'onder_h', 'zijlicht_b']);

/** De indeling die bij deze keuzes hoort (alle zichtbare kenmerken van de indeling gelijk), of undefined bij een eigen indeling. */
export function indelingVan(keuzes: Keuzes): Indeling | undefined {
  const zichtbaar = new Set(berekenRaam(keuzes).kenmerken.filter((x) => x.zichtbaar).map((x) => x.code));
  const waarde = (code: string) => keuzes[code] ?? raamdeur.kenmerken.find((x) => x.code === code)?.standaard;
  return INDELINGEN.find((i) => {
    const doel: Keuzes = { ...INDELING_BASIS, ...i.keuzes };
    return Object.keys(INDELING_BASIS).every((code) => VRIJE_MATEN.has(code) || (code !== 'type' && !zichtbaar.has(code)) || waarde(code) === doel[code]);
  });
}
