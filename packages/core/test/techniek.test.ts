import { describe, expect, it } from 'vitest';
import {
  ALLE_VAKKEN, asVan, controleerPlan, leidingVerloop, maatTekst, maatVan, murenVan, niveauPlan, nieuwToestel, opAs, plattegrond3D, ruimteOp,
  telTechniek, tekenPlattegrond, toestelBlokken, toestelMaten, toestelVoetafdruk, toestelVorm, vloerHoogte, voorRichting,
  zetOmtrek, TECHNIEK_VOORBEHOUD, type Blok, type Leiding, type Plattegrond, type Ruimte, type Toestel,
} from '../src/index.js';
import { leidingLangsWanden, technischeOpstelling, tegenWand, vloerverwarmingLus } from '../src/techniekplaatsen.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { techniekCatalogus as tc } from '../voorbeelden/techniek.js';
import { BERGING_OPSTELLING, techniekPlanCatalogus as cat, uitgerusteWoning } from '../voorbeelden/techniekwoning.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

const vh = (plan: Plattegrond) => (n: number) => vloerHoogte(plan, n);

/** Eén ruimte van 6 × 4 m (op de as): raam bovenaan (90 tot 210 cm), buitendeur rechts. */
function kamer(type: Ruimte['type'] = 'leefruimte'): Plattegrond {
  return {
    ruimtes: [{ id: 'r1', naam: 'Kamer', type, x: 0, y: 0, b: 600, d: 400, vloer: 'parket_eik', wand: 'wit' }],
    openingen: [
      { id: 'raam', soort: 'raam', as: 'h', lijn: 0, midden: 300, breedte: 120, hoogte: 120, borstwering: 90, scharnier: 'begin', naarPlus: true },
      { id: 'deur', soort: 'buitendeur', as: 'v', lijn: 600, midden: 200, breedte: 100, hoogte: 230, borstwering: 0, scharnier: 'begin', naarPlus: true },
    ],
    meubels: [],
    muurhoogte: 270, buitenmuur: 30, binnenmuur: 10,
    gevel: { soort: 'steen', kleur: '#9c4a34' },
  };
}

const metTechniek = (plan: Plattegrond, toestellen: Toestel[], leidingen: Leiding[] = []): Plattegrond => ({ ...plan, toestellen, leidingen });
const t = (type: string, id: string, x: number, y: number, extra: Partial<Toestel> = {}) => nieuwToestel(tc, type, id, x, y, 270, extra);
const techniekMeldingen = (plan: Plattegrond) => controleerPlan(plan, cat).filter((m) => m.toestel || m.leiding || /afvoer/.test(m.melding));

describe('techniek: een plan zonder techniek blijft gelijk', () => {
  const { plan } = voorbeeldWoning();
  it('3D, tekening, controles en verdiepingen: met of zonder catalogus en optie hetzelfde', () => {
    const gewoon = plattegrond3D(plan, planCatalogus, { laag: 110, totNiveau: 0, aanleg: true, gevelkoppen: true });
    expect(plattegrond3D(plan, cat, { laag: 110, totNiveau: 0, aanleg: true, gevelkoppen: true, techniek: {} })).toEqual(gewoon);
    expect(plattegrond3D(plan, cat, { dingen: true, techniek: { vakken: ['elektriciteit'] } })).toEqual(plattegrond3D(plan, planCatalogus, { dingen: true }));
    expect(tekenPlattegrond(plan, cat, { techniek: true })).toBe(tekenPlattegrond(plan, planCatalogus));
    expect(controleerPlan(plan, cat)).toEqual(controleerPlan(plan, planCatalogus));
    expect('toestellen' in niveauPlan(plan, 0)).toBe(false);
    expect('leidingen' in niveauPlan(plan, 1)).toBe(false);
  });
  it('de vaste zin staat klaar voor elk blad en scherm', () => {
    expect(TECHNIEK_VOORBEHOUD).toBe('De installateur dimensioneert; dit is geen berekening en geen controle op de regels.');
  });
});

