import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const INCH_MM = 25.4;
const SLOT_COLORS = [0x2563eb, 0xea580c, 0x059669];
const SLOT_HEX = ['#2563eb', '#ea580c', '#059669'];

const PRESETS = {
  civic_fc1: [
    { label: '純正16', enabled: true, inch: 16, j: 7.0, et: 45, spacer: 0, width: 215, aspect: 55, camber: 0 },
    { label: '純正18', enabled: true, inch: 18, j: 8.0, et: 50, spacer: 0, width: 235, aspect: 40, camber: 0 },
    { label: '社外案', enabled: true, inch: 18, j: 8.5, et: 38, spacer: 0, width: 225, aspect: 40, camber: 1.0 }
  ],
  kei_standard: [
    { label: '純正14', enabled: true, inch: 14, j: 4.5, et: 45, spacer: 0, width: 155, aspect: 65, camber: 0 },
    { label: '純正15', enabled: true, inch: 15, j: 4.5, et: 45, spacer: 0, width: 165, aspect: 55, camber: 0 },
    { label: '社外15', enabled: true, inch: 15, j: 5.5, et: 42, spacer: 0, width: 165, aspect: 55, camber: 0 }
  ],
  prius_50: [
    { label: '純正15', enabled: true, inch: 15, j: 6.5, et: 40, spacer: 0, width: 195, aspect: 65, camber: 0 },
    { label: '純正17', enabled: true, inch: 17, j: 7.0, et: 50, spacer: 0, width: 215, aspect: 45, camber: 0 },
    { label: '社外18', enabled: true, inch: 18, j: 7.5, et: 42, spacer: 0, width: 215, aspect: 40, camber: 0.5 }
  ],
  '86_brz': [
    { label: '純正16', enabled: true, inch: 16, j: 6.5, et: 48, spacer: 0, width: 205, aspect: 55, camber: 0 },
    { label: '純正17', enabled: true, inch: 17, j: 7.5, et: 48, spacer: 0, width: 215, aspect: 45, camber: 0 },
    { label: '社外18', enabled: true, inch: 18, j: 8.5, et: 40, spacer: 0, width: 235, aspect: 40, camber: 1.5 }
  ],
  nd_roadster: [
    { label: '純正16', enabled: true, inch: 16, j: 6.5, et: 45, spacer: 0, width: 195, aspect: 50, camber: 0 },
    { label: 'ブレンボ枠', enabled: true, inch: 17, j: 7.0, et: 45, spacer: 0, width: 205, aspect: 45, camber: 0 },
    { label: '深リム案', enabled: true, inch: 16, j: 7.5, et: 32, spacer: 0, width: 205, aspect: 50, camber: 1.0 }
  ]
};

const state = {
  slots: [
    { label: 'Slot A', enabled: true, inch: 16, j: 7.0, et: 45, spacer: 0, width: 215, aspect: 55, camber: 0 },
    { label: 'Slot B', enabled: true, inch: 18, j: 8.0, et: 50, spacer: 0, width: 235, aspect: 40, camber: 0 },
    { label: 'Slot C', enabled: true, inch: 18, j: 8.5, et: 38, spacer: 0, width: 225, aspect: 40, camber: 0 }
  ],
  activeSlot: 0,
  baseSlot: 0,
  partMode: 'both',
  crossSection: false
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
          label: parts[8] ? decodeURIComponent(parts[8]) : `Slot ${String.fromCharCode(65 + idx)}`
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

// --- Three.js Setup ---
const container = document.getElementById('canvasContainer');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight), 10, 5000);
camera.position.set(660, 310, 740);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(Math.max(100, container.clientWidth), Math.max(100, container.clientHeight));
  container.appendChild(renderer.domElement);
} catch (err) {
  showError(err.message);
}

const controls = new OrbitControls(camera, renderer ? renderer.domElement : container);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 1.1));
const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight1.position.set(500, 800, 600);
scene.add(dirLight1);
const dirLight2 = new THREE.DirectionalLight(0xe0f2fe, 0.7);
dirLight2.position.set(-600, -300, -400);
scene.add(dirLight2);

// Reference Hub Plane (X = 0) & Grid
const refGroup = new THREE.Group();
const hubPlaneGeo = new THREE.RingGeometry(36, 145, 48);
hubPlaneGeo.rotateY(Math.PI / 2);
refGroup.add(new THREE.Mesh(
  hubPlaneGeo,
  new THREE.MeshBasicMaterial({ color: 0x0f172a, opacity: 0.08, transparent: true, side: THREE.DoubleSide })
));

const hubEdgeGeo = new THREE.TorusGeometry(145, 1.2, 8, 64);
hubEdgeGeo.rotateY(Math.PI / 2);
refGroup.add(new THREE.Mesh(hubEdgeGeo, new THREE.MeshBasicMaterial({ color: 0x475569 })));

const axisGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-250, 0, 0),
  new THREE.Vector3(250, 0, 0)
]);
refGroup.add(new THREE.Line(axisGeo, new THREE.LineBasicMaterial({ color: 0x64748b })));

const gridHelper = new THREE.GridHelper(900, 18, 0x94a3b8, 0xcbd5e1);
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
  if (crossSection) {
    geo.rotateX(Math.PI * 0.5);
  }
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
  mesh.position.x = xPos;
  group.add(mesh);
}

