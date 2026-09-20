import { createSeededRandom } from "./createSeededRandom";
import type { SideColorName } from "./sideColors";

export type CanyonBlock = {
  gridX: number;
  /** Blocks occupy (gridY - 1)..gridY; stand Y is the walkable surface. */
  gridY: number;
  gridZ: number;
  colorName: SideColorName;
};
export type CanyonCourt = {
  centerX: number; centerY: number; centerZ: number;
  widthInBlocks: number; depthInBlocks: number; colorName: "white";
};
export type CanyonPlatform = {
  centerX: number; surfaceY: number; centerZ: number;
  widthInBlocks: number; depthInBlocks: number;
  colorName: "blue" | "yellow";
  level: "arrival" | "play";
};
export type CanyonBowl = {
  seed: number; blockSizeMeters: number; blocks: CanyonBlock[];
  court: CanyonCourt; platforms: CanyonPlatform[];
  playerOneStandX: number; playerOneStandY: number; playerOneStandZ: number;
  playerTwoStandX: number; playerTwoStandY: number; playerTwoStandZ: number;
  playerOnePlayStandX: number; playerOnePlayStandY: number; playerOnePlayStandZ: number;
  playerTwoPlayStandX: number; playerTwoPlayStandY: number; playerTwoPlayStandZ: number;
};
type MountainPeak = { centerX: number; centerZ: number; heightBlocks: number; radiusBlocks: number; stretch: number };

export const craterOuterRadiusBlocks = 30;
export const pitInnerRadiusBlocks = 12;
export const playerStandRadiusBlocks = 23;
export const playerStandHeightBlocks = 23;
export const playStandRadiusBlocks = 14;
export const playStandHeightBlocks = -2;
export const craterBaseHeightBlocks = -12;
export const ledgeWidthBlocks = 5;
export const ledgeDepthBlocks = 3;

function makeMountainPeaks(nextRandom: () => number): MountainPeak[] {
  const peaks: MountainPeak[] = [];
  for (const side of [-1, 1]) {
    peaks.push({ centerX: (nextRandom() - 0.5) * 4, centerZ: side * (26 + nextRandom()), heightBlocks: 28 + nextRandom() * 9, radiusBlocks: 11 + nextRandom() * 2, stretch: 0.9 });
    for (const shoulder of [-1, 1]) {
      peaks.push({ centerX: shoulder * (8 + nextRandom() * 4), centerZ: side * (23 + nextRandom() * 2), heightBlocks: 16 + nextRandom() * 12, radiusBlocks: 6 + nextRandom() * 4, stretch: 1.1 });
    }
  }
  for (const side of [-1, 1]) {
    for (const offset of [-13, 0, 13]) {
      peaks.push({ centerX: side * (24 + nextRandom() * 2 - Math.abs(offset) * 0.15), centerZ: offset + (nextRandom() - 0.5) * 4, heightBlocks: 6 + nextRandom() * 10, radiusBlocks: 5 + nextRandom() * 3, stretch: 1.15 });
    }
  }
  return peaks;
}

export function getTravelPadCenter(platform: CanyonPlatform): [number, number, number] {
  return [platform.centerX, platform.surfaceY + 0.035, platform.centerZ - Math.sign(platform.centerZ) * 0.45];
}

