/**
 * Gedeelde hulpmiddelen voor het 3D-gereedschap (modelbeelden, controleblad, lichtmeting).
 *
 * Opent de gebouwde zeteldemo in een browser zonder grafische kaart (de WebGL2-weg, zoals in de cloud), opent een model,
 * zet instellingen en keuzes, wacht tot het beeld stil is en neemt een beeld. Eén plaats voor alles wat van de bediening
 * van de demo afhangt: verandert daar een knop of een lijst, dan pas je het alleen hier aan.
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DEMO = path.join(ROOT, 'packages/demo-web/dist/configurator-demo.html');
/** Map voor alles wat het gereedschap maakt (niet in git). */
export const WERKBANK = path.join(ROOT, 'werkbank');

/** Vaste standpunten: [hoek rond de zetel, hoek omhoog] in radialen; de afstand kiest de demo zelf (passend). */
export const STANDPUNTEN = {
  schuin: [0.45, 0.2], voor: [0, 0.08], links: [-0.5, 0.18], rechts: [0.5, 0.18], hoog: [0.4, 0.55], boven: [0.2, 1.25],
};

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

/** Bouwt de zeteldemo (tenzij --zonder-bouw). */
export function bouwDemo(opties = {}) {
  if (opties['zonder-bouw']) return;
  process.stdout.write('Demo bouwen … ');
  execFileSync('npm', ['run', 'build', '-w', '@configurator/demo-web'], { cwd: ROOT, stdio: 'ignore' });
  console.log('klaar');
}

function laadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); } catch {
    console.error('Playwright niet gevonden. Installeer het met: npm install -D playwright');
    process.exit(2);
  }
}

/** Opent de demo met verse instellingen. Geeft de browser, de pagina en de lijst met fouten van de pagina. */
export async function openDemo({ breedte = 1500, hoogte = 1100 } = {}) {
  const { chromium } = laadPlaywright();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pagina = await browser.newPage({ viewport: { width: breedte, height: hoogte } });
  const fouten = [];
  pagina.on('pageerror', (e) => fouten.push(String(e)));
  pagina.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text().slice(0, 200)); });
  await pagina.goto('file://' + DEMO);
  await pagina.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('configurator-demo.3d.v1', JSON.stringify({ kwaliteit: 'mooi', kamer: 1, decor: 'studio', licht: 'studio' }));
  });
  await pagina.reload();
  return { browser, pagina, fouten };
}

/** De collectie zoals de demo ze kent: code, naam, familie, maten, bron, foto … (zie modellen-ui.ts). */
export const leesModellen = (pagina) => pagina.evaluate(() => window.__modellen());
export const leesStoffen = (pagina) => pagina.evaluate(() => window.__stoffen());

/** Opent een model uit de collectie in de ontwerper (verse toestand van dat model). */
export async function openModel(pagina, model) {
  await pagina.click('[data-weergave="modellen"]');
  await pagina.click(`[data-familie="${model.familie}"]`);
  const naam = model.naam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await pagina.locator('.modelkaart', { has: pagina.locator('h2', { hasText: new RegExp(`^${naam}$`) }) }).locator('button').first().click();
  await pagina.waitForTimeout(600);
}

/** De keuzes van een lijst in de 3D-balk (decor, licht …): [{ waarde, label }]. */
export const leesLijst = (pagina, naam) =>
  pagina.evaluate((n) => [...document.querySelectorAll(`#o-3d-${n} option`)].map((o) => ({ waarde: o.value, label: o.textContent.trim() })), naam);
/** De keuzes voor de hele zetel (poten, rug, naden …): [{ groep, label, keuzes: [{ code, label }] }]. */
export const leesKeuzes = (pagina) =>
  pagina.evaluate(() => [...document.querySelectorAll('#o-aanpassingen fieldset[data-groep]')].map((f) => ({
    groep: f.dataset.groep, label: f.querySelector('legend')?.textContent.trim() ?? f.dataset.groep,
    keuzes: [...f.querySelectorAll('input')].map((i) => ({ code: i.value, label: i.closest('label')?.textContent.trim() ?? i.value })),
  })));

/** Zet de instellingen van de 3D (decor, licht, kwaliteit, vormen, stof) en keuzes voor de hele zetel. */
export async function zetInstellingen(pagina, { decor = 'studio', licht = 'studio', kwaliteit = 'mooi', vormen = 'blokken', stof, keuzes = {} } = {}) {
  const zet = async (sel, waarde) => { if ((await pagina.inputValue(sel)) !== String(waarde)) await pagina.selectOption(sel, String(waarde)); };
  await zet('#o-3d-decor', decor);
  await zet('#o-3d-licht', licht);
  await zet('#o-3d-kwaliteit', kwaliteit);
  await zet('#o-3d-vormen', vormen);
  if (stof) await zet('#o-3d-stof', stof);
  for (const [groep, keuze] of Object.entries(keuzes)) {
    const knop = pagina.locator(`#o-aanpassingen fieldset[data-groep="${groep}"] input[value="${keuze}"]`);
    if (await knop.count()) await knop.check({ force: true });
    else throw new Error(`Keuze ${groep} = ${keuze} bestaat niet`);
  }
}

/**
 * Zet de camera en neemt een beeld zodra het stil is (het mooie beeld en de zachte vormen komen iets later).
 * `kijk` = naam van een standpunt of [hoekH, hoekV, afstand?]. Geeft een buffer (jpeg of png).
 */
export async function neemBeeld(pagina, { kijk = 'schuin', breedte = 900, type = 'image/jpeg', kwaliteit = 0.86 } = {}) {
  const [h, v, afstand] = Array.isArray(kijk) ? kijk : STANDPUNTEN[kijk] ?? STANDPUNTEN.schuin;
  await pagina.evaluate(() => window.__zetel3d.standpunt('voor'));
  await pagina.waitForTimeout(700);
  await pagina.evaluate(([hh, vv, a]) => window.__zetel3d.kijk(a ? { hoekH: hh, hoekV: vv, afstand: a } : { hoekH: hh, hoekV: vv }), [h, v, afstand ?? null]);
  let vorig = '', gelijk = 0;
  for (let i = 0; i < 28 && gelijk < 2; i++) {
    await pagina.waitForTimeout(1300);
    const nu = await pagina.evaluate(() => { const u = document.querySelector('#o-3d canvas').toDataURL('image/jpeg', 0.3); return u.length + ':' + u.slice(-48); });
    gelijk = nu === vorig ? gelijk + 1 : 0;
    vorig = nu;
  }
  const url = await pagina.evaluate(([b, t, q]) => window.__zetel3d.foto({ breedte: b, type: t, kwaliteit: q }), [breedte, type, kwaliteit]);
  return Buffer.from(url.split(',')[1], 'base64');
}

/** Kiest modellen op code, naam of familie; zonder keuze de hele collectie. */
export function kiesModellen(alle, { modellen, familie } = {}) {
  const gevraagd = lijst(modellen).map((x) => x.toLowerCase());
  let uit = alle;
  if (familie) uit = uit.filter((m) => m.familie.toLowerCase().startsWith(String(familie).toLowerCase()));
  if (gevraagd.length) uit = uit.filter((m) => gevraagd.includes(m.code.toLowerCase()) || gevraagd.includes(m.naam.toLowerCase()));
  return uit;
}
