/**
 * Werf: inmeting per raam of deur (tabletvriendelijk: grote velden, foto) en meerwerk
 * (wat veranderde sinds het akkoord van de klant, plus vrije regels), met handtekening en afdruk.
 */
import { niveauVan, tekenSvg, vergelijkOfferte, verdiepingenVan, verwerkMeting, type MeerwerkLijn, type Momentopname } from '../../core/src/index.js';
import { planCatalogus, planNaarRegels } from '../../core/voorbeelden/inrichting.js';
import { $, el, eur, getal, num } from './hulp.js';
import { klantKorting, nieuweId, openingVan, resultaat, toestand, wijzig, type Inmeting, type Positie } from './staat.js';

let tab: 'inmeting' | 'meerwerk' = 'inmeting';
let naarPositie: (id: string) => void = () => {};

const vandaag = () => new Date().toISOString().slice(0, 10);
const leegMeting = (): Inmeting => ({ breedtes: [null, null, null], hoogtes: [null, null], diagonalen: [null, null], speling: 10, opmerking: '', status: 'open' });

// ---------- momentopname en meerwerk ----------
export function momentopname(): Momentopname {
  const t = toestand();
  return {
    posities: t.posities.map((p) => {
      const r = resultaat(p);
      return { id: p.id, code: p.code, naam: p.naam, aantal: p.aantal, stukprijs: r.prijs.brutoprijsExcl, details: r.samenvatting };
    }),
    regels: planNaarRegels(t.plan, t.meta.regels, planCatalogus).map((r) => ({ code: r.code, omschrijving: r.omschrijving, eenheid: r.eenheid, hoeveelheid: r.hoeveelheid, eenheidsprijs: r.eenheidsprijs })),
  };
}

export function legAkkoordVast(naam: string) {
  const m = momentopname();
  const excl = [...m.posities.map((p) => p.stukprijs * p.aantal), ...m.regels.map((r) => r.hoeveelheid * r.eenheidsprijs)].reduce((a, b) => a + b, 0) * (1 - klantKorting() / 100);
  wijzig('meta', (t) => {
    t.meta.akkoord = { datum: vandaag(), naam, excl: Math.round(excl * 100) / 100, ...m };
    t.meta.meerwerk = [];
    t.meta.meerwerkbon = { nummer: 1, naam, datum: vandaag(), getekend: false };
  });
}

export function meerwerk(): { lijnen: MeerwerkLijn[]; vrij: { omschrijving: string; bedrag: number }[]; subtotaal: number; korting: number; excl: number; btw: number; incl: number } | undefined {
  const t = toestand();
  if (!t.meta.akkoord) return undefined;
  const lijnen = vergelijkOfferte(t.meta.akkoord, momentopname());
  const vrij = t.meta.meerwerk.map((r) => ({ omschrijving: `${r.omschrijving} (${getal(r.hoeveelheid, 2)} ${r.eenheid} × ${eur(r.eenheidsprijs)})`, bedrag: Math.round(r.hoeveelheid * r.eenheidsprijs * 100) / 100 }));
  const subtotaal = [...lijnen, ...vrij].reduce((s, l) => s + l.bedrag, 0);
  const korting = Math.round(subtotaal * klantKorting()) / 100;
  const excl = Math.round((subtotaal - korting) * 100) / 100;
  const btw = Math.round(excl * t.meta.btw) / 100;
  return { lijnen, vrij, subtotaal, korting, excl, btw, incl: Math.round((excl + btw) * 100) / 100 };
}

// ---------- inmeting ----------
function plaatsVan(p: Positie): string {
  const o = openingVan(p);
  const r = resultaat(p);
  const ruimte = r.kenmerken.find((k) => k.code === 'ruimte')?.weergave ?? '';
  if (!o) return ruimte;
  const verdiep = verdiepingenVan(toestand().plan)[niveauVan(o)]?.naam ?? '';
  return `${ruimte} · ${verdiep}`;
}

