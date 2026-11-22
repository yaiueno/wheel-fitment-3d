import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

const INCH_MM = 25.4;
const SLOT_COLORS = [0x1d4ed8, 0xd97706, 0x059669];
const SLOT_HEX = ['#1d4ed8', '#d97706', '#059669'];
const SLOT_FILL = ['rgba(29, 78, 216, 0.14)', 'rgba(217, 119, 6, 0.14)', 'rgba(5, 150, 105, 0.14)'];

const PRESETS = {
  civic_fc1: [
    { label: '純正16', enabled: true, inch: 16, j: 7.0, et: 45, spacer: 0, width: 215, aspect: 55, camber: 0, design: 'spoke5', concave: 6, lipDepth: 14 },
    { label: '純正18', enabled: true, inch: 18, j: 8.0, et: 50, spacer: 0, width: 235, aspect: 40, camber: 0, design: 'spoke10', concave: 8, lipDepth: 16 },
    { label: '社外案', enabled: true, inch: 18, j: 8.5, et: 38, spacer: 0, width: 225, aspect: 40, camber: 1.0, design: 'spoke6', concave: 18, lipDepth: 24 }
  ],
  kei_standard: [
    { label: '純正14', enabled: true, inch: 14, j: 4.5, et: 45, spacer: 0, width: 155, aspect: 65, camber: 0, design: 'spoke5', concave: 4, lipDepth: 10 },
    { label: '純正15', enabled: true, inch: 15, j: 4.5, et: 45, spacer: 0, width: 165, aspect: 55, camber: 0, design: 'spoke10', concave: 4, lipDepth: 10 },
    { label: '社外15', enabled: true, inch: 15, j: 5.5, et: 42, spacer: 0, width: 165, aspect: 55, camber: 0, design: 'spoke6', concave: 10, lipDepth: 22 }
  ],
  prius_50: [
    { label: '純正15', enabled: true, inch: 15, j: 6.5, et: 40, spacer: 0, width: 195, aspect: 65, camber: 0, design: 'spoke5', concave: 5, lipDepth: 12 },
    { label: '純正17', enabled: true, inch: 17, j: 7.0, et: 50, spacer: 0, width: 215, aspect: 45, camber: 0, design: 'spoke10', concave: 8, lipDepth: 14 },
    { label: '社外18', enabled: true, inch: 18, j: 7.5, et: 42, spacer: 0, width: 215, aspect: 40, camber: 0.5, design: 'spoke6', concave: 14, lipDepth: 20 }
  ],
  '86_brz': [
    { label: '純正16', enabled: true, inch: 16, j: 6.5, et: 48, spacer: 0, width: 205, aspect: 55, camber: 0, design: 'spoke10', concave: 6, lipDepth: 14 },
    { label: '純正17', enabled: true, inch: 17, j: 7.5, et: 48, spacer: 0, width: 215, aspect: 45, camber: 0, design: 'spoke10', concave: 10, lipDepth: 16 },
    { label: '社外18', enabled: true, inch: 18, j: 8.5, et: 40, spacer: 0, width: 235, aspect: 40, camber: 1.5, design: 'spoke6', concave: 22, lipDepth: 24 }
  ],
  nd_roadster: [
    { label: '純正16', enabled: true, inch: 16, j: 6.5, et: 45, spacer: 0, width: 195, aspect: 50, camber: 0, design: 'spoke10', concave: 6, lipDepth: 14 },
    { label: 'ブレンボ枠', enabled: true, inch: 17, j: 7.0, et: 45, spacer: 0, width: 205, aspect: 45, camber: 0, design: 'spoke6', concave: 10, lipDepth: 16 },
    { label: '深リム案', enabled: true, inch: 16, j: 7.5, et: 32, spacer: 0, width: 205, aspect: 50, camber: 1.0, design: 'dish', concave: 14, lipDepth: 42 }
  ]
};

const state = {
  slots: [
    { label: 'Slot A', enabled: true, inch: 16, j: 7.0, et: 45, spacer: 0, width: 215, aspect: 55, camber: 0, design: 'spoke5', concave: 8, lipDepth: 18 },
    { label: 'Slot B', enabled: true, inch: 18, j: 8.0, et: 50, spacer: 0, width: 235, aspect: 40, camber: 0, design: 'spoke6', concave: 14, lipDepth: 20 },
    { label: 'Slot C', enabled: true, inch: 18, j: 8.5, et: 38, spacer: 0, width: 225, aspect: 40, camber: 0, design: 'spoke10', concave: 20, lipDepth: 26 }
  ],
  activeSlot: 0,
  baseSlot: 0,
  renderMode: '2d-front', // '2d-front' | '2d-side' | '3d'
  partMode: 'both', // 'both' | 'wheel' | 'tire'
  arrangeSideBySide: false,
  crossSection: false
};

const SHAFT_SPECS = {
  none: null,
  pin_2_0: { holeDiaMm: 2.0, bossLenMm: 5.0 },
  'pin_2.0': { holeDiaMm: 2.0, bossLenMm: 5.0 },
  'pin_2.5': { holeDiaMm: 2.5, bossLenMm: 5.5 },
  rc_hex12: { holeDiaMm: 4.0, bossLenMm: 7.5 },
  'minicar_0.85': { holeDiaMm: 0.85, bossLenMm: 3.5 }
};

function showError(msg) {
  const el = document.getElementById('errorBanner');
  if (el) {
    el.hidden = false;
    el.textContent = `描画エラー: ${msg}`;
  }
}

function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  ['s0', 's1', 's2'].forEach((key, idx) => {
    if (params.has(key)) {
      const parts = params.get(key).split(',');
      if (parts.length >= 7) {
        state.slots[idx] = {
          enabled: parts[0] === '1',
          inch: Number(parts[1]),
          j: Number(parts[2]),
          et: Number(parts[3]),
          spacer: Number(parts[4]),
          width: Number(parts[5]),
          aspect: Number(parts[6]),
          camber: Number(parts[7] || 0),
          label: parts[8] ? decodeURIComponent(parts[8]) : `Slot ${String.fromCharCode(65 + idx)}`,
          design: parts[9] || 'spoke5',
          concave: parts[10] !== undefined ? Number(parts[10]) : 10,
          lipDepth: parts[11] !== undefined ? Number(parts[11]) : 20
        };
      }
    }
  });
  if (params.has('base')) {
    const b = Number(params.get('base'));
    if (b >= 0 && b <= 2) state.baseSlot = b;
  }
}

