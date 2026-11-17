/**
 * Losse 3D-kijker voor de bouw: toont een 3D-pakket (core/src/pakket3d.ts) en kan niets wijzigen. Bedoeld om in te
 * sluiten in een ander systeem (bv. een scherm van Missing Link) of om een doorgestuurd pakket te openen.
 *
 * Een pakket komt binnen op drie manieren:
 *   - een bericht van de pagina die de kijker insluit: postMessage({ soort: 'bouw-3d-pakket', ... });
 *   - het adres van de pagina: ?pakket=<adres van het json-bestand> (zelfde server);
 *   - een bestand kiezen of slepen.
 * Berichten van en naar de insluitende pagina hebben allemaal `soort: 'bouw-kijker'`:
 *   kijker → pagina   { soort: 'bouw-kijker', bericht: 'klaar', versie }          de kijker is geladen
 *                     { soort: 'bouw-kijker', bericht: 'getoond', project }        een pakket staat in beeld
 *                     { soort: 'bouw-kijker', bericht: 'beeld', png }              antwoord op de vraag om een beeld
 *                     { soort: 'bouw-kijker', bericht: 'fout', tekst }             het pakket kon niet getoond worden
 *   pagina → kijker   { soort: 'bouw-kijker', vraag: 'beeld' }                    geef het beeld zoals het nu staat (PNG)
 *                     { soort: 'bouw-kijker', huisstijl: { accent, achtergrond } } kleuren van de insluitende pagina
 * Met ?oorsprong=<adres> in het adres van de kijker luistert en antwoordt hij alleen naar dat adres.
 *
 * Bestand voor de klant (16/11, `meegeven.ts`): het pakket zit in de pagina zelf. Dan is dit alleen een kijker: geen
 * ander pakket openen, niets ophalen of ontvangen, met de naam van de aannemer, het project en de datum bovenaan, en met
 * de varianten om tussen te wisselen als er meer ontwerpen meegaan. Maten (de keuze *Maten*) rekent de kijker zelf uit
 * de scène (core/src/maten3d.ts), zodat ook een ouder pakket ze heeft.
 *
 * Een positie die een gebouw is (16/11: `gebouw` in het pakket; een aanbouw, carport, tuinhuis of loods) staat buiten,
 * zoals de woning, schuin van boven en met haar eigen kader; een positie met `maatlijnen` (haar hoofdmaten) toont die als
 * *Maten* aan staat.
 *
 * De techniek (ronde 10c, 17/11; veld `techniek` in het pakket, alleen als het plan techniek heeft): de keuze *De woning /
 * Techniek* bovenaan. *Techniek* toont per verdieping de uitgezette 3D (lage wanden, de toestellen groot in de kleur van
 * hun vak met een schijf op de vloer, de leidingen in hun kleur), een legende per vak in gewone woorden (een tik op een
 * vak toont alleen dat vak, nog een tik alles) met de kleuren van de leidingen, en een tik op een toestel of leiding zegt
 * wat het is, waar het zit en bij welke post het hoort. Ook een toestel dat je buiten ziet (de buitenunit in de woning)
 * zegt dat. Alle woorden komen uit het pakket; geen maten, lengtes of prijzen.
 */
import { gebouwKader, gebouwMaatlijnen, leesPakket3D, passendKader, PAKKET3D_VERSIE, raamMaatlijnen, type Pakket3D, type Scene3D, type Scene3DMetMaten } from '../../core/src/index.js';
import { maak3D, type Viewer3D } from '../../demo-web/src/drie-d.js';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const adres = new URLSearchParams(location.search);
const oorsprong = adres.get('oorsprong');
let viewer: Viewer3D | null | undefined;
let pakket: Pakket3D | null = null;
/** Het ontwerp en zijn varianten (het eerste is het pakket zelf); `pakket` is het ontwerp dat nu getoond wordt. */
let alle: Pakket3D[] = [];
/** Een pakket dat in de pagina zelf zit: het bestand voor de klant. Dan alleen kijken. */
const ingesloten = document.getElementById('pakket');
const klantbestand = !!ingesloten?.textContent?.trim();
/** Wat er nu in beeld staat ('woning' of de code van een positie), om het standpunt alleen bij een andere keuze te zetten. */
let getoond = '';
/** De woning (en de ramen en deuren) of de techniek (ronde 10c). */
let modus: 'ontwerp' | 'techniek' = 'ontwerp';
/** De verdieping van de techniek (index in `pakket.techniek.niveaus`). */
let techniekNiveau = 0;
/** Alleen dit vak tonen (een tik op de legende), of alles. */
let alleenVak: string | null = null;
/** Het aangetikte toestel of de leiding (`toestel:<id>`, `leiding:<id>`) waarvan de uitleg openstaat. */
let gekozen: string | null = null;

