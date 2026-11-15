/**
 * Nieuwe raamtypes (15/11): het raster van vakken, de grote glaspartijen, stolp, kleinhouten, steellook,
 * de kleurwaaier en de kant-en-klare indelingen. Dat de oude indelingen gelijk blijven, staat in
 * `raam-bestaand.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { controleerModel, tekenSvg, type Keuzes } from '../src/index.js';
import { berekenRaam, raamdeur, RAL_KLEUREN, ruitenVan } from '../voorbeelden/raam.js';
import { raamBlokken } from '../voorbeelden/raam3d.js';
import { INDELINGEN, indelingVan, pasIndelingToe } from '../voorbeelden/raamindelingen.js';
import { openingenVan, rasterVan } from '../voorbeelden/raamraster.js';
import { raamKeuzes } from '../voorbeelden/woning.js';

const raam = (extra: Keuzes) => berekenRaam(raamKeuzes(extra));
const codes = (extra: Keuzes) => raam(extra).meldingen.map((m) => m.code);
const gelaagd = { glas: 'dubbel_gelaagd' };

/** Blokken die binnen het kader horen (niet de greep, de zonwering, de vensterbank of de dorpel). */
const inKader = (code: string) => !/^(greep|trekbeugel|klink|vingerscan|zonwering|geleider|lamel|doek|onderlat|vensterbank|dorpel)/.test(code);

/** Controleert dat niets door het kader steekt en dat glas, vleugels en stijlen binnen de kaderprofielen blijven. */
function verwachtBinnenKader(r: ReturnType<typeof raam>, naam: string) {
  const rb = raamBlokken(r);
  const f = Number(r.afgeleid.f) / 10;
  for (const b of rb.blokken.filter((x) => inKader(x.code))) {
    expect(b.x, `${naam}: ${b.code} links`).toBeGreaterThanOrEqual(-0.011);
    expect(b.x + b.b, `${naam}: ${b.code} rechts`).toBeLessThanOrEqual(rb.b + 0.011);
    expect(b.y, `${naam}: ${b.code} onder`).toBeGreaterThanOrEqual(-0.011);
    expect(b.y + b.h, `${naam}: ${b.code} boven`).toBeLessThanOrEqual(rb.h + 0.011);
    expect(b.z, `${naam}: ${b.code} buiten`).toBeGreaterThanOrEqual(-0.5);
    expect(b.z + b.d, `${naam}: ${b.code} binnen`).toBeLessThanOrEqual(13.5);
    if (/^(vleugel|glas|paneel|roede|stijl|tussenregel|onderregel|stolp)/.test(b.code)) {
      expect(b.x, `${naam}: ${b.code} tegen het kader links`).toBeGreaterThanOrEqual(f - 0.011);
      expect(b.x + b.b, `${naam}: ${b.code} tegen het kader rechts`).toBeLessThanOrEqual(rb.b - f + 0.011);
      expect(b.y + b.h, `${naam}: ${b.code} tegen het kader boven`).toBeLessThanOrEqual(rb.h - f + 0.011);
    }
  }
  return rb;
}

// ---------- raster van vakken ----------

