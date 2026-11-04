/**
 * Vooraanzicht van een vrij zetelontwerp: toont wat in het bovenaanzicht niet te zien is,
 * zoals poten, zithoogte, rughoogte, armvormen, losse kussens, capitonnage, biezen en houten delen.
 *
 * Coördinaten in cm: x = zoals in het bovenaanzicht, y = 0 is de vloer, hoger is negatief (SVG).
 */
import type { Materiaal } from './materialen.js';
import { chaiseRugVan, chaiseRugVlak, draagHoogteVan, dragerVan, gekozenOpties, karkasHoogteVan, rugleuningTop, lokaalNaarWereld, hoogtesVan, materiaalVan, voetafdruk, vormgevingVan, type Ontwerp, type OntwerpCatalogus, type OptieKeuze } from './ontwerp.js';
import type { TekeningResultaat, VormResultaat } from './types.js';
import { kuipOpbouw, kuipParameters } from './kuip.js';
import { strakProfiel, uitlopendProfiel } from './ruimtelijk.js';

const rond = (x: number) => Math.round(x * 100) / 100;
const rugBovenOf = (e: { rotatie: number }) => e.rotatie === 0 || e.rotatie === 180;

function donkerder(hex: string, factor = 0.86): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * factor));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Rechthoek met alleen de bovenhoeken afgerond (r) als SVG-pad. */
function bovenRond(x: number, y: number, b: number, h: number, r: number): string {
  r = Math.max(0, Math.min(r, b / 2, h));
  return `M${rond(x)} ${rond(y + h)} V${rond(y + r)} Q${rond(x)} ${rond(y)} ${rond(x + r)} ${rond(y)} H${rond(x + b - r)} Q${rond(x + b)} ${rond(y)} ${rond(x + b)} ${rond(y + r)} V${rond(y + h)} Z`;
}

