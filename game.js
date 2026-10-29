
import * as THREE from "three";

// ==========================================
// 1. シーン・カメラ・レンダラー
// ==========================================
const container = document.querySelector("#game");
const message = document.querySelector("#message");
const modeButton = document.querySelector("#mode-button");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#91c9ee");
scene.fog = new THREE.Fog("#91c9ee", 40, 110);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// ==========================================
// 2. ライティング
// ==========================================
scene.add(
  new THREE.HemisphereLight("#e9f5ff", "#65734a", 2)
);

const sunlight = new THREE.DirectionalLight("#fff2d6", 2.5);
sunlight.position.set(-10, 20, 10);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
scene.add(sunlight);

// ==========================================
// 3. 地面
// ==========================================
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({
    color: "#70bd62",
    roughness: 1
  })
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(
  100,
  50,
  "#dff6d4",
  "#9bc98e"
);

grid.position.y = 0.02;
scene.add(grid);

// ==========================================
// 4. プレイヤー設定
// ==========================================
const player = {
  position: new THREE.Vector3(0, 0, 8),
  velocityY: 0,
  speed: 6,
  jumpSpeed: 8,
  height: 1.8,
  onGround: true,
  radius: 0.38,
  yaw: 0
};

const playerModel = new THREE.Group();
scene.add(playerModel);

// キャラクターのパーツを作る
function addCharacterPart(
  geometry,
  color,
  x,
  y,
  z,
  parent = playerModel
) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8
  });

  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  part.castShadow = true;
  part.receiveShadow = true;
  parent.add(part);

  return part;
}

// 胴体
addCharacterPart(
  new THREE.CapsuleGeometry(0.34, 0.65, 4, 8),
  "#2469c8",
  0,
  1.12,
  0
);

// 頭
addCharacterPart(
  new THREE.SphereGeometry(0.25, 16, 12),
  "#edc49c",
  0,
  1.83,
  0
);

// 髪
addCharacterPart(
  new THREE.SphereGeometry(0.255, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  "#44352b",
  0,
  1.94,
  0
);

// 腕と脚は、動かせるようにグループ化
const leftArm = new THREE.Group();
leftArm.position.set(-0.39, 1.42, 0);
playerModel.add(leftArm);

addCharacterPart(
  new THREE.CapsuleGeometry(0.105, 0.48, 3, 6),
  "#2469c8",
  0,
  -0.27,
  0,
  leftArm
);

const rightArm = new THREE.Group();
rightArm.position.set(0.39, 1.42, 0);
playerModel.add(rightArm);

addCharacterPart(
  new THREE.CapsuleGeometry(0.105, 0.48, 3, 6),
  "#2469c8",
  0,
  -0.27,
  0,
  rightArm
);

const leftLeg = new THREE.Group();
leftLeg.position.set(-0.17, 0.65, 0);
playerModel.add(leftLeg);

addCharacterPart(
  new THREE.CapsuleGeometry(0.13, 0.48, 3, 6),
  "#25334c",
  0,
  -0.28,
  0,
  leftLeg
);

const rightLeg = new THREE.Group();
rightLeg.position.set(0.17, 0.65, 0);
playerModel.add(rightLeg);

addCharacterPart(
  new THREE.CapsuleGeometry(0.13, 0.48, 3, 6),
  "#25334c",
  0,
  -0.28,
  0,
  rightLeg
);

// ==========================================
// 5. 三人称カメラ
// ==========================================
let cameraYaw = 0;
let cameraPitch = 0.25;

const CAMERA_DISTANCE = 7;
const CAMERA_SENSITIVITY = 0.003;

const cameraTarget = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();

function updateCamera() {
  cameraTarget.set(
    player.position.x,
    player.position.y + 1.35,
    player.position.z
  );

  const horizontalDistance =
    CAMERA_DISTANCE * Math.cos(cameraPitch);

  cameraOffset.set(
    -Math.sin(cameraYaw) * horizontalDistance,
    Math.sin(cameraPitch) * CAMERA_DISTANCE,
    Math.cos(cameraYaw) * horizontalDistance
  );

  camera.position.copy(cameraTarget).add(cameraOffset);
  camera.lookAt(cameraTarget);
}

updateCamera();

// ==========================================
// 6. マウス視点操作
// ==========================================
let pointerLocked = false;

renderer.domElement.addEventListener("click", () => {
  if (!pointerLocked) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked =
    document.pointerLockElement === renderer.domElement;

  if (pointerLocked) {
    message.textContent =
      "WASD：移動 / Space：ジャンプ / マウス：視点操作";
  } else {
    message.textContent =
      "ゲーム画面をクリックすると操作を再開できます";
  }
});

document.addEventListener("mousemove", (event) => {
  if (!pointerLocked) return;

  cameraYaw -= event.movementX * CAMERA_SENSITIVITY;
  cameraPitch += event.movementY * CAMERA_SENSITIVITY;

  cameraPitch = THREE.MathUtils.clamp(
    cameraPitch,
    -0.15,
    0.8
  );
});

// ==========================================
// 7. 建築システム
// ==========================================
const SIZE = 2;
const BUILD_LIMIT = 45;

const placedObjects = [];

let selectedPiece = "wall";
let buildRotation = 0;
let buildMode = true;
let preview = null;

const materials = {
  wall: new THREE.MeshStandardMaterial({
    color: "#b87945",
    roughness: 0.85
  }),
  floor: new THREE.MeshStandardMaterial({
    color: "#d7a66b",
    roughness: 0.9
  }),
  ramp: new THREE.MeshStandardMaterial({
    color: "#bd8a55",
    roughness: 0.9
  })
};

const previewMaterial = new THREE.MeshStandardMaterial({
  color: "#65ffb0",
  transparent: true,
  opacity: 0.45,
  depthWrite: false
});

function createPiece(type, material) {
  const group = new THREE.Group();

  if (type === "wall") {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(SIZE, 3, 0.18),
      material
    );

    wall.position.y = 1.5;
    group.add(wall);
  }

  if (type === "floor") {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(SIZE, 0.18, SIZE),
      material
    );

    floor.position.y = 0.1;
    group.add(floor);
  }

  if (type === "ramp") {
    // 傾斜した板
    const slope = new THREE.Mesh(
      new THREE.BoxGeometry(SIZE, 0.15, 2.8),
      material
    );

    slope.position.set(0, 0.75, 0);
    slope.rotation.x = -Math.PI / 6;
    group.add(slope);

    // 階段の踏み板
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(SIZE, 0.12, 0.45),
        material
      );

      step.position.set(
        0,
        0.18 + i * 0.25,
        0.9 - i * 0.45
      );

      group.add(step);
    }
  }

  group.rotation.y = buildRotation;
  group.userData.pieceType = type;

  group.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return group;
}

