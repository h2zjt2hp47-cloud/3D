import { describe, expect, it } from 'vitest';
import {
  berekenConfiguratie,
  controleerPlan,
  delenVan,
  gevelAanzichten,
  murenVan,
  niveauPlan,
  plattegrond3D,
  ruimteMaten,
  splitsRuimtes,
  tekenRuimteIn,
  tekenSvg,
  vergelijkOfferte,
  verwerkMeting,
  type Plattegrond,
  type Ruimte,
} from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { raamdeur, raamPrijslijst, ruitenVan } from '../voorbeelden/raam.js';
import { raamBlokken } from '../voorbeelden/raam3d.js';
import { raamKeuzes, voorbeeldWoning } from '../voorbeelden/woning.js';

const kamer = (id: string, x: number, y: number, b: number, d: number, extra: Partial<Ruimte> = {}): Ruimte =>
  ({ id, naam: id, type: 'leefruimte', x, y, b, d, vloer: 'parket_eik', wand: 'wit', ...extra });
const leeg = (): Plattegrond => ({ ...voorbeeldWoning().plan, ruimtes: [], openingen: [], meubels: [], verdiepingen: undefined });

describe('ruimtes tekenen en indelen', () => {
  it('ruimte in ruimte: de grote ruimte krijgt een U-vorm, muren alleen rond de nieuwe ruimte', () => {
    const plan = leeg();
    plan.ruimtes.push(kamer('a', 0, 0, 600, 400));
    tekenRuimteIn(plan, kamer('b', 200, 0, 200, 150, { type: 'berging' }));
    const a = plan.ruimtes.find((r) => r.id === 'a')!;
    expect(delenVan(a)).toHaveLength(3);
    const opp = delenVan(a).reduce((t, p) => t + p.b * p.d, 0);
    expect(opp).toBe(600 * 400 - 200 * 150);
    const muren = murenVan(plan);
    // Binnenmuren: links, rechts en onder de berging; geen muren tussen de delen van a.
    expect(muren.filter((m) => m.soort === 'binnen').map((m) => `${m.as}${m.lijn}:${m.van}-${m.tot}`).sort()).toEqual(['h150:200-400', 'v200:0-150', 'v400:0-150']);
    expect(ruimteMaten(plan, a).bruto).toBe(21);
  });

  it('ruimte volledig over een andere tekenen vervangt die', () => {
    const plan = leeg();
    plan.ruimtes.push(kamer('a', 0, 0, 300, 300));
    tekenRuimteIn(plan, kamer('b', -10, -10, 400, 400));
    expect(plan.ruimtes.map((r) => r.id)).toEqual(['b']);
  });

  it('wand tekenen deelt alle ruimtes die ze kruist', () => {
    const plan = leeg();
    plan.ruimtes.push(kamer('a', 0, 0, 600, 300), kamer('b', 0, 300, 600, 300));
    let i = 0;
    const nieuw = splitsRuimtes(plan, 0, 'v', 250, 0, 600, (oud) => ({ ...oud, id: `n${++i}`, naam: `Nieuw ${i}` }));
    expect(nieuw).toHaveLength(2);
    expect(plan.ruimtes.find((r) => r.id === 'a')).toMatchObject({ x: 0, b: 250 });
    expect(nieuw[0]).toMatchObject({ x: 250, b: 350, y: 0 });
    // Een korte wand (alleen in de bovenste ruimte) deelt alleen die ruimte.
    const plan2 = leeg();
    plan2.ruimtes.push(kamer('a', 0, 0, 600, 300), kamer('b', 0, 300, 600, 300));
    expect(splitsRuimtes(plan2, 0, 'v', 250, 50, 250, (oud) => ({ ...oud, id: 'x' }))).toHaveLength(1);
  });
});

