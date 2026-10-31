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
let html = readFileSync('src/index.html', 'utf8').replace('/*BUNDEL*/', () => `${fotoScript}\n${js}`);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/configurator-demo.html', html.replace('<!--MERK-->', '').replace('/*HUISSTIJL*/', ''));

// Variant in de huisstijl van de klant (alleen als bestand, niet om publiek te publiceren).
html = html
  .replace('<html lang="nl">', '<html lang="nl" data-huisstijl="cs">')
  .replace('<title>Configurator demo</title>', '<title>Corneille &amp; Silence · Configurator</title>')
  .replace('<!--MERK-->', '<div class="merk">Corneille &amp; Silence</div>')
  .replace('/*HUISSTIJL*/', () => readFileSync('src/huisstijl-cs.css', 'utf8'))
  .replace('family=Figtree:wght@400;500;600', 'family=Figtree:wght@400;500;600&family=Montserrat:wght@300;400;500;600&family=Raleway:wght@400;500');
writeFileSync('dist/configurator-corneille-silence.html', html);
console.log(`dist/configurator-demo.html en dist/configurator-corneille-silence.html (${Math.round(html.length / 1024)} kB, ${Object.keys(fotos).length} foto's)`);
