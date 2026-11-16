/**
 * Schuine muren (ronde 2c, 16/11): een ruimte met een vrije vorm, een vierhoek uit gemeten maten, schuine muren met
 * ramen en deuren. De verwachte waarden zijn met de hand nagerekend (zie het commentaar bij elke test).
 */
import { describe, expect, it } from 'vitest';
import {
  binnenVeelhoek, dichtsteMuur, hoekenVan, isBol, metDeKlok, murenVan, muurVanOpening, muurVlak, openingAfstanden, opMuur, plaatsVorm,
  ruimteMaten, ruimteOp, trekVeelhoekAf, veelhoekOppervlakte, verschuifZijden, vierhoekUitHoeken, vierhoekUitZijden, vormFouten, vormVanDeel,
  zetOmtrek, zijdenVan,
  type Muur, type Opening, type Plattegrond, type Punt, type Ruimte,
} from '../src/index.js';

const ruimte = (id: string, x: number, y: number, b: number, d: number, extra: Partial<Ruimte> = {}): Ruimte =>
  ({ id, naam: id, type: 'leefruimte', x, y, b, d, vloer: 'parket_eik', wand: 'wit', ...extra });
function vrij(id: string, punten: Punt[], extra: Partial<Ruimte> = {}): Ruimte {
  const r = ruimte(id, 0, 0, 0, 0, extra);
  zetOmtrek(r, punten);
  return r;
}
const plan = (ruimtes: Ruimte[], openingen: Opening[] = [], extra: Partial<Plattegrond> = {}): Plattegrond => ({
  ruimtes, openingen, meubels: [], muurhoogte: 270, buitenmuur: 30, binnenmuur: 10, gevel: { soort: 'steen', kleur: '#9c4a34' }, ...extra,
});
const rond = (p: Punt[], f = 100) => p.map(([x, y]) => [Math.round(x * f) / f, Math.round(y * f) / f]);

