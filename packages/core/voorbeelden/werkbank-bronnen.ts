/**
 * De bronnen van de 3D-werkbank (zie src/werkbank.ts): elke collectie die in 3D getoond kan worden, in dezelfde vorm.
 *
 * Een nieuw 3D-onderdeel toevoegen = hier één bron bijschrijven (items + scène). Het controleblad, de modelbeelden, de
 * lichtmeting en de werkbankpagina werken er dan meteen mee: `npm run controleblad -- --bron <code>`.
 */
import {
  berekenConfiguratie, berekenOntwerp, bouw3D, hoogtesVan, kaderVan, meubelBlokken, plattegrond3D, standaardKeuzes, verdiepingenVan,
  type Blok, type BlokSoort, type ConfiguratieResultaat, type Keuzes, type ProductModel, type Prijslijst, type Scene3D,
  type WerkbankBron, type WerkbankItem, type WerkbankReeks,
} from '../src/index.js';
import { aanbouw, aanbouwPrijslijst } from './aanbouw.js';
import { bouwAanbouw3D } from './aanbouw3d.js';
import { bouwstijlen, bouwstijlTekst, pasBouwstijlToe } from './bouwstijlen.js';
import { planCatalogus } from './inrichting.js';
import { zetelModellen } from './modellen.js';
import { proefModellen } from './proefmodellen.js';
import { raamdeur, raamPrijslijst } from './raam.js';
import { raamBlokken, raamScene } from './raam3d.js';
import { standaardMaterialen } from './sofa.js';
import { zetelCatalogus } from './vrij-ontwerp.js';
import { voorbeeldWoning } from './woning.js';

const euro = (bedrag: number) => `€ ${Math.round(bedrag).toLocaleString('nl-BE')}`;
const cm = (...maten: number[]) => `${maten.map((m) => Math.round(m)).join(' × ')} cm`;
function vind<T extends { code: string }>(lijst: T[], code: string, wat: string): T {
  const uit = lijst.find((x) => x.code === code);
  if (!uit) throw new Error(`${wat} "${code}" bestaat niet`);
  return uit;
}

// ---------- zetels: de modellen van de collectie ----------

const zetels = [...zetelModellen, ...proefModellen];

/** Het ontwerp van een model met afwijkende keuzes: `stof` (hoofdstof), `bouwstijl`, of een optiegroep van de catalogus. */
function zetelOntwerp(code: string, keuzes: Record<string, string> = {}) {
  let ontwerp = structuredClone(vind(zetels, code, 'Model').ontwerp);
  for (const [groep, keuze] of Object.entries(keuzes)) {
    if (groep === 'stof') ontwerp.hoofdmateriaal = vind(standaardMaterialen, keuze, 'Stof').code;
    else if (groep === 'bouwstijl') ontwerp = pasBouwstijlToe(ontwerp, vind(bouwstijlen, keuze, 'Bouwstijl'));
    else {
      const g = vind(zetelCatalogus.opties ?? [], groep, 'Optiegroep');
      ontwerp.opties = { ...ontwerp.opties, [groep]: vind(g.keuzes, keuze, `Keuze voor ${g.label}`).code };
    }
  }
  return ontwerp;
}

export const zetelBron: WerkbankBron = {
  code: 'zetels',
  titel: 'Zetels',
  uitleg: 'De modellen van de collectie (sofa\'s, fauteuils, zetelbedden, poufs), elk met zijn productfoto.',
  weergave: 'zetel',
  fotomap: 'packages/demo-web/fotos',
  items: () => zetels.map((m): WerkbankItem => {
    const kader = bouw3D(m.ontwerp, zetelCatalogus, standaardMaterialen).kader;
    const stof = standaardMaterialen.find((x) => x.code === m.ontwerp.hoofdmateriaal);
    return {
      code: m.code, naam: m.naam, groep: m.familie, omschrijving: m.omschrijving, bron: m.bron, foto: m.foto, kleur: stof?.kleur,
      feiten: [
        ['Maten', cm(kader.b, kader.d, kader.h)],
        ['Zithoogte', cm(hoogtesVan(m.ontwerp, zetelCatalogus).zithoogte)],
        ['Bouwstijl', bouwstijlTekst(m.ontwerp)],
        ['Stof', stof?.naam ?? m.ontwerp.hoofdmateriaal],
        ['Prijs (demo)', euro(berekenOntwerp(m.ontwerp, zetelCatalogus, standaardMaterialen).prijs.brutoprijsExcl)],
      ],
    };
  }),
  scene: (code, keuzes) => bouw3D(zetelOntwerp(code, keuzes), zetelCatalogus, standaardMaterialen, { echt3d: vind(zetels, code, 'Model').echt3d }),
  reeksen: () => [
    { groep: 'bouwstijl', label: 'Bouwstijl', keuzes: bouwstijlen.map((s) => ({ code: s.code, label: s.label })) },
    ...(zetelCatalogus.opties ?? []).filter((g) => g.niveau === 'ontwerp').map((g): WerkbankReeks => ({ groep: g.code, label: g.label, keuzes: g.keuzes.map((k) => ({ code: k.code, label: k.label })) })),
    { groep: 'stof', label: 'Stof', keuzes: standaardMaterialen.map((m) => ({ code: m.code, label: m.naam })) },
  ],
};

