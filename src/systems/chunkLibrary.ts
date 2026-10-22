import { mirrorChunk, parseTiledChunk, type ChunkTemplate, type TiledMap } from './chunks';

const files = import.meta.glob('../data/chunks/*/*.json', { eager: true, import: 'default' }) as Record<string, TiledMap>;

// Chunks del bioma + la versión reflejada de cada chunk normal
export function getChunks(biome: string): ChunkTemplate[] {
  const chunks = Object.entries(files)
    .filter(([path]) => path.includes(`/chunks/${biome}/`))
    .map(([path, map]) => parseTiledChunk(path.split('/').pop()!.replace('.json', ''), map));
  return [...chunks, ...chunks.filter((c) => c.kind === 'normal').map(mirrorChunk)];
}
