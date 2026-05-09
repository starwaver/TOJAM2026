import Phaser from 'phaser';
import { BalanceConfig } from '../config/BalanceConfig';
import type { GameStateData } from '../core/GameState';
import type { TaskResult } from '../types/TaskTypes';

export class SanitySystem {
  static getTimeMultiplier(sanity: number): number {
    const ratio = Phaser.Math.Clamp(sanity / BalanceConfig.maxSanity, 0, 1);
    return BalanceConfig.minTimeMultiplier + (BalanceConfig.maxTimeMultiplier - BalanceConfig.minTimeMultiplier) * ratio;
  }

  static getActualTimeLimit(baseTimeLimit: number, sanity: number): number {
    return baseTimeLimit * this.getTimeMultiplier(sanity);
  }

  /** Sanity loss on success: scales with time remaining (more time left = less panic = less loss). */
  static getSuccessSanityLoss(result: TaskResult): number {
    return BalanceConfig.baseSanityLoss + BalanceConfig.panicSanityLoss * (1 - result.timeRemainingRatio);
  }

  /** Sanity loss on failure: large flat penalty regardless of time. */
  static getFailSanityLoss(): number {
    return BalanceConfig.failSanityLoss;
  }

  static applyTaskResult(state: GameStateData, result: TaskResult): void {
    if (result.success) {
      state.sanity -= this.getSuccessSanityLoss(result);
    } else {
      state.sanity -= this.getFailSanityLoss();
    }
    state.sanity = Phaser.Math.Clamp(state.sanity, 0, BalanceConfig.maxSanity);
  }

  static restore(state: GameStateData, amount: number): void {
    state.sanity = Phaser.Math.Clamp(state.sanity + amount, 0, BalanceConfig.maxSanity);
  }

  static isDepleted(state: GameStateData): boolean {
    return state.sanity <= 0;
  }
}
