import { parseTiledRoom, type RoomTemplate, type TiledMap } from './rooms';

const files = import.meta.glob('../data/rooms/*/*.json', { eager: true, import: 'default' }) as Record<string, TiledMap>;

export function getRooms(biome: string): RoomTemplate[] {
  return Object.entries(files)
    .filter(([path]) => path.includes(`/rooms/${biome}/`))
    .map(([path, map]) => parseTiledRoom(path.split('/').pop()!.replace('.json', ''), map));
}
