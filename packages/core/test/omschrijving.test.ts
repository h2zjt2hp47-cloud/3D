import { describe, expect, it } from 'vitest';
import {
  berekenOntwerp,
  blokkenVan,
  bouw3D,
  draagHoogteVan,
  ontwerpOmschrijving,
  rugleuningTop,
  tekenVooraanzicht,
  type Ontwerp,
} from '../src/index.js';
import { standaardMaterialen } from '../voorbeelden/sofa.js';
import { zetelCatalogus } from '../voorbeelden/vrij-ontwerp.js';

/** Poef met een losse rugleuning achteraan en een chaise met rug. */
const ontwerp = (extra: Partial<Ontwerp> = {}): Ontwerp => ({
  hoofdmateriaal: 'linnen_ficelle',
  elementen: [
    { id: 'c', type: 'chaise', x: 0, y: 0, breedte: 85, diepte: 165, rotatie: 0, opties: { chaise_rug: 'achter' } },
    { id: 'p', type: 'poef', x: 100, y: 0, breedte: 80, diepte: 60, rotatie: 0 },
    { id: 'r', type: 'rugleuning', x: 100, y: 0, breedte: 80, diepte: 18, rotatie: 0 },
  ],
  ...extra,
});
const bereken = (o: Ontwerp) => berekenOntwerp(o, zetelCatalogus, standaardMaterialen);
const element = (o: Ontwerp, id: string) => o.elementen.find((e) => e.id === id)!;

describe('losse rugleuning: hoogte', () => {
  it('rust op de poef en is standaard 80 cm hoog', () => {
    const o = ontwerp();
    expect(draagHoogteVan(o, zetelCatalogus, element(o, 'r'))).toBe(43); // zithoogte 45 − 2
    expect(rugleuningTop(o, zetelCatalogus, element(o, 'r'))).toBe(80);
  });
  it('een eigen hoogte volgt in het vooraanzicht en de 3D, en kost meer', () => {
    const o = ontwerp();
    element(o, 'r').vorm = { rughoogte: 95 };
    expect(rugleuningTop(o, zetelCatalogus, element(o, 'r'))).toBe(95);
    const blok = blokkenVan(bouw3D(o, zetelCatalogus, standaardMaterialen), { id: 'r' }).find((b) => b.code === 'r.rugleuning')!;
    expect(blok.y + blok.h).toBeCloseTo(95, 5);
    const voor = tekenVooraanzicht(o, zetelCatalogus, standaardMaterialen).vormen.find((v) => v.code === 'r.rugleuning')!;
    expect(-voor.y).toBeCloseTo(95, 5);
    expect(bereken(o).elementen.find((x) => x.id === 'r')!.prijs).toBeGreaterThan(bereken(ontwerp()).elementen.find((x) => x.id === 'r')!.prijs);
  });
  it('nooit lager dan 20 cm boven waar ze op rust', () => {
    const o = ontwerp();
    element(o, 'r').vorm = { rughoogte: 55 };
    expect(rugleuningTop(o, zetelCatalogus, element(o, 'r'))).toBe(63);
  });
});

describe('omschrijving voor de offerte', () => {
  it('bevat model, hoofdstof, keuzes per element, waarop opzet-elementen liggen en eigen hoogtes', () => {
    const o = ontwerp();
    element(o, 'r').vorm = { rughoogte: 95 };
    const tekst = ontwerpOmschrijving(o, zetelCatalogus, standaardMaterialen, bereken(o), { modelNaam: 'Proef' }).join('\n');
    expect(tekst).toMatch(/^Model Proef \(vrij ontwerp\), totaal/);
    expect(tekst).toContain('Hoofdstof: Linnen Ficelle (Linnen Lino, prijsgroep B)');
    expect(tekst).toMatch(/Chaise longue 85 × 165 cm, Linnen Ficelle, rugleuning: [^\n]*achter/i);
    expect(tekst).toMatch(/Losse rugleuning 80 × 18 cm, Linnen Ficelle, op element 2, hoogte 95 cm \(op maat\)/);
    expect(tekst).toContain('- Poten en onderbouw:');
    expect(tekst).toMatch(/Prijs: € [\d.,]+ excl\. btw \(€ [\d.,]+ incl\. 21% btw\)$/);
  });
  it('getekende zithoogte vervangt de gekozen maat, korting staat erbij', () => {
    const o = ontwerp({ vormgeving: { zithoogte: 47 } });
    const r = berekenOntwerp(o, zetelCatalogus, standaardMaterialen, { kortingProcent: 20 });
    const tekst = ontwerpOmschrijving(o, zetelCatalogus, standaardMaterialen, r).join('\n');
    expect(tekst).toContain('- Zithoogte: 47 cm (op maat)');
    expect(tekst).toMatch(/korting 20%: − €/);
  });
  it('laat "functie: geen" weg, maar noemt de armstijl', () => {
    const o: Ontwerp = {
      hoofdmateriaal: 'linnen_ficelle',
      elementen: [
        { id: 'a', type: 'arm', x: 0, y: 0, breedte: 20, diepte: 95, rotatie: 0 },
        { id: 'z', type: 'zit', x: 20, y: 0, breedte: 100, diepte: 95, rotatie: 0 },
      ],
    };
    const tekst = ontwerpOmschrijving(o, zetelCatalogus, standaardMaterialen, bereken(o)).join('\n');
    expect(tekst).toMatch(/Armleuning 20 × 95 cm, Linnen Ficelle, armstijl: /);
    expect(tekst).not.toMatch(/functie: Geen/i);
  });
});
