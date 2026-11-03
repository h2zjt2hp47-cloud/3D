/** SVG-tekeningen: legplan per dakvlak, kompas, opbrengst per maand en terugverdienen. */
import { MAANDEN, windstreek, type VlakLegplan } from '../../core/src/zon.js';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const r1 = (x: number) => Math.round(x * 10) / 10;
const fmt = (x: number, d = 0) => new Intl.NumberFormat('nl-BE', { maximumFractionDigits: d }).format(x);

const OBSTAKEL_NAAM = { dakraam: 'dakraam', schoorsteen: 'schoorsteen', dakkapel: 'dakkapel', verluchting: 'verluchting' } as const;

/**
 * Legplan van één dakvlak, gezien van buiten met de goot onderaan (plat dak: voorkant onderaan).
 * Panelen hebben data-sleutel zodat je ze kunt aan- en uitklikken.
 */
export function legplanSvg(l: VlakLegplan, o: { klikbaar?: boolean } = {}): string {
  const { vlak, instelling } = l;
  const W = vlak.breedte, L = vlak.lengte;
  const m = 46;
  const y = (v: number) => L - v;
  const delen: string[] = [];
  const dak = vlak.zijde === 'plat' ? '#c9c6bf' : instelling.bedekking === 'leien' ? '#5b6168' : instelling.bedekking === 'golfplaat' ? '#a9adaf' : '#b0705a';
  delen.push(`<rect x="0" y="0" width="${W}" height="${L}" fill="${dak}" stroke="#555" stroke-width="2"/>`);
  if (vlak.zijde !== 'plat' && instelling.bedekking === 'pannen') {
    for (let v = 30; v < L; v += 33) delen.push(`<line x1="0" x2="${W}" y1="${r1(y(v))}" y2="${r1(y(v))}" stroke="#000" stroke-opacity=".12" stroke-width="2"/>`);
  }
  if (vlak.zijde === 'plat') delen.push(`<rect x="-8" y="-8" width="${W + 16}" height="${L + 16}" fill="none" stroke="#777" stroke-width="8"/>`);
  const r = instelling.rand;
  delen.push(`<rect x="${r}" y="${r}" width="${Math.max(0, W - 2 * r)}" height="${Math.max(0, L - 2 * r)}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-dasharray="10 8" stroke-width="2"/>`);
  for (const ob of instelling.obstakels) {
    const kleur = ob.soort === 'dakraam' ? '#9fc3d6' : ob.soort === 'schoorsteen' ? '#8d5b46' : ob.soort === 'dakkapel' ? '#d7d2c8' : '#777';
    delen.push(`<g class="obstakel"><rect x="${ob.x}" y="${r1(y(ob.y + ob.h))}" width="${ob.b}" height="${ob.h}" fill="${kleur}" stroke="#333" stroke-width="2"/>`
      + `<text x="${ob.x + ob.b / 2}" y="${r1(y(ob.y + ob.h / 2))}" font-size="${Math.min(22, ob.b / 4)}" text-anchor="middle" dominant-baseline="middle" fill="#222">${OBSTAKEL_NAAM[ob.soort]}</text></g>`);
  }
  for (const x of l.panelen) {
    const yy = r1(y(x.v + x.d));
    const attr = o.klikbaar ? ` data-sleutel="${esc(x.sleutel)}" role="button" tabindex="0" aria-pressed="${x.actief}" aria-label="Paneel ${esc(x.sleutel)} ${x.actief ? 'aan' : 'uit'}"` : '';
    if (x.actief) {
      let cellen = '';
      // Fijne cellijnen (6 × 10 of 10 × 6 cellen).
      const kolommen = x.b < x.d ? 6 : 10, rijen = x.b < x.d ? 10 : 6;
      if (!x.richting) {
        for (let i = 1; i < kolommen; i++) cellen += `<line x1="${r1(x.u + (i * x.b) / kolommen)}" x2="${r1(x.u + (i * x.b) / kolommen)}" y1="${yy}" y2="${r1(yy + x.d)}"/>`;
        for (let i = 1; i < rijen; i++) cellen += `<line x1="${x.u}" x2="${r1(x.u + x.b)}" y1="${r1(yy + (i * x.d) / rijen)}" y2="${r1(yy + (i * x.d) / rijen)}"/>`;
      }
      // Lage rand van een schuin paneel op een plat dak.
      let laag = '';
      if (x.richting) {
        const [a, b, c, d] = x.richting === '+z' ? [x.u, yy + x.d, x.u + x.b, yy + x.d] : x.richting === '-z' ? [x.u, yy, x.u + x.b, yy] : x.richting === '+x' ? [x.u + x.b, yy, x.u + x.b, yy + x.d] : [x.u, yy, x.u, yy + x.d];
        laag = `<line x1="${r1(a)}" y1="${r1(b)}" x2="${r1(c)}" y2="${r1(d)}" stroke="#9fb6cf" stroke-width="5"/>`;
      }
      delen.push(`<g class="paneel aan"${attr}><rect x="${x.u}" y="${yy}" width="${x.b}" height="${x.d}" fill="#1c2a3a" stroke="#0b1118" stroke-width="2"/><g stroke="#3a536d" stroke-width="1">${cellen}</g>${laag}</g>`);
    } else {
      delen.push(`<g class="paneel uit"${attr}><rect x="${x.u + 2}" y="${yy + 2}" width="${x.b - 4}" height="${x.d - 4}" fill="#ffffff" fill-opacity=".25" stroke="#fff" stroke-width="3" stroke-dasharray="8 6"/></g>`);
    }
  }
  // Maten en labels.
  const fs = Math.max(20, Math.min(30, W / 28));
  delen.push(`<g font-size="${fs}" fill="#444" text-anchor="middle">`
    + `<line x1="0" x2="${W}" y1="${L + 26}" y2="${L + 26}" stroke="#666" stroke-width="2"/><line x1="0" x2="0" y1="${L + 16}" y2="${L + 36}" stroke="#666" stroke-width="2"/><line x1="${W}" x2="${W}" y1="${L + 16}" y2="${L + 36}" stroke="#666" stroke-width="2"/>`
    + `<text x="${W / 2}" y="${L + 26 + fs}">${fmt(W)} cm ${vlak.zijde === 'plat' ? '(voorkant)' : '(goot)'}</text>`
    + `<text x="${W / 2}" y="${-16}">${vlak.zijde === 'plat' ? 'achterkant' : 'nok'}</text>`
    + `<text transform="translate(${W + 30} ${L / 2}) rotate(90)">${fmt(L)} cm</text></g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-m} ${-m} ${W + 2 * m} ${L + 2 * m + 16}" class="legplan" role="img" aria-label="Legplan ${esc(vlak.naam)}: ${l.aantal} panelen">${delen.join('')}</svg>`;
}

/** Kompas: de voorgevel (huisje) en de windstreken; klik op een windstreek om de oriëntatie te kiezen. */
export function kompasSvg(orientatie: number): string {
  const R = 80;
  const punten: string[] = [];
  // Noord boven. Een azimut a ligt op hoek (a) gemeten vanaf zuid (onder) met de klok mee naar west (links)…
  const pos = (a: number, r: number) => {
    const t = ((a + 180) * Math.PI) / 180; // 0 = noord boven
    return { x: Math.sin(t) * r, y: -Math.cos(t) * r };
  };
  for (const [a, n] of [[180, 'N'], [-135, 'NO'], [-90, 'O'], [-45, 'ZO'], [0, 'Z'], [45, 'ZW'], [90, 'W'], [135, 'NW']] as [number, string][]) {
    const q = pos(a, R + 18);
    const kies = Math.abs(((orientatie - a + 540) % 360) - 180) < 1;
    punten.push(`<g class="windstreek" data-azimut="${a}" role="button" tabindex="0" aria-label="Voorgevel naar ${n}"><circle cx="${r1(q.x)}" cy="${r1(q.y)}" r="15" fill="${kies ? 'var(--accent)' : 'var(--vlak)'}" stroke="var(--lijn)"/><text x="${r1(q.x)}" y="${r1(q.y)}" text-anchor="middle" dominant-baseline="central" font-size="${n.length > 1 ? 11 : 13}" font-weight="600" fill="${kies ? 'var(--vlak)' : 'var(--inkt)'}">${n}</text></g>`);
  }
  // Huisje: voorgevel kijkt naar de oriëntatie.
  const hoek = orientatie; // SVG draait met de klok mee: zuid = onder, west = links
  const huis = `<g transform="rotate(${r1(hoek)})"><rect x="-26" y="-30" width="52" height="52" rx="3" fill="var(--accent-zacht)" stroke="var(--accent)" stroke-width="2"/><line x1="-26" x2="26" y1="22" y2="22" stroke="var(--accent)" stroke-width="6"/><path d="M0 26 L0 58" stroke="var(--accent)" stroke-width="2" marker-end="url(#pijl)"/><text y="-4" text-anchor="middle" font-size="10" fill="var(--accent)">voorgevel</text><text y="10" text-anchor="middle" font-size="10" fill="var(--accent)">↓</text></g>`;
  return `<svg viewBox="-125 -125 250 250" class="kompas" role="group" aria-label="Oriëntatie van de voorgevel: ${windstreek(orientatie)}"><defs><marker id="pijl" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="var(--accent)"/></marker></defs><circle r="${R}" fill="none" stroke="var(--lijn)" stroke-dasharray="3 5"/>${huis}${punten.join('')}</svg>`;
}

/** Staafdiagram: productie (staven) en verbruik (lijn) per maand. */
export function maandSvg(productie: number[], verbruik: number[]): string {
  const B = 640, H = 240, ml = 44, mb = 26, mt = 12;
  const max = Math.max(1, ...productie, ...verbruik) * 1.1;
  const stap = (B - ml) / 12;
  const y = (w: number) => mt + (H - mt - mb) * (1 - w / max);
  const delen: string[] = [];
  const raster = Math.pow(10, Math.floor(Math.log10(max))) / (max / Math.pow(10, Math.floor(Math.log10(max))) < 3 ? 2 : 1);
  for (let w = 0; w <= max; w += raster) {
    delen.push(`<line x1="${ml}" x2="${B}" y1="${r1(y(w))}" y2="${r1(y(w))}" stroke="var(--lijn)"/><text x="${ml - 6}" y="${r1(y(w))}" text-anchor="end" dominant-baseline="middle" font-size="11" fill="var(--zacht)">${fmt(w)}</text>`);
  }
  productie.forEach((w, i) => {
    const x = ml + i * stap + stap * 0.18;
    delen.push(`<rect x="${r1(x)}" y="${r1(y(w))}" width="${r1(stap * 0.64)}" height="${r1(y(0) - y(w))}" rx="3" fill="var(--zon)"><title>${MAANDEN[i]}: ${fmt(w)} kWh opgewekt</title></rect>`);
    delen.push(`<text x="${r1(ml + i * stap + stap / 2)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--zacht)">${MAANDEN[i]}</text>`);
  });
  const lijn = verbruik.map((w, i) => `${i ? 'L' : 'M'}${r1(ml + i * stap + stap / 2)} ${r1(y(w))}`).join(' ');
  delen.push(`<path d="${lijn}" fill="none" stroke="var(--inkt)" stroke-width="2"/>`);
  verbruik.forEach((w, i) => delen.push(`<circle cx="${r1(ml + i * stap + stap / 2)}" cy="${r1(y(w))}" r="3.5" fill="var(--vlak)" stroke="var(--inkt)" stroke-width="2"><title>${MAANDEN[i]}: ${fmt(w)} kWh verbruik</title></circle>`));
  return `<svg viewBox="0 0 ${B} ${H}" class="grafiek" role="img" aria-label="Opbrengst en verbruik per maand">${delen.join('')}</svg>`;
}

/** Lijn: cumulatieve winst over 25 jaar, met het terugverdienpunt. */
export function terugverdienSvg(cumulatief: number[], terug: number | null): string {
  const B = 640, H = 240, ml = 64, mb = 26, mt = 12, mr = 12;
  const min = Math.min(0, ...cumulatief), max = Math.max(0, ...cumulatief);
  const span = max - min || 1;
  const x = (j: number) => ml + ((B - ml - mr) * j) / 25;
  const y = (w: number) => mt + (H - mt - mb) * (1 - (w - min) / span);
  const delen: string[] = [];
  const stap = span > 40000 ? 10000 : span > 15000 ? 5000 : 2000;
  for (let w = Math.ceil(min / stap) * stap; w <= max; w += stap) {
    delen.push(`<line x1="${ml}" x2="${B - mr}" y1="${r1(y(w))}" y2="${r1(y(w))}" stroke="${w === 0 ? 'var(--inkt)' : 'var(--lijn)'}"/><text x="${ml - 6}" y="${r1(y(w))}" text-anchor="end" dominant-baseline="middle" font-size="11" fill="var(--zacht)">${fmt(w / 1000)}k €</text>`);
  }
  for (let j = 0; j <= 25; j += 5) delen.push(`<text x="${r1(x(j))}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--zacht)">${j === 0 ? 'start' : `jaar ${j}`}</text>`);
  const pad = cumulatief.map((w, j) => `${j ? 'L' : 'M'}${r1(x(j))} ${r1(y(w))}`).join(' ');
  delen.push(`<path d="${pad} L${r1(x(25))} ${r1(y(min))} L${r1(x(0))} ${r1(y(min))}Z" fill="var(--zon)" fill-opacity=".14"/>`);
  delen.push(`<path d="${pad}" fill="none" stroke="var(--zon-donker)" stroke-width="2.5"/>`);
  if (terug !== null && terug <= 25) {
    delen.push(`<circle cx="${r1(x(terug))}" cy="${r1(y(0))}" r="5" fill="var(--zon-donker)"/><text x="${r1(x(terug) + 8)}" y="${r1(y(0) - 10)}" font-size="12" fill="var(--inkt)">terugverdiend na ${fmt(terug, 1)} jaar</text>`);
  }
  return `<svg viewBox="0 0 ${B} ${H}" class="grafiek" role="img" aria-label="Winst over 25 jaar">${delen.join('')}</svg>`;
}
