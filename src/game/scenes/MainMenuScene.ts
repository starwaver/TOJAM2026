import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { taskDirector } from '../systems/TaskDirector';
import { SceneKeys } from '../types/SceneKeys';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.mainMenu);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#101820');

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 132, 'TOJAM 2026', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '54px',
        fontStyle: '700',
        color: '#f8f5f0',
      })
      .setOrigin(0.5);

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 62, 'Workday architecture shell', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#9ed8db',
      })
      .setOrigin(0.5);

    this.createButton('Start Workday', this.scale.width / 2, this.scale.height / 2 + 18, () => {
      GameState.reset();
      taskDirector.reset();
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.workday });
    });

    this.createButton('Flappy Demo', this.scale.width / 2, this.scale.height / 2 + 92, () => {
      SceneTransitionService.start(this, {
        kind: 'immediate',
        target: SceneKeys.flappyBird,
        data: { mode: 'standalone' },
      });
    });

    this.createButton('Slide Deck Disaster', this.scale.width / 2, this.scale.height / 2 + 166, () => {
      SceneTransitionService.start(this, {
        kind: 'immediate',
        target: SceneKeys.slideDeckDisaster,
        data: { mode: 'standalone' },
      });
    });

    this.createButton('Boss Fight Demo', this.scale.width / 2, this.scale.height / 2 + 240, () => {
      GameState.reset();
      taskDirector.reset();
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.bossFight });
    });
  }

  private createButton(label: string, x: number, y: number, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 250, 56, 0xf2c14e).setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: '700',
        color: '#101820',
      })
      .setOrigin(0.5);

    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => bg.setFillStyle(0xffd166));
    bg.on('pointerout', () => bg.setFillStyle(0xf2c14e));
    this.add.container(0, 0, [bg, text]);
  }
}
