import Phaser from 'phaser';
import bosses from '../../data/bosses.json';
import { RNG } from '../../systems/RNG';

type Pattern = keyof (typeof bosses.key.phases)[number]['patterns'];
type State = 'idle' | 'telegraph' | 'attack' | 'recover' | 'dead';

const W = 96;
const H = 190;
// Cuánto asoma el jefe por el borde izquierdo de la cámara, y cuánto avanza al embestir
const VISIBLE = 72;
const LUNGE = 70;

export interface KeyBossHooks {
  camera: Phaser.Cameras.Scene2D.Camera;
  groundY: number;
  playerX: () => number;
  spawnLarva: (x: number, y: number) => void;
  onDefeated: () => void;
}

// La Llave: masa de tentáculos que persigue al jugador desde la izquierda (modo A).
// Construida por partes en un Container y animada con tweens. Patrones y tiempos en bosses.json.
export class KeyBoss {
  readonly stats = bosses.key;
  hp = bosses.key.hp;
  private state: State = 'idle';
  private pattern: Pattern = 'tentacle';
  private timer = 1500;
  private offset = 0;
  private inPhase2 = false;
  private tentacleX = 0;
  private rng: RNG;
  private container: Phaser.GameObjects.Container;
  private flesh: Phaser.GameObjects.Rectangle;
  private eye: Phaser.GameObjects.Arc;
  private tentacles: Phaser.GameObjects.Rectangle[] = [];
  private marker: Phaser.GameObjects.Rectangle;
  private spike: Phaser.GameObjects.Rectangle;

  constructor(private scene: Phaser.Scene, seed: string, private hooks: KeyBossHooks) {
    this.rng = new RNG(`${seed}:boss`);
    this.flesh = scene.add.rectangle(0, 0, W, H, 0x3a2a4a);
    const spots = [[-20, -50], [10, 10], [-15, 60], [25, -20]].map(([x, y]) => scene.add.rectangle(x, y, 14, 10, 0x5a3a6a));
    const key = scene.add.rectangle(-W / 2 + 10, 0, 8, H - 20, 0xd0a030);
    this.eye = scene.add.circle(W / 2 - 22, -H / 2 + 40, 9, 0xe0e070);
    for (let i = 0; i < 3; i++) {
      const t = scene.add.rectangle(W / 2 - 4, -40 + i * 45, 44, 8, 0x4a3060).setOrigin(0, 0.5);
      scene.tweens.add({ targets: t, angle: { from: -25, to: 25 }, duration: 700 + i * 130, yoyo: true, repeat: -1 });
      this.tentacles.push(t);
    }
    this.container = scene.add.container(0, 0, [this.flesh, ...spots, key, this.eye, ...this.tentacles]).setDepth(5);

    this.marker = scene.add.rectangle(0, hooks.groundY - 2, 26, 4, 0xff3030).setVisible(false).setDepth(4);
    this.spike = scene.add.rectangle(0, 0, 14, 100, 0x5a2a6a).setOrigin(0.5, 0).setVisible(false).setDepth(4);
  }

  get maxHp(): number {
    return this.stats.hp;
  }

  get dead(): boolean {
    return this.state === 'dead';
  }

  private get phase() {
    return this.stats.phases[this.inPhase2 ? 1 : 0];
  }

  get scrollSpeed(): number {
    if (this.dead) return 0;
    return this.state === 'attack' && this.pattern === 'charge' ? this.stats.chargeSpeed : this.phase.scrollSpeed;
  }

  get right(): number {
    return this.container.x + W / 2;
  }

