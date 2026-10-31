/**
 * 3D-opbouw van een vrij zetelontwerp, als lijst eenvoudige blokken (in cm).
 * Het scherm rendert dit (bv. met three.js); de motor zelf heeft geen 3D-bibliotheek nodig.
 *
 * Assen: x = zoals het bovenaanzicht (links → rechts), z = diepte (achter → voor,
 * zoals y in het bovenaanzicht), y = hoogte vanaf de vloer.
 */
import type { Materiaal } from './materialen.js';
import { gekozenOpties, lokaalNaarWereld, voetafdruk, type Ontwerp, type OntwerpCatalogus, type OntwerpElement } from './ontwerp.js';

export type BlokSoort = 'stof' | 'kussen' | 'hout' | 'metaal' | 'donker';

export interface Blok {
  code: string;
  soort: BlokSoort;
  /** blok = (afgeronde) balk; cilinder/kegel = staand of liggend; bol = knoop. */
  vorm: 'blok' | 'cilinder' | 'kegel' | 'bol';
  /** Minimumhoek (x, y, z) en afmetingen (b langs x, h langs y, d langs z), in cm. */
  x: number;
  y: number;
  z: number;
  b: number;
  h: number;
  d: number;
  kleur: string;
  /** Afronding van de randen (cm), voor kussens en armen. */
  afronding?: number;
  /** Voor liggende cilinders (rolarm): de as. */
  as?: 'x' | 'y' | 'z';
  /** Kegel: verhouding onderste/bovenste straal. */
  taps?: number;
}

export interface Scene3D {
  blokken: Blok[];
  /** Omsluitend kader van de hele zetel. */
  kader: { x: number; z: number; b: number; d: number; h: number };
}

const RUG = 18;
const r2 = (x: number) => Math.round(x * 100) / 100;

