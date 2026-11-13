import { describe, expect, it } from 'vitest';
import { blokkenVan, bouw3D, type Ontwerp } from '../src/index.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { startOntwerpen, zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

const scene = (o: Ontwerp) => bouw3D(o, zetelCatalogus, standaardMaterialen);
const recht = startOntwerpen.recht!.ontwerp;

describe('3D-opbouw', () => {
  it('rechte sofa: kader, poten, rug en kussens', () => {
    const s = scene(recht);
    expect(s.kader).toMatchObject({ x: 0, z: 0, b: 230, d: 95, h: 80 });
    const zit = blokkenVan(s, { id: 'e2' });
    expect(zit.filter((b) => b.code.includes('.poot-'))).toHaveLength(4);
    expect(zit.find((b) => b.code === 'e2.poot-la')).toMatchObject({ vorm: 'kegel', soort: 'hout', h: 12, y: 0 });
    expect(zit.find((b) => b.code === 'e2.rug')).toMatchObject({ z: 0, d: 18, y: 12, h: 68, b: 95 });
    expect(zit.find((b) => b.code === 'e2.zitkussen')).toMatchObject({ y: 31, h: 14, soort: 'kussen', kleur: '#c9b48f' });
  });

  it('naden en weefsel op de kussens: gewone naad, bies, contrastbies', () => {
    const gewoon = blokkenVan(scene(recht), { id: 'e2' }).find((b) => b.code === 'e2.zitkussen')!;
    expect(gewoon.naad?.soort).toBe('naad');
    expect(gewoon.weefsel).toBe('linnen');
    const o: Ontwerp = { ...structuredClone(recht), opties: { naad: 'contrastbies' } };
    const bies = blokkenVan(scene(o), { id: 'e2' }).find((b) => b.code === 'e2.zitkussen')!;
    expect(bies.naad).toEqual({ soort: 'bies', kleur: '#2b2622' });
    // Het frame (rug, armen) krijgt geen naad, alleen de kussens.
    expect(blokkenVan(scene(o), { id: 'e2' }).find((b) => b.code === 'e2.rug')!.naad).toBeUndefined();
  });

  it('draaiing: rug aan de linkerkant bij 270°', () => {
    const s = scene(startOntwerpen.hoek!.ontwerp);
    const rug = blokkenVan(s, { id: 'e5' }).find((b) => b.code === 'e5.rug')!;
    expect(rug).toMatchObject({ x: 0, b: 18, z: 100, d: 90 });
  });

  it('opties zijn zichtbaar in 3D: plint, losse rug, hoge rug, rolarm, houten blad', () => {
    const o: Ontwerp = { ...structuredClone(recht), opties: { poten: 'plint', poothoogte: 'laag', rug: 'los', rughoogte: 'hoog', hout: 'notelaar' } };
    o.elementen[0]!.opties = { armstijl: 'rond' };
    o.elementen[3]!.opties = { armstijl: 'houtblad' };
    const s = scene(o);
    expect(s.blokken.find((b) => b.code === 'e2.plint')).toMatchObject({ h: 4, soort: 'hout', kleur: '#5e4030' });
    expect(s.blokken.find((b) => b.code === 'e2.rugkussen')).toMatchObject({ y: 45, h: 47 });
    // Rolarm (13/11): één doorsnede met een ronde bovenkant, geen cilinder op een blok meer.
    expect(s.blokken.find((b) => b.code === 'e1.rol')).toBeUndefined();
    expect(s.blokken.find((b) => b.code === 'e1.arm')).toMatchObject({ vorm: 'profiel', d: 95 });
    expect(s.blokken.find((b) => b.code === 'e4.blad')).toMatchObject({ soort: 'hout', y: 62 });
    expect(s.kader.h).toBe(92);
  });

  it('metalen slede en houten tussenstuk met lade', () => {
    const slede = scene({ ...structuredClone(recht), opties: { poten: 'slede', metaal: 'rvs' } });
    expect(slede.blokken.filter((b) => b.code.startsWith('e2.slede'))).toHaveLength(6);
    expect(slede.blokken.find((b) => b.code === 'e2.slede-l-voor')?.kleur).toBe('#a7a9ac');
    const c = scene(startOntwerpen.console!.ontwerp);
    expect(c.blokken.find((b) => b.code === 'e3.console')).toMatchObject({ soort: 'hout', h: 55, b: 40 });
    expect(c.blokken.some((b) => b.code === 'e3.lade')).toBe(true);
    expect(c.blokken.some((b) => b.code.startsWith('e3.poot'))).toBe(false);
  });

  it('capitonnage geeft knopen, hoofdsteun komt boven de rug', () => {
    const o: Ontwerp = { ...structuredClone(recht), opties: { rug: 'capitonne' } };
    o.elementen[1]!.opties = { functie: 'hoofdsteun' };
    const s = scene(o);
    expect(s.blokken.filter((b) => b.vorm === 'bol').length).toBeGreaterThan(6);
    expect(s.blokken.find((b) => b.code === 'e2.hoofdsteun')).toMatchObject({ y: 80 });
  });
});
