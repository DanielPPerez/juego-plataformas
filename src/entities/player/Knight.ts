import Phaser from 'phaser';
import { Player } from './Player';
import type { Input } from '../../systems/Input';
import type { PlayerConfig } from '../../systems/PlayerConfig';

// Caballero: melee (el ataque llega en la fase de combate)
export class Knight extends Player {
  constructor(scene: Phaser.Scene, x: number, y: number, input: Input, cfg: PlayerConfig) {
    super(scene, x, y, 'knight', input, cfg);
  }
}
