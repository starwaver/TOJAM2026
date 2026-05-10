import { OfficeAssetFrames } from '../assets/OfficeAssets';

/**
 * Effect triggered when a breakable item is smashed by the boss.
 * - bounce: boss bounces hard off the object
 * - paper: paper debris particle effect
 * - spin: boss spins and changes direction
 * - boost: boss gets a speed boost
 * - final: special effect for the CEO table
 */
export type BreakableEffect = 'bounce' | 'paper' | 'spin' | 'boost' | 'final';

/**
 * Score tiers based on item size. Larger items yield more points.
 */
export const ScoreTier = {
  TINY: 50,
  SMALL: 100,
  MEDIUM: 200,
  MEDIUM_LARGE: 350,
  LARGE: 500,
  SPECIAL: 1000,
} as const;

export type ScoreTierValue = (typeof ScoreTier)[keyof typeof ScoreTier];

/**
 * Configuration for a breakable office item in the boss fight.
 */
export type BreakableItemConfig = {
  id: string;
  /** Atlas frame name for the intact state (or texture key if useAtlas is false) */
  normalFrame: string;
  /** Atlas frame name for the broken state (or texture key if useAtlas is false) */
  brokenFrame: string;
  /** Whether this item uses the office atlas (true) or standalone textures (false) */
  useAtlas: boolean;
  /** X position in office-space coordinates */
  officeX: number;
  /** Y position in office-space coordinates */
  officeY: number;
  /** Scale in office-space (before play-space mapping) */
  officeScale: number;
  /** Effect triggered on break */
  effect: BreakableEffect;
  /** Score value when broken */
  tier: ScoreTierValue;
  /** Display label when intact */
  label: string;
  /** Payout burst text when broken */
  payoutText: string;
  /** Whether to flip the sprite horizontally */
  flipX?: boolean;
};

/**
 * Configuration for a non-breakable decorative office item.
 */
export type NonBreakableConfig = {
  id: string;
  /** Atlas frame name */
  frame: string;
  /** X position in office-space coordinates */
  officeX: number;
  /** Y position in office-space coordinates */
  officeY: number;
  /** Scale in office-space (before play-space mapping) */
  officeScale: number;
  /** Whether to flip the sprite horizontally */
  flipX?: boolean;
};

/**
 * All breakable items in the boss fight arena.
 * Positions derived from DEFAULT_OFFICE_ITEMS in OfficeLayoutData.
 * Only items that have a `_broken` atlas frame variant are included.
 */
