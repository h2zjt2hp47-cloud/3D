// Vorsten en vorstenhuizen: ouder worden, sterven, opvolging, erfenis via huwelijk.
// Na de start van een tijdperk kiest het spel namen uit een lijst van namen uit die tijd;
// zulke opvolgers zijn VERZONNEN en worden zo getoond.
import { datumVan } from './kalender';
import { kans, meld, vakkenVan, wie, wijzigOpinie, type Toestand, type Vorst } from './toestand';

const ROMEINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function leeftijd(t: Toestand, v: Vorst): number {
  return Math.floor((t.dag - v.geboren) / 365);
}

/** kans om dit jaar te sterven, ruw naar leeftijd */
function sterfkansPerJaar(jaren: number): number {
  if (jaren < 20) return 0.012;
  if (jaren < 40) return 0.02;
  if (jaren < 55) return 0.035;
  if (jaren < 65) return 0.06;
  if (jaren < 75) return 0.11;
  return 0.22;
}

/** een nieuwe naam: voornaam uit de lijst, met rangnummer als die naam al gebruikt werd */
export function nieuweNaam(t: Toestand, f: string, namen: string[]): string {
  const fac = t.facties[f];
  const voornaam = namen.length ? namen[Math.floor(kans(t) * namen.length)] : 'Onbekend';
  if (fac.soort === 'stam') return voornaam;
  const sleutel = `naam:${f}:${voornaam}`;
  const n = (t.gedaan.filter((x) => x === sleutel).length) + 1;
  t.gedaan.push(sleutel);
  return n > 1 ? `${voornaam} ${ROMEINS[Math.min(n, ROMEINS.length) - 1]}` : voornaam;
}

export function maakVorst(t: Toestand, naam: string, leeftijdJaren: number, verzonnen: boolean): Vorst {
  return { naam, geboren: t.dag - leeftijdJaren * 365 - Math.floor(kans(t) * 300), sinds: t.dag, erfgenaam: kans(t) < 0.85, verzonnen };
}

/** maandelijks: vorsten worden ouder; sommigen sterven */
export function maandVorsten(t: Toestand, namen: string[]) {
  const m = datumVan(t.dag).maand;
  for (const f of Object.values(t.facties)) {
    if (!f.bestaat || !f.vorst) continue;
    const v = f.vorst;
    // erfgenaam kan later nog geboren worden
    if (!v.erfgenaam && m === 6 && leeftijd(t, v) < 50 && kans(t) < 0.15) v.erfgenaam = true;
    if (kans(t) > sterfkansPerJaar(leeftijd(t, v)) / 12) continue;
    sterf(t, f.id, namen);
  }
}

export function sterf(t: Toestand, f: string, namen: string[]) {
  const fac = t.facties[f];
  const oud = fac.vorst!;
  const jaren = leeftijd(t, oud);
  if (oud.erfgenaam || fac.soort === 'rijk') {
    const nieuw = maakVorst(t, nieuweNaam(t, f, namen), 16 + Math.floor(kans(t) * 25), true);
    fac.vorst = nieuw;
    fac.heerser = nieuw.naam;
    bericht(t, f, `${oud.naam} (${fac.naam}) sterft op ${jaren}-jarige leeftijd. ${nieuw.naam} volgt op.`);
    return;
  }
  // geen erfgenaam: een verwant huis kan erven
  const verwant = t.huwelijk
    .filter((p) => p.split('|').includes(f))
    .map((p) => p.split('|').find((x) => x !== f)!)
    .filter((x) => t.facties[x]?.bestaat && !t.facties[x].heer && x !== f)
    .sort((a, b) => vakkenVan(t, b).length - vakkenVan(t, a).length);
  if (verwant.length) {
    const erfgenaam = verwant[0];
    erf(t, f, erfgenaam);
    bericht(t, f, `${oud.naam} (${fac.naam}) sterft zonder erfgenaam. Door een vroeger huwelijk erft ${t.facties[erfgenaam].vorst?.naam ?? t.facties[erfgenaam].naam} van ${wie(t, erfgenaam)} het land: ${fac.naam} valt onder ${t.facties[erfgenaam].naam}.`);
    return;
  }
  // anders kiezen de edelen een nieuw huis; dat geeft onrust
  const nieuw = maakVorst(t, nieuweNaam(t, f, namen), 25 + Math.floor(kans(t) * 20), true);
  fac.vorst = nieuw;
  fac.heerser = nieuw.naam;
  fac.dynastie = `huis van ${nieuw.naam.split(' ')[0]}`;
  for (const v of t.vakken) if (v.eigenaar === f) v.tevredenheid = Math.max(0, v.tevredenheid - 12);
  bericht(t, f, `${oud.naam} (${fac.naam}) sterft zonder erfgenaam. De edelen kiezen ${nieuw.naam}; het land is onrustig.`);
}

/** erfenis: het land valt onder de erfgenaam (een personele unie) */
export function erf(t: Toestand, van: string, door: string) {
  const fac = t.facties[van];
  fac.heer = door;
  fac.vorst = null;
  fac.heerser = t.facties[door].heerser;
  for (const p of [...t.oorlog]) if (p.split('|').includes(van)) { t.oorlog = t.oorlog.filter((x) => x !== p); delete t.oorlogen[p]; }
  t.bond = t.bond.filter((p) => !p.split('|').includes(van));
  wijzigOpinie(t, van, door, 30);
  if (van === t.speler) {
    // de speler speelt verder als de erfgenaam
    t.wachtend.push({
      id: `erfenis-${t.dag}`, titel: 'Een erfenis',
      tekst: `Je vorstenhuis is uitgestorven. Je land gaat over naar ${t.facties[door].naam}. Je speelt verder als ${t.facties[door].naam}.`,
      opties: [{ tekst: 'Verder', gevolg: 'niets' }],
    });
    t.speler = door;
  }
}

/** een onderworpen land door erfenis inlijven: alle vakken gaan naar de heer */
export function lijfIn(t: Toestand, van: string) {
  const fac = t.facties[van];
  const heer = fac.heer;
  if (!heer) return false;
  for (const v of t.vakken) if (v.eigenaar === van) { v.eigenaar = heer; v.oorsprong = heer; }
  for (const l of t.legers) if (l.factie === van) l.factie = heer;
  t.facties[heer].schat += Math.max(0, fac.schat);
  fac.bestaat = false;
  t.huwelijk = t.huwelijk.filter((p) => !p.split('|').includes(van));
  meld(t, `${fac.naam} wordt ingelijfd bij ${t.facties[heer].naam}.`, 'diplomatie');
  return true;
}

function bericht(t: Toestand, f: string, tekst: string) {
  meld(t, tekst, 'diplomatie', t.facties[f].hoofdstad ?? undefined, [f], true);
}

