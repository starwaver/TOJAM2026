import { TaskRegistry } from '../data/TaskRegistry';
import type { TaskDefinition } from '../types/TaskTypes';

export class TaskDirector {
  private readonly recentTaskIds: string[] = [];

  constructor(private readonly tasks: TaskDefinition[] = TaskRegistry) {}

  getNextTask(difficulty: number): TaskDefinition {
    const eligibleTasks = this.tasks.filter((task) => difficulty >= task.minDifficulty && difficulty <= task.maxDifficulty);
    const availableTasks = eligibleTasks.filter((task) => !this.recentTaskIds.includes(task.id));
    const pool = availableTasks.length > 0 ? availableTasks : eligibleTasks;
    const task = pool[Math.floor(Math.random() * pool.length)] ?? this.tasks[0];

    this.remember(task.id);
    return task;
  }

  reset(): void {
    this.recentTaskIds.length = 0;
  }

  private remember(taskId: string): void {
    this.recentTaskIds.push(taskId);

    if (this.recentTaskIds.length > 2) {
      this.recentTaskIds.shift();
    }
  }
}

export const taskDirector = new TaskDirector();
