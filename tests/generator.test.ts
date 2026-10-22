import { describe, expect, it } from 'vitest';
import playerDefaults from '../src/data/player.json';
import { buildChunk, isChunkCrossable, planLevel, resolveChunk, stitchChunks } from '../src/systems/ChunkGenerator';
import { CHUNK_W } from '../src/systems/level';
import { abilityFromConfig, isReachable } from '../src/systems/LevelValidator';
import { RNG } from '../src/systems/RNG';
import { getChunks } from '../src/systems/chunkLibrary';

const ability = abilityFromConfig(playerDefaults);
const templates = getChunks('bioma1');
const SEEDS = 1000;

describe('ChunkGenerator (bioma1)', () => {
  it('carga al menos 10 chunks', () => {
    expect(templates.length).toBeGreaterThanOrEqual(10);
  });

  it.each(templates.map((t) => [t.name, t] as const))('el chunk %s se puede cruzar sin bloques aleatorios', (_, t) => {
    expect(isChunkCrossable(resolveChunk(t, 0, new RNG('x'), false), ability)).toBe(true);
  });

  it('el validador rechaza un hueco de 8 tiles', () => {
    const flat = templates.find((t) => t.name === 'arena')!;
    const chunk = resolveChunk(flat, 0, new RNG('x'), false);
    for (let y = 15; y < 17; y++) for (let x = 10; x < 18; x++) chunk.tiles[y * CHUNK_W + x] = 0;
    // Quitar también las plataformas que podrían servir de puente
    chunk.tiles.forEach((t, i) => t === 2 && (chunk.tiles[i] = 0));
    expect(isChunkCrossable(chunk, ability)).toBe(false);
  });

  it('la misma seed produce el mismo nivel', () => {
    const a = planLevel('repetible', 1, templates);
    const b = planLevel('repetible', 1, templates);
    expect(a.chunks.map((c) => c.name)).toEqual(b.chunks.map((c) => c.name));
    expect(buildChunk(a, 3, ability).tiles).toEqual(buildChunk(b, 3, ability).tiles);
  });

  it(`${SEEDS} niveles completos se pueden terminar`, () => {
    for (let i = 0; i < SEEDS; i++) {
      const levelIndex = 1 + (i % 3);
      const plan = planLevel(`seed-${i}`, levelIndex, templates);
      const chunks = plan.chunks.map((_, idx) => buildChunk(plan, idx, ability));
      const grid = stitchChunks(chunks);
      const last = chunks[chunks.length - 1];
      const exit = { x: (chunks.length - 1) * CHUNK_W + last.exit!.x, y: last.exit!.y };
      expect(isReachable(grid, chunks[0].start!, exit, ability), `seed-${i}`).toBe(true);
    }
  }, 120_000);
});
