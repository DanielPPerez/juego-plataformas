// Chunks del bioma 2 (Puerto podrido): muelles sobre el agua, barcos, cajas y mástiles.
// Mismo formato y reglas que bioma1.ts; en el juego se mezclan con los del bioma 1.

import type { ChunkDef } from './bioma1.ts';

const G = '^'.repeat(30);
const gap = (left: number, width: number) => '^'.repeat(left) + '.'.repeat(width) + '^'.repeat(30 - left - width);

export const chunks: ChunkDef[] = [
  { name: 'b2_ll_piers', kind: 'normal', difficulty: 1, entry: 'L', exit: 'L', rows: {
    12: '.........oo....oo....oo',
    14: '........E',
    15: '^^^^^^====..====..====^^^^^^^^',
  } },
  { name: 'b2_ll_crates', kind: 'normal', difficulty: 1, entry: 'L', exit: 'L', rows: {
    11: '.......oo.........oo',
    13: '.......##.........##',
    14: '.......##....##...##...E',
    15: G,
  } },
  { name: 'b2_ll_boat', kind: 'normal', difficulty: 2, entry: 'L', exit: 'L', rows: {
    9: '..............ooo',
    10: '..............###',
    11: '..............###',
    12: '.........E....###...E',
    13: '......##################',
    15: gap(5, 20),
  } },
  { name: 'b2_ll_drowned', kind: 'normal', difficulty: 3, entry: 'L', exit: 'L', rows: {
    11: '.......o....o....o....o',
    14: '.......#....#....#....#',
    15: gap(3, 24),
  } },
  { name: 'b2_mm_dock', kind: 'normal', difficulty: 1, entry: 'M', exit: 'M', rows: {
    7: '......ooo..........ooo',
    8: '.....=====........=====',
    10: '.....E...........E',
    11: G,
  } },
  { name: 'b2_mm_net', kind: 'normal', difficulty: 2, entry: 'M', exit: 'M', rows: {
    7: '..........oooooo',
    10: '...............E',
    11: '^^^^^^' + '='.repeat(18) + '^^^^^^',
  } },
  { name: 'b2_mm_gaps', kind: 'normal', difficulty: 3, entry: 'M', exit: 'M', rows: {
    8: '......o.......o.......o',
    10: '..........E.......E',
    11: '^^^^^...^^^^^...^^^^^...^^^^^^',
  } },
  { name: 'b2_hh_rigging', kind: 'normal', difficulty: 2, entry: 'H', exit: 'H', rows: {
    4: '.........o.....o.....o',
    7: '^^^^^^..===...===...===..^^^^^',
  } },
  { name: 'b2_hh_mast', kind: 'normal', difficulty: 3, entry: 'H', exit: 'H', rows: {
    2: '...............E',
    3: '..............####',
    4: '..............####',
    5: '..............####',
    6: '..............####',
    7: G,
  } },
  { name: 'b2_lm_dock_stairs', kind: 'normal', difficulty: 1, entry: 'L', exit: 'M', rows: {
    9: '.......................oo',
    11: '..................^^^^^^^^^^^^',
    13: '............^^^^^^',
    14: '.....E',
    15: G,
  } },
  { name: 'b2_lm_crane', kind: 'normal', difficulty: 2, entry: 'L', exit: 'M', rows: {
    8: '..............ooo',
    9: '.............=====',
    11: '.......................^^^^^^^',
    12: '......====',
    15: gap(11, 12),
  } },
  { name: 'b2_mh_ramp', kind: 'normal', difficulty: 2, entry: 'M', exit: 'H', rows: {
    5: '.........................oo',
    7: '......................^^^^^^^^',
    9: '...............^^^^^^^',
    10: '....E',
    11: G,
  } },
];
