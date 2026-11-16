import { describe, expect, it } from 'vitest';
import {
  grensVan, uWaarde, WARMTE_NIET_NAGELEZEN, WARMTE_VOORBEHOUD,
  type BouwMateriaal, type Opbouw, type OpbouwHerkomst, type Richtwaarde, type WarmteOpties, type WarmteUitkomst, type WarmteWaarden,
} from '../src/index.js';
import { bouwMaterialen, opbouwen } from '../voorbeelden/opbouwen.js';
import { warmtewaarden } from '../voorbeelden/warmtewaarden.js';

/**
 * Een eigen, kleine tabel met ronde getallen. De handberekeningen hieronder hangen zo niet af van de richtwaarden in
 * voorbeelden/warmtewaarden.ts: verbetert iemand daar een waarde, dan blijven deze tests kloppen.
 */
const proef = (nagelezen = false): OpbouwHerkomst => ({ bron: 'algemene kennis', verwijzing: 'proefwaarde voor de test', nagelezen });
const w = (waarde: number, nagelezen = false): Richtwaarde => ({ waarde, herkomst: proef(nagelezen) });
const proefWaarden = (nagelezen = false): WarmteWaarden => ({
  geleiding: { steen: w(1, nagelezen), iso: w(0.04, nagelezen), hout: w(0.1, nagelezen) },
  overgang: { binnen: { wand: w(0.13, nagelezen), dak: w(0.1, nagelezen), vloer: w(0.17, nagelezen) }, buiten: w(0.04, nagelezen), grond: w(0, nagelezen) },
  luchtlaag: {
    wand: { punten: [[10, 0.15], [20, 0.2]], herkomst: proef(nagelezen) },
    dak: { punten: [[10, 0.15], [20, 0.2]], herkomst: proef(nagelezen) },
    vloer: { punten: [[10, 0.15], [20, 0.2]], herkomst: proef(nagelezen) },
  },
  houtToeslag: {},
  grootsteVerhouding: w(1.5, nagelezen),
  grootsteU: { wand: w(0.4, nagelezen), dak: w(0.4, nagelezen), vloer: w(0.4, nagelezen) },
});
const proefMaterialen: Record<string, BouwMateriaal> = {
  steen: { label: 'Proefsteen', soort: 'steen', kleur: '#999999' },
  iso: { label: 'Proefisolatie', soort: 'gevel', kleur: '#eeee88' },
  hout: { label: 'Proefhout', soort: 'hout', kleur: '#ccaa77' },
  onbekend: { label: 'Vreemd materiaal', soort: 'gevel', kleur: '#cccccc' },
};
/** Een wand uit twee lagen: 20 cm steen en 10 cm isolatie. */
const tweeLagen = (): Opbouw => ({
  naam: 'Proefwand uit twee lagen',
  soort: 'wand',
  lagen: [
    { naam: 'Steen', materiaal: 'steen', dikte: 200, rol: 'massief' },
    { naam: 'Isolatie', materiaal: 'iso', dikte: 100, rol: 'isolatie' },
  ],
});
/** Een wand uit één laag: hout van 100 mm breed om de 500 mm, met isolatie ertussen. */
const metHout = (hoh = 500, dikte = 100): Opbouw => ({
  naam: 'Proefwand met hout',
  soort: 'wand',
  lagen: [{ naam: 'Skelet', materiaal: 'hout', dikte, rol: 'skelet', hout: { breedte: 100, hoh, vulling: 'iso' } }],
});
/** Nergens een NaN of een oneindig getal, en de uitkomst gaat naar JSON en terug zonder verlies. */
function gewoneGegevens(u: unknown) {
  const kijk = (x: unknown): void => {
    if (typeof x === 'number') expect(Number.isFinite(x)).toBe(true);
    else if (Array.isArray(x)) x.forEach(kijk);
    else if (x && typeof x === 'object') Object.values(x).forEach(kijk);
  };
  kijk(u);
  expect(JSON.parse(JSON.stringify(u))).toStrictEqual(u);
}
const voorbeeld = (code: string, opties: WarmteOpties = {}): WarmteUitkomst => uWaarde(opbouwen[code]!, bouwMaterialen, warmtewaarden, opties);

