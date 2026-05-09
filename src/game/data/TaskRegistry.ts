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
  {
    id: 'slide_deck_disaster',
    displayName: 'Slide Deck Disaster',
    scene: SceneKeys.slideDeckDisaster,
    baseTimeLimit: 30,
    minDifficulty: 1,
    maxDifficulty: 10,
  },
];
