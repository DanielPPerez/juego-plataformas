import Phaser from 'phaser';

// Carga lo mínimo para mostrar la barra de carga
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Preload');
  }
}
