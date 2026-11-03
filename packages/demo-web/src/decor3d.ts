/**
 * Decors rond de zetel: een hoekkamer met achterwand en zijwand (met raam, daglicht en uitzicht), wandafwerking,
 * plinten, tapijt, salontafel, bijzettafel, lamp, plant en kunst. Alles getekend met eenvoudige vormen en
 * zelf getekende texturen (geen foto's). Maten in cm. Gebruikt door drie-d.ts (alleen voor de zetel).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Beschrijving van een decor (gegevens; zie DECORS in drie-d.ts). */
export interface DecorSpec {
  label: string;
  achtergrond: string;
  vloer?: { soort: string; kleur: string };
  muur?: { soort: string; kleur: string };
  /** 'hoek' = achterwand + zijwand rechts (met raam), 'achter' = alleen een achterwand, weglaten = geen wanden. */
  wanden?: 'hoek' | 'achter';
  raam?: { kader: string; gordijn?: string; zicht: 'tuin' | 'stad' | 'duin'; breed?: boolean };
  afwerking?: { soort: 'lambrisering' | 'lijsten' | 'latten'; kleur: string };
  tapijt?: { kleur: string; rand?: string; vorm?: 'rond' | 'rechthoek'; patroon?: 'effen' | 'streep' | 'rand' };
  tafel?: 'travertin' | 'hout_rond' | 'hout_laag' | 'marmer' | 'metaal' | 'teak';
  bijzettafel?: string;
  lamp?: 'staand' | 'boog' | 'papier' | 'messing';
  plant?: 'ficus' | 'olijf' | 'tak';
  kunst?: { stijl: 'abstract' | 'lijnen' | 'landschap' | 'klassiek'; kleuren: string[]; lijst: string };
  /** Terras: geen wanden maar een haag en bloembakken. */
  buiten?: boolean;
  /** Toonzaal: verhoging onder de zetel en spots aan een rail. */
  podium?: boolean;
  /** Standaardrichting van het zonlicht (graden), bv. door het raam. */
  zon?: number;
}

/** Hulpmiddelen uit de 3D-weergave (texturen, kleuren). */
export interface DecorHulp {
  THREE: any;
  kleur: (hex: string) => any;
  tint: (hex: string, f: number) => string;
  canvasTextuur: (b: number, h: number, px: number, teken: (g: CanvasRenderingContext2D, px: number) => void) => any;
  parket: (hex: string) => any;
  baksteen: (hex: string, voeg?: string) => any;
  pleister: (hex: string) => any;
  houtNerf: (hex: string) => any;
  weefselCanvas: (w: any, hex: string) => HTMLCanvasElement;
  bladVorm: () => any;
  omgeving: number;
  /** Avond: binnen gedimd, buiten donker, lampen aan. */
  avond: boolean;
}

export interface DecorResultaat {
  delen: any[];
  /** Wanden die wegvallen als de camera erachter staat (punt op de wand en normaal naar de kamer). */
  wanden: { obj: any; punt: [number, number, number]; normaal: [number, number, number] }[];
  /** Plaats van de lamp (voor het warme licht 's avonds). */
  lamp: [number, number, number] | null;
  /** Hoeveel verder dan de zetel het schaduwbereik moet reiken (wanden, raam). */
  schaduwMarge: number;
}

type Kader = { x: number; z: number; b: number; d: number; h: number };

