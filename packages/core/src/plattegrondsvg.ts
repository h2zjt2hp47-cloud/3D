/**
 * Tekent een plattegrond als SVG-tekst (scherm, editor en offerte-afdruk).
 * Elementen dragen data-soort en data-id, zodat een editor erop kan klikken.
 */
import {
  asVan,
  delenVan,
  heeftBestaand,
  muurStatus,
  NEUTRAAL,
  langsAs,
  verschuifZijden,
  vormVanDeel,
  type Punt,
  meubelAfstanden,
  meubelVoetafdruk,
  muurVanOpening,
  openingAfstanden,
  muurVlak,
  murenVan,
  ruimteMaten,
  type Meubel,
  type MeubelType,
  type Muur,
  type Opening,
  type PlanCatalogus,
  type Plattegrond,
  ALLE_VAKKEN,
  TECHNIEK_VAKKEN,
  leidingVerloop,
  maatVan,
  toestelMaten,
  vloerHoogte,
  type TechniekCatalogus,
  type TechniekVak,
  type Toestel,
  type ToestelType,
} from './plattegrond.js';
import { losseWandAfstanden, losseWandAs, losseWandLengte, losseWandRuimte, losseWandVlak, opLosseWand, type LosseWand } from './lossewand.js';

export interface PlanSvgOpties {
  selectie?: { soort: 'ruimte' | 'opening' | 'meubel' | 'daklicht' | 'toestel' | 'leiding' | 'wand'; id: string };
  /**
   * Techniek (ronde 10): een teken per toestel en een gekleurde lijn per leiding, per vak aan of uit: `true` = alle vakken,
   * of de lijst van de vakken die getekend worden. Vraagt `cat.techniek`. Ontbreekt = geen techniek (de tekening van
   * vroeger). Een leiding in de vloer is gestreept, tegen het plafond streep-punt, in de wand of op een eigen hoogte vol.
   */
  techniek?: boolean | TechniekVak[];
  /** Hellend dak boven deze verdieping: de rand met de oversteek (stippellijn) en de nok of de hoge kant. */
  dakLijnen?: { omtrek: { x: number; y: number; b: number; d: number }; nok: { x1: number; y1: number; x2: number; y2: number }; tekst: string };
  /** Lichtstraten krijgen een nok in de tekening: de codes (`type`) die een lichtstraat zijn. */
  lichtstraten?: Set<string>;
  /** Noordpijl tekenen, ook als het plan geen noordrichting heeft (dan wijst ze naar boven). Met `plan.noord` staat ze er altijd. */
  noordpijl?: boolean;
  /** Rechthoek die getekend wordt (nieuwe ruimte). */
  voorbeeld?: { x: number; y: number; b: number; d: number };
  /** Voorbeeld van een nieuwe opening op een muur. */
  voorbeeldOpening?: Opening;
  /**
   * Extra info per opening met een offertepositie: label (bv. P3), de opening per vak (links → rechts gezien van binnen)
   * en de breedte per vak (in dezelfde volgorde; alleen de verhouding telt). Zonder breedtes zijn de vakken even breed.
   */
  raamInfo?: (o: Opening) => { label?: string; vakken?: string[]; breedtes?: number[] } | undefined;
  /** Ids van ruimtes/openingen met een fout (rood omlijnd). */
  fouten?: Set<string>;
  /** Raster en grepen weglaten (voor de afdruk). */
  afdruk?: boolean;
  /** Verdieping eronder, licht getekend als onderlegger (met trapgaten). */
  onderlegger?: Plattegrond;
  /** Lijn die getekend wordt (nieuwe wand). */
  voorbeeldWand?: { x1: number; y1: number; x2: number; y2: number };
  /** Een losse wand die getekend wordt (ronde 2d): haar grondvlak, half doorzichtig, met haar lengte. */
  voorbeeldLosseWand?: LosseWand;
  /** Centimeter per schermpixel: bij inzoomen blijven tekst en labels even groot op het scherm. */
  schaal?: number;
  /** Raster per 10 cm tonen (bij inzoomen). */
  fijnRaster?: boolean;
  /** Vaste viewBox (cm); anders passend rond de plattegrond. */
  viewBox?: { x: number; y: number; b: number; d: number };
  breedtePx?: number;
  /**
   * Een nieuwe vorm uit gemeten maten (het scherm *Ruimte met maten*): de omtrek waarop gemeten is, de as van de muren,
   * en maten (bv. de afstand tot de hoek van de gevel).
   */
  voorbeeldVorm?: { punten: Punt[]; gemeten: Punt[]; maten: { van: Punt; tot: Punt; tekst: string }[]; fout?: boolean };
  /**
   * Maten aantikken (de editor): elke maat krijgt een onzichtbaar vlak `data-maat` van minstens 44 beeldpunten, en een
   * gekozen vrije vorm toont de maat van elke zijde en een greep per hoekpunt (`data-hoekgreep`). Zonder deze optie blijft
   * de tekening zoals vroeger.
   */
  maatDoelen?: boolean;
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (x: number) => String(Math.round(x * 10) / 10);
const m2 = (x: number) => `${x.toFixed(1).replace('.', ',')} m²`;

/** Passende viewBox rond de plattegrond (met ruimte voor maatlijnen). */
export function planKader(plan: Plattegrond, marge = 130): { x: number; y: number; b: number; d: number } {
  const delen = plan.ruimtes.flatMap(delenVan);
  if (!delen.length) return { x: -marge, y: -marge, b: 1200 + 2 * marge, d: 800 + 2 * marge };
  let x0 = Math.min(...delen.map((r) => r.x)), y0 = Math.min(...delen.map((r) => r.y));
  let x1 = Math.max(...delen.map((r) => r.x + r.b)), y1 = Math.max(...delen.map((r) => r.y + r.d));
  // Een losse wand buiten de ruimtes (een tuinmuur) komt mee in beeld; binnen verandert er niets.
  for (const w of plan.losseWanden ?? []) for (const [x, y] of [w.van, w.tot]) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x: x0 - marge, y: y0 - marge, b: x1 - x0 + 2 * marge, d: y1 - y0 + 2 * marge };
}

/**
 * De passende viewBox met de techniek erbij: een buitenunit, een leiding naar de straat of naar de regenwaterput ligt
 * vaak buiten het kader van de ruimtes. Zonder toestellen en leidingen is ze gelijk aan `planKader`.
 */
export function planKaderMetTechniek(plan: Plattegrond, marge = 130): { x: number; y: number; b: number; d: number } {
  const k = planKader(plan, marge);
  const punten = [...(plan.toestellen ?? []).map((t): Punt => [t.x, t.y]), ...(plan.leidingen ?? []).flatMap((l) => l.punten)];
  if (!punten.length) return k;
  const x0 = Math.min(k.x, ...punten.map((p) => p[0] - 60)), y0 = Math.min(k.y, ...punten.map((p) => p[1] - 60));
  const x1 = Math.max(k.x + k.b, ...punten.map((p) => p[0] + 60)), y1 = Math.max(k.y + k.d, ...punten.map((p) => p[1] + 60));
  return { x: x0, y: y0, b: x1 - x0, d: y1 - y0 };
}

