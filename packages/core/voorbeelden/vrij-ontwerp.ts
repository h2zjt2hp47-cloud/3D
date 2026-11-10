/**
 * Catalogus voor vrije zetelontwerpen (DEMO: alle prijzen en verbruiken zijn verzonnen).
 * Elk elementtype heeft maten per cm, een prijs per prijsgroep en een meerprijs per 10 cm.
 */
import type { Ontwerp, OntwerpCatalogus, OptieGroep } from '../src/index.js';

const g = (a: number, b: number, c: number, eigen: number) => ({ A: a, B: b, C: c, EIGEN: eigen });

const GESTOFFEERD = ['zit', 'hoek', 'chaise', 'zit_zonder_rug', 'arm', 'poef', 'rond_einde', 'fauteuil'];
const ZITTEN = ['zit', 'hoek', 'chaise', 'zit_zonder_rug', 'poef', 'rond_einde', 'fauteuil'];
const MET_RUG = ['zit', 'hoek', 'rond_einde', 'fauteuil', 'chaise'];
/** Opzet-elementen: liggen bovenop een ander element. */
const OPZET = ['rugleuning', 'rugkussen', 'sierkussen', 'rolkussen'];

/**
 * Aanpassingen, gebaseerd op wat zetelmerken gangbaar aanbieden:
 * poten en onderbouw, poothoogte, houtafwerking, metaalafwerking, zithoogte, zitcomfort,
 * zitting, rug, rughoogte, naden/bies, armstijl, armhoogte, extra's en houten tussenstukken.
 */
