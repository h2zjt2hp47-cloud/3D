/**
 * Werf: inmeting van een opening (bestelmaat, haaksheid, afwijkingen) en meerwerk
 * (verschil tussen de offerte waarvoor de klant tekende en de huidige toestand).
 */

export interface Meting {
  /** Breedte van de opening boven, midden en onder (mm). */
  breedtes: (number | null)[];
  /** Hoogte links en rechts (mm). */
  hoogtes: (number | null)[];
  /** Diagonalen (mm), om te zien of de opening haaks is. */
  diagonalen: (number | null)[];
  /** Montagespeling per zijde (mm). */
  speling: number;
}

export interface MetingResultaat {
  compleet: boolean;
  bestelB?: number;
  bestelH?: number;
  verschilB?: number;
  verschilH?: number;
  /** Grootste verschil tussen de breedtes of hoogtes (mm). */
  afwijking?: number;
  diagonaalVerschil?: number;
  meldingen: { ernst: 'fout' | 'waarschuwing'; tekst: string }[];
}

const getallen = (l: (number | null)[]) => l.filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0);

/** Bestelmaat = kleinste gemeten maat min de speling (breedte aan beide kanten, hoogte boven). */
export function verwerkMeting(m: Meting, besteld: { b: number; h: number }): MetingResultaat {
  const b = getallen(m.breedtes), h = getallen(m.hoogtes), d = getallen(m.diagonalen);
  const meldingen: MetingResultaat['meldingen'] = [];
  if (b.length < m.breedtes.length || h.length < m.hoogtes.length) {
    return { compleet: false, meldingen: [{ ernst: 'waarschuwing', tekst: `Nog ${m.breedtes.length - b.length + m.hoogtes.length - h.length} maat/maten in te vullen.` }] };
  }
  const bestelB = Math.min(...b) - 2 * m.speling, bestelH = Math.min(...h) - m.speling;
  const afwijking = Math.max(Math.max(...b) - Math.min(...b), Math.max(...h) - Math.min(...h));
  const diagonaalVerschil = d.length === 2 ? Math.abs(d[0]! - d[1]!) : undefined;
  if (afwijking > 10) meldingen.push({ ernst: 'waarschuwing', tekst: `De metingen verschillen ${afwijking} mm: de opening is niet recht. Controleer of de bestelmaat volstaat.` });
  if (diagonaalVerschil !== undefined && diagonaalVerschil > 6) meldingen.push({ ernst: 'waarschuwing', tekst: `Diagonalen verschillen ${diagonaalVerschil} mm: de opening is niet haaks.` });
  const verschilB = bestelB - besteld.b, verschilH = bestelH - besteld.h;
  if (Math.abs(verschilB) > 20 || Math.abs(verschilH) > 20) meldingen.push({ ernst: 'waarschuwing', tekst: `Bestelmaat wijkt meer dan 2 cm af van de offerte (${verschilB >= 0 ? '+' : ''}${verschilB} × ${verschilH >= 0 ? '+' : ''}${verschilH} mm): meer- of minwerk.` });
  if (bestelB < besteld.b - 100 || bestelH < besteld.h - 100) meldingen.push({ ernst: 'fout', tekst: 'De opening is meer dan 10 cm kleiner dan voorzien: overleg met de klant vóór bestelling.' });
  return { compleet: true, bestelB, bestelH, verschilB, verschilH, afwijking, diagonaalVerschil, meldingen };
}

// ---------- meerwerk ----------

export interface MomentopnamePositie {
  id: string;
  code: string;
  naam: string;
  aantal: number;
  stukprijs: number;
  /** "Label: waarde" per gekozen kenmerk (samenvatting van de configuratie). */
  details: string[];
}
export interface MomentopnameRegel { code: string; omschrijving: string; eenheid: string; hoeveelheid: number; eenheidsprijs: number }
export interface Momentopname { posities: MomentopnamePositie[]; regels: MomentopnameRegel[] }

export interface MeerwerkLijn {
  soort: 'nieuw' | 'vervallen' | 'gewijzigd';
  code: string;
  omschrijving: string;
  wijzigingen: string[];
  /** Positief = meerwerk, negatief = minwerk (excl. btw). */
  bedrag: number;
}

const rond = (x: number) => Math.round(x * 100) / 100;

function details(lijst: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const d of lijst) {
    const i = d.indexOf(': ');
    if (i > 0) m.set(d.slice(0, i), d.slice(i + 2));
  }
  return m;
}

/** Wat is er veranderd sinds het akkoord? Per positie en per regel, met het bedrag. */
export function vergelijkOfferte(oud: Momentopname, nieuw: Momentopname): MeerwerkLijn[] {
  const uit: MeerwerkLijn[] = [];
  const nieuwP = new Map(nieuw.posities.map((p) => [p.id, p]));
  const oudP = new Map(oud.posities.map((p) => [p.id, p]));
  for (const o of oud.posities) {
    const n = nieuwP.get(o.id);
    if (!n) { uit.push({ soort: 'vervallen', code: o.code, omschrijving: o.naam, wijzigingen: ['Positie vervallen'], bedrag: rond(-o.stukprijs * o.aantal) }); continue; }
    const wijzigingen: string[] = [];
    if (n.aantal !== o.aantal) wijzigingen.push(`Aantal: ${o.aantal} → ${n.aantal}`);
    const a = details(o.details), b = details(n.details);
    for (const [label, waarde] of b) if (a.has(label) && a.get(label) !== waarde) wijzigingen.push(`${label}: ${a.get(label)} → ${waarde}`);
    for (const [label, waarde] of b) if (!a.has(label)) wijzigingen.push(`${label}: ${waarde} (nieuw)`);
    for (const [label, waarde] of a) if (!b.has(label)) wijzigingen.push(`${label}: ${waarde} (vervallen)`);
    const bedrag = rond(n.stukprijs * n.aantal - o.stukprijs * o.aantal);
    if (wijzigingen.length || Math.abs(bedrag) >= 0.01) uit.push({ soort: 'gewijzigd', code: n.code, omschrijving: n.naam, wijzigingen, bedrag });
  }
  for (const n of nieuw.posities) {
    if (!oudP.has(n.id)) uit.push({ soort: 'nieuw', code: n.code, omschrijving: n.naam, wijzigingen: [`Nieuwe positie (${n.aantal} st.)`], bedrag: rond(n.stukprijs * n.aantal) });
  }
  const oudR = new Map(oud.regels.map((r) => [r.code, r]));
  const nieuwR = new Map(nieuw.regels.map((r) => [r.code, r]));
  for (const [code, r] of new Map([...oudR, ...nieuwR])) {
    const a = oudR.get(code), b = nieuwR.get(code);
    const oudT = a ? a.hoeveelheid * a.eenheidsprijs : 0, nieuwT = b ? b.hoeveelheid * b.eenheidsprijs : 0;
    if (Math.abs(nieuwT - oudT) < 0.01) continue;
    const wijziging = a && b ? `${a.hoeveelheid} → ${b.hoeveelheid} ${r.eenheid}` : a ? 'vervallen' : `nieuw: ${b!.hoeveelheid} ${r.eenheid}`;
    uit.push({ soort: !a ? 'nieuw' : !b ? 'vervallen' : 'gewijzigd', code: 'afwerking', omschrijving: r.omschrijving, wijzigingen: [wijziging], bedrag: rond(nieuwT - oudT) });
  }
  return uit;
}
