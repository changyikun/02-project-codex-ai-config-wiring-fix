import type { ConsortDialogueRequestPayload } from '../../ai/consortDialogueAgent';
import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import {
  narrativeEntryToDialogueFields,
  narrativeFieldsToConsortTurn,
} from '../narrative/narrativeDialogueAdapter';
import type { ConsortDialogueOption, ConsortDialogueTurn } from '../types';

export interface HuaqingDialogueActor {
  id: string;
  name: string;
  identity: string;
  residence: string;
  personality: string;
  summary: string;
  currentGoodwill: number;
  currentAffection: number;
  actorKind: 'consort' | 'lianqiao';
}

const buildLianQiaoOptions = (): ConsortDialogueOption[] => [
  { id: 'soft', label: '顺着水声轻轻应她', effectHint: '更容易把这一场气氛稳稳接住。', localToneTag: 'friendly' },
  { id: 'tease', label: '借雾气试他一句', effectHint: '若他肯接，最容易把话往暧昧处引。', localToneTag: 'flirt' },
  { id: 'hold', label: '只把分寸守住', effectHint: '不急着把心思露得太快。', localToneTag: 'neutral' },
];

const buildConsortOptions = (): ConsortDialogueOption[] => [
  { id: 'warm', label: '先放柔声线寒暄', effectHint: '更适合把池边的气氛放缓。', localToneTag: 'friendly' },
  { id: 'probe', label: '借这一池雾气探他', effectHint: '试试看他愿不愿意把真心话往外递。', localToneTag: 'neutral' },
  { id: 'hold', label: '只把礼数做稳', effectHint: '先守着分寸，不急着表态。', localToneTag: 'cold' },
];

const buildCsvDialogueFields = (
  payload: ConsortDialogueRequestPayload,
  actor: HuaqingDialogueActor,
): Pick<ConsortDialogueTurn, 'speakerIdentity' | 'speakerName' | 'text' | 'sceneHint'> => {
  const renderCsvEntry = (id: string) => {
    const entry = renderNarrativeEntry(id, { actorIdentity: actor.identity, actorName: actor.name });
    return narrativeEntryToDialogueFields(entry, { speakerIdentity: actor.identity, speakerName: actor.name });
  };

  if (actor.actorKind === 'lianqiao') {
    return renderCsvEntry(payload.topic === 'follow-up' ? 'huaqing.dialogue.lianqiao.follow-up' : 'huaqing.dialogue.lianqiao.default');
  }

  return renderCsvEntry(payload.topic === 'follow-up' ? 'huaqing.dialogue.consort.follow-up' : 'huaqing.dialogue.consort.default');
};

const buildCsvDialogueTurn = (
  payload: ConsortDialogueRequestPayload,
  actor: HuaqingDialogueActor,
): ConsortDialogueTurn => {
  const fields = buildCsvDialogueFields(payload, actor);

  if (payload.topic === 'follow-up') {
    return narrativeFieldsToConsortTurn(fields, { phase: 'finish' });
  }

  return narrativeFieldsToConsortTurn(fields, {
    mode: 'branch',
    phase: 'continue',
    options: actor.actorKind === 'lianqiao' ? buildLianQiaoOptions() : buildConsortOptions(),
  });
};

export const requestHuaqingLocalDialogue = async (
  payload: ConsortDialogueRequestPayload,
  actor: HuaqingDialogueActor,
): Promise<ConsortDialogueTurn> => {
  return buildCsvDialogueTurn(payload, actor);
};
