// Chunks del bioma 3 (Ciudadela del cielo roto): columnas, islas flotantes, puentes rotos y agujas.
// Mismo formato y reglas que bioma1.ts; en el juego se mezclan con los del bioma 1.

import type { ChunkDef } from './bioma1.ts';

const G = '^'.repeat(30);
const gap = (left: number, width: number) => '^'.repeat(left) + '.'.repeat(width) + '^'.repeat(30 - left - width);

export const chunks: ChunkDef[] = [
  { name: 'b3_ll_columns', kind: 'normal', difficulty: 1, entry: 'L', exit: 'L', rows: {
    12: '......oo......oo......oo',
    13: '......##......##......##',
    14: '......##......##......##',
    15: G,
  } },
  { name: 'b3_ll_floating', kind: 'normal', difficulty: 2, entry: 'L', exit: 'L', rows: {
    11: '.......o.....o.....o',
    12: '.............E',
    13: '......###...###...###...##',
    15: '^^^^' + '.'.repeat(22) + '^^^^',
  } },
  { name: 'b3_ll_shoggoth_hall', kind: 'normal', difficulty: 2, entry: 'L', exit: 'L', rows: {
    10: '#'.repeat(30),
    13: '...o....o....o....o....o',
    14: '.......E.........E',
    15: G,
  } },
  { name: 'b3_ll_broken_bridge', kind: 'normal', difficulty: 3, entry: 'L', exit: 'L', rows: {
    11: '....o......o.......o......o',
    14: '...====..====...====...====...',
    15: '^^^' + '.'.repeat(24) + '^^^',
  } },
  { name: 'b3_mm_terrace', kind: 'normal', difficulty: 1, entry: 'M', exit: 'M', rows: {
    7: '.....ooo...........ooo',
    8: '....=====..........=====',
    10: '..........E',
    11: G,
  } },
  { name: 'b3_mm_void_steps', kind: 'normal', difficulty: 2, entry: 'M', exit: 'M', rows: {
    8: '......oo....oo....oo',
    10: '......##....##....##....##',
    11: '^^^^^' + '.'.repeat(20) + '^^^^^',
  } },
  { name: 'b3_mm_spires', kind: 'normal', difficulty: 3, entry: 'M', exit: 'M', rows: {
    9: '.......o....o....o....o',
    11: '^^^^...^....^....^....^...^^^^',
  } },
  { name: 'b3_hh_battlements', kind: 'normal', difficulty: 1, entry: 'H', exit: 'H', rows: {
    4: '.....o.......o.......o',
    6: '...#...#...#...#...#...#...#',
    7: G,
  } },
  { name: 'b3_hh_sky_bridge', kind: 'normal', difficulty: 2, entry: 'H', exit: 'H', rows: {
    4: '..........ooo....ooo',
    7: '^^^^^^^^..===....===..^^^^^^^^',
  } },
  { name: 'b3_hh_nest', kind: 'normal', difficulty: 3, entry: 'H', exit: 'H', rows: {
    3: '......o.......o.......o',
    6: '.........E......E',
    7: '^^^^^...^^^^...^^^^...^^^^^^^^',
  } },
  { name: 'b3_mh_tower', kind: 'normal', difficulty: 2, entry: 'M', exit: 'H', rows: {
    5: '........................oo',
    7: '......................^^^^^^^^',
    9: '..............^^^^^^^^',
    10: '.....E',
    11: G,
  } },
  { name: 'b3_lh_spiral', kind: 'normal', difficulty: 3, entry: 'L', exit: 'H', rows: {
    5: '...................oo',
    7: '........................^^^^^^',
    8: '..................====',
    9: '...........=====',
    12: '....=====',
    15: gap(10, 14),
  } },
];
