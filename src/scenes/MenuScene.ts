import Phaser from 'phaser';
import { TITLE } from '../config';
import { isDevMode, newRun, type Character } from '../systems/Run';
import { loadRecord } from '../systems/SaveData';
import { button, text } from '../utils/ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const cx = this.scale.width / 2;
    text(this, cx, 180, TITLE, 48, '#d0a0ff');
    text(this, cx, 240, 'Medieval oscuro · horror cósmico', 16, '#8a7a9a');

    button(this, cx, 380, 'Jugar', () => this.scene.start('CharacterSelect'), 32);
    this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('CharacterSelect'));

    const record = loadRecord();
    if (record.bestLevel > 0) {
      text(this, cx, 450, `Récord: nivel ${record.bestLevel} · ${record.bestCoins} monedas`, 16, '#8a7a9a');
    }

    // Selector de tramos para probar y grabar sin jugar desde el principio
    if (isDevMode()) {
      text(this, cx, 540, 'Desarrollo: ir a', 16, '#6a6a7a');
      let character: Character = 'knight';
      const toggle = button(this, cx, 575, 'Personaje: Caballero', () => {
        character = character === 'knight' ? 'mage' : 'knight';
        toggle.setText(`Personaje: ${character === 'knight' ? 'Caballero' : 'Mago'}`);
      }, 14);
      const jump = (levelIndex: number, boss: boolean) => () => {
        newRun(this, character, undefined, levelIndex);
        this.scene.start('Game', { boss });
      };
      button(this, cx - 320, 610, 'Nivel 1', jump(1, false), 16);
      button(this, cx - 110, 610, 'Nivel 2', jump(2, false), 16);
      button(this, cx + 140, 610, 'Jefe: La Llave', jump(2, true), 16);
      text(this, cx, 660, 'En juego: F2 saltar tramo · F3 invencible', 12, '#6a6a7a');
    }
  }
}
