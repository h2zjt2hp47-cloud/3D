import { describe, expect, it } from 'vitest';
import { berekenOntwerp, blokkenVan, bouw3D, tekenVooraanzicht, type Ontwerp, type OntwerpElement } from '../src/index.js';
import { glamVelvet3D, proefModellen } from '../voorbeelden/proefmodellen.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

/** Proef met een echt 3D-bestand: de motor beslist of het past; prijzen en tekeningen blijven op de elementen gebaseerd. */
const proef = proefModellen.find((m) => m.code === 'proef_glam_velvet')!;
const kopie = (aanpassen?: (o: Ontwerp) => void): Ontwerp => {
  const o = structuredClone(proef.ontwerp);
  aanpassen?.(o);
  return o;
};
const scene = (o: Ontwerp) => bouw3D(o, zetelCatalogus, standaardMaterialen, { echt3d: glamVelvet3D });
const element = (o: Ontwerp, id: string) => o.elementen.find((e) => e.id === id)!;

describe('proefmodel met echt 3D-bestand', () => {
  it('is een geldig ontwerp met prijs, vooraanzicht en blokken', () => {
    const r = berekenOntwerp(proef.ontwerp, zetelCatalogus, standaardMaterialen);
    expect(r.meldingen.filter((m) => m.ernst === 'fout')).toEqual([]);
    expect(r.prijs.brutoprijsExcl).toBeGreaterThan(200);
    expect(r.afmetingen).toMatchObject({ breedte: 219, diepte: 100 });
    expect(tekenVooraanzicht(proef.ontwerp, zetelCatalogus, standaardMaterialen).vormen.length).toBeGreaterThan(1);
    expect(proef.bron).toMatch(/Geen model van Corneille & Silence/);
  });

  it('past: het bestand komt in het kader van de drie elementen, in de stof en pootafwerking van het ontwerp', () => {
    const s = scene(kopie());
    expect(s.echtNiet).toBeUndefined();
    expect(s.echt).toMatchObject({
      bestand: 'glam_velvet', x: 0, z: 0, b: 219, d: 100, h: 79,
      elementen: [{ id: 'e1', x0: 0, x1: 90 }, { id: 'e2', x0: 90, x1: 194 }, { id: 'e3', x0: 194, x1: 219 }],
      stof: { kleur: '#1f6b75', weefsel: 'velours' },
      poten: { soort: 'metaal', kleur: '#2b2b2b' },
    });
    expect(s.echt!.vermelding).toMatch(/Wayfair.*CC BY 4\.0/);
  });

  it('verandert niets aan de blokken, de prijs of het ontwerp (de blokken blijven voor de benadering)', () => {
    const o = kopie();
    const voor = structuredClone(o);
    const met = scene(o), zonder = bouw3D(o, zetelCatalogus, standaardMaterialen);
    expect(met.blokken).toEqual(zonder.blokken);
    expect(met.kader).toEqual(zonder.kader);
    expect(o).toEqual(voor);
    expect(blokkenVan(met, { id: 'e2' }).length).toBeGreaterThan(0);
    expect(zonder.echt).toBeUndefined();
    expect(zonder.echtNiet).toBeUndefined();
  });

  it('rekt mee binnen 15 %, daarbuiten de benadering met de reden', () => {
    const breder = scene(kopie((o) => { element(o, 'e2').breedte = 125; element(o, 'e3').x = 215; }));
    expect(breder.echt).toMatchObject({ b: 240 });
    const teBreed = scene(kopie((o) => { element(o, 'e2').breedte = 155; element(o, 'e3').x = 245; }));
    expect(teBreed.echt).toBeUndefined();
    expect(teBreed.echtNiet).toBe('Breedte 270 cm: het 3D-bestand gaat van 186,2 tot 251,9 cm (219 cm ± 15 %).');
    const dieper = scene(kopie((o) => { for (const e of o.elementen) e.diepte = 110; }));
    expect(dieper.echt).toMatchObject({ d: 110 });
  });

  it('een andere zithoogte: het model schaalt in de hoogte, de poten moeten meekunnen', () => {
    const hoger = scene(kopie((o) => { o.vormgeving = { ...o.vormgeving, zithoogte: 49, poothoogte: 23 }; }));
    expect(hoger.echt?.h).toBeCloseTo(86, 0);
    const kortePoten = scene(kopie((o) => { o.vormgeving = { ...o.vormgeving, poothoogte: 12 }; }));
    expect(kortePoten.echtNiet).toMatch(/^Poothoogte 12 cm: de poten in het 3D-bestand zijn 21 cm/);
  });

  it('opstelling anders (arm weg, gedraaid): de benadering', () => {
    const zonderArm = scene(kopie((o) => { o.elementen = o.elementen.filter((e) => e.id !== 'e3'); }));
    expect(zonderArm.echtNiet).toBe('Het 3D-bestand toont Afgerond eindelement + Zitelement + Armleuning naast elkaar (rug achteraan); deze opstelling is anders.');
    const gedraaid = scene(kopie((o) => { for (const e of o.elementen) e.rotatie = 180; }));
    expect(gedraaid.echt).toBeUndefined();
  });

  it('een losse poef ernaast mag; een sierkussen op de zetel zit niet in het bestand', () => {
    const poef: OntwerpElement = { id: 'p', type: 'poef', x: 60, y: 130, breedte: 70, diepte: 70, rotatie: 0 };
    expect(scene(kopie((o) => { o.elementen.push(poef); })).echt).toBeDefined();
    const kussen: OntwerpElement = { id: 'k', type: 'sierkussen', x: 110, y: 10, breedte: 45, diepte: 14, rotatie: 0 };
    expect(scene(kopie((o) => { o.elementen.push(kussen); })).echtNiet).toBe('Sierkussen op de zetel zit niet in het 3D-bestand.');
  });

  it('keuzes: wat het bestand niet kan tonen geeft de benadering; poten in onze afwerking', () => {
    expect(scene(kopie((o) => { o.opties = { ...o.opties, rug: 'los' }; })).echtNiet).toBe('Rug: "Losse rugkussens" zit niet in het 3D-bestand.');
    expect(scene(kopie((o) => { o.opties = { ...o.opties, poten: 'haarspeld' }; })).echtNiet).toMatch(/^Poten en onderbouw: "Haarspeldpoot \(metaal\)"/);
    expect(scene(kopie((o) => { o.opties = { ...o.opties, poten: 'messing' }; })).echt?.poten).toEqual({ soort: 'metaal', kleur: '#b8963e' });
    expect(scene(kopie((o) => { o.opties = { ...o.opties, poten: 'conisch', hout: 'notelaar' }; })).echt?.poten).toEqual({ soort: 'hout', kleur: '#5e4030' });
    expect(scene(kopie((o) => { element(o, 'e3').opties = { armstijl: 'strak' }; })).echtNiet).toMatch(/^Armstijl: "/);
    expect(scene(kopie((o) => { o.vormgeving = { ...o.vormgeving, houtframe: 'rondom' }; })).echtNiet).toBe('Vormgeving: houten frame "zijkanten + voorkant" zit niet in het 3D-bestand.');
  });

  it('stof: een foto als textuur gaat mee; een andere stof per element niet', () => {
    expect(scene(kopie((o) => { o.hoofdmateriaal = 'chill_zone_051'; })).echt?.stof).toMatchObject({ kleur: '#687281', textuurCm: 15, textuur: expect.stringMatching(/^data:image\//) });
    expect(scene(kopie((o) => { element(o, 'e2').materiaal = 'velours_bosgroen'; })).echtNiet).toMatch(/^Een andere stof per element/);
  });
});
