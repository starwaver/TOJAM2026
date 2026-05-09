import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { SceneKeys } from '../types/SceneKeys';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.gameOver);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#101820');

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 72, 'Game Over', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '48px',
        fontStyle: '700',
        color: '#f8f5f0',
      })
      .setOrigin(0.5);

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 12, `Score: ${GameState.data.score}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#d6ede8',
      })
      .setOrigin(0.5);

    this.createButton('Main Menu', this.scale.width / 2, this.scale.height / 2 + 56, () => {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.mainMenu });
    });
  }

  private createButton(label: string, x: number, y: number, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 220, 56, 0xf2c14e).setInteractive({ useHandCursor: true });
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
