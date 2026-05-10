import Phaser from 'phaser';
import { MenuAssets } from '../assets/MenuAssets';
import { GameState } from '../core/GameState';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { taskDirector } from '../systems/TaskDirector';
import { workdayTaskQueue } from '../systems/WorkdayTaskQueue';
import { SceneKeys } from '../types/SceneKeys';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.mainMenu);
  }

  create(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#161820');
    this.drawBackdrop(width, height);

    const cover = this.add.image(centerX, Math.max(148, height * 0.34), MenuAssets.coverKey).setOrigin(0.5);
    const coverScale = Math.min(width * 0.74 / cover.width, height * 0.54 / cover.height, 0.48);
    cover.setScale(coverScale);

    this.add
      .text(centerX, Math.min(height - 174, cover.y + cover.displayHeight * 0.5 + 28), 'Clock in. Keep it together. Survive the shift.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${Math.max(16, Math.min(22, width * 0.022))}px`,
        fontStyle: '700',
        color: '#f8f5f0',
        align: 'center',
      })
      .setShadow(0, 3, '#000000', 8, false, true)
      .setOrigin(0.5);

    const startWorkday = (): void => {
      GameState.reset();
      taskDirector.reset();
      workdayTaskQueue.reset();
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.workday });
    };

    this.createStartButton(centerX, Math.min(height - 84, centerY + 248), Math.min(360, width - 48), startWorkday);

    this.add
      .text(centerX, height - 30, 'Press Enter to start', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#b6d9d5',
      })
      .setOrigin(0.5)
      .setAlpha(0.78);

    this.input.keyboard?.once('keydown-ENTER', startWorkday);
    this.input.keyboard?.once('keydown-SPACE', startWorkday);
  }

  private drawBackdrop(width: number, height: number): void {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x24252e, 0x24252e, 0x121820, 0x0e131b, 1);
    graphics.fillRect(0, 0, width, height);

    graphics.lineStyle(2, 0x2c3b46, 0.46);
    for (let x = -width; x < width * 2; x += 96) {
      graphics.lineBetween(x, height, width / 2 + (x - width / 2) * 0.18, height * 0.55);
    }

    graphics.lineStyle(2, 0x46535b, 0.22);
    for (let y = height * 0.58; y < height; y += 42) {
      graphics.lineBetween(0, y, width, y);
    }

    graphics.fillStyle(0xf2c14e, 0.12);
    graphics.fillRoundedRect(width * 0.12, height * 0.1, width * 0.76, height * 0.62, 32);
    graphics.lineStyle(3, 0xf2c14e, 0.28);
    graphics.strokeRoundedRect(width * 0.12, height * 0.1, width * 0.76, height * 0.62, 32);
  }

  private createStartButton(x: number, y: number, width: number, onClick: () => void): void {
    const height = 72;
    const button = this.add.container(x, y);
    const shadow = this.add.graphics();
    const bg = this.add.graphics();
    const play = this.add.triangle(-width / 2 + 44, 0, 0, -12, 0, 12, 18, 0, 0x101820);
    const text = this.add
      .text(20, 0, 'START WORKDAY', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${width < 320 ? 20 : 24}px`,
        fontStyle: '700',
        color: '#101820',
      })
      .setOrigin(0.5);
    const hitArea = this.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });

    const drawButton = (fill: number, rim: number): void => {
      shadow.clear();
      shadow.fillStyle(0x000000, 0.3);
      shadow.fillRoundedRect(-width / 2 + 6, -height / 2 + 10, width, height, 18);

      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
      bg.lineStyle(4, rim, 1);
      bg.strokeRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 16);
      bg.lineStyle(2, 0xffffff, 0.38);
      bg.lineBetween(-width / 2 + 24, -height / 2 + 14, width / 2 - 24, -height / 2 + 14);
    };

    drawButton(0xf2c14e, 0xffe08a);
    button.add([shadow, bg, play, text, hitArea]);

    hitArea.on('pointerdown', onClick);
    hitArea.on('pointerover', () => {
      drawButton(0xffd166, 0xfff1b8);
      this.tweens.add({ targets: button, scale: 1.04, duration: 120, ease: 'Sine.easeOut' });
    });
    hitArea.on('pointerout', () => {
      drawButton(0xf2c14e, 0xffe08a);
      this.tweens.add({ targets: button, scale: 1, duration: 150, ease: 'Sine.easeOut' });
    });
  }
}
