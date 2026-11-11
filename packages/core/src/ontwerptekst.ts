/**
 * Omschrijving van een vrij ontwerp voor de offerte: de tekst die de verkoper kopieert (of die naar het ERP gaat).
 * Volledig genoeg om de zetel te maken: elk element met maat, stof en zijn eigen keuzes (armstijl, vorm van de poef,
 * rugleuning van de chaise …), getekende hoogtes en eigen vormgeving, de keuzes voor de hele zetel, de vormgeving
 * van het model en de prijs met korting.
 */
import type { Materiaal } from './materialen.js';
import { dragerVan, gekozenOpties, type Ontwerp, type OntwerpCatalogus, type OntwerpResultaat, type Vormgeving } from './ontwerp.js';

export interface OmschrijvingOpties {
  /** Naam van het model waarvan het ontwerp vertrok. */
  modelNaam?: string;
  /** Opmaak van een bedrag (de demo geeft "€ 1.234,56" mee). */
  eur?: (x: number) => string;
  /** Vormgeving van het model: een zit- of poothoogte die daarmee overeenkomt, is geen maatwerk. */
  modelVormgeving?: Partial<Vormgeving>;
}

const getal = (x: number) => x.toLocaleString('nl-BE', { maximumFractionDigits: 1 });
const standaardEur = (x: number) => `€ ${x.toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const RUGVORM: Record<string, string> = { recht: 'recht', hellend: 'achterover hellend', rond: 'afgerond' };
const HOUTFRAME: Record<string, string> = { geen: 'geen', zijkant: 'zijkanten', rondom: 'zijkanten + voorkant' };

/** Vormgeving in woorden: alleen de velden die ingevuld zijn (voor één element: zijn afwijkingen). */
function vormgevingTekst(v: Partial<Vormgeving>): string[] {
  const delen: string[] = [];
  if (v.rugdikte !== undefined) delen.push(`rugdikte ${getal(v.rugdikte)} cm`);
  if (v.kussendikte !== undefined) delen.push(`kussendikte ${getal(v.kussendikte)} cm`);
  if (v.zitkussens !== undefined) delen.push(`${Math.round(v.zitkussens)} ${Math.round(v.zitkussens) === 1 ? 'zitkussen' : 'zitkussens'} per element`);
  if (v.zachtheid !== undefined) delen.push(`zachtheid ${getal(v.zachtheid)} op 10`);
  if (v.rugvorm !== undefined) delen.push(`rug ${RUGVORM[v.rugvorm] ?? v.rugvorm}`);
  if (v.houtframe !== undefined) delen.push(`houten frame: ${HOUTFRAME[v.houtframe] ?? v.houtframe}`);
  if (v.rugkussendikte !== undefined) delen.push(`rugkussens ${getal(v.rugkussendikte)} cm dik`);
  if (v.rugkussens !== undefined) delen.push(`${Math.round(v.rugkussens)} rugkussens per element`);
  if (v.karkashoogte !== undefined) delen.push(`karkas ${getal(v.karkashoogte)} cm hoog`);
  if (v.opbouw === 'doorlopend') delen.push('doorlopende vorm (één zetel)');
  if (v.bocht) delen.push(`in een boog (uiteinden ${getal(v.bocht)} cm naar voren)`);
  if (v.kussenoversteek !== undefined && Math.abs(v.kussenoversteek) >= 1)
    delen.push(v.kussenoversteek > 0 ? `zitkussen steekt ${getal(v.kussenoversteek)} cm over de onderbouw` : `onderbouw steekt ${getal(-v.kussenoversteek)} cm onder het zitkussen uit (plateau)`);
  return delen;
}

/** De omschrijving als regels tekst (de eerste regel is de titel). */
export function ontwerpOmschrijving(
  ontwerp: Ontwerp,
  catalogus: OntwerpCatalogus,
  materialen: Materiaal[],
  r: OntwerpResultaat,
  opties: OmschrijvingOpties = {},
): string[] {
  const eur = opties.eur ?? standaardEur;
  const mats = new Map(materialen.map((m) => [m.code, m]));
  const typen = new Map(catalogus.typen.map((t) => [t.code, t]));
  const nummer = new Map(r.elementen.map((x, i) => [x.id, i + 1]));
  const regels: string[] = [];
  regels.push(`${opties.modelNaam ? `Model ${opties.modelNaam}` : 'Zetel op maat'} (vrij ontwerp), totaal ${getal(r.afmetingen.breedte)} × ${getal(r.afmetingen.diepte)} cm`);
  const hoofd = mats.get(ontwerp.hoofdmateriaal);
  if (hoofd) regels.push(`Hoofdstof: ${hoofd.naam}${hoofd.collectie ? ` (${hoofd.collectie}, prijsgroep ${hoofd.groep})` : ` (prijsgroep ${hoofd.groep})`}`);

  for (const x of r.elementen) {
    const e = ontwerp.elementen.find((o) => o.id === x.id);
    if (!e) continue;
    const t = typen.get(e.type);
    const delen: string[] = [`${nummer.get(x.id)}. ${x.label} ${getal(x.breedte)} × ${getal(x.diepte)} cm`];
    if (t?.tekenstijl !== 'console' && x.materiaal) delen.push(mats.get(x.materiaal)?.naam ?? x.materiaal);
    // Eigen keuzes van dit element (armstijl, vorm van de poef, rugleuning van de chaise …).
    const gekozen = gekozenOpties(ontwerp, catalogus, e);
    for (const g of catalogus.opties ?? []) {
      if (g.niveau !== 'element' || (g.voorTypen && !g.voorTypen.includes(e.type))) continue;
      // Armhoogte uit de vormgeving van het model gaat voor op de keuze (zie hoogtesVan); per element getekend staat verder.
      if (g.code === 'armhoogte' && ontwerp.vormgeving?.armhoogte !== undefined) {
        if (e.vorm?.armhoogte === undefined) {
          const h = ontwerp.vormgeving.armhoogte;
          delen.push(`armhoogte: ${getal(h)} cm${opties.modelVormgeving?.armhoogte === h ? '' : ' (op maat)'}`);
        }
        continue;
      }
      const k = gekozen.get(g.code);
      // "Functie: geen" of "uitvoering: standaard" voegt niets toe; andere keuzes (ook de standaardarm) wel.
      if (!k || (k.code === g.standaard && (k.code === 'geen' || k.code === 'standaard'))) continue;
      delen.push(`${g.label.toLowerCase()}: ${k.label}`);
    }
    // Opzet-elementen: waarop ze liggen.
    if (t?.opzet) {
      const d = dragerVan(ontwerp, catalogus, e);
      delen.push(d ? `op element ${nummer.get(d.id)}` : 'ligt nog niet op een element');
    }
    // Getekende hoogtes en eigen vormgeving (ontwerpmodus) van dit element.
    if (e.vorm?.rughoogte !== undefined) delen.push(`${t?.tekenstijl === 'rugleuning' ? 'hoogte' : 'rughoogte'} ${getal(e.vorm.rughoogte)} cm (op maat)`);
    if (e.vorm?.armhoogte !== undefined) delen.push(`armhoogte ${getal(e.vorm.armhoogte)} cm (op maat)`);
    const eigen = vormgevingTekst({ ...e.vorm, rughoogte: undefined, armhoogte: undefined, zithoogte: undefined, poothoogte: undefined });
    if (eigen.length) delen.push(`eigen vormgeving: ${eigen.join(', ')}`);
    regels.push(`- ${delen.join(', ')}`);
  }

  // Keuzes voor de hele zetel; een getekende zit- of poothoogte vervangt de gekozen maat.
  const zetel = gekozenOpties(ontwerp, catalogus);
  // Een hoogte in de vormgeving (van het model of getekend) gaat voor op de gekozen maat.
  const getekend: Record<string, number | undefined> = { zithoogte: ontwerp.vormgeving?.zithoogte, poothoogte: ontwerp.vormgeving?.poothoogte, rughoogte: ontwerp.vormgeving?.rughoogte };
  for (const g of catalogus.opties ?? []) {
    if (g.niveau !== 'ontwerp') continue;
    const maat = getekend[g.code];
    if (maat !== undefined) {
      const vanModel = opties.modelVormgeving?.[g.code as 'zithoogte' | 'poothoogte' | 'rughoogte'] === maat;
      regels.push(`- ${g.label}: ${getal(maat)} cm${vanModel ? '' : ' (op maat)'}`);
      continue;
    }
    const k = zetel.get(g.code);
    if (k) regels.push(`- ${g.label}: ${k.label}`);
  }
  const vg = vormgevingTekst(ontwerp.vormgeving ?? {});
  if (vg.length) regels.push(`- Vormgeving: ${vg.join(', ')}`);

  if (r.prijs.kortingProcent) {
    regels.push(`Brutoprijs: ${eur(r.prijs.brutoprijsExcl)} excl. btw, korting ${getal(r.prijs.kortingProcent)}%: − ${eur(r.prijs.brutoprijsExcl - r.prijs.verkoopprijsExcl)}`);
  }
  regels.push(`Prijs: ${eur(r.prijs.verkoopprijsExcl)} excl. btw (${eur(r.prijs.verkoopprijsIncl)} incl. ${getal(catalogus.btwProcent)}% btw)`);
  return regels;
}
