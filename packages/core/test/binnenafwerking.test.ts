/**
 * Ronde 12: beknopte binnenafwerking. Plafond, plint en accentmuur per ruimte, en de sferen voor binnen. Een plan zonder
 * de nieuwe velden verandert niet (ook niet met de nieuwe catalogi); dat bewaken ook de vingerafdrukken in dak.test.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  binnenKant, binnenMaten, klantPosten, murenVan, niveauPlan, openKantVan, plattegrond3D, plintBlokken, postenVan, ruimteMaten, ruimteVanBinnen, splitsRuimtes,
  PLINT_DIKTE, type PlanCatalogus, type Plattegrond, type Ruimte,
} from '../src/index.js';
import { planCatalogus, planNaarRegels } from '../voorbeelden/inrichting.js';
import { woningOpbouwCatalogus } from '../voorbeelden/woningopbouw.js';
import { pasSfeerToe, sfeerCatalogus, sfeerKeuze, sfeerVan, accentVoorstel } from '../voorbeelden/sferen.js';
import { pasStijlToe, stijlCatalogus } from '../voorbeelden/stijlen.js';
import { snelWoning } from '../voorbeelden/snelstart.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

const ALLES = { vloeren: true, wanden: true, binnendeuren: true, ruwbouw: true, inrichting: true, gevel: true, dak: true };
const catOpbouw = { ...planCatalogus, opbouw: woningOpbouwCatalogus };
/** De catalogus zoals vóór ronde 12: zonder plafonds en plinten. */
const catOud: PlanCatalogus = (() => { const c = { ...planCatalogus }; delete c.plafonds; delete c.plinten; return c; })();
const ruimte = (p: Plattegrond, id: string) => p.ruimtes.find((r) => r.id === id)!;
const metLeef = (f: (r: Ruimte) => void) => { const { plan } = voorbeeldWoning(); f(ruimte(plan, 'leef')); return plan; };
const som = (regels: { groep: string; hoeveelheid: number }[], groep: string) => regels.filter((r) => r.groep === groep).reduce((t, r) => t + r.hoeveelheid, 0);

describe('een plan zonder binnenafwerking blijft zoals het was', () => {
  it('3D, regels en posten zijn gelijk met en zonder de nieuwe catalogi', () => {
    const { plan } = voorbeeldWoning();
    const opties = { meubels: true, aanleg: true, gevelkoppen: true, dingen: true };
    expect(plattegrond3D(plan, planCatalogus, opties)).toEqual(plattegrond3D(plan, catOud, opties));
    expect(plattegrond3D(plan, planCatalogus, { ...opties, laag: 110 })).toEqual(plattegrond3D(plan, catOud, { ...opties, laag: 110 }));
    expect(planNaarRegels(plan, ALLES, planCatalogus)).toEqual(planNaarRegels(plan, ALLES, catOud));
    expect(planNaarRegels(plan, ALLES).some((r) => r.groep === 'Plafonds' || r.groep === 'Plinten')).toBe(false);
    const posten = postenVan(plan, catOpbouw);
    expect(posten.some((p) => p.id.startsWith('plafond:') || p.id.startsWith('plint:'))).toBe(false);
    expect(posten).toEqual(postenVan(plan, { ...catOud, opbouw: woningOpbouwCatalogus }));
  });
  it('de snelstart en een stijl zetten geen plafond, plint of accentmuur', () => {
    for (const stijl of Object.values(stijlCatalogus)) {
      const p = snelWoning({ breedte: 900, diepte: 1000, verdiepingen: 2 }, stijl).plan;
      expect(p.ruimtes.every((r) => r.plafond === undefined && r.plint === undefined && r.accent === undefined)).toBe(true);
    }
  });
});