function zetMeting(id: string, f: (m: Inmeting) => void) {
  wijzig('werf', (t) => {
    const p = t.posities.find((x) => x.id === id);
    if (!p) return;
    p.inmeting ??= leegMeting();
    f(p.inmeting);
    if (p.inmeting.status !== 'overgenomen') {
      const b = num(p.keuzes.breedte), h = num(p.keuzes.hoogte);
      p.inmeting.status = verwerkMeting(p.inmeting, { b, h }).compleet ? 'gemeten' : 'open';
    }
  });
}

function maatInvoer(id: string, label: string, waarde: number | null, bij: (w: number | null) => void): HTMLElement {
  const l = el('label', { class: 'meetveld', for: id });
  const i = el('input', { type: 'number', id, inputmode: 'numeric', min: '0', step: '1', placeholder: 'mm' }) as HTMLInputElement;
  if (waarde !== null && waarde !== undefined) i.value = String(waarde);
  i.addEventListener('change', () => bij(i.value === '' ? null : Math.round(Number(i.value))));
  l.append(el('span', {}, label), i);
  return l;
}

/** Foto verkleinen tot max. 640 px (JPEG), zodat ze in de browser bewaard kan worden. */
function verkleinFoto(bestand: File): Promise<string> {
  return new Promise((ok, fout) => {
    const lezer = new FileReader();
    lezer.onerror = () => fout(lezer.error);
    lezer.onload = () => {
      const img = new Image();
      img.onerror = () => fout(new Error('Foto kon niet gelezen worden.'));
      img.onload = () => {
        const s = Math.min(1, 640 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL('image/jpeg', 0.7));
      };
      img.src = String(lezer.result);
    };
    lezer.readAsDataURL(bestand);
  });
}

