// Bundelt de demo tot één HTML-bestand: dist/configurator-demo.html
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

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
writeFileSync('dist/configurator-demo.html', html);
console.log(`dist/configurator-demo.html (${Math.round(html.length / 1024)} kB)`);
