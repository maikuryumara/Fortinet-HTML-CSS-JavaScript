
import * as THREE from "three";

// ---------- 基本設定 ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc9ef);
scene.fog = new THREE.Fog(0x9bc9ef, 45, 120);

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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

// ---------- ライト ----------
scene.add(new THREE.HemisphereLight(0xe4f4ff, 0x526342, 2.1));

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(-15, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

// ---------- 地面 ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({
    color: 0x568b48,
    roughness: 1
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(200, 100, 0x294d2b, 0x477343);
grid.position.y = 0.015;
scene.add(grid);

// ---------- 補助関数 ----------
function makeMaterial(color, roughness = 0.75) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function addBox(parent, size, position, material, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    material
  );
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (options.rotation) {
    mesh.rotation.set(...options.rotation);
  }
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, radius, position, material) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 20, 14),
    material
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// ---------- キャラクター ----------
const player = new THREE.Group();
scene.add(player);

const skin = makeMaterial(0xe8ad83);
const hair = makeMaterial(0x39251d);
const jacket = makeMaterial(0x13a8c7);
const jacketDark = makeMaterial(0x08718f);
const pants = makeMaterial(0x26344d);
const shoes = makeMaterial(0x20232b);
const white = makeMaterial(0xf3f5f8);
const accent = makeMaterial(0xffc857);

// 胴体
addBox(player, [0.9, 1.05, 0.48], [0, 1.65, 0], jacket);

// 胸のアクセント
addBox(player, [0.18, 0.65, 0.035], [0, 1.68, -0.25], accent);

// ベルト
addBox(player, [0.92, 0.13, 0.5], [0, 1.13, 0], jacketDark);

// 首と頭
addBox(player, [0.25, 0.22, 0.25], [0, 2.22, 0], skin);
addSphere(player, 0.39, [0, 2.62, 0], skin);

// 髪の上部
addSphere(player, 0.405, [0, 2.81, 0.015], hair);
addBox(player, [0.67, 0.2, 0.64], [0, 2.78, 0], hair);

// 顔はキャラクターの前方（-Z）
addBox(player, [0.48, 0.12, 0.045], [0, 2.66, -0.35], skin);
addBox(player, [0.12, 0.055, 0.035], [-0.13, 2.68, -0.379], white);
addBox(player, [0.12, 0.055, 0.035], [0.13, 2.68, -0.379], white);
addBox(player, [0.055, 0.055, 0.025], [-0.13, 2.68, -0.402], hair);
addBox(player, [0.055, 0.055, 0.025], [0.13, 2.68, -0.402], hair);
addBox(player, [0.17, 0.045, 0.04], [0, 2.48, -0.365], hair);

// 腕
const leftArm = new THREE.Group();
leftArm.position.set(-0.57, 2.0, 0);
player.add(leftArm);
addBox(leftArm, [0.25, 0.72, 0.3], [0, -0.31, 0], jacket);
addSphere(leftArm, 0.15, [0, -0.72, 0], skin);

const rightArm = new THREE.Group();
rightArm.position.set(0.57, 2.0, 0);
player.add(rightArm);
addBox(rightArm, [0.25, 0.72, 0.3], [0, -0.31, 0], jacket);
addSphere(rightArm, 0.15, [0, -0.72, 0], skin);

// 脚
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

// ---------- 建築パーツ ----------
const BUILD_SIZE = 4;
const buildPieces = [];
const buildMaterials = {
  wall: makeMaterial(0x55b9e9),
  floor: makeMaterial(0xd4b17b),
  ramp: makeMaterial(0x62c88a)
};

const previewMaterials = {
  wall: new THREE.MeshStandardMaterial({
    color: 0x5dd8ff,
    transparent: true,
    opacity: 0.48,
    depthWrite: false
  }),
  floor: new THREE.MeshStandardMaterial({
    color: 0xffd078,
    transparent: true,
    opacity: 0.48,
    depthWrite: false
  }),
  ramp: new THREE.MeshStandardMaterial({
    color: 0x72ffad,
    transparent: true,
    opacity: 0.48,
    depthWrite: false
  })
};

let selectedPiece = "wall";
let rotationSteps = 0;
let preview;

