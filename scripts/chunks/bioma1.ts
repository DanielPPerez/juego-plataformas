// Chunks del bioma 1 (Aldea maldita). Cada chunk mide 30 columnas × 17 filas (0 = arriba, 16 = abajo).
// Solo se escriben las filas con contenido, indexadas por número; las filas cortas se rellenan con '.'.
//
//  ^  superficie del terreno (sólido hacia abajo)   #  bloque sólido suelto
//  =  plataforma atravesable                        ?  bloque aleatorio (50 %)
//  P  inicio jugador    X  salida    E  enemigo (prob.)    o  moneda (prob.)    C  cofre
//
// Alturas de los bordes (entry/exit): L = pies en la fila 14 (suelo 15), M = fila 10 (suelo 11), H = fila 6 (suelo 7).
// make-chunks.ts comprueba que las columnas 0–1 y 28–29 cumplan su altura. Los chunks normales también
// se usan reflejados (entrada y salida intercambiadas), así que una subida L→M da también una bajada M→L.
// Dificultad: 1 fácil, 2 media, 3 difícil (solo a partir del 4.º chunk del nivel).

import type { Height } from '../../src/systems/level.ts';

export interface ChunkDef {
  name: string;
  kind: 'start' | 'normal' | 'exit';
  difficulty: number;
  entry: Height;
  exit: Height;
  rows: Record<number, string>;
}

const G = '^'.repeat(30);
const gap = (left: number, width: number) => '^'.repeat(left) + '.'.repeat(width) + '^'.repeat(30 - left - width);

