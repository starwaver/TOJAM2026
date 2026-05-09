import Phaser from 'phaser';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { SceneKeys } from '../types/SceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#101820');
    SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.preload });
  }
}
