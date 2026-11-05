/**
 * 3D-opbouw van een vrij zetelontwerp, als lijst eenvoudige blokken (in cm).
 * Het scherm rendert dit (bv. met three.js); de motor zelf heeft geen 3D-bibliotheek nodig.
 *
 * Assen: x = zoals het bovenaanzicht (links → rechts), z = diepte (achter → voor,
 * zoals y in het bovenaanzicht), y = hoogte vanaf de vloer.
 */
import { weefselVan, type Materiaal } from './materialen.js';
import { echt3dPlaatsing, type Echt3D, type Echt3DPlaatsing } from './echt3d.js';
import { doorlopendeOpbouw } from './doorlopend.js';
import { kuipOpbouw, kuipParameters, type Punt } from './kuip.js';
import { chaiseRugVan, chaiseRugVlak, draagHoogteVan, dragerVan, gekozenOpties, karkasHoogteVan, rugleuningTop, hoogtesVan, materiaalVan, lokaalNaarWereld, voetafdruk, vormgevingVan, type Ontwerp, type OntwerpCatalogus, type OntwerpElement } from './ontwerp.js';

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
  /**
   * blok = (afgeronde) balk; cilinder/kegel = staand of liggend; bol = knoop; kuipwand = gebogen wand langs `pad`;
   * profiel = een doorsnede (`profiel`) die langs een rechte `pad` loopt, bv. een uitlopende arm.
   */
  vorm: 'blok' | 'cilinder' | 'kegel' | 'bol' | 'kuipwand' | 'profiel';
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
  /** Bolling van een kussen in cm (midden van het dunste vlak); leeg = standaard (max. 2,2 cm). */
  bol?: number;
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
  /**
   * Vorm in het grondvlak als die geen rechthoek is (bv. een rechte zitting met een ronde kant): punten [x, z] in cm,
   * in wereldcoördinaten, rondom. x/z/b/d blijven het omsluitende kader.
   */
  omtrek?: [number, number][];
  /** Kuipwand (vorm 'kuipwand'): middenlijn [x, z] in wereldcoördinaten, bovenhoogte (absoluut) per punt en dikte. */
  pad?: [number, number][];
  hoogtes?: number[];
  dikte?: number;
  /**
   * Profiel (vorm 'profiel'): de doorsnede als punten [s, y, boven]. s = cm opzij van de middenlijn (`pad`), positief naar
   * `uit` (de buitenkant); y = hoogte in cm, absoluut (boven = 0) of onder de bovenkant ter plaatse (boven = 1, dus mee
   * met `hoogtes`). Zo loopt de arm naar achteren op zonder dat de krul uitrekt.
   */
  profiel?: [number, number, 0 | 1][];
  /** Richting van de buitenkant in het grondvlak [x, z] (eenheidsvector), voor een profiel. */
  uit?: [number, number];
  /** Profiel: afronding van de randen van voor- en achterkant in cm (standaard 2,5). */
  rand?: number;
  /** Profiel: hoe ver het voorpaneel in het midden bol staat, in cm (gevulde stof). */
  kopBol?: number;
  /** Draaiing rond de verticale as in graden (van x naar z), rond het midden; bv. een kussen in een gebogen zetel. */
  draai?: number;
  /**
   * Altijd als zachte vorm tekenen (zachtevorm.ts), ook bij Blokken: grote vrije vormen zoals de zitting en rug van een
   * doorlopende zetel (anders lange, smalle driehoeken met strepen in het reliëf).
   */
  glad?: boolean;
}

export interface Scene3D {
  blokken: Blok[];
  /** Omsluitend kader van de hele zetel. */
  kader: { x: number; z: number; b: number; d: number; h: number };
  /**
   * Echt 3D-model (bestand van de fabrikant) voor een rij elementen. De blokken van die elementen blijven in de
   * lijst: de weergave toont ze als het bestand ontbreekt of als de benadering gevraagd wordt.
   */
  echt?: Echt3DPlaatsing;
  /** Waarom het echte 3D-model van dit model niet past bij het ontwerp (de weergave toont dan de blokken). */
  echtNiet?: string;
}

export interface Bouw3DOpties {
  /** 3D-bestand van het model waarvan het ontwerp vertrok (zie echt3d.ts). */
  echt3d?: Echt3D;
}

const r2 = (x: number) => Math.round(x * 100) / 100;
const rond1 = (x: number) => Math.round(x * 10) / 10;

