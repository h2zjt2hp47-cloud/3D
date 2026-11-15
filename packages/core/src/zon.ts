/**
 * Stand van de zon: uit de datum, het uur op de klok en de plaats (standaard België) de richting en de hoogte van de
 * zon, en daaruit wanneer de zon op een gevel staat. Zuivere rekenfuncties, zonder scherm of 3D.
 *
 * Nauwkeurigheid: de gangbare benadering van NOAA (declinatie en tijdsvereffening als korte reeks), goed tot een
 * fractie van een graad. Ruim genoeg om te tonen waar de zon binnenvalt; geen vervanging van een zonnestudie.
 * Meetkundig: zonder buren, bomen of reliëf, en zonder de breking van het licht aan de horizon.
 */

/** Waar de zon staat. */
export interface ZonStand {
  /** Windrichting waar de zon staat, in graden: 0 = noord, 90 = oost, 180 = zuid, 270 = west. */
  azimut: number;
  /** Hoogte boven de horizon in graden; negatief = onder de horizon (geen zon). */
  hoogte: number;
}

/** Een moment: dag van het jaar en het uur op de klok (decimaal: 13,5 = 13.30 u). */
export interface ZonMoment {
  maand: number;
  dag: number;
  uur: number;
}

export interface ZonPlaats {
  /** Breedtegraad (noorderbreedte positief) en lengtegraad (oosterlengte positief), in graden. */
  breedte: number;
  lengte: number;
}

/** België, ongeveer het midden van het land. */
export const BELGIE: ZonPlaats = { breedte: 51, lengte: 4.4 };

/** De vier seizoensdagen, als vaste keuzes in het scherm. */
export const SEIZOENEN = {
  lente: { label: '21 maart (lente)', maand: 3, dag: 21 },
  zomer: { label: '21 juni (zomer)', maand: 6, dag: 21 },
  herfst: { label: '21 september (herfst)', maand: 9, dag: 21 },
  winter: { label: '21 december (winter)', maand: 12, dag: 21 },
} as const;
export type Seizoen = keyof typeof SEIZOENEN;

const RAD = Math.PI / 180;
const DAGEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Dag van het jaar (1 januari = 1), in een gewoon jaar. */
export function dagVanJaar(maand: number, dag: number): number {
  const m = Math.min(12, Math.max(1, Math.round(maand)));
  return DAGEN.slice(0, m - 1).reduce((t, d) => t + d, 0) + Math.min(DAGEN[m - 1]!, Math.max(1, Math.round(dag)));
}

/**
 * Geldt de zomertijd op die dag? Benadering zonder jaartal: van 29 maart tot en met 25 oktober (de echte wissel valt op
 * de laatste zondag van maart en van oktober, dus hoogstens enkele dagen ernaast).
 */
export function zomertijd(maand: number, dag: number): boolean {
  const n = dagVanJaar(maand, dag);
  return n >= dagVanJaar(3, 29) && n <= dagVanJaar(10, 25);
}

/** Uren die de klok voorloopt op UTC in België en Nederland: 1 in de winter, 2 in de zomer. */
export const utcVerschil = (maand: number, dag: number) => (zomertijd(maand, dag) ? 2 : 1);

/** Declinatie van de zon (rad) en de tijdsvereffening (minuten) op een dag en uur (UTC). */
function zonBaan(dagNr: number, uurUtc: number): { declinatie: number; vereffening: number } {
  const g = ((2 * Math.PI) / 365) * (dagNr - 1 + (uurUtc - 12) / 24);
  return {
    declinatie: 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g),
    vereffening: 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g)),
  };
}

/**
 * Stand van de zon op een moment (uur op de klok) en een plaats. `utc` = hoeveel uur de klok voorloopt op UTC;
 * zonder waarde de Belgische wintertijd of zomertijd van die dag.
 */
export function zonnestand(moment: ZonMoment, plaats: ZonPlaats = BELGIE, utc: number = utcVerschil(moment.maand, moment.dag)): ZonStand {
  const n = dagVanJaar(moment.maand, moment.dag);
  const { declinatie, vereffening } = zonBaan(n, moment.uur - utc);
  // Ware zonnetijd in minuten, en de uurhoek (0 = de zon in het zuiden, positief in de namiddag).
  const zonnetijd = moment.uur * 60 + vereffening + 4 * plaats.lengte - 60 * utc;
  const uurhoek = (zonnetijd / 4 - 180) * RAD;
  const b = plaats.breedte * RAD;
  const sinHoogte = Math.sin(b) * Math.sin(declinatie) + Math.cos(b) * Math.cos(declinatie) * Math.cos(uurhoek);
  const hoogte = Math.asin(Math.max(-1, Math.min(1, sinHoogte))) / RAD;
  // Azimut vanaf het zuiden (positief naar het westen), dan omgezet naar een windrichting vanaf het noorden.
  const vanZuid = Math.atan2(Math.sin(uurhoek), Math.cos(uurhoek) * Math.sin(b) - Math.tan(declinatie) * Math.cos(b)) / RAD;
  return { azimut: (((vanZuid + 180) % 360) + 360) % 360, hoogte };
}