/** Bouwt het decor rond de zetel (kader = omsluitend kader van de zetel). */
export function bouwDecor(h: DecorHulp, dc: DecorSpec, k: Kader, spullen: boolean): DecorResultaat {
  const T = h.THREE;
  const delen: any[] = [];
  const wanden: DecorResultaat['wanden'] = [];
  const mat = (kleurHex: string, ruw = 0.85, extra: Record<string, unknown> = {}) =>
    new T.MeshStandardMaterial({ color: h.kleur(kleurHex), roughness: ruw, envMapIntensity: h.omgeving, ...extra });
  const voeg = (m: any, schaduw = true, groep?: any) => {
    m.castShadow = schaduw;
    m.receiveShadow = true;
    if (groep) groep.add(m);
    else delen.push(m);
    return m;
  };
  const blok = (b: number, hh: number, d: number, x: number, y: number, z: number, m: any, schaduw = true, groep?: any) => {
    const mesh = new T.Mesh(new T.BoxGeometry(b, hh, d), m);
    mesh.position.set(x, y + hh / 2, z);
    return voeg(mesh, schaduw, groep);
  };
  const cil = (r0: number, r1: number, hh: number, x: number, y: number, z: number, m: any, seg = 32, schaduw = true, groep?: any) => {
    const mesh = new T.Mesh(new T.CylinderGeometry(r0, r1, hh, seg), m);
    mesh.position.set(x, y + hh / 2, z);
    return voeg(mesh, schaduw, groep);
  };

  const midX = k.x + k.b / 2;
  const muurZ = k.z - 35;
  const H = 280; // plafondhoogte
  const xL = k.x - 150; // linkerrand van de kamer (open kant)
  const xR = k.x + k.b + 170; // zijwand rechts (met raam)
  const zV = k.z + k.d + 320; // tot waar de kamer loopt
  const breed = xR - xL, diep = zV - muurZ;
  let lamp: DecorResultaat['lamp'] = null;

  // ---------- wanden ----------
  const muurMat = (() => {
    const m = dc.muur;
    if (!m) return null;
    if (m.soort === 'steen') {
      const t = h.baksteen(m.kleur, '#c7bfb2');
      t.repeat.set(1 / 88, 1 / 60); // UV in cm, steen-tegel 88 × 60 cm
      return new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: t, envMapIntensity: h.omgeving * 0.8 });
    }
    // Verf of beton: lichte pleisterstructuur op grote schaal.
    const t = h.pleister(m.kleur);
    t.repeat.set(1 / (m.soort === 'beton' ? 120 : 200), 1 / (m.soort === 'beton' ? 120 : 200));
    return new T.MeshStandardMaterial({ color: 0xffffff, roughness: m.soort === 'beton' ? 0.8 : 0.95, map: t, envMapIntensity: h.omgeving * 0.8 });
  })();
  const plintMat = mat(dc.afwerking?.kleur ?? '#f3f0ea', 0.6);
  /** Wand als vlak (eventueel met een raamopening), in lokale coördinaten u (breedte) en v (hoogte). */
  const wandVlak = (lengte: number, opening: { u0: number; u1: number; v0: number; v1: number } | null) => {
    const s = new T.Shape();
    s.moveTo(-lengte / 2, 0); s.lineTo(lengte / 2, 0); s.lineTo(lengte / 2, H); s.lineTo(-lengte / 2, H); s.closePath();
    if (opening) {
      const g = new T.Path();
      g.moveTo(opening.u0, opening.v0); g.lineTo(opening.u0, opening.v1); g.lineTo(opening.u1, opening.v1); g.lineTo(opening.u1, opening.v0); g.closePath();
      s.holes.push(g);
    }
    return new T.Mesh(new T.ShapeGeometry(s), muurMat);
  };

  if (dc.wanden && muurMat) {
    // Achterwand (achter de zetel), met plint.
    const achter = new T.Group();
    const vlak = wandVlak(breed, null);
    vlak.position.set((xL + xR) / 2, 0, muurZ);
    voeg(vlak, true, achter);
    blok(breed, 9, 1.6, (xL + xR) / 2, 0, muurZ + 0.8, plintMat, false, achter);
    // Wandafwerking achter de zetel.
    if (dc.afwerking?.soort === 'lambrisering') {
      const am = mat(dc.afwerking.kleur, 0.6);
      blok(breed, 2.5, 3, (xL + xR) / 2, 92, muurZ + 1.5, am, false, achter); // stootlijst
      const n = Math.round(breed / 70);
      for (let i = 0; i < n; i++) {
        const bx = xL + (breed / n) * (i + 0.5);
        // Paneel met een kader van 2 cm (verhoogd).
        for (const [bb, hh, dx, dy] of [[breed / n - 16, 2, 0, 20], [breed / n - 16, 2, 0, 78], [2, 58, -(breed / n - 18) / 2, 20], [2, 58, (breed / n - 18) / 2, 20]] as const)
          blok(bb, hh, 1.6, bx + dx, dy, muurZ + 0.8, am, false, achter);
      }
    } else if (dc.afwerking?.soort === 'lijsten') {
      // Klassieke kaderlijsten: een hoog en een laag kader per vak.
      const am = mat(dc.afwerking.kleur, 0.55);
      const n = Math.max(3, Math.round(breed / 110));
      for (let i = 0; i < n; i++) {
        const bx = xL + (breed / n) * (i + 0.5), bb = breed / n - 30;
        for (const [y0, hh] of [[22, 60], [105, 150]] as const) {
          blok(bb, 2.2, 1.8, bx, y0, muurZ + 0.9, am, false, achter);
          blok(bb, 2.2, 1.8, bx, y0 + hh, muurZ + 0.9, am, false, achter);
          blok(2.2, hh, 1.8, bx - bb / 2, y0, muurZ + 0.9, am, false, achter);
          blok(2.2, hh, 1.8, bx + bb / 2, y0, muurZ + 0.9, am, false, achter);
        }
      }
      blok(breed, 8, 4, (xL + xR) / 2, H - 8, muurZ + 2, am, false, achter); // kroonlijst
    } else if (dc.afwerking?.soort === 'latten') {
      // Houten latten achter de zetel (Japandi).
      const lm = new T.MeshStandardMaterial({ color: 0xffffff, map: h.houtNerf(dc.afwerking.kleur), roughness: 0.6, envMapIntensity: h.omgeving });
      const lb = Math.min(breed - 60, k.b + 120), x0 = midX - lb / 2;
      blok(lb, 236, 1.2, midX, 0, muurZ + 0.6, mat(h.tint(dc.afwerking.kleur, 0.55), 0.9), false, achter);
      for (let x = x0 + 2; x < x0 + lb - 2; x += 7) blok(4, 236, 3, x + 2, 0, muurZ + 2.7, lm, true, achter);
    }
    delen.push(achter);
    wanden.push({ obj: achter, punt: [(xL + xR) / 2, H / 2, muurZ], normaal: [0, 0, 1] });

    if (dc.wanden === 'hoek') {
      // Zijwand rechts met een raam (zichtbaar vanuit het standaardstandpunt): de zon valt erdoor naar binnen.
      const zijde = new T.Group();
      const zc = muurZ + diep / 2;
      const raamZ = Math.min(zV - 140, k.z + k.d / 2 + 40), rb = dc.raam?.breed ? 240 : 150, rh = dc.raam?.breed ? 230 : 190, borst = dc.raam?.breed ? 15 : 55;
      // Vlak in het XY-vlak, gedraaid naar de kamer (−x): lokale u = z − zc.
      const u0 = raamZ - rb / 2 - zc, u1 = raamZ + rb / 2 - zc;
      const vlak = wandVlak(diep, dc.raam ? { u0, u1, v0: borst, v1: borst + rh } : null);
      vlak.rotation.y = -Math.PI / 2;
      vlak.position.set(xR, 0, zc);
      voeg(vlak, true, zijde);
      const pl = blok(1.6, 9, diep, xR - 0.8, 0, zc, plintMat, false, zijde);
      pl.position.z = zc;
      if (dc.raam) {
        const km = mat(dc.raam.kader, 0.45, dc.raam.kader === '#1f1f1f' ? { metalness: 0.5 } : {});
        const dikte = dc.raam.kader === '#1f1f1f' ? 3.5 : 7;
        const zA = raamZ - rb / 2, zB = raamZ + rb / 2;
        // Kader rondom, tussenstijlen (en bij een stalen raam ook een roede), vensterbank.
        blok(10, dikte, rb + 2 * dikte, xR + 2, borst - dikte, raamZ, km, true, zijde);
        blok(10, dikte, rb + 2 * dikte, xR + 2, borst + rh, raamZ, km, true, zijde);
        blok(10, rh, dikte, xR + 2, borst, zA - dikte / 2, km, true, zijde);
        blok(10, rh, dikte, xR + 2, borst, zB + dikte / 2, km, true, zijde);
        const stijlen = dc.raam.breed ? 3 : 1;
        for (let i = 1; i <= stijlen; i++) blok(8, rh, dikte * 0.8, xR + 2, borst, zA + (rb * i) / (stijlen + 1), km, true, zijde);
        if (dc.raam.kader === '#1f1f1f') for (const f of [0.33, 0.66]) blok(8, 2.5, rb, xR + 2, borst + rh * f, raamZ, km, true, zijde);
        blok(16, 3, rb + 24, xR - 4, borst - 3, raamZ, mat(dc.afwerking?.kleur ?? '#f1ede6', 0.5), true, zijde);
        // Glas: licht en bijna onzichtbaar.
        const glas = new T.Mesh(new T.PlaneGeometry(rb, rh), new T.MeshStandardMaterial({ color: 0xdfe9ef, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false, envMapIntensity: 1 }));
        glas.rotation.y = -Math.PI / 2;
        glas.position.set(xR + 3, borst + rh / 2, raamZ);
        zijde.add(glas);
        // Gordijnen: geplooide stof aan weerszijden van het raam.
        if (dc.raam.gordijn) {
          const gm = new T.MeshStandardMaterial({ color: h.kleur(dc.raam.gordijn), roughness: 0.95, side: T.DoubleSide, envMapIntensity: h.omgeving, transparent: true, opacity: 0.94 });
          for (const kant of [-1, 1]) {
            const gb = 55, gh = H - 12;
            const geo = new T.PlaneGeometry(gb, gh, 28, 1);
            const p = geo.attributes.position;
            for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / gb) * Math.PI * 7) * 3.2);
            geo.computeVertexNormals();
            const g = new T.Mesh(geo, gm);
            g.rotation.y = -Math.PI / 2;
            g.position.set(xR - 9, gh / 2 + 2, raamZ + kant * (rb / 2 + gb / 2 - 8));
            voeg(g, true, zijde);
          }
          blok(4, 4, rb + 150, xR - 9, H - 10, raamZ, mat('#2b2b2b', 0.4, { metalness: 0.6 }), false, zijde); // roede
        }
        // Uitzicht: een helder vlak buiten het raam (lucht, tuin, stad of duinen).
        const zicht = h.canvasTextuur(400, 200, 1.5, (g, px) => tekenZicht(g, px, dc.raam!.zicht, h.avond));
        zicht.repeat.set(1, 1);
        zicht.wrapS = zicht.wrapT = T.ClampToEdgeWrapping;
        const buiten = new T.Mesh(new T.PlaneGeometry(700, 350), new T.MeshBasicMaterial({ map: zicht, color: h.avond ? 0x9aa6bb : 0xffffff, fog: false }));
        buiten.rotation.y = -Math.PI / 2;
        buiten.position.set(xR + 220, borst + rh / 2 + 20, raamZ);
        zijde.add(buiten);
      }
      delen.push(zijde);
      wanden.push({ obj: zijde, punt: [xR, H / 2, zc], normaal: [-1, 0, 0] });
    }
  }

  // ---------- buiten: haag en bloembakken (terras) ----------
  if (dc.buiten) {
    const haagTex = new T.CanvasTexture(h.weefselCanvas('boucle', '#4f6b3c'));
    haagTex.wrapS = haagTex.wrapT = T.RepeatWrapping;
    haagTex.colorSpace = T.SRGBColorSpace;
    haagTex.repeat.set(breed / 30, 4);
    const haag = new T.Mesh(new T.BoxGeometry(breed, 150, 60), new T.MeshStandardMaterial({ color: 0xffffff, map: haagTex, roughness: 1, envMapIntensity: h.omgeving }));
    haag.position.set(midX, 75, muurZ - 30);
    voeg(haag);
    const bak = mat('#7d756b', 0.85);
    // Bloembakken met een bolle struik.
    const struik = new T.MeshStandardMaterial({ color: 0xffffff, map: haagTex, roughness: 1, envMapIntensity: h.omgeving });
    for (const x of [xL + 60, xR - 60]) {
      blok(70, 45, 70, x, 0, muurZ + 50, bak);
      const bol = voeg(new T.Mesh(new T.SphereGeometry(36, 24, 16), struik));
      bol.scale.set(1, 0.8, 1);
      bol.position.set(x, 70, muurZ + 50);
    }
  }

  // ---------- toonzaal: verhoging onder de zetel en spots ----------
  if (dc.podium) {
    blok(k.b + 80, 6, k.d + 80, midX, 0, k.z + k.d / 2, mat('#f4f3f0', 0.35), false);
    const rail = mat('#1c1c1c', 0.4, { metalness: 0.6 });
    blok(k.b + 160, 3, 3, midX, H - 6, k.z + k.d + 60, rail, false);
    for (const f of [0.2, 0.5, 0.8]) cil(5, 4, 14, k.x - 80 + (k.b + 160) * f, H - 22, k.z + k.d + 60, rail, 16, false);
  }

  // ---------- tapijt ----------
  if (dc.tapijt) {
    const t = dc.tapijt;
    const rond = t.vorm === 'rond';
    const tb = rond ? Math.max(k.b, k.d) + 60 : k.b + 90, td = rond ? tb : k.d + 140;
    const tex = h.canvasTextuur(rond ? 200 : 240, rond ? 200 : 160, 2, (g, px) => tekenTapijt(g, px, rond ? 200 : 240, rond ? 200 : 160, t.kleur, t.rand, t.patroon ?? 'effen', h.tint, rond));
    tex.repeat.set(1, 1);
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    const relief = new T.CanvasTexture(h.weefselCanvas('wol', '#8c8c8c'));
    relief.wrapS = relief.wrapT = T.RepeatWrapping;
    relief.repeat.set(tb / 8, td / 8);
    const tm = new T.MeshStandardMaterial({ color: 0xffffff, map: tex, bumpMap: relief, bumpScale: 0.6, roughness: 1, envMapIntensity: h.omgeving * 0.6 });
    const geo = rond ? new T.CylinderGeometry(tb / 2, tb / 2, 1.2, 72) : new T.BoxGeometry(tb, 1.2, td);
    if (rond) {
      // Bovenvlak van de cilinder: UV van het grondvlak.
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tb + 0.5, p.getZ(i) / tb + 0.5);
    }
    const tapijt = new T.Mesh(geo, tm);
    tapijt.position.set(midX, 0.6, k.z + k.d / 2 + (rond ? 45 : 35));
    voeg(tapijt, false);
  }

  if (!spullen) return { delen, wanden, lamp: null, schaduwMarge: dc.wanden ? 220 : 60 };

  // ---------- salontafel (met boeken of een vaas) ----------
  const tz = k.z + k.d + 55, tx = midX;
  const houtMat = (hex: string) => new T.MeshStandardMaterial({ color: 0xffffff, map: h.houtNerf(hex), roughness: 0.5, envMapIntensity: h.omgeving });
  let tafelTop = 0;
  switch (dc.tafel) {
    case 'travertin': {
      const st = steenTex(h, '#d9ccb4', 'travertin');
      cil(45, 45, 36, tx, 0, tz, new T.MeshStandardMaterial({ color: 0xffffff, map: st, roughness: 0.7, envMapIntensity: h.omgeving }), 64);
      tafelTop = 36;
      break;
    }
    case 'hout_rond': {
      const hm = houtMat('#b48d62');
      cil(42, 42, 3.5, tx, 40, tz, hm, 64);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; cil(2, 1.4, 40, tx + Math.cos(a) * 26, 0, tz + Math.sin(a) * 26, hm, 12); }
      tafelTop = 43.5;
      break;
    }
    case 'hout_laag': {
      const hm = houtMat('#c4a37a');
      blok(120, 4, 60, tx, 28, tz, hm);
      blok(110, 2, 52, tx, 8, tz, hm);
      for (const [dx, dz] of [[-55, -25], [55, -25], [-55, 25], [55, 25]] as const) blok(4, 28, 4, tx + dx, 0, tz + dz, hm);
      tafelTop = 32;
      break;
    }
    case 'marmer': {
      const st = steenTex(h, '#ece9e4', 'marmer');
      blok(110, 2.5, 60, tx, 40, tz, new T.MeshStandardMaterial({ color: 0xffffff, map: st, roughness: 0.25, envMapIntensity: h.omgeving * 1.2 }));
      const messing = mat('#b8954f', 0.3, { metalness: 0.85 });
      blok(104, 1.2, 1.2, tx, 39, tz - 27, messing); blok(104, 1.2, 1.2, tx, 39, tz + 27, messing);
      for (const [dx, dz] of [[-52, -27], [52, -27], [-52, 27], [52, 27]] as const) blok(1.4, 39, 1.4, tx + dx, 0, tz + dz, messing);
      tafelTop = 42.5;
      break;
    }
    case 'metaal': {
      const zw = mat('#1e1e1e', 0.45, { metalness: 0.6 });
      const st = steenTex(h, '#6f6c68', 'beton');
      blok(100, 3, 100, tx, 34, tz + 10, new T.MeshStandardMaterial({ color: 0xffffff, map: st, roughness: 0.6, envMapIntensity: h.omgeving }));
      for (const [dx, dz] of [[-46, -36], [46, -36], [-46, 56], [46, 56]] as const) blok(2.5, 34, 2.5, tx + dx, 0, tz + dz, zw);
      tafelTop = 37;
      break;
    }
    case 'teak': {
      const hm = houtMat('#9a7350');
      for (let i = 0; i < 8; i++) blok(7, 2.5, 60, tx - 31 + i * 9, 38, tz, hm);
      for (const [dx, dz] of [[-30, -26], [30, -26], [-30, 26], [30, 26]] as const) blok(4, 38, 4, tx + dx, 0, tz + dz, hm);
      tafelTop = 40.5;
      break;
    }
  }
  if (tafelTop) {
    // Boeken en een keramische vaas of kom.
    const boek = (kl: string, dy: number, dx: number, rot: number) => { const b = blok(26, 3.2, 19, tx - 15 + dx, tafelTop + dy, tz - 4, mat(kl, 0.8)); b.rotation.y = rot; };
    boek('#b7a48a', 0, 0, 0.12); boek('#4d5a57', 3.2, 1.5, -0.05); boek('#e4ddd2', 6.4, 0.5, 0.2);
    const profiel = [[0, 0], [7, 0], [9, 4], [8, 12], [5, 16], [4.2, 20], [4.6, 22], [0, 22]].map(([x, y]) => new T.Vector2(x, y));
    const vaas = new T.Mesh(new T.LatheGeometry(profiel, 36), mat(dc.tafel === 'teak' ? '#b9735a' : '#d8d1c3', 0.55));
    vaas.position.set(tx + 22, tafelTop, tz + 6);
    voeg(vaas);
    if (dc.plant === 'tak' || dc.tafel === 'hout_laag') {
      // Takje in de vaas.
      const tm = mat('#5a4636', 0.9);
      for (let i = 0; i < 3; i++) { const tak = cil(0.35, 0.5, 38 + i * 6, tx + 22, tafelTop + 20, tz + 6, tm, 6, false); tak.rotation.z = (i - 1) * 0.25; }
    }
  }

  // ---------- bijzettafel ----------
  if (dc.bijzettafel) {
    const bx = k.x - 38, bz = k.z + 28;
    const m = dc.bijzettafel === 'messing' ? mat('#b8954f', 0.3, { metalness: 0.85 }) : houtMat(dc.bijzettafel);
    cil(22, 22, 2.5, bx, 50, bz, m, 48);
    cil(1.8, 1.8, 50, bx, 0, bz, m, 12, false);
    cil(16, 16, 1.5, bx, 0, bz, m, 48);
    const kaars = mat('#efe9df', 0.7);
    cil(4, 4, 9, bx + 6, 52.5, bz - 4, kaars, 20);
  }

  // ---------- lamp ----------
  const lx = k.x + k.b + 45, lz = k.z + 15;
  const metaal = mat('#2b2b2b', 0.35, { metalness: 0.7 });
  const kapMat = (kl: string) => new T.MeshStandardMaterial({ color: h.kleur(kl), roughness: 0.9, side: T.DoubleSide, emissive: h.kleur('#ffd9a8'), emissiveIntensity: h.avond ? 0.7 : 0, envMapIntensity: h.omgeving });
  switch (dc.lamp) {
    case 'staand':
      cil(14, 15, 2, lx, 0, lz, metaal, 28);
      cil(0.9, 0.9, 150, lx, 2, lz, metaal, 10, false);
      voeg(new T.Mesh(new T.CylinderGeometry(16, 22, 26, 32, 1, true), kapMat('#efe7d8')), false).position.set(lx, 160, lz);
      lamp = [lx, 150, lz];
      break;
    case 'messing': {
      const ms = mat('#b8954f', 0.3, { metalness: 0.85 });
      cil(13, 14, 2.5, lx, 0, lz, ms, 28);
      cil(1, 1, 140, lx, 2, lz, ms, 10, false);
      // Geplooide kap.
      const geo = new T.CylinderGeometry(15, 21, 28, 48, 1, true);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const f = 1 + 0.04 * Math.cos(a * 24); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
      geo.computeVertexNormals();
      voeg(new T.Mesh(geo, kapMat('#f1e6cf')), false).position.set(lx, 150, lz);
      lamp = [lx, 142, lz];
      break;
    }
    case 'boog': {
      // Booglamp over de zetel (industrieel).
      const pts: any[] = [];
      for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new T.Vector3(lx + 10 - t * 120, 2 + Math.sin(t * Math.PI * 0.85) * 175 + t * 20, lz + 30 + t * 40)); }
      const curve = new T.CatmullRomCurve3(pts);
      voeg(new T.Mesh(new T.TubeGeometry(curve, 60, 1.1, 8, false), metaal), false);
      blok(30, 6, 30, lx + 10, 0, lz + 30, mat('#e8e4dc', 0.3), true);
      const eind = pts[pts.length - 1];
      const kap = voeg(new T.Mesh(new T.SphereGeometry(20, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: h.kleur('#1f1f1f'), metalness: 0.6, roughness: 0.35, side: T.DoubleSide, envMapIntensity: h.omgeving })), false);
      kap.position.set(eind.x, eind.y - 4, eind.z);
      lamp = [eind.x, eind.y - 12, eind.z];
      break;
    }
    case 'papier': {
      // Papieren lantaarn op een houten voet (Japandi).
      const hm = houtMat('#a9895f');
      cil(1.2, 1.2, 120, lx, 0, lz, hm, 8, false);
      const geo = new T.CylinderGeometry(19, 19, 46, 40, 10, false);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 23; const f = 0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - y * y)); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
      geo.computeVertexNormals();
      const lant = voeg(new T.Mesh(geo, new T.MeshStandardMaterial({ color: h.kleur('#f6f1e6'), roughness: 0.9, emissive: h.kleur('#ffe2b8'), emissiveIntensity: h.avond ? 0.8 : 0.08, envMapIntensity: h.omgeving })), false);
      lant.position.set(lx, 128, lz);
      lamp = [lx, 128, lz];
      break;
    }
  }

  // ---------- plant ----------
  const px = k.x - 95, pz = muurZ + 45;
  if (dc.plant === 'ficus' || dc.plant === 'olijf') {
    const pot = voeg(new T.Mesh(new T.LatheGeometry([[0, 0], [15, 0], [18, 4], [19, 40], [17.5, 42], [0, 42]].map(([x, y]) => new T.Vector2(x, y)), 40), mat(dc.muur?.soort === 'steen' ? '#5f5a55' : '#d6cfc2', 0.75)));
    pot.position.set(px, 0, pz);
    const olijf = dc.plant === 'olijf';
    const groen = olijf
      ? [mat('#7c8a6a', 0.7, { side: T.DoubleSide }), mat('#9aa58a', 0.7, { side: T.DoubleSide })]
      : [mat('#3f5f34', 0.55, { side: T.DoubleSide }), mat('#55773f', 0.6, { side: T.DoubleSide })];
    const blad = h.bladVorm();
    const stammen = olijf ? 2 : 3;
    for (let st = 0; st < stammen; st++) {
      const sx = px + (st - (stammen - 1) / 2) * 6, sz = pz + (st % 2 ? 3 : -3), top = (olijf ? 140 : 110) + st * 14;
      cil(olijf ? 1.4 : 0.8, olijf ? 2.2 : 1.2, top - 40, sx, 40, sz, new T.MeshStandardMaterial({ map: h.houtNerf('#6a4a32'), roughness: 0.85 }), 6, false);
      const n = olijf ? 120 : 18;
      for (let i = 0; i < n; i++) {
        const bl = new T.Mesh(blad, groen[(i + st) % 2]);
        // Ficus: bladeren langs de stam; olijf: een bolle kruin van kleine, smalle blaadjes.
        const hoek = i * 2.4 + st, hh = olijf ? top - 55 + ((i * 37) % 50) : 50 + ((top - 50) * i) / (n - 1);
        const r = olijf ? 4 + ((i * 13) % 22) : 2 + (i % 3);
        bl.position.set(sx + Math.cos(hoek) * r, hh, sz + Math.sin(hoek) * r);
        bl.rotation.set(-0.9 - (i % 3) * 0.25, hoek, 0, 'YXZ');
        const sch = olijf ? 0.62 + (i % 4) * 0.08 : 1 + ((i * 7) % 5) * 0.1;
        bl.scale.set(olijf ? sch * 0.6 : sch, sch, sch);
        voeg(bl);
      }
    }
  }

  // ---------- kunst boven de zetel ----------
  if (dc.kunst && dc.wanden) {
    const kb = Math.min(160, Math.max(70, k.b * 0.5)), kh = Math.round(kb * (dc.kunst.stijl === 'landschap' || dc.kunst.stijl === 'klassiek' ? 0.65 : 0.75));
    const ky = Math.max(k.h + 30, 125);
    const doek = h.canvasTextuur(kb, kh, 3, (g, px2) => tekenKunst(g, px2, kb, kh, dc.kunst!.stijl, dc.kunst!.kleuren));
    doek.repeat.set(1, 1);
    doek.wrapS = doek.wrapT = T.ClampToEdgeWrapping;
    const lijstDik = dc.kunst.stijl === 'klassiek' ? 6 : 2.5;
    const groep = wanden[0]?.obj;
    blok(kb + 2 * lijstDik, kh + 2 * lijstDik, 3.5, midX, ky - lijstDik, muurZ + 1.75, mat(dc.kunst.lijst, dc.kunst.stijl === 'klassiek' ? 0.35 : 0.6, dc.kunst.stijl === 'klassiek' ? { metalness: 0.7 } : {}), true, groep);
    const vlak = new T.Mesh(new T.PlaneGeometry(kb, kh), new T.MeshStandardMaterial({ color: 0xffffff, map: doek, roughness: 0.85, envMapIntensity: h.omgeving }));
    vlak.position.set(midX, ky + kh / 2, muurZ + 3.6);
    voeg(vlak, false, groep);
  }

  return { delen, wanden, lamp, schaduwMarge: dc.wanden ? 220 : 60 };
}

