import Phaser from 'phaser';
import enemyStats from '../data/enemies.json';
import playerDefaults from '../data/player.json';
import { KeyBoss } from '../entities/bosses/KeyBoss';
import { Enemy } from '../entities/enemies/Enemy';
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

const BIOME = 1;
const BIOME_ENEMIES = Object.values(enemyStats).filter((e) => e.biome === BIOME);
const HITSTOP_MS = 50;
const ENEMY_GRAVITY = 1000;
const CHEST_COINS = 10;
const MAGNET_RADIUS = 56;
const EVASION_CHANCE = 0.15;
const POGO_VELOCITY = 320;
// Onda de corte del Caballero (mejora Proyectil extra)
const WAVE = { speed: 240, lifeMs: 300 };
// Separación angular entre proyectiles extra del Mago
const SPREAD = 0.15;
// Persecución: chunks de sobra (el jefe muere mucho antes) y suelo de los chunks de persecución
const CHASE_CHUNKS = 200;
const CHASE_GROUND_Y = 15 * TILE_SIZE;

interface GameSceneData {
  // Persecución del jefe del bioma (tras el 2.º nivel)
  boss?: boolean;
}

// Centro horizontal de la celda; en vertical, a la altura en que el sprite de 32 px apoya en el suelo
function tileToWorld(x: number, y: number, offsetX = 0) {
  return { x: offsetX + x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE };
}