export function tekenPlattegrond(plan: Plattegrond, cat: PlanCatalogus, opties: PlanSvgOpties = {}): string {
  const muren = murenVan(plan);
  // Met techniek ook wat buiten de woning ligt (buitenunit, leiding naar buiten); zonder blijft het kader van vroeger.
  const vb = opties.viewBox ?? (opties.techniek && cat.techniek ? planKaderMetTechniek(plan) : planKader(plan));
  const sel = opties.selectie;
  const fouten = opties.fouten ?? new Set<string>();
  // Tekstfactor: 1 bij passend beeld, kleiner bij inzoomen.
  const k = opties.schaal ? Math.min(1, Math.max(0.06, opties.schaal / 1.6)) : 1;
  /** Met `maatDoelen`: een vlak om deze maat aan te tikken. */
  const raak = (doel: string) => (opties.maatDoelen && !opties.afdruk ? { doel, schaal: opties.schaal ?? 1 } : undefined);
  const uit: string[] = [];
  const breedte = opties.breedtePx ? ` width="${opties.breedtePx}" height="${Math.round((opties.breedtePx * vb.d) / vb.b)}"` : '';
  uit.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(vb.x)} ${n(vb.y)} ${n(vb.b)} ${n(vb.d)}"${breedte} font-family="system-ui, sans-serif" role="img" aria-label="Plattegrond">`);

  if (!opties.afdruk) {
    uit.push('<defs><pattern id="raster" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d9dcd6" stroke-width="0.8"/></pattern>'
      + '<pattern id="raster1m" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="#c5c9c2" stroke-width="1.2"/></pattern></defs>');
    uit.push(`<rect x="${n(vb.x - 2000)}" y="${n(vb.y - 2000)}" width="${n(vb.b + 4000)}" height="${n(vb.d + 4000)}" fill="#f7f7f4" data-soort="leeg"/>`);
    if (opties.fijnRaster) {
      uit.push('<defs><pattern id="raster10" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e8eae5" stroke-width="0.4"/></pattern></defs>');
      uit.push(`<rect x="${n(vb.x - 2000)}" y="${n(vb.y - 2000)}" width="${n(vb.b + 4000)}" height="${n(vb.d + 4000)}" fill="url(#raster10)" pointer-events="none"/>`);
    }
    uit.push(`<rect x="${n(vb.x - 2000)}" y="${n(vb.y - 2000)}" width="${n(vb.b + 4000)}" height="${n(vb.d + 4000)}" fill="url(#raster)" pointer-events="none"/>`);
    uit.push(`<rect x="${n(vb.x - 2000)}" y="${n(vb.y - 2000)}" width="${n(vb.b + 4000)}" height="${n(vb.d + 4000)}" fill="url(#raster1m)" pointer-events="none"/>`);
  }

  // Onderlegger: muren en trapgaten van de verdieping eronder.
  if (opties.onderlegger) {
    const ol = opties.onderlegger;
    const mo = murenVan(ol);
    uit.push('<g pointer-events="none" opacity="0.35">');
    for (const m of mo) {
      const v = muurVlak(m, mo);
      uit.push(v.punten
        ? `<polygon points="${punten(v.punten)}" fill="none" stroke="#6b7a85" stroke-width="1.5" stroke-dasharray="8 6"/>`
        : `<rect x="${n(v.x)}" y="${n(v.y)}" width="${n(v.b)}" height="${n(v.d)}" fill="none" stroke="#6b7a85" stroke-width="1.5" stroke-dasharray="8 6"/>`);
    }
    uit.push('</g>');
  }

  // Vloeren (alle delen van een ruimte). Een bestaande ruimte (ronde 11): effen neutraal, wat dichter.
  for (const r of plan.ruimtes) {
    const v = cat.vloeren[r.vloer];
    const [kleur, dicht] = r.bestaand === true ? [NEUTRAAL.vloer, '0.75'] : [v?.kleur ?? '#e7e4dc', '0.32'];
    for (const p of delenVan(r)) {
      uit.push(p.omtrek
        ? `<polygon data-soort="ruimte" data-id="${esc(r.id)}" points="${punten(vormVanDeel(p))}" fill="${kleur}" fill-opacity="${dicht}"/>`
        : `<rect data-soort="ruimte" data-id="${esc(r.id)}" x="${n(p.x)}" y="${n(p.y)}" width="${n(p.b)}" height="${n(p.d)}" fill="${kleur}" fill-opacity="${dicht}"/>`);
    }
  }
  // Trapgat boven een trap van de verdieping eronder.
  for (const t of opties.onderlegger?.meubels.filter((m) => m.type === 'trap') ?? []) {
    const v = meubelVoetafdruk(t);
    uit.push(`<g pointer-events="none"><rect x="${n(v.x)}" y="${n(v.y)}" width="${n(v.b)}" height="${n(v.d)}" fill="#fff" fill-opacity="0.7" stroke="#2b2b29" stroke-width="2" stroke-dasharray="10 6"/>`
      + `<line x1="${n(v.x)}" y1="${n(v.y)}" x2="${n(v.x + v.b)}" y2="${n(v.y + v.d)}" stroke="#2b2b29" stroke-width="1"/><line x1="${n(v.x + v.b)}" y1="${n(v.y)}" x2="${n(v.x)}" y2="${n(v.y + v.d)}" stroke="#2b2b29" stroke-width="1"/>`
      + `<text x="${n(v.x + v.b / 2)}" y="${n(v.y + v.d / 2)}" font-size="14" text-anchor="middle" dominant-baseline="central" fill="#2b2b29" transform="rotate(${v.d > v.b ? -90 : 0} ${n(v.x + v.b / 2)} ${n(v.y + v.d / 2)})">trapgat</text></g>`);
  }

  // Meubels.
  for (const m of plan.meubels) {
    const t = cat.meubels[m.type];
    if (t) uit.push(meubelSvg(m, t, sel?.soort === 'meubel' && sel.id === m.id));
  }

  // Muren. Wat bestaat of van de buren is (ronde 11), lichter: het wordt niet gebouwd.
  const oud = heeftBestaand(plan);
  for (const m of muren) {
    const v = muurVlak(m, muren);
    const status = oud ? muurStatus(plan, m) : 'nieuw';
    const kleur = status === 'buren' ? '#9d9a93' : status === 'bestaand' ? '#a9a69f' : m.soort === 'buiten' ? '#383836' : '#86857f';
    uit.push(v.punten
      ? `<polygon data-soort="muur" data-id="${esc(m.id)}" points="${punten(v.punten)}" fill="${kleur}" stroke="${kleur}" stroke-width="0.6" stroke-linejoin="round"/>`
      : `<rect data-soort="muur" x="${n(v.x)}" y="${n(v.y)}" width="${n(v.b)}" height="${n(v.d)}" fill="${kleur}"/>`);
    // Tegen de buren: een smalle arcering aan de buitenkant en het woord "buren", zodat je ziet dat daar niet gebouwd wordt.
    if (status === 'buren' && m.as !== 's') {
      const buitenMin = !m.min, w = 40;
      const r = m.as === 'h'
        ? { x: v.x, y: buitenMin ? v.y - w : v.y + v.d, b: v.b, d: w }
        : { x: buitenMin ? v.x - w : v.x + v.b, y: v.y, b: w, d: v.d };
      const cx = r.x + r.b / 2, cy = r.y + r.d / 2, draai = m.as === 'v' ? -90 : 0;
      uit.push(`<g pointer-events="none"><rect x="${n(r.x)}" y="${n(r.y)}" width="${n(r.b)}" height="${n(r.d)}" fill="${NEUTRAAL.buren}" fill-opacity="0.6"/>`
        + `<text x="${n(cx)}" y="${n(cy)}" font-size="${n(Math.min(r.b, r.d) * 0.45)}" text-anchor="middle" dominant-baseline="central" fill="#55524c" transform="rotate(${draai} ${n(cx)} ${n(cy)})">buren</text></g>`);
    }
  }

  // Losse wanden (ronde 2d): na de muren en vóór de openingen. Zie `losseWandSvg`.
  const losse = plan.losseWanden ?? [];
  for (const w of losse) uit.push(losseWandSvg(plan, w, muren, losse, opties, k, sel?.soort === 'wand' && sel.id === w.id, fouten.has(w.id), raak));
  if (opties.voorbeeldLosseWand) uit.push(`<g opacity="0.6" pointer-events="none">${losseWandSvg(plan, opties.voorbeeldLosseWand, muren, losse, { ...opties, afdruk: true }, k, true, false, () => undefined)}</g>`);

  // Openingen.
  for (const o of plan.openingen) uit.push(openingSvg(o, muurVanOpening(o, muren), opties, sel?.soort === 'opening' && sel.id === o.id, fouten.has(o.id)));
  if (opties.voorbeeldOpening) uit.push(`<g opacity="0.6">${openingSvg(opties.voorbeeldOpening, muurVanOpening(opties.voorbeeldOpening, muren), opties, true, false)}</g>`);

  // Daklichten (boven het snijvlak, dus gestreept): een koepel met een kruis, een lichtstraat met haar nok.
  for (const l of plan.daklichten ?? []) {
    const gekozen = sel?.soort === 'daklicht' && sel.id === l.id, fout = fouten.has(l.id);
    const kleur = fout ? '#c0392b' : gekozen ? '#2f6fd0' : '#3f6d86';
    const lijn = `stroke="${kleur}" stroke-width="${gekozen || fout ? 2.5 : 1.6}" stroke-dasharray="9 5"`;
    const binnen = opties.lichtstraten?.has(l.type)
      ? (l.b >= l.d ? `<line x1="${n(l.x)}" y1="${n(l.y + l.d / 2)}" x2="${n(l.x + l.b)}" y2="${n(l.y + l.d / 2)}" ${lijn}/>` : `<line x1="${n(l.x + l.b / 2)}" y1="${n(l.y)}" x2="${n(l.x + l.b / 2)}" y2="${n(l.y + l.d)}" ${lijn}/>`)
      : `<line x1="${n(l.x)}" y1="${n(l.y)}" x2="${n(l.x + l.b)}" y2="${n(l.y + l.d)}" ${lijn}/><line x1="${n(l.x + l.b)}" y1="${n(l.y)}" x2="${n(l.x)}" y2="${n(l.y + l.d)}" ${lijn}/>`;
    uit.push(`<g data-soort="daklicht" data-id="${esc(l.id)}" style="cursor:move"><rect x="${n(l.x)}" y="${n(l.y)}" width="${n(l.b)}" height="${n(l.d)}" fill="#bfe0ee" fill-opacity="${gekozen ? 0.5 : 0.3}" ${lijn}/>${binnen}</g>`);
  }
  // Techniek (alleen met de optie, een catalogus en iets om te tekenen): leidingen en tekens van de toestellen.
  if (opties.techniek && cat.techniek && (plan.toestellen?.length || plan.leidingen?.length)) {
    const vakken = new Set(opties.techniek === true ? ALLE_VAKKEN : opties.techniek);
    uit.push(techniekSvg(plan, cat.techniek, vakken, sel, fouten));
  }
  // Hellend dak: de dakrand met de oversteek en de nok (of de hoge kant van een lessenaar).
  if (opties.dakLijnen && !opties.afdruk) {
    const d = opties.dakLijnen, o = d.omtrek, q = d.nok;
    uit.push(`<g pointer-events="none" fill="none" stroke="#8a5a3c"><rect x="${n(o.x)}" y="${n(o.y)}" width="${n(o.b)}" height="${n(o.d)}" stroke-width="1.4" stroke-dasharray="14 8"/>`
      + `<line x1="${n(q.x1)}" y1="${n(q.y1)}" x2="${n(q.x2)}" y2="${n(q.y2)}" stroke-width="2" stroke-dasharray="22 6 4 6"/></g>`
      + `<text x="${n(q.x1 + (q.y1 === q.y2 ? 18 * k : 8 * k))}" y="${n(q.y1 + (q.y1 === q.y2 ? -8 * k : 24 * k))}" font-size="${n(15 * k)}" fill="#8a5a3c" pointer-events="none">${esc(d.tekst)}</text>`);
  }

  // Schuine muren: hun lengte (op de as) als maat langs de muur, aan de buitenkant (bij een binnenmuur aan de plus-kant).
  for (const m of muren) {
    if (m.as !== 's') continue;
    const [p, q] = m.punten!;
    // maatlijn legt de maat links van de richting, en dat is de plus-kant: aan de min-kant dus omgekeerd tekenen.
    const buitenMin = m.soort === 'buiten' && !m.min;
    // Voorbij het label van een raam of deur in die muur (dat staat op een halve muurdikte + 22).
    const afst = m.dikte / 2 + 50 * Math.max(k, 0.5);
    uit.push(buitenMin ? maatlijn(q[0], q[1], p[0], p[1], afst, `${Math.round(m.tot - m.van)}`, '#4b5753', k, raak(`muur:${m.id}`)) : maatlijn(p[0], p[1], q[0], q[1], afst, `${Math.round(m.tot - m.van)}`, '#4b5753', k, raak(`muur:${m.id}`)));
  }

  // Namen en oppervlaktes.
  for (const r of plan.ruimtes) {
    const mt = ruimteMaten(plan, r, muren);
    // Hoofddeel = grootste deel; bij een vrije vorm het zwaartepunt van haar omtrek (dat ligt altijd binnen een bolle vorm).
    const [cx, cy] = r.omtrek ? zwaartepunt(vormVanDeel(delenVan(r)[0]!)) : [r.x + r.b / 2, r.y + r.d / 2];
    const fs = Math.max(12, Math.min(22, r.b / 8, r.d / 4)) * k;
    uit.push(`<g pointer-events="none" text-anchor="middle"><text x="${n(cx)}" y="${n(cy - fs * 0.15)}" font-size="${n(fs)}" font-weight="600" fill="#2c2f2d">${esc(r.naam)}</text>`
      + `<text x="${n(cx)}" y="${n(cy + fs * 1.05)}" font-size="${n(fs * 0.8)}" fill="#5f6763">${r.bestaand === true ? 'bestaand (blijft)' : m2(mt.netto)}</text></g>`);
  }

  // Selectie en fouten.
  for (const r of plan.ruimtes) {
    const gekozen = sel?.soort === 'ruimte' && sel.id === r.id;
    if (fouten.has(r.id) || gekozen) {
      const stijl = `fill="${gekozen ? '#2f6fd0' : 'none'}" fill-opacity="0.06" stroke="${gekozen ? '#2f6fd0' : '#c0392b'}" stroke-width="3" stroke-dasharray="${gekozen ? '0' : '10 6'}" pointer-events="none"`;
      for (const p of delenVan(r)) {
        uit.push(p.omtrek ? `<polygon points="${punten(verschuifZijden(vormVanDeel(p), -4))}" ${stijl}/>` : `<rect x="${n(p.x + 4)}" y="${n(p.y + 4)}" width="${n(p.b - 8)}" height="${n(p.d - 8)}" ${stijl}/>`);
      }
    }
    // Een vrije vorm heeft (nog) geen grepen: haar muren zijn gemeten, niet getrokken (zie zetOmtrek).
    if (gekozen && !opties.afdruk && !r.delen?.length && !r.omtrek) {
      // Om de maat aan te tikken staat haar tekst naast de greep in het midden (anders neemt een vinger de greep).
      const opzij = (l: number) => Math.max(0, Math.min(l / 2 - 24 * k, Math.max(0.22 * l, 34 * (opties.schaal ?? 1))));
      const rb = raak(`ruimte:${r.id}:b`), rd = raak(`ruimte:${r.id}:d`);
      uit.push(maatlijn(r.x, r.y, r.x + r.b, r.y, -28 * k, `${Math.round(r.b)}`, '#2f6fd0', k, rb && { ...rb, schuif: opzij(r.b) }));
      uit.push(maatlijn(r.x, r.y + r.d, r.x, r.y, -28 * k, `${Math.round(r.d)}`, '#2f6fd0', k, rd && { ...rd, schuif: opzij(r.d) }));
      for (const [greep, gx, gy] of [['n', r.x + r.b / 2, r.y], ['s', r.x + r.b / 2, r.y + r.d], ['w', r.x, r.y + r.d / 2], ['o', r.x + r.b, r.y + r.d / 2]] as const) {
        uit.push(`<circle data-greep="${greep}" cx="${n(gx)}" cy="${n(gy)}" r="${n(11 * Math.max(k, 0.35))}" fill="#fff" stroke="#2f6fd0" stroke-width="${n(3 * Math.max(k, 0.35))}" style="cursor:${greep === 'n' || greep === 's' ? 'ns' : 'ew'}-resize"/>`);
      }
    } else if (gekozen && !opties.afdruk && !r.delen?.length && r.omtrek && opties.maatDoelen) {
      // Een gekozen vrije vorm: de maat van elke zijde (op de as, binnen de vorm) en een greep op elk hoekpunt.
      const v = vormVanDeel(delenVan(r)[0]!);
      v.forEach((p, i) => {
        const q = v[(i + 1) % v.length]!;
        uit.push(maatlijn(p[0], p[1], q[0], q[1], -28 * k, `${Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]))}`, '#2f6fd0', k, raak(`zijde:${r.id}:${i}`)));
      });
      const straal = 11 * Math.max(k, 0.35);
      v.forEach(([x, y], i) => uit.push(`<circle data-hoekgreep="${i}" cx="${n(x)}" cy="${n(y)}" r="${n(straal)}" fill="#fff" stroke="#2f6fd0" stroke-width="${n(3 * Math.max(k, 0.35))}" style="cursor:move"/>`
        + `<circle data-hoekgreep="${i}" cx="${n(x)}" cy="${n(y)}" r="${n(22 * (opties.schaal ?? 1))}" fill="#2f6fd0" fill-opacity="0" style="cursor:move"/>`));
    }
  }

  // Totale maten.
  if (plan.ruimtes.length) {
    const delen = plan.ruimtes.flatMap(delenVan);
    const x0 = Math.min(...delen.map((r) => r.x)), y0 = Math.min(...delen.map((r) => r.y));
    const x1 = Math.max(...delen.map((r) => r.x + r.b)), y1 = Math.max(...delen.map((r) => r.y + r.d));
    const t = plan.buitenmuur / 2;
    uit.push(maatlijn(x1 + t, y1 + t, x0 - t, y1 + t, 70 * Math.max(k, 0.5), `${Math.round(x1 - x0 + 2 * t)}`, '#4b5753', k, raak('totaal:b')));
    uit.push(maatlijn(x1 + t, y0 - t, x1 + t, y1 + t, 70 * Math.max(k, 0.5), `${Math.round(y1 - y0 + 2 * t)}`, '#4b5753', k, raak('totaal:d')));
  }

  // Maatvoering: kettingmaat langs de muur voor de gekozen (of te plaatsen) opening, afstanden tot de muren voor een meubel.
  const maatKleur = '#1f6fd0';
  const maatOpening = opties.voorbeeldOpening ?? (sel?.soort === 'opening' ? plan.openingen.find((o) => o.id === sel.id) : undefined);
  if (maatOpening && !opties.afdruk) {
    const lijst = opties.voorbeeldOpening ? { ...plan, openingen: [...plan.openingen, opties.voorbeeldOpening] } : plan;
    const af = openingAfstanden(lijst, maatOpening, muren);
    if (af) {
      const m = af.muur, half = m.dikte / 2;
      const afst = (af.binnenPlus ? -1 : 1) * (half + 34 * k);
      for (let i = 0; i + 1 < af.ketting.length; i++) {
        const a = af.ketting[i]!, b = af.ketting[i + 1]!;
        if (b - a < 0.5) continue;
        const tekst = `${Math.round(b - a)}`;
        if (m.as === 's') {
          const [p, q] = [langsAs(m, a, m.lijn), langsAs(m, b, m.lijn)];
          uit.push(maatlijn(p[0], p[1], q[0], q[1], -afst, tekst, maatKleur, k, opties.voorbeeldOpening ? undefined : raak(`ketting:${maatOpening.id}:${i}`)));
          continue;
        }
        const doel = opties.voorbeeldOpening ? undefined : raak(`ketting:${maatOpening.id}:${i}`);
        uit.push(m.as === 'h' ? maatlijn(a, m.lijn, b, m.lijn, afst, tekst, maatKleur, k, doel) : maatlijn(m.lijn, a, m.lijn, b, -afst, tekst, maatKleur, k, doel));
      }
    }
  }
  if (sel?.soort === 'meubel' && !opties.afdruk) {
    const mb = plan.meubels.find((x) => x.id === sel.id);
    const af = mb && meubelAfstanden(plan, mb, muren);
    if (mb && af) {
      const v = meubelVoetafdruk(mb), cx = v.x + v.b / 2, cy = v.y + v.d / 2;
      const lijn = (x1: number, y1: number, x2: number, y2: number, w: number) => {
        if (w < 0.5) return;
        uit.push(`<g pointer-events="none" stroke="${maatKleur}" stroke-width="1.5"><line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke-dasharray="5 4"/></g>`
          + `<text x="${n((x1 + x2) / 2 + (y1 === y2 ? 0 : 6 * k))}" y="${n((y1 + y2) / 2 - (y1 === y2 ? 6 * k : 0))}" font-size="${n(15 * k)}" fill="${maatKleur}" text-anchor="${y1 === y2 ? 'middle' : 'start'}" pointer-events="none" font-weight="600">${Math.round(w)}</text>`);
      };
      lijn(af.x0, cy, v.x, cy, af.links);
      lijn(v.x + v.b, cy, af.x1, cy, af.rechts);
      lijn(cx, af.y0, cx, v.y, af.boven);
      lijn(cx, v.y + v.d, cx, af.y1, af.onder);
    }
  }

  // Noordpijl linksboven naast het plan (rechts en onder staan de totale maten).
  if ((opties.noordpijl || plan.noord !== undefined) && plan.ruimtes.length) {
    const delen = plan.ruimtes.flatMap(delenVan);
    const cx = Math.min(...delen.map((r) => r.x)) - 78, cy = Math.min(...delen.map((r) => r.y)) - 78, hoek = plan.noord ?? 0;
    uit.push(`<g data-soort="noordpijl" pointer-events="none" transform="translate(${n(cx)} ${n(cy)}) rotate(${n(hoek)})">`
      + '<circle r="30" fill="#fbfbf9" stroke="#4b5753" stroke-width="1.5"/><path d="M 0 -26 L 11 12 L 0 5 Z" fill="#2c2f2d"/><path d="M 0 -26 L -11 12 L 0 5 Z" fill="#fbfbf9" stroke="#2c2f2d" stroke-width="1.2" stroke-linejoin="round"/>'
      + `<text transform="translate(0 -40) rotate(${n(-hoek)})" font-size="17" font-weight="700" fill="#2c2f2d" text-anchor="middle" dominant-baseline="central">N</text></g>`);
  }

  if (opties.voorbeeldWand) {
    const w = opties.voorbeeldWand;
    uit.push(`<line x1="${n(w.x1)}" y1="${n(w.y1)}" x2="${n(w.x2)}" y2="${n(w.y2)}" stroke="#2f6fd0" stroke-width="10" stroke-opacity="0.45" stroke-linecap="round" pointer-events="none"/>`);
    uit.push(`<text x="${n((w.x1 + w.x2) / 2 + 14 * k)}" y="${n((w.y1 + w.y2) / 2 - 14 * k)}" font-size="${n(18 * k)}" fill="#2f6fd0" pointer-events="none">${Math.round(Math.hypot(w.x2 - w.x1, w.y2 - w.y1))}</text>`);
  }
  if (opties.voorbeeld) {
    const p = opties.voorbeeld;
    uit.push(`<rect x="${n(p.x)}" y="${n(p.y)}" width="${n(p.b)}" height="${n(p.d)}" fill="#2f6fd0" fill-opacity="0.12" stroke="#2f6fd0" stroke-width="3" stroke-dasharray="12 8" pointer-events="none"/>`);
    uit.push(`<text x="${n(p.x + p.b / 2)}" y="${n(p.y + p.d / 2)}" font-size="${n(20 * k)}" text-anchor="middle" fill="#2f6fd0" pointer-events="none">${Math.round(p.b)} × ${Math.round(p.d)}</text>`);
  }
  if (opties.voorbeeldVorm?.gemeten.length) {
    const v = opties.voorbeeldVorm, kleur = v.fout ? '#c0392b' : '#2f6fd0';
    uit.push(`<g pointer-events="none"><polygon points="${punten(v.gemeten)}" fill="${kleur}" fill-opacity="0.12" stroke="${kleur}" stroke-width="3" stroke-dasharray="12 8"/>`
      + (v.punten.length ? `<polygon points="${punten(v.punten)}" fill="none" stroke="${kleur}" stroke-width="1.2" stroke-opacity="0.6"/>` : '') + '</g>');
    for (const m of v.maten) uit.push(maatlijn(m.van[0], m.van[1], m.tot[0], m.tot[1], -26 * Math.max(k, 0.5), m.tekst, kleur, k));
  }
  uit.push('</svg>');
  return uit.join('');
}

