/**
 * Getekend weefsel per soort stof (velours, bouclé, linnen …) in de kleur van de stof: naadloos herhaalbaar,
 * voor de stalen én als textuur in de 3D. Geen afhankelijkheden, zodat ook de bouwdemo dit kan gebruiken.
 */
import type { Weefsel } from '../../core/src/index.js';

/** Hoeveel cm stof één tegel van het weefsel toont (voor de 3D op ware grootte). */
export const WEEFSEL_CM: Record<Weefsel, number> = {
  effen: 4, linnen: 8, velours: 24, boucle: 6, chenille: 6, wol: 6, rib: 6, jacquard: 32, leder: 14,
};

const PX = 128;

/** Vaste toevalsreeks, zodat een staal er altijd hetzelfde uitziet. */
function toeval(zaad: number) {
  let s = zaad >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : [200, 200, 200];
}

/** Kleur lichter (f > 1) of donkerder (f < 1), begrensd op 0–255. */
function tint(hex: string, f: number, a = 1) {
  const [r, g, b] = rgb(hex).map((x) => Math.max(0, Math.min(255, Math.round(x * f))));
  return `rgba(${r},${g},${b},${a})`;
}

/** Tekent `teken` ook verschoven over de randen, zodat de tegel naadloos herhaalt. */
function rondom(teken: (dx: number, dy: number) => void) {
  for (const dx of [-PX, 0, PX]) for (const dy of [-PX, 0, PX]) teken(dx, dy);
}