describe('vorm uit gemeten maten', () => {
  it('vier zijden en een diagonaal: 300 × 400 met diagonaal 500 is precies de rechthoek', () => {
    const v = vierhoekUitZijden(300, 400, 300, 400, 500);
    expect(v.fouten).toEqual([]);
    expect(v.punten).toEqual([[0, 0], [300, 0], [300, 400], [0, 400]]);
    expect(v.hoeken).toEqual([90, 90, 90, 90]);
    expect(v.diagonalen).toEqual([500, 500]);
    expect(v.waarschuwingen).toEqual([]);
  });

  it('een parallellogram: A(0,0) B(400,0) C(500,300) D(100,300)', () => {
    // BC = DA = √(100² + 300²) = 316,23; AC = √(500² + 300²) = 583,10; BD = √(300² + 300²) = 424,26.
    // Hoek bij A = atan(300/100) = 71,57°; bij B 180 − 71,57 = 108,43°.
    const v = vierhoekUitZijden(400, Math.sqrt(100000), 400, Math.sqrt(100000), Math.sqrt(340000));
    expect(rond(v.punten)).toEqual([[0, 0], [400, 0], [500, 300], [100, 300]]);
    expect(v.hoeken).toEqual([71.6, 108.4, 71.6, 108.4]);
    expect(v.zijden).toEqual([400, 316.2, 400, 316.2]);
    expect(v.diagonalen).toEqual([583.1, 424.3]);
  });

  it('een trapezium met één schuine zijde: A(0,0) B(600,0) C(500,400) D(0,400)', () => {
    // BC = √(100² + 400²) = 412,31; AC = √(500² + 400²) = 640,31; hoek B = acos(100/412,31) = 75,96°, C = 104,04°.
    const v = vierhoekUitZijden(600, Math.sqrt(170000), 500, 400, Math.sqrt(410000));
    expect(rond(v.punten)).toEqual([[0, 0], [600, 0], [500, 400], [0, 400]]);
    expect(v.hoeken).toEqual([90, 76, 104, 90]);
  });

  it('maten die niet kunnen: de driehoeksongelijkheid, in gewone taal', () => {
    const v = vierhoekUitZijden(300, 400, 300, 400, 800);
    expect(v.punten).toEqual([]);
    expect(v.fouten).toHaveLength(2);
    expect(v.fouten[0]).toBe("AB en BC samen (700 cm) zijn niet langer dan de diagonaal AC (800 cm): zo'n driehoek bestaat niet. Meet de diagonaal of een van die zijden na.");
    expect(v.fouten[1]).toContain('DA en CD samen (700 cm)');
    // BC langer dan AB en AC samen (100 + 400 = 500 < 600).
    expect(vierhoekUitZijden(100, 600, 300, 300, 400).fouten[0]).toBe("BC (600 cm) is langer dan AB en de diagonaal AC samen (500 cm): zo'n driehoek bestaat niet. Meet BC na.");
    expect(vierhoekUitZijden(0, 300, 300, 300, 400).fouten).toEqual(['Zijde AB moet langer zijn dan 0 cm.']);
  });

  it('een inspringende hoek geeft een waarschuwing', () => {
    // A(0,0) B(400,0) C(400,300) D(500,500): bij C draai je de verkeerde kant op (binnenhoek > 180°).
    const v = vierhoekUitZijden(400, 300, Math.hypot(100, 200), Math.hypot(500, 500), 500);
    expect(v.fouten).toEqual([]);
    expect(rond(v.punten)).toEqual([[0, 0], [400, 0], [400, 300], [500, 500]]);
    expect(v.hoeken[2]).toBeGreaterThan(180);
    expect(v.waarschuwingen[0]).toContain('De hoek bij C');
    expect(isBol(v.punten)).toBe(false);
  });

  it('drie zijden en twee hoeken', () => {
    expect(vierhoekUitHoeken(400, 300, 400, 90, 90).punten).toEqual([[0, 0], [400, 0], [400, 300], [0, 300]]);
    // Het trapezium van hierboven: AB 600, BC 412,31, CD 500 met 75,96° en 104,04° geeft DA = 400.
    const t = vierhoekUitHoeken(600, Math.sqrt(170000), 500, Math.atan2(400, 100) * 180 / Math.PI, 180 - Math.atan2(400, 100) * 180 / Math.PI);
    expect(rond(t.punten)).toEqual([[0, 0], [600, 0], [500, 400], [0, 400]]);
    expect(t.zijden[3]).toBe(400);
    // Hoeken die de muren laten kruisen.
    expect(vierhoekUitHoeken(400, 300, 500, 90, 30).fouten[0]).toContain('kruisen de muren elkaar');
    expect(vierhoekUitHoeken(400, 300, 400, 0, 90).fouten).toEqual(['De hoek bij B moet tussen 0° en 180° liggen.']);
  });

  it('plaatsen: het eerste punt naar een plaats, de eerste zijde in een richting', () => {
    const v = vierhoekUitZijden(300, 400, 300, 400, 500).punten;
    expect(plaatsVorm(v, [100, 50])).toEqual([[100, 50], [400, 50], [400, 450], [100, 450]]);
    expect(rond(plaatsVorm(v, [0, 0], 90))).toEqual([[0, 0], [0, 300], [-400, 300], [-400, 0]]);
  });
});

