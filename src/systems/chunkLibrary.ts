import { mirrorChunk, parseTiledChunk, type ChunkTemplate, type TiledMap } from './chunks';

const files = import.meta.glob('../data/chunks/*/*.json', { eager: true, import: 'default' }) as Record<string, TiledMap>;

// Chunks de uno o varios conjuntos (carpetas de src/data/chunks) + la versión reflejada de cada chunk normal
export function getChunks(...sets: string[]): ChunkTemplate[] {
  const chunks = Object.entries(files)
    .filter(([path]) => sets.some((set) => path.includes(`/chunks/${set}/`)))
    .map(([path, map]) => parseTiledChunk(path.split('/').pop()!.replace('.json', ''), map));
  return [...chunks, ...chunks.filter((c) => c.kind === 'normal').map(mirrorChunk)];
}
