import Phaser from 'phaser';
import { BalanceConfig } from '../config/BalanceConfig';
import { GameState } from '../core/GameState';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { RageSystem } from '../systems/RageSystem';
import { SanitySystem } from '../systems/SanitySystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { SceneKeys } from '../types/SceneKeys';

export class BossFightScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.bossFight);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2d1820');

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 52, 'Boss Fight', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        fontStyle: '700',
        color: '#f8f5f0',
      })
      .setOrigin(0.5);

    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Placeholder rage release', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#f2c14e',
      })
      .setOrigin(0.5);

    this.createButton('Return to Workday', this.scale.width / 2, this.scale.height / 2 + 72, () => {
      this.resolveBossFight();
    });
  }

  private resolveBossFight(): void {
    const state = GameState.data;

    RageSystem.reset(state);
    SanitySystem.restore(state, BalanceConfig.bossFightSanityRestore);
    ScoreSystem.applyBossFightScore(state, 0);
    GameState.clampVitals();

    SceneTransitionService.start(this, { kind: 'timed', target: SceneKeys.workday, durationMs: 200 });
  }

  private createButton(label: string, x: number, y: number, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 260, 56, 0xf2c14e).setInteractive({ useHandCursor: true });
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