/** Uitzicht door het raam: lucht met tuin, stad of duinen (overdag of 's avonds). */
function tekenZicht(g: CanvasRenderingContext2D, px: number, soort: 'tuin' | 'stad' | 'duin', avond: boolean) {
  const W = 400 * px, H = 200 * px;
  const lucht = g.createLinearGradient(0, 0, 0, H);
  lucht.addColorStop(0, avond ? '#2d3a5c' : '#a9c6e2');
  lucht.addColorStop(0.65, avond ? '#e3a77a' : '#e8f0f5');
  lucht.addColorStop(1, avond ? '#f1c491' : '#f4f6f2');
  g.fillStyle = lucht;
  g.fillRect(0, 0, W, H);
  let zaad = 7;
  const r = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647);
  if (soort === 'stad') {
    for (let i = 0; i < 26; i++) {
      const b = (12 + r() * 30) * px, hh = (40 + r() * 90) * px, x = r() * W;
      g.fillStyle = avond ? `rgba(40,44,60,${0.75 + r() * 0.2})` : `rgba(${150 + r() * 40},${158 + r() * 40},${170 + r() * 30},0.9)`;
      g.fillRect(x, H - hh, b, hh);
      if (avond) for (let j = 0; j < 12; j++) { g.fillStyle = 'rgba(255,214,150,0.8)'; g.fillRect(x + r() * b, H - r() * hh, 2 * px, 2 * px); }
    }
  } else if (soort === 'duin') {
    g.fillStyle = avond ? '#5c5a63' : '#d9ccb1';
    g.beginPath(); g.moveTo(0, H * 0.78);
    for (let x = 0; x <= W; x += 8 * px) g.lineTo(x, H * (0.74 + 0.06 * Math.sin(x / (40 * px)) + 0.02 * Math.sin(x / (9 * px))));
    g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = avond ? 'rgba(70,90,70,0.8)' : 'rgba(120,140,95,0.75)';
    for (let i = 0; i < 60; i++) { const x = r() * W; g.fillRect(x, H * (0.74 + r() * 0.06), 1.5 * px, -(4 + r() * 8) * px); }
  } else {
    // Tuin: bomen en struiken in zachte vlekken.
    for (let laag = 0; laag < 3; laag++) {
      for (let i = 0; i < 26; i++) {
        const x = r() * W, y = H * (0.55 + laag * 0.12 + r() * 0.1), s = (18 + r() * 40 - laag * 6) * px;
        const groen = laag === 0 ? [120, 145, 110] : laag === 1 ? [92, 122, 78] : [70, 100, 60];
        const f = avond ? 0.45 : 1;
        g.fillStyle = `rgba(${groen[0]! * f + r() * 20},${groen[1]! * f + r() * 20},${groen[2]! * f},0.9)`;
        g.beginPath(); g.ellipse(x, y, s, s * 0.8, 0, 0, Math.PI * 2); g.fill();
      }
    }
    g.fillStyle = avond ? '#3e4a38' : '#9db07f';
    g.fillRect(0, H * 0.88, W, H * 0.12);
  }
}