function createPiece(type, material, isPreview = false) {
  const group = new THREE.Group();
  const edgeMaterial = isPreview
    ? material
    : makeMaterial(0x293d4a);

  if (type === "wall") {
    addBox(group, [BUILD_SIZE, 3, 0.22], [0, 1.5, 0], material);
    if (!isPreview) {
      addBox(group, [BUILD_SIZE, 0.12, 0.27], [0, 0.08, 0], edgeMaterial);
      for (let x = -1.5; x <= 1.5; x += 1) {
        addBox(group, [0.055, 2.8, 0.24], [x, 1.5, 0], edgeMaterial);
      }
    }
  }

  if (type === "floor") {
    addBox(group, [BUILD_SIZE, 0.18, BUILD_SIZE], [0, 0, 0], material);
    if (!isPreview) {
      addBox(group, [BUILD_SIZE, 0.09, 0.09], [0, -0.08, -1.92], edgeMaterial);
      addBox(group, [BUILD_SIZE, 0.09, 0.09], [0, -0.08, 1.92], edgeMaterial);
      addBox(group, [0.09, 0.09, BUILD_SIZE], [-1.92, -0.08, 0], edgeMaterial);
      addBox(group, [0.09, 0.09, BUILD_SIZE], [1.92, -0.08, 0], edgeMaterial);
    }
  }

  if (type === "ramp") {
    // 傾斜した階段の土台
    const rampBase = new THREE.Mesh(
      new THREE.BoxGeometry(BUILD_SIZE, 0.18, BUILD_SIZE),
      material
    );
    rampBase.position.set(0, 0.75, 0);
    rampBase.rotation.x = -Math.PI / 8;
    rampBase.castShadow = true;
    rampBase.receiveShadow = true;
    group.add(rampBase);

    if (!isPreview) {
      for (let i = 0; i < 5; i++) {
        const step = addBox(
          group,
          [BUILD_SIZE, 0.13, 0.65],
          [0, 0.2 + i * 0.29, 1.45 - i * 0.72],
          edgeMaterial
        );
      }
    }
  }

  return group;
}

function makePreview() {
  if (preview) scene.remove(preview);
  preview = createPiece(selectedPiece, previewMaterials[selectedPiece], true);
  scene.add(preview);
}

makePreview();

// ---------- 建築位置 ----------
function snap(value) {
  return Math.round(value / BUILD_SIZE) * BUILD_SIZE;
}

function updatePreview() {
  // キャラクターの前方に設置位置を作るため、照準が地面に
  // 当たらなくても建築できる。
  const forwardX = -Math.sin(player.rotation.y);
  const forwardZ = -Math.cos(player.rotation.y);
  const distance = 4.5;

  const x = snap(player.position.x + forwardX * distance);
  const z = snap(player.position.z + forwardZ * distance);

  preview.position.set(x, 0, z);
  preview.rotation.set(0, rotationSteps * Math.PI / 2, 0);

  // 建築プレビューがプレイヤーに重なっていないか目で確認できる
  preview.visible = true;
}

function placePiece() {
  const piece = createPiece(selectedPiece, buildMaterials[selectedPiece]);
  piece.position.copy(preview.position);
  piece.rotation.copy(preview.rotation);
  scene.add(piece);
  buildPieces.push(piece);
}

// ---------- 操作UI ----------
const hud = document.createElement("div");
hud.id = "game-hud";
hud.innerHTML = `
  <div class="game-title">BUILD ZONE <span>CREATIVE</span></div>
  <div class="game-help">
    <b>W A S D</b> 移動　 <b>右ドラッグ</b> 視点操作<br>
    <b>1</b> 壁　 <b>2</b> 床　 <b>3</b> 階段<br>
    <b>Q / E</b> 回転　 <b>左クリック</b> 建築
  </div>
  <div class="build-toolbar">
    <button data-piece="wall">1　壁</button>
    <button data-piece="floor">2　床</button>
    <button data-piece="ramp">3　階段</button>
    <button id="rotate-build">回転 Q/E</button>
  </div>
  <div class="crosshair">+</div>
  <div class="build-status">建築モード</div>
`;
Object.assign(hud.style, {
  position: "fixed",
  inset: "0",
  zIndex: "10",
  pointerEvents: "none",
  color: "white",
  fontFamily: "Arial, sans-serif",
  textShadow: "0 2px 4px #102030"
});
document.body.appendChild(hud);

