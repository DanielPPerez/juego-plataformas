import Phaser from 'phaser';
import enemies from '../../data/enemies.json';
import { Tile } from '../../systems/level';

export type EnemyStats = (typeof enemies)[keyof typeof enemies];

const STUN_MS = 200;
const JUMP_COOLDOWN_MS = 1200;
const TILE = 16;
// Escalón más alto que puede subir (en tiles)
const MAX_STEP_TILES = 4;
// Si el jugador está más cerca que esto en horizontal, no salta ni se deja caer (no se le lanza encima)
const KEEP_AWAY = 40;
// Solo se gira hacia el jugador si está a más de esta distancia (evita giros constantes)
const TURN_DEADZONE = 16;
const LUNGE_RANGE = 56;
const LUNGE_SPEED = 170;

// Enemigo terrestre (gravedad y límites los pone el grupo de GameScene). Comportamiento según enemies.json:
// sight/sightY → distancia a la que ve al jugador y lo persigue; jumps → salta huecos y muros;
// climbs → cambia de altura como si caminara: sube por el inicio de una plataforma o por un escalón
// alcanzable, y baja dejándose caer por el final; nunca por el medio ni con el jugador justo al lado;
// lunge → salta hacia el jugador cuando está cerca y a su altura; splitsInto → al morir se divide en dos.
// Sin jumps ni climbs se gira en muros y bordes. En el aire va a airSpeed.
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number;
  private dir: 1 | -1 = -1;
  private stunTimer = 0;
  private jumpTimer = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly stats: EnemyStats,
    private terrainAt: (x: number, y: number) => number,
  ) {
    super(scene, x, y, stats.texture);
    this.hp = stats.hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    if (scene.anims.exists(`${stats.texture}-walk`)) this.play(`${stats.texture}-walk`);
  }

  update(dtMs: number, target: Phaser.Physics.Arcade.Sprite) {
    this.jumpTimer -= dtMs;
    if (this.stunTimer > 0) {
      this.stunTimer -= dtMs;
      return;
    }
    const s = this.stats;
    const b = this.body;
    const dx = target.x - this.x;
    const targetBody = target.body as Phaser.Physics.Arcade.Body;
    // Diferencia de altura entre los pies (positivo = el jugador está más abajo)
    const dy = targetBody.bottom - b.bottom;
    const sees = s.sight > 0 && Math.abs(dx) < s.sight && Math.abs(dy) < s.sightY;
    if (sees && Math.abs(dx) > TURN_DEADZONE) this.dir = dx > 0 ? 1 : -1;

    const onFloor = b.blocked.down;
    const wallAhead = (this.dir < 0 && b.blocked.left) || (this.dir > 0 && b.blocked.right);
    const ledgeAhead = onFloor && this.terrainAt(this.x + this.dir * (b.halfWidth + 2), b.bottom + 2) === Tile.Empty;
    let speed = !onFloor ? s.airSpeed : sees ? s.chaseSpeed : s.speed;

    if (onFloor && s.lunge && sees && Math.abs(dx) < LUNGE_RANGE && Math.abs(dy) < 16) {
      if (this.jump()) speed = LUNGE_SPEED;
    } else if (onFloor && s.climbs && sees) {
      const near = Math.abs(dx) < KEEP_AWAY;
      const playerAbove = dy < -24 && targetBody.blocked.down;
      const playerBelow = dy > 24;
      if (wallAhead) {
        // Escalón: subirlo solo si es alcanzable y el jugador no está encima; si no, esperar
        if (near || !this.stepReachable() || !this.jump()) speed = 0;
      } else if (playerAbove && !near && this.platformStartsAhead()) {
        this.jump();
      } else if (ledgeAhead && (!playerBelow || near)) {
        // Bajar solo dejándose caer por el final de la plataforma, y no encima del jugador
        speed = 0;
      }
    } else if (onFloor && (wallAhead || ledgeAhead) && s.jumps) {
      this.jump();
    } else if (wallAhead && !sees) {
      this.dir *= -1;
    } else if (ledgeAhead) {
      if (sees) speed = 0;
      else this.dir *= -1;
    }

    b.setVelocityX(this.dir * (b.velocity.y < 0 ? Math.max(s.airSpeed, speed) : speed));
    this.setFlipX(this.dir < 0);
  }

  // Devuelve true si el enemigo muere
  hurt(damage: number, fromX: number): boolean {
    this.hp -= damage;
    this.stunTimer = STUN_MS;
    this.body.setVelocity(Math.sign(this.x - fromX || 1) * 120, -120);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.active && this.clearTint());
    if (this.hp <= 0) {
      if (this.stats.splitsInto) this.scene.events.emit('enemy-split', this);
      this.destroy();
    }
    return this.hp <= 0;
  }

  // ¿El muro que tiene delante cabe en un salto?
  private stepReachable(): boolean {
    const x = this.x + this.dir * (this.body.halfWidth + 4);
    let height = 0;
    while (height <= MAX_STEP_TILES && this.terrainAt(x, this.body.bottom - 1 - height * TILE) === Tile.Solid) height++;
    return height <= MAX_STEP_TILES;
  }

  // ¿Empieza justo delante una plataforma más alta? (solo sube por el inicio, nunca por el medio)
  private platformStartsAhead(): boolean {
    const ahead = this.x + this.dir * (this.body.halfWidth + 6);
    const here = ahead - this.dir * TILE;
    for (let k = 2; k <= MAX_STEP_TILES; k++) {
      const y = this.body.bottom - 1 - k * TILE;
      if (this.terrainAt(ahead, y) !== Tile.Empty && this.terrainAt(here, y) === Tile.Empty) return true;
    }
    return false;
  }

  private jump(): boolean {
    if (this.jumpTimer > 0) return false;
    this.jumpTimer = JUMP_COOLDOWN_MS;
    this.body.setVelocityY(-this.stats.jumpVelocity);
    return true;
  }
}
