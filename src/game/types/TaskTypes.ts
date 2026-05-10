import type { SceneKey } from './SceneKeys';

export interface TaskDefinition {
  id: string;
  displayName: string;
  scene: SceneKey;
  baseTimeLimit: number;
  minDifficulty: number;
  maxDifficulty: number;
  difficultyTimeScale?: {
    minMultiplier: number;
    maxMultiplier: number;
  };
}

export interface TaskConfig {
  id: string;
  displayName: string;
  baseTimeLimit: number;
  actualTimeLimit: number;
  difficulty: number;
  sanityAtStart: number;
  rageAtStart: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  score: number;
  timeRemaining: number;
  timeLimit: number;
  timeRemainingRatio: number;
  mistakes: number;
}

export interface MiniGameSceneData {
  taskConfig?: TaskConfig;
  mode?: 'workday' | 'standalone';
}

export interface TaskIntroSceneData {
  taskConfig: TaskConfig;
  returnScene: SceneKey;
}

export interface WorkdaySceneData {
  taskResult?: TaskResult;
}
