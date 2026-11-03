/** Stap 4 · Offerte: klant, btw, korting, offerteregels, kerncijfers, legplannen en bestellijst. */
import { windstreek } from '../../core/src/zon.js';
import { el, eur, getal, getalVeld, klantweergave, knop, kopieer, schakelaar, svgUit, tekstVeld } from './hulp.js';
import { legplanSvg } from './tekeningen.js';
import { resultaat, toestand, wijzig } from './staat.js';

export function toonOfferte(houder: HTMLElement) {
  const p = toestand();
  const r = resultaat();
  const o = r.offerte;
  const intern = !klantweergave();
  const vandaag = new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });

  const klant = el('section', { class: 'stap geen-afdruk' }, el('h2', {}, el('span', { class: 'stapnr' }, 'A'), 'Klant en voorwaarden'),
    el('div', { class: 'raster2' },
      tekstVeld('Naam', p.klant.naam, (w) => wijzig((q) => { q.klant.naam = w; }), { plaats: 'Fam. …' }),
      tekstVeld('Adres van de installatie', p.klant.adres, (w) => wijzig((q) => { q.klant.adres = w; })),
      tekstVeld('Telefoon', p.klant.telefoon, (w) => wijzig((q) => { q.klant.telefoon = w; }), { type: 'tel' }),
      tekstVeld('E-mail', p.klant.email, (w) => wijzig((q) => { q.klant.email = w; }), { type: 'email' }),
    ),
    schakelaar('Privéwoning ouder dan 10 jaar (6 % btw)', p.woningOuderDan10, (w) => wijzig((q) => { q.woningOuderDan10 = w; }), 'Anders 21 %. De klant bevestigt dit schriftelijk op de offerte (btw-attest).'),
    intern ? getalVeld('Korting', p.korting, (w) => wijzig((q) => { q.korting = w; }), { min: 0, max: 50, stap: 0.5, eenheid: '%' }) : null,
  );

  // Offerteregels per groep.
  const groepen = [...new Set(o.regels.map((x) => x.groep))];
  const body = el('tbody');
  for (const g of groepen) {
    body.append(el('tr', { class: 'groep' }, el('td', { colspan: '4' }, g)));
    for (const x of o.regels.filter((y) => y.groep === g)) {
      body.append(el('tr', {}, el('td', {}, x.omschrijving), el('td', { class: 'getal' }, `${getal(x.hoeveelheid)} ${x.eenheid}`), el('td', { class: 'getal' }, eur(x.eenheidsprijs)), el('td', { class: 'getal' }, eur(x.totaal))));
    }
  }
  const tot = (label: string, w: string, klasse = '') => el('tr', { class: klasse }, el('td', { colspan: '3' }, label), el('td', { class: 'getal' }, w));
  const voet = el('tfoot', {},
    o.korting > 0 ? tot('Subtotaal', eur(o.bruto)) : null,
    o.korting > 0 ? tot(`Korting ${getal(o.kortingProcent, 1)} %`, `− ${eur(o.korting)}`) : null,
    tot('Totaal excl. btw', eur(o.excl)),
    tot(`Btw ${o.btwProcent} %`, eur(o.btw)),
    tot('Totaal incl. btw', eur(o.incl), 'eind'),
  );
  const tabel = el('table', { class: 'tabel offerte' }, el('thead', {}, el('tr', {}, el('th', {}, 'Omschrijving'), el('th', { class: 'getal' }, 'Aantal'), el('th', { class: 'getal' }, 'Prijs'), el('th', { class: 'getal' }, 'Totaal'))), body, voet);

  const kern = el('dl', { class: 'detail kern' },
    el('dt', {}, 'Installatie'), el('dd', {}, `${r.aantal} panelen · ${getal(r.kwp, 2)} kWp`),
    el('dt', {}, 'Omvormer'), el('dd', {}, r.omvormer ? `${r.omvormer.merk} ${r.omvormer.naam}${r.aantalOmvormers > 1 ? ` × ${r.aantalOmvormers}` : ''}` : '–'),
    el('dt', {}, 'Batterij'), el('dd', {}, r.batterij ? `${r.batterij.naam} (${getal(r.batterij.kwh, 1)} kWh)` : 'geen'),
    el('dt', {}, 'Verwachte opbrengst'), el('dd', {}, `± ${getal(Math.round(r.productie / 50) * 50)} kWh per jaar`),
    el('dt', {}, 'Zelf verbruikt'), el('dd', {}, `± ${getal(r.autarkie)} % van je verbruik`),
    el('dt', {}, 'Besparing jaar 1'), el('dd', {}, `± ${eur(r.besparingJaar1, 0)}`),
    el('dt', {}, 'Terugverdientijd'), el('dd', {}, r.terugverdientijd !== null ? `± ${getal(r.terugverdientijd, 1)} jaar` : '> 25 jaar'),
  );

  const legplannen = el('div', { class: 'legplannen' }, ...r.legplan.filter((l) => l.aantal > 0).map((l) =>
    el('figure', {}, svgUit(legplanSvg(l)), el('figcaption', {}, `${l.vlak.naam}: ${l.aantal} panelen, ${l.vlak.zijde === 'plat' ? `plat dak (${l.instelling.opstelling === 'oostwest' ? 'oost-west' : 'één richting'}, ${l.instelling.kanteling}°)` : `${windstreek(l.vlak.azimut)}, ${l.vlak.helling}°`}`))));

  const marge = intern ? el('dl', { class: 'detail intern' },
    el('dt', {}, 'Kostprijs'), el('dd', {}, eur(o.kostprijs)),
    el('dt', {}, 'Marge'), el('dd', {}, o.margeProcent !== null ? `${eur(o.excl - o.kostprijs)} (${getal(o.margeProcent, 1)} %)` : '–'),
    el('dt', {}, 'Prijs per Wp'), el('dd', {}, r.kwp > 0 ? `${eur(o.excl / (r.kwp * 1000))} excl.` : '–'),
  ) : null;

  // Bestellijst per leverancier (intern).
  const melding = el('span', { class: 'klein', 'aria-live': 'polite' });
  const leveranciers = [...new Set(r.bestellijst.map((b) => b.leverancier))];
  const bestel = intern ? el('section', { class: 'stap intern geen-afdruk' }, el('h2', {}, el('span', { class: 'stapnr' }, 'C'), 'Bestellijst'),
    ...leveranciers.map((lv) => el('div', {}, el('h3', {}, lv), el('table', { class: 'tabel' }, el('tbody', {}, ...r.bestellijst.filter((b) => b.leverancier === lv).map((b) =>
      el('tr', {}, el('td', {}, b.omschrijving), el('td', { class: 'getal' }, `${getal(b.aantal, Number.isInteger(b.aantal) ? 0 : 1)} ${b.eenheid}`))))))),
    el('div', { class: 'knoppenrij' },
      knop('Kopiëren voor Excel', () => kopieer(['Leverancier\tArtikel\tOmschrijving\tAantal\tEenheid', ...r.bestellijst.map((b) => [b.leverancier, b.artikel, b.omschrijving, String(b.aantal).replace('.', ','), b.eenheid].join('\t'))].join('\n'), melding)),
      melding),
    el('p', { class: 'hulp' }, 'Montagemateriaal is een benadering (rails per rij, haken om de 120 cm, ballast volgens windberekening van de leverancier).'),
  ) : null;

  const geldig = r.geldig ? null : el('p', { class: 'waarschuwing' }, 'Let op: er staan nog fouten in de controles. Los die op vóór je de offerte verstuurt.');

  houder.replaceChildren(
    klant,
    el('section', { class: 'stap offertedoc' },
      el('div', { class: 'offertekop' },
        el('div', {}, el('h2', {}, 'Offerte zonne-installatie'), el('p', { class: 'klein' }, `${vandaag} · geldig 30 dagen · demo`)),
        el('div', { class: 'klantblok' }, el('strong', {}, p.klant.naam || 'Klant'), el('span', {}, p.klant.adres), el('span', {}, [p.klant.telefoon, p.klant.email].filter(Boolean).join(' · ')))),
      geldig,
      kern,
      legplannen,
      tabel,
      marge,
      el('div', { class: 'voorwaarden' },
        el('h3', {}, 'Goed om te weten'),
        el('ul', {},
          el('li', {}, 'De opbrengst is een schatting voor een gemiddeld jaar in België; de werkelijke opbrengst hangt af van het weer.'),
          el('li', {}, 'Na de plaatsing volgen de AREI-keuring en de aanmelding bij de netbeheerder; die zijn inbegrepen.'),
          el('li', {}, 'Het definitieve legplan wordt bevestigd na de technische opmeting ter plaatse (dakstructuur, zekeringkast, kabelweg).'),
          p.woningOuderDan10 ? el('li', {}, '6 % btw onder voorbehoud van een woning ouder dan 10 jaar, gebruikt als privéwoning (attest op de offerte).') : null,
          el('li', {}, 'Merken, typenummers en prijzen in deze demo zijn verzonnen.'),
        )),
      el('div', { class: 'knoppenrij geen-afdruk' },
        knop('Afdrukken of PDF', () => window.print(), 'hoofd'),
        knop('Bewaren als bestand', () => bewaarBestand())),
    ),
    bestel ?? '',
  );
}

export function bewaarBestand() {
  const p = toestand();
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `${(p.klant.naam || 'zonnepanelen').replace(/[^\w\- ]+/g, '').trim() || 'zonnepanelen'}.zon.json` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
