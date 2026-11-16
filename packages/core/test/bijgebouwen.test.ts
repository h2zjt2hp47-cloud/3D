import { describe, expect, it } from 'vitest';
import { berekenConfiguratie, controleerModel, controleerOpbouw, type Blok, type ConfiguratieResultaat, type Keuzes, type ProductModel } from '../src/index.js';
import {
  bijgebouwDak, bijgebouwGlaswand, bijgebouwMaterialen as M, bijgebouwModellen, bijgebouwPrijslijst, bijgebouwSchutting, bijgebouwVloer, bijgebouwWand,
  overkapping, overkappingVertrekpunten as OV, tuinhuis, tuinhuisVertrekpunten as TV, type BijgebouwBedekking,
} from '../voorbeelden/bijgebouwen.js';
import { bijgebouw3D, bijgebouwMeetstaat, bijgebouwSamenstelling, type GeplaatstBouwdeel } from '../voorbeelden/bijgebouwen3d.js';

const bereken = (model: ProductModel, k: Keuzes = {}) => berekenConfiguratie(model, k, bijgebouwPrijslijst);
const overk = (k: Keuzes = {}) => bereken(overkapping, k);
const tuin = (k: Keuzes = {}) => bereken(tuinhuis, k);
const codes = (r: ConfiguratieResultaat) => r.meldingen.map((m) => m.code);
const fouten = (r: ConfiguratieResultaat) => r.meldingen.filter((m) => m.ernst === 'fout').map((m) => m.melding);
const delen = (r: ConfiguratieResultaat, begin: string) => bijgebouwSamenstelling(r).delen.filter((g) => g.code.startsWith(begin));
const blokken = (r: ConfiguratieResultaat, begin: string, weergave: 'afgewerkt' | 'constructie' = 'afgewerkt') => bijgebouw3D(r, weergave).blokken.filter((b) => b.code.startsWith(begin));

/** Het omsluitende kader van blokken; bij een prisma tellen ook de punten van de doorsnede mee. */
function omvang(lijst: Blok[]) {
  const x: number[] = [], y: number[] = [], z: number[] = [];
  for (const b of lijst) {
    x.push(b.x, b.x + b.b); y.push(b.y, b.y + b.h); z.push(b.z, b.z + b.d);
    for (const [p, h] of b.doorsnede ?? []) { (b.as === 'z' ? x : z).push(p); y.push(h); }
  }
  return { x0: Math.min(...x), x1: Math.max(...x), y0: Math.min(...y), y1: Math.max(...y), z0: Math.min(...z), z1: Math.max(...z) };
}
/** Het kader van een geplaatst bouwdeel in het bijgebouw. */
function plek(g: GeplaatstBouwdeel) {
  const m = g.deel.maten, om = g.draai === 90 || g.draai === 270;
  return { x0: g.x, x1: g.x + (om ? m.d : m.b), y0: g.y, y1: g.y + m.h, z0: g.z, z1: g.z + (om ? m.b : m.d) };
}

/** Wat voor elke 3D van een bijgebouw moet gelden. */
function controleerScene(r: ConfiguratieResultaat, naam: string) {
  for (const weergave of ['afgewerkt', 'constructie'] as const) {
    const s = bijgebouw3D(r, weergave);
    expect(s.blokken.length, naam).toBeGreaterThan(5);
    // Unieke codes, eindige maten groter dan nul, en niets onder de grond.
    expect(new Set(s.blokken.map((b) => b.code)).size, `${naam}: dubbele codes`).toBe(s.blokken.length);
    for (const b of s.blokken) {
      for (const v of [b.x, b.y, b.z, b.b, b.h, b.d]) expect(Number.isFinite(v), `${naam}: ${b.code}`).toBe(true);
      expect(Math.min(b.b, b.h, b.d), `${naam}: ${b.code} heeft een maat nul`).toBeGreaterThan(0);
      expect(b.y, `${naam}: ${b.code} zit onder de grond`).toBeGreaterThanOrEqual(-0.01);
      // Het kader van een prisma past op zijn doorsnede: dat vangt een foute plaatsing of draaiing.
      if (b.vorm === 'prisma') {
        const p = b.doorsnede!.map((q) => q[0]), y = b.doorsnede!.map((q) => q[1]);
        const [van, maat] = b.as === 'z' ? [b.x, b.b] : [b.z, b.d];
        expect(Math.min(...p), `${naam}: ${b.code}`).toBeCloseTo(van, 1);
        expect(Math.max(...p) - Math.min(...p), `${naam}: ${b.code}`).toBeCloseTo(maat, 1);
        expect(Math.min(...y), `${naam}: ${b.code}`).toBeCloseTo(b.y, 1);
        expect(Math.max(...y) - Math.min(...y), `${naam}: ${b.code}`).toBeCloseTo(b.h, 1);
      }
    }
    // Alles blijft binnen het kader van de scène.
    const o = omvang(s.blokken), k = s.kader;
    expect(o.x0, naam).toBeGreaterThanOrEqual(k.x);
    expect(o.x1, naam).toBeLessThanOrEqual(k.x + k.b);
    expect(o.z0, naam).toBeGreaterThanOrEqual(k.z);
    expect(o.z1, naam).toBeLessThanOrEqual(k.z + k.d);
    expect(o.y1, naam).toBeLessThanOrEqual(k.h + 0.01);
    // De scène is gewone data: ze komt ongeschonden door JSON (zo gaat ze in een 3D-pakket).
    expect(JSON.parse(JSON.stringify(s)), naam).toEqual(s);
  }
  // De bouwdelen hebben niets moeten inkorten of weglaten.
  expect(bijgebouwSamenstelling(r).meldingen, naam).toEqual([]);
}

/** Het hoogste punt van het bijgebouw zelf (zonder het stuk gevel erachter). */
const top = (r: ConfiguratieResultaat) => omvang(bijgebouw3D(r).blokken.filter((b) => b.code !== 'gevel')).y1;

/** Een geldige dakkeuze bij elke bedekking van de overkapping. */
const DAK_BIJ: Record<BijgebouwBedekking, Keuzes> = {
  epdm: { dakvorm: 'plat' }, open: { dakvorm: 'plat' },
  zink: { dakvorm: 'lessenaar' }, polycarbonaat: { dakvorm: 'lessenaar' }, glas: { dakvorm: 'lessenaar' },
  pannen: { dakvorm: 'zadel' }, pannen_antraciet: { dakvorm: 'zadel' }, leien: { dakvorm: 'zadel' },
};
/** Ruime tijd voor de tests die honderden gebouwen doorrekenen (op een drukke machine). */
const LANG = 60000;
const DAKEN: Keuzes[] = [
  { dakvorm: 'plat', bedekking: 'epdm' },
  { dakvorm: 'plat', bedekking: 'open' },
  { dakvorm: 'lessenaar', bedekking: 'epdm', helling_lessenaar: 'h5' },
  { dakvorm: 'lessenaar', bedekking: 'glas', helling_lessenaar: 'h15' },
  { dakvorm: 'zadel', bedekking: 'pannen', helling_zadel: 'h20' },
  { dakvorm: 'zadel', bedekking: 'leien', helling_zadel: 'h45' },
];

