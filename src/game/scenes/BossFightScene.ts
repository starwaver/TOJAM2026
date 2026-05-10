import Phaser from 'phaser';
import { BalanceConfig } from '../config/BalanceConfig';
import { GameState } from '../core/GameState';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { RageSystem } from '../systems/RageSystem';
import { SanitySystem } from '../systems/SanitySystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { SceneKeys } from '../types/SceneKeys';

type BreakableEffect = 'bounce' | 'paper' | 'spin' | 'boost' | 'final';
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

interface BreakableObject {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  broken: boolean;
  effect: BreakableEffect;
  respawnTimer: number;
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

const ranks: RankDefinition[] = [
  { letter: 'D', title: 'DULL', threshold: 0 },
  { letter: 'C', title: 'CLEAN', threshold: 1440 },
  { letter: 'B', title: 'BOLD', threshold: 3360 },
  { letter: 'A', title: 'ANGRY', threshold: 6080 },
  { letter: 'S', title: 'SAVAGE', threshold: 9920 },
  { letter: 'SS', title: 'SUPER', threshold: 14400 },
  { letter: 'SSS', title: 'JACKPOT REVENGE', threshold: 20000 },
];

const objectTemplates: Omit<BreakableObject, 'broken' | 'respawnTimer'>[] = [
  { name: 'DESK', x: 390, y: 245, w: 125, h: 58, color: 0x8b5a3c, effect: 'bounce' },
  { name: 'PRINTER', x: 710, y: 105, w: 80, h: 68, color: 0xcfd3dd, effect: 'paper' },
  { name: 'COFFEE', x: 150, y: 455, w: 70, h: 54, color: 0x91502d, effect: 'spin' },
  { name: 'CHAIR', x: 640, y: 425, w: 70, h: 68, color: 0x4f79c8, effect: 'boost' },
  { name: 'LOGO', x: 800, y: 255, w: 110, h: 95, color: 0xd6bb45, effect: 'final' },
  { name: 'KPI', x: 245, y: 105, w: 86, h: 58, color: 0x7fc97f, effect: 'paper' },
  { name: 'FILES', x: 80, y: 235, w: 72, h: 105, color: 0xb7a57a, effect: 'bounce' },
  { name: 'PLANT', x: 510, y: 485, w: 64, h: 64, color: 0x5aa05a, effect: 'spin' },
];

export class BossFightScene extends Phaser.Scene {
  private root?: Phaser.GameObjects.Container;
  private graphics?: Phaser.GameObjects.Graphics;
  private hudTexts: Phaser.GameObjects.Text[] = [];
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
  private bossSymbol?: Phaser.GameObjects.Text;
  private countdownText?: Phaser.GameObjects.Text;
  private objectLabels: Phaser.GameObjects.Text[] = [];
  private player: PlayerState = this.createInitialPlayer();
  private boss: BossState = this.createInitialBoss();
  private objects: BreakableObject[] = this.createObjects();
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
    this.drawArena();
    this.updateArenaText();
    this.updateHud();
  }

  private resetRun(): void {
    this.player = this.createInitialPlayer();
    this.boss = this.createInitialBoss();
    this.objects = this.createObjects();
    this.styleState = this.createInitialStyle();
    this.touch = this.createInitialTouch();
    this.particles = [];
    this.floatingTexts.forEach((text) => text.label.destroy());
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
  }

  private createDisplay(): void {
    this.root = this.add.container(0, 0);
    this.graphics = this.add.graphics();
    this.root.add(this.graphics);

    this.createArenaText();
    this.createHud();
    this.createBigRankDisplay();
    this.createResultOverlay();
  }

  private createArenaText(): void {
    if (!this.root) {
      return;
    }

    this.titleText = this.addText(24, 82, 'FINAL_FINAL_v12 OFFICE', 22, '#f3e6c4')
      .setFontStyle('700')
      .setOrigin(0, 0.5);
    this.root.add(this.titleText);

    this.objectLabels = this.objects.map((object) => {
      const label = this.addText(object.x + object.w / 2, object.y + object.h / 2 + 5, object.name, 13, '#15151c')
        .setFontStyle('700')
        .setOrigin(0.5);
      this.root?.add(label);
      return label;
    });

    this.bossSymbol = this.addText(this.boss.x, this.boss.y + 1, '$', 19, '#111111')
      .setFontStyle('700')
      .setOrigin(0.5);
    this.root.add(this.bossSymbol);

    this.countdownText = this.addText(PLAY_WIDTH / 2, 88, '', 58, '#fff2a8')
      .setFontStyle('900')
      .setOrigin(0.5)
      .setStroke('#000000', 7)
      .setVisible(false);
    this.root.add(this.countdownText);
  }

