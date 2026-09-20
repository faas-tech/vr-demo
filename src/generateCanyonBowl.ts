import { createSeededRandom } from "./createSeededRandom";
import type { SideColorName } from "./sideColors";

export type CanyonBlock = {
  gridX: number;
  gridY: number;
  gridZ: number;
  colorName: SideColorName;
};

export type CanyonCourt = {
  centerX: number;
  centerY: number;
  centerZ: number;
  widthInBlocks: number;
  depthInBlocks: number;
  colorName: "white";
};

export type CanyonBowl = {
  seed: number;
  blockSizeMeters: number;
  blocks: CanyonBlock[];
  court: CanyonCourt;
  playerOneStandX: number;
  playerOneStandY: number;
  playerOneStandZ: number;
  playerTwoStandX: number;
  playerTwoStandY: number;
  playerTwoStandZ: number;
};

const craterOuterRadiusBlocks = 22;
const pitInnerRadiusBlocks = 8;
const playerStandRadiusBlocks = 16;
const playerStandHeightBlocks = 7;
const ledgeHalfWidthBlocks = 2;
const ledgeHalfDepthBlocks = 1;
const innerSlopeOuterRadiusBlocks = 12;

function columnRadiusFromCenter(gridX: number, gridZ: number): number {
  return Math.hypot(gridX, gridZ);
}

function isInsidePit(gridX: number, gridZ: number): boolean {
  return columnRadiusFromCenter(gridX, gridZ) < pitInnerRadiusBlocks;
}

function isOutsideCrater(gridX: number, gridZ: number): boolean {
  return columnRadiusFromCenter(gridX, gridZ) > craterOuterRadiusBlocks;
}

function isOnBlueLedge(gridX: number, gridZ: number): boolean {
  return (
    Math.abs(gridX) <= ledgeHalfWidthBlocks &&
    gridZ >= -playerStandRadiusBlocks - ledgeHalfDepthBlocks &&
    gridZ <= -playerStandRadiusBlocks + ledgeHalfDepthBlocks
  );
}

function isOnYellowLedge(gridX: number, gridZ: number): boolean {
  return (
    Math.abs(gridX) <= ledgeHalfWidthBlocks &&
    gridZ >= playerStandRadiusBlocks - ledgeHalfDepthBlocks &&
    gridZ <= playerStandRadiusBlocks + ledgeHalfDepthBlocks
  );
}

function isBehindBlueStand(gridX: number, gridZ: number): boolean {
  return (
    gridZ <= -playerStandRadiusBlocks - 2 &&
    columnRadiusFromCenter(gridX, gridZ) >= playerStandRadiusBlocks - 3
  );
}

function isBehindYellowStand(gridX: number, gridZ: number): boolean {
  return (
    gridZ >= playerStandRadiusBlocks + 2 &&
    columnRadiusFromCenter(gridX, gridZ) >= playerStandRadiusBlocks - 3
  );
}

function isOnInnerSlope(gridX: number, gridZ: number): boolean {
  const radiusFromCenter = columnRadiusFromCenter(gridX, gridZ);
  return (
    radiusFromCenter >= pitInnerRadiusBlocks &&
    radiusFromCenter <= innerSlopeOuterRadiusBlocks
  );
}

function isInFrontOfBlueLedge(gridX: number, gridZ: number): boolean {
  return (
    Math.abs(gridX) <= 3 &&
    gridZ > -playerStandRadiusBlocks + ledgeHalfDepthBlocks &&
    gridZ < -pitInnerRadiusBlocks
  );
}

function isInFrontOfYellowLedge(gridX: number, gridZ: number): boolean {
  return (
    Math.abs(gridX) <= 3 &&
    gridZ < playerStandRadiusBlocks - ledgeHalfDepthBlocks &&
    gridZ > pitInnerRadiusBlocks
  );
}

function pickColumnColor(
  gridX: number,
  gridZ: number,
  nextRandom: () => number,
): SideColorName {
  const roll = nextRandom();
  if (isOnInnerSlope(gridX, gridZ)) {
    if (roll < 0.42) return "red";
    if (gridZ < 0) return roll < 0.82 ? "blue" : "yellow";
    return roll < 0.82 ? "yellow" : "blue";
  }
  if (gridZ <= -2) {
    if (roll < 0.84) return "blue";
    if (roll < 0.93) return "yellow";
    return "red";
  }
  if (gridZ >= 2) {
    if (roll < 0.84) return "yellow";
    if (roll < 0.93) return "blue";
    return "red";
  }
  if (roll < 0.4) return "red";
  if (roll < 0.7) return "blue";
  return "yellow";
}