function calcMetrics(spec) {
  const inch = Math.max(8, Number(spec.inch) || 16);
  const j = Math.max(3, Number(spec.j) || 7);
  const et = Number(spec.et) || 0;
  const spacer = Number(spec.spacer) || 0;
  const width = Math.max(100, Number(spec.width) || 205);
  const aspect = Math.max(15, Number(spec.aspect) || 55);

  const rimDia = inch * INCH_MM;
  const rimRad = rimDia / 2;
  const rimWidth = j * INCH_MM;
  const effEt = et - spacer;
  const centerX = -effEt;
  const outerRimX = centerX + rimWidth / 2;
  const innerRimX = centerX - rimWidth / 2;

  const sidewallH = width * (aspect / 100);
  const tireDia = rimDia + 2 * sidewallH;
  const tireRad = tireDia / 2;

  const stdRimWidth = width * 0.72;
  const actualSectionWidth = width + (rimWidth - stdRimWidth) * 0.4;
  const maxTireWidth = Math.max(actualSectionWidth, rimWidth + 6);
  const outerTireX = centerX + maxTireWidth / 2;
  const innerTireX = centerX - maxTireWidth / 2;
  const barrelInnerRad = Math.max(60, rimRad - 18);

  return {
    rimDia, rimRad, rimWidth, effEt, centerX,
    outerRimX, innerRimX,
    sidewallH, tireDia, tireRad,
    actualSectionWidth, outerTireX, innerTireX,
    barrelInnerRad
  };
}

// =========================
// 2D PRECISION DRAWING VIEW
// =========================
const canvas2d = document.getElementById('canvas2d');
const ctx2d = canvas2d.getContext('2d');

function draw2D() {
  if (state.renderMode === '3d') return;
  const wrap = document.getElementById('canvas2dWrap');
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  if (w <= 0 || h <= 0) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas2d.width = w * dpr;
  canvas2d.height = h * dpr;
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx2d.clearRect(0, 0, w, h);

  const showWheel = state.partMode === 'both' || state.partMode === 'wheel';
  const showTire = state.partMode === 'both' || state.partMode === 'tire';

  const metrics = state.slots.map(calcMetrics);
  const maxRad = Math.max(...metrics.map(m => m.tireRad), 340);
  const cy = h * 0.52;

  ctx2d.save();

  if (state.renderMode === '2d-front') {
    // Upper half only (Axle at bottom, Fender/Top upwards) for 2x larger clarity
    const cyAxis = h - 34;
    const scale = Math.min((h - 70) / (maxRad * 1.08), (w - 80) / 400);
    const cxCenter = w * 0.54; // X=0 Hub face

    // Grid (50mm intervals)
    ctx2d.strokeStyle = '#e2e8f0';
    ctx2d.lineWidth = 1;
    for (let mm = -300; mm <= 250; mm += 50) {
      const px = cxCenter + mm * scale;
      if (px < 20 || px > w - 20) continue;
      ctx2d.beginPath();
      ctx2d.moveTo(px, 28);
      ctx2d.lineTo(px, cyAxis);
      ctx2d.stroke();
    }

    // Hub Face Line (X = 0)
    ctx2d.strokeStyle = '#334155';
    ctx2d.lineWidth = 1.6;
    ctx2d.setLineDash([5, 4]);
    ctx2d.beginPath();
    ctx2d.moveTo(cxCenter, 28);
    ctx2d.lineTo(cxCenter, cyAxis);
    ctx2d.stroke();
    ctx2d.setLineDash([]);

    // Axle Horizontal Line at bottom
    ctx2d.strokeStyle = '#94a3b8';
    ctx2d.lineWidth = 1.5;
    ctx2d.beginPath();
    ctx2d.moveTo(20, cyAxis);
    ctx2d.lineTo(w - 20, cyAxis);
    ctx2d.stroke();

    // Labels
    ctx2d.fillStyle = '#475569';
    ctx2d.font = '600 12px sans-serif';
    ctx2d.textAlign = 'left';
    ctx2d.fillText('← 車体側 (ブレーキ / サス)', 16, 22);
    ctx2d.textAlign = 'right';
    ctx2d.fillText('フェンダー側 (外側) →', w - 16, 22);
    ctx2d.textAlign = 'center';
    ctx2d.fillStyle = '#0f172a';
    ctx2d.fillText('ハブ面 (0mm) / 車軸中心', cxCenter, h - 10);

    // Brake Rotor & Caliper Silhouette (-X, upper half)
    ctx2d.fillStyle = 'rgba(148, 163, 184, 0.30)';
    ctx2d.fillRect(cxCenter - 32 * scale, cyAxis - 145 * scale, 22 * scale, 145 * scale);
    ctx2d.fillStyle = 'rgba(220, 38, 38, 0.48)';
    ctx2d.fillRect(cxCenter - 42 * scale, cyAxis - 150 * scale, 34 * scale, 55 * scale);

    state.slots.forEach((s, idx) => {
      if (!s.enabled) return;
      const m = metrics[idx];
      const color = SLOT_HEX[idx];
      const fill = SLOT_FILL[idx];
      const isFocused = idx === state.activeSlot;
      const lw = isFocused ? 2.8 : 1.8;

      ctx2d.save();
      ctx2d.translate(cxCenter, cyAxis);
      ctx2d.rotate((-s.camber * Math.PI) / 180);

      if (showWheel) {
        const xIn = m.innerRimX * scale;
        const xOut = m.outerRimX * scale;
        const rIn = m.barrelInnerRad * scale;
        const rOut = m.rimRad * scale;

        ctx2d.strokeStyle = color;
        ctx2d.fillStyle = fill;
        ctx2d.lineWidth = lw;

        ctx2d.beginPath();
        ctx2d.rect(xIn, -rOut, xOut - xIn, rOut - rIn);
        ctx2d.fill();
        ctx2d.stroke();

        ctx2d.save();
        ctx2d.setLineDash([3, 3]);
        ctx2d.lineWidth = 1.2;
        ctx2d.beginPath();
        ctx2d.moveTo(xOut, -m.tireRad * scale - 10);
        ctx2d.lineTo(xOut, 0);
        ctx2d.stroke();
        ctx2d.restore();
      }

      if (showTire) {
        const cx = m.centerX * scale;
        const rimHalf = (m.rimWidth / 2) * scale;
        const bulgeHalf = (m.actualSectionWidth / 2) * scale;
        const treadHalf = ((m.actualSectionWidth * 0.86) / 2) * scale;
        const rBead = m.rimRad * scale;
        const rMid = (m.rimRad + m.sidewallH * 0.52) * scale;
        const rOut = m.tireRad * scale;

        ctx2d.strokeStyle = color;
        ctx2d.fillStyle = fill;
        ctx2d.lineWidth = lw;

        ctx2d.beginPath();
        ctx2d.moveTo(cx - rimHalf, -rBead);
        ctx2d.lineTo(cx - bulgeHalf, -rMid);
        ctx2d.lineTo(cx - treadHalf, -rOut);
        ctx2d.lineTo(cx + treadHalf, -rOut);
        ctx2d.lineTo(cx + bulgeHalf, -rMid);
        ctx2d.lineTo(cx + rimHalf, -rBead);
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.stroke();
      }
      ctx2d.restore();
    });
  } else if (state.renderMode === '2d-side') {
    const scale = Math.min((h - 76) / (maxRad * 2.15), (w - 80) / (maxRad * 2.15));
    const cxCenter = w * 0.5;

    ctx2d.fillStyle = '#0f172a';
    ctx2d.font = '600 12px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('真横ビュー — 外径・リム径・ブレーキ内径比較', cxCenter, 22);

    // Center crosshair
    ctx2d.strokeStyle = '#cbd5e1';
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    ctx2d.moveTo(cxCenter - maxRad * scale - 20, cy);
    ctx2d.lineTo(cxCenter + maxRad * scale + 20, cy);
    ctx2d.moveTo(cxCenter, cy - maxRad * scale - 20);
    ctx2d.lineTo(cxCenter, cy + maxRad * scale + 20);
    ctx2d.stroke();

    // Brake Rotor Circle
    ctx2d.strokeStyle = 'rgba(220, 38, 38, 0.5)';
    ctx2d.lineWidth = 1.6;
    ctx2d.setLineDash([4, 4]);
    ctx2d.beginPath();
    ctx2d.arc(cxCenter, cy, 145 * scale, 0, Math.PI * 2);
    ctx2d.stroke();
    ctx2d.setLineDash([]);

    state.slots.forEach((s, idx) => {
      if (!s.enabled) return;
      const m = metrics[idx];
      const color = SLOT_HEX[idx];
      const isFocused = idx === state.activeSlot;
      const lw = isFocused ? 3.0 : 1.8;

      ctx2d.strokeStyle = color;
      ctx2d.lineWidth = lw;
      if (showTire) {
        ctx2d.beginPath();
        ctx2d.arc(cxCenter, cy, m.tireRad * scale, 0, Math.PI * 2);
        ctx2d.stroke();
      }
      if (showWheel) {
        ctx2d.beginPath();
        ctx2d.arc(cxCenter, cy, m.rimRad * scale, 0, Math.PI * 2);
        ctx2d.stroke();

        ctx2d.save();
        ctx2d.setLineDash([5, 3]);
        ctx2d.lineWidth = 1.3;
        ctx2d.beginPath();
        ctx2d.arc(cxCenter, cy, m.barrelInnerRad * scale, 0, Math.PI * 2);
        ctx2d.stroke();
        ctx2d.restore();
      }
    });
  }

  ctx2d.restore();
}

