import Phaser from 'phaser';
import { BalanceConfig } from '../config/BalanceConfig';
import { GameState } from '../core/GameState';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { DifficultySystem } from '../systems/DifficultySystem';
import { RageSystem } from '../systems/RageSystem';
import { SanitySystem } from '../systems/SanitySystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { TaskRegistry } from '../data/TaskRegistry';
import { SceneKeys } from '../types/SceneKeys';
import type { TaskConfig, TaskDefinition, TaskResult, WorkdaySceneData } from '../types/TaskTypes';

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
    state.difficultyLevel = DifficultySystem.getDifficulty(state.completedTasks + state.failedTasks);
    GameState.setCurrentTask(null);
    GameState.clampVitals();
  }

  private routeNext(): void {
    const state = GameState.data;

    if (RageSystem.isFull(state)) {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.bossFight });
      return;
    }

    if (SanitySystem.isDepleted(state)) {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.gameOver });
      return;
    }

    if (state.dayProgress >= BalanceConfig.dayCompleteProgress) {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.results });
      return;
    }

    this.showTaskSelection();
  }

  private showTaskSelection(): void {
    const state = GameState.data;
    const difficulty = DifficultySystem.getDifficulty(state.completedTasks + state.failedTasks);
    const cx = this.scale.width / 2;

    this.add
      .text(cx, 52, "BOSS'S TASKS", {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        fontStyle: '700',
        color: '#f2c14e',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 88, `Day Progress: ${Math.round(state.dayProgress)}%`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#9ed8db',
      })
      .setOrigin(0.5);

    const meterWidth = 220;
    const meterHeight = 18;
    const meterX = cx - meterWidth / 2;

    const sanityY = 138;
    this.createMeter(
      `Sanity: ${Math.round(state.sanity)}/${BalanceConfig.maxSanity}`,
      state.sanity,
      BalanceConfig.maxSanity,
      meterX,
      sanityY,
      meterWidth,
      meterHeight,
      0x4ecdc4,
      '#4ecdc4',
    );

    const rageY = sanityY + 56;
    this.createMeter(
      `Rage: ${Math.round(state.rage)}/${BalanceConfig.maxRage}`,
      state.rage,
      BalanceConfig.maxRage,
      meterX,
      rageY,
      meterWidth,
      meterHeight,
      0xe74c3c,
      '#e74c3c',
    );

    const eligibleTasks = TaskRegistry.filter(
      (task) => difficulty >= task.minDifficulty && difficulty <= task.maxDifficulty,
    );

    const startY = rageY + 74;
    const buttonSpacing = 72;

    if (eligibleTasks.length === 0) {
      this.add
        .text(cx, startY, 'No tasks available!', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#f8f5f0',
        })
        .setOrigin(0.5);
      return;
    }

    eligibleTasks.forEach((task, index) => {
      const y = startY + index * buttonSpacing;
      this.createTaskButton(task, cx, y, difficulty);
    });
  }

  private createMeter(
    label: string,
    value: number,
    maxValue: number,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number,
    labelColor: string,
  ): void {
    this.add.text(x, y - 32, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: '700',
      color: labelColor,
    });

    this.add.rectangle(x, y, width, height, 0x2a3a4a).setOrigin(0, 0.5);
    const fillWidth = Phaser.Math.Clamp(value / maxValue, 0, 1) * width;
    this.add.rectangle(x, y, fillWidth, height, fillColor).setOrigin(0, 0.5);
  }

  private createTaskButton(task: TaskDefinition, x: number, y: number, difficulty: number): void {
    const state = GameState.data;
    const buttonWidth = 320;
    const buttonHeight = 58;

    const bg = this.add
      .rectangle(x, y, buttonWidth, buttonHeight, 0x2a3a4a)
      .setStrokeStyle(2, 0xf2c14e)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(x, y - 10, task.displayName, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: '700',
        color: '#f8f5f0',
      })
      .setOrigin(0.5);

    const timeLimit = SanitySystem.getActualTimeLimit(task.baseTimeLimit, state.sanity);
    const subLabel = this.add
      .text(x, y + 14, `Time: ${timeLimit.toFixed(1)}s  |  Difficulty: ${difficulty}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#9ed8db',
      })
      .setOrigin(0.5);

    this.add.container(0, 0, [bg, label, subLabel]);

    bg.on('pointerdown', () => {
      this.selectTask(task, difficulty);
    });
    bg.on('pointerover', () => bg.setFillStyle(0x3a4a5a));
    bg.on('pointerout', () => bg.setFillStyle(0x2a3a4a));
  }

  private selectTask(task: TaskDefinition, difficulty: number): void {
    const state = GameState.data;
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
