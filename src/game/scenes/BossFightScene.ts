import Phaser from 'phaser';
import { OfficeAssets } from '../assets/OfficeAssets';
import { BalanceConfig } from '../config/BalanceConfig';
import { GameState } from '../core/GameState';
import { SceneTransitionService } from '../core/SceneTransitionService';
import {
  BOSS_FIGHT_BREAKABLES,
  BOSS_FIGHT_DECORATIONS,
  type BreakableItemConfig,
} from '../data/BossFightOfficeData';
import { RageSystem } from '../systems/RageSystem';
import { SanitySystem } from '../systems/SanitySystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { workdayTaskQueue } from '../systems/WorkdayTaskQueue';
import { SceneKeys } from '../types/SceneKeys';

type ParticleKind = 'coin' | 'debris' | 'paper' | 'hit';

interface CircleBody {
  x: number;
  y: number;
  r: number;
}


interface PlayerState extends CircleBody {
  speed: number;
  facingX: number;
  facingY: number;
}

interface BossState extends CircleBody {
  vx: number;
  vy: number;
  scaredSpeed: number;
  stun: number;
  spin: number;
  hurt: number;
  wallHitCooldown: number;
  launchedTimer: number;
  launchedByPlayer: boolean;
}

interface BreakableItemState {
  config: BreakableItemConfig;
  sprite: Phaser.GameObjects.Image;
  broken: boolean;
  respawnTimer: number;
  boundsX: number;
  boundsY: number;
  boundsW: number;
  boundsH: number;
}

interface RankDefinition {
  letter: string;
  title: string;
  threshold: number;
}

interface StyleState {
  score: number;
  rankIndex: number;
  timer: number;
  hits: number;
  multiplier: number;
  multiplierTimer: number;
  superPunchTimer: number;
  rankPop: number;
  beamBurst: number;
  rankWobble: number;
}

interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  radius: number;
  kind: ParticleKind;
}

interface FloatingTextState {
  label: Phaser.GameObjects.Text;
  vy: number;
  life: number;
  maxLife: number;
}

interface TouchState {
  moveId: number | null;
  aimId: number | null;
  moveActive: boolean;
  aimActive: boolean;
  joyStartX: number;
  joyStartY: number;
  joyX: number;
  joyY: number;
  moveX: number;
  moveY: number;
}

const PLAY_WIDTH = 960;
const PLAY_HEIGHT = 600;
const GAME_DURATION = 20;
const HEADER_HEIGHT = 55;

const OFFICE_BG_WIDTH = 1448;
const OFFICE_BG_HEIGHT = 1086;
const OFFICE_SCALE = Math.min(PLAY_WIDTH / OFFICE_BG_WIDTH, PLAY_HEIGHT / OFFICE_BG_HEIGHT);
const OFFICE_OFFSET_X = (PLAY_WIDTH - OFFICE_BG_WIDTH * OFFICE_SCALE) / 2;
const OFFICE_OFFSET_Y = (PLAY_HEIGHT - OFFICE_BG_HEIGHT * OFFICE_SCALE) / 2;

const ranks: RankDefinition[] = [
  { letter: 'D', title: 'DULL', threshold: 0 },
  { letter: 'C', title: 'CLEAN', threshold: 1440 },
  { letter: 'B', title: 'BOLD', threshold: 3360 },
  { letter: 'A', title: 'ANGRY', threshold: 6080 },
  { letter: 'S', title: 'SAVAGE', threshold: 9920 },
  { letter: 'SS', title: 'SUPER', threshold: 14400 },
  { letter: 'SSS', title: 'JACKPOT REVENGE', threshold: 20000 },
];

export class BossFightScene extends Phaser.Scene {
  private root?: Phaser.GameObjects.Container;
  private graphics?: Phaser.GameObjects.Graphics;
  private resultOverlay?: Phaser.GameObjects.Container;
  private rankLetter?: Phaser.GameObjects.Text;
  private rankTitle?: Phaser.GameObjects.Text;
  private styleBar?: Phaser.GameObjects.Rectangle;
  private styleBack?: Phaser.GameObjects.Rectangle;
  private timerBar?: Phaser.GameObjects.Rectangle;
  private timerBack?: Phaser.GameObjects.Rectangle;
  private comboText?: Phaser.GameObjects.Text;
  private timeText?: Phaser.GameObjects.Text;
  private itemsText?: Phaser.GameObjects.Text;
  private chargeText?: Phaser.GameObjects.Text;
  private bigRankText?: Phaser.GameObjects.Text;
  private bigRankTitle?: Phaser.GameObjects.Text;
  private styleTimerSlash?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private bossImage?: Phaser.GameObjects.Image;
  private countdownText?: Phaser.GameObjects.Text;
  private startOverlay?: Phaser.GameObjects.Container;
  private breakableItems: BreakableItemState[] = [];
  private player: PlayerState = this.createInitialPlayer();
  private boss: BossState = this.createInitialBoss();
  private styleState: StyleState = this.createInitialStyle();
  private touch: TouchState = this.createInitialTouch();
  private particles: ParticleState[] = [];
  private floatingTexts: FloatingTextState[] = [];
  private keys = new Set<string>();
  private mouseX = PLAY_WIDTH / 2;
  private mouseY = PLAY_HEIGHT / 2;
  private mouseDown = false;
  private chargeStart = 0;
  private playScale = 1;
  private playX = 0;
  private playY = 0;
  private shake = 0;
  private flash = 0;
  private hitPause = 0;
  private combo = 0;
  private comboTimer = 0;
  private isComplete = false;
  private hasResolvedState = false;
  private finalTimer = 0;
  private payoutFlash = 0;
  private timeLeft = GAME_DURATION;
  private totalBreaks = 0;
  private countdownNumber: string | number | null = null;
  private countdownPulse = 0;
  private countdownFlash = 0;
  private lastCountdownMark: number | null = null;
  private isAwaitingStart = true;

