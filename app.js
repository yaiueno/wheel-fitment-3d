import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const INCH_MM = 25.4;

const PRESETS = {
  civic_fc1: {
    min: { inch: 16, j: 7.0, et: 45, width: 215, aspect: 55 },
    max: { inch: 18, j: 8.0, et: 50, width: 235, aspect: 40, margin: 12 },
    target: { inch: 18, j: 8.5, et: 38, spacer: 0, width: 225, aspect: 40, camber: 1.0 }
  },
  kei_standard: {
    min: { inch: 14, j: 4.5, et: 45, width: 155, aspect: 65 },
    max: { inch: 15, j: 4.5, et: 45, width: 165, aspect: 55, margin: 8 },
    target: { inch: 15, j: 5.0, et: 42, spacer: 0, width: 165, aspect: 55, camber: 0 }
  },
  prius_50: {
    min: { inch: 15, j: 6.5, et: 40, width: 195, aspect: 65 },
    max: { inch: 17, j: 7.0, et: 50, width: 215, aspect: 45, margin: 12 },
    target: { inch: 18, j: 7.5, et: 42, spacer: 0, width: 215, aspect: 40, camber: 0.5 }
  },
  '86_brz': {
    min: { inch: 16, j: 6.5, et: 48, width: 205, aspect: 55 },
    max: { inch: 17, j: 7.5, et: 48, width: 215, aspect: 45, margin: 15 },
    target: { inch: 18, j: 8.5, et: 40, spacer: 0, width: 225, aspect: 40, camber: 1.5 }
  },
  nd_roadster: {
    min: { inch: 16, j: 6.5, et: 45, width: 195, aspect: 50 },
    max: { inch: 17, j: 7.0, et: 45, width: 205, aspect: 45, margin: 12 },
    target: { inch: 16, j: 7.5, et: 35, spacer: 0, width: 205, aspect: 50, camber: 1.0 }
  }
};

const state = {
  target: { inch: 18, j: 8.0, et: 38, spacer: 0, width: 225, aspect: 40, camber: 0 },
  min: { inch: 16, j: 7.0, et: 45, width: 215, aspect: 55 },
  max: { inch: 18, j: 8.0, et: 50, width: 235, aspect: 40, margin: 10 },
  partMode: 'both', // 'both' | 'wheel' | 'tire'
  crossSection: false,
  showMin: true,
  showMax: true
};

// --- URL Params Load ---
function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const keys = ['t', 'min', 'max'];
  if (params.has('t')) {
    const [inch, j, et, spacer, width, aspect, camber] = params.get('t').split(',').map(Number);
    if (!isNaN(inch)) Object.assign(state.target, { inch, j, et, spacer: spacer || 0, width, aspect, camber: camber || 0 });
  }
  if (params.has('min')) {
    const [inch, j, et, width, aspect] = params.get('min').split(',').map(Number);
    if (!isNaN(inch)) Object.assign(state.min, { inch, j, et, width, aspect });
  }
  if (params.has('max')) {
    const [inch, j, et, width, aspect, margin] = params.get('max').split(',').map(Number);
    if (!isNaN(inch)) Object.assign(state.max, { inch, j, et, width, aspect, margin: isNaN(margin) ? 10 : margin });
  }
}

