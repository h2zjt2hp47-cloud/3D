/**
 * Schuine muren in de 3D en de tekening (ronde 2c, 16/11). De sterkste proef: een plan met alleen rechte hoeken, als
 * geheel over 30° gedraaid. Dan wordt elke muur schuin en elke opening een opening in een schuine muur; muren, afstanden
 * en de 3D van ramen en deuren moeten gelijk blijven (gedraaid). Zo is ook de draaizin (welke kant is binnen, naar waar
 * draait een deur) nagekeken, voor muren die eerst liggend en staand waren, met buiten aan de min- en de plus-kant.
 */
import { describe, expect, it } from 'vitest';
import {
  binnenVorm, isBol, langsAs, opMuur, metDeKlok, murenVan, muurVanOpening, muurVlak, openingAfstanden, plattegrond3D, ruimteMaten, snijVeelhoek,
  tekenPlattegrond, veelhoekOppervlakte, verschuifZijden, vormVanDeel, zetOmtrek,
  type Blok, type Muur, type Opening, type Plattegrond, type Punt, type Ruimte,
} from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';

const HOEK = 30;
const c = Math.cos((HOEK * Math.PI) / 180), s = Math.sin((HOEK * Math.PI) / 180);
const draai = ([x, y]: Punt): Punt => [x * c - y * s, x * s + y * c];
const ruimte = (id: string, x: number, y: number, b: number, d: number): Ruimte => ({ id, naam: id, type: 'leefruimte', x, y, b, d, vloer: 'parket_eik', wand: 'wit' });

/** Twee ruimtes naast elkaar met een raam en een deur in elke richting, buiten aan de min- en de plus-kant, en binnendeuren. */
function plan(): Plattegrond {
  const o = (id: string, soort: Opening['soort'], as: 'h' | 'v', lijn: number, midden: number, breedte: number, extra: Partial<Opening> = {}): Opening =>
    ({ id, soort, as, lijn, midden, breedte, hoogte: soort === 'raam' ? 140 : 215, borstwering: soort === 'raam' ? 90 : 0, scharnier: 'begin', naarPlus: true, positie: soort === 'raam' || soort === 'buitendeur' || soort === 'schuifraam' ? `p_${id}` : undefined, ...extra });
  return {
    ruimtes: [ruimte('a', 0, 0, 600, 400), ruimte('b', 600, 0, 400, 400)],
    openingen: [
      o('boven', 'raam', 'h', 0, 300, 160), // buiten aan de min-kant van een liggende muur
      o('onder', 'schuifraam', 'h', 400, 250, 240), // buiten aan de plus-kant
      o('links', 'buitendeur', 'v', 0, 200, 100, { scharnier: 'einde', naarPlus: true }), // buiten aan de min-kant van een staande muur
      o('rechts', 'raam', 'v', 1000, 150, 100), // buiten aan de plus-kant
      o('d1', 'binnendeur', 'v', 600, 120, 90, { naarPlus: true, scharnier: 'begin', deurtype: 'schilder' }),
      o('d2', 'binnendeur', 'v', 600, 300, 80, { naarPlus: false, scharnier: 'einde', deurtype: 'eik' }),
    ],
    meubels: [], muurhoogte: 270, buitenmuur: 30, binnenmuur: 10, gevel: { soort: 'steen', kleur: '#9c4a34' },
    gevelOntwerp: { standaard: { materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' } },
  };
}

/** Hetzelfde plan, over HOEK gedraaid rond de oorsprong: vrije vormen en openingen in schuine muren. */
function gedraaid(p: Plattegrond): Plattegrond {
  const q = structuredClone(p);
  q.ruimtes = p.ruimtes.map((r) => {
    const n = { ...r };
    zetOmtrek(n, vormVanDeel(r).map(draai));
    return n;
  });
  q.openingen = p.openingen.map((o) => {
    // Midden van de opening en de richting van haar muur, gedraaid; richting zo dat dy > 0 (zoals een schuine muur).
    const m = draai(langsAs(o, o.midden, o.lijn));
    let d = draai(o.as === 'h' ? [1, 0] : [0, 1]);
    const nOud = draai(o.as === 'h' ? [0, 1] : [1, 0]);
    let scharnier = o.scharnier;
    if (d[1] < 0) { d = [-d[0], -d[1]]; scharnier = scharnier === 'begin' ? 'einde' : 'begin'; }
    const n: Punt = [d[1], -d[0]];
    const naarPlus = nOud[0] * n[0] + nOud[1] * n[1] > 0 ? o.naarPlus : !o.naarPlus;
    return { ...o, as: 's' as const, richting: d, lijn: m[0] * n[0] + m[1] * n[1], midden: m[0] * d[0] + m[1] * d[1], scharnier, naarPlus };
  });
  return q;
}

/** Inhoud van een raam of buitendeur: een paar blokken met een code per opening (kader, vleugel opzij, vensterbank). */
const inhoud = (o: Opening) => o.positie ? {
  hoogte: o.hoogte + 4,
  blokken: [
    { code: `kader_${o.id}`, soort: 'kunststof', vorm: 'blok', x: 0, y: 0, z: 0, b: o.breedte, h: o.hoogte, d: 7, kleur: '#383e42' },
    { code: `vleugel_${o.id}`, soort: 'kunststof', vorm: 'blok', x: 5, y: 5, z: 7, b: 30, h: o.hoogte - 10, d: 5, kleur: '#383e42' },
    { code: `bank_${o.id}`, soort: 'steen', vorm: 'blok', x: -3, y: -3, z: 12, b: o.breedte + 6, h: 3, d: 25, kleur: '#999999' },
  ] as Blok[],
} : undefined;

/** De vier hoeken van een blok in het grondvlak (met zijn draaiing), afgerond, gesorteerd. */
function hoeken(b: Blok): string {
  const cx = b.x + b.b / 2, cz = b.z + b.d / 2, a = ((b.draai ?? 0) * Math.PI) / 180;
  const p = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
    const x = (u! * b.b) / 2, z = (v! * b.d) / 2;
    return [cx + x * Math.cos(a) - z * Math.sin(a), cz + x * Math.sin(a) + z * Math.cos(a)];
  });
  return p.map(([x, z]) => `${Math.round(x! * 10) / 10},${Math.round(z! * 10) / 10}`).sort().join(' ') + ` y${Math.round(b.y * 10)}h${Math.round(b.h * 10)}`;
}
const draaiBlok = (b: Blok): Blok => {
  const [x, z] = draai([b.x + b.b / 2, b.z + b.d / 2]);
  return { ...b, x: x - b.b / 2, z: z - b.d / 2, draai: (b.draai ?? 0) + HOEK };
};

