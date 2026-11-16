import { describe, expect, it } from 'vitest';
import {
  controleerPlan,
  gebouwenVan,
  gevelAanzichten,
  gevelLijnen,
  gevelVanMuur,
  murenVan,
  niveauPlan,
  ruimteMaten,
  ruimteUitMaten,
  verschuifZijden,
  zetMaatVorm,
  zijdenVan,
  type Plattegrond,
  type Punt,
  type Ruimte,
} from '../src/index.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';

const nieuw = (id = 'nieuw'): Ruimte => ({ id, naam: 'Aanbouw', type: 'leefruimte', x: 0, y: 0, b: 0, d: 0, vloer: 'parket_eik', wand: 'wit' });
const woning = () => voorbeeldWoning().plan;
const gevel = (plan: Plattegrond, kant: string) => gevelLijnen(plan, 0).filter((g) => g.kant === kant).sort((a, b) => b.lengte - a.lengte)[0]!;
const afstand = (a: Punt, b: Punt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

describe('gevels van een verdieping', () => {
  it('de achtergevel van de voorbeeldwoning: één gevel van hoek tot hoek, links gezien van buiten', () => {
    const g = gevel(woning(), 'onder');
    expect(g).toMatchObject({ p: [0, 900], u: [1, 0], o: [0, 1], lengte: 1400, dikte: 30, hoekLinks: -15, hoekRechts: 1415, schuin: false });
    // De voorgevel (boven) bekijk je van boven: links is dan de rechterkant van het plan.
    const v = gevel(woning(), 'boven');
    expect(v).toMatchObject({ p: [1400, 0], lengte: 1400 });
    expect(v.u[0]).toBe(-1);
    expect(gevelVanMuur(gevelLijnen(woning()), murenVan(niveauPlan(woning(), 0)).find((m) => m.as === 'h' && m.lijn === 900 && m.soort === 'buiten')!.id)?.kant).toBe('onder');
  });
});

describe('ruimte met maten tegen de woning', () => {
  it('rechthoek 450 × 380 aan de buitenkant, 120 cm van de linkerhoek: op de as 420 × 380 op x 120', () => {
    const plan = woning();
    const m = ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 450, diepte: 380 }, 'buiten', { soort: 'tegen', gevel: gevel(plan, 'onder'), afstand: 120 });
    expect(m.fouten).toEqual([]);
    expect(m.rechthoek).toEqual({ x: 120, y: 900, b: 420, d: 380 });
    const r = nieuw();
    zetMaatVorm(r, m);
    expect(r.omtrek).toBeUndefined();
    plan.ruimtes.push(r);
    const muren = murenVan(niveauPlan(plan, 0));
    // De gevel tussen woning en aanbouw wordt een binnenmuur; de drie andere muren zijn buitenmuren.
    expect(muren.find((x) => x.as === 'h' && x.lijn === 900 && x.van === 120)).toMatchObject({ soort: 'binnen', tot: 540, plus: 'nieuw' });
    expect(muren.filter((x) => (x.plus === 'nieuw' || x.min === 'nieuw') && x.soort === 'buiten')).toHaveLength(3);
    // Terug gemeten aan de buitenkant: 450 breed, 380 diep vanaf de gevel, 120 van de hoek.
    expect(r.b + plan.buitenmuur).toBe(450);
    expect(r.y + r.d + 15 - (900 + 15)).toBe(380);
    expect(r.x - 15 - (0 - 15)).toBe(120);
  });

  it('gemeten aan de binnenkant: de netto maten zijn de getypte maten', () => {
    const plan = woning();
    const m = ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 450, diepte: 380 }, 'binnen', { soort: 'tegen', gevel: gevel(plan, 'onder'), afstand: 120 });
    const r = nieuw();
    zetMaatVorm(r, m);
    plan.ruimtes.push(r);
    const mt = ruimteMaten(plan, r);
    expect(mt.nb).toBeCloseTo(450, 5);
    expect(mt.nd).toBeCloseTo(380, 5);
    // De afstand blijft buiten gemeten (van de buitenhoek tot de buitenkant van de nieuwe muur).
    expect(r.x - 15).toBe(-15 + 120);
  });

  it('links, midden of rechts uitgelijnd', () => {
    const plan = woning();
    const g = gevel(plan, 'onder');
    const m = ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 450, diepte: 380 }, 'buiten', { soort: 'tegen', gevel: g, afstand: 0 });
    expect(m.uitlijning).toEqual({ links: 0, midden: 490, rechts: 980 });
    const rechts = ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 450, diepte: 380 }, 'buiten', { soort: 'tegen', gevel: g, afstand: m.uitlijning.rechts });
    // De buitenkant van de nieuwe rechtermuur valt samen met de buitenhoek rechts.
    expect(rechts.rechthoek!.x + rechts.rechthoek!.b + 15).toBe(1415);
  });

  it('tegen de voorgevel (boven): de vorm ligt boven de woning, links gezien van buiten', () => {
    const plan = woning();
    const m = ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 300, diepte: 200 }, 'buiten', { soort: 'tegen', gevel: gevel(plan, 'boven'), afstand: 100 });
    // Van buiten bekeken (van boven) is links de rechterkant van het plan: de nieuwe rechtermuur aan x = 1400 − 100.
    expect(m.rechthoek).toEqual({ x: 1400 - 100 - 270, y: -200, b: 270, d: 200 });
    expect(m.fouten).toEqual([]);
  });

  it('een vrije vorm uit vier zijden en de diagonaal (een schuine zijmuur), terug te meten', () => {
    const plan = woning();
    const m = ruimteUitMaten(plan, { soort: 'vierhoek', ab: 450, bc: 380, cd: 520, da: 380, ac: 640 }, 'buiten', { soort: 'tegen', gevel: gevel(plan, 'onder'), afstand: 120 });
    expect(m.fouten).toEqual([]);
    expect(m.rechthoek).toBeUndefined();
    expect(m.hoeken).toEqual([90, 100.6, 80.1, 89.2]);
    // AB ligt op de as van de achtergevel.
    expect(m.punten.filter((q) => q[1] === 900)).toHaveLength(2);
    // Gemeten aan de buitenkant: AB terug naar de buitenkant van de gevel, de andere zijden een halve muur naar buiten.
    const buiten = verschuifZijden(m.punten, [-15, 15, 15, 15]);
    zijdenVan(buiten).forEach((l, i) => expect(l).toBeCloseTo([450, 380, 520, 380][i]!, 1));
    expect(afstand(buiten[0]!, buiten[2]!)).toBeCloseTo(640, 1);
    // De overkant staat bijna maar niet helemaal evenwijdig met de gevel: dat wordt gezegd.
    expect(m.waarschuwingen.some((w) => /overkant \(CD\) staat 0,7° scheef/.test(w))).toBe(true);
    const r = nieuw();
    zetMaatVorm(r, m);
    plan.ruimtes.push(r);
    const muren = murenVan(niveauPlan(plan, 0)).filter((x) => x.plus === 'nieuw' || x.min === 'nieuw');
    expect(muren.filter((x) => x.as === 's').length).toBeGreaterThanOrEqual(1);
    expect(muren.find((x) => x.as === 'h' && x.lijn === 900)?.soort).toBe('binnen');
    expect(controleerPlan(plan, planCatalogus).filter((x) => x.ernst === 'fout' && x.ruimte === 'nieuw')).toEqual([]);
  });

  it('tegen een schuine gevel: de gedeelde muur wordt een schuine binnenmuur', () => {
    const plan = woning();
    const m = ruimteUitMaten(plan, { soort: 'vierhoek', ab: 450, bc: 380, cd: 520, da: 380, ac: 640 }, 'buiten', { soort: 'tegen', gevel: gevel(plan, 'onder'), afstand: 120 });
    const r = nieuw();
    zetMaatVorm(r, m);
    plan.ruimtes.push(r);
    const schuin = gevelLijnen(plan, 0).find((g) => g.schuin && g.lengte > 300)!;
    expect(schuin).toBeDefined();
    const n = ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 200, diepte: 150 }, 'buiten', { soort: 'tegen', gevel: schuin, afstand: 60 });
    expect(n.fouten).toEqual([]);
    expect(n.rechthoek).toBeUndefined();
    const r2 = nieuw('nog');
    zetMaatVorm(r2, n);
    plan.ruimtes.push(r2);
    const gedeeld = murenVan(niveauPlan(plan, 0)).filter((x) => x.as === 's' && x.soort === 'binnen');
    expect(gedeeld.some((x) => [x.plus, x.min].sort().join() === ['nieuw', 'nog'].sort().join())).toBe(true);
  });

  it('meldt in gewone taal wat niet kan', () => {
    const plan = woning();
    const g = gevel(plan, 'onder');
    expect(ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 40, diepte: 380 }, 'buiten', { soort: 'tegen', gevel: g, afstand: 0 }).fouten[0]).toMatch(/breedte is 40 cm: dat is te kort/);
    expect(ruimteUitMaten(plan, { soort: 'vierhoek', ab: 450, bc: 100, cd: 520, da: 380, ac: 640 }, 'buiten', { soort: 'tegen', gevel: g, afstand: 0 }).fouten[0]).toMatch(/zo'n driehoek bestaat niet/);
    // Twee keer op dezelfde plaats: overlap.
    const m = ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 450, diepte: 380 }, 'buiten', { soort: 'tegen', gevel: g, afstand: 120 });
    const r = nieuw();
    zetMaatVorm(r, m);
    plan.ruimtes.push(r);
    const g2 = gevelLijnen(plan, 0).find((x) => x.kant === 'onder' && x.p[0] === 540)!;
    expect(ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 450, diepte: 380 }, 'buiten', { soort: 'tegen', gevel: g2, afstand: -300 }).fouten[0]).toMatch(/overlapt met Aanbouw/);
  });
});

