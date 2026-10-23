import Phaser from 'phaser';
import bosses from '../../data/bosses.json';
import { RNG } from '../../systems/RNG';
import { BOSS_LOOKS, type BossLook } from './bossLooks';

export type BossId = keyof typeof bosses;
type Stats = (typeof bosses)[BossId];
type Pattern = 'tentacle' | 'larvae' | 'charge' | 'portal' | 'rain' | 'flood' | 'beam';
type State = 'idle' | 'telegraph' | 'attack' | 'recover' | 'dead';

// Cuánto asoma el jefe por el borde de la cámara, y cuánto avanza al embestir
const VISIBLE = 72;
const LUNGE = 70;
// Cambio de lado (El Guardián): aviso, y luego cruza la pantalla encogido y a ras de suelo
// para que se pueda esquivar con dash o con doble salto desde una plataforma
const SWITCH_WARN_MS = 600;
const SWITCH_MS = 900;
const SWITCH_SCALE = 0.5;

export interface BossHooks {
  camera: Phaser.Cameras.Scene2D.Camera;
  groundY: number;
  target: Phaser.GameObjects.Components.Transform;
  spawnEnemy: (key: 'larva' | 'deep_one', x: number, y: number) => void;
  fireShot: (x: number, y: number, angle: number, speed: number, gravity: number) => void;
  onDefeated: () => void;
}

// Jefe de persecución. Máquina de estados Idle → Telegraph → Attack → Recover con patrones elegidos por peso.
// Todo sale de bosses.json: fases (umbral de vida, modo A = te persigue desde la izquierda / B = huye por la
// derecha, velocidad del scroll y pesos de cada patrón). El aspecto lo pone bossLooks.ts.
export class Boss {
  readonly stats: Stats;
  hp: number;
  private state: State = 'idle';
  private pattern: Pattern = 'tentacle';
  private timer = 1500;
  private phaseIndex = 0;
  // 0 = pegado al borde izquierdo (modo A), 1 = al derecho (modo B)
  private side = 0;
  private offset = 0;
  // Cambiando de lado: no ataca y solo hace daño si toca al jugador
  switching = false;
  private aimX = 0;
  private beamY = 0;
  private rng: RNG;
  private look: BossLook;
  private marker: Phaser.GameObjects.Rectangle;
  private spike: Phaser.GameObjects.Rectangle;
  private flood: Phaser.GameObjects.Rectangle;
  private beam: Phaser.GameObjects.Rectangle;

  constructor(private scene: Phaser.Scene, id: BossId, seed: string, private hooks: BossHooks) {
    this.stats = bosses[id];
    this.hp = this.stats.hp;
    this.rng = new RNG(`${seed}:boss`);
    this.look = BOSS_LOOKS[this.stats.look](scene);
    this.look.container.setDepth(5);
    this.side = this.mode === 'B' ? 1 : 0;

    const g = hooks.groundY;
    this.marker = scene.add.rectangle(0, g - 2, 26, 4, 0xff3030).setVisible(false).setDepth(4);
    this.spike = scene.add.rectangle(0, 0, 14, 100, 0x5a2a6a).setOrigin(0.5, 0).setVisible(false).setDepth(4);
    // La marea crece desde el borde inferior de la vista
    this.flood = scene.add.rectangle(0, 0, 1, 1, 0x2a6a8a, 0.7).setOrigin(0, 1).setVisible(false).setDepth(7);
    this.beam = scene.add.rectangle(0, 0, 1, 1, 0xff60c0, 0.9).setOrigin(0, 0.5).setVisible(false).setDepth(7);
    if (id === 'guardian') scene.time.delayedCall(200, () => this.absorbSpheres());  }

  // Entrada de El Guardián: absorbe las esferas de La Llave y La Puerta
  private absorbSpheres() {
    const view = this.hooks.camera.worldView;
    [view.right - 40, view.centerX].forEach((x, i) => {
      const orb = this.scene.add.circle(x, view.y + 20, 10, i === 0 ? 0xd0a030 : 0x80e0d0).setDepth(6);
      this.scene.tweens.add({
        targets: orb,
        x: () => this.look.container.x,
        y: () => this.look.container.y,
        scale: 0.3,
        duration: 1200 + i * 300,
        ease: 'Sine.easeIn',
        onComplete: () => {
          orb.destroy();
          this.hooks.camera.flash(150, 200, 160, 255);
        },
      });
    });
  }

  get maxHp(): number {
    return this.stats.hp;
  }

  get dead(): boolean {
    return this.state === 'dead';
  }

  get mode(): 'A' | 'B' {
    return this.phase.mode as 'A' | 'B';
  }

  private get phase() {
    return this.stats.phases[this.phaseIndex];
  }