export const zetelOpties: OptieGroep[] = [
  {
    code: 'poten', label: 'Poten en onderbouw', niveau: 'ontwerp', perElement: true, voorTypen: GESTOFFEERD, standaard: 'conisch',
    keuzes: [
      { code: 'conisch', label: 'Conische houten poot', uitleg: 'Taps toelopend, Scandinavisch', teken: { vorm: 'conisch' }, kost: 12 },
      { code: 'blok', label: 'Houten blokpoot', prijs: 12, teken: { vorm: 'blok' }, kost: 14 },
      { code: 'cilinder', label: 'Houten cilinderpoot', prijs: 8, teken: { vorm: 'cilinder' }, kost: 12 },
      { code: 'slede', label: 'Metalen slede (U-frame)', prijs: 95, teken: { vorm: 'slede', metaal: true }, kost: 45 },
      { code: 'haarspeld', label: 'Haarspeldpoot (metaal)', prijs: 35, teken: { vorm: 'haarspeld', metaal: true }, kost: 18 },
      { code: 'messing', label: 'Messing cilinderpoot', prijs: 60, teken: { vorm: 'cilinder', metaal: true, kleur: '#b8963e' }, kost: 32 },
      { code: 'metaal_staaf', label: 'Slanke metalen poot', prijs: 25, teken: { vorm: 'cilinder', metaal: true }, kost: 14 },
      { code: 'draaivoet', label: 'Draaivoet (zwenkvoet)', uitleg: 'Centrale voet, de zetel kan draaien', prijs: 85, teken: { vorm: 'draaivoet' }, kost: 40 },
      { code: 'housse', label: 'Hoes tot op de grond (housse)', uitleg: 'Afneembare hoes die de poten bedekt', prijsPerM: 60, stofPct: 18, teken: { vorm: 'housse' }, kost: 10 },
      {
        code: 'plint', label: 'Houten plint (sokkel)', uitleg: 'Doorlopende lage sokkel', prijsPerM: 140, teken: { vorm: 'plint' }, kostPerM: 55,
        alleenMet: { poothoogte: ['laag'] }, reden: 'een plint is altijd laag',
      },
      {
        code: 'verdekt', label: 'Verdekte poten (zwevend)', uitleg: 'Poten ver naar binnen, zetel lijkt te zweven', prijs: 20, teken: { vorm: 'verdekt' }, kost: 10,
        alleenMet: { poothoogte: ['laag', 'standaard'] }, reden: 'verdekte poten zijn hoogstens 8 cm',
      },
    ],
  },
  {
    code: 'poothoogte', label: 'Poothoogte', niveau: 'ontwerp', voorTypen: GESTOFFEERD, standaard: 'standaard',
    keuzes: [
      { code: 'laag', label: 'Laag (4 cm)', teken: { hoogte: 4 } },
      { code: 'standaard', label: 'Standaard (12 cm)', teken: { hoogte: 12 } },
      { code: 'hoog', label: 'Hoog (18 cm)', prijs: 40, teken: { hoogte: 18 }, uitleg: 'Makkelijker poetsen eronder' },
    ],
  },
  {
    code: 'hout', label: 'Houtafwerking', niveau: 'ontwerp', standaard: 'eik_naturel',
    keuzes: [
      { code: 'eik_naturel', label: 'Eik naturel geolied', teken: { kleur: '#c8a27a' } },
      { code: 'eik_zwart', label: 'Eik zwart gebeitst', teken: { kleur: '#2f2a26' } },
      { code: 'eik_gerookt', label: 'Gerookte eik', prijs: 60, teken: { kleur: '#7a5a3f' } },
      { code: 'notelaar', label: 'Amerikaanse notelaar', prijs: 120, teken: { kleur: '#5e4030' }, kost: 50 },
      { code: 'essen_wit', label: 'Essen wit gepigmenteerd', prijs: 40, teken: { kleur: '#e3d6bf' } },
    ],
  },
  {
    code: 'metaal', label: 'Metaalafwerking', niveau: 'ontwerp', standaard: 'zwart',
    keuzes: [
      { code: 'zwart', label: 'Mat zwart', teken: { kleur: '#2b2b2b' } },
      { code: 'brons', label: 'Brons', prijs: 40, teken: { kleur: '#7c5b3a' } },
      { code: 'rvs', label: 'Geborsteld rvs', prijs: 30, teken: { kleur: '#a7a9ac' } },
      { code: 'chroom', label: 'Chroom', prijs: 30, teken: { kleur: '#c9ccd0' } },
    ],
  },
  {
    code: 'zithoogte', label: 'Zithoogte', niveau: 'ontwerp', standaard: 'standaard',
    keuzes: [
      { code: 'laag', label: 'Laag (42 cm)', teken: { hoogte: 42 } },
      { code: 'standaard', label: 'Standaard (45 cm)', teken: { hoogte: 45 } },
      { code: 'hoog', label: 'Hoog (48 cm)', prijs: 60, teken: { hoogte: 48 }, uitleg: 'Makkelijker opstaan' },
    ],
  },
  {
    code: 'comfort', label: 'Zitcomfort', niveau: 'ontwerp', perElement: true, voorTypen: ZITTEN, standaard: 'veren',
    keuzes: [
      { code: 'schuim', label: 'Koudschuim (stevig)', pct: -4 },
      { code: 'veren', label: 'Pocketveren + schuim' },
      { code: 'traagschuim', label: 'Met traagschuim', pct: 6, kost: 18 },
      { code: 'dons', label: 'Dons-mix (zacht, losser)', pct: 12, kost: 40 },
    ],
  },
  {
    code: 'zitting', label: 'Zitting', niveau: 'ontwerp', voorTypen: ['zit', 'hoek', 'chaise', 'zit_zonder_rug', 'rond_einde', 'fauteuil'], standaard: 'losse_kussens',
    keuzes: [
      { code: 'losse_kussens', label: 'Losse zitkussens' },
      { code: 'vaste_zitting', label: 'Vaste zitting (strak gestoffeerd)', pct: -3 },
    ],
  },
  {
    code: 'rug', label: 'Rug', niveau: 'ontwerp', perElement: true, voorTypen: MET_RUG, standaard: 'vast',
    keuzes: [
      { code: 'vast', label: 'Vaste rug (strak)' },
      { code: 'los', label: 'Losse rugkussens', pct: 5, stofPct: 8, teken: { los: true } },
      { code: 'los_dons', label: 'Losse rugkussens met dons', pct: 10, stofPct: 8, kost: 30, teken: { los: true } },
      { code: 'capitonne', label: 'Capitonnage (knopen)', pct: 14, stofPct: 10, teken: { capitonne: true }, alleenMet: { naad: ['gewoon', 'stiksel'] }, reden: 'capitonnage combineren we niet met een bies' },
    ],
  },
  {
    // Nekrol: ronde rol bovenop het karkas achter de losse rugkussens (technische tekening van Nestor en Belize).
    code: 'nekrol', label: 'Nekrol', niveau: 'ontwerp', perElement: true, voorTypen: MET_RUG, standaard: 'geen',
    keuzes: [
      { code: 'geen', label: 'Zonder nekrol' },
      { code: 'met', label: 'Met nekrol', prijs: 45, stofPct: 4, kost: 15, teken: { nekrol: true }, uitleg: 'Ronde rol bovenop het karkas, achter de rugkussens', alleenMet: { rug: ['los', 'los_dons'] }, reden: 'een nekrol ligt achter losse rugkussens' },
    ],
  },
  {
    code: 'rughoogte', label: 'Rughoogte', niveau: 'ontwerp', perElement: true, voorTypen: [...MET_RUG, 'rugleuning'], standaard: 'standaard',
    keuzes: [
      { code: 'laag', label: 'Laag (70 cm)', pct: -3, stofPct: -5, teken: { hoogte: 70 } },
      { code: 'standaard', label: 'Standaard (80 cm)', teken: { hoogte: 80 } },
      { code: 'hoog', label: 'Hoog (92 cm)', pct: 6, stofPct: 8, teken: { hoogte: 92 } },
    ],
  },
  {
    code: 'naad', label: 'Naden', niveau: 'ontwerp', perElement: true, voorTypen: [...GESTOFFEERD, ...OPZET], standaard: 'gewoon',
    keuzes: [
      { code: 'gewoon', label: 'Gewone naad' },
      { code: 'plat', label: 'Platte naad (french seam)', pct: 3 },
      { code: 'bies', label: 'Bies in dezelfde stof', pct: 4, stofPct: 4, teken: { bies: true } },
      { code: 'contrastbies', label: 'Contrastbies (donker)', pct: 6, stofPct: 3, teken: { bies: true, contrast: true } },
      { code: 'stiksel', label: 'Dubbele sierstiksel', pct: 5, teken: { stiksel: true } },
    ],
  },
  {
    code: 'armstijl', label: 'Armstijl', niveau: 'element', voorTypen: ['arm'], standaard: 'strak',
    keuzes: [
      { code: 'strak', label: 'Strak (track arm)', teken: { vorm: 'strak' } },
      { code: 'rond', label: 'Rolarm', prijs: 30, teken: { vorm: 'rond' } },
      { code: 'engels', label: 'Lage Engelse rolarm', prijs: 40, teken: { vorm: 'engels' } },
      { code: 'schuin', label: 'Schuin aflopend', prijs: 20, teken: { vorm: 'schuin' } },
      { code: 'houtblad', label: 'Gestoffeerd met houten blad', prijs: 95, teken: { vorm: 'houtblad' }, kost: 35 },
      { code: 'hout', label: 'Massief houten arm', prijs: 180, teken: { vorm: 'hout' }, kost: 80 },
      { code: 'uitlopend', label: 'Uitlopend (naar buiten)', prijs: 45, teken: { vorm: 'uitlopend' }, uitleg: 'Klassieke arm die naar buiten uitloopt, zoals bij Wallace en Esmee' },
    ],
  },
  {
    // Chaise longue standaard mét rugleuning achteraan: de rug van de zetel loopt door achter de chaise (zoals op de
    // foto's van Kotor, Belize, Pula en Fréjus, en zoals Sofa op maat ze tekent). Zonder rugleuning = open uiteinde
    // (lounge, zoals Azar), of de rug langs de lange zijde (méridienne).
    code: 'chaise_rug', label: 'Rugleuning', niveau: 'element', voorTypen: ['chaise'], standaard: 'achter',
    keuzes: [
      { code: 'achter', label: 'Rugleuning achteraan', teken: { kant: 'achter' }, uitleg: 'De rug van de zetel loopt door achter de chaise' },
      { code: 'geen', label: 'Zonder rugleuning (open)', prijs: -210, stofPct: -15, kost: -60, teken: { kant: 'geen' }, uitleg: 'Open uiteinde of lounge-element' },
      { code: 'links', label: 'Rugleuning lange zijde links', prijs: 80, stofPct: 12, kost: 25, teken: { kant: 'links' }, uitleg: 'Méridienne: rug langs de lange kant' },
      { code: 'rechts', label: 'Rugleuning lange zijde rechts', prijs: 80, stofPct: 12, kost: 25, teken: { kant: 'rechts' }, uitleg: 'Méridienne: rug langs de lange kant' },
    ],
  },
  {
    code: 'armhoogte', label: 'Armhoogte', niveau: 'element', voorTypen: ['arm'], standaard: 'standaard',
    keuzes: [
      { code: 'laag', label: 'Laag (55 cm)', teken: { hoogte: 55 } },
      { code: 'standaard', label: 'Standaard (62 cm)', teken: { hoogte: 62 } },
      { code: 'hoog', label: 'Hoog (70 cm)', prijs: 15, teken: { hoogte: 70 } },
    ],
  },
  {
    code: 'arm_extra', label: 'Extra in de arm', niveau: 'element', voorTypen: ['arm'], standaard: 'geen',
    keuzes: [
      { code: 'geen', label: 'Geen' },
      { code: 'usb', label: 'USB-A/C-lader', prijs: 75, kost: 28 },
      { code: 'opberg', label: 'Opbergvak met klep', prijs: 60, kost: 20, alleenMet: { armstijl: ['strak', 'houtblad'] }, reden: 'past alleen in een strakke arm' },
    ],
  },
  {
    code: 'functie', label: 'Functie', niveau: 'element', voorTypen: ['zit'], standaard: 'geen',
    keuzes: [
      { code: 'geen', label: 'Geen', teken: { vorm: 'geen' } },
      { code: 'hoofdsteun', label: 'Verstelbare hoofdsteun', prijs: 140, kost: 45, teken: { vorm: 'hoofdsteun' } },
      { code: 'slaapfunctie', label: 'Slaapfunctie (zetelbed)', uitleg: 'Uitklapbaar bed met matras', prijs: 590, kost: 230, teken: { vorm: 'slaap' } },
      { code: 'relax', label: 'Elektrische relaxfunctie', prijs: 690, kost: 260, teken: { vorm: 'relax' }, alleenMet: { zitting: ['losse_kussens'] }, reden: 'relax vraagt losse zitkussens' },
      { code: 'relax_hoofdsteun', label: 'Relax + hoofdsteun', prijs: 790, kost: 300, teken: { vorm: 'relax_hoofdsteun' }, alleenMet: { zitting: ['losse_kussens'] }, reden: 'relax vraagt losse zitkussens' },
    ],
  },
  {
    code: 'ronde_kant', label: 'Ronde kant', niveau: 'element', voorTypen: ['rond_einde'], standaard: 'links',
    keuzes: [
      { code: 'links', label: 'Rond aan de linkerkant', teken: { kant: 'links' } },
      { code: 'rechts', label: 'Rond aan de rechterkant', teken: { kant: 'rechts' } },
    ],
  },
  {
    // Rug rond de ronde kant (Doha, Montego): de rug loopt in een boog door rond het uiteinde en wordt naar voren lager.
    code: 'rug_rond', label: 'Rug bij de ronde kant', niveau: 'element', voorTypen: ['rond_einde'], standaard: 'recht',
    keuzes: [
      { code: 'recht', label: 'Rug alleen op het rechte deel', teken: { rond: false } },
      { code: 'rond', label: 'Rug loopt rond het uiteinde', prijs: 90, stofPct: 10, kost: 30, teken: { rond: true } },
    ],
  },
  {
    code: 'kussenvulling', label: 'Vulling kussen', niveau: 'element', voorTypen: ['rugkussen', 'sierkussen', 'rolkussen'], standaard: 'vezel',
    keuzes: [
      { code: 'vezel', label: 'Holle vezel' },
      { code: 'veren_dons', label: 'Veren en dons', pct: 12, kost: 6 },
      { code: 'dons', label: 'Dons', pct: 20, kost: 10 },
    ],
  },
  {
    code: 'kuipvorm', label: 'Vorm fauteuil', niveau: 'element', voorTypen: ['fauteuil'], standaard: 'afgerond',
    keuzes: [
      // Vormen van de kuip (zie core/src/kuip.ts): grondvlak, wanddikte, hoe ver de wand rond loopt (graden),
      // hoogte vooraan boven de zitting, vanaf waar de armen vlak lopen. Benaderingen op basis van productfoto's.
      { code: 'rond', label: 'Rond (kuip)', uitleg: 'Ronde kuip: rug loopt geleidelijk over in de armen', teken: { vorm: 'rond', plan: 'rond', dikte: 15, boog: 138, voorBoven: 12, armVanaf: 1 } },
      { code: 'afgerond', label: 'Afgerond met armen', uitleg: 'Afgeronde rug die naar armhoogte zakt en vlak doorloopt', teken: { vorm: 'afgerond', plan: 'afgerond', dikte: 13, boog: 130, voorBoven: 17, armVanaf: 0.6 } },
      { code: 'omhullend', label: 'Omhullend', uitleg: 'Wand loopt ver rond, armen laag vooraan', teken: { vorm: 'omhullend', plan: 'rond', dikte: 17, boog: 140, voorBoven: 9, armVanaf: 1 } },
      // Koepel (Tumble, 10/11): een ronde zitting als een trommel, met een dikke rug die alleen de achterste helft omsluit
      // en aan beide kanten rond naar de zitting zakt.
      { code: 'koepel', label: 'Koepelrug op ronde zitting', uitleg: 'Ronde zitting, dikke rug rond de achterste helft die naar de zitting zakt', teken: { vorm: 'koepel', plan: 'rond', dikte: 20, boog: 100, voorBoven: 1, armVanaf: 1, plat: 0.55 } },
      // Trommel (Quin, Satie): op de foto's een dunne wand rond de achterste helft, vooraan is de ronde zitting vrij
      // (tot 10/11 een dikke wand die bijna helemaal rond liep).
      { code: 'trommel', label: 'Trommel', uitleg: 'Ronde zitting met een dunne wand rond de achterste helft, even hoog, met losse rugkussens', teken: { vorm: 'trommel', plan: 'rond', dikte: 8, boog: 100, voorBoven: 22, armVanaf: 1, vlak: true } },
      { code: 'organisch', label: 'Organisch', uitleg: 'Zachte kiezel als zitting; de schaal is aan één kant hoog en loopt aan de andere kant schuin in de zitting weg', teken: { vorm: 'organisch', plan: 'afgerond', exponent: 2.6, dikte: 24, boog: 150, voorBoven: 1, armVanaf: 1, organisch: true, scheef: true } },
      { code: 'schelp', label: 'Schelp op frame', uitleg: 'Dunne, gebogen rugschaal boven de zitting, op het frame', teken: { vorm: 'schelp', plan: 'afgerond', dikte: 9, boog: 66, voorBoven: 20, armVanaf: 1, zwevend: true } },
      { code: 'hoekig', label: 'Hoekig', uitleg: 'Rechte rug en armen', teken: { vorm: 'hoekig' } },
    ],
  },
  {
    code: 'poefvorm', label: 'Vorm poef', niveau: 'element', voorTypen: ['poef'], standaard: 'kiezel',
    keuzes: [
      { code: 'rond', label: 'Rond', teken: { vorm: 'rond' } },
      { code: 'vierkant', label: 'Vierkant', teken: { vorm: 'vierkant' } },
      { code: 'kiezel', label: 'Kiezel (zacht afgerond)', teken: { vorm: 'kiezel' } },
    ],
  },
  {
    code: 'poef_uitvoering', label: 'Uitvoering poef', niveau: 'element', voorTypen: ['poef'], standaard: 'standaard',
    keuzes: [
      { code: 'standaard', label: 'Standaard' },
      { code: 'opberg', label: 'Opbergpoef met deksel', prijs: 90, kost: 30 },
      { code: 'wieltjes', label: 'Op verdekte wieltjes', prijs: 45, kost: 15 },
    ],
  },
  {
    code: 'console_uitvoering', label: 'Uitvoering tussenstuk', niveau: 'element', voorTypen: ['console'], standaard: 'open',
    keuzes: [
      { code: 'open', label: 'Met open vak', teken: { vorm: 'open' } },
      { code: 'bank', label: 'Lage houten bank (zitbank/legplank)', prijs: -60, teken: { vorm: 'bank' } },
      { code: 'blad', label: 'Alleen blad (tafeltje)', prijs: -30, teken: { vorm: 'blad' } },
      { code: 'lade', label: 'Met lade', prijs: 120, kost: 40, teken: { vorm: 'lade' } },
      { code: 'klep', label: 'Opbergvak met klep', prijs: 90, kost: 30, teken: { vorm: 'klep' } },
      { code: 'lader', label: 'Met draadloze lader + USB', prijs: 160, kost: 55, teken: { vorm: 'lader' } },
    ],
  },
];

