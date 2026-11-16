/**
 * 3D doorsturen: maakt van het huidige project een 3D-pakket (zie core/src/pakket3d.ts), de 3D als gewone gegevens.
 * Een ander systeem (bv. Missing Link) toont het met de losse kijker (kijker.ts → dist/bouw-kijker.html).
 */
import { passendKader, plattegrond3D, verdiepingenVan, PAKKET3D_SOORT, PAKKET3D_VERSIE, ZENDING_SOORT, ZENDING_VERSIE, type Pakket3D, type Scene3D, type Zending } from '../../core/src/index.js';
import { maak3D, type Standpunt, type Viewer3D } from '../../demo-web/src/drie-d.js';
import { planCatalogus as cat } from '../../core/voorbeelden/inrichting.js';
import { openingInhoudUit, positieScene } from './positie-3d.js';
import { resultaat, toestand, type Positie, type Toestand } from './staat.js';

/**
 * De woning in 3D, zoals het plattegrondscherm ze toont: met de echte ramen en deuren van de posities. Van het actieve
 * project, of van een ander (een variant) als `t` gegeven is.
 */
export function woningScene(totNiveau: number | undefined, laag: boolean, t: Toestand = toestand()): Scene3D {
  return plattegrond3D(t.plan, cat, {
    laag: laag ? 110 : undefined,
    meubels: true,
    // Terras en pad horen bij de woning: ze gaan mee in het pakket. Lucht en gras tekent de kijker zelf.
    aanleg: true,
    gevelkoppen: true,
    totNiveau,
    inhoud: openingInhoudUit(t.posities),
  });
}

/**
 * Het 3D-pakket van het huidige project, of van een ander project (`t`, bv. een variant), zonder van project te wisselen.
 * `omschrijf` geeft de omschrijving van een positie zoals op de offerte.
 */
export function maakPakket3D(omschrijf: (p: Positie) => string, t: Toestand = toestand()): Pakket3D {
  // Zonder ruimtes (een aanbouw of een raam uit de snelstart) is er geen woning om te tonen: anders zag je alleen gras.
  const niveaus = t.meta.zonderWoning || !t.plan.ruimtes.length ? [] : verdiepingenVan(t.plan);
  return {
    soort: PAKKET3D_SOORT,
    versie: PAKKET3D_VERSIE,
    gemaakt: new Date().toISOString(),
    project: { nummer: t.meta.nummer, naam: t.meta.project, klant: t.meta.klant || undefined, adres: t.meta.adres || undefined },
    woning: niveaus.map((v, n) => ({
      naam: v.naam,
      // Het laatste niveau is de hele woning met dak; met lage muren kijk je altijd tot en met die verdieping.
      scene: woningScene(n === niveaus.length - 1 ? undefined : n, false, t),
      laag: woningScene(n, true, t),
    })),
    posities: t.posities.map((p) => {
      const r = resultaat(p);
      return { code: p.code, naam: p.naam, omschrijving: omschrijf(p), aantal: p.aantal, scene: positieScene(p, r) };
    }),
  };
}

/** Verborgen kijker om beelden te tekenen zonder dat er iets op het scherm verandert (één keer gemaakt, daarna hergebruikt). */
let tekenaar: Viewer3D | null | undefined;
let tekenVak: HTMLElement | null = null;
function tekenViewer(): Viewer3D | null {
  if (tekenaar === undefined) {
    const vak = document.createElement('div');
    vak.setAttribute('aria-hidden', 'true');
    vak.style.cssText = 'position:fixed;left:-10000px;top:0;width:960px;height:640px;pointer-events:none';
    document.body.append(vak);
    tekenVak = vak;
    tekenaar = maak3D(vak);
    tekenaar?.kwaliteit?.('snel');
  }
  return tekenaar;
}

const even = () => new Promise<void>((klaar) => requestAnimationFrame(() => setTimeout(klaar, 30)));

/**
 * Wacht tot de verborgen kijker kan tekenen: de 3D start asynchroon, en een beeld dat te vroeg genomen wordt, is zwart
 * (gezien bij het eerste beeld van het blad). De kijker zet de weg waarop hij tekent op zijn canvas zodra hij klaar is.
 */
async function wachtTotKlaar() {
  for (let i = 0; i < 100 && !tekenVak?.querySelector('canvas')?.dataset.backend; i++) await new Promise((r) => setTimeout(r, 50));
}

/**
 * Eén beeld (JPEG als data-URL) van een scène, buiten beeld getekend: voor het blad met beelden. De woning in open lucht,
 * een positie op de effen achtergrond (zoals op het scherm). `breedte` in beeldpunten (standaard 960); de hoogte volgt
 * de kijker (62 % van de breedte). Geeft null als de 3D op dit toestel niet werkt.
 */
export async function tekenBeeld(scene: Scene3D, o: { standpunt: Standpunt; buiten: boolean; breedte?: number }): Promise<string | null> {
  const viewer = tekenViewer();
  if (!viewer || !tekenVak) return null;
  await wachtTotKlaar();
  const breedte = `${o.breedte ?? 960}px`;
  if (tekenVak.style.width !== breedte) { tekenVak.style.width = breedte; viewer.formaat(); await even(); }
  viewer.omgeving?.(o.buiten ? 'buiten' : 'geen');
  viewer.toon(scene);
  viewer.standpunt(o.standpunt);
  await even();
  const beeld = viewer.beeld?.('image/jpeg', 0.88) ?? null;
  // Terug naar de maat van de zending: die beelden blijven zoals ze waren.
  if (tekenVak.style.width !== '960px') { tekenVak.style.width = '960px'; viewer.formaat(); }
  return beeld;
}

/**
 * Tekent van elke positie en van de hele woning een beeld (JPEG als data-URL), voor bij de offerteregels.
 * Geeft null als de 3D op dit toestel niet werkt. `opVoortgang` krijgt (klaar, totaal).
 */
export async function maakBeelden(pakket: Pakket3D, opVoortgang?: (klaar: number, totaal: number) => void): Promise<Zending['beelden'] | null> {
  const viewer = tekenViewer();
  if (!viewer) return null;
  await wachtTotKlaar();
  const beelden: Zending['beelden'] = { posities: {} };
  const totaal = pakket.posities.length + (pakket.woning.length ? 1 : 0);
  let klaar = 0;
  const teken = async (scene: Scene3D, standpunt: 'schuin' | 'voor', woning = false): Promise<string | undefined> => {
    // De woning in open lucht, een positie op de effen achtergrond (zoals op het scherm en in de kijker).
    viewer.omgeving?.(woning ? 'buiten' : 'geen');
    viewer.toon(scene);
    viewer.standpunt(standpunt);
    await even();
    const beeld = viewer.beeld?.('image/jpeg', 0.85) ?? undefined;
    opVoortgang?.(++klaar, totaal);
    return beeld;
  };
  const heleWoning = pakket.woning[pakket.woning.length - 1];
  if (heleWoning) beelden.woning = await teken(heleWoning.scene, 'schuin', true);
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
