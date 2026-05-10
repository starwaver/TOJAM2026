import Phaser from 'phaser';
import { SceneTransitionService } from '../../core/SceneTransitionService';
import { SceneKeys } from '../../types/SceneKeys';
import type { MiniGameSceneData } from '../../types/TaskTypes';
import { BaseMiniGameScene } from './BaseMiniGameScene';

type CupType = 'mug' | 'paper' | 'tumbler';
type Strength = 'normal' | 'strong' | 'espresso';
type Dairy = 'milk' | 'cream' | 'none';

type CoffeeOrder = {
  cup: CupType;
  strength: Strength;
  sugar: number;
  dairy: Dairy;
};

type DrinkState = {
  cup?: CupType;
  strength?: Strength;
  sugar: number;
  dairy?: Exclude<Dairy, 'none'>;
};

type ChoiceImage = Phaser.GameObjects.Image & { choiceKey?: string };

const STAGE_WIDTH = 1536;
const STAGE_HEIGHT = 1024;
const SHELF_Y = 755;
const ASSET_PATH = 'assets/coffee/';

const cupLabels: Record<CupType, string> = {
  mug: 'mug',
  paper: 'paper cup',
  tumbler: 'tumbler',
};

const strengthLabels: Record<Strength, string> = {
  normal: 'normal',
  strong: 'strong',
  espresso: 'espresso',
};

const dairyLabels: Record<Dairy, string> = {
  milk: 'milk',
  cream: 'cream',
  none: 'no dairy',
};

const cupTextureKeys: Record<CupType, string> = {
  mug: 'coffee-cup-mug',
  paper: 'coffee-cup-paper',
  tumbler: 'coffee-cup-tumbler',
};

const assetFiles: Record<string, string> = {
  'coffee-machine': 'coffee-machine.png',
  'coffee-cream-carton': 'cream-carton.png',
  'coffee-cup-mug': 'cup-mug.png',
  'coffee-cup-paper': 'cup-paper.png',
  'coffee-cup-tumbler': 'cup-tumbler.png',
  'coffee-milk-pitcher': 'milk-pitcher.png',
  'coffee-sugar-cube': 'sugar-cube.png',
  'coffee-sugar-jar': 'sugar-jar.png',
};

export class CoffeeRunScene extends BaseMiniGameScene {
  private stage?: Phaser.GameObjects.Container;
  private stationObjects: Phaser.GameObjects.GameObject[] = [];
  private choiceImages: ChoiceImage[] = [];
  private strengthZones: Phaser.GameObjects.Zone[] = [];
  private sugarCubes: Phaser.GameObjects.Image[] = [];
  private activeCup?: Phaser.GameObjects.Image;
  private requestText?: Phaser.GameObjects.Text;
  private feedbackText?: Phaser.GameObjects.Text;
  private dairyMark?: Phaser.GameObjects.Text;
  private bossZone?: Phaser.GameObjects.Zone;
  private trashZone?: Phaser.GameObjects.Zone;
  private bossDropVisual?: Phaser.GameObjects.Rectangle;
  private trashVisual?: Phaser.GameObjects.Rectangle;
  private resultGroup?: Phaser.GameObjects.Container;
  private order!: CoffeeOrder;
  private drink: DrinkState = { sugar: 0 };
  private mistakes = 0;
  private trashResets = 0;
  private served = false;
  private draggingCup = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private pendingResult?: { success: boolean; score: number; mistakes: number };

  constructor() {
    super(SceneKeys.coffeeRun);
  }

  init(data: MiniGameSceneData = {}): void {
    super.init(data);
    this.order = this.createOrder();
    this.drink = { sugar: 0 };
    this.mistakes = 0;
    this.trashResets = 0;
    this.served = false;
    this.pendingResult = undefined;
  }

