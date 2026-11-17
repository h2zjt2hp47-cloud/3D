/**
 * De posten van het werk (ronde 11): uit het plan, de catalogus, de posities en de handmatige posten de lijst die een
 * aannemer op zijn offerte zou zetten, **in de volgorde van het bouwen**: voorbereiding, ruwbouw (fundering, vloerplaat),
 * wind- en waterdicht (wanden, dak, dakramen en koepels, buitenschrijnwerk, gevelbekleding), binnenafwerking, techniek,
 * supplementen. Vraag van Jonas bij twee echte offertes: *"Deze offerte willen we kunnen weergeven met ook detail."*
 *
 * Elke post heeft een titel, een groep, een hoeveelheid met eenheid (m², m, stuks), detailregels in gewone zinnen en de
 * dingen van de 3D die erbij horen (de codes van `Plan3DOpties.dingen`: `gevel:<vlak>`, `dak`, `opening:<id>`,
 * `ruimte:<id>`, `toestel:<id>`, `leiding:<id>`, `meubel:<id>`). Een ding kan bij meer posten horen (een buitenmuur bij
 * de wand, de gevelbekleding en de binnenafwerking).
 *
 * Er wordt niets dubbel getypt: alles komt uit wat al bestaat. De lagen van een opbouw worden over de groepen verdeeld
 * volgens hun rol (de structuur bij de wand of het dak, de bekleding bij de gevel, de afwerking binnen bij de
 * binnenafwerking); waar het zichtbare ontwerp en de laag van de opbouw hetzelfde zeggen (de gekozen vloer en de laag
 * "Vloertegels", de gekozen dakbedekking en de laag "Dakbedekking"), staat de zichtbare keuze er één keer. Hoeveelheden
 * van materiaal (stuks hout, m² isolatie) zijn voor de aannemer (`intern`). Wat bestaat of van de buren is, staat er niet in.
 *
 * Geen prijzen. Een voorstelling, geen berekening: de opbouwen zijn voorbeelden, en waar een post een regel van goed
 * vakmanschap volgt (de fundering, het aantal afvoeren), zegt hij dat zelf.
 */
import { dakOpbouw, delenVan, heeftBestaand, isBestaand, meubelVoetafdruk, murenVan, muurStatus, muurVanOpening, niveauPlan, niveauVan, nieuwPlatDak, nieuweTechniek, ruimteMaten, ruimteOp, verdiepingenVan, vloerHoogte, type PlanCatalogus, type Plattegrond } from './plattegrond.js';
import { gevelOppervlaktes } from './gevels.js';
import { telTechniek, TECHNIEK_VAKKEN, TECHNIEK_VOORBEHOUD, type TechniekVak } from './techniek.js';
import { binnenMaten } from './binnenafwerking.js';
import { woningConstructie, type ConstructieDeel, type WoningConstructie } from './constructie.js';
import type { BouwdeelLaag } from './bouwdelen.js';
import type { OpbouwPlaats } from './opbouw.js';

/**
 * De groepen van een offerte, in de volgorde van het bouwen. `buitenwerk` (16/11, doorloop B25): een carport, tuinhuis,
 * loods of staalwerk stond vroeger onder "Supplementen", ook als het het hele project was.
 */
export type PostGroep = 'voorbereiding' | 'ruwbouw' | 'winddicht' | 'binnen' | 'techniek' | 'buitenwerk' | 'supplementen';
export const POST_GROEPEN: PostGroep[] = ['voorbereiding', 'ruwbouw', 'winddicht', 'binnen', 'techniek', 'buitenwerk', 'supplementen'];
export const POST_GROEP_NAAM: Record<PostGroep, string> = {
  voorbereiding: 'Voorbereiding', ruwbouw: 'Ruwbouw', winddicht: 'Wind- en waterdicht', binnen: 'Binnenafwerking', techniek: 'Techniek',
  buitenwerk: 'Bijgebouwen en buitenwerk', supplementen: 'Supplementen',
};

/** Eén post van het werk. */
export interface Post {
  /** Vast zolang het ontwerp hetzelfde blijft (bv. `wand:buitenwand:hsb_hout`, `werk:<id>`): om te onthouden wat openstaat. */
  id: string;
  groep: PostGroep;
  titel: string;
  hoeveelheid?: number;
  /** m², m, stuks, of wat een handmatige post zegt (m³, dag …). */
  eenheid?: string;
  /** Wat erin zit, in gewone zinnen (ook voor de klant). */
  detail: string[];
  /** Hoeveelheden van materiaal (stuks hout, m² platen, lopende meter leiding): alleen voor de aannemer. */
  intern: string[];
  /** De dingen van de 3D die bij deze post horen (zie `Plan3DOpties.dingen`). */
  dingen: string[];
  /**
   * Om de post in de 3D aan te duiden, als dat preciezer moet dan de dingen: het begin van de namen van de blokken (bv.
   * `dak.dakplaat_uitbouw`: het platte dak van de uitbouw en niet het dak van de bestaande woning). Ontbreekt = de dingen.
   */
  markeer?: string[];
  /** Een post die de verkoper zelf toevoegde (werk zonder ding). */
  handmatig?: boolean;
}

/** Werk zonder ding (ronde 11): afbraak van het terras, grondwerken, een container … Alles behalve de titel is optioneel. */
export interface HandmatigePost {
  id: string;
  titel: string;
  groep?: PostGroep;
  hoeveelheid?: number;
  eenheid?: string;
  uitleg?: string;
}

/** Voorstellen voor werk zonder ding, als tegels bij *+ Werk toevoegen*. */
export const WERK_VOORSTELLEN: (Omit<HandmatigePost, 'id'> & { code: string })[] = [
  // Algemeen: ook bij een nieuwe woning, een carport of een tuinhuis (vroeger "waar de uitbouw komt", doorloop B22).
  { code: 'afbraak_terras', titel: 'Afbraak van het terras', groep: 'voorbereiding', eenheid: 'm²', uitleg: 'Het bestaande terras of de verharding opbreken waar gebouwd wordt, en het puin afvoeren.' },
  { code: 'grondwerken', titel: 'Grondwerken', groep: 'voorbereiding', eenheid: 'm³', uitleg: 'Uitgraven voor de fundering en de vloerplaat, de grond afvoeren of verwerken op het terrein.' },
  { code: 'container', titel: 'Container voor het afval', groep: 'voorbereiding', eenheid: 'stuks', uitleg: 'Een container plaatsen en ophalen, het afval gesorteerd verwerken.' },
  { code: 'werfinrichting', titel: 'Werfinrichting', groep: 'voorbereiding', uitleg: 'De werf afbakenen en toegankelijk maken, stroom en water voor de werf.' },
  { code: 'opkuis', titel: 'Opkuis van de werf', groep: 'supplementen', uitleg: 'De werf opruimen en borstelschoon opleveren.' },
];

