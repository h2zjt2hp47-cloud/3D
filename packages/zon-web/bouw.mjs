// Bundelt de zonnepanelendemo tot één HTML-bestand: dist/zon-configurator.html
// en een offline-versie (3D-bibliotheek en lettertypes ingebakken) om door te sturen.
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const r = await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  write: false,
  legalComments: 'none',
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('src/index.html', 'utf8').replace('/*BUNDEL*/', () => js);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/zon-configurator.html', html);

// Offline: lettertypes uit de zetel-demo hergebruiken (packages/demo-web/scripts/haal_lettertypes.py).
const threePad = new URL('../../node_modules/three/build/three.min.js', import.meta.url);
const lettertypenPad = new URL('../demo-web/lettertypen/lettertypen.css', import.meta.url);
const lettertypen = existsSync(lettertypenPad) ? readFileSync(lettertypenPad, 'utf8') : '';
const offline = html
  .replace(/<link rel="preconnect"[^>]*>\n?/g, '')
  .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, () => (lettertypen ? `<style>${lettertypen}</style>` : ''))
  .replace(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js"[^>]*><\/script>/, () =>
    `<script>${readFileSync(threePad, 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`);
if (/cdnjs\.cloudflare|fonts\.googleapis/.test(offline)) throw new Error('offline-versie verwijst nog naar internet');
writeFileSync('dist/zon-configurator-offline.html', offline);
if (!lettertypen) console.log('Let op: geen lettertypes gevonden; de offline-versie gebruikt systeemletters.');
console.log(`dist/zon-configurator.html (${Math.round(html.length / 1024)} kB) en dist/zon-configurator-offline.html (${Math.round(offline.length / 1024)} kB)`);
