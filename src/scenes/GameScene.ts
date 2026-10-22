import Phaser from 'phaser';

// Sala de prueba para las semanas 1–2: aquí va el Caballero con placeholders
export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const ground = this.add.rectangle(240, 262, 480, 16, 0x4a3b5c);
    this.physics.add.existing(ground, true);

    const player = this.add.rectangle(240, 200, 24, 32, 0xe0a030);
    this.physics.add.existing(player);
    this.physics.add.collider(player, ground);

    this.add.text(8, 8, 'Sala de prueba', { fontSize: '8px', color: '#ffffff' });
  }
}
