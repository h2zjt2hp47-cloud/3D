// Wat er boven de dagelijkse regels gebeurt: vaste gebeurtenissen, versterkingen voor Rome,
// onderwerping, opstand en opvolging. Feiten en data: uit algemene kennis, NOG NA TE KIJKEN.
import { kaart as standaardKaart, type Kaart } from '../kaart/kaart';
import { datumVan, dagnummerVan, jaarTekst } from './kalender';
import { kiBeurt } from './ki';
import { kiEconomie, maandEconomie } from './economie';
import { dagStap, verdwijn } from './regels';
import { ingangVanRome, nieuwLeger } from './romeinen';
import {
  hoofd, inOorlog, kans, legersIn, meld, paar, sluitVrede, vakkenVan, verklaarOorlog, wie,
  type Keuze, type Toestand,
} from './toestand';

/** één dag verder; geeft false als de klok moet stoppen voor een keuze */
export function volgendeDag(t: Toestand, k: Kaart = standaardKaart): boolean {
  if (t.wachtend.length) return false;
  vasteGebeurtenissen(t, k);
  if (t.wachtend.length) return false;
  dagStap(t, k);
  const d = datumVan(t.dag);
  if (d.dag === 1) maandelijks(t, k);
  const ids = Object.keys(t.facties);
  ids.forEach((f, i) => {
    if (f !== t.speler && (t.dag + i) % 3 === 0) kiBeurt(t, f, k);
  });
  opvolging(t, k);
  return !t.wachtend.length;
}

// ---------- vaste gebeurtenissen ----------

interface Gebeurtenis {
  id: string;
  dag: number;
  doe: (t: Toestand, k: Kaart) => void;
}

const op = (dag: number, maand: number, jaar: number) => dagnummerVan({ dag, maand, jaar });

const GEBEURTENISSEN: Gebeurtenis[] = [
  {
    id: 'bond57', dag: 0,
    doe: (t) => vraag(t, {
      id: 'bond57', titel: 'De bond van de Belgen, 57 v.Chr.',
      tekst: t.speler === 'rome' || t.speler === 'remi'
        ? 'De Belgische stammen hebben een bond gesloten tegen Rome, onder leiding van Galba, koning van de Suessiones. Caesar trekt met zijn legioenen naar het noorden. De Remi kozen de kant van Rome.'
        : t.speler === 'treveri'
          ? 'De stammen in het westen sluiten een bond tegen Caesar. De Treveri blijven voorlopig buiten de strijd. Wacht af, of bereid je voor.'
          : 'De Belgische stammen hebben een bond gesloten tegen Rome, onder leiding van Galba, koning van de Suessiones. Caesar staat met zijn legioenen bij Bibrax, in het land van de Remi.',
      opties: [{ tekst: 'Begin', gevolg: 'niets' }],
    }),
  },
  {
    id: 'ambiorix54', dag: op(15, 10, -54),
    doe: (t, k) => {
      const opstandig = ['eburonen', 'treveri'];
      if (t.facties.nerviers.bestaat && t.facties.nerviers.heer === 'rome' && kans(t) < 0.6) opstandig.push('nerviers');
      const namen: string[] = [];
      for (const f of opstandig) if (komInOpstand(t, k, f, f === 'eburonen' ? 7000 : 4500)) namen.push(t.facties[f].naam);
      if (!namen.length) return;
      vraag(t, {
        id: 'ambiorix54', titel: 'De opstand van Ambiorix, herfst 54 v.Chr.',
        tekst: `Ambiorix, koning van de Eburonen, valt de Romeinen aan in hun winterkamp. ${namen.join(', ')} grijpen naar de wapens tegen Rome.`,
        opties: [{ tekst: t.speler === 'rome' ? 'Wraak' : 'Verder', gevolg: 'niets' }],
      });
    },
  },
  {
    id: 'caesar53', dag: op(1, 3, -53),
    doe: (t, k) => {
      const v = ingangVanRome(t, k);
      nieuwLeger(t, 'rome', v, 10000, 'Nieuwe legioenen van Caesar');
      meld(t, 'Caesar brengt nieuwe legioenen naar het noorden.', 'gebeurtenis', v);
    },
  },
  {
    id: 'einde50', dag: op(1, 1, -50),
    doe: (t) => {
      const s = score(t, t.speler);
      vraag(t, {
        id: 'einde50', titel: 'Einde van de veroveringstijd, 50 v.Chr.',
        tekst: `Hier eindigt het eerste stuk van het spel. Jouw score: welvaart ${s.welvaart}, macht ${s.macht}, vrijheid ${s.vrijheid}. De volgende tijdperken worden nog gebouwd; je kan wel verder spelen.`,
        opties: [{ tekst: 'Verder spelen', gevolg: 'niets' }],
      });
    },
  },
];

