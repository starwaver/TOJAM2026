import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { SceneKeys } from '../types/SceneKeys';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.results);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#101820');

    const lines = [
      'Results',
      `Score: ${GameState.data.score}`,
      `Completed: ${GameState.data.completedTasks}`,
      `Failed: ${GameState.data.failedTasks}`,
      `Final sanity: ${Math.round(GameState.data.sanity)}`,
      `Peak rage: ${Math.round(GameState.data.peakRage)}`,
    ];

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 72, lines.join('\n'), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#f8f5f0',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    this.createButton('Main Menu', this.scale.width / 2, this.scale.height / 2 + 128, () => {
      this.scene.start(SceneKeys.mainMenu);
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
