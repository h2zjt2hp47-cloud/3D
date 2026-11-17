/**
 * Projecten van de bouwdemo: de lijst in de opslag van de browser, unieke namen en het scherm waarop een project opent.
 * Zuivere functies (doorloop B, 16/11); het scherm (`bouw-web/src/staat.ts`) leest en schrijft de opslag zelf.
 *
 * Waarom (doorloop B4): als bestand op de schijf (`file://`) zag Chromium na herladen soms een lege opslag. De app dacht dan
 * dat het de eerste start was en schreef een nieuwe lijst met één project over de bestaande. Daarom:
 * - de lijst wordt bij het laden aangevuld uit een tweede sleutel (de reserve) en uit de projecten die in de opslag staan
 *   maar in geen van beide lijsten (`herstelIndex`): een project verdwijnt nooit uit de lijst zolang zijn gegevens er zijn;
 * - bij het bewaren wordt de lijst in het geheugen samengevoegd met wat er al staat (`voegLijstenSamen`), nooit overschreven;
 * - lijkt de opslag leeg terwijl dit tabblad ze al gevuld zag, dan eerst opnieuw laden (`beslisStart`: 'herladen').
 */

/** Eén project in de lijst (zoals `ProjectInfo` in staat.ts). */
export interface ProjectRegel {
  id: string;
  naam: string;
  klant: string;
  nummer: string;
  /** ISO-datum van de laatste wijziging; leeg als ze niet bekend is (een project dat alleen nog in de opslag stond). */
  gewijzigd: string;
  posities: number;
}

export interface ProjectIndex {
  actief: string;
  projecten: ProjectRegel[];
}

const recentst = (a: ProjectRegel, b: ProjectRegel) => (b.gewijzigd || '').localeCompare(a.gewijzigd || '');

/**
 * Lijsten samenvoegen: elk project één keer. Bij hetzelfde id wint de eerste lijst (het geheugen vóór de opslag);
 * `weg` = ids die bewust verwijderd zijn, `bestaat` = staan de gegevens van dit project nog in de opslag (een regel
 * zonder gegevens komt niet terug, bv. een project dat in een ander tabblad verwijderd werd).
 */
export function voegLijstenSamen(lijsten: (ProjectRegel[] | undefined)[], opties: { weg?: Set<string>; bestaat?: (id: string) => boolean } = {}): ProjectRegel[] {
  const uit: ProjectRegel[] = [];
  const gezien = new Set<string>();
  lijsten.forEach((lijst, i) => {
    for (const p of lijst ?? []) {
      if (!p || typeof p.id !== 'string' || gezien.has(p.id) || opties.weg?.has(p.id)) continue;
      // De eerste lijst is het geheugen: die geldt altijd. Uit de opslag alleen wat er nog echt staat.
      if (i > 0 && opties.bestaat && !opties.bestaat(p.id)) continue;
      gezien.add(p.id);
      uit.push(p);
    }
  });
  return uit;
}

/**
 * De lijst bij het laden: de index, aangevuld met de reserve en met elk project dat in de opslag staat maar in geen van
 * beide lijsten (`ids`: de projecten in de opslag; `regelVan` leest er een regel van, of undefined als het niet te lezen
 * is). Het actieve project blijft dat van de index, anders dat van de reserve.
 */
export function herstelIndex(o: { index?: ProjectIndex; reserve?: ProjectIndex; ids: string[]; regelVan: (id: string) => ProjectRegel | undefined }): ProjectIndex {
  const goed = (x?: ProjectIndex) => (x && Array.isArray(x.projecten) ? x : undefined);
  const index = goed(o.index), reserve = goed(o.reserve);
  const opgeslagen = new Set(o.ids);
  // Geen geheugen (de eerste lijst is leeg): index en reserve tellen alleen voor wat er nog in de opslag staat.
  const projecten = voegLijstenSamen([[], index?.projecten, reserve?.projecten], { bestaat: (id) => opgeslagen.has(id) });
  // Een lijst die er was maar een project mist dat wel in de opslag staat: het project komt terug (achteraan, zonder datum).
  const bekend = new Set(projecten.map((p) => p.id));
  for (const id of o.ids) {
    if (bekend.has(id)) continue;
    const r = o.regelVan(id);
    if (r) { projecten.push(r); bekend.add(id); }
  }
  const actief = [index?.actief, reserve?.actief].find((a) => !!a && bekend.has(a)) ?? '';
  return { actief, projecten };
}