// =========================
// 3D THREE.JS VIEW
// =========================
const container3d = document.getElementById('canvasContainer');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 10, 5000);
camera.position.set(660, 310, 740);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container3d.appendChild(renderer.domElement);
} catch (err) {
  showError(err.message);
}

const controls = new OrbitControls(camera, renderer ? renderer.domElement : container3d);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

scene.add(new THREE.AmbientLight(0xffffff, 1.1));
const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight1.position.set(500, 800, 600);
scene.add(dirLight1);
const dirLight2 = new THREE.DirectionalLight(0xe0f2fe, 0.7);
dirLight2.position.set(-600, -300, -400);
scene.add(dirLight2);

const refGroup = new THREE.Group();
const hubPlaneGeo = new THREE.RingGeometry(34, 140, 48);
hubPlaneGeo.rotateY(Math.PI / 2);
refGroup.add(new THREE.Mesh(
  hubPlaneGeo,
  new THREE.MeshBasicMaterial({ color: 0x334155, opacity: 0.14, transparent: true, side: THREE.DoubleSide })
));

const rotorGeo = new THREE.CylinderGeometry(145, 145, 22, 40);
rotorGeo.rotateZ(Math.PI / 2);
const rotorMesh = new THREE.Mesh(
  rotorGeo,
  new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.55 })
);
rotorMesh.position.x = -24;
refGroup.add(rotorMesh);

const caliperGeo = new THREE.BoxGeometry(46, 110, 65);
const caliperMesh = new THREE.Mesh(
  caliperGeo,
  new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5, transparent: true, opacity: 0.65 })
);
caliperMesh.position.set(-28, 125, -50);
refGroup.add(caliperMesh);

const gridHelper = new THREE.GridHelper(1100, 22, 0x94a3b8, 0xcbd5e1);
gridHelper.position.y = -360;
refGroup.add(gridHelper);
scene.add(refGroup);

const slotGroups = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
slotGroups.forEach(g => scene.add(g));

function clearGroup(group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material.dispose();
    }
    group.remove(child);
  }
}

function addCrispRing(group, radius, xPos, color, tubeRadius, crossSection) {
  const arc = crossSection ? Math.PI : Math.PI * 2;
  const geo = new THREE.TorusGeometry(radius, tubeRadius, 8, 64, arc);
  geo.rotateY(Math.PI / 2);
  if (crossSection) geo.rotateX(Math.PI * 0.5);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
  mesh.position.x = xPos;
  group.add(mesh);
}

