import type { SceneKey } from './SceneKeys';

export type SceneTransitionIntent =
  | {
      kind: 'immediate';
      target: SceneKey;
      data?: unknown;
    }
  | {
      kind: 'timed';
      target: SceneKey;
      durationMs: number;
      data?: unknown;
    }
  | {
      kind: 'video';
      target: SceneKey;
      videoKey: string;
      data?: unknown;
    };
