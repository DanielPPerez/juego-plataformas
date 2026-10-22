// Tipos compartidos por el generador, el validador y la escena (sin dependencias de Phaser)

export const TILE_SIZE = 16;
export const CHUNK_W = 30;
export const CHUNK_H = 17;
export const CHUNK_PX = CHUNK_W * TILE_SIZE;
// Fila donde están los pies del jugador sobre el suelo en los bordes de cada chunk
export const GROUND_ROW = 14;

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

export interface Grid {
  width: number;
  height: number;
  tiles: Uint8Array;
}

// Fuera del mapa: por debajo es vacío (caer = morir); por arriba y a los lados, pared
export function tileAt(grid: Grid, x: number, y: number): number {
  if (y >= grid.height) return Tile.Empty;
  if (x < 0 || y < 0 || x >= grid.width) return Tile.Solid;
  return grid.tiles[y * grid.width + x];
}