function donkerder(hex: string, factor = 0.82): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * factor));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function bouw3D(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, materialen: Materiaal[], opties: Bouw3DOpties = {}): Scene3D {
  const typen = new Map(catalogus.typen.map((t) => [t.code, t]));
  const mats = new Map(materialen.map((m) => [m.code, m]));
  const zetel = gekozenOpties(ontwerp, catalogus);
  const hout = String(zetel.get('hout')?.teken?.kleur ?? '#c8a27a');
  const metaal = String(zetel.get('metaal')?.teken?.kleur ?? '#2b2b2b');
  const zithoogte = hoogtesVan(ontwerp, catalogus).zithoogte;
  const blokken: Blok[] = [];

  // Midden van de zetel (zonder opzet-elementen): bepaalt naar welke kant een uitlopende arm helt.
  const basisAfdrukken = ontwerp.elementen.filter((o) => !typen.get(o.type)?.opzet).map(voetafdruk);
  const midX = basisAfdrukken.length ? (Math.min(...basisAfdrukken.map((p) => p.x)) + Math.max(...basisAfdrukken.map((p) => p.x + p.b))) / 2 : 0;
  const midY = basisAfdrukken.length ? (Math.min(...basisAfdrukken.map((p) => p.y)) + Math.max(...basisAfdrukken.map((p) => p.y + p.h))) / 2 : 0;
  const naarBuiten = (e: OntwerpElement): 'x-' | 'x+' | 'z-' | 'z+' => {
    const p = voetafdruk(e);
    return p.b <= p.h ? (p.x + p.b / 2 < midX ? 'x-' : 'x+') : (p.y + p.h / 2 < midY ? 'z-' : 'z+');
  };
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
    /** Blok met een vrije omtrek (lokale punten → wereld), met het omsluitende kader als x/z/b/d. */
    const omtrekBlok = (code: string, soort: BlokSoort, y: number, h: number, kleur: string, lokaleOmtrek: Punt[], extra: Partial<Blok>) => {
      const omtrek = lokaleOmtrek.map(([lx, ly]) => { const w = lokaalNaarWereld(e, lx, ly, 0, 0); return [r2(w.x), r2(w.y)] as [number, number]; });
      const xs = omtrek.map((q) => q[0]), zs = omtrek.map((q) => q[1]);
      const x0 = Math.min(...xs), z0 = Math.min(...zs);
      blokken.push({ code: `${e.id}.${code}`, soort, vorm: 'blok', x: r2(x0), y: r2(y), z: r2(z0), b: r2(Math.max(...xs) - x0), h: r2(h), d: r2(Math.max(...zs) - z0), kleur, omtrek, ...extra });
    };
    if (t.opzet) {
      // geen poten: ligt op een ander element
    } else if (t.tekenstijl !== 'console' && potVorm === 'draaivoet') {
      const p = voetafdruk(e);
      cilinderMidden('draaivoet', 'metaal', 1.5, P - 1.5, Math.min(p.b, p.h) * 0.22, Math.min(p.b, p.h) * 0.22, '#2e2c2a');
      cilinderMidden('voetplaat', 'metaal', 0, 1.5, Math.min(p.b, p.h) * 0.55, Math.min(p.b, p.h) * 0.55, '#2e2c2a');
    } else if (t.tekenstijl === 'arm' && potVorm === 'housse' && ['uitlopend', 'strak'].includes(String(te('armstijl', 'vorm', 'strak')))) {
      // Uitlopende of strakke arm met hoes: de arm zelf loopt tot op de vloer (zie de arm), geen aparte rok eronder.
    } else if (t.tekenstijl !== 'console' && potVorm === 'housse') {
      // Hoes tot op de grond: bij een zitelement in één stuk van de vloer tot onder het zitkussen (zoals Husk, Wallace,
      // Esmee op de foto's), anders een rok tot net boven de poothoogte.
      const zitHoes = ['zit', 'hoek', 'chaise', 'zit_zonder_rug'].includes(t.tekenstijl);
      const hoesTop = zitHoes
        ? hoogtesVan(ontwerp, catalogus, e).zithoogte - (gekozenOpties(ontwerp, catalogus, e).get('zitting')?.code === 'vaste_zitting' ? 0 : vormgevingVan(ontwerp, e).kussendikte) - 0.5
        : P + 2;
      lokaal('housse', 'stof', 0.3, 0.3, B - 0.6, D - 0.6, 0, hoesTop, stof, { afronding: 1 });
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
        // Kuipfauteuil met rond of afgerond grondvlak: poten naar binnen, onder de bolling.
        const kuipRond = t.tekenstijl === 'kuip' && kuipParameters(opt.get('kuipvorm')?.teken) !== null;
        const kuipIn = kuipRond ? Math.min(B, D) * (kuipParameters(opt.get('kuipvorm')?.teken)!.plan === 'rond' ? 0.17 : 0.1) : 0;
        const inL = rondL ? Math.min(D / 2, B) * 0.35 : kuipRond ? kuipIn : ins;
        const inR = rondR ? Math.min(D / 2, B) * 0.35 : kuipRond ? kuipIn : ins;
        const yIn = (rond: boolean) => (rond ? D * 0.2 : kuipRond ? kuipIn : ins);
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
        lokaal(`zitkussen${n > 1 ? i + 1 : ''}`, 'kussen', lx + (i * lb) / n + (i ? 0.4 : 0), ly, lb / n - (i < n - 1 ? 0.8 : 0), ld, y, h, stof, { afronding: zacht, bol: rond1(h * 0.05 + v.zachtheid * 0.22) });
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
    // Karkas (vaste rug) en losse rugkussens: zoals bij de modellen van de klant een laag karkas met dikke kussens
    // die erboven uitsteken en lichtjes achterover leunen.
    const frameRug = karkasHoogteVan(ontwerp, catalogus, e, losseRug);
    const RKD = v.rugkussendikte;
    // Gevulde rugkussens: bol op de voorkant (dikker kussen en zachtere vormgeving = boller).
    // Zachtheid bepaalt het karakter: 2 = strakke blokken (Gozo, Azar), 9 = bolle, achterover zakkende donskussens.
    const dons = opt.get('rug')?.code === 'los_dons';
    const rugKussenExtra: Partial<Blok> = {
      afronding: Math.min(RKD / 2.2, 1 + v.zachtheid * 0.9),
      bol: rond1(RKD * (0.03 + v.zachtheid * 0.022) * (dons ? 1.25 : 1)),
      kantel: { graden: v.rugvorm === 'hellend' ? 14 : rond1(2 + v.zachtheid * 0.8), richting },
    };
    const metNekrol = losseRug && opt.get('nekrol')?.teken?.nekrol === true;
    /** Nekrol: ronde rol op het karkas (lokaal van lx over lb breed), achter de rugkussens. */
    const nekrol = (lx: number, lb: number) => {
      const dia = 13;
      const w = lokaalNaarWereld(e, lx, Math.max(0, RUG / 2 - dia / 2), lb, dia);
      const langsX = e.rotatie === 0 || e.rotatie === 180;
      blokken.push({ code: `${e.id}.nekrol`, soort: 'kussen', vorm: 'cilinder', as: langsX ? 'x' : 'z', x: r2(w.x), y: r2(frameRug - 2), z: r2(w.y), b: r2(w.b), h: dia, d: r2(w.h), kleur: stof });
    };
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
        lokaal('basis', 'stof', sx, RUG, B - sx - fr, D - RUG - 1.5, P, basisH, donker, { afronding: 2 });
        if (kussenDik) kussens(sx + 1, RUG, B - sx - fr - 2, D - RUG - 1 - (v.houtframe === 'rondom' ? 4 : 0), zithoogte - kussenDik, kussenDik);
        if (!hoek) houtframe(zithoogte + 2);
        if (losseRug) {
          const n = Math.max(1, Math.round(v.rugkussens ?? v.zitkussens));
          for (let i = 0; i < n; i++)
            lokaal(`rugkussen${n > 1 ? i + 1 : ''}`, 'kussen', fr + 2 + (i * (B - 2 * fr - 4)) / n, RUG - 2, (B - 2 * fr - 4) / n - (i < n - 1 ? 0.8 : 0), RKD, zithoogte, rugH - zithoogte, stof, rugKussenExtra);
          if (hoek) lokaal('rugkussen2', 'kussen', RUG - 2, RUG + RKD - 2, RKD, D - RUG - RKD, zithoogte, rugH - zithoogte, stof, { afronding: rugKussenExtra.afronding });
          if (metNekrol) nekrol(fr + 2, B - 2 * fr - 4);
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
      case 'chaise': {
        const kant = chaiseRugVan(opt);
        if (!kant) {
          lokaal('basis', 'stof', 0, 0, B, D - 1.5, P, basisH, donker, { afronding: 2 });
          if (kussenDik) kussens(1, 1, B - 2, D - 2, zithoogte - kussenDik, kussenDik);
          houtframe(zithoogte + 2);
          break;
        }
        // Met rugleuning: rug achteraan of langs de lange zijde; basis en kussens op de rest.
        const { rug, zit } = chaiseRugVlak(B, D, RUG, kant);
        const zij = kant !== 'achter';
        lokaal('rug', 'stof', rug.lx, rug.ly, rug.lb, rug.ld, P, frameRug - P, stof, zij ? { afronding: rugExtra.afronding } : rugExtra);
        lokaal('basis', 'stof', zit.lx, zit.ly, zit.lb, zit.ld - 1.5, P, basisH, donker, { afronding: 2 });
        if (kussenDik) {
          if (zij) lokaal('zitkussen', 'kussen', zit.lx + 1, 1, zit.lb - 2, D - 2, zithoogte - kussenDik, kussenDik, stof, { afronding: zacht });
          else kussens(1, RUG, B - 2, D - RUG - 1, zithoogte - kussenDik, kussenDik);
        }
        if (losseRug) {
          if (zij) lokaal('rugkussen', 'kussen', kant === 'links' ? RUG - 2 : B - RUG - RKD + 2, 3, RKD, D - 6, zithoogte, rugH - zithoogte, stof, { afronding: rugKussenExtra.afronding });
          else {
            lokaal('rugkussen', 'kussen', 2, RUG - 2, B - 4, RKD, zithoogte, rugH - zithoogte, stof, rugKussenExtra);
            if (metNekrol) nekrol(2, B - 4);
          }
        }
        if (capitonne && !zij) {
          const kolommen = Math.max(2, Math.round(B / 18));
          for (let r = 0; r < 2; r++)
            for (let k = 0; k < kolommen; k++) {
              const lx = (B / kolommen) * (k + 0.5) + (r % 2 ? B / kolommen / 2 : 0);
              if (lx > B - 4) continue;
              lokaal(`knoop-${r}-${k}`, 'donker', lx - 1, RUG - 0.6, 2, 1.2, zithoogte + 12 + r * 12, 2, donkerder(stof, 0.55), { vorm: 'bol' });
            }
        }
        if (kant === 'achter') houtframe(zithoogte + 2);
        break;
      }
      case 'zit_zonder_rug':
        lokaal('basis', 'stof', 0, 0, B, D - 1.5, P, basisH, donker, { afronding: 2 });
        if (kussenDik) kussens(1, 1, B - 2, D - 2, zithoogte - kussenDik, kussenDik);
        houtframe(zithoogte + 2);
        break;
      case 'rond': {
        // Afgerond eindelement: basis en zitkussen elk uit één stuk, recht met een halve cirkel aan de ronde kant.
        const links = String(te('ronde_kant', 'kant', 'links')) === 'links';
        const r = Math.min(D / 2, B);
        const recht = B - r;
        const cx = links ? r : recht;
        /** Halve cirkel rond (cx, cz) van hoek a0 tot a1 (graden), in lokale coördinaten. */
        const boog = (cz: number, straal: number, a0: number, a1: number) => {
          const uit: [number, number][] = [];
          for (let i = 0; i <= 24; i++) {
            const a = ((a0 + ((a1 - a0) * i) / 24) * Math.PI) / 180;
            uit.push([cx + straal * Math.cos(a), cz + straal * Math.sin(a)]);
          }
          return uit;
        };
        // Basis: over de hele voetafdruk.
        const basisOmtrek: [number, number][] = links
          ? [[B, 0], [B, D], ...boog(D / 2, r, 90, 270)]
          : [[0, 0], ...boog(D / 2, r, -90, 90), [0, D]];
        omtrekBlok('basis', 'stof', P, basisH, donker, basisOmtrek, { afronding: 2 });
        if (kussenDik) {
          const kr = r - 1;
          // Bolle vorm (rechthoek + halve cirkel): het rechte deel loopt achter tot onder de rug (daar onzichtbaar),
          // zo blijft het bovenvlak één gladde welving zonder inham.
          const kussenOmtrek: [number, number][] = links
            ? [[B - 0.5, 1], [B - 0.5, D - 1], ...boog(D / 2, kr, 90, 270)]
            : [[0.5, 1], ...boog(D / 2, kr, -90, 90), [0.5, D - 1]];
          omtrekBlok('zitkussen', 'kussen', zithoogte - kussenDik, kussenDik, stof, kussenOmtrek, { afronding: zacht });
        }
        const rx = links ? r : 0;
        if (recht > 0) lokaal('rug', 'stof', rx, 0, recht, RUG, P, frameRug - P, stof, rugExtra);
        // Losse rugkussens op het rechte deel (zoals bij Doha).
        if (recht > 6 && losseRug) lokaal('rugkussen', 'kussen', rx + 2, RUG - 2, recht - 4, RKD, zithoogte, rugH - zithoogte, stof, rugKussenExtra);
        if (recht > 6 && metNekrol) nekrol(rx + 2, recht - 4);
        // Rug rond het uiteinde: gebogen wand (zelfde opbouw als bij een kuip) van achteraan rond de ronde kant naar voren,
        // van karkashoogte achteraan tot 10 cm boven de zitting vooraan.
        if (opt.get('rug_rond')?.teken?.rond === true) {
          const w = Math.min(RUG, r / 2);
          const R = r - w / 2 + 0.4;
          const zwaai = 140;
          const stappen = 24;
          const voor = zithoogte + 10;
          const padLokaal: [number, number][] = [], hoogtes: number[] = [];
          for (let i = 0; i <= stappen; i++) {
            const u = i / stappen;
            const a = ((-90 + (links ? -1 : 1) * zwaai * u) * Math.PI) / 180;
            padLokaal.push([cx + R * Math.cos(a), D / 2 + R * Math.sin(a)]);
            hoogtes.push(rond1(voor + (frameRug - voor) * (0.5 + 0.5 * Math.cos(Math.PI * u))));
          }
          const pad = padLokaal.map(([lx, ly]) => { const q = lokaalNaarWereld(e, lx, ly, 0, 0); return [r2(q.x), r2(q.y)] as [number, number]; });
          const xs = pad.map((q) => q[0]), zs = pad.map((q) => q[1]);
          blokken.push({
            code: `${e.id}.rugrond`, soort: 'stof', vorm: 'kuipwand',
            x: r2(Math.min(...xs) - w / 2), z: r2(Math.min(...zs) - w / 2), b: r2(Math.max(...xs) - Math.min(...xs) + w), d: r2(Math.max(...zs) - Math.min(...zs) + w),
            y: r2(P), h: r2(Math.max(...hoogtes) - P), kleur: stof, pad, hoogtes, dikte: r2(w),
          });
        }
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
        // Waarop het opzet-element rust en hoe hoog een rugleuning komt: zelfde berekening als het vooraanzicht.
        const basis = draagHoogteVan(ontwerp, catalogus, e);
        const kantelAchter = { graden: t.tekenstijl === 'rugleuning' ? 9 : 14, richting };
        if (t.tekenstijl === 'rugleuning') {
          const rugTop = rugleuningTop(ontwerp, catalogus, e);
          lokaal('rugleuning', 'stof', 0, 0, B, D, basis, rugTop - basis, stof, { afronding: Math.min(D / 2, 3 + v.zachtheid), ...(v.rugvorm === 'hellend' ? { kantel: kantelAchter } : {}) });
        } else if (t.tekenstijl === 'kussen') {
          const h = t.hoogte ?? Math.round(B * 0.9);
          lokaal('kussen', 'kussen', 0, 0, B, D, zithoogte - 2, h, stof, { afronding: Math.min(D / 2.2, 2 + v.zachtheid), bol: rond1(D * 0.32), kantel: kantelAchter });
        } else {
          const w = lokaalNaarWereld(e, 0, 0, B, D);
          const langsX = e.rotatie === 0 || e.rotatie === 180;
          blokken.push({ code: `${e.id}.rol`, soort: 'kussen', vorm: 'cilinder', as: langsX ? 'x' : 'z', x: r2(w.x), y: r2(zithoogte - 2), z: r2(w.y), b: r2(w.b), h: r2(D), d: r2(w.h), kleur: stof });
        }
        break;
      }
      case 'kuip': {
        // Kuip (rond, afgerond, omhullend, organisch, schelp): gebogen wand rond de zitting, zie kuip.ts.
        const kp = kuipParameters(opt.get('kuipvorm')?.teken);
        if (kp) {
          const opb = kuipOpbouw(B, D, { P, zithoogte, rugH, kussenDik }, kp, losseRug);
          // De onderbouw net binnen de wand (0,8 cm): anders vallen de buitenkant van de wand en de zijkant van de onderbouw
          // samen, en dat gaf vlekken en strepen op de onderbouw (z-fighting). Bij een schelp staat de wand niet op de onderbouw.
          const krimp = kp.zwevend ? 0 : 0.8;
          const basisPlan = opb.plan.map(([x, y]) => [B / 2 + (x - B / 2) * (1 - krimp / (B / 2)), D / 2 + (y - D / 2) * (1 - krimp / (D / 2))] as Punt);
          omtrekBlok('basis', 'stof', opb.basis.onder, opb.basis.boven - opb.basis.onder, donker, basisPlan, { afronding: kp.organisch ? 9 : 4 });
          if (kussenDik) omtrekBlok('zitkussen', 'kussen', zithoogte - kussenDik, kussenDik, stof, opb.zit, { afronding: kp.organisch ? 6 : zacht });
          const pad = opb.wand.pad.map(([lx, ly]) => { const w = lokaalNaarWereld(e, lx, ly, 0, 0); return [r2(w.x), r2(w.y)] as [number, number]; });
          const xs = pad.map((q) => q[0]), zs = pad.map((q) => q[1]), half = opb.wand.dikte / 2;
          blokken.push({
            code: `${e.id}.rug`, soort: 'stof', vorm: 'kuipwand',
            x: r2(Math.min(...xs) - half), z: r2(Math.min(...zs) - half), b: r2(Math.max(...xs) - Math.min(...xs) + 2 * half), d: r2(Math.max(...zs) - Math.min(...zs) + 2 * half),
            y: r2(opb.wand.onder), h: r2(Math.max(...opb.wand.hoogtes) - opb.wand.onder), kleur: stof, pad, hoogtes: opb.wand.hoogtes, dikte: r2(opb.wand.dikte),
          });
          if (kp.zwevend) {
            // Schelp: twee houten dragers achteraan van het frame tot onder de schaal.
            const mid = Math.floor(opb.wand.pad.length / 2);
            for (const [k, f] of [['l', 0.28], ['r', 0.72]] as const) {
              const q = opb.wand.pad[Math.round(mid + (f - 0.5) * opb.wand.pad.length * 0.55)] ?? opb.wand.pad[mid]!;
              lokaal(`drager-${k}`, 'hout', q[0] - 1.5, q[1] - 1.5, 3, 3, opb.basis.boven - 2, opb.wand.onder - opb.basis.boven + 6, hout, { afronding: 0.8 });
            }
          }
          opb.rugkussens.forEach((k, i) => lokaal(`rugkussen${opb.rugkussens.length > 1 ? i + 1 : ''}`, 'kussen', k.lx, k.ly, k.lb, k.ld, k.y, k.h, stof, { afronding: 2 + zacht, kantel: { graden: 10, richting } }));
          break;
        }
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
        } else if (vorm === 'uitlopend' || vorm === 'strak') {
          // Arm met een eigen doorsnede (profiel) die van voor naar achter loopt; met een hoes tot op de vloer (geen aparte
          // rok eronder), anders vanaf de poten.
          // - Uitlopend (technische tekening van Wallace, vorm benaderd uit de foto): binnenkant recht tegen de zitting,
          //   buitenkant onderaan iets naar binnen en bovenaan uitlopend tot een opgerolde rand (krul) op armhoogte, naar
          //   achteren oplopend tot de hoogte van het karkas.
          // - Strak (track arm, benaderd uit de foto's van Husk, Attribute, Amusette …): rechte arm met een zacht afgeronde,
          //   licht bolle bovenkant, licht bolle zijkanten en een voorpaneel met zachte rand; hoe zacht volgt de zachtheid.
          const onder = potVorm === 'housse' ? 0 : P;
          const achter = vorm === 'uitlopend' ? Math.max(armH, v.karkashoogte ?? armH) : armH;
          // Welke lokale kant (x = 0 of x = B) ligt aan de buitenkant van de zetel?
          const buiten = naarBuiten(e);
          const w0 = lokaalNaarWereld(e, 0, 0, 1, 1), wB = lokaalNaarWereld(e, B - 1, 0, 1, 1);
          const buitenBijNul = buiten === 'x-' ? w0.x < wB.x : buiten === 'x+' ? w0.x > wB.x : buiten === 'z-' ? w0.y < wB.y : w0.y > wB.y;
          const m0 = lokaalNaarWereld(e, 0, D / 2, 0, 0), mB = lokaalNaarWereld(e, B, D / 2, 0, 0);
          const ux = (buitenBijNul ? m0.x - mB.x : mB.x - m0.x) / B, uz = (buitenBijNul ? m0.y - mB.y : mB.y - m0.y) / B;
          const padLokaal: [number, number][] = [], hoogtes: number[] = [];
          for (let i = 0; i <= 14; i++) {
            const t = i / 14; // 0 = vooraan, 1 = achteraan
            const s = Math.max(0, Math.min(1, (t - 0.5) / 0.5));
            padLokaal.push([B / 2, D - t * D]);
            hoogtes.push(rond1(armH + (achter - armH) * s * s * (3 - 2 * s)));
          }
          const padW = padLokaal.map(([lx, ly]) => { const q = lokaalNaarWereld(e, lx, ly, 0, 0); return [r2(q.x), r2(q.y)] as [number, number]; });
          const hw = B / 2;
          const profiel = vorm === 'uitlopend' ? uitlopendProfiel(B, zithoogte, onder) : strakProfiel(B, onder, armH, v.zachtheid, potVorm === 'housse');
          const zijden = profiel.map((q) => q[0]), wijd = Math.max(hw, ...zijden.map(Math.abs));
          const xs = padW.flatMap((q) => [q[0] - Math.abs(ux) * wijd, q[0] + Math.abs(ux) * wijd]), zs = padW.flatMap((q) => [q[1] - Math.abs(uz) * wijd, q[1] + Math.abs(uz) * wijd]);
          blokken.push({
            code: `${e.id}.arm`, soort: 'stof', vorm: 'profiel',
            x: r2(Math.min(...xs)), z: r2(Math.min(...zs)), b: r2(Math.max(...xs) - Math.min(...xs)), d: r2(Math.max(...zs) - Math.min(...zs)),
            y: r2(onder), h: r2(Math.max(...hoogtes) - onder), kleur: stof, pad: padW, hoogtes, profiel, uit: [r2(ux), r2(uz)],
            ...(vorm === 'strak' ? { rand: rond1(Math.max(2.5, Math.min(6, (0.14 + 0.012 * v.zachtheid) * B))), kopBol: rond1(0.4 + 0.08 * v.zachtheid) } : {}),
          });
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
    // Verdekte voet onder een rond of vrij gevormd element (ronde poef, kuipfauteuil): dezelfde vorm als wat erop staat,
    // ±10 cm naar binnen. Een vierkante voet stak onder de ronde kant uit en leek een harde, vierkante schaduw.
    // Het vooraanzicht blijft gelijk (van voor gezien is de voet even breed). Een rond eindelement heeft zijn eigen voet.
    const voet = t.tekenstijl === 'rond' ? undefined : blokken.slice(eersteBlok).find((b) => b.code === `${e.id}.verdekt`);
    const lijf = voet && blokken.slice(eersteBlok).find((b) => b !== voet && (b.soort === 'stof' || b.soort === 'kussen') && b.y <= voet.y + voet.h + 0.5 &&
      ((b.vorm === 'cilinder' && !b.as) || b.omtrek));
    if (voet && lijf && lijf.b > 30 && lijf.d > 30) {
      const cx = lijf.x + lijf.b / 2, cz = lijf.z + lijf.d / 2, sx = (lijf.b - 20) / lijf.b, sz = (lijf.d - 20) / lijf.d;
      Object.assign(voet, { x: r2(lijf.x + 10), z: r2(lijf.z + 10), b: r2(lijf.b - 20), d: r2(lijf.d - 20) });
      if (lijf.omtrek) voet.omtrek = lijf.omtrek.map(([x, z]) => [r2(cx + (x - cx) * sx), r2(cz + (z - cz) * sz)] as [number, number]);
      else voet.vorm = 'cilinder';
    }
    // Stoffoto als textuur op alle stofdelen van dit element (zitting, rug, armen, kussens).
    // Zonder foto: het weefsel (velours, bouclé, linnen …) zodat de structuur in de 3D klopt.
    // Kussens: naad langs de randen volgens de optie "Naden" (bies in dezelfde stof of contrast, sierstiksel).
    const naadTeken = opt.get('naad')?.teken;
    const naad: Blok['naad'] = naadTeken?.bies
      ? { soort: 'bies', kleur: naadTeken.contrast ? '#2b2622' : stof }
      : naadTeken?.stiksel ? { soort: 'stiksel', kleur: donkerder(stof, 0.6) } : { soort: 'naad', kleur: donkerder(stof, 0.7) };
    for (const b of blokken.slice(eersteBlok)) if (b.soort === 'kussen' && b.kleur === stof && ((b.vorm ?? 'blok') === 'blok' || (b.vorm === 'cilinder' && !b.as))) b.naad = naad;
    // Arm met een profiel: een naad of bies rond het voorpaneel (zoals een gestoffeerde arm), geen sierstiksel.
    for (const b of blokken.slice(eersteBlok)) if (b.vorm === 'profiel' && b.kleur === stof && naad.soort !== 'stiksel') b.naad = naad;
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
  // Doorlopende opbouw (Doha, Montego): de rij zitelementen als één zetel (zie doorlopend.ts).
  const alle = doorlopendeOpbouw(ontwerp, catalogus, materialen, blokken);
  const h = alle.length ? Math.max(...alle.map((b) => b.y + b.h)) : 80;
  const scene: Scene3D = { blokken: alle, kader: { x: x0, z: z0, b: x1 - x0, d: z1 - z0, h } };
  if (opties.echt3d) {
    const u = echt3dPlaatsing(ontwerp, catalogus, materialen, opties.echt3d);
    if (u.past) scene.echt = u.plaatsing;
    else scene.echtNiet = u.reden;
  }
  return scene;
}

/**
 * Doorsnede van een uitlopende arm (Wallace, Esmee), gedeeld door de 3D en het vooraanzicht: punten [s, y, boven] met s in
 * cm opzij van het midden van de arm (positief = buitenkant) en y absoluut (boven = 0) of onder de bovenkant (boven = 1).
 * Onderaan smal, de buitenkant helt naar buiten tot onder de krul, die over de zijkant uitsteekt (zoals op de foto),
 * bovenaan afgerond naar binnen. Benadering uit de foto en de technische tekening.
 */
export function uitlopendProfiel(B: number, zithoogte: number, onder: number): [number, number, 0 | 1][] {
  const hw = B / 2, inzet = Math.min(0.38 * B, 8), krul = Math.min(5, 0.24 * B), rIn = Math.min(4, 0.2 * B);
  const uitloop = Math.max(zithoogte - 6, onder + 8);
  const profiel: [number, number, 0 | 1][] = [[-hw, onder, 0], [hw - inzet, onder, 0], [hw - inzet, uitloop, 0]];
  profiel.push([rond1(hw - krul - 1), rond1(2 * krul + 2), 1]);
  for (const a of [-90, -45, 0, 45, 90]) {
    const r = (a * Math.PI) / 180;
    profiel.push([rond1(hw - krul + krul * Math.cos(r)), rond1(krul - krul * Math.sin(r)), 1]);
  }
  profiel.push([rond1(-hw + rIn), 0.5, 1]);
  for (const a of [120, 150]) {
    const r = (a * Math.PI) / 180;
    profiel.push([rond1(-hw + rIn + rIn * Math.cos(r)), rond1(rIn - rIn * Math.sin(r)), 1]);
  }
  profiel.push([-hw, rIn, 1]);
  return profiel;
}

/**
 * Doorsnede van een strakke arm (track arm), gedeeld door de 3D en het vooraanzicht: punten [s, y, 0] (y absoluut), s in cm
 * opzij van het midden (positief = buitenkant). Zacht afgeronde bovenkant die in het midden licht bol staat, zijkanten
 * die naar onder heel licht inspringen (gevulde stof), kleine afronding onderaan. Met een hoes loopt de arm tot op de vloer
 * en waait de buitenkant onderaan een fractie uit. Hoe rond en hoe bol volgt de zachtheid (0–10). Benadering uit de foto's.
 */
export function strakProfiel(B: number, onder: number, top: number, zachtheid: number, hoes: boolean): [number, number, 0 | 1][] {
  const hw = B / 2;
  const rTop = rond1(Math.max(2.5, Math.min(8, hw - 0.5, (0.2 + 0.022 * zachtheid) * B)));
  const kroon = rond1(0.3 + 0.1 * zachtheid), bol = rond1(0.2 + 0.06 * zachtheid);
  const rOnder = hoes ? 0.8 : 2, uitwaai = hoes ? 0.8 : 0;
  const ySide0 = onder + rOnder, ySide1 = top - kroon - rTop;
  const p: [number, number, 0 | 1][] = [[rond1(-hw + bol + rOnder), onder, 0], [rond1(hw - bol + uitwaai - rOnder), onder, 0], [rond1(hw - bol + uitwaai), rond1(ySide0), 0]];
  for (const f of [0.33, 0.66]) p.push([rond1(hw - bol * (1 - f) ** 2), rond1(ySide0 + f * (ySide1 - ySide0)), 0]);
  for (const a of [0, 45, 90]) { const r = (a * Math.PI) / 180; p.push([rond1(hw - rTop + rTop * Math.cos(r)), rond1(ySide1 + rTop * Math.sin(r)), 0]); }
  p.push([0, rond1(top), 0]);
  for (const a of [90, 135, 180]) { const r = (a * Math.PI) / 180; p.push([rond1(-hw + rTop + rTop * Math.cos(r)), rond1(ySide1 + rTop * Math.sin(r)), 0]); }
  for (const f of [0.66, 0.33]) p.push([rond1(-(hw - bol * (1 - f) ** 2)), rond1(ySide0 + f * (ySide1 - ySide0)), 0]);
  p.push([rond1(-hw + bol), rond1(ySide0), 0]);
  return p;
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
