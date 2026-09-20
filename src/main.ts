import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { buildCanyonScene, disposeCanyonScene, updateCanyonAtmosphere } from "./buildCanyonScene";
import { generateCanyonBowl, getTravelPadCenter, type CanyonBowl, type CanyonPlatform } from "./generateCanyonBowl";
import { getReviewCameraPose, type ReviewCameraName } from "./reviewCameras";
import { GameArena, type GameTarget, type PlayerContext } from "./games/GameArena";
import { GameMenu, type MenuAction } from "./games/GameMenu";
import { GamePanel } from "./games/GamePanel";
import type { PlayerColor } from "./games/gameRules";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.05, 260);
const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");
renderer.xr.setFramebufferScaleFactor(1);
renderer.xr.setFoveation(1);
renderer.domElement.setAttribute("aria-label", "Interactive neon crater environment. Drag to orbit; use the viewpoint controls to explore.");
const vrButton = VRButton.createButton(renderer);
vrButton.classList.add("vr-button");
document.body.append(renderer.domElement, vrButton);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.08;
orbitControls.minDistance = 1;
orbitControls.maxDistance = 220;
orbitControls.maxPolarAngle = Math.PI * 0.94;
const seedInput = document.querySelector<HTMLInputElement>("#seed-input")!;
const viewSelect = document.querySelector<HTMLSelectElement>("#view-select")!;
const sceneStats = document.querySelector<HTMLOutputElement>("#scene-stats")!;
let arena: GameArena | undefined;
let gameMenu: GameMenu | undefined;
let gamePanel: GamePanel | undefined;
let reducedGameMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let resetDeadlineMs = 0;
const visitedPlaySides = new Set<PlayerColor>();
let lastGameController: THREE.Group | undefined;
let currentBowl: CanyonBowl;
let currentGroup: THREE.Group;
let currentView: ReviewCameraName = "blueStand";
let savedDesktopPose: { position: THREE.Vector3; target: THREE.Vector3; fieldOfView: number } | undefined;
let lastStatsTimeMs = 0;
let animationTimeSeconds = 0;
let currentVRSide: "blue" | "yellow" = "blue";
let currentVRLevel: "arrival" | "play" = "arrival";
let travelTransition: { startedAtMs: number; destination: CanyonPlatform; hasMoved: boolean } | null = null;
const travelButton = document.querySelector<HTMLButtonElement>("#travel-button")!;
const fadeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.BackSide });
const travelFade = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), fadeMaterial);
travelFade.renderOrder = 1000;
travelFade.frustumCulled = false;
travelFade.visible = false;
camera.add(travelFade);
const controllerRay = new THREE.Ray();
const controllerRotation = new THREE.Matrix4();
const padPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
const padIntersection = new THREE.Vector3();
const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
const controllerPointers = controllers.map(controller => {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
  const pointer = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  pointer.visible = false;
  controller.add(pointer);
  playerRig.add(controller);
  controller.addEventListener("select", () => {
    const target = findControllerTarget(controller);
    if (target?.kind === "pad") startPlatformTravel();
    else if (target?.kind === "menu") { const action = gameMenu?.action(target.index); if (action) handleGameAction(action); }
    else if (target) { lastGameController = controller; arena?.activate(target); }
  });
  controller.addEventListener("connected", event => { controller.userData.inputSource = event.data; });
  controller.addEventListener("disconnected", () => { controller.userData.inputSource = undefined; pointer.visible = false; });
  return pointer;
});

function getCurrentPlatform(): CanyonPlatform {
  const color = renderer.xr.isPresenting ? currentVRSide : currentView.toLowerCase().includes("yellow") ? "yellow" : "blue";
  const level = renderer.xr.isPresenting ? currentVRLevel : currentView.endsWith("Play") ? "play" : "arrival";
  return currentBowl.platforms.find(platform => platform.colorName === color && platform.level === level)!;
}