// ---------- inrichting: de meubels van de plattegrond ----------

export const inrichtingBron: WerkbankBron = {
  code: 'inrichting',
  titel: 'Inrichting',
  uitleg: 'De meubels en toestellen die op de plattegrond van een woning gezet kunnen worden (eenvoudige vormen, richtprijzen).',
  weergave: 'bouw',
  items: () => Object.entries(planCatalogus.meubels).map(([code, t]): WerkbankItem => ({
    code, naam: t.label, groep: t.groep, kleur: t.kleur,
    feiten: [['Maten', cm(t.b, t.d, t.h)], ['Vorm', t.vorm], ...(t.prijs ? [['Richtprijs', euro(t.prijs)] as [string, string]] : [])],
    bron: 'Eenvoudige vorm, verzonnen maten en prijs (demo)',
  })),
  scene: (code) => {
    const t = planCatalogus.meubels[code];
    if (!t) throw new Error(`Meubel "${code}" bestaat niet`);
    const blokken = meubelBlokken(t.vorm, t.b, t.d, t.h, t.kleur);
    return { blokken, kader: kaderVan(blokken) };
  },
};

// ---------- ramen en deuren: de posities van de voorbeeldwoning ----------

/** Reeksen uit een productmodel: elk keuzekenmerk met zijn mogelijkheden. */
function reeksenVan(model: ProductModel, keuzes: Keuzes, prijslijst: Prijslijst): WerkbankReeks[] {
  return berekenConfiguratie(model, keuzes, prijslijst).kenmerken
    .filter((k) => k.zichtbaar && k.keuzes && k.keuzes.length > 1)
    .map((k) => ({ groep: k.code, label: k.label, keuzes: k.keuzes!.filter((x) => x.beschikbaar).map((x) => ({ code: x.code, label: x.label })) }));
}
const feitenVan = (r: ConfiguratieResultaat, codes: string[]): [string, string][] =>
  codes.flatMap((c) => { const k = r.kenmerken.find((x) => x.code === c && x.zichtbaar); return k ? [[k.label, k.weergave] as [string, string]] : []; });

const woning = voorbeeldWoning();
const raamPosities = woning.posities.filter((p) => p.model === 'RAAM');
const raamResultaat = (code: string, keuzes: Record<string, string> = {}) =>
  berekenConfiguratie(raamdeur, { ...vind(raamPosities, code, 'Positie').keuzes, ...keuzes }, raamPrijslijst);

export const raamBron: WerkbankBron = {
  code: 'ramen',
  titel: 'Ramen en deuren',
  uitleg: 'De ramen en deuren van de voorbeeldwoning, elk in een stukje gevel (zoals in de offertepositie).',
  weergave: 'bouw',
  items: () => raamPosities.map((p): WerkbankItem => {
    const r = raamResultaat(p.code);
    return {
      code: p.code, naam: p.naam, groep: String(r.kenmerken.find((k) => k.code === 'type')?.weergave ?? 'Raam'),
      feiten: [['Maten', `${p.keuzes.breedte} × ${p.keuzes.hoogte} mm`], ...feitenVan(r, ['profiel', 'kleur_buiten', 'vakken', 'glas', 'zonwering']), ['Prijs (demo)', euro(r.prijs.brutoprijsExcl)]],
      bron: 'Voorbeeldwoning (verzonnen)',
    };
  }),
  scene: (code, keuzes) => raamScene(raamResultaat(code, keuzes)),
  reeksen: (code) => reeksenVan(raamdeur, vind(raamPosities, code, 'Positie').keuzes, raamPrijslijst),
};

// ---------- woning: de voorbeeldwoning in haar geheel, en de aanbouw ----------