function pieceName(type) {
  return {
    wall: "壁",
    floor: "床",
    ramp: "階段"
  }[type];
}

function disposePreview() {
  if (!preview) return;

  scene.remove(preview);

  preview.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
  });

  preview = null;
}

function updatePreview() {
  disposePreview();

  if (!buildMode) return;

  preview = createPiece(selectedPiece, previewMaterial);

  preview.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });

  scene.add(preview);
}

function selectPiece(type) {
  selectedPiece = type;
  buildRotation = 0;

  document.querySelectorAll(".build-button").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.piece === type
    );
  });

  updatePreview();

  message.textContent =
    `${pieceName(type)}を選択中：照準を合わせてクリック`;
}

// ==========================================
// 8. 建築位置を計算
// ==========================================
const raycaster = new THREE.Raycaster();
const centerPointer = new THREE.Vector2(0, 0);
const groundPlane = new THREE.Plane(
  new THREE.Vector3(0, 1, 0),
  0
);

const hitPoint = new THREE.Vector3();
const buildPosition = new THREE.Vector3();

function getBuildPosition() {
  raycaster.setFromCamera(centerPointer, camera);

  if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
    return false;
  }

  buildPosition.set(
    Math.round(hitPoint.x / SIZE) * SIZE,
    0,
    Math.round(hitPoint.z / SIZE) * SIZE
  );

  return (
    Math.abs(buildPosition.x) <= BUILD_LIMIT &&
    Math.abs(buildPosition.z) <= BUILD_LIMIT
  );
}

function placePiece() {
  if (!buildMode) return;

  if (!getBuildPosition()) {
    message.textContent =
      "建築できる場所に照準を合わせてください";
    return;
  }

  const piece = createPiece(
    selectedPiece,
    materials[selectedPiece]
  );

  piece.position.copy(buildPosition);
  piece.rotation.y = buildRotation;

  scene.add(piece);
  placedObjects.push(piece);

  message.textContent =
    `${pieceName(selectedPiece)}を設置しました（${placedObjects.length}個）`;
}

// ==========================================
// 9. キーボード
// ==========================================
const keys = Object.create(null);

