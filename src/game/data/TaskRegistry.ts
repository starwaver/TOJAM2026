import { SceneKeys } from '../types/SceneKeys';
import type { TaskDefinition } from '../types/TaskTypes';

export const TaskRegistry: TaskDefinition[] = [
  {
    id: 'slide_deck_disaster',
    displayName: 'Slide Deck Disaster',
    scene: SceneKeys.slideDeckDisaster,
    baseTimeLimit: 15,
    minDifficulty: 1,
    maxDifficulty: 10,
    difficultyTimeScale: {
      minMultiplier: 0.65,
      maxMultiplier: 1,
    },
  },
  {
    id: 'coffee_run',
    displayName: 'Boss Coffee Run',
    scene: SceneKeys.coffeeRun,
    baseTimeLimit: 30,
    minDifficulty: 1,
    maxDifficulty: 10,
    difficultyTimeScale: {
      minMultiplier: 0.65,
      maxMultiplier: 1,
    },
  },
];