function metingKaart(p: Positie): HTMLElement {
  const m = p.inmeting ?? leegMeting();
  const b = num(p.keuzes.breedte), h = num(p.keuzes.hoogte);
  const res = verwerkMeting(m, { b, h });
  const kaart = el('article', { class: `kaart meting ${m.status}` });
  const kop = el('div', { class: 'positiekop' });
  const status = m.status === 'overgenomen' ? ['ok', 'bestelmaat overgenomen'] : m.status === 'gemeten' ? ['let-op', 'gemeten, nog over te nemen'] : ['fout', 'nog te meten'];
  kop.append(el('span', { class: 'code' }, p.code), el('strong', {}, p.naam), el('span', { class: `status ${status[0]}` }, status[1]!));
  const sub = el('p', { class: 'klein' }, `${plaatsVan(p)} · offerte: ${getal(b)} × ${getal(h)} mm`);
  const tekening = el('div', { class: 'mini' });
  const r = resultaat(p);
  tekening.innerHTML = r.tekening ? tekenSvg(r.tekening, { breedtePx: 150, lijnkleur: '#2b2b28', maatkleur: '#34505f' }) : '';

  const velden = el('div', { class: 'meetvelden' });
  const id = (s: string) => `m-${p.id}-${s}`;
  velden.append(
    el('p', { class: 'meetkop' }, 'Breedte opening'),
    maatInvoer(id('b0'), 'Boven', m.breedtes[0] ?? null, (w) => zetMeting(p.id, (x) => { x.breedtes[0] = w; })),
    maatInvoer(id('b1'), 'Midden', m.breedtes[1] ?? null, (w) => zetMeting(p.id, (x) => { x.breedtes[1] = w; })),
    maatInvoer(id('b2'), 'Onder', m.breedtes[2] ?? null, (w) => zetMeting(p.id, (x) => { x.breedtes[2] = w; })),
    el('p', { class: 'meetkop' }, 'Hoogte opening'),
    maatInvoer(id('h0'), 'Links', m.hoogtes[0] ?? null, (w) => zetMeting(p.id, (x) => { x.hoogtes[0] = w; })),
    maatInvoer(id('h1'), 'Rechts', m.hoogtes[1] ?? null, (w) => zetMeting(p.id, (x) => { x.hoogtes[1] = w; })),
    el('p', { class: 'meetkop' }, 'Diagonalen en speling'),
    maatInvoer(id('d0'), 'Diagonaal 1', m.diagonalen[0] ?? null, (w) => zetMeting(p.id, (x) => { x.diagonalen[0] = w; })),
    maatInvoer(id('d1'), 'Diagonaal 2', m.diagonalen[1] ?? null, (w) => zetMeting(p.id, (x) => { x.diagonalen[1] = w; })),
    maatInvoer(id('sp'), 'Speling/zijde', m.speling, (w) => zetMeting(p.id, (x) => { x.speling = w ?? 10; })),
  );

  const uitkomst = el('div', { class: 'uitkomst' });
  if (res.compleet) {
    const dB = res.verschilB!, dH = res.verschilH!;
    uitkomst.append(el('p', {}, ''));
    uitkomst.firstElementChild!.innerHTML = `Bestelmaat <strong>${getal(res.bestelB!)} × ${getal(res.bestelH!)} mm</strong> <span class="klein">(${dB >= 0 ? '+' : ''}${dB} × ${dH >= 0 ? '+' : ''}${dH} mm t.o.v. offerte)</span>`;
  }
  const ml = el('ul', { class: 'meldingen' });
  for (const x of res.meldingen) ml.append(el('li', { class: x.ernst }, x.tekst));
  if (res.meldingen.length) uitkomst.append(ml);

  // Foto en opmerking.
  const extra = el('div', { class: 'meetextra' });
  const fotoLabel = el('label', { class: 'fotoknop' });
  const foto = el('input', { type: 'file', accept: 'image/*', capture: 'environment' }) as HTMLInputElement;
  foto.addEventListener('change', async () => {
    const f = foto.files?.[0];
    if (!f) return;
    const data = await verkleinFoto(f);
    zetMeting(p.id, (x) => { x.foto = data; });
  });
  fotoLabel.append(foto, document.createTextNode(m.foto ? 'Andere foto' : 'Foto nemen'));
  extra.append(fotoLabel);
  if (m.foto) {
    const img = el('img', { src: m.foto, alt: `Foto opening ${p.code}`, class: 'meetfoto' });
    extra.append(img);
  }
  const opm = el('textarea', { rows: '2', placeholder: 'Opmerking (bv. latei scheef, dorpel beschadigd)', id: id('opm') }) as HTMLTextAreaElement;
  opm.value = m.opmerking;
  opm.addEventListener('change', () => zetMeting(p.id, (x) => { x.opmerking = opm.value; }));
  extra.append(opm);

  const acties = el('div', { class: 'positieacties' });
  const neem = el('button', { type: 'button' }, 'Bestelmaat overnemen in de positie') as HTMLButtonElement;
  neem.disabled = !res.compleet;
  neem.addEventListener('click', () => {
    wijzig('positie', (t) => {
      const x = t.posities.find((y) => y.id === p.id);
      if (!x || !res.compleet) return;
      x.keuzes.breedte = res.bestelB!;
      x.keuzes.hoogte = res.bestelH!;
      x.inmeting = { ...(x.inmeting ?? leegMeting()), status: 'overgenomen', datum: vandaag(), door: 'werfleider' };
    });
  });
  const bewerk = el('button', { type: 'button', class: 'tweede' }, 'Configuratie');
  bewerk.addEventListener('click', () => naarPositie(p.id));
  acties.append(neem, bewerk);

  const links = el('div');
  links.append(tekening);
  const rechts = el('div', { class: 'meetinhoud' });
  rechts.append(kop, sub, velden, uitkomst, extra, acties);
  kaart.append(links, rechts);
  return kaart;
}

