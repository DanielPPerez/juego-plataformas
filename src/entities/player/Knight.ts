import Phaser from 'phaser';
import { Player } from './Player';
import type { Input } from '../../systems/Input';
import type { PlayerConfig } from '../../systems/PlayerConfig';

// Caballero: ataque melee hacia donde mira
export class Knight extends Player {
  private attackTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, input: Input, cfg: PlayerConfig) {
    super(scene, x, y, 'knight', input, cfg);
  }

  get attackDamage(): number {
    return this.cfg.attackDamage;
  }

  // Si se ataca este frame, devuelve la hitbox del golpe
  tryAttack(dtMs: number): Phaser.Geom.Rectangle | null {
    this.attackTimer -= dtMs;
    if (!this.controls.attackPressed || this.attackTimer > 0) return null;
    this.attackTimer = this.cfg.attackCooldownMs;
    const w = this.cfg.attackRange;
    const x = this.facing > 0 ? this.body.right : this.body.left - w;
    return new Phaser.Geom.Rectangle(x, this.body.center.y - 14, w, 28);
  }
}
