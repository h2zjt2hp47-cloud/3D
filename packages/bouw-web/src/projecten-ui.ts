/**
 * Projecten: nieuw project (leeg, voorbeeld, sjabloon, kopie), openen, dupliceren, verwijderen,
 * bewaren als bestand en openen uit een bestand, sjablonen en de bibliotheek met standaardramen.
 * Alles wordt automatisch in deze browser bewaard; een bestand is om veilig te bewaren of door te sturen.
 */
import { berekenOfferte } from '../../core/src/index.js';
import { planCatalogus, planNaarRegels } from '../../core/voorbeelden/inrichting.js';
import { $, el, eur, labelCellen, PRIJZEN } from './hulp.js';
import {
  actiefProject,
  bewaarAlsSjabloon,
  bibliotheek,
  dupliceerProject,
  hernoemProject,
  laadProject,
  MODELLEN,
  nieuwProject,
  openProject,
  projectAlsBestand,
  projecten,
  projectUitBestand,
  resultaat,
  sjablonen,
  toestand,
  verwijderProject,
  verwijderSjabloon,
  verwijderUitBibliotheek,
  wijzig,
  type Toestand,
} from './staat.js';
import { bewaarBestand } from '../../demo-web/src/bewaren.js';

let naarPlan: () => void = () => {};
/** Het scherm waarop het geopende project begint (doorloop B14: een carport in de configurator met de 3D). */
let naarProject: () => void = () => {};
/** De woning in 3D (het voorbeeldproject van ronde 11 opent meteen in 3D). */
let naarWoning3D: () => void = () => {};