describe('warmte: met de hand nagerekend', () => {
  it('rekent een wand uit twee lagen: dikte gedeeld door warmtegeleiding, plus de overgangsweerstanden', () => {
    const u = uWaarde(tweeLagen(), proefMaterialen, proefWaarden());
    // Steen: 0,200 m / 1,0 = 0,2. Isolatie: 0,100 m / 0,04 = 2,5. Overgang binnen 0,13 en buiten 0,04.
    // Samen 0,13 + 0,2 + 2,5 + 0,04 = 2,87 m²K/W, dus U = 1 / 2,87 = 0,348 → 0,35 W/m²K.
    expect(u.lagen.map((l) => l.weerstand)).toEqual([0.2, 2.5]);
    expect(u.lagen.map((l) => l.wijze)).toEqual(['gewone laag', 'gewone laag']);
    expect(u.overgang).toEqual({ binnen: 0.13, buiten: 0.04 });
    expect(u.weerstand).toBe(2.87);
    expect(u.uWaarde).toBe(0.35);
    expect(u.grenzen).toBeUndefined();
    expect(u.grenst).toBe('buitenlucht');
    expect(u.ontbreekt).toEqual([]);
    // 0,35 is niet hoger dan de grens van 0,4 in de proeftabel.
    expect(u.toets).toMatchObject({ oordeel: 'voldoet', grootsteU: 0.4 });
    gewoneGegevens(u);
  });

  it('rekent hout tussen de isolatie met het gemiddelde van de bovengrens en de ondergrens', () => {
    const u = uWaarde(metHout(), proefMaterialen, proefWaarden());
    // 20 % hout (100 mm om de 500 mm): R = 0,1 / 0,1 = 1,0. 80 % isolatie: R = 0,1 / 0,04 = 2,5. Overgang samen 0,17.
    // Bovengrens: 1 / (0,2 / 1,17 + 0,8 / 2,67) = 1 / 0,470565 = 2,1251.
    // Ondergrens: de laag als geheel 1 / (0,2 / 1,0 + 0,8 / 2,5) = 1 / 0,52 = 1,9231; met de overgang 2,0931.
    // Gemiddelde 2,1091, dus U = 0,474 → 0,47.
    expect(u.lagen[0]).toMatchObject({ wijze: 'hout met vulling', weerstand: 1.923, aandeelHout: 0.2 });
    expect(u.grenzen).toEqual({ boven: 2.125, onder: 2.093 });
    expect(u.weerstand).toBe(2.109);
    expect(u.uWaarde).toBe(0.47);
    expect(u.aannames.join(' ')).toMatch(/gecombineerde methode/);
    expect(u.aannames.join(' ')).toMatch(/20 % hout en 80 % proefisolatie/);
    gewoneGegevens(u);
  });

  it('rekent een stilstaande luchtlaag uit de tabel, rechtlijnig tussen twee diktes', () => {
    const o: Opbouw = {
      naam: 'Wand met spouw', soort: 'wand',
      lagen: [
        { naam: 'Binnenblad', materiaal: 'steen', dikte: 100, rol: 'massief' },
        { naam: 'Spouw', materiaal: '', dikte: 15, rol: 'spouw' },
        { naam: 'Buitenblad', materiaal: 'steen', dikte: 100, rol: 'afwerking_buiten' },
      ],
    };
    // Stilstaand: 15 mm ligt halfweg tussen 10 mm (0,15) en 20 mm (0,20): 0,175.
    // 0,13 + 0,1 + 0,175 + 0,1 + 0,04 = 0,545 → U = 1,83.
    const stil = uWaarde(o, proefMaterialen, proefWaarden(), { buitenspouw: 'stilstaand' });
    expect(stil.lagen.map((l) => [l.wijze, l.weerstand])).toEqual([['gewone laag', 0.1], ['luchtlaag', 0.175], ['gewone laag', 0.1]]);
    expect(stil.weerstand).toBe(0.545);
    expect(stil.uWaarde).toBe(1.83);
    // Geventileerd (de standaard): de spouw en het buitenblad tellen niet mee, en buiten geldt de overgangsweerstand
    // van binnen: 0,13 + 0,1 + 0,13 = 0,36 → U = 2,78.
    const open = uWaarde(o, proefMaterialen, proefWaarden());
    expect(open.lagen.map((l) => [l.wijze, l.weerstand])).toEqual([['gewone laag', 0.1], ['geventileerde spouw', 0], ['buiten de spouw', 0]]);
    expect(open.overgang).toEqual({ binnen: 0.13, buiten: 0.13 });
    expect(open.weerstand).toBe(0.36);
    expect(open.uWaarde).toBe(2.78);
    expect(open.aannames.join(' ')).toMatch(/geventileerd.*telt niet mee/);
    // Een dunnere laag dan het eerste punt gaat evenredig naar nul, een dikkere blijft op de laatste waarde.
    const metSpouw = (dikte: number) => uWaarde({ ...o, lagen: o.lagen.map((l) => (l.rol === 'spouw' ? { ...l, dikte } : l)) }, proefMaterialen, proefWaarden(), { buitenspouw: 'stilstaand' }).lagen[1]!.weerstand;
    expect(metSpouw(5)).toBe(0.075);
    expect(metSpouw(80)).toBe(0.2);
  });

  it('telt een folie niet mee en rekent lucht tussen latten als stilstaande lucht naast hout', () => {
    const o: Opbouw = {
      naam: 'Wand met latten', soort: 'wand',
      lagen: [
        { naam: 'Latten', materiaal: 'hout', dikte: 20, rol: 'latten', hout: { breedte: 50, hoh: 500 } },
        { naam: 'Dampscherm', materiaal: 'iso', dikte: 0.2, rol: 'folie' },
        { naam: 'Isolatie', materiaal: 'iso', dikte: 100, rol: 'isolatie' },
      ],
    };
    const u = uWaarde(o, proefMaterialen, proefWaarden());
    // Latten: 10 % hout (R = 0,02 / 0,1 = 0,2) naast 90 % lucht van 20 mm (0,2): de laag is 0,2.
    expect(u.lagen.map((l) => [l.wijze, l.weerstand])).toEqual([['hout met vulling', 0.2], ['folie', 0], ['gewone laag', 2.5]]);
    // 0,13 + 0,2 + 0 + 2,5 + 0,04 = 2,87.
    expect(u.weerstand).toBe(2.87);
    expect(u.aannames.join(' ')).toMatch(/Folies en dampschermen \(Dampscherm\)/);
  });
});

