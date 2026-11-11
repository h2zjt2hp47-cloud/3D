/**
 * De 3D-werkbank: één pagina die elke bron (zie core/src/werkbank.ts) in 3D toont.
 *
 * Twee gebruikers:
 *  - het gereedschap in scripts/3d (controleblad, modelbeelden, lichtmeting, toestelcontrole) via `window.__werkbank`:
 *    een item tonen, wachten tot het beeld af is, het beeld nemen. Geen knoppen aanklikken, geen vaste wachttijden;
 *  - wie zelf door een collectie wil bladeren: bron kiezen, item aanklikken, standpunt, decor en licht kiezen.
 *
 * De pagina gebruikt dezelfde weergave (drie-d.ts) en dezelfde gegevens als de demo's: wat hier in beeld staat, is wat de
 * klant in de zeteldemo of de bouwdemo ziet.
 */
import { vingerafdruk, type Scene3D, type WerkbankBron, type WerkbankItem, type WerkbankReeks } from '../../core/src/index.js';
import { werkbankBronnen } from '../../core/voorbeelden/werkbank-bronnen.js';
import { DECORS, LICHTEN, maak3D, type DecorNaam, type Info3D, type Kwaliteit, type LichtNaam, type Viewer3D } from '../../demo-web/src/drie-d.js';

/** Vaste standpunten: hoek rond het onderwerp en hoek omhoog (radialen); de afstand volgt uit de maat. */
const STANDPUNTEN: Record<string, { label: string; hoekH: number; hoekV: number }> = {
  schuin: { label: 'Schuin', hoekH: 0.45, hoekV: 0.2 },
  voor: { label: 'Voor', hoekH: 0, hoekV: 0.08 },
  links: { label: 'Links', hoekH: -0.5, hoekV: 0.18 },
  rechts: { label: 'Rechts', hoekH: 0.5, hoekV: 0.18 },
  hoog: { label: 'Van hoog', hoekH: 0.4, hoekV: 0.55 },
  boven: { label: 'Boven', hoekH: 0.2, hoekV: 1.25 },
  achter: { label: 'Achter', hoekH: Math.PI - 0.5, hoekV: 0.25 },
};

export interface ToonOpties {
  /** Afwijkende keuzes voor dit item (groep → keuze), zie de reeksen van de bron. */
  keuzes?: Record<string, string>;
  decor?: string;
  licht?: string;
  kwaliteit?: Kwaliteit;
  vormen?: 'blokken' | 'zacht';
  /** Naam van een standpunt of [hoek rond, hoek omhoog, afstand in cm]. */
  kijk?: string | [number, number, number?];
  /** Breedte van het beeld in pixels (hoogte = 62 %); zonder breedte vult het beeld de pagina. */
  breedte?: number;
  /** Richting van het zonlicht in graden. */
  zon?: number;
}
type Vast = Required<Omit<ToonOpties, 'keuzes' | 'breedte' | 'kijk'>> & { keuzes: Record<string, string>; kijk: [number, number, number]; breedte: number };

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, tekst = '') => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (tekst) e.textContent = tekst;
  return e;
};
const bronVan = (code: string): WerkbankBron => {
  const b = werkbankBronnen.find((x) => x.code === code);
  if (!b) throw new Error(`Bron "${code}" bestaat niet (wel: ${werkbankBronnen.map((x) => x.code).join(', ')})`);
  return b;
};

// ---------- de weergave: één per soort (zetel, bouw), pas gemaakt als ze nodig is ----------
type Soort = WerkbankBron['weergave'];
const weergaven: Partial<Record<Soort, { viewer: Viewer3D; houder: HTMLElement; staat: Partial<Vast> }>> = {};
function weergaveVoor(soort: Soort) {
  for (const s of ['zetel', 'bouw'] as Soort[]) $(`#w-3d-${s}`).hidden = s !== soort;
  let w = weergaven[soort];
  if (!w) {
    const houder = $(`#w-3d-${soort}`);
    // Met ?los in het adres tekent de bouwweergave elk onderdeel apart (om het samenvoegen te kunnen vergelijken).
    // ?eenvoudig: de bouwweergave zoals ze tot 11/11 was (vlakke kleuren, harde schaduw), om te vergelijken.
    const viewer = maak3D(houder, soort === 'zetel' ? { zetel: true } : { samenvoegen: !location.search.includes('los'), eenvoudig: location.search.includes('eenvoudig') });
    if (!viewer) throw new Error('De 3D kan in deze browser niet starten (WebGPU en WebGL2 ontbreken).');
    w = weergaven[soort] = { viewer, houder, staat: {} };
  }
  return w;
}