  constructor() {
    super(SceneKeys.bossFight);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#15151c');
    this.resetRun();
    this.createDisplay();
    this.bindInput();
    this.layout();

    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 1 / 30);
    this.updateSimulation(dt);
    this.drawOverlay();
    this.updateArenaText();
    this.updateHud();
  }

  /* ── reset ──────────────────────────────────────────────────── */

  private resetRun(): void {
    this.player = this.createInitialPlayer();
    this.boss = this.createInitialBoss();
    this.styleState = this.createInitialStyle();
    this.touch = this.createInitialTouch();
    this.particles = [];
    this.floatingTexts.forEach((t) => t.label.destroy());
    this.floatingTexts = [];
    this.keys.clear();
    this.mouseX = PLAY_WIDTH / 2;
    this.mouseY = PLAY_HEIGHT / 2;
    this.mouseDown = false;
    this.chargeStart = 0;
    this.shake = 0;
    this.flash = 0;
    this.hitPause = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.isComplete = false;
    this.hasResolvedState = false;
    this.finalTimer = 0;
    this.payoutFlash = 0;
    this.timeLeft = GAME_DURATION;
    this.totalBreaks = 0;
    this.countdownNumber = null;
    this.countdownPulse = 0;
    this.countdownFlash = 0;
    this.lastCountdownMark = null;
    this.isAwaitingStart = true;

    for (const item of this.breakableItems) {
      item.broken = false;
      item.respawnTimer = 0;
      if (item.config.useAtlas) {
        item.sprite.setTexture(OfficeAssets.textureKey, item.config.normalFrame);
      } else {
        item.sprite.setTexture(item.config.normalFrame);
      }
      this.computeItemBounds(item);
    }
  }

  /* ── display creation ───────────────────────────────────────── */

  private createDisplay(): void {
    this.root = this.add.container(0, 0);

    this.createOfficeBackground();
    this.createDecorations();
    this.createBreakableSprites();

    this.graphics = this.add.graphics();
    this.graphics.setDepth(200);
    this.root.add(this.graphics);

    this.createArenaText();
    this.createHud();
    this.createBigRankDisplay();
    this.createResultOverlay();
    this.createStartOverlay();
  }

  private createOfficeBackground(): void {
    if (!this.root) return;

    const bg = this.add
      .image(OFFICE_OFFSET_X, OFFICE_OFFSET_Y, OfficeAssets.backgroundKey)
      .setOrigin(0)
      .setScale(OFFICE_SCALE)
      .setDepth(0);

    this.root.add(bg);
  }

  private createDecorations(): void {
    if (!this.root) return;

    for (const config of BOSS_FIGHT_DECORATIONS) {
      const playX = config.officeX * OFFICE_SCALE + OFFICE_OFFSET_X;
      const playY = config.officeY * OFFICE_SCALE + OFFICE_OFFSET_Y;
      const totalScale = config.officeScale * OFFICE_SCALE;

      const sprite = this.add
        .image(playX, playY, OfficeAssets.textureKey, config.frame)
        .setOrigin(0.5, 1)
        .setScale(totalScale)
        .setDepth(10 + Math.floor(playY * 0.15))
        .setFlipX(Boolean(config.flipX));

      this.root.add(sprite);
    }
  }

  private createBreakableSprites(): void {
    if (!this.root) return;

    this.breakableItems = BOSS_FIGHT_BREAKABLES.map((config) => {
      const playX = config.officeX * OFFICE_SCALE + OFFICE_OFFSET_X;
      const playY = config.officeY * OFFICE_SCALE + OFFICE_OFFSET_Y;
      const totalScale = config.officeScale * OFFICE_SCALE;

      const textureKey = config.useAtlas ? OfficeAssets.textureKey : config.normalFrame;
      const frameName = config.useAtlas ? config.normalFrame : undefined;

      const sprite = this.add
        .image(playX, playY, textureKey, frameName)
        .setOrigin(0.5, 1)
        .setScale(totalScale)
        .setDepth(100 + Math.floor(playY * 0.15))
        .setFlipX(Boolean(config.flipX));

      this.root?.add(sprite);

      const item: BreakableItemState = {
        config,
        sprite,
        broken: false,
        respawnTimer: 0,
        boundsX: 0,
        boundsY: 0,
        boundsW: 0,
        boundsH: 0,
      };

      this.computeItemBounds(item);
      return item;
    });
  }

  private computeItemBounds(item: BreakableItemState): void {
    const dw = item.sprite.width * item.sprite.scaleX;
    const dh = item.sprite.height * item.sprite.scaleY;
    item.boundsX = item.sprite.x - dw / 2;
    item.boundsY = item.sprite.y - dh;
    item.boundsW = dw;
    item.boundsH = dh;
  }

  private createArenaText(): void {
    if (!this.root) return;

    this.titleText = this.addText(24, 82, 'RAGE ROOM', 22, '#f3e6c4')
      .setFontStyle('700')
      .setOrigin(0, 0.5);
    this.root.add(this.titleText);

    const bossDiameter = this.boss.r * 2;
    this.bossImage = this.add
      .image(this.boss.x, this.boss.y, OfficeAssets.bossKey)
      .setOrigin(0.5)
      .setDisplaySize(bossDiameter, bossDiameter)
      .setDepth(150);
    this.root.add(this.bossImage);

    this.countdownText = this.addText(PLAY_WIDTH / 2, 88, '', 58, '#fff2a8')
      .setFontStyle('900')
      .setOrigin(0.5)
      .setStroke('#000000', 7)
      .setVisible(false);
    this.root.add(this.countdownText);
  }

  private createHud(): void {
    if (!this.root) return;

    this.rankLetter = this.addText(24, 8, 'D', 38, '#fff2a8').setFontStyle('900').setOrigin(0, 0);
    this.rankTitle = this.addText(94, 11, 'DULL', 15, '#ffffff').setFontStyle('700').setOrigin(0, 0);
    this.styleBack = this.add.rectangle(94, 38, 190, 12, 0x2f2f3d).setOrigin(0, 0);
    this.styleBack.setStrokeStyle(2, 0xffffff);
    this.styleBar = this.add.rectangle(96, 40, 0, 8, 0xfff2a8).setOrigin(0, 0);

    this.comboText = this.addText(378, 22, 'Combo: x0', 15, '#ffffff').setFontStyle('700').setOrigin(0, 0.5);
    this.timerBack = this.add.rectangle(482, 18, 80, 9, 0x333333).setOrigin(0, 0);
    this.timerBack.setStrokeStyle(1, 0xffffff);
    this.timerBar = this.add.rectangle(483, 19, 0, 7, 0xff6961).setOrigin(0, 0);

    this.timeText = this.addText(624, 22, 'Time: 20.0s', 15, '#ffffff').setFontStyle('700').setOrigin(0, 0.5);
    this.itemsText = this.addText(730, 22, 'Hits: 0', 15, '#ffffff').setFontStyle('700').setOrigin(0, 0.5);
    this.chargeText = this.addText(812, 22, 'Charge: 0%', 15, '#ffffff').setFontStyle('700').setOrigin(0, 0.5);

    this.root.add([
      this.rankLetter,
      this.rankTitle,
      this.styleBack,
      this.styleBar,
      this.comboText,
      this.timerBack,
      this.timerBar,
      this.timeText,
      this.itemsText,
      this.chargeText,
    ]);
  }

  private createBigRankDisplay(): void {
    if (!this.root) return;

    this.bigRankText = this.addText(PLAY_WIDTH - 112, 98, 'D', 94, '#ffffff')
      .setFontFamily('Impact, Arial Black, Arial, sans-serif')
      .setFontStyle('900')
      .setOrigin(0.5);
    this.bigRankText.setStroke('#000000', 12);
    this.bigRankText.setShadow(0, 0, '#fff2a8', 18);

    this.bigRankTitle = this.addText(PLAY_WIDTH - 112, 152, 'DULL', 15, '#fff2a8')
      .setFontStyle('900')
      .setOrigin(0.5);
    this.bigRankTitle.setStroke('#000000', 5);

    this.styleTimerSlash = this.add.rectangle(PLAY_WIDTH - 157, 170, 0, 6, 0xff6961).setOrigin(0, 0.5);
    this.root.add([this.bigRankText, this.bigRankTitle, this.styleTimerSlash]);
  }

  private createResultOverlay(): void {
    if (!this.root) return;

    const overlay = this.add.container(0, 0).setVisible(false);
    const shade = this.add.rectangle(0, 0, PLAY_WIDTH, PLAY_HEIGHT, 0x070710, 0.86).setOrigin(0);
    const card = this.add
      .rectangle(PLAY_WIDTH / 2, PLAY_HEIGHT / 2, 500, 260, 0xf8f5f0)
      .setStrokeStyle(4, 0xf2c14e);
    const title = this.addText(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 - 84, 'RAGE RELEASED', 36, '#101820')
      .setFontStyle('900')
      .setOrigin(0.5);
    const summary = this.addText(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 - 22, '', 20, '#101820').setOrigin(0.5);
    summary.setName('boss-result-summary');
    const detail = this.addText(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 + 28, '', 17, '#334155').setOrigin(0.5);
    detail.setName('boss-result-detail');
    const button = this.add
      .rectangle(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 + 88, 238, 48, 0xf2c14e)
      .setInteractive({ useHandCursor: true });
    const buttonText = this.addText(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 + 88, 'Back to Workday', 18, '#101820')
      .setFontStyle('700')
      .setOrigin(0.5);

    button.on('pointerup', () => this.returnToWorkday());
    button.on('pointerover', () => button.setFillStyle(0xffd166));
    button.on('pointerout', () => button.setFillStyle(0xf2c14e));

    overlay.add([shade, card, title, summary, detail, button, buttonText]);
    this.resultOverlay = overlay;
    this.root.add(overlay);
  }


  private createStartOverlay(): void {
    if (!this.root) return;

    const overlay = this.add.container(0, 0);
    const shade = this.add.rectangle(0, 0, PLAY_WIDTH, PLAY_HEIGHT, 0x070710, 0.82).setOrigin(0);
    const title = this.addText(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 - 96, 'Boss Battle Instructions', 40, '#fff2a8').setOrigin(0.5).setFontStyle('900');
    title.setStroke('#101820', 8);
    const instruction = this.addText(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 - 26, 'Charge and punch to launch your boss into furniture.\nBreak more stuff before time runs out to score big.', 24, '#f8fafc').setOrigin(0.5);
    instruction.setAlign('center');
    const button = this.add.rectangle(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 + 86, 280, 58, 0xf2c14e).setStrokeStyle(3, 0x101820).setInteractive({ useHandCursor: true });
    const buttonText = this.addText(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 + 86, 'Yeet your boss', 24, '#101820').setFontStyle('900').setOrigin(0.5);

    button.on('pointerup', () => {
      this.isAwaitingStart = false;
      this.startOverlay?.setVisible(false);
      this.countdownBurst('GO!');
    });

    overlay.add([shade, title, instruction, button, buttonText]);
    this.startOverlay = overlay;
    this.root.add(overlay);
  }

  /* ── input ──────────────────────────────────────────────────── */

  private bindInput(): void {
    this.input.addPointer(2);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);
    this.input.keyboard?.on('keydown', this.handleKeyDown, this);
    this.input.keyboard?.on('keyup', this.handleKeyUp, this);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.keys.add(event.key.toLowerCase());
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.key.toLowerCase());
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const point = this.toPlayPoint(pointer.x, pointer.y);

    if (pointer.id === this.touch.moveId) {
      this.touch.joyX = point.x;
      this.touch.joyY = point.y;
      this.updateTouchMoveVector();
    }

    if (pointer.id === this.touch.aimId || !this.touch.aimActive) {
      this.mouseX = point.x;
      this.mouseY = point.y;
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isComplete || this.isAwaitingStart) return;

    const point = this.toPlayPoint(pointer.x, pointer.y);
    this.mouseX = point.x;
    this.mouseY = point.y;

    if (point.x < PLAY_WIDTH * 0.45 && this.touch.moveId === null && pointer.event instanceof TouchEvent) {
      this.touch.moveId = pointer.id;
      this.touch.moveActive = true;
      this.touch.joyStartX = point.x;
      this.touch.joyStartY = point.y;
      this.touch.joyX = point.x;
      this.touch.joyY = point.y;
      this.updateTouchMoveVector();
      return;
    }

    if (this.touch.aimId === null) {
      this.touch.aimId = pointer.id;
      this.touch.aimActive = pointer.event instanceof TouchEvent;
      this.mouseDown = true;
      this.chargeStart = this.time.now;
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.touch.moveId) {
      this.touch.moveId = null;
      this.touch.moveActive = false;
      this.touch.moveX = 0;
      this.touch.moveY = 0;
    }

    if (pointer.id === this.touch.aimId) {
      this.touch.aimId = null;
      this.touch.aimActive = false;

      if (this.mouseDown) {
        this.mouseDown = false;
        this.punchBoss();
      }
    }
  }

  /* ── layout ─────────────────────────────────────────────────── */

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.playScale = Math.min(width / PLAY_WIDTH, height / PLAY_HEIGHT);
    this.playX = (width - PLAY_WIDTH * this.playScale) / 2;
    this.playY = (height - PLAY_HEIGHT * this.playScale) / 2;
    this.root?.setPosition(this.playX, this.playY).setScale(this.playScale);
  }

  /* ── simulation ─────────────────────────────────────────────── */

  private updateSimulation(dt: number): void {
    if (this.isAwaitingStart) {
      return;
    }

    if (this.hitPause > 0) {
      this.hitPause -= dt;
      this.updateFloatingTexts(dt);
      return;
    }

    if (!this.isComplete) {
      const previousTime = this.timeLeft;
      this.timeLeft = Math.max(0, this.timeLeft - dt);

      if (this.timeLeft <= 5 && this.timeLeft > 0) {
        const mark = Math.ceil(this.timeLeft);
        if (mark !== this.lastCountdownMark && mark >= 1 && mark <= 5) {
          this.lastCountdownMark = mark;
          this.countdownBurst(mark);
        }
      }

      if (previousTime > 0 && this.timeLeft <= 0) {
        this.endRun();
      }
    }

    if (this.isComplete) {
      this.finalTimer -= dt;
      this.boss.vx *= 0.985;
      this.boss.vy *= 0.985;
    }

    this.updatePlayer(dt);
    this.updateBoss(dt);
    this.updateItems(dt);
    if (!this.isComplete) {
      this.updateStyle(dt);
    }
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.shake = Math.max(0, this.shake - 38 * dt);
    this.flash = Math.max(0, this.flash - dt);
    this.payoutFlash = Math.max(0, this.payoutFlash - dt);
    this.countdownPulse = Math.max(0, this.countdownPulse - dt * 1.25);
    this.countdownFlash = Math.max(0, this.countdownFlash - dt * 1.1);
  }

  private updatePlayer(dt: number): void {
    let mx = 0;
    let my = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) my -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) my += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) mx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) mx += 1;
    if (this.touch.moveActive) {
      mx += this.touch.moveX;
      my += this.touch.moveY;
    }

    const moveLength = this.length(mx, my);
    if (mx !== 0 || my !== 0) {
      this.player.x += (mx / moveLength) * this.player.speed * dt;
      this.player.y += (my / moveLength) * this.player.speed * dt;
      this.player.facingX = mx / moveLength;
      this.player.facingY = my / moveLength;
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, 30, PLAY_WIDTH - 30);
    this.player.y = Phaser.Math.Clamp(this.player.y, 40, PLAY_HEIGHT - 30);
  }

  private updateBoss(dt: number): void {
    if (!this.isComplete) {
      const speed = Math.hypot(this.boss.vx, this.boss.vy);
      const distanceToPlayer = this.distance(this.player, this.boss);
      const chargingNear = this.mouseDown && distanceToPlayer < 230;

      if (speed < 55 && !chargingNear && this.boss.launchedTimer <= 0) {
        const dx = this.boss.x - this.player.x;
        const dy = this.boss.y - this.player.y;
        const bossLength = this.length(dx, dy);
        this.boss.vx += (dx / bossLength) * this.boss.scaredSpeed * dt;
        this.boss.vy += (dy / bossLength) * this.boss.scaredSpeed * dt;
      }

      if (chargingNear) {
        this.boss.vx *= Math.pow(0.07, dt);
        this.boss.vy *= Math.pow(0.07, dt);
      }
    }

    this.boss.x += this.boss.vx * dt;
    this.boss.y += this.boss.vy * dt;
    this.boss.vx *= Math.pow(0.16, dt);
    this.boss.vy *= Math.pow(0.16, dt);
    this.boss.stun = Math.max(0, this.boss.stun - dt);
    this.boss.spin = Math.max(0, this.boss.spin - dt);
    this.boss.hurt = Math.max(0, this.boss.hurt - dt);
    this.boss.wallHitCooldown = Math.max(0, this.boss.wallHitCooldown - dt);
    this.boss.launchedTimer = Math.max(0, this.boss.launchedTimer - dt);

    if (this.boss.launchedTimer <= 0 || Math.hypot(this.boss.vx, this.boss.vy) < 70) {
      this.boss.launchedByPlayer = false;
    }

    this.resolveWallBounce();
  }

  private updateItems(dt: number): void {
    // Respawn broken items
    for (const item of this.breakableItems) {
      if (item.broken) {
        item.respawnTimer = Math.max(0, item.respawnTimer - dt);
        if (
          item.respawnTimer <= 0 &&
          !this.circleRectCollision(
            this.boss.x,
            this.boss.y,
            this.boss.r,
            item.boundsX,
            item.boundsY,
            item.boundsW,
            item.boundsH,
          )
        ) {
          item.broken = false;
          if (item.config.useAtlas) {
            item.sprite.setTexture(OfficeAssets.textureKey, item.config.normalFrame);
          } else {
            item.sprite.setTexture(item.config.normalFrame);
          }
          this.computeItemBounds(item);
          this.addFloatingText(
            'RESPAWN!',
            item.boundsX + item.boundsW / 2,
            item.boundsY + item.boundsH / 2,
            18,
            0.65,
          );
        }
      }
    }

    // Breakable collisions
    const bossSpeed = Math.hypot(this.boss.vx, this.boss.vy);
    for (const item of this.breakableItems) {
      if (
        !item.broken &&
        this.circleRectCollision(
          this.boss.x,
          this.boss.y,
          this.boss.r,
          item.boundsX,
          item.boundsY,
          item.boundsW,
          item.boundsH,
        )
      ) {
        if (this.boss.launchedByPlayer && bossSpeed > 130) {
          this.breakItem(item);
        }
      }
    }
  }

  private updateStyle(dt: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    if (this.styleState.timer > 0) {
      this.styleState.timer -= dt;
    } else {
      this.styleState.score = Math.max(0, this.styleState.score - 190 * dt);
      this.styleState.hits = 0;
    }

    this.styleState.rankIndex = this.getRankIndex(this.styleState.score);
    this.styleState.rankPop = Math.max(0, this.styleState.rankPop - dt * 1.65);
    this.styleState.beamBurst = Math.max(0, this.styleState.beamBurst - dt * 1.15);
    this.styleState.rankWobble = Math.max(0, this.styleState.rankWobble - dt * 1.4);

    if (this.styleState.multiplierTimer > 0) {
      this.styleState.multiplierTimer -= dt;
      if (this.styleState.multiplierTimer <= 0) this.styleState.multiplier = 1;
    }

    this.styleState.superPunchTimer = Math.max(0, this.styleState.superPunchTimer - dt);
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.12, dt);
      p.vy *= Math.pow(0.12, dt);
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private updateFloatingTexts(dt: number): void {
    for (const ft of this.floatingTexts) {
      ft.label.y += ft.vy * dt;
      ft.life -= dt;
      ft.label.setAlpha(Phaser.Math.Clamp(ft.life / ft.maxLife, 0, 1));
    }
    this.floatingTexts = this.floatingTexts.filter((ft) => {
      if (ft.life > 0) return true;
      ft.label.destroy();
      return false;
    });
  }

  /* ── punch & break ──────────────────────────────────────────── */

  private punchBoss(): void {
    if (this.isComplete) return;

    const distanceToBoss = this.distance(this.player, this.boss);
    const punchRange = 125;
    const lungeRange = 165;

    if (distanceToBoss > lungeRange) {
      this.addFloatingText('TOO FAR!', this.player.x, this.player.y - 35, 20);
      this.combo = 0;
      this.comboTimer = 0;
      return;
    }

    if (distanceToBoss > punchRange) {
      const dxToBoss = this.boss.x - this.player.x;
      const dyToBoss = this.boss.y - this.player.y;
      const lungeLength = this.length(dxToBoss, dyToBoss);
      this.player.x += (dxToBoss / lungeLength) * 22;
      this.player.y += (dyToBoss / lungeLength) * 22;
      this.addFloatingText('LUNGE!', this.player.x, this.player.y - 35, 18);
    }

    let dx = this.mouseX - this.player.x;
    let dy = this.mouseY - this.player.y;
    const aimLength = this.length(dx, dy);
    dx /= aimLength;
    dy /= aimLength;

    const chargeSeconds = Phaser.Math.Clamp((this.time.now - this.chargeStart) / 1000, 0, 1.15);
    let power = 430 + chargeSeconds * 520 + this.combo * 65 + this.styleState.rankIndex * 28;

    if (this.styleState.superPunchTimer > 0) {
      power += 450;
      this.styleState.superPunchTimer = 0;
      this.payoutBurst('SUPER PUNCH!', this.boss.x, this.boss.y - 70, true);
    }

    this.boss.vx = dx * power;
    this.boss.vy = dy * power;
    this.boss.stun = 0.45;
    this.boss.hurt = 0.24;
    this.boss.launchedByPlayer = true;
    this.boss.launchedTimer = 1.8;
    this.player.facingX = dx;
    this.player.facingY = dy;
    this.combo += 1;
    this.comboTimer = 2.35;
    this.shake = Math.max(this.shake, 9 + this.combo * 1.5 + this.styleState.rankIndex);
    this.hitPause = 0.045;
    this.playRandomPunchSound();
    this.addParticles(this.boss.x, this.boss.y, 14, 170, 'hit');
    this.addStyle(125 + this.combo * 28, chargeSeconds > 0.75 ? 'CHARGED HIT' : 'HIT');
    this.addFloatingText(
      chargeSeconds > 0.75 ? 'BIG HIT!' : 'PUNCH!',
      this.boss.x,
      this.boss.y - 34,
      chargeSeconds > 0.75 ? 26 : 24,
    );
  }

  private playRandomPunchSound(): void {
    const punchSounds = OfficeAssets.punchSounds;
    const punchSound = punchSounds[Phaser.Math.Between(0, punchSounds.length - 1)];
    this.sound.play(punchSound.key, { volume: 0.8 });
  }

  private breakItem(item: BreakableItemState): void {
    if (item.broken || this.isComplete) return;

    item.broken = true;
    item.respawnTimer = 1.15;
    this.totalBreaks += 1;
    this.hitPause = 0.06;
    this.shake = Math.max(this.shake, 18);
    this.flash = Math.max(this.flash, 0.12);

    // Swap sprite to broken frame
    if (item.config.useAtlas) {
      item.sprite.setTexture(OfficeAssets.textureKey, item.config.brokenFrame);
    } else {
      item.sprite.setTexture(item.config.brokenFrame);
    }
    this.computeItemBounds(item);

    const centerX = item.boundsX + item.boundsW / 2;
    const centerY = item.boundsY + item.boundsH / 2;
    this.addParticles(centerX, centerY, 40, 310, 'debris');
    this.combo += 1;
    this.comboTimer = 2.35;
    this.addStyle(item.config.tier, 'SMASH', centerX, item.boundsY - 12);

    if (this.combo >= 3) {
      this.payoutBurst(`BIG WIN COMBO x${this.combo}!`, PLAY_WIDTH / 2, 205, true);
      this.styleState.multiplier = 1.45;
      this.styleState.multiplierTimer = 4.0;
    } else if (Math.random() < 0.22 + this.combo * 0.06) {
      this.payoutBurst('BONUS PAYOUT!', PLAY_WIDTH / 2, 205);
      this.styleState.multiplier = 1.25;
      this.styleState.multiplierTimer = 3.0;
    }
  }

  /* ── end & resolve ──────────────────────────────────────────── */

  private endRun(): void {
    if (this.isComplete) return;

    this.countdownBurst('TIME UP!');
    this.isComplete = true;
    this.finalTimer = 1.8;
    this.shake = 34;
    this.payoutBurst(`TIME! ${this.totalBreaks} SMASHES!`, PLAY_WIDTH / 2, 245, true);
    this.resolveBossFightState();
    this.showResultOverlay();
  }

  private returnToWorkday(): void {
    this.resolveBossFightState();
    SceneTransitionService.start(this, { kind: 'timed', target: SceneKeys.workday, durationMs: 200 });
  }

  private resolveBossFightState(): void {
    if (this.hasResolvedState) return;

    const state = GameState.data;
    const score = Math.round(this.styleState.score);
    const sanityRestore = this.getSanityRestoreForScore(score);
    RageSystem.reset(state);
    workdayTaskQueue.reset();
    SanitySystem.restore(state, sanityRestore);
    ScoreSystem.applyBossFightScore(state, score);
    GameState.clampVitals();
    this.hasResolvedState = true;
  }

  private showResultOverlay(): void {
    const overlay = this.resultOverlay;
    if (!overlay) return;

    const rank = ranks[this.styleState.rankIndex];
    const score = Math.round(this.styleState.score);
    const sanityRestore = this.getSanityRestoreForScore(score);
    const summary = overlay.getByName('boss-result-summary') as Phaser.GameObjects.Text | null;
    const detail = overlay.getByName('boss-result-detail') as Phaser.GameObjects.Text | null;
    summary?.setText(`${this.totalBreaks} office smashes - Style ${rank.letter}`);
    detail?.setText(`Score gained: ${score}   Sanity restored: ${sanityRestore}`);
    overlay.setVisible(true);
  }

  private getSanityRestoreForScore(score: number): number {
    const maxScore = ranks[ranks.length - 1].threshold;
    const restoreRatio = Phaser.Math.Clamp(score / maxScore, 0, 1);
    return Math.round(restoreRatio * BalanceConfig.maxSanity);
  }

  /* ── wall bounce ────────────────────────────────────────────── */

  private resolveWallBounce(): void {
    const speedBeforeWall = Math.hypot(this.boss.vx, this.boss.vy);
    let wallBounced = false;

    if (this.boss.x < this.boss.r) {
      this.boss.x = this.boss.r;
      this.boss.vx = Math.abs(this.boss.vx) * 0.82;
      wallBounced = true;
    }
    if (this.boss.x > PLAY_WIDTH - this.boss.r) {
      this.boss.x = PLAY_WIDTH - this.boss.r;
      this.boss.vx = -Math.abs(this.boss.vx) * 0.82;
      wallBounced = true;
    }
    if (this.boss.y < HEADER_HEIGHT + this.boss.r) {
      this.boss.y = HEADER_HEIGHT + this.boss.r;
      this.boss.vy = Math.abs(this.boss.vy) * 0.82;
      wallBounced = true;
    }
    if (this.boss.y > PLAY_HEIGHT - this.boss.r) {
      this.boss.y = PLAY_HEIGHT - this.boss.r;
      this.boss.vy = -Math.abs(this.boss.vy) * 0.82;
      wallBounced = true;
    }

    if (!wallBounced) return;

    this.shake = Math.max(this.shake, 6);
    this.addParticles(this.boss.x, this.boss.y, 7, 120, 'hit');

    if (this.boss.launchedByPlayer && speedBeforeWall > 210 && this.boss.wallHitCooldown <= 0) {
      this.boss.wallHitCooldown = 0.35;
      this.addStyle(85, 'WALL BOUNCE');
    }
  }

  /* ── style system ───────────────────────────────────────────── */

  private addStyle(points: number, label: string, x = this.boss.x, y = this.boss.y - 48): void {
    const realPoints = Math.round(points * this.styleState.multiplier);
    this.styleState.score += realPoints;
    this.styleState.timer = 3.0;
    this.styleState.hits += 1;

    const newRank = this.getRankIndex(this.styleState.score);
    if (newRank > this.styleState.rankIndex) {
      this.styleState.rankIndex = newRank;
      this.styleState.rankPop = 1.0;
      this.styleState.beamBurst = 1.0;
      this.styleState.rankWobble = 1.0;
      this.payoutBurst(`${ranks[newRank].letter}! ${ranks[newRank].title}`, PLAY_WIDTH / 2, 115, newRank >= 4);

      if (newRank >= 5) {
        this.styleState.multiplier = 1.35;
        this.styleState.multiplierTimer = 4.5;
      }
      if (newRank >= 6) {
        this.styleState.superPunchTimer = 5.0;
        this.addFloatingText('SUPER PUNCH READY!', PLAY_WIDTH / 2, 170, 34, 1.2);
      }
    } else {
      this.styleState.rankIndex = newRank;
    }

    if (label.length > 0) {
      this.addFloatingText(`${label} +${realPoints}`, x, y, 20);
    }
  }

  private payoutBurst(label: string, x = PLAY_WIDTH / 2, y = 190, big = false): void {
    this.payoutFlash = big ? 0.45 : 0.25;
    this.shake = Math.max(this.shake, big ? 25 : 14);
    this.flash = Math.max(this.flash, big ? 0.16 : 0.08);
    this.addFloatingText(label, x, y, big ? 54 : 36, big ? 1.35 : 1.05);
    this.addParticles(x, y, big ? 70 : 34, big ? 420 : 260, 'coin');
  }

  private countdownBurst(value: string | number): void {
    this.countdownNumber = value;
    this.countdownPulse = 1.0;
    this.countdownFlash = value === 'TIME UP!' ? 0.65 : 0.45;
    this.shake = Math.max(this.shake, value === 'TIME UP!' ? 20 : 5 + (6 - Number(value)));
    this.flash = Math.max(this.flash, value === 'TIME UP!' ? 0.12 : 0.035);
    this.addParticles(PLAY_WIDTH / 2, 42, value === 'TIME UP!' ? 34 : 14, value === 'TIME UP!' ? 220 : 130, 'coin');
  }

  /* ── floating text & particles ──────────────────────────────── */

  private addFloatingText(text: string, x: number, y: number, size = 28, life = 1): void {
    if (!this.root) return;

    const label = this.addText(x, y, text, size, '#fff2a8').setFontStyle('900').setOrigin(0.5).setStroke('#000000', 5);
    this.root.add(label);
    this.floatingTexts.push({ label, vy: -48, life, maxLife: life });
  }

  private addParticles(x: number, y: number, count: number, power: number, kind: ParticleKind): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * power + 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 0.7 + 0.35,
        radius: Math.random() * 4 + 2,
        kind,
      });
    }
  }

  /* ── drawing ────────────────────────────────────────────────── */

  private drawOverlay(): void {
    if (!this.graphics) return;

    const offsetX = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const offsetY = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const g = this.graphics;
    g.clear();
    g.save();
    g.translateCanvas(offsetX, offsetY);
    this.drawHeaderAndBorder(g);
    this.drawParticles(g);
    this.drawAimLine(g);
    this.drawTouchJoystick(g);
    this.drawPlayer(g);
    this.drawBoss(g);
    this.drawCountdown(g);
    this.drawFlashes(g);
    g.restore();
  }

  private drawHeaderAndBorder(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x15151c, 0.88);
    g.fillRect(0, 0, PLAY_WIDTH, HEADER_HEIGHT);
    g.lineStyle(4, 0xf3e6c4, 1);
    g.strokeRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);
  }

  private drawParticles(g: Phaser.GameObjects.Graphics): void {
    for (const p of this.particles) {
      const color = p.kind === 'coin' ? 0xfff2a8 : p.kind === 'debris' ? 0xd6b58a : 0xfff0c7;
      g.fillStyle(color, Math.max(0, p.life));
      if (p.kind === 'coin') {
        g.fillCircle(p.x, p.y, p.radius);
      } else {
        g.fillRect(p.x, p.y, p.radius * 2, p.radius);
      }
    }
  }

  private drawAimLine(g: Phaser.GameObjects.Graphics): void {
    if (!this.mouseDown || this.isComplete) return;

    const charge = Phaser.Math.Clamp((this.time.now - this.chargeStart) / 1000, 0, 1.15);
    const dx = this.mouseX - this.player.x;
    const dy = this.mouseY - this.player.y;
    const aimLen = this.length(dx, dy);
    const aimX = dx / aimLen;
    const aimY = dy / aimLen;
    const color = this.styleState.superPunchTimer > 0 ? 0xfff2a8 : 0xffffff;

    g.lineStyle(5 + charge * 5, color, 1);
    g.beginPath();
    g.moveTo(this.player.x, this.player.y);
    g.lineTo(
      this.player.x + aimX * (75 + charge * 70),
      this.player.y + aimY * (75 + charge * 70),
    );
    g.strokePath();
    g.fillStyle(color, 1);
    g.fillCircle(
      this.player.x + aimX * (80 + charge * 70),
      this.player.y + aimY * (80 + charge * 70),
      8 + charge * 5,
    );
  }

  private drawTouchJoystick(g: Phaser.GameObjects.Graphics): void {
    if (!this.touch.moveActive) return;

    g.lineStyle(4, 0xffffff, 0.32);
    g.strokeCircle(this.touch.joyStartX, this.touch.joyStartY, 55);
    g.fillStyle(0xffffff, 0.32);
    g.fillCircle(
      this.touch.joyStartX + this.touch.moveX * 45,
      this.touch.joyStartY + this.touch.moveY * 45,
      18,
    );
  }

  private drawPlayer(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x6ee7ff, 1);
    g.lineStyle(4, 0x111111, 1);
    g.fillCircle(this.player.x, this.player.y, this.player.r);
    g.strokeCircle(this.player.x, this.player.y, this.player.r);
    g.fillStyle(0x111111, 1);
    g.fillCircle(
      this.player.x + this.player.facingX * 8 - this.player.facingY * 4,
      this.player.y + this.player.facingY * 8 + this.player.facingX * 4,
      3,
    );
    g.fillCircle(
      this.player.x + this.player.facingX * 8 + this.player.facingY * 4,
      this.player.y + this.player.facingY * 8 - this.player.facingX * 4,
      3,
    );
  }

  private drawBoss(g: Phaser.GameObjects.Graphics): void {
    if (this.boss.launchedByPlayer) {
      g.lineStyle(7, 0xfff2a8, 0.25 + Math.sin(this.time.now / 60) * 0.08);
      g.strokeCircle(this.boss.x, this.boss.y, this.boss.r + 9);
    }
  }

  private drawCountdown(g: Phaser.GameObjects.Graphics): void {
    if (!this.countdownNumber || (!this.isComplete && this.timeLeft > 5 && this.countdownPulse <= 0)) return;

    const alpha = Phaser.Math.Clamp(this.countdownFlash, 0, 0.7);
    g.fillStyle(0xff6961, alpha);
    g.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);
  }

  private drawFlashes(g: Phaser.GameObjects.Graphics): void {
    if (this.payoutFlash > 0) {
      g.lineStyle(18, 0xfff2a8, this.payoutFlash * 0.7);
      g.strokeRect(12, 12, PLAY_WIDTH - 24, PLAY_HEIGHT - 24);
    }

    if (this.flash > 0) {
      g.fillStyle(0xfff6d6, this.flash * 3);
      g.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);
    }
  }

  /* ── HUD update ─────────────────────────────────────────────── */

  private updateHud(): void {
    const rank = ranks[this.styleState.rankIndex];
    const next = ranks[Math.min(this.styleState.rankIndex + 1, ranks.length - 1)];
    const base = rank.threshold;
    const top = next.threshold === base ? base + 1 : next.threshold;
    const progress =
      this.styleState.rankIndex === ranks.length - 1
        ? 1
        : Phaser.Math.Clamp((this.styleState.score - base) / (top - base), 0, 1);
    const charge = this.mouseDown
      ? Phaser.Math.Clamp((this.time.now - this.chargeStart) / 1000, 0, 1.15)
      : 0;
    const urgent = this.timeLeft <= 5 && !this.isComplete;
    const pop = this.styleState.rankPop;
    const pulse = 1 + Math.sin(this.time.now / 125) * 0.035 + pop * 0.28;
    const wobble = Math.sin(this.time.now / 55) * this.styleState.rankWobble * 6.3;
    const rankSize =
      rank.letter.length === 3 ? 62 : rank.letter.length === 2 ? 76 : 94;

    this.rankLetter?.setText(rank.letter);
    this.rankTitle?.setText(
      `${rank.title}${this.styleState.multiplierTimer > 0 ? `  x${this.styleState.multiplier.toFixed(1)}` : ''}${this.styleState.superPunchTimer > 0 ? '  SUPER READY' : ''}`,
    );
    this.styleBar?.setSize(Math.round(progress * 186), 8);
    this.timerBar?.setSize(Math.round(Phaser.Math.Clamp(this.styleState.timer / 3, 0, 1) * 78), 7);
    this.comboText?.setText(`Combo: x${this.combo}`);
    this.itemsText?.setText(`Hits: ${this.totalBreaks}`);
    this.timeText?.setText(
      `Time: ${this.timeLeft <= 5 ? Math.ceil(this.timeLeft).toString() : this.timeLeft.toFixed(1)}s`,
    );
    this.timeText?.setColor(urgent ? '#ff6961' : '#ffffff');
    this.timeText?.setFontStyle(urgent ? '900' : '700');
    this.chargeText?.setText(`Charge: ${Math.round((charge / 1.15) * 100)}%`);
    this.bigRankText
      ?.setText(rank.letter)
      .setFontSize(rankSize)
      .setColor(this.styleState.rankIndex >= 4 ? '#fff2a8' : '#ffffff');
    this.bigRankText?.setScale(pulse).setAngle(-7 + wobble);
    this.bigRankTitle?.setText(rank.title);
    this.styleTimerSlash?.setSize(90 * Phaser.Math.Clamp(this.styleState.timer / 3, 0, 1), 6);
  }

  private updateArenaText(): void {
    const stretchX = 1 + this.boss.hurt * 0.8;
    const stretchY = 1 - this.boss.hurt * 0.4;
    if (this.bossImage) {
      const baseScale = (this.boss.r * 2) / this.bossImage.width;
      this.bossImage
        .setPosition(this.boss.x, this.boss.y)
        .setScale(baseScale * stretchX, baseScale * stretchY)
        .setRotation(this.boss.spin > 0 ? (this.time.now / 60) % (Math.PI * 2) : 0)
        .setTint(this.isComplete ? 0xffb3b3 : 0xffffff)
        .setVisible(true);
    }

    if (this.countdownNumber && (this.countdownPulse > 0 || this.timeLeft <= 5 || this.isComplete)) {
      const scale = 1 + this.countdownPulse * 0.35;
      this.countdownText?.setVisible(true).setText(`${this.countdownNumber}`).setScale(scale);
      this.countdownText?.setAlpha(Phaser.Math.Clamp(0.25 + this.countdownPulse, 0.2, 1));
    } else {
      this.countdownText?.setVisible(false);
    }
  }

  /* ── collision ──────────────────────────────────────────────── */

  private circleRectCollision(
    cx: number,
    cy: number,
    cr: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
  ): boolean {
    const closestX = Phaser.Math.Clamp(cx, rx, rx + rw);
    const closestY = Phaser.Math.Clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
  }

  /* ── coordinate transform ──────────────────────────────────── */

  private toPlayPoint(screenX: number, screenY: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp((screenX - this.playX) / this.playScale, 0, PLAY_WIDTH),
      Phaser.Math.Clamp((screenY - this.playY) / this.playScale, 0, PLAY_HEIGHT),
    );
  }

  /* ── utilities ─────────────────────────────────────────────── */

  private addText(
    x: number,
    y: number,
    text: string,
    size: number,
    color: string,
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${size}px`,
      color,
    });
  }

  private getRankIndex(score: number): number {
    let index = 0;
    for (let i = 0; i < ranks.length; i += 1) {
      if (score >= ranks[i].threshold) index = i;
    }
    return index;
  }

  private length(x: number, y: number): number {
    return Math.hypot(x, y) || 1;
  }

  private distance(a: CircleBody, b: CircleBody): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /* ── initial state factories ───────────────────────────────── */

  private createInitialPlayer(): PlayerState {
    return { x: 220, y: 300, r: 18, speed: 320, facingX: 1, facingY: 0 };
  }

  private createInitialBoss(): BossState {
    return {
      x: 530,
      y: 310,
      r: 24,
      vx: 0,
      vy: 0,
      scaredSpeed: 54,
      stun: 0,
      spin: 0,
      hurt: 0,
      wallHitCooldown: 0,
      launchedTimer: 0,
      launchedByPlayer: false,
    };
  }

  private createInitialStyle(): StyleState {
    return {
      score: 0,
      rankIndex: 0,
      timer: 0,
      hits: 0,
      multiplier: 1,
      multiplierTimer: 0,
      superPunchTimer: 0,
      rankPop: 0,
      beamBurst: 0,
      rankWobble: 0,
    };
  }

  private createInitialTouch(): TouchState {
    return {
      moveId: null,
      aimId: null,
      moveActive: false,
      aimActive: false,
      joyStartX: 0,
      joyStartY: 0,
      joyX: 0,
      joyY: 0,
      moveX: 0,
      moveY: 0,
    };
  }

  private updateTouchMoveVector(): void {
    const dx = this.touch.joyX - this.touch.joyStartX;
    const dy = this.touch.joyY - this.touch.joyStartY;
    const dist = Math.hypot(dx, dy);
    const strength = Phaser.Math.Clamp(dist / 75, 0, 1);

    if (dist < 8) {
      this.touch.moveX = 0;
      this.touch.moveY = 0;
      return;
    }

    this.touch.moveX = (dx / dist) * strength;
    this.touch.moveY = (dy / dist) * strength;
  }

  /* ── cleanup ───────────────────────────────────────────────── */

  private cleanup(): void {
    this.scale.off('resize', this.layout, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    this.input.off('pointerupoutside', this.handlePointerUp, this);
    this.input.keyboard?.off('keydown', this.handleKeyDown, this);
    this.input.keyboard?.off('keyup', this.handleKeyUp, this);
    this.floatingTexts.forEach((t) => t.label.destroy());
    this.breakableItems = [];
    this.particles = [];
    this.floatingTexts = [];
    this.root = undefined;
    this.graphics = undefined;
    this.resultOverlay = undefined;
    this.rankLetter = undefined;
    this.rankTitle = undefined;
    this.styleBar = undefined;
    this.styleBack = undefined;
    this.timerBar = undefined;
    this.timerBack = undefined;
    this.comboText = undefined;
    this.timeText = undefined;
    this.itemsText = undefined;
    this.chargeText = undefined;
    this.bigRankText = undefined;
    this.bigRankTitle = undefined;
    this.styleTimerSlash = undefined;
    this.titleText = undefined;
    this.bossImage = undefined;
    this.countdownText = undefined;
    this.startOverlay = undefined;
  }
}
