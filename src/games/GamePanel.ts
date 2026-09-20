import type { GameSnapshot, GameTarget, PlayerContext } from "./GameArena";
import type { CheckerPiece, GameName } from "./gameRules";
import type { MenuAction } from "./GameMenu";

export class GamePanel {
  private board = document.querySelector<HTMLDivElement>("#board-controls")!;
  private controls = document.querySelector<HTMLDetailsElement>("#move-controls")!;
  private game: GameName | null = null;
  private side = "";
  constructor(onAction: (action: MenuAction) => void, onMove: (target: GameTarget) => void, onHover: (target: GameTarget | null) => void) {
    document.querySelectorAll<HTMLButtonElement>("[data-game]").forEach(button => button.addEventListener("click", () => onAction(button.dataset.game as GameName)));
    document.querySelector("#game-travel")!.addEventListener("click", () => onAction("travel"));
    document.querySelector("#restart-game")!.addEventListener("click", () => onAction("restart"));
    document.querySelector("#reduce-game-motion")!.addEventListener("change", () => onAction("motion"));
    document.querySelector<HTMLButtonElement>("#collapse-game-panel")!.addEventListener("click", event => {
      const collapsed = document.querySelector("#game-panel")!.classList.toggle("collapsed");
      const button = event.currentTarget as HTMLButtonElement;
      button.textContent = collapsed ? "+" : "−";
      button.setAttribute("aria-expanded", String(!collapsed));
      button.setAttribute("aria-label", collapsed ? "Expand game menu" : "Minimize game menu");
    });
    this.board.addEventListener("click", event => { const target = this.target(event.target); if (target) onMove(target); });
    this.board.addEventListener("pointerover", event => onHover(this.target(event.target)));
    this.board.addEventListener("pointerleave", () => onHover(null));
    this.board.addEventListener("focusin", event => onHover(this.target(event.target)));
    this.board.addEventListener("focusout", () => onHover(null));
  }
  private target(element: EventTarget | null): GameTarget | null {
    const button = element instanceof Element ? element.closest<HTMLButtonElement>("[data-cell]") : null;
    return button ? { kind: this.game === "connectFour" ? "column" : "square", index: Number(button.dataset.cell), distance: 0 } : null;
  }
  update(state: GameSnapshot, context: PlayerContext, travelLabel: string, resetArmed: boolean, reducedMotion: boolean): void {
    const blocked = state.isAnimating || context.isTraveling;
    document.querySelectorAll<HTMLButtonElement>("[data-game]").forEach(button => { button.setAttribute("aria-pressed", String(button.dataset.game === state.game)); button.disabled = blocked; });
    const displayPlayer = state.result === "blue" || state.result === "yellow" ? state.result : state.turn;
    const title = state.result ? state.result === "draw" ? "Draw" : `${state.result === "blue" ? "Blue" : "Yellow"} wins` : `${state.turn === "blue" ? "Blue" : "Yellow"} to play`;
    document.querySelector("#game-turn")!.textContent = title;
    document.querySelector<HTMLElement>("#player-marker")!.style.background = displayPlayer === "blue" ? "#1e6cff" : "#ffe14a";
    document.querySelector("#move-count")!.textContent = `${state.moveCount} moves`;
    document.querySelector("#game-message")!.textContent = state.message;
    const travel = document.querySelector<HTMLButtonElement>("#game-travel")!;
    travel.textContent = travelLabel; travel.disabled = blocked;
    travel.hidden = !state.result && context.side === state.turn && context.level === "play";
    const reset = document.querySelector<HTMLButtonElement>("#restart-game")!;
    reset.textContent = resetArmed ? "Confirm restart" : "Restart game"; reset.disabled = blocked;
    const motion = document.querySelector<HTMLInputElement>("#reduce-game-motion")!;
    motion.checked = reducedMotion; motion.disabled = blocked;
    document.querySelector("#game-help")!.textContent = state.game === "connectFour" ? "Four in a row wins. Aim at a column; the ghost shows its landing slot." : "English checkers · red squares. Captures are required. Finish every jump. White ring = king.";
    if (this.game !== state.game || this.side !== context.side) {
      const changedGame = this.game !== state.game;
      this.game = state.game; this.side = context.side;
      this.board.replaceChildren(); this.board.className = state.game;
      this.controls.open = changedGame ? state.game === "connectFour" : this.controls.open;
      const cells = state.game === "connectFour" ? Array.from({ length: 7 }, (_, index) => index) : Array.from({ length: 64 }, (_, index) => index);
      // Match the view from each opposite terrace, keeping world cell IDs stable.
      if (context.side === "blue") cells.reverse();
      for (const index of cells) {
        const button = document.createElement("button"); button.type = "button"; button.dataset.cell = String(index);
        if (state.game === "connectFour") button.textContent = String(index + 1);
        this.board.append(button);
      }
    }
    this.board.querySelectorAll<HTMLButtonElement>("button").forEach(button => {
      const cell = Number(button.dataset.cell);
      if (state.game === "connectFour") {
        button.disabled = !state.canPlay || state.cells[35 + cell] !== null;
        button.setAttribute("aria-label", `Drop in column ${cell + 1}`);
      } else {
        const piece = state.cells[cell] as CheckerPiece | null;
        const isFrom = state.legalMoves.some(move => move.from === cell);
        const isDestination = state.selectedCell !== null && state.legalMoves.some(move => move.from === state.selectedCell && move.to === cell);
        button.disabled = !state.canPlay || (!isFrom && !isDestination);
        button.className = [((cell % 8 + Math.floor(cell / 8)) % 2 === 1 ? "dark-square" : ""), piece ? "has-piece" : "", piece?.king ? "king" : "", isFrom || isDestination ? "legal" : "", state.selectedCell === cell ? "selected" : ""].join(" ");
        button.style.setProperty("--piece-color", piece?.player === "blue" ? "#1e6cff" : "#ffe14a");
        button.setAttribute("aria-pressed", String(state.selectedCell === cell));
        button.setAttribute("aria-label", `${String.fromCharCode(65 + cell % 8)}${Math.floor(cell / 8) + 1}: ${piece ? `${piece.player} ${piece.king ? "king" : "piece"}` : "empty"}${isDestination ? ", legal destination" : ""}`);
      }
    });
  }
}