const raamInhoud = (o: { positie?: string }) => {
  const p = woning.posities.find((x) => x.id === o.positie);
  if (!p || p.model !== 'RAAM') return undefined;
  const rb = raamBlokken(berekenConfiguratie(raamdeur, p.keuzes, raamPrijslijst));
  return { blokken: rb.blokken, hoogte: rb.h + rb.kast };
};
const WONING_ITEMS: { code: string; naam: string; omschrijving: string; scene: () => Scene3D }[] = [
  { code: 'woning', naam: 'Voorbeeldwoning', omschrijving: 'Alle verdiepingen met dak, ramen en deuren.', scene: () => plattegrond3D(woning.plan, planCatalogus, { meubels: true, inhoud: raamInhoud }) },
  { code: 'gelijkvloers', naam: 'Gelijkvloers zonder dak', omschrijving: 'Alleen het gelijkvloers, van boven open.', scene: () => plattegrond3D(woning.plan, planCatalogus, { meubels: true, totNiveau: 0, inhoud: raamInhoud }) },
  { code: 'binnenkijk', naam: 'Binnenkijk (muren laag)', omschrijving: 'Muren afgesneden op 110 cm, met de inrichting.', scene: () => plattegrond3D(woning.plan, planCatalogus, { meubels: true, laag: 110, totNiveau: 0, inhoud: raamInhoud }) },
  { code: 'leeg', naam: 'Zonder inrichting', omschrijving: 'Muren laag, zonder meubels.', scene: () => plattegrond3D(woning.plan, planCatalogus, { meubels: false, laag: 110, totNiveau: 0, inhoud: raamInhoud }) },
  { code: 'aanbouw', naam: 'Aanbouw (standaard)', omschrijving: 'Het model aanbouw met zijn standaardkeuzes.', scene: () => bouwAanbouw3D(berekenConfiguratie(aanbouw, standaardKeuzes(aanbouw), aanbouwPrijslijst)) },
];

export const woningBron: WerkbankBron = {
  code: 'woning',
  titel: 'Woning',
  uitleg: 'De voorbeeldwoning (met en zonder dak, met lage muren, zonder inrichting) en de aanbouw.',
  weergave: 'bouw',
  licht: 'daglicht',
  items: () => WONING_ITEMS.map((w): WerkbankItem => {
    const k = w.scene().kader;
    return {
      code: w.code, naam: w.naam, groep: w.code === 'aanbouw' ? 'Aanbouw' : 'Woning', omschrijving: w.omschrijving,
      feiten: w.code === 'aanbouw' ? [['Maten', cm(k.b, k.d, k.h)]] : [
        ['Maten', cm(k.b, k.d, k.h)], ['Verdiepingen', String(verdiepingenVan(woning.plan).length)], ['Ruimtes', String(woning.plan.ruimtes.length)],
        ['Ramen en deuren', String(woning.plan.openingen.length)], ['Meubels', String(woning.plan.meubels?.length ?? 0)],
      ],
      bron: 'Verzonnen voorbeeld',
    };
  }),
  scene: (code) => vind(WONING_ITEMS, code, 'Woning').scene(),
};

// ---------- ijk: een blok per materiaal, om het licht te meten ----------

const IJKBLOKKEN: { code: string; naam: string; soort: BlokSoort; kleur: string }[] = [
  { code: 'stof_wit', naam: 'Stof wit', soort: 'stof', kleur: '#f1efe9' },
  { code: 'stof_grijs', naam: 'Stof middengrijs', soort: 'stof', kleur: '#8f8d89' },
  { code: 'stof_petrol', naam: 'Stof petrol', soort: 'stof', kleur: '#4f5e62' },
  { code: 'hout_eik', naam: 'Hout eik', soort: 'hout', kleur: '#c8a27a' },
  { code: 'gevel_wit', naam: 'Pleister wit', soort: 'gevel', kleur: '#efeee9' },
  { code: 'gevel_grijs', naam: 'Pleister grijs', soort: 'gevel', kleur: '#8f8d89' },
  { code: 'dak_antraciet', naam: 'Dak antraciet', soort: 'dak', kleur: '#3f4245' },
  { code: 'kunststof_wit', naam: 'Kunststof wit', soort: 'kunststof', kleur: '#f4f4f1' },
];
function ijkBron(code: string, titel: string, weergave: 'zetel' | 'bouw'): WerkbankBron {
  return {
    code, titel, weergave,
    uitleg: `Een blok van 100 × 45 × 100 cm per materiaal, om te meten of een kleur er in 3D uitziet zoals op de staal (${weergave === 'zetel' ? 'weergave van de zetel' : 'weergave van de bouwdemo'}).`,
    items: () => IJKBLOKKEN.map((b): WerkbankItem => ({ code: b.code, naam: b.naam, groep: 'IJkblok', kleur: b.kleur, feiten: [['Kleur', b.kleur], ['Materiaal', b.soort]] })),
    scene: (item) => {
      const b = vind(IJKBLOKKEN, item, 'IJkblok');
      const blokken: Blok[] = [{ code: 'ijk', soort: b.soort, vorm: 'blok', x: 0, y: 0, z: 0, b: 100, h: 45, d: 100, kleur: b.kleur }];
      return { blokken, kader: kaderVan(blokken) };
    },
  };
}

/** Alle bronnen, in de volgorde van de werkbankpagina. */
export const werkbankBronnen: WerkbankBron[] = [
  zetelBron, inrichtingBron, raamBron, woningBron, ijkBron('ijk', 'IJkblok (zetel)', 'zetel'), ijkBron('ijk-bouw', 'IJkblok (bouw)', 'bouw'),
];
