/**
 * Tekent een plattegrond als SVG-tekst (scherm, editor en offerte-afdruk).
 * Elementen dragen data-soort en data-id, zodat een editor erop kan klikken.
 */
import {
  meubelVoetafdruk,
  muurVanOpening,
  muurVlak,
  murenVan,
  ruimteMaten,
  type Meubel,
  type MeubelType,
  type Muur,
  type Opening,
  type PlanCatalogus,
  type Plattegrond,
} from './plattegrond.js';

export interface PlanSvgOpties {
  selectie?: { soort: 'ruimte' | 'opening' | 'meubel'; id: string };
  /** Rechthoek die getekend wordt (nieuwe ruimte). */
  voorbeeld?: { x: number; y: number; b: number; d: number };
  /** Voorbeeld van een nieuwe opening op een muur. */
  voorbeeldOpening?: Opening;
  /** Extra info per opening met een offertepositie: label (bv. P3) en de opening per vak. */
  raamInfo?: (o: Opening) => { label?: string; vakken?: string[] } | undefined;
  /** Ids van ruimtes/openingen met een fout (rood omlijnd). */
  fouten?: Set<string>;
  /** Raster en grepen weglaten (voor de afdruk). */
  afdruk?: boolean;
  /** Vaste viewBox (cm); anders passend rond de plattegrond. */
  viewBox?: { x: number; y: number; b: number; d: number };
  breedtePx?: number;
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (x: number) => String(Math.round(x * 10) / 10);
const m2 = (x: number) => `${x.toFixed(1).replace('.', ',')} m²`;

/** Passende viewBox rond de plattegrond (met ruimte voor maatlijnen). */
export function planKader(plan: Plattegrond, marge = 130): { x: number; y: number; b: number; d: number } {
  if (!plan.ruimtes.length) return { x: -marge, y: -marge, b: 1200 + 2 * marge, d: 800 + 2 * marge };
  const x0 = Math.min(...plan.ruimtes.map((r) => r.x)), y0 = Math.min(...plan.ruimtes.map((r) => r.y));
  const x1 = Math.max(...plan.ruimtes.map((r) => r.x + r.b)), y1 = Math.max(...plan.ruimtes.map((r) => r.y + r.d));
  return { x: x0 - marge, y: y0 - marge, b: x1 - x0 + 2 * marge, d: y1 - y0 + 2 * marge };
}

export function tekenPlattegrond(plan: Plattegrond, cat: PlanCatalogus, opties: PlanSvgOpties = {}): string {
  const muren = murenVan(plan);
  const vb = opties.viewBox ?? planKader(plan);
  const sel = opties.selectie;
  const fouten = opties.fouten ?? new Set<string>();
  const uit: string[] = [];
  const breedte = opties.breedtePx ? ` width="${opties.breedtePx}" height="${Math.round((opties.breedtePx * vb.d) / vb.b)}"` : '';
  uit.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(vb.x)} ${n(vb.y)} ${n(vb.b)} ${n(vb.d)}"${breedte} font-family="system-ui, sans-serif" role="img" aria-label="Plattegrond">`);

  if (!opties.afdruk) {
    uit.push('<defs><pattern id="raster" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d9dcd6" stroke-width="0.8"/></pattern>'
      + '<pattern id="raster1m" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="#c5c9c2" stroke-width="1.2"/></pattern></defs>');
    uit.push(`<rect x="${n(vb.x - 2000)}" y="${n(vb.y - 2000)}" width="${n(vb.b + 4000)}" height="${n(vb.d + 4000)}" fill="#f7f7f4" data-soort="leeg"/>`);
    uit.push(`<rect x="${n(vb.x - 2000)}" y="${n(vb.y - 2000)}" width="${n(vb.b + 4000)}" height="${n(vb.d + 4000)}" fill="url(#raster)" pointer-events="none"/>`);
    uit.push(`<rect x="${n(vb.x - 2000)}" y="${n(vb.y - 2000)}" width="${n(vb.b + 4000)}" height="${n(vb.d + 4000)}" fill="url(#raster1m)" pointer-events="none"/>`);
  }