/** Punten als SVG-lijst. */
const punten = (v: Punt[]) => v.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');

/**
 * Een losse wand in de tekening: haar grondvlak (volle hoogte zoals een muur, lager licht met een rand en de hoogte erbij),
 * haar gebouwde lengte als maat (aan de kant weg van de dichtste evenwijdige muur), en in de editor een onzichtbare strook
 * van minstens 44 beeldpunten om ze aan te tikken. Gekozen: blauw, een greep op elk eindpunt (`data-wandgreep`) en de
 * vrije maat tot de evenwijdige muren (`data-maat="wandafstand:<id>:<kant>"`).
 */
function losseWandSvg(plan: Plattegrond, w: LosseWand, muren: Muur[], losse: LosseWand[], opties: PlanSvgOpties, k: number, gekozen: boolean, fout: boolean,
  raak: (doel: string) => { doel: string; schaal: number } | undefined): string {
  const v = losseWandVlak(w, muren, losse);
  if (v.punten.length < 3) return '';
  const binnen = !!losseWandRuimte(plan, w);
  const h = w.hoogte ?? plan.muurhoogte, vol = h >= plan.muurhoogte - 0.5;
  const kleur = binnen ? '#86857f' : '#5d5a54';
  const lijn = fout ? '#c0392b' : gekozen ? '#2f6fd0' : kleur;
  const vulling = vol ? kleur : binnen ? '#d6d3cb' : '#bdb8ad';
  const a = opLosseWand(w, v.begin), b = opLosseWand(w, v.einde);
  const schaal = opties.schaal ?? 1;
  const uit: string[] = [`<g data-soort="wand" data-id="${esc(w.id)}" style="cursor:pointer">`];
  uit.push(`<polygon points="${punten(v.punten)}" fill="${vulling}" stroke="${lijn}" stroke-width="${gekozen || fout ? 3 : vol ? 0.6 : 1.6}" stroke-linejoin="round"/>`);
  if (!vol) {
    // Een lage wand: arcering, zoals een borstwering op een plan.
    const stap = Math.max(12, w.dikte * 1.2), half = w.dikte / 2;
    const arcering: string[] = [];
    for (let s = v.begin + stap / 2; s < v.einde - 2; s += stap) {
      const p = opLosseWand(w, s - half * 0.8, -half), q = opLosseWand(w, s + half * 0.8, half);
      arcering.push(`M ${n(p[0])} ${n(p[1])} L ${n(q[0])} ${n(q[1])}`);
    }
    if (arcering.length) uit.push(`<path d="${arcering.join(' ')}" stroke="${kleur}" stroke-width="1" fill="none" pointer-events="none"/>`);
  }
  if (!opties.afdruk) uit.push(`<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="#2f6fd0" stroke-opacity="0" stroke-width="${n(Math.max(w.dikte, 44 * schaal))}" stroke-linecap="butt"/>`);
  uit.push('</g>');
  // De lengte als maat, aan de kant weg van de dichtste evenwijdige muur (bij een tuinmuur: weg van de gevel).
  const af = losseWandAfstanden(w, muren);
  const naarMin = !!af.plus && (!af.min || af.plus.vrij <= af.min.vrij);
  // Gekozen (met grepen van 44 beeldpunten op de eindpunten): de maat zo ver dat haar tikvlak naast de grepen ligt, ook
  // bij een korte wand op een tablet.
  const afst = Math.max(w.dikte / 2 + 30 * Math.max(k, 0.5), gekozen && opties.maatDoelen && !opties.afdruk ? w.dikte / 2 + 46 * schaal : 0);
  const tekst = `${Math.round(losseWandLengte(v))}`, maatKleur = gekozen ? '#2f6fd0' : '#4b5753';
  // maatlijn legt de maat links van de richting (langs n van de wand): voor de min-kant de richting omdraaien.
  uit.push(naarMin ? maatlijn(b[0], b[1], a[0], a[1], afst, tekst, maatKleur, k, raak(`wand:${w.id}`)) : maatlijn(a[0], a[1], b[0], b[1], afst, tekst, maatKleur, k, raak(`wand:${w.id}`)));
  // De hoogte bij een lage wand (en de dikte als ze gekozen is), aan de andere kant.
  if (!vol || gekozen) {
    const m = opLosseWand(w, (v.begin + v.einde) / 2, (naarMin ? 1 : -1) * (w.dikte / 2 + 14 * Math.max(k, 0.5)));
    const label = `${gekozen ? `${n(w.dikte)} cm dik · ` : ''}${vol ? 'tot het plafond' : `h ${Math.round(h)}`}`;
    let hoek = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    if (hoek > 90 || hoek <= -90) hoek += 180;
    uit.push(`<text x="${n(m[0])}" y="${n(m[1])}" font-size="${n(14 * k)}" fill="${gekozen ? '#2f6fd0' : '#4b5753'}" text-anchor="middle" dominant-baseline="central" transform="rotate(${n(hoek)} ${n(m[0])} ${n(m[1])})" pointer-events="none">${esc(label)}</text>`);
  }
  if (gekozen && !opties.afdruk) {
    // De vrije maat tot de evenwijdige muren. Aan te tikken aan de kant zonder de lengtemaat (anders liggen hun tikvlakken
    // op elkaar); de maatvraag van de lengte kent ook de afstand aan de andere kant.
    for (const x of [af.min, af.plus]) {
      if (!x || x.vrij < 0.5) continue;
      const z = x.kant === 'plus' ? 1 : -1, s = (v.begin + v.einde) / 2;
      const p = opLosseWand(w, s, z * (w.dikte / 2)), q = opLosseWand(w, s, z * (w.dikte / 2 + x.vrij));
      uit.push(`<g pointer-events="none" stroke="#2f6fd0" stroke-width="1.5"><line x1="${n(p[0])}" y1="${n(p[1])}" x2="${n(q[0])}" y2="${n(q[1])}" stroke-dasharray="6 4"/></g>`);
      const tikbaar = x.kant !== (naarMin ? 'min' : 'plus');
      uit.push(maatlijn(p[0], p[1], q[0], q[1], 0, `${Math.round(x.vrij * 10) / 10}`.replace('.', ','), '#2f6fd0', k, tikbaar ? raak(`wandafstand:${w.id}:${x.kant}`) : undefined));
    }
    // Een greep op elk eindpunt van de as (een eindpunt tegen een muur ligt op haar as). Het tikvlak van 44 beeldpunten ligt
    // grotendeels voorbij het eindpunt: zo blijft het midden van een korte wand vrij om de hele wand te verslepen.
    const straal = 11 * Math.max(k, 0.35), R = 22 * schaal, { d } = losseWandAs(w);
    for (const [code, [x, y], z] of [['van', w.van, -1], ['tot', w.tot, 1]] as const) {
      const cx = x + z * d[0] * R * 0.8, cy = y + z * d[1] * R * 0.8;
      uit.push(`<circle data-wandgreep="${code}" cx="${n(x)}" cy="${n(y)}" r="${n(straal)}" fill="#fff" stroke="#2f6fd0" stroke-width="${n(3 * Math.max(k, 0.35))}" style="cursor:move"/>`
        + `<circle data-wandgreep="${code}" cx="${n(cx)}" cy="${n(cy)}" r="${n(R)}" fill="#2f6fd0" fill-opacity="0" style="cursor:move"/>`);
    }
  }
  return uit.join('');
}

