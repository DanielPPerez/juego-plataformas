import { describe, expect, it } from 'vitest';
import upgrades from '../src/data/upgrades.json';
import type { RunState } from '../src/systems/Run';
import { applyUpgrade, damageMultiplier, rollUpgrades } from '../src/systems/Upgrades';

const run = (ids: string[] = [], character: RunState['character'] = 'knight'): RunState => ({
  seed: 's', character, levelIndex: 1, coins: 0, hp: 5, maxHp: 5, upgrades: ids, shield: 0,
});
const byId = (id: string) => upgrades.find((u) => u.id === id)!;

describe('Upgrades', () => {
  it('ofrece 3 mejoras distintas y siempre las mismas para la misma seed', () => {
    const a = rollUpgrades(run(), 'x');
    expect(new Set(a.map((u) => u.id)).size).toBe(3);
    expect(rollUpgrades(run(), 'x')).toEqual(a);
  });

  it('no ofrece mejoras no acumulables que ya tienes', () => {
    const owned = upgrades.filter((u) => !u.stackable).map((u) => u.id);
    for (let i = 0; i < 50; i++) {
      rollUpgrades(run(owned), `s${i}`).forEach((u) => expect(u.stackable).toBe(true));
    }
  });

  it('Vitalidad sube el máximo y cura 1', () => {
    const r = { ...run(), hp: 3 };
    applyUpgrade(r, byId('vitality'));
    expect([r.maxHp, r.hp]).toEqual([6, 4]);
  });

  it('Filo y Sangre maldita multiplican el daño', () => {
    expect(damageMultiplier(run(['edge', 'edge']), 5)).toBeCloseTo(1.4);
    expect(damageMultiplier(run(['cursed_blood']), 1)).toBe(1.5);
    expect(damageMultiplier(run(['cursed_blood']), 2)).toBe(1);
  });
});