window.addEventListener("keydown", (event) => {
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      event.code
    )
  ) {
    event.preventDefault();
  }

  keys[event.code] = true;

  if (event.repeat) return;

  if (event.code === "Digit1") selectPiece("wall");
  if (event.code === "Digit2") selectPiece("floor");
  if (event.code === "Digit3") selectPiece("ramp");

  if (event.code === "KeyQ") {
    buildRotation += Math.PI / 2;

    if (preview) {
      preview.rotation.y = buildRotation;
    }

    message.textContent = "建築物を90度回転しました";
  }

  if (
    event.code === "Space" &&
    player.onGround
  ) {
    player.velocityY = player.jumpSpeed;
    player.onGround = false;
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

window.addEventListener("blur", () => {
  for (const key in keys) {
    keys[key] = false;
  }
});

// ==========================================
// 10. 建築メニュー
// ==========================================
document.querySelectorAll(".build-button").forEach((button) => {
  button.addEventListener("click", () => {
    selectPiece(button.dataset.piece);
  });
});

modeButton.addEventListener("click", () => {
  buildMode = !buildMode;

  modeButton.textContent = buildMode
    ? "建築モード：ON"
    : "建築モード：OFF";

  modeButton.style.background = buildMode
    ? "#176e52"
    : "#596273";

  updatePreview();

  message.textContent = buildMode
    ? "建築モードを有効にしました"
    : "建築モードを無効にしました";
});

// ==========================================
// 11. 移動と簡易衝突判定
// ==========================================
const forwardVector = new THREE.Vector3();
const rightVector = new THREE.Vector3();
const moveVector = new THREE.Vector3();

function canMoveTo(x, z) {
  for (const object of placedObjects) {
    if (object.userData.pieceType !== "wall") continue;

    const dx = x - object.position.x;
    const dz = z - object.position.z;

    // 壁の向きを考慮したローカル座標
    const cos = Math.cos(object.rotation.y);
    const sin = Math.sin(object.rotation.y);

    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;

    if (
      Math.abs(localX) < SIZE / 2 + player.radius &&
      Math.abs(localZ) < 0.18 + player.radius
    ) {
      return false;
    }
  }

  return true;
}

function updatePlayer(delta) {
  if (!pointerLocked) return;

  const forwardInput =
    Number(keys.KeyW) - Number(keys.KeyS);

  const rightInput =
    Number(keys.KeyD) - Number(keys.KeyA);

  forwardVector.set(
    Math.sin(cameraYaw),
    0,
    -Math.cos(cameraYaw)
  );

  rightVector.set(
    Math.cos(cameraYaw),
    0,
    Math.sin(cameraYaw)
  );

  moveVector.set(0, 0, 0);
  moveVector.addScaledVector(forwardVector, forwardInput);
  moveVector.addScaledVector(rightVector, rightInput);

  const moving = moveVector.lengthSq() > 0;

  if (moving) {
    moveVector.normalize();

    const nextX =
      player.position.x + moveVector.x * player.speed * delta;

    const nextZ =
      player.position.z + moveVector.z * player.speed * delta;

    if (canMoveTo(nextX, player.position.z)) {
      player.position.x = nextX;
    }

    if (canMoveTo(player.position.x, nextZ)) {
      player.position.z = nextZ;
    }

    player.yaw = Math.atan2(moveVector.x, moveVector.z);

    leftArm.rotation.x = Math.sin(performance.now() * 0.012) * 0.6;
    rightArm.rotation.x = -leftArm.rotation.x;
    leftLeg.rotation.x = -leftArm.rotation.x;
    rightLeg.rotation.x = leftArm.rotation.x;
  } else {
    leftArm.rotation.x = THREE.MathUtils.damp(
      leftArm.rotation.x, 0, 8, delta
    );
    rightArm.rotation.x = THREE.MathUtils.damp(
      rightArm.rotation.x, 0, 8, delta
    );
    leftLeg.rotation.x = THREE.MathUtils.damp(
      leftLeg.rotation.x, 0, 8, delta
    );
    rightLeg.rotation.x = THREE.MathUtils.damp(
      rightLeg.rotation.x, 0, 8, delta
    );
  }

  // ジャンプと重力
  player.velocityY -= 20 * delta;
  player.position.y += player.velocityY * delta;

  if (player.position.y <= 0) {
    player.position.y = 0;
    player.velocityY = 0;
    player.onGround = true;
  }

  player.position.x = THREE.MathUtils.clamp(
    player.position.x, -BUILD_LIMIT, BUILD_LIMIT
  );

  player.position.z = THREE.MathUtils.clamp(
    player.position.z, -BUILD_LIMIT, BUILD_LIMIT
  );

  playerModel.position.copy(player.position);
  playerModel.rotation.y = player.yaw;
}

// ==========================================
// 12. 画面サイズ変更
// ==========================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
});

// ==========================================
// 13. メインループ
// ==========================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  updatePlayer(delta);
  updateCamera();

  if (preview && getBuildPosition()) {
    preview.position.copy(buildPosition);
    preview.rotation.y = buildRotation;
  }

  renderer.render(scene, camera);
}

updatePreview();
animate();