export const zetelCatalogus: OntwerpCatalogus = {
  naam: 'Zetelelementen (demo)',
  groepen: ['A', 'B', 'C', 'EIGEN'],
  diepteToeslagPctPer10cm: 4,
  uurloon: 48,
  btwProcent: 21,
  leveringWaarschuwingVanaf: 340,
  opties: zetelOpties,
  vormgevingPrijzen: { extraKussen: 45, hellendeRugPct: 5, rondeRugPct: 7, dikkereRugPerCmPerM: 6, houtframeZijkant: 120, houtframeRondomPerM: 90 },
  typen: [
    {
      code: 'zit', label: 'Zitelement', tekenstijl: 'zit',
      breedte: { min: 60, max: 240, standaard: 90 }, diepte: { min: 80, max: 120, standaard: 95 },
      prijs: g(620, 690, 790, 560), per10cm: g(28, 32, 38, 24),
      stofVast: 0.6, stofPerM: 2.6, kostVast: 120, kostPerM: 160, uren: 3, urenPerM: 2,
    },
    {
      code: 'hoek', label: 'Hoekelement', tekenstijl: 'hoek',
      breedte: { min: 80, max: 130, standaard: 95 }, diepte: { min: 80, max: 130, standaard: 95 },
      prijs: g(890, 990, 1130, 800), per10cm: g(34, 38, 45, 30),
      stofVast: 1.2, stofPerM: 3.2, kostVast: 180, kostPerM: 200, uren: 5, urenPerM: 2,
    },
    {
      // Prijs, stof en kost met de rugleuning achteraan (standaard); "zonder rugleuning" geeft een minprijs.
      code: 'chaise', label: 'Chaise longue', tekenstijl: 'chaise',
      breedte: { min: 70, max: 110, standaard: 85 }, diepte: { min: 140, max: 200, standaard: 165 },
      prijs: g(970, 1060, 1180, 900), per10cm: g(30, 34, 40, 26),
      stofVast: 1.65, stofPerM: 2.83, kostVast: 210, kostPerM: 170, uren: 4, urenPerM: 2,
    },
    {
      code: 'zit_zonder_rug', label: 'Zitbank zonder rug', tekenstijl: 'zit_zonder_rug',
      breedte: { min: 60, max: 200, standaard: 120 }, diepte: { min: 50, max: 110, standaard: 80 },
      prijs: g(480, 540, 620, 430), per10cm: g(22, 25, 30, 19),
      stofVast: 0.5, stofPerM: 1.8, kostVast: 90, kostPerM: 120, uren: 2.5, urenPerM: 1.5,
    },
    {
      code: 'arm', label: 'Armleuning', tekenstijl: 'arm',
      breedte: { min: 12, max: 40, standaard: 20 }, diepte: { min: 60, max: 200, standaard: 95 },
      prijs: g(190, 220, 260, 170), per10cm: g(20, 24, 28, 16),
      stofVast: 0.7, stofPerM: 1.5, kostVast: 45, kostPerM: 60, uren: 1.5, urenPerM: 1,
    },
    {
      code: 'rond_einde', label: 'Afgerond eindelement', tekenstijl: 'rond',
      breedte: { min: 80, max: 200, standaard: 130 }, diepte: { min: 80, max: 160, standaard: 100 },
      prijs: g(890, 990, 1140, 800), per10cm: g(30, 34, 40, 26),
      stofVast: 1.4, stofPerM: 3.0, kostVast: 200, kostPerM: 190, uren: 5, urenPerM: 2.5,
    },
    {
      code: 'fauteuil', label: 'Fauteuil', tekenstijl: 'kuip',
      breedte: { min: 60, max: 110, standaard: 80 }, diepte: { min: 60, max: 100, standaard: 80 },
      prijs: g(690, 760, 870, 620), per10cm: g(30, 34, 40, 26),
      stofVast: 1.6, stofPerM: 2.6, kostVast: 140, kostPerM: 150, uren: 5, urenPerM: 2,
    },
    {
      code: 'rugleuning', label: 'Losse rugleuning', tekenstijl: 'rugleuning', opzet: true,
      breedte: { min: 30, max: 240, standaard: 90 }, diepte: { min: 10, max: 35, standaard: 18 },
      prijs: g(240, 270, 310, 210), per10cm: g(14, 16, 19, 12),
      stofVast: 0.4, stofPerM: 1.4, kostVast: 40, kostPerM: 50, uren: 1, urenPerM: 0.8,
    },
    {
      code: 'rugkussen', label: 'Rugkussen', tekenstijl: 'kussen', opzet: true, hoogte: 48,
      breedte: { min: 40, max: 120, standaard: 70 }, diepte: { min: 12, max: 25, standaard: 18 },
      prijs: g(95, 110, 130, 80), per10cm: g(6, 7, 9, 5),
      stofVast: 0.6, stofPerM: 0.9, kostVast: 18, kostPerM: 15, uren: 0.5, urenPerM: 0.3,
    },
    {
      code: 'sierkussen', label: 'Sierkussen', tekenstijl: 'kussen', opzet: true,
      breedte: { min: 30, max: 65, standaard: 45 }, diepte: { min: 10, max: 18, standaard: 14 },
      prijs: g(55, 65, 85, 40), per10cm: g(5, 6, 7, 4),
      stofVast: 0.35, stofPerM: 0.4, kostVast: 8, kostPerM: 6, uren: 0.3, urenPerM: 0.1,
    },
    {
      code: 'rolkussen', label: 'Rolkussen (nekrol)', tekenstijl: 'rolkussen', opzet: true,
      breedte: { min: 40, max: 110, standaard: 60 }, diepte: { min: 15, max: 25, standaard: 20 },
      prijs: g(60, 70, 90, 45), per10cm: g(5, 6, 7, 4),
      stofVast: 0.3, stofPerM: 0.5, kostVast: 10, kostPerM: 6, uren: 0.4, urenPerM: 0.2,
    },
    {
      code: 'console', label: 'Houten tussenstuk', tekenstijl: 'console',
      breedte: { min: 25, max: 80, standaard: 40 }, diepte: { min: 60, max: 120, standaard: 95 },
      prijs: g(260, 260, 260, 260), per10cm: g(30, 30, 30, 30),
      stofVast: 0, stofPerM: 0, kostVast: 90, kostPerM: 120, uren: 2, urenPerM: 1,
    },
    {
      code: 'poef', label: 'Poef', tekenstijl: 'poef',
      breedte: { min: 40, max: 140, standaard: 70 }, diepte: { min: 40, max: 140, standaard: 70 },
      prijs: g(290, 330, 390, 250), per10cm: g(18, 21, 25, 15),
      stofVast: 0.5, stofPerM: 1.6, kostVast: 50, kostPerM: 70, uren: 1.5, urenPerM: 1,
    },
  ],
};

