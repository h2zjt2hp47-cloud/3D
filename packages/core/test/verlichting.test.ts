/**
 * Verlichting in één tik (ronde 15b, 17/11): een ledstrip onder de dakrand, buitenlampen bij de deuren, tuinlampen bij
 * terras en pad, een strip rondom langs het plafond van een ruimte, en de strip over een hele muur na één tik in de
 * techniek. Wat zo komt, is gewone techniek met `voorstel` en `voorstelBij`; uit haalt precies dat weer weg.
 */
import { describe, expect, it } from 'vitest';
import {
  controleerPlan, dakrandStroken, deurLampen, puntGroep, tekenPlattegrond, murenVan, muurVanOpening, niveauPlan, PAKKET3D_VERSIE, plafondStroken, plattegrond3D, postenVan, ruimteOp,
  stripBuiten, stripOverMuur, techniekVoorKlant, telTechniek, tuinLampen, verlichtingInPlan, verlichtingStaat, wisselVerlichting, VOEDING_LEDSTRIP,
  type Leiding, type Plattegrond, type Punt,
} from '../src/index.js';
import { planCatalogus as cat } from '../voorbeelden/inrichting.js';
import { snelWoning } from '../voorbeelden/snelstart.js';
import { stijlCatalogus } from '../voorbeelden/stijlen.js';
import { uitbouwVoorbeeld } from '../voorbeelden/uitbouwvoorbeeld.js';
import { voorbeeldWoning } from '../voorbeelden/woning.js';
import { woningOpbouwCatalogus } from '../voorbeelden/woningopbouw.js';

const tc = cat.techniek!;
const lengte = (p: Punt[]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i]![0], q[1] - p[i]![1]), 0);
const woning = () => voorbeeldWoning().plan;
const klassiek = () => snelWoning({ breedte: 900, diepte: 1000, verdiepingen: 2 }, stijlCatalogus.klassiek!).plan;
const hout = () => snelWoning({ breedte: 900, diepte: 1000, verdiepingen: 2 }, stijlCatalogus.hout!).plan;
const uitbouw = () => uitbouwVoorbeeld().plan;
const kanten = (plan: Plattegrond) => dakrandStroken(plan, cat).map((g) => g.bij).sort();

describe('ledstrip onder de dakrand', () => {
  it('rondom de voorbeeldwoning: per kant, buiten, bovenaan, op elke verdieping waar een dakrand is, hoogstens 10 m per stuk', () => {
    const plan = woning();
    const groepen = dakrandStroken(plan, cat);
    expect(groepen.map((g) => g.bij).sort()).toEqual(['boven', 'links', 'onder', 'rechts']);
    for (const g of groepen) {
      for (const l of g.leidingen) {
        expect(l).toMatchObject({ soort: 'ledstrip', hoogte: 'plafond', voorstel: 'dakrand', voorstelBij: g.bij });
        expect(lengte(l.punten)).toBeLessThanOrEqual(1000);
        expect(stripBuiten(plan, { id: 'x', ...l })).toBe(true);
      }
    }
    // De tuingevel (onderkant, buitenvlak y = 915): 1 cm ervan, van buitenhoek tot buitenhoek, in twee stukken.
    const onder = groepen.find((g) => g.bij === 'onder')!.leidingen.filter((l) => (l.niveau ?? 0) === 0);
    expect(onder.flatMap((l) => l.punten).every(([, y]) => y === 916)).toBe(true);
    expect(Math.min(...onder.flatMap((l) => l.punten.map((p) => p[0])))).toBe(-16);
    expect(Math.max(...onder.flatMap((l) => l.punten.map((p) => p[0])))).toBe(1416);
    // De verdieping (links bovenaan, 820 × 380) heeft haar eigen dakrand; het gelijkvloers eronder niet.
    const links0 = groepen.find((g) => g.bij === 'links')!.leidingen.filter((l) => (l.niveau ?? 0) === 0);
    expect(links0.flatMap((l) => l.punten.map((p) => p[1])).every((y) => y >= 380)).toBe(true);
    expect(groepen.flatMap((g) => g.leidingen).some((l) => l.niveau === 1)).toBe(true);
  });
  it('onder een hellend dak alleen langs de dakvoet: zadeldak beide kanten, lessenaarsdak de lage kant', () => {
    expect(kanten(klassiek())).toEqual(['boven', 'onder']);
    expect(kanten(hout())).toEqual(['boven']);
    for (const g of dakrandStroken(klassiek(), cat)) for (const l of g.leidingen) expect(l.niveau).toBe(1);
  });
  it('niet langs een bestaande woning of een muur tegen de buren: bij de uitbouw alleen de nieuwe achtergevel', () => {
    const plan = uitbouw();
    const groepen = dakrandStroken(plan, cat);
    expect(groepen.map((g) => g.bij)).toEqual(['onder']);
    const ys = groepen[0]!.leidingen.flatMap((l) => l.punten.map((p) => p[1]));
    expect(new Set(ys).size).toBe(1);
    expect(ys[0]).toBeGreaterThan(Math.max(...plan.ruimtes.map((r) => r.y + r.d)));
  });
});

