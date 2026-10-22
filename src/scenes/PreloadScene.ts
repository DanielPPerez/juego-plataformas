import Phaser from 'phaser';

// Carga todos los assets del juego; mientras no haya arte, genera placeholders
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create() {
    this.makePlaceholders();
    this.scene.start('Game');
  }

  private makePlaceholders() {
    const g = this.add.graphics();

    // Caballero 24×32: cuerpo ámbar + visera para ver hacia dónde mira
    g.fillStyle(0xe0a030).fillRect(0, 0, 24, 32);
    g.fillStyle(0x1a1020).fillRect(14, 8, 8, 4);
    g.generateTexture('knight', 24, 32);
    g.clear();

    // Tile sólido 16×16
    g.fillStyle(0x4a3b5c).fillRect(0, 0, 16, 16);
    g.fillStyle(0x6b5a80).fillRect(0, 0, 16, 2);
    g.generateTexture('tiles', 16, 16);

    g.destroy();
  }
}
