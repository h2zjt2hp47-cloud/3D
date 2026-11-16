import { describe, expect, it } from 'vitest';
import {
  dakvlak, ligger, paal, schatBalk, schatBouwdeel, spant, vloervlak, wandvlak, STABILITEIT_BUITEN_BEREIK, STABILITEIT_VOORBEHOUD,
  type BalkInvoer, type BalkUitkomst, type Bouwdeel, type BouwdeelSchatting, type OpbouwHerkomst, type Richtwaarde, type StabiliteitsWaarden,
} from '../src/index.js';
import { bouwMaterialen as M, opbouwen as O } from '../voorbeelden/opbouwen.js';
import { stabiliteitswaarden as S } from '../voorbeelden/stabiliteitswaarden.js';

/**
 * Een eigen, kleine tabel met ronde getallen. De handberekeningen hieronder hangen zo niet af van de richtwaarden in
 * voorbeelden/stabiliteitswaarden.ts: verbetert een ingenieur daar een waarde, dan blijven deze tests kloppen.
 */
const proef = (nagelezen = false): OpbouwHerkomst => ({ bron: 'algemene kennis', verwijzing: 'proefwaarde voor de test', nagelezen });
const proefWaarden = (nagelezen = false): StabiliteitsWaarden => {
  const w = (waarde: number): Richtwaarde => ({ waarde, herkomst: proef(nagelezen) });
  return {
    houtklassen: { P24: { buigsterkte: 24, elasticiteit: 11000, dichtheid: 400, herkomst: proef(nagelezen) } },
    standaardHoutklasse: 'P24',
    lasten: {
      vloer_woning: { naam: 'proefvloer', blijvend: 1, veranderlijk: 2, duur: 'middellang', langdurigDeel: 0.3, klimaatklasse: 1, herkomst: proef(nagelezen) },
      plat_dak: { naam: 'proefdak', blijvend: 1, veranderlijk: 1, duur: 'kort', langdurigDeel: 0, klimaatklasse: 2, herkomst: proef(nagelezen) },
      hellend_dak: { naam: 'proefhelling', blijvend: 1, veranderlijk: 1, duur: 'kort', langdurigDeel: 0, klimaatklasse: 2, herkomst: proef(nagelezen) },
    },
    factoren: {
      lastBlijvend: w(1.35), lastVeranderlijk: w(1.5), materiaal: w(1.3),
      duur: { blijvend: w(0.6), middellang: w(0.8), kort: w(0.9) },
      kruip: { 1: w(0.6), 2: w(0.8) },
    },
    doorbuiging: { vloerbalk: w(300), dakbalk: w(300), keper: w(250), latei: w(500) },
    // Bewust niet op volgorde: het voorstel zoekt zelf de kleinste.
    doorsneden: { lijst: [{ breedte: 75, hoogte: 300 }, { breedte: 50, hoogte: 250 }, { breedte: 75, hoogte: 250 }, { breedte: 50, hoogte: 200 }], herkomst: proef(nagelezen) },
  };
};
/** De balk van de handberekening: 50 × 200 mm om de 50 cm over 4 m, als vloerbalk. */
const proefbalk = (extra: Partial<BalkInvoer> = {}): BalkInvoer => ({ rol: 'vloerbalk', overspanning: 400, doorsnede: { breedte: 50, hoogte: 200 }, belasteBreedte: 50, ...extra });
const vloerbalk = (overspanning: number, extra: Partial<BalkInvoer> = {}): BalkInvoer => ({ rol: 'vloerbalk', overspanning, doorsnede: { breedte: 70, hoogte: 220 }, belasteBreedte: 40, ...extra });
/** Nergens een NaN of een oneindig getal, de vaste zinnen staan erbij, en de uitkomst gaat naar JSON en terug zonder verlies. */
function gewoneGegevens(u: BalkUitkomst | BouwdeelSchatting) {
  const kijk = (x: unknown): void => {
    if (typeof x === 'number') expect(Number.isFinite(x)).toBe(true);
    else if (Array.isArray(x)) x.forEach(kijk);
    else if (x && typeof x === 'object') Object.values(x).forEach(kijk);
  };
  kijk(u);
  expect(u.voorbehoud).toBe(STABILITEIT_VOORBEHOUD);
  expect(u.buitenBereik).toBe(STABILITEIT_BUITEN_BEREIK);
  if ('onderdelen' in u) for (const o of u.onderdelen) gewoneGegevens(o.uitkomst);
  expect(JSON.parse(JSON.stringify(u))).toStrictEqual(u);
}
const nietTeZeggen = (invoer: BalkInvoer, tabel = proefWaarden()) => {
  const u = schatBalk(invoer, tabel);
  expect(u.oordeel).toBe('niet te zeggen');
  expect(u.benutting).toBeNull();
  expect(u.getallen).toBeNull();
  expect(u.voorstel).toBeUndefined();
  expect(u.ontbreekt.length).toBeGreaterThan(0);
  gewoneGegevens(u);
  return u.ontbreekt.join(' ');
};