describe('aan welke kant van de ruimte staat een muur', () => {
  it('liggende en staande muren', () => {
    const { plan } = voorbeeldWoning();
    const muren = murenVan(niveauPlan(plan, 0));
    const kant = (id: string) => binnenKant(muren.find((m) => m.id === id)!, 'leef');
    expect(kant('h380_420')).toBe('boven');
    expect(kant('h900_0')).toBe('onder');
    expect(kant('v0_380')).toBe('links');
    expect(kant('v820_380')).toBe('rechts');
    // Dezelfde muur, gezien vanuit de keuken erboven: haar onderkant.
    expect(binnenKant(muren.find((m) => m.id === 'h380_420')!, 'keuken')).toBe('onder');
    expect(binnenKant(muren.find((m) => m.id === 'h380_420')!, 'slk1')).toBeUndefined();
  });
  it('een schuine muur telt bij de dichtste kant', () => {
    const plan: Plattegrond = { ruimtes: [{ id: 'a', naam: 'A', type: 'leefruimte', x: 0, y: 0, b: 400, d: 400, omtrek: [[0, 0], [400, 0], [400, 300], [300, 400], [0, 400]], vloer: 'parket_eik', wand: 'wit' }], openingen: [], meubels: [], muurhoogte: 270, buitenmuur: 30, binnenmuur: 10, gevel: { soort: 'steen', kleur: '#9c4a34' } } as Plattegrond;
    const schuin = murenVan(plan).find((m) => m.as === 's')!;
    // De schuine hoek rechtsonder kijkt naar rechtsonder (135°): de dichtste kant is rechts of onder.
    expect(['rechts', 'onder']).toContain(binnenKant(schuin, 'a'));
  });
});

describe('accentmuur', () => {
  it('de muren aan die kant krijgen binnen de afwerking van de accentmuur, de andere kant van de muur niet', () => {
    const plan = metLeef((r) => { r.accent = { kant: 'boven', wand: 'terracotta' }; });
    const blokken = plattegrond3D(plan, planCatalogus).blokken;
    const kleur = planCatalogus.wanden.terracotta!.kleur;
    // De muur tussen keuken en leefruimte: plus = leefruimte (z+), min = keuken (z−).
    const muur = blokken.find((b) => b.code.startsWith('muur_h380_420_'))!;
    expect(muur.zijden?.['z+']?.kleur).toBe(kleur);
    expect(muur.zijden?.['z-']?.kleur).toBe(planCatalogus.wanden.gebroken_wit!.kleur);
    // Een muur aan een andere kant van de leefruimte niet.
    expect(blokken.find((b) => b.code.startsWith('muur_v820_380_'))!.zijden?.['x-']?.kleur).not.toBe(kleur);
  });
  it('de m² van de accentmuur gaan van de wand van de ruimte naar haar eigen afwerking: de som blijft', () => {
    const zonder = planNaarRegels(voorbeeldWoning().plan, ALLES);
    const plan = metLeef((r) => { r.accent = { kant: 'boven', wand: 'steenstrips' }; });
    const met = planNaarRegels(plan, ALLES);
    expect(som(met, 'Wanden')).toBeCloseTo(som(zonder, 'Wanden'), 0);
    const accent = binnenMaten(plan, planCatalogus, ruimte(plan, 'leef'), murenVan(niveauPlan(plan, 0))).accent;
    // Netto 800 cm breed (820 op de as min een halve buitenmuur en een halve binnenmuur) × 270 cm min de binnendeur en de doorgang.
    const open = plan.openingen.filter((o) => o.id === 'd1' || o.id === 'd4').reduce((t, o) => t + o.breedte * o.hoogte, 0);
    expect(accent).toBeCloseTo((800 * 270 - open) / 10000, 1);
    expect(met.find((r) => r.code === 'wand:steenstrips')!.hoeveelheid).toBeCloseTo(accent, 0);
    const posten = postenVan(plan, catOpbouw);
    const p = posten.find((x) => x.id === 'binnenwanden:steenstrips')!;
    expect(p.detail.join(' ')).toContain('leefruimte (accentmuur)');
    expect(posten.filter((x) => x.id.startsWith('binnenwanden:')).reduce((t, x) => t + (x.hoeveelheid ?? 0), 0))
      .toBeCloseTo(postenVan(voorbeeldWoning().plan, catOpbouw).filter((x) => x.id.startsWith('binnenwanden:')).reduce((t, x) => t + (x.hoeveelheid ?? 0), 0), 0);
  });
  it('na indelen blijft de accentmuur bij het stuk dat nog aan die kant ligt', () => {
    const plan = metLeef((r) => { r.accent = { kant: 'onder', wand: 'salie' }; });
    // Een liggende wand door de leefruimte: het onderste stuk (aan de achtergevel) houdt de accentmuur.
    const nieuw = splitsRuimtes(plan, 0, 'h', 650, 0, 820, (oud) => ({ ...oud, id: 'leef2', naam: 'Leef 2' }));
    expect(nieuw).toHaveLength(1);
    const [boven, onder] = [ruimte(plan, 'leef'), ruimte(plan, 'leef2')].sort((a, b) => a.y - b.y);
    expect(boven!.accent).toBeUndefined();
    expect(onder!.accent).toEqual({ kant: 'onder', wand: 'salie' });
  });
});

