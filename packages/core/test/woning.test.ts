import { describe, expect, it } from 'vitest';
import {
  berekenConfiguratie,
  berekenOfferte,
  controleerModel,
  controleerPlan,
  dichtsteMuur,
  meubelIn3D,
  muurVanOpening,
  murenVan,
  plaatsBlokken,
  plattegrond3D,
  ruimteMaten,
  tekenPlattegrond,
  tekenSvg,
  type Blok,
  type Plattegrond,
} from '../src/index.js';
import { planCatalogus, planNaarRegels } from '../voorbeelden/inrichting.js';
import { raamdeur, raamPrijslijst } from '../voorbeelden/raam.js';
import { raamBlokken, raamScene } from '../voorbeelden/raam3d.js';
import { raamKeuzes, voorbeeldWoning } from '../voorbeelden/woning.js';

const raam = (extra: Record<string, string | number | boolean>) => berekenConfiguratie(raamdeur, raamKeuzes(extra), raamPrijslijst);

describe('raam of deur', () => {
  it('model zonder fouten, standaardraam geldig', () => {
    expect(controleerModel(raamdeur)).toEqual([]);
    const r = raam({ rooster: true });
    expect(r.geldig).toBe(true);
    expect(r.meldingen).toEqual([]);
  });

  it('openingssymbolen per vak in de tekening (draairichting)', () => {
    const r = raam({ vakken: 'v3', breedte: 2400, vak1: 'draaikip_l', vak2: 'vast', vak3: 'draai_r', bovenlicht: true, bovenlicht_open: 'kip' });
    const symbolen = r.tekening!.vormen.filter((v) => v.symbool).map((v) => `${v.code}:${v.symbool}`);
    expect(symbolen).toEqual(['bovenlicht:kip', 'vak.1:draaikip_l', 'vak.2:vast', 'vak.3:draai_r']);
    const svg = tekenSvg(r.tekening!);
    expect(svg).toContain('data-symbool="draaikip_l"');
    expect(svg).toContain('data-symbool="draai_r"');
  });

  it('schuifraam: richting als pijl, voordeur: scharnierkant', () => {
    expect(raam({ type: 'schuif', breedte: 3000, hoogte: 2300, schuif_richting: 'rechts', glas: 'dubbel_gelaagd' }).tekening!.vormen.filter((v) => v.code.startsWith('vak')).map((v) => v.symbool))
      .toEqual(['vast', 'schuif_l']);
    expect(raam({ type: 'voordeur', breedte: 1000, hoogte: 2200, deur_draai: 'rechts', glas: 'dubbel_gelaagd' }).afgeleid.op1).toBe('draai_r');
  });

  it('veiligheidsglas bij deuren en lage borstwering', () => {
    expect(raam({ borstwering: 600 }).meldingen.map((m) => m.code)).toContain('veiligheidsglas');
    expect(raam({ borstwering: 600, glas: 'dubbel_gelaagd' }).meldingen.map((m) => m.code)).not.toContain('veiligheidsglas');
    expect(raam({ type: 'terrasdeur', breedte: 900, hoogte: 2300 }).meldingen.map((m) => m.code)).toContain('veiligheidsglas');
  });

  it('kipraam mag niet te hoog, vakken niet te breed', () => {
    const r = raam({ vak1: 'kip', hoogte: 1600 });
    expect(r.meldingen.map((m) => m.code)).toContain('vak1_hoog');
    expect(raam({ breedte: 2000 }).meldingen.map((m) => m.code)).toContain('vak1_breed');
    expect(raam({ breedte: 2000, vakken: 'v2' }).meldingen.map((m) => m.code)).not.toContain('vak1_breed');
  });

  it('ventilatie en privacy volgen de ruimte', () => {
    expect(raam({ ruimte: 'slaapkamer' }).meldingen.map((m) => m.code)).toContain('ventilatie');
    expect(raam({ ruimte: 'badkamer' }).meldingen.map((m) => m.code)).toEqual(['privacy']);
    expect(raam({ ruimte: 'badkamer', glas: 'mat_gelaagd' }).meldingen).toEqual([]);
  });

  it('zonwering, motor en domotica in de stuklijst', () => {
    const r = raam({ zonwering: 'screen', bediening: 'domotica', rooster: true });
    const artikels = r.stuklijst.map((s) => s.artikel);
    expect(artikels).toEqual(expect.arrayContaining(['ZON-SCREEN', 'ZON-MOTOR', 'ZON-DOMOTICA', 'ROOSTER']));
    expect(r.afgeleid.zon_kast).toBe(150);
  });

  it('3D: kader, vleugels, glas, greep aan de kant tegenover de scharnieren', () => {
    const r = raam({ vak1: 'draai_l' });
    const rb = raamBlokken(r);
    expect(rb.b).toBe(120);
    const greep = rb.blokken.find((b) => b.code === 'greep1')!;
    expect(greep.x).toBeGreaterThan(rb.b / 2);
    const r2 = raam({ vak1: 'draai_r' });
    expect(raamBlokken(r2).blokken.find((b) => b.code === 'greep1')!.x).toBeLessThan(60);
    expect(raamScene(r).blokken.some((b) => b.zijden?.['z-']?.soort === 'steen')).toBe(true);
  });
});

