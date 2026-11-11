/**
 * Maakt beelden van modellen of van instellingen, in één keer en altijd op dezelfde manier.
 *
 *   npm run modelbeelden                                   alle modellen, schuin, in de studio
 *   npm run modelbeelden -- --modellen kotor,nestor --standpunten schuin,voor
 *   npm run modelbeelden -- --familie Fauteuils --decor fotodoek
 *   npm run modelbeelden -- --reeks keuzes --model attribute    elke keuze voor de hele zetel één keer
 *   npm run modelbeelden -- --reeks decors --model kotor        elk decor
 *   npm run modelbeelden -- --reeks lichten --model doha        elke lichtsfeer
 *
 * Verder: --licht, --kwaliteit snel|mooi, --vormen blokken|zacht, --breedte 900, --uit <map>, --zonder-bouw.
 * De beelden komen in werkbank/beelden (niet in git), met een index.json voor het controleblad.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { bouwDemo, kiesModellen, leesKeuzes, leesLijst, leesModellen, leesOpties, lijst, neemBeeld, openDemo, openModel, STANDPUNTEN, WERKBANK, zetInstellingen } from './werkbank.mjs';

const o = leesOpties();
const uit = path.resolve(o.uit ?? path.join(WERKBANK, 'beelden'));
const breedte = Number(o.breedte ?? 900);
const basis = { decor: o.decor ?? 'studio', licht: o.licht ?? 'studio', kwaliteit: o.kwaliteit ?? 'mooi', vormen: o.vormen ?? 'blokken' };
const standpunten = lijst(o.standpunten ?? 'schuin');
for (const s of standpunten) if (!STANDPUNTEN[s]) { console.error(`Onbekend standpunt "${s}". Kies uit: ${Object.keys(STANDPUNTEN).join(', ')}.`); process.exit(2); }

bouwDemo(o);
mkdirSync(uit, { recursive: true });
const { browser, pagina, fouten } = await openDemo();
const alle = await leesModellen(pagina);
const index = [];
const bewaar = async (naam, gegevens, kijk) => {
  const begin = Date.now();
  writeFileSync(path.join(uit, `${naam}.jpg`), await neemBeeld(pagina, { kijk, breedte }));
  index.push({ bestand: `${naam}.jpg`, ...gegevens });
  console.log(`  ${naam} (${Math.round((Date.now() - begin) / 1000)} s)`);
};

if (o.reeks) {
  // Eén model, telkens één instelling anders: zo zie je wat elke keuze doet.
  const model = kiesModellen(alle, { modellen: o.model ?? 'attribute' })[0];
  if (!model) { console.error(`Model "${o.model}" niet gevonden.`); process.exit(2); }
  await openModel(pagina, model);
  const reeksen = { decors: 'decor', lichten: 'licht' };
  if (reeksen[o.reeks]) {
    for (const k of await leesLijst(pagina, reeksen[o.reeks])) {
      await openModel(pagina, model);
      await zetInstellingen(pagina, { ...basis, [reeksen[o.reeks]]: k.waarde });
      await bewaar(`${reeksen[o.reeks]}-${k.waarde}`, { model: model.code, [reeksen[o.reeks]]: k.label }, standpunten[0]);
    }
  } else if (o.reeks === 'keuzes') {
    for (const g of await leesKeuzes(pagina)) for (const k of g.keuzes) {
      await openModel(pagina, model);
      try { await zetInstellingen(pagina, { ...basis, keuzes: { [g.groep]: k.code } }); } catch (f) { console.log(`  ${g.groep}-${k.code}: overgeslagen (${f.message})`); continue; }
      await bewaar(`${g.groep}-${k.code}`, { model: model.code, groep: g.label, keuze: k.label }, standpunten[0]);
    }
  } else { console.error('Onbekende reeks. Kies uit: keuzes, decors, lichten.'); process.exit(2); }
} else {
  const gekozen = kiesModellen(alle, o);
  if (!gekozen.length) { console.error('Geen modellen gevonden voor deze keuze.'); process.exit(2); }
  console.log(`${gekozen.length} modellen, standpunten: ${standpunten.join(', ')}`);
  for (const m of gekozen) {
    await openModel(pagina, m);
    await zetInstellingen(pagina, basis);
    for (const s of standpunten) await bewaar(`${m.code}-${s}`, { model: m.code, naam: m.naam, familie: m.familie, standpunt: s }, s);
  }
}
writeFileSync(path.join(uit, 'index.json'), JSON.stringify({ gemaakt: new Date().toISOString(), instellingen: basis, breedte, beelden: index }, null, 1));
await browser.close();
if (fouten.length) console.log(`Let op: de pagina gaf ${new Set(fouten).size} fout(en):\n  ${[...new Set(fouten)].slice(0, 5).join('\n  ')}`);
console.log(`${index.length} beelden in ${uit}`);
process.exit(fouten.length ? 1 : 0);
