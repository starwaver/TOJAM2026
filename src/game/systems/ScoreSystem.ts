import type { GameStateData } from '../core/GameState';
import type { TaskResult } from '../types/TaskTypes';

export class ScoreSystem {
  static applyTaskResult(state: GameStateData, result: TaskResult): void {
    state.score += result.score;

    if (result.success) {
      state.completedTasks += 1;
    } else {
      state.failedTasks += 1;
    }
  }

  static applyBossFightScore(state: GameStateData, score: number): void {
    state.score += score;
  }
}