// ---------- meerwerk ----------
let tekent = false;
function handtekeningVak(): HTMLElement {
  const t = toestand();
  const bon = t.meta.meerwerkbon;
  const vak = el('div', { class: 'handtekening' });
  if (bon?.getekend && bon.handtekening) {
    vak.append(el('p', {}, `Getekend door ${bon.naam} op ${bon.datum}.`), el('img', { src: bon.handtekening, alt: 'Handtekening klant', class: 'handtekening-beeld' }));
    return vak;
  }
  const naam = el('input', { type: 'text', id: 'mw-naam', placeholder: 'Naam klant' }) as HTMLInputElement;
  naam.value = bon?.naam ?? t.meta.klant;
  const c = el('canvas', { width: '600', height: '170', class: 'tekenvlak', 'aria-label': 'Handtekening: teken met vinger of muis' }) as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  g.lineWidth = 2.5; g.lineCap = 'round'; g.strokeStyle = '#111';
  let vorige: { x: number; y: number } | null = null;
  const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height }; };
  c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); vorige = pos(e); tekent = true; });
  c.addEventListener('pointermove', (e) => {
    if (!vorige) return;
    const p = pos(e);
    g.beginPath(); g.moveTo(vorige.x, vorige.y); g.lineTo(p.x, p.y); g.stroke();
    vorige = p;
  });
  c.addEventListener('pointerup', () => { vorige = null; });
  const wis = el('button', { type: 'button', class: 'tweede' }, 'Wissen');
  wis.addEventListener('click', () => { g.clearRect(0, 0, c.width, c.height); tekent = false; });
  const teken = el('button', { type: 'button' }, 'Meerwerkbon ondertekenen');
  teken.addEventListener('click', () => {
    if (!tekent) { alert('Laat de klant eerst tekenen in het vak.'); return; }
    const data = c.toDataURL('image/png');
    wijzig('meta', (tt) => { tt.meta.meerwerkbon = { nummer: tt.meta.meerwerkbon?.nummer ?? 1, naam: naam.value || tt.meta.klant, datum: vandaag(), handtekening: data, getekend: true }; });
    tekent = false;
  });
  const rij = el('div', { class: 'positieacties' });
  rij.append(wis, teken);
  vak.append(el('label', { class: 'eig' }), c, rij);
  vak.firstElementChild!.append(el('span', {}, 'Klant'), naam);
  return vak;
}

