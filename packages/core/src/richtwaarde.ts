/**
 * Een getal uit een tabel met richtwaarden (voorbeelden/warmtewaarden.ts en voorbeelden/stabiliteitswaarden.ts): de
 * waarde zelf en waar ze vandaan komt. De rekenfuncties voor warmte (warmte.ts) en stabiliteit (stabiliteit.ts) hebben
 * zelf geen enkel getal uit een norm of een fiche in zich: ze krijgen alles uit zo'n tabel, en zeggen in hun uitkomst
 * welke waarde ze gebruikt hebben en of iemand ze nagelezen heeft.
 */
import type { OpbouwHerkomst } from './opbouw.js';

export interface Richtwaarde {
  waarde: number;
  /** Waar de waarde vandaan komt. Zolang `nagelezen` niet waar is, heeft niemand ze in een bron nagelezen. */
  herkomst: OpbouwHerkomst;
  /** Korte uitleg die bij de aannames van een uitkomst komt te staan (bv. wat er over het materiaal aangenomen is). */
  uitleg?: string;
}
