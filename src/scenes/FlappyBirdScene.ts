import Phaser from 'phaser';

type PipePair = {
  top: Phaser.GameObjects.Rectangle;
  bottom: Phaser.GameObjects.Rectangle;
  scored: boolean;
};

const BIRD_RADIUS = 18;
const GRAVITY = 1450;
const FLAP_VELOCITY = -480;
const PIPE_WIDTH = 74;
const PIPE_GAP = 168;
const PIPE_SPACING = 285;
const PIPE_SPEED = 220;
const GROUND_HEIGHT = 68;

export class FlappyBirdScene extends Phaser.Scene {
  private bird?: Phaser.GameObjects.Container;
  private birdWing?: Phaser.GameObjects.Triangle;
  private pipes: PipePair[] = [];
  private pipeTimer = 0;
  private birdVelocity = 0;
  private score = 0;
  private hasStarted = false;
  private isGameOver = false;
  private idleBirdY = 0;
  private scoreText?: Phaser.GameObjects.Text;
  private promptText?: Phaser.GameObjects.Text;
  private ground?: Phaser.GameObjects.Rectangle;
  private homeButton?: Phaser.GameObjects.Container;

  constructor() {
    super('FlappyBirdScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#6fc8d7');

    this.pipes = [];
    this.pipeTimer = 0;
    this.birdVelocity = 0;
    this.score = 0;
    this.hasStarted = false;
    this.isGameOver = false;

    this.createBackdrop();
    this.createBird();
    this.createHud();
    this.createHomeButton();

    this.scale.on('resize', this.layout, this);
    this.input.on('pointerdown', this.flap, this);
    this.input.keyboard?.on('keydown-SPACE', this.flap, this);
    this.input.keyboard?.on('keydown-UP', this.flap, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.layout(this.scale.gameSize);
    this.spawnPipe();
  }

  update(time: number, delta: number) {
    const dt = Math.min(delta / 1000, 1 / 30);

    if (!this.bird) {
      return;
    }

    if (!this.isGameOver && !this.hasStarted) {
      this.bird.y = this.idleBirdY + Math.sin(time / 220) * 5;
      this.bird.rotation = Math.sin(time / 320) * 0.06;
      return;
    }

    if (!this.isGameOver) {
      this.birdVelocity += GRAVITY * dt;
      this.bird.y += this.birdVelocity * dt;
      this.bird.rotation = Phaser.Math.Clamp(this.birdVelocity / 780, -0.5, 0.75);

      this.pipeTimer += dt * 1000;
      if (this.pipeTimer >= PIPE_SPACING / PIPE_SPEED * 1000) {
        this.pipeTimer = 0;
        this.spawnPipe();
      }
    } else {
      this.bird.rotation = Phaser.Math.Linear(this.bird.rotation, 1.15, 0.08);
    }

    this.movePipes(dt);
    this.checkScore();
    this.checkCollision();
  }

  private createBackdrop() {
    const { width, height } = this.scale.gameSize;

    this.add.rectangle(0, 0, width, height, 0x6fc8d7).setOrigin(0);

    for (let i = 0; i < 7; i += 1) {
      const x = 70 + i * 165;
      const y = 70 + (i % 3) * 34;
      this.add.circle(x, y, 24, 0xe7fbff, 0.8);
      this.add.circle(x + 28, y + 4, 18, 0xe7fbff, 0.8);
      this.add.circle(x - 26, y + 8, 16, 0xe7fbff, 0.8);
    }

    for (let i = 0; i < 10; i += 1) {
      const buildingHeight = 52 + (i % 4) * 18;
      this.add
        .rectangle(i * 110, height - GROUND_HEIGHT - buildingHeight / 2, 74, buildingHeight, 0x4c8795, 0.35)
        .setOrigin(0, 0.5);
    }
  }

  private createBird() {
    const body = this.add.circle(0, 0, BIRD_RADIUS, 0xffd166);
    const wing = this.add.triangle(-6, 4, 0, 0, 20, 8, 0, 18, 0xf9a03f);
    const eye = this.add.circle(8, -7, 4, 0x101820);
    const beak = this.add.triangle(18, 0, 0, -6, 18, 0, 0, 6, 0xf25f5c);

    this.bird = this.add.container(0, 0, [body, wing, eye, beak]);
    this.birdWing = wing;
  }

  private createHud() {
    this.scoreText = this.add
      .text(0, 0, '0', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '44px',
        fontStyle: '700',
        color: '#101820',
        stroke: '#f8f5f0',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.promptText = this.add
      .text(0, 0, 'Click, tap, or press Space', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#f8f5f0',
        backgroundColor: '#10182099',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5);

    this.ground = this.add.rectangle(0, 0, 0, GROUND_HEIGHT, 0x266150).setOrigin(0, 0);
  }

  private createHomeButton() {
    const bg = this.add.rectangle(0, 0, 112, 40, 0x101820, 0.86).setStrokeStyle(2, 0xf8f5f0, 0.35);
    const label = this.add.text(0, 0, 'Home', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontStyle: '700',
      color: '#f8f5f0',
    });

    label.setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.scene.start('GameScene'));

    this.homeButton = this.add.container(0, 0, [bg, label]);
    this.homeButton.setDepth(10);
  }

