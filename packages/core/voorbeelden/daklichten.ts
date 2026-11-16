/**
 * Lichtkoepels en lichtstraten in één keer verdelen op het platte dak (de teller in de keuzes van het dak, de stijlen en
 * de snelstart). Zuivere functies op een kopie van het plan.
 */
import { dakOpbouw, type DakLicht, type Plattegrond } from '../src/index.js';
import { daklichtCatalogus } from './inrichting.js';

const r5 = (x: number) => Math.round(x / 5) * 5;
/**
 * Zet `aantal` daklichten van één soort gelijk verdeeld op het grootste platte dakstuk (de bestaande daklichten op dat
 * stuk vervallen; die elders blijven). Ze liggen op een rij langs de lange kant, minstens 45 cm van de as van de muren
 * en 20 cm van elkaar; past het gevraagde aantal niet, dan zoveel als er past. Geeft een kopie van het plan.
 */
export function verdeelDaklichten(plan: Plattegrond, aantal: number, type = 'koepel_100'): Plattegrond {
  const p = structuredClone(plan);
  const opbouw = dakOpbouw(p);
  const t = daklichtCatalogus[type];
  if (!opbouw || !t) return p;
  const stuk = [...opbouw.plat].sort((a, b) => b.b * b.d - a.b * a.d)[0];
  if (!stuk) return p;
  const op = (l: DakLicht) => l.x + l.b / 2 > stuk.x && l.x + l.b / 2 < stuk.x + stuk.b && l.y + l.d / 2 > stuk.y && l.y + l.d / 2 < stuk.y + stuk.d && (l.niveau ?? 0) === stuk.niveau;
  const rest = (p.daklichten ?? []).filter((l) => !op(l));
  // Hadden de dakramen op dat stuk een screen (ronde 11b), dan krijgen de nieuwe het ook (in dezelfde stand).
  const metZon = t.zonwering ? (p.daklichten ?? []).find((l) => op(l) && l.type === type && l.zonwering === 'screen') : undefined;
  const zon = metZon ? { zonwering: 'screen' as const, ...(metZon.zonweringStand ? { zonweringStand: metZon.zonweringStand } : {}) } : {};
  const langs = stuk.b >= stuk.d;
  const lengte = langs ? stuk.b : stuk.d, maat = langs ? t.b : t.d;
  // Bruikbaar: 45 cm van de as van de muren (30 cm vanaf de binnenkant); tussen twee daklichten minstens 20 cm.
  const bruikbaar = lengte - 90;
  const past = bruikbaar < maat ? 0 : Math.floor((bruikbaar - maat) / (maat + 20)) + 1;
  const n = Math.max(0, Math.min(Math.round(aantal), past));
  // Hart op hart: gelijk verdeeld over de lengte, maar zo dat de buitenste binnen het bruikbare stuk blijven.
  const tussen = n > 1 ? Math.min(lengte / n, (bruikbaar - maat) / (n - 1)) : 0;
  const nieuw: DakLicht[] = [];
  for (let i = 0; i < n; i++) {
    const c = (langs ? stuk.x : stuk.y) + lengte / 2 + (i - (n - 1) / 2) * tussen;
    const x = langs ? c - t.b / 2 : stuk.x + stuk.b / 2 - t.b / 2;
    const y = langs ? stuk.y + stuk.d / 2 - t.d / 2 : c - t.d / 2;
    nieuw.push({ id: `k${Date.now().toString(36)}${i}`, type, x: r5(x), y: r5(y), b: t.b, d: t.d, ...(stuk.niveau ? { niveau: stuk.niveau } : {}), ...zon });
  }
  p.daklichten = [...rest, ...nieuw];
  return p;
}

/** Hoeveel daklichten er nu op het grootste platte dakstuk liggen (de teller in de keuzes van het dak). */
export function daklichtenOpDak(plan: Plattegrond): { aantal: number; type?: string; plat: boolean } {
  const opbouw = dakOpbouw(plan);
  const stuk = opbouw ? [...opbouw.plat].sort((a, b) => b.b * b.d - a.b * a.d)[0] : undefined;
  if (!stuk) return { aantal: 0, plat: false };
  const op = (opbouw?.daklichten ?? []).filter(({ licht: l, reden }) => !reden && l.x + l.b / 2 > stuk.x && l.x + l.b / 2 < stuk.x + stuk.b && l.y + l.d / 2 > stuk.y && l.y + l.d / 2 < stuk.y + stuk.d);
  return { aantal: op.length, type: op[0]?.licht.type, plat: true };
}
