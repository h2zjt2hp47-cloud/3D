/**
 * 3D-bestanden uit Blender bij de modellen van de collectie (zie scripts/blender/LEESMIJ.md en docs/echte-3d-modellen.md).
 *
 * Een bestand vervangt in de 3D-weergave de bouwstenen van de motor zolang het ontwerp is wat het bestand toont; prijs,
 * tekeningen en offerte blijven uit de bouwstenen komen. Alle bestanden zijn BENADERINGEN: ze vertrekken van de opbouw
 * in de configurator (of, bij Sullivan, van een eigen meting op de foto's) en zijn afgewerkt naar de productfoto's.
 * Geen bestanden van de fabrikant.
 */
import { gekozenOpties, type Echt3D, type ModelDefinitie } from '../src/index.js';
import { zetelCatalogus } from './vrij-ontwerp.js';

interface Bestand {
  /** Naam van het GLB-bestand in packages/demo-web/modellen3d (zonder .glb). */
  bestand: string;
  /** Hoogste punt van het bestand in cm (gemeten in het bestand zelf: de test bewaakt het). */
  h: number;
  /** Met de hand gemeten op de foto's (Sullivan), in plaats van vertrokken van de opbouw van de motor. */
  hand?: true;
  /** Losse delen die op de fauteuil mogen liggen en die de weergave zelf tekent (zie Echt3D.los). */
  los?: string[];
}

/**
 * Per modelcode het bestand. Wie hier niet staat, houdt de bouwstenen (zie docs/echte-3d-modellen.md waarom):
 * Quin, Tumble en Karl (het bestand was niet beter dan de bouwstenen), Pebble (de zachte vorm is goedgekeurd) en de
 * Amusette fauteuil (drie elementen, hoekig: de bouwstenen volstaan).
 */
export const BLENDER_BESTANDEN: Record<string, Bestand> = {
  sullivan: { bestand: 'sullivan_blender', h: 93, hand: true },
  manon: { bestand: 'manon', h: 75 },
  ross: { bestand: 'ross', h: 78 },
  fraser: { bestand: 'fraser', h: 70 },
  milton: { bestand: 'milton', h: 72 },
  'mabel-1': { bestand: 'mabel-1', h: 76 },
  satie: { bestand: 'satie', h: 82.1 },
  'mabel-2': { bestand: 'mabel-2', h: 76 },
  'mabel-meridienne': { bestand: 'mabel-meridienne', h: 76, los: ['sierkussen'] },
};

/** Keuzes die de vorm bepalen: het bestand toont alleen de keuze van het model zelf; een andere geeft de bouwstenen. */
const VORMKEUZES = ['poten', 'zitting', 'rug', 'nekrol', 'naad', 'kuipvorm'];

/** De beschrijving van het 3D-bestand bij een model, of undefined als het er geen heeft. */
export function bestand3DVan(m: Pick<ModelDefinitie, 'code' | 'naam' | 'ontwerp'>): Echt3D | undefined {
  const b = BLENDER_BESTANDEN[m.code];
  const stoel = m.ontwerp.elementen.find((e) => e.type === 'fauteuil');
  if (!b || !stoel) return undefined;
  const v = m.ontwerp.vormgeving ?? {};
  const keuzes = gekozenOpties(m.ontwerp, zetelCatalogus, stoel);
  const toont: Record<string, string[]> = {};
  for (const g of VORMKEUZES) { const k = keuzes.get(g); if (k) toont[g] = [k.code]; }
  const rug = v.rughoogte;
  return {
    bestand: b.bestand,
    vermelding: b.hand
      ? `3D-bestand: ${m.naam} nagebouwd in Blender op basis van de productfoto's en de maten van de website (benadering, geen bestand van de fabrikant).`
      : `3D-bestand: de opbouw van ${m.naam} uit de configurator, in Blender afgewerkt naar de productfoto's (benadering, geen bestand van de fabrikant).`,
    elementen: ['fauteuil'],
    maat: { b: stoel.breedte, d: stoel.diepte, h: b.h, zithoogte: v.zithoogte ?? 42, poothoogte: v.poothoogte ?? 12, ...(rug && b.h > rug + 1 ? { rug } : {}) },
    // Een ronde zitting wordt ovaal als ze rekt: maar een paar procent.
    rek: 0.05,
    toont,
    ...(b.los ? { los: b.los } : {}),
  };
}