function pickColumnStackHeight(
  gridX: number,
  gridZ: number,
  lobePhaseRadians: number,
  ridgePhaseRadians: number,
  nextRandom: () => number,
): number {
  const radiusFromCenter = columnRadiusFromCenter(gridX, gridZ);
  const radiusFromPitEdge =
    (radiusFromCenter - pitInnerRadiusBlocks) /
    (craterOuterRadiusBlocks - pitInnerRadiusBlocks);
  const columnAngleRadians = Math.atan2(gridZ, gridX);
  const heightRoll = nextRandom();
  const peakRoll = nextRandom();
  const rimLobe =
    0.5 + 0.5 * Math.cos(columnAngleRadians * 3 + lobePhaseRadians);
  const rimRidge =
    0.5 + 0.5 * Math.sin(columnAngleRadians * 5 + ridgePhaseRadians);

  if (isInFrontOfBlueLedge(gridX, gridZ) || isInFrontOfYellowLedge(gridX, gridZ)) {
    return 1 + Math.floor(heightRoll * 2);
  }

  let stackHeightBlocks =
    1 +
    Math.floor(radiusFromPitEdge ** 1.4 * 12) +
    Math.floor(heightRoll * 3) +
    Math.floor(rimLobe * 2) +
    Math.floor(rimRidge * 2);

  if (isOnInnerSlope(gridX, gridZ)) {
    stackHeightBlocks = Math.min(3, stackHeightBlocks);
  }

  if (isBehindBlueStand(gridX, gridZ) || isBehindYellowStand(gridX, gridZ)) {
    stackHeightBlocks += 4 + Math.floor(peakRoll * 5);
  }

  if (radiusFromCenter >= 14) {
    stackHeightBlocks = Math.max(6, stackHeightBlocks);
  }

  return Math.min(18, Math.max(1, stackHeightBlocks));
}

export function generateCanyonBowl(seed: number): CanyonBowl {
  const nextRandom = createSeededRandom(seed);
  const lobePhaseRadians = nextRandom() * Math.PI * 2;
  const ridgePhaseRadians = nextRandom() * Math.PI * 2;
  const blocks: CanyonBlock[] = [];

  for (
    let gridX = -craterOuterRadiusBlocks;
    gridX <= craterOuterRadiusBlocks;
    gridX += 1
  ) {
    for (
      let gridZ = -craterOuterRadiusBlocks;
      gridZ <= craterOuterRadiusBlocks;
      gridZ += 1
    ) {
      if (isOutsideCrater(gridX, gridZ) || isInsidePit(gridX, gridZ)) {
        continue;
      }

      if (isOnBlueLedge(gridX, gridZ)) {
        blocks.push({
          gridX,
          gridY: playerStandHeightBlocks,
          gridZ,
          colorName: "blue",
        });
        continue;
      }

      if (isOnYellowLedge(gridX, gridZ)) {
        blocks.push({
          gridX,
          gridY: playerStandHeightBlocks,
          gridZ,
          colorName: "yellow",
        });
        continue;
      }

      const colorName = pickColumnColor(gridX, gridZ, nextRandom);
      const stackHeightBlocks = pickColumnStackHeight(
        gridX,
        gridZ,
        lobePhaseRadians,
        ridgePhaseRadians,
        nextRandom,
      );
      for (let gridY = 1; gridY <= stackHeightBlocks; gridY += 1) {
        blocks.push({
          gridX,
          gridY,
          gridZ,
          colorName,
        });
      }
    }
  }

  return {
    seed,
    blockSizeMeters: 1,
    blocks,
    court: {
      centerX: 0,
      centerY: 1.2,
      centerZ: 0,
      widthInBlocks: 8,
      depthInBlocks: 5,
      colorName: "white",
    },
    playerOneStandX: 0,
    playerOneStandY: playerStandHeightBlocks,
    playerOneStandZ: -playerStandRadiusBlocks,
    playerTwoStandX: 0,
    playerTwoStandY: playerStandHeightBlocks,
    playerTwoStandZ: playerStandRadiusBlocks,
  };
}
