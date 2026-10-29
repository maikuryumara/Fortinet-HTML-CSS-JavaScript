
import * as THREE from "three";

// ========================================
// 1. シーン
// ========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91c9f2);
scene.fog = new THREE.Fog(0x91c9f2, 70, 180);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.style.background = "#91c9f2";
document.body.appendChild(renderer.domElement);

renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
renderer.domElement.style.display = "block";
renderer.domElement.style.zIndex = "0";
renderer.domElement.style.touchAction = "none";

// ========================================
// 2. ライトと地面
// ========================================
scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x526342, 2.2));

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(-20, 35, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({
    color: 0x568d47,
    roughness: 1
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(200, 100, 0x294c2b, 0x477544);
grid.position.y = 0;
scene.add(grid);

// ========================================
// 3. キャラクター用素材
// ========================================
function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    ...options
  });
}

const skin = material(0xe8b18b);
const hair = material(0x30221d);
const shirt = material(0x10a8ce);
const shirtDark = material(0x08728f);
const pants = material(0x28334c);
const shoes = material(0x20232a);
const white = material(0xf5f5f5);
const gold = material(0xffc857);

function addBox(parent, size, position, mat) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    mat
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, radius, position, mat) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 20, 16),
    mat
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// ========================================
// 4. キャラクター
// ========================================
const player = new THREE.Group();
scene.add(player);

addBox(player, [0.9, 1.0, 0.48], [0, 1.65, 0], shirt);
addBox(player, [0.92, 0.13, 0.5], [0, 1.13, 0], shirtDark);
addBox(player, [0.16, 0.65, 0.035], [0, 1.65, -0.25], gold);

addBox(player, [0.25, 0.22, 0.25], [0, 2.22, 0], skin);
addSphere(player, 0.39, [0, 2.62, 0], skin);
addSphere(player, 0.405, [0, 2.81, 0.015], hair);
addBox(player, [0.67, 0.2, 0.64], [0, 2.78, 0], hair);

addBox(player, [0.48, 0.12, 0.045], [0, 2.66, -0.35], skin);
addBox(player, [0.12, 0.055, 0.035], [-0.13, 2.68, -0.379], white);
addBox(player, [0.12, 0.055, 0.035], [0.13, 2.68, -0.379], white);
addBox(player, [0.05, 0.05, 0.025], [-0.13, 2.68, -0.402], hair);
addBox(player, [0.05, 0.05, 0.025], [0.13, 2.68, -0.402], hair);

const leftArm = new THREE.Group();
leftArm.position.set(-0.57, 2.0, 0);
player.add(leftArm);
addBox(leftArm, [0.25, 0.72, 0.3], [0, -0.31, 0], shirt);
addSphere(leftArm, 0.15, [0, -0.72, 0], skin);

const rightArm = new THREE.Group();
rightArm.position.set(0.57, 2.0, 0);
player.add(rightArm);
addBox(rightArm, [0.25, 0.72, 0.3], [0, -0.31, 0], shirt);
addSphere(rightArm, 0.15, [0, -0.72, 0], skin);

const leftLeg = new THREE.Group();
leftLeg.position.set(-0.24, 1.05, 0);
player.add(leftLeg);
addBox(leftLeg, [0.34, 0.78, 0.36], [0, -0.35, 0], pants);
addBox(leftLeg, [0.38, 0.2, 0.5], [0, -0.78, -0.06], shoes);

const rightLeg = new THREE.Group();
rightLeg.position.set(0.24, 1.05, 0);
player.add(rightLeg);
addBox(rightLeg, [0.34, 0.78, 0.36], [0, -0.35, 0], pants);
addBox(rightLeg, [0.38, 0.2, 0.5], [0, -0.78, -0.06], shoes);

// ========================================
// 5. 建築パーツ
// ========================================
const BUILD_SIZE = 4;
const placedPieces = [];

const pieceMaterials = {
  wall: material(0x48b8eb),
  floor: material(0xd4b17b),
  ramp: material(0x62c88a)
};

