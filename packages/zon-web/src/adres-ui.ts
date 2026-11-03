/**
 * Ligging opzoeken via het adres (enkel Vlaanderen, open gegevens van Digitaal Vlaanderen):
 * Geopunt geolocatie (adres → Lambert 72), GRB-gebouwen en -wegsegmenten (WFS) en de luchtfoto (WMS).
 * Het rekenwerk (gebouw, rechthoek, voorgevel) zit in core/src/ligging.ts.
 */
import { bepaalLigging, ligVoorzijde, ringenUitGeoJson, wegenUitGeoJson, type Ligging, type Ring, type Weg, type XY } from '../../core/src/ligging.js';
import { windstreek } from '../../core/src/zon.js';
import { el, getal, knop } from './hulp.js';
import { toestand, wijzig } from './staat.js';

const GEO = 'https://geo.api.vlaanderen.be';
const STRAAL = 60; // m rond het adres voor de kaart
const STRAAL_WEG = 120;

interface Zoekresultaat {
  adres: string;
  straat: string;
  punt: XY;
  gebouwen: Ring[];
  wegen: Weg[];
  ligging: Ligging | null;
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

const wfs = (laag: string, p: XY, straal: number) =>
  `${GEO}/GRB/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=GRB:${laag}&bbox=${p[0] - straal},${p[1] - straal},${p[0] + straal},${p[1] + straal},EPSG:31370&outputFormat=application/json&srsName=EPSG:31370`;

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
    const [g, w] = await Promise.all([haal<Parameters<typeof ringenUitGeoJson>[0]>(wfs('GBG', punt, STRAAL)), haal<Parameters<typeof wegenUitGeoJson>[0]>(wfs('Wegsegment', punt, STRAAL_WEG))]);
    const gebouwen = ringenUitGeoJson(g), wegen = wegenUitGeoJson(w);
    const straat = l.Thoroughfarename ?? '';
    resultaat = { adres: l.FormattedAddress, straat, punt, gebouwen, wegen, ligging: bepaalLigging(punt, gebouwen, wegen, straat) };
    if (!resultaat.ligging) melding = 'Op dit adres staat geen gebouw in het GRB (bv. nieuwbouw). Vul de ligging met de hand in.';
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

/** Middelpunt van een veelhoek (gemiddelde van de hoekpunten volstaat om een gebouw aan te duiden). */
const middelpunt = (r: Ring): XY => [r.reduce((t, q) => t + q[0], 0) / r.length, r.reduce((t, q) => t + q[1], 0) / r.length];

function kaart(z: Zoekresultaat): SVGSVGElement {
  const S = STRAAL;
  const [cx, cy] = z.ligging ? z.ligging.rechthoek.midden : z.punt;
  const x0 = cx - S, y0 = cy - S;
  const X = (x: number) => (x - x0).toFixed(2), Y = (y: number) => (y0 + 2 * S - y).toFixed(2);
  const pad = (r: XY[], dicht = true) => r.map((q, i) => `${i ? 'L' : 'M'}${X(q[0])} ${Y(q[1])}`).join(' ') + (dicht ? 'Z' : '');
  const foto = `${GEO}/OMWRGBMRVL/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=Ortho&STYLES=&CRS=EPSG:31370&BBOX=${x0},${y0},${x0 + 2 * S},${y0 + 2 * S}&WIDTH=640&HEIGHT=640&FORMAT=image/jpeg`;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${2 * S} ${2 * S}`);
  svg.setAttribute('class', 'adreskaart');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Luchtfoto en gebouwen rond ${z.adres}`);
  const delen: string[] = [`<image href="${foto}" x="0" y="0" width="${2 * S}" height="${2 * S}" preserveAspectRatio="none"/>`];
  for (const w of z.wegen) delen.push(`<path d="${pad(w.lijn, false)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".6" stroke-dasharray="2 1.5"/>`);
  z.gebouwen.forEach((g, i) => {
    const gekozen = z.ligging?.gebouw === g;
    delen.push(`<path d="${pad(g)}" class="gebouw${gekozen ? ' gekozen' : ''}" data-i="${i}" fill="${gekozen ? '#e3a23b' : '#ffffff'}" fill-opacity="${gekozen ? 0.35 : 0.12}" stroke="${gekozen ? '#e3a23b' : '#fff'}" stroke-width="${gekozen ? 0.6 : 0.3}"><title>Klik om dit gebouw te kiezen</title></path>`);
  });
  if (z.ligging) {
    const r = z.ligging.rechthoek;
    delen.push(`<path d="${pad(r.hoeken)}" fill="none" stroke="#e3a23b" stroke-width=".35" stroke-dasharray="1 .8"/>`);
    const a = r.hoeken[z.ligging.voorzijde]!, b = r.hoeken[(z.ligging.voorzijde + 1) % 4]!;
    const m: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const n: XY = [(b[1] - a[1]) / r.zijden[z.ligging.voorzijde]!, -(b[0] - a[0]) / r.zijden[z.ligging.voorzijde]!];
    delen.push(`<path d="M${X(a[0])} ${Y(a[1])} L${X(b[0])} ${Y(b[1])}" stroke="#ff5a1f" stroke-width="1.4" stroke-linecap="round"/>`);
    delen.push(`<path d="M${X(m[0])} ${Y(m[1])} L${X(m[0] + n[0] * 7)} ${Y(m[1] + n[1] * 7)}" stroke="#ff5a1f" stroke-width=".9" marker-end="url(#pijlkop)"/>`);
  }
  delen.push(`<circle cx="${X(z.punt[0])}" cy="${Y(z.punt[1])}" r="1.1" fill="#ff5a1f" stroke="#fff" stroke-width=".4"><title>Adrespunt</title></circle>`);
  // Noordpijl en schaal.
  delen.push(`<g transform="translate(${2 * S - 9} 11)"><circle r="6.5" fill="#000" fill-opacity=".45"/><path d="M0 -5 L2.4 2.5 L0 1 L-2.4 2.5Z" fill="#fff"/><text y="-7.8" text-anchor="middle" font-size="3.6" fill="#fff" font-weight="700">N</text></g>`);
  delen.push(`<g transform="translate(5 ${2 * S - 6})"><rect x="-2" y="-5" width="24" height="8" fill="#000" fill-opacity=".45" rx="1"/><path d="M0 0 H20" stroke="#fff" stroke-width=".8"/><text x="10" y="-1.6" text-anchor="middle" font-size="3.2" fill="#fff">20 m</text></g>`);
  svg.innerHTML = `<defs><marker id="pijlkop" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#ff5a1f"/></marker></defs>${delen.join('')}`;
  for (const p of svg.querySelectorAll<SVGPathElement>('.gebouw')) {
    p.addEventListener('click', () => {
      if (!resultaat) return;
      const g = resultaat.gebouwen[Number(p.dataset.i)]!;
      resultaat.ligging = bepaalLigging(middelpunt(g), [g], resultaat.wegen, resultaat.straat);
      herteken();
    });
  }
  return svg;
}