/** Een positie van het ontwerp (raam, deur, poort …) zoals de posten ze nodig hebben: de schermen geven de teksten. */
export interface PostPositie {
  id: string;
  naam: string;
  aantal: number;
  /** Soort en maat in een paar woorden (bv. "Hef-schuifdeur · 400 × 235 cm"). */
  kort?: string;
  /** Wat erin zit, in gewone zinnen (profiel, kleur, glas, zonwering …). */
  detail?: string[];
  /** Ramen, deuren en poorten (`schrijnwerk`, standaard) of een ander onderdeel (een carport, een loods …). */
  soort?: 'schrijnwerk' | 'ander';
  /** De groep van een ander onderdeel (standaard: bijgebouwen en buitenwerk; een aanbouw hoort bij de ruwbouw). */
  groep?: PostGroep;
}

export interface PostenOpties {
  posities?: PostPositie[];
  handmatig?: HandmatigePost[];
  /** De constructie van het plan, als ze al berekend is (anders hier). Vraagt `cat.opbouw`. */
  constructie?: WoningConstructie;
}

// ---------- tekst ----------

const komma = (x: number, d = 1) => {
  const f = 10 ** d, y = Math.round(x * f) / f;
  return String(y).replace('.', ',');
};
const mm = (x: number) => `${komma(x, 1)} mm`;
/** Met een kleine letter (in een zin), behalve een afkorting ("OSB-plaat", "EPDM"). */
const kleinEerst = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const hoofd = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const meter = (cm: number) => `${komma(cm / 100, 2)} m`;
/**
 * De titel van een post: de naam van de opbouw zelf als die al zegt wat het is ("Plat dak op houten roostering", niet
 * "Plat dak: plat dak op …"), anders "Wat: naam" ("Vloerplaat: betonplaat 150 mm").
 */
const titelVan = (wat: string, naam: string) => (naam.toLowerCase().startsWith(wat.toLowerCase().slice(0, 6)) ? hoofd(naam) : `${wat}: ${kleinEerst(naam)}`);

/** Een laag in een paar woorden: "houtskelet met isolatie 140 mm (hout 38 mm om de 600 mm, minerale wol)". */
function laagTekst(l: Pick<BouwdeelLaag, 'naam' | 'dikte' | 'rol' | 'hout' | 'vulling'>, materialen: Record<string, { label: string }>): string {
  const dun = l.rol === 'folie' || l.dikte < 1;
  const hout = l.hout ? ` (hout ${l.hout.breedte} mm om de ${l.hout.hoh} mm${l.hout.vulling ? `, ${kleinEerst(materialen[l.hout.vulling]?.label ?? l.hout.vulling)}` : ''})` : '';
  return `${kleinEerst(l.naam)}${dun ? '' : ` ${mm(l.dikte)}`}${hout}`;
}

/** Een opsomming van lagen als zin: "Van binnen naar buiten: a, b en c." */
function lagenZin(voor: string, lagen: BouwdeelLaag[], materialen: Record<string, { label: string }>): string | undefined {
  if (!lagen.length) return undefined;
  const t = lagen.map((l) => laagTekst(l, materialen));
  return `${voor}: ${t.length > 1 ? `${t.slice(0, -1).join(', ')} en ${t[t.length - 1]}` : t[0]}.`;
}

/**
 * Hoeveel van elk materiaal de lagen (volgnummers) van deze bouwdelen vragen, voor de aannemer: het hout van het skelet
 * per doorsnede (stuks en lopende meter), latten in lopende meter, de rest in m². Zoals de meetstaat, netto.
 */
function hoeveelheden(delen: ConstructieDeel[], indexen: Set<number>, materialen: Record<string, { label: string }>): string[] {
  const uit = new Map<string, { tekst: (x: { n: number; m: number }) => string; n: number; m: number }>();
  const tel = (k: string, n: number, m: number, tekst: (x: { n: number; m: number }) => string) => {
    const x = uit.get(k) ?? { tekst, n: 0, m: 0 };
    x.n += n; x.m += m;
    uit.set(k, x);
  };
  const naam = (code: string) => materialen[code]?.label ?? code;
  for (const d of delen) {
    for (const l of d.deel.lagen) {
      if (!indexen.has(l.index)) continue;
      if (l.rol === 'skelet') {
        for (const s of d.deel.stukken) {
          const k = `hout|${s.materiaal}|${s.doorsnede.breedte}×${s.doorsnede.hoogte}`;
          const [a, b] = [s.doorsnede.breedte, s.doorsnede.hoogte].sort((p, q) => p - q);
          tel(k, 1, s.lengte / 100, (x) => `${hoofd(naam(s.materiaal))} ${a} × ${b} mm: ${x.n} stuks, samen ${komma(x.m)} m`);
        }
        if (l.vulling) tel(`vulling|${l.vulling.materiaal}|${l.dikte}`, 0, l.vulling.oppervlakte, (x) => `${hoofd(naam(l.vulling!.materiaal))} ${mm(l.dikte)}: ${komma(x.m)} m²`);
      } else if (l.rol === 'latten' && l.lattenLengte !== undefined) {
        tel(`latten|${l.materiaal}|${l.dikte}|${l.hout?.breedte}`, 0, l.lattenLengte, (x) => `${hoofd(l.naam)} (${naam(l.materiaal).toLowerCase()} ${l.hout?.breedte ?? ''} × ${komma(l.dikte)} mm): ${komma(x.m)} m`);
      } else if (l.rol !== 'spouw') {
        tel(`vlak|${l.materiaal}|${l.dikte}`, 0, l.oppervlakte, (x) => `${hoofd(l.naam)}${l.rol === 'folie' ? '' : ` ${mm(l.dikte)}`}: ${komma(x.m)} m²`);
      }
    }
  }
  return [...uit.values()].filter((x) => x.m > 0.005).map((x) => x.tekst(x));
}

// ---------- de posten ----------

/** Waar een laag van een wand, vloer of dak bij hoort: de structuur, de afwerking binnen, of de bekleding buiten. */
function verdeel(d: ConstructieDeel): { binnen: Set<number>; structuur: Set<number>; buiten: Set<number> } {
  const binnen = new Set<number>(), structuur = new Set<number>(), buiten = new Set<number>();
  const dr = d.deel.dragend;
  for (const l of d.deel.lagen) {
    const wand = d.plaats === 'buitenwand' || d.plaats === 'binnenwand';
    if (d.plaats === 'binnenwand') structuur.add(l.index);
    else if (l.rol === 'afwerking_binnen' || (!wand && l.index < dr)) binnen.add(l.index);
    else if (l.index > dr && (l.rol === 'afwerking_buiten' || (wand && (l.rol === 'latten' || l.rol === 'spouw')))) buiten.add(l.index);
    else structuur.add(l.index);
  }
  return { binnen, structuur, buiten };
}

const uniek = <T>(x: T[]) => [...new Set(x)];
const r1 = (x: number) => Math.round(x * 10) / 10;