// --- Geometry Calculations (mm, X=0 is Hub Mounting Face, +X is Outer/Fender, -X is Inner/Brake) ---
function calcMetrics(spec, spacer = 0) {
  const rimDia = spec.inch * INCH_MM;
  const rimRad = rimDia / 2;
  const rimWidth = spec.j * INCH_MM;
  const effEt = spec.et - spacer;
  const centerX = -effEt;
  const outerRimX = centerX + rimWidth / 2;
  const innerRimX = centerX - rimWidth / 2;

  const sidewallH = spec.width * (spec.aspect / 100);
  const tireDia = rimDia + 2 * sidewallH;
  const tireRad = tireDia / 2;

  // Tire section width expands/contracts slightly depending on rim width
  // Measuring rim width approx = 0.75 * section width (rough JATO/ETRTO approximation)
  const stdRimWidth = spec.width * 0.72;
  const actualSectionWidth = spec.width + (rimWidth - stdRimWidth) * 0.4;
  const maxTireWidth = Math.max(actualSectionWidth, rimWidth + 6);
  const outerTireX = centerX + maxTireWidth / 2;
  const innerTireX = centerX - maxTireWidth / 2;

  // Inner barrel clearance radius (accounting for rim flange/barrel thickness ~18mm)
  const barrelInnerRad = Math.max(80, rimRad - 18);

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

const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 10, 5000);
camera.position.set(650, 320, 720);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.3);
dirLight1.position.set(500, 800, 600);
scene.add(dirLight1);
const dirLight2 = new THREE.DirectionalLight(0x7dd3fc, 0.6);
dirLight2.position.set(-600, -300, -400);
scene.add(dirLight2);

// Reference Hub Plane (X = 0) & Axis
const hubGroup = new THREE.Group();
const hubPlaneGeo = new THREE.RingGeometry(40, 150, 48);
hubPlaneGeo.rotateY(Math.PI / 2);
const hubPlaneMat = new THREE.MeshBasicMaterial({
  color: 0xffffff, opacity: 0.12, transparent: true, side: THREE.DoubleSide
});
hubGroup.add(new THREE.Mesh(hubPlaneGeo, hubPlaneMat));

// Hub Center Axis Line
const axisGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-240, 0, 0),
  new THREE.Vector3(240, 0, 0)
]);
const axisMat = new THREE.LineBasicMaterial({ color: 0x64748b, opacity: 0.6, transparent: true });
hubGroup.add(new THREE.Line(axisGeo, axisMat));
scene.add(hubGroup);

// Dynamic Groups
const targetGroup = new THREE.Group();
const minGroup = new THREE.Group();
const maxGroup = new THREE.Group();
scene.add(targetGroup, minGroup, maxGroup);

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

function buildWheelMesh(m, color, opacity, wireframe, crossSection) {
  const phiStart = crossSection ? Math.PI * 0.5 : 0;
  const phiLength = crossSection ? Math.PI : Math.PI * 2;
  const segs = 56;

  // Rim profile in (radius, y=X) coordinates
  const rOut = m.rimRad;
  const rIn = m.barrelInnerRad;
  const xIn = m.innerRimX;
  const xOut = m.outerRimX;
  const lip = 8;

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

  const mat = wireframe
    ? new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity })
    : new THREE.MeshStandardMaterial({
        color, metalness: 0.72, roughness: 0.28,
        side: THREE.DoubleSide, transparent: opacity < 1, opacity
      });

  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mat));

  // Simple spokes/hub disk at outer face region
  if (!wireframe) {
    const spokeCount = 5;
    const diskX = Math.min(xOut - 18, Math.max(xIn + 30, 0));
    const hubDiskGeo = new THREE.CylinderGeometry(42, 42, 16, 24);
    hubDiskGeo.rotateZ(Math.PI / 2);
    const hubDisk = new THREE.Mesh(hubDiskGeo, mat);
    hubDisk.position.x = diskX > 0 ? diskX * 0.4 : 0;
    group.add(hubDisk);

    const spokeLen = rIn - 35;
    const spokeGeo = new THREE.BoxGeometry(10, spokeLen, 16);
    for (let i = 0; i < spokeCount; i++) {
      const ang = (i / spokeCount) * Math.PI * 2;
      if (crossSection && Math.cos(ang) > 0.2) continue;
      const sp = new THREE.Mesh(spokeGeo, mat);
      sp.position.set(xOut - 18, Math.sin(ang) * (spokeLen / 2 + 30), Math.cos(ang) * (spokeLen / 2 + 30));
      sp.rotation.x = -ang + Math.PI / 2;
      group.add(sp);
    }
  }
  return group;
}