/** Zwaartepunt van een veelhoek. */
function zwaartepunt(v: Punt[]): Punt {
  let a = 0, cx = 0, cy = 0;
  v.forEach((p, i) => {
    const q = v[(i + 1) % v.length]!, f = p[0] * q[1] - q[0] * p[1];
    a += f; cx += (p[0] + q[0]) * f; cy += (p[1] + q[1]) * f;
  });
  return Math.abs(a) < 1e-9 ? v[0]! : [cx / (3 * a), cy / (3 * a)];
}

/** Maatlijn van punt 1 naar 2, verschoven over afstand (links van de richting); met `raak` een vlak om de maat aan te tikken. */
function maatlijn(x1: number, y1: number, x2: number, y2: number, afstand: number, tekst: string, kleur: string, k = 1, raak?: { doel: string; schaal: number; schuif?: number }): string {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
  const nx = dy / l, ny = -dx / l;
  const a = [x1 + nx * afstand, y1 + ny * afstand], b = [x2 + nx * afstand, y2 + ny * afstand];
  // De tekst in het midden, of (`schuif`) een eind verder langs de lijn: weg van een greep in het midden.
  const s = raak?.schuif ?? 0;
  const mx = (a[0]! + b[0]!) / 2 + nx * 12 * k + (dx / l) * s, my = (a[1]! + b[1]!) / 2 + ny * 12 * k + (dy / l) * s;
  let hoek = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (hoek > 90 || hoek <= -90) hoek += 180;
  return `<g pointer-events="none" stroke="${kleur}" stroke-width="1.5"><line x1="${n(a[0]!)}" y1="${n(a[1]!)}" x2="${n(b[0]!)}" y2="${n(b[1]!)}"/>`
    + `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(a[0]! + nx * 6)}" y2="${n(a[1]! + ny * 6)}" stroke-dasharray="4 4"/><line x1="${n(x2)}" y1="${n(y2)}" x2="${n(b[0]! + nx * 6)}" y2="${n(b[1]! + ny * 6)}" stroke-dasharray="4 4"/></g>`
    + `<text x="${n(mx)}" y="${n(my)}" font-size="${n(17 * k)}" fill="${kleur}" text-anchor="middle" dominant-baseline="central" transform="rotate(${n(hoek)} ${n(mx)} ${n(my)})" pointer-events="none">${esc(tekst)}</text>`
    + (raak ? raakVlak(mx, my, hoek, Math.max(tekst.length * 17 * k * 0.62 + 16 * k, 56 * raak.schaal), 44 * raak.schaal, raak.doel) : '');
}

