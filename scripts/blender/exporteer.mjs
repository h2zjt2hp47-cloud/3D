/**
 * Schrijft per fauteuil de opbouw uit de motor (de blokken van bouw3D) naar scripts/blender/gegevens/<code>.json.
 * Het Blender-script vertrekt van die gegevens (zie LEESMIJ.md): zo heeft het 3D-bestand dezelfde maten en dezelfde
 * opbouw als het model in de configurator, en stellen we alleen bij wat de foto's anders tonen.
 *
 *   node scripts/blender/exporteer.mjs            alle fauteuils
 *   node scripts/blender/exporteer.mjs manon ross  alleen deze codes
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = join(hier, '..', '..');
const bron = `
import { bouw3D, hoogtesVan } from './packages/core/src/index';
import { zetelModellen } from './packages/core/voorbeelden/modellen';
import { standaardMaterialen } from './packages/core/voorbeelden/sofa';
import { zetelCatalogus } from './packages/core/voorbeelden/vrij-ontwerp';
const rond = (x: unknown): unknown => typeof x === 'number' ? Math.round(x * 10000) / 10000 : Array.isArray(x) ? x.map(rond)
  : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, rond(v)])) : x;
export const gegevens = (codes: string[]) => zetelModellen
  .filter((m) => (codes.length ? codes.includes(m.code) : m.familie === 'Fauteuils'))
  .map((m) => {
    const s = bouw3D(m.ontwerp, zetelCatalogus, standaardMaterialen), h = hoogtesVan(m.ontwerp, zetelCatalogus);
    return rond({
      code: m.code, naam: m.naam, bron: m.bron ?? '',
      kader: s.kader, maat: { b: s.kader.b, d: s.kader.d, h: s.kader.h, zithoogte: h.zithoogte, poothoogte: h.poothoogte, rughoogte: h.rughoogte },
      blokken: s.blokken.map(({ kleur, weefsel, textuur, textuurCm, naad, ...b }) => ({ ...b, ...(naad ? { naad: naad.soort } : {}), ...(b.soort === 'donker' ? { kleur } : {}) })),
    });
  });
`;
const uit = join(tmpdir(), `blender-gegevens-${process.pid}.mjs`);
await build({ stdin: { contents: bron, resolveDir: wortel, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: uit, logLevel: 'warning' });
const { gegevens } = await import(pathToFileURL(uit).href);
rmSync(uit);
mkdirSync(join(hier, 'gegevens'), { recursive: true });
for (const g of gegevens(process.argv.slice(2))) {
  writeFileSync(join(hier, 'gegevens', `${g.code}.json`), JSON.stringify(g) + '\n');
  console.log(`${g.code}: ${g.blokken.length} blokken, ${g.maat.b} × ${g.maat.d} × ${g.maat.h} cm`);
}
