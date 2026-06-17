import type { ConsortDialogueRequestPayload } from '../../ai/consortDialogueAgent';
import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import {
  narrativeEntryToConsortTurn,
  narrativeEntryToDialogueFields,
  narrativeFieldsToConsortTurn,
} from '../narrative/narrativeDialogueAdapter';
import type { ConsortDialogueOption, ConsortDialogueTurn } from '../types';

export interface TaiyiDialogueActor {
  id: string;
  name: string;
  identity: string;
  residence: string;
  personality: string;
  summary: string;
  currentGoodwill: number;
  currentAffection: number;
  actorKind: 'consort' | 'dowager' | 'jianning';
}

const buildJianNingLocalOptions = (): ConsortDialogueOption[] => [
  { id: 'steady', label: '先按规矩问诊', effectHint: '把礼数守稳，再看他愿不愿往下说。', localToneTag: 'neutral' },
  { id: 'learn', label: '顺着脉案请教', effectHint: '更容易换来一句真提点。', localToneTag: 'friendly' },
  { id: 'probe', label: '借病症试探他', effectHint: '看看他究竟肯把话留到哪一步。', localToneTag: 'cold' },
];

const buildDowagerLocalOptions = (): ConsortDialogueOption[] => [
  { id: 'kneel', label: '先依礼问安', effectHint: '不抢话头，先看太后今日为何来太医院。', localToneTag: 'neutral' },
  { id: 'listen', label: '低声认下提点', effectHint: '让她看见你肯受教。', localToneTag: 'friendly' },
  { id: 'observe', label: '顺着话意试探', effectHint: '试着摸清她这一回来看谁、查什么。', localToneTag: 'cold' },
];

const buildConsortLocalOptions = (): ConsortDialogueOption[] => [
  { id: 'warm', label: '先温声寒暄', effectHint: '把场面放软，再慢慢探她来意。', localToneTag: 'friendly' },
  { id: 'probe', label: '借药香试探', effectHint: '看她究竟是真来问诊，还是另有心事。', localToneTag: 'neutral' },
  { id: 'hold', label: '只把礼数做满', effectHint: '先稳住分寸，不急着露心思。', localToneTag: 'cold' },
];

const buildLocalOptions = (actor: TaiyiDialogueActor): ConsortDialogueOption[] => {
  if (actor.actorKind === 'jianning') {
    return buildJianNingLocalOptions();
  }
  if (actor.actorKind === 'dowager') {
    return buildDowagerLocalOptions();
  }
  return buildConsortLocalOptions();
};

const buildCsvDialogueFields = (
  payload: ConsortDialogueRequestPayload,
  actor: TaiyiDialogueActor,
): Pick<ConsortDialogueTurn, 'speakerIdentity' | 'speakerName' | 'text' | 'sceneHint'> => {
  const renderCsvEntry = (id: string, variables: Record<string, string> = {}) => {
    const entry = renderNarrativeEntry(id, variables);
    return narrativeEntryToDialogueFields(entry, { speakerIdentity: actor.identity, speakerName: actor.name });
  };

  if (actor.actorKind === 'jianning' && payload.actionId === 'forced-meet') {
    return renderCsvEntry('taiyi.dialogue.jianning.first');
  }

  if (actor.actorKind === 'jianning') {
    return renderCsvEntry('taiyi.dialogue.jianning.default');
  }

  if (actor.actorKind === 'dowager') {
    return renderCsvEntry('taiyi.dialogue.dowager.default');
  }

  return renderCsvEntry('taiyi.dialogue.consort.default', { actorIdentity: actor.identity, actorName: actor.name });
};

const buildCsvDialogueTurn = (
  payload: ConsortDialogueRequestPayload,
  actor: TaiyiDialogueActor,
): ConsortDialogueTurn => {
  const fields = buildCsvDialogueFields(payload, actor);
  if (payload.topic === 'follow-up') {
    const optionLabel = payload.selectedOptionLabel ?? '这句话';

    if (actor.actorKind === 'jianning') {
      const followUp = renderNarrativeEntry('taiyi.dialogue.jianning.follow-up', { optionLabel });
      return narrativeEntryToConsortTurn(followUp, {
        phase: 'finish',
        defaults: { speakerIdentity: actor.identity, speakerName: actor.name },
      });
    }

    if (actor.actorKind === 'dowager') {
      const followUp = renderNarrativeEntry('taiyi.dialogue.dowager.follow-up');
      return narrativeEntryToConsortTurn(followUp, {
        phase: 'finish',
        defaults: { speakerIdentity: actor.identity, speakerName: actor.name },
      });
    }

    const followUp = renderNarrativeEntry('taiyi.dialogue.consort.follow-up', {
      actorIdentity: actor.identity,
      actorName: actor.name,
      optionLabel,
    });
    return narrativeEntryToConsortTurn(followUp, {
      phase: 'finish',
      defaults: { speakerIdentity: actor.identity, speakerName: actor.name },
    });
  }

  return narrativeFieldsToConsortTurn(fields, {
    mode: 'branch',
    phase: 'continue',
    options: buildLocalOptions(actor),
  });
};

export const requestTaiyiLocalDialogue = async (
  payload: ConsortDialogueRequestPayload,
  actor: TaiyiDialogueActor,
): Promise<ConsortDialogueTurn> => {
  return buildCsvDialogueTurn(payload, actor);
};
