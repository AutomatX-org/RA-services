import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('hero-canvas');
const hero   = document.getElementById('home');
if (!canvas || !hero) throw new Error('hero canvas not found');

// ── Renderer ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(hero.clientWidth, hero.clientHeight);
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace   = THREE.SRGBColorSpace;
renderer.shadowMap.enabled  = true;
renderer.shadowMap.type     = THREE.PCFSoftShadowMap;

// ── Scene / Camera ────────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, hero.clientWidth / hero.clientHeight, 0.1, 60);
camera.position.set(0, 0, 7);

// ── Environment map (RoomEnvironment gives realistic HDR reflections) ─────────
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
scene.environment    = envMap;
scene.environmentIntensity = 0.6;
pmrem.dispose();

// ── Lighting ──────────────────────────────────────────────────────────────────
// Warm key — top right front
const key = new THREE.DirectionalLight(0xd4fff0, 3.5);
key.position.set(6, 9, 7);
key.castShadow = true;
key.shadow.mapSize.setScalar(1024);
scene.add(key);

// Cool fill — left
const fill = new THREE.DirectionalLight(0xc8c0ff, 1.2);
fill.position.set(-7, -2, 4);
scene.add(fill);

// Rim — behind
const rim = new THREE.DirectionalLight(0xa7f3d0, 1.8);
rim.position.set(-2, 4, -9);
scene.add(rim);

// Specular accent points
const specLights = [
  { color: 0xd4fff0, intensity: 12, dist: 14, pos: [ 4,  7,  5] },
  { color: 0xb0a0ff, intensity:  7, dist: 12, pos: [-5, -4,  4] },
  { color: 0x6ee7b7, intensity:  9, dist: 14, pos: [-4,  6, -4] },
  { color: 0xffffff, intensity:  5, dist: 10, pos: [ 0, -7,  5] },
  { color: 0x34d399, intensity:  6, dist: 10, pos: [ 6, -2, -3] },
];
specLights.forEach(({ color, intensity, dist, pos }) => {
  const pl = new THREE.PointLight(color, intensity, dist);
  pl.position.set(...pos);
  scene.add(pl);
});

scene.add(new THREE.AmbientLight(0x0a0818, 1.5));

// ── Materials ─────────────────────────────────────────────────────────────────
const goldMat = new THREE.MeshPhysicalMaterial({
  color:               0x0a9e6e,
  metalness:           1.0,
  roughness:           0.08,
  clearcoat:           1.0,
  clearcoatRoughness:  0.04,
  envMapIntensity:     2.5,
  reflectivity:        1.0,
});

const chromeMat = new THREE.MeshPhysicalMaterial({
  color:           0x888899,
  metalness:       1.0,
  roughness:       0.04,
  envMapIntensity: 3.0,
});

const glassMat = new THREE.MeshPhysicalMaterial({
  color:              0xffffff,
  metalness:          0.0,
  roughness:          0.0,
  transmission:       1.0,
  thickness:          1.2,
  ior:                1.55,
  envMapIntensity:    2.0,
  transparent:        true,
});

const darkGoldMat = new THREE.MeshPhysicalMaterial({
  color:           0x065f46,
  metalness:       1.0,
  roughness:       0.2,
  envMapIntensity: 2.0,
});

// ── Central sphere ────────────────────────────────────────────────────────────
const mainSphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.45, 128, 128),
  goldMat
);
mainSphere.castShadow    = true;
mainSphere.receiveShadow = true;
scene.add(mainSphere);

// Barely-visible latitude / longitude grid etched into surface
const gridLines = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.SphereGeometry(1.46, 24, 24)),
  new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 })
);
scene.add(gridLines);

// ── Floating accent spheres ───────────────────────────────────────────────────
const accentDefs = [
  { mat: chromeMat,  r: 0.22, offset: 0,           orbitR: 2.7, orbitY: 0.5,  speed: 0.28 },
  { mat: glassMat,   r: 0.18, offset: Math.PI*0.66, orbitR: 2.4, orbitY: -0.6, speed: 0.38 },
  { mat: darkGoldMat,r: 0.15, offset: Math.PI*1.33, orbitR: 2.9, orbitY: 0.2,  speed: 0.22 },
  { mat: chromeMat,  r: 0.11, offset: Math.PI*0.4,  orbitR: 2.2, orbitY: -1.0, speed: 0.50 },
];

const accents = accentDefs.map(def => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(def.r, 32, 32), def.mat);
  mesh.castShadow = true;
  scene.add(mesh);
  return { mesh, ...def };
});

// ── Dust particles ────────────────────────────────────────────────────────────
const DUST = 400;
const dustPos = new Float32Array(DUST * 3);
for (let i = 0; i < DUST; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi   = Math.acos(2 * Math.random() - 1);
  const r     = 2.2 + Math.random() * 3.5;
  dustPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
  dustPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
  dustPos[i*3+2] = r * Math.cos(phi);
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: 0x34d399, size: 0.018, transparent: true, opacity: 0.55,
  sizeAttenuation: true,
})));

// ── Mouse tracking ────────────────────────────────────────────────────────────
let tgtX = 0, tgtY = 0, smX = 0, smY = 0;
document.addEventListener('mousemove', e => {
  if (e.clientY > hero.getBoundingClientRect().bottom) return;
  tgtX = (e.clientX / window.innerWidth  - 0.5) * 2;
  tgtY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = hero.clientWidth / hero.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(hero.clientWidth, hero.clientHeight);
});

// ── Animate ───────────────────────────────────────────────────────────────────
let clock = 0, lastT = 0;

(function animate(t) {
  requestAnimationFrame(animate);
  const dt = Math.min((t - lastT) / 1000, 0.05);
  lastT = t;
  clock += dt;

  smX += (tgtX - smX) * 0.025;
  smY += (tgtY - smY) * 0.025;

  // Sphere: slow majestic y-rotation + mouse-driven tilt
  mainSphere.rotation.y  = clock * 0.08;
  mainSphere.rotation.x  = smY * 0.15;
  gridLines.rotation.copy(mainSphere.rotation);

  // Camera drift with mouse for subtle parallax
  camera.position.x += (smX * 0.6 - camera.position.x) * 0.04;
  camera.position.y += (-smY * 0.4 - camera.position.y) * 0.04;
  camera.lookAt(0, 0, 0);

  // Orbit accents
  accents.forEach(({ mesh, offset, orbitR, orbitY, speed }) => {
    const a = clock * speed + offset;
    mesh.position.set(
      Math.cos(a) * orbitR,
      orbitY + Math.sin(clock * speed * 0.4 + offset) * 0.3,
      Math.sin(a) * orbitR * 0.55
    );
    mesh.rotation.y = clock * 0.6;
  });

  // Pulse key light intensity for breathing life
  key.intensity = 3.5 + Math.sin(clock * 0.9) * 0.4;

  renderer.render(scene, camera);
})(0);
