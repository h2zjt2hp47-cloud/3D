/**
 * Stroken op de gevel (ronde 14): een materiaal op een deel van een gevel. Zonder stroken verandert niets; met stroken
 * blijven de m² samen gelijk (wat de strook bedekt, gaat van de muur eronder af), zitten de ramen eruit, gaat een latere
 * strook voor, en lopen ze door in de topgevel.
 */
import { describe, expect, it } from 'vitest';
import {
  gevelAanzichten, gevelOppervlaktes, plattegrond3D, postenVan, strookStukken, STROOK_DIKTE, verwijderStrook, voegStrookToe,
  vloerHoogte, zetTegenBuren, type Blok, type GevelStrook, type Plattegrond,
} from '../src/index.js';
import { planCatalogus, planNaarRegels } from '../voorbeelden/inrichting.js';
import { woningOpbouwCatalogus } from '../voorbeelden/woningopbouw.js';
import { pasStijlToe, stijlCatalogus } from '../voorbeelden/stijlen.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';

const cat = { ...planCatalogus, opbouw: woningOpbouwCatalogus };
const hout = { materiaal: 'hout_liggend', kleur: 'ceder' } as const;

/** De voorbeeldwoning met stroken (de voorgevel is de bovenkant van het plan). */
function metStroken(stroken: Omit<GevelStrook, 'id'>[]): Plattegrond {
  const { plan } = voorbeeldWoning();
  for (const s of stroken) voegStrookToe(plan, s);
  return plan;
}
const m2 = (p: Plattegrond) => gevelOppervlaktes(p).reduce((t, v) => t + v.netto + v.sokkel, 0);
const stroken3D = (p: Plattegrond) => plattegrond3D(p, planCatalogus, { dingen: true }).blokken.filter((b) => b.code.startsWith('strook:'));

/** Overlappen twee blokken echt (met volume)? */
function overlap(a: Blok, b: Blok): boolean {
  const o = (p0: number, p1: number, q0: number, q1: number) => Math.min(p1, q1) - Math.max(p0, q0) > 0.01;
  return o(a.x, a.x + a.b, b.x, b.x + b.b) && o(a.y, a.y + a.h, b.y, b.y + b.h) && o(a.z, a.z + a.d, b.z, b.z + b.d);
}

describe('stroken op de gevel: zonder stroken verandert niets', () => {
  it('een lege lijst stroken geeft dezelfde 3D, aanzichten en m²', () => {
    const { plan } = voorbeeldWoning();
    const leeg = structuredClone(plan);
    leeg.gevelOntwerp!.stroken = [];
    expect(plattegrond3D(leeg, planCatalogus, { dingen: true })).toEqual(plattegrond3D(plan, planCatalogus, { dingen: true }));
    expect(gevelOppervlaktes(leeg)).toEqual(gevelOppervlaktes(plan));
    expect(JSON.stringify(gevelAanzichten(leeg, undefined, planCatalogus).map((g) => g.tekening))).toBe(JSON.stringify(gevelAanzichten(plan, undefined, planCatalogus).map((g) => g.tekening)));
    expect(gevelAanzichten(plan, undefined, planCatalogus).some((g) => 'stroken' in g)).toBe(false);
  });
  it('verwijderen haalt het veld weg', () => {
    const p = metStroken([{ kant: 'boven', niveau: 1, onder: 60, boven: 120, ...hout }]);
    verwijderStrook(p, 's1');
    expect(p.gevelOntwerp!.stroken).toBeUndefined();
  });
});

