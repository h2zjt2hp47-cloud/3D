/**
 * De indeling van een raam of deur als raster van vakken (zie raam.ts).
 *
 * Het raster is genest: het kader bevat rijen (een doorlopend bovenlicht, de kolommen, een doorlopend vak
 * onderaan); elke kolom bevat zelf weer rijen (een eigen bovenlicht, het hoofdvak, een eigen vak onderaan).
 * Schuifdelen, vouwdelen en de delen van een glaswand zijn kolommen van gelijke breedte.
 *
 * Eén bron voor alles wat het raam toont: de tekening (`raamTekening`), de 3D (`raam3d.ts`), de
 * glasbestelling (`ruitenVan`) en de vakken in plattegrond en gevelaanzicht (`openingenVan`). De maten per
 * kolom komen uit de formules van het model (`kb1`…, `kh1`…), zodat de controles en de tekening dezelfde
 * maten gebruiken.
 *
 * Maten in mm, x naar rechts (links = links gezien van binnen), y naar onder, oorsprong = linkerbovenhoek
 * van het kader.
 */
import type { ConfiguratieResultaat, MaatlijnResultaat, TekeningResultaat, VormResultaat } from '../src/index.js';

export type VakRol = 'vak' | 'bovenlicht' | 'onder' | 'deur' | 'deel';

export interface Rechthoek { x: number; y: number; b: number; h: number }

export interface RasterVak {
  /** Code van het vak: `vak2`, `bovenlicht` (doorlopend), `bovenlicht2` (boven kolom 2), `onder`, `onder3`, `deel4`. */
  code: string;
  /** Leesbare plaats, voor de glasbestelling en de controles. */
  naam: string;
  rol: VakRol;
  /** Kolom (1 = links gezien van binnen); 0 = over alle kolommen. */
  kolom: number;
  /** Module: van het kader of het midden van een stijl tot het volgende, en van regel tot regel. */
  x: number;
  y: number;
  b: number;
  h: number;
  /** Vaste tussenstijl links / rechts (anders het kader of, bij een stolp, de andere vleugel). */
  stijlL: boolean;
  stijlR: boolean;
  /** Het vlak dat gevuld is (glas, paneel of deurblad), zoals de tekening het toont: de dagmaat. */
  vlak: Rechthoek;
  dagB: number;
  dagH: number;
  /** Openingssymbool: vast, draai_l, draai_r, draaikip_l, draaikip_r, kip, schuif_l, schuif_r. */
  opening: string;
  vulling: 'glas' | 'paneel' | 'deur';
  /** Stolpvleugel: sluit zonder vaste stijl tegen de vleugel links ('l') of rechts ('r') ervan. */
  stolp?: 'l' | 'r';
  /** Schuifdeel: rail (0 = buitenste, 1 = binnenste) en of het aan die kant over een ander deel schuift. */
  rail?: number;
  overlapL?: boolean;
  overlapR?: boolean;
  /** Verdeling van het glas met roeden: aantal ruiten naast en boven elkaar. */
  ruiten: [number, number];
}

export interface RasterStijl {
  code: string;
  /** Midden van de stijl (x) en van waar tot waar hij loopt (y). */
  x: number;
  y0: number;
  y1: number;
}

export interface Raster {
  /** raster = vakken (raam, terrasdeur, voordeur); schuif = delen op rails; vouw = vouwdelen; glaswand = vaste delen. */
  soort: 'raster' | 'schuif' | 'vouw' | 'glaswand';
  type: string;
  B: number;
  H: number;
  /** Aanzicht van het kader (de helft van het profielaanzicht). */
  f: number;
  /** Aantal kolommen. */
  n: number;
  bl: number;
  oh: number;
  steellook: boolean;
  vakken: RasterVak[];
  stijlen: RasterStijl[];
}

const num = (v: unknown, s = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : s);
const tekst = (v: unknown, s = '') => (typeof v === 'string' && v ? v : s);

/** Welke delen schuiven bij 2, 3 of 4 schuifdelen. Bij 4 delen schuiven de twee middelste naar buiten. */
function schuifOpeningen(n: number, richting: string): string[] {
  const links = richting === 'links' || richting === 'beide', rechts = richting === 'rechts' || richting === 'beide';
  if (n >= 4) return ['vast', links ? 'schuif_l' : 'vast', rechts ? 'schuif_r' : 'vast', 'vast'];
  const uit = Array.from({ length: n }, () => 'vast');
  if (links) uit[0] = 'schuif_r';
  if (rechts) uit[n - 1] = 'schuif_l';
  return uit;
}