describe('catalogus techniek', () => {
  it('elk vak heeft toestellen en leidingen; alles is een richtwaarde die nog nagelezen moet worden', () => {
    for (const vak of ALLE_VAKKEN) {
      expect(Object.values(tc.toestellen).some((x) => x.vak === vak)).toBe(true);
      expect(Object.values(tc.leidingen).some((x) => x.vak === vak)).toBe(true);
    }
    for (const [code, x] of Object.entries(tc.toestellen)) {
      expect(x.b > 0 && x.d > 0 && x.h > 0, code).toBe(true);
      expect(x.herkomst.nagelezen, code).toBe(false);
      expect(toestelVorm(x.vorm, x.b, x.d, x.h, x.kleur, x.bevestiging).length, code).toBeGreaterThan(0);
    }
    for (const [code, x] of Object.entries(tc.leidingen)) {
      expect(x.kleur, code).toMatch(/^#[0-9a-f]{6}$/);
      expect(x.maten.length, code).toBeGreaterThan(0);
      expect(x.herkomst.nagelezen, code).toBe(false);
    }
    // Geen prijzen.
    expect(JSON.stringify(tc)).not.toMatch(/prijs|€|kost/);
  });
  it('een vaste kleur per soort leiding (alleen de twee ventilatiekanalen delen hun kleur)', () => {
    const kleuren = Object.entries(tc.leidingen).filter(([k]) => k !== 'ventilatie_plat').map(([, x]) => x.kleur);
    expect(new Set(kleuren).size).toBe(kleuren.length);
    expect(tc.leidingen.warm_water!.kleur).not.toBe(tc.leidingen.aanvoer_verwarming!.kleur);
  });
});

describe('verloop van een leiding en de telling', () => {
  it('op en neer naar de toestellen, en de lengte telt alle stukken', () => {
    const plan = metTechniek(kamer(), [t('stopcontact', 'a', 100, 383, { draai: 180 }), t('stopcontact', 'b', 400, 383, { draai: 180 })], [
      { id: 'k', soort: 'kabel', punten: [[100, 380], [400, 380]], hoogte: 'vloer', van: 'a', naar: 'b' },
    ]);
    const v = leidingVerloop(plan.leidingen![0]!, plan, tc, { vloerHoogte: vh(plan) });
    expect(v.punten.map((p) => p[1])).toEqual([34, -5, -5, 34]);
    expect(v.lengte).toBeCloseTo(3 + 2 * 0.39, 5);
    expect(v.lengtePlan).toBe(3);
    const regels = telTechniek(plan, tc);
    expect(regels).toEqual([
      { groep: 'elektriciteit', soort: 'toestel', materiaal: 'stopcontact', label: 'Stopcontact', aantal: 2 },
      { groep: 'elektriciteit', soort: 'leiding', materiaal: 'kabel', label: 'Kabel in buis (kring)', doorsnede: 'Ø 16 mm', aantal: 1, lengte: 3.78 },
    ]);
  });
  it('naar een toestel op een andere verdieping: het stuk op loopt door de vloer', () => {
    const { plan } = uitgerusteWoning();
    const radiator = plan.leidingen!.find((l) => l.naar && plan.toestellen!.find((x) => x.id === l.naar)?.type === 'radiator')!;
    const v = leidingVerloop(radiator, plan, tc, { vloerHoogte: vh(plan) });
    expect(v.punten[0]![1]).toBeLessThan(vloerHoogte(plan, 1));
    expect(v.punten[1]![1]).toBe(vloerHoogte(plan, 1) - 5);
  });
  it('de telling van het voorbeeld is de som van wat de 3D tekent', () => {
    const { plan } = uitgerusteWoning();
    const regels = telTechniek(plan, tc);
    const verwacht = new Map<string, number>();
    for (const l of plan.leidingen!) {
      const s = tc.leidingen[l.soort]!, k = `${l.soort}|${maatTekst(s, maatVan(l, s))}`;
      verwacht.set(k, (verwacht.get(k) ?? 0) + leidingVerloop(l, plan, tc, { vloerHoogte: vh(plan) }).lengte);
    }
    for (const r of regels.filter((x) => x.soort === 'leiding')) expect(r.lengte).toBeCloseTo(verwacht.get(`${r.materiaal}|${r.doorsnede}`)!, 1);
    expect(regels.filter((x) => x.soort === 'leiding').length).toBe(verwacht.size);
    expect(regels.reduce((s, r) => s + (r.soort === 'toestel' ? r.aantal : 0), 0)).toBe(plan.toestellen!.length);
    expect(regels.reduce((s, r) => s + (r.soort === 'leiding' ? r.aantal : 0), 0)).toBe(plan.leidingen!.length);
    // Per verdieping: samen het geheel.
    const per = [0, 1].map((n) => telTechniek(plan, tc, { niveau: n }).reduce((s, r) => s + r.aantal, 0));
    expect(per[0]! + per[1]!).toBe(regels.reduce((s, r) => s + r.aantal, 0));
  });
});

describe('plaatsen: tegen de wand, langs de wanden, technische ruimte, vloerverwarming', () => {
  it('een toestel tegen de dichtste wand: de achterkant tegen het muurvlak, de voorkant de kamer in', () => {
    const plan = kamer();
    const p = tegenWand(plan, t('stopcontact', 'a', 250, 360), tc.toestellen.stopcontact!)!;
    expect(p.toestel.y).toBe(400 - 15 - 2);
    expect(voorRichting(p.toestel.draai)).toEqual([0, -1]);
    // Buiten: de buitenunit houdt de vrije ruimte achter (15 cm) tussen zich en de gevel.
    const b = tegenWand(plan, t('airco_buiten', 'b', 300, 470), tc.toestellen.airco_buiten!)!;
    expect(b.toestel.y).toBe(400 + 15 + 15 + 15);
    expect(voorRichting(b.toestel.draai)).toEqual([0, 1]);
    // Te ver van een muur: niets.
    expect(tegenWand(plan, t('stopcontact', 'c', 300, 200), tc.toestellen.stopcontact!, { maxAfstand: 50 })).toBeUndefined();
  });
  it('ook tegen een schuine wand: de draaiing volgt de muur', () => {
    const plan = kamer();
    zetOmtrek(plan.ruimtes[0]!, [[0, 0], [600, 0], [600, 400], [200, 400], [0, 200]]);
    const muur = murenVan(plan).find((m) => m.as === 's')!;
    const p = tegenWand(plan, t('radiator', 'r', 90, 270), tc.toestellen.radiator!)!;
    expect(p.muur.id).toBe(muur.id);
    const [vx, vy] = voorRichting(p.toestel.draai), { d } = asVan(muur);
    expect(Math.abs(vx * d[0] + vy * d[1])).toBeLessThan(1e-6);
    // De achterkant ligt op het binnenvlak van de schuine muur.
    const achter: [number, number] = [p.toestel.x - (vx * tc.toestellen.radiator!.d) / 2, p.toestel.y - (vy * tc.toestellen.radiator!.d) / 2];
    expect(Math.abs(Math.abs(opAs(muur, achter)[1] - muur.lijn) - muur.dikte / 2)).toBeLessThan(0.2);
    expect(ruimteOp(plan, p.toestel.x, p.toestel.y)?.id).toBe('r1');
  });
  it('een leiding langs de wanden: haaks, door de binnenmuur waar het moet', () => {
    const { plan } = voorbeeldWoning();
    const punten = leidingLangsWanden(plan, [130, 200], [700, 150], { afstand: 5 });
    expect(punten[0]).toEqual([130, 200]);
    expect(punten[punten.length - 1]).toEqual([700, 150]);
    for (let i = 1; i < punten.length; i++) {
      const [a, b] = [punten[i - 1]!, punten[i]!];
      expect(a[0] === b[0] || a[1] === b[1]).toBe(true);
    }
    // Van de inkom naar de keuken moet ze door een binnenmuur.
    const muren = murenVan(niveauPlan(plan, 0));
    const door = muren.filter((m) => m.soort === 'binnen' && punten.some((q, i) => {
      const p = punten[i - 1];
      if (!p) return false;
      const [s1, w1] = opAs(m, p), [s2, w2] = opAs(m, q);
      return (w1 - m.lijn) * (w2 - m.lijn) < 0 && Math.max(s1, s2) > m.van && Math.min(s1, s2) < m.tot;
    }));
    expect(door.length).toBeGreaterThan(0);
  });
  it('de technische ruimte: alles langs de wanden van de berging, niets op elkaar, niet voor de deur', () => {
    const { plan } = voorbeeldWoning();
    const o = technischeOpstelling(plan, 'berging', tc, BERGING_OPSTELLING);
    expect(o.nietGeplaatst).toEqual([]);
    expect(o.toestellen.map((x) => x.type).sort()).toEqual([...BERGING_OPSTELLING].sort());
    const berging = plan.ruimtes.find((r) => r.id === 'berging')!;
    for (const x of o.toestellen) {
      for (const [px, py] of toestelVoetafdruk(x, tc.toestellen[x.type]!)) {
        expect(px >= berging.x + 4.9 && px <= berging.x + berging.b - 4.9 && py >= berging.y + 4.9 && py <= berging.y + berging.d - 4.9, x.type).toBe(true);
      }
      // De deur naar de inkom (linkerwand, y 250 tot 330) blijft vrij.
      const v = toestelVoetafdruk(x, tc.toestellen[x.type]!);
      const links = Math.min(...v.map((q) => q[0])) < berging.x + 10;
      if (links) expect(Math.min(...v.map((q) => q[1])) >= 345 || Math.max(...v.map((q) => q[1])) <= 235).toBe(true);
    }
    for (let i = 0; i < o.toestellen.length; i++) for (let j = i + 1; j < o.toestellen.length; j++) {
      const a = toestelVoetafdruk(o.toestellen[i]!, tc.toestellen[o.toestellen[i]!.type]!), b = toestelVoetafdruk(o.toestellen[j]!, tc.toestellen[o.toestellen[j]!.type]!);
      const ox = Math.min(...a.map((q) => q[0]).concat()) < Math.max(...b.map((q) => q[0])) && Math.min(...b.map((q) => q[0])) < Math.max(...a.map((q) => q[0]));
      const oy = Math.min(...a.map((q) => q[1])) < Math.max(...b.map((q) => q[1])) && Math.min(...b.map((q) => q[1])) < Math.max(...a.map((q) => q[1]));
      expect(ox && oy).toBe(false);
    }
    // Een te kleine ruimte: wat niet past, wordt gemeld.
    const klein = technischeOpstelling(plan, 'wc', tc, ['warmtepomp_binnen', 'boiler', 'ventilatie_d']);
    expect(klein.nietGeplaatst.length).toBeGreaterThan(0);
    expect(klein.meldingen[0]).toMatch(/Past niet langs de wanden van Wc/);
  });
  it('een lus vloerverwarming: banen op de tussenafstand, binnen de muren, en in stroken', () => {
    const plan = kamer();
    const lus = vloerverwarmingLus(plan, 'r1', { tussen: 15, rand: 15 });
    for (const [x, y] of lus) expect(x >= 30 - 0.01 && x <= 570.01 && y >= 30 - 0.01 && y <= 370.01).toBe(true);
    const ys = [...new Set(lus.map((p) => p[1]))];
    expect(ys[1]! - ys[0]!).toBe(15);
    const helft = vloerverwarmingLus(plan, 'r1', { strook: [0, 0.5] }), ander = vloerverwarmingLus(plan, 'r1', { strook: [0.5, 1] });
    expect(Math.max(...helft.map((p) => p[1]))).toBeLessThan(Math.min(...ander.map((p) => p[1])));
  });
});

describe('controles op de techniek (signalen, geen berekening)', () => {
  it('het uitgeruste voorbeeld heeft geen meldingen over techniek', () => {
    const { plan } = uitgerusteWoning();
    expect(techniekMeldingen(plan)).toEqual([]);
  });
  it('een buitenunit tegen de gevel zonder vrije ruimte, of binnen', () => {
    const tegen = metTechniek(kamer(), [t('airco_buiten', 'b', 300, 415 + 15, { draai: 0 })]);
    expect(techniekMeldingen(tegen).map((m) => m.melding)).toEqual([expect.stringMatching(/Airco buitenunit: te weinig vrije ruimte achter \(vraagt 15 cm\)/)]);
    const goed = metTechniek(kamer(), [tegenWand(kamer(), t('airco_buiten', 'b', 300, 470), tc.toestellen.airco_buiten!)!.toestel]);
    expect(techniekMeldingen(goed)).toEqual([]);
    const binnen = metTechniek(kamer(), [t('airco_buiten', 'b', 300, 200)]);
    expect(techniekMeldingen(binnen).map((m) => m.melding)).toContain('Airco buitenunit staat binnen, in Kamer; het hoort buiten.');
  });
  it('een toestel dat in een raam hangt, of niet tegen een wand', () => {
    // Airco binnenunit op 150 cm, recht onder het midden van het raam (90 tot 210 cm).
    const plan = kamer();
    const ac = tegenWand(plan, t('airco_wand', 'ac', 300, 40, { hoogte: 150 }), tc.toestellen.airco_wand!)!.toestel;
    expect(techniekMeldingen(metTechniek(plan, [ac])).map((m) => m.melding)).toEqual(['Airco binnenunit (wand) hangt in een raam. Verschuif het langs de muur of zet het hoger of lager.']);
    expect(techniekMeldingen(metTechniek(plan, [{ ...ac, x: 100 }]))).toEqual([]);
    // Een buitenunit voor de buitendeur (rechts, 150 tot 250 cm langs de muur).
    const wp = tegenWand(plan, t('warmtepomp_buiten', 'wp', 700, 200), tc.toestellen.warmtepomp_buiten!)!.toestel;
    expect(techniekMeldingen(metTechniek(plan, [wp])).map((m) => m.melding)).toEqual(['Warmtepomp buitenunit (lucht-water) staat voor een deur. Verschuif het langs de muur.']);
    expect(techniekMeldingen(metTechniek(plan, [t('stopcontact', 's', 300, 200)])).map((m) => m.melding)).toEqual(['Stopcontact hangt niet tegen een wand. Zet het tegen de dichtste wand.']);
  });
  it('een leiding die nergens begint of eindigt, of naar een toestel dat er niet meer is', () => {
    const plan = kamer();
    const s = tegenWand(plan, t('stopcontact', 's', 100, 380), tc.toestellen.stopcontact!)!.toestel;
    const los = metTechniek(plan, [s], [{ id: 'k', soort: 'kabel', punten: [[s.x, s.y], [300, 200]], hoogte: 'vloer' }]);
    expect(techniekMeldingen(los).map((m) => m.melding)).toEqual([expect.stringMatching(/^Kabel in buis \(kring\): het einde is nergens aangesloten/)]);
    const weg = metTechniek(plan, [s], [{ id: 'k', soort: 'kabel', punten: [[s.x, s.y], [300, 380]], hoogte: 'vloer', naar: 'bestaat-niet' }]);
    expect(techniekMeldingen(weg).map((m) => [m.ernst, m.melding])).toEqual([['fout', 'Kabel in buis (kring): het toestel aan het einde bestaat niet meer.']]);
    // Een afvoer mag buiten de woning eindigen (naar de riolering).
    const afvoer = metTechniek(kamer('badkamer'), [], [{ id: 'a', soort: 'afvoer', punten: [[300, 200], [300, 500]], hoogte: 'vloer' }]);
    expect(techniekMeldingen(afvoer).map((m) => m.melding)).toEqual([expect.stringMatching(/^Afvoer: het begin is nergens aangesloten/)]);
  });
  it('een natte ruimte zonder afvoer: alleen zodra er sanitair in het plan zit', () => {
    const plan = kamer('badkamer');
    const s = tegenWand(plan, t('stopcontact', 's', 100, 380), tc.toestellen.stopcontact!)!.toestel;
    expect(techniekMeldingen(metTechniek(plan, [s]))).toEqual([]);
    const kraan = tegenWand(plan, t('buitenkraan', 'k', 300, 430), tc.toestellen.buitenkraan!)!.toestel;
    expect(techniekMeldingen(metTechniek(plan, [s, kraan])).map((m) => m.melding)).toEqual(['Kamer: natte ruimte zonder afvoer (er loopt nog geen afvoerleiding).']);
    const metAfvoer = metTechniek(plan, [s, kraan], [{ id: 'a', soort: 'afvoer', punten: [[s.x, s.y], [300, 500]], hoogte: 'vloer' }]);
    expect(techniekMeldingen(metAfvoer)).toEqual([]);
  });
  it('een koelleiding langer dan de richtwaarde', () => {
    const plan = kamer();
    const ac = tegenWand(plan, t('airco_wand', 'ac', 100, 40), tc.toestellen.airco_wand!)!.toestel;
    const buiten = tegenWand(plan, t('airco_buiten', 'b', 100, 470), tc.toestellen.airco_buiten!)!.toestel;
    const lang = metTechniek(plan, [ac, buiten], [{ id: 'k', soort: 'koelleiding', punten: [[ac.x, ac.y], [-1000, ac.y], [-1000, buiten.y], [buiten.x, buiten.y]], hoogte: 225, van: 'ac', naar: 'b' }]);
    expect(techniekMeldingen(lang).map((m) => m.melding)).toEqual([expect.stringMatching(/m lang, meer dan 25 m \(de grootste lengte bij gewone toestellen\)\. Richtwaarde/)]);
  });
});

describe('3D: toestellen en leidingen, per vak, gewoon en uitgezet', () => {
  const { plan } = uitgerusteWoning();
  const codes = (b: Blok[]) => b.map((x) => x.code);
  it('per vak aan of uit; het kader (de camera) blijft dat van de woning', () => {
    const zonder = plattegrond3D(plan, cat);
    const alles = plattegrond3D(plan, cat, { techniek: {} });
    const vent = plattegrond3D(plan, cat, { techniek: { vakken: ['ventilatie'] } });
    expect(alles.kader).toEqual(zonder.kader);
    expect(alles.blokken.slice(0, zonder.blokken.length)).toEqual(zonder.blokken);
    const ventToestellen = new Set(vent.blokken.filter((b) => b.code.startsWith('toestel_')).map((b) => b.code.split('_')[1]));
    expect([...ventToestellen].every((id) => tc.toestellen[plan.toestellen!.find((x) => x.id === id)!.type]!.vak === 'ventilatie')).toBe(true);
    expect(ventToestellen.size).toBe(plan.toestellen!.filter((x) => tc.toestellen[x.type]!.vak === 'ventilatie').length);
    expect(vent.blokken.length).toBeLessThan(alles.blokken.length);
  });
  it('de uitgezette weergave: vloeren, lage wanden en de omtrek op plafondhoogte; geen dak, ramen of meubels', () => {
    const s = plattegrond3D(plan, cat, { techniek: { weergave: 'uitgezet' }, inhoud: () => undefined, aanleg: true });
    const c = codes(s.blokken);
    expect(c.some((x) => x.startsWith('uitgezet_wand_'))).toBe(true);
    expect(c.some((x) => x.startsWith('uitgezet_lijn_'))).toBe(true);
    expect(c.filter((x) => /^(muur_|dak|plaat_|terras_|pad_|m\d+_)/.test(x))).toEqual([]);
    // De omtrek op plafondhoogte alleen langs de buitenmuren.
    const buiten = new Set(murenVan(niveauPlan(plan, 0)).filter((m) => m.soort === 'buiten').map((m) => m.id));
    expect(c.filter((x) => x.startsWith('uitgezet_lijn_0_')).every((x) => buiten.has(x.slice('uitgezet_lijn_0_'.length)))).toBe(true);
    // Lage wanden zijn 12 cm hoog.
    expect(Math.max(...s.blokken.filter((b) => b.code.startsWith('uitgezet_wand_0_')).map((b) => b.h))).toBe(12);
    // Wat in de vloer zit, ligt zichtbaar op de vloer (boven het maaiveld).
    const vloer = plan.leidingen!.filter((l) => l.hoogte === 'vloer' && (l.niveau ?? 0) === 0 && !l.hoogtes).map((l) => `leiding_${l.id}_`);
    const vloerBlokken = s.blokken.filter((b) => vloer.some((v) => b.code.startsWith(v)));
    expect(vloerBlokken.length).toBeGreaterThan(0);
    expect(Math.min(...vloerBlokken.map((b) => b.y))).toBeGreaterThanOrEqual(0);
  });
  it('één verdieping: niets steekt boven of onder de getoonde verdieping uit', () => {
    const gv = plattegrond3D(plan, cat, { techniek: { weergave: 'uitgezet', niveau: 0 } });
    const leidingen = gv.blokken.filter((b) => b.code.startsWith('leiding_'));
    expect(Math.max(...leidingen.map((b) => b.y + b.h))).toBeLessThanOrEqual(vloerHoogte(plan, 1) + 10);
    const v1 = plattegrond3D(plan, cat, { techniek: { weergave: 'uitgezet', niveau: 1 } });
    expect(Math.min(...v1.blokken.filter((b) => b.code.startsWith('leiding_')).map((b) => b.y))).toBeGreaterThanOrEqual(vloerHoogte(plan, 1) - 30 - 10);
  });
  it('kleine toestellen zijn in de uitgezette weergave groter en in de kleur van hun vak; de achterkant blijft tegen de wand', () => {
    const s = plan.toestellen!.find((x) => x.type === 'stopcontact_dubbel')!, ty = tc.toestellen[s.type]!;
    const gewoon = toestelBlokken(s, ty, 0, 270, 'x'), groot = toestelBlokken(s, ty, 0, 270, 'x', true);
    const breedte = (b: Blok[]) => Math.max(...b.map((x) => Math.max(x.b, x.d)));
    expect(breedte(gewoon)).toBe(15);
    expect(breedte(groot)).toBeCloseTo(20, 1);
    expect(groot[0]!.kleur).toBe('#6a2fa0');
    // De achterkant (de plaat) raakt nog altijd het muurvlak.
    const [vx, vy] = voorRichting(s.draai);
    const achter = (b: Blok[]) => Math.min(...b.map((x) => (x.x + x.b / 2 - s.x) * vx + (x.z + x.d / 2 - s.y) * vy - (Math.abs(vx) > 0.5 ? x.b : x.d) / 2));
    expect(achter(groot)).toBeCloseTo(achter(gewoon), 1);
  });
  it('aantikken: elk blok van de techniek zegt bij welk toestel of welke leiding het hoort', () => {
    const s = plattegrond3D(plan, cat, { techniek: {}, dingen: true });
    expect(s.blokken.filter((b) => b.code.includes('toestel_t1_')).every((b) => b.code.startsWith('toestel:t1.'))).toBe(true);
    expect(s.blokken.some((b) => b.code.startsWith('leiding:l1.'))).toBe(true);
  });
});

describe('tekening: een teken per toestel en een gekleurde lijn per leiding, per vak', () => {
  const { plan } = uitgerusteWoning();
  const gv = niveauPlan(plan, 0);
  it('alle toestellen en leidingen van de verdieping, of alleen die van één vak', () => {
    const svg = tekenPlattegrond(gv, cat, { techniek: true });
    expect(svg.match(/data-soort="toestel"/g)!.length).toBe(gv.toestellen!.length);
    expect(svg.match(/data-soort="leiding"/g)!.length).toBe(gv.leidingen!.length);
    expect(svg).toContain(`stroke="${tc.leidingen.koelleiding!.kleur}"`);
    const elek = tekenPlattegrond(gv, cat, { techniek: ['elektriciteit'] });
    expect(elek.match(/data-soort="toestel"/g)!.length).toBe(gv.toestellen!.filter((x) => tc.toestellen[x.type]!.vak === 'elektriciteit').length);
    expect(elek).not.toContain(`stroke="${tc.leidingen.koelleiding!.kleur}"`);
    expect(tekenPlattegrond(gv, cat)).not.toContain('data-soort="toestel"');
  });
  it('het kader omvat wat buiten de woning staat (de buitenunit van de warmtepomp)', () => {
    const svg = tekenPlattegrond(gv, cat, { techniek: true });
    const [, , , d] = /viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/.exec(svg)!.slice(1).map(Number);
    const [, y] = /viewBox="([-\d.]+) ([-\d.]+)/.exec(svg)!.slice(1).map(Number);
    const wp = gv.toestellen!.find((x) => x.type === 'warmtepomp_buiten')!;
    expect(y! + d!).toBeGreaterThan(wp.y + toestelMaten(tc.toestellen.warmtepomp_buiten!, 'buiten').d / 2);
  });
});
