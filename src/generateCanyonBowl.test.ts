import { describe, expect, it } from "vitest";
import { generateCanyonBowl } from "./generateCanyonBowl";

describe("generateCanyonBowl", () => {
  it("builds the same blocks and court when the seed is reused", () => {
    const firstBowl = generateCanyonBowl(101);
    const secondBowl = generateCanyonBowl(101);

    expect(secondBowl.blocks).toEqual(firstBowl.blocks);
    expect(secondBowl.court).toEqual(firstBowl.court);
    expect(secondBowl.playerOneStandX).toBe(firstBowl.playerOneStandX);
    expect(secondBowl.playerOneStandZ).toBe(firstBowl.playerOneStandZ);
  });

  it("changes terrain when the seed changes", () => {
    const firstBowl = generateCanyonBowl(101);
    const secondBowl = generateCanyonBowl(202);

    expect(secondBowl.blocks).not.toEqual(firstBowl.blocks);
  });

  it("keeps the blue home side mostly blue and the yellow side mostly yellow", () => {
    const bowl = generateCanyonBowl(101);
    const homeBlocks = bowl.blocks.filter(
      (block) => block.gridZ <= bowl.playerOneStandZ + 2,
    );
    const awayBlocks = bowl.blocks.filter(
      (block) => block.gridZ >= bowl.playerTwoStandZ - 2,
    );
    const homeBlueCount = homeBlocks.filter(
      (block) => block.colorName === "blue",
    ).length;
    const awayYellowCount = awayBlocks.filter(
      (block) => block.colorName === "yellow",
    ).length;

    expect(homeBlueCount).toBeGreaterThan(homeBlocks.length / 2);
    expect(awayYellowCount).toBeGreaterThan(awayBlocks.length / 2);
  });

  it("places a white court below both standing platforms", () => {
    const bowl = generateCanyonBowl(101);

    expect(bowl.court.colorName).toBe("white");
    expect(bowl.court.centerY).toBeLessThan(bowl.playerOneStandY);
    expect(bowl.court.centerZ).toBeGreaterThan(bowl.playerOneStandZ);
    expect(bowl.court.centerZ).toBeLessThan(bowl.playerTwoStandZ);
  });

  it("places red accent blocks between the two platforms", () => {
    const bowl = generateCanyonBowl(101);
    const redBlocksBetweenSides = bowl.blocks.filter(
      (block) =>
        block.colorName === "red" &&
        block.gridZ > bowl.playerOneStandZ &&
        block.gridZ < bowl.playerTwoStandZ,
    );

    expect(redBlocksBetweenSides.length).toBeGreaterThan(0);
  });

  it("keeps the circular pit empty of terrain blocks", () => {
    const bowl = generateCanyonBowl(101);
    const blocksInThePit = bowl.blocks.filter(
      (block) => Math.hypot(block.gridX, block.gridZ) < 7,
    );

    expect(blocksInThePit).toEqual([]);
  });

  it("places inner-slope blocks on the diagonals so the pit is circular", () => {
    const bowl = generateCanyonBowl(101);
    const diagonalInnerSlopeBlocks = bowl.blocks.filter((block) => {
      const radiusFromCenter = Math.hypot(block.gridX, block.gridZ);
      const isNearDiagonal =
        Math.abs(Math.abs(block.gridX) - Math.abs(block.gridZ)) <= 2;
      return (
        radiusFromCenter >= 10 && radiusFromCenter <= 14 && isNearDiagonal
      );
    });

    expect(diagonalInnerSlopeBlocks.length).toBeGreaterThan(20);
  });

  it("closes the rim with tall stacks on the east and west sides", () => {
    const bowl = generateCanyonBowl(101);
    const eastRimHeights = bowl.blocks
      .filter((block) => block.gridX >= 14 && Math.abs(block.gridZ) <= 4)
      .map((block) => block.gridY);
    const westRimHeights = bowl.blocks
      .filter((block) => block.gridX <= -14 && Math.abs(block.gridZ) <= 4)
      .map((block) => block.gridY);

    expect(Math.max(...eastRimHeights)).toBeGreaterThanOrEqual(6);
    expect(Math.max(...westRimHeights)).toBeGreaterThanOrEqual(6);
  });

  it("keeps each player ledge small relative to the mountain", () => {
    const bowl = generateCanyonBowl(101);
    const standHeightBlocks = Math.round(bowl.playerOneStandY);
    const columnMaxHeightByCell = new Map<string, number>();

    for (const block of bowl.blocks) {
      if (
        Math.abs(block.gridX - bowl.playerOneStandX) > 4 ||
        Math.abs(block.gridZ - bowl.playerOneStandZ) > 3
      ) {
        continue;
      }
      const columnKey = `${block.gridX},${block.gridZ}`;
      const currentMaxHeight = columnMaxHeightByCell.get(columnKey) ?? 0;
      columnMaxHeightByCell.set(
        columnKey,
        Math.max(currentMaxHeight, block.gridY),
      );
    }

    const terraceColumnCount = [...columnMaxHeightByCell.values()].filter(
      (maxHeightBlocks) => maxHeightBlocks === standHeightBlocks,
    ).length;

    expect(terraceColumnCount).toBeGreaterThan(0);
    expect(terraceColumnCount).toBeLessThan(40);
  });

  it("raises mountains behind each stand above the stand height", () => {
    const bowl = generateCanyonBowl(101);
    const maxHeightBehindBlue = Math.max(
      ...bowl.blocks
        .filter((block) => block.gridZ <= bowl.playerOneStandZ - 2)
        .map((block) => block.gridY),
    );
    const maxHeightBehindYellow = Math.max(
      ...bowl.blocks
        .filter((block) => block.gridZ >= bowl.playerTwoStandZ + 2)
        .map((block) => block.gridY),
    );

    expect(maxHeightBehindBlue).toBeGreaterThan(bowl.playerOneStandY + 3);
    expect(maxHeightBehindYellow).toBeGreaterThan(bowl.playerTwoStandY + 3);
  });

  it("places both stands on opposite sides of the court at matching distance", () => {
    const bowl = generateCanyonBowl(101);

    expect(bowl.playerOneStandX).toBeCloseTo(0);
    expect(bowl.playerTwoStandX).toBeCloseTo(0);
    expect(bowl.playerOneStandZ).toBeLessThan(bowl.court.centerZ);
    expect(bowl.playerTwoStandZ).toBeGreaterThan(bowl.court.centerZ);
    expect(Math.abs(bowl.playerOneStandZ + bowl.playerTwoStandZ)).toBeLessThan(
      1,
    );
  });
});
