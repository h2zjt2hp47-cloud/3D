/**
 * Positie bewerken: formulier uit het productmodel (raam/deur, garagepoort of aanbouw), met controles,
 * prijs, technische gegevens, inbegrepen/niet inbegrepen, bestellijst, vooraanzicht en 3D.
 *
 * Ramen en deuren: bovenaan de indeling staan kant-en-klare indelingen als tegels met een tekening (één tik);
 * de instelling per vak zit eronder achter "Meer opties". Kleuren staan als een waaier van stalen.
 *
 * Vaste modellen (16/11: carport of overkapping, tuinhuis, loods, balustrade, luifel, trap; vastemodellen.ts): alleen in
 * 3D (ze hebben geen vooraanzicht), met de knop *Afgewerkt / Constructie* en *Maten*; per stap de kenmerken voor een
 * eerste gesprek, het detail achter *Meer opties*; de meldingen van het model als controles; een keuze die door een andere
 * keuze niet meer kan, wordt vanzelf de eerste die wel kan, met een korte melding (`herstelKeuzes`); de meetstaat in
 * plaats van de bestellijst. Geen bedrag.
 */
import { gebouwKader, passendKader, tekenSvg, type BouwWeergave, type ConfiguratieResultaat, type Kenmerk, type Scene3DMetMaten } from '../../core/src/index.js';
import { berekenRaam, ruitenVan } from '../../core/voorbeelden/raam.js';
import { INDELINGEN, indelingVan, pasIndelingToe, type Indeling } from '../../core/voorbeelden/raamindelingen.js';
import { raamKeuzes } from '../../core/voorbeelden/woning.js';
import { aanbouwNaarPlan } from '../../core/voorbeelden/snelstart.js';
import { herstelKeuzes, isVastModel, meetstaatGroep, meetstaatTekst, VASTE_MODELLEN, vastModelOpbouw, type Herstel, type VastModelCode } from '../../core/voorbeelden/vastemodellen.js';
import { maak3D, type Standpunt, type Viewer3D } from '../../demo-web/src/drie-d.js';
import { $, alleenPrijs, el, eur, getal, kopieer, num, PRIJZEN } from './hulp.js';
import { heeftConstructie, isGebouw, positieMaatlijnen, positieScene } from './positie-3d.js';
import { bewaarInBibliotheek, kanInWoning, klantKorting, MODELLEN, nieuweId, openingVan, resultaat, toestand, vrijeMuur, wijzig, zetInWoning, zonderPrijs, type Positie } from './staat.js';

type Toestand = 'ok' | 'let-op' | 'fout';
export interface Controle { titel: string; toestand: Toestand; waarde?: string; uitleg?: string }

let huidigId: string | undefined;
let weergave: 'voor' | '3d' = 'voor';
let viewer: Viewer3D | null | undefined;
let naarPlan: (openingId: string) => void = () => {};
let naarOfferte: () => void = () => {};
let naarWoning3D: () => void = () => {};
/** Afgewerkt of constructie (vaste modellen); blijft staan als je van positie wisselt. */
let bouwWeergave: BouwWeergave = 'afgewerkt';
/** Hoofdmaten in de 3D (vaste modellen en een aanbouw). */
let matenAan = false;
/** Wat de configurator bij de laatste keuze vanzelf omzette (een keuze die niet meer kon), voor de melding. */
let hersteld: Herstel[] = [];
/** De positie die de 3D laatst toonde: een andere positie begint schuin van boven. */
let in3D = '';
/** Wat de 3D laatst tekende (positie en keuzes), om een beeld ervan alleen te geven als het nog klopt. */
let getekend = '';

const huidig = (): Positie | undefined => toestand().posities.find((p) => p.id === huidigId) ?? toestand().posities[0];

function eigenschap(p: Positie, kenmerk: string, naam: string): unknown {
  const k = MODELLEN[p.model].model.kenmerken.find((x) => x.code === kenmerk);
  if (!k || k.type !== 'keuze') return undefined;
  return k.keuzes.find((kz) => kz.code === p.keuzes[kenmerk])?.eigenschappen?.[naam];
}
function keuzeLabel(p: Positie, kenmerk: string): string {
  const k = MODELLEN[p.model].model.kenmerken.find((x) => x.code === kenmerk);
  if (!k || k.type !== 'keuze') return '';
  return k.keuzes.find((kz) => kz.code === p.keuzes[kenmerk])?.label ?? '';
}

// ---------- controles per model ----------
export function controles(p: Positie, r: ConfiguratieResultaat): Controle[] {
  if (isVastModel(p.model)) return vastControles(r);
  return p.model === 'AANBOUW' ? aanbouwControles(p, r) : p.model === 'POORT' ? poortControles(r) : raamControles(p, r);
}

/**
 * Een vast model: de meldingen van het model zelf (in gewone taal; een waarschuwing is een aandachtspunt), en het hoogste
 * punt (voor de vergunning). Een fout bij een veld staat bij dat veld.
 */
function vastControles(r: ConfiguratieResultaat): Controle[] {
  const uit: Controle[] = [];
  const top = num(r.afgeleid.tophoogte);
  if (top) uit.push({ titel: 'Hoogste punt', toestand: 'ok', waarde: `${getal(top / 100, 2)} m` });
  for (const m of r.meldingen.filter((x) => !x.kenmerk)) uit.push({ titel: m.melding, toestand: m.ernst === 'fout' ? 'fout' : 'let-op' });
  return uit;
}

function raamControles(p: Positie, r: ConfiguratieResultaat): Controle[] {
  const a = r.afgeleid;
  const uit: Controle[] = [];
  const type = String(p.keuzes.type);
  const n = num(a.n), vb = num(a.vb), vh = num(a.vh), kg = num(a.vleugel_kg), uw = num(a.uw);
  if (type === 'raam' || type === 'terrasdeur') {
    // Per vak zijn eigen breedte en hoogte (ongelijke vakken, een bovenlicht boven één vak …).
    for (let i = 1; i <= n; i++) {
      const op = String(a[`op${i}`]);
      const maxb = num(eigenschap(p, `vak${i}`, 'maxb')), maxh = num(eigenschap(p, `vak${i}`, 'maxh'));
      if (op === 'vast') continue;
      const b = num(a[`kb${i}`]), h = num(a[`kh${i}`]);
      const ok = b <= maxb && h <= maxh;
      uit.push({ titel: `Vak ${i}: maat binnen de grens van het beslag`, toestand: ok ? 'ok' : 'fout', waarde: `${getal(b)} × ${getal(h)} / max ${getal(maxb)} × ${getal(maxh)} mm` });
    }
    if (num(a.n_stolp) > 0) uit.push({ titel: 'Stolp: vleugels scharnieren aan de buitenkant', toestand: a.stolp_ok === true ? 'ok' : 'fout', waarde: a.stolp_ok === true ? 'links en rechts' : 'draairichting klopt niet' });
  }
  if (eigenschap(p, 'type', 'delen') === true) {
    const maxb = num(eigenschap(p, 'type', 'deelb')), maxh = num(eigenschap(p, 'type', 'deelh'));
    uit.push({ titel: 'Delen: maat binnen de grens van het systeem', toestand: vb <= maxb && vh <= maxh ? 'ok' : 'fout', waarde: `${getal(n)} × ${getal(vb)} × ${getal(vh)} / max ${getal(maxb)} × ${getal(maxh)} mm` });
  }
  if (type === 'voordeur' && num(a.nzl) > 0) {
    const b = num(a.wb);
    uit.push({ titel: 'Breedte van de deur naast het zijlicht', toestand: b >= 800 && b <= 1200 ? 'ok' : 'fout', waarde: `${getal(b)} mm (80 tot 120 cm)` });
  }
  if (num(a.beweeg) > 0 || type === 'voordeur') {
    const max = num(eigenschap(p, 'type', 'maxkg')) || 130;
    uit.push({ titel: 'Gewicht zwaarste vleugel', toestand: kg > max ? 'fout' : kg > max * 0.85 ? 'let-op' : 'ok', waarde: `${getal(kg)} / max ${max} kg` });
  }
  if (a.veilig_nodig === true && num(a.glas_m2) > 0) {
    const veilig = eigenschap(p, 'glas', 'veilig') === true;
    uit.push({ titel: 'Veiligheidsglas (deur of glas lager dan 85 cm)', toestand: veilig ? 'ok' : 'fout', waarde: veilig ? 'gelaagd' : 'niet gelaagd', uitleg: 'NBN S 23-002 (te bevestigen per project).' });
  }
  if (num(p.keuzes.verdieping) > 0 && (num(a.borst) < 850 || a.type_deur === true || type !== 'raam')) {
    uit.push({ titel: 'Valbeveiliging (verdieping)', toestand: 'let-op', waarde: `borstwering ${getal(num(a.borst) / 10)} cm`, uitleg: 'Balustrade of vast onderdeel nodig (te bevestigen).' });
  }
  uit.push({ titel: 'Isolatie (EPB)', toestand: uw <= 1.5 ? 'ok' : 'let-op', waarde: `Uw ${getal(uw, 2)} W/m²K`, uitleg: `Richtwaarde Uw ≤ 1,5 (te verifiëren). Afstandhouder ψ ${getal(num(a.psi), 2)}.` });
  if (a.heeft_stijl === true) {
    const nodig = num(a.i_nodig), aanwezig = num(a.i_aanwezig);
    const benut = aanwezig > 0 ? nodig / aanwezig : 9;
    const wat = type === 'schuif' || type === 'hefschuif' ? 'Ontmoetingsstijlen schuifraam' : num(a.stijl_l) > 0 ? 'Tussenstijl' : num(a.bl) > 0 ? 'Regel onder het bovenlicht' : 'Regel boven het vak onderaan';
    uit.push({
      titel: `Statiek: ${wat.toLowerCase()}`, toestand: benut > 1 ? 'fout' : benut > 0.85 ? 'let-op' : 'ok',
      waarde: `nodig ${getal(nodig, 1)} · aanwezig ${getal(aanwezig, 1)} cm⁴ (${getal(benut * 100)} %)`,
      uitleg: `Winddruk ${getal(num(p.keuzes.winddruk))} Pa, overspanning ${getal(Math.max(num(a.stijl_l), num(a.regel_l)))} mm, doorbuiging ≤ L/${p.keuzes.doorbuiging === 'b' ? 200 : 300}. ${benut > 1 ? 'Kies een versterkte tussenstijl of een koppelprofiel.' : ''} Voordimensionering, te laten bevestigen.`,
    });
  }
  if (eigenschap(p, 'ruimte', 'droog') === true && type !== 'voordeur') {
    const waarde = a.vent_toestel === true ? 'raamventilator' : a.vent_rooster === true ? 'rooster' : 'geen rooster';
    uit.push({ titel: 'Ventilatie droge ruimte', toestand: p.keuzes.rooster === true ? 'ok' : 'let-op', waarde, uitleg: 'Systeem C: luchttoevoer via een rooster, of via een raamventilator (EPB, te bevestigen).' });
  }
  // Twee of drie screens naast elkaar (ronde 11b): elk hoogstens 5 m breed en minstens 50 cm.
  if (p.keuzes.zonwering === 'screen' && num(a.zon_n) >= 2) {
    const breed = [a.zb1, a.zb2, a.zb3].slice(0, num(a.zon_n)).map(num);
    const ok = breed.every((b) => b <= 5000 && b >= 500);
    uit.push({ titel: 'Screens: breedte per screen', toestand: ok ? 'ok' : 'fout', waarde: `${breed.map((b) => getal(b)).join(' + ')} mm / 50 tot 500 cm` });
  }
  if (p.keuzes.ruimte === 'badkamer' || p.keuzes.ruimte === 'wc') {
    const mat = eigenschap(p, 'glas', 'mat') === true;
    uit.push({ titel: 'Privacy', toestand: mat ? 'ok' : 'let-op', waarde: mat ? 'mat glas' : 'helder glas' });
  }
  if (p.keuzes.rc2 === true) uit.push({ titel: 'Inbraakwerend RC2', toestand: eigenschap(p, 'glas', 'veilig') === true || num(a.glas_m2) === 0 ? 'ok' : 'fout', waarde: 'beslag + gelaagd glas' });
  return uit;
}

