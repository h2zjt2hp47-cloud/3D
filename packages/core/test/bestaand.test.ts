/**
 * Ronde 11: de bestaande toestand (`Ruimte.bestaand`), tegen de buren (`Plattegrond.tegenBuren`), de posten van het werk
 * (`postenVan`) en het voorbeeldproject *Uitbouw achter een rijwoning*. Een plan zonder deze vlaggen verandert niet: dat
 * bewaken de vingerafdrukken in dak.test.ts en schuin-bestaand.test.ts; hier nog eens rechtstreeks.
 */
import { describe, expect, it } from 'vitest';
import {
  constructie3D, controleerPlan, gevelAanzichten, gevelOppervlaktes, heeftBestaand, klantPosten, muurStatus, murenVan, niveauPlan, nieuweTechniek,
  plattegrond3D, POST_GROEPEN, postenTekst, postenVan, postenVanDing, tekenDoorsnede, tekenPlattegrond, telTechniek, woningConstructie, woningMeetstaat,
  woningStabiliteit, woningWarmte, type Plattegrond,
} from '../src/index.js';
import { planCatalogus, planNaarRegels } from '../voorbeelden/inrichting.js';
import { woningOpbouwCatalogus } from '../voorbeelden/woningopbouw.js';
import { aanbouwKeuzes, aanbouwNaarPlan, bestaandeWoning } from '../voorbeelden/snelstart.js';
import { stijlCatalogus } from '../voorbeelden/stijlen.js';
import { uitbouwVoorbeeld } from '../voorbeelden/uitbouwvoorbeeld.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';
import { warmtewaarden } from '../voorbeelden/warmtewaarden.js';
import { stabiliteitswaarden } from '../voorbeelden/stabiliteitswaarden.js';
import { berekenRaam } from '../voorbeelden/raam.js';

const cat = { ...planCatalogus, opbouw: woningOpbouwCatalogus };
const ALLES = { vloeren: true, wanden: true, binnendeuren: true, ruwbouw: true, inrichting: true, gevel: true, dak: true };
/** Hetzelfde plan zonder de vlaggen van ronde 11. */
function zonderVlaggen(plan: Plattegrond): Plattegrond {
  const p = structuredClone(plan);
  for (const r of p.ruimtes) delete r.bestaand;
  delete p.tegenBuren;
  return p;
}
const aanbouw = (buren?: string) => aanbouwNaarPlan({ ...aanbouwKeuzes({ breedte: 5000, diepte: 4000, hoogte: 3000 }, stijlCatalogus.hout!), ...(buren ? { buren } : {}) });

describe('bestaand en tegen de buren: een plan zonder vlaggen blijft zoals het was', () => {
  it('de voorbeeldwoning heeft geen bestaande ruimte of buren, en rekent zoals vroeger', () => {
    const { plan } = voorbeeldWoning();
    expect(heeftBestaand(plan)).toBe(false);
    expect(murenVan(plan).every((m) => muurStatus(plan, m) === 'nieuw')).toBe(true);
    expect(nieuweTechniek(plan)).toBe(plan);
  });
});

