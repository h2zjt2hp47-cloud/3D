// Bundelt de demo tot één HTML-bestand: dist/configurator-demo.html
import { build } from 'esbuild';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

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
// Productfoto's (optioneel): packages/demo-web/fotos/<sleutel>.jpg, opgehaald met scripts/haal_fotos.py.
const fotos = {};
if (existsSync('fotos')) {
  for (const f of readdirSync('fotos').filter((f) => f.endsWith('.jpg'))) {
    fotos[f.slice(0, -4)] = `data:image/jpeg;base64,${readFileSync(`fotos/${f}`).toString('base64')}`;
  }
}
const fotoScript = `window.__FOTOS = ${JSON.stringify(fotos).replace(/</g, '\\u003c')};`;
// Omgevingsbeelden (HDRI, CC0): omgeving/<sleutel>.hdr, zie omgeving/BRON.md. Als base64, de weergave leest ze zonder fetch.
const omgevingen = {};
if (existsSync('omgeving')) for (const f of readdirSync('omgeving').filter((f) => f.endsWith('.hdr'))) omgevingen[f.slice(0, -4)] = readFileSync(`omgeving/${f}`).toString('base64');
const omgevingScript = `window.__OMGEVINGEN = ${JSON.stringify(omgevingen)};`;
// Echte 3D-modellen (proef): modellen3d/<sleutel>.glb met een beeld <sleutel>.jpg voor de modelkaart (zie modellen3d/BRON.md).
// Alleen in de gewone demo: het zijn geen modellen van de klant, dus niet in de versie in zijn huisstijl.
const modellen3d = {}, beelden3d = {};
if (existsSync('modellen3d')) {
  for (const f of readdirSync('modellen3d')) {
    if (f.endsWith('.glb')) modellen3d[f.slice(0, -4)] = `data:model/gltf-binary;base64,${readFileSync(`modellen3d/${f}`).toString('base64')}`;
    if (f.endsWith('.jpg')) beelden3d[f.slice(0, -4)] = `data:image/jpeg;base64,${readFileSync(`modellen3d/${f}`).toString('base64')}`;
  }
}
const modelScript = `window.__MODELLEN3D = ${JSON.stringify(modellen3d)}; Object.assign(window.__FOTOS, ${JSON.stringify(beelden3d)});`.replace(/</g, '\\u003c');
let html = readFileSync('src/index.html', 'utf8').replace('/*BUNDEL*/', () => `${fotoScript}\n${omgevingScript}\n/*MODELLEN3D*/\n${js}`);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/configurator-demo.html', html.replace('<!--MERK-->', '').replace('/*HUISSTIJL*/', '').replace('/*MODELLEN3D*/', () => modelScript));
html = html.replace('/*MODELLEN3D*/', '');

// Variant in de huisstijl van de klant (alleen als bestand, niet om publiek te publiceren).
html = html
  .replace('<html lang="nl">', '<html lang="nl" data-huisstijl="cs">')
  .replace('<title>Configurator demo</title>', '<title>Corneille &amp; Silence · Configurator</title>')
  .replace('<!--MERK-->', '<div class="merk">Corneille &amp; Silence</div>')
  .replace('/*HUISSTIJL*/', () => readFileSync('src/huisstijl-cs.css', 'utf8'))
  .replace('family=Figtree:wght@400;500;600', 'family=Figtree:wght@400;500;600&family=Montserrat:wght@300;400;500;600&family=Raleway:wght@400;500');
writeFileSync('dist/configurator-corneille-silence.html', html);

// Offline-versies: alles in één bestand (lettertypes ingebakken; three.js zit al in de bundel), om door te sturen.
const lettertypen = existsSync('lettertypen/lettertypen.css') ? readFileSync('lettertypen/lettertypen.css', 'utf8') : '';
function offline(bron) {
  let uit = bron
    .replace(/<link rel="preconnect"[^>]*>\n?/g, '')
    .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, () => (lettertypen ? `<style>${lettertypen}</style>` : ''));
  if (/cdnjs\.cloudflare|fonts\.googleapis/.test(uit)) throw new Error('offline-versie verwijst nog naar internet');
  return uit;
}
writeFileSync('dist/configurator-demo-offline.html', offline(readFileSync('dist/configurator-demo.html', 'utf8')));
writeFileSync('dist/configurator-corneille-silence-offline.html', offline(html));
if (!lettertypen) console.log('Let op: geen lettertypen/lettertypen.css (scripts/haal_lettertypes.py); offline-versie gebruikt systeemletters.');
console.log(`dist/configurator-demo.html en dist/configurator-corneille-silence.html (${Math.round(html.length / 1024)} kB, ${Object.keys(fotos).length} foto's, ${Object.keys(modellen3d).length} echt 3D-model in de demo)`);
