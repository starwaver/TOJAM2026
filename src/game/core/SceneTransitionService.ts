import Phaser from 'phaser';
import type { SceneTransitionIntent } from '../types/TransitionTypes';

export class SceneTransitionService {
  static start(scene: Phaser.Scene, intent: SceneTransitionIntent): void {
    switch (intent.kind) {
      case 'immediate':
        scene.scene.start(intent.target, intent.data ?? {});
        break;

      case 'timed':
        scene.time.delayedCall(intent.durationMs, () => {
          scene.scene.start(intent.target, intent.data ?? {});
        });
        break;

      case 'video':
        scene.scene.start(intent.target, {
          ...(typeof intent.data === 'object' && intent.data !== null ? intent.data : {}),
          transitionVideoKey: intent.videoKey,
        });
        break;
    }
  }
}
