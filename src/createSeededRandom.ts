export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let nextValue = state;
    nextValue = Math.imul(nextValue ^ (nextValue >>> 15), nextValue | 1);
    nextValue ^=
      nextValue + Math.imul(nextValue ^ (nextValue >>> 7), nextValue | 61);
    return ((nextValue ^ (nextValue >>> 14)) >>> 0) / 4294967296;
  };
}
