/** Stap 1 · Dak: oriëntatie, gebouwen en dakvlakken met legplan en obstakels. */
import { SCHADUW_LABEL, standFactor, windstreek, normHoek, type Dakvorm, type Gebouw, type ObstakelSoort, type VlakLegplan } from '../../core/src/zon.js';
import { el, getal, getalVeld, keuzeVeld, knop, schakelaar, svgUit, tegels, tekstVeld } from './hulp.js';
import { kompasSvg, legplanSvg } from './tekeningen.js';
import { adresZoeker } from './adres-ui.js';
import { resultaat, toestand, wijzig, wijzigVlak } from './staat.js';

const DAKVORMEN: { waarde: Dakvorm; label: string; extra: string }[] = [
  { waarde: 'zadel', label: 'Zadeldak', extra: 'twee dakvlakken' },
  { waarde: 'lessenaar', label: 'Lessenaarsdak', extra: 'één schuin vlak' },
  { waarde: 'plat', label: 'Plat dak', extra: 'panelen op driehoeken' },
];
const OBSTAKELS: [ObstakelSoort, string][] = [['dakraam', 'Dakraam'], ['schoorsteen', 'Schoorsteen'], ['dakkapel', 'Dakkapel'], ['verluchting', 'Verluchting']];

export function toonDak(houder: HTMLElement) {
  const p = toestand();
  const r = resultaat();
  houder.replaceChildren(
    el('section', { class: 'stap' }, el('h2', {}, el('span', { class: 'stapnr' }, '1'), 'Ligging'), adresZoeker(() => toonDak(houder)), ligging()),
    ...p.gebouwen.map((g, i) => gebouwKaart(g, i)),
    el('div', { class: 'knoppenrij' }, knop('+ Gebouw toevoegen (bv. garage of bijgebouw)', voegGebouwToe)),
    el('h2', { class: 'tussenkop' }, 'Dakvlakken en legplan'),
    el('p', { class: 'klein' }, 'Klik op een paneel om het uit of terug aan te zetten. Panelen die een obstakel raken, vallen automatisch weg.'),
    ...r.legplan.map((l) => vlakKaart(l)),
  );
}

function ligging(): HTMLElement {
  const p = toestand();
  const kompas = svgUit(kompasSvg(p.orientatie));
  for (const w of kompas.querySelectorAll<SVGGElement>('.windstreek')) {
    const kies = () => wijzig((q) => { q.orientatie = Number(w.dataset.azimut); });
    w.addEventListener('click', kies);
    w.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); kies(); } });
  }
  return el('div', { class: 'ligging' },
    el('div', { class: 'kompasvak' }, kompas),
    el('div', {},
      el('p', {}, 'Waar kijkt de ', el('strong', {}, 'voorgevel'), ' naartoe? Klik een windstreek of geef de hoek.'),
      getalVeld('Oriëntatie voorgevel', p.orientatie, (w) => wijzig((q) => { q.orientatie = normHoek(Math.round(w)); }), { min: -180, max: 180, stap: 5, eenheid: `° (${windstreek(p.orientatie)})`, hulp: '0° = zuid, −90° = oost, +90° = west, 180° = noord. Tip: meet de hoek op een kaart of satellietbeeld.' }),
    ));
}

