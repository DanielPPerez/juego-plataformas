import Phaser from 'phaser';
import biomes from '../data/biomes.json';
import enemyStats from '../data/enemies.json';
import flyerStats from '../data/flyers.json';
import playerDefaults from '../data/player.json';
import { Boss, type BossId } from '../entities/bosses/Boss';
import { Enemy, type EnemyStats } from '../entities/enemies/Enemy';
import { Flyer, type FlyerStats } from '../entities/enemies/Flyer';
import { Knight } from '../entities/player/Knight';
import { Mage } from '../entities/player/Mage';
import { planLevel, type ChunkInstance, type LevelPlan } from '../systems/ChunkGenerator';
import { ChunkStreamer } from '../systems/ChunkStreamer';
import { getChunks } from '../systems/chunkLibrary';
import { Input } from '../systems/Input';
import { VIEW_W, ZOOM } from '../config';
import { CHUNK_H, CHUNK_PX, CHUNK_W, Tile, TILE_SIZE } from '../systems/level';
import { abilityFromConfig } from '../systems/LevelValidator';
import { loadPlayerConfig } from '../systems/PlayerConfig';
import { RNG } from '../systems/RNG';
import { getRun, isDevMode, stacks, urlParam, type RunState } from '../systems/Run';
import { damageMultiplier, rollUpgrades, specialCooldownMs } from '../systems/Upgrades';
import { TuningPanel } from '../utils/TuningPanel';
import type { Hud } from './UIScene';

const HITSTOP_MS = 50;
const ENEMY_GRAVITY = 1000;
const CHEST_COINS = 10;
const MAGNET_RADIUS = 56;
const EVASION_CHANCE = 0.15;
const POGO_VELOCITY = 320;
const CELERITY_BONUS = 0.15;
// Onda de corte del Caballero (mejora Proyectil extra)
const WAVE = { speed: 240, lifeMs: 300 };
// Separación angular entre proyectiles extra del Mago
const SPREAD = 0.15;
const ENEMY_SHOT_LIFE_MS = 3000;
// Persecución: chunks de sobra (el jefe muere mucho antes) y suelo de los chunks de persecución
const CHASE_CHUNKS = 200;
const CHASE_GROUND_Y = 15 * TILE_SIZE;

type Biome = (typeof biomes)[number];
type Spawnable = { kind: 'ground'; stats: EnemyStats } | { kind: 'flyer'; stats: FlyerStats };

interface GameSceneData {
  // Persecución del jefe del bioma (tras su 2.º nivel)
  boss?: boolean;
}

// Cada bioma = 2 niveles + jefe: niveles 1-2 → bioma 1, 3-4 → bioma 2, 5-6 → bioma 3
export function biomeOf(levelIndex: number): Biome {
  return biomes[Math.min(biomes.length, Math.ceil(levelIndex / 2)) - 1];
}

// Centro horizontal de la celda; en vertical, a la altura en que el sprite de 32 px apoya en el suelo
function tileToWorld(x: number, y: number, offsetX = 0) {
  return { x: offsetX + x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE };
}

export class GameScene extends Phaser.Scene {
  private run!: RunState;
  private biome!: Biome;
  private player!: Knight | Mage;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemyShots!: Phaser.Physics.Arcade.Group;
  private controls!: Input;
  private panel!: TuningPanel;
  private plan!: LevelPlan;
  private streamer!: ChunkStreamer;
  private coinGroup!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private flyers!: Phaser.Physics.Arcade.Group;
  private spawnPool: Spawnable[] = [];
  private combatRng!: RNG;
  private hitstopUntil = 0;
  private dead = false;
  private invincible = false;
  private midUpgradeDone = false;
  private chase = false;
  private boss?: Boss;
  private carriedBy?: Flyer;
  private cameraTarget?: Phaser.GameObjects.Zone;
  private slash!: Phaser.GameObjects.Rectangle;
  private dashHits = new Set<object>();
  private solidLayer!: Phaser.Tilemaps.TilemapLayer;
  private platformLayer!: Phaser.Tilemaps.TilemapLayer;
  // 'mid' (mitad del nivel) o 'end' (al llegar a la salida)
  private pendingUpgrade?: 'mid' | 'end';