const datum = (iso: string) => (iso ? new Date(iso).toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

function totaal(x: Toestand): number {
  return berekenOfferte({
    posities: x.posities.map((p) => ({ id: p.id, code: p.code, naam: p.naam, aantal: p.aantal, resultaat: resultaat(p) })),
    regels: planNaarRegels(x.plan, x.meta.regels, planCatalogus),
    kortingProcent: x.meta.klanttype === 'aannemer' ? x.meta.korting : 0,
    btwProcent: x.meta.btw,
  }).excl;
}

export function download(naam: string, inhoud: string, type: string) {
  // Via de gedeelde helper: werkt ook in de weergave op claude.ai (toelating "downloads").
  void bewaarBestand(naam, new Blob([inhoud], { type }));
}

const bestandsnaam = (x: Toestand) => `${(x.meta.project || 'project').replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-')}-${x.meta.nummer}.woning.json`;

function knop(tekst: string, f: () => void, cls = 'tweede'): HTMLButtonElement {
  const b = el('button', { type: 'button', class: cls }, tekst) as HTMLButtonElement;
  b.addEventListener('click', f);
  return b;
}
/** Knop die eerst om bevestiging vraagt (tweede klik). */
function gevaarKnop(tekst: string, vraag: string, f: () => void): HTMLButtonElement {
  const b = el('button', { type: 'button', class: 'gevaar' }, tekst) as HTMLButtonElement;
  b.addEventListener('click', () => {
    if (b.dataset.zeker !== '1') { b.dataset.zeker = '1'; b.textContent = vraag; return; }
    f();
  });
  return b;
}

export function toonProjecten() {
  const t = toestand();
  // Huidig project.
  $('#pr-huidig-naam').textContent = t.meta.project || 'Naamloos project';
  $('#pr-huidig-info').textContent = `${t.meta.klant || 'geen klant'} · ${t.meta.nummer} · ${t.posities.length} posities${PRIJZEN ? ` · ${eur(totaal(t))} excl. btw${t.meta.akkoord ? ' · akkoord' : ''}` : ''}`;

  // Sjablonen in de keuzelijst voor een nieuw project.
  const lijst = $<HTMLSelectElement>('#pr-bron');
  const vorige = lijst.value;
  lijst.replaceChildren(...sjablonen().map((s) => el('option', { value: s.id }, s.ingebouwd ? s.naam : `Sjabloon: ${s.naam}`)));
  if ([...lijst.options].some((o) => o.value === vorige)) lijst.value = vorige;

  // Mijn projecten.
  const tb = $('#pr-lijst tbody');
  tb.replaceChildren(...projecten().map((p) => {
    const tr = el('tr', { class: p.id === actiefProject() ? 'gekozen' : '' });
    const x = laadProject(p.id);
    const acties = el('td', { class: 'acties-cel' });
    if (p.id !== actiefProject()) acties.append(knop('Openen', () => { openProject(p.id); naarProject(); }, ''));
    else acties.append(el('span', { class: 'status ok' }, 'open'));
    // Doorloop B19: hernoemen hier, niet alleen via het overzicht. De naam wordt een veld; Enter of ernaast tikken bewaart.
    const naamCel = el('td', {}, p.naam);
    const hernoem = knop('Hernoemen', () => {
      const veld = el('input', { type: 'text', 'aria-label': `Nieuwe naam voor ${p.naam}`, class: 'hernoemveld' }) as HTMLInputElement;
      veld.value = p.naam;
      let klaar = false;
      const bewaar = () => {
        if (klaar) return;
        klaar = true;
        const nieuw = veld.value.trim() && veld.value.trim() !== p.naam ? hernoemProject(p.id, veld.value) : undefined;
        if (!nieuw) toonProjecten();
        else $('#pr-melding').textContent = nieuw === veld.value.trim() ? `Hernoemd tot "${nieuw}".` : `Hernoemd tot "${nieuw}" (die naam bestond al).`;
      };
      veld.addEventListener('keydown', (e) => { if (e.key === 'Enter') bewaar(); if (e.key === 'Escape') { klaar = true; toonProjecten(); } });
      veld.addEventListener('blur', bewaar);
      naamCel.replaceChildren(veld);
      veld.focus();
      veld.select();
    });
    acties.append(
      hernoem,
      knop('Dupliceren', () => dupliceerProject(p.id)),
      knop('Bewaar als bestand', () => { if (x) download(bestandsnaam(x), projectAlsBestand(x), 'application/json'); }),
      gevaarKnop('Verwijderen', 'Zeker verwijderen?', () => verwijderProject(p.id)),
    );
    tr.append(naamCel, el('td', {}, p.klant || '—'), el('td', { class: 'code' }, p.nummer), el('td', { class: 'num' }, String(p.posities)),
      el('td', { class: 'num prijsdeel' }, PRIJZEN && x ? eur(totaal(x)) : '—'), el('td', { class: 'klein' }, datum(p.gewijzigd)), acties);
    return tr;
  }));

  labelCellen($('#pr-lijst'));
  // Sjablonen.
  $('#pr-sjablonen').replaceChildren(...sjablonen().map((s) => {
    const li = el('li');
    li.append(el('strong', {}, s.naam), el('span', { class: 'klein' }, [s.omschrijving, s.gewijzigd ? `bewaard ${datum(s.gewijzigd)}` : ''].filter(Boolean).join(' · ')));
    const r = el('div', { class: 'positieacties' });
    // Het voorbeeldproject (ronde 11) opent meteen in 3D, met zijn eigen naam.
    r.append(knop(s.in3D ? 'Openen in 3D' : 'Nieuw project hiermee', () => { nieuwProject(s.toestand, s.in3D ? s.naam : `${s.naam} – nieuw`); if (s.in3D) naarWoning3D(); else naarProject(); }, ''));
    if (s.in3D) r.lastElementChild!.setAttribute('data-sjabloon', s.id);
    if (!s.ingebouwd) r.append(gevaarKnop('Verwijderen', 'Zeker?', () => verwijderSjabloon(s.id)));
    li.append(r);
    return li;
  }));

  // Bibliotheek.
  const bib = bibliotheek();
  $('#pr-bib-leeg').hidden = bib.length > 0;
  $('#pr-bibliotheek').replaceChildren(...bib.map((b) => {
    const li = el('li');
    const k = b.keuzes;
    const info = b.model === 'RAAM' ? `${k.type ?? ''} · ${k.breedte ?? ''} × ${k.hoogte ?? ''} mm · ${k.profiel ?? ''} · ${k.glas ?? ''}` : MODELLEN[b.model].label;
    li.append(el('strong', {}, b.naam), el('span', { class: 'klein' }, ` ${info}`));
    const r = el('div', { class: 'positieacties' });
    r.append(gevaarKnop('Verwijderen', 'Zeker?', () => verwijderUitBibliotheek(b.id)));
    li.append(r);
    return li;
  }));
}

export function startProjecten(nav: { naarPlan: () => void; naarWoning3D?: () => void; naarProject?: () => void }) {
  naarPlan = nav.naarPlan;
  naarProject = nav.naarProject ?? nav.naarPlan;
  naarWoning3D = nav.naarWoning3D ?? nav.naarPlan;
  $('#pr-nieuw').addEventListener('click', () => {
    const bron = sjablonen().find((s) => s.id === $<HTMLSelectElement>('#pr-bron').value) ?? sjablonen()[0]!;
    const naam = $<HTMLInputElement>('#pr-naam').value.trim() || 'Nieuw project';
    nieuwProject(bron.toestand, naam);
    const klant = $<HTMLInputElement>('#pr-klant').value.trim();
    if (klant) wijzig('meta', (t) => { t.meta.klant = klant; }, { zonderOngedaan: true });
    $<HTMLInputElement>('#pr-naam').value = '';
    $<HTMLInputElement>('#pr-klant').value = '';
    naarPlan();
  });
  $('#pr-bewaar').addEventListener('click', () => download(bestandsnaam(toestand()), projectAlsBestand(), 'application/json'));
  $('#pr-dupliceer').addEventListener('click', () => dupliceerProject(actiefProject()));
  $('#pr-open-bestand').addEventListener('change', async (e) => {
    const invoer = e.target as HTMLInputElement;
    const f = invoer.files?.[0];
    if (!f) return;
    try {
      projectUitBestand(await f.text());
      $('#pr-melding').textContent = `"${f.name}" geopend als nieuw project.`;
      naarProject();
    } catch (fout) {
      $('#pr-melding').textContent = fout instanceof Error ? fout.message : String(fout);
    }
    invoer.value = '';
  });
  $('#pr-sjabloon').addEventListener('click', () => {
    const naam = $<HTMLInputElement>('#pr-sjabloon-naam').value.trim() || toestand().meta.project;
    const ok = bewaarAlsSjabloon(naam, $<HTMLInputElement>('#pr-sjabloon-oms').value.trim());
    $('#pr-melding').textContent = ok ? `Sjabloon "${naam}" bewaard (zonder klantgegevens, akkoord, meerwerk en inmetingen).` : 'Bewaren lukt niet: de opslag van de browser is vol.';
    $<HTMLInputElement>('#pr-sjabloon-naam').value = '';
    $<HTMLInputElement>('#pr-sjabloon-oms').value = '';
  });
}
