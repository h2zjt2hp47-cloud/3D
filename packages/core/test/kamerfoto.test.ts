import { describe, expect, it } from 'vitest';
import {
  cameraAssen, cameraVan, hoogteBoven, kalibreer, projecteer, vloerpunt, homografie, rotatieMatrix, rotatieVector,
  type Kalibratie, type Kamercamera, type Punt2, type Vec3,
} from '../src/kamerfoto.js';

/**
 * Rekentest (analyse "zetel in eigen kamer", bewijs 2): een zelfgemaakt beeld met een gekende camera. De vier hoeken van
 * een rechthoek op de vloer worden met die camera in het beeld gezet; `kalibreer` moet de camera terugvinden.
 */

/** Rechthoek op de vloer: hoek, draaiing (graden rond de verticale as) en maat. */
function rechthoek(x: number, z: number, graden: number, b: number, d: number): Vec3[] {
  const a = (graden * Math.PI) / 180, e1: Vec3 = [Math.cos(a), 0, Math.sin(a)], e2: Vec3 = [-Math.sin(a), 0, Math.cos(a)];
  const p = (u: number, v: number): Vec3 => [x + e1[0] * u + e2[0] * v, 0, z + e1[2] * u + e2[2] * v];
  return [p(0, 0), p(b, 0), p(b, d), p(0, d)];
}
const beeld = (cam: Kamercamera, hoeken: Vec3[]) => hoeken.map((h) => projecteer(cam, h)!);

/**
 * Een punt uitgedrukt tegenover de rechthoek (u langs de eerste zijde, v langs de tweede, h omhoog): zo kunnen we de
 * echte en de teruggevonden camera vergelijken, ook al kiest `kalibreer` zijn eigen assen.
 */
function tegenover(hoeken: Vec3[], u: number, v: number, h: number): Vec3 {
  const [o, a, , c] = hoeken as [Vec3, Vec3, Vec3, Vec3];
  const l1 = Math.hypot(a[0] - o[0], a[2] - o[2]), l2 = Math.hypot(c[0] - o[0], c[2] - o[2]);
  return [o[0] + ((a[0] - o[0]) / l1) * u + ((c[0] - o[0]) / l2) * v, h, o[2] + ((a[2] - o[2]) / l1) * u + ((c[2] - o[2]) / l2) * v];
}
/**
 * Grootste afwijking (pixels) tussen de echte en de teruggevonden camera voor de hoeken van een doos van 200 × 90 × 85
 * naast het maatvoorwerp (zo groot als een zetel), voor zover die hoeken in de foto staan.
 */