describe('buitenlampen bij de deuren', () => {
  it('naast elke deur naar buiten, tegen de gevel, nooit over een opening; een brede opening aan beide kanten', () => {
    const plan = woning();
    const muren = murenVan(niveauPlan(plan, 0));
    const groepen = deurLampen(plan, cat);
    const deuren = plan.openingen.filter((o) => (o.niveau ?? 0) === 0 && ['buitendeur', 'schuifraam', 'garagepoort'].includes(o.soort));
    expect(groepen.map((g) => g.bij).sort()).toEqual(deuren.map((o) => o.id).sort());
    for (const g of groepen) {
      const o = plan.openingen.find((x) => x.id === g.bij)!;
      expect(g.toestellen.length).toBe(o.breedte >= 250 ? 2 : 1);
      for (const t of g.toestellen) {
        expect(t).toMatchObject({ type: 'buitenlamp', aan: 'wand', voorstel: 'deuren', voorstelBij: o.id });
        // Buiten, en niet voor een opening in dezelfde muur.
        expect(ruimteOp(plan, t.x, t.y, 0)).toBeUndefined();
        const m = muurVanOpening(o, muren)!;
        for (const x of plan.openingen.filter((y) => muurVanOpening(y, muren)?.id === m.id)) {
          const s = m.as === 'h' ? t.x : t.y;
          expect(Math.abs(s - x.midden)).toBeGreaterThan(x.breedte / 2);
        }
      }
    }
  });
  it('een bestaande deur krijgt er geen; `telt` kan een deur overslaan', () => {
    const u = uitbouw(), muren = murenVan(niveauPlan(u, 0));
    const bestaand = u.openingen.filter((o) => { const m = muurVanOpening(o, muren); return m?.soort === 'buiten' && u.ruimtes.find((r) => r.id === (m.plus ?? m.min))?.bestaand; });
    expect(bestaand.some((o) => o.soort === 'buitendeur')).toBe(true);
    const bij = deurLampen(u, cat).map((g) => g.bij);
    expect(bij.length).toBeGreaterThan(0);
    for (const o of bestaand) expect(bij).not.toContain(o.id);
    const plan = woning();
    expect(deurLampen(plan, cat, { telt: (o) => o.id !== 'o1' }).map((g) => g.bij)).not.toContain('o1');
  });
});

describe('tuinlampen bij terras en pad', () => {
  it('op het gras naast het terras en langs het pad, niet in de woning of op het terras', () => {
    const plan = woning();
    const groepen = tuinLampen(plan, cat);
    expect(groepen.length).toBeGreaterThanOrEqual(2);
    const aanleg = plattegrond3D(plan, cat, { aanleg: true }).blokken.filter((b) => /^(terras|pad)_/.test(b.code));
    for (const t of groepen.flatMap((g) => g.toestellen)) {
      expect(t).toMatchObject({ type: 'tuinlamp', aan: 'buiten', voorstel: 'tuin' });
      expect(ruimteOp(plan, t.x, t.y, 0)).toBeUndefined();
      for (const b of aanleg) expect(t.x > b.x && t.x < b.x + b.b && t.y > b.z && t.y < b.z + b.d).toBe(false);
    }
  });
  it('tussen de buren niet voorbij de zijgevels (de tuin van de buren)', () => {
    const plan = uitbouw();
    const x = plan.ruimtes.filter((r) => !r.bestaand).flatMap((r) => [r.x, r.x + r.b]);
    for (const t of tuinLampen(plan, cat).flatMap((g) => g.toestellen)) {
      expect(t.x).toBeGreaterThanOrEqual(Math.min(...x));
      expect(t.x).toBeLessThanOrEqual(Math.max(...x));
    }
  });
});