describe('raster van vakken', () => {
  it('model zonder fouten', () => {
    expect(controleerModel(raamdeur)).toEqual([]);
  });

  it('vier vakken naast elkaar: vier symbolen, vier ruiten, drie stijlen', () => {
    const r = raam({ vakken: 'v4', breedte: 3200, vak1: 'draaikip_l', vak2: 'vast', vak3: 'vast', vak4: 'draai_r', rooster: true });
    expect(r.geldig).toBe(true);
    expect(r.afgeleid.n).toBe(4);
    expect(r.tekening!.vormen.filter((v) => v.code.startsWith('vak.')).map((v) => v.symbool)).toEqual(['draaikip_l', 'vast', 'vast', 'draai_r']);
    expect(openingenVan(r)).toEqual(['draaikip_l', 'vast', 'vast', 'draai_r']);
    expect(ruitenVan(r)).toHaveLength(4);
    const rb = verwachtBinnenKader(r, 'v4');
    expect(rb.blokken.filter((b) => /^stijl\d$/.test(b.code))).toHaveLength(3);
    // Te breed vak 4: de controle per vak werkt ook voor het vierde.
    expect(codes({ vakken: 'v4', breedte: 4800, vakb1: 900, vakb2: 900, vakb3: 900, vak4: 'draai_r' })).toContain('vak4_breed');
  });

  it('ongelijke breedtes: een vast vak en de rest gelijk verdeeld; de controle kijkt naar de eigen breedte', () => {
    const r = raam({ vakken: 'v3', breedte: 2520, vakb1: 600, vak1: 'draaikip_l', vak2: 'vast', vak3: 'draaikip_r', rooster: true });
    expect([r.afgeleid.kb1, r.afgeleid.kb2, r.afgeleid.kb3]).toEqual([600, 900, 900]);
    expect(r.tekening!.maatlijnen.filter((m) => m.code.startsWith('vak')).map((m) => m.tekst)).toEqual(['600', '900', '900']);
    // Een gemiddelde zou de fout verbergen: vak 2 draait en wordt 1500 breed (max 1300), het gemiddelde is maar 1000.
    const fout = raam({ vakken: 'v3', breedte: 3120, vakb1: 600, vakb3: 900, vak2: 'draaikip_l', vak3: 'vast' });
    expect(fout.afgeleid.kb2).toBe(1500);
    expect(fout.meldingen.map((m) => m.code)).toContain('vak2_breed');
    expect(fout.meldingen.map((m) => m.code)).not.toContain('vak1_breed');
    expect(codes({ vakken: 'v2', breedte: 1600, vakb1: 700, vakb2: 700 })).toContain('vakbreedtes');
    expect(codes({ vakken: 'v2', breedte: 1600, vakb1: 1400 })).toContain('vak_smal');
  });

  it('stolp: geen vaste stijl, één greep op de loopvleugel, draairichting gecontroleerd', () => {
    const r = raam({ vakken: 'v2', breedte: 1600, vak1: 'draai_l', vak2: 'draaikip_r', stolp: true, rooster: true });
    expect(r.geldig).toBe(true);
    expect(r.afgeleid.n_stijl).toBe(0);
    expect(r.afgeleid.heeft_stijl).toBe(false);
    expect(r.tekening!.vormen.map((v) => v.code)).toContain('stolp');
    const rb = verwachtBinnenKader(r, 'stolp');
    expect(rb.blokken.some((b) => /^stijl\d/.test(b.code))).toBe(false);
    expect(rb.blokken.filter((b) => /^greep\d$/.test(b.code)).map((b) => b.code)).toEqual(['greep2']);
    // De twee vleugels sluiten in het midden tegen elkaar.
    const links = rb.blokken.find((b) => b.code === 'vleugel1_r')!, rechts = rb.blokken.find((b) => b.code === 'vleugel2_l')!;
    expect(links.x + links.b).toBeCloseTo(rechts.x, 1);
    expect(links.x + links.b).toBeCloseTo(80, 1);
    // Zonder stolp staat er wel een stijl, en dan telt de statiek mee.
    expect(raam({ vakken: 'v2', breedte: 1600, vak1: 'draai_l', vak2: 'draaikip_r' }).afgeleid.heeft_stijl).toBe(true);
    expect(codes({ vakken: 'v2', breedte: 1600, vak1: 'draai_r', vak2: 'draaikip_r', stolp: true })).toContain('stolp');
    expect(codes({ vakken: 'v2', breedte: 1600, vak1: 'vast', vak2: 'draaikip_r', stolp: true })).toContain('stolp');
    // Vier vakken: de stolp zit tussen vak 2 en vak 3.
    const vier = raam({ vakken: 'v4', breedte: 3600, vak1: 'vast', vak2: 'draai_l', vak3: 'draaikip_r', vak4: 'vast', stolp: true, rooster: true });
    expect(vier.geldig).toBe(true);
    expect(rasterVan(vier).stijlen.map((s) => s.code)).toEqual(['stijl1', 'stijl3']);
  });

  it('bovenlicht over alle vakken, per vak of boven één vak', () => {
    const basis = { vakken: 'v3', breedte: 2700, hoogte: 1900, bovenlicht: true, bovenlicht_h: 400, rooster: true };
    const alle = rasterVan(raam(basis));
    expect(alle.vakken.filter((v) => v.rol === 'bovenlicht').map((v) => v.code)).toEqual(['bovenlicht']);
    expect(alle.stijlen.every((s) => s.y0 === 60 + 400)).toBe(true);
    const elk = raam({ ...basis, bovenlicht_over: 'elk', bovenlicht_open: 'kip' });
    expect(rasterVan(elk).vakken.filter((v) => v.rol === 'bovenlicht').map((v) => v.code)).toEqual(['bovenlicht1', 'bovenlicht2', 'bovenlicht3']);
    expect(rasterVan(elk).stijlen.every((s) => s.y0 === 60)).toBe(true);
    expect(elk.tekening!.vormen.filter((v) => v.code.startsWith('bovenlicht.')).map((v) => v.symbool)).toEqual(['kip', 'kip', 'kip']);
    expect(elk.afgeleid.stijl_l).toBe(1900 - 60);
    const een = raam({ ...basis, bovenlicht_over: 'vak2' });
    expect([een.afgeleid.kh1, een.afgeleid.kh2, een.afgeleid.kh3]).toEqual([1780, 1380, 1780]);
    expect(rasterVan(een).vakken.map((v) => v.code)).toEqual(['vak1', 'vak2', 'bovenlicht2', 'vak3']);
    expect(ruitenVan(een).map((g) => g.plaats)).toEqual(['vak 1', 'vak 2', 'bovenlicht vak 2', 'vak 3']);
    verwachtBinnenKader(elk, 'bovenlicht per vak');
    verwachtBinnenKader(een, 'bovenlicht boven vak 2');
    // De controle op de hoogte per vak volgt het eigen vak: vak 1 (zonder bovenlicht) is te hoog voor kip, vak 2 niet.
    const kip = raam({ vakken: 'v2', breedte: 1800, hoogte: 1500, vak1: 'kip', vak2: 'kip', bovenlicht: true, bovenlicht_h: 500, bovenlicht_over: 'vak2' });
    expect(kip.meldingen.map((m) => m.code)).toContain('vak1_hoog');
    expect(kip.meldingen.map((m) => m.code)).not.toContain('vak2_hoog');
  });

  it('vakken boven elkaar en een onderpaneel', () => {
    const glas = raam({ hoogte: 1700, breedte: 1000, onder: 'glas', onder_h: 600, borstwering: 300, glas: 'dubbel_gelaagd', rooster: true });
    expect(glas.geldig).toBe(true);
    expect(rasterVan(glas).vakken.map((v) => [v.code, v.vulling, v.h])).toEqual([['vak1', 'glas', 980], ['onder', 'glas', 600]]);
    expect(ruitenVan(glas).map((g) => [g.plaats, g.dagB, g.dagH])).toEqual([['raam', 820, 920], ['onderaan', 880, 540]]);
    expect(glas.tekening!.maatlijnen.map((m) => m.code)).toContain('onder');
    const paneel = raam({ hoogte: 1700, breedte: 1000, onder: 'paneel', onder_h: 600, rooster: true });
    expect(paneel.afgeleid.paneel_m2).toBeCloseTo(0.88 * 0.54, 6);
    expect(ruitenVan(paneel)).toHaveLength(1);
    const rb = verwachtBinnenKader(paneel, 'onderpaneel');
    expect(rb.blokken.find((b) => b.code === 'paneel_onder')).toMatchObject({ y: 6, h: 54 });
    expect(rb.blokken.find((b) => b.code === 'onderregel')).toMatchObject({ y: 60, h: 6 });
    // Het vak erboven begint op de regel.
    expect(rb.blokken.find((b) => b.code === 'vleugel1_l')!.y).toBe(66);
    // Onder één vak: de stijl loopt door tot het kader.
    const een = raam({ vakken: 'v2', breedte: 1800, hoogte: 1700, onder: 'paneel', onder_over: 'vak1', rooster: true });
    expect(rasterVan(een).vakken.map((v) => v.code)).toEqual(['vak1', 'onder1', 'vak2']);
    expect([een.afgeleid.kh1, een.afgeleid.kh2]).toEqual([980, 1580]);
    verwachtBinnenKader(een, 'onderpaneel onder vak 1');
    expect(codes({ hoogte: 900, onder: 'glas', onder_h: 600 })).toContain('bovenlicht_klein');
  });

  it('deur met zijlicht, en met zij- en bovenlicht', () => {
    // In aluminium: de stijl tussen deur en zijlicht haalt in PVC de statiek niet (die controle blijft dus werken).
    expect(codes({ type: 'voordeur', breedte: 1500, hoogte: 2300, zijlicht: 'rechts', ...gelaagd })).toContain('statiek');
    const alu = { profiel: 'alu_hi', ...gelaagd };
    const r = raam({ type: 'voordeur', breedte: 1500, hoogte: 2300, zijlicht: 'rechts', ...alu });
    expect(r.geldig).toBe(true);
    expect([r.afgeleid.n, r.afgeleid.kb1, r.afgeleid.kb2, r.afgeleid.wb]).toEqual([2, 950, 450, 950]);
    expect(rasterVan(r).vakken.map((v) => [v.rol, v.naam, v.opening])).toEqual([['deur', 'deur', 'draai_l'], ['vak', 'zijlicht rechts', 'vast']]);
    expect(openingenVan(r)).toEqual(['draai_l', 'vast']);
    // De greep staat in de kolom van de deur, tegenover de scharnieren.
    const greep = r.tekening!.vormen.find((v) => v.code === 'greep')!;
    expect(greep.x).toBeGreaterThan(50 + 475);
    expect(greep.x + greep.breedte).toBeLessThan(50 + 950);
    const rb = verwachtBinnenKader(r, 'deur met zijlicht');
    const paneel = rb.blokken.filter((b) => b.code.startsWith('paneel'));
    expect(Math.max(...paneel.map((b) => b.x + b.b))).toBeCloseTo(5 + 95 - 2.5, 1);
    expect(rb.blokken.find((b) => b.code === 'glas2')!.x).toBeCloseTo(5 + 95 + 2.5, 1);
    // Zijlicht links: de deur is de tweede kolom, op1 blijft de deur.
    const links = raam({ type: 'voordeur', breedte: 1500, hoogte: 2300, zijlicht: 'links', deur_draai: 'rechts', ...alu });
    expect(rasterVan(links).vakken.map((v) => v.rol)).toEqual(['vak', 'deur']);
    expect(links.afgeleid.op1).toBe('draai_r');
    expect(links.afgeleid.beweeg).toBe(1);
    const beide = raam({ type: 'voordeur', breedte: 2000, hoogte: 2700, zijlicht: 'beide', bovenlicht: true, bovenlicht_over: 'deur', tussenstijl: 'versterkt', ...alu });
    expect(beide.geldig).toBe(true);
    expect(rasterVan(beide).vakken.map((v) => v.code)).toEqual(['vak1', 'vak2', 'bovenlicht2', 'vak3']);
    expect([beide.afgeleid.kh1, beide.afgeleid.kh2]).toEqual([2600, 2200]);
    verwachtBinnenKader(beide, 'deur met twee zijlichten');
    // Het gemiddelde vak is 1050 breed, de deur zelf 1300: de controle kijkt naar de deur.
    expect(codes({ type: 'voordeur', breedte: 2200, hoogte: 2300, zijlicht: 'rechts', zijlicht_b: 800, ...alu })).toContain('deur_breed');
    // Onderpaneel onder het zijlicht, niet onder de deur.
    const onder = raam({ type: 'voordeur', breedte: 1500, hoogte: 2300, zijlicht: 'rechts', onder: 'paneel', ...alu });
    expect(rasterVan(onder).vakken.map((v) => v.code)).toEqual(['vak1', 'vak2', 'onder2']);
  });

  it('het raster en de formules van het model geven dezelfde maten en hetzelfde glas', () => {
    const gevallen: Keuzes[] = [
      {}, { vakken: 'v3', breedte: 2400 }, { vakken: 'v4', breedte: 3000, vakb2: 500 }, { vakken: 'v2', breedte: 1800, bovenlicht: true, bovenlicht_over: 'elk' },
      { vakken: 'v3', breedte: 2700, hoogte: 1900, bovenlicht: true, bovenlicht_over: 'vak1', onder: 'glas', onder_over: 'vak3' },
      { hoogte: 1700, onder: 'glas' }, { vakken: 'v2', breedte: 1800, hoogte: 1700, onder: 'glas', onder_over: 'elk', bovenlicht: true },
      { type: 'voordeur', breedte: 1500, hoogte: 2300, zijlicht: 'links' }, { type: 'voordeur', breedte: 2000, hoogte: 2700, zijlicht: 'beide', bovenlicht: true },
      { type: 'terrasdeur', breedte: 2200, hoogte: 2300, vakken: 'v2', vakb1: 950 }, { type: 'hefschuif', delen: 'd4', breedte: 6500, hoogte: 2400 },
      { type: 'vouwwand', delen: 'd5', breedte: 4500, hoogte: 2300 }, { type: 'glaswand', delen: 'd3', breedte: 3600, hoogte: 2500 },
    ];
    for (const k of gevallen) {
      const r = raam(k), a = r.afgeleid, raster = rasterVan(r), naam = JSON.stringify(k);
      const hoofd = raster.vakken.filter((v) => v.rol === 'vak' || v.rol === 'deur' || v.rol === 'deel');
      expect(hoofd, naam).toHaveLength(Number(a.n));
      if (raster.soort === 'raster') {
        hoofd.forEach((v, i) => {
          expect(v.b, `${naam} breedte vak ${i + 1}`).toBeCloseTo(Number(a[`kb${i + 1}`]), 6);
          expect(v.h, `${naam} hoogte vak ${i + 1}`).toBeCloseTo(Number(a[`kh${i + 1}`]), 6);
        });
        expect(hoofd.reduce((t, v) => t + v.b, 0), naam).toBeCloseTo(Number(k.breedte ?? 1200) - 2 * Number(a.f), 6);
      }
      // Glas: de som van de ruiten is de glasoppervlakte van het model.
      const glas = raster.vakken.filter((v) => v.vulling === 'glas').reduce((t, v) => t + (v.dagB * v.dagH) / 1e6, 0) + Number(a.deurglas_m2);
      expect(glas, `${naam} glas`).toBeCloseTo(Number(a.glas_m2), 6);
      // Niets valt buiten het kader en de vakken van de hoofdrij sluiten op elkaar aan (behalve schuifdelen, die overlappen).
      for (const v of raster.vakken) {
        expect(v.x, naam).toBeGreaterThanOrEqual(raster.f - 1e-6);
        expect(v.x + v.b, naam).toBeLessThanOrEqual(raster.B - raster.f + 1e-6);
        expect(v.y, naam).toBeGreaterThanOrEqual(raster.f - 1e-6);
        expect(v.y + v.h, naam).toBeLessThanOrEqual(raster.H - raster.f + 1e-6);
      }
      if (raster.soort !== 'schuif') hoofd.slice(1).forEach((v, i) => expect(v.x, naam).toBeCloseTo(hoofd[i]!.x + hoofd[i]!.b, 6));
      verwachtBinnenKader(r, naam);
    }
  });
});

