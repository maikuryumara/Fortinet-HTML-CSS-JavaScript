
import * as THREE from "three";

// ========================================
// 1. シーン・カメラ・レンダラー
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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

// ========================================
// 2. ライト
// ========================================
scene.add(
  new THREE.HemisphereLight(0xeaf6ff, 0x526342, 2.2)
);

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(-20, 35, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

// ========================================
// 3. 地面
// ========================================
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x568d47,
  roughness: 1
});

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  groundMaterial
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
ground.position.y = -0.05;
scene.add(ground);

const grid = new THREE.GridHelper(200, 100, 0x294c2b, 0x477544);
grid.position.y = 0;
scene.add(grid);

// ========================================
// 4. マテリアルとパーツ作成
// ========================================
function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    ...extra
  });
}

const materials = {
  skin: mat(0xe8b18b),
  hair: mat(0x30221d),
  shirt: mat(0x10a8ce),
  shirtDark: mat(0x08728f),
  pants: mat(0x28334c),
  shoes: mat(0x20232a),
  white: mat(0xf5f5f5),
  gold: mat(0xffc857)
};

function addBox(parent, size, position, material) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    material
  );

  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, radius, position, material) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 20, 16),
    material
  );

  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// ========================================
// 5. キャラクター
// ========================================
const player = new THREE.Group();
scene.add(player);

addBox(player, [0.9, 1.0, 0.48], [0, 1.65, 0], materials.shirt);
addBox(player, [0.92, 0.13, 0.5], [0, 1.13, 0], materials.shirtDark);
addBox(player, [0.16, 0.65, 0.035], [0, 1.65, -0.25], materials.gold);

addBox(player, [0.25, 0.22, 0.25], [0, 2.22, 0], materials.skin);
addSphere(player, 0.39, [0, 2.62, 0], materials.skin);
addSphere(player, 0.405, [0, 2.81, 0.015], materials.hair);
addBox(player, [0.67, 0.2, 0.64], [0, 2.78, 0], materials.hair);

// 顔はキャラクターの前方（-Z）
addBox(player, [0.48, 0.12, 0.045], [0, 2.66, -0.35], materials.skin);
addBox(player, [0.12, 0.055, 0.035], [-0.13, 2.68, -0.379], materials.white);
addBox(player, [0.12, 0.055, 0.035], [0.13, 2.68, -0.379], materials.white);
addBox(player, [0.05, 0.05, 0.025], [-0.13, 2.68, -0.402], materials.hair);
addBox(player, [0.05, 0.05, 0.025], [0.13, 2.68, -0.402], materials.hair);

const leftArm = new THREE.Group();
leftArm.position.set(-0.57, 2.0, 0);
player.add(leftArm);
addBox(leftArm, [0.25, 0.72, 0.3], [0, -0.31, 0], materials.shirt);
addSphere(leftArm, 0.15, [0, -0.72, 0], materials.skin);

const rightArm = new THREE.Group();
rightArm.position.set(0.57, 2.0, 0);
player.add(rightArm);
addBox(rightArm, [0.25, 0.72, 0.3], [0, -0.31, 0], materials.shirt);
addSphere(rightArm, 0.15, [0, -0.72, 0], materials.skin);

const leftLeg = new THREE.Group();
leftLeg.position.set(-0.24, 1.05, 0);
player.add(leftLeg);
addBox(leftLeg, [0.34, 0.78, 0.36], [0, -0.35, 0], materials.pants);
addBox(leftLeg, [0.38, 0.2, 0.5], [0, -0.78, -0.06], materials.shoes);

const rightLeg = new THREE.Group();
rightLeg.position.set(0.24, 1.05, 0);
player.add(rightLeg);
addBox(rightLeg, [0.34, 0.78, 0.36], [0, -0.35, 0], materials.pants);
addBox(rightLeg, [0.38, 0.2, 0.5], [0, -0.78, -0.06], materials.shoes);

// ========================================
// 6. 建築システム
// ========================================
const BUILD_SIZE = 4;
const placedPieces = [];

const pieceMaterials = {
  wall: mat(0x48b8eb),
  floor: mat(0xd4b17b),
  ramp: mat(0x62c88a)
};

