import Phaser from 'phaser';
import type { Input } from '../../systems/Input';
import type { PlayerConfig } from '../../systems/PlayerConfig';

// Movimiento compartido por todos los personajes; las subclases añaden ataque y habilidad
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  facing: 1 | -1 = 1;
  invulnerable = false;

  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private dashTimer = 0;
  private dashCooldownTimer = 0;
  private canAirDash = true;
  private wasOnFloor = false;
  private jumpCutAvailable = false;

  // El sprite físico es invisible; el visual se deforma (squash) sin tocar la hitbox
  protected visual: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    protected controls: Input,
    protected cfg: PlayerConfig,
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(16, 28).setOffset(4, 4);
    // La gravedad la aplica el jugador para poder variarla (ápice, dash)
    this.body.setAllowGravity(false);

    this.setVisible(false);
    this.visual = scene.add.image(x, y, texture).setOrigin(0.5, 1);
    // POST_UPDATE corre después de que la física mueva el sprite
    const sync = () => {
      this.visual.setPosition(this.x, this.y + this.displayHeight / 2).setFlipX(this.flipX);
    };
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
      this.visual.destroy();
    });
  }

  get isDashing(): boolean {
    return this.dashTimer > 0;
  }

  get onFloor(): boolean {
    return this.body.blocked.down;
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;
    const cfg = this.cfg;
    const body = this.body;
    const axis = this.controls.axisX;
    if (axis !== 0 && !this.isDashing) this.facing = axis > 0 ? 1 : -1;

    this.coyoteTimer = this.onFloor ? cfg.coyoteTimeMs : this.coyoteTimer - dtMs;
    this.jumpBufferTimer -= dtMs;
    this.dashCooldownTimer -= dtMs;
    if (this.controls.jumpPressed) this.jumpBufferTimer = cfg.jumpBufferMs;
    if (this.onFloor) this.canAirDash = true;

    if (!this.wasOnFloor && this.onFloor) this.squash(1.25, 0.8);
    this.wasOnFloor = this.onFloor;

    // Dash: velocidad horizontal fija, sin gravedad y con i-frames
    if (this.controls.dashPressed && this.dashCooldownTimer <= 0 && (this.onFloor || this.canAirDash)) {
      this.dashTimer = cfg.dashDurationMs;
      this.dashCooldownTimer = cfg.dashCooldownMs;
      if (!this.onFloor) this.canAirDash = false;
      this.invulnerable = true;
      this.squash(1.3, 0.75);
    }
    if (this.isDashing) {
      this.dashTimer -= dtMs;
      body.setVelocity(this.facing * cfg.dashSpeed, 0);
      if (this.dashTimer <= 0) {
        this.invulnerable = false;
        body.setVelocityX(this.facing * cfg.maxRunSpeed);
      }
      this.setFlipX(this.facing < 0);
      return;
    }

    // Horizontal: acelerar hacia la velocidad objetivo
    const target = axis * cfg.maxRunSpeed;
    const accelerating = axis !== 0;
    const rate = this.onFloor
      ? (accelerating ? cfg.groundAccel : cfg.groundDecel)
      : (accelerating ? cfg.airAccel : cfg.airDecel);
    body.setVelocityX(approach(body.velocity.x, target, rate * dt));

    // Salto con coyote time + jump buffer
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      body.setVelocityY(-cfg.jumpVelocity);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.jumpCutAvailable = true;
      this.squash(0.75, 1.3);
    }

    // Salto variable: soltar el botón corta la subida (una vez por salto)
    if (this.jumpCutAvailable && !this.controls.jumpHeld && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * cfg.jumpCutMultiplier);
      this.jumpCutAvailable = false;
    }
    if (body.velocity.y >= 0) this.jumpCutAvailable = false;

    // Gravedad reducida en el ápice si se mantiene el salto (más control en el aire)
    let gravity = cfg.gravity;
    if (this.controls.jumpHeld && Math.abs(body.velocity.y) < cfg.apexThreshold) {
      gravity *= cfg.apexGravityMultiplier;
    }
    // Siempre se aplica (también en el suelo) para que la colisión mantenga blocked.down
    body.setVelocityY(Math.min(body.velocity.y + gravity * dt, cfg.maxFallSpeed));

    this.setFlipX(this.facing < 0);
  }

  private squash(sx: number, sy: number) {
    this.scene.tweens.killTweensOf(this.visual);
    this.visual.setScale(sx, sy);
    this.scene.tweens.add({ targets: this.visual, scaleX: 1, scaleY: 1, duration: 120, ease: 'Quad.easeOut' });
  }
}

function approach(value: number, target: number, delta: number): number {
  return value < target ? Math.min(value + delta, target) : Math.max(value - delta, target);
}
