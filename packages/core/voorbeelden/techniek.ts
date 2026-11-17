/**
 * Catalogus techniek (ronde 10, 16/11/2026): de toestellen en leidingsoorten van een installateur, als gegevens, zoals
 * de plancatalogus in inrichting.ts. Een nieuw toestel of een nieuwe leidingsoort is een rij; alleen een nieuwe vorm in
 * 3D vraagt programmeerwerk (`toestelVorm` in core/src/techniek.ts).
 *
 * **Alle maten, hoogtes en vrije ruimtes zijn richtwaarden**, door geen installateur nagelezen (`nagelezen: false`). Wat
 * uit het online onderzoek komt, verwijst naar docs/onderzoek-bouw-constructies.md (hoofdstukken 5 en 6, met de codes van
 * de bronnen); dat onderzoek opende zelf geen enkele pagina, elk getal moet nog op de bron nagekeken worden. De rest is
 * algemene kennis. Geen merknamen, geen productnamen, geen prijzen. Zonwering staat er niet in: die zit bij de ramen.
 *
 * Kleuren van de leidingen: warm water rood, koud water blauw, regenwater groen en gas geel komen uit het keurings-
 * document van de waterbedrijven ([I22] in 6.6); aanvoer en retour van de verwarming donkerrood en donkerblauw (een
 * forum zegt rood en blauw: donkerder, om ze van het water te onderscheiden); de andere zijn een eigen keuze.
 */
import type { LeidingSoortType, OpbouwHerkomst, TechniekCatalogus, ToestelType } from '../src/index.js';

const DOC = 'docs/onderzoek-bouw-constructies.md';
const onderzoek = (verwijzing: string): OpbouwHerkomst => ({ bron: 'onderzoek', verwijzing: `${DOC} ${verwijzing}`, nagelezen: false });
const kennis = (verwijzing?: string): OpbouwHerkomst => ({ bron: 'algemene kennis', ...(verwijzing ? { verwijzing } : {}), nagelezen: false });

const WIT = '#f3f2ee', LICHTGRIJS = '#e3e2dc', GRIJS = '#c7c9c6';