describe('bijgebouwen: de modellen', () => {
  it('beide modellen zijn zonder fouten en hun standaardwaarden zijn geldig', () => {
    for (const model of [overkapping, tuinhuis]) {
      expect(controleerModel(model), model.code).toEqual([]);
      const r = bereken(model);
      expect(fouten(r), model.code).toEqual([]);
      expect(r.geldig, model.code).toBe(true);
      expect(bijgebouwModellen[model.code]).toBe(model);
    }
  });

  it('zonder prijzen: een lege prijslijst, een lege stuklijst en een prijs van nul', () => {
    expect(bijgebouwPrijslijst).toEqual({});
    for (const model of [overkapping, tuinhuis]) {
      const r = bereken(model);
      expect(model.stuklijst).toEqual([]);
      expect(r.stuklijst).toEqual([]);
      expect(r.prijs).toMatchObject({ kostprijs: 0, brutoprijsExcl: 0, verkoopprijsExcl: 0, btw: 0, verkoopprijsIncl: 0 });
      expect(JSON.stringify(bijgebouwMeetstaat(r))).not.toMatch(/prijs|kost|euro|€/i);
    }
  });

  it('de opbouwen zijn geldig, gebruiken bestaande materialen en zeggen dat ze niet nagelezen zijn', () => {
    const bedekkingen: BijgebouwBedekking[] = ['epdm', 'zink', 'pannen', 'pannen_antraciet', 'leien', 'polycarbonaat', 'glas', 'open'];
    const alle = [
      ...bedekkingen.flatMap((b) => [bijgebouwDak(b, 'hout_douglas'), bijgebouwDak(b, 'hout_eik', 'dakbeschot_dwars', true)]),
      bijgebouwSchutting('hout_douglas', 'gevel_eik_staand'), bijgebouwGlaswand,
      bijgebouwWand('gevel_zwart_liggend', false), bijgebouwWand('gevel_zwart_staand', true, 120),
      bijgebouwVloer('klinkers')!, bijgebouwVloer('tegels')!, bijgebouwVloer('terras')!, bijgebouwVloer('beton')!,
    ];
    expect(bijgebouwVloer('geen')).toBeNull();
    for (const o of alle) {
      expect(controleerOpbouw(o, M).filter((p) => p.ernst === 'fout'), o.naam).toEqual([]);
      expect(o.herkomst?.nagelezen, o.naam).toBe(false);
    }
    // Elke keuze van hout en bekleding wijst naar een materiaal dat bestaat.
    for (const model of [overkapping, tuinhuis]) {
      for (const k of model.kenmerken) {
        if (k.type !== 'keuze') continue;
        for (const kz of k.keuzes) {
          const m = kz.eigenschappen?.materiaal;
          if (typeof m !== 'string') continue;
          if (k.code === 'hout') expect(M[m], m).toBeDefined();
          else for (const richting of ['staand', 'liggend']) expect(M[`${m}_${richting}`], m).toBeDefined();
        }
      }
    }
  });

  it('de vertrekpunten zijn geldig en geven elk hun eigen gebouw', () => {
    for (const [naam, v] of Object.entries(OV)) {
      const r = overk(v.keuzes);
      expect(fouten(r), naam).toEqual([]);
      controleerScene(r, naam);
    }
    for (const [naam, v] of Object.entries(TV)) {
      const r = tuin(v.keuzes);
      expect(fouten(r), naam).toEqual([]);
      controleerScene(r, naam);
    }
    // Carport: vrijstaand, plat dak met EPDM, 600 × 500.
    expect(overk(OV.carport.keuzes).afgeleid).toMatchObject({ palen: 8, helling: 0, grondvlak_m2: 30 });
    // Terrasoverkapping: tegen een gevel, lessenaar met glas.
    const terras = overk(OV.terras.keuzes);
    expect(blokken(terras, 'gevel')).toHaveLength(1);
    expect(blokken(terras, 'dak.1.dek.').every((b) => b.soort === 'glas')).toBe(true);
    // Pergola: alleen balken, geen dakbeschot, geen boeiboord.
    const pergola = overk(OV.pergola.keuzes);
    expect(blokken(pergola, 'dak.1.dek.')).toEqual([]);
    expect(delen(pergola, 'boeiboord')).toEqual([]);
    expect(blokken(pergola, 'dak.1.skelet.').length).toBeGreaterThan(5);
    // Poolhouse: geïsoleerd, met een schuifraam en een luifel op palen.
    const pool = tuin(TV.poolhouse.keuzes);
    expect(bijgebouwMeetstaat(pool).some((x) => x.groep === 'isolatie' && x.materiaal === 'minerale_wol')).toBe(true);
    expect(blokken(pool, 'wand.voor.1.deur1.vleugel').length).toBeGreaterThan(0);
    expect(delen(pool, 'paal')).toHaveLength(4);
  });
});

describe('bijgebouwen: uitersten en elke keuze', () => {
  it('overkapping: de kleinste en de grootste maten, vrijstaand en tegen de gevel, met elk dak', () => {
    for (const breedte of [200, 900]) for (const diepte of [250, 800]) for (const hoogte of [210, 260]) {
      for (const plaatsing of ['los', 'gevel']) for (const dak of DAKEN) for (const [paal, oversteek] of [['p12', 0], ['p20', 60]] as const) {
        if (plaatsing === 'gevel' && dak.dakvorm === 'zadel') continue;
        const k: Keuzes = { breedte, diepte, hoogte, plaatsing, paal, oversteek, ...dak };
        const naam = JSON.stringify(k), r = overk(k);
        expect(fouten(r), naam).toEqual([]);
        controleerScene(r, naam);
        // Het hoogste punt in het model is dat van de 3D (boven de vloer).
        expect(top(r) - Number(r.afgeleid.dikte_vloer), naam).toBeCloseTo(Number(r.afgeleid.tophoogte), -0.4);
        // Zoveel palen als het model zegt.
        expect(delen(r, 'paal'), naam).toHaveLength(Number(r.afgeleid.palen));
      }
    }
  }, LANG);

  it('overkapping: elke keuze apart, bovenop de standaardwaarden', () => {
    for (const k of overkapping.kenmerken) {
      if (k.type === 'getal') continue;
      const waarden = k.type === 'janee' ? [true, false] : k.keuzes.map((kz) => kz.code);
      for (const w of waarden) {
        const keuzes: Keuzes = {
          ...(k.code === 'bedekking' ? DAK_BIJ[w as BijgebouwBedekking] : {}),
          ...(k.code === 'helling_lessenaar' ? { dakvorm: 'lessenaar' } : {}),
          ...(k.code === 'helling_zadel' ? { dakvorm: 'zadel', bedekking: 'pannen' } : {}),
          ...(k.code === 'dakvorm' && w === 'zadel' ? { bedekking: 'pannen' } : {}),
          [k.code]: w,
        };
        const naam = JSON.stringify(keuzes), r = overk(keuzes);
        expect(fouten(r), naam).toEqual([]);
        controleerScene(r, naam);
      }
    }
  });

  it('overkapping: wanden, berging en schoren samen, onder elk dak', () => {
    const wanden: Keuzes[] = [
      { wand_voor: 'glas', wand_links: 'dicht', wand_rechts: 'halfhoog', wand_achter: 'dicht' },
      { wand_links: 'glas', wand_rechts: 'dicht', wand_achter: 'halfhoog' },
      { berging: 'achter', berging_maat: 200, diepte: 700, wand_links: 'dicht' },
      { berging: 'opzij', berging_maat: 250, breedte: 800, wand_achter: 'dicht' },
      { berging: 'achter', berging_maat: 100, wand_rechts: 'glas' },
      { berging: 'opzij', berging_maat: 100 },
    ];
    for (const w of wanden) for (const dak of DAKEN) for (const plaatsing of ['los', 'gevel']) for (const schoren of [false, true]) {
      if (plaatsing === 'gevel' && dak.dakvorm === 'zadel') continue;
      const k: Keuzes = { ...w, ...dak, plaatsing, schoren, plankrichting: schoren ? 'liggend' : 'staand' };
      const naam = JSON.stringify(k), r = overk(k);
      expect(fouten(r), naam).toEqual([]);
      controleerScene(r, naam);
      expect(delen(r, 'paal'), naam).toHaveLength(Number(r.afgeleid.palen));
    }
  }, LANG);

  it('tuinhuis: de kleinste en de grootste maten, met elk dak, elke deur en een luifel', () => {
    const daken: Keuzes[] = [
      { dakvorm: 'plat' },
      { dakvorm: 'lessenaar', helling_lessenaar: 'h5' },
      { dakvorm: 'lessenaar', helling_lessenaar: 'h15', bedekking: 'zink' },
      { dakvorm: 'zadel', bedekking: 'pannen', helling_zadel: 'h20' },
      { dakvorm: 'zadel', bedekking: 'zink', helling_zadel: 'h45' },
    ];
    for (const breedte of [200, 1000]) for (const diepte of [200, 500]) for (const wandhoogte of [200, 260]) {
      for (const dak of daken) for (const [luifel, isolatie] of [[0, false], [400, true]] as const) {
        // De breedste deur die past, en zoveel ramen als het model toelaat.
        const deur = breedte === 200 ? 'enkel' : 'schuifraam';
        const basis: Keuzes = { breedte, diepte, wandhoogte, luifel, isolatie, deur, oversteek: luifel ? 60 : 5, ramen_voor: 0, ramen_rechts: 0, ...dak };
        const max = Object.fromEntries(tuin(basis).kenmerken.filter((x) => x.code.startsWith('ramen_')).map((x) => [x.code, x.max ?? 0]));
        for (const k of [basis, { ...basis, ...max }]) {
          const naam = JSON.stringify(k), r = tuin(k);
          expect(fouten(r), naam).toEqual([]);
          controleerScene(r, naam);
          expect(top(r), naam).toBeCloseTo(Number(r.afgeleid.tophoogte), -0.4);
          // Elk gevraagd raam staat er, en geen enkele opening is ingekort.
          const gevraagd = Number(k.ramen_voor) + Number(k.ramen_links ?? 0) + Number(k.ramen_rechts) + Number(k.ramen_achter ?? 0);
          expect(delen(r, 'wand.').reduce((som, g) => som + (g.deel.vlak?.openingen.length ?? 0), 0), naam).toBe(gevraagd + 1);
          expect(delen(r, 'paal'), naam).toHaveLength(Number(r.afgeleid.luifel_palen));
        }
      }
    }
  }, LANG);

  it('tuinhuis: elke keuze apart, bovenop de standaardwaarden', () => {
    for (const k of tuinhuis.kenmerken) {
      if (k.type === 'getal') continue;
      const waarden = k.type === 'janee' ? [true, false] : k.keuzes.map((kz) => kz.code);
      for (const w of waarden) {
        const dak: Keuzes = k.code === 'bedekking' ? { dakvorm: w === 'epdm' ? 'plat' : 'zadel' }
          : k.code === 'helling_lessenaar' ? { dakvorm: 'lessenaar' }
            : k.code === 'helling_zadel' || (k.code === 'dakvorm' && w === 'zadel') ? { dakvorm: 'zadel', bedekking: 'pannen' } : {};
        const keuzes: Keuzes = { ...dak, ...(k.code === 'terras' ? { luifel: 200 } : {}), [k.code]: w };
        const naam = JSON.stringify(keuzes), r = tuin(keuzes);
        expect(fouten(r), naam).toEqual([]);
        controleerScene(r, naam);
      }
    }
  });

  it('een ongeldige keuze geeft een fout in gewone taal, en de 3D wordt toch getekend', () => {
    const zadelTegenGevel = overk({ plaatsing: 'gevel', dakvorm: 'zadel', bedekking: 'pannen' });
    expect(zadelTegenGevel.geldig).toBe(false);
    expect(fouten(zadelTegenGevel).join(' ')).toMatch(/zadeldak tegen een gevel/);
    expect(bijgebouw3D(zadelTegenGevel).blokken.length).toBeGreaterThan(10);
    const pannenOpPlat = overk({ bedekking: 'pannen' });
    expect(fouten(pannenOpPlat).join(' ')).toMatch(/zadeldak/);
    expect(bijgebouw3D(pannenOpPlat).blokken.length).toBeGreaterThan(10);
    const teBreed = overk({ breedte: 950 });
    expect(codes(teBreed)).toContain('breedte.max');
    expect(bijgebouw3D(teBreed).blokken.length).toBeGreaterThan(10);
    // Een schuifraam van 3 m past niet in een tuinhuis van 3 m breed.
    expect(codes(tuin({ breedte: 300, deur: 'schuifraam', ramen_voor: 0 }))).toContain('deur_past_niet');
    expect(codes(tuin({ breedte: 400, deur: 'dubbel', ramen_voor: 1 }))).toContain('ramen_voor.max');
    // Een luifel van minder dan 1 m bestaat niet: de 3D tekent dan een tuinhuis zonder luifel.
    const kort = tuin({ luifel: 50 });
    expect(codes(kort)).toContain('luifel_klein');
    expect(bijgebouwSamenstelling(kort).delen.filter((g) => g.code.startsWith('paal.'))).toEqual([]);
    expect(codes(tuin({ luifel: 100 }))).not.toContain('luifel_klein');
    expect(bijgebouw3D(tuin({ breedte: 300, deur: 'schuifraam', ramen_voor: 5 })).blokken.length).toBeGreaterThan(10);
  });
});

