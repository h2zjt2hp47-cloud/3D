// Bundelt de bouwdemo (ramen, deuren, aanbouw) tot één HTML-bestand: dist/bouw-configurator.html
// en een offline-versie (lettertypes ingebakken; de 3D-bibliotheek zit al in de bundel) om door te sturen.
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

mkdirSync('dist', { recursive: true });

// Losse 3D-kijker (alleen kijken): toont een 3D-pakket uit de configurator, bv. ingesloten in een scherm van Missing Link.
// Zonder de fotomodus van de zetels (path tracer en ontruiser): die wordt hier niet gebruikt en weegt ±600 kB.
// Eerst gebouwd: de configurator draagt de kijker in zich, om er het bestand voor de klant mee te maken (meegeven.ts).
const zonderFotomodus = {
  name: 'zonder-fotomodus',
  setup(b) {
    b.onResolve({ filter: /^three-gpu-pathtracer$|fotomodus-webgpu\.js$/ }, (a) => ({ path: a.path, namespace: 'leeg' }));
    b.onLoad({ filter: /.*/, namespace: 'leeg' }, () => ({
      contents: 'export class WebGLPathTracer {}\nexport const fotoWebGPU = async () => null;\nexport const heeftWebGPU = () => false;',
      loader: 'js',
    }));
  },
};
const k = await build({ entryPoints: ['src/kijker.ts'], bundle: true, format: 'iife', target: 'es2020', minify: true, write: false, legalComments: 'none', plugins: [zonderFotomodus] });
const kijker = readFileSync('src/kijker.html', 'utf8').replace('/*BUNDEL*/', () => k.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
if (!kijker.includes('<!--PAKKET-->')) throw new Error('kijker.html mist de plaats voor het pakket (<!--PAKKET-->)');
writeFileSync('dist/bouw-kijker.html', kijker);

// De kijker in de configurator: gecomprimeerd (gzip, als base64), de configurator pakt hem uit met DecompressionStream
// als de verkoper een bestand voor de klant maakt. Zo weegt hij ±0,6 MB in plaats van 1,5 MB.
const kijkerIn = {
  name: 'kijker-in-configurator',
  setup(b) {
    b.onResolve({ filter: /^virtueel:kijker$/ }, (a) => ({ path: a.path, namespace: 'kijker' }));
    b.onLoad({ filter: /.*/, namespace: 'kijker' }, () => ({ contents: `export default ${JSON.stringify(gzipSync(kijker, { level: 9 }).toString('base64'))};`, loader: 'js' }));
  },
};

const r = await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  write: false,
  legalComments: 'none',
  plugins: [kijkerIn],
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('src/index.html', 'utf8').replace('/*BUNDEL*/', () => js);
writeFileSync('dist/bouw-configurator.html', html);

// Offline: lettertypes uit de zetel-demo hergebruiken (packages/demo-web/scripts/haal_lettertypes.py).
const lettertypenPad = new URL('../demo-web/lettertypen/lettertypen.css', import.meta.url);
const lettertypen = existsSync(lettertypenPad) ? readFileSync(lettertypenPad, 'utf8') : '';
const offline = html
  .replace(/<link rel="preconnect"[^>]*>\n?/g, '')
  .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, () => (lettertypen ? `<style>${lettertypen}</style>` : ''));
if (/cdnjs\.cloudflare|fonts\.googleapis/.test(offline)) throw new Error('offline-versie verwijst nog naar internet');
writeFileSync('dist/bouw-configurator-offline.html', offline);
if (!lettertypen) console.log('Let op: geen lettertypes gevonden; de offline-versie gebruikt systeemletters.');

console.log(`dist/bouw-configurator.html (${Math.round(html.length / 1024)} kB), dist/bouw-configurator-offline.html (${Math.round(offline.length / 1024)} kB) en dist/bouw-kijker.html (${Math.round(kijker.length / 1024)} kB)`);
