/**
 * Herstellingen uit de doorloop, deel B (16/11): wat de klant te zien krijgt in de posten van het werk en in de namen.
 *   - B3: een hellend dak in zink of leien kreeg de opbouw met panlatten en pannen (en heette zo); nu volgt de opbouw de
 *     gekozen bedekking. "Ook op de bestaande muren" alleen als er een muur blijft;
 *   - B23: twee posten met dezelfde titel ("Buitenwand in houtskelet") zeggen nu waarin ze verschillen;
 *   - B22: de uitleg bij *Afbraak van het terras* sprak over een uitbouw, ook bij een nieuwe woning;
 *   - B25: een carport stond bij de supplementen; een schuifraam uit de snelstart heette "Raam".
 */
import { describe, expect, it } from 'vitest';
import { doosMaatlijnen, opbouwVoor, POST_GROEP_NAAM, POST_GROEPEN, postenVan, WERK_VOORSTELLEN, woningConstructie, type Plattegrond } from '../src/index.js';
import { planCatalogus } from '../voorbeelden/inrichting.js';
import { raamNaam, snelRaam, snelWoning } from '../voorbeelden/snelstart.js';
import { stijlCatalogus } from '../voorbeelden/stijlen.js';
import { uitbouwVoorbeeld } from '../voorbeelden/uitbouwvoorbeeld.js';
import { woningOpbouwCatalogus } from '../voorbeelden/woningopbouw.js';

const cat = { ...planCatalogus, opbouw: woningOpbouwCatalogus };
const woning = (stijl: string, maten = { breedte: 900, diepte: 1000, verdiepingen: 2 }) => snelWoning(maten, stijlCatalogus[stijl]!);
const posten = (plan: Plattegrond) => postenVan(plan, cat);
const dakpost = (plan: Plattegrond) => posten(plan).find((p) => p.id.startsWith('dak:hellend:'));

describe('B3: de opbouw van een hellend dak volgt de bedekking', () => {
  it('zink: dakbeschot en zink, geen panlatten of pannen; de titel zegt zink', () => {
    const { plan } = woning('hout');
    expect(plan.dak?.bedekking.materiaal).toBe('zink');
    const p = dakpost(plan)!;
    expect(p.titel).toBe('Hellend dak met kepers en zink');
    const tekst = p.detail.join(' ');
    expect(tekst).toMatch(/dakbeschot in houten planken 23 mm/);
    expect(tekst).toMatch(/Dakbedekking: Zink met staande naad, antraciet\./);
    expect(tekst).not.toMatch(/panlat|pannen/i);
    expect(p.intern.join(' ')).not.toMatch(/panlat/i);
    // Ook de constructie (meetstaat, doorsnede, 3D) gebruikt die opbouw.
    expect(new Set(woningConstructie(plan, cat).delen.filter((d) => d.plaats === 'hellendDak').map((d) => d.opbouw))).toEqual(new Set(['hellend_dak_zink']));
  });

  it('leien: leilatten en leien; pannen: zoals vroeger, met panlatten en pannen', () => {
    const leien = dakpost(woning('landelijk').plan)!;
    expect(leien.titel).toBe('Hellend dak met kepers en leien');
    expect(leien.detail.join(' ')).toMatch(/leilatten 25 mm/);
    expect(leien.detail.join(' ')).not.toMatch(/panlat/i);
    const pannen = dakpost(woning('klassiek').plan)!;
    expect(pannen.titel).toBe('Hellend dak met kepers en dakpannen');
    expect(pannen.detail.join(' ')).toMatch(/panlatten 28 mm/);
  });

  it('een eigen keuze voor het hellende dak gaat voor de bedekking; zonder bedekking de standaard', () => {
    const { plan } = woning('hout');
    expect(opbouwVoor(plan, woningOpbouwCatalogus, 'hellendDak', { bedekking: 'zink' })).toBe('hellend_dak_zink');
    expect(opbouwVoor({ ...plan, opbouw: { hellendDak: 'hellend_dak_pannen' } }, woningOpbouwCatalogus, 'hellendDak', { bedekking: 'zink' })).toBe('hellend_dak_pannen');
    expect(opbouwVoor(plan, woningOpbouwCatalogus, 'hellendDak')).toBe('hellend_dak_pannen');
    expect(opbouwVoor(plan, woningOpbouwCatalogus, 'hellendDak', { bedekking: 'onbekend' })).toBe('hellend_dak_pannen');
  });

  it('"ook op de bestaande muren" alleen als er een muur blijft', () => {
    for (const stijl of Object.keys(stijlCatalogus)) {
      const wanden = posten(woning(stijl).plan).filter((p) => p.id.startsWith('binnenwanden:'));
      expect(wanden.length, stijl).toBeGreaterThan(0);
      for (const p of wanden) expect(p.detail.join(' '), stijl).not.toMatch(/bestaande muren|buren/);
    }
    const { plan } = uitbouwVoorbeeld();
    const wand = posten(plan).find((p) => p.id.startsWith('binnenwanden:'))!;
    expect(wand.detail.join(' ')).toMatch(/ook op de bestaande muren en de muren van de buren aan de binnenkant/);
  });
});