export function generateCanyonBowl(seed: number): CanyonBowl {
  const nextRandom = createSeededRandom(seed);
  const peaks = makeMountainPeaks(nextRandom);
  const ridgePhaseRadians = nextRandom() * Math.PI * 2;
  const platforms: CanyonPlatform[] = [];
  for (const side of [-1, 1]) {
    for (const level of ["arrival", "play"] as const) {
      platforms.push({ centerX: 0, surfaceY: level === "arrival" ? playerStandHeightBlocks : playStandHeightBlocks, centerZ: side * (level === "arrival" ? playerStandRadiusBlocks : playStandRadiusBlocks), widthInBlocks: ledgeWidthBlocks, depthInBlocks: ledgeDepthBlocks, colorName: side < 0 ? "blue" : "yellow", level });
    }
  }
  const blocks: CanyonBlock[] = [];
  for (let gridX = -craterOuterRadiusBlocks; gridX <= craterOuterRadiusBlocks; gridX++) {
    for (let gridZ = -craterOuterRadiusBlocks; gridZ <= craterOuterRadiusBlocks; gridZ++) {
      const radius = Math.hypot(gridX, gridZ);
      const angle = Math.atan2(gridZ, gridX);
      const outerEdge = craterOuterRadiusBlocks - 0.6 + 0.6 * Math.sin(angle * 7 + ridgePhaseRadians);
      if (radius < pitInnerRadiusBlocks || radius > outerEdge) continue;
      const ridgeNoise = Math.sin(gridX * 0.8 + ridgePhaseRadians) * Math.cos(gridZ * 0.65) * 2.3;
      // A steep inner escarpment makes the court a full 32 metres below arrival.
      const slopeHeight = -8 + (radius - pitInnerRadiusBlocks) * 2;
      let height = Math.min(18, slopeHeight) + ridgeNoise;
      for (const peak of peaks) {
        const distance = Math.hypot((gridX - peak.centerX) * peak.stretch, gridZ - peak.centerZ);
        height = Math.max(height, 11 + peak.heightBlocks * Math.max(0, 1 - distance / peak.radiusBlocks) ** 1.35 + ridgeNoise);
      }
      if (radius < 20) height = Math.min(height, slopeHeight + ridgeNoise);
      if (radius > 27) height -= (radius - 27) * 3.5;
      height = Math.max(craterBaseHeightBlocks + 1, Math.floor(height + nextRandom() * 1.8));
      for (const platform of platforms) {
        const xDistance = Math.abs(gridX - platform.centerX);
        const depth = (gridZ - platform.centerZ) * Math.sign(platform.centerZ);
        if (xDistance <= 2 && Math.abs(depth) <= 1) {
          height = platform.surfaceY;
        } else if (xDistance <= 7 && Math.abs(depth) <= 2) {
          // Splayed side walls leave the glowing lip visible from oblique views.
          height = Math.min(height, Math.floor(platform.surfaceY + Math.max(0, xDistance - 2) * 1.25 + depth * 3));
        }
        if (xDistance <= 3 && depth === 2) height = Math.max(height, platform.surfaceY + (platform.level === "arrival" ? 10 : 6));
        if (xDistance <= 3 && depth < -1 && gridZ * Math.sign(platform.centerZ) >= pitInnerRadiusBlocks) {
          height = Math.min(height, Math.floor(platform.surfaceY - 2 + (depth + 1) * 1.2));
        }
      }
      const colorBoundary = Math.sin(gridX * 0.4 + ridgePhaseRadians) * 3;
      const poleColor: SideColorName = gridZ <= colorBoundary ? "blue" : "yellow";
      const isRedSeam = radius < 20 && Math.abs(gridX) > 3 && nextRandom() < 0.16;
      for (let gridY = craterBaseHeightBlocks + 1; gridY <= height; gridY++) {
        blocks.push({ gridX, gridY, gridZ, colorName: isRedSeam && gridY <= 6 ? "red" : poleColor });
      }
    }
  }
  return {
    seed, blockSizeMeters: 1, blocks, platforms,
    court: { centerX: 0, centerY: -9, centerZ: 0, widthInBlocks: 8, depthInBlocks: 5, colorName: "white" },
    playerOneStandX: 0, playerOneStandY: playerStandHeightBlocks, playerOneStandZ: -playerStandRadiusBlocks + 0.8,
    playerTwoStandX: 0, playerTwoStandY: playerStandHeightBlocks, playerTwoStandZ: playerStandRadiusBlocks - 0.8,
    playerOnePlayStandX: 0, playerOnePlayStandY: playStandHeightBlocks, playerOnePlayStandZ: -playStandRadiusBlocks,
    playerTwoPlayStandX: 0, playerTwoPlayStandY: playStandHeightBlocks, playerTwoPlayStandZ: playStandRadiusBlocks,
  };
}

/** Keep the complete solid world for future collision, but submit only its shell. */
export function selectExposedBlocks(blocks: CanyonBlock[]): CanyonBlock[] {
  const occupiedCells = new Set(blocks.map(({ gridX, gridY, gridZ }) => `${gridX},${gridY},${gridZ}`));
  const neighbors = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
  return blocks.filter(({ gridX, gridY, gridZ }) => neighbors.some(([dx, dy, dz]) => !occupiedCells.has(`${gridX + dx},${gridY + dy},${gridZ + dz}`)));
}
