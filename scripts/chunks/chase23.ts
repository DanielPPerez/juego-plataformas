// Chunks de persecución de La Puerta (chase2, barco y muelle) y El Guardián (chase3, ciudadela).
// Reglas de chase1.ts + una más: ambos jefes inundan la parte baja de la pantalla, así que cada chunk
// tiene un refugio (plataforma con los pies en la fila 11 o más arriba) en cada mitad. Lo comprueba el test.

import type { ChunkDef } from './bioma1.ts';

const G = '^'.repeat(30);
const gap = (left: number, width: number) => '^'.repeat(left) + '.'.repeat(width) + '^'.repeat(30 - left - width);
// Refugios contra la marea: dos plataformas atravesables en la fila 12
const REFUGE = '...=====..........=====';

const chase = (name: string, rows: Record<number, string>): ChunkDef => ({
  name, kind: 'normal', difficulty: 1, entry: 'L', exit: 'L', rows: { 12: REFUGE, ...rows },
});
const ends = (prefix: string): ChunkDef[] => [
  { name: `${prefix}_start`, kind: 'start', difficulty: 0, entry: 'L', exit: 'L', rows: { 12: REFUGE, 14: '.............P', 15: G } },
  { name: `${prefix}_exit`, kind: 'exit', difficulty: 0, entry: 'L', exit: 'L', rows: { 12: REFUGE, 14: '.............X', 15: G } },
];

export const chase2: ChunkDef[] = [
  ...ends('c2'),
  chase('c2_planks', { 10: '....ooo..........ooo', 15: G }),
  chase('c2_gap', { 11: '.............ooo', 15: gap(14, 3) }),
  chase('c2_crates', { 13: '.........##.........##', 14: '.........##.........##', 15: G }),
  chase('c2_deck', { 13: '...........oooooo', 15: '^^^^^^^^^^========^^^^^^^^^^^^' }),
  chase('c2_mast', { 13: '..............##', 14: '..............##', 15: G }),
  chase('c2_barrels', { 14: '.......#.......#.......#', 15: G }),
  chase('c2_step_gap', { 13: '......................##', 14: '......................##', 15: gap(10, 3) }),
  chase('c2_hull', { 14: '..........##########', 15: G }),
  chase('c2_small_gap', { 11: '...........oo', 15: gap(8, 2) }),
];

export const chase3: ChunkDef[] = [
  ...ends('c3'),
  chase('c3_columns', { 13: '.......##.........##', 14: '.......##.........##', 15: G }),
  chase('c3_cracks', { 15: gap(12, 3) }),
  chase('c3_altar', { 13: '.............####', 14: '...........########', 15: G }),
  chase('c3_bridge', { 15: '^^^^^^^^^^^========^^^^^^^^^^^' }),
  chase('c3_rubble', { 14: '......#....#........#....#', 15: G }),
  chase('c3_pillar', { 13: '...............#', 14: '...............#', 15: G }),
  chase('c3_steps', { 13: '................##', 14: '..............####', 15: G }),
  chase('c3_gap_orbs', { 10: '..........ooooo', 15: gap(13, 3) }),
  chase('c3_flat', { 10: '....o.o.o.....o.o.o', 15: G }),
];
