import Phaser from 'phaser';
import { FONT, VIEW_H, ZOOM } from '../config';

export interface Hud {
  hp: number;
  maxHp: number;
  status: string;
  debug: string;
  boss?: { name: string; hp: number; maxHp: number };
}

const BAR_W = 600;

// HUD a resolución nativa (sin zoom) para que el texto sea nítido. Lee el estado del registry.
export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private status!: Phaser.GameObjects.Text;
  private debug!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('UI');
  }

  create() {
    this.hearts = [];
    const style = { fontFamily: FONT, fontSize: '16px', color: '#ffffff' };
    this.status = this.add.text(12, 44, '', style);
    this.debug = this.add.text(12, 68, '', { ...style, color: '#9a9aaa' });
    this.add.text(12, VIEW_H * ZOOM - 28, 'Clic ataque  Shift dash  S/Abajo bajar  Esc pausa  F1 ajustes', {
      ...style,
      color: '#6a6a7a',
    });
    const cx = this.scale.width / 2;
    this.bossName = this.add.text(cx, 96, '', { ...style, color: '#d0a0ff' }).setOrigin(0.5, 0);
    this.bossBar = this.add.graphics();
  }

  update() {
    const hud = this.registry.get('hud') as Hud | undefined;
    if (!hud) return;
    while (this.hearts.length < hud.maxHp) {
      this.hearts.push(this.add.image(12 + this.hearts.length * 27, 12, 'heart').setOrigin(0).setScale(ZOOM));
    }
    this.hearts.forEach((h, i) => h.setTexture(i < hud.hp ? 'heart' : 'heart-empty').setVisible(i < hud.maxHp));
    if (this.status.text !== hud.status) this.status.setText(hud.status);
    if (this.debug.text !== hud.debug) this.debug.setText(hud.debug);

    this.bossName.setText(hud.boss?.name ?? '');
    this.bossBar.clear();
    if (hud.boss) {
      const x = (this.scale.width - BAR_W) / 2;
      this.bossBar.fillStyle(0x2a1a3a).fillRect(x, 120, BAR_W, 14);
      this.bossBar.fillStyle(0xa040e0).fillRect(x, 120, (BAR_W * hud.boss.hp) / hud.boss.maxHp, 14);
    }
  }
}
