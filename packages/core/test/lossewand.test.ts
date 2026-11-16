/**
 * Losse wand (ronde 2d): een muur die geen ruimte opdeelt. Gegevens, aansluiting op muren (ook schuin, verstek), tekening,
 * 3D, gevels, constructie, meetstaat en regels; en een plan met losse wanden deelt niets op.
 */
import { describe, expect, it } from 'vitest';
import {
  constructie3D, controleerPlan, dwarsVerschoven, gevelAanzichten, gevelOppervlaktes, kleefAanWand, losseWandAfstanden, losseWandLengte, losseWandVlak,
  metDeKlok, metLengte, murenVan, muurVlak, niveauPlan, plattegrond3D, ruimteMaten, snijVeelhoek, tekenPlattegrond, tekenDoorsnede, veelhoekOppervlakte,
  woningConstructie, woningMeetstaat, zetOmtrek,
  type LosseWand, type Plattegrond, type Punt, type Ruimte,
} from '../src/index.js';
import { planCatalogus, planNaarRegels } from '../voorbeelden/inrichting.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';
import { woningOpbouwCatalogus } from '../voorbeelden/woningopbouw.js';

const cat = planCatalogus;
const ccat = { ...planCatalogus, opbouw: woningOpbouwCatalogus };
/** Een muurtje in de leefruimte: staand, 10 cm dik, 110 cm hoog, van de wand met de keuken (as y = 380) 120 cm de kamer in, 300 cm vrij van de linkermuur. */
const muurtje = (): LosseWand => ({ id: 'm1', van: [320, 380], tot: [320, 505], dikte: 10, hoogte: 110 });
/** Een tuinmuur van 6 m langs de rechterzijgevel (buitenkant x = 1415), 1 m ervan, 20 cm dik en 180 cm hoog. */
const tuinmuur = (): LosseWand => ({ id: 't1', van: [1525, 150], tot: [1525, 750], dikte: 20, hoogte: 180 });
const woning = (wanden: LosseWand[] = []): Plattegrond => {
  const p = voorbeeldWoning().plan;
  if (wanden.length) p.losseWanden = wanden;
  return p;
};
const oppervlakte = (a: Punt[], b: Punt[]) => { const s = snijVeelhoek(metDeKlok(a), metDeKlok(b)); return s.length >= 3 ? veelhoekOppervlakte(s) : 0; };
const rechthoek = (v: { x: number; y: number; b: number; d: number }): Punt[] => [[v.x, v.y], [v.x + v.b, v.y], [v.x + v.b, v.y + v.d], [v.x, v.y + v.d]];