// Shared wheel center/spoke/concave/dish/shaft-boss builder
function buildWheelCenterGeometry(group, m, spec, mat, options = {}) {
  const {
    cross = false,
    phiStart = 0,
    phiLength = Math.PI * 2,
    segs = 48,
    shaftSpec = null,
    scaleDiv = 1
  } = options;

  const lipDepth = Math.max(5, Math.min(m.rimWidth * 0.72, Number(spec.lipDepth) || 18));
  const concave = Math.max(0, Math.min(45, Number(spec.concave) || 0));
  const spokeOuterX = Math.max(m.innerRimX + 16, m.outerRimX - lipDepth);
  const hubCenterX = Math.max(m.innerRimX + 12, spokeOuterX - concave);

  // Shaft bore calculations (output physical mm -> pre-scale mm)
  const holeRadPre = shaftSpec ? (shaftSpec.holeDiaMm / 2) * scaleDiv : 0;
  const bossOutRadPre = shaftSpec ? Math.max(36, holeRadPre + 2.6 * scaleDiv) : 38;
  const bossBackLenPre = shaftSpec ? shaftSpec.bossLenMm * scaleDiv : 0;

  // Hollow Hub Cylinder (or solid hub if holeRadPre === 0)
  const hubFrontX = hubCenterX + 8;
  const hubBackX = hubCenterX - 10 - bossBackLenPre;
  const hubPts = [
    new THREE.Vector2(Math.max(0.1, holeRadPre), hubBackX),
    new THREE.Vector2(bossOutRadPre, hubBackX),
    new THREE.Vector2(bossOutRadPre, hubFrontX),
    new THREE.Vector2(Math.max(0.1, holeRadPre), hubFrontX),
    new THREE.Vector2(Math.max(0.1, holeRadPre), hubBackX)
  ];
  const hubGeo = new THREE.LatheGeometry(hubPts, segs, phiStart, phiLength);
  hubGeo.rotateZ(-Math.PI / 2);
  const hubMesh = new THREE.Mesh(hubGeo, mat);
  hubMesh.name = 'Wheel_Hub';
  group.add(hubMesh);

  const design = spec.design || 'spoke5';
  const rInnerHub = Math.max(bossOutRadPre - 4, 28);
  const rOuterBarrel = m.barrelInnerRad + 2;

  if (design === 'dish') {
    // Full concave dish plate from hub outer radius to barrel inner radius
    const dishPts = [
      new THREE.Vector2(rInnerHub, hubCenterX - 6),
      new THREE.Vector2(rOuterBarrel, spokeOuterX - 8),
      new THREE.Vector2(rOuterBarrel, spokeOuterX + 4),
      new THREE.Vector2(rInnerHub, hubCenterX + 6),
      new THREE.Vector2(rInnerHub, hubCenterX - 6)
    ];
    const dishGeo = new THREE.LatheGeometry(dishPts, segs, phiStart, phiLength);
    dishGeo.rotateZ(-Math.PI / 2);
    const dishMesh = new THREE.Mesh(dishGeo, mat);
    dishMesh.name = 'Wheel_Dish';
    group.add(dishMesh);
    return;
  }

  // Spoke configurations
  let angles = [];
  let spokeWidthZ = 18;
  if (design === 'spoke6') {
    for (let i = 0; i < 6; i++) angles.push((i / 6) * Math.PI * 2);
    spokeWidthZ = 20;
  } else if (design === 'spoke10') {
    // 5 pairs of twin spokes
    for (let i = 0; i < 5; i++) {
      const baseAng = (i / 5) * Math.PI * 2;
      angles.push(baseAng - 0.16, baseAng + 0.16);
    }
    spokeWidthZ = 11;
  } else {
    for (let i = 0; i < 5; i++) angles.push((i / 5) * Math.PI * 2);
    spokeWidthZ = 22;
  }

  const dx = spokeOuterX - hubCenterX;
  const dy = Math.max(20, rOuterBarrel - rInnerHub);
  const spokeLen = Math.hypot(dx, dy);
  const midX = (hubCenterX + spokeOuterX) / 2;
  const midR = (rInnerHub + rOuterBarrel) / 2;
  const tiltZ = -Math.atan2(dx, dy);

  const spokeGeo = new THREE.BoxGeometry(11, spokeLen, spokeWidthZ);
  angles.forEach((ang, idx) => {
    if (cross && Math.cos(ang) > 0.2) return;
    const pivot = new THREE.Group();
    pivot.rotation.x = ang;
    const sp = new THREE.Mesh(spokeGeo, mat);
    sp.position.set(midX, midR, 0);
    sp.rotation.z = tiltZ;
    sp.name = `Wheel_Spoke_${idx + 1}`;
    pivot.add(sp);
    group.add(pivot);
  });
}