function findPointedPlatform(controller: THREE.Group): number | null {
  if (!renderer.xr.isPresenting || travelTransition) return null;
  const platform = getCurrentPlatform();
  const [padX, padY, padZ] = getTravelPadCenter(platform);
  controller.updateWorldMatrix(true, false);
  controllerRotation.extractRotation(controller.matrixWorld);
  controllerRay.origin.setFromMatrixPosition(controller.matrixWorld);
  controllerRay.direction.set(0, 0, -1).applyMatrix4(controllerRotation).normalize();
  padPlane.constant = -padY;
  const hit = controllerRay.intersectPlane(padPlane, padIntersection);
  if (!hit || Math.abs(hit.x - padX) > 0.7 || Math.abs(hit.z - padZ) > 0.7) return null;
  return hit.distanceTo(controllerRay.origin);
}

function startPlatformTravel(requestedDestination?: CanyonPlatform): void {
  if (travelTransition || arena?.isAnimating) return;
  const platform = getCurrentPlatform();
  const destination = requestedDestination ?? currentBowl.platforms.find(candidate => candidate.colorName === platform.colorName && candidate.level !== platform.level)!;
  travelTransition = { startedAtMs: performance.now(), destination, hasMoved: false };
  travelFade.visible = true;
  orbitControls.enabled = false;
  travelButton.disabled = true;
  arena?.contextChanged();
}
travelButton.addEventListener("click", () => startPlatformTravel());

function updatePlatformTravel(timeMs: number): void {
  if (!travelTransition) return;
  const elapsedMs = timeMs - travelTransition.startedAtMs;
  fadeMaterial.opacity = elapsedMs < 130 ? elapsedMs / 130 : Math.max(0, 1 - (elapsedMs - 180) / 180);
  if (elapsedMs >= 150 && !travelTransition.hasMoved) {
    const { destination } = travelTransition;
    if (renderer.xr.isPresenting) {
      playerRig.position.set(destination.centerX, destination.surfaceY, destination.centerZ - (destination.level === "arrival" ? Math.sign(destination.centerZ) * 0.8 : 0));
      currentVRLevel = destination.level;
      currentVRSide = destination.colorName;
      playerRig.rotation.y = currentVRSide === "yellow" ? 0 : Math.PI;
    } else {
      placeReviewCamera(`${destination.colorName}${destination.level === "arrival" ? "Stand" : "Play"}` as ReviewCameraName);
    }
    if (destination.level === "play") visitedPlaySides.add(destination.colorName);
    travelTransition.hasMoved = true;
  }
  if (elapsedMs >= 360) {
    travelFade.visible = false;
    fadeMaterial.opacity = 0;
    travelTransition = null;
    orbitControls.enabled = !renderer.xr.isPresenting;
    travelButton.disabled = false;
    arena?.contextChanged();
  }
}
let previousFrameTimeMs = 0;
let isAtmospherePaused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function getPlayFieldOfView(): number {
  return Math.max(72, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(23)) / camera.aspect)));
}

function placeReviewCamera(view: ReviewCameraName): number[] {
  if (renderer.xr.isPresenting) return camera.position.toArray();
  const pose = getReviewCameraPose(view, currentBowl);
  if (arena && view.endsWith("Play")) {
    pose.target = [0, currentBowl.court.centerY + (arena.game === "checkers" ? 0.7 : 4.8), 0];
    pose.fieldOfView = getPlayFieldOfView();
  }
  // Flush residual damping before jumping to a repeatable review pose.
  orbitControls.enableDamping = false;
  orbitControls.update();
  camera.position.fromArray(pose.position);
  camera.fov = pose.fieldOfView;
  camera.updateProjectionMatrix();
  orbitControls.target.fromArray(pose.target);
  orbitControls.update();
  orbitControls.enableDamping = true;
  currentView = view;
  travelButton.textContent = view.endsWith("Play") ? "↑ Return to cliff" : "↓ Descend 25 m to play terrace";
  viewSelect.value = view;
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });
  arena?.contextChanged();
  return camera.position.toArray();
}

