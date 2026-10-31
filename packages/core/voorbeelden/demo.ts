/**
 * Demo: bereken een configuratie en toon het resultaat.
 *
 *   npm run demo                                   kast op maat, standaardkeuzes
 *   npm run demo -- kast breedte=2400 deurtype=schuifdeuren materiaal=fineer_eik
 *   npm run demo -- sofa opstelling=hoek_links breedte=283 zijlengte=215 stof=boucle_belize korting=20
 *
 * De tekening wordt bewaard als kast.svg of sofa.svg.
 *
 * `korting=` is de klantkorting in procent (bv. voor interieurinrichters).
 */
import { writeFileSync } from 'node:fs';
import { berekenConfiguratie, controleerModel, tekenSvg, type Prijslijst, type ProductModel } from '../src/index.js';
import { demoPrijslijst, maatkast } from './maatkast.js';
import { sofa, sofaPrijslijst } from './sofa.js';

const producten: Record<string, [ProductModel, Prijslijst]> = {
  kast: [maatkast, demoPrijslijst],
  sofa: [sofa, sofaPrijslijst],
};
const args = process.argv.slice(2);
const keuze = args[0] && !args[0].includes('=') ? args.shift()! : 'kast';
const gekozen = producten[keuze];
if (!gekozen) {
  console.error(`Onbekend product "${keuze}". Kies uit: ${Object.keys(producten).join(', ')}`);
  process.exit(1);
}
const [model, prijslijst] = gekozen;

const problemen = controleerModel(model);
if (problemen.length) {
  console.error('Problemen in het productmodel:', problemen);
  process.exit(1);
}

const paren = args.map((a) => a.split('=') as [string, string]);
const korting = Number(paren.find(([k]) => k === 'korting')?.[1] ?? 0);
const keuzes = Object.fromEntries(paren.filter(([k]) => k !== 'korting'));
const r = berekenConfiguratie(model, keuzes, prijslijst, { kortingProcent: korting });

const eur = (x: number) => `€ ${x.toFixed(2).replace('.', ',')}`;

console.log(`\n${model.naam} (versie ${r.versie}) — ${r.geldig ? 'GELDIG' : 'NIET GELDIG'}\n`);
for (const s of r.samenvatting) console.log('  ' + s);
if (r.meldingen.length) {
  console.log('\nMeldingen:');
  for (const m of r.meldingen) console.log(`  [${m.ernst}] ${m.melding}`);
}
console.log('\nStuklijst:');
console.table(
  r.stuklijst.map((s) => ({
    onderdeel: s.omschrijving,
    artikel: s.artikel,
    aantal: s.aantal,
    maat: s.lengte !== undefined ? `${s.lengte}${s.breedte !== undefined ? ' × ' + s.breedte : ''}` : '',
    hoeveelheid: `${s.hoeveelheid} ${s.eenheid}`,
    kost: eur(s.kost),
  })),
);
console.log(`Prijsmethode:       ${r.prijs.methode === 'lijstprijs' ? 'lijstprijs (prijstabel)' : 'kostprijs + opslag'}`);
console.log(`Kostprijs:          ${eur(r.prijs.kostprijs)}`);
console.log(`Brutoprijs excl.:   ${eur(r.prijs.brutoprijsExcl)}`);
if (r.prijs.kortingProcent) console.log(`Korting:            ${r.prijs.kortingProcent}%`);
console.log(`Verkoopprijs excl.: ${eur(r.prijs.verkoopprijsExcl)}   (marge ${r.prijs.margeProcent ?? '—'}%)`);
console.log(`Verkoopprijs incl.: ${eur(r.prijs.verkoopprijsIncl)}\n`);

if (r.afgeleid.stofverbruik !== undefined) {
  console.log(`Stofverbruik:       ${r.afgeleid.stofverbruik} m${r.afgeleid.stofverbruik_contrast ? ` + ${r.afgeleid.stofverbruik_contrast} m contraststof` : ''}`);
}
if (r.tekening) {
  const bestand = `${keuze}.svg`;
  writeFileSync(bestand, tekenSvg(r.tekening, { achtergrond: '#ffffff' }));
  console.log(`Tekening:           ${bestand}\n`);
}