describe('de bestaande woning (aanbouwNaarPlan zet de vlag)', () => {
  const { plan } = aanbouw();
  const kaal = zonderVlaggen(plan);
  it('de bestaande woning is bestaand, de uitbouw niet; de muur ertussen is de bestaande gevel', () => {
    expect(plan.ruimtes.filter((r) => r.bestaand).map((r) => r.id)).toEqual(['bestaand', 'bestaand1']);
    const tussen = murenVan(niveauPlan(plan, 0)).find((m) => m.soort === 'binnen')!;
    expect(muurStatus(plan, tussen)).toBe('bestaand');
    expect(plan.tegenBuren).toBeUndefined();
  });
  it('3D: zelfde blokken op dezelfde plaats en zelfde kader; alleen de kleur van wat bestaat is neutraal', () => {
    const a = plattegrond3D(plan, cat, { aanleg: true, dingen: true }), b = plattegrond3D(kaal, cat, { aanleg: true, dingen: true });
    expect(a.kader).toEqual(b.kader);
    const plaats = (s: typeof a) => s.blokken.map((x) => `${x.code}|${x.x}|${x.y}|${x.z}|${x.b}|${x.h}|${x.d}`).sort();
    // Het platte dak van een bestaande ruimte heet anders (een eigen laag); hier is er geen (de bestaande woning heeft een zadeldak).
    expect(plaats(a)).toEqual(plaats(b));
    const muur = a.blokken.find((x) => x.code.startsWith('gevel:bestaand:boven.'))!;
    expect(muur.zijden?.['z-']).toEqual({ soort: 'gevel', kleur: '#dad7d0' });
  });
  it('meetstaat, constructie, EPB en stabiliteit tellen alleen de uitbouw', () => {
    const c = woningConstructie(plan, cat), k = woningConstructie(kaal, cat);
    expect(c.delen.every((d) => !d.ding || !d.ding.includes('bestaand'))).toBe(true);
    expect(c.delen.length).toBeLessThan(k.delen.length);
    expect(c.stukken.some((s) => s.blokken.some((b) => b.code.startsWith('bestaand_')))).toBe(true);
    const m2 = (p: Plattegrond) => woningMeetstaat(p, cat).filter((r) => r.m2).reduce((t, r) => t + (r.m2 ?? 0), 0);
    expect(m2(plan)).toBeLessThan(m2(kaal) / 2);
    expect(woningWarmte(plan, cat, warmtewaarden).every((w) => w.m2 < 40)).toBe(true);
    expect(woningStabiliteit(plan, cat, stabiliteitswaarden).every((s) => !/Bestaande/.test(s.wat))).toBe(true);
    // De constructie toont de bestaande woning effen (geen skelet), de doorsnede als "Bestaand".
    expect(constructie3D(plan, cat).blokken.some((b) => b.code.startsWith('bestaand_wand_'))).toBe(true);
    expect(tekenDoorsnede(plan, cat, { richting: 'dwars', plaats: 250 })).toContain('Bestaand');
  });
  it('gevels en overzicht: wat bestaat telt niet mee; de tekening noemt het "bestaand"', () => {
    expect(gevelOppervlaktes(plan).map((g) => g.sleutel).sort()).toEqual(['uitbouw:links', 'uitbouw:onder', 'uitbouw:rechts']);
    const regels = planNaarRegels(plan, ALLES, cat), kale = planNaarRegels(kaal, ALLES, cat);
    expect(regels.find((r) => r.code === 'vloer:parket_eik')).toBeUndefined();
    expect(kale.find((r) => r.code === 'vloer:parket_eik')).toBeDefined();
    expect(regels.some((r) => r.code.startsWith('dak:hellend'))).toBe(false);
    expect(regels.find((r) => r.code === 'meubel:trap')).toBeUndefined();
    expect(tekenPlattegrond(niveauPlan(plan, 0), cat)).toContain('bestaand (blijft)');
    // De controles op daglicht gaan niet over de bestaande woning.
    expect(controleerPlan(plan, cat).some((m) => m.ruimte === 'bestaand' || m.ruimte === 'bestaand1')).toBe(false);
  });
  it('bestaandeWoning houdt de vlag', () => {
    const { plan: b } = bestaandeWoning(aanbouwKeuzes({ breedte: 5000, diepte: 4000, hoogte: 3000 }, stijlCatalogus.hout!));
    expect(b.ruimtes.every((r) => r.bestaand)).toBe(true);
  });
});

describe('tegen de buren', () => {
  const { plan } = aanbouw('twee');
  it('de zijmuren van de bestaande woning en de uitbouw staan tegen de buren, met een volume erachter na het kader', () => {
    expect(plan.tegenBuren?.sort()).toEqual(['bestaand1:links', 'bestaand1:rechts', 'bestaand:links', 'bestaand:rechts', 'uitbouw:links', 'uitbouw:rechts']);
    const met = plattegrond3D(plan, cat, { aanleg: true }), zonder = plattegrond3D({ ...plan, tegenBuren: undefined }, cat, { aanleg: true });
    expect(met.kader).toEqual(zonder.kader);
    const buren = met.blokken.filter((b) => b.code.startsWith('buren_'));
    // Links en rechts: twee verdiepingen naast de bestaande woning (met de vorm van de topgevel), één naast de uitbouw.
    expect(buren.length).toBe(8);
    expect(buren.some((b) => b.vorm === 'prisma')).toBe(true);
    expect(met.blokken.length).toBe(zonder.blokken.length + buren.length);
    // Met de lichtinval werpen ze schaduw, maar staan ze er niet dubbel.
    const licht = plattegrond3D(plan, cat, { aanleg: true, lichtinval: true, laag: 110 });
    expect(licht.blokken.filter((b) => b.code.startsWith('buren_')).length).toBeGreaterThan(0);
    expect(licht.blokken.filter((b) => b.code.startsWith('schaduw_buren_')).length).toBeGreaterThan(0);
  });
  it('niet gebouwd: niet in de gevel, de meetstaat of de constructie', () => {
    expect(gevelOppervlaktes(plan).map((g) => g.sleutel)).toEqual(['uitbouw:onder']);
    expect(woningConstructie(plan, cat).delen.filter((d) => d.plaats === 'buitenwand').map((d) => d.ding)).toEqual(['gevel:uitbouw:onder']);
    // In het gevelaanzicht neutraal, zonder sokkel.
    const links = gevelAanzichten(plan, undefined, cat).find((g) => g.kant === 'links')!;
    expect(links.tekening.vormen.filter((v) => v.code.startsWith('muur.')).every((v) => v.vulling === '#c9c6bf')).toBe(true);
  });
});

