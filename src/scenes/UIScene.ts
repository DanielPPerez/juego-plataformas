import Phaser from 'phaser';
import { FONT, VIEW_H, ZOOM } from '../config';

export interface Hud {
  status: string;
  debug: string;
}

// HUD a resolución nativa (sin zoom) para que el texto sea nítido. Lee el estado del registry.
export class UIScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;
  private debug!: Phaser.GameObjects.Text;

  constructor() {
    super('UI');
  }

  create() {
    const style = { fontFamily: FONT, fontSize: '16px', color: '#ffffff' };
    this.status = this.add.text(12, 12, '', style);
    this.debug = this.add.text(12, 36, '', { ...style, color: '#9a9aaa' });
    this.add.text(12, VIEW_H * ZOOM - 28, 'F1 ajustes  Shift dash  S/Abajo bajar  R nueva run', {
      ...style,
      color: '#6a6a7a',
    });
  }

  update() {
    const hud = this.registry.get('hud') as Hud | undefined;
    if (!hud) return;
    if (this.status.text !== hud.status) this.status.setText(hud.status);
    if (this.debug.text !== hud.debug) this.debug.setText(hud.debug);
  }
}
