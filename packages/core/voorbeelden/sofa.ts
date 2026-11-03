/**
 * Voorbeeldproduct: sofa op maat PER CM (zitmeubelen, bv. Corneille & Silence).
 *
 * DEMO: modellen, maten, stofgroepen, stofverbruik en ALLE PRIJZEN ZIJN VERZONNEN.
 * Het echte model wordt in fase 0.2 met de klant opgebouwd.
 *
 * Wat dit voorbeeld toont:
 * - opstellingen: recht, chaise longue links/rechts, hoeksofa links/rechts, met maten per cm;
 * - lijstprijs uit prijstabellen (breedte × stofgroep), per 10 cm-klasse naar boven afgerond;
 * - eigen stof (COM) en eigen leder (COL = COM + 10 %);
 * - contraststof voor de zitkussens: hoogste stofgroep + 5 %;
 * - stofverbruik = basisverbruik × factor patroonrapport × factor rolbreedte;
 * - een 2D-bovenaanzicht met maatlijnen in de stofkleur.
 */
import { CHILL_ZONE_051 } from './stoftexturen.js';
import { collectieVan, materiaalArtikel, weefselVan, type Keuzewaarde, type Materiaal, type Prijslijst, type Prijstabel, type ProductModel } from '../src/index.js';

export const STOFGROEPEN = ['A', 'B', 'C', 'EIGEN'];

