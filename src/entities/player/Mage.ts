import Phaser from 'phaser';
import mage from '../../data/mage.json';
import { Player } from './Player';
import type { Input } from '../../systems/Input';
import type { PlayerConfig } from '../../systems/PlayerConfig';

const CAST_ANIM_MS = 180;

// Mago: dispara hacia el cursor (clic izq.) y lanza una nova arcana alrededor (clic der.)
export class Mage extends Player {
  readonly stats = mage;
  private castTimer = 0;
  private specialTimer = 0;
  private castAnimTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, input: Input, cfg: PlayerConfig) {
    super(scene, x, y, 'mage', input, cfg);
  }

  override get attackDamage(): number {
    return mage.boltDamage;
  }

  get specialReadyInMs(): number {
    return Math.max(0, this.specialTimer);
  }

  // Qué lanza este frame. La escena crea los proyectiles (pool compartido).
  updateCast(dtMs: number, specialCooldownMs: number): 'shot' | 'nova' | null {
    this.castTimer -= dtMs;
    this.specialTimer -= dtMs;
    this.castAnimTimer -= dtMs;
    if (this.controls.attackPressed && this.castTimer <= 0) {
      this.castTimer = mage.attackCooldownMs;
      this.castAnimTimer = CAST_ANIM_MS;
      return 'shot';
    }
    if (this.controls.specialPressed && this.specialTimer <= 0) {
      this.specialTimer = specialCooldownMs;
      this.castAnimTimer = CAST_ANIM_MS;
      return 'nova';
    }
    return null;
  }

  faceTowards(x: number) {
    this.facing = x >= this.x ? 1 : -1;
    this.setFlipX(this.facing < 0);
  }

  protected override animState(): string {
    return this.castAnimTimer > 0 && !this.isDashing ? 'cast' : super.animState();
  }
}
