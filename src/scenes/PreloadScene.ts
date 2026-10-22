import Phaser from 'phaser';

// Carga todos los assets del juego (sprites, tilemaps, audio)
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    // this.load.image('tiles-bioma1', 'assets/tiles/bioma1.png');
  }

  create() {
    this.scene.start('Game');
  }
}