// ---------- grote glaspartijen ----------

describe('grote glaspartijen', () => {
  const groot = { breedte: 5000, hoogte: 2400, profiel: 'alu_hi', ...gelaagd };

  it('hef-schuif met 2, 3 en 4 delen: welke delen schuiven, en waarheen', () => {
    const symbolen = (extra: Keuzes) => raam({ type: 'hefschuif', ...groot, ...extra }).tekening!.vormen.filter((v) => v.code.startsWith('vak')).map((v) => v.symbool);
    expect(symbolen({ delen: 'd2', breedte: 3500 })).toEqual(['schuif_r', 'vast']);
    expect(symbolen({ delen: 'd2', breedte: 3500, schuif_richting: 'rechts' })).toEqual(['vast', 'schuif_l']);
    expect(symbolen({ delen: 'd3', schuif_richting: 'beide' })).toEqual(['schuif_r', 'vast', 'schuif_l']);
    expect(symbolen({ delen: 'd4', breedte: 6500, schuif_richting: 'beide' })).toEqual(['vast', 'schuif_l', 'schuif_r', 'vast']);
    const vier = raam({ type: 'hefschuif', ...groot, delen: 'd4', breedte: 6500, schuif_richting: 'beide' });
    expect(vier.geldig).toBe(true);
    expect(vier.afgeleid.beweeg).toBe(2);
    // Vier delen: twee overlappingen, de middelste twee sluiten tegen elkaar op dezelfde rail.
    const delen = rasterVan(vier).vakken;
    expect(delen.map((v) => v.rail)).toEqual([0, 1, 1, 0]);
    expect(delen[1]!.x + delen[1]!.b).toBeCloseTo(delen[2]!.x, 6);
    expect(delen[0]!.x + delen[0]!.b - delen[1]!.x).toBeCloseTo(70, 6);
    expect(delen[3]!.x + delen[3]!.b).toBeCloseTo(6500 - Number(vier.afgeleid.f), 6);
    const rb = verwachtBinnenKader(vier, 'hef-schuif 4');
    // De hefgreep staat aan de sluitkant: in het midden, waar de twee schuivende delen elkaar raken.
    const g2 = rb.blokken.find((b) => b.code === 'greep2')!, g3 = rb.blokken.find((b) => b.code === 'greep3')!;
    expect(g2.x).toBeLessThan(325);
    expect(g3.x).toBeGreaterThan(325);
    expect(g3.x - g2.x).toBeLessThan(15);
    expect(rb.blokken.some((b) => b.code === 'greep1' || b.code === 'greep4')).toBe(false);
  });

  it('hef-schuif: grenzen per deel en gewicht tot 400 kg', () => {
    expect(codes({ type: 'hefschuif', ...groot, delen: 'd2', breedte: 7000 })).toContain('deel_breed');
    expect(codes({ type: 'hefschuif', ...groot, delen: 'd5' })).toContain('delen.niet_beschikbaar');
    const zwaar = raam({ type: 'hefschuif', ...groot, delen: 'd2', breedte: 6600, hoogte: 3000, glas: 'triple_gelaagd' });
    expect(Number(zwaar.afgeleid.vleugel_kg)).toBeGreaterThan(400);
    expect(zwaar.meldingen.map((m) => m.code)).toContain('deel_zwaar');
    // Het bestaande schuifraam houdt zijn eigen grens van 250 kg.
    expect(codes({ type: 'schuif', breedte: 6000, hoogte: 2800, profiel: 'alu_hi', glas: 'triple_gelaagd' })).toContain('schuif_zwaar');
  });

  it('vouwwand met 3 tot 6 delen: de delen scharnieren om en om', () => {
    for (const n of [3, 4, 5, 6]) {
      const r = raam({ type: 'vouwwand', ...groot, delen: `d${n}`, breedte: n * 900 });
      expect(r.geldig, `${n} delen`).toBe(true);
      expect(r.afgeleid.beweeg).toBe(n);
      const op = openingenVan(r);
      expect(op).toHaveLength(n);
      expect(op[0]).toBe('draai_l');
      for (let i = 1; i < n; i++) expect(op[i], `${n} delen, deel ${i + 1}`).not.toBe(op[i - 1]);
      const rb = verwachtBinnenKader(r, `vouwwand ${n}`);
      expect(rb.blokken.filter((b) => /^glas\d$/.test(b.code))).toHaveLength(n);
      // Eén greep, op het deel het verst van het pakket.
      expect(rb.blokken.find((b) => b.code === 'greep')!.x).toBeGreaterThan(rb.b / 2);
    }
    const rechts = raam({ type: 'vouwwand', ...groot, delen: 'd4', breedte: 3600, vouw_richting: 'rechts' });
    expect(openingenVan(rechts)).toEqual(['draai_l', 'draai_r', 'draai_l', 'draai_r']);
    expect(raamBlokken(rechts).blokken.find((b) => b.code === 'greep')!.x).toBeLessThan(180);
    expect(openingenVan(raam({ type: 'vouwwand', ...groot, delen: 'd3', breedte: 2700, vouw_richting: 'rechts' }))).toEqual(['draai_r', 'draai_l', 'draai_r']);
    expect(codes({ type: 'vouwwand', ...groot, delen: 'd2', breedte: 2000 })).toContain('delen.niet_beschikbaar');
    expect(codes({ type: 'vouwwand', ...groot, delen: 'd3', breedte: 4500 })).toContain('deel_breed');
    expect(rechts.afgeleid.heeft_stijl).toBe(false);
  });

  it('vaste glaswand: alleen vast glas met stijlen ertussen', () => {
    const r = raam({ type: 'glaswand', ...groot, delen: 'd4', breedte: 6000, tussenstijl: 'versterkt' });
    // Zonder versterking haalt de stijl van 2,4 m de statiek niet: de bestaande controle geldt ook hier.
    expect(codes({ type: 'glaswand', ...groot, delen: 'd4', breedte: 6000 })).toContain('statiek');
    expect(r.geldig).toBe(true);
    expect(openingenVan(r)).toEqual(['vast', 'vast', 'vast', 'vast']);
    expect([r.afgeleid.beweeg, r.afgeleid.n_stijl, r.afgeleid.heeft_stijl]).toEqual([0, 3, true]);
    const rb = verwachtBinnenKader(r, 'glaswand');
    expect(rb.blokken.some((b) => b.code.startsWith('vleugel') || b.code.startsWith('greep'))).toBe(false);
    expect(rb.blokken.filter((b) => /^stijl\d$/.test(b.code))).toHaveLength(3);
    expect(rb.borst).toBe(0);
    // Tot op de vloer: veiligheidsglas nodig, geen deurslot in de stuklijst.
    expect(codes({ type: 'glaswand', breedte: 3600, hoogte: 2500, profiel: 'alu' })).toContain('veiligheidsglas');
    expect(r.stuklijst.map((s) => s.code)).not.toContain('deurslot');
    expect(codes({ type: 'glaswand', ...groot, delen: 'd1', breedte: 3500 })).toContain('deel_breed');
  });

  it('de nieuwe soorten gebruiken alleen artikelen die in de prijslijst staan', () => {
    for (const k of [{ type: 'hefschuif', delen: 'd3' }, { type: 'vouwwand', delen: 'd4', breedte: 3600 }, { type: 'glaswand', delen: 'd3' }]) {
      const r = raam({ ...groot, ...k });
      expect(r.meldingen.filter((m) => m.code.startsWith('stuklijst.'))).toEqual([]);
    }
  });
});