  private createHud(): void {
    if (!this.root) {
      return;
    }

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
    if (!this.root) {
      return;
    }

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
    if (!this.root) {
      return;
    }

    const overlay = this.add.container(0, 0).setVisible(false);
    const shade = this.add.rectangle(0, 0, PLAY_WIDTH, PLAY_HEIGHT, 0x070710, 0.86).setOrigin(0);
    const card = this.add.rectangle(PLAY_WIDTH / 2, PLAY_HEIGHT / 2, 500, 260, 0xf8f5f0).setStrokeStyle(4, 0xf2c14e);
    const title = this.addText(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 - 84, 'RAGE RELEASED', 36, '#101820')
      .setFontStyle('900')
      .setOrigin(0.5);
    const summary = this.addText(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 - 22, '', 20, '#101820').setOrigin(0.5);
    summary.setName('boss-result-summary');
    const detail = this.addText(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 + 28, '', 17, '#334155').setOrigin(0.5);
    detail.setName('boss-result-detail');
    const button = this.add.rectangle(PLAY_WIDTH / 2, PLAY_HEIGHT / 2 + 88, 238, 48, 0xf2c14e).setInteractive({
      useHandCursor: true,
    });
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
    if (this.isComplete) {
      return;
    }

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

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.playScale = Math.min(width / PLAY_WIDTH, height / PLAY_HEIGHT);
    this.playX = (width - PLAY_WIDTH * this.playScale) / 2;
    this.playY = (height - PLAY_HEIGHT * this.playScale) / 2;
    this.root?.setPosition(this.playX, this.playY).setScale(this.playScale);
  }

  private updateSimulation(dt: number): void {
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
    this.updateObjects(dt);
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

    if (this.keys.has('w') || this.keys.has('arrowup')) {
      my -= 1;
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      my += 1;
    }
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      mx -= 1;
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      mx += 1;
    }
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

  private updateObjects(dt: number): void {
    for (const object of this.objects) {
      if (object.broken) {
        object.respawnTimer = Math.max(0, object.respawnTimer - dt);
        if (object.respawnTimer <= 0 && !this.circleRectCollision(this.boss, object)) {
          object.broken = false;
          this.addFloatingText('RESPAWN!', object.x + object.w / 2, object.y + object.h / 2, 18, 0.65);
        }
      }
    }

    const bossSpeed = Math.hypot(this.boss.vx, this.boss.vy);
    for (const object of this.objects) {
      if (!object.broken && this.circleRectCollision(this.boss, object)) {
        if (this.boss.launchedByPlayer && bossSpeed > 130) {
          this.breakObject(object);
        } else {
          this.pushBossOutOfObject(object);
        }
      }
    }
  }

  private updateStyle(dt: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
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
      if (this.styleState.multiplierTimer <= 0) {
        this.styleState.multiplier = 1;
      }
    }