/** Vouwdelen scharnieren om en om; het pakket vouwt naar links of naar rechts. */
function vouwOpeningen(n: number, richting: string): string[] {
  return Array.from({ length: n }, (_, i) => {
    const j = richting === 'rechts' ? n - i : i + 1; // geteld vanaf de kant waar het pakket staat
    const oneven = j % 2 === 1;
    return richting === 'rechts' ? (oneven ? 'draai_r' : 'draai_l') : (oneven ? 'draai_l' : 'draai_r');
  });
}

/**
 * Bestaat deze indeling pas sinds 15/11: een grote glaspartij (hef-schuif, vouwwand, glaswand), een vrij raster (zijlicht,
 * vak onderaan, bovenlicht per vak, ongelijke breedtes), een stolp, vier vakken of steellook? Voor de indelingen van
 * vroeger is dit altijd false: zij houden hun beeld en hun prijs. Een nieuwe indeling heeft nog geen prijs (de
 * prijsregels kennen haar niet) en de schermen tonen er dan ook geen bedrag voor.
 */
export function nieuweIndeling(r: ConfiguratieResultaat): boolean {
  const a = r.afgeleid, keuze = (code: string) => r.kenmerken.find((x) => x.code === code)?.waarde;
  const type = String(keuze('type') ?? '');
  return type === 'hefschuif' || type === 'vouwwand' || type === 'glaswand' || a.raster_vrij === true || a.n_stolp === 1 || Number(a.n) >= 4 || keuze('uitzicht') === 'steellook';
}

