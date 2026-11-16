/**
 * Een plan met alleen rechte hoeken verandert niet door de schuine muren (ronde 2c, 16/11).
 *
 * De vingerafdrukken hieronder zijn vastgelegd vóór de schuine muren erbij kwamen, op de voorbeeldwoning (met en zonder
 * dak, met gevelontwerp, sokkel en koepels) en op twee kleine plannen met een samengestelde ruimte (L-vorm) en een
 * ruimte in een ruimte. Ze dekken de muren, de hoeken, de openingen en hun afstanden, de oppervlaktes, de tekening, de
 * 3D-scène, de gevels, het dak, de controles, het indelen en de offerteregels. Verandert er één, dan is een bestaand
 * project veranderd: dat mag niet.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  controleerPlan, dakOpbouw, daklichtenBoven, dichtsteMuur, gevelAanzichten, gevelOppervlaktes, meubelAfstanden, murenVan, muurVanOpening,
  muurVlak, niveauPlan, openingAfstanden, openingenVanRuimte, plattegrond3D, ruimteMaten, ruimteOp, ruimtesBijOpening, splitsRuimtes,
  tekenPlattegrond, tekenRuimteIn, tekenSvg, verdiepingenVan, verfGevel, zonOpGevels,
  type Blok, type DakKeuze, type Opening, type Plattegrond, type Ruimte,
} from '../src/index.js';
import { planCatalogus, planNaarRegels } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

const afdruk = (x: unknown) => createHash('sha256').update(JSON.stringify(x) ?? 'undefined').digest('hex').slice(0, 16);
const kopie = <T>(x: T): T => structuredClone(x);

/** De voorbeeldwoning, eventueel met een dak en koepels. */
function woning(dak?: DakKeuze, koepels = false): Plattegrond {
  const plan = voorbeeldWoning().plan;
  if (dak) plan.dak = dak;
  if (koepels) plan.daklichten = [
    { id: 'k1', type: 'koepel_100', x: 400, y: 600, b: 100, d: 100 },
    { id: 'k2', type: 'lichtstraat_300', x: 1050, y: 300, b: 300, d: 100 },
    { id: 'k3', type: 'koepel_100', x: 100, y: 100, b: 100, d: 100, niveau: 1 },
  ];
  return plan;
}

const zadel: DakKeuze = { vorm: 'zadel', helling: 40, richting: 'onder', oversteek: 40, bedekking: { materiaal: 'pannen', kleur: 'rood' }, plat: { materiaal: 'grind', kleur: 'grijs' } };
const lessenaar: DakKeuze = { vorm: 'lessenaar', helling: 15, richting: 'links', oversteek: 30, bedekking: { materiaal: 'zink', kleur: 'naturel' } };
const plat: DakKeuze = { vorm: 'plat', helling: 35, richting: 'onder', oversteek: 40, bedekking: { materiaal: 'groendak', kleur: 'sedum' } };

/** Eenvoudige inhoud voor een opening met een positie: kader, glas en vensterbank (zoals een raam in de 3D). */
const inhoud = (o: Opening) => o.positie ? {
  hoogte: o.hoogte + 4,
  blokken: [
    { code: 'kader', soort: 'kunststof', vorm: 'blok', x: 0, y: 0, z: 0, b: o.breedte, h: o.hoogte, d: 7, kleur: '#383e42' },
    { code: 'glas', soort: 'glas', vorm: 'blok', x: 6, y: 6, z: 3, b: o.breedte - 12, h: o.hoogte - 12, d: 2, kleur: '#c5d5da' },
    { code: 'vensterbank', soort: 'steen', vorm: 'blok', x: -3, y: -3, z: -4, b: o.breedte + 6, h: 3, d: 30, kleur: '#999999' },
  ] as Blok[],
} : undefined;

