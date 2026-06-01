import type { ConsortPalaceActionId, InventoryItem } from '../types';

export const CONSORT_VISIT_TIME_COST = 1;
export const CONSORT_VISIT_STAMINA_COST = 1;
export const CONSORT_VISIT_STAMINA_BLOCK_TEXT = '眼下体力不足，还是先歇一歇，再去拜访妃嫔。';

export const CONSORT_AUDIENCE_FIXED_ACTIONS: Array<{ actionId: ConsortPalaceActionId; label: string }> = [
  { actionId: 'gift', label: '送礼' },
  { actionId: 'greet', label: '试探' },
  { actionId: 'win-over', label: '拉拢' },
];

export const canStartConsortVisit = (stamina: number): boolean => stamina >= CONSORT_VISIT_STAMINA_COST;

export const isConsortGiftItem = (item: InventoryItem): boolean =>
  item.quantity > 0 &&
  (item.favorDelta > 0 || item.healthDelta > 0 || item.appearanceDelta > 0 || item.temperamentDelta > 0);