/** De opties met alle standaardwaarden ingevuld: dezelfde vraag geeft altijd hetzelfde beeld. */
function vast(scene: Scene3D, o: ToonOpties = {}): Vast {
  const [h, v, a] = Array.isArray(o.kijk) ? o.kijk : (() => { const s = STANDPUNTEN[o.kijk ?? 'schuin'] ?? STANDPUNTEN.schuin!; return [s.hoekH, s.hoekV, undefined] as const; })();
  const afstand = a ?? Math.max(200, Math.max(scene.kader.b, scene.kader.d, 120) * 1.5);
  return {
    keuzes: o.keuzes ?? {}, decor: o.decor ?? 'studio', licht: o.licht ?? 'studio', kwaliteit: o.kwaliteit ?? 'mooi', vormen: o.vormen ?? 'blokken',
    kijk: [h, v, Math.round(afstand)], breedte: o.breedte ?? 0, zon: o.zon ?? 120,
  };
}

let getoond: { bron: string; code: string } | null = null;
/** Toont een item en wacht tot het beeld af is. */
async function toon(bronCode: string, code: string, opties: ToonOpties = {}): Promise<{ vingerafdruk: string; info: Info3D | null; kader: Scene3D['kader'] }> {
  const bron = bronVan(bronCode);
  const scene = bron.scene(code, opties.keuzes);
  const o = vast(scene, { ...opties, licht: opties.licht ?? bron.licht });
  const { viewer, houder, staat } = weergaveVoor(bron.weergave);
  if (staat.breedte !== o.breedte) { houder.style.width = o.breedte ? `${o.breedte}px` : ''; viewer.formaat(); }
  if (staat.kwaliteit !== o.kwaliteit) viewer.kwaliteit?.(o.kwaliteit);
  if (bron.weergave === 'zetel' && staat.decor !== o.decor) viewer.decor?.(o.decor as DecorNaam);
  if (staat.licht !== o.licht) viewer.licht?.(o.licht as LichtNaam);
  if (staat.vormen !== o.vormen || staat.zon !== o.zon) viewer.instellen?.({ vormen: o.vormen, zonRichting: o.zon });
  Object.assign(staat, o);
  viewer.toon(scene);
  viewer.kijk?.({ hoekH: o.kijk[0], hoekV: o.kijk[1], afstand: o.kijk[2] });
  await viewer.stil?.();
  getoond = { bron: bronCode, code };
  return { vingerafdruk: vingerafdruk({ scene, weergave: bron.weergave, o }), info: viewer.info?.() ?? null, kader: scene.kader };
}
/** De vingerafdruk van een beeld zonder het te tekenen: om te weten of het sinds de vorige ronde veranderd is. */
function afdruk(bronCode: string, code: string, opties: ToonOpties = {}): string {
  const bron = bronVan(bronCode);
  const scene = bron.scene(code, opties.keuzes);
  return vingerafdruk({ scene, weergave: bron.weergave, o: vast(scene, { ...opties, licht: opties.licht ?? bron.licht }) });
}
/** Het beeld dat nu getoond wordt, als data-URL. */
function beeld(type = 'image/jpeg', kwaliteit = 0.86): string {
  if (!getoond) throw new Error('Nog niets getoond');
  const url = weergaveVoor(bronVan(getoond.bron).weergave).viewer.beeld?.(type, kwaliteit);
  if (!url) throw new Error('Het beeld kon niet genomen worden');
  return url;
}

