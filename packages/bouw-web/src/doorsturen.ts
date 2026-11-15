/**
 * 3D doorsturen: maakt van het huidige project een 3D-pakket (zie core/src/pakket3d.ts), de 3D als gewone gegevens.
 * Een ander systeem (bv. Missing Link) toont het met de losse kijker (kijker.ts → dist/bouw-kijker.html).
 */
import { plattegrond3D, verdiepingenVan, PAKKET3D_SOORT, PAKKET3D_VERSIE, type Opening, type Pakket3D, type Scene3D } from '../../core/src/index.js';
import { bouwAanbouw3D } from '../../core/voorbeelden/aanbouw3d.js';
import { planCatalogus as cat } from '../../core/voorbeelden/inrichting.js';
import { raamBlokken, raamScene } from '../../core/voorbeelden/raam3d.js';
import { positieVan, resultaat, toestand, type Positie } from './staat.js';

/** De woning in 3D, zoals het plattegrondscherm ze toont: met de echte ramen en deuren van de posities. */
function woningScene(totNiveau: number | undefined, laag: boolean): Scene3D {
  return plattegrond3D(toestand().plan, cat, {
    laag: laag ? 110 : undefined,
    meubels: true,
    totNiveau,
    inhoud: (o: Opening) => {
      const p = positieVan(o);
      if (!p || p.model !== 'RAAM') return undefined;
      const rb = raamBlokken(resultaat(p));
      return { blokken: rb.blokken, hoogte: rb.h + rb.kast };
    },
  });
}

/** Het 3D-pakket van het huidige project. `omschrijf` geeft de omschrijving van een positie zoals op de offerte. */
export function maakPakket3D(omschrijf: (p: Positie) => string): Pakket3D {
  const t = toestand();
  const niveaus = t.meta.zonderWoning ? [] : verdiepingenVan(t.plan);
  return {
    soort: PAKKET3D_SOORT,
    versie: PAKKET3D_VERSIE,
    gemaakt: new Date().toISOString(),
    project: { nummer: t.meta.nummer, naam: t.meta.project, klant: t.meta.klant || undefined, adres: t.meta.adres || undefined },
    woning: niveaus.map((v, n) => ({
      naam: v.naam,
      // Het laatste niveau is de hele woning met dak; met lage muren kijk je altijd tot en met die verdieping.
      scene: woningScene(n === niveaus.length - 1 ? undefined : n, false),
      laag: woningScene(n, true),
    })),
    posities: t.posities.map((p) => {
      const r = resultaat(p);
      return { code: p.code, naam: p.naam, omschrijving: omschrijf(p), aantal: p.aantal, scene: p.model === 'AANBOUW' ? bouwAanbouw3D(r) : raamScene(r) };
    }),
  };
}
