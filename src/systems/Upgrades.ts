import upgrades from '../data/upgrades.json';
import { RNG } from './RNG';
import { stacks, type RunState } from './Run';

export type Upgrade = (typeof upgrades)[number];

// 3 mejoras distintas al azar (determinista por seed); no salen las no acumulables que ya tienes
export function rollUpgrades(run: RunState, seed: string): Upgrade[] {
  const rng = new RNG(seed);
  const pool = upgrades.filter((u) => u.stackable || stacks(run, u.id) === 0);
  const choices: Upgrade[] = [];
  while (choices.length < 3 && pool.length > 0) {
    choices.push(pool.splice(Math.floor(rng.float() * pool.length), 1)[0]);
  }
  return choices;
}

export function applyUpgrade(run: RunState, upgrade: Upgrade) {
  run.upgrades.push(upgrade.id);
  if (upgrade.id === 'vitality') {
    run.maxHp++;
    run.hp = Math.min(run.maxHp, run.hp + 1);
  }
  if (upgrade.id === 'shield') run.shield++;
}

export function specialCooldownMs(run: RunState, base: number): number {
  return base * 0.75 ** stacks(run, 'arcane_seal');
}

export function damageMultiplier(run: RunState, hp: number): number {
  const curse = stacks(run, 'cursed_blood') > 0 && hp === 1 ? 1.5 : 1;
  return (1 + 0.2 * stacks(run, 'edge')) * curse;
}
