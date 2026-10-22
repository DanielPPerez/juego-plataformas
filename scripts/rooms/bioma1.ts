// Salas del bioma 1 (Aldea maldita). Solo el interior: 28 columnas × 14 filas.
// El marco (paredes, suelo y aberturas L/R/U/D) lo añade make-rooms.ts según "exits".
//
//  #  sólido            =  plataforma atravesable   ?  bloque aleatorio (50 %)
//  P  inicio jugador    X  salida                   E  enemigo (prob.)
//  o  moneda (prob.)    C  cofre                    .  vacío
//
// La fila 14 (la última) es la de los pies sobre el suelo.
// Las aberturas U/D ocupan las columnas 11–16 del interior: no taparlas en salas con U o D.

export interface RoomDef {
  name: string;
  kind: 'start' | 'normal' | 'exit' | 'side';
  exits: string;
  rows: string[];
}

const EMPTY = '';

export const rooms: RoomDef[] = [
  {
    name: 'start_lr',
    kind: 'start',
    exits: 'LR',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '....................ooo',
      '...................=====....',
      EMPTY,
      '..P.........................',
    ],
  },
  {
    name: 'start_lrd',
    kind: 'start',
    exits: 'LRD',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '...ooo..............ooo',
      '..=====.............=====...',
      EMPTY,
      '...P........................',
    ],
  },
  {
    name: 'lr_01',
    kind: 'normal',
    exits: 'LR',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '......o..............o......',
      '.....====..........====.....',
      EMPTY, EMPTY,
      '...........o....o...........',
      '..........========..........',
      EMPTY,
      '....E..........??......E....',
    ],
  },
  {
    name: 'lr_02',
    kind: 'normal',
    exits: 'LR',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '.............ooo',
      '.............oEo',
      '............####............',
      '..........########..........',
      '........############........',
      '......################......',
    ],
  },
  {
    name: 'lr_03',
    kind: 'normal',
    exits: 'LR',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '......o.............o.......',
      '....=====..........=====....',
      EMPTY, EMPTY, EMPTY,
      '.........###......###.......',
      '.........###......###.......',
      '.........###..E...###.......',
    ],
  },
  {
    name: 'lrd_01',
    kind: 'normal',
    exits: 'LRD',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '...o....................o...',
      '..====..............====....',
      EMPTY, EMPTY, EMPTY,
      '.....E..............E.......',
    ],
  },
  {
    name: 'lrd_02',
    kind: 'normal',
    exits: 'LRD',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      EMPTY,
      '............oooo',
      EMPTY,
      '..E........======.......E...',
    ],
  },
  {
    name: 'lru_01',
    kind: 'normal',
    exits: 'LRU',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '...o....................o...',
      '..=====..............=====..',
      EMPTY, EMPTY, EMPTY, EMPTY,
      '.....=====........=====.....',
      EMPTY,
      '............E...............',
    ],
  },
  {
    name: 'lru_02',
    kind: 'normal',
    exits: 'LRU',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '....ooo..............ooo....',
      '....###..............###....',
      '....###......E.......###....',
      '....###..............###....',
    ],
  },
  {
    name: 'lrud_01',
    kind: 'normal',
    exits: 'LRUD',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '..o......................o..',
      '.====..................====.',
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '....E..................E....',
    ],
  },
  {
    name: 'exit_lru',
    kind: 'exit',
    exits: 'LRU',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '.....o',
      '....===',
      EMPTY, EMPTY,
      '....................X.......',
    ],
  },
  {
    name: 'side_01',
    kind: 'side',
    exits: 'LR',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '...........C',
      '..........=====.............',
      EMPTY,
      '......ooooo.......ooooo',
      '......=====.......=====.....',
      EMPTY,
      '..............E.............',
    ],
  },
  {
    name: 'side_02',
    kind: 'side',
    exits: 'LR',
    rows: [
      EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      '...ooooo........ooooo.......',
      '..=======......=======......',
      EMPTY,
      '............o..o............',
    ],
  },
];