const hudStyle = document.createElement("style");
hudStyle.textContent = `
  #game-hud .game-title {
    position: absolute; top: 18px; left: 22px;
    font-size: 22px; font-weight: 900; letter-spacing: 2px;
  }
  #game-hud .game-title span {
    color: #62e5ff; font-size: 11px; margin-left: 8px;
  }
  #game-hud .game-help {
    position: absolute; top: 60px; left: 22px;
    line-height: 1.8; font-size: 13px;
    background: #101c2bbd; padding: 12px 16px;
    border: 1px solid #ffffff44; border-radius: 10px;
  }
  #game-hud .build-toolbar {
    position: absolute; bottom: 25px; left: 50%;
    transform: translateX(-50%);
    display: flex; gap: 8px; pointer-events: auto;
  }
  #game-hud button {
    border: 1px solid #ffffff88; border-radius: 9px;
    background: #172537e8; color: white;
    padding: 12px 16px; font-size: 14px; font-weight: bold;
    cursor: pointer;
  }
  #game-hud button.active {
    background: #087eae; border-color: #7ce7ff;
    box-shadow: 0 0 0 2px #7ce7ff55;
  }
  #game-hud .crosshair {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 28px; font-weight: bold; color: white;
  }
  #game-hud .build-status {
    position: absolute; right: 22px; top: 22px;
    background: #101c2bcc; padding: 10px 14px;
    border-radius: 8px; font-weight: bold;
  }
`;
document.head.appendChild(hudStyle);

function refreshToolbar() {
  hud.querySelectorAll("[data-piece]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.piece === selectedPiece
    );
  });
  hud.querySelector(".build-status").textContent =
    "建築：" + ({ wall: "壁", floor: "床", ramp: "階段" }[selectedPiece]);
}

hud.querySelectorAll("[data-piece]").forEach(button => {
  button.addEventListener("click", () => {
    selectedPiece = button.dataset.piece;
    makePreview();
    refreshToolbar();
  });
});

hud.querySelector("#rotate-build").addEventListener("click", () => {
  rotationSteps = (rotationSteps + 1) % 4;
});

refreshToolbar();

// ---------- キー入力 ----------
const keys = {};
let looking = false;
let lastMouseX = 0;
let lastMouseY = 0;
let cameraYaw = 0;
let cameraPitch = 0.22;

window.addEventListener("keydown", event => {
  keys[event.code] = true;

  if (event.code === "Digit1") selectedPiece = "wall";
  if (event.code === "Digit2") selectedPiece = "floor";
  if (event.code === "Digit3") selectedPiece = "ramp";

  if (event.code === "KeyQ" || event.code === "KeyE") {
    rotationSteps = (rotationSteps + 1) % 4;
  }

  if (["Space", "ArrowUp", "ArrowDown"].includes(event.code)) {
    event.preventDefault();
  }

  makePreview();
  refreshToolbar();
});

window.addEventListener("keyup", event => {
  keys[event.code] = false;
});

renderer.domElement.addEventListener("contextmenu", event => {
  event.preventDefault();
});

renderer.domElement.addEventListener("pointerdown", event => {
  if (event.button === 2) {
    looking = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
});

window.addEventListener("pointerup", event => {
  if (event.button === 2) looking = false;
});

window.addEventListener("pointermove", event => {
  if (!looking) return;

  const dx = event.clientX - lastMouseX;
  const dy = event.clientY - lastMouseY;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;

  cameraYaw -= dx * 0.006;
  cameraPitch = THREE.MathUtils.clamp(
    cameraPitch + dy * 0.003,
    -0.05,
    0.85
  );
});

renderer.domElement.addEventListener("click", event => {
  if (event.button !== 0) return;
  placePiece();
});

// ---------- カメラと移動 ----------
const clock = new THREE.Clock();
let jumpVelocity = 0;
let playerY = 0;
let isGrounded = true;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.04);

  // WASDはカメラの向きに合わせて移動
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
    player.rotation.y = Math.atan2(-move.x, -move.z);

    // 歩行アニメーション
    const swing = Math.sin(performance.now() * 0.012) * 0.48;
    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;
    leftArm.rotation.x = -swing * 0.7;
    rightArm.rotation.x = swing * 0.7;
  } else {
    leftLeg.rotation.x = THREE.MathUtils.damp(
      leftLeg.rotation.x, 0, 8, dt
    );
    rightLeg.rotation.x = THREE.MathUtils.damp(
      rightLeg.rotation.x, 0, 8, dt
    );
    leftArm.rotation.x = THREE.MathUtils.damp(
      leftArm.rotation.x, 0, 8, dt
    );
    rightArm.rotation.x = THREE.MathUtils.damp(
      rightArm.rotation.x, 0, 8, dt
    );
  }

  // ジャンプ
  if (keys.Space && isGrounded) {
    jumpVelocity = 8;
    isGrounded = false;
  }
  jumpVelocity -= 20 * dt;
  playerY += jumpVelocity * dt;
  if (playerY <= 0) {
    playerY = 0;
    jumpVelocity = 0;
    isGrounded = true;
  }
  player.position.y = playerY;

  // 三人称カメラ
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

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
