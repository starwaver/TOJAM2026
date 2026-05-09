import type { SceneKey } from './SceneKeys';

export type SceneTransitionIntent =
  | {
      kind: 'immediate';
      target: SceneKey;
      data?: object;
    }
  | {
      kind: 'timed';
      target: SceneKey;
      durationMs: number;
      data?: object;
    }
  | {
      kind: 'video';
      target: SceneKey;
      videoKey: string;
      data?: object;
    };