function buildSlot3D(group, spec, color, isFocused, zOffset) {
  clearGroup(group);
  if (!spec.enabled) return;

  const m = calcMetrics(spec);
  const cross = state.crossSection;
  const phiStart = cross ? Math.PI * 0.5 : 0;
  const phiLength = cross ? Math.PI : Math.PI * 2;
  const segs = 56;

  const showWheel = state.partMode === 'both' || state.partMode === 'wheel';
  const showTire = state.partMode === 'both' || state.partMode === 'tire';

  const solidMode = state.arrangeSideBySide || isFocused;
  const wheelOpacity = solidMode ? 0.82 : 0.22;
  const tireOpacity = solidMode ? 0.65 : 0.16;
  const ringThick = solidMode ? 2.2 : 1.6;

  if (showWheel) {
    const rOut = m.rimRad;
    const rIn = m.barrelInnerRad;
    const xIn = m.innerRimX;
    const xOut = m.outerRimX;
    const lip = 7;

    const pts = [
      new THREE.Vector2(rIn, xIn),
      new THREE.Vector2(rOut + lip, xIn),
      new THREE.Vector2(rOut + lip, xIn + 6),
      new THREE.Vector2(rOut, xIn + 10),
      new THREE.Vector2(rOut - 6, xIn + 35),
      new THREE.Vector2(rOut - 6, xOut - 35),
      new THREE.Vector2(rOut, xOut - 10),
      new THREE.Vector2(rOut + lip, xOut - 6),
      new THREE.Vector2(rOut + lip, xOut),
      new THREE.Vector2(rIn, xOut),
      new THREE.Vector2(rIn, xIn)
    ];

    const geo = new THREE.LatheGeometry(pts, segs, phiStart, phiLength);
    geo.rotateZ(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.4,
      roughness: 0.3,
      transparent: !state.arrangeSideBySide,
      opacity: state.arrangeSideBySide ? 1.0 : wheelOpacity,
      depthWrite: solidMode,
      side: THREE.DoubleSide
    });
    group.add(new THREE.Mesh(geo, mat));

    if (solidMode) {
      buildWheelCenterGeometry(group, m, spec, mat, { cross, phiStart, phiLength, segs });
    }

    addCrispRing(group, rOut + lip, xOut, color, ringThick, cross);
    addCrispRing(group, rOut + lip, xIn, color, ringThick, cross);
  }

  if (showTire) {
    const rBead = m.rimRad - 2;
    const rOuter = m.tireRad;
    const rMid = rBead + m.sidewallH * 0.52;
    const treadHalfW = (m.actualSectionWidth * 0.86) / 2;
    const bulgeHalfW = m.actualSectionWidth / 2;
    const rimHalfW = m.rimWidth / 2;
    const cx = m.centerX;

    const pts = [
      new THREE.Vector2(rBead, cx - rimHalfW + 4),
      new THREE.Vector2(rBead + m.sidewallH * 0.15, cx - rimHalfW),
      new THREE.Vector2(rMid, cx - bulgeHalfW),
      new THREE.Vector2(rOuter - 6, cx - treadHalfW),
      new THREE.Vector2(rOuter, cx - treadHalfW + 8),
      new THREE.Vector2(rOuter, cx + treadHalfW - 8),
      new THREE.Vector2(rOuter - 6, cx + treadHalfW),
      new THREE.Vector2(rMid, cx + bulgeHalfW),
      new THREE.Vector2(rBead + m.sidewallH * 0.15, cx + rimHalfW),
      new THREE.Vector2(rBead, cx + rimHalfW - 4),
      new THREE.Vector2(rBead, cx - rimHalfW + 4)
    ];

    const geo = new THREE.LatheGeometry(pts, segs, phiStart, phiLength);
    geo.rotateZ(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: solidMode ? 0x334155 : color,
      roughness: 0.8,
      metalness: 0.05,
      transparent: !state.arrangeSideBySide,
      opacity: state.arrangeSideBySide ? 0.92 : tireOpacity,
      depthWrite: solidMode,
      side: THREE.DoubleSide
    });
    group.add(new THREE.Mesh(geo, mat));

    addCrispRing(group, rOuter, cx + treadHalfW - 8, color, ringThick, cross);
    addCrispRing(group, rOuter, cx - treadHalfW + 8, color, ringThick, cross);
  }

  group.position.z = zOffset;
  group.rotation.z = -(spec.camber * Math.PI) / 180;
}

function fmtDiff(v) {
  const s = v > 0 ? '+' : '';
  return `${s}${v.toFixed(1)}`;
}

function updateViewsAndHud() {
  draw2D();

  const zStep = state.arrangeSideBySide ? 360 : 0;
  state.slots.forEach((spec, idx) => {
    const zOff = (idx - 1) * zStep;
    buildSlot3D(slotGroups[idx], spec, SLOT_COLORS[idx], idx === state.activeSlot, zOff);
  });

  const metrics = state.slots.map(calcMetrics);
  const baseM = metrics[state.baseSlot];
  const baseSpec = state.slots[state.baseSlot];

  const legendBar = document.getElementById('legendBar');
  legendBar.innerHTML = state.slots.map((s, idx) => `
    <div class="legend-pill ${s.enabled ? '' : 'off'}" data-toggle-slot="${idx}">
      <span class="dot dot-${idx}"></span>
      <span>${s.label || `Slot ${String.fromCharCode(65 + idx)}`}</span>
    </div>
  `).join('');

  legendBar.querySelectorAll('.legend-pill').forEach(el => {
    el.addEventListener('click', () => {
      const idx = Number(el.dataset.toggleSlot);
      state.slots[idx].enabled = !state.slots[idx].enabled;
      syncUI();
    });
  });

  const hudRow = document.getElementById('hudRow');
  hudRow.innerHTML = state.slots.map((s, idx) => {
    const m = metrics[idx];
    const isBase = idx === state.baseSlot;
    const name = s.label || `Slot ${String.fromCharCode(65 + idx)}`;
    if (!s.enabled) {
      return `
        <div class="hud-card slot-${idx} off">
          <div class="hud-label"><span>${name}</span></div>
          <div class="hud-val">非表示</div>
          <div class="hud-sub">${s.inch}×${s.j}J ${s.et - s.spacer >= 0 ? '+' : ''}${s.et - s.spacer}</div>
        </div>
      `;
    }
    if (isBase) {
      return `
        <div class="hud-card slot-${idx}">
          <div class="hud-label"><span>${name}</span><span class="base-tag">基準</span></div>
          <div class="hud-val">外径 ${m.tireDia.toFixed(0)}mm / ET ${m.effEt >= 0 ? '+' : ''}${m.effEt}</div>
          <div class="hud-sub">${s.width}/${s.aspect}R${s.inch} (${s.j}J)</div>
        </div>
      `;
    }
    const outDiff = m.outerRimX - baseM.outerRimX;
    const inDiff = m.innerRimX - baseM.innerRimX;
    const diaDiff = m.tireDia - baseM.tireDia;
    const rimRadDiff = m.rimRad - baseM.rimRad;
    return `
      <div class="hud-card slot-${idx}">
        <div class="hud-label"><span>${name} (vs ${baseSpec.label || '基準'})</span></div>
        <div class="hud-val">外 ${fmtDiff(outDiff)} / 内 ${fmtDiff(inDiff)}mm</div>
        <div class="hud-sub">外径 ${fmtDiff(diaDiff)}mm / 径R ${fmtDiff(rimRadDiff)}mm</div>
      </div>
    `;
  }).join('');

  document.getElementById('metricsTitle').textContent =
    `基準 (${baseSpec.label || `Slot ${String.fromCharCode(65 + state.baseSlot)}`}) との比較 (mm)`;

  const rows = [
    ['サイズ', ...state.slots.map(s => `${s.inch}×${s.j}J`)],
    ['実効ET', ...metrics.map(m => `${m.effEt >= 0 ? '+' : ''}${m.effEt}`)],
    ['外径差', ...metrics.map((m, i) => i === state.baseSlot ? `${m.tireDia.toFixed(0)}` : fmtDiff(m.tireDia - baseM.tireDia))],
    ['外リム差', ...metrics.map((m, i) => i === state.baseSlot ? `${m.outerRimX.toFixed(1)}` : fmtDiff(m.outerRimX - baseM.outerRimX))],
    ['内リム差', ...metrics.map((m, i) => i === state.baseSlot ? `${m.innerRimX.toFixed(1)}` : fmtDiff(m.innerRimX - baseM.innerRimX))],
    ['内径R差', ...metrics.map((m, i) => i === state.baseSlot ? `${m.rimRad.toFixed(0)}` : fmtDiff(m.rimRad - baseM.rimRad))]
  ];

  document.getElementById('metricsBody').innerHTML = rows.map(r => `
    <tr>
      <td>${r[0]}</td>
      <td class="col-0">${r[1]}</td>
      <td class="col-1">${r[2]}</td>
      <td class="col-2">${r[3]}</td>
    </tr>
  `).join('');
}

