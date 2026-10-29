
import * as THREE from "three";

// ============================================
// 1. Scene / Camera / Renderer
// ============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91c9f2);
scene.fog = new THREE.Fog(0x91c9f2, 80, 200);

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
  display: "block",
  zIndex: "0",
  touchAction: "none"
});

document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

// ============================================
// 2. Lighting / Ground
// ============================================
scene.add(
  new THREE.HemisphereLight(0xeaf6ff, 0x526342, 2.1)
);

const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(-20, 40, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const GROUND_Y = -0.1;
const GRID_SIZE = 4;
const LEVEL_HEIGHT = 3;

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({
    color: 0x568b47,
    roughness: 1
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = GROUND_Y;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(
  200, 50, 0x315b35, 0x477744
);
grid.position.y = GROUND_Y + 0.01;
scene.add(grid);

// ============================================
// 3. Materials / Character
// ============================================
function makeMaterial(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    ...extra
  });
}

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

const player = new THREE.Group();
scene.add(player);

const skin = makeMaterial(0xe7b18a);
const hair = makeMaterial(0x35251d);
const shirt = makeMaterial(0x08a9d2);
const darkShirt = makeMaterial(0x08748f);
const pants = makeMaterial(0x29334c);
const shoes = makeMaterial(0x20242b);
const white = makeMaterial(0xffffff);

addBox(player, [0.9, 0.95, 0.45], [0, 1.65, 0], shirt);
addBox(player, [0.92, 0.12, 0.47], [0, 1.14, 0], darkShirt);
addBox(player, [0.24, 0.18, 0.25], [0, 2.2, 0], skin);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.38, 20, 16),
  skin
);
head.position.set(0, 2.58, 0);
head.castShadow = true;
player.add(head);

addBox(player, [0.67, 0.2, 0.62], [0, 2.76, 0.02], hair);
addBox(player, [0.12, 0.06, 0.035], [-0.13, 2.63, -0.35], white);
addBox(player, [0.12, 0.06, 0.035], [0.13, 2.63, -0.35], white);

const leftArm = new THREE.Group();
leftArm.position.set(-0.56, 1.98, 0);
player.add(leftArm);
addBox(leftArm, [0.24, 0.68, 0.29], [0, -0.3, 0], shirt);
addBox(leftArm, [0.22, 0.2, 0.24], [0, -0.68, 0], skin);

const rightArm = new THREE.Group();
rightArm.position.set(0.56, 1.98, 0);
player.add(rightArm);
addBox(rightArm, [0.24, 0.68, 0.29], [0, -0.3, 0], shirt);
addBox(rightArm, [0.22, 0.2, 0.24], [0, -0.68, 0], skin);

const leftLeg = new THREE.Group();
leftLeg.position.set(-0.23, 1.08, 0);
player.add(leftLeg);
addBox(leftLeg, [0.34, 0.76, 0.34], [0, -0.34, 0], pants);
addBox(leftLeg, [0.38, 0.2, 0.47], [0, -0.77, -0.05], shoes);

const rightLeg = new THREE.Group();
rightLeg.position.set(0.23, 1.08, 0);
player.add(rightLeg);
addBox(rightLeg, [0.34, 0.76, 0.34], [0, -0.34, 0], pants);
addBox(rightLeg, [0.38, 0.2, 0.47], [0, -0.77, -0.05], shoes);

// ============================================
// 4. Building System
// ============================================
const buildMaterials = {
  wall: makeMaterial(0x45b8e8),
  floor: makeMaterial(0xd7b77d),
  ramp: makeMaterial(0x65c987)
};

const ghostMaterials = {
  wall: makeMaterial(0x63dcff, {
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  }),
  floor: makeMaterial(0xffd078, {
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  }),
  ramp: makeMaterial(0x72ffad, {
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  })
};

const trimMaterial = makeMaterial(0x344b5b);

const placedPieces = [];
const occupiedPieces = new Set();

let selectedPiece = "wall";
let rotationSteps = 0;
let preview = null;