const ghostMaterials = {
  wall: material(0x62dcff, {
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  }),
  floor: material(0xffd078, {
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  }),
  ramp: material(0x72ffad, {
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  })
};

let selectedPiece = "wall";
let rotationSteps = 0;
let preview = null;

function createPiece(type, mat, ghost = false) {
  const group = new THREE.Group();
  const trim = ghost ? mat : material(0x31495a);

  if (type === "wall") {
    addBox(group, [4, 3, 0.22], [0, 1.5, 0], mat);

    if (!ghost) {
      addBox(group, [4, 0.12, 0.28], [0, 0.08, 0], trim);
      for (let x = -1.5; x <= 1.5; x += 1) {
        addBox(group, [0.055, 2.8, 0.25], [x, 1.5, 0], trim);
      }
    }
  }

  if (type === "floor") {
    addBox(group, [4, 0.18, 4], [0, 0, 0], mat);

    if (!ghost) {
      addBox(group, [4, 0.1, 0.1], [0, -0.08, -1.9], trim);
      addBox(group, [4, 0.1, 0.1], [0, -0.08, 1.9], trim);
      addBox(group, [0.1, 0.1, 4], [-1.9, -0.08, 0], trim);
      addBox(group, [0.1, 0.1, 4], [1.9, -0.08, 0], trim);
    }
  }

  if (type === "ramp") {
    for (let i = 0; i < 5; i++) {
      addBox(
        group,
        [4, 0.25, 0.8],
        [0, 0.25 + i * 0.5, 1.6 - i * 0.8],
        mat
      );
    }
  }

  return group;
}

function rebuildPreview() {
  if (preview) scene.remove(preview);

  preview = createPiece(
    selectedPiece,
    ghostMaterials[selectedPiece],
    true
  );

  scene.add(preview);
}

function snap(value) {
  return Math.round(value / BUILD_SIZE) * BUILD_SIZE;
}

function getBuildPosition() {
  const forwardX = -Math.sin(player.rotation.y);
  const forwardZ = -Math.cos(player.rotation.y);

  const x = snap(player.position.x + forwardX * BUILD_SIZE);
  const z = snap(player.position.z + forwardZ * BUILD_SIZE);

  // 建築を地面から始める。建築物の上面も高さ判定する。
  const ray = new THREE.Raycaster();
  ray.set(
    new THREE.Vector3(x, 80, z),
    new THREE.Vector3(0, -1, 0)
  );

  const targets = [ground];

  for (const piece of placedPieces) {
    piece.traverse(object => {
      if (object.isMesh) targets.push(object);
    });
  }

  const hits = ray.intersectObjects(targets, false);
  let y = 0;

  for (const hit of hits) {
    if (!hit.face) continue;

    const normal = hit.face.normal.clone()
      .transformDirection(hit.object.matrixWorld);

    if (normal.y > 0.7) {
      y = Math.max(0, hit.point.y);
      break;
    }
  }

  if (selectedPiece === "wall") y += 1.5;
  if (selectedPiece === "floor") y += 0.09;
  if (selectedPiece === "ramp") y += 0.25;

  return new THREE.Vector3(x, y, z);
}

function updatePreview() {
  if (!preview) return;
  preview.position.copy(getBuildPosition());
  preview.rotation.set(0, rotationSteps * Math.PI / 2, 0);
  preview.visible = true;
}

function placePiece() {
  const piece = createPiece(
    selectedPiece,
    pieceMaterials[selectedPiece]
  );

  piece.position.copy(getBuildPosition());
  piece.rotation.set(0, rotationSteps * Math.PI / 2, 0);

  scene.add(piece);
  placedPieces.push(piece);

  updateStatus("建築数：" + placedPieces.length);
  updatePreview();
}

