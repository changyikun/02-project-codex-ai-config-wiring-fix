import type { ConsortDialogueRequestPayload } from '../../ai/consortDialogueAgent';
import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import {
  narrativeEntryToConsortTurn,
  narrativeEntryToDialogueFields,
  narrativeFieldsToConsortTurn,
} from '../narrative/narrativeDialogueAdapter';
import type { ConcubineProfile, ConsortDialogueTurn } from '../types';

const buildSpeakerIdentity = (consort: ConcubineProfile): string => consort.rankLabel || '宫妃';

const buildVoiceTag = (consort: ConcubineProfile): string => {
  const personality = consort.personality;
  if (personality.includes('骄矜') || personality.includes('好胜')) {
    return '话里仍带两分体面与锋芒';
  }
  if (personality.includes('温顺') || personality.includes('体贴')) {
    return '语气温柔，却总带着细微试探';
  }
  if (personality.includes('清醒') || personality.includes('守密')) {
    return '言辞克制，像是每一句都先在心里过了一遍';
  }
  if (personality.includes('清冷') || personality.includes('寡言')) {
    return '她先敛了眸色，话并不多';
  }
  if (personality.includes('端方') || personality.includes('克制')) {
    return '她礼数周全，叫人一时看不透心底偏向';
  }
  if (personality.includes('娇气') || personality.includes('病弱')) {
    return '她声音轻软，像是稍重些的话都会叫人心里一颤';
  }
  return '她依着自己的性子答话，语气并不肯全然交底';
};

const buildCsvDialogueFields = (
  payload: ConsortDialogueRequestPayload,
  consort: ConcubineProfile,
): Pick<ConsortDialogueTurn, 'speakerIdentity' | 'speakerName' | 'text' | 'sceneHint'> => {
  const { actionId, actionResult } = payload;
  const speakerLead = buildVoiceTag(consort);
  const commonVariables = {
    actorName: consort.name,
    itemName: payload.giftItemName ?? '礼物',
    residenceName: consort.residence,
    speakerIdentity: buildSpeakerIdentity(consort),
    speakerLead,
    targetName: payload.smearTargetName ?? consort.name,
    visitOpening: actionResult ? `${actionResult}\n` : '',
    visitPlace: payload.playerResidence === consort.residence ? '殿中' : '看我',
  };
  const renderCsvEntry = (id: string) => {
    const entry = renderNarrativeEntry(id, commonVariables);
    return narrativeEntryToDialogueFields(entry, {
      speakerIdentity: buildSpeakerIdentity(consort),
      speakerName: consort.name,
    });
  };

  if (actionId === 'gift') {
    return renderCsvEntry('consort.audience.gift');
  }

  if (actionId === 'return-earring') {
    return renderCsvEntry('consort.audience.return-earring');
  }

  if (actionId === 'greet') {
    return renderCsvEntry('consort.audience.greet');
  }

  if (actionId === 'quarrel') {
    return renderCsvEntry('consort.audience.quarrel');
  }

  if (actionId === 'punish') {
    return renderCsvEntry('consort.audience.punish');
  }

  if (actionId === 'win-over') {
    const result = actionResult ?? '';
    const narrativeId = result.includes('愿与您交好')
      ? 'consort.audience.win-over.success'
      : result.includes('不会答应')
        ? 'consort.audience.win-over.fail'
        : 'consort.audience.win-over.neutral';
    return renderCsvEntry(narrativeId);
  }

  if (actionId === 'smear') {
    return renderCsvEntry('consort.audience.smear');
  }

  if (actionId === 'farewell') {
    return renderCsvEntry('consort.audience.farewell');
  }

  return renderCsvEntry('consort.audience.visit');
};

const buildCsvDialogueTurn = (
  payload: ConsortDialogueRequestPayload,
  consort: ConcubineProfile,
): ConsortDialogueTurn => {
  const fields = buildCsvDialogueFields(payload, consort);
  if (payload.topic === 'follow-up') {
    const optionLabel = payload.selectedOptionLabel ?? '这句话';
    const followUp = renderNarrativeEntry('consort.audience.follow-up', {
      actorName: consort.name,
      optionLabel,
      residenceName: consort.residence,
      speakerIdentity: buildSpeakerIdentity(consort),
      speakerLead: buildVoiceTag(consort),
    });
    return narrativeEntryToConsortTurn(followUp, {
      phase: 'finish',
      defaults: {
        speakerIdentity: buildSpeakerIdentity(consort),
        speakerName: consort.name,
      },
    });
  }

  if (payload.actionId === 'farewell') {
    return narrativeFieldsToConsortTurn(fields, { phase: 'finish' });
  }

  return narrativeFieldsToConsortTurn(fields, { phase: 'finish' });
};

export const buildConsortDialogueCsvTurn = (
  payload: ConsortDialogueRequestPayload,
  consort: ConcubineProfile,
): ConsortDialogueTurn => buildCsvDialogueTurn(payload, consort);

export const requestConsortLocalDialogue = async (
  payload: ConsortDialogueRequestPayload,
  consort: ConcubineProfile,
): Promise<ConsortDialogueTurn> => {
  return buildCsvDialogueTurn(payload, consort);
};
