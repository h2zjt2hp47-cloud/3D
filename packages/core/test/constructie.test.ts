import { describe, expect, it } from 'vitest';
import {
  CONSTRUCTIE_VOORBEHOUD, constructie3D, constructieBlokken, dakHoogte, meetstaat, snedeBereik, tekenDoorsnede, opAs, opbouwVoor, opMuur, plattegrond3D, standaardDak, vloervlak,
  WARMTE_VOORBEHOUD, STABILITEIT_VOORBEHOUD, woningConstructie, woningMeetstaat, woningStabiliteit, woningWarmte, zetOmtrek, murenVan, meubelVoetafdruk,
  type Blok, type DakKeuze, type Opening, type Plattegrond,
} from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';
import { woningOpbouwCatalogus } from '../voorbeelden/woningopbouw.js';
import { warmtewaarden } from '../voorbeelden/warmtewaarden.js';
import { stabiliteitswaarden } from '../voorbeelden/stabiliteitswaarden.js';
import { bouwMaterialen as M, opbouwen as O } from '../voorbeelden/opbouwen.js';

const cat = { ...planCatalogus, opbouw: woningOpbouwCatalogus };
const kopie = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** Een losse ruimte van 600 × 400 met een raam in elke muur. */
function doos(): Plattegrond {
  const raam = (id: string, as: 'h' | 'v', lijn: number, midden: number, breedte = 120): Opening =>
    ({ id, soort: 'raam', as, lijn, midden, breedte, hoogte: 120, borstwering: 90, scharnier: 'begin', naarPlus: true });
  return {
    ruimtes: [{ id: 'r', naam: 'Kamer', type: 'leefruimte', x: 0, y: 0, b: 600, d: 400, vloer: 'parket_eik', wand: 'wit' }],
    openingen: [raam('boven', 'h', 0, 150), raam('onder', 'h', 400, 420, 160), raam('links', 'v', 0, 130), raam('rechts', 'v', 600, 250, 100)],
    meubels: [], muurhoogte: 270, buitenmuur: 30, binnenmuur: 10, gevel: { soort: 'steen', kleur: '#9c4a34' },
  };
}

/** Het midden van een blok op het plan [x, y]: bij een gedraaid blok (draai) het midden, dat bij het draaien op zijn plaats blijft. */
const midden = (b: Blok): [number, number] => [b.x + b.b / 2, b.z + b.d / 2];
const lateien = (blokken: Blok[]) => blokken.filter((b) => b.code.includes('.skelet.latei.'));

describe('constructie van een woning: opbouw kiezen', () => {
  it('zonder veld opbouw krijgt een plan de standaarden; de buitenmuur volgt de gevel', () => {
    const { plan } = voorbeeldWoning();
    expect(plan.opbouw).toBeUndefined();
    const c = woningConstructie(plan, cat);
    const buiten = c.delen.filter((d) => d.plaats === 'buitenwand');
    // De voorbeeldwoning heeft gevelsteen en hout (verdieping): steenstrips en houten bekleding.
    expect(new Set(buiten.map((d) => d.opbouw))).toEqual(new Set(['hsb_steenstrips', 'hsb_hout']));
    expect(new Set(c.delen.filter((d) => d.plaats === 'binnenwand').map((d) => d.opbouw))).toEqual(new Set(['binnenwand_hsb']));
    expect(plan.opbouw).toBeUndefined();
  });

  it('een keuze voor de hele woning, een afwijking per muurvlak, en een onbekende code valt terug op de standaard', () => {
    const plan = doos();
    plan.opbouw = { buitenwand: 'spouwmuur', vlakken: { 'r:onder': 'hsb_pleister' } };
    expect(opbouwVoor(plan, woningOpbouwCatalogus, 'buitenwand', { vlak: 'r:boven', gevel: 'steen' })).toBe('spouwmuur');
    expect(opbouwVoor(plan, woningOpbouwCatalogus, 'buitenwand', { vlak: 'r:onder', gevel: 'steen' })).toBe('hsb_pleister');
    plan.opbouw = { buitenwand: 'bestaat_niet', platDak: 'hsb_hout' };
    expect(opbouwVoor(plan, woningOpbouwCatalogus, 'buitenwand', { gevel: 'planken' })).toBe('hsb_hout');
    // Een opbouw die niet op die plaats kan (een wand als dak): de standaard.
    expect(opbouwVoor(plan, woningOpbouwCatalogus, 'platDak')).toBe('plat_dak_warm');
  });

  it('de afgewerkte weergave leest de opbouw niet', () => {
    const { plan } = voorbeeldWoning();
    const met = { ...kopie(plan), opbouw: { buitenwand: 'spouwmuur', binnenwand: 'binnenwand_hsb' } };
    expect(JSON.stringify(plattegrond3D(met, cat, { aanleg: true, gevelkoppen: true }))).toBe(JSON.stringify(plattegrond3D(plan, cat, { aanleg: true, gevelkoppen: true })));
  });
});

