
import * as THREE from "three";

// ------------------------------
// 基本設定
// ------------------------------
const container = document.querySelector("#game");
const message = document.querySelector("#message");
const modeButton = document.querySelector("#mode-button");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#91c9ee");
scene.fog = new THREE.Fog("#91c9ee", 35, 100);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 11, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// ------------------------------
// ライト
// ------------------------------
scene.add(new THREE.HemisphereLight("#e6f5ff", "#71865d", 2));

const sun = new THREE.DirectionalLight("#fff4dc", 2.5);
sun.position.set(10, 20, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// ------------------------------
// 地面
// ------------------------------
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

// 建築位置の目安となるグリッド
const grid = new THREE.GridHelper(100, 50, "#d9f2cb", "#a3d394");
grid.position.y = 0.015;
scene.add(grid);

// 建築物の土台として使う水平面
const groundPlane = new THREE.Plane(
  new THREE.Vector3(0, 1, 0),
  0
);

// ------------------------------
// 建築設定
// ------------------------------
const SIZE = 2;
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
const pointer = new THREE.Vector2(0, 0);
const hitPoint = new THREE.Vector3();
const snappedPoint = new THREE.Vector3();

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
    // 階段を斜めの建築パーツとして表現
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(SIZE, 0.22, 3),
      material
    );
    mesh.rotation.x = -Math.PI / 6;
    mesh.position.y = 0.65;
  }

  mesh.rotation.y = rotation;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.pieceType = type;

  return mesh;
}

function updatePreview() {
  if (preview) {
    scene.remove(preview);
    preview.geometry.dispose();
    preview = null;
  }

  if (!buildMode) return;

  preview = createPiece(selectedPiece, previewMaterial);
  preview.castShadow = false;
  preview.receiveShadow = false;
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
  message.textContent = `${pieceName(type)}を選択中：地面をクリックして設置`;
}

function pieceName(type) {
  return {
    wall: "壁",
    floor: "床",
    ramp: "階段"
  }[type];
}

// ------------------------------
// マウス位置から建築位置を計算
// ------------------------------
function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
    // SIZE単位でグリッドにスナップ
    snappedPoint.set(
      Math.round(hitPoint.x / SIZE) * SIZE,
      0,
      Math.round(hitPoint.z / SIZE) * SIZE
    );

    if (preview) {
      preview.position.x = snappedPoint.x;
      preview.position.z = snappedPoint.z;
      preview.rotation.y = rotation;
    }
  }
}

renderer.domElement.addEventListener("pointermove", updatePointer);

// ------------------------------
// 建築物を設置
// ------------------------------
renderer.domElement.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !buildMode) return;

  updatePointer(event);

  // 地面の外側への設置を防ぐ
  if (Math.abs(snappedPoint.x) > 45 || Math.abs(snappedPoint.z) > 45) {
    message.textContent = "建築できる範囲の外です";
    return;
  }

  const piece = createPiece(selectedPiece, materials[selectedPiece]);
  piece.position.x = snappedPoint.x;
  piece.position.z = snappedPoint.z;
  piece.rotation.y = rotation;

  scene.add(piece);
  placedObjects.push(piece);

  message.textContent =
    `${pieceName(selectedPiece)}を設置しました（合計 ${placedObjects.length} 個）`;
});

// ------------------------------
// メニュー操作
// ------------------------------
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

  modeButton.style.background = buildMode ? "#176e52" : "#596273";

  if (preview) {
    scene.remove(preview);
    preview.geometry.dispose();
    preview = null;
  }

  updatePreview();
  message.textContent = buildMode
    ? "建築モードを有効にしました"
    : "建築モードを無効にしました";
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;

  if (["1", "2", "3"].includes(event.key)) {
    const types = { "1": "wall", "2": "floor", "3": "ramp" };
    selectPiece(types[event.key]);
  }

  if (event.key.toLowerCase() === "q") {
    rotation += Math.PI / 2;

    if (preview) {
      preview.rotation.y = rotation;
    }

    message.textContent = "建築物の向きを変更しました";
  }
});

// ------------------------------
// 画面サイズ変更
// ------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------
// ゲームループ
// ------------------------------
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

updatePreview();
animate();
