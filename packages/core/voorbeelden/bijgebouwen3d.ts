/**
 * De 3D en de meetstaat van de bijgebouwen in hout (zie bijgebouwen.ts): uit het resultaat van de motor een
 * samenstelling van bouwdelen (src/bouwdelen.ts), en daaruit de scène in twee weergaven en de meetstaat.
 *
 * Elk bijgebouw is een recept: palen, liggers, een dakvlak, wandvlakken, spanten, een vloervlak. Elk bouwdeel staat
 * op zijn plaats met `plaatsBouwdeel`; de meetstaat is de som van de meetstaten van die bouwdelen. Wat geen bouwdeel
 * is (deur, raam, glasrail, dakrandprofiel, nokvorst, het stuk gevel achter een overkapping) is een los blok en zit
 * niet in de meetstaat.
 *
 * **Een voorstelling, geen berekening** (zie bovenaan bijgebouwen.ts): niets is nagerekend, en geen vakman heeft de
 * opbouw nagelezen.
 *
 * Assen in cm: x = breedte, van links naar rechts gezien van voor; z = diepte, met z = 0 de achterkant (bij «tegen een
 * gevel» de gevel) en de voorkant op z = diepte; y = hoogte vanaf de grond. De vloer of verharding ligt op de grond;
 * alles staat erop.
 *
 * Twee weergaven:
 *   afgewerkt    Een open bouwdeel (zijn eerste laag is het skelet: het dak van een bijgebouw, de plankenwand van een
 *                overkapping, een houten terras) toont zijn hout en daarop de andere lagen over het hele vlak: je ziet
 *                de dakbalken van onderen, zoals in het echt. Een gesloten bouwdeel (de wand van een tuinhuis) toont
 *                zijn binnenste en buitenste laag. Deuren, ramen en gevelvullingen staan erin.
 *   constructie  Elk bouwdeel in zijn constructieweergave: het hele skelet, met de lagen als staal aan het einde.
 *                Zonder deuren en ramen. De buitenmaten zijn dezelfde.
 */
import {
  bouwdeelBlokken, dakvlak, kaderVan, ligger, meetstaat, paal, plaatsBouwdeel, prisma, spant, vloervlak, wandvlak,
  type Balkmaat, type Blok, type BlokSoort, type Bouwdeel, type BouwWeergave, type ConfiguratieResultaat, type MeetstaatRegel, type Opbouw,
  type Scene3D, type VlakRechthoek, type Waarde, type WandOpening,
} from '../src/index.js';
import {
  BIJGEBOUW_LATEI, bijgebouwDak, bijgebouwGlaswand, bijgebouwMaterialen as M, bijgebouwSchutting, bijgebouwVloer, bijgebouwWand, TUINHUIS_OPENINGEN,
  type BijgebouwBedekking, type BijgebouwVloer,
} from './bijgebouwen.js';

type Draai = 0 | 90 | 180 | 270;

/** Een bouwdeel op zijn plaats in het bijgebouw. */
export interface GeplaatstBouwdeel {
  /** Voorvoegsel van zijn blokken in de 3D, uniek binnen het bijgebouw (bv. `paal.3`, `wand.links.1`, `dak.1`). */
  code: string;
  deel: Bouwdeel;
  /** Minimumhoek van het bouwdeel in het bijgebouw (cm), ná de draaiing. */
  x: number;
  y: number;
  z: number;
  draai: Draai;
  /**
   * Open bouwdeel: de eerste laag is het skelet en blijft in de afgewerkte weergave zichtbaar. `dek` is hetzelfde
   * bouwdeel met alleen de lagen boven het skelet (leeg bij een open dak); het ligt `dekOmhoog` cm hoger. Alleen om te
   * tekenen: de meetstaat telt het volledige bouwdeel.
   */
  open?: boolean;
  dek?: Bouwdeel | null;
  dekOmhoog?: number;
}

/** Een bijgebouw als samenstelling van bouwdelen, met de losse blokken erbij. */
export interface BijgebouwSamenstelling {
  delen: GeplaatstBouwdeel[];
  /** Losse blokken in beide weergaven: het stuk gevel, het dakrandprofiel, de nokvorst, de rails van een glazen wand. */
  vast: Blok[];
  /** Losse blokken van de afwerking, alleen in de afgewerkte weergave: deuren, ramen, gevelvulling onder een hellend dak. */
  afwerking: Blok[];
  /** Wat de bouwdelen aangepast of weggelaten hebben, in gewone taal (hoort leeg te zijn). */
  meldingen: string[];
}

const r2 = (x: number) => Math.round(x * 100) / 100 + 0;
const num = (v: unknown, standaard = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : standaard);
const tekst = (v: unknown, standaard: string) => (typeof v === 'string' && v ? v : standaard);
const mm = (cm: number) => Math.round(cm * 10);
const rad = (graden: number) => (graden * Math.PI) / 180;
const dikteCm = (o: Opbouw | null) => (o ? o.lagen.reduce((som, l) => som + l.dikte, 0) / 10 : 0);
const waarden = (r: ConfiguratieResultaat): Record<string, Waarde> => Object.fromEntries(r.kenmerken.map((k) => [k.code, k.waarde]));

/** Dikte van een boeiboord of windveer (cm). */
const BOEI = 2.2;
/** Zoveel hangt een boeiboord onder de dakbalken (cm). */
const BOEI_ONDER = 2;
/** Lengte van een schoor, horizontaal en verticaal gemeten (cm), en haar breedte in haar vlak (cm). Eigen keuze. */
const SCHOOR = { arm: 60, breedte: 12 };
/** Gordingen op de spanten van een zadeldak: doorsnede (cm) en de grootste afstand ertussen, horizontaal (cm). Eigen keuze. */
const GORDING = { b: 5, h: 15, afstand: 200 };
/** Nokbalk en makelaars van het zadeldak van een tuinhuis (cm). Eigen keuze. */
const NOKBALK = { b: 7, h: 20, makelaar: 7 };
/** Palen en liggers van de luifel van een tuinhuis (cm): de maten van de zware paal van de overkapping (15 × 15, hoogstens 5 m uit elkaar). */
const LUIFEL = { paal: 15, ligger_b: 7, ligger_h: 20, afstand: 500 };
/** Dikte van de vloerplaat van een tuinhuis (cm), en hoeveel ze buiten de wanden steekt. */
const VLOERPLAAT = { dikte: 12, rand: 5 };
/** Dikte van de hoekplank die de hoek van een tuinhuis sluit (cm): de dikte van de gevelplanken. */
const HOEKPLANK = 2;
const DONKER = '#2b2b2b';
/** Zoveel is het kader van de scène rondom ruimer dan de blokken, als deel van de grootste maat. */
const KADER_RUIMTE = 0.12;

/** Draait en verschuift blokken in de eigen assen van een bouwdeel zo dat de minimumhoek op (x, y, z) komt. */
function opPlaats(blokken: Blok[], maten: Bouwdeel['maten'], p: { x: number; y: number; z: number; draai: Draai }): Blok[] {
  const dx = p.draai === 90 ? maten.d : p.draai === 180 ? maten.b : 0;
  const dz = p.draai === 180 ? maten.d : p.draai === 270 ? maten.b : 0;
  return plaatsBouwdeel(blokken, { x: p.x + dx, y: p.y, z: p.z + dz, draai: p.draai });
}

const balk = (lengte: number, b: number, h: number, materiaal: string) => ligger({ lengte, doorsnede: { breedte: mm(b), hoogte: mm(h) }, materiaal }, M);
const stijl = (hoogte: number, b: number, d: number, materiaal: string) => paal({ hoogte, doorsnede: { breedte: mm(b), hoogte: mm(d) }, materiaal }, M);

/**
 * Een stuk hout met een eigen doorsnede in een verticaal vlak: een schoor, een schuine ligger, een paal met een schuine
 * kop, een gording die met de helling meedraait, een windveer. Eén prisma, zoals een spantbeen in bouwdelen.ts: `punten`
 * [x, y] in het vlak van het stuk, doorgetrokken over `diep` cm langs z. De minimumhoek komt in de oorsprong.
 * Bouwdelen.ts kent deze stukken niet; ze krijgen de rol en de soort van een ligger of een paal.
 */