describe('plaatsBlokken', () => {
  const blok: Blok = { code: 'a', soort: 'hout', vorm: 'blok', x: 0, y: 0, z: 0, b: 100, h: 10, d: 20, kleur: '#000', zijden: { 'z-': { soort: 'steen', kleur: '#f00' } } };
  it('draait in stappen van 90° en draait de zijden mee', () => {
    const [b90] = plaatsBlokken([blok], { x: 0, z: 0, draai: 90 });
    expect([b90!.x, b90!.z, b90!.b, b90!.d]).toEqual([-20, 0, 20, 100]);
    expect(Object.keys(b90!.zijden!)).toEqual(['x+']);
    const [b180] = plaatsBlokken([blok], { x: 10, z: 5, draai: 180 });
    expect([b180!.x, b180!.z]).toEqual([-90, -15]);
  });
});

describe('plattegrond', () => {
  const { plan, posities } = voorbeeldWoning();

  it('muren volgen uit de ruimtes: buitenmuren en binnenmuren', () => {
    const twee: Plattegrond = { ...plan, openingen: [], meubels: [], ruimtes: [plan.ruimtes[0]!, { ...plan.ruimtes[0]!, id: 'b', x: 260 }] };
    const muren = murenVan(twee);
    expect(muren.filter((m) => m.soort === 'binnen')).toHaveLength(1);
    expect(muren.filter((m) => m.soort === 'buiten')).toHaveLength(6);
    expect(muren.find((m) => m.soort === 'binnen')).toMatchObject({ as: 'v', lijn: 260, van: 0, tot: 380, plus: 'b', min: 'hal' });
  });

  it('voorbeeldwoning zonder fouten; alle openingen op een muur', () => {
    expect(controleerPlan(plan).filter((m) => m.ernst === 'fout')).toEqual([]);
    const muren = murenVan(plan);
    for (const o of plan.openingen) expect(muurVanOpening(o, muren), o.id).toBeDefined();
    expect(posities).toHaveLength(10);
  });

  it('controles: raam in een binnenmuur, niet bereikbare ruimte, geen daglicht', () => {
    const fout: Plattegrond = structuredClone(plan);
    fout.openingen.find((o) => o.id === 'o3')!.lijn = 380; // keukenraam naar de binnenmuur
    fout.openingen = fout.openingen.filter((o) => o.id !== 'd6'); // deur slaapkamer 1 weg
    const meldingen = controleerPlan(fout).map((m) => m.melding);
    expect(meldingen.some((m) => m.includes('binnenmuur'))).toBe(true);
    expect(meldingen.some((m) => m.includes('Slaapkamer 1 is niet bereikbaar'))).toBe(true);
    expect(meldingen.some((m) => m.includes('Keuken heeft geen raam'))).toBe(true);
  });

  it('netto oppervlakte houdt rekening met de muurdikte', () => {
    const leef = plan.ruimtes.find((r) => r.id === 'leef')!;
    const m = ruimteMaten(plan, leef);
    expect(m.bruto).toBe(42.64);
    expect(m.nb).toBe(800); // 820 − 15 (buitenmuur) − 5 (binnenmuur)
    expect(m.nd).toBe(500); // 520 − 5 − 15
    expect(m.netto).toBe(40);
  });

  it('dichtste muur bij een klik', () => {
    const d = dichtsteMuur(murenVan(plan), 300, 895);
    expect(d?.muur.soort).toBe('buiten');
    expect(d?.midden).toBe(300);
  });

  it('3D: muren met gevel buiten en wandkleur binnen, ramen in de opening, meubels', () => {
    const res = new Map(posities.map((p) => [p.id, berekenConfiguratie(raamdeur, p.keuzes, raamPrijslijst)]));
    const s = plattegrond3D(plan, planCatalogus, {
      inhoud: (o) => {
        const r = o.positie ? res.get(o.positie) : undefined;
        if (!r) return undefined;
        const rb = raamBlokken(r);
        return { blokken: rb.blokken, hoogte: rb.h + rb.kast };
      },
    });
    expect(s.kader.b).toBeGreaterThan(1400);
    expect(s.blokken.some((b) => b.zijden && Object.values(b.zijden).some((z) => z?.soort === 'steen'))).toBe(true);
    expect(s.blokken.filter((b) => b.soort === 'glas').length).toBeGreaterThan(10);
    const laag = plattegrond3D(plan, planCatalogus, { laag: 110, meubels: false });
    expect(Math.max(...laag.blokken.map((b) => b.y + b.h))).toBeLessThanOrEqual(110);
  });

  it('meubels draaien rond hun voetafdruk', () => {
    const blokken = meubelIn3D({ id: 'm', type: 'bed2', x: 100, y: 200, b: 165, d: 215, rotatie: 90 }, planCatalogus.meubels.bed2!);
    const x0 = Math.min(...blokken.map((b) => b.x)), z0 = Math.min(...blokken.map((b) => b.z));
    expect(x0).toBeGreaterThanOrEqual(100);
    expect(z0).toBeGreaterThanOrEqual(200);
    expect(Math.max(...blokken.map((b) => b.x + b.b))).toBeLessThanOrEqual(100 + 215);
  });

  it('svg met ruimtes, openingen en labels', () => {
    const svg = tekenPlattegrond(plan, planCatalogus, { raamInfo: (o) => (o.positie ? { label: o.positie.toUpperCase() } : undefined) });
    expect(svg).toContain('data-soort="ruimte"');
    expect(svg.match(/data-soort="opening"/g)).toHaveLength(plan.openingen.length);
    expect(svg).toContain('Leefruimte');
    expect(svg).toContain('40,0 m²');
  });
});

