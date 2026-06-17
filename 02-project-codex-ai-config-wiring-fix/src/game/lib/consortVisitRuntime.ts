import type { ConsortPalaceActionId, InventoryItem } from '../types';
import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import { narrativeEntryToPresentation, type NarrativePresentationFields } from '../narrative/narrativeDialogueAdapter';

export const CONSORT_VISIT_TIME_COST = 1;
export const CONSORT_VISIT_STAMINA_COST = 1;
export const CONSORT_VISIT_STAMINA_BLOCK_TEXT = '眼下体力不足，还是先歇一歇，再去拜访妃嫔。';
export const CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN = 3;
export const CONSORT_AUDIENCE_FOLLOW_UP_LIMIT_PER_TOPIC = 2;
export const CONSORT_INTERACTION_LIMIT_TEXT = '本旬与她的互动已经够多，再强留只会显得刻意。';
export const CONSORT_INTERACTION_SEND_OFF_ACTION_LABEL = '送客';
export type ConsortSendOffNarrative = Pick<
  NarrativePresentationFields,
  'speakerIdentity' | 'speakerName' | 'text' | 'sceneHint' | 'narrationName'
>;

export const buildConsortInteractionLimitNarrativeEntry = (rankAndName: string): ConsortSendOffNarrative =>
  narrativeEntryToPresentation(renderNarrativeEntry('consort.sendoff.limit', { rankAndName, locationName: '寝殿' }));

export const buildConsortInteractionLimitNarrative = (rankAndName: string): string =>
  buildConsortInteractionLimitNarrativeEntry(rankAndName).text;

export const buildConsortAudienceSendOffNarrativeEntry = (rankAndName: string): ConsortSendOffNarrative =>
  narrativeEntryToPresentation(renderNarrativeEntry('consort.sendoff.audience', { rankAndName, locationName: '寝殿' }));

export const buildConsortAudienceSendOffNarrative = (rankAndName: string): string =>
  buildConsortAudienceSendOffNarrativeEntry(rankAndName).text;

export const buildConsortPublicEncounterSendOffNarrativeEntry = (rankAndName: string, locationName: string): ConsortSendOffNarrative =>
  narrativeEntryToPresentation(renderNarrativeEntry('consort.sendoff.public', { rankAndName, locationName }));

export const buildConsortPublicEncounterSendOffNarrative = (rankAndName: string, locationName: string): string =>
  buildConsortPublicEncounterSendOffNarrativeEntry(rankAndName, locationName).text;

export const CONSORT_AUDIENCE_FIXED_ACTIONS: Array<{ actionId: ConsortPalaceActionId; label: string }> = [
  { actionId: 'gift', label: '送礼' },
  { actionId: 'greet', label: '试探' },
  { actionId: 'win-over', label: '拉拢' },
];

export const canStartConsortVisit = (stamina: number): boolean => stamina >= CONSORT_VISIT_STAMINA_COST;

export const isConsortGiftItem = (item: InventoryItem): boolean =>
  item.quantity > 0 &&
  (item.favorDelta > 0 || item.healthDelta > 0 || item.appearanceDelta > 0 || item.temperamentDelta > 0);
