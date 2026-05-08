import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private title?: Phaser.GameObjects.Text;
  private subtitle?: Phaser.GameObjects.Text;
  private button?: Phaser.GameObjects.Container;
  private buttonBg?: Phaser.GameObjects.Rectangle;
  private footer?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#101820');

    this.title = this.add
      .text(0, 0, 'TOJAM 2026', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '54px',
        fontStyle: '700',
        color: '#f8f5f0',
      })
      .setOrigin(0.5);

    this.subtitle = this.add
      .text(0, 0, 'Starter project smoke test', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#9ed8db',
      })
      .setOrigin(0.5);

    this.createFlappyButton();

    this.footer = this.add
      .text(0, 0, 'Phaser is running. Mini demo scene is one click away.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#d6ede8',
      })
      .setOrigin(0.5);

    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
    });
    this.layout(this.scale.gameSize);
  }

  private createFlappyButton() {
    const bg = this.add.rectangle(0, 0, 270, 64, 0xf2c14e).setStrokeStyle(3, 0xf8f5f0, 0.5);
    const label = this.add.text(0, 0, 'Play Flappy Demo', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fontStyle: '700',
      color: '#101820',
    });

    label.setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0xffd166));
    bg.on('pointerout', () => bg.setFillStyle(0xf2c14e));
    bg.on('pointerdown', () => this.scene.start('FlappyBirdScene'));

    this.buttonBg = bg;
    this.button = this.add.container(0, 0, [bg, label]);
  }

  private layout(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;

    this.title?.setPosition(width / 2, height / 2 - 112);
    this.subtitle?.setPosition(width / 2, height / 2 - 42);
    this.button?.setPosition(width / 2, height / 2 + 42);
    this.buttonBg?.setSize(Math.min(270, width - 48), 64);
    this.footer?.setPosition(width / 2, height - 44);
  }
}
