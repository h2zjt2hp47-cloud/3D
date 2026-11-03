/**
 * Materialen (stoffen en leder) die de gebruiker zelf kan beheren.
 * Gebruikt door de sofa-configurator én de vrije ontwerper.
 */

export interface Materiaal {
  code: string;
  naam: string;
  soort: 'stof' | 'leder';
  /** Prijsgroep, bv. A, B, C of EIGEN (eigen stof/leder van de klant). */
  groep: string;
  /** Kleur voor de tekening (#rrggbb). */
  kleur: string;
  /** Patroonrapport in cm (0 = effen). */
  rapport: number;
  /** Rolbreedte in cm (meestal 140). */
  rolbreedte: number;
  /** Aankoopprijs per lopende meter (0 bij eigen materiaal van de klant). */
  kostprijsPerM: number;
  /** Extra toeslag op de verkoopprijs in procent (bv. 10 voor eigen leder). */
  toeslagPct: number;
  /** Door de gebruiker toegevoegd (mag verwijderd worden). */
  eigen?: boolean;
  // Technische gegevens van de leverancier (stofkaart), allemaal optioneel.
  /** Merk of leverancier, bv. "Chivasso (JAB Anstoetz)". */
  merk?: string;
  /** Artikelnummer van de leverancier met kleur, bv. "CH3112/051". */
  artikel?: string;
  /** Kwaliteit, bv. "Meubelstof, geweven, epinglé / frisé". */
  kwaliteit?: string;
  /** Samenstelling, bv. "60% polyacryl, 24% polyester, 11% viscose, 5% linnen". */
  samenstelling?: string;
  /** Schuurweerstand (Martindale, aantal toeren). */
  martindale?: number;
  /** Op de rol te verwerken (railroaded): de breedte van de rol wordt de hoogte, dus lange stukken zonder naad. */
  opDeRol?: boolean;
  /** Aantal kleuren van deze stof bij de leverancier. */
  kleurvarianten?: number;
  /** Foto van de stof als textuur in de 3D (data-URL of webadres). */
  textuur?: string;
  /** Hoeveel cm stof de foto toont (één tegel van de textuur), bv. 15. */
  textuurCm?: number;
  /** Collectie (stoffamilie) waartoe deze kleur hoort, bv. "Velours Soft". Zo staan de kleuren van één stof samen. */
  collectie?: string;
  /** Soort weefsel: bepaalt hoe de stof eruitziet op de staal en in de 3D. */
  weefsel?: Weefsel;
}

/** Soorten weefsel met hun uitleg (voor filter en staal). */
export const WEEFSELS = {
  effen: 'Effen (fijn geweven)',
  linnen: 'Linnen (onregelmatige draad)',
  velours: 'Velours (zacht, met glans)',
  boucle: 'Bouclé (lusjes)',
  chenille: 'Chenille (zacht, ribbelig)',
  wol: 'Wol (gemêleerd)',
  rib: 'Rib (ribfluweel)',
  jacquard: 'Jacquard (patroon)',
  leder: 'Leder',
} as const;
export type Weefsel = keyof typeof WEEFSELS;

/** Weefsel van een materiaal: opgegeven, of afgeleid uit soort en naam. */
export function weefselVan(m: Pick<Materiaal, 'soort' | 'naam' | 'weefsel'>): Weefsel {
  if (m.weefsel && m.weefsel in WEEFSELS) return m.weefsel;
  if (m.soort === 'leder') return 'leder';
  const n = m.naam.toLowerCase();
  for (const [sleutel, woord] of [['linnen', 'linnen'], ['velours', 'velours'], ['boucle', 'bouclé'], ['boucle', 'boucle'], ['chenille', 'chenille'], ['wol', 'wol'], ['rib', 'rib'], ['jacquard', 'jacquard']] as const) {
    if (n.includes(woord)) return sleutel;
  }
  return 'effen';
}

/** Collectie van een materiaal: opgegeven, anders "Eigen materiaal", het weefsel of "Overige". */
export function collectieVan(m: Materiaal): string {
  if (m.collectie) return m.collectie;
  if (m.groep === 'EIGEN') return 'Eigen materiaal van de klant';
  if (m.eigen) return 'Zelf toegevoegd';
  const w = weefselVan(m);
  return w === 'effen' ? 'Overige' : WEEFSELS[w].split(' (')[0]!;
}