/** Een onzichtbaar vlak om een maat aan te tikken (minstens 44 beeldpunten hoog), gedraaid zoals de tekst. */
function raakVlak(mx: number, my: number, hoek: number, b: number, h: number, doel: string): string {
  return `<rect data-maat="${esc(doel)}" x="${n(mx - b / 2)}" y="${n(my - h / 2)}" width="${n(b)}" height="${n(h)}" rx="${n(h / 4)}" fill="#2f6fd0" fill-opacity="0" transform="rotate(${n(hoek)} ${n(mx)} ${n(my)})" style="cursor:pointer"><title>Tik om de maat te wijzigen</title></rect>`;
}

/** Deurboog: blad open (loodrecht op de muur) en de draaicirkel. */
function boog(as: Opening['as'], L: number, a: number, b: number, scharnierBegin: boolean, s: number, stijl: string): string {
  const w = b - a, p = scharnierBegin ? a : b, q = scharnierBegin ? b : a;
  const sweepH = scharnierBegin === s > 0 ? 0 : 1;
  const sweep = as === 'h' ? sweepH : 1 - sweepH;
  const [hx, hy, ox, oy, ex, ey] = as === 'h' ? [p, L, p, L + s * w, q, L] : [L, p, L + s * w, p, L, q];
  return `<line x1="${n(hx)}" y1="${n(hy)}" x2="${n(ox)}" y2="${n(oy)}" ${stijl} stroke-width="3"/><path d="M ${n(ox)} ${n(oy)} A ${n(w)} ${n(w)} 0 0 ${sweep} ${n(ex)} ${n(ey)}" fill="none" ${stijl} stroke-width="1.4"/>`;
}

