import { describe, expect, it } from 'vitest';
import { controleerOpbouw, dragendeLaag, laagPlaatsen, totaleDikte, LAAG_ROLLEN, type BouwMateriaal, type Opbouw } from '../src/index.js';
import { bouwMaterialen, opbouwen } from '../voorbeelden/opbouwen.js';

const fouten = (o: Opbouw, m?: Record<string, BouwMateriaal>) => controleerOpbouw(o, m).filter((p) => p.ernst === 'fout');
const letOp = (o: Opbouw, m?: Record<string, BouwMateriaal>) => controleerOpbouw(o, m).filter((p) => p.ernst === 'waarschuwing');
/** Een kleine, geldige wand om fouten in te maken. */
const wand = (): Opbouw => ({
  naam: 'Proefwand',
  soort: 'wand',
  lagen: [
    { naam: 'Gipsplaat', materiaal: 'gipsplaat', dikte: 12.5, rol: 'afwerking_binnen' },
    { naam: 'Skelet', materiaal: 'vuren', dikte: 140, rol: 'skelet', hout: { breedte: 38, hoh: 600, vulling: 'minerale_wol' } },
    { naam: 'OSB', materiaal: 'osb', dikte: 15, rol: 'plaat' },
    { naam: 'Planken', materiaal: 'gevelplanken', dikte: 21, rol: 'afwerking_buiten' },
  ],
});

describe('opbouw: dikte en plaats van de lagen', () => {
  it('telt de diktes op, in mm', () => {
    expect(totaleDikte(wand())).toBe(188.5);
    // Houtskelet met houten gevel: 12,5 + 45 + 0,2 + 140 + 15 + 0,5 + 28 + 21.
    expect(totaleDikte(opbouwen.hsb_hout!)).toBeCloseTo(262.2, 6);
    expect(totaleDikte(opbouwen.spouwmuur!)).toBe(392);
  });

  it('geeft elke laag haar plaats, van binnen naar buiten (of van onder naar boven), zonder gaten', () => {
    const p = laagPlaatsen(wand());
    expect(p.map((x) => [x.van, x.tot])).toEqual([[0, 12.5], [12.5, 152.5], [152.5, 167.5], [167.5, 188.5]]);
    expect(p.map((x) => x.index)).toEqual([0, 1, 2, 3]);
    for (const o of Object.values(opbouwen)) {
      const q = laagPlaatsen(o);
      expect(q[0]!.van).toBe(0);
      q.forEach((x, i) => { if (i) expect(x.van).toBe(q[i - 1]!.tot); });
      expect(q[q.length - 1]!.tot).toBeCloseTo(totaleDikte(o), 6);
    }
  });

  it('weet welke laag draagt: het skelet, anders de eerste massieve laag, anders de dikste', () => {
    expect(dragendeLaag(opbouwen.hsb_hout!)).toBe(3);
    expect(opbouwen.spouwmuur!.lagen[dragendeLaag(opbouwen.spouwmuur!)]!.naam).toBe('Binnenspouwblad');
    expect(opbouwen.vloer_volle_grond!.lagen[dragendeLaag(opbouwen.vloer_volle_grond!)]!.naam).toBe('Betonplaat');
    expect(dragendeLaag({ naam: 'x', soort: 'wand', lagen: [{ naam: 'a', materiaal: 'osb', dikte: 10, rol: 'plaat' }, { naam: 'b', materiaal: 'osb', dikte: 30, rol: 'isolatie' }] })).toBe(1);
    expect(dragendeLaag({ naam: 'leeg', soort: 'wand', lagen: [] })).toBe(-1);
  });
});

describe('opbouw: gewone gegevens', () => {
  it('gaat naar JSON en terug zonder verlies, ook met een warmtegeleiding', () => {
    for (const o of Object.values(opbouwen)) expect(JSON.parse(JSON.stringify(o))).toStrictEqual(o);
    expect(JSON.parse(JSON.stringify(bouwMaterialen))).toStrictEqual(bouwMaterialen);
    const metLambda: BouwMateriaal = { label: 'Proefisolatie', soort: 'gevel', kleur: '#ffee88', warmtegeleiding: 0.035 };
    expect(JSON.parse(JSON.stringify(metLambda))).toStrictEqual(metLambda);
    // Niets in een opbouw is een functie of een klasse: de kopie is diep gelijk en heeft dezelfde lagen.
    const kopie = JSON.parse(JSON.stringify(opbouwen.hsb_hout)) as Opbouw;
    expect(totaleDikte(kopie)).toBe(totaleDikte(opbouwen.hsb_hout!));
    expect(controleerOpbouw(kopie, bouwMaterialen)).toEqual(controleerOpbouw(opbouwen.hsb_hout!, bouwMaterialen));
  });
});

