import Phaser from 'phaser';
import { SceneKeys } from '../types/SceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#101820');
    this.scene.start(SceneKeys.preload);
  }
}
