import Phaser from 'phaser';
import { OfficeAssetFrames, OfficeAssets, type OfficeAssetFrame } from '../assets/OfficeAssets';
import { BalanceConfig } from '../config/BalanceConfig';
import { GameState } from '../core/GameState';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { DifficultySystem } from '../systems/DifficultySystem';
import { RageSystem } from '../systems/RageSystem';
import { SanitySystem } from '../systems/SanitySystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { TaskRegistry } from '../data/TaskRegistry';
import { SceneKeys } from '../types/SceneKeys';
import type { TaskConfig, TaskDefinition, TaskResult, WorkdaySceneData } from '../types/TaskTypes';

type OfficeLayout = {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

type OfficeItemKind = 'atlas' | 'worker' | 'boss';

type OfficeSceneItem = {
  id: string;
  kind: OfficeItemKind;
  x: number;
  y: number;
  scale: number;
  frame?: OfficeAssetFrame;
  flipX?: boolean;
};

type RenderedOfficeItem = {
  config: OfficeSceneItem;
  gameObject: Phaser.GameObjects.Image | Phaser.GameObjects.Container;
};

const OFFICE_BACKGROUND_WIDTH = 1448;
const OFFICE_BACKGROUND_HEIGHT = 1086;
const OFFICE_DEPTH = 100;
const UI_DEPTH = 5000;
const OFFICE_LAYOUT_STORAGE_KEY = 'tojam2026.workdayOfficeLayout.v1';

const DEFAULT_OFFICE_ITEMS: OfficeSceneItem[] = [
  { id: 'plant-left', kind: 'atlas', frame: OfficeAssetFrames.tallPottedPlant, x: 108, y: 282, scale: 1.45 },
  { id: 'cabinet-boss', kind: 'atlas', frame: OfficeAssetFrames.lowCabinetWithPlant, x: 1214, y: 318, scale: 1.28 },
  { id: 'water-cooler', kind: 'atlas', frame: OfficeAssetFrames.waterCooler, x: 1035, y: 330, scale: 1.35 },
  { id: 'file-cabinet-top-1', kind: 'atlas', frame: OfficeAssetFrames.fileCabinetSingle03, x: 1322, y: 320, scale: 1.2 },
  { id: 'file-cabinet-top-2', kind: 'atlas', frame: OfficeAssetFrames.fileCabinetSingle02, x: 1374, y: 320, scale: 1.2 },
  { id: 'bookcase-left', kind: 'atlas', frame: OfficeAssetFrames.bookcaseNormal, x: 370, y: 602, scale: 1.38 },
  { id: 'storage-right', kind: 'atlas', frame: OfficeAssetFrames.storageCabinetNormal, x: 1080, y: 610, scale: 1.28 },
  { id: 'coffee-table', kind: 'atlas', frame: OfficeAssetFrames.coffeeStationTable, x: 170, y: 646, scale: 1.45 },
  { id: 'trash-can', kind: 'atlas', frame: OfficeAssetFrames.trashCan, x: 89, y: 674, scale: 1.25 },
  { id: 'copier', kind: 'atlas', frame: OfficeAssetFrames.copierNormal, x: 1246, y: 724, scale: 1.35 },
  { id: 'worker-desks', kind: 'atlas', frame: OfficeAssetFrames.doubleDesksNormal, x: 285, y: 934, scale: 1.6 },
  { id: 'desk-center', kind: 'atlas', frame: OfficeAssetFrames.singleDeskNormal, x: 630, y: 904, scale: 1.68 },
  { id: 'desk-broken', kind: 'atlas', frame: OfficeAssetFrames.singleDeskBroken, x: 890, y: 934, scale: 1.55 },
  { id: 'filing-bottom', kind: 'atlas', frame: OfficeAssetFrames.filingCabinetsNormal, x: 1086, y: 960, scale: 1.18 },
  { id: 'boxes-bottom', kind: 'atlas', frame: OfficeAssetFrames.cardboardStackLarge, x: 1370, y: 966, scale: 1.35 },
  { id: 'door-mat', kind: 'atlas', frame: OfficeAssetFrames.doorMat02, x: 88, y: 944, scale: 1.45 },
  { id: 'worker', kind: 'worker', x: 155, y: 906, scale: 1.35 },
  { id: 'boss', kind: 'boss', x: 1278, y: 378, scale: 1.35 },
];

type VisibleGameObject = Phaser.GameObjects.GameObject & {
  setVisible(value: boolean): VisibleGameObject;
};

export class WorkdayScene extends Phaser.Scene {
  private taskResult?: TaskResult;
  private officeLayout?: OfficeLayout;
  private officeItems: RenderedOfficeItem[] = [];
  private selectedItemId?: string;
  private selectionBox?: Phaser.GameObjects.Rectangle;
  private taskUiObjects: VisibleGameObject[] = [];
  private editorEnabled = false;
  private editorRoot?: HTMLDivElement;
  private editorPanel?: HTMLDivElement;
  private editorToggleButton?: HTMLButtonElement;
  private editorFrameSelect?: HTMLSelectElement;
  private editorStatus?: HTMLDivElement;

  constructor() {
    super(SceneKeys.workday);
  }

  init(data: WorkdaySceneData = {}): void {
    this.taskResult = data.taskResult;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#18242d');
    this.createOffice();
    this.mountEditorUi();
    this.bindEditorInput();

    if (this.taskResult) {
      this.applyTaskResult(this.taskResult);
      this.taskResult = undefined;
    }

    this.routeNext();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  private applyTaskResult(result: TaskResult): void {
    const state = GameState.data;

    ScoreSystem.applyTaskResult(state, result);
    SanitySystem.applyTaskResult(state, result);
    RageSystem.applyTaskResult(state, result);

    state.dayProgress = Phaser.Math.Clamp(
      state.dayProgress + BalanceConfig.dayProgressPerTask,
      0,
      BalanceConfig.dayCompleteProgress,
    );
    state.difficultyLevel = DifficultySystem.getDifficulty(state.completedTasks + state.failedTasks);
    GameState.setCurrentTask(null);
    GameState.clampVitals();
  }

  private routeNext(): void {
    const state = GameState.data;

    if (RageSystem.isFull(state)) {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.bossFight });
      return;
    }

    if (SanitySystem.isDepleted(state)) {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.gameOver });
      return;
    }

    if (state.dayProgress >= BalanceConfig.dayCompleteProgress) {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.results });
      return;
    }

    this.showTaskSelection();
  }

  private showTaskSelection(): void {
    const state = GameState.data;
    const difficulty = DifficultySystem.getDifficulty(state.completedTasks + state.failedTasks);
    const cx = this.scale.width / 2;
    const panelWidth = Math.min(430, this.scale.width - 32);
    const panelHeight = Math.min(560, this.scale.height - 36);
    const panelY = Math.max(18, this.scale.height / 2 - panelHeight / 2);
    const titleY = panelY + 38;
    const progressY = panelY + 76;

    this.addTaskUiObject(
      this.add
        .rectangle(cx, panelY + panelHeight / 2, panelWidth, panelHeight, 0x101820, 0.82)
        .setStrokeStyle(2, 0xf2c14e, 0.45)
        .setDepth(UI_DEPTH - 1),
    );

    this.addTaskUiObject(
      this.add
        .text(cx, titleY, "BOSS'S TASKS", {
          fontFamily: 'Arial, sans-serif',
          fontSize: '32px',
          fontStyle: '700',
          color: '#f2c14e',
        })
        .setOrigin(0.5)
        .setDepth(UI_DEPTH),
    );

    this.addTaskUiObject(
      this.add
        .text(cx, progressY, `Day Progress: ${Math.round(state.dayProgress)}%`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          color: '#9ed8db',
        })
        .setOrigin(0.5)
        .setDepth(UI_DEPTH),
    );

    const meterWidth = 220;
    const meterHeight = 18;
    const meterX = cx - meterWidth / 2;

    const sanityY = panelY + 132;
    this.createMeter(
      `Sanity: ${Math.round(state.sanity)}/${BalanceConfig.maxSanity}`,
      state.sanity,
      BalanceConfig.maxSanity,
      meterX,
      sanityY,
      meterWidth,
      meterHeight,
      0x4ecdc4,
      '#4ecdc4',
    );

    const rageY = sanityY + 56;
    this.createMeter(
      `Rage: ${Math.round(state.rage)}/${BalanceConfig.maxRage}`,
      state.rage,
      BalanceConfig.maxRage,
      meterX,
      rageY,
      meterWidth,
      meterHeight,
      0xe74c3c,
      '#e74c3c',
    );

    const eligibleTasks = TaskRegistry.filter(
      (task) => difficulty >= task.minDifficulty && difficulty <= task.maxDifficulty,
    );

    const startY = rageY + 78;
    const buttonSpacing = 72;

    if (eligibleTasks.length === 0) {
      this.addTaskUiObject(
        this.add
          .text(cx, startY, 'No tasks available!', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#f8f5f0',
          })
          .setOrigin(0.5)
          .setDepth(UI_DEPTH),
      );
      return;
    }

    eligibleTasks.forEach((task, index) => {
      const y = startY + index * buttonSpacing;
      this.createTaskButton(task, cx, y, difficulty);
    });
  }

  private createMeter(
    label: string,
    value: number,
    maxValue: number,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number,
    labelColor: string,
  ): void {
    this.addTaskUiObject(
      this.add
        .text(x, y - 32, label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          fontStyle: '700',
          color: labelColor,
        })
        .setDepth(UI_DEPTH),
    );

    this.addTaskUiObject(this.add.rectangle(x, y, width, height, 0x2a3a4a).setOrigin(0, 0.5).setDepth(UI_DEPTH));
    const fillWidth = Phaser.Math.Clamp(value / maxValue, 0, 1) * width;
    this.addTaskUiObject(this.add.rectangle(x, y, fillWidth, height, fillColor).setOrigin(0, 0.5).setDepth(UI_DEPTH));
  }

  private createTaskButton(task: TaskDefinition, x: number, y: number, difficulty: number): void {
    const state = GameState.data;
    const buttonWidth = 320;
    const buttonHeight = 58;

    const bg = this.add
      .rectangle(x, y, buttonWidth, buttonHeight, 0x2a3a4a)
      .setStrokeStyle(2, 0xf2c14e)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(x, y - 10, task.displayName, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: '700',
        color: '#f8f5f0',
      })
      .setOrigin(0.5);

    const timeLimit = SanitySystem.getActualTimeLimit(task.baseTimeLimit, state.sanity);
    const subLabel = this.add
      .text(x, y + 14, `Time: ${timeLimit.toFixed(1)}s  |  Difficulty: ${difficulty}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#9ed8db',
      })
      .setOrigin(0.5);

    const button = this.add.container(0, 0, [bg, label, subLabel]).setDepth(UI_DEPTH);
    bg.setDepth(UI_DEPTH);
    label.setDepth(UI_DEPTH + 1);
    subLabel.setDepth(UI_DEPTH + 1);
    this.addTaskUiObject(button);

    bg.on('pointerdown', () => {
      this.selectTask(task, difficulty);
    });
    bg.on('pointerover', () => bg.setFillStyle(0x3a4a5a));
    bg.on('pointerout', () => bg.setFillStyle(0x2a3a4a));
  }

  private selectTask(task: TaskDefinition, difficulty: number): void {
    const state = GameState.data;
    const taskConfig: TaskConfig = {
      id: task.id,
      displayName: task.displayName,
      baseTimeLimit: task.baseTimeLimit,
      actualTimeLimit: SanitySystem.getActualTimeLimit(task.baseTimeLimit, state.sanity),
      difficulty,
      sanityAtStart: state.sanity,
      rageAtStart: state.rage,
    };

    state.difficultyLevel = difficulty;
    GameState.setCurrentTask(task.id);

    SceneTransitionService.start(this, {
      kind: 'immediate',
      target: SceneKeys.taskIntro,
      data: {
        taskConfig,
        returnScene: task.scene,
      },
    });
  }

  private createOffice(): void {
    const layout = this.getOfficeLayout();
    this.officeLayout = layout;

    this.add
      .image(layout.offsetX, layout.offsetY, OfficeAssets.backgroundKey)
      .setOrigin(0)
      .setDisplaySize(layout.width, layout.height)
      .setDepth(OFFICE_DEPTH);

    this.add
      .rectangle(
        layout.offsetX + layout.width / 2,
        layout.offsetY + layout.height * 0.58,
        layout.width,
        layout.height * 0.72,
        0x0d1715,
        0.08,
      )
      .setDepth(OFFICE_DEPTH + 1);

    for (const item of this.getStoredOfficeItems()) {
      this.renderOfficeItem(layout, item);
    }
  }

  private getOfficeLayout(): OfficeLayout {
    const scale = Math.min(this.scale.width / OFFICE_BACKGROUND_WIDTH, this.scale.height / OFFICE_BACKGROUND_HEIGHT);
    const width = OFFICE_BACKGROUND_WIDTH * scale;
    const height = OFFICE_BACKGROUND_HEIGHT * scale;

    return {
      scale,
      width,
      height,
      offsetX: (this.scale.width - width) / 2,
      offsetY: (this.scale.height - height) / 2,
    };
  }

  private renderOfficeItem(layout: OfficeLayout, config: OfficeSceneItem): RenderedOfficeItem {
    const gameObject =
      config.kind === 'atlas'
        ? this.createOfficeProp(layout, config)
        : this.createCharacterByKind(layout, config);

    gameObject.setData('officeItemId', config.id);
    this.officeItems.push({ config, gameObject });
    this.applyEditorInteractivity(gameObject);
    return { config, gameObject };
  }

  private createOfficeProp(layout: OfficeLayout, config: OfficeSceneItem): Phaser.GameObjects.Image {
    const prop = this.add
      .image(this.officeX(layout, config.x), this.officeY(layout, config.y), OfficeAssets.textureKey, config.frame)
      .setOrigin(0.5, 1)
      .setScale(config.scale * layout.scale)
      .setDepth(this.officeDepth(layout, config.y));

    prop.setFlipX(Boolean(config.flipX));
    return prop;
  }

  private createCharacterByKind(layout: OfficeLayout, config: OfficeSceneItem): Phaser.GameObjects.Container {
    if (config.kind === 'boss') {
      return this.createBoss(layout, config);
    }

    return this.createWorker(layout, config);
  }

  private createWorker(layout: OfficeLayout, config: OfficeSceneItem): Phaser.GameObjects.Container {
    const worker = this.createCharacter(layout, config, {
      shirt: 0x3f9fb2,
      jacket: 0x1d4f5c,
      pants: 0x203447,
      hair: 0x2a1a14,
      accent: 0xf2c14e,
      skin: 0xd49a6a,
    });

    worker.add(this.add.rectangle(26, -50, 18, 28, 0xf7f2dc).setStrokeStyle(2, 0x28313b));
    worker.add(this.add.line(0, 0, 17, -55, 35, -55, 0x34495e, 2));
    worker.add(this.add.line(0, 0, 17, -47, 33, -47, 0x34495e, 2));
    return worker;
  }

  private createBoss(layout: OfficeLayout, config: OfficeSceneItem): Phaser.GameObjects.Container {
    const boss = this.createCharacter(layout, config, {
      shirt: 0x78313f,
      jacket: 0x2a2530,
      pants: 0x191821,
      hair: 0x47301c,
      accent: 0xf2c14e,
      skin: 0xc9845d,
    });

    boss.add(this.add.rectangle(36, -76, 38, 24, 0xfff7d6).setStrokeStyle(2, 0x7a4a21));
    boss.add(this.add.triangle(52, -88, 0, 18, 20, 18, 10, 0, 0xf2c14e));
    boss.add(this.add.rectangle(36, -76, 4, 10, 0x7a4a21));
    return boss;
  }

  private createCharacter(
    layout: OfficeLayout,
    config: OfficeSceneItem,
    palette: {
      shirt: number;
      jacket: number;
      pants: number;
      hair: number;
      accent: number;
      skin: number;
    },
  ): Phaser.GameObjects.Container {
    const character = this.add
      .container(this.officeX(layout, config.x), this.officeY(layout, config.y))
      .setScale(layout.scale * config.scale)
      .setDepth(this.officeDepth(layout, config.y) + 12);

    character.add(this.add.ellipse(0, 8, 70, 22, 0x000000, 0.24));
    character.add(this.add.rectangle(-13, -14, 13, 42, palette.pants));
    character.add(this.add.rectangle(13, -14, 13, 42, palette.pants));
    character.add(this.add.rectangle(0, -48, 42, 54, palette.jacket).setStrokeStyle(2, 0x101820, 0.55));
    character.add(this.add.rectangle(0, -50, 24, 48, palette.shirt));
    character.add(this.add.triangle(0, -36, -8, -58, 8, -58, 0, -38, palette.accent));
    character.add(this.add.circle(0, -88, 20, palette.skin).setStrokeStyle(2, 0x101820, 0.4));
    character.add(this.add.rectangle(0, -108, 36, 14, palette.hair));
    character.add(this.add.circle(-7, -90, 2, 0x101820));
    character.add(this.add.circle(8, -90, 2, 0x101820));
    character.add(this.add.rectangle(0, -79, 12, 2, 0x5a2f28));

    return character;
  }

  private mountEditorUi(): void {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app || this.editorRoot) {
      return;
    }

    const root = document.createElement('div');
    root.style.position = 'absolute';
    root.style.top = '12px';
    root.style.left = '12px';
    root.style.zIndex = '5';
    root.style.display = 'grid';
    root.style.gap = '8px';
    root.style.width = 'min(300px, calc(100vw - 24px))';
    root.style.font = '700 13px Arial, sans-serif';
    root.style.color = '#f8f5f0';
    root.style.pointerEvents = 'auto';
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    root.addEventListener('click', (event) => event.stopPropagation());

    const toggle = this.createEditorButton('Edit Scene');
    toggle.addEventListener('click', () => this.setEditorEnabled(!this.editorEnabled));

    const panel = document.createElement('div');
    panel.style.display = 'none';
    panel.style.gap = '8px';
    panel.style.padding = '12px';
    panel.style.background = 'rgba(16, 24, 32, 0.92)';
    panel.style.border = '1px solid rgba(242, 193, 78, 0.65)';
    panel.style.boxShadow = '0 16px 34px rgba(0, 0, 0, 0.36)';

    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.minHeight = '34px';
    select.style.background = '#f8f5f0';
    select.style.color = '#101820';
    select.style.font = '700 13px Arial, sans-serif';

    for (const frame of Object.values(OfficeAssetFrames)) {
      const option = document.createElement('option');
      option.value = frame;
      option.textContent = frame;
      select.append(option);
    }

    const addButton = this.createEditorButton('Add Selected Atlas Item');
    addButton.addEventListener('click', () => this.addSelectedAtlasItem());

    const deleteButton = this.createEditorButton('Delete Selected');
    deleteButton.addEventListener('click', () => this.deleteSelectedItem());

    const scaleRow = document.createElement('div');
    scaleRow.style.display = 'grid';
    scaleRow.style.gridTemplateColumns = '1fr 1fr';
    scaleRow.style.gap = '8px';

    const smallerButton = this.createEditorButton('Scale -');
    smallerButton.addEventListener('click', () => this.adjustSelectedScale(-0.1));
    const largerButton = this.createEditorButton('Scale +');
    largerButton.addEventListener('click', () => this.adjustSelectedScale(0.1));
    scaleRow.append(smallerButton, largerButton);

    const resetButton = this.createEditorButton('Reset Layout');
    resetButton.addEventListener('click', () => this.resetOfficeLayout());

    const exportButton = this.createEditorButton('Export JSON');
    exportButton.addEventListener('click', () => this.exportOfficeLayout());

    const status = document.createElement('div');
    status.style.minHeight = '42px';
    status.style.paddingTop = '4px';
    status.style.color = '#9ed8db';
    status.style.font = '600 12px Arial, sans-serif';
    status.style.lineHeight = '1.35';

    panel.append(select, addButton, scaleRow, deleteButton, resetButton, exportButton, status);
    root.append(toggle, panel);
    app.append(root);

    this.editorRoot = root;
    this.editorPanel = panel;
    this.editorToggleButton = toggle;
    this.editorFrameSelect = select;
    this.editorStatus = status;
    this.updateEditorStatus();
  }

  private bindEditorInput(): void {
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (!this.editorEnabled) {
        return;
      }

      this.selectOfficeItem(String(gameObject.getData('officeItemId')));
    });

    this.input.on(
      'drag',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
        if (!this.editorEnabled || !this.officeLayout) {
          return;
        }

        const item = this.findOfficeItem(String(gameObject.getData('officeItemId')));
        if (!item) {
          return;
        }

        item.config.x = this.screenToOfficeX(this.officeLayout, dragX);
        item.config.y = this.screenToOfficeY(this.officeLayout, dragY);
        item.gameObject.setPosition(dragX, dragY);
        item.gameObject.setDepth(this.officeDepth(this.officeLayout, item.config.y) + (item.config.kind === 'atlas' ? 0 : 12));
        this.updateSelectionBox();
        this.persistOfficeLayout();
        this.updateEditorStatus();
      },
    );

    this.input.on('gameobjectdown', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (!this.editorEnabled) {
        return;
      }

      const id = gameObject.getData('officeItemId');
      if (id) {
        this.selectOfficeItem(String(id));
      }
    });

    this.input.keyboard?.on('keydown-DELETE', () => {
      if (this.editorEnabled) {
        this.deleteSelectedItem();
      }
    });

    this.input.keyboard?.on('keydown-BACKSPACE', () => {
      if (this.editorEnabled) {
        this.deleteSelectedItem();
      }
    });
  }

  private setEditorEnabled(enabled: boolean): void {
    this.editorEnabled = enabled;
    this.editorPanel?.style.setProperty('display', enabled ? 'grid' : 'none');

    if (this.editorToggleButton) {
      this.editorToggleButton.textContent = enabled ? 'Done Editing' : 'Edit Scene';
    }

    for (const object of this.taskUiObjects) {
      object.setVisible(!enabled);
    }

    for (const item of this.officeItems) {
      this.applyEditorInteractivity(item.gameObject);
    }

    if (!enabled) {
      this.selectedItemId = undefined;
      this.selectionBox?.destroy();
      this.selectionBox = undefined;
    }

    this.updateEditorStatus();
  }

  private applyEditorInteractivity(gameObject: Phaser.GameObjects.Image | Phaser.GameObjects.Container): void {
    if (!this.editorEnabled) {
      gameObject.disableInteractive();
      return;
    }

    if (gameObject instanceof Phaser.GameObjects.Container) {
      gameObject.setSize(90, 150);
      gameObject.setInteractive(new Phaser.Geom.Rectangle(-45, -126, 90, 150), Phaser.Geom.Rectangle.Contains);
    } else {
      gameObject.setInteractive({ useHandCursor: true });
    }

    this.input.setDraggable(gameObject);
  }

  private addSelectedAtlasItem(): void {
    if (!this.officeLayout || !this.editorFrameSelect) {
      return;
    }

    const frame = this.editorFrameSelect.value as OfficeAssetFrame;
    const item: OfficeSceneItem = {
      id: `${frame}-${Date.now()}`,
      kind: 'atlas',
      frame,
      x: this.screenToOfficeX(this.officeLayout, this.scale.width / 2),
      y: this.screenToOfficeY(this.officeLayout, this.scale.height / 2),
      scale: 1.25,
    };

    this.renderOfficeItem(this.officeLayout, item);
    this.selectOfficeItem(item.id);
    this.persistOfficeLayout();
    this.updateEditorStatus();
  }

  private deleteSelectedItem(): void {
    if (!this.selectedItemId) {
      return;
    }

    const index = this.officeItems.findIndex((item) => item.config.id === this.selectedItemId);
    if (index === -1) {
      return;
    }

    this.officeItems[index].gameObject.destroy();
    this.officeItems.splice(index, 1);
    this.selectedItemId = undefined;
    this.selectionBox?.destroy();
    this.selectionBox = undefined;
    this.persistOfficeLayout();
    this.updateEditorStatus();
  }

  private adjustSelectedScale(delta: number): void {
    if (!this.selectedItemId || !this.officeLayout) {
      return;
    }

    const item = this.findOfficeItem(this.selectedItemId);
    if (!item) {
      return;
    }

    item.config.scale = Phaser.Math.Clamp(Number((item.config.scale + delta).toFixed(2)), 0.35, 3);
    item.gameObject.setScale(item.config.scale * this.officeLayout.scale);
    this.updateSelectionBox();
    this.persistOfficeLayout();
    this.updateEditorStatus();
  }

  private selectOfficeItem(id: string): void {
    const item = this.findOfficeItem(id);
    if (!item) {
      return;
    }

    this.selectedItemId = item.config.id;
    this.updateSelectionBox();
    this.updateEditorStatus();
  }

  private updateSelectionBox(): void {
    const item = this.selectedItemId ? this.findOfficeItem(this.selectedItemId) : undefined;
    if (!item) {
      this.selectionBox?.destroy();
      this.selectionBox = undefined;
      return;
    }

    const bounds = item.gameObject.getBounds();
    if (!this.selectionBox) {
      this.selectionBox = this.add
        .rectangle(bounds.centerX, bounds.centerY, bounds.width + 12, bounds.height + 12)
        .setStrokeStyle(2, 0xf2c14e, 0.95)
        .setFillStyle(0xf2c14e, 0.08)
        .setDepth(UI_DEPTH - 50);
    }

    this.selectionBox
      .setPosition(bounds.centerX, bounds.centerY)
      .setSize(bounds.width + 12, bounds.height + 12)
      .setDepth(item.gameObject.depth + 1);
  }

  private updateEditorStatus(): void {
    if (!this.editorStatus) {
      return;
    }

    const item = this.selectedItemId ? this.findOfficeItem(this.selectedItemId) : undefined;
    if (!this.editorEnabled) {
      this.editorStatus.textContent = 'Open the editor to drag furniture, add atlas items, and save placements.';
      return;
    }

    if (!item) {
      this.editorStatus.textContent = 'Drag any object to move it. Select an atlas frame to add it to the room.';
      return;
    }

    this.editorStatus.textContent = `${item.config.id}\nx: ${Math.round(item.config.x)}, y: ${Math.round(item.config.y)}, scale: ${item.config.scale.toFixed(2)}`;
  }

  private getStoredOfficeItems(): OfficeSceneItem[] {
    try {
      const raw = window.localStorage.getItem(OFFICE_LAYOUT_STORAGE_KEY);
      if (!raw) {
        return this.cloneDefaultOfficeItems();
      }

      const parsed = JSON.parse(raw) as OfficeSceneItem[];
      if (!Array.isArray(parsed)) {
        return this.cloneDefaultOfficeItems();
      }

      return parsed.filter((item) => this.isValidOfficeItem(item));
    } catch {
      return this.cloneDefaultOfficeItems();
    }
  }

  private isValidOfficeItem(item: OfficeSceneItem): boolean {
    if (!item || typeof item.id !== 'string' || typeof item.x !== 'number' || typeof item.y !== 'number') {
      return false;
    }

    if (item.kind === 'atlas') {
      return Boolean(item.frame && Object.values(OfficeAssetFrames).includes(item.frame));
    }

    return item.kind === 'worker' || item.kind === 'boss';
  }

  private cloneDefaultOfficeItems(): OfficeSceneItem[] {
    return DEFAULT_OFFICE_ITEMS.map((item) => ({ ...item }));
  }

  private persistOfficeLayout(): void {
    window.localStorage.setItem(
      OFFICE_LAYOUT_STORAGE_KEY,
      JSON.stringify(this.officeItems.map((item) => item.config)),
    );
  }

  private resetOfficeLayout(): void {
    for (const item of this.officeItems) {
      item.gameObject.destroy();
    }

    this.officeItems = [];
    this.selectedItemId = undefined;
    this.selectionBox?.destroy();
    this.selectionBox = undefined;
    window.localStorage.removeItem(OFFICE_LAYOUT_STORAGE_KEY);

    if (this.officeLayout) {
      for (const item of this.cloneDefaultOfficeItems()) {
        this.renderOfficeItem(this.officeLayout, item);
      }
    }

    this.updateEditorStatus();
  }

  private exportOfficeLayout(): void {
    const json = JSON.stringify(this.officeItems.map((item) => item.config), null, 2);
    console.log('Workday office layout:', json);
    void navigator.clipboard?.writeText(json);
    if (this.editorStatus) {
      this.editorStatus.textContent = 'Layout JSON copied to clipboard and logged to the console.';
    }
  }

  private findOfficeItem(id: string): RenderedOfficeItem | undefined {
    return this.officeItems.find((item) => item.config.id === id);
  }

  private addTaskUiObject<T extends VisibleGameObject>(object: T): T {
    this.taskUiObjects.push(object);
    object.setVisible(!this.editorEnabled);
    return object;
  }

  private createEditorButton(label: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.minHeight = '36px';
    button.style.border = '0';
    button.style.padding = '8px 10px';
    button.style.background = '#f2c14e';
    button.style.color = '#101820';
    button.style.font = '800 13px Arial, sans-serif';
    button.style.cursor = 'pointer';
    return button;
  }

  private officeX(layout: OfficeLayout, x: number): number {
    return layout.offsetX + x * layout.scale;
  }

  private officeY(layout: OfficeLayout, y: number): number {
    return layout.offsetY + y * layout.scale;
  }

  private screenToOfficeX(layout: OfficeLayout, x: number): number {
    return Phaser.Math.Clamp((x - layout.offsetX) / layout.scale, 0, OFFICE_BACKGROUND_WIDTH);
  }

  private screenToOfficeY(layout: OfficeLayout, y: number): number {
    return Phaser.Math.Clamp((y - layout.offsetY) / layout.scale, 0, OFFICE_BACKGROUND_HEIGHT);
  }

  private officeDepth(layout: OfficeLayout, y: number): number {
    return OFFICE_DEPTH + Math.round(y * layout.scale);
  }

  private cleanup(): void {
    this.editorRoot?.remove();
    this.editorRoot = undefined;
    this.editorPanel = undefined;
    this.editorToggleButton = undefined;
    this.editorFrameSelect = undefined;
    this.editorStatus = undefined;
    this.officeItems = [];
    this.taskUiObjects = [];
    this.selectedItemId = undefined;
    this.selectionBox = undefined;
  }
}