/** Standaardmaterialen (demo). De gebruiker kan er zelf bij maken. */
export const standaardMaterialen: Materiaal[] = [
  // Collecties en kleuren zijn DEMO (verzonnen namen, kleuren en prijzen), behalve Chill Zone (echte stofkaart).
  { code: 'katoen_naturel', naam: 'Katoen Naturel', collectie: 'Katoen Basic', weefsel: 'effen', soort: 'stof', groep: 'A', kleur: '#e9e2d3', rapport: 0, rolbreedte: 140, kostprijsPerM: 26, toeslagPct: 0 },
  { code: 'linnen_ficelle', naam: 'Linnen Ficelle', collectie: 'Linnen Lino', weefsel: 'linnen', soort: 'stof', groep: 'B', kleur: '#c9b48f', rapport: 0, rolbreedte: 140, kostprijsPerM: 38, toeslagPct: 0 },
  { code: 'linnen_travertin', naam: 'Linnen Travertin', collectie: 'Linnen Lino', weefsel: 'linnen', soort: 'stof', groep: 'B', kleur: '#d8d2c6', rapport: 0, rolbreedte: 140, kostprijsPerM: 38, toeslagPct: 0 },
  { code: 'linnen_brume', naam: 'Linnen Brume', collectie: 'Linnen Lino', weefsel: 'linnen', soort: 'stof', groep: 'B', kleur: '#a9b3a6', rapport: 0, rolbreedte: 140, kostprijsPerM: 38, toeslagPct: 0 },
  { code: 'boucle_belize', naam: 'Bouclé Écru', collectie: 'Bouclé Nuage', weefsel: 'boucle', soort: 'stof', groep: 'C', kleur: '#ece6da', rapport: 0, rolbreedte: 140, kostprijsPerM: 55, toeslagPct: 0 },
  { code: 'jacquard_ruit', naam: 'Jacquard ruit (patroon 32 cm)', collectie: 'Jacquard', weefsel: 'jacquard', soort: 'stof', groep: 'C', kleur: '#b9a58a', rapport: 32, rolbreedte: 140, kostprijsPerM: 62, toeslagPct: 0 },
  { code: 'velours_petrol', naam: 'Velours Petrol', collectie: 'Velours Soft', weefsel: 'velours', soort: 'stof', groep: 'C', kleur: '#1f6b75', rapport: 0, rolbreedte: 140, kostprijsPerM: 52, toeslagPct: 0 },
  { code: 'velours_bosgroen', naam: 'Velours Bosgroen', collectie: 'Velours Soft', weefsel: 'velours', soort: 'stof', groep: 'C', kleur: '#2f4a3a', rapport: 0, rolbreedte: 140, kostprijsPerM: 52, toeslagPct: 0 },
  { code: 'velours_oudroze', naam: 'Velours Oudroze', collectie: 'Velours Soft', weefsel: 'velours', soort: 'stof', groep: 'C', kleur: '#c98272', rapport: 0, rolbreedte: 140, kostprijsPerM: 52, toeslagPct: 0 },
  // Echte stof (gegevens van de stofkaart van de leverancier); kleur = gemiddelde van de staalfoto, kostprijs en groep verzonnen.
  {
    code: 'chill_zone_051', naam: 'Chill Zone 051 (blauwgrijs)', collectie: 'Chill Zone (Chivasso)', weefsel: 'effen', soort: 'stof', groep: 'C', kleur: '#687281', rapport: 0, rolbreedte: 140, kostprijsPerM: 48, toeslagPct: 0,
    merk: 'Chivasso (JAB Anstoetz)', artikel: 'CH3112/051', kwaliteit: 'Meubelstof, geweven, epinglé / frisé',
    samenstelling: '60% polyacryl, 24% polyester, 11% viscose, 5% linnen', martindale: 50000, opDeRol: true, kleurvarianten: 29,
    // Staalfoto als textuur; de foto toont ongeveer 15 cm stof (benadering).
    textuur: CHILL_ZONE_051, textuurCm: 15,
  },
  { code: 'wol_grijs', naam: 'Wol Grijs gemêleerd', collectie: 'Wol Tweed', weefsel: 'wol', soort: 'stof', groep: 'B', kleur: '#86888a', rapport: 0, rolbreedte: 140, kostprijsPerM: 44, toeslagPct: 0 },
  // Uitbreiding: 15 stoffen in 5 collecties (DEMO).
  { code: 'velours_mosterd', naam: 'Velours Mosterd', collectie: 'Velours Soft', weefsel: 'velours', soort: 'stof', groep: 'C', kleur: '#c08a2e', rapport: 0, rolbreedte: 140, kostprijsPerM: 52, toeslagPct: 0 },
  { code: 'velours_terracotta', naam: 'Velours Terracotta', collectie: 'Velours Soft', weefsel: 'velours', soort: 'stof', groep: 'C', kleur: '#a8533a', rapport: 0, rolbreedte: 140, kostprijsPerM: 52, toeslagPct: 0 },
  { code: 'velours_antraciet', naam: 'Velours Antraciet', collectie: 'Velours Soft', weefsel: 'velours', soort: 'stof', groep: 'C', kleur: '#3a3c40', rapport: 0, rolbreedte: 140, kostprijsPerM: 52, toeslagPct: 0 },
  { code: 'boucle_zand', naam: 'Bouclé Zand', collectie: 'Bouclé Nuage', weefsel: 'boucle', soort: 'stof', groep: 'C', kleur: '#d2bfa0', rapport: 0, rolbreedte: 140, kostprijsPerM: 55, toeslagPct: 0 },
  { code: 'boucle_kiezel', naam: 'Bouclé Kiezel', collectie: 'Bouclé Nuage', weefsel: 'boucle', soort: 'stof', groep: 'C', kleur: '#9c9890', rapport: 0, rolbreedte: 140, kostprijsPerM: 55, toeslagPct: 0 },
  { code: 'boucle_mos', naam: 'Bouclé Mos', collectie: 'Bouclé Nuage', weefsel: 'boucle', soort: 'stof', groep: 'C', kleur: '#7d8160', rapport: 0, rolbreedte: 140, kostprijsPerM: 55, toeslagPct: 0 },
  { code: 'chenille_camel', naam: 'Chenille Camel', collectie: 'Chenille Mila', weefsel: 'chenille', soort: 'stof', groep: 'B', kleur: '#b08a5e', rapport: 0, rolbreedte: 140, kostprijsPerM: 42, toeslagPct: 0 },
  { code: 'chenille_steengrijs', naam: 'Chenille Steengrijs', collectie: 'Chenille Mila', weefsel: 'chenille', soort: 'stof', groep: 'B', kleur: '#7b7a76', rapport: 0, rolbreedte: 140, kostprijsPerM: 42, toeslagPct: 0 },
  { code: 'chenille_nachtblauw', naam: 'Chenille Nachtblauw', collectie: 'Chenille Mila', weefsel: 'chenille', soort: 'stof', groep: 'B', kleur: '#2b3a55', rapport: 0, rolbreedte: 140, kostprijsPerM: 42, toeslagPct: 0 },
  { code: 'wol_havermout', naam: 'Wol Havermout', collectie: 'Wol Tweed', weefsel: 'wol', soort: 'stof', groep: 'B', kleur: '#cdbfa8', rapport: 0, rolbreedte: 140, kostprijsPerM: 44, toeslagPct: 0 },
  { code: 'wol_bordeaux', naam: 'Wol Bordeaux', collectie: 'Wol Tweed', weefsel: 'wol', soort: 'stof', groep: 'B', kleur: '#6e2a33', rapport: 0, rolbreedte: 140, kostprijsPerM: 44, toeslagPct: 0 },
  { code: 'wol_oceaan', naam: 'Wol Oceaan', collectie: 'Wol Tweed', weefsel: 'wol', soort: 'stof', groep: 'B', kleur: '#3f6178', rapport: 0, rolbreedte: 140, kostprijsPerM: 44, toeslagPct: 0 },
  { code: 'rib_cognac', naam: 'Rib Cognac', collectie: 'Rib Cord', weefsel: 'rib', soort: 'stof', groep: 'B', kleur: '#9a5a2e', rapport: 0, rolbreedte: 140, kostprijsPerM: 46, toeslagPct: 0 },
  { code: 'rib_salie', naam: 'Rib Salie', collectie: 'Rib Cord', weefsel: 'rib', soort: 'stof', groep: 'B', kleur: '#9aa58c', rapport: 0, rolbreedte: 140, kostprijsPerM: 46, toeslagPct: 0 },
  { code: 'rib_inkt', naam: 'Rib Inkt', collectie: 'Rib Cord', weefsel: 'rib', soort: 'stof', groep: 'B', kleur: '#252a35', rapport: 0, rolbreedte: 140, kostprijsPerM: 46, toeslagPct: 0 },
  // Tweede uitbreiding: 30 stoffen (DEMO: namen, kleuren en prijzen verzonnen).
  { code: 'linnen_klei', naam: 'Linnen Klei', collectie: 'Linnen Lino', weefsel: 'linnen', soort: 'stof', groep: 'B', kleur: '#b98b6e', rapport: 0, rolbreedte: 140, kostprijsPerM: 38, toeslagPct: 0 },
  { code: 'linnen_olijf', naam: 'Linnen Olijf', collectie: 'Linnen Lino', weefsel: 'linnen', soort: 'stof', groep: 'B', kleur: '#8a8a5c', rapport: 0, rolbreedte: 140, kostprijsPerM: 38, toeslagPct: 0 },
  { code: 'linnen_indigo', naam: 'Linnen Indigo', collectie: 'Linnen Lino', weefsel: 'linnen', soort: 'stof', groep: 'B', kleur: '#3c4f6e', rapport: 0, rolbreedte: 140, kostprijsPerM: 38, toeslagPct: 0 },
  { code: 'katoen_kalk', naam: 'Katoen Kalkwit', collectie: 'Katoen Basic', weefsel: 'effen', soort: 'stof', groep: 'A', kleur: '#f1eee6', rapport: 0, rolbreedte: 140, kostprijsPerM: 26, toeslagPct: 0 },
  { code: 'katoen_kaki', naam: 'Katoen Kaki', collectie: 'Katoen Basic', weefsel: 'effen', soort: 'stof', groep: 'A', kleur: '#a39a78', rapport: 0, rolbreedte: 140, kostprijsPerM: 26, toeslagPct: 0 },
  { code: 'katoen_rookblauw', naam: 'Katoen Rookblauw', collectie: 'Katoen Basic', weefsel: 'effen', soort: 'stof', groep: 'A', kleur: '#7d8ea0', rapport: 0, rolbreedte: 140, kostprijsPerM: 26, toeslagPct: 0 },
  { code: 'chenille_roest', naam: 'Chenille Roest', collectie: 'Chenille Mila', weefsel: 'chenille', soort: 'stof', groep: 'B', kleur: '#9c4f2d', rapport: 0, rolbreedte: 140, kostprijsPerM: 42, toeslagPct: 0 },
  { code: 'chenille_pistache', naam: 'Chenille Pistache', collectie: 'Chenille Mila', weefsel: 'chenille', soort: 'stof', groep: 'B', kleur: '#a7ad7d', rapport: 0, rolbreedte: 140, kostprijsPerM: 42, toeslagPct: 0 },
  { code: 'chenille_parel', naam: 'Chenille Parel', collectie: 'Chenille Mila', weefsel: 'chenille', soort: 'stof', groep: 'B', kleur: '#ddd6ca', rapport: 0, rolbreedte: 140, kostprijsPerM: 42, toeslagPct: 0 },
  { code: 'rib_mosterd', naam: 'Rib Mosterd', collectie: 'Rib Cord', weefsel: 'rib', soort: 'stof', groep: 'B', kleur: '#b9892c', rapport: 0, rolbreedte: 140, kostprijsPerM: 46, toeslagPct: 0 },
  { code: 'rib_poederroze', naam: 'Rib Poederroze', collectie: 'Rib Cord', weefsel: 'rib', soort: 'stof', groep: 'B', kleur: '#c99a95', rapport: 0, rolbreedte: 140, kostprijsPerM: 46, toeslagPct: 0 },
  { code: 'rib_chocolade', naam: 'Rib Chocolade', collectie: 'Rib Cord', weefsel: 'rib', soort: 'stof', groep: 'B', kleur: '#5b4031', rapport: 0, rolbreedte: 140, kostprijsPerM: 46, toeslagPct: 0 },
  { code: 'teddy_ivoor', naam: 'Teddy Ivoor', collectie: 'Bouclé Teddy', weefsel: 'boucle', soort: 'stof', groep: 'C', kleur: '#efe9dc', rapport: 0, rolbreedte: 140, kostprijsPerM: 58, toeslagPct: 0 },
  { code: 'teddy_karamel', naam: 'Teddy Karamel', collectie: 'Bouclé Teddy', weefsel: 'boucle', soort: 'stof', groep: 'C', kleur: '#b98552', rapport: 0, rolbreedte: 140, kostprijsPerM: 58, toeslagPct: 0 },
  { code: 'teddy_antraciet', naam: 'Teddy Antraciet', collectie: 'Bouclé Teddy', weefsel: 'boucle', soort: 'stof', groep: 'C', kleur: '#4a4a4a', rapport: 0, rolbreedte: 140, kostprijsPerM: 58, toeslagPct: 0 },
  { code: 'teddy_blush', naam: 'Teddy Blush', collectie: 'Bouclé Teddy', weefsel: 'boucle', soort: 'stof', groep: 'C', kleur: '#d9b3a8', rapport: 0, rolbreedte: 140, kostprijsPerM: 58, toeslagPct: 0 },
  { code: 'vmat_salie', naam: 'Velours Mat Salie', collectie: 'Velours Mat', weefsel: 'velours', soort: 'stof', groep: 'B', kleur: '#8f9c86', rapport: 0, rolbreedte: 140, kostprijsPerM: 45, toeslagPct: 0 },
  { code: 'vmat_lavendel', naam: 'Velours Mat Lavendel', collectie: 'Velours Mat', weefsel: 'velours', soort: 'stof', groep: 'B', kleur: '#8e86a3', rapport: 0, rolbreedte: 140, kostprijsPerM: 45, toeslagPct: 0 },
  { code: 'vmat_kastanje', naam: 'Velours Mat Kastanje', collectie: 'Velours Mat', weefsel: 'velours', soort: 'stof', groep: 'B', kleur: '#6b3f2c', rapport: 0, rolbreedte: 140, kostprijsPerM: 45, toeslagPct: 0 },
  { code: 'vmat_zilver', naam: 'Velours Mat Zilver', collectie: 'Velours Mat', weefsel: 'velours', soort: 'stof', groep: 'B', kleur: '#a9aaa8', rapport: 0, rolbreedte: 140, kostprijsPerM: 45, toeslagPct: 0 },
  { code: 'sunny_ecru', naam: 'Sunny Ecru', collectie: 'Sunny', weefsel: 'effen', soort: 'stof', groep: 'B', kleur: '#e6dfd0', rapport: 0, rolbreedte: 140, kostprijsPerM: 40, toeslagPct: 0 },
  { code: 'sunny_zeegroen', naam: 'Sunny Zeegroen', collectie: 'Sunny', weefsel: 'effen', soort: 'stof', groep: 'B', kleur: '#4f7d78', rapport: 0, rolbreedte: 140, kostprijsPerM: 40, toeslagPct: 0 },
  { code: 'sunny_taupe', naam: 'Sunny Taupe', collectie: 'Sunny', weefsel: 'effen', soort: 'stof', groep: 'B', kleur: '#8c8072', rapport: 0, rolbreedte: 140, kostprijsPerM: 40, toeslagPct: 0 },
  { code: 'sunny_grafiet', naam: 'Sunny Grafiet', collectie: 'Sunny', weefsel: 'effen', soort: 'stof', groep: 'B', kleur: '#4b4e52', rapport: 0, rolbreedte: 140, kostprijsPerM: 40, toeslagPct: 0 },
  { code: 'melange_natuur', naam: 'Melange Natuur', collectie: 'Wol Melange', weefsel: 'wol', soort: 'stof', groep: 'C', kleur: '#d9cfbd', rapport: 0, rolbreedte: 140, kostprijsPerM: 54, toeslagPct: 0 },
  { code: 'melange_mos', naam: 'Melange Mos', collectie: 'Wol Melange', weefsel: 'wol', soort: 'stof', groep: 'C', kleur: '#6c6f4c', rapport: 0, rolbreedte: 140, kostprijsPerM: 54, toeslagPct: 0 },
  { code: 'melange_middernacht', naam: 'Melange Middernacht', collectie: 'Wol Melange', weefsel: 'wol', soort: 'stof', groep: 'C', kleur: '#262f45', rapport: 0, rolbreedte: 140, kostprijsPerM: 54, toeslagPct: 0 },
  { code: 'leder_cognac', naam: 'Leder Cognac', collectie: 'Leder', weefsel: 'leder', soort: 'leder', groep: 'C', kleur: '#8f4f2c', rapport: 0, rolbreedte: 140, kostprijsPerM: 95, toeslagPct: 15 },
  { code: 'leder_zwart', naam: 'Leder Zwart', collectie: 'Leder', weefsel: 'leder', soort: 'leder', groep: 'C', kleur: '#232120', rapport: 0, rolbreedte: 140, kostprijsPerM: 95, toeslagPct: 15 },
  { code: 'leder_taupe', naam: 'Leder Taupe', collectie: 'Leder', weefsel: 'leder', soort: 'leder', groep: 'C', kleur: '#8a7a6a', rapport: 0, rolbreedte: 140, kostprijsPerM: 95, toeslagPct: 15 },
  { code: 'leder_flessengroen', naam: 'Leder Flessengroen', collectie: 'Leder', weefsel: 'leder', soort: 'leder', groep: 'C', kleur: '#3e4a3a', rapport: 0, rolbreedte: 140, kostprijsPerM: 95, toeslagPct: 15 },
  { code: 'eigen_stof', naam: 'Eigen stof van de klant (COM)', collectie: 'Eigen materiaal van de klant', soort: 'stof', groep: 'EIGEN', kleur: '#dcdcdc', rapport: 0, rolbreedte: 140, kostprijsPerM: 0, toeslagPct: 0 },
  { code: 'eigen_leder', naam: 'Eigen leder van de klant (COL)', collectie: 'Eigen materiaal van de klant', weefsel: 'leder', soort: 'leder', groep: 'EIGEN', kleur: '#8a6a4f', rapport: 0, rolbreedte: 140, kostprijsPerM: 0, toeslagPct: 10 },
];