function prismaStuk(soort: 'ligger' | 'paal', materiaal: string, doorsnede: Balkmaat, lengte: number, diep: number, punten: [number, number][]): Bouwdeel {
  const x0 = Math.min(...punten.map((q) => q[0])), y0 = Math.min(...punten.map((q) => q[1]));
  const m = M[materiaal];
  const code = `skelet.${soort}.1`;
  const blok = prisma(code, m?.soort ?? 'gevel', m?.kleur ?? '#b8b8b8', 'z', 0, diep, punten.map(([x, y]): [number, number] => [x - x0, y - y0]));
  return {
    soort, maten: { b: blok.b, h: blok.h, d: blok.d },
    stukken: [{ code, rol: soort, materiaal, doorsnede: { vorm: 'rechthoek', ...doorsnede }, lengte: r2(lengte), blok }],
    lagen: [], dragend: -1,
    meldingen: m ? [] : [`Het materiaal «${materiaal}» staat niet in de materialenlijst: het stuk is grijs getekend.`],
  };
}

/** Een balk die stijgt over een horizontale lengte L (tan = stijging per cm), te lood afgesneden; `hoogte` verticaal gemeten. */
const stijgend = (L: number, tan: number, hoogte: number): [number, number][] => [[0, 0], [L, L * tan], [L, L * tan + hoogte], [0, hoogte]];

/**
 * Een vlak bekleding dat geen wandvlak is (de gevelvulling onder een hellend dak): alleen een laag met haar
 * oppervlakte, zodat de meetstaat ze telt. Het blok zelf is een los prisma in de afwerking.
 */
function bekledingsDeel(materiaal: string, m2: number): Bouwdeel {
  const m = M[materiaal];
  return {
    soort: 'wandvlak', maten: { b: 0, h: 0, d: 0 }, stukken: [], dragend: 0, meldingen: [],
    lagen: [{ index: 0, naam: 'Gevelplanken', rol: 'afwerking_buiten', materiaal, dikte: 20, van: 0, tot: 2, getekend: [0, 2], soort: m?.soort ?? 'planken', kleur: m?.kleur ?? '#b8b8b8', oppervlakte: r2(m2) }],
  };
}

/** Houdt de bouwdelen en de losse blokken van één bijgebouw bij. */
class Samensteller {
  delen: GeplaatstBouwdeel[] = [];
  vast: Blok[] = [];
  afwerking: Blok[] = [];
  private tellers = new Map<string, number>();

  private code(basis: string): string {
    const n = (this.tellers.get(basis) ?? 0) + 1;
    this.tellers.set(basis, n);
    return `${basis}.${n}`;
  }

  /** Zet een bouwdeel met zijn minimumhoek op (x, y, z), na de draaiing. */
  zet(basis: string, deel: Bouwdeel, x: number, y: number, z: number, draai: Draai = 0, extra: Partial<GeplaatstBouwdeel> = {}): GeplaatstBouwdeel {
    const g: GeplaatstBouwdeel = { code: this.code(basis), deel, x: r2(x), y: r2(y), z: r2(z), draai, ...extra };
    this.delen.push(g);
    return g;
  }

  /**
   * Zet een wand, vloer of dak. Is de eerste laag van de opbouw het skelet, dan is het een open bouwdeel: `maak` wordt
   * een tweede keer geroepen met alleen de lagen erboven (en met het volledige bouwdeel, voor de openingen).
   */
  vlak(basis: string, opbouw: Opbouw, maak: (o: Opbouw, vol?: Bouwdeel) => Bouwdeel, x: number, y: number, z: number, draai: Draai = 0): GeplaatstBouwdeel {
    const deel = maak(opbouw);
    const eerste = opbouw.lagen[0];
    if (eerste?.rol !== 'skelet') return this.zet(basis, deel, x, y, z, draai);
    const dek = opbouw.lagen.length > 1 ? maak({ ...opbouw, naam: `${opbouw.naam} (boven het skelet)`, lagen: opbouw.lagen.slice(1) }, deel) : null;
    const v = deel.vlak;
    const dekOmhoog = !v || v.ligging === 'staand' ? 0 : eerste.dikte / 10 / Math.cos(rad(v.helling));
    return this.zet(basis, deel, x, y, z, draai, { open: true, dek, dekOmhoog });
  }

  /** Een los rechthoekig blok. */
  blok(lijst: Blok[], code: string, soort: BlokSoort, kleur: string, x: number, y: number, z: number, b: number, h: number, d: number, extra: Partial<Blok> = {}) {
    if (b > 0.01 && h > 0.01 && d > 0.01) lijst.push({ code, soort, vorm: 'blok', kleur, x: r2(x), y: r2(y), z: r2(z), b: r2(b), h: r2(h), d: r2(d), ...extra });
  }

  /** Losse blokken in de eigen assen van een geplaatst bouwdeel (bv. een deur in een wand) op hun plaats zetten. */
  bij(lijst: Blok[], g: GeplaatstBouwdeel, lokaal: Blok[]) {
    lijst.push(...opPlaats(lokaal.map((b) => ({ ...b, code: `${g.code}.${b.code}` })), g.deel.maten, g));
  }

  klaar(): BijgebouwSamenstelling {
    return { delen: this.delen, vast: this.vast, afwerking: this.afwerking, meldingen: this.delen.flatMap((g) => g.deel.meldingen.map((m) => `${g.code}: ${m}`)) };
  }
}

/** De blokken van één geplaatst bouwdeel in een weergave, op hun plaats. */
function blokkenVan(g: GeplaatstBouwdeel, weergave: BouwWeergave): Blok[] {
  const voorvoegsel = `${g.code}.`;
  if (weergave === 'constructie' || !g.open) return opPlaats(bouwdeelBlokken(g.deel, weergave, { voorvoegsel }), g.deel.maten, g);
  const skelet = bouwdeelBlokken(g.deel, 'constructie', { voorvoegsel, lagen: false });
  const dek = g.dek ? plaatsBouwdeel(bouwdeelBlokken(g.dek, 'afgewerkt', { voorvoegsel: `${voorvoegsel}dek.` }), { x: 0, y: g.dekOmhoog ?? 0, z: 0 }) : [];
  return opPlaats([...skelet, ...dek], g.deel.maten, g);
}

/** De werkelijke openingen van een wandvlak (na het inkorten), als invoer voor een tweede wandvlak met dezelfde gaten. */
const openingenVan = (deel: Bouwdeel): WandOpening[] => (deel.vlak?.openingen ?? []).map((o) => ({
  soort: o.v0 < 0.01 ? 'deur' : 'raam', x: o.u0, breedte: o.u1 - o.u0, hoogte: o.v1 - o.v0, ...(o.v0 < 0.01 ? {} : { borstwering: o.v0 }),
}));

/**
 * De bovenkant van een deur of raam in een houten wand van hoogte h (cm): hoogstens `gewenst`, en zo dat de latei en
 * de bovenregel (`regel` cm dik) er nog boven passen. Daarbij de hoogte van de latei (mm): blijft er boven de opening
 * maar weinig over, dan vult de latei de ruimte tot de bovenregel; anders komen er korte stijlen boven een gewone latei.
 */
function openingBoven(h: number, regel: number, gewenst: number): { top: number; latei: number } {
  const top = Math.min(gewenst, Math.floor(h - regel - BIJGEBOUW_LATEI / 10 - 0.4)), rest = h - regel - top;
  return { top, latei: rest <= 30 ? Math.round(rest * 100) / 10 : BIJGEBOUW_LATEI };
}

/** Plaatsen op gelijke afstand van `van` tot `tot`, met velden van hoogstens `max`. */
function verdeel(van: number, tot: number, max: number): number[] {
  const n = Math.max(1, Math.ceil((tot - van) / max - 1e-6));
  return Array.from({ length: n + 1 }, (_, i) => van + ((tot - van) * i) / n);
}

// ---------- daken (gedeeld door de overkapping en het tuinhuis) ----------

