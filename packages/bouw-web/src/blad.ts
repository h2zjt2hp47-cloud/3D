/**
 * Blad met beelden (16/11): wat de klant meekrijgt op papier of als PDF (afdrukken van de browser, "Bewaren als PDF").
 * Zonder prijzen. Op A4 staand:
 *   1. het project (aannemer, klant, datum), een groot beeld van de woning, wat het ontwerp is in gewone taal, en drie
 *      zichten (voorgevel, zijgevel, achtergevel) met de hoofdmaten;
 *   2. de gevels als aanzicht met de maten (dezelfde tekening als in het overzicht);
 *   3. per verdieping een beeld van boven, met lage muren en de breedte en diepte;
 *   3b. als het plan techniek heeft (ronde 10c): per verdieping de techniek uitgezet, met de legende per vak;
 *   4. per raam of deur een beeld met de maten, een korte omschrijving en wat het is.
 * De beelden worden buiten beeld getekend (zoals de zending), het scherm verandert niet. Zonder woning (enkel ramen):
 * alleen het project en de ramen en deuren.
 *
 * Een gebouw of stuk staalwerk als positie (16/11: carport, tuinhuis, loods, balustrade, luifel, trap, en de aanbouw)
 * krijgt een eigen deel: een groot beeld (een gebouw buiten, staalwerk op de effen achtergrond), een zicht van voren en
 * van opzij met de hoofdmaten, en bij een vast model de constructie; met wat het is en de belangrijkste keuzes.
 */