const techniekNu = () => modus === 'techniek' && !!pakket?.techniek;
/** De woning zelf in beeld (niet de techniek, niet een positie). */
const woningNu = () => !techniekNu() && $<HTMLSelectElement>('#keuze').value === 'woning';
/** Het ding van een blok (`toestel:<id>` of `leiding:<id>`), of niets. */
const dingVan = (code: string) => /^((?:toestel|leiding):[^.]+)\./.exec(code)?.[1];

function naarPagina(bericht: Record<string, unknown>) {
  if (window.parent !== window) window.parent.postMessage({ soort: 'bouw-kijker', ...bericht }, oorsprong ?? '*');
}

function fout(tekst: string) {
  $('#fout').textContent = tekst;
  $('#fout').hidden = false;
  naarPagina({ bericht: 'fout', tekst });
}

function scene(): Scene3D | null {
  if (!pakket) return null;
  if (techniekNu()) {
    const t = pakket.techniek!, n = t.niveaus[techniekNiveau] ?? t.niveaus[0];
    if (!n) return null;
    // Alleen één vak: de toestellen en leidingen van de andere vakken vallen weg; de woning (lage wanden) en het kader blijven.
    if (!alleenVak) return n.scene;
    return { ...n.scene, blokken: n.scene.blokken.filter((b) => { const d = dingVan(b.code); return !d || t.dingen[d]?.vak === alleenVak; }) };
  }
  const keuze = $<HTMLSelectElement>('#keuze').value;
  if (keuze === 'woning') {
    const n = pakket.woning[Number($<HTMLSelectElement>('#niveau').value)] ?? pakket.woning[pakket.woning.length - 1];
    if (!n) return null;
    return $<HTMLInputElement>('#laag').checked ? n.laag : n.scene;
  }
  const positie = pakket.posities.find((p) => p.code === keuze);
  if (!positie) return null;
  // Een raam of deur helemaal in beeld (passendKader); een gebouw of stuk staalwerk (met eigen maten) met wat lucht rond.
  return positie.gebouw || positie.maatlijnen ? gebouwKader(positie.scene) : passendKader(positie.scene);
}

/**
 * De 3D tekent op 62 % van haar breedte. Vroeger rekte het canvas uit tot de hoogte van het venster: op een tablet in
 * staande stand stond de woning dan uitgerekt. Nu kiest de kijker de breedte zo dat het hele beeld in het venster past.
 */
function pasMaatAan() {
  const vak = $('#drie-d-vak');
  const main = vak.parentElement!;
  const stijl = getComputedStyle(main);
  const breed = main.clientWidth - parseFloat(stijl.paddingLeft) - parseFloat(stijl.paddingRight);
  // Ruimte onder de 3D voor de uitleg (twee regels), en bij de techniek ook voor de legende.
  const legende = $('#techniek').hidden ? 0 : $('#techniek').offsetHeight + 8;
  const hoog = window.innerHeight - vak.getBoundingClientRect().top - 64 - legende;
  vak.style.width = `${Math.floor(Math.max(280, Math.min(breed, hoog / 0.62)))}px`;
}

/**
 * De scène met de maatlijnen erbij als *Maten* aan staat: de hoofdmaten van de woning, de hoofdmaten die een positie zelf
 * meebrengt (een carport, een loods, een balustrade …), of de maten van het raam.
 */
function metMaten(s: Scene3D, woning: boolean, eigen?: Scene3DMetMaten['maatlijnen']): Scene3DMetMaten {
  if (!$<HTMLInputElement>('#maten').checked) return s;
  const laag = woning && $<HTMLInputElement>('#laag').checked;
  return { ...s, maatlijnen: woning ? gebouwMaatlijnen(s, { hoogtes: !laag }) : eigen ?? raamMaatlijnen(s.blokken) };
}

