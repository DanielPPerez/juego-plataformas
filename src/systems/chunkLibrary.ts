import { parseTiledChunk, type ChunkTemplate, type TiledMap } from './chunks';

const files = import.meta.glob('../data/chunks/*/*.json', { eager: true, import: 'default' }) as Record<string, TiledMap>;

export function getChunks(biome: string): ChunkTemplate[] {
  return Object.entries(files)
    .filter(([path]) => path.includes(`/chunks/${biome}/`))
    .map(([path, map]) => parseTiledChunk(path.split('/').pop()!.replace('.json', ''), map));
}