export function vasteGebeurtenissen(t: Toestand, k: Kaart = standaardKaart) {
  for (const g of GEBEURTENISSEN) {
    if (g.dag <= t.dag && !t.gedaan.includes(g.id)) {
      t.gedaan.push(g.id);
      g.doe(t, k);
    }
  }
}

function vraag(t: Toestand, keuze: Keuze) {
  t.wachtend.push(keuze);
}

/** de speler kiest een optie; geeft de gevolgen */
export function kies(t: Toestand, k: Kaart, keuzeId: string, optie: number) {
  const i = t.wachtend.findIndex((x) => x.id === keuzeId);
  if (i < 0) return;
  const keuze = t.wachtend[i];
  t.wachtend.splice(i, 1);
  const gevolg = keuze.opties[optie]?.gevolg ?? 'niets';
  if (gevolg === 'onderwerpen') onderwerp(t, t.speler, 'rome');
  if (gevolg === 'doorvechten') t.onderwerpVraagNa = t.dag + 180;
  void k;
}

// ---------- onderwerping en opstand ----------

function onderwerp(t: Toestand, f: string, heer: string) {
  const fac = t.facties[f];
  fac.heer = heer;
  // de oorlogen van de onderworpen stam eindigen; ze volgt haar heer
  for (const p of [...t.oorlog]) if (p.split('|').includes(f)) t.oorlog = t.oorlog.filter((x) => x !== p);
  t.bond = t.bond.filter((p) => !p.split('|').includes(f));
  for (const l of t.legers) if (l.factie === f) { l.sterkte = Math.min(l.sterkte, 1500); l.pad = []; }
  meld(t, `${wie(t, f, true)} onderwerpen zich aan ${wie(t, heer)}.`, 'gebeurtenis');
}

export function komInOpstand(t: Toestand, k: Kaart, f: string, leger: number): boolean {
  const fac = t.facties[f];
  if (fac.heer === null && fac.bestaat && !inOorlog(t, f, 'rome') && f !== 'treveri') return false;
  const heer = fac.heer ?? 'rome';
  fac.heer = null;
  fac.bestaat = true;
  verklaarOorlog(t, f, heer);
  for (const vriend of Object.keys(t.facties)) {
    if (vriend !== heer && t.bond.includes(paar(vriend, heer))) verklaarOorlog(t, f, vriend);
  }
  // het eigen land dat niet door vijanden bezet is, komt terug
  t.vakken.forEach((v, i) => {
    if (v.oorsprong === f && v.eigenaar !== f && !legersIn(t, i).some((l) => inOorlog(t, l.factie, f))) {
      v.eigenaar = f; v.bezetter = null; v.bezetting = 0;
      if (v.fort) v.garnizoen = v.fort * 0.5;
    }
  });
  const eigen = vakkenVan(t, f);
  if (!eigen.length) return false;
  const plek = fac.hoofdstad !== null && eigen.includes(fac.hoofdstad) ? fac.hoofdstad : eigen[0];
  nieuwLeger(t, f, plek, leger, `Opstand van de ${fac.naam}`);
  meld(t, `${wie(t, f, true)} komen in opstand tegen ${wie(t, heer)}.`, 'gebeurtenis', plek);
  return true;
}

/** de speler kiest zelf om in opstand te komen */
export function spelerOpstand(t: Toestand, k: Kaart) {
  const fac = t.facties[t.speler];
  if (!fac.heer) return false;
  const sterkte = Math.max(1500, Math.min(8000, Math.round(fac.mankracht)));
  fac.mankracht = Math.max(0, fac.mankracht - sterkte);
  return komInOpstand(t, k, t.speler, sterkte);
}