describe('posten van het werk: het voorbeeldproject', () => {
  const { plan, posities, werken } = uitbouwVoorbeeld();
  const posten = postenVan(plan, cat, { posities: posities.map((p) => ({ id: p.id, naam: p.naam, aantal: p.aantal })), handmatig: werken });
  const titels = posten.map((p) => p.titel).join(' | ');
  it('een geldig plan: geen fout in de controles, het hef-schuifraam van 4,00 × 2,35 m is geldig', () => {
    expect(controleerPlan(plan, cat).filter((m) => m.ernst === 'fout')).toEqual([]);
    const raam = posities.find((p) => p.aantal > 0)!;
    expect([raam.keuzes.breedte, raam.keuzes.hoogte]).toEqual([4000, 2350]);
    expect(berekenRaam(raam.keuzes).meldingen.filter((m) => m.ernst === 'fout')).toEqual([]);
    expect(plan.daklichten?.map((l) => [l.type, l.b, l.d])).toEqual([['koepel_120', 120, 120], ['koepel_120', 120, 120], ['koepel_120', 120, 120]]);
  });
  it('in de volgorde van het bouwen', () => {
    const volgorde = posten.map((p) => POST_GROEPEN.indexOf(p.groep));
    expect(volgorde).toEqual([...volgorde].sort((a, b) => a - b));
    expect(posten[0]!.titel).toBe('Afbraak van het terras');
  });
  it('hoofdstuk 10, rij per rij', () => {
    // Afbraak, grondwerken, container: als regel, zonder ding.
    for (const t of ['Afbraak van het terras', 'Grondwerken', 'Container']) expect(posten.find((p) => p.titel.startsWith(t))?.dingen).toEqual([]);
    for (const t of ['Fundering', 'Vloerplaat', 'Opening in de bestaande gevel', 'Buitenwanden: buitenwand in houtskelet', 'Plat dak', 'Dakrand', 'Regenafvoer en noodafvoer', 'Lichtkoepel 120 × 120', 'Gevelbekleding: houten bekleding, staand', 'Wanden binnen: schilderklaar', 'Plafond', 'Vloer: keramische tegel', 'Elektriciteit', 'Sanitair']) {
      expect(titels, t).toContain(t);
    }
    const koepels = posten.find((p) => p.titel.startsWith('Lichtkoepel'))!;
    expect([koepels.hoeveelheid, koepels.eenheid]).toEqual([3, 'stuks']);
    const wand = posten.find((p) => p.titel.startsWith('Buitenwanden'))!;
    expect(wand.detail.join(' ')).toMatch(/dampscherm.*houtskelet met isolatie 140 mm/);
    expect(wand.dingen).toEqual(['gevel:uitbouw:onder']);
    const dak = posten.find((p) => p.titel.startsWith('Plat dak'))!;
    expect(dak.detail.join(' ')).toMatch(/dakisolatie 140 mm.*EPDM/);
    const elek = posten.find((p) => p.titel === 'Elektriciteit')!.detail.join(' ');
    for (const t of ['schakelaar', 'stopcontact', 'inbouwspot', 'verdeelbord']) expect(elek).toContain(t);
    const sanitair = posten.find((p) => p.titel === 'Sanitair')!.detail.join(' ');
    for (const t of ['hangtoilet', 'buitenkraan']) expect(sanitair).toContain(t);
    // Wat bestaat of van de buren is, staat er niet in.
    expect(posten.some((p) => p.dingen.some((d) => /bestaand/.test(d)))).toBe(false);
  });
  it('elk ding van een post bestaat in de 3D (met de techniek in de woning)', () => {
    const s = plattegrond3D(plan, cat, { dingen: true, aanleg: true, techniek: { weergave: 'gewoon' } });
    const dingen = new Set(s.blokken.map((b) => b.code.split('.')[0]));
    for (const p of posten) for (const d of p.dingen) expect(dingen.has(d), `${p.titel}: ${d}`).toBe(true);
    for (const p of posten) for (const m of p.markeer ?? []) expect(s.blokken.some((b) => b.code.startsWith(m)), `${p.titel}: ${m}`).toBe(true);
    expect(postenVanDing(posten, 'dak').map((p) => p.titel)).toEqual(expect.arrayContaining(['Dakrand', 'Lichtkoepel 120 × 120']));
    expect(postenVanDing(posten, 'gevel:uitbouw:onder').length).toBeGreaterThanOrEqual(3);
  });
  it('de techniek telt alleen het nieuwe werk', () => {
    expect(telTechniek(nieuweTechniek(plan), cat.techniek!).length).toBe(telTechniek(plan, cat.techniek!).length);
  });
  it('voor de klant: geen materiaal, een aantal alleen in stuks; als tekst zonder bedragen', () => {
    const k = klantPosten(posten);
    expect(k.every((p) => !('intern' in p))).toBe(true);
    expect(k.find((p) => p.titel.startsWith('Plat dak'))?.aantal).toBeUndefined();
    expect(k.find((p) => p.titel.startsWith('Lichtkoepel'))?.aantal).toBe(3);
    const tekst = postenTekst(posten, { intern: true });
    expect(tekst).not.toMatch(/€|prijs|btw|totaal|korting|marge|offerte/i);
    expect(tekst.split('\n')[2]).toBe('Groep\tPost\tHoeveelheid\tEenheid\tDetail');
  });
});
