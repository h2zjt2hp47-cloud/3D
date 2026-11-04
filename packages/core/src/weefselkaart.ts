/**
 * Kaarten voor een weefsel uit zijn hoogte: een normal map (het reliëf van de draden, dat ook de fotomodus ziet, want de
 * path tracer leest geen bumpMap) en een ruwheidskaart (de top van een draad glanst iets meer dan de tussenruimte).
 * Enkel rekenwerk, zonder DOM, zodat het in node te testen is; de weergave (demo-web/src/weefsel.ts) tekent de hoogte op
 * een canvas en zet de uitkomst terug op een canvas.
 *
 * De hoogte is een vierkante tegel van `px` × `px` waarden tussen 0 en 1, naadloos herhaalbaar: de randen lopen rond.
 * Rijen lopen van boven naar onder, zoals in een canvas. three.js draait een canvas om (flipY), dus in de textuur loopt v
 * omhoog: een rij lager in de tekening is een stap terug in v.
 */

export interface KaartOpties {
  /** De hoek in graden die de steilste flanken krijgen (het 98e percentiel van de helling); begrensd op 0 tot 75. */
  hoek: number;
  /** Hoeveel gladder de hoogste delen zijn, als deel van de ruwheid van het materiaal (0 = overal gelijk). */
  glansverschil: number;
  /**
   * Verzachting van de hoogte vóór de normalen, in pixels (0 = scherp). Voor zachte stoffen zoals velours: zonder
   * verzachting worden losse vlekjes in de tekening harde, ingedrukte vierkantjes.
   */
  vervaging?: number;
}

export interface Weefselkaarten {
  /** RGBA per pixel: de normaal in de raakruimte (x naar rechts, y omhoog in v, z naar buiten), van 0 tot 255. */
  normaal: Uint8ClampedArray;
  /**
   * RGBA per pixel: de factor op de ruwheid van het materiaal, in R, G en B (three.js leest G). 255 is de ruwheid van
   * het materiaal zelf; lager is gladder.
   */
  ruwheid: Uint8ClampedArray;
  /** Waarmee de helling vermenigvuldigd werd om op `hoek` uit te komen (0 bij een vlakke tegel). */
  sterkte: number;
}

/** De normal map en de ruwheidskaart van één tegel. Gooit enkel als de hoogte niet bij de maat past. */
export function kaartenUitHoogte(hoogte: Float32Array, px: number, opties: KaartOpties): Weefselkaarten {
  if (!Number.isInteger(px) || px < 2 || hoogte.length !== px * px) throw new Error('De hoogte past niet bij de maat van de tegel.');
  const n = px * px;
  if (opties.vervaging && opties.vervaging > 0) hoogte = vervaag(hoogte, px, Math.round(opties.vervaging));
  const op = (x: number, y: number) => hoogte[(((y % px) + px) % px) * px + (((x % px) + px) % px)]!;

  // Helling per pixel (centrale verschillen, rondlopend aan de randen) en het gemiddelde van de hoogte.
  const gx = new Float32Array(n);
  const gy = new Float32Array(n);
  const helling = new Float32Array(n);
  let som = 0;
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const i = y * px + x;
      gx[i] = (op(x + 1, y) - op(x - 1, y)) / 2;
      gy[i] = (op(x, y + 1) - op(x, y - 1)) / 2;
      helling[i] = Math.hypot(gx[i]!, gy[i]!);
      som += hoogte[i]!;
    }
  }

  // De diepte volgt uit de gevraagde hoek, niet uit hoe licht of donker de tekening is: zo blijft ze per weefsel instelbaar.
  const steilste = percentiel(helling, 0.98);
  const hoek = Math.min(Math.max(opties.hoek, 0), 75);
  const sterkte = steilste > 1e-6 ? Math.tan((hoek * Math.PI) / 180) / steilste : 0;

  // Hoe ver een pixel boven het gemiddelde ligt, als deel van de grootste afwijking (98e percentiel): 0 tot 1.
  const gemiddeld = som / n;
  const afwijking = new Float32Array(n);
  for (let i = 0; i < n; i++) afwijking[i] = Math.abs(hoogte[i]! - gemiddeld);
  const spreiding = percentiel(afwijking, 0.98) || 1;
  const glans = Math.min(Math.max(opties.glansverschil, 0), 1);

  const normaal = new Uint8ClampedArray(n * 4);
  const ruwheid = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    // De normaal helt weg van de stijgende hoogte: -dh/du naar rechts, en omdat een rij lager -v is, +dh/drij omhoog.
    const nx = -gx[i]! * sterkte;
    const ny = gy[i]! * sterkte;
    const lengte = Math.hypot(nx, ny, 1);
    normaal[i * 4] = Math.round(((nx / lengte) * 0.5 + 0.5) * 255);
    normaal[i * 4 + 1] = Math.round(((ny / lengte) * 0.5 + 0.5) * 255);
    normaal[i * 4 + 2] = Math.round(((1 / lengte) * 0.5 + 0.5) * 255);
    normaal[i * 4 + 3] = 255;
    const boven = Math.min(1, Math.max(0, (hoogte[i]! - gemiddeld) / spreiding));
    const factor = Math.round((1 - glans * boven) * 255);
    ruwheid[i * 4] = factor;
    ruwheid[i * 4 + 1] = factor;
    ruwheid[i * 4 + 2] = factor;
    ruwheid[i * 4 + 3] = 255;
  }
  return { normaal, ruwheid, sterkte };
}

/** Twee keer een vakgemiddelde met straal `r` in x en in y, rondlopend aan de randen (de tegel blijft naadloos). */
function vervaag(hoogte: Float32Array, px: number, r: number): Float32Array {
  let a = Float32Array.from(hoogte);
  const b = new Float32Array(a.length);
  const w = 2 * r + 1;
  for (let keer = 0; keer < 2; keer++) {
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
      let s = 0;
      for (let d = -r; d <= r; d++) s += a[y * px + (((x + d) % px) + px) % px]!;
      b[y * px + x] = s / w;
    }
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
      let s = 0;
      for (let d = -r; d <= r; d++) s += b[((((y + d) % px) + px) % px) * px + x]!;
      a[y * px + x] = s / w;
    }
  }
  return a;
}

/** De waarde onder welke een deel `p` (0 tot 1) van de waarden ligt. */
function percentiel(waarden: Float32Array, p: number): number {
  const gesorteerd = Float32Array.from(waarden).sort();
  return gesorteerd[Math.min(gesorteerd.length - 1, Math.floor(gesorteerd.length * p))] ?? 0;
}