describe('opbouw: de controle zegt in gewone taal wat er niet klopt', () => {
  it('vindt niets aan een geldige opbouw', () => {
    expect(controleerOpbouw(wand(), bouwMaterialen)).toEqual([]);
  });

  it('geen lagen', () => {
    const p = controleerOpbouw({ naam: 'Lege wand', soort: 'wand', lagen: [] });
    expect(p).toEqual([{ ernst: 'fout', tekst: 'De opbouw «Lege wand» heeft geen lagen.' }]);
  });

  it('een laag met dikte nul, zonder naam of zonder materiaal', () => {
    const o = wand();
    o.lagen[2]!.dikte = 0;
    expect(fouten(o)).toEqual([{ ernst: 'fout', laag: 2, tekst: 'Laag 3 (OSB) heeft geen dikte: vul een dikte in mm in, groter dan nul.' }]);
    const zonder = wand();
    zonder.lagen[0]!.naam = '';
    zonder.lagen[3]!.materiaal = '';
    expect(fouten(zonder).map((p) => p.tekst)).toEqual(['Laag 1 heeft geen naam.', 'Laag 4 (Planken) heeft geen materiaal.']);
  });

  it('twee skeletlagen', () => {
    const o = wand();
    o.lagen.splice(2, 0, { naam: 'Tweede skelet', materiaal: 'vuren', dikte: 89, rol: 'skelet', hout: { breedte: 38, hoh: 600 } });
    const p = fouten(o);
    expect(p).toHaveLength(1);
    expect(p[0]!.tekst).toContain('2 skeletlagen (laag 2 en laag 3)');
    expect(p[0]!.tekst).toContain('leidingspouw');
  });

  it('een skelet zonder hout, of hout dat elkaar raakt', () => {
    const zonder = wand();
    delete zonder.lagen[1]!.hout;
    expect(fouten(zonder)[0]!.tekst).toBe('Laag 2 (Skelet) is een skelet, maar de breedte en de hart-op-hartafstand van het hout ontbreken.');
    const dicht = wand();
    dicht.lagen[1]!.hout = { breedte: 45, hoh: 40 };
    expect(fouten(dicht)[0]!.tekst).toBe('Laag 2 (Skelet): de hart-op-hartafstand (40 mm) is niet groter dan de breedte van het hout (45 mm): de stukken raken elkaar.');
  });

  it('een materiaal of een vulling die niet in de lijst staat (alleen als de lijst erbij is)', () => {
    const o = wand();
    o.lagen[2]!.materiaal = 'triplex';
    o.lagen[1]!.hout!.vulling = 'schapenwol';
    expect(fouten(o)).toEqual([]);
    expect(fouten(o, bouwMaterialen).map((p) => p.tekst)).toEqual([
      'Laag 2 (Skelet): de vulling «schapenwol» staat niet in de materialenlijst.',
      'Laag 3 (OSB) gebruikt het materiaal «triplex», dat niet in de materialenlijst staat.',
    ]);
  });

  it('waarschuwt voor wat waarschijnlijk een vergissing is', () => {
    const o = wand();
    o.lagen.splice(2, 0, { naam: 'Dampscherm', materiaal: 'dampscherm', dikte: 20, rol: 'folie' });
    expect(letOp(o).map((p) => p.tekst)).toEqual(['Laag 3 (Dampscherm) is een folie van 20 mm: staat de dikte wel in mm?']);

    // Een afwerking midden in de opbouw, en een opbouw in cm in plaats van mm.
    const midden = wand();
    midden.lagen.splice(1, 0, { naam: 'Tweede gipsplaat', materiaal: 'gipsplaat', dikte: 12.5, rol: 'afwerking_binnen' });
    expect(letOp(midden).map((p) => p.tekst)).toEqual(['Laag 2 (Tweede gipsplaat) is een afwerking binnen, maar ligt midden in de opbouw: ze is niet te zien.']);
    const inCm: Opbouw = { naam: 'In cm', soort: 'wand', lagen: [{ naam: 'Gipsplaat', materiaal: 'gipsplaat', dikte: 1.25, rol: 'afwerking_binnen' }, { naam: 'Steen', materiaal: 'snelbouwsteen', dikte: 14, rol: 'massief' }] };
    expect(letOp(inCm).map((p) => p.tekst)).toEqual(['De opbouw «In cm» is in totaal 15,25 mm dik: staan de diktes wel in mm?']);

    // Hout bij een laag die geen skelet of latten is, en een afwerking buiten in een vloer.
    const hout = wand();
    hout.lagen[2]!.hout = { breedte: 45, hoh: 600 };
    expect(letOp(hout)[0]!.tekst).toContain('haar rol is «plaat»');
    const vloer: Opbouw = { naam: 'Vloer', soort: 'vloer', lagen: [{ naam: 'Beton', materiaal: 'beton', dikte: 150, rol: 'massief' }, { naam: 'Tegels', materiaal: 'vloertegels', dikte: 10, rol: 'afwerking_buiten' }] };
    expect(letOp(vloer)[0]!.tekst).toContain('dit is een vloer');
  });

  it('weigert iets dat geen opbouw is', () => {
    expect(controleerOpbouw(null as unknown as Opbouw)).toEqual([{ ernst: 'fout', tekst: 'Dit is geen opbouw.' }]);
    const zonderSoort = { naam: 'Raar', lagen: [{ naam: 'a', materiaal: 'osb', dikte: 18, rol: 'dak' }] } as unknown as Opbouw;
    expect(fouten(zonderSoort).map((p) => p.tekst)).toEqual([
      'De opbouw «Raar» zegt niet of ze voor een wand, een vloer of een dak is.',
      'Laag 1 (a) heeft geen geldige rol (bv. plaat, isolatie, skelet).',
    ]);
  });
});