interface DakBasis {
  /** De rand van het dakvlak, met de oversteek (cm). */
  X0: number;
  X1: number;
  Z0: number;
  Z1: number;
  bedekking: BijgebouwBedekking;
  hout: string;
  geisoleerd?: boolean;
}

/**
 * Plat dak: een dakvlak met de dakbalken langs `richting`, een boeiboord rondom en een dakrandprofiel erop. `y` =
 * onderkant van de dakbalken. Een open dak (pergola) heeft geen boeiboord.
 */
function platDak(S: Samensteller, o: DakBasis & { y: number; richting: 'x' | 'z'; randAchter: boolean }) {
  const opbouw = bijgebouwDak(o.bedekking, o.hout, o.richting === 'z' ? 'dakbeschot_dwars' : 'dakbeschot', o.geisoleerd);
  S.vlak('dak', opbouw, (ob) => dakvlak({ lengte: o.X1 - o.X0, diepte: o.Z1 - o.Z0, opbouw: ob, richting: o.richting }, M), o.X0, o.y, o.Z0);
  if (o.bedekking === 'open') return;
  // Boeiboord: van 2 cm onder de dakbalken tot 3 cm boven de bedekking (de opstand van de dakrand).
  const f = BOEI, hf = Math.ceil(dikteCm(opbouw) + BOEI_ONDER + 3), y = o.y - BOEI_ONDER, bx = o.X1 - o.X0 + 2 * f, bz = o.Z1 - o.Z0;
  S.zet('boeiboord', balk(bx, f, hf, o.hout), o.X0 - f, y, o.Z1);
  if (o.randAchter) S.zet('boeiboord', balk(bx, f, hf, o.hout), o.X0 - f, y, o.Z0 - f);
  S.zet('boeiboord', balk(bz, f, hf, o.hout), o.X0 - f, y, o.Z0, 90);
  S.zet('boeiboord', balk(bz, f, hf, o.hout), o.X1, y, o.Z0, 90);
  // Dakrandprofiel: een donkere kap over het boeiboord.
  const k = 0.5, yk = y + hf, za = o.randAchter ? o.Z0 - f - k : o.Z0;
  S.blok(S.vast, 'dakrand.voor', 'metaal', DONKER, o.X0 - f - k, yk, o.Z1 - k, bx + 2 * k, 1, f + 2 * k);
  if (o.randAchter) S.blok(S.vast, 'dakrand.achter', 'metaal', DONKER, o.X0 - f - k, yk, za, bx + 2 * k, 1, f + 2 * k);
  const zb = o.randAchter ? o.Z0 + k : o.Z0;
  S.blok(S.vast, 'dakrand.links', 'metaal', DONKER, o.X0 - f - k, yk, zb, f + 2 * k, 1, o.Z1 - k - zb);
  S.blok(S.vast, 'dakrand.rechts', 'metaal', DONKER, o.X1 - k, yk, zb, f + 2 * k, 1, o.Z1 - k - zb);
}

/**
 * Lessenaarsdak: één hellend dakvlak met de kepers langs de helling, een boeiboord aan de lage en aan de hoge kant en
 * een windveer langs elke schuine rand. `onder(z)` = hoogte van de onderkant van de kepers op diepte z.
 */
function lessenaarDak(S: Samensteller, o: DakBasis & { onder: (z: number) => number; graden: number; tan: number; cos: number; laag: 'voor' | 'achter'; randHoog: boolean }) {
  const opbouw = bijgebouwDak(o.bedekking, o.hout, 'dakbeschot_dwars', o.geisoleerd);
  const Tv = dikteCm(opbouw) / o.cos, f = BOEI, L = o.Z1 - o.Z0, bx = o.X1 - o.X0 + 2 * f;
  const zLaag = o.laag === 'voor' ? o.Z1 : o.Z0, zHoog = o.laag === 'voor' ? o.Z0 : o.Z1;
  S.vlak('dak', opbouw, (ob) => dakvlak({ lengte: o.X1 - o.X0, diepte: L, helling: o.graden, opbouw: ob }, M), o.X0, o.onder(zLaag), o.Z0, o.laag === 'voor' ? 180 : 0);
  // Aan de lage kant komt het boeiboord gelijk met de bedekking (het water moet eraf); aan de hoge kant 2 cm hoger.
  const hLaag = Tv + BOEI_ONDER, hHoog = Tv + BOEI_ONDER + 2;
  S.zet('boeiboord', balk(bx, f, hLaag, o.hout), o.X0 - f, o.onder(zLaag) - BOEI_ONDER, o.laag === 'voor' ? o.Z1 : o.Z0 - f);
  if (o.randHoog) S.zet('boeiboord', balk(bx, f, hHoog, o.hout), o.X0 - f, o.onder(zHoog) - BOEI_ONDER, o.laag === 'voor' ? o.Z0 - f : o.Z1);
  const windveer = () => prismaStuk('ligger', o.hout, { breedte: mm(f), hoogte: mm(hHoog * o.cos) }, L / o.cos, f, stijgend(L, o.tan, hHoog));
  for (const x of [o.X0 - f, o.X1]) S.zet('windveer', windveer(), x, o.onder(zLaag) - BOEI_ONDER, o.Z0, o.laag === 'voor' ? 270 : 90);
}

/**
 * De twee dakvlakken van een zadeldak met de nok langs z in het midden, met hun afwerking: een boeiboord langs elke
 * dakvoet, twee windveren aan elke kopgevel en een nokvorst. `yVoet` = onderkant van de kepers aan de rand van de
 * oversteek (x = X0 en x = X1).
 */
function zadelVlakken(S: Samensteller, o: DakBasis & { yVoet: number; graden: number; tan: number; cos: number }) {
  const opbouw = bijgebouwDak(o.bedekking, o.hout, 'dakbeschot_dwars', o.geisoleerd);
  const Tv = dikteCm(opbouw) / o.cos, f = BOEI, L = o.Z1 - o.Z0, mid = (o.X0 + o.X1) / 2, half = mid - o.X0;
  const maak = (ob: Opbouw) => dakvlak({ lengte: L, diepte: half, helling: o.graden, opbouw: ob }, M);
  S.vlak('dak', opbouw, maak, o.X0, o.yVoet, o.Z0, 270);
  S.vlak('dak', opbouw, maak, mid, o.yVoet, o.Z0, 90);
  const hVoet = Tv + BOEI_ONDER, hWind = Tv + BOEI_ONDER + 2;
  for (const x of [o.X0 - f, o.X1]) S.zet('boeiboord', balk(L, f, hVoet, o.hout), x, o.yVoet - BOEI_ONDER, o.Z0, 90);
  const windveer = () => prismaStuk('ligger', o.hout, { breedte: mm(f), hoogte: mm(hWind * o.cos) }, (half + f) / o.cos, f, stijgend(half + f, o.tan, hWind));
  for (const z of [o.Z0 - f, o.Z1]) {
    S.zet('windveer', windveer(), o.X0 - f, o.yVoet - BOEI_ONDER - f * o.tan, z, 0);
    S.zet('windveer', windveer(), mid, o.yVoet - BOEI_ONDER - f * o.tan, z, 180);
  }
  // Nokvorst over de naad van de twee dakvlakken (zoals het dak van de woning, dak.ts); niet bij zink.
  if (o.bedekking === 'pannen' || o.bedekking === 'pannen_antraciet' || o.bedekking === 'leien') {
    const dia = 16, top = o.yVoet + half * o.tan + Tv;
    const kleur = M[opbouw.lagen[opbouw.lagen.length - 1]!.materiaal]?.kleur ?? '#555555';
    S.vast.push({ code: 'dak.nokvorst', soort: 'dak', vorm: 'cilinder', as: 'z', kleur: donkerder(kleur, 0.82), x: r2(mid - dia / 2), b: dia, y: r2(top - 3 - dia / 2), h: dia, z: r2(o.Z0 - f), d: r2(L + 2 * f) });
  }
}

