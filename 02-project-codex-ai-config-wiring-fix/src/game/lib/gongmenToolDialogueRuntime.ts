import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import type { GameNumericsState, PalaceTimeState } from '../types';

export interface GongmenToolNpcProfile {
  id: string;
  identity: string;
  name: string;
  personality: string;
  summary: string;
}

export interface GongmenToolDialogueHistoryEntry {
  speaker: string;
  text: string;
}

interface RequestGongmenToolDialogueInput {
  saveId: string;
  sessionId: string;
  requestId: string;
  profile: GongmenToolNpcProfile;
  state: GameNumericsState;
  time: PalaceTimeState;
  history: GongmenToolDialogueHistoryEntry[];
}

export interface GongmenToolDialogueTurn {
  speakerIdentity: string;
  speakerName: string;
  text: string;
  sceneHint?: string;
  memoryCandidateCount: number;
  relationCandidateCount: number;
  sessionMemoryReadTurnCount: number;
  sessionMemoryReadCandidateCount: number;
  sessionMemoryWrittenCandidateCount: number;
  sessionMemoryReadRelationCandidateCount: number;
  sessionMemoryWrittenRelationCandidateCount: number;
  sessionMemoryCandidateCount: number;
  sessionMemoryRelationCandidateCount: number;
  sessionMemoryTurnCount: number;
  relationMemoryPromotedCount: number;
  relationMemoryRejectedCount: number;
  relationMemoryTotalEntryCount: number;
}

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 17), 0);

const buildLocalToolDialogue = (input: RequestGongmenToolDialogueInput): GongmenToolDialogueTurn => {
  const actorKey = input.profile.id === 'du-niang' || input.profile.id === 'tool_du_niang' ? 'duniang' : input.profile.id;
  const variant =
    actorKey === 'duniang'
      ? `line${(hashSeed(`${input.sessionId}:${input.requestId}:${input.history.length}`) % 4) + 1}`
      : `line${(hashSeed(`${input.sessionId}:${input.requestId}:${input.history.length}`) % 2) + 1}`;
  const entry = renderNarrativeEntry(`gongmen.${actorKey}.${variant}`);
  return {
    speakerIdentity: entry.speakerIdentity || input.profile.identity,
    speakerName: entry.speakerName || input.profile.name,
    text: entry.text,
    sceneHint: entry.sceneHint,
    memoryCandidateCount: 0,
    relationCandidateCount: 0,
    sessionMemoryReadTurnCount: 0,
    sessionMemoryReadCandidateCount: 0,
    sessionMemoryWrittenCandidateCount: 0,
    sessionMemoryReadRelationCandidateCount: 0,
    sessionMemoryWrittenRelationCandidateCount: 0,
    sessionMemoryCandidateCount: 0,
    sessionMemoryRelationCandidateCount: 0,
    sessionMemoryTurnCount: 0,
    relationMemoryPromotedCount: 0,
    relationMemoryRejectedCount: 0,
    relationMemoryTotalEntryCount: 0,
  };
};

export const requestGongmenToolLocalDialogue = async (
  input: RequestGongmenToolDialogueInput,
): Promise<GongmenToolDialogueTurn> => {
  return buildLocalToolDialogue(input);
};