function teken() {
  if (!pakket) return;
  const techniek = techniekNu();
  const keuze = $<HTMLSelectElement>('#keuze').value;
  const woning = woningNu();
  for (const b of document.querySelectorAll<HTMLButtonElement>('#weergave button')) b.setAttribute('aria-pressed', String((b.dataset.weergave === 'techniek') === techniek));
  $('#keuze-wrap').hidden = techniek;
  $('#niveau-wrap').hidden = !woning || pakket.woning.length < 2;
  $('#laag-wrap').hidden = !woning;
  $('#maten-wrap').hidden = techniek;
  $('#techniek-niveaus').hidden = !techniek || (pakket.techniek?.niveaus.length ?? 0) < 2;
  $('#techniek').hidden = !techniek;
  if (techniek) toonLegende();
  const p = techniek ? undefined : pakket.posities.find((x) => x.code === keuze);
  $('#uitleg').textContent = techniek
    ? 'Tik op een toestel of een leiding: wat het is en waar het zit. Draai met de muis of een vinger; zoom met Ctrl + scrollen of knijpen.'
    : woning ? 'Draai met de muis of een vinger; zoom met Ctrl + scrollen of knijpen.' : p ? `${p.aantal} × ${p.naam}. ${p.omschrijving}` : '';
  $('#uitleg').hidden = false;
  const s = scene();
  if (!s) return;
  if (viewer === undefined) {
    // Ronde 11: een tik op een ding van de woning (dak, gevel, raam) opent de posten van het werk waar het bij hoort.
    viewer = maak3D($('#drie-d'), { opKlik: tikOpDing });
    // Zoals in de configurator: op een aanraakscherm (tablet) de snelle weergave, op een computer de mooie.
    viewer?.kwaliteit?.(window.matchMedia?.('(pointer: coarse)').matches ? 'snel' : 'mooi');
  }
  if (!viewer) { fout('De 3D kan op dit toestel niet getoond worden.'); return; }
  pasMaatAan();
  viewer.formaat();
  // De woning, de techniek en een gebouw staan buiten (lucht, gras, horizon); een raam, deur of stuk staalwerk blijft een
  // rustig beeld op een effen achtergrond.
  const buiten = woning || techniek || !!p?.gebouw;
  viewer.omgeving?.(buiten ? 'buiten' : 'geen');
  viewer.toon(techniek ? s : metMaten(s, woning, p?.maatlijnen));
  // Een raam van voren (het hele raam in beeld), de woning, de techniek en een gebouw schuin van boven; alleen bij een
  // andere keuze, niet bij elke klik.
  const sleutel = techniek ? `techniek:${techniekNiveau}` : keuze;
  if (sleutel !== getoond) viewer.standpunt(buiten || p?.maatlijnen ? 'schuin' : 'voor');
  getoond = sleutel;
}

// ---------- de techniek (ronde 10c) ----------

function maak<K extends keyof HTMLElementTagNameMap>(tag: K, klasse = '', tekst = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst) e.textContent = tekst;
  return e;
}
function stip(kleur: string, klasse = 'stip') {
  const s = maak('span', klasse);
  s.style.background = kleur;
  return s;
}

/**
 * De legende: een knop per vak (alleen dat vak, of alles), de kleuren van de leidingen, de toestellen van één vak; alleen
 * wat op de getoonde verdieping staat.
 */
