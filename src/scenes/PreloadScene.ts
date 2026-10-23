import Phaser from 'phaser';
import { FONT } from '../config';
import sheets from '../data/assets.json';
import biomes from '../data/biomes.json';
import { isDebugUrl } from '../systems/Run';

type Sheet = { frameWidth: number; frameHeight: number; anims: Record<string, number[]> };

// Todo PNG en src/assets/ se carga con su nombre de archivo como clave (knight.png → 'knight').
// Si está en assets.json es una hoja de sprites con animaciones; si no, una imagen.
const files = import.meta.glob('../assets/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<
  string,
  string
>;

// Carga el arte disponible y genera placeholders para lo que falte
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    for (const [path, url] of Object.entries(files)) {
      const key = path.split('/').pop()!.replace('.png', '');
      const sheet = (sheets as Record<string, Sheet>)[key];
      if (sheet) this.load.spritesheet(key, url, sheet);
      else this.load.image(key, url);
    }
  }

  create() {
    this.makePlaceholders();
    for (const [key, sheet] of Object.entries(sheets as Record<string, Sheet>)) {
      // Solo si se cargó la hoja real (un placeholder tiene un único frame)
      if (this.textures.get(key).frameTotal <= 1) continue;
      for (const [name, [start, end, frameRate]] of Object.entries(sheet.anims)) {
        this.anims.create({
          key: `${key}-${name}`,
          frames: this.anims.generateFrameNumbers(key, { start, end }),
          frameRate,
          repeat: ['idle', 'run', 'walk', 'fly'].includes(name) ? -1 : 0,
        });
      }
    }
    // Esperar la fuente: si el texto se crea antes, Phaser lo dibuja con la fuente por defecto
    document.fonts.load(`16px ${FONT}`).finally(() => this.scene.start(isDebugUrl() ? 'Game' : 'Menu'));
  }

  private makePlaceholders() {
    const g = this.add.graphics();
    const make = (key: string, w: number, h: number, draw: () => void) => {
      if (this.textures.exists(key)) return;
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };

    // Caballero 24×32: cuerpo ámbar + visera para ver hacia dónde mira
    make('knight', 24, 32, () => {
      g.fillStyle(0xe0a030).fillRect(0, 0, 24, 32);
      g.fillStyle(0x1a1020).fillRect(14, 8, 8, 4);
    });

    // Mago 24×32: túnica azul con sombrero
    make('mage', 24, 32, () => {
      g.fillStyle(0x3a5ab0).fillRect(3, 8, 18, 24);
      g.fillStyle(0x2a3a80).fillRect(5, 0, 14, 9);
      g.fillStyle(0xd0e0ff).fillRect(14, 11, 6, 3);
    });
    // Proyectiles: rayo del Mago 8×8 y onda de corte del Caballero 10×16
    make('bolt', 8, 8, () => g.fillStyle(0x80c0ff).fillCircle(4, 4, 4).fillStyle(0xffffff).fillCircle(4, 4, 2));
    make('wave', 10, 16, () => g.fillStyle(0xffffff, 0.8).fillRect(4, 0, 3, 16).fillRect(1, 3, 3, 10));

    // Tileset de cada bioma (tiles1, tiles2, tiles3): 0 = sólido, 1 = plataforma atravesable
    for (const biome of biomes) {
      const solid = Phaser.Display.Color.HexStringToColor(biome.solid);
      const platform = Phaser.Display.Color.HexStringToColor(biome.platform);
      make(`tiles${biome.id}`, 32, 16, () => {
        g.fillStyle(solid.color).fillRect(0, 0, 16, 16);
        g.fillStyle(solid.clone().lighten(15).color).fillRect(0, 0, 16, 2);
        g.fillStyle(platform.color).fillRect(16, 0, 16, 4);
        g.fillStyle(platform.clone().darken(20).color).fillRect(16, 4, 16, 1);
      });
    }

    // Enemigos de los biomas 2 y 3
    make('deep_one', 16, 24, () => {
      g.fillStyle(0x2a6a5a).fillRect(2, 4, 12, 20);
      g.fillStyle(0x3a8a6a).fillRect(3, 0, 10, 8);
      g.fillStyle(0xe0e070).fillRect(10, 3, 2, 2);
    });
    make('shoggoth', 28, 20, () => {
      g.fillStyle(0x1a2a1a).fillEllipse(14, 12, 28, 18);
      g.fillStyle(0x8ad07a).fillCircle(8, 9, 2).fillCircle(17, 6, 2).fillCircle(22, 12, 2);
    });
    make('shoggoth_small', 16, 12, () => {
      g.fillStyle(0x1a2a1a).fillEllipse(8, 7, 16, 10);
      g.fillStyle(0x8ad07a).fillCircle(5, 5, 1).fillCircle(11, 6, 1);
    });
    make('night_gaunt', 20, 14, () => {
      g.fillStyle(0x101018).fillTriangle(0, 2, 10, 8, 0, 12).fillTriangle(20, 2, 10, 8, 20, 12);
      g.fillStyle(0x202030).fillRect(7, 3, 6, 11);
    });
    make('mi_go', 18, 14, () => {
      g.fillStyle(0xc07a8a).fillEllipse(9, 8, 14, 10);
      g.fillStyle(0xe0b0c0, 0.7).fillEllipse(4, 4, 8, 5).fillEllipse(14, 4, 8, 5);
    });
    make('shot', 6, 6, () => g.fillStyle(0xff5050).fillCircle(3, 3, 3));

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