// ---------- kleinhouten, steellook, kleur ----------

describe('kleinhouten, steellook en kleur', () => {
  it('kleinhouten in enkele patronen: roeden in tekening, 3D en stuklijst', () => {
    const r = raam({ vakken: 'v2', breedte: 1600, roeden: 'zes', rooster: true });
    // 2 × 3 ruiten per vak: één staande en twee liggende roeden.
    expect(r.tekening!.vormen.filter((v) => v.code.startsWith('roede_v'))).toHaveLength(2);
    expect(r.tekening!.vormen.filter((v) => v.code.startsWith('roede_h'))).toHaveLength(4);
    const rb = verwachtBinnenKader(r, 'kleinhouten');
    expect(rb.blokken.filter((b) => /^roede\d_v/.test(b.code))).toHaveLength(2);
    expect(rb.blokken.filter((b) => /^roede\d_h/.test(b.code))).toHaveLength(4);
    const lengte = r.stuklijst.find((s) => s.code === 'roeden')!.lengte!;
    expect(lengte).toBeCloseTo(Number(r.afgeleid.gh) + 2 * Number(r.afgeleid.gb), 1);
    expect(raam({ roeden: 'negen' }).tekening!.vormen.filter((v) => v.code.startsWith('roede'))).toHaveLength(4);
    expect(raam({ roeden: 'staand' }).tekening!.vormen.filter((v) => v.code.startsWith('roede')).map((v) => v.code)).toEqual(['roede_v']);
  });

  it('steellook: smal profiel en een fijne verdeling; alleen in aluminium', () => {
    const r = raam({ uitzicht: 'steellook', profiel: 'alu', kleur_buiten: 'zwart', kleur_binnen: 'zelfde', rooster: true });
    expect(r.geldig).toBe(true);
    expect(r.afgeleid.f).toBe(22);
    expect(raam({ profiel: 'alu' }).afgeleid.f).toBe(45);
    const vak = rasterVan(r).vakken[0]!;
    expect(vak.ruiten[0]).toBeGreaterThanOrEqual(2);
    expect(vak.ruiten[1]).toBeGreaterThanOrEqual(2);
    expect(r.tekening!.vormen.filter((v) => v.code.startsWith('roede')).length).toBe(vak.ruiten[0] - 1 + vak.ruiten[1] - 1);
    verwachtBinnenKader(r, 'steellook');
    expect(codes({ uitzicht: 'steellook' })).toContain('uitzicht.niet_beschikbaar');
    // Ook een glaswand kan in steellook.
    const wand = raam({ type: 'glaswand', delen: 'd3', breedte: 3000, hoogte: 2500, uitzicht: 'steellook', profiel: 'alu', ...gelaagd });
    expect(rasterVan(wand).vakken.every((v) => v.ruiten[0] >= 2 && v.ruiten[1] >= 3)).toBe(true);
    verwachtBinnenKader(wand, 'steellook glaswand');
  });

  it('kleurwaaier: een twintigtal RAL-kleuren met naam en nummer, binnen en buiten apart', () => {
    expect(RAL_KLEUREN.length).toBeGreaterThanOrEqual(20);
    expect(new Set(RAL_KLEUREN.map((k) => k.code)).size).toBe(RAL_KLEUREN.length);
    expect(new Set(RAL_KLEUREN.map((k) => k.ral)).size).toBe(RAL_KLEUREN.length);
    for (const k of RAL_KLEUREN) {
      expect(k.hex, k.code).toMatch(/^#[0-9a-f]{6}$/);
      expect(k.ral, k.code).toMatch(/^\d{4}$/);
      expect(k.naam.length, k.code).toBeGreaterThan(2);
    }
    const buiten = raamdeur.kenmerken.find((k) => k.code === 'kleur_buiten')!, binnen = raamdeur.kenmerken.find((k) => k.code === 'kleur_binnen')!;
    expect(buiten.helptekst).toContain('benadering');
    expect(binnen.helptekst).toContain('benadering');
    const r = raam({ kleur_buiten: 'ral6009', kleur_binnen: 'ral7035', rooster: true });
    expect(r.geldig).toBe(true);
    expect([r.afgeleid.kb, r.afgeleid.ki]).toEqual(['#27352a', '#c5c7c4']);
    expect(r.kenmerken.find((k) => k.code === 'kleur_buiten')!.weergave).toBe('Dennengroen (RAL 6009)');
    expect(raam({ kleur_buiten: 'antraciet', kleur_binnen: 'zelfde' }).afgeleid.ki).toBe('#383e42');
  });

  it('afwerking van de kleur: een ander oppervlak in de 3D; standaard verandert niets', () => {
    const kader = (extra: Keuzes) => raamBlokken(raam(extra)).blokken.find((b) => b.code === 'kader_l')!;
    expect(kader({ profiel: 'alu_hi' }).soort).toBe('metaal');
    expect(kader({}).soort).toBe('kunststof');
    expect(kader({ profiel: 'alu_hi', lak: 'mat' }).soort).toBe('lak_mat');
    expect(kader({ profiel: 'alu_hi', lak: 'structuur' }).soort).toBe('lak_structuur');
    const glans = kader({ profiel: 'alu_hi', lak: 'glans', kleur_buiten: 'ral3005' });
    expect(glans.soort).toBe('lak_glans');
    // Ook de buitenzijde (in de buitenkleur) krijgt de afwerking.
    expect(glans.zijden?.['z-']).toEqual({ soort: 'lak_glans', kleur: '#59191f' });
  });
});

// ---------- kant-en-klare indelingen ----------

describe('kant-en-klare indelingen', () => {
  const start: [string, Keuzes][] = [
    ['een gewoon raam', raamKeuzes({ rooster: true })],
    ['een voordeur', raamKeuzes({ type: 'voordeur', breedte: 1000, hoogte: 2300, glas: 'dubbel_gelaagd', ruimte: 'hal' })],
    ['een schuifraam met screen', raamKeuzes({ type: 'schuif', breedte: 3000, hoogte: 2300, profiel: 'alu', glas: 'dubbel_gelaagd', zonwering: 'screen', rooster: true })],
    ['een kipraampje in de badkamer', raamKeuzes({ vak1: 'kip', breedte: 800, hoogte: 800, ruimte: 'badkamer', glas: 'mat_gelaagd', vliegenraam: 'inzet' })],
  ];
  const indeling = (code: string) => INDELINGEN.find((i) => i.code === code)!;

  it('de gevraagde indelingen bestaan, met unieke codes', () => {
    const labels = INDELINGEN.map((i) => i.label);
    for (const naam of ['Enkel draai-kip', 'Dubbel met stolp', 'Driedelig', 'Deur met zijlicht', 'Deur met zij- en bovenlicht', 'Hef-schuif 2-delig', 'Hef-schuif 3-delig', 'Hef-schuif 4-delig', 'Vouwwand 3-delig', 'Vouwwand 6-delig', 'Vaste glaswand', 'Met onderpaneel', 'Twee boven elkaar']) expect(labels).toContain(naam);
    expect(new Set(INDELINGEN.map((i) => i.code)).size).toBe(INDELINGEN.length);
  });

  it.each(INDELINGEN.map((i) => [i.label, i] as const))('%s: één tik geeft een geldige positie, vanuit elk vertrekpunt', (_label, i) => {
    for (const [naam, keuzes] of start) {
      const k = pasIndelingToe(keuzes, i);
      const r = berekenRaam(k);
      expect(r.meldingen.filter((m) => m.ernst === 'fout').map((m) => m.code), `${i.code} vanuit ${naam}`).toEqual([]);
      verwachtBinnenKader(r, `${i.code} vanuit ${naam}`);
      // De tekening tekent zonder fouten en toont voor elk vak van de hoofdrij een vorm.
      expect(tekenSvg(r.tekening!)).toContain('<svg');
      expect(r.tekening!.vormen.filter((v) => /^vak(\.\d)?$/.test(v.code))).toHaveLength(Number(r.afgeleid.n));
      // De tegel van deze indeling staat aan.
      expect(indelingVan(k)?.code, `${i.code} vanuit ${naam}`).toBe(i.code);
    }
  });

  it('twee keer na elkaar een andere indeling: niets blijft hangen van de vorige', () => {
    const basis = raamKeuzes({ rooster: true });
    for (const a of INDELINGEN) {
      for (const b of [indeling('enkel_dk'), indeling('deur_zij_boven'), indeling('hefschuif4')]) {
        const r = berekenRaam(pasIndelingToe(pasIndelingToe(basis, a), b));
        expect(r.meldingen.filter((m) => m.ernst === 'fout').map((m) => m.code), `${a.code} → ${b.code}`).toEqual([]);
        const rechtstreeks = berekenRaam(pasIndelingToe(basis, b));
        expect(r.tekening!.vormen.filter((v) => v.symbool).map((v) => `${v.code}:${v.symbool}`), `${a.code} → ${b.code}`)
          .toEqual(rechtstreeks.tekening!.vormen.filter((v) => v.symbool).map((v) => `${v.code}:${v.symbool}`));
      }
    }
  });

  it('de symbolen van de belangrijkste indelingen (zicht van binnen, punt = scharnierzijde)', () => {
    const symbolen = (code: string) => berekenRaam(pasIndelingToe(raamKeuzes({ rooster: true }), indeling(code))).tekening!.vormen.filter((v) => v.symbool).map((v) => `${v.code}:${v.symbool}`);
    expect(symbolen('enkel_dk')).toEqual(['vak:draaikip_l']);
    expect(symbolen('dubbel_stolp')).toEqual(['vak.1:draai_l', 'vak.2:draaikip_r']);
    expect(symbolen('driedelig')).toEqual(['vak.1:draaikip_l', 'vak.2:vast', 'vak.3:draaikip_r']);
    expect(symbolen('deur_zijlicht')).toEqual(['vak.1:draai_l', 'vak.2:vast']);
    expect(symbolen('deur_zij_boven')).toEqual(['bovenlicht:vast', 'vak.1:draai_l', 'vak.2:vast']);
    expect(symbolen('hefschuif3')).toEqual(['vak.1:schuif_r', 'vak.2:vast', 'vak.3:schuif_l']);
    expect(symbolen('vouwwand3')).toEqual(['vak.1:draai_l', 'vak.2:draai_r', 'vak.3:draai_l']);
    expect(symbolen('boven_elkaar')).toEqual(['vak:draaikip_l', 'onder:vast']);
  });

  it('greep tegenover de scharnieren in elk opendraaiend vak', () => {
    for (const i of INDELINGEN) {
      const r = berekenRaam(pasIndelingToe(raamKeuzes({ rooster: true }), i));
      const raster = rasterVan(r);
      if (raster.soort !== 'raster') continue;
      const blokken = raamBlokken(r).blokken;
      for (const v of raster.vakken.filter((x) => x.rol === 'vak' && /^draai/.test(x.opening))) {
        const greep = blokken.find((b) => b.code === `greep${v.kolom}`);
        if (!greep) { expect(v.stolp, `${i.code}: alleen de vaste stolpvleugel mist een greep`).toBeDefined(); continue; }
        const midden = (v.x + v.b / 2) / 10;
        if (v.opening.endsWith('_l')) expect(greep.x, `${i.code} vak ${v.kolom}`).toBeGreaterThan(midden);
        else expect(greep.x, `${i.code} vak ${v.kolom}`).toBeLessThan(midden);
      }
    }
  });

  it('de maat blijft als ze past; een deurhoogte wordt geen raamhoogte', () => {
    const raam2 = pasIndelingToe(raamKeuzes({ breedte: 1500, hoogte: 1300 }), indeling('vast_dk'));
    expect([raam2.breedte, raam2.hoogte]).toEqual([1500, 1300]);
    const deur = pasIndelingToe(raamKeuzes({ breedte: 1200, hoogte: 1400 }), indeling('terrasdeur'));
    expect([deur.breedte, deur.hoogte, deur.glas]).toEqual([1200, 2300, 'dubbel_gelaagd']);
    expect(pasIndelingToe(deur, indeling('enkel_dk')).hoogte).toBe(1400);
    // Kleur en zonwering blijven; een schuifraam haalt de statiek niet in PVC en wordt aluminium.
    const schuif = pasIndelingToe(raamKeuzes({ kleur_buiten: 'ral6009', zonwering: 'screen' }), indeling('schuif2'));
    expect([schuif.kleur_buiten, schuif.zonwering, schuif.profiel]).toEqual(['ral6009', 'screen', 'alu']);
  });
});