/** Zonsopgang, hoogste stand en zonsondergang op de klok (uren, decimaal), meetkundig. Leeg als de zon niet opkomt. */
export function zonOpEnOnder(maand: number, dag: number, plaats: ZonPlaats = BELGIE, utc: number = utcVerschil(maand, dag)): { op: number; middag: number; onder: number } | undefined {
  const hoogte = (uur: number) => zonnestand({ maand, dag, uur }, plaats, utc).hoogte;
  // Per minuut zoeken: eenvoudig en nauwkeurig genoeg.
  let op: number | undefined, onder: number | undefined, middag = 12, top = -90;
  for (let m = 0; m < 24 * 60; m++) {
    const h = hoogte(m / 60);
    if (h > top) { top = h; middag = m / 60; }
    if (h > 0 && op === undefined) op = m / 60;
    if (h > 0) onder = (m + 1) / 60;
  }
  return op === undefined || onder === undefined ? undefined : { op, middag, onder };
}

const WIND = ['noord', 'noordoost', 'oost', 'zuidoost', 'zuid', 'zuidwest', 'west', 'noordwest'];

/** Windrichting in woorden (acht streken). */
export const windrichting = (azimut: number) => WIND[Math.round((((azimut % 360) + 360) % 360) / 45) % 8]!;

/** Uur als kloktijd: 13,5 → "13.30 u". */
export function uurTekst(uur: number): string {
  const m = Math.round(uur * 60);
  return `${Math.floor(m / 60)}.${String(m % 60).padStart(2, '0')} u`;
}

/** De stand in woorden, bv. "zuidwest, 34° hoog". */
export function zonTekst(stand: ZonStand): string {
  return stand.hoogte <= 0 ? 'onder de horizon (geen zon)' : `${windrichting(stand.azimut)}, ${Math.round(stand.hoogte)}° hoog`;
}

/**
 * Richting naar de zon in het vlak van de plattegrond, in graden met de klok mee vanaf de bovenkant van het plan
 * (0 = boven, 90 = rechts, 180 = onder, 270 = links). `noord` = waar het noorden ligt op het plan, op dezelfde manier
 * gemeten (0 of leeg = de bovenkant van het plan is het noorden).
 */
export const zonRichtingOpPlan = (stand: ZonStand, noord = 0) => (((stand.azimut + noord) % 360) + 360) % 360;

export type ZonKant = 'boven' | 'onder' | 'links' | 'rechts';

/** Richting waar een gevel naar kijkt, in graden met de klok mee vanaf de bovenkant van het plan. */
const KIJKT: Record<ZonKant, number> = { boven: 0, rechts: 90, onder: 180, links: 270 };

/** Windrichting waar een kant van het plan naar kijkt (0 = noord …), met het noorden van het plan erbij. */
export const gevelRichting = (kant: ZonKant, noord = 0) => (((KIJKT[kant] - noord) % 360) + 360) % 360;

export interface ZonOpGevel {
  kant: ZonKant;
  /** Windrichting waar de gevel naar kijkt (graden vanaf het noorden) en in woorden. */
  richting: number;
  windstreek: string;
  /** Periodes waarin de zon op de gevel staat, in uren op de klok. Een noordgevel heeft er in de zomer twee. */
  periodes: { van: number; tot: number }[];
  /** Totaal aantal uren zon op de gevel. */
  uren: number;
}

/**
 * Wanneer staat de zon op elke gevel, op één dag? Meetkundig: de zon staat boven de horizon en vóór het vlak van de
 * gevel. Zonder buren, bomen, oversteken of andere delen van de woning die schaduw geven; een hulp bij de keuze van
 * zonwering, geen zonnestudie. Stappen van 5 minuten.
 */
export function zonOpGevels(maand: number, dag: number, noord = 0, plaats: ZonPlaats = BELGIE, utc: number = utcVerschil(maand, dag)): ZonOpGevel[] {
  const stap = 5;
  return (Object.keys(KIJKT) as ZonKant[]).map((kant) => {
    const richting = gevelRichting(kant, noord);
    const periodes: { van: number; tot: number }[] = [];
    let open: number | undefined;
    for (let m = 0; m <= 24 * 60; m += stap) {
      const s = zonnestand({ maand, dag, uur: m / 60 }, plaats, utc);
      // De zon schijnt op de gevel als ze boven de horizon staat en minder dan 90° van de kijkrichting van de gevel.
      const op = m < 24 * 60 && s.hoogte > 0 && Math.cos((s.azimut - richting) * RAD) > 0.02;
      if (op && open === undefined) open = m / 60;
      if (!op && open !== undefined) { periodes.push({ van: open, tot: m / 60 }); open = undefined; }
    }
    return { kant, richting, windstreek: windrichting(richting), periodes, uren: periodes.reduce((t, p) => t + p.tot - p.van, 0) };
  });
}
