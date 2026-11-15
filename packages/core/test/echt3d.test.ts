import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { berekenOntwerp, blokkenVan, bouw3D, tekenVooraanzicht, type Ontwerp, type OntwerpElement } from '../src/index.js';
import { zetelModellen } from '../voorbeelden/modellen.js';
import { BLENDER_BESTANDEN } from '../voorbeelden/bestanden3d.js';
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

/**
 * 3D-bestanden uit Blender bij de gewone modellen (voorbeelden/bestanden3d.ts, scripts/blender). Het bestand vervangt
 * alleen het beeld in 3D: prijs, tekeningen en blokken blijven wat ze zijn.
 */
describe('3D-bestanden uit Blender bij de modellen van de collectie', () => {
  const met = zetelModellen.filter((m) => m.echt3d);
  const sullivan = zetelModellen.find((m) => m.code === 'sullivan')!;
  const toon = (m: (typeof zetelModellen)[number], aanpassen?: (o: Ontwerp) => void) => {
    const o = structuredClone(m.ontwerp);
    aanpassen?.(o);
    return bouw3D(o, zetelCatalogus, standaardMaterialen, { echt3d: m.echt3d });
  };
  const map = new URL('../../demo-web/modellen3d/', import.meta.url);

  it('de tabel en de modellen kloppen met elkaar', () => {
    expect(met.map((m) => m.code).sort()).toEqual(Object.keys(BLENDER_BESTANDEN).sort());
    expect(sullivan.echt3d?.bestand).toBe('sullivan_blender');
    for (const m of met) expect(m.echt3d!.vermelding).toMatch(/benadering, geen bestand van de fabrikant/);
    // Geen losse bestanden in de map: elk GLB hoort bij een model (of is het proefmodel van een ander merk).
    const verwacht = [...Object.values(BLENDER_BESTANDEN).map((b) => b.bestand), glamVelvet3D.bestand].sort();
    expect(readdirSync(map).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4)).sort()).toEqual(verwacht);
  });

  it('elk model toont zijn bestand in het standaardontwerp, in zijn eigen maten, stof en afwerking', () => {
    for (const m of met) {
      const s = toon(m);
      expect(s.echtNiet, m.code).toBeUndefined();
      const stoel = m.ontwerp.elementen.find((e) => e.type === 'fauteuil')!;
      expect(s.echt, m.code).toMatchObject({ bestand: m.echt3d!.bestand, x: stoel.x, z: stoel.y, b: stoel.breedte, d: stoel.diepte, h: m.echt3d!.maat.h });
    }
  });

  it('het bestand verandert niets aan de blokken, de prijs of de tekening', () => {
    for (const m of met) {
      expect(toon(m).blokken, m.code).toEqual(bouw3D(m.ontwerp, zetelCatalogus, standaardMaterialen).blokken);
      const r = berekenOntwerp(m.ontwerp, zetelCatalogus, standaardMaterialen);
      expect(r.meldingen.filter((x) => x.ernst === 'fout'), m.code).toEqual([]);
    }
    expect(Math.round(berekenOntwerp(sullivan.ontwerp, zetelCatalogus, standaardMaterialen).prijs.brutoprijsExcl)).toBe(954);
    expect(tekenVooraanzicht(sullivan.ontwerp, zetelCatalogus, standaardMaterialen).vormen.length).toBeGreaterThan(1);
  });

  it('Sullivan: het bestand komt in de maten van de website, in de stof en het hout van het ontwerp', () => {
    expect(toon(sullivan).echt).toMatchObject({
      bestand: 'sullivan_blender', x: 0, z: 0, b: 72, d: 80, h: 93,
      elementen: [{ id: 'e1', x0: 0, x1: 72 }],
      stof: { kleur: '#86888a', weefsel: 'wol' },
      poten: { soort: 'hout', kleur: '#2f2a26' },
    });
    expect(toon(sullivan, (o) => { o.hoofdmateriaal = 'velours_petrol'; }).echt).toMatchObject({ stof: { kleur: '#1f6b75', weefsel: 'velours' } });
    expect(toon(sullivan, (o) => { o.opties = { ...o.opties, hout: 'eik_naturel' }; }).echt?.poten.soort).toBe('hout');
  });

  it('een fauteuil mag verplaatst en gedraaid staan: het bestand draait mee rond het midden van zijn voetafdruk', () => {
    expect(toon(sullivan, (o) => { o.elementen[0]!.x = 150; o.elementen[0]!.y = 40; }).echt).toMatchObject({ x: 150, z: 40, b: 72, d: 80 });
    expect(toon(sullivan).echt?.draai).toBeUndefined();
    // Een kwartslag: de voetafdruk is 80 × 72 vanaf (0, 0); het kader vóór het draaien heeft hetzelfde midden (40, 36).
    expect(toon(sullivan, (o) => { o.elementen[0]!.rotatie = 90; }).echt).toMatchObject({ draai: 90, b: 72, d: 80, x: 4, z: -4, elementen: [{ id: 'e1', x0: 0, x1: 80 }] });
    expect(toon(sullivan, (o) => { o.elementen[0]!.rotatie = 180; }).echt).toMatchObject({ draai: 180, x: 0, z: 0, elementen: [{ id: 'e1', x0: 0, x1: 72 }] });
    // Het proefmodel met een rij van drie elementen (Glam Velvet) blijft de benadering tonen als er iets gedraaid staat.
    const rij = structuredClone(proef.ontwerp);
    rij.elementen[2]!.rotatie = 90;
    expect(scene(rij).echtNiet).toMatch(/deze opstelling is anders/);
  });

  it('twee fauteuils: het bestand staat op de eerste, de tweede blijft uit de bouwstenen', () => {
    const s = toon(sullivan, (o) => { o.elementen.push({ ...o.elementen[0]!, id: 'e2', x: 100 }); });
    expect(s.echt?.elementen).toEqual([{ id: 'e1', x0: 0, x1: 72 }]);
    expect(s.blokken.some((b) => b.code.startsWith('e2.'))).toBe(true);
  });

  it('wat het bestand niet toont, geeft de bouwstenen met de reden', () => {
    for (const m of met) {
      // Een andere vorm van fauteuil en een ander onderstel zitten in geen enkel bestand.
      const andereVorm = m.ontwerp.elementen.find((e) => e.type === 'fauteuil')!.opties?.kuipvorm === 'rond' ? 'schelp' : 'rond';
      expect(toon(m, (o) => { o.elementen.find((e) => e.type === 'fauteuil')!.opties = { kuipvorm: andereVorm }; }).echtNiet, m.code).toMatch(/zit niet in het 3D-bestand/);
      expect(toon(m, (o) => { o.opties = { ...o.opties, poten: o.opties?.poten === 'slede' ? 'blok' : 'slede' }; }).echtNiet, m.code).toMatch(/zit niet in het 3D-bestand/);
      // Een ronde zitting mag maar een paar procent rekken (anders wordt ze ovaal).
      expect(toon(m, (o) => { o.elementen.find((e) => e.type === 'fauteuil')!.breedte *= 1.12; }).echtNiet, m.code).toMatch(/Breedte/);
    }
    expect(toon(sullivan, (o) => { o.opties = { ...o.opties, zitting: 'losse_kussens' }; }).echtNiet).toMatch(/zit niet in het 3D-bestand/);
    expect(toon(sullivan, (o) => { o.elementen[0]!.breedte = 74; }).echt).toMatchObject({ b: 74 });
    expect(toon(sullivan, (o) => { o.elementen[0]!.type = 'poef'; o.elementen[0]!.opties = {}; }).echtNiet).toBe('Het 3D-bestand toont een fauteuil; die staat niet in dit ontwerp.');
  });

  it('elk bestand zelf: maten van het model, delen voor stof en afwerking, schaduwtextuur, licht genoeg', () => {
    let totaal = 0;
    for (const m of met) {
      const b = readFileSync(new URL(`${m.echt3d!.bestand}.glb`, map));
      totaal += b.length;
      expect(b.readUInt32LE(0), m.code).toBe(0x46546c67);
      const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
      // De weergave rekt het kader van het bestand per richting tot de maten van het element: het kader moet dus kloppen.
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (const mesh of json.meshes) for (const p of mesh.primitives) {
        const acc = json.accessors[p.attributes.POSITION];
        for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, acc.min[i]); max[i] = Math.max(max[i]!, acc.max[i]); }
        expect(Object.keys(p.attributes), m.code).toEqual(expect.arrayContaining(['POSITION', 'NORMAL', 'TEXCOORD_0']));
      }
      const { b: breed, d: diep, h: hoog } = m.echt3d!.maat;
      expect(Math.abs(((max[0]! - min[0]!) * 100) / breed - 1), `${m.code} breedte`).toBeLessThan(0.03);
      expect(Math.abs(((max[2]! - min[2]!) * 100) / diep - 1), `${m.code} diepte`).toBeLessThan(0.03);
      expect(Math.abs((max[1]! - min[1]!) * 100 - hoog), `${m.code} hoogte`).toBeLessThan(0.6);
      expect(min[1], m.code).toBeCloseTo(0, 3);
      // Geen verschuiving of schaal op de delen (de weergave neemt de vorm zoals ze in het bestand staat).
      for (const n of json.nodes) expect(Object.keys(n).sort(), m.code).toEqual(['mesh', 'name']);
      expect(json.nodes.some((n: { name: string }) => /stof/.test(n.name)), m.code).toBe(true);
      const stof = json.materials.find((x: { name: string }) => /stof/.test(x.name));
      expect(stof.occlusionTexture, m.code).toEqual({ index: 0 });
      expect(json.images[0].mimeType, m.code).toBe('image/jpeg');
      expect(json.extensionsRequired, m.code).toBeUndefined();
      expect(b.length, m.code).toBeLessThan(330_000);
    }
    // Alle bestanden samen: ruim onder 3 MB (ze zitten als tekst in de pagina, dat is een derde meer).
    expect(totaal).toBeLessThan(3_000_000);
  });
});
