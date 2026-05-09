export const BalanceConfig = {
  maxSanity: 100,
  maxRage: 100,
  minTimeMultiplier: 0.35,
  maxTimeMultiplier: 1,
  // Sanity loss on success: baseSanityLoss + panicSanityLoss * (1 - timeRemainingRatio)
  // More time remaining = less panic = less sanity lost
  baseSanityLoss: 3,
  panicSanityLoss: 12,
  // Sanity loss on failure: large flat penalty regardless of time
  failSanityLoss: 30,
  // Rage on failure: base + per-difficulty-level scaling
  failRageBaseGain: 10,
  failRagePerDifficulty: 5,
  // Rage on success: none
  successRageGain: 0,
  lowSanityRageFactor: 0.1,
  bossFightDuration: 12,
  bossFightSanityRestore: 20,
  maxSanityRestoreFromBoss: 50,
  dayProgressPerTask: 10,
  dayCompleteProgress: 100,
  difficultyStepTasks: 1,
  maxDifficulty: 10,
} as const;
