import { CHUNK_H, CHUNK_W, TILE_SIZE, type Height } from './level';

export type ChunkKind = 'start' | 'normal' | 'exit';

// GIDs del tileset placeholder (ver scripts/make-chunks.ts)
export const ChunkGid = { Empty: 0, Solid: 1, Platform: 2, Random: 3 } as const;

export interface ChunkTemplate {
  name: string;
  // Nombre sin el sufijo de espejo: sirve para no repetir el mismo diseño seguido
  base: string;
  kind: ChunkKind;
  difficulty: number;
  entry: Height;
  exit: Height;
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
    base: name,
    kind: (prop('kind') ?? 'normal') as ChunkKind,
    difficulty: Number(prop('difficulty') ?? 1),
    entry: (prop('entry') ?? 'L') as Height,
    exit: (prop('exit') ?? 'L') as Height,
    tiles: terrain.data,
    objects,
  };
}

// Versión reflejada en horizontal: entra por donde salía el original
export function mirrorChunk(t: ChunkTemplate): ChunkTemplate {
  const tiles: number[] = [];
  for (let y = 0; y < CHUNK_H; y++) tiles.push(...t.tiles.slice(y * CHUNK_W, (y + 1) * CHUNK_W).reverse());
  return {
    ...t,
    name: `${t.name}~m`,
    entry: t.exit,
    exit: t.entry,
    tiles,
    objects: t.objects.map((o) => ({ ...o, x: CHUNK_W - 1 - o.x })),
  };
}
