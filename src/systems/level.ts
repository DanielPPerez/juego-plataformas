// Tipos compartidos por el generador, el validador y la escena (sin dependencias de Phaser)

export const TILE_SIZE = 16;
export const ROOM_W = 30;
export const ROOM_H = 17;

export const Tile = {
  Empty: 0,
  Solid: 1,
  Platform: 2,
} as const;

export interface Point {
  x: number;
  y: number;
}

export interface Spawn extends Point {
  type: string;
}

// Coordenadas en tiles. start/exit son la celda donde están los pies (la de abajo del cuerpo).
export interface Level {
  seed: string;
  width: number;
  height: number;
  tiles: Uint8Array;
  start: Point;
  exit: Point;
  spawns: Spawn[];
  layout: string[][];
  attempts: number;
}

export function tileAt(level: Pick<Level, 'width' | 'height' | 'tiles'>, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return Tile.Solid;
  return level.tiles[y * level.width + x];
}
