import Phaser from 'phaser';
import playerDefaults from '../data/player.json';
import { Knight } from '../entities/player/Knight';
import { Input } from '../systems/Input';
import { Tile, TILE_SIZE, type Level } from '../systems/level';
import { generateLevel } from '../systems/LevelGenerator';
import { abilityFromConfig } from '../systems/LevelValidator';
import { loadPlayerConfig } from '../systems/PlayerConfig';
import { getRooms } from '../systems/roomLibrary';
import { TuningPanel } from '../utils/TuningPanel';

interface GameSceneData {
  runSeed?: string;
  levelIndex?: number;
  coins?: number;
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

export class GameScene extends Phaser.Scene {
  private player!: Knight;
  private controls!: Input;
  private panel!: TuningPanel;
  private level!: Level;
  private runSeed = '';
  private levelIndex = 1;
  private coins = 0;
  private solidLayer!: Phaser.Tilemaps.TilemapLayer;
  private platformLayer!: Phaser.Tilemaps.TilemapLayer;
  private hudText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData) {
    // La seed de la run viene de la URL (?seed=abc) para poder compartir y depurar runs
    this.runSeed = data.runSeed ?? new URLSearchParams(location.search).get('seed') ?? randomSeed();
    this.levelIndex = data.levelIndex ?? 1;
    this.coins = data.coins ?? 0;
  }

  create() {
    // Validar con la config por defecto (no la del panel F1) para que una seed siempre dé el mismo nivel
    this.level = generateLevel(`${this.runSeed}:${this.levelIndex}`, getRooms('bioma1'), abilityFromConfig(playerDefaults));
    this.buildTilemap();

    const cfg = loadPlayerConfig();
    this.controls = new Input(this);
    const start = this.tileToWorld(this.level.start);
    this.player = new Knight(this, start.x, start.y, this.controls, cfg);
    this.physics.add.collider(this.player, this.solidLayer);
    this.physics.add.collider(this.player, this.platformLayer, undefined, () => !this.player.isDropping);

    this.spawnObjects();

    const w = this.level.width * TILE_SIZE;
    const h = this.level.height * TILE_SIZE;
    this.physics.world.setBounds(0, 0, w, h);
    this.cameras.main.setBounds(0, 0, w, h);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.panel = new TuningPanel(cfg);
    const kb = this.input.keyboard!;
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.F1).on('down', () => this.panel.toggle());
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => this.scene.restart({ runSeed: randomSeed() }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.panel.destroy());

    const style = { fontSize: '8px', color: '#ffffff' };
    this.hudText = this.add.text(4, 4, '', style).setScrollFactor(0).setDepth(10);
    this.add.text(4, 258, 'F1 ajustes · Shift dash · Abajo+Salto bajar · R nueva run', { ...style, color: '#888888' })
      .setScrollFactor(0).setDepth(10);
    this.debugText = this.add.text(4, 14, '', { ...style, color: '#aaaaaa' }).setScrollFactor(0).setDepth(10);
    this.updateHud();
  }

  update(_time: number, delta: number) {
    // Limitar dt para que un tirón del navegador no atraviese paredes
    const dt = Math.min(delta, 50);
    const body = this.player.body;
    this.player.standingOnOneWay =
      !!this.platformLayer.getTileAtWorldXY(body.center.x, body.bottom + 1) &&
      !this.solidLayer.getTileAtWorldXY(body.center.x, body.bottom + 1);
    this.controls.update();
    this.player.update(dt);

    if (this.player.y > this.physics.world.bounds.height + 32) {
      const start = this.tileToWorld(this.level.start);
      this.player.setPosition(start.x, start.y);
      body.setVelocity(0, 0);
    }

    this.debugText.setText(
      `vx ${body.velocity.x.toFixed(0)} vy ${body.velocity.y.toFixed(0)} suelo ${this.player.onFloor ? 'sí' : 'no'}`,
    );
  }

  private buildTilemap() {
    const { width, height, tiles } = this.level;
    const map = this.make.tilemap({ width, height, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage('tiles')!;
    this.solidLayer = map.createBlankLayer('solid', tileset)!;
    this.platformLayer = map.createBlankLayer('platforms', tileset)!;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = tiles[y * width + x];
        if (t === Tile.Solid) this.solidLayer.putTileAt(0, x, y);
        else if (t === Tile.Platform) this.platformLayer.putTileAt(1, x, y);
      }
    }
    this.solidLayer.setCollision(0);
    this.platformLayer.setCollision(1);
    // Plataformas atravesables: solo colisionan por arriba
    this.platformLayer.forEachTile((tile) => {
      if (tile.index === 1) tile.setCollision(false, false, true, false, false);
    });
  }

  private spawnObjects() {
    const exitPos = this.tileToWorld(this.level.exit);
    const exit = this.physics.add.staticImage(exitPos.x, exitPos.y, 'exit');
    this.physics.add.overlap(this.player, exit, () => this.nextLevel());

    const coins = this.physics.add.staticGroup();
    for (const s of this.level.spawns) {
      const x = s.x * TILE_SIZE + TILE_SIZE / 2;
      const y = s.y * TILE_SIZE + TILE_SIZE / 2;
      if (s.type === 'coin') coins.create(x, y, 'coin');
      else if (s.type === 'chest') this.add.image(x, y + 3, 'chest');
      else if (s.type === 'enemy') this.add.image(x, y, 'enemy-marker');
    }
    this.physics.add.overlap(this.player, coins, (_p, coin) => {
      (coin as Phaser.Physics.Arcade.Image).destroy();
      this.coins++;
      this.updateHud();
    });
  }

  private nextLevel() {
    this.scene.restart({ runSeed: this.runSeed, levelIndex: this.levelIndex + 1, coins: this.coins });
  }

  private updateHud() {
    this.hudText.setText(`Seed ${this.runSeed} · Nivel ${this.levelIndex} · Monedas ${this.coins}`);
  }

  // Centro horizontal de la celda; en vertical, a la altura en que el sprite de 32 px apoya en el suelo
  private tileToWorld(p: { x: number; y: number }) {
    return { x: p.x * TILE_SIZE + TILE_SIZE / 2, y: p.y * TILE_SIZE };
  }
}
