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
    this.load.image(OfficeAssets.ceoTableIntactKey, OfficeAssets.ceoTableIntactPath);
    this.load.image(OfficeAssets.ceoTableBrokenKey, OfficeAssets.ceoTableBrokenPath);
    this.load.image(OfficeAssets.bossKey, OfficeAssets.bossPath);
  }

  create(): void {
    SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.mainMenu });
  }
}