  preload(): void {
    for (const [key, file] of Object.entries(assetFiles)) {
      if (!this.textures.exists(key)) {
        this.load.image(key, `${ASSET_PATH}${file}`);
      }
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#bfe5e2');
    this.createStage();
    this.layoutStage();

    this.scale.on('resize', this.layoutStage, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    if (this.mode === 'workday') {
      this.prepareTaskHud();
      this.startTaskTimer();
    }

    this.say('Pick the cup from the station.');
  }

  private createOrder(): CoffeeOrder {
    const cup = Phaser.Utils.Array.GetRandom<CupType>(['mug', 'paper', 'tumbler']);
    const strength = Phaser.Utils.Array.GetRandom<Strength>(['normal', 'strong', 'espresso']);
    const sugar = Phaser.Math.Between(0, 3);
    const dairy = Phaser.Utils.Array.GetRandom<Dairy>(['milk', 'cream', 'none']);

    return { cup, strength, sugar, dairy };
  }

  private createStage(): void {
    this.stage = this.add.container(0, 0);

    this.createBackground();
    this.createBossArea();
    this.createStation();
    this.createTrashArea();
    this.createFeedback();
    this.createRequestBubble();
  }

  private createBackground(): void {
    if (!this.stage) {
      return;
    }

    const wall = this.add.rectangle(0, 0, STAGE_WIDTH, STAGE_HEIGHT, 0xc9843e).setOrigin(0);
    const frame = this.add.rectangle(14, 14, STAGE_WIDTH - 28, STAGE_HEIGHT - 28).setOrigin(0).setStrokeStyle(5, 0x6a3f1f);
    const shelf = this.add.rectangle(STAGE_WIDTH / 2, SHELF_Y + 14, STAGE_WIDTH - 32, 72, 0x9b5f27);
    const shelfTop = this.add.rectangle(STAGE_WIDTH / 2, SHELF_Y - 26, STAGE_WIDTH - 32, 28, 0xb87532);
    const shelfLip = this.add.rectangle(STAGE_WIDTH / 2, SHELF_Y + 58, STAGE_WIDTH - 58, 22, 0x7a431d);

    wall.setDepth(-20);
    frame.setDepth(-19);
    shelf.setDepth(-18);
    shelfTop.setDepth(-17);
    shelfLip.setDepth(-16);
    this.stage.add([wall, frame, shelf, shelfTop, shelfLip]);
  }

  private createBossArea(): void {
    if (!this.stage) {
      return;
    }

    const bossPlate = this.add.rectangle(1344, 184, 260, 220, 0x2b3842, 0.94).setStrokeStyle(4, 0xf2c14e);
    const bossHead = this.add.circle(1344, 144, 54, 0xf5c39b).setStrokeStyle(4, 0x3a251b);
    const hair = this.add.rectangle(1344, 104, 96, 34, 0x33251f);
    const body = this.add.triangle(1344, 254, 1270, 318, 1418, 318, 1344, 176, 0x204f75);
    const eyeLeft = this.add.circle(1324, 142, 5, 0x101820);
    const eyeRight = this.add.circle(1364, 142, 5, 0x101820);
    const mouth = this.add.rectangle(1344, 174, 48, 5, 0x7d2f2f);
    const label = this.add
      .text(1344, 42, 'BOSS', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontStyle: '700',
        color: '#f8f5f0',
      })
      .setOrigin(0.5);

    this.bossDropVisual = this.add.rectangle(1344, 358, 250, 86, 0x68d391, 0.18).setStrokeStyle(4, 0x68d391, 0.75);
    this.bossZone = this.add.zone(1344, 358, 250, 112).setRectangleDropZone(250, 112);

    this.stage.add([bossPlate, body, bossHead, hair, eyeLeft, eyeRight, mouth, label, this.bossDropVisual, this.bossZone]);
  }

  private createStation(): void {
    if (!this.stage) {
      return;
    }

    const mug = this.addChoiceImage(110, 665, cupTextureKeys.mug, 'mug', 172);
    const paper = this.addChoiceImage(275, 655, cupTextureKeys.paper, 'paper', 238);
    const tumbler = this.addChoiceImage(430, 637, cupTextureKeys.tumbler, 'tumbler', 286);
    const machine = this.add.image(708, 490, 'coffee-machine').setDisplaySize(388, 522).setDepth(2);
    const milk = this.addChoiceImage(1010, 650, 'coffee-milk-pitcher', 'milk', 270);
    const sugar = this.addChoiceImage(1194, 660, 'coffee-sugar-jar', 'sugar', 218);
    const cream = this.addChoiceImage(1404, 650, 'coffee-cream-carton', 'cream', 320);

    this.stage.add([mug, paper, tumbler, machine, milk, sugar, cream]);
    this.stationObjects.push(mug, paper, tumbler, machine, milk, sugar, cream);
    this.createStrengthZones();
  }

  private addChoiceImage(x: number, y: number, texture: string, choiceKey: string, displayHeight: number): ChoiceImage {
    const image = this.add.image(x, y, texture) as ChoiceImage;
    const scale = displayHeight / image.height;
    image.setDisplaySize(image.width * scale, displayHeight);
    image.setInteractive({ useHandCursor: true });
    image.choiceKey = choiceKey;
    image.on('pointerdown', () => this.handleChoice(choiceKey));
    image.on('pointerover', () => image.setTint(0xfff2a8));
    image.on('pointerout', () => this.refreshChoiceTints());
    this.choiceImages.push(image);
    return image;
  }

  private createStrengthZones(): void {
    if (!this.stage) {
      return;
    }

    const defs: { key: Strength; x: number }[] = [
      { key: 'normal', x: 596 },
      { key: 'strong', x: 708 },
      { key: 'espresso', x: 820 },
    ];

    for (const def of defs) {
      const zone = this.add.zone(def.x, 704, 96, 54).setRectangleDropZone(96, 54).setInteractive({ useHandCursor: true });
      zone.setData('strength', def.key);
      zone.on('pointerdown', () => this.chooseStrength(def.key));
      zone.on('pointerover', () => this.highlightStrength(def.key, true));
      zone.on('pointerout', () => this.highlightStrength(def.key, false));
      this.stage.add(zone);
      this.strengthZones.push(zone);
    }
  }

  private createTrashArea(): void {
    if (!this.stage) {
      return;
    }

    this.trashVisual = this.add.rectangle(116, 892, 154, 120, 0x30373c, 0.95).setStrokeStyle(4, 0xcbd5e0);
    const lid = this.add.rectangle(116, 818, 170, 24, 0x46525a).setStrokeStyle(3, 0x1a2028);
    const lines = [
      this.add.line(82, 892, 0, -40, 0, 40, 0x718096, 0.7).setLineWidth(3),
      this.add.line(116, 892, 0, -44, 0, 44, 0x718096, 0.7).setLineWidth(3),
      this.add.line(150, 892, 0, -40, 0, 40, 0x718096, 0.7).setLineWidth(3),
    ];
    const label = this.add
      .text(116, 974, 'TRASH', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: '700',
        color: '#f8f5f0',
      })
      .setOrigin(0.5);
    this.trashZone = this.add.zone(116, 892, 188, 180).setRectangleDropZone(188, 180);
    this.stage.add([this.trashVisual, lid, ...lines, label, this.trashZone]);
  }

