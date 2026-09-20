import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { XRButton } from "three/addons/webxr/XRButton.js";
import { buildCanyonScene, disposeCanyonScene } from "./buildCanyonScene";
import { generateCanyonBowl } from "./generateCanyonBowl";

const startingSeed = 101;
const playerEyeHeightMeters = 1.6;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.02);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.append(renderer.domElement, XRButton.createButton(renderer));

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;

const seedInputElement = document.querySelector<HTMLInputElement>("#seed-input");
const rebuildSameSeedButton = document.querySelector<HTMLButtonElement>(
  "#rebuild-same-seed",
);
const newSeedButton = document.querySelector<HTMLButtonElement>("#new-seed");

if (!seedInputElement || !rebuildSameSeedButton || !newSeedButton) {
  throw new Error("Seed controls are missing from the page.");
}

const seedInput = seedInputElement;

let currentCanyonGroup: THREE.Group | null = null;
let currentSeed = startingSeed;

function placeCameraOnBlueHome(standX: number, standY: number, standZ: number) {
  camera.position.set(standX, standY + playerEyeHeightMeters, standZ);
  orbitControls.target.set(0, 1.2, 0);
  orbitControls.update();
}

type ReviewCameraName =
  | "blueStand"
  | "yellowStand"
  | "overhead"
  | "courtTowardYellow"
  | "courtTowardBlue";

function placeReviewCamera(
  viewName: ReviewCameraName,
  stand: {
    playerOneStandX: number;
    playerOneStandY: number;
    playerOneStandZ: number;
    playerTwoStandX: number;
    playerTwoStandY: number;
    playerTwoStandZ: number;
  },
) {
  orbitControls.enableDamping = false;
  if (viewName === "blueStand") {
    placeCameraOnBlueHome(
      stand.playerOneStandX,
      stand.playerOneStandY,
      stand.playerOneStandZ,
    );
  } else if (viewName === "yellowStand") {
    camera.position.set(
      stand.playerTwoStandX,
      stand.playerTwoStandY + playerEyeHeightMeters,
      stand.playerTwoStandZ,
    );
    orbitControls.target.set(0, 1.2, 0);
    camera.lookAt(0, 1.2, 0);
    orbitControls.update();
  } else if (viewName === "overhead") {
    camera.position.set(0, 42, 18);
    orbitControls.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    orbitControls.update();
  } else if (viewName === "courtTowardYellow") {
    camera.position.set(0, 2.2, -4);
    orbitControls.target.set(0, 3, 12);
    camera.lookAt(0, 3, 12);
    orbitControls.update();
  } else {
    camera.position.set(0, 2.2, 4);
    orbitControls.target.set(0, 3, -12);
    camera.lookAt(0, 3, -12);
    orbitControls.update();
  }
  orbitControls.enableDamping = true;
}

function buildBowlFromSeed(seed: number) {
  if (currentCanyonGroup) {
    scene.remove(currentCanyonGroup);
    disposeCanyonScene(currentCanyonGroup);
  }

  const canyonBowl = generateCanyonBowl(seed);
  currentCanyonGroup = buildCanyonScene(canyonBowl);
  scene.add(currentCanyonGroup);
  currentSeed = seed;
  seedInput.value = String(seed);
  window.lastBuiltCanyonBowl = {
    seed: canyonBowl.seed,
    blockCount: canyonBowl.blocks.length,
  };
  window.placeReviewCamera = (viewName) => {
    placeReviewCamera(viewName, canyonBowl);
    return camera.position.toArray();
  };
  placeCameraOnBlueHome(
    canyonBowl.playerOneStandX,
    canyonBowl.playerOneStandY,
    canyonBowl.playerOneStandZ,
  );
}

seedInput.value = String(startingSeed);
rebuildSameSeedButton.addEventListener("click", () => {
  const seedFromInput = Number.parseInt(seedInput.value, 10);
  buildBowlFromSeed(Number.isFinite(seedFromInput) ? seedFromInput : currentSeed);
});
newSeedButton.addEventListener("click", () => {
  buildBowlFromSeed(Math.floor(Math.random() * 1_000_000));
});

buildBowlFromSeed(startingSeed);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  orbitControls.update();
  renderer.render(scene, camera);
});

declare global {
  interface Window {
    lastBuiltCanyonBowl: {
      seed: number;
      blockCount: number;
    };
    placeReviewCamera: (
      viewName:
        | "blueStand"
        | "yellowStand"
        | "overhead"
        | "courtTowardYellow"
        | "courtTowardBlue",
    ) => void;
  }
}
