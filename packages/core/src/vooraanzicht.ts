/**
 * Vooraanzicht van een vrij zetelontwerp: toont wat in het bovenaanzicht niet te zien is,
 * zoals poten, zithoogte, rughoogte, armvormen, losse kussens, capitonnage, biezen en houten delen.
 *
 * Coördinaten in cm: x = zoals in het bovenaanzicht, y = 0 is de vloer, hoger is negatief (SVG).
 */
import type { Materiaal } from './materialen.js';
import { gekozenOpties, voetafdruk, type Ontwerp, type OntwerpCatalogus, type OptieKeuze } from './ontwerp.js';
import type { TekeningResultaat, VormResultaat } from './types.js';

const rond = (x: number) => Math.round(x * 100) / 100;

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
  const zithoogte = Number(tz('zithoogte', 'hoogte', 45));

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
  for (const e of volgorde) {
    const t = typen.get(e.type);
    if (!t) continue;
    const p = voetafdruk(e);
    const opt = gekozenOpties(ontwerp, catalogus, e);
    const te = (groep: string, veld: string, standaard: number | string | boolean) => opt.get(groep)?.teken?.[veld] ?? standaard;
    const m = (e.materiaal && mats.get(e.materiaal)) || mats.get(ontwerp.hoofdmateriaal);
    const stof = m?.kleur ?? '#cccccc';
    const donker = donkerder(stof);
    const naad = opt.get('naad');
    const lijn: Partial<VormResultaat> =
      naad?.teken?.bies ? { lijndikte: 2.6, lijn: naad.teken.contrast ? '#2b2622' : donkerder(stof, 0.7) } : naad?.teken?.stiksel ? { lijndikte: 1.6 } : {};

    // --- Poten / onderbouw ---
    const potenKeuze: OptieKeuze | undefined = opt.get('poten');
    const vorm = String(potenKeuze?.teken?.vorm ?? 'conisch');
    const P = vorm === 'plint' ? 4 : vorm === 'verdekt' ? Math.min(Number(te('poothoogte', 'hoogte', 12)), 8) : Number(te('poothoogte', 'hoogte', 12));
    const potKleur = potenKeuze?.teken?.metaal ? (potenKeuze.teken.kleur ? String(potenKeuze.teken.kleur) : metaal) : hout;
    const x0 = p.x, x1 = p.x + p.b, inset = Math.min(5, p.b / 6);
    if (t.tekenstijl !== 'console') {
      switch (vorm) {
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
    const kussenDik = zitting === 'vaste_zitting' ? 0 : 14;
    const rugKeuze = opt.get('rug');
    const rugH = Number(te('rughoogte', 'hoogte', 80));
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
        const frameRug = losseRug ? rugH - 10 : rugH;
        rect(`${e.id}.rug`, rugX, top(frameRug), rugB, frameRug - P, donker, { afronding: 4, ...lijn });
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
        if (losseRug && rugBoven) rect(`${e.id}.rugkussen`, x0 + 3, top(rugH), p.b - 6, rugH - zithoogte + 2, stof, { afronding: 6, ...lijn });
        // Basis en zitkussen.
        rect(`${e.id}.basis`, x0, top(zithoogte - kussenDik), p.b, zithoogte - kussenDik - P, donker, { afronding: 2, ...lijn });
        if (kussenDik) rect(`${e.id}.zitkussen`, x0 + 1, top(zithoogte), p.b - 2, kussenDik, stof, { afronding: 4, ...lijn });
        maxHoogte = Math.max(maxHoogte, rugH);
        break;
      }
      case 'chaise':
      case 'zit_zonder_rug':
      case 'poef': {
        const h = t.tekenstijl === 'poef' ? zithoogte - 2 : zithoogte;
        const dik = t.tekenstijl === 'poef' ? 0 : kussenDik;
        rect(`${e.id}.basis`, x0, top(h - dik), p.b, h - dik - P, t.tekenstijl === 'poef' ? stof : donker, { afronding: t.tekenstijl === 'poef' ? 5 : 2, ...lijn });
        if (dik) rect(`${e.id}.zitkussen`, x0 + 1, top(h), p.b - 2, dik, stof, { afronding: 4, ...lijn });
        maxHoogte = Math.max(maxHoogte, h);
        break;
      }
      case 'arm': {
        const armH = Number(te('armhoogte', 'hoogte', 62));
        const armVorm = String(te('armstijl', 'vorm', 'strak'));
        const y = top(armH), h = armH - P;
        if (armVorm === 'hout') {
          rect(`${e.id}.arm`, x0, y, p.b, h, hout, { afronding: 1.5 });
        } else if (armVorm === 'rond') {
          pad(`${e.id}.arm`, bovenRond(x0, y - 3, p.b, h + 3, p.b / 2), x0, y - 3, p.b, h + 3, donker, lijn);
        } else if (armVorm === 'engels') {
          pad(`${e.id}.arm`, bovenRond(x0, y + 8, p.b, h - 8, p.b / 2.2), x0, y + 8, p.b, h - 8, donker, lijn);
        } else if (armVorm === 'schuin') {
          // Schuin aflopend naar buiten (naar de kant zonder zitting).
          const buitenLinks = !ontwerp.elementen.some((o) => o !== e && voetafdruk(o).x + voetafdruk(o).b <= x0 + 1 && voetafdruk(o).x + voetafdruk(o).b >= x0 - 1);
          const hoog = rond(y), laag = rond(y + 10), vloer = rond(-P);
          const d = buitenLinks
            ? `M${rond(x0)} ${vloer} V${laag} L${rond(x1)} ${hoog} V${vloer} Z`
            : `M${rond(x0)} ${vloer} V${hoog} L${rond(x1)} ${laag} V${vloer} Z`;
          pad(`${e.id}.arm`, d, x0, y, p.b, h, donker, lijn);
        } else {
          rect(`${e.id}.arm`, x0, y, p.b, h, donker, { afronding: 2.5, ...lijn });
        }
        if (armVorm === 'houtblad') rect(`${e.id}.blad`, x0 - 1, y - 3, p.b + 2, 3.5, hout, { afronding: 1 });
        maxHoogte = Math.max(maxHoogte, armH + 3);
        break;
      }
      case 'console': {
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