function donkerder(hex: string, factor = 0.82): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * factor));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function bouw3D(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, materialen: Materiaal[]): Scene3D {
  const typen = new Map(catalogus.typen.map((t) => [t.code, t]));
  const mats = new Map(materialen.map((m) => [m.code, m]));
  const zetel = gekozenOpties(ontwerp, catalogus);
  const hout = String(zetel.get('hout')?.teken?.kleur ?? '#c8a27a');
  const metaal = String(zetel.get('metaal')?.teken?.kleur ?? '#2b2b2b');
  const zithoogte = Number(zetel.get('zithoogte')?.teken?.hoogte ?? 45);
  const blokken: Blok[] = [];

  for (const e of ontwerp.elementen) {
    const t = typen.get(e.type);
    if (!t) continue;
    const opt = gekozenOpties(ontwerp, catalogus, e);
    const te = (g: string, v: string, s: number | string | boolean) => opt.get(g)?.teken?.[v] ?? s;
    const m = (e.materiaal && mats.get(e.materiaal)) || mats.get(ontwerp.hoofdmateriaal);
    const stof = m?.kleur ?? '#cccccc';
    const B = e.breedte, D = e.diepte;

    /** Blok in lokale coördinaten (lx langs de breedte, ly van rug naar voor) → wereld. */
    const lokaal = (code: string, soort: BlokSoort, lx: number, ly: number, lb: number, ld: number, y: number, h: number, kleur: string, extra: Partial<Blok> = {}) => {
      if (lb <= 0 || ld <= 0 || h <= 0) return;
      const w = lokaalNaarWereld(e, lx, ly, lb, ld);
      blokken.push({ code: `${e.id}.${code}`, soort, vorm: 'blok', x: r2(w.x), y: r2(y), z: r2(w.y), b: r2(w.b), h: r2(h), d: r2(w.h), kleur, ...extra });
    };
    /** Liggende cilinder langs de diepte (lokaal ly), bv. een rolarm. */
    const rol = (code: string, lx: number, lb: number, y: number, kleur: string) => {
      const w = lokaalNaarWereld(e, lx, 0, lb, D);
      const langsX = e.rotatie === 90 || e.rotatie === 270;
      blokken.push({ code: `${e.id}.${code}`, soort: 'stof', vorm: 'cilinder', as: langsX ? 'x' : 'z', x: r2(w.x), y: r2(y), z: r2(w.y), b: r2(w.b), h: r2(lb), d: r2(w.h), kleur });
    };

    // --- Onderbouw ---
    const potVorm = String(te('poten', 'vorm', 'conisch'));
    const P = potVorm === 'plint' ? 4 : potVorm === 'verdekt' ? Math.min(Number(te('poothoogte', 'hoogte', 12)), 8) : Number(te('poothoogte', 'hoogte', 12));
    const potKleur = opt.get('poten')?.teken?.metaal ? String(opt.get('poten')?.teken?.kleur ?? metaal) : hout;
    const potSoort: BlokSoort = opt.get('poten')?.teken?.metaal ? 'metaal' : 'hout';
    if (t.tekenstijl !== 'console') {
      if (potVorm === 'plint') lokaal('plint', 'hout', 2, 2, B - 4, D - 4, 0, P, hout);
      else if (potVorm === 'verdekt') lokaal('verdekt', 'donker', 10, 10, B - 20, D - 20, 0, P, '#2a2a28');
      else if (potVorm === 'slede') {
        for (const [k, lx] of [['l', 5], ['r', B - 7]] as const) {
          lokaal(`slede-${k}-onder`, 'metaal', lx, 6, 2, D - 12, 0, 1.6, potKleur);
          lokaal(`slede-${k}-voor`, 'metaal', lx, D - 8, 2, 2, 0, P, potKleur);
          lokaal(`slede-${k}-achter`, 'metaal', lx, 6, 2, 2, 0, P, potKleur);
        }
      } else {
        const dik = potVorm === 'blok' ? 6 : potVorm === 'haarspeld' ? 1.2 : 4.5;
        const ins = Math.min(6, B / 5, D / 5);
        for (const [k, lx, ly] of [['la', ins, ins], ['ra', B - ins - dik, ins], ['lv', ins, D - ins - dik], ['rv', B - ins - dik, D - ins - dik]] as const) {
          const extra: Partial<Blok> = potVorm === 'blok' ? {} : { vorm: potVorm === 'conisch' ? 'kegel' : 'cilinder', taps: potVorm === 'conisch' ? 0.55 : 1 };
          lokaal(`poot-${k}`, potSoort, lx, ly, dik, dik, 0, P, potKleur, extra);
        }
      }
    }

    const zitting = opt.get('zitting')?.code ?? 'losse_kussens';
    const kussenDik = zitting === 'vaste_zitting' ? 0 : 14;
    const rugH = Number(te('rughoogte', 'hoogte', 80));
    const losseRug = opt.get('rug')?.teken?.los === true;
    const capitonne = opt.get('rug')?.teken?.capitonne === true;
    const frameRug = losseRug ? rugH - 10 : rugH;
    const donker = donkerder(stof);
    const basisH = zithoogte - kussenDik - P;

    switch (t.tekenstijl) {
      case 'zit':
      case 'hoek': {
        const hoek = t.tekenstijl === 'hoek';
        lokaal('rug', 'stof', 0, 0, B, RUG, P, frameRug - P, stof, { afronding: 4 });
        if (hoek) lokaal('rug2', 'stof', 0, RUG, RUG, D - RUG, P, frameRug - P, stof, { afronding: 4 });
        const sx = hoek ? RUG : 0;
        lokaal('basis', 'stof', sx, RUG, B - sx, D - RUG, P, basisH, donker, { afronding: 2 });
        if (kussenDik) lokaal('zitkussen', 'kussen', sx + 1, RUG, B - sx - 2, D - RUG - 1, zithoogte - kussenDik, kussenDik, stof, { afronding: 5 });
        if (losseRug) {
          lokaal('rugkussen', 'kussen', 2, RUG - 2, B - 4, 14, zithoogte, rugH - zithoogte, stof, { afronding: 6 });
          if (hoek) lokaal('rugkussen2', 'kussen', RUG - 2, RUG + 12, 14, D - RUG - 14, zithoogte, rugH - zithoogte, stof, { afronding: 6 });
        }
        if (capitonne) {
          const kolommen = Math.max(2, Math.round(B / 18));
          for (let r = 0; r < 2; r++)
            for (let k = 0; k < kolommen; k++) {
              const lx = (B / kolommen) * (k + 0.5) + (r % 2 ? B / kolommen / 2 : 0);
              if (lx > B - 4) continue;
              lokaal(`knoop-${r}-${k}`, 'donker', lx - 1, RUG - 0.6, 2, 1.2, zithoogte + 12 + r * 12, 2, donkerder(stof, 0.55), { vorm: 'bol' });
            }
        }
        const functie = String(te('functie', 'vorm', 'geen'));
        if (functie === 'hoofdsteun' || functie === 'relax_hoofdsteun') lokaal('hoofdsteun', 'kussen', 6, 2, B - 12, 14, rugH, 14, stof, { afronding: 5 });
        break;
      }
      case 'chaise':
      case 'zit_zonder_rug':
        lokaal('basis', 'stof', 0, 0, B, D, P, basisH, donker, { afronding: 2 });
        if (kussenDik) lokaal('zitkussen', 'kussen', 1, 1, B - 2, D - 2, zithoogte - kussenDik, kussenDik, stof, { afronding: 6 });
        break;
      case 'poef':
        lokaal('poef', 'kussen', 0, 0, B, D, P, zithoogte - 2 - P, stof, { afronding: 7 });
        break;
      case 'arm': {
        const armH = Number(te('armhoogte', 'hoogte', 62));
        const vorm = String(te('armstijl', 'vorm', 'strak'));
        if (vorm === 'hout') lokaal('arm', 'hout', 0, 0, B, D, P, armH - P, hout, { afronding: 1 });
        else if (vorm === 'rond' || vorm === 'engels') {
          const top = vorm === 'engels' ? armH - 8 : armH;
          lokaal('arm', 'stof', 0, 0, B, D, P, top - P - B / 2, stof, { afronding: 2 });
          rol('rol', -1, B + 2, top - B / 2 - 1, stof);
        } else if (vorm === 'schuin') {
          lokaal('arm', 'stof', 0, 0, B, D, P, armH - P - 5, stof, { afronding: 6 });
        } else {
          lokaal('arm', 'stof', 0, 0, B, D, P, armH - P, stof, { afronding: 3 });
        }
        if (vorm === 'houtblad') lokaal('blad', 'hout', -1, -1, B + 2, D + 2, armH, 3.5, hout, { afronding: 0.8 });
        break;
      }
      case 'console': {
        const ch = zithoogte + 10;
        const uitvoering = String(te('console_uitvoering', 'vorm', 'open'));
        lokaal('console', 'hout', 0, 0, B, D, 0, ch, hout, { afronding: 0.8 });
        if (uitvoering === 'open') lokaal('vak', 'donker', 4, D - 30, B - 8, 30.2, 12, ch - 20, donkerder(hout, 0.5));
        if (uitvoering === 'lade') lokaal('lade', 'hout', 3, D - 0.2, B - 6, 1, ch - 16, 12, donkerder(hout, 0.9));
        if (uitvoering === 'lader') lokaal('lader', 'donker', B / 2 - 6, D / 2 - 6, 12, 12, ch, 0.4, '#222');
        break;
      }
    }
  }

  const afdrukken = ontwerp.elementen.map(voetafdruk);
  const x0 = afdrukken.length ? Math.min(...afdrukken.map((p) => p.x)) : 0;
  const z0 = afdrukken.length ? Math.min(...afdrukken.map((p) => p.y)) : 0;
  const x1 = afdrukken.length ? Math.max(...afdrukken.map((p) => p.x + p.b)) : 100;
  const z1 = afdrukken.length ? Math.max(...afdrukken.map((p) => p.y + p.h)) : 100;
  const h = blokken.length ? Math.max(...blokken.map((b) => b.y + b.h)) : 80;
  return { blokken, kader: { x: x0, z: z0, b: x1 - x0, d: z1 - z0, h } };
}

/** Handig voor tests: de blokken van één element. */
export const blokkenVan = (s: Scene3D, e: Pick<OntwerpElement, 'id'>) => s.blokken.filter((b) => b.code.startsWith(`${e.id}.`));