function poortControles(r: ConfiguratieResultaat): Controle[] {
  const a = r.afgeleid;
  const b = num(r.kenmerken.find((k) => k.code === 'breedte')?.waarde), h = num(r.kenmerken.find((k) => k.code === 'hoogte')?.waarde);
  return [
    { titel: 'Secties', toestand: 'ok', waarde: `${getal(num(a.ns))} × ${getal(num(a.sh))} mm hoog` },
    { titel: 'Latei boven de opening', toestand: b > 5000 ? 'let-op' : 'ok', waarde: `opening ${getal(b / 1000, 2)} m breed`, uitleg: b > 5000 ? 'Breder dan 5 m: laat de latei berekenen.' : undefined },
    { titel: 'Doorrijhoogte', toestand: h < 2000 ? 'let-op' : 'ok', waarde: `${getal(h / 10)} cm` },
  ];
}

function aanbouwControles(p: Positie, r: ConfiguratieResultaat): Controle[] {
  const a = r.afgeleid;
  const uit: Controle[] = [];
  const muren = a.muren === true;
  const maxb = num(eigenschap(p, 'raamtype', 'maxb')), maxh = num(eigenschap(p, 'raamtype', 'maxh')), maxkg = num(eigenschap(p, 'raamtype', 'maxkg'));
  const vb = num(a.vleugel_b), rh = num(a.raam_h), kg = num(a.vleugel_kg), uw = num(a.uw);
  uit.push({ titel: 'Vleugelbreedte binnen systeemgrens', toestand: vb <= maxb ? 'ok' : 'fout', waarde: `${getal(vb)} / max ${getal(maxb)} mm` });
  uit.push({ titel: 'Hoogte binnen systeemgrens', toestand: rh <= maxh ? 'ok' : 'fout', waarde: `${getal(rh)} / max ${getal(maxh)} mm` });
  uit.push({ titel: 'Gewicht per vleugel', toestand: kg <= maxkg ? (kg > maxkg * 0.85 ? 'let-op' : 'ok') : 'fout', waarde: `${getal(kg)} / max ${getal(maxkg)} kg` });
  const veilig = eigenschap(p, 'glas', 'veilig') === true;
  uit.push({ titel: 'Veiligheidsglas (glas tot op de vloer)', toestand: veilig ? 'ok' : 'fout', waarde: veilig ? 'gelaagd' : 'niet gelaagd', uitleg: 'NBN S 23-002 (te bevestigen per project).' });
  uit.push({ titel: 'Isolatie raampartij (EPB)', toestand: uw <= 1.5 ? 'ok' : 'let-op', waarde: `Uw ${getal(uw, 2)} W/m²K` });
  if (p.keuzes.inmeting === true) {
    const afw = num(a.meet_afwijking);
    uit.push({ titel: 'Inmeting op de werf', toestand: afw > 10 ? 'let-op' : 'ok', waarde: `verschil ${getal(afw)} mm`, uitleg: `Bestelmaat: ${getal(num(a.raam_b))} × ${getal(rh)} mm.` });
  } else uit.push({ titel: 'Inmeting op de werf', toestand: 'let-op', waarde: 'nog niet gebeurd', uitleg: 'Maten onder voorbehoud van inmeting.' });
  if (muren && num(a.opening_b) > 3000) uit.push({ titel: 'Stalen ligger', toestand: 'let-op', waarde: `${getal(num(a.ligger_lm), 2)} m`, uitleg: 'Stabiliteitsberekening laten maken.' });
  if (muren) uit.push({ titel: 'Vergunning', toestand: num(a.dak_m2) > 40 ? 'let-op' : 'ok', waarde: `${getal(num(a.dak_m2), 1)} m²` });
  return uit;
}

