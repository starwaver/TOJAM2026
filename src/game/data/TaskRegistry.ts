import { SceneKeys } from '../types/SceneKeys';
import type { TaskDefinition } from '../types/TaskTypes';

export const TaskRegistry: TaskDefinition[] = [
  {
    id: 'flappy_placeholder',
    displayName: 'Placeholder Task',
    scene: SceneKeys.flappyBird,
    baseTimeLimit: 15,
    minDifficulty: 1,
    maxDifficulty: 10,
  },
];
