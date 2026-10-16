/**
 * Deterministic Mulberry32 Pseudo-Random Number Generator.
 * Ensures 100% reproducible tile bag draws across P2P online sync and unit tests.
 */
export interface PRNG {
  /** Returns a float in [0, 1) */
  next: () => number;
  /** Returns an integer in [0, maxExclusive) */
  nextInt: (maxExclusive: number) => number;
  /** Returns current internal 32-bit state seed */
  getSeed: () => number;
}

export function createPRNG(initialSeed: number): PRNG {
  let state = initialSeed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const nextInt = (maxExclusive: number): number => {
    if (maxExclusive <= 1) return 0;
    return Math.floor(next() * maxExclusive);
  };

  const getSeed = (): number => state;

  return { next, nextInt, getSeed };
}

/**
 * Deterministic Fisher-Yates shuffle returning a new array and the updated seed.
 */
export function shuffleArray<T>(
  items: readonly T[],
  seed: number
): { shuffled: T[]; nextSeed: number } {
  const prng = createPRNG(seed);
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = prng.nextInt(i + 1);
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  return {
    shuffled,
    nextSeed: prng.getSeed(),
  };
}
