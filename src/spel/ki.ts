// De computerspelers: eenvoudige regels, om de paar dagen per factie.
import { kaart as standaardKaart, type Kaart } from '../kaart/kaart';
import { bereik, geefBevel, kracht, roepOp, voegSamen, zoekPad } from './regels';
import { bevriend, inOorlog, legersIn, vakkenVan, type Leger, type Toestand } from './toestand';

export function kiBeurt(t: Toestand, f: string, k: Kaart = standaardKaart) {
  const fac = t.facties[f];
  if (!fac.bestaat || fac.heer) return;
  const vijanden = Object.keys(t.facties).filter((x) => t.facties[x].bestaat && inOorlog(t, f, x));
  const eigen = t.legers.filter((l) => l.factie === f);

  // oproepen
  const eigenSterkte = eigen.reduce((s, l) => s + l.sterkte, 0);
  if (fac.mankracht >= 2000 && (vijanden.length || eigenSterkte < 2000)) {
    const vak = oproepVak(t, k, f);
    if (vak !== null) roepOp(t, f, vak, Math.min(Math.floor(fac.mankracht / 100) * 100, 6000));
  }
  if (!vijanden.length) return;

  // samenvoegen wat stilstaat in hetzelfde vak
  const stil = t.legers.filter((l) => l.factie === f && !l.pad.length && !l.inStrijd);
  const perVak = new Map<number, Leger[]>();
  for (const l of stil) { if (!perVak.has(l.vak)) perVak.set(l.vak, []); perVak.get(l.vak)!.push(l); }
  for (const groep of perVak.values()) if (groep.length > 1) voegSamen(t, groep);

  const doelen = new Map<number, number>();
  for (const l of t.legers.filter((x) => x.factie === f && !x.inStrijd)) {
    if (l.pad.length) { doelen.set(l.pad[l.pad.length - 1], 1); continue; }
    if (l.moraal < 0.55) {
      // eerst herstellen, liefst op eigen grond
      if (!bevriend(t, f, t.vakken[l.vak].eigenaar)) {
        const thuis = dichtstEigen(t, k, f, l.vak);
        if (thuis !== null) geefBevel(t, k, l, thuis);
      }
      continue;
    }
    const doel = kiesDoel(t, k, l, doelen);
    if (doel !== null && doel !== l.vak) { geefBevel(t, k, l, doel); doelen.set(doel, (doelen.get(doel) ?? 0) + 1); }
  }
}

function vijandKracht(t: Toestand, f: string, vak: number): number {
  return legersIn(t, vak).filter((x) => inOorlog(t, x.factie, f)).reduce((s, x) => s + kracht(t, x), 0);
}

function kiesDoel(t: Toestand, k: Kaart, l: Leger, doelen: Map<number, number>): number | null {
  const f = l.factie;
  const mijn = kracht(t, l);
  const bereikt = bereik(t, k, f, l.vak, 40);
  let beste: number | null = null, besteScore = 0;
  for (const [vak, dagen] of bereikt) {
    const v = t.vakken[vak];
    const vijandHier = vijandKracht(t, f, vak);
    const vijandsLand = inOorlog(t, f, v.eigenaar);
    if (!vijandsLand && vijandHier === 0) continue;
    // dreiging rondom
    let dreiging = vijandHier;
    for (const b of k.vakken[vak].buren) dreiging += vijandKracht(t, f, b) * 0.4;
    const terrein = bevriend(t, f, v.eigenaar) ? 1 : 1.2;
    if (dreiging * terrein > mijn * 0.9) continue;
    let waarde = 0;
    if (vijandsLand) {
      waarde += 1 + v.bevolking / 6000;
      if (v.fort) waarde += 2.5 * Math.max(0.2, 1 - v.garnizoen / (mijn * 0.5 + 1));
      if (t.facties[v.eigenaar].hoofdstad === vak) waarde += 3;
    }
    if (vijandHier > 0) waarde += 4;
    if (doelen.has(vak)) waarde *= 0.4;
    const score = waarde / (dagen + 4);
    if (score > besteScore) { besteScore = score; beste = vak; }
  }
  return beste;
}

function dichtstEigen(t: Toestand, k: Kaart, f: string, van: number): number | null {
  const bereikt = bereik(t, k, f, van, 60);
  let beste: number | null = null, min = Infinity;
  for (const [vak, dagen] of bereikt) {
    if (bevriend(t, f, t.vakken[vak].eigenaar) && dagen < min && vijandKracht(t, f, vak) === 0) { min = dagen; beste = vak; }
  }
  return beste;
}

/** hoofdplaats als die nog van ons is, anders het eigen vak het dichtst bij de vijand */
function oproepVak(t: Toestand, k: Kaart, f: string): number | null {
  const eigen = vakkenVan(t, f).filter((v) => !legersIn(t, v).some((l) => inOorlog(t, l.factie, f)));
  if (!eigen.length) return null;
  const h = t.facties[f].hoofdstad;
  if (h !== null && eigen.includes(h)) return h;
  return eigen.sort((a, b) => k.vakken[b].buren.length - k.vakken[a].buren.length)[0];
}

export { zoekPad };