// ========================================
// 6. 操作UI
// ========================================
const hud = document.createElement("div");
hud.innerHTML = `
  <div class="title">BUILD ZONE <span>CREATIVE</span></div>
  <div class="help">
    <b>W A S D</b> 移動<br>
    <b>SPACE</b> ジャンプ<br>
    <b>右ドラッグ</b> 視点操作<br>
    <b>1 / 2 / 3</b> 壁・床・階段<br>
    <b>Q / E</b> 回転<br>
    <b>左クリック</b> 建築
  </div>
  <div class="crosshair">+</div>
  <div class="toolbar">
    <button data-piece="wall">1 壁</button>
    <button data-piece="floor">2 床</button>
    <button data-piece="ramp">3 階段</button>
    <button id="rotate-button">回転</button>
  </div>
  <div class="status">準備完了</div>
`;

Object.assign(hud.style, {
  position: "fixed",
  inset: "0",
  zIndex: "10",
  pointerEvents: "none",
  color: "white",
  fontFamily: "Arial, sans-serif",
  textShadow: "0 2px 4px #17202b"
});
document.body.appendChild(hud);

const uiStyle = document.createElement("style");
uiStyle.textContent = `
  .title {
    position: absolute; top: 18px; left: 22px;
    font-size: 22px; font-weight: 900; letter-spacing: 2px;
  }
  .title span { color: #62e5ff; font-size: 11px; }
  .help {
    position: absolute; top: 60px; left: 22px;
    padding: 12px 16px; border-radius: 10px;
    background: #101c2bd9; line-height: 1.8; font-size: 13px;
  }
  .crosshair {
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%); font-size: 28px;
  }
  .toolbar {
    position: absolute; bottom: 24px; left: 50%;
    transform: translateX(-50%);
    display: flex; flex-wrap: wrap; justify-content: center;
    gap: 8px; width: max-content; max-width: 96vw;
    pointer-events: auto;
  }
  .toolbar button {
    padding: 12px 16px; border: 1px solid #ffffff88;
    border-radius: 9px; background: #172537ee;
    color: white; font-weight: bold; cursor: pointer;
  }
  .toolbar button.active {
    background: #087eae; border-color: #7ce7ff;
  }
  .status {
    position: absolute; top: 22px; right: 22px;
    padding: 10px 14px; background: #101c2bdd;
    border-radius: 8px; font-weight: bold;
  }
`;
document.head.appendChild(uiStyle);

function updateStatus(message) {
  hud.querySelector(".status").textContent = message;
}

function refreshButtons() {
  hud.querySelectorAll("[data-piece]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.piece === selectedPiece
    );
  });
}

function selectPiece(type) {
  selectedPiece = type;
  rebuildPreview();
  refreshButtons();
  updatePreview();
  updateStatus("選択中：" + type);
}

hud.querySelectorAll("[data-piece]").forEach(button => {
  button.addEventListener("click", event => {
    event.stopPropagation();
    selectPiece(button.dataset.piece);
  });
});

hud.querySelector("#rotate-button").addEventListener("click", event => {
  event.stopPropagation();
  rotationSteps = (rotationSteps + 1) % 4;
  updatePreview();
});


/* ========================================
   8. マウス操作（Mac Safari対応）
======================================== */

let looking = false;
let lastMouseX = 0;
let lastMouseY = 0;

renderer.domElement.style.cursor = "crosshair";

renderer.domElement.addEventListener("contextmenu", event => {
  event.preventDefault();
});

// マウスを押したら視点操作を開始
renderer.domElement.addEventListener("pointerdown", event => {
  if (event.button === 2) {
    looking = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    event.preventDefault();
  }
});

// ボタンを離したら終了
window.addEventListener("pointerup", event => {
  if (event.button === 2) {
    looking = false;
  }
});

// 視点を回転
window.addEventListener("pointermove", event => {
  if (!looking) return;

  const dx = event.clientX - lastMouseX;
  const dy = event.clientY - lastMouseY;

  lastMouseX = event.clientX;
  lastMouseY = event.clientY;

  cameraYaw -= dx * 0.008;

  cameraPitch = THREE.MathUtils.clamp(
    cameraPitch + dy * 0.005,
    -0.3,
    0.9
  );
});



// ========================================
// 10. リサイズ・起動
// ========================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

rebuildPreview();
refreshButtons();
updatePreview();
animate();

console.log("Build Zone started");
