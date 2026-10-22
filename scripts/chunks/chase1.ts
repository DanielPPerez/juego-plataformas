// Chunks de persecución del bioma 1 (La Llave arrasa el puente tras el jugador).
// Mismo formato que bioma1.ts. Reglas extra (GDD 6.1): todo a altura baja, como mucho un hueco
// por chunk (los bordes siempre tienen suelo, así que nunca hay dos huecos seguidos) y todo
// debe poder cruzarse con salto simple, sin doble salto ni dash (lo comprueba el test).

import type { ChunkDef } from './bioma1.ts';

const G = '^'.repeat(30);
const gap = (left: number, width: number) => '^'.repeat(left) + '.'.repeat(width) + '^'.repeat(30 - left - width);

const chase = (name: string, rows: Record<number, string>): ChunkDef => ({
  name, kind: 'normal', difficulty: 1, entry: 'L', exit: 'L', rows,
});

export const chunks: ChunkDef[] = [
  { name: 'c_start', kind: 'start', difficulty: 0, entry: 'L', exit: 'L', rows: {
    14: '....................P',
    15: G,
  } },
  { name: 'c_exit', kind: 'exit', difficulty: 0, entry: 'L', exit: 'L', rows: {
    14: '......................X',
    15: G,
  } },
  chase('c_flat', {
    12: '.........o..o..o..o',
    15: G,
  }),
  chase('c_gap', {
    12: '.............ooo',
    15: gap(14, 3),
  }),
  chase('c_gap_platform', {
    10: '...........ooo',
    11: '..........=====',
    15: gap(12, 2),
  }),
  chase('c_bridge', {
    13: '...........oooooo',
    15: '^^^^^^^^^^========^^^^^^^^^^^^',
  }),
  chase('c_hill', {
    11: '.............oo',
    12: '............####',
    13: '..........########',
    14: '........############',
    15: G,
  }),
  chase('c_block', {
    11: '...............o',
    13: '..............##',
    14: '..............##',
    15: G,
  }),
  chase('c_blocks', {
    12: '.......o.........o',
    14: '.......#.........#',
    15: G,
  }),
  chase('c_step_gap', {
    12: '.....................oo',
    13: '.....................##',
    14: '.....................##',
    15: gap(9, 3),
  }),
  chase('c_platforms', {
    10: '.....ooo...........ooo',
    11: '....=====.........=====',
    15: G,
  }),
];
