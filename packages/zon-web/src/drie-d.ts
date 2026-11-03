/**
 * 3D van de woning met zonnepanelen (three.js r128, globaal geladen van cdnjs).
 * Gebouwen, daken, obstakels en panelen worden opgebouwd uit de dakvlakken van de rekenmodule.
 * Bediening: slepen = draaien, Ctrl/⌘ + wiel of knijpen = zoomen, knoppen = vaste standpunten.
 */
import { alleDakvlakken, instellingVan, paneelHoeken, vlakPunt, type Dakvlak, type Punt, type ZonProject, type ZonResultaat } from '../../core/src/zon.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const THREE: any;

export interface Viewer3D {
  toon(project: ZonProject, r: ZonResultaat): void;
  standpunt(naam: 'schuin' | 'boven' | 'zon'): void;
  zoom(f: number): void;
}

const DAKKLEUR = { pannen: '#9a5543', leien: '#3e444b', golfplaat: '#9ea3a6', plat: '#55585b' } as const;

export function maak3D(houder: HTMLElement): Viewer3D | null {
  if (typeof THREE === 'undefined') {
    houder.textContent = '3D kon niet geladen worden (geen verbinding met de 3D-bibliotheek).';
    return null;
  }
  let renderer: any;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  } catch {
    houder.textContent = '3D wordt niet ondersteund in deze browser (WebGL ontbreekt).';
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  houder.replaceChildren(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.setAttribute('aria-label', '3D-weergave van de woning met zonnepanelen');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfe8ee');
  const camera = new THREE.PerspectiveCamera(35, 1, 10, 20000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9488, 0.65));
  const zon = new THREE.DirectionalLight(0xfff4e0, 0.9);
  zon.castShadow = true;
  zon.shadow.mapSize.set(2048, 2048);
  zon.shadow.bias = -0.0004;
  Object.assign(zon.shadow.camera, { left: -2500, right: 2500, top: 2500, bottom: -2500, near: 10, far: 8000 });
  scene.add(zon, zon.target);
  const gras = new THREE.Mesh(new THREE.CircleGeometry(4000, 64), new THREE.MeshStandardMaterial({ color: 0x9db58a, roughness: 1 }));
  gras.rotation.x = -Math.PI / 2;
  gras.receiveShadow = true;
  scene.add(gras);

  let groep = new THREE.Group();
  scene.add(groep);
  const doel = new THREE.Vector3(0, 300, 0);
  let afstand = 2600, draai = 0.5, hoogte = 0.55, basis = 2600; // draai rond de y-as, hoogte = kijkhoek
  let orient = 0;

  const mat = (kleur: string, extra: Record<string, unknown> = {}) => new THREE.MeshStandardMaterial({ color: kleur, roughness: 0.85, side: THREE.DoubleSide, ...extra });
  const v3 = (q: Punt) => new THREE.Vector3(q.x, q.y, q.z);

  /** Vlak uit punten (driehoek of vierhoek, convex). */
  function veelhoek(punten: Punt[], materiaal: any) {
    const pos: number[] = [];
    for (let i = 1; i < punten.length - 1; i++) for (const q of [punten[0]!, punten[i]!, punten[i + 1]!]) pos.push(q.x, q.y, q.z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, materiaal);
    m.castShadow = true;
    m.receiveShadow = true;
    groep.add(m);
    return m;
  }
  /** Blok uit 4 onderste en 4 bovenste hoekpunten. */
  function blokUit(onder: Punt[], boven: Punt[], materiaal: any) {
    veelhoek(boven, materiaal);
    veelhoek([...onder].reverse(), materiaal);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      veelhoek([onder[i]!, onder[j]!, boven[j]!, boven[i]!], materiaal);
    }
  }
  function doos(x: number, y: number, z: number, b: number, h: number, d: number, kleur: string) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), mat(kleur));
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    groep.add(m);
  }
  const plus = (a: Punt, b: Punt, f = 1): Punt => ({ x: a.x + b.x * f, y: a.y + b.y * f, z: a.z + b.z * f });

  function dak(v: Dakvlak, kleur: string) {
    const o = 25; // overstek
    veelhoek([vlakPunt(v, -o, -o), vlakPunt(v, v.breedte + o, -o), vlakPunt(v, v.breedte + o, v.lengte), vlakPunt(v, -o, v.lengte)], mat(kleur, { roughness: 0.95 }));
  }

  function bouw(project: ZonProject, r: ZonResultaat) {
    scene.remove(groep);
    groep.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    groep = new THREE.Group();
    scene.add(groep);
    orient = project.orientatie;
    const vlakken = alleDakvlakken(project);
    let maxX = 0, maxY = 0;
    for (const g of project.gebouwen) {
      const muur = g.id === project.gebouwen[0]?.id ? '#e4dccf' : '#d9d5cc';
      const W = g.breedte, D = g.diepte, G = g.goothoogte;
      doos(g.x, 0, g.z, W, G, D, muur);
      const eigen = vlakken.filter((v) => v.gebouw === g.id);
      const s = Math.tan((g.helling * Math.PI) / 180);
      if (g.dakvorm === 'zadel') {
        const nok = G + (D / 2) * s;
        for (const zx of [-1, 1]) veelhoek([{ x: g.x + (zx * W) / 2, y: G, z: g.z + D / 2 }, { x: g.x + (zx * W) / 2, y: G, z: g.z - D / 2 }, { x: g.x + (zx * W) / 2, y: nok, z: g.z }], mat(muur));
        maxY = Math.max(maxY, nok);
      } else if (g.dakvorm === 'lessenaar') {
        const top = G + D * s;
        for (const zx of [-1, 1]) veelhoek([{ x: g.x + (zx * W) / 2, y: G, z: g.z + D / 2 }, { x: g.x + (zx * W) / 2, y: G, z: g.z - D / 2 }, { x: g.x + (zx * W) / 2, y: top, z: g.z - D / 2 }], mat(muur));
        veelhoek([{ x: g.x - W / 2, y: G, z: g.z - D / 2 }, { x: g.x + W / 2, y: G, z: g.z - D / 2 }, { x: g.x + W / 2, y: top, z: g.z - D / 2 }, { x: g.x - W / 2, y: top, z: g.z - D / 2 }], mat(muur));
        maxY = Math.max(maxY, top);
      } else {
        doos(g.x, G, g.z + D / 2 - 10, W, 25, 20, '#8b8d8f');
        doos(g.x, G, g.z - D / 2 + 10, W, 25, 20, '#8b8d8f');
        doos(g.x - W / 2 + 10, G, g.z, 20, 25, D, '#8b8d8f');
        doos(g.x + W / 2 - 10, G, g.z, 20, 25, D, '#8b8d8f');
        maxY = Math.max(maxY, G);
      }
      for (const v of eigen) {
        const inst = instellingVan(project, v);
        if (v.zijde === 'plat') veelhoek([vlakPunt(v, 0, 0, 1), vlakPunt(v, v.breedte, 0, 1), vlakPunt(v, v.breedte, v.lengte, 1), vlakPunt(v, 0, v.lengte, 1)], mat(DAKKLEUR.plat));
        else dak(v, DAKKLEUR[inst.bedekking]);
        // Obstakels.
        for (const ob of inst.obstakels) {
          const onder = [vlakPunt(v, ob.x, ob.y), vlakPunt(v, ob.x + ob.b, ob.y), vlakPunt(v, ob.x + ob.b, ob.y + ob.h), vlakPunt(v, ob.x, ob.y + ob.h)];
          if (ob.soort === 'schoorsteen' || ob.soort === 'verluchting') {
            const top = Math.max(...onder.map((q) => q.y)) + (ob.soort === 'schoorsteen' ? 90 : 40);
            const vloer = onder.map((q) => plus(q, v.n, -40));
            blokUit(vloer, onder.map((q) => ({ ...q, y: top })), mat(ob.soort === 'schoorsteen' ? '#8a5a45' : '#6d7175'));
          } else if (ob.soort === 'dakkapel') {
            const top = Math.max(...onder.map((q) => q.y)) + 30;
            blokUit(onder, onder.map((q) => ({ ...q, y: top })), mat('#d9d4ca'));
          } else {
            blokUit(onder.map((q) => plus(q, v.n, 1)), onder.map((q) => plus(q, v.n, 6)), mat('#a9c7d8', { metalness: 0.2, roughness: 0.25 }));
          }
        }
        maxX = Math.max(maxX, Math.abs(g.x) + W / 2);
      }
    }

    // Panelen: donker glas met een dun kader en een staander op een plat dak.
    const glas = new THREE.MeshStandardMaterial({ color: 0x18222e, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide });
    const kader = new THREE.LineBasicMaterial({ color: 0x0a0d10 });
    for (const l of r.legplan) {
      for (const x of l.panelen) {
        if (!x.actief) continue;
        const h = paneelHoeken(l.vlak, x);
        veelhoek(h, glas).castShadow = true;
        const lijn = new THREE.BufferGeometry().setFromPoints([...h, h[0]!].map(v3));
        groep.add(new THREE.Line(lijn, kader));
        if (x.richting) {
          // Steun onder de hoge rand.
          const hoog = [...h].sort((a, b) => b.y - a.y).slice(0, 2);
          for (const q of hoog) doos(q.x, l.vlak.oorsprong.y, q.z, 4, q.y - l.vlak.oorsprong.y, 4, '#9aa0a5');
        }
      }
    }

    // Buren uit de kaart: grijze blokken met hun echte contour en hoogte (werpen ook schaduw).
    const buurMat = new THREE.MeshStandardMaterial({ color: 0xa9a7a1, roughness: 1, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    for (const b of project.omgeving ?? []) {
      if ('ring' in b) {
        if (b.ring.length < 3) continue;
        const vorm = new THREE.Shape(b.ring.map(([x, z]) => new THREE.Vector2(x, -z)));
        const geo = new THREE.ExtrudeGeometry(vorm, { depth: b.hoogte, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(geo, buurMat);
        m.castShadow = true;
        m.renderOrder = 2;
        groep.add(m);
        continue;
      }
      // Volume met dak: vlakken in de assen van het blok, dan gedraaid en verplaatst.
      const c = Math.cos(b.draai), sn = Math.sin(b.draai);
      const w = (x: number, y: number, z: number): Punt => ({ x: b.x + x * c + z * sn, y, z: b.z - x * sn + z * c });
      const B = b.breedte / 2, D = b.diepte / 2, G = b.goot, N = Math.max(b.goot, b.nok);
      const vlakken: [number, number, number][][] = [];
      if (b.dakvorm === 'zadel') {
        vlakken.push(
          [[-B, 0, D], [B, 0, D], [B, G, D], [-B, G, D]], [[B, 0, -D], [-B, 0, -D], [-B, G, -D], [B, G, -D]],
          [[-B, 0, -D], [-B, 0, D], [-B, G, D], [-B, N, 0], [-B, G, -D]], [[B, 0, D], [B, 0, -D], [B, G, -D], [B, N, 0], [B, G, D]],
          [[-B, G, D], [B, G, D], [B, N, 0], [-B, N, 0]], [[B, G, -D], [-B, G, -D], [-B, N, 0], [B, N, 0]],
        );
      } else if (b.dakvorm === 'lessenaar') {
        vlakken.push(
          [[-B, 0, D], [B, 0, D], [B, G, D], [-B, G, D]], [[B, 0, -D], [-B, 0, -D], [-B, N, -D], [B, N, -D]],
          [[-B, 0, -D], [-B, 0, D], [-B, G, D], [-B, N, -D]], [[B, 0, D], [B, 0, -D], [B, N, -D], [B, G, D]],
          [[-B, G, D], [B, G, D], [B, N, -D], [-B, N, -D]],
        );
      } else {
        vlakken.push(
          [[-B, 0, D], [B, 0, D], [B, G, D], [-B, G, D]], [[B, 0, -D], [-B, 0, -D], [-B, G, -D], [B, G, -D]],
          [[-B, 0, -D], [-B, 0, D], [-B, G, D], [-B, G, -D]], [[B, 0, D], [B, 0, -D], [B, G, -D], [B, G, D]],
          [[-B, G, D], [B, G, D], [B, G, -D], [-B, G, -D]],
        );
      }
      for (const v of vlakken) veelhoek(v.map(([x, y, z]) => w(x, y, z)), buurMat).renderOrder = 2;
    }

    // Luchtfoto als ondergrond (als die er is en geladen kan worden), anders gras.
    gras.visible = true;
    if (project.luchtfoto) {
      const f = project.luchtfoto;
      const vlak = new THREE.Mesh(new THREE.PlaneGeometry(f.grootte, f.grootte).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
      vlak.rotation.y = f.draai;
      vlak.position.y = 1;
      vlak.receiveShadow = true;
      vlak.visible = false;
      groep.add(vlak);
      // De kaartdienst antwoordt soms even niet (503): nog één keer proberen, kleiner. Lukt het niet, dan blijft het gras.
      const laad = (url: string, opnieuw: boolean) => new THREE.TextureLoader().load(url, (tex: any) => {
        tex.encoding = THREE.sRGBEncoding;
        vlak.material.map = tex;
        vlak.material.needsUpdate = true;
        vlak.visible = true;
        camera_();
      }, undefined, () => { if (opnieuw) setTimeout(() => laad(url.replace(/WIDTH=\d+&HEIGHT=\d+/, 'WIDTH=640&HEIGHT=640'), false), 1500); });
      laad(f.url, true);
    }

    // Windroos op het gras.
    const ster = new THREE.Group();
    const buurHoogte = Math.max(0, ...(project.omgeving ?? []).map((b) => ('ring' in b ? b.hoogte : b.nok)));
    const R = Math.max(700, maxX + 300);
    // Met een luchtfoto is de ligging duidelijk; anders de windstreken op het gras.
    for (const [a, letter] of (project.luchtfoto ? [] : [[180, 'N'], [0, 'Z'], [-90, 'O'], [90, 'W']]) as [number, string][]) {
      const d = richtingVan(a);
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const x = c.getContext('2d')!;
      x.fillStyle = letter === 'Z' ? '#c9821b' : '#3b4650';
      x.font = 'bold 96px system-ui, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(letter, 64, 70);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false }));
      sprite.scale.set(140, 140, 1);
      sprite.position.set(d.x * R, buurHoogte ? buurHoogte + 200 : 70, d.z * R);
      ster.add(sprite);
    }
    groep.add(ster);

    // Zon: middag in het voorjaar (zuid, ±40° hoog).
    const zrichting = richtingVan(0);
    zon.position.set(zrichting.x * 3000, 2600, zrichting.z * 3000);
    zon.target.position.set(0, 0, 0);
    doel.set((Math.min(...project.gebouwen.map((g) => g.x - g.breedte / 2)) + Math.max(...project.gebouwen.map((g) => g.x + g.breedte / 2))) / 2, maxY * 0.45, 0);
    // Afstand van de camera volgens de grootte van de eigen gebouwen.
    const omvang = Math.max(...project.gebouwen.map((g) => Math.max(Math.abs(g.x) + g.breedte / 2, Math.abs(g.z) + g.diepte / 2))) * 2;
    const nieuw = Math.max(1600, Math.min(6000, omvang * 2.4 + maxY * 1.2));
    if (Math.abs(nieuw - basis) > 50) { afstand = afstand * (nieuw / basis); basis = nieuw; }
  }

  /** Richting in de wereld voor een azimut (0 = zuid). */
  function richtingVan(a: number) {
    const d = ((a - orient) * Math.PI) / 180;
    return { x: -Math.sin(d), z: Math.cos(d) };
  }

  function camera_() {
    camera.position.set(doel.x + afstand * Math.cos(hoogte) * Math.sin(draai), doel.y + afstand * Math.sin(hoogte), doel.z + afstand * Math.cos(hoogte) * Math.cos(draai));
    camera.lookAt(doel);
    renderer.render(scene, camera);
  }
  function formaat() {
    const b = houder.clientWidth || 600;
    const h = Math.round(Math.min(520, Math.max(260, b * 0.62)));
    renderer.setSize(b, h, false);
    renderer.domElement.style.width = `${b}px`;
    renderer.domElement.style.height = `${h}px`;
    camera.aspect = b / h;
    camera.updateProjectionMatrix();
    camera_();
  }

  // Bediening.
  const aanwijzers = new Map<number, { x: number; y: number }>();
  let knijp = 0;
  renderer.domElement.addEventListener('pointerdown', (e: PointerEvent) => {
    renderer.domElement.setPointerCapture(e.pointerId);
    aanwijzers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  renderer.domElement.addEventListener('pointermove', (e: PointerEvent) => {
    const vorig = aanwijzers.get(e.pointerId);
    if (!vorig) return;
    aanwijzers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (aanwijzers.size === 2) {
      const [a, b] = [...aanwijzers.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (knijp) afstand = Math.min(9000, Math.max(500, afstand * (knijp / d)));
      knijp = d;
    } else {
      draai -= (e.clientX - vorig.x) * 0.008;
      hoogte = Math.min(1.5, Math.max(0.05, hoogte + (e.clientY - vorig.y) * 0.006));
    }
    camera_();
  });
  const los = (e: PointerEvent) => { aanwijzers.delete(e.pointerId); knijp = 0; };
  renderer.domElement.addEventListener('pointerup', los);
  renderer.domElement.addEventListener('pointercancel', los);
  renderer.domElement.addEventListener('wheel', (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return; // gewoon wiel scrolt de pagina
    e.preventDefault();
    afstand = Math.min(9000, Math.max(500, afstand * (e.deltaY > 0 ? 1.1 : 0.9)));
    camera_();
  }, { passive: false });
  let gepland = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(gepland);
    gepland = requestAnimationFrame(formaat);
  }).observe(houder);

  let vorigeWoning = '';
  let beste = 0; // azimut van het dakvlak met de meeste panelen
  /** Schuin zicht vanaf de kant van het dakvlak met de meeste panelen, een beetje opzij. */
  function zetSchuin() {
    const d = richtingVan(beste);
    draai = Math.atan2(d.x, d.z) + 0.5;
    hoogte = 0.55;
    afstand = basis;
  }

  return {
    toon(project, r) {
      bouw(project, r);
      // Andere woning (gebouwen of ligging gewijzigd): kijk schuin vanaf de kant met de meeste panelen.
      const sleutel = JSON.stringify([project.orientatie, project.gebouwen]);
      if (sleutel !== vorigeWoning) {
        vorigeWoning = sleutel;
        const best = [...r.legplan].sort((a, b) => b.aantal - a.aantal)[0];
        beste = best && best.aantal > 0 ? (best.vlak.zijde === 'plat' ? 0 : best.vlak.azimut) : project.orientatie;
        zetSchuin();
      }
      formaat();
    },
    standpunt(naam) {
      // Draai 0 = recht op de voorgevel.
      if (naam === 'schuin') zetSchuin();
      if (naam === 'boven') { draai = 0; hoogte = 1.5; afstand = basis * 1.1; }
      if (naam === 'zon') {
        const z = richtingVan(0);
        draai = Math.atan2(z.x, z.z); hoogte = 0.6; afstand = basis;
      }
      camera_();
    },
    zoom(f) {
      afstand = Math.min(9000, Math.max(500, afstand * f));
      camera_();
    },
  };
}
