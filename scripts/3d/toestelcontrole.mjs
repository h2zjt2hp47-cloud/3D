/**
 * Toestelcontrole: meet de 3D-weergave zelf, per rekenweg, en vergelijkt de wegen met elkaar.
 *
 *   npm run toestelcontrole                    alle wegen die hier werken (snel, webgl2, webgpu) + vergelijking
 *   npm run toestelcontrole -- --weg webgpu    alleen die weg
 *   npm run toestelcontrole -- --streng        afsluitcode 1 bij een afwijking (voor een controle vooraf)
 *
 * Wat het nagaat:
 *  1. Rapport per weg (hetzelfde als de knop "Toestelcontrole" op de werkbankpagina, die je op de M5 kunt starten):
 *     tijd per beeld, tekenbeurten, of het geheugen stabiel blijft, en het licht tegenover de staal.
 *  2. Wachten klopt: het beeld vlak na "het beeld is af" is hetzelfde als het beeld enkele seconden later. Anders nam het
 *     gereedschap halve beelden.
 *  3. De wegen geven hetzelfde beeld: WebGL2 (de terugval, waarop de beeldvergelijking draait) tegenover WebGPU (de weg
 *     van de M5). Een groot verschil is een fout die je in de cloud anders nooit zou zien.
 *  4. Samenvoegen klopt: de bouwweergave voegt onderdelen met hetzelfde materiaal samen (veel minder tekenopdrachten);
 *     het beeld moet hetzelfde zijn als onderdeel per onderdeel getekend.
 *
 *  5. Geen meldingen van de grafische kaart bij gewone handelingen (ander model, formaat, decor, licht, kwaliteit).
 *
 * Uitvoer in werkbank/wegen/: per item een strook webgl2 | webgpu | verschil.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { WEGEN, WERKBANK, bouwWerkbank, leesOpties, naamVoorBestand, neemBeeld, openWerkbank } from './werkbank.mjs';

const o = leesOpties();
const PROEVEN = [['zetels', 'kotor'], ['zetels', 'doha'], ['zetels', 'pebble'], ['zetels', 'stockholm'], ['inrichting', 'bank3'], ['ramen', 'P4'], ['woning', 'woning']];
/** Bouwweergave: deze items moeten samengevoegd (één vorm per materiaal) hetzelfde beeld geven als onderdeel per onderdeel. */
const SAMENGEVOEGD = [['woning', 'woning'], ['woning', 'binnenkijk'], ['ramen', 'P4'], ['inrichting', 'keuken']];
/** Deel van de pixels dat tussen twee wegen mag verschillen (randen worden anders afgevlakt, zachte schaduw korrelt anders). */
const MAX_VERSCHIL_WEGEN = 0.03;
let afwijkingen = 0;