describe('warmte: de negen voorbeeldopbouwen', () => {
  it('geeft voor elke opbouw een U-waarde met haar aannames, of een duidelijke reden waarom niet', () => {
    expect(Object.keys(opbouwen)).toHaveLength(9);
    for (const [code, o] of Object.entries(opbouwen)) {
      const u = uWaarde(o, bouwMaterialen, warmtewaarden);
      if (u.uWaarde === null) {
        expect(u.ontbreekt.length, code).toBeGreaterThan(0);
        expect(u.toets.oordeel, code).toBe('niet te zeggen');
      } else {
        expect(u.ontbreekt, code).toEqual([]);
        expect(u.uWaarde, code).toBeGreaterThan(0.1);
        expect(u.uWaarde, code).toBeLessThan(0.6);
        expect(u.weerstand, code).toBeCloseTo(1 / u.uWaarde, 0);
      }
      expect(u.opbouw).toBe(o.naam);
      expect(u.lagen, code).toHaveLength(o.lagen.length);
      expect(u.aannames.length, code).toBeGreaterThan(4);
      // De vaste zin staat bij elke uitkomst, en zolang niets nagelezen is ook de waarschuwing.
      expect(u.voorbehoud, code).toEqual([WARMTE_VOORBEHOUD, WARMTE_NIET_NAGELEZEN]);
      expect(u.nagelezen, code).toBe(false);
      gewoneGegevens(u);
    }
    // Met de voorbeeldtabel is er voor alle negen een U-waarde.
    expect(Object.keys(opbouwen).filter((code) => voorbeeld(code).uWaarde === null)).toEqual([]);
    expect(WARMTE_VOORBEHOUD).toMatch(/geen E-peil en geen S-peil/);
    expect(WARMTE_VOORBEHOUD).toMatch(/ventilatie, luchtdichtheid of koudebruggen/);
  });

  it('een houtskeletwand met 14 cm wol zit in de buurt van 0,25 à 0,35 W/m²K', () => {
    // Ruim genomen: het oordeel tegenover de grens ligt op het randje en hangt af van richtwaarden die nog nagelezen worden.
    expect(voorbeeld('hsb_hout').uWaarde).toBeGreaterThanOrEqual(0.2);
    expect(voorbeeld('hsb_hout').uWaarde).toBeLessThanOrEqual(0.4);
  });

  it('wat buiten een geventileerde spouw ligt, telt niet mee', () => {
    // Houten planken of steenstrips op latten: dezelfde wand tot aan de spouw, dus dezelfde U-waarde.
    expect(voorbeeld('hsb_steenstrips').uWaarde).toBe(voorbeeld('hsb_hout').uWaarde);
    const hout = voorbeeld('hsb_hout');
    expect(hout.lagen.slice(-2).map((l) => [l.naam, l.wijze, l.weerstand])).toEqual([['Latten met luchtspouw', 'geventileerde spouw', 0], ['Staande gevelplanken', 'buiten de spouw', 0]]);
    expect(hout.overgang!.buiten).toBe(hout.overgang!.binnen);
    // Dikkere planken veranderen niets; de leidingspouw binnen is geen geventileerde spouw.
    const dikker = { ...opbouwen.hsb_hout!, lagen: opbouwen.hsb_hout!.lagen.map((l) => (l.rol === 'afwerking_buiten' ? { ...l, dikte: 60 } : l)) };
    expect(uWaarde(dikker, bouwMaterialen, warmtewaarden).weerstand).toBe(hout.weerstand);
    expect(hout.lagen[1]).toMatchObject({ naam: 'Leidingspouw (liggende latten)', wijze: 'hout met vulling' });
    // Onder de pannen: tengellatten, panlatten en pannen tellen niet mee.
    expect(voorbeeld('hellend_dak_pannen').lagen.slice(-3).map((l) => l.wijze)).toEqual(['geventileerde spouw', 'buiten de spouw', 'buiten de spouw']);
    // Spouwmuur: de spouw en de gevelsteen; als stilstaande spouw gerekend is de wand iets beter.
    expect(voorbeeld('spouwmuur').lagen.slice(-2).map((l) => l.wijze)).toEqual(['geventileerde spouw', 'buiten de spouw']);
    expect(voorbeeld('spouwmuur', { buitenspouw: 'stilstaand' }).weerstand!).toBeGreaterThan(voorbeeld('spouwmuur').weerstand!);
    // Een buitenwand zonder spouw (pleister op isolatie): alles telt mee, met de overgangsweerstand van buiten.
    const pleister = voorbeeld('hsb_pleister');
    expect(pleister.lagen.every((l) => l.wijze !== 'geventileerde spouw' && l.wijze !== 'buiten de spouw')).toBe(true);
    expect(pleister.overgang!.buiten).toBe(warmtewaarden.overgang.buiten.waarde);
    expect(pleister.uWaarde!).toBeLessThan(hout.uWaarde!);
  });

  it('leidt af wat er aan de andere kant ligt, en toetst alleen tegen buiten of grond', () => {
    expect(Object.fromEntries(Object.entries(opbouwen).map(([code, o]) => [code, grensVan(o)]))).toEqual({
      hsb_hout: 'buitenlucht', hsb_steenstrips: 'buitenlucht', hsb_pleister: 'buitenlucht', spouwmuur: 'buitenlucht', binnenwand_hsb: 'verwarmde ruimte',
      plat_dak_warm: 'buitenlucht', hellend_dak_pannen: 'buitenlucht', vloer_volle_grond: 'grond', verdiepingsvloer_hout: 'verwarmde ruimte',
    });
    // Binnenwand en verdiepingsvloer: wel een U-waarde (met aan beide kanten de overgangsweerstand van binnen), geen toets.
    for (const code of ['binnenwand_hsb', 'verdiepingsvloer_hout']) {
      const u = voorbeeld(code);
      expect(u.uWaarde).not.toBeNull();
      expect(u.overgang!.buiten).toBe(u.overgang!.binnen);
      expect(u.toets.oordeel).toBe('niet te zeggen');
      expect(u.toets.uitleg).toMatch(/tussen twee verwarmde ruimtes/);
    }
    // Wie zegt dat dezelfde wand aan buiten grenst, krijgt de overgangsweerstand van buiten en een toets.
    const buiten = voorbeeld('binnenwand_hsb', { grenst: 'buitenlucht' });
    expect(buiten.overgang!.buiten).toBe(warmtewaarden.overgang.buiten.waarde);
    expect(buiten.toets.oordeel).toBe('voldoet niet');
    expect(buiten.aannames.join(' ')).toMatch(/Opgegeven: de andere kant grenst aan de buitenlucht/);
    // De skeletlaag zonder vulling (plat dak: lucht tussen de balken) is stilstaande lucht naast hout, geen ontbrekende waarde.
    expect(voorbeeld('plat_dak_warm').lagen[2]).toMatchObject({ naam: 'Houten roostering', wijze: 'hout met vulling' });
  });

  it('een vloer op de grond: de grond telt niet mee, dus de uitkomst kan wel "voldoet" maar niet "voldoet niet" bewijzen', () => {
    const vloer = (dikte: number): Opbouw => ({
      naam: 'Proefvloer', soort: 'vloer',
      lagen: [{ naam: 'Plaat', materiaal: 'steen', dikte: 200, rol: 'massief' }, { naam: 'Isolatie', materiaal: 'iso', dikte, rol: 'isolatie' }],
    });
    // 100 mm: 0,17 + 0,2 + 2,5 + 0 = 2,87 → 0,35, onder de proefgrens van 0,4.
    const goed = uWaarde(vloer(100), proefMaterialen, proefWaarden());
    expect(goed).toMatchObject({ grenst: 'grond', uWaarde: 0.35, overgang: { binnen: 0.17, buiten: 0 } });
    expect(goed.toets.oordeel).toBe('voldoet');
    expect(goed.aannames.join(' ')).toMatch(/De grond zelf is niet meegerekend/);
    // 40 mm: 0,17 + 0,2 + 1,0 = 1,37 → 0,73: boven de grens, maar de echte waarde is lager.
    const dun = uWaarde(vloer(40), proefMaterialen, proefWaarden());
    expect(dun.uWaarde).toBe(0.73);
    expect(dun.toets).toMatchObject({ oordeel: 'niet te zeggen', grootsteU: 0.4 });
    expect(dun.toets.uitleg).toMatch(/de grond is niet meegerekend/);
    // Dezelfde vloer boven buitenlucht: daar is "voldoet niet" wel te zeggen.
    expect(uWaarde(vloer(40), proefMaterialen, proefWaarden(), { grenst: 'buitenlucht' }).toets.oordeel).toBe('voldoet niet');
  });
});

