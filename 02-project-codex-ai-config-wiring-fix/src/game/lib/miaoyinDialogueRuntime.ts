import type { ConsortDialogueRequestPayload } from '../../ai/consortDialogueAgent';
import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import {
  narrativeEntryToConsortTurn,
  narrativeEntryToDialogueFields,
  narrativeFieldsToConsortTurn,
} from '../narrative/narrativeDialogueAdapter';
import type { ConsortDialogueOption, ConsortDialogueTurn } from '../types';

export interface MiaoYinDialogueActor {
  id: string;
  name: string;
  identity: string;
  residence: string;
  personality: string;
  summary: string;
  currentGoodwill: number;
  currentAffection: number;
  actorKind: 'consort' | 'miaoyin-musician' | 'emperor';
}

const buildMiaoyinMusicianLocalOptions = (phase: 'first' | 'unlock' | 'gift' | 'regular'): ConsortDialogueOption[] => {
  if (phase === 'gift') {
    return [
      { id: 'receive', label: '收下并谢他记挂', effectHint: '把这一份心意稳稳接住。', localToneTag: 'friendly' },
      { id: 'tease', label: '借曲意轻轻逗他', effectHint: '若他愿接，情分更容易往前走。', localToneTag: 'flirt' },
      { id: 'hold', label: '只按礼谢过', effectHint: '把分寸守得更稳。', localToneTag: 'neutral' },
    ];
  }

  if (phase === 'unlock') {
    return [
      { id: 'admire', label: '夸他收音极稳', effectHint: '更合他对真懂曲人的偏好。', localToneTag: 'friendly' },
      { id: 'join', label: '借曲意试探更近一步', effectHint: '若他心软，最容易留下余韵。', localToneTag: 'flirt' },
      { id: 'observe', label: '只说自己想再多听几回', effectHint: '把话留住，不急着靠近。', localToneTag: 'neutral' },
    ];
  }

  if (phase === 'first') {
    return [
      { id: 'listen', label: '先顺着曲理请教', effectHint: '更容易换来他一句真回话。', localToneTag: 'friendly' },
      { id: 'probe', label: '借琴心试探他', effectHint: '看看他愿不愿意把话说深。', localToneTag: 'neutral' },
      { id: 'hold', label: '只按礼留一句称赞', effectHint: '不把心思露得太快。', localToneTag: 'cold' },
    ];
  }

  return [
    { id: 'warm', label: '顺着曲意寒暄', effectHint: '先把场面放软，再慢慢探他心思。', localToneTag: 'friendly' },
    { id: 'tease', label: '借一折旧曲试他', effectHint: '若他肯接，最容易露出情绪。', localToneTag: 'flirt' },
    { id: 'hold', label: '只把礼数做满', effectHint: '先稳住，不急着把话说透。', localToneTag: 'neutral' },
  ];
};

const buildEmperorLocalOptions = (): ConsortDialogueOption[] => [
  { id: 'accept', label: '顺势应下邀约', effectHint: '把姿态放柔，顺着圣意往下走。', localToneTag: 'friendly' },
  { id: 'tease', label: '借曲意轻轻回敬', effectHint: '暧昧余地更足，也更考验分寸。', localToneTag: 'flirt' },
  { id: 'cautious', label: '只依礼谢恩', effectHint: '不失体统，却会把距离留得更远。', localToneTag: 'neutral' },
];

const buildConsortLocalOptions = (): ConsortDialogueOption[] => [
  { id: 'warm', label: '先温声问候', effectHint: '把场面放软，再看她愿不愿意多说。', localToneTag: 'friendly' },
  { id: 'probe', label: '借曲声探话', effectHint: '试试她来妙音堂究竟为听曲还是为看人。', localToneTag: 'neutral' },
  { id: 'hold', label: '只把礼数做稳', effectHint: '不急着露心思，先守住分寸。', localToneTag: 'cold' },
];

const buildLocalOptions = (
  actor: MiaoYinDialogueActor,
  payload: ConsortDialogueRequestPayload,
): ConsortDialogueOption[] => {
  if (actor.actorKind === 'miaoyin-musician') {
    if (payload.actionId === 'gift-event') {
      return buildMiaoyinMusicianLocalOptions('gift');
    }
    if (payload.actionId === 'meet-musician') {
      return buildMiaoyinMusicianLocalOptions('unlock');
    }
    if (payload.actionId === 'first-meet') {
      return buildMiaoyinMusicianLocalOptions('first');
    }
    return buildMiaoyinMusicianLocalOptions('regular');
  }
  if (actor.actorKind === 'emperor') {
    return buildEmperorLocalOptions();
  }
  return buildConsortLocalOptions();
};

const buildCsvDialogueFields = (
  payload: ConsortDialogueRequestPayload,
  actor: MiaoYinDialogueActor,
): Pick<ConsortDialogueTurn, 'speakerIdentity' | 'speakerName' | 'text' | 'sceneHint'> => {
  const renderCsvEntry = (id: string) => {
    const entry = renderNarrativeEntry(id, { actorIdentity: actor.identity, actorName: actor.name });
    return narrativeEntryToDialogueFields(entry, { speakerIdentity: actor.identity, speakerName: actor.name });
  };

  if (actor.actorKind === 'miaoyin-musician' && payload.actionId === 'first-meet') {
    return renderCsvEntry('miaoyin.dialogue.musician.first');
  }

  if (actor.actorKind === 'miaoyin-musician' && payload.actionId === 'meet-musician') {
    return renderCsvEntry('miaoyin.dialogue.musician.unlock');
  }

  if (actor.actorKind === 'miaoyin-musician' && payload.actionId === 'gift-event') {
    return renderCsvEntry('miaoyin.dialogue.musician.gift');
  }

  if (actor.actorKind === 'miaoyin-musician') {
    return renderCsvEntry('miaoyin.dialogue.musician.default');
  }

  if (actor.actorKind === 'emperor') {
    return renderCsvEntry('miaoyin.dialogue.emperor.default');
  }

  return renderCsvEntry('miaoyin.dialogue.consort.default');
};

const buildCsvDialogueTurn = (
  payload: ConsortDialogueRequestPayload,
  actor: MiaoYinDialogueActor,
): ConsortDialogueTurn => {
  const fields = buildCsvDialogueFields(payload, actor);

  if (actor.actorKind === 'miaoyin-musician' && payload.topic === 'follow-up') {
    const followUp = renderNarrativeEntry(
      payload.actionId === 'gift-follow-up' ? 'miaoyin.dialogue.musician.gift-follow-up' : 'miaoyin.dialogue.musician.follow-up',
    );
    return narrativeEntryToConsortTurn(followUp, {
      phase: 'finish',
      defaults: { speakerIdentity: actor.identity, speakerName: actor.name },
    });
  }

  if (actor.actorKind === 'emperor' && payload.topic === 'follow-up') {
    const followUp = renderNarrativeEntry('miaoyin.dialogue.emperor.follow-up');
    return narrativeEntryToConsortTurn(followUp, {
      phase: 'finish',
      defaults: { speakerIdentity: actor.identity, speakerName: actor.name },
    });
  }

  return narrativeFieldsToConsortTurn(fields, {
    mode: 'branch',
    phase: 'continue',
    options: buildLocalOptions(actor, payload),
  });
};

export const requestMiaoYinLocalDialogue = async (
  payload: ConsortDialogueRequestPayload,
  actor: MiaoYinDialogueActor,
): Promise<ConsortDialogueTurn> => {
  return buildCsvDialogueTurn(payload, actor);
};