function openingSvg(o: Opening, m: Muur | undefined, opties: PlanSvgOpties, gekozen: boolean, fout: boolean): string {
  if (o.as === 's') {
    // Schuine muur: getekend zoals in een staande muur (die is een schuine muur met d = (0, 1) en n = (1, 0)), en dan
    // gedraaid tot n en d van de schuine muur.
    const { d, n: nn } = asVan(o.richting ? o : m ?? o);
    const f = (x: number) => String(Math.round(x * 1e6) / 1e6);
    return `<g transform="matrix(${f(nn[0])} ${f(nn[1])} ${f(d[0])} ${f(d[1])} 0 0)">${openingSvg({ ...o, as: 'v' }, m && { ...m, as: 'v' }, opties, gekozen, fout)}</g>`;
  }
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
  // Loopt lokaal x (links → rechts gezien van binnen) tegen de planrichting in?
  const lokaalNaarPlan = o.as === 'h' ? !binnenPlus : binnenPlus;
  /** Van–tot langs de muur per vak (in de volgorde van de vakken), met de breedtes van de positie of gelijk verdeeld. */
  const stukken = (vakken: string[]): [number, number][] => {
    const breedtes = info?.breedtes?.length === vakken.length ? info.breedtes : vakken.map(() => 1);
    const som = breedtes.reduce((t, x) => t + x, 0) || 1;
    let c = a;
    const plan = (lokaalNaarPlan ? [...breedtes].reverse() : breedtes).map((x): [number, number] => { const van = c; c += (o.breedte * x) / som; return [van, c]; });
    return lokaalNaarPlan ? plan.reverse() : plan;
  };
  if (o.soort === 'raam' || o.soort === 'schuifraam') {
    delen.push(rect(a, b, -half, half, `fill="#fbfbf9" ${stijl} stroke-width="1.6"`));
    delen.push(lijn(a, b, -2.5, `${stijl} stroke-width="1.4"`), lijn(a, b, 2.5, `${stijl} stroke-width="1.4"`));
    const vakken = info?.vakken ?? [];
    if (o.soort === 'schuifraam' && vakken.length >= 3 && vakken.every((v) => v.startsWith('draai'))) {
      // Vouwwand: de delen half opengevouwen, als een zigzag naar binnen.
      const grenzen = [a, ...stukken(vakken).map(([, tot]) => tot).sort((p, q) => p - q)];
      const uit = Math.min(45, (o.breedte / vakken.length) * 0.45);
      const punten = grenzen.map((c, i) => { const d = s * (half + (i % 2 ? uit : 0)); return o.as === 'h' ? `${n(c)},${n(L + d)}` : `${n(L + d)},${n(c)}`; });
      delen.push(`<polyline data-symbool="vouw" points="${punten.join(' ')}" fill="none" ${stijl} stroke-width="2.4" stroke-linejoin="round"/>`);
    } else if (o.soort === 'schuifraam' || vakken.some((v) => v.startsWith('schuif'))) {
      const d = s * (half + 18), pijl = Math.min(30, o.breedte / 6);
      delen.push(lijn(o.midden - o.breedte / 4, o.midden + o.breedte / 4, d, `${stijl} stroke-width="2"`));
      const [px, py] = o.as === 'h' ? [o.midden + o.breedte / 4, L + d] : [L + d, o.midden + o.breedte / 4];
      delen.push(o.as === 'h'
        ? `<path d="M ${n(px - pijl / 2)} ${n(py - pijl / 3)} L ${n(px)} ${n(py)} L ${n(px - pijl / 2)} ${n(py + pijl / 3)}" fill="none" ${stijl} stroke-width="2"/>`
        : `<path d="M ${n(px - pijl / 3)} ${n(py - pijl / 2)} L ${n(px)} ${n(py)} L ${n(px + pijl / 3)} ${n(py - pijl / 2)}" fill="none" ${stijl} stroke-width="2"/>`);
    } else if (vakken.length) {
      // Draaiende vakken: boog naar binnen. "Links gezien van binnen" hangt af van de kant van de muur.
      const stuk = stukken(vakken);
      vakken.forEach((op, i) => {
        if (!op.startsWith('draai')) return;
        const [va, vb] = stuk[i]!;
        const linksLokaal = op.endsWith('_l');
        const scharnierBegin = lokaalNaarPlan ? !linksLokaal : linksLokaal;
        delen.push(boog(o.as, L + s * half, va, vb, scharnierBegin, s, `stroke="${kleur}" stroke-dasharray="6 5" stroke-opacity="0.75"`));
      });
    }
  } else if (o.soort === 'doorgang') {
    delen.push(lijn(a, a, 0, ''), rect(a - 1, a + 1, -half, half, `fill="${kleur}"`), rect(b - 1, b + 1, -half, half, `fill="${kleur}"`));
    delen.push(lijn(a, b, -half, `${stijl} stroke-dasharray="6 6" stroke-width="1.2"`), lijn(a, b, half, `${stijl} stroke-dasharray="6 6" stroke-width="1.2"`));
  } else if (o.soort === 'garagepoort') {
    // Sectionale poort: het blad in de opening (buitenkant) en, gestippeld, waar het geopend onder het plafond hangt.
    delen.push(rect(a, a + 4, -half, half, `fill="${kleur}"`), rect(b - 4, b, -half, half, `fill="${kleur}"`));
    delen.push(lijn(a + 4, b - 4, -s * Math.max(0, half - 12), `${stijl} stroke-width="4"`));
    const diep = Math.min(o.hoogte, 240);
    delen.push(rect(a + 6, b - 6, s > 0 ? half : -half - diep, s > 0 ? half + diep : -half, `fill="none" ${stijl} stroke-dasharray="8 6" stroke-opacity="0.7" stroke-width="1.4"`));
  } else {
    // Deur: kader in de muur, blad en draaicirkel naar de draaikant.
    const vakken = o.soort === 'buitendeur' ? info?.vakken ?? [] : [];
    delen.push(rect(a, a + 4, -half, half, `fill="${kleur}"`), rect(b - 4, b, -half, half, `fill="${kleur}"`));
    const ds = o.naarPlus ? 1 : -1;
    if (vakken.length >= 2) {
      // Buitendeur met meer vakken (dubbele deur, deur met zijlicht): per vak een deurblad met draaicirkel of vast glas.
      for (const [i, [va, vb]] of stukken(vakken).entries()) {
        const op = vakken[i]!;
        if (va > a + 0.5) delen.push(rect(va - 2, va + 2, -half, half, `fill="${kleur}"`));
        if (op.startsWith('draai')) {
          const linksLokaal = op.endsWith('_l');
          delen.push(boog(o.as, L + ds * half, va + 2, vb - 2, lokaalNaarPlan ? !linksLokaal : linksLokaal, ds, stijl));
        } else {
          delen.push(lijn(va, vb, -half, `${stijl} stroke-width="1.6"`), lijn(va, vb, half, `${stijl} stroke-width="1.6"`));
          delen.push(lijn(va, vb, -2.5, `${stijl} stroke-width="1.4"`), lijn(va, vb, 2.5, `${stijl} stroke-width="1.4"`));
        }
      }
    } else {
      delen.push(boog(o.as, L + ds * half, a + 4, b - 4, o.scharnier === 'begin', ds, stijl));
    }
  }
  if (info?.label) {
    const k = opties.schaal ? Math.min(1, Math.max(0.06, opties.schaal / 1.6)) : 1;
    const d = -s * (half + 22 * k);
    const [tx, ty] = o.as === 'h' ? [o.midden, L + d] : [L + d, o.midden];
    delen.push(`<g pointer-events="none"><rect x="${n(tx - 20 * k)}" y="${n(ty - 12 * k)}" width="${n(40 * k)}" height="${n(24 * k)}" rx="${n(12 * k)}" fill="${fout ? '#c0392b' : '#34505f'}"/><text x="${n(tx)}" y="${n(ty)}" font-size="${n(15 * k)}" font-weight="600" fill="#fff" text-anchor="middle" dominant-baseline="central">${esc(info.label)}</text></g>`);
  }
  if (gekozen) delen.push(rect(a - 4, b + 4, -half - 6, half + 6, 'fill="none" stroke="#2f6fd0" stroke-width="3"'));
  delen.push('</g>');
  return delen.join('');
}