export function techniek(p: Positie, r: ConfiguratieResultaat): [string, string][] {
  const a = r.afgeleid;
  if (isVastModel(p.model)) {
    // Alles wat het model uitrekent en een naam heeft: palen, overspanning, profielen (een voorstelling), oppervlaktes.
    return VASTE_MODELLEN[p.model].model.afgeleid.flatMap((x): [string, string][] => {
      const w = a[x.code];
      // Een nul zegt hier niets (helling 0° bij een plat dak, 0 palen onder een luifel die er niet is).
      if (!x.label || w === null || w === undefined || w === '' || w === 0) return [];
      const eenheid = /\((cm|m²|graden)\)$/.exec(x.label)?.[1];
      const label = x.label.replace(/ \((cm|m²|graden)\)$/, '');
      return [[label, typeof w === 'number' ? `${getal(w, w % 1 ? 1 : 0)}${eenheid === 'graden' ? '°' : eenheid ? ` ${eenheid}` : ''}` : String(w)]];
    });
  }
  if (p.model === 'AANBOUW') {
    return [
      ['Raampartij (b × h)', `${getal(num(a.raam_b))} × ${getal(num(a.raam_h))} mm`],
      ['Vleugels', `${getal(num(a.n))} × ${getal(num(a.vleugel_b))} mm`],
      ['Gewicht per vleugel', `${getal(num(a.vleugel_kg))} kg`],
      ['Glasoppervlakte', `${getal(num(a.glas_m2), 2)} m²`],
      ['Uw raampartij', `${getal(num(a.uw), 2)} W/m²K`],
      ['Levertermijn', `± ${getal(num(a.levertermijn))} weken`],
    ];
  }
  if (p.model === 'POORT') {
    return [
      ['Maat (b × h)', `${getal(num(p.keuzes.breedte))} × ${getal(num(p.keuzes.hoogte))} mm`],
      ['Secties', `${getal(num(a.ns))} × ${getal(num(a.sh))} mm hoog`],
      ['Oppervlakte', `${getal(num(a.poort_m2), 2)} m²`],
    ];
  }
  const ongelijk = a.raster_vrij === true && num(a.n) >= 2;
  const t: [string, string][] = [
    ['Maat (b × h)', `${getal(num(p.keuzes.breedte))} × ${getal(num(p.keuzes.hoogte))} mm`],
    ['Vakken', ongelijk ? `${[a.kb1, a.kb2, a.kb3, a.kb4].slice(0, num(a.n)).map((x) => getal(num(x))).join(' + ')} mm breed` : `${getal(num(a.n))} × ${getal(num(a.vb))} mm breed`],
    ['Opendraaiende vleugels', getal(num(a.beweeg))],
    ['Glas per vak', `${getal(num(a.gb))} × ${getal(num(a.gh))} mm`],
    ['Glasoppervlakte', `${getal(num(a.glas_m2), 2)} m²`],
    ['Gewicht zwaarste vleugel', `${getal(num(a.vleugel_kg))} kg`],
    ['Ug glas / Uf profiel', `${getal(num(eigenschap(p, 'glas', 'ug')), 1)} / ${getal(num(eigenschap(p, 'profiel', 'uf')), 1)} W/m²K`],
    ['Uw', `${getal(num(a.uw), 2)} W/m²K (ψ ${getal(num(a.psi), 2)})`],
    ['Glasmaat per vak', `${getal(num(a.glasmaat_b))} × ${getal(num(a.glasmaat_h))} mm`],
    ['Levertermijn', `± ${getal(num(a.levertermijn))} weken`],
  ];
  if (a.heeft_stijl === true) t.push(['Statiek tussenstijl', `${getal(num(a.i_nodig), 1)} / ${getal(num(a.i_aanwezig), 1)} cm⁴ (nodig / aanwezig)`]);
  if (num(a.zon_kast) > 0) t.push(['Zonweringskast', `${getal(num(a.zon_kast))} mm boven het raam`]);
  if (num(a.zon_n) >= 2) t.push(['Screens naast elkaar', `${[a.zb1, a.zb2, a.zb3].slice(0, num(a.zon_n)).map((b) => getal(num(b))).join(' + ')} mm, met ${num(a.zon_n) - 1} middengeleider${num(a.zon_n) > 2 ? 's' : ''}`]);
  if (a.vent_toestel === true) t.push(['Raamventilator', `${getal(num(a.vent_b))} mm breed, in een opzetkast van ${getal(num(a.vent_h))} mm hoog bovenop het kader (binnen, over de hele breedte)`]);
  return t;
}

/** Wat niet in een vast model zit (de modellen zeggen het zelf in hun uitleg). */
const NIET_IN_MODEL: Record<VastModelCode, string[]> = {
  OVERKAPPING: ['Fundering en onderbouw: de vloer staat er alleen voor het beeld', 'Vergunning: na te kijken bij de gemeente', 'Nazicht door een houtbouwer of ingenieur: de maten zijn een voorstel', 'Plaatsing en levering: nog te bepalen'],
  TUINHUIS: ['Fundering: alleen de vloerplaat staat erin', 'Elektriciteit, water en binnenafwerking', 'Vergunning: na te kijken bij de gemeente', 'Nazicht door een houtbouwer: de opbouw is een voorstel', 'Plaatsing en levering: nog te bepalen'],
  LOODS: ['Fundering en vloerplaat: alleen voor het beeld', 'Berekening door een staalbouwer of ingenieur: de profielen zijn een voorstelling', 'Omgevingsvergunning', 'Plaatsing en levering: nog te bepalen'],
  BALUSTRADE: ['Berekening en bevestiging door een staalbouwer', 'Het terras in de 3D: alleen voor het beeld', 'Plaatsing: nog te bepalen'],
  LUIFEL: ['Berekening en bevestiging in de gevel door een staalbouwer', 'De gevel en de deur in de 3D: alleen voor het beeld', 'Plaatsing: nog te bepalen'],
  STAALTRAP: ['Berekening en bevestiging aan de vloeren door een staalbouwer', 'Het trapgat, de vloer en de muur in de 3D: alleen voor het beeld', 'Plaatsing: nog te bepalen'],
};

export function inbegrepen(p: Positie, r: ConfiguratieResultaat): { wel: string[]; niet: string[] } {
  // Een vast model: de opbouw van wand, dak en vloer; de hoeveelheden staan in de meetstaat.
  if (isVastModel(p.model)) return { wel: [...vastModelOpbouw(p.model, r), 'De draagstructuur en alle hoeveelheden: zie de meetstaat'], niet: NIET_IN_MODEL[p.model] };
  const wel = r.stuklijst.filter((s) => !alleenPrijs(s.omschrijving)).map((s) => s.omschrijving);
  const niet: string[] = [];
  if (p.keuzes.montage !== true) niet.push('Plaatsing');
  if (p.model === 'POORT') return { wel: ['Sectionale garagepoort volgens de tekening'], niet: ['Plaatsing, motor en aansluiting: nog te bepalen'] };
  if (p.model === 'RAAM') {
    if (p.keuzes.situatie === 'renovatie' && p.keuzes.afwerking !== true) niet.push('Afwerking dagkanten binnen');
    if (p.keuzes.zonwering === 'geen') niet.push('Zonwering');
    niet.push('Elektrische aansluiting zonwering (elektricien)');
    if (r.afgeleid.vent_toestel === true) niet.push('Elektrische aansluiting raamventilator (elektricien)');
    niet.push('Schilderwerk en silicone binnen');
  } else {
    if (p.keuzes.afbraak !== true) niet.push('Uitbraak en afvoer');
    niet.push('Architect, stabiliteit en EPB-verslag', 'Binnenafwerking, elektriciteit, verwarming');
  }
  return { wel, niet };
}

/** Kenmerken die alleen over de prijs gaan (het btw-tarief van de aanbouw): niet in het formulier en niet in een samenvatting, zolang er geen prijzen getoond worden. */
const PRIJSKENMERKEN = new Set(['btw_regime']);
/** Kenmerken die alleen het beeld zetten (de zonwering half of helemaal neer in de 3D, ronde 11b): nooit in een samenvatting. */
const BEELDKENMERKEN = new Set(['zon_stand']);

/**
 * De samenvatting van een positie (kenmerk: keuze), zonder wat alleen over de prijs of het beeld gaat. Een raam zonder de
 * keuzes van ronde 11b heeft exact de regels van vroeger (ook het akkoord en het meerwerk van de werf vergelijken deze
 * regels): de ventilatie heet "Ventilatierooster (zelfregelend): ja/nee" zoals toen, een raamventilator staat als
 * "Ventilatie op het raam: Raamventilator …", en het aantal screens staat er alleen als het er meer dan één zijn.
 */
export function samenvatting(r: ConfiguratieResultaat): string[] {
  const soort = r.kenmerken.find((k) => k.code === 'ventilatie_soort');
  const raam = r.product === 'RAAM';
  return r.kenmerken.filter((k) => k.zichtbaar && (PRIJZEN || !PRIJSKENMERKEN.has(k.code)) && !BEELDKENMERKEN.has(k.code)).flatMap((k) => {
    if (raam && (k.code === 'ventilatie_soort' || (k.code === 'screens' && k.waarde === 's1'))) return [];
    if (raam && k.code === 'rooster') {
      return r.afgeleid.vent_toestel === true ? [`${k.label}: ${soort?.weergave ?? 'Raamventilator'}`] : [`Ventilatierooster (zelfregelend): ${k.waarde === true ? 'ja' : 'nee'}`];
    }
    return [`${k.label}: ${k.weergave}`];
  });
}

function offertetekst(p: Positie, r: ConfiguratieResultaat): string {
  const ib = inbegrepen(p, r);
  return [
    `${p.code} ${p.naam} (${p.aantal} st.)`,
    ...samenvatting(r).map((s) => `- ${s}`),
    '', 'Inbegrepen:', ...ib.wel.map((x) => `- ${x}`),
    '', 'Niet inbegrepen:', ...ib.niet.map((x) => `- ${x}`),
    ...(!PRIJZEN || zonderPrijs(p) ? [] : ['', `Prijs: ${eur(r.prijs.brutoprijsExcl)} per stuk excl. btw`]),
  ].join('\n');
}

// ---------- formulier ----------
const velden = new Map<string, { veld: HTMLElement; fout: HTMLElement; herstel: HTMLElement; update: (r: ConfiguratieResultaat) => void }>();

/** Kenmerken van de indeling die zichtbaar blijven; de rest (instelling per vak) zit achter "Meer opties". */
const SNEL = new Set(['roeden']);
let meerOpen = false;

/** Voor welke positie het formulier gebouwd is (een andere positie of een ander model vraagt een nieuw formulier). */
let formulierVan = '';