  get scrollSpeed(): number {
    if (this.dead) return 0;
    return this.state === 'attack' && this.pattern === 'charge' ? this.stats.chargeSpeed : this.phase.scrollSpeed;
  }

  get hurtbox(): Phaser.Geom.Rectangle {
    const c = this.look.container;
    const w = this.look.width * c.scale;
    const h = this.look.height * c.scale;
    return new Phaser.Geom.Rectangle(c.x - w / 2, c.y - h / 2, w, h);
  }

  // Borde del jefe por el que no puede pasar el jugador (derecho en modo A, izquierdo en modo B)
  get front(): number {
    const c = this.look.container;
    const halfW = (this.look.width * c.scale) / 2;
    return this.mode === 'A' ? c.x + halfW : c.x - halfW;
  }

  // Zonas que dañan al jugador ahora mismo
  get hazards(): Phaser.Geom.Rectangle[] {
    if (this.state !== 'attack') return [];
    if (this.pattern === 'tentacle') return [this.spike.getBounds()];
    if (this.pattern === 'flood') return [this.flood.getBounds()];
    if (this.pattern === 'beam') return [this.beam.getBounds()];
    return [];
  }

  update(dtMs: number) {
    if (this.dead) return;
    const view = this.hooks.camera.worldView;
    const c = this.look.container;
    const w = this.look.width * c.scale;
    const leftX = view.x + VISIBLE - w / 2 + this.offset;
    const rightX = view.right - VISIBLE + w / 2 - this.offset;
    // Siempre con la base a la misma altura, aunque esté encogido
    c.setPosition(leftX + (rightX - leftX) * this.side, this.hooks.groundY + 24 - (this.look.height * c.scale) / 2);
    this.flood.setPosition(view.x, view.bottom).setSize(view.width, this.flood.height);
    this.beam.setPosition(view.x, this.beamY).setSize(view.width, this.beam.height);
    if (this.switching) return;

    // Modo B: si el jugador se queda atrás, el jefe se cura
    if (this.mode === 'B' && this.hooks.target.x < view.x + 70) {
      this.hp = Math.min(this.maxHp, this.hp + (this.stats.lagHealPerSec * dtMs) / 1000);
    }

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
    this.look.flesh.setFillStyle(0xffffff);
    this.scene.time.delayedCall(60, () => this.look.flesh.setFillStyle(this.look.fleshColor));
    const next = this.stats.phaseAt[this.phaseIndex];
    if (!this.switching && next !== undefined && this.hp <= this.maxHp * next && this.hp > 0) this.nextPhase();
    if (this.hp <= 0) this.execute();
  }

  private nextPhase() {
    const prevMode = this.mode;
    this.phaseIndex++;
    this.hooks.camera.flash(250, 160, 60, 200);
    if (this.mode !== prevMode) this.switchSide();
  }

  // Aviso (tiembla con el ojo en rojo), se encoge, cruza la pantalla y vuelve a su tamaño
  private switchSide() {
    this.switching = true;
    this.cancelAttack();
    const { container, flesh, eye, eyeColor } = this.look;
    eye.setFillStyle(0xff4040);
    this.scene.tweens.add({ targets: flesh, x: { from: -4, to: 4 }, duration: 50, yoyo: true, repeat: SWITCH_WARN_MS / 100 });
    const tweens = this.scene.tweens;
    const finish = () => {
      if (this.dead) return;
      flesh.x = 0;
      eye.setFillStyle(eyeColor);
      this.switching = false;
      this.enter('idle', this.phase.idleMs);
    };
    tweens.add({ targets: container, scale: SWITCH_SCALE, delay: SWITCH_WARN_MS, duration: 150 });
    tweens.add({
      targets: this,
      side: this.mode === 'B' ? 1 : 0,
      delay: SWITCH_WARN_MS + 150,
      duration: SWITCH_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => tweens.add({ targets: container, scale: 1, duration: 200, onComplete: finish }),
    });
  }

  // Interrumpe el ataque en curso (al cambiar de lado)
  private cancelAttack() {
    this.scene.tweens.killTweensOf([this.marker, this.flood, this.beam, this.spike, this.look.flesh]);
    [this.marker, this.spike, this.flood, this.beam].forEach((s) => s.setVisible(false).setAlpha(1));
    this.offset = 0;
    this.enter('idle', Number.MAX_SAFE_INTEGER);
  }

  private enter(state: State, ms: number) {
    this.state = state;
    this.timer = ms;
  }

