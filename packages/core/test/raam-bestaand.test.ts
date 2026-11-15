import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { berekenConfiguratie, type Keuzes } from '../src/index.js';
import { berekenRaam, raamdeur, raamPrijslijst, ruitenVan } from '../voorbeelden/raam.js';
import { raamBlokken, raamScene } from '../voorbeelden/raam3d.js';
import { raamKeuzes, voorbeeldWoning } from '../voorbeelden/woning.js';
import { OUDE_VARIANTEN } from './gegevens/raam-oud-gevallen.js';
import { vingerafdruk } from './gegevens/vingerafdruk.js';


// ---------- bestaande projecten ----------

interface Oud { afgeleid: Record<string, unknown>; meldingen: string[]; prijs: [number, number]; stuklijst: string; tekening: string; blokken: string; scene: string; ruiten: string }
const oud = JSON.parse(readFileSync(new URL('./gegevens/raam-oud.json', import.meta.url), 'utf8')) as Record<string, Oud>;

describe('bestaande projecten blijven gelijk (model van vóór het raster)', () => {
  const gevallen: [string, Keuzes][] = [
    ...voorbeeldWoning().posities.map((p): [string, Keuzes] => [`woning ${p.code} ${p.naam}`, p.keuzes]),
    ...OUDE_VARIANTEN.map(([naam, k]): [string, Keuzes] => [naam, raamKeuzes(k)]),
  ];

  it('alle vastgelegde gevallen bestaan nog', () => {
    expect(gevallen.map(([naam]) => naam).sort()).toEqual(Object.keys(oud).sort());
  });

  it.each(gevallen)('%s: zelfde cijfers, meldingen, prijs, tekening, 3D en glasbestelling', (naam, keuzes) => {
    const o = oud[naam]!;
    const r = berekenRaam(keuzes);
    for (const [code, waarde] of Object.entries(o.afgeleid)) {
      if (typeof waarde === 'number') expect(r.afgeleid[code], code).toBeCloseTo(waarde, 6);
      else expect(r.afgeleid[code], code).toEqual(waarde);
    }
    expect(r.meldingen.map((m) => m.code)).toEqual(o.meldingen);
    expect([r.prijs.kostprijs, r.prijs.brutoprijsExcl]).toEqual(o.prijs);
    expect(vingerafdruk(r.stuklijst), 'stuklijst').toBe(o.stuklijst);
    expect(vingerafdruk(r.tekening), 'tekening uit het raster').toBe(o.tekening);
    // De tekening in het model zelf (zonder berekenRaam) blijft ook dezelfde.
    expect(vingerafdruk(berekenConfiguratie(raamdeur, keuzes, raamPrijslijst).tekening), 'tekening uit het model').toBe(o.tekening);
    expect(vingerafdruk(raamBlokken(r)), '3D-blokken').toBe(o.blokken);
    expect(vingerafdruk(raamScene(r)), '3D-scène').toBe(o.scene);
    expect(vingerafdruk(ruitenVan(r)), 'glasbestelling').toBe(o.ruiten);
  });

  it('een oud project zonder de nieuwe kenmerken opent met de standaardwaarden', () => {
    // Zoals bewaard vóór de uitbreiding: alleen de kenmerken van toen.
    const oudeKeuzes: Keuzes = { type: 'raam', breedte: 1800, hoogte: 1400, borstwering: 900, vakken: 'v3', vak1: 'draaikip_l', vak2: 'vast', vak3: 'draaikip_r', bovenlicht: true, bovenlicht_h: 400, kleur_buiten: 'antraciet', kleur_binnen: 'wit', rooster: true };
    const r = berekenRaam(oudeKeuzes);
    expect(r.meldingen.filter((m) => m.code.endsWith('.onbekend'))).toEqual([]);
    expect(r.geldig).toBe(true);
    expect(r.tekening!.vormen.filter((v) => v.symbool).map((v) => `${v.code}:${v.symbool}`)).toEqual(['bovenlicht:vast', 'vak.1:draaikip_l', 'vak.2:vast', 'vak.3:draaikip_r']);
  });
});
