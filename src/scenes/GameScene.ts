import Phaser from 'phaser';
import enemyStats from '../data/enemies.json';
import playerDefaults from '../data/player.json';
import { KeyBoss } from '../entities/bosses/KeyBoss';
import { Enemy } from '../entities/enemies/Enemy';
import { Knight } from '../entities/player/Knight';
import { planLevel, type ChunkInstance, type LevelPlan } from '../systems/ChunkGenerator';
import { ChunkStreamer } from '../systems/ChunkStreamer';
import { getChunks } from '../systems/chunkLibrary';
import { Input } from '../systems/Input';
import { VIEW_W, ZOOM } from '../config';
import { CHUNK_H, CHUNK_PX, CHUNK_W, TILE_SIZE } from '../systems/level';
import { abilityFromConfig } from '../systems/LevelValidator';
import { loadPlayerConfig } from '../systems/PlayerConfig';
import { RNG } from '../systems/RNG';
import { TuningPanel } from '../utils/TuningPanel';
import type { Hud } from './UIScene';

const BIOME = 1;
const BIOME_ENEMIES = Object.values(enemyStats).filter((e) => e.biome === BIOME);
const HITSTOP_MS = 50;
const ENEMY_GRAVITY = 1000;
// Persecución: chunks de sobra (el jefe muere mucho antes) y suelo de los chunks de persecución
const CHASE_CHUNKS = 200;
const CHASE_GROUND_Y = 15 * TILE_SIZE;

