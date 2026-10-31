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
  if (opties.achtergrond) delen.push(`<rect x="${n(minX)}" y="${n(minY)}" width="${n(w)}" height="${n(h)}" fill="${kleurVeilig(opties.achtergrond, 'white')}"/>`);

  for (const v of t.vormen) {
    const r = v.afronding ? ` rx="${n(v.afronding)}"` : '';
    delen.push(
      `<rect data-code="${esc(v.code)}" x="${n(v.x)}" y="${n(v.y)}" width="${n(v.breedte)}" height="${n(v.hoogte)}"${r} fill="${kleurVeilig(v.vulling, 'none')}" stroke="${lijn}" stroke-width="${n(sw)}"/>`,
    );
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

  delen.push('</svg>');
  return delen.join('\n');
}
