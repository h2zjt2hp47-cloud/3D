/**
 * De techniek binnen in de afgewerkte woning (ronde 17, 17/11): de toestellen op hun plaats en echte maat, in hun eigen
 * kleur, zonder merkteken en zonder leidingen (`Plan3DOpties.techniekBinnen`); met lage muren een stukje muur achter wat
 * boven de snijhoogte aan de muur hangt en niets aan het plafond; van binnen (`ruimteVanBinnen`, optie `techniek`); de
 * codes die de kijker herkent (`isBinnenTechniek`).
 */
import { describe, expect, it } from 'vitest';
import {
  heeftTechniekBinnen, isBinnenTechniek, leesPakket3D, murenVan, muurVanOpening, niveauPlan, plattegrond3D, ruimteOp, ruimteVanBinnen, standaardDak,
  techniekBinnenBlokken, toestelBlokken, toestelBuiten, toestelMaten, voorRichting, BINNEN_TECHNIEK, PAKKET3D_SOORT, PAKKET3D_VERSIE, PLAFOND_DIKTE,
  STUKJE_MUUR, TECHNIEK_VAKKEN, type Blok, type Plattegrond, type Toestel,
} from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { techniekPlanCatalogus as cat, uitgerusteWoning } from '../voorbeelden/techniekwoning.js';
import { uitbouwVoorbeeld } from '../voorbeelden/uitbouwvoorbeeld.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

const LAAG = 110;
const idVan = (b: { code: string }) => /^toestel:([^.]+)\./.exec(b.code)?.[1];
const binnen = (blokken: Blok[]) => blokken.filter((b) => isBinnenTechniek(b.code));
const top = (bl: Blok[]) => Math.max(...bl.map((b) => b.y + b.h));

