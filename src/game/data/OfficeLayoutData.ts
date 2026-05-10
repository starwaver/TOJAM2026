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
  { id: 'plant-left', kind: 'atlas', frame: OfficeAssetFrames.tallPottedPlant, x: 471.40, y: 180.36, scale: 1.25 },
  { id: 'cabinet-boss', kind: 'atlas', frame: OfficeAssetFrames.lowCabinetWithPlant, x: 684.92, y: 182.11, scale: 1.28 },
  { id: 'water-cooler', kind: 'atlas', frame: OfficeAssetFrames.waterCooler, x: 556.73, y: 189.69, scale: 1.75 },
  { id: 'storage-right', kind: 'atlas', frame: OfficeAssetFrames.storageCabinetNormal, x: 1295.39, y: 402.30, scale: 1.28 },
  { id: 'coffee-table', kind: 'atlas', frame: OfficeAssetFrames.coffeeStationTable, x: 1113.29, y: 587.45, scale: 1.45 },
  { id: 'trash-can', kind: 'atlas', frame: OfficeAssetFrames.trashCan, x: 144.23, y: 597.77, scale: 1.25 },
  { id: 'copier', kind: 'atlas', frame: OfficeAssetFrames.copierNormal, x: 832.90, y: 1069.80, scale: 1.45 },
  { id: 'boxes-bottom', kind: 'atlas', frame: OfficeAssetFrames.cardboardStackLarge, x: 1371.10, y: 186.02, scale: 1.35 },
  { id: 'door-mat', kind: 'atlas', frame: OfficeAssetFrames.doorMat02, x: 1411.26, y: 1005.87, scale: 1.25 },
  { id: 'worker', kind: 'worker', x: 87.62, y: 997.70, scale: 1.35 },
  { id: 'boss', kind: 'boss', x: 1270.27, y: 292.93, scale: 1.35 },
  { id: 'trash_can-1778440104172', kind: 'atlas', frame: OfficeAssetFrames.trashCan, x: 411.41, y: 889.90, scale: 1.25 },
  { id: 'cardboard_stack_large-1778440315545', kind: 'atlas', frame: OfficeAssetFrames.cardboardStackLarge, x: 69.00, y: 185.05, scale: 1.45 },
  { id: 'small_potted_cactus-1778440331006', kind: 'atlas', frame: OfficeAssetFrames.smallPottedCactus, x: 134.17, y: 169.58, scale: 1.25 },
  { id: 'double_desks_normal-1778440372745', kind: 'atlas', frame: OfficeAssetFrames.doubleDesksNormal, x: 282.18, y: 349.66, scale: 1.25 },
  { id: 'double_desks_normal-1778440386411', kind: 'atlas', frame: OfficeAssetFrames.doubleDesksNormal, x: 1002.35, y: 352.98, scale: 1.25 },
  { id: 'filing_cabinets_normal-1778440411016', kind: 'atlas', frame: OfficeAssetFrames.filingCabinetsNormal, x: 1327.09, y: 599.34, scale: 1.25 },
  { id: 'bookcase_normal-1778440438068', kind: 'atlas', frame: OfficeAssetFrames.bookcaseNormal, x: 1249.77, y: 1073.30, scale: 1.25 },
  { id: 'door_mat_01-1778440452045', kind: 'atlas', frame: OfficeAssetFrames.doorMat01, x: 38.07, y: 379.49, scale: 1.25 },
  { id: 'single_desk_normal-1778440524818', kind: 'atlas', frame: OfficeAssetFrames.singleDeskNormal, x: 625.69, y: 355.19, scale: 1.25 },
  { id: 'single_desk_normal-1778440542102', kind: 'atlas', frame: OfficeAssetFrames.singleDeskNormal, x: 959.27, y: 613.71, scale: 1.25 },
  { id: 'bookcase_normal-1778440577780', kind: 'atlas', frame: OfficeAssetFrames.bookcaseNormal, x: 1139.31, y: 845.71, scale: 1.25 },
  { id: 'double_desks_normal-1778440641485', kind: 'atlas', frame: OfficeAssetFrames.doubleDesksNormal, x: 283.28, y: 907.58, scale: 1.25 },
  { id: 'double_desks_normal-1778440647679', kind: 'atlas', frame: OfficeAssetFrames.doubleDesksNormal, x: 664.35, y: 630.28, scale: 1.25 },
  { id: 'double_desks_normal-1778440648011', kind: 'atlas', frame: OfficeAssetFrames.doubleDesksNormal, x: 286.60, y: 622.54, scale: 1.25 },
  { id: 'filing_cabinets_normal-1778440689979', kind: 'atlas', frame: OfficeAssetFrames.filingCabinetsNormal, x: 1329.30, y: 741.86, scale: 1.25 },
  { id: 'trash_can-1778440762261', kind: 'atlas', frame: OfficeAssetFrames.trashCan, x: 799.11, y: 608.18, scale: 1.25 },
  { id: 'trash_can-1778440767537', kind: 'atlas', frame: OfficeAssetFrames.trashCan, x: 406.99, y: 324.25, scale: 1.25 },
  { id: 'single_desk_normal-1778440808589', kind: 'atlas', frame: OfficeAssetFrames.singleDeskNormal, x: 967.00, y: 893.22, scale: 1.25 },
  { id: 'blue_storage_unit-1778440832953', kind: 'atlas', frame: OfficeAssetFrames.blueStorageUnit, x: 35.86, y: 544.10, scale: 1.25 },
  { id: 'low_cabinet_with_plant-1778440840632', kind: 'atlas', frame: OfficeAssetFrames.lowCabinetWithPlant, x: 71.21, y: 723.08, scale: 1.25 },
];