function bouwFormulier(p: Positie) {
  formulierVan = `${p.id}:${p.model}`;
  const form = $('#p-formulier');
  form.replaceChildren();
  velden.clear();
  const model = MODELLEN[p.model].model;
  model.stappen.forEach((stap, n) => {
    const sectie = el('section', { class: 'stap', 'aria-labelledby': `pst-${stap.code}`, 'data-stap': stap.code });
    const kop = el('h2', { id: `pst-${stap.code}` });
    kop.append(el('span', { class: 'stapnr' }, String(n + 1)), document.createTextNode(stap.label));
    sectie.append(kop);
    const kenmerken = model.kenmerken.filter((k) => k.stap === stap.code && (PRIJZEN || !PRIJSKENMERKEN.has(k.code)));
    if (p.model === 'RAAM' && stap.code === 'indeling') {
      // De snelle weg: een indeling kiezen met één tik. De instelling per vak blijft bereikbaar onder "Meer opties".
      sectie.append(bouwIndelingen());
      const meer = el('details', { class: 'meer-opties', id: 'p-meer-opties' });
      meer.append(el('summary', {}, 'Meer opties: per vak, bovenlicht, onderaan, uitzicht'));
      if (meerOpen) meer.setAttribute('open', '');
      meer.addEventListener('toggle', () => { meerOpen = meer.hasAttribute('open'); });
      for (const k of kenmerken) (SNEL.has(k.code) ? sectie : meer).append(bouwVeld(p, k));
      sectie.append(meer);
    } else if (isVastModel(p.model)) {
      // Vast model: wat een eerste gesprek nodig heeft meteen, het detail van deze stap onder "Meer opties".
      const detail = new Set(VASTE_MODELLEN[p.model].meer);
      for (const k of kenmerken.filter((x) => !detail.has(x.code))) sectie.append(bouwVeld(p, k));
      const meer = kenmerken.filter((x) => detail.has(x.code));
      if (meer.length) {
        const vak = el('details', { class: 'meer-opties', 'data-meer': stap.code });
        // "Poort 1: breedte" en "Poort 2: breedte" zijn samen "breedte".
        const namen = [...new Set(meer.map((x) => x.label.replace(/^Poort \d: /, '').toLowerCase()))];
        vak.append(el('summary', {}, `Meer opties: ${namen.join(', ')}`));
        if (meerOpenStap.has(stap.code)) vak.setAttribute('open', '');
        vak.addEventListener('toggle', () => { if (vak.hasAttribute('open')) meerOpenStap.add(stap.code); else meerOpenStap.delete(stap.code); });
        for (const k of meer) vak.append(bouwVeld(p, k));
        sectie.append(vak);
      }
    } else {
      // Raam: `rooster` en `ventilatie_soort` staan samen als één keuze *Ventilatie op het raam* (geen, rooster, raamventilator).
      for (const k of kenmerken) if (!(p.model === 'RAAM' && k.code === 'ventilatie_soort')) sectie.append(p.model === 'RAAM' && k.code === 'rooster' ? ventilatieVeld() : bouwVeld(p, k));
    }
    form.append(sectie);
  });
}

/** Welke "Meer opties" van een vast model open staan (per stap): ze blijven open als het formulier opnieuw opgebouwd wordt. */
const meerOpenStap = new Set<string>();

// ---------- kant-en-klare indelingen (tegels met een tekening) ----------
const tegelSvg = new Map<string, string>();
/** Kleine tekening van een indeling, in neutrale kleuren (één keer berekend). */
function indelingTekening(i: Indeling): string {
  let svg = tegelSvg.get(i.code);
  if (svg === undefined) {
    const t = berekenRaam(pasIndelingToe(raamKeuzes({ kleur_buiten: 'antraciet', kleur_binnen: 'zelfde', vensterbank: 'geen', breedte: i.breedte, hoogte: i.hoogte }), i)).tekening;
    svg = t ? tekenSvg({ ...t, maatlijnen: [] }, { breedtePx: 120, lijnkleur: '#2b2b28' }) : '';
    tegelSvg.set(i.code, svg);
  }
  return svg;
}

const SOORTNAAM: Record<string, string> = { raam: 'Raam', terrasdeur: 'Terrasdeur', voordeur: 'Voordeur', schuif: 'Schuifraam', hefschuif: 'Hef-schuifdeur', vouwwand: 'Vouwwand', glaswand: 'Glaswand' };

/** Hoogste bovenkant van een opening in een muur van de plattegrond (cm): 15 cm onder de muurhoogte, voor de latei. */
const hoogsteBovenkant = (muurhoogte: number) => muurhoogte - 15;

function kiesIndeling(i: Indeling) {
  wijzig('positie', (t) => {
    const p = t.posities.find((x) => x.id === huidigId);
    if (!p || p.model !== 'RAAM') return;
    const oud = String(p.keuzes.type ?? 'raam');
    let nieuweKeuzes = pasIndelingToe(p.keuzes, i);
    // Staat de positie in de plattegrond en is de nieuwe indeling breder dan de vrije muur, dan zo breed als er plaats is
    // (als de indeling dat toelaat). De opening schuift zelf op tot ze weer op haar muur staat (staat.ts).
    const opening = t.plan.openingen.find((x) => x.positie === p.id);
    const vrij = opening ? vrijeMuur(opening) : undefined;
    if (vrij && typeof nieuweKeuzes.breedte === 'number' && nieuweKeuzes.breedte > (vrij.tot - vrij.van) * 10) {
      const smaller = { ...nieuweKeuzes, breedte: Math.floor(vrij.tot - vrij.van) * 10 };
      if (!berekenRaam(smaller).meldingen.some((m) => m.ernst === 'fout')) nieuweKeuzes = smaller;
    }
    // Hetzelfde in de hoogte: boven de opening blijft er plaats voor de latei (de controle van de plattegrond).
    const top = opening ? hoogsteBovenkant(t.plan.muurhoogte) * 10 - (nieuweKeuzes.type === 'raam' && typeof nieuweKeuzes.borstwering === 'number' ? nieuweKeuzes.borstwering : 0) : undefined;
    if (top !== undefined && typeof nieuweKeuzes.hoogte === 'number' && nieuweKeuzes.hoogte > top) {
      const lager = { ...nieuweKeuzes, hoogte: Math.floor(top / 10) * 10 };
      if (!berekenRaam(lager).meldingen.some((m) => m.ernst === 'fout')) nieuweKeuzes = lager;
    }
    p.keuzes = nieuweKeuzes;
    // Een naam die met de oude soort begint ("Raam leefruimte") volgt de nieuwe soort; een eigen naam blijft.
    const nieuw = String(p.keuzes.type ?? 'raam');
    const kop = Object.values(SOORTNAAM).find((n) => p.naam === n || p.naam.startsWith(`${n} `));
    if (nieuw !== oud && kop && SOORTNAAM[nieuw]) p.naam = SOORTNAAM[nieuw] + p.naam.slice(kop.length);
  });
  const p = huidig();
  if (p) {
    $<HTMLInputElement>('#p-naam').value = p.naam;
    const optie = $<HTMLSelectElement>('#p-kies').selectedOptions[0];
    if (optie) optie.textContent = `${p.code} · ${p.naam}`;
  }
}

function bouwIndelingen(): HTMLElement {
  const vak = el('div', { class: 'indelingen', role: 'group', 'aria-label': 'Kies een indeling' });
  vak.append(el('p', { class: 'hulp' }, 'Tik op een indeling. De maat, het glas en het profiel passen zich aan als dat nodig is; verfijnen kan onder "Meer opties".'));
  for (const groep of [...new Set(INDELINGEN.map((i) => i.groep))]) {
    vak.append(el('h3', { class: 'indeling-groep' }, groep));
    const rij = el('div', { class: 'indeling-rij' });
    for (const i of INDELINGEN.filter((x) => x.groep === groep)) {
      const knop = el('button', { type: 'button', class: 'indeling', 'data-indeling': i.code, 'aria-pressed': 'false' });
      const beeld = el('span', { class: 'indeling-beeld', 'aria-hidden': 'true' });
      beeld.innerHTML = indelingTekening(i);
      knop.append(beeld, el('span', { class: 'indeling-naam' }, i.label));
      knop.addEventListener('click', () => kiesIndeling(i));
      rij.append(knop);
    }
    vak.append(rij);
  }
  return vak;
}

/** De indeling waarmee een soort begint als je ze in de stap "Soort" kiest (de eerste tegel van die soort). */
const EERSTE_INDELING: Record<string, string> = { raam: 'enkel_dk', terrasdeur: 'terrasdeur', voordeur: 'voordeur', schuif: 'schuif2', hefschuif: 'hefschuif3', vouwwand: 'vouwwand4', glaswand: 'glaswand' };

function zet(code: string, w: unknown) {
  // Een andere soort kiezen is een andere indeling kiezen: zo passen maat, glas en profiel zich meteen aan
  // (een raam van 1,2 m dat een hef-schuifdeur wordt, zou anders vol fouten staan).
  const p = huidig();
  const start = p?.model === 'RAAM' && code === 'type' && p.keuzes.type !== w ? INDELINGEN.find((i) => i.code === EERSTE_INDELING[String(w)]) : undefined;
  if (start) { kiesIndeling(start); return; }
  hersteld = [];
  wijzig('positie', (t) => {
    const p = t.posities.find((x) => x.id === huidigId);
    if (!p) return;
    p.keuzes[code] = w as never;
    // Een vast model: wat door deze keuze niet meer kan (EPDM bij een zadeldak, een berging breder dan de carport), wordt
    // vanzelf de eerste keuze die wel kan; de melding zegt wat er veranderde.
    if (isVastModel(p.model)) {
      const uit = herstelKeuzes(MODELLEN[p.model].model, p.keuzes, MODELLEN[p.model].prijslijst);
      p.keuzes = uit.keuzes;
      hersteld = uit.hersteld;
    }
  });
}

