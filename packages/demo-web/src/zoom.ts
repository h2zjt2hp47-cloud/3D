/**
 * Zoomen en verschuiven in een SVG-tekenvlak (zetelontwerper en plattegrond).
 * - Muiswiel of trackpad: zoomen rond de muisaanwijzer.
 * - Twee vingers: knijpen om te zoomen en samen slepen om te verschuiven.
 * - Middelste muisknop ingedrukt slepen, of slepen op een leeg stuk (door de editor gestart): verschuiven.
 * - Knoppen −, +, "Passend" en sneltoetsen + − 0 (door de editor doorgegeven).
 * Het beeld (viewBox) houdt dezelfde verhouding, zodat het tekenvlak niet van grootte verandert.
 */

export interface Kader { x: number; y: number; b: number; d: number }

export interface ZoomOpties {
  /** Element waarop wiel- en aanraakgebeurtenissen binnenkomen (blijft bestaan als de SVG opnieuw getekend wordt). */
  doel: Element;
  /** De huidige SVG (kan bij elke tekenbeurt een nieuw element zijn). */
  svg: () => SVGSVGElement | null;
  /** Passend beeld rond de tekening. */
  passend: () => Kader;
  /** Opnieuw tekenen met het nieuwe beeld. */
  opnieuw: () => void;
  /** Kleinste breedte van het beeld (in tekeningeenheden), bv. 40 cm. */
  minBreedte?: number;
  /** Hoeveel keer verder dan passend je mag uitzoomen. */
  maxUit?: number;
  /** Wordt opgeroepen als een tweede vinger het tekenvlak raakt (de editor stopt dan zijn eigen actie). */
  opKnijpen?: () => void;
}

export class Zoom {
  private vak: Kader | undefined;
  private tijdelijk: Kader | undefined;
  private pan: { x: number; y: number } | undefined;
  private wijzers = new Map<number, { x: number; y: number }>();
  private knijp: { afstand: number; x: number; y: number } | undefined;
  private labels: HTMLElement[] = [];