describe('een losse wand deelt niets op', () => {
  it('ruimtes, muren, oppervlaktes, controles en gevelvlakken blijven gelijk', () => {
    const zonder = woning(), met = woning([muurtje(), tuinmuur()]);
    for (const n of [0, 1]) expect(murenVan(niveauPlan(met, n))).toEqual(murenVan(niveauPlan(zonder, n)));
    expect(met.ruimtes.map((r) => ruimteMaten(met, r))).toEqual(zonder.ruimtes.map((r) => ruimteMaten(zonder, r)));
    expect(controleerPlan(met, cat)).toEqual(controleerPlan(zonder, cat));
    expect(gevelOppervlaktes(met)).toEqual(gevelOppervlaktes(zonder));
  });

  it('de 3D van vroeger blijft, met de losse wanden erbij', () => {
    const zonder = plattegrond3D(woning(), cat, { aanleg: true, gevelkoppen: true }).blokken;
    const met = plattegrond3D(woning([muurtje(), tuinmuur()]), cat, { aanleg: true, gevelkoppen: true }).blokken;
    expect(met.filter((b) => !b.code.startsWith('losse_wand_'))).toEqual(zonder);
    expect(met.filter((b) => b.code.startsWith('losse_wand_')).map((b) => b.code)).toEqual(['losse_wand_m1', 'losse_wand_t1']);
  });

  it('controles alleen over de losse wanden: door een muur, voor een raam of deur, te kort', () => {
    const door: LosseWand = { id: 'd', van: [320, 700], tot: [320, 1000], dikte: 10 };
    expect(controleerPlan(woning([door]), cat).filter((m) => m.wand)).toEqual([{ ernst: 'waarschuwing', wand: 'd', melding: 'De losse wand in Leefruimte loopt door een muur: verkort of verschuif ze.' }]);
    // Het schuifraam in de achtergevel van de leefruimte (midden op x = 520, 300 breed).
    const schuif = woning().openingen.find((o) => o.soort === 'schuifraam')!;
    const voor: LosseWand = { id: 'v', van: [schuif.midden, 900], tot: [schuif.midden, 780], dikte: 10 };
    expect(controleerPlan(woning([voor]), cat).find((m) => m.wand === 'v')).toMatchObject({ opening: schuif.id, melding: 'De losse wand in Leefruimte staat voor een raam.' });
    expect(controleerPlan(woning([{ id: 'k', van: [320, 900], tot: [320, 875], dikte: 10 }]), cat).find((m) => m.wand === 'k')?.melding).toBe('De losse wand in Leefruimte is korter dan 20 cm.');
  });

  it('niveauPlan geeft alleen de losse wanden van die verdieping; zonder losse wanden geen veld', () => {
    const p = woning([muurtje(), { ...tuinmuur(), niveau: 1 }]);
    expect(niveauPlan(p, 0).losseWanden?.map((w) => w.id)).toEqual(['m1']);
    expect(niveauPlan(p, 1).losseWanden?.map((w) => w.id)).toEqual(['t1']);
    expect('losseWanden' in niveauPlan(woning(), 0)).toBe(false);
  });
});

