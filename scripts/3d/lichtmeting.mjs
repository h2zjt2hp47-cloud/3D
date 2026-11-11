/**
 * Meet per lichtsfeer hoe helder de bovenkant en de voorkant van een blok zijn tegenover de staal van de stof.
 *
 *   npm run lichtmeting                 alle lichtsferen, middengrijs en wit
 *   npm run lichtmeting -- --streng     afsluitcode 1 als een sfeer buiten de band valt (voor een controle vooraf)
 *
 * Waarom: een stof moet er in 3D uitzien zoals op de staal. Is de bovenkant veel helderder, dan brandt een lichte zetel
 * uit en zie je de vorm niet meer (gevonden op 11/11). De band: bovenkant 1,1 tot 1,7 keer de staal, voorkant 0,55 tot
 * 1,1 keer. Avond valt er bewust buiten (gedimd licht). Gemeten op een vierkante poef, recht van voren, kwaliteit Snel.
 */
import { bouwDemo, kiesModellen, leesLijst, leesModellen, leesOpties, leesStoffen, neemBeeld, openDemo, openModel, zetInstellingen } from './werkbank.mjs';

const o = leesOpties();
const BAND = { boven: [1.1, 1.7], voor: [0.55, 1.1] };
const STOFFEN = ['wol_grijs', 'katoen_kalk'];
const lineair = (v) => Math.pow(v / 255, 2.2);

bouwDemo(o);
const { browser, pagina } = await openDemo();
const blok = kiesModellen(await leesModellen(pagina), { modellen: o.model ?? 'kanto' })[0];
const stoffen = (await leesStoffen(pagina)).filter((s) => STOFFEN.includes(s.code));
const lichten = await leesLijst(pagina, 'licht');

/** Gemiddelde kleur van de bovenkant en de voorkant langs de middelste kolom van het beeld (in de pagina gemeten). */
const meet = (png) => pagina.evaluate(async (b64) => {
  const beeld = new Image();
  beeld.src = 'data:image/png;base64,' + b64;
  await beeld.decode();
  const c = document.createElement('canvas');
  c.width = beeld.width; c.height = beeld.height;
  const g = c.getContext('2d');
  g.drawImage(beeld, 0, 0);
  const x = Math.floor(c.width / 2), d = g.getImageData(x - 3, 0, 7, c.height).data;
  const rij = (y) => [0, 1, 2].map((k) => { let s = 0; for (let i = 0; i < 7; i++) s += d[(y * 7 + i) * 4 + k]; return s / 7; });
  const achtergrond = rij(5);
  const object = [];
  for (let y = 0; y < c.height; y++) { const r = rij(y); if (Math.abs(r[0] - achtergrond[0]) + Math.abs(r[1] - achtergrond[1]) + Math.abs(r[2] - achtergrond[2]) > 24) object.push(y); }
  if (!object.length) return null;
  const y0 = object[0], y1 = object[object.length - 1];
  const gem = (a, b) => { const uit = [0, 0, 0]; let n = 0; for (let y = Math.round(y0 + (y1 - y0) * a); y < Math.round(y0 + (y1 - y0) * b); y++, n++) rij(y).forEach((v, k) => { uit[k] += v; }); return uit.map((v) => v / Math.max(1, n)); };
  return { boven: gem(0.08, 0.3), voor: gem(0.55, 0.8) };
}, png.toString('base64'));

const hex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const oordeel = (waarde, [min, max]) => (waarde < min ? 'te donker' : waarde > max ? 'te fel' : 'goed');
let buiten = 0;
console.log(`\nLichtmeting op ${blok.naam} (bovenkant en voorkant tegenover de staal; band ${BAND.boven.join('–')} en ${BAND.voor.join('–')})\n`);
console.log('lichtsfeer'.padEnd(30) + 'stof'.padEnd(22) + 'bovenkant'.padEnd(26) + 'voorkant');
for (const l of lichten) for (const s of stoffen) {
  await openModel(pagina, blok);
  await zetInstellingen(pagina, { licht: l.waarde, kwaliteit: 'snel', stof: s.code });
  const m = await meet(await neemBeeld(pagina, { kijk: [0, 0.5, 125], breedte: 360, type: 'image/png' }));
  if (!m) { console.log(l.label.padEnd(30) + s.naam.padEnd(22) + 'niet gemeten'); continue; }
  const staal = [1, 3, 5].map((i) => parseInt(s.kleur.slice(i, i + 2), 16));
  // Verhouding in lineair licht, op het groene kanaal (het dichtst bij helderheid).
  const keer = (rgb) => lineair(rgb[1]) / lineair(staal[1]);
  const b = keer(m.boven), v = keer(m.voor);
  // Wit kan niet helderder dan wit: daar telt alleen of het niet uitbrandt en of de voorkant leesbaar blijft.
  const wit = lineair(staal[1]) > 0.7;
  const ob = wit ? (m.boven[1] > 250 ? 'brandt uit' : 'goed') : oordeel(b, BAND.boven), ov = wit ? (v < 0.45 ? 'te donker' : 'goed') : oordeel(v, BAND.voor);
  const bewust = l.waarde === 'avond';
  if (!bewust && (ob !== 'goed' || ov !== 'goed')) buiten++;
  console.log(l.label.padEnd(30) + s.naam.padEnd(22) + `${hex(m.boven)} ${b.toFixed(2)} × ${bewust ? '(gedimd)' : ob}`.padEnd(26) + `${hex(m.voor)} ${v.toFixed(2)} × ${bewust ? '(gedimd)' : ov}`);
}
await browser.close();
console.log(buiten ? `\n${buiten} meting(en) buiten de band: stel ZETEL_LICHT in packages/demo-web/src/drie-d.ts bij en meet opnieuw.` : '\nAlle lichtsferen binnen de band.');
process.exit(o.streng && buiten ? 1 : 0);