  get hurtbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.container.x - W / 2, this.container.y - H / 2, W, H);
  }

  get tentacleHitbox(): Phaser.Geom.Rectangle | null {
    return this.state === 'attack' && this.pattern === 'tentacle' ? this.spike.getBounds() : null;
  }

  update(dtMs: number) {
    if (this.dead) return;
    const view = this.hooks.camera.worldView;
    this.container.setPosition(view.x + VISIBLE - W / 2 + this.offset, this.hooks.groundY - H / 2 + 24);

    this.timer -= dtMs;
    if (this.timer > 0) return;
    if (this.state === 'idle') this.telegraph();
    else if (this.state === 'telegraph') this.attack();
    else if (this.state === 'attack') this.recover();
    else this.enter('idle', this.phase.idleMs);
  }

  hurt(damage: number) {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - damage);
    this.flesh.setFillStyle(0xffffff);
    this.scene.time.delayedCall(60, () => this.flesh.setFillStyle(this.inPhase2 ? 0x4a2a3a : 0x3a2a4a));
    if (!this.inPhase2 && this.hp <= this.maxHp * this.stats.phaseAt) {
      this.inPhase2 = true;
      this.hooks.camera.flash(250, 160, 60, 200);
    }
    if (this.hp <= 0) this.execute();
  }

  private enter(state: State, ms: number) {
    this.state = state;
    this.timer = ms;
  }

  // Telegraph (≥0.5 s): avisa qué viene antes de atacar
  private telegraph() {
    this.pattern = this.pickPattern();
    this.enter('telegraph', this.phase.telegraphMs);
    if (this.pattern === 'tentacle') {
      this.tentacleX = this.hooks.playerX();
      this.marker.setPosition(this.tentacleX, this.hooks.groundY - 2).setVisible(true);
      this.scene.tweens.add({ targets: this.marker, alpha: { from: 1, to: 0.2 }, duration: 120, yoyo: true, repeat: -1 });
    } else if (this.pattern === 'larvae') {
      this.eye.setFillStyle(0xff4040);
    } else {
      this.scene.tweens.add({ targets: this.flesh, x: { from: -3, to: 3 }, duration: 50, yoyo: true, repeat: -1 });
    }
  }

  private attack() {
    this.scene.tweens.killTweensOf([this.marker, this.flesh]);
    this.marker.setVisible(false).setAlpha(1);
    this.flesh.x = 0;
    this.eye.setFillStyle(0xe0e070);

    if (this.pattern === 'tentacle') {
      this.enter('attack', this.stats.tentacleMs);
      // Tentáculo que sale del suelo donde estaba la marca
      this.spike.setPosition(this.tentacleX, this.hooks.groundY + 20).setVisible(true);
      this.scene.tweens.add({ targets: this.spike, y: this.hooks.groundY - 90, duration: 120, ease: 'Back.easeOut' });
    } else if (this.pattern === 'larvae') {
      this.enter('attack', 300);
      for (let i = 0; i < this.phase.larvae; i++) {
        this.hooks.spawnLarva(this.right + 10 + i * 14, this.hooks.groundY - 20);
      }
    } else {
      // Embestida: acelera el scroll y avanza
      this.enter('attack', this.stats.chargeMs);
      this.scene.tweens.add({ targets: this, offset: LUNGE, duration: 300, ease: 'Quad.easeOut' });
    }
  }

  private recover() {
    this.spike.setVisible(false);
    this.scene.tweens.add({ targets: this, offset: 0, duration: 400 });
    this.enter('recover', this.stats.recoverMs);
  }

  private pickPattern(): Pattern {
    const entries = Object.entries(this.phase.patterns) as [Pattern, number][];
    let roll = this.rng.float() * entries.reduce((sum, [, w]) => sum + w, 0);
    for (const [pattern, weight] of entries) {
      roll -= weight;
      if (roll < 0) return pattern;
    }
    return entries[0][0];
  }

  // Ejecución: los tentáculos caen, el cuerpo parpadea y la esfera de La Llave se eleva
  private execute() {
    this.enter('dead', 0);
    this.scene.tweens.killTweensOf([this.marker, this.flesh, ...this.tentacles]);
    this.marker.setVisible(false);
    this.spike.setVisible(false);
    this.hooks.camera.shake(1200, 0.012);
    this.tentacles.forEach((t, i) =>
      this.scene.tweens.add({ targets: t, y: t.y + 160, angle: 90, alpha: 0, duration: 700, delay: i * 120 }),
    );
    this.scene.tweens.add({ targets: this.container, alpha: { from: 1, to: 0.3 }, duration: 90, yoyo: true, repeat: 8 });
    const orb = this.scene.add.circle(this.container.x, this.container.y, 10, 0xb0f0ff).setDepth(6);
    this.scene.tweens.add({ targets: orb, y: orb.y - 120, scale: 1.6, duration: 1400, ease: 'Sine.easeOut' });
    this.scene.time.delayedCall(1800, () => this.hooks.onDefeated());
  }
}
