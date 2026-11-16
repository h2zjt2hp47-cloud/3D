/**
 * De voorbeeldwoning uitgerust door een installateur (ronde 10, 16/11/2026): tellerkast en verdeelbord in de berging,
 * stopcontacten, schakelaars en lichtpunten per ruimte met hun kringen, een airco in de leefruimte met de buitenunit
 * tegen de achtergevel en de koelleiding ertussen, een warmtepomp (buiten en binnen) met boiler, vloerverwarming met een
 * verdeler en lussen per ruimte, een radiator op de verdieping, ventilatie D met kanalen, gevelrooster en dakdoorvoer, en
 * water, regenwater en de afvoeren van keuken, wc en badkamers.
 *
 * Gemaakt met de hulpfuncties die het scherm later gebruikt (`tegenWand`, `leidingLangsWanden`, `technischeOpstelling`,
 * `vloerverwarmingLus`), zodat het voorbeeld ook die bewijst. **Volledig verzonnen** en **door geen installateur
 * nagelezen**: een voorbeeld om te tonen, geen ontwerp van een installatie. Wat niet in de berging paste (de
 * ventilatie-unit staat daarom tegen het plafond, de regenwaterpomp in de inkom), staat hieronder bij `opstelling`.
 */
import {
  liggingHoogte, nieuwToestel, standaardDak, type Leiding, type LeidingHoogte, type LeidingMaat, type PlanCatalogus, type Plattegrond, type Punt, type Toestel,
} from '../src/index.js';
import { aansluitHoogte } from '../src/techniek.js';
import { leidingLangsWanden, technischeOpstelling, tegenWand, vloerverwarmingLus, type TechnischeOpstelling } from '../src/techniekplaatsen.js';
import { planCatalogus } from './inrichting.js';
import { techniekCatalogus } from './techniek.js';
import { voorbeeldWoning, type DemoPositie } from './woning.js';

/** De plancatalogus met de techniek erbij (het scherm zet `techniek` er later zelf bij). */
export const techniekPlanCatalogus: PlanCatalogus = { ...planCatalogus, techniek: techniekCatalogus };

/** De volgorde waarin de technische ruimte in de berging gevuld wordt (zo past alles; een andere volgorde laat iets over). */
export const BERGING_OPSTELLING = ['boiler', 'warmtepomp_binnen', 'verdeler_vloerverwarming', 'tellerkast', 'verdeelbord', 'collector'];

interface TrekOpties {
  hoogte?: LeidingHoogte;
  maat?: LeidingMaat;
  /** Afstand van de muren (cm), om leidingen die hetzelfde pad volgen naast elkaar te leggen. */
  afstand?: number;
  niveau?: number;
  kring?: string;
  /** Tussenpunten (toestellen of punten) waar de leiding langs moet, bv. de stopcontacten van een kring. */
  via?: (Toestel | Punt)[];
}

