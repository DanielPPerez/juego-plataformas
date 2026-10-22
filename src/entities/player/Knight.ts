import Phaser from 'phaser';
import { Player } from './Player';
import type { Input } from '../../systems/Input';
import type { PlayerConfig } from '../../systems/PlayerConfig';

// Frames activos del golpe: la hitbox existe este tiempo y sigue al jugador
const SWING_MS = 120;

// Caballero: ataque melee hacia donde mira
export class Knight extends Player {
  private attackTimer = 0;
  private swingTimer = 0;
  private swingHits = new Set<object>();

  constructor(scene: Phaser.Scene, x: number, y: number, input: Input, cfg: PlayerConfig) {
    super(scene, x, y, 'knight', input, cfg);
  }

  get attackDamage(): number {
    return this.cfg.attackDamage;
  }

  // Hitbox del golpe en curso (null si no está atacando). Empieza en el centro del cuerpo
  // para que también golpee a enemigos pegados al jugador.
  get attackHitbox(): Phaser.Geom.Rectangle | null {
    if (this.swingTimer <= 0) return null;
    const w = this.body.halfWidth + this.cfg.attackRange;
    const x = this.facing > 0 ? this.body.center.x : this.body.center.x - w;
    return new Phaser.Geom.Rectangle(x, this.body.center.y - 16, w, 32);
  }

  updateAttack(dtMs: number) {
    this.attackTimer -= dtMs;
    this.swingTimer -= dtMs;
    if (this.controls.attackPressed && this.attackTimer <= 0) {
      this.attackTimer = this.cfg.attackCooldownMs;
      this.swingTimer = SWING_MS;
      this.swingHits.clear();
    }
  }

  // Cada objetivo recibe como mucho un impacto por golpe
  canHit(target: object): boolean {
    if (this.swingHits.has(target)) return false;
    this.swingHits.add(target);
    return true;
  }
}
