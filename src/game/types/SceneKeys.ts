export const SceneKeys = {
  boot: 'BootScene',
  preload: 'PreloadScene',
  mainMenu: 'MainMenuScene',
  workday: 'WorkdayScene',
  taskIntro: 'TaskIntroScene',
  bossFight: 'BossFightScene',
  results: 'ResultsScene',
  gameOver: 'GameOverScene',
  flappyBird: 'FlappyBirdScene',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