const groepnr = (g: string) => (g === 'EIGEN' ? 9 : STOFGROEPEN.indexOf(g) + 1);

function naarKeuze(m: Materiaal): Keuzewaarde {
  const k: Keuzewaarde = {
    code: m.code,
    label: m.naam,
    eigenschappen: {
      groep: m.groep, groepnr: groepnr(m.groep), kleur: m.kleur, rapport: m.rapport,
      rolbreedte: m.rolbreedte, artikel: materiaalArtikel(m), toeslag_pct: m.toeslagPct,
      collectie: collectieVan(m), weefsel: weefselVan(m),
    },
  };
  if (m.groep === 'EIGEN') {
    k.beschikbaarAls = 'niet afneembare_hoezen';
    k.nietBeschikbaarReden = 'niet combineerbaar met afneembare hoezen';
  }
  return k;
}

/** Bouwt een prijstabel per 10 cm: startprijs per stofgroep + meerprijs per 10 cm. */
function tabelPer10cm(code: string, label: string, van: number, tot: number, start: number[], per10: number[]): Prijstabel {
  const rijen: number[] = [];
  for (let r = van; r <= tot; r += 10) rijen.push(r);
  return {
    code, label, rijen, kolommen: STOFGROEPEN,
    waarden: rijen.map((r) => start.map((s, k) => s + ((r - van) / 10) * per10[k]!)),
  };
}

