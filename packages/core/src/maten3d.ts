/**
 * Maten in de 3D van de bouw (16/11): de hoofdmaten van een gebouw (breedte, diepte, hoogte, nok) en de maten van een
 * raam of deur, als maatlijnen (`Maatlijn3D`, zie pakket3d.ts) die met een scène meereizen. De kijker tekent ze.
 *
 * Alles wordt uit de blokken van de scène gelezen, niet uit de plattegrond: zo krijgt ook de losse kijker maten, met een
 * pakket dat gemaakt is vóór er maten bestonden. Wat telt:
 *   - het gebouw: de muren (`muur_…`) en de dakranden (`dakrand_…`), zonder het kader van de camera (dat telt ook de
 *     oversteek van het dak en de aanleg mee): breedte en diepte zijn de buitenkant van de muren;
 *   - de hoogte: de bovenkant van die muren en dakranden (bij een hellend dak de goot);
 *   - de nok: alleen bij een hellend dak (een prisma dat boven de muren uitsteekt), het hoogste punt ervan;
 *   - een raam of deur: het kader (`kader…`).
 * Met `dingen` (aantikken in de 3D) heet een blok `<ding>.<code>`: alleen het laatste stuk telt.
 */
import type { Blok, Scene3D } from './ruimtelijk.js';
import type { Maatlijn3D } from './pakket3d.js';

/** De code van een blok zonder het ding ervoor. */
const eigenCode = (b: Blok) => b.code.slice(b.code.lastIndexOf('.') + 1);

/** Maat in meter met twee cijfers na de komma, zoals op een plan: "9,30 m". */
export const meterTekst = (cm: number) => `${(Math.round(cm) / 100).toFixed(2).replace('.', ',')} m`;

/** Omsluitend kader van blokken in het grondvlak en de hoogte; een blok met een draaiing telt met zijn gedraaide hoeken. */
function omvang(blokken: Blok[]) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const b of blokken) {
    const hoeken: [number, number][] = [[b.x, b.z], [b.x + b.b, b.z], [b.x, b.z + b.d], [b.x + b.b, b.z + b.d]];
    const a = ((b.draai ?? 0) * Math.PI) / 180;
    const mx = b.x + b.b / 2, mz = b.z + b.d / 2;
    for (const [hx, hz] of hoeken) {
      const x = a ? mx + (hx - mx) * Math.cos(a) - (hz - mz) * Math.sin(a) : hx;
      const z = a ? mz + (hx - mx) * Math.sin(a) + (hz - mz) * Math.cos(a) : hz;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
    y0 = Math.min(y0, b.y); y1 = Math.max(y1, b.y + b.h);
  }
  return { x0, x1, z0, z1, y0, y1 };
}

const S = Math.SQRT1_2;
/** Maatlijnen op de grond liggen net boven het terras en het pad (die steken 1,2 cm boven het maaiveld uit). */
const GROND = 4;

/**
 * De hoofdmaten van het gebouw in een scène: breedte (vóór en achter), diepte (links en rechts), hoogte (op de vier
 * hoeken) en, bij een hellend dak, de nok (aan beide uiteinden van de nok). Van elke maat toont de kijker er één: die aan
 * de kant van de camera. `hoogtes: false` laat hoogte en nok weg (bv. met lage muren: dan meet de hoogte niets).
 * Geen muren in de scène: geen maten.
 */
