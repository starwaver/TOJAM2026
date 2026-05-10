import Phaser from 'phaser';
import { OfficeAssets } from '../assets/OfficeAssets';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { SceneKeys } from '../types/SceneKeys';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.preload);
  }

  preload(): void {
    this.load.image(OfficeAssets.backgroundKey, OfficeAssets.backgroundPath);
    this.load.atlas(OfficeAssets.textureKey, OfficeAssets.spritesheetPath, OfficeAssets.atlasPath);
    this.load.json(OfficeAssets.metadataKey, OfficeAssets.metadataPath);
  }

  create(): void {
    SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.mainMenu });
  }
}