  // Vloeren.
  for (const r of plan.ruimtes) {
    const v = cat.vloeren[r.vloer];
    uit.push(`<rect data-soort="ruimte" data-id="${esc(r.id)}" x="${n(r.x)}" y="${n(r.y)}" width="${n(r.b)}" height="${n(r.d)}" fill="${v?.kleur ?? '#e7e4dc'}" fill-opacity="0.32"/>`);
  }

  // Meubels.
  for (const m of plan.meubels) {
    const t = cat.meubels[m.type];
    if (t) uit.push(meubelSvg(m, t, sel?.soort === 'meubel' && sel.id === m.id));
  }

  // Muren.
  for (const m of muren) {
    const v = muurVlak(m, muren);
    uit.push(`<rect data-soort="muur" x="${n(v.x)}" y="${n(v.y)}" width="${n(v.b)}" height="${n(v.d)}" fill="${m.soort === 'buiten' ? '#383836' : '#86857f'}"/>`);
  }

  // Openingen.
  for (const o of plan.openingen) uit.push(openingSvg(o, muurVanOpening(o, muren), opties, sel?.soort === 'opening' && sel.id === o.id, fouten.has(o.id)));
  if (opties.voorbeeldOpening) uit.push(`<g opacity="0.6">${openingSvg(opties.voorbeeldOpening, muurVanOpening(opties.voorbeeldOpening, muren), opties, true, false)}</g>`);

  // Namen en oppervlaktes.
  for (const r of plan.ruimtes) {
    const mt = ruimteMaten(plan, r, muren);
    const cx = r.x + r.b / 2, cy = r.y + r.d / 2;
    const fs = Math.max(12, Math.min(22, r.b / 8, r.d / 4));
    uit.push(`<g pointer-events="none" text-anchor="middle"><text x="${n(cx)}" y="${n(cy - fs * 0.15)}" font-size="${n(fs)}" font-weight="600" fill="#2c2f2d">${esc(r.naam)}</text>`
      + `<text x="${n(cx)}" y="${n(cy + fs * 1.05)}" font-size="${n(fs * 0.8)}" fill="#5f6763">${m2(mt.netto)}</text></g>`);
  }

  // Selectie en fouten.
  for (const r of plan.ruimtes) {
    const gekozen = sel?.soort === 'ruimte' && sel.id === r.id;
    if (fouten.has(r.id) || gekozen) {
      uit.push(`<rect x="${n(r.x + 4)}" y="${n(r.y + 4)}" width="${n(r.b - 8)}" height="${n(r.d - 8)}" fill="none" stroke="${gekozen ? '#2f6fd0' : '#c0392b'}" stroke-width="3" stroke-dasharray="${gekozen ? '0' : '10 6'}" pointer-events="none"/>`);
    }
    if (gekozen && !opties.afdruk) {
      uit.push(maatlijn(r.x, r.y, r.x + r.b, r.y, -28, `${Math.round(r.b)}`, '#2f6fd0'));
      uit.push(maatlijn(r.x, r.y + r.d, r.x, r.y, -28, `${Math.round(r.d)}`, '#2f6fd0'));
      for (const [greep, gx, gy] of [['n', r.x + r.b / 2, r.y], ['s', r.x + r.b / 2, r.y + r.d], ['w', r.x, r.y + r.d / 2], ['o', r.x + r.b, r.y + r.d / 2]] as const) {
        uit.push(`<circle data-greep="${greep}" cx="${n(gx)}" cy="${n(gy)}" r="11" fill="#fff" stroke="#2f6fd0" stroke-width="3" style="cursor:${greep === 'n' || greep === 's' ? 'ns' : 'ew'}-resize"/>`);
      }
    }
  }

