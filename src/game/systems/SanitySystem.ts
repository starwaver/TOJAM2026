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

  static getSanityLoss(result: TaskResult): number {
    return BalanceConfig.baseSanityLoss + BalanceConfig.panicSanityLoss * (1 - result.timeRemainingRatio);
  }

  static applyTaskResult(state: GameStateData, result: TaskResult): void {
    state.sanity -= this.getSanityLoss(result);
    state.sanity = Phaser.Math.Clamp(state.sanity, 0, BalanceConfig.maxSanity);
  }

  static restore(state: GameStateData, amount: number): void {
    state.sanity = Phaser.Math.Clamp(state.sanity + amount, 0, BalanceConfig.maxSanity);
  }

  static isDepleted(state: GameStateData): boolean {
    return state.sanity <= 0;
  }
}
