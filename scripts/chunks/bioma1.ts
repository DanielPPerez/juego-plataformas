// Chunks del bioma 1 (Aldea maldita). Cada chunk mide 30 columnas × 17 filas.
// Las filas se escriben de arriba abajo y se alinean abajo: si hay menos de 17, el resto es cielo.
// Las filas cortas se rellenan con '.' a la derecha.
//
//  #  sólido            =  plataforma atravesable   ?  bloque aleatorio (50 %)
//  P  inicio jugador    X  salida                   E  enemigo (prob.)
//  o  moneda (prob.)    C  cofre                    .  vacío
//
// Contrato de bordes (lo comprueba make-chunks.ts): columnas 0–1 y 28–29 con suelo en las
// filas 15–16 y aire en las filas 11–14. Así cualquier chunk encaja detrás de cualquier otro.
// Los pies del jugador sobre el suelo están en la fila 14.

export interface ChunkDef {
  name: string;
  kind: 'start' | 'normal' | 'exit';
  difficulty: number;
  rows: string[];
}

const G = '#'.repeat(30);

export const chunks: ChunkDef[] = [
  {
    name: 'start',
    kind: 'start',
    difficulty: 0,
    rows: [
      '....................ooo',
      '...................=====',
      '',
      '',
      '..P',
      G,
      G,
    ],
  },
  {
    name: 'platforms',
    kind: 'normal',
    difficulty: 1,
    rows: [
      '..........o..o',
      '.........======',
      '',
      '',
      '....=====..........=====',
      '',
      '......E................E',
      G,
      G,
    ],
  },
  {
    name: 'small_pit',
    kind: 'normal',
    difficulty: 1,
    rows: [
      '............ooo',
      '',
      '......E',
      '#############...##############',
      '#############...##############',
    ],
  },
  {
    name: 'hill',
    kind: 'normal',
    difficulty: 1,
    rows: [
      '............oEoo',
      '............####',
      '..........########',
      '........############',
      '......################',
      G,
      G,
    ],
  },
  {
    name: 'stones',
    kind: 'normal',
    difficulty: 2,
    rows: [
      '..........o..o..o',
      '.........###.#..###',
      '',
      '',
      '',
      '########..............########',
      '########..............########',
    ],
  },
  {
    name: 'stair_gap',
    kind: 'normal',
    difficulty: 2,
    rows: [
      '...........o...o',
      '..........##...##',
      '.........###...###',
      '........####...####',
      '.......#####...#####',
      '############...###############',
      '############...###############',
    ],
  },
  {
    name: 'low_ceiling',
    kind: 'normal',
    difficulty: 2,
    rows: [
      '.....###########.......#####',
      '',
      '',
      '.........o.o.o.o',
      '........E.........E',
      G,
      G,
    ],
  },
  {
    name: 'platform_hop',
    kind: 'normal',
    difficulty: 2,
    rows: [
      '...........o.....o.....o',
      '..........===...===...===',
      '',
      '',
      '',
      '#######................#######',
      '#######................#######',
    ],
  },
  {
    name: 'arena',
    kind: 'normal',
    difficulty: 2,
    rows: [
      '.....ooo...........ooo',
      '....=====..........=====',
      '',
      '',
      '.....E.......E........E',
      G,
      G,
    ],
  },
  {
    name: 'tower',
    kind: 'normal',
    difficulty: 3,
    rows: [
      '..............oo',
      '..............##',
      '..............##',
      '..............##',
      '..........??..##',
      '..............##......E',
      G,
      G,
    ],
  },
  {
    name: 'pits_enemies',
    kind: 'normal',
    difficulty: 3,
    rows: [
      '.......o.........o',
      '......===.......===',
      '',
      '',
      '...........E.........E',
      '#####...######...#####...#####',
      '#####...######...#####...#####',
    ],
  },
  {
    name: 'exit',
    kind: 'exit',
    difficulty: 0,
    rows: [
      '..o.o.o',
      '',
      '......................X',
      G,
      G,
    ],
  },
];
