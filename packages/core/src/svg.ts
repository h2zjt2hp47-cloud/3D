import type { TekeningResultaat } from './types.js';

export interface SvgOpties {
  /** Breedte van de SVG in pixels (hoogte volgt uit de verhouding). */
  breedtePx?: number;
  lijnkleur?: string;
  maatkleur?: string;
  achtergrond?: string;
  lettertype?: string;
}

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const kleurVeilig = (k: string | undefined, standaard: string) =>
  k && /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgba?\([0-9., %]+\))$/.test(k) ? k : standaard;

const n = (x: number) => String(Math.round(x * 100) / 100);

/** Materiaalpatroon in tekeningeenheden (cm): voegen van stenen, naden van planken, leien of zink. */
function patroonSvg(id: string, soort: string, kleur: string): string {
  const vorm: Record<string, [number, number, string, number]> = {
    steen: [22, 13, 'M0 0H22M0 6.5H22M0 0V6.5M11 6.5V13', 0.9],
    leien: [40, 24, 'M0 0H40M0 12H40M0 0V12M20 12V24', 0.8],
    natuursteen: [80, 40, 'M0 0H80M0 20H80M0 0V20M40 20V40', 0.9],
    planken: [12, 100, 'M0 0V100', 0.8],
    planken_h: [100, 15, 'M0 0H100', 0.8],
    zink: [43, 100, 'M0 0V100', 1.6],
  };
  const v = vorm[soort];
  if (!v) return '';
  const [b, h, d, dikte] = v;
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${b}" height="${h}"><path d="${d}" stroke="${kleur}" stroke-width="${dikte}" fill="none"/></pattern>`;
}

/**
 * Zet een uitgerekende tekening om naar een SVG-tekst.
 * Werkt in browser en server (geen DOM nodig), bv. voor scherm én offerte-PDF.
 */
export function tekenSvg(t: TekeningResultaat, opties: SvgOpties = {}): string {
  const lijn = opties.lijnkleur ?? '#2b2a26';
  const maat = opties.maatkleur ?? '#5f6b5c';
  const font = opties.lettertype ?? 'system-ui, sans-serif';

  // Grenzen van vormen en maatlijnen (inclusief hun verschuiving en tekst).
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const neem = (x: number, y: number) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  };
  for (const v of t.vormen) { neem(v.x, v.y); neem(v.x + v.breedte, v.y + v.hoogte); }
  if (!Number.isFinite(minX)) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>';

  const grootte = Math.max(maxX - minX, maxY - minY);
  const fs = grootte / 32; // lettergrootte
  const sw = grootte / 500; // lijndikte

  const maatlijnen = t.maatlijnen.map((m) => {
    const dx = m.x2 - m.x1, dy = m.y2 - m.y1;
    const len = Math.hypot(dx, dy);
    // Normaal naar links van de richting 1 → 2 (in SVG-coördinaten: y naar onder).
    const nx = dy / len, ny = -dx / len;
    const a = m.afstand;
    const p1 = [m.x1 + nx * a, m.y1 + ny * a] as const;
    const p2 = [m.x2 + nx * a, m.y2 + ny * a] as const;
    const tekstAfstand = fs * 0.5;
    const mid = [(p1[0] + p2[0]) / 2 + nx * tekstAfstand, (p1[1] + p2[1]) / 2 + ny * tekstAfstand] as const;
    neem(p1[0] + nx * fs * 1.6, p1[1] + ny * fs * 1.6);
    neem(p2[0] + nx * fs * 1.6, p2[1] + ny * fs * 1.6);
    let hoek = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (hoek > 90 || hoek <= -90) hoek += 180; // tekst nooit ondersteboven
    return { m, p1, p2, nx, ny, mid, hoek };
  });

  const marge = fs * 1.2;
  minX -= marge; minY -= marge; maxX += marge; maxY += marge;
  const w = maxX - minX, h = maxY - minY;
  const breedtePx = opties.breedtePx ?? 640;

  const delen: string[] = [];
  delen.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(minX)} ${n(minY)} ${n(w)} ${n(h)}" width="${breedtePx}" height="${Math.round((breedtePx * h) / w)}" font-family="${esc(font)}" role="img" aria-label="${esc(t.titel)}">`,
  );
  delen.push(`<title>${esc(t.titel)}</title>`);
  const defsPlaats = delen.length;
  const patronen = new Map<string, string>();
  if (opties.achtergrond) delen.push(`<rect x="${n(minX)}" y="${n(minY)}" width="${n(w)}" height="${n(h)}" fill="${kleurVeilig(opties.achtergrond, 'white')}"/>`);

  for (const v of t.vormen) {
    const stroke = kleurVeilig(v.lijn, lijn);
    const dikte = n(sw * (v.lijndikte ?? 1));
    if (v.pad !== undefined) {
      const d = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]*$/.test(v.pad) ? v.pad : '';
      delen.push(`<path data-code="${esc(v.code)}" d="${d}" fill="${kleurVeilig(v.vulling, 'none')}" stroke="${stroke}" stroke-width="${dikte}" stroke-linejoin="round"/>`);
    } else {
      const r = v.afronding ? ` rx="${n(v.afronding)}"` : '';
      delen.push(
        `<rect data-code="${esc(v.code)}" x="${n(v.x)}" y="${n(v.y)}" width="${n(v.breedte)}" height="${n(v.hoogte)}"${r} fill="${kleurVeilig(v.vulling, 'none')}" stroke="${stroke}" stroke-width="${dikte}"/>`,
      );
    }
    if (v.patroon && v.pad === undefined) {
      const pk = kleurVeilig(v.patroonKleur, '#00000055');
      const id = `pt-${v.patroon}-${pk.replace(/[^0-9a-zA-Z]/g, '')}`;
      const def = patroonSvg(id, v.patroon, pk);
      if (def) {
        patronen.set(id, def);
        delen.push(`<rect x="${n(v.x)}" y="${n(v.y)}" width="${n(v.breedte)}" height="${n(v.hoogte)}" fill="url(#${id})" stroke="none" pointer-events="none" class="patroon"/>`);
      }
    }
    if (v.symbool) delen.push(...symboolLijnen(v.x, v.y, v.breedte, v.hoogte, v.symbool, lijn, sw));
    if (v.label) {
      delen.push(
        `<text x="${n(v.x + v.breedte / 2)}" y="${n(v.y + v.hoogte / 2)}" font-size="${n(fs * 0.8)}" text-anchor="middle" dominant-baseline="central" fill="${lijn}">${esc(v.label)}</text>`,
      );
    }
  }

  for (const { m, p1, p2, nx, ny, mid, hoek } of maatlijnen) {
    const tick = fs * 0.35;
    delen.push(`<g data-code="${esc(m.code)}" stroke="${maat}" stroke-width="${n(sw)}">`);
    // Hulplijnen van het object naar de maatlijn.
    delen.push(`<line x1="${n(m.x1)}" y1="${n(m.y1)}" x2="${n(p1[0] + nx * tick)}" y2="${n(p1[1] + ny * tick)}" stroke-dasharray="${n(sw * 4)} ${n(sw * 3)}"/>`);
    delen.push(`<line x1="${n(m.x2)}" y1="${n(m.y2)}" x2="${n(p2[0] + nx * tick)}" y2="${n(p2[1] + ny * tick)}" stroke-dasharray="${n(sw * 4)} ${n(sw * 3)}"/>`);
    delen.push(`<line x1="${n(p1[0])}" y1="${n(p1[1])}" x2="${n(p2[0])}" y2="${n(p2[1])}"/>`);
    // Schuine streepjes aan de uiteinden (bouwkundige stijl).
    for (const p of [p1, p2]) {
      const dx = (p2[0] - p1[0]) / Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const dy = (p2[1] - p1[1]) / Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const sx = (dx + nx) * tick * 0.7, sy = (dy + ny) * tick * 0.7;
      delen.push(`<line x1="${n(p[0] - sx)}" y1="${n(p[1] - sy)}" x2="${n(p[0] + sx)}" y2="${n(p[1] + sy)}" stroke-width="${n(sw * 2)}"/>`);
    }
    delen.push('</g>');
    delen.push(
      `<text x="${n(mid[0])}" y="${n(mid[1])}" font-size="${n(fs)}" text-anchor="middle" dominant-baseline="central" fill="${maat}" transform="rotate(${n(hoek)} ${n(mid[0])} ${n(mid[1])})">${esc(m.tekst)}</text>`,
    );
  }

  if (patronen.size) delen.splice(defsPlaats, 0, `<defs>${[...patronen.values()].join('')}</defs>`);
  delen.push('</svg>');
  return delen.join('\n');
}