    this.styleState.superPunchTimer = Math.max(0, this.styleState.superPunchTimer - dt);
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.12, dt);
      particle.vy *= Math.pow(0.12, dt);
      particle.life -= dt;
    }

    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private updateFloatingTexts(dt: number): void {
    for (const floatingText of this.floatingTexts) {
      floatingText.label.y += floatingText.vy * dt;
      floatingText.life -= dt;
      floatingText.label.setAlpha(Phaser.Math.Clamp(floatingText.life / floatingText.maxLife, 0, 1));
    }

    const aliveTexts = this.floatingTexts.filter((floatingText) => {
      if (floatingText.life > 0) {
        return true;
      }

      floatingText.label.destroy();
      return false;
    });

    this.floatingTexts = aliveTexts;
  }

  private punchBoss(): void {
    if (this.isComplete) {
      return;
    }

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
    this.addParticles(this.boss.x, this.boss.y, 14, 170, 'hit');
    this.addStyle(125 + this.combo * 28, chargeSeconds > 0.75 ? 'CHARGED HIT' : 'HIT');
    this.addFloatingText(chargeSeconds > 0.75 ? 'BIG HIT!' : 'PUNCH!', this.boss.x, this.boss.y - 34, chargeSeconds > 0.75 ? 26 : 24);
  }

  private breakObject(object: BreakableObject): void {
    if (object.broken || this.isComplete) {
      return;
    }

    object.broken = true;
    object.respawnTimer = 1.15;
    this.totalBreaks += 1;
    this.hitPause = 0.06;
    this.shake = Math.max(this.shake, 18);
    this.flash = Math.max(this.flash, 0.12);

    const centerX = object.x + object.w / 2;
    const centerY = object.y + object.h / 2;
    const particleKind: ParticleKind = object.name === 'PRINTER' || object.name === 'KPI' ? 'paper' : 'debris';
    this.addParticles(centerX, centerY, 40, 310, particleKind);
    this.combo += 1;
    this.comboTimer = 2.35;
    this.addStyle(460, 'SMASH', centerX, object.y - 12);
    this.payoutObjectText(object, centerX, centerY);

    if (this.combo >= 3) {
      this.payoutBurst(`BIG WIN COMBO x${this.combo}!`, PLAY_WIDTH / 2, 205, true);
      this.styleState.multiplier = 1.45;
      this.styleState.multiplierTimer = 4.0;
    } else if (Math.random() < 0.22 + this.combo * 0.06) {
      this.payoutBurst('BONUS PAYOUT!', PLAY_WIDTH / 2, 205);
      this.styleState.multiplier = 1.25;
      this.styleState.multiplierTimer = 3.0;
    }

    if (object.effect === 'boost') {
      this.boss.vx *= 1.5;
      this.boss.vy *= 1.5;
    }

    if (object.effect === 'spin') {
      this.boss.spin = 1.1;
      const previousVx = this.boss.vx;
      const previousVy = this.boss.vy;
      const velocityLength = this.length(previousVx, previousVy);
      this.boss.vx = (-previousVy / velocityLength) * 390;
      this.boss.vy = (previousVx / velocityLength) * 390;
    }

    if (this.boss.x < object.x || this.boss.x > object.x + object.w) {
      this.boss.vx *= -0.82;
    } else {
      this.boss.vy *= -0.82;
    }

    this.boss.vx += (Math.random() - 0.5) * 150;
    this.boss.vy += (Math.random() - 0.5) * 150;
    this.boss.launchedTimer = 1.4;
    this.boss.launchedByPlayer = true;
  }

  private payoutObjectText(object: BreakableObject, centerX: number, centerY: number): void {
    const labelByName: Record<string, string> = {
      DESK: 'DESK SMASH!',
      PRINTER: 'PAPER EXPLOSION!',
      COFFEE: 'COFFEE CHAOS!',
      CHAIR: 'CHAIR BOOST!',
      LOGO: 'COMPANY LOGO CRUSH!',
      KPI: 'KPI DESTROYED!',
      FILES: 'FILE CABINET BURST!',
      PLANT: 'PLANT SPLAT!',
    };

    this.payoutBurst(labelByName[object.name] ?? 'SMASH!', centerX, centerY - 35, object.name === 'LOGO');
  }

  private endRun(): void {
    if (this.isComplete) {
      return;
    }

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
    if (this.hasResolvedState) {
      return;
    }

    const state = GameState.data;
    const score = Math.round(this.styleState.score);
    const sanityRestore = this.getSanityRestoreForScore(score);
    RageSystem.reset(state);
    SanitySystem.restore(state, sanityRestore);
    ScoreSystem.applyBossFightScore(state, score);
    GameState.clampVitals();
    this.hasResolvedState = true;
  }

  private showResultOverlay(): void {
    const overlay = this.resultOverlay;
    if (!overlay) {
      return;
    }

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

    if (!wallBounced) {
      return;
    }

    this.shake = Math.max(this.shake, 6);
    this.addParticles(this.boss.x, this.boss.y, 7, 120, 'hit');

    if (this.boss.launchedByPlayer && speedBeforeWall > 210 && this.boss.wallHitCooldown <= 0) {
      this.boss.wallHitCooldown = 0.35;
      this.addStyle(85, 'WALL BOUNCE');
    }
  }

  private pushBossOutOfObject(object: BreakableObject): void {
    const centerX = object.x + object.w / 2;
    const centerY = object.y + object.h / 2;
    const dx = this.boss.x - centerX;
    const dy = this.boss.y - centerY;
    const pushLength = this.length(dx, dy);
    this.boss.x += (dx / pushLength) * 12;
    this.boss.y += (dy / pushLength) * 12;
    this.boss.vx += (dx / pushLength) * 95;
    this.boss.vy += (dy / pushLength) * 95;
  }

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

  private addFloatingText(text: string, x: number, y: number, size = 28, life = 1): void {
    if (!this.root) {
      return;
    }

    const label = this.addText(x, y, text, size, '#fff2a8')
      .setFontStyle('900')
      .setOrigin(0.5)
      .setStroke('#000000', 5);
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

  private drawArena(): void {
    if (!this.graphics) {
      return;
    }

    const offsetX = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const offsetY = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const graphics = this.graphics;
    graphics.clear();
    graphics.save();
    graphics.translateCanvas(offsetX, offsetY);
    this.drawRoom(graphics);
    this.drawObjects(graphics);
    this.drawParticles(graphics);
    this.drawAimLine(graphics);
    this.drawTouchJoystick(graphics);
    this.drawPlayer(graphics);
    this.drawBoss(graphics);
    this.drawCountdown(graphics);
    this.drawFlashes(graphics);
    graphics.restore();
  }

  private drawRoom(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x2b2b35, 1);
    graphics.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);
    graphics.fillStyle(0x383845, 1);

    for (let x = 0; x < PLAY_WIDTH; x += 80) {
      graphics.fillRect(x, HEADER_HEIGHT, 3, PLAY_HEIGHT - HEADER_HEIGHT);
    }
    for (let y = HEADER_HEIGHT; y < PLAY_HEIGHT; y += 80) {
      graphics.fillRect(0, y, PLAY_WIDTH, 3);
    }

    graphics.fillStyle(0x20202a, 1);
    graphics.fillRect(0, 0, PLAY_WIDTH, HEADER_HEIGHT);
    graphics.lineStyle(4, 0xf3e6c4, 1);
    graphics.strokeRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);
  }

  private drawObjects(graphics: Phaser.GameObjects.Graphics): void {
    for (const object of this.objects) {
      if (object.broken) {
        graphics.fillStyle(0x5b4b4b, 0.35);
        graphics.lineStyle(3, 0x1b1b1b, 1);
        graphics.fillRoundedRect(object.x, object.y, object.w, object.h, 8);
        graphics.strokeRoundedRect(object.x, object.y, object.w, object.h, 8);
        continue;
      }

      graphics.fillStyle(object.color, 1);
      graphics.lineStyle(3, 0x111111, 1);
      graphics.fillRoundedRect(object.x, object.y, object.w, object.h, 10);
      graphics.strokeRoundedRect(object.x, object.y, object.w, object.h, 10);
    }
  }

  private drawParticles(graphics: Phaser.GameObjects.Graphics): void {
    for (const particle of this.particles) {
      const color = particle.kind === 'coin' ? 0xfff2a8 : particle.kind === 'debris' ? 0xd6b58a : 0xfff0c7;
      graphics.fillStyle(color, Math.max(0, particle.life));

      if (particle.kind === 'coin') {
        graphics.fillCircle(particle.x, particle.y, particle.radius);
      } else {
        graphics.fillRect(particle.x, particle.y, particle.radius * 2, particle.radius);
      }
    }
  }

  private drawAimLine(graphics: Phaser.GameObjects.Graphics): void {
    if (!this.mouseDown || this.isComplete) {
      return;
    }

    const charge = Phaser.Math.Clamp((this.time.now - this.chargeStart) / 1000, 0, 1.15);
    const dx = this.mouseX - this.player.x;
    const dy = this.mouseY - this.player.y;
    const aimLength = this.length(dx, dy);
    const aimX = dx / aimLength;
    const aimY = dy / aimLength;
    const color = this.styleState.superPunchTimer > 0 ? 0xfff2a8 : 0xffffff;

    graphics.lineStyle(5 + charge * 5, color, 1);
    graphics.beginPath();
    graphics.moveTo(this.player.x, this.player.y);
    graphics.lineTo(this.player.x + aimX * (75 + charge * 70), this.player.y + aimY * (75 + charge * 70));
    graphics.strokePath();
    graphics.fillStyle(color, 1);
    graphics.fillCircle(this.player.x + aimX * (80 + charge * 70), this.player.y + aimY * (80 + charge * 70), 8 + charge * 5);
  }

  private drawTouchJoystick(graphics: Phaser.GameObjects.Graphics): void {
    if (!this.touch.moveActive) {
      return;
    }

    graphics.lineStyle(4, 0xffffff, 0.32);
    graphics.strokeCircle(this.touch.joyStartX, this.touch.joyStartY, 55);
    graphics.fillStyle(0xffffff, 0.32);
    graphics.fillCircle(this.touch.joyStartX + this.touch.moveX * 45, this.touch.joyStartY + this.touch.moveY * 45, 18);
  }

  private drawPlayer(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(0x6ee7ff, 1);
    graphics.lineStyle(4, 0x111111, 1);
    graphics.fillCircle(this.player.x, this.player.y, this.player.r);
    graphics.strokeCircle(this.player.x, this.player.y, this.player.r);
    graphics.fillStyle(0x111111, 1);
    graphics.fillCircle(this.player.x + this.player.facingX * 8 - this.player.facingY * 4, this.player.y + this.player.facingY * 8 + this.player.facingX * 4, 3);
    graphics.fillCircle(this.player.x + this.player.facingX * 8 + this.player.facingY * 4, this.player.y + this.player.facingY * 8 - this.player.facingX * 4, 3);
  }

  private drawBoss(graphics: Phaser.GameObjects.Graphics): void {
    if (this.boss.launchedByPlayer) {
      graphics.lineStyle(7, 0xfff2a8, 0.25 + Math.sin(this.time.now / 60) * 0.08);
      graphics.strokeCircle(this.boss.x, this.boss.y, this.boss.r + 9);
    }

    const stretchX = 1 + this.boss.hurt * 0.8;
    const stretchY = 1 - this.boss.hurt * 0.4;
    graphics.save();
    graphics.translateCanvas(this.boss.x, this.boss.y);
    if (this.boss.spin > 0) {
      graphics.rotateCanvas((this.time.now / 60) % (Math.PI * 2));
    }
    graphics.scaleCanvas(stretchX, stretchY);
    graphics.fillStyle(this.isComplete ? 0xffb3b3 : 0xff6961, 1);
    graphics.lineStyle(4, 0x111111, 1);
    graphics.fillCircle(0, 0, this.boss.r);
    graphics.strokeCircle(0, 0, this.boss.r);
    graphics.restore();
  }

  private drawCountdown(graphics: Phaser.GameObjects.Graphics): void {
    if (!this.countdownNumber || (!this.isComplete && this.timeLeft > 5 && this.countdownPulse <= 0)) {
      return;
    }

    const alpha = Phaser.Math.Clamp(this.countdownFlash, 0, 0.7);
    graphics.fillStyle(0xff6961, alpha);
    graphics.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);
  }

  private drawFlashes(graphics: Phaser.GameObjects.Graphics): void {
    if (this.payoutFlash > 0) {
      graphics.lineStyle(18, 0xfff2a8, this.payoutFlash * 0.7);
      graphics.strokeRect(12, 12, PLAY_WIDTH - 24, PLAY_HEIGHT - 24);
    }

    if (this.flash > 0) {
      graphics.fillStyle(0xfff6d6, this.flash * 3);
      graphics.fillRect(0, 0, PLAY_WIDTH, PLAY_HEIGHT);
    }
  }

  private updateHud(): void {
    const rank = ranks[this.styleState.rankIndex];
    const next = ranks[Math.min(this.styleState.rankIndex + 1, ranks.length - 1)];
    const base = rank.threshold;
    const top = next.threshold === base ? base + 1 : next.threshold;
    const progress = this.styleState.rankIndex === ranks.length - 1 ? 1 : Phaser.Math.Clamp((this.styleState.score - base) / (top - base), 0, 1);
    const charge = this.mouseDown ? Phaser.Math.Clamp((this.time.now - this.chargeStart) / 1000, 0, 1.15) : 0;
    const urgent = this.timeLeft <= 5 && !this.isComplete;
    const pop = this.styleState.rankPop;
    const pulse = 1 + Math.sin(this.time.now / 125) * 0.035 + pop * 0.28;
    const wobble = Math.sin(this.time.now / 55) * this.styleState.rankWobble * 6.3;
    const rankSize = rank.letter.length === 3 ? 62 : rank.letter.length === 2 ? 76 : 94;

    this.rankLetter?.setText(rank.letter);
    this.rankTitle?.setText(`${rank.title}${this.styleState.multiplierTimer > 0 ? `  x${this.styleState.multiplier.toFixed(1)}` : ''}${this.styleState.superPunchTimer > 0 ? '  SUPER READY' : ''}`);
    this.styleBar?.setSize(Math.round(progress * 186), 8);
    this.timerBar?.setSize(Math.round(Phaser.Math.Clamp(this.styleState.timer / 3, 0, 1) * 78), 7);
    this.comboText?.setText(`Combo: x${this.combo}`);
    this.itemsText?.setText(`Hits: ${this.totalBreaks}`);
    this.timeText?.setText(`Time: ${this.timeLeft <= 5 ? Math.ceil(this.timeLeft).toString() : this.timeLeft.toFixed(1)}s`);
    this.timeText?.setColor(urgent ? '#ff6961' : '#ffffff');
    this.timeText?.setFontStyle(urgent ? '900' : '700');
    this.chargeText?.setText(`Charge: ${Math.round((charge / 1.15) * 100)}%`);
    this.bigRankText?.setText(rank.letter).setFontSize(rankSize).setColor(this.styleState.rankIndex >= 4 ? '#fff2a8' : '#ffffff');
    this.bigRankText?.setScale(pulse).setAngle(-7 + wobble);
    this.bigRankTitle?.setText(rank.title);
    this.styleTimerSlash?.setSize(90 * Phaser.Math.Clamp(this.styleState.timer / 3, 0, 1), 6);
  }

  private updateArenaText(): void {
    this.objectLabels.forEach((label, index) => {
      const object = this.objects[index];
      label.setText(object.broken ? 'BROKEN' : object.name);
      label.setPosition(object.x + object.w / 2, object.y + object.h / 2 + 5);
      label.setColor(object.broken ? '#ffd37d' : '#15151c');
      label.setFontSize(object.broken ? 11 : 13);
    });

    this.bossSymbol?.setPosition(this.boss.x, this.boss.y + 1).setVisible(true);

    if (this.countdownNumber && (this.countdownPulse > 0 || this.timeLeft <= 5 || this.isComplete)) {
      const scale = 1 + this.countdownPulse * 0.35;
      this.countdownText?.setVisible(true).setText(`${this.countdownNumber}`).setScale(scale);
      this.countdownText?.setAlpha(Phaser.Math.Clamp(0.25 + this.countdownPulse, 0.2, 1));
    } else {
      this.countdownText?.setVisible(false);
    }
  }

  private updateTouchMoveVector(): void {
    const dx = this.touch.joyX - this.touch.joyStartX;
    const dy = this.touch.joyY - this.touch.joyStartY;
    const distance = Math.hypot(dx, dy);
    const strength = Phaser.Math.Clamp(distance / 75, 0, 1);

    if (distance < 8) {
      this.touch.moveX = 0;
      this.touch.moveY = 0;
      return;
    }

    this.touch.moveX = (dx / distance) * strength;
    this.touch.moveY = (dy / distance) * strength;
  }

  private circleRectCollision(circle: CircleBody, rectangle: BreakableObject): boolean {
    const closestX = Phaser.Math.Clamp(circle.x, rectangle.x, rectangle.x + rectangle.w);
    const closestY = Phaser.Math.Clamp(circle.y, rectangle.y, rectangle.y + rectangle.h);
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return dx * dx + dy * dy < circle.r * circle.r;
  }

  private toPlayPoint(screenX: number, screenY: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp((screenX - this.playX) / this.playScale, 0, PLAY_WIDTH),
      Phaser.Math.Clamp((screenY - this.playY) / this.playScale, 0, PLAY_HEIGHT),
    );
  }

  private addText(x: number, y: number, text: string, size: number, color: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${size}px`,
      color,
    });
  }

  private getRankIndex(score: number): number {
    let index = 0;
    for (let i = 0; i < ranks.length; i += 1) {
      if (score >= ranks[i].threshold) {
        index = i;
      }
    }
    return index;
  }

  private length(x: number, y: number): number {
    return Math.hypot(x, y) || 1;
  }

  private distance(a: CircleBody, b: CircleBody): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private createInitialPlayer(): PlayerState {
    return {
      x: 220,
      y: 300,
      r: 18,
      speed: 320,
      facingX: 1,
      facingY: 0,
    };
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

  private createObjects(): BreakableObject[] {
    return objectTemplates.map((object) => ({
      ...object,
      broken: false,
      respawnTimer: 0,
    }));
  }

  private cleanup(): void {
    this.scale.off('resize', this.layout, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    this.input.off('pointerupoutside', this.handlePointerUp, this);
    this.input.keyboard?.off('keydown', this.handleKeyDown, this);
    this.input.keyboard?.off('keyup', this.handleKeyUp, this);
    this.floatingTexts.forEach((text) => text.label.destroy());
    this.floatingTexts = [];
    this.hudTexts.forEach((text) => text.destroy());
    this.hudTexts = [];
    this.objectLabels.forEach((text) => text.destroy());
    this.objectLabels = [];
  }
}
