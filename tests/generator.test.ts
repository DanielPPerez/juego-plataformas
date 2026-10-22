import { describe, expect, it } from 'vitest';
import playerDefaults from '../src/data/player.json';
import { buildChunk, isChunkCrossable, planLevel, resolveChunk, stitchChunks } from '../src/systems/ChunkGenerator';
import { CHUNK_W, Tile } from '../src/systems/level';
import { abilityFromConfig, isReachable } from '../src/systems/LevelValidator';
import { RNG } from '../src/systems/RNG';
import { getChunks } from '../src/systems/chunkLibrary';

const ability = abilityFromConfig(playerDefaults);
const templates = getChunks('bioma1');
const SEEDS = 1000;

describe('ChunkGenerator (bioma1)', () => {
  it.each(templates.map((t) => [t.name, t] as const))('el chunk %s se puede cruzar sin bloques aleatorios', (_, t) => {
    expect(isChunkCrossable(resolveChunk(t, 0, new RNG('x'), false), ability)).toBe(true);
  });

  it('hay al menos 15 chunks normales distintos por altura de entrada', () => {
    for (const h of ['L', 'M', 'H']) {
      expect(templates.filter((t) => t.kind === 'normal' && t.entry === h).length, h).toBeGreaterThanOrEqual(15);
    }
  });

  it('el validador rechaza un hueco de 12 tiles', () => {
    const chunk = resolveChunk(templates.find((t) => t.name === 'll_arena')!, 0, new RNG('x'), false);
    chunk.tiles.forEach((t, i) => t === Tile.Platform && (chunk.tiles[i] = Tile.Empty));
    for (let y = 15; y < 17; y++) for (let x = 9; x < 21; x++) chunk.tiles[y * CHUNK_W + x] = Tile.Empty;
    expect(isChunkCrossable(chunk, ability)).toBe(false);
  });

  it('la misma seed produce el mismo nivel', () => {
    const a = planLevel('repetible', 1, templates);
    const b = planLevel('repetible', 1, templates);
    expect(a.chunks.map((c) => c.name)).toEqual(b.chunks.map((c) => c.name));
    expect(buildChunk(a, 3, ability).tiles).toEqual(buildChunk(b, 3, ability).tiles);
  });

  it('las alturas encadenan y los 3 primeros chunks son fáciles', () => {
    for (let i = 0; i < 200; i++) {
      const { chunks } = planLevel(`plan-${i}`, 1, templates);
      chunks.slice(1).forEach((c, j) => expect(c.entry).toBe(chunks[j].exit));
      chunks.slice(1, 4).forEach((c) => expect(c.difficulty).toBe(1));
    }
  });

  // GDD 6.1: con scroll forzado, todo chunk de persecución debe cruzarse con salto simple
  const singleJump = abilityFromConfig({ ...playerDefaults, airJumps: 0, dashSpeed: 0 });
  it.each(getChunks('chase1').map((t) => [t.name, t] as const))('persecución: %s se cruza solo saltando', (_, t) => {
    expect(isChunkCrossable(resolveChunk(t, 0, new RNG('x'), false), singleJump)).toBe(true);
  });

  it(`${SEEDS} niveles completos se pueden terminar`, () => {
    for (let i = 0; i < SEEDS; i++) {
      const plan = planLevel(`seed-${i}`, 1 + (i % 3), templates);
      const chunks = plan.chunks.map((_, idx) => buildChunk(plan, idx, ability));
      const last = chunks[chunks.length - 1];
      const exit = { x: (chunks.length - 1) * CHUNK_W + last.exit!.x, y: last.exit!.y };
      expect(isReachable(stitchChunks(chunks), chunks[0].start!, exit, ability), `seed-${i}`).toBe(true);
    }
  }, 300_000);
});