/** Tekent het weefsel in de kleur van de stof op een canvas van 128 × 128 px (naadloos herhaalbaar). */
export function weefselCanvas(weefsel: Weefsel, kleur: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = PX;
  const g = c.getContext('2d')!;
  const r = toeval([...weefsel, ...kleur].reduce((s, t) => s * 31 + t.charCodeAt(0), 7));
  g.fillStyle = kleur;
  g.fillRect(0, 0, PX, PX);
  switch (weefsel) {
    case 'effen':
      // Fijne binding: dunne draden in twee richtingen.
      for (let i = 0; i < PX; i += 2) {
        g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.04})`;
        g.fillRect(0, i, PX, 1);
        g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.04})`;
        g.fillRect(i, 0, 1, PX);
      }
      break;
    case 'linnen':
      // Onregelmatige draden (slubs): dikke en dunne, lichtere en donkerdere.
      for (let i = 0; i < PX; i += 2) {
        g.fillStyle = tint(kleur, 0.86 + r() * 0.22, 0.55);
        g.fillRect(0, i, PX, 1 + (r() < 0.15 ? 1 : 0));
        g.fillStyle = tint(kleur, 0.88 + r() * 0.2, 0.45);
        g.fillRect(i, 0, 1, PX);
      }
      for (let n = 0; n < 40; n++) {
        const x = r() * PX, y = Math.floor(r() * PX / 2) * 2, l = 10 + r() * 40;
        g.fillStyle = tint(kleur, r() < 0.5 ? 0.8 : 1.15, 0.6);
        rondom((dx, dy) => g.fillRect(x + dx, y + dy, l, 1.5));
      }
      break;
    case 'velours': {
      // Zacht pool: grote, zachte vlekken licht en donker (de "glans" van velours), geen draden.
      for (let n = 0; n < 14; n++) {
        const x = r() * PX, y = r() * PX, s = 40 + r() * 50, licht = r() < 0.5;
        rondom((dx, dy) => {
          const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, s);
          gr.addColorStop(0, tint(kleur, licht ? 1.07 : 0.94, 0.3));
          gr.addColorStop(1, tint(kleur, 1, 0));
          g.fillStyle = gr;
          g.fillRect(x + dx - s, y + dy - s, 2 * s, 2 * s);
        });
      }
      for (let n = 0; n < 1400; n++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + r() * 0.04})`;
        g.fillRect(r() * PX, r() * PX, 1, 1);
      }
      break;
    }
    case 'boucle':
      // Lusjes: kleine bolletjes met een lichte bovenkant en een schaduw eronder.
      for (let n = 0; n < 520; n++) {
        const x = r() * PX, y = r() * PX, s = 2 + r() * 2.6;
        rondom((dx, dy) => {
          g.fillStyle = tint(kleur, 0.7, 0.6);
          g.beginPath(); g.arc(x + dx + 0.8, y + dy + 1, s, 0, Math.PI * 2); g.fill();
          g.fillStyle = tint(kleur, 0.98 + r() * 0.1, 1);
          g.beginPath(); g.arc(x + dx, y + dy, s * 0.85, 0, Math.PI * 2); g.fill();
        });
      }
      break;
    case 'chenille':
      // Zachte ribbels (liggend) met pluis.
      for (let y = 0; y < PX; y += 4) {
        const gr = g.createLinearGradient(0, y, 0, y + 4);
        gr.addColorStop(0, tint(kleur, 0.82, 0.6));
        gr.addColorStop(0.5, tint(kleur, 1.12, 0.6));
        gr.addColorStop(1, tint(kleur, 0.82, 0.6));
        g.fillStyle = gr;
        g.fillRect(0, y, PX, 4);
      }
      for (let n = 0; n < 1600; n++) {
        g.fillStyle = tint(kleur, r() < 0.5 ? 0.8 : 1.2, 0.25);
        g.fillRect(r() * PX, r() * PX, 1 + r() * 2, 1);
      }
      break;
    case 'wol':
      // Gemêleerd: korte vezels in lichtere en donkerdere tinten, kriskras.
      for (let n = 0; n < 900; n++) {
        const x = r() * PX, y = r() * PX, a = r() * Math.PI, l = 2 + r() * 5;
        g.strokeStyle = tint(kleur, 0.7 + r() * 0.6, 0.5);
        g.lineWidth = 1;
        rondom((dx, dy) => {
          g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); g.stroke();
        });
      }
      break;
    case 'rib':
      // Ribfluweel: staande ribben met een lichte top en een donkere groef.
      for (let x = 0; x < PX; x += 8) {
        const gr = g.createLinearGradient(x, 0, x + 8, 0);
        gr.addColorStop(0, tint(kleur, 0.62));
        gr.addColorStop(0.3, tint(kleur, 1.05));
        gr.addColorStop(0.55, tint(kleur, 1.16));
        gr.addColorStop(0.85, tint(kleur, 0.9));
        gr.addColorStop(1, tint(kleur, 0.62));
        g.fillStyle = gr;
        g.fillRect(x, 0, 8, PX);
      }
      for (let n = 0; n < 900; n++) {
        g.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
        g.fillRect(r() * PX, r() * PX, 1, 2);
      }
      break;
    case 'jacquard': {
      // Ruitpatroon (de demo-jacquard heeft een rapport van 32 cm = één tegel).
      g.strokeStyle = tint(kleur, 0.72, 0.8);
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(PX / 2, 0); g.lineTo(PX, PX / 2); g.lineTo(PX / 2, PX); g.lineTo(0, PX / 2); g.closePath();
      g.stroke();
      g.fillStyle = tint(kleur, 1.12, 0.6);
      g.beginPath(); g.arc(PX / 2, PX / 2, 10, 0, Math.PI * 2); g.fill();
      for (const [x, y] of [[0, 0], [PX, 0], [0, PX], [PX, PX]] as const) { g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.fill(); }
      for (let i = 0; i < PX; i += 2) {
        g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.03})`;
        g.fillRect(0, i, PX, 1);
      }
      break;
    }
    case 'leder':
      // Nerf: kleine, onregelmatige plekjes en een zachte vlekking.
      for (let n = 0; n < 12; n++) {
        const x = r() * PX, y = r() * PX, s = 25 + r() * 35;
        rondom((dx, dy) => {
          const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, s);
          gr.addColorStop(0, tint(kleur, r() < 0.5 ? 1.1 : 0.9, 0.35));
          gr.addColorStop(1, tint(kleur, 1, 0));
          g.fillStyle = gr;
          g.fillRect(x + dx - s, y + dy - s, 2 * s, 2 * s);
        });
      }
      for (let n = 0; n < 700; n++) {
        g.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.08})`;
        g.beginPath(); g.arc(r() * PX, r() * PX, 0.4 + r() * 0.9, 0, Math.PI * 2); g.fill();
      }
      break;
  }
  return c;
}
