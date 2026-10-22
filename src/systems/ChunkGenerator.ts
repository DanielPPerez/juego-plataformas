import { RNG } from './RNG';
import { CHUNK_H, CHUNK_W, FEET_ROW, Tile, type Grid, type Point, type Spawn } from './level';
import { isReachable, type JumpAbility } from './LevelValidator';
import { ChunkGid, type ChunkTemplate } from './chunks';

// Probabilidad de que aparezca cada objeto marcado en el chunk
const SPAWN_CHANCE: Record<string, number> = { enemy: 0.6, coin: 0.75, chest: 1 };
// Los primeros chunks de cada nivel son fáciles; después puede salir cualquier dificultad
const EASY_CHUNKS = 3;
// No repetir un diseño (ni su espejo) dentro de los últimos N chunks
const NO_REPEAT = 8;

export interface LevelPlan {
  seed: string;
  chunks: ChunkTemplate[];
}

// Contenido de un chunk ya generado; coordenadas locales al chunk
export interface ChunkInstance extends Grid {
  index: number;
  name: string;
  entryRow: number;
  exitRow: number;
  spawns: Spawn[];
  start?: Point;
  exit?: Point;
}

// ~40 chunks ≈ 5 minutos de juego
export function normalChunkCount(levelIndex: number): number {
  return 40 + 5 * (levelIndex - 1);
}

// Decide la secuencia de chunks del nivel encadenando alturas: la entrada de cada chunk es la salida del anterior.
// Solo elige plantillas; el contenido se genera cuando hace falta (buildChunk).
export function planLevel(
  seed: string,
  levelIndex: number,
  templates: ChunkTemplate[],
  count = normalChunkCount(levelIndex),
): LevelPlan {
  const rng = new RNG(`${seed}:plan`);
  const of = (kind: string) => templates.filter((t) => t.kind === kind);
  const chunks = [rng.pick(of('start'))];

  for (let i = 0; i < count; i++) {
    const height = chunks[chunks.length - 1].exit;
    const maxDifficulty = i < EASY_CHUNKS ? 1 : 3;
    const recent = chunks.slice(-NO_REPEAT).map((c) => c.base);
    const fit = of('normal').filter((t) => t.entry === height && t.difficulty <= maxDifficulty);
    const fresh = fit.filter((t) => !recent.includes(t.base));
    chunks.push(rng.pick(fresh.length > 0 ? fresh : fit));
  }

  chunks.push(rng.pick(of('exit').filter((t) => t.entry === chunks[chunks.length - 1].exit)));
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

  const instance: ChunkInstance = {
    index,
    name: template.name,
    width: CHUNK_W,
    height: CHUNK_H,
    tiles,
    entryRow: FEET_ROW[template.entry],
    exitRow: FEET_ROW[template.exit],
    spawns: [],
  };
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
  const from = chunk.start ?? { x: 0, y: chunk.entryRow };
  const to = chunk.exit ?? { x: CHUNK_W - 1, y: chunk.exitRow };
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