  // Telegraph (≥0.5 s): avisa qué viene antes de atacar
  private telegraph() {
    this.pattern = this.pickPattern();
    this.enter('telegraph', this.phase.telegraphMs);
    const view = this.hooks.camera.worldView;
    const g = this.hooks.groundY;
    const blink = (target: Phaser.GameObjects.Shape) =>
      this.scene.tweens.add({ targets: target, alpha: { from: 1, to: 0.2 }, duration: 120, yoyo: true, repeat: -1 });

    switch (this.pattern) {
      case 'tentacle':
        this.aimX = this.hooks.target.x;
        this.marker.setPosition(this.aimX, g - 2).setVisible(true);
        blink(this.marker);
        break;
      case 'flood':
        // La marea empieza a subir: franja fina parpadeando en el fondo
        this.flood.setSize(view.width, 8).setVisible(true);
        blink(this.flood);
        break;
      case 'beam':
        // Rayo bajo (saltarlo) o alto (quedarse en el suelo)
        this.beamY = this.rng.float() < 0.5 ? g - 10 : g - 46;
        this.beam.setSize(view.width, 2).setVisible(true);
        blink(this.beam);
        break;
      case 'charge':
        this.scene.tweens.add({ targets: this.look.flesh, x: { from: -3, to: 3 }, duration: 50, yoyo: true, repeat: -1 });
        break;
      default:
        this.look.eye.setFillStyle(0xff4040);
    }
  }

  private attack() {
    this.scene.tweens.killTweensOf([this.marker, this.flood, this.beam, this.look.flesh]);
    [this.marker, this.flood, this.beam].forEach((s) => s.setAlpha(1));
    this.marker.setVisible(false);
    this.look.flesh.x = 0;
    this.look.eye.setFillStyle(this.look.eyeColor);
    const g = this.hooks.groundY;
    const s = this.stats;
    // Hacia dónde mira el jefe (por dónde salen sus ataques)
    const dir = this.mode === 'A' ? 1 : -1;

    switch (this.pattern) {
      case 'tentacle':
        this.enter('attack', s.tentacleMs);
        this.spike.setPosition(this.aimX, g + 20).setVisible(true);
        this.scene.tweens.add({ targets: this.spike, y: g - 90, duration: 120, ease: 'Back.easeOut' });
        break;
      case 'larvae':
      case 'portal':
        this.enter('attack', 300);
        for (let i = 0; i < this.phase.spawnCount; i++) {
          this.hooks.spawnEnemy(this.pattern === 'larvae' ? 'larva' : 'deep_one', this.front + dir * (10 + i * 16), g - 20);
        }
        break;
      case 'charge':
        this.enter('attack', s.chargeMs);
        this.scene.tweens.add({ targets: this, offset: LUNGE, duration: 300, ease: 'Quad.easeOut' });
        break;
      case 'rain': {
        // Lluvia de proyectiles en arco hacia el lado del jugador
        this.enter('attack', 400);
        const { x, y } = this.look.container;
        for (let i = 0; i < s.rainShots; i++) {
          const angle = dir > 0 ? -Math.PI / 3 + i * 0.12 : -Math.PI * 2 / 3 - i * 0.12;
          this.hooks.fireShot(x, y - this.look.height / 2, angle, 170 + this.rng.float() * 140, 450);
        }
        break;
      }
      case 'flood':
        // Cubre hasta 40 px por encima del suelo: hay que subirse a una plataforma
        this.enter('attack', s.floodMs);
        this.flood.setSize(this.flood.width, this.hooks.camera.worldView.bottom - (g - 40));
        break;
      case 'beam':
        this.enter('attack', s.beamMs);
        this.beam.setSize(this.beam.width, 14);
        this.hooks.camera.shake(s.beamMs, 0.004);
        break;
    }
  }

  private recover() {
    this.spike.setVisible(false);
    this.flood.setVisible(false);
    this.beam.setVisible(false);
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

  // Ejecución: las partes caen, el cuerpo parpadea y su esfera se eleva
  private execute() {
    this.enter('dead', 0);
    const { container, flesh, limbs } = this.look;
    this.scene.tweens.killTweensOf([this.marker, this.flood, this.beam, flesh, ...limbs]);
    [this.marker, this.spike, this.flood, this.beam].forEach((s) => s.setVisible(false));
    this.hooks.camera.shake(1200, 0.012);
    limbs.forEach((t, i) =>
      this.scene.tweens.add({ targets: t, y: t.y + 160, angle: 90, alpha: 0, duration: 700, delay: i * 120 }),
    );
    this.scene.tweens.add({ targets: container, alpha: { from: 1, to: 0.3 }, duration: 90, yoyo: true, repeat: 8 });
    const orb = this.scene.add.circle(container.x, container.y, 10, 0xb0f0ff).setDepth(6);
    this.scene.tweens.add({ targets: orb, y: orb.y - 120, scale: 1.6, duration: 1400, ease: 'Sine.easeOut' });
    this.scene.time.delayedCall(1800, () => this.hooks.onDefeated());
  }
}