const previewMaterials = {
  wall: mat(0x62dcff, {
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  }),
  floor: mat(0xffd078, {
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  }),
  ramp: mat(0x72ffad, {
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  })
};

let selectedPiece = "wall";
let rotationSteps = 0;
let preview = null;

function createPiece(type, material, isPreview = false) {
  const group = new THREE.Group();
  const trim = isPreview ? material : mat(0x31495a);

  if (type === "wall") {
    addBox(group, [BUILD_SIZE, 3, 0.22], [0, 1.5, 0], material);

    if (!isPreview) {
      addBox(group, [4, 0.12, 0.28], [0, 0.08, 0], trim);

      for (let x = -1.5; x <= 1.5; x += 1) {
        addBox(group, [0.055, 2.8, 0.25], [x, 1.5, 0], trim);
      }
    }
  }

  if (type === "floor") {
    addBox(group, [BUILD_SIZE, 0.18, BUILD_SIZE], [0, 0, 0], material);

    if (!isPreview) {
      addBox(group, [4, 0.1, 0.1], [0, -0.08, -1.9], trim);
      addBox(group, [4, 0.1, 0.1], [0, -0.08, 1.9], trim);
      addBox(group, [0.1, 0.1, 4], [-1.9, -0.08, 0], trim);
      addBox(group, [0.1, 0.1, 4], [1.9, -0.08, 0], trim);
    }
  }

  if (type === "ramp") {
    // 階段を5段作る
    for (let i = 0; i < 5; i++) {
      addBox(
        group,
        [BUILD_SIZE, 0.25, 0.8],
        [0, 0.25 + i * 0.5, 1.6 - i * 0.8],
        material
      );
    }
  }

  return group;
}

function rebuildPreview() {
  if (preview) scene.remove(preview);

  preview = createPiece(
    selectedPiece,
    previewMaterials[selectedPiece],
    true
  );

  scene.add(preview);
}

function snap(value) {
  return Math.round(value / BUILD_SIZE) * BUILD_SIZE;
}

// クリックするたびに建築位置を再計算する。
// これにより、プレビュー更新のタイミングに依存しにくくする。
function getBuildPosition() {
  const forwardX = -Math.sin(player.rotation.y);
  const forwardZ = -Math.cos(player.rotation.y);

  const x = snap(player.position.x + forwardX * BUILD_SIZE);
  const z = snap(player.position.z + forwardZ * BUILD_SIZE);

  // 地面と既存建築物の上面の高さを調べる
  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3(x, 80, z);
  ray.set(origin, new THREE.Vector3(0, -1, 0));

  const targets = [ground];

  for (const piece of placedPieces) {
    piece.traverse(object => {
      if (object.isMesh) targets.push(object);
    });
  }

  const hits = ray.intersectObjects(targets, false);
  let surfaceY = 0;

  for (const hit of hits) {
    if (!hit.face) continue;

    const normal = hit.face.normal.clone()
      .transformDirection(hit.object.matrixWorld);

    if (normal.y > 0.7) {
      surfaceY = Math.max(0, hit.point.y);
      break;
    }
  }

  const position = new THREE.Vector3(x, surfaceY, z);

  if (selectedPiece === "wall") position.y += 1.5;
  if (selectedPiece === "floor") position.y += 0.09;

  return position;
}

function updatePreview() {
  if (!preview) return;

  preview.position.copy(getBuildPosition());
  preview.rotation.set(0, rotationSteps * Math.PI / 2, 0);
  preview.visible = true;
}

function placePiece() {
  const piece = createPiece(selectedPiece, pieceMaterials[selectedPiece]);

  // クリック時に設置位置を直接計算する
  piece.position.copy(getBuildPosition());
  piece.rotation.set(0, rotationSteps * Math.PI / 2, 0);

  scene.add(piece);
  placedPieces.push(piece);

  updatePreview();
  updateStatus("建築しました！");
}