function toonLegende() {
  const t = pakket!.techniek!;
  const niveau = t.niveaus[techniekNiveau] ?? t.niveaus[0];
  const hier = new Set(niveau?.scene.blokken.map((b) => dingVan(b.code)).filter((d): d is string => !!d && !!t.dingen[d]));
  const namenHier = new Set([...hier].map((d) => t.dingen[d]!.naam));
  const vakkenHier = t.vakken.filter((v) => [...hier].some((d) => t.dingen[d]!.vak === v.vak));
  if (alleenVak && !vakkenHier.some((v) => v.vak === alleenVak)) alleenVak = null;
  $('#techniek-vakken').replaceChildren(...vakkenHier.map((v) => {
    const b = maak('button', 'tvak');
    b.type = 'button';
    b.dataset.vak = v.vak;
    b.title = v.uitleg;
    b.setAttribute('aria-pressed', String(!alleenVak || alleenVak === v.vak));
    b.append(stip(v.kleur), maak('span', '', v.naam));
    b.addEventListener('click', () => {
      alleenVak = alleenVak === v.vak ? null : v.vak;
      // Een aangetikt toestel van een vak dat nu verdwijnt: de uitleg dicht.
      if (gekozen && alleenVak && t.dingen[gekozen]?.vak !== alleenVak) toonInfo(null);
      teken();
    });
    return b;
  }));
  const zichtbaar = alleenVak ? vakkenHier.filter((v) => v.vak === alleenVak) : vakkenHier;
  const leidingen = zichtbaar.flatMap((v) => v.leidingen).filter((l) => namenHier.has(l.naam));
  const detail: HTMLElement[] = [];
  if (leidingen.length) {
    const p = maak('p', 'tleidingen');
    p.append(maak('span', 'klein', 'Leidingen:'));
    for (const l of leidingen) {
      const x = maak('span');
      x.append(stip(l.kleur, 'lijn'), document.createTextNode(l.naam));
      p.append(x);
    }
    detail.push(p);
  }
  const een = alleenVak ? zichtbaar[0] : undefined;
  const klein = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);
  const toestellenHier = een?.toestellen.filter((x) => namenHier.has(x)) ?? [];
  detail.push(maak('p', 'klein', een
    ? `${een.uitleg}${toestellenHier.length ? ` Hier: ${toestellenHier.map(klein).join(', ')}.` : ''} Tik nog eens op ${een.naam} om alles te zien.`
    : 'Tik op een vak om alleen dat te zien. De toestellen staan in de kleur van hun vak, met een schijf op de vloer.'));
  $('#techniek-detail').replaceChildren(...detail);
  $('#techniek-voorbehoud').textContent = t.voorbehoud ?? '';
}

/** De verdiepingen met techniek als knoppen (alleen te zien als er meer dan één is). */
function zetTechniekNiveaus(p: Pakket3D) {
  const n = p.techniek?.niveaus ?? [];
  if (techniekNiveau >= n.length) techniekNiveau = 0;
  $('#techniek-niveaus').replaceChildren(...n.map((x, i) => {
    const b = maak('button', '', x.naam);
    b.type = 'button';
    b.dataset.niveau = String(i);
    b.setAttribute('aria-pressed', String(i === techniekNiveau));
    b.addEventListener('click', () => {
      techniekNiveau = i;
      for (const k of document.querySelectorAll<HTMLButtonElement>('#techniek-niveaus button')) k.setAttribute('aria-pressed', String(k === b));
      toonInfo(null);
      teken();
    });
    return b;
  }));
}

/** De woning of de techniek. */
function kiesModus(m: 'ontwerp' | 'techniek') {
  if (m === modus) return;
  modus = m;
  toonInfo(null);
  teken();
  // Terug in de woning: de posten die openstaan weer aangeduid.
  if (m === 'ontwerp') markeerOpen();
}

/**
 * De uitleg van een aangetikt toestel of een leiding, over de 3D (links onderaan): de naam met de kleur van het vak, wat
 * het is, waar het zit, en de post waar het bij hoort (met een knop naar die post in de lijst). Niets = dicht.
 */
