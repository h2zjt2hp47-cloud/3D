// De volgorde van de tijdperken (los bestand, zodat iedereen het kan gebruiken zonder kringverwijzing).
export const TIJDPERKEN = [
  'romeinen', 'franken', 'vroegemiddeleeuwen', 'hogemiddeleeuwen', 'bourgondiers',
  'habsburgers', 'oostenrijk', 'frankrijk', 'belgie', 'wereldoorlogen', 'naoorlog',
] as const;
export type TijdperkId = (typeof TIJDPERKEN)[number];

export function rang(id: string): number {
  return Math.max(0, TIJDPERKEN.indexOf(id as TijdperkId));
}

/** prijzen groeien mee met de bevolking en de tijd */
export const PRIJSFACTOR = [1, 1, 1.1, 1.4, 1.8, 2.2, 2.6, 3, 4, 6, 9];
export const prijsfactor = (tijdperk: string) => PRIJSFACTOR[rang(tijdperk)];
