import { ROOM_H, ROOM_W, TILE_SIZE } from './level';

export type Exit = 'L' | 'R' | 'U' | 'D';
export type RoomKind = 'start' | 'normal' | 'exit' | 'side';

// GIDs del tileset placeholder (ver scripts/make-rooms.ts)
export const RoomGid = { Empty: 0, Solid: 1, Platform: 2, Random: 3 } as const;

export interface RoomTemplate {
  name: string;
  kind: RoomKind;
  exits: Exit[];
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

export function parseTiledRoom(name: string, map: TiledMap): RoomTemplate {
  if (map.width !== ROOM_W || map.height !== ROOM_H) {
    throw new Error(`Sala ${name}: mide ${map.width}×${map.height}, debe medir ${ROOM_W}×${ROOM_H}`);
  }
  const prop = (key: string) => String(map.properties?.find((p) => p.name === key)?.value ?? '');
  const terrain = map.layers.find((l) => l.type === 'tilelayer');
  if (!terrain || terrain.type !== 'tilelayer') throw new Error(`Sala ${name}: falta la capa de tiles`);

  const objects = map.layers
    .flatMap((l) => (l.type === 'objectgroup' ? l.objects : []))
    .map((o) => ({
      type: o.type || o.name || '',
      x: Math.floor(o.x / TILE_SIZE),
      y: Math.floor(o.y / TILE_SIZE),
    }));

  return {
    name,
    kind: (prop('kind') || 'normal') as RoomKind,
    exits: [...prop('exits')] as Exit[],
    tiles: terrain.data,
    objects,
  };
}
