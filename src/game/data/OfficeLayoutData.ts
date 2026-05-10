import { OfficeAssetFrames, type OfficeAssetFrame } from '../assets/OfficeAssets';

/**
 * Office item kinds that can be placed in the scene.
 * - `atlas`: a sprite from the office atlas spritesheet
 * - `worker`: the worker character
 * - `boss`: the boss character
 */
type OfficeItemKind = 'atlas' | 'worker' | 'boss';

/**
 * Serializable description of a single office item placement.
 * This is the canonical layout format stored in this file and
 * also the format persisted to localStorage by the editor.
 */
export type OfficeSceneItem = {
  id: string;
  kind: OfficeItemKind;
  x: number;
  y: number;
  scale: number;
  frame?: OfficeAssetFrame;
  flipX?: boolean;
};

/**
 * Default office layout used when no localStorage override exists.
 *
 * To update this layout:
 * 1. Open the game locally and use the "Edit Scene" editor
 * 2. Arrange furniture as desired
 * 3. Click "Export JSON" to copy the layout to your clipboard
 * 4. Replace the array below with the exported JSON
 * 5. Commit and push — the remote deployment will pick it up
 */
export const DEFAULT_OFFICE_ITEMS: OfficeSceneItem[] = [
  { id: 'plant-left', kind: 'atlas', frame: OfficeAssetFrames.tallPottedPlant, x: 108, y: 282, scale: 1.45 },
  { id: 'cabinet-boss', kind: 'atlas', frame: OfficeAssetFrames.lowCabinetWithPlant, x: 1214, y: 318, scale: 1.28 },
  { id: 'water-cooler', kind: 'atlas', frame: OfficeAssetFrames.waterCooler, x: 1035, y: 330, scale: 1.35 },
  { id: 'file-cabinet-top-1', kind: 'atlas', frame: OfficeAssetFrames.fileCabinetSingle03, x: 1322, y: 320, scale: 1.2 },
  { id: 'file-cabinet-top-2', kind: 'atlas', frame: OfficeAssetFrames.fileCabinetSingle02, x: 1374, y: 320, scale: 1.2 },
  { id: 'bookcase-left', kind: 'atlas', frame: OfficeAssetFrames.bookcaseNormal, x: 370, y: 602, scale: 1.38 },
  { id: 'storage-right', kind: 'atlas', frame: OfficeAssetFrames.storageCabinetNormal, x: 1080, y: 610, scale: 1.28 },
  { id: 'coffee-table', kind: 'atlas', frame: OfficeAssetFrames.coffeeStationTable, x: 170, y: 646, scale: 1.45 },
  { id: 'trash-can', kind: 'atlas', frame: OfficeAssetFrames.trashCan, x: 89, y: 674, scale: 1.25 },
  { id: 'copier', kind: 'atlas', frame: OfficeAssetFrames.copierNormal, x: 1246, y: 724, scale: 1.35 },
  { id: 'worker-desks', kind: 'atlas', frame: OfficeAssetFrames.doubleDesksNormal, x: 285, y: 934, scale: 1.6 },
  { id: 'desk-center', kind: 'atlas', frame: OfficeAssetFrames.singleDeskNormal, x: 630, y: 904, scale: 1.68 },
  { id: 'desk-broken', kind: 'atlas', frame: OfficeAssetFrames.singleDeskBroken, x: 890, y: 934, scale: 1.55 },
  { id: 'filing-bottom', kind: 'atlas', frame: OfficeAssetFrames.filingCabinetsNormal, x: 1086, y: 960, scale: 1.18 },
  { id: 'boxes-bottom', kind: 'atlas', frame: OfficeAssetFrames.cardboardStackLarge, x: 1370, y: 966, scale: 1.35 },
  { id: 'door-mat', kind: 'atlas', frame: OfficeAssetFrames.doorMat02, x: 88, y: 944, scale: 1.45 },
  { id: 'worker', kind: 'worker', x: 155, y: 906, scale: 1.35 },
  { id: 'boss', kind: 'boss', x: 1278, y: 378, scale: 1.35 },
];