  private layout(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    const playHeight = height - GROUND_HEIGHT;

    this.idleBirdY = playHeight * 0.45;
    this.bird?.setPosition(Math.max(120, width * 0.28), this.idleBirdY);
    this.scoreText?.setPosition(width / 2, 44);
    this.promptText?.setPosition(width / 2, height - GROUND_HEIGHT - 34);
    this.ground?.setPosition(0, height - GROUND_HEIGHT).setSize(width, GROUND_HEIGHT);
    this.homeButton?.setPosition(70, 42);

    for (const pipe of this.pipes) {
      this.sizePipePair(pipe);
    }
  }

  private flap() {
    if (!this.bird) {
      return;
    }

    if (this.isGameOver) {
      this.restartRun();
      return;
    }

    this.hasStarted = true;
    this.birdVelocity = FLAP_VELOCITY;
    this.birdWing?.setAngle(-24);
    this.tweens.add({
      targets: this.birdWing,
      angle: 0,
      duration: 140,
      ease: 'Sine.easeOut',
    });
    this.promptText?.setVisible(false);
  }

  private spawnPipe() {
    const { width, height } = this.scale.gameSize;
    const playHeight = height - GROUND_HEIGHT;
    const safeTop = 96;
    const safeBottom = Math.max(safeTop + 1, playHeight - 92);
    const gapY = Phaser.Math.Between(safeTop + PIPE_GAP / 2, safeBottom - PIPE_GAP / 2);

    const top = this.add.rectangle(width + PIPE_WIDTH, 0, PIPE_WIDTH, 100, 0x1f9d55).setOrigin(0.5, 0);
    const bottom = this.add.rectangle(width + PIPE_WIDTH, 0, PIPE_WIDTH, 100, 0x1f9d55).setOrigin(0.5, 0);
    top.setStrokeStyle(4, 0x13783d);
    bottom.setStrokeStyle(4, 0x13783d);

    const pipe = { top, bottom, scored: false };
    this.pipes.push(pipe);
    this.sizePipePair(pipe, gapY);
  }

  private sizePipePair(pipe: PipePair, gapY?: number) {
    const { height } = this.scale.gameSize;
    const playHeight = height - GROUND_HEIGHT;
    const currentGapCenter = gapY ?? pipe.top.displayHeight + PIPE_GAP / 2;
    const topHeight = Math.max(20, currentGapCenter - PIPE_GAP / 2);
    const bottomY = currentGapCenter + PIPE_GAP / 2;
    const bottomHeight = Math.max(20, playHeight - bottomY);

    pipe.top.setSize(PIPE_WIDTH, topHeight).setDisplaySize(PIPE_WIDTH, topHeight);
    pipe.bottom.setPosition(pipe.top.x, bottomY);
    pipe.bottom.setSize(PIPE_WIDTH, bottomHeight).setDisplaySize(PIPE_WIDTH, bottomHeight);
  }

  private movePipes(dt: number) {
    for (const pipe of this.pipes) {
      if (!this.isGameOver) {
        pipe.top.x -= PIPE_SPEED * dt;
        pipe.bottom.x = pipe.top.x;
      }
    }

    const firstPipe = this.pipes[0];
    if (firstPipe && firstPipe.top.x < -PIPE_WIDTH) {
      firstPipe.top.destroy();
      firstPipe.bottom.destroy();
      this.pipes.shift();
    }
  }

  private checkScore() {
    if (!this.bird) {
      return;
    }

    for (const pipe of this.pipes) {
      if (!pipe.scored && pipe.top.x + PIPE_WIDTH / 2 < this.bird.x) {
        pipe.scored = true;
        this.score += 1;
        this.scoreText?.setText(`${this.score}`);
      }
    }
  }

  private checkCollision() {
    if (!this.bird || this.isGameOver) {
      return;
    }

    const { height } = this.scale.gameSize;
    const birdBounds = new Phaser.Geom.Rectangle(
      this.bird.x - BIRD_RADIUS,
      this.bird.y - BIRD_RADIUS,
      BIRD_RADIUS * 2,
      BIRD_RADIUS * 2,
    );

    const hitWorld = this.bird.y - BIRD_RADIUS < 0 || this.bird.y + BIRD_RADIUS > height - GROUND_HEIGHT;
    const hitPipe = this.pipes.some((pipe) => {
      return (
        Phaser.Geom.Intersects.RectangleToRectangle(birdBounds, pipe.top.getBounds()) ||
        Phaser.Geom.Intersects.RectangleToRectangle(birdBounds, pipe.bottom.getBounds())
      );
    });

    if (hitWorld || hitPipe) {
      this.endRun();
    }
  }

  private endRun() {
    this.isGameOver = true;
    this.promptText
      ?.setText('Game over - click or press Space to retry')
      .setVisible(true)
      .setPosition(this.scale.width / 2, this.scale.height - GROUND_HEIGHT - 34);
  }

  private restartRun() {
    const { width, height } = this.scale.gameSize;
    const playHeight = height - GROUND_HEIGHT;

    for (const pipe of this.pipes) {
      pipe.top.destroy();
      pipe.bottom.destroy();
    }

    this.pipes = [];
    this.score = 0;
    this.pipeTimer = 0;
    this.birdVelocity = FLAP_VELOCITY;
    this.hasStarted = true;
    this.isGameOver = false;
    this.scoreText?.setText('0');
    this.promptText?.setVisible(false);
    this.bird?.setPosition(Math.max(120, width * 0.28), playHeight * 0.45).setRotation(0);
    this.spawnPipe();
  }

  private cleanup() {
    this.scale.off('resize', this.layout, this);
    this.input.off('pointerdown', this.flap, this);
    this.input.keyboard?.off('keydown-SPACE', this.flap, this);
    this.input.keyboard?.off('keydown-UP', this.flap, this);
  }
}