describe('B23: geen twee posten met dezelfde titel', () => {
  it('elke stijl en elke grootte uit de snelstart', () => {
    for (const stijl of Object.keys(stijlCatalogus)) {
      for (const maten of [{ breedte: 700, diepte: 800, verdiepingen: 1 }, { breedte: 900, diepte: 1000, verdiepingen: 2 }, { breedte: 1400, diepte: 1200, verdiepingen: 3 }]) {
        const titels = posten(woning(stijl, maten).plan).map((p) => p.titel);
        expect(titels.filter((t, i) => titels.indexOf(t) !== i), `${stijl} ${JSON.stringify(maten)}`).toEqual([]);
      }
    }
  });

  it('twee buitenwanden in houtskelet: de titel zegt wat er buiten op komt', () => {
    const wanden = posten(woning('hout').plan).filter((p) => p.id.startsWith('wand:buitenwand:'));
    expect(wanden.map((p) => p.titel).sort()).toEqual(['Buitenwand in houtskelet achter gevelsteen (handvorm)', 'Buitenwand in houtskelet achter houten bekleding, staand']);
    // Eén soort buitenwand: de korte titel van vroeger.
    const een = posten(woning('klassiek').plan).filter((p) => p.id.startsWith('wand:buitenwand:'));
    expect(een.map((p) => p.titel)).toEqual(['Buitenwand in houtskelet']);
  });
});

describe('B22 en B25: de juiste woorden', () => {
  it('afbraak van het terras: algemeen, niet "waar de uitbouw komt"', () => {
    const afbraak = WERK_VOORSTELLEN.find((w) => w.code === 'afbraak_terras')!;
    expect(afbraak.uitleg).not.toMatch(/uitbouw/);
    expect(afbraak.uitleg).toMatch(/waar gebouwd wordt/);
  });

  it('een carport, tuinhuis of loods staat bij de bijgebouwen en het buitenwerk, een aanbouw bij de ruwbouw', () => {
    expect(POST_GROEPEN.indexOf('buitenwerk')).toBe(POST_GROEPEN.indexOf('supplementen') - 1);
    expect(POST_GROEP_NAAM.buitenwerk).toBe('Bijgebouwen en buitenwerk');
    const leeg: Plattegrond = { ruimtes: [], openingen: [], meubels: [] } as unknown as Plattegrond;
    const lijst = postenVan(leeg, cat, {
      posities: [
        { id: 'c', naam: 'Carport', aantal: 1, kort: 'Carport · 5 × 5 m', soort: 'ander' },
        { id: 'a', naam: 'Aanbouw', aantal: 1, kort: 'Aanbouw · 465 × 400 cm', soort: 'ander', groep: 'ruwbouw' },
      ],
      handmatig: [{ id: 'w', titel: 'Opkuis van de werf' }],
    });
    expect(lijst.map((p) => [p.groep, p.titel])).toEqual([['ruwbouw', 'Aanbouw · 465 × 400 cm'], ['buitenwerk', 'Carport · 5 × 5 m'], ['supplementen', 'Opkuis van de werf']]);
  });

  it('een raam of deur uit de snelstart heet naar zijn soort', () => {
    const stijl = stijlCatalogus.klassiek!;
    const naam = (breedte: number, hoogte: number) => raamNaam(snelRaam({ breedte, hoogte }, stijl));
    expect(naam(2500, 2300)).toBe('Schuifraam');
    expect(naam(1200, 1400)).toBe('Raam');
    expect(naam(900, 2300)).toBe('Terrasdeur');
    expect(naam(1800, 2300)).toBe('Dubbele terrasdeur');
    expect(naam(5000, 2400)).toBe('Hef-schuifdeur');
    expect(raamNaam({ type: 'voordeur' })).toBe('Voordeur');
    expect(raamNaam({ type: 'vouwwand' })).toBe('Vouwwand');
    expect(raamNaam({ type: 'glaswand' })).toBe('Vaste glaswand');
  });
});

