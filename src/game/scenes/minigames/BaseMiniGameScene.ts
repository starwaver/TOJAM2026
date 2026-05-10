import Phaser from 'phaser';
import { GameState } from '../../core/GameState';
import { EventBus } from '../../core/EventBus';
import { SceneTransitionService } from '../../core/SceneTransitionService';
import { GameEvents } from '../../types/GameEvents';
import { SceneKeys } from '../../types/SceneKeys';
import type { MiniGameSceneData, TaskConfig, TaskResult } from '../../types/TaskTypes';
import { WorkdayHUD } from '../../ui/WorkdayHUD';

export abstract class BaseMiniGameScene extends Phaser.Scene {
  protected mode: 'workday' | 'standalone' = 'standalone';
  protected taskConfig?: TaskConfig;
  private taskTimer?: Phaser.Time.TimerEvent;
  private hudRefreshTimer?: Phaser.Time.TimerEvent;
  private workdayHud?: WorkdayHUD;
  private completed = false;

  init(data: MiniGameSceneData = {}): void {
    this.mode = data.mode ?? 'standalone';
    this.taskConfig = data.taskConfig;
    this.completed = false;
  }

  protected prepareTaskHud(): void {
    if (!this.taskConfig) {
      return;
    }

    this.ensureWorkdayHud();
    this.refreshHud();
  }

  protected startTaskTimer(onExpired?: () => void): void {
    if (!this.taskConfig || this.taskTimer) {
      return;
    }

    this.ensureWorkdayHud();
    this.taskTimer = this.time.delayedCall(this.taskConfig.actualTimeLimit * 1000, () => {
      onExpired?.();

      if (!this.completed) {
        this.completeTask(false, 0, 1);
      }
    });

    if (this.mode === 'workday' && !this.hudRefreshTimer) {
      this.startHudRefresh();
    }
  }

  protected getTaskTimeRemaining(): number {
    if (!this.taskConfig) {
      return 0;
    }

    if (!this.taskTimer) {
      return this.taskConfig.actualTimeLimit;
    }

    return Math.max(0, this.taskTimer.getRemainingSeconds());
  }

  protected pauseTaskTimer(): void {
    if (!this.taskTimer) {
      return;
    }

    this.taskTimer.paused = true;
    this.refreshHud();
  }

  protected completeTask(success: boolean, score: number, mistakes = 0): void {
    if (!this.taskConfig || this.completed) {
      return;
    }

    this.completed = true;
    const timeRemaining = this.getTaskTimeRemaining();
    this.taskTimer?.remove();

    const result: TaskResult = {
      taskId: this.taskConfig.id,
      success,
      score,
      timeRemaining,
      timeLimit: this.taskConfig.actualTimeLimit,
      timeRemainingRatio: Phaser.Math.Clamp(timeRemaining / this.taskConfig.actualTimeLimit, 0, 1),
      mistakes,
    };

    this.events.emit(GameEvents.taskComplete, result);
    EventBus.emit(GameEvents.taskComplete, result);

    if (this.mode === 'workday') {
      SceneTransitionService.start(this, {
        kind: 'immediate',
        target: SceneKeys.workday,
        data: { taskResult: result },
      });
    }
  }

  protected cleanupMiniGame(): void {
    this.taskTimer?.remove();
    this.hudRefreshTimer?.remove();
    this.workdayHud?.destroy();
    this.taskTimer = undefined;
    this.hudRefreshTimer = undefined;
    this.workdayHud = undefined;
  }

  private refreshHud(): void {
    this.workdayHud?.update(GameState.data, this.getTaskTimeRemaining());
  }

  private ensureWorkdayHud(): void {
    if (this.mode !== 'workday' || !this.taskConfig || this.workdayHud) {
      return;
    }

    this.workdayHud = new WorkdayHUD(this.taskConfig);
    this.workdayHud.mount();
    this.startHudRefresh();
  }

  private startHudRefresh(): void {
    if (this.hudRefreshTimer) {
      return;
    }

    this.hudRefreshTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: this.refreshHud,
      callbackScope: this,
    });
  }
}
