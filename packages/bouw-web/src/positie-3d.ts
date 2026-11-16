/**
 * Wat een positie buiten de configurator toont: haar eigen 3D-scène, haar blokken in de muur van de woning
 * en de gegevens voor plattegrond en gevelaanzicht. Eén plek per model, zodat een nieuw model (zoals de
 * garagepoort) niet in elk scherm apart geregeld moet worden.
 */
import type { ConfiguratieResultaat, Opening, OpeningInhoud, Scene3D } from '../../core/src/index.js';
import { bouwAanbouw3D } from '../../core/voorbeelden/aanbouw3d.js';
import { poortBlokken, poortScene } from '../../core/voorbeelden/garagepoort3d.js';
import { raamBlokken, raamScene } from '../../core/voorbeelden/raam3d.js';
import { rasterVan } from '../../core/voorbeelden/raamraster.js';
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

/** De 3D-scène van één positie (raam of deur in een stuk gevel, garagepoort, aanbouw). */
export function positieScene(p: Positie, r: ConfiguratieResultaat = resultaat(p)): Scene3D {
  return p.model === 'AANBOUW' ? bouwAanbouw3D(r) : p.model === 'POORT' ? poortScene(r) : raamScene(r);
}

/** Het raam, de deur of de poort van een opening als blokken voor de 3D van de woning. */
export function openingInhoud(o: Opening): OpeningInhoud | undefined {
  const p = positieVan(o);
  if (!p || p.model === 'AANBOUW') return undefined;
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
