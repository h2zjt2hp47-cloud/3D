/**
 * Maakt galerij.html met tekeningen en prijzen van verschillende configuraties.
 * Uitvoeren:  npm run galerij
 */
import { writeFileSync } from 'node:fs';
import { berekenConfiguratie, tekenSvg, type Keuzes, type Prijslijst, type ProductModel } from '../src/index.js';
import { demoPrijslijst, maatkast } from './maatkast.js';
import { sofa, sofaPrijslijst } from './sofa.js';

const voorbeelden: [string, ProductModel, Prijslijst, Keuzes][] = [
  ['Rechte sofa 230 cm, linnen Ficelle', sofa, sofaPrijslijst, {}],
  ['Rechte sofa 337 cm, ronde arm, bouclé', sofa, sofaPrijslijst, { breedte: 337, model: 'rond', stof: 'boucle_belize' }],
  ['Chaise longue rechts, 264 × 172 cm', sofa, sofaPrijslijst, { opstelling: 'chaise_rechts', breedte: 264, zijlengte: 172, stof: 'linnen_brume' }],
  ['Hoeksofa links 283 × 215 cm, contrastkussens', sofa, sofaPrijslijst, { opstelling: 'hoek_links', breedte: 283, zijlengte: 215, stof: 'jacquard_ruit', contrast: true, contraststof: 'linnen_brume' }],
  ['Hoeksofa rechts 310 × 260 cm, diep, ronde arm', sofa, sofaPrijslijst, { opstelling: 'hoek_rechts', breedte: 310, zijlengte: 260, zitdiepte: 'diep', model: 'rond', stof: 'linnen_travertin' }],
  ['Kast 1200 mm, draaideuren, melamine wit', maatkast, demoPrijslijst, {}],
  ['Kast 2400 mm, 3 vakken, schuifdeuren, eikfineer', maatkast, demoPrijslijst, { breedte: 2400, vakken: 3, deurtype: 'schuifdeuren', materiaal: 'fineer_eik', greep: 'lijstgreep' }],
  ['Open kast 1800 mm, 4 vakken, eikdecor', maatkast, demoPrijslijst, { breedte: 1800, vakken: 4, legplanken: 5, deurtype: 'geen', materiaal: 'melamine_eik' }],
];

const eur = (x: number) => `€ ${x.toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const kaarten = voorbeelden.map(([titel, model, prijslijst, keuzes]) => {
  const r = berekenConfiguratie(model, keuzes, prijslijst);
  const meldingen = r.meldingen.map((m) => `<li class="${m.ernst}">${m.melding}</li>`).join('');
  const stof = r.afgeleid.stofverbruik ? `<p>Stofverbruik: ${r.afgeleid.stofverbruik} m${r.afgeleid.stofverbruik_contrast ? ` + ${r.afgeleid.stofverbruik_contrast} m` : ''}</p>` : '';
  return `<article><h2>${titel}</h2>${r.tekening ? tekenSvg(r.tekening, { breedtePx: 520 }) : ''}
  <p class="prijs">${eur(r.prijs.verkoopprijsExcl)} excl. btw <span>(marge ${r.prijs.margeProcent}%)</span></p>${stof}
  ${meldingen ? `<ul>${meldingen}</ul>` : ''}</article>`;
});

writeFileSync(
  'galerij.html',
  `<!doctype html><html lang="nl"><meta charset="utf-8"><title>Configurator — galerij (demoprijzen)</title>
<style>body{font-family:system-ui,sans-serif;background:#efebe4;color:#2b2a26;margin:2rem}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(560px,1fr));gap:1.5rem}
article{background:#fff;padding:1rem 1.25rem;border-radius:6px}h2{font-size:1rem;margin:.2rem 0 .8rem}
svg{max-width:100%;height:auto}.prijs{font-weight:600}.prijs span{font-weight:400;color:#777}
li.fout{color:#a33}li.waarschuwing{color:#8a6a1f}</style>
<h1>Configurator — galerij</h1><p>Alle prijzen zijn verzonnen (demo).</p><main>${kaarten.join('\n')}</main></html>`,
);
console.log('galerij.html gemaakt');