function bouwVeld(p: Positie, k: Kenmerk): HTMLElement {
  const veld = el('div', { class: `veld veld-${k.type}`, 'data-kenmerk': k.code });
  const id = `pk-${k.code}`;
  const fout = el('p', { class: 'veldfout', role: 'alert' });
  const herstel = el('p', { class: 'veldherstel', role: 'status' });
  let update: (r: ConfiguratieResultaat) => void = () => {};
  if (k.type === 'getal') {
    const rij = el('div', { class: 'getalrij' });
    const schuif = el('input', { type: 'range', 'aria-label': `${k.label} (schuifbalk)`, step: String(k.stapgrootte ?? 1) }) as HTMLInputElement;
    const invoer = el('input', { type: 'number', id, inputmode: 'numeric', step: String(k.stapgrootte ?? 1) }) as HTMLInputElement;
    const bereik = el('span', { class: 'bereik' });
    invoer.value = String(p.keuzes[k.code] ?? '');
    invoer.addEventListener('change', () => zet(k.code, invoer.value === '' ? null : Number(invoer.value)));
    schuif.addEventListener('input', () => { invoer.value = schuif.value; });
    schuif.addEventListener('change', () => zet(k.code, Number(schuif.value)));
    rij.append(schuif, invoer, el('span', { class: 'eenheid' }, k.eenheid ?? ''));
    veld.append(el('label', { for: id }, k.label), rij, bereik);
    if (k.helptekst) veld.append(el('p', { class: 'hulp' }, k.helptekst));
    update = (r) => {
      const s = r.kenmerken.find((x) => x.code === k.code)!;
      if (s.min !== undefined) schuif.min = invoer.min = String(s.min);
      if (s.max !== undefined) schuif.max = invoer.max = String(s.max);
      const w = huidig()?.keuzes[k.code];
      if (typeof w === 'number') { schuif.value = String(w); if (document.activeElement !== invoer) invoer.value = String(w); }
      bereik.textContent = s.min !== undefined && s.max !== undefined ? `${getal(s.min)} – ${getal(s.max)} ${k.eenheid ?? ''}` : '';
    };
  }
  if (k.type === 'keuze') {
    // Kleurwaaier: veel kleuren als een raster van stalen met het RAL-nummer; de naam van de gekozen kleur staat eronder.
    const waaier = k.keuzes.filter((kz) => typeof kz.eigenschappen?.kleur === 'string' && kz.eigenschappen.kleur).length > 8;
    const groep = el('fieldset', { class: waaier ? 'keuzes waaier' : 'keuzes' });
    groep.append(el('legend', {}, k.label));
    const gekozen = el('p', { class: 'waaier-keuze', 'aria-live': 'polite' });
    const knoppen = new Map<string, { knop: HTMLInputElement; tegel: HTMLElement; reden: HTMLElement }>();
    for (const kz of k.keuzes) {
      const kid = `${id}-${kz.code}`;
      const kleur = kz.eigenschappen?.kleur;
      const metKleur = typeof kleur === 'string' && !!kleur;
      const tegel = el('label', { class: waaier && metKleur ? 'tegel staaltegel' : 'tegel', for: kid, title: kz.label });
      const knop = el('input', { type: 'radio', name: id, id: kid, value: kz.code }) as HTMLInputElement;
      knop.addEventListener('change', () => zet(k.code, kz.code));
      tegel.append(knop);
      if (metKleur) {
        const staal = el('span', { class: 'staal', 'aria-hidden': 'true' });
        staal.style.background = kleur;
        tegel.append(staal);
      }
      // Openingssymbool als klein pictogram bij de vakkeuzes, en de verdeling bij de kleinhouten.
      if (/^vak\d$/.test(k.code)) tegel.append(symbool(kz.code));
      if (k.code === 'roeden') tegel.append(roedenBeeld(num(kz.eigenschappen?.kol) || 1, num(kz.eigenschappen?.rij) || 1));
      const reden = el('span', { class: 'reden' });
      const ral = /RAL (\d{4})/.exec(kz.label)?.[1];
      // Onder het staal: het RAL-nummer, of bij een houtkleur het eerste woord van de naam.
      if (waaier && metKleur) tegel.append(el('span', { class: 'ral', 'aria-hidden': 'true' }, ral ?? kz.label.split(' ')[0]!.toLowerCase()), el('span', { class: 'verborgen' }, kz.label), reden);
      else tegel.append(el('span', {}, kz.label), reden);
      groep.append(tegel);
      knoppen.set(kz.code, { knop, tegel, reden });
    }
    veld.append(groep);
    if (waaier) veld.append(gekozen);
    if (k.helptekst) veld.append(el('p', { class: 'hulp' }, k.helptekst));
    update = (r) => {
      const s = r.kenmerken.find((x) => x.code === k.code)!;
      const w = huidig()?.keuzes[k.code];
      for (const ks of s.keuzes ?? []) {
        const kn = knoppen.get(ks.code)!;
        kn.knop.checked = w === ks.code;
        kn.tegel.classList.toggle('onbeschikbaar', !ks.beschikbaar);
        kn.reden.textContent = ks.beschikbaar ? '' : ks.reden ?? 'niet mogelijk';
        kn.tegel.title = ks.beschikbaar ? ks.label : `${ks.label} (${ks.reden ?? 'niet mogelijk'})`;
      }
      gekozen.textContent = `Gekozen: ${s.weergave}`;
    };
  }
  if (k.type === 'janee') {
    const label = el('label', { class: 'schakelaar', for: id });
    const vink = el('input', { type: 'checkbox', id, role: 'switch' }) as HTMLInputElement;
    vink.addEventListener('change', () => zet(k.code, vink.checked));
    label.append(vink, el('span', { class: 'schuifje', 'aria-hidden': 'true' }), el('span', {}, k.label));
    veld.append(label);
    if (k.helptekst) veld.append(el('p', { class: 'hulp' }, k.helptekst));
    update = () => { vink.checked = huidig()?.keuzes[k.code] === true; };
  }
  veld.append(fout, herstel);
  velden.set(k.code, { veld, fout, herstel, update });
  return veld;
}

/**
 * *Ventilatie op het raam* (ronde 11b): één keuze uit drie, gebouwd op twee kenmerken van het model. `rooster` zegt óf er
 * ventilatie op het raam staat (zoals vroeger: oude projecten met `rooster: true` blijven een rooster), `ventilatie_soort`
 * welke. Het veld staat onder de code `rooster`, zodat het verdwijnt waar het model het verbergt (een voordeur).
 */
function ventilatieVeld(): HTMLElement {
  const veld = el('div', { class: 'veld veld-keuze', 'data-kenmerk': 'rooster' });
  const fout = el('p', { class: 'veldfout', role: 'alert' });
  const herstel = el('p', { class: 'veldherstel', role: 'status' });
  const groep = el('fieldset', { class: 'keuzes' });
  groep.append(el('legend', {}, 'Ventilatie op het raam'));
  const OPTIES: [string, string][] = [['geen', 'Geen'], ['rooster', 'Zelfregelend rooster'], ['ventilator', 'Raamventilator']];
  const knoppen = new Map<string, HTMLInputElement>();
  for (const [w, label] of OPTIES) {
    const kid = `pk-ventilatie-${w}`;
    const tegel = el('label', { class: 'tegel', for: kid, title: label });
    const knop = el('input', { type: 'radio', name: 'pk-ventilatie', id: kid, value: w }) as HTMLInputElement;
    knop.addEventListener('change', () => {
      hersteld = [];
      wijzig('positie', (t) => {
        const x = t.posities.find((y) => y.id === huidigId);
        if (!x) return;
        x.keuzes.rooster = w !== 'geen';
        if (w === 'geen') delete x.keuzes.ventilatie_soort;
        else x.keuzes.ventilatie_soort = w;
      });
    });
    tegel.append(knop, el('span', {}, label));
    groep.append(tegel);
    knoppen.set(w, knop);
  }
  veld.append(groep, el('p', { class: 'hulp' }, 'Luchttoevoer bovenaan het raam. Een raamventilator is een toestel in een opzetkast bovenop het kader (binnen; buiten een rooster); het vraagt een elektrische aansluiting en, zonder zonweringskast, een opening die 10 cm hoger is.'), fout, herstel);
  const update = () => {
    const k = huidig()?.keuzes;
    const nu = k?.rooster !== true ? 'geen' : k.ventilatie_soort === 'ventilator' ? 'ventilator' : 'rooster';
    for (const [w, knop] of knoppen) knop.checked = w === nu;
  };
  velden.set('rooster', { veld, fout, herstel, update });
  return veld;
}

