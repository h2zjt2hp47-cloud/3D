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
/** Gekozen obstakel om te plaatsen (klik op het dak). */
let plaatsen: { vlak: string; soort: ObstakelSoort } | null = null;
let herteken: () => void = () => {};
/** Standaardmaat (breedte × hoogte op het dak, cm). */
const STANDAARDMAAT: Record<ObstakelSoort, [number, number]> = { dakraam: [78, 118], schoorsteen: [60, 60], dakkapel: [250, 160], verluchting: [30, 30] };
const OBSTAKELS: [ObstakelSoort, string][] = [['dakraam', 'Dakraam'], ['schoorsteen', 'Schoorsteen'], ['dakkapel', 'Dakkapel'], ['verluchting', 'Verluchting']];

export function toonDak(houder: HTMLElement) {
  herteken = () => toonDak(houder);
  const p = toestand();
  const r = resultaat();
  houder.replaceChildren(
    el('section', { class: 'stap' }, el('h2', {}, el('span', { class: 'stapnr' }, '1'), 'Ligging'), adresZoeker(() => toonDak(houder)), ligging()),
    ...p.gebouwen.map((g, i) => gebouwKaart(g, i)),
    el('div', { class: 'knoppenrij' }, knop('+ Gebouw toevoegen (bv. garage of bijgebouw)', voegGebouwToe)),
    el('h2', { class: 'tussenkop' }, 'Dakvlakken en legplan'),
    el('p', { class: 'klein' }, 'Klik op een paneel om het uit of terug aan te zetten. Versleep een obstakel (dakraam, schoorsteen…) naar zijn plaats en maak het groter of kleiner met de witte greep; panelen die het raken, vallen automatisch weg.'),
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

  // Obstakels verslepen (muis of vinger) of verplaatsen met de pijltjestoetsen (10 cm, met Shift 50 cm).
  const svg = tekening as SVGSVGElement;
  const verplaats = (id: string, dx: number, dy: number) => zet((v) => {
    const o = v.obstakels.find((x) => x.id === id);
    if (!o) return;
    o.x = Math.round(Math.min(Math.max(0, o.x + dx), vlak.breedte - o.b) / 5) * 5;
    o.y = Math.round(Math.min(Math.max(0, o.y + dy), vlak.lengte - o.h) / 5) * 5;
  });
  for (const g of svg.querySelectorAll<SVGGElement>('[data-obstakel]')) {
    const id = g.dataset.obstakel!;
    g.style.touchAction = 'none';
    let start: { x: number; y: number } | null = null;
    let schuif = { x: 0, y: 0 };
    const punt = (e: PointerEvent) => {
      const m = svg.getScreenCTM();
      if (!m) return { x: 0, y: 0 };
      const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      return { x: q.x, y: q.y };
    };
    g.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      g.setPointerCapture(e.pointerId);
      start = punt(e);
      schuif = { x: 0, y: 0 };
      g.classList.add('sleept');
    });
    g.addEventListener('pointermove', (e) => {
      if (!start) return;
      const q = punt(e);
      schuif = { x: q.x - start.x, y: q.y - start.y };
      g.setAttribute('transform', `translate(${schuif.x} ${schuif.y})`);
    });
    const los = () => {
      if (!start) return;
      start = null;
      g.classList.remove('sleept');
      // In de tekening loopt y naar beneden; op het dak meten we vanaf de goot (naar boven).
      if (Math.hypot(schuif.x, schuif.y) >= 2) verplaats(id, schuif.x, -schuif.y);
      else g.removeAttribute('transform');
    };
    g.addEventListener('pointerup', los);
    g.addEventListener('pointercancel', los);
    g.addEventListener('keydown', (e) => {
      const stap = e.shiftKey ? 50 : 10;
      const d = ({ ArrowLeft: [-stap, 0], ArrowRight: [stap, 0], ArrowUp: [0, stap], ArrowDown: [0, -stap] } as Record<string, [number, number]>)[e.key];
      if (!d) return;
      e.preventDefault();
      if (e.altKey) maat(id, d[0], d[1]);
      else verplaats(id, d[0], d[1]);
      requestAnimationFrame(() => (document.querySelector(`[data-obstakel="${CSS.escape(id)}"]`) as SVGGElement | null)?.focus());
    });
  }

  // Grootte aanpassen: greep in de rechterbovenhoek slepen, of Alt + pijltjestoetsen (10 cm, met Shift 50 cm).
  const maat = (id: string, db: number, dh: number) => zet((v) => {
    const o = v.obstakels.find((x) => x.id === id);
    if (!o) return;
    o.b = Math.round(Math.min(Math.max(20, o.b + db), vlak.breedte - o.x) / 5) * 5;
    o.h = Math.round(Math.min(Math.max(20, o.h + dh), vlak.lengte - o.y) / 5) * 5;
  });
  for (const g of svg.querySelectorAll<SVGGElement>('[data-greep]')) {
    const id = g.dataset.greep!;
    const obEl = svg.querySelector<SVGGElement>(`[data-obstakel="${CSS.escape(id)}"] rect`);
    g.style.touchAction = 'none';
    let start: { x: number; y: number; b: number; h: number; ry: number } | null = null;
    let nieuw = { b: 0, h: 0 };
    const punt = (e: PointerEvent) => {
      const m = svg.getScreenCTM();
      const q = m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : { x: 0, y: 0 };
      return { x: q.x, y: q.y };
    };
    g.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      g.setPointerCapture(e.pointerId);
      const q = punt(e);
      start = { ...q, b: Number(obEl?.getAttribute('width')), h: Number(obEl?.getAttribute('height')), ry: Number(obEl?.getAttribute('y')) };
      nieuw = { b: start.b, h: start.h };
    });
    g.addEventListener('pointermove', (e) => {
      if (!start || !obEl) return;
      const q = punt(e);
      nieuw = { b: Math.max(20, start.b + q.x - start.x), h: Math.max(20, start.h - (q.y - start.y)) };
      // Voorbeeld tijdens het slepen: de onderkant (kant van de goot) blijft staan.
      obEl.setAttribute('width', String(nieuw.b));
      obEl.setAttribute('height', String(nieuw.h));
      obEl.setAttribute('y', String(start.ry + start.h - nieuw.h));
      g.setAttribute('transform', `translate(${nieuw.b - start.b} ${start.h - nieuw.h})`);
    });
    const los = () => {
      if (!start) return;
      const s0 = start;
      start = null;
      if (Math.abs(nieuw.b - s0.b) >= 2 || Math.abs(nieuw.h - s0.h) >= 2) maat(id, nieuw.b - s0.b, nieuw.h - s0.h);
    };
    g.addEventListener('pointerup', los);
    g.addEventListener('pointercancel', los);
    g.addEventListener('keydown', (e) => {
      const stap = e.shiftKey ? 50 : 10;
      const d = ({ ArrowLeft: [-stap, 0], ArrowRight: [stap, 0], ArrowUp: [0, stap], ArrowDown: [0, -stap] } as Record<string, [number, number]>)[e.key];
      if (!d) return;
      e.preventDefault();
      maat(id, d[0], d[1]);
      requestAnimationFrame(() => (document.querySelector(`[data-greep="${CSS.escape(id)}"]`) as SVGGElement | null)?.focus());
    });
  }
  // Plaatsen: kies een soort en klik op het dak.
  if (plaatsen?.vlak === vlak.id) {
    svg.classList.add('plaatsen');
    svg.addEventListener('click', (e) => {
      const m = svg.getScreenCTM();
      if (!m || !plaatsen) return;
      e.stopPropagation();
      e.preventDefault();
      const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      const soort = plaatsen.soort;
      const [b, h] = STANDAARDMAAT[soort];
      plaatsen = null;
      zet((v) => {
        v.obstakels.push({
          id: `o${Date.now().toString(36)}`, soort,
          x: Math.round(Math.min(Math.max(0, q.x - b / 2), vlak.breedte - b) / 5) * 5,
          y: Math.round(Math.min(Math.max(0, vlak.lengte - q.y - h / 2), vlak.lengte - h) / 5) * 5, b, h,
        });
      });
    }, { capture: true });
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
  const kiesPlaats = (soort: ObstakelSoort) => {
    plaatsen = plaatsen?.vlak === vlak.id && plaatsen.soort === soort ? null : { vlak: vlak.id, soort };
    herteken();
  };
  obstakels.append(el('div', { class: 'knoppenrij plaatsrij' },
    el('span', { class: 'klein' }, 'Toevoegen: kies en klik op het dak'),
    ...OBSTAKELS.map(([soort, naam]) => {
      const b = knop(`+ ${naam}`, () => kiesPlaats(soort), 'tweede');
      b.setAttribute('aria-pressed', String(plaatsen?.vlak === vlak.id && plaatsen.soort === soort));
      return b;
    }),
  ));
  if (plaatsen?.vlak === vlak.id) {
    const n = OBSTAKELS.find(([s2]) => s2 === plaatsen!.soort)![1].toLowerCase();
    obstakels.append(el('p', { class: 'plaatsmelding', role: 'status' }, `Klik op het dak waar ${plaatsen.soort === 'dakraam' ? 'het' : 'de'} ${n} moet komen. Grootte achteraf aanpassen met de witte greep.`));
  }

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
