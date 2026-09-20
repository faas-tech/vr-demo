import { describe, expect, it } from "vitest";
import { craterBaseHeightBlocks, generateCanyonBowl, getTravelPadCenter } from "./generateCanyonBowl";

describe("seeded crater", () => {
  it("rebuilds identical terrain, court and platform anchors", () => {
    expect(generateCanyonBowl(101)).toEqual(generateCanyonBowl(101));
  });
  it("varies the geography while preserving the platform layout", () => {
    const first = generateCanyonBowl(101), second = generateCanyonBowl(202);
    expect(first.blocks).not.toEqual(second.blocks);
    expect(first.platforms).toEqual(second.platforms);
    expect(first.court).toEqual(second.court);
  });
});

describe.each([0, 1, 101, 202, 356533, 4294967295])("crater layout, seed %i", seed => {
  const bowl = generateCanyonBowl(seed);
  const heights = new Map<string, number>();
  for (const block of bowl.blocks) heights.set(`${block.gridX},${block.gridZ}`, Math.max(heights.get(`${block.gridX},${block.gridZ}`) ?? -Infinity, block.gridY));

  function assertClearSightline(start: number[], target: number[]) {
    for (let step = 1; step < 300; step++) {
      const fraction = step / 300;
      const x = start[0]! + (target[0]! - start[0]!) * fraction;
      const y = start[1]! + (target[1]! - start[1]!) * fraction;
      const z = start[2]! + (target[2]! - start[2]!) * fraction;
      expect(heights.get(`${Math.round(x)},${Math.round(z)}`) ?? -Infinity).toBeLessThan(y);
    }
  }

  it("keeps the rim closed through all 360 degrees", () => {
    for (let degrees = 0; degrees < 360; degrees++) {
      const angle = degrees * Math.PI / 180;
      expect(heights.get(`${Math.round(Math.cos(angle) * 24)},${Math.round(Math.sin(angle) * 24)}`)).toBeGreaterThanOrEqual(10);
    }
  });

  it("places exactly two arrival terraces and two lower play terraces above the court", () => {
    expect(bowl.platforms).toHaveLength(4);
    for (const color of ["blue", "yellow"]) {
      const arrival = bowl.platforms.find(p => p.colorName === color && p.level === "arrival")!;
      const play = bowl.platforms.find(p => p.colorName === color && p.level === "play")!;
      expect(arrival.surfaceY - bowl.court.centerY).toBe(32);
      expect(arrival.surfaceY - play.surfaceY).toBe(25);
      expect(play.surfaceY - bowl.court.centerY).toBe(7);
      expect(Math.abs(play.centerZ)).toBeLessThan(Math.abs(arrival.centerZ));
    }
    expect(bowl.playerOneStandZ).toBe(-bowl.playerTwoStandZ);
    expect(bowl.playerOnePlayStandZ).toBe(-bowl.playerTwoPlayStandZ);
  });

  it("keeps the opposite terrace and court visible from each standing position", () => {
    for (const platform of bowl.platforms) {
      const arrivalOffset = platform.level === "arrival" ? Math.sign(platform.centerZ) * 0.8 : 0;
      const start = [platform.centerX, platform.surfaceY + 1.6, platform.centerZ - arrivalOffset];
      const opposite = bowl.platforms.find(p => p.level === platform.level && p.colorName !== platform.colorName)!;
      for (const x of [-2, 0, 2]) {
        assertClearSightline(start, [x, opposite.surfaceY + 0.06, opposite.centerZ - Math.sign(opposite.centerZ) * 1.51]);
      }
      assertClearSightline(start, [0, bowl.court.centerY + 0.1, 0]);
    }
  });

  it("builds solid supported terraces with clear headroom and rear cliffs", () => {
    const cells = new Set(bowl.blocks.map(block => `${block.gridX},${block.gridY},${block.gridZ}`));
    for (const platform of bowl.platforms) {
      for (let x = -2; x <= 2; x++) {
        for (let depth = -1; depth <= 1; depth++) {
          expect(heights.get(`${x},${platform.centerZ + depth}`)).toBe(platform.surfaceY);
          for (let y = craterBaseHeightBlocks + 1; y <= platform.surfaceY; y++) expect(cells.has(`${x},${y},${platform.centerZ + depth}`)).toBe(true);
        }
        expect(heights.get(`${x},${platform.centerZ + Math.sign(platform.centerZ) * 2}`)).toBeGreaterThanOrEqual(platform.surfaceY + 6);
      }
      const [x, y, z] = getTravelPadCenter(platform);
      expect(Math.abs(x - platform.centerX) + 0.7).toBeLessThan(platform.widthInBlocks / 2);
      expect(Math.abs(z - platform.centerZ) + 0.7).toBeLessThan(platform.depthInBlocks / 2);
      expect(y).toBeGreaterThan(platform.surfaceY);
    }
  });

  it("keeps red sparse and only on inner slopes, using the four-color palette", () => {
    const redBlocks = bowl.blocks.filter(block => block.colorName === "red");
    expect(redBlocks.length).toBeGreaterThan(0);
    expect(redBlocks.length / bowl.blocks.length).toBeLessThan(0.08);
    for (const block of redBlocks) {
      expect(Math.hypot(block.gridX, block.gridZ)).toBeLessThan(20);
      expect(block.gridY).toBeLessThanOrEqual(6);
    }
    expect(new Set(bowl.blocks.map(block => block.colorName))).toEqual(new Set(["blue", "yellow", "red"]));
    for (const [sign, color] of [[-1, "blue"], [1, "yellow"]] as const) {
      const poleBlocks = bowl.blocks.filter(block => block.gridZ * sign > 20);
      expect(poleBlocks.every(block => block.colorName === color)).toBe(true);
    }
  });

  it("has extreme irregular summits and an empty circular pit around the white court", () => {
    for (const sign of [-1, 1]) {
      expect(Math.max(...bowl.blocks.filter(block => block.gridZ * sign >= 25).map(block => block.gridY))).toBeGreaterThanOrEqual(36);
    }
    expect(Math.max(...heights.values()) - Math.min(...heights.values())).toBeGreaterThan(40);
    for (const block of bowl.blocks) expect(Math.hypot(block.gridX, block.gridZ)).toBeGreaterThanOrEqual(12);
    expect(bowl.court).toMatchObject({ centerX: 0, centerZ: 0, colorName: "white" });
  });
});
