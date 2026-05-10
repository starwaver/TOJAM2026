import Phaser from 'phaser';
import { OfficeAssetFrames, OfficeAssets, type OfficeAssetFrame } from '../assets/OfficeAssets';
import { BalanceConfig } from '../config/BalanceConfig';
import { GameState } from '../core/GameState';
import { SceneTransitionService } from '../core/SceneTransitionService';
import { DifficultySystem } from '../systems/DifficultySystem';
import { RageSystem } from '../systems/RageSystem';
import { SanitySystem } from '../systems/SanitySystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { DEFAULT_OFFICE_ITEMS } from '../data/OfficeLayoutData';
import type { OfficeSceneItem } from '../data/OfficeLayoutData';
import {
  workdayTaskQueue,
  WORKDAY_TASK_TIME_LIMIT_SECONDS,
  type AssignedWorkdayTask,
} from '../systems/WorkdayTaskQueue';
import { SceneKeys } from '../types/SceneKeys';
import type { TaskConfig, TaskResult, WorkdaySceneData } from '../types/TaskTypes';
import { WorkdayTaskOverlay } from '../ui/WorkdayTaskOverlay';

type OfficeLayout = {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
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
const WORKDAY_START_HOUR = 8;
const WORKDAY_PANEL_GAP = 18;

export class WorkdayScene extends Phaser.Scene {
  private taskResult?: TaskResult;
  private officeLayout?: OfficeLayout;
  private officeItems: RenderedOfficeItem[] = [];
  private selectedItemId?: string;
  private selectionBox?: Phaser.GameObjects.Rectangle;
  private editorEnabled = false;
  private editorRoot?: HTMLDivElement;
  private editorPanel?: HTMLDivElement;
  private editorToggleButton?: HTMLButtonElement;
  private editorFrameSelect?: HTMLSelectElement;
  private editorStatus?: HTMLDivElement;
  private workdayUiRoot?: HTMLElement;
  private taskOverlay?: WorkdayTaskOverlay;
  private incomingCountValue?: HTMLDivElement;
  private incomingDetailValue?: HTMLDivElement;
  private taskRefreshTimer?: Phaser.Time.TimerEvent;
  private activeDifficulty = 1;

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
    this.input.keyboard?.on('keydown-R', this.handleRageTestKeyDown, this);

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

  private applyExpiredTaskResults(results: TaskResult[]): void {
    for (const result of results) {
      this.applyTaskResult(result);
    }
  }

  private routeNext(): void {
    const state = GameState.data;

    if (RageSystem.isFull(state)) {
      SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.rageTransition });
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
    this.activeDifficulty = difficulty;

    const expiredResults = workdayTaskQueue.sync(difficulty);
    if (expiredResults.length > 0) {
      this.applyExpiredTaskResults(expiredResults);
      this.routeNext();
      return;
    }

    this.mountWorkdayUi(difficulty);
    this.mountTaskOverlay();
    this.startTaskRefresh();
  }

  private mountWorkdayUi(difficulty: number): void {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app) {
      return;
    }

    this.workdayUiRoot?.remove();

    const root = document.createElement('aside');
    root.setAttribute('aria-label', 'Workday command center');
    root.style.position = 'absolute';
    root.style.left = '14px';
    root.style.top = '14px';
    root.style.bottom = '14px';
    root.style.width = `${this.getSidebarWidth() - 28}px`;
    root.style.zIndex = '4';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = '14px';
    root.style.padding = '16px';
    root.style.boxSizing = 'border-box';
    root.style.background = 'rgba(14, 22, 25, 0.94)';
    root.style.border = '1px solid rgba(242, 193, 78, 0.5)';
    root.style.boxShadow = '0 18px 45px rgba(0, 0, 0, 0.38)';
    root.style.color = '#f8f5f0';
    root.style.fontFamily = 'Arial, Helvetica, sans-serif';
    root.style.pointerEvents = 'auto';
    root.style.userSelect = 'none';
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    root.addEventListener('click', (event) => event.stopPropagation());

    const tasksLeft = this.getTasksLeft();
    const currentHour = WORKDAY_START_HOUR + (this.getTotalWorkdayTasks() - tasksLeft);

    root.append(
      this.createSidebarHeader(),
      this.createTimeCard(currentHour, tasksLeft),
      this.createStatusMeters(),
      this.createQueueStatusCard(difficulty),
    );

    app.append(root);
    this.workdayUiRoot = root;
  }

  private selectTask(assignment: AssignedWorkdayTask): void {
    const nowMs = Date.now();
    const expiredResults = workdayTaskQueue.sync(this.activeDifficulty, nowMs);
    if (expiredResults.length > 0) {
      this.applyExpiredTaskResults(expiredResults);
      this.routeNext();
      return;
    }

    const claimedAssignment = workdayTaskQueue.claim(assignment.instanceId, nowMs);
    if (!claimedAssignment) {
      this.taskOverlay?.update();
      return;
    }

    const state = GameState.data;
    const task = claimedAssignment.task;
    const taskConfig: TaskConfig = {
      id: task.id,
      displayName: task.displayName,
      baseTimeLimit: task.baseTimeLimit,
      actualTimeLimit: WORKDAY_TASK_TIME_LIMIT_SECONDS,
      difficulty: claimedAssignment.difficulty,
      sanityAtStart: state.sanity,
      rageAtStart: state.rage,
      taskInstanceId: claimedAssignment.instanceId,
      deadlineAtMs: claimedAssignment.expiresAtMs,
      assignmentTimeLimit: WORKDAY_TASK_TIME_LIMIT_SECONDS,
    };

    state.difficultyLevel = claimedAssignment.difficulty;
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
    const sidebarWidth = this.getSidebarWidth();
    const availableWidth = Math.max(320, this.scale.width - sidebarWidth - WORKDAY_PANEL_GAP);
    const scale = Math.min(availableWidth / OFFICE_BACKGROUND_WIDTH, this.scale.height / OFFICE_BACKGROUND_HEIGHT);
    const width = OFFICE_BACKGROUND_WIDTH * scale;
    const height = OFFICE_BACKGROUND_HEIGHT * scale;

    return {
      scale,
      width,
      height,
      offsetX: sidebarWidth + WORKDAY_PANEL_GAP + (availableWidth - width) / 2,
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

  private createSidebarHeader(): HTMLElement {
    const header = document.createElement('header');
    header.style.display = 'grid';
    header.style.gap = '4px';

    const eyebrow = document.createElement('div');
    eyebrow.textContent = 'WORKDAY';
    eyebrow.style.color = '#9ed8db';
    eyebrow.style.font = '800 11px Arial, sans-serif';
    eyebrow.style.letterSpacing = '0.12em';

    const title = document.createElement('h1');
    title.textContent = "Boss's Tasks";
    title.style.margin = '0';
    title.style.color = '#f2c14e';
    title.style.font = '900 30px Arial, sans-serif';
    title.style.lineHeight = '1';

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Interruptions are already circling.';
    subtitle.style.color = '#cdd8d5';
    subtitle.style.font = '600 13px Arial, sans-serif';
    subtitle.style.lineHeight = '1.35';

    header.append(eyebrow, title, subtitle);
    return header;
  }

  private createTimeCard(currentHour: number, tasksLeft: number): HTMLElement {
    const card = this.createSidebarSection();
    const label = this.createSectionLabel('Time of Day');

    const clock = document.createElement('div');
    clock.textContent = this.formatHour(currentHour);
    clock.style.marginTop = '8px';
    clock.style.color = '#f8f5f0';
    clock.style.font = '900 42px Arial, sans-serif';
    clock.style.lineHeight = '0.95';

    const remaining = document.createElement('div');
    remaining.textContent = `${tasksLeft} ${tasksLeft === 1 ? 'hour' : 'hours'} left`;
    remaining.style.marginTop = '6px';
    remaining.style.color = '#9ed8db';
    remaining.style.font = '800 15px Arial, sans-serif';

    const progressTrack = document.createElement('div');
    progressTrack.style.height = '8px';
    progressTrack.style.marginTop = '12px';
    progressTrack.style.overflow = 'hidden';
    progressTrack.style.background = 'rgba(248, 245, 240, 0.14)';

    const progressFill = document.createElement('div');
    progressFill.style.width = `${Phaser.Math.Clamp(GameState.data.dayProgress / BalanceConfig.dayCompleteProgress, 0, 1) * 100}%`;
    progressFill.style.height = '100%';
    progressFill.style.background = '#f2c14e';
    progressTrack.append(progressFill);

    card.append(label, clock, remaining, progressTrack);
    return card;
  }

  private createStatusMeters(): HTMLElement {
    const section = this.createSidebarSection();
    section.append(
      this.createSectionLabel('Vitals'),
      this.createDomMeter('Sanity', GameState.data.sanity, BalanceConfig.maxSanity, '#4ecdc4'),
      this.createDomMeter('Rage', GameState.data.rage, BalanceConfig.maxRage, '#e74c3c'),
    );
    return section;
  }

  private createQueueStatusCard(difficulty: number): HTMLElement {
    const section = this.createSidebarSection();

    const count = document.createElement('div');
    count.style.marginTop = '8px';
    count.style.font = '900 28px Arial, sans-serif';
    count.style.lineHeight = '1';

    const detail = document.createElement('div');
    detail.style.marginTop = '8px';
    detail.style.color = '#9ed8db';
    detail.style.font = '800 13px Arial, sans-serif';

    this.incomingCountValue = count;
    this.incomingDetailValue = detail;
    this.updateQueueStatusCard(difficulty);

    section.append(this.createSectionLabel('Incoming'), count, detail);
    return section;
  }

  private updateQueueStatusCard(difficulty: number): void {
    const activeCount = workdayTaskQueue.getAssignments().length;
    const nextSeconds = workdayTaskQueue.getNextAssignmentSeconds();

    if (this.incomingCountValue) {
      this.incomingCountValue.textContent = `${activeCount} active`;
      this.incomingCountValue.style.color = activeCount > 0 ? '#ffdfdf' : '#f8f5f0';
    }

    if (this.incomingDetailValue) {
      this.incomingDetailValue.textContent = `Next ping ${Math.ceil(nextSeconds)}s | Difficulty ${difficulty}`;
    }
  }

  private handleRageTestKeyDown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }

    this.triggerRageTest();
  }

  private triggerRageTest(): void {
    const state = GameState.data;
    state.rage = BalanceConfig.maxRage;
    state.peakRage = Math.max(state.peakRage, state.rage);
    GameState.clampVitals();

    SceneTransitionService.start(this, { kind: 'immediate', target: SceneKeys.rageTransition });
  }

  private startTaskRefresh(): void {
    if (this.taskRefreshTimer) {
      return;
    }

    this.taskRefreshTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: this.refreshAssignedTasks,
      callbackScope: this,
    });
  }

  private refreshAssignedTasks(): void {
    const expiredResults = workdayTaskQueue.sync(this.activeDifficulty);
    if (expiredResults.length > 0) {
      this.applyExpiredTaskResults(expiredResults);
      this.routeNext();
      return;
    }

    this.taskOverlay?.update();
    this.updateQueueStatusCard(this.activeDifficulty);
  }

  private mountTaskOverlay(): void {
    if (!this.taskOverlay) {
      this.taskOverlay = new WorkdayTaskOverlay(this.getSidebarWidth() + WORKDAY_PANEL_GAP, (assignment) => {
        this.selectTask(assignment);
      });
    }

    this.taskOverlay.mount();
    this.taskOverlay.update();
  }

  private createDomMeter(label: string, value: number, maxValue: number, color: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gap = '7px';
    wrap.style.marginTop = '12px';

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.gap = '12px';
    row.style.color = '#f8f5f0';
    row.style.font = '800 13px Arial, sans-serif';

    const name = document.createElement('span');
    name.textContent = label;
    const amount = document.createElement('span');
    amount.textContent = `${Math.round(value)}/${maxValue}`;
    amount.style.color = color;
    row.append(name, amount);

    const track = document.createElement('div');
    track.style.height = '12px';
    track.style.overflow = 'hidden';
    track.style.background = 'rgba(248, 245, 240, 0.13)';

    const fill = document.createElement('div');
    fill.style.width = `${Phaser.Math.Clamp(value / maxValue, 0, 1) * 100}%`;
    fill.style.height = '100%';
    fill.style.background = color;
    track.append(fill);
    wrap.append(row, track);

    return wrap;
  }

  private createSidebarSection(): HTMLDivElement {
    const section = document.createElement('div');
    section.style.padding = '14px';
    section.style.background = 'rgba(248, 245, 240, 0.055)';
    section.style.border = '1px solid rgba(248, 245, 240, 0.12)';
    return section;
  }

  private createSectionLabel(label: string): HTMLDivElement {
    const element = document.createElement('div');
    element.textContent = label;
    element.style.color = '#f2c14e';
    element.style.font = '900 12px Arial, sans-serif';
    element.style.letterSpacing = '0.08em';
    element.style.textTransform = 'uppercase';
    return element;
  }

  private mountEditorUi(): void {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app || this.editorRoot) {
      return;
    }

    const root = document.createElement('div');
    root.style.position = 'absolute';
    root.style.top = '12px';
    root.style.right = '12px';
    root.style.zIndex = '5';
    root.style.display = 'grid';
    root.style.justifyItems = 'end';
    root.style.gap = '8px';
    root.style.width = 'auto';
    root.style.font = '700 13px Arial, sans-serif';
    root.style.color = '#f8f5f0';
    root.style.pointerEvents = 'auto';
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    root.addEventListener('click', (event) => event.stopPropagation());

    const toggle = this.createEditorButton('✎');
    toggle.setAttribute('aria-label', 'Edit room');
    toggle.title = 'Edit room';
    toggle.style.width = '40px';
    toggle.style.minWidth = '40px';
    toggle.style.height = '40px';
    toggle.style.minHeight = '40px';
    toggle.style.padding = '0';
    toggle.style.font = '900 18px Arial, sans-serif';
    toggle.style.lineHeight = '1';
    toggle.addEventListener('click', () => this.setEditorEnabled(!this.editorEnabled));

    const panel = document.createElement('div');
    panel.style.display = 'none';
    panel.style.gap = '8px';
    panel.style.width = 'min(300px, calc(100vw - 24px))';
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

    if (this.editorRoot) {
      this.editorRoot.style.left = enabled ? '14px' : '';
      this.editorRoot.style.right = enabled ? '' : '12px';
    }

    if (this.editorToggleButton) {
      this.editorToggleButton.textContent = enabled ? 'X' : '✎';
      this.editorToggleButton.setAttribute('aria-label', enabled ? 'Close room editor' : 'Edit room');
      this.editorToggleButton.title = enabled ? 'Close room editor' : 'Edit room';
    }

    if (this.workdayUiRoot) {
      this.workdayUiRoot.style.display = enabled ? 'none' : 'flex';
    }

    this.taskOverlay?.setVisible(!enabled);

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

  private getSidebarWidth(): number {
    if (this.scale.width < 760) {
      return Math.min(300, Math.max(250, this.scale.width * 0.34));
    }

    return Math.min(360, Math.max(300, this.scale.width * 0.28));
  }

  private getTotalWorkdayTasks(): number {
    return Math.ceil(BalanceConfig.dayCompleteProgress / BalanceConfig.dayProgressPerTask);
  }

  private getTasksLeft(): number {
    const remainingProgress = Math.max(0, BalanceConfig.dayCompleteProgress - GameState.data.dayProgress);
    return Math.ceil(remainingProgress / BalanceConfig.dayProgressPerTask);
  }

  private formatHour(hour: number): string {
    const normalized = ((hour % 24) + 24) % 24;
    const suffix = normalized >= 12 ? 'PM' : 'AM';
    const displayHour = normalized % 12 || 12;
    return `${displayHour}:00 ${suffix}`;
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
    this.input.keyboard?.off('keydown-R', this.handleRageTestKeyDown, this);
    this.taskRefreshTimer?.remove();
    this.workdayUiRoot?.remove();
    this.workdayUiRoot = undefined;
    this.taskOverlay?.destroy();
    this.taskOverlay = undefined;
    this.incomingCountValue = undefined;
    this.incomingDetailValue = undefined;
    this.taskRefreshTimer = undefined;
    this.editorRoot?.remove();
    this.editorRoot = undefined;
    this.editorPanel = undefined;
    this.editorToggleButton = undefined;
    this.editorFrameSelect = undefined;
    this.editorStatus = undefined;
    this.officeItems = [];
    this.selectedItemId = undefined;
    this.selectionBox = undefined;
  }
}
