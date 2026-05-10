export const SceneKeys = {
  boot: 'BootScene',
  preload: 'PreloadScene',
  mainMenu: 'MainMenuScene',
  workday: 'WorkdayScene',
  taskIntro: 'TaskIntroScene',
  rageTransition: 'RageTransitionScene',
  bossFight: 'BossFightScene',
  results: 'ResultsScene',
  gameOver: 'GameOverScene',
  flappyBird: 'FlappyBirdScene',
  slideDeckDisaster: 'SlideDeckDisasterScene',
  coffeeRun: 'CoffeeRunScene',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