describe('een ruimte met een vrije vorm', () => {
  it('zetOmtrek: het kader volgt, de draairichting wordt met de klok mee', () => {
    const r = vrij('a', [[0, 600], [300, 900], [820, 900], [820, 380], [0, 380]]);
    expect([r.x, r.y, r.b, r.d]).toEqual([0, 380, 820, 520]);
    expect(r.omtrek).toEqual(metDeKlok([[0, 600], [300, 900], [820, 900], [820, 380], [0, 380]]));
    // Met de klok mee op de tekening (y naar onder): de oppervlakte met teken is positief.
    expect(hoekenVan(r.omtrek!).reduce((t, h) => t + h, 0)).toBeCloseTo(540, 6);
  });

  it('het kader is de baas: verschuiven en uitrekken (zoals een scherm dat alleen x, y, b, d kent)', () => {
    const r = vrij('a', [[0, 0], [400, 0], [300, 300], [0, 300]]);
    expect(vormVanDeel({ ...r, x: 100, y: 50 })).toEqual([[100, 50], [500, 50], [400, 350], [100, 350]]);
    expect(vormVanDeel({ ...r, b: 800 })).toEqual([[0, 0], [800, 0], [600, 300], [0, 300]]);
  });

  it('vormFouten in gewone taal', () => {
    expect(vormFouten([[0, 0], [400, 0], [300, 300], [0, 300]])).toEqual([]);
    expect(vormFouten([[0, 0], [400, 300], [400, 0], [0, 300]])[0]).toContain('kruisen elkaar');
    expect(vormFouten([[0, 0], [50, 0], [50, 50]])[0]).toContain('kleiner dan 1 m²');
    expect(vormFouten([[0, 0], [400, 0], [400, 300], [200, 100], [0, 300]])[0]).toContain('inspringende hoek');
  });

  it('binnen de vorm, verschuiven van de zijden, aftrekken', () => {
    const v: Punt[] = [[0, 0], [400, 0], [300, 300], [0, 300]];
    expect(binnenVeelhoek(v, 340, 150)).toBe(true); // de schuine zijde ligt bij y = 150 op x = 350
    expect(binnenVeelhoek(v, 360, 150)).toBe(false);
    expect(binnenVeelhoek(v, 350, 150)).toBe(false); // op de rand
    expect(rond(verschuifZijden([[0, 0], [100, 0], [100, 100], [0, 100]], -10))).toEqual([[10, 10], [90, 10], [90, 90], [10, 90]]);
    // Een vierkant van 100 min een hoek van 50 × 50: twee stukken, samen 7500 cm².
    const stukken = trekVeelhoekAf([[0, 0], [100, 0], [100, 100], [0, 100]], [[50, 50], [150, 50], [150, 150], [50, 150]]);
    expect(stukken.length).toBe(2);
    expect(stukken.reduce((t, s) => t + veelhoekOppervlakte(s), 0)).toBeCloseTo(7500, 6);
    expect(zijdenVan([[0, 0], [300, 0], [300, 400]])).toEqual([300, 400, 500]);
  });

  it('oppervlakte en omtrek van een vijfhoek (afgeschuinde hoek), met buitenmuren van 30 cm', () => {
    // Rechthoek 600 × 450 op de as, hoek rechtsonder afgeschuind van (600, 250) tot (400, 450).
    const r = vrij('a', [[0, 0], [600, 0], [600, 250], [400, 450], [0, 450]]);
    const p = plan([r]);
    const m = ruimteMaten(p, r);
    // Bruto: 600 × 450 − ½ × 200 × 200 = 250 000 cm².
    expect(m.bruto).toBe(25);
    // Netto: elke zijde 15 cm naar binnen. De rechthoek wordt 570 × 420 (15..585, 15..435); de schuine zijde schuift
    // 15 cm loodrecht naar binnen: x + y = 850 − 15·√2. Afgesneden driehoek: benen 585 + 435 − 850 + 15√2 = 191,21 cm.
    const been = 585 + 435 - (850 - 15 * Math.SQRT2);
    expect(m.netto).toBe(Math.round((570 * 420 - (been * been) / 2) / 100) / 100);
    expect([m.nb, m.nd]).toEqual([570, 420]);
    // Omtrek binnen: 570 + 420 + (570 − been) + (420 − been) + been·√2.
    expect(m.omtrek).toBe(Math.round((570 + 420 + (570 - been) + (420 - been) + been * Math.SQRT2)) / 100);
    expect(ruimteOp(p, 500, 300)?.id).toBe('a');
    expect(ruimteOp(p, 550, 400)).toBeUndefined(); // in de afgeschuinde hoek
  });
});

