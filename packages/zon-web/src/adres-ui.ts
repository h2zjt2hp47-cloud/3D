/**
 * Woning opzoeken via het adres (enkel Vlaanderen, open gegevens van Digitaal Vlaanderen):
 * - Geopunt geolocatie (adres → Lambert 72);
 * - GRB-gebouwen en -wegsegmenten (WFS): het gebouw en de voorgevel (zijde naar de straat);
 * - hoogtemodel DHMV II (WCS, 1 m): dakvorm, helling, goot- en nokhoogte, aanbouw, hoogte van de buren;
 * - luchtfoto (WMS): ter controle en als ondergrond in de 3D.
 * Het rekenwerk zit in core/src/ligging.ts en core/src/hoogte.ts.
 */
import { analyseerDak, gebouwHoogte, leesGeoTiff, naarLokaal, richtingVan, type DakAnalyse, type Raster } from '../../core/src/hoogte.js';
import { bepaalLigging, ligVoorzijde, ringenUitGeoJson, wegenUitGeoJson, type Ligging, type Ring, type Weg, type XY } from '../../core/src/ligging.js';
import { windstreek, type Gebouw } from '../../core/src/zon.js';
import { el, getal, knop } from './hulp.js';
import { toestand, wijzig } from './staat.js';

const GEO = 'https://geo.api.vlaanderen.be';
const STRAAL = 60; // m rond het adres voor kaart, hoogtemodel en buren
const STRAAL_WEG = 120;
const DAKVORM = { zadel: 'zadeldak', lessenaar: 'lessenaarsdak', plat: 'plat dak' } as const;

interface Zoekresultaat {
  adres: string;
  straat: string;
  punt: XY;
  gebouwen: Ring[];
  wegen: Weg[];
  ligging: Ligging | null;
  dsm: Raster | null;
  dtm: Raster | null;
  dak: DakAnalyse | null;
  /** Aanbouw meenemen bij het overnemen. */
  metAanbouw: boolean;
  overgenomen: boolean;
}

let resultaat: Zoekresultaat | null = null;
let bezig = false;
let melding = '';
let laatsteAdres = '';
let herteken: () => void = () => {};

async function haal<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`De kaartdienst antwoordt niet (${r.status}).`);
  return r.json() as Promise<T>;
}

async function hoogtemodel(soort: 'DSM' | 'DTM', p: XY): Promise<Raster> {
  const x = Math.round(p[0]), y = Math.round(p[1]);
  const r = await fetch(`${GEO}/DHMV/wcs?service=WCS&version=2.0.1&request=GetCoverage&coverageId=DHMVII_${soort}_1m&subset=x(${x - STRAAL},${x + STRAAL})&subset=y(${y - STRAAL},${y + STRAAL})&format=image/tiff`);
  if (!r.ok) throw new Error(`Hoogtemodel niet beschikbaar (${r.status}).`);
  return leesGeoTiff(new Uint8Array(await r.arrayBuffer()));
}

const wfs = (laag: string, p: XY, straal: number) =>
  `${GEO}/GRB/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=GRB:${laag}&bbox=${p[0] - straal},${p[1] - straal},${p[0] + straal},${p[1] + straal},EPSG:31370&outputFormat=application/json&srsName=EPSG:31370`;

/** Dak opnieuw herkennen voor de gekozen ligging (ander gebouw of andere voorzijde). */
function herken(z: Zoekresultaat) {
  z.dak = z.ligging && z.dsm && z.dtm ? analyseerDak(z.ligging.gebouw, z.dsm, z.dtm, z.ligging.azimut) : null;
  z.metAanbouw = !!z.dak?.aanbouw;
  z.overgenomen = false;
}