/** Kleurfamilies voor de filter op de stalenkaart. */
export const KLEURFAMILIES = ['wit & beige', 'geel & oker', 'bruin & camel', 'rood & roze', 'groen', 'blauw', 'grijs', 'zwart'] as const;
export type Kleurfamilie = (typeof KLEURFAMILIES)[number];

/** Kleurfamilie van een kleur (#rrggbb), afgeleid uit tint, verzadiging en lichtheid. */
export function kleurfamilie(hex: string): Kleurfamilie {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 'grijs';
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x!, 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  if (l < 0.2) return 'zwart';
  if (s < 0.12 || (s < 0.2 && l < 0.4)) return l > 0.8 ? 'wit & beige' : 'grijs';
  if (h < 15 || h >= 330) return 'rood & roze';
  if (h < 70 && l > 0.65 && s < 0.5) return 'wit & beige';
  if (h < 35) return 'bruin & camel';
  if (h < 70) return s > 0.45 && l > 0.3 ? 'geel & oker' : 'bruin & camel';
  if (h < 170) return 'groen';
  if (h < 260) return 'blauw';
  return 'rood & roze';
}

/**
 * Gebruiksklasse volgens de schuurweerstand (Martindale). Richtwaarden voor zitmeubelen, te bevestigen met de
 * maker en de leverancier: onder 10.000 decoratief, 10.000–15.000 licht, 15.000–25.000 normaal huiselijk,
 * 25.000–40.000 intensief huiselijk, vanaf 40.000 ook projecten (horeca, kantoor).
 */
export function gebruiksklasse(martindale: number | undefined): { klasse: string; zitmeubel: boolean } | undefined {
  if (!martindale || martindale <= 0) return undefined;
  if (martindale < 10000) return { klasse: 'decoratief (kussens, gordijnen)', zitmeubel: false };
  if (martindale < 15000) return { klasse: 'licht gebruik', zitmeubel: false };
  if (martindale < 25000) return { klasse: 'normaal huiselijk gebruik', zitmeubel: true };
  if (martindale < 40000) return { klasse: 'intensief huiselijk gebruik', zitmeubel: true };
  return { klasse: 'intensief gebruik, ook projecten (horeca, kantoor)', zitmeubel: true };
}

/** Korte stofkaart voor op het scherm en de offerte, bv. "Chivasso CH3112/051 · Martindale 50.000 · op de rol". */
export function stofkaart(m: Materiaal): string {
  const k = gebruiksklasse(m.martindale);
  return [
    [m.merk, m.artikel].filter(Boolean).join(' '),
    m.samenstelling,
    m.martindale ? `Martindale ${m.martindale.toLocaleString('nl-BE')}${k ? ` (${k.klasse})` : ''}` : '',
    `${m.rolbreedte} cm breed`,
    m.rapport ? `patroon ${m.rapport} cm` : 'effen',
    m.opDeRol ? 'op de rol te verwerken' : '',
  ].filter(Boolean).join(' · ');
}

/** Extra stof voor een patroonrapport (vuistregel, rapport in cm). */
export function patroonfactor(rapportCm: number): number {
  if (!rapportCm || rapportCm <= 0) return 1;
  if (rapportCm <= 35) return 1.1;
  if (rapportCm <= 60) return 1.15;
  if (rapportCm <= 68) return 1.2;
  if (rapportCm <= 96) return 1.25;
  return 1.3;
}

/** Maakt een unieke code uit een naam, bv. "Velours Oker" → "velours_oker". */
export function maakMateriaalCode(naam: string, bestaande: Materiaal[]): string {
  const basis =
    naam
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'materiaal';
  const codes = new Set(bestaande.map((m) => m.code));
  if (!codes.has(basis)) return basis;
  let n = 2;
  while (codes.has(`${basis}_${n}`)) n++;
  return `${basis}_${n}`;
}