function buildTireMesh(m, color, opacity, wireframe, crossSection) {
  const phiStart = crossSection ? Math.PI * 0.5 : 0;
  const phiLength = crossSection ? Math.PI : Math.PI * 2;
  const segs = 56;

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

  const mat = wireframe
    ? new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity })
    : new THREE.MeshStandardMaterial({
        color, roughness: 0.85, metalness: 0.08,
        side: THREE.DoubleSide, transparent: opacity < 1, opacity
      });

  return new THREE.Mesh(geo, mat);
}

function updateScene() {
  clearGroup(targetGroup);
  clearGroup(minGroup);
  clearGroup(maxGroup);

  const tm = calcMetrics(state.target, state.target.spacer);
  const minM = calcMetrics(state.min, 0);
  const maxM = calcMetrics(state.max, 0);

  // Target rendering
  const showWheel = state.partMode === 'both' || state.partMode === 'wheel';
  const showTire = state.partMode === 'both' || state.partMode === 'tire';

  if (showWheel) {
    targetGroup.add(buildWheelMesh(tm, 0xd1d5db, 1.0, false, state.crossSection));
  }
  if (showTire) {
    targetGroup.add(buildTireMesh(tm, 0x26292e, state.crossSection ? 0.96 : 0.92, false, state.crossSection));
  }

  // Apply simple camber around bottom contact patch or hub center
  targetGroup.rotation.z = -(state.target.camber * Math.PI) / 180;

  // Min Reference (Brake / Inner Limit - Red)
  if (state.showMin) {
    if (showWheel) {
      minGroup.add(buildWheelMesh(minM, 0xef4444, 0.32, true, false));
    }
    if (showTire) {
      minGroup.add(buildTireMesh(minM, 0xef4444, 0.18, true, false));
    }
    // Inner Brake Danger Ring
    const brakeRingGeo = new THREE.RingGeometry(minM.barrelInnerRad - 4, minM.barrelInnerRad, 48);
    brakeRingGeo.rotateY(Math.PI / 2);
    const brakeRing = new THREE.Mesh(
      brakeRingGeo,
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    brakeRing.position.x = minM.innerRimX;
    minGroup.add(brakeRing);
  }

  // Max Reference (Fender / Housing Limit - Cyan)
  if (state.showMax) {
    const maxWithMargin = { ...maxM };
    maxWithMargin.outerRimX += state.max.margin;
    maxWithMargin.outerTireX += state.max.margin;

    if (showWheel) {
      maxGroup.add(buildWheelMesh(maxM, 0x38bdf8, 0.28, true, false));
    }
    if (showTire) {
      maxGroup.add(buildTireMesh(maxM, 0x38bdf8, 0.18, true, false));
    }
    // Fender Limit Plane Ring at maxWithMargin.outerTireX
    const fenderRingGeo = new THREE.RingGeometry(maxM.tireRad - 15, maxM.tireRad + 12, 48);
    fenderRingGeo.rotateY(Math.PI / 2);
    const fenderRing = new THREE.Mesh(
      fenderRingGeo,
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
    );
    fenderRing.position.x = maxWithMargin.outerTireX;
    maxGroup.add(fenderRing);
  }

  updateJudgement(tm, minM, maxM);
}

function fmtDiff(v, invertGood = false) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}mm`;
}

function updateJudgement(tm, minM, maxM) {
  // 1. Brake / Inner Clearance (vs Min)
  const rimRadDiff = tm.rimRad - minM.rimRad; // negative = smaller inch than min
  const innerRimShift = tm.innerRimX - minM.innerRimX; // negative = moves deeper inside (-X)
  const innerTireShift = tm.innerTireX - minM.innerTireX;
  const camGainTop = Math.tan((state.target.camber * Math.PI) / 180) * tm.tireRad;

  const brakeCard = document.getElementById('brakeCard');
  const brakeStatus = document.getElementById('brakeStatus');
  const brakeDetail = document.getElementById('brakeDetail');

  brakeCard.className = 'hud-card';
  if (rimRadDiff < -2) {
    brakeCard.classList.add('status-danger');
    brakeStatus.textContent = `小径注意 (${state.target.inch}" < 最小${state.min.inch}")`;
  } else if (innerRimShift < -10 || innerTireShift < -12) {
    brakeCard.classList.add('status-danger');
    brakeStatus.textContent = `内側干渉リスク`;
  } else if (innerRimShift < -3 || innerTireShift < -5) {
    brakeCard.classList.add('status-warn');
    brakeStatus.textContent = `内側クリアランス狭`;
  } else {
    brakeCard.classList.add('status-ok');
    brakeStatus.textContent = `安全圏 (OK)`;
  }
  brakeDetail.textContent = `内リム: ${fmtDiff(innerRimShift)} / 内タイヤ: ${fmtDiff(innerTireShift)}`;

  // 2. Fender / House Clearance (vs Max)
  const outerRimDiff = tm.outerRimX - maxM.outerRimX - camGainTop * 0.5;
  const outerTireDiff = tm.outerTireX - maxM.outerTireX - camGainTop * 0.8;
  const margin = state.max.margin;

  const fenderCard = document.getElementById('fenderCard');
  const fenderStatus = document.getElementById('fenderStatus');
  const fenderDetail = document.getElementById('fenderDetail');

  fenderCard.className = 'hud-card';
  if (outerTireDiff > margin + 2 || outerRimDiff > margin + 2) {
    fenderCard.classList.add('status-danger');
    fenderStatus.textContent = `ハミタイ/干渉注意 (+${(outerTireDiff - margin).toFixed(1)}mm超過)`;
  } else if (outerTireDiff > margin - 4 || outerRimDiff > margin - 4) {
    fenderCard.classList.add('status-warn');
    fenderStatus.textContent = `攻めのツライチ (余裕 ${(margin - outerTireDiff).toFixed(1)}mm)`;
  } else {
    fenderCard.classList.add('status-ok');
    fenderStatus.textContent = `収まる (余裕 ${(margin - outerTireDiff).toFixed(1)}mm)`;
  }
  fenderDetail.textContent = `最大比 外リム: ${fmtDiff(outerRimDiff)} / 外タイヤ: ${fmtDiff(outerTireDiff)}`;

  // 3. Tire Diameter & Stretch
  const diaDiff = tm.tireDia - maxM.tireDia;
  const diaPct = (diaDiff / maxM.tireDia) * 100;
  const jDiff = tm.rimWidth - state.target.width; // negative = wide tire on narrow rim
  let stretchLabel = '適正';
  if (jDiff > 5) stretchLabel = '引っ張り';
  else if (jDiff > -15) stretchLabel = 'やや引っ張り/標準';
  else if (jDiff < -45) stretchLabel = 'ムッチリ';

  const stretchCard = document.getElementById('stretchCard');
  const stretchStatus = document.getElementById('stretchStatus');
  const stretchDetail = document.getElementById('stretchDetail');
  stretchCard.className = 'hud-card';
  if (Math.abs(diaPct) > 3.0) {
    stretchCard.classList.add('status-danger');
  } else if (Math.abs(diaPct) > 1.5) {
    stretchCard.classList.add('status-warn');
  } else {
    stretchCard.classList.add('status-ok');
  }
  stretchStatus.textContent = `外径 ${fmtDiff(diaDiff)} (${diaPct >= 0 ? '+' : ''}${diaPct.toFixed(1)}%)`;
  stretchDetail.textContent = `総外径 ${tm.tireDia.toFixed(0)}mm / 形状: ${stretchLabel}`;

  // Metrics Table
  const rows = [
    ['タイヤ外径', `${tm.tireDia.toFixed(0)}`, fmtDiff(tm.tireDia - minM.tireDia), fmtDiff(tm.tireDia - maxM.tireDia)],
    ['実効インセット', `${tm.effEt >= 0 ? '+' : ''}${tm.effEt}`, fmtDiff(tm.effEt - minM.effEt), fmtDiff(tm.effEt - maxM.effEt)],
    ['外リム出面', `${tm.outerRimX.toFixed(1)}`, fmtDiff(tm.outerRimX - minM.outerRimX), fmtDiff(tm.outerRimX - maxM.outerRimX)],
    ['内リム位置', `${tm.innerRimX.toFixed(1)}`, fmtDiff(tm.innerRimX - minM.innerRimX), fmtDiff(tm.innerRimX - maxM.innerRimX)],
    ['リム内径(R)', `${tm.rimRad.toFixed(0)}`, fmtDiff(tm.rimRad - minM.rimRad), fmtDiff(tm.rimRad - maxM.rimRad)]
  ];

  const tbody = document.getElementById('metricsBody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r[0]}</td>
      <td>${r[1]}</td>
      <td>${r[2]}</td>
      <td>${r[3]}</td>
    </tr>
  `).join('');
}

