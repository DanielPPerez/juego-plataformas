import Phaser from 'phaser';
import { ZOOM } from '../config';
import { newRun } from '../systems/Run';
import { button, text } from '../utils/ui';

// El Mago está en la lista de corte del GDD: se muestra bloqueado hasta que exista
export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
  }

  create() {
    const cx = this.scale.width / 2;
    text(this, cx, 120, 'Elige personaje', 32);

    const start = () => {
      newRun(this);
      this.scene.start('Game');
    };

    this.add.image(cx - 220, 330, 'knight').setScale(ZOOM * 2);
    button(this, cx - 220, 470, 'Caballero', start, 24);
    text(this, cx - 220, 510, 'Melee · dash · doble salto', 12, '#8a7a9a');

    this.add.rectangle(cx + 220, 330, 24 * ZOOM * 2, 32 * ZOOM * 2, 0x2a2a3a);
    text(this, cx + 220, 330, '?', 48, '#4a4a5a');
    text(this, cx + 220, 470, 'Mago', 24, '#4a4a5a');
    text(this, cx + 220, 510, 'Próximamente', 12, '#4a4a5a');

    button(this, cx, 680, 'Volver', () => this.scene.start('Menu'), 16);
    this.input.keyboard!.once('keydown-ENTER', start);
    this.input.keyboard!.once('keydown-ESC', () => this.scene.start('Menu'));
  }
}
