import Phaser from 'phaser';
import { Knight } from '../entities/player/Knight';
import { Input } from '../systems/Input';
import { loadPlayerConfig } from '../systems/PlayerConfig';
import { TuningPanel } from '../utils/TuningPanel';

// Sala de prueba de movimiento (semanas 1–2). # = sólido, P = inicio del jugador
const TEST_ROOM = [
  '############################################################',
  '#..........................................................#',
  '#..........................................................#',
  '#..........................................................#',
  '#...............................................#####......#',
  '#..........................................................#',
  '#....................####..................................#',
  '#.......................................####...............#',
  '#.............####.........................................#',
  '#......................................................##..#',
  '#..........................####.........................#..#',
  '#.....................................#.................#..#',
  '#....................................##.................#..#',
  '#.P.......##.......................###.........#........#..#',
  '#........###......................####.........#...........#',
  '#######.#####...###...##...#############.....###############',
  '#######.#####...###...##...#############.....###############',
];

const TILE = 16;

export class GameScene extends Phaser.Scene {
  private player!: Knight;
  private input2!: Input;
  private panel!: TuningPanel;
  private spawn = new Phaser.Math.Vector2();
  private debugText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    const data = TEST_ROOM.map((row, y) =>
      [...row].map((ch, x) => {
        if (ch === 'P') this.spawn.set(x * TILE + TILE / 2, y * TILE);
        return ch === '#' ? 0 : -1;
      }),
    );
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles')!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setCollision(0);

    const cfg = loadPlayerConfig();
    this.input2 = new Input(this);
    this.player = new Knight(this, this.spawn.x, this.spawn.y, this.input2, cfg);
    this.physics.add.collider(this.player, layer);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.panel = new TuningPanel(cfg);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F1).on('down', () => this.panel.toggle());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.panel.destroy());

    this.add.text(4, 4, 'F1: ajustes · Shift: dash', { fontSize: '8px', color: '#ffffff' }).setScrollFactor(0);
    this.debugText = this.add.text(4, 14, '', { fontSize: '8px', color: '#aaaaaa' }).setScrollFactor(0);
  }

  update(_time: number, delta: number) {
    // Limitar dt para que un tirón del navegador no atraviese paredes
    const dt = Math.min(delta, 50);
    this.input2.update();
    this.player.update(dt);

    if (this.player.y > this.physics.world.bounds.height + 32) {
      this.player.setPosition(this.spawn.x, this.spawn.y);
      this.player.body.setVelocity(0, 0);
    }

    const b = this.player.body;
    this.debugText.setText(
      `vx ${b.velocity.x.toFixed(0)} vy ${b.velocity.y.toFixed(0)} suelo ${this.player.onFloor ? 'sí' : 'no'}`,
    );
  }
}