export function uitgerusteWoning(): { plan: Plattegrond; posities: DemoPositie[]; opstelling: TechnischeOpstelling } {
  const { plan, posities } = voorbeeldWoning();
  // Een plat dak (EPDM) op de verdieping, zodat de dakdoorvoer van de ventilatie op een dak staat.
  plan.dak = standaardDak();
  const cat = techniekCatalogus, H = plan.muurhoogte;
  const toestellen: Toestel[] = [];
  const leidingen: Leiding[] = [];
  plan.toestellen = toestellen;
  plan.leidingen = leidingen;

  let nr = 0;
  /** Een toestel op (ongeveer) een plaats; aan een wand of buiten tegen de dichtste wand gezet. */
  const zet = (type: string, punt: Punt, extra: Partial<Toestel> = {}): Toestel => {
    const t = nieuwToestel(cat, type, `t${++nr}`, punt[0], punt[1], H, extra);
    const plaats = t.aan === 'wand' || t.aan === 'buiten' ? tegenWand(plan, t, cat.toestellen[type]!) : undefined;
    const uit = plaats?.toestel ?? t;
    toestellen.push(uit);
    return uit;
  };
  let ln = 0;
  const xy = (x: Toestel | Punt): Punt => (Array.isArray(x) ? x : [x.x, x.y]);
  /**
   * Een leiding van toestel (of punt) naar toestel, langs de wanden, eventueel via tussenpunten. Bij elk tussentoestel
   * gaat ze op of neer tot dat toestel en terug (bv. een kabel van de vloer naar een stopcontact).
   */
  const trek = (soort: string, van: Toestel | Punt, naar: Toestel | Punt, o: TrekOpties = {}): Leiding => {
    const niveau = o.niveau ?? (Array.isArray(van) ? 0 : van.niveau ?? 0);
    const hoogte = o.hoogte ?? cat.leidingen[soort]!.hoogte;
    const stops = [van, ...(o.via ?? []), naar];
    const punten: Punt[] = [];
    const hoogtes: number[] = [];
    const run = liggingHoogte(hoogte, H);
    for (let i = 1; i < stops.length; i++) {
      const stuk = leidingLangsWanden(plan, xy(stops[i - 1]!), xy(stops[i]!), { niveau, afstand: o.afstand });
      for (const q of i > 1 ? stuk.slice(1) : stuk) { punten.push(q); hoogtes.push(run); }
      const tussen = stops[i]!;
      if (i < stops.length - 1 && !Array.isArray(tussen)) {
        // Op en neer naar het tussentoestel.
        const op = aansluitHoogte(tussen, cat.toestellen[tussen.type], H);
        const q = punten[punten.length - 1]!;
        punten.push(q, q);
        hoogtes.push(op, run);
      }
    }
    const metTussen = o.via?.some((x) => !Array.isArray(x));
    const l: Leiding = {
      id: `l${++ln}`, soort, punten, hoogte, niveau,
      ...(metTussen ? { hoogtes } : {}),
      ...(o.maat !== undefined ? { maat: o.maat } : {}),
      ...(!Array.isArray(van) ? { van: van.id } : {}),
      ...(!Array.isArray(naar) ? { naar: naar.id } : {}),
      ...(o.kring ? { kring: o.kring } : {}),
    };
    leidingen.push(l);
    return l;
  };

  // ---------- de technische ruimte in de berging ----------
  const opstelling = technischeOpstelling(plan, 'berging', cat, BERGING_OPSTELLING, { id: (i, type) => `berging_${type}` });
  toestellen.push(...opstelling.toestellen);
  const vind = (type: string) => toestellen.find((t) => t.type === type)!;
  const boiler = vind('boiler'), wpBinnen = vind('warmtepomp_binnen'), verdeler = vind('verdeler_vloerverwarming');
  const verdeelbord = vind('verdeelbord'), collector = vind('collector');
  // Wat niet meer langs de wanden paste: de ventilatie-unit tegen het plafond van de berging, de regenwaterpomp in de inkom.
  const unit = zet('ventilatie_d', [345, 280], { aan: 'plafond', draai: 0 });
  const pomp = zet('regenwaterpomp', [215, 357], { draai: 180 });

  // ---------- elektriciteit ----------
  const sc = (punt: Punt, niveau = 0, type = 'stopcontact_dubbel') => zet(type, punt, { niveau });
  const sch = (punt: Punt, niveau = 0) => zet('schakelaar', punt, { niveau });
  const licht = (punt: Punt, niveau = 0, type = 'lichtpunt') => zet(type, punt, { niveau });
  // Gelijkvloers: per ruimte een schakelaar bij de deur en een lichtpunt.
  const lichtGv = [
    sch([250, 30]), licht([180, 190]), // inkom
    sch([270, 140]), licht([320, 60]), // wc
    sch([270, 240]), licht([330, 300]), // berging
    sch([730, 370]), licht([680, 190]), licht([790, 100], 0, 'inbouwspot'), licht([790, 290], 0, 'inbouwspot'), // keuken
    sch([190, 390]), sch([810, 700]), licht([180, 700]), zet('pendel', [570, 607]), // leefruimte
    sch([830, 580]), licht([890, 220]), licht([890, 680]), // nachthal
    sch([970, 270]), licht([1180, 210]), // slaapkamer 1
    sch([970, 590]), licht([1180, 520]), // badkamer
    sch([970, 770]), licht([1180, 760]), // slaapkamer 2
  ];
  trek('kabel', verdeelbord, lichtGv[lichtGv.length - 1]!, { via: lichtGv.slice(0, -1), hoogte: 'plafond', kring: 'kring 1, verlichting gelijkvloers', afstand: 10 });
  const scLeef = [sc([300, 395]), sc([15, 740]), zet('datapunt', [15, 790]), sc([15, 860]), sc([160, 885]), sc([805, 820])];
  trek('kabel', verdeelbord, scLeef[scLeef.length - 1]!, { via: scLeef.slice(0, -1), kring: 'kring 2, leefruimte' });
  const scKeuken = [sc([460, 15]), sc([815, 60], 0, 'stopcontact_werkblad'), sc([815, 180], 0, 'stopcontact_werkblad'), sc([815, 340], 0, 'stopcontact_werkblad')];
  trek('kabel', verdeelbord, scKeuken[scKeuken.length - 1]!, { via: scKeuken.slice(0, -1), kring: 'kring 3, keuken', afstand: 12 });
  const scNacht = [sc([250, 190]), sc([825, 400]), sc([1075, 415]), sc([1290, 415]), sc([1320, 15]), sc([1240, 615], 0, 'stopcontact_werkblad'), sc([1110, 625]), zet('datapunt', [1150, 625]), sc([1300, 885])];
  trek('kabel', verdeelbord, scNacht[scNacht.length - 1]!, { via: scNacht.slice(0, -1), kring: 'kring 4, nachthal, slaapkamers en badkamer', afstand: 18 });
  // Verdieping 1.
  const lichtV1 = [
    sch([255, 250], 1), licht([130, 190], 1), // overloop
    sch([265, 250], 1), licht([420, 270], 1), // slaapkamer 3
    sch([585, 250], 1), licht([680, 190], 1), // badkamer 2
  ];
  trek('kabel', verdeelbord, lichtV1[lichtV1.length - 1]!, { via: lichtV1.slice(0, -1), niveau: 1, hoogte: 'plafond', kring: 'kring 5, verlichting verdieping', afstand: 10 });
  const scV1 = [sc([220, 375], 1), sc([300, 15], 1), sc([520, 15], 1), sc([740, 375], 1, 'stopcontact_werkblad')];
  trek('kabel', verdeelbord, scV1[scV1.length - 1]!, { via: scV1.slice(0, -1), niveau: 1, kring: 'kring 6, stopcontacten verdieping' });
  // Buiten: laadpaal op de voorgevel.
  const laadpaal = zet('laadpaal', [60, -40]);
  trek('kabel', verdeelbord, laadpaal, { maat: 25, kring: 'kring 7, laadpaal', afstand: 24 });

  // ---------- koeling en verwarming ----------
  // Airco in de leefruimte, buitenunit tegen de achtergevel, koelleiding recht door de muur en buiten naar beneden.
  const ac = zet('airco_wand', [70, 870]);
  const acBuiten = zet('airco_buiten', [70, 960]);
  trek('koelleiding', ac, acBuiten, { hoogte: 225 });
  const condens: Leiding = { id: `l${++ln}`, soort: 'condensafvoer', punten: [[ac.x - 30, ac.y], [ac.x - 30, 930], [ac.x - 30, 930]], hoogte: 212, hoogtes: [212, 212, 12], van: ac.id };
  leidingen.push(condens);
  const thermostaat = zet('thermostaat', [805, 560]);
  trek('kabel', verdeelbord, thermostaat, { maat: 16, kring: 'thermostaat', afstand: 30, hoogte: 'wand' });
  // Warmtepomp: buitenunit tegen de achtergevel bij de nachthal, aanvoer en retour naar de binnenunit in de berging.
  const wpBuiten = zet('warmtepomp_buiten', [890, 990]);
  trek('aanvoer_verwarming', wpBuiten, wpBinnen, { maat: 26, afstand: 6 });
  trek('retour_verwarming', wpBuiten, wpBinnen, { maat: 26, afstand: 14 });
  trek('aanvoer_verwarming', wpBinnen, verdeler, { afstand: 6 });
  trek('retour_verwarming', wpBinnen, verdeler, { afstand: 14 });
  // Vloerverwarming op het gelijkvloers: per ruimte een lus van de verdeler en terug (de leefruimte in drie lussen).
  const lus = (ruimte: string, strook?: [number, number], afstand = 8) => {
    const meander = vloerverwarmingLus(plan, ruimte, strook ? { strook } : {});
    if (meander.length < 2) return;
    const heen = leidingLangsWanden(plan, [verdeler.x, verdeler.y], meander[0]!, { afstand });
    const terug = leidingLangsWanden(plan, meander[meander.length - 1]!, [verdeler.x, verdeler.y], { afstand: afstand + 6 });
    leidingen.push({ id: `l${++ln}`, soort: 'vloerverwarming', punten: [...heen, ...meander.slice(1), ...terug.slice(1)], hoogte: 'vloer', van: verdeler.id, naar: verdeler.id, kring: `lus ${plan.ruimtes.find((r) => r.id === ruimte)!.naam.toLowerCase()}${strook ? ` ${Math.round(strook[0] * 3) + 1}` : ''}` });
  };
  lus('leef', [0, 1 / 3], 8); lus('leef', [1 / 3, 2 / 3], 20); lus('leef', [2 / 3, 1], 32);
  lus('keuken', undefined, 8); lus('hal', undefined, 8); lus('nachthal', undefined, 20);
  lus('slk1', [0, 0.5], 8); lus('slk1', [0.5, 1], 20); lus('bad', undefined, 26); lus('slk2', undefined, 32);
  // Een radiator op de verdieping (slaapkamer 3), aanvoer en retour van de binnenunit, door de vloer naar boven.
  const radiator = zet('radiator', [565, 110], { niveau: 1 });
  trek('aanvoer_verwarming', wpBinnen, radiator, { niveau: 1, maat: 16, afstand: 6 });
  trek('retour_verwarming', wpBinnen, radiator, { niveau: 1, maat: 16, afstand: 14 });

  // ---------- ventilatie D ----------
  const rooster = zet('gevelrooster', [395, -30]);
  const doorvoer = zet('dakdoorvoer', [345, 300], { niveau: 1, aan: 'dak' });
  trek('ventilatie_rond', unit, rooster, { maat: 160, afstand: 10 });
  leidingen.push({ id: `l${++ln}`, soort: 'ventilatie_rond', maat: 160, punten: [[unit.x, unit.y], [doorvoer.x, doorvoer.y]], hoogte: 'plafond', van: unit.id, naar: doorvoer.id });
  const toevoer = [zet('toevoermond', [200, 520], { aan: 'plafond' }), zet('toevoermond', [600, 800], { aan: 'plafond' }), zet('toevoermond', [1100, 120], { aan: 'plafond' }), zet('toevoermond', [1100, 820], { aan: 'plafond' })];
  const afvoer = [zet('afvoermond', [300, 120], { aan: 'plafond' }), zet('afvoermond', [520, 40], { aan: 'plafond' }), zet('afvoermond', [1280, 540], { aan: 'plafond' })];
  [...toevoer, ...afvoer].forEach((m, i) => trek('ventilatie_rond', unit, m, { maat: 75, afstand: 20 + (i % 3) * 10 }));
  const toevoer1 = zet('toevoermond', [420, 170], { aan: 'plafond', niveau: 1 }), afvoer1 = zet('afvoermond', [650, 110], { aan: 'plafond', niveau: 1 });
  trek('ventilatie_rond', unit, toevoer1, { maat: 75, niveau: 1, afstand: 20 });
  trek('ventilatie_rond', unit, afvoer1, { maat: 75, niveau: 1, afstand: 30 });

  // ---------- sanitair: water, regenwater en afvoeren ----------
  trek('koud_water', [395, -60], collector, { maat: 26, afstand: 6 });
  trek('warm_water', boiler, collector, { maat: 20, afstand: 6 });
  const spoelbak: Punt = [787, 263], lavabo: Punt = [1160, 590], douche: Punt = [1325, 470], lavabo2: Punt = [660, 350];
  for (const [doel, niveau] of [[spoelbak, 0], [lavabo, 0], [douche, 0], [lavabo2, 1]] as const) {
    trek('warm_water', collector, doel, { niveau, afstand: 6 });
    trek('koud_water', collector, doel, { niveau, afstand: 12 });
  }
  // Regenwater uit de put in de tuin naar de pomp, en van de pomp naar de wc's en de buitenkraan.
  const kraan = zet('buitenkraan', [770, 940]);
  trek('regenwater', [-150, 700], pomp, { afstand: 6 });
  trek('regenwater', pomp, [387, 130], { afstand: 18 });
  trek('regenwater', pomp, [1320, 590], { afstand: 26 });
  trek('regenwater', pomp, kraan, { afstand: 34 });
  // Afvoeren: keuken en wc naar de voorgevel, badkamer naar de zijgevel (de lavabo, de douche en het bad sluiten aan op die
  // van de wc), badkamer 2 met een standleiding naar het gelijkvloers en dan naar buiten.
  trek('afvoer', spoelbak, [800, -60], { maat: 50, afstand: 10 });
  trek('afvoer', [387, 130], [387, -60], { maat: 110, afstand: 10 });
  const wcBad = trek('afvoer', [1320, 590], [1460, 590], { maat: 110, afstand: 10 });
  const aansluiting = wcBad.punten[Math.min(1, wcBad.punten.length - 1)]!;
  trek('afvoer', lavabo, aansluiting, { maat: 40, afstand: 10 });
  trek('afvoer', douche, aansluiting, { maat: 50, afstand: 10 });
  trek('afvoer', [1115, 462], aansluiting, { maat: 50, afstand: 10 });
  const wc2: Punt = [787, 220], stand: Punt = [805, 20];
  const boven = leidingLangsWanden(plan, wc2, stand, { niveau: 1, afstand: 10 });
  leidingen.push({
    id: `l${++ln}`, soort: 'afvoer', maat: 110, niveau: 1, hoogte: 'vloer',
    punten: [...boven, stand, [stand[0], -60]], hoogtes: [...boven.map(() => -5), -305, -305],
  });
  trek('afvoer', lavabo2, boven[Math.min(1, boven.length - 1)]!, { maat: 40, niveau: 1, afstand: 10 });
  trek('afvoer', [770, 60], boven[Math.min(1, boven.length - 1)]!, { maat: 50, niveau: 1, afstand: 10 });

  return { plan, posities, opstelling };
}
