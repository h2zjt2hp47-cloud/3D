/**
 * Meet per lichtsfeer hoe helder de bovenkant en de voorkant van een blok zijn tegenover zijn staalkleur.
 *
 *   npm run lichtmeting                       zetelweergave: ijkblokken in stof (wit, middengrijs, petrol), alle sferen
 *   npm run lichtmeting -- --bron ijk-bouw    bouwweergave (woning, raam, inrichting): pleister, dak, kunststof
 *   npm run lichtmeting -- --bron zetels --items kanto     een item uit een andere bron (met een staalkleur)
 *   npm run lichtmeting -- --streng           afsluitcode 1 als een sfeer buiten de band valt (voor een controle vooraf)
 *
 * Waarom: een kleur moet er in 3D uitzien zoals op de staal. Is de bovenkant veel helderder, dan brandt een licht vlak
 * uit en zie je de vorm niet meer (gevonden op 11/11 bij de zetels, daarna ook in de bouwdemo). De band: bovenkant 1,1
 * tot 1,7 keer de staal, voorkant 0,55 tot 1,1 keer. Avond valt er bewust buiten (gedimd licht). Wit kan niet helderder
 * dan wit: daar telt of het niet uitbrandt en of de voorkant leesbaar blijft.
 * Bijstellen: ZETEL_LICHT (zetel) of BOUW_LICHT (bouw) in packages/demo-web/src/drie-d.ts, daarna opnieuw meten.
 */
import { bouwWerkbank, kiesBron, kiesItems, leesInstellingen, leesItems, leesOpties, lijst, openWerkbank } from './werkbank.mjs';

const o = leesOpties();
const BAND = { boven: [1.1, 1.7], voor: [0.55, 1.1] };
const lineair = (v) => Math.pow(v / 255, 2.2);
const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const oordeel = (waarde, [min, max]) => (waarde < min ? 'te donker' : waarde > max ? 'te fel' : 'goed');

bouwWerkbank(o);
const werkbank = await openWerkbank({ weg: o.weg });
const bron = await kiesBron(werkbank.pagina, o.bron ?? 'ijk');
const standaard = bron.code === 'ijk' ? 'stof_wit,stof_grijs,stof_petrol' : bron.code === 'ijk-bouw' ? 'gevel_wit,gevel_grijs,dak_antraciet,kunststof_wit' : undefined;
const items = kiesItems(await leesItems(werkbank.pagina, bron.code), { items: o.items ?? standaard, groep: o.groep }).filter((i) => i.kleur);
if (!items.length) { console.error('Geen items met een staalkleur in deze keuze.'); process.exit(2); }
const lichten = (await leesInstellingen(werkbank.pagina)).lichten.filter((l) => !o.licht || lijst(o.licht).includes(l.waarde));

let buiten = 0;
console.log(`\nLichtmeting ${bron.titel} · ${werkbank.label} (bovenkant en voorkant tegenover de staal; band ${BAND.boven.join('–')} en ${BAND.voor.join('–')})\n`);
console.log('lichtsfeer'.padEnd(30) + 'item'.padEnd(20) + 'bovenkant'.padEnd(28) + 'voorkant');
for (const l of lichten) for (const item of items) {
  const m = await werkbank.pagina.evaluate(([b, c, licht]) => window.__werkbank.meetLicht(b, c, { licht }), [bron.code, item.code, l.waarde]);
  if (!m) { console.log(l.label.padEnd(30) + item.naam.padEnd(20) + 'niet gemeten'); continue; }
  const wit = lineair(parseInt(item.kleur.slice(3, 5), 16)) > 0.7;
  const ob = wit ? (m.boven[1] > 250 ? 'brandt uit' : 'goed') : oordeel(m.keerBoven, BAND.boven);
  // Een donkere kleur (antraciet, zwart) zakt aan de schaduwkant dieper weg: de toonmapping trekt donkere tinten omlaag.
  const donker = lineair(parseInt(item.kleur.slice(3, 5), 16)) < 0.08;
  const ov = wit ? (m.keerVoor < 0.45 ? 'te donker' : 'goed') : oordeel(m.keerVoor, donker ? [0.3, BAND.voor[1]] : BAND.voor);
  const bewust = l.waarde === 'avond';
  if (!bewust && (ob !== 'goed' || ov !== 'goed')) buiten++;
  console.log(l.label.padEnd(30) + item.naam.padEnd(20) + `${hex(m.boven)} ${m.keerBoven.toFixed(2)} × ${bewust ? '(gedimd)' : ob}`.padEnd(28) + `${hex(m.voor)} ${m.keerVoor.toFixed(2)} × ${bewust ? '(gedimd)' : ov}`);
}
await werkbank.sluit();
console.log(buiten ? `\n${buiten} meting(en) buiten de band: stel ${bron.weergave === 'zetel' ? 'ZETEL_LICHT' : 'BOUW_LICHT'} in packages/demo-web/src/drie-d.ts bij en meet opnieuw.` : '\nAlle lichtsferen binnen de band.');
process.exit(o.streng && buiten ? 1 : 0);
