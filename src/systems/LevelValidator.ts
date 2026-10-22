import { Tile, TILE_SIZE, tileAt, type Grid, type Point } from './level';

// Capacidad de salto del jugador en tiles, estimada a la baja para que "alcanzable" sea seguro
export interface JumpAbility {
  maxRise: number;
  maxReach: number;
}

interface JumpConfig {
  maxRunSpeed: number;
  jumpVelocity: number;
  airJumps: number;
  airJumpVelocity: number;
  gravity: number;
  dashSpeed: number;
  dashDurationMs: number;
}

export function abilityFromConfig(cfg: JumpConfig): JumpAbility {
  const rise = (cfg.jumpVelocity ** 2 + cfg.airJumps * cfg.airJumpVelocity ** 2) / (2 * cfg.gravity);
  // Distancia horizontal de un salto simple completo + un dash en el aire (que no pierde altura)
  const jumpReach = Math.min(4, Math.floor((cfg.maxRunSpeed * 2 * cfg.jumpVelocity) / cfg.gravity / TILE_SIZE) - 1);
  const dashReach = Math.floor((cfg.dashSpeed * cfg.dashDurationMs) / 1000 / TILE_SIZE) - 1;
  return {
    maxRise: Math.max(1, Math.floor(rise / TILE_SIZE) - 1),
    maxReach: Math.max(1, jumpReach + Math.max(0, dashReach)),
  };
}

// BFS sobre las celdas donde el jugador (1×2 tiles) puede estar de pie.
// Movimientos: caminar, caer, bajar de plataforma, y saltar = subir recto h tiles + avanzar d tiles + caer.
export function reachableCells(grid: Grid, from: Point, ability: JumpAbility): Uint8Array {
  const { width, height } = grid;
  const solid = (x: number, y: number) => tileAt(grid, x, y) === Tile.Solid;
  const platform = (x: number, y: number) => tileAt(grid, x, y) === Tile.Platform;
  const clear = (x: number, y: number) => y >= 1 && !solid(x, y) && !solid(x, y - 1);
  const standing = (x: number, y: number) => clear(x, y) && (solid(x, y + 1) || platform(x, y + 1));

  // Celda donde aterriza cayendo desde (x, y), o -1 si cae fuera del mapa (hueco). Con caché.
  const landing = new Int32Array(width * height).fill(-2);
  const fall = (x: number, y: number): number => {
    const start = y * width + x;
    if (landing[start] !== -2) return landing[start];
    let result = -1;
    while (y < height) {
      if (standing(x, y)) {
        result = y * width + x;
        break;
      }
      if (!clear(x, y + 1)) break;
      y++;
    }
    return (landing[start] = result);
  };

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const push = (key: number) => {
    if (key >= 0 && !visited[key]) {
      visited[key] = 1;
      queue.push(key);
    }
  };

  push(fall(from.x, from.y));
  while (queue.length > 0) {
    const key = queue.pop()!;
    const x = key % width;
    const y = Math.floor(key / width);

    for (const dir of [-1, 1]) {
      if (clear(x + dir, y)) push(fall(x + dir, y));
    }
    if (platform(x, y + 1)) push(fall(x, y + 1));

    for (let h = 1; h <= ability.maxRise; h++) {
      const ny = y - h;
      if (!clear(x, ny)) break;
      push(fall(x, ny));
      for (const dir of [-1, 1]) {
        for (let d = 1; d <= ability.maxReach; d++) {
          const nx = x + dir * d;
          if (!clear(nx, ny)) break;
          push(fall(nx, ny));
        }
      }
    }
  }
  return visited;
}

export function isReachable(grid: Grid, from: Point, to: Point, ability: JumpAbility): boolean {
  return reachableCells(grid, from, ability)[to.y * grid.width + to.x] === 1;
}