async function zoek(adres: string) {
  bezig = true;
  melding = '';
  herteken();
  try {
    type Loc = { LocationResult: { FormattedAddress: string; Thoroughfarename: string | null; Housenumber: string | null; Location: { X_Lambert72: number; Y_Lambert72: number } }[] };
    const loc = await haal<Loc>(`${GEO}/geolocation/v4/Location?q=${encodeURIComponent(adres)}&c=1`);
    const l = loc.LocationResult[0];
    if (!l) throw new Error('Adres niet gevonden. Schrijf het als "Straat 12, 8530 Gemeente". Enkel adressen in Vlaanderen.');
    const punt: XY = [l.Location.X_Lambert72, l.Location.Y_Lambert72];
    const [g, w, dsm, dtm] = await Promise.all([
      haal<Parameters<typeof ringenUitGeoJson>[0]>(wfs('GBG', punt, STRAAL)),
      haal<Parameters<typeof wegenUitGeoJson>[0]>(wfs('Wegsegment', punt, STRAAL_WEG)),
      hoogtemodel('DSM', punt).catch(() => null),
      hoogtemodel('DTM', punt).catch(() => null),
    ]);
    const gebouwen = ringenUitGeoJson(g), wegen = wegenUitGeoJson(w);
    const straat = l.Thoroughfarename ?? '';
    resultaat = { adres: l.FormattedAddress, straat, punt, gebouwen, wegen, ligging: bepaalLigging(punt, gebouwen, wegen, straat), dsm, dtm, dak: null, metAanbouw: false, overgenomen: false };
    herken(resultaat);
    if (!resultaat.ligging) melding = 'Op dit adres staat geen gebouw in het GRB (bv. nieuwbouw). Vul de woning met de hand in.';
    else if (!dsm || !dtm) melding = 'Het hoogtemodel is niet bereikbaar: dakvorm, helling en hoogte vul je zelf in.';
    if (!l.Housenumber) melding = 'Geen huisnummer gevonden: controleer of het juiste gebouw gekozen is.';
  } catch (fout) {
    resultaat = null;
    melding = fout instanceof TypeError
      ? 'Geen verbinding met de kaartdienst van Digitaal Vlaanderen. Controleer de internetverbinding.'
      : fout instanceof Error ? fout.message : String(fout);
  } finally {
    bezig = false;
    herteken();
  }
}

/** Rechthoek (4 hoeken) rond een midden, in de richting van een azimut. */
function rechthoek(midden: XY, azimut: number, breedte: number, diepte: number, dx = 0, dz = 0): XY[] {
  const n = richtingVan(azimut), xr: XY = [-n[1], n[0]];
  const p = (a: number, b: number): XY => [midden[0] + xr[0] * a + n[0] * b, midden[1] + xr[1] * a + n[1] * b];
  return [p(dx - breedte / 2, dz + diepte / 2), p(dx + breedte / 2, dz + diepte / 2), p(dx + breedte / 2, dz - diepte / 2), p(dx - breedte / 2, dz - diepte / 2)];
}

const fotoUrl = (midden: XY, straal: number, pixels = 640) =>
  `${GEO}/OMWRGBMRVL/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=Ortho&STYLES=&CRS=EPSG:31370&BBOX=${midden[0] - straal},${midden[1] - straal},${midden[0] + straal},${midden[1] + straal}&WIDTH=${pixels}&HEIGHT=${pixels}&FORMAT=image/jpeg`;