/** Klein pictogram van een openingssymbool (zelfde afspraak als de tekening). */
function symbool(code: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 20 26');
  s.setAttribute('class', 'symbool');
  s.setAttribute('aria-hidden', 'true');
  const pad = (d: string, streep = false) => {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '1.4');
    if (streep) p.setAttribute('stroke-dasharray', '2 1.5');
    s.append(p);
  };
  pad('M1 1 H19 V25 H1 Z');
  if (code === 'draai_l' || code === 'draaikip_l') pad('M18 2 L2 13 L18 24');
  if (code === 'draai_r' || code === 'draaikip_r') pad('M2 2 L18 13 L2 24');
  if (code === 'kip' || code.startsWith('draaikip')) pad('M2 2 L10 24 L18 2', true);
  return s as SVGSVGElement;
}

/** Klein pictogram van een verdeling met kleinhouten: kol × rij ruiten. */
function roedenBeeld(kol: number, rij: number): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 20 26');
  s.setAttribute('class', 'symbool');
  s.setAttribute('aria-hidden', 'true');
  let d = 'M1 1 H19 V25 H1 Z';
  for (let i = 1; i < kol; i++) d += ` M${1 + (18 * i) / kol} 1 V25`;
  for (let i = 1; i < rij; i++) d += ` M1 ${1 + (24 * i) / rij} H19`;
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', d);
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '1.4');
  s.append(p);
  return s as SVGSVGElement;
}

// ---------- tonen ----------
export function toonPositie(id?: string) {
  if (id) huidigId = id;
  const p = huidig();
  $('#p-leeg').hidden = !!p;
  $('#p-inhoud').hidden = !p;
  if (!p) return;
  huidigId = p.id;
  // Keuzelijst met posities.
  const lijst = $<HTMLSelectElement>('#p-kies');
  lijst.replaceChildren(...toestand().posities.map((x) => el('option', { value: x.id }, `${x.code} · ${x.naam}`)));
  lijst.value = p.id;
  $<HTMLInputElement>('#p-naam').value = p.naam;
  $<HTMLInputElement>('#p-aantal').value = String(p.aantal);
  const o = openingVan(p);
  $('#p-naarplan').hidden = !o;
  // Doorloop B7: een raam, deur of poort uit het overzicht staat nog niet in de woning: dat zeggen, met een knop.
  $('#p-inwoning-vak').hidden = !kanInWoning(p);
  $('#p-inwoning-melding').textContent = '';
  // Een aanbouw (model) kan als ruimte tegen een woning in de plattegrond, om er vrij aan verder te tekenen.
  $('#p-vrij').hidden = p.model !== 'AANBOUW';
  $<HTMLButtonElement>('#p-vrij').disabled = toestand().plan.ruimtes.length > 0;
  $('#p-vrij').title = toestand().plan.ruimtes.length ? 'Kan alleen in een project zonder plattegrond: hier staat er al een.' : 'Zet de aanbouw als ruimte tegen een bestaande woning in de plattegrond (met raampartij, dak, koepel en gevel).';
  $('#p-model').textContent = MODELLEN[p.model].label;
  if (formulierVan !== `${p.id}:${p.model}`) hersteld = [];
  bouwFormulier(p);
  // Een vast model heeft geen vooraanzicht: meteen in 3D, met Afgewerkt / Constructie in de plaats van de tabs.
  const vast = isVastModel(p.model);
  $('#p-weergave-tabs').hidden = vast;
  $('#p-bouwweergave').hidden = !vast;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-p-bouw]')) b.setAttribute('aria-pressed', String(b.dataset.pBouw === bouwWeergave));
  $('#p-voorkaart').classList.toggle('vast3d', vast);
  if (vast) zetWeergave('3d');
  else zetKnoppen();
  herbereken();
}

export function herbereken() {
  const p = huidig();
  if (!p || $('#p-inhoud').hidden) return;
  // De positie van het formulier bestaat niet meer (verwijderd, of een aanbouw die in de plattegrond kwam): opnieuw opbouwen.
  if (formulierVan !== `${p.id}:${p.model}`) { toonPositie(p.id); return; }
  const r = resultaat(p);
  for (const s of r.kenmerken) {
    const v = velden.get(s.code);
    if (!v) continue;
    v.veld.hidden = !s.zichtbaar;
    v.update(r);
    const f = r.meldingen.filter((m) => m.kenmerk === s.code);
    v.fout.textContent = f.map((m) => m.melding).join(' ');
    v.veld.classList.toggle('heeft-fout', f.length > 0);
    v.herstel.textContent = hersteld.filter((h) => h.kenmerk === s.code).map((h) => h.melding).join(' ');
  }
  for (const sectie of document.querySelectorAll<HTMLElement>('#p-formulier .stap')) {
    sectie.hidden = !sectie.querySelector('.indelingen') && ![...sectie.querySelectorAll<HTMLElement>('.veld')].some((v) => !v.hidden);
  }
  // Meer opties van een vast model: weg als er niets in te kiezen valt; open als er een fout of een omzetting in staat.
  for (const vak of document.querySelectorAll<HTMLElement>('#p-formulier .meer-opties[data-meer]')) {
    vak.hidden = ![...vak.querySelectorAll<HTMLElement>('.veld')].some((v) => !v.hidden);
    if (!vak.hasAttribute('open') && vak.querySelector('.veld.heeft-fout:not([hidden]), .veldherstel:not(:empty)')) vak.setAttribute('open', '');
  }
  const aangepast = $('#p-aangepast');
  aangepast.hidden = !hersteld.length;
  aangepast.textContent = hersteld.length ? `Vanzelf aangepast: ${hersteld.map((h) => h.melding).join(' ')}` : '';
  // De tegel van de huidige indeling aanduiden; een fout in een verborgen veld opent "Meer opties".
  const gekozen = p.model === 'RAAM' ? indelingVan(p.keuzes)?.code : undefined;
  for (const b of document.querySelectorAll<HTMLButtonElement>('#p-formulier [data-indeling]')) b.setAttribute('aria-pressed', String(b.dataset.indeling === gekozen));
  const meer = document.getElementById('p-meer-opties');
  if (meer && !meer.hasAttribute('open') && meer.querySelector('.veld.heeft-fout:not([hidden])')) meer.setAttribute('open', '');
  $('#p-tekening').innerHTML = r.tekening ? tekenSvg(r.tekening, { breedtePx: 640, lijnkleur: '#2b2b28', maatkleur: '#34505f' }) : '';
  if (weergave === '3d') toon3D(p, r);

  const lijst = controles(p, r);
  // Staat de positie in de plattegrond: past de opening nog op haar muur, tussen de hoeken en de openingen ernaast?
  const opening = openingVan(p), vrij = opening ? vrijeMuur(opening) : undefined;
  if (opening && vrij) {
    const plaats = vrij.tot - vrij.van, past = opening.breedte <= plaats + 0.05;
    lijst.push({ titel: 'Past op de muur in de plattegrond', toestand: past ? 'ok' : 'fout', waarde: `${getal(opening.breedte)} cm / vrije muur ${getal(plaats)} cm`, uitleg: past ? undefined : 'Maak de opening smaller, of maak plaats in de plattegrond.' });
    const bovenkant = opening.borstwering + opening.hoogte, hoogst = hoogsteBovenkant(toestand().plan.muurhoogte);
    if (bovenkant > hoogst + 0.05) lijst.push({ titel: 'Te hoog voor de muur in de plattegrond', toestand: 'fout', waarde: `bovenkant ${getal(bovenkant)} cm / hoogstens ${getal(hoogst)} cm`, uitleg: 'Boven de opening is er plaats nodig voor de latei: maak de opening lager.' });
  }
  $('#p-controles').replaceChildren(...lijst.map(controleLi));
  const nF = lijst.filter((c) => c.toestand === 'fout').length, nL = lijst.filter((c) => c.toestand === 'let-op').length;
  const cs = $('#p-controle-status');
  cs.textContent = nF ? `${nF} te verhelpen` : nL ? `${nL} aandachtspunt${nL === 1 ? '' : 'en'}` : 'alles in orde';
  cs.className = `status ${nF ? 'fout' : nL ? 'let-op' : 'ok'}`;

  const korting = klantKorting();
  const stuk = r.prijs.brutoprijsExcl;
  const geenPrijs = zonderPrijs(p), alleenTonen = MODELLEN[p.model].zonderPrijs === true;
  $('#p-status').textContent = r.geldig ? (geenPrijs || !PRIJZEN ? 'Klaar om te tonen' : 'Klaar voor offerte') : `${r.meldingen.filter((m) => m.ernst === 'fout').length} fout(en)`;
  $('#p-status').className = `status ${r.geldig ? 'ok' : 'fout'}`;
  $('#p-prijskop').textContent = PRIJZEN ? 'Prijs' : 'Status';
  $('#p-prijsdetail').hidden = geenPrijs;
  if (!PRIJZEN) {
    // Zonder prijzen: geen bedrag, ook geen "nog geen prijs".
    $('#p-prijs').textContent = '';
    $('#p-prijs-sub').textContent = '';
  } else if (geenPrijs) {
    // Een model dat alleen toont (nog geen stuklijst) of een raamindeling die de prijsregels nog niet kennen: geen bedrag.
    $('#p-prijs').textContent = 'Nog geen prijs';
    $('#p-prijs-sub').textContent = alleenTonen ? 'dit model toont alleen de tekening en de 3D' : 'deze indeling is nieuw: tekening, 3D en controles kloppen, een prijs volgt later';
  } else if (document.body.classList.contains('klantmodus')) {
    // Voor de klant (particulier): prijs inclusief btw.
    const btw = toestand().meta.btw;
    // Zoals de prijs excl. btw: zonder de korting, die op het offertetotaal komt.
    const incl = stuk * (1 + btw / 100);
    $('#p-prijs').textContent = eur(incl * p.aantal);
    $('#p-prijs-sub').textContent = p.aantal > 1 ? `${p.aantal} × ${eur(incl)} incl. ${btw} % btw` : `incl. ${btw} % btw, per stuk`;
  } else {
    $('#p-prijs').textContent = eur(stuk * p.aantal);
    $('#p-prijs-sub').textContent = p.aantal > 1 ? `${p.aantal} × ${eur(stuk)} excl. btw` : 'excl. btw, per stuk';
  }
  const regels: [string, string][] = [
    ['Kostprijs per stuk', eur(r.prijs.kostprijs)],
    ['Marge', r.prijs.margeProcent === null ? '—' : `${getal(r.prijs.margeProcent, 1)} %`],
  ];
  if (korting) regels.push([`Korting aannemer op de offerte`, `${korting} %`]);
  $('#p-prijsdetail').replaceChildren(...(PRIJZEN ? regels : []).flatMap(([x, y]) => [el('dt', {}, x), el('dd', {}, y)]));
  // Een vast model toont zijn meldingen al als controles.
  const alg = isVastModel(p.model) ? [] : r.meldingen.filter((m) => !m.kenmerk);
  $('#p-meldingen').replaceChildren(...alg.map((m) => el('li', { class: m.ernst }, m.melding)));
  $('#p-meldingen').hidden = !alg.length;
  $('#p-techniek').replaceChildren(...techniek(p, r).flatMap(([x, y]) => [el('dt', {}, x), el('dd', {}, y)]));
  const ib = inbegrepen(p, r);
  $('#p-inbegrepen').replaceChildren(...ib.wel.map((x) => el('li', {}, x)));
  $('#p-niet').replaceChildren(...ib.niet.map((x) => el('li', {}, x)));
  // Glasbestelling per ruit (alleen bij ramen en deuren).
  const ruiten = p.model === 'RAAM' ? ruitenVan(r) : [];
  $('#p-glas-kaart').hidden = !ruiten.length;
  $('#p-glas tbody').replaceChildren(...ruiten.map((g) => {
    const tr = el('tr');
    tr.append(
      el('td', {}, `${p.code}-${g.nr}`), el('td', {}, g.plaats),
      el('td', { class: 'num' }, `${getal(g.dagB)} × ${getal(g.dagH)}`),
      el('td', { class: 'num' }, `${getal(g.falsB)} × ${getal(g.falsH)}`),
      el('td', { class: 'num sterk' }, `${getal(g.b)} × ${getal(g.h)}`),
      el('td', {}, `${g.glas} · ${g.afstandhouder}`),
      el('td', { class: 'num' }, `${getal(g.m2, 2)} m²`), el('td', { class: 'num' }, `${getal(g.kg)} kg`),
    );
    return tr;
  }));
  // Een vast model heeft geen bestellijst maar een meetstaat (hoeveelheden, zonder prijzen).
  const vast = isVastModel(p.model);
  $('#p-stuklijst-kaart').hidden = vast;
  $('#p-meetstaat-kaart').hidden = !vast;
  if (vast) $('#p-meetstaat').replaceChildren(...meetstaatLijst(p.model as VastModelCode, r));
  $('#p-stuklijst tbody').replaceChildren(...r.stuklijst.filter((s) => !alleenPrijs(s.omschrijving)).map((s) => {
    const tr = el('tr');
    const maat = s.lengte !== undefined ? `${getal(s.lengte)}${s.breedte !== undefined ? ` × ${getal(s.breedte)}` : ''}` : '';
    tr.append(el('td', {}, s.omschrijving), el('td', { class: 'code' }, s.artikel), el('td', { class: 'num' }, getal(s.aantal, 2)),
      el('td', { class: 'num' }, maat), el('td', { class: 'num' }, `${getal(s.hoeveelheid, 2)} ${s.eenheid === 'm2' ? 'm²' : s.eenheid}`), el('td', { class: 'num prijsdeel' }, !PRIJZEN || geenPrijs ? '—' : eur(s.kost)));
    return tr;
  }));
}