/** Het raster van een berekend raam of een berekende deur. */
export function rasterVan(r: ConfiguratieResultaat): Raster {
  const a = r.afgeleid as Record<string, unknown>;
  const k = Object.fromEntries(r.kenmerken.map((x) => [x.code, x.waarde]));
  const type = tekst(k.type, 'raam');
  const B = num(k.breedte), H = num(k.hoogte), f = num(a.f);
  const n = Math.max(1, Math.round(num(a.n, 1)));
  const bl = num(a.bl), oh = num(a.oh);
  const steellook = k.uitzicht === 'steellook';
  const roeden: [number, number] = [Math.max(1, Math.round(num(a.rk, 1))), Math.max(1, Math.round(num(a.rr, 1)))];
  /** Steellook: ruiten van ongeveer 45 × 55 cm; anders de gekozen kleinhouten (alleen in de hoofdvakken). */
  const ruiten = (rol: VakRol, b: number, h: number): [number, number] => {
    if (steellook) return [Math.max(1, Math.round(b / 450)), rol === 'bovenlicht' ? 1 : Math.max(rol === 'onder' ? 1 : 2, Math.round(h / 550))];
    return rol === 'vak' ? roeden : [1, 1];
  };
  const vakken: RasterVak[] = [];
  const stijlen: RasterStijl[] = [];
  const voeg = (v: Omit<RasterVak, 'dagB' | 'dagH' | 'ruiten'>) => {
    vakken.push({ ...v, dagB: v.vlak.b, dagH: v.vlak.h, ruiten: v.vulling === 'glas' ? ruiten(v.rol, v.vlak.b, v.vlak.h) : [1, 1] });
  };
  const binnen = (x: number, y: number, b: number, h: number): Rechthoek => ({ x: x + f / 2, y: y + f / 2, b: b - f, h: h - f });

  if (type === 'schuif' || type === 'hefschuif' || type === 'vouwwand' || type === 'glaswand') {
    const vb = num(a.vb), vh = num(a.vh), stapx = num(a.stapx);
    const schuif = type === 'schuif' || type === 'hefschuif';
    const openingen = type === 'schuif' ? [tekst(a.op1, 'vast'), tekst(a.op2, 'vast')]
      : type === 'hefschuif' ? schuifOpeningen(n, tekst(k.schuif_richting, 'links'))
        : type === 'vouwwand' ? vouwOpeningen(n, tekst(k.vouw_richting, 'links'))
          : Array.from({ length: n }, () => 'vast');
    // Vier schuifdelen: de twee middelste sluiten tegen elkaar en lopen op de binnenste rail.
    const xs = schuif && n >= 4 ? [f, f + stapx, f + stapx + vb, f + 2 * stapx + vb] : Array.from({ length: n }, (_, i) => f + i * stapx);
    const rails = n >= 4 ? [0, 1, 1, 0] : Array.from({ length: n }, (_, i) => i % 2);
    for (let i = 0; i < n; i++) {
      const x = xs[i] ?? f + i * stapx;
      const overlapR = schuif && i < n - 1 && !(n >= 4 && i === 1), overlapL = schuif && i > 0 && !(n >= 4 && i === 2);
      voeg({
        code: `deel${i + 1}`, naam: `deel ${i + 1}`, rol: 'deel', kolom: i + 1, x, y: f, b: vb, h: vh,
        stijlL: type === 'glaswand' && i > 0, stijlR: type === 'glaswand' && i < n - 1,
        vlak: binnen(x, f, vb, vh), opening: openingen[i] ?? 'vast', vulling: 'glas',
        ...(schuif ? { rail: rails[i] ?? i % 2, overlapL, overlapR } : {}),
      });
    }
    if (type === 'glaswand') for (let i = 1; i < n; i++) stijlen.push({ code: `stijl${i}`, x: f + i * vb, y0: f, y1: H - f });
    return { soort: schuif ? 'schuif' : type === 'vouwwand' ? 'vouw' : 'glaswand', type, B, H, f, n, bl: 0, oh: 0, steellook, vakken, stijlen };
  }

  // Raster van vakken: raam, terrasdeur of voordeur (met zijlichten).
  const kb = [num(a.kb1), num(a.kb2), num(a.kb3), num(a.kb4)].slice(0, n);
  const kh = [num(a.kh1), num(a.kh2), num(a.kh3), num(a.kh4)].slice(0, n);
  const blk = [a.blk1, a.blk2, a.blk3, a.blk4].slice(0, n).map((v) => v === true);
  const ok = [a.ok1, a.ok2, a.ok3, a.ok4].slice(0, n).map((v) => v === true);
  const blDoor = a.bl_door === true, oDoor = a.o_door === true;
  const deurKol = Math.round(num(a.deur_kol));
  const ops = [a.op1, a.op2, a.op3, a.op4].map((o) => tekst(o, 'vast'));
  const nStolp = num(a.n_stolp) > 0;
  // Stolp: tussen kolom 1 en 2 (2 vakken) of tussen 2 en 3 (4 vakken) staat geen vaste stijl.
  const stolpNa = nStolp ? (n === 2 ? 1 : n === 4 ? 2 : 0) : 0;
  const onderVulling = k.onder === 'paneel' ? 'paneel' : 'glas';
  const xs: number[] = [];
  let cursor = f;
  for (let i = 0; i < n; i++) { xs.push(cursor); cursor += kb[i] ?? 0; }

  if (blDoor) {
    voeg({
      code: 'bovenlicht', naam: 'bovenlicht', rol: 'bovenlicht', kolom: 0, x: f, y: f, b: B - 2 * f, h: bl, stijlL: false, stijlR: false,
      vlak: { x: f, y: f, b: B - 2 * f, h: bl - f }, opening: tekst(k.bovenlicht_open, 'vast'), vulling: 'glas',
    });
  }
  for (let i = 0; i < n; i++) {
    const x = xs[i]!, b = kb[i]!, kol = i + 1;
    const boven = blk[i] ? bl : 0, onder = ok[i] ? oh : 0;
    const y = f + boven, h = kh[i]!;
    const stolp = stolpNa === kol ? 'r' : stolpNa === kol - 1 && stolpNa > 0 ? 'l' : undefined;
    const stijlL = i > 0 && stolp !== 'l', stijlR = i < n - 1 && stolp !== 'r';
    const isDeur = type === 'voordeur' && kol === deurKol;
    const zijlicht = type === 'voordeur' && !isDeur;
    voeg({
      code: `vak${kol}`, naam: isDeur ? 'deur' : zijlicht ? `zijlicht ${kol < deurKol ? 'links' : 'rechts'}` : n > 1 ? `vak ${kol}` : 'raam',
      rol: isDeur ? 'deur' : 'vak', kolom: kol, x, y, b, h, stijlL, stijlR, vlak: binnen(x, y, b, h),
      opening: isDeur ? ops[0]! : type === 'voordeur' ? 'vast' : ops[i]!, vulling: isDeur ? 'deur' : 'glas',
      ...(stolp ? { stolp } : {}),
    });
    if (blk[i] && !blDoor) {
      voeg({
        code: `bovenlicht${kol}`, naam: isDeur ? 'bovenlicht deur' : `bovenlicht ${zijlicht ? 'zijlicht' : `vak ${kol}`}`, rol: 'bovenlicht', kolom: kol, x, y: f, b, h: bl, stijlL: i > 0, stijlR: i < n - 1,
        vlak: { x: x + f / 2, y: f, b: b - f, h: bl - f }, opening: tekst(k.bovenlicht_open, 'vast'), vulling: 'glas',
      });
    }
    if (ok[i] && !oDoor) {
      voeg({
        code: `onder${kol}`, naam: `onderaan ${zijlicht ? 'zijlicht' : `vak ${kol}`}`, rol: 'onder', kolom: kol, x, y: H - f - onder, b, h: onder, stijlL: i > 0, stijlR: i < n - 1,
        vlak: { x: x + f / 2, y: H - onder, b: b - f, h: onder - f }, opening: 'vast', vulling: onderVulling,
      });
    }
    // Vaste stijl rechts van deze kolom: tot tegen een doorlopend bovenlicht of vak onderaan, anders tot het kader.
    if (i < n - 1 && stolp !== 'r') stijlen.push({ code: `stijl${kol}`, x: x + b, y0: blDoor ? f + bl : f, y1: oDoor ? H - f - oh : H - f });
  }
  if (oDoor) {
    voeg({
      code: 'onder', naam: 'onderaan', rol: 'onder', kolom: 0, x: f, y: H - f - oh, b: B - 2 * f, h: oh, stijlL: false, stijlR: false,
      vlak: { x: f, y: H - oh, b: B - 2 * f, h: oh - f }, opening: 'vast', vulling: onderVulling,
    });
  }
  return { soort: 'raster', type, B, H, f, n, bl, oh, steellook, vakken, stijlen };
}

