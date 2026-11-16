/**
 * Varianten vergelijken (16/11): wat maakt het ene ontwerp anders dan het andere, in gewone taal, zoals een verkoper het
 * aan de klant zegt ("zadeldak met keramische pannen" tegenover "plat dak met grind, 2 lichtkoepels").
 *
 * `ontwerpKenmerken` beschrijft één ontwerp per onderwerp (maat, dak, lichtkoepels, gevel, ramen, vloer); `verschillen`
 * houdt per ontwerp alleen de onderwerpen over waarin de ontwerpen van elkaar verschillen. Alles komt uit de catalogi
 * (labels van gevel, dak, vloer, profiel en kleur): een nieuwe kleur of bedekking krijgt vanzelf haar naam.
 */
import { delenVan, verdiepingenVan, type Keuzes, type PlanCatalogus, type Plattegrond } from '../src/index.js';
import { RAL_KLEUREN, raamdeur } from './raam.js';
import { berekenVastModel, isVastModel, vastModelZin, type VastModelCode } from './vastemodellen.js';

export interface OntwerpKenmerk {
  /** Het onderwerp: maat, dak, daklicht, gevel, ramen, vloer of aantal. */
  soort: string;
  tekst: string;
}

/** Wat een ontwerp bevat aan ramen en deuren (zoals een positie van de bouwdemo). */
export interface OntwerpPositie { model: string; keuzes: Keuzes; aantal: number }

/** Eerste letter klein, midden in een zin; een afkorting (PVC, EPDM) blijft zoals ze is. */
const klein = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const getal = (x: number) => (Math.round(x) / 100).toFixed(2).replace('.', ',');
const DAKVORM: Record<string, string> = { plat: 'plat dak', lessenaar: 'lessenaarsdak', zadel: 'zadeldak' };

/** Label van een keuze van het raammodel (profiel), of de code als ze niet bestaat. */
function raamLabel(kenmerk: string, code: unknown): string {
  const k = raamdeur.kenmerken.find((x) => x.code === kenmerk);
  const keuzes = k && 'keuzes' in k ? k.keuzes : [];
  return keuzes.find((x) => x.code === code)?.label ?? String(code ?? '');
}

/** Wat het vaakst voorkomt (gewogen), of undefined. */
function meest<T>(lijst: [T, number][]): T | undefined {
  const tel = new Map<string, { w: T; n: number }>();
  for (const [w, n] of lijst) {
    const s = JSON.stringify(w);
    tel.set(s, { w, n: (tel.get(s)?.n ?? 0) + n });
  }
  return [...tel.values()].sort((a, b) => b.n - a.n)[0]?.w;
}

