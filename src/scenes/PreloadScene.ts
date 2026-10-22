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
    const make = (key: string, w: number, h: number, draw: () => void) => {
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };

    // Caballero 24×32: cuerpo ámbar + visera para ver hacia dónde mira
    make('knight', 24, 32, () => {
      g.fillStyle(0xe0a030).fillRect(0, 0, 24, 32);
      g.fillStyle(0x1a1020).fillRect(14, 8, 8, 4);
    });

    // Tileset: 0 = sólido, 1 = plataforma atravesable
    make('tiles', 32, 16, () => {
      g.fillStyle(0x4a3b5c).fillRect(0, 0, 16, 16);
      g.fillStyle(0x6b5a80).fillRect(0, 0, 16, 2);
      g.fillStyle(0x8a6a40).fillRect(16, 0, 16, 4);
      g.fillStyle(0x5a4028).fillRect(16, 4, 16, 1);
    });

    make('exit', 16, 32, () => {
      g.fillStyle(0x2a1040).fillRect(0, 0, 16, 32);
      g.lineStyle(2, 0xb060ff).strokeRect(1, 1, 14, 30);
    });
    make('coin', 6, 6, () => g.fillStyle(0xffd040).fillCircle(3, 3, 3));
    make('chest', 14, 10, () => {
      g.fillStyle(0x7a4a20).fillRect(0, 0, 14, 10);
      g.fillStyle(0xffd040).fillRect(6, 3, 2, 3);
    });
    // Marcador de enemigo (se sustituye por enemigos reales en la fase 3)
    make('enemy-marker', 16, 16, () => g.lineStyle(1, 0xff4040, 0.7).strokeRect(0, 0, 16, 16));

    g.destroy();
  }
}