/**
 * De titel van elke post *Buitenwand* (per opbouw): "Buitenwand in houtskelet", het deel van de naam vóór de komma. Hebben
 * twee opbouwen zo dezelfde titel (houtskelet achter gevelsteen en achter hout, doorloop B23), dan zegt de titel waarin ze
 * verschillen: wat de klant buiten ziet ("… achter gevelsteen (handvorm)"), of anders de volledige naam van de opbouw.
 */
function buitenwandTitels(plan: Plattegrond, cat: PlanCatalogus, groepen: [string, ConstructieDeel[]][], opbouwNaam: (code: string) => string): Map<string, string> {
  const kort = new Map(groepen.map(([code]) => [code, titelVan('Buitenwand', opbouwNaam(code).split(',')[0]!)]));
  const dubbel = (t: string) => [...kort.values()].filter((x) => x === t).length > 1;
  if (![...kort.values()].some(dubbel)) return kort;
  const materiaal = new Map(gevelOppervlaktes(plan).filter((v) => v.keuze && !v.strook).map((v) => [`gevel:${v.sleutel}`, v.keuze!.materiaal]));
  const achter = new Map(groepen.map(([code, lijst]) => {
    const labels = uniek(lijst.map((d) => materiaal.get(d.ding ?? '')).filter((m): m is string => !!m).map((m) => kleinEerst(cat.gevels?.[m]?.label ?? m)));
    return [code, labels.length ? `achter ${labels.length > 1 ? `${labels.slice(0, -1).join(', ')} en ${labels[labels.length - 1]}` : labels[0]}` : ''];
  }));
  const uit = new Map<string, string>();
  for (const [code, t] of kort) {
    if (!dubbel(t)) { uit.set(code, t); continue; }
    const a = achter.get(code) ?? '';
    // Het verschil in de gevel: alleen als geen andere opbouw met dezelfde titel hetzelfde zegt.
    const uniekAchter = a && ![...kort].some(([c, x]) => c !== code && x === t && achter.get(c) === a);
    uit.set(code, uniekAchter ? `${t} ${a}` : titelVan('Buitenwand', opbouwNaam(code)));
  }
  return uit;
}

/**
 * De posten van het werk, in de volgorde van het bouwen (zie bovenaan). `cat` heeft de opbouwen (`cat.opbouw`) voor de
 * wanden, vloeren en daken nodig; zonder opbouwen vallen die posten weg. Wat bestaat of van de buren is, staat er niet in.
 */
