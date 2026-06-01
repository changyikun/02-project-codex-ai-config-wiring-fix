export interface RuntimeState {
  name: string;
  age: number;
  family: string;
  pointsLeft: number;
  routeId: 'lanyinxuguo' | 'fushengrumeng' | 'yingluoyeting' | 'chenyuansucuo';
  actionPoints: number;
  silver: number;
  prestige: number;
  stress: number;
  favor: number;
  trueHeart: number;
  stats: Record<string, number>;
  flags: Record<string, boolean>;
}

export interface NumericSaveEnvelope {
  data: RuntimeState;
  checksum: string;
  savedAt: string;
}

export interface GalgameRuntimeService {
  recordAttributes: (state: RuntimeState) => Promise<{ state: RuntimeState; save: NumericSaveEnvelope }>;
  createBriefing: (state: RuntimeState) => Promise<{ summary: string }>;
  getDialogueTurn: (
    state: RuntimeState,
    summary: string,
  ) => Promise<{
    speaker: string;
    text: string;
    options: Array<{ id: string; label: string; effectHint: string }>;
  }>;
  applyChoice: (state: RuntimeState, optionLabel: string) => Promise<{ state: RuntimeState; save: NumericSaveEnvelope }>;
  applyActivity: (state: RuntimeState, activity: string) => Promise<{ state: RuntimeState; save: NumericSaveEnvelope }>;
  applyMapEvent: (state: RuntimeState, area: string) => Promise<{ state: RuntimeState; text: string }>;
  verifySave: (save: NumericSaveEnvelope) => boolean;
}