describe('verdiepingen', () => {
  const { plan, posities } = voorbeeldWoning();

  it('verdieping bereikbaar via de trap; zonder trap een waarschuwing', () => {
    expect(controleerPlan(plan).filter((m) => m.melding.includes('niet bereikbaar') || m.melding.includes('trap'))).toEqual([]);
    const zonderTrap = { ...plan, meubels: plan.meubels.filter((m) => m.type !== 'trap') };
    const meldingen = controleerPlan(zonderTrap).map((m) => m.melding);
    expect(meldingen.some((m) => m.includes('nog geen trap'))).toBe(true);
    expect(meldingen.some((m) => m.includes('Slaapkamer 3 is niet bereikbaar'))).toBe(true);
  });

  it('muren per verdieping: de achterwand van verdieping 1 is een buitenmuur', () => {
    const m = murenVan(niveauPlan(plan, 1)).find((x) => x.as === 'h' && x.lijn === 380 && x.van === 0);
    expect(m?.soort).toBe('buiten');
  });

  it('3D: verdieping op de juiste hoogte, vloerplaat met trapgat, plat dak op het gelijkvloers', () => {
    const s = plattegrond3D(plan, planCatalogus, { meubels: false });
    expect(Math.max(...s.blokken.map((b) => b.y + b.h))).toBe(2 * 270 + 30);
    const platen = s.blokken.filter((b) => b.code === 'plaat_overloop');
    expect(platen.length).toBeGreaterThan(1); // opgesplitst rond het trapgat
    expect(s.blokken.some((b) => b.soort === 'dak' && b.y === 270)).toBe(true);
  });

  it('valbeveiliging alleen op de verdieping', () => {
    const r = (verdieping: number) => berekenConfiguratie(raamdeur, raamKeuzes({ borstwering: 400, glas: 'dubbel_gelaagd', verdieping }), raamPrijslijst);
    expect(r(0).meldingen.map((m) => m.code)).not.toContain('valgevaar');
    expect(r(1).meldingen.map((m) => m.code)).toContain('valgevaar');
    const p = posities.find((x) => x.naam === 'Raam overloop naar dakterras')!;
    expect(berekenConfiguratie(raamdeur, p.keuzes, raamPrijslijst).meldingen.map((m) => m.code)).toContain('valgevaar');
  });
});

describe('gevelaanzichten', () => {
  const { plan } = voorbeeldWoning();
  it('vier gevels met ramen, symbolen gezien van buiten en kettingmaten', () => {
    const gevels = gevelAanzichten(plan, (o) => (o.positie ? { label: o.positie.toUpperCase(), vakken: o.id === 'o4' ? ['draaikip_l', 'draaikip_r'] : undefined, voordeur: o.id === 'o1' } : undefined));
    expect(gevels.map((g) => g.kant)).toEqual(['boven', 'onder', 'links', 'rechts']);
    const voor = gevels.find((g) => g.kant === 'boven')!;
    expect(voor.naam).toContain('Voorgevel');
    // Gezien van buiten: vakken in omgekeerde volgorde en gespiegeld.
    const vakken = voor.tekening.vormen.filter((v) => v.code.startsWith('vak.o4.')).map((v) => v.symbool);
    expect(vakken).toEqual(['draaikip_l', 'draaikip_r']);
    // Kettingmaten: alle stukken samen = totale breedte.
    const ketting = voor.tekening.maatlijnen.filter((m) => m.code.startsWith('ketting.0.'));
    const som = ketting.reduce((t, m) => t + Math.abs(m.x1 - m.x2), 0);
    const totaal = voor.tekening.maatlijnen.find((m) => m.code === 'totaal')!;
    expect(som).toBeCloseTo(Math.abs(totaal.x1 - totaal.x2), 0);
    expect(totaal.tekst).toBe('1430');
    expect(tekenSvg(voor.tekening)).toContain('<svg');
  });
});

describe('werf', () => {
  it('bestelmaat = kleinste maat min speling, met haaksheid en afwijking', () => {
    const r = verwerkMeting({ breedtes: [1215, 1212, 1220], hoogtes: [1408, 1412], diagonalen: [1850, 1859], speling: 10 }, { b: 1200, h: 1400 });
    expect(r).toMatchObject({ compleet: true, bestelB: 1192, bestelH: 1398, afwijking: 8, diagonaalVerschil: 9 });
    expect(r.meldingen.map((m) => m.tekst).join(' ')).toContain('niet haaks');
    expect(verwerkMeting({ breedtes: [1215, null, 1220], hoogtes: [1408, 1412], diagonalen: [], speling: 10 }, { b: 1200, h: 1400 }).compleet).toBe(false);
  });

  it('meerwerk: gewijzigde, nieuwe en vervallen posities en regels', () => {
    const oud = {
      posities: [
        { id: 'a', code: 'P1', naam: 'Raam', aantal: 1, stukprijs: 1000, details: ['Glas: Dubbel', 'Breedte: 1200 mm'] },
        { id: 'b', code: 'P2', naam: 'Deur', aantal: 1, stukprijs: 2000, details: [] },
      ],
      regels: [{ code: 'vloer', omschrijving: 'Parket', eenheid: 'm²', hoeveelheid: 40, eenheidsprijs: 90 }],
    };
    const nieuw = {
      posities: [
        { id: 'a', code: 'P1', naam: 'Raam', aantal: 1, stukprijs: 1150, details: ['Glas: Driedubbel', 'Breedte: 1192 mm'] },
        { id: 'c', code: 'P2', naam: 'Raam extra', aantal: 2, stukprijs: 500, details: [] },
      ],
      regels: [{ code: 'vloer', omschrijving: 'Parket', eenheid: 'm²', hoeveelheid: 42, eenheidsprijs: 90 }],
    };
    const lijnen = vergelijkOfferte(oud, nieuw);
    expect(lijnen.map((l) => [l.soort, l.bedrag])).toEqual([['gewijzigd', 150], ['vervallen', -2000], ['nieuw', 1000], ['gewijzigd', 180]]);
    expect(lijnen[0]!.wijzigingen).toEqual(['Glas: Dubbel → Driedubbel', 'Breedte: 1200 mm → 1192 mm']);
  });
});