function afwijkingDoos(echt: Kamercamera, echtHoeken: Vec3[], k: Kalibratie, gegeven: Punt2[]) {
  // Welke hoek van de kalibratie hoort bij welk gegeven punt: kalibreer kan de volgorde herstellen.
  const volgorde = k.punten.map((q) => gegeven.indexOf(q));
  const kHoeken = [0, 1, 2, 3].map((i) => k.hoeken[volgorde.indexOf(i)]!);
  let max = 0;
  for (const [u, v, h] of [[-50, 40, 0], [150, 40, 0], [150, 130, 0], [-50, 130, 0], [-50, 40, 85], [150, 40, 85], [150, 130, 85], [-50, 130, 85]] as const) {
    const a = projecteer(echt, tegenover(echtHoeken, u, v, h)), b = projecteer(k.camera, tegenover(kHoeken, u, v, h));
    // Alleen wat in de foto staat.
    if (!a || a.x < 0 || a.y < 0 || a.x > echt.breedte || a.y > echt.hoogte) continue;
    if (!b) return Infinity;
    max = Math.max(max, Math.hypot(a.x - b.x, a.y - b.y));
  }
  return max;
}
const ok = (k: ReturnType<typeof kalibreer>): Kalibratie => {
  if (typeof k === 'string') throw new Error(`kalibreer gaf ${k}`);
  return k;
};
/** Vaste toevalsreeks voor de ruis. */
function reeks(zaad: number) {
  let s = zaad;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const A4 = { b: 29.7, d: 21 };
const SCENES = [
  { naam: 'staand, liggende foto, 28 mm', cam: { positie: [40, 160, 380] as Vec3, doel: [120, 0, 60] as Vec3, mm: 28, breedte: 4000, hoogte: 3000 }, hoeken: rechthoek(90, 80, 20, 29.7, 21) },
  { naam: 'zittend, staande foto, 24 mm, licht scheef', cam: { positie: [-60, 110, 260] as Vec3, doel: [60, 0, 20] as Vec3, mm: 24, breedte: 3000, hoogte: 4000, rol: 0.05 }, hoeken: rechthoek(30, 70, -35, 29.7, 21) },
  { naam: 'breed beeld 1920 × 1080, 35 mm', cam: { positie: [250, 150, 450] as Vec3, doel: [100, 0, 0] as Vec3, mm: 35, breedte: 1920, hoogte: 1080 }, hoeken: rechthoek(60, 60, 5, 29.7, 21) },
  { naam: 'groothoek 18 mm, laag', cam: { positie: [0, 80, 200] as Vec3, doel: [0, 0, 0] as Vec3, mm: 18, breedte: 4032, hoogte: 3024 }, hoeken: rechthoek(-20, 30, 45, 29.7, 21) },
  { naam: 'lange lens 45 mm, ver', cam: { positie: [0, 170, 600] as Vec3, doel: [0, 0, 50] as Vec3, mm: 45, breedte: 4032, hoogte: 3024 }, hoeken: rechthoek(-15, 40, 10, 29.7, 21) },
];

describe('rekentest: camera uit vier punten op de vloer', () => {
  for (const s of SCENES) {
    it(`vindt de camera terug zonder ruis: ${s.naam}`, () => {
      const echt = cameraVan(s.cam);
      const p = beeld(echt, s.hoeken);
      // Zuivere rekentest: zonder voorkennis (geen voorkeur voor rechtop of 28 mm).
      const k = ok(kalibreer(p, A4, s.cam, { voorkennis: null }));
      expect(k.geschat).toBe(true);
      expect(k.camera.mm).toBeCloseTo(s.cam.mm, 2);
      expect(k.camera.positie[1]).toBeCloseTo(s.cam.positie[1], 1);
      // Afstand van de camera tot elke hoek van het maatvoorwerp (hangt niet af van de gekozen assen).
      const hoek0 = k.hoeken[k.punten.indexOf(p[0]!)]!;
      const afstand = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      expect(afstand(k.camera.positie, hoek0)).toBeCloseTo(afstand(s.cam.positie, s.hoeken[0]!), 1);
      expect(k.fout).toBeLessThan(1e-3);
      expect(afwijkingDoos(echt, s.hoeken, k, p)).toBeLessThan(0.05);
      // Een A4 op 2 à 6 m is klein in de foto ("klein"), maar de lens is geschat en de punten vallen terug.
      expect(k.aanwijzingen).not.toContain('standaardlens');
      expect(k.aanwijzingen).not.toContain('onzeker');
    });
  }

  it('met ruis van 1 pixel op elk punt en een tapijt van 200 × 140 cm blijft een zetel ernaast op zijn plaats (hoogstens 0,5 % van de beeldbreedte)', () => {
    const toeval = reeks(12345);
    for (const s of SCENES) {
      const echt = cameraVan(s.cam);
      const tapijt = rechthoek(s.hoeken[0]![0] - 80, s.hoeken[0]![2] - 40, 10, 200, 140);
      // Alleen als het hele tapijt in de foto staat.
      if (beeld(echt, tapijt).some((q) => q.x < 0 || q.y < 0 || q.x > s.cam.breedte || q.y > s.cam.hoogte)) continue;
      const p = beeld(echt, tapijt).map((q) => ({ x: q.x + (toeval() * 2 - 1), y: q.y + (toeval() * 2 - 1) }));
      const k = ok(kalibreer(p, { b: 200, d: 140 }, s.cam));
      expect(afwijkingDoos(echt, tapijt, k, p)).toBeLessThan(s.cam.breedte * 0.005);
    }
  });

  it('met de standaard-voorkennis (rechtop, rond 28 mm) staat een zetel naast het A4 nog op zijn plaats bij een gewone gsm-lens (24–35 mm)', () => {
    for (const s of SCENES.filter((x) => x.cam.mm >= 24 && x.cam.mm <= 35)) {
      const echt = cameraVan(s.cam);
      const p = beeld(echt, s.hoeken);
      const k = ok(kalibreer(p, A4, s.cam));
      // De lens schuift naar 28 mm en de rol naar 0 als het A4 klein is (de prijs van de voorkennis, die bij klikfouten
      // veel oplevert); een zetel tot 1,5 m naast het A4 valt nog op hoogstens 4 % van de beeldbreedte (het slechtst: een
      // A4 op 4 m in een beeld van 1920 px, met een lens van 35 mm).
      expect(afwijkingDoos(echt, s.hoeken, k, p)).toBeLessThan(s.cam.breedte * 0.04);
      expect(k.fout).toBeLessThan(s.cam.breedte * 0.002);
    }
  });

  it('bij een lens ver van 28 mm (18 mm) trekt de voorkennis de lens mee bij een klein A4, bij een tegel van 60 × 60 niet meer', () => {
    const s = SCENES.find((x) => x.cam.mm === 18)!;
    const echt = cameraVan(s.cam);
    expect(ok(kalibreer(beeld(echt, s.hoeken), A4, s.cam)).camera.mm).toBeGreaterThan(24);
    const tegel = rechthoek(-35, 10, 45, 60, 60);
    expect(ok(kalibreer(beeld(echt, tegel), { b: 60, d: 60 }, s.cam)).camera.mm).toBeLessThan(20);
  });

  it('een voorkeur voor de richting (eerst langs de lange zijde) wordt gevolgd, en een duidelijk verkeerde voorkeur niet', () => {
    const cam = { positie: [0, 150, 250] as Vec3, doel: [0, 0, 0] as Vec3, mm: 26, breedte: 4032, hoogte: 3024 };
    const tegel = rechthoek(-30, -20, 15, 80, 40);
    const p = beeld(cameraVan(cam), tegel);
    expect(ok(kalibreer(p, { b: 80, d: 40 }, cam, { eersteZijdeB: true })).eersteZijdeB).toBe(true);
    // De gebruiker beweert het omgekeerde, maar 80 × 40 is in deze foto duidelijk te zien: de foto wint.
    expect(ok(kalibreer(p, { b: 80, d: 40 }, cam, { eersteZijdeB: false })).eersteZijdeB).toBe(true);
  });

  it('de volgorde van het aanklikken maakt niet uit: andere beginhoek, andere richting, gekruist', () => {
    const s = SCENES[0]!;
    const echt = cameraVan(s.cam);
    const p = beeld(echt, s.hoeken);
    for (const volgorde of [[0, 1, 2, 3], [2, 3, 0, 1], [3, 2, 1, 0], [1, 0, 3, 2], [0, 2, 1, 3]]) {
      const gegeven = volgorde.map((i) => p[i]!);
      const k = ok(kalibreer(gegeven, A4, s.cam, { voorkennis: null }));
      expect(k.camera.mm).toBeCloseTo(28, 2);
      expect(afwijkingDoos(echt, volgorde.map((i) => s.hoeken[i]!), k, gegeven)).toBeLessThan(0.05);
    }
  });

  it('de maat mag in beide richtingen ingevuld worden (29,7 × 21 of 21 × 29,7): de functie kiest de juiste zijde', () => {
    for (const s of SCENES) {
      const echt = cameraVan(s.cam);
      const p = beeld(echt, s.hoeken);
      const k = ok(kalibreer(p, { b: 21, d: 29.7 }, s.cam, { voorkennis: null }));
      expect(k.eersteZijdeB).toBe(false);
      expect(afwijkingDoos(echt, s.hoeken, k, p)).toBeLessThan(0.05);
    }
  });

  it('recht van boven: lens niet te bepalen → 28 mm en de aanwijzing "standaardlens"; de vloer blijft juist', () => {
    // Camera 250 cm boven de vloer, recht naar beneden; rechthoek in het midden.
    const R = [1, 0, 0, 0, 0, 1, 0, -1, 0];
    const positie: Vec3 = [0, 250, 0];
    const t = [-(R[0]! * positie[0] + R[1]! * positie[1] + R[2]! * positie[2]), -(R[3]! * positie[0] + R[4]! * positie[1] + R[5]! * positie[2]), -(R[6]! * positie[0] + R[7]! * positie[1] + R[8]! * positie[2])] as Vec3;
    const f = (35 * Math.hypot(4000, 3000)) / Math.hypot(36, 24);
    const echt: Kamercamera = { breedte: 4000, hoogte: 3000, f, mm: 35, R, t, positie };
    const hoeken = rechthoek(-30, -20, 0, 60, 40);
    const k = ok(kalibreer(beeld(echt, hoeken), { b: 60, d: 40 }, { breedte: 4000, hoogte: 3000 }, { voorkennis: null }));
    expect(k.geschat).toBe(false);
    expect(k.camera.mm).toBeCloseTo(28, 5);
    expect(k.aanwijzingen).toContain('standaardlens');
    // Punten op de vloer vallen nog steeds juist (bij recht van boven is alleen de vloer te meten).
    const q = projecteer(echt, [50, 0, 30])!;
    const v = vloerpunt(k.camera, q)!;
    const terug = projecteer(k.camera, v)!;
    expect(Math.hypot(terug.x - q.x, terug.y - q.y)).toBeLessThan(1e-6);
  });

  it('een lens buiten 18–50 mm (tele van 70 mm) → 28 mm volgens de analyse, met de aanwijzingen "standaardlens" en "onzeker"', () => {
    const cam = { positie: [0, 170, 800] as Vec3, doel: [0, 0, 50] as Vec3, mm: 70, breedte: 4032, hoogte: 3024 };
    const tapijt = rechthoek(-100, -20, 10, 200, 140);
    const k = ok(kalibreer(beeld(cameraVan(cam), tapijt), { b: 200, d: 140 }, cam, { voorkennis: null }));
    expect(k.camera.mm).toBeCloseTo(28, 5);
    expect(k.aanwijzingen).toContain('standaardlens');
    expect(k.aanwijzingen).toContain('onzeker');
    // Met de juiste lens (schuifknop) valt alles weer op zijn plaats.
    const juist = ok(kalibreer(beeld(cameraVan(cam), tapijt), { b: 200, d: 140 }, cam, { mm: 70 }));
    expect(juist.fout).toBeLessThan(1e-3);
    expect(juist.camera.positie[1]).toBeCloseTo(170, 1);
  });

  it('een vaste lens (schuifknop "Afstand tot de foto") wordt gebruikt zoals gevraagd', () => {
    const s = SCENES[0]!;
    const echt = cameraVan(s.cam);
    const k = ok(kalibreer(beeld(echt, s.hoeken), A4, s.cam, { mm: 35 }));
    expect(k.camera.mm).toBeCloseTo(35, 5);
    expect(k.geschat).toBe(false);
    expect(k.aanwijzingen).not.toContain('standaardlens');
  });

  it('een klein maatvoorwerp (minder dan 0,5 % van de foto) geeft de aanwijzing "klein"', () => {
    const cam = { positie: [0, 160, 700] as Vec3, doel: [0, 0, 0] as Vec3, mm: 28, breedte: 4000, hoogte: 3000 };
    const hoeken = rechthoek(-15, -10, 0, 29.7, 21);
    const k = ok(kalibreer(beeld(cameraVan(cam), hoeken), A4, cam));
    expect(k.vlak).toBeLessThan(0.005);
    expect(k.aanwijzingen).toContain('klein');
  });

  it('geen vierhoek of geen oplossing: een foutcode in plaats van een camera', () => {
    const foto = { breedte: 1000, hoogte: 800 };
    expect(kalibreer([{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 200 }, { x: 300, y: 300 }], A4, foto)).toBe('geen_rechthoek');
    expect(kalibreer([{ x: 0, y: 0 }, { x: 100, y: 0 }], A4, foto)).toBe('te_weinig_punten');
    // Een punt binnen de driehoek van de andere drie: geen bolle vierhoek.
    expect(kalibreer([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 200, y: 300 }, { x: 200, y: 100 }], A4, foto)).toBe('geen_rechthoek');
  });

  it('vloerpunt en hoogteBoven rekenen terug wat projecteer in het beeld zette', () => {
    const cam = cameraVan(SCENES[1]!.cam);
    const voet: Vec3 = [40, 0, 90];
    const v = vloerpunt(cam, projecteer(cam, voet)!)!;
    expect(v[0]).toBeCloseTo(40, 6);
    expect(v[2]).toBeCloseTo(90, 6);
    expect(hoogteBoven(cam, voet, projecteer(cam, [40, 85, 90])!)).toBeCloseTo(85, 6);
    // Boven de horizon geen vloerpunt.
    expect(vloerpunt(cam, { x: 1500, y: -5000 })).toBeNull();
  });

  it('cameraAssen geeft loodrechte eenheidsassen en de verticale kijkhoek voor three.js', () => {
    const s = SCENES[0]!;
    const cam = cameraVan(s.cam);
    const a = cameraAssen(cam);
    const punt = (p: Vec3, q: Vec3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    expect(punt(a.rechts, a.boven)).toBeCloseTo(0, 9);
    expect(punt(a.rechts, a.achter)).toBeCloseTo(0, 9);
    expect(punt(a.boven, a.boven)).toBeCloseTo(1, 9);
    // Achter = weg van het kijkpunt.
    const kijk = [s.cam.doel[0] - s.cam.positie[0], s.cam.doel[1] - s.cam.positie[1], s.cam.doel[2] - s.cam.positie[2]] as Vec3;
    expect(punt(a.achter, kijk)).toBeLessThan(0);
    // Boven wijst omhoog (geen rol).
    expect(a.boven[1]).toBeGreaterThan(0);
    expect(a.kijkhoek).toBeCloseTo((2 * Math.atan(1500 / cam.f) * 180) / Math.PI, 9);
  });

  it('hulpfuncties: homografie en rotatievector', () => {
    const van: Punt2[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    const naar: Punt2[] = [{ x: 10, y: 20 }, { x: 110, y: 25 }, { x: 105, y: 130 }, { x: 5, y: 120 }];
    const H = homografie(van, naar)!;
    for (let i = 0; i < 4; i++) {
      const p = van[i]!, w = H[6]! * p.x + H[7]! * p.y + H[8]!;
      expect((H[0]! * p.x + H[1]! * p.y + H[2]!) / w).toBeCloseTo(naar[i]!.x, 9);
      expect((H[3]! * p.x + H[4]! * p.y + H[5]!) / w).toBeCloseTo(naar[i]!.y, 9);
    }
    for (const w of [[0.1, -0.2, 0.3], [0, 0, 0], [3.0, 0.1, 0]] as Vec3[]) {
      const terug = rotatieVector(rotatieMatrix(w));
      expect(rotatieMatrix(terug).every((x, i) => Math.abs(x - rotatieMatrix(w)[i]!) < 1e-9)).toBe(true);
    }
  });
});
