import { describe, expect, it } from 'vitest';
import { berekenOntwerp, blokkenVan, bouw3D, tekenVooraanzicht, type Ontwerp, type OntwerpElement, type Rotatie } from '../src/index.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

/** Details die de modellen van elkaar onderscheiden: uitlopende arm, nekrol, zachtheid. */
const bank = (opties: Record<string, string> = {}, extra: Partial<Ontwerp> = {}, armstijl = 'strak'): Ontwerp => ({
  hoofdmateriaal: 'linnen_ficelle',
  opties: { rug: 'los', ...opties },
  elementen: [
    { id: 'a1', type: 'arm', x: 0, y: 0, breedte: 20, diepte: 95, rotatie: 0, opties: { armstijl } },
    { id: 'z', type: 'zit', x: 20, y: 0, breedte: 100, diepte: 95, rotatie: 0 },
    { id: 'a2', type: 'arm', x: 120, y: 0, breedte: 20, diepte: 95, rotatie: 0, opties: { armstijl } },
  ],
  ...extra,
});
const blok = (o: Ontwerp, code: string) => bouw3D(o, zetelCatalogus, standaardMaterialen).blokken.find((b) => b.code === code);

describe('uitlopende arm', () => {
  it('één doorsnede: smal tegen de zitting, de krul aan de buitenkant (links en rechts), oplopend naar het karkas', () => {
    const o = bank({}, { vormgeving: { armhoogte: 63, karkashoogte: 86 } }, 'uitlopend');
    const s = bouw3D(o, zetelCatalogus, standaardMaterialen).blokken;
    const arm1 = s.find((b) => b.code === 'a1.arm')!, arm2 = s.find((b) => b.code === 'a2.arm')!;
    expect(arm1.vorm).toBe('profiel');
    expect(s.some((b) => b.code === 'a1.lip')).toBe(false);
    expect(arm1.uit).toEqual([-1, 0]); // linkerarm: krul naar links (buiten)
    expect(arm2.uit).toEqual([1, 0]); // rechterarm: krul naar rechts
    expect([arm1.x, arm1.x + arm1.b]).toEqual([0, 20]);
    // Onderaan smaller dan bovenaan: de buitenkant staat onderaan naar binnen (s < breedte/2), de krul reikt tot de rand.
    const onderaan = arm1.profiel!.filter((p) => !p[2]).map((p) => p[0]), bovenaan = arm1.profiel!.filter((p) => p[2]).map((p) => p[0]);
    expect(Math.max(...onderaan)).toBeLessThan(5);
    expect(Math.max(...bovenaan)).toBeCloseTo(10, 5);
    expect(arm1.hoogtes![0]).toBeLessThan(arm1.hoogtes![arm1.hoogtes!.length - 1]!); // vooraan lager dan achteraan
    expect(arm1.hoogtes![0]).toBe(63);
    expect(Math.max(...arm1.hoogtes!)).toBeCloseTo(86, 5);
    expect(berekenOntwerp(o, zetelCatalogus, standaardMaterialen).prijs.brutoprijsExcl).toBeGreaterThan(berekenOntwerp(bank({}, { vormgeving: { armhoogte: 63, karkashoogte: 86 } }), zetelCatalogus, standaardMaterialen).prijs.brutoprijsExcl);
    expect(tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen).vormen.find((v) => v.code === 'a1.arm')?.pad).toBeTruthy();
  });
  it('bij een gedraaide zetel (armen achter- en vooraan) zit de lip ook aan de buitenkant', () => {
    const arm = (y: number, rotatie: Rotatie): OntwerpElement => ({ id: `a${y}`, type: 'arm', x: 0, y, breedte: 20, diepte: 95, rotatie, opties: { armstijl: 'uitlopend' } });
    const o: Ontwerp = { hoofdmateriaal: 'linnen_ficelle', elementen: [arm(0, 90), { id: 'z', type: 'zit', x: 0, y: 20, breedte: 100, diepte: 95, rotatie: 90 }, arm(120, 90)] };
    const s = bouw3D(o, zetelCatalogus, standaardMaterialen).blokken;
    expect(s.find((b) => b.code === 'a0.arm')!.uit).toEqual([0, -1]);
    expect(s.find((b) => b.code === 'a120.arm')!.uit).toEqual([0, 1]);
  });
  it('met een hoes tot op de grond: de arm loopt zelf tot op de vloer, geen aparte rok eronder', () => {
    const o = bank({ poten: 'housse' }, { vormgeving: { armhoogte: 63, karkashoogte: 86 } }, 'uitlopend');
    const s = bouw3D(o, zetelCatalogus, standaardMaterialen).blokken;
    expect(s.find((b) => b.code === 'a1.arm')!.y).toBe(0);
    expect(s.some((b) => b.code === 'a1.housse')).toBe(false);
    expect(s.some((b) => b.code === 'z.housse')).toBe(true);
  });
});