function donkerder(hex: string, f: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const k = (i: number) => Math.round(parseInt(m[1]!.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0');
  return `#${k(0)}${k(2)}${k(4)}`;
}

// ---------- overkapping ----------

type Wandsoort = 'open' | 'dicht' | 'halfhoog' | 'glas';
const wandsoort = (v: unknown): Wandsoort => (v === 'dicht' || v === 'halfhoog' || v === 'glas' ? v : 'open');

function bouwOverkapping(r: ConfiguratieResultaat): BijgebouwSamenstelling {
  const S = new Samensteller();
  const k = waarden(r), a = r.afgeleid;
  const B = num(k.breedte, 600), D = num(k.diepte, 500), H = num(k.hoogte, 220), ov = Math.max(0, num(k.oversteek));
  const gevel = k.plaatsing === 'gevel';
  // Een zadeldak tegen een gevel zit niet in het model (de motor meldt het): teken het dan plat.
  const vorm: 'plat' | 'lessenaar' | 'zadel' = k.dakvorm === 'lessenaar' ? 'lessenaar' : k.dakvorm === 'zadel' && !gevel ? 'zadel' : 'plat';
  const tan = vorm === 'plat' ? 0 : num(a.helling_tan), cos = vorm === 'plat' ? 1 : num(a.helling_cos, 1), graden = vorm === 'plat' ? 0 : num(a.helling);
  const p = num(a.p, 12), lb = num(a.ligger_b, 5), lh = num(a.ligger_h, 15), maxA = Math.max(50, num(a.max_afstand, 300));
  const hout = tekst(a.materiaal_hout, 'hout_douglas');
  const bekleding = `${tekst(a.materiaal_bekleding, 'gevel_thermisch_naaldhout')}_${k.plankrichting === 'liggend' ? 'liggend' : 'staand'}`;
  const bedekking = tekst(k.bedekking, 'epdm') as BijgebouwBedekking;
  const vloer = bijgebouwVloer(tekst(k.vloer, 'geen') as BijgebouwVloer);
  const y0 = dikteCm(vloer);
  const ba = Math.min(num(a.berging_achter), D - p), bo = Math.min(num(a.berging_opzij), B - p);

  // Vloer of verharding: iets ruimer dan de palen.
  if (vloer) {
    const rand = 25, za = gevel ? 0 : -rand;
    S.vlak('vloer', vloer, (o) => vloervlak({ lengte: B + 2 * rand, breedte: D + rand - za, opbouw: o, richting: 'x' }, M), -rand, 0, za);
  }

  // De palen staan op een raster langs de omtrek; een berging zet een lijn palen op haar scheiding.
  const xs = bo > 0 ? [...verdeel(p / 2, B - bo, maxA), ...verdeel(B - bo, B - p / 2, maxA).slice(1)] : verdeel(p / 2, B - p / 2, maxA);
  const zs = ba > 0 ? [...verdeel(p / 2, ba, maxA), ...verdeel(ba, D - p / 2, maxA).slice(1)] : verdeel(p / 2, D - p / 2, maxA);
  const nx = xs.length, nz = zs.length, xL = xs[0]!, xR = xs[nx - 1]!;
  const ixB = bo > 0 ? xs.findIndex((x) => Math.abs(x - (B - bo)) < 0.01) : -1;
  const izB = ba > 0 ? zs.findIndex((z) => Math.abs(z - ba) < 0.01) : -1;

  // Hoogtes. `top(z)` = bovenkant van de liggers = onderkant van de dakbalken; bij een lessenaar stijgt ze naar achter.
  const zVoor = D - p / 2, zAchter = gevel ? lb / 2 : p / 2;
  const yBalk = y0 + H + lh;
  const top = (z: number) => yBalk + (vorm === 'lessenaar' ? (zVoor - z) * tan : 0);
  /** Verticale hoogte van een ligger langs z (schuin bij een lessenaar). */
  const hv = lh / cos;
  const onderZ = (z: number) => (vorm === 'lessenaar' ? top(z) - hv : y0 + H);

  const liggerX = (zc: number, x0: number, x1: number) => S.zet('ligger', balk(x1 - x0, lb, lh, hout), x0, top(zc) - lh, zc - lb / 2);
  const liggerZ = (xc: number, z0: number, z1: number) => {
    if (vorm === 'lessenaar') S.zet('ligger', prismaStuk('ligger', hout, { breedte: mm(lb), hoogte: mm(lh) }, (z1 - z0) / cos, lb, stijgend(z1 - z0, tan, hv)), xc - lb / 2, top(z1) - hv, z0, 270);
    else S.zet('ligger', balk(z1 - z0, lb, lh, hout), xc - lb / 2, y0 + H, z0, 90);
  };
  const paalOp = (x: number, z: number, hoogte: number) => S.zet('paal', stijl(hoogte, p, p, hout), x - p / 2, y0, z - p / 2);

  if (vorm !== 'zadel') {
    // Ringbalk: liggers vooraan en achteraan over de hoekpalen, de zijliggers ertussen. Tegen een gevel is de achterste een muurbalk.
    liggerX(zVoor, 0, B);
    liggerX(zAchter, 0, B);
    const zA = zAchter + lb / 2, zV = zVoor - lb / 2;
    liggerZ(xL, zA, zV);
    liggerZ(xR, zA, zV);
    if (ixB > 0) liggerZ(xs[ixB]!, zA, zV);
    if (izB > 0) liggerX(zs[izB]!, xL + lb / 2, xR - lb / 2);
    for (const x of xs) {
      paalOp(x, zVoor, top(zVoor) - lh - y0);
      if (!gevel) paalOp(x, p / 2, top(p / 2) - lh - y0);
    }
    for (const z of zs.slice(1, -1)) {
      for (const x of [xL, xR]) {
        if (vorm === 'plat') paalOp(x, z, H);
        else {
          // Onder een schuine ligger krijgt de paal een schuine kop.
          const laag = onderZ(z + p / 2) - y0, hoog = onderZ(z - p / 2) - y0;
          S.zet('paal', prismaStuk('paal', hout, { breedte: mm(p), hoogte: mm(p) }, hoog, p, [[0, 0], [p, 0], [p, hoog], [0, laag]]), x - p / 2, y0, z - p / 2, 270);
        }
      }
    }
  } else {
    // Zadeldak: een ligger op elke rij zijpalen, en op elk palenpaar een spant (zie zadelDak). De tussenpalen vooraan en
    // achteraan dragen de trekbalk van het spant.
    liggerZ(xL, 0, D);
    liggerZ(xR, 0, D);
    for (const z of zs) for (const x of [xL, xR]) paalOp(x, z, H);
    for (const z of [zs[0]!, zs[nz - 1]!]) for (const x of xs.slice(1, -1)) paalOp(x, z, H + lh);
    if (ixB > 0) S.zet('ligger', balk(D - 2 * p, lb, lh, hout), xs[ixB]! - lb / 2, y0 + H, p, 90);
  }

  // ----- wanden -----
  const inBergingX = (i: number) => ixB > 0 && i >= ixB;
  const inBergingZ = (j: number) => izB > 0 && j < izB;
  const wandVoor = (i: number): Wandsoort => (inBergingX(i) ? 'dicht' : wandsoort(k.wand_voor));
  const wandAchter = (i: number): Wandsoort => (gevel ? 'open' : izB > 0 || inBergingX(i) ? 'dicht' : wandsoort(k.wand_achter));
  const wandLinks = (j: number): Wandsoort => (inBergingZ(j) ? 'dicht' : wandsoort(k.wand_links));
  const wandRechts = (j: number): Wandsoort => (ixB > 0 || inBergingZ(j) ? 'dicht' : wandsoort(k.wand_rechts));

  const schutting = bijgebouwSchutting(hout, bekleding), tw = dikteCm(schutting);
  const gevelTeken = M[bekleding]!;
  /**
   * Een wand langs x of z, van a0 tot a1. `rand` = de buitenkant van de palen (of de as van een scheidingswand), `buiten`
   * = naar welke kant de planken kijken (+1 of −1 langs de andere as). Geeft het geplaatste wandvlak terug.
   */
  const wand = (naam: string, as: 'x' | 'z', a0: number, a1: number, rand: number, buiten: 1 | -1, hoogte: number, soort: Wandsoort, opties: { deur?: boolean; scheiding?: boolean } = {}) => {
    if (soort === 'open' || a1 - a0 < 20 || hoogte < 30) return null;
    const glas = soort === 'glas', h = soort === 'halfhoog' ? Math.min(100, hoogte) : hoogte;
    const lengte = a1 - a0, metDeur = Boolean(opties.deur) && lengte >= 130, deur = openingBoven(h, 4.5, 200);
    const opbouw = glas ? bijgebouwGlaswand : metDeur ? bijgebouwSchutting(hout, bekleding, deur.latei) : schutting, t = dikteCm(opbouw);
    // De planken liggen 1,5 cm achter de buitenkant van de palen; glas staat in de as van de palen.
    const buitenvlak = opties.scheiding ? rand + (buiten * t) / 2 : glas ? rand - buiten * (p / 2 - t / 2) : rand - buiten * 1.5;
    const dwars = buiten > 0 ? buitenvlak - t : buitenvlak;
    const draai: Draai = as === 'x' ? (buiten > 0 ? 180 : 0) : buiten > 0 ? 90 : 270;
    const gevraagd: WandOpening[] = metDeur ? [{ soort: 'deur', x: (lengte - 90) / 2, breedte: 90, hoogte: deur.top }] : [];
    const g = S.vlak(`wand.${naam}`, opbouw, (o, vol) => wandvlak({ lengte, hoogte: h, opbouw: o, openingen: vol ? openingenVan(vol) : gevraagd }, M), as === 'x' ? a0 : dwars, y0, as === 'x' ? dwars : a0, draai);
    if (soort === 'halfhoog') {
      // Afdeklat op een halfhoge wand.
      const lat = balk(lengte, tw + 3, 2.8, hout);
      if (as === 'x') S.zet('afdeklat', lat, a0, y0 + h, dwars - 1.5);
      else S.zet('afdeklat', lat, dwars - 1.5, y0 + h, a0, 90);
    }
    if (glas) {
      // Een donkere rail onder en boven het glas.
      for (const [deel, y] of [['onder', y0], ['boven', y0 + h - 3]] as const) {
        if (as === 'x') S.blok(S.vast, `${g.code}.rail.${deel}`, 'metaal', DONKER, a0, y, dwars - 1.5, lengte, 3, t + 3);
        else S.blok(S.vast, `${g.code}.rail.${deel}`, 'metaal', DONKER, dwars - 1.5, y, a0, t + 3, 3, lengte);
      }
    }
    // De deur van de berging: een blad van planken, iets terug in de opening, met een kruk.
    for (const o of g.deel.vlak?.openingen ?? []) {
      S.bij(S.afwerking, g, [
        { code: 'deur.blad', soort: gevelTeken.soort === 'planken' ? 'planken_h' : 'planken', vorm: 'blok', kleur: gevelTeken.kleur, x: r2(o.u0 + 0.6), y: r2(o.v0 + 1), z: 1.5, b: r2(o.u1 - o.u0 - 1.2), h: r2(o.v1 - o.v0 - 1.6), d: 3.5 },
        { code: 'deur.kruk', soort: 'metaal', vorm: 'blok', kleur: DONKER, x: r2(o.u0 + 7), y: r2(o.v0 + 98), z: -1.5, b: 2.5, h: 13, d: 3 },
      ]);
    }
    return g;
  };
  /** De gevelvulling boven een dichte wand langs z onder een lessenaarsdak: een wig van planken tot onder de schuine ligger. */
  const wig = (naam: string, xBuiten: number, buiten: 1 | -1, za: number, zb: number) => {
    const onder = onderZ(zb), hoog = onderZ(za);
    if (hoog - onder < 1) return;
    const x0 = buiten > 0 ? xBuiten - 2 : xBuiten;
    S.afwerking.push(prisma(`wig.${naam}`, gevelTeken.soort, gevelTeken.kleur, 'x', x0, x0 + 2, [[za, onder], [zb, onder], [za, hoog]]));
    S.zet(`wig.${naam}`, bekledingsDeel(bekleding, ((zb - za) * (hoog - onder)) / 2 / 10000), x0, onder, za);
  };

  const hoogteX = (zc: number) => (vorm === 'zadel' ? H + lh : top(zc) - lh - y0);
  const hoogteZ = (zb: number) => onderZ(zb) - y0;
  for (let i = 0; i < nx - 1; i++) {
    const a0 = xs[i]! + p / 2, a1 = xs[i + 1]! - p / 2;
    wand(`voor.${i + 1}`, 'x', a0, a1, D, 1, hoogteX(zVoor), wandVoor(i), { deur: i === ixB });
    wand(`achter.${i + 1}`, 'x', a0, a1, 0, -1, hoogteX(p / 2), wandAchter(i));
  }
  for (let j = 0; j < nz - 1; j++) {
    // Tegen een gevel staat er achteraan geen paal: de wand loopt door tot de gevel.
    const a0 = j === 0 && gevel ? 0 : zs[j]! + p / 2, a1 = zs[j + 1]! - p / 2;
    for (const [naam, rand, buiten, soort] of [['links', 0, -1, wandLinks(j)], ['rechts', B, 1, wandRechts(j)]] as const) {
      const g = wand(`${naam}.${j + 1}`, 'z', a0, a1, rand, buiten, hoogteZ(a1), soort);
      if (g && soort === 'dicht' && vorm === 'lessenaar') wig(`${naam}.${j + 1}`, rand - buiten * 1.5, buiten, a0, a1);
    }
  }
  // De scheidingswand van de berging, met de planken naar de carport; achteraan zit de deur erin.
  if (izB > 0) wand('berging', 'x', xL + p / 2, xR - p / 2, zs[izB]!, 1, hoogteX(zs[izB]!), 'dicht', { deur: true, scheiding: true });
  if (ixB > 0) {
    const a0 = gevel ? 0 : p, a1 = D - p;
    const g = wand('berging', 'z', a0, a1, xs[ixB]!, -1, hoogteZ(a1), 'dicht', { scheiding: true });
    if (g && vorm === 'lessenaar') wig('berging', xs[ixB]! - tw / 2, -1, a0, a1);
  }

  // ----- schoren -----
  if (k.schoren === true) {
    const open = (s: Wandsoort) => s === 'open' || s === 'halfhoog';
    /** Een schoor van het paalvlak `vlak` naar de onderkant van de ligger (hoogte `onder` bij het paalvlak, stijging `t` per cm). */
    const schoor = (richting: 'x' | 'z', zin: 1 | -1, vlak: number, as: number, onder: number, t: number, vrij: number) => {
      const arm = Math.min(SCHOOR.arm, (vrij - 20) / 2);
      if (arm < 30) return;
      const c = SCHOOR.breedte * Math.SQRT2, pc = arm - c / (1 - t);
      const deel = prismaStuk('ligger', hout, { breedte: mm(lb), hoogte: mm(SCHOOR.breedte) }, arm * Math.SQRT2, lb, [[0, 0], [0, c], [pc, c + pc], [arm, arm]]);
      const y = onder - arm * (1 - t), begin = zin > 0 ? vlak : vlak - arm;
      if (richting === 'x') S.zet('schoor', deel, begin, y, as - lb / 2, zin > 0 ? 0 : 180);
      else S.zet('schoor', deel, as - lb / 2, y, begin, zin > 0 ? 90 : 270);
    };
    const onderX = (zc: number) => (vorm === 'zadel' ? y0 + H + lh : top(zc) - lh);
    for (let i = 0; i < nx; i++) {
      for (const zin of [1, -1] as const) {
        const veld = zin > 0 ? i : i - 1;
        if (veld < 0 || veld > nx - 2) continue;
        const vrij = xs[veld + 1]! - xs[veld]! - p, vlak = xs[i]! + (zin * p) / 2;
        if (open(wandVoor(veld))) schoor('x', zin, vlak, zVoor, onderX(zVoor), 0, vrij);
        if (!gevel && open(wandAchter(veld))) schoor('x', zin, vlak, p / 2, onderX(p / 2), 0, vrij);
      }
    }
    for (let j = gevel ? 1 : 0; j < nz; j++) {
      for (const zin of [1, -1] as const) {
        const veld = zin > 0 ? j : j - 1;
        if (veld < 0 || veld > nz - 2) continue;
        const vrij = zs[veld + 1]! - zs[veld]! - p, vlak = zs[j]! + (zin * p) / 2;
        // Bij een lessenaar stijgt de ligger naar achter (naar kleinere z).
        const t = vorm === 'lessenaar' ? -zin * tan : 0;
        if (open(wandLinks(veld))) schoor('z', zin, vlak, xL, onderZ(vlak), t, vrij);
        if (open(wandRechts(veld))) schoor('z', zin, vlak, xR, onderZ(vlak), t, vrij);
      }
    }
  }

  // ----- dak -----
  const dak: DakBasis = { X0: -ov, X1: B + ov, Z0: gevel ? 0 : -ov, Z1: D + ov, bedekking, hout };
  if (vorm === 'plat') platDak(S, { ...dak, y: yBalk, richting: D <= B ? 'z' : 'x', randAchter: !gevel });
  else if (vorm === 'lessenaar') lessenaarDak(S, { ...dak, onder: top, graden, tan, cos, laag: 'voor', randHoog: !gevel });
  else {
    // Een spant op elk palenpaar, met zijn trekbalk op de zijliggers; gordingen over de spantbenen dragen de kepers.
    const yS = yBalk, yBeen = (x: number) => yS + lh + lh / cos + x * tan;
    for (const z of zs) S.zet('spant', spant({ overspanning: B, helling: graden, doorsnede: { breedte: mm(lb), hoogte: mm(lh) }, materiaal: hout }, M), 0, yS, z - lb / 2);
    const sin = tan * cos, { b: gb, h: gh } = GORDING;
    const voet = Math.min(8, B / 4), nok = B / 2 - 1 - (gb / 2) * cos, tussen = Math.max(0, Math.ceil((nok - voet) / GORDING.afstand - 1e-6) - 1);
    for (let i = 0; i <= tussen + 1; i++) {
      const xc = voet + ((nok - voet) * i) / (tussen + 1), yc = yBeen(xc);
      // De gording ligt met haar onderkant op het spantbeen en draait met de helling mee.
      const links: [number, number][] = [
        [xc - (gb / 2) * cos, yc - (gb / 2) * sin], [xc + (gb / 2) * cos, yc + (gb / 2) * sin],
        [xc + (gb / 2) * cos - gh * sin, yc + (gb / 2) * sin + gh * cos], [xc - (gb / 2) * cos - gh * sin, yc - (gb / 2) * sin + gh * cos],
      ];
      for (const punten of [links, links.map(([x, y]): [number, number] => [B - x, y])]) {
        const deel = prismaStuk('ligger', hout, { breedte: mm(gb), hoogte: mm(gh) }, dak.Z1 - dak.Z0, dak.Z1 - dak.Z0, punten);
        S.zet('gording', deel, Math.min(...punten.map((q) => q[0])), Math.min(...punten.map((q) => q[1])), dak.Z0);
      }
    }
    zadelVlakken(S, { ...dak, yVoet: yBeen(-ov) + gh / cos, graden, tan, cos });
    // Gevelvulling in het spant boven een rij die helemaal dicht is (voor, achter, de scheiding van de berging).
    const vulling = (naam: string, zc: number) => {
      S.afwerking.push(prisma(`topgevel.${naam}`, gevelTeken.soort, gevelTeken.kleur, 'z', zc - 1, zc + 1, [[0.5, yS + lh], [B - 0.5, yS + lh], [B / 2, yS + lh + (B / 2 - 0.5) * tan]]));
      S.zet(`topgevel.${naam}`, bekledingsDeel(bekleding, ((B - 1) * (B / 2 - 0.5) * tan) / 2 / 10000), 0.5, yS + lh, zc - 1);
    };
    const velden = Array.from({ length: nx - 1 }, (_, i) => i);
    if (velden.every((i) => wandVoor(i) === 'dicht')) vulling('voor', zVoor);
    if (velden.every((i) => wandAchter(i) === 'dicht')) vulling('achter', p / 2);
    if (izB > 0) vulling('berging', zs[izB]!);
  }

  // Tegen een gevel: een stuk van de gevel erachter, zodat het beeld te lezen is.
  if (gevel) {
    const hoogste = Math.max(...S.delen.map((g) => g.y + g.deel.maten.h));
    S.blok(S.vast, 'gevel', 'steen', '#b0694f', -130, 0, -30, B + 260, Math.max(330, hoogste + 70), 30, { voeg: '#d5cec2' });
  }
  return S.klaar();
}

// ---------- tuinhuis en poolhouse ----------

/** Raam in de eigen assen van een wand (z = 0 is buiten): een kader over de hele dikte van de wand en het glas erin. */
function raamBlokken(code: string, o: VlakRechthoek, dikte: number, kleur: string): Blok[] {
  const k = 5, z = -0.6, d = dikte + 1.2;
  const blok = (deel: string, soort: BlokSoort, x: number, y: number, zz: number, b: number, h: number, dd: number, kl = kleur): Blok =>
    ({ code: `${code}.${deel}`, soort, vorm: 'blok', kleur: kl, x: r2(x), y: r2(y), z: r2(zz), b: r2(b), h: r2(h), d: r2(dd) });
  return [
    blok('kader.links', 'kunststof', o.u0, o.v0, z, k, o.v1 - o.v0, d),
    blok('kader.rechts', 'kunststof', o.u1 - k, o.v0, z, k, o.v1 - o.v0, d),
    blok('kader.boven', 'kunststof', o.u0 + k, o.v1 - k, z, o.u1 - o.u0 - 2 * k, k, d),
    blok('kader.onder', 'kunststof', o.u0 + k, o.v0, z, o.u1 - o.u0 - 2 * k, k, d),
    blok('glas', 'glas', o.u0 + k, o.v0 + k, 4, o.u1 - o.u0 - 2 * k, o.v1 - o.v0 - 2 * k, 1.2, '#bcd0d6'),
  ];
}

/** Deur in de eigen assen van een wand: een kader, en één of twee deurbladen met glas bovenaan, of twee schuivende glasdelen. */
function deurBlokken(code: string, o: VlakRechthoek, dikte: number, kleur: string, type: 'enkel' | 'dubbel' | 'schuifraam'): Blok[] {
  const k = 5, z = -0.6, d = dikte + 1.2, uit: Blok[] = [];
  const blok = (deel: string, soort: BlokSoort, x: number, y: number, zz: number, b: number, h: number, dd: number, kl = kleur) => {
    if (b > 0.01 && h > 0.01) uit.push({ code: `${code}.${deel}`, soort, vorm: 'blok', kleur: kl, x: r2(x), y: r2(y), z: r2(zz), b: r2(b), h: r2(h), d: r2(dd) });
  };
  const H = o.v1 - o.v0;
  blok('kader.links', 'kunststof', o.u0, o.v0, z, k, H, d);
  blok('kader.rechts', 'kunststof', o.u1 - k, o.v0, z, k, H, d);
  blok('kader.boven', 'kunststof', o.u0 + k, o.v1 - k, z, o.u1 - o.u0 - 2 * k, k, d);
  const u0 = o.u0 + k, u1 = o.u1 - k, v1 = o.v1 - k;
  if (type === 'schuifraam') {
    // Twee glasdelen die langs elkaar schuiven, elk in een smal kader; een lage dorpel eronder.
    blok('dorpel', 'kunststof', u0, o.v0, z, u1 - u0, 3, d);
    const overlap = 6, kier = 0.4, b = (u1 - u0 - 2 * kier + overlap) / 2, s = 5;
    for (const [i, x] of [u0 + kier, u1 - kier - b].entries()) {
      const zz = 3 + i * 4, n = `vleugel${i + 1}`;
      blok(`${n}.links`, 'kunststof', x, o.v0 + 3, zz, s, v1 - o.v0 - 3, 3.5);
      blok(`${n}.rechts`, 'kunststof', x + b - s, o.v0 + 3, zz, s, v1 - o.v0 - 3, 3.5);
      blok(`${n}.onder`, 'kunststof', x + s, o.v0 + 3, zz, b - 2 * s, s, 3.5);
      blok(`${n}.boven`, 'kunststof', x + s, v1 - s, zz, b - 2 * s, s, 3.5);
      blok(`${n}.glas`, 'glas', x + s, o.v0 + 3 + s, zz + 1.2, b - 2 * s, v1 - o.v0 - 3 - 2 * s, 1.2, '#bcd0d6');
    }
    return uit;
  }
  // Deurblad: stijlen en regels rond een dicht paneel onderaan en glas bovenaan.
  const bladen = type === 'dubbel' ? 2 : 1, b = (u1 - u0) / bladen, s = 10, zz = 3, dd = 4.5, yPaneel = o.v0 + 2, yGlas = o.v0 + Math.min(95, H * 0.45);
  for (let i = 0; i < bladen; i++) {
    const x = u0 + i * b + 0.3, bb = b - 0.6, n = `blad${i + 1}`;
    blok(`${n}.links`, 'kunststof', x, yPaneel, zz, s, v1 - yPaneel - 0.5, dd);
    blok(`${n}.rechts`, 'kunststof', x + bb - s, yPaneel, zz, s, v1 - yPaneel - 0.5, dd);
    blok(`${n}.onder`, 'kunststof', x + s, yPaneel, zz, bb - 2 * s, 18, dd);
    blok(`${n}.midden`, 'kunststof', x + s, yGlas - s, zz, bb - 2 * s, s, dd);
    blok(`${n}.boven`, 'kunststof', x + s, v1 - 0.5 - s, zz, bb - 2 * s, s, dd);
    blok(`${n}.paneel`, 'kunststof', x + s, yPaneel + 18, zz + 1, bb - 2 * s, yGlas - s - yPaneel - 18, dd - 2);
    blok(`${n}.glas`, 'glas', x + s, yGlas, zz + 1.6, bb - 2 * s, v1 - 0.5 - s - yGlas, 1.2, '#bcd0d6');
    // De kruk zit aan de kant waar de bladen elkaar raken (bij één blad: rechts gezien van binnen).
    const kruk = bladen === 2 && i === 1 ? x + 3.5 : x + bb - 6.5;
    blok(`${n}.kruk`, 'metaal', kruk, o.v0 + 100, zz - 2.5, 3, 12, 2.5, '#b9b9b6');
  }
  return uit;
}

function bouwTuinhuis(r: ConfiguratieResultaat): BijgebouwSamenstelling {
  const S = new Samensteller();
  const k = waarden(r), a = r.afgeleid, R = TUINHUIS_OPENINGEN;
  const B = num(k.breedte, 400), D = num(k.diepte, 300), wh = num(k.wandhoogte, 220), ov = Math.max(0, num(k.oversteek, 25));
  // Een luifel van minder dan 1 m bestaat niet in het model (de motor meldt het): teken dan geen luifel.
  const L = num(k.luifel) >= 100 ? num(k.luifel) : 0;
  const vorm: 'plat' | 'lessenaar' | 'zadel' = k.dakvorm === 'lessenaar' ? 'lessenaar' : k.dakvorm === 'zadel' ? 'zadel' : 'plat';
  const tan = vorm === 'plat' ? 0 : num(a.helling_tan), cos = vorm === 'plat' ? 1 : num(a.helling_cos, 1), graden = vorm === 'plat' ? 0 : num(a.helling);
  const geisoleerd = k.isolatie === true;
  const hout = tekst(a.materiaal_hout, 'hout_douglas');
  const bekleding = `${tekst(a.materiaal_bekleding, 'gevel_thermisch_naaldhout')}_${k.plankrichting === 'liggend' ? 'liggend' : 'staand'}`, gevelTeken = M[bekleding]!;
  const kleur = tekst(a.kleur_schrijnwerk, '#232323');
  const bedekking = tekst(k.bedekking, 'epdm') as BijgebouwBedekking;
  const t = dikteCm(bijgebouwWand(bekleding, geisoleerd));
  const y0 = VLOERPLAAT.dikte, rand = VLOERPLAAT.rand;

  // Vloerplaat, en onder de luifel een terras.
  S.vlak('vloer', bijgebouwVloer('beton')!, (o) => vloervlak({ lengte: B + 2 * rand, breedte: D + 2 * rand, opbouw: o }, M), -rand, 0, -rand);
  const terras = L > 0 ? bijgebouwVloer(k.terras === 'tegels' ? 'tegels' : 'terras') : null, yT = dikteCm(terras);
  if (terras) S.vlak('terras', terras, (o) => vloervlak({ lengte: B + 2 * rand, breedte: L + 15 - rand, opbouw: o, richting: 'x' }, M), -rand, 0, D + rand);

  // `onder(z)` = onderkant van de dakbalken (plat en lessenaar). Een lessenaar is laag achteraan en stijgt naar voor.
  const onder = (z: number) => y0 + wh + (vorm === 'lessenaar' ? z * tan : 0);
  const hVoor = vorm === 'lessenaar' ? wh + D * tan : wh;

  // ----- openingen -----
  /** Deur en ramen van één wand hebben hun bovenkant op dezelfde hoogte, zo hoog als de wand toelaat (hoogstens 205 cm). */
  const boven = (h: number) => openingBoven(h, 3.8, R.deur.hoogte);
  const raam = (x: number, h: number): WandOpening => ({ soort: 'raam', x, breedte: R.raam.breedte, hoogte: R.raam.hoogte, borstwering: boven(h).top - R.raam.hoogte });
  /** Hoeveel ramen in een stuk wand passen, en hun plaatsen (begin) met gelijke tussenruimte. */
  const past = (lengte: number) => Math.max(0, Math.floor((lengte - 20) / (R.raam.breedte + 20)));
  const plaatsen = (begin: number, lengte: number, n: number) => {
    const tussen = (lengte - n * R.raam.breedte) / (n + 1);
    return Array.from({ length: n }, (_, i) => begin + tussen + i * (R.raam.breedte + tussen));
  };
  const ramen = (lengte: number, gevraagd: unknown, h: number) => plaatsen(0, lengte, Math.min(Math.max(0, Math.round(num(gevraagd))), past(lengte))).map((x) => raam(x, h));

  // De voor- en de achterwand lopen over de hele breedte, op een hoekplank na aan elk einde (zie verder).
  const hp = HOEKPLANK, Bw = B - 2 * hp;
  // De voorwand, gezien van buiten: de deur links, in het midden of rechts, en de ramen in wat overblijft.
  const deurType = k.deur === 'dubbel' || k.deur === 'schuifraam' ? k.deur : 'enkel';
  const dw = Math.min(num(a.deur_b, R.deur.enkel), B - 60);
  const xd = k.deur_plaats === 'links' ? 40 : k.deur_plaats === 'rechts' ? B - 40 - dw : (B - dw) / 2;
  const stukken = [{ begin: xd + dw, lengte: B - hp - xd - dw, n: 0 }, { begin: hp, lengte: xd - hp, n: 0 }];
  for (let nog = Math.max(0, Math.round(num(k.ramen_voor))), beurt = 0; nog > 0 && stukken.some((s) => s.n < past(s.lengte)); beurt++) {
    const s = stukken[beurt % 2]!;
    if (s.n < past(s.lengte)) { s.n++; nog--; }
  }
  // Een wand telt zijn x van links naar rechts gezien van binnen: de voorwand dus gespiegeld (zijn x = 0 ligt rechts).
  const voorOpeningen: WandOpening[] = [
    { soort: 'deur', x: B - hp - xd - dw, breedte: dw, hoogte: boven(hVoor).top },
    ...stukken.flatMap((s) => plaatsen(s.begin, s.lengte, s.n)).map((x) => raam(B - hp - x - R.raam.breedte, hVoor)),
  ];

  // ----- wanden: voor en achter over de hele breedte, de zijwanden ertussen -----
  const wand = (naam: string, lengte: number, hoogte: number, openingen: WandOpening[], x: number, z: number, draai: Draai) => {
    const g = S.vlak(`wand.${naam}`, bijgebouwWand(bekleding, geisoleerd, boven(hoogte).latei), (o) => wandvlak({ lengte, hoogte, opbouw: o, openingen }, M), x, y0, z, draai);
    (g.deel.vlak?.openingen ?? []).forEach((o, i) => {
      const code = `${o.v0 < 0.01 ? 'deur' : 'raam'}${i + 1}`;
      S.bij(S.afwerking, g, o.v0 < 0.01 ? deurBlokken(code, o, t, kleur, deurType) : raamBlokken(code, o, t, kleur));
    });
    return g;
  };
  wand('voor', Bw, hVoor, voorOpeningen, hp, D - t, 180);
  wand('achter', Bw, wh, ramen(Bw, k.ramen_achter, wh), hp, 0, 0);
  wand('links', D - 2 * t, wh, ramen(D - 2 * t, k.ramen_links, wh), 0, t, 270);
  wand('rechts', D - 2 * t, wh, ramen(D - 2 * t, k.ramen_rechts, wh), B - t, t, 90);
  // Een hoekplank in de gevelbekleding sluit elke hoek: zo toont de kopse kant van de voor- en de achterwand planken
  // in plaats van de doorsnede van de wand. (Een hoeklat die voor de gevel uitsteekt, gaf in de kijker een stippellijn.)
  for (const x of [0, B - hp]) {
    const voor = stijl(hVoor, hp, t, bekleding);
    S.zet('hoekplank', voor, x, y0, D - voor.maten.d);
    S.zet('hoekplank', stijl(wh, hp, t, bekleding), x, y0, 0);
  }

  // ----- luifel: palen vooraan met een ligger erop, en een ligger van de voorwand naar elke hoekpaal -----
  const { paal: p, ligger_b: lb, ligger_h: lh } = LUIFEL, zP = D + L - p / 2;
  /** Bovenkant van de liggers van de luifel bij een plat dak of een zadeldak (bij een zadeldak raakt hun buitenrand de kepers). */
  const yLuifel = y0 + wh + (vorm === 'zadel' ? (p / 2 - lb / 2) * tan : 0);
  if (L > 0) {
    // Een paal op elke hoek. Is dat te ver uit elkaar, dan komen er palen bij naast de deur (nooit ervoor): aan
    // weerszijden van een deur in het midden, of één paal voorbij een deur aan de zijkant.
    const xs = [p / 2, B - p / 2], naast = p / 2 + 10;
    if (B - p > LUIFEL.afstand) {
      if (k.deur_plaats === 'links') xs.push(Math.max(B / 2, xd + dw + naast));
      else if (k.deur_plaats === 'rechts') xs.push(Math.min(B / 2, xd - naast));
      else xs.push(xd - naast, xd + dw + naast);
      xs.sort((a, b) => a - b);
    }
    const bovenkant = vorm === 'lessenaar' ? onder(zP) : yLuifel;
    S.zet('ligger', balk(B, lb, lh, hout), 0, bovenkant - lh, zP - lb / 2);
    for (const x of xs) S.zet('paal', stijl(bovenkant - lh - yT, p, p, hout), x - p / 2, yT, zP - p / 2);
    const lengte = zP - lb / 2 - D;
    for (const x of [xs[0]!, xs[xs.length - 1]!]) {
      if (vorm === 'lessenaar') S.zet('ligger', prismaStuk('ligger', hout, { breedte: mm(lb), hoogte: mm(lh) }, lengte / cos, lb, stijgend(lengte, tan, lh / cos)), x - lb / 2, onder(D) - lh / cos, D, 90);
      else S.zet('ligger', balk(lengte, lb, lh, hout), x - lb / 2, bovenkant - lh, D, 90);
    }
  }

  // ----- dak -----
  const dak: DakBasis = { X0: -ov, X1: B + ov, Z0: -ov, Z1: D + L + ov, bedekking, hout, geisoleerd };
  if (vorm === 'plat') platDak(S, { ...dak, y: y0 + wh, richting: D <= B ? 'z' : 'x', randAchter: true });
  else if (vorm === 'lessenaar') {
    lessenaarDak(S, { ...dak, onder, graden, tan, cos, laag: 'achter', randHoog: true });
    // Gevelvulling boven de zijwanden, tot onder de kepers.
    for (const [naam, x] of [['links', 0], ['rechts', B - 2]] as const) {
      S.afwerking.push(prisma(`wig.${naam}`, gevelTeken.soort, gevelTeken.kleur, 'x', x, x + 2, [[t, y0 + wh], [D - t, y0 + wh], [D - t, onder(D - t)], [t, onder(t)]]));
      S.zet(`wig.${naam}`, bekledingsDeel(bekleding, ((D - 2 * t) * (onder(t) + onder(D - t) - 2 * (y0 + wh))) / 2 / 10000), x, y0 + wh, t);
    }
  } else {
    // Zadeldak: de kepers rusten op de zijwanden en op een nokbalk; een makelaar op de voor- en de achterwand (en op de
    // ligger van de luifel) draagt de nokbalk.
    const { b: nb, h: nh, makelaar: ms } = NOKBALK, yNok = y0 + wh + (B / 2 - nb / 2) * tan;
    S.zet('nokbalk', balk(dak.Z1 - dak.Z0, nb, nh, hout), B / 2 - nb / 2, yNok - nh, dak.Z0, 90);
    const makelaar = (zc: number, voet: number) => { if (yNok - nh - voet > 3) S.zet('makelaar', stijl(yNok - nh - voet, ms, ms, hout), B / 2 - ms / 2, voet, zc - ms / 2); };
    makelaar(t / 2, y0 + wh);
    makelaar(D - t / 2, y0 + wh);
    if (L > 0) makelaar(zP, yLuifel);
    zadelVlakken(S, { ...dak, yVoet: y0 + wh - ov * tan, graden, tan, cos });
    // Gevelvulling boven de voor- en de achterwand, tot onder de kepers.
    for (const [naam, z] of [['voor', D - 2], ['achter', 0]] as const) {
      S.afwerking.push(prisma(`topgevel.${naam}`, gevelTeken.soort, gevelTeken.kleur, 'z', z, z + 2, [[0, y0 + wh], [B, y0 + wh], [B / 2, y0 + wh + (B / 2) * tan]]));
      S.zet(`topgevel.${naam}`, bekledingsDeel(bekleding, (B * (B / 2) * tan) / 2 / 10000), 0, y0 + wh, z);
    }
  }
  return S.klaar();
}

// ---------- wat de schermen oproepen ----------

/**
 * Het bijgebouw als samenstelling van bouwdelen, uit het resultaat van de motor (`berekenConfiguratie` met het model
 * `overkapping` of `tuinhuis`). Een ongeldige configuratie wordt toch getekend, zo goed als het kan.
 */
export function bijgebouwSamenstelling(r: ConfiguratieResultaat): BijgebouwSamenstelling {
  return r.product === 'TUINHUIS' ? bouwTuinhuis(r) : bouwOverkapping(r);
}

/** De 3D van een bijgebouw in de afgewerkte weergave of in de constructieweergave. */
export function bijgebouw3D(r: ConfiguratieResultaat, weergave: BouwWeergave = 'afgewerkt'): Scene3D {
  const s = bijgebouwSamenstelling(r);
  const blokken = [...s.delen.flatMap((g) => blokkenVan(g, weergave)), ...s.vast, ...(weergave === 'afgewerkt' ? s.afwerking : [])];
  // Het kader is rondom iets ruimer dan de blokken: de kijker kadreert op breedte en diepte, en een breed, laag gebouw
  // valt in het schuine standpunt anders deels buiten beeld.
  const k = kaderVan(blokken), ruim = KADER_RUIMTE * Math.max(k.b, k.d);
  return { blokken, kader: { x: r2(k.x - ruim), z: r2(k.z - ruim), b: r2(k.b + 2 * ruim), d: r2(k.d + 2 * ruim), h: k.h } };
}

/**
 * De meetstaat van een bijgebouw: de som van de meetstaten van zijn bouwdelen (hout per doorsnede, latten, platen,
 * isolatie, folie, bekleding, beton). Netto, zonder prijzen. Deuren, ramen en beslag zitten er niet in.
 */
export function bijgebouwMeetstaat(r: ConfiguratieResultaat): MeetstaatRegel[] {
  return meetstaat(bijgebouwSamenstelling(r).delen.map((g) => g.deel), M);
}