function toonMeerwerk() {
  const vak = $('#w-meerwerk');
  vak.replaceChildren();
  const t = toestand();
  const a = t.meta.akkoord;
  if (!a) {
    const k = el('section', { class: 'kaart' });
    k.append(
      el('h2', {}, 'Nog geen akkoord'),
      el('p', {}, 'Meerwerk is het verschil met de offerte waarvoor de klant tekende. Leg eerst het akkoord vast; elke latere wijziging (andere maat na inmeting, ander glas, extra raam …) komt dan automatisch op de meerwerkbon.'),
    );
    const naam = el('input', { type: 'text', id: 'w-akkoord-naam' }) as HTMLInputElement;
    naam.value = t.meta.klant;
    const b = el('button', { type: 'button' }, 'Klant gaat akkoord: offerte vastleggen');
    b.addEventListener('click', () => legAkkoordVast(naam.value || t.meta.klant));
    const r = el('div', { class: 'positieacties' });
    r.append(naam, b);
    k.append(r);
    vak.append(k);
    return;
  }
  const mw = meerwerk()!;
  const bon = t.meta.meerwerkbon;
  const k = el('section', { class: 'kaart' });
  const kop = el('div', { class: 'kaartkop' });
  kop.append(el('h2', {}, `Meerwerkbon ${bon?.nummer ?? 1}`), el('span', { class: `status ${bon?.getekend ? 'ok' : mw.excl ? 'let-op' : 'ok'}` }, bon?.getekend ? 'ondertekend' : 'nog te tekenen'));
  k.append(kop, el('p', { class: 'klein' }, `Offerte ${t.meta.nummer} akkoord op ${a.datum} door ${a.naam} (${eur(a.excl)} excl. btw). Hieronder alles wat sindsdien veranderde.`));
  const tabel = el('table', { class: 'meerwerktabel' });
  const kopRij = el('tr');
  kopRij.append(el('th', {}, 'Positie'), el('th', {}, 'Wat veranderde'), el('th', { class: 'num' }, 'Bedrag'));
  const body = el('tbody');
  for (const l of mw.lijnen) {
    const tr = el('tr', { class: l.bedrag > 0 ? 'meer' : l.bedrag < 0 ? 'min' : '' });
    const wat = el('td');
    wat.append(el('strong', {}, l.omschrijving));
    const ul = el('ul');
    for (const w of l.wijzigingen) ul.append(el('li', {}, w));
    wat.append(ul);
    tr.append(el('td', {}, l.code), wat, el('td', { class: 'num' }, `${l.bedrag > 0 ? '+ ' : l.bedrag < 0 ? '− ' : ''}${eur(Math.abs(l.bedrag))}`));
    body.append(tr);
  }
  t.meta.meerwerk.forEach((r) => {
    const tr = el('tr', { class: 'meer' });
    const weg = el('button', { type: 'button', class: 'gevaar klein-knop' }, 'Verwijderen');
    weg.addEventListener('click', () => wijzig('meta', (tt) => { tt.meta.meerwerk = tt.meta.meerwerk.filter((x) => x.id !== r.id); }));
    const td = el('td');
    td.append(el('strong', {}, r.omschrijving), el('p', { class: 'klein' }, `${getal(r.hoeveelheid, 2)} ${r.eenheid} × ${eur(r.eenheidsprijs)}`), weg);
    tr.append(el('td', {}, 'extra'), td, el('td', { class: 'num' }, `+ ${eur(r.hoeveelheid * r.eenheidsprijs)}`));
    body.append(tr);
  });
  if (!mw.lijnen.length && !t.meta.meerwerk.length) {
    const tr = el('tr');
    tr.append(el('td', { colspan: '3', class: 'klein' }, 'Nog geen wijzigingen sinds het akkoord.'));
    body.append(tr);
  }
  tabel.append(el('thead'), body);
  tabel.firstElementChild!.append(kopRij);
  k.append(el('div', { class: 'tabelhouder' }), el('h3', {}, 'Extra werk toevoegen'));
  k.children[k.children.length - 2]!.append(tabel);

  // Vrije regel toevoegen.
  const form = el('div', { class: 'meerwerkform' });
  const oms = el('input', { type: 'text', placeholder: 'Omschrijving (bv. extra uitbraak latei)', id: 'mw-oms' }) as HTMLInputElement;
  const hv = el('input', { type: 'number', value: '1', step: '0.5', min: '0', 'aria-label': 'Hoeveelheid', id: 'mw-hv' }) as HTMLInputElement;
  const eenheid = el('select', { id: 'mw-eenheid', 'aria-label': 'Eenheid' }) as HTMLSelectElement;
  for (const e of ['uur', 'stuk', 'm²', 'lm', 'forfait']) eenheid.append(el('option', { value: e }, e));
  const prijs = el('input', { type: 'number', value: '55', step: '1', min: '0', 'aria-label': 'Prijs per eenheid', id: 'mw-prijs' }) as HTMLInputElement;
  const voeg = el('button', { type: 'button' }, 'Toevoegen');
  voeg.addEventListener('click', () => {
    if (!oms.value.trim()) { oms.focus(); return; }
    wijzig('meta', (tt) => { tt.meta.meerwerk.push({ id: nieuweId('mw'), omschrijving: oms.value.trim(), eenheid: eenheid.value, hoeveelheid: Number(hv.value) || 1, eenheidsprijs: Number(prijs.value) || 0 }); });
  });
  form.append(oms, hv, eenheid, prijs, el('span', { class: 'klein' }, '€/eenheid'), voeg);
  k.append(form);

  const tot = el('dl', { class: 'totaal' });
  const regels: [string, string, string?][] = [['Meer- en minwerk', eur(mw.subtotaal)]];
  if (mw.korting) regels.push([`Korting ${klantKorting()} %`, `− ${eur(mw.korting)}`]);
  regels.push(['Totaal excl. btw', eur(mw.excl), 'sterk'], [`Btw ${t.meta.btw} %`, eur(mw.btw)], ['Totaal meerwerk incl. btw', eur(mw.incl), 'groot']);
  tot.append(...regels.flatMap(([x, y, c]) => [el('dt', c ? { class: c } : {}, x), el('dd', c ? { class: c } : {}, y)]));
  k.append(tot, el('h3', {}, 'Handtekening klant'), handtekeningVak());
  const acties = el('div', { class: 'acties' });
  const druk = el('button', { type: 'button' }, 'Meerwerkbon afdrukken / PDF');
  druk.addEventListener('click', drukMeerwerkbon);
  const volgende = el('button', { type: 'button', class: 'tweede' }, 'Afsluiten en nieuwe meerwerkbon starten');
  volgende.addEventListener('click', () => {
    const n = (t.meta.meerwerkbon?.nummer ?? 1) + 1;
    const m = momentopname();
    wijzig('meta', (tt) => {
      tt.meta.akkoord = { ...tt.meta.akkoord!, ...m, datum: vandaag(), excl: tt.meta.akkoord!.excl + mw.excl };
      tt.meta.meerwerk = [];
      tt.meta.meerwerkbon = { nummer: n, naam: tt.meta.meerwerkbon?.naam ?? tt.meta.klant, datum: vandaag(), getekend: false };
    });
  });
  volgende.toggleAttribute('disabled', !bon?.getekend);
  const intrekken = el('button', { type: 'button', class: 'gevaar' }, 'Akkoord intrekken');
  intrekken.addEventListener('click', () => {
    if (intrekken.dataset.zeker !== '1') { intrekken.dataset.zeker = '1'; intrekken.textContent = 'Zeker? Meerwerk wordt gewist'; return; }
    wijzig('meta', (tt) => { tt.meta.akkoord = undefined; tt.meta.meerwerk = []; tt.meta.meerwerkbon = undefined; });
  });
  acties.append(druk, volgende, intrekken);
  k.append(acties);
  vak.append(k);
}

