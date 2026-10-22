import Phaser from 'phaser';
import { VIEW_H, VIEW_W, ZOOM } from './config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: VIEW_W * ZOOM,
  height: VIEW_H * ZOOM,
  backgroundColor: '#0b0b12',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: true },
  },
  scene: [BootScene, PreloadScene, GameScene, UIScene],
};

new Phaser.Game(config);