describe('grondvlak en aansluiting', () => {
  it('een muurtje tegen de wand met de keuken stopt op haar vlak: 120 cm gebouwd, zonder overlap', () => {
    const p = woning([muurtje()]), muren = murenVan(niveauPlan(p, 0));
    const v = losseWandVlak(muurtje(), muren, p.losseWanden);
    expect(v.aan[0].soort).toBe('muur');
    expect(v.aan[1].soort).toBe('vrij');
    expect(losseWandLengte(v)).toBe(120);
    const xs = v.punten.map((q) => q[0]), ys = v.punten.map((q) => q[1]);
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([315, 325, 385, 505]);
    for (const m of muren) {
      const mv = muurVlak(m, muren);
      expect(oppervlakte(mv.punten ?? rechthoek(mv), v.punten)).toBeLessThan(0.01);
    }
    // De proef op de som: de overlap van het grondvlak met zichzelf is zijn oppervlakte, en het ligt met de klok mee.
    expect(oppervlakte(v.punten, v.punten)).toBeCloseTo(1200, 6);
    expect(metDeKlok(v.punten)).toEqual(v.punten);
  });

  it('een schuine losse wand sluit met een schuine snede op het vlak van de muur: geen gat, geen overlap', () => {
    const w: LosseWand = { id: 's', van: [320, 900], tot: [470, 750], dikte: 12 };
    const p = woning([w]), muren = murenVan(niveauPlan(p, 0));
    const v = losseWandVlak(w, muren, p.losseWanden);
    // Twee hoekpunten op het binnenvlak van de achtergevel (y = 885), de rest erboven.
    expect(v.punten.filter((q) => Math.abs(q[1] - 885) < 1e-6)).toHaveLength(2);
    expect(Math.max(...v.punten.map((q) => q[1]))).toBeCloseTo(885, 6);
    // De oppervlakte is die van een strook van 12 cm breed tussen de gevel en het vrije einde (loodrecht afgeknipt).
    const L = Math.hypot(150, 150) - 15 * Math.SQRT2;
    expect(veelhoekOppervlakte(v.punten)).toBeCloseTo(12 * L, 3);
    expect(losseWandLengte(v)).toBeCloseTo(L, 2);
    const achter = muren.find((m) => m.as === 'h' && m.lijn === 900 && m.van <= 320 && m.tot >= 320)!;
    expect(oppervlakte(rechthoek(muurVlak(achter, muren)), v.punten)).toBeLessThan(0.01);
  });

  it('een eindpunt dat 2 cm voor het vlak ligt, sluit toch aan (geen spleet)', () => {
    const w: LosseWand = { id: 'g', van: [320, 883], tot: [320, 700], dikte: 10 };
    const v = losseWandVlak(w, murenVan(niveauPlan(woning([w]), 0)));
    expect(Math.max(...v.punten.map((q) => q[1]))).toBe(885);
  });

  it('twee losse wanden met een gemeenschappelijk eindpunt sluiten in verstek; een derde stopt op het vlak van de tweede', () => {
    const a: LosseWand = { id: 'a', van: [1600, 100], tot: [1600, 400], dikte: 20 };
    const b: LosseWand = { id: 'b', van: [1600, 100], tot: [1900, 100], dikte: 20 };
    const c: LosseWand = { id: 'c', van: [1750, 100], tot: [1750, 300], dikte: 10 };
    const p = woning([a, b, c]), muren = murenVan(niveauPlan(p, 0));
    const va = losseWandVlak(a, muren, p.losseWanden), vb = losseWandVlak(b, muren, p.losseWanden), vc = losseWandVlak(c, muren, p.losseWanden);
    expect(va.aan[0].soort).toBe('verstek');
    expect(veelhoekOppervlakte(va.punten)).toBeCloseTo(290 * 20 + 200, 6);
    expect(veelhoekOppervlakte(vb.punten)).toBeCloseTo(290 * 20 + 200, 6);
    expect(oppervlakte(va.punten, vb.punten)).toBeLessThan(0.01);
    expect(vc.aan[0]).toEqual({ soort: 'wand', id: 'b' });
    expect(Math.min(...vc.punten.map((q) => q[1]))).toBe(110);
    expect(oppervlakte(vb.punten, vc.punten)).toBeLessThan(0.01);
  });

  it('afstand tot de evenwijdige muren: 300 cm vrij van de linkermuur, 490 cm van de wand rechts', () => {
    const muren = murenVan(niveauPlan(woning([muurtje()]), 0));
    const af = losseWandAfstanden(muurtje(), muren);
    const links = [af.min, af.plus].find((x) => x?.naam === 'links')!, rechts = [af.min, af.plus].find((x) => x?.naam === 'rechts')!;
    expect(links.vrij).toBe(300);
    expect(rechts.vrij).toBe(490);
    const tuin = losseWandAfstanden(tuinmuur(), murenVan(niveauPlan(woning([tuinmuur()]), 0)));
    expect([tuin.min, tuin.plus].find((x) => x?.naam === 'links')?.vrij).toBe(100);
  });

  it('kleven aan een muur zet het punt op haar as; lengte en dwars verschuiven', () => {
    const p = woning([muurtje()]), muren = murenVan(niveauPlan(p, 0));
    expect(kleefAanWand([330, 893], muren)?.punt).toEqual([330, 900]);
    expect(kleefAanWand([330, 860], muren)).toBeUndefined();
    const v = losseWandVlak(muurtje(), muren, p.losseWanden);
    expect(metLengte(muurtje(), v, 150, 'einde').tot).toEqual([320, 535]);
    // Dwars: n = (dy, −dx) = (1, 0) voor een wand van boven naar onder; 20 cm langs n is 20 cm naar rechts.
    expect(dwarsVerschoven(muurtje(), 20).van).toEqual([340, 380]);
  });

  it('een losse wand in een vrije vorm sluit aan op een schuine muur', () => {
    const r: Ruimte = { id: 'v', naam: 'v', type: 'leefruimte', x: 0, y: 0, b: 0, d: 0, vloer: 'parket_eik', wand: 'wit' };
    zetOmtrek(r, [[0, 0], [600, 0], [800, 400], [0, 400]]);
    const s = murenVan({ ...woning(), ruimtes: [r], openingen: [], meubels: [] }).find((m) => m.as === 's')!;
    const op: Punt = [700, 200]; // midden op de as van de schuine muur
    const w: LosseWand = { id: 'x', van: op, tot: [400, 200], dikte: 10 };
    const p: Plattegrond = { ...woning(), ruimtes: [r], openingen: [], meubels: [], losseWanden: [w] };
    const muren = murenVan(p);
    const v = losseWandVlak(w, muren, p.losseWanden);
    expect(v.aan[0]).toEqual({ soort: 'muur', id: s.id });
    expect(oppervlakte(muurVlak(s, muren).punten!, v.punten)).toBeLessThan(0.01);
  });
});

