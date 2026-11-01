/**
 * Voorbeeldwoning (gelijkvloers 14 × 9 m en een verdieping erboven, met trap) met ruimtes, ramen en deuren als offerteposities,
 * binnendeuren en inrichting. Volledig verzonnen; dient om de demo meteen iets te laten tonen.
 */
import { standaardKeuzes, verfGevel, type Keuzes, type Opening, type Plattegrond, type Ruimte, type RuimteType } from '../src/index.js';
import { raamdeur } from './raam.js';

export interface DemoPositie {
  id: string;
  code: string;
  naam: string;
  model: 'RAAM' | 'AANBOUW';
  keuzes: Keuzes;
  aantal: number;
}

export function raamKeuzes(extra: Keuzes): Keuzes {
  return { ...standaardKeuzes(raamdeur), ...extra };
}

export function voorbeeldWoning(): { plan: Plattegrond; posities: DemoPositie[] } {
  const ruimte = (id: string, naam: string, type: RuimteType, x: number, y: number, b: number, d: number, vloer: string, wand: string): Ruimte =>
    ({ id, naam, type, x, y, b, d, vloer, wand });
  const ruimtes: Ruimte[] = [
    ruimte('hal', 'Inkom', 'hal', 0, 0, 260, 380, 'tegel_grijs', 'wit'),
    ruimte('wc', 'Wc', 'wc', 260, 0, 160, 180, 'tegel_grijs', 'tegels_groen'),
    ruimte('berging', 'Berging', 'berging', 260, 180, 160, 200, 'tegel_grijs', 'wit'),
    ruimte('keuken', 'Keuken', 'keuken', 420, 0, 400, 380, 'tegel_grijs', 'gebroken_wit'),
    ruimte('leef', 'Leefruimte', 'leefruimte', 0, 380, 820, 520, 'parket_eik', 'gebroken_wit'),
    ruimte('nachthal', 'Nachthal', 'hal', 820, 0, 140, 900, 'parket_eik', 'wit'),
    ruimte('slk1', 'Slaapkamer 1', 'slaapkamer', 960, 0, 440, 420, 'parket_eik', 'salie'),
    ruimte('bad', 'Badkamer', 'badkamer', 960, 420, 440, 200, 'tegel_wit', 'tegels_wit'),
    ruimte('slk2', 'Slaapkamer 2', 'slaapkamer', 960, 620, 440, 280, 'parket_eik', 'blauwgrijs'),
    // Verdieping 1 boven inkom, wc, berging en keuken.
    { ...ruimte('overloop', 'Overloop', 'hal', 0, 0, 260, 380, 'parket_eik', 'wit'), niveau: 1 },
    { ...ruimte('slk3', 'Slaapkamer 3', 'slaapkamer', 260, 0, 320, 380, 'parket_eik', 'terracotta'), niveau: 1 },
    { ...ruimte('bad2', 'Badkamer 2', 'badkamer', 580, 0, 240, 380, 'tegel_wit', 'tegels_wit'), niveau: 1 },
  ];

  const posities: DemoPositie[] = [];
  const openingen: Opening[] = [];
  let nr = 0;
  const raam = (naam: string, soort: Opening['soort'], as: 'h' | 'v', lijn: number, midden: number, b: number, h: number, borst: number, keuzes: Keuzes, deur: Partial<Opening> = {}) => {
    nr++;
    const id = `p${nr}`;
    posities.push({ id, code: `P${nr}`, naam, model: 'RAAM', aantal: 1, keuzes: raamKeuzes({ ...keuzes, breedte: b * 10, hoogte: h * 10, borstwering: borst * 10, verdieping: deur.niveau ?? 0 }) });
    openingen.push({ id: `o${nr}`, soort, as, lijn, midden, breedte: b, hoogte: h, borstwering: borst, scharnier: 'begin', naarPlus: true, positie: id, ...deur });
  };
  const alu = { profiel: 'alu_hi', kleur_buiten: 'antraciet', kleur_binnen: 'wit' };
  raam('Voordeur inkom', 'buitendeur', 'h', 0, 190, 100, 230, 0,
    { ...alu, type: 'voordeur', ruimte: 'hal', deur_draai: 'links', paneel: 'glasstrook', greep: 'vingerscan', glas: 'dubbel_gelaagd', rc2: true }, { naarPlus: true });
  raam('Raampje wc', 'raam', 'h', 0, 340, 60, 70, 150, { ...alu, ruimte: 'wc', vak1: 'kip', glas: 'mat_gelaagd', vensterbank: 'composiet' });
  raam('Raam keuken', 'raam', 'h', 0, 620, 200, 120, 105, { ...alu, ruimte: 'keuken', vakken: 'v2', vak1: 'vast', vak2: 'draaikip_r', vensterbank: 'geen' });
  raam('Raam slaapkamer 1 voorgevel', 'raam', 'h', 0, 1180, 180, 150, 90,
    { ...alu, ruimte: 'slaapkamer', vakken: 'v2', vak1: 'draaikip_l', vak2: 'draaikip_r', rooster: true, zonwering: 'screen', bediening: 'domotica' });
  raam('Raam slaapkamer 1 zijgevel', 'raam', 'v', 1400, 210, 120, 150, 90, { ...alu, ruimte: 'slaapkamer', vak1: 'draaikip_r', rooster: true, zonwering: 'screen' });
  raam('Raam badkamer', 'raam', 'v', 1400, 520, 80, 80, 140, { ...alu, ruimte: 'badkamer', vak1: 'kip', glas: 'mat_gelaagd', vensterbank: 'composiet' });
  raam('Raam slaapkamer 2', 'raam', 'v', 1400, 760, 140, 150, 90, { ...alu, ruimte: 'slaapkamer', vak1: 'draaikip_l', rooster: true, zonwering: 'rolluik' });
  raam('Terrasdeur slaapkamer 2', 'buitendeur', 'h', 900, 1040, 90, 230, 0,
    { ...alu, type: 'terrasdeur', ruimte: 'slaapkamer', vak1: 'draai_r', glas: 'dubbel_gelaagd', rooster: true, drempel: 'drempelloos', vliegenraam: 'plisse' }, { naarPlus: false, scharnier: 'einde' });
  raam('Schuifraam leefruimte', 'schuifraam', 'h', 900, 420, 400, 240, 0,
    { ...alu, kleur_buiten: 'zwart', type: 'schuif', ruimte: 'leefruimte', schuif_richting: 'beide', glas: 'triple_gelaagd', rooster: true, zonwering: 'screen', bediening: 'domotica', drempel: 'drempelloos' });
  raam('Raam leefruimte zijgevel', 'raam', 'v', 0, 480, 140, 160, 70, { ...alu, ruimte: 'leefruimte', vak1: 'draaikip_r', glas: 'dubbel_gelaagd', rooster: true, vensterbank: 'eik' });
  // Verdieping 1.
  const op1 = { niveau: 1 };
  raam('Raam overloop voorgevel', 'raam', 'h', 0, 150, 100, 120, 100, { ...alu, ruimte: 'hal', vak1: 'draaikip_l' }, op1);
  raam('Raam slaapkamer 3', 'raam', 'h', 0, 420, 180, 150, 90,
    { ...alu, ruimte: 'slaapkamer', vakken: 'v2', vak1: 'draaikip_l', vak2: 'draaikip_r', rooster: true, zonwering: 'screen', bediening: 'motor' }, op1);
  raam('Raam badkamer 2', 'raam', 'h', 0, 700, 80, 80, 150, { ...alu, ruimte: 'badkamer', vak1: 'kip', glas: 'mat_gelaagd', vensterbank: 'composiet' }, op1);
  raam('Raam overloop naar dakterras', 'raam', 'h', 380, 130, 120, 180, 40, { ...alu, ruimte: 'hal', vak1: 'draai_l', glas: 'dubbel_gelaagd', vensterbank: 'geen' }, op1);

  const deur = (id: string, soort: 'binnendeur' | 'doorgang', as: 'h' | 'v', lijn: number, midden: number, b: number, deurtype: string, naarPlus: boolean, scharnier: 'begin' | 'einde'): Opening =>
    ({ id, soort, as, lijn, midden, breedte: b, hoogte: soort === 'doorgang' ? 220 : 211, borstwering: 0, scharnier, naarPlus, deurtype });
  openingen.push(
    deur('d1', 'binnendeur', 'h', 380, 130, 90, 'glas', true, 'begin'),
    deur('d2', 'binnendeur', 'v', 260, 90, 80, 'schilder', true, 'begin'),
    deur('d3', 'binnendeur', 'v', 260, 290, 80, 'schilder', true, 'einde'),
    deur('d4', 'doorgang', 'h', 380, 620, 200, '', true, 'begin'),
    deur('d5', 'binnendeur', 'v', 820, 640, 90, 'eik', false, 'begin'),
    deur('d6', 'binnendeur', 'v', 960, 330, 90, 'schilder', true, 'einde'),
    deur('d7', 'binnendeur', 'v', 960, 520, 80, 'schuif', true, 'begin'),
    deur('d8', 'binnendeur', 'v', 960, 700, 90, 'schilder', true, 'begin'),
    { ...deur('d9', 'binnendeur', 'v', 260, 300, 80, 'schilder', true, 'einde'), niveau: 1 },
    { ...deur('d10', 'binnendeur', 'v', 580, 200, 80, 'schuif', true, 'begin'), niveau: 1 },
  );

  let m = 0;
  const meubel = (type: string, x: number, y: number, b: number, d: number, rotatie: 0 | 90 | 180 | 270 = 0, niveau = 0) => ({ id: `m${++m}`, type, x, y, b, d, rotatie, niveau });
  const meubels = [
    meubel('tapijt', 125, 620, 240, 170, 90),
    meubel('bank3', 300, 625, 230, 95, 90),
    meubel('tv', 15, 650, 180, 45, 270),
    meubel('salontafel', 170, 685, 110, 60, 90),
    meubel('eettafel', 470, 560, 200, 95),
    meubel('stoel', 485, 505, 45, 50), meubel('stoel', 547, 505, 45, 50), meubel('stoel', 610, 505, 45, 50),
    meubel('stoel', 485, 660, 45, 50, 180), meubel('stoel', 547, 660, 45, 50, 180), meubel('stoel', 610, 660, 45, 50, 180),
    meubel('plant', 755, 400, 50, 50),
    meubel('plant', 680, 820, 50, 50),
    meubel('keuken', 753, 15, 360, 62, 90),
    meubel('eiland', 520, 80, 240, 100, 90),
    meubel('koelkast', 430, 15, 60, 62),
    meubel('trap', 15, 60, 100, 300),
    meubel('wc', 360, 110, 40, 55, 90),
    meubel('bed2', 1100, 200, 165, 215, 180),
    meubel('nachtkast', 1050, 375, 45, 40, 180), meubel('nachtkast', 1270, 375, 45, 40, 180),
    meubel('kleerkast', 965, 20, 200, 60, 270),
    meubel('bad', 1030, 425, 170, 75),
    meubel('douche', 1265, 425, 120, 90),
    meubel('lavabo', 1100, 565, 120, 50, 180),
    meubel('wc', 1300, 560, 40, 55, 180),
    meubel('bed1', 1175, 700, 95, 210, 90),
    meubel('bureau', 1055, 625, 120, 60),
    meubel('kleerkast', 1230, 625, 150, 60),
    // Verdieping 1.
    meubel('bed2', 330, 20, 165, 215, 0, 1),
    meubel('nachtkast', 280, 20, 45, 40, 0, 1), meubel('nachtkast', 500, 20, 45, 40, 0, 1),
    meubel('kleerkast', 360, 315, 200, 60, 180, 1),
    meubel('douche', 725, 15, 90, 90, 0, 1),
    meubel('lavabo', 600, 325, 120, 50, 180, 1),
    meubel('wc', 760, 200, 40, 55, 90, 1),
    meubel('plant', 180, 300, 50, 50, 0, 1),
  ];
  const plan: Plattegrond = {
    ruimtes, openingen, meubels,
    muurhoogte: 270, buitenmuur: 30, binnenmuur: 10,
    verdiepingen: [{ naam: 'Gelijkvloers' }, { naam: 'Verdieping 1' }],
    gevel: { soort: 'steen', kleur: '#9c4a34' },
    // Gevel: rode handvormsteen met grijze voeg, sokkel in blauwe hardsteen, verdieping in zwart gebeitst hout.
    gevelOntwerp: {
      standaard: { materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' },
      sokkel: { materiaal: 'natuursteen', kleur: 'blauwgrijs', hoogte: 30 },
    },
  };
  verfGevel(plan, { materiaal: 'hout_staand', kleur: 'zwart' }, 'verdieping', { niveau: 1 });
  return { plan, posities };
}
