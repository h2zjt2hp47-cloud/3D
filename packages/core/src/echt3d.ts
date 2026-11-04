/**
 * Echte 3D-modellen (bv. van de fabrikant) in de 3D-weergave, in plaats van de benadering met blokken.
 *
 * Een model uit de collectie kan een 3D-bestand hebben dat een rij elementen in één keer toont. De motor beslist of
 * dat bestand past bij het ontwerp zoals het nu is: dezelfde elementen naast elkaar, keuzes die het bestand kan tonen
 * en maten die het met wat uitrekken haalt. Past het, dan zet bouw3D een plaatsing in de scène: waar het model komt,
 * hoe groot, in welke stof en met welke pootafwerking. De weergave laadt het bestand en legt onze stof en poten erop.
 * De blokken blijven in de scène: de weergave toont ze als het bestand ontbreekt of als je de benadering wilt zien.
 * Past het niet, dan krijg je de reden en blijft de benadering.
 *
 * Prijzen, tekeningen en offerte gebruiken dit niet: die blijven op de elementen gebaseerd.
 */
import { weefselVan, type Materiaal } from './materialen.js';
import {
  dragerVan,
  gekozenOpties,
  hoogtesVan,
  materiaalVan,
  vormEffect,
  vormgevingVan,
  type Ontwerp,
  type OntwerpCatalogus,
  type OntwerpElement,
  type Vormgeving,
} from './ontwerp.js';

/** Beschrijving van een 3D-bestand bij een model uit de collectie. */
export interface Echt3D {
  /** Sleutel van het 3D-bestand (de weergave zoekt het op), bv. "glam_velvet". */
  bestand: string;
  /** Naamsvermelding (maker, licentie) die bij het beeld moet staan. */
  vermelding: string;
  /** Elementtypes die het bestand toont, van links naar rechts, aansluitend naast elkaar met de rug achteraan. */
  elementen: string[];
  /** Maten van het 3D-model in cm (breedte, diepte, hoogte), met zithoogte en poothoogte. */
  maat: { b: number; d: number; h: number; zithoogte: number; poothoogte: number };
  /** Hoeveel het bestand mag uitrekken of krimpen per richting (0,15 = 15 %). Standaard 0,15. */
  rek?: number;
  /** Per optiegroep de keuzes die het bestand kan tonen; een andere keuze in zo'n groep geeft de benadering. */
  toont?: Record<string, string[]>;
  /** Vormgeving die het bestand vastlegt (bv. geen houten frame); een andere waarde geeft de benadering. */
  vast?: Partial<Pick<Vormgeving, 'houtframe' | 'rugvorm'>>;
}

/** Waar en hoe het 3D-bestand in de scène komt (in cm, wereldcoördinaten zoals de blokken). */
export interface Echt3DPlaatsing {
  bestand: string;
  vermelding: string;
  /** De elementen die het model toont, van links naar rechts, met hun stuk langs x. Hun blokken blijven in de scène. */
  elementen: { id: string; x0: number; x1: number }[];
  /** Kader waarin het model komt: de weergave schaalt het model per richting tot deze maat. */
  x: number;
  z: number;
  b: number;
  d: number;
  h: number;
  /** Stof zoals op de blokken: kleur en weefsel, of een foto met de maat van één tegel. */
  stof: { kleur: string; weefsel?: string; textuur?: string; textuurCm?: number };
  /** Poten in onze afwerking; de vorm komt uit het bestand. */
  poten: { soort: 'metaal' | 'hout'; kleur: string };
}

export type Echt3DUitkomst = { past: true; plaatsing: Echt3DPlaatsing } | { past: false; reden: string };

/** Elementen gelden als aansluitend tot op 1 cm. */
const SPELING = 1;
const nl = (x: number) => x.toLocaleString('nl-BE', { maximumFractionDigits: 1 });
const VORM_TEKST: Record<string, string> = {
  houtframe: 'houten frame', rugvorm: 'rugvorm',
  zijkant: 'zijkanten', rondom: 'zijkanten + voorkant', geen: 'geen', recht: 'recht', hellend: 'achterover hellend', rond: 'afgerond',
};

/**
 * Past het 3D-bestand bij dit ontwerp? Zo ja: de plaatsing; zo nee: de reden (in gewone taal).
 * Volgorde van de controles: opstelling, losse delen erop, stof, keuzes, vormgeving, maten.
 */
