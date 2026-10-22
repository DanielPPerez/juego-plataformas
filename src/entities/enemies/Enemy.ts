import Phaser from 'phaser';
import enemies from '../../data/enemies.json';

export type EnemyStats = (typeof enemies)[keyof typeof enemies];

const STUN_MS = 200;

// Enemigo terrestre que patrulla (gravedad y límites los pone el grupo de GameScene).
// El comportamiento sale de los datos (enemies.json):
// sight > 0 → persigue al jugador si lo ve; turnAtLedges → se gira en los bordes; jumpGaps → salta los huecos.
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number;
  private dir: 1 | -1 = -1;
  private stunTimer = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly stats: EnemyStats,
    private groundAt: (x: number, y: number) => boolean,
  ) {
    super(scene, x, y, stats.texture);
    this.hp = stats.hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  update(dtMs: number, target: Phaser.GameObjects.Components.Transform) {
    if (this.stunTimer > 0) {
      this.stunTimer -= dtMs;
      return;
    }
    const s = this.stats;
    const b = this.body;
    const dx = target.x - this.x;
    const sees = s.sight > 0 && Math.abs(dx) < s.sight && Math.abs(target.y - this.y) < 32;
    if (sees) this.dir = dx > 0 ? 1 : -1;

    if ((this.dir < 0 && b.blocked.left) || (this.dir > 0 && b.blocked.right)) this.dir *= -1;

    let speed = sees ? s.chaseSpeed : s.speed;
    const ledgeAhead = b.blocked.down && !this.groundAt(this.x + this.dir * (b.halfWidth + 2), b.bottom + 2);
    if (ledgeAhead) {
      if (s.jumpGaps) b.setVelocityY(-s.jumpVelocity);
      else if (sees) speed = 0;
      else this.dir *= -1;
    }

    b.setVelocityX(this.dir * speed);
    this.setFlipX(this.dir < 0);
  }

  // Devuelve true si el enemigo muere
  hurt(damage: number, fromX: number): boolean {
    this.hp -= damage;
    this.stunTimer = STUN_MS;
    this.body.setVelocity(Math.sign(this.x - fromX || 1) * 120, -120);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.active && this.clearTint());
    if (this.hp <= 0) this.destroy();
    return this.hp <= 0;
  }
}
