import type { GameStateData } from '../core/GameState';
import type { TaskConfig } from '../types/TaskTypes';

export class WorkdayHUD {
  private root?: HTMLDivElement;
  private sanityValue?: HTMLDivElement;
  private rageValue?: HTMLDivElement;
  private timerValue?: HTMLDivElement;
  private scoreValue?: HTMLDivElement;

  constructor(private readonly taskConfig: TaskConfig) {}

  mount(): void {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app || this.root) {
      return;
    }

    const root = document.createElement('div');
    root.setAttribute('aria-label', 'Workday status');
    root.style.position = 'absolute';
    root.style.left = '14px';
    root.style.top = '14px';
    root.style.width = 'min(260px, calc(100vw - 28px))';
    root.style.padding = '12px';
    root.style.background = 'rgba(16, 24, 32, 0.86)';
    root.style.border = '1px solid rgba(248, 245, 240, 0.28)';
    root.style.color = '#f8f5f0';
    root.style.font = '700 13px Arial, sans-serif';
    root.style.pointerEvents = 'none';
    root.style.userSelect = 'none';
    root.style.zIndex = '2';

    const title = document.createElement('div');
    title.textContent = this.taskConfig.displayName;
    title.style.marginBottom = '8px';
    title.style.color = '#f2c14e';

    this.sanityValue = this.createRow(root, 'Sanity');
    this.rageValue = this.createRow(root, 'Rage');
    this.timerValue = this.createRow(root, 'Timer');
    this.scoreValue = this.createRow(root, 'Score');

    root.prepend(title);
    app.append(root);
    this.root = root;
  }

  update(state: GameStateData, timeRemaining: number): void {
    this.setText(this.sanityValue, `${Math.round(state.sanity)}`);
    this.setText(this.rageValue, `${Math.round(state.rage)}`);
    this.setText(this.timerValue, `${Math.max(0, timeRemaining).toFixed(1)}s`);
    this.setText(this.scoreValue, `${state.score}`);
  }

  destroy(): void {
    this.root?.remove();
    this.root = undefined;
    this.sanityValue = undefined;
    this.rageValue = undefined;
    this.timerValue = undefined;
    this.scoreValue = undefined;
  }

  private createRow(root: HTMLDivElement, labelText: string): HTMLDivElement {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr auto';
    row.style.gap = '12px';
    row.style.marginTop = '4px';

    const label = document.createElement('span');
    label.textContent = labelText;
    label.style.color = '#9ed8db';

    const value = document.createElement('div');

    row.append(label, value);
    root.append(row);
    return value;
  }

  private setText(element: HTMLDivElement | undefined, value: string): void {
    if (element) {
      element.textContent = value;
    }
  }
}