describe('tekening, 3D en gevels', () => {
  it('de tekening toont de losse wand met haar lengte en een strook om ze aan te tikken', () => {
    const svg = tekenPlattegrond(niveauPlan(woning([muurtje()]), 0), cat, { maatDoelen: true, schaal: 2 });
    expect(svg).toContain('data-soort="wand" data-id="m1"');
    expect(svg).toContain('data-maat="wand:m1"');
    expect(svg).toContain('>h 110<');
    // Gekozen: grepen op beide eindpunten en de vrije maat tot de linkermuur.
    const gekozen = tekenPlattegrond(niveauPlan(woning([muurtje()]), 0), cat, { maatDoelen: true, selectie: { soort: 'wand', id: 'm1' } });
    expect(gekozen.match(/data-wandgreep="(van|tot)"/g)?.length).toBe(4);
    expect(gekozen).toMatch(/data-maat="wandafstand:m1:(min|plus)"/);
    expect(gekozen).toContain('>300<');
  });

  it('in 3D op haar hoogte en in haar afwerking; buiten in het gevelmateriaal; muren laag; ding om aan te tikken', () => {
    const p = woning([muurtje(), tuinmuur()]);
    const blok = (code: string, opties = {}) => plattegrond3D(p, cat, opties).blokken.find((b) => b.code === code)!;
    expect(blok('losse_wand_m1')).toMatchObject({ vorm: 'blok', x: 315, z: 385, b: 10, d: 120, y: 0, h: 110, kleur: cat.wanden.gebroken_wit!.kleur });
    expect(blok('losse_wand_t1')).toMatchObject({ vorm: 'blok', soort: 'steen', x: 1515, z: 150, b: 20, d: 600, h: 180 });
    expect(blok('losse_wand_t1', { laag: 110, totNiveau: 0 }).h).toBe(110);
    expect(blok('wand:m1.losse_wand_m1', { dingen: true })).toBeDefined();
    // Volle hoogte zonder eigen hoogte; een eigen afwerking gaat voor die van de ruimte.
    const vol = plattegrond3D({ ...p, losseWanden: [{ ...muurtje(), hoogte: undefined, wand: 'salie' }] }, cat).blokken.find((b) => b.code === 'losse_wand_m1')!;
    expect(vol).toMatchObject({ h: 270, kleur: cat.wanden.salie!.kleur });
    // Schuin: een prisma met haar grondvlak.
    const s = plattegrond3D({ ...p, losseWanden: [{ id: 's', van: [320, 900], tot: [470, 750], dikte: 12, hoogte: 100 }] }, cat).blokken.find((b) => b.code === 'losse_wand_s')!;
    expect(s).toMatchObject({ vorm: 'prisma', as: 'y', h: 100 });
    // Op de verdieping: op haar vloer.
    const boven = plattegrond3D({ ...p, losseWanden: [{ id: 'b', van: [300, 0], tot: [300, 200], dikte: 10, hoogte: 100, niveau: 1 }] }, cat).blokken.find((b) => b.code === 'losse_wand_b')!;
    expect(boven.y).toBe(300);
  });

  it('een tuinmuur staat in het aanzicht waar ze voor de gevel staat, en niet in dat erachter', () => {
    const g = gevelAanzichten(woning([tuinmuur()]), undefined, cat);
    const vorm = (kant: string) => g.find((x) => x.kant === kant)!.tekening.vormen.find((v) => v.code === 'wand.t1');
    expect(vorm('rechts')).toMatchObject({ breedte: 600, hoogte: 180 });
    expect(vorm('boven')?.breedte).toBe(20);
    expect(vorm('links')).toBeUndefined();
    // De maten van de gevel blijven die van het gebouw.
    const zonder = gevelAanzichten(woning(), undefined, cat);
    expect(g.map((x) => x.tekening.maatlijnen)).toEqual(zonder.map((x) => x.tekening.maatlijnen));
    // Een muurtje binnen staat in geen enkel aanzicht.
    expect(gevelAanzichten(woning([muurtje()]), undefined, cat).flatMap((x) => x.tekening.vormen).some((v) => v.code.startsWith('wand.'))).toBe(false);
  });
});

