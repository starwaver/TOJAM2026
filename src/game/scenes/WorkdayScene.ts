import Phaser from 'phaser';
import { BalanceConfig } from '../config/BalanceConfig';
import { GameState } from '../core/GameState';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { DifficultySystem } from '../systems/DifficultySystem';
import { RageSystem } from '../systems/RageSystem';
import { SanitySystem } from '../systems/SanitySystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { taskDirector } from '../systems/TaskDirector';
import { SceneKeys } from '../types/SceneKeys';
import type { TaskConfig, TaskResult, WorkdaySceneData } from '../types/TaskTypes';

export class WorkdayScene extends Phaser.Scene {
  private taskResult?: TaskResult;

  constructor() {
    super(SceneKeys.workday);
  }

  init(data: WorkdaySceneData = {}): void {
    this.taskResult = data.taskResult;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#18242d');

    if (this.taskResult) {
      this.applyTaskResult(this.taskResult);
      this.taskResult = undefined;
    }

    this.routeNext();
  }

  private applyTaskResult(result: TaskResult): void {
    const state = GameState.data;

    ScoreSystem.applyTaskResult(state, result);
    SanitySystem.applyTaskResult(state, result);
    RageSystem.applyTaskResult(state, result);

    state.dayProgress = Phaser.Math.Clamp(
      state.dayProgress + BalanceConfig.dayProgressPerTask,
      0,
      BalanceConfig.dayCompleteProgress,
    );
    state.difficultyLevel = DifficultySystem.getDifficulty(state.completedTasks);
    GameState.setCurrentTask(null);
    GameState.clampVitals();
  }

  private routeNext(): void {
    const state = GameState.data;

    if (SanitySystem.isDepleted(state)) {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.gameOver });
      return;
    }

    if (RageSystem.isFull(state)) {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.bossFight });
      return;
    }

    if (state.dayProgress >= BalanceConfig.dayCompleteProgress) {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.results });
      return;
    }

    this.startNextTask();
  }

  private startNextTask(): void {
    const state = GameState.data;
    const difficulty = DifficultySystem.getDifficulty(state.completedTasks);
    const task = taskDirector.getNextTask(difficulty);
    const taskConfig: TaskConfig = {
      id: task.id,
      displayName: task.displayName,
      baseTimeLimit: task.baseTimeLimit,
      actualTimeLimit: SanitySystem.getActualTimeLimit(task.baseTimeLimit, state.sanity),
      difficulty,
      sanityAtStart: state.sanity,
      rageAtStart: state.rage,
    };

    state.difficultyLevel = difficulty;
    GameState.setCurrentTask(task.id);

    SceneTransitionService.start(this, {
      kind: 'immediate',
      target: SceneKeys.taskIntro,
      data: {
        taskConfig,
        returnScene: task.scene,
      },
    });
  }
}