export const BOSS_FIGHT_BREAKABLES: BreakableItemConfig[] = [
  // ── Water Cooler ──────────────────────────────────────────────
  {
    id: 'water-cooler',
    normalFrame: OfficeAssetFrames.waterCooler,
    brokenFrame: OfficeAssetFrames.waterCoolerBroken,
    useAtlas: true,
    officeX: 556.73,
    officeY: 189.69,
    officeScale: 1.75,
    effect: 'spin',
    tier: ScoreTier.SMALL,
    label: 'WATER COOLER',
    payoutText: 'COOLER CHAOS!',
  },

  // ── Storage Cabinet ───────────────────────────────────────────
  {
    id: 'storage-cabinet',
    normalFrame: OfficeAssetFrames.storageCabinetNormal,
    brokenFrame: OfficeAssetFrames.storageCabinetBroken,
    useAtlas: true,
    officeX: 1295.39,
    officeY: 402.3,
    officeScale: 1.28,
    effect: 'boost',
    tier: ScoreTier.MEDIUM_LARGE,
    label: 'STORAGE CABINET',
    payoutText: 'CABINET CRUSHED!',
  },

  // ── Trash Cans (5 instances) ──────────────────────────────────
  {
    id: 'trash-can-1',
    normalFrame: OfficeAssetFrames.trashCan,
    brokenFrame: OfficeAssetFrames.trashCanBroken,
    useAtlas: true,
    officeX: 144.23,
    officeY: 597.77,
    officeScale: 1.25,
    effect: 'spin',
    tier: ScoreTier.TINY,
    label: 'TRASH CAN',
    payoutText: 'TRASH TRASHED!',
  },
  {
    id: 'trash-can-2',
    normalFrame: OfficeAssetFrames.trashCan,
    brokenFrame: OfficeAssetFrames.trashCanBroken,
    useAtlas: true,
    officeX: 411.41,
    officeY: 889.9,
    officeScale: 1.25,
    effect: 'spin',
    tier: ScoreTier.TINY,
    label: 'TRASH CAN',
    payoutText: 'TRASH TRASHED!',
  },
  {
    id: 'trash-can-3',
    normalFrame: OfficeAssetFrames.trashCan,
    brokenFrame: OfficeAssetFrames.trashCanBroken,
    useAtlas: true,
    officeX: 799.11,
    officeY: 608.18,
    officeScale: 1.25,
    effect: 'spin',
    tier: ScoreTier.TINY,
    label: 'TRASH CAN',
    payoutText: 'TRASH TRASHED!',
  },
  {
    id: 'trash-can-4',
    normalFrame: OfficeAssetFrames.trashCan,
    brokenFrame: OfficeAssetFrames.trashCanBroken,
    useAtlas: true,
    officeX: 406.99,
    officeY: 324.25,
    officeScale: 1.25,
    effect: 'spin',
    tier: ScoreTier.TINY,
    label: 'TRASH CAN',
    payoutText: 'TRASH TRASHED!',
  },
  {
    id: 'trash-can-5',
    normalFrame: OfficeAssetFrames.trashCan,
    brokenFrame: OfficeAssetFrames.trashCanBroken,
    useAtlas: true,
    officeX: 530.7,
    officeY: 895.43,
    officeScale: 1.25,
    effect: 'spin',
    tier: ScoreTier.TINY,
    label: 'TRASH CAN',
    payoutText: 'TRASH TRASHED!',
  },

  // ── Copier ────────────────────────────────────────────────────
  {
    id: 'copier',
    normalFrame: OfficeAssetFrames.copierNormal,
    brokenFrame: OfficeAssetFrames.copierBroken,
    useAtlas: true,
    officeX: 832.9,
    officeY: 1069.8,
    officeScale: 1.45,
    effect: 'paper',
    tier: ScoreTier.MEDIUM,
    label: 'COPIER',
    payoutText: 'COPIER EXPLOSION!',
  },

  // ── Double Desks (6 instances) ─────────────────────────────────
  {
    id: 'double-desks-1',
    normalFrame: OfficeAssetFrames.doubleDesksNormal,
    brokenFrame: OfficeAssetFrames.doubleDesksBroken,
    useAtlas: true,
    officeX: 282.18,
    officeY: 349.66,
    officeScale: 1.25,
    effect: 'bounce',
    tier: ScoreTier.LARGE,
    label: 'DOUBLE DESKS',
    payoutText: 'DESKS DESTROYED!',
  },
  {
    id: 'double-desks-2',
    normalFrame: OfficeAssetFrames.doubleDesksNormal,
    brokenFrame: OfficeAssetFrames.doubleDesksBroken,
    useAtlas: true,
    officeX: 1002.35,
    officeY: 352.98,
    officeScale: 1.25,
    effect: 'bounce',
    tier: ScoreTier.LARGE,
    label: 'DOUBLE DESKS',
    payoutText: 'DESKS DESTROYED!',
  },
  {
    id: 'double-desks-3',
    normalFrame: OfficeAssetFrames.doubleDesksNormal,
    brokenFrame: OfficeAssetFrames.doubleDesksBroken,
    useAtlas: true,
    officeX: 283.28,
    officeY: 907.58,
    officeScale: 1.25,
    effect: 'bounce',
    tier: ScoreTier.LARGE,
    label: 'DOUBLE DESKS',
    payoutText: 'DESKS DESTROYED!',
  },
  {
    id: 'double-desks-4',
    normalFrame: OfficeAssetFrames.doubleDesksNormal,
    brokenFrame: OfficeAssetFrames.doubleDesksBroken,
    useAtlas: true,
    officeX: 664.35,
    officeY: 630.28,
    officeScale: 1.25,
    effect: 'bounce',
    tier: ScoreTier.LARGE,
    label: 'DOUBLE DESKS',
    payoutText: 'DESKS DESTROYED!',
  },
  {
    id: 'double-desks-5',
    normalFrame: OfficeAssetFrames.doubleDesksNormal,
    brokenFrame: OfficeAssetFrames.doubleDesksBroken,
    useAtlas: true,
    officeX: 286.6,
    officeY: 622.54,
    officeScale: 1.25,
    effect: 'bounce',
    tier: ScoreTier.LARGE,
    label: 'DOUBLE DESKS',
    payoutText: 'DESKS DESTROYED!',
  },
  {
    id: 'double-desks-6',
    normalFrame: OfficeAssetFrames.doubleDesksNormal,
    brokenFrame: OfficeAssetFrames.doubleDesksBroken,
    useAtlas: true,
    officeX: 669.88,
    officeY: 905.37,
    officeScale: 1.25,
    effect: 'bounce',
    tier: ScoreTier.LARGE,
    label: 'DOUBLE DESKS',
    payoutText: 'DESKS DESTROYED!',
  },

  // ── Filing Cabinets (2 instances) ─────────────────────────────
  {
    id: 'filing-cabinets-1',
    normalFrame: OfficeAssetFrames.filingCabinetsNormal,
    brokenFrame: OfficeAssetFrames.filingCabinetsBroken,
    useAtlas: true,
    officeX: 1327.09,
    officeY: 599.34,
    officeScale: 1.25,
    effect: 'paper',
    tier: ScoreTier.LARGE,
    label: 'FILING CABINETS',
    payoutText: 'FILES OBLITERATED!',
  },
  {
    id: 'filing-cabinets-2',
    normalFrame: OfficeAssetFrames.filingCabinetsNormal,
    brokenFrame: OfficeAssetFrames.filingCabinetsBroken,
    useAtlas: true,
    officeX: 1329.3,
    officeY: 741.86,
    officeScale: 1.25,
    effect: 'paper',
    tier: ScoreTier.LARGE,
    label: 'FILING CABINETS',
    payoutText: 'FILES OBLITERATED!',
  },

  // ── Bookcases (2 instances) ───────────────────────────────────
  {
    id: 'bookcase-1',
    normalFrame: OfficeAssetFrames.bookcaseNormal,
    brokenFrame: OfficeAssetFrames.bookcaseBroken,
    useAtlas: true,
    officeX: 1249.77,
    officeY: 1073.3,
    officeScale: 1.25,
    effect: 'bounce',
    tier: ScoreTier.LARGE,
    label: 'BOOKCASE',
    payoutText: 'BOOKCASE DEMOLISHED!',
  },
  {
    id: 'bookcase-2',
    normalFrame: OfficeAssetFrames.bookcaseNormal,
    brokenFrame: OfficeAssetFrames.bookcaseBroken,
    useAtlas: true,
    officeX: 1139.31,
    officeY: 845.71,
    officeScale: 1.25,
    effect: 'bounce',
    tier: ScoreTier.LARGE,
    label: 'BOOKCASE',
    payoutText: 'BOOKCASE DEMOLISHED!',
  },

  // ── Single Desks (3 instances) ────────────────────────────────
  {
    id: 'single-desk-1',
    normalFrame: OfficeAssetFrames.singleDeskNormal,
    brokenFrame: OfficeAssetFrames.singleDeskBroken,
    useAtlas: true,
    officeX: 625.69,
    officeY: 355.19,
    officeScale: 1.25,
    effect: 'bounce',
    tier: ScoreTier.MEDIUM_LARGE,
    label: 'SINGLE DESK',
    payoutText: 'DESK SMASHED!',
  },
  {
    id: 'single-desk-2',
    normalFrame: OfficeAssetFrames.singleDeskNormal,
    brokenFrame: OfficeAssetFrames.singleDeskBroken,
    useAtlas: true,
    officeX: 959.27,
    officeY: 613.71,
    officeScale: 1.25,
    effect: 'bounce',
    tier: ScoreTier.MEDIUM_LARGE,
    label: 'SINGLE DESK',
    payoutText: 'DESK SMASHED!',
  },
  {
    id: 'single-desk-3',
    normalFrame: OfficeAssetFrames.singleDeskNormal,
    brokenFrame: OfficeAssetFrames.singleDeskBroken,
    useAtlas: true,
    officeX: 967.0,
    officeY: 893.22,
    officeScale: 1.25,
    effect: 'bounce',
    tier: ScoreTier.MEDIUM_LARGE,
    label: 'SINGLE DESK',
    payoutText: 'DESK SMASHED!',
  },

  // ── CEO Table (special — uses standalone textures, not atlas) ──
  {
    id: 'ceo-table',
    normalFrame: 'ceo-table-intact',
    brokenFrame: 'ceo-table-broken',
    useAtlas: false,
    officeX: 1270.27,
    officeY: 292.93,
    officeScale: 1.35,
    effect: 'final',
    tier: ScoreTier.SPECIAL,
    label: 'CEO TABLE',
    payoutText: 'CEO TABLE ANNIHILATED!',
  },
];