describe('schuine muren', () => {
  /** Aanbouw tegen een rechthoekige woning, met een schuine zijmuur van (700, 800) naar (800, 1200). */
  const woning = () => plan([ruimte('woon', 0, 0, 1000, 800), vrij('aan', [[200, 800], [700, 800], [800, 1200], [200, 1200]])]);

  it('een rechthoekig plan geeft exact dezelfde muren, ook als de rechthoek als vrije vorm ingegeven is', () => {
    const recht = plan([ruimte('a', 0, 0, 600, 400), ruimte('b', 600, 0, 300, 400)]);
    const metOmtrek = plan([ruimte('a', 0, 0, 600, 400), vrij('b', [[600, 0], [900, 0], [900, 400], [600, 400]])]);
    const sorteer = (m: Muur[]) => [...m].sort((x, y) => x.id.localeCompare(y.id));
    expect(sorteer(murenVan(metOmtrek))).toEqual(sorteer(murenVan(recht)));
    const ma = murenVan(recht), mb = murenVan(metOmtrek);
    for (const m of ma) expect(muurVlak(mb.find((x) => x.id === m.id)!, mb)).toEqual(muurVlak(m, ma));
  });

  it('beide draairichtingen van de omtrek geven dezelfde muren', () => {
    const a = woning();
    const b = plan([a.ruimtes[0]!, { ...a.ruimtes[1]!, omtrek: [...a.ruimtes[1]!.omtrek!].reverse() }]);
    expect(murenVan(b)).toEqual(murenVan(a));
  });

  it('aanbouw: de schuine muur kent haar eindpunten, lengte, richting en kanten; de rechte delen gaan de gewone weg', () => {
    const muren = murenVan(woning());
    const s = muren.find((m) => m.as === 's')!;
    // Richting (100, 400)/412,31; n = (dy, −dx): de aanbouw ligt links, aan de min-kant; buiten aan de plus-kant.
    expect(s.soort).toBe('buiten');
    expect([s.min, s.plus]).toEqual(['aan', undefined]);
    expect(rond(s.punten!)).toEqual([[700, 800], [800, 1200]]);
    expect(s.tot - s.van).toBeCloseTo(Math.hypot(100, 400), 6);
    expect(s.richting![0]).toBeCloseTo(100 / Math.hypot(100, 400), 9);
    expect(s.lijn).toBeCloseTo(700 * (400 / Math.hypot(100, 400)) - 800 * (100 / Math.hypot(100, 400)), 6);
    // De gedeelde rand met de woning is een binnenmuur (van 200 tot 700); de rest van die gevel blijft buiten.
    expect(muren.filter((m) => m.as === 'h' && m.lijn === 800).map((m) => [m.van, m.tot, m.soort])).toEqual([[0, 200, 'buiten'], [200, 700, 'binnen'], [700, 1000, 'buiten']]);
    expect(muren.map((m) => m.id)).toEqual(['h0_0', 'h800_0', 'h800_200', 'h800_700', 'v0_0', 'v1000_0', 'h1200_200', 'v200_800', 's76_485_946']);
  });

  it('het grondvlak van de schuine muur sluit aan zonder gat of overlap', () => {
    const p = woning(), muren = murenVan(p);
    const s = muren.find((m) => m.as === 's')!;
    const v = muurVlak(s, muren);
    // Begin: afgeknipt op het vlak van de woningmuur (de dunste, de binnenmuur van 10 cm: y = 805).
    // Einde: de onderste muur van de aanbouw stopt recht op x = 800; de schuine muur vult de hoek in een trapje tot het
    // snijpunt van de buitenvlakken: x = 800 + 15 × (1 + 100/400) / (400/412,31) − … (zie hieronder).
    const t = 15, c = 400 / Math.hypot(100, 400), sn = 100 / Math.hypot(100, 400);
    // Binnenvlak (min-kant) door (700 − t·c, 800 + t·sn), richting (sn, c); buitenvlak (plus-kant) door (700 + t·c, 800 − t·sn).
    const opY = (x0: number, y0: number, y: number) => x0 + ((y - y0) / c) * sn;
    expect(rond(v.punten!)).toEqual(rond([
      [opY(700 - t * c, 800 + t * sn, 805), 805],
      [opY(700 - t * c, 800 + t * sn, 1185), 1185], [800, 1185], [800, 1215], [opY(700 + t * c, 800 - t * sn, 1215), 1215],
      [opY(700 + t * c, 800 - t * sn, 805), 805],
    ]));
    expect(v.randen).toEqual(['min', 'kop', 'kop', { muur: 'h1200_200', kant: 'plus' }, 'plus', 'kop']);
    // Geen overlap met de onderste muur van de aanbouw (rechthoek x 185..800, y 1185..1215).
    const onder = muurVlak(muren.find((m) => m.id === 'h1200_200')!, muren);
    expect([onder.x, onder.x + onder.b]).toEqual([185, 800]);
  });

  it('twee vrije vormen met een gedeelde schuine rand: één binnenmuur, met een ruimte aan elke kant', () => {
    const p = plan([vrij('a', [[0, 0], [500, 0], [300, 400], [0, 400]]), vrij('b', [[500, 0], [800, 0], [800, 400], [300, 400]])]);
    const s = murenVan(p).filter((m) => m.as === 's');
    expect(s.length).toBe(1);
    expect(s[0]!.soort).toBe('binnen');
    expect([s[0]!.min, s[0]!.plus].sort()).toEqual(['a', 'b']);
    expect(s[0]!.dikte).toBe(10);
  });

  it('openingen in een schuine muur: muur, dichtste muur, afstanden tot de hoeken', () => {
    const p = woning(), muren = murenVan(p);
    const s = muren.find((m) => m.as === 's')!;
    // Dichtste muur bij een punt net buiten het midden van de schuine muur.
    const d = dichtsteMuur(muren, 755, 990)!;
    expect(d.muur.id).toBe(s.id);
    expect(d.midden).toBeCloseTo((s.van + s.tot) / 2 + ((755 - 750) * 100 + (990 - 1000) * 400) / Math.hypot(100, 400), 6);
    const o: Opening = { id: 'r', soort: 'raam', ...opMuur(s, (s.van + s.tot) / 2), breedte: 120, hoogte: 140, borstwering: 90, scharnier: 'begin', naarPlus: false };
    expect(muurVanOpening(o, muren)).toBe(s);
    expect(muurVanOpening({ ...o, richting: [1, 0] }, muren)).toBeUndefined(); // andere richting
    const af = openingAfstanden({ ...p, openingen: [o] }, o, muren)!;
    // Het binnenvlak (min-kant) loopt van y = 805 tot y = 1185: langs de muur (1185 − 805) / cos = 380 × 412,31 / 400.
    expect(af.binnenPlus).toBe(false);
    expect(af.vlakEinde - af.vlakBegin).toBeCloseTo(380 * Math.hypot(100, 400) / 400, 6);
    expect(af.begin + af.einde + 120).toBeCloseTo(af.vlakEinde - af.vlakBegin, 6);
    expect(af.ketting.length).toBe(4);
  });

  it('een rechte binnenwand die op een schuine muur uitkomt, loopt tot in haar vlak', () => {
    // Vierhoek met een schuine rechterzijde, gedeeld door een liggende wand op y = 200.
    const p = plan([vrij('a', [[0, 0], [400, 0], [500, 200], [0, 200]]), vrij('b', [[0, 200], [500, 200], [600, 400], [0, 400]])]);
    const muren = murenVan(p);
    const wand = muren.find((m) => m.as === 'h' && m.lijn === 200)!;
    expect(wand.soort).toBe('binnen');
    const v = muurVlak(wand, muren);
    // De wand (10 cm) eindigt op x = 500; de schuine muur (30 cm) heeft richting (100, 200)/223,6: haar binnenvlak ligt
    // 15 cm links van de as. Op y = 195 en y = 205 raakt de wand dat vlak; de wand loopt tot het verste punt.
    const c = 200 / Math.hypot(100, 200);
    const binnenvlakX = (y: number) => 400 + (y / 2) - 15 / c;
    expect(v.x + v.b).toBeCloseTo(binnenvlakX(205), 6);
  });
});
