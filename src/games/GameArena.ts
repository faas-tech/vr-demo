import * as THREE from "three";
import { sideColorHexByName } from "../sideColors";
import { createNeonMaterial } from "../createNeonMaterial";
import { disposeCanyonScene } from "../buildCanyonScene";
import { canPlayFromPlatform, createCheckers, createConnectFour, dropConnectFour, findDropCell, getCheckerMoves, moveChecker, type CheckerMove, type CheckersState, type ConnectFourState, type GameName, type PlayerColor } from "./gameRules";
import { getDropDurationSeconds, sampleCheckerMotion, sampleDropHeight } from "./pieceMotion";

export type PlayerContext = { side: PlayerColor; level: "arrival" | "play"; isTraveling: boolean };
export type GameTarget = { kind: "column" | "square" | "menu"; index: number; distance: number };
type PieceAnimation = { cell: number; from: THREE.Vector3; to: THREE.Vector3; startSeconds: number; durationSeconds: number; capture: boolean };
export type GameSnapshot = { game: GameName; turn: PlayerColor; result: string | null; selectedCell: number | null; isAnimating: boolean; canPlay: boolean; message: string; cells: unknown[]; legalMoves: CheckerMove[]; moveCount: number };

const boardCellMeters = 1.2;
const transform = new THREE.Object3D();
const white = new THREE.Color(sideColorHexByName.white);
const scratchPoint = new THREE.Vector3();
const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));

export class GameArena {
  readonly group = new THREE.Group();
  game: GameName = "connectFour";
  connectFour: ConnectFourState = createConnectFour();
  checkers: CheckersState = createCheckers();
  selectedCell: number | null = null;
  private board = new THREE.Group();
  private courtY = -9;
  private animation: PieceAnimation | null = null;
  private pieces!: THREE.InstancedMesh;
  private crowns!: THREE.InstancedMesh;
  private teamMarks!: THREE.InstancedMesh;
  private highlights!: THREE.InstancedMesh;
  private preview!: THREE.Mesh;
  private scoreTexture!: THREE.CanvasTexture;
  private scoreCanvas!: HTMLCanvasElement;
  private hoverCell: number | null = null;
  private notice = "";
  private moveCounts = { connectFour: 0, checkers: 0 };
  private lastStatus = "";
  private feedbackPending = false;
  private readonly columnBoxes: THREE.Box3[] = [];
  onChanged: () => void = () => {};
  onLanded: () => void = () => {};