/**
 * Lijnen van een openingssymbool in een raam- of deurvak (zicht van binnen).
 * Afspraak: de punt van de driehoek wijst naar de scharnierzijde; draai-kip toont beide driehoeken.
 */
function symboolLijnen(x: number, y: number, b: number, h: number, symbool: string, kleur: string, sw: number): string[] {
  const uit: string[] = [];
  const m = Math.min(b, h) * 0.04; // kleine marge binnen het vak
  const x0 = x + m, x1 = x + b - m, y0 = y + m, y1 = y + h - m;
  const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
  const lijn = (pts: [number, number][], streep = false) =>
    uit.push(`<polyline points="${pts.map(([a, c]) => `${n(a)},${n(c)}`).join(' ')}" fill="none" stroke="${kleur}" stroke-width="${n(sw * 1.2)}"${streep ? ` stroke-dasharray="${n(sw * 6)} ${n(sw * 4)}"` : ''} data-symbool="${esc(symbool)}"/>`);
  const draai = (scharnierLinks: boolean) =>
    scharnierLinks ? lijn([[x1, y0], [x0, ym], [x1, y1]]) : lijn([[x0, y0], [x1, ym], [x0, y1]]);
  const kip = () => lijn([[x0, y0], [xm, y1], [x1, y0]], true);
  const pijl = (naarRechts: boolean) => {
    const l = (x1 - x0) * 0.5, p = Math.min(l * 0.25, (y1 - y0) * 0.08);
    const a = xm - l / 2, c = xm + l / 2;
    lijn([[a, ym], [c, ym]]);
    if (naarRechts) lijn([[c - p, ym - p], [c, ym], [c - p, ym + p]]);
    else lijn([[a + p, ym - p], [a, ym], [a + p, ym + p]]);
  };
  switch (symbool) {
    case 'draai_l': draai(true); break;
    case 'draai_r': draai(false); break;
    case 'draaikip_l': draai(true); kip(); break;
    case 'draaikip_r': draai(false); kip(); break;
    case 'kip': kip(); break;
    case 'uitzet': lijn([[x0, y1], [xm, y0], [x1, y1]]); break;
    case 'schuif_l': pijl(false); break;
    case 'schuif_r': pijl(true); break;
    default: break; // vast: geen lijnen
  }
  return uit;
}
