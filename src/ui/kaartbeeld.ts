// De kaart tekenen op een canvas: vakken, grenzen, rivieren, versterkingen, legers.
import { TERREIN, type Kaart, type Punt, type Terrein } from '../kaart/kaart';
import { kracht } from '../spel/regels';
import { inOorlog, type Leger, type Toestand } from '../spel/toestand';

export type Kaartsoort = 'politiek' | 'terrein';

const TERREINKLEUR: Record<Terrein, string> = {
  vlakte: '#cdd29a', heide: '#d6c493', heuvels: '#b9b07e', bos: '#7f9e68', ardennen: '#6f845a', moeras: '#93b5a6',
};

export interface Camera { x: number; y: number; schaal: number }

export interface Selectie { legers: number[]; vak: number | null }

export class Kaartbeeld {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  camera: Camera = { x: 0, y: 0, schaal: 1 };
  soort: Kaartsoort = 'politiek';
  private vakPaden: Path2D[][];
  private buitenland: Path2D;
  private omtrek: Path2D;
  private rivieren: Path2D;
  private dpr = 1;
  breedte = 0;
  hoogte = 0;

  constructor(canvas: HTMLCanvasElement, readonly k: Kaart) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    const pad = (ring: Punt[]) => {
      const p = new Path2D();
      ring.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      p.closePath();
      return p;
    };
    this.vakPaden = k.vakken.map((v) => v.vorm.map(pad));
    this.buitenland = new Path2D();
    for (const r of k.buitenland) this.buitenland.addPath(pad(r));
    this.omtrek = new Path2D();
    for (const r of k.omtrek) this.omtrek.addPath(pad(r));
    this.rivieren = new Path2D();
    for (const r of k.rivieren) r.punten.forEach(([x, y], i) => (i ? this.rivieren.lineTo(x, y) : this.rivieren.moveTo(x, y)));
  }

  pasGrootteAan() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.breedte = r.width;
    this.hoogte = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
  }

  /** zet de hele kaart in beeld */
  toonAlles() {
    const xs = this.k.vakken.map((v) => v.midden[0]), ys = this.k.vakken.map((v) => v.midden[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    this.camera.schaal = Math.min(this.breedte / (x1 - x0 + 40), this.hoogte / (y1 - y0 + 40));
    this.camera.x = (x0 + x1) / 2;
    this.camera.y = (y0 + y1) / 2;
  }

  naarScherm([x, y]: Punt): Punt {
    const c = this.camera;
    return [(x - c.x) * c.schaal + this.breedte / 2, (y - c.y) * c.schaal + this.hoogte / 2];
  }

  naarKaart(sx: number, sy: number): Punt {
    const c = this.camera;
    return [(sx - this.breedte / 2) / c.schaal + c.x, (sy - this.hoogte / 2) / c.schaal + c.y];
  }

  zoom(factor: number, sx: number, sy: number) {
    const voor = this.naarKaart(sx, sy);
    this.camera.schaal = Math.max(1.2, Math.min(40, this.camera.schaal * factor));
    const na = this.naarKaart(sx, sy);
    this.camera.x += voor[0] - na[0];
    this.camera.y += voor[1] - na[1];
  }

  vakOp(sx: number, sy: number): number | null {
    const p = this.naarKaart(sx, sy);
    for (const v of this.k.vakken) if (v.vorm.some((ring) => inRing(p, ring))) return v.id;
    return null;
  }

  /** waar een leger getekend wordt (op weg tussen twee vakken) */
  legerPlek(l: Leger): Punt {
    const a = this.k.vakken[l.vak].midden;
    if (!l.pad.length) return a;
    const b = this.k.vakken[l.pad[0]].midden;
    const f = Math.min(1, l.voortgang) * 0.9;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  /** schermposities van de legerfiches, om erop te klikken */
  fiches: { leger: number; x: number; y: number; b: number; h: number }[] = [];

  teken(t: Toestand, sel: Selectie, tijd: number) {
    const { ctx, camera: c, k } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#5d7d93';
    ctx.fillRect(0, 0, this.breedte, this.hoogte);
    ctx.save();
    ctx.translate(this.breedte / 2, this.hoogte / 2);
    ctx.scale(c.schaal, c.schaal);
    ctx.translate(-c.x, -c.y);
    const px = 1 / c.schaal;

    ctx.fillStyle = '#9d988a';
    ctx.fill(this.buitenland);
    ctx.strokeStyle = 'rgba(60,55,45,0.5)';
    ctx.lineWidth = px;
    ctx.stroke(this.buitenland);

    // vakken
    k.vakken.forEach((v, i) => {
      const e = t.vakken[i].eigenaar;
      const f = t.facties[e];
      let kleur = this.soort === 'terrein' ? TERREINKLEUR[v.terrein] : f.kleur;
      if (this.soort === 'politiek' && f.heer) kleur = meng(f.kleur, t.facties[f.heer].kleur, 0.35);
      ctx.fillStyle = kleur;
      for (const p of this.vakPaden[i]) ctx.fill(p);
      if (this.soort === 'politiek') {
        // zacht terrein eronder
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = TERREINKLEUR[v.terrein];
        for (const p of this.vakPaden[i]) ctx.fill(p);
        ctx.globalAlpha = 1;
      }
      if (t.vakken[i].bezetter) {
        ctx.save();
        for (const p of this.vakPaden[i]) ctx.clip(p);
        ctx.strokeStyle = t.facties[t.vakken[i].bezetter!].kleur;
        ctx.lineWidth = 3 * px;
        ctx.globalAlpha = 0.8;
        const [mx, my] = v.midden;
        ctx.beginPath();
        for (let d = -40; d <= 40; d += 6 * px * 3) { ctx.moveTo(mx + d - 30, my - 30); ctx.lineTo(mx + d + 30, my + 30); }
        ctx.stroke();
        ctx.restore();
      }
    });

    // rivieren
    ctx.strokeStyle = '#3f6f99';
    ctx.lineWidth = Math.max(1.2 * px, 0.35);
    ctx.lineJoin = 'round';
    ctx.stroke(this.rivieren);

    // randen: dun binnen een volk, dik tussen volken
    for (const r of k.randen) {
      const ea = t.vakken[r.a].eigenaar, eb = t.vakken[r.b].eigenaar;
      const grens = ea !== eb;
      ctx.beginPath();
      r.p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = grens ? 'rgba(25,20,15,0.85)' : 'rgba(40,35,25,0.22)';
      ctx.lineWidth = (grens ? 2.2 : 0.8) * px;
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(25,20,15,0.9)';
    ctx.lineWidth = 2 * px;
    ctx.stroke(this.omtrek);

    // geselecteerd vak
    if (sel.vak !== null) {
      ctx.strokeStyle = '#f4d58d';
      ctx.lineWidth = 3 * px;
      for (const p of this.vakPaden[sel.vak]) ctx.stroke(p);
    }

    // paden van de geselecteerde legers
    for (const l of t.legers) {
      if (!l.pad.length || (l.factie !== t.speler && !sel.legers.includes(l.id))) continue;
      const geselecteerd = sel.legers.includes(l.id);
      ctx.strokeStyle = geselecteerd ? '#f4d58d' : 'rgba(255,255,255,0.55)';
      ctx.lineWidth = (geselecteerd ? 2.5 : 1.5) * px;
      ctx.setLineDash([6 * px, 4 * px]);
      ctx.beginPath();
      const start = this.legerPlek(l);
      ctx.moveTo(start[0], start[1]);
      for (const v of l.pad) ctx.lineTo(...k.vakken[v].midden);
      ctx.stroke();
      ctx.setLineDash([]);
      const eind = k.vakken[l.pad[l.pad.length - 1]].midden;
      ctx.beginPath();
      ctx.arc(eind[0], eind[1], 4 * px, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
    ctx.restore();

    // tekst en tekens op schermschaal
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.tekenNamen(t);
    this.tekenVersterkingen(t);
    this.tekenLegers(t, sel, tijd);
  }

  private tekenNamen(t: Toestand) {
    const { ctx, k } = this;
    const s = this.camera.schaal;
    // namen van de volken
    if (this.soort === 'politiek' && s < 7) {
      const groep = new Map<string, { x: number; y: number; n: number }>();
      k.vakken.forEach((v, i) => {
        const e = t.vakken[i].eigenaar;
        const g = groep.get(e) ?? { x: 0, y: 0, n: 0 };
        g.x += v.midden[0]; g.y += v.midden[1]; g.n++;
        groep.set(e, g);
      });
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const [e, g] of groep) {
        if (g.n < 3) continue;
        const [sx, sy] = this.naarScherm([g.x / g.n, g.y / g.n]);
        const grootte = Math.min(30, Math.max(11, Math.sqrt(g.n) * s * 2.2));
        ctx.font = `600 ${grootte}px Georgia, 'Times New Roman', serif`;
        ctx.fillStyle = 'rgba(20,16,10,0.55)';
        ctx.fillText(spatieer(t.facties[e].naam.toUpperCase()), sx, sy);
      }
    }
    // namen van de vakken
    if (s >= 4.5) {
      ctx.font = `${Math.min(13, 8 + s * 0.3)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const v of k.vakken) {
        const [sx, sy] = this.naarScherm(v.midden);
        if (sx < -50 || sy < -20 || sx > this.breedte + 50 || sy > this.hoogte + 20) continue;
        ctx.fillStyle = 'rgba(25,20,12,0.75)';
        ctx.fillText(v.naam, sx, sy + 12);
      }
    }
  }

  private tekenVersterkingen(t: Toestand) {
    const { ctx, k } = this;
    t.vakken.forEach((v, i) => {
      if (!v.fort) return;
      const [sx, sy] = this.naarScherm(k.vakken[i].midden);
      const r = 6;
      ctx.save();
      ctx.translate(sx - 29, sy);
      ctx.fillStyle = '#e8dcc0';
      ctx.strokeStyle = '#2a2318';
      ctx.lineWidth = 1.2;
      // een torentje
      ctx.beginPath();
      ctx.moveTo(-r, r); ctx.lineTo(-r, -r * 0.6); ctx.lineTo(-r * 0.5, -r * 0.6); ctx.lineTo(-r * 0.5, -r);
      ctx.lineTo(r * 0.5, -r); ctx.lineTo(r * 0.5, -r * 0.6); ctx.lineTo(r, -r * 0.6); ctx.lineTo(r, r); ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (v.garnizoen < v.fort) {
        ctx.fillStyle = '#2a2318';
        ctx.fillRect(-r, r + 2, 2 * r, 3);
        ctx.fillStyle = '#d9a441';
        ctx.fillRect(-r, r + 2, (2 * r * v.garnizoen) / v.fort, 3);
      }
      ctx.restore();
    });
  }

  private tekenLegers(t: Toestand, sel: Selectie, tijd: number) {
    const { ctx, k } = this;
    this.fiches = [];
    const perPlek = new Map<string, Leger[]>();
    for (const l of t.legers) {
      const p = this.legerPlek(l);
      const sleutel = `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;
      if (!perPlek.has(sleutel)) perPlek.set(sleutel, []);
      perPlek.get(sleutel)!.push(l);
    }
    const strijdVakken = new Set(t.legers.filter((l) => l.inStrijd).map((l) => l.vak));
    for (const vak of strijdVakken) {
      const [sx, sy] = this.naarScherm(k.vakken[vak].midden);
      const puls = 14 + Math.sin(tijd / 150) * 3;
      ctx.beginPath();
      ctx.arc(sx, sy, puls + 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,40,30,0.8)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚔️', sx, sy - puls - 14);
    }
    for (const groep of perPlek.values()) {
      groep.sort((a, b) => (a.factie === t.speler ? -1 : 0) - (b.factie === t.speler ? -1 : 0));
      groep.forEach((l, i) => {
        const [sx0, sy0] = this.naarScherm(this.legerPlek(l));
        const b = 38, h = 18;
        const sx = sx0 - b / 2 + i * 6, sy = sy0 - h / 2 - i * 21;
        const f = t.facties[l.factie];
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(sx + 2, sy + 2, b, h);
        ctx.fillStyle = f.kleur;
        ctx.fillRect(sx, sy, b, h);
        const gekozen = sel.legers.includes(l.id);
        ctx.lineWidth = gekozen ? 2.5 : 1;
        ctx.strokeStyle = gekozen ? '#f4d58d' : l.factie === t.speler ? '#fff' : 'rgba(0,0,0,0.8)';
        ctx.strokeRect(sx, sy, b, h);
        ctx.fillStyle = helder(f.kleur) ? '#1a1610' : '#fff';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(kort(l.sterkte), sx + b / 2, sy + h / 2 - 1);
        // moraal
        ctx.fillStyle = '#1a1610';
        ctx.fillRect(sx, sy + h - 3, b, 3);
        ctx.fillStyle = l.moraal > 0.6 ? '#7bc96f' : l.moraal > 0.35 ? '#e0b84a' : '#d0543c';
        ctx.fillRect(sx, sy + h - 3, b * l.moraal, 3);
        // vijandig of niet
        if (l.factie !== t.speler && inOorlog(t, l.factie, t.speler)) {
          ctx.fillStyle = '#c0392b';
          ctx.beginPath();
          ctx.arc(sx + b, sy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        this.fiches.push({ leger: l.id, x: sx, y: sy, b, h });
      });
    }
    void kracht;
  }

  legerOp(sx: number, sy: number): number | null {
    for (let i = this.fiches.length - 1; i >= 0; i--) {
      const f = this.fiches[i];
      if (sx >= f.x - 2 && sx <= f.x + f.b + 2 && sy >= f.y - 2 && sy <= f.y + f.h + 2) return f.leger;
    }
    return null;
  }
}

export function kort(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', ',')}k` : `${Math.round(n)}`;
}

function inRing(p: Punt, ring: Punt[]): boolean {
  let binnen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) binnen = !binnen;
  }
  return binnen;
}

function spatieer(s: string) {
  return s.split('').join(' ');
}

function hex(k: string): [number, number, number] {
  const n = parseInt(k.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function meng(a: string, b: string, f: number): string {
  const x = hex(a), y = hex(b);
  return `rgb(${x.map((v, i) => Math.round(v * (1 - f) + y[i] * f)).join(',')})`;
}

function helder(k: string): boolean {
  const [r, g, b] = hex(k);
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}

export { TERREIN };
