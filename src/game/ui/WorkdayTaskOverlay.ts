import Phaser from 'phaser';
import {
  workdayTaskQueue,
  WORKDAY_TASK_TIME_LIMIT_SECONDS,
  type AssignedWorkdayTask,
} from '../systems/WorkdayTaskQueue';

type OverlayTaskCard = {
  instanceId: string;
  displayName: string;
  expiresAtMs: number;
  isCurrent: boolean;
  assignment?: AssignedWorkdayTask;
};

export class WorkdayTaskOverlay {
  private root?: HTMLDivElement;

  constructor(
    private readonly leftOffsetPx: number,
    private readonly onSelectTask?: (assignment: AssignedWorkdayTask) => void,
  ) {}

  mount(): void {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app || this.root) {
      return;
    }

    const root = document.createElement('div');
    root.setAttribute('aria-label', 'Incoming tasks');
    root.style.position = 'absolute';
    root.style.top = '14px';
    root.style.left = `${this.leftOffsetPx}px`;
    root.style.right = '14px';
    root.style.zIndex = '4';
    root.style.display = 'grid';
    root.style.gap = '8px';
    root.style.pointerEvents = 'auto';
    root.style.userSelect = 'none';
    root.style.fontFamily = 'Arial, Helvetica, sans-serif';
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    root.addEventListener('click', (event) => event.stopPropagation());

    app.append(root);
    this.root = root;
    this.update();
  }

  update(): void {
    if (!this.root) {
      return;
    }

    const cards = this.getCards();
    this.root.replaceChildren();

    if (cards.length === 0) {
      const idle = document.createElement('div');
      idle.textContent = `Next ping ${Math.ceil(workdayTaskQueue.getNextAssignmentSeconds())}s`;
      idle.style.justifySelf = 'center';
      idle.style.padding = '10px 14px';
      idle.style.background = 'rgba(16, 24, 32, 0.76)';
      idle.style.border = '1px solid rgba(248, 245, 240, 0.24)';
      idle.style.color = '#cdd8d5';
      idle.style.font = '900 13px Arial, sans-serif';
      this.root.append(idle);
      return;
    }

    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexWrap = 'wrap';
    list.style.gap = '10px';

    for (const card of cards) {
      list.append(this.createTaskButton(card));
    }

    this.root.append(list);
  }

  setVisible(isVisible: boolean): void {
    if (this.root) {
      this.root.style.display = isVisible ? 'grid' : 'none';
    }
  }

  destroy(): void {
    this.root?.remove();
    this.root = undefined;
  }

  private getCards(): OverlayTaskCard[] {
    const activeAssignment = workdayTaskQueue.getActiveAssignment();
    const cards = workdayTaskQueue.getAssignments().map((assignment) => ({
      instanceId: assignment.instanceId,
      displayName: assignment.task.displayName,
      expiresAtMs: assignment.expiresAtMs,
      isCurrent: false,
      assignment,
    }));

    if (activeAssignment) {
      cards.unshift({
        instanceId: activeAssignment.instanceId,
        displayName: activeAssignment.task.displayName,
        expiresAtMs: activeAssignment.expiresAtMs,
        isCurrent: true,
        assignment: activeAssignment,
      });
    }

    return cards.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) {
        return a.isCurrent ? -1 : 1;
      }

      return a.expiresAtMs - b.expiresAtMs;
    });
  }

  private createTaskButton(card: OverlayTaskCard): HTMLButtonElement {
    const remaining = Math.max(0, (card.expiresAtMs - Date.now()) / 1000);
    const isCritical = remaining <= 10;
    const flashOn = isCritical && Math.floor(Date.now() / 250) % 2 === 0;
    const progress = Phaser.Math.Clamp((remaining / WORKDAY_TASK_TIME_LIMIT_SECONDS) * 100, 0, 100);
    const button = document.createElement('button');
    button.type = 'button';
    button.style.display = 'grid';
    button.style.gap = '8px';
    button.style.width = '280px';
    button.style.maxWidth = 'calc(100vw - 28px)';
    button.style.minHeight = '82px';
    button.style.padding = '12px';
    button.style.border = `2px solid ${isCritical ? '#e74c3c' : 'rgba(242, 193, 78, 0.92)'}`;
    button.style.background = flashOn ? '#e74c3c' : 'rgba(16, 24, 32, 0.92)';
    button.style.color = '#f8f5f0';
    button.style.textAlign = 'left';
    button.style.cursor = this.onSelectTask && !card.isCurrent ? 'pointer' : 'default';
    button.style.boxShadow = flashOn ? '0 0 0 4px rgba(231, 76, 60, 0.22)' : '0 12px 28px rgba(0, 0, 0, 0.34)';
    button.style.fontFamily = 'Arial, Helvetica, sans-serif';

    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr auto';
    row.style.gap = '10px';
    row.style.alignItems = 'center';

    const title = document.createElement('span');
    title.textContent = card.isCurrent ? `${card.displayName} (now)` : card.displayName;
    title.style.font = '900 16px Arial, sans-serif';

    const time = document.createElement('span');
    time.textContent = `${Math.ceil(remaining)}s`;
    time.style.color = isCritical ? '#fff2a8' : '#9ed8db';
    time.style.font = '900 18px Arial, sans-serif';

    const track = document.createElement('div');
    track.style.height = '8px';
    track.style.overflow = 'hidden';
    track.style.background = 'rgba(248, 245, 240, 0.14)';

    const fill = document.createElement('div');
    fill.style.width = `${progress}%`;
    fill.style.height = '100%';
    fill.style.background = isCritical ? '#e74c3c' : '#f2c14e';

    row.append(title, time);
    track.append(fill);
    button.append(row, track);

    const selectableAssignment = card.assignment;
    if (this.onSelectTask && selectableAssignment && !card.isCurrent) {
      button.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        this.onSelectTask?.(selectableAssignment);
      });
      button.addEventListener('pointerover', () => {
        button.style.transform = 'translateY(-2px)';
      });
      button.addEventListener('pointerout', () => {
        button.style.transform = 'translateY(0)';
      });
    }

    return button;
  }
}