/**
 * Wat de app bij het laden doet:
 * - `project`: dit project openen (het actieve, anders het recentste dat te lezen is);
 * - `herladen`: de opslag is leeg, maar dit tabblad zag er al projecten in (een glitch van de browser): niets schrijven
 *   en de pagina opnieuw laden (hoogstens `maxHerladen` keer na elkaar, standaard 3);
 * - `niet-te-lezen`: na dat herladen nog altijd leeg: het voorbeeld tonen, niets schrijven en het zeggen;
 * - `eerste-start`: echt leeg (dit tabblad zag nooit projecten): het voorbeeld als eerste project. Ook als er projecten in
 *   de lijst staan die geen van alle te lezen zijn: het nieuwe project komt dan bij de lijst (zie `voegLijstenSamen`).
 */
export type StartBeslissing = { soort: 'project'; id: string } | { soort: 'herladen' } | { soort: 'niet-te-lezen' } | { soort: 'eerste-start' };

export function beslisStart(o: { index: ProjectIndex; leesbaar: (id: string) => boolean; opslagGezien: boolean; herladen: number; maxHerladen?: number }): StartBeslissing {
  const volgorde = [
    ...o.index.projecten.filter((p) => p.id === o.index.actief),
    ...[...o.index.projecten].filter((p) => p.id !== o.index.actief).sort(recentst),
  ];
  for (const p of volgorde) if (o.leesbaar(p.id)) return { soort: 'project', id: p.id };
  if (o.opslagGezien && !o.index.projecten.length) return o.herladen < (o.maxHerladen ?? 3) ? { soort: 'herladen' } : { soort: 'niet-te-lezen' };
  return { soort: 'eerste-start' };
}

/**
 * Een naam die nog niet in de lijst staat (doorloop B20): "Carport 5 × 5 m" bestaat al → "Carport 5 × 5 m (2)", dan (3) …
 * Een naam die al op " (n)" eindigt, telt verder vanaf dezelfde stam.
 */
export function uniekeNaam(naam: string, bestaande: Iterable<string>): string {
  const namen = new Set([...bestaande].map((n) => n.trim().toLowerCase()));
  const schoon = naam.trim();
  if (!namen.has(schoon.toLowerCase())) return schoon;
  const stam = schoon.replace(/\s\(\d+\)$/, '');
  for (let n = 2; ; n++) {
    const kandidaat = `${stam} (${n})`;
    if (!namen.has(kandidaat.toLowerCase())) return kandidaat;
  }
}

/**
 * Op welk scherm een project opent (doorloop B14): een project zonder ruimtes met een onderdeel dat op zich staat (een
 * carport, tuinhuis, loods, staalwerk of een aanbouw als model) opent in de configurator met de 3D, zoals na de snelstart;
 * al de rest zoals vroeger (de plattegrond; een project zonder woning toont daar zelf de ramenlijst).
 */
export function beginScherm(o: { zonderWoning?: boolean; ruimtes: number; posities: { id: string; los: boolean }[] }): { scherm: 'plan' } | { scherm: 'positie'; id: string } {
  if (o.zonderWoning || o.ruimtes > 0) return { scherm: 'plan' };
  const los = o.posities.find((p) => p.los);
  return los ? { scherm: 'positie', id: los.id } : { scherm: 'plan' };
}
