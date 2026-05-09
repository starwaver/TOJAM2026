import { BalanceConfig } from '../config/BalanceConfig';

export interface GameStateData {
  sanity: number;
  rage: number;
  dayProgress: number;
  completedTasks: number;
  failedTasks: number;
  currentTaskId: string | null;
  difficultyLevel: number;
  score: number;
  peakRage: number;
}

const initialState = (): GameStateData => ({
  sanity: BalanceConfig.maxSanity,
  rage: 0,
  dayProgress: 0,
  completedTasks: 0,
  failedTasks: 0,
  currentTaskId: null,
  difficultyLevel: 1,
  score: 0,
  peakRage: 0,
});

class GameStateStore {
  private state: GameStateData = initialState();

  get data(): GameStateData {
    return this.state;
  }

  reset(): void {
    this.state = initialState();
  }

  setCurrentTask(taskId: string | null): void {
    this.state.currentTaskId = taskId;
  }

  clampVitals(): void {
    this.state.sanity = Phaser.Math.Clamp(this.state.sanity, 0, BalanceConfig.maxSanity);
    this.state.rage = Phaser.Math.Clamp(this.state.rage, 0, BalanceConfig.maxRage);
    this.state.peakRage = Math.max(this.state.peakRage, this.state.rage);
  }
}

export const GameState = new GameStateStore();