/**
 * Non-breakable decorative items in the boss fight arena.
 * These are rendered as sprites but have no collision — purely visual.
 */
export const BOSS_FIGHT_DECORATIONS: NonBreakableConfig[] = [
  {
    id: 'plant-left',
    frame: OfficeAssetFrames.tallPottedPlant,
    officeX: 471.4,
    officeY: 180.36,
    officeScale: 1.25,
  },
  {
    id: 'cabinet-boss',
    frame: OfficeAssetFrames.lowCabinetWithPlant,
    officeX: 684.92,
    officeY: 182.11,
    officeScale: 1.28,
  },
  {
    id: 'coffee-table',
    frame: OfficeAssetFrames.coffeeStationTable,
    officeX: 1113.29,
    officeY: 587.45,
    officeScale: 1.45,
  },
  {
    id: 'boxes-bottom',
    frame: OfficeAssetFrames.cardboardStackLarge,
    officeX: 1371.1,
    officeY: 186.02,
    officeScale: 1.35,
  },
  {
    id: 'door-mat',
    frame: OfficeAssetFrames.doorMat02,
    officeX: 1411.26,
    officeY: 1005.87,
    officeScale: 1.25,
  },
  {
    id: 'cactus',
    frame: OfficeAssetFrames.smallPottedCactus,
    officeX: 134.17,
    officeY: 169.58,
    officeScale: 1.25,
  },
  {
    id: 'door-mat-2',
    frame: OfficeAssetFrames.doorMat01,
    officeX: 38.07,
    officeY: 379.49,
    officeScale: 1.25,
  },
  {
    id: 'blue-storage-1',
    frame: OfficeAssetFrames.blueStorageUnit,
    officeX: 35.86,
    officeY: 544.1,
    officeScale: 1.25,
  },
  {
    id: 'low-cabinet-2',
    frame: OfficeAssetFrames.lowCabinetWithPlant,
    officeX: 71.21,
    officeY: 723.08,
    officeScale: 1.25,
  },
  {
    id: 'blue-storage-2',
    frame: OfficeAssetFrames.blueStorageUnit,
    officeX: 1408.83,
    officeY: 829.14,
    officeScale: 1.25,
  },
  {
    id: 'boxes-top',
    frame: OfficeAssetFrames.cardboardStackLarge,
    officeX: 69.0,
    officeY: 185.05,
    officeScale: 1.45,
  },
];