describe('constructie van een woning: wanden', () => {
  it('elke opening zit op haar plaats, in de vier richtingen', () => {
    const plan = doos();
    const c = woningConstructie(plan, cat);
    expect(c.meldingen).toEqual([]);
    const s = constructie3D(plan, cat, {}, c);
    const l = lateien(s.blokken);
    expect(l).toHaveLength(4);
    for (const o of plan.openingen) {
      // De latei boven de opening: haar midden langs de muur is het midden van de opening.
      const hier = l.filter((b) => (o.as === 'h' ? Math.abs(midden(b)[1] - o.lijn) < 20 : Math.abs(midden(b)[0] - o.lijn) < 20));
      expect(hier, o.id).toHaveLength(1);
      expect(midden(hier[0]!)[o.as === 'h' ? 0 : 1], o.id).toBeCloseTo(o.midden, 1);
    }
  });

  it('een schuine muur: gedraaid mee met de muur, de opening op haar plaats', () => {
    const plan = doos();
    // De rechterkant schuin: (600, 0) → (700, 400).
    zetOmtrek(plan.ruimtes[0]!, [[0, 0], [600, 0], [700, 400], [0, 400]]);
    const m = murenVan(plan).find((x) => x.as === 's')!;
    const lengte = m.tot - m.van;
    plan.openingen = [{ id: 's', soort: 'raam', ...opMuur(m, m.van + lengte / 2), breedte: 100, hoogte: 120, borstwering: 90, scharnier: 'begin', naarPlus: true }];
    const c = woningConstructie(plan, cat);
    const wand = c.delen.find((d) => d.muur?.muur.as === 's')!;
    expect(wand.zet.hoek).toBeDefined();
    const blokken = constructieBlokken(wand);
    const latei = lateien(blokken);
    expect(latei).toHaveLength(1);
    // Het midden van de latei ligt langs de as van de muur op het midden van de opening, op de as van de muur.
    const [s, w] = opAs(m, midden(latei[0]!));
    expect(s).toBeCloseTo(m.van + lengte / 2, 0);
    expect(Math.abs(w - m.lijn)).toBeLessThan(wand.muur!.muur.dikte / 2 + 0.5);
    expect(latei[0]!.draai).toBeDefined();
  });

  it('de muren hebben de dikte van hun opbouw en staan op de as', () => {
    const plan = doos();
    plan.opbouw = { buitenwand: 'spouwmuur' };
    const c = woningConstructie(plan, cat);
    const boven = c.delen.find((d) => d.muur?.muur.as === 'h' && d.muur.muur.lijn === 0)!;
    expect(boven.deel.maten.d).toBeCloseTo(39.2, 1);
    expect(boven.zet.z).toBeCloseTo(-19.6, 1);
  });
});

