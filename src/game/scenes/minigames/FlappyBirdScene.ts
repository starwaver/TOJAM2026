import Phaser from 'phaser';
import { DEFAULT_CONFIG, FlappyConfig } from '../../../config';
import { SceneKeys } from '../../types/SceneKeys';
import type { MiniGameSceneData } from '../../types/TaskTypes';
import { BaseMiniGameScene } from './BaseMiniGameScene';

type PipePair = {
  top: Phaser.GameObjects.Rectangle;
  bottom: Phaser.GameObjects.Rectangle;
  gapY: number;
  scored: boolean;
};

const BIRD_RADIUS = 18;
const PIPE_WIDTH = 74;
const GROUND_HEIGHT = 68;

export class FlappyBirdScene extends BaseMiniGameScene {
  private bird?: Phaser.GameObjects.Container;
  private birdWing?: Phaser.GameObjects.Triangle;
  private pipes: PipePair[] = [];
  private pipeTimer = 0;
  private birdVelocity = 0;
  private score = 0;
  private hasStarted = false;
  private isGameOver = false;
  private idleBirdY = 0;
  private ground?: Phaser.GameObjects.Rectangle;
  private hudRoot?: HTMLDivElement;
  private scoreValue?: HTMLDivElement;
  private promptValue?: HTMLDivElement;
  private cfg: FlappyConfig = { ...DEFAULT_CONFIG };
  private keyboardInputArmed = true;
  private pointerInputArmed = true;

  constructor() {
    super(SceneKeys.flappyBird);
  }