function buildBowlFromSeed(seed: number): void {
  if (renderer.xr.isPresenting || travelTransition || arena?.isAnimating) return;
  const nextBowl = generateCanyonBowl(seed >>> 0);
  const nextGroup = buildCanyonScene(nextBowl);
  if (currentGroup) {
    scene.remove(currentGroup);
    disposeCanyonScene(currentGroup);
  }
  currentBowl = nextBowl;
  currentGroup = nextGroup;
  scene.add(currentGroup);
  seedInput.value = String(currentBowl.seed);
  animationTimeSeconds = 0;
  window.lastBuiltCanyonBowl = { seed: currentBowl.seed, blockCount: currentBowl.blocks.length, visibleBlockCount: currentGroup.userData.visibleBlockCount };
  arena?.setCourtHeight(currentBowl.court.centerY);
  placeReviewCamera(currentView);
}

window.placeReviewCamera = placeReviewCamera;
window.getCanyonDiagnostics = () => ({
  ...window.lastBuiltCanyonBowl,
  drawCalls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
  view: currentView,
  cameraPosition: camera.position.toArray(),
  isInVR: renderer.xr.isPresenting,
  arrivalHeightMeters: currentBowl.playerOneStandY,
  playHeightMeters: currentBowl.playerOnePlayStandY,
  courtHeightMeters: currentBowl.court.centerY,
  isTraveling: travelTransition !== null,
});

document.querySelector("#seed-form")!.addEventListener("submit", event => {
  event.preventDefault();
  const seed = Number(seedInput.value);
  if (Number.isSafeInteger(seed) && seed >= 0 && seed <= 4294967295) buildBowlFromSeed(seed);
});
document.querySelector("#new-seed")!.addEventListener("click", () => buildBowlFromSeed(Math.floor(Math.random() * 1_000_000)));
viewSelect.addEventListener("change", () => placeReviewCamera(viewSelect.value as ReviewCameraName));
document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach(button => {
  button.addEventListener("click", () => placeReviewCamera(button.dataset.view as ReviewCameraName));
});
const motionButton = document.querySelector<HTMLButtonElement>("#motion-toggle")!;
function updateMotionButton() {
  motionButton.textContent = isAtmospherePaused ? "Resume mist" : "Pause mist";
  motionButton.setAttribute("aria-pressed", String(isAtmospherePaused));
}
motionButton.addEventListener("click", () => { isAtmospherePaused = !isAtmospherePaused; updateMotionButton(); });
updateMotionButton();
const hideButton = document.querySelector<HTMLButtonElement>("#hide-controls")!;
function toggleControls() {
  const hidden = document.body.classList.toggle("controls-hidden");
  hideButton.textContent = hidden ? "Show controls · H" : "Hide controls · H";
}
hideButton.addEventListener("click", toggleControls);
window.addEventListener("keydown", event => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.toLowerCase() === "h") toggleControls();
  const views: ReviewCameraName[] = ["blueStand", "yellowStand", "wide", "overhead", "bluePlay", "yellowPlay", "courtTowardYellow", "courtTowardBlue"];
  const view = views[Number(event.key) - 1];
  if (view) placeReviewCamera(view);
});

renderer.xr.addEventListener("sessionstart", () => {
  savedDesktopPose = { position: camera.position.clone(), target: orbitControls.target.clone(), fieldOfView: camera.fov };
  orbitControls.enabled = false;
  currentVRSide = currentView.toLowerCase().includes("yellow") ? "yellow" : "blue";
  currentVRLevel = currentView.endsWith("Play") ? "play" : "arrival";
  const platform = getCurrentPlatform();
  playerRig.position.set(platform.centerX, platform.surfaceY, platform.centerZ - (platform.level === "arrival" ? Math.sign(platform.centerZ) * 0.8 : 0));
  playerRig.rotation.y = currentVRSide === "yellow" ? 0 : Math.PI;
  camera.position.set(0, 0, 0);
  camera.quaternion.identity();
  document.body.classList.add("in-vr");
  if (gameMenu) gameMenu.mesh.visible = true;
  arena?.contextChanged();
});
renderer.xr.addEventListener("sessionend", () => {
  travelTransition = null;
  travelFade.visible = false;
  travelButton.disabled = false;
  controllerPointers.forEach(pointer => { pointer.visible = false; });
  playerRig.position.set(0, 0, 0);
  playerRig.rotation.set(0, 0, 0);
  if (savedDesktopPose) {
    camera.fov = savedDesktopPose.fieldOfView;
    camera.updateProjectionMatrix();
    camera.position.copy(savedDesktopPose.position);
    orbitControls.target.copy(savedDesktopPose.target);
  }
  orbitControls.enabled = true;
  orbitControls.update();
  document.body.classList.remove("in-vr");
  if (gameMenu) gameMenu.mesh.visible = false;
  arena?.contextChanged();
});