  constructor(private o: ZoomOpties) {
    const doel = o.doel;
    doel.addEventListener('wheel', (ev) => {
      const e = ev as WheelEvent;
      e.preventDefault();
      // Horizontaal vegen op een trackpad verschuift; verticaal (of knijpen = ctrl) zoomt.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.ctrlKey) { this.verschuifPx(-e.deltaX, 0); return; }
      const stap = e.ctrlKey ? 0.01 : e.deltaMode === 1 ? 0.05 : e.deltaMode === 2 ? 0.5 : 0.0015;
      const f = Math.min(2, Math.max(0.5, Math.exp(-e.deltaY * stap)));
      this.zoomOp(f, e.clientX, e.clientY);
    }, { passive: false });
    // Vangfase: knijpen en middelste muisknop gaan voor op de acties van de editor.
    doel.addEventListener('pointerdown', (ev) => {
      const e = ev as PointerEvent;
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        this.startPan(e);
        (doel as HTMLElement).setPointerCapture?.(e.pointerId);
        return;
      }
      if (e.pointerType !== 'mouse') this.wijzers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.wijzers.size === 2) {
        e.stopPropagation();
        e.preventDefault();
        this.o.opKnijpen?.();
        const [a, b] = [...this.wijzers.values()] as [{ x: number; y: number }, { x: number; y: number }];
        this.knijp = { afstand: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      }
    }, true);
    doel.addEventListener('pointermove', (ev) => {
      const e = ev as PointerEvent;
      if (this.pan && e.buttons & 4) { e.stopPropagation(); this.beweegPan(e); return; }
      if (!this.wijzers.has(e.pointerId)) return;
      this.wijzers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!this.knijp || this.wijzers.size < 2) return;
      e.stopPropagation();
      const [a, b] = [...this.wijzers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const afstand = Math.hypot(a.x - b.x, a.y - b.y), x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      this.verschuifPx(x - this.knijp.x, y - this.knijp.y, false);
      if (this.knijp.afstand > 0) this.zoomOp(afstand / this.knijp.afstand, x, y);
      this.knijp = { afstand, x, y };
    }, true);
    const los = (ev: Event) => {
      const e = ev as PointerEvent;
      if (e.button === 1 || (this.pan && !(e.buttons & 4) && e.pointerType === 'mouse')) this.stopPan();
      const wasKnijp = !!this.knijp;
      this.wijzers.delete(e.pointerId);
      if (this.wijzers.size < 2) this.knijp = undefined;
      if (wasKnijp) e.stopPropagation();
    };
    doel.addEventListener('pointerup', los, true);
    doel.addEventListener('pointercancel', los, true);
  }

  /** Het beeld dat getekend moet worden. */
  kijkvak(): Kader {
    return this.vak ?? this.tijdelijk ?? this.o.passend();
  }

  get ingezoomd(): boolean {
    return !!this.vak;
  }

  /** Bezig met knijpen of verschuiven (de editor doet dan niets). */
  get bezig(): boolean {
    return !!this.knijp || !!this.pan;
  }

  /** Zoomfactor ten opzichte van passend (100 % = passend). */
  procent(): number {
    return Math.round((this.o.passend().b / this.kijkvak().b) * 100);
  }

  /** Tekeningeenheden per schermpixel (bv. cm per pixel). */
  eenhedenPerPixel(): number {
    const s = this.o.svg();
    const m = s?.getScreenCTM();
    return m && m.a ? 1 / m.a : this.kijkvak().b / 800;
  }

  /** Zet het automatische beeld vast tijdens het slepen, zodat de tekening niet verspringt. */
  vastzetten() {
    if (!this.vak) this.tijdelijk = this.o.passend();
  }
  losmaken() {
    this.tijdelijk = undefined;
  }

  private wereld(clientX: number, clientY: number): { x: number; y: number } {
    const s = this.o.svg();
    const m = s?.getScreenCTM();
    if (!m) { const k = this.kijkvak(); return { x: k.x + k.b / 2, y: k.y + k.d / 2 }; }
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  /** Zoom met factor f (> 1 = inzoomen) rond een schermpunt (standaard het midden). */
  zoomOp(f: number, clientX?: number, clientY?: number) {
    const k = this.kijkvak();
    const p = clientX === undefined || clientY === undefined ? { x: k.x + k.b / 2, y: k.y + k.d / 2 } : this.wereld(clientX, clientY);
    const max = this.o.passend().b * (this.o.maxUit ?? 3);
    const nb = Math.min(max, Math.max(this.o.minBreedte ?? 40, k.b / f));
    const ef = k.b / nb;
    if (Math.abs(ef - 1) < 1e-4) return;
    this.vak = { x: p.x - (p.x - k.x) / ef, y: p.y - (p.y - k.y) / ef, b: nb, d: k.d / ef };
    this.tijdelijk = undefined;
    this.klaar();
  }

  /** Terug naar passend (volgt de tekening weer automatisch). */
  passendMaken() {
    this.vak = undefined;
    this.tijdelijk = undefined;
    this.klaar();
  }

  /** Zoom zodat een kader (bv. de selectie) ruim in beeld staat. */
  toon(kader: Kader, marge = 0.35) {
    const k = this.kijkvak();
    const verhouding = k.d / k.b;
    let b = kader.b * (1 + 2 * marge), d = kader.d * (1 + 2 * marge);
    if (d / b > verhouding) b = d / verhouding; else d = b * verhouding;
    b = Math.max(this.o.minBreedte ?? 40, b);
    d = b * verhouding;
    this.vak = { x: kader.x + kader.b / 2 - b / 2, y: kader.y + kader.d / 2 - d / 2, b, d };
    this.klaar();
  }

  startPan(ev: PointerEvent) {
    this.pan = { x: ev.clientX, y: ev.clientY };
  }
  /** Verschuift het beeld met de muis (geeft true als er verschoven werd). */
  beweegPan(ev: PointerEvent): boolean {
    if (!this.pan) return false;
    this.verschuifPx(ev.clientX - this.pan.x, ev.clientY - this.pan.y);
    this.pan = { x: ev.clientX, y: ev.clientY };
    return true;
  }
  stopPan() {
    this.pan = undefined;
  }

  private verschuifPx(dx: number, dy: number, tekenen = true) {
    const k = this.kijkvak();
    const e = this.eenhedenPerPixel();
    this.vak = { ...k, x: k.x - dx * e, y: k.y - dy * e };
    this.tijdelijk = undefined;
    if (tekenen) this.klaar();
  }

  private klaar() {
    this.o.opnieuw();
    this.bijwerken();
  }

  /** Werkt het percentage op de knoppen bij. */
  bijwerken() {
    for (const l of this.labels) l.textContent = `${this.ingezoomd ? this.procent() : 100} %`;
  }

  /** Knoppenbalk: −, percentage, +, passend (en optioneel "selectie" en "groot scherm"). */
  knoppen(opties: { selectie?: () => Kader | undefined; grootScherm?: HTMLElement } = {}): HTMLElement {
    const balk = document.createElement('div');
    balk.className = 'zoomknoppen';
    balk.setAttribute('role', 'group');
    balk.setAttribute('aria-label', 'Zoomen');
    const knop = (tekst: string, titel: string, f: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = tekst;
      b.title = titel;
      b.setAttribute('aria-label', titel);
      b.addEventListener('click', f);
      return b;
    };
    const label = document.createElement('span');
    label.className = 'zoomlabel';
    this.labels.push(label);
    balk.append(knop('−', 'Uitzoomen (−)', () => this.zoomOp(1 / 1.4)), label, knop('+', 'Inzoomen (+)', () => this.zoomOp(1.4)), knop('Passend', 'Alles in beeld (0)', () => this.passendMaken()));
    if (opties.selectie) {
      balk.append(knop('Selectie', 'Inzoomen op de selectie', () => {
        const k = opties.selectie!();
        if (k) this.toon(k);
      }));
    }
    if (opties.grootScherm) balk.append(grootSchermKnop(opties.grootScherm, () => this.klaar()));
    this.bijwerken();
    return balk;
  }

  /** Sneltoetsen + − 0; geeft true als de toets gebruikt werd. */
  toets(ev: KeyboardEvent): boolean {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
    if (ev.key === '+' || ev.key === '=') { this.zoomOp(1.4); return true; }
    if (ev.key === '-' || ev.key === '_') { this.zoomOp(1 / 1.4); return true; }
    if (ev.key === '0') { this.passendMaken(); return true; }
    return false;
  }
}