describe('B26: de maten van een carport, tuinhuis of loods lopen niet over elkaar', () => {
  type Doos = { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number };
  /**
   * Doet na wat de kijker doet (drie-d.ts, `schik`): per groep de maat waarvan `kant` het meest naar de camera wijst; een
   * maat die je in haar lengte ziet, valt weg; het label staat in het midden van de maatlijn, 26 beeldpunten hoog. Dan de
   * labels op een scherm van 900 × 558 (de 3D tekent op 62 % van haar breedte). `oud`: de hoogte zoals vroeger (de hoek
   * het dichtst bij de camera).
   */
  function labels(doos: Doos, H: number, V: number, oud = false) {
    const lijnen = doosMaatlijnen(doos);
    const B = 900, Hp = 558, t = Math.tan((35 * Math.PI) / 360);
    const dot = (a: number[], b: number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
    const eenheid = (a: number[]) => { const n = Math.hypot(...a); return a.map((x) => x / n); };
    const doel = [(doos.x0 + doos.x1) / 2, Math.min(Math.max(40, doos.y1 * 0.35), doos.y1 / 2), (doos.z0 + doos.z1) / 2];
    const terug = [Math.cos(V) * Math.sin(H), Math.sin(V), Math.cos(V) * Math.cos(H)];
    const rechts = eenheid([terug[2]!, 0, -terug[0]!]);
    const op = [terug[1]! * rechts[2]!, terug[2]! * rechts[0]! - terug[0]! * rechts[2]!, -terug[1]! * rechts[0]!];
    const afstand = Math.max(doos.x1 - doos.x0, doos.z1 - doos.z0) * 1.9;
    const cam = doel.map((v, i) => v + afstand * terug[i]!);
    const midden = (l: (typeof lijnen)[number]) => { const u = eenheid(l.uit); return [0, 1, 2].map((i) => (l.van[i]! + l.tot[i]!) / 2 + u[i]! * l.afstand); };
    const naarCamera = (l: (typeof lijnen)[number]) => eenheid(cam.map((x, i) => x - midden(l)[i]!));
    const beste = new Map<string, { l: (typeof lijnen)[number]; w: number }>();
    for (const l of lijnen) {
      const w = dot(naarCamera(l), oud && l.groep === 'hoogte' ? eenheid(l.uit) : l.kant!);
      if (!beste.has(l.groep!) || w > beste.get(l.groep!)!.w) beste.set(l.groep!, { l, w });
    }
    return [...beste.values()].filter(({ l }) => Math.abs(dot(naarCamera(l), eenheid(l.tot.map((x, i) => x - l.van[i]!)))) < 0.88).map(({ l }) => {
      const v = midden(l).map((x, i) => x - cam[i]!), z = -dot(v, terug);
      const x = B / 2 + (dot(v, rechts) / z / t) * (Hp / 2), y = Hp / 2 - (dot(v, op) / z / t) * (Hp / 2);
      const breed = 26 * (l.tekst.length * 0.62 + 0.7);
      return { tekst: l.tekst, x0: x - breed / 2, x1: x + breed / 2, y0: y - 13, y1: y + 13 };
    });
  }
  type Label = ReturnType<typeof labels>[number];
  const raken = (a: Label, b: Label) => a.x0 < b.x1 + 4 && b.x0 < a.x1 + 4 && a.y0 < b.y1 + 4 && b.y0 < a.y1 + 4;
  const botst = (l: Label[]) => { const h = l.find((x) => x.tekst.startsWith('Hoogte'))!; return l.filter((x) => x !== h && raken(h, x)).map((x) => x.tekst); };
  const STANDPUNTEN: [string, number, number][] = [['schuin', -0.6, 0.42], ['voor', 0, 0.12], ['zij', Math.PI / 2, 0.15], ['achter', Math.PI + 0.5, 0.3], ['ooghoogte', -0.25, 0.1]];
  const MODELLEN: [string, Doos][] = [
    ['loods', { x0: 0, x1: 1500, z0: 0, z1: 3000, y0: 15, y1: 658 }], ['carport', { x0: 0, x1: 500, z0: 0, z1: 500, y0: 0, y1: 261 }],
    ['tuinhuis', { x0: 0, x1: 300, z0: 0, z1: 250, y0: 0, y1: 250 }], ['smalle carport', { x0: 0, x1: 300, z0: 0, z1: 600, y0: 0, y1: 240 }],
  ];

  it('in elk vast standpunt raakt "Hoogte" geen andere maat', () => {
    for (const [naam, doos] of MODELLEN) for (const [sp, H, V] of STANDPUNTEN) expect(botst(labels(doos, H, V)), `${naam} ${sp}`).toEqual([]);
  });

  it('vroeger wel: de loods schuin, "Hoogte" over "Breedte" (het beeld van de doorloop)', () => {
    expect(botst(labels(MODELLEN[0]![1], -0.6, 0.42, true))).toEqual(['Breedte 15,00 m']);
  });
});