export function tekenVooraanzicht(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, materialen: Materiaal[]): TekeningResultaat {
  const typen = new Map(catalogus.typen.map((t) => [t.code, t]));
  const mats = new Map(materialen.map((m) => [m.code, m]));
  const zetel = gekozenOpties(ontwerp, catalogus);
  const tz = (groep: string, veld: string, standaard: number | string) => zetel.get(groep)?.teken?.[veld] ?? standaard;
  const hout = String(tz('hout', 'kleur', '#c8a27a'));
  const metaal = String(tz('metaal', 'kleur', '#2b2b2b'));
  const zithoogte = hoogtesVan(ontwerp, catalogus).zithoogte;

  const vormen: VormResultaat[] = [];
  const rect = (code: string, x: number, y: number, b: number, h: number, vulling: string, extra: Partial<VormResultaat> = {}) => {
    if (b > 0 && h > 0) vormen.push({ code, x: rond(x), y: rond(y), breedte: rond(b), hoogte: rond(h), vulling, ...extra });
  };
  const pad = (code: string, d: string, x: number, y: number, b: number, h: number, vulling: string, extra: Partial<VormResultaat> = {}) =>
    vormen.push({ code, pad: d, x: rond(x), y: rond(y), breedte: rond(b), hoogte: rond(h), vulling, ...extra });

  // Achterste elementen eerst tekenen, zodat de voorste ervoor komen.
  const volgorde = [...ontwerp.elementen].sort((a, b) => {
    const pa = voetafdruk(a), pb = voetafdruk(b);
    return pa.y + pa.h - (pb.y + pb.h);
  });

  let maxHoogte = 0;
  /** Hoogte waarop een rugleuning of kussen rust: de bovenkant van de basis van het element eronder. */
  const draagHoogte = (e: (typeof ontwerp.elementen)[number]) => draagHoogteVan(ontwerp, catalogus, e);
  for (const e of volgorde) {
    const t = typen.get(e.type);
    if (!t) continue;
    const p = voetafdruk(e);
    const opt = gekozenOpties(ontwerp, catalogus, e);
    const te = (groep: string, veld: string, standaard: number | string | boolean) => opt.get(groep)?.teken?.[veld] ?? standaard;
    const m = mats.get(materiaalVan(ontwerp, catalogus, e)) || mats.get(ontwerp.hoofdmateriaal);
    const stof = m?.kleur ?? '#cccccc';
    const donker = donkerder(stof);
    const naad = opt.get('naad');
    const lijn: Partial<VormResultaat> =
      naad?.teken?.bies ? { lijndikte: 2.6, lijn: naad.teken.contrast ? '#2b2622' : donkerder(stof, 0.7) } : naad?.teken?.stiksel ? { lijndikte: 1.6 } : {};

    // --- Poten / onderbouw ---
    const potenKeuze: OptieKeuze | undefined = opt.get('poten');
    const vorm = String(potenKeuze?.teken?.vorm ?? 'conisch');
    const P = vorm === 'plint' ? 4 : vorm === 'verdekt' ? Math.min(hoogtesVan(ontwerp, catalogus, e).poothoogte, 8) : hoogtesVan(ontwerp, catalogus, e).poothoogte;
    const potKleur = potenKeuze?.teken?.metaal ? (potenKeuze.teken.kleur ? String(potenKeuze.teken.kleur) : metaal) : hout;
    const x0 = p.x, x1 = p.x + p.b, inset = Math.min(5, p.b / 6);
    if (t.tekenstijl !== 'console' && !t.opzet) {
      switch (vorm) {
        case 'draaivoet':
          rect(`${e.id}.draaivoet`, x0 + p.b * 0.3, -P, p.b * 0.4, P - 1.5, '#2e2c2a');
          rect(`${e.id}.voetplaat`, x0 + p.b * 0.22, -1.5, p.b * 0.56, 1.5, '#2e2c2a');
          break;
        case 'housse':
          break; // de hoes wordt hieronder over de basis getekend
        case 'plint':
          rect(`${e.id}.plint`, x0 + 2, -P, p.b - 4, P, hout);
          break;
        case 'verdekt':
          rect(`${e.id}.verdekt`, x0 + 10, -P, p.b - 20, P, '#3a3a38');
          break;
        case 'slede':
          pad(`${e.id}.slede`, `M${rond(x0 + inset)} ${-P} V0 H${rond(x1 - inset)} V${-P}`, x0, -P, p.b, P, 'none', { lijn: potKleur, lijndikte: 3 });
          break;
        case 'haarspeld':
          for (const [k, xm] of [['l', x0 + inset + 3], ['r', x1 - inset - 3]] as const)
            pad(`${e.id}.poot-${k}`, `M${rond(xm - 3)} ${-P} L${rond(xm)} 0 L${rond(xm + 3)} ${-P}`, xm - 3, -P, 6, P, 'none', { lijn: potKleur, lijndikte: 2 });
          break;
        default: {
          const breed = vorm === 'blok' ? 6 : vorm === 'cilinder' ? 4 : 5;
          const onder = vorm === 'conisch' ? 2.4 : breed;
          for (const [k, xm] of [['l', x0 + inset + breed / 2], ['r', x1 - inset - breed / 2]] as const)
            pad(
              `${e.id}.poot-${k}`,
              `M${rond(xm - breed / 2)} ${-P} H${rond(xm + breed / 2)} L${rond(xm + onder / 2)} 0 H${rond(xm - onder / 2)} Z`,
              xm - breed / 2, -P, breed, P, potKleur,
            );
        }
      }
    }

    const zitting = String(opt.get('zitting')?.code ?? 'losse_kussens');
    const v = vormgevingVan(ontwerp, e);
    const kussenDik = zitting === 'vaste_zitting' ? 0 : v.kussendikte;
    const zacht = 1 + v.zachtheid * 0.8;
    /** Zitkussens naast elkaar (vooraanzicht). */
    const zitkussens = (xa: number, b: number, yTop: number, dik: number) => {
      const n = rugBovenOf(e) ? Math.max(1, Math.round(v.zitkussens)) : 1;
      const kb = b / n;
      for (let i = 0; i < n; i++)
        rect(`${e.id}.zitkussen${n > 1 ? i + 1 : ''}`, xa + i * kb + (i ? 0.4 : 0), yTop, kb - (i < n - 1 ? 0.8 : 0), dik, stof, { afronding: zacht, ...lijn });
    };
    const houtframe = (h: number) => {
      if (v.houtframe === 'geen') return;
      rect(`${e.id}.frame-l`, x0, top(h), 4, h - P, hout, { afronding: 0.8 });
      rect(`${e.id}.frame-r`, x1 - 4, top(h), 4, h - P, hout, { afronding: 0.8 });
      if (v.houtframe === 'rondom') rect(`${e.id}.frame-v`, x0 + 4, top(zithoogte - kussenDik), p.b - 8, 4, hout);
    };
    const rugKeuze = opt.get('rug');
    const rugH = hoogtesVan(ontwerp, catalogus, e).rughoogte;
    const capitonne = rugKeuze?.teken?.capitonne === true;
    const losseRug = rugKeuze?.teken?.los === true;
    const rugBoven = e.rotatie === 0 || e.rotatie === 180;
    const top = (h: number) => -h;

    switch (t.tekenstijl) {
      case 'zit':
      case 'hoek': {
        // Rug: over de hele breedte (rug achter of voor) of als smalle strook opzij.
        const rugX = rugBoven ? x0 : e.rotatie === 90 ? x1 - 18 : x0;
        const rugB = rugBoven ? p.b : 18;
        const frameRug = karkasHoogteVan(ontwerp, catalogus, e, losseRug);
        if (v.rugvorm === 'rond' && rugBoven) pad(`${e.id}.rug`, bovenRond(rugX, top(frameRug), rugB, frameRug - P, 14), rugX, top(frameRug), rugB, frameRug - P, donker, lijn);
        else rect(`${e.id}.rug`, rugX, top(frameRug), rugB, frameRug - P, donker, { afronding: 4, ...lijn });
        if (t.tekenstijl === 'hoek') rect(`${e.id}.rug2`, e.rotatie === 0 || e.rotatie === 270 ? x0 : x1 - 18, top(frameRug), 18, frameRug - P, donker, { afronding: 4, ...lijn });
        if (capitonne && rugBoven) {
          const knopen: string[] = [];
          const kolommen = Math.max(2, Math.round(p.b / 18));
          for (let r = 0; r < 2; r++)
            for (let k = 0; k < kolommen; k++) {
              const cx = x0 + (p.b / kolommen) * (k + 0.5) + (r % 2 ? p.b / kolommen / 2 : 0);
              if (cx > x1 - 4) continue;
              const cy = top(zithoogte + 12 + r * 12);
              knopen.push(`M${rond(cx - 1.2)} ${rond(cy)} a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0`);
            }
          pad(`${e.id}.capitonne`, knopen.join(' '), x0, top(rugH), p.b, rugH, donkerder(stof, 0.6), { lijndikte: 0.5 });
        }
        if (losseRug && rugBoven && opt.get('nekrol')?.teken?.nekrol === true) rect(`${e.id}.nekrol`, x0 + 2, top(frameRug + 11), p.b - 4, 13, stof, { afronding: 6.5, ...lijn });
        if (losseRug && rugBoven) {
          const n = Math.max(1, Math.round(v.rugkussens ?? v.zitkussens));
          for (let i = 0; i < n; i++)
            rect(`${e.id}.rugkussen${n > 1 ? i + 1 : ''}`, x0 + 3 + (i * (p.b - 6)) / n, top(rugH), (p.b - 6) / n - (i < n - 1 ? 0.8 : 0), rugH - zithoogte + 2, stof, { afronding: 2 + zacht, ...lijn });
        }
        // Basis, houten frame en zitkussen(s).
        rect(`${e.id}.basis`, x0, top(zithoogte - kussenDik), p.b, zithoogte - kussenDik - P, donker, { afronding: 2, ...lijn });
        if (kussenDik) zitkussens(x0 + 1, p.b - 2, top(zithoogte), kussenDik);
        houtframe(zithoogte + 2);
        maxHoogte = Math.max(maxHoogte, rugH);
        break;
      }
      case 'rugleuning':
      case 'kussen':
      case 'rolkussen': {
        const basis = draagHoogte(e);
        if (t.tekenstijl === 'rugleuning') {
          const rugTop = rugleuningTop(ontwerp, catalogus, e);
          rect(`${e.id}.rugleuning`, x0, top(rugTop), p.b, rugTop - basis, donker, { afronding: 2 + zacht, ...lijn });
          maxHoogte = Math.max(maxHoogte, rugTop);
        } else if (t.tekenstijl === 'kussen') {
          const h = t.hoogte ?? Math.round(e.breedte * 0.9);
          rect(`${e.id}.kussen`, x0 + 1, top(zithoogte + h), p.b - 2, h, stof, { afronding: Math.min(p.b, h) / 3, ...lijn });
          maxHoogte = Math.max(maxHoogte, zithoogte + h);
        } else {
          rect(`${e.id}.rol`, x0, top(zithoogte + e.diepte), p.b, e.diepte, stof, { afronding: e.diepte / 2, ...lijn });
        }
        break;
      }
      case 'kuip': {
        // Kuip (rond, omhullend, organisch, schelp …): silhouet van de gebogen wand, hoog achteraan en aflopend naar de armen.
        const kp = kuipParameters(opt.get('kuipvorm')?.teken);
        if (kp) {
          const opb = kuipOpbouw(e.breedte, e.diepte, { P, zithoogte, rugH, kussenDik }, kp, losseRug);
          const wereld = (lx: number, ly: number) => lokaalNaarWereld(e, lx, ly, 0, 0);
          // Middenlijn fijn bemonsterd (om de ½ cm, hoogte ertussen), anders wordt de bovenlijn golvend of krijgt ze gaten.
          const pw: { x: number; y: number }[] = [], hw: number[] = [];
          opb.wand.pad.forEach(([lx, ly], i) => {
            if (i === 0) { pw.push(wereld(lx, ly)); hw.push(opb.wand.hoogtes[0]!); return; }
            const [vx, vy] = opb.wand.pad[i - 1]!, n = Math.max(1, Math.ceil(Math.hypot(lx - vx, ly - vy) / 0.5));
            for (let k = 1; k <= n; k++) {
              const f = k / n;
              pw.push(wereld(vx + (lx - vx) * f, vy + (ly - vy) * f));
              hw.push(opb.wand.hoogtes[i - 1]! + (opb.wand.hoogtes[i]! - opb.wand.hoogtes[i - 1]!) * f);
            }
          });
          const half = opb.wand.dikte / 2;
          const midZ = voetafdruk(e).y + voetafdruk(e).h / 2;
          /** Bovenlijn (omhullende) van de wanddelen; alleenVoor = enkel het deel vóór het midden (de armen). */
          const omhullende = (alleenVoor: boolean) => {
            const stap = 1, n = Math.ceil(p.b / stap) + 1;
            const top = new Array<number>(n).fill(-1);
            pw.forEach((q, i) => {
              if (alleenVoor && q.y < midZ) return;
              const hT = hw[i]!;
              for (let k = 0; k < n; k++) {
                const dx = x0 + k * stap - q.x;
                if (Math.abs(dx) > half) continue;
                top[k] = Math.max(top[k]!, hT - half + Math.sqrt(half * half - dx * dx));
              }
            });
            const pts: string[] = [];
            let eerste = -1, laatste = -1;
            top.forEach((t, k) => { if (t > 0) { if (eerste < 0) eerste = k; laatste = k; } });
            if (eerste < 0) return null;
            pts.push(`M${rond(x0 + eerste * stap)} ${rond(-opb.wand.onder)}`);
            for (let k = eerste; k <= laatste; k++) pts.push(`L${rond(x0 + k * stap)} ${rond(-Math.max(top[k]!, opb.wand.onder))}`);
            pts.push(`L${rond(x0 + laatste * stap)} ${rond(-opb.wand.onder)} Z`);
            const hMax = Math.max(...top);
            return { d: pts.join(' '), x: x0 + eerste * stap, b: (laatste - eerste) * stap, hMax };
          };
          const achter = omhullende(false);
          if (achter) pad(`${e.id}.rug`, achter.d, achter.x, top(achter.hMax), achter.b, achter.hMax - opb.wand.onder, donker, lijn);
          const xs = (pts: [number, number][]) => { const w = pts.map(([lx, ly]) => wereld(lx, ly).x); return [Math.min(...w), Math.max(...w)] as const; };
          for (const [i, k] of opb.rugkussens.entries()) {
            const a = wereld(k.lx, k.ly), c = wereld(k.lx + k.lb, k.ly + k.ld);
            const xa = Math.min(a.x, c.x), xb = Math.max(a.x, c.x);
            rect(`${e.id}.rugkussen${opb.rugkussens.length > 1 ? i + 1 : ''}`, xa, top(k.y + k.h), xb - xa, k.h, stof, { afronding: 2 + zacht, ...lijn });
          }
          const [bx0, bx1] = xs(opb.plan);
          rect(`${e.id}.basis`, bx0, top(opb.basis.boven), bx1 - bx0, opb.basis.boven - opb.basis.onder, donker, { afronding: kp.plan === 'rond' ? Math.min(14, (opb.basis.boven - opb.basis.onder) / 2) : 6, ...lijn });
          if (kussenDik) { const [zx0, zx1] = xs(opb.zit); rect(`${e.id}.zitkussen`, zx0, top(zithoogte), zx1 - zx0, kussenDik, stof, { afronding: zacht, ...lijn }); }
          const voor = kp.zwevend ? null : omhullende(true);
          if (voor) pad(`${e.id}.arm`, voor.d, voor.x, top(voor.hMax), voor.b, voor.hMax - opb.wand.onder, stof, lijn);
          maxHoogte = Math.max(maxHoogte, ...opb.wand.hoogtes, ...opb.rugkussens.map((k) => k.y + k.h));
          break;
        }
        const kvorm = String(te('kuipvorm', 'vorm', 'afgerond'));
        const armB = Math.max(10, Math.min(20, p.b * 0.16));
        const r = kvorm === 'rond' ? p.b / 2.6 : kvorm === 'afgerond' ? 14 : 4;
        pad(`${e.id}.rug`, bovenRond(x0, top(rugH), p.b, rugH - P, r), x0, top(rugH), p.b, rugH - P, donker, lijn);
        rect(`${e.id}.basis`, x0, top(zithoogte - kussenDik), p.b, zithoogte - kussenDik - P, donker, { afronding: kvorm === 'hoekig' ? 2 : 6, ...lijn });
        if (kussenDik) rect(`${e.id}.zitkussen`, x0 + armB - 2, top(zithoogte), p.b - 2 * armB + 4, kussenDik, stof, { afronding: zacht, ...lijn });
        for (const [k, xa] of [['l', x0], ['r', x1 - armB]] as const)
          pad(`${e.id}.arm-${k}`, bovenRond(xa, top(zithoogte + 16), armB, zithoogte + 16 - P, armB / 2), xa, top(zithoogte + 16), armB, zithoogte + 16 - P, stof, lijn);
        maxHoogte = Math.max(maxHoogte, rugH);
        break;
      }
      case 'chaise':
      case 'zit_zonder_rug':
      case 'poef': {
        // Chaise longue met rugleuning: de rug op zijn plaats in het vooraanzicht (breedte uit de voetafdruk van de rug).
        const kant = t.tekenstijl === 'chaise' ? chaiseRugVan(opt) : null;
        if (kant) {
          const frameRug = karkasHoogteVan(ontwerp, catalogus, e, losseRug);
          const { rug } = chaiseRugVlak(e.breedte, e.diepte, v.rugdikte, kant);
          const w = lokaalNaarWereld(e, rug.lx, rug.ly, rug.lb, rug.ld);
          rect(`${e.id}.rug`, w.x, top(frameRug), w.b, frameRug - P, donker, { afronding: 4, ...lijn });
          if (losseRug && w.b > 40) rect(`${e.id}.rugkussen`, w.x + 3, top(rugH), w.b - 6, rugH - zithoogte + 2, stof, { afronding: 2 + zacht, ...lijn });
          maxHoogte = Math.max(maxHoogte, rugH);
        }
        const h = t.tekenstijl === 'poef' ? zithoogte - 2 : zithoogte;
        const dik = t.tekenstijl === 'poef' ? 0 : kussenDik;
        const poefvorm = String(te('poefvorm', 'vorm', 'kiezel'));
        const poefRond = poefvorm === 'vierkant' ? 3 : poefvorm === 'rond' ? 4 + zacht : Math.min(p.b, h - P) / 2.5;
        rect(`${e.id}.basis`, x0, top(h - dik), p.b, h - dik - P, t.tekenstijl === 'poef' ? stof : donker, { afronding: t.tekenstijl === 'poef' ? poefRond : 2, ...lijn });
        if (dik) zitkussens(x0 + 1, p.b - 2, top(h), dik);
        if (t.tekenstijl !== 'poef') houtframe(h + 2);
        maxHoogte = Math.max(maxHoogte, h);
        break;
      }
      case 'rond': {
        // Afgerond eindelement: ronde buitenkant (links of rechts), rug op het rechte deel.
        const links = String(te('ronde_kant', 'kant', 'links')) === 'links';
        const rondDeel = Math.min(e.diepte / 2, p.b);
        const zijRond = (y: number, h: number, r: number) => {
          const rr = Math.min(r, h, p.b);
          return links
            ? `M${rond(x1)} ${rond(y)} H${rond(x0 + rr)} Q${rond(x0)} ${rond(y)} ${rond(x0)} ${rond(y + rr)} V${rond(y + h)} H${rond(x1)} Z`
            : `M${rond(x0)} ${rond(y)} H${rond(x1 - rr)} Q${rond(x1)} ${rond(y)} ${rond(x1)} ${rond(y + rr)} V${rond(y + h)} H${rond(x0)} Z`;
        };
        if (rugBoven && p.b > rondDeel) {
          const rx = links ? x0 + rondDeel : x0;
          const karkas = karkasHoogteVan(ontwerp, catalogus, e, losseRug);
          rect(`${e.id}.rug`, rx, top(karkas), p.b - rondDeel, karkas - P, donker, { afronding: v.rugvorm === 'rond' ? 12 : 4, ...lijn });
          if (losseRug && p.b - rondDeel > 6) rect(`${e.id}.rugkussen`, rx + 2, top(rugH), p.b - rondDeel - 4, rugH - zithoogte + 2, stof, { afronding: 2 + zacht, ...lijn });
          maxHoogte = Math.max(maxHoogte, rugH);
        }
        // Rug rond het uiteinde: silhouet van de gebogen wand (hoog achteraan, lager naar de ronde buitenkant), achter de zitting.
        if (rugBoven && opt.get('rug_rond')?.teken?.rond === true) {
          const karkas = karkasHoogteVan(ontwerp, catalogus, e, losseRug);
          const r = Math.min(e.diepte / 2, p.b), cx = links ? x0 + r : x1 - r, voor = zithoogte + 10;
          const punten: [number, number][] = [];
          for (let i = 0; i <= 40; i++) {
            const u = i / 40, a = ((-90 + (links ? -1 : 1) * 140 * u) * Math.PI) / 180;
            const xx = cx + (r - 0.5) * Math.cos(a);
            if ((links && xx > cx) || (!links && xx < cx)) continue;
            punten.push([xx, voor + (karkas - voor) * (0.5 + 0.5 * Math.cos(Math.PI * u))]);
          }
          if (punten.length > 1) {
            const d = `M${rond(cx)} ${rond(-P)} ${punten.map(([px, ph]) => `L${rond(px)} ${rond(-ph)}`).join(' ')} L${rond(punten[punten.length - 1]![0])} ${rond(-P)} Z`;
            pad(`${e.id}.rugrond`, d, links ? x0 : cx, top(karkas), r, karkas - P, donker, lijn);
            maxHoogte = Math.max(maxHoogte, karkas);
          }
        }
        pad(`${e.id}.basis`, zijRond(top(zithoogte - kussenDik), zithoogte - kussenDik - P, 18), x0, top(zithoogte - kussenDik), p.b, zithoogte - kussenDik - P, donker, lijn);
        if (kussenDik) pad(`${e.id}.zitkussen`, zijRond(top(zithoogte), kussenDik, kussenDik), x0, top(zithoogte), p.b, kussenDik, stof, lijn);
        maxHoogte = Math.max(maxHoogte, zithoogte);
        break;
      }
      case 'arm': {
        const armH = hoogtesVan(ontwerp, catalogus, e).armhoogte;
        const armVorm = String(te('armstijl', 'vorm', 'strak'));
        const y = top(armH), h = armH - P;
        if (armVorm === 'hout') {
          rect(`${e.id}.arm`, x0, y, p.b, h, hout, { afronding: 1.5 });
        } else if (armVorm === 'rond') {
          pad(`${e.id}.arm`, bovenRond(x0, y - 3, p.b, h + 3, p.b / 2), x0, y - 3, p.b, h + 3, donker, lijn);
        } else if (armVorm === 'engels') {
          pad(`${e.id}.arm`, bovenRond(x0, y + 8, p.b, h - 8, p.b / 2.2), x0, y + 8, p.b, h - 8, donker, lijn);
        } else if (armVorm === 'uitlopend') {
          // Uitlopende arm: dezelfde doorsnede als in de 3D (uitlopendProfiel). Van voren zie je de doorsnede vooraan
          // (krul op armhoogte) met daarachter de arm die oploopt tot het karkas: samen één omtrek. Met een hoes loopt de
          // arm tot op de vloer.
          const buitenLinks = !ontwerp.elementen.some((o) => o !== e && voetafdruk(o).x + voetafdruk(o).b <= x0 + 1 && voetafdruk(o).x + voetafdruk(o).b >= x0 - 1);
          const achter = Math.max(armH, vormgevingVan(ontwerp, e).karkashoogte ?? armH);
          const onder = vorm === 'housse' ? 0 : P;
          const prof = uitlopendProfiel(p.b, zithoogte, onder);
          const cx = (x0 + x1) / 2, kant = buitenLinks ? -1 : 1;
          const punt = ([s, y, boven]: [number, number, 0 | 1], topH: number) => `${rond(cx + kant * s)} ${rond(-(boven ? topH - y : y))}`;
          // Het verste punt van de krul (naar buiten): tot daar vooraan, dan langs de buitenkant omhoog naar achteraan.
          const krul = prof.reduce((best, q, i) => (q[2] && q[0] > prof[best]![0] ? i : best), prof.findIndex((q) => q[2] === 1));
          const omtrek = [...prof.slice(0, krul + 1).map((q) => punt(q, armH)), ...prof.slice(krul).map((q) => punt(q, achter))];
          pad(`${e.id}.arm`, `M${omtrek.join(' L')} Z`, x0, rond(-achter), p.b, achter - onder, donker, lijn);
          maxHoogte = Math.max(maxHoogte, achter);
        } else if (armVorm === 'schuin') {
          // Schuin aflopend naar buiten (naar de kant zonder zitting).
          const buitenLinks = !ontwerp.elementen.some((o) => o !== e && voetafdruk(o).x + voetafdruk(o).b <= x0 + 1 && voetafdruk(o).x + voetafdruk(o).b >= x0 - 1);
          const hoog = rond(y), laag = rond(y + 10), vloer = rond(-P);
          const d = buitenLinks
            ? `M${rond(x0)} ${vloer} V${laag} L${rond(x1)} ${hoog} V${vloer} Z`
            : `M${rond(x0)} ${vloer} V${hoog} L${rond(x1)} ${laag} V${vloer} Z`;
          pad(`${e.id}.arm`, d, x0, y, p.b, h, donker, lijn);
        } else if (armVorm === 'strak') {
          // Strakke arm: dezelfde doorsnede als in de 3D (strakProfiel), met een hoes tot op de vloer.
          const buitenLinks = !ontwerp.elementen.some((o) => o !== e && voetafdruk(o).x + voetafdruk(o).b <= x0 + 1 && voetafdruk(o).x + voetafdruk(o).b >= x0 - 1);
          const onder = vorm === 'housse' ? 0 : P;
          const prof = strakProfiel(p.b, onder, armH, vormgevingVan(ontwerp, e).zachtheid, vorm === 'housse');
          const cx = (x0 + x1) / 2, kant = buitenLinks ? -1 : 1;
          pad(`${e.id}.arm`, `M${prof.map(([s, hh]) => `${rond(cx + kant * s)} ${rond(-hh)}`).join(' L')} Z`, x0, y, p.b, armH - onder, donker, lijn);
        } else {
          rect(`${e.id}.arm`, x0, y, p.b, h, donker, { afronding: 2.5, ...lijn });
        }
        if (armVorm === 'houtblad') rect(`${e.id}.blad`, x0 - 1, y - 3, p.b + 2, 3.5, hout, { afronding: 1 });
        maxHoogte = Math.max(maxHoogte, armH + 3);
        break;
      }
      case 'console': {
        if (String(opt.get('console_uitvoering')?.teken?.vorm ?? '') === 'bank') {
          const bh = zithoogte - 14;
          rect(`${e.id}.bankblad`, x0, top(bh), p.b, 5, hout, { afronding: 1 });
          rect(`${e.id}.bankpoot-l`, x0 + 3, top(bh - 5), 5, bh - 5, hout);
          rect(`${e.id}.bankpoot-r`, x1 - 8, top(bh - 5), 5, bh - 5, hout);
          maxHoogte = Math.max(maxHoogte, bh);
          break;
        }
        const ch = zithoogte + 10;
        rect(`${e.id}.console`, x0, top(ch), p.b, ch, hout, { afronding: 1.5 });
        const uitvoering = String(opt.get('console_uitvoering')?.teken?.vorm ?? 'open');
        if (uitvoering === 'open') rect(`${e.id}.vak`, x0 + 4, top(ch - 8), p.b - 8, ch - 20, donkerder(hout, 0.55));
        if (uitvoering === 'lade') {
          rect(`${e.id}.lade`, x0 + 3, top(ch - 4), p.b - 6, 14, donkerder(hout, 0.9));
          rect(`${e.id}.knop`, x0 + p.b / 2 - 3, top(ch - 10), 6, 2, '#2b2622');
        }
        if (uitvoering === 'lader') rect(`${e.id}.lader`, x0 + p.b / 2 - 5, top(ch) + 1, 10, 1.5, '#2b2622');
        if (uitvoering === 'klep') pad(`${e.id}.klep`, `M${rond(x0 + 3)} ${top(ch - 4)} H${rond(x1 - 3)} V${top(14)} H${rond(x0 + 3)} Z`, x0, top(ch), p.b, ch, 'none', { lijn: donkerder(hout, 0.6) });
        maxHoogte = Math.max(maxHoogte, ch);
        break;
      }
    }
    // Hoes tot op de grond (housse): bedekt de onderbouw.
    // Een uitlopende of strakke arm loopt zelf tot op de vloer (geen aparte rok onder de arm).
    const eigenArm = t.tekenstijl === 'arm' && ['uitlopend', 'strak'].includes(String(te('armstijl', 'vorm', 'strak')));
    if (vorm === 'housse' && t.tekenstijl !== 'console' && !t.opzet && !eigenArm) {
      // Bij een zitelement loopt de hoes door tot onder het zitkussen (zoals in de 3D).
      const hoesTop = ['zit', 'hoek', 'chaise', 'zit_zonder_rug'].includes(t.tekenstijl) ? zithoogte - kussenDik - 0.5 : P + 1;
      rect(`${e.id}.housse`, x0 + 0.5, -hoesTop, p.b - 1, hoesTop, stof, { ...lijn });
    }
    // Hoofdsteun en relax: klein symbool.
    const functie = String(te('functie', 'vorm', 'geen'));
    if ((functie === 'hoofdsteun' || functie === 'relax_hoofdsteun') && rugBoven)
      rect(`${e.id}.hoofdsteun`, x0 + 6, top(rugH + 14), p.b - 12, 14, stof, { afronding: 5, ...lijn });
    if (functie === 'relax' || functie === 'relax_hoofdsteun') rect(`${e.id}.relax`, x0 + 6, top(P + 3), p.b - 12, 3, '#555', { afronding: 1 });
    if (functie === 'hoofdsteun' || functie === 'relax_hoofdsteun') maxHoogte = Math.max(maxHoogte, rugH + 14);
  }

  // Vloer en maatlijnen.
  const afdrukken = ontwerp.elementen.map(voetafdruk);
  const maatlijnen: TekeningResultaat['maatlijnen'] = [];
  if (afdrukken.length) {
    const x0 = Math.min(...afdrukken.map((p) => p.x));
    const x1 = Math.max(...afdrukken.map((p) => p.x + p.b));
    vormen.unshift({ code: 'vloer', x: rond(x0 - 15), y: 0, breedte: rond(x1 - x0 + 30), hoogte: 0.6, vulling: '#9a9a96', lijn: '#9a9a96' });
    maatlijnen.push(
      { code: 'breedte', x1: x0, y1: 0, x2: x1, y2: 0, afstand: -12, tekst: `${rond(x1 - x0)}` },
      { code: 'hoogte', x1: x1, y1: 0, x2: x1, y2: -maxHoogte, afstand: -12, tekst: `${rond(maxHoogte)}` },
      { code: 'zithoogte', x1: x0, y1: -zithoogte, x2: x0, y2: 0, afstand: -10, tekst: `zit ${zithoogte}` },
    );
  }
  return { titel: 'Vooraanzicht (cm)', eenheid: 'cm', vormen, maatlijnen };
}
