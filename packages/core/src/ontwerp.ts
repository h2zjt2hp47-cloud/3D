/**
 * Vrij zetelontwerp: de gebruiker tekent zelf een opstelling uit elementen
 * (zitelement, hoekelement, chaise longue, arm, poef …) op een bovenaanzicht.
 * Elk element heeft eigen maten per cm, een draaiing en eventueel een eigen materiaal.
 *
 * berekenOntwerp() controleert het ontwerp (maten, overlap, losse elementen) en
 * berekent prijs, stofverbruik per materiaal, stuklijst en tekening.
 */
import { materiaalArtikel, patroonfactor, type Materiaal } from './materialen.js';
import type { Melding, StuklijstResultaat, TekeningResultaat, VormResultaat } from './types.js';

export type Rotatie = 0 | 90 | 180 | 270;

export interface Bereik {
  min: number;
  max: number;
  standaard: number;
}

/** Hoe een element getekend wordt (waar de rug zit, afgerond of niet). */
export type Tekenstijl = 'zit' | 'hoek' | 'chaise' | 'arm' | 'poef' | 'zit_zonder_rug';

export interface ElementType {
  code: string;
  label: string;
  /** Breedte (cm) = de kant met de rug; diepte (cm) = van rug naar voorkant. */
  breedte: Bereik;
  diepte: Bereik;
  tekenstijl: Tekenstijl;
  /** Verkoopprijs bij minimale breedte en standaarddiepte, per prijsgroep. */
  prijs: Record<string, number>;
  /** Meerprijs per begonnen 10 cm boven de minimale breedte, per prijsgroep. */
  per10cm: Record<string, number>;
  /** Stofverbruik (m bij 140 cm rolbreedte): vast + per meter breedte. */
  stofVast: number;
  stofPerM: number;
  /** Kostprijs frame en vulling: vast + per meter breedte. */
  kostVast: number;
  kostPerM: number;
  /** Atelieruren: vast + per meter breedte. */
  uren: number;
  urenPerM: number;
}

export interface OntwerpCatalogus {
  naam: string;
  /** Prijsgroepen, bv. A, B, C, EIGEN. */
  groepen: string[];
  typen: ElementType[];
  /** Meerprijs in % per begonnen 10 cm extra diepte boven de standaarddiepte. */
  diepteToeslagPctPer10cm: number;
  uurloon: number;
  btwProcent: number;
  /** Totale breedte waarboven een waarschuwing voor levering verschijnt. */
  leveringWaarschuwingVanaf?: number;
}

export interface OntwerpElement {
  id: string;
  type: string;
  /** Linkerbovenhoek van de voetafdruk in het bovenaanzicht (cm). */
  x: number;
  y: number;
  breedte: number;
  diepte: number;
  /** 0 = rug boven, 90 = rug rechts, 180 = rug onder, 270 = rug links. */
  rotatie: Rotatie;
  /** Eigen materiaal voor dit element; anders het hoofdmateriaal. */
  materiaal?: string;
}

export interface Ontwerp {
  hoofdmateriaal: string;
  elementen: OntwerpElement[];
}

export interface OntwerpMelding extends Melding {
  elementId?: string;
}

export interface ElementResultaat {
  id: string;
  type: string;
  label: string;
  breedte: number;
  diepte: number;
  materiaal: string;
  groep: string;
  prijs: number;
  stofM: number;
}

export interface OntwerpResultaat {
  geldig: boolean;
  meldingen: OntwerpMelding[];
  elementen: ElementResultaat[];
  afmetingen: { breedte: number; diepte: number; x: number; y: number };
  stof: { materiaal: string; naam: string; meters: number }[];
  stuklijst: StuklijstResultaat[];
  prijs: {
    kostprijs: number;
    brutoprijsExcl: number;
    kortingProcent: number;
    verkoopprijsExcl: number;
    margeProcent: number | null;
    btw: number;
    verkoopprijsIncl: number;
  };
  tekening: TekeningResultaat;
}

const rond = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

/** De voetafdruk van een element in het bovenaanzicht (rekening houdend met draaiing). */
export function voetafdruk(e: Pick<OntwerpElement, 'x' | 'y' | 'breedte' | 'diepte' | 'rotatie'>) {
  const liggend = e.rotatie === 0 || e.rotatie === 180;
  return { x: e.x, y: e.y, b: liggend ? e.breedte : e.diepte, h: liggend ? e.diepte : e.breedte };
}