function syncUI() {
  const s = state.slots[state.activeSlot];

  document.querySelectorAll('.slot-tab').forEach(btn => {
    const idx = Number(btn.dataset.slot);
    btn.classList.toggle('active', idx === state.activeSlot);
    btn.querySelector('span:last-child').textContent = state.slots[idx].label || `Slot ${String.fromCharCode(65 + idx)}`;
  });

  document.getElementById('slotEnabled').checked = s.enabled;
  document.getElementById('slotIsBase').checked = state.baseSlot === state.activeSlot;
  document.getElementById('slotLabel').value = s.label;

  const setIfNotFocused = (id, val) => {
    const el = document.getElementById(id);
    if (document.activeElement !== el) el.value = val;
  };
  setIfNotFocused('inp_inch', s.inch);
  setIfNotFocused('inp_j', s.j);
  setIfNotFocused('inp_et', s.et);
  setIfNotFocused('inp_spacer', s.spacer);
  setIfNotFocused('inp_width', s.width);
  setIfNotFocused('inp_aspect', s.aspect);
  setIfNotFocused('inp_camber', s.camber);
  setIfNotFocused('inp_concave', s.concave ?? 12);
  setIfNotFocused('inp_lipDepth', s.lipDepth ?? 20);
  document.getElementById('inp_design').value = s.design || 'spoke5';

  const sumEl = document.getElementById('slotSummary');
  sumEl.style.color = SLOT_HEX[state.activeSlot];
  sumEl.textContent = `${s.inch}×${s.j}J ${s.et - s.spacer >= 0 ? '+' : ''}${s.et - s.spacer}\n${s.width}/${s.aspect}R${s.inch}`;

  updateViewsAndHud();
}

// --- Bindings ---
document.querySelectorAll('.slot-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    state.activeSlot = Number(btn.dataset.slot);
    syncUI();
  });
});

document.getElementById('slotEnabled').addEventListener('change', (e) => {
  state.slots[state.activeSlot].enabled = e.target.checked;
  syncUI();
});

document.getElementById('slotIsBase').addEventListener('change', (e) => {
  if (e.target.checked) state.baseSlot = state.activeSlot;
  syncUI();
});

document.getElementById('slotLabel').addEventListener('input', (e) => {
  state.slots[state.activeSlot].label = e.target.value;
  syncUI();
});

const bindInput = (id, key) => {
  const el = document.getElementById(id);
  el.addEventListener('input', (e) => {
    const raw = e.target.value.trim();
    if (raw === '' || raw === '-' || raw.endsWith('.')) return;
    const val = parseFloat(raw);
    if (isNaN(val)) return;
    state.slots[state.activeSlot][key] = val;
    syncUI();
  });
  el.addEventListener('blur', () => {
    syncUI();
  });
};
bindInput('inp_inch', 'inch');
bindInput('inp_j', 'j');
bindInput('inp_et', 'et');
bindInput('inp_spacer', 'spacer');
bindInput('inp_width', 'width');
bindInput('inp_aspect', 'aspect');
bindInput('inp_camber', 'camber');
bindInput('inp_concave', 'concave');
bindInput('inp_lipDepth', 'lipDepth');

document.getElementById('inp_design').addEventListener('change', (e) => {
  state.slots[state.activeSlot].design = e.target.value;
  syncUI();
});