describe('warmte: meer isolatie, meer hout', () => {
  it('meer isolatie geeft een lagere U-waarde', () => {
    const metWol = (dikte: number) => ({ ...opbouwen.hsb_hout!, lagen: opbouwen.hsb_hout!.lagen.map((l) => (l.rol === 'skelet' ? { ...l, dikte } : l)) });
    const u = [140, 184, 235, 286].map((d) => uWaarde(metWol(d), bouwMaterialen, warmtewaarden).uWaarde!);
    expect(u).toEqual([...u].sort((a, b) => b - a));
    expect(new Set(u).size).toBe(4);
    const proefU = [50, 100, 200].map((d) => uWaarde(metHout(500, d), proefMaterialen, proefWaarden()).weerstand!);
    expect(proefU[0]!).toBeLessThan(proefU[1]!);
    expect(proefU[1]!).toBeLessThan(proefU[2]!);
  });

  it('meer hout geeft een hogere U-waarde: dichter bij elkaar, of een groter opgegeven aandeel', () => {
    // De stijlen dichter bij elkaar (ook met de toeslag van de voorbeeldtabel stijgt het aandeel mee).
    const metStijlen = (hoh: number) => ({ ...opbouwen.hsb_hout!, lagen: opbouwen.hsb_hout!.lagen.map((l) => (l.rol === 'skelet' ? { ...l, hout: { ...l.hout!, hoh } } : l)) });
    const r = [600, 400, 300].map((hoh) => uWaarde(metStijlen(hoh), bouwMaterialen, warmtewaarden).weerstand!);
    expect(r[0]!).toBeGreaterThan(r[1]!);
    expect(r[1]!).toBeGreaterThan(r[2]!);
    // Een groter opgegeven aandeel.
    const u = [0, 0.1, 0.2, 0.4, 1].map((aandeelHout) => uWaarde(opbouwen.hsb_hout!, bouwMaterialen, warmtewaarden, { aandeelHout }).weerstand!);
    for (let i = 1; i < u.length; i++) expect(u[i]!).toBeLessThan(u[i - 1]!);
    // De toeslag uit de tabel komt bovenop het raster en staat bij de aannames, met de twee getallen.
    const std = voorbeeld('hsb_hout');
    const toeslag = warmtewaarden.houtToeslag.wand!.waarde;
    expect(std.lagen[3]!.aandeelHout).toBeCloseTo(38 / 600 + toeslag, 4);
    expect(std.aannames.join(' ')).toMatch(/38 mm om de 600 mm = 6,3 %\) plus [\d,]+ % toeslag/);
    expect(uWaarde(opbouwen.hsb_hout!, bouwMaterialen, warmtewaarden, { aandeelHout: 38 / 600 }).weerstand!).toBeGreaterThan(std.weerstand!);
    // Met de hand: in de proefwand geeft 40 % hout een lagere weerstand dan 20 %.
    expect(uWaarde(metHout(250), proefMaterialen, proefWaarden()).uWaarde!).toBeGreaterThan(uWaarde(metHout(500), proefMaterialen, proefWaarden()).uWaarde!);
  });
});