describe('een plan over 30° gedraaid: alles schuin, alles gelijk', () => {
  const recht = plan(), schuin = gedraaid(recht);
  const mr = murenVan(recht), ms = murenVan(schuin);

  it('dezelfde muren: soort, lengte, dikte en de ruimtes aan elke kant', () => {
    expect(ms.every((m) => m.as === 's')).toBe(true);
    expect(ms.length).toBe(mr.length);
    for (const m of mr) {
      const [p, q] = [langsAs(m, m.van, m.lijn), langsAs(m, m.tot, m.lijn)].map(draai);
      const x = ms.find((y) => [p, q].every((a) => y.punten!.some((b) => Math.hypot(a![0] - b[0], a![1] - b[1]) < 0.01)))!;
      expect(x, m.id).toBeDefined();
      expect([x.soort, x.dikte]).toEqual([m.soort, m.dikte]);
      expect(x.tot - x.van).toBeCloseTo(m.tot - m.van, 4);
      // Een liggende muur draait zo dat haar plus-kant de min-kant wordt; een staande muur houdt haar kanten.
      expect(m.as === 'h' ? [x.min, x.plus] : [x.plus, x.min]).toEqual([m.plus, m.min]);
    }
  });

  it('elke opening staat op haar muur, met dezelfde afstanden tot de hoeken', () => {
    for (const [i, o] of recht.openingen.entries()) {
      const g = schuin.openingen[i]!;
      expect(muurVanOpening(g, ms), o.id).toBeDefined();
      const a = openingAfstanden(recht, o)!, b = openingAfstanden(schuin, g)!;
      // Liep de muur na de draaiing de andere kant op, dan wisselen begin en einde.
      const omgekeerd = draai(o.as === 'h' ? [1, 0] : [0, 1])[1] < 0;
      expect(omgekeerd ? [b.einde, b.begin] : [b.begin, b.einde], o.id).toEqual([expect.closeTo(a.begin, 4), expect.closeTo(a.einde, 4)]);
      // Een liggende muur wisselt van kant (zie hierboven), dus ook welke kant binnen is.
      expect(b.binnenPlus).toBe(o.as === 'h' ? !a.binnenPlus : a.binnenPlus);
    }
  });

  it('3D: ramen, buitendeuren en binnendeuren staan gedraaid op dezelfde plaats', () => {
    const a = plattegrond3D(recht, planCatalogus, { inhoud, meubels: false }).blokken;
    const b = plattegrond3D(schuin, planCatalogus, { inhoud, meubels: false }).blokken;
    // De blokken van ramen en deuren (niet de stukken muur onder en boven een opening: die zijn bij een schuine muur een prisma).
    const vanOpening = (x: Blok) => !/^(muur|onder|boven)_/.test(x.code) && recht.openingen.some((o) => x.code.endsWith(`_${o.id}`));
    const ra = a.filter(vanOpening), rb = b.filter(vanOpening);
    expect(rb.length).toBe(ra.length);
    expect(ra.length).toBeGreaterThan(20);
    for (const blok of ra) {
      const ander = rb.find((x) => x.code === blok.code && hoeken(x) === hoeken(draaiBlok(blok)));
      expect(ander, `${blok.code} ${hoeken(draaiBlok(blok))} / ${rb.filter((x) => x.code === blok.code).map(hoeken).join(' | ')}`).toBeDefined();
    }
  });

  it('3D: de muren nemen samen even veel plaats in (geen gat en geen overlap op de hoeken)', () => {
    const muurblok = (x: Blok) => /^(muur|onder|boven)_/.test(x.code);
    const volume = (bl: Blok[]) => bl.filter(muurblok).reduce((t, x) => t + (x.doorsnede ? veelhoekOppervlakte(x.doorsnede as Punt[]) : x.b * x.d) * x.h, 0);
    const a = plattegrond3D(recht, planCatalogus, { inhoud }).blokken, b = plattegrond3D(schuin, planCatalogus, { inhoud }).blokken;
    expect(volume(b) / 1e6).toBeCloseTo(volume(a) / 1e6, 3);
    // De vloeren ook.
    const vloer = (bl: Blok[]) => bl.filter((x) => x.code.startsWith('vloer_')).reduce((t, x) => t + (x.doorsnede ? veelhoekOppervlakte(x.doorsnede as Punt[]) : x.b * x.d), 0);
    expect(vloer(b)).toBeCloseTo(vloer(a), 3);
    // Netto oppervlakte van elke ruimte gelijk.
    for (const [i, r] of recht.ruimtes.entries()) expect(ruimteMaten(schuin, schuin.ruimtes[i]!).netto).toBeCloseTo(ruimteMaten(recht, r).netto, 2);
  });

  it('de tekening: elke muur en elke opening is er, gedraaid', () => {
    const svg = tekenPlattegrond(schuin, planCatalogus);
    expect((svg.match(/data-soort="muur"/g) ?? []).length).toBe(ms.length);
    expect((svg.match(/data-soort="opening"/g) ?? []).length).toBe(schuin.openingen.length);
    expect((svg.match(/transform="matrix\(/g) ?? []).length).toBe(schuin.openingen.length);
  });
});

/** Oppervlakte waarin twee grondvlakken elkaar overlappen (een van beide moet bol zijn). */
function overlap(a: Punt[], b: Punt[]): number {
  const [x, y] = [metDeKlok(a), metDeKlok(b)];
  if (isBol(y)) return veelhoekOppervlakte(snijVeelhoek(x, y));
  if (isBol(x)) return veelhoekOppervlakte(snijVeelhoek(y, x));
  return 0;
}
const vlakVan = (m: Muur, muren: Muur[]): Punt[] => {
  const v = muurVlak(m, muren);
  return v.punten ?? [[v.x, v.y], [v.x + v.b, v.y], [v.x + v.b, v.y + v.d], [v.x, v.y + v.d]];
};

describe('verstek: geen gat en geen overlap op de hoeken', () => {
  /** Muren + vloer (netto) vullen samen precies de buitenomtrek; geen twee muren overlappen. */
  function nakijken(p: Plattegrond, buiten: Punt[]) {
    const muren = murenVan(p);
    const vlakken = muren.map((m) => vlakVan(m, muren));
    for (let i = 0; i < vlakken.length; i++) for (let j = i + 1; j < vlakken.length; j++) {
      expect(overlap(vlakken[i]!, vlakken[j]!), `${muren[i]!.id} × ${muren[j]!.id}`).toBeLessThan(1);
    }
    const netto = p.ruimtes.reduce((t, r) => t + veelhoekOppervlakte(binnenVorm(vormVanDeel(r), muren)), 0);
    const totaal = vlakken.reduce((t, v) => t + veelhoekOppervlakte(v), 0) + netto;
    expect(totaal).toBeCloseTo(veelhoekOppervlakte(buiten), 0);
  }

  it('een scheve vierhoek (vier schuine muren, verstek op elke hoek)', () => {
    const r = ruimte('t', 0, 0, 0, 0);
    const v: Punt[] = [[0, 0], [415, 58], [452, 360], [40, 287]];
    zetOmtrek(r, v);
    const p: Plattegrond = { ...plan(), ruimtes: [r], openingen: [], buitenmuur: 20 };
    nakijken(p, verschuifZijden(v, 10));
  });

  it('een vijfhoek met een afgeschuinde hoek (schuine muur tussen een liggende en een staande)', () => {
    const r = ruimte('v', 0, 0, 0, 0);
    const v: Punt[] = [[0, 0], [600, 0], [600, 250], [400, 450], [0, 450]];
    zetOmtrek(r, v);
    const p: Plattegrond = { ...plan(), ruimtes: [r], openingen: [] };
    nakijken(p, verschuifZijden(v, 15));
  });

  it('een vierhoek met één schuine zijde, gedeeld door een liggende binnenwand', () => {
    const a = ruimte('a', 0, 0, 0, 0), b = ruimte('b', 0, 0, 0, 0);
    zetOmtrek(a, [[0, 0], [400, 0], [500, 200], [0, 200]]);
    zetOmtrek(b, [[0, 200], [500, 200], [600, 400], [0, 400]]);
    const p: Plattegrond = { ...plan(), ruimtes: [a, b], openingen: [] };
    const muren = murenVan(p);
    const vlakken = muren.map((m) => vlakVan(m, muren));
    // De binnenwand steekt een stukje in de schuine muur (dat valt erbinnen); de buitenmuren overlappen elkaar niet.
    const buitenmuren = muren.filter((m) => m.soort === 'buiten');
    for (let i = 0; i < buitenmuren.length; i++) for (let j = i + 1; j < buitenmuren.length; j++) {
      expect(overlap(vlakVan(buitenmuren[i]!, muren), vlakVan(buitenmuren[j]!, muren))).toBeLessThan(1);
    }
    expect(vlakken.length).toBe(muren.length);
  });
});

describe('aanleg voor een schuine gevel', () => {
  it('een terras voor een schuifraam in de afgeschuinde hoek ligt schuin, buiten de woning, tegels langs de gevel', () => {
    const r = ruimte('v', 0, 0, 0, 0);
    zetOmtrek(r, [[0, 0], [600, 0], [600, 250], [400, 450], [0, 450]]);
    const p: Plattegrond = { ...plan(), ruimtes: [r], openingen: [] };
    const s = murenVan(p).find((m) => m.as === 's')!;
    p.openingen.push({ id: 'sr', soort: 'schuifraam', ...opMuur(s, (s.van + s.tot) / 2), breedte: 200, hoogte: 230, borstwering: 0, scharnier: 'begin', naarPlus: true });
    const terras = plattegrond3D(p, planCatalogus, { aanleg: true }).blokken.filter((b) => b.code.startsWith('terras_sr'));
    expect(terras.length).toBe(1);
    const t = terras[0]!;
    expect(t.vorm).toBe('prisma');
    // 200 + 2 × 110 breed en 320 diep, helemaal buiten de woning (de vorm plus een halve muurdikte).
    expect(veelhoekOppervlakte(t.doorsnede as Punt[])).toBeCloseTo(420 * 320, 0);
    expect(veelhoekOppervlakte(snijVeelhoek(metDeKlok(t.doorsnede as Punt[]), verschuifZijden(vormVanDeel(r), 15)))).toBeLessThan(1);
    expect(Math.abs(t.vlakRichting!)).toBe(45);
  });
});

describe('de tekening van een vrije vorm', () => {
  it('vloer als veelhoek, schuine muur als veelhoek, deurboog gedraaid, lengte langs de muur', () => {
    const r = ruimte('v', 0, 0, 0, 0);
    zetOmtrek(r, [[0, 380], [820, 380], [820, 900], [300, 900], [0, 600]]);
    const p: Plattegrond = { ...plan(), ruimtes: [r], openingen: [] };
    const s = murenVan(p).find((m) => m.as === 's')!;
    p.openingen.push({ id: 'deur', soort: 'buitendeur', ...opMuur(s, (s.van + s.tot) / 2), breedte: 100, hoogte: 220, borstwering: 0, scharnier: 'begin', naarPlus: false });
    const svg = tekenPlattegrond(p, planCatalogus);
    // De vloer: de vijf hoekpunten (met de klok mee).
    expect(svg).toContain('<polygon data-soort="ruimte" data-id="v" points="0,380 820,380 820,900 300,900 0,600"');
    // De schuine muur: haar grondvlak als veelhoek (met verstek tegen de liggende en de staande muur).
    const muur = /<polygon data-soort="muur" data-id="s45_[^"]*" points="([^"]*)"/.exec(svg)!;
    expect(muur[1]!.split(' ').length).toBeGreaterThanOrEqual(4);
    // De deur: getekend als in een staande muur, in een groep die naar de richting van de schuine muur draait (45°).
    const f = Math.round(Math.SQRT1_2 * 1e6) / 1e6;
    expect(svg).toContain(`<g transform="matrix(${f} ${-f} ${f} ${f} 0 0)"><g data-soort="opening" data-id="deur"`);
    expect(/data-id="deur"[\s\S]*?<path d="M [^"]* A 92 92 0 0 [01] /.test(svg)).toBe(true);
    // De lengte van de schuine muur op de as: √(300² + 300²) = 424.
    expect(svg).toContain('>424</text>');
  });
});
