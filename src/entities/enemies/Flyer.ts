import Phaser from 'phaser';
import flyers from '../../data/flyers.json';

export type FlyerStats = (typeof flyers)[keyof typeof flyers];
type State = 'hover' | 'dive' | 'carry';

const STUN_MS = 200;
const DIVE_MS = 900;
const HOVER_HEIGHT = 56;

// Enemigo volador sin gravedad que atraviesa paredes (flyers.json):
// grab → se lanza en picado; si toca al jugador lo levanta y lo suelta desde arriba (Descarnado nocturno).
// shoot → mantiene la distancia y dispara en línea al jugador (Mi-Go).
export class Flyer extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number;
  state: State = 'hover';
  private timer = 0;
  private cooldown = 1000;
  private stunTimer = 0;
  private bob = Math.random() * Math.PI * 2;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly stats: FlyerStats,
    private fire: (x: number, y: number, angle: number, speed: number) => void,
  ) {
    super(scene, x, y, stats.texture);
    this.hp = stats.hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    if (scene.anims.exists(`${stats.texture}-fly`)) this.play(`${stats.texture}-fly`);
  }

  get carrying(): boolean {
    return this.state === 'carry';
  }

  update(dtMs: number, target: Phaser.GameObjects.Components.Transform) {
    const s = this.stats;
    this.timer -= dtMs;
    this.cooldown -= dtMs;
    this.bob += dtMs / 300;
    if (this.stunTimer > 0) {
      this.stunTimer -= dtMs;
      return;
    }
    const dx = target.x - this.x;
    const sees = Math.abs(dx) < s.sight;
    this.setFlipX(dx < 0);

    if (this.state === 'carry') {
      this.body.setVelocity(0, -s.liftSpeed);
      if (this.timer <= 0) this.release();
      return;
    }
    if (this.state === 'dive') {
      if (this.timer <= 0) this.state = 'hover';
      return;
    }

    // Planear: sobre el jugador (grab) o a cierta distancia de él (shoot), con un ligero vaivén
    const keep = s.behavior === 'shoot' ? Math.sign(dx || 1) * -s.keepDistance : 0;
    const goalX = sees ? target.x + keep : this.x;
    const goalY = target.y - HOVER_HEIGHT + Math.sin(this.bob) * 8;
    this.body.setVelocity(Phaser.Math.Clamp((goalX - this.x) * 2, -s.speed, s.speed), Phaser.Math.Clamp((goalY - this.y) * 2, -s.speed, s.speed));

    if (!sees || this.cooldown > 0) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.cooldown = s.cooldownMs;
    if (s.behavior === 'grab') {
      this.state = 'dive';
      this.timer = DIVE_MS;
      this.scene.physics.velocityFromRotation(angle, s.diveSpeed, this.body.velocity);
    } else {
      this.fire(this.x, this.y, angle, s.shotSpeed);
    }
  }

  startCarry() {
    this.state = 'carry';
    this.timer = this.stats.carryMs;
  }

  release() {
    this.state = 'hover';
    this.cooldown = this.stats.cooldownMs;
  }

  hurt(damage: number, fromX: number): boolean {
    this.hp -= damage;
    this.stunTimer = STUN_MS;
    if (this.carrying) this.release();
    this.body.setVelocity(Math.sign(this.x - fromX || 1) * 100, -60);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.active && this.clearTint());
    if (this.hp <= 0) this.destroy();
    return this.hp <= 0;
  }
}
