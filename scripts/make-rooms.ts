// Convierte las salas ASCII de scripts/rooms/*.ts en mapas JSON de Tiled (src/data/rooms/<bioma>/).
// Uso: npm run rooms            (no sobrescribe salas existentes: pueden haberse editado en Tiled)
//      npm run rooms -- --force (regenera todas)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rooms as bioma1, type RoomDef } from './rooms/bioma1.ts';

const ROOM_W = 30;
const ROOM_H = 17;
const INNER_W = ROOM_W - 2;
const INNER_H = 14;
const TILE = 16;
const SIDE_OPENING_ROWS = [11, 12, 13, 14];
const VERTICAL_OPENING_COLS = [12, 13, 14, 15, 16, 17];

const GID: Record<string, number> = { '#': 1, '=': 2, '?': 3 };
const OBJECT_TYPES: Record<string, string> = { P: 'player', X: 'exit', E: 'enemy', o: 'coin', C: 'chest' };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const tilesetImage = join(root, 'public/assets/tiles/placeholder-tiles.png');

function buildRoom(def: RoomDef) {
  if (def.rows.length !== INNER_H) throw new Error(`${def.name}: ${def.rows.length} filas, se esperaban ${INNER_H}`);
  const grid: string[][] = [];
  for (let y = 0; y < ROOM_H; y++) {
    const row: string[] = [];
    for (let x = 0; x < ROOM_W; x++) {
      const border = x === 0 || x === ROOM_W - 1 || y === 0 || y >= ROOM_H - 2;
      row.push(border ? '#' : '.');
    }
    grid.push(row);
  }

  def.rows.forEach((line, i) => {
    if (line.length > INNER_W) throw new Error(`${def.name}: la fila ${i + 1} mide ${line.length} (> ${INNER_W})`);
    [...line.padEnd(INNER_W, '.')].forEach((ch, x) => (grid[i + 1][x + 1] = ch));
  });

  for (const exit of def.exits) {
    if (exit === 'L') SIDE_OPENING_ROWS.forEach((y) => (grid[y][0] = '.'));
    if (exit === 'R') SIDE_OPENING_ROWS.forEach((y) => (grid[y][ROOM_W - 1] = '.'));
    if (exit === 'U') VERTICAL_OPENING_COLS.forEach((x) => (grid[0][x] = '.'));
    if (exit === 'D') VERTICAL_OPENING_COLS.forEach((x) => (grid[ROOM_H - 2][x] = grid[ROOM_H - 1][x] = '.'));
  }

  const data: number[] = [];
  const objects: object[] = [];
  let nextId = 1;
  grid.forEach((row, y) =>
    row.forEach((ch, x) => {
      data.push(GID[ch] ?? 0);
      const type = OBJECT_TYPES[ch];
      if (type) {
        objects.push({ id: nextId++, name: type, type, x: x * TILE, y: y * TILE, width: TILE, height: TILE, rotation: 0, visible: true });
      } else if (!(ch in GID) && ch !== '.') {
        throw new Error(`${def.name}: carácter desconocido "${ch}"`);
      }
    }),
  );

  return { data, objects, nextObjectId: nextId };
}

function toTiledJson(def: RoomDef, outDir: string) {
  const { data, objects, nextObjectId } = buildRoom(def);
  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.11.0',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width: ROOM_W,
    height: ROOM_H,
    tilewidth: TILE,
    tileheight: TILE,
    nextlayerid: 3,
    nextobjectid: nextObjectId,
    properties: [
      { name: 'kind', type: 'string', value: def.kind },
      { name: 'exits', type: 'string', value: def.exits },
    ],
    tilesets: [
      {
        firstgid: 1,
        name: 'placeholder',
        tilewidth: TILE,
        tileheight: TILE,
        tilecount: 3,
        columns: 3,
        margin: 0,
        spacing: 0,
        image: relative(outDir, tilesetImage).replaceAll('\\', '/'),
        imagewidth: TILE * 3,
        imageheight: TILE,
      },
    ],
    layers: [
      { id: 1, name: 'terrain', type: 'tilelayer', x: 0, y: 0, width: ROOM_W, height: ROOM_H, opacity: 1, visible: true, data },
      { id: 2, name: 'spawns', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects },
    ],
  };
}

// PNG mínimo (RGBA, sin dependencias) para que Tiled pueda mostrar el tileset
function writePlaceholderTileset(path: string) {
  const w = TILE * 3;
  const h = TILE;
  const colors: [number, number, number][] = [[0x4a, 0x3b, 0x5c], [0x8a, 0x6a, 0x40], [0x6b, 0x2a, 0x3a]];
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const tile = Math.floor(x / TILE);
      const transparent = tile === 1 && y >= 4; // plataforma: solo la franja superior
      const [r, g, b] = colors[tile];
      raw.set([r, g, b, transparent ? 0 : 255], y * (w * 4 + 1) + 1 + x * 4);
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, body: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const typed = Buffer.concat([Buffer.from(type), body]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(typed));
    return Buffer.concat([len, typed, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
}

const biomes: Record<string, RoomDef[]> = { bioma1 };

writePlaceholderTileset(tilesetImage);
for (const [biome, defs] of Object.entries(biomes)) {
  const outDir = join(root, 'src/data/rooms', biome);
  mkdirSync(outDir, { recursive: true });
  for (const def of defs) {
    const file = join(outDir, `${def.name}.json`);
    if (existsSync(file) && !force) {
      console.log(`= ${biome}/${def.name} (ya existe)`);
      continue;
    }
    writeFileSync(file, JSON.stringify(toTiledJson(def, outDir), null, 1));
    console.log(`+ ${biome}/${def.name}`);
  }
}
