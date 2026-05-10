import { taskDirector } from './TaskDirector';
import type { TaskDefinition, TaskResult } from '../types/TaskTypes';

export const WORKDAY_TASK_TIME_LIMIT_SECONDS = 30;
const MIN_ASSIGNMENT_DELAY_MS = 10_000;
const MAX_ASSIGNMENT_DELAY_MS = 20_000;

export interface AssignedWorkdayTask {
  instanceId: string;
  task: TaskDefinition;
  difficulty: number;
  assignedAtMs: number;
  expiresAtMs: number;
}

class WorkdayTaskQueue {
  private assignments: AssignedWorkdayTask[] = [];
  private nextAssignmentAtMs = 0;
  private sequence = 0;
  private hasSeededInitialAssignments = false;

  reset(nowMs = Date.now()): void {
    this.assignments = [];
    this.sequence = 0;
    this.nextAssignmentAtMs = nowMs;
    this.hasSeededInitialAssignments = false;
  }

  sync(difficulty: number, nowMs = Date.now()): TaskResult[] {
    this.ensureStarted(nowMs);

    if (!this.hasSeededInitialAssignments) {
      this.seedInitialAssignments(difficulty, nowMs);
    }

    this.spawnDueAssignments(difficulty, nowMs);
    return this.collectExpired(nowMs);
  }

  getAssignments(): AssignedWorkdayTask[] {
    return [...this.assignments].sort((a, b) => a.expiresAtMs - b.expiresAtMs);
  }

  claim(instanceId: string, nowMs = Date.now()): AssignedWorkdayTask | undefined {
    const index = this.assignments.findIndex((assignment) => assignment.instanceId === instanceId);
    if (index === -1) {
      return undefined;
    }

    const [assignment] = this.assignments.splice(index, 1);
    if (assignment.expiresAtMs <= nowMs) {
      return undefined;
    }

    return assignment;
  }

  complete(instanceId: string): void {
    this.assignments = this.assignments.filter((assignment) => assignment.instanceId !== instanceId);
  }

  getTaskTimeRemainingSeconds(assignment: AssignedWorkdayTask, nowMs = Date.now()): number {
    return Math.max(0, (assignment.expiresAtMs - nowMs) / 1000);
  }

  getNextAssignmentSeconds(nowMs = Date.now()): number {
    this.ensureStarted(nowMs);
    return Math.max(0, (this.nextAssignmentAtMs - nowMs) / 1000);
  }

  private ensureStarted(nowMs: number): void {
    if (this.nextAssignmentAtMs <= 0) {
      this.nextAssignmentAtMs = nowMs;
    }
  }

  private spawnDueAssignments(difficulty: number, nowMs: number): void {
    while (this.nextAssignmentAtMs <= nowMs) {
      const assignedAtMs = this.nextAssignmentAtMs;
      this.addAssignment(difficulty, assignedAtMs);
      this.nextAssignmentAtMs = assignedAtMs + this.getRandomAssignmentDelayMs();
    }
  }

  private seedInitialAssignments(difficulty: number, nowMs: number): void {
    this.hasSeededInitialAssignments = true;
    this.addAssignment(difficulty, nowMs);
    this.addAssignment(difficulty, nowMs);
    this.nextAssignmentAtMs = nowMs + this.getRandomAssignmentDelayMs();
  }

  private addAssignment(difficulty: number, assignedAtMs: number): void {
    const task = taskDirector.getNextTask(difficulty);

    this.sequence += 1;
    this.assignments.push({
      instanceId: `${assignedAtMs}-${this.sequence}`,
      task,
      difficulty,
      assignedAtMs,
      expiresAtMs: assignedAtMs + WORKDAY_TASK_TIME_LIMIT_SECONDS * 1000,
    });
  }

  private collectExpired(nowMs: number): TaskResult[] {
    const expired = this.assignments.filter((assignment) => assignment.expiresAtMs <= nowMs);
    this.assignments = this.assignments.filter((assignment) => assignment.expiresAtMs > nowMs);

    return expired.map((assignment) => ({
      taskId: assignment.task.id,
      success: false,
      score: 0,
      timeRemaining: 0,
      timeLimit: WORKDAY_TASK_TIME_LIMIT_SECONDS,
      timeRemainingRatio: 0,
      mistakes: 1,
    }));
  }

  private getRandomAssignmentDelayMs(): number {
    return MIN_ASSIGNMENT_DELAY_MS + Math.random() * (MAX_ASSIGNMENT_DELAY_MS - MIN_ASSIGNMENT_DELAY_MS);
  }
}

export const workdayTaskQueue = new WorkdayTaskQueue();