// ---------- afdruk ----------
function drukMeerwerkbon() {
  const t = toestand(), mw = meerwerk();
  if (!mw) return;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const bon = t.meta.meerwerkbon;
  const rijen = [
    ...mw.lijnen.map((l) => `<tr><td>${esc(l.code)}</td><td><strong>${esc(l.omschrijving)}</strong><br><span class="a-klein">${l.wijzigingen.map(esc).join('<br>')}</span></td><td class="num">${l.bedrag < 0 ? '− ' : ''}${eur(Math.abs(l.bedrag))}</td></tr>`),
    ...mw.vrij.map((l) => `<tr><td>extra</td><td>${esc(l.omschrijving)}</td><td class="num">${eur(l.bedrag)}</td></tr>`),
  ].join('');
  $('#afdruk').innerHTML = `<header class="a-kop"><div><div class="a-firma">Uw bedrijf · Ramen, deuren en renovatie</div><h1>Meerwerkbon ${bon?.nummer ?? 1}</h1><p>bij offerte ${esc(t.meta.nummer)} · ${esc(vandaag())}</p></div>
    <div class="a-klant"><strong>${esc(t.meta.klant)}</strong><br>${esc(t.meta.adres)}<br>Project: ${esc(t.meta.project)}</div></header>
    <p>Akkoord offerte op ${esc(t.meta.akkoord!.datum)} door ${esc(t.meta.akkoord!.naam)}. Deze bon somt alle wijzigingen sindsdien op.</p>
    <table><thead><tr><th>Positie</th><th>Wijziging</th><th class="num">Bedrag excl. btw</th></tr></thead><tbody>${rijen || '<tr><td colspan="3">Geen wijzigingen.</td></tr>'}</tbody></table>
    <table class="a-totaal"><tbody><tr><td>Meer- en minwerk</td><td class="num">${eur(mw.subtotaal)}</td></tr>
    ${mw.korting ? `<tr><td>Korting</td><td class="num">− ${eur(mw.korting)}</td></tr>` : ''}
    <tr><td>Btw ${t.meta.btw} %</td><td class="num">${eur(mw.btw)}</td></tr><tr class="sterk"><td>Totaal incl. btw</td><td class="num">${eur(mw.incl)}</td></tr></tbody></table>
    <p class="a-klein">Het meerwerk wordt gefactureerd samen met de volgende factuur. Prijzen zijn demoprijzen.</p>
    <div class="a-handtekening"><div>Voor akkoord, klant${bon?.getekend && bon.handtekening ? `<br><img src="${bon.handtekening}" alt="" style="height:24mm"><br>${esc(bon.naam)} · ${esc(bon.datum)}` : '<br><br><br>……………………………'}</div><div>Voor de firma<br><br><br>……………………………</div></div>`;
  window.print();
}

