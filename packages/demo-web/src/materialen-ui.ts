/**
 * Materialen beheren: toevoegen, bewerken, verwijderen, kopiëren als lijst en inlezen.
 * Nieuwe materialen zijn meteen te kiezen in de sofa-configurator en de vrije ontwerper.
 */
import {
  controleerMateriaal,
  leesMaterialen,
  maakMateriaalCode,
  patroonfactor,
  stofkaart,
  type Materiaal,
} from '../../core/src/index.js';
import { $, bevestigKnop, el, eur, getal, getMaterialen, groepen, herstelMaterialen, kopieer, opWijziging, setMaterialen } from './staat.js';

let bewerkCode: string | null = null;

const leeg = (): Materiaal => ({
  code: '', naam: '', soort: 'stof', groep: 'B', kleur: '#b8a88a', rapport: 0, rolbreedte: 140, kostprijsPerM: 35, toeslagPct: 0, eigen: true,
});

function formulierNaarMateriaal(): Materiaal {
  const v = (id: string) => $<HTMLInputElement>(`#m-${id}`).value;
  const bestaand = bewerkCode ? getMaterialen().find((m) => m.code === bewerkCode) : undefined;
  return {
    code: bestaand?.code ?? '',
    naam: v('naam').trim(),
    soort: ($<HTMLInputElement>('#m-soort-leder').checked ? 'leder' : 'stof'),
    groep: $<HTMLSelectElement>('#m-groep').value,
    kleur: v('kleur'),
    rapport: Number(v('rapport')),
    rolbreedte: Number(v('rolbreedte')),
    kostprijsPerM: Number(v('kostprijs')),
    toeslagPct: Number(v('toeslag')),
    eigen: bestaand ? bestaand.eigen : true,
  };
}

function vulFormulier(m: Materiaal) {
  $<HTMLInputElement>('#m-naam').value = m.naam;
  $<HTMLInputElement>('#m-soort-stof').checked = m.soort === 'stof';
  $<HTMLInputElement>('#m-soort-leder').checked = m.soort === 'leder';
  $<HTMLSelectElement>('#m-groep').value = m.groep;
  $<HTMLInputElement>('#m-kleur').value = m.kleur;
  $<HTMLInputElement>('#m-kleurcode').value = m.kleur;
  $<HTMLInputElement>('#m-rapport').value = String(m.rapport);
  $<HTMLInputElement>('#m-rolbreedte').value = String(m.rolbreedte);
  $<HTMLInputElement>('#m-kostprijs').value = String(m.kostprijsPerM);
  $<HTMLInputElement>('#m-toeslag').value = String(m.toeslagPct);
  $('#m-titel').textContent = bewerkCode ? `Bewerk: ${m.naam}` : 'Materiaal toevoegen';
  $('#m-opslaan').textContent = bewerkCode ? 'Wijzigingen opslaan' : 'Materiaal toevoegen';
  $<HTMLButtonElement>('#m-annuleer').hidden = !bewerkCode;
  $('#m-fouten').replaceChildren();
  voorbeeld();
}

function voorbeeld() {
  const m = formulierNaarMateriaal();
  const f = patroonfactor(m.rapport) * (140 / (m.rolbreedte || 140));
  $('#m-staal').style.background = /^#[0-9a-f]{6}$/i.test(m.kleur) ? m.kleur : 'transparent';
  const bestaand = getMaterialen().find((x) => x.code === bewerkCode);
  $('#m-voorbeeld').textContent = (bestaand?.artikel ? `${stofkaart({ ...bestaand, ...m })}. ` : '') +
    `Stofverbruik × ${getal(f, 2)} ten opzichte van een effen stof van 140 cm` +
    (m.groep === 'EIGEN' ? '. Eigen materiaal van de klant: geen aankoop, prijs volgens kolom EIGEN.' : `. Prijs volgens prijsgroep ${m.groep}.`);
}