/** Controleert een (nieuw of gewijzigd) materiaal. Geeft een lijst foutmeldingen terug (leeg = in orde). */
export function controleerMateriaal(m: Partial<Materiaal>, groepen: string[], bestaande: Materiaal[] = []): string[] {
  const fouten: string[] = [];
  if (!m.naam || !m.naam.trim()) fouten.push('Geef het materiaal een naam.');
  else if (m.naam.trim().length > 60) fouten.push('De naam mag hoogstens 60 tekens lang zijn.');
  if (m.naam && bestaande.some((b) => b.code !== m.code && b.naam.trim().toLowerCase() === m.naam!.trim().toLowerCase()))
    fouten.push(`Er bestaat al een materiaal met de naam "${m.naam.trim()}".`);
  if (m.soort !== 'stof' && m.soort !== 'leder') fouten.push('Kies stof of leder.');
  if (!m.groep || !groepen.includes(m.groep)) fouten.push(`Kies een prijsgroep (${groepen.join(', ')}).`);
  if (!m.kleur || !/^#[0-9a-fA-F]{6}$/.test(m.kleur)) fouten.push('Kies een kleur.');
  const getal = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
  if (!getal(m.rapport) || m.rapport! < 0 || m.rapport! > 300) fouten.push('Patroonrapport moet tussen 0 en 300 cm liggen (0 = effen).');
  if (!getal(m.rolbreedte) || m.rolbreedte! < 50 || m.rolbreedte! > 330) fouten.push('Rolbreedte moet tussen 50 en 330 cm liggen.');
  if (!getal(m.kostprijsPerM) || m.kostprijsPerM! < 0) fouten.push('Kostprijs per meter moet 0 of meer zijn.');
  if (!getal(m.toeslagPct) || m.toeslagPct! < 0 || m.toeslagPct! > 200) fouten.push('Toeslag moet tussen 0 en 200 % liggen.');
  return fouten;
}

/** Leest een lijst materialen uit JSON (bv. geplakt door de gebruiker). Ongeldige items worden overgeslagen. */
export function leesMaterialen(json: string, groepen: string[]): { materialen: Materiaal[]; overgeslagen: number } {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Dit is geen geldige JSON.');
  }
  if (!Array.isArray(data)) throw new Error('Verwacht een lijst materialen ([ … ]).');
  const materialen: Materiaal[] = [];
  let overgeslagen = 0;
  for (const item of data) {
    const m = item as Partial<Materiaal>;
    const kandidaat: Materiaal = {
      code: typeof m.code === 'string' && /^[a-z0-9_]{1,50}$/.test(m.code) ? m.code : maakMateriaalCode(String(m.naam ?? ''), materialen),
      naam: String(m.naam ?? '').trim(),
      soort: m.soort === 'leder' ? 'leder' : 'stof',
      groep: String(m.groep ?? ''),
      kleur: String(m.kleur ?? ''),
      rapport: Number(m.rapport ?? 0),
      rolbreedte: Number(m.rolbreedte ?? 140),
      kostprijsPerM: Number(m.kostprijsPerM ?? 0),
      toeslagPct: Number(m.toeslagPct ?? 0),
      eigen: m.eigen === true,
      ...(typeof m.merk === 'string' ? { merk: m.merk } : {}),
      ...(typeof m.artikel === 'string' ? { artikel: m.artikel } : {}),
      ...(typeof m.kwaliteit === 'string' ? { kwaliteit: m.kwaliteit } : {}),
      ...(typeof m.samenstelling === 'string' ? { samenstelling: m.samenstelling } : {}),
      ...(Number(m.martindale) > 0 ? { martindale: Number(m.martindale) } : {}),
      ...(m.opDeRol === true ? { opDeRol: true } : {}),
      ...(Number(m.kleurvarianten) > 0 ? { kleurvarianten: Number(m.kleurvarianten) } : {}),
      ...(typeof m.textuur === 'string' && /^(data:image\/|https:\/\/)/.test(m.textuur) ? { textuur: m.textuur } : {}),
      ...(Number(m.textuurCm) > 0 ? { textuurCm: Number(m.textuurCm) } : {}),
      ...(typeof m.collectie === 'string' && m.collectie.trim() ? { collectie: m.collectie.trim() } : {}),
      ...(typeof m.weefsel === 'string' && m.weefsel in WEEFSELS ? { weefsel: m.weefsel } : {}),
    };
    if (controleerMateriaal(kandidaat, groepen, materialen).length || materialen.some((x) => x.code === kandidaat.code)) overgeslagen++;
    else materialen.push(kandidaat);
  }
  return { materialen, overgeslagen };
}

/** Artikelcode in de stuklijst voor een materiaal. Eigen materiaal van de klant heeft geen artikel. */
export function materiaalArtikel(m: Materiaal): string {
  return m.groep === 'EIGEN' ? '' : `MAT-${m.code.toUpperCase()}`;
}
