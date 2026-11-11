/**
 * Maakt beelden van een bron (zetels, inrichting, ramen, woning …), in één keer en altijd op dezelfde manier.
 *
 *   npm run modelbeelden                                        alle zetels, schuin, in de studio
 *   npm run modelbeelden -- --bron inrichting                   alle meubels van de inrichting
 *   npm run modelbeelden -- --items kotor,nestor --standpunten schuin,voor
 *   npm run modelbeelden -- --groep Fauteuils --decor fotodoek
 *   npm run modelbeelden -- --reeks poten --item attribute      elke keuze van één groep (poten, rug, bouwstijl, stof …)
 *   npm run modelbeelden -- --reeks alles --item attribute      elke keuze van elke groep
 *   npm run modelbeelden -- --reeks decors --item kotor         elk decor; ook: lichten, standpunten
 *   npm run modelbeelden -- --lijst                             toont de bronnen, en met --bron de items en reeksen
 *
 * Verder: --licht, --kwaliteit snel|mooi, --vormen blokken|zacht, --breedte 900, --weg snel|webgl2|webgpu, --vers
 * (niets uit de vorige keer hergebruiken), --uit <map>, --zonder-bouw.
 * De beelden komen in werkbank/beelden/<bron> (niet in git), met een index.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { WERKBANK, bouwWerkbank, kiesBron, kiesItems, leesBronnen, leesInstellingen, leesItems, leesOpties, leesReeksen, lijst, naamVoorBestand, neemBeeld, openWerkbank, voortgang } from './werkbank.mjs';

const o = leesOpties();
bouwWerkbank(o);
const werkbank = await openWerkbank({ weg: o.weg });
const { pagina } = werkbank;
const inst = await leesInstellingen(pagina);

if (o.lijst) {
  if (!o.bron) for (const b of await leesBronnen(pagina)) console.log(`${b.code.padEnd(12)} ${b.titel} (${b.aantal}): ${b.uitleg}`);
  else {
    const bron = await kiesBron(pagina, o.bron), items = await leesItems(pagina, bron.code);
    console.log(`${bron.titel}: ${items.length} items`);
    for (const i of items) console.log(`  ${i.code.padEnd(26)} ${i.naam} (${i.groep})`);
    const reeksen = await leesReeksen(pagina, bron.code, items[0].code);
    if (reeksen.length) console.log(`Reeksen: ${reeksen.map((r) => `${r.groep} (${r.keuzes.length})`).join(', ')}, decors, lichten, standpunten`);
  }
  await werkbank.sluit();
  process.exit(0);
}

const bron = await kiesBron(pagina, o.bron);
const uit = path.resolve(o.uit ?? path.join(WERKBANK, 'beelden', bron.code));
const basis = { decor: o.decor ?? 'studio', licht: o.licht ?? 'studio', kwaliteit: o.kwaliteit ?? 'mooi', vormen: o.vormen ?? 'blokken', breedte: Number(o.breedte ?? 900) };
const standpunten = lijst(o.standpunten ?? 'schuin');
for (const s of standpunten) if (!inst.standpunten.some((x) => x.waarde === s)) { console.error(`Onbekend standpunt "${s}". Kies uit: ${inst.standpunten.map((x) => x.waarde).join(', ')}.`); process.exit(2); }
const alle = await leesItems(pagina, bron.code);
mkdirSync(uit, { recursive: true });
const index = [];
let nieuw = 0;
const bewaar = async (naam, code, opties, gegevens) => {
  const r = await neemBeeld(werkbank, bron.code, code, { ...basis, ...opties }, { vers: Boolean(o.vers) });
  writeFileSync(path.join(uit, `${naam}.jpg`), r.beeld);
  index.push({ bestand: `${naam}.jpg`, bron: bron.code, item: code, ...gegevens });
  if (!r.uitCache) nieuw++;
  voortgang(naam, r);
};

console.log(`${bron.titel} · ${werkbank.label}`);
if (o.reeks) {
  // Eén item, telkens één instelling anders: zo zie je wat elke keuze doet.
  const item = kiesItems(alle, { items: o.item ?? o.model ?? alle[0].code })[0];
  const vast = { decors: ['decor', inst.decors], lichten: ['licht', inst.lichten], standpunten: ['kijk', inst.standpunten] }[o.reeks];
  if (vast) {
    for (const k of vast[1]) await bewaar(`${item.code}-${vast[0]}-${k.waarde}`, item.code, { kijk: standpunten[0], [vast[0]]: k.waarde }, { naam: item.naam, [vast[0]]: k.label });
  } else {
    const reeksen = await leesReeksen(pagina, bron.code, item.code);
    const gekozen = o.reeks === 'alles' || o.reeks === 'keuzes' ? reeksen.filter((r) => r.groep !== 'stof') : reeksen.filter((r) => r.groep === o.reeks);
    if (!gekozen.length) { console.error(`Onbekende reeks "${o.reeks}". Kies uit: alles, decors, lichten, standpunten${reeksen.length ? ', ' + reeksen.map((r) => r.groep).join(', ') : ''}.`); process.exit(2); }
    for (const r of gekozen) for (const k of r.keuzes) {
      await bewaar(`${item.code}-${r.groep}-${naamVoorBestand(k.code)}`, item.code, { kijk: standpunten[0], keuzes: { [r.groep]: k.code } }, { naam: item.naam, groep: r.label, keuze: k.label });
    }
  }
} else {
  const gekozen = kiesItems(alle, o);
  if (!gekozen.length) { console.error('Geen items gevonden voor deze keuze.'); process.exit(2); }
  console.log(`${gekozen.length} items, standpunten: ${standpunten.join(', ')}`);
  for (const i of gekozen) for (const s of standpunten) await bewaar(`${i.code}-${s}`, i.code, { kijk: s }, { naam: i.naam, groep: i.groep, standpunt: s });
}
writeFileSync(path.join(uit, 'index.json'), JSON.stringify({ gemaakt: new Date().toISOString(), bron: bron.code, weg: werkbank.weg, instellingen: basis, beelden: index }, null, 1));
await werkbank.sluit();
const fouten = [...new Set(werkbank.fouten)];
if (fouten.length) console.log(`Let op: de pagina gaf ${fouten.length} fout(en):\n  ${fouten.slice(0, 5).join('\n  ')}`);
console.log(`${index.length} beelden in ${path.relative(process.cwd(), uit)} (${nieuw} nieuw getekend, ${index.length - nieuw} ongewijzigd)`);
process.exit(fouten.length ? 1 : 0);