/** Bouwt het sofamodel met de opgegeven materialen (standaard + eigen toegevoegde). */
export function maakSofa(materialen: Materiaal[] = standaardMaterialen): ProductModel {
  const stoffen = materialen.filter((m) => STOFGROEPEN.includes(m.groep));
  const gewoon = stoffen.filter((m) => m.groep !== 'EIGEN');
  const standaardStof = stoffen.find((m) => m.code === 'linnen_ficelle')?.code ?? stoffen[0]?.code ?? '';
  const standaardContrast = gewoon.find((m) => m.code === 'linnen_brume')?.code ?? gewoon[0]?.code ?? '';
  return {
  code: 'SOFA',
  naam: 'Sofa op maat',
  versie: 2,
  maateenheid: 'cm',
  stappen: [
    { code: 'model', label: 'Model' },
    { code: 'maat', label: 'Maat' },
    { code: 'stof', label: 'Stof' },
    { code: 'afwerking', label: 'Afwerking' },
  ],
  kenmerken: [
    {
      code: 'model', label: 'Model', stap: 'model', type: 'keuze', standaard: 'strak',
      keuzes: [
        { code: 'strak', label: 'Strakke arm', eigenschappen: { arm: 18, factor: 1 } },
        { code: 'rond', label: 'Ronde arm', eigenschappen: { arm: 24, factor: 1.06 } },
      ],
    },
    {
      code: 'opstelling', label: 'Opstelling', stap: 'model', type: 'keuze', standaard: 'recht',
      keuzes: [
        { code: 'recht', label: 'Rechte sofa', eigenschappen: { soort: 'recht', zijde: '', min: 140, max: 340 } },
        { code: 'chaise_links', label: 'Met chaise longue links', eigenschappen: { soort: 'chaise', zijde: 'links', min: 220, max: 340 } },
        { code: 'chaise_rechts', label: 'Met chaise longue rechts', eigenschappen: { soort: 'chaise', zijde: 'rechts', min: 220, max: 340 } },
        { code: 'hoek_links', label: 'Hoeksofa links', eigenschappen: { soort: 'hoek', zijde: 'links', min: 220, max: 360 } },
        { code: 'hoek_rechts', label: 'Hoeksofa rechts', eigenschappen: { soort: 'hoek', zijde: 'rechts', min: 220, max: 360 } },
      ],
    },
    {
      code: 'breedte', label: 'Breedte', stap: 'maat', type: 'getal', eenheid: 'cm',
      min: 'opstelling_min', max: 'opstelling_max', stapgrootte: 1, standaard: 230,
      helptekst: 'Op maat per cm. De prijs volgt de volgende 10 cm-klasse.',
    },
    {
      code: 'zijlengte', label: 'Lengte chaise longue / hoekzijde', stap: 'maat', type: 'getal', eenheid: 'cm',
      zichtbaarAls: 'opstelling_soort <> "recht"',
      min: 'als(opstelling_soort = "chaise"; 150; 180)', max: 'als(opstelling_soort = "chaise"; 190; 300)',
      stapgrootte: 1, standaard: 180,
    },
    {
      code: 'zitdiepte', label: 'Zitdiepte', stap: 'maat', type: 'keuze', standaard: 'standaard',
      keuzes: [
        { code: 'standaard', label: 'Standaard (totale diepte 95 cm)', eigenschappen: { diepte: 95, factor: 1 } },
        { code: 'diep', label: 'Diep (totale diepte 105 cm)', eigenschappen: { diepte: 105, factor: 1.08 } },
      ],
    },
    { code: 'stof', label: 'Stof', stap: 'stof', type: 'keuze', standaard: standaardStof, keuzes: stoffen.map(naarKeuze) },
    { code: 'contrast', label: 'Zitkussens in een andere stof', stap: 'stof', type: 'janee', standaard: false },
    {
      code: 'contraststof', label: 'Stof zitkussens', stap: 'stof', type: 'keuze', standaard: standaardContrast,
      zichtbaarAls: 'contrast', keuzes: gewoon.map(naarKeuze),
    },
    {
      code: 'comfort', label: 'Zitcomfort', stap: 'afwerking', type: 'keuze', standaard: 'veren',
      keuzes: [
        { code: 'schuim', label: 'Koudschuim (stevig)', eigenschappen: { artikel: 'VUL-SCHUIM' } },
        { code: 'veren', label: 'Pocketveren + schuim', eigenschappen: { artikel: 'VUL-VEREN' } },
        { code: 'dons', label: 'Dons-mix (zacht)', eigenschappen: { artikel: 'VUL-DONS' } },
      ],
    },
    {
      code: 'poten', label: 'Poten', stap: 'afwerking', type: 'keuze', standaard: 'eik_naturel',
      keuzes: [
        { code: 'eik_naturel', label: 'Eik naturel', eigenschappen: { artikel: 'POOT-EIK' } },
        { code: 'eik_zwart', label: 'Eik zwart gebeitst', eigenschappen: { artikel: 'POOT-EIK' } },
        { code: 'messing', label: 'Messing', beschikbaarAls: 'model = "strak"', nietBeschikbaarReden: 'alleen bij strakke arm', eigenschappen: { artikel: 'POOT-MES' } },
      ],
    },
    { code: 'afneembare_hoezen', label: 'Afneembare hoezen', stap: 'afwerking', type: 'janee', standaard: false },
    { code: 'sierkussens', label: 'Sierkussens in dezelfde stof', stap: 'afwerking', type: 'getal', min: 0, max: 8, stapgrootte: 1, standaard: 2 },
  ],
  afgeleid: [
    // --- Geometrie (cm) ---
    { code: 'soort', formule: 'opstelling_soort' },
    { code: 'zijde', formule: 'opstelling_zijde' },
    { code: 'arm', formule: 'model_arm' },
    { code: 'diepte', formule: 'zitdiepte_diepte' },
    { code: 'rug', label: 'Rugdikte', formule: '20' },
    { code: 'chaise_breedte', formule: '85' },
    { code: 'zijde_lengte', formule: 'als(soort = "recht"; diepte; zijlengte)' },
    { code: 'arm_links', formule: 'soort = "recht" of zijde = "rechts"' },
    { code: 'arm_rechts', formule: 'soort = "recht" of zijde = "links"' },
    { code: 'zit_van', formule: 'als(arm_links; arm; als(soort = "hoek"; diepte; chaise_breedte))' },
    { code: 'zit_tot', formule: 'als(arm_rechts; breedte - arm; als(soort = "hoek"; breedte - diepte; breedte - chaise_breedte))' },
    { code: 'zitbreedte', formule: 'zit_tot - zit_van' },
    { code: 'zitkussens', formule: 'max(1; naarboven(zitbreedte / 90; 1))' },
    { code: 'kussenbreedte', formule: 'zitbreedte / zitkussens' },
    { code: 'kussenkleur', formule: 'als(contrast; contraststof_kleur; stof_kleur)' },
    // --- Stofverbruik (m) ---
    {
      code: 'stof_basis', label: 'Basisverbruik bij 140 cm rolbreedte (m)',
      formule: '(breedte / 100 * 3 + als(soort = "chaise"; (zijlengte - diepte) / 100 * 2.4; 0) + als(soort = "hoek"; (zijlengte - diepte) / 100 * 3; 0)) * zitdiepte_factor * als(afneembare_hoezen; 1.08; 1) + sierkussens * 0.5',
    },
    { code: 'patroonfactor', formule: 'als(stof_rapport > 96; 1.3; tabel("patroonfactor"; stof_rapport; "factor"))' },
    { code: 'stofverbruik', label: 'Stofverbruik hoofdstof (m)', formule: 'afronden(stof_basis * als(contrast; 0.65; 1) * patroonfactor * 140 / stof_rolbreedte; 1)' },
    {
      code: 'stofverbruik_contrast', label: 'Stofverbruik contraststof (m)',
      formule: 'als(contrast; afronden(stof_basis * 0.35 * als(contraststof_rapport > 96; 1.3; tabel("patroonfactor"; contraststof_rapport; "factor")) * 140 / contraststof_rolbreedte; 1); 0)',
    },
    // --- Prijs ---
    { code: 'prijsgroep', formule: 'als(contrast en contraststof_groepnr > stof_groepnr; contraststof_groep; stof_groep)' },
    {
      code: 'basisprijs',
      formule: 'tabel("basisprijs"; breedte; prijsgroep) + als(soort = "chaise"; tabel("chaise"; zijlengte; prijsgroep); 0) + als(soort = "hoek"; tabel("hoekzijde"; zijlengte; prijsgroep); 0)',
    },
    { code: 'productie_uren', formule: '6 + breedte / 100 * 2 + als(soort = "hoek"; 4; als(soort = "chaise"; 2; 0)) + als(comfort = "dons"; 2; 0) + als(afneembare_hoezen; 3; 0) + als(contrast; 1; 0)' },
  ],
  tabellen: [
    tabelPer10cm('basisprijs', 'Basisprijs per breedte (cm) en stofgroep', 140, 360, [1590, 1790, 2050, 1450], [50, 60, 72, 40]),
    tabelPer10cm('chaise', 'Meerprijs chaise longue per lengte (cm)', 150, 190, [690, 760, 870, 620], [30, 34, 40, 25]),
    tabelPer10cm('hoekzijde', 'Meerprijs hoekzijde per lengte (cm)', 180, 300, [990, 1090, 1240, 900], [45, 50, 58, 40]),
    { code: 'sierkussen', label: 'Prijs per sierkussen', rijen: ['stuk'], kolommen: STOFGROEPEN, waarden: [[65, 75, 95, 45]] },
    {
      code: 'patroonfactor', label: 'Extra stof voor patroonrapport (rapport in cm, naar boven afgerond)',
      rijen: [0, 35, 60, 68, 96], kolommen: ['factor'], waarden: [[1], [1.1], [1.15], [1.2], [1.25]],
    },
  ],
  regels: [
    {
      code: 'zit_te_smal', ernst: 'fout', als: 'zitbreedte < 60',
      melding: 'Er blijft te weinig zitbreedte over. Maak de sofa breder.',
    },
    {
      code: 'hoekzijde_te_kort', ernst: 'fout', als: 'soort = "hoek" en zijlengte - arm - diepte < 50',
      melding: 'De hoekzijde is te kort voor een zitplaats. Verleng de hoekzijde.',
    },
    {
      code: 'levering_twee_delen', ernst: 'waarschuwing', als: 'soort = "recht" en breedte > 300',
      melding: 'Rechte sofa\'s breder dan 300 cm leveren we in twee delen.',
    },
    {
      code: 'eigen_materiaal', ernst: 'waarschuwing', als: 'stof_groep = "EIGEN"',
      melding: 'Eigen stof/leder: lever minstens het berekende stofverbruik aan. We controleren het materiaal vóór productie.',
    },
  ],
  stuklijst: [
    { code: 'frame', omschrijving: 'Frame (beuk/multiplex)', artikel: '"FRAME"', eenheid: 'lm', aantal: '1', lengte: 'breedte + als(soort = "recht"; 0; zijlengte - diepte)' },
    { code: 'vulling', omschrijving: 'Vering en vulling', artikel: 'comfort_artikel', eenheid: 'lm', aantal: '1', lengte: 'breedte + als(soort = "recht"; 0; zijlengte - diepte)' },
    { code: 'stof', omschrijving: 'Bekledingsstof', artikel: 'stof_artikel', eenheid: 'lm', aantal: '1', lengte: 'stofverbruik * 100', als: 'stof_artikel <> ""' },
    { code: 'contraststof', omschrijving: 'Stof zitkussens', artikel: 'contraststof_artikel', eenheid: 'lm', aantal: '1', lengte: 'stofverbruik_contrast * 100', als: 'contrast' },
    { code: 'poten', omschrijving: 'Poot', artikel: 'poten_artikel', eenheid: 'stuk', aantal: 'naarboven(breedte / 90; 1) * 2 + als(soort = "recht"; 0; 2)' },
    { code: 'atelier', omschrijving: 'Atelier (stofferen, naaien)', artikel: '"ARB-ATELIER"', eenheid: 'uur', aantal: 'naarboven(productie_uren; 0.5)' },
  ],
  tekening: {
    titel: 'Bovenaanzicht (cm)',
    eenheid: 'cm',
    vormen: [
      { code: 'rug', x: '0', y: '0', breedte: 'breedte', hoogte: 'rug', vulling: 'stof_kleur', afronding: '3' },
      { code: 'rug_zijde_links', als: 'soort = "hoek" en zijde = "links"', x: '0', y: 'rug', breedte: 'rug', hoogte: 'zijlengte - arm - rug', vulling: 'stof_kleur' },
      { code: 'rug_zijde_rechts', als: 'soort = "hoek" en zijde = "rechts"', x: 'breedte - rug', y: 'rug', breedte: 'rug', hoogte: 'zijlengte - arm - rug', vulling: 'stof_kleur' },
      { code: 'arm_links', als: 'arm_links', x: '0', y: '0', breedte: 'arm', hoogte: 'diepte', vulling: 'stof_kleur', afronding: 'als(model = "rond"; arm / 2; 3)' },
      { code: 'arm_rechts', als: 'arm_rechts', x: 'breedte - arm', y: '0', breedte: 'arm', hoogte: 'diepte', vulling: 'stof_kleur', afronding: 'als(model = "rond"; arm / 2; 3)' },
      { code: 'eindarm_links', als: 'soort = "hoek" en zijde = "links"', x: '0', y: 'zijlengte - arm', breedte: 'diepte', hoogte: 'arm', vulling: 'stof_kleur', afronding: 'als(model = "rond"; arm / 2; 3)' },
      { code: 'eindarm_rechts', als: 'soort = "hoek" en zijde = "rechts"', x: 'breedte - diepte', y: 'zijlengte - arm', breedte: 'diepte', hoogte: 'arm', vulling: 'stof_kleur', afronding: 'als(model = "rond"; arm / 2; 3)' },
      { code: 'zitkussen', herhaal: 'zitkussens', x: 'zit_van + i * kussenbreedte', y: 'rug', breedte: 'kussenbreedte', hoogte: 'diepte - rug', vulling: 'kussenkleur', afronding: '4' },
      { code: 'chaise_links', als: 'soort = "chaise" en zijde = "links"', x: '0', y: 'rug', breedte: 'chaise_breedte', hoogte: 'zijlengte - rug', vulling: 'kussenkleur', afronding: '4', label: '"chaise longue"' },
      { code: 'chaise_rechts', als: 'soort = "chaise" en zijde = "rechts"', x: 'breedte - chaise_breedte', y: 'rug', breedte: 'chaise_breedte', hoogte: 'zijlengte - rug', vulling: 'kussenkleur', afronding: '4', label: '"chaise longue"' },
      { code: 'hoekzit_links', als: 'soort = "hoek" en zijde = "links"', x: 'rug', y: 'rug', breedte: 'diepte - rug', hoogte: 'zijlengte - arm - rug', vulling: 'kussenkleur', afronding: '4' },
      { code: 'hoekzit_rechts', als: 'soort = "hoek" en zijde = "rechts"', x: 'breedte - diepte', y: 'rug', breedte: 'diepte - rug', hoogte: 'zijlengte - arm - rug', vulling: 'kussenkleur', afronding: '4' },
    ],
    maatlijnen: [
      { code: 'breedte', x1: '0', y1: '0', x2: 'breedte', y2: '0', afstand: '14' },
      { code: 'diepte_rechts', als: 'zijde <> "rechts"', x1: 'breedte', y1: '0', x2: 'breedte', y2: 'diepte', afstand: '14' },
      { code: 'diepte_links', als: 'zijde = "rechts"', x1: '0', y1: 'diepte', x2: '0', y2: '0', afstand: '14' },
      { code: 'zijlengte_links', als: 'soort <> "recht" en zijde = "links"', x1: '0', y1: 'zijlengte', x2: '0', y2: '0', afstand: '14' },
      { code: 'zijlengte_rechts', als: 'soort <> "recht" en zijde = "rechts"', x1: 'breedte', y1: '0', x2: 'breedte', y2: 'zijlengte', afstand: '14' },
    ],
  },
  prijs: {
    opslagProcent: 0,
    verkoopprijs:
      'basisprijs * model_factor * zitdiepte_factor * (1 + stof_toeslag_pct / 100) * als(contrast; 1.05; 1)' +
      ' + als(comfort = "dons"; 390; 0) + als(poten = "messing"; 180; 0) + als(afneembare_hoezen; 290; 0)' +
      ' + sierkussens * tabel("sierkussen"; "stuk"; prijsgroep)',
    btwProcent: 21,
  },
  };
}

