import * as THREE from "three";
import type { CanyonPlatform } from "../generateCanyonBowl";
import type { GameSnapshot, GameTarget } from "./GameArena";

export type MenuAction = "connectFour" | "checkers" | "travel" | "restart" | "motion";
const actions: MenuAction[] = ["connectFour", "checkers", "travel", "restart", "motion"];

/** A world-anchored menu: no head-locked panel and no DOM dependency in the headset. */
export class GameMenu {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private canvas = document.createElement("canvas");
  private texture: THREE.CanvasTexture;
  private raycaster = new THREE.Raycaster();
  private signature = "";
  constructor() {
    this.canvas.width = 768; this.canvas.height = 880;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.18), new THREE.MeshBasicMaterial({ map: this.texture }));
    this.mesh.name = "inHeadsetGameMenu";
    this.mesh.visible = false;
  }
  update(platform: CanyonPlatform, state: GameSnapshot, travelLabel: string, resetArmed: boolean, reducedMotion: boolean): void {
    const side = platform.colorName === "blue" ? -1 : 1;
    this.mesh.position.set(-side * 2.3, platform.surfaceY + 1.9, platform.centerZ - side * 2.6);
    this.mesh.lookAt(0, platform.surfaceY + 1.6, platform.centerZ);
    this.mesh.updateMatrixWorld();
    const signature = JSON.stringify([state.game, state.message, state.turn, travelLabel, resetArmed, reducedMotion]);
    if (signature === this.signature) return;
    this.signature = signature;
    const context = this.canvas.getContext("2d")!;
    context.fillStyle = "#070707"; context.fillRect(0, 0, 768, 880);
    context.strokeStyle = "#ffffff"; context.lineWidth = 3; context.strokeRect(2, 2, 764, 876);
    context.textAlign = "left"; context.fillStyle = "#ffffff";
    context.font = "600 39px system-ui"; context.fillText("CRATER / GAMES", 40, 65);
    context.font = "24px system-ui"; context.fillStyle = "#bbbbbb"; context.fillText("Shared headset · pass after each turn", 40, 110);
    const labels = ["01   CONNECT FOUR", "02   CHECKERS", travelLabel, resetArmed ? "Confirm restart" : "Restart game", reducedMotion ? "Reduced motion: ON" : "Reduced motion: OFF"];
    labels.forEach((label, index) => {
      const active = (index === 0 && state.game === "connectFour") || (index === 1 && state.game === "checkers");
      context.fillStyle = active ? "#441111" : "#191919"; context.fillRect(32, 145 + index * 110, 704, 92);
      context.strokeStyle = active ? "#ff2a2a" : "#666666"; context.strokeRect(32, 145 + index * 110, 704, 92);
      context.fillStyle = "#ffffff"; context.font = "32px system-ui"; context.fillText(label, 54, 203 + index * 110);
    });
    context.fillStyle = "#ffffff";
    const status = state.result ? state.result === "draw" ? "DRAW" : `${state.result.toUpperCase()} WINS` : `${state.turn.toUpperCase()} TO PLAY`;
    context.font = "600 30px system-ui"; context.fillText(status, 40, 745);
    context.fillStyle = "#ffffff"; context.font = "26px system-ui";
    const words = state.message.split(" "); let line = "", y = 795;
    words.forEach(word => { if (context.measureText(line + word).width > 680) { context.fillText(line, 40, y); line = ""; y += 34; } line += word + " "; });
    context.fillText(line, 40, y);
    this.texture.needsUpdate = true;
  }
  pick(ray: THREE.Ray): GameTarget | null {
    if (!this.mesh.visible) return null;
    this.raycaster.ray.copy(ray);
    const hit = this.raycaster.intersectObject(this.mesh)[0];
    if (!hit?.uv) return null;
    const x = hit.uv.x * 768, y = (1 - hit.uv.y) * 880;
    const index = Math.floor((y - 145) / 110);
    if (x < 32 || x > 736 || index < 0 || index >= 5 || y - 145 - index * 110 > 92) return null;
    return { kind: "menu", index, distance: hit.distance };
  }
  action(index: number): MenuAction | undefined { return actions[index]; }
  dispose(): void { this.texture.dispose(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
