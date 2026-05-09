import Phaser from 'phaser';
import { SceneKeys } from '../../types/SceneKeys';
import type { MiniGameSceneData } from '../../types/TaskTypes';
import { BaseMiniGameScene } from './BaseMiniGameScene';

type SlideTaskName = 'chart' | 'text' | 'logo' | 'font' | 'clipart';

type DragTarget = {
  element: HTMLElement;
  taskName?: SlideTaskName;
  guide?: HTMLElement;
  deleteOnDrop?: boolean;
};

const SLIDE_HEADER_HEIGHT = 72;
const TASK_COUNT = 5;

const bossLines = [
  'Make it pop, but professionally. Also emotionally larger.',
  'Can the chart feel more aligned with our Q4 soul?',
  'The logo needs to be bigger. No, not that big. Legal big.',
  'Drag anything haunted into the trash before it becomes brand-approved.',
  'Readable text is important, but please preserve the aura.',
  'This is almost good. That worries me. Change something.',
  'I need this in five minutes, which means thirty seconds.',
];

const meetingNotifications = [
  {
    title: 'Meeting starting soon',
    message: 'Your boss is waiting in the call. Dismiss this calendar theatre to keep fixing the deck.',
  },
  {
    title: 'Reminder: Join Q4 Synergy Roadmap',
    message: '3 attendees are waiting. One of them just typed: Are we still on for this?',
  },
  {
    title: 'Screen share expected',
    message: 'Calendar says you are presenting. Calendar has no mercy.',
  },
  {
    title: 'Final reminder',
    message: 'The meeting is close enough to smell the lukewarm coffee. Dismiss to keep panicking.',
  },
];

export class SlideDeckDisasterScene extends BaseMiniGameScene {
  private root?: HTMLDivElement;
  private style?: HTMLStyleElement;
  private abortController?: AbortController;
  private slide?: HTMLDivElement;
  private stageWrap?: HTMLDivElement;
  private timerPanel?: HTMLDivElement;
  private timeText?: HTMLSpanElement;
  private timeFill?: HTMLDivElement;
  private meetingStatus?: HTMLDivElement;
  private bossBubble?: HTMLDivElement;
  private result?: HTMLDivElement;
  private resultTitle?: HTMLHeadingElement;
  private resultText?: HTMLParagraphElement;
  private startOverlay?: HTMLDivElement;
  private notificationOverlay?: HTMLDivElement;
  private notificationTitle?: HTMLDivElement;
  private notificationMessage?: HTMLDivElement;
  private trashArea?: HTMLDivElement;
  private logo?: HTMLDivElement;
  private fontBox?: HTMLDivElement;
  private clipart?: HTMLDivElement;
  private taskItems = new Map<SlideTaskName, HTMLLIElement>();
  private tasks: Record<SlideTaskName, boolean> = {
    chart: false,
    text: false,
    logo: false,
    font: false,
    clipart: false,
  };
  private running = false;
  private resultShown = false;
  private timeLeft = 30;
  private duration = 30;
  private fontMode = 0;
  private bossLineTime = 0;
  private notificationTime = 0;
  private notificationVisible = false;
  private notificationCount = 0;
  private mistakes = 0;
  private pendingResult?: {
    success: boolean;
    score: number;
    mistakes: number;
  };

  constructor() {
    super(SceneKeys.slideDeckDisaster);
  }

