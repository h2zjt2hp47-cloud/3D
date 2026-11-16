/**
 * Het voorbeeldproject (ronde 11): *Uitbouw achter een rijwoning (voorbeeld)*. Een uitbouw in houtskelet achter een
 * rijwoning, tussen de twee scheidingsmuren van de buren, met een plat dak en dakrand, drie platte dakramen van 120 × 120
 * met buitenzonwering (screen), een hef-schuifraam van 4,00 × 2,35 m met twee screens en raamventilatie in de achtergevel, de achtergevel in thermisch behandeld hout (verticaal), binnen
 * gipsplaat schilderklaar, een vloer in tegels, elektriciteit (schakelaars, stopcontacten, inbouwspots, een kleine
 * verdeelkast), sanitair (een hangtoilet in een kleine wc, een buitenkraan) en het werk zonder ding: afbraak van het
 * terras, grondwerken en een container.
 *
 * Opgemaakt naar de geanonimiseerde tabel van twee echte offertes voor hetzelfde werk (docs/analyse-bouw-3d-voor-klanten.md
 * hoofdstuk 10), zonder namen, adressen, merken of bedragen. De maatstaf van Jonas: *"kunnen we deze offerte nu tonen,
 * post per post?"*
 *
 * **Voorbeeldmaten**: breedte 5,40 m en diepte 4,00 m van de uitbouw, de wc van 1,10 × 1,50 m, de plaats van de dakramen,
 * de toestellen en de leidingen, en de hoeveelheden van het werk zonder ding staan niet in die tabel en zijn verzonnen.
 * Het hef-schuifraam (4,00 × 2,35 m), de twee screens, de raamventilatie en de drie platte dakramen van 120 × 120 met
 * zonwering komen uit de tabel (ronde 11b; een zelfregelend rooster als ventilatie en de screens gelijk verdeeld zijn een
 * keuze, de tabel zegt het niet). De opbouwen zijn de voorbeelden van de catalogus (door geen vakman nagelezen).
 */
import { liggingHoogte, nieuwToestel, tekenRuimteIn, type Keuzes, type Leiding, type Plattegrond, type Punt, type Toestel } from '../src/index.js';
import type { HandmatigePost } from '../src/posten.js';
import { leidingLangsWanden, tegenWand } from '../src/techniekplaatsen.js';
import { aansluitHoogte } from '../src/techniek.js';
import { daklichtCatalogus } from './inrichting.js';
import { aanbouwKeuzes, aanbouwNaarPlan } from './snelstart.js';
import { stijlCatalogus } from './stijlen.js';
import { techniekCatalogus } from './techniek.js';
import type { DemoPositie } from './woning.js';

export const UITBOUW_VOORBEELD_NAAM = 'Uitbouw achter een rijwoning (voorbeeld, 5,40 × 4,00 m)';
export const UITBOUW_VOORBEELD_UITLEG = 'Uitbouw in houtskelet tussen twee buren: plat dak, drie platte dakramen met screen, hef-schuifraam van 4 m met twee screens, houten achtergevel, techniek en werk zonder ding. Breedte en diepte zijn voorbeeldmaten.';

/** Voorbeeldmaten (cm) van de uitbouw en de wc erin. */
const B = 540, D = 400, WC = { b: 110, d: 150 };

