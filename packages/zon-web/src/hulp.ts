/** Kleine hulpjes voor de schermen. */
export const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...kinderen: (Node | string | null | undefined | false)[]) {
  const e = document.createElement(tag);
  for (const [a, w] of Object.entries(attrs)) e.setAttribute(a, w);
  for (const k of kinderen) if (k !== null && k !== undefined && k !== false) e.append(k);
  return e;
}

export const eur = (x: number, d = 2) => new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d }).format(x);
export const getal = (x: number, d = 0) => new Intl.NumberFormat('nl-BE', { maximumFractionDigits: d, minimumFractionDigits: d }).format(x);
export const klantweergave = () => document.body.classList.contains('klantmodus');

let teller = 0;
const nieuwId = () => `v${++teller}`;

/** Getalveld met label en eenheid. */
export function getalVeld(label: string, waarde: number, bij: (w: number) => void, o: { min?: number; max?: number; stap?: number; eenheid?: string; hulp?: string } = {}): HTMLElement {
  const id = nieuwId();
  const i = el('input', { type: 'number', id, step: String(o.stap ?? 1), inputmode: 'decimal' }) as HTMLInputElement;
  if (o.min !== undefined) i.min = String(o.min);
  if (o.max !== undefined) i.max = String(o.max);
  i.value = String(Math.round(waarde * 1000) / 1000);
  i.addEventListener('change', () => {
    let w = Number(i.value.replace(',', '.'));
    if (!Number.isFinite(w) || i.value === '') { i.value = String(waarde); return; }
    if (o.min !== undefined) w = Math.max(o.min, w);
    if (o.max !== undefined) w = Math.min(o.max, w);
    bij(w);
  });
  return el('div', { class: 'veld' },
    el('label', { for: id }, label),
    el('div', { class: 'getalrij' }, i, o.eenheid ? el('span', { class: 'eenheid' }, o.eenheid) : null),
    o.hulp ? el('span', { class: 'hulp' }, o.hulp) : null);
}

export function tekstVeld(label: string, waarde: string, bij: (w: string) => void, o: { type?: string; plaats?: string } = {}): HTMLElement {
  const id = nieuwId();
  const i = el('input', { type: o.type ?? 'text', id, placeholder: o.plaats ?? '' }) as HTMLInputElement;
  i.value = waarde;
  i.addEventListener('change', () => bij(i.value));
  return el('div', { class: 'veld' }, el('label', { for: id }, label), i);
}

export function keuzeVeld(label: string, opties: [string, string][], waarde: string, bij: (w: string) => void): HTMLElement {
  const id = nieuwId();
  const s = el('select', { id }) as HTMLSelectElement;
  for (const [w, l] of opties) s.append(el('option', { value: w }, l));
  s.value = waarde;
  s.addEventListener('change', () => bij(s.value));
  return el('div', { class: 'veld' }, el('label', { for: id }, label), s);
}

/** Tegels (radioknoppen) voor een keuze. */
export function tegels(legende: string, opties: { waarde: string; label: string; extra?: string }[], waarde: string, bij: (w: string) => void): HTMLElement {
  const naam = nieuwId();
  const f = el('fieldset', { class: 'keuzes' }, el('legend', {}, legende));
  for (const o of opties) {
    const i = el('input', { type: 'radio', name: naam, value: o.waarde }) as HTMLInputElement;
    i.checked = o.waarde === waarde;
    i.addEventListener('change', () => i.checked && bij(o.waarde));
    f.append(el('label', { class: 'tegel' }, i, el('span', { class: 'tegel-tekst' }, el('strong', {}, o.label), o.extra ? el('span', { class: 'klein' }, o.extra) : null)));
  }
  return f;
}

export function schakelaar(label: string, aan: boolean, bij: (w: boolean) => void, hulp?: string): HTMLElement {
  const i = el('input', { type: 'checkbox' }) as HTMLInputElement;
  i.checked = aan;
  i.addEventListener('change', () => bij(i.checked));
  return el('div', { class: 'veld' }, el('label', { class: 'schakelaar' }, i, el('span', { class: 'schuifje' }), el('span', {}, label)), hulp ? el('span', { class: 'hulp' }, hulp) : null);
}

export function knop(tekst: string, bij: () => void, klasse = 'tweede', titel?: string): HTMLButtonElement {
  const b = el('button', { type: 'button', class: klasse }, tekst) as HTMLButtonElement;
  if (titel) b.title = titel;
  b.addEventListener('click', bij);
  return b;
}

export function toonFout(waar: string, fout: unknown) {
  const vak = document.getElementById('foutmelding');
  const tekst = `${waar}: ${fout instanceof Error ? fout.message : String(fout)}`;
  console.error(tekst, fout);
  if (!vak || [...vak.querySelectorAll('p')].some((p) => p.textContent === tekst)) return;
  if (!vak.querySelector('button')) vak.append(knop('Sluiten', () => { vak.hidden = true; for (const p of vak.querySelectorAll('p')) p.remove(); }));
  vak.hidden = false;
  vak.insertBefore(el('p', {}, tekst), vak.querySelector('button'));
}

export async function kopieer(tekst: string, melding: HTMLElement) {
  try {
    await navigator.clipboard.writeText(tekst);
  } catch {
    const t = el('textarea');
    t.value = tekst;
    document.body.append(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
  melding.textContent = 'Gekopieerd';
  setTimeout(() => (melding.textContent = ''), 2500);
}

/** Svg-tekst als element. */
export function svgUit(tekst: string): Element {
  const d = document.createElement('div');
  d.innerHTML = tekst;
  return d.firstElementChild!;
}
