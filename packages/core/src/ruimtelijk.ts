/**
 * 3D-opbouw van een vrij zetelontwerp, als lijst eenvoudige blokken (in cm).
 * Het scherm rendert dit (bv. met three.js); de motor zelf heeft geen 3D-bibliotheek nodig.
 *
 * Assen: x = zoals het bovenaanzicht (links → rechts), z = diepte (achter → voor,
 * zoals y in het bovenaanzicht), y = hoogte vanaf de vloer.
 */
import { weefselVan, type Materiaal } from './materialen.js';
import { dragerVan, gekozenOpties, hoogtesVan, materiaalVan, lokaalNaarWereld, voetafdruk, vormgevingVan, type Ontwerp, type OntwerpCatalogus, type OntwerpElement } from './ontwerp.js';

export type BlokSoort =
  | 'stof' | 'kussen' | 'hout' | 'metaal' | 'donker' | 'glas' | 'steen' | 'dak' | 'gevel' | 'planken'
  | 'tegel' | 'parket' | 'kunststof' | 'matglas'
  // Gevelbekleding: liggende planken, leien, zink met staande naad, natuursteen, sierpleister.
  | 'planken_h' | 'leien' | 'zink' | 'natuursteen' | 'pleister';

/** Zijde van een blok (balk), voor een ander materiaal op één zijvlak (bv. baksteen buiten, verf binnen). */
export type BlokZijde = 'x+' | 'x-' | 'z+' | 'z-' | 'y+';

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
  /** Achterover hellen (rug): graden en de richting naar achter in het grondvlak. */
  kantel?: { graden: number; richting: 'x+' | 'x-' | 'z+' | 'z-' };
  /** Ander materiaal per zijvlak (alleen voor rechte balken). */
  zijden?: Partial<Record<BlokZijde, { soort: BlokSoort; kleur: string; voeg?: string }>>;
  /** Voegkleur bij metselwerk (soort steen). */
  voeg?: string;
  /** Foto als textuur (bv. de stof) en hoeveel cm één tegel ervan is. */
  textuur?: string;
  textuurCm?: number;
  /** Soort weefsel van de stof (voor de structuur in de 3D als er geen foto is). */
  weefsel?: string;
  /** Kussens: afwerking van de randen (naad, bies of sierstiksel) en de kleur van de bies. */
  naad?: { soort: 'naad' | 'bies' | 'stiksel'; kleur: string };
}

