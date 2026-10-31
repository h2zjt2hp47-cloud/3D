/**
 * Controle van een (door de gebruiker aangepaste) catalogus: elementtypes, optiegroepen en keuzes.
 * Bedoeld voor de catalogus-editor: toont in gewone taal wat er niet klopt.
 */
import type { ModelDefinitie, OntwerpCatalogus } from './ontwerp.js';

const TEKENSTIJLEN = ['zit', 'hoek', 'chaise', 'arm', 'poef', 'zit_zonder_rug', 'console', 'rond', 'kuip', 'rugleuning', 'kussen', 'rolkussen'];

export const tekenstijlen = TEKENSTIJLEN;

/** Maakt een unieke code (kleine letters, cijfers, _) uit een naam. */
export function maakCode(naam: string, bestaande: Iterable<string>): string {
  const basis =
    naam.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'nieuw';
  const codes = new Set(bestaande);
  if (!codes.has(basis)) return basis;
  let n = 2;
  while (codes.has(`${basis}_${n}`)) n++;
  return `${basis}_${n}`;
}

export function controleerCatalogus(c: OntwerpCatalogus, modellen: ModelDefinitie[] = []): string[] {
  const p: string[] = [];
  const getal = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
  const typeCodes = new Set<string>();
  for (const t of c.typen) {
    const naam = t.label || t.code;
    if (!t.code || !/^[a-z0-9_]+$/.test(t.code)) p.push(`Element "${naam}": ongeldige code.`);
    if (typeCodes.has(t.code)) p.push(`Element "${naam}": code "${t.code}" bestaat al.`);
    typeCodes.add(t.code);
    if (!t.label?.trim()) p.push(`Element "${t.code}": geef een naam.`);
    if (!TEKENSTIJLEN.includes(t.tekenstijl)) p.push(`Element "${naam}": onbekende vorm "${t.tekenstijl}".`);
    for (const [veld, b] of [['breedte', t.breedte], ['diepte', t.diepte]] as const) {
      if (!b || ![b.min, b.max, b.standaard].every(getal) || b.min <= 0) p.push(`Element "${naam}": ${veld} moet getallen groter dan 0 hebben.`);
      else if (!(b.min <= b.standaard && b.standaard <= b.max)) p.push(`Element "${naam}": ${veld} moet min ≤ standaard ≤ max zijn (${b.min} – ${b.standaard} – ${b.max}).`);
    }
    for (const g of c.groepen) {
      if (!getal(t.prijs?.[g])) p.push(`Element "${naam}": prijs voor groep ${g} ontbreekt.`);
      if (!getal(t.per10cm?.[g])) p.push(`Element "${naam}": meerprijs per 10 cm voor groep ${g} ontbreekt.`);
    }
    for (const veld of ['stofVast', 'stofPerM', 'kostVast', 'kostPerM', 'uren', 'urenPerM'] as const)
      if (!getal(t[veld]) || t[veld] < 0) p.push(`Element "${naam}": ${veld} moet 0 of meer zijn.`);
    if (t.hoogte !== undefined && (!getal(t.hoogte) || t.hoogte <= 0)) p.push(`Element "${naam}": hoogte moet groter dan 0 zijn.`);
  }

  const groepCodes = new Set<string>();
  const keuzesVan = new Map<string, Set<string>>();
  for (const g of c.opties ?? []) {
    if (!g.code || !/^[a-z0-9_]+$/.test(g.code)) p.push(`Optiegroep "${g.label}": ongeldige code.`);
    if (groepCodes.has(g.code)) p.push(`Optiegroep "${g.label}": code "${g.code}" bestaat al.`);
    groepCodes.add(g.code);
    if (!g.label?.trim()) p.push(`Optiegroep "${g.code}": geef een naam.`);
    if (g.niveau !== 'ontwerp' && g.niveau !== 'element') p.push(`Optiegroep "${g.label}": kies "hele zetel" of "per element".`);
    if (!g.keuzes.length) p.push(`Optiegroep "${g.label}": voeg minstens één keuze toe.`);
    const kc = new Set<string>();
    for (const k of g.keuzes) {
      if (!k.code || !/^[a-z0-9_]+$/.test(k.code)) p.push(`Optiegroep "${g.label}": keuze "${k.label}" heeft een ongeldige code.`);
      if (kc.has(k.code)) p.push(`Optiegroep "${g.label}": keuze "${k.code}" komt dubbel voor.`);
      kc.add(k.code);
      if (!k.label?.trim()) p.push(`Optiegroep "${g.label}": een keuze heeft geen naam.`);
      for (const veld of ['prijs', 'prijsPerM', 'pct', 'stofPct', 'kost', 'kostPerM'] as const)
        if (k[veld] !== undefined && !getal(k[veld])) p.push(`Optiegroep "${g.label}", keuze "${k.label}": ${veld} is geen getal.`);
    }
    keuzesVan.set(g.code, kc);
    if (g.keuzes.length && !kc.has(g.standaard)) p.push(`Optiegroep "${g.label}": de standaardkeuze "${g.standaard}" bestaat niet.`);
    for (const t of g.voorTypen ?? []) if (!typeCodes.has(t)) p.push(`Optiegroep "${g.label}": element "${t}" bestaat niet.`);
  }
  for (const g of c.opties ?? [])
    for (const k of g.keuzes)
      for (const [andere, lijst] of Object.entries(k.alleenMet ?? {})) {
        if (!keuzesVan.has(andere)) p.push(`Optiegroep "${g.label}", keuze "${k.label}": voorwaarde verwijst naar onbekende groep "${andere}".`);
        else for (const x of lijst) if (!keuzesVan.get(andere)!.has(x)) p.push(`Optiegroep "${g.label}", keuze "${k.label}": voorwaarde verwijst naar onbekende keuze "${x}" in "${andere}".`);
      }

  const modelCodes = new Set<string>();
  for (const m of modellen) {
    if (modelCodes.has(m.code)) p.push(`Model "${m.naam}": code "${m.code}" bestaat al.`);
    modelCodes.add(m.code);
    for (const e of m.ontwerp.elementen) if (!typeCodes.has(e.type)) p.push(`Model "${m.naam}": gebruikt element "${e.type}" dat niet (meer) bestaat.`);
  }
  return p;
}
