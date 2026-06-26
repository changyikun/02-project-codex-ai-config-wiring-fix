import type { OpeningDialogueRequestPayload, OpeningDialogueResponsePayload } from '../../ai/openingDialogueAgent';
import { MONTHLY_EXPENSE_STRATEGIES } from '../../config/monthlyExpenseStrategy';
import { YINGLUOYETING_INITIAL_RESIDENCE } from '../../config/haremPalaces';
import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import type { NarrativeVariables } from '../narrative/csvNarrativeLoader';
import { narrativeEntryToOpeningDialogueFields } from '../narrative/narrativeDialogueAdapter';
import { resolvePlayerClanLabel, resolvePlayerSurname } from './playerNameRuntime';

const emptyEffects = () => ({
  silver: 0,
  stamina: 0,
  favor: 0,
  prestige: 0,
  stress: 0,
  trueHeart: 0,
  stats: {},
});

const buildFixedGuideOptions = (): OpeningDialogueResponsePayload['options'] =>
  MONTHLY_EXPENSE_STRATEGIES.map((strategy) => ({
    id: strategy.id,
    label: strategy.label,
    effectHint: `每月用度约为月俸${Math.round(strategy.expenseRate * 100)}%，声望${strategy.prestigeDelta >= 0 ? '+' : ''}${strategy.prestigeDelta}，健康${strategy.healthDelta >= 0 ? '+' : ''}${strategy.healthDelta}。`,
    nextTopic: 'opening-guide-finish',
    hiddenEffects: emptyEffects(),
    timeCost: 0,
  }));

const resolveSpeakerIdentity = (payload: OpeningDialogueRequestPayload): string =>
  payload.npcContext?.identity?.trim() || '贴身宫女';

const resolveRouteSummary = (payload: OpeningDialogueRequestPayload): string =>
  payload.routeContext?.playerRoleSummary?.trim() || '您如今已入宫墙，这一步先得把自己的处境看明白。';

const resolveRoutePressure = (payload: OpeningDialogueRequestPayload): string =>
  payload.routeContext?.routePressure?.trim() || '宫中人人看规矩，也看人心，行事总得留些余地。';

const resolveMapFeatureSummary = (payload: OpeningDialogueRequestPayload): string =>
  payload.routeContext?.mapFeatureSummary?.trim() ||
  '养心殿、宝华殿与后宫入口最常用，先把这些地方认熟，后头才好安排行程。';

const resolveChoiceFocus = (payload: OpeningDialogueRequestPayload): string =>
  payload.routeContext?.choiceFocus?.trim() || '眼下最紧要的，是先定下待人行事的起手章法。';

export const buildOpeningDialogueFromCsv = (
  id: string,
  mode: OpeningDialogueResponsePayload['mode'],
  phase: OpeningDialogueResponsePayload['phase'],
  variables: NarrativeVariables,
  options: OpeningDialogueResponsePayload['options'] = [],
): OpeningDialogueResponsePayload => {
  const entry = renderNarrativeEntry(id, variables);
  return {
    mode,
    phase,
    ...narrativeEntryToOpeningDialogueFields(entry),
    timeCost: 0,
    dataEffects: emptyEffects(),
    options,
  };
};

const buildYingluoyetingOpeningDialogue = (payload: OpeningDialogueRequestPayload): OpeningDialogueResponsePayload => {
  const playerSurname = resolvePlayerSurname(payload.playerName, '沉');
  const playerClanLabel = resolvePlayerClanLabel(payload.playerName, '沉');
  const templateVariables = {
    initialResidence: YINGLUOYETING_INITIAL_RESIDENCE,
    npcName: payload.npcName,
    playerClanLabel,
    playerSurname,
  };
  if (payload.turn <= 1) {
    return buildOpeningDialogueFromCsv('opening.yingluoyeting.turn1', 'line', 'continue', templateVariables);
  }

  if (payload.turn === 2) {
    return buildOpeningDialogueFromCsv('opening.yingluoyeting.turn2', 'line', 'continue', templateVariables);
  }

  if (payload.turn === 3) {
    return buildOpeningDialogueFromCsv('opening.yingluoyeting.turn3', 'line', 'continue', templateVariables);
  }

  if (payload.turn === 4) {
    return buildOpeningDialogueFromCsv('opening.yingluoyeting.turn4', 'line', 'continue', templateVariables);
  }

  return buildOpeningDialogueFromCsv('opening.yingluoyeting.choice', 'branch', 'finish', templateVariables, [
    ...buildFixedGuideOptions(),
  ]);
};

export const buildLocalOpeningDialogue = (payload: OpeningDialogueRequestPayload): OpeningDialogueResponsePayload => {
  if (payload.routeId === 'yingluoyeting') {
    return buildYingluoyetingOpeningDialogue(payload);
  }

  const speakerIdentity = resolveSpeakerIdentity(payload);
  const routeSummary = resolveRouteSummary(payload);
  const routePressure = resolveRoutePressure(payload);
  const mapFeatureSummary = resolveMapFeatureSummary(payload);
  const choiceFocus = resolveChoiceFocus(payload);
  const templateVariables = {
    choiceFocus,
    mapFeatureSummary,
    npcName: payload.npcName,
    playerTitle: payload.playerTitle,
    residenceName: payload.residenceName,
    routePressure,
    routeSummary,
    speakerIdentity,
  };

  if (payload.turn <= 1) {
    return buildOpeningDialogueFromCsv('opening.default.turn1', 'line', 'continue', templateVariables);
  }

  if (payload.turn === 2) {
    return buildOpeningDialogueFromCsv('opening.default.turn2', 'line', 'continue', templateVariables);
  }

  return buildOpeningDialogueFromCsv('opening.default.choice', 'branch', 'finish', templateVariables, [...buildFixedGuideOptions()]);
};

export const requestOpeningLocalDialogue = async (
  payload: OpeningDialogueRequestPayload,
): Promise<OpeningDialogueResponsePayload> => {
  return buildLocalOpeningDialogue(payload);
};