describe('techniek binnen in de afgewerkte woning (techniekBinnen)', () => {
  it('een plan zonder techniek verandert niet, met welke opties ook', () => {
    const { plan } = voorbeeldWoning();
    for (const o of [{}, { aanleg: true, gevelkoppen: true, dingen: true, meubels: true, techniekBuiten: true, verlichting: true }, { laag: LAAG, totNiveau: 0 }, { lichtinval: true, aanleg: true }, { totNiveau: 0 }]) {
      expect(plattegrond3D(plan, cat, { ...o, techniekBinnen: true })).toEqual(plattegrond3D(plan, cat, o));
      expect(plattegrond3D({ ...plan, dak: standaardDak() }, cat, { ...o, techniekBinnen: true })).toEqual(plattegrond3D({ ...plan, dak: standaardDak() }, cat, o));
    }
    expect(heeftTechniekBinnen(plan)).toBe(false);
    for (const r of plan.ruimtes) expect(ruimteVanBinnen(plan, cat, r.id, { techniek: true, dingen: true })).toEqual(ruimteVanBinnen(plan, cat, r.id, { dingen: true }));
  });

  it('zonder de optie, zonder catalogus of met de techniek aan: de blokken van vroeger', () => {
    const { plan } = uitgerusteWoning();
    const o = { aanleg: true, gevelkoppen: true, dingen: true, techniekBuiten: true };
    expect(plattegrond3D(plan, { ...planCatalogus, techniek: undefined }, { ...o, techniekBinnen: true })).toEqual(plattegrond3D(plan, { ...planCatalogus, techniek: undefined }, o));
    for (const weergave of ['gewoon', 'uitgezet'] as const) {
      expect(plattegrond3D(plan, cat, { ...o, techniek: { weergave }, techniekBinnen: true })).toEqual(plattegrond3D(plan, cat, { ...o, techniek: { weergave } }));
    }
    // Met de optie komen er alleen blokken bij, achteraan, en alleen van de techniek binnen; het kader blijft.
    for (const extra of [{}, { laag: LAAG, totNiveau: 0 }, { verlichting: true }, { lichtinval: true }]) {
      const zonder = plattegrond3D(plan, cat, { ...o, ...extra }), met = plattegrond3D(plan, cat, { ...o, ...extra, techniekBinnen: true });
      expect(met.kader).toEqual(zonder.kader);
      const nieuw = met.blokken.filter((b) => !isBinnenTechniek(b.code));
      expect(nieuw).toEqual(zonder.blokken);
      expect(binnen(met.blokken).length).toBeGreaterThan(0);
    }
  });

  it('alle toestellen binnen, op hun echte maat en in hun eigen kleur, zonder merkteken of leidingen; buiten niet dubbel', () => {
    const { plan } = uitgerusteWoning();
    expect(heeftTechniekBinnen(plan)).toBe(true);
    const s = plattegrond3D(plan, cat, { dingen: true, techniekBinnen: true, techniekBuiten: true, meubels: true });
    const bl = binnen(s.blokken);
    const binnenIds = plan.toestellen!.filter((t) => !toestelBuiten(plan, t)).map((t) => t.id).sort();
    // Met het dak erop is er overal een plafond: alles binnen is er (72 van de 78; de andere zes staan buiten).
    expect([...new Set(bl.map(idVan))].sort()).toEqual(binnenIds);
    expect(binnenIds.length).toBe(72);
    // Niets van wat buiten staat, komt er een tweede keer bij.
    for (const t of plan.toestellen!.filter((x) => toestelBuiten(plan, x))) expect(bl.some((b) => idVan(b) === t.id)).toBe(false);
    // Geen merkteken, geen leidingen, geen kleuren van de vakken (die zijn voor de installateur).
    const vakkleuren = new Set(Object.values(TECHNIEK_VAKKEN).map((v) => v.kleur));
    expect(bl.some((b) => /merk|leiding/.test(b.code))).toBe(false);
    expect(s.blokken.some((b) => b.code.startsWith('leiding:') || /^leiding_/.test(b.code))).toBe(false);
    expect(bl.some((b) => vakkleuren.has(b.kleur))).toBe(false);
    // De echte maat: een radiator is 100 × 60 cm, een stopcontact een plaatje van 8 × 8.
    const rad = plan.toestellen!.find((t) => t.type === 'radiator')!;
    const radBl = bl.filter((b) => idVan(b) === rad.id);
    expect(Math.round(top(radBl) - Math.min(...radBl.map((b) => b.y)))).toBe(60);
  });

  it('wat in de muur of het plafond zit, zakt erin (inbouw): een stopcontact steekt 1,2 cm uit, een spot een paar mm met zijn rand', () => {
    const { plan } = uitgerusteWoning();
    const tc = cat.techniek!;
    const t = plan.toestellen!.find((x) => x.type === 'stopcontact_dubbel' && (x.niveau ?? 0) === 0 && x.draai === 0)!;
    const type = tc.toestellen[t.type]!;
    const bl = techniekBinnenBlokken({ ...plan, toestellen: [t] }, cat, { laatste: 1, dakErop: true });
    const plaat = bl.find((b) => b.code.endsWith('_plaat'))!;
    // Draai 0: de voorkant kijkt naar +y (z in de 3D); de achterkant lag op het muurvlak (midden − d/2).
    const muurvlak = t.y - type.d / 2;
    expect(plaat.z).toBeCloseTo(muurvlak - type.inbouw!, 5);
    expect(plaat.z + plaat.d - muurvlak).toBeCloseTo(type.d - type.inbouw!, 5);
    expect(type.d - type.inbouw!).toBeCloseTo(1.2, 5);
    // Zonder inbouw (een radiator) precies `toestelBlokken`.
    const rad = plan.toestellen!.find((x) => x.type === 'radiator')!;
    const radBl = techniekBinnenBlokken({ ...plan, toestellen: [rad] }, cat, { laatste: 1, dakErop: true });
    expect(radBl.map((b) => ({ ...b, code: b.code.replace(`${BINNEN_TECHNIEK}_`, 'toestel_') }))).toEqual(toestelBlokken(rad, tc.toestellen.radiator!, 300, plan.muurhoogte, `toestel_${rad.id}`));
    // Een inbouwspot: de rand steekt 0,3 cm onder het plafond uit.
    const spot = plan.toestellen!.find((x) => x.type === 'inbouwspot')!;
    const spotBl = techniekBinnenBlokken({ ...plan, toestellen: [spot] }, cat, { laatste: 1, dakErop: true });
    const rand = spotBl.find((b) => b.code.endsWith('_rand'))!;
    expect(rand.y).toBeCloseTo(plan.muurhoogte - 0.3, 5);
  });

  it('muren laag: niets aan het plafond van de bovenste verdieping; een verdieping zonder dak erop ook niet', () => {
    const { plan } = uitgerusteWoning();
    const laag = binnen(plattegrond3D(plan, cat, { dingen: true, laag: LAAG, totNiveau: 0, techniekBinnen: true }).blokken);
    const aanPlafond = new Set(plan.toestellen!.filter((t) => t.aan === 'plafond' && (t.niveau ?? 0) === 0).map((t) => t.id));
    expect(aanPlafond.size).toBeGreaterThan(5);
    expect(laag.some((b) => aanPlafond.has(idVan(b)!))).toBe(false);
    // Verdieping 1 niet (totNiveau 0).
    expect(laag.some((b) => plan.toestellen!.find((t) => t.id === idVan(b))?.niveau === 1)).toBe(false);
    // Tot en met het gelijkvloers zonder lage muren: de vloerplaat erboven ontbreekt niet, maar het gelijkvloers is de
    // bovenste getoonde verdieping zonder dak: ook dan niets aan zijn plafond.
    const open = binnen(plattegrond3D(plan, cat, { dingen: true, totNiveau: 0, techniekBinnen: true }).blokken);
    expect(open.some((b) => aanPlafond.has(idVan(b)!))).toBe(false);
    // Met de hele woning en het dak: wel, en ook op het gelijkvloers onder de verdieping.
    const vol = binnen(plattegrond3D(plan, cat, { dingen: true, techniekBinnen: true }).blokken);
    expect([...aanPlafond].every((id) => vol.some((b) => idVan(b) === id))).toBe(true);
    // Met lage muren op verdieping 1: het gelijkvloers eronder heeft zijn plafond (de vloerplaat).
    const boven = binnen(plattegrond3D(plan, cat, { dingen: true, laag: LAAG, totNiveau: 1, techniekBinnen: true }).blokken);
    expect([...aanPlafond].every((id) => boven.some((b) => idVan(b) === id))).toBe(true);
  });

  it('muren laag: wat boven de snijhoogte aan de muur hangt, krijgt een stukje muur erachter (niet over een opening)', () => {
    const { plan } = uitgerusteWoning();
    const tc = cat.techniek!;
    const bl = binnen(plattegrond3D(plan, cat, { dingen: true, laag: LAAG, totNiveau: 0, techniekBinnen: true }).blokken);
    const stukjes = bl.filter((b) => b.code.includes(`${BINNEN_TECHNIEK}_muur_`));
    expect(stukjes.length).toBeGreaterThan(5);
    const p0 = niveauPlan(plan, 0), muren = murenVan(p0);
    const hoog = plan.toestellen!.filter((t) => (t.niveau ?? 0) === 0 && t.aan === 'wand' && !toestelBuiten(plan, t) && t.hoogte + toestelMaten(tc.toestellen[t.type]!, t.aan).h > LAAG);
    // De schakelaars (106 tot 114 cm), de stopcontacten boven het werkblad, de thermostaat, de airco, de kasten.
    expect(new Set(hoog.map((t) => t.type))).toEqual(new Set(['schakelaar', 'stopcontact_werkblad', 'thermostaat', 'airco_wand', 'tellerkast', 'verdeelbord']));
    for (const t of hoog) {
      // Het toestel staat er, en een stukje muur bedekt zijn breedte, van de snijhoogte tot boven het toestel.
      const eigen = bl.filter((b) => idVan(b) === t.id && !b.code.includes('_muur_'));
      expect(eigen.length, t.id).toBeGreaterThan(0);
      const [vx, vy] = voorRichting(t.draai), m3 = toestelMaten(tc.toestellen[t.type]!, t.aan);
      const achter = [t.x - vx * (m3.d / 2 + 1), t.y - vy * (m3.d / 2 + 1)] as const;
      const dekt = stukjes.find((s) => achter[0] >= s.x - 0.01 && achter[0] <= s.x + s.b + 0.01 && achter[1] >= s.z - 0.01 && achter[1] <= s.z + s.d + 0.01);
      expect(dekt, t.id).toBeDefined();
      expect(dekt!.y).toBe(LAAG);
      expect(dekt!.y + dekt!.h).toBeGreaterThanOrEqual(top(eigen) + STUKJE_MUUR.boven - 0.01);
    }
    // Geen twee stukjes die elkaar overlappen (vlakken op elkaar flikkeren), geen stukje over een opening.
    for (const [i, a] of stukjes.entries()) for (const b of stukjes.slice(i + 1)) {
      const overlap = Math.min(a.x + a.b, b.x + b.b) - Math.max(a.x, b.x) > 0.01 && Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z) > 0.01;
      expect(overlap).toBe(false);
    }
    for (const o of p0.openingen) {
      const m = muurVanOpening(o, muren)!;
      const [a0, a1] = [o.midden - o.breedte / 2, o.midden + o.breedte / 2];
      for (const s of stukjes) {
        const [s0, s1] = m.as === 'h' ? [s.x, s.x + s.b] : [s.z, s.z + s.d];
        const opLijn = m.as === 'h' ? s.z <= m.lijn + m.dikte / 2 && s.z + s.d >= m.lijn - m.dikte / 2 : s.x <= m.lijn + m.dikte / 2 && s.x + s.b >= m.lijn - m.dikte / 2;
        if (opLijn) expect(Math.min(s1, a1) - Math.max(s0, a0) > 0.5, `${s.code} over ${o.id}`).toBe(false);
      }
    }
    // Een buitenmuur alleen met haar binnenblad: de gevel blijft op de snijhoogte (geen schoorsteen van baksteen).
    const airco = plan.toestellen!.find((t) => t.type === 'airco_wand')!;
    const achterAirco = stukjes.find((s) => idVan(s) === airco.id)!;
    expect(Math.min(achterAirco.b, achterAirco.d)).toBe(STUKJE_MUUR.binnenblad);
    expect(Object.keys(achterAirco.zijden ?? {})).toEqual(['z-']);
    // Alle stukjes horen bij een toestel binnen (een tik erop kiest dat toestel).
    for (const s of stukjes) expect(plan.toestellen!.some((t) => t.id === idVan(s))).toBe(true);
  });

  it('muren laag, andere manieren: tot het plafond of weg', () => {
    const { plan } = uitgerusteWoning();
    const o = { laag: LAAG, laatste: 0, dakErop: false, dingen: true };
    const tot = techniekBinnenBlokken(plan, cat, { ...o, boven: 'plafond' }).filter((b) => b.code.includes('_muur_'));
    expect(tot.every((b) => b.y + b.h === plan.muurhoogte)).toBe(true);
    const weg = techniekBinnenBlokken(plan, cat, { ...o, boven: 'weg' });
    expect(weg.some((b) => b.code.includes('_muur_'))).toBe(false);
    expect(weg.filter((b) => plan.toestellen!.find((t) => t.id === idVan(b))?.aan === 'wand').every((b) => b.y + b.h <= LAAG + 0.5)).toBe(true);
  });

  it('bij nacht gloeien de lampen binnen, zonder echt licht (dat zou door de muren schijnen)', () => {
    const { plan } = uitgerusteWoning();
    const extra: Toestel = { id: 'wl', type: 'wandlamp', x: 400, y: 17, hoogte: 180, draai: 0, aan: 'wand' };
    const p: Plattegrond = { ...plan, toestellen: [...plan.toestellen!, extra] };
    const bl = binnen(plattegrond3D(p, cat, { dingen: true, techniekBinnen: true, verlichting: true }).blokken);
    const gloeit = bl.filter((b) => b.licht);
    expect(gloeit.length).toBeGreaterThan(10);
    expect(gloeit.some((b) => idVan(b) === 'wl')).toBe(true);
    expect(gloeit.every((b) => b.licht!.bereik === undefined && b.licht!.vanaf === undefined)).toBe(true);
    // Zonder verlichting geen licht.
    expect(binnen(plattegrond3D(p, cat, { dingen: true, techniekBinnen: true }).blokken).some((b) => b.licht)).toBe(false);
  });

  it('de codes: de kijker herkent ze met en zonder dingen; het pakket houdt ze', () => {
    expect(isBinnenTechniek('binnentechniek_t3_plaat')).toBe(true);
    expect(isBinnenTechniek('toestel:t3.binnentechniek_t3_plaat')).toBe(true);
    expect(isBinnenTechniek('toestel:t3.binnentechniek_muur_h380_0_0')).toBe(true);
    expect(isBinnenTechniek('toestel:t57.toestel_t57_kast')).toBe(false);
    expect(isBinnenTechniek('muur_h380_0')).toBe(false);
    const { plan } = uitgerusteWoning();
    const zonder = plattegrond3D(plan, cat, { techniekBinnen: true });
    expect(binnen(zonder.blokken).length).toBeGreaterThan(0);
    expect(zonder.blokken.some((b) => b.code.startsWith('toestel:'))).toBe(false);
    const pakket = {
      soort: PAKKET3D_SOORT, versie: PAKKET3D_VERSIE, gemaakt: '2026-11-17T12:00:00.000Z', project: { nummer: 'x', naam: 'x' },
      woning: [{ naam: 'Gelijkvloers', scene: zonder, laag: plattegrond3D(plan, cat, { laag: LAAG, totNiveau: 0, techniekBinnen: true }) }], posities: [],
    };
    const gelezen = leesPakket3D(JSON.parse(JSON.stringify(pakket)));
    expect(PAKKET3D_VERSIE).toBe(4);
    expect(binnen(gelezen.woning[0]!.laag.blokken).length).toBe(binnen(pakket.woning[0]!.laag.blokken).length);
  });
});