describe('een houten band over de breedte van de verdieping', () => {
  const p = metStroken([{ kant: 'boven', niveau: 1, onder: 60, boven: 120, ...hout }]);
  it('de m² samen blijven gelijk; de strook telt apart, bij haar materiaal', () => {
    const { plan } = voorbeeldWoning();
    expect(m2(p)).toBeCloseTo(m2(plan), 6);
    const s = gevelOppervlaktes(p).filter((v) => v.strook === 's1');
    expect(s.map((v) => v.sleutel)).toEqual(['overloop:boven', 'slk3:boven', 'bad2:boven']);
    // 60 cm hoog over de buitenkant (850 cm), min wat de twee ramen eronder wegnemen (o11 100 × 20, o12 180 × 30).
    expect(s.reduce((t, v) => t + v.netto, 0)).toBeCloseTo((850 * 60 - 100 * 20 - 180 * 30) / 10000, 6);
    expect(s.every((v) => v.keuze?.materiaal === 'hout_liggend' && v.sokkel === 0)).toBe(true);
  });
  it('in de 3D een bekleding van 2 cm vóór de gevel, met de ramen eruit, aan het ding strook:s1', () => {
    const b = stroken3D(p);
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((x) => x.code.startsWith('strook:s1.') && x.soort === 'planken_h' && x.z === -15 - STROOK_DIKTE && x.d === STROOK_DIKTE)).toBe(true);
    const y0 = vloerHoogte(p, 1);
    expect(Math.min(...b.map((x) => x.y))).toBe(y0 + 60);
    expect(Math.max(...b.map((x) => x.y + x.h))).toBe(y0 + 120);
    // Geen blok in de opening van een raam (o12: 330–510, vanaf 90 cm boven de vloer).
    expect(b.some((x) => x.x < 510 && x.x + x.b > 330 && x.y + x.h > y0 + 90)).toBe(false);
    for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) expect(overlap(b[i]!, b[j]!)).toBe(false);
  });
  it('zonder het ding: de code van vroeger, en zonder stroken geen enkel blok erbij', () => {
    const b = plattegrond3D(p, planCatalogus).blokken.filter((x) => x.code.startsWith('strook_s1_'));
    expect(b.length).toBe(stroken3D(p).length);
    expect(plattegrond3D(voorbeeldWoning().plan, planCatalogus).blokken.some((x) => x.code.includes('strook'))).toBe(false);
  });
  it('Muren laag knipt de strook mee', () => {
    const b = plattegrond3D(p, planCatalogus, { laag: 110 }).blokken.filter((x) => x.code.startsWith('strook_'));
    expect(b.every((x) => x.y + x.h <= vloerHoogte(p, 1) + 110 + 0.01)).toBe(true);
  });
  it('in het aanzicht: vormen vóór de ramen, de randen in de maten, de hoogte links', () => {
    const g = gevelAanzichten(p, undefined, planCatalogus).find((x) => x.kant === 'boven')!;
    expect(g.stroken?.length).toBeGreaterThan(0);
    const codes = g.tekening.vormen.map((v) => v.code);
    const laatsteStrook = Math.max(...codes.map((c, i) => (c.startsWith('strook.') ? i : -1)));
    expect(laatsteStrook).toBeLessThan(codes.findIndex((c) => c.startsWith('kader.')));
    expect(g.tekening.maatlijnen.filter((m) => m.code.startsWith('strookhoogte')).map((m) => m.tekst)).toEqual([`${vloerHoogte(p, 1) + 60}`, '60']);
  });
  it('in het overzicht en de posten: het materiaal met de strook als ding', () => {
    const regels = planNaarRegels(p, { vloeren: false, wanden: false, binnendeuren: false, ruwbouw: false, inrichting: false, gevel: true });
    const strook = regels.find((r) => r.omschrijving.startsWith('Houten bekleding, liggend'));
    expect(strook?.hoeveelheid).toBeCloseTo((850 * 60 - 100 * 20 - 180 * 30) / 10000, 1);
    const post = postenVan(p, cat).find((x) => x.titel.startsWith('Gevelbekleding: houten bekleding, liggend'))!;
    expect(post.dingen).toEqual(['strook:s1']);
    expect(post.detail.join(' ')).toContain('een strook (');
    // De gevelsteen eronder heeft de strook niet meer.
    expect(postenVan(p, cat).find((x) => x.titel.startsWith('Gevelbekleding: gevelsteen'))!.dingen.some((d) => d.startsWith('strook:'))).toBe(false);
  });
  it('een stijl laat de stroken staan', () => {
    expect(pasStijlToe(p, Object.values(stijlCatalogus)[0]!).gevelOntwerp?.stroken?.length).toBe(1);
  });
});