bouwWerkbank(o);
const wegen = o.weg ? [o.weg] : Object.keys(WEGEN);
const beelden = {};
for (const weg of wegen) {
  let w;
  try { w = await openWerkbank({ weg }); } catch (fout) { console.log(`\n${WEGEN[weg]?.label ?? weg}: niet beschikbaar (${String(fout.message).split('\n')[0]})`); continue; }
  if (w.weg !== weg) { console.log(`\n${WEGEN[weg].label}: niet beschikbaar in deze omgeving`); await w.sluit(); continue; }
  console.log(`\n=== ${w.label} ===`);
  const bestaat = async ([bron, code]) => (await w.pagina.evaluate(([b]) => window.__werkbank.items(b).map((i) => i.code), [bron])).includes(code);
  const proeven = [];
  for (const p of PROEVEN) if (await bestaat(p)) proeven.push(p);

  // 2. Wachten klopt: beeld vlak na stil() tegenover het beeld 2,5 s later.
  let stilFout = 0;
  for (const [bron, code] of proeven) {
    const paar = await w.pagina.evaluate(async ([b, c]) => {
      await window.__werkbank.toon(b, c, { breedte: 600 });
      const nu = window.__werkbank.beeld('image/png');
      await new Promise((r) => setTimeout(r, 2500));
      return [nu, window.__werkbank.beeld('image/png')];
    }, [bron, code]);
    const [a, b] = paar.map((u) => PNG.sync.read(Buffer.from(u.split(',')[1], 'base64')));
    const anders = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 }) / (a.width * a.height);
    if (anders > 0.0005) { stilFout++; console.log(`  wachten: ${bron}/${code} verandert nog na "af" (${(anders * 100).toFixed(2)} % van het beeld)`); }
  }
  console.log(stilFout ? `  Wachten: ${stilFout} van ${proeven.length} beelden veranderen nog na "af".` : `  Wachten klopt: ${proeven.length} beelden zijn af zodra de pagina het meldt.`);
  afwijkingen += stilFout;

  // 1. Rapport van de weergave zelf.
  const rapport = await w.pagina.evaluate(() => window.__werkbank.toestelcontrole());
  for (const regel of rapport.regels) console.log('  ' + regel);
  if (rapport.regels.some((r) => /lek/.test(r))) afwijkingen++;

  // 5. Geen meldingen van de grafische kaart bij gewone handelingen. Een melding (bv. een textuur die al weg is en toch
  //    nog gebruikt wordt) kost op zijn minst één beeld; in Safari kan het beeld erdoor blijven hangen. Per handeling
  //    apart, zodat je ziet welke de melding geeft.
  const meldingen = [];
  const stap = async (naam, bron, code, opties) => {
    const voor = w.fouten.length;
    await w.pagina.evaluate(async ([b, c, o]) => { await window.__werkbank.toon(b, c, o); window.__werkbank.beeld('image/jpeg', 0.5); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }, [bron, code, opties]);
    const nieuw = w.fouten.slice(voor).filter((f) => /GPUValidationError|WebGL|GL_INVALID|Destroyed|device lost/i.test(f));
    if (nieuw.length) meldingen.push(`${naam}: ${nieuw[0].replace(/^THREE\.\w+: /, '').slice(0, 150)}`);
  };
  if (await bestaat(['zetels', 'kotor'])) {
    await stap('begin', 'zetels', 'kotor', { kwaliteit: 'mooi', breedte: 800 });
    await stap('ander model', 'zetels', 'pebble', { kwaliteit: 'mooi', breedte: 800 });
    await stap('terug naar het eerste model', 'zetels', 'kotor', { kwaliteit: 'mooi', breedte: 800 });
    await stap('ander formaat', 'zetels', 'kotor', { kwaliteit: 'mooi', breedte: 620 });
    await stap('zelfde formaat opnieuw', 'zetels', 'kotor', { kwaliteit: 'mooi', breedte: 620 });
    await stap('ander decor', 'zetels', 'kotor', { kwaliteit: 'mooi', breedte: 620, decor: 'salon' });
    await stap('ander licht', 'zetels', 'kotor', { kwaliteit: 'mooi', breedte: 620, decor: 'salon', licht: 'daglicht' });
    await stap('kwaliteit snel', 'zetels', 'kotor', { kwaliteit: 'snel', breedte: 620 });
    await stap('kwaliteit mooi', 'zetels', 'kotor', { kwaliteit: 'mooi', breedte: 620 });
  }
  if (await bestaat(['woning', 'woning'])) {
    await stap('bouw: woning', 'woning', 'woning', { kwaliteit: 'mooi', breedte: 800 });
    await stap('bouw: ander formaat', 'woning', 'woning', { kwaliteit: 'mooi', breedte: 620 });
    await stap('bouw: kwaliteit snel', 'woning', 'woning', { kwaliteit: 'snel', breedte: 620 });
  }
  console.log(meldingen.length ? `  Meldingen van de grafische kaart bij ${meldingen.length} handeling(en):` : '  Geen meldingen van de grafische kaart bij gewone handelingen (model, formaat, decor, licht, kwaliteit).');
  for (const m of meldingen) console.log('    ' + m);
  afwijkingen += meldingen.length;

  // Beelden voor de vergelijking van de wegen.
  beelden[weg] = {};
  for (const [bron, code] of proeven) beelden[weg][`${bron}/${code}`] = (await neemBeeld(w, bron, code, { breedte: 600, type: 'image/png' }, { vers: true })).beeld;
  if (w.fouten.length) console.log(`  Meldingen van de pagina: ${[...new Set(w.fouten)].slice(0, 3).join(' | ')}`);
  await w.sluit();
}

