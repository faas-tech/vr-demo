export const gravityMetersPerSecondSquared = 9.81;
export const landingSettleSeconds = 0.16;
export function getDropDurationSeconds(startY: number, targetY: number): number {
  return Math.sqrt(2 * Math.max(0, startY - targetY) / gravityMetersPerSecondSquared) + landingSettleSeconds;
}
export function sampleDropHeight(startY: number, targetY: number, elapsedSeconds: number): number {
  const fallSeconds = getDropDurationSeconds(startY, targetY) - landingSettleSeconds;
  if (elapsedSeconds <= fallSeconds) return Math.max(targetY, startY - 0.5 * gravityMetersPerSecondSquared * Math.max(0, elapsedSeconds) ** 2);
  const settle = Math.min(1, (elapsedSeconds - fallSeconds) / landingSettleSeconds);
  return targetY + Math.sin(settle * Math.PI) * 0.045 * (1 - settle);
}
export function sampleCheckerMotion(progress: number, isCapture: boolean): { fraction: number; liftMeters: number } {
  const clamped = Math.max(0, Math.min(1, progress));
  return { fraction: clamped * clamped * (3 - 2 * clamped), liftMeters: Math.sin(clamped * Math.PI) * (isCapture ? 0.8 : 0.18) };
}
