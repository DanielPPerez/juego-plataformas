import Phaser from 'phaser';

type KeyName = 'left' | 'right' | 'a' | 'd' | 'up' | 'w' | 'space' | 'shift';

// Traduce teclado + mouse a acciones del juego; el resto del código no conoce las teclas
export class Input {
  private keys: Record<KeyName, Phaser.Input.Keyboard.Key>;
  private pointer: Phaser.Input.Pointer;
  private prevLeftButton = false;
  private prevRightButton = false;

  jumpPressed = false;
  dashPressed = false;
  attackPressed = false;
  specialPressed = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      a: kb.addKey(K.A),
      d: kb.addKey(K.D),
      up: kb.addKey(K.UP),
      w: kb.addKey(K.W),
      space: kb.addKey(K.SPACE),
      shift: kb.addKey(K.SHIFT),
    };
    scene.input.mouse?.disableContextMenu();
    this.pointer = scene.input.activePointer;
  }

  // Llamar una vez por frame antes de leer las acciones
  update() {
    const JD = Phaser.Input.Keyboard.JustDown;
    this.jumpPressed = JD(this.keys.space) || JD(this.keys.w) || JD(this.keys.up);
    this.dashPressed = JD(this.keys.shift);

    const left = this.pointer.leftButtonDown();
    const right = this.pointer.rightButtonDown();
    this.attackPressed = left && !this.prevLeftButton;
    this.specialPressed = right && !this.prevRightButton;
    this.prevLeftButton = left;
    this.prevRightButton = right;
  }

  get axisX(): number {
    const l = this.keys.left.isDown || this.keys.a.isDown;
    const r = this.keys.right.isDown || this.keys.d.isDown;
    return (r ? 1 : 0) - (l ? 1 : 0);
  }

  get jumpHeld(): boolean {
    return this.keys.space.isDown || this.keys.w.isDown || this.keys.up.isDown;
  }
}
