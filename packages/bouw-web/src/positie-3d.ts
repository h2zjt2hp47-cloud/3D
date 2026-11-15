/**
 * Wat een positie buiten de configurator toont: haar eigen 3D-scène, haar blokken in de muur van de woning
 * en de gegevens voor plattegrond en gevelaanzicht. Eén plek per model, zodat een nieuw model (zoals de
 * garagepoort) niet in elk scherm apart geregeld moet worden.
 */
import type { ConfiguratieResultaat, Opening, OpeningInhoud, Scene3D } from '../../core/src/index.js';
import { bouwAanbouw3D } from '../../core/voorbeelden/aanbouw3d.js';
import { poortBlokken, poortScene } from '../../core/voorbeelden/garagepoort3d.js';
import { raamBlokken, raamScene } from '../../core/voorbeelden/raam3d.js';
import { openingenVan } from '../../core/voorbeelden/raamraster.js';
import { eur } from './hulp.js';
import { MODELLEN, positieVan, resultaat, type Positie } from './staat.js';

/** Prijs van een positie voor een kaartje: het bedrag excl. btw, of "nog geen prijs" bij een model dat alleen toont. */
export function prijsTekst(p: Positie): string {
  return MODELLEN[p.model].zonderPrijs ? 'Nog geen prijs' : `${eur(resultaat(p).prijs.brutoprijsExcl)} excl. btw`;
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

/** Label en vakken (opening per vak, van binnen gezien) van een opening, voor de plattegrond. */
export function openingInfo(o: Opening): { label?: string; vakken?: string[] } | undefined {
  const p = positieVan(o);
  if (!p) return undefined;
  if (p.model !== 'RAAM') return { label: p.code };
  return { label: p.code, vakken: openingenVan(resultaat(p)) };
}