  private createFeedback(): void {
    if (!this.stage) {
      return;
    }

    this.feedbackText = this.add
      .text(428, 88, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontStyle: '700',
        color: '#fff7d6',
        align: 'center',
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5);
    this.stage.add(this.feedbackText);
  }

  private createRequestBubble(): void {
    if (!this.stage) {
      return;
    }

    const bubble = this.add.rectangle(1054, 130, 548, 148, 0xfff7d6, 0.96).setStrokeStyle(4, 0x7a4b22);
    const tail = this.add.triangle(1232, 210, 0, 0, 82, 0, 82, 54, 0xfff7d6, 0.96).setStrokeStyle(4, 0x7a4b22);
    this.requestText = this.add
      .text(1054, 130, this.getOrderText(), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        fontStyle: '700',
        color: '#32250f',
        align: 'center',
        wordWrap: { width: 490 },
      })
      .setOrigin(0.5);
    this.stage.add([bubble, tail, this.requestText]);
  }

  private getOrderText(): string {
    const sugarText = this.order.sugar === 1 ? '1 sugar' : `${this.order.sugar} sugars`;
    return `I need a ${strengthLabels[this.order.strength]} ${cupLabels[this.order.cup]}.\n${sugarText}. ${dairyLabels[this.order.dairy]}.`;
  }

  private handleChoice(choiceKey: string): void {
    if (this.served || this.resultGroup) {
      return;
    }

    if (choiceKey === 'sugar') {
      this.addSugar();
      return;
    }

    if (choiceKey === 'milk' || choiceKey === 'cream') {
      this.chooseDairy(choiceKey);
      return;
    }

    this.chooseCup(choiceKey as CupType);
  }

  private chooseCup(cup: CupType): void {
    if (this.drink.cup) {
      this.markMistake('Cup already picked. Trash it if you want to restart.');
      return;
    }

    this.drink.cup = cup;
    this.spawnActiveCup(cup);
    this.refreshChoiceTints();
    this.say('Now press the matching coffee strength button.');
  }

  private chooseStrength(strength: Strength): void {
    if (!this.drink.cup) {
      this.markMistake('Cup first.');
      return;
    }

    if (this.drink.strength) {
      this.markMistake('Coffee is already poured. Use the trash can to restart.');
      return;
    }

    this.drink.strength = strength;
    this.tintActiveCup(0x8b5a2b);
    this.say('Add sugar and dairy, or drag the cup to serve.');
  }

  private addSugar(): void {
    if (!this.drink.cup || !this.drink.strength) {
      this.markMistake('Pour coffee before adding sugar.');
      return;
    }

    if (this.drink.sugar >= 3) {
      this.markMistake('That is already the maximum sugar.');
      return;
    }

    this.drink.sugar += 1;
    this.renderSugarCubes();
    this.say(`${this.drink.sugar} sugar ${this.drink.sugar === 1 ? 'cube' : 'cubes'} added.`);
  }

  private chooseDairy(dairy: Exclude<Dairy, 'none'>): void {
    if (!this.drink.cup || !this.drink.strength) {
      this.markMistake('Pour coffee before adding dairy.');
      return;
    }

    this.drink.dairy = dairy;
    this.renderDairyMark(dairy);
    this.say(`${dairy === 'milk' ? 'Milk' : 'Cream'} added. Drag the cup to the boss when ready.`);
    this.refreshChoiceTints();
  }

  private spawnActiveCup(cup: CupType): void {
    if (!this.stage) {
      return;
    }

    this.activeCup?.destroy();
    this.dairyMark?.destroy();
    this.clearSugarCubes();

    const displayHeight = cup === 'tumbler' ? 198 : cup === 'paper' ? 178 : 160;
    const activeCup = this.add.image(708, 610, cupTextureKeys[cup]).setDisplaySize(10, displayHeight).setDepth(10);
    const scale = displayHeight / activeCup.height;
    activeCup.setDisplaySize(activeCup.width * scale, displayHeight);
    activeCup.setInteractive({ useHandCursor: true });
    activeCup.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.startCupDrag(pointer));
    this.stage.add(activeCup);
    this.activeCup = activeCup;
  }

  private tintActiveCup(color: number): void {
    this.activeCup?.setTint(color);
    this.time.delayedCall(160, () => this.activeCup?.clearTint());
  }

  private renderSugarCubes(): void {
    if (!this.stage || !this.activeCup) {
      return;
    }

    this.clearSugarCubes();
    for (let index = 0; index < this.drink.sugar; index += 1) {
      const cube = this.add
        .image(this.activeCup.x - 28 + index * 28, this.activeCup.y - this.activeCup.displayHeight * 0.24, 'coffee-sugar-cube')
        .setDisplaySize(28, 30)
        .setDepth(21);
      this.stage.add(cube);
      this.sugarCubes.push(cube);
    }
  }

  private renderDairyMark(dairy: Exclude<Dairy, 'none'>): void {
    if (!this.stage || !this.activeCup) {
      return;
    }

    this.dairyMark?.destroy();
    this.dairyMark = this.add
      .text(this.activeCup.x, this.activeCup.y + this.activeCup.displayHeight * 0.18, dairy === 'milk' ? 'MILK' : 'CREAM', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: '700',
        color: dairy === 'milk' ? '#f7efd1' : '#fff8f0',
        backgroundColor: dairy === 'milk' ? '#6b8796' : '#1f5f94',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(22);
    this.stage.add(this.dairyMark);
  }

  private startCupDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.stage || !this.activeCup || this.resultGroup) {
      return;
    }

    const local = this.toStagePoint(pointer);
    this.draggingCup = true;
    this.dragOffsetX = this.activeCup.x - local.x;
    this.dragOffsetY = this.activeCup.y - local.y;
    this.activeCup.setDepth(30);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingCup || !this.activeCup) {
      return;
    }

    const local = this.toStagePoint(pointer);
    this.activeCup.setPosition(local.x + this.dragOffsetX, local.y + this.dragOffsetY);
    this.syncCupAddOns();
    this.updateDropHighlights();
  }

  private handlePointerUp(): void {
    if (!this.draggingCup) {
      return;
    }

    this.draggingCup = false;
    this.updateDropHighlights(false);

    if (this.isCupOverZone(this.trashZone)) {
      this.discardDrink();
      return;
    }

    if (this.isCupOverZone(this.bossZone)) {
      this.serveDrink();
      return;
    }

    this.returnCupToMachine();
  }

  private toStagePoint(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    const scale = this.stage?.scaleX || 1;
    return new Phaser.Math.Vector2((pointer.x - (this.stage?.x ?? 0)) / scale, (pointer.y - (this.stage?.y ?? 0)) / scale);
  }

  private isCupOverZone(zone?: Phaser.GameObjects.Zone): boolean {
    if (!zone || !this.activeCup) {
      return false;
    }

    const halfW = zone.width / 2;
    const halfH = zone.height / 2;
    return this.activeCup.x >= zone.x - halfW && this.activeCup.x <= zone.x + halfW && this.activeCup.y >= zone.y - halfH && this.activeCup.y <= zone.y + halfH;
  }

  private discardDrink(): void {
    if (!this.activeCup) {
      return;
    }

    this.trashResets += 1;
    this.mistakes += 1;
    this.activeCup.destroy();
    this.activeCup = undefined;
    this.dairyMark?.destroy();
    this.dairyMark = undefined;
    this.clearSugarCubes();
    this.drink = { sugar: 0 };
    this.refreshChoiceTints();
    this.say('Coffee trashed. Start again with a cup.');
  }

  private serveDrink(): void {
    if (this.served) {
      return;
    }

    if (!this.drink.cup || !this.drink.strength) {
      this.markMistake('That cup is not ready yet.');
      this.returnCupToMachine();
      return;
    }

    this.served = true;
    const dairy = this.drink.dairy ?? 'none';
    const wrongParts = [
      this.drink.cup !== this.order.cup,
      this.drink.strength !== this.order.strength,
      this.drink.sugar !== this.order.sugar,
      dairy !== this.order.dairy,
    ].filter(Boolean).length;
    const totalMistakes = this.mistakes + wrongParts;
    const success = wrongParts === 0;
    const timeBonus = Math.round(this.getTaskTimeRemaining() * 10);
    const score = Math.max(0, 600 + timeBonus - totalMistakes * 140 - this.trashResets * 50);

    this.pendingResult = { success, score, mistakes: totalMistakes };
    this.showResult(success, score, wrongParts);
  }

  private showResult(success: boolean, score: number, wrongParts: number): void {
    if (!this.stage) {
      return;
    }

    const shade = this.add.rectangle(STAGE_WIDTH / 2, STAGE_HEIGHT / 2, STAGE_WIDTH, STAGE_HEIGHT, 0x101820, 0.72);
    const panel = this.add.rectangle(STAGE_WIDTH / 2, STAGE_HEIGHT / 2, 640, 280, 0xfff7d6, 0.98).setStrokeStyle(5, success ? 0x68d391 : 0xe74c3c);
    const title = this.add
      .text(STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - 84, success ? 'Boss Approved' : 'Boss Is Suspicious', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        fontStyle: '700',
        color: '#32250f',
      })
      .setOrigin(0.5);
    const body = this.add
      .text(
        STAGE_WIDTH / 2,
        STAGE_HEIGHT / 2 - 16,
        success ? `Perfect coffee. Score: ${score}` : `${wrongParts} part${wrongParts === 1 ? '' : 's'} wrong. Score: ${score}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          color: '#32250f',
          align: 'center',
          wordWrap: { width: 560 },
        },
      )
      .setOrigin(0.5);
    const actionLabel = this.mode === 'workday' ? 'Finish Task' : 'Make Another';
    const actionX = this.mode === 'workday' ? STAGE_WIDTH / 2 : STAGE_WIDTH / 2 - 112;
    const action = this.createResultButton(actionX, STAGE_HEIGHT / 2 + 82, actionLabel, () => this.handleResultAction());
    const buttons: Phaser.GameObjects.Container[] = [action];

    if (this.mode !== 'workday') {
      buttons.push(
        this.createResultButton(STAGE_WIDTH / 2 + 132, STAGE_HEIGHT / 2 + 82, 'Home', () => {
          SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.mainMenu });
        }),
      );
    }

    this.resultGroup = this.add.container(0, 0, [shade, panel, title, body, ...buttons]).setDepth(100);
    this.stage.add(this.resultGroup);
  }

  private createResultButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 196, 56, 0xf2c14e).setStrokeStyle(3, 0x32250f).setInteractive({ useHandCursor: true });
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: '700',
        color: '#101820',
      })
      .setOrigin(0.5);
    const button = this.add.container(x, y, [bg, text]);
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => bg.setFillStyle(0xffd166));
    bg.on('pointerout', () => bg.setFillStyle(0xf2c14e));
    return button;
  }

  private handleResultAction(): void {
    if (this.mode === 'workday' && this.pendingResult) {
      this.completeTask(this.pendingResult.success, this.pendingResult.score, this.pendingResult.mistakes);
      return;
    }

    this.scene.restart({ mode: this.mode, taskConfig: this.taskConfig } satisfies MiniGameSceneData);
  }

  private returnCupToMachine(): void {
    if (!this.activeCup) {
      return;
    }

    this.tweens.add({
      targets: this.activeCup,
      x: 708,
      y: 610,
      duration: 180,
      ease: 'Sine.easeOut',
      onUpdate: () => this.syncCupAddOns(),
      onComplete: () => this.syncCupAddOns(),
    });
  }

  private syncCupAddOns(): void {
    if (!this.activeCup) {
      return;
    }

    this.sugarCubes.forEach((cube, index) => {
      cube.setPosition(this.activeCup!.x - 28 + index * 28, this.activeCup!.y - this.activeCup!.displayHeight * 0.24);
    });
    this.dairyMark?.setPosition(this.activeCup.x, this.activeCup.y + this.activeCup.displayHeight * 0.18);
  }

  private updateDropHighlights(active = true): void {
    const overBoss = active && this.isCupOverZone(this.bossZone);
    const overTrash = active && this.isCupOverZone(this.trashZone);
    this.bossDropVisual?.setFillStyle(0x68d391, overBoss ? 0.42 : 0.18);
    this.trashVisual?.setFillStyle(overTrash ? 0xe74c3c : 0x30373c, 0.95);
  }

  private highlightStrength(strength: Strength, active: boolean): void {
    if (!this.stage || !active) {
      this.refreshChoiceTints();
      return;
    }

    const zone = this.strengthZones.find((candidate) => candidate.getData('strength') === strength);
    if (!zone) {
      return;
    }

    const glow = this.add.rectangle(zone.x, zone.y, zone.width, zone.height, 0xfff2a8, 0.24).setDepth(8);
    glow.setData('temporary-strength-glow', true);
    this.stage.add(glow);
    this.time.delayedCall(120, () => glow.destroy());
  }

  private refreshChoiceTints(): void {
    for (const image of this.choiceImages) {
      const selected =
        image.choiceKey === this.drink.cup ||
        image.choiceKey === this.drink.dairy ||
        (image.choiceKey === 'sugar' && this.drink.sugar > 0);
      if (selected) {
        image.setTint(0xffd166);
      } else {
        image.clearTint();
      }
    }
  }

  private clearSugarCubes(): void {
    this.sugarCubes.forEach((cube) => cube.destroy());
    this.sugarCubes = [];
  }

  private markMistake(message: string): void {
    this.mistakes += 1;
    this.say(message);
    this.cameras.main.shake(120, 0.004);
  }

  private say(message: string): void {
    this.feedbackText?.setText(message);
  }

  private layoutStage(): void {
    if (!this.stage) {
      return;
    }

    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;
    const scale = Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT);
    this.stage.setScale(scale);
    this.stage.setPosition((width - STAGE_WIDTH * scale) / 2, (height - STAGE_HEIGHT * scale) / 2);
  }

  private cleanup(): void {
    this.scale.off('resize', this.layoutStage, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    this.cleanupMiniGame();
    this.stationObjects = [];
    this.choiceImages = [];
    this.strengthZones = [];
    this.sugarCubes = [];
    this.activeCup = undefined;
    this.requestText = undefined;
    this.feedbackText = undefined;
    this.dairyMark = undefined;
    this.bossZone = undefined;
    this.trashZone = undefined;
    this.bossDropVisual = undefined;
    this.trashVisual = undefined;
    this.resultGroup = undefined;
    this.draggingCup = false;
    this.stage = undefined;
  }
}
