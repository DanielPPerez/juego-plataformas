import Phaser from 'phaser';
import { getRun } from '../systems/Run';
import { applyUpgrade, type Upgrade } from '../systems/Upgrades';
import { button, dim, text } from '../utils/ui';

export interface UpgradeSceneData {
  title: string;
  choices: Upgrade[];
}

// Elegir 1 de 3 mejoras. Se superpone a GameScene (pausada) y le avisa al terminar.
export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('Upgrade');
  }

  create(data: UpgradeSceneData) {
    const cx = this.scale.width / 2;
    dim(this);
    text(this, cx, 160, data.title, 32, '#ffd040');
    text(this, cx, 210, 'Elige una mejora (clic o 1-3)', 16, '#8a7a9a');

    const pick = (u: Upgrade) => {
      applyUpgrade(getRun(this), u);
      this.scene.get('Game').events.emit('upgrade-picked');
      this.scene.stop();
    };

    data.choices.forEach((u, i) => {
      const x = cx + (i - 1) * 440;
      this.add.rectangle(x, 420, 400, 260, 0x1a1428).setStrokeStyle(2, 0x5a4a7a);
      button(this, x, 360, `${i + 1}. ${u.name}`, () => pick(u), 20);
      text(this, x, 440, u.desc, 14, '#c0c0d0').setWordWrapWidth(340);
      this.input.keyboard!.once(`keydown-${['ONE', 'TWO', 'THREE'][i]}`, () => pick(u));
    });
  }
}
