import { describe, expect, it } from 'vitest';
import biomes from '../src/data/biomes.json';
import playerDefaults from '../src/data/player.json';
import { buildChunk, isChunkCrossable, planLevel, resolveChunk, stitchChunks } from '../src/systems/ChunkGenerator';
import { CHUNK_W, FEET_ROW, Tile } from '../src/systems/level';
import { abilityFromConfig, isReachable, reachableCells } from '../src/systems/LevelValidator';
import { RNG } from '../src/systems/RNG';
import { getChunks } from '../src/systems/chunkLibrary';

const ability = abilityFromConfig(playerDefaults);
// GDD 6.1: con scroll forzado, todo chunk de persecución debe cruzarse con salto simple
const singleJump = abilityFromConfig({ ...playerDefaults, airJumps: 0, dashSpeed: 0 });
const SEEDS = 300;
const clean = (t: Parameters<typeof resolveChunk>[0]) => resolveChunk(t, 0, new RNG('x'), false);

describe.each(biomes.map((b) => [b.name, b] as const))('Bioma %s', (_, biome) => {
  const templates = getChunks(...biome.chunks);
  const chase = getChunks(...biome.chase);

  it.each(templates.map((t) => [t.name, t] as const))('el chunk %s se puede cruzar', (_, t) => {
    expect(isChunkCrossable(clean(t), ability)).toBe(true);
  });

  it('hay al menos 15 chunks normales por altura de entrada', () => {
    for (const h of ['L', 'M', 'H']) {
      expect(templates.filter((t) => t.kind === 'normal' && t.entry === h).length, h).toBeGreaterThanOrEqual(15);
    }
  });

  it.each(chase.map((t) => [t.name, t] as const))('persecución: %s se cruza solo saltando', (_, t) => {
    expect(isChunkCrossable(clean(t), singleJump)).toBe(true);
  });

  // La Puerta y El Guardián inundan la parte baja: debe haber un refugio alcanzable en cada mitad del chunk
  if (biome.boss !== 'key') {
    it.each(chase.map((t) => [t.name, t] as const))('persecución: %s tiene refugios contra la marea', (_, t) => {
      const chunk = clean(t);
      const reach = reachableCells(chunk, { x: 0, y: FEET_ROW.L }, ability);
      const refugeIn = (from: number, to: number) =>
        [...reach.keys()].some((i) => reach[i] && i % CHUNK_W >= from && i % CHUNK_W < to && Math.floor(i / CHUNK_W) <= 11);
      expect(refugeIn(0, 15) && refugeIn(15, 30)).toBe(true);
    });
  }

  it(`${SEEDS} niveles completos se pueden terminar`, () => {
    for (let i = 0; i < SEEDS; i++) {
      const levelIndex = biome.id * 2 - 1 + (i % 2);
      const plan = planLevel(`seed-${i}`, levelIndex, templates);
      const chunks = plan.chunks.map((_, idx) => buildChunk(plan, idx, ability));
      const last = chunks[chunks.length - 1];
      const exit = { x: (chunks.length - 1) * CHUNK_W + last.exit!.x, y: last.exit!.y };
      expect(isReachable(stitchChunks(chunks), chunks[0].start!, exit, ability), `seed-${i}`).toBe(true);
    }
  }, 300_000);
});

describe('ChunkGenerator', () => {
  const templates = getChunks('bioma1');

  it('el validador rechaza un hueco de 12 tiles', () => {
    const chunk = clean(templates.find((t) => t.name === 'll_arena')!);
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
});