/** Overlapping (oppervlak > 0,5 cm in beide richtingen). */
function overlappen(a: OntwerpElement, b: OntwerpElement): boolean {
  const p = voetafdruk(a), q = voetafdruk(b);
  const ox = Math.min(p.x + p.b, q.x + q.b) - Math.max(p.x, q.x);
  const oy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
  return ox > 0.5 && oy > 0.5;
}

/** Raken twee elementen elkaar (afstand ≤ 1 cm, met een gemeenschappelijke rand)? */
function raken(a: OntwerpElement, b: OntwerpElement): boolean {
  const p = voetafdruk(a), q = voetafdruk(b);
  const gx = Math.max(p.x, q.x) - Math.min(p.x + p.b, q.x + q.b);
  const gy = Math.max(p.y, q.y) - Math.min(p.y + p.h, q.y + q.h);
  return gx <= 1 && gy <= 1 && !(gx > 0 && gy > 0);
}

/** Donkerdere tint voor rug en armen. */
function donkerder(hex: string, factor = 0.86): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * factor));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Zet een rechthoek in lokale coördinaten (breedte × diepte, rug boven) om naar het bovenaanzicht. */
function lokaalNaarWereld(e: OntwerpElement, lx: number, ly: number, lb: number, lh: number) {
  const B = e.breedte, D = e.diepte;
  switch (e.rotatie) {
    case 90: // rug rechts
      return { x: e.x + (D - ly - lh), y: e.y + lx, b: lh, h: lb };
    case 180: // rug onder
      return { x: e.x + (B - lx - lb), y: e.y + (D - ly - lh), b: lb, h: lh };
    case 270: // rug links
      return { x: e.x + ly, y: e.y + (B - lx - lb), b: lh, h: lb };
    default:
      return { x: e.x + lx, y: e.y + ly, b: lb, h: lh };
  }
}

const RUG = 18;

function tekenElement(e: OntwerpElement, stijl: Tekenstijl, kleur: string): VormResultaat[] {
  const B = e.breedte, D = e.diepte;
  const donker = donkerder(kleur);
  const delen: [string, number, number, number, number, string, number][] = [];
  switch (stijl) {
    case 'zit':
      delen.push(['rug', 0, 0, B, RUG, donker, 3], ['kussen', 2, RUG + 1, B - 4, D - RUG - 3, kleur, 4]);
      break;
    case 'hoek':
      delen.push(['rug', 0, 0, B, RUG, donker, 3], ['rug2', 0, RUG, RUG, D - RUG, donker, 3], ['kussen', RUG + 1, RUG + 1, B - RUG - 3, D - RUG - 3, kleur, 4]);
      break;
    case 'chaise':
      delen.push(['kussen', 1, 1, B - 2, D - 2, kleur, 6]);
      break;
    case 'arm':
      delen.push(['arm', 0, 0, B, D, donker, Math.min(B, D) / 3]);
      break;
    case 'poef':
      delen.push(['poef', 0, 0, B, D, kleur, Math.min(B, D) / 5]);
      break;
    case 'zit_zonder_rug':
      delen.push(['kussen', 1, 1, B - 2, D - 2, kleur, 4]);
      break;
  }
  return delen
    .filter(([, , , b, h]) => b > 0 && h > 0)
    .map(([code, lx, ly, lb, lh, vulling, afronding]) => {
      const w = lokaalNaarWereld(e, lx, ly, lb, lh);
      return { code: `${e.id}.${code}`, x: rond(w.x), y: rond(w.y), breedte: rond(w.b), hoogte: rond(w.h), vulling, afronding: rond(afronding) };
    });
}

/**
 * Prijs, stof, stuklijst en tekening van een vrij ontwerp.
 * Prijs per element = prijs[groep] + begonnen 10 cm boven min. breedte × per10cm[groep],
 * + diepte-toeslag, × (1 + materiaaltoeslag).
 */
