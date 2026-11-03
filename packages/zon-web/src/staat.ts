/**
 * Toestand van de zonnepanelendemo: één project, bewaard in de browser, met "ongedaan maken".
 */
import { berekenZon, alleDakvlakken, instellingVan, type DakvlakInstelling, type ZonProject, type ZonResultaat } from '../../core/src/zon.js';
import { leegZonProject, voorbeeldZonProject, ZON_CATALOGUS } from '../../core/voorbeelden/zon.js';

const SLEUTEL = 'zon-demo.project';
let project: ZonProject = laad();
let cache: ZonResultaat | null = null;
const geschiedenis: string[] = [];
const luisteraars: (() => void)[] = [];
export let laatstBewaard = '';
export let opslagProbleem = '';

function laad(): ZonProject {
  try {
    const tekst = localStorage.getItem(SLEUTEL);
    if (tekst) return { ...leegZonProject(), ...JSON.parse(tekst) };
  } catch { /* geen opslag */ }
  return voorbeeldZonProject();
}

export const catalogus = ZON_CATALOGUS;
export const toestand = () => project;
export function resultaat(): ZonResultaat {
  return (cache ??= berekenZon(project, catalogus));
}
export const opWijziging = (f: () => void) => luisteraars.push(f);

function bewaar() {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(project));
    laatstBewaard = new Date().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
    opslagProbleem = '';
  } catch {
    opslagProbleem = 'Niet bewaard: de browser laat geen opslag toe. Bewaar als bestand.';
  }
}

function meld() {
  cache = null;
  bewaar();
  for (const f of luisteraars) f();
}

/** Past het project aan (kopie), bewaart en meldt het aan de schermen. */
export function wijzig(f: (p: ZonProject) => void) {
  geschiedenis.push(JSON.stringify(project));
  if (geschiedenis.length > 60) geschiedenis.shift();
  const kopie = structuredClone(project);
  f(kopie);
  project = kopie;
  meld();
}

export const kanOngedaan = () => geschiedenis.length > 0;
export function ongedaan() {
  const vorig = geschiedenis.pop();
  if (!vorig) return;
  project = JSON.parse(vorig);
  meld();
}

export function vervang(p: ZonProject) {
  geschiedenis.push(JSON.stringify(project));
  project = { ...leegZonProject(), ...p };
  meld();
}
export const nieuwVoorbeeld = () => vervang(voorbeeldZonProject());
export const nieuwLeeg = () => vervang(leegZonProject());

/** Instelling van een dakvlak aanpassen (vult de standaardwaarden aan). */
export function wijzigVlak(id: string, f: (v: DakvlakInstelling) => void) {
  wijzig((p) => {
    const vlak = alleDakvlakken(p).find((v) => v.id === id);
    if (!vlak) return;
    const inst = structuredClone(instellingVan(p, vlak));
    f(inst);
    p.vlakken[id] = inst;
  });
}