/** Tapijt: effen, met strepen of met een rand, in een wolstructuur. */
function tekenTapijt(g: CanvasRenderingContext2D, px: number, B: number, D: number, kleur: string, rand: string | undefined, patroon: string, tint: (h: string, f: number) => string, rond: boolean) {
  const W = B * px, H = D * px;
  g.fillStyle = kleur;
  g.fillRect(0, 0, W, H);
  // Gemêleerde wol.
  let zaad = 3;
  const r = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < W * H / 40; i++) { g.fillStyle = tint(kleur, 0.88 + r() * 0.24); g.fillRect(r() * W, r() * H, px, px * 0.6); }
  if (patroon === 'streep') {
    g.fillStyle = rand ?? tint(kleur, 0.8);
    for (let y = 18; y < D - 10; y += 22) g.fillRect(0, y * px, W, 3 * px);
  }
  if (rand) {
    g.strokeStyle = rand;
    g.lineWidth = 6 * px;
    if (rond) { g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 12 * px, 0, Math.PI * 2); g.stroke(); }
    else { g.strokeRect(10 * px, 10 * px, W - 20 * px, H - 20 * px); g.lineWidth = 1.5 * px; g.strokeRect(20 * px, 20 * px, W - 40 * px, H - 40 * px); }
  }
}

