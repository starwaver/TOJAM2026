export interface FlappyConfig {
  gravity: number;
  flapVelocity: number;
  pipeGap: number;
  pipeSpeed: number;
  pipeSpacing: number;
}

export const DEFAULT_CONFIG: FlappyConfig = {
  gravity: 1450,
  flapVelocity: 480,
  pipeGap: 168,
  pipeSpeed: 220,
  pipeSpacing: 285,
};
