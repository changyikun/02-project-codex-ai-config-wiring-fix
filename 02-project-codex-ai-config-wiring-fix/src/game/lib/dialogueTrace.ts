export interface DialogueTracePayload {
  npcId: string;
  sceneId?: string;
  sessionId?: string;
  turnsRead: number;
  candidatesRead: number;
  candidatesWritten: number;
  relationCandidatesRead?: number;
  relationCandidatesWritten?: number;
  relationPromotedCount?: number;
  relationRejectedCount?: number;
  relationEntryCount?: number;
  usedFallback: boolean;
}

export const traceDialogue = (payload: DialogueTracePayload): void => {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') {
    return;
  }

  console.debug('[dialogue-trace]', payload);
};