describe('overkapping: palen, gevel en wanden', () => {
  it('meer breedte of diepte geeft meer palen, waar de regel dat zegt', () => {
    // Lichte palen (12 × 12): hoogstens 300 cm hart op hart. 312 cm buitenmaat is precies één veld.
    const voor = (r: ConfiguratieResultaat) => delen(r, 'paal').filter((g) => g.z > Number(r.kenmerken.find((k) => k.code === 'diepte')!.waarde) - 20).length;
    expect(overk({ breedte: 310, diepte: 300 }).afgeleid).toMatchObject({ velden_b: 1, velden_d: 1, palen: 4 });
    expect(voor(overk({ breedte: 310, diepte: 300 }))).toBe(2);
    expect(overk({ breedte: 320, diepte: 300 }).afgeleid).toMatchObject({ velden_b: 2, palen: 6 });
    expect(voor(overk({ breedte: 320, diepte: 300 }))).toBe(3);
    expect(voor(overk({ breedte: 620, diepte: 300 }))).toBe(4);
    expect(overk({ breedte: 310, diepte: 320 }).afgeleid).toMatchObject({ velden_b: 1, velden_d: 2, palen: 6 });
    // Zware palen (15 × 15): hoogstens 500 cm.
    expect(overk({ breedte: 510, diepte: 300, paal: 'p15' }).afgeleid).toMatchObject({ velden_b: 1, palen: 4 });
    expect(voor(overk({ breedte: 520, diepte: 300, paal: 'p15' }))).toBe(3);
    // De waarschuwing verschijnt alleen als er een paal bijkomt.
    expect(codes(overk({ breedte: 310, diepte: 300 }))).not.toContain('extra_palen');
    expect(codes(overk({ breedte: 320, diepte: 300 }))).toContain('extra_palen');
    // Over het hele bereik: zoveel palen in de 3D als het model zegt, en nooit verder uit elkaar dan toegelaten.
    for (const paal of ['p12', 'p14', 'p15', 'p20']) for (let breedte = 200; breedte <= 900; breedte += 70) for (const diepte of [250, 520, 800]) {
      for (const extra of [{}, { plaatsing: 'gevel' }, { dakvorm: 'zadel', bedekking: 'pannen' }, { berging: 'achter', berging_maat: 100 }, { berging: 'opzij', berging_maat: 100 }] as Keuzes[]) {
        const r = overk({ paal, breedte, diepte, ...extra }), naam = JSON.stringify({ paal, breedte, diepte, ...extra });
        const p = delen(r, 'paal');
        expect(p, naam).toHaveLength(Number(r.afgeleid.palen));
        const max = Number(r.afgeleid.max_afstand);
        const vooraan = p.filter((g) => g.z > diepte - 25).map((g) => g.x).sort((a, b) => a - b);
        vooraan.slice(1).forEach((x, i) => expect(x - vooraan[i]!, naam).toBeLessThanOrEqual(max + 0.01));
        const links = p.filter((g) => g.x < 1).map((g) => g.z).sort((a, b) => a - b);
        links.slice(1).forEach((z, i) => expect(z - links[i]!, naam).toBeLessThanOrEqual(max + 0.01));
      }
    }
  }, LANG);

  it('tegen de gevel: geen palen achteraan, een muurbalk tegen de gevel en een stuk gevel erachter', () => {
    for (const dak of [{ dakvorm: 'plat' }, { dakvorm: 'lessenaar', bedekking: 'glas' }] as Keuzes[]) {
      const los = overk({ ...dak }), tegen = overk({ ...dak, plaatsing: 'gevel' });
      const p = Number(tegen.afgeleid.p), lb = Number(tegen.afgeleid.ligger_b);
      // Vrijstaand staan er palen op z = 0; tegen de gevel begint de eerste paal pas een veld verder.
      expect(delen(los, 'paal').filter((g) => g.z < p).length).toBe(3);
      expect(delen(tegen, 'paal').filter((g) => g.z < p)).toEqual([]);
      expect(Math.min(...delen(tegen, 'paal').map((g) => g.z))).toBeGreaterThan(100);
      // De muurbalk: een ligger over de hele breedte, met zijn rug tegen de gevel (z = 0).
      const muurbalk = delen(tegen, 'ligger').filter((g) => g.z === 0 && g.deel.maten.b === 600);
      expect(muurbalk).toHaveLength(1);
      expect(muurbalk[0]!.deel.maten.d).toBe(lb);
      // Het stuk gevel staat achter z = 0, breder en hoger dan de overkapping; verder steekt er niets achter de gevel.
      const gevel = blokken(tegen, 'gevel');
      expect(gevel).toHaveLength(1);
      expect(gevel[0]!.z + gevel[0]!.d).toBe(0);
      expect(gevel[0]!.y + gevel[0]!.h).toBeGreaterThan(top(tegen));
      for (const weergave of ['afgewerkt', 'constructie'] as const) {
        const rest = bijgebouw3D(tegen, weergave).blokken.filter((b) => b.code !== 'gevel');
        expect(omvang(rest).z0).toBeGreaterThanOrEqual(0);
        expect(gevel[0]!.x).toBeLessThan(omvang(rest).x0);
      }
      expect(blokken(los, 'gevel')).toEqual([]);
      // Geen boeiboord achteraan: één minder dan vrijstaand.
      expect(delen(tegen, 'boeiboord').length + delen(tegen, 'windveer').length).toBe(delen(los, 'boeiboord').length + delen(los, 'windveer').length - 1);
    }
  });

  it('elke wandkeuze geeft wat ze zegt, aan de juiste zijde', () => {
    // Klein gebouw: één veld per zijde. De palen staan van 0 tot 12 en van 288 tot 300, in x en in z.
    const basis: Keuzes = { breedte: 300, diepte: 300, vloer: 'geen' };
    const zijden = {
      voor: { as: 'z', buiten: 300, zin: 1 }, achter: { as: 'z', buiten: 0, zin: -1 },
      links: { as: 'x', buiten: 0, zin: -1 }, rechts: { as: 'x', buiten: 300, zin: 1 },
    } as const;
    expect(delen(overk(basis), 'wand.')).toEqual([]);
    for (const [zijde, z] of Object.entries(zijden)) {
      const van = (b: Blok) => (z.as === 'x' ? [b.x, b.x + b.b] : [b.z, b.z + b.d]) as [number, number];
      /** Afstand van een blok tot de buitenkant van de palen aan deze zijde: [dichtste, verste]. */
      const diep = (b: Blok) => (z.zin > 0 ? [z.buiten - van(b)[1], z.buiten - van(b)[0]] : [van(b)[0] - z.buiten, van(b)[1] - z.buiten]) as [number, number];

      // Dicht: een wandvlak tot onder de ligger, met de planken aan de buitenkant en het regelwerk erachter.
      const dicht = overk({ ...basis, [`wand_${zijde}`]: 'dicht' });
      const w = delen(dicht, 'wand.');
      expect(w.map((g) => g.code), zijde).toEqual([`wand.${zijde}.1.1`]);
      expect(w[0]!.deel.maten.h, zijde).toBe(220);
      expect(w[0]!.y, zijde).toBe(0);
      const planken = blokken(dicht, `wand.${zijde}.1.1.dek.`), regels = blokken(dicht, `wand.${zijde}.1.1.skelet.`);
      expect(planken.length, zijde).toBeGreaterThan(0);
      expect(regels.length, zijde).toBeGreaterThan(3);
      expect(planken.every((b) => b.soort === 'planken'), zijde).toBe(true);
      for (const b of planken) expect(diep(b), zijde).toEqual([1.5, 3.5]);
      for (const b of regels) expect(diep(b), zijde).toEqual([3.5, 10.5]);
      // De planken staan tussen de twee palen, over het hele veld.
      const langs = (b: Blok) => (z.as === 'x' ? [b.z, b.z + b.d] : [b.x, b.x + b.b]);
      expect(langs(planken[0]!), zijde).toEqual([12, 288]);

      // Halfhoog: dezelfde wand tot 100 cm, met een afdeklat erop.
      const half = overk({ ...basis, [`wand_${zijde}`]: 'halfhoog' });
      expect(delen(half, 'wand.')[0]!.deel.maten.h, zijde).toBe(100);
      expect(delen(half, 'afdeklat'), zijde).toHaveLength(1);
      expect(delen(half, 'afdeklat')[0]!.y, zijde).toBe(100);
      expect(omvang(blokken(half, `wand.${zijde}.`)).y1, zijde).toBe(100);

      // Glas: een glazen vlak in de as van de palen, in beide weergaven, met een rail onder en boven.
      const glas = overk({ ...basis, [`wand_${zijde}`]: 'glas' });
      for (const weergave of ['afgewerkt', 'constructie'] as const) {
        const g = blokken(glas, `wand.${zijde}.`, weergave).filter((b) => b.soort === 'glas');
        expect(g, zijde).toHaveLength(1);
        expect(diep(g[0]!), zijde).toEqual([5.5, 6.5]);
        expect(g[0]!.h, zijde).toBe(220);
        expect(blokken(glas, `wand.${zijde}.`, weergave).filter((b) => b.code.includes('.rail.')), zijde).toHaveLength(2);
      }
      expect(bijgebouwMeetstaat(glas).find((x) => x.materiaal === 'wandglas')?.m2, zijde).toBeCloseTo((276 * 220) / 10000, 2);

      // Open: geen wand aan deze zijde; en een keuze aan één zijde zet niets aan de andere.
      for (const r of [dicht, half, glas]) expect(delen(r, 'wand.').every((g) => g.code.startsWith(`wand.${zijde}.`)), zijde).toBe(true);
    }
    // Liggende planken worden liggend getekend.
    expect(blokken(overk({ ...basis, wand_links: 'dicht', plankrichting: 'liggend' }), 'wand.links.1.1.dek.').every((b) => b.soort === 'planken_h')).toBe(true);
    // Tegen de gevel is er geen achterwand te kiezen.
    const tegen = overk({ ...basis, plaatsing: 'gevel', wand_achter: 'dicht' });
    expect(tegen.kenmerken.find((k) => k.code === 'wand_achter')).toMatchObject({ zichtbaar: false, waarde: null });
    expect(delen(tegen, 'wand.')).toEqual([]);
    // Een dichte voorkant van een carport geeft een waarschuwing.
    expect(codes(overk({ wand_voor: 'dicht' }))).toContain('voorkant_dicht');
    expect(codes(overk({ type: 'terras', wand_voor: 'glas' }))).not.toContain('voorkant_dicht');
  });

  it('een dichte zijwand onder een lessenaarsdak wordt tot onder de schuine ligger gevuld', () => {
    const r = overk({ breedte: 300, diepte: 300, dakvorm: 'lessenaar', helling_lessenaar: 'h10', wand_links: 'dicht' });
    const wig = blokken(r, 'wig.links');
    expect(wig).toHaveLength(1);
    expect(wig[0]).toMatchObject({ vorm: 'prisma', soort: 'planken', x: 1.5, b: 2 });
    // De wig staat op de wand en is alleen afwerking: niet in de constructieweergave, wel in de meetstaat.
    expect(wig[0]!.y).toBeCloseTo(omvang(blokken(r, 'wand.links.')).y1, 1);
    expect(blokken(r, 'wig.', 'constructie')).toEqual([]);
    const zonder = overk({ breedte: 300, diepte: 300, dakvorm: 'lessenaar', helling_lessenaar: 'h10' });
    const m2 = (x: ConfiguratieResultaat) => bijgebouwMeetstaat(x).find((y) => y.materiaal === 'gevel_thermisch_naaldhout_staand')?.m2 ?? 0;
    expect(m2(r)).toBeGreaterThan((276 * 220) / 10000);
    expect(m2(zonder)).toBe(0);
  });

  it('een berging is een afgesloten deel met een deur, binnen de maten van de carport', () => {
    const achter = overk({ diepte: 700, berging: 'achter', berging_maat: 200 });
    expect(achter.afgeleid).toMatchObject({ berging_achter: 200, berging_opzij: 0 });
    // Palen op de scheidingslijn (z = 200), aan beide zijden.
    expect(delen(achter, 'paal').filter((g) => Math.abs(g.z + 6 - 200) < 0.01).map((g) => g.x)).toEqual([0, 588]);
    // De scheidingswand over de hele breedte, met een deur; rondom is de berging dicht.
    const scheiding = delen(achter, 'wand.berging');
    expect(scheiding).toHaveLength(1);
    expect(scheiding[0]!.deel.vlak!.openingen).toEqual([{ u0: 243, u1: 333, v0: 0, v1: 200 }]);
    expect(blokken(achter, 'wand.berging.1.deur.').map((b) => b.code.split('.').pop())).toEqual(['blad', 'kruk']);
    expect(blokken(achter, 'wand.berging.1.deur.', 'constructie')).toEqual([]);
    expect(delen(achter, 'wand.achter').length).toBe(2);
    expect(delen(achter, 'wand.links').length).toBe(1);
    expect(delen(achter, 'wand.rechts').length).toBe(1);
    // Vóór de berging blijft de carport open.
    expect(delen(achter, 'wand.voor')).toEqual([]);
    for (const g of [...delen(achter, 'wand.links'), ...delen(achter, 'wand.rechts')]) expect(plek(g).z1).toBeLessThanOrEqual(200);

    const opzij = overk({ breedte: 800, berging: 'opzij', berging_maat: 220 });
    expect(delen(opzij, 'paal').filter((g) => Math.abs(g.x + 6 - 580) < 0.01).map((g) => g.z)).toEqual([488, 0]);
    // De deur zit vooraan in de berging; de scheidingswand loopt van voor naar achter.
    const voor = delen(opzij, 'wand.voor');
    expect(voor).toHaveLength(1);
    expect(voor[0]!.deel.vlak!.openingen).toHaveLength(1);
    expect(plek(voor[0]!).x0).toBeGreaterThan(580);
    expect(delen(opzij, 'wand.berging')[0]!.draai).toBe(270);
    expect(delen(opzij, 'wand.rechts').length).toBeGreaterThan(0);
    expect(delen(opzij, 'wand.links')).toEqual([]);

    // Alleen bij een carport, en met een waarschuwing als er te weinig plaats overblijft voor de wagen.
    expect(overk({ type: 'terras', berging: 'achter' }).afgeleid.berging_achter).toBe(0);
    expect(codes(overk({ diepte: 500, berging: 'achter', berging_maat: 200 }))).toContain('wagen_diepte');
    expect(codes(achter)).not.toContain('wagen_diepte');
    expect(codes(overk({ breedte: 400, berging: 'opzij', berging_maat: 200 }))).toContain('wagen_breedte');
    expect(codes(overk({ berging: 'opzij', berging_maat: 500 }))).toContain('berging_maat.max');
  });

  it('schoren staan aan de palen onder de liggers, niet in een dichte wand', () => {
    expect(delen(overk(), 'schoor')).toEqual([]);
    // 300 × 400 met lichte palen: vier hoekpalen en één tussenpaal per zijkant; elke paal twee schoren.
    const r = overk({ breedte: 300, diepte: 400, schoren: true });
    expect(delen(r, 'schoor')).toHaveLength(12);
    for (const g of delen(r, 'schoor')) {
      const b = g.deel.stukken[0]!.blok;
      expect(b.vorm).toBe('prisma');
      // 60 cm horizontaal en verticaal, met de bovenkant tegen de onderkant van de ligger (220 cm boven de vloer).
      expect([g.deel.maten.b, g.deel.maten.h]).toEqual([60, 60]);
      expect(plek(g).y1).toBeCloseTo(6 + 220, 1);
    }
    expect(delen(overk({ breedte: 300, diepte: 400, schoren: true, wand_links: 'dicht', wand_achter: 'glas' }), 'schoor')).toHaveLength(12 - 4 - 2);
    expect(delen(overk({ breedte: 300, diepte: 400, schoren: true, wand_links: 'halfhoog' }), 'schoor')).toHaveLength(12);
    expect(codes(overk({ schoren: true, hoogte: 210 }))).toContain('schoren_laag');
  });
});

