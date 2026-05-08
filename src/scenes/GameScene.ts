import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private title?: Phaser.GameObjects.Text;
  private subtitle?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#101820');

    this.title = this.add
      .text(0, 0, 'Vite + Phaser 4', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '48px',
        color: '#f8f5f0',
      })
      .setOrigin(0.5);

    this.subtitle = this.add
      .text(0, 0, 'TOJAM 2026 starter scene', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#9ed8db',
      })
      .setOrigin(0.5);

    this.scale.on('resize', this.layout, this);
    this.layout(this.scale.gameSize);
  }

  private layout(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;

    this.title?.setPosition(width / 2, height / 2 - 24);
    this.subtitle?.setPosition(width / 2, height / 2 + 36);
  }
}