describe('plint', () => {
  it('een lijst vóór het binnenvlak van de muur, op de vloer, niet in de muur en niet in een deur', () => {
    const plan = metLeef((r) => { r.plint = 'wit'; });
    const p0 = niveauPlan(plan, 0), muren = murenVan(p0);
    const blokken = plintBlokken(p0, planCatalogus, ruimte(plan, 'leef'), muren);
    expect(blokken.length).toBeGreaterThan(4);
    for (const b of blokken) {
      expect(b.y).toBe(1.5);
      expect(b.h).toBe(7);
      expect(Math.min(b.b, b.d)).toBe(PLINT_DIKTE);
    }
    // Langs de muur met de keuken: vóór het binnenvlak (y = 385 op het plan), niet in de muur.
    const boven = blokken.filter((b) => b.code.includes('_h380_'));
    expect(boven.every((b) => b.z === 385)).toBe(true);
    // Niet in de doorgang (520–720) of de binnendeur (85–175), wel ervoor en erna.
    for (const b of boven) for (const [a, c] of [[520, 720], [85, 175]] as const) expect(b.x + b.b <= a + 0.01 || b.x >= c - 0.01).toBe(true);
    // Het schuifraam tot op de vloer (220–620) onderbreekt de plint ook; het raam met borstwering in de zijgevel niet.
    const achter = blokken.filter((b) => b.code.includes('_h900_'));
    expect(achter.every((b) => b.z === 900 - 15 - PLINT_DIKTE && (b.x + b.b <= 220.01 || b.x >= 619.99))).toBe(true);
    expect(blokken.filter((b) => b.code.includes('_v0_'))).toHaveLength(1);
  });
  it('lopende meter = netto omtrek min de openingen tot op de vloer', () => {
    const plan = metLeef((r) => { r.plint = 'hout'; });
    const r = ruimte(plan, 'leef'), muren = murenVan(niveauPlan(plan, 0));
    const m = binnenMaten(plan, planCatalogus, r, muren);
    // Doorgang 200, binnendeuren 90 en 90, schuifraam 400 (het raam met borstwering telt niet).
    expect(m.plint).toBeCloseTo(ruimteMaten(plan, r, muren).omtrek - (200 + 90 + 90 + 400) / 100, 2);
    const regel = planNaarRegels(plan, ALLES).find((x) => x.code === 'plint:hout')!;
    expect(regel.groep).toBe('Plinten');
    expect(regel.eenheid).toBe('m');
    expect(regel.hoeveelheid).toBeCloseTo(m.plint, 1);
    const post = postenVan(plan, catOpbouw).find((p) => p.id === 'plint:hout')!;
    expect(post.groep).toBe('binnen');
    expect(post.dingen).toEqual(['ruimte:leef']);
  });
  it('een houten plint bij parket krijgt de kleur van het parket, bij tegels zijn eigen kleur', () => {
    const plan = metLeef((r) => { r.plint = 'hout'; });
    const muren = murenVan(niveauPlan(plan, 0));
    expect(plintBlokken(niveauPlan(plan, 0), planCatalogus, ruimte(plan, 'leef'), muren)[0]!.kleur).toBe(planCatalogus.vloeren.parket_eik!.kleur);
    ruimte(plan, 'leef').vloer = 'tegel_grijs';
    expect(plintBlokken(niveauPlan(plan, 0), planCatalogus, ruimte(plan, 'leef'), muren)[0]!.kleur).toBe(planCatalogus.plinten!.hout!.kleur);
  });
  it('de plint staat in de 3D van de woning, ook met lage muren, en hoort bij de ruimte', () => {
    const plan = metLeef((r) => { r.plint = 'wit'; });
    const blokken = plattegrond3D(plan, planCatalogus, { laag: 110, dingen: true }).blokken;
    expect(blokken.filter((b) => b.code.startsWith('ruimte:leef.plint_leef_')).length).toBeGreaterThan(4);
  });
});