export interface Scene3D {
  blokken: Blok[];
  /** Omsluitend kader van de hele zetel. */
  kader: { x: number; z: number; b: number; d: number; h: number };
}

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
  const zithoogte = hoogtesVan(ontwerp, catalogus).zithoogte;
  const blokken: Blok[] = [];

  for (const e of ontwerp.elementen) {
    const t = typen.get(e.type);
    if (!t) continue;
    const opt = gekozenOpties(ontwerp, catalogus, e);
    const te = (g: string, v: string, s: number | string | boolean) => opt.get(g)?.teken?.[v] ?? s;
    const m = mats.get(materiaalVan(ontwerp, catalogus, e)) || mats.get(ontwerp.hoofdmateriaal);
    const stof = m?.kleur ?? '#cccccc';
    const B = e.breedte, D = e.diepte;
    const eersteBlok = blokken.length;

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
    const P = potVorm === 'plint' ? 4 : potVorm === 'verdekt' ? Math.min(hoogtesVan(ontwerp, catalogus, e).poothoogte, 8) : hoogtesVan(ontwerp, catalogus, e).poothoogte;
    const potKleur = opt.get('poten')?.teken?.metaal ? String(opt.get('poten')?.teken?.kleur ?? metaal) : hout;
    const potSoort: BlokSoort = opt.get('poten')?.teken?.metaal ? 'metaal' : 'hout';
    const cilinderMidden = (code: string, soort: BlokSoort, y: number, h: number, diameterB: number, diameterD: number, kleur: string, extra: Partial<Blok> = {}) => {
      const p = voetafdruk(e);
      blokken.push({
        code: `${e.id}.${code}`, soort, vorm: 'cilinder', x: r2(p.x + (p.b - diameterB) / 2), y: r2(y), z: r2(p.y + (p.h - diameterD) / 2),
        b: r2(diameterB), h: r2(h), d: r2(diameterD), kleur, ...extra,
      });
    };
    if (t.opzet) {
      // geen poten: ligt op een ander element
    } else if (t.tekenstijl !== 'console' && potVorm === 'draaivoet') {
      const p = voetafdruk(e);
      cilinderMidden('draaivoet', 'metaal', 1.5, P - 1.5, Math.min(p.b, p.h) * 0.22, Math.min(p.b, p.h) * 0.22, '#2e2c2a');
      cilinderMidden('voetplaat', 'metaal', 0, 1.5, Math.min(p.b, p.h) * 0.55, Math.min(p.b, p.h) * 0.55, '#2e2c2a');
    } else if (t.tekenstijl !== 'console' && potVorm === 'housse') {
      lokaal('housse', 'stof', 0.3, 0.3, B - 0.6, D - 0.6, 0, P + 2, stof, { afronding: 1 });
    } else if (t.tekenstijl !== 'console') {
      if (potVorm === 'plint') lokaal('plint', 'hout', 2, 2, B - 4, D - 4, 0, P, hout);
      else if (potVorm === 'verdekt' && t.tekenstijl === 'rond') {
        // Onder een rond element: voet onder het rechte deel + ronde voet onder de bocht.
        const links = String(te('ronde_kant', 'kant', 'links')) === 'links';
        const r = Math.min(D / 2, B);
        if (B - r > 12) lokaal('verdekt', 'donker', links ? r : 10, 10, B - r - 10, D - 20, 0, P, '#2a2a28');
        const rr = Math.max(5, r - 14);
        const w = lokaalNaarWereld(e, (links ? r : B - r) - rr, D / 2 - rr, rr * 2, rr * 2);
        blokken.push({ code: `${e.id}.verdekt-rond`, soort: 'donker', vorm: 'cilinder', x: r2(w.x), y: 0, z: r2(w.y), b: r2(w.b), h: r2(P), d: r2(w.h), kleur: '#2a2a28' });
      } else if (potVorm === 'verdekt') lokaal('verdekt', 'donker', 10, 10, B - 20, D - 20, 0, P, '#2a2a28');
      else if (potVorm === 'slede') {
        for (const [k, lx] of [['l', 5], ['r', B - 7]] as const) {
          lokaal(`slede-${k}-onder`, 'metaal', lx, 6, 2, D - 12, 0, 1.6, potKleur);
          lokaal(`slede-${k}-voor`, 'metaal', lx, D - 8, 2, 2, 0, P, potKleur);
          lokaal(`slede-${k}-achter`, 'metaal', lx, 6, 2, 2, 0, P, potKleur);
        }
      } else {
        const dik = potVorm === 'blok' ? 6 : potVorm === 'haarspeld' ? 1.2 : 4.5;
        const ins = Math.min(6, B / 5, D / 5);
        // Bij een rond element staan de poten aan de ronde kant meer naar binnen.
        const rondL = t.tekenstijl === 'rond' && String(te('ronde_kant', 'kant', 'links')) === 'links';
        const rondR = t.tekenstijl === 'rond' && !rondL;
        const inL = rondL ? Math.min(D / 2, B) * 0.35 : ins;
        const inR = rondR ? Math.min(D / 2, B) * 0.35 : ins;
        const yIn = (rond: boolean) => (rond ? D * 0.2 : ins);
        for (const [k, lx, ly] of [['la', inL, yIn(rondL)], ['ra', B - inR - dik, yIn(rondR)], ['lv', inL, D - yIn(rondL) - dik], ['rv', B - inR - dik, D - yIn(rondR) - dik]] as const) {
          const extra: Partial<Blok> = potVorm === 'blok' ? {} : { vorm: potVorm === 'conisch' ? 'kegel' : 'cilinder', taps: potVorm === 'conisch' ? 0.55 : 1 };
          lokaal(`poot-${k}`, potSoort, lx, ly, dik, dik, 0, P, potKleur, extra);
        }
      }
    }

    const zitting = opt.get('zitting')?.code ?? 'losse_kussens';
    const v = vormgevingVan(ontwerp, e);
    const RUG = v.rugdikte;
    const kussenDik = zitting === 'vaste_zitting' ? 0 : v.kussendikte;
    const zacht = 1.5 + v.zachtheid * 0.9;
    const richting = ({ 0: 'z-', 90: 'x+', 180: 'z+', 270: 'x-' } as const)[e.rotatie];
    const rugExtra: Partial<Blok> = {
      afronding: v.rugvorm === 'rond' ? Math.min(14, RUG / 2 + 4) : 3 + v.zachtheid * 0.4,
      ...(v.rugvorm === 'hellend' ? { kantel: { graden: 9, richting } } : {}),
    };
    /** Zitkussens naast elkaar op het zitvlak. */
    const kussens = (lx: number, ly: number, lb: number, ld: number, y: number, h: number) => {
      const n = Math.max(1, Math.round(v.zitkussens));
      for (let i = 0; i < n; i++)
        lokaal(`zitkussen${n > 1 ? i + 1 : ''}`, 'kussen', lx + (i * lb) / n + (i ? 0.4 : 0), ly, lb / n - (i < n - 1 ? 0.8 : 0), ld, y, h, stof, { afronding: zacht });
    };
    const houtframe = (h: number) => {
      if (v.houtframe === 'geen') return;
      lokaal('frame-l', 'hout', 0, 0, 4, D, P, h - P, hout, { afronding: 0.8 });
      lokaal('frame-r', 'hout', B - 4, 0, 4, D, P, h - P, hout, { afronding: 0.8 });
      if (v.houtframe === 'rondom') lokaal('frame-v', 'hout', 4, D - 4, B - 8, 4, P, zithoogte - kussenDik + 2 - P, hout, { afronding: 0.8 });
    };
    const rugH = hoogtesVan(ontwerp, catalogus, e).rughoogte;
    const losseRug = opt.get('rug')?.teken?.los === true;
    const capitonne = opt.get('rug')?.teken?.capitonne === true;
    const frameRug = losseRug ? rugH - 10 : rugH;
    const donker = donkerder(stof);
    const basisH = zithoogte - kussenDik - P;

    switch (t.tekenstijl) {
      case 'zit':
      case 'hoek': {
        const hoek = t.tekenstijl === 'hoek';
        const fr = v.houtframe === 'geen' || hoek ? 0 : 4;
        lokaal('rug', 'stof', fr, 0, B - 2 * fr, RUG, P, frameRug - P, stof, rugExtra);
        if (hoek) lokaal('rug2', 'stof', 0, RUG, RUG, D - RUG, P, frameRug - P, stof, { afronding: rugExtra.afronding });
        const sx = hoek ? RUG : fr;
        lokaal('basis', 'stof', sx, RUG, B - sx - fr, D - RUG, P, basisH, donker, { afronding: 2 });
        if (kussenDik) kussens(sx + 1, RUG, B - sx - fr - 2, D - RUG - 1 - (v.houtframe === 'rondom' ? 4 : 0), zithoogte - kussenDik, kussenDik);
        if (!hoek) houtframe(zithoogte + 2);
        if (losseRug) {
          const n = Math.max(1, Math.round(v.zitkussens));
          for (let i = 0; i < n; i++)
            lokaal(`rugkussen${n > 1 ? i + 1 : ''}`, 'kussen', fr + 2 + (i * (B - 2 * fr - 4)) / n, RUG - 2, (B - 2 * fr - 4) / n - (i < n - 1 ? 0.8 : 0), 14, zithoogte, rugH - zithoogte, stof, { afronding: 2 + zacht, ...(v.rugvorm === 'hellend' ? { kantel: { graden: 9, richting } } : {}) });
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
        if (kussenDik) kussens(1, 1, B - 2, D - 2, zithoogte - kussenDik, kussenDik);
        houtframe(zithoogte + 2);
        break;
      case 'rond': {
        const links = String(te('ronde_kant', 'kant', 'links')) === 'links';
        const r = Math.min(D / 2, B);
        const recht = B - r;
        const cilinder = (code: string, soort: BlokSoort, y: number, h: number, rr: number, kleur: string) => {
          const w = lokaalNaarWereld(e, (links ? r : recht) - rr, D / 2 - rr, rr * 2, rr * 2);
          blokken.push({ code: `${e.id}.${code}`, soort, vorm: 'cilinder', x: r2(w.x), y: r2(y), z: r2(w.y), b: r2(w.b), h: r2(h), d: r2(w.h), kleur });
        };
        const rx = links ? r : 0;
        lokaal('basis', 'stof', rx, 0, recht, D, P, basisH, donker, { afronding: 2 });
        cilinder('basis-rond', 'stof', P, basisH, r, donker);
        if (kussenDik) {
          lokaal('zitkussen', 'kussen', rx, RUG, recht, D - RUG - 1, zithoogte - kussenDik, kussenDik, stof, { afronding: zacht });
          cilinder('zitkussen-rond', 'kussen', zithoogte - kussenDik, kussenDik, r - 1, stof);
        }
        if (recht > 0) lokaal('rug', 'stof', rx, 0, recht, RUG, P, frameRug - P, stof, rugExtra);
        break;
      }
      case 'poef': {
        const pv = String(te('poefvorm', 'vorm', 'kiezel'));
        const p = voetafdruk(e);
        if (pv === 'rond') cilinderMidden('poef', 'kussen', P, zithoogte - 2 - P, p.b, p.h, stof);
        else lokaal('poef', 'kussen', 0, 0, B, D, P, zithoogte - 2 - P, stof, { afronding: pv === 'vierkant' ? 3 : Math.min(B, D, zithoogte - P) / 2.5 });
        break;
      }
      case 'rugleuning':
      case 'kussen':
      case 'rolkussen': {
        const d = dragerVan(ontwerp, catalogus, e);
        const dt = d ? typen.get(d.type) : undefined;
        const vaste = d ? gekozenOpties(ontwerp, catalogus, d).get('zitting')?.code === 'vaste_zitting' : false;
        const basis = !d ? P : dt?.tekenstijl === 'poef' ? zithoogte - 2 : zithoogte - (vaste ? 0 : vormgevingVan(ontwerp, d).kussendikte);
        const kantelAchter = { graden: t.tekenstijl === 'rugleuning' ? 9 : 14, richting };
        if (t.tekenstijl === 'rugleuning') {
          const rugTop = Math.max(rugH, basis + 20);
          lokaal('rugleuning', 'stof', 0, 0, B, D, basis, rugTop - basis, stof, { afronding: Math.min(D / 2, 3 + v.zachtheid), ...(v.rugvorm === 'hellend' ? { kantel: kantelAchter } : {}) });
        } else if (t.tekenstijl === 'kussen') {
          const h = t.hoogte ?? Math.round(B * 0.9);
          lokaal('kussen', 'kussen', 0, 0, B, D, zithoogte - 2, h, stof, { afronding: Math.min(D / 2, 2 + v.zachtheid), kantel: kantelAchter });
        } else {
          const w = lokaalNaarWereld(e, 0, 0, B, D);
          const langsX = e.rotatie === 0 || e.rotatie === 180;
          blokken.push({ code: `${e.id}.rol`, soort: 'kussen', vorm: 'cilinder', as: langsX ? 'x' : 'z', x: r2(w.x), y: r2(zithoogte - 2), z: r2(w.y), b: r2(w.b), h: r2(D), d: r2(w.h), kleur: stof });
        }
        break;
      }
      case 'kuip': {
        const kv = String(te('kuipvorm', 'vorm', 'afgerond'));
        const p = voetafdruk(e);
        const armB = Math.max(10, Math.min(20, B * 0.16));
        if (kv === 'rond') {
          cilinderMidden('basis', 'stof', P, basisH, p.b, p.h, donker);
          if (kussenDik) cilinderMidden('zitkussen', 'kussen', zithoogte - kussenDik, kussenDik, p.b - 2 * armB + 4, p.h - 6, stof);
        } else {
          lokaal('basis', 'stof', 0, 0, B, D, P, basisH, donker, { afronding: kv === 'hoekig' ? 2 : 8 });
          if (kussenDik) lokaal('zitkussen', 'kussen', armB - 2, RUG - 2, B - 2 * armB + 4, D - RUG, zithoogte - kussenDik, kussenDik, stof, { afronding: zacht });
        }
        lokaal('rug', 'stof', 0, 0, B, RUG, P, rugH - P, stof, { afronding: kv === 'hoekig' ? 4 : Math.min(RUG / 2 + 6, 16), ...(rugExtra.kantel ? { kantel: rugExtra.kantel } : {}) });
        for (const [k, lx] of [['l', 0], ['r', B - armB]] as const)
          lokaal(`arm-${k}`, 'stof', lx, RUG / 2, armB, D * (kv === 'rond' ? 0.7 : 0.85) - RUG / 2, P, zithoogte + 16 - P, stof, { afronding: armB / 2 });
        break;
      }
      case 'arm': {
        const armH = hoogtesVan(ontwerp, catalogus, e).armhoogte;
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
        if (String(te('console_uitvoering', 'vorm', '')) === 'bank') {
          const bh = zithoogte - 14;
          lokaal('bankblad', 'hout', 0, 0, B, D, bh - 5, 5, hout, { afronding: 0.8 });
          lokaal('bankpoot-l', 'hout', 3, 3, 5, D - 6, 0, bh - 5, hout);
          lokaal('bankpoot-r', 'hout', B - 8, 3, 5, D - 6, 0, bh - 5, hout);
          break;
        }
        const ch = zithoogte + 10;
        const uitvoering = String(te('console_uitvoering', 'vorm', 'open'));
        lokaal('console', 'hout', 0, 0, B, D, 0, ch, hout, { afronding: 0.8 });
        if (uitvoering === 'open') lokaal('vak', 'donker', 4, D - 30, B - 8, 30.2, 12, ch - 20, donkerder(hout, 0.5));
        if (uitvoering === 'lade') lokaal('lade', 'hout', 3, D - 0.2, B - 6, 1, ch - 16, 12, donkerder(hout, 0.9));
        if (uitvoering === 'lader') lokaal('lader', 'donker', B / 2 - 6, D / 2 - 6, 12, 12, ch, 0.4, '#222');
        break;
      }
    }
    // Stoffoto als textuur op alle stofdelen van dit element (zitting, rug, armen, kussens).
    // Zonder foto: het weefsel (velours, bouclé, linnen …) zodat de structuur in de 3D klopt.
    // Kussens: naad langs de randen volgens de optie "Naden" (bies in dezelfde stof of contrast, sierstiksel).
    const naadTeken = opt.get('naad')?.teken;
    const naad: Blok['naad'] = naadTeken?.bies
      ? { soort: 'bies', kleur: naadTeken.contrast ? '#2b2622' : stof }
      : naadTeken?.stiksel ? { soort: 'stiksel', kleur: donkerder(stof, 0.6) } : { soort: 'naad', kleur: donkerder(stof, 0.7) };
    for (const b of blokken.slice(eersteBlok)) if (b.soort === 'kussen' && b.kleur === stof && (b.vorm ?? 'blok') === 'blok') b.naad = naad;
    if (m) for (const b of blokken.slice(eersteBlok)) if ((b.soort === 'stof' || b.soort === 'kussen') && b.kleur === stof) {
      if (m.textuur) { b.textuur = m.textuur; b.textuurCm = m.textuurCm ?? 15; }
      else b.weefsel = weefselVan(m);
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

/**
 * Verplaatst en draait blokken (in stappen van 90° rond de verticale as, met de klok mee
 * gezien van boven, met z naar voor). Handig om een raam of meubel in een plattegrond te zetten.
 */
export function plaatsBlokken(blokken: Blok[], plaats: { x: number; y?: number; z: number; draai?: 0 | 90 | 180 | 270 }): Blok[] {
  const d = plaats.draai ?? 0;
  const draaiVector = (vx: number, vz: number): [number, number] =>
    d === 90 ? [-vz, vx] : d === 180 ? [-vx, -vz] : d === 270 ? [vz, -vx] : [vx, vz];
  const richting = (r: 'x+' | 'x-' | 'z+' | 'z-'): 'x+' | 'x-' | 'z+' | 'z-' => {
    const v: Record<string, [number, number]> = { 'x+': [1, 0], 'x-': [-1, 0], 'z+': [0, 1], 'z-': [0, -1] };
    const [a, c] = draaiVector(...v[r]!);
    return a > 0.5 ? 'x+' : a < -0.5 ? 'x-' : c > 0.5 ? 'z+' : 'z-';
  };
  return blokken.map((b) => {
    const hoeken = [draaiVector(b.x, b.z), draaiVector(b.x + b.b, b.z + b.d)];
    const x = Math.min(hoeken[0]![0], hoeken[1]![0]), z = Math.min(hoeken[0]![1], hoeken[1]![1]);
    const wissel = d === 90 || d === 270;
    const n: Blok = {
      ...b,
      x: r2(x + plaats.x),
      y: r2(b.y + (plaats.y ?? 0)),
      z: r2(z + plaats.z),
      b: wissel ? b.d : b.b,
      d: wissel ? b.b : b.d,
    };
    if (wissel && b.as && b.as !== 'y') n.as = b.as === 'x' ? 'z' : 'x';
    if (b.kantel) n.kantel = { ...b.kantel, richting: richting(b.kantel.richting) };
    if (b.zijden) {
      n.zijden = {};
      for (const [k, w] of Object.entries(b.zijden)) n.zijden[k === 'y+' ? 'y+' : richting(k as 'x+')] = w;
    }
    return n;
  });
}

/** Omsluitend kader van een lijst blokken. */
export function kaderVan(blokken: Blok[]): Scene3D['kader'] {
  if (!blokken.length) return { x: 0, z: 0, b: 100, d: 100, h: 100 };
  const x = Math.min(...blokken.map((b) => b.x)), z = Math.min(...blokken.map((b) => b.z));
  return {
    x, z,
    b: Math.max(...blokken.map((b) => b.x + b.b)) - x,
    d: Math.max(...blokken.map((b) => b.z + b.d)) - z,
    h: Math.max(...blokken.map((b) => b.y + b.h)),
  };
}