const toestellen: Record<string, ToestelType> = {
  // ---------- elektriciteit ----------
  tellerkast: {
    label: 'Tellerkast (netbeheerder)', vak: 'elektriciteit', b: 25, d: 23, h: 60, hoogte: 120, bevestiging: 'wand',
    teken: 'kader', afkorting: 'kWh', vorm: 'kast', kleur: LICHTGRIJS, vrij: { voor: 80 }, technisch: true,
    herkomst: onderzoek('6.1 [I1][I2]: kast 25 × 60 × ± 23 cm, onderkant minstens 120 cm, 80 tot 100 cm vrij ervoor'),
    klant: { naam: 'Elektriciteitsmeter', uitleg: 'De kast van de netbeheerder met de meter: hier komt de elektriciteit de woning binnen.' },
    uitleg: 'In een droog lokaal op het gelijkvloers, dicht bij de straat; nooit onder een waterleiding of afvoer.',
  },
  verdeelbord: {
    label: 'Verdeelbord (opbouw, 36 modules)', vak: 'elektriciteit', b: 36, d: 15, h: 45, hoogte: 110, bevestiging: 'wand',
    teken: 'verdeelbord', vorm: 'kast', kleur: WIT, vrij: { voor: 60 }, technisch: true,
    herkomst: onderzoek('6.1 [I3]: opbouw 27 tot 45 × 35,5 × 15 cm; hoogte en vrije ruimte: algemene kennis'),
    klant: { naam: 'Zekeringkast', uitleg: 'Hier vertrekken de kringen naar de stopcontacten en het licht, elk met een eigen zekering.' },
  },
  stopcontact: {
    label: 'Stopcontact', vak: 'elektriciteit', b: 8, d: 4, h: 8, hoogte: 30, bevestiging: 'wand',
    teken: 'stopcontact', vorm: 'stopcontact', kleur: WIT,
    herkomst: onderzoek('5.3 [E4][E5]: 15 cm aangeraden, veel installateurs nemen 30 cm; de maat van de plaat: algemene kennis'),
    klant: { naam: 'Stopcontact', uitleg: 'Een stopcontact in de muur.' },
  },
  stopcontact_dubbel: {
    label: 'Stopcontact, dubbel', vak: 'elektriciteit', b: 15, d: 4, h: 8, hoogte: 30, bevestiging: 'wand',
    teken: 'stopcontact', vorm: 'stopcontact', kleur: WIT, stuks: 2,
    herkomst: onderzoek('5.3 [E4][E5]: 15 cm aangeraden, veel installateurs nemen 30 cm'),
    klant: { naam: 'Dubbel stopcontact', uitleg: 'Twee stopcontacten naast elkaar in de muur.' },
  },
  stopcontact_werkblad: {
    label: 'Stopcontact boven het werkblad (dubbel)', vak: 'elektriciteit', b: 15, d: 4, h: 8, hoogte: 106, bevestiging: 'wand',
    teken: 'stopcontact', vorm: 'stopcontact', kleur: WIT, stuks: 2,
    herkomst: onderzoek('5.3 [E6]: ± 110 cm boven de vloer (praktijk)'),
    klant: { naam: 'Stopcontact boven het werkblad', uitleg: 'Een dubbel stopcontact hoger in de muur, boven een werkblad of een kast.' },
  },
  schakelaar: {
    label: 'Schakelaar', vak: 'elektriciteit', b: 8, d: 4, h: 8, hoogte: 106, bevestiging: 'wand',
    teken: 'schakelaar', vorm: 'schakelaar', kleur: WIT,
    herkomst: onderzoek('5.3 [E5]: geen wettelijke hoogte, in de praktijk 105 tot 120 cm'),
    klant: { naam: 'Lichtschakelaar', uitleg: 'Een schakelaar voor het licht, meestal naast de deur.' },
  },
  datapunt: {
    label: 'Datapunt', vak: 'elektriciteit', b: 8, d: 4, h: 8, hoogte: 30, bevestiging: 'wand',
    teken: 'datapunt', vorm: 'plaatje', kleur: WIT,
    herkomst: kennis('over datapunten vond het onderzoek niets (6.1)'),
    klant: { naam: 'Netwerkaansluiting', uitleg: 'Een aansluiting voor internet met een kabel (tv, computer).' },
  },
  lichtpunt: {
    label: 'Lichtpunt (plafond)', vak: 'elektriciteit', b: 12, d: 12, h: 22, bevestiging: 'plafond',
    teken: 'lichtpunt', vorm: 'lichtpunt', kleur: WIT,
    herkomst: kennis(),
    klant: { naam: 'Lichtpunt', uitleg: 'Een aansluiting aan het plafond voor een lamp naar keuze.' },
  },
  inbouwspot: {
    label: 'Inbouwspot', vak: 'elektriciteit', b: 9, d: 9, h: 3, bevestiging: 'plafond',
    teken: 'spot', vorm: 'spot', kleur: WIT,
    herkomst: onderzoek('5.4 [L5]: 80 tot 100 cm van de muur, 1 tot 2 m uit elkaar; de maat: algemene kennis'),
    klant: { naam: 'Inbouwspot', uitleg: 'Een kleine lamp die in het plafond is ingebouwd.' },
  },
  pendel: {
    label: 'Hanglamp (pendel)', vak: 'elektriciteit', b: 40, d: 40, h: 130, bevestiging: 'plafond',
    teken: 'armatuur', vorm: 'pendel', kleur: '#2f3437',
    herkomst: onderzoek('5.4 [L5][L6]: 55 tot 70 cm boven de tafel (bij een plafond van 2,70 m en een tafel van 75 cm)'),
    klant: { naam: 'Hanglamp', uitleg: 'Een lamp die aan het plafond hangt, bijvoorbeeld boven de tafel.' },
  },
  wandlamp: {
    label: 'Wandlamp', vak: 'elektriciteit', b: 15, d: 12, h: 15, hoogte: 180, bevestiging: 'wand',
    teken: 'wandlamp', vorm: 'wandlamp', kleur: '#2f3437',
    herkomst: kennis(),
    klant: { naam: 'Wandlamp', uitleg: 'Een lamp aan de muur.' },
  },
  laadpaal: {
    label: 'Laadpaal (aan de muur)', vak: 'elektriciteit', b: 21, d: 11, h: 29, hoogte: 100, bevestiging: 'wand',
    teken: 'kader', afkorting: 'LP', vorm: 'laadpaal', kleur: '#e9e8e3',
    herkomst: onderzoek('6.1 [I5]: voorbeeld van een kastje 29 × 21 × 11 cm; de montagehoogte niet gevonden (algemene kennis)'),
    klant: { naam: 'Laadpaal', uitleg: 'Een aansluiting aan de muur om een elektrische auto op te laden.' },
  },
  omvormer: {
    label: 'Omvormer (zonnepanelen)', vak: 'elektriciteit', b: 45, d: 18, h: 55, hoogte: 120, bevestiging: 'wand',
    teken: 'kader', afkorting: 'OMV', vorm: 'kast', kleur: LICHTGRIJS, vrij: { opzij: 20 }, technisch: true,
    herkomst: onderzoek('6.1 [I6]: 20 cm naast de batterij; de maat: algemene kennis'),
    klant: { naam: 'Omvormer van de zonnepanelen', uitleg: 'Zet de stroom van de zonnepanelen om naar stroom voor de woning.' },
  },
  batterij: {
    label: 'Thuisbatterij', vak: 'elektriciteit', b: 55, d: 35, h: 118, hoogte: 0, bevestiging: 'vloer',
    teken: 'kader', afkorting: 'BAT', vorm: 'kast', kleur: LICHTGRIJS, vrij: { voor: 30, opzij: 30 }, technisch: true,
    herkomst: onderzoek('6.1 [I6]: 20 kWh, 55 × 35 × 118 cm (één merk); 30 cm vrij voor, links, rechts en boven'),
    klant: { naam: 'Thuisbatterij', uitleg: 'Bewaart stroom van de zonnepanelen voor later.' },
  },

  // ---------- koeling en verwarming ----------
  airco_wand: {
    label: 'Airco binnenunit (wand)', vak: 'klimaat', b: 90, d: 23, h: 30, hoogte: 210, bevestiging: 'wand',
    teken: 'kader', afkorting: 'AC', vorm: 'wandunit', kleur: '#f6f6f3',
    herkomst: onderzoek('6.2 [I7]: hoog aan de muur; de maten per merk zijn niet gezocht (algemene kennis)'),
    klant: { naam: 'Airco (binnendeel)', uitleg: 'Het deel van de airco in de kamer: het koelt of verwarmt de lucht.' },
  },
  airco_cassette: {
    label: 'Airco binnenunit (cassette)', vak: 'klimaat', b: 62, d: 62, h: 4, bevestiging: 'plafond',
    teken: 'kader', afkorting: 'AC', vorm: 'cassette', kleur: '#f6f6f3',
    herkomst: kennis('het paneel van een cassette in een verlaagd plafond (6.2 [I7]); de unit zelf zit boven het plafond'),
    klant: { naam: 'Airco in het plafond', uitleg: 'Een airco die in het plafond zit: alleen het rooster is te zien.' },
  },
  airco_buiten: {
    label: 'Airco buitenunit', vak: 'klimaat', b: 80, d: 30, h: 55, hoogte: 10, bevestiging: 'buiten',
    teken: 'kader', afkorting: 'AC', vorm: 'buitenunit', kleur: '#dedfdc', vrij: { voor: 50, opzij: 30, achter: 15 },
    herkomst: onderzoek('6.2 [I8]: vrij 10 tot 15 cm achter en 30 cm opzij (Nederlandse sites); vooraan 50 cm en de maat: algemene kennis'),
    klant: { naam: 'Airco (buitendeel)', uitleg: 'Het deel van de airco buiten: het brengt de warmte naar buiten, of haalt ze binnen.' },
  },
  warmtepomp_buiten: {
    label: 'Warmtepomp buitenunit (lucht-water)', vak: 'klimaat', b: 100, d: 45, h: 140, hoogte: 10, bevestiging: 'buiten',
    teken: 'kader', afkorting: 'WP', vorm: 'buitenunit', kleur: '#dedfdc', vrij: { voor: 100, opzij: 30, achter: 30 },
    herkomst: onderzoek('6.2 [I9]: monoblock ± 1 m breed en 1,4 m hoog; vrij 1 m vooraan, 30 tot 60 cm opzij, 15 tot 50 cm achter'),
    klant: { naam: 'Warmtepomp (buitendeel)', uitleg: 'Haalt warmte uit de buitenlucht om de woning en het water te verwarmen.' },
  },
  warmtepomp_binnen: {
    label: 'Warmtepomp binnenunit', vak: 'klimaat', b: 60, d: 65, h: 185, hoogte: 0, bevestiging: 'vloer',
    teken: 'kader', afkorting: 'WP', vorm: 'kolom', kleur: WIT, vrij: { voor: 60 }, technisch: true,
    herkomst: onderzoek('6.2 [I9]: 60 tot 76 breed, 180 tot 190 hoog, 62 tot 90 diep; 6.5 [I20]: doorgang van minstens 60 cm ervoor'),
    klant: { naam: 'Warmtepomp (binnendeel)', uitleg: 'Het deel van de warmtepomp binnen: het stuurt het warme water naar de verwarming (vloerverwarming of radiatoren).' },
  },
  boiler: {
    label: 'Boiler bij de warmtepomp (200 liter)', vak: 'klimaat', b: 60, d: 60, h: 150, hoogte: 0, bevestiging: 'vloer',
    teken: 'rond', afkorting: 'B', vorm: 'boiler', kleur: WIT, vrij: { voor: 40 }, technisch: true,
    herkomst: onderzoek('6.2 [I10]: 200 liter: 60 cm doorsnede, 134 tot 160 cm hoog; de vrije ruimte: algemene kennis'),
    klant: { naam: 'Boiler', uitleg: 'Een vat met warm water voor de kranen en de douche, opgewarmd door de warmtepomp.' },
  },
  radiator: {
    label: 'Radiator (paneel, type 22)', vak: 'klimaat', b: 100, d: 10, h: 60, hoogte: 15, bevestiging: 'wand',
    teken: 'radiator', vorm: 'radiator', kleur: '#f6f6f3',
    herkomst: onderzoek('6.2 [I12]: hoogtes 30 tot 90 cm, lengtes 40 tot 300 cm; type 22 = twee platen; de hoogte boven de vloer: algemene kennis'),
    klant: { naam: 'Radiator', uitleg: 'Verwarmt de kamer met warm water.' },
  },
  verdeler_vloerverwarming: {
    label: 'Verdeler vloerverwarming (in kast)', vak: 'klimaat', b: 60, d: 12, h: 75, hoogte: 30, bevestiging: 'wand',
    teken: 'kader', afkorting: 'VV', vorm: 'kast', kleur: WIT, technisch: true,
    herkomst: onderzoek('6.2 [I11]: kast 43 tot 106 cm breed, 69 tot 80 hoog, 11 tot 16 diep; de hoogte boven de vloer: algemene kennis'),
    klant: { naam: 'Verdeler van de vloerverwarming', uitleg: 'Hier vertrekken de buizen van de vloerverwarming naar elke kamer.' },
  },
  thermostaat: {
    label: 'Thermostaat', vak: 'klimaat', b: 9, d: 3, h: 9, hoogte: 150, bevestiging: 'wand',
    teken: 'thermostaat', vorm: 'plaatje', kleur: WIT,
    herkomst: kennis(),
    klant: { naam: 'Thermostaat', uitleg: 'Hiermee stel je de temperatuur in.' },
  },
  gasketel: {
    label: 'Gasketel (wandtoestel)', vak: 'klimaat', b: 45, d: 35, h: 75, hoogte: 120, bevestiging: 'wand',
    teken: 'kader', afkorting: 'GK', vorm: 'kast', kleur: WIT, technisch: true,
    herkomst: kennis('de maten van de ketel vond het onderzoek niet (6.2 [I13])'),
    klant: { naam: 'Verwarmingsketel', uitleg: 'Een ketel op gas die het water voor de verwarming opwarmt.' },
  },

  // ---------- ventilatie ----------
  ventilatie_c: {
    label: 'Ventilatie-unit systeem C', vak: 'ventilatie', b: 40, d: 30, h: 25, hoogte: 190, bevestiging: 'wand',
    teken: 'kader', afkorting: 'C', vorm: 'kast', kleur: WIT, technisch: true,
    herkomst: kennis('de soort uit 5.2 [V1][V8]; de maat: algemene kennis'),
    klant: { naam: 'Ventilatietoestel', uitleg: 'Zuigt de vochtige lucht uit de natte ruimtes (keuken, badkamer, wc) naar buiten; verse lucht komt binnen langs roosters, bijvoorbeeld boven de ramen.' },
  },
  ventilatie_d: {
    label: 'Ventilatie-unit systeem D (met warmteterugwinning)', vak: 'ventilatie', b: 75, d: 55, h: 60, hoogte: 140, bevestiging: 'wand',
    teken: 'kader', afkorting: 'D', vorm: 'unit', kleur: WIT, vrij: { voor: 60 }, technisch: true,
    herkomst: kennis('vier aansluitingen en een condensafvoer (6.4 [V7]); de maat en de vrije ruimte voor de filters: algemene kennis'),
    klant: { naam: 'Ventilatietoestel met warmteterugwinning', uitleg: 'Blaast verse lucht in de kamers en zuigt de vochtige lucht af; de warmte van de lucht die naar buiten gaat, blijft binnen.' },
  },
  toevoermond: {
    label: 'Toevoermond (droge ruimte)', vak: 'ventilatie', b: 20, d: 20, h: 4, bevestiging: 'plafond',
    teken: 'toevoermond', vorm: 'mond', kleur: WIT,
    herkomst: onderzoek('6.4 [I19]: rond ventiel in plafond of wand, gat van ± 13 cm; de maat van de plaat: algemene kennis'),
    klant: { naam: 'Ventiel voor verse lucht', uitleg: 'Hier komt verse lucht de kamer binnen.' },
  },
  afvoermond: {
    label: 'Afvoermond (natte ruimte)', vak: 'ventilatie', b: 20, d: 20, h: 4, bevestiging: 'plafond',
    teken: 'afvoermond', vorm: 'mond', kleur: WIT,
    herkomst: onderzoek('6.4 [I19] en 5.2 [V3]: afvoer in keuken, badkamer, wc en wasplaats'),
    klant: { naam: 'Ventiel voor afzuiging', uitleg: 'Hier wordt de vochtige of geurige lucht afgezogen.' },
  },
  gevelrooster: {
    label: 'Gevelrooster (aanzuig of uitblaas)', vak: 'ventilatie', b: 30, d: 3, h: 30, hoogte: 220, bevestiging: 'wand',
    teken: 'rooster', vorm: 'rooster', kleur: '#8c8f91',
    herkomst: onderzoek('6.4 [I19]: 125 tot 200 mm; de maat van de kap en de hoogte: algemene kennis'),
    klant: { naam: 'Rooster in de gevel', uitleg: 'Een rooster in de buitenmuur waar de ventilatie lucht binnenhaalt of naar buiten blaast.' },
  },
  dakdoorvoer: {
    label: 'Dakdoorvoer', vak: 'ventilatie', b: 25, d: 25, h: 80, hoogte: 0, bevestiging: 'dak',
    teken: 'doorvoer', vorm: 'doorvoer', kleur: '#9a9d9f',
    herkomst: onderzoek('6.4 [I19]: 125 tot 200 mm, het kanaal ernaartoe recht; hoe ver ze boven het dak komt: algemene kennis'),
    klant: { naam: 'Doorvoer in het dak', uitleg: 'Een buis door het dak waar de ventilatie lucht naar buiten blaast of binnenhaalt.' },
    uitleg: 'Alleen op een plat dak juist getekend: ze steekt 50 cm boven de dakplaat uit.',
  },

  // ---------- sanitair ----------
  boiler_elektrisch: {
    label: 'Elektrische boiler (150 liter)', vak: 'sanitair', b: 55, d: 55, h: 120, hoogte: 0, bevestiging: 'vloer',
    teken: 'rond', afkorting: 'B', vorm: 'boiler', kleur: WIT, technisch: true,
    herkomst: kennis('verhouding zoals de boilers in 6.2 [I10]'),
    klant: { naam: 'Elektrische boiler', uitleg: 'Een vat met warm water voor de kranen en de douche, elektrisch opgewarmd.' },
  },
  collector: {
    label: 'Collector warm en koud water', vak: 'sanitair', b: 50, d: 10, h: 30, hoogte: 40, bevestiging: 'wand',
    teken: 'kader', afkorting: 'COL', vorm: 'collector', kleur: GRIJS, technisch: true,
    herkomst: onderzoek('6.3 [I15]: vanaf de collector een eigen buis naar elk toestel; de maat: algemene kennis'),
    klant: { naam: 'Waterverdeler', uitleg: 'Hier vertrekt een eigen leiding met warm en koud water naar elke kraan.' },
  },
  waterverzachter: {
    label: 'Waterverzachter', vak: 'sanitair', b: 20, d: 47, h: 50, hoogte: 0, bevestiging: 'vloer',
    teken: 'kader', afkorting: 'WV', vorm: 'kast', kleur: WIT, technisch: true,
    herkomst: onderzoek('6.3 [I17]: voorbeeld van een klein toestel 20 × 50 × 47 cm; vlak na de watermeter, met een afvoer'),
    klant: { naam: 'Waterverzachter', uitleg: 'Haalt de kalk uit het water, zodat toestellen en kranen langer meegaan.' },
  },
  regenwaterpomp: {
    label: 'Regenwaterpomp met filter', vak: 'sanitair', b: 50, d: 30, h: 40, hoogte: 0, bevestiging: 'vloer',
    teken: 'kader', afkorting: 'RW', vorm: 'pomp', kleur: '#3d6fa3', technisch: true,
    herkomst: kennis('de put in de tuin, pomp en filter binnen (6.3 [I16]); de maat: algemene kennis'),
    klant: { naam: 'Regenwaterpomp', uitleg: 'Pompt het regenwater uit de put naar wat het gebruikt, bijvoorbeeld de wc of de wasmachine.' },
  },
  buitenkraan: {
    label: 'Buitenkraan', vak: 'sanitair', b: 8, d: 12, h: 8, hoogte: 60, bevestiging: 'wand',
    teken: 'kraan', vorm: 'kraan', kleur: '#9fa3a6',
    herkomst: kennis('meestal op regenwater (6.3 [I16], afgeleid)'),
    klant: { naam: 'Buitenkraan', uitleg: 'Een kraan buiten aan de muur, bijvoorbeeld om de tuin te sproeien.' },
  },
};