describe('plafond', () => {
  it('m² netto in de groep Plafonds en als post, met de dingen van de ruimte', () => {
    const plan = metLeef((r) => { r.plafond = 'hout'; });
    const r = ruimte(plan, 'leef');
    const regel = planNaarRegels(plan, ALLES).find((x) => x.code === 'plafond:hout')!;
    expect(regel.groep).toBe('Plafonds');
    expect(regel.hoeveelheid).toBeCloseTo(ruimteMaten(plan, r).netto, 1);
    const post = postenVan(plan, catOpbouw).find((p) => p.id === 'plafond:hout')!;
    expect(post.titel).toBe('Plafondafwerking: houten plafond (eik)');
    expect(post.dingen).toEqual(['ruimte:leef']);
  });
  it('plafond, plint en accentmuur gaan mee in de posten voor de klant (zonder m² of meters)', () => {
    const plan = metLeef((r) => { r.plafond = 'hout'; r.plint = 'wit'; r.accent = { kant: 'boven', wand: 'steenstrips' }; });
    const klant = klantPosten(postenVan(plan, catOpbouw));
    const titels = klant.map((p) => p.titel);
    expect(titels).toContain('Plafondafwerking: houten plafond (eik)');
    expect(titels).toContain('Plinten: wit geschilderd');
    expect(klant.find((p) => p.titel === 'Wanden binnen: steenstrips (accentmuur)')!.detail.join(' ')).toContain('leefruimte (accentmuur)');
    expect(klant.filter((p) => /^(Plafondafwerking|Plinten)/.test(p.titel)).every((p) => p.aantal === undefined && p.groep === 'Binnenafwerking')).toBe(true);
  });
  it('de gewone 3D van de woning verandert niet door een plafond (het staat in de 3D van binnen)', () => {
    const { plan } = voorbeeldWoning();
    const met = metLeef((r) => { r.plafond = 'spots'; });
    expect(plattegrond3D(met, planCatalogus, { dingen: true })).toEqual(plattegrond3D(plan, planCatalogus, { dingen: true }));
  });
});

describe('een ruimte van binnen', () => {
  it('haar vloer, haar muren (niet aan de open kant), plafond en plaat; niets van de andere ruimtes', () => {
    const plan = metLeef((r) => { r.plafond = 'hout'; r.plint = 'wit'; r.accent = { kant: 'boven', wand: 'terracotta' }; });
    expect(openKantVan(ruimte(plan, 'leef'))).toBe('onder');
    const s = ruimteVanBinnen(plan, planCatalogus, 'leef', { dingen: true })!;
    const dingen = new Set(s.blokken.map((b) => b.code.split('.')[0]));
    expect([...dingen].filter((d) => d!.startsWith('ruimte:')).sort()).toEqual(['ruimte:leef', 'ruimte:leef:boven', 'ruimte:leef:links', 'ruimte:leef:rechts']);
    expect(s.blokken.some((b) => b.code.includes('vloer_keuken'))).toBe(false);
    expect(s.blokken.filter((b) => b.code.includes('plafond_leef')).every((b) => b.soort === 'planken_h' && b.y === 270 - 1.5)).toBe(true);
    expect(s.blokken.some((b) => b.code.includes('plafondplaat_leef'))).toBe(true);
    // Open kant onder: niet gedraaid; de muren staan niet voorbij de as van de achtergevel.
    expect(s.kader.z + s.kader.d).toBeLessThanOrEqual(900.01);
    // Het schuifraam zat in de open kant: dat is er niet; het raam in de zijgevel wel.
    expect(dingen.has('opening:o10') || s.blokken.some((b) => b.code.includes('o10'))).toBe(true);
  });
  it('een andere open kant draait de ruimte zodat die kant naar de camera (+z) kijkt', () => {
    const plan = metLeef(() => undefined);
    const r = ruimte(plan, 'leef');
    const s = ruimteVanBinnen(plan, planCatalogus, 'leef', { open: 'rechts', dingen: true })!;
    // Na een kwartslag: de ruimte is 520 breed en 820 diep, rond hetzelfde midden.
    const vloer = s.blokken.find((b) => b.code.includes('vloer_leef'))!;
    expect(vloer.b).toBe(r.d);
    expect(vloer.d).toBe(r.b);
    expect(vloer.x + vloer.b / 2).toBeCloseTo(r.x + r.b / 2, 5);
    // De muur die open is (rechts) is weg; de muur links staat nu achteraan (kleinste z).
    expect(s.blokken.some((b) => b.code.startsWith('ruimte:leef:rechts.'))).toBe(false);
    const links = s.blokken.filter((b) => b.code.startsWith('ruimte:leef:links.'));
    expect(Math.max(...links.map((b) => b.z + b.d))).toBeLessThan(vloer.z + 20);
  });
  it('van binnen geen sokkel: de muren hebben buiten hun gevel, niet de natuursteen van de sokkel', () => {
    const { plan } = snelWoning({ breedte: 900, diepte: 1000, verdiepingen: 2 }, stijlCatalogus.klassiek!);
    expect(plan.gevelOntwerp?.sokkel?.materiaal).toBe('natuursteen');
    const s = ruimteVanBinnen(plan, planCatalogus, 'leef')!;
    const soorten = s.blokken.flatMap((b) => [b.soort, ...Object.values(b.zijden ?? {}).map((z) => z.soort)]);
    expect(soorten).not.toContain('natuursteen');
    expect(soorten).toContain('steen');
  });
  it('een ruimte op de verdieping staat op de grond, zonder de rand van de vloerplaat', () => {
    const { plan } = voorbeeldWoning();
    const s = ruimteVanBinnen(plan, planCatalogus, 'slk3')!;
    expect(Math.min(...s.blokken.map((b) => b.y))).toBeGreaterThanOrEqual(0);
  });
});

