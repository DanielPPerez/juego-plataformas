import Phaser from 'phaser';
import { button, dim, text } from '../utils/ui';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const cx = this.scale.width / 2;
    dim(this);
    text(this, cx, 260, 'Pausa', 48);

    const resume = () => {
      this.scene.resume('Game');
      this.scene.stop();
    };
    button(this, cx, 400, 'Continuar', resume, 24);
    button(this, cx, 470, 'Menú principal', () => {
      this.scene.stop('Game');
      this.scene.stop('UI');
      this.scene.start('Menu');
    }, 24);
    this.input.keyboard!.once('keydown-ESC', resume);
  }
}