export const sofa: ProductModel = maakSofa();

/** Prijslijst (kostprijzen) voor de sofa, inclusief een artikel per materiaal. */
export function maakSofaPrijslijst(materialen: Materiaal[] = standaardMaterialen): Prijslijst {
  const lijst: Prijslijst = { ...basisPrijslijst };
  for (const m of materialen) {
    const artikel = materiaalArtikel(m);
    if (artikel) lijst[artikel] = { code: artikel, omschrijving: m.naam, eenheid: 'lm', kostprijs: m.kostprijsPerM, verliesProcent: 5 };
  }
  return lijst;
}

const basisPrijslijst: Prijslijst = Object.fromEntries(
  (
    [
      ['FRAME', 'Frame per lm', 'lm', 145, 0],
      ['VUL-SCHUIM', 'Koudschuim per lm', 'lm', 70, 0],
      ['VUL-VEREN', 'Pocketveren + schuim per lm', 'lm', 95, 0],
      ['VUL-DONS', 'Dons-mix per lm', 'lm', 150, 0],
      ['POOT-EIK', 'Poot eik', 'stuk', 9, 0],
      ['POOT-MES', 'Poot messing', 'stuk', 32, 0],
      ['ARB-ATELIER', 'Atelieruur', 'uur', 48, 0],
    ] as const
  ).map(([code, omschrijving, eenheid, kostprijs, verliesProcent]) => [
    code,
    { code, omschrijving, eenheid, kostprijs, verliesProcent },
  ]),
);

export const sofaPrijslijst: Prijslijst = maakSofaPrijslijst();
