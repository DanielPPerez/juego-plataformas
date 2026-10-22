import { RNG } from './RNG';
import { CHUNK_H, CHUNK_W, GROUND_ROW, Tile, type Grid, type Point, type Spawn } from './level';
import { isReachable, type JumpAbility } from './LevelValidator';
import { ChunkGid, type ChunkTemplate } from './chunks';

// Probabilidad de que aparezca cada objeto marcado en el chunk
const SPAWN_CHANCE: Record<string, number> = { enemy: 0.6, coin: 0.75, chest: 1 };

export interface LevelPlan {
  seed: string;
  chunks: ChunkTemplate[];
}

// Contenido de un chunk ya generado; coordenadas locales al chunk
export interface ChunkInstance extends Grid {
  index: number;
  name: string;
  spawns: Spawn[];
  start?: Point;
  exit?: Point;
}

export function normalChunkCount(levelIndex: number): number {
  return 8 + 2 * (levelIndex - 1);
}

// Decide la secuencia de chunks del nivel: inicio → normales con dificultad creciente → salida.
// Solo elige plantillas; el contenido se genera cuando hace falta (buildChunk).
export function planLevel(seed: string, levelIndex: number, templates: ChunkTemplate[]): LevelPlan {
  const rng = new RNG(`${seed}:plan`);
  const byKind = (kind: string) => templates.filter((t) => t.kind === kind);
  const [start, exit] = [byKind('start'), byKind('exit')];
  const normal = byKind('normal');
  if (start.length === 0 || exit.length === 0 || normal.length === 0) {
    throw new Error('Faltan chunks de inicio, salida o normales');
  }

  const count = normalChunkCount(levelIndex);
  const chunks = [rng.pick(start)];
  for (let i = 0; i < count; i++) {
    // La dificultad máxima sube a lo largo del nivel y con cada nivel
    const maxDifficulty = Math.min(3, 1 + Math.floor((3 * i) / count) + (levelIndex - 1));
    const prev = chunks[chunks.length - 1];
    let candidates = normal.filter((t) => t.difficulty <= maxDifficulty && t !== prev);
    if (candidates.length === 0) candidates = normal.filter((t) => t !== prev);
    chunks.push(rng.pick(candidates));
  }
  chunks.push(rng.pick(exit));
  return { seed, chunks };
}

// Genera el contenido de un chunk (bloques aleatorios y spawns) con una RNG propia,
// así el resultado no depende del orden en que se carguen los chunks.
export function buildChunk(plan: LevelPlan, index: number, ability: JumpAbility): ChunkInstance {
  const template = plan.chunks[index];
  const rng = new RNG(`${plan.seed}:${index}`);
  const instance = resolveChunk(template, index, rng);
  // Si los bloques aleatorios cortan el paso, se quitan todos
  if (!isChunkCrossable(instance, ability)) return resolveChunk(template, index, rng, false);
  return instance;
}

export function resolveChunk(template: ChunkTemplate, index: number, rng: RNG, randomBlocks = true): ChunkInstance {
  const tiles = new Uint8Array(CHUNK_W * CHUNK_H);
  template.tiles.forEach((gid, i) => {
    tiles[i] =
      gid === ChunkGid.Solid ? Tile.Solid
      : gid === ChunkGid.Platform ? Tile.Platform
      : gid === ChunkGid.Random && randomBlocks && rng.float() < 0.5 ? Tile.Solid
      : Tile.Empty;
  });

  const instance: ChunkInstance = { index, name: template.name, width: CHUNK_W, height: CHUNK_H, tiles, spawns: [] };
  for (const obj of template.objects) {
    const p = { x: obj.x, y: obj.y };
    if (obj.type === 'player') instance.start = p;
    else if (obj.type === 'exit') instance.exit = p;
    else if (rng.float() < (SPAWN_CHANCE[obj.type] ?? 1)) instance.spawns.push({ type: obj.type, ...p });
  }
  return instance;
}

// Se puede cruzar de la entrada (borde izquierdo o P) a la salida (borde derecho o X)
export function isChunkCrossable(chunk: ChunkInstance, ability: JumpAbility): boolean {
  const from = chunk.start ?? { x: 0, y: GROUND_ROW };
  const to = chunk.exit ?? { x: CHUNK_W - 1, y: GROUND_ROW };
  return isReachable(chunk, from, to, ability);
}

// Une chunks en una sola grilla (para validar niveles completos en los tests)
export function stitchChunks(chunks: ChunkInstance[]): Grid {
  const width = chunks.length * CHUNK_W;
  const tiles = new Uint8Array(width * CHUNK_H);
  chunks.forEach((c, i) => {
    for (let y = 0; y < CHUNK_H; y++) {
      tiles.set(c.tiles.subarray(y * CHUNK_W, (y + 1) * CHUNK_W), y * width + i * CHUNK_W);
    }
  });
  return { width, height: CHUNK_H, tiles };
}
