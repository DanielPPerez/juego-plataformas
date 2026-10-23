import Phaser from 'phaser';

// Aspecto de cada jefe, montado por partes en un Container (más barato que animar frame a frame)
export interface BossLook {
  container: Phaser.GameObjects.Container;
  // Parte que destella al recibir daño
  flesh: Phaser.GameObjects.Shape;
  fleshColor: number;
  // Parte que brilla durante los avisos
  eye: Phaser.GameObjects.Shape;
  eyeColor: number;
  // Partes que caen en la ejecución
  limbs: Phaser.GameObjects.Shape[];
  width: number;
  height: number;
}

type Builder = (scene: Phaser.Scene) => BossLook;

const wiggle = (scene: Phaser.Scene, targets: Phaser.GameObjects.Shape[]) =>
  targets.forEach((t, i) =>
    scene.tweens.add({ targets: t, angle: { from: -25, to: 25 }, duration: 700 + i * 130, yoyo: true, repeat: -1 }),
  );

// La Llave: masa de tentáculos con una llave rúnica como espina dorsal
const key: Builder = (scene) => {
  const W = 96;
  const H = 190;
  const flesh = scene.add.rectangle(0, 0, W, H, 0x3a2a4a);
  const spots = [[-20, -50], [10, 10], [-15, 60], [25, -20]].map(([x, y]) => scene.add.rectangle(x, y, 14, 10, 0x5a3a6a));
  const spine = scene.add.rectangle(-W / 2 + 10, 0, 8, H - 20, 0xd0a030);
  const eye = scene.add.circle(W / 2 - 22, -H / 2 + 40, 9, 0xe0e070);
  const limbs = [0, 1, 2].map((i) => scene.add.rectangle(W / 2 - 4, -40 + i * 45, 44, 8, 0x4a3060).setOrigin(0, 0.5));
  wiggle(scene, limbs);
  const container = scene.add.container(0, 0, [flesh, ...spots, spine, eye, ...limbs]);
  return { container, flesh, fleshColor: 0x3a2a4a, eye, eyeColor: 0xe0e070, limbs, width: W, height: H };
};

// La Puerta: arco de piedra viviente sobre un barco-ruina
const gate: Builder = (scene) => {
  const W = 110;
  const H = 200;
  const flesh = scene.add.rectangle(0, 10, 70, 150, 0x2a1040);
  scene.tweens.add({ targets: flesh, alpha: { from: 1, to: 0.6 }, duration: 900, yoyo: true, repeat: -1 });
  const pillars = [-45, 45].map((x) => scene.add.rectangle(x, 10, 20, 160, 0x6a6a72));
  const lintel = scene.add.rectangle(0, -H / 2 + 22, W, 24, 0x7a7a82);
  const hull = scene.add.rectangle(0, H / 2 - 12, W + 20, 24, 0x4a3020);
  const eye = scene.add.circle(0, -H / 2 + 22, 7, 0x80e0d0);
  const limbs = [-30, 0, 30].map((x) => scene.add.rectangle(x, H / 2 + 4, 10, 30, 0x2a5a50).setOrigin(0.5, 0));
  wiggle(scene, limbs);
  const container = scene.add.container(0, 0, [flesh, ...pillars, lintel, hull, eye, ...limbs]);
  return { container, flesh, fleshColor: 0x2a1040, eye, eyeColor: 0x80e0d0, limbs, width: W, height: H };
};

// El Guardián: conglomerado de esferas iridiscentes
const guardian: Builder = (scene) => {
  const W = 140;
  const H = 200;
  const colors = [0x6040c0, 0x40a0c0, 0xc04090, 0x50c080, 0xc0a040, 0x8050e0];
  const flesh = scene.add.circle(0, 0, 46, 0x3a2a5a);
  const limbs = colors.map((c, i) => {
    const a = (i / colors.length) * Math.PI * 2;
    const orb = scene.add.circle(Math.cos(a) * 52, Math.sin(a) * 70, 16 + (i % 3) * 6, c, 0.9);
    scene.tweens.add({ targets: orb, scale: { from: 0.85, to: 1.15 }, duration: 600 + i * 90, yoyo: true, repeat: -1 });
    return orb;
  });
  const eye = scene.add.circle(0, 0, 12, 0xf0f0ff);
  const container = scene.add.container(0, 0, [...limbs, flesh, eye]);
  return { container, flesh, fleshColor: 0x3a2a5a, eye, eyeColor: 0xf0f0ff, limbs, width: W, height: H };
};

export const BOSS_LOOKS: Record<string, Builder> = { key, gate, guardian };
