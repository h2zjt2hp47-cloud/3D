// Bundelt de 3D-werkbank tot één HTML-bestand: dist/werkbank.html (three.js zit mee in de bundel; niets van internet).
// Omgevingsbeeld, productfoto's en het proefmodel komen uit de zeteldemo (packages/demo-web), als ze er zijn.
import { build } from 'esbuild';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const r = await build({ entryPoints: ['src/main.ts'], bundle: true, format: 'iife', target: 'es2020', minify: true, write: false, legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const demo = new URL('../demo-web/', import.meta.url);
const map = (naam) => new URL(naam + '/', demo);
const lees = (naam, eind) => (existsSync(map(naam)) ? readdirSync(map(naam)).filter((f) => f.endsWith(eind)) : []).map((f) => [f.slice(0, -eind.length), readFileSync(new URL(f, map(naam)))]);
const veilig = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const omgevingen = Object.fromEntries(lees('omgeving', '.hdr').map(([k, b]) => [k, b.toString('base64')]));
const modellen3d = Object.fromEntries(lees('modellen3d', '.glb').map(([k, b]) => [k, `data:model/gltf-binary;base64,${b.toString('base64')}`]));
// Met --zonder-fotos een pagina zonder productfoto's (om door te geven zonder beelden van de klant).
const fotos = process.argv.includes('--zonder-fotos') ? {} : Object.fromEntries(lees('fotos', '.jpg').map(([k, b]) => [k, `data:image/jpeg;base64,${b.toString('base64')}`]));
const gegevens = `window.__OMGEVINGEN = ${veilig(omgevingen)};\nwindow.__MODELLEN3D = ${veilig(modellen3d)};\nwindow.__FOTOS = ${veilig(fotos)};`;
const html = readFileSync('src/index.html', 'utf8').replace('/*BUNDEL*/', () => `${gegevens}\n${js}`);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/werkbank.html', html);
console.log(`dist/werkbank.html (${Math.round(html.length / 1024)} kB, ${Object.keys(fotos).length} foto's, ${Object.keys(modellen3d).length} 3D-bestand)`);
