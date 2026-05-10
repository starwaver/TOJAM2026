import Phaser from 'phaser';
import { BossFightScene } from '../scenes/BossFightScene';
import { BootScene } from '../scenes/BootScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { ResultsScene } from '../scenes/ResultsScene';
import { TaskIntroScene } from '../scenes/TaskIntroScene';
import { WorkdayScene } from '../scenes/WorkdayScene';
import { CoffeeRunScene } from '../scenes/minigames/CoffeeRunScene';
import { FlappyBirdScene } from '../scenes/minigames/FlappyBirdScene';
import { SlideDeckDisasterScene } from '../scenes/minigames/SlideDeckDisasterScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#101820',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    WorkdayScene,
    TaskIntroScene,
    BossFightScene,
    ResultsScene,
    GameOverScene,
    FlappyBirdScene,
    SlideDeckDisasterScene,
    CoffeeRunScene,
  ],
};
