
import * as THREE from "three";

// ======================================
// 1. シーン・カメラ・レンダラー
// ======================================
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

Object.assign(renderer.domElement.style, {
  position: "fixed",
  inset: "0",
  width: "100%",
  height: "100%",
  zIndex: "0",
  display: "block",
  touchAction: "none"
});

document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

// ======================================
// 2. ライティング・地面
// ======================================
scene.add(new THREE.HemisphereLight(0xffffff, 0x58694a, 2));

const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(-20, 40, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x568b47 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.1;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(200, 100, 0x315b35, 0x477744);
grid.position.y = -0.08;
scene.add(grid);

// ======================================
// 3. キャラクター
// ======================================
function makeMaterial(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    ...extra
  });
}

function box(parent, size, position, mat) {
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

const player = new THREE.Group();
scene.add(player);

const skin = makeMaterial(0xe7b18a);
const hair = makeMaterial(0x35251d);
const shirt = makeMaterial(0x08a9d2);
const darkShirt = makeMaterial(0x08748f);
const pants = makeMaterial(0x29334c);
const shoes = makeMaterial(0x20242b);
const white = makeMaterial(0xffffff);

box(player, [0.9, 0.95, 0.45], [0, 1.65, 0], shirt);
box(player, [0.92, 0.12, 0.47], [0, 1.14, 0], darkShirt);
box(player, [0.24, 0.18, 0.25], [0, 2.2, 0], skin);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.38, 20, 16),
  skin
);
head.position.set(0, 2.58, 0);
head.castShadow = true;
player.add(head);

box(player, [0.67, 0.2, 0.62], [0, 2.76, 0.02], hair);
box(player, [0.12, 0.06, 0.035], [-0.13, 2.63, -0.35], white);
box(player, [0.12, 0.06, 0.035], [0.13, 2.63, -0.35], white);

const leftArm = new THREE.Group();
leftArm.position.set(-0.56, 1.98, 0);
player.add(leftArm);
box(leftArm, [0.24, 0.68, 0.29], [0, -0.3, 0], shirt);
box(leftArm, [0.22, 0.2, 0.24], [0, -0.68, 0], skin);

const rightArm = new THREE.Group();
rightArm.position.set(0.56, 1.98, 0);
player.add(rightArm);
box(rightArm, [0.24, 0.68, 0.29], [0, -0.3, 0], shirt);
box(rightArm, [0.22, 0.2, 0.24], [0, -0.68, 0], skin);

const leftLeg = new THREE.Group();
leftLeg.position.set(-0.23, 1.08, 0);
player.add(leftLeg);
box(leftLeg, [0.34, 0.76, 0.34], [0, -0.34, 0], pants);
box(leftLeg, [0.38, 0.2, 0.47], [0, -0.77, -0.05], shoes);

const rightLeg = new THREE.Group();
rightLeg.position.set(0.23, 1.08, 0);
player.add(rightLeg);
box(rightLeg, [0.34, 0.76, 0.34], [0, -0.34, 0], pants);
box(rightLeg, [0.38, 0.2, 0.47], [0, -0.77, -0.05], shoes);

// ======================================
// 4. 建築
// ======================================
const placedPieces = [];
const BUILD_SIZE = 4;
let selectedPiece = "wall";
let rotationSteps = 0;
let preview = null;

const buildMaterials = {
  wall: makeMaterial(0x45b8e8),
  floor: makeMaterial(0xd7b77d),
  ramp: makeMaterial(0x65c987)
};

const ghostMaterials = {
  wall: makeMaterial(0x63dcff, {
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  }),
  floor: makeMaterial(0xffd078, {
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  }),
  ramp: makeMaterial(0x72ffad, {
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  })
};

