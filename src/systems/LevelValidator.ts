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
}

export function abilityFromConfig(cfg: JumpConfig): JumpAbility {
  const rise = (cfg.jumpVelocity ** 2 + cfg.airJumps * cfg.airJumpVelocity ** 2) / (2 * cfg.gravity);
  // Distancia horizontal de un salto simple completo (sin dash ni doble salto)
  const reach = (cfg.maxRunSpeed * 2 * cfg.jumpVelocity) / cfg.gravity;
  return {
    maxRise: Math.max(1, Math.floor(rise / TILE_SIZE) - 1),
    maxReach: Math.max(1, Math.min(4, Math.floor(reach / TILE_SIZE) - 1)),
  };
}

// BFS sobre las celdas donde el jugador (1×2 tiles) puede estar de pie.
// Movimientos: caminar, caer, bajar de plataforma, y saltar = subir recto h tiles + avanzar d tiles + caer.
export function reachableCells(grid: Grid, from: Point, ability: JumpAbility): Set<number> {
  const { width, height } = grid;
  const solid = (x: number, y: number) => tileAt(grid, x, y) === Tile.Solid;
  const platform = (x: number, y: number) => tileAt(grid, x, y) === Tile.Platform;
  const clear = (x: number, y: number) => y >= 1 && !solid(x, y) && !solid(x, y - 1);
  const standing = (x: number, y: number) => clear(x, y) && (solid(x, y + 1) || platform(x, y + 1));

  // Celda donde aterriza cayendo desde (x, y), o -1 si cae fuera del mapa (hueco)
  const fall = (x: number, y: number): number => {
    while (y < height) {
      if (standing(x, y)) return y * width + x;
      if (!clear(x, y + 1)) return -1;
      y++;
    }
    return -1;
  };

  const visited = new Set<number>();
  const queue: number[] = [];
  const push = (key: number) => {
    if (key >= 0 && !visited.has(key)) {
      visited.add(key);
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
  return reachableCells(grid, from, ability).has(to.y * grid.width + to.x);
}
