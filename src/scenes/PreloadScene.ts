import Phaser from 'phaser';
import { FONT } from '../config';

// Carga todos los assets del juego; mientras no haya arte, genera placeholders
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create() {
    this.makePlaceholders();
    // Esperar la fuente: si el texto se crea antes, Phaser lo dibuja con la fuente por defecto
    document.fonts.load(`16px ${FONT}`).finally(() => this.scene.start('Game'));
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
    // Cultista 16×24: túnica granate con capucha y ojos
    make('cultist', 16, 24, () => {
      g.fillStyle(0x6a1a2a).fillRect(2, 4, 12, 20);
      g.fillStyle(0x4a0e1a).fillRect(4, 0, 8, 8);
      g.fillStyle(0xffd040).fillRect(9, 4, 2, 1);
    });
    // Rata 14×8
    make('rat', 14, 8, () => {
      g.fillStyle(0x7a7a80).fillRect(2, 2, 10, 6);
      g.fillStyle(0x5a5a60).fillRect(0, 5, 3, 1);
      g.fillStyle(0xff4040).fillRect(10, 3, 1, 1);
    });
    // Larva de La Llave 10×6
    make('larva', 10, 6, () => {
      g.fillStyle(0x8ab04a).fillRect(0, 1, 10, 5);
      g.fillStyle(0x4a6a20).fillRect(2, 1, 1, 5).fillRect(5, 1, 1, 5);
    });
    // Corazones de la UI (7×6)
    const heart = (color: number) => () => {
      g.fillStyle(color).fillRect(1, 0, 2, 1).fillRect(4, 0, 2, 1).fillRect(0, 1, 7, 2).fillRect(1, 3, 5, 1);
      g.fillRect(2, 4, 3, 1).fillRect(3, 5, 1, 1);
    };
    make('heart', 7, 6, heart(0xe03040));
    make('heart-empty', 7, 6, heart(0x3a2a40));

    g.destroy();
  }
}