import { gebouwKader, gebouwMaatlijnen, passendKader, raamMaatlijnen, techniekPakket, verdiepingenVan, type Pakket3DTechniek, type Scene3D, type Scene3DMetMaten } from '../../core/src/index.js';
import { planCatalogus } from '../../core/voorbeelden/inrichting.js';
import { ontwerpKenmerken } from '../../core/voorbeelden/varianten.js';
import type { Standpunt } from '../../demo-web/src/drie-d.js';
import { tekenBeeld, woningScene } from './doorsturen.js';
import { $ } from './hulp.js';
import { aannemerNaam } from './meegeven.js';
import { gevelSvgs } from './plattegrond-ui.js';
import { heeftConstructie, isGebouw, positieMaatlijnen, positieScene } from './positie-3d.js';
import { openingVan, resultaat, toestand, type Positie } from './staat.js';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function datumTekst(d: string): string {
  const x = new Date(`${d.slice(0, 10)}T12:00:00`);
  return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Opdracht { scene: Scene3D; standpunt: Standpunt; buiten: boolean; breedte: number }

/** Een kleur uit het pakket als CSS (alleen een hexkleur; anders grijs). */
const kleurCss = (k: string) => (/^#[0-9a-f]{3,8}$/i.test(k) ? k : '#777777');

/**
 * De techniek op het blad (ronde 10c): de legende per vak (kleur, naam, wat er komt, de kleuren van de leidingen) en per
 * verdieping het beeld van de uitgezette 3D, met het voorbehoud. In gewone woorden, zonder aantallen of maten.
 */
function techniekSectie(t: Pakket3DTechniek, figuren: string[]): string {
  const legende = t.vakken.map((v) => {
    const toestellen = v.toestellen.map((x, i) => (i ? x.charAt(0).toLowerCase() + x.slice(1) : x)).join(', ');
    const leidingen = v.leidingen.map((l) => `<span class="b-leiding"><span class="b-lijn" style="background:${kleurCss(l.kleur)}"></span>${esc(l.naam)}</span>`).join('');
    return `<li><span class="b-stip" style="background:${kleurCss(v.kleur)}"></span><strong>${esc(v.naam)}</strong>${toestellen ? ` <span>${esc(toestellen)}.</span>` : ''}${leidingen ? `<br>${leidingen}` : ''}</li>`;
  }).join('');
  return `<section class="b-blad b-nieuw b-techniek"><h2>De techniek, per verdieping</h2>
    <p class="b-klein">De woning als lage wanden: de toestellen staan in de kleur van hun vak, met een schijf op de vloer; de leidingen in hun eigen kleur.</p>
    <ul class="b-legende">${legende}</ul>
    <div class="b-boven">${figuren.join('')}</div>
    ${t.voorbehoud ? `<p class="b-klein">${esc(t.voorbehoud)}</p>` : ''}</section>`;
}

/**
 * Tekent de beelden, vult het afdrukblad en opent het afdrukvenster. `kort` en `omschrijf` geven de regel en de
 * omschrijving van een positie zoals in het overzicht. Geeft false als de 3D op dit toestel niet werkt (dan geen blad).
 */
export async function drukBlad(kort: (p: Positie) => string, omschrijf: (p: Positie) => string, opVoortgang?: (klaar: number, totaal: number) => void): Promise<boolean> {
  const t = toestand();
  const woning = !t.meta.zonderWoning && t.plan.ruimtes.length > 0;
  const niveaus = woning ? verdiepingenVan(t.plan) : [];
  const alle = t.posities.filter((p) => p.aantal > 0);
  // Een gebouw of stuk staalwerk (met eigen hoofdmaten) krijgt een eigen deel; ramen, deuren en poorten samen in een raster.
  const onderdelen = alle.filter((p) => !!positieMaatlijnen(p)?.length);
  const posities = alle.filter((p) => !onderdelen.includes(p));
  const heel = woning ? woningScene(undefined, false) : null;
  const met = (s: Scene3D, maatlijnen: Scene3DMetMaten['maatlijnen']): Scene3DMetMaten => ({ ...s, maatlijnen });
  // De techniek (ronde 10c): alleen als het plan er heeft, zoals in het bestand voor de klant.
  const techniek = heel ? techniekPakket(t.plan, planCatalogus) : undefined;

  // Alle beelden die nodig zijn, in de volgorde van het blad. Kleinere beelden voor kleine vakjes: dan blijft de tekst
  // van een maat leesbaar op papier (ze is op het scherm altijd even groot in beeldpunten).
  const opdrachten: Opdracht[] = [];
  if (heel) {
    opdrachten.push({ scene: heel, standpunt: 'schuin', buiten: true, breedte: 1400 });
    for (const standpunt of ['voor', 'zij', 'achter'] as const) opdrachten.push({ scene: met(heel, gebouwMaatlijnen(heel)), standpunt, buiten: true, breedte: 480 });
    for (const [n] of niveaus.entries()) {
      const laag = woningScene(n, true);
      opdrachten.push({ scene: met(laag, gebouwMaatlijnen(laag, { hoogtes: false })), standpunt: 'boven', buiten: true, breedte: 800 });
    }
    // Ronde 10c: per verdieping met techniek de uitgezette 3D, schuin, zoals in het bestand voor de klant.
    for (const n of techniek?.niveaus ?? []) opdrachten.push({ scene: n.scene, standpunt: 'schuin', buiten: true, breedte: 960 });
  }
  for (const p of onderdelen) {
    const r = resultaat(p), buiten = isGebouw(p), kader = gebouwKader;
    const s = kader(positieScene(p, r)), maten = positieMaatlijnen(p, r);
    opdrachten.push({ scene: s, standpunt: 'schuin', buiten, breedte: 1400 });
    for (const standpunt of ['voor', 'zij'] as const) opdrachten.push({ scene: met(s, maten), standpunt, buiten, breedte: 480 });
    if (heeftConstructie(p)) opdrachten.push({ scene: kader(positieScene(p, r, 'constructie')), standpunt: 'schuin', buiten, breedte: 480 });
  }
  for (const p of posities) {
    const s = passendKader(positieScene(p, resultaat(p)));
    opdrachten.push({ scene: met(s, raamMaatlijnen(s.blokken)), standpunt: 'voor', buiten: false, breedte: 440 });
  }
  const beelden: string[] = [];
  for (const [i, o] of opdrachten.entries()) {
    const b = await tekenBeeld(o.scene, o);
    if (!b) return false;
    beelden.push(b);
    opVoortgang?.(i + 1, opdrachten.length);
  }

  let i = 0;
  const volgend = () => beelden[i++] ?? '';
  const figuur = (src: string, onder: string, klasse = '') => `<figure class="${klasse}"><img src="${src}" alt="${esc(onder)}"><figcaption>${esc(onder)}</figcaption></figure>`;
  const kenmerken = ontwerpKenmerken(t.plan, t.posities, planCatalogus, { zonderWoning: !woning });
  // Zonder firmanaam geen regel met een verzonnen naam (doorloop B1).
  const firma = aannemerNaam();
  const kop = `<header class="b-kop">
      <div>${firma ? `<div class="b-aannemer">${esc(firma)}</div>` : ''}<h1>${esc(t.meta.project || 'Uw ontwerp')}</h1>
      <p>${esc([t.meta.klant, t.meta.adres].filter(Boolean).join(' · '))}</p></div>
      <div class="b-datum">Ontwerp van ${esc(datumTekst(t.meta.datum))}<br>${esc(t.meta.nummer)}</div></header>`;
  let html = kop;
  if (heel) {
    html += `<section class="b-blad">${figuur(volgend(), 'De woning', 'b-groot')}
      <ul class="b-kort">${kenmerken.map((k) => `<li>${esc(k.tekst.charAt(0).toUpperCase() + k.tekst.slice(1))}</li>`).join('')}</ul>
      <div class="b-zichten">${figuur(volgend(), 'Voorgevel')}${figuur(volgend(), 'Zijgevel')}${figuur(volgend(), 'Achtergevel')}</div></section>`;
    const gevels = gevelSvgs(560);
    if (gevels.length) html += `<section class="b-blad b-nieuw"><h2>De gevels</h2><div class="b-gevels">${gevels.map((g) => `<figure><figcaption>${esc(g.naam)}</figcaption>${g.svg}</figure>`).join('')}</div></section>`;
    html += `<section class="b-blad b-nieuw"><h2>Per verdieping, van boven</h2><div class="b-boven">${niveaus.map((v) => figuur(volgend(), v.naam)).join('')}</div></section>`;
    if (techniek) html += techniekSectie(techniek, techniek.niveaus.map((n) => figuur(volgend(), n.naam)));
  } else {
    html += `<ul class="b-kort">${kenmerken.map((k) => `<li>${esc(k.tekst.charAt(0).toUpperCase() + k.tekst.slice(1))}</li>`).join('')}</ul>`;
  }
  // Elk gebouw of stuk staalwerk: groot, dan van voren en opzij met de maten, en de constructie.
  for (const [n, p] of onderdelen.entries()) {
    const groot = volgend(), voor = volgend(), zij = volgend(), constructie = heeftConstructie(p) ? volgend() : '';
    html += `<section class="b-blad${heel || n > 0 ? ' b-nieuw' : ''}"><h2>${esc(p.code)} · ${esc(p.naam)}${p.aantal > 1 ? ` (${p.aantal} stuks)` : ''}</h2>
      ${figuur(groot, kort(p), 'b-groot')}
      <p class="b-klein">${esc(omschrijf(p))}</p>
      <div class="b-zichten">${figuur(voor, 'Van voren, met de maten')}${figuur(zij, 'Van opzij, met de maten')}${constructie ? figuur(constructie, 'De constructie') : ''}</div></section>`;
  }
  if (posities.length) {
    html += `<section class="b-nieuw"><h2>Ramen en deuren</h2><div class="b-ramen">${posities.map((p) => {
      const o = openingVan(p);
      const plaats = o && woning ? [niveaus[o.niveau ?? 0]?.naam, o.borstwering > 0 ? `borstwering ${o.borstwering} cm` : ''].filter(Boolean).join(', ') : '';
      return `<figure class="b-raam"><img src="${volgend()}" alt="${esc(p.naam)}">
        <figcaption><strong>${esc(p.code)} · ${esc(p.naam)}</strong>${p.aantal > 1 ? ` <span>(${p.aantal} stuks)</span>` : ''}<br>${esc(kort(p))}${plaats ? `<br>${esc(plaats)}` : ''}
        <span class="b-klein">${esc(omschrijf(p))}</span></figcaption></figure>`;
    }).join('')}</div></section>`;
  }
  html += `<p class="b-klein b-voet">Beelden ter illustratie: kleuren en materialen zijn een benadering, maten onder voorbehoud van inmeting op de werf.</p>`;
  const blad = $('#afdruk');
  blad.innerHTML = `<div class="blad">${html}</div>`;
  // Pas afdrukken als elk beeld klaar is om te tekenen (anders kan een beeld op het blad ontbreken).
  await Promise.all([...blad.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined)));
  window.print();
  return true;
}
