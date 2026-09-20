import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { generateCanyonBowl, selectExposedBlocks } from "./generateCanyonBowl";
import { buildCanyonScene, disposeCanyonScene } from "./buildCanyonScene";
import { getReviewCameraPose } from "./reviewCameras";

describe("VR scene budget and lifecycle", () => {
  it("removes only enclosed cubes and retains a complete visible shell", () => {
    const blocks = generateCanyonBowl(101).blocks;
    const exposed = selectExposedBlocks(blocks);
    const exposedKeys = new Set(exposed.map(b => `${b.gridX},${b.gridY},${b.gridZ}`));
    const allKeys = new Set(blocks.map(b => `${b.gridX},${b.gridY},${b.gridZ}`));
    expect(exposed.length).toBeLessThan(blocks.length * 0.5);
    for (const b of blocks) {
      if (exposedKeys.has(`${b.gridX},${b.gridY},${b.gridZ}`)) continue;
      for (const [x, y, z] of [[1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]]) {
        expect(allKeys.has(`${b.gridX + x!},${b.gridY + y!},${b.gridZ + z!}`)).toBe(true);
      }
    }
  });

  it("stays within 15 scene draws and releases shared and instance resources", () => {
    const group = buildCanyonScene(generateCanyonBowl(101));
    expect(group.children.length).toBeLessThanOrEqual(15);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    let instances = 0, instanceDisposals = 0, geometryDisposals = 0, materialDisposals = 0;
    group.traverse(object => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      if (object instanceof THREE.InstancedMesh) {
        instances++;
        object.addEventListener("dispose", () => instanceDisposals++);
      }
    });
    geometries.forEach(geometry => geometry.addEventListener("dispose", () => geometryDisposals++));
    materials.forEach(material => material.addEventListener("dispose", () => materialDisposals++));
    disposeCanyonScene(group);
    expect(instanceDisposals).toBe(instances);
    expect(geometryDisposals).toBe(geometries.size);
    expect(materialDisposals).toBe(materials.size);
  });

  it("places eye-height review cameras on the actual walkable surfaces", () => {
    const bowl = generateCanyonBowl(101);
    expect(getReviewCameraPose("blueStand", bowl).position).toEqual([0, bowl.playerOneStandY + 1.6, bowl.playerOneStandZ]);
    expect(getReviewCameraPose("yellowStand", bowl).position).toEqual([0, bowl.playerTwoStandY + 1.6, bowl.playerTwoStandZ]);
    for (const view of ["courtTowardBlue", "courtTowardYellow"] as const) {
      const [x, y, z] = getReviewCameraPose(view, bowl).position;
      expect(Math.abs(x)).toBeLessThan(bowl.court.widthInBlocks / 2);
      expect(Math.abs(z)).toBeLessThan(bowl.court.depthInBlocks / 2);
      expect(y).toBe(bowl.court.centerY + 1.6);
    }
  });
});
