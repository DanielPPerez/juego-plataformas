import Phaser from 'phaser';
import enemies from '../../data/enemies.json';
import { Tile } from '../../systems/level';

export type EnemyStats = (typeof enemies)[keyof typeof enemies];

const STUN_MS = 200;
const JUMP_COOLDOWN_MS = 1200;
const DROP_MS = 250;
// Solo sube cuando está casi debajo del jugador (si no, camina de lado hasta llegar)
const CLIMB_RANGE = 20;
const LUNGE_RANGE = 56;
const LUNGE_SPEED = 170;

// Enemigo terrestre (gravedad y límites los pone el grupo de GameScene). Comportamiento según enemies.json:
// sight/sightY → distancia a la que ve al jugador y lo persigue; jumps → salta huecos y muros;
// climbs → al perseguir, sube a la superficie donde está el jugador (solo si está de pie en ella y justo
// encima) y se deja caer si está más abajo; lunge → salta hacia el jugador cuando está cerca y a su altura;
// splitsInto → al morir se divide en dos enemigos de ese tipo.
// Sin jumps ni climbs se gira en muros y bordes. En el aire va a airSpeed.
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number;
  private dir: 1 | -1 = -1;
  private stunTimer = 0;
  private jumpTimer = 0;
  private dropTimer = 0;

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

  // Mientras es true, la escena ignora su colisión con plataformas atravesables
  get isDropping(): boolean {
    return this.dropTimer > 0;
  }

  update(dtMs: number, target: Phaser.Physics.Arcade.Sprite) {
    this.jumpTimer -= dtMs;
    this.dropTimer -= dtMs;
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
    if (sees && Math.abs(dx) > 4) this.dir = dx > 0 ? 1 : -1;

    const onFloor = b.blocked.down;
    const wallAhead = (this.dir < 0 && b.blocked.left) || (this.dir > 0 && b.blocked.right);
    const ledgeAhead = onFloor && this.terrainAt(this.x + this.dir * (b.halfWidth + 2), b.bottom + 2) === Tile.Empty;
    let speed = !onFloor ? s.airSpeed : sees ? s.chaseSpeed : s.speed;

    if (onFloor && s.lunge && sees && Math.abs(dx) < LUNGE_RANGE && Math.abs(dy) < 16) {
      if (this.jump()) speed = LUNGE_SPEED;
    } else if (onFloor && s.climbs && sees) {
      const onPlatform = this.terrainAt(b.center.x, b.bottom + 2) === Tile.Platform;
      const playerAbove = dy < -24 && targetBody.blocked.down;
      if ((playerAbove && Math.abs(dx) < CLIMB_RANGE) || wallAhead) this.jump();
      else if (dy > 8 && onPlatform) this.dropTimer = DROP_MS;
      // Si el jugador está más abajo se deja caer por el borde; si no, espera en él
      else if (ledgeAhead && dy <= 8) speed = 0;
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

  private jump(): boolean {
    if (this.jumpTimer > 0) return false;
    this.jumpTimer = JUMP_COOLDOWN_MS;
    this.body.setVelocityY(-this.stats.jumpVelocity);
    return true;
  }
}