/**
 * Knop om een onderdeel (bv. het hele tekenscherm met gereedschap en eigenschappen) op het volledige
 * scherm te tonen. Gebruikt het echte volledig scherm waar de browser dat kan; anders (bv. iPhone)
 * een laag over de hele pagina. Esc of de knop zet het terug.
 */
export function grootSchermKnop(doel: HTMLElement, opnieuw: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  const tekst = () => {
    const aan = doel.classList.contains('groot-scherm');
    b.textContent = aan ? 'Klein scherm' : 'Groot scherm';
    b.title = aan ? 'Terug naar het gewone scherm (Esc)' : 'Tekenen op het volledige scherm';
    b.setAttribute('aria-pressed', String(aan));
  };
  const zet = (aan: boolean) => {
    doel.classList.toggle('groot-scherm', aan);
    document.body.classList.toggle('heeft-groot-scherm', aan);
    tekst();
    // Na het wisselen van grootte opnieuw tekenen (passend beeld volgt de nieuwe maat).
    requestAnimationFrame(() => { opnieuw(); window.dispatchEvent(new Event('resize')); });
  };
  b.addEventListener('click', async () => {
    const aan = !doel.classList.contains('groot-scherm');
    if (aan) {
      zet(true);
      try { if (doel.requestFullscreen && !document.fullscreenElement) await doel.requestFullscreen(); } catch { /* laag over de pagina volstaat */ }
    } else {
      if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* niets */ } }
      zet(false);
    }
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && doel.classList.contains('groot-scherm')) zet(false);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !doel.classList.contains('groot-scherm')) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    zet(false);
  });
  tekst();
  return b;
}
