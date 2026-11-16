/**
 * Wat een positie buiten de configurator toont: haar eigen 3D-scène, haar blokken in de muur van de woning
 * en de gegevens voor plattegrond en gevelaanzicht. Eén plek per model, zodat een nieuw model (zoals de
 * garagepoort) niet in elk scherm apart geregeld moet worden.
 *
 * Sinds 16/11 (ronde 8b) ook de vaste modellen (carport, tuinhuis, loods, staalwerk; core/voorbeelden/vastemodellen.ts):
 * hun 3D in twee weergaven (*Afgewerkt* en *Constructie*), of ze een gebouw zijn (dan staan ze buiten, in de omgeving)
 * en hun hoofdmaten. Ze staan niet in een muur van de woning.
 */
import { doosMaatlijnen, type BouwWeergave, type ConfiguratieResultaat, type Maatlijn3D, type Opening, type OpeningInhoud, type Scene3D } from '../../core/src/index.js';
import { bouwAanbouw3D } from '../../core/voorbeelden/aanbouw3d.js';
import { poortBlokken, poortScene } from '../../core/voorbeelden/garagepoort3d.js';
import { raamBlokken, raamScene } from '../../core/voorbeelden/raam3d.js';
import { rasterVan } from '../../core/voorbeelden/raamraster.js';
import { isVastModel, VASTE_MODELLEN, vastModelScene } from '../../core/voorbeelden/vastemodellen.js';
import { eur, PRIJZEN } from './hulp.js';
import { positieVan, resultaat, zonderPrijs, type Positie } from './staat.js';

/**
 * Prijs van een positie voor een kaartje: het bedrag excl. btw, of "nog geen prijs" (model dat alleen toont, nieuwe
 * raamindeling). Zolang de schermen geen prijzen tonen (`PRIJZEN`), is dit een lege tekst.
 */
export function prijsTekst(p: Positie): string {
  if (!PRIJZEN) return '';
  return zonderPrijs(p) ? 'Nog geen prijs' : `${eur(resultaat(p).prijs.brutoprijsExcl)} excl. btw`;
}

/**
 * De 3D-scène van één positie (raam of deur in een stuk gevel, garagepoort, aanbouw, of een vast model). Een vast model
 * kan ook in de constructieweergave, met hetzelfde kader als afgewerkt (de camera blijft staan als je wisselt).
 */
export function positieScene(p: Positie, r: ConfiguratieResultaat = resultaat(p), weergave: BouwWeergave = 'afgewerkt'): Scene3D {
  if (isVastModel(p.model)) return vastModelScene(p.model, r, weergave);
  return p.model === 'AANBOUW' ? bouwAanbouw3D(r) : p.model === 'POORT' ? poortScene(r) : raamScene(r);
}

/** Is de positie een gebouw (aanbouw, overkapping, tuinhuis, loods)? Dan staat ze buiten: lucht, gras, horizon. */
export function isGebouw(p: Pick<Positie, 'model'>): boolean {
  return p.model === 'AANBOUW' || (isVastModel(p.model) && VASTE_MODELLEN[p.model].gebouw);
}

/** Heeft de positie een constructieweergave (de vaste modellen)? */
export const heeftConstructie = (p: Pick<Positie, 'model'>) => isVastModel(p.model);

/**
 * De hoofdmaten van een positie die geen raam is, uit het model (niet uit de blokken): van een vast model zijn eigen maten
 * (breedte, diepte, hoogte; lengte en hoogte van een balustrade …), van een aanbouw de buitenmaat en de hoogte. Een raam,
 * deur of poort heeft er geen: daarvan rekent de kijker de maten van het kader uit de scène.
 */
export function positieMaatlijnen(p: Positie, r: ConfiguratieResultaat = resultaat(p)): Maatlijn3D[] | undefined {
  if (isVastModel(p.model)) return VASTE_MODELLEN[p.model].maatlijnen(r);
  if (p.model === 'AANBOUW' && r.afgeleid.muren === true) {
    const cm = (x: unknown) => (typeof x === 'number' ? x / 10 : 0);
    return doosMaatlijnen({ x0: 0, x1: cm(p.keuzes.breedte), z0: 0, z1: cm(p.keuzes.diepte), y0: 0, y1: cm(r.afgeleid.H) });
  }
  return undefined;
}

/** Het raam, de deur of de poort van een opening als blokken voor de 3D van de woning. */
export function openingInhoud(o: Opening): OpeningInhoud | undefined {
  return inhoudVan(positieVan(o));
}

/**
 * Hetzelfde voor de openingen van een ander project dan het actieve (een variant): de posities komen uit dat project.
 * Een positie rekent alleen met haar eigen keuzes, dus dat kan zonder van project te wisselen.
 */
export function openingInhoudUit(posities: Positie[]): (o: Opening) => OpeningInhoud | undefined {
  return (o) => inhoudVan(o.positie ? posities.find((p) => p.id === o.positie) : undefined);
}

function inhoudVan(p: Positie | undefined): OpeningInhoud | undefined {
  // Alleen een raam, deur of poort staat in een muur; een aanbouw of een vast model niet.
  if (!p || (p.model !== 'RAAM' && p.model !== 'POORT')) return undefined;
  const rb = p.model === 'POORT' ? poortBlokken(resultaat(p)) : raamBlokken(resultaat(p));
  return { blokken: rb.blokken, hoogte: rb.h + rb.kast };
}

/** Label, vakken (opening per vak, van binnen gezien) en hun breedtes van een opening, voor de plattegrond. */
export function openingInfo(o: Opening): { label?: string; vakken?: string[]; breedtes?: number[] } | undefined {
  const p = positieVan(o);
  if (!p) return undefined;
  if (p.model !== 'RAAM') return { label: p.code };
  const hoofd = rasterVan(resultaat(p)).vakken.filter((v) => v.rol === 'vak' || v.rol === 'deur' || v.rol === 'deel');
  return { label: p.code, vakken: hoofd.map((v) => v.opening), breedtes: hoofd.map((v) => v.b) };
}