// ---------- techniek ----------

/**
 * De techniek van één verdieping: eerst de leidingen (een lijn in de vaste kleur van de soort, zo dik als de leiding
 * maar minstens 2,5 cm, gestreept in de vloer en streep-punt tegen het plafond; een rondje waar ze naar een andere
 * verdieping gaat), dan per toestel zijn teken in de kleur van zijn vak (zie `ToestelTeken` in techniek.ts).
 */
function techniekSvg(plan: Plattegrond, tc: TechniekCatalogus, vakken: Set<TechniekVak>, sel: PlanSvgOpties['selectie'], fouten: Set<string>): string {
  const uit: string[] = ['<g data-soort="techniek">'];
  const vh = (niveau: number) => vloerHoogte(plan, niveau);
  for (const l of plan.leidingen ?? []) {
    const soort = tc.leidingen[l.soort];
    if (!soort || !vakken.has(soort.vak) || l.punten.length < 2) continue;
    const maat = maatVan(l, soort);
    const mm = Array.isArray(maat) ? (soort.vorm === 'plat' ? maat[0] : maat[0] + maat[1]) : maat;
    const w = Math.min(14, Math.max(2.5, mm / 10));
    const streep = l.hoogte === 'vloer' ? ' stroke-dasharray="10 6"' : l.hoogte === 'plafond' ? ' stroke-dasharray="18 6 4 6"' : '';
    const pts = punten(l.punten);
    const gekozen = sel?.soort === 'leiding' && sel.id === l.id, fout = fouten.has(l.id);
    const rand = gekozen || fout ? `<polyline points="${pts}" fill="none" stroke="${fout ? '#c0392b' : '#2f6fd0'}" stroke-width="${n(w + 8)}" stroke-opacity="0.35" stroke-linejoin="round" stroke-linecap="round"/>` : '';
    // Naar een andere verdieping (een stuk op of neer van meer dan een halve verdieping): een rondje met een punt.
    const v = leidingVerloop(l, plan, tc, { vloerHoogte: vh }).punten, stijg: string[] = [];
    for (let i = 1; i < v.length; i++) {
      const p = v[i - 1]!, q = v[i]!;
      if (Math.hypot(q[0] - p[0], q[2] - p[2]) < 0.5 && Math.abs(q[1] - p[1]) > plan.muurhoogte / 2) {
        stijg.push(`<circle cx="${n(p[0])}" cy="${n(p[2])}" r="${n(w / 2 + 6)}" fill="#fff" stroke="${soort.kleur}" stroke-width="2"/><circle cx="${n(p[0])}" cy="${n(p[2])}" r="2.5" fill="${soort.kleur}"/>`);
      }
    }
    // Wat in de vloer zit, ligt onder het snijvlak van de tekening: lichter, zoals een verborgen lijn.
    const licht = l.hoogte === 'vloer' ? ' stroke-opacity="0.6"' : '';
    uit.push(`<g data-soort="leiding" data-id="${esc(l.id)}">${rand}<polyline points="${pts}" fill="none" stroke="${soort.kleur}" stroke-width="${n(w)}" stroke-linejoin="round" stroke-linecap="round"${streep}${licht}/>${stijg.join('')}</g>`);
  }
  for (const t of plan.toestellen ?? []) {
    const type = tc.toestellen[t.type];
    if (!type || !vakken.has(type.vak)) continue;
    const gekozen = sel?.soort === 'toestel' && sel.id === t.id, fout = fouten.has(t.id);
    uit.push(`<g data-soort="toestel" data-id="${esc(t.id)}" style="cursor:move" transform="translate(${n(t.x)} ${n(t.y)}) rotate(${n(t.draai)})">${toestelTeken(t, type, gekozen, fout)}</g>`);
  }
  uit.push('</g>');
  return uit.join('');
}

/**
 * Het teken van een toestel in zijn eigen assen: het midden op 0, de voorkant naar +y (onder), de wand op y = −d/2.
 * Kleine toestellen (elektriciteit, monden) hebben een vaste tekenmaat in cm; grote (kasten, units, boiler, radiator)
 * staan op ware grootte met hun afkorting.
 */