// ========================================
// 7. HUD・操作ボタン
// ========================================
const hud = document.createElement("div");
hud.id = "game-hud";
hud.innerHTML = `
  <div class="title">BUILD ZONE <span>CREATIVE</span></div>

  <div class="help">
    <b>W A S D</b> 移動<br>
    <b>SPACE</b> ジャンプ<br>
    <b>右ドラッグ</b> 視点変更<br>
    <b>1 / 2 / 3</b> 建築パーツ<br>
    <b>Q / E</b> 回転<br>
    <b>左クリック</b> 建築
  </div>

  <div class="crosshair">+</div>

  <div class="toolbar">
    <button data-piece="wall">1　壁</button>
    <button data-piece="floor">2　床</button>
    <button data-piece="ramp">3　階段</button>
    <button id="rotate-button">回転</button>
  </div>

  <div class="status">建築：壁</div>
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
  #game-hud .title {
    position: absolute;
    top: 18px;
    left: 22px;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 2px;
  }

  #game-hud .title span {
    color: #62e5ff;
    font-size: 11px;
  }

  #game-hud .help {
    position: absolute;
    top: 60px;
    left: 22px;
    padding: 12px 16px;
    border-radius: 10px;
    background: #101c2bd9;
    line-height: 1.8;
    font-size: 13px;
  }

  #game-hud .crosshair {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 28px;
    font-weight: bold;
  }

  #game-hud .toolbar {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    width: max-content;
    max-width: 96vw;
    pointer-events: auto;
  }

  #game-hud button {
    padding: 12px 16px;
    border: 1px solid #ffffff88;
    border-radius: 9px;
    background: #172537ee;
    color: white;
    font-weight: bold;
    cursor: pointer;
  }

  #game-hud button.active {
    background: #087eae;
    border-color: #7ce7ff;
  }

  #game-hud .status {
    position: absolute;
    top: 22px;
    right: 22px;
    padding: 10px 14px;
    background: #101c2bdd;
    border-radius: 8px;
    font-weight: bold;
  }
`;
document.head.appendChild(style);

function updateStatus(message) {
  hud.querySelector(".status").textContent = message;
}

function refreshToolbar() {
  hud.querySelectorAll("[data-piece]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.piece === selectedPiece
    );
  });

  updateStatus(
    "建築：" +
    ({ wall: "壁", floor: "床", ramp: "階段" }[selectedPiece])
  );
}

function selectPiece(type) {
  selectedPiece = type;
  rebuildPreview();
  refreshToolbar();
  updatePreview();
}

hud.querySelectorAll("[data-piece]").forEach(button => {
  button.addEventListener("click", () => {
    selectPiece(button.dataset.piece);
  });
});

hud.querySelector("#rotate-button").addEventListener("click", () => {
  rotationSteps = (rotationSteps + 1) % 4;
  updatePreview();
});

// ========================================
// 8. キーボード・マウス
// ========================================
const keys = {};
let looking = false;
let lastMouseX = 0;
let lastMouseY = 0;
let cameraYaw = 0;
let cameraPitch = 0.15;

window.addEventListener("keydown", event => {
  keys[event.code] = true;

  if (event.code === "Digit1") selectPiece("wall");
  if (event.code === "Digit2") selectPiece("floor");
  if (event.code === "Digit3") selectPiece("ramp");

  if (event.code === "KeyQ" || event.code === "KeyE") {
    rotationSteps = (rotationSteps + 1) % 4;
    updatePreview();
  }

  if (event.code === "Space") event.preventDefault();
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

  if (event.button === 0) {
    // クリックが届いたか画面に表示する
    const status = document.querySelector("#game-hud .status");

    if (status) {
      status.textContent = "クリック検出！ 建築中...";
      status.style.background = "#087eae";
    }

    placePiece();

    // 建築数を確認する
    if (status) {
      status.textContent =
        "クリック検出！ 建築数：" + placedPieces.length;
    }
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
    0.8
  );
});

// ========================================
// 9. 移動・ジャンプ・カメラ
// ========================================
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
    player.rotation.y = Math.atan2(-move.x, -move.z);

    const swing = Math.sin(performance.now() * 0.012) * 0.45;
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

// ========================================
// 10. リサイズ・起動
// ========================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

rebuildPreview();
refreshToolbar();
animate();

console.log("Build Zone: ゲーム起動完了");
