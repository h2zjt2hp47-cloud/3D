/**
 * Een plaats in de woning voor een raam, deur of garagepoort die in het overzicht toegevoegd werd (doorloop B7, 16/11):
 * *Dupliceren* zet de kopie naast het origineel op dezelfde muur, *In de woning zetten* zoekt een vrij stuk buitenmuur.
 * Zuivere functies; het scherm (`bouw-web/src/staat.ts`) maakt de opening en koppelt ze aan de positie.
 */
import { murenVan, muurStatus, muurVanOpening, niveauPlan, niveauVan, opMuur, verdiepingenVan, type Muur, type Opening, type Plattegrond, type RuimteType } from './plattegrond.js';

/** Afstand tot een hoek (cm) en tussen twee openingen: de controle van de plattegrond vraagt 10 en 5 cm. */
export const PLAATS_RAND = 15;
export const PLAATS_TUSSEN = 30;

export interface Plaats extends Pick<Opening, 'as' | 'lijn' | 'midden' | 'richting'> {
  niveau: number;
  /** De muur en de ruimte erachter (binnen). */
  muur: Muur;
  ruimte?: string;
}

/**
 * De vrije stukken van een muur (cm langs de muur) waarin een nieuwe opening helemaal moet liggen: `rand` van de hoeken
 * en `tussen` van elke opening die er al in zit.
 */
export function vrijeStukken(plan: Plattegrond, m: Muur, niveau: number, opties: { rand?: number; tussen?: number } = {}): { van: number; tot: number }[] {
  const rand = opties.rand ?? PLAATS_RAND, tussen = opties.tussen ?? PLAATS_TUSSEN;
  const pl = niveauPlan(plan, niveau);
  const muren = murenVan(pl);
  let stukken = [{ van: m.van + rand, tot: m.tot - rand }];
  for (const o of pl.openingen) {
    if (muurVanOpening(o, muren)?.id !== m.id) continue;
    const a = o.midden - o.breedte / 2 - tussen, b = o.midden + o.breedte / 2 + tussen;
    stukken = stukken.flatMap((s) => [{ van: s.van, tot: Math.min(s.tot, a) }, { van: Math.max(s.van, b), tot: s.tot }]).filter((s) => s.tot - s.van > 0.5);
  }
  return stukken;
}

const past = (stukken: { van: number; tot: number }[], midden: number, breedte: number) =>
  stukken.some((s) => midden - breedte / 2 >= s.van - 0.01 && midden + breedte / 2 <= s.tot + 0.01);

/**
 * Een plaats voor een kopie van opening `o` (breedte `breedte` cm) vlak naast het origineel op dezelfde muur: eerst rechts
 * (grotere coördinaat), dan links; eerst met `PLAATS_TUSSEN` ertussen, anders met 10 cm. Undefined als er geen plaats is.
 */
export function plaatsNaast(plan: Plattegrond, o: Opening, breedte = o.breedte): Plaats | undefined {
  const niveau = niveauVan(o);
  const m = muurVanOpening(o, murenVan(niveauPlan(plan, niveau)));
  if (!m) return undefined;
  for (const tussen of [PLAATS_TUSSEN, 10]) {
    const stukken = vrijeStukken(plan, m, niveau, { tussen });
    for (const kant of [1, -1]) {
      const midden = Math.round(o.midden + kant * (o.breedte / 2 + tussen + breedte / 2));
      if (past(stukken, midden, breedte)) return { ...opMuur(m, midden), niveau, muur: m, ruimte: m.soort === 'buiten' ? m.plus ?? m.min : undefined };
    }
  }
  return undefined;
}

/**
 * Een vrij stuk buitenmuur voor een opening van `breedte` cm: eerst op verdieping `niveau` (standaard het gelijkvloers),
 * in een ruimte van een gevraagde soort (`ruimteTypes`, in die volgorde), dan in een andere ruimte; daarna de andere
 * verdiepingen (niet voor een garagepoort: `alleenGelijkvloers`). Nooit in een muur tegen de buren. Binnen die volgorde
 * het langste vrije stuk, met de opening in het midden ervan (op 5 cm). Undefined als er nergens plaats is.
 */
export function vrijePlaats(plan: Plattegrond, o: { breedte: number; niveau?: number; ruimteTypes?: RuimteType[]; alleenGelijkvloers?: boolean }): Plaats | undefined {
  const start = o.alleenGelijkvloers ? 0 : Math.max(0, o.niveau ?? 0);
  const niveaus = o.alleenGelijkvloers ? [0] : [start, ...verdiepingenVan(plan).map((_, n) => n).filter((n) => n !== start)];
  for (const niveau of niveaus) {
    const pl = niveauPlan(plan, niveau);
    let beste: { rang: number; lengte: number; plaats: Plaats } | undefined;
    for (const m of murenVan(pl)) {
      if (m.soort !== 'buiten' || muurStatus(plan, m) === 'buren') continue;
      const ruimte = m.plus ?? m.min;
      const type = pl.ruimtes.find((r) => r.id === ruimte)?.type;
      const i = type && o.ruimteTypes ? o.ruimteTypes.indexOf(type) : -1;
      const rang = i >= 0 ? i : (o.ruimteTypes?.length ?? 0);
      for (const s of vrijeStukken(plan, m, niveau)) {
        const lengte = s.tot - s.van;
        if (lengte < o.breedte) continue;
        if (beste && (rang > beste.rang || (rang === beste.rang && lengte <= beste.lengte))) continue;
        const midden = Math.min(s.tot - o.breedte / 2, Math.max(s.van + o.breedte / 2, Math.round((s.van + s.tot) / 2 / 5) * 5));
        beste = { rang, lengte, plaats: { ...opMuur(m, midden), niveau, muur: m, ruimte } };
      }
    }
    if (beste) return beste.plaats;
  }
  return undefined;
}
