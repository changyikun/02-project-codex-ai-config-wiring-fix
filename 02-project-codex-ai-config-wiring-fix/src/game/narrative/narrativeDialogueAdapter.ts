import type { ConsortDialogueOption, ConsortDialogueTurn } from '../types';
import type { NarrativeEntry } from './narrativeCatalog';

export interface NarrativePresentationDefaults {
  speakerIdentity?: string;
  speakerName?: string;
  portraitKey?: string;
  narrationName?: string;
  sceneHint?: string;
}

export interface NarrativePresentationFields {
  actorKey: string;
  speakerIdentity: string;
  speakerName: string;
  portraitKey: string;
  portraitPlacement: NarrativeEntry['portraitPlacement'];
  narrationName: string;
  text: string;
  sceneHint: string;
}

export const narrativeEntryToPresentation = (
  entry: NarrativeEntry,
  defaults: NarrativePresentationDefaults = {},
): NarrativePresentationFields => ({
  actorKey: entry.actorKey,
  speakerIdentity: entry.speakerIdentity || defaults.speakerIdentity || '',
  speakerName: entry.speakerName || defaults.speakerName || entry.narrationName || '',
  portraitKey: entry.portraitKey || defaults.portraitKey || '',
  portraitPlacement: entry.portraitPlacement,
  narrationName: entry.narrationName || defaults.narrationName || '',
  text: entry.text,
  sceneHint: entry.sceneHint || defaults.sceneHint || '',
});

export interface NarrativeDialogueFields {
  speakerIdentity: string;
  speakerName: string;
  text: string;
  sceneHint?: string;
}

export const narrativeEntryToDialogueFields = (
  entry: NarrativeEntry,
  defaults: NarrativePresentationDefaults = {},
): NarrativeDialogueFields => {
  const presentation = narrativeEntryToPresentation(entry, defaults);
  return {
    speakerIdentity: presentation.speakerIdentity,
    speakerName: presentation.speakerName,
    text: presentation.text,
    sceneHint: presentation.sceneHint,
  };
};

interface ConsortTurnOptions {
  mode?: ConsortDialogueTurn['mode'];
  phase?: ConsortDialogueTurn['phase'];
  options?: ConsortDialogueOption[];
}

export interface NarrativeGlobalDialogueFields {
  characterIdentity: string;
  characterName: string;
  content: string;
}

export type NarrativeOpeningDialogueFields = Pick<
  NarrativePresentationFields,
  'speakerIdentity' | 'speakerName' | 'portraitKey' | 'portraitPlacement' | 'narrationName' | 'text'
>;

export const narrativeEntryToOpeningDialogueFields = (
  entry: NarrativeEntry,
  defaults: NarrativePresentationDefaults = {},
): NarrativeOpeningDialogueFields => {
  const presentation = narrativeEntryToPresentation(entry, defaults);
  return {
    speakerIdentity: presentation.speakerIdentity,
    speakerName: presentation.speakerName,
    portraitKey: presentation.portraitKey,
    portraitPlacement: presentation.portraitPlacement,
    narrationName: presentation.narrationName,
    text: presentation.text,
  };
};

export const narrativeEntryToGlobalDialogueFields = (
  entry: NarrativeEntry,
  defaults: NarrativePresentationDefaults = {},
): NarrativeGlobalDialogueFields => {
  const presentation = narrativeEntryToPresentation(entry, defaults);
  return {
    characterIdentity: presentation.speakerIdentity,
    characterName: presentation.speakerName,
    content: presentation.text,
  };
};

export const narrativeFieldsToConsortTurn = (
  fields: NarrativeDialogueFields,
  turnOptions: ConsortTurnOptions = {},
): ConsortDialogueTurn => ({
  mode: turnOptions.mode ?? 'line',
  phase: turnOptions.phase ?? 'finish',
  speakerIdentity: fields.speakerIdentity,
  speakerName: fields.speakerName,
  text: fields.text,
  sceneHint: fields.sceneHint ?? '',
  options: turnOptions.options ?? [],
});

export const narrativeEntryToConsortTurn = (
  entry: NarrativeEntry,
  turnOptions: ConsortTurnOptions & { defaults?: NarrativePresentationDefaults } = {},
): ConsortDialogueTurn =>
  narrativeFieldsToConsortTurn(narrativeEntryToDialogueFields(entry, turnOptions.defaults), turnOptions);