function kaart(z: Zoekresultaat): SVGSVGElement {
  const S = STRAAL / 2; // de kaart toont 60 × 60 m
  const [cx, cy] = z.dak?.midden ?? z.ligging?.rechthoek.midden ?? z.punt;
  const x0 = cx - S, y0 = cy - S;
  const X = (x: number) => (x - x0).toFixed(2), Y = (y: number) => (y0 + 2 * S - y).toFixed(2);
  const pad = (r: XY[], dicht = true) => r.map((q, i) => `${i ? 'L' : 'M'}${X(q[0])} ${Y(q[1])}`).join(' ') + (dicht ? 'Z' : '');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${2 * S} ${2 * S}`);
  svg.setAttribute('class', 'adreskaart');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Luchtfoto en gebouwen rond ${z.adres}`);
  const delen: string[] = [`<image href="${fotoUrl([cx, cy], S)}" x="0" y="0" width="${2 * S}" height="${2 * S}" preserveAspectRatio="none"/>`];
  z.gebouwen.forEach((g, i) => {
    const gekozen = z.ligging?.gebouw === g;
    delen.push(`<path d="${pad(g)}" class="gebouw${gekozen ? ' gekozen' : ''}" data-i="${i}" fill="#fff" fill-opacity="${gekozen ? 0.18 : 0.08}" stroke="#fff" stroke-opacity=".8" stroke-width="${gekozen ? 0.35 : 0.2}"><title>Klik om dit gebouw te kiezen</title></path>`);
  });
  const d = z.dak;
  if (d) {
    // Hoofdvolume met de nok, en de aanbouw.
    const r = rechthoek(d.midden, d.azimut, d.breedte, d.diepte);
    delen.push(`<path d="${pad(r)}" fill="#e3a23b" fill-opacity=".28" stroke="#e3a23b" stroke-width=".5"/>`);
    if (d.dakvorm === 'zadel') {
      const nok = rechthoek(d.midden, d.azimut, d.breedte, 0);
      delen.push(`<path d="M${X(nok[0]![0])} ${Y(nok[0]![1])} L${X(nok[1]![0])} ${Y(nok[1]![1])}" stroke="#e3a23b" stroke-width=".6" stroke-dasharray="1.2 .8"/>`);
    }
    if (d.aanbouw && z.metAanbouw) {
      delen.push(`<path d="${pad(rechthoek(d.midden, d.azimut, d.aanbouw.breedte, d.aanbouw.diepte, d.aanbouw.x, d.aanbouw.z))}" fill="#9cc3d6" fill-opacity=".3" stroke="#9cc3d6" stroke-width=".4"/>`);
    }
  } else if (z.ligging) {
    delen.push(`<path d="${pad(z.ligging.rechthoek.hoeken)}" fill="#e3a23b" fill-opacity=".28" stroke="#e3a23b" stroke-width=".5"/>`);
  }
  // Pijl: richting van het voorste dakvlak (of de voorgevel).
  const az = d?.azimut ?? z.ligging?.azimut;
  if (az !== undefined) {
    const n = richtingVan(az);
    const m: XY = d ? [d.midden[0] + n[0] * d.diepte / 2, d.midden[1] + n[1] * d.diepte / 2] : z.ligging!.rechthoek.midden;
    delen.push(`<path d="M${X(m[0])} ${Y(m[1])} L${X(m[0] + n[0] * 6)} ${Y(m[1] + n[1] * 6)}" stroke="#ff5a1f" stroke-width=".8" marker-end="url(#pijlkop)"/>`);
  }
  delen.push(`<circle cx="${X(z.punt[0])}" cy="${Y(z.punt[1])}" r=".8" fill="#ff5a1f" stroke="#fff" stroke-width=".3"><title>Adrespunt</title></circle>`);
  delen.push(`<g transform="translate(${2 * S - 5} 6)"><circle r="3.6" fill="#000" fill-opacity=".45"/><path d="M0 -2.8 L1.3 1.4 L0 .6 L-1.3 1.4Z" fill="#fff"/></g>`);
  delen.push(`<g transform="translate(3 ${2 * S - 3})"><rect x="-1" y="-3" width="12" height="4.6" fill="#000" fill-opacity=".45" rx=".6"/><path d="M0 0 H10" stroke="#fff" stroke-width=".4"/><text x="5" y="-.9" text-anchor="middle" font-size="1.8" fill="#fff">10 m</text></g>`);
  svg.innerHTML = `<defs><marker id="pijlkop" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#ff5a1f"/></marker></defs>${delen.join('')}`;
  for (const p of svg.querySelectorAll<SVGPathElement>('.gebouw')) {
    p.addEventListener('click', () => {
      if (!resultaat) return;
      const g = resultaat.gebouwen[Number(p.dataset.i)]!;
      const m: XY = [g.reduce((t, q) => t + q[0], 0) / g.length, g.reduce((t, q) => t + q[1], 0) / g.length];
      resultaat.ligging = bepaalLigging(m, [g], resultaat.wegen, resultaat.straat);
      herken(resultaat);
      herteken();
    });
  }
  return svg;
}