/** Startopstellingen voor de ontwerper. */
export const startOntwerpen: Record<string, { label: string; ontwerp: Ontwerp }> = {
  recht: {
    label: 'Rechte sofa',
    ontwerp: {
      hoofdmateriaal: 'linnen_ficelle',
      elementen: [
        { id: 'e1', type: 'arm', x: 0, y: 0, breedte: 20, diepte: 95, rotatie: 0 },
        { id: 'e2', type: 'zit', x: 20, y: 0, breedte: 95, diepte: 95, rotatie: 0 },
        { id: 'e3', type: 'zit', x: 115, y: 0, breedte: 95, diepte: 95, rotatie: 0 },
        { id: 'e4', type: 'arm', x: 210, y: 0, breedte: 20, diepte: 95, rotatie: 0 },
      ],
    },
  },
  hoek: {
    label: 'Hoeksofa',
    ontwerp: {
      hoofdmateriaal: 'linnen_brume',
      elementen: [
        { id: 'e1', type: 'hoek', x: 0, y: 0, breedte: 100, diepte: 100, rotatie: 0 },
        { id: 'e2', type: 'zit', x: 100, y: 0, breedte: 90, diepte: 100, rotatie: 0 },
        { id: 'e3', type: 'zit', x: 190, y: 0, breedte: 90, diepte: 100, rotatie: 0 },
        { id: 'e4', type: 'arm', x: 280, y: 0, breedte: 22, diepte: 100, rotatie: 0 },
        { id: 'e5', type: 'zit', x: 0, y: 100, breedte: 90, diepte: 100, rotatie: 270 },
        { id: 'e6', type: 'arm', x: 0, y: 190, breedte: 22, diepte: 100, rotatie: 270 },
      ],
    },
  },
  lounge: {
    label: 'Sofa met chaise longue en poef',
    ontwerp: {
      hoofdmateriaal: 'boucle_belize',
      elementen: [
        { id: 'e1', type: 'arm', x: 0, y: 0, breedte: 20, diepte: 95, rotatie: 0 },
        { id: 'e2', type: 'zit', x: 20, y: 0, breedte: 100, diepte: 95, rotatie: 0 },
        { id: 'e3', type: 'zit', x: 120, y: 0, breedte: 100, diepte: 95, rotatie: 0 },
        { id: 'e4', type: 'chaise', x: 220, y: 0, breedte: 90, diepte: 170, rotatie: 0, materiaal: 'linnen_brume', opties: { chaise_rug: 'achter' } },
        { id: 'e5', type: 'poef', x: 70, y: 115, breedte: 80, diepte: 60, rotatie: 0 },
      ],
    },
  },
  console: {
    label: 'Sofa met houten tussenstuk',
    ontwerp: {
      hoofdmateriaal: 'linnen_travertin',
      opties: { poten: 'plint', poothoogte: 'laag', hout: 'eik_gerookt', rug: 'los', naad: 'bies' },
      elementen: [
        { id: 'e1', type: 'arm', x: 0, y: 0, breedte: 22, diepte: 95, rotatie: 0, opties: { armstijl: 'houtblad' } },
        { id: 'e2', type: 'zit', x: 22, y: 0, breedte: 95, diepte: 95, rotatie: 0 },
        { id: 'e3', type: 'console', x: 117, y: 0, breedte: 40, diepte: 95, rotatie: 0, opties: { console_uitvoering: 'lade' } },
        { id: 'e4', type: 'zit', x: 157, y: 0, breedte: 95, diepte: 95, rotatie: 0 },
        { id: 'e5', type: 'arm', x: 252, y: 0, breedte: 22, diepte: 95, rotatie: 0, opties: { armstijl: 'houtblad' } },
      ],
    },
  },
  leeg: { label: 'Leeg tekenvlak', ontwerp: { hoofdmateriaal: 'linnen_ficelle', elementen: [] } },
};
