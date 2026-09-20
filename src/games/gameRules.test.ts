import { describe, expect, it } from "vitest";
import { canPlayFromPlatform, checkerPositionKey, createCheckers, createConnectFour, dropConnectFour, findDropCell, getCheckerMoves, moveChecker, type CheckersState, type ConnectFourState } from "./gameRules";
import { getDropDurationSeconds, sampleCheckerMotion, sampleDropHeight } from "./pieceMotion";

function playColumns(columns: number[]): ConnectFourState {
  return columns.reduce((state, column) => {
    const next = dropConnectFour(state, column, state.turn);
    expect(next).not.toBeNull();
    return next!;
  }, createConnectFour());
}
function position(blue: number[], yellow: number[], kings: number[] = []): CheckersState {
  const state = createCheckers(); state.cells.fill(null);
  for (const cell of blue) state.cells[cell] = { player: "blue", king: kings.includes(cell) };
  for (const cell of yellow) state.cells[cell] = { player: "yellow", king: kings.includes(cell) };
  state.positionCounts = { [checkerPositionKey(state)]: 1 };
  return state;
}

describe("Connect Four", () => {
  it("drops into the lowest free slot and keeps the previous position immutable", () => {
    const empty = createConnectFour(), next = dropConnectFour(empty, 3, "blue")!;
    expect(next.lastMove).toBe(3); expect(empty.cells.every(cell => cell === null)).toBe(true);
    expect(dropConnectFour(next, 3, "yellow")!.lastMove).toBe(10);
  });
  it("rejects wrong players, invalid columns and full columns", () => {
    const state = createConnectFour();
    expect(dropConnectFour(state, 0, "yellow")).toBeNull();
    for (const col of [-1, 7, NaN, 2.5]) expect(findDropCell(state, col)).toBeNull();
    const full = playColumns([0,0,0,0,0,0]);
    expect(dropConnectFour(full, 0, "blue")).toBeNull(); expect(findDropCell(full, 1)).toBe(1);
  });
  it.each([
    ["horizontal", [0,0,1,1,2,2,3]],
    ["vertical", [0,1,0,1,0,1,0]],
    ["diagonal", [0,1,1,2,4,2,2,3,4,3,5,3,3]],
    ["opposite diagonal", [6,5,5,4,2,4,4,3,2,3,1,3,3]],
  ])("recognizes a %s win and locks the completed game", (_, columns) => {
    const state = playColumns(columns as number[]);
    expect(state.result).toBe("blue"); expect(state.winningCells).toHaveLength(4);
    expect(dropConnectFour(state, 6, "blue")).toBeNull();
  });
  it("does not join pieces across the row boundary", () => {
    const state = createConnectFour(); state.cells[5] = "blue"; state.cells[6] = "blue"; state.cells[7] = "blue"; state.cells[1] = "yellow";
    expect(dropConnectFour(state, 1, "blue")!.result).toBeNull();
  });
  it("recognizes a filled board without a line as a draw", () => {
    // Alternating pairs of columns, reversed each row: no four-in-a-row in any direction.
    const state = createConnectFour();
    state.cells = Array.from({ length: 42 }, (_, index) => ((Math.floor(index / 7) + Math.floor(index % 7 / 2)) % 2 ? "yellow" : "blue"));
    const finalPlayer = state.cells[41]!; state.cells[41] = null; state.turn = finalPlayer;
    expect(dropConnectFour(state, 6, finalPlayer)!.result).toBe("draw");
  });
});

