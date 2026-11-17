// De klok: dag 0 is 1 maart 57 v.Chr. Jaren zonder schrikkeldagen, en er is geen jaar 0.

export const STARTJAAR = -57;
const DAGEN_VOOR_MAART = 59;
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const LENGTE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface Datum {
  /** negatief = voor Christus; nooit 0 */
  jaar: number;
  /** 1-12 */
  maand: number;
  /** 1-31 */
  dag: number;
}

function jaarPlus(jaar: number, n: number): number {
  // telt n jaar op en slaat het jaar 0 over
  let j = jaar + n;
  if (jaar < 0 && j >= 0) j += 1;
  if (jaar > 0 && j <= 0) j -= 1;
  return j;
}

export function datumVan(dagnummer: number): Datum {
  const totaal = DAGEN_VOOR_MAART + dagnummer;
  const jaren = Math.floor(totaal / 365);
  let rest = totaal - jaren * 365;
  let maand = 0;
  while (rest >= LENGTE[maand]) { rest -= LENGTE[maand]; maand++; }
  return { jaar: jaarPlus(STARTJAAR, jaren), maand: maand + 1, dag: rest + 1 };
}

export function dagnummerVan(d: Datum): number {
  const jaren = d.jaar < 0 === STARTJAAR < 0 ? d.jaar - STARTJAAR : d.jaar - STARTJAAR - 1;
  let n = jaren * 365 - DAGEN_VOOR_MAART;
  for (let m = 0; m < d.maand - 1; m++) n += LENGTE[m];
  return n + d.dag - 1;
}

export function jaarTekst(jaar: number): string {
  return jaar < 0 ? `${-jaar} v.Chr.` : `${jaar} n.Chr.`;
}

export function datumTekst(dagnummer: number): string {
  const d = datumVan(dagnummer);
  return `${d.dag} ${MAANDEN[d.maand - 1]} ${jaarTekst(d.jaar)}`;
}

export type Seizoen = 'lente' | 'zomer' | 'herfst' | 'winter';
export function seizoenVan(dagnummer: number): Seizoen {
  const m = datumVan(dagnummer).maand;
  if (m === 12 || m <= 2) return 'winter';
  if (m <= 5) return 'lente';
  if (m <= 8) return 'zomer';
  return 'herfst';
}
