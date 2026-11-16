/**
 * 3D doorsturen: maakt van het huidige project een 3D-pakket (zie core/src/pakket3d.ts), de 3D als gewone gegevens.
 * Een ander systeem (bv. Missing Link) toont het met de losse kijker (kijker.ts → dist/bouw-kijker.html).
 */
import { passendKader, plattegrond3D, verdiepingenVan, PAKKET3D_SOORT, PAKKET3D_VERSIE, ZENDING_SOORT, ZENDING_VERSIE, type Pakket3D, type Scene3D, type Zending } from '../../core/src/index.js';
import { maak3D, type Viewer3D } from '../../demo-web/src/drie-d.js';
import { planCatalogus as cat } from '../../core/voorbeelden/inrichting.js';
import { openingInhoud, positieScene } from './positie-3d.js';
import { resultaat, toestand, type Positie } from './staat.js';

/** De woning in 3D, zoals het plattegrondscherm ze toont: met de echte ramen en deuren van de posities. */
function woningScene(totNiveau: number | undefined, laag: boolean): Scene3D {
  return plattegrond3D(toestand().plan, cat, {
    laag: laag ? 110 : undefined,
    meubels: true,
    totNiveau,
    inhoud: openingInhoud,
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
      return { code: p.code, naam: p.naam, omschrijving: omschrijf(p), aantal: p.aantal, scene: positieScene(p, r) };
    }),
  };
}

/** Verborgen kijker om beelden te tekenen zonder dat er iets op het scherm verandert (één keer gemaakt, daarna hergebruikt). */
let tekenaar: Viewer3D | null | undefined;
function tekenViewer(): Viewer3D | null {
  if (tekenaar === undefined) {
    const vak = document.createElement('div');
    vak.setAttribute('aria-hidden', 'true');
    vak.style.cssText = 'position:fixed;left:-10000px;top:0;width:960px;height:640px;pointer-events:none';
    document.body.append(vak);
    tekenaar = maak3D(vak);
    tekenaar?.kwaliteit?.('snel');
  }
  return tekenaar;
}

const even = () => new Promise<void>((klaar) => requestAnimationFrame(() => setTimeout(klaar, 30)));

/**
 * Tekent van elke positie en van de hele woning een beeld (JPEG als data-URL), voor bij de offerteregels.
 * Geeft null als de 3D op dit toestel niet werkt. `opVoortgang` krijgt (klaar, totaal).
 */
export async function maakBeelden(pakket: Pakket3D, opVoortgang?: (klaar: number, totaal: number) => void): Promise<Zending['beelden'] | null> {
  const viewer = tekenViewer();
  if (!viewer) return null;
  const beelden: Zending['beelden'] = { posities: {} };
  const totaal = pakket.posities.length + (pakket.woning.length ? 1 : 0);
  let klaar = 0;
  const teken = async (scene: Scene3D, standpunt: 'schuin' | 'voor'): Promise<string | undefined> => {
    viewer.toon(scene);
    viewer.standpunt(standpunt);
    await even();
    const beeld = viewer.beeld?.('image/jpeg', 0.85) ?? undefined;
    opVoortgang?.(++klaar, totaal);
    return beeld;
  };
  const heleWoning = pakket.woning[pakket.woning.length - 1];
  if (heleWoning) beelden.woning = await teken(heleWoning.scene, 'schuin');
  for (const p of pakket.posities) {
    // Een raam of deur van voren, met het hele kader in beeld.
    const beeld = await teken(passendKader(p.scene), 'voor');
    if (beeld) beelden.posities[p.code] = beeld;
  }
  return beelden;
}

/** De zending voor een ander systeem: offerteregels, een beeld per regel en het 3D-pakket. */
export async function maakZending(offerte: Record<string, unknown>, omschrijf: (p: Positie) => string, opVoortgang?: (klaar: number, totaal: number) => void): Promise<Zending> {
  const pakket3d = maakPakket3D(omschrijf);
  const beelden = (await maakBeelden(pakket3d, opVoortgang)) ?? { posities: {} };
  return { soort: ZENDING_SOORT, versie: ZENDING_VERSIE, gemaakt: pakket3d.gemaakt, offerte, beelden, pakket3d };
}
