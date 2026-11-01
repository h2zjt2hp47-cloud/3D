/**
 * 3D-weergave van een vrij ontwerp met three.js (r128, geladen van cdnjs als globale THREE).
 * De motor levert de blokken (bouw3D); hier worden ze omgezet naar meshes.
 * Bediening: slepen = draaien, scrollen/knijpen = zoomen, knoppen = vaste standpunten.
 */
import type { Blok, Scene3D } from '../../core/src/index.js';

// three.js wordt als globale variabele geladen (zie index.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const THREE: any;

export interface Viewer3D {
  toon(scene: Scene3D): void;
  standpunt(naam: 'schuin' | 'voor' | 'boven' | 'zij'): void;
  formaat(): void;
}

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  houder.replaceChildren(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f2f1ed');
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b2a7, 0.62));
  const zon = new THREE.DirectionalLight(0xffffff, 0.85);
  zon.castShadow = true;
  zon.shadow.mapSize.set(2048, 2048);
  zon.shadow.bias = -0.0005;
  scene.add(zon, zon.target);
  const vul = new THREE.DirectionalLight(0xffffff, 0.25);
  scene.add(vul);
  const vloer = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 1 }));
  vloer.rotation.x = -Math.PI / 2;
  vloer.receiveShadow = true;
  scene.add(vloer);

  // Fijne weefselstructuur voor stof (kleur komt van het materiaal).
  const weefsel = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 2) {
      g.fillStyle = `rgba(0,0,0,${0.035 + Math.random() * 0.03})`;
      g.fillRect(0, i, 64, 1);
      g.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.03})`;
      g.fillRect(i, 0, 1, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(0.12, 0.12);
    return tex;
  })();

  const groep = new THREE.Group();
  scene.add(groep);
  const kleur = (hex: string) => new THREE.Color(hex).convertSRGBToLinear();
  const materialen = new Map<string, any>();
  // ---------- texturen voor bouwmaterialen (in cm via wereld-UV) ----------
  const STEEN = { b: 88, h: 60 }; // 4 stenen van 21 cm + voeg, 10 lagen van 5 cm + voeg
  const PLANK = { b: 48, h: 200 }; // 4 verticale planken van 12 cm
  function tint(hex: string, f: number) {
    const c = new THREE.Color(hex);
    return `#${c.multiplyScalar(f).getHexString()}`;
  }
  function baksteen(hex: string) {
    const px = 4, c = document.createElement('canvas');
    c.width = STEEN.b * px;
    c.height = STEEN.h * px;
    const g = c.getContext('2d')!;
    g.fillStyle = '#cfc8bb';
    g.fillRect(0, 0, c.width, c.height);
    for (let rij = 0; rij < 10; rij++) {
      const off = rij % 2 ? 11 : 0;
      for (let s = -1; s < 5; s++) {
        g.fillStyle = tint(hex, 0.82 + Math.random() * 0.3);
        g.fillRect((s * 22 + off) * px, (rij * 6) * px, 21 * px, 5 * px);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  function planken(hex: string) {
    const px = 2, c = document.createElement('canvas');
    c.width = PLANK.b * px;
    c.height = PLANK.h * px;
    const g = c.getContext('2d')!;
    for (let p = 0; p < 4; p++) {
      g.fillStyle = tint(hex, 0.85 + Math.random() * 0.25);
      g.fillRect(p * 12 * px, 0, 12 * px, c.height);
      for (let n = 0; n < 6; n++) {
        g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.05})`;
        g.fillRect((p * 12 + 1 + Math.random() * 10) * px, 0, 1, c.height);
      }
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect((p * 12 + 11.6) * px, 0, 0.8 * px, c.height);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  /** UV in wereldmaat (cm) per vlak, zodat stenen en planken hun echte maat houden. */
  function wereldUV(geo: any, bx: number, by: number) {
    const p = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
      let u: number, v: number;
      if (ny >= nx && ny >= nz) { u = p.getX(i); v = p.getZ(i); }
      else if (nx >= nz) { u = p.getZ(i); v = p.getY(i); }
      else { u = p.getX(i); v = p.getY(i); }
      uv.setXY(i, u / bx, v / by);
    }
    uv.needsUpdate = true;
  }

  const materiaal = (b: Blok) => {
    const sleutel = `${b.soort}:${b.kleur}`;
    let m = materialen.get(sleutel);
    if (!m) {
      if (b.soort === 'metaal') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), metalness: 0.85, roughness: 0.3 });
      else if (b.soort === 'hout') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.55 });
      else if (b.soort === 'planken') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, map: planken(b.kleur) });
      else if (b.soort === 'steen') m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, map: baksteen(b.kleur) });
      else if (b.soort === 'glas') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.15, depthWrite: false });
      else if (b.soort === 'dak') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.85 });
      else if (b.soort === 'gevel') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.97 });
      else if (b.soort === 'donker') m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.9 });
      else m = new THREE.MeshStandardMaterial({ color: kleur(b.kleur), roughness: 0.95, map: weefsel });
      materialen.set(sleutel, m);
    }
    return m;
  };

  /** Afgeronde balk: afgerond grondvlak (b × d), geëxtrudeerd in de hoogte met afgeschuinde randen. */
  function afgerondeBalk(b: number, h: number, d: number, r: number) {
    const rr = Math.max(0.1, Math.min(r, b / 2 - 0.05, d / 2 - 0.05, h / 2 - 0.05));
    const bevel = Math.min(rr * 0.6, h / 2 - 0.05);
    const w = b - 2 * bevel, l = d - 2 * bevel;
    const hoek = Math.max(0.05, Math.min(rr - bevel, w / 2, l / 2));
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + hoek, -l / 2);
    s.lineTo(w / 2 - hoek, -l / 2);
    s.quadraticCurveTo(w / 2, -l / 2, w / 2, -l / 2 + hoek);
    s.lineTo(w / 2, l / 2 - hoek);
    s.quadraticCurveTo(w / 2, l / 2, w / 2 - hoek, l / 2);
    s.lineTo(-w / 2 + hoek, l / 2);
    s.quadraticCurveTo(-w / 2, l / 2, -w / 2, l / 2 - hoek);
    s.lineTo(-w / 2, -l / 2 + hoek);
    s.quadraticCurveTo(-w / 2, -l / 2, -w / 2 + hoek, -l / 2);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(0.05, h - 2 * bevel), bevelEnabled: bevel > 0.05, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 6,
    });
    geo.rotateX(-Math.PI / 2); // extrusie naar boven
    geo.translate(0, bevel, 0);
    return geo;
  }

  function mesh(b: Blok) {
    let geo: any;
    const cx = b.x + b.b / 2, cz = b.z + b.d / 2;
    let y = b.y;
    switch (b.vorm) {
      case 'kegel':
      case 'cilinder': {
        if (b.as === 'z' || b.as === 'x') {
          const r = (b.as === 'z' ? Math.min(b.b, b.h) : Math.min(b.d, b.h)) / 2;
          geo = new THREE.CylinderGeometry(r, r, b.as === 'z' ? b.d : b.b, 28);
          geo.rotateX(b.as === 'z' ? Math.PI / 2 : 0);
          if (b.as === 'x') geo.rotateZ(Math.PI / 2);
          y = b.y + r;
        } else {
          const r = Math.min(b.b, b.d) / 2;
          geo = new THREE.CylinderGeometry(r, r * (b.taps ?? 1), b.h, 20);
          y = b.y + b.h / 2;
        }
        break;
      }
      case 'bol':
        geo = new THREE.SphereGeometry(Math.min(b.b, b.h) / 2, 12, 8);
        y = b.y + b.h / 2;
        break;
      default:
        geo = b.afronding ? afgerondeBalk(b.b, b.h, b.d, b.afronding) : new THREE.BoxGeometry(b.b, b.h, b.d).translate(0, b.h / 2, 0);
        if (!b.afronding && b.soort === 'steen') wereldUV(geo, STEEN.b, STEEN.h);
        if (!b.afronding && b.soort === 'planken') wereldUV(geo, PLANK.b, PLANK.h);
    }
    const m = new THREE.Mesh(geo, materiaal(b));
    m.position.set(cx, y, cz);
    if (b.kantel) {
      // Achterover hellen rond de onderkant: de bovenkant gaat naar de achterkant.
      const a = (b.kantel.graden * Math.PI) / 180;
      if (b.kantel.richting === 'z-') m.rotation.x = -a;
      if (b.kantel.richting === 'z+') m.rotation.x = a;
      if (b.kantel.richting === 'x+') m.rotation.z = -a;
      if (b.kantel.richting === 'x-') m.rotation.z = a;
    }
    m.castShadow = b.vorm !== 'bol' && b.soort !== 'glas';
    m.receiveShadow = true;
    return m;
  }

  // ---------- camera (eenvoudige orbit) ----------
  let doel = new THREE.Vector3(115, 35, 50);
  let afstand = 420, hoekH = -0.6, hoekV = 0.42;
  const plaatsCamera = () => {
    hoekV = Math.min(1.45, Math.max(0.05, hoekV));
    camera.position.set(
      doel.x + afstand * Math.cos(hoekV) * Math.sin(hoekH),
      doel.y + afstand * Math.sin(hoekV),
      doel.z + afstand * Math.cos(hoekV) * Math.cos(hoekH),
    );
    camera.lookAt(doel);
    render();
  };
  let vorige: { x: number; y: number } | null = null;
  const aanwijzers = new Map<number, { x: number; y: number }>();
  let knijpAfstand = 0;
  renderer.domElement.addEventListener('pointerdown', (ev: PointerEvent) => {
    renderer.domElement.setPointerCapture(ev.pointerId);
    aanwijzers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    vorige = { x: ev.clientX, y: ev.clientY };
  });
  renderer.domElement.addEventListener('pointermove', (ev: PointerEvent) => {
    if (!aanwijzers.has(ev.pointerId)) return;
    aanwijzers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (aanwijzers.size === 2) {
      const [a, b] = [...aanwijzers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (knijpAfstand) afstand = Math.min(2500, Math.max(120, afstand * (knijpAfstand / d)));
      knijpAfstand = d;
      plaatsCamera();
      return;
    }
    if (!vorige) return;
    hoekH -= (ev.clientX - vorige.x) * 0.008;
    hoekV += (ev.clientY - vorige.y) * 0.006;
    vorige = { x: ev.clientX, y: ev.clientY };
    plaatsCamera();
  });
  const los = (ev: PointerEvent) => {
    aanwijzers.delete(ev.pointerId);
    knijpAfstand = 0;
    vorige = null;
  };
  renderer.domElement.addEventListener('pointerup', los);
  renderer.domElement.addEventListener('pointercancel', los);
  renderer.domElement.addEventListener('wheel', (ev: WheelEvent) => {
    ev.preventDefault();
    afstand = Math.min(2500, Math.max(120, afstand * (1 + Math.sign(ev.deltaY) * 0.1)));
    plaatsCamera();
  }, { passive: false });

  function render() {
    renderer.render(scene, camera);
  }

  let kader = { x: 0, z: 0, b: 230, d: 95, h: 80 };
  const viewer: Viewer3D = {
    toon(s: Scene3D) {
      for (const c of [...groep.children]) {
        groep.remove(c);
        c.geometry.dispose();
      }
      for (const b of s.blokken) groep.add(mesh(b));
      const nieuw = s.kader;
      const veranderd = Math.abs(nieuw.b - kader.b) > 1 || Math.abs(nieuw.d - kader.d) > 1 || Math.abs(nieuw.x - kader.x) > 1 || Math.abs(nieuw.z - kader.z) > 1;
      kader = nieuw;
      doel = new THREE.Vector3(kader.x + kader.b / 2, Math.min(Math.max(40, kader.h * 0.35), kader.h / 2), kader.z + kader.d / 2);
      const grootte = Math.max(kader.b, kader.d, 120);
      zon.position.set(doel.x - grootte * 0.6, grootte * 1.6, doel.z + grootte * 1.1);
      zon.target.position.copy(doel);
      const sc = zon.shadow.camera;
      sc.left = sc.bottom = -grootte;
      sc.right = sc.top = grootte;
      sc.near = 1;
      sc.far = grootte * 5;
      sc.updateProjectionMatrix();
      vul.position.set(doel.x + grootte, grootte * 0.6, doel.z - grootte);
      if (veranderd) afstand = Math.max(200, grootte * 1.5);
      plaatsCamera();
    },
    standpunt(naam) {
      if (naam === 'voor') { hoekH = 0; hoekV = 0.12; }
      if (naam === 'boven') { hoekH = 0; hoekV = 1.45; }
      if (naam === 'zij') { hoekH = Math.PI / 2; hoekV = 0.15; }
      if (naam === 'schuin') { hoekH = -0.6; hoekV = 0.42; }
      afstand = Math.max(200, Math.max(kader.b, kader.d, 120) * 1.5);
      plaatsCamera();
    },
    formaat() {
      const b = houder.clientWidth || 600;
      const h = Math.round(b * 0.62);
      renderer.setSize(b, h);
      camera.aspect = b / h;
      camera.updateProjectionMatrix();
      render();
    },
  };
  new ResizeObserver(() => viewer.formaat()).observe(houder);
  viewer.formaat();
  return viewer;
}