describe('ruimte met maten los van de woning of als nieuw project', () => {
  it('een tuinhuis 300 cm achter de achtergevel: een eigen gebouw met vier buitenmuren', () => {
    const plan = woning();
    const m = ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 400, diepte: 300 }, 'buiten', { soort: 'los', gevel: gevel(plan, 'onder'), afstand: 300, tussenruimte: 300 });
    expect(m.fouten).toEqual([]);
    // Buitenkant naar de woning op 915 + 300; de as een halve muur verder.
    expect(m.rechthoek).toEqual({ x: 300, y: 1230, b: 370, d: 270 });
    const r = nieuw('tuin');
    zetMaatVorm(r, m);
    plan.ruimtes.push(r);
    const muren = murenVan(niveauPlan(plan, 0)).filter((x) => x.plus === 'tuin' || x.min === 'tuin');
    expect(muren).toHaveLength(4);
    expect(muren.every((x) => x.soort === 'buiten')).toBe(true);
  });

  it('in de gevels bedekt het gebouw vooraan het gebouw erachter (en één gebouw blijft zoals vroeger)', () => {
    const plan = woning();
    const m = ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 400, diepte: 300 }, 'buiten', { soort: 'los', gevel: gevel(plan, 'onder'), afstand: 300, tussenruimte: 300 });
    const r = nieuw('tuin');
    zetMaatVorm(r, m);
    plan.ruimtes.push(r);
    expect(new Set(gebouwenVan(plan).values()).size).toBe(2);
    expect(gebouwenVan(woning()).size).toBe(12);
    expect(new Set(gebouwenVan(woning()).values()).size).toBe(1);
    const tuinMuren = new Set(murenVan(niveauPlan(plan, 0)).filter((x) => x.plus === 'tuin' || x.min === 'tuin').map((x) => `muur.0.${x.id}`));
    const volgorde = (kant: string) => {
      const g = gevelAanzichten(plan, () => undefined, planCatalogus).find((x) => x.kant === kant)!;
      const codes = g.tekening.vormen.map((v) => v.code).filter((c) => c.startsWith('muur.'));
      return codes.map((c) => tuinMuren.has(c));
    };
    // Van voor (boven) staat het tuinhuis achter de woning: eerst getekend. Van achter (onder) ervoor: laatst getekend.
    expect(volgorde('boven')[0]).toBe(true);
    expect(volgorde('onder').at(-1)).toBe(true);
    expect(volgorde('onder')[0]).toBe(false);
  });

  it('een nieuw project: linksboven op 0, 0', () => {
    const plan = woning();
    const m = ruimteUitMaten(plan, { soort: 'rechthoek', breedte: 400, diepte: 300 }, 'buiten', { soort: 'nieuw' });
    expect(m.rechthoek).toEqual({ x: 0, y: 0, b: 370, d: 270 });
    const v = ruimteUitMaten(plan, { soort: 'vierhoek', ab: 450, bc: 380, cd: 520, da: 380, ac: 640 }, 'binnen', { soort: 'nieuw' });
    expect(Math.min(...v.punten.map((q) => q[0]))).toBe(0);
    expect(Math.min(...v.punten.map((q) => q[1]))).toBe(0);
    // Binnenmaten: de omtrek een halve muur naar binnen is de gemeten vorm.
    zijdenVan(verschuifZijden(v.punten, -15)).forEach((l, i) => expect(l).toBeCloseTo([450, 380, 520, 380][i]!, 1));
  });
});
