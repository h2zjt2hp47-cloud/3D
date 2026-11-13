#!/usr/bin/env node
/**
 * Beeldvergelijking van de 3D (zeteldemo en bouwdemo).
 *
 * Maakt een vaste reeks beelden van de gebouwde pagina's (dist/) en vergelijkt ze pixel per pixel met de
 * referentiebeelden in `beeldtest/referentie/`. Zo valt een achteruitgang op (een schaduw die verdwijnt, een onderdeel
 * dat verschuift, een fout bij het tekenen) voor ze bij de klant komt.
 *
 * Wat het NIET doet: fouten vinden die er al waren (de referentie is gewoon het vorige beeld), en beelden van de M5
 * (WebGPU) nabootsen. Het draait in Chromium zonder grafische kaart (swiftshader, de WebGL2-weg), zoals in de cloud.
 *
 * Gebruik (in de root):
 *   npm run beelden                     bouwen, beelden maken en vergelijken
 *   npm run beelden -- --vernieuw       na een bewuste wijziging: de nieuwe beelden worden de referentie
 *   node scripts/beeldvergelijking.mjs --zonder-bouw [--alleen doha,kotor] [--vernieuw]
 *
 * Uitslag in `beeldtest/uitslag/` (niet in git): per beeld het nieuwe beeld en, als het verschilt, een strook
 * referentie | nu | verschil (rood = anders). Afsluitcode 1 als een beeld te veel verschilt of de pagina een fout gaf.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REFERENTIE = join(ROOT, 'beeldtest', 'referentie');
const UITSLAG = join(ROOT, 'beeldtest', 'uitslag');
const ZETEL = join(ROOT, 'packages', 'demo-web', 'dist', 'configurator-demo.html');
const BOUW = join(ROOT, 'packages', 'bouw-web', 'dist', 'bouw-configurator.html');

/**
 * Hoeveel een pixel mag afwijken (kleurverschil, 0–1) en welk deel van het beeld anders mag zijn. Dezelfde versie geeft
 * hier exact hetzelfde beeld (0,00 %), dus de grens mag laag: de vierkante voet onder een ronde poef was 0,21 %.
 * Na een update van Chromium kan alles een klein beetje verschuiven: dan de verschilbeelden nakijken en vernieuwen.
 */
const PIXELDREMPEL = 0.1;
const MAX_ANDERS = 0.0005; // 0,05 %

const args = process.argv.slice(2);
const vernieuw = args.includes('--vernieuw');
const zonderBouw = args.includes('--zonder-bouw');
const alleenIdx = args.indexOf('--alleen');
const alleen = alleenIdx >= 0 ? args[alleenIdx + 1].split(',') : null;

/**
 * De vaste reeks. Zetel: model, familie (filterknop), standpunt, decor, licht en eventueel de zonrichting.
 * Gekozen om de onderdelen te dekken die al eens stuk gingen: doorlopende zetel (Doha, Montego), hoeksofa met chaise
 * (Kotor), kuipfauteuil (Pebble), ronde poef (Stockholm), strakke arm (Husk), slagschaduw (Doha van boven, daglicht),
 * decor met raam en glas (Kotor in de woonkamer), en de woning en het raam in de bouwdemo.
 *
 * Met `uitsnede` [x0, y0, x1, y1] (delen van het beeld) is het een close-up: een stuk uit de foto op hoge resolutie
 * (`foto()`, 2400 px breed). Voor plekken die op het hele beeld te klein zijn om op te vallen (analyse van 13/11): de
 * naad tussen schaal en zitting van Pebble, het wanduiteinde van een kuipfauteuil (Ross), de arm van Zora.
 */
