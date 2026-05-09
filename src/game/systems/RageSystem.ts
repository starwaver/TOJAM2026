import Phaser from 'phaser';
import { BalanceConfig } from '../config/BalanceConfig';
import type { GameStateData } from '../core/GameState';
import type { TaskResult } from '../types/TaskTypes';

export class RageSystem {
  static applyTaskResult(state: GameStateData, result: TaskResult): void {
    const baseGain = result.success ? BalanceConfig.successRageGain : BalanceConfig.failRageGain;
    const lowSanityBonus = result.success ? 0 : (BalanceConfig.maxSanity - state.sanity) * BalanceConfig.lowSanityRageFactor;

    state.rage += baseGain + lowSanityBonus;
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