describe('constructie van een woning: vloeren en daken', () => {
  it('de vloer boven de trap heeft een trapgat: geen balk loopt door de trap', () => {
    const { plan } = voorbeeldWoning();
    const c = woningConstructie(plan, cat);
    const trap = plan.meubels.find((m) => m.type === 'trap')!;
    const gat = meubelVoetafdruk(trap);
    const vloer = c.delen.find((d) => d.plaats === 'verdiepingsvloer' && d.vlak && d.vlak.x <= gat.x && d.vlak.x + d.vlak.b >= gat.x + gat.b && d.vlak.y <= gat.y && d.vlak.y + d.vlak.d >= gat.y + gat.d)!;
    expect(vloer).toBeDefined();
    expect(vloer.deel.vlak!.openingen).toHaveLength(1);
    const balken = constructieBlokken(vloer, { lagen: false }).filter((b) => b.code.includes('.skelet.'));
    const binnen = 1;
    const door = balken.filter((b) => b.x < gat.x + gat.b - binnen && b.x + b.b > gat.x + binnen && b.z < gat.y + gat.d - binnen && b.z + b.d > gat.y + binnen);
    expect(door.map((b) => b.code)).toEqual([]);
    // Raveelbalken (rol randbalk) aan de kanten van het gat.
    expect(vloer.deel.stukken.filter((s) => s.rol === 'randbalk').length).toBeGreaterThan(2);
  });

  it('een vloervlak zonder gaten is precies dat van vroeger', () => {
    const a = vloervlak({ lengte: 400, breedte: 300, opbouw: O.verdiepingsvloer_hout! }, M);
    const b = vloervlak({ lengte: 400, breedte: 300, opbouw: O.verdiepingsvloer_hout!, openingen: [] }, M);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('zonder dakkeuze een plat dak; met een zadeldak twee dakvlakken binnen het dak van de afgewerkte weergave', () => {
    const { plan } = voorbeeldWoning();
    expect(woningConstructie(plan, cat).delen.some((d) => d.plaats === 'platDak' && d.niveau === 1)).toBe(true);
    for (const richting of ['onder', 'boven', 'links', 'rechts'] as const) {
      for (const vorm of ['zadel', 'lessenaar'] as const) {
        const p = kopie(plan);
        const keuze: DakKeuze = { ...standaardDak(), vorm, helling: 30, richting, oversteek: 40, bedekking: { materiaal: 'pannen', kleur: 'rood' } };
        p.dak = keuze;
        const c = woningConstructie(p, cat);
        const vlakken = c.delen.filter((d) => d.plaats === 'hellendDak');
        expect(vlakken, `${vorm} ${richting}`).toHaveLength(vorm === 'zadel' ? 2 : 1);
        // Het dak van de afgewerkte weergave (met de dikte van het plan) en dat van de constructie liggen op een paar cm na op dezelfde plaats.
        const af = plattegrond3D(p, cat).blokken.find((b) => b.code === 'dak_opbouw')!;
        const blokken = vlakken.flatMap((d) => constructieBlokken(d, { lagen: false }));
        const x0 = Math.min(...blokken.map((b) => b.x)), x1 = Math.max(...blokken.map((b) => b.x + b.b));
        const z0 = Math.min(...blokken.map((b) => b.z)), z1 = Math.max(...blokken.map((b) => b.z + b.d));
        expect(Math.abs(x0 - af.x), `${vorm} ${richting} x0`).toBeLessThan(4);
        expect(Math.abs(x1 - (af.x + af.b)), `${vorm} ${richting} x1`).toBeLessThan(4);
        expect(Math.abs(z0 - af.z), `${vorm} ${richting} z0`).toBeLessThan(4);
        expect(Math.abs(z1 - (af.z + af.d)), `${vorm} ${richting} z1`).toBeLessThan(4);
        // De onderkant van het dak gaat door de buitenkant van de muurkop: de kepers beginnen er niet hoger dan de muren.
        const ymin = Math.min(...blokken.map((b) => Math.min(b.y, ...(b.doorsnede ?? []).map((q) => q[1]))));
        expect(ymin).toBeLessThan(c.hellend!.y);
      }
    }
  });

  it('de topgevels van een zadeldak blijven onder het dak en tellen mee in de meetstaat', () => {
    const { plan } = voorbeeldWoning();
    plan.dak = { ...standaardDak(), vorm: 'zadel', helling: 35, richting: 'onder', bedekking: { materiaal: 'pannen', kleur: 'rood' } };
    const c = woningConstructie(plan, cat);
    const gevels = c.delen.filter((d) => d.code.startsWith('topgevel_'));
    expect(gevels).toHaveLength(2);
    const { dak, y } = c.hellend!;
    for (const g of gevels) {
      expect(g.deel.stukken.filter((s) => s.rol === 'stijl').length).toBeGreaterThan(4);
      for (const b of constructieBlokken(g)) {
        // De nok ligt langs x: de hoogte van het dak hangt af van z (y op het plan).
        for (const [pz, h] of b.doorsnede!) expect(h).toBeLessThanOrEqual(y + dakHoogte(dak, pz) + 0.5);
      }
      // Een driehoek: de helft van breedte × hoogte van de nok.
      expect(g.deel.lagen[0]!.oppervlakte).toBeCloseTo(((dak.p1 - dak.p0) * dak.nok) / 2 / 10000, 0);
    }
    // Zonder dak in beeld ook geen topgevel.
    expect(constructie3D(plan, cat, { dak: false }, c).blokken.some((b) => b.code.includes('topgevel_'))).toBe(false);
  });

  it('topgevels in de vier richtingen, bij een zadeldak en een lessenaar: overal onder het dak', () => {
    const { plan } = voorbeeldWoning();
    for (const richting of ['onder', 'boven', 'links', 'rechts'] as const) {
      for (const vorm of ['zadel', 'lessenaar'] as const) {
        const p = kopie(plan);
        p.dak = { ...standaardDak(), vorm, helling: 30, richting, oversteek: 40, bedekking: { materiaal: 'pannen', kleur: 'rood' } };
        const c = woningConstructie(p, cat);
        const { dak, y } = c.hellend!;
        const gevels = c.delen.filter((d) => d.code.startsWith('topgevel_'));
        // Zadel: twee driehoeken; lessenaar: twee schuine kanten en de hoge muur (elk muurvlak een eigen stuk: een gevel
        // langs drie ruimtes geeft drie stukken).
        expect(gevels.length, `${vorm} ${richting}`).toBeGreaterThanOrEqual(vorm === 'zadel' ? 2 : 3);
        if (vorm === 'zadel') {
          const m2 = gevels.reduce((t, g) => t + g.deel.lagen[0]!.oppervlakte, 0);
          expect(m2, richting).toBeCloseTo(((dak.p1 - dak.p0) * dak.nok) / 10000, 0);
        }
        for (const b of gevels.flatMap((g) => constructieBlokken(g))) {
          // De plaats dwars op de nok: z bij een nok langs x, x bij een nok langs z (een bereik: de laagste kant telt).
          const langsZ = dak.nokAs === 'x';
          for (const [q, h] of b.doorsnede!) {
            const ps = (b.as === 'x') === langsZ ? [q] : langsZ ? [b.z, b.z + b.d] : [b.x, b.x + b.b];
            expect(h, `${vorm} ${richting} ${b.code}`).toBeLessThanOrEqual(y + Math.min(...ps.map((x) => dakHoogte(dak, x))) + 0.5);
          }
        }
      }
    }
  });

  it('een lichtkoepel in een plat dak: een gat in de balklaag, raveelbalken en de koepel erop', () => {
    const { plan } = voorbeeldWoning();
    plan.dak = standaardDak();
    plan.daklichten = [{ id: 'k1', type: 'koepel_100', x: 360, y: 590, b: 100, d: 100, niveau: 0 }];
    const c = woningConstructie(plan, cat);
    const dak = c.delen.find((d) => d.plaats === 'platDak' && d.vlak && d.vlak.x <= 360 && d.vlak.x + d.vlak.b >= 460 && d.vlak.y <= 590 && d.vlak.y + d.vlak.d >= 690)!;
    expect(dak.deel.vlak!.openingen).toHaveLength(1);
    const balken = constructieBlokken(dak, { lagen: false }).filter((b) => b.code.includes('.skelet.'));
    expect(balken.filter((b) => b.x < 459 && b.x + b.b > 361 && b.z < 689 && b.z + b.d > 591).map((b) => b.code)).toEqual([]);
    expect(c.stukken.some((s) => s.blokken.some((b) => b.code.includes('daklicht_k1_koepel')))).toBe(true);
    expect(constructie3D(plan, cat, {}, c).blokken.some((b) => b.code.includes('daklicht_k1'))).toBe(true);
  });

  it('een vrije vorm zonder verdieping erboven geeft geen melding over een vloer', () => {
    const plan = doos();
    zetOmtrek(plan.ruimtes[0]!, [[0, 0], [600, 0], [700, 400], [0, 400]]);
    const c = woningConstructie(plan, cat);
    expect(c.meldingen.filter((m) => /Vloer boven/.test(m))).toEqual([]);
    // De vloer op de grond van een vrije vorm is een effen plaat (en dat staat erbij).
    expect(c.meldingen.some((m) => /Vloer van Kamer: een vrije vorm/.test(m))).toBe(true);
  });

  it('de meetstaat telt alle bouwdelen; de 3D tekent elk stuk hout dat ze telt', () => {
    const { plan } = voorbeeldWoning();
    plan.dak = { ...standaardDak(), vorm: 'zadel', helling: 35, richting: 'onder', bedekking: { materiaal: 'pannen', kleur: 'rood' } };
    const c = woningConstructie(plan, cat);
    const regels = woningMeetstaat(plan, cat, c);
    expect(regels).toEqual(meetstaat(c.delen.map((d) => d.deel), woningOpbouwCatalogus.materialen));
    const stukken = regels.filter((r) => r.groep === 'hout').reduce((t, r) => t + r.aantal!, 0);
    const s = constructie3D(plan, cat, {}, c);
    expect(s.blokken.filter((b) => b.code.includes('.skelet.')).length).toBe(stukken);
    expect(s.samenvoegen).toBe(true);
  });

  it('het kader is dat van de afgewerkte woning; muren laag snijdt de muren van de bovenste verdieping af', () => {
    const { plan } = voorbeeldWoning();
    const s = constructie3D(plan, cat);
    expect(s.kader).toEqual(plattegrond3D(plan, cat, { meubels: false }).kader);
    const laag = constructie3D(plan, cat, { laag: 110, totNiveau: 0 });
    const muren = laag.blokken.filter((b) => b.code.startsWith('constructie.wand_0'));
    expect(muren.length).toBeGreaterThan(50);
    expect(Math.max(...muren.map((b) => b.y + b.h))).toBeLessThanOrEqual(110.01);
    expect(laag.blokken.some((b) => b.code.startsWith('constructie.wand_1'))).toBe(false);
  });
});

describe('constructie van een woning: aanwijzing voor EPB en schatting van de stabiliteit', () => {
  it('een U-waarde per gebruikte opbouw, met het voorbehoud; het aandeel hout komt uit de woning', () => {
    const { plan } = voorbeeldWoning();
    const lijst = woningWarmte(plan, cat, warmtewaarden);
    expect(lijst.map((w) => w.code)).toEqual(['hsb_steenstrips', 'hsb_hout', 'binnenwand_hsb', 'vloer_volle_grond', 'verdiepingsvloer_hout', 'plat_dak_warm']);
    for (const w of lijst) {
      expect(w.uitkomst.voorbehoud).toContain(WARMTE_VOORBEHOUD);
      expect(w.m2).toBeGreaterThan(0);
    }
    const hout = lijst.find((w) => w.code === 'hsb_hout')!;
    expect(hout.aandeelHout).toBeGreaterThan(0.0633);
    expect(hout.uitkomst.uWaarde).not.toBeNull();
    expect(hout.uitkomst.aannames[0]).toMatch(/geteld uit/);
  });

  it('de latei boven het schuifraam van 4 m is te licht; de vloeren volstaan; elke schatting zegt dat ze een schatting is', () => {
    const { plan } = voorbeeldWoning();
    const lijst = woningStabiliteit(plan, cat, stabiliteitswaarden);
    for (const x of lijst) expect(x.schatting.voorbehoud).toBe(STABILITEIT_VOORBEHOUD);
    const latei4m = lijst.flatMap((x) => x.schatting.onderdelen).find((o) => o.rol === 'latei' && /400 cm/.test(o.wat));
    expect(latei4m?.uitkomst.oordeel).toBe('te licht');
    const vloeren = lijst.filter((x) => x.plaats === 'verdiepingsvloer');
    expect(vloeren.length).toBe(4);
    for (const v of vloeren) expect(v.schatting.oordeel).toBe('volstaat');
  });
});

describe('doorsnede', () => {
  it('een snede dwars door de voorbeeldwoning met zadeldak: de lagen, de namen, de maten en het voorbehoud', () => {
    const { plan } = voorbeeldWoning();
    plan.dak = { ...standaardDak(), vorm: 'zadel', helling: 35, richting: 'onder', bedekking: { materiaal: 'pannen', kleur: 'rood' } };
    const b = snedeBereik(plan, 'dwars');
    expect(b).toEqual({ min: 0, max: 1400, midden: 410 });
    const svg = tekenDoorsnede(plan, cat, { richting: 'dwars', plaats: b.midden });
    for (const naam of ['Buitenmuur', 'Binnenmuur', 'Vloer', 'Dak', 'Vloer op de grond']) expect(svg).toContain(`>${naam}</text>`);
    expect(svg).toContain('nok');
    expect(svg).toContain(CONSTRUCTIE_VOORBEHOUD.split(':')[0]);
    // De lagen van de buitenmuur (steenstrips) en van het dak (pannen) zitten in de tekening.
    expect(svg).toContain('data-laag="Steenstrips"');
    expect(svg).toContain('data-laag="Dakpannen"');
    // Langs, door het trapgat: de vloer erboven is daar onderbroken (twee stukken parket in de snede door de inkom).
    const langs = tekenDoorsnede(plan, cat, { richting: 'langs', plaats: 200 });
    expect(langs.match(/data-laag="Parket"/g)!.length).toBeGreaterThanOrEqual(2);
    // Naast de woning: niets.
    expect(tekenDoorsnede(plan, cat, { richting: 'dwars', plaats: 5000 })).toContain('raakt hier niets');
  });
});