  init(data: (MiniGameSceneData & { config?: FlappyConfig }) = {}) {
    super.init(data);

    if (data.config) {
      this.cfg = { ...DEFAULT_CONFIG, ...data.config };
    } else {
      this.cfg = { ...DEFAULT_CONFIG };
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#6fc8d7');

    this.pipes = [];
    this.pipeTimer = 0;
    this.birdVelocity = 0;
    this.score = 0;
    this.hasStarted = false;
    this.isGameOver = false;
    this.keyboardInputArmed = this.mode === 'standalone';
    this.pointerInputArmed = this.mode === 'standalone';

    this.createBackdrop();
    this.createBird();
    this.createGround();
    this.createHtmlUi();

    this.scale.on('resize', this.layout, this);
    this.input.on('pointerdown', this.flapFromPointer, this);
    this.input.keyboard?.on('keydown-SPACE', this.flapFromKeyboard, this);
    this.input.keyboard?.on('keydown-UP', this.flapFromKeyboard, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.layout(this.scale.gameSize);
    this.spawnPipe();

    if (this.mode === 'workday') {
      this.prepareTaskHud();
      this.time.delayedCall(300, () => {
        this.keyboardInputArmed = true;
      });
      this.time.delayedCall(1000, () => {
        this.pointerInputArmed = true;
      });
    }
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
      this.birdVelocity += this.cfg.gravity * dt;
      this.bird.y += this.birdVelocity * dt;
      this.bird.rotation = Phaser.Math.Clamp(this.birdVelocity / 780, -0.5, 0.75);

      this.pipeTimer += dt * 1000;
      if (this.pipeTimer >= this.cfg.pipeSpacing / this.cfg.pipeSpeed * 1000) {
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

  private createGround() {
    this.ground = this.add.rectangle(0, 0, 0, GROUND_HEIGHT, 0x266150).setOrigin(0, 0);
  }

  private createHtmlUi() {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app) {
      return;
    }

    const root = document.createElement('div');
    root.setAttribute('aria-label', 'Flappy Bird demo controls');
    root.style.position = 'absolute';
    root.style.inset = '0';
    root.style.pointerEvents = 'none';
    root.style.fontFamily = 'Arial, sans-serif';
    root.style.color = '#f8f5f0';
    root.style.userSelect = 'none';

    const topBar = document.createElement('div');
    topBar.style.position = 'absolute';
    topBar.style.left = '14px';
    topBar.style.right = '14px';
    topBar.style.top = '14px';
    topBar.style.display = 'grid';
    topBar.style.gridTemplateColumns = 'auto 1fr auto';
    topBar.style.alignItems = 'start';
    topBar.style.gap = '16px';
    topBar.style.pointerEvents = 'none';

    const homeButton = document.createElement('button');
    homeButton.type = 'button';
    homeButton.textContent = 'Home';
    this.applyButtonStyle(homeButton);
    homeButton.addEventListener('click', () => this.scene.start(SceneKeys.mainMenu));

    const score = document.createElement('div');
    score.textContent = '0';
    score.style.justifySelf = 'center';
    score.style.fontSize = '46px';
    score.style.fontWeight = '800';
    score.style.lineHeight = '1';
    score.style.color = '#101820';
    score.style.textShadow = '0 2px 0 #f8f5f0, 2px 0 0 #f8f5f0, -2px 0 0 #f8f5f0, 0 -2px 0 #f8f5f0';

    const panel = document.createElement('section');
    panel.style.width = 'min(280px, calc(100vw - 28px))';
    panel.style.padding = '12px';
    panel.style.border = '1px solid rgba(248, 245, 240, 0.3)';
    panel.style.background = 'rgba(16, 24, 32, 0.86)';
    panel.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.22)';
    panel.style.pointerEvents = 'auto';

    const panelTitle = document.createElement('div');
    panelTitle.textContent = 'Tuning';
    panelTitle.style.fontSize = '14px';
    panelTitle.style.fontWeight = '800';
    panelTitle.style.marginBottom = '8px';
    panel.append(panelTitle);

    const sliderDefs: {
      key: keyof FlappyConfig;
      label: string;
      min: number;
      max: number;
      step: number;
    }[] = [
      { key: 'gravity', label: 'Gravity', min: 400, max: 3000, step: 50 },
      { key: 'flapVelocity', label: 'Flap', min: 200, max: 900, step: 10 },
      { key: 'pipeGap', label: 'Gap', min: 80, max: 300, step: 5 },
      { key: 'pipeSpeed', label: 'Speed', min: 80, max: 500, step: 10 },
      { key: 'pipeSpacing', label: 'Spacing', min: 150, max: 500, step: 5 },
    ];

    for (const def of sliderDefs) {
      panel.append(this.createSlider(def));
    }

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.textContent = 'Restart';
    this.applyButtonStyle(resetButton);
    resetButton.style.width = '100%';
    resetButton.style.marginTop = '10px';
    resetButton.addEventListener('click', () => this.restartRun());
    panel.append(resetButton);

    const prompt = document.createElement('div');
    prompt.textContent = 'Click, tap, or press Space';
    prompt.style.position = 'absolute';
    prompt.style.left = '50%';
    prompt.style.bottom = `${GROUND_HEIGHT + 18}px`;
    prompt.style.transform = 'translateX(-50%)';
    prompt.style.maxWidth = 'calc(100vw - 32px)';
    prompt.style.padding = '8px 14px';
    prompt.style.background = 'rgba(16, 24, 32, 0.72)';
    prompt.style.fontSize = '18px';
    prompt.style.fontWeight = '700';
    prompt.style.textAlign = 'center';
    prompt.style.pointerEvents = 'none';

    topBar.append(homeButton, score, panel);
    root.append(topBar, prompt);

    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    root.addEventListener('click', (event) => event.stopPropagation());
    root.addEventListener('keydown', (event) => event.stopPropagation());

    app.append(root);
    this.hudRoot = root;
    this.scoreValue = score;
    this.promptValue = prompt;
  }

  private createSlider(def: {
    key: keyof FlappyConfig;
    label: string;
    min: number;
    max: number;
    step: number;
  }) {
    const row = document.createElement('label');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr auto';
    row.style.gap = '6px 10px';
    row.style.alignItems = 'center';
    row.style.marginTop = '8px';
    row.style.fontSize = '13px';
    row.style.color = '#d6ede8';

    const label = document.createElement('span');
    label.textContent = def.label;

    const value = document.createElement('output');
    value.textContent = `${this.cfg[def.key]}`;
    value.style.fontWeight = '800';
    value.style.color = '#f8f5f0';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = `${def.min}`;
    input.max = `${def.max}`;
    input.step = `${def.step}`;
    input.value = `${this.cfg[def.key]}`;
    input.style.gridColumn = '1 / -1';
    input.style.width = '100%';
    input.addEventListener('input', () => {
      const nextValue = Number(input.value);
      this.cfg[def.key] = nextValue;
      value.textContent = `${nextValue}`;
      this.resizeExistingPipes();
    });

    row.append(label, value, input);
    return row;
  }

  private applyButtonStyle(button: HTMLButtonElement) {
    button.style.minHeight = '40px';
    button.style.padding = '0 16px';
    button.style.border = '1px solid rgba(248, 245, 240, 0.36)';
    button.style.background = 'rgba(16, 24, 32, 0.88)';
    button.style.color = '#f8f5f0';
    button.style.font = '700 15px Arial, sans-serif';
    button.style.cursor = 'pointer';
    button.style.pointerEvents = 'auto';
  }

  private layout(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    const playHeight = height - GROUND_HEIGHT;

    this.idleBirdY = playHeight * 0.45;
    this.bird?.setPosition(Math.max(120, width * 0.28), this.idleBirdY);
    this.ground?.setPosition(0, height - GROUND_HEIGHT).setSize(width, GROUND_HEIGHT);

    this.resizeExistingPipes();
  }

  private flapFromKeyboard() {
    if (!this.keyboardInputArmed) {
      return;
    }

    this.flap();
  }

  private flapFromPointer() {
    if (!this.pointerInputArmed) {
      return;
    }

    this.flap();
  }

  private flap() {
    if (!this.bird) {
      return;
    }

    if (this.isGameOver) {
      this.restartRun();
      return;
    }

    if (this.mode === 'workday' && !this.hasStarted) {
      this.startTaskTimer();
    }

    this.hasStarted = true;
    this.birdVelocity = -this.cfg.flapVelocity;
    this.birdWing?.setAngle(-24);
    this.tweens.add({
      targets: this.birdWing,
      angle: 0,
      duration: 140,
      ease: 'Sine.easeOut',
    });
    this.setPromptVisible(false);
  }

  private spawnPipe() {
    const { width, height } = this.scale.gameSize;
    const playHeight = height - GROUND_HEIGHT;
    const safeTop = 96;
    const safeBottom = Math.max(safeTop + 1, playHeight - 92);
    const gapY = Phaser.Math.Between(safeTop + this.cfg.pipeGap / 2, safeBottom - this.cfg.pipeGap / 2);

    const top = this.add.rectangle(width + PIPE_WIDTH, 0, PIPE_WIDTH, 100, 0x1f9d55).setOrigin(0.5, 0);
    const bottom = this.add.rectangle(width + PIPE_WIDTH, 0, PIPE_WIDTH, 100, 0x1f9d55).setOrigin(0.5, 0);
    top.setStrokeStyle(4, 0x13783d);
    bottom.setStrokeStyle(4, 0x13783d);

    const pipe = { top, bottom, gapY, scored: false };
    this.pipes.push(pipe);
    this.sizePipePair(pipe);
  }

  private sizePipePair(pipe: PipePair) {
    const { height } = this.scale.gameSize;
    const playHeight = height - GROUND_HEIGHT;
    const topHeight = Math.max(20, pipe.gapY - this.cfg.pipeGap / 2);
    const bottomY = pipe.gapY + this.cfg.pipeGap / 2;
    const bottomHeight = Math.max(20, playHeight - bottomY);

    pipe.top.setSize(PIPE_WIDTH, topHeight).setDisplaySize(PIPE_WIDTH, topHeight);
    pipe.bottom.setPosition(pipe.top.x, bottomY);
    pipe.bottom.setSize(PIPE_WIDTH, bottomHeight).setDisplaySize(PIPE_WIDTH, bottomHeight);
  }

  private resizeExistingPipes() {
    for (const pipe of this.pipes) {
      this.sizePipePair(pipe);
    }
  }

  private movePipes(dt: number) {
    for (const pipe of this.pipes) {
      if (!this.isGameOver) {
        pipe.top.x -= this.cfg.pipeSpeed * dt;
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
        this.updateScore();

        if (this.mode === 'workday') {
          this.completeTask(true, this.score * 100 + Math.round(this.getTaskTimeRemaining() * 10));
        }
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
    if (this.mode === 'workday') {
      this.completeTask(false, this.score * 25, 1);
      return;
    }

    this.isGameOver = true;
    this.setPromptText('Game over - click or press Space to retry');
    this.setPromptVisible(true);
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
    this.birdVelocity = -this.cfg.flapVelocity;
    this.hasStarted = true;
    this.isGameOver = false;
    this.updateScore();
    this.setPromptVisible(false);
    this.bird?.setPosition(Math.max(120, width * 0.28), playHeight * 0.45).setRotation(0);
    this.spawnPipe();
  }

  private updateScore() {
    if (this.scoreValue) {
      this.scoreValue.textContent = `${this.score}`;
    }
  }

  private setPromptText(text: string) {
    if (this.promptValue) {
      this.promptValue.textContent = text;
    }
  }

  private setPromptVisible(visible: boolean) {
    if (this.promptValue) {
      this.promptValue.style.display = visible ? 'block' : 'none';
    }
  }

  private cleanup() {
    this.scale.off('resize', this.layout, this);
    this.input.off('pointerdown', this.flapFromPointer, this);
    this.input.keyboard?.off('keydown-SPACE', this.flapFromKeyboard, this);
    this.input.keyboard?.off('keydown-UP', this.flapFromKeyboard, this);
    this.cleanupMiniGame();
    this.hudRoot?.remove();
    this.hudRoot = undefined;
    this.scoreValue = undefined;
    this.promptValue = undefined;
  }
}