/** Zet de gevonden woning in het project: gebouwen, oriëntatie, buren en luchtfoto. */
function overnemen(z: Zoekresultaat) {
  const l = z.ligging!;
  const d = z.dak;
  const cm = (m: number, stap = 10) => Math.round((m * 100) / stap) * stap;
  const orientatie = d?.azimut ?? l.azimut;
  const midden = d?.midden ?? l.rechthoek.midden;
  const gebouwen: Gebouw[] = d
    ? [{ id: 'huis', naam: 'Woning', dakvorm: d.dakvorm, breedte: cm(d.breedte), diepte: cm(d.diepte), goothoogte: cm(d.goothoogte), helling: d.dakvorm === 'plat' ? 0 : d.helling, x: 0, z: 0 }]
    : [{ ...toestand().gebouwen[0]!, id: 'huis', breedte: l.breedte, diepte: l.diepte, x: 0, z: 0 }];
  if (d?.aanbouw && z.metAanbouw) {
    const a = d.aanbouw;
    gebouwen.push({ id: 'aanbouw', naam: 'Aanbouw', dakvorm: 'plat', breedte: cm(a.breedte), diepte: cm(a.diepte), goothoogte: cm(a.hoogte), helling: 0, x: cm(a.x), z: cm(a.z) });
  }
  // Buren: alle andere gebouwen binnen 60 m, met hun hoogte uit het hoogtemodel.
  const omgeving = z.dsm && z.dtm
    ? z.gebouwen.filter((g) => g !== l.gebouw).flatMap((g) => {
      const h = gebouwHoogte(g, z.dsm!, z.dtm!);
      return h === null ? [] : [{ ring: g.map((p) => naarLokaal(p, midden, orientatie)), hoogte: Math.round(h * 100) }];
    })
    : [];
  // Draaiing van de luchtfoto: het noorden van de foto in de assen van de woning.
  const noord = naarLokaal([midden[0], midden[1] + 1], midden, orientatie);
  const draai = Math.atan2(-noord[0], -noord[1]);
  wijzig((q) => {
    q.orientatie = orientatie;
    q.gebouwen = gebouwen;
    q.vlakken = {};
    q.doelAantal = null;
    q.omgeving = omgeving;
    q.luchtfoto = { url: fotoUrl(midden, STRAAL, 1024), grootte: STRAAL * 200, draai };
    if (!q.klant.adres) q.klant.adres = z.adres;
  });
  z.overgenomen = true;
  herteken();
}