function parseSpecText(rawStr, targetObj) {
  let s = String(rawStr || '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[／]/g, '/')
    .replace(/[－―‐−]/g, '-')
    .replace(/(?<![\u30A0-\u30FF])ー/g, '-')
    .replace(/[×✕＊*]/g, 'X')
    .replace(/±/g, '+')
    .replace(/[,、]/g, ' ');

  // Remove PCD / bolt holes / PR noise
  s = s.replace(/PCD\s*[:=]?\s*\d{2,3}(?:\.\d+)?/g, ' ');
  s = s.replace(/\b(?:100|114\.3|112|120|139\.7)\s*[-/]\s*[456]\s*[H穴]\b/g, ' ');
  s = s.replace(/\b[456]\s*(?:H|HOLE|穴)\b/g, ' ');
  s = s.replace(/\b\d{1,2}\s*PR\b/g, ' ');

  // 1. Tire size (standard or delimiter variants)
  const tireRe = /(?:^|[^\d.])(1[1-9][05]|[23]\d[05])\s*(?:\/|-|\s)\s*(\d{2})\s*(?:Z?R|RF|F|\/|-|\s)\s*(\d{2})\s*(?:C|LT)?(?=$|[^\d])/;
  const tm = s.match(tireRe);
  if (tm) {
    targetObj.width = Number(tm[1]);
    targetObj.aspect = Number(tm[2]);
    targetObj.inch = Number(tm[3]);
    s = s.replace(tm[0], ' ');
  } else {
    // 80 aspect omitted (e.g. 145R12, 165R13LT)
    const tm80 = s.match(/(?:^|[^\d.])(1[2-9][05]|2\d[05])\s*\/?\s*R\s*(\d{2})\s*(?:C|LT)?(?=$|[^\d])/);
    if (tm80) {
      targetObj.width = Number(tm80[1]);
      targetObj.aspect = 80;
      targetObj.inch = Number(tm80[2]);
      s = s.replace(tm80[0], ' ');
    }
  }

  // 2. XL & LI (consume so they aren't confused with offset)
  s = s.replace(/\b(?:XL|EXTRA\s*LOAD|RFD|REINFORCED)\b|エクストラロード/g, ' ');
  s = s.replace(/(?:LI|ロードインデックス)\s*[:=]?\s*(69|[789]\d|1[01]\d)(?=$|[^\d])/g, ' ');
  s = s.replace(/\(?\b(69|[789]\d|1[01]\d)(?:\/\d{2,3})?\s*[HVWYZQRSTULMNPK]\b\)?/g, ' ');

  // 3. Wheel inch x J or J x inch
  const setA = s.match(/(?:^|[^\d.])(1\d|2[0-4])\s*(?:インチ|INCH|IN|")?\s*X\s*(\d{1,2}(?:\.\d+)?)\s*(?:JJ?|B)?(?=$|[^\d])/);
  if (setA) {
    const jVal = Number(setA[2]);
    if (jVal >= 3.5 && jVal <= 14) {
      targetObj.inch = Number(setA[1]);
      targetObj.j = jVal;
      s = s.replace(setA[0], ' ');
    }
  }
  const setB = s.match(/(?:^|[^\d.])(\d{1,2}(?:\.\d+)?)\s*(?:JJ?|B)(?:\s*X\s*|-)(1\d|2[0-4])(?=$|[^\d])/);
  if (setB) {
    const jVal = Number(setB[1]);
    if (jVal >= 3.5 && jVal <= 14) {
      targetObj.j = jVal;
      targetObj.inch = Number(setB[2]);
      s = s.replace(setB[0], ' ');
    }
  }

  // 4. Standalone J / Inch
  const jMatch = s.match(/(?:^|[^\d.])(\d{1,2}(?:\.\d+)?)\s*(?:JJ?|B)(?=$|[^\d])|(?:リム幅)\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)/);
  if (jMatch) {
    const jVal = Number(jMatch[1] || jMatch[2]);
    if (jVal >= 3.5 && jVal <= 14) {
      targetObj.j = jVal;
      s = s.replace(jMatch[0], ' ');
    }
  }
  const inMatch = s.match(/(?:^|[^\d.])(1\d|2[0-4])\s*(?:インチ|INCH|IN|")/);
  if (inMatch) {
    targetObj.inch = Number(inMatch[1]);
    s = s.replace(inMatch[0], ' ');
  }

  // 5. Spacer
  const spMatch = s.match(/(?:スペーサー|SPACER)\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:MM)?/);
  if (spMatch) {
    targetObj.spacer = Number(spMatch[1]);
    s = s.replace(spMatch[0], ' ');
  }

  // 6. Offset / Inset
  const etLabel = s.match(/(?:INSET|OFFSET|OFF|ET|インセット|オフセット|オフ)\s*[:=]?\s*([+-]?\s*\d{1,2}(?:\.\d+)?)/);
  if (etLabel) {
    targetObj.et = Number(etLabel[1].replace(/\s+/g, ''));
  } else {
    const etSign = s.match(/(?:^|\s)([+-]\d{1,2}(?:\.\d+)?)(?:\s*MM)?(?=\s|$)/);
    if (etSign) {
      targetObj.et = Number(etSign[1]);
    } else {
      const nums = s.match(/(?:^|\s)(-?\d{1,2}(?:\.\d+)?)(?=\s|$)/g);
      if (nums) {
        for (let i = nums.length - 1; i >= 0; i--) {
          const val = Number(nums[i].trim());
          if (val >= -50 && val <= 75) {
            targetObj.et = val;
            break;
          }
        }
      }
    }
  }
}

function parseQuickText() {
  const str = document.getElementById('tireStringInput').value.trim();
  if (!str) return;
  parseSpecText(str, state.slots[state.activeSlot]);
  syncUI();
}

document.getElementById('tireParseBtn').addEventListener('click', parseQuickText);
document.getElementById('tireStringInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') parseQuickText();
});

// 2D / 3D Mode Switch
document.querySelectorAll('#renderModeGroup .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#renderModeGroup .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.renderMode = btn.dataset.render;

    const is3d = state.renderMode === '3d';
    document.getElementById('canvas2dWrap').hidden = is3d;
    document.getElementById('canvas3dWrap').hidden = !is3d;
    document.getElementById('arrangeWrap').hidden = !is3d;
    document.getElementById('crossWrap').hidden = !is3d;
    document.getElementById('viewBar').hidden = !is3d;

    resizeAll();
    updateViewsAndHud();
  });
});

document.querySelectorAll('#partModeGroup .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#partModeGroup .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.partMode = btn.dataset.mode;
    updateViewsAndHud();
  });
});

document.getElementById('arrangeToggle').addEventListener('change', (e) => {
  state.arrangeSideBySide = e.target.checked;
  updateViewsAndHud();
});

document.getElementById('crossSectionToggle').addEventListener('change', (e) => {
  state.crossSection = e.target.checked;
  updateViewsAndHud();
});

const VIEWS = {
  iso: [660, 310, 740],
  front: [10, 30, 950],
  side: [950, 20, 10],
  inner: [-750, 260, 520]
};
document.querySelectorAll('#viewBar .mini-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#viewBar .mini-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const p = VIEWS[btn.dataset.view];
    camera.position.set(p[0], p[1], p[2]);
    controls.target.set(0, 0, 0);
    controls.update();
  });
});

document.getElementById('presetSelect').addEventListener('change', (e) => {
  const list = PRESETS[e.target.value];
  if (!list) return;
  list.forEach((p, idx) => Object.assign(state.slots[idx], p));
  state.baseSlot = 0;
  syncUI();
});

document.getElementById('shareUrlBtn').addEventListener('click', async () => {
  const url = new URL(window.location.href);
  state.slots.forEach((s, idx) => {
    url.searchParams.set(`s${idx}`, `${s.enabled ? 1 : 0},${s.inch},${s.j},${s.et},${s.spacer},${s.width},${s.aspect},${s.camber},${encodeURIComponent(s.label)},${s.design || 'spoke5'},${s.concave ?? 12},${s.lipDepth ?? 20}`);
  });
  url.searchParams.set('base', String(state.baseSlot));
  try {
    await navigator.clipboard.writeText(url.toString());
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  } catch {
    prompt('以下のURLをコピーしてください:', url.toString());
  }
});

