/** Kleine hulpjes voor de schermen. */
export const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, tekst?: string) {
  const e = document.createElement(tag);
  for (const [a, w] of Object.entries(attrs)) e.setAttribute(a, w);
  if (tekst !== undefined) e.textContent = tekst;
  return e;
}

export const eur = (x: number) => new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(x);
export const getal = (x: number, d = 0) => new Intl.NumberFormat('nl-BE', { maximumFractionDigits: d }).format(x);
export const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function toonFout(waar: string, fout: unknown) {
  const vak = document.getElementById('foutmelding');
  if (!vak) return;
  vak.hidden = false;
  vak.append(el('p', {}, `${waar}: ${fout instanceof Error ? fout.message : String(fout)}`));
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

/** Keuzelijst met opties [waarde, label]. */
export function keuzelijst(id: string, opties: [string, string][], waarde: string, bij: (w: string) => void): HTMLSelectElement {
  const s = el('select', { id }) as HTMLSelectElement;
  for (const [w, l] of opties) s.append(el('option', { value: w }, l));
  s.value = waarde;
  s.addEventListener('change', () => bij(s.value));
  return s;
}

/** Getalveld met label. */
export function getalVeld(label: string, waarde: number, bij: (w: number) => void, opties: { min?: number; max?: number; stap?: number; eenheid?: string } = {}): HTMLElement {
  const id = `v-${Math.random().toString(36).slice(2, 8)}`;
  const wrap = el('label', { class: 'maatveld', for: id });
  const i = el('input', { type: 'number', id, step: String(opties.stap ?? 1) }) as HTMLInputElement;
  if (opties.min !== undefined) i.min = String(opties.min);
  if (opties.max !== undefined) i.max = String(opties.max);
  i.value = String(Math.round(waarde * 10) / 10);
  i.addEventListener('change', () => {
    const w = Number(i.value);
    if (Number.isFinite(w)) bij(w);
  });
  wrap.append(el('span', {}, label), i);
  if (opties.eenheid) wrap.append(el('span', { class: 'eenheid' }, opties.eenheid));
  return wrap;
}
