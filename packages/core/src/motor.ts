import { TABELLEN_SLEUTEL } from './formule.js';
import { evalueer, evalueerGetal, evalueerWaar, type Gegevens } from './logica.js';
import type {
  BerekenOpties,
  ConfiguratieResultaat,
  Kenmerk,
  KenmerkStatus,
  Keuzes,
  Melding,
  Prijslijst,
  ProductModel,
  StuklijstResultaat,
  TekeningResultaat,
  Waarde,
} from './types.js';

const rond = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

/** Startkeuzes: alle standaardwaarden van het model. */
export function standaardKeuzes(model: ProductModel): Keuzes {
  return Object.fromEntries(model.kenmerken.map((k) => [k.code, k.standaard]));
}

function normaliseer(k: Kenmerk, w: Waarde | undefined): Waarde {
  if (w === undefined || w === null || w === '') return k.standaard;
  if (k.type === 'getal') {
    const n = typeof w === 'number' ? w : Number(String(w).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (k.type === 'janee') return w === true || w === 'true' || w === 'ja' || w === 1;
  return String(w);
}

/** Zet kenmerken en eigenschappen van gekozen opties in één gegevensobject voor de formules. */
function bouwGegevens(model: ProductModel, keuzes: Keuzes, verborgen: Set<string>): Gegevens {
  const g: Gegevens = {
    [TABELLEN_SLEUTEL]: Object.fromEntries((model.tabellen ?? []).map((t) => [t.code, t])),
  };
  for (const k of model.kenmerken) {
    const w = verborgen.has(k.code) ? null : (keuzes[k.code] ?? null);
    g[k.code] = w;
    if (k.type === 'keuze') {
      // Eigenschappen van alle keuzes eerst op null, zodat formules altijd een waarde vinden.
      for (const kz of k.keuzes)
        for (const e of Object.keys(kz.eigenschappen ?? {})) g[`${k.code}_${e}`] ??= null;
      const gekozen = k.keuzes.find((kz) => kz.code === w);
      for (const [e, v] of Object.entries(gekozen?.eigenschappen ?? {})) g[`${k.code}_${e}`] = v;
    }
  }
  for (const a of model.afgeleid) g[a.code] = evalueer(a.formule, g);
  return g;
}

function weergave(k: Kenmerk, w: Waarde): string {
  if (w === null) return '—';
  if (k.type === 'keuze') return k.keuzes.find((kz) => kz.code === w)?.label ?? String(w);
  if (k.type === 'janee') return w ? 'ja' : 'nee';
  return k.eenheid ? `${w} ${k.eenheid}` : String(w);
}

/**
 * Berekent alles voor een configuratie: zichtbaarheid, beschikbare keuzes,
 * fouten en waarschuwingen, stuklijst en prijs.
 *
 * Dezelfde functie draait in de browser (live feedback) en op de server
 * (controle vóór een offerte wordt aangemaakt).
 */
export function berekenConfiguratie(
  model: ProductModel,
  invoer: Keuzes,
  prijslijst: Prijslijst,
  opties: BerekenOpties = {},
): ConfiguratieResultaat {
  const keuzes: Keuzes = {};
  for (const k of model.kenmerken) keuzes[k.code] = normaliseer(k, invoer[k.code]);

  // 1. Zichtbaarheid bepalen (op basis van alle ingevulde waarden), daarna
  //    verborgen kenmerken op null zetten en afgeleide waarden opnieuw berekenen.
  const voorlopig = bouwGegevens(model, keuzes, new Set());
  const verborgen = new Set(
    model.kenmerken.filter((k) => !evalueerWaar(k.zichtbaarAls, voorlopig)).map((k) => k.code),
  );
  const g = bouwGegevens(model, keuzes, verborgen);

  const meldingen: Melding[] = [];
  const kenmerken: KenmerkStatus[] = [];

  // 2. Per kenmerk: bereik en beschikbaarheid controleren.
  for (const k of model.kenmerken) {
    const zichtbaar = !verborgen.has(k.code);
    const w = keuzes[k.code] ?? null;
    const status: KenmerkStatus = {
      code: k.code,
      label: k.label,
      stap: k.stap,
      type: k.type,
      zichtbaar,
      waarde: zichtbaar ? w : null,
      weergave: weergave(k, zichtbaar ? w : null),
    };

    if (k.type === 'getal') {
      const min = k.min === undefined ? undefined : evalueerGetal(k.min, g);
      const max = k.max === undefined ? undefined : evalueerGetal(k.max, g);
      status.min = min;
      status.max = max;
      if (zichtbaar) {
        const n = w as number | null;
        if (n === null) {
          meldingen.push({ code: `${k.code}.ongeldig`, ernst: 'fout', kenmerk: k.code, melding: `${k.label}: geef een getal in.` });
        } else if (min !== undefined && n < min) {
          meldingen.push({ code: `${k.code}.min`, ernst: 'fout', kenmerk: k.code, melding: `${k.label} moet minstens ${min}${k.eenheid ? ' ' + k.eenheid : ''} zijn.` });
        } else if (max !== undefined && n > max) {
          meldingen.push({ code: `${k.code}.max`, ernst: 'fout', kenmerk: k.code, melding: `${k.label} mag hoogstens ${max}${k.eenheid ? ' ' + k.eenheid : ''} zijn.` });
        } else if (k.stapgrootte && Math.abs(n / k.stapgrootte - Math.round(n / k.stapgrootte)) > 1e-9) {
          meldingen.push({ code: `${k.code}.stap`, ernst: 'fout', kenmerk: k.code, melding: `${k.label} moet een veelvoud van ${k.stapgrootte} zijn.` });
        }
      }
    }

    if (k.type === 'keuze') {
      status.keuzes = k.keuzes.map((kz) => {
        const beschikbaar = evalueerWaar(kz.beschikbaarAls, g);
        return {
          code: kz.code,
          label: kz.label,
          beschikbaar,
          reden: beschikbaar ? undefined : kz.nietBeschikbaarReden,
        };
      });
      if (zichtbaar) {
        const gekozen = status.keuzes.find((kz) => kz.code === w);
        if (!gekozen) {
          meldingen.push({ code: `${k.code}.onbekend`, ernst: 'fout', kenmerk: k.code, melding: `${k.label}: kies een geldige optie.` });
        } else if (!gekozen.beschikbaar) {
          meldingen.push({
            code: `${k.code}.niet_beschikbaar`,
            ernst: 'fout',
            kenmerk: k.code,
            melding: `${k.label}: "${gekozen.label}" is niet mogelijk${gekozen.reden ? ` (${gekozen.reden})` : ''}.`,
          });
        }
      }
    }
    kenmerken.push(status);
  }

  // 3. Productregels.
  for (const r of model.regels) {
    if (evalueerWaar(r.als, g)) meldingen.push({ code: r.code, ernst: r.ernst, melding: r.melding });
  }

  // 4. Stuklijst en kostprijs.
  const stuklijst: StuklijstResultaat[] = [];
  for (const s of model.stuklijst) {
    if (!evalueerWaar(s.als, g)) continue;
    const aantal = evalueerGetal(s.aantal, g);
    if (aantal <= 0) continue;
    const artikel = String(evalueer(s.artikel, g) ?? '');
    const lengte = s.lengte === undefined ? undefined : rond(evalueerGetal(s.lengte, g), 1);
    const breedte = s.breedte === undefined ? undefined : rond(evalueerGetal(s.breedte, g), 1);
    const art = prijslijst[artikel];
    if (!art) {
      meldingen.push({ code: `stuklijst.${s.code}.artikel`, ernst: 'fout', melding: `Artikel "${artikel}" (${s.omschrijving}) staat niet in de prijslijst.` });
      continue;
    }
    const perMeter = model.maateenheid === 'cm' ? 100 : 1000;
    let netto: number;
    switch (s.eenheid) {
      case 'm2':
        netto = (aantal * (lengte ?? 0) * (breedte ?? 0)) / (perMeter * perMeter);
        break;
      case 'lm':
        netto = (aantal * (lengte ?? 0)) / perMeter;
        break;
      default:
        netto = aantal;
    }
    const hoeveelheid = rond(netto * (1 + (art.verliesProcent ?? 0) / 100), 3);
    stuklijst.push({
      code: s.code,
      omschrijving: s.omschrijving,
      artikel,
      eenheid: s.eenheid,
      aantal: rond(aantal, 3),
      lengte,
      breedte,
      hoeveelheid,
      kostprijsPerEenheid: art.kostprijs,
      kost: rond(hoeveelheid * art.kostprijs),
      zaaglijst: s.zaaglijst ?? false,
    });
  }

  // 5. Prijs: lijstprijs (formule/tabel) of kostprijs + opslag.
  const kostprijs = rond(stuklijst.reduce((t, s) => t + s.kost, 0));
  const methode = model.prijs.verkoopprijs ? 'lijstprijs' : 'kostplus';
  let bruto: number;
  if (model.prijs.verkoopprijs) {
    const v = evalueer(model.prijs.verkoopprijs, g);
    const n = typeof v === 'number' ? v : Number.NaN;
    if (!Number.isFinite(n)) {
      meldingen.push({ code: 'prijs.niet_gevonden', ernst: 'fout', melding: 'Voor deze combinatie is geen prijs gevonden in de prijstabel.' });
      bruto = 0;
    } else bruto = rond(n);
  } else {
    bruto = rond(kostprijs * (1 + model.prijs.opslagProcent / 100));
  }
  if (model.prijs.minimumPrijs !== undefined && bruto > 0) bruto = Math.max(bruto, model.prijs.minimumPrijs);
  const kortingProcent = opties.kortingProcent ?? 0;
  const excl = rond(bruto * (1 - kortingProcent / 100));
  const btwPct = model.prijs.btw !== undefined ? evalueerGetal(model.prijs.btw, g) : model.prijs.btwProcent;
  const btw = rond((excl * btwPct) / 100);
  const margeProcent = excl > 0 ? rond(((excl - kostprijs) / excl) * 100, 1) : null;

  const tekening = model.tekening ? bouwTekening(model, g) : undefined;

  const samenvatting = kenmerken.filter((k) => k.zichtbaar).map((k) => `${k.label}: ${k.weergave}`);

  return {
    product: model.code,
    versie: model.versie,
    geldig: !meldingen.some((m) => m.ernst === 'fout'),
    meldingen,
    kenmerken,
    afgeleid: Object.fromEntries(model.afgeleid.map((a) => [a.code, (g[a.code] as Waarde) ?? null])),
    stuklijst,
    prijs: {
      methode,
      kostprijs,
      brutoprijsExcl: bruto,
      kortingProcent,
      verkoopprijsExcl: excl,
      margeProcent,
      btw,
      verkoopprijsIncl: rond(excl + btw),
    },
    samenvatting,
    tekening,
  };
}

/** Rekent de vormen en maatlijnen van de tekening uit (geen SVG; dat doet tekenSvg). */
function bouwTekening(model: ProductModel, g: Gegevens): TekeningResultaat {
  const t = model.tekening!;
  const vormen: TekeningResultaat['vormen'] = [];
  for (const v of t.vormen) {
    if (!evalueerWaar(v.als, g)) continue;
    const aantal = v.herhaal === undefined ? 1 : Math.min(200, Math.max(0, Math.floor(evalueerGetal(v.herhaal, g))));
    for (let i = 0; i < aantal; i++) {
      const gi = { ...g, i };
      const breedte = evalueerGetal(v.breedte, gi);
      const hoogte = evalueerGetal(v.hoogte, gi);
      if (breedte <= 0 || hoogte <= 0) continue;
      vormen.push({
        code: aantal > 1 ? `${v.code}.${i + 1}` : v.code,
        x: rond(evalueerGetal(v.x, gi), 2),
        y: rond(evalueerGetal(v.y, gi), 2),
        breedte: rond(breedte, 2),
        hoogte: rond(hoogte, 2),
        vulling: v.vulling === undefined ? undefined : String(evalueer(v.vulling, gi) ?? ''),
        afronding: v.afronding === undefined ? undefined : evalueerGetal(v.afronding, gi),
        label: v.label === undefined ? undefined : String(evalueer(v.label, gi) ?? ''),
        symbool: v.symbool === undefined ? undefined : String(evalueer(v.symbool, gi) ?? ''),
      });
    }
  }
  const maatlijnen: TekeningResultaat['maatlijnen'] = [];
  for (const m of t.maatlijnen) {
    if (!evalueerWaar(m.als, g)) continue;
    const [x1, y1, x2, y2] = [m.x1, m.y1, m.x2, m.y2].map((f) => rond(evalueerGetal(f, g), 2)) as [number, number, number, number];
    const lengte = rond(Math.hypot(x2 - x1, y2 - y1), 1);
    if (lengte <= 0) continue;
    maatlijnen.push({
      code: m.code,
      x1, y1, x2, y2,
      afstand: evalueerGetal(m.afstand, g),
      tekst: m.tekst === undefined ? `${lengte}` : String(evalueer(m.tekst, g) ?? ''),
    });
  }
  return { titel: t.titel, eenheid: t.eenheid, vormen, maatlijnen };
}
