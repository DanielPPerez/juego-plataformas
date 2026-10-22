import seedrandom from 'seedrandom';

// RNG con seed: toda la generación procedural debe pasar por aquí, nunca por Math.random()
export class RNG {
  private rng: seedrandom.PRNG;

  constructor(readonly seed: string) {
    this.rng = seedrandom(seed);
  }

  float(): number {
    return this.rng();
  }

  int(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.rng() * items.length)];
  }
}