describe('warmte: wat ontbreekt of niet klopt', () => {
  it('geeft zonder warmtegeleiding geen U-waarde, met een uitleg in gewone taal', () => {
    const o = tweeLagen();
    o.lagen[1]!.materiaal = 'onbekend';
    const u = uWaarde(o, proefMaterialen, proefWaarden());
    expect(u.uWaarde).toBeNull();
    expect(u.weerstand).toBeNull();
    expect(u.ontbreekt).toHaveLength(1);
    expect(u.ontbreekt[0]).toMatch(/Voor het materiaal «Vreemd materiaal» \(laag «Isolatie»\) is geen warmtegeleiding bekend/);
    expect(u.ontbreekt[0]).toMatch(/er wordt geen getal gegokt/);
    expect(u.toets.oordeel).toBe('niet te zeggen');
    expect(u.lagen.map((l) => [l.wijze, l.weerstand])).toEqual([['gewone laag', 0.2], ['ontbreekt', null]]);
    expect(u.voorbehoud).toContain(WARMTE_VOORBEHOUD);
    expect(u.nagelezen).toBe(false);
    gewoneGegevens(u);
    // Ook de vulling tussen het hout, en een waarde die uit de voorbeeldtabel weg is.
    const zonderWol = { ...warmtewaarden, geleiding: { ...warmtewaarden.geleiding } };
    delete zonderWol.geleiding.minerale_wol;
    const hsb = uWaarde(opbouwen.hsb_hout!, bouwMaterialen, zonderWol);
    expect(hsb.uWaarde).toBeNull();
    expect(hsb.ontbreekt.join(' ')).toMatch(/«Minerale wol»/);
  });

  it('neemt een nagelezen waarde uit de materialenlijst vóór de tabel, en zegt wanneer alles nagelezen is', () => {
    const materialen = { ...proefMaterialen, iso: { ...proefMaterialen.iso!, warmtegeleiding: 0.02 } };
    const u = uWaarde(tweeLagen(), materialen, proefWaarden());
    // Isolatie 0,1 / 0,02 = 5: 0,13 + 0,2 + 5 + 0,04 = 5,37.
    expect(u.weerstand).toBe(5.37);
    expect(u.aannames.join(' ')).toMatch(/Proefisolatie: warmtegeleiding 0,02 W\/mK \(uit de materialenlijst/);
    // De rest van de tabel is niet nagelezen: de waarschuwing blijft.
    expect(u.nagelezen).toBe(false);
    expect(u.voorbehoud).toEqual([WARMTE_VOORBEHOUD, WARMTE_NIET_NAGELEZEN]);
    // Met een tabel waarin alles nagelezen is, verdwijnt de waarschuwing; de vaste zin blijft.
    const klaar = uWaarde(tweeLagen(), proefMaterialen, proefWaarden(true));
    expect(klaar.nagelezen).toBe(true);
    expect(klaar.voorbehoud).toEqual([WARMTE_VOORBEHOUD]);
    expect(klaar.aannames.join(' ')).not.toMatch(/niet nagelezen/);
  });

  it('rekent niet met een opbouw die niet klopt of met een ongeldig getal, en geeft nooit NaN', () => {
    const fout = (o: Opbouw, tabel = proefWaarden(), opties: WarmteOpties = {}) => {
      const u = uWaarde(o, proefMaterialen, tabel, opties);
      expect(u.uWaarde).toBeNull();
      expect(u.toets.oordeel).toBe('niet te zeggen');
      expect(u.voorbehoud).toContain(WARMTE_VOORBEHOUD);
      expect(u.ontbreekt.length).toBeGreaterThan(0);
      gewoneGegevens(u);
      return u.ontbreekt.join(' ');
    };
    const dikteNul = tweeLagen();
    dikteNul.lagen[0]!.dikte = 0;
    expect(fout(dikteNul)).toMatch(/De opbouw klopt niet.*heeft geen dikte/);
    expect(fout(metHout(80))).toMatch(/hart-op-hartafstand .* is niet groter dan de breedte/);
    expect(fout({ naam: 'Leeg', soort: 'wand', lagen: [] })).toMatch(/heeft geen lagen/);
    expect(fout(undefined as unknown as Opbouw)).toMatch(/Dit is geen opbouw/);
    // Een warmtegeleiding van nul of minder is geen waarde.
    const nul = proefWaarden();
    nul.geleiding.iso = w(0);
    expect(fout(tweeLagen(), nul)).toMatch(/«Proefisolatie» in de tabel met warmtewaarden is geen geldig getal/);
    expect(uWaarde(tweeLagen(), { ...proefMaterialen, iso: { ...proefMaterialen.iso!, warmtegeleiding: -1 } }, proefWaarden()).ontbreekt.join(' ')).toMatch(/in de materialenlijst is geen geldig getal/);
    // Een tabel zonder overgangsweerstand of zonder luchtlaag.
    const zonderOvergang = proefWaarden();
    delete (zonderOvergang.overgang as Partial<WarmteWaarden['overgang']>).buiten;
    expect(fout(tweeLagen(), zonderOvergang)).toMatch(/ontbreekt de overgangsweerstand aan de buitenkant/);
    const zonderLucht = proefWaarden();
    zonderLucht.luchtlaag.wand.punten = [];
    const metSpouw: Opbouw = { naam: 'Spouw', soort: 'wand', lagen: [{ naam: 'Blad', materiaal: 'steen', dikte: 100, rol: 'massief' }, { naam: 'Spouw', materiaal: '', dikte: 30, rol: 'spouw' }, { naam: 'Isolatie', materiaal: 'iso', dikte: 50, rol: 'isolatie' }] };
    expect(fout(metSpouw, zonderLucht)).toMatch(/ontbreekt de weerstand van een stilstaande luchtlaag/);
    // Zonder tabel (hier rechtstreeks: een lege parameter zou de proeftabel van de hulpfunctie nemen).
    const zonderTabel = uWaarde(tweeLagen(), proefMaterialen, undefined as unknown as WarmteWaarden);
    expect(zonderTabel.uWaarde).toBeNull();
    expect(zonderTabel.ontbreekt.join(' ')).toMatch(/De tabel met warmtewaarden ontbreekt/);
    gewoneGegevens(zonderTabel);
    // Een opgegeven aandeel hout buiten 0 tot 1.
    expect(fout(metHout(), proefWaarden(), { aandeelHout: 1.5 })).toMatch(/geen getal tussen 0 en 1/);
    expect(fout(metHout(), proefWaarden(), { aandeelHout: Number.NaN })).toMatch(/geen getal tussen 0 en 1/);
    // Zonder grens in de tabel is er een U-waarde maar geen toets.
    const zonderGrens = proefWaarden();
    zonderGrens.grootsteU = {};
    const u = uWaarde(tweeLagen(), proefMaterialen, zonderGrens);
    expect(u.uWaarde).toBe(0.35);
    expect(u.toets.oordeel).toBe('niet te zeggen');
  });
});

describe('warmte: de tabel met richtwaarden', () => {
  it('heeft voor elk getal een herkomst die zegt dat het een richtwaarde is die nagelezen moet worden', () => {
    const t = warmtewaarden;
    const waarden: Richtwaarde[] = [
      ...Object.values(t.geleiding), ...Object.values(t.overgang.binnen), t.overgang.buiten, t.overgang.grond,
      ...Object.values(t.houtToeslag), t.grootsteVerhouding, ...Object.values(t.grootsteU),
    ];
    const herkomsten = [...waarden.map((r) => r.herkomst), ...Object.values(t.luchtlaag).map((l) => l.herkomst)];
    expect(herkomsten.length).toBeGreaterThan(30);
    for (const h of herkomsten) {
      expect(h.nagelezen).toBe(false);
      expect(h.bron).toBe('algemene kennis');
      expect(h.verwijzing).toMatch(/^Richtwaarde uit algemene kennis; geen norm, regel of fiche geopend\. Iemand moet ze nalezen in de geldende regels: /);
    }
    for (const r of waarden) expect(Number.isFinite(r.waarde) && r.waarde >= 0).toBe(true);
    expect(JSON.parse(JSON.stringify(t))).toStrictEqual(t);
  });

  it('dekt elk materiaal van de voorbeeldopbouwen dat geen folie is, en laat opbouwen.ts ongemoeid', () => {
    const folies = new Set(Object.values(opbouwen).flatMap((o) => o.lagen.filter((l) => l.rol === 'folie').map((l) => l.materiaal)));
    for (const code of Object.keys(bouwMaterialen)) {
      if (folies.has(code)) expect(warmtewaarden.geleiding[code], code).toBeUndefined();
      else expect(warmtewaarden.geleiding[code]?.waarde, code).toBeGreaterThan(0);
    }
    expect(Object.keys(warmtewaarden.geleiding).filter((code) => !bouwMaterialen[code])).toEqual([]);
    // De materialenlijst van de voorbeelden heeft zelf geen warmtegeleiding: die komt uit de tabel.
    expect(Object.values(bouwMaterialen).every((m) => m.warmtegeleiding === undefined)).toBe(true);
  });
});
