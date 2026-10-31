import jsonLogic from 'json-logic-js';
import { parseFormule } from './formule.js';
import type { Prijstabel, Waarde } from './types.js';

/** Alle waarden die formules kunnen gebruiken (keuzes, eigenschappen, afgeleide waarden, tabellen). */
export type Gegevens = Record<string, unknown>;

// Veiligheid: 'method' laat toe willekeurige methodes op objecten aan te roepen.
// Regels komen uit beheer door klanten, dus die operatie schakelen we uit.
jsonLogic.rm_operation('method');

function getal(x: unknown): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

// Afronden naar boven/beneden op een veelvoud van `stap` (bv. 1, 10, 0.5).
// Kleine marge tegen afrondingsfouten van kommagetallen (0.1 + 0.2).
const EPS = 1e-9;
jsonLogic.add_operation('naarboven', (x: unknown, stap: unknown) => {
  const s = getal(stap) || 1;
  return Math.ceil(getal(x) / s - EPS) * s;
});
jsonLogic.add_operation('naarbeneden', (x: unknown, stap: unknown) => {
  const s = getal(stap) || 1;
  return Math.floor(getal(x) / s + EPS) * s;
});
jsonLogic.add_operation('afronden', (x: unknown, decimalen: unknown) => {
  const f = 10 ** getal(decimalen ?? 0);
  return Math.round(getal(x) * f) / f;
});
jsonLogic.add_operation('in_lijst', (x: unknown, lijst: unknown) =>
  Array.isArray(lijst) ? lijst.includes(x) : false,
);

/** Zoekt de index: tekst exact, getallen naar boven afgerond naar de volgende waarde. */
function zoekIndex(lijst: unknown[], x: unknown): number {
  const exact = lijst.findIndex((w) => w === x || String(w) === String(x));
  if (exact >= 0) return exact;
  const n = Number(x);
  if (typeof x === 'boolean' || x === null || x === '' || !Number.isFinite(n)) return -1;
  let beste = -1;
  lijst.forEach((w, i) => {
    if (typeof w === 'number' && w >= n && (beste < 0 || w < (lijst[beste] as number))) beste = i;
  });
  return beste;
}

// tabel(tabel; rij; kolom) → waarde, of null als de combinatie niet bestaat of buiten de tabel valt.
jsonLogic.add_operation('tabel', (t: unknown, rij: unknown, kolom: unknown) => {
  const tabel = t as Prijstabel | null;
  if (!tabel || !Array.isArray(tabel.rijen)) return null;
  const r = zoekIndex(tabel.rijen, rij);
  const k = zoekIndex(tabel.kolommen, kolom);
  if (r < 0 || k < 0) return null;
  return tabel.waarden[r]?.[k] ?? null;
});

/** Evalueer een formule tegen de huidige gegevens. */
export function evalueer(formule: string | number | boolean, gegevens: Gegevens): Waarde {
  if (typeof formule !== 'string') return formule;
  const { logica } = parseFormule(formule);
  return jsonLogic.apply(logica as jsonLogic.RulesLogic, gegevens) as Waarde;
}

export function evalueerGetal(formule: string | number, gegevens: Gegevens): number {
  return getal(evalueer(formule, gegevens));
}

export function evalueerWaar(formule: string | undefined, gegevens: Gegevens): boolean {
  if (formule === undefined) return true;
  return jsonLogic.truthy(evalueer(formule, gegevens));
}
