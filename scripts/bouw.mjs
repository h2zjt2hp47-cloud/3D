// Bundelt het spel tot één HTML-bestand: dist/belgica.html
import fs from 'node:fs';
import { build } from 'esbuild';

const r = await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2020',
  write: false,
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync('src/index.html', 'utf8').replace('<!--SCRIPT-->', () => `<script>${js}</script>`);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/belgica.html', html);
console.log(`dist/belgica.html: ${(html.length / 1024).toFixed(0)} kB`);
