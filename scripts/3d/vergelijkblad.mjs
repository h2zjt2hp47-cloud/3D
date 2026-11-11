/**
 * Vergelijkblad: per item de referentiefoto naast onze 3D uit een paar standpunten, enkele items per blad (jpg).
 * Voor een snelle, kritische blik op een hele groep; het controleblad is voor het oordeel van de klant.
 *
 *   npm run vergelijkblad -- --groep Fauteuils                     foto | schuin | voor, vier items per blad
 *   npm run vergelijkblad -- --items pebble,karl --standpunten schuin,voor,rechts,boven
 *   npm run vergelijkblad -- --bron inrichting --per 6
 *   npm run vergelijkblad -- --items ross --bronfotos --standpunten schuin,voor,rechts,achter
 *        met alle foto's van de productpagina erboven (eerst ophalen: python3 -I scripts/3d/modelfotos.py --paginas ross);
 *        heet de pagina anders dan het model: --pagina <naam>
 *
 * Verder: --decor, --licht, --vormen blokken|zacht, --kwaliteit, --weg, --vers, --zonder-bouw.
 * Uitvoer: werkbank/bladen/<bron>-<nr>.jpg (niet in git).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, WERKBANK, bouwWerkbank, kiesBron, kiesItems, leesItems, leesOpties, lijst, maakBlad, naamVoorBestand, neemBeeld, openWerkbank } from './werkbank.mjs';

const o = leesOpties();
bouwWerkbank(o);
const werkbank = await openWerkbank({ weg: o.weg });
const bron = await kiesBron(werkbank.pagina, o.bron);
const items = kiesItems(await leesItems(werkbank.pagina, bron.code), o);
if (!items.length) { console.error('Geen items gevonden voor deze keuze.'); process.exit(2); }
const standpunten = lijst(o.standpunten ?? 'schuin,voor');
const basis = { decor: o.decor ?? 'studio', licht: o.licht ?? 'studio', kwaliteit: o.kwaliteit ?? 'mooi', vormen: o.vormen ?? 'blokken', breedte: Number(o.breedte ?? 700) };
const per = Number(o.per ?? 4) * (o.bronfotos ? 2 : 1);
const rijen = [];
for (const item of items) {
  const fotoPad = bron.fotomap && item.foto ? path.join(ROOT, bron.fotomap, `${item.foto}.jpg`) : '';
  const beelden = bron.fotomap ? [{ beeld: fotoPad && existsSync(fotoPad) ? readFileSync(fotoPad) : null, label: 'referentiefoto' }] : [];
  for (const kijk of standpunten) beelden.push({ beeld: (await neemBeeld(werkbank, bron.code, item.code, { ...basis, kijk }, { vers: Boolean(o.vers) })).beeld, label: `onze 3D, ${kijk}` });
  const ondertitel = `${item.groep} · ${item.feiten.slice(0, 3).map(([l, w]) => `${l}: ${w}`).join(' · ')}`;
  if (o.bronfotos) {
    // Alle foto's van de productpagina (fotos-bron/<pagina>/1.jpg …) op een eigen rij boven onze 3D.
    const map = path.join(ROOT, 'fotos-bron', typeof o.pagina === 'string' ? o.pagina : item.code);
    const fotos = existsSync(map) ? readdirSync(map).filter((f) => /^\d+\.jpg$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b)).slice(0, Number(o.fotos ?? 6)) : [];
    if (!fotos.length) console.log(`  ${item.naam}: geen foto's in ${path.relative(process.cwd(), map)} (python3 -I scripts/3d/modelfotos.py --paginas ${path.basename(map)})`);
    rijen.push({ titel: item.naam, ondertitel: `${ondertitel} · foto's van de productpagina`, beelden: fotos.map((f) => ({ beeld: readFileSync(path.join(map, f)), label: `foto ${parseInt(f)}` })) });
    rijen.push({ titel: '', ondertitel: 'onze 3D', beelden: beelden.slice(bron.fotomap ? 1 : 0) });
  } else rijen.push({ titel: item.naam, ondertitel, beelden });
}
await werkbank.sluit();
const naam = naamVoorBestand([bron.code, o.groep ?? o.familie ?? '', o.naam ?? ''].filter(Boolean).join('-'));
for (let i = 0; i < rijen.length; i += per) {
  const bestand = await maakBlad(rijen.slice(i, i + per), path.join(WERKBANK, 'bladen', `${naam}-${i / per + 1}.jpg`), o.bronfotos ? { kolomBreedte: 290, hoogte: 215 } : {});
  console.log(`${path.relative(process.cwd(), bestand)}: ${rijen.slice(i, i + per).map((r) => r.titel).filter(Boolean).join(', ')}`);
}