describe('arm met ronde bovenkant (armstijl rond en Engels, 13/11)', () => {
  it('rond: één doorsnede, even hoog en even breed als in het vooraanzicht (vroeger een cilinder op een blok, hoger dan de tekening)', () => {
    for (const rotatie of [0, 90, 180, 270] as Rotatie[]) {
      const o = bank({ naad: 'bies' }, { vormgeving: { armhoogte: 60 } }, 'rond');
      o.elementen = [{ ...o.elementen[0]!, rotatie }];
      const blokken = bouw3D(o, zetelCatalogus, standaardMaterialen).blokken;
      const arm = blokken.find((b) => b.code === 'a1.arm')!;
      expect(arm.vorm, `rotatie ${rotatie}`).toBe('profiel');
      expect(blokken.some((b) => b.code === 'a1.rol')).toBe(false);
      // Zelfde omtrek als bovenRond in het vooraanzicht: van de poten tot 3 cm boven de armhoogte, over de volle breedte.
      const tekening = tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen).vormen.find((v) => v.code === 'a1.arm')!;
      const ys = arm.profiel!.map((q) => q[1]), ss = arm.profiel!.map((q) => q[0]);
      expect(Math.max(...ys)).toBe(63);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(tekening.hoogte!, 1);
      // De breedte in de tekening is de kant die je van voren ziet: bij 0 en 180 de breedte van de arm.
      if (rotatie === 0 || rotatie === 180) expect(Math.max(...ss) - Math.min(...ss)).toBeCloseTo(tekening.breedte!, 1);
      expect(Math.max(...ss) - Math.min(...ss)).toBe(20);
      expect(arm.y + arm.h).toBe(63);
      // Ronde bovenkant: halverwege de breedte op volle hoogte, aan de rand een halve breedte lager.
      expect(arm.profiel!.some((q) => Math.abs(q[0]) < 0.1 && q[1] === 63)).toBe(true);
      expect(Math.max(...arm.profiel!.filter((q) => Math.abs(q[0]) > 9.9).map((q) => q[1]))).toBe(53);
      // Gestoffeerd voorpaneel: afgeronde rand, licht bol, met de bies eromheen.
      expect(arm.rand).toBeGreaterThanOrEqual(2.5);
      expect(arm.kopBol).toBeGreaterThan(0);
      expect(arm.naad?.soort).toBe('bies');
    }
  });
  it('Engels: 8 cm onder de armhoogte, met een iets vlakkere bovenkant', () => {
    const o = bank({}, { vormgeving: { armhoogte: 60 } }, 'engels');
    const arm = blok(o, 'a1.arm')!;
    const tekening = tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen).vormen.find((v) => v.code === 'a1.arm')!;
    const ys = arm.profiel!.map((q) => q[1]);
    expect(Math.max(...ys)).toBe(52);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(tekening.hoogte!, 1);
    // Straal breedte / 2,2: bovenaan blijft een kort vlak stuk.
    expect(arm.profiel!.filter((q) => q[1] === 52).length).toBeGreaterThan(1);
  });
  it('met een hoes blijft de rok apart, zoals in het vooraanzicht', () => {
    const blokken = bouw3D(bank({ poten: 'housse' }, {}, 'rond'), zetelCatalogus, standaardMaterialen).blokken;
    expect(blokken.some((b) => b.code === 'a1.housse')).toBe(true);
    expect(blokken.find((b) => b.code === 'a1.arm')!.y).toBeGreaterThan(0);
  });
});

describe('strakke arm', () => {
  it('eigen doorsnede: ronde, licht bolle bovenkant op armhoogte, binnen de breedte, naar buiten gericht', () => {
    const o = bank({}, { vormgeving: { armhoogte: 66, zachtheid: 6 } });
    const s = bouw3D(o, zetelCatalogus, standaardMaterialen).blokken;
    const arm1 = s.find((b) => b.code === 'a1.arm')!, arm2 = s.find((b) => b.code === 'a2.arm')!;
    expect(arm1.vorm).toBe('profiel');
    expect(arm1.uit).toEqual([-1, 0]);
    expect(arm2.uit).toEqual([1, 0]);
    expect(new Set(arm1.hoogtes)).toEqual(new Set([66])); // overal even hoog
    const ys = arm1.profiel!.map((p) => p[1]), ss = arm1.profiel!.map((p) => p[0]);
    expect(Math.max(...ys)).toBe(66); // het midden van de bolle bovenkant op armhoogte
    expect(Math.max(...ss.map(Math.abs))).toBeLessThanOrEqual(10); // binnen de 20 cm van het element
    expect(arm1.kopBol).toBeGreaterThan(0); // bol voorpaneel
    expect(arm1.rand).toBeGreaterThanOrEqual(2.5);
    expect(arm1.y + arm1.h).toBe(66);
    expect(tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen).vormen.find((v) => v.code === 'a1.arm')?.pad).toBeTruthy();
  });
  it('zachter model: rondere rand en boller voorpaneel', () => {
    const arm = (zachtheid: number) => bouw3D(bank({}, { vormgeving: { zachtheid } }), zetelCatalogus, standaardMaterialen).blokken.find((b) => b.code === 'a1.arm')!;
    expect(arm(9).rand!).toBeGreaterThan(arm(1).rand!);
    expect(arm(9).kopBol!).toBeGreaterThan(arm(1).kopBol!);
  });
  it('met een hoes: tot op de vloer zonder aparte rok, met een bies rond het voorpaneel als de naad een bies is', () => {
    const o = bank({ poten: 'housse', naad: 'bies' });
    const s = bouw3D(o, zetelCatalogus, standaardMaterialen).blokken;
    const arm = s.find((b) => b.code === 'a1.arm')!;
    expect(arm.y).toBe(0);
    expect(s.some((b) => b.code === 'a1.housse')).toBe(false);
    expect(arm.naad?.soort).toBe('bies');
    expect(tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen).vormen.some((v) => v.code === 'a1.housse')).toBe(false);
  });
});

