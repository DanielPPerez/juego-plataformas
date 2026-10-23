// Convierte los chunks ASCII de scripts/chunks/*.ts en mapas JSON de Tiled (src/data/chunks/<bioma>/).
// Uso: npm run chunks            (no sobrescribe chunks existentes: pueden haberse editado en Tiled)
//      npm run chunks -- --force (regenera todos)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chunks as bioma1, type ChunkDef } from './chunks/bioma1.ts';
import { chunks as chase1 } from './chunks/chase1.ts';
import { chunks as bioma2 } from './chunks/bioma2.ts';
import { chunks as bioma3 } from './chunks/bioma3.ts';
import { chase2, chase3 } from './chunks/chase23.ts';

const CHUNK_W = 30;
const CHUNK_H = 17;
const TILE = 16;
const FEET_ROW = { L: 14, M: 10, H: 6 };

const GID: Record<string, number> = { '#': 1, '=': 2, '?': 3 };
const OBJECT_TYPES: Record<string, string> = { P: 'player', X: 'exit', E: 'enemy', o: 'coin', C: 'chest' };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const tilesetImage = join(root, 'public/assets/tiles/placeholder-tiles.png');

function buildGrid(def: ChunkDef): string[][] {
  const rows = Array.from({ length: CHUNK_H }, (_, y) => def.rows[y] ?? '');
  const grid = rows.map((line, y) => {
    if (line.length > CHUNK_W) throw new Error(`${def.name}: la fila ${y} mide ${line.length} (> ${CHUNK_W})`);
    return [...line.padEnd(CHUNK_W, '.')];
  });

  // '^' = superficie del terreno: es sólida y todo lo que hay debajo también
  for (let x = 0; x < CHUNK_W; x++) {
    const top = grid.findIndex((row) => row[x] === '^');
    if (top >= 0) for (let y = top; y < CHUNK_H; y++) grid[y][x] = '#';
  }

  // Contrato de bordes: suelo desde los pies hacia abajo y 4 filas de aire encima
  const edges: [number[], number][] = [[[0, 1], FEET_ROW[def.entry]], [[CHUNK_W - 2, CHUNK_W - 1], FEET_ROW[def.exit]]];
  for (const [cols, feet] of edges) {
    for (const x of cols) {
      const ground = grid.slice(feet + 1).every((row) => row[x] === '#');
      const air = [0, 1, 2, 3].every((d) => !(grid[feet - d][x] in GID));
      if (!ground || !air) throw new Error(`${def.name}: la columna ${x} no cumple el contrato de bordes`);
    }
  }
  return grid;
}

function toTiledJson(def: ChunkDef, outDir: string) {
  const grid = buildGrid(def);
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

  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.11.0',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width: CHUNK_W,
    height: CHUNK_H,
    tilewidth: TILE,
    tileheight: TILE,
    nextlayerid: 3,
    nextobjectid: nextId,
    properties: [
      { name: 'kind', type: 'string', value: def.kind },
      { name: 'difficulty', type: 'int', value: def.difficulty },
      { name: 'entry', type: 'string', value: def.entry },
      { name: 'exit', type: 'string', value: def.exit },
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
      { id: 1, name: 'terrain', type: 'tilelayer', x: 0, y: 0, width: CHUNK_W, height: CHUNK_H, opacity: 1, visible: true, data },
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

const biomes: Record<string, ChunkDef[]> = { bioma1, bioma2, bioma3, chase1, chase2, chase3 };

writePlaceholderTileset(tilesetImage);
for (const [biome, defs] of Object.entries(biomes)) {
  const outDir = join(root, 'src/data/chunks', biome);
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