describe('techniek van binnen (ruimteVanBinnen, optie techniek)', () => {
  it('de toestellen van de ruimte, niet die aan de open kant, wat aan het plafond hangt onder het plafond', () => {
    const { plan } = uitgerusteWoning();
    const tc = cat.techniek!;
    for (const id of ['keuken', 'leef', 'slk3']) {
      const r = plan.ruimtes.find((x) => x.id === id)!;
      const zonder = ruimteVanBinnen(plan, cat, id, { dingen: true })!;
      const met = ruimteVanBinnen(plan, cat, id, { dingen: true, techniek: true })!;
      expect(met.kader).toEqual(zonder.kader);
      expect(met.blokken.filter((b) => !isBinnenTechniek(b.code))).toEqual(zonder.blokken);
      const ids = new Set(binnen(met.blokken).map(idVan));
      const hier = plan.toestellen!.filter((t) => (t.niveau ?? 0) === (r.niveau ?? 0) && !toestelBuiten(plan, t) && ruimteOp(plan, t.x, t.y, r.niveau ?? 0)?.id === id);
      // De open kant is standaard de onderkant: wat daar aan de muur hangt (voorkant naar boven, draai 180), valt weg.
      for (const t of hier) expect(ids.has(t.id), `${id} ${t.id}`).toBe(!(t.aan === 'wand' && t.draai === 180));
      expect(ids.size).toBeGreaterThan(0);
      // Aan het plafond: de bovenkant net boven de onderkant van het plafond (de inbouw), niet erin verstopt.
      const onder = plan.muurhoogte - PLAFOND_DIKTE;
      for (const t of hier.filter((x) => x.aan === 'plafond')) {
        const bl = binnen(met.blokken).filter((b) => idVan(b) === t.id);
        expect(Math.max(...bl.map((b) => b.y + b.h)), t.id).toBeCloseTo(onder + (tc.toestellen[t.type]!.inbouw ?? 0), 1);
      }
    }
  });

  it('een verlaagd plafond: de spots hangen eronder', () => {
    const { plan } = uitgerusteWoning();
    const verlaagd = Object.entries(cat.plafonds ?? {}).find(([, p]) => p.verlaagd)!;
    const p: Plattegrond = { ...plan, ruimtes: plan.ruimtes.map((r) => (r.id === 'keuken' ? { ...r, plafond: verlaagd[0] } : r)) };
    const spot = plan.toestellen!.find((t) => t.type === 'inbouwspot')!;
    const bl = binnen(ruimteVanBinnen(p, cat, 'keuken', { dingen: true, techniek: true })!.blokken).filter((b) => idVan(b) === spot.id);
    const onder = plan.muurhoogte - verlaagd[1].verlaagd! - PLAFOND_DIKTE;
    expect(Math.max(...bl.map((b) => b.y + b.h))).toBeCloseTo(onder + 1.2, 1);
  });

  it('de uitbouw: verdeelbord, stopcontacten, schakelaars en spots in de uitbouw; de buitenkraan blijft buiten', () => {
    const { plan } = uitbouwVoorbeeld();
    const bl = binnen(plattegrond3D(plan, cat, { dingen: true, techniekBinnen: true, techniekBuiten: true }).blokken);
    const types = new Set(bl.map((b) => plan.toestellen!.find((t) => t.id === idVan(b))?.type));
    expect(types).toEqual(new Set(['verdeelbord', 'stopcontact_dubbel', 'stopcontact', 'schakelaar', 'inbouwspot']));
  });
});