function toonLijst() {
  const lijst = $('#m-lijst tbody');
  lijst.replaceChildren(
    ...getMaterialen().map((m) => {
      const tr = el('tr');
      const staal = el('span', { class: 'staal', 'aria-hidden': 'true' });
      staal.style.background = m.kleur;
      const naam = el('td');
      naam.append(staal, document.createTextNode(` ${m.naam}`));
      if (m.eigen) naam.append(el('span', { class: 'label' }, 'eigen'));
      if (m.artikel) {
        // Stofkaart van de leverancier: artikel, samenstelling, Martindale, op de rol.
        naam.append(el('span', { class: 'label' }, m.artikel));
        naam.append(el('div', { class: 'klein' }, stofkaart(m)));
      }
      const acties = el('td', { class: 'acties-cel' });
      const bewerk = el('button', { type: 'button', class: 'tweede klein-knop' }, 'Bewerk') as HTMLButtonElement;
      bewerk.addEventListener('click', () => {
        bewerkCode = m.code;
        vulFormulier(m);
        $('#m-naam').focus();
      });
      acties.append(bewerk);
      if (m.eigen) {
        const weg = el('button', { type: 'button', class: 'gevaar klein-knop' }, 'Verwijder') as HTMLButtonElement;
        bevestigKnop(weg, 'Zeker?', () => {
          setMaterialen(getMaterialen().filter((x) => x.code !== m.code));
          if (bewerkCode === m.code) {
            bewerkCode = null;
            vulFormulier(leeg());
          }
        });
        acties.append(weg);
      }
      tr.append(
        naam,
        el('td', {}, m.soort),
        el('td', {}, m.groep),
        el('td', { class: 'num' }, m.rapport ? `${getal(m.rapport)} cm` : 'effen'),
        el('td', { class: 'num' }, `${getal(m.rolbreedte)} cm`),
        el('td', { class: 'num' }, m.kostprijsPerM ? eur(m.kostprijsPerM) : '—'),
        el('td', { class: 'num' }, m.toeslagPct ? `${getal(m.toeslagPct)}%` : '—'),
        acties,
      );
      return tr;
    }),
  );
  $('#m-aantal').textContent = `${getMaterialen().length} materialen, waarvan ${getMaterialen().filter((m) => m.eigen).length} zelf toegevoegd`;
}

export function startMaterialen() {
  const groep = $<HTMLSelectElement>('#m-groep');
  for (const g of groepen) groep.append(el('option', { value: g }, g === 'EIGEN' ? 'EIGEN (materiaal van de klant)' : `Groep ${g}`));

  const formulier = $<HTMLFormElement>('#m-formulier');
  formulier.addEventListener('input', (ev) => {
    const doel = ev.target as HTMLInputElement;
    if (doel.id === 'm-kleur') $<HTMLInputElement>('#m-kleurcode').value = doel.value;
    if (doel.id === 'm-kleurcode' && /^#[0-9a-f]{6}$/i.test(doel.value)) $<HTMLInputElement>('#m-kleur').value = doel.value;
    voorbeeld();
  });
  formulier.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const m = formulierNaarMateriaal();
    const alle = getMaterialen();
    const fouten = controleerMateriaal(m, groepen, alle);
    const vak = $('#m-fouten');
    if (fouten.length) {
      vak.replaceChildren(...fouten.map((f) => el('li', {}, f)));
      return;
    }
    if (bewerkCode) {
      setMaterialen(alle.map((x) => (x.code === bewerkCode ? { ...m, code: bewerkCode } : x)));
      $('#m-bevestiging').textContent = `"${m.naam}" is bijgewerkt.`;
    } else {
      const nieuw = { ...m, code: maakMateriaalCode(m.naam, alle), eigen: true };
      setMaterialen([...alle, nieuw]);
      $('#m-bevestiging').textContent = `"${m.naam}" is toegevoegd. Je kunt het nu kiezen in de sofa-configurator en de vrije ontwerper.`;
    }
    bewerkCode = null;
    vulFormulier(leeg());
  });
  $('#m-annuleer').addEventListener('click', () => {
    bewerkCode = null;
    vulFormulier(leeg());
  });

  $('#m-kopieer').addEventListener('click', () => void kopieer(JSON.stringify(getMaterialen(), null, 2), $('#m-lijstmelding')));
  $('#m-inlezen').addEventListener('click', () => {
    const tekst = $<HTMLTextAreaElement>('#m-plak').value;
    const melding = $('#m-lijstmelding');
    try {
      const { materialen, overgeslagen } = leesMaterialen(tekst, groepen);
      const alle = [...getMaterialen()];
      let toegevoegd = 0, bijgewerkt = 0;
      for (const m of materialen) {
        const i = alle.findIndex((x) => x.code === m.code);
        if (i >= 0) { alle[i] = { ...m, eigen: alle[i]!.eigen }; bijgewerkt++; }
        else if (!alle.some((x) => x.naam.toLowerCase() === m.naam.toLowerCase())) { alle.push({ ...m, eigen: true }); toegevoegd++; }
        else bijgewerkt += 0;
      }
      setMaterialen(alle);
      melding.textContent = `${toegevoegd} toegevoegd, ${bijgewerkt} bijgewerkt${overgeslagen ? `, ${overgeslagen} overgeslagen (ongeldig)` : ''}.`;
    } catch (e) {
      melding.textContent = (e as Error).message;
    }
  });
  bevestigKnop($<HTMLButtonElement>('#m-herstel'), 'Klik nogmaals: eigen materialen gaan verloren', () => {
    herstelMaterialen();
    $('#m-lijstmelding').textContent = 'Standaardmaterialen hersteld.';
  });

  opWijziging('materialen', toonLijst);
  vulFormulier(leeg());
  toonLijst();
}