function buildSlot3D(group, spec, color, isFocused, isBase) {
  clearGroup(group);
  if (!spec.enabled) return;

  const m = calcMetrics(spec);
  const cross = state.crossSection;
  const phiStart = cross ? Math.PI * 0.5 : 0;
  const phiLength = cross ? Math.PI : Math.PI * 2;
  const segs = 56;

  const showWheel = state.partMode === 'both' || state.partMode === 'wheel';
  const showTire = state.partMode === 'both' || state.partMode === 'tire';

  const wheelOpacity = isFocused ? 0.52 : 0.16;
  const tireOpacity = isFocused ? 0.34 : 0.12;
  const ringThick = isFocused ? 2.4 : (isBase ? 2.0 : 1.6);

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
      metalness: 0.35,
      roughness: 0.35,
      transparent: true,
      opacity: wheelOpacity,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    group.add(new THREE.Mesh(geo, mat));

    addCrispRing(group, rOut + lip, xOut, color, ringThick, cross);
    addCrispRing(group, rOut + lip, xIn, color, ringThick, cross);
    addCrispRing(group, rIn, xIn, color, ringThick * 0.85, cross);
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
      color,
      roughness: 0.75,
      metalness: 0.05,
      transparent: true,
      opacity: tireOpacity,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    group.add(new THREE.Mesh(geo, mat));

    addCrispRing(group, rOuter, cx + treadHalfW - 8, color, ringThick, cross);
    addCrispRing(group, rOuter, cx - treadHalfW + 8, color, ringThick, cross);
    addCrispRing(group, rMid, cx + bulgeHalfW, color, ringThick * 0.7, cross);
    addCrispRing(group, rMid, cx - bulgeHalfW, color, ringThick * 0.7, cross);
  }

  group.rotation.z = -(spec.camber * Math.PI) / 180;
}

function fmtDiff(v) {
  const s = v > 0 ? '+' : '';
  return `${s}${v.toFixed(1)}`;
}

function updateSceneAndHud() {
  state.slots.forEach((spec, idx) => {
    buildSlot3D(slotGroups[idx], spec, SLOT_COLORS[idx], idx === state.activeSlot, idx === state.baseSlot);
  });

  const metrics = state.slots.map(calcMetrics);
  const baseM = metrics[state.baseSlot];
  const baseSpec = state.slots[state.baseSlot];

  const legendBar = document.getElementById('legendBar');
  legendBar.innerHTML = state.slots.map((s, idx) => `
    <div class="legend-pill ${s.enabled ? '' : 'off'}" data-toggle-slot="${idx}">
      <span class="dot dot-${idx}"></span>
      <span>${s.label || `Slot ${String.fromCharCode(65 + idx)}`}: ${s.inch}×${s.j}J ${s.et - s.spacer >= 0 ? '+' : ''}${s.et - s.spacer}</span>
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

  document.getElementById('inp_inch').value = s.inch;
  document.getElementById('inp_j').value = s.j;
  document.getElementById('inp_et').value = s.et;
  document.getElementById('inp_spacer').value = s.spacer;
  document.getElementById('inp_width').value = s.width;
  document.getElementById('inp_aspect').value = s.aspect;
  document.getElementById('inp_camber').value = s.camber;

  const sumEl = document.getElementById('slotSummary');
  sumEl.style.color = SLOT_HEX[state.activeSlot];
  sumEl.textContent = `${s.inch}×${s.j}J ${s.et - s.spacer >= 0 ? '+' : ''}${s.et - s.spacer}\n${s.width}/${s.aspect}R${s.inch}`;

  updateSceneAndHud();
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
  document.getElementById(id).addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val)) return;
    state.slots[state.activeSlot][key] = val;
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

function parseQuickText() {
  const str = document.getElementById('tireStringInput').value.trim();
  if (!str) return;
  const s = state.slots[state.activeSlot];
  const tireMatch = str.match(/(\d{3})\s*\/\s*(\d{2})\s*[Rr]\s*(\d{2})/);
  if (tireMatch) {
    s.width = Number(tireMatch[1]);
    s.aspect = Number(tireMatch[2]);
    s.inch = Number(tireMatch[3]);
  }
  const jMatch = str.match(/(\d+(?:\.\d+)?)\s*[Jj]/);
  if (jMatch) s.j = Number(jMatch[1]);
  const etMatch = str.match(/([+-]\d+)(?:\s|$)/);
  if (etMatch) s.et = Number(etMatch[1]);
  syncUI();
}

document.getElementById('tireParseBtn').addEventListener('click', parseQuickText);
document.getElementById('tireStringInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') parseQuickText();
});

document.querySelectorAll('.seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.partMode = btn.dataset.mode;
    updateSceneAndHud();
  });
});

document.getElementById('crossSectionToggle').addEventListener('change', (e) => {
  state.crossSection = e.target.checked;
  updateSceneAndHud();
});

const VIEWS = {
  iso: [660, 310, 740],
  front: [10, 30, 950],
  side: [950, 20, 10],
  inner: [-750, 260, 520]
};
document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
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
    url.searchParams.set(`s${idx}`, `${s.enabled ? 1 : 0},${s.inch},${s.j},${s.et},${s.spacer},${s.width},${s.aspect},${s.camber},${encodeURIComponent(s.label)}`);
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

function resizeRenderer() {
  if (!renderer) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w > 0 && h > 0) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
}

if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(resizeRenderer).observe(container);
}
window.addEventListener('resize', resizeRenderer);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  if (renderer) renderer.render(scene, camera);
}

loadFromUrl();
syncUI();
resizeRenderer();
animate();