function gebouwKaart(g: Gebouw, i: number): HTMLElement {
  const zet = (f: (x: Gebouw) => void) => wijzig((p) => { const x = p.gebouwen.find((y) => y.id === g.id); if (x) f(x); });
  const maten = el('div', { class: 'raster3' },
    getalVeld('Breedte voorgevel', g.breedte, (w) => zet((x) => { x.breedte = w; }), { min: 200, max: 4000, stap: 10, eenheid: 'cm' }),
    getalVeld('Diepte', g.diepte, (w) => zet((x) => { x.diepte = w; }), { min: 200, max: 4000, stap: 10, eenheid: 'cm' }),
    getalVeld(g.dakvorm === 'plat' ? 'Hoogte dakrand' : 'Goothoogte', g.goothoogte, (w) => zet((x) => { x.goothoogte = w; }), { min: 200, max: 2000, stap: 10, eenheid: 'cm' }),
    g.dakvorm === 'plat' ? null : getalVeld('Dakhelling', g.helling, (w) => zet((x) => { x.helling = w; }), { min: 5, max: 70, stap: 1, eenheid: '°' }),
  );
  const kop = el('h2', {}, el('span', { class: 'stapnr' }, String(i + 2)), g.naam || 'Gebouw');
  const kaart = el('section', { class: 'stap' }, kop,
    el('div', { class: 'raster2' },
      tekstVeld('Naam', g.naam, (w) => zet((x) => { x.naam = w || 'Gebouw'; })),
      i > 0 ? getalVeld('Plaats t.o.v. de woning (links − / rechts +)', g.x, (w) => zet((x) => { x.x = w; }), { stap: 10, eenheid: 'cm' }) : null),
    tegels('Dakvorm', DAKVORMEN, g.dakvorm, (w) => zet((x) => {
      x.dakvorm = w as Dakvorm;
      if (w !== 'plat' && x.helling < 5) x.helling = w === 'lessenaar' ? 15 : 35;
    })),
    maten,
  );
  if (i > 0) kaart.append(el('div', { class: 'knoppenrij' }, knop('Gebouw verwijderen', () => wijzig((p) => {
    p.gebouwen = p.gebouwen.filter((x) => x.id !== g.id);
    for (const k of Object.keys(p.vlakken)) if (k.startsWith(`${g.id}-`)) delete p.vlakken[k];
  }), 'tweede gevaar')));
  return kaart;
}

function voegGebouwToe() {
  wijzig((p) => {
    const rechts = Math.max(...p.gebouwen.map((g) => g.x + g.breedte / 2));
    const hoofd = p.gebouwen[0]!;
    const id = `gebouw${Date.now().toString(36)}`;
    p.gebouwen.push({ id, naam: p.gebouwen.length === 1 ? 'Garage' : `Bijgebouw ${p.gebouwen.length}`, dakvorm: 'plat', breedte: 400, diepte: 600, goothoogte: 290, helling: 0, x: rechts + 200, z: hoofd.z - hoofd.diepte / 2 + 300 });
  });
}

