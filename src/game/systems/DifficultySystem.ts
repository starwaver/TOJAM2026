import Phaser from 'phaser';
import { BalanceConfig } from '../config/BalanceConfig';

export class DifficultySystem {
  /**
   * Calculate difficulty based on total tasks attempted (completed + failed).
   * With difficultyStepTasks=1, each task increases difficulty by 1.
   */
  static getDifficulty(totalTasks: number): number {
    const level = 1 + Math.floor(totalTasks / BalanceConfig.difficultyStepTasks);
    return Phaser.Math.Clamp(level, 1, BalanceConfig.maxDifficulty);
  }
}