export class GameScene extends Phaser.Scene {
  private run!: RunState;
  private player!: Knight | Mage;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private controls!: Input;
  private panel!: TuningPanel;
  private plan!: LevelPlan;
  private streamer!: ChunkStreamer;
  private coinGroup!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private combatRng!: RNG;
  private hitstopUntil = 0;
  private dead = false;
  private invincible = false;
  private midUpgradeDone = false;
  private chase = false;
  private boss?: KeyBoss;
  private cameraTarget?: Phaser.GameObjects.Zone;
  private slash!: Phaser.GameObjects.Rectangle;
  private dashHits = new Set<Enemy>();
  private solidLayer!: Phaser.Tilemaps.TilemapLayer;
  private platformLayer!: Phaser.Tilemaps.TilemapLayer;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData) {
    this.run = getRun(this);
    this.dead = false;
    this.midUpgradeDone = false;
    this.pendingUpgrade = undefined;
    // ?boss en la URL va directo a la persecución (depuración)
    this.chase = data.boss ?? new URLSearchParams(location.search).has('boss');
    this.boss = undefined;
    this.cameraTarget = undefined;
  }

  create() {
    const run = this.run;
    const levelSeed = `${run.seed}:${run.levelIndex}`;
    // Validar con la config por defecto (no la del panel F1) para que una seed siempre dé el mismo nivel
    const ability = abilityFromConfig(playerDefaults);
    this.plan = this.chase
      ? planLevel(`${levelSeed}:chase`, 1, getChunks('chase1'), CHASE_CHUNKS)
      : planLevel(levelSeed, run.levelIndex, getChunks('bioma1'));
    this.combatRng = new RNG(`${levelSeed}:combat`);
    run.shield = stacks(run, 'shield');

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
    this.player = run.character === 'mage'
      ? new Mage(this, 0, 0, this.controls, cfg)
      : new Knight(this, 0, 0, this.controls, cfg);
    this.player.hp = run.hp;
    this.applyPlayerUpgrades();
    // Pool de proyectiles (rayos del Mago, ondas del Caballero): se reutilizan en vez de crearse
    this.projectiles = this.physics.add.group({ allowGravity: false, maxSize: 60 });
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

    this.physics.add.collider(this.player, this.solidLayer);
    this.physics.add.collider(this.player, this.platformLayer, undefined, () => !this.player.isDropping);
    this.physics.add.collider(this.enemies, this.solidLayer);
    this.physics.add.collider(this.enemies, this.platformLayer, undefined, (e) => !(e as Enemy).isDropping);
    this.physics.add.collider(this.projectiles, this.solidLayer, (p) => this.killProjectile(p as Phaser.Physics.Arcade.Image));
    this.physics.add.overlap(this.projectiles, this.enemies, (p, e) => {
      const projectile = p as Phaser.Physics.Arcade.Image;
      (e as Enemy).hurt(projectile.getData('damage'), projectile.x);
      this.killProjectile(projectile);
    });
    this.physics.add.overlap(this.player, this.coinGroup, (_p, coin) => this.collect(coin as Phaser.Physics.Arcade.Image));
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
    kb.on('keydown-ESC', () => this.openOverlay('Pause'));
    if (isDevMode()) {
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.F2).on('down', () => (this.boss ? this.boss.hurt(999) : this.finishLevel()));
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.F3).on('down', () => (this.invincible = !this.invincible));
    }
    this.events.on('upgrade-picked', this.onUpgradePicked, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.panel.destroy();
      this.events.off('upgrade-picked', this.onUpgradePicked, this);
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
    this.player.update(dt);
    if (this.player instanceof Knight) {
      this.player.updateAttack(dt);
      this.handleAttack(this.player);
    } else {
      this.handleCast(this.player, dt);
    }
    this.updateProjectiles(dt);
    this.handleUpgradeEffects();

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

    // Mejora a mitad de nivel
    if (!this.chase && !this.midUpgradeDone && chunk && chunk.index >= this.streamer.chunkCount / 2) {
      this.midUpgradeDone = true;
      this.offerUpgrade('Mitad del nivel', 'mid');
    }

    this.run.hp = this.player.hp;
    const hud: Hud = {
      hp: this.player.hp,
      maxHp: this.run.maxHp,
      status: `Nivel ${this.run.levelIndex}  Monedas ${this.run.coins}${this.run.shield ? '  Escudo ' + this.run.shield : ''}${
        this.player instanceof Mage ? `  Nova ${this.player.specialReadyInMs > 0 ? (this.player.specialReadyInMs / 1000).toFixed(1) + 's' : 'lista'}` : ''
      }`,
      debug: `Seed ${this.run.seed}  Chunk ${chunk?.index ?? '-'}/${this.streamer.chunkCount - 1} ${chunk?.name ?? ''}${this.invincible ? '  INVENCIBLE' : ''}`,
      boss: this.boss && { name: this.boss.stats.name, hp: this.boss.hp, maxHp: this.boss.maxHp },
      hint: this.player instanceof Mage
        ? 'Clic disparar al cursor  Clic der. nova  Shift dash  S bajar  Esc pausa  F1 ajustes'
        : 'Clic cortar  W+clic arriba  S+clic en el aire abajo (rebota)  Shift dash  S bajar  Esc pausa',
    };
    this.registry.set('hud', hud);
  }

  private startChase() {
    this.cameraTarget = this.add.zone(VIEW_W / 2, (CHUNK_H * TILE_SIZE) / 2, 1, 1);
    this.cameras.main.startFollow(this.cameraTarget, true, 1, 1);
    this.boss = new KeyBoss(this, this.plan.seed, {
      camera: this.cameras.main,
      groundY: CHASE_GROUND_Y,
      playerX: () => this.player.x,
      spawnLarva: (x, y) => this.enemies.add(new Enemy(this, x, y, enemyStats.larva, this.terrainAt)),
      // Solo existe el bioma 1: vencer a La Llave termina la demo
      onDefeated: () => this.endRun(true),
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

  private get damageMult(): number {
    return damageMultiplier(this.run, this.player.hp);
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
    for (const e of this.enemies.getChildren() as Enemy[]) {
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
    const p = this.projectiles.get(x, y, texture) as Phaser.Physics.Arcade.Image | null;
    if (!p) return;
    p.setTexture(texture).enableBody(true, x, y, true, true).setRotation(angle).setDepth(6);
    (p.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.physics.velocityFromRotation(angle, speed, p.body!.velocity as Phaser.Math.Vector2);
    p.setData({ life: lifeMs, damage });
  }

  private killProjectile(p: Phaser.Physics.Arcade.Image) {
    p.disableBody(true, true);
  }

  private updateProjectiles(dt: number) {
    for (const p of this.projectiles.getChildren() as Phaser.Physics.Arcade.Image[]) {
      if (!p.active) continue;
      const life = (p.getData('life') as number) - dt;
      p.setData('life', life);
      if (life <= 0) this.killProjectile(p);
      else if (this.boss && !this.boss.dead && this.boss.hurtbox.contains(p.x, p.y)) {
        this.boss.hurt(p.getData('damage'));
        this.killProjectile(p);
      }
    }
  }

  private applyPlayerUpgrades() {
    if (this.player instanceof Knight) this.player.doubleAttack = stacks(this.run, 'double_attack') > 0;
  }

  // Dash sangriento e Imán
  private handleUpgradeEffects() {
    if (stacks(this.run, 'bloody_dash') > 0) {
      if (!this.player.isDashing) this.dashHits.clear();
      else {
        for (const e of this.enemies.getChildren() as Enemy[]) {
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

  // phase: 'mid' (mitad del nivel) o 'end' (al llegar a la salida)
  private pendingUpgrade?: 'mid' | 'end';

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
      else if (s.type === 'enemy') {
        const stats = rng.pick(BIOME_ENEMIES);
        for (let i = 0; i < stats.count; i++) {
          const enemy = new Enemy(this, x + i * 14, y, stats, this.terrainAt);
          this.enemies.add(enemy);
          objects.push(enemy);
        }
      }
    }
    return objects;
  }

  // Cada bioma = 2 niveles + persecución del jefe
  private nextLevel() {
    const toBoss = this.run.levelIndex % 2 === 0;
    if (!toBoss) this.run.levelIndex++;
    this.scene.restart({ boss: toBoss });
  }
}
