/**
 * Gedeelde basis van het 3D-gereedschap (modelbeelden, controleblad, lichtmeting, toestelcontrole).
 *
 * Het gereedschap draait op de werkbankpagina (packages/werkbank-web → dist/werkbank.html): één pagina die elke bron
 * (zetels, inrichting, ramen, woning, ijkblok …) in 3D toont, met dezelfde weergave als de demo's. Het vraagt de pagina
 * een item te tonen, wacht tot zij meldt dat het beeld af is en neemt het beeld. Geen knoppen aanklikken en geen vaste
 * wachttijden: een knop die verhuist breekt niets, en een beeld is er zodra het af is.
 *
 * Drie wegen om te rekenen (keuze met --weg):
 *   snel     WebGL2 met de Mesa-softwarerenderer (llvmpipe) op een virtueel scherm: 3 tot 7 keer sneller dan swiftshader.
 *   webgl2   WebGL2 met swiftshader: de weg van de beeldvergelijking (npm run beelden), overal beschikbaar.
 *   webgpu   WebGPU (swiftshader als adapter) op een virtueel scherm: de weg van de M5 in de toonzaal, om na te gaan dat
 *            die hetzelfde beeld geeft als de terugval.
 * Zonder --weg: snel als het kan, anders webgl2.
 *
 * Beelden worden bewaard per vingerafdruk (werkbank/cache): wat sinds de vorige keer niet veranderd is (zelfde scène,
 * zelfde instellingen, zelfde weergave), wordt niet opnieuw getekend. Met --vers alles opnieuw.
 */
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PAGINA = path.join(ROOT, 'packages/werkbank-web/dist/werkbank.html');
/** Map voor alles wat het gereedschap maakt (niet in git). */
export const WERKBANK = path.join(ROOT, 'werkbank');
const CACHE = path.join(WERKBANK, 'cache');

/** Leest "--naam waarde" en "--vlag" uit de opdrachtregel. */
export function leesOpties(argv = process.argv.slice(2)) {
  const uit = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const naam = argv[i].slice(2), volgende = argv[i + 1];
    if (volgende === undefined || volgende.startsWith('--')) uit[naam] = true;
    else { uit[naam] = volgende; i++; }
  }
  return uit;
}
export const lijst = (waarde) => (typeof waarde === 'string' ? waarde.split(',').map((x) => x.trim()).filter(Boolean) : []);
export const naamVoorBestand = (tekst) => String(tekst).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Bouwt de werkbankpagina (tenzij --zonder-bouw). */
export function bouwWerkbank(opties = {}) {
  if (opties['zonder-bouw'] && existsSync(PAGINA)) return;
  process.stdout.write('Werkbank bouwen … ');
  execFileSync('npm', ['run', 'build', '-w', '@configurator/werkbank-web'], { cwd: ROOT, stdio: 'ignore' });
  console.log('klaar');
}

function laadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); } catch {
    console.error('Playwright niet gevonden. Installeer het met: npm install -D playwright');
    process.exit(2);
  }
}

