import type { ConsortDialogueRequestPayload } from '../../ai/consortDialogueAgent';
import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import {
  narrativeEntryToConsortTurn,
  narrativeEntryToDialogueFields,
  narrativeFieldsToConsortTurn,
} from '../narrative/narrativeDialogueAdapter';
import type { ConsortDialogueOption, ConsortDialogueTurn } from '../types';

export interface BaohuaDialogueActor {
  id: string;
  name: string;
  identity: string;
  residence: string;
  personality: string;
  summary: string;
  currentGoodwill: number;
  currentAffection: number;
  actorKind: 'consort' | 'dowager' | 'dangyi';
}

const buildDangYiLocalOptions = (): ConsortDialogueOption[] => [
  { id: 'humble', label: '先按礼回话', effectHint: '把分寸守住，再看他愿不愿意多说。', localToneTag: 'neutral' },
  { id: 'sincere', label: '直陈敬意求教', effectHint: '更容易换来一句真提点。', localToneTag: 'friendly' },
  { id: 'observe', label: '借佛殿旧例试探', effectHint: '看看他究竟把话留到哪一层。', localToneTag: 'cold' },
];

const buildDowagerLocalOptions = (): ConsortDialogueOption[] => [
  { id: 'kneel', label: '先依礼问安', effectHint: '不抢话头，先看太后今日的态度。', localToneTag: 'neutral' },
  { id: 'listen', label: '低声认下提点', effectHint: '让她看见你肯受教。', localToneTag: 'friendly' },
  { id: 'observe', label: '顺着话意试探', effectHint: '试着摸清她这一回为何出现在宝华殿。', localToneTag: 'cold' },
];

const buildConsortLocalOptions = (): ConsortDialogueOption[] => [
  { id: 'warm', label: '先顺势寒暄', effectHint: '把气氛放软，更适合慢慢探话。', localToneTag: 'friendly' },
  { id: 'probe', label: '借香火试探', effectHint: '看她究竟是真清净，还是另有所想。', localToneTag: 'neutral' },
  { id: 'hold', label: '只把礼数做满', effectHint: '不急着露心思，先稳住场面。', localToneTag: 'cold' },
];

const buildLocalOptions = (actor: BaohuaDialogueActor): ConsortDialogueOption[] => {
  if (actor.actorKind === 'dangyi') {
    return buildDangYiLocalOptions();
  }
  if (actor.actorKind === 'dowager') {
    return buildDowagerLocalOptions();
  }
  return buildConsortLocalOptions();
};

const buildCsvDialogueFields = (
  payload: ConsortDialogueRequestPayload,
  actor: BaohuaDialogueActor,
): Pick<ConsortDialogueTurn, 'speakerIdentity' | 'speakerName' | 'text' | 'sceneHint'> => {
  const renderCsvEntry = (id: string, variables: Record<string, string> = {}) => {
    const entry = renderNarrativeEntry(id, variables);
    return narrativeEntryToDialogueFields(entry, { speakerIdentity: actor.identity, speakerName: actor.name });
  };

  if (actor.actorKind === 'dangyi' && payload.actionId === 'forced-meet') {
    return renderCsvEntry('baohua.dialogue.dangyi.first');
  }

  if (actor.actorKind === 'dangyi') {
    return renderCsvEntry('baohua.dialogue.dangyi.default');
  }

  if (actor.actorKind === 'dowager') {
    return renderCsvEntry('baohua.dialogue.dowager.default');
  }

  return renderCsvEntry('baohua.dialogue.consort.default', { actorIdentity: actor.identity, actorName: actor.name });
};

const buildCsvDialogueTurn = (
  payload: ConsortDialogueRequestPayload,
  actor: BaohuaDialogueActor,
): ConsortDialogueTurn => {
  const fields = buildCsvDialogueFields(payload, actor);
  if (actor.actorKind === 'dangyi' && payload.topic === 'follow-up') {
    const followUp = renderNarrativeEntry('baohua.dialogue.dangyi.follow-up');
    return narrativeEntryToConsortTurn(followUp, {
      phase: 'finish',
      defaults: { speakerIdentity: actor.identity, speakerName: actor.name },
    });
  }

  if (actor.actorKind === 'dowager' && payload.topic === 'follow-up') {
    const followUp = renderNarrativeEntry('baohua.dialogue.dowager.follow-up');
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

export const requestBaohuaLocalDialogue = async (
  payload: ConsortDialogueRequestPayload,
  actor: BaohuaDialogueActor,
): Promise<ConsortDialogueTurn> => {
  return buildCsvDialogueTurn(payload, actor);
};
