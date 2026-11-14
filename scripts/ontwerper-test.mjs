#!/usr/bin/env node
/**
 * Werking van de ontwerper in een echte browser: toevoegen met één klik, de knoppen bij het gekozen element, Delete in
 * 3D en ongedaan maken (gebruikstest van 14/11). De rekenmotor heeft zijn eigen tests (vitest); dit bewaakt wat alleen
 * in de pagina zit: waar een nieuw element terechtkomt en of de knoppen doen wat ze zeggen.
 *
 *   npm run ontwerper              bouwt de demo en loopt de gevallen af
 *   npm run ontwerper -- --zonder-bouw
 *
 * Afsluitcode 1 als een geval niet klopt of de pagina een fout gaf.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(ROOT, 'packages/demo-web/dist/configurator-demo.html');
if (!process.argv.includes('--zonder-bouw')) execSync('npm run build -w @configurator/demo-web', { cwd: ROOT, stdio: 'ignore' });
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.error('Playwright niet gevonden. Installeer het met: npm install -D playwright'); process.exit(2); }

const SLEUTEL = 'configurator-demo.ontwerp.v1';
const fouten = [];
let gevallen = 0;
const klopt = (naam, ok, detail = '') => { gevallen++; if (!ok) fouten.push(`${naam}${detail ? ': ' + detail : ''}`); console.log(`  ${ok ? 'ok ' : 'MIS'} ${naam}${ok ? '' : detail ? ' → ' + detail : ''}`); };

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.route('https://fonts.googleapis.com/**', (r) => r.abort());
p.on('pageerror', (e) => fouten.push(`fout in de pagina: ${String(e).slice(0, 200)}`));
const staat = () => p.evaluate((s) => {
  const o = JSON.parse(localStorage.getItem(s));
  return {
    el: o.elementen.map((e) => `${e.type} ${e.breedte}x${e.diepte}@${e.x},${e.y}r${e.rotatie}`),
    status: document.querySelector('#o-status')?.textContent ?? '',
    meldingen: [...document.querySelectorAll('#o-meldingen li')].map((x) => x.textContent),
    balk: document.querySelector('#o-actiebalk')?.innerText.replace(/\s+/g, ' ') ?? '',
    melding: document.querySelector('#o-actiemelding')?.textContent ?? '',
  };
}, SLEUTEL);
const begin = async (ontwerp) => {
  await p.goto(`file://${HTML}#ontwerp`);
  await p.evaluate(([s, o]) => localStorage.setItem(s, JSON.stringify(o)), [SLEUTEL, ontwerp]);
  await p.reload();
  await p.waitForTimeout(1000);
};
const voeg = async (code) => { await p.click(`[data-gereedschap="${code}"]`); await p.waitForTimeout(300); return staat(); };
const laatste = (s) => s.el[s.el.length - 1];
const zonderFout = (s) => s.status === 'Klaar voor offerte' && !s.meldingen.some((m) => /overlappen/.test(m));

console.log('Van een leeg blad: één klik per element');
await begin({ hoofdmateriaal: 'linnen_brume', elementen: [] });
let s = await voeg('zit'); klopt('eerste zitelement op het lege blad', laatste(s) === 'zit 90x95@0,0r0', laatste(s));
s = await voeg('zit'); klopt('tweede zitelement sluit rechts aan', laatste(s) === 'zit 90x95@90,0r0', laatste(s));
s = await voeg('arm'); klopt('armleuning aan het rechtse uiteinde, even diep', laatste(s) === 'arm 20x95@180,0r0', laatste(s));
s = await voeg('arm'); klopt('tweede armleuning aan het linkse uiteinde', laatste(s) === 'arm 20x95@-20,0r0', laatste(s));
s = await voeg('zit'); klopt('zitelement erbij: de armleuning rechts schuift op', laatste(s) === 'zit 90x95@180,0r0' && s.el.includes('arm 20x95@270,0r0'), JSON.stringify(s.el));
klopt('geen overlap of fout na vijf klikken', zonderFout(s), `${s.status} ${JSON.stringify(s.meldingen)}`);
s = await voeg('arm'); klopt('derde armleuning: staat los, met uitleg', /Geen vrij uiteinde/.test(s.melding), s.melding);
await p.click('#o-actiebalk button:has-text("Verwijder")'); await p.waitForTimeout(300); s = await staat();
klopt('Verwijder bij het gekozen element haalt het weg', s.el.length === 5 && !/Verwijder/.test(s.balk), `${s.el.length} elementen, balk: ${s.balk}`);
s = await voeg('poef'); klopt('poef staat los voor de zetel, zonder overlap', /^poef 70x70@\d+,1\d\dr0$/.test(laatste(s)) && zonderFout(s), laatste(s));
s = await voeg('rugleuning'); klopt('losse rugleuning komt op de gekozen poef', /^rugleuning 70x18@/.test(laatste(s)) && zonderFout(s), laatste(s));
s = await voeg('rugleuning'); klopt('tweede losse rugleuning: geen plaats, met uitleg', s.el.length === 7 && /losse rugleuning past/i.test(s.melding), s.melding);
s = await voeg('fauteuil'); klopt('fauteuil staat los zonder waarschuwing', /^fauteuil 80x80@/.test(laatste(s)) && !s.meldingen.some((m) => /raakt geen ander/.test(m)), JSON.stringify(s.meldingen));
s = await voeg('sierkussen'); klopt('sierkussen komt op een zitting', /^sierkussen /.test(laatste(s)) && zonderFout(s), laatste(s));

console.log('In 3D: toevoegen, kiezen en verwijderen');
await p.click('[data-o-weergave="3d"]'); await p.waitForTimeout(2500);
const voor = (await staat()).el.length;
s = await voeg('zit_zonder_rug'); klopt('in 3D komt er met één klik een element bij', s.el.length === voor + 1 && zonderFout(s), `${voor} → ${s.el.length}, ${s.status}`);
klopt('het nieuwe element is gekozen (knoppen erboven)', /Zitbank zonder rug/.test(s.balk) && /Verwijder/.test(s.balk), s.balk);
await p.locator('#o-3d canvas').focus(); await p.keyboard.press('Delete'); await p.waitForTimeout(400); s = await staat();
klopt('Delete in 3D verwijdert het gekozen element', s.el.length === voor, `${s.el.length} elementen`);
await p.keyboard.press('Control+z'); await p.waitForTimeout(400); s = await staat();
klopt('Ctrl+Z in 3D zet het terug', s.el.length === voor + 1, `${s.el.length} elementen`);

console.log('Hoeksofa: tegen een gedraaide tak');
await begin({ hoofdmateriaal: 'linnen_brume', elementen: [
  { id: 'e1', type: 'hoek', x: 0, y: 0, breedte: 100, diepte: 100, rotatie: 0 }, { id: 'e2', type: 'zit', x: 100, y: 0, breedte: 90, diepte: 100, rotatie: 0 }, { id: 'e3', type: 'arm', x: 190, y: 0, breedte: 22, diepte: 100, rotatie: 0 },
  { id: 'e4', type: 'zit', x: 0, y: 100, breedte: 90, diepte: 100, rotatie: 270 }, { id: 'e5', type: 'arm', x: 0, y: 190, breedte: 22, diepte: 100, rotatie: 270 } ] });
const tak = await p.locator('#o-canvas [data-rol="element"][data-id="e4"]').first().boundingBox();
await p.mouse.click(tak.x + tak.width / 2, tak.y + tak.height / 2); await p.waitForTimeout(300);
s = await voeg('zit'); klopt('zitelement komt in het verlengde van de gekozen tak, de arm schuift op', laatste(s) === 'zit 90x100@0,190r270' && s.el.includes('arm 22x100@0,280r270') && zonderFout(s), JSON.stringify(s.el));
s = await voeg('rond_einde'); klopt('afgerond eindelement vervangt de armleuning aan dat uiteinde', laatste(s) === 'rond_einde 130x100@0,280r270' && !s.el.includes('arm 22x100@0,280r270') && zonderFout(s), JSON.stringify(s.el));
await p.click('#o-ongedaan'); await p.click('#o-ongedaan'); await p.waitForTimeout(300); s = await staat();
klopt('twee keer Ongedaan maken geeft de hoeksofa terug', s.el.length === 5 && s.el.includes('arm 22x100@0,190r270'), JSON.stringify(s.el));

console.log('Zelf tekenen blijft mogelijk (Shift + klik)');
await p.click('[data-gereedschap="zit"]', { modifiers: ['Shift'] }); await p.waitForTimeout(200); s = await staat();
klopt('Shift + klik voegt niets toe maar kiest het tekengereedschap', s.el.length === 5 && (await p.locator('[data-gereedschap="zit"]').getAttribute('aria-pressed')) === 'true');
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
klopt('Esc stopt het tekenen', (await p.locator('[data-gereedschap="zit"]').getAttribute('aria-pressed')) === 'false');

await browser.close();
console.log(fouten.length ? `\n${fouten.length} van ${gevallen} gevallen kloppen niet:\n  ${fouten.join('\n  ')}` : `\nAlle ${gevallen} gevallen kloppen.`);
process.exit(fouten.length ? 1 : 0);