const leidingen: Record<string, LeidingSoortType> = {
  kabel: {
    label: 'Kabel in buis (kring)', vak: 'elektriciteit', kleur: '#8e44ad', vorm: 'rond', maten: [16, 20, 25], hoogte: 'vloer',
    herkomst: kennis('flexibele buis van 16, 20 of 25 mm; per kring hoogstens 8 stopcontacten volgt uit 5.3 [E6]'),
    klant: { naam: 'Elektriciteitskabel', uitleg: 'Kabels in een buis, van de zekeringkast naar de stopcontacten, de schakelaars en het licht.' },
  },
  koelleiding: {
    label: 'Koelleiding (vloeistof en gas, geïsoleerd)', vak: 'klimaat', kleur: '#11a3a3', vorm: 'paar',
    maten: [[6.35, 9.52], [6.35, 12.7], [9.52, 15.88]], hoogte: 'plafond',
    maxLengte: { waarde: 25, herkomst: onderzoek('6.2 [I8]: 10 tot 25 m bij gewone toestellen, tot 70 m bij grote'), uitleg: 'de grootste lengte bij gewone toestellen' },
    klant: { naam: 'Leiding van de airco', uitleg: 'Twee buizen tussen het binnen- en het buitendeel van de airco.' },
    herkomst: onderzoek('6.2 [I8]: twee geïsoleerde koperen leidingen, bv. 1/4 en 3/8 duim'),
  },
  condensafvoer: {
    label: 'Condensafvoer', vak: 'klimaat', kleur: '#a7845a', vorm: 'rond', maten: [16, 18, 20], hoogte: 'plafond', naarBuiten: true,
    herkomst: onderzoek('6.2 [I8]: slang van 16 of 18 mm die altijd naar beneden loopt'),
    klant: { naam: 'Afvoer van de airco', uitleg: 'Voert het water af dat de airco uit de lucht haalt.' },
  },
  aanvoer_verwarming: {
    label: 'Aanvoer verwarming', vak: 'klimaat', kleur: '#a3172c', vorm: 'rond', maten: [20, 16, 26], hoogte: 'vloer',
    herkomst: kennis('kleur: rood volgens een forum (6.6 [I22]), donkerder om ze van warm water te onderscheiden'),
    klant: { naam: 'Verwarming, heen', uitleg: 'Brengt het warme water van het toestel dat verwarmt naar de vloerverwarming of de radiatoren.' },
  },
  retour_verwarming: {
    label: 'Retour verwarming', vak: 'klimaat', kleur: '#1d3a8a', vorm: 'rond', maten: [20, 16, 26], hoogte: 'vloer',
    herkomst: kennis('kleur: blauw volgens een forum (6.6 [I22]), donkerder om ze van koud water te onderscheiden'),
    klant: { naam: 'Verwarming, terug', uitleg: 'Brengt het afgekoelde water terug naar het toestel dat verwarmt.' },
  },
  vloerverwarming: {
    label: 'Lus vloerverwarming', vak: 'klimaat', kleur: '#e8836e', vorm: 'rond', maten: [16, 17, 20], hoogte: 'vloer',
    maxLengte: { waarde: 120, herkomst: onderzoek('6.2 [I11]: één kring met buis van 16 mm tot ± 100 m, nooit meer dan 120 m'), uitleg: 'de grootste lengte van één kring' },
    klant: { naam: 'Vloerverwarming', uitleg: 'Buizen in de vloer met warm water: de vloer verwarmt de kamer.' },
    herkomst: onderzoek('6.2 [I11]: buis van 16 mm, 10 tot 15 cm tussen de buizen (te bevestigen)'),
  },
  gas: {
    label: 'Gasleiding', vak: 'klimaat', kleur: '#f0c419', vorm: 'rond', maten: [15, 22, 28], hoogte: 'wand', naarBuiten: true,
    herkomst: onderzoek('6.6 [I22]: gasleidingen in kunststof zijn geel; de maten: algemene kennis'),
    klant: { naam: 'Gasleiding', uitleg: 'Brengt het gas naar de toestellen op gas, bijvoorbeeld de ketel of het kookvuur.' },
  },
  ventilatie_rond: {
    label: 'Ventilatiekanaal rond', vak: 'ventilatie', kleur: '#7cb342', vorm: 'rond', maten: [160, 125, 180, 200, 90, 75, 63], hoogte: 'plafond',
    herkomst: onderzoek('6.4 [I19]: stijf 125, 160, 180 of 200 mm; flexibel 63, 75 of 90 mm; kleur: eigen keuze'),
    klant: { naam: 'Ventilatiekanaal', uitleg: 'Een buis die de lucht van en naar het ventilatietoestel brengt.' },
  },
  ventilatie_plat: {
    label: 'Ventilatiekanaal plat', vak: 'ventilatie', kleur: '#7cb342', vorm: 'plat', maten: [[140, 64]], hoogte: 'vloer',
    herkomst: onderzoek('6.4 [I19]: plat-ovaal 14 × 6,4 cm, in de chape of boven een verlaagd plafond'),
    klant: { naam: 'Plat ventilatiekanaal', uitleg: 'Een plat kanaal in de vloer voor de lucht van de ventilatie.' },
  },
  warm_water: {
    label: 'Warm water', vak: 'sanitair', kleur: '#e53935', vorm: 'rond', maten: [16, 20, 26], hoogte: 'vloer',
    herkomst: onderzoek('6.3 [I15]: 16 mm naar de toestellen, 20 tot 26 mm voor de hoofdleiding; kleur 6.6 [I22]'),
    klant: { naam: 'Warm water', uitleg: 'Leiding met warm water naar de kranen, bijvoorbeeld in de keuken en de badkamer.' },
  },
  koud_water: {
    label: 'Koud water', vak: 'sanitair', kleur: '#1e88e5', vorm: 'rond', maten: [16, 20, 26], hoogte: 'vloer', naarBuiten: true,
    herkomst: onderzoek('6.3 [I15]; kleur 6.6 [I22]'),
    klant: { naam: 'Koud water', uitleg: 'Leiding met drinkwater naar de kranen en de toestellen.' },
  },
  afvoer: {
    label: 'Afvoer', vak: 'sanitair', kleur: '#795548', vorm: 'rond', maten: [110, 75, 50, 40, 32], hoogte: 'vloer', naarBuiten: true, afvoer: true,
    herkomst: onderzoek('6.3 [I14]: wc 110 mm, bad, douche en spoelbak 50 mm, lavabo 40 mm; afschot 0,5 tot 1,5 cm per meter (niet getekend)'),
    klant: { naam: 'Afvoer', uitleg: 'Voert het gebruikte water af naar de riolering, bijvoorbeeld van de wc, een lavabo, een douche of de keuken.' },
  },
  regenwater: {
    label: 'Regenwater', vak: 'sanitair', kleur: '#2e7d32', vorm: 'rond', maten: [20, 26, 32], hoogte: 'vloer', naarBuiten: true,
    herkomst: onderzoek('6.3 [I16]: aparte leiding naar wc, wasmachine en buiten; kleur 6.6 [I22]'),
    klant: { naam: 'Regenwater', uitleg: 'Leiding met regenwater uit de put, bijvoorbeeld voor de wc, de wasmachine of een buitenkraan.' },
  },
};

/** De catalogus techniek: zet hem in de plancatalogus als `techniek` (`{ ...planCatalogus, techniek: techniekCatalogus }`). */
export const techniekCatalogus: TechniekCatalogus = { toestellen, leidingen };

/** De toestellen van een technische ruimte, in de volgorde waarin `technischeOpstelling` ze langs de wanden zet. */
export const TECHNISCHE_RUIMTE = ['tellerkast', 'verdeelbord', 'warmtepomp_binnen', 'boiler', 'verdeler_vloerverwarming', 'ventilatie_d', 'collector'];