  // Totale maten.
  if (plan.ruimtes.length) {
    const x0 = Math.min(...plan.ruimtes.map((r) => r.x)), y0 = Math.min(...plan.ruimtes.map((r) => r.y));
    const x1 = Math.max(...plan.ruimtes.map((r) => r.x + r.b)), y1 = Math.max(...plan.ruimtes.map((r) => r.y + r.d));
    const t = plan.buitenmuur / 2;
    uit.push(maatlijn(x1 + t, y1 + t, x0 - t, y1 + t, 70, `${Math.round(x1 - x0 + 2 * t)}`, '#4b5753'));
    uit.push(maatlijn(x1 + t, y0 - t, x1 + t, y1 + t, 70, `${Math.round(y1 - y0 + 2 * t)}`, '#4b5753'));
  }

  if (opties.voorbeeld) {
    const p = opties.voorbeeld;
    uit.push(`<rect x="${n(p.x)}" y="${n(p.y)}" width="${n(p.b)}" height="${n(p.d)}" fill="#2f6fd0" fill-opacity="0.12" stroke="#2f6fd0" stroke-width="3" stroke-dasharray="12 8" pointer-events="none"/>`);
    uit.push(`<text x="${n(p.x + p.b / 2)}" y="${n(p.y + p.d / 2)}" font-size="20" text-anchor="middle" fill="#2f6fd0" pointer-events="none">${Math.round(p.b)} × ${Math.round(p.d)}</text>`);
  }
  uit.push('</svg>');
  return uit.join('');
}

/** Maatlijn van punt 1 naar 2, verschoven over afstand (links van de richting). */
function maatlijn(x1: number, y1: number, x2: number, y2: number, afstand: number, tekst: string, kleur: string): string {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
  const nx = dy / l, ny = -dx / l;
  const a = [x1 + nx * afstand, y1 + ny * afstand], b = [x2 + nx * afstand, y2 + ny * afstand];
  const mx = (a[0]! + b[0]!) / 2 + nx * 12, my = (a[1]! + b[1]!) / 2 + ny * 12;
  let hoek = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (hoek > 90 || hoek <= -90) hoek += 180;
  return `<g pointer-events="none" stroke="${kleur}" stroke-width="1.5"><line x1="${n(a[0]!)}" y1="${n(a[1]!)}" x2="${n(b[0]!)}" y2="${n(b[1]!)}"/>`
    + `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(a[0]! + nx * 6)}" y2="${n(a[1]! + ny * 6)}" stroke-dasharray="4 4"/><line x1="${n(x2)}" y1="${n(y2)}" x2="${n(b[0]! + nx * 6)}" y2="${n(b[1]! + ny * 6)}" stroke-dasharray="4 4"/></g>`
    + `<text x="${n(mx)}" y="${n(my)}" font-size="17" fill="${kleur}" text-anchor="middle" dominant-baseline="central" transform="rotate(${n(hoek)} ${n(mx)} ${n(my)})" pointer-events="none">${esc(tekst)}</text>`;
}

/** Deurboog: blad open (loodrecht op de muur) en de draaicirkel. */
function boog(as: 'h' | 'v', L: number, a: number, b: number, scharnierBegin: boolean, s: number, stijl: string): string {
  const w = b - a, p = scharnierBegin ? a : b, q = scharnierBegin ? b : a;
  const sweepH = scharnierBegin === s > 0 ? 0 : 1;
  const sweep = as === 'h' ? sweepH : 1 - sweepH;
  const [hx, hy, ox, oy, ex, ey] = as === 'h' ? [p, L, p, L + s * w, q, L] : [L, p, L + s * w, p, L, q];
  return `<line x1="${n(hx)}" y1="${n(hy)}" x2="${n(ox)}" y2="${n(oy)}" ${stijl} stroke-width="3"/><path d="M ${n(ox)} ${n(oy)} A ${n(w)} ${n(w)} 0 0 ${sweep} ${n(ex)} ${n(ey)}" fill="none" ${stijl} stroke-width="1.4"/>`;
}

