export const GameEvents = {
  taskComplete: 'task:complete',
  hudChanged: 'hud:changed',
} as const;

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents];