describe('overkapping: de daken', () => {
  it('plat dak: dakbalken over de kortste maat, boeiboord rondom, oversteek', () => {
    const r = overk({ oversteek: 30 });
    const dak = delen(r, 'dak');
    expect(dak).toHaveLength(1);
    expect(dak[0]!.deel.vlak).toMatchObject({ ligging: 'liggend', lengte: 660, breedte: 560, richting: 'z' });
    expect(plek(dak[0]!)).toMatchObject({ x0: -30, x1: 630, z0: -30, z1: 530 });
    // De dakbalken liggen op de liggers: 6 cm klinkers + 220 cm doorloophoogte + 15 cm ligger.
    expect(dak[0]!.y).toBe(241);
    expect(delen(r, 'boeiboord')).toHaveLength(4);
    expect(blokken(r, 'dakrand.')).toHaveLength(4);
    // Dieper dan breed: de dakbalken draaien mee.
    expect(delen(overk({ breedte: 300, diepte: 500 }), 'dak')[0]!.deel.vlak!.richting).toBe('x');
    // In de afgewerkte weergave zie je de dakbalken, met het dakbeschot en de bedekking erop over het hele vlak.
    expect(blokken(r, 'dak.1.skelet.').length).toBe(dak[0]!.deel.stukken.length);
    expect(blokken(r, 'dak.1.dek.').map((b) => [b.soort, b.b, b.d])).toEqual([['planken_h', 660, 560], ['dak', 660, 560]]);
    expect(codes(overk({ breedte: 600, diepte: 600 }))).toContain('dakbalken');
    expect(codes(overk({ breedte: 600, diepte: 500 }))).not.toContain('dakbalken');
  });

  it('lessenaarsdak: laag vooraan, hoog achteraan, met schuine zijliggers en palen op maat', () => {
    const r = overk({ breedte: 300, diepte: 400, dakvorm: 'lessenaar', helling_lessenaar: 'h10', vloer: 'geen' });
    const tan = Math.tan((10 * Math.PI) / 180);
    const dak = delen(r, 'dak')[0]!;
    expect(dak.deel.vlak).toMatchObject({ ligging: 'hellend', helling: 10 });
    expect(dak.draai).toBe(180);
    // Palen: vooraan 220 cm, achteraan hoger; de tussenpaal heeft een schuine kop.
    const palen = delen(r, 'paal');
    const voor = palen.filter((g) => g.z > 380), achter = palen.filter((g) => g.z < 1);
    expect(voor.map((g) => g.deel.maten.h)).toEqual([220, 220]);
    for (const g of achter) expect(g.deel.maten.h).toBeCloseTo(220 + 388 * tan, 1);
    const tussen = palen.filter((g) => g.z > 1 && g.z < 380);
    expect(tussen).toHaveLength(2);
    expect(tussen[0]!.deel.stukken[0]!.blok.vorm).toBe('prisma');
    // De onderkant van het dak ligt overal op of net boven de liggers: nergens een paal of ligger door het dak.
    const onderDak = (z: number) => 220 + 15 + (394 - z) * tan;
    for (const g of [...palen, ...delen(r, 'ligger')]) {
      const k = plek(g);
      expect(k.y1, g.code).toBeLessThanOrEqual(onderDak(k.z0) + 0.6);
    }
    // Het dak zelf: het laagste punt vooraan (met de oversteek), het hoogste achteraan.
    expect(dak.y).toBeCloseTo(onderDak(420), 1);
    expect(delen(r, 'windveer')).toHaveLength(2);
    expect(delen(r, 'boeiboord')).toHaveLength(2);
  });

  it('zadeldak: een spant op elk palenpaar, gordingen, twee dakvlakken en een nokvorst', () => {
    const r = overk({ breedte: 350, diepte: 650, dakvorm: 'zadel', bedekking: 'pannen', helling_zadel: 'h30', paal: 'p15' });
    // Zware palen: 650 cm diep geeft twee velden, dus drie palenparen en drie spanten.
    expect(r.afgeleid).toMatchObject({ velden_b: 1, velden_d: 2, palen: 6 });
    const spanten = delen(r, 'spant');
    expect(spanten).toHaveLength(3);
    for (const g of spanten) {
      expect(g.deel.soort).toBe('spant');
      expect(g.deel.maten.b).toBe(350);
      // Het spant staat op de zijliggers.
      expect(g.y).toBe(6 + 220 + 20);
    }
    expect(delen(r, 'gording').length).toBeGreaterThanOrEqual(4);
    const dak = delen(r, 'dak');
    expect(dak.map((g) => g.draai)).toEqual([270, 90]);
    // De twee dakvlakken raken elkaar in de nok, in het midden.
    expect(plek(dak[0]!).x1).toBeCloseTo(175, 1);
    expect(plek(dak[1]!).x0).toBeCloseTo(175, 1);
    expect(plek(dak[0]!).y1).toBeCloseTo(plek(dak[1]!).y1, 1);
    expect(blokken(r, 'dak.nokvorst')).toHaveLength(1);
    expect(delen(r, 'windveer')).toHaveLength(4);
    expect(delen(r, 'boeiboord')).toHaveLength(2);
    // De gordingen liggen tussen de spantbenen en de kepers: boven het hoogste punt van het spant ter plaatse, onder het dakvlak.
    expect(omvang(blokken(r, 'gording.')).y1).toBeLessThanOrEqual(plek(dak[0]!).y1);
    // Een dichte achterwand krijgt een gevelvulling in het spant.
    const dicht = overk({ breedte: 350, diepte: 650, dakvorm: 'zadel', bedekking: 'pannen', wand_achter: 'dicht' });
    expect(blokken(dicht, 'topgevel.achter')).toHaveLength(1);
    expect(blokken(r, 'topgevel.')).toEqual([]);
    expect(codes(r)).toContain('vergunning');
  });

  it('de waarschuwing over de vergunning is alleen «na te kijken»', () => {
    const groot = overk({ breedte: 900, diepte: 800 });
    expect(groot.geldig).toBe(true);
    const melding = groot.meldingen.find((m) => m.code === 'vergunning')!;
    expect(melding.ernst).toBe('waarschuwing');
    expect(melding.melding).toMatch(/^Na te kijken/);
    expect(codes(overk({ breedte: 300, diepte: 300 }))).not.toContain('vergunning');
    expect(codes(overk({ breedte: 900, diepte: 800, plaatsing: 'gevel' }))).not.toContain('vergunning');
  });
});

