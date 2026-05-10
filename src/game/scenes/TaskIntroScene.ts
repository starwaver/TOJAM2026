import Phaser from 'phaser';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { SceneKeys } from '../types/SceneKeys';
import type { SceneKey } from '../types/SceneKeys';
import type { TaskConfig, TaskIntroSceneData } from '../types/TaskTypes';

export class TaskIntroScene extends Phaser.Scene {
  private taskConfig?: TaskConfig;
  private returnScene: SceneKey = SceneKeys.workday;

  constructor() {
    super(SceneKeys.taskIntro);
  }

  init(data: TaskIntroSceneData): void {
    this.taskConfig = data.taskConfig;
    this.returnScene = data.returnScene;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#18242d');

    if (!this.taskConfig) {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.workday });
      return;
    }

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 34, this.taskConfig.displayName, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: '700',
        color: '#f8f5f0',
      })
      .setOrigin(0.5);

    const remainingSeconds = this.taskConfig.deadlineAtMs
      ? Math.max(0, (this.taskConfig.deadlineAtMs - Date.now()) / 1000)
      : this.taskConfig.actualTimeLimit;

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 18, `Time: ${remainingSeconds.toFixed(1)}s`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#9ed8db',
      })
      .setOrigin(0.5);

    SceneTransitionService.start(this, {
      kind: 'timed',
      target: this.returnScene,
      durationMs: 700,
      data: {
        mode: 'workday',
        taskConfig: this.taskConfig,
      },
    });
  }
}