  init(data: MiniGameSceneData = {}): void {
    super.init(data);
    this.duration = data.taskConfig?.actualTimeLimit ?? 30;
    this.timeLeft = this.duration;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#151827');

    this.resetState();
    this.injectStyles();
    this.createHtmlUi();
    this.randomizePositions();
    this.checkTasks();
    this.updateUi();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(_time: number, delta: number): void {
    if (!this.running || this.resultShown) {
      return;
    }

    const dt = Math.min(delta / 1000, 0.1);
    this.bossLineTime += dt;
    this.notificationTime += dt;

    this.timeLeft -= dt;

    if (this.notificationTime > 10) {
      this.notificationTime = 0;
      this.showMeetingNotification();
    }

    if (this.bossLineTime > 5.2) {
      this.bossLineTime = 0;
      this.bossBark();
    }

    if (this.getTimeLeft() <= 0 || this.countCompletedTasks() === TASK_COUNT) {
      this.finishRun(this.countCompletedTasks() === TASK_COUNT);
      return;
    }

    this.updateUi();
  }

  private resetState(): void {
    this.running = false;
    this.resultShown = false;
    this.timeLeft = this.duration;
    this.fontMode = 0;
    this.bossLineTime = 0;
    this.notificationTime = 0;
    this.notificationVisible = false;
    this.notificationCount = 0;
    this.mistakes = 0;
    this.pendingResult = undefined;
    this.tasks = {
      chart: false,
      text: false,
      logo: false,
      font: false,
      clipart: false,
    };
  }

  private createHtmlUi(): void {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app) {
      return;
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const root = document.createElement('div');
    root.className = 'slide-deck-minigame';
    root.innerHTML = this.getMarkup();
    root.addEventListener('pointerdown', (event) => event.stopPropagation(), { signal });
    root.addEventListener('click', (event) => event.stopPropagation(), { signal });

    app.append(root);
    this.root = root;
    this.cacheElements();
    this.bindControls(signal);
  }

  private cacheElements(): void {
    if (!this.root) {
      return;
    }

    this.slide = this.query<HTMLDivElement>('.slide-deck__slide');
    this.stageWrap = this.query<HTMLDivElement>('.slide-deck__stage-wrap');
    this.timerPanel = this.query<HTMLDivElement>('.slide-deck__meeting-timer');
    this.timeText = this.query<HTMLSpanElement>('[data-role="time-text"]');
    this.timeFill = this.query<HTMLDivElement>('[data-role="time-fill"]');
    this.meetingStatus = this.query<HTMLDivElement>('[data-role="meeting-status"]');
    this.bossBubble = this.query<HTMLDivElement>('[data-role="boss-bubble"]');
    this.result = this.query<HTMLDivElement>('[data-role="result"]');
    this.resultTitle = this.query<HTMLHeadingElement>('[data-role="result-title"]');
    this.resultText = this.query<HTMLParagraphElement>('[data-role="result-text"]');
    this.startOverlay = this.query<HTMLDivElement>('[data-role="start-overlay"]');
    this.notificationOverlay = this.query<HTMLDivElement>('[data-role="notification-overlay"]');
    this.notificationTitle = this.query<HTMLDivElement>('[data-role="notification-title"]');
    this.notificationMessage = this.query<HTMLDivElement>('[data-role="notification-message"]');
    this.trashArea = this.query<HTMLDivElement>('[data-role="trash-area"]');
    this.logo = this.query<HTMLDivElement>('[data-role="logo"]');
    this.fontBox = this.query<HTMLDivElement>('[data-role="font-box"]');
    this.clipart = this.query<HTMLDivElement>('[data-role="clipart"]');

    this.taskItems.clear();
    for (const taskName of Object.keys(this.tasks) as SlideTaskName[]) {
      const item = this.query<HTMLLIElement>(`[data-task="${taskName}"]`);
      if (item) {
        this.taskItems.set(taskName, item);
      }
    }
  }

  private bindControls(signal: AbortSignal): void {
    this.query<HTMLButtonElement>('[data-action="start"]')?.addEventListener('click', () => this.startRun(), { signal });
    this.query<HTMLButtonElement>('[data-action="restart"]')?.addEventListener('click', () => this.restartScene(), { signal });
    this.query<HTMLButtonElement>('[data-action="result-primary"]')?.addEventListener('click', () => this.handleResultPrimary(), {
      signal,
    });
    this.query<HTMLButtonElement>('[data-action="home"]')?.addEventListener('click', () => this.scene.start(SceneKeys.mainMenu), {
      signal,
    });
    this.query<HTMLButtonElement>('[data-action="dismiss-notification"]')?.addEventListener(
      'click',
      () => this.hideMeetingNotification(),
      { signal },
    );

    if (this.fontBox) {
      this.fontBox.addEventListener('click', () => this.advanceFontMode(), { signal });
    }

    const dragTargets: DragTarget[] = [
      {
        element: this.queryRequired<HTMLElement>('[data-role="chart"]'),
        taskName: 'chart',
        guide: this.queryRequired<HTMLElement>('[data-guide="chart"]'),
      },
      {
        element: this.queryRequired<HTMLElement>('[data-role="text-box"]'),
        taskName: 'text',
        guide: this.queryRequired<HTMLElement>('[data-guide="text"]'),
      },
      {
        element: this.queryRequired<HTMLElement>('[data-role="logo"]'),
        taskName: 'logo',
        guide: this.queryRequired<HTMLElement>('[data-guide="logo"]'),
      },
      {
        element: this.queryRequired<HTMLElement>('[data-role="font-box"]'),
      },
      {
        element: this.queryRequired<HTMLElement>('[data-role="clipart"]'),
        taskName: 'clipart',
        deleteOnDrop: true,
      },
    ];

    for (const target of dragTargets) {
      this.makeDraggable(target, signal);
    }

    this.makeResizableLogo(signal);
  }

  private startRun(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.startOverlay?.classList.remove('is-visible');
    this.hideMeetingNotification();

    this.updateUi();
  }

  private finishRun(success: boolean): void {
    if (this.resultShown) {
      return;
    }

    this.running = false;
    this.resultShown = true;
    this.checkTasks();
    this.hideMeetingNotification();

    const completed = this.countCompletedTasks();
    const timeLeft = this.getTimeLeft();
    const score = Math.max(0, Math.round((completed / TASK_COUNT) * 500 + timeLeft * 12));
    const mistakeCount = this.mistakes + (TASK_COUNT - completed);
    this.pendingResult = {
      success,
      score,
      mistakes: mistakeCount,
    };

    if (completed === TASK_COUNT) {
      this.setResult(
        'Boss: Weirdly Impressed',
        `You fixed all ${TASK_COUNT} slide crimes. Boss feeling: dangerously pleased. Professionalism score: ${score}.`,
      );
      this.burstConfetti();
    } else if (completed >= 3) {
      this.setResult(
        'Boss: Strategically Concerned',
        `You fixed ${completed}/${TASK_COUNT} issues. Boss feeling: mostly appeased, with notes. Score: ${score}.`,
      );
    } else {
      this.setResult(
        'Boss: Presentation Rage',
        `You fixed ${completed}/${TASK_COUNT} issues. Boss feeling: the deck has become a performance review. Score: ${score}.`,
      );
      this.stageWrap?.classList.add('is-shaking');
    }

    this.result?.classList.add('is-visible');
  }

  private handleResultPrimary(): void {
    if (this.mode !== 'workday') {
      this.restartScene();
      return;
    }

    if (!this.pendingResult) {
      return;
    }

    this.completeTask(this.pendingResult.success, this.pendingResult.score, this.pendingResult.mistakes);
  }

  private setResult(title: string, text: string): void {
    if (this.resultTitle) {
      this.resultTitle.textContent = title;
    }

    if (this.resultText) {
      this.resultText.textContent = text;
    }
  }

  private restartScene(): void {
    this.scene.restart({
      mode: this.mode,
      taskConfig: this.taskConfig,
    } satisfies MiniGameSceneData);
  }

  private makeDraggable(target: DragTarget, signal: AbortSignal): void {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    target.element.addEventListener(
      'pointerdown',
      (event) => {
        if (!this.running || event.target instanceof HTMLElement && event.target.dataset.resizeHandle) {
          return;
        }

        dragging = true;
        const rect = target.element.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;
        target.element.setPointerCapture(event.pointerId);
        target.element.classList.add('is-dragging');
        this.updateDropTargetHighlight(target, dragging);
      },
      { signal },
    );

    target.element.addEventListener(
      'pointermove',
      (event) => {
        if (!dragging || !this.running || !this.slide) {
          return;
        }

        const slideRect = this.slide.getBoundingClientRect();
        const elementRect = target.element.getBoundingClientRect();
        const x = Phaser.Math.Clamp(event.clientX - slideRect.left - offsetX, 0, slideRect.width - elementRect.width);
        const y = Phaser.Math.Clamp(
          event.clientY - slideRect.top - offsetY,
          SLIDE_HEADER_HEIGHT,
          slideRect.height - elementRect.height,
        );

        target.element.style.left = `${x}px`;
        target.element.style.top = `${y}px`;
        this.updateDropTargetHighlight(target, dragging);
        this.checkTasks();
      },
      { signal },
    );

    target.element.addEventListener(
      'pointerup',
      (event) => {
        if (!dragging) {
          return;
        }

        const shouldDelete = target.deleteOnDrop && this.isOverTrash(target.element);
        dragging = false;
        target.element.classList.remove('is-dragging');

        if (shouldDelete) {
          target.element.style.display = 'none';
        }

        try {
          target.element.releasePointerCapture(event.pointerId);
        } catch {
          // Pointer capture can be released by the browser on scene changes.
        }

        this.hideDropTarget();
        this.checkTasks();
      },
      { signal },
    );
  }

  private makeResizableLogo(signal: AbortSignal): void {
    if (!this.logo || !this.slide) {
      return;
    }

    let resizing = false;
    let activeHandle: HTMLElement | undefined;
    let activeCorner = 'se';
    let startPointerX = 0;
    let startPointerY = 0;
    let startLeft = 0;
    let startTop = 0;
    let startWidth = 0;
    let startHeight = 0;
    let aspectRatio = 1;

    const applyResize = (event: PointerEvent): void => {
      if (!this.logo || !this.slide) {
        return;
      }

      const slideRect = this.slide.getBoundingClientRect();
      const deltaX = event.clientX - startPointerX;
      const deltaY = event.clientY - startPointerY;
      const horizontalDelta = activeCorner.includes('e') ? deltaX : -deltaX;
      const verticalDelta = activeCorner.includes('s') ? deltaY * aspectRatio : -deltaY * aspectRatio;
      const dominantDelta = Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? horizontalDelta : verticalDelta;
      const maxByRightEdge = activeCorner.includes('e') ? slideRect.width - startLeft - 4 : startLeft + startWidth;
      const maxByBottomEdge = activeCorner.includes('s') ? slideRect.height - startTop - 4 : startTop + startHeight;
      const maxWidth = Math.min(240, maxByRightEdge, maxByBottomEdge * aspectRatio);
      const newWidth = Phaser.Math.Clamp(startWidth + dominantDelta, 80, maxWidth);
      const newHeight = Phaser.Math.Clamp(newWidth / aspectRatio, 42, 112);
      const newLeft = activeCorner.includes('w') ? startLeft + startWidth - newWidth : startLeft;
      const newTop = activeCorner.includes('n') ? startTop + startHeight - newHeight : startTop;

      this.logo.style.left = `${newLeft}px`;
      this.logo.style.top = `${newTop}px`;
      this.logo.style.width = `${newWidth}px`;
      this.logo.style.height = `${newHeight}px`;
      this.checkTasks();
    };

    for (const handle of this.root?.querySelectorAll<HTMLElement>('[data-resize-handle]') ?? []) {
      handle.addEventListener(
        'pointerdown',
        (event) => {
          if (!this.running || !this.logo) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          resizing = true;
          activeHandle = handle;
          activeCorner = handle.dataset.resizeHandle ?? 'se';
          startPointerX = event.clientX;
          startPointerY = event.clientY;
          startLeft = this.logo.offsetLeft;
          startTop = this.logo.offsetTop;
          startWidth = this.logo.offsetWidth;
          startHeight = this.logo.offsetHeight;
          aspectRatio = startWidth / startHeight;
          this.logo.classList.add('is-resizing');
          handle.setPointerCapture(event.pointerId);
        },
        { signal },
      );

      handle.addEventListener(
        'pointermove',
        (event) => {
          if (!resizing || !this.running || activeHandle !== handle) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          applyResize(event);
        },
        { signal },
      );

      handle.addEventListener(
        'pointerup',
        (event) => {
          if (activeHandle !== handle || !this.logo) {
            return;
          }

          resizing = false;
          activeHandle = undefined;
          this.logo.classList.remove('is-resizing');
          try {
            handle.releasePointerCapture(event.pointerId);
          } catch {
            // Pointer capture can be released by the browser on scene changes.
          }
          this.checkTasks();
        },
        { signal },
      );
    }
  }

  private checkTasks(): void {
    const chart = this.query<HTMLElement>('[data-role="chart"]');
    const chartGuide = this.query<HTMLElement>('[data-guide="chart"]');
    const textBox = this.query<HTMLElement>('[data-role="text-box"]');
    const textGuide = this.query<HTMLElement>('[data-guide="text"]');
    const logoGuide = this.query<HTMLElement>('[data-guide="logo"]');

    this.setTaskDone('chart', Boolean(chart && chartGuide && this.isNearGuide(chart, chartGuide, 42)));
    this.setTaskDone('text', Boolean(textBox && textGuide && this.isNearGuide(textBox, textGuide, 42)));

    if (this.logo && logoGuide) {
      const logoRect = this.logo.getBoundingClientRect();
      const guideRect = logoGuide.getBoundingClientRect();
      const logoPositionGood = this.rectDistance(logoRect, guideRect) < 48;
      const logoSizeGood = Math.abs(logoRect.width - guideRect.width) < 22 && Math.abs(logoRect.height - guideRect.height) < 18;
      this.setTaskDone('logo', logoPositionGood && logoSizeGood);
    }

    this.setTaskDone('font', Boolean(this.fontBox?.classList.contains('is-good')));
    this.setTaskDone('clipart', this.clipart?.style.display === 'none');
  }

  private setTaskDone(taskName: SlideTaskName, isDone: boolean): void {
    this.tasks[taskName] = isDone;
    this.taskItems.get(taskName)?.classList.toggle('is-done', isDone);
  }

  private advanceFontMode(): void {
    if (!this.running || !this.fontBox) {
      return;
    }

    this.fontMode = (this.fontMode + 1) % 3;
    this.fontBox.classList.remove('is-small', 'is-good', 'is-boss-huge');

    if (this.fontMode === 0) {
      this.fontBox.classList.add('is-small');
    } else if (this.fontMode === 1) {
      this.fontBox.classList.add('is-good');
    } else {
      this.fontBox.classList.add('is-boss-huge');
      this.mistakes += 1;
    }

    this.checkTasks();
  }

  private randomizePositions(): void {
    if (!this.slide || !this.logo || !this.fontBox) {
      return;
    }

    const objects = [
      this.query<HTMLElement>('[data-role="chart"]'),
      this.query<HTMLElement>('[data-role="text-box"]'),
      this.logo,
      this.fontBox,
      this.clipart,
    ].filter((element): element is HTMLElement => Boolean(element));

    const slideWidth = this.slide.clientWidth;
    const slideHeight = this.slide.clientHeight;

    for (const object of objects) {
      object.style.display = '';
      const width = object.offsetWidth || 120;
      const height = object.offsetHeight || 80;
      object.style.left = `${Math.floor(30 + Math.random() * Math.max(20, slideWidth - width - 60))}px`;
      object.style.top = `${Math.floor(96 + Math.random() * Math.max(20, slideHeight - height - 120))}px`;
    }

    this.logo.style.width = '120px';
    this.logo.style.height = '54px';
    this.fontBox.classList.remove('is-small', 'is-good', 'is-boss-huge');
    this.fontBox.classList.add('is-small');
  }

  private updateUi(): void {
    const timeLeft = Math.max(0, this.getTimeLeft());
    const duration = this.getDuration();
    const seconds = Math.floor(timeLeft);
    const tenths = Math.floor((timeLeft - seconds) * 10);
    const timeRatio = Phaser.Math.Clamp((timeLeft / duration) * 100, 0, 100);

    if (this.timeText) {
      this.timeText.textContent = `00:${String(seconds).padStart(2, '0')}.${tenths}`;
    }

    if (this.timeFill) {
      this.timeFill.style.width = `${Math.round(timeRatio)}%`;
    }

    this.timerPanel?.classList.toggle('is-urgent', timeLeft <= 12 && timeLeft > 6);
    this.timerPanel?.classList.toggle('is-critical', timeLeft <= 6);
    this.stageWrap?.classList.toggle('is-urgent', timeLeft <= 12 && timeLeft > 6);
    this.stageWrap?.classList.toggle('is-critical', timeLeft <= 6);

    if (!this.meetingStatus) {
      return;
    }

    if (timeLeft > duration * 0.67) {
      this.meetingStatus.textContent = 'Stakeholders are joining the call.';
    } else if (timeLeft > duration * 0.4) {
      this.meetingStatus.textContent = 'Your manager just said: quick final polish?';
    } else if (timeLeft > duration * 0.2) {
      this.meetingStatus.textContent = 'Calendar reminder: Meeting starts soon.';
    } else if (timeLeft > 0) {
      this.meetingStatus.textContent = 'The call is opening. Someone is already sharing their screen.';
    } else {
      this.meetingStatus.textContent = 'Meeting started.';
    }
  }

  private getTimeLeft(): number {
    return this.timeLeft;
  }

  private getDuration(): number {
    return this.duration;
  }

  private showMeetingNotification(): void {
    if (!this.running || this.notificationVisible) {
      return;
    }

    const notification = meetingNotifications[this.notificationCount % meetingNotifications.length];
    this.notificationVisible = true;
    this.notificationCount += 1;

    if (this.notificationTitle) {
      this.notificationTitle.textContent = notification.title;
    }

    if (this.notificationMessage) {
      this.notificationMessage.textContent = notification.message;
    }

    this.notificationOverlay?.classList.add('is-visible');
  }

  private hideMeetingNotification(): void {
    this.notificationVisible = false;
    this.notificationOverlay?.classList.remove('is-visible');
  }

  private bossBark(): void {
    if (!this.bossBubble) {
      return;
    }

    this.bossBubble.textContent = bossLines[Math.floor(Math.random() * bossLines.length)];
    this.bossBubble.classList.remove('is-shaking');
    void this.bossBubble.offsetWidth;
    this.bossBubble.classList.add('is-shaking');
  }

  private burstConfetti(): void {
    if (!this.stageWrap) {
      return;
    }

    for (let i = 0; i < 44; i += 1) {
      const piece = document.createElement('div');
      piece.className = 'slide-deck__confetti';
      piece.textContent = ['*', 'o', '^', '#'][Math.floor(Math.random() * 4)];
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.top = `${-20 - Math.random() * 80}px`;
      piece.style.fontSize = `${12 + Math.random() * 18}px`;
      piece.style.color = `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      this.stageWrap.append(piece);
      this.time.delayedCall(1800, () => piece.remove());
    }
  }

  private updateDropTargetHighlight(target: DragTarget, dragging: boolean): void {
    if (!target.deleteOnDrop || !this.trashArea) {
      return;
    }

    this.trashArea.classList.toggle('is-visible', dragging);
    this.trashArea.classList.toggle('is-active', dragging && this.isOverTrash(target.element));
  }

  private hideDropTarget(): void {
    this.trashArea?.classList.remove('is-visible', 'is-active');
  }

  private isOverTrash(element: HTMLElement): boolean {
    if (!this.trashArea) {
      return false;
    }

    const elementRect = element.getBoundingClientRect();
    const trashRect = this.trashArea.getBoundingClientRect();
    const centerX = elementRect.left + elementRect.width / 2;
    const centerY = elementRect.top + elementRect.height / 2;

    return centerX >= trashRect.left && centerX <= trashRect.right && centerY >= trashRect.top && centerY <= trashRect.bottom;
  }

  private isNearGuide(element: HTMLElement, guide: HTMLElement, tolerance: number): boolean {
    return this.rectDistance(element.getBoundingClientRect(), guide.getBoundingClientRect()) < tolerance;
  }

  private rectDistance(a: DOMRect, b: DOMRect): number {
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;
    return Math.hypot(ax - bx, ay - by);
  }

  private countCompletedTasks(): number {
    return Object.values(this.tasks).filter(Boolean).length;
  }

  private query<T extends HTMLElement>(selector: string): T | undefined {
    return this.root?.querySelector<T>(selector) ?? undefined;
  }

  private queryRequired<T extends HTMLElement>(selector: string): T {
    const element = this.query<T>(selector);
    if (!element) {
      throw new Error(`Missing Slide Deck Disaster element: ${selector}`);
    }

    return element;
  }

  private getMarkup(): string {
    const homeButton = this.mode === 'standalone' ? '<button type="button" data-action="home">Home</button>' : '';
    const resultButtonLabel = this.mode === 'workday' ? 'Next Task' : 'Play Again';

    return `
      <main class="slide-deck__game">
        <aside class="slide-deck__sidebar">
          <div>
            <h1>Slide Deck Disaster</h1>
            <p class="slide-deck__subtitle">Fix the boss's cursed PowerPoint before the meeting starts.</p>
          </div>
          <div class="slide-deck__meeting-timer">
            <div class="slide-deck__meeting-kicker">MEETING STARTS IN</div>
            <div class="slide-deck__meeting-clock"><span data-role="time-text">00:30.0</span></div>
            <div class="slide-deck__meeting-status" data-role="meeting-status">Stakeholders are joining the call.</div>
            <div class="slide-deck__meeting-progress"><div class="slide-deck__meeting-fill" data-role="time-fill"></div></div>
          </div>
          <div class="slide-deck__boss-bubble" data-role="boss-bubble">${bossLines[0]}</div>
          <ul class="slide-deck__task-list">
            <li data-task="chart">Align the chart</li>
            <li data-task="text">Align the bullet box</li>
            <li data-task="logo">Fix the logo size</li>
            <li data-task="font">Set text to readable size</li>
            <li data-task="clipart">Drag cursed clip art to trash</li>
          </ul>
          <div class="slide-deck__buttons">
            ${homeButton}
            <button type="button" data-action="restart">Restart Disaster</button>
          </div>
        </aside>
        <section class="slide-deck__stage-wrap">
          <div class="slide-deck__slide">
            <div class="slide-deck__slide-header"></div>
            <div class="slide-deck__slide-title">Q4 Synergy Roadmap</div>
            <div class="slide-deck__guide" data-guide="chart" style="left: 54px; top: 128px; width: 270px; height: 180px;"></div>
            <div class="slide-deck__guide" data-guide="text" style="left: 384px; top: 130px; width: 320px; height: 120px;"></div>
            <div class="slide-deck__guide" data-guide="logo" style="left: 590px; top: 412px; width: 168px; height: 76px;"></div>
            <div class="slide-deck__object slide-deck__chart" data-role="chart" style="left: 90px; top: 350px;">
              <div class="slide-deck__bar" style="width: 78%;"></div>
              <div class="slide-deck__bar" style="width: 45%;"></div>
              <div class="slide-deck__bar" style="width: 92%;"></div>
              <strong>Chart: Productivity Feelings</strong>
            </div>
            <div class="slide-deck__object slide-deck__text-box" data-role="text-box" style="left: 425px; top: 305px;">
              <div>* Align customer vibes</div>
              <div>* Increase cloud enthusiasm</div>
              <div>* Monetize rectangles</div>
            </div>
            <div class="slide-deck__object slide-deck__logo" data-role="logo" style="left: 450px; top: 430px;">
              LOGO
              <span class="slide-deck__resize-handle is-nw" data-resize-handle="nw"></span>
              <span class="slide-deck__resize-handle is-ne" data-resize-handle="ne"></span>
              <span class="slide-deck__resize-handle is-sw" data-resize-handle="sw"></span>
              <span class="slide-deck__resize-handle is-se" data-resize-handle="se"></span>
            </div>
            <div class="slide-deck__object slide-deck__font-box is-small" data-role="font-box" style="left: 54px; top: 420px;">
              Click this box until the text is readable, but not boss-huge.
            </div>
            <div class="slide-deck__object slide-deck__clipart" data-role="clipart" style="left: 672px; top: 170px;">VIBE</div>
            <div class="slide-deck__trash-area" data-role="trash-area"><span><span class="slide-deck__trash-icon">[X]</span>TRASH</span></div>
            <div class="slide-deck__stamp">DRAFT</div>
          </div>
          <div class="slide-deck__result" data-role="result">
            <div class="slide-deck__result-card">
              <h2 data-role="result-title">Meeting Saved</h2>
              <p data-role="result-text"></p>
              <button type="button" data-action="result-primary">${resultButtonLabel}</button>
            </div>
          </div>
        </section>
        <div class="slide-deck__notification-overlay" data-role="notification-overlay" aria-live="assertive">
          <div class="slide-deck__notification">
            <div class="slide-deck__notification-icon">CAL</div>
            <div>
              <div class="slide-deck__notification-title" data-role="notification-title">Meeting starting soon</div>
              <div class="slide-deck__notification-message" data-role="notification-message"></div>
            </div>
            <button type="button" data-action="dismiss-notification">Dismiss</button>
          </div>
        </div>
        <div class="slide-deck__start-overlay is-visible" data-role="start-overlay">
          <div class="slide-deck__start-card">
            <h2>Fix the PowerPoint before the meeting starts</h2>
            <p>The deck is broken, the boss is hovering, and the calendar is sharpening its tiny knives.</p>
            <button type="button" data-action="start">Start Fixing</button>
          </div>
        </div>
      </main>
    `;
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .slide-deck-minigame {
        position: absolute;
        inset: 0;
        z-index: 3;
        display: grid;
        place-items: center;
        color: white;
        font-family: Arial, Helvetica, sans-serif;
        user-select: none;
        background: radial-gradient(circle at top, #2d3350, #151827);
      }

      .slide-deck-minigame * {
        box-sizing: border-box;
      }

      .slide-deck__game {
        position: relative;
        width: min(1120px, 96vw);
        height: min(680px, 94vh);
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 18px;
        padding: 18px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 24px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
      }

      .slide-deck__sidebar {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 18px;
        border-radius: 20px;
        background: rgba(0, 0, 0, 0.2);
      }

      .slide-deck__sidebar h1 {
        margin: 0;
        font-size: 28px;
        line-height: 1;
      }

      .slide-deck__subtitle {
        margin: 8px 0 0;
        color: #cbd5e0;
        font-size: 14px;
        line-height: 1.35;
      }

      .slide-deck__meeting-timer {
        position: relative;
        overflow: hidden;
        padding: 14px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05));
        box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.04);
      }

      .slide-deck__meeting-timer::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: radial-gradient(circle at top right, rgba(99, 179, 237, 0.26), transparent 52%);
      }

      .slide-deck__meeting-kicker {
        position: relative;
        display: flex;
        align-items: center;
        gap: 7px;
        color: #cbd5e0;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.12em;
      }

      .slide-deck__meeting-kicker::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #68d391;
        box-shadow: 0 0 12px rgba(104, 211, 145, 0.9);
      }

      .slide-deck__meeting-clock {
        position: relative;
        margin-top: 6px;
        font-size: 42px;
        line-height: 1;
        font-weight: 900;
        font-variant-numeric: tabular-nums;
        text-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
      }

      .slide-deck__meeting-status {
        position: relative;
        min-height: 34px;
        margin-top: 8px;
        color: #e2e8f0;
        font-size: 13px;
        line-height: 1.3;
      }

      .slide-deck__meeting-progress {
        position: relative;
        width: 100%;
        height: 10px;
        margin-top: 10px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
      }

      .slide-deck__meeting-fill {
        height: 100%;
        width: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #68d391, #63b3ed);
        transition: width 0.2s ease, background 0.2s ease;
      }

      .slide-deck__meeting-timer.is-urgent {
        animation: slideDeckTimerPulse 0.85s ease-in-out infinite alternate;
      }

      .slide-deck__meeting-timer.is-urgent .slide-deck__meeting-fill {
        background: linear-gradient(90deg, #f6ad55, #f56565);
      }

      .slide-deck__meeting-timer.is-critical {
        border-color: rgba(245, 101, 101, 0.7);
        animation: slideDeckTimerPulse 0.36s ease-in-out infinite alternate;
      }

      .slide-deck__meeting-timer.is-critical .slide-deck__meeting-clock {
        color: #fed7d7;
      }

      .slide-deck__boss-bubble {
        min-height: 96px;
        padding: 14px;
        border-radius: 18px;
        background: #fff7d6;
        color: #32250f;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.35;
      }

      .slide-deck__boss-bubble::before {
        content: "BOSS";
        display: block;
        margin-bottom: 6px;
        color: #8a5b00;
        font-size: 11px;
        letter-spacing: 0.08em;
      }

      .slide-deck__task-list {
        margin: 0;
        padding-left: 18px;
        color: #edf2f7;
        font-size: 14px;
        line-height: 1.6;
      }

      .slide-deck__task-list .is-done {
        color: #9ae6b4;
        text-decoration: line-through;
      }

      .slide-deck__buttons {
        display: grid;
        gap: 8px;
        margin-top: auto;
      }

      .slide-deck-minigame button {
        min-height: 40px;
        border: 0;
        border-radius: 14px;
        padding: 10px 14px;
        background: #63b3ed;
        color: #07111d;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 8px 20px rgba(99, 179, 237, 0.25);
      }

      .slide-deck-minigame button:hover {
        transform: translateY(-1px);
      }

      .slide-deck__stage-wrap {
        position: relative;
        min-width: 0;
        overflow: hidden;
        padding: 18px;
        border-radius: 22px;
        background: rgba(0, 0, 0, 0.22);
      }

      .slide-deck__stage-wrap::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 12;
        pointer-events: none;
        opacity: 0;
        border-radius: 22px;
        background: radial-gradient(circle, transparent 54%, rgba(245, 101, 101, 0.32));
        transition: opacity 0.18s ease;
      }

      .slide-deck__stage-wrap.is-urgent::after {
        opacity: 0.38;
      }

      .slide-deck__stage-wrap.is-critical::after {
        opacity: 0.75;
        animation: slideDeckDangerFlicker 0.42s ease-in-out infinite alternate;
      }

      .slide-deck__slide {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-radius: 12px;
        background: #f6f1df;
        color: #222222;
        box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.08);
      }

      .slide-deck__slide-header {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 72px;
        background: #2b6cb0;
      }

      .slide-deck__slide-title {
        position: absolute;
        top: 18px;
        left: 36px;
        color: white;
        font-size: 30px;
        font-weight: 900;
      }

      .slide-deck__guide {
        position: absolute;
        pointer-events: none;
        border: 2px dashed rgba(72, 187, 120, 0.8);
        border-radius: 8px;
      }

      .slide-deck__object {
        position: absolute;
        border-radius: 8px;
        cursor: grab;
        touch-action: none;
        transition: box-shadow 0.12s ease, transform 0.12s ease;
      }

      .slide-deck__object.is-dragging {
        z-index: 5;
        cursor: grabbing;
        transform: scale(1.02);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
      }

      .slide-deck__chart {
        width: 270px;
        height: 180px;
        padding: 18px;
        border: 2px solid #2d3748;
        background: white;
      }

      .slide-deck__bar {
        height: 28px;
        margin: 12px 0;
        border-radius: 0 8px 8px 0;
        background: #90cdf4;
      }

      .slide-deck__text-box {
        width: 320px;
        min-height: 120px;
        padding: 16px;
        border: 2px solid #2d3748;
        background: rgba(255, 255, 255, 0.9);
        font-weight: 700;
        line-height: 1.35;
      }

      .slide-deck__logo {
        width: 120px;
        height: 54px;
        display: grid;
        place-items: center;
        overflow: visible;
        border: 3px solid #f6ad55;
        background: #1a202c;
        color: white;
        font-weight: 900;
      }

      .slide-deck__logo.is-resizing {
        outline: 2px solid rgba(49, 130, 206, 0.7);
        outline-offset: 4px;
      }

      .slide-deck__resize-handle {
        position: absolute;
        z-index: 8;
        width: 16px;
        height: 16px;
        border: 3px solid white;
        border-radius: 50%;
        background: #f6ad55;
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.28);
      }

      .slide-deck__resize-handle.is-nw { left: -9px; top: -9px; cursor: nwse-resize; }
      .slide-deck__resize-handle.is-ne { right: -9px; top: -9px; cursor: nesw-resize; }
      .slide-deck__resize-handle.is-sw { left: -9px; bottom: -9px; cursor: nesw-resize; }
      .slide-deck__resize-handle.is-se { right: -9px; bottom: -9px; cursor: nwse-resize; }

      .slide-deck__clipart {
        width: 112px;
        height: 112px;
        display: grid;
        place-items: center;
        border: 3px solid #d53f8c;
        background: #fed7e2;
        color: #97266d;
        font-size: 24px;
        font-weight: 900;
      }

      .slide-deck__font-box {
        width: 260px;
        min-height: 94px;
        padding: 12px;
        border: 2px solid #319795;
        background: #e6fffa;
        font-weight: 800;
        cursor: pointer;
      }

      .slide-deck__font-box.is-small { font-size: 10px; }
      .slide-deck__font-box.is-good { border-color: #38a169; font-size: 18px; }
      .slide-deck__font-box.is-boss-huge { font-size: 32px; }

      .slide-deck__trash-area {
        position: absolute;
        left: 372px;
        bottom: 24px;
        width: 170px;
        height: 86px;
        display: grid;
        place-items: center;
        opacity: 0;
        transform: translateY(12px) scale(0.96);
        border: 3px dashed rgba(245, 101, 101, 0.72);
        border-radius: 18px;
        background: rgba(245, 101, 101, 0.12);
        color: #742a2a;
        font-weight: 900;
        line-height: 1.2;
        text-align: center;
        pointer-events: none;
        transition: opacity 0.12s ease, transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
      }

      .slide-deck__trash-area.is-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .slide-deck__trash-area.is-active {
        opacity: 1;
        transform: translateY(0) scale(1.06);
        border-color: #f56565;
        background: rgba(245, 101, 101, 0.24);
      }

      .slide-deck__trash-icon {
        display: block;
        margin-bottom: 2px;
        font-size: 24px;
      }

      .slide-deck__stamp {
        position: absolute;
        right: 24px;
        bottom: 22px;
        color: rgba(0, 0, 0, 0.22);
        font-size: 42px;
        font-weight: 900;
        pointer-events: none;
        transform: rotate(-10deg);
      }

      .slide-deck__result,
      .slide-deck__start-overlay {
        position: absolute;
        inset: 0;
        z-index: 20;
        display: none;
        place-items: center;
        padding: 30px;
        text-align: center;
      }

      .slide-deck__result {
        background: rgba(10, 13, 24, 0.9);
      }

      .slide-deck__result.is-visible,
      .slide-deck__start-overlay.is-visible {
        display: grid;
      }

      .slide-deck__result-card {
        width: min(520px, 90%);
        padding: 28px;
        border-radius: 24px;
        background: white;
        color: #172033;
        box-shadow: 0 20px 70px rgba(0, 0, 0, 0.42);
      }

      .slide-deck__result-card h2 {
        margin: 0 0 12px;
        font-size: 34px;
      }

      .slide-deck__start-overlay {
        z-index: 45;
        background: radial-gradient(circle at top, rgba(45, 51, 80, 0.96), rgba(7, 10, 20, 0.96));
      }

      .slide-deck__start-card {
        width: min(620px, 92%);
        padding: 34px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
      }

      .slide-deck__start-card h2 {
        margin: 0 0 14px;
        font-size: clamp(34px, 6vw, 58px);
        line-height: 0.98;
      }

      .slide-deck__start-card p {
        max-width: 460px;
        margin: 0 auto 24px;
        color: #dce4f2;
        font-size: 17px;
        line-height: 1.45;
      }

      .slide-deck__start-card button {
        min-width: 180px;
        background: #68d391;
        font-size: 18px;
        box-shadow: 0 12px 28px rgba(104, 211, 145, 0.28);
      }

      .slide-deck__notification-overlay {
        position: absolute;
        inset: 0;
        z-index: 30;
        display: none;
        align-items: flex-end;
        justify-content: center;
        padding: 24px;
        background: rgba(5, 8, 17, 0.34);
        backdrop-filter: blur(2px);
      }

      .slide-deck__notification-overlay.is-visible {
        display: flex;
        animation: slideDeckNotificationStatic 0.2s linear infinite;
      }

      .slide-deck__notification {
        width: min(720px, 92%);
        display: grid;
        grid-template-columns: 54px 1fr auto;
        gap: 14px;
        align-items: center;
        padding: 16px;
        border: 3px solid #f56565;
        border-radius: 22px;
        background: #f7fafc;
        color: #172033;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45), 0 0 0 6px rgba(245, 101, 101, 0.22);
        animation: slideDeckNotificationSlideUp 0.22s ease-out, slideDeckNotificationNudge 0.52s ease-in-out infinite alternate;
      }

      .slide-deck__notification-icon {
        width: 54px;
        height: 54px;
        display: grid;
        place-items: center;
        border-radius: 16px;
        background: #fed7d7;
        font-size: 15px;
        font-weight: 900;
      }

      .slide-deck__notification-title {
        margin-bottom: 4px;
        font-size: 18px;
        font-weight: 900;
      }

      .slide-deck__notification-message {
        color: #4a5568;
        font-size: 14px;
        line-height: 1.35;
      }

      .slide-deck__notification button {
        min-width: 128px;
        background: #f56565;
        color: white;
        box-shadow: 0 8px 20px rgba(245, 101, 101, 0.32);
      }

      .slide-deck__confetti {
        position: absolute;
        pointer-events: none;
        animation: slideDeckFall 1.4s ease-in forwards;
      }

      .is-shaking {
        animation: slideDeckShake 0.18s linear 3;
      }

      @keyframes slideDeckTimerPulse {
        from { transform: scale(1); box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.04), 0 0 0 rgba(245, 101, 101, 0); }
        to { transform: scale(1.015); box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.04), 0 0 28px rgba(245, 101, 101, 0.28); }
      }

      @keyframes slideDeckDangerFlicker {
        from { opacity: 0.55; }
        to { opacity: 0.82; }
      }

      @keyframes slideDeckNotificationSlideUp {
        from { transform: translateY(130%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes slideDeckNotificationNudge {
        from { transform: translateY(0) rotate(-0.35deg); }
        to { transform: translateY(-5px) rotate(0.35deg); }
      }

      @keyframes slideDeckNotificationStatic {
        0% { background: rgba(5, 8, 17, 0.3); }
        50% { background: rgba(5, 8, 17, 0.42); }
        100% { background: rgba(5, 8, 17, 0.34); }
      }

      @keyframes slideDeckFall {
        to { transform: translateY(760px) rotate(540deg); opacity: 0; }
      }

      @keyframes slideDeckShake {
        0% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        50% { transform: translateX(5px); }
        75% { transform: translateX(-3px); }
        100% { transform: translateX(0); }
      }

      @media (max-width: 820px) {
        .slide-deck__game {
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr;
          height: 96vh;
          padding: 10px;
          gap: 10px;
        }

        .slide-deck__sidebar {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 12px;
        }

        .slide-deck__sidebar h1 {
          font-size: 22px;
        }

        .slide-deck__boss-bubble,
        .slide-deck__task-list {
          display: none;
        }

        .slide-deck__buttons {
          margin-top: 0;
        }

        .slide-deck__notification {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.append(style);
    this.style = style;
  }

  private cleanup(): void {
    this.abortController?.abort();
    this.cleanupMiniGame();
    this.root?.remove();
    this.style?.remove();
    this.root = undefined;
    this.style = undefined;
    this.abortController = undefined;
    this.taskItems.clear();
  }
}