// --- UI Sync ---
function syncUI() {
  const t = state.target;
  document.getElementById('t_inch').value = t.inch;
  document.getElementById('t_inch_val').textContent = `${t.inch}"`;
  document.getElementById('t_j').value = t.j;
  document.getElementById('t_j_val').textContent = `${t.j.toFixed(1)}J`;
  document.getElementById('t_et').value = t.et;
  document.getElementById('t_et_val').textContent = `${t.et >= 0 ? '+' : ''}${t.et} mm`;
  document.getElementById('t_spacer').value = t.spacer;
  document.getElementById('t_spacer_val').textContent = `${t.spacer} mm`;
  document.getElementById('t_width').value = t.width;
  document.getElementById('t_width_val').textContent = `${t.width} mm`;
  document.getElementById('t_aspect').value = t.aspect;
  document.getElementById('t_aspect_val').textContent = `${t.aspect} %`;
  document.getElementById('t_camber').value = t.camber;
  document.getElementById('t_camber_val').textContent = `${t.camber.toFixed(1)}°`;
  document.getElementById('targetSummary').textContent =
    `${t.inch}×${t.j.toFixed(1)}J ${t.et - t.spacer >= 0 ? '+' : ''}${t.et - t.spacer} / ${t.width}/${t.aspect}R${t.inch}`;

  const mn = state.min;
  document.getElementById('min_inch').value = mn.inch;
  document.getElementById('min_inch_val').textContent = `${mn.inch}"`;
  document.getElementById('min_j').value = mn.j;
  document.getElementById('min_j_val').textContent = `${mn.j.toFixed(1)}J`;
  document.getElementById('min_et').value = mn.et;
  document.getElementById('min_et_val').textContent = `${mn.et >= 0 ? '+' : ''}${mn.et} mm`;
  document.getElementById('min_width').value = mn.width;
  document.getElementById('min_width_val').textContent = `${mn.width} mm`;
  document.getElementById('min_aspect').value = mn.aspect;
  document.getElementById('min_aspect_val').textContent = `${mn.aspect} %`;
  document.getElementById('minSummary').textContent =
    `${mn.inch}×${mn.j.toFixed(1)}J ${mn.et >= 0 ? '+' : ''}${mn.et} / ${mn.width}/${mn.aspect}R${mn.inch}`;

  const mx = state.max;
  document.getElementById('max_inch').value = mx.inch;
  document.getElementById('max_inch_val').textContent = `${mx.inch}"`;
  document.getElementById('max_j').value = mx.j;
  document.getElementById('max_j_val').textContent = `${mx.j.toFixed(1)}J`;
  document.getElementById('max_et').value = mx.et;
  document.getElementById('max_et_val').textContent = `${mx.et >= 0 ? '+' : ''}${mx.et} mm`;
  document.getElementById('max_width').value = mx.width;
  document.getElementById('max_width_val').textContent = `${mx.width} mm`;
  document.getElementById('max_aspect').value = mx.aspect;
  document.getElementById('max_aspect_val').textContent = `${mx.aspect} %`;
  document.getElementById('max_margin').value = mx.margin;
  document.getElementById('max_margin_val').textContent = `${mx.margin} mm`;
  document.getElementById('maxSummary').textContent =
    `${mx.inch}×${mx.j.toFixed(1)}J ${mx.et >= 0 ? '+' : ''}${mx.et} / ${mx.width}/${mx.aspect}R${mx.inch}`;

  updateScene();
}

