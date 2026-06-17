import type { ConsortDialogueRequestPayload } from '../../ai/consortDialogueAgent';
import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import {
  narrativeEntryToConsortTurn,
  narrativeEntryToDialogueFields,
  narrativeFieldsToConsortTurn,
} from '../narrative/narrativeDialogueAdapter';
import type { ConsortDialogueOption, ConsortDialogueTurn } from '../types';

export interface KitchenDialogueActor {
  id: string;
  name: string;
  identity: string;
  residence: string;
  personality: string;
  summary: string;
  currentGoodwill: number;
  currentAffection: number;
  actorKind: 'consort' | 'buziyou';
}

const buildVoiceTag = (actor: KitchenDialogueActor): string => {
  if (actor.actorKind === 'buziyou') {
    return '他抬眼时先看锅灶后的火候，像是连说话都带着掌勺人收火时的稳当。';
  }
  if (actor.personality.includes('骄矜') || actor.personality.includes('好胜')) {
    return '她嘴上仍端着体面，眼神里却不肯先让半寸。';
  }
  if (actor.personality.includes('温顺') || actor.personality.includes('体贴')) {
    return '她先把语气放柔了，像是生怕一句话说得太重。';
  }
  if (actor.personality.includes('清醒') || actor.personality.includes('守密')) {
    return '她说话前先停了一停，像是在衡量这句值不值得落下。';
  }
  return '她把话说得不急不缓，叫人一时看不透心里究竟偏向哪边。';
};

const buildCsvDialogueFields = (
  payload: ConsortDialogueRequestPayload,
  actor: KitchenDialogueActor,
): Pick<ConsortDialogueTurn, 'speakerIdentity' | 'speakerName' | 'text' | 'sceneHint'> => {
  const voiceTag = buildVoiceTag(actor);
  const firstMeetBuZiyou = actor.actorKind === 'buziyou' && payload.actionId === 'forced-meet';
  const renderCsvEntry = (id: string, variables: Record<string, string> = {}) => {
    const entry = renderNarrativeEntry(id, variables);
    return narrativeEntryToDialogueFields(entry, { speakerIdentity: actor.identity, speakerName: actor.name });
  };

  if (firstMeetBuZiyou) {
    return renderCsvEntry('kitchen.dialogue.buziyou.first', { voiceTag });
  }

  if (actor.actorKind === 'buziyou') {
    return renderCsvEntry('kitchen.dialogue.buziyou.default', { voiceTag });
  }

  if (payload.actionId === 'stroll-encounter') {
    return renderCsvEntry('kitchen.dialogue.consort.stroll', { voiceTag, actorIdentity: actor.identity, actorName: actor.name });
  }

  return renderCsvEntry('kitchen.dialogue.default', { voiceTag, actorIdentity: actor.identity, actorName: actor.name });
};

const buildLocalOptions = (actor: KitchenDialogueActor): ConsortDialogueOption[] => {
  if (actor.actorKind === 'buziyou') {
    return [
      { id: 'probe', label: '借食单试探他', effectHint: '顺着闲话探一探他真正站哪边。', localToneTag: 'neutral' },
      { id: 'warm', label: '放软语气示好', effectHint: '更容易稳稳攒一点好感。', localToneTag: 'friendly' },
      { id: 'tease', label: '故意留半句玩笑', effectHint: '若他愿接，最容易牵出暧昧余地。', localToneTag: 'flirt' },
    ];
  }

  return [
    { id: 'warm', label: '顺着烟火气寒暄', effectHint: '先把场面放软，最适合慢慢加好感。', localToneTag: 'friendly' },
    { id: 'probe', label: '借御膳房试探心思', effectHint: '容易摸清她的站位与防备。', localToneTag: 'neutral' },
    { id: 'cold', label: '只把礼数做足', effectHint: '维持分寸，不急着把心思露出来。', localToneTag: 'cold' },
  ];
};

const buildCsvDialogueTurn = (
  payload: ConsortDialogueRequestPayload,
  actor: KitchenDialogueActor,
): ConsortDialogueTurn => {
  const fields = buildCsvDialogueFields(payload, actor);
  if (payload.topic === 'follow-up') {
    const optionLabel = payload.selectedOptionLabel ?? '这句话';
    const followUp = renderNarrativeEntry(
      actor.actorKind === 'buziyou' ? 'kitchen.dialogue.buziyou.follow-up' : 'kitchen.dialogue.consort.follow-up',
      { actorIdentity: actor.identity, actorName: actor.name, optionLabel },
    );
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

export const requestKitchenLocalDialogue = async (
  payload: ConsortDialogueRequestPayload,
  actor: KitchenDialogueActor,
): Promise<ConsortDialogueTurn> => {
  return buildCsvDialogueTurn(payload, actor);
};