/** L-vormige leefruimte (samengestelde ruimte) met een keuken in de hoek, en een berging getekend in de leefruimte. */
function lPlan(): Plattegrond {
  const plan: Plattegrond = {
    ruimtes: [
      { id: 'l', naam: 'Leefruimte', type: 'leefruimte', x: 0, y: 0, b: 600, d: 400, vloer: 'parket_eik', wand: 'wit', delen: [{ x: 0, y: 400, b: 300, d: 300 }] },
      { id: 'k', naam: 'Keuken', type: 'keuken', x: 300, y: 400, b: 300, d: 300, vloer: 'tegel_grijs', wand: 'gebroken_wit' },
    ],
    openingen: [
      { id: 'o1', soort: 'raam', as: 'h', lijn: 0, midden: 300, breedte: 200, hoogte: 150, borstwering: 90, scharnier: 'begin', naarPlus: true },
      { id: 'o2', soort: 'buitendeur', as: 'v', lijn: 600, midden: 550, breedte: 90, hoogte: 230, borstwering: 0, scharnier: 'einde', naarPlus: false },
      { id: 'o3', soort: 'binnendeur', as: 'h', lijn: 400, midden: 450, breedte: 90, hoogte: 211, borstwering: 0, scharnier: 'begin', naarPlus: true, deurtype: 'schilder' },
      { id: 'o4', soort: 'schuifraam', as: 'h', lijn: 700, midden: 150, breedte: 240, hoogte: 230, borstwering: 0, scharnier: 'begin', naarPlus: true },
    ],
    meubels: [{ id: 'm1', type: 'bank3', x: 100, y: 100, b: 230, d: 95, rotatie: 0 }],
    muurhoogte: 270, buitenmuur: 30, binnenmuur: 10,
    gevel: { soort: 'steen', kleur: '#9c4a34' },
    gevelOntwerp: { standaard: { materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' }, sokkel: { materiaal: 'natuursteen', kleur: 'blauwgrijs', hoogte: 40 } },
  };
  tekenRuimteIn(plan, { id: 'b', naam: 'Berging', type: 'berging', x: 400, y: 0, b: 200, d: 150, vloer: 'tegel_grijs', wand: 'wit' });
  return plan;
}

/** Alles wat uit een plan volgt, als één lijst vingerafdrukken (in een vaste volgorde). */
function alles(plan: Plattegrond): Record<string, string> {
  const uit: Record<string, string> = {};
  const niveaus = verdiepingenVan(plan).length;
  for (let n = 0; n < niveaus; n++) {
    const p = niveauPlan(plan, n);
    const muren = murenVan(p);
    uit[`muren.${n}`] = afdruk(muren);
    uit[`vlakken.${n}`] = afdruk(muren.map((m) => muurVlak(m, muren)));
    uit[`openingen.${n}`] = afdruk(p.openingen.map((o) => [muurVanOpening(o, muren), openingAfstanden(p, o), ruimtesBijOpening(p, o).map((r) => r.id)]));
    uit[`ruimtes.${n}`] = afdruk(p.ruimtes.map((r) => [ruimteMaten(p, r), openingenVanRuimte(p, r).map((o) => o.id), daklichtenBoven(p, r).map((l) => l.id)]));
    uit[`meubels.${n}`] = afdruk(p.meubels.map((m) => meubelAfstanden(p, m)));
    const punten: unknown[] = [];
    for (let x = -120; x <= 1520; x += 37) for (let y = -120; y <= 1020; y += 41) punten.push([dichtsteMuur(muren, x, y), ruimteOp(p, x, y)?.id]);
    uit[`punten.${n}`] = afdruk(punten);
    const raamInfo = (o: Opening) => o.positie ? { label: o.positie.toUpperCase(), vakken: o.soort === 'schuifraam' ? ['vast', 'schuif_l'] : ['draai_l', 'draaikip_r'], breedtes: [1, 2] } : undefined;
    const tekeningen = [
      tekenPlattegrond(p, planCatalogus),
      tekenPlattegrond(p, planCatalogus, { raamInfo, noordpijl: true, schaal: 0.7, fijnRaster: true }),
      tekenPlattegrond(p, planCatalogus, { afdruk: true, raamInfo, fouten: new Set(p.ruimtes.slice(0, 2).map((r) => r.id).concat(p.openingen.slice(0, 2).map((o) => o.id))) }),
      ...(n > 0 ? [tekenPlattegrond(p, planCatalogus, { onderlegger: niveauPlan(plan, n - 1) })] : []),
      ...p.ruimtes.map((r) => tekenPlattegrond(p, planCatalogus, { selectie: { soort: 'ruimte', id: r.id } })),
      ...p.openingen.map((o) => tekenPlattegrond(p, planCatalogus, { selectie: { soort: 'opening', id: o.id }, raamInfo })),
      ...p.meubels.map((m) => tekenPlattegrond(p, planCatalogus, { selectie: { soort: 'meubel', id: m.id } })),
      tekenPlattegrond(p, planCatalogus, { voorbeeld: { x: 100, y: 100, b: 300, d: 200 }, voorbeeldWand: { x1: 0, y1: 200, x2: 400, y2: 200 } }),
      ...(p.openingen[0] ? [tekenPlattegrond(p, planCatalogus, { voorbeeldOpening: { ...p.openingen[0], id: 'nieuw', midden: p.openingen[0].midden + 20 } })] : []),
    ];
    uit[`tekening.${n}`] = afdruk(tekeningen);
  }
  uit['3d'] = afdruk([
    plattegrond3D(plan, planCatalogus),
    plattegrond3D(plan, planCatalogus, { inhoud }),
    plattegrond3D(plan, planCatalogus, { laag: 110, inhoud }),
    plattegrond3D(plan, planCatalogus, { totNiveau: 0, meubels: false }),
    plattegrond3D(plan, planCatalogus, { aanleg: true, gevelkoppen: true, inhoud }),
    plattegrond3D(plan, planCatalogus, { lichtinval: true, aanleg: true, gevelkoppen: true }),
    plattegrond3D(plan, planCatalogus, { dak: false, gevelkoppen: true }),
  ]);
  const info = (o: Opening) => o.positie ? { label: o.positie, vakken: ['draai_l', 'vast'], kast: o.soort === 'raam' ? 18 : undefined, voordeur: o.soort === 'buitendeur', paneel: o.soort === 'buitendeur' } : undefined;
  const gevels = gevelAanzichten(plan, info, planCatalogus);
  uit.gevels = afdruk(gevels.map((g) => [g.kant, g.naam, g.tekening, g.vlakken, [0, 250, 900].map(g.naarU), [0, 250].map(g.vanU), [0, 300].map(g.naarY)]));
  uit.gevelsvg = afdruk(gevels.map((g) => tekenSvg(g.tekening)));
  uit.gevelsKaal = afdruk(gevelAanzichten(plan).map((g) => g.tekening));
  uit.oppervlaktes = afdruk(gevelOppervlaktes(plan));
  uit.dak = afdruk(dakOpbouw(plan));
  uit.controles = afdruk([controleerPlan(plan), controleerPlan(plan, planCatalogus)]);
  uit.regels = afdruk(planNaarRegels(plan, { vloeren: true, wanden: true, binnendeuren: true, ruwbouw: true, inrichting: true, gevel: true, dak: true }));
  uit.zon = afdruk([zonOpGevels(6, 21, plan.noord ?? 0), zonOpGevels(12, 21, 35)]);
  // Indelen, ruimte in ruimte en verven op een kopie.
  const a = kopie(plan);
  const nieuw = (oud: Ruimte): Ruimte => ({ ...oud, id: `${oud.id}_b`, naam: `${oud.naam} b`, delen: undefined });
  const gesplitst = [splitsRuimtes(a, 0, 'v', 150, 0, 0, nieuw), splitsRuimtes(a, 0, 'h', 650, -50, 2000, nieuw, 60)];
  tekenRuimteIn(a, { id: 'nieuw', naam: 'Kast', type: 'berging', x: 500, y: 450, b: 200, d: 150, vloer: 'tegel_grijs', wand: 'wit' });
  if (a.gevelOntwerp) verfGevel(a, { materiaal: 'pleister', kleur: 'wit' }, 'gevel', { kant: 'rechts' });
  uit.indelen = afdruk([gesplitst, a.ruimtes, a.gevelOntwerp, murenVan(niveauPlan(a, 0))]);
  return uit;
}

describe('rechthoekige plannen blijven exact gelijk (vóór de schuine muren vastgelegd)', () => {
  it('voorbeeldwoning zonder dak', () => {
    expect(alles(woning())).toMatchInlineSnapshot(`
      {
        "3d": "ad96808835810dcd",
        "controles": "643d5437104296e2",
        "dak": "eb045d78d2731073",
        "gevels": "06a538d48693eb71",
        "gevelsKaal": "9de5b87149740f3a",
        "gevelsvg": "76f515384ac9fb7a",
        "indelen": "ab3becfe791a2d2d",
        "meubels.0": "0ba175f68bd4f0d5",
        "meubels.1": "158a6f1a03e22e84",
        "muren.0": "61eb19f29a851c93",
        "muren.1": "35c2b5b1c353f47e",
        "openingen.0": "f68827e131bb27d2",
        "openingen.1": "f94c652f39ecab95",
        "oppervlaktes": "20eef67ae844c3e4",
        "punten.0": "55bc29cac6c415ef",
        "punten.1": "c454d5b2293e8f2a",
        "regels": "4e0b6e0bd9f8c385",
        "ruimtes.0": "d15c450ee2b92bcb",
        "ruimtes.1": "a93f8d5119dc1324",
        "tekening.0": "1c2afa80d65719a4",
        "tekening.1": "c8867371aca64cee",
        "vlakken.0": "d15e5cf2387226df",
        "vlakken.1": "a2066e94ae75ee8d",
        "zon": "c4a042dc7dd0da01",
      }
    `);
  });
  it('voorbeeldwoning met zadeldak en koepels', () => {
    expect(alles(woning(zadel, true))).toMatchInlineSnapshot(`
      {
        "3d": "9c987a987cc6ffe2",
        "controles": "3c72d1c75ebce159",
        "dak": "9edb8e0ed28366bd",
        "gevels": "ff18e96864c39055",
        "gevelsKaal": "c8f91a19f7b5f3a2",
        "gevelsvg": "0574484ca7645113",
        "indelen": "ab3becfe791a2d2d",
        "meubels.0": "0ba175f68bd4f0d5",
        "meubels.1": "158a6f1a03e22e84",
        "muren.0": "61eb19f29a851c93",
        "muren.1": "35c2b5b1c353f47e",
        "openingen.0": "f68827e131bb27d2",
        "openingen.1": "f94c652f39ecab95",
        "oppervlaktes": "c2d7fd98945c9f4a",
        "punten.0": "55bc29cac6c415ef",
        "punten.1": "c454d5b2293e8f2a",
        "regels": "439e3d2d7d442795",
        "ruimtes.0": "d26047854f2869ac",
        "ruimtes.1": "5f854ef53bfb1266",
        "tekening.0": "2ebe6dd85c934a15",
        "tekening.1": "7cc699c7f8156878",
        "vlakken.0": "d15e5cf2387226df",
        "vlakken.1": "a2066e94ae75ee8d",
        "zon": "c4a042dc7dd0da01",
      }
    `);
  });
  it('voorbeeldwoning met lessenaarsdak', () => {
    expect(alles(woning(lessenaar))).toMatchInlineSnapshot(`
      {
        "3d": "013fd067f17f97f9",
        "controles": "643d5437104296e2",
        "dak": "7990d168d5f2311a",
        "gevels": "7cf7fed0b6cd36f2",
        "gevelsKaal": "cd57cc1fbcd8184e",
        "gevelsvg": "426f7348b7c12e10",
        "indelen": "ab3becfe791a2d2d",
        "meubels.0": "0ba175f68bd4f0d5",
        "meubels.1": "158a6f1a03e22e84",
        "muren.0": "61eb19f29a851c93",
        "muren.1": "35c2b5b1c353f47e",
        "openingen.0": "f68827e131bb27d2",
        "openingen.1": "f94c652f39ecab95",
        "oppervlaktes": "c786a9994e67048c",
        "punten.0": "55bc29cac6c415ef",
        "punten.1": "c454d5b2293e8f2a",
        "regels": "0919525c312ef5c8",
        "ruimtes.0": "d15c450ee2b92bcb",
        "ruimtes.1": "a93f8d5119dc1324",
        "tekening.0": "1c2afa80d65719a4",
        "tekening.1": "c8867371aca64cee",
        "vlakken.0": "d15e5cf2387226df",
        "vlakken.1": "a2066e94ae75ee8d",
        "zon": "c4a042dc7dd0da01",
      }
    `);
  });
  it('voorbeeldwoning met plat groendak en koepels', () => {
    expect(alles(woning(plat, true))).toMatchInlineSnapshot(`
      {
        "3d": "6d69bf5dcb7d6802",
        "controles": "40573eee2a8fb654",
        "dak": "4a59a364ca3aa960",
        "gevels": "66d8f6a7066043c1",
        "gevelsKaal": "1532fca321058005",
        "gevelsvg": "897bb2d2c3184a50",
        "indelen": "ab3becfe791a2d2d",
        "meubels.0": "0ba175f68bd4f0d5",
        "meubels.1": "158a6f1a03e22e84",
        "muren.0": "61eb19f29a851c93",
        "muren.1": "35c2b5b1c353f47e",
        "openingen.0": "f68827e131bb27d2",
        "openingen.1": "f94c652f39ecab95",
        "oppervlaktes": "20eef67ae844c3e4",
        "punten.0": "55bc29cac6c415ef",
        "punten.1": "c454d5b2293e8f2a",
        "regels": "e086caa5972786cd",
        "ruimtes.0": "d26047854f2869ac",
        "ruimtes.1": "5f854ef53bfb1266",
        "tekening.0": "2ebe6dd85c934a15",
        "tekening.1": "7cc699c7f8156878",
        "vlakken.0": "d15e5cf2387226df",
        "vlakken.1": "a2066e94ae75ee8d",
        "zon": "c4a042dc7dd0da01",
      }
    `);
  });
  it('L-vorm met ruimte in ruimte', () => {
    expect(alles(lPlan())).toMatchInlineSnapshot(`
      {
        "3d": "616d74ffa78c40d7",
        "controles": "3e3c34fc126c4826",
        "dak": "eb045d78d2731073",
        "gevels": "c4bcf22df8239382",
        "gevelsKaal": "55e560ded83ebc90",
        "gevelsvg": "d9f2becbe514e74e",
        "indelen": "c782aee36fc1bf13",
        "meubels.0": "4c90c663e054e1b0",
        "muren.0": "e19ab062d3a87193",
        "openingen.0": "e1a8bedf0f00d7fe",
        "oppervlaktes": "dcd022f0d4464d51",
        "punten.0": "d12746bf3b5e949d",
        "regels": "81951b9aba017870",
        "ruimtes.0": "656cea0a618732e9",
        "tekening.0": "296c5c09ccdfa755",
        "vlakken.0": "f7290db99fa39d07",
        "zon": "c4a042dc7dd0da01",
      }
    `);
  });
  it('L-vorm met plat dak en koepel', () => {
    const p = lPlan();
    p.dak = plat;
    p.daklichten = [{ id: 'k1', type: 'koepel_100', x: 100, y: 450, b: 100, d: 100 }];
    expect(alles(p)).toMatchInlineSnapshot(`
      {
        "3d": "c673dca33ee20e55",
        "controles": "3e3c34fc126c4826",
        "dak": "e82c913dca0d3ecf",
        "gevels": "6b03cafdbc845fe4",
        "gevelsKaal": "4d845fd4a41cb9f6",
        "gevelsvg": "e71bbba07b6dc1c2",
        "indelen": "c782aee36fc1bf13",
        "meubels.0": "4c90c663e054e1b0",
        "muren.0": "e19ab062d3a87193",
        "openingen.0": "e1a8bedf0f00d7fe",
        "oppervlaktes": "dcd022f0d4464d51",
        "punten.0": "d12746bf3b5e949d",
        "regels": "65fa93677a4f77ec",
        "ruimtes.0": "bceead1cda21cb0d",
        "tekening.0": "4aa6f0240cef6115",
        "vlakken.0": "f7290db99fa39d07",
        "zon": "c4a042dc7dd0da01",
      }
    `);
  });
});
