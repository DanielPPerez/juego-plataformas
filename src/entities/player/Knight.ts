import Phaser from 'phaser';
import { Player } from './Player';
import type { Input } from '../../systems/Input';
import type { PlayerConfig } from '../../systems/PlayerConfig';

// Frames activos del golpe: la hitbox existe este tiempo y sigue al jugador
const SWING_MS = 120;
// Ancho de los cortes hacia arriba y abajo
const VERTICAL_SWING_W = 36;

export type SwingDir = 'side' | 'up' | 'down';

// Caballero: ataque melee hacia donde mira; con W/↑ corta hacia arriba y con S/↓ en el aire hacia abajo
export class Knight extends Player {
  // Mejora "Doble ataque": un segundo golpe automático tras el primero
  doubleAttack = false;
  // true solo en el frame en que empieza un golpe
  justSwung = false;
  swingDir: SwingDir = 'side';
  private attackTimer = 0;
  private swingTimer = 0;
  private secondSwingTimer = 0;
  private swingHits = new Set<object>();

  constructor(scene: Phaser.Scene, x: number, y: number, input: Input, cfg: PlayerConfig) {
    super(scene, x, y, 'knight', input, cfg);
  }

  // Hitbox del golpe en curso (null si no está atacando). Empieza en el centro del cuerpo
  // para que también golpee a enemigos pegados al jugador.
  get attackHitbox(): Phaser.Geom.Rectangle | null {
    if (this.swingTimer <= 0) return null;
    const b = this.body;
    const range = this.cfg.attackRange;
    if (this.swingDir === 'up') {
      return new Phaser.Geom.Rectangle(b.center.x - VERTICAL_SWING_W / 2, b.top - range, VERTICAL_SWING_W, range + b.halfHeight);
    }
    if (this.swingDir === 'down') {
      return new Phaser.Geom.Rectangle(b.center.x - VERTICAL_SWING_W / 2, b.center.y, VERTICAL_SWING_W, b.halfHeight + range);
    }
    const w = b.halfWidth + range;
    return new Phaser.Geom.Rectangle(this.facing > 0 ? b.center.x : b.center.x - w, b.center.y - 16, w, 32);
  }

  updateAttack(dtMs: number) {
    this.justSwung = false;
    this.attackTimer -= dtMs;
    this.swingTimer -= dtMs;
    if (this.secondSwingTimer > 0 && (this.secondSwingTimer -= dtMs) <= 0) this.swing(this.swingDir);
    if (this.controls.attackPressed && this.attackTimer <= 0) {
      this.attackTimer = this.cfg.attackCooldownMs;
      const dir = this.controls.upHeld ? 'up' : this.controls.downHeld && !this.onFloor ? 'down' : 'side';
      this.swing(dir);
      if (this.doubleAttack) this.secondSwingTimer = SWING_MS + 60;
    }
  }

  protected override animState(): string {
    if (this.swingTimer > 0 && !this.isDashing) return this.swingDir === 'side' ? 'attack' : `attack_${this.swingDir}`;
    return super.animState();
  }

  // Cada objetivo recibe como mucho un impacto por golpe
  canHit(target: object): boolean {
    if (this.swingHits.has(target)) return false;
    this.swingHits.add(target);
    return true;
  }

  private swing(dir: SwingDir) {
    this.swingDir = dir;
    this.swingTimer = SWING_MS;
    this.swingHits.clear();
    this.justSwung = true;
  }
}