export function uitbouwVoorbeeld(): { plan: Plattegrond; posities: DemoPositie[]; werken: HandmatigePost[] } {
  const stijl = stijlCatalogus.hout!;
  // Tussen twee buren, de achtergevel in thermisch behandeld hout (de stijl Hout en zwart: zwarte ramen).
  const k: Keuzes = { ...aanbouwKeuzes({ breedte: B * 10, diepte: D * 10, hoogte: 3000 }, stijl), bekleding: 'thermowood', buren: 'twee' };
  const { plan, posities } = aanbouwNaarPlan(k);
  const W = 900, Y1 = W + D;

  // Binnen gipsplaat, schilderklaar (niet geschilderd), en een vloer in tegels.
  const uitbouw = plan.ruimtes.find((r) => r.id === 'uitbouw')!;
  uitbouw.wand = 'schilderklaar';
  uitbouw.vloer = 'tegel_grijs';

  // De doorgang in de bestaande achtergevel (3 m breed), links van de wc.
  const doorgang = plan.openingen.find((o) => o.soort === 'doorgang')!;
  doorgang.midden = 215;
  doorgang.breedte = 300;

  // Een kleine wc rechts vooraan, met een deur naar de uitbouw.
  tekenRuimteIn(plan, { id: 'wc', naam: 'Wc', type: 'wc', x: B - WC.b, y: W, b: WC.b, d: WC.d, vloer: 'tegel_grijs', wand: 'schilderklaar' });
  plan.openingen.push({ id: 'd_wc', soort: 'binnendeur', as: 'v', lijn: B - WC.b, midden: W + WC.d / 2, breedte: 80, hoogte: 211, borstwering: 0, scharnier: 'begin', naarPlus: true, deurtype: 'schilder' });
  plan.meubels.push({ id: 'm_wc', type: 'wc', x: B - 75, y: W + 6, b: 40, d: 55, rotatie: 0 });

  // Het hef-schuifraam van 4,00 × 2,35 m in het midden van de achtergevel.
  const raam = plan.openingen.find((o) => o.positie === posities.find((p) => p.aantal > 0)?.id)!;
  raam.breedte = 400;
  raam.hoogte = 235;
  raam.midden = B / 2;
  const p = posities.find((x) => x.id === raam.positie)!;
  // Twee screens naast elkaar (gelijk verdeeld, half neer in de 3D) en een zelfregelend rooster (ronde 11b).
  p.keuzes = { ...p.keuzes, breedte: 4000, hoogte: 2350, zonwering: 'screen', screens: 's2', screen_verdeling: 'gelijk', zon_stand: 'half', rooster: true, ventilatie_soort: 'rooster' };
  p.naam = 'Hef-schuifraam achtergevel';

  // Drie platte dakramen van 120 × 120 op een rij, achter de wc, met een screen half dicht (ronde 11b).
  const t = daklichtCatalogus.dakraam_120!;
  plan.daklichten = [45, 210, 375].map((x, i) => ({ id: `k${i + 1}`, type: 'dakraam_120', x, y: W + WC.d + 40, b: t.b, d: t.d, zonwering: 'screen' as const, zonweringStand: 'half' as const }));

  // ---------- techniek ----------
  const cat = techniekCatalogus, H = plan.muurhoogte;
  const toestellen: Toestel[] = [];
  const leidingen: Leiding[] = [];
  plan.toestellen = toestellen;
  plan.leidingen = leidingen;
  let nr = 0, ln = 0;
  const zet = (type: string, punt: Punt, extra: Partial<Toestel> = {}): Toestel => {
    const x = nieuwToestel(cat, type, `t${++nr}`, punt[0], punt[1], H, extra);
    const plaats = x.aan === 'wand' || x.aan === 'buiten' ? tegenWand(plan, x, cat.toestellen[type]!) : undefined;
    const uit = plaats?.toestel ?? x;
    toestellen.push(uit);
    return uit;
  };
  const xy = (x: Toestel | Punt): Punt => (Array.isArray(x) ? x : [x.x, x.y]);
  /** Een leiding langs de wanden, eventueel via tussentoestellen (op en neer naar elk toestel van een kring). */
  const trek = (soort: string, van: Toestel | Punt, naar: Toestel | Punt, o: { via?: Toestel[]; kring?: string; afstand?: number; maat?: number } = {}) => {
    const hoogte = cat.leidingen[soort]!.hoogte, run = liggingHoogte(hoogte, H);
    const stops = [van, ...(o.via ?? []), naar], punten: Punt[] = [], hoogtes: number[] = [];
    for (let i = 1; i < stops.length; i++) {
      const stuk = leidingLangsWanden(plan, xy(stops[i - 1]!), xy(stops[i]!), { niveau: 0, afstand: o.afstand });
      for (const q of i > 1 ? stuk.slice(1) : stuk) { punten.push(q); hoogtes.push(run); }
      const tussen = stops[i]!;
      if (i < stops.length - 1 && !Array.isArray(tussen)) {
        const q = punten[punten.length - 1]!;
        punten.push(q, q);
        hoogtes.push(aansluitHoogte(tussen, cat.toestellen[tussen.type], H), run);
      }
    }
    leidingen.push({
      id: `l${++ln}`, soort, punten, hoogte, niveau: 0, ...(o.via?.length ? { hoogtes } : {}), ...(o.maat !== undefined ? { maat: o.maat } : {}),
      ...(!Array.isArray(van) ? { van: van.id } : {}), ...(!Array.isArray(naar) ? { naar: naar.id } : {}), ...(o.kring ? { kring: o.kring } : {}),
    });
  };
  // Elektriciteit: een kleine verdeelkast tegen de linker scheidingsmuur, stopcontacten, schakelaars en inbouwspots.
  const kast = zet('verdeelbord', [16, W + 50]);
  const sc = [zet('stopcontact_dubbel', [16, W + 210]), zet('stopcontact_dubbel', [16, Y1 - 50]), zet('stopcontact_dubbel', [B - 16, Y1 - 60]), zet('stopcontact', [40, W + 6])];
  const sch = [zet('schakelaar', [385, W + 6]), zet('schakelaar', [B - 16, Y1 - 110]), zet('schakelaar', [B - WC.b - 6, W + WC.d - 20])];
  const spots = [[100, W + 75], [270, W + 75], [100, Y1 - 50], [270, Y1 - 50], [440, Y1 - 50], [B - WC.b / 2, W + WC.d / 2]].map((q) => zet('inbouwspot', q as Punt, { aan: 'plafond' }));
  trek('kabel', kast, sc[sc.length - 1]!, { via: sc.slice(0, -1), kring: 'kring 1, stopcontacten uitbouw' });
  trek('kabel', kast, spots[spots.length - 1]!, { via: [...sch.slice(0, 1), ...spots.slice(0, -1)], kring: 'kring 2, verlichting uitbouw en wc', afstand: 10 });
  // Sanitair: water en afvoer naar het hangtoilet, en een buitenkraan tegen de achtergevel.
  const kraan = zet('buitenkraan', [B - 30, Y1 + 20]);
  const toilet: Punt = [B - 55, W + 30];
  trek('koud_water', [B - 80, W - 30], toilet, { afstand: 6 });
  trek('koud_water', [B - 80, W - 30], kraan, { afstand: 14 });
  trek('afvoer', toilet, [B - 40, Y1 + 60], { maat: 110, afstand: 10 });

  // ---------- werk zonder ding ----------
  const werken: HandmatigePost[] = [
    { id: 'w1', titel: 'Afbraak van het terras', groep: 'voorbereiding', hoeveelheid: 25, eenheid: 'm²', uitleg: 'Het bestaande terras opbreken waar de uitbouw komt, en het puin afvoeren (voorbeeldmaat).' },
    { id: 'w2', titel: 'Grondwerken', groep: 'voorbereiding', hoeveelheid: 12, eenheid: 'm³', uitleg: 'Uitgraven voor de fundering en de vloerplaat, de grond afvoeren (voorbeeldmaat).' },
    { id: 'w3', titel: 'Container voor het afval', groep: 'voorbereiding', hoeveelheid: 1, eenheid: 'stuks', uitleg: 'Een container plaatsen en ophalen, het afval gesorteerd verwerken.' },
  ];
  return { plan, posities, werken };
}