describe('tuinhuis en poolhouse', () => {
  it('vier wanden in houtskelet, met de bekleding buiten en een hoekplank op elke hoek', () => {
    const r = tuin();
    const wanden = delen(r, 'wand.');
    expect(wanden.map((g) => g.code)).toEqual(['wand.voor.1', 'wand.achter.1', 'wand.links.1', 'wand.rechts.1']);
    for (const g of wanden) {
      expect(g.deel.soort).toBe('wandvlak');
      expect(g.deel.stukken.some((s) => s.rol === 'stijl')).toBe(true);
      expect(g.deel.maten.h).toBe(220);
    }
    // De buitenste laag (planken) ligt aan de buitenkant van de voetafdruk van 400 × 300, de binnenbekleding binnen.
    const laag = (zijde: string, n: number) => omvang(blokken(r, `wand.${zijde}.1.afwerking.${n}.`));
    expect(laag('voor', 4)).toMatchObject({ z0: 298, z1: 300 });
    expect(laag('achter', 4)).toMatchObject({ z0: 0, z1: 2 });
    expect(laag('links', 4)).toMatchObject({ x0: 0, x1: 2 });
    expect(laag('rechts', 4)).toMatchObject({ x0: 398, x1: 400 });
    expect(laag('voor', 0).z0).toBeCloseTo(300 - 14.35, 2);
    expect(laag('links', 0).x1).toBeCloseTo(14.35, 2);
    expect(blokken(r, 'wand.voor.1.afwerking.4.').every((b) => b.soort === 'planken')).toBe(true);
    expect(delen(r, 'hoekplank')).toHaveLength(4);
    // De kern van de wand (nergens te zien) heeft de kleur van de gevel: zijn kopse kant schemert anders door in de kijker.
    expect(blokken(r, 'wand.voor.1.kern.').map((b) => b.kleur)).toEqual(blokken(r, 'wand.voor.1.kern.').map(() => M.gevel_thermisch_naaldhout_staand!.kleur));
    expect(blokken(r, 'wand.voor.1.kern.').length).toBeGreaterThan(0);
    // Het geheel: wanden en hoekplanken vullen precies de voetafdruk.
    expect(omvang([...blokken(r, 'wand.').filter((b) => b.code.includes('.afwerking.') || b.code.includes('.kern.')), ...blokken(r, 'hoekplank')])).toMatchObject({ x0: 0, x1: 400, z0: 0, z1: 300, y0: 12, y1: 232 });
    // Liggende planken, een andere houtsoort.
    const eik = tuin({ bekleding: 'eik', plankrichting: 'liggend' });
    expect(blokken(eik, 'wand.achter.1.afwerking.4.')[0]).toMatchObject({ soort: 'planken_h', kleur: M.gevel_eik_liggend!.kleur });
    // Geïsoleerd: dikkere stijlen met isolatie ertussen.
    const warm = tuin({ isolatie: true });
    expect(delen(warm, 'wand.voor')[0]!.deel.maten.d).toBeCloseTo(19.47, 2);
    expect(bijgebouwMeetstaat(warm).some((x) => x.doorsnede === '38 × 140')).toBe(true);
    expect(bijgebouwMeetstaat(r).some((x) => x.groep === 'isolatie')).toBe(false);
  });

  it('de deur en de ramen staan waar ze gevraagd zijn', () => {
    const openingen = (r: ConfiguratieResultaat, zijde: string) => delen(r, `wand.${zijde}`)[0]!.deel.vlak!.openingen;
    const r = tuin({ breedte: 600, deur: 'dubbel', deur_plaats: 'midden', ramen_voor: 2, ramen_links: 1, ramen_rechts: 2, ramen_achter: 3 });
    expect(fouten(r)).toEqual([]);
    // Vooraan: een raam, de dubbele deur van 160 cm in het midden, een raam. Alle bovenkanten op 205 cm.
    const voor = openingen(r, 'voor');
    expect(voor.map((o) => [o.u1 - o.u0, o.v0, o.v1])).toEqual([[90, 95, 205], [160, 0, 205], [90, 95, 205]]);
    expect((voor[1]!.u0 + voor[1]!.u1) / 2).toBe(298); // het midden van de wand, die aan elke kant 2 cm korter is
    expect([openingen(r, 'links').length, openingen(r, 'rechts').length, openingen(r, 'achter').length]).toEqual([1, 2, 3]);
    // Elke opening heeft haar schrijnwerk, alleen in de afgewerkte weergave.
    expect(blokken(r, 'wand.voor.1.deur2.blad').length).toBeGreaterThan(8);
    expect(blokken(r, 'wand.voor.1.deur2.naald')).toHaveLength(1);
    expect(blokken(r, 'wand.voor.1.raam1.').map((b) => b.soort)).toEqual(['gevel', 'gevel', 'gevel', 'gevel', 'glas']) // een mat kader rondom, en het glas;
    expect(blokken(r, 'wand.achter.1.raam').filter((b) => b.soort === 'glas')).toHaveLength(3);
    expect(blokken(r, 'wand.', 'constructie').filter((b) => /\.(deur|raam)\d+\./.test(b.code))).toEqual([]);
    // Het glas van een raam zit in zijn opening, in de wand (gezien van voor staat het eerste raam van de wand rechts).
    const glas = blokken(r, 'wand.voor.1.raam1.glas')[0]!;
    expect(glas.z).toBeGreaterThan(300 - 14.35);
    expect(glas.z + glas.d).toBeLessThan(300);
    // Binnen het kader van 5 cm; het glas grijpt er 0,4 cm in.
    expect(glas.x).toBeCloseTo(598 - voor[0]!.u1 + 5 - 0.4, 2);
    expect(glas.x + glas.b).toBeCloseTo(598 - voor[0]!.u0 - 5 + 0.4, 2);

    // De deur links of rechts (gezien van buiten), en de drie soorten deur.
    const midden = (x: ConfiguratieResultaat) => { const d = omvang(blokken(x, 'wand.voor.1.deur')); return (d.x0 + d.x1) / 2; };
    expect(midden(tuin({ deur_plaats: 'links', ramen_voor: 0 }))).toBeCloseTo(40 + 45, 0);
    expect(midden(tuin({ deur_plaats: 'rechts', ramen_voor: 0 }))).toBeCloseTo(400 - 40 - 45, 0);
    expect(blokken(tuin({ deur: 'enkel' }), 'wand.voor.1.deur').filter((b) => b.code.endsWith('.kruk'))).toHaveLength(1);
    expect(blokken(tuin({ deur: 'dubbel', ramen_voor: 0 }), 'wand.voor.1.deur').filter((b) => b.code.endsWith('.kruk'))).toHaveLength(2);
    const schuif = blokken(tuin({ deur: 'schuifraam', ramen_voor: 0 }), 'wand.voor.1.deur');
    expect(schuif.filter((b) => b.soort === 'glas')).toHaveLength(2);
    expect(omvang(schuif).x1 - omvang(schuif).x0).toBeCloseTo(300 + 2 * 0.4, 2); // het kader grijpt 0,4 cm in de wand
    // Kleur van het schrijnwerk.
    expect(blokken(tuin({ schrijnwerk: 'wit' }), 'wand.voor.1.deur1.kader.links')[0]!.kleur).toBe('#efece4');

    // Een lage wand geeft een lagere deur, met een waarschuwing; de latei vult dan de ruimte tot de bovenregel.
    const laag = tuin({ wandhoogte: 200 });
    expect(codes(laag)).toContain('deur_laag');
    expect(openingen(laag, 'voor').find((o) => o.v0 === 0)!.v1).toBe(186);
    expect(delen(laag, 'wand.voor')[0]!.deel.stukken.filter((s) => s.rol === 'korte_stijl' && s.lengte < 15)).toEqual([]);
    expect(codes(tuin({ wandhoogte: 220 }))).not.toContain('deur_laag');
  });

  it('een luifel is het dak dat vooraan doorloopt, op palen die nooit voor de deur staan', () => {
    expect(delen(tuin(), 'paal')).toEqual([]);
    expect(delen(tuin(), 'terras')).toEqual([]);
    const r = tuin({ luifel: 250 });
    expect(r.afgeleid.luifel_palen).toBe(2);
    const palen = delen(r, 'paal');
    expect(palen.map((g) => [g.x, g.z])).toEqual([[0, 300 + 250 - 15], [385, 535]]);
    // Het dak loopt door tot voorbij de palen; eronder ligt een terras.
    expect(plek(delen(r, 'dak')[0]!)).toMatchObject({ z0: -25, z1: 300 + 250 + 25 });
    expect(delen(r, 'terras')).toHaveLength(1);
    expect(blokken(r, 'terras.1.dek.')[0]!.soort).toBe('planken');
    expect(blokken(tuin({ luifel: 250, terras: 'tegels' }), 'terras.')[0]!.soort).toBe('tegel');
    // De palen dragen een ligger onder het dak, en een ligger van de voorwand naar elke hoekpaal.
    expect(delen(r, 'ligger')).toHaveLength(3);
    for (const g of delen(r, 'ligger')) expect(plek(g).y1).toBeCloseTo(12 + 220, 1);
    for (const g of palen) expect(plek(g).y1).toBeCloseTo(12 + 220 - 20, 1);

    // Breder dan 5 m tussen de hoekpalen: er komen palen bij, naast de deur.
    for (const [deur_plaats, aantal] of [['midden', 4], ['links', 3], ['rechts', 3]] as const) {
      for (const deur of ['enkel', 'dubbel', 'schuifraam']) for (const breedte of [520, 700, 1000]) {
        const breed = tuin({ breedte, luifel: 300, deur, deur_plaats, ramen_voor: 0 }), naam = `${deur_plaats} ${deur} ${breedte}`;
        expect(breed.afgeleid.luifel_palen, naam).toBe(aantal);
        expect(codes(breed), naam).toContain('luifel_palen');
        const p = delen(breed, 'paal').map((g) => plek(g)).sort((a, b) => a.x0 - b.x0);
        expect(p, naam).toHaveLength(aantal);
        const d = omvang(blokken(breed, 'wand.voor.1.deur'));
        for (const k of p) expect(k.x1 <= d.x0 || k.x0 >= d.x1, `${naam}: paal voor de deur`).toBe(true);
        p.slice(1).forEach((k, i) => expect(k.x0 - p[i]!.x0, naam).toBeLessThanOrEqual(500));
      }
    }
  });

  it('plat, lessenaar en zadel', () => {
    const plat = tuin({ oversteek: 30 });
    expect(delen(plat, 'dak')[0]!.deel.vlak).toMatchObject({ ligging: 'liggend', lengte: 460, breedte: 360 });
    expect(delen(plat, 'dak')[0]!.y).toBe(12 + 220);

    // Lessenaar: laag achteraan, hoog vooraan; de voorwand is hoger en de zijwanden krijgen een gevelvulling.
    const les = tuin({ dakvorm: 'lessenaar', helling_lessenaar: 'h10', bedekking: 'zink' });
    const tan = Math.tan((10 * Math.PI) / 180);
    expect(delen(les, 'wand.achter')[0]!.deel.maten.h).toBe(220);
    expect(delen(les, 'wand.voor')[0]!.deel.maten.h).toBeCloseTo(220 + 300 * tan, 1);
    expect(delen(les, 'dak')[0]!.draai).toBe(0);
    expect(blokken(les, 'wig.')).toHaveLength(2);
    expect(blokken(les, 'dak.1.dek.').some((b) => b.soort === 'zink')).toBe(true);

    // Zadel: kepers van de zijwanden naar een nokbalk, die op makelaars op de voor- en de achterwand rust.
    const zadel = tuin({ dakvorm: 'zadel', bedekking: 'pannen', helling_zadel: 'h30' });
    expect(delen(zadel, 'dak')).toHaveLength(2);
    expect(delen(zadel, 'nokbalk')).toHaveLength(1);
    expect(delen(zadel, 'makelaar')).toHaveLength(2);
    expect(blokken(zadel, 'topgevel.')).toHaveLength(2);
    for (const g of delen(zadel, 'makelaar')) {
      expect(g.y).toBe(12 + 220);
      expect(plek(g).y1).toBeCloseTo(plek(delen(zadel, 'nokbalk')[0]!).y0, 1);
    }
    // De kepers raken de buitenkant van de zijwand bovenaan (x = 0, y = 12 + 220) en de bovenkant van de nokbalk.
    const links = delen(zadel, 'dak')[0]!;
    expect(links.y + 25 * Math.tan((30 * Math.PI) / 180)).toBeCloseTo(232, 1);
    expect(plek(delen(zadel, 'nokbalk')[0]!).y1).toBeCloseTo(232 + (200 - 3.5) * Math.tan((30 * Math.PI) / 180), 1);
    // Met een luifel komt er een derde makelaar op de ligger van de luifel.
    expect(delen(tuin({ dakvorm: 'zadel', bedekking: 'pannen', luifel: 200 }), 'makelaar')).toHaveLength(3);
    expect(codes(tuin({ dakvorm: 'zadel', bedekking: 'pannen', helling_zadel: 'h45' }))).toContain('vergunning');
    expect(codes(tuin())).not.toContain('vergunning');
  });
});

