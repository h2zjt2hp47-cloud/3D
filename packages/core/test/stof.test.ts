import { describe, expect, it } from 'vitest';
import { gebruiksklasse, leesMaterialen, stofkaart } from '../src/index.js';
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
