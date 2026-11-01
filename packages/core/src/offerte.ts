/**
 * Offerte met meerdere posities (bv. raam 1, raam 2, voordeur, aanbouw) en vrije regels
 * (bv. vloeren en schilderwerk uit de plattegrond). Korting en btw gelden voor de hele offerte.
 */
import type { ConfiguratieResultaat, Melding } from './types.js';

export interface OffertePositieInvoer {
  id: string;
  code: string;
  naam: string;
  aantal: number;
  resultaat: ConfiguratieResultaat;
}

export interface OfferteRegel {
  code: string;
  groep: string;
  omschrijving: string;
  eenheid: string;
  hoeveelheid: number;
  /** Verkoopprijs per eenheid (excl. btw, vóór korting). */
  eenheidsprijs: number;
  /** Kostprijs per eenheid. */
  kostprijs?: number;
}

export interface OfferteResultaat {
  posities: { id: string; code: string; naam: string; aantal: number; stukprijs: number; totaal: number; geldig: boolean; meldingen: Melding[] }[];
  regels: (OfferteRegel & { totaal: number })[];
  subtotaalPosities: number;
  subtotaalRegels: number;
  bruto: number;
  kortingProcent: number;
  korting: number;
  excl: number;
  btwProcent: number;
  btw: number;
  incl: number;
  kostprijs: number;
  margeProcent: number | null;
  /** Alle posities zonder fouten. */
  geldig: boolean;
}

const rond = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

export function berekenOfferte(invoer: {
  posities: OffertePositieInvoer[];
  regels?: OfferteRegel[];
  kortingProcent?: number;
  btwProcent: number;
}): OfferteResultaat {
  const posities = invoer.posities.map((p) => {
    const aantal = Math.max(0, Math.round(p.aantal));
    const stukprijs = p.resultaat.prijs.brutoprijsExcl;
    return {
      id: p.id, code: p.code, naam: p.naam, aantal, stukprijs,
      totaal: rond(stukprijs * aantal),
      geldig: p.resultaat.geldig,
      meldingen: p.resultaat.meldingen,
    };
  });
  const regels = (invoer.regels ?? []).map((r) => ({ ...r, totaal: rond(r.hoeveelheid * r.eenheidsprijs) }));
  const subtotaalPosities = rond(posities.reduce((t, p) => t + p.totaal, 0));
  const subtotaalRegels = rond(regels.reduce((t, r) => t + r.totaal, 0));
  const bruto = rond(subtotaalPosities + subtotaalRegels);
  const kortingProcent = Math.min(100, Math.max(0, invoer.kortingProcent ?? 0));
  const korting = rond((bruto * kortingProcent) / 100);
  const excl = rond(bruto - korting);
  const btw = rond((excl * invoer.btwProcent) / 100);
  const kostprijs = rond(
    invoer.posities.reduce((t, p) => t + p.resultaat.prijs.kostprijs * Math.max(0, Math.round(p.aantal)), 0)
      + regels.reduce((t, r) => t + (r.kostprijs ?? 0) * r.hoeveelheid, 0),
  );
  return {
    posities, regels, subtotaalPosities, subtotaalRegels, bruto, kortingProcent, korting, excl,
    btwProcent: invoer.btwProcent, btw, incl: rond(excl + btw), kostprijs,
    margeProcent: excl > 0 ? rond(((excl - kostprijs) / excl) * 100, 1) : null,
    geldig: posities.every((p) => p.geldig || p.aantal === 0),
  };
}
