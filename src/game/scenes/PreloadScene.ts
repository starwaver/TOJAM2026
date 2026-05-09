import Phaser from 'phaser';
import { SceneKeys } from '../types/SceneKeys';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.preload);
  }

  create(): void {
    this.scene.start(SceneKeys.mainMenu);
  }
}
