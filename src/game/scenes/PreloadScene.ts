import Phaser from 'phaser';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { SceneKeys } from '../types/SceneKeys';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.preload);
  }

  create(): void {
    SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.mainMenu });
  }
}