/** Vak "Woning opzoeken via het adres" in stap 1. */
export function adresZoeker(opnieuw: () => void): HTMLElement {
  herteken = opnieuw;
  const p = toestand();
  const invoer = el('input', { type: 'search', id: 'adres-zoek', list: 'adres-voorstellen', placeholder: 'Straat 12, 8530 Gemeente', autocomplete: 'off' }) as HTMLInputElement;
  invoer.value = laatsteAdres || p.klant.adres;
  const voorstellen = el('datalist', { id: 'adres-voorstellen' });
  let wacht = 0;
  invoer.addEventListener('input', () => {
    laatsteAdres = invoer.value;
    clearTimeout(wacht);
    if (invoer.value.trim().length < 4) return;
    wacht = window.setTimeout(async () => {
      try {
        const s = await haal<{ SuggestionResult: string[] }>(`${GEO}/geolocation/v4/Suggestion?q=${encodeURIComponent(invoer.value)}&c=6`);
        voorstellen.replaceChildren(...s.SuggestionResult.map((x) => el('option', { value: x })));
      } catch { /* geen voorstellen */ }
    }, 250);
  });
  const start = () => { laatsteAdres = invoer.value; if (invoer.value.trim()) void zoek(invoer.value.trim()); };
  invoer.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); start(); } });

  const vak = el('div', { class: 'adreszoeker' },
    el('div', { class: 'veld' },
      el('label', { for: 'adres-zoek' }, 'Woning opzoeken via het adres'),
      el('div', { class: 'zoekrij' }, invoer, knop(bezig ? 'Zoeken…' : 'Opzoeken', start, 'hoofd')),
      voorstellen,
      el('span', { class: 'hulp' }, 'Enkel in Vlaanderen. Haalt het gebouw, de dakvorm, de helling en de hoogte uit de kaart en het hoogtemodel; jij controleert en neemt over.')),
  );
  if (melding) vak.append(el('p', { class: 'veldfout', role: 'status' }, melding));
  const z = resultaat;
  if (!z) return vak;
  vak.append(el('div', { class: 'tekening kaartvak' }, kaart(z)));
  const l = z.ligging;
  if (!l) return vak;
  const d = z.dak;
  const m = (x: number) => `${getal(x, 1)} m`;
  vak.append(el('p', { class: 'gevonden' }, el('strong', {}, z.adres), l.straat ? ` – voorgevel aan de ${l.straat}` : ''));
  if (d) {
    vak.append(el('dl', { class: 'detail gevonden-dak' },
      el('dt', {}, 'Dak'), el('dd', {}, `${DAKVORM[d.dakvorm]}${d.dakvorm === 'plat' ? '' : `, ${d.helling}°`}`),
      el('dt', {}, d.dakvorm === 'plat' ? 'Voorgevel' : 'Voorste dakvlak'), el('dd', {}, `${windstreek(d.azimut)} (${d.azimut}°)`),
      el('dt', {}, 'Hoofdvolume'), el('dd', {}, `${m(d.breedte)} × ${m(d.diepte)}`),
      el('dt', {}, d.dakvorm === 'plat' ? 'Hoogte' : 'Goot / nok'), el('dd', {}, d.dakvorm === 'plat' ? m(d.goothoogte) : `${m(d.goothoogte)} / ${m(d.nokhoogte)}`),
      d.aanbouw ? el('dt', {}, 'Aanbouw') : null,
      d.aanbouw ? el('dd', {}, el('label', { class: 'kort' }, (() => {
        const i = el('input', { type: 'checkbox' }) as HTMLInputElement;
        i.checked = z.metAanbouw;
        i.addEventListener('change', () => { z.metAanbouw = i.checked; z.overgenomen = false; herteken(); });
        return i;
      })(), ` ${m(d.aanbouw.breedte)} × ${m(d.aanbouw.diepte)}, ${m(d.aanbouw.hoogte)} hoog`)) : null,
    ));
    if (d.zekerheid < 0.6) vak.append(el('p', { class: 'veldfout' }, 'Het dak is niet duidelijk herkend (bv. dakkapellen, schilddak of meerdere daken). Controleer dakvorm en helling.'));
  } else {
    vak.append(el('p', {}, `Gebouw van ${m(l.breedte / 100)} × ${m(l.diepte / 100)}, voorgevel naar ${windstreek(l.azimut)} (${l.azimut}°). Dakvorm, goothoogte en helling vul je zelf in.`));
  }
  vak.append(
    el('p', { class: 'hulp' }, 'Oranje = hoofdvolume (stippellijn = nok), blauw = aanbouw. Klopt het niet? Klik op een ander gebouw of draai de voorgevel. Hoogtemodel: laserscan 2013–2015 (recente verbouwingen ontbreken).'),
    el('div', { class: 'knoppenrij' },
      knop(z.overgenomen ? 'Overgenomen ✓' : 'Overnemen in het project', () => overnemen(z), 'hoofd'),
      knop('Andere zijde is de voorgevel ↻', () => {
        if (!resultaat?.ligging) return;
        const o = resultaat.ligging;
        resultaat.ligging = { ...ligVoorzijde(o.gebouw, o.rechthoek, o.voorzijde + 1, null), straat: o.straat };
        herken(resultaat);
        herteken();
      }),
      knop('Sluiten', () => { resultaat = null; melding = ''; herteken(); }),
    ),
    el('p', { class: 'bron' }, 'Bron: Digitaal Vlaanderen – GRB, hoogtemodel DHMV II en orthofoto (open data, Modellicentie Gratis Hergebruik).'),
  );
  return vak;
}
