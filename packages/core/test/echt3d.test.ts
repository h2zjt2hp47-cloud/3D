import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { berekenOntwerp, blokkenVan, bouw3D, tekenVooraanzicht, type Ontwerp, type OntwerpElement } from '../src/index.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { glamVelvet3D, proefModellen, sullivanBlender3D } from '../voorbeelden/proefmodellen.js';
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

/**
 * Proef 15/11: Sullivan als 3D-bestand, gebouwd in Blender naar de productfoto's (scripts/blender/sullivan.py).
 * Het is een apart proefmodel: het gewone model Sullivan, zijn prijs en zijn tekeningen blijven wat ze waren.
 */
describe('proef: Sullivan gebouwd in Blender', () => {
  const blender = proefModellen.find((m) => m.code === 'proef_sullivan_blender')!;
  const sullivan = zetelModellen.find((m) => m.code === 'sullivan')!;
  const toon = (aanpassen?: (o: Ontwerp) => void) => {
    const o = structuredClone(blender.ontwerp);
    aanpassen?.(o);
    return bouw3D(o, zetelCatalogus, standaardMaterialen, { echt3d: sullivanBlender3D });
  };

  it('is hetzelfde ontwerp als Sullivan: zelfde prijs, tekening en blokken', () => {
    expect({ ...blender.ontwerp, model: 'sullivan' }).toEqual(sullivan.ontwerp);
    const a = berekenOntwerp(blender.ontwerp, zetelCatalogus, standaardMaterialen);
    const b = berekenOntwerp(sullivan.ontwerp, zetelCatalogus, standaardMaterialen);
    expect(a.meldingen.filter((m) => m.ernst === 'fout')).toEqual([]);
    expect(a.prijs).toEqual(b.prijs);
    expect(Math.round(a.prijs.brutoprijsExcl)).toBe(954);
    expect(tekenVooraanzicht(blender.ontwerp, zetelCatalogus, standaardMaterialen)).toEqual(tekenVooraanzicht(sullivan.ontwerp, zetelCatalogus, standaardMaterialen));
    expect(toon().blokken).toEqual(bouw3D(sullivan.ontwerp, zetelCatalogus, standaardMaterialen).blokken);
  });

  it('het gewone model Sullivan blijft de benadering: het heeft geen 3D-bestand', () => {
    expect(sullivan.echt3d).toBeUndefined();
    expect(blender.bron).toMatch(/benadering op basis van de productfoto's, gebouwd in Blender/);
    expect(sullivanBlender3D.vermelding).toMatch(/benadering, geen bestand van de fabrikant/);
  });

  it('past: het bestand komt in de maten van de website, in de stof en het hout van het ontwerp', () => {
    const s = toon();
    expect(s.echtNiet).toBeUndefined();
    expect(s.echt).toMatchObject({
      bestand: 'sullivan_blender', x: 0, z: 0, b: 72, d: 80, h: 93,
      elementen: [{ id: 'e1', x0: 0, x1: 72 }],
      stof: { kleur: '#86888a', weefsel: 'wol' },
      poten: { soort: 'hout', kleur: '#2f2a26' },
    });
  });

  it('een andere stof of een ander hout gaat mee', () => {
    expect(toon((o) => { o.hoofdmateriaal = 'velours_petrol'; }).echt).toMatchObject({ stof: { kleur: '#1f6b75', weefsel: 'velours' } });
    expect(toon((o) => { o.opties = { ...o.opties, hout: 'eik_naturel' }; }).echt?.poten.soort).toBe('hout');
  });

  it('wat het bestand niet toont, geeft de benadering met de reden', () => {
    expect(toon((o) => { o.elementen[0]!.opties = { kuipvorm: 'rond' }; }).echtNiet).toMatch(/zit niet in het 3D-bestand/);
    expect(toon((o) => { o.opties = { ...o.opties, zitting: 'losse_kussens' }; }).echtNiet).toMatch(/zit niet in het 3D-bestand/);
    expect(toon((o) => { o.opties = { ...o.opties, poten: 'draaivoet' }; }).echtNiet).toMatch(/zit niet in het 3D-bestand/);
    // Een ronde zitting mag maar een paar procent rekken (anders wordt ze ovaal).
    expect(toon((o) => { o.elementen[0]!.breedte = 74; }).echt).toMatchObject({ b: 74 });
    expect(toon((o) => { o.elementen[0]!.breedte = 80; }).echtNiet).toMatch(/Breedte 80 cm/);
  });

  it('het 3D-bestand zelf: maten van de website, delen voor stof en hout, schaduwtextuur, niets wat de weergave niet leest', () => {
    const b = readFileSync(new URL('../../demo-web/modellen3d/sullivan_blender.glb', import.meta.url));
    expect(b.readUInt32LE(0)).toBe(0x46546c67);
    const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
    // De weergave rekt het kader van het bestand per richting tot de maten van het element: het kader moet dus kloppen.
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const mesh of json.meshes) for (const p of mesh.primitives) {
      const acc = json.accessors[p.attributes.POSITION];
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, acc.min[i]); max[i] = Math.max(max[i]!, acc.max[i]); }
      expect(Object.keys(p.attributes)).toEqual(expect.arrayContaining(['POSITION', 'NORMAL', 'TEXCOORD_0']));
    }
    const { b: breed, d: diep, h: hoog } = sullivanBlender3D.maat;
    expect((max[0]! - min[0]!) * 100).toBeCloseTo(breed, 0);
    expect((max[1]! - min[1]!) * 100).toBeCloseTo(hoog, 0);
    expect((max[2]! - min[2]!) * 100).toBeCloseTo(diep, 0);
    expect(min[1]).toBeCloseTo(0, 3);
    // Geen verschuiving of schaal op de delen (de weergave neemt de vorm zoals ze in het bestand staat).
    for (const n of json.nodes) expect(Object.keys(n).sort()).toEqual(['mesh', 'name']);
    const namen = json.nodes.map((n: { name: string }) => n.name);
    expect(namen.some((n: string) => /stof/.test(n))).toBe(true);
    expect(namen.some((n: string) => /poot/.test(n))).toBe(true);
    const stof = json.materials.find((m: { name: string }) => /stof/.test(m.name));
    expect(stof.occlusionTexture).toEqual({ index: 0 });
    expect(json.images[0].mimeType).toBe('image/jpeg');
    expect(json.extensionsRequired).toBeUndefined();
    expect(b.length).toBeLessThan(400_000);
  });
});