function openingSvg(o: Opening, m: Muur | undefined, opties: PlanSvgOpties, gekozen: boolean, fout: boolean): string {
  const dikte = m?.dikte ?? 20;
  const a = o.midden - o.breedte / 2, b = o.midden + o.breedte / 2, L = o.lijn, half = dikte / 2;
  const rect = (x0: number, x1: number, d0: number, d1: number, attrs: string) =>
    o.as === 'h' ? `<rect x="${n(x0)}" y="${n(L + d0)}" width="${n(x1 - x0)}" height="${n(d1 - d0)}" ${attrs}/>` : `<rect x="${n(L + d0)}" y="${n(x0)}" width="${n(d1 - d0)}" height="${n(x1 - x0)}" ${attrs}/>`;
  const lijn = (x0: number, x1: number, d: number, attrs: string) =>
    o.as === 'h' ? `<line x1="${n(x0)}" y1="${n(L + d)}" x2="${n(x1)}" y2="${n(L + d)}" ${attrs}/>` : `<line x1="${n(L + d)}" y1="${n(x0)}" x2="${n(L + d)}" y2="${n(x1)}" ${attrs}/>`;
  const kleur = fout ? '#c0392b' : gekozen ? '#2f6fd0' : '#2b2b29';
  const stijl = `stroke="${kleur}"`;
  const delen: string[] = [`<g data-soort="opening" data-id="${esc(o.id)}" style="cursor:pointer">`];
  // Opening wit uitsparen (iets breder dan de muur zodat er geen randje blijft).
  delen.push(rect(a, b, -half - 1, half + 1, 'fill="#fbfbf9"'));
  // Buitenkant: de kant zonder ruimte (bij een buitenmuur).
  const binnenPlus = m ? (m.soort === 'buiten' ? !!m.plus : o.naarPlus) : o.naarPlus;
  const s = binnenPlus ? 1 : -1;
  const info = opties.raamInfo?.(o);
  if (o.soort === 'raam' || o.soort === 'schuifraam') {
    delen.push(rect(a, b, -half, half, `fill="#fbfbf9" ${stijl} stroke-width="1.6"`));
    delen.push(lijn(a, b, -2.5, `${stijl} stroke-width="1.4"`), lijn(a, b, 2.5, `${stijl} stroke-width="1.4"`));
    const vakken = info?.vakken ?? [];
    if (o.soort === 'schuifraam' || vakken.some((v) => v.startsWith('schuif'))) {
      const d = s * (half + 18), pijl = Math.min(30, o.breedte / 6);
      delen.push(lijn(o.midden - o.breedte / 4, o.midden + o.breedte / 4, d, `${stijl} stroke-width="2"`));
      const [px, py] = o.as === 'h' ? [o.midden + o.breedte / 4, L + d] : [L + d, o.midden + o.breedte / 4];
      delen.push(o.as === 'h'
        ? `<path d="M ${n(px - pijl / 2)} ${n(py - pijl / 3)} L ${n(px)} ${n(py)} L ${n(px - pijl / 2)} ${n(py + pijl / 3)}" fill="none" ${stijl} stroke-width="2"/>`
        : `<path d="M ${n(px - pijl / 3)} ${n(py - pijl / 2)} L ${n(px)} ${n(py)} L ${n(px + pijl / 3)} ${n(py - pijl / 2)}" fill="none" ${stijl} stroke-width="2"/>`);
    } else if (vakken.length) {
      // Draaiende vakken: boog naar binnen. "Links gezien van binnen" hangt af van de kant van de muur.
      const nv = vakken.length, w = o.breedte / nv;
      const lokaalNaarPlan = o.as === 'h' ? !binnenPlus : binnenPlus; // true: lokaal x loopt tegen de planrichting in
      vakken.forEach((op, i) => {
        if (!op.startsWith('draai')) return;
        const j = lokaalNaarPlan ? nv - 1 - i : i;
        const va = a + j * w, vb = va + w;
        const linksLokaal = op.endsWith('_l');
        const scharnierBegin = lokaalNaarPlan ? !linksLokaal : linksLokaal;
        delen.push(boog(o.as, L + s * half, va, vb, scharnierBegin, s, `stroke="${kleur}" stroke-dasharray="6 5" stroke-opacity="0.75"`));
      });
    }
  } else if (o.soort === 'doorgang') {
    delen.push(lijn(a, a, 0, ''), rect(a - 1, a + 1, -half, half, `fill="${kleur}"`), rect(b - 1, b + 1, -half, half, `fill="${kleur}"`));
    delen.push(lijn(a, b, -half, `${stijl} stroke-dasharray="6 6" stroke-width="1.2"`), lijn(a, b, half, `${stijl} stroke-dasharray="6 6" stroke-width="1.2"`));
  } else {
    // Deur: kader in de muur, blad en draaicirkel naar de draaikant.
    const k = o.soort === 'buitendeur' && info?.vakken?.[0] ? info.vakken[0] : undefined;
    delen.push(rect(a, a + 4, -half, half, `fill="${kleur}"`), rect(b - 4, b, -half, half, `fill="${kleur}"`));
    const ds = o.naarPlus ? 1 : -1;
    const scharnierBegin = o.scharnier === 'begin';
    void k;
    delen.push(boog(o.as, L + ds * half, a + 4, b - 4, scharnierBegin, ds, stijl));
  }
  if (info?.label) {
    const d = -s * (half + 22);
    const [tx, ty] = o.as === 'h' ? [o.midden, L + d] : [L + d, o.midden];
    delen.push(`<g pointer-events="none"><rect x="${n(tx - 20)}" y="${n(ty - 12)}" width="40" height="24" rx="12" fill="${fout ? '#c0392b' : '#34505f'}"/><text x="${n(tx)}" y="${n(ty)}" font-size="15" font-weight="600" fill="#fff" text-anchor="middle" dominant-baseline="central">${esc(info.label)}</text></g>`);
  }
  if (gekozen) delen.push(rect(a - 4, b + 4, -half - 6, half + 6, 'fill="none" stroke="#2f6fd0" stroke-width="3"'));
  delen.push('</g>');
  return delen.join('');
}