/** Kunst: abstracte vormen, lijntekening, landschap of klassiek schilderij (donker, olieverf-achtig). */
function tekenKunst(g: CanvasRenderingContext2D, px: number, B: number, H: number, stijl: string, kleuren: string[]) {
  const W = B * px, Hh = H * px;
  const k = (i: number) => kleuren[i % kleuren.length]!;
  g.fillStyle = k(0);
  g.fillRect(0, 0, W, Hh);
  let zaad = 11;
  const r = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647);
  if (stijl === 'abstract') {
    g.globalAlpha = 0.9;
    g.fillStyle = k(1); g.beginPath(); g.ellipse(W * 0.38, Hh * 0.55, W * 0.24, Hh * 0.3, 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = k(2); g.beginPath(); g.arc(W * 0.66, Hh * 0.36, Hh * 0.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = k(3); g.fillRect(W * 0.55, Hh * 0.6, W * 0.28, Hh * 0.12);
    g.globalAlpha = 1;
  } else if (stijl === 'lijnen') {
    g.strokeStyle = k(1); g.lineWidth = 2.2 * px; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(W * 0.2, Hh * 0.75);
    g.bezierCurveTo(W * 0.3, Hh * 0.1, W * 0.55, Hh * 0.95, W * 0.62, Hh * 0.35);
    g.bezierCurveTo(W * 0.68, Hh * 0.05, W * 0.85, Hh * 0.4, W * 0.78, Hh * 0.7);
    g.stroke();
    g.fillStyle = k(2); g.beginPath(); g.arc(W * 0.7, Hh * 0.25, Hh * 0.08, 0, Math.PI * 2); g.fill();
  } else if (stijl === 'landschap') {
    for (let i = 0; i < 4; i++) {
      g.fillStyle = k(i + 1);
      g.beginPath(); g.moveTo(0, Hh * (0.45 + i * 0.13));
      for (let x = 0; x <= W; x += 6 * px) g.lineTo(x, Hh * (0.45 + i * 0.13 + 0.05 * Math.sin(x / (30 * px) + i * 2)));
      g.lineTo(W, Hh); g.lineTo(0, Hh); g.fill();
    }
  } else {
    // Klassiek: donker olieverflandschap met een lichtere hemel en penseelstreken.
    const lucht = g.createLinearGradient(0, 0, 0, Hh);
    lucht.addColorStop(0, k(1)); lucht.addColorStop(0.55, k(2)); lucht.addColorStop(1, k(0));
    g.fillStyle = lucht; g.fillRect(0, 0, W, Hh);
    g.fillStyle = k(3);
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(r() * W, Hh * (0.6 + r() * 0.15), (20 + r() * 40) * px, (12 + r() * 20) * px, 0, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,210'},0.05)`; g.fillRect(r() * W, r() * Hh, 4 * px, 1.2 * px); }
  }
  // Lichte doekstructuur.
  for (let i = 0; i < W * Hh / 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},0.035)`; g.fillRect(r() * W, r() * Hh, px, px); }
}

/** Steen voor tafelbladen: travertin (gaatjes en lagen), marmer (aders) of beton. */
function steenTex(h: DecorHulp, kleur: string, soort: 'travertin' | 'marmer' | 'beton') {
  const t = h.canvasTextuur(100, 100, 3, (g, px) => {
    const W = 100 * px;
    g.fillStyle = kleur; g.fillRect(0, 0, W, W);
    let zaad = 5;
    const r = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647);
    if (soort === 'travertin') {
      // Zachte, onregelmatige lagen (geen harde strepen) en kleine poriën.
      for (let y = 0; y < W; y += 5 * px) { g.globalAlpha = 0.35; g.fillStyle = h.tint(kleur, 0.94 + r() * 0.1); g.fillRect(0, y + r() * 3 * px, W, (1 + r() * 3) * px); }
      g.globalAlpha = 1;
      for (let i = 0; i < 260; i++) { g.fillStyle = h.tint(kleur, 0.82); g.beginPath(); g.ellipse(r() * W, r() * W, (0.6 + r() * 2.2) * px, (0.3 + r() * 0.7) * px, 0, 0, Math.PI * 2); g.fill(); }
    } else if (soort === 'marmer') {
      g.strokeStyle = 'rgba(120,118,115,0.45)';
      for (let i = 0; i < 9; i++) {
        g.lineWidth = (0.3 + r() * 1.2) * px;
        g.beginPath(); let x = r() * W, y = 0; g.moveTo(x, y);
        while (y < W) { x += (r() - 0.5) * 14 * px; y += (4 + r() * 6) * px; g.lineTo(x, y); }
        g.stroke();
      }
    } else {
      for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.04 + r() * 0.05})`; g.fillRect(r() * W, r() * W, 1.5 * px, 1.5 * px); }
    }
  });
  t.repeat.set(1, 1);
  return t;
}