describe('statiek, afstandhouder en glasbestelling', () => {
  const raam = (extra: Record<string, string | number | boolean>) => berekenConfiguratie(raamdeur, raamKeuzes(extra), raamPrijslijst);

  it('nodig traagheidsmoment volgens 5·q·L³·k / (384·E)', () => {
    // 2 vakken van 1,2 m breed en 2,5 m overspanning, 800 Pa, L/300, aluminium: ± 84 cm⁴ (zie het onderzoek).
    const f = 45; // half aanzicht aluminium
    const r = raam({ type: 'terrasdeur', profiel: 'alu', vakken: 'v2', vak1: 'draai_l', vak2: 'draai_r', glas: 'dubbel_gelaagd', breedte: 2 * 1200 + 2 * f, hoogte: 2500 + f, winddruk: 800 });
    expect(r.afgeleid.stijl_a).toBe(1200);
    expect(r.afgeleid.stijl_l).toBe(2500);
    expect(r.afgeleid.i_nodig).toBeCloseTo(83.7, 1);
    expect(r.meldingen.map((m) => m.code)).toContain('statiek');
    // Versterkt (120 cm⁴) volstaat; L/200 vraagt minder stijfheid.
    expect(raam({ type: 'terrasdeur', profiel: 'alu', vakken: 'v2', vak1: 'draai_l', vak2: 'draai_r', glas: 'dubbel_gelaagd', breedte: 2490, hoogte: 2545, tussenstijl: 'versterkt' }).meldingen.map((m) => m.code)).not.toContain('statiek');
    expect(raam({ type: 'terrasdeur', profiel: 'alu', vakken: 'v2', vak1: 'draai_l', vak2: 'draai_r', glas: 'dubbel_gelaagd', breedte: 2490, hoogte: 2545, doorbuiging: 'b' }).afgeleid.i_nodig).toBeCloseTo(55.8, 1);
  });

  it('één vak zonder bovenlicht heeft geen tussenstijl', () => {
    const r = raam({});
    expect(r.afgeleid.heeft_stijl).toBe(false);
    expect(r.kenmerken.find((k) => k.code === 'tussenstijl')?.zichtbaar).toBe(false);
  });

  it('afstandhouder: warm edge geeft een lagere Uw dan aluminium', () => {
    const warm = Number(raam({ afstandhouder: 'warm' }).afgeleid.uw), alu = Number(raam({ afstandhouder: 'alu' }).afgeleid.uw);
    expect(warm).toBeLessThan(alu);
    expect(raam({ afstandhouder: 'warm' }).stuklijst.some((s) => s.artikel === 'GLAS-RAND-WARM')).toBe(true);
  });

  it('glasbestelling: glasmaat = dagmaat + 2 × glasinstand − glasspeling, per vak en bovenlicht', () => {
    const r = raam({ vakken: 'v2', breedte: 2000, hoogte: 1500, bovenlicht: true, bovenlicht_h: 400, vak2: 'vast' });
    const ruiten = ruitenVan(r);
    expect(ruiten.map((g) => g.plaats)).toEqual(['vak 1', 'vak 2', 'bovenlicht']);
    const a = r.afgeleid as Record<string, number>;
    expect(ruiten[0]).toMatchObject({ dagB: Math.round(a.gb!), b: Math.round(a.gb! + 28 - 8) });
    expect(ruiten[0]!.b).toBe(a.glasmaat_b);
    expect(ruiten[2]!.h).toBe(Math.round(400 - a.f! + 20));
    // De stuklijst rekent glas op de glasmaat.
    const glas = r.stuklijst.find((s) => s.code === 'glas')!;
    expect(glas.lengte).toBe(a.glasmaat_b);
  });

  it('3D: rode stijl bij een statiekfout, dieper koppelprofiel, rand rond het glas', () => {
    const fout = raamBlokken(raam({ vakken: 'v2', breedte: 2400, hoogte: 2400, winddruk: 2500, glas: 'dubbel_gelaagd', borstwering: 300 }));
    expect(fout.blokken.find((b) => b.code === 'stijl1')?.kleur).toBe('#e0412f');
    const koppel = raamBlokken(raam({ vakken: 'v2', breedte: 2000, tussenstijl: 'koppel' }));
    expect(koppel.blokken.find((b) => b.code === 'stijl1')?.d).toBe(13);
    expect(koppel.blokken.filter((b) => b.code.endsWith('_rand_o'))).toHaveLength(2);
  });
});