function maandelijks(t: Toestand, k: Kaart) {
  const d = datumVan(t.dag);
  maandEconomie(t, k);
  for (const f of Object.keys(t.facties)) if (f !== t.speler) kiEconomie(t, f, k);
  // Rome krijgt elk voorjaar versterking als het weinig troepen heeft
  if (d.maand === 3) {
    const romeins = t.legers.filter((l) => l.factie === 'rome').reduce((s, l) => s + l.sterkte, 0);
    if (romeins < 30000) {
      const v = ingangVanRome(t, k);
      const extra = Math.min(10000, Math.round((30000 - romeins) / 1000) * 1000);
      if (extra >= 2000) {
        nieuwLeger(t, 'rome', v, extra, `Versterking uit Italië (${jaarTekst(d.jaar)})`);
        meld(t, `Er komen ${extra} Romeinse soldaten bij uit het zuiden.`, 'info', v);
      }
    }
  }
  for (const f of Object.values(t.facties)) {
    if (!f.bestaat || f.soort !== 'stam' || f.heer) continue;
    if (!inOorlog(t, f.id, 'rome')) continue;
    const eigen = vakkenVan(t, f.id);
    const hoofdplaatsKwijt = f.hoofdstad === null || t.vakken[f.hoofdstad].eigenaar !== f.id;
    const leger = t.legers.filter((l) => l.factie === f.id).reduce((s, l) => s + l.sterkte, 0);
    const klaar = hoofdplaatsKwijt && eigen.length <= f.vakkenBijStart * 0.5 && leger < 3000;
    if (!klaar) continue;
    if (f.id === t.speler) {
      if (t.dag >= t.onderwerpVraagNa) {
        t.onderwerpVraagNa = t.dag + 180;
        vraag(t, {
          id: 'onderwerp-' + t.dag, titel: 'Onderwerpen aan Rome?',
          tekst: `Je hoofdplaats is gevallen en je hebt nog maar ${eigen.length} van de ${f.vakkenBijStart} vakken. Als je je onderwerpt, mag je volk blijven bestaan onder Rome, maar je verliest je vrijheid en het grootste deel van je leger. Je kan later altijd in opstand komen.`,
          opties: [{ tekst: 'Onderwerpen', gevolg: 'onderwerpen' }, { tekst: 'Doorvechten', gevolg: 'doorvechten' }],
        });
      }
    } else if (kans(t) < 0.5) {
      onderwerp(t, f.id, 'rome');
    }
  }
  // onderworpen stammen komen soms vanzelf in opstand als Rome zwak staat
  const romeins = t.legers.filter((l) => l.factie === 'rome').reduce((s, l) => s + l.sterkte, 0);
  for (const f of Object.values(t.facties)) {
    if (f.heer !== 'rome' || f.id === t.speler) continue;
    if (romeins < 15000 && kans(t) < 0.05) komInOpstand(t, k, f.id, 4000);
  }
}

// ---------- opvolging ----------

/** verdwijnt het volk van de speler, dan speel je verder als wie het grootste deel van je land heeft */
function opvolging(t: Toestand, k: Kaart) {
  const f = t.facties[t.speler];
  if (f.bestaat) {
    if (f.soort === 'stam' && !vakkenVan(t, f.id).length && !t.legers.some((l) => l.factie === f.id)) verdwijn(t, f.id, 'rome');
    else return;
  }
  const telling: Record<string, number> = {};
  t.vakken.forEach((v) => { if (v.oorsprong === t.speler) telling[hoofd(t, v.eigenaar)] = (telling[hoofd(t, v.eigenaar)] ?? 0) + 1; });
  const opvolger = Object.entries(telling).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'rome';
  const oud = f.naam;
  t.speler = opvolger;
  vraag(t, {
    id: 'opvolging-' + t.dag, titel: 'Een nieuwe macht',
    tekst: `De ${oud} bestaan niet meer als vrij volk. Hun land is nu grotendeels in handen van ${t.facties[opvolger].naam}. Je speelt verder als ${t.facties[opvolger].naam} (${t.facties[opvolger].heerser}).`,
    opties: [{ tekst: 'Verder', gevolg: 'niets' }],
  });
  void k;
}

// ---------- score ----------

export function score(t: Toestand, f: string) {
  const eigen = vakkenVan(t, f);
  const volk = eigen.reduce((s, v) => s + t.vakken[v].bevolking, 0);
  const leger = t.legers.filter((l) => l.factie === f).reduce((s, l) => s + l.sterkte, 0);
  const fac = t.facties[f];
  return {
    welvaart: Math.round(volk / 10000 + Math.max(0, fac.schat) / 100),
    macht: Math.round(leger / 1000 + eigen.length * 0.5),
    vrijheid: !fac.bestaat ? 0 : fac.heer ? 30 : 100,
  };
}

export { sluitVrede };
