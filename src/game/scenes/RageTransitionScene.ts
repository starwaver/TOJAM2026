import Phaser from 'phaser';
import { RageAssets } from '../assets/RageAssets';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { SceneKeys } from '../types/SceneKeys';

const TRANSITION_DURATION_MS = 5200;

export class RageTransitionScene extends Phaser.Scene {
  private art?: Phaser.GameObjects.Image;
  private shade?: Phaser.GameObjects.Rectangle;
  private pulse?: Phaser.GameObjects.Rectangle;
  private lineOne?: Phaser.GameObjects.Text;
  private lineTwo?: Phaser.GameObjects.Text;
  private impactText?: Phaser.GameObjects.Text;
  private instructionText?: Phaser.GameObjects.Text;
  private startButton?: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.rageTransition);
  }

  preload(): void {
    if (!this.textures.exists(RageAssets.transitionKey)) {
      this.load.image(RageAssets.transitionKey, RageAssets.transitionPath);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#060101');
    this.buildScene();
    this.playSequence();

    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  private buildScene(): void {
    this.art = this.add.image(0, 0, RageAssets.transitionKey).setOrigin(0.5).setAlpha(0).setDepth(0);
    this.shade = this.add.rectangle(0, 0, 1, 1, 0x080101, 0.62).setOrigin(0).setDepth(1);
    this.pulse = this.add.rectangle(0, 0, 1, 1, 0xff1d12, 0).setOrigin(0).setDepth(2);

    this.lineOne = this.createBeatText('The room goes quiet.', 0.2, 30);
    this.lineTwo = this.createBeatText('All the swallowed panic finally burns.', 0.28, 24);
    this.impactText = this.createBeatText('YOU HAVE HAD ENOUGH', 0.82, 42);
    this.instructionText = this.createBeatText(
      'Instruction: Punch to launch your boss into office furniture and rack up points before time runs out.',
      0.9,
      22,
    ).setAlpha(0);
    this.startButton = this.createStartButton();

    this.layout();
  }

  private createBeatText(text: string, yRatio: number, fontSize: number): Phaser.GameObjects.Text {
    return this.add
      .text(0, 0, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${fontSize}px`,
        fontStyle: '900',
        color: '#fff3dc',
        align: 'center',
        stroke: '#2b0301',
        strokeThickness: 8,
        fixedWidth: Math.min(this.scale.width * 0.86, 980),
        wordWrap: { width: Math.min(this.scale.width * 0.86, 980) },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(3)
      .setY(this.scale.height * yRatio);
  }

  private playSequence(): void {
    const art = this.art;
    const shade = this.shade;
    const lineOne = this.lineOne;
    const lineTwo = this.lineTwo;
    const impactText = this.impactText;

    if (!art || !shade || !this.pulse || !lineOne || !lineTwo || !impactText) {
      return;
    }

    this.tweens.add({
      targets: art,
      alpha: 1,
      duration: 700,
      ease: 'Cubic.easeOut',
    });

    this.tweens.add({
      targets: shade,
      alpha: 0.16,
      duration: 1800,
      ease: 'Sine.easeOut',
    });

    this.time.delayedCall(250, () => this.revealText(lineOne, 650, 1350));
    this.time.delayedCall(1550, () => this.revealText(lineTwo, 650, 1450));
    this.time.delayedCall(2880, () => {
      this.revealText(impactText, 180, 1100);
      this.cameras.main.shake(820, 0.018);
      this.flashPulse(0.34, 460);
    });

    this.time.delayedCall(3850, () => {
      this.cameras.main.shake(600, 0.025);
      this.flashPulse(0.48, 520);
      this.tweens.add({
        targets: art,
        scaleX: this.getCoverScale() * 1.09,
        scaleY: this.getCoverScale() * 1.09,
        duration: 900,
        ease: 'Expo.easeIn',
      });
    });

    this.time.delayedCall(TRANSITION_DURATION_MS - 520, () => {
      this.flashPulse(0.9, 520);
    });

    this.time.delayedCall(TRANSITION_DURATION_MS, () => {
      this.revealStartPrompt();
    });
  }

  private createStartButton(): Phaser.GameObjects.Text {
    const button = this.add
      .text(0, 0, 'Yeet your boss', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: '900',
        color: '#fff3dc',
        backgroundColor: '#7c0808',
        padding: { left: 26, right: 26, top: 14, bottom: 14 },
        stroke: '#2b0301',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(4)
      .setAlpha(0)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      SceneTransitionService.start(this, {
        kind: 'immediate',
        target: SceneKeys.bossFight,
      });
    });

    button.on('pointerover', () => button.setScale(1.04));
    button.on('pointerout', () => button.setScale(1));

    return button;
  }

  private revealStartPrompt(): void {
    if (!this.instructionText || !this.startButton) {
      return;
    }

    this.instructionText.setAlpha(0);
    this.startButton.setAlpha(0).setVisible(true);

    this.tweens.add({
      targets: [this.instructionText, this.startButton],
      alpha: 1,
      duration: 380,
      ease: 'Cubic.easeOut',
    });
  }

  private revealText(text: Phaser.GameObjects.Text, fadeInMs: number, holdMs: number): void {
    text.setAlpha(0).setScale(0.96);
    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1,
      duration: fadeInMs,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          y: text.y - 12,
          duration: 520,
          delay: holdMs,
          ease: 'Cubic.easeIn',
        });
      },
    });
  }

  private flashPulse(alpha: number, duration: number): void {
    if (!this.pulse) {
      return;
    }

    this.pulse.setAlpha(alpha);
    this.tweens.add({
      targets: this.pulse,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
    });
  }

  private layout(): void {
    const { width, height } = this.scale;
    const coverScale = this.getCoverScale();

    this.art?.setPosition(width / 2, height / 2).setScale(coverScale * 1.02);
    this.shade?.setSize(width, height);
    this.pulse?.setSize(width, height);

    const textWidth = Math.min(width * 0.86, 980);
    this.lineOne?.setPosition(width / 2, height * 0.2).setFixedSize(textWidth, 0).setWordWrapWidth(textWidth);
    this.lineTwo?.setPosition(width / 2, height * 0.28).setFixedSize(textWidth, 0).setWordWrapWidth(textWidth);
    this.impactText?.setPosition(width / 2, height * 0.82).setFixedSize(textWidth, 0).setWordWrapWidth(textWidth);
    this.instructionText?.setPosition(width / 2, height * 0.9).setFixedSize(textWidth, 0).setWordWrapWidth(textWidth);
    this.startButton?.setPosition(width / 2, height * 0.72);
  }

  private getCoverScale(): number {
    const texture = this.textures.get(RageAssets.transitionKey).getSourceImage() as HTMLImageElement;
    return Math.max(this.scale.width / texture.width, this.scale.height / texture.height);
  }

  private cleanup(): void {
    this.scale.off('resize', this.layout, this);
    this.art = undefined;
    this.shade = undefined;
    this.pulse = undefined;
    this.lineOne = undefined;
    this.lineTwo = undefined;
    this.impactText = undefined;
    this.instructionText = undefined;
    this.startButton = undefined;
  }
}