interface GameSceneData {
  runSeed?: string;
  levelIndex?: number;
  coins?: number;
  hp?: number;
  // Persecución del jefe del bioma (tras el 2.º nivel)
  boss?: boolean;
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
  private plan!: LevelPlan;
  private streamer!: ChunkStreamer;
  private coinGroup!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private runSeed = '';
  private levelIndex = 1;
  private coins = 0;
  private startHp?: number;
  private hitstopUntil = 0;
  private dead = false;
  private chase = false;
  private boss?: KeyBoss;
  private cameraTarget?: Phaser.GameObjects.Zone;
  private slash!: Phaser.GameObjects.Rectangle;
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
    this.startHp = data.hp;
    this.dead = false;
    // ?boss en la URL va directo a la persecución (depuración)
    this.chase = data.boss ?? new URLSearchParams(location.search).has('boss');
    this.boss = undefined;
    this.cameraTarget = undefined;
  }

  create() {
    // Validar con la config por defecto (no la del panel F1) para que una seed siempre dé el mismo nivel
    const ability = abilityFromConfig(playerDefaults);
    this.plan = this.chase
      ? planLevel(`${this.runSeed}:${this.levelIndex}:chase`, 1, getChunks('chase1'), CHASE_CHUNKS)
      : planLevel(`${this.runSeed}:${this.levelIndex}`, this.levelIndex, getChunks('bioma1'));

    const map = this.make.tilemap({
      width: this.plan.chunks.length * CHUNK_W,
      height: CHUNK_H,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tiles')!;
    this.solidLayer = map.createBlankLayer('solid', tileset)!;
    this.platformLayer = map.createBlankLayer('platforms', tileset)!;

    this.coinGroup = this.physics.add.staticGroup();
    // El grupo aplica estos valores a cada enemigo al añadirlo (sobrescribe los del sprite)
    this.enemies = this.physics.add.group({ gravityY: ENEMY_GRAVITY, collideWorldBounds: true });
    this.controls = new Input(this);
    const cfg = loadPlayerConfig();
    this.player = new Knight(this, 0, 0, this.controls, cfg);
    if (this.startHp !== undefined) this.player.hp = this.startHp;
    this.player.body.setCollideWorldBounds(true);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.streamer = new ChunkStreamer(this.plan, ability, this.solidLayer, this.platformLayer, (chunk, ox) =>
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
    this.physics.add.collider(this.enemies, this.solidLayer);
    this.physics.add.collider(this.enemies, this.platformLayer);
    this.physics.add.overlap(this.player, this.coinGroup, (_p, coin) => {
      (coin as Phaser.Physics.Arcade.Image).destroy();
      this.coins++;
    });
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      const enemy = e as Enemy;
      this.damagePlayer(enemy.stats.damage, enemy.x);
    });

    this.slash = this.add.rectangle(0, 0, 1, 1, 0xffffff, 0.5).setVisible(false).setDepth(6);
    this.cameras.main.setZoom(ZOOM);
    if (this.chase) this.startChase();
    else this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.scene.launch('UI');

    this.panel = new TuningPanel(cfg);
    const kb = this.input.keyboard!;
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.F1).on('down', () => this.panel.toggle());
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => this.scene.restart({ runSeed: randomSeed() }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.panel.destroy());
  }

  update(time: number, delta: number) {
    // Hitstop: congelar todo unos ms al golpear
    if (time < this.hitstopUntil || this.dead) return;
    if (this.physics.world.isPaused) this.physics.world.resume();

    // Limitar dt para que un tirón del navegador no atraviese paredes
    const dt = Math.min(delta, 50);
    const body = this.player.body;
    this.player.standingOnOneWay =
      !!this.platformLayer.getTileAtWorldXY(body.center.x, body.bottom + 1) &&
      !this.solidLayer.getTileAtWorldXY(body.center.x, body.bottom + 1);
    this.controls.update();
    this.player.update(dt);
    this.player.updateAttack(dt);
    this.handleAttack();

    const fallLimit = CHUNK_H * TILE_SIZE + 32;
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (e.y > fallLimit) e.destroy();
      else e.update(dt, this.player);
    }

    if (this.boss) this.updateChase(dt);
    if (this.streamer.update(this.cameraTarget?.x ?? this.player.x)) this.updateBounds();

    const chunk = this.streamer.chunkAt(this.player.x);
    // Caer a un hueco: perder un corazón y reaparecer al inicio de un chunk (en la persecución, del siguiente visible)
    if (chunk && this.player.y > fallLimit) {
      const respawn = this.boss ? this.streamer.chunkAt(Math.ceil((this.boss.right + 8) / CHUNK_PX) * CHUNK_PX) : chunk;
      const pos = tileToWorld(1, (respawn ?? chunk).entryRow, (respawn ?? chunk).index * CHUNK_PX);
      this.player.setPosition(pos.x, pos.y);
      body.setVelocity(0, 0);
      this.damagePlayer(1, undefined, true);
    }

    const hud: Hud = {
      hp: this.player.hp,
      maxHp: playerDefaults.maxHp,
      status: `Seed ${this.runSeed}  Nivel ${this.levelIndex}  Monedas ${this.coins}`,
      debug: `Chunk ${chunk?.index ?? '-'}/${this.streamer.chunkCount - 1} ${chunk?.name ?? ''}`,
      boss: this.boss && { name: this.boss.stats.name, hp: this.boss.hp, maxHp: this.boss.maxHp },
    };
    this.registry.set('hud', hud);
  }

  private startChase() {
    const view = VIEW_W / 2;
    this.cameraTarget = this.add.zone(view, (CHUNK_H * TILE_SIZE) / 2, 1, 1);
    this.cameras.main.startFollow(this.cameraTarget, true, 1, 1);
    this.boss = new KeyBoss(this, this.plan.seed, {
      camera: this.cameras.main,
      groundY: CHASE_GROUND_Y,
      playerX: () => this.player.x,
      spawnLarva: (x, y) => this.enemies.add(new Enemy(this, x, y, enemyStats.larva, this.groundAt)),
      onDefeated: () =>
        this.scene.restart({
          runSeed: this.runSeed,
          levelIndex: this.levelIndex + 1,
          coins: this.coins,
          hp: this.player.hp,
          boss: false,
        }),
    });
  }

  // Scroll forzado: la cámara avanza sola y el jugador queda encerrado en la vista
  private updateChase(dt: number) {
    const boss = this.boss!;
    this.cameraTarget!.x += (boss.scrollSpeed * dt) / 1000;
    boss.update(dt);
    const view = this.cameras.main.worldView;
    this.physics.world.setBounds(view.x, 0, view.width, CHUNK_H * TILE_SIZE + 64);

    const spike = boss.tentacleHitbox;
    if (spike && Phaser.Geom.Intersects.RectangleToRectangle(spike, this.player.getBounds())) {
      this.damagePlayer(boss.stats.tentacleDamage, spike.centerX);
    }
    // Tocar al jefe: daño y se expulsa al jugador hacia la derecha
    if (!boss.dead && this.player.body.left < boss.right) {
      this.damagePlayer(boss.stats.contactDamage, boss.right - 100);
      this.player.x = boss.right + this.player.body.halfWidth + 1;
    }
  }

  // El golpe está activo varios frames y sigue al jugador; cada objetivo recibe un impacto por golpe
  private handleAttack() {
    const hitbox = this.player.attackHitbox;
    this.slash.setVisible(!!hitbox);
    if (!hitbox) return;
    this.slash.setPosition(hitbox.centerX, hitbox.centerY).setSize(hitbox.width, hitbox.height);

    let hit = false;
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, e.getBounds()) && this.player.canHit(e)) {
        e.hurt(this.player.attackDamage, this.player.x);
        hit = true;
      }
    }
    const boss = this.boss;
    if (boss && !boss.dead && Phaser.Geom.Intersects.RectangleToRectangle(hitbox, boss.hurtbox) && this.player.canHit(boss)) {
      boss.hurt(this.player.attackDamage);
      hit = true;
    }
    if (hit) {
      this.hitstop();
      this.cameras.main.shake(80, 0.004);
    }
  }

  private damagePlayer(damage: number, fromX?: number, force = false) {
    if (!this.player.hurt(damage, fromX, force)) return;
    this.hitstop();
    this.cameras.main.shake(150, 0.01);
    this.cameras.main.flash(100, 255, 60, 60);
    if (this.player.hp <= 0) this.die();
  }

  private hitstop() {
    this.hitstopUntil = this.time.now + HITSTOP_MS;
    this.physics.world.pause();
  }

  // Muerte: por ahora se reinicia la run con otra seed (la pantalla de Game Over llega en la fase 5)
  private die() {
    this.dead = true;
    this.physics.world.pause();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.restart({ runSeed: randomSeed() }),
    );
  }

  private updateBounds() {
    const left = this.streamer.leftBound;
    const width = this.streamer.rightBound - left;
    const height = CHUNK_H * TILE_SIZE;
    this.physics.world.setBounds(left, 0, width, height + 64);
    this.cameras.main.setBounds(left, 0, width, height);
  }

  private groundAt = (x: number, y: number) =>
    !!this.solidLayer.getTileAtWorldXY(x, y) || !!this.platformLayer.getTileAtWorldXY(x, y);

  private spawnChunkObjects(chunk: ChunkInstance, offsetX: number): Phaser.GameObjects.GameObject[] {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const rng = new RNG(`${this.plan.seed}:${chunk.index}:enemies`);
    if (chunk.exit && !this.chase) {
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
      else if (s.type === 'enemy') {
        const stats = rng.pick(BIOME_ENEMIES);
        for (let i = 0; i < stats.count; i++) {
          const enemy = new Enemy(this, x + i * 14, y, stats, this.groundAt);
          this.enemies.add(enemy);
          objects.push(enemy);
        }
      }
    }
    return objects;
  }

  // Cada bioma = 2 niveles + persecución del jefe
  private nextLevel() {
    const toBoss = this.levelIndex % 2 === 0;
    this.scene.restart({
      runSeed: this.runSeed,
      levelIndex: toBoss ? this.levelIndex : this.levelIndex + 1,
      coins: this.coins,
      hp: this.player.hp,
      boss: toBoss,
    });
  }
}