function toestelTeken(t: Toestel, type: ToestelType, gekozen: boolean, fout: boolean): string {
  const m = toestelMaten(type, t.aan);
  const kleur = fout ? '#c0392b' : TECHNIEK_VAKKEN[type.vak].kleur;
  const lijn = `stroke="${kleur}" stroke-width="1.8"`;
  const w = -m.d / 2;
  const tekst = (x: number, y: number, s: string, grootte: number) =>
    `<text x="${n(x)}" y="${n(y)}" font-size="${n(grootte)}" font-weight="600" fill="${kleur}" text-anchor="middle" dominant-baseline="central" transform="rotate(${n(-t.draai)} ${n(x)} ${n(y)})">${esc(s)}</text>`;
  const kruis = (cx: number, cy: number, r: number) => `<path d="M ${n(cx - r)} ${n(cy - r)} L ${n(cx + r)} ${n(cy + r)} M ${n(cx + r)} ${n(cy - r)} L ${n(cx - r)} ${n(cy + r)}" ${lijn} fill="none"/>`;
  const d: string[] = [];
  let omtrek = 14;
  switch (type.teken) {
    case 'lichtpunt':
      d.push(`<circle r="12" fill="#fff" fill-opacity="0.6"/>`, kruis(0, 0, 10));
      break;
    case 'armatuur':
      d.push(`<circle r="11" fill="#fff" ${lijn}/>`, kruis(0, 0, 7.5));
      break;
    case 'spot':
      d.push(`<circle r="7" fill="#fff" ${lijn}/>`, kruis(0, 0, 4.8));
      omtrek = 9;
      break;
    case 'wandlamp':
      d.push(`<line x1="0" y1="${n(w)}" x2="0" y2="${n(w + 4)}" ${lijn}/><circle cy="${n(w + 13)}" r="9" fill="#fff" ${lijn}/>`, kruis(0, w + 13, 6));
      break;
    case 'stopcontact': {
      // Halve cirkel met de bolle kant naar de muur, een streepje naar de muur en een dwarsstreep (aarding).
      const cy = w + 14;
      d.push(`<path d="M -9 ${n(cy)} A 9 9 0 0 1 9 ${n(cy)} Z" fill="#fff" ${lijn}/><line x1="0" y1="${n(cy - 9)}" x2="0" y2="${n(w)}" ${lijn}/><line x1="-5" y1="${n(w + 2.5)}" x2="5" y2="${n(w + 2.5)}" ${lijn}/>`);
      if ((type.stuks ?? 1) > 1) d.push(tekst(14, cy - 2, String(type.stuks), 10));
      break;
    }
    case 'schakelaar':
      // Rondje met een schuin streepje en een haakje (enkelpolig).
      d.push(`<circle cy="${n(w + 6)}" r="3.5" fill="#fff" ${lijn}/><path d="M 2.5 ${n(w + 8.5)} L 12 ${n(w + 18)} L 16 ${n(w + 14)}" fill="none" ${lijn}/>`);
      break;
    case 'datapunt':
      d.push(`<path d="M -7 ${n(w + 1)} L 7 ${n(w + 1)} L 0 ${n(w + 13)} Z" fill="#fff" ${lijn}/>`);
      break;
    case 'thermostaat':
      d.push(`<circle cy="${n(w + 9)}" r="7" fill="#fff" ${lijn}/>`, tekst(0, w + 9, 'T', 9));
      break;
    case 'verdeelbord': {
      const h = Math.max(m.d, 12);
      d.push(`<rect x="${n(-m.b / 2)}" y="${n(w)}" width="${n(m.b)}" height="${n(h)}" fill="#fff" ${lijn}/><path d="M ${n(-m.b / 2)} ${n(w)} L ${n(m.b / 2)} ${n(w + h)} L ${n(-m.b / 2)} ${n(w + h)} Z" fill="${kleur}"/>`);
      omtrek = Math.max(m.b, h) / 2 + 4;
      break;
    }
    case 'rond': {
      const r = Math.min(m.b, m.d) / 2;
      d.push(`<circle r="${n(r)}" fill="#fff" ${lijn}/>`);
      if (type.afkorting) d.push(tekst(0, 0, type.afkorting, Math.max(8, Math.min(22, r * 0.9))));
      omtrek = r + 4;
      break;
    }
    case 'radiator': {
      const h = Math.max(m.d, 8);
      d.push(`<rect x="${n(-m.b / 2)}" y="${n(w)}" width="${n(m.b)}" height="${n(h)}" fill="#fff" ${lijn}/>`);
      for (let x = -m.b / 2 + 6; x < m.b / 2 - 2; x += 6) d.push(`<line x1="${n(x)}" y1="${n(w)}" x2="${n(x)}" y2="${n(w + h)}" stroke="${kleur}" stroke-width="1"/>`);
      omtrek = m.b / 2 + 4;
      break;
    }
    case 'toevoermond':
    case 'afvoermond': {
      // Rond ventiel met een pijl: naar binnen (toevoer) of naar buiten (afvoer).
      const r = Math.max(9, m.b / 2);
      const pijl = type.teken === 'toevoermond' ? `M -5 -6 L 5 -6 L 0 3 Z` : `M -5 3 L 5 3 L 0 -6 Z`;
      d.push(`<circle r="${n(r)}" fill="#fff" ${lijn}/><path d="${pijl}" fill="${kleur}"/>`);
      omtrek = r + 4;
      break;
    }
    case 'rooster': {
      const h = Math.max(m.d, 7);
      d.push(`<rect x="${n(-m.b / 2)}" y="${n(w)}" width="${n(m.b)}" height="${n(h)}" fill="#fff" ${lijn}/>`);
      for (const f of [0.3, 0.5, 0.7]) d.push(`<line x1="${n(-m.b / 2 + 2)}" y1="${n(w + h * f)}" x2="${n(m.b / 2 - 2)}" y2="${n(w + h * f)}" stroke="${kleur}" stroke-width="1"/>`);
      omtrek = m.b / 2 + 4;
      break;
    }
    case 'doorvoer': {
      const r = Math.max(9, m.b / 2);
      d.push(`<circle r="${n(r)}" fill="#fff" ${lijn}/><circle r="${n(r * 0.6)}" fill="none" ${lijn}/>`, kruis(0, 0, r * 0.42));
      omtrek = r + 4;
      break;
    }
    case 'kraan':
      d.push(`<line x1="0" y1="${n(w)}" x2="0" y2="${n(w + 6)}" ${lijn}/><circle cy="${n(w + 10)}" r="4" fill="#fff" ${lijn}/><line x1="-6" y1="${n(w + 10)}" x2="6" y2="${n(w + 10)}" ${lijn}/>`);
      break;
    case 'kader':
    default: {
      // Op ware grootte, met de afkorting; een plat toestel tegen de wand minstens 16 cm diep getekend.
      const h = Math.max(m.d, 16), y = m.d >= 16 ? -m.d / 2 : w;
      d.push(`<rect x="${n(-m.b / 2)}" y="${n(y)}" width="${n(m.b)}" height="${n(h)}" fill="#fff" ${lijn}/>`);
      if (type.afkorting) d.push(tekst(0, y + h / 2, type.afkorting, Math.max(7, Math.min(22, Math.min(m.b / Math.max(2, type.afkorting.length) * 1.4, h * 0.55)))));
      omtrek = Math.max(m.b, h) / 2 + 4;
    }
  }
  if (gekozen || fout) d.push(`<circle r="${n(omtrek + 4)}" fill="none" stroke="${fout ? '#c0392b' : '#2f6fd0'}" stroke-width="2.5" stroke-dasharray="${fout ? '6 4' : '0'}"/>`);
  return d.join('');
}

/**
 * Het teken van een soort toestel als klein beeld, voor een tegel in het palet van het scherm (ronde 10b): hetzelfde
 * teken als in de tekening, in de kleur van zijn vak, met een stukje wand erboven als het aan een wand of gevel hangt.
 * Kleine toestellen (stopcontact) staan zo groot als grote (een kast): het beeld past zich aan het teken aan.
 */
export function toestelTekenBeeld(type: ToestelType, px = 40): string {
  const aan = type.bevestiging;
  const t: Toestel = { id: 'beeld', type: '', x: 0, y: 0, hoogte: 0, draai: 0, aan };
  const m = toestelMaten(type, aan);
  const wand = aan === 'wand' || aan === 'buiten';
  const s = Math.max(m.b + 10, m.d + 16, 38);
  // Aan een wand: de wand bovenaan, het teken eronder; anders het teken in het midden.
  const y0 = wand ? -m.d / 2 - 7 : -s / 2;
  const muur = wand ? `<rect x="${n(-s / 2)}" y="${n(-m.d / 2 - 6)}" width="${n(s)}" height="5" fill="#9a9a94"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(-s / 2)} ${n(y0)} ${n(s)} ${n(s)}" width="${px}" height="${px}" aria-hidden="true">${muur}${toestelTeken(t, type, false, false)}</svg>`;
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
    case 'trap': {
      const k = Math.max(8, Math.round(D / 22));
      for (let i = 1; i < k; i++) d.push(`<line x1="0" y1="${n((i * D) / k)}" x2="${n(B)}" y2="${n((i * D) / k)}" ${lijn}/>`);
      d.push(`<path d="M ${n(B / 2)} ${n(D - 10)} L ${n(B / 2)} 12 M ${n(B / 2 - 10)} 26 L ${n(B / 2)} 12 L ${n(B / 2 + 10)} 26" fill="none" stroke="#2b2b29" stroke-width="2"/>`);
      break;
    }
    case 'tapijt':
      d.length = 0;
      d.push(`<rect x="0" y="0" width="${n(B)}" height="${n(D)}" fill="${kleur}" fill-opacity="0.25" stroke="#55524c" stroke-width="1" stroke-dasharray="6 5"/>`);
      break;
  }
  const kader = gekozen ? `<rect x="${n(v.x - 4)}" y="${n(v.y - 4)}" width="${n(v.b + 8)}" height="${n(v.d + 8)}" fill="none" stroke="#2f6fd0" stroke-width="3"/>` : '';
  return `<g data-soort="meubel" data-id="${esc(m.id)}" style="cursor:move"><g transform="translate(${n(m.x + dx)} ${n(m.y + dy)}) rotate(${m.rotatie})">${d.join('')}</g>${kader}</g>`;
}
