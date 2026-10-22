import type Phaser from 'phaser';
import playerDefaults from '../data/player.json';

// Estado de la run en curso. Vive en el registry de Phaser, así sobrevive a los reinicios de escena.
export interface RunState {
  seed: string;
  levelIndex: number;
  coins: number;
  hp: number;
  maxHp: number;
  upgrades: string[];
  // Cargas de la mejora Escudo; se recargan al empezar cada nivel
  shield: number;
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function newRun(scene: Phaser.Scene, seed = randomSeed(), levelIndex = 1): RunState {
  const run: RunState = {
    seed,
    levelIndex,
    coins: 0,
    hp: playerDefaults.maxHp,
    maxHp: playerDefaults.maxHp,
    upgrades: [],
    shield: 0,
  };
  scene.registry.set('run', run);
  return run;
}

export function getRun(scene: Phaser.Scene): RunState {
  return (scene.registry.get('run') as RunState | undefined) ?? newRun(scene, urlParam('seed') ?? undefined);
}

export function stacks(run: RunState, upgrade: string): number {
  return run.upgrades.filter((u) => u === upgrade).length;
}

export function urlParam(name: string): string | null {
  return new URLSearchParams(location.search).get(name);
}

// ?seed, ?chunk o ?boss en la URL: entrar directo al juego (depuración)
export function isDebugUrl(): boolean {
  return ['seed', 'chunk', 'boss'].some((p) => new URLSearchParams(location.search).has(p));
}

// Herramientas de desarrollo (selector de tramos, F2/F3): en `npm run dev` o con ?dev
export function isDevMode(): boolean {
  return import.meta.env.DEV || new URLSearchParams(location.search).has('dev');
}
