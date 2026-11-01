import { FormuleFout, parseFormule } from './formule.js';
import type { ProductModel } from './types.js';

export interface ModelProbleem {
  plaats: string;
  probleem: string;
}

/**
 * Controleert een productmodel vóór het actief wordt gezet:
 * - alle formules zijn geldig;
 * - formules gebruiken alleen bestaande kenmerken, eigenschappen of eerdere afgeleide waarden;
 * - codes zijn uniek, standaardwaarden bestaan, stappen bestaan.
 *
 * Bedoeld voor het beheerscherm: de beheerder ziet meteen wat er mis is.
 */
export function controleerModel(model: ProductModel): ModelProbleem[] {
  const problemen: ModelProbleem[] = [];
  const bekend = new Set<string>();

  const dubbel = (codes: string[], soort: string) => {
    const gezien = new Set<string>();
    for (const c of codes) {
      if (gezien.has(c)) problemen.push({ plaats: soort, probleem: `Code "${c}" komt meer dan eens voor.` });
      gezien.add(c);
    }
  };
  dubbel(model.kenmerken.map((k) => k.code), 'kenmerken');
  dubbel(model.afgeleid.map((a) => a.code), 'afgeleid');
  dubbel(model.regels.map((r) => r.code), 'regels');
  dubbel(model.stuklijst.map((s) => s.code), 'stuklijst');
  dubbel((model.tekening?.vormen ?? []).map((v) => v.code), 'tekening');

  const stappen = new Set(model.stappen.map((s) => s.code));
  for (const k of model.kenmerken) {
    bekend.add(k.code);
    if (!stappen.has(k.stap)) problemen.push({ plaats: `kenmerk ${k.code}`, probleem: `Stap "${k.stap}" bestaat niet.` });
    if (k.type === 'keuze') {
      dubbel(k.keuzes.map((kz) => kz.code), `kenmerk ${k.code}`);
      if (!k.keuzes.some((kz) => kz.code === k.standaard))
        problemen.push({ plaats: `kenmerk ${k.code}`, probleem: `Standaardkeuze "${k.standaard}" bestaat niet.` });
      for (const kz of k.keuzes) for (const e of Object.keys(kz.eigenschappen ?? {})) bekend.add(`${k.code}_${e}`);
    }
  }

  const tabellen = new Set<string>();
  for (const t of model.tabellen ?? []) {
    tabellen.add(t.code);
    if (!/^[A-Za-z0-9_-]+$/.test(t.code))
      problemen.push({ plaats: `tabel ${t.code}`, probleem: 'Tabelcode mag alleen letters, cijfers, - en _ bevatten.' });
    if (t.waarden.length !== t.rijen.length || t.waarden.some((r) => r.length !== t.kolommen.length))
      problemen.push({ plaats: `tabel ${t.code}`, probleem: `Tabel moet ${t.rijen.length} rijen × ${t.kolommen.length} kolommen waarden hebben.` });
  }
  dubbel((model.tabellen ?? []).map((t) => t.code), 'tabellen');

  const check = (plaats: string, f: unknown) => {
    if (typeof f !== 'string') return;
    try {
      const p = parseFormule(f);
      for (const v of p.variabelen)
        if (!bekend.has(v)) problemen.push({ plaats, probleem: `Onbekende naam "${v}" in formule "${f}".` });
      for (const t of p.tabellen)
        if (!tabellen.has(t)) problemen.push({ plaats, probleem: `Onbekende tabel "${t}" in formule "${f}".` });
    } catch (e) {
      if (e instanceof FormuleFout) problemen.push({ plaats, probleem: e.message });
      else throw e;
    }
  };

  // Afgeleide waarden mogen alleen naar eerdere afgeleide waarden verwijzen (volgorde telt).
  for (const a of model.afgeleid) {
    check(`afgeleid ${a.code}`, a.formule);
    bekend.add(a.code);
  }
  for (const k of model.kenmerken) {
    check(`kenmerk ${k.code} (zichtbaarAls)`, k.zichtbaarAls);
    if (k.type === 'getal') {
      check(`kenmerk ${k.code} (min)`, k.min);
      check(`kenmerk ${k.code} (max)`, k.max);
    }
    if (k.type === 'keuze') for (const kz of k.keuzes) check(`keuze ${k.code}.${kz.code}`, kz.beschikbaarAls);
  }
  for (const r of model.regels) check(`regel ${r.code}`, r.als);
  check('prijs (verkoopprijs)', model.prijs.verkoopprijs);
  check('prijs (btw)', model.prijs.btw);
  for (const s of model.stuklijst) {
    for (const veld of ['artikel', 'aantal', 'lengte', 'breedte', 'als'] as const)
      check(`stuklijst ${s.code} (${veld})`, s[veld]);
  }
  if (model.tekening) {
    for (const m of model.tekening.maatlijnen)
      for (const veld of ['x1', 'y1', 'x2', 'y2', 'afstand', 'tekst', 'als'] as const)
        check(`maatlijn ${m.code} (${veld})`, m[veld]);
    for (const v of model.tekening.vormen) {
      check(`vorm ${v.code} (herhaal)`, v.herhaal);
      check(`vorm ${v.code} (als)`, v.als);
    }
    // Binnen een vorm mag ook het volgnummer `i` gebruikt worden.
    bekend.add('i');
    for (const v of model.tekening.vormen)
      for (const veld of ['x', 'y', 'breedte', 'hoogte', 'vulling', 'afronding', 'label', 'symbool'] as const)
        check(`vorm ${v.code} (${veld})`, v[veld]);
  }
  return problemen;
}
