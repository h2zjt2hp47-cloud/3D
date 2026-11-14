/**
 * Klein logboek van wat er in de pagina gebeurt: welk scherm, welk model, de 3D, fouten. Om een probleem te kunnen
 * melden (vraag van Jonas, 14/11: "zit er een log in de html?"). Het blijft in deze browser, ook na herladen: herladen
 * lost sommige problemen op, en dan wil je net weten wat ervoor gebeurde. Het gaat nergens heen; "Kopieer logboek"
 * onderaan de pagina (en in de rode foutmelding) zet het op het klembord. Geen gegevens van klanten: alleen
 * handelingen, codes van modellen, maten en meldingen.
 */
const SLEUTEL = 'configurator-demo.logboek.v1';
const MAX = 300;

function lees(): string[] {
  try {
    const x = JSON.parse(localStorage.getItem(SLEUTEL) ?? '[]');
    return Array.isArray(x) ? x.filter((r): r is string => typeof r === 'string').slice(-MAX) : [];
  } catch {
    return [];
  }
}
let regels: string[] = lees();
let laatste = '';

/** Eén regel erbij, met het uur. Dezelfde regel vlak na elkaar maar één keer (bv. dezelfde fout bij elk beeld). */
export function log(tekst: string) {
  if (tekst === laatste) return;
  laatste = tekst;
  const nu = new Date(), twee = (n: number) => String(n).padStart(2, '0');
  regels.push(`${twee(nu.getDate())}/${twee(nu.getMonth() + 1)} ${twee(nu.getHours())}:${twee(nu.getMinutes())}:${twee(nu.getSeconds())}  ${tekst.replace(/\s+/g, ' ').slice(0, 400)}`);
  if (regels.length > MAX) regels = regels.slice(-MAX);
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(regels));
  } catch {
    /* opslag niet beschikbaar: het logboek leeft dan tot de pagina sluit */
  }
}

/** Het hele logboek als tekst, met bovenaan de browser en het scherm (dat vragen we anders toch). */
export function logboekTekst(): string {
  const kop = [
    `Logboek configurator (${document.title})`,
    `Browser: ${navigator.userAgent}`,
    `Scherm: ${window.innerWidth} × ${window.innerHeight}, pixelverhouding ${window.devicePixelRatio || 1}; WebGPU in de browser: ${'gpu' in navigator ? 'ja' : 'nee'}; geopend als ${location.protocol}`,
    `${regels.length} regels (de laatste ${MAX} worden bewaard):`,
  ];
  return [...kop, ...regels].join('\n');
}

/** Meldingen die volgen op een weggevallen grafisch toestel: de 3D herstart dan zelf, dus geen rode foutmelding. */
export const vanToestelVerlies = (tekst: string) => /popErrorScope|device (was |is )?lost|Device Lost|Instance dropped|external Instance|GPUDevice|context lost/i.test(tekst);
