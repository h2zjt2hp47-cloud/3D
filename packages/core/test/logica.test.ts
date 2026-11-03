import { describe, expect, it } from 'vitest';
import { berekenConfiguratie, berekenOntwerp, type Ontwerp, type OntwerpElement } from '../src/index.js';
import { sofa, sofaPrijslijst, standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

/** Controles uit de logica-review (3/11): prijs en tekening moeten hetzelfde zeggen. */
const bereken = (o: Ontwerp, korting = 0) => berekenOntwerp(o, zetelCatalogus, standaardMaterialen, { kortingProcent: korting });
const zetel = (elementen: OntwerpElement[], extra: Partial<Ontwerp> = {}): Ontwerp => ({ hoofdmateriaal: 'linnen_ficelle', elementen, ...extra });
const zit = (extra: Partial<OntwerpElement> = {}): OntwerpElement => ({ id: 'z', type: 'zit', x: 20, y: 0, breedte: 95, diepte: 95, rotatie: 0, ...extra });
const arm = (id: string, x: number): OntwerpElement => ({ id, type: 'arm', x, y: 0, breedte: 20, diepte: 95, rotatie: 0 });
const prijsVan = (o: Ontwerp, id: string) => bereken(o).elementen.find((x) => x.id === id)!.prijs;
const codes = (o: Ontwerp, korting = 0) => bereken(o, korting).meldingen.map((m) => m.code);

describe('vrij getekende hoogtes vervangen de gekozen hoogte', () => {
  it('rughoogte: niet dubbel aangerekend (optie én per cm)', () => {
    const vrij = zetel([arm('a1', 0), zit({ vorm: { rughoogte: 92 } }), arm('a2', 115)]);
    const metOptie = zetel([arm('a1', 0), zit({ vorm: { rughoogte: 92 } }), arm('a2', 115)], { opties: { rughoogte: 'hoog' } });
    expect(prijsVan(metOptie, 'z')).toBe(prijsVan(vrij, 'z'));
  });
  it('zithoogte: een getekende 48 cm kost zoveel als de keuze "hoog (48 cm)"', () => {
    const elementen = [arm('a1', 0), zit(), arm('a2', 115)];
    const hoog = bereken(zetel(elementen, { opties: { zithoogte: 'hoog' } })).prijs.brutoprijsExcl;
    expect(bereken(zetel(elementen, { vormgeving: { zithoogte: 48 } })).prijs.brutoprijsExcl).toBe(hoog);
    expect(bereken(zetel(elementen, { opties: { zithoogte: 'hoog' }, vormgeving: { zithoogte: 42 } })).prijs.brutoprijsExcl).toBeLessThan(hoog);
  });
});

describe('rugopties alleen op een element met een rug', () => {
  const chaise = (rug: string, chaiseRug?: string) =>
    zetel([{ id: 'c', type: 'chaise', x: 0, y: 0, breedte: 90, diepte: 165, rotatie: 0, ...(chaiseRug ? { opties: { chaise_rug: chaiseRug } } : {}) }], { opties: { rug } });
  it('chaise zonder rugleuning: losse rugkussens kosten niets extra', () => {
    expect(prijsVan(chaise('los'), 'c')).toBe(prijsVan(chaise('vast'), 'c'));
  });
  it('chaise met rugleuning: wel', () => {
    expect(prijsVan(chaise('los', 'achter'), 'c')).toBeGreaterThan(prijsVan(chaise('vast', 'achter'), 'c'));
  });
});

describe('vormgeving alleen aanrekenen wat zichtbaar is', () => {
  it('houten frame rond een hoekelement (wordt niet getekend) kost niets', () => {
    const hoek = (houtframe?: 'rondom') => zetel([{ id: 'h', type: 'hoek', x: 0, y: 0, breedte: 100, diepte: 100, rotatie: 0, ...(houtframe ? { vorm: { houtframe } } : {}) }]);
    expect(prijsVan(hoek('rondom'), 'h')).toBe(prijsVan(hoek(), 'h'));
  });
  it('houten frame rond een zitelement wel', () => {
    expect(prijsVan(zetel([zit({ vorm: { houtframe: 'rondom' } })]), 'z')).toBeGreaterThan(prijsVan(zetel([zit()]), 'z'));
  });
});

describe('opzet-elementen moeten echt op een zitting liggen', () => {
  const rugleuning = (x: number, breedte = 90): OntwerpElement => ({ id: 'r', type: 'rugleuning', x, y: 0, breedte, diepte: 18, rotatie: 0 });
  it('een rugleuning die 1 cm op een zitbank ligt: fout', () => {
    const z = { id: 'z', type: 'zit_zonder_rug', x: 0, y: 0, breedte: 100, diepte: 95, rotatie: 0 as const };
    expect(codes(zetel([z, rugleuning(99)]))).toContain('opzet.los');
    expect(codes(zetel([z, rugleuning(5)]))).not.toContain('opzet.los');
  });
  it('niet op een houten tussenstuk', () => {
    const c = { id: 'k', type: 'console', x: 0, y: 0, breedte: 60, diepte: 80, rotatie: 0 as const };
    expect(codes(zetel([c, rugleuning(0, 60)]))).toContain('opzet.los');
  });
  it('twee rugleuningen op elkaar en een rugleuning op een chaise met rug: gemeld', () => {
    const z = { id: 'z', type: 'zit_zonder_rug', x: 0, y: 0, breedte: 100, diepte: 95, rotatie: 0 as const };
    expect(codes(zetel([z, rugleuning(5), { ...rugleuning(5), id: 'r2' }]))).toContain('opzet.op_elkaar');
    const c = { id: 'c', type: 'chaise', x: 0, y: 0, breedte: 90, diepte: 165, rotatie: 0 as const, opties: { chaise_rug: 'achter' } };
    expect(codes(zetel([c, rugleuning(0)]))).toContain('opzet.dubbele_rug');
  });
});

describe('onmogelijke hoogtes', () => {
  it('rug niet boven de zitting, arm onder de zitting, geen plaats voor de onderbouw', () => {
    expect(codes(zetel([zit({ vorm: { rughoogte: 60 } })], { vormgeving: { zithoogte: 55 } }))).toContain('vorm.rug_te_laag');
    expect(codes(zetel([{ ...arm('a1', 0), vorm: { armhoogte: 50 } }, zit()], { vormgeving: { zithoogte: 55 } }))).toContain('vorm.arm_te_laag');
    expect(codes(zetel([zit()], { vormgeving: { zithoogte: 35, poothoogte: 30 } }))).toContain('vorm.geen_onderbouw');
    expect(bereken(zetel([arm('a1', 0), zit(), arm('a2', 115)])).geldig).toBe(true);
  });
});

describe('zetelopties die eenmalig tellen, alleen op de elementen waarvoor ze gelden', () => {
  it('vaste zitting (−3 %) niet op een poef', () => {
    const poef: OntwerpElement = { id: 'p', type: 'poef', x: 0, y: 120, breedte: 80, diepte: 60, rotatie: 0 };
    const metPoef = (zitting: string) => bereken(zetel([arm('a1', 0), zit(), arm('a2', 115), poef], { opties: { zitting } }));
    const zonderPoef = (zitting: string) => bereken(zetel([arm('a1', 0), zit(), arm('a2', 115)], { opties: { zitting } }));
    const korting = (r: ReturnType<typeof bereken>) => r.opties.find((o) => o.groep === 'zitting')?.bedrag ?? 0;
    expect(korting(metPoef('vaste_zitting'))).toBe(korting(zonderPoef('vaste_zitting')));
  });
});

describe('korting', () => {
  const o = zetel([arm('a1', 0), zit(), arm('a2', 115)]);
  it('onder de kostprijs: interne waarschuwing (niet voor de klant)', () => {
    const m = bereken(o, 30).meldingen.find((x) => x.code === 'prijs.onder_kostprijs');
    expect(m).toMatchObject({ ernst: 'waarschuwing', intern: true });
    expect(codes(o, 10)).not.toContain('prijs.onder_kostprijs');
  });
  it('altijd tussen 0 en 100 %', () => {
    expect(bereken(o, 150).prijs).toMatchObject({ kortingProcent: 100, verkoopprijsExcl: 0 });
    expect(bereken(o, -10).prijs.kortingProcent).toBe(0);
    expect(bereken(o, Number.NaN).prijs.verkoopprijsExcl).toBe(bereken(o).prijs.verkoopprijsExcl);
    expect(berekenConfiguratie(sofa, {}, sofaPrijslijst, { kortingProcent: 150 }).prijs.kortingProcent).toBe(100);
  });
});
