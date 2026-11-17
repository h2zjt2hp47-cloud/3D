// Uitlegballonnen: elk element met data-tip toont bij aanwijzen (of tikken) een ballon met uitleg.
// De inhoud is HTML (bv. een opbouw van een getal).
const ballon = document.createElement('div');
ballon.id = 'tip';
ballon.hidden = true;
document.body.appendChild(ballon);

let huidig: HTMLElement | null = null;

function toon(el: HTMLElement, x: number, y: number) {
  const inhoud = el.dataset.tip;
  if (!inhoud) return;
  huidig = el;
  ballon.innerHTML = inhoud;
  ballon.hidden = false;
  plaats(x, y);
}

function plaats(x: number, y: number) {
  const r = ballon.getBoundingClientRect();
  let lx = x + 14, ly = y + 16;
  if (lx + r.width > window.innerWidth - 8) lx = Math.max(8, x - r.width - 10);
  if (ly + r.height > window.innerHeight - 8) ly = Math.max(8, y - r.height - 10);
  ballon.style.left = `${lx}px`;
  ballon.style.top = `${ly}px`;
}

export function verberg() {
  ballon.hidden = true;
  huidig = null;
}

/** toon een ballon op een plaats, zonder element (bv. boven de kaart) */
export function toonOp(html: string, x: number, y: number) {
  huidig = null;
  ballon.innerHTML = html;
  ballon.hidden = false;
  plaats(x, y);
}

document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'touch') return;
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
  if (el && el !== huidig) toon(el, e.clientX, e.clientY);
  if (!el && huidig) verberg();
});
document.addEventListener('pointermove', (e) => {
  if (huidig && e.pointerType !== 'touch') plaats(e.clientX, e.clientY);
});
// op een aanraakscherm: lang drukken toont de uitleg
let lang = 0;
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
  clearTimeout(lang);
  if (huidig) verberg();
  if (el) lang = window.setTimeout(() => toon(el, e.clientX, e.clientY - 60), 450);
});
document.addEventListener('pointerup', () => clearTimeout(lang));