/** De meetstaat van een vast model per groep (hout, staal, bekleding …), elke regel in gewone taal. */
export function meetstaatLijst(code: VastModelCode, r: ConfiguratieResultaat, aantal = 1): HTMLElement[] {
  const regels = VASTE_MODELLEN[code].meetstaat(r);
  const uit: HTMLElement[] = [];
  for (const groep of [...new Set(regels.map((m) => m.groep))]) {
    const ul = el('ul');
    for (const m of regels.filter((x) => x.groep === groep)) ul.append(el('li', {}, meetstaatTekst(aantal === 1 ? m : vermenigvuldig(m, aantal))));
    uit.push(el('h4', {}, meetstaatGroep(groep)), ul);
  }
  return uit;
}
/** Een regel van de meetstaat voor meer stuks van dezelfde positie. */
const vermenigvuldig = <T extends { aantal?: number; lengte?: number; m2?: number; gewicht?: number }>(m: T, n: number): T => ({
  ...m, ...(m.aantal !== undefined ? { aantal: m.aantal * n } : {}), ...(m.lengte !== undefined ? { lengte: m.lengte * n } : {}),
  ...(m.m2 !== undefined ? { m2: m.m2 * n } : {}), ...(m.gewicht !== undefined ? { gewicht: m.gewicht * n } : {}),
});

export function controleLi(c: Controle): HTMLElement {
  const li = el('li', { class: c.toestand });
  li.append(el('span', { class: 'teken', 'aria-hidden': 'true' }, c.toestand === 'ok' ? '✓' : c.toestand === 'fout' ? '✕' : '!'), el('span', {}, c.titel), el('span', { class: 'waarde' }, c.waarde ?? ''));
  if (c.uitleg) li.append(el('span', { class: 'uitleg' }, c.uitleg));
  return li;
}

/**
 * Toont de 3D van de positie. Een raam, deur of poort komt helemaal in beeld, ook een deur van 2,5 m met een bovenlicht
 * (de kijker kadreert zelf alleen op breedte en diepte), op een rustige achtergrond. Een gebouw (aanbouw, carport,
 * tuinhuis, loods) staat in de omgeving (lucht, gras), zoals de woning; een stuk staalwerk op de rustige achtergrond. Een
 * vast model in de gekozen weergave (afgewerkt of constructie), met zijn hoofdmaten als *Maten* aan staat; een andere
 * positie begint schuin van boven.
 */
function toon3D(p: Positie, r: ConfiguratieResultaat) {
  if (!viewer) return;
  const gebouw = isGebouw(p), vast = isVastModel(p.model);
  viewer.omgeving?.(gebouw ? 'buiten' : 'geen');
  const s = positieScene(p, r, heeftConstructie(p) ? bouwWeergave : 'afgewerkt');
  const lijnen = matenAan ? positieMaatlijnen(p, r) : undefined;
  // Een gebouw of stuk staalwerk met wat lucht rond (een hoog dak of een maat valt anders uit beeld), een raam helemaal in beeld.
  const scene = gebouw || vast ? gebouwKader(s) : passendKader(s);
  const metMaten: Scene3DMetMaten = lijnen?.length ? { ...scene, maatlijnen: lijnen } : scene;
  viewer.toon(metMaten);
  // Een andere positie: een vast model schuin van boven; een raam, deur of garagepoort van buiten (doorloop B6: daar zie je
  // de buitenkleur, de cassettes en de screens; van binnen veranderde er bij die keuzes niets). De knop staat aangeduid.
  if (in3D !== p.id) {
    if (vast) zetStandpunt('schuin');
    else if (!gebouw) zetStandpunt('achter');
    else zetStandpunt(undefined, false);
  }
  in3D = p.id;
  // Alleen een gewoon beeld (afgewerkt, zonder maten) gaat naar het overzicht.
  getekend = vast && bouwWeergave === 'afgewerkt' && !lijnen?.length ? `${p.id}:${JSON.stringify(p.keuzes)}` : '';
}

