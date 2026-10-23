import Phaser from 'phaser';
import { TITLE } from '../config';
import biomes from '../data/biomes.json';
import bosses from '../data/bosses.json';
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
      // Una fila por bioma: sus 2 niveles y su jefe
      biomes.forEach((biome, i) => {
        const y = 615 + i * 34;
        const first = biome.id * 2 - 1;
        text(this, cx - 420, y, biome.name, 12, '#8a7a9a');
        button(this, cx - 130, y, `Nivel ${first}`, jump(first, false), 14);
        button(this, cx + 30, y, `Nivel ${first + 1}`, jump(first + 1, false), 14);
        button(this, cx + 250, y, `Jefe: ${bosses[biome.boss as keyof typeof bosses].name}`, jump(first + 1, true), 14);
      });
      text(this, cx, 730, 'En juego: F2 saltar tramo · F3 invencible', 12, '#6a6a7a');
    }
  }
}