const ZETELBEELDEN = [
  { naam: 'doha-schuin', model: 'Doha', familie: "Sofa's", standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'doha-boven-daglicht', model: 'Doha', familie: "Sofa's", standpunt: 'boven', decor: 'studio', licht: 'daglicht', zon: 30 },
  { naam: 'montego-schuin', model: 'Montego', familie: "Sofa's", standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'kotor-schuin', model: 'Kotor', familie: "Sofa's", standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'kotor-woonkamer', model: 'Kotor', familie: "Sofa's", standpunt: 'schuin', decor: 'kamer', licht: 'daglicht' },
  { naam: 'husk-schuin', model: 'Husk', familie: "Sofa's", standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'pebble-schuin', model: 'Pebble', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'stockholm-schuin', model: 'Stockholm pouf', familie: 'Poufs', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  // Fauteuils met de opbouw van de klant (vaste ronde zitting, dunne schaal met bies, houten frame), sinds 13/11.
  { naam: 'milton-schuin', model: 'Milton', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'mabel2-schuin', model: 'Mabel 2-zit', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  // Vier schuine poten met een kruis en een zitting in twee lagen (Fraser).
  { naam: 'fraser-schuin', model: 'Fraser', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  // Trommel tot op de vloer, de schaal steekt errond uit, één los rugkussen tegen de rand (Satie).
  { naam: 'satie-schuin', model: 'Satie', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  // Vier losse kussens tegen de schaal: twee achteraan, twee schuin ervoor (Quin).
  { naam: 'quin-schuin', model: 'Quin', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  // Zwevende rugschijf boven een vaste zitting, op een houten frame (Karl).
  { naam: 'karl-schuin', model: 'Karl', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  // Dikke rug die op een bolle zitting staat, tot op de vloer (Tumble).
  { naam: 'tumble-schuin', model: 'Tumble', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'pebble-naad', model: 'Pebble', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', uitsnede: [0.42, 0.17, 0.57, 0.45] },
  { naam: 'ross-kop', model: 'Ross', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', uitsnede: [0.3, 0.3, 0.5, 0.82] },
  { naam: 'zora-arm', model: 'Zora zetelbed', familie: 'Zetelbedden', standpunt: 'schuin', decor: 'studio', licht: 'studio', uitsnede: [0.08, 0.28, 0.36, 0.88] },
];
const BOUWBEELDEN = [{ naam: 'bouw-woning' }, { naam: 'bouw-raam' }];

const nodig = (b) => !alleen || alleen.some((a) => b.naam.startsWith(a));

function laadPlaywright() {
  // Playwright staat in de cloudomgeving al klaar (ook buiten deze map); anders: npm install -D playwright.
  try { return createRequire(import.meta.url)('playwright'); } catch {
    console.error('Playwright niet gevonden. Installeer het met: npm install -D playwright');
    process.exit(2);
  }
}

/** Wacht tot het canvas twee keer na elkaar hetzelfde beeld geeft (de zachte vormen en het mooie beeld komen later). */
async function wachtTotStil(p, selector, maxMs = 40000) {
  const start = Date.now();
  let vorig = '';
  await p.waitForTimeout(1500);
  while (Date.now() - start < maxMs) {
    const nu = await p.evaluate((s) => document.querySelector(s)?.toDataURL('image/png') ?? '', selector);
    if (nu && nu === vorig) return nu;
    vorig = nu;
    await p.waitForTimeout(1500);
  }
  console.warn(`  (niet stil geworden binnen ${maxMs / 1000} s: laatste beeld genomen)`);
  return vorig;
}

async function zetSelect(p, selector, waarde) {
  if ((await p.locator(selector).inputValue()) !== waarde) await p.selectOption(selector, waarde);
}

async function maakBeelden() {
  const { chromium } = laadPlaywright();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const fouten = [];
  const beelden = new Map();
  const nieuwePagina = async (pad) => {
    const p = await browser.newPage({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 1 });
    p.on('pageerror', (e) => fouten.push(`${pad.split('/').pop()}: ${String(e).slice(0, 200)}`));
    p.on('console', (m) => {
      if (m.type() === 'error' && !/ERR_FAILED|fonts\.g/.test(m.text())) fouten.push(`${pad.split('/').pop()}: ${m.text().slice(0, 200)}`);
    });
    await p.route('https://fonts.googleapis.com/**', (r) => r.abort());
    return p;
  };

  const zetel = ZETELBEELDEN.filter(nodig);
  if (zetel.length) {
    const p = await nieuwePagina(ZETEL);
    await p.goto(`file://${ZETEL}#modellen`);
    await p.waitForTimeout(1000);
    let eerste = true;
    for (const b of zetel) {
      process.stdout.write(`  ${b.naam} … `);
      await p.click('[data-weergave="modellen"]');
      await p.locator('#modellen-filter button', { hasText: b.familie }).first().click();
      await p.locator('article').filter({ has: p.locator(`h2:text-is("${b.model}")`) }).first().locator('button:has-text("Kies en pas aan")').click();
      await p.waitForTimeout(800);
      if (await p.locator('#o-3d').isHidden()) await p.click('[data-o-weergave="3d"]');
      if (eerste) { await zetSelect(p, '#o-3d-kwaliteit', 'mooi'); eerste = false; }
      await zetSelect(p, '#o-3d-decor', b.decor);
      await zetSelect(p, '#o-3d-licht', b.licht);
      await p.evaluate((graden) => {
        const s = document.getElementById('o-3d-zon');
        if (!s) return;
        s.value = String(graden ?? s.defaultValue);
        s.dispatchEvent(new Event('input', { bubbles: true }));
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }, b.zon ?? null);
      await p.click(`[data-standpunt="${b.standpunt}"]`);
      const stil = await wachtTotStil(p, '#o-3d canvas');
      // Close-up: een stuk uit de foto op hoge resolutie.
      beelden.set(b.naam, b.uitsnede ? uitsnede(png(await p.evaluate(() => window.__zetel3d.foto())), b.uitsnede) : png(stil));
      console.log('klaar');
    }
    await p.close();
  }

  const bouw = BOUWBEELDEN.filter(nodig);
  if (bouw.length) {
    const p = await nieuwePagina(BOUW);
    await p.goto(`file://${BOUW}`);
    await p.waitForTimeout(1500);
    if (bouw.some((b) => b.naam === 'bouw-woning')) {
      process.stdout.write('  bouw-woning … ');
      await p.click('.nav [data-weergave="plan"]');
      await p.click('[data-pl-weergave="3d"]');
      beelden.set('bouw-woning', png(await wachtTotStil(p, '#pl-3d canvas')));
      console.log('klaar');
    }
    if (bouw.some((b) => b.naam === 'bouw-raam')) {
      process.stdout.write('  bouw-raam … ');
      await p.click('.nav [data-weergave="positie"]');
      await p.click('[data-p-weergave="3d"]');
      beelden.set('bouw-raam', png(await wachtTotStil(p, '#p-3d canvas')));
      console.log('klaar');
    }
    await p.close();
  }
  await browser.close();
  return { beelden, fouten };
}

function png(dataUrl) { return PNG.sync.read(Buffer.from(dataUrl.split(',')[1], 'base64')); }

/** Het stuk [x0, y0, x1, y1] (delen van breedte en hoogte) uit een beeld. */
function uitsnede(beeld, [x0, y0, x1, y1]) {
  const x = Math.round(x0 * beeld.width), y = Math.round(y0 * beeld.height);
  const w = Math.round(x1 * beeld.width) - x, h = Math.round(y1 * beeld.height) - y;
  const uit = new PNG({ width: w, height: h });
  PNG.bitblt(beeld, uit, x, y, w, h, 0, 0);
  return uit;
}

/** Strook referentie | nu | verschil naast elkaar. */
function strook(a, b, verschil) {
  const w = a.width, h = a.height, uit = new PNG({ width: w * 3 + 20, height: h });
  uit.data.fill(255);
  for (const [i, beeld] of [a, b, verschil].entries()) PNG.bitblt(beeld, uit, 0, 0, w, h, i * (w + 10), 0);
  return PNG.sync.write(uit);
}

// ---------- uitvoeren ----------
if (!zonderBouw) {
  console.log('Bouwen …');
  execSync('npm run build -w @configurator/demo-web && npm run build -w @configurator/bouw-web', { cwd: ROOT, stdio: 'ignore' });
}
for (const pad of [ZETEL, BOUW]) if (!existsSync(pad)) { console.error(`Niet gevonden: ${pad} (eerst bouwen)`); process.exit(2); }

console.log('Beelden maken (Chromium zonder grafische kaart) …');
const { beelden, fouten } = await maakBeelden();
mkdirSync(REFERENTIE, { recursive: true });
rmSync(UITSLAG, { recursive: true, force: true });
mkdirSync(UITSLAG, { recursive: true });

let mis = 0;
const regels = [];
for (const [naam, nu] of beelden) {
  writeFileSync(join(UITSLAG, `${naam}.png`), PNG.sync.write(nu));
  const refPad = join(REFERENTIE, `${naam}.png`);
  if (vernieuw || !existsSync(refPad)) {
    writeFileSync(refPad, PNG.sync.write(nu));
    regels.push([naam, vernieuw ? 'referentie vernieuwd' : 'nieuwe referentie']);
    continue;
  }
  const ref = PNG.sync.read(readFileSync(refPad));
  if (ref.width !== nu.width || ref.height !== nu.height) {
    mis++;
    regels.push([naam, `ANDERE MAAT: ${ref.width}×${ref.height} → ${nu.width}×${nu.height}`]);
    continue;
  }
  const verschil = new PNG({ width: nu.width, height: nu.height });
  const anders = pixelmatch(ref.data, nu.data, verschil.data, nu.width, nu.height, { threshold: PIXELDREMPEL, alpha: 0.3 });
  const deel = anders / (nu.width * nu.height);
  const te = deel > MAX_ANDERS;
  if (te) mis++;
  if (anders) writeFileSync(join(UITSLAG, `${naam}-verschil.png`), strook(ref, nu, verschil));
  regels.push([naam, `${(deel * 100).toFixed(2)} % anders${te ? '  ← TE VEEL' : ''}`]);
}

console.log('\nUitslag:');
for (const [naam, tekst] of regels) console.log(`  ${naam.padEnd(22)} ${tekst}`);
if (fouten.length) {
  console.log('\nFouten in de pagina:');
  for (const f of [...new Set(fouten)].slice(0, 10)) console.log(`  ${f}`);
}
console.log(`\nBeelden en verschillen: ${UITSLAG}`);
if (mis || fouten.length) {
  console.log(mis ? `${mis} beeld(en) anders dan de referentie. Bewust? Dan: npm run beelden -- --vernieuw` : '');
  process.exit(1);
}
console.log('Alles gelijk aan de referentie.');