function createPiece(type, ghost = false) {
  const group = new THREE.Group();
  const mat = ghost ? ghostMaterials[type] : buildMaterials[type];
  const trim = makeMaterial(0x344b5b);

  if (type === "wall") {
    box(group, [4, 3, 0.2], [0, 1.5, 0], mat);
    if (!ghost) {
      for (let x = -1.5; x <= 1.5; x += 1) {
        box(group, [0.06, 2.9, 0.23], [x, 1.5, 0], trim);
      }
    }
  }

  if (type === "floor") {
    box(group, [4, 0.18, 4], [0, 0, 0], mat);
    if (!ghost) {
      box(group, [4, 0.1, 0.1], [0, -0.08, -1.9], trim);
      box(group, [4, 0.1, 0.1], [0, -0.08, 1.9], trim);
      box(group, [0.1, 0.1, 4], [-1.9, -0.08, 0], trim);
      box(group, [0.1, 0.1, 4], [1.9, -0.08, 0], trim);
    }
  }

  if (type === "ramp") {
    for (let i = 0; i < 5; i++) {
      box(
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
  preview = createPiece(selectedPiece, true);
  scene.add(preview);
}

function snap(value) {
  return Math.round(value / BUILD_SIZE) * BUILD_SIZE;
}

function buildPosition() {
  const fx = -Math.sin(player.rotation.y);
  const fz = -Math.cos(player.rotation.y);

  const x = snap(player.position.x + fx * BUILD_SIZE);
  const z = snap(player.position.z + fz * BUILD_SIZE);

  let baseY = 0;

  // 地面と既存建築物の上面を調べる
  const ray = new THREE.Raycaster(
    new THREE.Vector3(x, 80, z),
    new THREE.Vector3(0, -1, 0)
  );

  const meshes = [ground];
  for (const piece of placedPieces) {
    piece.traverse(object => {
      if (object.isMesh) meshes.push(object);
    });
  }

  const hits = ray.intersectObjects(meshes, false);

  for (const hit of hits) {
    if (!hit.face) continue;
    const normal = hit.face.normal.clone()
      .transformDirection(hit.object.matrixWorld);

    if (normal.y > 0.7) {
      baseY = Math.max(0, hit.point.y);
      break;
    }
  }

  if (selectedPiece === "wall") baseY += 1.5;
  if (selectedPiece === "floor") baseY += 0.09;
  if (selectedPiece === "ramp") baseY += 0.25;

  return new THREE.Vector3(x, baseY, z);
}

function updatePreview() {
  if (!preview) return;
  preview.position.copy(buildPosition());
  preview.rotation.y = rotationSteps * Math.PI / 2;
}

function placePiece() {
  const piece = createPiece(selectedPiece);
  piece.position.copy(buildPosition());
  piece.rotation.y = rotationSteps * Math.PI / 2;

  scene.add(piece);
  placedPieces.push(piece);

  updateStatus(`建築数：${placedPieces.length}`);
}

// ======================================
// 5. HUD
// ======================================
const hud = document.createElement("div");

hud.innerHTML = `
  <div class="game-title">BUILD ZONE <small>CREATIVE</small></div>
  <div class="game-help">
    <b>W A S D</b> 移動<br>
    <b>SPACE</b> ジャンプ<br>
    <b>マウスドラッグ</b> カメラ<br>
    <b>1 / 2 / 3</b> 壁・床・階段<br>
    <b>Q / E</b> 回転<br>
    <b>左クリック</b> 建築
  </div>
  <div class="game-crosshair">+</div>
  <div class="game-toolbar">
    <button data-piece="wall">1 壁</button>
    <button data-piece="floor">2 床</button>
    <button data-piece="ramp">3 階段</button>
    <button id="rotate-button">回転</button>
  </div>
  <div class="game-status">準備完了</div>
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

const style = document.createElement("style");
style.textContent = `
  .game-title {
    position: absolute; top: 18px; left: 22px;
    font-size: 22px; font-weight: 900; letter-spacing: 2px;
  }
  .game-title small { color: #62e5ff; font-size: 11px; }
  .game-help {
    position: absolute; top: 58px; left: 22px;
    padding: 12px 16px; border-radius: 10px;
    background: #101c2bdd; line-height: 1.8; font-size: 13px;
  }
  .game-crosshair {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%); font-size: 28px;
  }
  .game-toolbar {
    position: absolute; bottom: 24px; left: 50%;
    transform: translateX(-50%);
    display: flex; gap: 8px; flex-wrap: wrap;
    justify-content: center; max-width: 96vw;
    pointer-events: auto;
  }
  .game-toolbar button {
    border: 1px solid #ffffff88; border-radius: 9px;
    background: #172537ee; color: white;
    padding: 12px 16px; font-weight: bold; cursor: pointer;
  }
  .game-toolbar button.active {
    background: #087eae; border-color: #7ce7ff;
  }
  .game-status {
    position: absolute; top: 20px; right: 20px;
    padding: 10px 14px; background: #101c2bdd;
    border-radius: 8px; font-weight: bold;
  }
`;
document.head.appendChild(style);

function updateStatus(message) {
  const status = hud.querySelector(".game-status");
  if (status) status.textContent = message;
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
  updateStatus(`選択中：${type}`);
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

// ======================================
// 6. 入力変数
// ※ cameraYaw はここで一度だけ定義
// ======================================
const keys = Object.create(null);
let cameraYaw = 0;
let cameraPitch = 0.15;

let looking = false;
let lastMouseX = 0;
let lastMouseY = 0;

window.addEventListener("keydown", event => {
  keys[event.code] = true;

  if (event.code === "Space") event.preventDefault();

  if (event.code === "Digit1") selectPiece("wall");
  if (event.code === "Digit2") selectPiece("floor");
  if (event.code === "Digit3") selectPiece("ramp");

  if (event.code === "KeyQ" || event.code === "KeyE") {
    rotationSteps = (rotationSteps + 1) % 4;
    updatePreview();
  }
});

window.addEventListener("keyup", event => {
  keys[event.code] = false;
});

window.addEventListener("blur", () => {
  for (const key in keys) keys[key] = false;
  looking = false;
});

// マウスを押しながら動かすと視点が回る
renderer.domElement.addEventListener("contextmenu", event => {
  event.preventDefault();
});

renderer.domElement.addEventListener("pointerdown", event => {
  if (event.button === 2 || event.button === 0) {
    looking = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
});

window.addEventListener("pointerup", () => {
  looking = false;
});

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

// 左クリックで建築。ただしツールバー上では建築しない
window.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;

  if (event.target.closest?.(".game-toolbar")) return;

  placePiece();
});

// ======================================
// 7. 移動・ジャンプ
// ======================================
const clock = new THREE.Clock();
let playerY = 0;
let jumpVelocity = 0;
let grounded = true;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.04);

  const forward = new THREE.Vector3(
    -Math.sin(cameraYaw), 0, -Math.cos(cameraYaw)
  );
  const right = new THREE.Vector3(
    Math.cos(cameraYaw), 0, -Math.sin(cameraYaw)
  );

  const move = new THREE.Vector3();

  if (keys.KeyW) move.add(forward);
  if (keys.KeyS) move.sub(forward);
  if (keys.KeyD) move.add(right);
  if (keys.KeyA) move.sub(right);

  if (move.lengthSq() > 0) {
    move.normalize();
    player.position.addScaledVector(move, 7 * dt);

    // キャラクターの正面を移動方向へ向ける
    player.rotation.y = Math.atan2(-move.x, -move.z);

    const swing = Math.sin(performance.now() * 0.012) * 0.4;
    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;
    leftArm.rotation.x = -swing * 0.7;
    rightArm.rotation.x = swing * 0.7;
  } else {
    leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 8, dt);
    rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 8, dt);
    leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, 0, 8, dt);
    rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, 0, 8, dt);
  }

  if (keys.Space && grounded) {
    jumpVelocity = 8;
    grounded = false;
  }

  jumpVelocity -= 20 * dt;
  playerY += jumpVelocity * dt;

  if (playerY <= 0) {
    playerY = 0;
    jumpVelocity = 0;
    grounded = true;
  }

  player.position.y = playerY;

  // カメラをキャラクターの後ろに配置
  const target = player.position.clone();
  target.y += 1.8;

  const distance = 8;
  const horizontal = Math.cos(cameraPitch) * distance;

  camera.position.set(
    target.x + Math.sin(cameraYaw) * horizontal,
    target.y + 2.2 + Math.sin(cameraPitch) * distance,
    target.z + Math.cos(cameraYaw) * horizontal
  );

  camera.lookAt(target);

  updatePreview();
  renderer.render(scene, camera);
}

// ======================================
// 8. ウィンドウサイズ変更
// ======================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ======================================
// 9. 起動
// ======================================
rebuildPreview();
refreshButtons();
updatePreview();
updateStatus("ゲーム起動完了");
animate();

console.log("Build Zone started successfully");