function toonInfo(ding: string | null) {
  const info = $('#techniek-info');
  const t = pakket?.techniek, d = ding ? t?.dingen[ding] : undefined;
  gekozen = d && ding ? ding : null;
  // Oranje aangeduid (zoals de delen van een post): het dunne kader rond een klein toestel zag je op een hele verdieping niet.
  viewer?.markeer?.(gekozen ? `~${gekozen}.` : null);
  if (!d || !t || !gekozen) { info.hidden = true; info.replaceChildren(); return; }
  const id = gekozen;
  const vak = t.vakken.find((v) => v.vak === d.vak);
  const kop = maak('div', 'kop');
  kop.append(stip(vak?.kleur ?? '#777777'), maak('strong', '', d.naam));
  const sluit = maak('button', 'sluit', '×');
  sluit.type = 'button';
  sluit.setAttribute('aria-label', 'Sluiten');
  sluit.addEventListener('click', () => toonInfo(null));
  const delen: HTMLElement[] = [kop, sluit];
  if (vak) delen.push(maak('p', 'klein', vak.naam));
  if (d.uitleg) delen.push(maak('p', '', d.uitleg));
  if (d.waar) delen.push(maak('p', 'klein', d.waar));
  const i = pakket?.posten?.findIndex((x) => x.dingen?.includes(id)) ?? -1;
  const post = i >= 0 ? pakket?.posten?.[i] : undefined;
  if (post) {
    const rij = maak('div', 'post');
    rij.append(maak('span', 'klein', `Hoort bij: ${post.groep} · ${post.titel}`));
    const naar = maak('button', '', 'Toon in de lijst');
    naar.type = 'button';
    naar.dataset.naarPost = String(i);
    naar.addEventListener('click', () => {
      const lijst = [...document.querySelectorAll<HTMLDetailsElement>('#werklijst details')];
      for (const x of lijst) x.open = x.dataset.post === String(i);
      lijst.find((x) => x.open)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    rij.append(naar);
    delen.push(rij);
  }
  info.replaceChildren(...delen);
  info.hidden = false;
}

// ---------- de posten van het werk (ronde 11) ----------

/**
 * De delen van een post aanduiden in de 3D (één kader rond alle blokken), alleen bij de woning: de blokken die de post
 * zelf noemt (`markeer`, bv. het platte dak van de uitbouw en niet het dak van de bestaande woning), anders zijn dingen.
 */
function markeerPost(x: { dingen?: string[]; markeer?: string[] } | undefined) {
  if (!viewer || !woningNu()) return;
  const voor = x?.markeer?.length ? x.markeer : (x?.dingen ?? []).map((d) => `${d}.`);
  viewer.markeer?.(voor.length ? `~${voor.join(',')}` : null);
}

/** Duidt de delen aan van alle posten die openstaan (of niets). */
function markeerOpen() {
  const open = [...document.querySelectorAll<HTMLDetailsElement>('#werklijst details[open]')].map((d) => pakket?.posten?.[Number(d.dataset.post)]).filter((x) => !!x);
  markeerPost(open.length ? { markeer: [...new Set(open.flatMap((x) => x!.markeer ?? (x!.dingen ?? []).map((d) => `${d}.`)))] } : undefined);
}

/** De lijst van de posten van het ontwerp (dicht tot je er een openklapt), of niets als het pakket er geen heeft. */
function toonPosten(p: Pakket3D) {
  const lijst = $('#werklijst');
  const posten = p.posten ?? [];
  $('#werk').hidden = !posten.length;
  // Tikken in de 3D opent alleen bij een woning de posten van dat onderdeel (doorloop B25: één raam zei "tik op het dak").
  $('#werk .klein').textContent = p.woning.length
    ? 'Tik op een onderdeel voor de uitleg, of tik in de 3D op het dak, een gevel of een raam.'
    : 'Tik op een onderdeel voor de uitleg.';
  lijst.replaceChildren();
  let groep = '';
  for (const [i, x] of posten.entries()) {
    if (x.groep !== groep) {
      groep = x.groep;
      const h = document.createElement('h3');
      h.textContent = groep;
      lijst.append(h);
    }
    const d = document.createElement('details');
    d.dataset.post = String(i);
    const s = document.createElement('summary');
    const t = document.createElement('strong');
    t.textContent = x.titel;
    s.append(t);
    if (x.aantal !== undefined) {
      const a = document.createElement('span');
      a.textContent = `${x.aantal} ${x.aantal === 1 ? 'stuk' : 'stuks'}`;
      s.append(a);
    }
    const ul = document.createElement('ul');
    for (const r of x.detail) {
      const li = document.createElement('li');
      li.textContent = r;
      ul.append(li);
    }
    d.append(s, ul);
    // Aangeduid: de delen van alle posten die openstaan (ook na een tik in de 3D, die er meer tegelijk opent).
    d.addEventListener('toggle', markeerOpen);
    lijst.append(d);
  }
}

/**
 * Tik in de 3D: een toestel of leiding toont zijn uitleg (in de techniek, en in de woning een toestel dat je buiten ziet);
 * een ander ding van de woning opent de posten van dat ding (de rest dicht) en duidt het aan.
 */
function tikOpDing(ding: string | null) {
  if (!pakket) return;
  if (ding && pakket.techniek?.dingen[ding] && (techniekNu() || woningNu())) { toonInfo(ding); return; }
  if (gekozen) toonInfo(null);
  if (!pakket.posten?.length || !woningNu()) return;
  const deze = new Set(pakket.posten.flatMap((x, i) => (ding && x.dingen?.includes(ding) ? [String(i)] : [])));
  const lijst = [...document.querySelectorAll<HTMLDetailsElement>('#werklijst details')];
  for (const d of lijst) d.open = deze.has(d.dataset.post ?? '');
  // De delen van die posten aanduiden (bv. alleen het platte dak van de uitbouw, niet het dak van de bestaande woning).
  markeerOpen();
  lijst.find((d) => d.open)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/** Datum van het ontwerp in gewone taal ("16 november 2026"), of leeg. */
function datumTekst(d?: string): string {
  if (!d || !/^\d{4}-\d{2}-\d{2}/.test(d)) return '';
  const x = new Date(`${d.slice(0, 10)}T12:00:00`);
  return Number.isNaN(x.getTime()) ? '' : x.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Kop van de pagina: project, datum, nummer en klant, en de naam van de aannemer. */
function zetKop(p: Pakket3D) {
  $('#titel').textContent = p.project.naam || '3D-kijker';
  const datum = datumTekst(p.project.datum);
  $('#ondertitel').textContent = [datum ? `Ontwerp van ${datum}` : '', p.project.nummer, p.project.klant].filter(Boolean).join(' · ');
  $('#aannemer').textContent = p.project.aannemer ?? '';
  $('#aannemer').hidden = !p.project.aannemer;
  document.title = `3D · ${p.project.naam || p.project.nummer || 'bouw'}`;
}

/** Toont een ander ontwerp (variant): wat je bekeek (de woning of een raam, de verdieping) blijft, als het er ook is. */
function kiesVariant(i: number) {
  const p = alle[i];
  if (!p) return;
  const vorigeKeuze = pakket ? $<HTMLSelectElement>('#keuze').value : '';
  const vorigNiveau = pakket ? $<HTMLSelectElement>('#niveau').value : '';
  const helemaal = !pakket || Number(vorigNiveau) === pakket.woning.length - 1;
  pakket = p;
  zetKop(p);
  toonPosten(p);
  // De techniek van dit ontwerp (ronde 10c): heeft het er geen, dan terug naar de woning.
  $('#weergave').hidden = !p.techniek;
  if (!p.techniek) modus = 'ontwerp';
  if (alleenVak && !p.techniek?.vakken.some((v) => v.vak === alleenVak)) alleenVak = null;
  zetTechniekNiveaus(p);
  toonInfo(null);
  for (const [j, b] of [...document.querySelectorAll<HTMLButtonElement>('#variantknoppen button')].entries()) b.setAttribute('aria-pressed', String(j === i));
  const keuze = $<HTMLSelectElement>('#keuze');
  keuze.replaceChildren(
    ...(p.woning.length ? [new Option('De woning', 'woning')] : []),
    ...p.posities.map((x) => new Option(`${x.code} · ${x.naam}`, x.code)),
  );
  if ([...keuze.options].some((o) => o.value === vorigeKeuze)) keuze.value = vorigeKeuze;
  const niveau = $<HTMLSelectElement>('#niveau');
  niveau.replaceChildren(...p.woning.map((n, k) => new Option(k === p.woning.length - 1 && k > 0 ? `${n.naam} (hele woning)` : n.naam, String(k))));
  niveau.value = !helemaal && Number(vorigNiveau) < p.woning.length - 1 ? vorigNiveau : String(Math.max(0, p.woning.length - 1));
  teken();
}

function toon(bron: unknown) {
  let gelezen: Pakket3D;
  try {
    gelezen = leesPakket3D(bron);
  } catch (e) {
    fout(e instanceof Error ? e.message : String(e));
    return;
  }
  $('#fout').hidden = true;
  alle = [gelezen, ...(gelezen.varianten ?? [])];
  pakket = null;
  // Varianten: één knop per ontwerp, met wat het anders maakt; de klant wisselt ertussen.
  $('#variantknoppen').replaceChildren(...alle.map((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'variantknop';
    b.title = p.variant?.naam || p.project.naam;
    const naam = document.createElement('strong');
    naam.textContent = `Variant ${i + 1}`;
    const verschil = document.createElement('span');
    verschil.textContent = (p.variant?.verschil ?? []).join(' · ') || p.project.naam;
    b.append(naam, verschil);
    b.addEventListener('click', () => kiesVariant(i));
    return b;
  }));
  $('#varianten').hidden = alle.length < 2;
  $<HTMLInputElement>('#laag').checked = false;
  getoond = '';
  $('#leeg').hidden = true;
  $('#balk').hidden = false;
  $('#drie-d').hidden = false;
  $('#voorbehoud').hidden = !klantbestand;
  kiesVariant(0);
  naarPagina({ bericht: 'getoond', project: gelezen.project.nummer });
}

function leesBestand(f: File | undefined) {
  if (!f) return;
  f.text().then(toon, () => fout('Dit bestand kon niet gelezen worden.'));
}

function huisstijl(h: { accent?: string; achtergrond?: string; opAccent?: string }) {
  const kleur = (k: unknown) => (typeof k === 'string' && /^#[0-9a-f]{3,8}$/i.test(k) ? k : null);
  const stijl = document.documentElement.style;
  if (kleur(h.accent)) stijl.setProperty('--accent', h.accent!);
  if (kleur(h.achtergrond)) stijl.setProperty('--achtergrond', h.achtergrond!);
  if (kleur(h.opAccent)) stijl.setProperty('--op-accent', h.opAccent!);
}

window.addEventListener('message', (e) => {
  if (oorsprong && e.origin !== oorsprong) return;
  const d = e.data as { soort?: string; vraag?: string; huisstijl?: object } | null;
  if (!d || typeof d !== 'object') return;
  // Het bestand voor de klant toont alleen zijn eigen pakket.
  if (d.soort === 'bouw-3d-pakket' && !klantbestand) toon(d);
  if (d.soort !== 'bouw-kijker') return;
  if (d.huisstijl) huisstijl(d.huisstijl);
  if (d.vraag === 'beeld') naarPagina({ bericht: 'beeld', png: viewer?.beeld?.() ?? null });
});

$('#keuze').addEventListener('change', teken);
for (const b of document.querySelectorAll<HTMLButtonElement>('#weergave button')) b.addEventListener('click', () => kiesModus(b.dataset.weergave === 'techniek' ? 'techniek' : 'ontwerp'));
$('#niveau').addEventListener('change', teken);
$('#laag').addEventListener('change', teken);
$('#maten').addEventListener('change', teken);
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-standpunt]')) b.addEventListener('click', () => viewer?.standpunt(b.dataset.standpunt as 'schuin'));
$('#bewaar').addEventListener('click', () => {
  const png = viewer?.beeld?.();
  if (!png) return;
  const a = document.createElement('a');
  a.href = png;
  a.download = `3D ${pakket?.project.nummer || 'bouw'}.png`;
  a.click();
});
window.addEventListener('resize', () => { if (!viewer) return; pasMaatAan(); viewer.formaat(); });
huisstijl({ accent: adres.get('accent') ? `#${adres.get('accent')}` : undefined, achtergrond: adres.get('achtergrond') ? `#${adres.get('achtergrond')}` : undefined });
if (klantbestand) {
  // Het bestand voor de klant: alleen het pakket in de pagina, geen ander bestand kiezen of slepen, niets ophalen.
  document.body.classList.add('klantbestand');
  toon(ingesloten!.textContent);
} else {
  $('#ander').addEventListener('click', () => $<HTMLInputElement>('#bestand').click());
  $('#kies').addEventListener('click', () => $<HTMLInputElement>('#bestand').click());
  $<HTMLInputElement>('#bestand').addEventListener('change', (e) => leesBestand((e.target as HTMLInputElement).files?.[0]));
  const leeg = $('#leeg');
  for (const soort of ['dragenter', 'dragover'] as const) document.addEventListener(soort, (e) => { e.preventDefault(); leeg.classList.add('sleep'); });
  document.addEventListener('dragleave', () => leeg.classList.remove('sleep'));
  document.addEventListener('drop', (e) => { e.preventDefault(); leeg.classList.remove('sleep'); leesBestand(e.dataTransfer?.files?.[0]); });
  // Pakket uit het adres van de pagina.
  const bron = adres.get('pakket');
  if (bron) fetch(bron).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status))))).then(toon, () => fout('Het 3D-pakket kon niet opgehaald worden.'));
}
naarPagina({ bericht: 'klaar', versie: PAKKET3D_VERSIE });