describe('stabiliteit: met de hand nagerekend', () => {
  it('rekent de buigspanning en de doorbuiging van een balk op twee steunpunten', () => {
    const u = schatBalk(proefbalk(), proefWaarden());
    // Last per meter balk: 1 kN/m² × 0,5 m = 0,5 blijvend en 2 × 0,5 = 1,0 veranderlijk.
    // W = 50 × 200² / 6 = 333 333 mm³; I = 50 × 200³ / 12 = 33 333 333 mm⁴.
    // Sterkte: q = 1,35 × 0,5 + 1,5 × 1,0 = 2,175 N/mm; M = 2,175 × 4000² / 8 = 4 350 000 Nmm; spanning = 13,05 N/mm².
    //   Toegelaten: 0,8 × 24 / 1,3 = 14,77 N/mm² → 88 %. (Alleen blijvend: 4,05 tegenover 0,6 × 24 / 1,3 = 11,08 → 37 %.)
    // Doorbuiging per N/mm: 5 × 4000⁴ / (384 × 11000 × 33 333 333) = 9,0909 mm.
    //   Blijvend 0,5 × 9,0909 × (1 + 0,6) = 7,27; veranderlijk 1,0 × 9,0909 × (1 + 0,3 × 0,6) = 10,73; samen 18,0 mm.
    //   Grens 4000 / 300 = 13,3 mm → 135 %.
    expect(u.getallen).toEqual({ blijvend: 0.5, veranderlijk: 1, spanning: 13.05, toegelatenSpanning: 14.77, doorbuiging: 18, toegelatenDoorbuiging: 13.3 });
    expect(u.benutting).toEqual({ sterkte: 88, doorbuiging: 135 });
    expect(u.oordeel).toBe('te licht');
    expect(u.ontbreekt).toEqual([]);
    expect(u.aannames.join(' ')).toMatch(/Maatgevend: blijvend en veranderlijk samen, buigspanning 13,05 N\/mm² tegenover toegelaten 14,77 N\/mm²/);
    expect(u.aannames.join(' ')).toMatch(/Uitkomst 18,0 mm tegenover de grens overspanning \/ 300 = 13,3 mm/);
    expect(u.aannames.join(' ')).toMatch(/Hout P24 \(aangenomen: er is geen houtklasse opgegeven\)/);
    gewoneGegevens(u);
  });

  it('neemt de blijvende last alleen als die zwaarder weegt', () => {
    // Zonder veranderlijke last telt alleen het geval "blijvend": 1,35 × 0,5 = 0,675 N/mm → 4,05 N/mm² tegenover 11,08.
    const tabel = proefWaarden();
    tabel.lasten.vloer_woning.veranderlijk = 0;
    const u = schatBalk(proefbalk(), tabel);
    expect(u.getallen).toMatchObject({ spanning: 4.05, toegelatenSpanning: 11.08 });
    expect(u.benutting!.sterkte).toBe(37);
    expect(u.aannames.join(' ')).toMatch(/Maatgevend: de blijvende last alleen/);
  });

  it('rekent bij een keper alleen het deel van de last dwars op de helling', () => {
    // Helling 60°: cos = 0,5. Blijvend (per m² dakvlak) 1 × 0,5 × 0,5 m = 0,25; veranderlijk (per m² horizontaal) 1 × 0,5² × 0,5 m = 0,125.
    const u = schatBalk({ rol: 'keper', overspanning: 300, doorsnede: { breedte: 50, hoogte: 200 }, belasteBreedte: 50, helling: 60 }, proefWaarden());
    expect(u.getallen).toMatchObject({ blijvend: 0.25, veranderlijk: 0.125 });
    // Sterkte: (1,35 × 0,25 + 1,5 × 0,125) × 3000² / 8 / 333 333 = 1,77 N/mm² tegenover 0,9 × 24 / 1,3 = 16,62 → 11 %.
    // Doorbuiging per N/mm: 5 × 3000⁴ / (384 × 11000 × 33 333 333) = 2,8764; 0,25 × 2,8764 × 1,8 + 0,125 × 2,8764 = 1,65 mm; grens 3000 / 250 = 12 mm → 14 %.
    expect(u.getallen).toMatchObject({ spanning: 1.77, toegelatenSpanning: 16.62, doorbuiging: 1.7, toegelatenDoorbuiging: 12 });
    expect(u.benutting).toEqual({ sterkte: 11, doorbuiging: 14 });
    expect(u.oordeel).toBe('volstaat');
    expect(u.voorstel).toBeUndefined();
    gewoneGegevens(u);
    // Zonder helling is er onder een hellend dak niets te zeggen.
    expect(nietTeZeggen({ rol: 'keper', overspanning: 300, doorsnede: { breedte: 50, hoogte: 200 }, belasteBreedte: 50 })).toMatch(/De helling van het dak ontbreekt/);
  });

  it('rekent bij een latei de strook dak of vloer die erop rust, plus haar eigen gewicht', () => {
    const latei: BalkInvoer = { rol: 'latei', draagt: 'plat_dak', overspanning: 300, doorsnede: { breedte: 100, hoogte: 200 }, belasteBreedte: 200 };
    // Eigen gewicht: 400 kg/m³ × 0,1 × 0,2 m² × 9,81 = 78,5 N/m = 0,078 kN/m. Blijvend 1 × 2 m + 0,078 = 2,078; veranderlijk 1 × 2 = 2.
    const u = schatBalk(latei, proefWaarden());
    expect(u.getallen).toMatchObject({ blijvend: 2.078, veranderlijk: 2 });
    expect(u.aannames.join(' ')).toMatch(/eigen gewicht van de latei \(0,078 kN\/m/);
    expect(u.aannames.join(' ')).toMatch(/Het gewicht van de wand boven de latei is niet meegerekend/);
    // Onder een hellend dak van 60°: de blijvende last van het dakvlak gedeeld door cos 60° = 0,5 → 4 + 0,078.
    expect(schatBalk({ ...latei, draagt: 'hellend_dak', helling: 60 }, proefWaarden()).getallen).toMatchObject({ blijvend: 4.078, veranderlijk: 2 });
    // Een latei moet weten wat er op de wand rust.
    expect(nietTeZeggen({ rol: 'latei', overspanning: 300, doorsnede: { breedte: 100, hoogte: 200 }, belasteBreedte: 200 })).toMatch(/weet niet wat er op de latei rust/);
  });
});

describe('stabiliteit: gedrag', () => {
  it('een grotere overspanning maakt het slechter, voor sterkte en voor doorbuiging', () => {
    const reeks = [300, 350, 400, 450, 500, 600].map((L) => schatBalk(vloerbalk(L), S).benutting!);
    for (let i = 1; i < reeks.length; i++) {
      expect(reeks[i]!.sterkte).toBeGreaterThan(reeks[i - 1]!.sterkte);
      expect(reeks[i]!.doorbuiging).toBeGreaterThan(reeks[i - 1]!.doorbuiging);
    }
    // Twee keer zo lang: het moment vier keer zo groot, de doorbuiging tegenover haar grens acht keer.
    const kort = schatBalk(proefbalk({ overspanning: 200 }), proefWaarden()).getallen!, lang = schatBalk(proefbalk(), proefWaarden()).getallen!;
    expect(lang.spanning / kort.spanning).toBeCloseTo(4, 1);
    expect(lang.doorbuiging / kort.doorbuiging).toBeCloseTo(16, 0);
    // Meer last per balk (verder uit elkaar) en lichter hout zijn ook slechter.
    expect(schatBalk(vloerbalk(400, { belasteBreedte: 60 }), S).benutting!.doorbuiging).toBeGreaterThan(schatBalk(vloerbalk(400), S).benutting!.doorbuiging);
    const perKlasse = ['C18', 'C24', 'C30'].map((houtklasse) => schatBalk(vloerbalk(400, { houtklasse }), S).benutting!);
    expect(perKlasse[0]!.sterkte).toBeGreaterThan(perKlasse[1]!.sterkte);
    expect(perKlasse[1]!.sterkte).toBeGreaterThan(perKlasse[2]!.sterkte);
    expect(perKlasse[0]!.doorbuiging).toBeGreaterThan(perKlasse[1]!.doorbuiging);
  });

  it('"te licht" geeft een zwaarder voorstel dat zelf wel volstaat', () => {
    // De handberekening: 50 × 200 is te licht; de kleinste uit de proeflijst die volstaat, is 50 × 250 (sterkte 57 %, doorbuiging 69 %).
    const u = schatBalk(proefbalk(), proefWaarden());
    expect(u.voorstel!.doorsnede).toEqual({ breedte: 50, hoogte: 250 });
    expect(u.voorstel!.tekst).toMatch(/Neem minstens 50 × 250 mm.*sterkte 57 %, doorbuiging 69 %/);
    const beter = schatBalk(proefbalk({ doorsnede: u.voorstel!.doorsnede! }), proefWaarden());
    expect(beter.oordeel).toBe('volstaat');
    expect(beter.benutting).toEqual({ sterkte: 57, doorbuiging: 69 });
    // Met de voorbeeldtabel: de roostering van 70 × 220 om de 40 cm over 6 m.
    const lang = schatBalk(vloerbalk(600), S);
    expect(lang.oordeel).toBe('te licht');
    const d = lang.voorstel!.doorsnede!;
    expect(S.doorsneden.lijst).toContainEqual(d);
    expect(d.breedte * d.hoogte ** 3).toBeGreaterThan(70 * 220 ** 3);
    expect(schatBalk(vloerbalk(600, { doorsnede: d }), S).oordeel).toBe('volstaat');
    // Geen kleinere doorsnede uit de lijst volstaat ook.
    const kleiner = S.doorsneden.lijst.filter((x) => x.breedte * x.hoogte < d.breedte * d.hoogte);
    expect(kleiner.length).toBeGreaterThan(0);
    for (const x of kleiner) expect(schatBalk(vloerbalk(600, { doorsnede: x }), S).oordeel).toBe('te licht');
    // Volstaat geen enkele doorsnede uit de lijst, dan staat dat er zo.
    const veelTeLang = schatBalk(proefbalk({ overspanning: 1200 }), proefWaarden());
    expect(veelTeLang.oordeel).toBe('te licht');
    expect(veelTeLang.voorstel!.doorsnede).toBeUndefined();
    expect(veelTeLang.voorstel!.tekst).toMatch(/kleinere overspanning of een andere oplossing nodig/);
    gewoneGegevens(veelTeLang);
  });

  it('de roostering van de voorbeelden draagt een woonvloer over 4 m, een latei van 190 mm over 4 m volstaat niet', () => {
    expect(schatBalk(vloerbalk(400), S)).toMatchObject({ oordeel: 'volstaat', nagelezen: false });
    // Het hefschuifraam van een uitbouw: op de latei rust de helft van een plat dak van 5 m.
    const latei = schatBalk({ rol: 'latei', draagt: 'plat_dak', overspanning: 404, doorsnede: { breedte: 140, hoogte: 190 }, belasteBreedte: 250 }, S);
    expect(latei.oordeel).toBe('te licht');
    expect(latei.benutting!.doorbuiging).toBeGreaterThan(150);
    // Een voorstel voor een latei moet in de wand passen (niet breder dan de latei zelf).
    if (latei.voorstel!.doorsnede) expect(latei.voorstel!.doorsnede.breedte).toBeLessThanOrEqual(140);
    else expect(latei.voorstel!.tekst).toMatch(/die in de wand past \(hoogstens 140 mm breed\).*kleinere overspanning of een andere oplossing nodig/);
  });

  it('zegt "niet te zeggen" met de reden bij een ontbrekende of ongeldige invoer of tabel, en geeft nooit NaN', () => {
    expect(nietTeZeggen(proefbalk({ overspanning: 0 }))).toMatch(/De overspanning ontbreekt of is niet groter dan nul/);
    expect(nietTeZeggen(proefbalk({ overspanning: Number.NaN }))).toMatch(/De overspanning ontbreekt/);
    expect(nietTeZeggen(proefbalk({ doorsnede: { breedte: 50, hoogte: 0 } }))).toMatch(/De doorsnede ontbreekt/);
    expect(nietTeZeggen(proefbalk({ belasteBreedte: -40 }))).toMatch(/De hart-op-hartafstand ontbreekt/);
    expect(nietTeZeggen(proefbalk({ houtklasse: 'C99' }))).toMatch(/De houtklasse «C99» staat niet in de tabel/);
    expect(nietTeZeggen({ ...proefbalk(), rol: 'kolom' as BalkInvoer['rol'] })).toMatch(/zegt niet wat voor balk dit is/);
    expect(nietTeZeggen(undefined as unknown as BalkInvoer)).toMatch(/zegt niet wat voor balk dit is/);
    // Meerdere dingen tegelijk: alle redenen staan erbij.
    expect(nietTeZeggen(proefbalk({ overspanning: 0, houtklasse: 'C99' }))).toMatch(/overspanning.*houtklasse/);
    // De tabel.
    const zonderFactor = proefWaarden();
    delete (zonderFactor.factoren as Partial<StabiliteitsWaarden['factoren']>).materiaal;
    expect(nietTeZeggen(proefbalk(), zonderFactor)).toMatch(/ontbreekt de materiaalfactor voor hout/);
    const nulGrens = proefWaarden();
    nulGrens.doorbuiging.vloerbalk = { waarde: 0, herkomst: proef() };
    expect(nietTeZeggen(proefbalk(), nulGrens)).toMatch(/ontbreekt de grens voor de doorbuiging van een vloerbalk/);
    const zonderLast = proefWaarden();
    delete (zonderLast.lasten as Partial<StabiliteitsWaarden['lasten']>).vloer_woning;
    expect(nietTeZeggen(proefbalk(), zonderLast)).toMatch(/geen belasting voor «vloer_woning»/);
    const slechteKlasse = proefWaarden();
    slechteKlasse.houtklassen.P24!.elasticiteit = 0;
    expect(nietTeZeggen(proefbalk(), slechteKlasse)).toMatch(/geen geldige buigsterkte, elasticiteit of dichtheid/);
    // Zonder tabel (hier rechtstreeks: een lege parameter zou de proeftabel van de hulpfunctie nemen).
    const zonderTabel = schatBalk(proefbalk(), undefined as unknown as StabiliteitsWaarden);
    expect(zonderTabel.oordeel).toBe('niet te zeggen');
    expect(zonderTabel.ontbreekt.join(' ')).toMatch(/De tabel met stabiliteitswaarden ontbreekt/);
    gewoneGegevens(zonderTabel);
  });

  it('waarschuwt als een maat wellicht in de verkeerde eenheid staat (cm voor het gebouw, mm voor het hout)', () => {
    const letOp = (extra: Partial<BalkInvoer>) => schatBalk(vloerbalk(400, extra), S).aannames.filter((a) => a.startsWith('Let op'));
    expect(letOp({})).toEqual([]);
    // De hart-op-hartafstand van een opbouw staat in mm: 400 "cm" is een vergissing, en geeft stil "te licht".
    expect(letOp({ belasteBreedte: 400 }).join(' ')).toMatch(/hart-op-hartafstand van 400 cm is ongewoon.*niet in mm/);
    // Een overspanning in meter (4 in plaats van 400) zou stil "volstaat" geven.
    expect(schatBalk(vloerbalk(4), S).oordeel).toBe('volstaat');
    expect(letOp({ overspanning: 4 }).join(' ')).toMatch(/overspanning van 4 cm is ongewoon/);
    expect(letOp({ doorsnede: { breedte: 7, hoogte: 22 } }).join(' ')).toMatch(/doorsnede van 7 × 22 mm is ongewoon/);
    // Bij een latei is de belaste breedte een strook dak of vloer: die mag breed zijn.
    const latei = schatBalk({ rol: 'latei', draagt: 'plat_dak', overspanning: 120, doorsnede: { breedte: 140, hoogte: 190 }, belasteBreedte: 250 }, S);
    expect(latei.aannames.filter((a) => a.startsWith('Let op'))).toEqual([]);
  });

  it('zegt bij elke uitkomst dat het een schatting is, wat erbuiten valt en of de waarden nagelezen zijn', () => {
    expect(STABILITEIT_VOORBEHOUD).toBe('Schatting; een ingenieur rekent na.');
    for (const woord of ['staal', 'funderingen', 'windverband', 'verbindingen', 'knik', 'puntlasten', 'sneeuwophoping', 'opwaaien']) expect(STABILITEIT_BUITEN_BEREIK).toContain(woord);
    const u = schatBalk(vloerbalk(400), S);
    gewoneGegevens(u);
    expect(u.nagelezen).toBe(false);
    expect(u.aannames.join(' ')).toMatch(/richtwaarden, niet nagelezen/);
    expect(u.aannames.join(' ')).toMatch(/Niet nagekeken: dwarskracht, druk op de oplegging, trillingen/);
    // Met een tabel waarin alles nagelezen is, zegt de uitkomst dat ook; de vaste zin blijft.
    const klaar = schatBalk(proefbalk(), proefWaarden(true));
    expect(klaar.nagelezen).toBe(true);
    expect(klaar.aannames.join(' ')).not.toMatch(/niet nagelezen/);
    expect(klaar.voorbehoud).toBe(STABILITEIT_VOORBEHOUD);
  });
});

describe('stabiliteit: een heel bouwdeel nalopen', () => {
  const balken = (d: Bouwdeel, rol: string) => d.stukken.filter((s) => s.rol === rol);

  it('loopt een vloervlak na: de balken over de maat van het vlak in hun richting', () => {
    const vloer = vloervlak({ lengte: 600, breedte: 400, opbouw: O.verdiepingsvloer_hout! }, M);
    const s = schatBouwdeel(vloer, S);
    expect(s.soort).toBe('vloervlak');
    expect(s.onderdelen).toHaveLength(1);
    const o = s.onderdelen[0]!;
    // De balken lopen over de kortste maat (4 m), 70 × 220 mm om de 40 cm, als vloer van een woning.
    expect(o.invoer).toEqual({ rol: 'vloerbalk', overspanning: 400, doorsnede: { breedte: 70, hoogte: 220 }, belasteBreedte: 40 });
    expect(o.stukken).toEqual(balken(vloer, 'balk').map((b) => b.code));
    expect(o.stukken.length).toBeGreaterThan(10);
    expect(o.wat).toBe(`${o.stukken.length} vloerbalken van 70 × 220 mm om de 40 cm, over 400 cm`);
    expect(o.uitkomst).toEqual(schatBalk(o.invoer, S));
    expect(o.uitkomst.oordeel).toBe('volstaat');
    expect(s.oordeel).toBe('volstaat');
    expect(s.aannames.join(' ')).toMatch(/over de volle maat van het vlak in hun richting \(400 cm\), zonder steunpunt ertussen/);
    expect(s.nietNagekeken.join(' ')).toMatch(/randbalken/);
    gewoneGegevens(s);
    // De andere richting: dezelfde balken over 6 m zijn te licht, en het oordeel van het bouwdeel volgt.
    const dwars = schatBouwdeel(vloervlak({ lengte: 600, breedte: 400, opbouw: O.verdiepingsvloer_hout!, richting: 'x' }, M), S);
    expect(dwars.onderdelen[0]!.invoer.overspanning).toBe(600);
    expect(dwars.oordeel).toBe('te licht');
    expect(dwars.onderdelen[0]!.uitkomst.voorstel).toBeDefined();
    // Een opgegeven houtklasse gaat mee naar elke balk.
    const c18 = schatBouwdeel(vloer, S, { houtklasse: 'C18' });
    expect(c18.onderdelen[0]!.invoer.houtklasse).toBe('C18');
    expect(c18.onderdelen[0]!.uitkomst.benutting!.sterkte).toBeGreaterThan(o.uitkomst.benutting!.sterkte);
    // Het bouwdeel is gewone gegevens: na JSON geeft het dezelfde schatting.
    expect(schatBouwdeel(JSON.parse(JSON.stringify(vloer)) as Bouwdeel, S)).toEqual(s);
  });

  it('loopt een wand met een brede opening na: de latei over haar opening', () => {
    // De wand van een uitbouw met een hefschuifraam van 4 m; op de wand rust de helft van een plat dak van 5 m.
    const wand = wandvlak({ lengte: 600, hoogte: 280, opbouw: O.hsb_hout!, openingen: [{ soort: 'deur', x: 100, breedte: 400, hoogte: 230 }] }, M);
    expect(wand.meldingen).toEqual([]);
    const s = schatBouwdeel(wand, S, { opWand: { draagt: 'plat_dak', belasteBreedte: 250 } });
    expect(s.onderdelen).toHaveLength(1);
    const o = s.onderdelen[0]!;
    // De latei van het bouwdeel zelf: 140 mm (de dikte van het skelet) × 190 mm hoog, over de opening plus één stijl.
    expect(o.invoer).toEqual({ rol: 'latei', draagt: 'plat_dak', overspanning: 403.8, doorsnede: { breedte: 140, hoogte: 190 }, belasteBreedte: 250 });
    expect(o.stukken).toEqual(['skelet.latei.1']);
    expect(o.wat).toBe('Latei 1 van 140 × 190 mm boven een opening van 400 cm');
    expect(o.uitkomst.oordeel).toBe('te licht');
    expect(o.uitkomst.voorstel).toBeDefined();
    expect(s.oordeel).toBe('te licht');
    expect(s.aannames.join(' ')).toMatch(/Op de wand rust \(opgegeven\): plat dak, over een breedte van 250 cm/);
    expect(s.nietNagekeken.join(' ')).toMatch(/De stijlen, de draagstijlen naast een opening en de regels zijn niet nagekeken/);
    gewoneGegevens(s);
    // Zonder te zeggen wat er op de wand rust, is er niets te zeggen.
    const onbekend = schatBouwdeel(wand, S);
    expect(onbekend.oordeel).toBe('niet te zeggen');
    expect(onbekend.onderdelen[0]!.uitkomst.oordeel).toBe('niet te zeggen');
    expect(onbekend.onderdelen[0]!.uitkomst.ontbreekt.join(' ')).toMatch(/weet niet wat er op deze wand rust/);
    gewoneGegevens(onbekend);
    // Een smal raam in dezelfde wand volstaat wel; één te lichte latei maakt het hele bouwdeel te licht.
    const twee = wandvlak({ lengte: 800, hoogte: 280, opbouw: O.hsb_hout!, openingen: [{ soort: 'raam', x: 60, breedte: 90, hoogte: 120, borstwering: 90 }, { soort: 'deur', x: 300, breedte: 400, hoogte: 230 }] }, M);
    const beide = schatBouwdeel(twee, S, { opWand: { draagt: 'plat_dak', belasteBreedte: 250 } });
    expect(beide.onderdelen.map((x) => x.uitkomst.oordeel)).toEqual(['volstaat', 'te licht']);
    expect(beide.oordeel).toBe('te licht');
    const alleenRaam = wandvlak({ lengte: 400, hoogte: 280, opbouw: O.hsb_hout!, openingen: [{ soort: 'raam', x: 60, breedte: 90, hoogte: 120, borstwering: 90 }] }, M);
    expect(schatBouwdeel(alleenRaam, S, { opWand: { draagt: 'plat_dak', belasteBreedte: 250 } }).oordeel).toBe('volstaat');
  });

  it('leest de overspanning van een latei uit het stuk zelf, ook als het bouwdeel de opening ingekort heeft', () => {
    const wand = wandvlak({ lengte: 300, hoogte: 260, opbouw: O.hsb_hout!, openingen: [{ soort: 'deur', x: 0, breedte: 300, hoogte: 215 }] }, M);
    expect(wand.meldingen.join(' ')).toMatch(/ingekort/);
    const latei = balken(wand, 'latei')[0]!;
    const o = schatBouwdeel(wand, S, { opWand: { draagt: 'vloer_woning', belasteBreedte: 200 } }).onderdelen[0]!;
    // De latei ligt aan elke kant één stijl (38 mm) op een draagstijl: de overspanning is haar lengte min één stijl.
    expect(o.invoer.overspanning).toBeCloseTo(latei.lengte - 3.8, 6);
    expect(o.invoer.overspanning).toBeLessThan(300);
    expect(o.invoer.doorsnede).toEqual({ breedte: latei.doorsnede.breedte, hoogte: latei.doorsnede.hoogte });
    expect(o.invoer.draagt).toBe('vloer_woning');
  });

  it('loopt een dak na: de balken van een plat dak, de kepers van een hellend dak met of zonder gording', () => {
    const plat = schatBouwdeel(dakvlak({ lengte: 600, diepte: 500, opbouw: O.plat_dak_warm! }, M), S);
    expect(plat.onderdelen[0]!.invoer).toEqual({ rol: 'dakbalk', overspanning: 500, doorsnede: { breedte: 70, hoogte: 220 }, belasteBreedte: 40 });
    expect(plat.oordeel).toBe('volstaat');
    gewoneGegevens(plat);

    const dak = dakvlak({ lengte: 800, diepte: 400, helling: 40, opbouw: O.hellend_dak_pannen! }, M);
    const zonder = schatBouwdeel(dak, S);
    const keper = zonder.onderdelen[0]!;
    // 400 cm horizontaal onder 40°: 400 / cos 40° = 522,16 cm langs de helling.
    expect(keper.invoer).toEqual({ rol: 'keper', overspanning: 522.16, doorsnede: { breedte: 50, hoogte: 180 }, belasteBreedte: 45, helling: 40 });
    expect(keper.stukken).toEqual(balken(dak, 'keper').map((k) => k.code));
    expect(zonder.oordeel).toBe('te licht');
    expect(zonder.aannames.join(' ')).toMatch(/zonder gording ertussen/);
    expect(zonder.aannames.join(' ')).toMatch(/met de oversteek erbij/);
    expect(zonder.nietNagekeken.join(' ')).toMatch(/Muurplaat, gordingen en nokbalk/);
    gewoneGegevens(zonder);
    // Eén gording halverwege: twee velden van de helft.
    const met = schatBouwdeel(dak, S, { gordingen: 1 });
    expect(met.onderdelen[0]!.invoer.overspanning).toBe(261.08);
    expect(met.oordeel).toBe('volstaat');
    expect(met.aannames.join(' ')).toMatch(/in 2 gelijke velden tussen dakvoet, één gording en nok/);
  });

  it('zegt eerlijk wat het niet nakijkt: geen skelet, geen opening, paal, ligger en spant', () => {
    const geen = (d: Bouwdeel, reden: RegExp) => {
      const s = schatBouwdeel(d, S);
      expect(s.oordeel).toBe('niet te zeggen');
      expect(s.onderdelen).toEqual([]);
      expect(s.nietNagekeken.join(' ')).toMatch(reden);
      gewoneGegevens(s);
    };
    geen(wandvlak({ lengte: 400, hoogte: 260, opbouw: O.spouwmuur! }, M), /geen houten skelet: metselwerk, beton en lateien in beton of staal vallen buiten deze schatting/);
    geen(vloervlak({ lengte: 400, breedte: 300, opbouw: O.vloer_volle_grond! }, M), /geen houten skelet/);
    geen(wandvlak({ lengte: 400, hoogte: 260, opbouw: O.hsb_hout! }, M), /geen openingen en dus geen lateien/);
    geen(paal({ hoogte: 250, doorsnede: { breedte: 140, hoogte: 140 }, materiaal: 'vuren' }, M), /knik valt buiten deze schatting/);
    geen(ligger({ lengte: 400, doorsnede: { breedte: 75, hoogte: 225 }, materiaal: 'vuren' }, M), /weet niet wat erop rust/);
    geen(spant({ overspanning: 800, helling: 40, doorsnede: { breedte: 50, hoogte: 180 }, materiaal: 'vuren' }, M), /Een spant wordt niet nagekeken/);
  });
});

describe('stabiliteit: de tabel met richtwaarden', () => {
  it('heeft voor elk getal een herkomst die zegt dat het een richtwaarde is die een ingenieur naleest', () => {
    const f = S.factoren;
    const herkomsten: OpbouwHerkomst[] = [
      ...Object.values(S.houtklassen).map((k) => k.herkomst), ...Object.values(S.lasten).map((l) => l.herkomst),
      f.lastBlijvend.herkomst, f.lastVeranderlijk.herkomst, f.materiaal.herkomst,
      ...Object.values(f.duur).map((r) => r.herkomst), ...Object.values(f.kruip).map((r) => r.herkomst),
      ...Object.values(S.doorbuiging).map((r) => r.herkomst),
    ];
    expect(herkomsten).toHaveLength(3 + 3 + 3 + 3 + 2 + 4);
    for (const h of herkomsten) {
      expect(h.nagelezen).toBe(false);
      expect(h.bron).toBe('algemene kennis');
      expect(h.verwijzing).toMatch(/^Richtwaarde uit algemene kennis; geen norm geopend\. Een ingenieur leest ze na: /);
    }
    expect(S.doorsneden.herkomst.nagelezen).toBe(false);
    expect(S.doorsneden.herkomst.verwijzing).toMatch(/ingenieur leest ze na/);
    expect(JSON.parse(JSON.stringify(S))).toStrictEqual(S);
  });

  it('heeft een standaardklasse die bestaat, een belasting per soort en een lijst van geldige doorsneden', () => {
    expect(S.houtklassen[S.standaardHoutklasse]).toBeDefined();
    expect(Object.keys(S.lasten).sort()).toEqual(['hellend_dak', 'plat_dak', 'vloer_woning']);
    expect(S.doorsneden.lijst.length).toBeGreaterThan(10);
    for (const d of S.doorsneden.lijst) expect(d.breedte > 0 && d.hoogte >= d.breedte).toBe(true);
    // Geen dubbels.
    expect(new Set(S.doorsneden.lijst.map((d) => `${d.breedte}x${d.hoogte}`)).size).toBe(S.doorsneden.lijst.length);
  });
});