describe('bijgebouwen: twee weergaven en de meetstaat', () => {
  const gevallen: [string, ConfiguratieResultaat][] = [
    ['carport', overk(OV.carport.keuzes)],
    ['carport met berging, wanden en schoren', overk({ diepte: 700, berging: 'achter', berging_maat: 200, wand_links: 'halfhoog', wand_rechts: 'glas', schoren: true })],
    ['terrasoverkapping', overk(OV.terras.keuzes)],
    ['lessenaar met dichte wanden', overk({ dakvorm: 'lessenaar', wand_links: 'dicht', wand_achter: 'dicht', schoren: true })],
    ['carport met zadeldak', overk({ dakvorm: 'zadel', bedekking: 'pannen', wand_achter: 'dicht', berging: 'opzij' })],
    ['pergola', overk(OV.pergola.keuzes)],
    ['tuinhuis', tuin(TV.tuinhuis.keuzes)],
    ['tuinhuis met zadeldak en luifel', tuin({ dakvorm: 'zadel', bedekking: 'leien', helling_zadel: 'h35', luifel: 200 })],
    ['tuinhuis met lessenaarsdak en luifel', tuin({ dakvorm: 'lessenaar', luifel: 150, ramen_achter: 2 })],
    ['poolhouse', tuin(TV.poolhouse.keuzes)],
  ];

  it('de constructieweergave heeft dezelfde buitenmaten als de afgewerkte', () => {
    for (const [naam, r] of gevallen) {
      const a = omvang(bijgebouw3D(r, 'afgewerkt').blokken), c = omvang(bijgebouw3D(r, 'constructie').blokken);
      for (const k of ['x0', 'x1', 'y0', 'y1', 'z0', 'z1'] as const) expect(c[k], `${naam}, ${k}`).toBeCloseTo(a[k], 1);
      expect(bijgebouw3D(r, 'constructie').kader, naam).toEqual(bijgebouw3D(r, 'afgewerkt').kader);
      // Ook per bouwdeel: elk dak, elke wand en elke vloer neemt in beide weergaven dezelfde plaats in.
      for (const g of bijgebouwSamenstelling(r).delen.filter((x) => x.deel.vlak)) {
        const af = omvang(blokken(r, `${g.code}.`, 'afgewerkt').filter((b) => !/\.(deur|raam)\d*\./.test(b.code) || b.code.includes('.skelet.'))), co = omvang(blokken(r, `${g.code}.`, 'constructie'));
        for (const k of ['x0', 'x1', 'y0', 'y1', 'z0', 'z1'] as const) expect(co[k], `${naam}, ${g.code}, ${k}`).toBeCloseTo(af[k], 1);
      }
    }
  });

  it('de constructieweergave toont het skelet en de lagen als staal, zonder deuren en ramen', () => {
    const r = tuin({ luifel: 200 });
    const c = bijgebouw3D(r, 'constructie').blokken, a = bijgebouw3D(r, 'afgewerkt').blokken;
    expect(c.filter((b) => b.code.startsWith('wand.voor.1.skelet.')).length).toBeGreaterThan(8);
    expect(c.some((b) => b.code.startsWith('wand.voor.1.laag.'))).toBe(true);
    expect(a.some((b) => b.code.startsWith('wand.voor.1.skelet.'))).toBe(false);
    expect(c.some((b) => b.soort === 'glas')).toBe(false);
    expect(a.some((b) => b.soort === 'glas')).toBe(true);
    // Palen, liggers en boeiboorden zijn in beide weergaven dezelfde.
    for (const begin of ['paal.', 'ligger.', 'boeiboord.', 'hoekplank.']) expect(c.filter((b) => b.code.startsWith(begin))).toEqual(a.filter((b) => b.code.startsWith(begin)));
  });

  it('de meetstaat is de som van de bouwdelen en klopt met het hout dat de 3D tekent', () => {
    for (const [naam, r] of gevallen) {
      const m = bijgebouwMeetstaat(r), hout = m.filter((x) => x.groep === 'hout');
      const skelet = bijgebouw3D(r, 'constructie').blokken.filter((b) => b.code.includes('skelet.'));
      // Zoveel stukken hout in de meetstaat als de constructieweergave tekent.
      expect(hout.reduce((som, x) => som + x.aantal!, 0), naam).toBe(skelet.length);
      // De totale lengte: van een recht blok is de langste maat de lengte; van een schuin stuk (keper, spantbeen, schoor,
      // windveer) de lengte langs de helling, uit zijn doorsnede.
      const lengte = (b: Blok) => {
        if (b.vorm !== 'prisma') return Math.max(b.b, b.h, b.d);
        const q = b.doorsnede!;
        const zijden = q.map((p, i) => Math.hypot(q[(i + 1) % q.length]![0] - p[0], q[(i + 1) % q.length]![1] - p[1]));
        return Math.max(...zijden, b.as === 'z' ? b.d : b.b);
      };
      const getekend = skelet.reduce((som, b) => som + lengte(b), 0) / 100;
      const geteld = hout.reduce((som, x) => som + x.lengte!, 0);
      expect(Math.abs(getekend - geteld) / geteld, `${naam}: ${getekend} m getekend, ${geteld} m geteld`).toBeLessThan(0.01);
      // Geen ander hout dan dat van de bouwdelen, en elk materiaal heeft een naam.
      for (const x of m) expect(x.label, naam).not.toBe(x.materiaal);
    }
  });

  it('carport van 300 × 400 met plat dak: de meetstaat met de hand nagerekend', () => {
    const r = overk({ breedte: 300, diepte: 400, oversteek: 20, vloer: 'klinkers' });
    const m = bijgebouwMeetstaat(r);
    const regel = (materiaal: string, doorsnede?: string) => m.find((x) => x.materiaal === materiaal && (doorsnede === undefined || x.doorsnede === doorsnede));
    // Zes palen van 220 cm (vier hoeken en één tussenpaal per zijkant: 388 cm hart op hart is meer dan 300).
    expect(regel('hout_douglas', '120 × 120')).toMatchObject({ aantal: 6, lengte: 13.2 });
    // Dak van 340 × 440 cm: de dakbalken liggen over de breedte (de kortste maat), hart op hart 48 cm, met twee randbalken;
    // daarbij de ringbalk in dezelfde doorsnede van 50 × 150: 2 × 300 cm over de hoekpalen, en 2 × 383 cm ertussen.
    const balken = Math.floor((440 - 5 - 2.5) / 48) + 2;
    expect(regel('hout_douglas', '50 × 150')).toMatchObject({ aantal: balken + 2 + 4, lengte: Math.round((balken * 3.3 + 2 * 4.4 + 2 * 3 + 2 * 3.83) * 100) / 100 });
    // Boeiboord rondom: 2 × (340 + 2 × 2,2) en 2 × 440 cm.
    expect(regel('hout_douglas', '22 × 220')).toMatchObject({ aantal: 4, lengte: 15.69 });
    expect(regel('dakbeschot')).toMatchObject({ groep: 'platen', m2: 14.96 });
    expect(regel('epdm')).toMatchObject({ groep: 'bekleding', m2: 14.96 });
    expect(regel('klinkers')).toMatchObject({ m2: 15.75 });
    expect(m).toHaveLength(6);
  });

  it('de meetstaat volgt de keuzes: wanden, glas, dak en isolatie', () => {
    const m2 = (r: ConfiguratieResultaat, materiaal: string) => bijgebouwMeetstaat(r).filter((x) => x.materiaal === materiaal).reduce((som, x) => som + (x.m2 ?? 0), 0);
    const basis: Keuzes = { breedte: 300, diepte: 400 };
    expect(m2(overk(basis), 'gevel_thermisch_naaldhout_staand')).toBe(0);
    expect(m2(overk({ ...basis, wand_links: 'dicht' }), 'gevel_thermisch_naaldhout_staand')).toBeCloseTo((2 * 182 * 220) / 10000, 1);
    expect(m2(overk({ ...basis, wand_links: 'halfhoog' }), 'gevel_thermisch_naaldhout_staand')).toBeCloseTo((2 * 182 * 100) / 10000, 1);
    expect(m2(overk({ ...basis, wand_links: 'dicht', bekleding: 'eik', plankrichting: 'liggend' }), 'gevel_eik_liggend')).toBeGreaterThan(7);
    expect(m2(overk({ ...basis, dakvorm: 'lessenaar', bedekking: 'glas' }), 'dakglas')).toBeGreaterThan(14.96);
    expect(m2(overk({ ...basis, bedekking: 'open' }), 'epdm')).toBe(0);
    // Een hellend dak is langs de helling gemeten: groter dan zijn grondvlak.
    const zadel = overk({ ...basis, dakvorm: 'zadel', bedekking: 'pannen', helling_zadel: 'h45' });
    expect(m2(zadel, 'dakpannen')).toBeCloseTo((340 * 440 * Math.SQRT2) / 10000, 1);
    expect(m2(tuin({ isolatie: true }), 'isolatieplaat')).toBeGreaterThan(15);
    expect(m2(tuin(), 'isolatieplaat')).toBe(0);
  });
});