function resizeAll() {
  draw2D();
  if (renderer && state.renderMode === '3d') {
    const w = container3d.clientWidth;
    const h = container3d.clientHeight;
    if (w > 0 && h > 0) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  }
}

if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(resizeAll).observe(document.querySelector('.stage-wrap'));
}
window.addEventListener('resize', resizeAll);

function animate() {
  requestAnimationFrame(animate);
  if (renderer && state.renderMode === '3d') {
    controls.update();
    renderer.render(scene, camera);
  }
}

// =========================
// 3D MODEL EXPORTER (OBJ / GLB / STL)
// =========================
function buildExportGroup(spec) {
  const m = calcMetrics(spec);
  const expGroup = new THREE.Group();
  const showWheel = state.partMode === 'both' || state.partMode === 'wheel';
  const showTire = state.partMode === 'both' || state.partMode === 'tire';
  const segs = 64;
  const scaleDiv = Number(document.getElementById('exportScale').value) || 1;
  const shaftKey = document.getElementById('exportShaft').value;
  const shaftSpec = SHAFT_SPECS[shaftKey] || null;

  if (showWheel) {
    const rOut = m.rimRad;
    const rIn = m.barrelInnerRad;
    const xIn = m.innerRimX;
    const xOut = m.outerRimX;
    const lip = 7;

    const pts = [
      new THREE.Vector2(rIn, xIn),
      new THREE.Vector2(rOut + lip, xIn),
      new THREE.Vector2(rOut + lip, xIn + 6),
      new THREE.Vector2(rOut, xIn + 10),
      new THREE.Vector2(rOut - 6, xIn + 35),
      new THREE.Vector2(rOut - 6, xOut - 35),
      new THREE.Vector2(rOut, xOut - 10),
      new THREE.Vector2(rOut + lip, xOut - 6),
      new THREE.Vector2(rOut + lip, xOut),
      new THREE.Vector2(rIn, xOut),
      new THREE.Vector2(rIn, xIn)
    ];

    const geo = new THREE.LatheGeometry(pts, segs);
    geo.rotateZ(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 });
    const rimMesh = new THREE.Mesh(geo, mat);
    rimMesh.name = 'Wheel_Rim';
    expGroup.add(rimMesh);

    buildWheelCenterGeometry(expGroup, m, spec, mat, { segs, shaftSpec, scaleDiv });
  }

  if (showTire) {
    const rBead = m.rimRad - 2;
    const rOuter = m.tireRad;
    const rMid = rBead + m.sidewallH * 0.52;
    const treadHalfW = (m.actualSectionWidth * 0.86) / 2;
    const bulgeHalfW = m.actualSectionWidth / 2;
    const rimHalfW = m.rimWidth / 2;
    const cx = m.centerX;

    const pts = [
      new THREE.Vector2(rBead, cx - rimHalfW + 4),
      new THREE.Vector2(rBead + m.sidewallH * 0.15, cx - rimHalfW),
      new THREE.Vector2(rMid, cx - bulgeHalfW),
      new THREE.Vector2(rOuter - 6, cx - treadHalfW),
      new THREE.Vector2(rOuter, cx - treadHalfW + 8),
      new THREE.Vector2(rOuter, cx + treadHalfW - 8),
      new THREE.Vector2(rOuter - 6, cx + treadHalfW),
      new THREE.Vector2(rMid, cx + bulgeHalfW),
      new THREE.Vector2(rBead + m.sidewallH * 0.15, cx + rimHalfW),
      new THREE.Vector2(rBead, cx + rimHalfW - 4),
      new THREE.Vector2(rBead, cx - rimHalfW + 4)
    ];

    const geo = new THREE.LatheGeometry(pts, segs);
    geo.rotateZ(-Math.PI / 2);
    const tireMesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.85, metalness: 0.05 })
    );
    tireMesh.name = 'Tire';
    expGroup.add(tireMesh);
  }

  expGroup.scale.setScalar(1 / scaleDiv);
  expGroup.updateMatrixWorld(true);
  return { expGroup, scaleDiv };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBaseName(spec, scaleDiv) {
  const et = spec.et - spec.spacer;
  const part = state.partMode;
  return `${part}_${spec.width}-${spec.aspect}R${spec.inch}_${spec.j}J_ET${et >= 0 ? '+' : ''}${et}_1-${scaleDiv}`;
}

document.getElementById('expObjBtn').addEventListener('click', () => {
  const spec = state.slots[state.activeSlot];
  const { expGroup, scaleDiv } = buildExportGroup(spec);
  const exporter = new OBJExporter();
  const text = exporter.parse(expGroup);
  downloadBlob(new Blob([text], { type: 'text/plain' }), `${exportBaseName(spec, scaleDiv)}.obj`);
});

document.getElementById('expStlBtn').addEventListener('click', () => {
  const spec = state.slots[state.activeSlot];
  const { expGroup, scaleDiv } = buildExportGroup(spec);
  const exporter = new STLExporter();
  const buf = exporter.parse(expGroup, { binary: true });
  downloadBlob(new Blob([buf], { type: 'application/octet-stream' }), `${exportBaseName(spec, scaleDiv)}.stl`);
});

document.getElementById('expGlbBtn').addEventListener('click', () => {
  const spec = state.slots[state.activeSlot];
  const { expGroup, scaleDiv } = buildExportGroup(spec);
  const exporter = new GLTFExporter();
  exporter.parse(
    expGroup,
    (res) => {
      const blob = res instanceof ArrayBuffer
        ? new Blob([res], { type: 'model/gltf-binary' })
        : new Blob([JSON.stringify(res)], { type: 'application/json' });
      const ext = res instanceof ArrayBuffer ? 'glb' : 'gltf';
      downloadBlob(blob, `${exportBaseName(spec, scaleDiv)}.${ext}`);
    },
    (err) => showError(`GLB書き出し失敗: ${err.message}`),
    { binary: true }
  );
});

loadFromUrl();
syncUI();
resizeAll();
animate();
