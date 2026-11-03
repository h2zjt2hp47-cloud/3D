import { describe, expect, it } from 'vitest';
import { collectieVan, gebruiksklasse, kleurfamilie, leesMaterialen, stofkaart, weefselVan, WEEFSELS } from '../src/index.js';
import { STOFGROEPEN, standaardMaterialen } from '../voorbeelden/sofa.js';

describe('stofkaart van de leverancier (Chill Zone CH3112/051)', () => {
  const chill = standaardMaterialen.find((m) => m.artikel === 'CH3112/051')!;
  it('gegevens van de stofkaart en gebruiksklasse', () => {
    expect(chill).toMatchObject({ rolbreedte: 140, rapport: 0, martindale: 50000, opDeRol: true, kleurvarianten: 29 });
    expect(gebruiksklasse(50000)).toEqual({ klasse: 'intensief gebruik, ook projecten (horeca, kantoor)', zitmeubel: true });
    expect(gebruiksklasse(12000)?.zitmeubel).toBe(false);
    expect(gebruiksklasse(undefined)).toBeUndefined();
    expect(stofkaart(chill)).toContain('CH3112/051');
    expect(stofkaart(chill)).toContain('op de rol');
  });
  it('lijst inlezen behoudt de technische gegevens', () => {
    const r = leesMaterialen(JSON.stringify([{ ...chill, code: 'x' }]), STOFGROEPEN);
    expect(r.materialen[0]).toMatchObject({ artikel: 'CH3112/051', martindale: 50000, opDeRol: true });
  });
});

describe('stoffencollecties en stalenkaart', () => {
  it('collecties met meerdere kleuren, elk met een weefsel', () => {
    const stoffen = standaardMaterialen.filter((m) => m.groep !== 'EIGEN');
    expect(stoffen.length).toBeGreaterThanOrEqual(55);
    const perCollectie = new Map<string, number>();
    for (const m of stoffen) perCollectie.set(collectieVan(m), (perCollectie.get(collectieVan(m)) ?? 0) + 1);
    expect(perCollectie.get('Velours Soft')).toBe(6);
    expect(perCollectie.get('Bouclé Nuage')).toBe(4);
    expect(perCollectie.get('Chenille Mila')).toBe(6);
    expect(perCollectie.get('Rib Cord')).toBe(6);
    expect(perCollectie.get('Wol Tweed')).toBe(4);
    expect(perCollectie.get('Bouclé Teddy')).toBe(4);
    expect(perCollectie.get('Leder')).toBe(4);
    expect(new Set(standaardMaterialen.map((m) => m.code)).size).toBe(standaardMaterialen.length);
    for (const m of standaardMaterialen) expect(weefselVan(m) in WEEFSELS).toBe(true);
  });
  it('weefsel afgeleid uit de naam als het niet opgegeven is', () => {
    expect(weefselVan({ soort: 'stof', naam: 'Bouclé Wit' })).toBe('boucle');
    expect(weefselVan({ soort: 'leder', naam: 'Nappa' })).toBe('leder');
    expect(weefselVan({ soort: 'stof', naam: 'Iets anders' })).toBe('effen');
  });
  it('kleurfamilie uit de kleurcode', () => {
    expect(kleurfamilie('#ece6da')).toBe('wit & beige');
    expect(kleurfamilie('#86888a')).toBe('grijs');
    expect(kleurfamilie('#252a35')).toBe('zwart');
    expect(kleurfamilie('#1f6b75')).toBe('blauw');
    expect(kleurfamilie('#2f4a3a')).toBe('groen');
    expect(kleurfamilie('#c98272')).toBe('rood & roze');
    expect(kleurfamilie('#c08a2e')).toBe('geel & oker');
    expect(kleurfamilie('#8f4f2c')).toBe('bruin & camel');
    expect(kleurfamilie('#6e2a33')).toBe('rood & roze');
  });
  it('lijst inlezen behoudt collectie, weefsel en foto', () => {
    const chill = standaardMaterialen.find((m) => m.code === 'chill_zone_051')!;
    const boucle = standaardMaterialen.find((m) => m.code === 'boucle_mos')!;
    const r = leesMaterialen(JSON.stringify([chill, boucle]), STOFGROEPEN);
    expect(r.materialen[0]).toMatchObject({ collectie: 'Chill Zone (Chivasso)', textuurCm: 15 });
    expect(r.materialen[0]!.textuur).toBe(chill.textuur);
    expect(r.materialen[1]).toMatchObject({ collectie: 'Bouclé Nuage', weefsel: 'boucle' });
  });
});
