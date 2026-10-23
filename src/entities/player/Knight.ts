import Phaser from 'phaser';
import { Player } from './Player';
import type { Input } from '../../systems/Input';
import type { PlayerConfig } from '../../systems/PlayerConfig';

// Frames activos del golpe: la hitbox existe este tiempo y sigue al jugador
const SWING_MS = 120;
// Ancho de los cortes hacia arriba y abajo
const VERTICAL_SWING_W = 36;
// Tajo (habilidad, clic der.): doble de alcance y un poco más ancho → ~doble de área
const BIG_RANGE = 2;
const BIG_CROSS = 1.25;

export type SwingDir = 'side' | 'up' | 'down';

// Caballero: ataque melee hacia donde mira; con W/↑ corta hacia arriba y con S/↓ en el aire hacia abajo.
// Habilidad (clic der.): Tajo, un corte con el doble de área.
export class Knight extends Player {
  // Mejora "Doble ataque": un segundo golpe automático tras el primero
  doubleAttack = false;
  // true solo en el frame en que empieza un golpe
  justSwung = false;
  swingDir: SwingDir = 'side';
  // El golpe en curso es el Tajo
  bigSwing = false;
  private specialTimer = 0;
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
    const range = this.cfg.attackRange * (this.bigSwing ? BIG_RANGE : 1);
    const cross = this.bigSwing ? BIG_CROSS : 1;
    const vw = VERTICAL_SWING_W * cross;
    if (this.swingDir === 'up') {
      return new Phaser.Geom.Rectangle(b.center.x - vw / 2, b.top - range, vw, range + b.halfHeight);
    }
    if (this.swingDir === 'down') {
      return new Phaser.Geom.Rectangle(b.center.x - vw / 2, b.center.y, vw, b.halfHeight + range);
    }
    const w = b.halfWidth + range;
    const h = 32 * cross;
    return new Phaser.Geom.Rectangle(this.facing > 0 ? b.center.x : b.center.x - w, b.center.y - h / 2, w, h);
  }

  get specialReadyInMs(): number {
    return Math.max(0, this.specialTimer);
  }

  get specialBaseCooldownMs(): number {
    return this.cfg.specialCooldownMs;
  }

  updateAttack(dtMs: number, specialCooldownMs: number) {
    this.justSwung = false;
    this.attackTimer -= dtMs;
    this.swingTimer -= dtMs;
    this.specialTimer -= dtMs;
    if (this.secondSwingTimer > 0 && (this.secondSwingTimer -= dtMs) <= 0) this.swing(this.swingDir);
    const dir = this.controls.upHeld ? 'up' : this.controls.downHeld && !this.onFloor ? 'down' : 'side';
    if (this.controls.specialPressed && this.specialTimer <= 0) {
      this.specialTimer = specialCooldownMs;
      this.attackTimer = this.cfg.attackCooldownMs;
      this.swing(dir, true);
    } else if (this.controls.attackPressed && this.attackTimer <= 0) {
      this.attackTimer = this.cfg.attackCooldownMs;
      this.swing(dir);
      if (this.doubleAttack) this.secondSwingTimer = SWING_MS + 60;
    }
  }

  protected override animState(): string {
    if (this.swingTimer > 0 && !this.isDashing) {
      if (this.bigSwing) return 'special';
      return this.swingDir === 'side' ? 'attack' : `attack_${this.swingDir}`;
    }
    return super.animState();
  }

  // Cada objetivo recibe como mucho un impacto por golpe
  canHit(target: object): boolean {
    if (this.swingHits.has(target)) return false;
    this.swingHits.add(target);
    return true;
  }

  private swing(dir: SwingDir, big = false) {
    this.swingDir = dir;
    this.bigSwing = big;
    this.swingTimer = SWING_MS;
    this.swingHits.clear();
    this.justSwung = true;
  }
}
