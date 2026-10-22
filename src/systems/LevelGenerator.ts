import { RNG } from './RNG';
import { ROOM_H, ROOM_W, Tile, type Level, type Point, type Spawn } from './level';
import { isCompletable, type JumpAbility } from './LevelValidator';
import { RoomGid, type Exit, type RoomKind, type RoomTemplate } from './rooms';

export const GRID_W = 4;
export const GRID_H = 4;
const MAX_ATTEMPTS = 20;

// Probabilidad de que aparezca cada objeto marcado en la sala
const SPAWN_CHANCE: Record<string, number> = { enemy: 0.6, coin: 0.75, chest: 1 };

interface Cell {
  kind: RoomKind;
  exits: Set<Exit>;
}

// Genera un nivel completable. Si un intento falla la validación, reintenta con una seed derivada.
export function generateLevel(seed: string, templates: RoomTemplate[], ability: JumpAbility): Level {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = new RNG(attempt === 0 ? seed : `${seed}#${attempt}`);
    const level = buildLevel(seed, rng, templates);
    if (isCompletable(level, ability)) return { ...level, attempts: attempt + 1 };
  }
  throw new Error(`No se pudo generar un nivel completable para la seed "${seed}"`);
}

// Camino garantizado estilo Spelunky: empieza arriba, avanza a los lados y baja hasta la última fila
function tracePath(rng: RNG): Cell[][] {
  const grid: Cell[][] = Array.from({ length: GRID_H }, () =>
    Array.from({ length: GRID_W }, () => ({ kind: 'side' as RoomKind, exits: new Set<Exit>() })),
  );
  let x = rng.int(0, GRID_W - 1);
  let y = 0;
  let dir = rng.pick([-1, 1]);
  grid[y][x].kind = 'start';

  for (;;) {
    const nx = x + dir;
    const goDown = rng.int(1, 5) === 5 || nx < 0 || nx >= GRID_W;
    if (goDown) {
      if (y === GRID_H - 1) break;
      grid[y][x].exits.add('D');
      y++;
      grid[y][x].exits.add('U');
      dir = rng.pick([-1, 1]);
    } else {
      grid[y][x].exits.add(dir > 0 ? 'R' : 'L');
      x = nx;
      grid[y][x].exits.add(dir > 0 ? 'L' : 'R');
    }
    grid[y][x].kind = 'normal';
  }
  grid[y][x].kind = 'exit';
  return grid;
}

// La sala debe tener al menos las salidas pedidas, y abertura abajo solo si se pide (si no, sería un pozo)
function fits(template: RoomTemplate, cell: Cell): boolean {
  if (template.kind !== cell.kind) return false;
  if (template.exits.includes('D') !== cell.exits.has('D')) return false;
  return [...cell.exits].every((e) => template.exits.includes(e));
}

function buildLevel(seed: string, rng: RNG, templates: RoomTemplate[]): Omit<Level, 'attempts'> {
  const grid = tracePath(rng);
  const width = GRID_W * ROOM_W;
  const height = GRID_H * ROOM_H;
  const tiles = new Uint8Array(width * height);
  const spawns: Spawn[] = [];
  const layout: string[][] = [];
  let start: Point | undefined;
  let exit: Point | undefined;

  for (let gy = 0; gy < GRID_H; gy++) {
    layout.push([]);
    for (let gx = 0; gx < GRID_W; gx++) {
      const cell = grid[gy][gx];
      const candidates = templates.filter((t) => fits(t, cell));
      if (candidates.length === 0) {
        throw new Error(`No hay sala "${cell.kind}" con salidas ${[...cell.exits].join('')}`);
      }
      const room = rng.pick(candidates);
      layout[gy].push(room.name);
      const ox = gx * ROOM_W;
      const oy = gy * ROOM_H;

      room.tiles.forEach((gid, i) => {
        const tile =
          gid === RoomGid.Solid ? Tile.Solid
          : gid === RoomGid.Platform ? Tile.Platform
          : gid === RoomGid.Random ? (rng.float() < 0.5 ? Tile.Solid : Tile.Empty)
          : Tile.Empty;
        tiles[(oy + Math.floor(i / ROOM_W)) * width + ox + (i % ROOM_W)] = tile;
      });

      for (const obj of room.objects) {
        const p = { x: ox + obj.x, y: oy + obj.y };
        if (obj.type === 'player') start = p;
        else if (obj.type === 'exit') exit = p;
        else if (rng.float() < (SPAWN_CHANCE[obj.type] ?? 1)) spawns.push({ type: obj.type, ...p });
      }
    }
  }

  // Cerrar el borde del nivel (aberturas de salas que dan al exterior)
  for (let x = 0; x < width; x++) tiles[x] = tiles[(height - 1) * width + x] = Tile.Solid;
  for (let y = 0; y < height; y++) tiles[y * width] = tiles[y * width + width - 1] = Tile.Solid;

  if (!start || !exit) throw new Error('Las salas de inicio y salida deben tener P y X');
  return { seed, width, height, tiles, start, exit, spawns, layout };
}
