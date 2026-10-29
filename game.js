
import * as THREE from "three";
import { PointerLockControls } from
  "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/PointerLockControls.js";

// =====================================
// 基本設定
// =====================================
const container = document.querySelector("#game");
const message = document.querySelector("#message");
const modeButton = document.querySelector("#mode-button");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#91c9ee");
scene.fog = new THREE.Fog("#91c9ee", 45, 120);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

camera.position.set(0, 1.7, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// =====================================
// ライト
// =====================================
scene.add(
  new THREE.HemisphereLight("#e6f5ff", "#637a50", 2)
);

const sun = new THREE.DirectionalLight("#fff2d5", 2.5);
sun.position.set(15, 25, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// =====================================
// 地面とグリッド
// =====================================
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({
    color: "#6dba64",
    roughness: 1
  })
);

ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(
  100,
  50,
  "#d9f2cb",
  "#a3d394"
);
grid.position.y = 0.015;
scene.add(grid);

// =====================================
// プレイヤーと操作
// =====================================
const controls = new PointerLockControls(
  camera,
  renderer.domElement
);

const player = {
  speed: 7,
  height: 1.7,
  velocityY: 0,
  onGround: true
};

const keys = Object.create(null);
const clock = new THREE.Clock();

const playerBody = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.4, 0.9, 4, 8),
  new THREE.MeshStandardMaterial({
    color: "#2878df",
    roughness: 0.7
  })
);

playerBody.castShadow = true;
scene.add(playerBody);

// =====================================
// 建築設定
// =====================================
const SIZE = 2;
const BUILD_LIMIT = 45;
const placedObjects = [];

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

let selectedPiece = "wall";
let rotation = 0;
let buildMode = true;
let preview = null;

const raycaster = new THREE.Raycaster();
const centerPointer = new THREE.Vector2(0, 0);
const hitPoint = new THREE.Vector3();
const snappedPoint = new THREE.Vector3();

const groundPlane = new THREE.Plane(
  new THREE.Vector3(0, 1, 0),
  0
);

// =====================================
// 建築物を作成
// =====================================
function createPiece(type, material) {
  let mesh;

  if (type === "wall") {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(SIZE, 3, 0.18),
      material
    );
    mesh.position.y = 1.5;
  } else if (type === "floor") {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(SIZE, 0.18, SIZE),
      material
    );
    mesh.position.y = 0.1;
  } else {
    // 階段：傾斜した板と踏み板を組み合わせる
    const group = new THREE.Group();

    const ramp = new THREE.Mesh(
      new THREE.BoxGeometry(SIZE, 0.16, 2.8),
      material
    );

    ramp.position.set(0, 0.7, -0.1);
    ramp.rotation.x = Math.PI / 6;
    group.add(ramp);

    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(SIZE, 0.12, 0.45),
        material
      );

      step.position.set(
        0,
        0.12 + i * 0.25,
        0.9 - i * 0.45
      );

      group.add(step);
    }

    mesh = group;
  }

  mesh.rotation.y = rotation;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.pieceType = type;

  return mesh;
}

function pieceName(type) {
  return {
    wall: "壁",
    floor: "床",
    ramp: "階段"
  }[type];
}

// =====================================
// 建築プレビュー
// =====================================
function updatePreview() {
  if (preview) {
    scene.remove(preview);
    preview.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
    });
    preview = null;
  }

  if (!buildMode) return;

  preview = createPiece(selectedPiece, previewMaterial);
  preview.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });

  preview.renderOrder = 2;
  scene.add(preview);
}

function selectPiece(type) {
  selectedPiece = type;
  rotation = 0;

  document.querySelectorAll(".build-button").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.piece === type
    );
  });

  updatePreview();
  message.textContent =
    `${pieceName(type)}を選択中。照準を合わせてクリック`;
}

// =====================================
// 照準から建築位置を取得
// =====================================
function getBuildPosition() {
  raycaster.setFromCamera(centerPointer, camera);

  const targets = [ground];

  // 既存の建築物にも照準を合わせられる
  targets.push(...placedObjects);

  const intersections = raycaster.intersectObjects(
    targets,
    true
  );

  if (intersections.length > 0) {
    const hit = intersections[0];

    // 建築物の上面に照準を合わせた場合も地面の高さに配置
    hitPoint.copy(hit.point);

    snappedPoint.set(
      Math.round(hitPoint.x / SIZE) * SIZE,
      0,
      Math.round(hitPoint.z / SIZE) * SIZE
    );

    return true;
  }

  // 地面に直接当たらない場合は地面平面との交差を使う
  if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
    snappedPoint.set(
      Math.round(hitPoint.x / SIZE) * SIZE,
      0,
      Math.round(hitPoint.z / SIZE) * SIZE
    );

    return true;
  }

  return false;
}

// =====================================
// 建築物を設置
// =====================================
function placePiece() {
  if (!buildMode) return;

  if (!getBuildPosition()) {
    message.textContent = "建築できる場所に照準を合わせてください";
    return;
  }

  if (
    Math.abs(snappedPoint.x) > BUILD_LIMIT ||
    Math.abs(snappedPoint.z) > BUILD_LIMIT
  ) {
    message.textContent = "建築可能範囲の外です";
    return;
  }

  const piece = createPiece(
    selectedPiece,
    materials[selectedPiece]
  );

  piece.position.x = snappedPoint.x;
  piece.position.z = snappedPoint.z;

  scene.add(piece);
  placedObjects.push(piece);

  message.textContent =
    `${pieceName(selectedPiece)}を設置しました（${placedObjects.length}個）`;
}

// =====================================
// マウス操作
// =====================================
renderer.domElement.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;

  if (!controls.isLocked) {
    controls.lock();
    return;
  }

  placePiece();
});

// =====================================
// キーボード操作
// =====================================
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
    rotation += Math.PI / 2;
    if (preview) preview.rotation.y = rotation;
    message.textContent = "建築物を90度回転しました";
  }

  if (
    event.code === "Space" &&
    controls.isLocked &&
    player.onGround
  ) {
    player.velocityY = 7;
    player.onGround = false;
  }

  if (event.code === "Escape") {
    keys[event.code] = false;
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

// =====================================
// 建築メニュー
// =====================================
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

// =====================================
// ゲームループ
// =====================================
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (controls.isLocked) {
    const forward =
      Number(keys.KeyW) - Number(keys.KeyS);

    const sideways =
      Number(keys.KeyD) - Number(keys.KeyA);

    if (forward !== 0) {
      controls.moveForward(forward * player.speed * delta);
    }

    if (sideways !== 0) {
      controls.moveRight(sideways * player.speed * delta);
    }

    // 重力とジャンプ
    player.velocityY -= 18 * delta;
    camera.position.y += player.velocityY * delta;

    if (camera.position.y <= player.height) {
      camera.position.y = player.height;
      player.velocityY = 0;
      player.onGround = true;
    }

    // 移動可能範囲
    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      -BUILD_LIMIT,
      BUILD_LIMIT
    );

    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      -BUILD_LIMIT,
      BUILD_LIMIT
    );

    // 簡易キャラクターをカメラ位置に追従させる
    playerBody.position.set(
      camera.position.x,
      camera.position.y - 1.1,
      camera.position.z
    );

    playerBody.visible = false;
  }

  // 建築プレビューを照準位置に追従
  if (preview && getBuildPosition()) {
    preview.position.x = snappedPoint.x;
    preview.position.z = snappedPoint.z;
    preview.rotation.y = rotation;
  }

  renderer.render(scene, camera);
}

// =====================================
// 画面サイズ変更
// =====================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
});

// 初期化
updatePreview();
animate();