export const chunks: ChunkDef[] = [
  // ── Inicio y salidas ─────────────────────────────────────────────
  { name: 'start', kind: 'start', difficulty: 0, entry: 'L', exit: 'L', rows: {
    11: '....................ooo',
    12: '...................=====',
    14: '..P',
    15: G,
  } },
  { name: 'exit_l', kind: 'exit', difficulty: 0, entry: 'L', exit: 'L', rows: {
    12: '..o.o.o',
    14: '......................X',
    15: G,
  } },
  { name: 'exit_m', kind: 'exit', difficulty: 0, entry: 'M', exit: 'M', rows: {
    8: '..o.o.o',
    10: '......................X',
    11: G,
  } },
  { name: 'exit_h', kind: 'exit', difficulty: 0, entry: 'H', exit: 'H', rows: {
    4: '..o.o.o',
    6: '......................X',
    7: G,
  } },

  // ── Bajo → bajo ──────────────────────────────────────────────────
  { name: 'll_platforms', kind: 'normal', difficulty: 1, entry: 'L', exit: 'L', rows: {
    8: '..........o..o',
    9: '.........======',
    12: '....=====..........=====',
    14: '......E................E',
    15: G,
  } },
  { name: 'll_small_pit', kind: 'normal', difficulty: 1, entry: 'L', exit: 'L', rows: {
    12: '............ooo',
    14: '......E',
    15: gap(13, 3),
  } },
  { name: 'll_hill', kind: 'normal', difficulty: 1, entry: 'L', exit: 'L', rows: {
    10: '............oEoo',
    11: '............^^^^',
    12: '..........^^^^^^^^',
    13: '........^^^^^^^^^^^^',
    14: '......^^^^^^^^^^^^^^^^',
    15: G,
  } },
  { name: 'll_stones', kind: 'normal', difficulty: 2, entry: 'L', exit: 'L', rows: {
    11: '..........o..o..o',
    12: '.........###.#..###',
    15: gap(8, 14),
  } },
  { name: 'll_stair_gap', kind: 'normal', difficulty: 2, entry: 'L', exit: 'L', rows: {
    10: '...........o...o',
    11: '..........^^...^^',
    12: '.........^^^...^^^',
    13: '........^^^^...^^^^',
    14: '.......^^^^^...^^^^^',
    15: gap(12, 3),
  } },
  { name: 'll_low_ceiling', kind: 'normal', difficulty: 2, entry: 'L', exit: 'L', rows: {
    10: '.....###########.......#####',
    13: '.........o.o.o.o',
    14: '........E.........E',
    15: G,
  } },
  { name: 'll_platform_hop', kind: 'normal', difficulty: 2, entry: 'L', exit: 'L', rows: {
    11: '...........o.....o.....o',
    12: '..........===...===...===',
    15: gap(7, 16),
  } },
  { name: 'll_arena', kind: 'normal', difficulty: 2, entry: 'L', exit: 'L', rows: {
    11: '.....ooo...........ooo',
    12: '....=====..........=====',
    14: '.....E.......E........E',
    15: G,
  } },
  { name: 'll_pits_enemies', kind: 'normal', difficulty: 3, entry: 'L', exit: 'L', rows: {
    11: '.......o.........o',
    12: '......===.......===',
    14: '...........E.........E',
    15: '^^^^^...^^^^^^...^^^^^...^^^^^',
  } },
  { name: 'll_long_jump', kind: 'normal', difficulty: 3, entry: 'L', exit: 'L', rows: {
    12: '..........oooooooo',
    14: '.......................E',
    15: gap(10, 8),
  } },
  { name: 'll_tower', kind: 'normal', difficulty: 3, entry: 'L', exit: 'L', rows: {
    9: '..............oo',
    10: '..............##',
    11: '..............##',
    12: '..............##',
    13: '..........??..##',
    14: '..............##.......E',
    15: gap(19, 3),
  } },
  { name: 'll_floating_blocks', kind: 'normal', difficulty: 3, entry: 'L', exit: 'L', rows: {
    12: '........o....o....o...o',
    13: '........#....#....#...#',
    15: gap(4, 22),
  } },

  // ── Medio → medio ────────────────────────────────────────────────
  { name: 'mm_flat', kind: 'normal', difficulty: 1, entry: 'M', exit: 'M', rows: {
    6: '.......ooo..........ooo',
    7: '......=====........=====',
    10: '.....E...........E',
    11: G,
  } },
  { name: 'mm_dip', kind: 'normal', difficulty: 1, entry: 'M', exit: 'M', rows: {
    10: '...........oooo',
    11: '^^^^^^^^^^......^^^^^^^^^^^^^^',
    12: '............E',
    13: '..........^^^^^^',
  } },
  { name: 'mm_pit', kind: 'normal', difficulty: 2, entry: 'M', exit: 'M', rows: {
    7: '...........oooo',
    10: '....E',
    11: gap(10, 4),
  } },
  { name: 'mm_high_platforms', kind: 'normal', difficulty: 2, entry: 'M', exit: 'M', rows: {
    3: '.........ooo',
    4: '........=====',
    7: '....=====.........=====',
    10: '..............E',
    11: G,
  } },
  { name: 'mm_stones', kind: 'normal', difficulty: 3, entry: 'M', exit: 'M', rows: {
    8: '.......o....o....o....o',
    9: '......##...##...##...##',
    11: gap(4, 22),
  } },
  { name: 'mm_ceiling_pits', kind: 'normal', difficulty: 3, entry: 'M', exit: 'M', rows: {
    6: '...##########....##########',
    10: '......E.......E.......E',
    11: '^^^^^^^^^...^^^^^^^...^^^^^^^^',
  } },

  // ── Alto → alto ──────────────────────────────────────────────────
  { name: 'hh_flat', kind: 'normal', difficulty: 1, entry: 'H', exit: 'H', rows: {
    3: '.....ooo...........ooo',
    4: '....=====..........=====',
    6: '........E..........E',
    7: G,
  } },
  { name: 'hh_gaps', kind: 'normal', difficulty: 2, entry: 'H', exit: 'H', rows: {
    4: '.........ooo.......ooo',
    6: '.....E',
    7: '^^^^^^^^...^^^^^^^...^^^^^^^^^',
  } },
  { name: 'hh_bridge', kind: 'normal', difficulty: 2, entry: 'H', exit: 'H', rows: {
    5: '...........oooooooo',
    7: '^^^^^^^^......E.......^^^^^^^^',
    8: '........==============',
  } },
  { name: 'hh_pillars', kind: 'normal', difficulty: 3, entry: 'H', exit: 'H', rows: {
    5: '.......o....o....o....o',
    7: '^^^^...^....^....^....^..^^^^^',
  } },
  { name: 'hh_enemy_run', kind: 'normal', difficulty: 3, entry: 'H', exit: 'H', rows: {
    3: '..o..o..o..o..o..o..o..o..o',
    6: '...E....E....E....E....E',
    7: G,
  } },

  // ── Subidas (su espejo da la bajada) ─────────────────────────────
  { name: 'lm_steps', kind: 'normal', difficulty: 1, entry: 'L', exit: 'M', rows: {
    9: '......................o',
    11: '.................^^^^^^^^^^^^^',
    13: '...........^^^^^^',
    14: '......E',
    15: G,
  } },
  { name: 'lm_platform_climb', kind: 'normal', difficulty: 2, entry: 'L', exit: 'M', rows: {
    8: '..............ooo',
    11: '......................^^^^^^^^',
    12: '.............======',
    14: '....E',
    15: G,
  } },
  { name: 'lm_wall', kind: 'normal', difficulty: 3, entry: 'L', exit: 'M', rows: {
    10: '.....................ooo',
    11: '....................^^^^^^^^^^',
    14: '..........E',
    15: gap(14, 3),
  } },
  { name: 'mh_steps', kind: 'normal', difficulty: 1, entry: 'M', exit: 'H', rows: {
    5: '.....................ooo',
    7: '....................^^^^^^^^^^',
    9: '.............^^^^^^^',
    10: '.....E',
    11: G,
  } },
  { name: 'mh_platforms', kind: 'normal', difficulty: 2, entry: 'M', exit: 'H', rows: {
    7: '.......................^^^^^^^',
    8: '.............======',
    10: '...E',
    11: gap(19, 3),
  } },
  { name: 'mh_wall', kind: 'normal', difficulty: 3, entry: 'M', exit: 'H', rows: {
    6: '......................oo',
    7: '.....................^^^^^^^^^',
    10: '.......E.....E',
    11: G,
  } },
  { name: 'lh_staircase', kind: 'normal', difficulty: 2, entry: 'L', exit: 'H', rows: {
    5: '..........................o',
    7: '.......................^^^^^^^',
    9: '..................^^^^^',
    11: '.............^^^^^',
    13: '........^^^^^',
    14: '...E',
    15: G,
  } },
  { name: 'lh_tower_climb', kind: 'normal', difficulty: 3, entry: 'L', exit: 'H', rows: {
    6: '.............ooo',
    7: '.......................^^^^^^^',
    8: '.............=====',
    11: '.....=====',
    14: '...........E',
    15: gap(12, 11),
  } },
];