function getPlayerContext(): PlayerContext {
  const platform = getCurrentPlatform();
  return { side: platform.colorName, level: platform.level, isTraveling: travelTransition !== null };
}

function gameTravelLabel(): string {
  const context = getPlayerContext();
  if (arena && context.side !== arena.turn && !arena.result) return `Pass to ${arena.turn === "blue" ? "Blue" : "Yellow"}`;
  return context.level === "arrival" ? "↓ Descend to play" : "↑ Return to cliff";
}

function updateGameUI(): void {
  if (!arena) return;
  const context = getPlayerContext();
  for (const material of currentGroup.userData.mistMaterials as THREE.ShaderMaterial[]) {
    material.uniforms.islandHalfSize!.value.set(arena.game === "checkers" ? 5.35 : 5.6, arena.game === "checkers" ? 5.35 : 3.1);
  }
  const snapshot = arena.snapshot();
  gamePanel?.update(snapshot, context, gameTravelLabel(), resetDeadlineMs > performance.now(), reducedGameMotion);
  gameMenu?.update(getCurrentPlatform(), snapshot, gameTravelLabel(), resetDeadlineMs > performance.now(), reducedGameMotion);
}

function handleGameAction(action: MenuAction): void {
  if (!arena || travelTransition || arena.isAnimating) return;
  if (action === "connectFour" || action === "checkers") {
    resetDeadlineMs = 0;
    const changed = action !== arena.game;
    arena.selectGame(action);
    if (changed && currentView.endsWith("Play") && !renderer.xr.isPresenting) placeReviewCamera(currentView);
  }
  if (action === "travel") {
    const context = getPlayerContext();
    if (context.side !== arena.turn && !arena.result) {
      // Each player first arrives above the crater and chooses their own descent.
      const level = visitedPlaySides.has(arena.turn) ? "play" : "arrival";
      startPlatformTravel(currentBowl.platforms.find(platform => platform.colorName === arena!.turn && platform.level === level));
    } else startPlatformTravel();
  }
  if (action === "restart") {
    if (resetDeadlineMs > performance.now()) { resetDeadlineMs = 0; arena.restart(); }
    else resetDeadlineMs = performance.now() + 5000;
  }
  if (action === "motion") {
    reducedGameMotion = !reducedGameMotion;
    if (reducedGameMotion) { isAtmospherePaused = true; updateMotionButton(); }
  }
  updateGameUI();
}

function findControllerTarget(controller: THREE.Group): GameTarget | { kind: "pad"; index: number; distance: number } | null {
  const padDistance = findPointedPlatform(controller);
  if (!renderer.xr.isPresenting || travelTransition) return null;
  const targets = [gameMenu?.pick(controllerRay), arena?.pick(controllerRay), padDistance === null ? null : { kind: "pad" as const, index: 0, distance: padDistance }];
  return targets.filter((target): target is NonNullable<typeof target> => Boolean(target)).sort((a, b) => a.distance - b.distance)[0] ?? null;
}