describe('verticale strook naast de voordeur, kader rond een raam, latere strook gaat voor', () => {
  // De voordeur o1: 140–240 op de voorgevel. De strook van 40 cm erlangs, over de hele hoogte van de gevel.
  const p = metStroken([
    { kant: 'boven', van: 240, tot: 280, materiaal: 'crepi', kleur: 'wit' },
    { kant: 'boven', niveau: 0, van: 1065, tot: 1295, onder: 75, boven: 255, materiaal: 'zink', kleur: 'antraciet' },
    { kant: 'boven', niveau: 0, onder: 200, boven: 230, ...hout },
  ]);
  it('de strook naast de deur loopt over beide verdiepingen, zonder naad tussen de muurvlakken', () => {
    const b = stroken3D(p).filter((x) => x.code.startsWith('strook:s1.'));
    // Gelijkvloers: onder en boven de band s3 (die later komt); verdieping: één stuk.
    expect(b.map((x) => [x.x, x.b, x.y, x.h])).toEqual([[240, 40, 0, 200], [240, 40, 230, 40], [240, 40, 270, 300]]);
  });
  it('het kader rond het raam: vier stukken min wat de band bedekt; het raam blijft vrij', () => {
    const st = strookStukken(p, 0).filter((s) => s.strook.id === 's2');
    expect(st.length).toBe(1);
    const b = stroken3D(p).filter((x) => x.code.startsWith('strook:s2.'));
    expect(b.some((x) => x.x < 1270 && x.x + x.b > 1090 && x.y < 240 && x.y + x.h > 90)).toBe(false);
    for (const x of b) for (const y of stroken3D(p).filter((q) => !q.code.startsWith('strook:s2.'))) expect(overlap(x, y)).toBe(false);
  });
  it('de m² samen blijven gelijk', () => {
    expect(m2(p)).toBeCloseTo(m2(voorbeeldWoning().plan), 6);
  });
});

describe('rond de hoek, in de topgevel, niet op bestaande muren', () => {
  it('een band rond een buitenhoek krijgt een hoekstuk (geen inham)', () => {
    const p = metStroken([{ kant: 'boven', niveau: 0, onder: 0, boven: 100, ...hout }, { kant: 'links', niveau: 0, onder: 0, boven: 100, ...hout }]);
    const hoek = stroken3D(p).filter((x) => x.code.includes('_hoek_'));
    expect(hoek.map((x) => [x.x, x.z, x.b, x.d, x.y, x.h])).toEqual([[-17, -17, 2, 2, 0, 100]]);
  });
  it('onder een zadeldak loopt een strook over de hele hoogte door tot onder het dak', () => {
    const { plan } = voorbeeldWoning();
    plan.dak = { vorm: 'zadel', helling: 35, richting: 'boven', oversteek: 30, bedekking: { materiaal: 'pannen_keramisch', kleur: 'rood' } } as Plattegrond['dak'];
    voegStrookToe(plan, { kant: 'links', niveau: 1, ...hout });
    const prismas = plattegrond3D(plan, planCatalogus).blokken.filter((x) => x.code.startsWith('strook_') && x.vorm === 'prisma');
    expect(prismas.length).toBe(1);
    expect(m2(plan)).toBeCloseTo(m2({ ...plan, gevelOntwerp: { ...plan.gevelOntwerp!, stroken: undefined } }), 6);
    const s = gevelOppervlaktes(plan).filter((v) => v.strook);
    const muur = gevelOppervlaktes({ ...plan, gevelOntwerp: { ...plan.gevelOntwerp!, stroken: undefined } }).find((v) => v.sleutel === 'overloop:links')!;
    // De hele gevel (met de topgevel) wordt de strook: van de muur blijft niets over.
    expect(s.reduce((t, v) => t + v.netto, 0)).toBeCloseTo(muur.netto, 6);
  });
  it('een muur tegen de buren krijgt geen strook', () => {
    const p = metStroken([{ kant: 'links', niveau: 0, onder: 0, boven: 100, ...hout }]);
    zetTegenBuren(p, 'hal:links', true);
    zetTegenBuren(p, 'leef:links', true);
    expect(stroken3D(p)).toEqual([]);
    expect(gevelOppervlaktes(p).some((v) => v.strook)).toBe(false);
  });
});