describe('ledstrip rondom langs het plafond', () => {
  it('binnen in de ruimte, 1 cm van de muren, rondom, in stukken van hoogstens 10 m', () => {
    const plan = woning();
    const leef = plan.ruimtes.find((r) => r.type === 'leefruimte')!;
    const [g] = plafondStroken(plan, cat, leef.id);
    expect(g!.bij).toBe(leef.id);
    const punten = g!.leidingen.flatMap((l) => l.punten);
    expect(g!.leidingen.every((l) => lengte(l.punten) <= 1000)).toBe(true);
    for (const p of punten) expect(ruimteOp(plan, p[0], p[1], 0)?.id).toBe(leef.id);
    // Rondom: het einde van het laatste stuk is het begin van het eerste.
    expect(g!.leidingen[g!.leidingen.length - 1]!.punten.at(-1)).toEqual(g!.leidingen[0]!.punten[0]);
  });
  it('een kleine ruimte (de wc): één gesloten strip, zonder melding, te tekenen en te kiezen', () => {
    const plan = woning();
    const wc = plan.ruimtes.find((r) => r.type === 'wc')!;
    const p = structuredClone(plan);
    wisselVerlichting(p, cat, 'plafond', { bij: wc.id });
    expect(p.leidingen!.length).toBe(1);
    const l = p.leidingen![0]!;
    expect(l.punten[0]).toEqual(l.punten.at(-1));
    expect(controleerPlan(p, cat).map((m) => m.melding)).toEqual(controleerPlan(plan, cat).map((m) => m.melding));
    // Het begin en het einde liggen op dezelfde plaats maar zijn geen stuk op of neer: een greep sleept alleen dat punt.
    expect(puntGroep(l, 0)).toEqual([0]);
    expect(tekenPlattegrond(p, cat, { techniek: true })).toContain('data-soort="leiding"');
  });
  it('waar de muur op dezelfde lijn dunner wordt (buiten → binnen), een trapje en geen schuine strip', () => {
    const plan: Plattegrond = {
      ruimtes: [
        { id: 'a', naam: 'Leefruimte', type: 'leefruimte', x: 0, y: 0, b: 600, d: 400, vloer: 'parket_eik', wand: 'wit' },
        { id: 'b', naam: 'Berging', type: 'berging', x: 200, y: 400, b: 200, d: 200, vloer: 'tegel_grijs', wand: 'wit' },
      ],
      openingen: [], meubels: [], muurhoogte: 270, buitenmuur: 30, binnenmuur: 10, gevel: { soort: 'steen', kleur: '#9c4a34' },
    };
    const punten = plafondStroken(plan, cat, 'a')[0]!.leidingen.flatMap((l) => l.punten);
    for (let i = 1; i < punten.length; i++) {
      const [p, q] = [punten[i - 1]!, punten[i]!];
      expect(p[0] === q[0] || p[1] === q[1]).toBe(true);
    }
    expect(punten.some(([, y]) => y === 384)).toBe(true);
    expect(punten.some(([, y]) => y === 394)).toBe(true);
  });
  it('met lage muren: deze strip ligt bovenop de muren; een zelf getekende strip bovenaan blijft weg (zoals in ronde 15)', () => {
    const plan = woning();
    const leef = plan.ruimtes.find((r) => r.type === 'leefruimte')!;
    const p = structuredClone(plan);
    wisselVerlichting(p, cat, 'plafond', { bij: leef.id });
    const strip = plattegrond3D(p, cat, { verlichting: true, laag: 110, totNiveau: 0 }).blokken.filter((b) => b.code.includes('ledstrip') && b.code.endsWith('_licht'));
    expect(strip.length).toBeGreaterThan(0);
    for (const b of strip) expect(b.y + b.h).toBeLessThanOrEqual(110);
    expect(strip.every((b) => b.licht!.vanaf![1] < 0 && b.y + b.licht!.vanaf![1] > 0)).toBe(true);
    // Zonder het merk (zelf getekend): weg met lage muren, zoals vroeger.
    const zelf: Plattegrond = { ...p, leidingen: p.leidingen!.map(({ voorstel: _v, voorstelBij: _b, ...l }) => l as Leiding) };
    expect(plattegrond3D(zelf, cat, { verlichting: true, laag: 110, totNiveau: 0 }).blokken.some((b) => b.code.includes('ledstrip'))).toBe(false);
    // Met hoge muren hangt ze bovenaan, gemerkt of niet.
    expect(plattegrond3D(p, cat, { verlichting: true }).blokken.filter((b) => b.code.includes('ledstrip') && b.code.endsWith('_licht')).every((b) => b.y > 250)).toBe(true);
  });
});