// ---------- de wegen: hoe de browser rekent ----------
const SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export const WEGEN = {
  snel: { label: 'WebGL2 (Mesa llvmpipe)', scherm: true, start: { channel: 'chromium', headless: false, args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'] } },
  webgl2: { label: 'WebGL2 (swiftshader)', scherm: false, start: { args: SWIFTSHADER } },
  webgpu: { label: 'WebGPU (swiftshader)', scherm: true, start: { channel: 'chromium', headless: false, args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist'] } },
};
const heeft = (programma) => { try { execFileSync('which', [programma], { stdio: 'ignore' }); return true; } catch { return false; } };

/** Start een virtueel scherm (Xvfb) voor de wegen die een volledige browser nodig hebben. Geeft { display, stop }. */
async function startScherm() {
  if (!heeft('Xvfb')) return null;
  const nr = 80 + (process.pid % 900);
  const proces = spawn('Xvfb', [`:${nr}`, '-screen', '0', '1700x1300x24', '-nolisten', 'tcp'], { stdio: 'ignore' });
  for (let i = 0; i < 50 && !existsSync(`/tmp/.X11-unix/X${nr}`); i++) await new Promise((r) => setTimeout(r, 60));
  if (!existsSync(`/tmp/.X11-unix/X${nr}`)) { proces.kill(); return null; }
  const stop = () => { try { proces.kill(); } catch { /* al gestopt */ } };
  process.on('exit', stop);
  return { display: `:${nr}`, stop };
}

/**
 * Opent de werkbankpagina. `weg` = snel, webgl2 of webgpu (zie boven); zonder keuze snel als het kan.
 * Geeft { browser, pagina, fouten, weg, label, sluit }. Valt terug op webgl2 als de gevraagde weg hier niet werkt.
 */
export async function openWerkbank({ weg, hoogte = 1250, los = false } = {}) {
  const { chromium } = laadPlaywright();
  if (!existsSync(PAGINA)) bouwWerkbank();
  const gevraagd = weg && WEGEN[weg] ? weg : weg ? (console.error(`Onbekende weg "${weg}" (wel: ${Object.keys(WEGEN).join(', ')})`), process.exit(2)) : 'snel';
  const probeer = async (naam) => {
    const w = WEGEN[naam];
    const scherm = w.scherm ? await startScherm() : null;
    if (w.scherm && !scherm) throw new Error('geen virtueel scherm (Xvfb)');
    let browser;
    try {
      browser = await chromium.launch({ ...w.start, env: { ...process.env, ...(scherm ? { DISPLAY: scherm.display } : {}), LIBGL_ALWAYS_SOFTWARE: '1', GALLIUM_DRIVER: 'llvmpipe' } });
      const pagina = await browser.newPage({ viewport: { width: 1500, height: hoogte } });
      const fouten = [];
      pagina.on('pageerror', (e) => fouten.push(String(e).slice(0, 240)));
      pagina.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text().slice(0, 240)); });
      // `los`: de bouwweergave tekent elk onderdeel apart (om het samenvoegen te vergelijken, zie toestelcontrole).
      await pagina.goto('file://' + PAGINA + '?gereedschap' + (los ? '&los' : ''));
      await pagina.waitForFunction(() => window.__werkbank, null, { timeout: 30000 });
      // Proef: klopt de weg? (WebGPU kan ontbreken; llvmpipe kan terugvallen op swiftshader.)
      const proef = await pagina.evaluate(async () => {
        const eerste = window.__werkbank.items('ijk')[0].code;
        const uit = await window.__werkbank.toon('ijk', eerste, { kwaliteit: 'snel', breedte: 200 });
        const c = document.createElement('canvas').getContext('webgl2'), e = c?.getExtension('WEBGL_debug_renderer_info');
        return { weg: uit.info?.weg, renderer: c && e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : '' };
      });
      if (naam === 'webgpu' && proef.weg !== 'webgpu') throw new Error('de browser geeft hier geen WebGPU');
      if (naam === 'snel' && !/llvmpipe/i.test(proef.renderer)) throw new Error('de Mesa-renderer is hier niet beschikbaar');
      return { browser, pagina, fouten, weg: naam, label: w.label, sluit: async () => { await browser.close(); scherm?.stop(); } };
    } catch (fout) {
      await browser?.close().catch(() => {});
      scherm?.stop();
      throw fout;
    }
  };
  try { return await probeer(gevraagd); } catch (fout) {
    if (gevraagd === 'webgl2' || weg === 'webgpu') throw new Error(`De weg ${gevraagd} werkt hier niet: ${fout.message}`);
    if (weg) console.log(`Let op: de weg ${gevraagd} werkt hier niet (${String(fout.message).split('\n')[0]}); verder met webgl2.`);
    return probeer('webgl2');
  }
}

// ---------- de pagina bevragen ----------
export const leesBronnen = (pagina) => pagina.evaluate(() => window.__werkbank.bronnen());
export const leesItems = (pagina, bron) => pagina.evaluate((b) => window.__werkbank.items(b), bron);
export const leesReeksen = (pagina, bron, code) => pagina.evaluate(([b, c]) => window.__werkbank.reeksen(b, c), [bron, code]);
export const leesInstellingen = (pagina) => pagina.evaluate(() => window.__werkbank.instellingen());

/** De bron uit --bron (standaard zetels), met een duidelijke fout als ze niet bestaat. */
export async function kiesBron(pagina, code = 'zetels') {
  const bronnen = await leesBronnen(pagina);
  const bron = bronnen.find((b) => b.code === code);
  if (!bron) { console.error(`Bron "${code}" bestaat niet. Wel: ${bronnen.map((b) => `${b.code} (${b.titel}, ${b.aantal})`).join(', ')}`); process.exit(2); }
  return bron;
}
/** Kiest items op code, naam of groep (--items a,b en --groep …; --modellen en --familie werken ook); zonder keuze alle. */
export function kiesItems(alle, opties = {}) {
  const gevraagd = lijst(opties.items ?? opties.modellen).map((x) => x.toLowerCase());
  const groep = opties.groep ?? opties.familie;
  let uit = alle;
  if (typeof groep === 'string') uit = uit.filter((i) => i.groep.toLowerCase().startsWith(groep.toLowerCase()));
  if (gevraagd.length) {
    uit = uit.filter((i) => gevraagd.includes(i.code.toLowerCase()) || gevraagd.includes(i.naam.toLowerCase()));
    const mist = gevraagd.filter((g) => !alle.some((i) => i.code.toLowerCase() === g || i.naam.toLowerCase() === g));
    if (mist.length) { console.error(`Niet gevonden: ${mist.join(', ')}`); process.exit(2); }
  }
  return uit;
}

let bundel = '';
/** Vingerafdruk van de werkbankpagina zonder de foto's: verandert de weergave of een model, dan verandert ze mee. */
function bundelAfdruk() {
  if (!bundel) bundel = createHash('sha1').update(readFileSync(PAGINA, 'utf8').replace(/^window\.__FOTOS = .*$/m, '')).digest('hex').slice(0, 12);
  return bundel;
}

/**
 * Toont een item en neemt het beeld zodra het af is. `opties` zoals in de pagina: keuzes, decor, licht, kwaliteit, vormen,
 * kijk (naam van een standpunt of [hoek rond, hoek omhoog, afstand]), breedte, zon; plus type en jpeg (kwaliteit).
 * Geeft { beeld (Buffer), uitCache, ms, info, afdruk }. Met `vers` altijd opnieuw tekenen.
 */
export async function neemBeeld(werkbank, bron, code, opties = {}, { vers = false } = {}) {
  const { type = 'image/jpeg', jpeg = 0.86, ...toon } = opties;
  const afdruk = await werkbank.pagina.evaluate(([b, c, o]) => window.__werkbank.afdruk(b, c, o), [bron, code, toon]);
  const sleutel = createHash('sha1').update([afdruk, bundelAfdruk(), werkbank.weg, type, jpeg].join('|')).digest('hex').slice(0, 20);
  const bestand = path.join(CACHE, `${sleutel}.${type === 'image/png' ? 'png' : 'jpg'}`);
  if (!vers && existsSync(bestand)) return { beeld: readFileSync(bestand), uitCache: true, ms: 0, info: null, afdruk };
  const start = Date.now();
  const uit = await werkbank.pagina.evaluate(async ([b, c, o, t, q]) => {
    const r = await window.__werkbank.toon(b, c, o);
    return { info: r.info, url: window.__werkbank.beeld(t, q) };
  }, [bron, code, toon, type, jpeg]);
  const beeld = Buffer.from(uit.url.split(',')[1], 'base64');
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(bestand, beeld);
  return { beeld, uitCache: false, ms: Date.now() - start, info: uit.info, afdruk };
}

/** Eén regel voortgang: naam, en of het beeld nieuw getekend is of ongewijzigd uit de vorige ronde komt. */
export const voortgang = (naam, r) => console.log(`  ${naam.padEnd(34)} ${r.uitCache ? 'ongewijzigd' : `${(r.ms / 1000).toFixed(1)} s`}`);