function meubelSvg(m: Meubel, t: MeubelType, gekozen: boolean): string {
  const v = meubelVoetafdruk(m);
  const verschuif: Record<number, [number, number]> = { 0: [0, 0], 90: [m.d, 0], 180: [m.b, m.d], 270: [0, m.b] };
  const [dx, dy] = verschuif[m.rotatie] ?? [0, 0];
  const B = m.b, D = m.d, kleur = m.kleur ?? t.kleur;
  const lijn = 'stroke="#55524c" stroke-width="1.5"';
  const vul = `fill="${kleur}" fill-opacity="0.35"`;
  const d: string[] = [`<rect x="0" y="0" width="${n(B)}" height="${n(D)}" rx="${t.vorm === 'bad' || t.vorm === 'bank' || t.vorm === 'fauteuil' ? 6 : 2}" ${vul} ${lijn}/>`];
  switch (t.vorm) {
    case 'bank':
    case 'fauteuil': {
      const arm = Math.min(18, B * 0.15), rug = Math.min(20, D * 0.22);
      d.push(`<rect x="${n(arm)}" y="0" width="${n(B - 2 * arm)}" height="${n(rug)}" fill="none" ${lijn}/>`);
      d.push(`<line x1="${n(arm)}" y1="0" x2="${n(arm)}" y2="${n(D)}" ${lijn}/><line x1="${n(B - arm)}" y1="0" x2="${n(B - arm)}" y2="${n(D)}" ${lijn}/>`);
      const k = t.vorm === 'fauteuil' ? 1 : Math.max(2, Math.round((B - 2 * arm) / 80));
      for (let i = 1; i < k; i++) d.push(`<line x1="${n(arm + (i * (B - 2 * arm)) / k)}" y1="${n(rug)}" x2="${n(arm + (i * (B - 2 * arm)) / k)}" y2="${n(D)}" ${lijn}/>`);
      break;
    }
    case 'bed': {
      d.push(`<rect x="0" y="0" width="${n(B)}" height="8" fill="#55524c" fill-opacity="0.5"/>`);
      const k = B > 120 ? 2 : 1;
      for (let i = 0; i < k; i++) d.push(`<rect x="${n(8 + (i * (B - 16)) / k)}" y="14" width="${n((B - 16) / k - 4)}" height="32" rx="6" fill="#fff" ${lijn}/>`);
      d.push(`<line x1="0" y1="${n(D * 0.38)}" x2="${n(B)}" y2="${n(D * 0.38)}" ${lijn}/>`);
      break;
    }
    case 'tafel':
    case 'nachtkast':
    case 'tv':
      if (t.vorm === 'tv') d.push(`<rect x="${n(B * 0.15)}" y="${n(D / 2 - 2)}" width="${n(B * 0.7)}" height="4" fill="#222"/>`);
      break;
    case 'stoel':
      d.push(`<rect x="0" y="0" width="${n(B)}" height="5" fill="#55524c" fill-opacity="0.6"/>`);
      break;
    case 'kast':
    case 'koelkast': {
      const k = Math.max(1, Math.round(B / 50));
      d.push(`<line x1="0" y1="0" x2="${n(B)}" y2="${n(D)}" ${lijn} stroke-opacity="0.5"/>`);
      for (let i = 1; i < k; i++) d.push(`<line x1="${n((i * B) / k)}" y1="${n(D - 6)}" x2="${n((i * B) / k)}" y2="${n(D)}" ${lijn}/>`);
      break;
    }
    case 'keuken':
    case 'eiland':
      if (t.vorm === 'keuken') {
        for (const [cx, cy] of [[B * 0.2 + 15, 18], [B * 0.2 + 45, 18], [B * 0.2 + 15, 42], [B * 0.2 + 45, 42]] as const) d.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="9" fill="none" ${lijn}/>`);
        d.push(`<rect x="${n(B * 0.62)}" y="10" width="50" height="38" rx="5" fill="#fff" ${lijn}/>`);
      }
      break;
    case 'bad':
      d.push(`<rect x="8" y="8" width="${n(B - 16)}" height="${n(D - 16)}" rx="${n(Math.min(B, D) / 3)}" fill="#fff" ${lijn}/>`);
      break;
    case 'douche':
      d.push(`<line x1="0" y1="0" x2="${n(B)}" y2="${n(D)}" ${lijn}/><line x1="${n(B)}" y1="0" x2="0" y2="${n(D)}" ${lijn}/>`);
      break;
    case 'wc':
      d.push(`<rect x="4" y="0" width="${n(B - 8)}" height="16" rx="3" fill="#fff" ${lijn}/><ellipse cx="${n(B / 2)}" cy="${n(16 + (D - 16) / 2)}" rx="${n(B / 2 - 5)}" ry="${n((D - 16) / 2)}" fill="#fff" ${lijn}/>`);
      break;
    case 'lavabo':
      d.push(`<ellipse cx="${n(B / 2)}" cy="${n(D / 2 + 3)}" rx="${n(Math.min(B / 2 - 8, 25))}" ry="${n(D / 2 - 10)}" fill="#fff" ${lijn}/>`);
      break;
    case 'plant':
      d.length = 0;
      d.push(`<circle cx="${n(B / 2)}" cy="${n(D / 2)}" r="${n(Math.min(B, D) / 2)}" fill="${kleur}" fill-opacity="0.55" ${lijn}/>`);
      break;
    case 'tapijt':
      d.length = 0;
      d.push(`<rect x="0" y="0" width="${n(B)}" height="${n(D)}" fill="${kleur}" fill-opacity="0.25" stroke="#55524c" stroke-width="1" stroke-dasharray="6 5"/>`);
      break;
  }
  const kader = gekozen ? `<rect x="${n(v.x - 4)}" y="${n(v.y - 4)}" width="${n(v.b + 8)}" height="${n(v.d + 8)}" fill="none" stroke="#2f6fd0" stroke-width="3"/>` : '';
  return `<g data-soort="meubel" data-id="${esc(m.id)}" style="cursor:move"><g transform="translate(${n(m.x + dx)} ${n(m.y + dy)}) rotate(${m.rotatie})">${d.join('')}</g>${kader}</g>`;
}
