import Phaser from 'phaser';
import { FONT } from '../config';

export function text(scene: Phaser.Scene, x: number, y: number, value: string, size = 16, color = '#ffffff') {
  return scene.add.text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5);
}

// Texto clicable con hover
export function button(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, size = 24) {
  const t = text(scene, x, y, label, size, '#c0b0d0').setInteractive({ useHandCursor: true });
  t.on('pointerover', () => t.setColor('#ffd040'));
  t.on('pointerout', () => t.setColor('#c0b0d0'));
  t.on('pointerdown', onClick);
  return t;
}

// Fondo semitransparente para escenas superpuestas (pausa, mejoras)
export function dim(scene: Phaser.Scene) {
  return scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.7).setOrigin(0);
}