const mouseRaycaster = new THREE.Raycaster();
const mousePosition = new THREE.Vector2();
let pointerDown: { x: number; y: number; id: number } | null = null;
const activePointers = new Set<number>();
function pickFromPointer(event: PointerEvent): GameTarget | null {
  const bounds = renderer.domElement.getBoundingClientRect();
  mousePosition.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
  camera.updateMatrixWorld();
  mouseRaycaster.setFromCamera(mousePosition, camera);
  return arena?.pick(mouseRaycaster.ray) ?? null;
}
renderer.domElement.addEventListener("pointerdown", event => {
  activePointers.add(event.pointerId);
  if (activePointers.size > 1) pointerDown = null;
  else if (event.button === 0) pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
renderer.domElement.addEventListener("pointerup", event => {
  activePointers.delete(event.pointerId);
  if (pointerDown && pointerDown.id === event.pointerId && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) < 6) {
    const target = pickFromPointer(event); if (target) arena?.activate(target);
  }
  pointerDown = null;
});
renderer.domElement.addEventListener("pointercancel", event => { activePointers.delete(event.pointerId); pointerDown = null; });
renderer.domElement.addEventListener("pointermove", event => {
  if (event.buttons) { arena?.hover(null); return; }
  const target = pickFromPointer(event); arena?.hover(target);
  renderer.domElement.style.cursor = target && arena?.canPlay ? "pointer" : "grab";
});
renderer.domElement.addEventListener("pointerleave", () => arena?.hover(null));

buildBowlFromSeed(101);
arena = new GameArena(getPlayerContext, () => reducedGameMotion);
scene.add(arena.group);
gameMenu = new GameMenu(); scene.add(gameMenu.mesh);
gamePanel = new GamePanel(handleGameAction, target => { arena?.activate(target); }, target => arena?.hover(target));
arena.onChanged = updateGameUI;
arena.onLanded = () => {
  const source = lastGameController?.userData.inputSource as XRInputSource | undefined;
  // Optional feedback: absence or rejection of haptics never affects a move.
  void source?.gamepad?.hapticActuators?.[0]?.pulse(0.25, 45).catch(() => {});
};
window.getGameSnapshot = () => ({ ...arena!.snapshot(), player: getPlayerContext() });
updateGameUI();
const requestedView = new URLSearchParams(location.search).get("view");
if ([...viewSelect.options].some(option => option.value === requestedView)) placeReviewCamera(requestedView as ReviewCameraName);
if (new URLSearchParams(location.search).has("clean")) toggleControls();
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  if (currentView.endsWith("Play")) camera.fov = getPlayFieldOfView();
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
renderer.setAnimationLoop(timeMs => {
  const elapsedSeconds = Math.min((timeMs - previousFrameTimeMs) / 1000, 0.05);
  previousFrameTimeMs = timeMs;
  if (!isAtmospherePaused) animationTimeSeconds += elapsedSeconds;
  updatePlatformTravel(timeMs);
  if (!renderer.xr.isPresenting && !travelTransition) orbitControls.update();
  let hoveredGameTarget: GameTarget | null = null;
  controllers.forEach((controller, index) => {
    const pointer = controllerPointers[index]!;
    if (!renderer.xr.isPresenting) { pointer.visible = false; return; }
    const target = findControllerTarget(controller);
    pointer.visible = Boolean(controller.userData.inputSource);
    pointer.scale.z = target?.distance ?? 2;
    pointer.material.opacity = target === null ? 0.2 : 0.9;
    if (target?.kind === "column" || target?.kind === "square") hoveredGameTarget = target;
  });
  if (renderer.xr.isPresenting) arena?.hover(hoveredGameTarget);
  arena?.update(timeMs / 1000);
  if (resetDeadlineMs && timeMs > resetDeadlineMs) { resetDeadlineMs = 0; updateGameUI(); }
  updateCanyonAtmosphere(currentGroup, animationTimeSeconds);
  renderer.render(scene, camera);
  if (timeMs - lastStatsTimeMs > 1000) {
    sceneStats.textContent = `${currentGroup.userData.visibleBlockCount.toLocaleString()} visible cubes · ${renderer.info.render.calls} draw calls`;
    lastStatsTimeMs = timeMs;
  }
});

declare global {
  interface Window {
    lastBuiltCanyonBowl: { seed: number; blockCount: number; visibleBlockCount: number };
    placeReviewCamera: (view: ReviewCameraName) => number[];
    getCanyonDiagnostics: () => Record<string, unknown>;
    getGameSnapshot: () => Record<string, unknown>;
  }
}
