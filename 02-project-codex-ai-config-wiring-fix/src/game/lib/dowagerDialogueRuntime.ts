import type { ConsortDialogueRequestPayload } from '../../ai/consortDialogueAgent';
import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import { narrativeEntryToDialogueFields, narrativeFieldsToConsortTurn } from '../narrative/narrativeDialogueAdapter';
import type { ConsortDialogueOption, ConsortDialogueTurn } from '../types';

const selectByXun = <T,>(payload: ConsortDialogueRequestPayload, variants: T[]): T =>
  variants[(payload.timeContext.month + payload.timeContext.xun + payload.history.length) % variants.length];

const buildLocalOptionsByPayload = (payload: ConsortDialogueRequestPayload): ConsortDialogueOption[] => {
  if (payload.actionId === 'farewell') {
    return [];
  }

  if (payload.actionId === 'gift-greet') {
    return selectByXun(payload, [
      [
        { id: 'tribute', label: '依礼进上薄礼', effectHint: '先把礼数与敬意做足。', localToneTag: 'friendly' as const },
        { id: 'humble', label: '谦声问安自省', effectHint: '以低姿态听她敲打。', localToneTag: 'neutral' as const },
        { id: 'seek-advice', label: '顺势请教宫规', effectHint: '借她的话摸清这一旬风向。', localToneTag: 'friendly' as const },
      ],
      [
        { id: 'tribute', label: '先谢太后抬举', effectHint: '把自己放在受教的位置。', localToneTag: 'friendly' as const },
        { id: 'humble', label: '只陈问安之意', effectHint: '不急着把心思露得太满。', localToneTag: 'neutral' as const },
        { id: 'seek-advice', label: '请太后示下规矩', effectHint: '让她来定谈话轻重。', localToneTag: 'friendly' as const },
      ],
      [
        { id: 'tribute', label: '奉礼后静候发落', effectHint: '把主动权先交到她手里。', localToneTag: 'neutral' as const },
        { id: 'humble', label: '低声认自己见识浅', effectHint: '先让她看见你的分寸。', localToneTag: 'friendly' as const },
        { id: 'seek-advice', label: '借请安探她心意', effectHint: '顺势摸清她今日真正想说什么。', localToneTag: 'cold' as const },
      ],
    ]);
  }

  return selectByXun(payload, [
    [
      { id: 'kneel', label: '先行叩安陈礼', effectHint: '守礼为先，听太后先开口。', localToneTag: 'neutral' as const },
      { id: 'listen', label: '只低头静听', effectHint: '先看她今日是松是紧。', localToneTag: 'friendly' as const },
      { id: 'observe', label: '顺着话意试探', effectHint: '看她会不会给出更多暗示。', localToneTag: 'cold' as const },
    ],
    [
      { id: 'kneel', label: '恭声回一句规矩在前', effectHint: '先把体统摆正。', localToneTag: 'neutral' as const },
      { id: 'listen', label: '认下太后提点', effectHint: '让她看到你愿意受教。', localToneTag: 'friendly' as const },
      { id: 'observe', label: '借旧例探她口风', effectHint: '试着摸清她的裁量方向。', localToneTag: 'cold' as const },
    ],
    [
      { id: 'kneel', label: '先请太后示下', effectHint: '让她决定这一场谈话的规矩。', localToneTag: 'neutral' as const },
      { id: 'listen', label: '压住锋芒应答', effectHint: '保留余地，不争一时机巧。', localToneTag: 'friendly' as const },
      { id: 'observe', label: '顺着话锋再问半句', effectHint: '看她会不会多露一点真意。', localToneTag: 'cold' as const },
    ],
  ]);
};

const buildCsvDialogueFields = (
  payload: ConsortDialogueRequestPayload,
): Pick<ConsortDialogueTurn, 'mode' | 'phase' | 'speakerIdentity' | 'speakerName' | 'text' | 'sceneHint'> => {
  const openingTag =
    payload.playerOpeningTendency === '节衣缩食'
      ? '她看得出你惯会收锋藏势，因此话里更多两分试探。'
      : payload.playerOpeningTendency === '锦衣玉食'
        ? '她知道你不是肯轻易低头的人，因此每一句都压着规矩来敲打。'
        : '她尚在看你究竟是可用之人，还是只会逞一时聪明。';

  if (payload.actionId === 'farewell') {
    const entry = renderNarrativeEntry('dowager.audience.farewell');
    return {
      mode: 'line',
      phase: 'finish',
      ...narrativeEntryToDialogueFields(entry),
    };
  }

  if (payload.topic === 'follow-up') {
    const optionLabel = payload.selectedOptionLabel ?? '回话';
    const entry = renderNarrativeEntry('dowager.audience.follow-up', { openingTag, optionLabel });
    return {
      mode: 'line',
      phase: 'finish',
      ...narrativeEntryToDialogueFields(entry),
    };
  }

  if (payload.actionId === 'gift-greet') {
    const entry = renderNarrativeEntry('dowager.audience.gift-greet', { openingTag });
    return {
      mode: 'branch',
      phase: 'continue',
      ...narrativeEntryToDialogueFields(entry),
    };
  }

  const entry = renderNarrativeEntry('dowager.audience.visit', { openingTag });
  return {
    mode: 'branch',
    phase: 'continue',
    ...narrativeEntryToDialogueFields(entry),
  };
};

const buildCsvDialogueTurn = (payload: ConsortDialogueRequestPayload): ConsortDialogueTurn => {
  const fields = buildCsvDialogueFields(payload);

  return narrativeFieldsToConsortTurn(fields, {
    mode: fields.mode,
    phase: fields.phase,
    options: fields.mode === 'branch' ? buildLocalOptionsByPayload(payload) : [],
  });
};

export const requestDowagerLocalDialogue = async (
  payload: ConsortDialogueRequestPayload,
): Promise<ConsortDialogueTurn> => {
  return buildCsvDialogueTurn(payload);
};