describe('aan en uit in één tik', () => {
  for (const [naam, maak] of [['voorbeeldwoning', woning], ['woning met zadeldak', klassiek], ['uitbouw tussen de buren', uitbouw]] as const) {
    it(`${naam}: aan zet gewone techniek zonder nieuwe meldingen; uit geeft exact het plan van vroeger`, () => {
      const plan = maak();
      const voor = controleerPlan(plan, cat);
      const p = structuredClone(plan);
      for (const s of ['dakrand', 'deuren', 'tuin'] as const) {
        const u = wisselVerlichting(p, cat, s);
        expect(u.aan).toBe(true);
        expect(u.stuks).toBeGreaterThan(0);
        expect(verlichtingStaat(p, cat, s)).toBe('aan');
      }
      const leef = p.ruimtes.find((r) => r.type === 'leefruimte' && !r.bestaand)!;
      expect(wisselVerlichting(p, cat, 'plafond', { bij: leef.id }).aan).toBe(true);
      expect(controleerPlan(p, cat).map((m) => m.melding)).toEqual(voor.map((m) => m.melding));
      // De telling en de posten kennen het (één voeding per strip: geen strip langer dan 10 m).
      const tel = telTechniek(p, tc);
      const strips = tel.find((r) => r.materiaal === 'ledstrip')!;
      expect(tel.find((r) => r.materiaal === VOEDING_LEDSTRIP)!.aantal).toBe(strips.aantal);
      expect(tel.some((r) => r.materiaal === 'buitenlamp')).toBe(true);
      const elek = postenVan(p, { ...cat, opbouw: woningOpbouwCatalogus }, {}).find((x) => x.id === 'techniek:elektriciteit')!;
      expect(elek.detail.join(' ')).toMatch(/ledstrip/i);
      expect(Object.keys(techniekVoorKlant(p, { techniek: tc })!.dingen).length).toBe((p.leidingen?.length ?? 0) + (p.toestellen?.length ?? 0) - (plan.leidingen?.length ?? 0) - (plan.toestellen?.length ?? 0) + Object.keys(techniekVoorKlant(plan, { techniek: tc })?.dingen ?? {}).length);
      for (const s of ['dakrand', 'deuren', 'tuin'] as const) expect(wisselVerlichting(p, cat, s).aan).toBe(false);
      wisselVerlichting(p, cat, 'plafond', { bij: leef.id });
      expect(p).toEqual(plan);
    });
  }
  it('één gevel of één deur: alleen dat; de knop staat dan op deels, een tik vult de rest aan', () => {
    const p = woning();
    expect(wisselVerlichting(p, cat, 'dakrand', { bij: 'onder' }).aan).toBe(true);
    expect([...verlichtingInPlan(p, 'dakrand')]).toEqual(['onder']);
    expect(verlichtingStaat(p, cat, 'dakrand')).toBe('deels');
    const u = wisselVerlichting(p, cat, 'dakrand');
    expect(u.aan).toBe(true);
    expect(u.dingen).toBe(3);
    expect(verlichtingStaat(p, cat, 'dakrand')).toBe('aan');
    // Nog een tik op die ene gevel: alleen die gaat weg.
    expect(wisselVerlichting(p, cat, 'dakrand', { bij: 'onder' }).aan).toBe(false);
    expect([...verlichtingInPlan(p, 'dakrand')].sort()).toEqual(['boven', 'links', 'rechts']);
    expect(wisselVerlichting(p, cat, 'deuren', { bij: 'o8' }).aan).toBe(true);
    expect((p.toestellen ?? []).map((t) => t.voorstelBij)).toEqual(['o8']);
  });
  it('wat de verkoper zelf tekende, blijft staan', () => {
    const p = woning();
    p.leidingen = [{ id: 'eigen', soort: 'ledstrip', punten: [[840, 916], [1400, 916]], hoogte: 'plafond' }];
    p.toestellen = [{ id: 'lamp', type: 'buitenlamp', x: 120, y: 921, hoogte: 190, draai: 0, aan: 'wand' }];
    wisselVerlichting(p, cat, 'dakrand');
    wisselVerlichting(p, cat, 'deuren');
    expect(p.leidingen.length).toBeGreaterThan(1);
    wisselVerlichting(p, cat, 'dakrand');
    wisselVerlichting(p, cat, 'deuren');
    expect(p.leidingen.map((l) => l.id)).toEqual(['eigen']);
    expect(p.toestellen.map((t) => t.id)).toEqual(['lamp']);
  });
  it('zonder eigen id: vaste ids uit het voorstel (hetzelfde plan, dezelfde ids, dus hetzelfde beeld), nooit dubbel', () => {
    const a = woning(), b = woning();
    for (const p of [a, b]) for (const s of ['dakrand', 'deuren', 'tuin'] as const) wisselVerlichting(p, cat, s);
    expect(a.leidingen!.map((l) => l.id)).toEqual(b.leidingen!.map((l) => l.id));
    expect(a.toestellen!.map((t) => t.id)).toContain('deuren_o9_2');
    const ids = [...a.leidingen!, ...a.toestellen!].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    const c = woning();
    c.leidingen = [{ id: 'dakrand_onder_1', soort: 'ledstrip', punten: [[0, 1000], [100, 1000]], hoogte: 20 }];
    wisselVerlichting(c, cat, 'dakrand');
    expect(c.leidingen.map((l) => l.id)).toContain('dakrand_onder_1_2');
  });
  it('met een eigen id; het 3D-pakket blijft op versie 4', () => {
    const p = woning();
    let n = 0;
    wisselVerlichting(p, cat, 'deuren', { nieuweId: (x) => `${x}-${++n}` });
    expect(p.toestellen!.map((t) => t.id)).toEqual(p.toestellen!.map((_, i) => `t-${i + 1}`));
    expect(PAKKET3D_VERSIE).toBe(4);
  });
});

