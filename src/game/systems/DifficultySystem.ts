import { BalanceConfig } from '../config/BalanceConfig';

export class DifficultySystem {
  static getDifficulty(completedTasks: number): number {
    const level = 1 + Math.floor(completedTasks / BalanceConfig.difficultyStepTasks);
    return Phaser.Math.Clamp(level, 1, BalanceConfig.maxDifficulty);
  }
}
