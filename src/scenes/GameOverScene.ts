import Phaser from 'phaser';
import { getRun } from '../systems/Run';
import { saveRecord } from '../systems/SaveData';
import { button, text } from '../utils/ui';

// Fin de la run: derrota, o victoria al vencer al jefe del último bioma disponible
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: { victory?: boolean }) {
    const cx = this.scale.width / 2;
    const run = getRun(this);
    const isRecord = saveRecord(run.levelIndex, run.coins);

    text(this, cx, 200, data.victory ? '¡La Entidad ha caído!' : 'Has muerto', 48, data.victory ? '#ffd040' : '#e03040');
    if (data.victory) text(this, cx, 260, 'La llave, la puerta y el guardián vuelven al silencio', 16, '#8a7a9a');
    text(this, cx, 340, `Nivel ${run.levelIndex} · ${run.coins} monedas · ${run.upgrades.length} mejoras`, 16);
    if (isRecord) text(this, cx, 380, '¡Nuevo récord!', 16, '#ffd040');
    text(this, cx, 420, `Seed ${run.seed}`, 12, '#6a6a7a');

    button(this, cx, 520, 'Jugar otra vez', () => this.scene.start('CharacterSelect'), 24);
    button(this, cx, 590, 'Menú principal', () => this.scene.start('Menu'), 24);
    this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('CharacterSelect'));
  }
}