describe("English checkers", () => {
  it("starts with 12 men each on playable red squares and seven opening moves", () => {
    const state = createCheckers();
    expect(state.cells.filter(p => p?.player === "blue")).toHaveLength(12);
    expect(state.cells.filter(p => p?.player === "yellow")).toHaveLength(12);
    state.cells.forEach((piece, cell) => { if (piece) expect((Math.floor(cell / 8) + cell % 8) % 2).toBe(1); });
    expect(getCheckerMoves(state)).toHaveLength(7);
  });
  it("moves diagonally forward, rejects illegal moves, and keeps old state", () => {
    const state = createCheckers();
    expect(moveChecker(state, 17, 24, "yellow")).toBeNull(); expect(moveChecker(state, 17, 25, "blue")).toBeNull();
    const next = moveChecker(state, 17, 24, "blue")!;
    expect(next.cells[17]).toBeNull(); expect(next.cells[24]?.player).toBe("blue"); expect(state.cells[17]?.player).toBe("blue");
    expect(next.turn).toBe("yellow");
  });
  it("requires a capture even when another piece has a quiet move", () => {
    const state = position([17, 23], [26, 55]);
    expect(getCheckerMoves(state)).toEqual([{ from: 17, to: 35, captured: 26 }]);
    expect(moveChecker(state, 23, 30, "blue")).toBeNull();
  });
  it("keeps the same piece and turn until every jump is completed", () => {
    const first = moveChecker(position([17, 23], [26, 44, 55]), 17, 35, "blue")!;
    expect(first.turn).toBe("blue"); expect(first.forcedPiece).toBe(35); expect(first.cells[26]).toBeNull();
    expect(moveChecker(first, 23, 30, "blue")).toBeNull();
    const second = moveChecker(first, 35, 53, "blue")!;
    expect(second.turn).toBe("yellow"); expect(second.forcedPiece).toBeNull(); expect(second.cells[44]).toBeNull();
  });
  it("allows either capture branch without a longest-path restriction", () => {
    const moves = getCheckerMoves(position([19], [26, 28, 42]));
    expect(moves.map(move => move.to).sort()).toEqual([33, 37]);
  });
  it("crowns at the far row and ends a capture turn there", () => {
    const next = moveChecker(position([40], [49, 51]), 40, 58, "blue")!;
    expect(next.cells[58]?.king).toBe(true); expect(next.turn).toBe("yellow"); expect(next.forcedPiece).toBeNull();
    expect(next.cells[51]).not.toBeNull();
  });
  it("crowns yellow at the blue home row", () => {
    const state = position([17], [10]); state.turn = "yellow";
    expect(moveChecker(state, 10, 1, "yellow")!.cells[1]).toEqual({ player: "yellow", king: true });
  });
  it("permits kings to move and capture backward, while men cannot", () => {
    const man = position([35], [26, 55]);
    expect(getCheckerMoves(man).some(move => move.to === 17)).toBe(false);
    const king = position([35], [26, 55], [35]);
    expect(getCheckerMoves(king)).toEqual([{ from: 35, to: 17, captured: 26 }]);
    expect(getCheckerMoves(position([35], [55], [35])).some(move => move.to === 26)).toBe(true);
  });
  it("wins by taking the final piece and rejects later moves", () => {
    const next = moveChecker(position([17], [26]), 17, 35, "blue")!;
    expect(next.result).toBe("blue"); expect(getCheckerMoves(next)).toEqual([]); expect(moveChecker(next, 35, 42, "blue")).toBeNull();
  });
  it("wins when the opponent has pieces but cannot move", () => {
    const state = position([17], [1]);
    expect(moveChecker(state, 17, 24, "blue")!.result).toBe("blue");
  });
  it("automatically draws the third completed repetition with the same side to move", () => {
    let state = position([1], [62], [1,62]);
    for (let cycle = 0; cycle < 2; cycle++) {
      for (const [from, to] of [[1,8], [62,55], [8,1], [55,62]]) state = moveChecker(state, from!, to!, state.turn)!;
    }
    expect(state.result).toBe("draw");
  });
  it("automatically draws after 80 consecutive quiet king turns, resetting on man movement or capture", () => {
    const state = position([1], [62], [1,62]); state.quietKingTurns = 79;
    expect(moveChecker(state, 1, 8, "blue")!.result).toBe("draw");
    const man = position([17], [62]); man.quietKingTurns = 79;
    expect(moveChecker(man, 17, 24, "blue")!.quietKingTurns).toBe(0);
    const capture = position([17], [26,62], [17]); capture.quietKingTurns = 79;
    expect(moveChecker(capture, 17, 35, "blue")!.quietKingTurns).toBe(0);
  });
});

describe("terrace access and presentation physics", () => {
  it("permits play only at the current player's lower ledge, outside travel", () => {
    expect(canPlayFromPlatform("arrival", "blue", "blue", false)).toBe(false);
    expect(canPlayFromPlatform("play", "yellow", "blue", false)).toBe(false);
    expect(canPlayFromPlatform("play", "blue", "blue", true)).toBe(false);
    expect(canPlayFromPlatform("play", "blue", "blue", false)).toBe(true);
  });
  it("lands a fall exactly in its slot, including after a long frame stall", () => {
    const duration = getDropDurationSeconds(0.6, -7.6);
    expect(duration).toBeCloseTo(1.453, 2); expect(sampleDropHeight(0.6, -7.6, 0)).toBe(0.6);
    for (let t = 0; t < duration; t += 1 / 90) expect(sampleDropHeight(0.6, -7.6, t)).toBeGreaterThanOrEqual(-7.6);
    expect(sampleDropHeight(0.6, -7.6, duration)).toBeCloseTo(-7.6);
    expect(sampleDropHeight(0.6, -7.6, 60)).toBe(-7.6);
  });
  it("places checker endpoints exactly and lifts captures above slides", () => {
    expect(sampleCheckerMotion(0, false)).toEqual({ fraction: 0, liftMeters: 0 });
    expect(sampleCheckerMotion(1, true).fraction).toBe(1); expect(sampleCheckerMotion(1, true).liftMeters).toBeCloseTo(0);
    expect(sampleCheckerMotion(0.5, true).liftMeters).toBeGreaterThan(sampleCheckerMotion(0.5, false).liftMeters);
  });
});