// 4. Samenvoegen in de bouwweergave: zelfde beeld, veel minder tekenopdrachten.
if (!o.weg || o.weg !== 'webgpu') {
  const metingen = {};
  for (const los of [false, true]) {
    const w = await openWerkbank({ weg: o.weg, los });
    for (const [bron, code] of SAMENGEVOEGD) {
      const r = await neemBeeld(w, bron, code, { breedte: 600, type: 'image/png', kwaliteit: 'snel' }, { vers: true });
      (metingen[`${bron}/${code}`] ??= {})[los ? 'los' : 'samen'] = r;
    }
    await w.sluit();
  }
  console.log('\n=== Bouwweergave: samengevoegd tegenover onderdeel per onderdeel ===');
  for (const [sleutel, m] of Object.entries(metingen)) {
    const a = PNG.sync.read(m.samen.beeld), b = PNG.sync.read(m.los.beeld);
    const verschil = new PNG({ width: a.width, height: a.height });
    // Drempel 0,2 per pixel (was 0,1): met reliëf op het metselwerk verschilt de schaduw in een voeg hier en daar een
    // tint (afronding bij het samenvoegen); een onderdeel dat ontbreekt of verschuift geeft een veel groter kleurverschil.
    const anders = pixelmatch(a.data, b.data, verschil.data, a.width, a.height, { threshold: 0.2 }) / (a.width * a.height);
    const goed = anders <= 0.002;
    if (!goed) {
      afwijkingen++;
      // Strook samengevoegd | los | verschil, om te zien waar het zit.
      const map = path.join(WERKBANK, 'wegen');
      mkdirSync(map, { recursive: true });
      const strook = new PNG({ width: a.width * 3, height: a.height });
      [a, b, verschil].forEach((p, i) => PNG.bitblt(p, strook, 0, 0, a.width, a.height, a.width * i, 0));
      writeFileSync(path.join(map, `samen-${naamVoorBestand(sleutel)}.png`), PNG.sync.write(strook));
    }
    console.log(`  ${sleutel.padEnd(22)} tekenopdrachten ${String(m.los.info.tekenbeurten).padStart(5)} → ${String(m.samen.info.tekenbeurten).padStart(4)} · beeld ${(anders * 100).toFixed(2)} % anders ${goed ? '(gelijk)' : '(VERSCHILT)'}`);
  }
}

// 3. De wegen tegenover elkaar.
const basis = beelden.webgl2 ? 'webgl2' : beelden.snel ? 'snel' : null;
if (basis && beelden.webgpu) {
  const map = path.join(WERKBANK, 'wegen');
  mkdirSync(map, { recursive: true });
  console.log(`\n=== ${WEGEN[basis].label} tegenover ${WEGEN.webgpu.label} ===`);
  for (const sleutel of Object.keys(beelden[basis])) {
    const a = PNG.sync.read(beelden[basis][sleutel]), b = PNG.sync.read(beelden.webgpu[sleutel]);
    if (a.width !== b.width || a.height !== b.height) { console.log(`  ${sleutel.padEnd(28)} ander formaat`); afwijkingen++; continue; }
    const verschil = new PNG({ width: a.width, height: a.height });
    const anders = pixelmatch(a.data, b.data, verschil.data, a.width, a.height, { threshold: 0.12 }) / (a.width * a.height);
    const strook = new PNG({ width: a.width * 3, height: a.height });
    [a, b, verschil].forEach((p, i) => PNG.bitblt(p, strook, 0, 0, a.width, a.height, a.width * i, 0));
    writeFileSync(path.join(map, `${naamVoorBestand(sleutel)}.png`), PNG.sync.write(strook));
    const goed = anders <= MAX_VERSCHIL_WEGEN;
    if (!goed) afwijkingen++;
    console.log(`  ${sleutel.padEnd(28)} ${(anders * 100).toFixed(2).padStart(6)} % anders  ${goed ? 'gelijk' : 'VERSCHILT: bekijk ' + path.relative(process.cwd(), path.join(map, naamVoorBestand(sleutel) + '.png'))}`);
  }
}
console.log(afwijkingen ? `\n${afwijkingen} afwijking(en).` : '\nAlles in orde.');
process.exit(o.streng && afwijkingen ? 1 : 0);