/** Beschrijft één ontwerp per onderwerp, in gewone taal. Zonder woning (enkel ramen) alleen de ramen en hun aantal. */
export function ontwerpKenmerken(plan: Plattegrond, posities: OntwerpPositie[], cat: PlanCatalogus, opties: { zonderWoning?: boolean } = {}): OntwerpKenmerk[] {
  const uit: OntwerpKenmerk[] = [];
  const delen = plan.ruimtes.flatMap((r) => delenVan(r));
  if (!opties.zonderWoning && delen.length) {
    const x0 = Math.min(...delen.map((d) => d.x)), x1 = Math.max(...delen.map((d) => d.x + d.b));
    const y0 = Math.min(...delen.map((d) => d.y)), y1 = Math.max(...delen.map((d) => d.y + d.d));
    // Buitenmaat: de ruimtes staan op de as van de muren, de buitenmuur komt er half bij aan elke kant.
    const muur = plan.buitenmuur || 0;
    const lagen = verdiepingenVan(plan).length;
    uit.push({ soort: 'maat', tekst: `${getal(x1 - x0 + muur)} × ${getal(y1 - y0 + muur)} m, ${lagen} bouwla${lagen === 1 ? 'ag' : 'gen'}` });
    const dak = plan.dak;
    if (!dak) uit.push({ soort: 'dak', tekst: 'plat dak' });
    else {
      const m = cat.daken?.[dak.bedekking.materiaal];
      const kleur = m?.kleuren[dak.bedekking.kleur]?.label;
      uit.push({ soort: 'dak', tekst: `${DAKVORM[dak.vorm] ?? dak.vorm} met ${m ? klein(m.label) : dak.bedekking.materiaal}${kleur && Object.keys(m?.kleuren ?? {}).length > 1 ? `, ${klein(kleur)}` : ''}` });
    }
    const lichten = plan.daklichten ?? [];
    const koepels = lichten.filter((l) => cat.daklichten?.[l.type]?.vorm !== 'lichtstraat').length;
    const straten = lichten.length - koepels;
    uit.push({ soort: 'daklicht', tekst: !lichten.length ? 'geen lichtkoepels' : [koepels ? `${koepels} lichtkoepel${koepels === 1 ? '' : 's'}` : '', straten ? `${straten} lichtstra${straten === 1 ? 'at' : 'ten'}` : ''].filter(Boolean).join(' en ') });
    const g = plan.gevelOntwerp?.standaard;
    if (g) {
      const m = cat.gevels?.[g.materiaal];
      const kleur = m?.kleuren[g.kleur]?.label;
      const anders = Object.keys(plan.gevelOntwerp?.vlakken ?? {}).length;
      uit.push({ soort: 'gevel', tekst: `gevel in ${m ? klein(m.label) : g.materiaal}${kleur ? `, ${klein(kleur)}` : ''}${anders ? ` (${anders} muurvla${anders === 1 ? 'k' : 'kken'} anders)` : ''}` });
    }
    const vloer = meest(plan.ruimtes.filter((r) => !/badkamer|wc|berging/.test(r.type)).map((r): [string, number] => [r.vloer, delenVan(r).reduce((s, d) => s + d.b * d.d, 0)]));
    if (vloer && cat.vloeren[vloer]) uit.push({ soort: 'vloer', tekst: `vloer ${klein(cat.vloeren[vloer]!.label)}` });
  }
  const ramen = posities.filter((p) => p.model === 'RAAM' && p.aantal > 0);
  const schrijnwerk = meest(ramen.map((p): [[unknown, unknown], number] => [[p.keuzes.profiel, p.keuzes.kleur_buiten], p.aantal]));
  if (schrijnwerk) {
    const kleur = RAL_KLEUREN.find((k) => k.code === schrijnwerk[1])?.naam ?? String(schrijnwerk[1] ?? '');
    uit.push({ soort: 'ramen', tekst: `ramen in ${klein(raamLabel('profiel', schrijnwerk[0]))}, ${klein(kleur)}` });
  }
  // Vaste modellen (16/11: carport, tuinhuis, loods, staalwerk): elk wat het is, hoe groot, en de belangrijkste keuzes.
  // Het tweede van hetzelfde model is een ander onderwerp, zodat varianten ze één voor één vergelijken.
  const vast = posities.filter((p) => isVastModel(p.model) && p.aantal > 0);
  const tel = new Map<string, number>();
  for (const p of vast) {
    const code = p.model as VastModelCode, i = (tel.get(code) ?? 0) + 1;
    tel.set(code, i);
    uit.push({ soort: `model:${code}:${i}`, tekst: `${p.aantal > 1 ? `${p.aantal} × ` : ''}${vastModelZin(code, berekenVastModel(code, p.keuzes))}` });
  }
  const n = posities.filter((p) => p.aantal > 0 && !isVastModel(p.model)).reduce((s, p) => s + p.aantal, 0);
  if (n || !vast.length) uit.push({ soort: 'aantal', tekst: `${n} ${n === 1 ? 'raam of deur' : 'ramen en deuren'}` });
  return uit;
}

/**
 * Per ontwerp de kenmerken waarin de ontwerpen van elkaar verschillen, in dezelfde volgorde. Een onderwerp dat maar bij
 * één ontwerp bestaat, telt ook als verschil. Verschillen ze nergens in: één regel die dat zegt.
 */
export function verschillen(ontwerpen: OntwerpKenmerk[][]): string[][] {
  const soorten = [...new Set(ontwerpen.flatMap((o) => o.map((k) => k.soort)))];
  const anders = soorten.filter((s) => new Set(ontwerpen.map((o) => o.find((k) => k.soort === s)?.tekst ?? '')).size > 1);
  if (!anders.length) return ontwerpen.map(() => ['zelfde dak, gevel, ramen en maten']);
  return ontwerpen.map((o) => anders.map((s) => o.find((k) => k.soort === s)?.tekst).filter((x): x is string => !!x));
}
