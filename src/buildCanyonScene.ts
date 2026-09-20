import * as THREE from "three";
import type { CanyonBowl } from "./generateCanyonBowl";
import { sideColorHexByName, type SideColorName } from "./sideColors";

const dummyBlock = new THREE.Object3D();

function addInstancedBlocks(
  canyonGroup: THREE.Group,
  bowl: CanyonBowl,
  colorName: SideColorName,
): void {
  const matchingBlocks = bowl.blocks.filter(
    (block) => block.colorName === colorName,
  );
  if (matchingBlocks.length === 0) {
    return;
  }

  const cubeSizeMeters = bowl.blockSizeMeters * 0.96;
  const blockGeometry = new THREE.BoxGeometry(
    cubeSizeMeters,
    cubeSizeMeters,
    cubeSizeMeters,
  );
  const filledBlockMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
  });
  const wireframeBlockMaterial = new THREE.MeshBasicMaterial({
    color: sideColorHexByName[colorName],
    wireframe: true,
  });
  const filledBlocks = new THREE.InstancedMesh(
    blockGeometry,
    filledBlockMaterial,
    matchingBlocks.length,
  );
  const wireframeBlocks = new THREE.InstancedMesh(
    blockGeometry.clone(),
    wireframeBlockMaterial,
    matchingBlocks.length,
  );

  matchingBlocks.forEach((block, index) => {
    dummyBlock.position.set(
      block.gridX * bowl.blockSizeMeters,
      block.gridY * bowl.blockSizeMeters,
      block.gridZ * bowl.blockSizeMeters,
    );
    dummyBlock.updateMatrix();
    filledBlocks.setMatrixAt(index, dummyBlock.matrix);
    wireframeBlocks.setMatrixAt(index, dummyBlock.matrix);
  });
  filledBlocks.instanceMatrix.needsUpdate = true;
  wireframeBlocks.instanceMatrix.needsUpdate = true;
  canyonGroup.add(filledBlocks);
  canyonGroup.add(wireframeBlocks);
}

function addCourtIsland(canyonGroup: THREE.Group, bowl: CanyonBowl): void {
  const courtWidthMeters = bowl.court.widthInBlocks * bowl.blockSizeMeters;
  const courtDepthMeters = bowl.court.depthInBlocks * bowl.blockSizeMeters;
  const courtY = bowl.court.centerY;
  const halfWidth = courtWidthMeters / 2;
  const halfDepth = courtDepthMeters / 2;

  const courtIsland = new THREE.Mesh(
    new THREE.BoxGeometry(courtWidthMeters, 0.2, courtDepthMeters),
    new THREE.MeshBasicMaterial({
      color: sideColorHexByName.white,
      wireframe: true,
    }),
  );
  courtIsland.position.set(bowl.court.centerX, courtY, bowl.court.centerZ);
  canyonGroup.add(courtIsland);

  const courtOutline = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-halfWidth, courtY, -halfDepth),
    new THREE.Vector3(halfWidth, courtY, -halfDepth),
    new THREE.Vector3(halfWidth, courtY, halfDepth),
    new THREE.Vector3(-halfWidth, courtY, halfDepth),
    new THREE.Vector3(-halfWidth, courtY, -halfDepth),
  ]);
  canyonGroup.add(
    new THREE.Line(
      courtOutline,
      new THREE.LineBasicMaterial({ color: sideColorHexByName.white }),
    ),
  );

  const courtPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 1.2, 0.15),
    new THREE.MeshBasicMaterial({
      color: sideColorHexByName.white,
      wireframe: true,
    }),
  );
  courtPost.position.set(bowl.court.centerX, courtY + 0.6, bowl.court.centerZ);
  canyonGroup.add(courtPost);
}

function addPitMist(canyonGroup: THREE.Group): void {
  for (const mistRadiusMeters of [3.5, 5.5, 7.5]) {
    const mistDisk = new THREE.Mesh(
      new THREE.CircleGeometry(mistRadiusMeters, 32),
      new THREE.MeshBasicMaterial({
        color: 0x8a97a8,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
      }),
    );
    mistDisk.rotation.x = -Math.PI / 2;
    mistDisk.position.y = 1.3 + mistRadiusMeters * 0.04;
    canyonGroup.add(mistDisk);
  }
}

export function buildCanyonScene(bowl: CanyonBowl): THREE.Group {
  const canyonGroup = new THREE.Group();
  canyonGroup.name = "canyonBowl";
  addInstancedBlocks(canyonGroup, bowl, "blue");
  addInstancedBlocks(canyonGroup, bowl, "yellow");
  addInstancedBlocks(canyonGroup, bowl, "red");
  addInstancedBlocks(canyonGroup, bowl, "white");
  addCourtIsland(canyonGroup, bowl);
  addPitMist(canyonGroup);
  return canyonGroup;
}

export function disposeCanyonScene(canyonGroup: THREE.Group): void {
  canyonGroup.traverse((sceneObject) => {
    if (sceneObject instanceof THREE.Mesh || sceneObject instanceof THREE.Line) {
      sceneObject.geometry.dispose();
      const material = sceneObject.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
        return;
      }
      material.dispose();
    }
  });
}