export function postenVan(plan: Plattegrond, cat: PlanCatalogus, opties: PostenOpties = {}): Post[] {
  const uit: Post[] = [];
  const mat = cat.opbouw?.materialen ?? {};
  const c = opties.constructie ?? (cat.opbouw && plan.ruimtes.length ? woningConstructie(plan, cat) : undefined);
  const delen = c?.delen ?? [];
  const oud = heeftBestaand(plan);
  const nieuweRuimte = (id?: string) => !!id && !isBestaand(plan, id);
  const ruimteNaam = new Map(plan.ruimtes.map((r) => [r.id, r.naam]));
  const niveaus = verdiepingenVan(plan).length;
  const murenPer = Array.from({ length: niveaus }, (_, n) => murenVan(niveauPlan(plan, n)));
  const opbouwNaam = (code: string) => cat.opbouw?.opbouwen[code]?.naam ?? code;
  const lagenVan = (d: ConstructieDeel, idx: Set<number>) => d.deel.lagen.filter((l) => idx.has(l.index));
  const opPlaats = (p: OpbouwPlaats) => {
    const groepen = new Map<string, ConstructieDeel[]>();
    for (const d of delen.filter((x) => x.plaats === p)) groepen.set(d.opbouw, [...(groepen.get(d.opbouw) ?? []), d]);
    return [...groepen];
  };
  const m2Van = (lijst: ConstructieDeel[]) => lijst.reduce((t, d) => t + (d.deel.lagen[d.deel.dragend]?.oppervlakte ?? d.deel.lagen[0]?.oppervlakte ?? 0), 0);
  const handmatig = (groep: PostGroep) => (opties.handmatig ?? []).filter((h) => (h.groep ?? 'supplementen') === groep).map((h): Post => ({
    id: `werk:${h.id}`, groep, titel: h.titel, ...(h.hoeveelheid !== undefined && Number.isFinite(h.hoeveelheid) ? { hoeveelheid: h.hoeveelheid } : {}),
    ...(h.eenheid ? { eenheid: h.eenheid } : {}), detail: h.uitleg ? [h.uitleg] : [], intern: [], dingen: [], handmatig: true,
  }));
  const positieDingen = (id: string) => plan.openingen.filter((o) => o.positie === id).map((o) => `opening:${o.id}`);
  /** Een ander onderdeel dan een raam of deur (een aanbouw, een carport, een loods …) in zijn groep. */
  const anderIn = (groep: PostGroep) => (opties.posities ?? []).filter((x) => x.aantal > 0 && x.soort === 'ander' && (x.groep ?? 'buitenwerk') === groep).map((p): Post => ({
    id: `positie:${p.id}`, groep, titel: p.kort ?? p.naam, hoeveelheid: p.aantal, eenheid: 'stuks', detail: p.detail ?? [], intern: [], dingen: positieDingen(p.id),
  }));
  /** Wat aan het einde van een groep komt: de andere onderdelen van die groep en het werk dat de verkoper zelf toevoegde. */
  const extra = (groep: PostGroep) => [...anderIn(groep), ...handmatig(groep)];

  // ---------- voorbereiding ----------
  uit.push(...extra('voorbereiding'));

  // ---------- ruwbouw ----------
  const muren0 = delen.filter((d) => d.plaats === 'buitenwand' && d.niveau === 0 && !d.onderDak);
  if (muren0.length) {
    const lengte = muren0.reduce((t, d) => t + d.deel.maten.b, 0);
    const skelet = muren0.some((d) => d.deel.lagen[d.deel.dragend]?.rol === 'skelet');
    uit.push({
      id: 'fundering', groep: 'ruwbouw', titel: 'Fundering onder de nieuwe buitenmuren', hoeveelheid: r1(lengte / 100), eenheid: 'm',
      detail: [
        'Een funderingszool in beton onder elke nieuwe buitenmuur. Maat en diepte bepaalt de ingenieur, na een grondonderzoek.',
        ...(skelet ? ['Daarop een rij isolerende blokken (kimblokken) waar de houtskeletwand op staat.'] : []),
        ...(oud ? ['Onder de bestaande gevel en de scheidingsmuren van de buren is hier geen nieuwe fundering geteld; de ingenieur beslist of ze versterkt of onderschoerd moeten worden.'] : []),
        'Nog niet getekend in de 3D: een voorstel volgens de regels van goed vakmanschap.',
      ],
      intern: [], dingen: uniek(muren0.map((d) => d.ding).filter((x): x is string => !!x)),
    });
  }
  for (const [code, lijst] of opPlaats('grondvloer')) {
    const eerste = lijst[0]!, v = verdeel(eerste);
    // De vloerplaat: de dragende laag en wat eronder ligt; wat erboven ligt, hoort bij de binnenafwerking (de vloer).
    const plaat = new Set([...v.structuur].filter((i) => i <= eerste.deel.dragend));
    const lagen = lagenVan(eerste, plaat);
    uit.push({
      id: `vloerplaat:${code}`, groep: 'ruwbouw', titel: titelVan('Vloerplaat', lagen[lagen.length - 1] ? `${lagen[lagen.length - 1]!.naam} ${mm(lagen[lagen.length - 1]!.dikte)}` : opbouwNaam(code)), hoeveelheid: r1(m2Van(lijst)), eenheid: 'm²',
      detail: [lagenZin('Opbouw', lagen, mat) ?? '', `Onder ${uniek(lijst.map((d) => ruimteNaam.get(d.ding?.slice('ruimte:'.length) ?? '') ?? '')).filter(Boolean).join(', ').toLowerCase() || 'de nieuwe ruimtes'}, tot de buitenkant van de muren.`].filter(Boolean),
      intern: hoeveelheden(lijst, plaat, mat), dingen: uniek(lijst.map((d) => d.ding).filter((x): x is string => !!x)),
    });
  }
  // Een opening in de bestaande gevel, naar het nieuwe deel (de muur zelf blijft).
  if (oud) {
    plan.openingen.forEach((o) => {
      if (o.soort !== 'doorgang' && o.soort !== 'binnendeur') return;
      const m = muurVanOpening(o, murenPer[niveauVan(o)] ?? []);
      if (!m || m.soort !== 'binnen' || muurStatus(plan, m) !== 'bestaand' || (isBestaand(plan, m.plus) && isBestaand(plan, m.min))) return;
      const nieuwId = nieuweRuimte(m.plus) ? m.plus : m.min;
      uit.push({
        id: `doorbraak:${o.id}`, groep: 'ruwbouw', titel: `Opening in de bestaande gevel, ${meter(o.breedte)} breed`, hoeveelheid: 1, eenheid: 'stuks',
        detail: [
          `Een opening van ${Math.round(o.breedte)} × ${Math.round(o.hoogte)} cm (breedte × hoogte) in de bestaande gevel, naar ${(ruimteNaam.get(nieuwId ?? '') ?? 'het nieuwe deel').toLowerCase()}.`,
          'Met een latei of stalen balk erboven; de ingenieur bepaalt de doorsnede. De muur errond blijft.',
          ...(o.soort === 'binnendeur' ? ['Met een binnendeur erin.'] : ['De dagkanten worden afgewerkt.']),
        ],
        intern: [], dingen: nieuwId ? [`ruimte:${nieuwId}`] : [],
      });
    });
  }
  for (const [code, lijst] of opPlaats('verdiepingsvloer')) {
    const v = verdeel(lijst[0]!);
    uit.push({
      id: `vloer:${code}`, groep: 'ruwbouw', titel: titelVan('Verdiepingsvloer', opbouwNaam(code)), hoeveelheid: r1(m2Van(lijst)), eenheid: 'm²',
      detail: [lagenZin('Van onder naar boven', lagenVan(lijst[0]!, v.structuur), mat) ?? '', 'Met het trapgat uitgespaard.'].filter(Boolean),
      intern: hoeveelheden(lijst, v.structuur, mat), dingen: uniek(lijst.map((d) => d.ding).filter((x): x is string => !!x)),
    });
  }
  uit.push(...extra('ruwbouw'));

  // ---------- wind- en waterdicht ----------
  const buitenwanden = opPlaats('buitenwand');
  const wandTitels = buitenwandTitels(plan, cat, buitenwanden, opbouwNaam);
  for (const [code, lijst] of buitenwanden) {
    const v = verdeel(lijst[0]!);
    const lateien = lijst.some((d) => d.deel.stukken.some((s) => s.rol === 'latei'));
    const buren = oud && murenPer.some((ms) => ms.some((m) => m.soort === 'buiten' && muurStatus(plan, m) === 'buren'));
    uit.push({
      id: `wand:buitenwand:${code}`, groep: 'winddicht', titel: wandTitels.get(code)!, hoeveelheid: r1(m2Van(lijst)), eenheid: 'm²',
      detail: [
        lagenZin('Van binnen naar buiten', lagenVan(lijst[0]!, v.structuur), mat) ?? '',
        ...(lateien ? ['Rond de ramen en deuren een latei en dubbele stijlen.'] : []),
        ...(lijst.some((d) => d.onderDak) ? ['Ook de topgevel onder het hellende dak.'] : []),
        ...(buren ? ['Tegen de buren niet: daar staat de scheidingsmuur al.'] : []),
        'Netto, zonder de openingen. De afwerking binnen en de gevelbekleding staan bij hun eigen post.',
      ].filter(Boolean),
      intern: hoeveelheden(lijst, v.structuur, mat), dingen: uniek(lijst.map((d) => d.ding).filter((x): x is string => !!x)),
    });
  }
  const dak = plan.ruimtes.length ? dakOpbouw(plan) : undefined;
  const bedekkingTekst = (b: { materiaal: string; kleur: string }) => {
    const m = cat.daken?.[b.materiaal];
    return `${m?.label ?? b.materiaal}, ${(m?.kleuren[b.kleur]?.label ?? b.kleur).toLowerCase()}`;
  };
  for (const [code, lijst] of opPlaats('hellendDak')) {
    const v = verdeel(lijst[0]!);
    const struct = lagenVan(lijst[0]!, v.structuur), latten = lagenVan(lijst[0]!, v.buiten).filter((l) => l.rol !== 'afwerking_buiten');
    uit.push({
      id: `dak:hellend:${code}`, groep: 'winddicht', titel: titelVan('Hellend dak', opbouwNaam(code)), hoeveelheid: r1(m2Van(lijst)), eenheid: 'm²',
      detail: [
        lagenZin('Van binnen naar buiten', [...struct, ...latten], mat) ?? '',
        ...(dak ? [`Dakbedekking: ${bedekkingTekst(dak.keuze.bedekking)}.`] : []),
        ...(dak?.hellend ? [`${dak.hellend.vorm === 'zadel' ? 'Zadeldak' : 'Lessenaarsdak'} van ${dak.hellend.helling}°, langs de helling gemeten, met ${dak.hellend.oversteek} cm oversteek.`] : []),
      ].filter(Boolean),
      intern: hoeveelheden(lijst, new Set([...v.structuur, ...latten.map((l) => l.index)]), mat), dingen: ['dak'],
    });
  }
  const platDelen = opPlaats('platDak');
  const nieuwPlat = dak ? dak.plat.filter((s) => nieuweRuimte(s.ruimte)) : [];
  const platMarkeer = uniek([...nieuwPlat.map((s) => `dak.dakplaat_${s.ruimte}`), ...nieuwPlat.map((s) => `dak.dak_${s.niveau}`)]);
  for (const [code, lijst] of platDelen) {
    const v = verdeel(lijst[0]!);
    const ruimtes = uniek(nieuwPlat.map((s) => ruimteNaam.get(s.ruimte) ?? '')).filter(Boolean);
    uit.push({
      id: `dak:plat:${code}`, groep: 'winddicht', titel: titelVan('Plat dak', opbouwNaam(code)), hoeveelheid: r1(m2Van(lijst)), eenheid: 'm²',
      detail: [
        lagenZin('Van onder naar boven', lagenVan(lijst[0]!, v.structuur), mat) ?? '',
        ...(dak ? [`Dakbedekking: ${bedekkingTekst(dak.platBedekking)}, met afschot naar de afvoer.`] : []),
        ...(ruimtes.length ? [`Boven ${ruimtes.join(', ').toLowerCase()}.`] : []),
        'Netto, zonder de openingen van de dakramen. Het plafond staat bij de binnenafwerking.',
      ].filter(Boolean),
      intern: hoeveelheden(lijst, v.structuur, mat), dingen: ['dak'], markeer: platMarkeer,
    });
  }
  if (dak && nieuwPlat.length) {
    // Dakrand op de nieuwe buitenmuren onder het platte dak; tegen de buren een aansluiting op hun muur.
    const randen = dak.dakranden.filter((s) => nieuweRuimte(s.muur.plus ?? s.muur.min));
    const statusVan = (s: (typeof randen)[number]) => muurStatus(niveauPlan(plan, s.niveau), s.muur);
    const nieuw = randen.filter((s) => statusVan(s) === 'nieuw'), buren = randen.filter((s) => statusVan(s) === 'buren');
    const lengte = (l: typeof randen) => l.reduce((t, s) => t + (s.tot - s.van), 0);
    if (nieuw.length) {
      uit.push({
        id: 'dakrand', groep: 'winddicht', titel: 'Dakrand', hoeveelheid: r1(lengte(nieuw) / 100), eenheid: 'm',
        detail: [
          'Een opstand met een muurkap (dakrandprofiel) op de nieuwe buitenmuren onder het platte dak.',
          ...(buren.length ? ['Tegen de scheidingsmuren van de buren een aansluiting op hun muur in plaats van een dakrand.'] : []),
        ],
        intern: buren.length ? [`Aansluiting tegen de buren: ${komma(lengte(buren) / 100)} m`] : [], dingen: ['dak'], markeer: uniek(nieuw.map((s) => `dak.dakrand_${s.muur.id}_`)),
      });
    }
    // Afvoeren: één regenafvoer per begonnen 50 m² en één noodafvoer per plat dak (een voorstel; de dakdekker beslist).
    const m2 = oud ? nieuwPlatDak(plan, dak) : dak.m2Plat;
    const daken = uniek(nieuwPlat.map((s) => s.niveau)).length;
    const regen = Math.max(1, Math.ceil(m2 / 50)) * Math.max(1, daken), nood = Math.max(1, daken);
    uit.push({
      id: 'afvoeren', groep: 'winddicht', titel: 'Regenafvoer en noodafvoer van het platte dak', hoeveelheid: regen + nood, eenheid: 'stuks',
      detail: [
        `${regen} regenafvoer${regen === 1 ? '' : 'en'} in het dak, met een afvoerbuis langs de gevel naar de riolering.`,
        `${nood} noodafvoer${nood === 1 ? '' : 'en'} (overloop) door de dakrand, voor als de afvoer verstopt raakt.`,
        'Een voorstel: één regenafvoer per begonnen 50 m². Aantal en plaats bepaalt de dakdekker. Nog niet getekend in de 3D.',
      ],
      intern: [], dingen: ['dak'], markeer: platMarkeer,
    });
  }
  // Dakramen en lichtkoepels, per soort.
  const lichten = (dak?.daklichten ?? []).filter((l) => !l.reden);
  for (const type of uniek(lichten.map((l) => l.licht.type))) {
    const deze = lichten.filter((l) => l.licht.type === type), t = cat.daklichten?.[type];
    const boven = uniek(deze.map((l) => ruimteOp(plan, l.licht.x + l.licht.b / 2, l.licht.y + l.licht.d / 2, niveauVan(l.licht))?.naam ?? '')).filter(Boolean);
    uit.push({
      id: `daklicht:${type}`, groep: 'winddicht', titel: t?.label ?? 'Lichtkoepel', hoeveelheid: deze.length, eenheid: 'stuks',
      detail: [
        `${deze.length} × ${(t?.label ?? 'lichtkoepel').toLowerCase()}, met een opstand in het platte dak${boven.length ? ` boven ${boven.join(', ').toLowerCase()}` : ''}.`,
        `Dagmaat ${t ? `${t.b} × ${t.d} cm` : 'volgens de catalogus'}; de opening in het dak wordt uitgespaard en afgewerkt.`,
        // De buitenzonwering (ronde 11b), op alle of een deel van de dakramen van deze soort.
        ...(() => { const z = deze.filter((l) => l.licht.zonwering).length; return z ? [`${t?.zonwering?.label ?? 'Buitenzonwering (screen)'}${z === deze.length ? (z > 1 ? ' op elk dakraam' : '') : ` op ${z} van de ${deze.length}`}.`] : []; })(),
      ],
      intern: [], dingen: ['dak'], markeer: deze.map((l) => `dak.daklicht_${l.licht.id}_`),
    });
  }
  // Buitenschrijnwerk: elke positie met een aantal (wat blijft, staat er met aantal 0 en niet hier).
  for (const p of (opties.posities ?? []).filter((x) => x.aantal > 0 && x.soort !== 'ander')) {
    uit.push({
      id: `positie:${p.id}`, groep: 'winddicht', titel: p.kort ?? p.naam, hoeveelheid: p.aantal, eenheid: 'stuks',
      detail: [...(p.kort && p.kort !== p.naam ? [`${p.naam}.`] : []), ...(p.detail ?? [])], intern: [], dingen: positieDingen(p.id),
    });
  }
  // Gevelbekleding, per materiaal en kleur (netto, zonder ramen en deuren), en de sokkel.
  if (plan.gevelOntwerp && cat.gevels) {
    // Een strook (ronde 14) telt bij haar materiaal, met haar eigen ding (`strook:<id>`); het muurvlak eronder telt ze niet.
    const per = new Map<string, { m2: number; sokkel: number; sleutels: string[]; stroken: string[]; strookM2: number; materiaal: string; kleur: string; voeg?: string }>();
    for (const v of gevelOppervlaktes(plan)) {
      if (!v.keuze || v.netto + v.sokkel <= 0) continue;
      const k = `${v.keuze.materiaal}:${v.keuze.kleur}:${v.keuze.voeg ?? ''}`;
      const x = per.get(k) ?? { m2: 0, sokkel: 0, sleutels: [], stroken: [], strookM2: 0, ...v.keuze };
      x.m2 += v.netto; x.sokkel += v.sokkel;
      if (v.strook) { x.stroken.push(v.strook); x.strookM2 += v.netto; } else x.sleutels.push(v.sleutel);
      per.set(k, x);
    }
    for (const [k, x] of per) {
      const m = cat.gevels[x.materiaal];
      if (!m || x.m2 <= 0) continue;
      const kleur = m.kleuren[x.kleur]?.label ?? x.kleur;
      const voeg = m.voegen && x.voeg ? m.voegen[x.voeg]?.label : undefined;
      const vlakken = uniek(x.sleutels.map((s) => `gevel:${s}`)), stroken = uniek(x.stroken);
      const dingen = [...vlakken, ...stroken.map((s) => `strook:${s}`)];
      // De lagen achter de bekleding (latten, spouw) uit de opbouw van die muren.
      const wanden = delen.filter((d) => d.plaats === 'buitenwand' && d.ding && vlakken.includes(d.ding));
      const achter = wanden[0] ? lagenVan(wanden[0], verdeel(wanden[0]).buiten).filter((l) => l.rol !== 'afwerking_buiten') : [];
      const waar = [
        ...(vlakken.length ? [vlakken.length === 1 ? 'één muurvlak' : `${vlakken.length} muurvlakken`] : []),
        ...(stroken.length ? [stroken.length === 1 ? `een strook (${komma(x.strookM2)} m²)` : `${stroken.length} stroken (samen ${komma(x.strookM2)} m²)`] : []),
      ];
      uit.push({
        id: `gevel:${k}`, groep: 'winddicht', titel: `Gevelbekleding: ${kleinEerst(m.label)}`, hoeveelheid: r1(x.m2), eenheid: 'm²',
        detail: [
          `${m.label}, ${kleur.toLowerCase()}${voeg ? `, voeg ${voeg.toLowerCase()}` : ''}.`,
          ...(m.uitleg ? [m.uitleg] : []),
          ...(achter.length ? [lagenZin('Erachter', achter, mat)!] : []),
          `Op ${waar.join(' en ')}; netto, zonder ramen en deuren.`,
        ],
        intern: hoeveelheden(wanden, new Set(wanden.flatMap((d) => [...verdeel(d).buiten])), mat), dingen,
      });
    }
    const sokkel = plan.gevelOntwerp.sokkel;
    const sokkelM2 = [...per.values()].reduce((t, x) => t + x.sokkel, 0);
    if (sokkel && sokkel.hoogte > 0 && sokkelM2 > 0) {
      const m = cat.gevels[sokkel.materiaal];
      uit.push({
        id: 'sokkel', groep: 'winddicht', titel: `Sokkel: ${kleinEerst(m?.label ?? sokkel.materiaal)}`, hoeveelheid: r1(sokkelM2), eenheid: 'm²',
        detail: [`${sokkel.hoogte} cm hoog onderaan de nieuwe gevels, ${(m?.kleuren[sokkel.kleur]?.label ?? sokkel.kleur).toLowerCase()}.`], intern: [],
        dingen: uniek([...per.values()].filter((x) => x.sokkel > 0).flatMap((x) => x.sleutels.map((s) => `gevel:${s}`))),
      });
    }
  }
  uit.push(...extra('winddicht'));

  // ---------- binnenafwerking ----------
  for (const [code, lijst] of opPlaats('binnenwand')) {
    const alle = new Set(lijst[0]!.deel.lagen.map((l) => l.index));
    const naast = uniek(lijst.flatMap((d) => (d.ding?.startsWith('wand:') ? [] : [d.muur?.muur.plus, d.muur?.muur.min])).filter((x): x is string => nieuweRuimte(x)));
    uit.push({
      id: `wand:binnenwand:${code}`, groep: 'binnen', titel: titelVan('Binnenwand', opbouwNaam(code)), hoeveelheid: r1(m2Van(lijst)), eenheid: 'm²',
      detail: [lagenZin('Opbouw', lagenVan(lijst[0]!, alle), mat) ?? '', 'Netto, zonder de deuren.'].filter(Boolean),
      intern: hoeveelheden(lijst, alle, mat), dingen: uniek([...naast.map((id) => `ruimte:${id}`), ...lijst.map((d) => d.ding).filter((x): x is string => !!x?.startsWith('wand:'))]),
    });
  }
  const nieuweRuimtes = plan.ruimtes.filter((r) => r.bestaand !== true);
  if (nieuweRuimtes.length) {
    // De wanden binnen: de afwerking (gipsplaat) uit de opbouw van de buitenwanden en de gekozen afwerking per ruimte.
    const binnenLaag = delen.filter((d) => d.plaats === 'buitenwand').flatMap((d) => lagenVan(d, verdeel(d).binnen))[0];
    // "Ook op de bestaande muren" alleen als er naast een nieuwe ruimte een muur staat die blijft: de bestaande gevel of
    // de scheidingsmuur van de buren (vroeger altijd, ook bij een nieuwe woning: doorloop B3).
    const blijft = (status: string) => oud && murenPer.some((ms) => ms.some((m) => muurStatus(plan, m) === status && [m.plus, m.min].some((id) => nieuweRuimte(id))));
    const ookBestaand = blijft('bestaand'), ookBuren = blijft('buren');
    const ook = ookBestaand && ookBuren ? '; ook op de bestaande muren en de muren van de buren aan de binnenkant' : ookBestaand ? '; ook op de bestaande muren aan de binnenkant' : ookBuren ? '; ook op de muren van de buren aan de binnenkant' : '';
    const perWand = new Map<string, { m2: number; ruimtes: string[]; accent?: string[] }>();
    // Ronde 12: plafond, plint en accentmuur per ruimte (alleen als ze gekozen zijn; anders alles zoals vroeger).
    const binnen = new Map(nieuweRuimtes.filter((r) => r.plafond || r.plint || r.accent).map((r) => [r.id, binnenMaten(plan, cat, r, murenPer[niveauVan(r)]!)]));
    for (const r of nieuweRuimtes) {
      const m = ruimteMaten(plan, r, murenPer[niveauVan(r)]);
      const accent = r.accent ? binnen.get(r.id)?.accent ?? 0 : 0;
      const x = perWand.get(r.wand) ?? { m2: 0, ruimtes: [] };
      x.m2 += accent ? Math.max(0, m.wand - accent) : m.wand; x.ruimtes.push(r.id);
      perWand.set(r.wand, x);
      if (accent && r.accent) {
        // De accentmuur bij de afwerking die ze heeft, met "(accentmuur)" achter de naam van de ruimte.
        const a = perWand.get(r.accent.wand) ?? { m2: 0, ruimtes: [] };
        a.m2 += accent;
        (a.accent ??= []).push(r.id);
        perWand.set(r.accent.wand, a);
      }
    }
    for (const [wand, x] of perWand) {
      const w = cat.wanden[wand];
      const namen = [...x.ruimtes.map((id) => ruimteNaam.get(id) ?? ''), ...(x.accent ?? []).map((id) => `${ruimteNaam.get(id) ?? ''} (accentmuur)`)];
      uit.push({
        id: `binnenwanden:${wand}`, groep: 'binnen', titel: `Wanden binnen: ${kleinEerst(w?.label ?? wand)}`, hoeveelheid: r1(x.m2), eenheid: 'm²',
        detail: [
          ...(binnenLaag ? [`${hoofd(laagTekst(binnenLaag, mat))} op de nieuwe buitenwanden (uit hun opbouw)${ook}.`] : []),
          `Afwerking: ${(w?.label ?? wand).toLowerCase()}, in ${namen.join(', ').toLowerCase()}.`,
          'Netto, zonder ramen en deuren.',
        ],
        intern: [], dingen: uniek([...x.ruimtes, ...(x.accent ?? [])]).map((id) => `ruimte:${id}`),
      });
    }
    // Het plafond: de lagen onder de balken van het platte dak (de keuze van het plafond zelf komt in een volgende ronde).
    const plafond = platDelen.flatMap(([, lijst]) => lijst);
    const plafondLagen = plafond[0] ? lagenVan(plafond[0], verdeel(plafond[0]).binnen) : [];
    if (plafondLagen.length) {
      const onder = uniek(nieuwPlat.map((s) => s.ruimte));
      uit.push({
        id: 'plafond', groep: 'binnen', titel: titelVan('Plafond', plafondLagen.find((l) => l.rol === 'afwerking_binnen')?.naam ?? plafondLagen[0]!.naam), hoeveelheid: r1(m2Van(plafond)), eenheid: 'm²',
        detail: [
          lagenZin('Van boven naar onder', [...plafondLagen].reverse(), mat)!, 'Onder het platte dak; netto, zonder de openingen van de dakramen.',
          // Ronde 12: met een gekozen plafond staat de afwerking in een eigen post.
          ...([...binnen.values()].some((b) => b.plafond > 0) ? ['De afwerking van het plafond: zie Plafondafwerking.'] : []),
        ],
        intern: hoeveelheden(plafond, new Set(plafondLagen.map((l) => l.index)), mat), dingen: onder.map((id) => `ruimte:${id}`),
      });
    }
    // Ronde 12: de afwerking van het plafond per soort (m², netto vloeroppervlakte) en de plinten per soort (lopende meter,
    // zonder de deuren). Alleen als een ruimte ze heeft.
    const perSoort = (veld: 'plafond' | 'plint') => {
      const per = new Map<string, { hoeveel: number; ruimtes: string[] }>();
      for (const r of nieuweRuimtes) {
        const code = r[veld], b = binnen.get(r.id)?.[veld] ?? 0;
        if (!code || b <= 0) continue;
        const x = per.get(code) ?? { hoeveel: 0, ruimtes: [] };
        x.hoeveel += b; x.ruimtes.push(r.id);
        per.set(code, x);
      }
      return per;
    };
    const inRuimtes = (ids: string[]) => ids.map((id) => ruimteNaam.get(id) ?? '').join(', ').toLowerCase();
    for (const [code, x] of perSoort('plafond')) {
      const p = cat.plafonds?.[code];
      uit.push({
        id: `plafond:${code}`, groep: 'binnen', titel: `Plafondafwerking: ${kleinEerst(p?.label ?? code)}`, hoeveelheid: r1(x.hoeveel), eenheid: 'm²',
        detail: [
          `${p?.label ?? code} in ${inRuimtes(x.ruimtes)}.`,
          ...(p?.verlaagd ? [`Verlaagd tot ${p.verlaagd} cm onder de muurhoogte${p.spots ? ', met inbouwspots (de elektriciteit staat bij de techniek)' : ''}.`] : []),
          'Netto oppervlakte.',
        ],
        intern: [], dingen: x.ruimtes.map((id) => `ruimte:${id}`),
      });
    }
    // De vloer: de gekozen afwerking per soort, op de lagen van de vloeropbouw boven de vloerplaat.
    const grond = delen.filter((d) => d.plaats === 'grondvloer');
    const opbouwBoven = grond[0] ? lagenVan(grond[0], verdeel(grond[0]).structuur).filter((l) => l.index > grond[0]!.deel.dragend) : [];
    const perVloer = new Map<string, { m2: number; ruimtes: string[] }>();
    for (const r of nieuweRuimtes) {
      const m = ruimteMaten(plan, r, murenPer[niveauVan(r)]);
      const x = perVloer.get(r.vloer) ?? { m2: 0, ruimtes: [] };
      x.m2 += m.netto; x.ruimtes.push(r.id);
      perVloer.set(r.vloer, x);
    }
    for (const [vloer, x] of perVloer) {
      const v = cat.vloeren[vloer];
      const opGrond = x.ruimtes.some((id) => niveauVan(plan.ruimtes.find((r) => r.id === id)!) === 0);
      uit.push({
        id: `vloer:${vloer}`, groep: 'binnen', titel: `Vloer: ${kleinEerst(v?.label ?? vloer)}`, hoeveelheid: r1(x.m2), eenheid: 'm²',
        detail: [
          `${v?.label ?? vloer} in ${x.ruimtes.map((id) => ruimteNaam.get(id) ?? '').join(', ').toLowerCase()}.`,
          ...(opGrond && opbouwBoven.length ? [lagenZin('Eronder, op de vloerplaat', opbouwBoven, mat)!] : []),
          'Netto oppervlakte, zonder snijverlies.',
        ],
        intern: opGrond ? hoeveelheden(grond, new Set(opbouwBoven.map((l) => l.index)), mat) : [], dingen: x.ruimtes.map((id) => `ruimte:${id}`),
      });
    }
    for (const [code, x] of perSoort('plint')) {
      const p = cat.plinten?.[code];
      uit.push({
        id: `plint:${code}`, groep: 'binnen', titel: `Plinten: ${kleinEerst(p?.label ?? code)}`, hoeveelheid: r1(x.hoeveel), eenheid: 'm',
        detail: [`${p?.label ?? code}${p ? `, ${p.hoogte} cm hoog` : ''}, in ${inRuimtes(x.ruimtes)}.`, 'Langs de muren, zonder de deuren en de ramen tot op de vloer.'],
        intern: [], dingen: x.ruimtes.map((id) => `ruimte:${id}`),
      });
    }
  }
  // Binnendeuren in het nieuwe werk (een deur in de bestaande gevel staat bij de opening hierboven).
  const deuren = new Map<string, { n: number; ruimtes: string[] }>();
  for (const o of plan.openingen) {
    if (o.soort !== 'binnendeur') continue;
    const m = muurVanOpening(o, murenPer[niveauVan(o)] ?? []);
    if (oud && m && muurStatus(plan, m) !== 'nieuw') continue;
    const x = deuren.get(o.deurtype ?? 'schilder') ?? { n: 0, ruimtes: [] };
    x.n++;
    if (m) x.ruimtes.push(...[m.plus, m.min].filter((id): id is string => !!id));
    deuren.set(o.deurtype ?? 'schilder', x);
  }
  for (const [type, x] of deuren) {
    const t = cat.binnendeuren[type];
    uit.push({
      id: `binnendeur:${type}`, groep: 'binnen', titel: `Binnendeuren: ${kleinEerst(t?.label ?? type)}`, hoeveelheid: x.n, eenheid: 'stuks',
      detail: [`${x.n} × ${(t?.label ?? type).toLowerCase()}, met kader en klink.`], intern: [], dingen: uniek(x.ruimtes).map((id) => `ruimte:${id}`),
    });
  }
  uit.push(...extra('binnen'));

  // ---------- techniek ----------
  const tc = cat.techniek;
  const nieuwPlan = nieuweTechniek(plan);
  const sanitair = plan.meubels.filter((m) => {
    const v = cat.meubels[m.type]?.vorm;
    if (!v || !['wc', 'lavabo', 'douche', 'bad'].includes(v)) return false;
    const f = meubelVoetafdruk(m);
    return !isBestaand(plan, ruimteOp(plan, f.x + f.b / 2, f.y + f.d / 2, niveauVan(m))?.id);
  });
  const regels = tc ? telTechniek(nieuwPlan, tc, { vloerHoogte: (n) => vloerHoogte(plan, n) }) : [];
  for (const vak of ['elektriciteit', 'klimaat', 'ventilatie', 'sanitair'] as TechniekVak[]) {
    const deze = regels.filter((r) => r.groep === vak);
    const meubels = vak === 'sanitair' ? sanitair : [];
    if (!deze.length && !meubels.length) continue;
    const toestellen = deze.filter((r) => r.soort === 'toestel'), leidingen = deze.filter((r) => r.soort === 'leiding');
    const meubelTel = new Map<string, number>();
    for (const m of meubels) meubelTel.set(cat.meubels[m.type]!.label, (meubelTel.get(cat.meubels[m.type]!.label) ?? 0) + 1);
    const stuks = toestellen.reduce((t, r) => t + r.aantal, 0) + meubels.length;
    uit.push({
      id: `techniek:${vak}`, groep: 'techniek', titel: TECHNIEK_VAKKEN[vak].label, hoeveelheid: stuks, eenheid: 'stuks',
      detail: [
        ...[...meubelTel].map(([label, n]) => `${n} × ${label.toLowerCase()}`),
        ...toestellen.map((r) => `${r.aantal} × ${kleinEerst(r.label)}`),
        // Een ledstrip (ronde 15) is licht dat je ziet, geen leiding ertussen.
        ...leidingen.filter((r) => tc?.leidingen[r.materiaal]?.ledstrip).map((r) => `${r.aantal} × ${kleinEerst(r.label)}`),
        ...(leidingen.some((r) => !tc?.leidingen[r.materiaal]?.ledstrip) ? [`De leidingen ertussen: ${uniek(leidingen.filter((r) => !tc?.leidingen[r.materiaal]?.ledstrip).map((r) => kleinEerst(r.label))).join(', ')}.`] : []),
        TECHNIEK_VOORBEHOUD,
      ],
      intern: leidingen.map((r) => `${hoofd(r.label)}${r.doorsnede ? `, ${r.doorsnede}` : ''}: ${r.aantal} leiding${r.aantal === 1 ? '' : 'en'}, samen ${komma(r.lengte ?? 0)} m`),
      dingen: [
        ...(nieuwPlan.toestellen ?? []).filter((t) => tc?.toestellen[t.type]?.vak === vak).map((t) => `toestel:${t.id}`),
        ...(nieuwPlan.leidingen ?? []).filter((l) => tc?.leidingen[l.soort]?.vak === vak).map((l) => `leiding:${l.id}`),
        ...meubels.map((m) => `meubel:${m.id}`),
      ],
    });
  }
  uit.push(...extra('techniek'));

  // ---------- bijgebouwen en buitenwerk, supplementen ----------
  // Een carport, tuinhuis, loods of staalwerk (vroeger bij de supplementen, ook als het het hele project was: doorloop B25).
  uit.push(...extra('buitenwerk'));
  uit.push(...extra('supplementen'));
  return uit;
}