export function berekenOntwerp(
  ontwerp: Ontwerp,
  catalogus: OntwerpCatalogus,
  materialen: Materiaal[],
  opties: { kortingProcent?: number } = {},
): OntwerpResultaat {
  const meldingen: OntwerpMelding[] = [];
  const typen = new Map(catalogus.typen.map((t) => [t.code, t]));
  const mats = new Map(materialen.map((m) => [m.code, m]));
  const hoofd = mats.get(ontwerp.hoofdmateriaal);
  if (!hoofd) meldingen.push({ code: 'materiaal.onbekend', ernst: 'fout', melding: 'Kies een hoofdmateriaal.' });

  if (ontwerp.elementen.length === 0)
    meldingen.push({ code: 'ontwerp.leeg', ernst: 'fout', melding: 'Voeg minstens één element toe of teken er een.' });

  const elementen: ElementResultaat[] = [];
  const vormen: VormResultaat[] = [];
  const stofPerMat = new Map<string, number>();
  const stuk = new Map<string, StuklijstResultaat>();
  let kostprijs = 0;
  let bruto = 0;

  const telStuk = (artikel: string, omschrijving: string, eenheid: StuklijstResultaat['eenheid'], hoeveelheid: number, kostPerEenheid: number) => {
    const b = stuk.get(artikel);
    if (b) {
      b.hoeveelheid = rond(b.hoeveelheid + hoeveelheid, 3);
      b.aantal = b.hoeveelheid;
      b.kost = rond(b.hoeveelheid * kostPerEenheid);
    } else {
      stuk.set(artikel, {
        code: artikel, omschrijving, artikel, eenheid, aantal: rond(hoeveelheid, 3), hoeveelheid: rond(hoeveelheid, 3),
        kostprijsPerEenheid: kostPerEenheid, kost: rond(hoeveelheid * kostPerEenheid), zaaglijst: false,
      });
    }
  };

  ontwerp.elementen.forEach((e, n) => {
    const t = typen.get(e.type);
    const naam = `${t?.label ?? e.type} ${n + 1}`;
    if (!t) {
      meldingen.push({ code: 'element.type', ernst: 'fout', elementId: e.id, melding: `${naam}: onbekend elementtype.` });
      return;
    }
    const m = (e.materiaal && mats.get(e.materiaal)) || hoofd;
    if (e.materiaal && !mats.has(e.materiaal))
      meldingen.push({ code: 'element.materiaal', ernst: 'fout', elementId: e.id, melding: `${naam}: het gekozen materiaal bestaat niet meer.` });
    for (const [veld, bereik, label] of [['breedte', t.breedte, 'breedte'], ['diepte', t.diepte, 'diepte']] as const) {
      const w = e[veld];
      if (!Number.isFinite(w) || w < bereik.min || w > bereik.max)
        meldingen.push({ code: `element.${veld}`, ernst: 'fout', elementId: e.id, melding: `${naam}: ${label} moet tussen ${bereik.min} en ${bereik.max} cm liggen (nu ${rond(w, 1)} cm).` });
    }

    const groep = m?.groep ?? catalogus.groepen[0]!;
    const basis = t.prijs[groep];
    const per10 = t.per10cm[groep];
    let prijs = 0;
    if (basis === undefined || per10 === undefined) {
      meldingen.push({ code: 'element.prijs', ernst: 'fout', elementId: e.id, melding: `${naam}: geen prijs voor prijsgroep ${groep}.` });
    } else {
      const extra10 = Math.max(0, Math.ceil((e.breedte - t.breedte.min) / 10 - 1e-9));
      const diepte10 = Math.max(0, Math.ceil((e.diepte - t.diepte.standaard) / 10 - 1e-9));
      prijs = (basis + extra10 * per10) * (1 + (diepte10 * catalogus.diepteToeslagPctPer10cm) / 100) * (1 + (m?.toeslagPct ?? 0) / 100);
      prijs = rond(prijs);
    }
    bruto += prijs;

    const meterBreedte = e.breedte / 100;
    const stofM = m
      ? (t.stofVast + t.stofPerM * meterBreedte) * (e.diepte / t.diepte.standaard) * patroonfactor(m.rapport) * (140 / m.rolbreedte)
      : 0;
    if (m) stofPerMat.set(m.code, (stofPerMat.get(m.code) ?? 0) + stofM);

    const frameKost = t.kostVast + t.kostPerM * meterBreedte;
    const uren = t.uren + t.urenPerM * meterBreedte;
    telStuk(`FRAME-${t.code.toUpperCase()}`, `Frame en vulling ${t.label.toLowerCase()}`, 'stuk', 1, rond(frameKost));
    telStuk('ARB-ATELIER', 'Atelier (stofferen, naaien)', 'uur', uren, catalogus.uurloon);
    kostprijs += frameKost + uren * catalogus.uurloon;

    elementen.push({ id: e.id, type: t.code, label: t.label, breedte: e.breedte, diepte: e.diepte, materiaal: m?.code ?? '', groep, prijs, stofM: rond(stofM, 2) });
    vormen.push(...tekenElement(e, t.tekenstijl, m?.kleur ?? '#cccccc'));
  });

  // Stof per materiaal (afgerond op 0,1 m) in de stuklijst.
  const stof = [...stofPerMat].map(([code, meters]) => {
    const m = mats.get(code)!;
    const mRond = Math.ceil(meters * 10 - 1e-9) / 10;
    const artikel = materiaalArtikel(m);
    if (artikel) telStuk(artikel, `${m.soort === 'leder' ? 'Leder' : 'Stof'} ${m.naam}`, 'lm', mRond, m.kostprijsPerM);
    kostprijs += artikel ? mRond * m.kostprijsPerM : 0;
    return { materiaal: code, naam: m.naam, meters: mRond };
  });
  if ([...stofPerMat.keys()].some((c) => mats.get(c)?.groep === 'EIGEN'))
    meldingen.push({ code: 'materiaal.eigen', ernst: 'waarschuwing', melding: 'Eigen materiaal van de klant: lever minstens het berekende verbruik aan.' });

  // Overlap en losse elementen.
  const el = ontwerp.elementen;
  for (let a = 0; a < el.length; a++) {
    for (let b = a + 1; b < el.length; b++) {
      if (overlappen(el[a]!, el[b]!))
        meldingen.push({ code: 'ontwerp.overlap', ernst: 'fout', elementId: el[b]!.id, melding: `Element ${a + 1} en element ${b + 1} overlappen. Schuif ze uit elkaar.` });
    }
  }
  if (el.length > 1) {
    el.forEach((e, n) => {
      // Een poef mag los staan.
      if (typen.get(e.type)?.tekenstijl === 'poef') return;
      if (!el.some((o) => o !== e && raken(e, o)))
        meldingen.push({ code: 'ontwerp.los', ernst: 'waarschuwing', elementId: e.id, melding: `Element ${n + 1} raakt geen ander element.` });
    });
  }

  // Afmetingen en maatlijnen.
  const afdrukken = el.map(voetafdruk);
  const x0 = afdrukken.length ? Math.min(...afdrukken.map((p) => p.x)) : 0;
  const y0 = afdrukken.length ? Math.min(...afdrukken.map((p) => p.y)) : 0;
  const x1 = afdrukken.length ? Math.max(...afdrukken.map((p) => p.x + p.b)) : 0;
  const y1 = afdrukken.length ? Math.max(...afdrukken.map((p) => p.y + p.h)) : 0;
  const afmetingen = { x: x0, y: y0, breedte: rond(x1 - x0, 1), diepte: rond(y1 - y0, 1) };
  if (catalogus.leveringWaarschuwingVanaf && afmetingen.breedte > catalogus.leveringWaarschuwingVanaf)
    meldingen.push({ code: 'ontwerp.levering', ernst: 'waarschuwing', melding: `Breder dan ${catalogus.leveringWaarschuwingVanaf} cm: levering in meerdere delen.` });

  const maatlijnen: TekeningResultaat['maatlijnen'] = el.length
    ? [
        { code: 'totaal_breedte', x1: x0, y1: y0, x2: x1, y2: y0, afstand: 14, tekst: `${afmetingen.breedte}` },
        { code: 'totaal_diepte', x1: x1, y1: y0, x2: x1, y2: y1, afstand: 14, tekst: `${afmetingen.diepte}` },
      ]
    : [];

  kostprijs = rond(kostprijs);
  bruto = rond(bruto);
  const kortingProcent = opties.kortingProcent ?? 0;
  const excl = rond(bruto * (1 - kortingProcent / 100));
  const btw = rond((excl * catalogus.btwProcent) / 100);

  return {
    geldig: !meldingen.some((m) => m.ernst === 'fout'),
    meldingen,
    elementen,
    afmetingen,
    stof,
    stuklijst: [...stuk.values()],
    prijs: {
      kostprijs,
      brutoprijsExcl: bruto,
      kortingProcent,
      verkoopprijsExcl: excl,
      margeProcent: excl > 0 ? rond(((excl - kostprijs) / excl) * 100, 1) : null,
      btw,
      verkoopprijsIncl: rond(excl + btw),
    },
    tekening: { titel: 'Vrij ontwerp — bovenaanzicht (cm)', eenheid: 'cm', vormen, maatlijnen },
  };
}