describe('opbouw: de catalogus met voorbeelden', () => {
  it('bevat de gevraagde opbouwen, elk voor de juiste soort', () => {
    expect(Object.fromEntries(Object.entries(opbouwen).map(([k, o]) => [k, o.soort]))).toEqual({
      hsb_hout: 'wand', hsb_steenstrips: 'wand', hsb_pleister: 'wand', spouwmuur: 'wand', binnenwand_hsb: 'wand',
      plat_dak_warm: 'dak', hellend_dak_pannen: 'dak', vloer_volle_grond: 'vloer', verdiepingsvloer_hout: 'vloer',
      hellend_dak_leien: 'dak', hellend_dak_zink: 'dak',
    });
  });

  it('heeft geen fouten; de enige waarschuwing is dat een vakman ze moet nalezen', () => {
    for (const [code, o] of Object.entries(opbouwen)) {
      expect(fouten(o, bouwMaterialen), code).toEqual([]);
      expect(letOp(o, bouwMaterialen).map((p) => p.tekst), code).toEqual([`De opbouw «${o.naam}» is een voorbeeld: ze is niet nagelezen door een vakman.`]);
    }
  });

  it('zegt van elke opbouw waar ze vandaan komt, en geen enkele is nagelezen', () => {
    for (const [code, o] of Object.entries(opbouwen)) {
      expect(o.herkomst, code).toBeDefined();
      expect(o.herkomst!.nagelezen, code).toBe(false);
      expect(['algemene kennis', 'onderzoek'], code).toContain(o.herkomst!.bron);
      // Wat uit het onderzoek komt, noemt het document en de bronverwijzing.
      if (o.herkomst!.bron === 'onderzoek') expect(o.herkomst!.verwijzing, code).toMatch(/docs\/onderzoek-bouw-constructies\.md, hoofdstuk 2.*\[H\d+\]/);
    }
  });

  it('rekent nergens met de warmtegeleiding: het veld is in de voorbeelden leeg gelaten', () => {
    for (const m of Object.values(bouwMaterialen)) expect(m.warmtegeleiding).toBeUndefined();
  });

  it('kent voor elke rol een naam in gewone taal', () => {
    const rollen = new Set(Object.values(opbouwen).flatMap((o) => o.lagen.map((l) => l.rol)));
    for (const r of rollen) expect(LAAG_ROLLEN[r]).toBeTruthy();
    expect(rollen.size).toBe(Object.keys(LAAG_ROLLEN).length);
  });
});