function createPiece(type, ghost = false) {
  const group = new THREE.Group();
  const mat = ghost ? ghostMaterials[type] : buildMaterials[type];

  if (type === "wall") {
    // Centered on the grid edge, with the bottom at local Y = 0.
    addBox(group, [4, 3, 0.16], [0, 1.5, 0], mat);

    if (!ghost) {
      for (let x = -1.5; x <= 1.5; x += 1) {
        addBox(
          group,
          [0.055, 2.9, 0.19],
          [x, 1.5, 0],
          trimMaterial
        );
      }
      addBox(
        group,
        [4, 0.09, 0.2],
        [0, 0.06, 0],
        trimMaterial
      );
    }
  }

  if (type === "floor") {
    // Top face is exactly at local Y = 0.
    addBox(group, [4, 0.18, 4], [0, -0.09, 0], mat);

    if (!ghost) {
      addBox(group, [4, 0.08, 0.08], [0, -0.15, -1.9], trimMaterial);
      addBox(group, [4, 0.08, 0.08], [0, -0.15, 1.9], trimMaterial);
      addBox(group, [0.08, 0.08, 4], [-1.9, -0.15, 0], trimMaterial);
      addBox(group, [0.08, 0.08, 4], [1.9, -0.15, 0], trimMaterial);
    }
  }

  if (type === "ramp") {
    // Five ascending steps. Local forward is -Z.
    for (let i = 0; i < 5; i++) {
      const stepDepth = 0.8;
      const stepHeight = 0.6;

      addBox(
        group,
        [4, stepHeight, stepDepth],
        [
          0,
          stepHeight / 2 + i * stepHeight,
          1.6 - i * stepDepth
        ],
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

// Snap all horizontal positions to the same 4-unit grid.
function snap(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function getPlayerCell() {
  return {
    x: snap(player.position.x),
    z: snap(player.position.z)
  };
}

// Round the character's facing direction to the nearest cardinal direction.
function getFacing() {
  const angle = player.rotation.y;
  const step = Math.round(angle / (Math.PI / 2));
  const rotation = step * Math.PI / 2;

  const fx = -Math.sin(rotation);
  const fz = -Math.cos(rotation);

  return {
    x: Math.round(fx),
    z: Math.round(fz),
    rotation
  };
}

// Find the highest walkable-like surface under a grid cell.
const surfaceRay = new THREE.Raycaster();

function getSurfaceHeight(x, z) {
  surfaceRay.set(
    new THREE.Vector3(x, 100, z),
    new THREE.Vector3(0, -1, 0)
  );

  const meshes = [ground];

  for (const piece of placedPieces) {
    piece.traverse(object => {
      if (object.isMesh) meshes.push(object);
    });
  }

  const hits = surfaceRay.intersectObjects(meshes, false);
  let highestY = GROUND_Y;

  for (const hit of hits) {
    if (!hit.face) continue;

    const normal = hit.face.normal.clone()
      .transformDirection(hit.object.matrixWorld);

    // Ignore vertical faces; only count upward-facing surfaces.
    if (normal.y > 0.7 && hit.point.y > highestY) {
      highestY = hit.point.y;
    }
  }

  const level = Math.max(
    0,
    Math.round((highestY - GROUND_Y) / LEVEL_HEIGHT)
  );

  return level * LEVEL_HEIGHT;
}

// Every piece uses the same cell coordinates and level height.
function getBuildTransform() {
  const cell = getPlayerCell();
  const facing = getFacing();

  let x;
  let z;
  let baseY;
  let rotationY;

  if (selectedPiece === "wall") {
    // Place the wall on the edge of the player's current cell.
    x = cell.x + facing.x * (GRID_SIZE / 2);
    z = cell.z + facing.z * (GRID_SIZE / 2);

    baseY = getSurfaceHeight(cell.x, cell.z);

    // A wall is thin along local Z. Turn it for X-facing edges.
    rotationY = Math.abs(facing.x) === 1 ? Math.PI / 2 : 0;
  } else {
    // Floors and ramps occupy the next cell in front.
    x = cell.x + facing.x * GRID_SIZE;
    z = cell.z + facing.z * GRID_SIZE;

    baseY = getSurfaceHeight(x, z);
    rotationY = facing.rotation;
  }

  rotationY += rotationSteps * Math.PI / 2;

  return {
    x,
    z,
    baseY,
    rotationY,
    cellX: Math.round(x / GRID_SIZE),
    cellZ: Math.round(z / GRID_SIZE),
    level: Math.round(baseY / LEVEL_HEIGHT)
  };
}

function updatePreview() {
  if (!preview) return;

  const transform = getBuildTransform();

  preview.position.set(
    transform.x,
    transform.baseY,
    transform.z
  );
  preview.rotation.y = transform.rotationY;
}

function getPieceKey(type, transform) {
  // Position is quantized, so identical pieces cannot stack accidentally.
  const x = Math.round(transform.x * 100);
  const z = Math.round(transform.z * 100);
  const y = Math.round(transform.baseY * 100);
  const rotation = Math.round(
    (transform.rotationY % (Math.PI * 2)) * 100
  );

  return `${type}:${x}:${y}:${z}:${rotation}`;
}

function placePiece() {
  const transform = getBuildTransform();
  const key = getPieceKey(selectedPiece, transform);

  if (occupiedPieces.has(key)) {
    updateStatus("ここには既に建築があります");
    return;
  }

  const piece = createPiece(selectedPiece, false);

  piece.position.set(
    transform.x,
    transform.baseY,
    transform.z
  );
  piece.rotation.y = transform.rotationY;
  piece.userData.buildType = selectedPiece;

  scene.add(piece);
  placedPieces.push(piece);
  occupiedPieces.add(key);

  updateStatus(`建築数：${placedPieces.length}`);
  updatePreview();
}

// ============================================
// 5. HUD
// ============================================
const hud = document.createElement("div");

hud.innerHTML = `
  <div class="game-title">BUILD ZONE <small>CREATIVE</small></div>

  <div class="game-help">
    <b>W A S D</b> 移動<br>
    <b>SPACE</b> ジャンプ<br>
    <b>右ドラッグ</b> カメラ<br>
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

  <div class="game-status">ゲーム起動中</div>
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
    position: absolute;
    top: 18px;
    left: 22px;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 2px;
  }

  .game-title small {
    color: #62e5ff;
    font-size: 11px;
  }

  .game-help {
    position: absolute;
    top: 58px;
    left: 22px;
    padding: 12px 16px;
    border-radius: 10px;
    background: #101c2bdd;
    line-height: 1.8;
    font-size: 13px;
  }

  .game-crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 28px;
  }

  .game-toolbar {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 96vw;
    pointer-events: auto;
  }

  .game-toolbar button {
    border: 1px solid #ffffff88;
    border-radius: 9px;
    background: #172537ee;
    color: white;
    padding: 12px 16px;
    font-weight: bold;
    cursor: pointer;
  }

  .game-toolbar button.active {
    background: #087eae;
    border-color: #7ce7ff;
  }

  .game-status {
    position: absolute;
    top: 20px;
    right: 20px;
    padding: 10px 14px;
    background: #101c2bdd;
    border-radius: 8px;
    font-weight: bold;
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

// ============================================
// 6. Input / Camera
// ============================================
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

  if (event.code === "KeyQ") {
    rotationSteps = (rotationSteps + 3) % 4;
    updatePreview();
  }

  if (event.code === "KeyE") {
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

renderer.domElement.addEventListener("contextmenu", event => {
  event.preventDefault();
});

// Right mouse drag rotates the camera.
renderer.domElement.addEventListener("pointerdown", event => {
  if (event.button !== 2) return;

  looking = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
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

window.addEventListener("pointerup", event => {
  if (event.button === 2) looking = false;
});

// Left click places a piece, except on toolbar buttons.
renderer.domElement.addEventListener("pointerup", event => {
  if (event.button !== 0) return;
  if (event.target.closest?.(".game-toolbar")) return;

  placePiece();
});

// ============================================
// 7. Movement / Jump / Camera Follow
// ============================================
const clock = new THREE.Clock();

let playerY = 0;
let jumpVelocity = 0;
let grounded = true;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.04);

  const forward = new THREE.Vector3(
    -Math.sin(cameraYaw),
    0,
    -Math.cos(cameraYaw)
  );

  const right = new THREE.Vector3(
    Math.cos(cameraYaw),
    0,
    -Math.sin(cameraYaw)
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

    const swing = Math.sin(performance.now() * 0.012) * 0.4;
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

// ============================================
// 8. Resize / Start
// ============================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

rebuildPreview();
refreshButtons();
updatePreview();
updateStatus("ゲーム起動完了");
animate();

console.log("Build Zone: building system ready");