/** De posten waar een ding van de 3D bij hoort (een tik op het dak, een gevel, een raam …). */
export function postenVanDing(posten: Post[], ding: string): Post[] {
  return posten.filter((p) => p.dingen.includes(ding));
}

/** Een post zoals de klant hem krijgt (in het bestand voor de klant): zonder de hoeveelheden die alleen voor de aannemer zijn. */
export interface KlantPost {
  groep: string;
  titel: string;
  detail: string[];
  /** Alleen een aantal stuks (3 dakramen, 1 hef-schuifdeur); m² en lopende meter zijn voor de aannemer. */
  aantal?: number;
  dingen?: string[];
  /** Om de post in de 3D aan te duiden (zie `Post.markeer`). */
  markeer?: string[];
}

/** De posten voor de klant: groep in woorden, titel en detail, een aantal alleen in stuks, zonder het materiaal (`intern`). */
export function klantPosten(posten: Post[]): KlantPost[] {
  return posten.map((p) => ({
    groep: POST_GROEP_NAAM[p.groep], titel: p.titel, detail: p.detail,
    ...(p.eenheid === 'stuks' && p.hoeveelheid !== undefined ? { aantal: p.hoeveelheid } : {}),
    ...(p.dingen.length ? { dingen: p.dingen } : {}),
    ...(p.markeer?.length ? { markeer: p.markeer } : {}),
  }));
}

