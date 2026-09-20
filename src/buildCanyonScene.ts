import * as THREE from "three";
import { type CanyonBowl, selectExposedBlocks, getTravelPadCenter } from "./generateCanyonBowl";
import { sideColorHexByName, type SideColorName } from "./sideColors";
import { createNeonMaterial } from "./createNeonMaterial";
import { createPitMist, createMistClouds } from "./createPitMist";
import { createPlatformGlow } from "./createPlatformGlow";

const colorNames: SideColorName[] = ["blue", "yellow", "red", "white"];

type FrameBox = { x: number; y: number; z: number; width: number; height: number; depth: number };

function addFrames(group: THREE.Group, frames: FrameBox[], colorName: SideColorName): void {
  if (!frames.length) return;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: sideColorHexByName[colorName], toneMapped: false });
  const mesh = new THREE.InstancedMesh(geometry, material, frames.length);
  mesh.name = `${colorName}TerraceAndCourtBorders`;
  const transform = new THREE.Object3D();
  frames.forEach((frame, index) => {
    transform.position.set(frame.x, frame.y, frame.z);
    transform.scale.set(frame.width, frame.height, frame.depth);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  });
  mesh.computeBoundingSphere();
  group.add(mesh);
}

function outlineRectangle(x: number, y: number, z: number, width: number, depth: number, thickness: number): FrameBox[] {
  return [
    { x, y, z: z - depth / 2, width, height: thickness, depth: thickness },
    { x, y, z: z + depth / 2, width, height: thickness, depth: thickness },
    { x: x - width / 2, y, z, width: thickness, height: thickness, depth },
    { x: x + width / 2, y, z, width: thickness, height: thickness, depth },
  ];
}

function addCourtIsland(group: THREE.Group, bowl: CanyonBowl): void {
  const { centerX, centerY, centerZ } = bowl.court;
  const width = bowl.court.widthInBlocks * bowl.blockSizeMeters;
  const depth = bowl.court.depthInBlocks * bowl.blockSizeMeters;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const island = new THREE.InstancedMesh(geometry, createNeonMaterial("white", 0.26), 1);
  island.name = "courtIsland";
  const transform = new THREE.Object3D();
  const boxes = [
    { x: centerX, y: centerY - 0.55, z: centerZ, width, height: 1.1, depth },
  ];
  boxes.forEach((box, index) => {
    transform.position.set(box.x, box.y, box.z);
    transform.scale.set(box.width, box.height, box.depth);
    transform.updateMatrix();
    island.setMatrixAt(index, transform.matrix);
  });
  island.computeBoundingSphere();
  group.add(island);
  addFrames(group, [
    ...outlineRectangle(centerX, centerY + 0.015, centerZ, width - 0.55, depth - 0.55, 0.023),
    ...outlineRectangle(centerX, centerY + 0.012, centerZ, width - 1.1, depth - 1.1, 0.012),
  ], "white");
  group.add(createPlatformGlow("white", centerX, centerY, centerZ, width - 0.55, depth - 0.55));
  const gridPoints: number[] = [];
  for (let x = -width / 2 + 0.5; x < width / 2; x += 0.5) {
    gridPoints.push(centerX + x, centerY + 0.005, centerZ - depth / 2, centerX + x, centerY + 0.005, centerZ + depth / 2);
  }
  for (let z = -depth / 2 + 0.5; z < depth / 2; z += 0.5) {
    gridPoints.push(centerX - width / 2, centerY + 0.005, centerZ + z, centerX + width / 2, centerY + 0.005, centerZ + z);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPoints, 3));
  group.add(new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.055, depthWrite: false })));
}

export function buildCanyonScene(bowl: CanyonBowl): THREE.Group {
  const group = new THREE.Group();
  group.name = "canyonBowl";
  const exposedBlocks = selectExposedBlocks(bowl.blocks);
  const cubeGeometry = new THREE.BoxGeometry(bowl.blockSizeMeters, bowl.blockSizeMeters, bowl.blockSizeMeters);
  const transform = new THREE.Object3D();
  for (const colorName of colorNames) {
    const matchingBlocks = exposedBlocks.filter(block => block.colorName === colorName);
    if (!matchingBlocks.length) continue;
    const blocks = new THREE.InstancedMesh(cubeGeometry, createNeonMaterial(colorName, colorName === "blue" ? 0.55 : colorName === "red" ? 0.3 : 0.32), matchingBlocks.length);
    blocks.name = `${colorName}Terrain`;
    matchingBlocks.forEach((block, index) => {
      transform.position.set(block.gridX * bowl.blockSizeMeters, (block.gridY - 0.5) * bowl.blockSizeMeters, block.gridZ * bowl.blockSizeMeters);
      transform.updateMatrix();
      blocks.setMatrixAt(index, transform.matrix);
    });
    blocks.computeBoundingSphere();
    group.add(blocks);
  }
  for (const colorName of ["blue", "yellow"] as const) {
    const frames: FrameBox[] = [];
    for (const platform of bowl.platforms.filter(platform => platform.colorName === colorName)) {
      const { centerX, surfaceY, centerZ, widthInBlocks, depthInBlocks } = platform;
      frames.push(...outlineRectangle(centerX, surfaceY + 0.025, centerZ, widthInBlocks - 0.12, depthInBlocks - 0.12, 0.055));
      frames.push(...outlineRectangle(centerX, surfaceY + 0.02, centerZ, widthInBlocks - 0.5, depthInBlocks - 0.5, 0.014));
      const [padX, padY, padZ] = getTravelPadCenter(platform);
      frames.push(...outlineRectangle(padX, padY, padZ, 1.25, 1.25, 0.06));
      frames.push(...outlineRectangle(padX, padY, padZ, 0.95, 0.95, 0.025));
      group.add(createPlatformGlow(colorName, centerX, surfaceY, centerZ, widthInBlocks - 0.12, depthInBlocks - 0.12));
    }
    addFrames(group, frames, colorName);
  }
  addCourtIsland(group, bowl);
  const mist = createPitMist();
  const clouds = createMistClouds();
  mist.position.y = bowl.court.centerY - 0.5;
  clouds.position.y = bowl.court.centerY - 0.5;
  group.add(mist, clouds);
  group.userData.mistMaterials = [mist.material, clouds.material];
  group.userData.visibleBlockCount = exposedBlocks.length;
  return group;
}

export function updateCanyonAtmosphere(group: THREE.Group, timeSeconds: number): void {
  for (const material of group.userData.mistMaterials as THREE.ShaderMaterial[]) {
    material.uniforms.timeSeconds!.value = timeSeconds;
  }
}

export function disposeCanyonScene(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    // Instance buffers have a separate lifecycle from geometry and material.
    if (object instanceof THREE.InstancedMesh) object.dispose();
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