function parseTireString(str, targetObj) {
  const m = str.trim().match(/(\d{3})\s*\/\s*(\d{2})\s*[Rr]\s*(\d{2})/);
  if (!m) return false;
  targetObj.width = Number(m[1]);
  targetObj.aspect = Number(m[2]);
  targetObj.inch = Number(m[3]);
  return true;
}

// Bind Sliders
const bindRange = (id, obj, key) => {
  document.getElementById(id).addEventListener('input', (e) => {
    obj[key] = Number(e.target.value);
    syncUI();
  });
};

bindRange('t_inch', state.target, 'inch');
bindRange('t_j', state.target, 'j');
bindRange('t_et', state.target, 'et');
bindRange('t_spacer', state.target, 'spacer');
bindRange('t_width', state.target, 'width');
bindRange('t_aspect', state.target, 'aspect');
bindRange('t_camber', state.target, 'camber');

bindRange('min_inch', state.min, 'inch');
bindRange('min_j', state.min, 'j');
bindRange('min_et', state.min, 'et');
bindRange('min_width', state.min, 'width');
bindRange('min_aspect', state.min, 'aspect');

bindRange('max_inch', state.max, 'inch');
bindRange('max_j', state.max, 'j');
bindRange('max_et', state.max, 'et');
bindRange('max_width', state.max, 'width');
bindRange('max_aspect', state.max, 'aspect');
bindRange('max_margin', state.max, 'margin');