// ---------- meten: licht en toestel ----------
const lineair = (v: number) => Math.pow(v / 255, 2.2);
async function pixels(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  return { b: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
}
export interface LichtMeting { boven: number[]; voor: number[]; keerBoven: number; keerVoor: number; staal: string }
/**
 * Waar een punt van de scène in het beeld valt (0–1 van links en van boven). Volgt de camera van de weergave: ze kijkt
 * naar het midden van het kader (op 35 % van de hoogte, minstens 40 cm, hoogstens de helft) met een lens van 35 graden.
 */
function inBeeld(punt: [number, number, number], kader: Scene3D['kader'], kijk: [number, number, number]): [number, number] {
  const [h, v, afstand] = kijk;
  const mik = [kader.x + kader.b / 2, Math.min(Math.max(40, kader.h * 0.35), kader.h / 2), kader.z + kader.d / 2];
  const cam = [mik[0]! + afstand * Math.cos(v) * Math.sin(h), mik[1]! + afstand * Math.sin(v), mik[2]! + afstand * Math.cos(v) * Math.cos(h)];
  const min = (a: number[], b: number[]) => a.map((x, i) => x - b[i]!), dot = (a: number[], b: number[]) => a.reduce((t, x, i) => t + x * b[i]!, 0);
  const kruis = (a: number[], b: number[]) => [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
  const norm = (a: number[]) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
  const vooruit = norm(min(mik, cam)), rechts = norm(kruis(vooruit, [0, 1, 0])), omhoog = kruis(rechts, vooruit);
  const p = min(punt, cam), diepte = dot(p, vooruit), t = Math.tan((35 * Math.PI) / 360);
  return [0.5 + dot(p, rechts) / (diepte * t * (1 / 0.62)) / 2, 0.5 - dot(p, omhoog) / (diepte * t) / 2];
}
/**
 * Meet hoe helder de bovenkant en de voorkant van een item zijn tegenover zijn staalkleur (lineair licht, groen kanaal).
 * Schuin van voren en van boven bekeken (0,5 rad): een vlakje rond het midden van het bovenvlak en een rond het midden
 * van het voorvlak, berekend uit de maten van het item. Zo werkt de meting ook voor wit op een lichte achtergrond.
 */
async function meetLicht(bronCode: string, code: string, opties: ToonOpties = {}): Promise<LichtMeting | null> {
  const item = bronVan(bronCode).items().find((i) => i.code === code);
  if (!item?.kleur) throw new Error(`"${code}" heeft geen staalkleur om mee te vergelijken`);
  const k = bronVan(bronCode).scene(code).kader;
  const kijk: [number, number, number] = [0, 0.5, Math.round(Math.max(125, Math.max(k.b, k.d) * 1.25))];
  await toon(bronCode, code, { kwaliteit: 'snel', ...opties, kijk, breedte: 360 });
  const { b, h, d } = await pixels(beeld('image/png'));
  const vlak = (punt: [number, number, number]) => {
    const [u, w] = inBeeld(punt, k, kijk), x0 = Math.round(u * b), y0 = Math.round(w * h), uit = [0, 0, 0];
    if (x0 < 5 || y0 < 5 || x0 > b - 6 || y0 > h - 6) return null;
    for (let y = y0 - 4; y <= y0 + 4; y++) for (let x = x0 - 4; x <= x0 + 4; x++) for (let c = 0; c < 3; c++) uit[c]! += d[(y * b + x) * 4 + c]!;
    return uit.map((x) => x / 81);
  };
  // Iets achter het midden van het bovenvlak (weg van de afgeronde voorrand) en het midden van het voorvlak.
  const boven = vlak([k.x + k.b / 2, k.h, k.z + k.d * 0.45]), voor = vlak([k.x + k.b / 2, k.h * 0.5, k.z + k.d]);
  if (!boven || !voor) return null;
  const staal = lineair(parseInt(item.kleur.slice(3, 5), 16));
  return { boven, voor, keerBoven: lineair(boven[1]!) / staal, keerVoor: lineair(voor[1]!) / staal, staal: item.kleur };
}

export interface ToestelRapport { toestel: string; weg: string; regels: string[]; tekst: string }
/**
 * Toestelcontrole: meet op dit toestel wat we in de cloud niet kunnen zien. Welke weg (WebGPU of WebGL2), hoe lang een
 * beeld duurt (snel en mooi), of het geheugen stabiel blijft bij herhaald opbouwen, en of het licht binnen de band valt.
 */
async function toestelcontrole(opVoortgang?: (tekst: string) => void): Promise<ToestelRapport> {
  const regels: string[] = [];
  const meld = (t: string) => { regels.push(t); opVoortgang?.(t); };
  const tijd = async (f: () => Promise<unknown> | unknown) => { const s = performance.now(); await f(); return performance.now() - s; };
  const ms = (t: number) => `${t < 10 ? t.toFixed(1) : Math.round(t)} ms`;
  const proeven: [string, string, string][] = [['zetels', 'kotor', 'Hoeksofa (Kotor)'], ['zetels', 'doha', 'Doorlopende zetel (Doha)'], ['woning', 'woning', 'Voorbeeldwoning'], ['ramen', 'P4', 'Raam met twee vleugels']];
  let weg = '?';
  for (const [bron, code, naam] of proeven) {
    if (!bronVan(bron).items().some((i) => i.code === code)) continue;
    const eerste = await tijd(() => toon(bron, code, { kwaliteit: 'mooi', breedte: 900 }));
    const info = weergaveVoor(bronVan(bron).weergave).viewer.info?.();
    weg = info?.weg ?? weg;
    // Tijd per beeld terwijl de camera een fractie draait (zoals bij slepen): anders tekent de nabewerking de scène niet opnieuw.
    const per = async (k: Kwaliteit) => {
      await toon(bron, code, { kwaliteit: k, breedte: 900 });
      const viewer = weergaveVoor(bronVan(bron).weergave).viewer, t: number[] = [];
      for (let i = 0; i < 7; i++) { viewer.kijk?.({ hoekH: STANDPUNTEN.schuin!.hoekH + (i % 2 ? 0.02 : -0.02) }); t.push(await tijd(() => { beeld('image/jpeg', 0.5); })); }
      return t.sort((a, b) => a - b)[3]!;
    };
    const mooi = await per('mooi'), snel = await per('snel');
    meld(`${naam}: opbouwen ${ms(eerste)} · beeld mooi ${ms(mooi)} · snel ${ms(snel)} · ${info?.tekenbeurten ?? '?'} tekenbeurten, ${Math.round((info?.driehoeken ?? 0) / 1000)} k driehoeken`);
  }
  // Geheugen: twaalf keer hetzelfde opbouwen mag het aantal geometrieën en texturen niet laten oplopen.
  await toon('zetels', 'kotor', { kwaliteit: 'snel', breedte: 600 });
  const voor = weergaveVoor('zetel').viewer.info?.();
  for (let i = 0; i < 12; i++) await toon('zetels', i % 2 ? 'kotor' : 'pebble', { kwaliteit: 'snel', breedte: 600 });
  await toon('zetels', 'kotor', { kwaliteit: 'snel', breedte: 600 });
  const na = weergaveVoor('zetel').viewer.info?.();
  if (voor && na) meld(`Geheugen na 12 keer opbouwen: geometrieën ${voor.geometrieen} → ${na.geometrieen}, texturen ${voor.texturen} → ${na.texturen} (${na.geometrieen <= voor.geometrieen + 2 && na.texturen <= voor.texturen + 6 ? 'stabiel' : 'loopt op: lek'})`);
  for (const [bron, licht] of [['ijk', 'studio'], ['ijk', 'daglicht'], ['ijk-bouw', 'studio']] as const) {
    const m = await meetLicht(bron, bron === 'ijk' ? 'stof_grijs' : 'gevel_grijs', { licht });
    meld(m ? `Licht ${bron === 'ijk' ? 'zetel' : 'bouw'}, ${LICHTEN[licht].label}: bovenkant ${m.keerBoven.toFixed(2)} ×, voorkant ${m.keerVoor.toFixed(2)} × de staal` : `Licht ${bron}, ${licht}: niet gemeten`);
  }
  const toestel = `${navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 110)} · scherm ${screen.width} × ${screen.height} (× ${window.devicePixelRatio})`;
  const kop = `Toestelcontrole 3D · ${new Date().toLocaleString('nl-BE')}\nToestel: ${toestel}\nWeg: ${weg === 'webgpu' ? 'WebGPU' : weg === 'webgl2' ? 'WebGL2 (terugval)' : weg}`;
  return { toestel, weg, regels, tekst: [kop, ...regels].join('\n') };
}

// ---------- voor het gereedschap ----------
const api = {
  versie: 1,
  bronnen: () => werkbankBronnen.map((b) => ({ code: b.code, titel: b.titel, uitleg: b.uitleg, weergave: b.weergave, fotomap: b.fotomap ?? null, aantal: b.items().length })),
  items: (bron: string): WerkbankItem[] => bronVan(bron).items(),
  reeksen: (bron: string, code: string): WerkbankReeks[] => bronVan(bron).reeksen?.(code) ?? [],
  instellingen: () => ({
    standpunten: Object.entries(STANDPUNTEN).map(([waarde, s]) => ({ waarde, label: s.label })),
    decors: Object.entries(DECORS).map(([waarde, d]) => ({ waarde, label: d.label })),
    lichten: Object.entries(LICHTEN).map(([waarde, l]) => ({ waarde, label: l.label })),
    kwaliteiten: [{ waarde: 'mooi', label: 'Mooi' }, { waarde: 'snel', label: 'Snel' }],
    vormen: [{ waarde: 'blokken', label: 'Blokken' }, { waarde: 'zacht', label: 'Zacht' }],
  }),
  toon, afdruk, beeld, meetLicht, toestelcontrole,
};
export type WerkbankApi = typeof api;
(window as unknown as { __werkbank: WerkbankApi }).__werkbank = api;

// ---------- de pagina zelf: bladeren door een bron ----------
const fotos = (window as unknown as { __FOTOS?: Record<string, string> }).__FOTOS ?? {};
const keuze: { bron: string; code: string; kijk: string; decor: string; licht: string; kwaliteit: Kwaliteit; reeks: string; reekskeuze: string } =
  { bron: werkbankBronnen[0]!.code, code: '', kijk: 'schuin', decor: 'studio', licht: 'studio', kwaliteit: 'mooi', reeks: '', reekskeuze: '' };

function vulLijst(sel: HTMLSelectElement, opties: { waarde: string; label: string }[], gekozen: string) {
  sel.replaceChildren(...opties.map((o) => { const e = el('option', { value: o.waarde }, o.label); e.selected = o.waarde === gekozen; return e; }));
}
async function toonGekozen() {
  const status = $('#w-status');
  try {
    status.textContent = 'Bezig …';
    const s = performance.now();
    const keuzes = keuze.reeks && keuze.reekskeuze ? { [keuze.reeks]: keuze.reekskeuze } : undefined;
    const uit = await toon(keuze.bron, keuze.code, { kijk: keuze.kijk, decor: keuze.decor, licht: keuze.licht, kwaliteit: keuze.kwaliteit, keuzes });
    status.textContent = `${uit.info?.weg === 'webgpu' ? 'WebGPU' : 'WebGL2'} · ${uit.info?.tekenbeurten ?? '?'} tekenbeurten · ${Math.round((uit.info?.driehoeken ?? 0) / 1000)} k driehoeken · ${Math.round(performance.now() - s)} ms`;
  } catch (fout) {
    status.textContent = `Fout: ${String((fout as Error)?.message ?? fout)}`;
  }
}
function toonItem() {
  const bron = bronVan(keuze.bron), item = bron.items().find((i) => i.code === keuze.code);
  if (!item) return;
  $('#w-naam').textContent = item.naam;
  $('#w-omschrijving').textContent = [item.omschrijving, item.bron ? `Bron: ${item.bron}` : ''].filter(Boolean).join(' · ');
  $('#w-feiten').replaceChildren(...item.feiten.flatMap(([l, w]) => [el('dt', {}, l), el('dd', {}, w)]));
  const foto = item.foto ? fotos[item.foto] : undefined, fig = $('#w-foto');
  fig.hidden = !foto;
  if (foto) { (fig.querySelector('img') as HTMLImageElement).src = foto; fig.querySelector('figcaption')!.textContent = `${item.naam}: referentiefoto`; }
  const reeksen = bron.reeksen?.(item.code) ?? [];
  $('#w-reeksvak').hidden = !reeksen.length;
  if (!reeksen.some((r) => r.groep === keuze.reeks)) { keuze.reeks = ''; keuze.reekskeuze = ''; }
  vulLijst($('#w-reeks'), [{ waarde: '', label: 'Zoals het model' }, ...reeksen.map((r) => ({ waarde: r.groep, label: r.label }))], keuze.reeks);
  const r = reeksen.find((x) => x.groep === keuze.reeks);
  $('#w-reekskeuze').hidden = !r;
  if (r) { if (!r.keuzes.some((k) => k.code === keuze.reekskeuze)) keuze.reekskeuze = r.keuzes[0]!.code; vulLijst($('#w-reekskeuze'), r.keuzes.map((k) => ({ waarde: k.code, label: k.label })), keuze.reekskeuze); }
  for (const k of document.querySelectorAll<HTMLButtonElement>('#w-items button')) k.setAttribute('aria-current', String(k.dataset.code === keuze.code));
  void toonGekozen();
}
function toonBron() {
  const bron = bronVan(keuze.bron), zoek = ($('#w-zoek') as HTMLInputElement).value.trim().toLowerCase();
  $('#w-uitleg').textContent = bron.uitleg;
  $('#w-decorvak').hidden = bron.weergave !== 'zetel';
  const items = bron.items().filter((i) => !zoek || `${i.naam} ${i.groep}`.toLowerCase().includes(zoek));
  const lijst = $('#w-items');
  lijst.replaceChildren();
  let groep = '';
  for (const i of items) {
    if (i.groep !== groep) { groep = i.groep; lijst.append(el('h3', {}, groep)); }
    const k = el('button', { type: 'button', 'data-code': i.code }, i.naam);
    k.addEventListener('click', () => { keuze.code = i.code; toonItem(); });
    lijst.append(k);
  }
  if (!items.some((i) => i.code === keuze.code)) keuze.code = items[0]?.code ?? '';
  if (keuze.code) toonItem();
}
function start() {
  if (!document.querySelector('#w-bron')) return;
  const inst = api.instellingen();
  vulLijst($('#w-bron'), werkbankBronnen.map((b) => ({ waarde: b.code, label: `${b.titel} (${b.items().length})` })), keuze.bron);
  vulLijst($('#w-decor'), inst.decors, keuze.decor);
  vulLijst($('#w-licht'), inst.lichten, keuze.licht);
  vulLijst($('#w-kwaliteit'), inst.kwaliteiten, keuze.kwaliteit);
  const standen = $('#w-standpunten');
  for (const s of inst.standpunten) {
    const k = el('button', { type: 'button', 'data-kijk': s.waarde, 'aria-pressed': String(s.waarde === keuze.kijk) }, s.label);
    k.addEventListener('click', () => { keuze.kijk = s.waarde; for (const x of standen.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === k)); void toonGekozen(); });
    standen.append(k);
  }
  const bij = (sel: string, zet: (waarde: string) => void, daarna: () => void) => $(sel).addEventListener('change', (ev) => { zet((ev.target as HTMLSelectElement).value); daarna(); });
  bij('#w-bron', (w) => { keuze.bron = w; keuze.code = ''; }, toonBron);
  bij('#w-decor', (w) => { keuze.decor = w; }, () => void toonGekozen());
  bij('#w-licht', (w) => { keuze.licht = w; }, () => void toonGekozen());
  bij('#w-kwaliteit', (w) => { keuze.kwaliteit = w as Kwaliteit; }, () => void toonGekozen());
  bij('#w-reeks', (w) => { keuze.reeks = w; keuze.reekskeuze = ''; }, toonItem);
  bij('#w-reekskeuze', (w) => { keuze.reekskeuze = w; }, () => void toonGekozen());
  $('#w-zoek').addEventListener('input', toonBron);
  const rapport = $('#w-rapport'), kopieer = $<HTMLButtonElement>('#w-kopieer'), knop = $<HTMLButtonElement>('#w-toestel');
  knop.addEventListener('click', async () => {
    knop.disabled = true;
    rapport.hidden = false;
    rapport.textContent = 'De controle loopt (ongeveer een halve minuut) …\n';
    try {
      const uit = await toestelcontrole((t) => { rapport.textContent += `${t}\n`; });
      rapport.textContent = uit.tekst;
      kopieer.hidden = false;
    } catch (fout) {
      rapport.textContent += `\nDe controle is gestopt: ${String((fout as Error)?.message ?? fout)}`;
    }
    knop.disabled = false;
    void toonGekozen();
  });
  kopieer.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(rapport.textContent ?? ''); kopieer.textContent = 'Gekopieerd'; }
    catch { const r = document.createRange(); r.selectNodeContents(rapport); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); kopieer.textContent = 'Geselecteerd: kopieer met Ctrl+C'; }
  });
  // Het gereedschap opent de pagina met ?gereedschap: dan niets vooraf tonen (het vraagt zelf wat het nodig heeft).
  if (!location.search.includes('gereedschap')) toonBron();
}
start();
