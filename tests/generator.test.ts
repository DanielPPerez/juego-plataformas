import { describe, expect, it } from 'vitest';
import playerDefaults from '../src/data/player.json';
import { generateLevel } from '../src/systems/LevelGenerator';
import { abilityFromConfig, isCompletable } from '../src/systems/LevelValidator';
import { getRooms } from '../src/systems/roomLibrary';

const ability = abilityFromConfig(playerDefaults);
const rooms = getRooms('bioma1');
const SEEDS = 1000;

describe('LevelGenerator (bioma1)', () => {
  it('carga al menos 10 salas', () => {
    expect(rooms.length).toBeGreaterThanOrEqual(10);
  });

  it('la misma seed produce el mismo nivel', () => {
    const a = generateLevel('repetible', rooms, ability);
    const b = generateLevel('repetible', rooms, ability);
    expect(a.layout).toEqual(b.layout);
    expect(a.tiles).toEqual(b.tiles);
  });

  it(`${SEEDS} seeds: todos los niveles son completables`, () => {
    let firstTry = 0;
    for (let i = 0; i < SEEDS; i++) {
      const level = generateLevel(`seed-${i}`, rooms, ability);
      expect(isCompletable(level, ability), `seed-${i}`).toBe(true);
      if (level.attempts === 1) firstTry++;
    }
    // Si muchas seeds necesitan reintento, alguna sala está mal diseñada
    expect(firstTry / SEEDS).toBeGreaterThan(0.95);
  }, 120_000);
});