/**
 * Het standpunt van de 3D (doorloop B6): de kijker erheen zetten en de knop ervan aanduiden, zodat je weet of je van binnen
 * of van buiten kijkt. `draai: false` duidt alleen aan (of niets). Draait de verkoper zelf aan het beeld, dan staat er geen
 * knop meer aangeduid.
 */
let standpuntNu: Standpunt | undefined;
function zetStandpunt(s: Standpunt | undefined, draai = true) {
  standpuntNu = s;
  if (s && draai) viewer?.standpunt(s);
  // Een raam heeft zijn eigen knoppen (Binnen, Buiten …), een gebouw de zijne (Schuin, Voor …): de verborgen tellen niet.
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-p-standpunt]')) b.setAttribute('aria-pressed', String(b.dataset.pStandpunt === s));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-p-zicht]')) b.setAttribute('aria-pressed', String(b.dataset.pZicht === s));
}

/** Zet de weergave (vooraanzicht of 3D) zonder te tekenen; maakt de 3D bij de eerste keer. */
function zetWeergave(w: 'voor' | '3d') {
  weergave = w;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-p-weergave]')) b.setAttribute('aria-pressed', String(b.dataset.pWeergave === w));
  $('#p-tekening').hidden = w !== 'voor';
  $('#p-3d').hidden = w !== '3d';
  $('#p-3d-knoppen').hidden = w !== '3d';
  $('#p-weergavekop').textContent = w === '3d' ? '3D' : 'Vooraanzicht';
  zetKnoppen();
  if (w === '3d') {
    if (viewer === undefined) {
      viewer = maak3D($('#p-3d'));
      // Op een aanraakscherm (tablet) de snelle weergave, zoals de woning; op een computer blijft het zoals het was.
      if (window.matchMedia?.('(pointer: coarse)').matches) viewer?.kwaliteit?.('snel');
      // Voor geautomatiseerde tests en metingen: de kijker van de configurator bereikbaar.
      (window as unknown as { __positie3d?: Viewer3D | null }).__positie3d = viewer;
    }
    viewer?.formaat();
  }
}

/** De knoppen onder de 3D: de standpunten van een raam (binnen, buiten) of van een gebouw en staalwerk, en Maten. */
function zetKnoppen() {
  const p = huidig();
  const gebouw = !!p && (isGebouw(p) || isVastModel(p.model));
  for (const b of document.querySelectorAll<HTMLElement>('[data-p-standpunt]')) b.hidden = gebouw;
  for (const b of document.querySelectorAll<HTMLElement>('[data-p-zicht]')) b.hidden = !gebouw;
  $('#p-maten-label').hidden = !p || !positieMaatlijnen(p)?.length;
  $<HTMLInputElement>('#p-maten').checked = matenAan;
}

function toonWeergave(w: 'voor' | '3d') {
  zetWeergave(w);
  const p = huidig();
  if (w === '3d' && viewer && p) toon3D(p, resultaat(p));
}

/**
 * Het beeld van de 3D van een vast model zoals het laatst in de configurator stond (JPEG als data-URL), voor het overzicht;
 * null als de 3D niet open was, of als de positie sindsdien veranderde.
 */
export function positieBeeld(): { id: string; beeld: string } | null {
  const p = huidig();
  if (!viewer || !p || weergave !== '3d' || getekend !== `${p.id}:${JSON.stringify(p.keuzes)}`) return null;
  const beeld = viewer.beeld?.('image/jpeg', 0.85);
  return beeld ? { id: p.id, beeld } : null;
}

/** De configurator met de 3D in beeld (na de snelstart). */
export function toonPositie3D() {
  // Een vast model staat al in 3D (toonPositie): niet nog eens tekenen.
  const p = huidig();
  if (p && isVastModel(p.model) && weergave === '3d') return;
  toonWeergave('3d');
}

/**
 * De aanbouw (model) als ruimte tegen een bestaande woning in de plattegrond (`aanbouwNaarPlan`): de positie van het
 * model vervalt, de raampartij wordt een raam of deur in de achtergevel, dak, koepel en gevel staan in het plan.
 */
function aanbouwVrijTekenen() {
  const p = huidig();
  if (!p || p.model !== 'AANBOUW' || toestand().plan.ruimtes.length) return;
  const { plan, posities } = aanbouwNaarPlan(p.keuzes);
  // Eigen ids, zodat ze nooit samenvallen met posities die al in het project staan.
  const ids = new Map(posities.map((x) => [x.id, nieuweId('p')]));
  for (const o of plan.openingen) if (o.positie) o.positie = ids.get(o.positie);
  wijzig('plan', (t) => {
    // Losse wanden die er al stonden (een tuinmuur op een plan zonder ruimtes), blijven staan.
    t.plan = t.plan.losseWanden ? { ...plan, losseWanden: t.plan.losseWanden } : plan;
    t.posities = [...t.posities.filter((x) => x.id !== p.id), ...posities.map((x) => ({ ...x, id: ids.get(x.id)! }))];
    t.meta.regels = { ...t.meta.regels, gevel: true, dak: true };
  });
  naarWoning3D();
}

export function startPositie(nav: { naarPlan: (openingId: string) => void; naarOfferte: () => void; naarWoning3D: () => void }) {
  naarPlan = nav.naarPlan;
  naarOfferte = nav.naarOfferte;
  naarWoning3D = nav.naarWoning3D;
  $('#p-vrij').addEventListener('click', aanbouwVrijTekenen);
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-p-weergave]')) b.addEventListener('click', () => toonWeergave(b.dataset.pWeergave as 'voor' | '3d'));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-p-standpunt]')) b.addEventListener('click', () => zetStandpunt(b.dataset.pStandpunt as Standpunt));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-p-zicht]')) b.addEventListener('click', () => zetStandpunt(b.dataset.pZicht as Standpunt));
  // Zelf draaien (slepen of de pijltjes): dan kijk je niet meer vanuit een vast standpunt, en staat er geen knop meer aangeduid.
  const vak3D = $('#p-3d');
  let begin: [number, number] | undefined;
  vak3D.addEventListener('pointerdown', (e) => { begin = [e.clientX, e.clientY]; });
  vak3D.addEventListener('pointermove', (e) => {
    if (!begin || !e.buttons || !standpuntNu) return;
    if (Math.hypot(e.clientX - begin[0], e.clientY - begin[1]) > 12) zetStandpunt(undefined, false);
  });
  vak3D.addEventListener('pointerup', () => { begin = undefined; });
  vak3D.addEventListener('keydown', (e) => { if (standpuntNu && /^Arrow/.test(e.key)) zetStandpunt(undefined, false); });
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-p-bouw]')) {
    b.addEventListener('click', () => {
      bouwWeergave = b.dataset.pBouw === 'constructie' ? 'constructie' : 'afgewerkt';
      for (const x of document.querySelectorAll<HTMLButtonElement>('[data-p-bouw]')) x.setAttribute('aria-pressed', String(x === b));
      const p = huidig();
      if (p && weergave === '3d') toon3D(p, resultaat(p));
    });
  }
  $<HTMLInputElement>('#p-maten').addEventListener('change', (e) => {
    matenAan = (e.target as HTMLInputElement).checked;
    const p = huidig();
    if (p && weergave === '3d') toon3D(p, resultaat(p));
  });
  $<HTMLSelectElement>('#p-kies').addEventListener('change', (e) => toonPositie((e.target as HTMLSelectElement).value));
  $<HTMLInputElement>('#p-naam').addEventListener('change', (e) => wijzig('naam', (t) => {
    const p = t.posities.find((x) => x.id === huidigId);
    if (p) p.naam = (e.target as HTMLInputElement).value.trim() || p.naam;
  }));
  $<HTMLInputElement>('#p-aantal').addEventListener('change', (e) => wijzig('naam', (t) => {
    const p = t.posities.find((x) => x.id === huidigId);
    if (p) p.aantal = Math.max(1, Math.round(Number((e.target as HTMLInputElement).value) || 1));
  }));
  $('#p-terug').addEventListener('click', () => naarOfferte());
  $('#p-inwoning').addEventListener('click', () => {
    const p = huidig();
    const id = p ? zetInWoning(p.id) : undefined;
    if (id) naarPlan(id);
    else $('#p-inwoning-melding').textContent = 'Er is geen vrij stuk buitenmuur dat breed genoeg is: maak plaats in de plattegrond, of maak de positie smaller.';
  });
  $('#p-naarplan').addEventListener('click', () => {
    const p = huidig();
    const o = p && openingVan(p);
    if (o) naarPlan(o.id);
  });
  $('#p-bibliotheek').addEventListener('click', () => {
    const p = huidig();
    if (!p) return;
    const ok = bewaarInBibliotheek(p, p.naam);
    $('#p-kopieer-melding').textContent = ok ? `"${p.naam}" bewaard in de bibliotheek: in elk project te gebruiken via Overzicht → Uit bibliotheek.` : 'Bewaren lukt niet (opslag vol).';
  });
  $('#p-kopieer').addEventListener('click', () => {
    const p = huidig();
    if (!p) return;
    void kopieer(offertetekst(p, resultaat(p)), $('#p-kopieer-melding'));
  });
}