describe('constructie, meetstaat en regels', () => {
  it('binnen een binnenwand met haar opbouw, buiten een effen muur met een melding', () => {
    const p = woning([muurtje(), tuinmuur()]);
    const c = woningConstructie(p, ccat);
    const d = c.delen.find((x) => x.ding === 'wand:m1')!;
    expect(d.plaats).toBe('binnenwand');
    expect(d.muur!.hoogte).toBe(110);
    expect(d.deel.maten.b).toBeGreaterThan(110);
    expect(d.deel.maten.b).toBeLessThan(130);
    expect(c.stukken.some((s) => s.soort === 'wand')).toBe(true);
    expect(c.meldingen.some((m) => m.startsWith('Losse wand buiten (6 m lang, 180 cm hoog)'))).toBe(true);
    const blokken = constructie3D(p, ccat, { dingen: true }, c).blokken;
    expect(blokken.some((b) => b.code.startsWith('wand:m1.'))).toBe(true);
    expect(blokken.some((b) => b.code === 'losse_wand_t1')).toBe(true);
    expect(constructie3D(p, ccat, { laag: 110, totNiveau: 0 }, c).blokken.find((b) => b.code === 'losse_wand_t1')!.h).toBe(110);
  });

  it('de meetstaat telt het muurtje mee; de doorsnede snijdt het', () => {
    const zonder = woningMeetstaat(woning(), ccat), met = woningMeetstaat(woning([muurtje()]), ccat);
    const som = (r: typeof met) => r.reduce((t, x) => t + (x.m2 ?? 0), 0);
    expect(som(met)).toBeGreaterThan(som(zonder));
    // Langs (y = 450) door het muurtje: de snede kent meer vormen dan zonder.
    const a = tekenDoorsnede(woning(), ccat, { richting: 'langs', plaats: 450 }), b = tekenDoorsnede(woning([muurtje()]), ccat, { richting: 'langs', plaats: 450 });
    expect(b.length).toBeGreaterThan(a.length);
  });

  it('regels: afwerking beide zijden, de tuinmuur in gevelmateriaal, ruwbouw per dikte', () => {
    const opties = { vloeren: true, wanden: true, binnendeuren: true, ruwbouw: true, inrichting: false, gevel: true };
    const zonder = planNaarRegels(woning(), opties), met = planNaarRegels(woning([muurtje(), tuinmuur()]), opties);
    const h = (r: typeof met, code: string) => r.find((x) => x.code === code)?.hoeveelheid ?? 0;
    expect(h(met, 'wand:gebroken_wit') - h(zonder, 'wand:gebroken_wit')).toBeCloseTo(2.6, 1);
    expect(h(met, 'losse_wand:binnen:10')).toBe(1.3);
    expect(h(met, 'losse_wand:buiten:20')).toBe(10.8);
    expect(h(met, 'gevel:losse:gevelsteen:rood:grijs')).toBe(21.6);
    // Wat niet over losse wanden gaat, blijft gelijk.
    const rest = (r: typeof met) => r.filter((x) => !x.code.startsWith('losse_wand') && !x.code.startsWith('gevel:losse') && x.code !== 'wand:gebroken_wit');
    expect(rest(met)).toEqual(rest(zonder));
  });
});