/** Vak "Ligging opzoeken via het adres" in stap 1. */
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
      el('label', { for: 'adres-zoek' }, 'Ligging opzoeken via het adres'),
      el('div', { class: 'zoekrij' }, invoer, knop(bezig ? 'Zoeken…' : 'Opzoeken', start, 'hoofd')),
      voorstellen,
      el('span', { class: 'hulp' }, 'Enkel in Vlaanderen. Zoekt het gebouw in het GRB en neemt als voorgevel de zijde naar de straat.')),
  );
  if (melding) vak.append(el('p', { class: 'veldfout', role: 'status' }, melding));
  const z = resultaat;
  if (z) {
    const l = z.ligging;
    vak.append(el('div', { class: 'tekening kaartvak' }, kaart(z)));
    if (l) {
      vak.append(
        el('p', { class: 'gevonden' }, el('strong', {}, z.adres), ': gebouw van ', el('strong', {}, `${getal(l.breedte / 100, 1)} × ${getal(l.diepte / 100, 1)} m`),
          ', voorgevel naar ', el('strong', {}, `${windstreek(l.azimut)} (${l.azimut}°)`), l.straat ? ` aan de ${l.straat}` : '', '.'),
        el('p', { class: 'hulp' }, 'Klopt het niet? Klik op een ander gebouw of draai de voorgevel. De diepte is die van het hele gebouw (met aanbouw). Dakvorm, goothoogte en helling haal je niet uit de kaart: vul die zelf in.'),
        el('div', { class: 'knoppenrij' },
          knop('Overnemen in het project', () => {
            const lig = l;
            wijzig((q) => {
              q.orientatie = lig.azimut;
              const g = q.gebouwen[0];
              if (g) { g.breedte = lig.breedte; g.diepte = lig.diepte; }
              if (!q.klant.adres) q.klant.adres = z.adres;
              for (const v of Object.values(q.vlakken)) v.uit = [];
            });
          }, 'hoofd'),
          knop('Andere zijde is de voorgevel ↻', () => {
            if (!resultaat?.ligging) return;
            const o = resultaat.ligging;
            resultaat.ligging = ligVoorzijde(o.gebouw, o.rechthoek, o.voorzijde + 1, o.straat ? { naam: o.straat, q: o.rechthoek.midden } : null);
            resultaat.ligging.afstandStraat = null;
            herteken();
          }),
          knop('Sluiten', () => { resultaat = null; melding = ''; herteken(); }),
        ),
        el('p', { class: 'bron' }, 'Bron: Digitaal Vlaanderen – GRB en orthofoto (open data, Modellicentie Gratis Hergebruik).'),
      );
    }
  }
  return vak;
}