function vlakKaart(l: VlakLegplan): HTMLElement {
  const { vlak, instelling: inst } = l;
  const p = toestand();
  const r = resultaat();
  const plat = vlak.zijde === 'plat';
  const factor = plat ? null : standFactor(vlak.helling, vlak.azimut);
  const kwp = (l.aantal * r.paneel.wp) / 1000;
  const zet = (f: Parameters<typeof wijzigVlak>[1]) => wijzigVlak(vlak.id, f);

  const kop = el('div', { class: 'kaartkop' },
    el('h3', {}, vlak.naam, el('span', { class: 'klein' }, plat ? ` · plat` : ` · ${windstreek(vlak.azimut)}, ${vlak.helling}°`)),
    el('span', { class: `status ${!inst.actief ? 'let-op' : factor !== null && factor < 0.7 ? 'let-op' : 'ok'}` },
      inst.actief ? `${l.aantal} panelen · ${getal(kwp, 2)} kWp${factor !== null ? ` · ${Math.round(factor * 100)} % zon` : ''}` : 'geen panelen'));

  const tekening = svgUit(legplanSvg(l, { klikbaar: inst.actief }));
  const wissel = (sleutel: string) => {
    if (toestand().doelAantal === null) {
      zet((v) => { v.uit = v.uit.includes(sleutel) ? v.uit.filter((s) => s !== sleutel) : [...v.uit, sleutel]; });
      return;
    }
    // Er is een gewenst aantal: de huidige keuze vastleggen per paneel en dan dit paneel omdraaien.
    wijzig((q) => {
      for (const x of r.legplan) q.vlakken[x.vlak.id] = { ...structuredClone(x.instelling), uit: x.panelen.filter((y) => !y.actief).map((y) => y.sleutel) };
      q.doelAantal = null;
      const v = q.vlakken[vlak.id]!;
      v.uit = v.uit.includes(sleutel) ? v.uit.filter((s) => s !== sleutel) : [...v.uit, sleutel];
    });
  };
  for (const g of tekening.querySelectorAll<SVGGElement>('[data-sleutel]')) {
    g.addEventListener('click', () => wissel(g.dataset.sleutel!));
    g.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); wissel(g.dataset.sleutel!); } });
  }

  const instellingen = el('div', { class: 'raster3' },
    plat ? null : keuzeVeld('Dakbedekking', [['pannen', 'Pannen'], ['leien', 'Leien'], ['golfplaat', 'Golfplaten']], inst.bedekking, (w) => zet((v) => { v.bedekking = w as typeof v.bedekking; })),
    plat ? keuzeVeld('Opstelling', [['zuid', 'Eén richting (zo zuidelijk mogelijk)'], ['oostwest', 'Oost-west (rug aan rug)']], inst.opstelling, (w) => zet((v) => { v.opstelling = w as typeof v.opstelling; v.kanteling = w === 'oostwest' ? 10 : 13; v.uit = []; }))
      : keuzeVeld('Ligging panelen', [['staand', 'Staand'], ['liggend', 'Liggend']], inst.ligging, (w) => zet((v) => { v.ligging = w as typeof v.ligging; v.uit = []; })),
    plat ? getalVeld('Hellingshoek panelen', inst.kanteling, (w) => zet((v) => { v.kanteling = w; v.uit = []; }), { min: 5, max: 35, eenheid: '°' }) : null,
    keuzeVeld('Schaduw (bomen, buren)', Object.entries(SCHADUW_LABEL) as [string, string][], inst.schaduw, (w) => zet((v) => { v.schaduw = w as typeof v.schaduw; })),
    getalVeld(plat ? 'Vrije rand (wind)' : 'Vrije rand', inst.rand, (w) => zet((v) => { v.rand = w; v.uit = []; }), { min: 0, max: 200, stap: 5, eenheid: 'cm' }),
  );

  const obstakels = el('div', { class: 'obstakels' }, el('h4', {}, 'Obstakels', el('span', { class: 'klein' }, ' — maat vanaf de linkerbenedenhoek, gezien van buiten')));
  for (const ob of inst.obstakels) {
    const zetOb = (f: (o: typeof ob) => void) => zet((v) => { const o = v.obstakels.find((x) => x.id === ob.id); if (o) f(o); });
    obstakels.append(el('div', { class: 'obstakelrij' },
      keuzeVeld('Soort', OBSTAKELS, ob.soort, (w) => zetOb((o) => { o.soort = w as ObstakelSoort; })),
      getalVeld('Van links', ob.x, (w) => zetOb((o) => { o.x = w; }), { min: 0, eenheid: 'cm' }),
      getalVeld(plat ? 'Van voorkant' : 'Van goot', ob.y, (w) => zetOb((o) => { o.y = w; }), { min: 0, eenheid: 'cm' }),
      getalVeld('Breedte', ob.b, (w) => zetOb((o) => { o.b = w; }), { min: 10, eenheid: 'cm' }),
      getalVeld('Hoogte', ob.h, (w) => zetOb((o) => { o.h = w; }), { min: 10, eenheid: 'cm' }),
      knop('×', () => zet((v) => { v.obstakels = v.obstakels.filter((x) => x.id !== ob.id); }), 'tweede wis', 'Obstakel verwijderen'),
    ));
  }
  obstakels.append(el('div', { class: 'knoppenrij' },
    knop('+ Obstakel', () => zet((v) => { v.obstakels.push({ id: `o${Date.now().toString(36)}`, soort: 'dakraam', x: Math.round(vlak.breedte / 2 - 39), y: Math.round(vlak.lengte / 2 - 59), b: 78, h: 118 }); })),
  ));

  const kaart = el('section', { class: `stap vlak${inst.actief ? '' : ' uitgezet'}` }, kop,
    schakelaar('Panelen op dit dakvlak', inst.actief, (w) => zet((v) => { v.actief = w; })),
  );
  if (inst.actief) {
    kaart.append(instellingen, el('div', { class: 'tekening' }, tekening),
      el('div', { class: 'knoppenrij' },
        knop('Alle plaatsen aan', () => zet((v) => { v.uit = []; })),
        knop('Alle uit', () => zet((v) => { v.uit = l.panelen.map((x) => x.sleutel); })),
        l.geblokkeerd ? el('span', { class: 'klein' }, `${l.geblokkeerd} plaats(en) vervallen door obstakels`) : null),
      obstakels);
  } else if (!plat && factor !== null) {
    kaart.append(el('p', { class: 'klein' }, `Dit vlak kijkt naar ${windstreek(vlak.azimut)} en levert ${Math.round(factor * 100)} % van een ideaal zuiddak.`));
  }
  void p;
  return kaart;
}