describe('sferen voor binnen', () => {
  it('één tik zet alle ruimtes; bestaand en garage blijven, een accentmuur ook', () => {
    const { plan } = voorbeeldWoning();
    plan.ruimtes.push({ id: 'g', naam: 'Garage', type: 'garage', x: 1400, y: 0, b: 300, d: 600, vloer: 'gietvloer', wand: 'wit' });
    ruimte(plan, 'keuken').bestaand = true;
    ruimte(plan, 'slk1').accent = { kant: 'boven', wand: 'terracotta' };
    const s = sfeerCatalogus.hout!;
    const p = pasSfeerToe(plan, s);
    expect(p).not.toBe(plan);
    expect(ruimte(plan, 'leef').plafond).toBeUndefined();
    for (const r of p.ruimtes) {
      if (r.id === 'g' || r.id === 'keuken') { expect(r).toEqual(ruimte(plan, r.id)); continue; }
      const k = sfeerKeuze(s, r.type)!;
      expect([r.vloer, r.wand, r.plafond, r.plint]).toEqual([k.vloer, k.wand, k.plafond, k.plint]);
    }
    expect(ruimte(p, 'slk1').wand).toBe('salie');
    expect(ruimte(p, 'bad').wand).toBe('tegels_wit');
    expect(ruimte(p, 'slk1').accent).toEqual({ kant: 'boven', wand: 'terracotta' });
    expect(sfeerVan(p)).toBe('hout');
    expect(sfeerVan(plan)).toBeUndefined();
  });
  it('elke sfeer gebruikt bestaande codes en geeft een woning zonder fouten in de regels', () => {
    for (const s of Object.values(sfeerCatalogus)) {
      for (const k of [s.gewoon, s.nat, { ...s.gewoon, ...s.slaap }, { ...s.nat, ...s.berging }]) {
        expect(planCatalogus.vloeren[k.vloer]).toBeDefined();
        expect(planCatalogus.wanden[k.wand]).toBeDefined();
        expect(planCatalogus.plafonds![k.plafond]).toBeDefined();
        if (k.plint) expect(planCatalogus.plinten![k.plint]).toBeDefined();
      }
      expect(planCatalogus.wanden[s.accent]).toBeDefined();
      const p = pasSfeerToe(voorbeeldWoning().plan, s);
      const regels = planNaarRegels(p, ALLES);
      expect(som(regels, 'Plafonds')).toBeCloseTo(p.ruimtes.reduce((t, r) => t + ruimteMaten(p, r).netto, 0), 0);
      expect(regels.every((r) => r.eenheidsprijs > 0)).toBe(true);
    }
  });
  it('een stijl daarna laat de gekozen binnenafwerking staan (de stijl is buiten)', () => {
    const p = pasSfeerToe(voorbeeldWoning().plan, sfeerCatalogus.industrieel!);
    const q = pasStijlToe(p, stijlCatalogus.klassiek!);
    expect(q.ruimtes.map((r) => [r.vloer, r.wand])).toEqual(p.ruimtes.map((r) => [r.vloer, r.wand]));
    expect(sfeerVan(q)).toBe('industrieel');
    // Zonder gekozen binnenafwerking zoals vroeger.
    expect(ruimte(pasStijlToe(voorbeeldWoning().plan, stijlCatalogus.klassiek!), 'leef').vloer).toBe('parket_eik');
  });
  it('het voorstel voor een accentmuur volgt de sfeer', () => {
    const p = pasSfeerToe(voorbeeldWoning().plan, sfeerCatalogus.industrieel!);
    expect(accentVoorstel(p, ruimte(p, 'leef'))).toBe('steenstrips');
    const q = voorbeeldWoning().plan;
    expect(accentVoorstel(q, ruimte(q, 'leef'))).toBe('salie');
  });
});
