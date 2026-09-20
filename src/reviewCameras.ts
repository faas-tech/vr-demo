import type { CanyonBowl } from "./generateCanyonBowl";

export type ReviewCameraName = "blueStand" | "yellowStand" | "bluePlay" | "yellowPlay" | "wide" | "sideProfile" | "orbit" | "overhead" | "overheadTilt" | "courtTowardYellow" | "courtTowardBlue";
export const playerEyeHeightMeters = 1.6;
export type CameraPose = { position: [number, number, number]; target: [number, number, number]; fieldOfView: number };

export function getReviewCameraPose(view: ReviewCameraName, bowl: CanyonBowl): CameraPose {
  const { court } = bowl;
  switch (view) {
    case "blueStand": return { position: [bowl.playerOneStandX, bowl.playerOneStandY + playerEyeHeightMeters, bowl.playerOneStandZ], target: [0, 5, bowl.playerTwoStandZ], fieldOfView: 90 };
    case "yellowStand": return { position: [bowl.playerTwoStandX, bowl.playerTwoStandY + playerEyeHeightMeters, bowl.playerTwoStandZ], target: [0, 5, bowl.playerOneStandZ], fieldOfView: 90 };
    case "bluePlay": return { position: [bowl.playerOnePlayStandX, bowl.playerOnePlayStandY + playerEyeHeightMeters, bowl.playerOnePlayStandZ], target: [0, -1, bowl.playerTwoPlayStandZ], fieldOfView: 84 };
    case "yellowPlay": return { position: [bowl.playerTwoPlayStandX, bowl.playerTwoPlayStandY + playerEyeHeightMeters, bowl.playerTwoPlayStandZ], target: [0, -1, bowl.playerOnePlayStandZ], fieldOfView: 84 };
    case "wide": return { position: [-38, 54, -2], target: [0, 7, 0], fieldOfView: 66 };
    case "sideProfile": return { position: [-46, 28, -2], target: [0, 11, 0], fieldOfView: 68 };
    case "orbit": return { position: [42, 55, -49], target: [0, 7, 0], fieldOfView: 64 };
    case "overhead": return { position: [0, 210, -0.01], target: [0, 0, 0], fieldOfView: 20 };
    case "overheadTilt": return { position: [-44, 58, -3], target: [0, 7, 0], fieldOfView: 64 };
    case "courtTowardYellow": return { position: [court.centerX - 2.2, court.centerY + playerEyeHeightMeters, court.centerZ - 1.9], target: [0, 4, 22], fieldOfView: 88 };
    case "courtTowardBlue": return { position: [court.centerX + 2.2, court.centerY + playerEyeHeightMeters, court.centerZ + 1.9], target: [0, 4, -22], fieldOfView: 88 };
  }
}