function drukWerfbon() {
  const t = toestand();
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const kaarten = t.posities.filter((p) => p.model === 'RAAM').map((p) => {
    const r = resultaat(p);
    return `<section class="a-positie"><div class="a-tekening">${r.tekening ? tekenSvg(r.tekening, { breedtePx: 200, lijnkleur: '#222', maatkleur: '#34505f' }) : ''}</div>
      <div><h3>${esc(p.code)} · ${esc(p.naam)}</h3><p class="a-klein">${esc(plaatsVan(p))} · offerte ${getal(num(p.keuzes.breedte))} × ${getal(num(p.keuzes.hoogte))} mm</p>
      <table class="a-meet"><tr><td>Breedte boven</td><td></td><td>Hoogte links</td><td></td></tr><tr><td>Breedte midden</td><td></td><td>Hoogte rechts</td><td></td></tr>
      <tr><td>Breedte onder</td><td></td><td>Diagonaal 1 / 2</td><td></td></tr></table><p class="a-klein">Opmerking: ……………………………………………………………</p></div><div></div></section>`;
  }).join('');
  $('#afdruk').innerHTML = `<header class="a-kop"><div><div class="a-firma">Werfbon inmeting</div><h1>${esc(t.meta.project)}</h1><p>${esc(t.meta.klant)} · ${esc(t.meta.adres)}</p></div><div class="a-klant">Offerte ${esc(t.meta.nummer)}<br>Datum: ……………<br>Gemeten door: ……………</div></header>
    <p class="a-klein">Meet elke opening op 3 hoogtes (breedte) en 2 plaatsen (hoogte), plus de diagonalen. Bestelmaat = kleinste maat min de montagespeling.</p>${kaarten}`;
  window.print();
}

// ---------- tonen ----------
export function toonWerf() {
  const actief = (document.activeElement as HTMLElement | null)?.id;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-werf]')) b.setAttribute('aria-pressed', String(b.dataset.werf === tab));
  $('#w-inmeting').hidden = tab !== 'inmeting';
  $('#w-meerwerk').hidden = tab !== 'meerwerk';
  const t = toestand();
  const ramen = t.posities.filter((p) => p.model === 'RAAM');
  const gemeten = ramen.filter((p) => p.inmeting && p.inmeting.status !== 'open').length;
  const over = ramen.filter((p) => p.inmeting?.status === 'overgenomen').length;
  $('#w-samenvatting').textContent = `${gemeten} van ${ramen.length} openingen gemeten · ${over} bestelmaten overgenomen`;
  if (tab === 'inmeting') $('#w-metingen').replaceChildren(...ramen.map(metingKaart));
  else toonMeerwerk();
  const mw = meerwerk();
  $('#w-meerwerk-tab').textContent = mw ? `Meerwerk (${mw.excl >= 0 ? '+' : '−'} ${eur(Math.abs(mw.excl))})` : 'Meerwerk';
  if (actief) document.getElementById(actief)?.focus();
}

export function startWerf(nav: { naarPositie: (id: string) => void }) {
  naarPositie = nav.naarPositie;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-werf]')) b.addEventListener('click', () => { tab = b.dataset.werf as typeof tab; toonWerf(); });
  $('#w-werfbon').addEventListener('click', drukWerfbon);
}
