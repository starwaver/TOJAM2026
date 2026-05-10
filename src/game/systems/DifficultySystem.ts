import Phaser from 'phaser';
import { BalanceConfig } from '../config/BalanceConfig';

export class DifficultySystem {
  /**
   * Calculate difficulty from failed tasks only.
   * With difficultyStepTasks=3, difficulty increases after every 3 failures.
   */
  static getDifficulty(failedTasks: number): number {
    const level = 1 + Math.floor(failedTasks / BalanceConfig.difficultyStepTasks);
    return Phaser.Math.Clamp(level, 1, BalanceConfig.maxDifficulty);
  }
}