/** De opening per kolom van de hoofdrij (links → rechts gezien van binnen), voor plattegrond en gevelaanzicht. */
export function openingenVan(r: ConfiguratieResultaat): string[] {
  return rasterVan(r).vakken.filter((v) => v.rol === 'vak' || v.rol === 'deur' || v.rol === 'deel').map((v) => v.opening);
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Vooraanzicht (zicht van binnen) uit het raster: kader, vakken met hun openingssymbool, bovenlichten, vakken
 * onderaan, kleinhouten en maatlijnen. Voor de eenvoudige indelingen is dit exact de tekening uit het model.
 */
export function raamTekening(r: ConfiguratieResultaat, raster: Raster = rasterVan(r)): TekeningResultaat {
  const a = r.afgeleid as Record<string, unknown>;
  const k = Object.fromEntries(r.kenmerken.map((x) => [x.code, x.waarde]));
  const { B, H, f, n, type } = raster;
  const ki = tekst(a.ki, '#f2f1ec'), kbKleur = tekst(a.kb, '#383e42'), glas = tekst(a.glaskleur, '#c5d5da');
  const kast = num(a.zon_kast);
  const vormen: VormResultaat[] = [];
  const vorm = (code: string, x: number, y: number, breedte: number, hoogte: number, vulling: string, symbool?: string) => {
    if (breedte <= 0 || hoogte <= 0) return;
    vormen.push({ code, x: r2(x), y: r2(y), breedte: r2(breedte), hoogte: r2(hoogte), vulling, ...(symbool !== undefined ? { symbool } : {}) });
  };
  if (kast > 0) vorm('zonwering', 0, -kast, B, kast, kbKleur);
  vorm('kader', 0, 0, B, H, ki);

  const hoofd = raster.vakken.filter((v) => v.rol === 'vak' || v.rol === 'deur' || v.rol === 'deel');
  const nr = (basis: string, i: number) => (hoofd.length > 1 ? `${basis}.${i + 1}` : basis);
  const bovenDoor = raster.vakken.find((v) => v.code === 'bovenlicht');
  if (bovenDoor) vorm('bovenlicht', bovenDoor.vlak.x, bovenDoor.vlak.y, bovenDoor.vlak.b, bovenDoor.vlak.h, glas, bovenDoor.opening);
  hoofd.forEach((v, i) => vorm(nr('vleugel', i), v.x, v.y, v.b, v.h, ki));
  hoofd.forEach((v, i) => vorm(nr('vak', i), v.vlak.x, v.vlak.y, v.vlak.b, v.vlak.h, v.vulling === 'deur' ? ki : glas, v.opening));
  // Bovenlichten en vakken onderaan per kolom, en het doorlopende vak onderaan.
  for (const v of raster.vakken) {
    if (v.rol === 'bovenlicht' && v.kolom > 0) vorm(`bovenlicht.${v.kolom}`, v.vlak.x, v.vlak.y, v.vlak.b, v.vlak.h, glas, v.opening);
    if (v.rol === 'onder') vorm(v.kolom > 0 ? `onder.${v.kolom}` : 'onder', v.vlak.x, v.vlak.y, v.vlak.b, v.vlak.h, v.vulling === 'paneel' ? ki : glas, 'vast');
  }
  // Stolp: de twee vleugels sluiten op een smalle stolpnaald in plaats van een vaste stijl.
  const stolp = hoofd.find((v) => v.stolp === 'r');
  if (stolp) vorm('stolp', stolp.x + stolp.b - f / 6, stolp.y, f / 3, stolp.h, ki);

  const deur = hoofd.find((v) => v.rol === 'deur');
  if (deur) {
    const { x, y, b, h } = deur;
    if (k.paneel === 'glasstrook') vorm('glasstrook', x + f / 2 + (b - f) * 0.62, y + f / 2 + 150, (b - f) * 0.18, h - f - 300, glas);
    if (k.paneel === 'groeven') for (let i = 0; i < 5; i++) vorm(`groef.${i + 1}`, x + f / 2 + 80, y + f / 2 + ((h - f) * (i + 1)) / 6, b - f - 160, 8, '#00000033');
    const gh = k.greep === 'klink' ? 200 : 1200;
    vorm('greep', k.deur_draai === 'links' ? x + b - f - 90 : x + 60, y + (h - gh) / 2, 30, gh, '#9a9a96');
  }

  // Kleinhouten en de fijne verdeling van steellook: eerst alle staande, dan alle liggende roeden.
  const dikte = raster.steellook ? 20 : 24;
  const metRoeden = raster.vakken.filter((v) => v.ruiten[0] > 1 || v.ruiten[1] > 1);
  const roedeCode = (basis: string, v: RasterVak, j: number, aantal: number) => {
    const i = hoofd.indexOf(v);
    const naam = i >= 0 ? nr(basis, i) : `${basis}.${v.code}`;
    return aantal > 1 ? `${naam}.${j}` : naam;
  };
  for (const v of metRoeden) for (let j = 1; j < v.ruiten[0]; j++) vorm(roedeCode('roede_v', v, j, v.ruiten[0] - 1), v.vlak.x + (v.vlak.b * j) / v.ruiten[0] - dikte / 2, v.vlak.y, dikte, v.vlak.h, ki);
  for (const v of metRoeden) for (let j = 1; j < v.ruiten[1]; j++) vorm(roedeCode('roede_h', v, j, v.ruiten[1] - 1), v.vlak.x, v.vlak.y + (v.vlak.h * j) / v.ruiten[1] - dikte / 2, v.vlak.b, dikte, ki);

  if (k.rooster === true) vorm('rooster', f, f * 0.3, B - 2 * f, f * 0.4, '#77797a');
  if (a.type_deur !== true && typeof k.vensterbank === 'string' && k.vensterbank !== 'geen') vorm('vensterbank', -50, H, B + 100, 30, tekst(a.vb_kleur));

  const maatlijnen: MaatlijnResultaat[] = [];
  const maat = (code: string, x1: number, y1: number, x2: number, y2: number, afstand: number, tekstMaat?: string) => {
    const lengte = Math.round(Math.hypot(x2 - x1, y2 - y1) * 10) / 10;
    if (lengte > 0) maatlijnen.push({ code, x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2), afstand, tekst: tekstMaat ?? `${lengte}` });
  };
  maat('breedte', B, H, 0, H, 180);
  maat('hoogte', B, 0, B, H, 160);
  if (raster.bl > 0) maat('bovenlicht', 0, raster.bl, 0, 0, 160);
  if (raster.oh > 0) maat('onder', 0, H, 0, H - raster.oh, 160);
  if (n >= 2 && raster.soort !== 'schuif') {
    // Gelijke vakken: alleen het eerste; ongelijke vakken: elk vak.
    const ongelijk = hoofd.some((v) => Math.abs(v.b - hoofd[0]!.b) > 0.5);
    hoofd.forEach((v, i) => {
      if (i === 0 || ongelijk) maat(i === 0 ? 'vak' : `vak.${i + 1}`, v.x, 0, v.x + v.b, 0, kast + 120, String(Math.round(v.b)));
    });
  }
  void type;
  return { titel: r.tekening?.titel ?? 'Zicht van binnen (mm) · punt van het symbool = scharnierzijde', eenheid: r.tekening?.eenheid ?? 'mm', vormen, maatlijnen };
}
