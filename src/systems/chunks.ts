import { CHUNK_H, CHUNK_W, TILE_SIZE } from './level';

export type ChunkKind = 'start' | 'normal' | 'exit';

// GIDs del tileset placeholder (ver scripts/make-chunks.ts)
export const ChunkGid = { Empty: 0, Solid: 1, Platform: 2, Random: 3 } as const;

export interface ChunkTemplate {
  name: string;
  kind: ChunkKind;
  difficulty: number;
  tiles: number[];
  objects: { type: string; x: number; y: number }[];
}

// Subconjunto del formato JSON de Tiled que usamos
export interface TiledMap {
  width: number;
  height: number;
  properties?: { name: string; value: unknown }[];
  layers: (
    | { type: 'tilelayer'; name: string; data: number[] }
    | { type: 'objectgroup'; name: string; objects: { type?: string; name?: string; x: number; y: number }[] }
  )[];
}

export function parseTiledChunk(name: string, map: TiledMap): ChunkTemplate {
  if (map.width !== CHUNK_W || map.height !== CHUNK_H) {
    throw new Error(`Chunk ${name}: mide ${map.width}×${map.height}, debe medir ${CHUNK_W}×${CHUNK_H}`);
  }
  const prop = (key: string) => map.properties?.find((p) => p.name === key)?.value;
  const terrain = map.layers.find((l) => l.type === 'tilelayer');
  if (!terrain || terrain.type !== 'tilelayer') throw new Error(`Chunk ${name}: falta la capa de tiles`);

  const objects = map.layers
    .flatMap((l) => (l.type === 'objectgroup' ? l.objects : []))
    .map((o) => ({
      type: o.type || o.name || '',
      x: Math.floor(o.x / TILE_SIZE),
      y: Math.floor(o.y / TILE_SIZE),
    }));

  return {
    name,
    kind: (prop('kind') ?? 'normal') as ChunkKind,
    difficulty: Number(prop('difficulty') ?? 1),
    tiles: terrain.data,
    objects,
  };
}
