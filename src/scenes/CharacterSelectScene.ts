import Phaser from 'phaser';
import { ZOOM } from '../config';
import { newRun, type Character } from '../systems/Run';
import { button, text } from '../utils/ui';

const CHARACTERS: { id: Character; name: string; desc: string; key: string }[] = [
  { id: 'knight', name: 'Caballero', desc: 'Melee · cortes en 3 direcciones', key: 'ONE' },
  { id: 'mage', name: 'Mago', desc: 'Dispara al cursor · nova arcana', key: 'TWO' },
];

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
  }

  create() {
    const cx = this.scale.width / 2;
    text(this, cx, 120, 'Elige personaje (clic o 1-2)', 32);

    CHARACTERS.forEach((c, i) => {
      const x = cx + (i === 0 ? -220 : 220);
      const start = () => {
        newRun(this, c.id);
        this.scene.start('Game');
      };
      this.add.image(x, 330, c.id).setScale(ZOOM * 2);
      button(this, x, 470, c.name, start, 24);
      text(this, x, 510, c.desc, 12, '#8a7a9a');
      this.input.keyboard!.once(`keydown-${c.key}`, start);
    });

    button(this, cx, 680, 'Volver', () => this.scene.start('Menu'), 16);
    this.input.keyboard!.once('keydown-ESC', () => this.scene.start('Menu'));
  }
}