describe('nekrol', () => {
  it('alleen met losse rugkussens, bovenop het karkas, bij elke draaiing', () => {
    for (const rotatie of [0, 90, 180, 270] as Rotatie[]) {
      const o: Ontwerp = { hoofdmateriaal: 'linnen_ficelle', opties: { rug: 'los', nekrol: 'met' }, elementen: [{ id: 'z', type: 'zit', x: 0, y: 0, breedte: 100, diepte: 95, rotatie }] };
      const s = bouw3D(o, zetelCatalogus, standaardMaterialen);
      const rol = blokkenVan(s, { id: 'z' }).find((b) => b.code === 'z.nekrol')!;
      const rug = blokkenVan(s, { id: 'z' }).find((b) => b.code === 'z.rug')!;
      expect(rol, String(rotatie)).toBeTruthy();
      expect(rol.y).toBeCloseTo(rug.y + rug.h - 2, 5);
      expect(rol.as).toBe(rotatie === 0 || rotatie === 180 ? 'x' : 'z');
    }
    const vast = bank({ rug: 'vast', nekrol: 'met' });
    expect(blok(vast, 'z.nekrol')).toBeUndefined();
    expect(berekenOntwerp(vast, zetelCatalogus, standaardMaterialen).meldingen.some((m) => m.code === 'optie.nekrol.met')).toBe(true);
  });
});

describe('zachtheid geeft karakter', () => {
  it('strakke blokken (2) tegenover bolle donskussens (9)', () => {
    const strak = blok(bank({}, { vormgeving: { zachtheid: 2 } }), 'z.rugkussen')!;
    const zacht = blok(bank({ rug: 'los_dons' }, { vormgeving: { zachtheid: 9 } }), 'z.rugkussen')!;
    expect(strak.bol!).toBeLessThan(zacht.bol! / 2);
    expect(strak.kantel!.graden).toBeLessThan(zacht.kantel!.graden);
    expect(strak.afronding!).toBeLessThan(zacht.afronding!);
  });
});

describe('rug rond het ronde uiteinde (Doha, Montego)', () => {
  it('gebogen wand binnen de voetafdruk, hoog achteraan en lager vooraan, bij elke draaiing', () => {
    for (const rotatie of [0, 90, 180, 270] as Rotatie[]) {
      for (const kant of ['links', 'rechts']) {
        const o: Ontwerp = { hoofdmateriaal: 'boucle_belize', opties: { rug: 'los' }, elementen: [{ id: 'r', type: 'rond_einde', x: 0, y: 0, breedte: 130, diepte: 100, rotatie, opties: { ronde_kant: kant, rug_rond: 'rond' } }] };
        const wand = bouw3D(o, zetelCatalogus, standaardMaterialen).blokken.find((b) => b.code === 'r.rugrond')!;
        expect(wand, `${rotatie} ${kant}`).toBeTruthy();
        expect(wand.vorm).toBe('kuipwand');
        const breed = rotatie === 0 || rotatie === 180 ? 130 : 100, diep = rotatie === 0 || rotatie === 180 ? 100 : 130;
        for (const [x, z] of wand.pad!) { expect(x).toBeGreaterThanOrEqual(-1); expect(x).toBeLessThanOrEqual(breed + 1); expect(z).toBeGreaterThanOrEqual(-1); expect(z).toBeLessThanOrEqual(diep + 1); }
        expect(wand.hoogtes![0]!).toBeGreaterThan(wand.hoogtes![wand.hoogtes!.length - 1]!);
      }
    }
    const zonder: Ontwerp = { hoofdmateriaal: 'boucle_belize', elementen: [{ id: 'r', type: 'rond_einde', x: 0, y: 0, breedte: 130, diepte: 100, rotatie: 0 }] };
    expect(bouw3D(zonder, zetelCatalogus, standaardMaterialen).blokken.some((b) => b.code === 'r.rugrond')).toBe(false);
  });
});
