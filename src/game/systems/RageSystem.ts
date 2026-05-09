import Phaser from 'phaser';
import { BalanceConfig } from '../config/BalanceConfig';
import type { GameStateData } from '../core/GameState';
import type { TaskResult } from '../types/TaskTypes';

export class RageSystem {
  /** Rage gain on failure: base + per-difficulty-level scaling. */
  static getFailRageGain(difficulty: number): number {
    return BalanceConfig.failRageBaseGain + BalanceConfig.failRagePerDifficulty * difficulty;
  }

  static applyTaskResult(state: GameStateData, result: TaskResult): void {
    if (result.success) {
      // No rage gain on success
      return;
    }

    // Rage on failure scales with current difficulty
    const rageGain = this.getFailRageGain(state.difficultyLevel);
    const lowSanityBonus = (BalanceConfig.maxSanity - state.sanity) * BalanceConfig.lowSanityRageFactor;

    state.rage += rageGain + lowSanityBonus;
    state.rage = Phaser.Math.Clamp(state.rage, 0, BalanceConfig.maxRage);
    state.peakRage = Math.max(state.peakRage, state.rage);
  }

  static isFull(state: GameStateData): boolean {
    return state.rage >= BalanceConfig.maxRage;
  }

  static reset(state: GameStateData): void {
    state.rage = 0;
  }
}