describe('één tik op een muur (de tegel Ledstrip)', () => {
  it('binnen langs de hele muur van de ruimte, buiten langs de hele gevel, ver van een muur niets', () => {
    const plan = woning();
    expect(stripOverMuur(plan, [300, 880], 0)).toEqual({ punten: [[814, 884], [16, 884]], buiten: false });
    expect(stripOverMuur(plan, [500, 960], 0)).toEqual({ punten: [[1416, 916], [-16, 916]], buiten: true });
    expect(stripOverMuur(plan, [500, 1500], 0)).toBeUndefined();
  });
  it('een opening die tot tegen de strip reikt, onderbreekt ze', () => {
    const plan = woning();
    // Een raam tot bovenaan in de tuingevel van de leefruimte (x 300 tot 400): de strip stopt ervoor of begint erna.
    plan.openingen.push({ id: 'hoog', soort: 'raam', as: 'h', lijn: 900, midden: 350, breedte: 100, hoogte: 260, borstwering: 10, scharnier: 'begin', naarPlus: false });
    expect(stripOverMuur(plan, [200, 880], 0)!.punten).toEqual([[300, 884], [16, 884]]);
    expect(stripOverMuur(plan, [600, 880], 0)!.punten).toEqual([[814, 884], [400, 884]]);
    // Een gewoon raam (tot 2,40 m) blijft onder de strip bovenaan; onder een kast (1,45 m) zou ze erover lopen: dan wel.
    plan.openingen.push({ id: 'gewoon', soort: 'raam', as: 'h', lijn: 900, midden: 650, breedte: 100, hoogte: 150, borstwering: 90, scharnier: 'begin', naarPlus: false });
    expect(stripOverMuur(plan, [600, 880], 0)!.punten).toEqual([[814, 884], [400, 884]]);
    expect(stripOverMuur(plan, [500, 880], 0, 145)!.punten).toEqual([[600, 884], [400, 884]]);
  });
});