/** Een hoeveelheid in woorden ("12,4 m²", "3 stuks"), of leeg. */
export function hoeveelheidTekst(p: Pick<Post, 'hoeveelheid' | 'eenheid'>): string {
  if (p.hoeveelheid === undefined) return p.eenheid ?? '';
  const stuk = p.eenheid === 'stuks' && p.hoeveelheid === 1 ? 'stuk' : p.eenheid;
  return `${komma(p.hoeveelheid)}${stuk ? ` ${stuk}` : ''}`;
}

/**
 * De posten als tekst om te kopiëren (tabs tussen de kolommen: plakt als tabel in Excel of Word): groep, post,
 * hoeveelheid, eenheid en het detail. Met `intern` ook de hoeveelheden van materiaal. Geen prijzen.
 */
export function postenTekst(posten: Post[], opties: { intern?: boolean; kop?: string } = {}): string {
  const regels = [opties.kop ?? 'Werken, post per post, in de volgorde van het bouwen', '', ['Groep', 'Post', 'Hoeveelheid', 'Eenheid', 'Detail'].join('\t')];
  const schoon = (s: string) => s.replace(/[\t\n]+/g, ' ');
  for (const p of posten) {
    const detail = [...p.detail, ...(opties.intern ? p.intern : [])].map(schoon).join(' · ');
    regels.push([POST_GROEP_NAAM[p.groep], schoon(p.titel), p.hoeveelheid === undefined ? '' : komma(p.hoeveelheid), p.eenheid ?? '', detail].join('\t'));
  }
  return `${regels.join('\n')}\n`;
}