// Parse Buttons
document.getElementById('targetParseBtn').addEventListener('click', () => {
  if (parseTireString(document.getElementById('targetTireInput').value, state.target)) syncUI();
});
document.getElementById('minParseBtn').addEventListener('click', () => {
  if (parseTireString(document.getElementById('minTireInput').value, state.min)) syncUI();
});
document.getElementById('maxParseBtn').addEventListener('click', () => {
  if (parseTireString(document.getElementById('maxTireInput').value, state.max)) syncUI();
});

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// Part Mode
document.querySelectorAll('.seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.partMode = btn.dataset.mode;
    updateScene();
  });
});

document.getElementById('crossSectionToggle').addEventListener('change', (e) => {
  state.crossSection = e.target.checked;
  updateScene();
});
document.getElementById('showMinToggle').addEventListener('change', (e) => {
  state.showMin = e.target.checked;
  updateScene();
});
document.getElementById('showMaxToggle').addEventListener('change', (e) => {
  state.showMax = e.target.checked;
  updateScene();
});

// Camera Views
const VIEWS = {
  iso: [650, 320, 720],
  front: [15, 40, 950],
  side: [950, 20, 15],
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

// Presets
document.getElementById('presetSelect').addEventListener('change', (e) => {
  const p = PRESETS[e.target.value];
  if (!p) return;
  Object.assign(state.min, p.min);
  Object.assign(state.max, p.max);
  Object.assign(state.target, p.target);
  syncUI();
});

// Share URL
document.getElementById('shareUrlBtn').addEventListener('click', async () => {
  const t = state.target;
  const mn = state.min;
  const mx = state.max;
  const url = new URL(window.location.href);
  url.searchParams.set('t', `${t.inch},${t.j},${t.et},${t.spacer},${t.width},${t.aspect},${t.camber}`);
  url.searchParams.set('min', `${mn.inch},${mn.j},${mn.et},${mn.width},${mn.aspect}`);
  url.searchParams.set('max', `${mx.inch},${mx.j},${mx.et},${mx.width},${mx.aspect},${mx.margin}`);
  try {
    await navigator.clipboard.writeText(url.toString());
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  } catch {
    prompt('以下のURLをコピーしてください:', url.toString());
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// Render Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

loadFromUrl();
syncUI();
animate();