describe('offerte', () => {
  const { plan, posities } = voorbeeldWoning();
  const res = posities.map((p) => ({ id: p.id, code: p.code, naam: p.naam, aantal: 1, resultaat: berekenConfiguratie(raamdeur, p.keuzes, raamPrijslijst) }));

  it('regels uit de plattegrond: vloeren, wanden, deuren', () => {
    const regels = planNaarRegels(plan, { vloeren: true, wanden: true, binnendeuren: true, ruwbouw: false, inrichting: false });
    expect(new Set(regels.map((r) => r.groep))).toEqual(new Set(['Vloeren', 'Wanden', 'Binnendeuren']));
    expect(regels.find((r) => r.code === 'deur:schilder')?.hoeveelheid).toBe(4);
    const parket = regels.find((r) => r.code === 'vloer:parket_eik')!;
    expect(parket.hoeveelheid).toBeGreaterThan(80);
  });

  it('totalen, korting en btw over de hele offerte', () => {
    const regels = [{ code: 'x', groep: 'Test', omschrijving: 'Test', eenheid: 'stuk', hoeveelheid: 2, eenheidsprijs: 100, kostprijs: 60 }];
    const o = berekenOfferte({ posities: res, regels, kortingProcent: 10, btwProcent: 6 });
    const som = res.reduce((t, p) => t + p.resultaat.prijs.brutoprijsExcl, 0);
    expect(o.subtotaalPosities).toBeCloseTo(som, 2);
    expect(o.subtotaalRegels).toBe(200);
    expect(o.excl).toBeCloseTo((som + 200) * 0.9, 1);
    expect(o.btw).toBeCloseTo(o.excl * 0.06, 1);
    expect(o.geldig).toBe(true);
    const dubbel = berekenOfferte({ posities: res.map((p) => ({ ...p, aantal: 2 })), btwProcent: 21 });
    expect(dubbel.subtotaalPosities).toBeCloseTo(som * 2, 1);
  });
});
