export type PlayerColor = "blue" | "yellow";
export type GameName = "connectFour" | "checkers";
export type GameResult = PlayerColor | "draw" | null;
export const otherPlayer = (player: PlayerColor): PlayerColor => player === "blue" ? "yellow" : "blue";

export type ConnectFourState = {
  cells: (PlayerColor | null)[];
  turn: PlayerColor;
  result: GameResult;
  winningCells: number[];
  lastMove: number | null;
};
export function createConnectFour(): ConnectFourState {
  return { cells: Array<PlayerColor | null>(42).fill(null), turn: "blue", result: null, winningCells: [], lastMove: null };
}
export function findDropCell(state: ConnectFourState, column: number): number | null {
  if (!Number.isInteger(column) || column < 0 || column >= 7 || state.result) return null;
  for (let row = 0; row < 6; row++) if (state.cells[row * 7 + column] === null) return row * 7 + column;
  return null;
}
export function dropConnectFour(state: ConnectFourState, column: number, player: PlayerColor): ConnectFourState | null {
  if (state.turn !== player) return null;
  const cell = findDropCell(state, column);
  if (cell === null) return null;
  const cells = [...state.cells];
  cells[cell] = player;
  const row = Math.floor(cell / 7), col = cell % 7;
  let winningCells: number[] = [];
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]] as const) {
    const line = [cell];
    for (const sign of [-1, 1]) {
      for (let step = 1; step < 7; step++) {
        const x = col + sign * step * dx, y = row + sign * step * dy;
        if (x < 0 || x >= 7 || y < 0 || y >= 6 || cells[y * 7 + x] !== player) break;
        line.push(y * 7 + x);
      }
    }
    if (line.length >= 4) winningCells = [...new Set([...winningCells, ...line])];
  }
  const result = winningCells.length ? player : cells.every(Boolean) ? "draw" : null;
  return { cells, turn: result ? player : otherPlayer(player), result, winningCells, lastMove: cell };
}

export type CheckerPiece = { player: PlayerColor; king: boolean };
export type CheckerMove = { from: number; to: number; captured: number | null };
export type CheckersState = {
  cells: (CheckerPiece | null)[];
  turn: PlayerColor;
  result: GameResult;
  forcedPiece: number | null;
  quietKingTurns: number;
  positionCounts: Record<string, number>;
  lastMove: CheckerMove | null;
};
export function checkerPositionKey(state: Pick<CheckersState, "cells" | "turn">): string {
  return state.turn + ":" + state.cells.map(p => !p ? "." : p.player === "blue" ? p.king ? "B" : "b" : p.king ? "Y" : "y").join("");
}
export function createCheckers(): CheckersState {
  const cells = Array<CheckerPiece | null>(64).fill(null);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    if ((row + col) % 2 === 1 && (row < 3 || row > 4)) cells[row * 8 + col] = { player: row < 3 ? "blue" : "yellow", king: false };
  }
  const state: CheckersState = { cells, turn: "blue", result: null, forcedPiece: null, quietKingTurns: 0, positionCounts: {}, lastMove: null };
  state.positionCounts[checkerPositionKey(state)] = 1;
  return state;
}
function pieceMoves(cells: CheckersState["cells"], from: number, capturesOnly: boolean): CheckerMove[] {
  const piece = cells[from];
  if (!piece) return [];
  const row = Math.floor(from / 8), col = from % 8;
  const directions = piece.king ? [-1, 1] : [piece.player === "blue" ? 1 : -1];
  const moves: CheckerMove[] = [];
  for (const dy of directions) for (const dx of [-1, 1]) {
    const x = col + dx, y = row + dy;
    if (x < 0 || x > 7 || y < 0 || y > 7) continue;
    const adjacent = y * 8 + x;
    if (!cells[adjacent] && !capturesOnly) moves.push({ from, to: adjacent, captured: null });
    const landingX = col + dx * 2, landingY = row + dy * 2;
    if (cells[adjacent] && cells[adjacent]!.player !== piece.player && landingX >= 0 && landingX < 8 && landingY >= 0 && landingY < 8 && !cells[landingY * 8 + landingX]) {
      moves.push({ from, to: landingY * 8 + landingX, captured: adjacent });
    }
  }
  return moves;
}
export function getCheckerMoves(state: CheckersState): CheckerMove[] {
  if (state.result) return [];
  if (state.forcedPiece !== null) return pieceMoves(state.cells, state.forcedPiece, true);
  const moves = state.cells.flatMap((piece, index) => piece?.player === state.turn ? pieceMoves(state.cells, index, false) : []);
  const captures = moves.filter(move => move.captured !== null);
  return captures.length ? captures : moves;
}
export function moveChecker(state: CheckersState, from: number, to: number, player: PlayerColor): CheckersState | null {
  if (state.result || state.turn !== player) return null;
  const move = getCheckerMoves(state).find(move => move.from === from && move.to === to);
  if (!move) return null;
  const cells = [...state.cells];
  const piece = { ...cells[from]! };
  cells[from] = null;
  if (move.captured !== null) cells[move.captured] = null;
  const crowned = !piece.king && (piece.player === "blue" ? Math.floor(to / 8) === 7 : Math.floor(to / 8) === 0);
  piece.king ||= crowned;
  cells[to] = piece;
  const continues = move.captured !== null && !crowned && pieceMoves(cells, to, true).length > 0;
  const next: CheckersState = { ...state, cells, turn: continues ? player : otherPlayer(player), forcedPiece: continues ? to : null, lastMove: move, positionCounts: { ...state.positionCounts }, quietKingTurns: move.captured !== null || !state.cells[from]!.king ? 0 : state.quietKingTurns + 1 };
  if (!continues) {
    if (getCheckerMoves(next).length === 0) next.result = player;
    const key = checkerPositionKey(next);
    next.positionCounts[key] = (next.positionCounts[key] ?? 0) + 1;
    // Casual automatic adjudication of WCDF repetition / no-progress conditions.
    if (!next.result && (next.positionCounts[key]! >= 3 || next.quietKingTurns >= 80)) next.result = "draw";
  }
  return next;
}

export function canPlayFromPlatform(level: string, side: PlayerColor, turn: PlayerColor, isTraveling: boolean): boolean {
  return level === "play" && side === turn && !isTraveling;
}