  constructor(private getContext: () => PlayerContext, private reducedMotion: () => boolean) {
    this.group.name = "miniGameArena";
    const light = new THREE.HemisphereLight(0xffffff, 0x111111, 2.4);
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-6, 10, -8);
    this.group.add(light, key);
    this.buildBoard();
  }
  get turn(): PlayerColor { return this.game === "connectFour" ? this.connectFour.turn : this.checkers.turn; }
  get result() { return this.game === "connectFour" ? this.connectFour.result : this.checkers.result; }
  get isAnimating(): boolean { return this.animation !== null; }
  get canPlay(): boolean {
    const context = this.getContext();
    return !this.result && !this.animation && canPlayFromPlatform(context.level, context.side, this.turn, context.isTraveling);
  }
  get message(): string {
    if (this.result) return this.result === "draw" ? "Draw. Start a rematch." : `${this.result === "blue" ? "Blue" : "Yellow"} wins!`;
    if (this.animation) return "Piece in motion…";
    if (this.notice) return this.notice;
    const context = this.getContext();
    if (context.isTraveling) return "Arriving at the play terrace…";
    if (context.level !== "play") return "Descend to your play terrace to begin.";
    if (context.side !== this.turn) return `Pass to ${this.turn === "blue" ? "Blue" : "Yellow"} for the next turn.`;
    if (this.game === "connectFour") return "Aim at a column. Click or press trigger to drop.";
    if (this.checkers.forcedPiece !== null) return "Continue the jump with the same piece.";
    if (getCheckerMoves(this.checkers).some(move => move.captured !== null)) return "Capture required. Select a highlighted piece.";
    return this.selectedCell === null ? "Select your piece, then a highlighted square." : "Choose a highlighted destination.";
  }
  snapshot(): GameSnapshot {
    return { game: this.game, turn: this.turn, result: this.result, selectedCell: this.selectedCell, isAnimating: this.isAnimating, canPlay: this.canPlay, message: this.message, cells: this.game === "connectFour" ? [...this.connectFour.cells] : this.checkers.cells.map(piece => piece && { ...piece }), legalMoves: this.game === "checkers" ? getCheckerMoves(this.checkers) : [], moveCount: this.moveCounts[this.game] };
  }
  setCourtHeight(height: number): void { this.courtY = height; this.buildBoard(); }
  selectGame(game: GameName): void {
    if (this.getContext().isTraveling || this.animation || game === this.game) return;
    this.game = game;
    this.selectedCell = game === "checkers" ? this.checkers.forcedPiece : null;
    this.notice = "";
    this.buildBoard();
    this.onChanged();
  }
  restart(): void {
    if (this.animation || this.getContext().isTraveling) return;
    if (this.game === "connectFour") this.connectFour = createConnectFour(); else this.checkers = createCheckers();
    this.moveCounts[this.game] = 0;
    this.selectedCell = null;
    this.notice = "";
    this.updatePieces(0);
    this.refreshHighlights();
    this.onChanged();
  }
  contextChanged(): void { this.notice = ""; this.refreshHighlights(); this.onChanged(); }

  private piecePosition(cell: number): THREE.Vector3 {
    if (this.game === "connectFour") return new THREE.Vector3((cell % 7 - 3) * boardCellMeters, this.courtY + 1.4 + Math.floor(cell / 7) * boardCellMeters, 0);
    return new THREE.Vector3((cell % 8 - 3.5) * boardCellMeters, this.courtY + 0.74, (Math.floor(cell / 8) - 3.5) * boardCellMeters);
  }
  private makeMaterial(color: PlayerColor) {
    return new THREE.MeshStandardMaterial({ color: sideColorHexByName[color], emissive: sideColorHexByName[color], emissiveIntensity: 0.16, roughness: 0.3, metalness: 0.3 });
  }
  private addBoxes(boxes: { position: number[]; size: number[] }[], color: "red" | "white"): void {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), createNeonMaterial(color, 1.2), boxes.length);
    boxes.forEach((box, index) => {
      transform.position.fromArray(box.position);
      transform.scale.fromArray(box.size);
      transform.rotation.set(0, 0, 0);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.computeBoundingSphere();
    this.board.add(mesh);
  }
  private buildBoard(): void {
    this.animation = null;
    this.hoverCell = null;
    this.lastStatus = "";
    this.columnBoxes.length = 0;
    this.scoreTexture?.dispose();
    this.group.remove(this.board);
    disposeCanyonScene(this.board);
    this.board = new THREE.Group();
    this.board.name = this.game;
    this.group.add(this.board);
    if (this.game === "connectFour") this.buildConnectFour(); else this.buildCheckers();
    const pieceGeometry = new THREE.CylinderGeometry(0.47, 0.47, 0.24, 32);
    if (this.game === "connectFour") pieceGeometry.rotateX(Math.PI / 2);
    // One instanced batch, with the team color stored per piece.
    const material = this.makeMaterial("blue");
    material.color.copy(white);
    material.emissive.set(0x111111);
    this.pieces = new THREE.InstancedMesh(pieceGeometry, material, 42);
    this.pieces.name = "gamePieces";
    this.pieces.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pieces.frustumCulled = false;
    this.board.add(this.pieces);
    this.teamMarks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), 84);
    this.teamMarks.frustumCulled = false;
    this.board.add(this.teamMarks);
    const crownGeometry = new THREE.TorusGeometry(0.33, 0.065, 8, 24);
    crownGeometry.rotateX(Math.PI / 2);
    this.crowns = new THREE.InstancedMesh(crownGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff }), 24);
    this.crowns.frustumCulled = false;
    this.board.add(this.crowns);
    const highlightGeometry = new THREE.TorusGeometry(0.51, 0.025, 6, 24);
    if (this.game === "checkers") highlightGeometry.rotateX(Math.PI / 2);
    this.highlights = new THREE.InstancedMesh(highlightGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }), 64);
    this.highlights.frustumCulled = false;
    this.board.add(this.highlights);
    this.preview = new THREE.Mesh(pieceGeometry.clone(), new THREE.MeshBasicMaterial({ color: sideColorHexByName.blue, transparent: true, opacity: 0.38, depthWrite: false }));
    this.preview.visible = false;
    this.board.add(this.preview);
    this.buildScoreboard();
    this.updatePieces(0);
    this.refreshHighlights();
  }
  private buildConnectFour(): void {
    const base = this.courtY + 0.8;
    const plate = new THREE.Shape();
    plate.moveTo(-4.45, -0.25); plate.lineTo(4.45, -0.25); plate.lineTo(4.45, 7.45); plate.lineTo(-4.45, 7.45); plate.closePath();
    for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) {
      const hole = new THREE.Path();
      hole.absarc((col - 3) * boardCellMeters, 0.6 + row * boardCellMeters, 0.51, 0, Math.PI * 2, true);
      plate.holes.push(hole);
    }
    const geometry = new THREE.ExtrudeGeometry(plate, { depth: 0.5, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 24 });
    geometry.translate(0, base, -0.25);
    const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x601010, emissive: sideColorHexByName.red, emissiveIntensity: 0.06, roughness: 0.38, metalness: 0.35 }));
    this.board.add(body);
    const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(0.515, 0.024, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }), 84);
    let index = 0;
    for (const face of [-1, 1]) for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) {
      transform.position.set((col - 3) * boardCellMeters, base + 0.6 + row * boardCellMeters, face * 0.3);
      transform.rotation.set(0, 0, 0); transform.scale.set(1, 1, 1); transform.updateMatrix(); rings.setMatrixAt(index++, transform.matrix);
    }
    rings.computeBoundingSphere(); this.board.add(rings);
    this.addBoxes([
      { position: [-4.65, this.courtY + 4.2, 0], size: [0.45, 8.4, 0.95] },
      { position: [4.65, this.courtY + 4.2, 0], size: [0.45, 8.4, 0.95] },
      { position: [0, base - 0.3, 0], size: [9.7, 0.4, 1] },
      { position: [0, base + 7.6, 0], size: [9.7, 0.3, 0.95] },
      { position: [-4.65, this.courtY + 0.15, 0], size: [1.3, 0.3, 2.4] },
      { position: [4.65, this.courtY + 0.15, 0], size: [1.3, 0.3, 2.4] },
    ], "red");
    this.addBoxes([{ position: [0, this.courtY - 0.22, 0], size: [10.8, 0.44, 3.4] }], "white");
    for (let col = 0; col < 7; col++) this.columnBoxes.push(new THREE.Box3(new THREE.Vector3((col - 3.5) * 1.2, base - 0.1, -0.4), new THREE.Vector3((col - 2.5) * 1.2, base + 8.2, 0.4)));
  }
  private buildCheckers(): void {
    for (const parity of [0, 1]) {
      const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1.18, 0.22, 1.18), new THREE.MeshStandardMaterial({ color: parity === 0 ? 0xdddddd : sideColorHexByName.red, emissive: parity === 0 ? 0x111111 : 0x330000, roughness: 0.65, metalness: 0.12 }), 32);
      let index = 0;
      for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 !== parity) continue;
        transform.position.set((col - 3.5) * 1.2, this.courtY + 0.5, (row - 3.5) * 1.2);
        transform.scale.set(1, 1, 1); transform.rotation.set(0, 0, 0); transform.updateMatrix(); tiles.setMatrixAt(index++, transform.matrix);
      }
      tiles.computeBoundingSphere(); this.board.add(tiles);
    }
    this.addBoxes([{ position: [0, this.courtY - 0.05, 0], size: [10.15, 0.8, 10.15] }], "red");
    this.addBoxes([
      { position: [-4.92, this.courtY + 0.65, 0], size: [0.06, 0.07, 9.9] },
      { position: [4.92, this.courtY + 0.65, 0], size: [0.06, 0.07, 9.9] },
      { position: [0, this.courtY + 0.65, -4.92], size: [9.9, 0.07, 0.06] },
      { position: [0, this.courtY + 0.65, 4.92], size: [9.9, 0.07, 0.06] },
    ], "white");
  }
  private buildScoreboard(): void {
    this.scoreCanvas = document.createElement("canvas"); this.scoreCanvas.width = 1024; this.scoreCanvas.height = 160;
    this.scoreTexture = new THREE.CanvasTexture(this.scoreCanvas);
    this.scoreTexture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: this.scoreTexture });
    for (const side of [-1, 1]) {
      const board = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 1.375), material);
      board.position.set(0, this.game === "connectFour" ? this.courtY + 10 : this.courtY + 3, this.game === "connectFour" ? side * 0.48 : -side * 5.7);
      board.rotation.y = side < 0 ? Math.PI : 0;
      this.board.add(board);
    }
  }
  private drawStatus(): void {
    const title = this.game === "connectFour" ? "CONNECT FOUR" : "CHECKERS";
    const state = this.result ? this.result === "draw" ? "DRAW" : `${this.result.toUpperCase()} WINS` : `${this.turn.toUpperCase()} TO PLAY`;
    const signature = title + state + this.isAnimating;
    if (signature === this.lastStatus) return;
    this.lastStatus = signature;
    const context = this.scoreCanvas.getContext("2d")!;
    context.clearRect(0, 0, 1024, 160); context.fillStyle = "#060606"; context.fillRect(0, 0, 1024, 160);
    context.strokeStyle = "#ff2a2a"; context.lineWidth = 3; context.strokeRect(2, 2, 1020, 156);
    context.textAlign = "center"; context.fillStyle = "#ffffff"; context.font = "600 38px system-ui"; context.fillText(title, 512, 56);
    context.fillStyle = "#ffffff"; context.font = "600 44px system-ui"; context.fillText(this.isAnimating ? "PIECE IN MOTION" : state, 512, 122);
    const displayPlayer = this.result === "blue" || this.result === "yellow" ? this.result : this.turn;
    context.fillStyle = displayPlayer === "blue" ? "#1e6cff" : "#ffe14a";
    context.fillRect(22, 22, 8, 116); context.fillRect(994, 22, 8, 116);
    this.scoreTexture.needsUpdate = true;
  }
  activate(target: GameTarget): boolean {
    if (!this.canPlay) { this.notice = ""; this.onChanged(); return false; }
    if (this.game === "connectFour" && target.kind === "column") {
      const next = dropConnectFour(this.connectFour, target.index, this.getContext().side);
      if (!next) { this.notice = "That column is full. Choose another."; this.onChanged(); return false; }
      this.connectFour = next;
      const to = this.piecePosition(next.lastMove!);
      const from = to.clone(); from.y = this.courtY + 9.6;
      this.beginAnimation(next.lastMove!, from, to, false, getDropDurationSeconds(from.y, to.y));
      this.moveCounts.connectFour++;
    } else if (this.game === "checkers" && target.kind === "square") {
      const next = this.selectedCell === null ? null : moveChecker(this.checkers, this.selectedCell, target.index, this.getContext().side);
      if (next) {
        const move = next.lastMove!;
        this.checkers = next;
        this.selectedCell = next.forcedPiece;
        this.beginAnimation(move.to, this.piecePosition(move.from), this.piecePosition(move.to), move.captured !== null, move.captured !== null ? 0.62 : 0.42);
        if (next.forcedPiece === null) this.moveCounts.checkers++;
      } else {
        const legal = getCheckerMoves(this.checkers);
        if (legal.some(move => move.from === target.index)) { this.selectedCell = target.index; this.notice = ""; }
        else { this.notice = this.checkers.forcedPiece !== null ? "Finish the capture with this piece." : "Choose a highlighted piece or destination."; }
        this.refreshHighlights(); this.onChanged(); return false;
      }
    } else return false;
    this.notice = ""; this.hoverCell = null; this.preview.visible = false; this.refreshHighlights(); this.onChanged(); return true;
  }
  private beginAnimation(cell: number, from: THREE.Vector3, to: THREE.Vector3, capture: boolean, durationSeconds: number): void {
    this.animation = { cell, from, to, capture, durationSeconds: this.reducedMotion() ? 0.08 : durationSeconds, startSeconds: performance.now() / 1000 };
    this.feedbackPending = true;
  }
  private updatePieces(timeSeconds: number): void {
    let count = 0, crownCount = 0, markCount = 0;
    const cells = this.game === "connectFour" ? this.connectFour.cells : this.checkers.cells;
    cells.forEach((value, cell) => {
      if (!value) return;
      const player = typeof value === "string" ? value : value.player;
      const king = typeof value === "string" ? false : value.king;
      const position = this.piecePosition(cell);
      if (this.animation?.cell === cell) {
        const elapsed = Math.max(0, timeSeconds - this.animation.startSeconds);
        if (!this.reducedMotion()) {
          if (this.game === "connectFour") position.y = sampleDropHeight(this.animation.from.y, this.animation.to.y, elapsed);
          else {
            const motion = sampleCheckerMotion(elapsed / this.animation.durationSeconds, this.animation.capture);
            position.lerpVectors(this.animation.from, this.animation.to, motion.fraction); position.y += motion.liftMeters;
          }
        }
      }
      if (king) position.y += 0.096;
      transform.position.copy(position); transform.scale.set(1, king ? 1.8 : 1, 1); transform.rotation.set(0, 0, 0); transform.updateMatrix();
      this.pieces.setMatrixAt(count, transform.matrix); this.pieces.setColorAt(count++, new THREE.Color(sideColorHexByName[player]));
      // Redundant shape identity: Blue has a square inlay; Yellow has a bar.
      for (const face of this.game === "connectFour" ? [-1, 1] : [0]) {
        transform.position.copy(position);
        if (this.game === "connectFour") {
          transform.position.z += face * 0.128;
          transform.scale.set(player === "blue" ? 0.16 : 0.34, player === "blue" ? 0.16 : 0.07, 0.012);
        } else {
          transform.position.y += king ? 0.225 : 0.128;
          transform.scale.set(player === "blue" ? 0.16 : 0.34, 0.012, player === "blue" ? 0.16 : 0.07);
        }
        transform.updateMatrix(); this.teamMarks.setMatrixAt(markCount++, transform.matrix);
      }
      if (king) {
        transform.position.copy(position); transform.position.y += 0.26; transform.scale.set(1, 1, 1); transform.updateMatrix();
        this.crowns.setMatrixAt(crownCount++, transform.matrix);
      }
    });
    this.pieces.count = count; this.pieces.instanceMatrix.needsUpdate = true;
    if (this.pieces.instanceColor) this.pieces.instanceColor.needsUpdate = true;
    this.teamMarks.count = markCount; this.teamMarks.instanceMatrix.needsUpdate = true;
    this.crowns.count = crownCount; this.crowns.instanceMatrix.needsUpdate = true;
  }
  private refreshHighlights(): void {
    let cells: number[] = [];
    if (this.game === "connectFour") cells = this.connectFour.winningCells;
    else if (this.canPlay) {
      const moves = getCheckerMoves(this.checkers);
      cells = this.selectedCell === null ? [...new Set(moves.map(move => move.from))] : [this.selectedCell, ...moves.filter(move => move.from === this.selectedCell).map(move => move.to)];
    }
    cells.forEach((cell, index) => {
      transform.position.copy(this.piecePosition(cell)); transform.scale.set(1, 1, 1); transform.rotation.set(0, 0, 0);
      if (this.game === "checkers") transform.position.y = this.courtY + 0.64;
      else transform.position.z = this.getContext().side === "blue" ? -0.39 : 0.39;
      transform.updateMatrix(); this.highlights.setMatrixAt(index, transform.matrix);
    });
    this.highlights.count = cells.length; this.highlights.instanceMatrix.needsUpdate = true;
  }
  pick(ray: THREE.Ray): GameTarget | null {
    if (this.game === "connectFour") {
      let closest: GameTarget | null = null;
      this.columnBoxes.forEach((box, index) => {
        if (ray.intersectBox(box, scratchPoint)) {
          const distance = ray.origin.distanceTo(scratchPoint);
          if (!closest || distance < closest.distance) closest = { kind: "column", index, distance };
        }
      });
      return closest;
    }
    boardPlane.constant = -(this.courtY + 0.62);
    if (!ray.intersectPlane(boardPlane, scratchPoint)) return null;
    const col = Math.floor((scratchPoint.x + 4.8) / 1.2), row = Math.floor((scratchPoint.z + 4.8) / 1.2);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return { kind: "square", index: row * 8 + col, distance: ray.origin.distanceTo(scratchPoint) };
  }
  hover(target: GameTarget | null): void {
    const cell = this.canPlay && target?.kind === "column" ? findDropCell(this.connectFour, target.index) : null;
    if (this.hoverCell === cell) return;
    this.hoverCell = cell;
    this.preview.visible = cell !== null;
    if (cell !== null) {
      this.preview.position.copy(this.piecePosition(cell));
      (this.preview.material as THREE.MeshBasicMaterial).color.set(sideColorHexByName[this.turn]);
    }
  }
  update(timeSeconds: number): void {
    if (this.animation) {
      this.updatePieces(timeSeconds);
      if (timeSeconds - this.animation.startSeconds >= this.animation.durationSeconds) {
        this.animation = null; this.updatePieces(timeSeconds); this.refreshHighlights();
        if (this.feedbackPending) { this.feedbackPending = false; this.onLanded(); }
        this.onChanged();
      }
    }
    this.drawStatus();
  }
  dispose(): void { this.scoreTexture.dispose(); disposeCanyonScene(this.board); }
}