  constructor() {
    super('Game');
  }

  init(data: GameSceneData) {
    this.run = getRun(this);
    this.biome = biomeOf(this.run.levelIndex);
    this.dead = false;
    this.midUpgradeDone = false;
    this.pendingUpgrade = undefined;
    // ?boss en la URL va directo a la persecución (depuración)
    this.chase = data.boss ?? new URLSearchParams(location.search).has('boss');
    this.boss = undefined;
    this.carriedBy = undefined;
    this.cameraTarget = undefined;
    this.spawnPool = [
      ...Object.values(enemyStats).filter((s) => s.biome === this.biome.id).map((stats) => ({ kind: 'ground' as const, stats })),
      ...Object.values(flyerStats).filter((s) => s.biome === this.biome.id).map((stats) => ({ kind: 'flyer' as const, stats })),
    ];
  }

  create() {
    const run = this.run;
    const levelSeed = `${run.seed}:${run.levelIndex}`;
    // Validar con la config por defecto (no la del panel F1) para que una seed siempre dé el mismo nivel
    const ability = abilityFromConfig(playerDefaults);
    this.plan = this.chase
      ? planLevel(`${levelSeed}:chase`, 1, getChunks(...this.biome.chase), CHASE_CHUNKS)
      : planLevel(levelSeed, run.levelIndex, getChunks(...this.biome.chunks));
    this.combatRng = new RNG(`${levelSeed}:combat`);
    run.shield = stacks(run, 'shield');
    // Regeneración: cura 1 al empezar cada nivel (y cada persecución)
    if (stacks(run, 'regen') > 0) run.hp = Math.min(run.maxHp, run.hp + 1);

    const map = this.make.tilemap({
      width: this.plan.chunks.length * CHUNK_W,
      height: CHUNK_H,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tiles', `tiles${this.biome.id}`)!;
    this.solidLayer = map.createBlankLayer('solid', tileset)!;
    this.platformLayer = map.createBlankLayer('platforms', tileset)!;
    this.cameras.main.setBackgroundColor(this.biome.background);

    this.coinGroup = this.physics.add.staticGroup();
    // Los grupos aplican estos valores a cada miembro al añadirlo (sobrescriben los del sprite)
    this.enemies = this.physics.add.group({ gravityY: ENEMY_GRAVITY, collideWorldBounds: true });
    this.flyers = this.physics.add.group({ allowGravity: false });
    // Pools de proyectiles: se reutilizan en vez de crearse
    this.projectiles = this.physics.add.group({ allowGravity: false, maxSize: 60 });
    this.enemyShots = this.physics.add.group({ maxSize: 40 });

    this.controls = new Input(this);
    const cfg = loadPlayerConfig();
    this.player = run.character === 'mage'
      ? new Mage(this, 0, 0, this.controls, cfg)
      : new Knight(this, 0, 0, this.controls, cfg);
    this.player.hp = run.hp;
    this.applyPlayerUpgrades();
    this.player.body.setCollideWorldBounds(true);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.streamer = new ChunkStreamer(this.plan, ability, this.solidLayer, this.platformLayer, (chunk, ox) =>
      this.spawnChunkObjects(chunk, ox),
    );
    // ?chunk=N empieza en ese chunk (depuración de diseños)
    const debugChunk = Number(urlParam('chunk') ?? 0);
    this.streamer.update(debugChunk * CHUNK_PX);
    const first = this.streamer.chunkAt(debugChunk * CHUNK_PX)!;
    const startPos = tileToWorld(first.start?.x ?? 1, first.start?.y ?? first.entryRow, first.index * CHUNK_PX);
    this.player.setPosition(startPos.x, startPos.y);
    this.updateBounds();
    this.addColliders();

    this.slash = this.add.rectangle(0, 0, 1, 1, 0xffffff, 0.5).setVisible(false).setDepth(6);
    this.cameras.main.setZoom(ZOOM);
    if (this.chase) this.startChase();
    else this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.scene.launch('UI');

    this.panel = new TuningPanel(cfg);
    const kb = this.input.keyboard!;
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.F1).on('down', () => this.panel.toggle());
    kb.on('keydown-ESC', () => this.openOverlay('Pause'));
    if (isDevMode()) {
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.F2).on('down', () => (this.boss ? this.boss.hurt(999) : this.finishLevel()));
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.F3).on('down', () => (this.invincible = !this.invincible));
    }
    this.events.on('upgrade-picked', this.onUpgradePicked, this);
    this.events.on('enemy-split', this.onEnemySplit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.panel.destroy();
      this.events.off('upgrade-picked', this.onUpgradePicked, this);
      this.events.off('enemy-split', this.onEnemySplit, this);
    });
  }

  private addColliders() {
    const kill = (p: unknown) => this.killShot(p as Phaser.Physics.Arcade.Image);
    this.physics.add.collider(this.player, this.solidLayer);
    this.physics.add.collider(this.player, this.platformLayer, undefined, () => !this.player.isDropping);
    this.physics.add.collider(this.enemies, this.solidLayer);
    this.physics.add.collider(this.enemies, this.platformLayer);
    this.physics.add.collider(this.projectiles, this.solidLayer, kill);
    this.physics.add.collider(this.enemyShots, this.solidLayer, kill);

    const hitWith = (p: unknown, target: unknown) => {
      const shot = p as Phaser.Physics.Arcade.Image;
      (target as Enemy | Flyer).hurt(shot.getData('damage'), shot.x);
      this.killShot(shot);
    };
    this.physics.add.overlap(this.projectiles, this.enemies, hitWith);
    this.physics.add.overlap(this.projectiles, this.flyers, hitWith);
    this.physics.add.overlap(this.player, this.enemyShots, (_p, s) => {
      const shot = s as Phaser.Physics.Arcade.Image;
      this.damagePlayer(1, shot.x);
      this.killShot(shot);
    });
    this.physics.add.overlap(this.player, this.coinGroup, (_p, coin) => this.collect(coin as Phaser.Physics.Arcade.Image));
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.damagePlayer((e as Enemy).stats.damage, (e as Enemy).x));
    this.physics.add.overlap(this.player, this.flyers, (_p, f) => {
      const flyer = f as Flyer;
      // Descarnado en picado: agarra al jugador en vez de hacerle daño
      if (flyer.state === 'dive' && !this.carriedBy && !this.player.invulnerable) {
        this.carriedBy = flyer;
        flyer.startCarry();
      } else if (!flyer.carrying) {
        this.damagePlayer(flyer.stats.damage, flyer.x);
      }
    });
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
    this.updateCarry();
    if (!this.carriedBy) this.player.update(dt);
    if (this.player instanceof Knight) {
      this.player.updateAttack(dt);
      this.handleAttack(this.player);
    } else {
      this.handleCast(this.player, dt);
    }
    this.updateShots(dt);
    this.handleUpgradeEffects();

    const fallLimit = CHUNK_H * TILE_SIZE + 32;
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (e.y > fallLimit) e.destroy();
      else e.update(dt, this.player);
    }
    for (const f of this.flyers.getChildren() as Flyer[]) f.update(dt, this.player);

    if (this.boss) this.updateChase(dt);
    if (this.streamer.update(this.cameraTarget?.x ?? this.player.x)) this.updateBounds();

    const chunk = this.streamer.chunkAt(this.player.x);
    // Caer a un hueco: perder un corazón y reaparecer al inicio de un chunk (en la persecución, uno visible)
    if (chunk && this.player.y > fallLimit) {
      const respawn = this.boss ? this.chaseRespawnChunk() : chunk;
      const pos = tileToWorld(1, respawn.entryRow, respawn.index * CHUNK_PX);
      this.player.setPosition(pos.x, pos.y);
      body.setVelocity(0, 0);
      this.damagePlayer(1, undefined, true);
    }

    // Mejora a mitad de nivel
    if (!this.chase && !this.midUpgradeDone && chunk && chunk.index >= this.streamer.chunkCount / 2) {
      this.midUpgradeDone = true;
      this.offerUpgrade('Mitad del nivel', 'mid');
    }

    this.updateHud(chunk);
  }

  private updateHud(chunk?: ChunkInstance) {
    this.run.hp = this.player.hp;
    const nova = this.player instanceof Mage
      ? `  Nova ${this.player.specialReadyInMs > 0 ? (this.player.specialReadyInMs / 1000).toFixed(1) + 's' : 'lista'}`
      : '';
    const hud: Hud = {
      hp: this.player.hp,
      maxHp: this.run.maxHp,
      status: `${this.biome.name} · Nivel ${this.run.levelIndex}  Monedas ${this.run.coins}${this.run.shield ? '  Escudo ' + this.run.shield : ''}${nova}`,
      debug: `Seed ${this.run.seed}  Chunk ${chunk?.index ?? '-'}/${this.streamer.chunkCount - 1} ${chunk?.name ?? ''}${this.invincible ? '  INVENCIBLE' : ''}`,
      boss: this.boss && { name: this.boss.stats.name, hp: Math.ceil(this.boss.hp), maxHp: this.boss.maxHp },
      hint: this.player instanceof Mage
        ? 'Clic disparar al cursor  Clic der. nova  Shift dash  S bajar  Esc pausa  F1 ajustes'
        : 'Clic cortar  W+clic arriba  S+clic en el aire abajo (rebota)  Shift dash  S bajar  Esc pausa',
    };
    this.registry.set('hud', hud);
  }

  // Descarnado nocturno: el jugador va colgado bajo él hasta que lo suelta (o lo golpean)
  private updateCarry() {
    const flyer = this.carriedBy;
    if (!flyer) return;
    if (!flyer.active || !flyer.carrying) {
      this.carriedBy = undefined;
      return;
    }
    this.player.setPosition(flyer.x, flyer.y + 18);
    this.player.body.setVelocity(0, 0);
  }

  private startChase() {
    this.cameraTarget = this.add.zone(VIEW_W / 2, (CHUNK_H * TILE_SIZE) / 2, 1, 1);
    this.cameras.main.startFollow(this.cameraTarget, true, 1, 1);
    this.boss = new Boss(this, this.biome.boss as BossId, this.plan.seed, {
      camera: this.cameras.main,
      groundY: CHASE_GROUND_Y,
      target: this.player,
      spawnEnemy: (key, x, y) => this.enemies.add(new Enemy(this, x, y, enemyStats[key], this.terrainAt)),
      fireShot: (x, y, angle, speed, gravity) => this.fireEnemyShot(x, y, angle, speed, gravity),
      onDefeated: () => this.onBossDefeated(),
    });
  }

  private onBossDefeated() {
    // El jefe del último bioma termina la run con victoria
    if (this.biome.id === biomes.length) {
      this.endRun(true);
      return;
    }
    this.run.levelIndex++;
    this.scene.restart({ boss: false });
  }

  // Scroll forzado: la cámara avanza sola y el jugador queda encerrado en la vista
  private updateChase(dt: number) {
    const boss = this.boss!;
    const view = this.cameras.main.worldView;
    // En el primer frame la cámara aún no tiene vista: el jefe quedaría fuera de sitio
    if (view.width === 0) return;
    this.cameraTarget!.x += (boss.scrollSpeed * dt) / 1000;
    boss.update(dt);
    this.physics.world.setBounds(view.x, 0, view.width, CHUNK_H * TILE_SIZE + 64);

    const bounds = this.player.getBounds();
    for (const hazard of boss.hazards) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(hazard, bounds)) this.damagePlayer(boss.stats.hazardDamage, hazard.centerX);
    }
    // Tocar al jefe: daño y se expulsa al jugador hacia el lado libre
    if (boss.dead) return;
    const b = this.player.body;
    if (boss.mode === 'A' && b.left < boss.front) {
      this.damagePlayer(boss.stats.contactDamage, boss.front - 100);
      this.player.x = boss.front + b.halfWidth + 1;
    } else if (boss.mode === 'B' && b.right > boss.front) {
      this.damagePlayer(boss.stats.contactDamage, boss.front + 100);
      this.player.x = boss.front - b.halfWidth - 1;
    }
  }

  // Primer chunk cuyo inicio queda dentro de la vista y lejos del jefe
  private chaseRespawnChunk(): ChunkInstance {
    const view = this.cameras.main.worldView;
    const x = this.boss!.mode === 'A' ? this.boss!.front + 8 : view.x + 8;
    return this.streamer.chunkAt(Math.ceil(x / CHUNK_PX) * CHUNK_PX) ?? this.streamer.chunkAt(this.player.x)!;
  }

  private get damageMult(): number {
    return damageMultiplier(this.run, this.player.hp);
  }

  // Todo lo que el jugador puede golpear
  private targets(): (Enemy | Flyer)[] {
    return [...(this.enemies.getChildren() as Enemy[]), ...(this.flyers.getChildren() as Flyer[])];
  }

  // El golpe está activo varios frames y sigue al jugador; cada objetivo recibe un impacto por golpe
  private handleAttack(knight: Knight) {
    const damage = knight.attackDamage * this.damageMult;
    if (knight.justSwung && knight.swingDir === 'side') {
      for (let i = 0; i < stacks(this.run, 'extra_projectile'); i++) {
        const angle = knight.facing > 0 ? 0 : Math.PI;
        this.time.delayedCall(i * 80, () =>
          this.fire(knight.body.center.x, knight.body.center.y, angle, WAVE.speed, WAVE.lifeMs, damage, 'wave'),
        );
      }
    }

    const hitbox = knight.attackHitbox;
    this.slash.setVisible(!!hitbox);
    if (!hitbox) return;
    this.slash.setPosition(hitbox.centerX, hitbox.centerY).setSize(hitbox.width, hitbox.height);

    let hit = false;
    for (const e of this.targets()) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, e.getBounds()) && knight.canHit(e)) {
        e.hurt(damage, knight.x);
        hit = true;
      }
    }
    const boss = this.boss;
    if (boss && !boss.dead && Phaser.Geom.Intersects.RectangleToRectangle(hitbox, boss.hurtbox) && knight.canHit(boss)) {
      boss.hurt(damage);
      hit = true;
    }
    if (hit) {
      // Corte hacia abajo que acierta: rebote (pogo)
      if (knight.swingDir === 'down') knight.pogo(POGO_VELOCITY);
      this.hitstop();
      this.cameras.main.shake(80, 0.004);
    }
  }

  // Mago: rayos hacia el cursor (+1 por cada Proyectil extra) y nova en círculo
  private handleCast(mage: Mage, dt: number) {
    const cast = mage.updateCast(dt, specialCooldownMs(this.run, mage.stats.specialCooldownMs));
    if (!cast) return;
    const { x, y } = mage.body.center;
    const damage = mage.stats.boltDamage * this.damageMult;
    const { boltSpeed, boltLifeMs } = mage.stats;
    if (cast === 'shot') {
      const aim = this.controls.aim(this.cameras.main);
      mage.faceTowards(aim.x);
      const base = Math.atan2(aim.y - y, aim.x - x);
      const count = 1 + stacks(this.run, 'extra_projectile');
      for (let i = 0; i < count; i++) {
        this.fire(x, y, base + (i - (count - 1) / 2) * SPREAD, boltSpeed, boltLifeMs, damage, 'bolt');
      }
    } else {
      const n = mage.stats.novaBolts;
      for (let i = 0; i < n; i++) this.fire(x, y, (i / n) * Math.PI * 2, boltSpeed, boltLifeMs * 0.6, damage, 'bolt');
      this.cameras.main.shake(100, 0.004);
    }
  }

  private fire(x: number, y: number, angle: number, speed: number, lifeMs: number, damage: number, texture: string) {
    this.launch(this.projectiles, x, y, angle, speed, 0, texture, { life: lifeMs, damage });
  }

  private fireEnemyShot(x: number, y: number, angle: number, speed: number, gravity = 0) {
    this.launch(this.enemyShots, x, y, angle, speed, gravity, 'shot', { life: ENEMY_SHOT_LIFE_MS });
  }

  private launch(
    pool: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    angle: number,
    speed: number,
    gravity: number,
    texture: string,
    data: object,
  ) {
    const p = pool.get(x, y, texture) as Phaser.Physics.Arcade.Image | null;
    if (!p) return;
    p.setTexture(texture).enableBody(true, x, y, true, true).setRotation(angle).setDepth(6);
    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(gravity > 0).setGravityY(gravity);
    this.physics.velocityFromRotation(angle, speed, body.velocity);
    p.setData(data);
  }

  private killShot(p: Phaser.Physics.Arcade.Image) {
    p.disableBody(true, true);
  }

  private updateShots(dt: number) {
    for (const pool of [this.projectiles, this.enemyShots]) {
      for (const p of pool.getChildren() as Phaser.Physics.Arcade.Image[]) {
        if (!p.active) continue;
        const life = (p.getData('life') as number) - dt;
        p.setData('life', life);
        if (life <= 0) this.killShot(p);
        else if (pool === this.projectiles && this.boss && !this.boss.dead && this.boss.hurtbox.contains(p.x, p.y)) {
          this.boss.hurt(p.getData('damage'));
          this.killShot(p);
        }
      }
    }
  }

  private applyPlayerUpgrades() {
    if (this.player instanceof Knight) this.player.doubleAttack = stacks(this.run, 'double_attack') > 0;
    this.player.speedMultiplier = 1 + CELERITY_BONUS * stacks(this.run, 'celerity');
  }

  // Dash sangriento e Imán
  private handleUpgradeEffects() {
    if (stacks(this.run, 'bloody_dash') > 0) {
      if (!this.player.isDashing) this.dashHits.clear();
      else {
        for (const e of this.targets()) {
          if (!this.dashHits.has(e) && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), e.getBounds())) {
            this.dashHits.add(e);
            e.hurt(this.player.attackDamage * this.damageMult, this.player.x);
          }
        }
      }
    }
    if (stacks(this.run, 'magnet') > 0) {
      for (const c of this.coinGroup.getChildren() as Phaser.Physics.Arcade.Image[]) {
        if (Phaser.Math.Distance.Between(c.x, c.y, this.player.x, this.player.y) < MAGNET_RADIUS) this.collect(c);
      }
    }
  }

  private collect(coin: Phaser.Physics.Arcade.Image) {
    const value = (coin.getData('value') as number | undefined) ?? 1;
    this.run.coins += value * (stacks(this.run, 'luck') > 0 ? 2 : 1);
    coin.destroy();
  }

  // Shoggoth: al morir se divide en dos más pequeños
  private onEnemySplit(parent: Enemy) {
    const stats = enemyStats[parent.stats.splitsInto as keyof typeof enemyStats];
    for (const dx of [-8, 8]) {
      const child = new Enemy(this, parent.x + dx, parent.y - 4, stats, this.terrainAt);
      this.enemies.add(child);
      child.body.setVelocity(dx * 12, -150);
    }
  }

  private damagePlayer(damage: number, fromX?: number, force = false) {
    if (this.invincible || (this.player.invulnerable && !force)) return;
    // Escudo y Evasión no protegen de caer a un hueco
    if (!force && this.run.shield > 0) {
      this.run.shield--;
      this.player.hurt(0, fromX);
      this.cameras.main.flash(100, 80, 140, 255);
      return;
    }
    if (!force && this.combatRng.float() < EVASION_CHANCE * stacks(this.run, 'evasion')) return;

    if (!this.player.hurt(damage, fromX, force)) return;
    this.hitstop();
    this.cameras.main.shake(150, 0.01);
    this.cameras.main.flash(100, 255, 60, 60);
    if (this.player.hp <= 0) this.endRun(false);
  }

  private hitstop() {
    this.hitstopUntil = this.time.now + HITSTOP_MS;
    this.physics.world.pause();
  }

  private endRun(victory: boolean) {
    this.dead = true;
    this.run.hp = this.player.hp;
    this.physics.world.pause();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop('UI');
      this.scene.start('GameOver', { victory });
    });
  }

  private openOverlay(key: string, data?: object) {
    if (this.dead || !this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch(key, data);
  }

  private offerUpgrade(title: string, phase: 'mid' | 'end') {
    this.pendingUpgrade = phase;
    const choices = rollUpgrades(this.run, `${this.plan.seed}:${phase}:upgrades`);
    this.openOverlay('Upgrade', { title, choices });
  }

  private onUpgradePicked() {
    this.scene.resume();
    // Aplicar mejoras que afectan al jugador ya creado
    this.player.hp = this.run.hp;
    this.applyPlayerUpgrades();
    if (this.pendingUpgrade === 'end') this.nextLevel();
  }

  private finishLevel() {
    if (this.pendingUpgrade === 'end') return;
    this.offerUpgrade('¡Nivel completado!', 'end');
  }

  private updateBounds() {
    const left = this.streamer.leftBound;
    const width = this.streamer.rightBound - left;
    const height = CHUNK_H * TILE_SIZE;
    this.physics.world.setBounds(left, 0, width, height + 64);
    this.cameras.main.setBounds(left, 0, width, height);
  }

  private terrainAt = (x: number, y: number) =>
    this.solidLayer.getTileAtWorldXY(x, y) ? Tile.Solid : this.platformLayer.getTileAtWorldXY(x, y) ? Tile.Platform : Tile.Empty;

  private spawnChunkObjects(chunk: ChunkInstance, offsetX: number): Phaser.GameObjects.GameObject[] {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const rng = new RNG(`${this.plan.seed}:${chunk.index}:enemies`);
    if (chunk.exit && !this.chase) {
      const p = tileToWorld(chunk.exit.x, chunk.exit.y, offsetX);
      const exit = this.physics.add.staticImage(p.x, p.y, 'exit');
      this.physics.add.overlap(this.player, exit, () => this.finishLevel());
      objects.push(exit);
    }
    for (const s of chunk.spawns) {
      const x = offsetX + s.x * TILE_SIZE + TILE_SIZE / 2;
      const y = s.y * TILE_SIZE + TILE_SIZE / 2;
      if (s.type === 'coin') objects.push(this.coinGroup.create(x, y, 'coin'));
      else if (s.type === 'chest') objects.push(this.coinGroup.create(x, y + 3, 'chest').setData('value', CHEST_COINS));
      else if (s.type === 'enemy' && this.spawnPool.length > 0) objects.push(...this.spawnEnemy(rng.pick(this.spawnPool), x, y));
    }
    return objects;
  }

  private spawnEnemy(spawn: Spawnable, x: number, y: number): Phaser.GameObjects.GameObject[] {
    if (spawn.kind === 'flyer') {
      const flyer = new Flyer(this, x, y - 48, spawn.stats, (fx, fy, angle, speed) => this.fireEnemyShot(fx, fy, angle, speed));
      this.flyers.add(flyer);
      return [flyer];
    }
    return Array.from({ length: spawn.stats.count }, (_, i) => {
      const enemy = new Enemy(this, x + i * 14, y, spawn.stats, this.terrainAt);
      this.enemies.add(enemy);
      return enemy;
    });
  }

  // Cada bioma = 2 niveles + persecución del jefe
  private nextLevel() {
    const toBoss = this.run.levelIndex % 2 === 0;
    if (!toBoss) this.run.levelIndex++;
    this.scene.restart({ boss: toBoss });
  }
}
