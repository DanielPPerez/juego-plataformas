import Phaser from 'phaser';
import playerDefaults from '../data/player.json';
import { Knight } from '../entities/player/Knight';
import { planLevel, type ChunkInstance } from '../systems/ChunkGenerator';
import { ChunkStreamer } from '../systems/ChunkStreamer';
import { getChunks } from '../systems/chunkLibrary';
import { Input } from '../systems/Input';
import { ZOOM } from '../config';
import { CHUNK_H, CHUNK_PX, CHUNK_W, TILE_SIZE } from '../systems/level';
import { abilityFromConfig } from '../systems/LevelValidator';
import { loadPlayerConfig } from '../systems/PlayerConfig';
import { TuningPanel } from '../utils/TuningPanel';

interface GameSceneData {
  runSeed?: string;
  levelIndex?: number;
  coins?: number;
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

// Centro horizontal de la celda; en vertical, a la altura en que el sprite de 32 px apoya en el suelo
function tileToWorld(x: number, y: number, offsetX = 0) {
  return { x: offsetX + x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE };
}

export class GameScene extends Phaser.Scene {
  private player!: Knight;
  private controls!: Input;
  private panel!: TuningPanel;
  private streamer!: ChunkStreamer;
  private coinGroup!: Phaser.Physics.Arcade.StaticGroup;
  private runSeed = '';
  private levelIndex = 1;
  private coins = 0;
  private solidLayer!: Phaser.Tilemaps.TilemapLayer;
  private platformLayer!: Phaser.Tilemaps.TilemapLayer;

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
    const ability = abilityFromConfig(playerDefaults);
    const plan = planLevel(`${this.runSeed}:${this.levelIndex}`, this.levelIndex, getChunks('bioma1'));

    const map = this.make.tilemap({
      width: plan.chunks.length * CHUNK_W,
      height: CHUNK_H,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tiles')!;
    this.solidLayer = map.createBlankLayer('solid', tileset)!;
    this.platformLayer = map.createBlankLayer('platforms', tileset)!;

    this.coinGroup = this.physics.add.staticGroup();
    this.controls = new Input(this);
    const cfg = loadPlayerConfig();
    this.player = new Knight(this, 0, 0, this.controls, cfg);
    this.player.body.setCollideWorldBounds(true);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.streamer = new ChunkStreamer(plan, ability, this.solidLayer, this.platformLayer, (chunk, ox) =>
      this.spawnChunkObjects(chunk, ox),
    );
    // ?chunk=N empieza en ese chunk (depuración de diseños)
    const debugChunk = Number(new URLSearchParams(location.search).get('chunk') ?? 0);
    this.streamer.update(debugChunk * CHUNK_PX);
    const first = this.streamer.chunkAt(debugChunk * CHUNK_PX)!;
    const startPos = tileToWorld(first.start?.x ?? 1, first.start?.y ?? first.entryRow, first.index * CHUNK_PX);
    this.player.setPosition(startPos.x, startPos.y);
    this.updateBounds();

    this.physics.add.collider(this.player, this.solidLayer);
    this.physics.add.collider(this.player, this.platformLayer, undefined, () => !this.player.isDropping);
    this.physics.add.overlap(this.player, this.coinGroup, (_p, coin) => {
      (coin as Phaser.Physics.Arcade.Image).destroy();
      this.coins++;
    });

    this.cameras.main.setZoom(ZOOM).startFollow(this.player, true, 0.15, 0.15);
    this.scene.launch('UI');

    this.panel = new TuningPanel(cfg);
    const kb = this.input.keyboard!;
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.F1).on('down', () => this.panel.toggle());
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => this.scene.restart({ runSeed: randomSeed() }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.panel.destroy());
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

    if (this.streamer.update(this.player.x)) this.updateBounds();

    const chunk = this.streamer.chunkAt(this.player.x);
    // Caer a un hueco: reaparecer al inicio del chunk actual (la pérdida de vida llega en la fase 3)
    if (chunk && this.player.y > CHUNK_H * TILE_SIZE + 32) {
      const pos = tileToWorld(1, chunk.entryRow, chunk.index * CHUNK_PX);
      this.player.setPosition(pos.x, pos.y);
      body.setVelocity(0, 0);
    }

    this.registry.set('hud', {
      status: `Seed ${this.runSeed}  Nivel ${this.levelIndex}  Monedas ${this.coins}`,
      debug: `Chunk ${chunk?.index ?? '-'}/${this.streamer.chunkCount - 1} ${chunk?.name ?? ''}`,
    });
  }

  private updateBounds() {
    const left = this.streamer.leftBound;
    const width = this.streamer.rightBound - left;
    const height = CHUNK_H * TILE_SIZE;
    this.physics.world.setBounds(left, 0, width, height + 64);
    this.cameras.main.setBounds(left, 0, width, height);
  }

  private spawnChunkObjects(chunk: ChunkInstance, offsetX: number): Phaser.GameObjects.GameObject[] {
    const objects: Phaser.GameObjects.GameObject[] = [];
    if (chunk.exit) {
      const p = tileToWorld(chunk.exit.x, chunk.exit.y, offsetX);
      const exit = this.physics.add.staticImage(p.x, p.y, 'exit');
      this.physics.add.overlap(this.player, exit, () => this.nextLevel());
      objects.push(exit);
    }
    for (const s of chunk.spawns) {
      const x = offsetX + s.x * TILE_SIZE + TILE_SIZE / 2;
      const y = s.y * TILE_SIZE + TILE_SIZE / 2;
      if (s.type === 'coin') objects.push(this.coinGroup.create(x, y, 'coin'));
      else if (s.type === 'chest') objects.push(this.add.image(x, y + 3, 'chest'));
      else if (s.type === 'enemy') objects.push(this.add.image(x, y, 'enemy-marker'));
    }
    return objects;
  }

  private nextLevel() {
    this.scene.restart({ runSeed: this.runSeed, levelIndex: this.levelIndex + 1, coins: this.coins });
  }
}