export function gebouwMaatlijnen(scene: Scene3D, opties: { hoogtes?: boolean } = {}): Maatlijn3D[] {
  const zichtbaar = scene.blokken.filter((b) => !b.alleenSchaduw);
  const muren = zichtbaar.filter((b) => /^(muur|dakrand)_/.test(eigenCode(b)));
  if (!muren.length) return [];
  const { x0, x1, z0, z1, y1: hoogte } = omvang(muren);
  const groot = Math.max(x1 - x0, z1 - z0);
  // Hoe ver de maatlijn naast de muur ligt: genoeg om los te staan van de gevel, niet zo ver dat ze in het gras verdwaalt.
  const naast = Math.min(220, Math.max(70, groot * 0.08));
  const lijnen: Maatlijn3D[] = [];
  const breedte = `Breedte ${meterTekst(x1 - x0)}`, diepte = `Diepte ${meterTekst(z1 - z0)}`;
  lijnen.push(
    { van: [x0, GROND, z1], tot: [x1, GROND, z1], tekst: breedte, uit: [0, 0, 1], afstand: naast, groep: 'breedte', kant: [0, 0, 1] },
    { van: [x0, GROND, z0], tot: [x1, GROND, z0], tekst: breedte, uit: [0, 0, -1], afstand: naast, groep: 'breedte', kant: [0, 0, -1] },
    { van: [x1, GROND, z0], tot: [x1, GROND, z1], tekst: diepte, uit: [1, 0, 0], afstand: naast, groep: 'diepte', kant: [1, 0, 0] },
    { van: [x0, GROND, z0], tot: [x0, GROND, z1], tekst: diepte, uit: [-1, 0, 0], afstand: naast, groep: 'diepte', kant: [-1, 0, 0] },
  );
  if (opties.hoogtes === false) return lijnen;
  const hoek = naast * 0.9;
  // De hoogte op de hoeken van het hoogste deel (een verdieping die maar boven een deel van het gelijkvloers staat):
  // daar staat de maat tegen de muur die ze meet, niet in de lucht naast een lager stuk.
  const top = omvang(muren.filter((b) => b.y + b.h >= hoogte - 1));
  for (const [x, z, sx, sz] of [[top.x1, top.z1, 1, 1], [top.x0, top.z1, -1, 1], [top.x1, top.z0, 1, -1], [top.x0, top.z0, -1, -1]] as const) {
    lijnen.push({ van: [x, 0, z], tot: [x, hoogte, z], tekst: `Hoogte ${meterTekst(hoogte)}`, uit: [sx * S, 0, sz * S], afstand: hoek, groep: 'hoogte', kant: [sx * S, 0, sz * S] });
  }
  // Nok: het hoogste punt van een hellend dakvlak of een topgevel (prisma's), als dat duidelijk boven de muren uitkomt.
  let nok: { y: number; p: number; b: Blok } | undefined;
  for (const b of zichtbaar) {
    if (b.vorm !== 'prisma' || !b.doorsnede?.length) continue;
    for (const [p, y] of b.doorsnede) if (!nok || y > nok.y) nok = { y, p, b };
  }
  if (nok && nok.y > hoogte + 25) {
    const tekst = `Nok ${meterTekst(nok.y)}`, b = nok.b;
    // Een prisma langs x heeft zijn doorsnede in (z, y): de nok loopt dan langs x, en de maat staat aan beide uiteinden.
    if (b.as === 'z') {
      lijnen.push(
        { van: [nok.p, 0, Math.max(z1, b.z + b.d)], tot: [nok.p, nok.y, Math.max(z1, b.z + b.d)], tekst, uit: [0, 0, 1], afstand: hoek, groep: 'nok', kant: [0, 0, 1] },
        { van: [nok.p, 0, Math.min(z0, b.z)], tot: [nok.p, nok.y, Math.min(z0, b.z)], tekst, uit: [0, 0, -1], afstand: hoek, groep: 'nok', kant: [0, 0, -1] },
      );
    } else {
      lijnen.push(
        { van: [Math.max(x1, b.x + b.b), 0, nok.p], tot: [Math.max(x1, b.x + b.b), nok.y, nok.p], tekst, uit: [1, 0, 0], afstand: hoek, groep: 'nok', kant: [1, 0, 0] },
        { van: [Math.min(x0, b.x), 0, nok.p], tot: [Math.min(x0, b.x), nok.y, nok.p], tekst, uit: [-1, 0, 0], afstand: hoek, groep: 'nok', kant: [-1, 0, 0] },
      );
    }
  }
  return lijnen;
}

/**
 * De maten van een raam, deur of poort: breedte en hoogte van het kader, in cm. De lijnen liggen in het vlak van de muur,
 * naast het kader (de breedte eronder, of erboven bij een deur tot op de vloer; de hoogte rechts ernaast), en de kijker
 * tekent ze bovenop: zo lees je ze van binnen en van buiten. Welke blokken: met `ding` die van dat ding in de woning
 * (`opening:<id>`, met `dingen` aan), anders alle blokken van een kader (de eigen scène van één raam).
 */
export function raamMaatlijnen(blokken: Blok[], opties: { ding?: string } = {}): Maatlijn3D[] {
  const eigen = opties.ding ? blokken.filter((b) => b.code.startsWith(`${opties.ding}.`)) : blokken;
  const kader = eigen.filter((b) => !b.alleenSchaduw && /^kader/.test(eigenCode(b)));
  if (!kader.length) return [];
  const { x0, x1, z0, z1, y0, y1 } = omvang(kader);
  const langsX = x1 - x0 >= z1 - z0;
  const breed = langsX ? x1 - x0 : z1 - z0, hoog = y1 - y0;
  const naast = Math.min(30, Math.max(12, breed * 0.08));
  const cm = (x: number) => `${Math.round(x)} cm`;
  // Een deur staat op de vloer: de breedte dan boven het kader, anders eronder.
  const onder = y0 > 25;
  const yb = onder ? y0 : y1;
  const omhoog: [number, number, number] = [0, onder ? -1 : 1, 0];
  if (langsX) {
    const z = (z0 + z1) / 2;
    return [
      { van: [x0, yb, z], tot: [x1, yb, z], tekst: cm(breed), uit: omhoog, afstand: naast, bovenop: true },
      { van: [x1, y0, z], tot: [x1, y1, z], tekst: cm(hoog), uit: [1, 0, 0], afstand: naast, bovenop: true },
    ];
  }
  const x = (x0 + x1) / 2;
  return [
    { van: [x, yb, z0], tot: [x, yb, z1], tekst: cm(breed), uit: omhoog, afstand: naast, bovenop: true },
    { van: [x, y0, z1], tot: [x, y1, z1], tekst: cm(hoog), uit: [0, 0, 1], afstand: naast, bovenop: true },
  ];
}