export function echt3dPlaatsing(ontwerp: Ontwerp, catalogus: OntwerpCatalogus, materialen: Materiaal[], echt: Echt3D): Echt3DUitkomst {
  const typen = new Map(catalogus.typen.map((t) => [t.code, t]));
  const label = (code: string) => typen.get(code)?.label ?? code;
  const nee = (reden: string): Echt3DUitkomst => ({ past: false, reden });

  // 1. Opstelling: de types van het bestand aansluitend naast elkaar, niet gedraaid, op één lijn.
  const kandidaten = ontwerp.elementen.filter((e) => !typen.get(e.type)?.opzet && e.rotatie === 0);
  let rij: OntwerpElement[] | undefined;
  for (const start of kandidaten.filter((e) => e.type === echt.elementen[0])) {
    const stuk = [start];
    for (const type of echt.elementen.slice(1)) {
      const vorig = stuk[stuk.length - 1]!;
      const volgend = kandidaten.find((e) => e.type === type && !stuk.includes(e)
        && Math.abs(e.x - (vorig.x + vorig.breedte)) <= SPELING && Math.abs(e.y - start.y) <= SPELING);
      if (!volgend) break;
      stuk.push(volgend);
    }
    if (stuk.length === echt.elementen.length) { rij = stuk; break; }
  }
  if (!rij) return nee(`Het 3D-bestand toont ${echt.elementen.map(label).join(' + ')} naast elkaar (rug achteraan); deze opstelling is anders.`);
  const ids = new Set(rij.map((e) => e.id));

  // 2. Losse delen (rugleuning, kussens) op deze elementen zitten niet in het bestand.
  for (const o of ontwerp.elementen) {
    if (!typen.get(o.type)?.opzet) continue;
    const d = dragerVan(ontwerp, catalogus, o);
    if (d && ids.has(d.id)) return nee(`${label(o.type)} op de zetel zit niet in het 3D-bestand.`);
  }

  // 3. Eén stof voor de hele rij (het bestand heeft één stofdeel).
  const stofCodes = new Set(rij.map((e) => materiaalVan(ontwerp, catalogus, e)));
  if (stofCodes.size > 1) return nee('Een andere stof per element zit niet in het 3D-bestand: het toont de zetel in één stof.');
  const m = materialen.find((x) => x.code === [...stofCodes][0]) ?? materialen.find((x) => x.code === ontwerp.hoofdmateriaal);

  // 4. Keuzes die het bestand kan tonen.
  const groepen = new Map((catalogus.opties ?? []).map((g) => [g.code, g]));
  for (const e of rij) {
    const opt = gekozenOpties(ontwerp, catalogus, e);
    for (const [groep, toegelaten] of Object.entries(echt.toont ?? {})) {
      const k = opt.get(groep);
      if (k && !toegelaten.includes(k.code)) return nee(`${groepen.get(groep)?.label ?? groep}: "${k.label}" zit niet in het 3D-bestand.`);
    }
    // 5. Vormgeving die het bestand vastlegt.
    const v = vormgevingVan(ontwerp, e);
    for (const [veld, waarde] of Object.entries(echt.vast ?? {}) as [keyof Vormgeving, unknown][]) {
      if (v[veld] !== waarde) return nee(`Vormgeving: ${VORM_TEKST[veld] ?? veld} "${VORM_TEKST[String(v[veld])] ?? String(v[veld])}" zit niet in het 3D-bestand.`);
    }
  }

  // 6. Maten: breedte, diepte en zithoogte binnen wat het bestand met uitrekken haalt; poten en rug volgen mee.
  const rek = echt.rek ?? 0.15;
  const W = rij[rij.length - 1]!.x + rij[rij.length - 1]!.breedte - rij[0]!.x;
  const D = Math.max(...rij.map((e) => e.diepte));
  const hoogtes = hoogtesVan(ontwerp, catalogus);
  const binnen = (waarde: number, maat: number, wat: string) =>
    Math.abs(waarde / maat - 1) <= rek + 1e-9
      ? null
      : `${wat} ${nl(waarde)} cm: het 3D-bestand gaat van ${nl(maat * (1 - rek))} tot ${nl(maat * (1 + rek))} cm (${nl(maat)} cm ± ${Math.round(rek * 100)} %).`;
  const fout = binnen(W, echt.maat.b, 'Breedte') ?? binnen(D, echt.maat.d, 'Diepte') ?? binnen(hoogtes.zithoogte, echt.maat.zithoogte, 'Zithoogte');
  if (fout) return nee(fout);
  const sy = hoogtes.zithoogte / echt.maat.zithoogte;
  const poten = echt.maat.poothoogte * sy;
  if (Math.abs(hoogtes.poothoogte - poten) > 3) return nee(`Poothoogte ${nl(hoogtes.poothoogte)} cm: de poten in het 3D-bestand zijn ${nl(poten)} cm.`);
  // Hoogste punt: rug of arm (wat het element heeft).
  const top = Math.max(...rij.map((e) => {
    const t = typen.get(e.type);
    const h = hoogtesVan(ontwerp, catalogus, e);
    if (t?.tekenstijl === 'arm') return h.armhoogte;
    return t && vormEffect(t.tekenstijl, gekozenOpties(ontwerp, catalogus, e)).rug ? h.rughoogte : h.zithoogte;
  }));
  const hoogte = binnen(top, echt.maat.h * sy, 'Hoogte van rug en arm');
  if (hoogte) return nee(hoogte);

  // Plaatsing: stof zoals op de blokken, poten in onze afwerking.
  const zetel = gekozenOpties(ontwerp, catalogus);
  const poot = gekozenOpties(ontwerp, catalogus, rij[0]).get('poten')?.teken;
  const kleur = m?.kleur ?? '#cccccc';
  return {
    past: true,
    plaatsing: {
      bestand: echt.bestand,
      vermelding: echt.vermelding,
      elementen: rij.map((e) => ({ id: e.id, x0: e.x, x1: e.x + e.breedte })),
      x: rij[0]!.x, z: rij[0]!.y, b: W, d: D, h: Math.round(echt.maat.h * sy * 10) / 10,
      stof: m?.textuur ? { kleur, textuur: m.textuur, textuurCm: m.textuurCm ?? 15 } : { kleur, ...(m ? { weefsel: weefselVan(m) } : {}) },
      poten: poot?.metaal
        ? { soort: 'metaal', kleur: String(poot.kleur ?? zetel.get('metaal')?.teken?.kleur ?? '#2b2b2b') }
        : { soort: 'hout', kleur: String(zetel.get('hout')?.teken?.kleur ?? '#c8a27a') },
    },
  };
}
